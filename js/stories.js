(function(){
  "use strict";

  async function loadStories(){
    const local = window.PATIENT_STORIES || [];
    if(!window.PatientInsightsDB) return local;
    try{
      const remote = await Promise.race([
        window.PatientInsightsDB.fetchPublished(),
        new Promise(resolve => setTimeout(() => resolve([]), 2500))
      ]);
      if(!remote.length) return local;
      const bySlug = new Map(local.map(s => [s.slug, s]));
      remote.forEach(s => bySlug.set(s.slug, s));
      return Array.from(bySlug.values());
    }catch(e){
      return local;
    }
  }

  function esc(value){
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[ch]));
  }

  loadStories().then(init);

  function init(stories){
    if(!stories.length) return;

    const params = new URLSearchParams(window.location.search);
    const requested = params.get("story");
    const story = stories.find(s => s.slug === requested) || stories[0];
    const storyIndex = Math.max(0, stories.indexOf(story));

    document.getElementById("year").textContent = new Date().getFullYear();
    document.title = story.title.replace(/[“”]/g, "") + " — Dr. Amogh G";

    const storyEyebrow = document.getElementById("selectedStoryLabel");
    const storyTitle = document.getElementById("storyTitle");
    const storyIntro = document.getElementById("storyIntro");
    if(storyEyebrow) storyEyebrow.textContent = "PATIENT STORY " + String(storyIndex + 1).padStart(2,"0");
    if(storyTitle) storyTitle.textContent = story.title;
    if(storyIntro) storyIntro.textContent = story.intro;

    const pillsWrap = document.getElementById("storyPills");
    pillsWrap.innerHTML = "";
    stories.forEach((s,i) => {
      const a = document.createElement("a");
      a.href = "stories.html?story=" + encodeURIComponent(s.slug);
      a.className = "story-choice";
      if(s.slug === story.slug) a.setAttribute("aria-current","true");
      a.innerHTML =
        '<span class="story-choice-num">' + String(i+1).padStart(2,"0") + '</span>' +
        '<span><strong>STORY ' + String(i+1).padStart(2,"0") + '</strong><span>' + esc(s.title.replace(/[“”]/g,"")) + '</span></span>' +
        '<span class="story-choice-arrow">↗</span>';
      pillsWrap.appendChild(a);
    });

    const pairsWrap = document.getElementById("convPairs");
    const counterWrap = document.getElementById("convCounter");
    pairsWrap.innerHTML = "";
    counterWrap.innerHTML = "";

    const pairEls = [];
    story.dialogue.forEach((pair,i) => {
      const el = document.createElement("div");
      el.className = "conv-pair";
      el.style.top = "50%";
      el.style.left = "50%";
      el.style.transform = "translate(-50%, -50%)";
      el.innerHTML =
        '<p class="q">' + esc(pair.q) + '</p>' +
        '<p class="a">' + esc(pair.a) + '</p>';
      if(i === 0) el.style.opacity = "1";
      pairsWrap.appendChild(el);
      pairEls.push(el);
      counterWrap.appendChild(document.createElement("i"));
    });

    const dots = Array.from(counterWrap.children);
    const progressNum = document.getElementById("convProgressNum");
    const totalStr = String(pairEls.length).padStart(2,"0");
    if(progressNum) progressNum.textContent = "01 / " + totalStr;
    dots.forEach((d,i) => d.classList.toggle("active", i === 0));

    document.getElementById("relateIntro").textContent = story.relateIntro;
    document.getElementById("relateClose").textContent = story.relateClose;

    const relateList = document.getElementById("relateList");
    relateList.innerHTML = "";
    story.relatePoints.forEach(point => {
      const li = document.createElement("li");
      li.innerHTML = '<span class="dot"></span><span>' + esc(point) + '</span>';
      relateList.appendChild(li);
    });

    const actionList = document.getElementById("actionList");
    actionList.innerHTML = "";
    story.actionPoints.forEach(point => {
      const li = document.createElement("li");
      li.textContent = point;
      actionList.appendChild(li);
    });
    document.getElementById("urgentText").textContent = story.urgent;

    const otherWrap = document.getElementById("otherStories");
    otherWrap.innerHTML = "";
    stories.filter(s => s.slug !== story.slug).forEach((s) => {
      const a = document.createElement("a");
      a.href = "stories.html?story=" + encodeURIComponent(s.slug);
      a.className = "other-story-card";
      a.innerHTML =
        '<span class="other-story-number">PATIENT STORY ' + String(stories.indexOf(s)+1).padStart(2,"0") + '</span>' +
        '<p class="quote">' + esc(s.title) + '</p>' +
        '<p class="meta">' + esc(s.subtitle) + '</p>' +
        '<span class="other-story-read">READ THIS STORY ↗</span>';
      otherWrap.appendChild(a);
    });

    const track = document.getElementById("convTrack");
    const vhPerPair = 110;
    track.style.height = Math.max(vhPerPair * pairEls.length, 320) + "vh";

    function fadeWindow(p,start,end,fadeFrac){
      const span = end - start;
      const fadeIn = start + span * fadeFrac;
      const fadeOut = end - span * fadeFrac;
      if(p < start || p > end) return 0;
      if(p < fadeIn) return (p-start)/(fadeIn-start);
      if(p > fadeOut) return 1-(p-fadeOut)/(end-fadeOut);
      return 1;
    }

    if(window.gsap && window.ScrollTrigger){
      gsap.registerPlugin(ScrollTrigger);
      const n = pairEls.length;
      const step = 1 / n;
      ScrollTrigger.create({
        trigger: track,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        onUpdate: self => {
          const p = self.progress;
          pairEls.forEach((el,i) => {
            const s = i * step;
            const e = (i + 1) * step;
            const op = fadeWindow(p,s,e,0.3);
            el.style.opacity = op;
            el.style.transform = "translate(-50%, calc(-50% + " + ((1-op)*16) + "px))";
          });
          const active = Math.min(n-1, Math.floor(p*n));
          dots.forEach((d,i) => d.classList.toggle("active", i === active));
          if(progressNum) progressNum.textContent = String(active+1).padStart(2,"0") + " / " + totalStr;
        }
      });
    }else{
      track.classList.add("no-js");
      track.style.height = "auto";
      if(progressNum) progressNum.style.display = "none";
    }

    const revealEls = document.querySelectorAll(".reveal");
    if("IntersectionObserver" in window){
      const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if(entry.isIntersecting){
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },{threshold:0.15});
      revealEls.forEach(el => io.observe(el));
    }else{
      revealEls.forEach(el => el.classList.add("is-visible"));
    }
  }
})();