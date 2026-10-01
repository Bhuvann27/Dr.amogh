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

      // Restore the original full, diffuse reading rhythm: each line gets
      // a generous reading window and the handoff is a soft overlap rather
      // than a hard replacement. Scroll remains directly responsive.
      function smoothstep(t){
        t = Math.max(0, Math.min(1, t));
        return t * t * (3 - 2 * t);
      }

      function renderConversation(progress){
        const p = Math.max(0, Math.min(1, progress));
        const position = p * (n - 1);
        const active = Math.max(0, Math.min(n - 1, Math.round(position)));
        const transition = 0.34;
        const half = transition / 2;

        pairEls.forEach((el,i) => {
          el.style.opacity = "0";
          el.style.transform = "translate(-50%, calc(-50% + 10px))";
          el.style.filter = "blur(4px)";
          el.style.pointerEvents = "none";
        });

        if(active === 0){
          if(position < half){
            const t = smoothstep(position / half);
            pairEls[0].style.opacity = "1";
            pairEls[0].style.transform = "translate(-50%, calc(-50% + " + ((1 - t) * 8) + "px))";
            pairEls[0].style.filter = "blur(" + ((1 - t) * 4) + "px)";
          }else{
            const t = smoothstep((position - half) / (1 - half));
            pairEls[0].style.opacity = "1";
            pairEls[0].style.transform = "translate(-50%, calc(-50% + " + ((1 - t) * 2) + "px))";
            pairEls[0].style.filter = "blur(" + ((1 - t) * 2) + "px)";
          }
        }else if(active === n - 1){
          if(position > n - 1 - half){
            const t = smoothstep((position - (n - 1 - half)) / half);
            pairEls[n - 1].style.opacity = "1";
            pairEls[n - 1].style.transform = "translate(-50%, calc(-50% + " + (t * 2) + "px))";
            pairEls[n - 1].style.filter = "blur(" + ((1 - t) * 2) + "px)";
          }else{
            pairEls[n - 1].style.opacity = "1";
            pairEls[n - 1].style.transform = "translate(-50%, -50%)";
            pairEls[n - 1].style.filter = "blur(0px)";
          }
        }else{
          const distance = position - active;

          if(Math.abs(distance) <= half){
            if(distance < 0){
              const t = smoothstep((distance + half) / (2 * half));
              pairEls[active - 1].style.opacity = String(1 - t);
              pairEls[active - 1].style.transform = "translate(-50%, calc(-50% + " + (t * -4 + 4) + "px))";
              pairEls[active - 1].style.filter = "blur(" + (t * 4) + "px)";
              pairEls[active].style.opacity = String(t);
              pairEls[active].style.transform = "translate(-50%, calc(-50% + " + ((1 - t) * 4) + "px))";
              pairEls[active].style.filter = "blur(" + ((1 - t) * 4) + "px)";
            }else{
              const t = smoothstep((distance + half) / (2 * half));
              pairEls[active].style.opacity = String(1 - t);
              pairEls[active].style.transform = "translate(-50%, calc(-50% + " + (t * -4) + "px))";
              pairEls[active].style.filter = "blur(" + (t * 4) + "px)";
              pairEls[active + 1].style.opacity = String(t);
              pairEls[active + 1].style.transform = "translate(-50%, calc(-50% + " + ((1 - t) * 4) + "px))";
              pairEls[active + 1].style.filter = "blur(" + ((1 - t) * 4) + "px)";
            }
          }else{
            pairEls[active].style.opacity = "1";
            pairEls[active].style.transform = "translate(-50%, -50%)";
            pairEls[active].style.filter = "blur(0px)";
            pairEls[active].style.pointerEvents = "auto";
          }
        }

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