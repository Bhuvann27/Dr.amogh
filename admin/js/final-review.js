(function(){
  "use strict";
  const params=new URLSearchParams(location.search),id=params.get("id");
  const app=document.getElementById("app");
  let client=null,story=null,dirty=false;
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const text=v=>{if(v==null)return "";if(typeof v==="string"||typeof v==="number")return String(v);if(Array.isArray(v))return v.map(text).filter(Boolean).join(" ");if(typeof v==="object"){for(const k of ["text","value","point","label","content","answer","q","a"]){if(v[k]!=null){const x=text(v[k]);if(x)return x;}}}return "";};
  const arr=v=>Array.isArray(v)?v.map(text).map(x=>x.trim()).filter(Boolean):[];
  const dialogue=v=>Array.isArray(v)?v.map(x=>({q:text(x?.q??x?.question??""),a:text(x?.a??x?.answer??x?.text??"")})).filter(x=>x.q||x.a):[];
  function normalise(s){return Object.assign({},s,{title:text(s.title),subtitle:text(s.subtitle),intro:text(s.intro),relateIntro:text(s.relateIntro),relatePoints:arr(s.relatePoints),relateClose:text(s.relateClose),actionPoints:arr(s.actionPoints),urgent:text(s.urgent),dialogue:dialogue(s.dialogue)});}
  function getClient(){if(client)return client;if(!window.isSupabaseConfigured())throw Error("Supabase is not configured.");client=window.supabase.createClient(window.SUPABASE_CONFIG.url,window.SUPABASE_CONFIG.anonKey);return client;}
  async function load(){if(!id)throw Error("No story was selected.");await window.AdminAuth.requireSession();story=normalise(await window.PatientInsightsDB.getById(id));render();}
  function field(label,key,value,cls=""){return `<div class="fr-field ${cls}"><label>${label}</label><textarea data-key="${key}">${esc(value)}</textarea></div>`;}
  function render(){
    app.innerHTML=`<div class="fr-hero"><span class="fr-kicker">FINAL STEP · DOCTOR REVIEW</span><h1>Review everything before publishing.</h1><p>This is the last safety gate. You can edit every patient-facing sentence, ask the AI for a controlled rewrite, check privacy and accuracy, then publish only when every required confirmation is complete.</p></div>
    <div class="fr-grid"><section>
      <div class="fr-card"><span class="fr-badge">Content editor</span><h2 style="margin-top:12px">Final patient-facing content</h2><p class="fr-help">These are the actual fields that will be published. Edit them directly. AI suggestions never publish automatically.</p>
      ${field("Story title","title",story.title)}${field("Short label / subtitle","subtitle",story.subtitle)}${field("Introduction","intro",story.intro)}
      <div class="fr-field"><label>Patient ↔ Doctor conversation</label><div id="pairs"></div><button class="fr-add" id="addPair" type="button">+ Add conversation exchange</button></div>
      ${field("Relate section opening","relateIntro",story.relateIntro)}
      <div class="fr-field"><label>Things a reader might relate to</label><div id="relate"></div><button class="fr-add" id="addRelate" type="button">+ Add point</button></div>
      ${field("Relate section closing","relateClose",story.relateClose)}
      <div class="fr-field"><label>What you can do</label><div id="actions"></div><button class="fr-add" id="addAction" type="button">+ Add practical step</button></div>
      ${field("When to seek urgent care","urgent",story.urgent)}
      <div class="fr-ai"><span class="fr-kicker" style="color:#ffd0ba">OPTIONAL AI TWEAK</span><h2 style="margin-top:7px">Make one final controlled change</h2><p>Describe exactly what you want changed. The AI is instructed to preserve the supplied facts and not invent diagnoses, tests, medicines, outcomes, quotes or identifying information.</p><textarea id="aiInstruction" placeholder="Example: Make the introduction shorter and make the answers sound more natural, without changing any medical facts."></textarea><div class="fr-actions"><button class="fr-save" id="aiBtn" type="button">Apply AI tweak</button><span id="aiStatus" class="fr-status"></span></div></div>
      <div class="fr-actions"><button class="fr-save" id="saveBtn" type="button">Save final edits</button><a class="fr-save" style="text-decoration:none" href="index.html">Back to dashboard</a></div><div id="saveStatus" class="fr-status"></div></div>
      <div class="fr-card"><span class="fr-badge">Publish gate</span><h2 style="margin-top:12px">Doctor confirmations</h2><p class="fr-help">Publishing stays disabled until the required confirmations are checked. These confirmations support responsible review but do not replace applicable consent, privacy, professional, or legal requirements.</p><div class="fr-checks">
        <label><input type="checkbox" id="chkConsent" ${story.consentConfirmed?'checked':''}><span>I have obtained the appropriate consent required to publish this patient story.</span></label>
        <label><input type="checkbox" id="chkAnon" ${story.anonymousConfirmed?'checked':''}><span>I confirm the published story is anonymised and does not intentionally identify the patient.</span></label>
        <label><input type="checkbox" id="chkIdentifiers" ${story.identifiersRemoved?'checked':''}><span>I have removed unnecessary names, locations, dates, phone numbers, workplace details, IDs and other identifying information.</span></label>
        <label><input type="checkbox" id="chkMedical" ${story.medicalReviewed?'checked':''}><span>I have personally reviewed the medical information and confirmed it is accurate and appropriate for patient education.</span></label>
        <label><input type="checkbox" id="chkUrgent" ${story.urgentReviewed?'checked':''} ${story.urgent?'':'disabled'}><span>${story.urgent?'I have reviewed the urgent-care / red-flag guidance for this story.':'No urgent-care guidance is present, so no urgent-care review is required.'}</span></label>
        <label><input type="checkbox" id="chkPrivacy" ${story.privacyReviewed?'checked':''}><span>I have completed a final privacy review of the entire patient-facing story.</span></label>
        <label><input type="checkbox" id="chkNoDetails" ${story.noIdentifyingDetails?'checked':''}><span>I confirm there are no unnecessary identifying details anywhere in the final version, including the conversation and related sections.</span></label>
        <label><input type="checkbox" id="chkFinal"><span>I have read the final version as it will appear to patients and approve this exact version for publication.</span></label>
      </div><p class="fr-note">The system records the final-review state before publication. If any content is changed later, the final approval must be completed again.</p><div class="fr-actions"><span></span><button class="fr-publish" id="publishBtn" type="button" disabled>Publish this exact version</button></div><div id="publishStatus" class="fr-status"></div></div>
    </section>
    <aside class="fr-preview"><span class="fr-kicker" style="color:#ffd0ba">LIVE PATIENT PREVIEW</span><h2>What patients will see</h2><p class="muted">This preview updates from the editable fields. Review it before checking the final approval box.</p><div id="preview"></div></aside></div>`;
    bindDynamic();updatePreview();updatePublishState();
  }
  function pairEditor(p,i){return `<div class="fr-pair"><div class="fr-pair-head"><strong>Exchange ${String(i+1).padStart(2,"0")}</strong><button class="fr-remove" type="button" data-remove-pair="${i}">Remove</button></div><div class="fr-field"><label>Patient question</label><textarea data-pair-q="${i}">${esc(p.q)}</textarea></div><div class="fr-field" style="margin-bottom:0"><label>Answer / patient voice</label><textarea data-pair-a="${i}">${esc(p.a)}</textarea></div></div>`;}
  function pointEditor(value,i,type){return `<div class="fr-pair"><div class="fr-pair-head"><strong>${type} ${String(i+1).padStart(2,"0")}</strong><button class="fr-remove" type="button" data-remove-${type.toLowerCase()}="${i}">Remove</button></div><textarea data-${type.toLowerCase()}="${i}">${esc(value)}</textarea></div>`;}
  function bindDynamic(){
    const pairs=document.getElementById("pairs"),relate=document.getElementById("relate"),actions=document.getElementById("actions");
    function renderLists(){pairs.innerHTML=story.dialogue.map(pairEditor).join("");relate.innerHTML=story.relatePoints.map((x,i)=>pointEditor(x,i,"Relate")).join("");actions.innerHTML=story.actionPoints.map((x,i)=>pointEditor(x,i,"Action")).join("");}
    renderLists();
    document.getElementById("addPair").onclick=()=>{story.dialogue.push({q:"",a:""});renderLists();dirty=true;updatePreview();};
    document.getElementById("addRelate").onclick=()=>{story.relatePoints.push("");renderLists();dirty=true;updatePreview();};
    document.getElementById("addAction").onclick=()=>{story.actionPoints.push("");renderLists();dirty=true;updatePreview();};
    app.addEventListener("input",e=>{const k=e.target.dataset.key;if(k)story[k]=e.target.value;const q=e.target.dataset.pairQ;if(q!==undefined)story.dialogue[Number(q)].q=e.target.value;const a=e.target.dataset.pairA;if(a!==undefined)story.dialogue[Number(a)].a=e.target.value;const r=e.target.dataset.relate;if(r!==undefined)story.relatePoints[Number(r)]=e.target.value;const ac=e.target.dataset.action;if(ac!==undefined)story.actionPoints[Number(ac)]=e.target.value;dirty=true;updatePreview();updatePublishState();});
    app.addEventListener("click",e=>{const rp=e.target.closest("[data-remove-pair]");if(rp){story.dialogue.splice(Number(rp.dataset.removePair),1);renderLists();dirty=true;updatePreview();}const rr=e.target.closest("[data-remove-relate]");if(rr){story.relatePoints.splice(Number(rr.dataset.removeRelate),1);renderLists();dirty=true;updatePreview();}const ra=e.target.closest("[data-remove-action]");if(ra){story.actionPoints.splice(Number(ra.dataset.removeAction),1);renderLists();dirty=true;updatePreview();}});
    document.getElementById("saveBtn").onclick=saveStory;
    document.getElementById("publishBtn").onclick=publishStory;
    document.querySelectorAll(".fr-checks input").forEach(el=>el.addEventListener("change",()=>{if(el.id!=="chkFinal")dirty=true;updatePublishState();}));
    document.getElementById("aiBtn").onclick=aiTweak;
  }
  function updatePreview(){
    const p=document.getElementById("preview");if(!p)return;
    p.innerHTML=`<div class="pv-title">${esc(story.title||"Untitled story")}</div><p class="muted">${esc(story.subtitle||"")}</p><p class="pv-intro">${esc(story.intro||"")}</p><div class="pv-block"><h3>Conversation</h3>${story.dialogue.map(x=>`<div class="pv-turn"><b>PATIENT</b><p>${esc(x.q)}</p><b style="margin-top:10px">DOCTOR / PATIENT VOICE</b><p>${esc(x.a)}</p></div>`).join("")||'<p class="muted">No conversation yet.</p>'}</div><div class="pv-block"><h3>You might relate to this</h3><p class="muted">${esc(story.relateIntro)}</p><ul class="pv-list">${story.relatePoints.map(x=>`<li>${esc(x)}</li>`).join("")}</ul><p class="muted">${esc(story.relateClose)}</p></div><div class="pv-block"><h3>What you can do</h3><ul class="pv-list">${story.actionPoints.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>${story.urgent?`<div class="pv-block"><h3>When to seek urgent care</h3><p class="muted">${esc(story.urgent)}</p></div>`:""}`;
  }
  function updatePublishState(){
    const final=document.getElementById("chkFinal"),urgentOk=!story.urgent||document.getElementById("chkUrgent")?.checked;
    const ok=["chkConsent","chkAnon","chkIdentifiers","chkMedical","chkPrivacy","chkNoDetails"].every(id=>document.getElementById(id)?.checked)&&urgentOk&&final?.checked;
    const btn=document.getElementById("publishBtn");if(btn)btn.disabled=!ok;
    if(final)final.parentElement.classList.toggle("fr-danger",dirty&&!final.checked);
  }
  function readChecks(){return {consentConfirmed:document.getElementById("chkConsent").checked,anonymousConfirmed:document.getElementById("chkAnon").checked,identifiersRemoved:document.getElementById("chkIdentifiers").checked,medicalReviewed:document.getElementById("chkMedical").checked,urgentReviewed:document.getElementById("chkUrgent")?.checked||false,privacyReviewed:document.getElementById("chkPrivacy").checked,noIdentifyingDetails:document.getElementById("chkNoDetails").checked,finalReviewed:document.getElementById("chkFinal").checked};}
  async function saveStory(show=true){
    const status=document.getElementById("saveStatus");status.textContent="Saving…";status.className="fr-status";
    try{Object.assign(story,readChecks(),{status:"draft",dialogue:dialogue(story.dialogue),relatePoints:arr(story.relatePoints),actionPoints:arr(story.actionPoints),finalReviewed:false});story=normalise(await window.PatientInsightsDB.save(story));dirty=false;document.getElementById("chkFinal").checked=false;updatePublishState();if(show){status.textContent="Saved as a draft. Final approval has been reset because content changed.";status.className="fr-status success";}}catch(e){status.textContent=e.message;status.className="fr-status error";}}
  async function aiTweak(){
    const instruction=document.getElementById("aiInstruction").value.trim(),status=document.getElementById("aiStatus");if(!instruction){status.textContent="Describe the change you want first.";return;}
    status.textContent="AI is reviewing the requested change…";
    try{
      const session=await window.PatientInsightsDB.getSession();
      const payload={mode:"draft",notes:`CURRENT PATIENT STORY JSON:\n${JSON.stringify({title:story.title,subtitle:story.subtitle,intro:story.intro,dialogue:story.dialogue,relateIntro:story.relateIntro,relatePoints:story.relatePoints,relateClose:story.relateClose,actionPoints:story.actionPoints,urgent:story.urgent})}\n\nDOCTOR'S FINAL EDIT INSTRUCTION:\n${instruction}\n\nRewrite the same story with ONLY the requested editorial change. Preserve every supplied medical fact and privacy constraint. Never add facts. Return the normal JSON story format.`};
      const r=await fetch(window.SUPABASE_CONFIG.url+"/functions/v1/patient-insight-ai",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+session.access_token,"apikey":window.SUPABASE_CONFIG.anonKey},body:JSON.stringify(payload)});const d=await r.json();if(!r.ok)throw Error(d.error||"AI tweak failed.");
      story=normalise(Object.assign({},story,d));story.status="draft";dirty=true;render();document.getElementById("aiStatus").textContent="AI revision applied. Review every field before saving or approving.";document.getElementById("aiStatus").className="fr-status success";
    }catch(e){status.textContent=e.message;status.className="fr-status error";}
  }
  async function publishStory(){
    const checks=readChecks();if(!checks.finalReviewed)return;
    const status=document.getElementById("publishStatus");status.textContent="Publishing…";status.className="fr-status";
    try{
      Object.assign(story,checks,{status:"published"});
      const saved=await window.PatientInsightsDB.save(story);
      story=normalise(saved);dirty=false;status.textContent="Published successfully. The public site will now use this reviewed version.";status.className="fr-status success";document.getElementById("publishBtn").disabled=true;
    }catch(e){status.textContent=e.message;status.className="fr-status error";Object.assign(story,checks,{status:"draft"});}
  }
  document.getElementById("logoutBtn").onclick=()=>window.AdminAuth.logout();
  load().catch(e=>{app.innerHTML=`<div class="fr-card"><h2>Final review could not be opened</h2><p class="fr-danger">${esc(e.message)}</p><a href="index.html">Return to dashboard</a></div>`;});
})();
