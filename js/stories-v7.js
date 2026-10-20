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
    if(stage.dataset.v9Ready==="1")return;
    stage.dataset.v9Ready="1";

    const total=slides.length;
    let active=0;
    let transitioning=false;
    let touchStartY=null;
    let touchStartScroll=0;
    let snapTimer=0;
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
        bottom=Math.max(bottom,cs.position!=="static"?Math.max(0,r.bottom):r.height);
      });
      return Math.min(Math.max(bottom,0),150);
    }

    function stageHeight(){
      return Math.max(1,viewportHeight()-navOffset());
    }

    function cardHeight(){
      return clamp(viewportHeight()*0.60,460,680);
    }

    /* This is the one real trigger. Before this Y position the page is
       completely normal. The conversation only becomes a six-card reader
       after the dark stage reaches the fixed navigation. */
    function lockY(){
      const trackTop=track.getBoundingClientRect().top+window.scrollY;
      const introHeight=intro?intro.offsetHeight:0;
      return Math.max(0,trackTop+introHeight-navOffset());
    }

    function conversationProgress(){
      const start=lockY();
      const step=stageHeight();
      return (window.scrollY-start)/step;
    }

    function isInsideConversation(){
      const p=conversationProgress();
      return p>=-0.02 && p<=total+0.02;
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

      /* Intro + N full stage steps. The browser's native scroll is now the
         driver, so touch scrolling works exactly like ordinary page scroll.
         The JS only snaps the conversation to one card at a time. */
      const ih=intro?intro.offsetHeight:0;
      track.style.height=(ih+(total*sh)+2)+"px";
      applySlideTransforms(false);
      setProgress();
    }

    function setActive(next,animate){
      const target=clamp(next,0,total-1);
      if(target===active){setProgress();return;}
      active=target;
      transitioning=!!animate;
      applySlideTransforms(!!animate);
      setProgress();
      window.clearTimeout(setActive.timer);
      setActive.timer=window.setTimeout(()=>{transitioning=false;},480);
    }

    function scrollToCard(index,behavior){
      const target=lockY()+clamp(index,0,total)*stageHeight();
      window.scrollTo({top:Math.max(0,target),behavior:behavior||"smooth"});
    }

    function syncFromScroll(){
      const p=conversationProgress();
      if(p<0){
        stage.classList.remove("at-lock-point","is-engaged");
        return;
      }
      if(p<=total){
        stage.classList.add("at-lock-point");
        const index=clamp(Math.round(p),0,total-1);
        if(!transitioning||index!==active)setActive(index,false);
      }else{
        stage.classList.remove("at-lock-point","is-engaged");
      }
    }

    function scheduleSnap(directionHint){
      window.clearTimeout(snapTimer);
      snapTimer=window.setTimeout(()=>{
        const p=conversationProgress();
        if(p<-0.05||p>total+0.05)return;

        const current=clamp(active,0,total-1);
        let target=current;
        if(directionHint>0)target=current+1;
        else if(directionHint<0)target=current-1;
        else target=Math.round(p);

        if(target<0){
          window.scrollTo({top:Math.max(0,lockY()-1),behavior:"smooth"});
          return;
        }
        if(target>=total){
          window.scrollTo({top:lockY()+total*stageHeight()+2,behavior:"smooth"});
          return;
        }
        scrollToCard(target,"smooth");
      },90);
    }

    function touchStart(e){
      if(!isInsideConversation())return;
      if(e.touches&&e.touches.length){
        touchStartY=e.touches[0].clientY;
        touchStartScroll=window.scrollY;
      }
    }

    function touchEnd(e){
      if(touchStartY===null)return;
      const endY=e.changedTouches&&e.changedTouches[0]?e.changedTouches[0].clientY:touchStartY;
      const dy=endY-touchStartY;
      touchStartY=null;
      if(Math.abs(dy)<18)return;
      if(!isInsideConversation())return;

      /* Native scrolling has already happened. We do not fight it. At the
         end of the gesture we choose exactly one adjacent card based on the
         swipe direction, then snap there. */
      const direction=dy<0?1:-1;
      scheduleSnap(direction);
    }

    function wheel(e){
      if(!isInsideConversation())return;
      if(Math.abs(e.deltaY)<8)return;
      e.preventDefault();

      const now=performance.now();
      if(now-lastWheel<240)return;
      lastWheel=now;
      const direction=e.deltaY>0?1:-1;
      const target=active+direction;

      if(target<0){
        scrollToCard(-0.001,"smooth");
        return;
      }
      if(target>=total){
        window.scrollTo({top:lockY()+total*stageHeight()+2,behavior:"smooth"});
        return;
      }
      scrollToCard(target,"smooth");
    }

    function key(e){
      if(!isInsideConversation())return;
      if(e.key==="ArrowDown"||e.key==="PageDown"||e.key===" "){
        e.preventDefault();
        const target=active+1;
        if(target>=total)window.scrollTo({top:lockY()+total*stageHeight()+2,behavior:"smooth"});
        else scrollToCard(target,"smooth");
      }else if(e.key==="ArrowUp"||e.key==="PageUp"){
        e.preventDefault();
        const target=active-1;
        if(target<0)window.scrollTo({top:Math.max(0,lockY()-1),behavior:"smooth"});
        else scrollToCard(target,"smooth");
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
          if(!isInsideConversation())return;
          scrollToCard(i,"smooth");
        });
        dots.appendChild(dot);
      });
    }

    stage.addEventListener("touchstart",touchStart,{passive:true});
    stage.addEventListener("touchend",touchEnd,{passive:true});
    stage.addEventListener("wheel",wheel,{passive:false});
    stage.addEventListener("keydown",key);
    stage.tabIndex=0;
    stage.setAttribute("aria-label","Patient and doctor conversation. Scroll or swipe up for the next exchange.");

    window.addEventListener("scroll",syncFromScroll,{passive:true});
    window.addEventListener("resize",()=>{layout();syncFromScroll();},{passive:true});
    window.visualViewport?.addEventListener("resize",()=>{layout();syncFromScroll();},{passive:true});

    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      layout();
      syncFromScroll();
    }));
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",boot,{once:true});
  }else{
    boot();
  }
})();
