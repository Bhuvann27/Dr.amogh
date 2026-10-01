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
      el.style.opacity = "0";
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

    // The bottom section is a single "next story" card, never a second
    // copy of the currently selected story.
    const otherWrap = document.getElementById("otherStories");
    if(otherWrap){
      otherWrap.innerHTML = "";
      const otherStory = stories.find(s => s.slug !== story.slug);
      if(otherStory){
        const otherIndex = stories.indexOf(otherStory);
        const a = document.createElement("a");
        a.href = "stories.html?story=" + encodeURIComponent(otherStory.slug);
        a.className = "other-story-card";
        a.innerHTML =
          '<span class="other-story-number">PATIENT STORY ' + String(otherIndex + 1).padStart(2,"0") + '</span>' +
          '<p class="quote">' + esc(otherStory.title) + '</p>' +
          '<p class="meta">' + esc(otherStory.subtitle) + '</p>' +
          '<span class="other-story-read">READ THIS STORY ↗</span>';
        otherWrap.appendChild(a);
      }else{
        otherWrap.parentElement.parentElement.style.display = "none";
      }
    }

    const track = document.getElementById("convTrack");
    const vhPerPair = 110;
    track.style.height = Math.max(vhPerPair * pairEls.length, 320) + "vh";

    if(window.gsap && window.ScrollTrigger){
      gsap.registerPlugin(ScrollTrigger);
      ScrollTrigger.config({ignoreMobileResize:true});
      const n = pairEls.length;
      const step = 1 / n;

      // Crossfade between adjacent questions instead of hard-switching.
      // The previous question can only fade toward the next one, so it can
      // never disappear and then reappear later in the sequence.
      function renderConversation(progress){
        // The scroll position maps directly to the story sequence. Each
        // question stays completely readable, then crossfades only around
        // the exact handoff point. No delayed scrub and no jumpy replacement.
        const position = Math.max(0, Math.min(n - 1, progress * (n - 1)));
        const transition = 0.28;
        const nearest = Math.round(position);
        const distance = Math.abs(position - nearest);

        pairEls.forEach((el,i) => {
          el.style.opacity = "0";
          el.style.transform = "translate(-50%, -50%)";
          el.style.pointerEvents = "none";
        });

        if(distance < transition / 2 && nearest > 0 && nearest < n - 1){
          if(position < nearest){
            const t = (position - (nearest - transition / 2)) / (transition / 2);
            pairEls[nearest - 1].style.opacity = String(1 - t);
            pairEls[nearest].style.opacity = String(t);
          }else{
            const t = (position - nearest) / (transition / 2);
            pairEls[nearest].style.opacity = String(1 - t);
            pairEls[nearest + 1].style.opacity = String(t);
          }
        }else{
          const active = Math.max(0, Math.min(n - 1, nearest));
          pairEls[active].style.opacity = "1";
          pairEls[active].style.pointerEvents = "auto";
        }

        const active = Math.max(0, Math.min(n - 1, nearest));
        dots.forEach((d,i) => d.classList.toggle("active", i === active));
        if(progressNum) progressNum.textContent = String(active + 1).padStart(2,"0") + " / " + totalStr;
      }
      ScrollTrigger.create({
        trigger: track,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        onUpdate: self => renderConversation(self.progress),
        onRefresh: self => renderConversation(self.progress)
      });
      renderConversation(0);
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