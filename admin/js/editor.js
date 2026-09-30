(function(){
  "use strict";

  const TOTAL_STEPS = 6;
  const params = new URLSearchParams(window.location.search);
  const storyId = params.get("id");

  const GENERAL_QUESTIONS = [
    { q: "When did you first notice this?", a: "It started gradually. At first I didn't think much of it, but after a few weeks I realised it was happening more often." },
    { q: "What did you notice first?", a: "I started feeling tired much earlier than usual, especially towards the evening." },
    { q: "Was it happening every day?", a: "Not every day. Some days were better, but it kept coming back." },
    { q: "How was it affecting your normal day?", a: "I was finding it harder to concentrate at work and I didn't have the same energy in the evening." },
    { q: "Did you notice anything else?", a: "I was also getting headaches occasionally." },
    { q: "Did anything seem to make it better or worse?", a: "I noticed it more on busy days, but resting didn't always make it go away." },
    { q: "Had anything changed around the time it started?", a: "Nothing major. My routine was mostly the same." },
    { q: "What made you decide to talk to a doctor?", a: "I realised it had been going on for long enough that I shouldn't keep ignoring it." },
  ];

  const TOPIC_QUESTIONS = {
    "Tiredness": [
      { q: "When did you first notice the tiredness?", a: "It started gradually, over a few weeks." },
      { q: "Was it there every day?", a: "Not every day, but it kept coming back." },
      { q: "Did it affect your work or normal routine?", a: "I had less energy to do things after work." },
      { q: "How did you feel after sleeping?", a: "I didn't feel fresh, even after a full night's sleep." },
      { q: "Did you notice anything else along with it?", a: "I was also getting occasional headaches." },
      { q: "What made you decide to get it checked?", a: "It had been going on long enough that I didn't want to ignore it anymore." },
    ],
    "Headache": [
      { q: "When did the headaches start?", a: "I don't remember the exact day \u2014 it was gradual." },
      { q: "What was the first thing you noticed?", a: "Just an occasional dull ache, nothing I paid much attention to." },
      { q: "How often were they happening?", a: "A couple of times a week, some weeks more." },
      { q: "How were they affecting your normal day?", a: "I could still work, but I didn't feel comfortable." },
      { q: "Did you notice anything else when they happened?", a: "I usually wanted to sit somewhere quiet until it passed." },
      { q: "Was there something that made you decide to see a doctor?", a: "They were becoming more frequent than before." },
    ],
    "Stomach discomfort": [
      { q: "When did you first notice the discomfort?", a: "It started a few weeks ago, on and off." },
      { q: "When did you usually notice it?", a: "Mostly after meals." },
      { q: "How did it affect eating or your routine?", a: "I started being more careful about what I ate." },
      { q: "Did you start avoiding anything because of it?", a: "Yes, a few foods that seemed to make it worse." },
      { q: "What made you decide to get it checked?", a: "It kept happening often enough that I wanted to understand why." },
    ],
    "Dizziness": [
      { q: "When did you first notice it?", a: "It came on suddenly a few times over a couple of weeks." },
      { q: "What did the feeling feel like to you?", a: "A brief lightheaded feeling, like the room tilted slightly." },
      { q: "Did it affect your normal activities?", a: "I became more cautious about standing up quickly." },
      { q: "Did it happen at particular times?", a: "Mostly in the mornings, or when I stood up quickly." },
      { q: "What made you decide to speak to a doctor?", a: "It kept happening and I wanted to understand why." },
    ],
  };

  const CUSTOM_Q_EXAMPLES = [
    "What were you most worried about?",
    "What was the hardest part of dealing with this?",
    "Did it affect your sleep?",
    "Did it change anything about your daily routine?",
    "Did you initially think it was something else?",
    "Was there something you were avoiding because of it?",
  ];

  const RELATE_PLACEHOLDERS = [
    "You have been feeling tired for several weeks.",
    "The tiredness is affecting your normal routine.",
    "You are sleeping but still don't feel rested.",
    "You have noticed the problem keeps returning.",
    "You have started changing your routine because of it.",
  ];

  const ACTION_PLACEHOLDERS = [
    "If a symptom keeps returning, lasts longer than expected, or starts affecting your normal routine, it may be worth discussing it with a doctor.",
    "Keep track of when it happens and anything that seems to bring it on \u2014 this can be useful when discussing it with a doctor.",
    "If you haven't had a routine health check recently, consider getting one.",
  ];

  let story = blankStory();
  let currentStep = 1;
  let dirty = false;
  let autosaveTimer = null;

  function blankStory(){
    return {
      id: null, slug: "", title: "", subtitle: "", intro: "", topic: "",
      dialogue: [], relateIntro: "", relatePoints: [], relateClose: "",
      actionPoints: [], urgent: "", urgentReviewed: false,
      consentConfirmed: false, identifiersRemoved: false, privacyReviewed: false, noIdentifyingDetails: false, medicalReviewed: false,
      status: "draft",
    };
  }

  function stripQuotes(s){ return (s || "").replace(/[\u201c\u201d"]/g, ""); }
  function markDirty(){ dirty = true; scheduleAutosave(); }

  // ---------------- step navigation ----------------
  function renderProgress(){
    const wrap = document.getElementById("wizardProgress");
    wrap.innerHTML = "";
    for(let i = 1; i <= TOTAL_STEPS; i++){
      const b = document.createElement("button");
      b.type = "button";
      b.className = "step-dot" + (i === currentStep ? " active" : i < currentStep ? " done" : "");
      b.addEventListener("click", () => goToStep(i));
      wrap.appendChild(b);
    }
  }

  function goToStep(n){
    currentStep = Math.max(1, Math.min(TOTAL_STEPS, n));
    document.querySelectorAll(".wizard-step").forEach((el) => {
      el.classList.toggle("active", Number(el.dataset.step) === currentStep);
    });
    renderProgress();
    document.getElementById("prevBtn").style.visibility = currentStep === 1 ? "hidden" : "visible";
    document.getElementById("nextBtn").style.display = currentStep === TOTAL_STEPS ? "none" : "";
    document.getElementById("publishBtn").style.display = currentStep === TOTAL_STEPS ? "" : "none";
    if(currentStep === 6) updateFinalReview();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.getElementById("prevBtn").addEventListener("click", () => goToStep(currentStep - 1));
  document.getElementById("nextBtn").addEventListener("click", () => goToStep(currentStep + 1));

  // ---------------- AI patient insight drafting ----------------
  const aiEls = {
    topic: document.getElementById("aiTopic"),
    goal: document.getElementById("aiGoal"),
    notes: document.getElementById("aiNotes"),
    important: document.getElementById("aiImportant"),
    redFlags: document.getElementById("aiRedFlags"),
    treatment: document.getElementById("aiTreatment"),
    misconceptions: document.getElementById("aiMisconceptions"),
    button: document.getElementById("generateAiBtn"),
    status: document.getElementById("aiStatus"),
    review: document.getElementById("aiReview"),
    reviewNotes: document.getElementById("aiReviewNotes"),
    use: document.getElementById("useAiDraftBtn"),
  };

  function setAiStatus(message, kind){
    if(!aiEls.status) return;
    aiEls.status.textContent = message || "";
    aiEls.status.className = "ai-status" + (kind ? " " + kind : "");
  }

  function fillAiSourceFromStory(){
    if(!aiEls.topic) return;
    aiEls.topic.value = story.topic || "";
    if(!aiEls.notes.value) aiEls.notes.value = story.intro || "";
  }

  function applyAiDraft(draft){
    story.title = draft.title || story.title;
    story.subtitle = draft.subtitle || story.subtitle;
    story.intro = draft.intro || story.intro;
    story.topic = draft.topic || story.topic;
    story.dialogue = Array.isArray(draft.dialogue) ? draft.dialogue.map((d) => ({ q: d.q || "", a: d.a || "" })) : story.dialogue;
    story.relateIntro = draft.relateIntro || "";
    story.relatePoints = Array.isArray(draft.relatePoints) ? draft.relatePoints.filter(Boolean) : [];
    story.relateClose = draft.relateClose || "";
    story.actionPoints = Array.isArray(draft.actionPoints) ? draft.actionPoints.filter(Boolean) : [];
    story.urgent = draft.urgent || "";
    story.urgentReviewed = false;
    story.status = "draft";
    populateForm();
    goToStep(1);
    markDirty();
  }

  async function generateAiDraft(){
    const notes = aiEls.notes.value.trim();
    if(!notes){
      setAiStatus("Add the doctor’s rough medical notes first.", "error");
      aiEls.notes.focus();
      return;
    }

    aiEls.button.disabled = true;
    setAiStatus("Generating a draft…", "busy");
    aiEls.review.hidden = true;

    try {
      const session = await window.PatientInsightsDB.getSession();
      if(!session?.access_token) throw new Error("Your admin session has expired. Please log in again.");

      const payload = {
        topic: aiEls.topic.value.trim(),
        patientGoal: aiEls.goal.value.trim(),
        roughNotes: notes,
        importantPoints: aiEls.important.value.trim(),
        redFlags: aiEls.redFlags.value.trim(),
        treatmentInfo: aiEls.treatment.value.trim(),
        misconceptions: aiEls.misconceptions.value.trim(),
      };

      const response = await fetch(window.SUPABASE_CONFIG.url + "/functions/v1/generate-patient-insight", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + session.access_token,
          "apikey": window.SUPABASE_CONFIG.anonKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if(!response.ok) throw new Error(data.error || "The AI draft could not be generated.");

      const draft = data.draft || {};
      aiEls.reviewNotes.innerHTML = "";
      const notesList = Array.isArray(draft.needsDoctorReview) ? draft.needsDoctorReview : [];
      if(notesList.length){
        const ul = document.createElement("ul");
        notesList.forEach((note) => {
          const li = document.createElement("li");
          li.textContent = note;
          ul.appendChild(li);
        });
        aiEls.reviewNotes.appendChild(ul);
      } else {
        aiEls.reviewNotes.textContent = "Review every medical statement before publication.";
      }

      aiEls.review.hidden = false;
      aiEls.use.onclick = () => {
        applyAiDraft(draft);
        aiEls.review.hidden = true;
        setAiStatus("Draft loaded into the editor. Review and edit it before saving or publishing.", "success");
      };
      setAiStatus("Draft generated. It has not been published.", "success");
    } catch(e){
      setAiStatus(e.message || "Could not generate the draft.", "error");
    } finally {
      aiEls.button.disabled = false;
    }
  }

  if(aiEls.button) aiEls.button.addEventListener("click", generateAiDraft);
  fillAiSourceFromStory();

  // ---------------- step 1: story basics ----------------
  const fieldTitle = document.getElementById("fieldTitle");
  const fieldTopic = document.getElementById("fieldTopic");
  const fieldSubtitle = document.getElementById("fieldSubtitle");
  const fieldIntro = document.getElementById("fieldIntro");

  fieldTitle.addEventListener("input", () => { story.title = fieldTitle.value; markDirty(); });
  fieldSubtitle.addEventListener("input", () => { story.subtitle = fieldSubtitle.value; markDirty(); });
  fieldIntro.addEventListener("input", () => { story.intro = fieldIntro.value; markDirty(); });
  fieldTopic.addEventListener("change", () => { story.topic = fieldTopic.value; markDirty(); renderSuggestedQuestions(); });

  document.querySelectorAll(".examples-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const panel = document.getElementById(`examples-${btn.dataset.examples}`);
      panel.classList.toggle("open");
    });
  });

  // ---------------- step 2: conversation builder ----------------
  const qaList = document.getElementById("qaList");

  function renderSuggestedQuestions(){
    const wrap = document.getElementById("suggestedQuestions");
    const topicQs = TOPIC_QUESTIONS[story.topic] || [];
    const combined = topicQs.concat(GENERAL_QUESTIONS).filter((sq, i, arr) =>
      arr.findIndex((x) => x.q === sq.q) === i
    );
    const used = new Set(story.dialogue.map((d) => d.q));
    wrap.innerHTML = "";
    combined.filter((sq) => !used.has(sq.q)).slice(0, 8).forEach((sq) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "sq-chip";
      chip.textContent = sq.q;
      chip.addEventListener("click", () => {
        story.dialogue.push({ q: sq.q, a: "", _placeholder: sq.a });
        markDirty();
        renderQaList();
        renderSuggestedQuestions();
      });
      wrap.appendChild(chip);
    });
  }

  function renderQaList(){
    qaList.innerHTML = "";
    story.dialogue.forEach((pair, i) => {
      const card = document.createElement("div");
      card.className = "qa-card";
      card.innerHTML = `
        <div class="qa-head">
          <span class="qa-num">QUESTION ${i + 1}</span>
          <div class="qa-controls">
            <button type="button" class="qa-icon-btn" data-move="up" title="Move up">&uarr;</button>
            <button type="button" class="qa-icon-btn" data-move="down" title="Move down">&darr;</button>
            <button type="button" class="qa-icon-btn danger" data-remove title="Delete question">&times;</button>
          </div>
        </div>
        <div class="field-group" style="margin-bottom:12px;">
          <textarea class="field-input q-input" rows="1" placeholder="For example: What were you most worried about?">${escapeHtml(pair.q)}</textarea>
        </div>
        <div class="field-group" style="margin-bottom:0;">
          <textarea class="field-textarea a-input" placeholder="${escapeHtml(pair._placeholder || "Write the answer as naturally as possible.")}">${escapeHtml(pair.a)}</textarea>
        </div>`;
      card.querySelector(".q-input").addEventListener("input", (e) => { pair.q = e.target.value; markDirty(); });
      card.querySelector(".a-input").addEventListener("input", (e) => { pair.a = e.target.value; markDirty(); });
      card.querySelector('[data-move="up"]').addEventListener("click", () => { if(i>0){ swap(story.dialogue,i,i-1); markDirty(); renderQaList(); } });
      card.querySelector('[data-move="down"]').addEventListener("click", () => { if(i<story.dialogue.length-1){ swap(story.dialogue,i,i+1); markDirty(); renderQaList(); } });
      card.querySelector("[data-remove]").addEventListener("click", () => { story.dialogue.splice(i,1); markDirty(); renderQaList(); renderSuggestedQuestions(); });
      qaList.appendChild(card);
    });
  }

  function swap(arr, i, j){ const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
  function escapeHtml(s){ return (s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

  document.getElementById("addCustomQBtn").addEventListener("click", () => {
    document.getElementById("customQGuidance").style.display = "block";
    const example = CUSTOM_Q_EXAMPLES[story.dialogue.length % CUSTOM_Q_EXAMPLES.length];
    story.dialogue.push({ q: "", a: "", _placeholder: "Write the patient's answer as naturally as possible.", _qPlaceholder: `For example: ${example}` });
    markDirty();
    renderQaList();
    const cards = qaList.querySelectorAll(".qa-card");
    const last = cards[cards.length - 1];
    if(last){ const qInput = last.querySelector(".q-input"); qInput.placeholder = `For example: ${example}`; qInput.focus(); }
  });

  // ---------------- step 3 & 4: repeatable point lists ----------------
  function renderPointList(containerId, arrKey, placeholders){
    const container = document.getElementById(containerId);
    container.innerHTML = "";
    story[arrKey].forEach((val, i) => {
      const row = document.createElement("div");
      row.className = "point-row";
      row.innerHTML = `
        <input class="field-input" type="text" value="${escapeHtml(val)}" placeholder="${escapeHtml(placeholders[i % placeholders.length])}">
        <button type="button" class="qa-icon-btn danger" title="Remove">&times;</button>`;
      row.querySelector("input").addEventListener("input", (e) => { story[arrKey][i] = e.target.value; markDirty(); });
      row.querySelector("button").addEventListener("click", () => { story[arrKey].splice(i,1); markDirty(); renderPointList(containerId, arrKey, placeholders); });
      container.appendChild(row);
    });
  }

  document.querySelectorAll("[data-addpoint]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.addpoint === "relate" ? "relatePoints" : "actionPoints";
      const containerId = btn.dataset.addpoint === "relate" ? "relatePointsList" : "actionPointsList";
      const placeholders = btn.dataset.addpoint === "relate" ? RELATE_PLACEHOLDERS : ACTION_PLACEHOLDERS;
      story[key].push("");
      markDirty();
      renderPointList(containerId, key, placeholders);
      const inputs = document.getElementById(containerId).querySelectorAll("input");
      if(inputs.length) inputs[inputs.length - 1].focus();
    });
  });

  document.getElementById("fieldRelateIntro").addEventListener("input", (e) => { story.relateIntro = e.target.value; markDirty(); });
  document.getElementById("fieldRelateClose").addEventListener("input", (e) => { story.relateClose = e.target.value; markDirty(); });

  // ---------------- step 5: urgent care ----------------
  const fieldUrgent = document.getElementById("fieldUrgent");
  const fieldUrgentReviewed = document.getElementById("fieldUrgentReviewed");
  fieldUrgent.addEventListener("input", () => { story.urgent = fieldUrgent.value; markDirty(); });
  fieldUrgentReviewed.addEventListener("change", () => { story.urgentReviewed = fieldUrgentReviewed.checked; markDirty(); });

  // ---------------- step 6: privacy + final review ----------------
  const chkConsent = document.getElementById("chkConsent");
  const chkIdentifiers = document.getElementById("chkIdentifiers");
  const chkReviewed = document.getElementById("chkReviewed");
  const chkNoDetails = document.getElementById("chkNoDetails");
  const chkMedical = document.getElementById("chkMedical");
  [["consentConfirmed",chkConsent],["identifiersRemoved",chkIdentifiers],["privacyReviewed",chkReviewed],["noIdentifyingDetails",chkNoDetails],["medicalReviewed",chkMedical]]
    .forEach(([key, el]) => el.addEventListener("change", () => { story[key] = el.checked; markDirty(); updateFinalReview(); }));

  function privacyComplete(){
    return story.consentConfirmed && story.identifiersRemoved && story.privacyReviewed && story.noIdentifyingDetails && story.medicalReviewed;
  }
  function urgentOk(){ return !story.urgent.trim() || story.urgentReviewed; }
  function readyToPublish(){ return privacyComplete() && urgentOk() && story.title.trim().length > 0; }

  function updateFinalReview(){
    document.getElementById("rv-1").textContent = (story.title.trim() ? "\u25CF" : "\u25CB") + " The story is written in simple, patient-friendly language.";
    document.getElementById("rv-2").textContent = (story.dialogue.length > 0 ? "\u25CF" : "\u25CB") + " The patient's experience is represented accurately.";
    document.getElementById("rv-3").textContent = (privacyComplete() ? "\u25CF" : "\u25CB") + " The privacy checklist above is complete.";
    document.getElementById("rv-4").textContent = (urgentOk() ? "\u25CF" : "\u25CB") + " Any urgent-care guidance has been reviewed.";
    document.getElementById("publishBtn").disabled = !readyToPublish();
    const pfp = document.getElementById("publishFromPreviewBtn");
    if(pfp) pfp.disabled = !readyToPublish();
  }

  // ---------------- populate form from story state ----------------
  function populateForm(){
    fieldTitle.value = story.title;
    fieldTopic.value = story.topic;
    fieldSubtitle.value = story.subtitle;
    fieldIntro.value = story.intro;
    fieldUrgent.value = story.urgent;
    fieldUrgentReviewed.checked = story.urgentReviewed;
    chkConsent.checked = story.consentConfirmed;
    chkIdentifiers.checked = story.identifiersRemoved;
    chkReviewed.checked = story.privacyReviewed;
    chkNoDetails.checked = story.noIdentifyingDetails;
    chkMedical.checked = story.medicalReviewed;
    document.getElementById("fieldRelateIntro").value = story.relateIntro;
    document.getElementById("fieldRelateClose").value = story.relateClose;
    renderQaList();
    renderSuggestedQuestions();
    renderPointList("relatePointsList", "relatePoints", RELATE_PLACEHOLDERS);
    renderPointList("actionPointsList", "actionPoints", ACTION_PLACEHOLDERS);
    document.getElementById("editorHeading").textContent = story.title ? `Editing: ${stripQuotes(story.title)}` : "New Patient Insight";
    document.getElementById("saveDraftBtn").textContent = story.status === "published" ? "Save changes" : "Save draft";
    updateFinalReview();
  }

  // ---------------- save / publish / preview ----------------
  const autosaveStatus = document.getElementById("autosaveStatus");

  function scheduleAutosave(){
    if(!story.title.trim() && !story.id) return; // nothing worth saving yet
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(doAutosave, 2500);
  }

  async function doAutosave(){
    autosaveStatus.textContent = "Saving\u2026";
    try {
      const saved = await window.PatientInsightsDB.save(cleanForSave(story));
      story.id = saved.id;
      story.slug = saved.slug;
      dirty = false;
      autosaveStatus.textContent = "Saved";
      setTimeout(() => { if(autosaveStatus.textContent === "Saved") autosaveStatus.textContent = ""; }, 2000);
    } catch(e){
      autosaveStatus.textContent = "Couldn't save";
    }
  }

  function cleanForSave(s){
    const copy = Object.assign({}, s);
    copy.dialogue = s.dialogue.map((d) => ({ q: d.q, a: d.a }));
    copy.relatePoints = s.relatePoints.filter((p) => p.trim());
    copy.actionPoints = s.actionPoints.filter((p) => p.trim());
    return copy;
  }

  document.getElementById("saveDraftBtn").addEventListener("click", async () => {
    clearTimeout(autosaveTimer);
    await doAutosave();
  });

  document.getElementById("previewBtn").addEventListener("click", showPreview);
  document.getElementById("backToEditBtn").addEventListener("click", () => {
    document.getElementById("previewView").style.display = "none";
    document.getElementById("wizardView").style.display = "";
  });

  function renderPreview(){
    const shell = document.getElementById("previewShell");
    const cleaned = cleanForSave(story);
    shell.innerHTML = `
      <div class="p-eyebrow">Patient Story &middot; Preview</div>
      <h1>${escapeHtml(stripQuotes(cleaned.title) || "Untitled story")}</h1>
      <p class="p-intro">${escapeHtml(cleaned.intro)}</p>
      ${cleaned.dialogue.map((d) => `<div class="preview-qa"><p class="q">${escapeHtml(d.q)}</p><p class="a">${escapeHtml(d.a)}</p></div>`).join("")}
      ${cleaned.relatePoints.length ? `
        <div class="preview-section">
          <h3>You might relate to this if&hellip;</h3>
          <p>${escapeHtml(cleaned.relateIntro)}</p>
          <ul>${cleaned.relatePoints.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>
          ${cleaned.relateClose ? `<p>${escapeHtml(cleaned.relateClose)}</p>` : ""}
        </div>` : ""}
      ${cleaned.actionPoints.length ? `
        <div class="preview-section">
          <h3>What you can do</h3>
          <ul>${cleaned.actionPoints.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>
        </div>` : ""}
      ${cleaned.urgent ? `<div class="preview-urgent"><strong>When to seek urgent care:</strong> ${escapeHtml(cleaned.urgent)}</div>` : ""}
    `;
  }

  function showPreview(){
    renderPreview();
    document.getElementById("wizardView").style.display = "none";
    document.getElementById("previewView").style.display = "";
    window.scrollTo({ top: 0 });
  }

  async function doPublish(){
    if(!readyToPublish()){
      goToStep(6);
      alert("Before publishing: finish the privacy checklist, confirm urgent-care guidance has been reviewed (if you added any), and make sure the story has a title.");
      return;
    }
    story.status = "published";
    try {
      const saved = await window.PatientInsightsDB.save(cleanForSave(story));
      story.id = saved.id; story.slug = saved.slug; dirty = false;
      window.location.href = "index.html";
    } catch(e){
      alert("Couldn't publish: " + e.message);
    }
  }
  document.getElementById("publishBtn").addEventListener("click", doPublish);
  document.getElementById("publishFromPreviewBtn").addEventListener("click", doPublish);

  document.getElementById("logoutBtn").addEventListener("click", () => window.AdminAuth.logout());

  window.addEventListener("beforeunload", (e) => {
    if(!dirty) return;
    e.preventDefault();
    e.returnValue = "";
  });

  // ---------------- boot ----------------
  window.AdminAuth.requireSession().then(async () => {
    if(storyId){
      try {
        story = await window.PatientInsightsDB.getById(storyId);
        story.dialogue = (story.dialogue || []).map((d) => ({ q: d.q, a: d.a }));
      } catch(e){
        alert("Couldn't load that story.");
        window.location.href = "index.html";
        return;
      }
    }
    populateForm();
    fillAiSourceFromStory();
    const step = params.get("step");
    goToStep(step === "preview" ? TOTAL_STEPS : 1);
    if(step === "preview") showPreview();
  }).catch(() => {});
})();
