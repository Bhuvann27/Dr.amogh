/* =========================================================
   Online consultation — availability + appointments data access.
   Same pattern as patient-insights-db.js: shares the one Supabase
   client, fails soft on the public side, throws for admin callers
   to handle.
   ========================================================= */
window.BookingDB = (function(){
  "use strict";

  function getClient(){
    if(!window.isSupabaseConfigured || !window.isSupabaseConfigured()) return null;
    if(!window.supabase || !window.supabase.createClient) return null;
    return window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);
  }

  const SLOT_MINUTES = 15;
  const FEE_INR = 1200;

  function toMinutes(hhmm){ const [h,m] = hhmm.split(":").map(Number); return h*60+m; }
  function toHHMM(mins){ const h = Math.floor(mins/60), m = mins%60; return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`; }
  function formatDateISO(d){ return d.toISOString().slice(0,10); }

  // All booking-date comparisons use India Standard Time.
  function indiaNowParts(){
    const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date());
    return Object.fromEntries(parts.filter(p=>p.type!=="literal").map(p=>[p.type,p.value]));
  }
  function indiaTodayISO(){const p=indiaNowParts();return `${p.year}-${p.month}-${p.day}`;}
  function isBookingDateInWindow(dateISO){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(dateISO))return false;
    const today=indiaTodayISO();
    const limit=new Date(today+"T00:00:00Z");
    limit.setUTCDate(limit.getUTCDate()+90);
    return dateISO>=today&&new Date(dateISO+"T00:00:00Z")<=limit;
  }


  // ---- public: read availability, compute free slots -------------
  async function getWeeklyAvailability(){
    const c = getClient();
    if(!c) return [];
    const { data, error } = await c.from("availability_weekly").select("*").order("day_of_week");
    if(error || !data) return [];
    return data;
  }

  async function getBlocksForDate(dateISO){
    const c = getClient();
    if(!c) return [];
    const { data, error } = await c.from("availability_blocks").select("*").eq("block_date", dateISO);
    if(error || !data) return [];
    return data;
  }

  async function getTakenSlots(dateISO){
    const c = getClient();
    if(!c) return [];
    const { data, error } = await c.from("taken_slots").select("start_time").eq("appointment_date", dateISO);
    if(error || !data) return [];
    return data.map((r) => r.start_time.slice(0,5));
  }

  // Returns an array of "HH:MM" strings the patient can pick for dateISO.
  async function getAvailableSlots(dateISO){
    const [weekly, blocks, taken] = await Promise.all([
      getWeeklyAvailability(), getBlocksForDate(dateISO), getTakenSlots(dateISO),
    ]);
    if(!isBookingDateInWindow(dateISO)) return [];

    const date=new Date(dateISO+"T00:00:00Z");
    const dow=date.getUTCDay();
    const day=weekly.find((w)=>w.day_of_week===dow);
    if(!day || !day.is_open) return [];

    const takenSet = new Set(taken);
    const fullDayBlocked = blocks.some((b) => !b.start_time && !b.end_time);
    if(fullDayBlocked) return [];

    const start = toMinutes(day.start_time.slice(0,5));
    const end = toMinutes(day.end_time.slice(0,5));
    const nowParts=indiaNowParts();
    const indiaToday=`${nowParts.year}-${nowParts.month}-${nowParts.day}`;
    const isToday=indiaToday===dateISO;
    const nowMins=Number(nowParts.hour)*60+Number(nowParts.minute);

    const slots = [];
    for(let m = start; m + SLOT_MINUTES <= end; m += SLOT_MINUTES){
      const hhmm = toHHMM(m);
      if(isToday && m <= nowMins) continue;
      if(takenSet.has(hhmm)) continue;
      const blockedByRange = blocks.some((b) => {
        if(!b.start_time || !b.end_time) return false;
        const bs = toMinutes(b.start_time.slice(0,5)), be = toMinutes(b.end_time.slice(0,5));
        return m >= bs && m < be;
      });
      if(blockedByRange) continue;
      slots.push(hhmm);
    }
    return slots;
  }

  // ---- public: create a booking ------------------------------------
  // Throws { slotTaken: true } if the slot was booked in the split
  // second between loading slots and submitting, so the UI can refresh
  // and ask the patient to pick again — the DB unique index is the real
  // guard, this is just how the UI finds out.
  async function requestAppointment({ name, phone, email, dateISO, startTime }){
    const c=getClient();
    if(!c) throw new Error("Not connected to Supabase.");

    if(!isBookingDateInWindow(dateISO)){
      throw Object.assign(new Error("Booking date is outside the allowed window."),{invalidDate:true});
    }
    const currentSlots=await getAvailableSlots(dateISO);
    if(!currentSlots.includes(startTime)){
      throw Object.assign(new Error("That slot is no longer available."),{slotTaken:true});
    }

    // Deliberately not chaining .select().single() here: patients can only INSERT
    // (never SELECT) appointment rows under RLS, so asking Postgres to return the
    // inserted row back would be filtered out by that same policy and look like a
    // failure even though the booking was saved correctly. We already have every
    // value we need client-side to show the confirmation and build the WhatsApp
    // message, so we just check for an error and move on.
    const { error } = await c.from("appointments").insert({
      patient_name: name,
      patient_phone: phone,
      patient_email: email || null,
      appointment_date: dateISO,
      start_time: startTime,
      duration_minutes: SLOT_MINUTES,
      fee_inr: FEE_INR,
    });
    if(error){
      if(error.code === "23505") throw Object.assign(new Error("That slot was just taken."), { slotTaken: true });
      throw error;
    }
    return { patient_name: name, appointment_date: dateISO, start_time: startTime };
  }

  // ---- admin: appointments ------------------------------------------
  async function listAppointments(){
    const c = getClient();
    if(!c) throw new Error("Not connected to Supabase.");
    const { data, error } = await c.from("appointments").select("*")
      .order("appointment_date", { ascending: false }).order("start_time", { ascending: false });
    if(error) throw error;
    return data || [];
  }

  async function updateAppointment(id, patch){
    const c = getClient();
    if(!c) throw new Error("Not connected to Supabase.");
    const { data, error } = await c.from("appointments").update(patch).eq("id", id).select().single();
    if(error) throw error;
    return data;
  }

  async function deleteAppointment(id){
    const c = getClient();
    if(!c) throw new Error("Not connected to Supabase.");
    const { error } = await c.from("appointments").delete().eq("id", id);
    if(error) throw error;
  }

  // ---- admin: availability -------------------------------------------
  async function saveWeeklyDay(dayOfWeek, { isOpen, startTime, endTime }){
    const c = getClient();
    if(!c) throw new Error("Not connected to Supabase.");
    const { data, error } = await c.from("availability_weekly")
      .update({ is_open: isOpen, start_time: startTime, end_time: endTime })
      .eq("day_of_week", dayOfWeek).select().single();
    if(error) throw error;
    return data;
  }

  async function listBlocks(){
    const c = getClient();
    if(!c) throw new Error("Not connected to Supabase.");
    const { data, error } = await c.from("availability_blocks").select("*").order("block_date");
    if(error) throw error;
    return data || [];
  }

  async function addBlock({ dateISO, startTime, endTime, reason }){
    const c = getClient();
    if(!c) throw new Error("Not connected to Supabase.");
    const { data, error } = await c.from("availability_blocks").insert({
      block_date: dateISO, start_time: startTime || null, end_time: endTime || null, reason: reason || "",
    }).select().single();
    if(error) throw error;
    return data;
  }

  async function removeBlock(id){
    const c = getClient();
    if(!c) throw new Error("Not connected to Supabase.");
    const { error } = await c.from("availability_blocks").delete().eq("id", id);
    if(error) throw error;
  }

  return {
    FEE_INR, SLOT_MINUTES,
    getWeeklyAvailability, getBlocksForDate, getTakenSlots, getAvailableSlots, requestAppointment,
    listAppointments, updateAppointment, deleteAppointment,
    saveWeeklyDay, listBlocks, addBlock, removeBlock,
  };
})();
