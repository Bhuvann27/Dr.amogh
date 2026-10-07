(function(){
  'use strict';
  if (window.innerWidth < 881) return;

  const track=document.getElementById('coatTrack');
  const canvas=document.getElementById('heroCanvas');
  if(!track||!canvas) return;

  const FRAME_W=1440, FRAME_H=810, FRAME_COUNT=197;
  const FRAME_DIR='assets/hero-sequence-desktop/';
  const ROTATION_END=0.96;
  const frames=new Array(FRAME_COUNT);
  const ctx=canvas.getContext('2d',{alpha:false});
  let current=0, raf=0;

  function size(){
    const r=canvas.parentElement.getBoundingClientRect();
    const dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.max(1,Math.round(r.width*dpr));
    canvas.height=Math.max(1,Math.round(r.height*dpr));
    draw(current);
  }

  function draw(index){
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

  size();
  window.addEventListener('resize',()=>{if(window.innerWidth>=881)size();},{passive:true});
  window.addEventListener('scroll',()=>{
    if(raf)return;
    raf=requestAnimationFrame(()=>{raf=0;update();});
  },{passive:true});
  update();
})();
