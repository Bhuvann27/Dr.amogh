(function(){
  'use strict';
  function boot(){
    const original=document.getElementById('convStage');
    if(!original) return;
    const clone=original.cloneNode(true);
    original.replaceWith(clone);
    const stage=clone;
    const viewport=stage.querySelector('#convViewport');
    const deck=stage.querySelector('#convPairs');
    const progress=stage.querySelector('#convProgressNum');
    const counter=stage.querySelector('#convCounter');
    const track=document.getElementById('conversation');
    const intro=document.querySelector('.conv-story-intro');
    if(!viewport||!deck||!track) return;
    const slides=Array.from(deck.querySelectorAll('.conv-pair'));
    const total=slides.length;
    if(!total) return;
    let active=0, locked=false, startY=0,startX=0,pointerId=null;
    function navHeight(){
      const nav=document.querySelector('.site-nav');
      const mobile=document.querySelector('.mobile-nav-row');
      let h=0;
      [nav,mobile].forEach(el=>{
        if(!el) return;
        const r=el.getBoundingClientRect();
        if(r.height && getComputedStyle(el).display!=='none') h=Math.max(h,r.height);
      });
      return Math.min(Math.max(h,0),140);
    }
    function stageHeight(){ return Math.max(520, window.innerHeight-navHeight()); }
    function cardHeight(){ return Math.min(Math.max(window.innerHeight*0.70,520),760); }
    function layout(){
      const h=stageHeight(), card=cardHeight();
      stage.style.setProperty('--deck-stage-h',h+'px');
      stage.style.setProperty('--deck-card-h',card+'px');
      const ih=intro?intro.offsetHeight:0;
      track.style.height=(ih+(total+1)*h)+'px';
      viewport.style.height=card+'px';
      viewport.style.maxHeight=card+'px';
      slides.forEach((slide,i)=>{
        slide.style.height=card+'px';
        slide.style.transform='translate3d(0,'+((i-active)*100)+'%,0)';
      });
    }
    function setActive(next,animate){
      active=Math.max(0,Math.min(total-1,next));
      deck.classList.toggle('is-animating',!!animate);
      slides.forEach((slide,i)=>{
        slide.classList.toggle('is-active',i===active);
        slide.setAttribute('aria-hidden',i===active?'false':'true');
        slide.style.transform='translate3d(0,'+((i-active)*100)+'%,0)';
      });
      if(progress) progress.textContent=(active+1)+' / '+total;
      if(counter) Array.from(counter.children).forEach((dot,i)=>{
        dot.classList.toggle('active',i===active);
        dot.setAttribute('aria-current',i===active?'step':'false');
      });
    }
    function buildDots(){
      if(!counter) return;
      counter.innerHTML='';
      counter.setAttribute('role','list');
      slides.forEach((_,i)=>{
        const dot=document.createElement('button');
        dot.type='button'; dot.className='conv-progress-dot'+(i===0?' active':'');
        dot.setAttribute('aria-label','Go to exchange '+(i+1)+' of '+total);
        dot.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();if(locked)return;jump(i);});
        counter.appendChild(dot);
      });
    }
    function jump(next){
      if(locked||next===active)return;
      locked=true;setActive(next,true);window.setTimeout(()=>locked=false,560);
    }
    function conversationBottom(){return track.getBoundingClientRect().bottom+window.scrollY-window.innerHeight+2;}
    function releaseAfter(){window.scrollTo({top:Math.max(0,conversationBottom()),behavior:'smooth'});}
    function releaseBefore(){window.scrollTo({top:Math.max(0,track.getBoundingClientRect().top+window.scrollY-8),behavior:'smooth'});}
    function direction(dir){
      if(locked)return;
      if(dir>0){if(active<total-1)jump(active+1);else{locked=true;releaseAfter();setTimeout(()=>locked=false,700);}}
      else{if(active>0)jump(active-1);else{locked=true;releaseBefore();setTimeout(()=>locked=false,700);}}
    }
    function pointerDown(e){
      if(locked||e.pointerType==='mouse')return;
      pointerId=e.pointerId;startY=e.clientY;startX=e.clientX;
      try{stage.setPointerCapture(pointerId);}catch(_e){}
    }
    function pointerUp(e){
      if(pointerId===null||e.pointerId!==pointerId)return;
      const dy=startY-e.clientY,dx=e.clientX-startX;pointerId=null;
      try{stage.releasePointerCapture(e.pointerId);}catch(_e){}
      if(Math.abs(dy)<38||Math.abs(dy)<Math.abs(dx)*1.05)return;
      e.preventDefault();direction(dy>0?1:-1);
    }
    function pointerCancel(){pointerId=null;}
    let wheelLock=false;
    function wheel(e){
      if(Math.abs(e.deltaY)<12||wheelLock)return;
      e.preventDefault();wheelLock=true;direction(e.deltaY>0?1:-1);setTimeout(()=>wheelLock=false,620);
    }
    function key(e){
      if(e.key==='ArrowDown'||e.key==='PageDown'){e.preventDefault();direction(1);}
      else if(e.key==='ArrowUp'||e.key==='PageUp'){e.preventDefault();direction(-1);}
    }
    buildDots();layout();setActive(0,false);
    stage.addEventListener('pointerdown',pointerDown,{passive:true});
    stage.addEventListener('pointerup',pointerUp,{passive:false});
    stage.addEventListener('pointercancel',pointerCancel,{passive:true});
    stage.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
    stage.addEventListener('wheel',wheel,{passive:false});
    stage.addEventListener('keydown',key);
    stage.tabIndex=0;
    stage.setAttribute('aria-label','Patient and doctor conversation. Swipe up for the next exchange.');
    window.addEventListener('resize',layout,{passive:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0));
  else setTimeout(boot,0);
})();
