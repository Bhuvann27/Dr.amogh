/* Patient Insights floating CTA
   Keeps the source CTA in normal document flow, gives it a short exit
   treatment as the section is left, then introduces a larger premium
   reminder after the section has actually been passed. */
(function(){
  "use strict";

  const section = document.getElementById("stories");
  const footer = section && section.querySelector(".stories-focus-footer");
  const source = footer && footer.querySelector(".btn-primary");
  if(!section || !footer || !source) return;

  const headingLabel = section.querySelector(".stories-focus-head .eyebrow");
  if(headingLabel){
    headingLabel.textContent = "PATIENT INSIGHTS";
    headingLabel.classList.add("patient-insights-heading-label");
  }

  const style = document.createElement("style");
  style.textContent = `
    .patient-insights-heading-label{display:inline-flex !important;align-items:center;gap:8px;}
    .patient-insights-heading-label::after{content:"";width:28px;height:1px;display:inline-block;background:currentColor;opacity:.55;transform:translateY(1px);}
    .patient-insights-float{
      min-height:76px;
      padding:12px 14px 12px 19px;
      gap:14px;
      border:1px solid rgba(242,84,12,.52);
      border-radius:21px;
      background:linear-gradient(135deg,#171411 0%,#29231f 100%);
      box-shadow:0 16px 38px rgba(23,19,15,.30),0 0 0 1px rgba(255,255,255,.05) inset,0 0 28px rgba(242,84,12,.28),0 0 58px rgba(242,84,12,.12);
      overflow:visible;
    }
    .patient-insights-float::before{
      inset:-9px;
      border-radius:25px;
      background:rgba(242,84,12,.12);
      filter:blur(5px);
      box-shadow:0 0 0 0 rgba(242,84,12,.28);
      animation:patientInsightsFloatGlowPremium 2.8s ease-out infinite;
    }
    .patient-insights-float::after{content:"";position:absolute;inset:1px;border-radius:19px;border-top:1px solid rgba(255,255,255,.09);pointer-events:none;}
    .patient-insights-float-text{min-width:0;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:7px;}
    .patient-insights-float-kicker{display:block;color:#ff955f;font-size:8px;line-height:1;letter-spacing:.20em;font-weight:800;white-space:nowrap;}
    .patient-insights-float-copy{display:block;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;color:rgba(255,255,255,.98);font-size:11px;line-height:1.05;letter-spacing:.105em;font-weight:800;}
    .patient-insights-float-arrow{position:relative;z-index:2;width:38px;height:38px;background:linear-gradient(145deg,#ff9866,#e84e0b);box-shadow:0 5px 16px rgba(242,84,12,.36),0 0 20px rgba(242,84,12,.26);}
    @keyframes patientInsightsFloatGlowPremium{0%,100%{opacity:.48;transform:scale(.96);box-shadow:0 0 0 0 rgba(242,84,12,.18);}48%{opacity:0;transform:scale(1.09);box-shadow:0 0 0 11px rgba(242,84,12,0);}}
    .patient-insights-float:active,.patient-insights-float.is-tapped{transform:translate3d(0,0,0) scale(.96);border-color:rgba(255,138,85,.82);box-shadow:0 10px 28px rgba(23,19,15,.32),0 0 0 6px rgba(242,84,12,.13),0 0 42px rgba(242,84,12,.44);}
    .patient-insights-float:active .patient-insights-float-arrow,.patient-insights-float.is-tapped .patient-insights-float-arrow,.patient-insights-float:focus-visible .patient-insights-float-arrow{transform:translate(2px,-2px) scale(1.08);box-shadow:0 5px 18px rgba(242,84,12,.48),0 0 24px rgba(242,84,12,.38);}
    @media(max-width:700px){
      .patient-insights-float{left:12px;bottom:max(16px,env(safe-area-inset-bottom));max-width:calc(100vw - 104px);min-height:60px;padding:9px 10px 9px 14px;gap:9px;border-radius:19px;}
      .patient-insights-float-text{gap:5px;min-width:0;}
      .patient-insights-float-kicker{font-size:7px;letter-spacing:.15em;}
      .patient-insights-float-copy{font-size:9px;letter-spacing:.065em;}
      .patient-insights-float-arrow{width:32px;height:32px;font-size:15px;}
    }
    @media(max-width:380px){
      .patient-insights-float{max-width:calc(100vw - 104px);min-height:56px;padding:8px 9px 8px 12px;gap:7px;border-radius:17px;}
      .patient-insights-float-text{gap:4px;}
      .patient-insights-float-kicker{font-size:6.5px;letter-spacing:.12em;}
      .patient-insights-float-copy{font-size:8px;letter-spacing:.045em;}
      .patient-insights-float-arrow{width:29px;height:29px;font-size:14px;}
    }
    @media(prefers-reduced-motion:reduce){.patient-insights-float::before{animation:none;}}
  `;
  document.head.appendChild(style);

  let floating = null;
  let raf = 0;
  let passed = false;
  let exiting = false;

  function makeFloating(){
    if(floating) return floating;
    floating = document.createElement("a");
    floating.className = "patient-insights-float";
    floating.href = source.getAttribute("href") || "stories.html";
    floating.setAttribute("aria-label", "Open Patient Insights. Something here may feel familiar.");
    floating.innerHTML = '<span class="patient-insights-float-text"><span class="patient-insights-float-kicker">PATIENT INSIGHTS</span><span class="patient-insights-float-copy">SOMETHING HERE MAY FEEL FAMILIAR</span></span><span class="patient-insights-float-arrow" aria-hidden="true">↗</span>';
    document.body.appendChild(floating);
    floating.addEventListener("click",function(){floating.classList.add("is-tapped");window.setTimeout(function(){if(floating) floating.classList.remove("is-tapped");},320);});
    return floating;
  }

  function sync(){
    raf=0;
    const rect=section.getBoundingClientRect();
    const exitStart=Math.min(120,Math.max(72,window.innerHeight*.12));
    const shouldExit=rect.bottom<=exitStart&&rect.bottom>0;
    const shouldFloat=rect.bottom<=0;
    if(shouldExit!==exiting){exiting=shouldExit;source.classList.toggle("is-exiting",exiting);footer.classList.toggle("is-exiting",exiting);}
    if(shouldFloat!==passed){
      passed=shouldFloat;
      const el=makeFloating();
      if(passed){el.classList.remove("is-leaving");requestAnimationFrame(()=>el.classList.add("is-visible"));}
      else{el.classList.remove("is-visible");el.classList.add("is-leaving");}
    }
  }
  function queue(){if(raf)return;raf=requestAnimationFrame(sync);}
  window.addEventListener("scroll",queue,{passive:true});
  window.addEventListener("resize",queue,{passive:true});
  window.addEventListener("pageshow",queue,{passive:true});
  queue();
})();
