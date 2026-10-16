(function(){
  "use strict";

  async function loadStories(){
    const local=window.PATIENT_STORIES||[];
    if(!window.PatientInsightsDB)return local;
    try{
      const remote=await Promise.race([
        window.PatientInsightsDB.fetchPublished(),
        new Promise(resolve=>setTimeout(()=>resolve([]),2500))
      ]);
      if(!remote.length)return local;
      const bySlug=new Map(local.map(s=>[s.slug,s]));
      remote.forEach(s=>bySlug.set(s.slug,s));
      return Array.from(bySlug.values());
    }catch(e){return local;}
  }

  function esc(value){return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));}
  function inferCategory(story){
    const raw=String(story.category||story.topic||story.subtitle||story.title||"").toLowerCase();
    if(/pregnan|antenatal|postpartum|women/.test(raw))return "Women's health";
    if(/headache|dizziness|migraine|sleep|stress|fatigue|tired/.test(raw))return "Everyday symptoms";
    if(/diabet|sugar|blood pressure|hypertension|cholesterol|metabolic/.test(raw))return "Long-term health";
    if(/infection|fever|cough|cold|viral|respirat/.test(raw))return "Infections";
    if(/digest|gastric|stomach|meal|acid|bowel/.test(raw))return "Digestive health";
    return "General medicine";
  }
  function categoryFor(story){return String(story.category||inferCategory(story)).trim()||"General medicine";}
  loadStories().then(init);

  function init(stories){
    if(!stories.length)return;
    const params=new URLSearchParams(window.location.search);
    const requested=params.get("story");
    const story=stories.find(s=>s.slug===requested)||stories[0];
    const storyIndex=Math.max(0,stories.indexOf(story));
    const year=document.getElementById("year"); if(year)year.textContent=new Date().getFullYear();
    document.title=String(story.title||"Patient Story").replace(/[“”]/g,"")+" — Dr. Amogh G";
    const eyebrow=document.getElementById("selectedStoryLabel"),title=document.getElementById("storyTitle"),intro=document.getElementById("storyIntro");
    if(eyebrow)eyebrow.textContent="PATIENT STORY "+String(storyIndex+1).padStart(2,"0");
    if(title)title.textContent=story.title||"Patient story";
    if(intro)intro.textContent=story.intro||"A patient conversation from this practice.";
    buildLibrary(stories,story); buildConversation(story);
    const relateIntro=document.getElementById("relateIntro"),relateClose=document.getElementById("relateClose");
    if(relateIntro)relateIntro.textContent=story.relateIntro||"Sometimes small changes are easy to ignore. You may have noticed that:";
    if(relateClose)relateClose.textContent=story.relateClose||"When something keeps happening or starts affecting everyday life, it is worth paying attention to.";
    const relateList=document.getElementById("relateList");
    if(relateList){relateList.innerHTML="";(story.relatePoints||[]).forEach(point=>{const li=document.createElement("li");li.innerHTML='<span class="dot"></span><span>'+esc(point)+'</span>';relateList.appendChild(li);});}
    const actionList=document.getElementById("actionList");
    if(actionList){actionList.innerHTML="";(story.actionPoints||[]).forEach(point=>{const li=document.createElement("li");li.textContent=point;actionList.appendChild(li);});}
    const urgent=document.getElementById("urgentText"); if(urgent)urgent.textContent=story.urgent||"If symptoms are sudden, severe, or getting worse, seek medical attention promptly.";
    buildOtherStories(stories,story); setupReveals();
  }

  function buildLibrary(stories,selected){
    const wrap=document.getElementById("storyPills"); if(!wrap)return; wrap.innerHTML="";
    stories.forEach((s,i)=>{const a=document.createElement("a");a.href="stories.html?story="+encodeURIComponent(s.slug);a.className="story-choice"+(s.slug===selected.slug?" is-selected":"");if(s.slug===selected.slug)a.setAttribute("aria-current","true");a.innerHTML='<span class="story-choice-number">'+String(i+1).padStart(2,"0")+'</span><span class="story-choice-copy"><span class="story-choice-label">'+esc(categoryFor(s))+'</span><strong>'+esc(String(s.title||"").replace(/[“”]/g,""))+'</strong></span><span class="story-choice-arrow" aria-hidden="true">↗</span>';wrap.appendChild(a);});
  }

  function buildConversation(story){
    const track=document.getElementById("conversation"),stage=document.getElementById("convStage"),wrap=document.getElementById("convPairs"),counter=document.getElementById("convCounter"),progress=document.getElementById("convProgressNum"),viewport=document.getElementById("convViewport"),intro=document.querySelector(".conv-story-intro");
    if(!track||!stage||!wrap)return;
    const pairs=Array.isArray(story.dialogue)?story.dialogue:[];
    wrap.innerHTML=""; if(counter)counter.innerHTML="";
    const slides=(pairs.length?pairs:[{q:"",a:"This story is being prepared."}]).map((pair,i)=>{
      const el=document.createElement("article");
      el.className="conv-pair"+(i===0?" is-active":"");
      el.innerHTML='<div class="conv-card-glow" aria-hidden="true"></div><div class="conv-card-inner"><span class="conv-speaker"><span>PATIENT</span><b>↔</b><span>DOCTOR</span></span><span class="conv-card-index">'+String(i+1).padStart(2,"0")+'</span><p class="q">'+esc(pair.q||"")+'</p><p class="a">'+esc(pair.a||"")+'</p></div>';
      wrap.appendChild(el); return el;
    });
    const total=slides.length;
    let active=0,locked=false,touchStartY=0,touchStartX=0,touching=false;

    if(counter){
      counter.setAttribute("aria-label","Conversation progress");counter.setAttribute("role","list");
      slides.forEach((_,i)=>{const dot=document.createElement("button");dot.type="button";dot.className="conv-progress-dot"+(i===0?" active":"");dot.setAttribute("role","listitem");dot.setAttribute("aria-label","Go to exchange "+(i+1)+" of "+total);dot.addEventListener("click",()=>goTo(i,true));counter.appendChild(dot);});
    }

    function navOffset(){
      const nav=document.querySelector(".site-nav"),mobile=document.querySelector(".mobile-nav-row");
      let h=nav?nav.getBoundingClientRect().height:0;
      if(mobile){const r=mobile.getBoundingClientRect();if(getComputedStyle(mobile).position!=="static")h=Math.max(h,r.bottom);}
      return Math.min(Math.max(h,0),140);
    }
    function stageHeight(){return Math.max(520,window.innerHeight-navOffset());}
    function setTrackHeight(){
      const h=stageHeight(),ih=intro?intro.offsetHeight:0;
      track.style.height=(ih+(total+1)*h)+"px";
      track.style.setProperty("--conversation-height",(ih+(total+1)*h)+"px");
    }
    function updateUI(next,animate){
      active=Math.max(0,Math.min(total-1,next));
      wrap.style.transform="translate3d(0,"+(-active*100)+"%,0)";
      wrap.style.transition=animate?"transform .42s cubic-bezier(.22,.8,.24,1)":"none";
      slides.forEach((el,i)=>{el.classList.toggle("is-active",i===active);el.setAttribute("aria-hidden",i===active?"false":"true");});
      if(progress)progress.textContent=String(active+1)+" / "+String(total);
      if(counter)Array.from(counter.children).forEach((dot,i)=>{dot.classList.toggle("active",i===active);dot.setAttribute("aria-current",i===active?"step":"false");});
    }
    function centerConversation(){
      const offset=navOffset();
      const target=stage.getBoundingClientRect().top+window.scrollY-offset;
      window.scrollTo({top:Math.max(0,target),behavior:"smooth"});
    }
    function goTo(next,fromDot){
      if(locked)return;
      const target=Math.max(0,Math.min(total-1,next));
      if(target===active)return;
      locked=true; updateUI(target,true);
      if(fromDot)centerConversation();
      window.setTimeout(()=>{locked=false;},480);
    }
    function releasePage(direction){
      const amount=Math.max(360,Math.round(stageHeight()*0.72));
      window.scrollBy({top:direction*amount,behavior:"smooth"});
    }
    function handleTouchStart(e){
      if(locked)return;
      const t=e.touches[0];touchStartY=t.clientY;touchStartX=t.clientX;touching=true;
    }
    function handleTouchEnd(e){
      if(!touching||locked)return;
      const t=e.changedTouches[0],dy=touchStartY-t.clientY,dx=t.clientX-touchStartX;touching=false;
      if(Math.abs(dy)<45||Math.abs(dy)<Math.abs(dx)*1.15)return;
      if(dy>0){
        if(active<total-1){e.preventDefault();goTo(active+1,false);}
        else{e.preventDefault();releasePage(1);}
      }else{
        if(active>0){e.preventDefault();goTo(active-1,false);}
        else{e.preventDefault();releasePage(-1);}
      }
    }
    function handlePointerDown(e){
      if(e.pointerType==="mouse")return;
      touchStartY=e.clientY;touchStartX=e.clientX;touching=true;
    }
    function handlePointerUp(e){
      if(e.pointerType==="mouse"||!touching)return;
      handleTouchEnd({changedTouches:[{clientY:e.clientY,clientX:e.clientX}],preventDefault:()=>e.preventDefault()});
    }
    function key(e){if(e.key==="ArrowDown"||e.key==="PageDown"||e.key===" "){e.preventDefault();active<total-1?goTo(active+1,false):releasePage(1);}else if(e.key==="ArrowUp"||e.key==="PageUp"){e.preventDefault();active>0?goTo(active-1,false):releasePage(-1);}}

    setTrackHeight();updateUI(0,false);
    window.addEventListener("resize",setTrackHeight,{passive:true});
    stage.addEventListener("touchstart",handleTouchStart,{passive:true});
    stage.addEventListener("touchend",handleTouchEnd,{passive:false});
    stage.addEventListener("pointerdown",handlePointerDown,{passive:true});
    stage.addEventListener("pointerup",handlePointerUp,{passive:false});
    stage.addEventListener("keydown",key);
    stage.tabIndex=0;
    stage.setAttribute("aria-label","Patient and doctor conversation. Swipe up for the next exchange.");
  }

  function buildOtherStories(stories,selected){
    const wrap=document.getElementById("otherStories");if(!wrap)return;wrap.innerHTML="";
    const others=stories.filter(s=>s.slug!==selected.slug).slice(0,6);if(!others.length){wrap.parentElement.parentElement.style.display="none";return;}
    others.forEach(s=>{const i=stories.indexOf(s),a=document.createElement("a");a.href="stories.html?story="+encodeURIComponent(s.slug);a.className="other-story-card";a.innerHTML='<span class="other-story-number">PATIENT STORY '+String(i+1).padStart(2,"0")+'</span><p class="quote">'+esc(s.title||"")+'</p><p class="meta">'+esc(s.subtitle||categoryFor(s))+'</p><span class="other-story-read">READ THIS STORY ↗</span>';wrap.appendChild(a);});
  }
  function setupReveals(){
    const revealEls=document.querySelectorAll(".reveal");
    if("IntersectionObserver" in window){const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("is-visible");io.unobserve(entry.target);}}),{threshold:.15});revealEls.forEach(el=>io.observe(el));}
    else revealEls.forEach(el=>el.classList.add("is-visible"));
  }
})();
