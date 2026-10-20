/* Extra Mod: let the existing Patient Insights CTA follow the visitor after the section. */
(function(){
  const stories = document.getElementById('stories');
  const cta = document.querySelector('.stories-focus-footer .btn-primary');
  if(!stories || !cta) return;

  const originalLabel = cta.innerHTML;
  const floatingLabel = 'SOMETHING HERE MAY FEEL FAMILIAR <span aria-hidden="true">→</span>';

  function sync(){
    const passed = stories.getBoundingClientRect().bottom <= 0;
    cta.classList.toggle('patient-insights-floating', passed);
    if(passed){
      cta.innerHTML = floatingLabel;
      cta.setAttribute('aria-label','Open Patient Insights. Something here may feel familiar.');
    }else{
      cta.innerHTML = originalLabel;
      cta.removeAttribute('aria-label');
    }
  }

  let ticking = false;
  function onScroll(){
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(function(){
      sync();
      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, {passive:true});
  window.addEventListener('resize', sync, {passive:true});
  sync();
})();
