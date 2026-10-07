(function(){
  'use strict';
  if (window.innerWidth < 881) return;

  const track=document.getElementById('coatTrack');
  const stage=document.getElementById('coatStage');
  const canvas=document.getElementById('heroCanvas');
  if(!track||!stage||!canvas) return;

  const FRAME_W=1440, FRAME_H=810, FRAME_COUNT=197;
  const FRAME_DIR='assets/hero-sequence-desktop/';
  const ROTATION_END=0.96;
  const frames=new Array(FRAME_COUNT);
  const ctx=canvas.getContext('2d',{alpha:false});
  let current=0, raf=0;

  // Desktop-only cleanup: the old portrait-side pseudo elements are no longer
  // needed because the new frames already contain a continuous wide background.
  const style=document.createElement('style');
  style.textContent='@media (min-width:881px){.coat-imgwrap::before,.coat-imgwrap::after{display:none!important}.hero-frame-canvas{position:relative!important;z-index:1!important}}';
  document.head.appendChild(style);

  // Very restrained ambient objects. They are decorative only and never alter
  // the mobile hero because this entire file exits below 881px.
  const ambient=document.createElement('div');
  ambient.className='hero-ambient-desktop';
  ambient.innerHTML='<span class="ambient-mark ambient-cross">+</span><span class="ambient-mark ambient-ring"></span><span class="ambient-mark ambient-ecg">⌁</span><span class="ambient-mark ambient-dot"></span>';
  stage.appendChild(ambient);
  const ambientStyle=document.createElement('style');
  ambientStyle.textContent=`
    @media (min-width:881px){
      .hero-ambient-desktop{position:absolute;inset:0;z-index:5;pointer-events:none;overflow:hidden;opacity:.72}
      .ambient-mark{position:absolute;display:block;color:rgba(224,162,78,.42);text-shadow:0 0 22px rgba(224,162,78,.16);will-change:transform;transition:transform .18s ease-out}
      .ambient-cross{left:15%;top:29%;font:500 18px/1 Inter,sans-serif;animation:heroFloatA 7s ease-in-out infinite}
      .ambient-ring{right:14%;top:23%;width:28px;height:28px;border:1px solid rgba(252,248,240,.18);border-radius:50%;animation:heroFloatB 9s ease-in-out infinite}
      .ambient-ecg{right:20%;bottom:26%;font:400 38px/1 Inter,sans-serif;opacity:.24;animation:heroFloatA 11s ease-in-out infinite reverse}
      .ambient-dot{left:22%;bottom:25%;width:5px;height:5px;border-radius:50%;background:rgba(252,248,240,.3);box-shadow:0 0 18px rgba(252,248,240,.18);animation:heroFloatB 8s ease-in-out infinite reverse}
      @keyframes heroFloatA{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(9px,-13px,0)}}
      @keyframes heroFloatB{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(-10px,10px,0)}}
      @media (prefers-reduced-motion:reduce){.ambient-mark{animation:none!important}}
    }`;
  document.head.appendChild(ambientStyle);

  function size(){
    if(window.innerWidth<881) return;
    const r=canvas.parentElement.getBoundingClientRect();
    const dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.max(1,Math.round(r.width*dpr));
    canvas.height=Math.max(1,Math.round(r.height*dpr));
    draw(current);
  }

  function draw(index){
    if(window.innerWidth<881) return;
    const img=frames[index];
    if(!img||!img.complete) return;
    current=Math.max(0,Math.min(FRAME_COUNT-1,index));
    const cw=canvas.width,ch=canvas.height;
    const scale=Math.max(cw/FRAME_W,ch/FRAME_H);
    const dw=FRAME_W*scale,dh=FRAME_H*scale;
    const dx=(cw-dw)*.5,dy=(ch-dh)*.5;
    ctx.imageSmoothingEnabled=true;
    ctx.imageSmoothingQuality='high';
    ctx.fillStyle='#0E0E0E';
    ctx.fillRect(0,0,cw,ch);
    ctx.drawImage(img,0,0,FRAME_W,FRAME_H,dx,dy,dw,dh);
  }

  function fade(p,a,b,f){
    if(p<a||p>b) return 0;
    const span=b-a,fi=a+span*f,fo=b-span*f;
    if(p<fi) return (p-a)/(fi-a);
    if(p>fo) return 1-(p-fo)/(b-fo);
    return 1;
  }

  function update(){
    if(window.innerWidth<881) return;
    const max=Math.max(1,track.offsetHeight-window.innerHeight);
    const p=Math.max(0,Math.min(1,-track.getBoundingClientRect().top/max));
    const t=Math.min(1,p/ROTATION_END);
    draw(Math.round(t*(FRAME_COUNT-1)));

    const h1=document.getElementById('hook1'),h2=document.getElementById('hook2'),h3=document.getElementById('hook3');
    if(h1) h1.style.opacity=fade(p,.04,.18,.28);
    if(h2) h2.style.opacity=fade(p,.18,.36,.28);
    // Give the third hook a longer, clearer desktop window.
    if(h3){ h3.style.opacity=fade(p,.34,.60,.24); h3.style.transform='translateX(-50%)'; }

    const progress=document.getElementById('progressFill');
    if(progress) progress.style.transform=`translateY(${p*114}px)`;
    const cue=document.getElementById('scrollCue');
    if(cue) cue.style.opacity=p>.045?'0':'1';
  }

  for(let i=0;i<FRAME_COUNT;i++){
    const img=new Image();
    img.decoding='async';
    img.src=FRAME_DIR+`frame_${String(i+1).padStart(4,'0')}.webp`;
    img.onload=()=>{frames[i]=img;if(i===0||i===current)draw(current);};
  }

  // Gentle pointer parallax for the ambient objects only. The coat never moves.
  stage.addEventListener('pointermove',(e)=>{
    if(window.innerWidth<881) return;
    const r=stage.getBoundingClientRect();
    const x=(e.clientX-r.left)/r.width-.5;
    const y=(e.clientY-r.top)/r.height-.5;
    ambient.querySelectorAll('.ambient-mark').forEach((el,i)=>{
      const depth=(i+1)*4;
      el.style.marginLeft=`${x*depth}px`;
      el.style.marginTop=`${y*depth}px`;
    });
  },{passive:true});

  size();
  window.addEventListener('resize',()=>{if(window.innerWidth>=881)size();},{passive:true});
  window.addEventListener('scroll',()=>{
    if(raf)return;
    raf=requestAnimationFrame(()=>{raf=0;update();});
  },{passive:true});
  update();
})();
