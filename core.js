/* =============================================================
   Vaanya's Playground — Progression Engine
   Depends on common.js (say, playSfx, burstConfetti, kidName)
   Everything persists to localStorage under one key: "vp.state"
   ============================================================= */
(function(){
'use strict';

/* ---------- Config ---------- */
const LEVELS = [
  {n:1, name:'Little Explorer',  xp:0,    skills:['Numbers 1-5','Counting objects','Matching colors']},
  {n:2, name:'Bright Spark',     xp:150,  skills:['Numbers 1-10','Easy addition','Shape recognition']},
  {n:3, name:'Clever Cub',       xp:400,  skills:['Numbers 1-20','Addition up to 10','Memory games']},
  {n:4, name:'Smart Star',       xp:800,  skills:['Addition & subtraction','Alphabet matching','Simple spelling']},
  {n:5, name:'Super Genius',     xp:1400, skills:['Word building','Skip counting','Pattern recognition']}
];

const XP_BY_DIFFICULTY = {easy:10, medium:20, hard:40};
const STARS_CORRECT = 5;
const STARS_PERFECT = 20;
const COMBO_AT = 3;          // 3 in a row
const STARS_COMBO = 10;

const ACHIEVEMENTS = [
  {id:'first',    icon:'🌟', name:'First Steps',    desc:'Play your first game',        test:s=>s.totalCorrect>=1},
  {id:'stars100', icon:'⭐', name:'100 Stars',      desc:'Earn 100 stars',              test:s=>s.stars>=100},
  {id:'stars500', icon:'✨', name:'500 Stars',      desc:'Earn 500 stars',              test:s=>s.stars>=500},
  {id:'math',     icon:'🎯', name:'Math Master',    desc:'50 correct math answers',     test:s=>(s.skills.math||0)>=50},
  {id:'puzzle',   icon:'🧩', name:'Puzzle Genius',  desc:'25 correct puzzles',          test:s=>(s.skills.puzzle||0)>=25},
  {id:'alphabet', icon:'📚', name:'Alphabet Hero',  desc:'50 correct letters',          test:s=>(s.skills.letters||0)>=50},
  {id:'streak7',  icon:'🔥', name:'7-Day Streak',   desc:'Play 7 days in a row',        test:s=>s.streak>=7},
  {id:'lvl3',     icon:'🏆', name:'Level 3!',       desc:'Reach level 3',               test:s=>s.level>=3},
  {id:'lvl5',     icon:'👑', name:'Super Genius',   desc:'Reach level 5',               test:s=>s.level>=5},
  {id:'combo10',  icon:'💥', name:'Combo King',     desc:'Get a 10-answer streak',      test:s=>s.bestCombo>=10}
];

const STICKER_PACKS = {
  Animals:   ['🐶','🐱','🦁','🐘','🐵','🐧','🦊','🐼'],
  Dinosaurs: ['🦕','🦖','🥚','🌋','🦴','🌿'],
  Space:     ['🚀','🌙','⭐','🪐','👨‍🚀','🛸','☄️','🌌'],
  Vehicles:  ['🚗','🚌','🚂','✈️','🚁','🚜','🚑','🚲'],
  Ocean:     ['🐠','🐳','🐙','🦀','🐡','🦈','🐚','🌊'],
  Farm:      ['🐮','🐷','🐔','🐑','🌾','🚜','🥕','🌻']
};
const ALL_STICKERS = Object.entries(STICKER_PACKS)
  .flatMap(([pack,list])=>list.map(emoji=>({pack,emoji})));

const CHALLENGE_POOL = [
  {id:'add5',    icon:'➕', text:'Solve 5 addition problems', goal:5,  track:'add'},
  {id:'sub3',    icon:'➖', text:'Solve 3 subtraction problems', goal:3, track:'sub'},
  {id:'animals', icon:'🦁', text:'Match 10 animals',          goal:10, track:'animals'},
  {id:'letters', icon:'🔤', text:'Get 8 letters right',       goal:8,  track:'letters'},
  {id:'count',   icon:'🔢', text:'Count 6 times correctly',   goal:6,  track:'counting'},
  {id:'shapes',  icon:'🔺', text:'Find 6 shapes',             goal:6,  track:'shapes'},
  {id:'memory',  icon:'🧠', text:'Finish 1 memory game',      goal:1,  track:'memoryWin'},
  {id:'pattern', icon:'🔁', text:'Solve 5 patterns',          goal:5,  track:'patterns'},
  {id:'stars50', icon:'⭐', text:'Earn 50 stars today',       goal:50, track:'starsToday'}
];

/* ---------- Helpers ---------- */
const todayKey = () => new Date().toISOString().slice(0,10);
const pick = a => a[Math.floor(Math.random()*a.length)];
function seededShuffle(arr, seed){                 // deterministic per-day picks
  const a = arr.slice();
  let s = seed;
  for(let i=a.length-1;i>0;i--){
    s = (s*9301 + 49297) % 233280;
    const j = Math.floor((s/233280)*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

/* =============================================================
   Store — single source of truth, persisted to localStorage
   ============================================================= */
class Store {
  constructor(){ this.state = this.load(); this.migrate(); }

  defaults(){
    return {
      xp:0, stars:0, level:1,
      totalCorrect:0, totalWrong:0,
      bestCombo:0,
      skills:{},              // {math:12, letters:30, ...} correct counts
      achievements:[],        // unlocked ids
      stickers:[],            // unlocked "pack:emoji"
      streak:0, lastPlayed:null,
      days:{},                // {'2026-07-27':{secs:0,stars:0,games:0,correct:0,wrong:0}}
      challenges:{date:null, list:[], claimed:false},
      counters:{},            // per-day challenge trackers
      settings:{sound:true}
    };
  }
  load(){
    try{
      const raw = localStorage.getItem('vp.state');
      return raw ? Object.assign(this.defaults(), JSON.parse(raw)) : this.defaults();
    }catch(e){ return this.defaults(); }
  }
  save(){
    try{ localStorage.setItem('vp.state', JSON.stringify(this.state)); }catch(e){}
  }
  migrate(){
    const s = this.state;
    ['skills','days','counters','settings'].forEach(k=>{ if(!s[k]||typeof s[k]!=='object') s[k]={}; });
    ['achievements','stickers'].forEach(k=>{ if(!Array.isArray(s[k])) s[k]=[]; });
    if(!s.challenges || typeof s.challenges!=='object') s.challenges={date:null,list:[],claimed:false};
  }
  today(){
    const k = todayKey();
    if(!this.state.days[k]) this.state.days[k] = {secs:0, stars:0, games:0, correct:0, wrong:0};
    return this.state.days[k];
  }
}

/* =============================================================
   Progress — the public API games call
   ============================================================= */
class Progress {
  constructor(){
    this.store = new Store();
    this.combo = 0;
    this.sessionStart = Date.now();
    this.touchStreak();
    this.rollChallenges();
    this.trackTime();
  }
  get s(){ return this.store.state; }

  /* --- daily streak --- */
  touchStreak(){
    const s = this.s, t = todayKey();
    if(s.lastPlayed === t) return;
    const y = new Date(Date.now()-864e5).toISOString().slice(0,10);
    s.streak = (s.lastPlayed === y) ? (s.streak||0)+1 : 1;
    s.lastPlayed = t;
    this.store.save();
  }

  /* --- accumulate learning time in 15s ticks --- */
  trackTime(){
    setInterval(()=>{
      if(document.hidden) return;
      this.store.today().secs += 15;
      this.store.save();
    }, 15000);
  }

  /* --- level maths --- */
  levelInfo(){
    const s = this.s;
    let cur = LEVELS[0];
    for(const L of LEVELS) if(s.xp >= L.xp) cur = L;
    const next = LEVELS.find(L=>L.xp > s.xp) || null;
    const base = cur.xp, span = next ? next.xp-base : 1;
    const pct = next ? Math.min(100, Math.round(((s.xp-base)/span)*100)) : 100;
    return {cur, next, pct, xpIntoLevel:s.xp-base, xpNeeded:next?next.xp-s.xp:0};
  }
  unlockedLevel(){ return this.levelInfo().cur.n; }

  /* --- the main hook games call on every answer --- */
  correct(opts){
    opts = opts || {};
    const diff  = opts.difficulty || 'easy';
    const skill = opts.skill || 'general';
    const s = this.s;

    const xp = XP_BY_DIFFICULTY[diff] || 10;
    let stars = STARS_CORRECT;
    this.combo++;
    if(this.combo > (s.bestCombo||0)) s.bestCombo = this.combo;

    const msgs = [];
    if(this.combo > 0 && this.combo % COMBO_AT === 0){
      stars += STARS_COMBO;
      msgs.push({icon:'🔥', text:this.combo+' in a row! +'+STARS_COMBO+' bonus stars'});
    }

    const before = s.level;
    s.xp += xp;
    s.stars += stars;
    s.totalCorrect++;
    s.skills[skill] = (s.skills[skill]||0) + 1;
    const d = this.store.today();
    d.correct++; d.stars += stars;

    this.bumpChallenge(opts.track || skill, 1);
    this.bumpChallenge('starsToday', stars);

    s.level = this.levelInfo().cur.n;
    this.store.save();

    HUD.refresh();
    HUD.toast('⭐ +'+stars+' stars   ✨ +'+xp+' XP');
    msgs.forEach(m=>HUD.toast(m.icon+' '+m.text));
    if(s.level > before) this.levelUp(s.level);
    this.checkAchievements();
    return {xp, stars, combo:this.combo};
  }

  wrong(){
    this.combo = 0;
    this.s.totalWrong++;
    this.store.today().wrong++;
    this.store.save();
  }

  /* --- called when a whole round/game finishes --- */
  finishRound(opts){
    opts = opts || {};
    const s = this.s;
    this.store.today().games++;
    if(opts.perfect){
      s.stars += STARS_PERFECT;
      this.store.today().stars += STARS_PERFECT;
      this.bumpChallenge('starsToday', STARS_PERFECT);
      HUD.toast('🏆 Perfect round! +'+STARS_PERFECT+' stars');
    }
    if(opts.track) this.bumpChallenge(opts.track, 1);
    this.store.save();
    HUD.refresh();
    this.checkAchievements();
    const st = this.awardSticker();
    Celebrate.show(opts.title || 'Great job!', st);
    return st;
  }

  /* --- stickers --- */
  awardSticker(){
    const owned = new Set(this.s.stickers);
    const locked = ALL_STICKERS.filter(x=>!owned.has(x.pack+':'+x.emoji));
    if(!locked.length) return null;
    const got = pick(locked);
    this.s.stickers.push(got.pack+':'+got.emoji);
    this.store.save();
    return got;
  }

  /* --- achievements --- */
  checkAchievements(){
    const s = this.s;
    ACHIEVEMENTS.forEach(a=>{
      if(s.achievements.includes(a.id)) return;
      let ok = false;
      try{ ok = a.test(s); }catch(e){}
      if(ok){
        s.achievements.push(a.id);
        this.store.save();
        HUD.badge(a);
      }
    });
  }

  levelUp(n){
    const L = LEVELS.find(x=>x.n===n) || LEVELS[0];
    if(window.burstConfetti) burstConfetti();
    if(window.playSfx) playSfx('star');
    if(window.say) say('Level up! You are now level '+n+', '+L.name+'! Amazing work, '+(window.cheerName?cheerName():'superstar')+'!');
    Celebrate.show('LEVEL '+n+'! ' + L.name, null, '🎉');
  }

  /* --- daily challenges --- */
  rollChallenges(){
    const s = this.s, t = todayKey();
    if(s.challenges.date === t && s.challenges.list.length) return;
    const seed = parseInt(t.replace(/-/g,''),10) % 233280;
    s.challenges = {
      date: t,
      list: seededShuffle(CHALLENGE_POOL, seed).slice(0,3).map(c=>({...c, done:0})),
      claimed: false
    };
    s.counters = {};                 // reset trackers daily
    this.store.save();
  }
  bumpChallenge(track, amount){
    const s = this.s;
    if(!track) return;
    s.counters[track] = (s.counters[track]||0) + amount;
    let allDone = true, newlyDone = null;
    s.challenges.list.forEach(c=>{
      const was = c.done >= c.goal;
      c.done = Math.min(c.goal, s.counters[c.track]||0);
      if(!was && c.done >= c.goal) newlyDone = c;
      if(c.done < c.goal) allDone = false;
    });
    if(newlyDone) HUD.toast('✅ Challenge done: '+newlyDone.text);
    if(allDone && !s.challenges.claimed){
      s.challenges.claimed = true;
      s.stars += 30;
      this.store.today().stars += 30;
      HUD.toast('🎁 All daily challenges! +30 stars');
      if(window.burstConfetti) burstConfetti();
    }
    this.store.save();
  }

  /* --- analytics for the parent dashboard --- */
  stats(){
    const s = this.s, d = this.store.today();
    const skillNames = {math:'Maths', letters:'Letters', counting:'Counting', shapes:'Shapes & Colors',
                        animals:'Animals', memory:'Memory', patterns:'Patterns', puzzle:'Puzzles', general:'Play'};
    const entries = Object.entries(s.skills).sort((a,b)=>b[1]-a[1]);
    const week = [];
    for(let i=6;i>=0;i--){
      const k = new Date(Date.now()-i*864e5).toISOString().slice(0,10);
      const day = s.days[k] || {secs:0,stars:0,games:0,correct:0,wrong:0};
      week.push({date:k, label:new Date(k).toLocaleDateString(undefined,{weekday:'short'}), ...day});
    }
    const accuracy = (s.totalCorrect+s.totalWrong) ? Math.round(s.totalCorrect/(s.totalCorrect+s.totalWrong)*100) : 0;
    return {
      todaySecs:d.secs, todayGames:d.games, todayStars:d.stars,
      stars:s.stars, xp:s.xp, level:s.level, streak:s.streak, accuracy,
      strongest: entries.length ? (skillNames[entries[0][0]]||entries[0][0]) : '—',
      weakest:   entries.length>1 ? (skillNames[entries[entries.length-1][0]]||entries[entries.length-1][0]) : '—',
      week, skills:entries.map(([k,v])=>({key:k, name:skillNames[k]||k, value:v})),
      achievements: ACHIEVEMENTS.map(a=>({...a, got:s.achievements.includes(a.id)})),
      stickers: s.stickers.slice()
    };
  }

  reset(){
    if(!confirm('Reset ALL progress? This cannot be undone.')) return;
    localStorage.removeItem('vp.state');
    location.reload();
  }
}

/* =============================================================
   HUD — the star/XP bar shown on every game page
   ============================================================= */
const HUD = {
  el:null,
  mount(){
    if(this.el || document.body.dataset.noHud) return;
    const wrap = document.createElement('div');
    wrap.id = 'vpHud';
    wrap.innerHTML =
      '<a class="vp-hud-home" href="index.html" aria-label="Home">🏠</a>'+
      '<span class="vp-hud-chip" id="vpStars">⭐ 0</span>'+
      '<span class="vp-hud-chip" id="vpLvl">Lv 1</span>'+
      '<span class="vp-hud-bar"><i id="vpXp"></i></span>';
    document.body.appendChild(wrap);
    const t = document.createElement('div'); t.id='vpToasts'; document.body.appendChild(t);
    this.el = wrap;
    this.refresh();
  },
  refresh(){
    if(!this.el) return;
    const p = window.VP, i = p.levelInfo();
    const st = document.getElementById('vpStars'), lv = document.getElementById('vpLvl'), xp = document.getElementById('vpXp');
    if(st) st.textContent = '⭐ ' + p.s.stars;
    if(lv) lv.textContent = 'Lv ' + i.cur.n;
    if(xp) xp.style.width = i.pct + '%';
  },
  toast(text){
    const box = document.getElementById('vpToasts');
    if(!box) return;
    const t = document.createElement('div');
    t.className = 'vp-toast'; t.textContent = text;
    box.appendChild(t);
    setTimeout(()=>{ t.classList.add('out'); setTimeout(()=>t.remove(), 400); }, 2200);
  },
  badge(a){
    const box = document.getElementById('vpToasts');
    if(!box) return;
    const t = document.createElement('div');
    t.className = 'vp-toast vp-badge-toast';
    t.innerHTML = '<span class="bi">'+a.icon+'</span><span><b>Achievement!</b><br>'+a.name+'</span>';
    box.appendChild(t);
    if(window.playSfx) playSfx('star');
    if(window.burstConfetti) burstConfetti();
    setTimeout(()=>{ t.classList.add('out'); setTimeout(()=>t.remove(), 400); }, 3600);
  }
};

/* =============================================================
   Celebrate — full-screen celebration with mascot + sticker
   ============================================================= */
const Celebrate = {
  show(title, sticker, emoji){
    const ov = document.createElement('div');
    ov.className = 'vp-celebrate';
    ov.innerHTML =
      '<div class="vp-cel-box">'+
        '<div class="vp-mascot">'+(emoji||'🦊')+'</div>'+
        '<h2>'+title+'</h2>'+
        (sticker ? '<p class="vp-cel-sub">You unlocked a sticker!</p><div class="vp-sticker-pop">'+sticker.emoji+'</div><p class="vp-cel-pack">'+sticker.pack+' pack</p>' : '')+
        '<button class="vp-cel-btn">Keep Playing! ▶</button>'+
      '</div>';
    document.body.appendChild(ov);
    if(window.burstConfetti) burstConfetti();
    if(window.playSfx) playSfx('star');
    const close = ()=>ov.remove();
    ov.querySelector('.vp-cel-btn').onclick = close;
    ov.onclick = e=>{ if(e.target===ov) close(); };
    setTimeout(close, 7000);
  }
};

/* =============================================================
   Styles — injected once, keeps games' own CSS untouched
   ============================================================= */
function injectStyles(){
  const css = `
  #vpHud{position:fixed;top:0;left:0;right:0;display:flex;align-items:center;gap:8px;padding:8px 12px;
    background:rgba(255,255,255,.92);backdrop-filter:blur(6px);box-shadow:0 2px 10px rgba(0,0,0,.12);z-index:900;
    font-family:'Comic Sans MS','Chalkboard SE',cursive,sans-serif}
  #vpHud .vp-hud-home{font-size:1.4rem;text-decoration:none;min-width:40px;text-align:center;line-height:1}
  #vpHud .vp-hud-chip{background:#f3e8ff;color:#6b21a8;font-weight:bold;border-radius:12px;padding:6px 12px;font-size:1rem;white-space:nowrap}
  #vpHud .vp-hud-bar{flex:1;height:14px;background:#e9d5ff;border-radius:99px;overflow:hidden;min-width:60px}
  #vpHud .vp-hud-bar i{display:block;height:100%;width:0;border-radius:99px;
    background:linear-gradient(90deg,#facc15,#f97316,#ec4899);transition:width .6s cubic-bezier(.2,.8,.2,1)}
  body.vp-has-hud{padding-top:56px !important}
  #vpToasts{position:fixed;top:64px;right:12px;z-index:950;display:flex;flex-direction:column;gap:8px;align-items:flex-end;pointer-events:none}
  .vp-toast{background:#fff;color:#6b21a8;font-family:'Comic Sans MS',cursive,sans-serif;font-weight:bold;
    padding:10px 16px;border-radius:16px;box-shadow:0 6px 18px rgba(0,0,0,.18);animation:vpIn .35s cubic-bezier(.2,1.4,.4,1);max-width:78vw}
  .vp-toast.out{animation:vpOut .4s forwards}
  .vp-badge-toast{display:flex;gap:10px;align-items:center;background:linear-gradient(135deg,#fef3c7,#fde68a)}
  .vp-badge-toast .bi{font-size:2rem}
  @keyframes vpIn{from{transform:translateX(40px) scale(.8);opacity:0}to{transform:none;opacity:1}}
  @keyframes vpOut{to{transform:translateX(40px);opacity:0}}
  .vp-celebrate{position:fixed;inset:0;background:rgba(88,28,135,.55);display:flex;align-items:center;justify-content:center;z-index:960;
    animation:vpFade .3s;font-family:'Comic Sans MS',cursive,sans-serif;padding:16px}
  @keyframes vpFade{from{opacity:0}to{opacity:1}}
  .vp-cel-box{background:#fff;border-radius:32px;padding:28px 32px;text-align:center;max-width:360px;width:100%;
    box-shadow:0 20px 60px rgba(0,0,0,.35);animation:vpPop .45s cubic-bezier(.2,1.5,.4,1)}
  @keyframes vpPop{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}
  .vp-mascot{font-size:4.5rem;animation:vpBounce 1s infinite alternate}
  @keyframes vpBounce{from{transform:translateY(0) rotate(-4deg)}to{transform:translateY(-14px) rotate(4deg)}}
  .vp-cel-box h2{color:#7c3aed;font-size:1.6rem;margin:6px 0 4px}
  .vp-cel-sub{color:#9333ea;font-size:1rem}
  .vp-sticker-pop{font-size:4rem;animation:vpSpin .8s cubic-bezier(.2,1.5,.4,1)}
  @keyframes vpSpin{from{transform:scale(0) rotate(-180deg)}to{transform:scale(1) rotate(0)}}
  .vp-cel-pack{color:#a855f7;font-size:.9rem;margin-bottom:8px}
  .vp-cel-btn{margin-top:14px;width:100%;font-family:inherit;font-size:1.2rem;font-weight:bold;padding:14px;border:none;
    border-radius:18px;background:#7c3aed;color:#fff;cursor:pointer;box-shadow:0 5px 0 #5b21b6}
  .vp-cel-btn:active{transform:translateY(3px);box-shadow:none}
  @media(max-width:480px){#vpHud .vp-hud-chip{font-size:.85rem;padding:5px 9px}}
  `;
  const st = document.createElement('style');
  st.id='vpCoreStyles'; st.textContent = css;
  document.head.appendChild(st);
}

/* ---------- Boot ---------- */
injectStyles();
window.VP = new Progress();
window.VPData = {LEVELS, ACHIEVEMENTS, STICKER_PACKS, ALL_STICKERS, XP_BY_DIFFICULTY};
window.VPHud = HUD;
window.VPCelebrate = Celebrate;

function boot(){
  if(!document.body.dataset.noHud){
    document.body.classList.add('vp-has-hud');
    HUD.mount();
  }
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
})();
