(function(){
  'use strict';

  function boot(){
    const original=document.getElementById('convStage');
    if(!original) return;

    const pairs=original.querySelector('#convPairs');
    if(!pairs || !pairs.querySelector('.conv-pair')){
      setTimeout(boot,80);
      return;
    }

    const stage=original.cloneNode(true);
    original.replaceWith(stage);

    const viewport=stage.querySelector('#convViewport');
    const deck=stage.querySelector('#convPairs');
    const progress=stage.querySelector('#convProgressNum');
    const dots=stage.querySelector('#convCounter');
    const track=document.getElementById('conversation');
    const intro=document.querySelector('.conv-story-intro');
    const slides=Array.from(deck.querySelectorAll('.conv-pair'));
    const total=slides.length;
    if(!viewport||!deck||!track||!total) return;

    let active=0;
    let locked=false;
    let pointerId=null;
    let startX=0,startY=0;

    function navOffset(){
      const nav=document.querySelector('.site-nav');
      const mobile=document.querySelector('.mobile-nav-row');
      let h=0;
      [nav,mobile].forEach(el=>{
        if(!el) return;
        const cs=getComputedStyle(el);
        if(cs.display==='none') return;
        const r=el.getBoundingClientRect();
        if(r.height) h=Math.max(h,r.height);
      });
      return Math.min(Math.max(h,0),140);
    }

    function stageHeight(){
      return Math.max(560, window.innerHeight-navOffset());
    }

    function cardHeight(){
      return Math.min(Math.max(window.innerHeight*0.62,500),760);
    }

    function layout(){
      const sh=stageHeight();
      const ch=cardHeight();
      stage.style.setProperty('--deck-stage-h',sh+'px');
      stage.style.setProperty('--deck-card-h',ch+'px');
      viewport.style.height=ch+'px';
      viewport.style.maxHeight=ch+'px';

      slides.forEach((slide,i)=>{
        slide.style.height=ch+'px';
        slide.style.transform='translate3d(0,'+((i-active)*100)+'%,0)';
      });

      const introHeight=intro ? intro.offsetHeight : 0;
      track.style.height=(introHeight+(total+1)*sh)+'px';
    }

    function update(next,animate){
      active=Math.max(0,Math.min(total-1,next));
      deck.classList.toggle('is-animating',!!animate);

      slides.forEach((slide,i)=>{
        slide.classList.toggle('is-active',i===active);
        slide.setAttribute('aria-hidden',i===active?'false':'true');
        slide.style.transform='translate3d(0,'+((i-active)*100)+'%,0)';
      });

      if(progress) progress.textContent=String(active+1).padStart(2,'0')+' / '+String(total).padStart(2,'0');

      if(dots){
        Array.from(dots.children).forEach((dot,i)=>{
          dot.classList.toggle('active',i===active);
          dot.setAttribute('aria-current',i===active?'step':'false');
        });
      }
    }

    function go(next){
      if(locked || next===active) return;
      locked=true;
      update(next,true);
      window.setTimeout(()=>{locked=false;},520);
    }

    function releaseAfter(){
      const target=track.getBoundingClientRect().bottom+window.scrollY+4;
      window.scrollTo({top:target,behavior:'smooth'});
    }

    function releaseBefore(){
      const target=Math.max(0,track.getBoundingClientRect().top+window.scrollY-16);
      window.scrollTo({top:target,behavior:'smooth'});
    }

    function move(direction){
      if(locked) return;
      if(direction>0){
        if(active<total-1) go(active+1);
        else {
          locked=true;
          releaseAfter();
          window.setTimeout(()=>{locked=false;},650);
        }
      }else{
        if(active>0) go(active-1);
        else {
          locked=true;
          releaseBefore();
          window.setTimeout(()=>{locked=false;},650);
        }
      }
    }

    function down(e){
      if(locked || (e.pointerType && e.pointerType==='mouse')) return;
      pointerId=e.pointerId;
      startX=e.clientX;
      startY=e.clientY;
      try{stage.setPointerCapture(pointerId);}catch(_e){}
    }

    function up(e){
      if(pointerId===null || e.pointerId!==pointerId) return;
      const dx=e.clientX-startX;
      const dy=e.clientY-startY;
      pointerId=null;
      try{stage.releasePointerCapture(e.pointerId);}catch(_e){}
      if(Math.abs(dy)<42 || Math.abs(dy)<Math.abs(dx)*1.15) return;
      e.preventDefault();
      move(dy<0 ? 1 : -1);
    }

    function cancel(){ pointerId=null; }

    function wheel(e){
      if(locked || Math.abs(e.deltaY)<18) return;
      e.preventDefault();
      move(e.deltaY>0 ? 1 : -1);
    }

    function key(e){
      if(e.key==='ArrowDown' || e.key==='PageDown' || e.key===' '){
        e.preventDefault(); move(1);
      }else if(e.key==='ArrowUp' || e.key==='PageUp'){
        e.preventDefault(); move(-1);
      }
    }

    if(dots){
      dots.innerHTML='';
      dots.setAttribute('role','list');
      dots.setAttribute('aria-label','Conversation progress');
      slides.forEach((_,i)=>{
        const dot=document.createElement('button');
        dot.type='button';
        dot.className='conv-progress-dot'+(i===0?' active':'');
        dot.setAttribute('aria-label','Go to exchange '+(i+1)+' of '+total);
        dot.addEventListener('click',e=>{
          e.preventDefault();
          e.stopPropagation();
          if(!locked) go(i);
        });
        dots.appendChild(dot);
      });
    }

    layout();
    update(0,false);

    stage.addEventListener('pointerdown',down,{passive:true});
    stage.addEventListener('pointerup',up,{passive:false});
    stage.addEventListener('pointercancel',cancel,{passive:true});
    stage.addEventListener('wheel',wheel,{passive:false});
    stage.addEventListener('keydown',key);
    stage.tabIndex=0;
    stage.setAttribute('aria-label','Patient and doctor conversation. Swipe up for the next exchange.');

    window.addEventListener('resize',()=>{
      layout();
      update(active,false);
    },{passive:true});
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  }else{
    boot();
  }
})();