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
    if(stage.dataset.v8Ready==="1")return;
    stage.dataset.v8Ready="1";

    const total=slides.length;
    let active=0;
    let transitioning=false;
    let pointerId=null;
    let startX=0;
    let startY=0;
    let lastWheel=0;

    const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
    const viewportHeight=()=>window.visualViewport?.height||window.innerHeight;

    function navOffset(){
      const nav=document.querySelector(".site-nav");
      const mobile=document.querySelector(".mobile-nav-row");
      let bottom=0;
      [nav,mobile].forEach(el=>{
        if(!el)return;
        const cs=getComputedStyle(el);
        if(cs.display==="none"||cs.visibility==="hidden")return;
        const r=el.getBoundingClientRect();
        bottom=Math.max(bottom,cs.position!=="static"?r.bottom:r.height);
      });
      return Math.min(Math.max(bottom,0),150);
    }

    function stageHeight(){
      return Math.max(1,viewportHeight()-navOffset());
    }

    function cardHeight(){
      return clamp(viewportHeight()*0.60,460,680);
    }

    /* The browser owns normal page scrolling until the dark stage reaches
       the bottom edge of the fixed header. At that exact point the sticky
       stage occupies the viewport and the six-card interaction takes over. */
    function atConversationLockPoint(){
      const r=stage.getBoundingClientRect();
      const offset=navOffset();
      const h=stageHeight();
      return r.top<=offset+2 && r.bottom>=offset+h-2;
    }

    function setEngaged(on){
      stage.classList.toggle("is-engaged",!!on);
      stage.setAttribute("aria-busy",on?"true":"false");
    }

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

      /* Intro scrolls normally. Once the stage reaches the header it stays
         pinned for exactly N viewport-heights, one complete height per card.
         That is the actual lock, not a timer or a guessed scroll distance. */
      const ih=intro?intro.offsetHeight:0;
      track.style.height=(ih+(total*sh)+2)+"px";
      applySlideTransforms(false);
      setProgress();
    }

    function moveByCard(direction){
      if(transitioning||!atConversationLockPoint())return false;
      const target=clamp(active+direction,0,total-1);
      if(target===active)return false;
      active=target;
      transitioning=true;
      applySlideTransforms(true);
      setProgress();
      window.setTimeout(()=>{transitioning=false;},500);
      return true;
    }

    function release(direction){
      if(transitioning)return;
      setEngaged(false);
      stage.classList.remove("at-lock-point");

      /* Move exactly one stage-height so the sticky frame can finish and the
         following section becomes the natural next viewport. */
      const amount=stageHeight()+Math.max(24,Math.round(navOffset()*0.15));
      window.scrollBy({top:direction>0?amount:-amount,behavior:"smooth"});
    }

    function handleDirection(direction){
      if(!atConversationLockPoint())return false;
      setEngaged(true);
      if(direction>0){
        if(active<total-1)return moveByCard(1);
        release(1);
        return true;
      }
      if(active>0)return moveByCard(-1);
      release(-1);
      return true;
    }

    function pointerDown(e){
      if(!atConversationLockPoint()||e.pointerType==="mouse")return;
      if(transitioning)return;
      setEngaged(true);
      pointerId=e.pointerId;
      startX=e.clientX;
      startY=e.clientY;
      try{stage.setPointerCapture(pointerId);}catch(_e){}
    }

    function pointerMove(e){
      if(pointerId===null||e.pointerId!==pointerId)return;
      const dx=e.clientX-startX;
      const dy=e.clientY-startY;
      if(Math.abs(dy)>8&&Math.abs(dy)>Math.abs(dx)*1.08)e.preventDefault();
    }

    function pointerUp(e){
      if(pointerId===null||e.pointerId!==pointerId)return;
      const dx=e.clientX-startX;
      const dy=e.clientY-startY;
      pointerId=null;
      try{stage.releasePointerCapture(e.pointerId);}catch(_e){}
      if(Math.abs(dy)<42||Math.abs(dy)<Math.abs(dx)*1.12)return;
      e.preventDefault();
      handleDirection(dy<0?1:-1);
    }

    function pointerCancel(){pointerId=null;}

    function wheel(e){
      if(!atConversationLockPoint())return;
      if(Math.abs(e.deltaY)<12)return;

      /* At the last card, do not cancel the browser's final upward scroll.
         The document is deliberately long enough for the sticky stage to
         release naturally into the next section. */
      if(e.deltaY>0&&active===total-1){
        setEngaged(false);
        stage.classList.remove("at-lock-point");
        return;
      }
      if(e.deltaY<0&&active===0){
        setEngaged(false);
        stage.classList.remove("at-lock-point");
        return;
      }

      const now=performance.now();
      if(now-lastWheel<140){e.preventDefault();return;}
      lastWheel=now;
      e.preventDefault();
      handleDirection(e.deltaY>0?1:-1);
    }

    function key(e){
      if(!atConversationLockPoint())return;
      if(e.key==="ArrowDown"||e.key==="PageDown"||e.key===" "){
        if(active===total-1)return;
        e.preventDefault();
        handleDirection(1);
      }else if(e.key==="ArrowUp"||e.key==="PageUp"){
        if(active===0)return;
        e.preventDefault();
        handleDirection(-1);
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
          if(!atConversationLockPoint()||transitioning)return;
          setEngaged(true);
          active=i;
          transitioning=true;
          applySlideTransforms(true);
          setProgress();
          window.setTimeout(()=>{transitioning=false;},500);
        });
        dots.appendChild(dot);
      });
    }

    stage.addEventListener("pointerdown",pointerDown,{passive:true});
    stage.addEventListener("pointermove",pointerMove,{passive:false});
    stage.addEventListener("pointerup",pointerUp,{passive:false});
    stage.addEventListener("pointercancel",pointerCancel,{passive:true});
    stage.addEventListener("wheel",wheel,{passive:false});
    stage.addEventListener("keydown",key);
    stage.tabIndex=0;
    stage.setAttribute("aria-label","Patient and doctor conversation. Scroll or swipe up for the next exchange.");

    function syncLockState(){
      const locked=atConversationLockPoint();
      stage.classList.toggle("at-lock-point",locked);
      if(!locked)setEngaged(false);
    }

    window.addEventListener("resize",layout,{passive:true});
    window.visualViewport?.addEventListener("resize",layout,{passive:true});
    window.addEventListener("scroll",syncLockState,{passive:true});

    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      setEngaged(false);
      stage.classList.remove("at-lock-point");
      layout();
      syncLockState();
    }));
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",boot,{once:true});
  }else{
    boot();
  }
})();