(function(){
  "use strict";

  const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const weeklyList = document.getElementById("weeklyList");
  const blocksList = document.getElementById("blocksList");
  document.getElementById("logoutBtn").addEventListener("click", () => window.AdminAuth.logout());

  let weekly = [];
  let blocks = [];

  function esc(s){ return (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

  function renderWeekly(){
    weeklyList.innerHTML = weekly.map((day) => `
      <div class="weekly-row" data-day="${day.day_of_week}">
        <label class="weekly-toggle">
          <input type="checkbox" class="day-open" ${day.is_open ? "checked" : ""}>
          <span>${DAY_NAMES[day.day_of_week]}</span>
        </label>
        <input type="time" class="field-input day-start" value="${day.start_time.slice(0,5)}" ${day.is_open ? "" : "disabled"}>
        <span style="color:var(--text-dim);">to</span>
        <input type="time" class="field-input day-end" value="${day.end_time.slice(0,5)}" ${day.is_open ? "" : "disabled"}>
      </div>`).join("");

    weeklyList.querySelectorAll(".weekly-row").forEach((row) => {
      const checkbox = row.querySelector(".day-open");
      const startInput = row.querySelector(".day-start");
      const endInput = row.querySelector(".day-end");
      checkbox.addEventListener("change", () => {
        startInput.disabled = !checkbox.checked;
        endInput.disabled = !checkbox.checked;
      });
    });
  }

  function renderBlocks(){
    if(!blocks.length){
      blocksList.innerHTML = `<p style="color:var(--text-dim);">No blocked dates or times right now.</p>`;
      return;
    }
    blocksList.innerHTML = blocks.map((b) => {
      const dateStr = new Date(b.block_date + "T00:00:00").toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });
      const timeStr = (b.start_time && b.end_time) ? `${b.start_time.slice(0,5)} &ndash; ${b.end_time.slice(0,5)}` : "Entire day";
      return `
        <div class="insight-row" id="block-${b.id}">
          <div class="main">
            <h3>${dateStr}</h3>
            <div class="preview-text">${timeStr}${b.reason ? " &middot; " + esc(b.reason) : ""}</div>
          </div>
          <div class="row-actions"><button class="danger reopen-btn" data-id="${b.id}">Reopen</button></div>
        </div>`;
    }).join("");
    blocksList.querySelectorAll(".reopen-btn").forEach((btn) => {
      btn.addEventListener("click", () => removeBlock(btn.dataset.id));
    });
  }

  document.getElementById("saveWeeklyBtn").addEventListener("click", async () => {
    const status = document.getElementById("weeklyStatus");
    status.textContent = "Saving\u2026";
    try {
      const rows = weeklyList.querySelectorAll(".weekly-row");
      await Promise.all(Array.from(rows).map((row) => {
        const day = Number(row.dataset.day);
        const isOpen = row.querySelector(".day-open").checked;
        const startTime = row.querySelector(".day-start").value || "10:00";
        const endTime = row.querySelector(".day-end").value || "19:00";
        return window.BookingDB.saveWeeklyDay(day, { isOpen, startTime, endTime });
      }));
      status.textContent = "Saved";
      setTimeout(() => { if(status.textContent === "Saved") status.textContent = ""; }, 2000);
    } catch(e){
      status.textContent = "Couldn't save";
    }
  });

  document.getElementById("addBlockBtn").addEventListener("click", async () => {
    const dateEl = document.getElementById("blockDate");
    const startEl = document.getElementById("blockStart");
    const endEl = document.getElementById("blockEnd");
    const reasonEl = document.getElementById("blockReason");
    if(!dateEl.value){ alert("Please choose a date to block."); return; }
    if((startEl.value && !endEl.value) || (!startEl.value && endEl.value)){
      alert("Please set both a start and end time, or leave both blank to block the whole day.");
      return;
    }
    try {
      const block = await window.BookingDB.addBlock({
        dateISO: dateEl.value, startTime: startEl.value, endTime: endEl.value, reason: reasonEl.value.trim(),
      });
      blocks.push(block);
      blocks.sort((a,b) => a.block_date.localeCompare(b.block_date));
      renderBlocks();
      dateEl.value = ""; startEl.value = ""; endEl.value = ""; reasonEl.value = "";
    } catch(e){
      alert("Couldn't add that block: " + e.message);
    }
  });

  async function removeBlock(id){
    if(!confirm("Reopen this date/time so patients can book it again?")) return;
    try {
      await window.BookingDB.removeBlock(id);
      blocks = blocks.filter((b) => b.id !== id);
      renderBlocks();
    } catch(e){
      alert("Couldn't remove that block: " + e.message);
    }
  }

  async function load(){
    try {
      [weekly, blocks] = await Promise.all([window.BookingDB.getWeeklyAvailability(), window.BookingDB.listBlocks()]);
      renderWeekly();
      renderBlocks();
    } catch(e){
      weeklyList.innerHTML = `<p style="color:#B23A13;">Couldn't load availability: ${e.message}</p>`;
    }
  }

  window.AdminAuth.requireSession().then(load).catch(() => {});
})();
