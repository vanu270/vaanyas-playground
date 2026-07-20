// Shared engine: voice, name, sound effects, confetti, dark mode, PWA
(function(){
// ---------- Voice ----------
let VOICE=null;
function pick(){
  const vs=speechSynthesis.getVoices();
  if(!vs.length)return;
  function rank(v){
    let s=0;const n=v.name.toLowerCase(),l=v.lang.toLowerCase();
    if(!l.startsWith('en'))s-=6;
    if(l==='en-in')s+=3;
    if(n.includes('natural')||n.includes('neural'))s+=5;
    if(n.includes('google'))s+=3;
    if(/(female|aria|jenny|zira|samantha|neerja|libby|sonia|heera)/.test(n))s+=2;
    return s;
  }
  VOICE=vs.slice().sort((a,b)=>rank(b)-rank(a))[0]||null;
}
pick();
if(typeof speechSynthesis!=='undefined')speechSynthesis.onvoiceschanged=pick;
window.say=function(t){
  try{
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(t);
    if(VOICE)u.voice=VOICE;
    const nat=VOICE&&/natural|neural|google/i.test(VOICE.name);
    u.rate=nat?0.95:0.85;
    u.pitch=nat?1.05:1.2;
    speechSynthesis.speak(u);
  }catch(e){}
};
// ---------- Name ----------
window.kidName=function(){try{return localStorage.getItem('kidName')||''}catch(e){return''}};
window.setKidName=function(n){try{localStorage.setItem('kidName',n)}catch(e){}};
window.cheerName=function(){return kidName()||'superstar'};
// ---------- Sound effects (WebAudio) ----------
let AC=null;
function ac(){if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(AC&&AC.state==='suspended')AC.resume();return AC}
function tone(f,dur,delay,type,vol){
  const a=ac();if(!a)return;
  const o=a.createOscillator(),g=a.createGain();
  o.type=type||'sine';o.frequency.value=f;
  g.gain.setValueAtTime(0,a.currentTime+delay);
  g.gain.linearRampToValueAtTime(vol||.2,a.currentTime+delay+.02);
  g.gain.exponentialRampToValueAtTime(.001,a.currentTime+delay+dur);
  o.connect(g);g.connect(a.destination);
  o.start(a.currentTime+delay);o.stop(a.currentTime+delay+dur+.05);
}
window.playSfx=function(name){
  if(name==='correct'){tone(523,.15,0,'triangle',.25);tone(659,.15,.12,'triangle',.25);tone(784,.3,.24,'triangle',.25)}
  else if(name==='wrong'){tone(200,.3,0,'sawtooth',.12);tone(150,.3,.1,'sawtooth',.12)}
  else if(name==='click'){tone(880,.08,0,'sine',.15)}
  else if(name==='star'){tone(1047,.1,0,'sine',.2);tone(1319,.1,.08,'sine',.2);tone(1568,.1,.16,'sine',.2);tone(2093,.25,.24,'sine',.2)}
  else if(name==='pop'){tone(400,.05,0,'square',.15);tone(600,.08,.03,'sine',.2)}
};
// ---------- Confetti ----------
window.burstConfetti=function(){
  const c=document.createElement('canvas');
  c.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9999';
  c.width=innerWidth;c.height=innerHeight;
  document.body.appendChild(c);
  const x=c.getContext('2d');
  const cols=['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#a855f7','#ec4899'];
  const ps=[];
  for(let i=0;i<90;i++)ps.push({x:c.width/2,y:c.height/2,vx:(Math.random()-.5)*14,vy:-Math.random()*13-3,r:4+Math.random()*5,c:cols[i%cols.length],a:1,rot:Math.random()*6,vr:(Math.random()-.5)*.4});
  const t0=performance.now();
  (function f(t){
    const el=(t-t0)/1000;
    x.clearRect(0,0,c.width,c.height);
    ps.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.35;p.rot+=p.vr;p.a=Math.max(0,1-el/1.6);
      x.save();x.globalAlpha=p.a;x.translate(p.x,p.y);x.rotate(p.rot);x.fillStyle=p.c;x.fillRect(-p.r,-p.r/2,p.r*2,p.r);x.restore()});
    if(el<1.7)requestAnimationFrame(f);else c.remove();
  })(t0);
};
// ---------- Dark mode ----------
try{if(localStorage.getItem('nightMode')==='1')document.documentElement.classList.add('night')}catch(e){}
function addNight(){
  const st=document.createElement('style');
  st.textContent='html.night{filter:brightness(.68) saturate(.85)}#nightBtn{position:fixed;bottom:14px;right:14px;z-index:1000;font-size:1.3rem;width:48px;height:48px;border:none;border-radius:50%;background:#fff;box-shadow:0 4px 0 rgba(0,0,0,.15);cursor:pointer}';
  document.head.appendChild(st);
  const b=document.createElement('button');
  b.id='nightBtn';b.setAttribute('aria-label','Night mode');
  b.textContent=document.documentElement.classList.contains('night')?'☀️':'🌙';
  b.onclick=function(){
    const on=document.documentElement.classList.toggle('night');
    b.textContent=on?'☀️':'🌙';
    try{localStorage.setItem('nightMode',on?'1':'0')}catch(e){}
  };
  document.body.appendChild(b);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addNight);else addNight();
// ---------- PWA ----------
if('serviceWorker' in navigator){try{navigator.serviceWorker.register('sw.js')}catch(e){}}
})();
