(function(){
  "use strict";

  function boot(){
    const stage=document.getElementById("convStage");
    const track=document.getElementById("conversation");
    const viewport=document.getElementById("convViewport");
    const deck=document.getElementById("convPairs");
    const progress=document.getElementById("convProgressNum");
    const dots=document.getElementById("convCounter");
    const intro=document.querySelector(".conv-story-intro");
    if(!stage||!track||!viewport||!deck){setTimeout(boot,80);return;}
    const slides=Array.from(deck.querySelectorAll(".conv-pair"));
    if(!slides.length){setTimeout(boot,80);return;}
    if(stage.dataset.v7Ready==="1")return;
    stage.dataset.v7Ready="1";

    const total=slides.length;
    let active=0;
    let locked=false;
    let pointerId=null;
    let startX=0;
    let startY=0;

    const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

    function navOffset(){
      const nav=document.querySelector(".site-nav");
      const mobile=document.querySelector(".mobile-nav-row");
      let bottom=0;
      [nav,mobile].forEach(el=>{
        if(!el)return;
        const cs=getComputedStyle(el);
        if(cs.display==="none"||cs.visibility==="hidden")return;
        const r=el.getBoundingClientRect();
        if(cs.position!=="static")bottom=Math.max(bottom,r.bottom);
        else bottom=Math.max(bottom,r.height);
      });
      return Math.min(Math.max(bottom,0),140);
    }

    function stageHeight(){return Math.max(560,window.innerHeight-navOffset());}
    function cardHeight(){return clamp(window.innerHeight*0.56,460,680);}

    function applySlideTransforms(animate){
      deck.classList.toggle("is-animating",!!animate);
      slides.forEach((slide,i)=>{
        slide.style.setProperty("transform","translate3d(0,"+((i-active)*100)+"%,0)","important");
        slide.classList.toggle("is-active",i===active);
        slide.setAttribute("aria-hidden",i===active?"false":"true");
      });
    }

    function setProgress(){
      if(progress)progress.textContent=String(active+1).padStart(2,"0")+" / "+String(total).padStart(2,"0");
      if(dots){
        Array.from(dots.children).forEach((dot,i)=>{
          const on=i===active;
          dot.classList.toggle("active",on);
          dot.setAttribute("aria-current",on?"step":"false");
        });
      }
    }

    function layout(){
      const sh=stageHeight();
      const ch=cardHeight();
      const offset=navOffset();
      stage.style.setProperty("--story-nav-offset",offset+"px");
      stage.style.setProperty("--deck-stage-h",sh+"px");
      stage.style.setProperty("--deck-card-h",ch+"px");
      stage.style.height=sh+"px";
      stage.style.top=offset+"px";
      viewport.style.height=ch+"px";
      viewport.style.maxHeight=ch+"px";
      viewport.style.minHeight=ch+"px";
      slides.forEach(slide=>{
        slide.style.height=ch+"px";
        slide.style.minHeight=ch+"px";
      });
      const ih=intro?intro.offsetHeight:0;
      track.style.height=(ih+sh+2)+"px";
      applySlideTransforms(false);
      setProgress();
    }

    function conversationStart(){
      return stage.getBoundingClientRect().top+window.scrollY-navOffset();
    }

    function lock(ms){
      locked=true;
      window.setTimeout(()=>{locked=false;},ms);
    }

    function goTo(next){
      if(locked)return;
      const target=clamp(next,0,total-1);
      if(target===active)return;
      active=target;
      applySlideTransforms(true);
      setProgress();
      lock(560);
    }

    function releaseAfter(){
      const target=track.getBoundingClientRect().bottom+window.scrollY+4;
      window.scrollTo({top:target,behavior:"smooth"});
      lock(700);
    }

    function releaseBefore(){
      const target=Math.max(0,conversationStart()-18);
      window.scrollTo({top:target,behavior:"smooth"});
      lock(700);
    }

    function move(direction){
      if(locked)return;
      if(direction>0){
        if(active<total-1)goTo(active+1);
        else releaseAfter();
      }else{
        if(active>0)goTo(active-1);
        else releaseBefore();
      }
    }

    function pointerDown(e){
      if(locked||e.pointerType==="mouse")return;
      pointerId=e.pointerId;
      startX=e.clientX;
      startY=e.clientY;
      try{stage.setPointerCapture(pointerId);}catch(_e){}
    }

    function pointerUp(e){
      if(pointerId===null||e.pointerId!==pointerId)return;
      const dx=e.clientX-startX;
      const dy=e.clientY-startY;
      pointerId=null;
      try{stage.releasePointerCapture(e.pointerId);}catch(_e){}
      if(Math.abs(dy)<42||Math.abs(dy)<Math.abs(dx)*1.12)return;
      e.preventDefault();
      move(dy<0?1:-1);
    }

    function pointerCancel(){pointerId=null;}

    function wheel(e){
      if(locked||Math.abs(e.deltaY)<12)return;
      e.preventDefault();
      move(e.deltaY>0?1:-1);
    }

    function key(e){
      if(e.key==="ArrowDown"||e.key==="PageDown"||e.key===" "){
        e.preventDefault();
        move(1);
      }else if(e.key==="ArrowUp"||e.key==="PageUp"){
        e.preventDefault();
        move(-1);
      }
    }

    if(dots){
      dots.innerHTML="";
      dots.setAttribute("role","list");
      dots.setAttribute("aria-label","Conversation progress");
      slides.forEach((_,i)=>{
        const dot=document.createElement("button");
        dot.type="button";
        dot.className="conv-progress-dot"+(i===0?" active":"");
        dot.setAttribute("role","listitem");
        dot.setAttribute("aria-label","Go to exchange "+(i+1)+" of "+total);
        dot.addEventListener("click",e=>{
          e.preventDefault();
          e.stopPropagation();
          if(!locked){
            active=i;
            applySlideTransforms(true);
            setProgress();
            lock(560);
          }
        });
        dots.appendChild(dot);
      });
    }

    stage.addEventListener("pointerdown",pointerDown,{passive:true});
    stage.addEventListener("pointerup",pointerUp,{passive:false});
    stage.addEventListener("pointercancel",pointerCancel,{passive:true});
    stage.addEventListener("wheel",wheel,{passive:false});
    stage.addEventListener("keydown",key);
    stage.tabIndex=0;
    stage.setAttribute("aria-label","Patient and doctor conversation. Swipe up for the next exchange.");

    window.addEventListener("resize",layout,{passive:true});
    requestAnimationFrame(()=>requestAnimationFrame(layout));
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",boot,{once:true});
  }else{
    boot();
  }
})();