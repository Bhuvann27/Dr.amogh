(function(){
  "use strict";

  document.getElementById("year").textContent = new Date().getFullYear();

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const track = document.getElementById("coatTrack");
  const progressFill = document.getElementById("progressFill");
  const scrollCue = document.getElementById("scrollCue");
  const nav = document.getElementById("siteNav");
  const mobileNav = document.getElementById("mobileNav");
  const heroNavs = [nav, mobileNav].filter(Boolean);
  const mobileMQ = window.matchMedia("(max-width: 640px)");

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
  // Hero: full-resolution frame-by-frame scroll sequence.
  // The dark opening is trimmed from the source sequence, so scrolling
  // starts on the first bright frame after the opening hook.
  // -----------------------------------------------------------
  const heroCanvas = document.getElementById("heroCanvas");
  const ROTATION_END = 0.965;
  const FRAME_W = 720;
  const FRAME_H = 1280;
  const FRAME_COUNT = 197;
  const FRAME_DIR = "assets/hero-sequence-hires/";
  const heroFrames = new Array(FRAME_COUNT);
  let heroFrame = 0;
  let canvasCtx = null;

  function sizeHeroCanvas(){
    if(!heroCanvas) return;
    const stage = document.getElementById("coatStage") || heroCanvas.parentElement;
    const rect = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if(heroCanvas.width !== w || heroCanvas.height !== h){
      heroCanvas.width = w;
      heroCanvas.height = h;
    }
    if(!canvasCtx) canvasCtx = heroCanvas.getContext("2d", {alpha:false});
    drawHeroFrame(heroFrame);
  }

  function drawHeroFrame(index){
    if(!heroCanvas || !canvasCtx) return;
    heroFrame = Math.max(0, Math.min(FRAME_COUNT - 1, index));

    let img = heroFrames[heroFrame];
    if(!img || !img.complete){
      // Fast scrolling can outrun decoding. Use the nearest decoded frame,
      // never a blank canvas.
      for(let d=1; d<FRAME_COUNT; d++){
        const a = heroFrame-d, b = heroFrame+d;
        if(a >= 0 && heroFrames[a]?.complete){ img=heroFrames[a]; break; }
        if(b < FRAME_COUNT && heroFrames[b]?.complete){ img=heroFrames[b]; break; }
      }
    }
    if(!img || !img.complete) return;

    const cw = heroCanvas.width;
    const ch = heroCanvas.height;
    // Preserve the source frame's 720×1280 composition. Never stretch or
    // crop it differently just because the viewport is wider or taller.
    const scale = Math.min(cw / FRAME_W, ch / FRAME_H);
    const dw = FRAME_W * scale;
    const dh = FRAME_H * scale;
    const dx = Math.round((cw - dw) * 0.5);
    const dy = Math.round((ch - dh) * 0.5);

    canvasCtx.fillStyle = "#0E0E0E";
    canvasCtx.fillRect(0,0,cw,ch);
    canvasCtx.imageSmoothingEnabled = true;
    canvasCtx.imageSmoothingQuality = "high";
    canvasCtx.drawImage(img,0,0,FRAME_W,FRAME_H,dx,dy,dw,dh);
  }

  function renderRotation(p){
    if(reduced || !heroCanvas) return;
    const t = Math.max(0, Math.min(1, p / ROTATION_END));
    drawHeroFrame(Math.round(t * (FRAME_COUNT - 1)));
  }

  function loadHeroFrames(){
    if(!heroCanvas) return;

    const loadOne = (i) => {
      const img = new Image();
      img.decoding = "async";
      img.src = FRAME_DIR + `frame_${String(i+1).padStart(4,"0")}.webp`;
      img.onload = () => {
        heroFrames[i] = img;
        if(i === 0 || i === heroFrame){
          if(i === 0) sizeHeroCanvas();
          drawHeroFrame(heroFrame);
        }
      };
      img.onerror = () => console.warn("Hero frame failed to load:", i+1);
    };

    // Start every real frame request immediately. Lazy/idle loading caused
    // fast scrolls to outrun the sequence and reuse distant frames.
    for(let i=0;i<FRAME_COUNT;i++) loadOne(i);
  }

  heroNavs.forEach(el => el.classList.add("hero-cinematic"));
  loadHeroFrames();
  // Mobile browser chrome can fire resize events while the user is simply
  // scrolling. Do not resize/redraw the hero for those toolbar changes.
  // A real width change (rotation/device resize) still gets handled.
  let lastHeroWidth = window.innerWidth;
  const handleHeroResize = () => {
    const width = window.innerWidth;
    if(!mobileMQ.matches || Math.abs(width - lastHeroWidth) > 1){
      lastHeroWidth = width;
      sizeHeroCanvas();
    }
  };
  window.addEventListener("resize", handleHeroResize, {passive:true});
  if(mobileMQ.addEventListener){
    mobileMQ.addEventListener("change", () => {
      lastHeroWidth = window.innerWidth;
      sizeHeroCanvas();
    });
  }
  // -----------------------------------------------------------
  // Timeline zones (fixed positions, no randomization)
  // -----------------------------------------------------------
  const HOOK1_WINDOW = [0.04, 0.16];
  const HOOK2_WINDOW = [0.18, 0.32];
  const HOOK3_WINDOW = [0.36, 0.54];
  const ID_ZONES = {
    name: [0.91, 0.93],
    qual: [0.92, 0.94],
    exp:  [0.93, 0.95],
    hosp: [0.94, 0.96],
    photo:[0.945, 0.965],
  };

  function fadeWindow(p, start, end, fadeFrac){
    const span = end - start;
    const fadeIn = start + span * fadeFrac;
    const fadeOut = end - span * fadeFrac;
    if(p < start || p > end) return 0;
    if(p < fadeIn) return (p - start) / (fadeIn - start);
    if(p > fadeOut) return 1 - (p - fadeOut) / (end - fadeOut);
    return 1;
  }

  // The doctor's identity fades in line-by-line, then stays fully visible
  // while the final coat lift-off frames play and until the hero itself exits.
  function identityFade(p, start, end){
    if(p < start) return 0;
    if(p >= end) return 1;
    return (p - start) / (end - start);
  }

  if(window.gsap && window.ScrollTrigger){
    gsap.registerPlugin(ScrollTrigger);

    // On touch phones, the browser address bar changing height during the
    // first scroll can fire a large vertical resize. Recalculating a
    // scrubbed trigger at that moment causes the exact jump we want to avoid.
    // Keep the trigger's measured geometry stable during those toolbar moves.
    if(mobileMQ.matches){
      ScrollTrigger.config({ignoreMobileResize:true});
    }

    ScrollTrigger.create({
      trigger: track,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress;

        renderRotation(Math.min(p, ROTATION_END));

        if(hook1) hook1.style.opacity = fadeWindow(p, HOOK1_WINDOW[0], HOOK1_WINDOW[1], 0.28);
        hook2.style.opacity = fadeWindow(p, HOOK2_WINDOW[0], HOOK2_WINDOW[1], 0.3);
        if(hook3) hook3.style.opacity = fadeWindow(p, HOOK3_WINDOW[0], HOOK3_WINDOW[1], 0.3);

        const nameOp = identityFade(p, ID_ZONES.name[0], ID_ZONES.name[1]);
        const qualOp = identityFade(p, ID_ZONES.qual[0], ID_ZONES.qual[1]);
        const expOp  = identityFade(p, ID_ZONES.exp[0], ID_ZONES.exp[1]);
        const hospOp = identityFade(p, ID_ZONES.hosp[0], ID_ZONES.hosp[1]);
        const photoOp = identityFade(p, ID_ZONES.photo[0], ID_ZONES.photo[1]);

        idName.style.opacity = nameOp; idName.style.transform = `translateY(${(1-nameOp)*10}px)`;
        idQual.style.opacity = qualOp; idQual.style.transform = `translateY(${(1-qualOp)*10}px)`;
        idExp.style.opacity  = expOp;  idExp.style.transform  = `translateY(${(1-expOp)*10}px)`;
        idHosp.style.opacity = hospOp; idHosp.style.transform = `translateY(${(1-hospOp)*10}px)`;
        idPhoto.style.opacity = photoOp; idPhoto.style.transform = `scale(${0.7 + photoOp*0.3})`;

        // Keep the frame at the same physical size while the final source
        // frames play. The doctor's identity enters over the closing frames,
        // so the handoff feels continuous instead of shrinking the coat away.
        if(heroCanvas){
          heroCanvas.style.transform = mobileMQ.matches
            ? "translateY(-1.5vh) scale(1)"
            : "";
        }

        // Keep the source ending intact. The identity now remains visible
        // through the entire hero exit instead of fading out early.
        coatImgWrap.style.opacity = 1;
        coatImgWrap.style.transform = "none";
        const identityVisible = Math.max(nameOp, qualOp, expOp, hospOp, photoOp);
        identityBlock.style.opacity = identityVisible;

        const heroFinished = p >= 0.99;
        heroNavs.forEach(el => el.classList.toggle("hero-cinematic", !heroFinished));
        if(identityBlock){
          const identityProgress = Math.max(0, Math.min(1, (p - 0.91) / 0.055));
          identityBlock.style.transform = `translateX(-50%) translateY(${(1 - identityProgress) * 34}px)`;
        }

        progressFill.style.transform = `translateY(${p * (140 - 26)}px)`;
        if(scrollCue) scrollCue.style.opacity = p > 0.045 ? 0 : 1;
      },
    });
  } else {
    // GSAP didn't load: skip the scroll-scrubbed reveal and just show
    // the doctor's identity immediately, so the essential information
    // is never hidden behind a script dependency.
    track.classList.add("no-js");
    // Keep the static hero visible when GSAP is unavailable.
    [idName, idQual, idExp, idHosp].forEach((el) => {
      el.style.opacity = 1; el.style.transform = "none";
    });
    idPhoto.style.opacity = 1; idPhoto.style.transform = "scale(1)";
    if(scrollCue) scrollCue.style.display = "none";
    heroNavs.forEach(el => el.classList.remove("hero-cinematic"));
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
  document.addEventListener("click", (event) => {
    const focusBtn = event.target.closest("#focusBookingDate");
    if(focusBtn){
      const dateInput = document.getElementById("bookDateInput");
      if(dateInput){
        dateInput.scrollIntoView({behavior:"smooth",block:"center"});
        setTimeout(() => dateInput.focus(), 320);
      }
    }
  });

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