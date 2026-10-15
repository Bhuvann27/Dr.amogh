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

  function esc(value){
    return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  }

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
    const year=document.getElementById("year");
    if(year)year.textContent=new Date().getFullYear();
    document.title=String(story.title||"Patient Story").replace(/[“”]/g,"")+" — Dr. Amogh G";

    const eyebrow=document.getElementById("selectedStoryLabel");
    const title=document.getElementById("storyTitle");
    const intro=document.getElementById("storyIntro");
    if(eyebrow)eyebrow.textContent="PATIENT STORY "+String(storyIndex+1).padStart(2,"0");
    if(title)title.textContent=story.title||"Patient story";
    if(intro)intro.textContent=story.intro||"A patient conversation from this practice.";

    buildLibrary(stories,story);
    buildConversation(story);

    const relateIntro=document.getElementById("relateIntro");
    const relateClose=document.getElementById("relateClose");
    if(relateIntro)relateIntro.textContent=story.relateIntro||"Sometimes small changes are easy to ignore. You may have noticed that:";
    if(relateClose)relateClose.textContent=story.relateClose||"When something keeps happening or starts affecting everyday life, it is worth paying attention to.";

    const relateList=document.getElementById("relateList");
    if(relateList){
      relateList.innerHTML="";
      (story.relatePoints||[]).forEach(point=>{
        const li=document.createElement("li");
        li.innerHTML='<span class="dot"></span><span>'+esc(point)+'</span>';
        relateList.appendChild(li);
      });
    }

    const actionList=document.getElementById("actionList");
    if(actionList){
      actionList.innerHTML="";
      (story.actionPoints||[]).forEach(point=>{
        const li=document.createElement("li");
        li.textContent=point;
        actionList.appendChild(li);
      });
    }
    const urgent=document.getElementById("urgentText");
    if(urgent)urgent.textContent=story.urgent||"If symptoms are sudden, severe, or getting worse, seek medical attention promptly.";

    buildOtherStories(stories,story);
    setupReveals();
  }

  function buildLibrary(stories,selected){
    const wrap=document.getElementById("storyPills");
    if(!wrap)return;
    wrap.innerHTML="";
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
    const stage=document.getElementById("convStage");
    const wrap=document.getElementById("convPairs");
    const counter=document.getElementById("convCounter");
    const progress=document.getElementById("convProgressNum");
    if(!stage||!wrap)return;

    const pairs=Array.isArray(story.dialogue)?story.dialogue:[];
    wrap.innerHTML="";
    if(counter)counter.innerHTML="";

    const slides=pairs.map((pair,i)=>{
      const el=document.createElement("article");
      el.className="conv-pair"+(i===0?" is-active":"");
      el.innerHTML='<div class="conv-card-glow" aria-hidden="true"></div><div class="conv-card-inner"><span class="conv-speaker"><span>PATIENT</span><b>↔</b><span>DOCTOR</span></span><span class="conv-card-index">'+String(i+1).padStart(2,"0")+'</span><p class="q">'+esc(pair.q)+'</p><p class="a">'+esc(pair.a)+'</p></div>';
      wrap.appendChild(el);
      return el;
    });

    if(!slides.length){
      const el=document.createElement("article");
      el.className="conv-pair is-active";
      el.innerHTML='<div class="conv-card-inner"><span class="conv-speaker"><span>PATIENT</span><b>↔</b><span>DOCTOR</span></span><p class="a">This story is being prepared.</p></div>';
      wrap.appendChild(el);
      slides.push(el);
    }

    slides.forEach((_,i)=>{
      const dot=document.createElement("i");
      dot.className=i===0?"active":"";
      if(counter)counter.appendChild(dot);
    });

    let active=0;
    const total=slides.length;
    function render(next,focus){
      active=Math.max(0,Math.min(total-1,next));
      wrap.style.transform="translate3d("+(-active*100)+"%,0,0)";
      slides.forEach((el,i)=>el.classList.toggle("is-active",i===active));
      if(progress)progress.textContent=String(active+1).padStart(2,"0")+" / "+String(total).padStart(2,"0");
      if(counter)Array.from(counter.children).forEach((d,i)=>d.classList.toggle("active",i===active));
      if(focus){const viewport=document.getElementById("convViewport");if(viewport)viewport.focus({preventScroll:true});}
    }

    const controls=document.createElement("div");
    controls.className="conv-controls";
    controls.innerHTML='<button type="button" class="conv-nav conv-prev" aria-label="Previous exchange">←</button><span class="conv-swipe-hint">Swipe to continue</span><button type="button" class="conv-nav conv-next" aria-label="Next exchange">→</button>';
    stage.appendChild(controls);
    controls.querySelector(".conv-prev").onclick=()=>render(active-1,true);
    controls.querySelector(".conv-next").onclick=()=>render(active+1,true);

    let startX=0,startY=0,dragging=false;
    const viewport=document.getElementById("convViewport");
    if(viewport){
      viewport.addEventListener("touchstart",e=>{
        const t=e.changedTouches[0];startX=t.clientX;startY=t.clientY;dragging=true;
      },{passive:true});
      viewport.addEventListener("touchend",e=>{
        if(!dragging)return;
        dragging=false;
        const t=e.changedTouches[0],dx=t.clientX-startX,dy=t.clientY-startY;
        if(Math.abs(dx)>48&&Math.abs(dx)>Math.abs(dy)*1.15)render(active+(dx<0?1:-1));
      },{passive:true});
      viewport.addEventListener("pointerdown",e=>{
        if(e.pointerType==="touch")return;
        startX=e.clientX;startY=e.clientY;dragging=true;
      });
      viewport.addEventListener("pointerup",e=>{
        if(!dragging||e.pointerType==="touch")return;
        dragging=false;
        const dx=e.clientX-startX,dy=e.clientY-startY;
        if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.15)render(active+(dx<0?1:-1));
      });
      viewport.tabIndex=0;
      viewport.addEventListener("keydown",e=>{
        if(e.key==="ArrowRight"){e.preventDefault();render(active+1,true);}
        if(e.key==="ArrowLeft"){e.preventDefault();render(active-1,true);}
      });
    }
    render(0,false);
  }

  function buildOtherStories(stories,selected){
    const wrap=document.getElementById("otherStories");
    if(!wrap)return;
    wrap.innerHTML="";
    const others=stories.filter(s=>s.slug!==selected.slug).slice(0,6);
    if(!others.length){wrap.parentElement.parentElement.style.display="none";return;}
    others.forEach(s=>{
      const i=stories.indexOf(s);
      const a=document.createElement("a");
      a.href="stories.html?story="+encodeURIComponent(s.slug);
      a.className="other-story-card";
      a.innerHTML='<span class="other-story-number">PATIENT STORY '+String(i+1).padStart(2,"0")+'</span><p class="quote">'+esc(s.title||"")+'</p><p class="meta">'+esc(s.subtitle||categoryFor(s))+'</p><span class="other-story-read">READ THIS STORY ↗</span>';
      wrap.appendChild(a);
    });
  }

  function setupReveals(){
    const revealEls=document.querySelectorAll(".reveal");
    if("IntersectionObserver" in window){
      const io=new IntersectionObserver(entries=>entries.forEach(entry=>{
        if(entry.isIntersecting){entry.target.classList.add("is-visible");io.unobserve(entry.target);}
      }),{threshold:.15});
      revealEls.forEach(el=>io.observe(el));
    }else revealEls.forEach(el=>el.classList.add("is-visible"));
  }
})();
