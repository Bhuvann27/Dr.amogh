(function(){
  "use strict";

  function textValue(value){
    if(value==null)return "";
    if(typeof value==="string"||typeof value==="number")return String(value);
    if(Array.isArray(value))return value.map(textValue).filter(Boolean).join(" ");
    if(typeof value==="object"){
      for(const key of ["text","value","point","label","content","answer","q","a"]){
        if(value[key]!=null){const v=textValue(value[key]);if(v)return v;}
      }
      return "";
    }
    return String(value);
  }
  function textArray(value){return Array.isArray(value)?value.map(textValue).map(v=>v.trim()).filter(Boolean):[];}
  function dialogueArray(value){
    if(!Array.isArray(value))return [];
    return value.map(item=>{
      if(typeof item==="string")return {q:"",a:item};
      if(!item||typeof item!=="object")return null;
      return {q:textValue(item.q??item.question??""),a:textValue(item.a??item.answer??item.text??"")};
    }).filter(item=>item&&(item.q||item.a));
  }
  function normaliseStory(story){
    if(!story)return story;
    return Object.assign({},story,{title:textValue(story.title),subtitle:textValue(story.subtitle),intro:textValue(story.intro),relateIntro:textValue(story.relateIntro),relatePoints:textArray(story.relatePoints),relateClose:textValue(story.relateClose),actionPoints:textArray(story.actionPoints),urgent:textValue(story.urgent),dialogue:dialogueArray(story.dialogue)});
  }

  async function loadStories(){
    const local=window.PATIENT_STORIES||[];
    if(!window.PatientInsightsDB)return local.map(normaliseStory);
    try{
      const remote=await Promise.race([window.PatientInsightsDB.fetchPublished(),new Promise(resolve=>setTimeout(()=>resolve([]),2500))]);
      if(!remote.length)return local.map(normaliseStory);
      const bySlug=new Map(local.map(s=>[s.slug,normaliseStory(s)]));
      remote.forEach(s=>bySlug.set(s.slug,normaliseStory(s)));
      return Array.from(bySlug.values());
    }catch(e){return local.map(normaliseStory);}
  }
  function esc(value){return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));}
  function inferCategory(story){const raw=String(story.category||story.topic||story.subtitle||story.title||"").toLowerCase();if(/pregnan|antenatal|postpartum|women/.test(raw))return "Women's health";if(/headache|dizziness|migraine|sleep|stress|fatigue|tired/.test(raw))return "Everyday symptoms";if(/diabet|sugar|blood pressure|hypertension|cholesterol|metabolic/.test(raw))return "Long-term health";if(/infection|fever|cough|cold|viral|respirat/.test(raw))return "Infections";if(/digest|gastric|stomach|meal|acid|bowel/.test(raw))return "Digestive health";return "General medicine";}
  function categoryFor(story){return String(story.category||inferCategory(story)).trim()||"General medicine";}
  loadStories().then(init);

  function init(stories){
    if(!stories.length)return;
    const params=new URLSearchParams(window.location.search),requested=params.get("story"),story=stories.find(s=>s.slug===requested)||stories[0],storyIndex=Math.max(0,stories.indexOf(story));
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
    if(relateList){relateList.innerHTML="";story.relatePoints.forEach(point=>{const li=document.createElement("li");li.innerHTML='<span class="dot"></span><span>'+esc(point)+'</span>';relateList.appendChild(li);});}
    const actionList=document.getElementById("actionList");
    if(actionList){actionList.innerHTML="";story.actionPoints.forEach(point=>{const li=document.createElement("li");li.textContent=point;actionList.appendChild(li);});}
    const urgent=document.getElementById("urgentText");if(urgent)urgent.textContent=story.urgent||"If symptoms are sudden, severe, or getting worse, seek medical attention promptly.";
    buildOtherStories(stories,story);setupReveals();
  }
  function buildLibrary(stories,selected){const wrap=document.getElementById("storyPills");if(!wrap)return;wrap.innerHTML="";stories.forEach((s,i)=>{const a=document.createElement("a");a.href="stories.html?story="+encodeURIComponent(s.slug);a.className="story-choice"+(s.slug===selected.slug?" is-selected":"");if(s.slug===selected.slug)a.setAttribute("aria-current","true");a.innerHTML='<span class="story-choice-number">'+String(i+1).padStart(2,"0")+'</span><span class="story-choice-copy"><span class="story-choice-label">'+esc(categoryFor(s))+'</span><strong>'+esc(String(s.title||"").replace(/[“”]/g,""))+'</strong></span><span class="story-choice-arrow" aria-hidden="true">↗</span>';wrap.appendChild(a);});}
  function buildConversation(story){const wrap=document.getElementById("convPairs");if(!wrap)return;const pairs=story.dialogue;wrap.innerHTML="";(pairs.length?pairs:[{q:"",a:"This story is being prepared."}]).forEach((pair,i)=>{const el=document.createElement("article");el.className="conv-pair"+(i===0?" is-active":"");el.innerHTML='<div class="conv-card-glow" aria-hidden="true"></div><div class="conv-card-inner"><span class="conv-speaker"><span>PATIENT</span><b>↔</b><span>DOCTOR</span></span><span class="conv-card-index">'+String(i+1).padStart(2,"0")+'</span><p class="q">'+esc(pair.q||"")+'</p><p class="a">'+esc(pair.a||"")+'</p></div>';wrap.appendChild(el);});const total=wrap.children.length,progress=document.getElementById("convProgressNum");if(progress)progress.textContent="01 / "+String(total).padStart(2,"0");}
  function buildOtherStories(stories,selected){const wrap=document.getElementById("otherStories");if(!wrap)return;wrap.innerHTML="";const others=stories.filter(s=>s.slug!==selected.slug).slice(0,6);if(!others.length){const section=wrap.closest(".other-stories");if(section)section.style.display="none";return;}others.forEach(s=>{const i=stories.indexOf(s),a=document.createElement("a");a.href="stories.html?story="+encodeURIComponent(s.slug);a.className="other-story-card";a.innerHTML='<span class="other-story-number">PATIENT STORY '+String(i+1).padStart(2,"0")+'</span><p class="quote">'+esc(s.title||"")+'</p><p class="meta">'+esc(s.subtitle||categoryFor(s))+'</p><span class="other-story-read">READ THIS STORY ↗</span>';wrap.appendChild(a);});}
  function setupReveals(){const revealEls=document.querySelectorAll(".reveal");if("IntersectionObserver" in window){const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("is-visible");io.unobserve(entry.target);}}),{threshold:.15});revealEls.forEach(el=>io.observe(el));}else revealEls.forEach(el=>el.classList.add("is-visible"));}
})();
