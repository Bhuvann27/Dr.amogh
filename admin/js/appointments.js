(function(){
  "use strict";

  const listWrap = document.getElementById("listWrap");
  const searchInput = document.getElementById("searchInput");
  const filterBar = document.getElementById("filters");
  document.getElementById("logoutBtn").addEventListener("click", () => window.AdminAuth.logout());

  let all = [];
  let activeFilter = "all";

  function esc(s){ return (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
  function formatDate(iso){
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }
  function formatTime(hhmmss){
    const [h,m] = hhmmss.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2,"0")} ${ampm}`;
  }
  function formatCreated(iso){
    const d = new Date(iso);
    return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  }

  function todayISO(){ const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0,10); }
  function formatLongDate(iso){
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }
  function dayTag(iso){
    const t = todayISO();
    if(iso === t) return "Today";
    const tm = new Date(t + "T00:00:00"); tm.setDate(tm.getDate() + 1);
    if(iso === tm.toISOString().slice(0,10)) return "Tomorrow";
    return "";
  }

  function render(){
    const q = searchInput.value.trim().toLowerCase();
    const filtered = all.filter((a) => {
      if(activeFilter !== "all" && a.status !== activeFilter) return false;
      if(!q) return true;
      return (a.patient_name||"").toLowerCase().includes(q) || (a.patient_phone||"").includes(q);
    });

    if(!all.length){
      listWrap.innerHTML = `<div class="admin-empty compact"><h2>No consultation requests yet.</h2><p>Requests from the website's Online Consultation section will appear here.</p></div>`;
      return;
    }
    if(!filtered.length){
      listWrap.innerHTML = `<div class="admin-empty compact"><h2>No matching appointments.</h2></div>`;
      return;
    }

    // group by appointment date: today and upcoming first (soonest first),
    // then earlier dates (most recent first)
    const today = todayISO();
    const byDate = {};
    filtered.forEach((a) => { (byDate[a.appointment_date] = byDate[a.appointment_date] || []).push(a); });
    const dates = Object.keys(byDate);
    const upcoming = dates.filter((d) => d >= today).sort();
    const earlier = dates.filter((d) => d < today).sort().reverse();

    const section = (iso) => {
      const items = byDate[iso].sort((x, y) => x.start_time.localeCompare(y.start_time));
      const tag = dayTag(iso);
      return `
        <div class="appt-group">
          <div class="appt-group-head">
            <h2>${formatLongDate(iso)}${tag ? ` <span class="appt-daytag">${tag}</span>` : ""}</h2>
            <span class="appt-count">${items.length} booking${items.length > 1 ? "s" : ""}</span>
          </div>
          ${items.map(rowHtml).join("")}
        </div>`;
    };
    listWrap.innerHTML =
      upcoming.map(section).join("") +
      (earlier.length ? `<div class="appt-earlier-label">Earlier</div>` + earlier.map(section).join("") : "");

    filtered.forEach((a) => {
      const row = document.getElementById(`appt-${a.id}`);
      if(!row) return;
      row.querySelector(".appt-status").addEventListener("change", (e) => updateField(a.id, "status", e.target.value));
      row.querySelector(".appt-payment").addEventListener("change", (e) => updateField(a.id, "payment_status", e.target.value));
    });
  }

  function rowHtml(a){
    const opt = (v, cur, label) => `<option value="${v}" ${cur === v ? "selected" : ""}>${label}</option>`;
    return `
      <div class="appt-card" id="appt-${a.id}">
        <div class="appt-time">${formatTime(a.start_time)}</div>
        <div class="appt-main">
          <div class="appt-name">${esc(a.patient_name)} <span class="status-badge ${a.status}">${a.status}</span></div>
          <div class="appt-contact">${esc(a.patient_phone)}${a.patient_email ? " &middot; " + esc(a.patient_email) : ""}</div>
          <div class="appt-meta">${a.duration_minutes} min &middot; &#8377;${a.fee_inr} &middot; requested ${formatCreated(a.created_at)}</div>
        </div>
        <div class="appt-update">
          <label>Update status
            <select class="appt-status">
              ${opt("requested", a.status, "Requested")}
              ${opt("confirmed", a.status, "Confirmed")}
              ${opt("completed", a.status, "Completed")}
              ${opt("cancelled", a.status, "Cancelled")}
            </select>
          </label>
          <label>Payment
            <select class="appt-payment">
              ${opt("pending", a.payment_status, "Pending")}
              ${opt("paid", a.payment_status, "Paid")}
            </select>
          </label>
        </div>
      </div>`;
  }

  async function updateField(id, field, value){
    try {
      await window.BookingDB.updateAppointment(id, { [field]: value });
      const item = all.find((a) => a.id === id);
      if(item) item[field] = value;
      render();
    } catch(e){
      alert("Couldn't save that change: " + e.message);
      load();
    }
  }

  filterBar.addEventListener("click", (e) => {
    const btn = e.target.closest(".admin-filter-pill");
    if(!btn) return;
    activeFilter = btn.dataset.filter;
    Array.from(filterBar.children).forEach((c) => c.classList.toggle("active", c === btn));
    render();
  });
  searchInput.addEventListener("input", render);

  async function load(){
    try {
      all = await window.BookingDB.listAppointments();
      render();
    } catch(e){
      listWrap.innerHTML = `<p style="color:#B23A13;">Couldn't load appointments: ${e.message}</p>`;
    }
  }

  window.AdminAuth.requireSession().then(load).catch(() => {});
})();
