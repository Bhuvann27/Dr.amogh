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
    let lockedY=null;
    let changing=false;
    let touchStartY=null;
    let touchStartX=null;
    let wheelLockUntil=0;
    let lastScrollY=window.scrollY;
    let releaseGuardUntil=0;
    let releaseDirection=0;

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

    /* Top boundary: entering the conversation while scrolling down. */
    function lockY(){
      const trackTop=track.getBoundingClientRect().top+window.scrollY;
      const introHeight=intro?intro.offsetHeight:0;
      return Math.max(0,trackTop+introHeight-navOffset());
    }

    /* Bottom boundary: re-entering the conversation while scrolling back up. */
    function conversationEndY(){
      const trackBottom=track.getBoundingClientRect().bottom+window.scrollY;
      return Math.max(lockY(),trackBottom-viewportHeight());
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

      const ih=intro?intro.offsetHeight:0;
      track.style.height=(ih+(total*sh)+2)+"px";
      applySlides(false);
      setProgress();
    }

    function release(direction){
      locked=false;
      lockedY=null;
      stage.classList.remove("is-engaged","at-lock-point");
      stage.style.touchAction="auto";
      viewport.style.touchAction="auto";

      /* Give the page enough distance to leave the boundary before another
         gesture is allowed to re-enter the card sequence. */
      releaseDirection=direction;
      releaseGuardUntil=performance.now()+850;

      let destination;
      if(direction<0){
        const top=lockY();
        destination=Math.max(0,top-Math.max(140,viewportHeight()*0.42));
      }else{
        const end=conversationEndY();
        const maxScroll=Math.max(0,document.documentElement.scrollHeight-viewportHeight());
        destination=Math.min(maxScroll,end+Math.max(90,viewportHeight()*0.16));
      }

      lastScrollY=window.scrollY;
      window.scrollTo({top:destination,behavior:"smooth"});
    }

    function go(direction){
      if(changing||!locked)return;
      const next=active+direction;

      /* First card: upward movement gives the page back to the browser.
         Last card: downward movement gives the page back to the browser. */
      if(next<0){release(-1);return;}
      if(next>=total){release(1);return;}

      changing=true;
      active=next;
      applySlides(true);
      setProgress();
      window.clearTimeout(go.timer);
      go.timer=window.setTimeout(()=>{changing=false;},500);
    }

    function engage(boundaryY){
      if(locked)return;
      const y=typeof boundaryY==="number"?boundaryY:lockY();
      locked=true;
      lockedY=y;
      releaseDirection=0;
      releaseGuardUntil=0;
      stage.classList.add("is-engaged","at-lock-point");
      stage.style.touchAction="none";
      viewport.style.touchAction="none";
      window.scrollTo({top:y,behavior:"auto"});
      lastScrollY=y;
    }

    function onScroll(){
      const current=window.scrollY;
      const topY=lockY();
      const bottomY=conversationEndY();

      if(locked){
        /* Keep the exact boundary at which this engagement began. This is
           essential when re-entering from below: Card 6 must lock at the
           bottom boundary, not jump back to the top boundary. */
        const y=lockedY==null?topY:lockedY;
        if(Math.abs(current-y)>2)window.scrollTo({top:y,behavior:"auto"});
        lastScrollY=y;
        return;
      }

      const now=performance.now();
      const delta=current-lastScrollY;

      if(now<releaseGuardUntil){
        lastScrollY=current;
        return;
      }

      /* A release must travel clearly away from its boundary before a new
         engagement is permitted. */
      if(releaseDirection<0 && current<topY-24)releaseDirection=0;
      if(releaseDirection>0 && current>bottomY+24)releaseDirection=0;

      /* There are deliberately TWO entry points:
         - topY when approaching from above while scrolling down
         - bottomY when approaching from below while scrolling up
         This keeps the active card intact in both directions. */
      const crossedDownTop=lastScrollY<topY-2 && current>=topY-2 && delta>0;
      const crossedUpBottom=lastScrollY>bottomY+2 && current<=bottomY+2 && delta<0;

      if(releaseDirection===0){
        if(crossedDownTop)engage(topY);
        else if(crossedUpBottom)engage(bottomY);
      }

      lastScrollY=current;
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
      lastScrollY=window.scrollY;
      onScroll();
    }));
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();
