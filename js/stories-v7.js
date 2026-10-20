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
    if(stage.dataset.v10Ready==="1")return;
    stage.dataset.v10Ready="1";

    const total=slides.length;
    let active=0;
    let locked=false;
    let changing=false;
    let touchStartY=null;
    let touchStartX=null;
    let wheelLockUntil=0;

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
        bottom=Math.max(bottom,cs.position!=="static"?Math.max(0,r.bottom):r.height);
      });
      return Math.min(Math.max(bottom,0),150);
    }

    function stageHeight(){return Math.max(1,viewportHeight()-navOffset());}
    function cardHeight(){return clamp(viewportHeight()*0.60,460,680);}

    /* The lock begins only when the dark conversation stage reaches the
       bottom edge of the fixed navigation. Everything before this point is
       ordinary page scrolling, including a finger starting on the card. */
    function lockY(){
      const trackTop=track.getBoundingClientRect().top+window.scrollY;
      const introHeight=intro?intro.offsetHeight:0;
      return Math.max(0,trackTop+introHeight-navOffset());
    }

    function applySlides(animate){
      deck.classList.toggle("is-animating",!!animate);
      slides.forEach((slide,i)=>{
        const offset=(i-active)*100;
        slide.style.setProperty("transform","translate3d(0,"+offset+"%,0)","important");
        slide.classList.toggle("is-active",i===active);
        slide.setAttribute("aria-hidden",i===active?"false":"true");
      });
    }

    function setProgress(){
      if(progress)progress.textContent=String(active+1).padStart(2,"0")+" / "+String(total).padStart(2,"0");
      if(dots)Array.from(dots.children).forEach((dot,i)=>{
        const on=i===active;
        dot.classList.toggle("active",on);
        dot.setAttribute("aria-current",on?"step":"false");
      });
    }

    function layout(){
      const sh=stageHeight();
      const ch=cardHeight();
      const offset=navOffset();
      const halfGap=Math.max(0,(sh-ch)/2);
      stage.style.setProperty("--story-nav-offset",offset+"px");
      stage.style.setProperty("--deck-stage-h",sh+"px");
      stage.style.setProperty("--deck-card-h",ch+"px");
      stage.style.setProperty("--deck-card-half-gap",halfGap+"px");
      stage.style.height=sh+"px";
      stage.style.top=offset+"px";
      viewport.style.height=ch+"px";
      viewport.style.maxHeight=ch+"px";
      viewport.style.minHeight=ch+"px";
      slides.forEach(slide=>{
        slide.style.height=ch+"px";
        slide.style.minHeight=ch+"px";
      });

      /* One full stage-height of document space per card. The user reaches
         the lock point normally, then the stage consumes gestures itself. */
      const ih=intro?intro.offsetHeight:0;
      track.style.height=(ih+(total*sh)+2)+"px";
      applySlides(false);
      setProgress();
    }

    function release(direction){
      locked=false;
      stage.classList.remove("is-engaged","at-lock-point");
      stage.style.touchAction="auto";
      viewport.style.touchAction="auto";
      const destination=direction>0
        ? lockY()+total*stageHeight()+4
        : Math.max(0,lockY()-2);
      window.scrollTo({top:destination,behavior:"smooth"});
    }

    function go(direction){
      if(changing||!locked)return;
      const next=active+direction;
      if(next<0){release(-1);return;}
      if(next>=total){release(1);return;}

      changing=true;
      active=next;
      applySlides(true);
      setProgress();
      window.clearTimeout(go.timer);
      go.timer=window.setTimeout(()=>{changing=false;},500);
    }

    function engage(){
      if(locked)return;
      const y=lockY();
      locked=true;
      stage.classList.add("is-engaged","at-lock-point");
      stage.style.touchAction="none";
      viewport.style.touchAction="none";
      window.scrollTo(0,y);
    }

    function onScroll(){
      if(locked){
        const y=lockY();
        if(Math.abs(window.scrollY-y)>2)window.scrollTo(0,y);
        return;
      }
      /* If native scrolling has just brought the dark stage to its trigger,
         pin it exactly there. */
      const y=lockY();
      if(window.scrollY>=y-3 && window.scrollY<=y+8)engage();
    }

    function touchStart(e){
      if(!locked)return;
      if(e.touches&&e.touches.length===1){
        touchStartY=e.touches[0].clientY;
        touchStartX=e.touches[0].clientX;
        e.preventDefault();
      }
    }

    function touchMove(e){
      if(!locked||touchStartY===null)return;
      e.preventDefault();
    }

    function touchEnd(e){
      if(!locked||touchStartY===null)return;
      const point=e.changedTouches&&e.changedTouches[0];
      const endY=point?point.clientY:touchStartY;
      const endX=point?point.clientX:touchStartX;
      const dy=endY-touchStartY;
      const dx=endX-touchStartX;
      touchStartY=null;
      touchStartX=null;
      if(Math.abs(dy)<34||Math.abs(dy)<=Math.abs(dx))return;
      go(dy<0?1:-1);
    }

    function wheel(e){
      if(!locked)return;
      e.preventDefault();
      const now=performance.now();
      if(now<wheelLockUntil)return;
      if(Math.abs(e.deltaY)<5)return;
      wheelLockUntil=now+470;
      go(e.deltaY>0?1:-1);
    }

    function key(e){
      if(!locked)return;
      if(e.key==="ArrowDown"||e.key==="PageDown"||e.key===" "){
        e.preventDefault();go(1);
      }else if(e.key==="ArrowUp"||e.key==="PageUp"){
        e.preventDefault();go(-1);
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
          e.preventDefault();e.stopPropagation();
          if(!locked)return;
          const diff=i-active;
          if(!diff)return;
          active=i;
          applySlides(true);
          setProgress();
        });
        dots.appendChild(dot);
      });
    }

    stage.addEventListener("touchstart",touchStart,{passive:false});
    stage.addEventListener("touchmove",touchMove,{passive:false});
    stage.addEventListener("touchend",touchEnd,{passive:false});
    stage.addEventListener("wheel",wheel,{passive:false});
    stage.addEventListener("keydown",key);
    stage.tabIndex=0;
    stage.setAttribute("aria-label","Patient and doctor conversation. Swipe vertically through the conversation.");

    window.addEventListener("scroll",onScroll,{passive:true});
    window.addEventListener("resize",layout,{passive:true});
    window.visualViewport?.addEventListener("resize",layout,{passive:true});

    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      layout();
      onScroll();
    }));
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();
