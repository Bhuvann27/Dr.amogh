(function(){
  "use strict";
  const root = document.getElementById("bookingWidget");
  if(!root) return;

  const DOCTOR_WHATSAPP = "917406886226"; // same number already used for CALL on this site, WhatsApp format

  const state = {
    step: "date",       // date -> slot -> details -> review -> success
    dateISO: "",
    slot: "",
    name: "", phone: "", email: "",
    loadingSlots: false,
    slots: [],
    error: "",
  };

  // Booking dates use the clinic timezone, Asia/Kolkata.
  function indiaDateParts(){
    const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date());
    return Object.fromEntries(parts.filter(p=>p.type!=="literal").map(p=>[p.type,p.value]));
  }
  function todayISO(){const p=indiaDateParts();return `${p.year}-${p.month}-${p.day}`;}
  function addDaysISO(iso,days){const d=new Date(iso+"T00:00:00Z");d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
  function maxDateISO(){return addDaysISO(todayISO(),90);}
  function isValidBookingDate(iso){
    if(!/^\d{4}-\\d{2}-\\d{2}$/.test(iso))return false;
    return iso>=todayISO()&&iso<=maxDateISO();
  }
  function formatDateHuman(iso){
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  }
  function formatTimeHuman(hhmm){
    const [h,m] = hhmm.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2,"0")} ${ampm}`;
  }
  function esc(s){ return (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

  async function loadSlots(){
    state.loadingSlots = true; state.slots = []; render();
    try {
      state.slots = await window.BookingDB.getAvailableSlots(state.dateISO);
    } catch(e){
      state.slots = [];
    }
    state.loadingSlots = false;
    render();
  }

  function render(){
    root.innerHTML = STEP_RENDERERS[state.step]();
    attachHandlers();
  }

  const STEP_RENDERERS = {
    date: () => `
      <div class="booking-step booking-date-step">
        <div class="booking-step-label">STEP 1 &middot; CHOOSE A DATE</div>
        <label class="date-picker-field" for="bookDateInput">
          <span class="date-picker-text">${state.dateISO ? esc(formatDateHuman(state.dateISO)) : "Click here to choose a date"}</span>
          <input type="date" id="bookDateInput" min="${todayISO()}" max="${maxDateISO()}" value="${esc(state.dateISO)}" aria-label="Choose consultation date">
        </label>
        <p class="date-picker-hint">Select a date to see available consultation times.</p>
      </div>`,

    slot: () => `
      <div class="booking-step">
        <div class="booking-step-label">STEP 2 &middot; CHOOSE A TIME &mdash; ${esc(formatDateHuman(state.dateISO))}</div>
        ${state.loadingSlots ? `<p style="color:var(--text-dim);">Checking available times&hellip;</p>` :
          state.slots.length ? `<div class="slot-grid">${state.slots.map((s) => `<button type="button" class="slot-chip" data-slot="${esc(s)}">${esc(formatTimeHuman(s))}</button>`).join("")}</div>` :
          `<p style="color:var(--text-dim);">No times available on this date. Please try another date.</p>`}
        <div style="margin-top:18px; display:flex; gap:10px;">
          <button type="button" class="btn-ghost-sm" id="bookBackToDate">&larr; Change date</button>
        </div>
      </div>`,

    details: () => `
      <div class="booking-step">
        <div class="booking-step-label">STEP 3 &middot; YOUR DETAILS</div>
        <p style="color:var(--text-dim); margin-bottom:16px;">${esc(formatDateHuman(state.dateISO))} at ${esc(formatTimeHuman(state.slot))}</p>
        <div class="field-group">
          <label for="bookName">Name</label>
          <input class="field-input" type="text" id="bookName" value="${esc(state.name)}" placeholder="Your name">
        </div>
        <div class="field-group">
          <label for="bookPhone">Phone</label>
          <input class="field-input" type="tel" id="bookPhone" value="${esc(state.phone)}" placeholder="10-digit mobile number">
        </div>
        <div class="field-group">
          <label for="bookEmail">Email <span style="font-weight:400; color:var(--text-dim);">(optional)</span></label>
          <input class="field-input" type="email" id="bookEmail" value="${esc(state.email)}" placeholder="you@example.com">
        </div>
        ${state.error ? `<p style="color:#C0392B; font-size:0.9rem; margin-bottom:12px;">${esc(state.error)}</p>` : ""}
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button type="button" class="btn-ghost-sm" id="bookBackToSlot">&larr; Back</button>
          <button type="button" class="btn btn-primary" id="bookToReview">Review request</button>
        </div>
      </div>`,

    review: () => `
      <div class="booking-step">
        <div class="booking-step-label">STEP 4 &middot; REVIEW YOUR REQUEST</div>
        <div class="review-rows">
          <div><span>Date</span><strong>${esc(formatDateHuman(state.dateISO))}</strong></div>
          <div><span>Time</span><strong>${esc(formatTimeHuman(state.slot))}</strong></div>
          <div><span>Duration</span><strong>15 minutes</strong></div>
          <div><span>Fee</span><strong>&#8377;1,200</strong></div>
          <div><span>Name</span><strong>${esc(state.name)}</strong></div>
          <div><span>Phone</span><strong>${esc(state.phone)}</strong></div>
          ${state.email ? `<div><span>Email</span><strong>${esc(state.email)}</strong></div>` : ""}
        </div>
        <p style="color:var(--text-dim); font-size:0.88rem; margin:16px 0;">
          This sends a request only &mdash; the clinic will confirm your appointment on WhatsApp.
          Payment is handled manually after confirmation.
        </p>
        ${state.error ? `<p style="color:#C0392B; font-size:0.9rem; margin-bottom:12px;">${esc(state.error)}</p>` : ""}
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button type="button" class="btn-ghost-sm" id="bookBackToDetails">&larr; Back</button>
          <button type="button" class="btn btn-primary" id="bookSubmit">Request a consultation</button>
        </div>
      </div>`,

    success: () => `
      <div class="booking-step">
        <div class="booking-success-icon">&#10003;</div>
        <p style="font-family:var(--font-display); font-weight:800; font-size:1.2rem; margin-bottom:10px;">
          Your consultation request has been submitted.
        </p>
        <p style="color:var(--text-dim); margin-bottom:20px;">
          Please continue on WhatsApp so the clinic can confirm your appointment.
        </p>
        <a class="btn btn-primary" id="bookWhatsAppBtn" target="_blank" rel="noopener">Continue on WhatsApp</a>
        <div style="margin-top:16px;"><button type="button" class="btn-ghost-sm" id="bookAnother">Request another time</button></div>
      </div>`,
  };

  function attachHandlers(){
    if(state.step === "date"){
      const input = document.getElementById("bookDateInput");
      input.addEventListener("change", () => {
        state.dateISO=input.value;
        if(!state.dateISO)return;
        if(!isValidBookingDate(state.dateISO)){
          state.dateISO="";
          state.error="Please choose a date from today onward.";
          render();
          return;
        }
        state.error="";
        state.step="slot";
        render();
        loadSlots();
      });
    }
    if(state.step === "slot"){
      root.querySelectorAll(".slot-chip").forEach((btn) => {
        btn.addEventListener("click", () => { state.slot = btn.dataset.slot; state.step = "details"; state.error = ""; render(); });
      });
      document.getElementById("bookBackToDate").addEventListener("click", () => { state.step = "date"; render(); });
    }
    if(state.step === "details"){
      document.getElementById("bookName").addEventListener("input", (e) => state.name = e.target.value);
      document.getElementById("bookPhone").addEventListener("input", (e) => state.phone = e.target.value);
      document.getElementById("bookEmail").addEventListener("input", (e) => state.email = e.target.value);
      document.getElementById("bookBackToSlot").addEventListener("click", () => { state.step = "slot"; render(); });
      document.getElementById("bookToReview").addEventListener("click", () => {
        if(!state.name.trim() || !state.phone.trim()){
          state.error = "Please enter your name and phone number.";
          render();
          return;
        }
        if(!/^\d{7,15}$/.test(state.phone.replace(/[\s-]/g, ""))){
          state.error = "Please enter a valid phone number.";
          render();
          return;
        }
        state.error = "";
        state.step = "review";
        render();
      });
    }
    if(state.step === "review"){
      document.getElementById("bookBackToDetails").addEventListener("click", () => { state.step = "details"; render(); });
      document.getElementById("bookSubmit").addEventListener("click", submitBooking);
    }
    if(state.step === "success"){
      document.getElementById("bookAnother").addEventListener("click", () => {
        Object.assign(state, { step: "date", dateISO: "", slot: "", name: "", phone: "", email: "", error: "" });
        render();
      });
    }
  }

  async function submitBooking(){
    const btn = document.getElementById("bookSubmit");
    btn.disabled = true; btn.textContent = "Sending\u2026";

    if(!isValidBookingDate(state.dateISO)){
      state.error="That date is no longer valid. Please choose today or a future date.";
      state.step="date";
      render();
      return;
    }

    try {
      await window.BookingDB.requestAppointment({
        name: state.name.trim(), phone: state.phone.trim(), email: state.email.trim(),
        dateISO: state.dateISO, startTime: state.slot,
      });
      state.step = "success";
      render();
      const message = `Hello Dr. Amogh, I would like to request an online consultation.\n\n` +
        `Date: ${formatDateHuman(state.dateISO)}\n` +
        `Time: ${formatTimeHuman(state.slot)}\n` +
        `Duration: 15 minutes\n` +
        `Name: ${state.name.trim()}\n` +
        `Phone: ${state.phone.trim()}`;
      const waUrl = `https://wa.me/${DOCTOR_WHATSAPP}?text=${encodeURIComponent(message)}`;
      const waBtn = document.getElementById("bookWhatsAppBtn");
      if(waBtn) waBtn.href = waUrl;
      window.open(waUrl, "_blank", "noopener");
    } catch(e){
      if(e.slotTaken){
        state.error = "That time was just booked by someone else. Please choose another time.";
        state.step = "slot";
        render();
        loadSlots();
      } else {
        state.error = "Something went wrong sending your request. Please try again, or call the clinic directly.";
        btn.disabled = false; btn.textContent = "Request a consultation";
        render();
      }
    }
  }

  render();
})();
