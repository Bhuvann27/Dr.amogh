(function(){
  "use strict";

  // Local stories always render instantly. If Supabase is configured and
  // reachable, any additional published stories from the admin are merged
  // in (same slug = the Supabase copy wins, so admin edits to the two
  // original stories show up too). If it isn't configured, or the request
  // fails or is slow, we proceed with the local list only — the page
  // never waits on the network to render.
  async function loadStories(){
    const local = window.PATIENT_STORIES || [];
    if(!window.PatientInsightsDB) return local;
    try {
      const remote = await Promise.race([
        window.PatientInsightsDB.fetchPublished(),
        new Promise((resolve) => setTimeout(() => resolve([]), 2500)),
      ]);
      if(!remote.length) return local;
      const bySlug = new Map(local.map((s) => [s.slug, s]));
      remote.forEach((s) => bySlug.set(s.slug, s));
      return Array.from(bySlug.values());
    } catch(e){
      return local;
    }
  }

  loadStories().then(init);

  function init(stories){
  if(!stories.length) return;

  const params = new URLSearchParams(window.location.search);
  const requested = params.get("story");
  const story = stories.find((s) => s.slug === requested) || stories[0];

  document.getElementById("year").textContent = new Date().getFullYear();
  document.title = story.title.replace(/[\u201c\u201d]/g, "") + " — Dr. Amogh G";

  document.getElementById("storyTitle").textContent = story.title;
  const storyEyebrow = document.querySelector(".story-header .eyebrow");
  if(storyEyebrow) storyEyebrow.textContent = `PATIENT STORY ${String(stories.indexOf(story) + 1).padStart(2,"0")}`;
  document.getElementById("storyIntro").textContent = story.intro;

  const pillsWrap = document.getElementById("storyPills");
  pillsWrap.innerHTML = "";
  stories.forEach((s, storyIndex) => {
    const a = document.createElement("a");
    a.href = `stories.html?story=${s.slug}`;
    a.className = "story-pill";
    a.textContent = `STORY ${String(storyIndex + 1).padStart(2,"0")} · ${s.subtitle}`;
    if(s.slug === story.slug) a.setAttribute("aria-current", "true");
    pillsWrap.appendChild(a);
  });

  const pairsWrap = document.getElementById("convPairs");
  pairsWrap.innerHTML = "";
  const counterWrap = document.getElementById("convCounter");
  counterWrap.innerHTML = "";
  const pairEls = [];
  const OFFSETS = [
    { top: "42%", left: "50%" }, { top: "46%", left: "50%" },
    { top: "40%", left: "50%" }, { top: "48%", left: "50%" },
  ];

  story.dialogue.forEach((pair, i) => {
    const el = document.createElement("div");
    el.className = "conv-pair";
    const offset = OFFSETS[i % OFFSETS.length];
    el.style.top = offset.top;
    el.style.left = offset.left;
    el.style.transform = "translate(-50%, -50%)";
    el.innerHTML = `<p class="q">${pair.q}</p><p class="a">${pair.a}</p>`;
    pairsWrap.appendChild(el);
    pairEls.push(el);
    counterWrap.appendChild(document.createElement("i"));
  });
  const dots = Array.from(counterWrap.children);
\n  // Make the first conversation visible immediately. The animation is an enhancement,\n  // not a requirement for the page to have content.\n  if(pairEls[0]){\n    pairEls[0].style.opacity = "1";\n    pairEls[0].style.transform = "translate(-50%, -50%)";\n  }\n  dots.forEach((d, i) => d.classList.toggle("active", i === 0));\n
  document.getElementById("relateIntro").textContent = story.relateIntro;
  document.getElementById("relateClose").textContent = story.relateClose;
  const relateList = document.getElementById("relateList");
  story.relatePoints.forEach((point) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="dot"></span><span>${point}</span>`;
    relateList.appendChild(li);
  });

  const actionList = document.getElementById("actionList");
  story.actionPoints.forEach((point) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${point}</span>`;
    actionList.appendChild(li);
  });
  document.getElementById("urgentText").textContent = story.urgent;

  const otherWrap = document.getElementById("otherStories");
  stories.filter((s) => s.slug !== story.slug).forEach((s) => {
    const a = document.createElement("a");
    a.href = `stories.html?story=${s.slug}`;
    a.className = "other-story-card";
    a.innerHTML = `<p class="quote">${s.title}</p><p class="meta">${s.subtitle}</p>`;
    otherWrap.appendChild(a);
  });

  const track = document.getElementById("convTrack");
  const progressNum = document.getElementById("convProgressNum");
  const totalStr = String(pairEls.length).padStart(2, "0");
  if(progressNum) progressNum.textContent = `01 / ${totalStr}`;
  // Keep the first conversation visible on the untouched opening frame.\n  pairEls.forEach((el, i) => {\n    el.style.opacity = i === 0 ? "1" : "0";\n    el.style.transform = "translate(-50%, -50%)";\n  });\n\n  const vhPerPair = 110;
  track.style.height = `${Math.max(vhPerPair * pairEls.length, 320)}vh`;

  function fadeWindow(p, start, end, fadeFrac){
    const span = end - start;
    const fadeIn = start + span * fadeFrac;
    const fadeOut = end - span * fadeFrac;
    if(p < start || p > end) return 0;
    if(p < fadeIn) return (p - start) / (fadeIn - start);
    if(p > fadeOut) return 1 - (p - fadeOut) / (end - fadeOut);
    return 1;
  }

  if(window.gsap && window.ScrollTrigger){
    gsap.registerPlugin(ScrollTrigger);
    const n = pairEls.length;
    const step = 1 / n;
    ScrollTrigger.create({
      trigger: track, start: "top top", end: "bottom bottom", scrub: true,
      onUpdate: (self) => {
        const p = self.progress;
        pairEls.forEach((el, i) => {
          const s = i * step, e = (i + 1) * step;
          const op = fadeWindow(p, s, e, 0.3);
          el.style.opacity = op;
          el.style.transform = `translate(-50%, calc(-50% + ${(1 - op) * 16}px))`;
        });
        const active = Math.min(n - 1, Math.floor(p * n));
        dots.forEach((d, i) => d.classList.toggle("active", i === active));
        if(progressNum) progressNum.textContent = `${String(active+1).padStart(2,"0")} / ${totalStr}`;
      },
    });
  } else {
    // GSAP didn't load: fall back to a plain, fully readable stacked
    // layout rather than leaving every step overlapping in place.
    track.classList.add("no-js");
    track.style.height = "auto";
    if(progressNum) progressNum.style.display = "none";
  }

  const revealEls = document.querySelectorAll(".reveal");
  if("IntersectionObserver" in window){
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if(entry.isIntersecting){ entry.target.classList.add("is-visible"); io.unobserve(entry.target); }
      });
    }, { threshold: 0.15 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }
  } // end init
})();
