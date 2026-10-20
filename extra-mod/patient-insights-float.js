/* Patient Insights floating CTA
   Keeps the source CTA in normal document flow and creates the compact
   floating state only after the section has actually been passed. */
(function(){
  "use strict";

  const section = document.getElementById("stories");
  const footer = section && section.querySelector(".stories-focus-footer");
  const source = footer && footer.querySelector(".btn-primary");
  if(!section || !footer || !source) return;

  let floating = null;
  let state = "inside";
  let raf = 0;
  let lastPassed = false;

  function makeFloating(){
    if(floating) return floating;
    floating = document.createElement("a");
    floating.className = "patient-insights-float";
    floating.href = source.getAttribute("href") || "stories.html";
    floating.setAttribute("aria-label", "Open Patient Insights");
    floating.innerHTML = '<span aria-hidden="true">↗</span>';
    document.body.appendChild(floating);

    floating.addEventListener("click", function(){
      floating.classList.add("is-tapped");
    }, {passive:true});

    return floating;
  }

  function setFloating(visible){
    const el = makeFloating();
    if(visible){
      if(state === "floating") return;
      state = "floating";
      source.classList.remove("is-floating-source");
      footer.classList.remove("is-floating-source");
      el.classList.remove("is-leaving");
      el.getBoundingClientRect();
      el.classList.add("is-visible");
    }else{
      if(state === "inside") return;
      state = "inside";
      el.classList.remove("is-visible");
      el.classList.add("is-leaving");
      source.classList.remove("is-floating-source");
      footer.classList.remove("is-floating-source");
    }
  }

  function sync(){
    raf = 0;
    const rect = section.getBoundingClientRect();
    const passed = rect.bottom <= 0;

    if(passed !== lastPassed){
      lastPassed = passed;
      setFloating(passed);
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
