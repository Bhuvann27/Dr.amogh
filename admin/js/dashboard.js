(function(){
  "use strict";

  const listWrap = document.getElementById("listWrap");
  const searchInput = document.getElementById("searchInput");
  const filterBar = document.getElementById("filters");
  document.getElementById("logoutBtn").addEventListener("click", () => window.AdminAuth.logout());
  document.getElementById("addBtn").addEventListener("click", () => {
    window.location.href = "editor.html";
  });

  let allStories = [];
  let activeFilter = "all";

  function timeAgo(iso){
    if(!iso) return "&mdash;";
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const days = Math.floor(diffMs / 86400000);
    if(days <= 0) return "today";
    if(days === 1) return "yesterday";
    if(days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? "s" : ""} ago`;
  }

  function stripQuotes(s){ return (s || "").replace(/[\u201c\u201d"]/g, ""); }

  function renderStats(){
    const wrap = document.getElementById("adminStats");
    const published = allStories.filter((s) => s.status === "published").length;
    const drafts = allStories.filter((s) => s.status === "draft").length;
    const archived = allStories.filter((s) => s.status === "archived").length;
    wrap.innerHTML = `
      <div class="stat"><span class="num">${published}</span><span class="lbl">Published</span></div>
      <div class="stat"><span class="num">${drafts}</span><span class="lbl">Drafts</span></div>
      <div class="stat"><span class="num">${archived}</span><span class="lbl">Archived</span></div>`;
  }

  function render(){
    const q = searchInput.value.trim().toLowerCase();
    const filtered = allStories.filter((s) => {
      if(activeFilter !== "all" && s.status !== activeFilter) return false;
      if(!q) return true;
      return (s.title || "").toLowerCase().includes(q) || (s.intro || "").toLowerCase().includes(q);
    });

    if(!allStories.length){
      listWrap.innerHTML = `
        <div class="admin-empty">
          <h2>No patient insights yet.</h2>
          <p>Start with a patient's concern, then tell the story in their own words.<br>
          You don't need to write a long article. A few honest questions and natural answers are enough.</p>
          <button class="btn-add" id="emptyAddBtn" type="button">+ Add Patient Insight</button>
        </div>`;
      document.getElementById("emptyAddBtn").addEventListener("click", () => window.location.href = "editor.html");
      return;
    }

    if(!filtered.length){
      listWrap.innerHTML = `<div class="admin-empty"><h2>No matching stories.</h2><p>Try a different filter or search term.</p></div>`;
      return;
    }

    listWrap.innerHTML = `<div class="insight-rows">${filtered.map(rowHtml).join("")}</div>`;
    filtered.forEach((s) => {
      const row = document.getElementById(`row-${s.id}`);
      if(!row) return;
      row.querySelector(".act-edit").addEventListener("click", () => window.location.href = `editor.html?id=${s.id}`);
      row.querySelector(".act-preview").addEventListener("click", () => window.location.href = `editor.html?id=${s.id}&step=preview`);
      row.querySelector(".act-duplicate").addEventListener("click", () => duplicateStory(s.id));
      const publishBtn = row.querySelector(".act-publish-toggle");
      if(publishBtn) publishBtn.addEventListener("click", () => togglePublish(s));
      const archiveBtn = row.querySelector(".act-archive");
      if(archiveBtn) archiveBtn.addEventListener("click", () => archiveStory(s.id));
      row.querySelector(".act-delete").addEventListener("click", () => deleteStory(s.id, s.title));
    });
  }

  function rowHtml(s){
    const preview = stripQuotes(s.intro) || "No introduction yet.";
    const publishLabel = s.status === "published" ? "Unpublish" : "Publish";
    return `
      <div class="insight-row" id="row-${s.id}">
        <div class="main">
          <h3>${stripQuotes(s.title) || "Untitled story"}</h3>
          <div class="preview-text">${preview}</div>
          <div class="meta">Updated ${timeAgo(s.updatedAt)}</div>
        </div>
        <span class="status-badge ${s.status}">${s.status}</span>
        <div class="row-actions">
          <button class="act-edit">Edit</button>
          <button class="act-preview">Preview</button>
          <button class="act-duplicate">Duplicate</button>
          ${s.status !== "archived" ? `<button class="act-publish-toggle ${s.status !== 'published' ? 'primary' : ''}">${publishLabel}</button>` : ""}
          ${s.status !== "archived" ? `<button class="act-archive">Archive</button>` : ""}
          <button class="act-delete danger">Delete</button>
        </div>
      </div>`;
  }

  async function togglePublish(s){
    const next = s.status === "published" ? "draft" : "published";
    if(next === "published" && !readyToPublish(s)){
      alert("This story is missing a required privacy confirmation. Open it in the editor to finish the privacy checklist before publishing.");
      return;
    }
    await window.PatientInsightsDB.setStatus(s.id, next);
    await load();
  }

  function readyToPublish(s){
    return s.consentConfirmed && s.identifiersRemoved && s.privacyReviewed && s.noIdentifyingDetails && s.medicalReviewed &&
      (!s.urgent || s.urgentReviewed);
  }

  async function archiveStory(id){
    if(!confirm("Archive this story? It will be hidden from the public site but not deleted.")) return;
    await window.PatientInsightsDB.setStatus(id, "archived");
    await load();
  }

  async function deleteStory(id, title){
    if(!confirm(`Delete "${stripQuotes(title) || "this story"}" permanently? This can't be undone.`)) return;
    await window.PatientInsightsDB.remove(id);
    await load();
  }

  async function duplicateStory(id){
    await window.PatientInsightsDB.duplicate(id);
    await load();
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
      allStories = await window.PatientInsightsDB.listAll();
      renderStats();
      render();
    } catch(e){
      listWrap.innerHTML = `<p style="color:#B23A13;">Couldn't load stories: ${e.message}</p>`;
    }
  }

  window.AdminAuth.requireSession().then(load).catch(() => {});
})();
