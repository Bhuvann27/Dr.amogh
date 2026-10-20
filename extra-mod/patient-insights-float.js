/* Patient Insights floating CTA
   Keeps the source CTA in normal document flow, gives it a short exit
   treatment as the section is left, then introduces a compact floating
   reminder after the section has actually been passed. */
(function(){
  "use strict";

  const section = document.getElementById("stories");
  const footer = section && section.querySelector(".stories-focus-footer");
  const source = footer && footer.querySelector(".btn-primary");
  if(!section || !footer || !source) return;

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
    floating.innerHTML = '<span class="patient-insights-float-copy">SOMETHING HERE MAY FEEL FAMILIAR</span><span class="patient-insights-float-arrow" aria-hidden="true">↗</span>';
    document.body.appendChild(floating);

    floating.addEventListener("click", function(){
      floating.classList.add("is-tapped");
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
