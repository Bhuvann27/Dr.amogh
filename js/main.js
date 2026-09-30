(function(){
  "use strict";

  document.getElementById("year").textContent = new Date().getFullYear();

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const track = document.getElementById("coatTrack");
  const progressFill = document.getElementById("progressFill");
  const scrollCue = document.getElementById("scrollCue");
  const nav = document.getElementById("siteNav");
  const mobileNav = document.getElementById("mobileNav");

  const hook1 = document.getElementById("hook1");
  const hook2 = document.getElementById("hook2");
  const hook3 = document.getElementById("hook3");
  const idName = document.getElementById("idName");
  const idQual = document.getElementById("idQual");
  const idExp = document.getElementById("idExp");
  const idHosp = document.getElementById("idHosp");
  const idPhoto = document.getElementById("identityPhoto");
  const identityBlock = document.getElementById("identityBlock");
  const coatImgWrap = document.getElementById("coatImgWrap");

  // -----------------------------------------------------------
  // Hero video: scroll controls the actual video timeline.
  // If the video is unavailable, fall back to the existing frame sequence.
  // -----------------------------------------------------------
  // -----------------------------------------------------------
  // Hero: lightweight frame-by-frame scroll sequence.
  // The page never plays a video. Scroll position selects a prepared
  // WebP frame, which keeps the interaction deterministic and fast.
  // -----------------------------------------------------------
  const heroVideo = document.getElementById("heroVideo");
  const ROTATION_END = 0.44;
  let videoDuration = 0;
  let lastVideoTime = -1;

  // True scroll-scrubbed hero. The video never plays by itself.
  if(heroVideo){
    heroVideo.autoplay = false;
    heroVideo.loop = false;
    heroVideo.muted = true;
    heroVideo.playsInline = true;
    heroVideo.controls = false;
    heroVideo.pause();

    const ready = () => {
      if(Number.isFinite(heroVideo.duration) && heroVideo.duration > 0){
        videoDuration = heroVideo.duration;
        heroVideo.currentTime = 0;
        lastVideoTime = 0;
      }
    };
    heroVideo.addEventListener("loadedmetadata", ready);
    heroVideo.addEventListener("loadeddata", ready);
    heroVideo.load();
  }

  function renderRotation(p){
    if(reduced || !heroVideo || !videoDuration) return;
    const t = Math.max(0, Math.min(1, p / ROTATION_END));
    const next = t * videoDuration;
    if(Math.abs(next - lastVideoTime) > 0.001){
      lastVideoTime = next;
      heroVideo.currentTime = next;
      heroVideo.pause();
    }
  }

  // -----------------------------------------------------------
  // Timeline zones (fixed positions, no randomization)
  // -----------------------------------------------------------
  const HOOK1_WINDOW = [0.01, 0.09];
  const HOOK2_WINDOW = [0.15, 0.27];
  const HOOK3_WINDOW = [0.33, 0.43];
  const ID_ZONES = {
    name: [0.48, 0.55],
    qual: [0.55, 0.61],
    exp:  [0.61, 0.67],
    hosp: [0.67, 0.73],
    photo:[0.73, 0.80],
  };
  const RELEASE_START = 0.86;

  function fadeWindow(p, start, end, fadeFrac){
    const span = end - start;
    const fadeIn = start + span * fadeFrac;
    const fadeOut = end - span * fadeFrac;
    if(p < start || p > end) return 0;
    if(p < fadeIn) return (p - start) / (fadeIn - start);
    if(p > fadeOut) return 1 - (p - fadeOut) / (end - fadeOut);
    return 1;
  }
  // identity lines fade in and STAY visible once shown (no fade-out until release)
  function holdFadeIn(p, start, end){
    if(p < start) return 0;
    if(p > end) return 1;
    return (p - start) / (end - start);
  }

  if(window.gsap && window.ScrollTrigger){
    gsap.registerPlugin(ScrollTrigger);

    ScrollTrigger.create({
      trigger: track,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress;

        renderRotation(Math.min(p, ID_ZONES.name[0]));

        hook1.style.opacity = fadeWindow(p, HOOK1_WINDOW[0], HOOK1_WINDOW[1], 0.3);
        hook2.style.opacity = fadeWindow(p, HOOK2_WINDOW[0], HOOK2_WINDOW[1], 0.3);
        if(hook3) hook3.style.opacity = fadeWindow(p, HOOK3_WINDOW[0], HOOK3_WINDOW[1], 0.3);

        const nameOp = holdFadeIn(p, ID_ZONES.name[0], ID_ZONES.name[1]);
        const qualOp = holdFadeIn(p, ID_ZONES.qual[0], ID_ZONES.qual[1]);
        const expOp  = holdFadeIn(p, ID_ZONES.exp[0], ID_ZONES.exp[1]);
        const hospOp = holdFadeIn(p, ID_ZONES.hosp[0], ID_ZONES.hosp[1]);
        const photoOp = holdFadeIn(p, ID_ZONES.photo[0], ID_ZONES.photo[1]);

        idName.style.opacity = nameOp; idName.style.transform = `translateY(${(1-nameOp)*10}px)`;
        idQual.style.opacity = qualOp; idQual.style.transform = `translateY(${(1-qualOp)*10}px)`;
        idExp.style.opacity  = expOp;  idExp.style.transform  = `translateY(${(1-expOp)*10}px)`;
        idHosp.style.opacity = hospOp; idHosp.style.transform = `translateY(${(1-hospOp)*10}px)`;
        idPhoto.style.opacity = photoOp; idPhoto.style.transform = `scale(${0.7 + photoOp*0.3})`;

        // phones: the coat is large, so lift and shrink it a little as the
        // doctor's name and details appear underneath it
        const settle = Math.max(0, Math.min(1, (p - 0.44) / 0.06));
        canvas.style.transform = mobileMQ.matches
          ? `translateY(${-settle * 8}vh) scale(${1 - settle * 0.28})` : "";

        // release: whole hero fades/scales away into the normal page
        const release = p > RELEASE_START ? (p - RELEASE_START) / (1 - RELEASE_START) : 0;
        coatImgWrap.style.opacity = 1 - release;
        coatImgWrap.style.transform = `scale(${1 - release * 0.15}) translateY(${-release * 40}px)`;
        identityBlock.style.opacity = 1 - release;

        progressFill.style.transform = `translateY(${p * (140 - 26)}px)`;
        if(scrollCue) scrollCue.style.opacity = p > 0.045 ? 0 : 1;
      },
    });
  } else {
    // GSAP didn't load: skip the scroll-scrubbed reveal and just show
    // the doctor's identity immediately, so the essential information
    // is never hidden behind a script dependency.
    track.classList.add("no-js");
    target = current = 0; needsDraw = true; kick();
    [idName, idQual, idExp, idHosp].forEach((el) => {
      el.style.opacity = 1; el.style.transform = "none";
    });
    idPhoto.style.opacity = 1; idPhoto.style.transform = "scale(1)";
    if(scrollCue) scrollCue.style.display = "none";
  }

  // nav swaps to its light-on-dark variant while the (dark) hero is on screen;
  // the floating WhatsApp/Call control only appears once the hero has fully
  // scrolled past, so it never competes with the coat animation or hooks.
  const floatingContact = document.getElementById("floatingContact");
  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const onHero = entry.isIntersecting;
      nav.classList.toggle("is-on-dark", onHero);
      if(mobileNav) mobileNav.classList.toggle("is-on-dark", onHero);
      if(floatingContact) floatingContact.classList.toggle("show", !onHero);
      const siteAssistant = document.getElementById("siteAssistant");
      if(siteAssistant) siteAssistant.classList.toggle("show", !onHero);
    });
  }, { threshold: 0.05 });
  navObserver.observe(track);

  // Areas of Care accordion — collapsed by default, one or many open at once
  document.querySelectorAll(".care-item-head").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".care-item");
      const isOpen = item.classList.toggle("open");
      btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  });

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
})();
