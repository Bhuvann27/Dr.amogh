(function(){
  "use strict";
  function boot(){
    const step2=document.getElementById("piConversationCard");
    const step3=document.getElementById("piDraftCard");
    const step1Status=document.getElementById("piStatus");
    const answerBtn=document.getElementById("piAnswerBtn");
    const questionBox=document.getElementById("piQuestionBox");
    if(!step2||!step3||!step1Status||!answerBtn)return;

    const css=document.createElement("style");
    css.textContent=`
      .pi-ux-helper{margin:8px 0 0;color:var(--text-dim);font-size:.82rem;line-height:1.5}
      .pi-processing{display:flex;align-items:center;gap:10px;margin-top:14px;padding:12px 14px;border-radius:14px;background:#f7f4ef;border:1px solid rgba(23,19,15,.08);color:#3e3934;font-size:.88rem;line-height:1.45}
      .pi-processing[hidden]{display:none!important}
      .pi-spinner{width:16px;height:16px;border:2px solid rgba(23,19,15,.16);border-top-color:var(--orange-deep);border-radius:50%;animation:piUxSpin .75s linear infinite;flex:0 0 auto}
      @keyframes piUxSpin{to{transform:rotate(360deg)}}
      .pi-complete{display:inline-flex;align-items:center;gap:7px;margin-top:12px;color:#28724a;font-size:.82rem;font-weight:700}
      .pi-complete[hidden]{display:none!important}
      .pi-step-note{margin:4px 0 18px;color:var(--text-dim);font-size:.84rem;line-height:1.55}
      .pi-draft-note{margin:0 0 18px;padding:12px 14px;border-radius:14px;background:#fff7f1;border:1px solid rgba(242,84,12,.14);color:#5c473a;font-size:.84rem;line-height:1.5}
      .pi-ux-loading-active #piAnswerBtn{opacity:.55;pointer-events:none}
    `;
    document.head.appendChild(css);

    const helper=document.createElement("p");
    helper.className="pi-ux-helper";
    helper.textContent="A short answer in your own words is enough. If you are unsure, you can skip this detail.";
    if(questionBox) questionBox.insertAdjacentElement("afterend",helper);

    const step2Status=document.createElement("div");
    step2Status.className="pi-processing";
    step2Status.id="piStep2Processing";
    step2Status.hidden=true;
    step2Status.innerHTML='<span class="pi-spinner" aria-hidden="true"></span><span><strong id="piStep2ProcessingTitle">Creating the patient story…</strong><br><span id="piStep2ProcessingText">Turning your notes into a clear, patient-friendly draft.</span></span>';
    const answerActions=answerBtn.parentElement;
    if(answerActions) answerActions.insertAdjacentElement("afterend",step2Status);

    const completed=document.createElement("div");
    completed.className="pi-complete";
    completed.id="piStep1Complete";
    completed.hidden=true;
    completed.innerHTML='<span aria-hidden="true">✓</span><span>Case understood</span>';
    step1Status.insertAdjacentElement("afterend",completed);

    const draftNote=document.createElement("div");
    draftNote.className="pi-draft-note";
    draftNote.innerHTML='<strong>Doctor approval required.</strong> Review the draft carefully. Nothing is published automatically.';
    const draftHelp=step3.querySelector(".pi-help");
    if(draftHelp) draftHelp.insertAdjacentElement("afterend",draftNote);

    function text(){return (step1Status.textContent||"").trim().toLowerCase()}
    function setStep2Loading(on,msg){
      step2Status.hidden=!on;
      document.body.classList.toggle("pi-ux-loading-active",on);
      if(on){
        const title=document.getElementById("piStep2ProcessingTitle");
        const sub=document.getElementById("piStep2ProcessingText");
        if(title) title.textContent=msg||"Creating the patient story…";
        if(sub) sub.textContent="Turning your notes into a clear, patient-friendly draft. You can review everything before it is published.";
      }
    }

    function sync(){
      const t=text();
      const processing=/writing|creating|generating|preparing|drafting|turning your notes|building/i.test(t);
      const conversationVisible=!step2.hidden;
      const draftVisible=!step3.hidden;
      if(processing&&conversationVisible){
        setStep2Loading(true);
        step1Status.style.visibility="hidden";
      }else if(draftVisible){
        setStep2Loading(false);
        step1Status.style.visibility="hidden";
      }else{
        setStep2Loading(false);
        step1Status.style.visibility="visible";
      }
      if(!step2.hidden && !processing && t && /understood|ready|question|detail/i.test(t)) step1Status.style.visibility="hidden";
      if(!step2.hidden) completed.hidden=false;
    }

    new MutationObserver(sync).observe(step1Status,{subtree:true,childList:true,characterData:true,attributes:true});
    new MutationObserver(sync).observe(step2,{attributes:true,childList:true,subtree:true});
    new MutationObserver(sync).observe(step3,{attributes:true,childList:true,subtree:true});

    const observer=new MutationObserver(function(){
      if(step2.hidden)return;
      const b=document.getElementById("piAnswerBtn");
      if(!b||b.disabled)return;
      const current=(b.textContent||"").trim().toLowerCase();
      if(/generate|create|finish|continue/.test(current)){
        const q=(questionBox?.textContent||"").toLowerCase();
        if(/final|last|ready|one more|anything else/.test(q)) b.textContent="Create the story";
      }
    });
    observer.observe(step2,{subtree:true,childList:true,characterData:true});

    setTimeout(sync,50);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
