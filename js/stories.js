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
    const year=document.getElementById("year");if(year)year.textContent=new Date().getFullYear();
    document.title=String(story.title||"Patient Story").replace(/[“”]/g,"")+" — Dr. Amogh G";
    const eyebrow=document.getElementById("selectedStoryLabel"),title=document.getElementById("storyTitle"),intro=document.getElementById("storyIntro");
    if(eyebrow)eyebrow.textContent="PATIENT STORY "+String(storyIndex+1).padStart(2,"0");
    if(title)title.textContent=story.title||"Patient story";
    if(intro)intro.textContent=story.intro||"A patient conversation from this practice.";
    buildLibrary(stories,story);buildConversation(story);
    const relateIntro=document.getElementById("relateIntro"),relateClose=document.getElementById("relateClose");
    if(relateIntro)relateIntro.textContent=story.relateIntro||"Sometimes small changes are easy to ignore. You may have noticed that:";
    if(relateClose)relateClose.textContent=story.relateClose||"When something keeps happening or starts affecting everyday life, it is worth paying attention to.";
    const relateList=document.getElementById("relateList");
    if(relateList){relateList.innerHTML="";(story.relatePoints||[]).forEach(point=>{const li=document.createElement("li");li.innerHTML='<span class="dot"></span><span>'+esc(point)+'</span>';relateList.appendChild(li);});}
    const actionList=document.getElementById("actionList");
    if(actionList){actionList.innerHTML="";(story.actionPoints||[]).forEach(point=>{const li=document.createElement("li");li.textContent=point;actionList.appendChild(li);});}
    const urgent=document.getElementById("urgentText");if(urgent)urgent.textContent=story.urgent||"If symptoms are sudden, severe, or getting worse, seek medical attention promptly.";
    buildOtherStories(stories,story);setupReveals();
  }

  function buildLibrary(stories,selected){
    const wrap=document.getElementById("storyPills");if(!wrap)return;wrap.innerHTML="";
    stories.forEach((s,i)=>{
      const a=document.createElement("a");
      a.href="stories.html?story="+encodeURIComponent(s.slug);
      a.className="story-choice"+(s.slug===selected.slug?" is-selected":"");
      if(s.slug===selected.slug)a.setAttribute("aria-current","true");
      a.innerHTML='<span class="story-choice-number">'+String(i+1).padStart(2,"0")+'</span><span class="story-choice-copy"><span class="story-choice-label">'+esc(categoryFor(s))+'</span><strong>'+esc(String(s.title||"").replace(/[“”]/g,""))+'</strong></span><span class="story-choice-arrow" aria-hidden="true">↗</span>';
      wrap.appendChild(a);
    });
  }

  function buildConversation(story){
    const track=document.getElementById("conversation"),stage=document.getElementById("convStage"),wrap=document.getElementById("convPairs"),counter=document.getElementById("convCounter"),progress=document.getElementById("convProgressNum"),viewport=document.getElementById("convViewport"),intro=document.querySelector(".conv-story-intro");
    if(!track||!stage||!wrap||!viewport)return;
    const pairs=Array.isArray(story.dialogue)?story.dialogue:[];
    wrap.innerHTML="";if(counter)counter.innerHTML="";
    const slides=(pairs.length?pairs:[{q:"",a:"This story is being prepared."}]).map((pair,i)=>{
      const el=document.createElement("article");
      el.className="conv-pair"+(i===0?" is-active":"");
      el.innerHTML='<div class="conv-card-glow" aria-hidden="true"></div><div class="conv-card-inner"><span class="conv-speaker"><span>PATIENT</span><b>↔</b><span>DOCTOR</span></span><span class="conv-card-index">'+String(i+1).padStart(2,"0")+'</span><p class="q">'+esc(pair.q||"")+'</p><p class="a">'+esc(pair.a||"")+'</p></div>';
      wrap.appendChild(el);return el;
    });
    const total=slides.length;
    let active=0,locked=false,startY=0,startX=0,pointerId=null,wheelTimer=0;

    if(counter){
      counter.setAttribute("aria-label","Conversation progress");counter.setAttribute("role","list");
      slides.forEach((_,i)=>{
        const dot=document.createElement("button");dot.type="button";dot.className="conv-progress-dot"+(i===0?" active":"");dot.setAttribute("role","listitem");dot.setAttribute("aria-label","Go to exchange "+(i+1)+" of "+total);
        dot.addEventListener("click",()=>goTo(i,true));counter.appendChild(dot);
      });
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
    }
    function updateUI(next,animate){
      active=Math.max(0,Math.min(total-1,next));
      const distance=Math.max(1,viewport.clientHeight);
      wrap.style.setProperty("transition",animate?"transform .42s cubic-bezier(.22,.8,.24,1)":"none","important");
      wrap.style.setProperty("transform","translate3d(0,"+(-active*distance)+"px,0)","important");
      slides.forEach((el,i)=>{el.classList.toggle("is-active",i===active);el.setAttribute("aria-hidden",i===active?"false":"true");});
      if(progress)progress.textContent=String(active+1).padStart(2,"0")+" / "+String(total).padStart(2,"0");
      if(counter)Array.from(counter.children).forEach((dot,i)=>{dot.classList.toggle("active",i===active);dot.setAttribute("aria-current",i===active?"step":"false");});
    }
    function conversationTop(){return track.getBoundingClientRect().top+window.scrollY;}
    function releaseBefore(){
      const target=Math.max(0,conversationTop()-Math.max(24,Math.round(window.innerHeight*.08)));
      window.scrollTo({top:target,behavior:"smooth"});
    }
    function releaseAfter(){
      const target=track.getBoundingClientRect().bottom+window.scrollY+2;
      window.scrollTo({top:target,behavior:"smooth"});
    }
    function centerConversation(){
      const offset=navOffset();
      const target=stage.getBoundingClientRect().top+window.scrollY-offset;
      window.scrollTo({top:Math.max(0,target),behavior:"smooth"});
    }
    function goTo(next,fromDot){
      if(locked)return;
      const target=Math.max(0,Math.min(total-1,next));
      if(target===active){if(fromDot)centerConversation();return;}
      locked=true;updateUI(target,true);
      if(fromDot)centerConversation();
      window.setTimeout(()=>{locked=false;},480);
    }
    function handleDirection(direction){
      if(locked)return;
      if(direction>0){
        if(active<total-1)goTo(active+1,false);else{locked=true;releaseAfter();window.setTimeout(()=>{locked=false;},650);}
      }else{
        if(active>0)goTo(active-1,false);else{locked=true;releaseBefore();window.setTimeout(()=>{locked=false;},650);}
      }
    }
    function pointerDown(e){
      if(locked||e.pointerType==="mouse")return;
      pointerId=e.pointerId;startY=e.clientY;startX=e.clientX;
      try{stage.setPointerCapture(pointerId);}catch(_e){}
    }
    function pointerUp(e){
      if(pointerId===null||e.pointerId!==pointerId||locked)return;
      const dy=startY-e.clientY,dx=e.clientX-startX;pointerId=null;
      try{stage.releasePointerCapture(e.pointerId);}catch(_e){}
      if(Math.abs(dy)<34||Math.abs(dy)<Math.abs(dx)*1.08)return;
      e.preventDefault();handleDirection(dy>0?1:-1);
    }
    function pointerCancel(){pointerId=null;}
    function handleWheel(e){
      if(Math.abs(e.deltaY)<4||locked)return;
      e.preventDefault();
      if(e.deltaY>0)handleDirection(1);else handleDirection(-1);
      clearTimeout(wheelTimer);wheelTimer=setTimeout(()=>{},80);
    }
    function key(e){
      if(e.key==="ArrowDown"||e.key==="PageDown"||e.key===" "){e.preventDefault();handleDirection(1);}
      else if(e.key==="ArrowUp"||e.key==="PageUp"){e.preventDefault();handleDirection(-1);}
    }

    setTrackHeight();updateUI(0,false);
    window.addEventListener("resize",()=>{setTrackHeight();updateUI(active,false);},{passive:true});
    stage.addEventListener("pointerdown",pointerDown,{passive:true});
    stage.addEventListener("pointerup",pointerUp,{passive:false});
    stage.addEventListener("pointercancel",pointerCancel,{passive:true});
    stage.addEventListener("wheel",handleWheel,{passive:false});
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
