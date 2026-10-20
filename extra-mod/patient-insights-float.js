/* Patient Insights floating CTA
   Keeps the source CTA in normal document flow, gives it a short exit
   treatment as the section is left, then introduces a compact premium
   reminder after the section has actually been passed. */
(function(){
  "use strict";

  const section = document.getElementById("stories");
  const footer = section && section.querySelector(".stories-focus-footer");
  const source = footer && footer.querySelector(".btn-primary");
  if(!section || !footer || !source) return;

  /* Make the section identity explicit without changing its layout. */
  const headingLabel = section.querySelector(".stories-focus-head .eyebrow");
  if(headingLabel){
    headingLabel.textContent = "PATIENT INSIGHTS";
    headingLabel.classList.add("patient-insights-heading-label");
  }

  /* The base stylesheet already handles the structure. These focused
     overrides add the more refined, premium treatment requested for the
     floating reminder without touching the rest of the site. */
  const style = document.createElement("style");
  style.textContent = `
    .patient-insights-heading-label{
      display:inline-flex !important;
      align-items:center;
      gap:8px;
    }
    .patient-insights-heading-label::after{
      content:"";
      width:28px;
      height:1px;
      display:inline-block;
      background:currentColor;
      opacity:.55;
      transform:translateY(1px);
    }
    .patient-insights-float{
      min-height:54px;
      padding:8px 11px 8px 16px;
      gap:11px;
      border:1px solid rgba(242,84,12,.48);
      border-radius:18px;
      background:linear-gradient(135deg,#171411 0%,#26211d 100%);
      box-shadow:
        0 12px 32px rgba(23,19,15,.28),
        0 0 0 1px rgba(255,255,255,.045) inset,
        0 0 22px rgba(242,84,12,.24),
        0 0 46px rgba(242,84,12,.10);
      overflow:visible;
    }
    .patient-insights-float::before{
      inset:-7px;
      border-radius:22px;
      background:rgba(242,84,12,.11);
      filter:blur(4px);
      box-shadow:0 0 0 0 rgba(242,84,12,.25);
      animation:patientInsightsFloatGlowPremium 2.7s ease-out infinite;
    }
    .patient-insights-float::after{
      content:"";
      position:absolute;
      inset:1px;
      border-radius:16px;
      border-top:1px solid rgba(255,255,255,.08);
      pointer-events:none;
    }
    .patient-insights-float-text{
      min-width:0;
      display:flex;
      flex-direction:column;
      align-items:flex-start;
      justify-content:center;
      gap:4px;
    }
    .patient-insights-float-kicker{
      display:block;
      color:#ff8a55;
      font-size:7px;
      line-height:1;
      letter-spacing:.18em;
      font-weight:800;
      white-space:nowrap;
    }
    .patient-insights-float-copy{
      display:block;
      min-width:0;
      overflow:hidden;
      white-space:nowrap;
      text-overflow:ellipsis;
      color:rgba(255,255,255,.96);
      font-size:9px;
      line-height:1.05;
      letter-spacing:.105em;
      font-weight:800;
    }
    .patient-insights-float-arrow{
      position:relative;
      z-index:2;
      width:29px;
      height:29px;
      background:linear-gradient(145deg,#ff8b57,#e84e0b);
      box-shadow:
        0 4px 12px rgba(242,84,12,.30),
        0 0 14px rgba(242,84,12,.22);
    }
    @keyframes patientInsightsFloatGlowPremium{
      0%,100%{opacity:.46;transform:scale(.96);box-shadow:0 0 0 0 rgba(242,84,12,.16);}
      48%{opacity:0;transform:scale(1.08);box-shadow:0 0 0 9px rgba(242,84,12,0);}
    }
    .patient-insights-float:active,
    .patient-insights-float.is-tapped{
      transform:translate3d(0,0,0) scale(.95);
      border-color:rgba(255,138,85,.78);
      box-shadow:
        0 8px 24px rgba(23,19,15,.30),
        0 0 0 5px rgba(242,84,12,.12),
        0 0 36px rgba(242,84,12,.40);
    }
    .patient-insights-float:active .patient-insights-float-arrow,
    .patient-insights-float.is-tapped .patient-insights-float-arrow,
    .patient-insights-float:focus-visible .patient-insights-float-arrow{
      transform:translate(2px,-2px) scale(1.09);
      box-shadow:0 4px 15px rgba(242,84,12,.42),0 0 20px rgba(242,84,12,.34);
    }
    @media(max-width:700px){
      .patient-insights-float{
        left:12px;
        bottom:max(16px,env(safe-area-inset-bottom));
        max-width:calc(100vw - 76px);
        min-height:52px;
        padding:7px 10px 7px 14px;
        gap:9px;
        border-radius:17px;
      }
      .patient-insights-float-kicker{font-size:6.5px;letter-spacing:.16em;}
      .patient-insights-float-copy{font-size:8.5px;letter-spacing:.09em;}
      .patient-insights-float-arrow{width:27px;height:27px;font-size:14px;}
    }
    @media(prefers-reduced-motion:reduce){
      .patient-insights-float::before{animation:none;}
    }
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
    floating.innerHTML = [
      '<span class="patient-insights-float-text">',
        '<span class="patient-insights-float-kicker">PATIENT INSIGHTS</span>',
        '<span class="patient-insights-float-copy">SOMETHING HERE MAY FEEL FAMILIAR</span>',
      '</span>',
      '<span class="patient-insights-float-arrow" aria-hidden="true">↗</span>'
    ].join("");
    document.body.appendChild(floating);

    floating.addEventListener("click", function(){
      floating.classList.add("is-tapped");
      window.setTimeout(function(){
        if(floating) floating.classList.remove("is-tapped");
      }, 320);
    });

    return floating;
  }

  function sync(){
    raf = 0;

    const rect = section.getBoundingClientRect();
    const exitStart = Math.min(120, Math.max(72, window.innerHeight * 0.12));
    const shouldExit = rect.bottom <= exitStart && rect.bottom > 0;
    const shouldFloat = rect.bottom <= 0;

    if(shouldExit !== exiting){
      exiting = shouldExit;
      source.classList.toggle("is-exiting", exiting);
      footer.classList.toggle("is-exiting", exiting);
    }

    if(shouldFloat !== passed){
      passed = shouldFloat;
      const el = makeFloating();
      if(passed){
        el.classList.remove("is-leaving");
        requestAnimationFrame(() => el.classList.add("is-visible"));
      }else{
        el.classList.remove("is-visible");
        el.classList.add("is-leaving");
      }
    }
  }

  function queue(){
    if(raf) return;
    raf = requestAnimationFrame(sync);
  }

  window.addEventListener("scroll", queue, {passive:true});
  window.addEventListener("resize", queue, {passive:true});
  window.addEventListener("pageshow", queue, {passive:true});
  queue();
})();
