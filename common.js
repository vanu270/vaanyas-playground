// Shared: natural voice picker + child name (Vaanya's Playground)
(function(){
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
window.kidName=function(){try{return localStorage.getItem('kidName')||''}catch(e){return''}};
window.setKidName=function(n){try{localStorage.setItem('kidName',n)}catch(e){}};
window.cheerName=function(){return kidName()||'superstar'};
})();
