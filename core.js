/* =============================================================
   core.js — progression engine + shared Quiz component
   Load order:  common.js → data.js → core.js → page script
   Public API:  window.VP, window.Quiz, window.Mascot, window.VPData
   All state lives in one localStorage key: "vp.state"
   ============================================================= */
(function(){
'use strict';

const C = window.VPContent || {};
const STICKER_PACKS = C.STICKER_PACKS || {};
const WORLDS = C.WORLDS || [];
const LESSONS = C.LESSONS || {};

/* ---------- Level ladder ---------- */
const LEVELS = [
  {n:1, name:'Little Explorer', xp:0,    skills:['Numbers 1-5','Match colors','Count objects']},
  {n:2, name:'Bright Spark',    xp:150,  skills:['Numbers 1-10','Easy addition','Shapes']},
  {n:3, name:'Clever Cub',      xp:400,  skills:['Numbers 1-20','Addition','Memory']},
  {n:4, name:'Smart Star',      xp:800,  skills:['Addition & subtraction','Alphabet','Patterns']},
  {n:5, name:'Super Genius',    xp:1400, skills:['Word building','Skip counting','Logic']}
];

const XP_BY_DIFFICULTY = {easy:10, medium:20, hard:40};
const STARS_CORRECT = 5, STARS_PERFECT = 20, STARS_COMBO = 10, COMBO_AT = 5;

const PRAISE = ['Amazing!','Fantastic!','You are awesome!','Great thinking!','Excellent!',
  'You are getting better!','Keep going!','Wow!','Fantastic job!','Brilliant!','Superb!','Well done!','Perfect!'];
const ENCOURAGE = ['Nearly there — try again!','Good try! Have another go.','Almost! You can do it.',
  'Not quite — look again.','Keep trying, you are learning!'];

const ACHIEVEMENTS = [
  {id:'first',    icon:'🌟', name:'First Lesson',   desc:'Play your first game',      test:s=>s.totalCorrect>=1},
  {id:'stars100', icon:'⭐', name:'100 Stars',      desc:'Earn 100 stars',            test:s=>s.stars>=100},
  {id:'stars500', icon:'✨', name:'500 Stars',      desc:'Earn 500 stars',            test:s=>s.stars>=500},
  {id:'stars1k',  icon:'💫', name:'1000 Stars',     desc:'Earn 1000 stars',           test:s=>s.stars>=1000},
  {id:'math',     icon:'🧮', name:'Math Master',    desc:'50 correct maths answers',  test:s=>(s.skills.math||0)>=50},
  {id:'alphabet', icon:'📚', name:'Alphabet Hero',  desc:'50 correct letters',        test:s=>(s.skills.letters||0)>=50},
  {id:'puzzle',   icon:'🧩', name:'Puzzle Genius',  desc:'25 puzzles solved',         test:s=>((s.skills.logic||0)+(s.skills.memory||0)+(s.skills.patterns||0))>=25},
  {id:'artist',   icon:'🎨', name:'Artist',         desc:'Save a drawing',            test:s=>(s.skills.art||0)>=1},
  {id:'explorer', icon:'🚀', name:'Explorer',       desc:'Unlock 3 worlds',           test:s=>s.worldsUnlocked>=3},
  {id:'science',  icon:'🔬', name:'Nature Nerd',    desc:'40 science answers',        test:s=>(s.skills.science||0)>=40},
  {id:'streak7',  icon:'🔥', name:'7 Day Streak',   desc:'Play 7 days in a row',      test:s=>s.streak>=7},
  {id:'combo10',  icon:'💥', name:'Combo King',     desc:'10 correct in a row',       test:s=>s.bestCombo>=10},
  {id:'lvl3',     icon:'🏅', name:'Level 3',        desc:'Reach level 3',             test:s=>s.level>=3},
  {id:'lvl5',     icon:'👑', name:'Super Genius',   desc:'Reach level 5',             test:s=>s.level>=5},
  {id:'world',    icon:'🏆', name:'World Complete', desc:'Finish every lesson in a world', test:s=>s.worldComplete>=1}
];

const CHALLENGE_POOL = [
  {id:'add5',   icon:'➕', text:'Solve 5 addition questions', goal:5,  track:'add'},
  {id:'sub3',   icon:'➖', text:'Solve 3 take-away questions', goal:3, track:'sub'},
  {id:'let10',  icon:'🔤', text:'Match 10 letters',           goal:10, track:'letters'},
  {id:'anim5',  icon:'🦁', text:'Learn 5 animals',            goal:5,  track:'science'},
  {id:'count6', icon:'🔢', text:'Count 6 times correctly',    goal:6,  track:'counting'},
  {id:'shape6', icon:'🔺', text:'Find 6 shapes',              goal:6,  track:'shapes'},
  {id:'mem1',   icon:'🧠', text:'Finish one memory game',     goal:1,  track:'memoryWin'},
  {id:'pat5',   icon:'🔁', text:'Solve 5 patterns',           goal:5,  track:'patterns'},
  {id:'logic5', icon:'🧩', text:'Solve 5 puzzles',            goal:5,  track:'logic'},
  {id:'star50', icon:'⭐', text:'Earn 50 stars today',        goal:50, track:'starsToday'}
];

const ALL_STICKERS = Object.entries(STICKER_PACKS).flatMap(([pack,l])=>l.map(emoji=>({pack,emoji})));

/* ---------- helpers ---------- */
const todayKey = () => new Date().toISOString().slice(0,10);
const pick = a => a[Math.floor(Math.random()*a.length)];
const shuffle = a => a.slice().sort(()=>Math.random()-.5);
function seededShuffle(arr, seed){
  const a = arr.slice(); let s = seed;
  for(let i=a.length-1;i>0;i--){ s=(s*9301+49297)%233280; const j=Math.floor((s/233280)*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}
const reduceMotion = () => {
  try{ if(localStorage.getItem('vp.reduceMotion')==='1') return true; }catch(e){}
  return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/* =============================================================
   Store
   ============================================================= */
class Store {
  constructor(){ this.state = this.load(); this.migrate(); }
  defaults(){
    return {
      xp:0, stars:0, level:1, totalCorrect:0, totalWrong:0, bestCombo:0, longestStreak:0,
      skills:{}, recent:{},            // recent[skill] = [1,0,1,...] last 8 answers, for adaptive difficulty
      achievements:[], stickers:[], lessons:{},   // lessons["forest/add"] = times completed
      streak:0, lastPlayed:null, days:{},
      challenges:{date:null, list:[], claimed:false}, counters:{},
      settings:{sound:true, reduceMotion:false, highContrast:false}
    };
  }
  load(){
    try{ const r = localStorage.getItem('vp.state'); return r ? Object.assign(this.defaults(), JSON.parse(r)) : this.defaults(); }
    catch(e){ return this.defaults(); }
  }
  save(){ try{ localStorage.setItem('vp.state', JSON.stringify(this.state)); }catch(e){} }
  migrate(){
    const s = this.state;
    ['skills','days','counters','settings','recent','lessons'].forEach(k=>{ if(!s[k]||typeof s[k]!=='object') s[k]={}; });
    ['achievements','stickers'].forEach(k=>{ if(!Array.isArray(s[k])) s[k]=[]; });
    if(!s.challenges||typeof s.challenges!=='object') s.challenges={date:null,list:[],claimed:false};
    if(typeof s.longestStreak!=='number') s.longestStreak = s.streak||0;
  }
  today(){
    const k = todayKey();
    if(!this.state.days[k]) this.state.days[k] = {secs:0, stars:0, games:0, correct:0, wrong:0};
    return this.state.days[k];
  }
}

/* =============================================================
   Progress
   ============================================================= */
class Progress {
  constructor(){
    this.store = new Store();
    this.combo = 0;
    this.touchStreak();
    this.rollChallenges();
    this.trackTime();
  }
  get s(){ return this.store.state; }

  touchStreak(){
    const s = this.s, t = todayKey();
    if(s.lastPlayed === t) return;
    const y = new Date(Date.now()-864e5).toISOString().slice(0,10);
    s.streak = (s.lastPlayed === y) ? (s.streak||0)+1 : 1;
    if(s.streak > (s.longestStreak||0)) s.longestStreak = s.streak;
    s.lastPlayed = t;
    this.store.save();
  }
  trackTime(){
    setInterval(()=>{ if(!document.hidden){ this.store.today().secs += 15; this.store.save(); } }, 15000);
  }

  /* --- levels --- */
  levelInfo(){
    const s = this.s;
    let cur = LEVELS[0];
    for(const L of LEVELS) if(s.xp >= L.xp) cur = L;
    const next = LEVELS.find(L=>L.xp > s.xp) || null;
    const base = cur.xp, span = next ? next.xp-base : 1;
    return {cur, next, pct: next ? Math.min(100, Math.round(((s.xp-base)/span)*100)) : 100,
            xpNeeded: next ? next.xp - s.xp : 0};
  }
  unlockedLevel(){ return this.levelInfo().cur.n; }

  /* --- worlds --- */
  worlds(){
    return WORLDS.map(w=>{
      const lessons = LESSONS[w.id] || [];
      const done = lessons.filter(l=>this.lessonDone(w.id, l)).length;
      return {...w, unlocked: this.s.stars >= w.stars, lessons, done,
              pct: lessons.length ? Math.round(done/lessons.length*100) : 0};
    });
  }
  lessonKey(worldId, l){ return worldId + '/' + l.href.replace('.html','') + ':' + l.mode; }
  lessonDone(worldId, l){ return (this.s.lessons[this.lessonKey(worldId,l)]||0) > 0; }
  markLesson(worldId, l){
    const k = this.lessonKey(worldId, l);
    this.s.lessons[k] = (this.s.lessons[k]||0) + 1;
    this.store.save();
  }
  /** Records the world+lesson the child is currently inside (set by world.html links). */
  currentLesson(){
    try{ return JSON.parse(sessionStorage.getItem('vp.lesson')||'null'); }catch(e){ return null; }
  }

  /* --- adaptive difficulty: 0=gentle, 1=normal, 2=stretch --- */
  adaptive(skill){
    const r = this.s.recent[skill] || [];
    if(r.length < 4) return 1;
    const acc = r.reduce((a,b)=>a+b,0) / r.length;
    if(acc >= 0.85) return 2;
    if(acc <= 0.5)  return 0;
    return 1;
  }
  noteAnswer(skill, ok){
    const r = this.s.recent[skill] || (this.s.recent[skill] = []);
    r.push(ok ? 1 : 0);
    if(r.length > 8) r.shift();
  }
  /** True when the child is struggling — pages should show hints / visual aids. */
  needsHelp(skill){ return this.adaptive(skill) === 0; }

  /* --- scoring --- */
  correct(opts){
    opts = opts || {};
    const diff = opts.difficulty || 'easy';
    const skill = opts.skill || 'general';
    const s = this.s;
    const xp = XP_BY_DIFFICULTY[diff] || 10;
    let stars = STARS_CORRECT;

    this.combo++;
    if(this.combo > (s.bestCombo||0)) s.bestCombo = this.combo;
    let comboMsg = null;
    if(this.combo % COMBO_AT === 0){ stars += STARS_COMBO; comboMsg = '🔥 ' + this.combo + ' in a row! +' + STARS_COMBO + ' stars'; }

    const before = s.level;
    s.xp += xp; s.stars += stars; s.totalCorrect++;
    s.skills[skill] = (s.skills[skill]||0) + 1;
    this.noteAnswer(skill, true);
    const d = this.store.today(); d.correct++; d.stars += stars;

    this.bumpChallenge(opts.track || skill, 1);
    this.bumpChallenge('starsToday', stars);
    s.level = this.levelInfo().cur.n;
    this.store.save();

    HUD.refresh();
    HUD.toast('⭐ +' + stars + '   ✨ +' + xp + ' XP');
    if(comboMsg) HUD.toast(comboMsg);
    if(s.level > before) this.levelUp(s.level);
    this.checkAchievements();
    return {xp, stars, combo:this.combo};
  }
  wrong(opts){
    opts = opts || {};
    this.combo = 0;
    this.s.totalWrong++;
    this.noteAnswer(opts.skill || 'general', false);
    this.store.today().wrong++;
    this.store.save();
  }
  praise(){ return pick(PRAISE); }
  encourage(){ return pick(ENCOURAGE); }

  finishRound(opts){
    opts = opts || {};
    const s = this.s;
    this.store.today().games++;
    if(opts.perfect){
      s.stars += STARS_PERFECT;
      this.store.today().stars += STARS_PERFECT;
      this.bumpChallenge('starsToday', STARS_PERFECT);
      HUD.toast('🏆 Perfect round! +' + STARS_PERFECT + ' stars');
    }
    if(opts.track) this.bumpChallenge(opts.track, 1);

    const lesson = this.currentLesson();
    if(lesson) this.markLesson(lesson.world, lesson.lesson);
    this.store.save();
    HUD.refresh();
    this.checkAchievements();
    const st = this.awardSticker();
    Celebrate.show(opts.title || (this.praise() + ' 🎉'), st);
    return st;
  }

  awardSticker(){
    const owned = new Set(this.s.stickers);
    const locked = ALL_STICKERS.filter(x=>!owned.has(x.pack + ':' + x.emoji));
    if(!locked.length) return null;
    const got = pick(locked);
    this.s.stickers.push(got.pack + ':' + got.emoji);
    this.store.save();
    return got;
  }

  checkAchievements(){
    const s = this.s;
    const worlds = this.worlds();
    s.worldsUnlocked = worlds.filter(w=>w.unlocked).length;
    s.worldComplete  = worlds.filter(w=>w.lessons.length && w.done === w.lessons.length).length;
    ACHIEVEMENTS.forEach(a=>{
      if(s.achievements.includes(a.id)) return;
      let ok = false; try{ ok = a.test(s); }catch(e){}
      if(ok){ s.achievements.push(a.id); this.store.save(); HUD.badge(a); }
    });
  }
  levelUp(n){
    const L = LEVELS.find(x=>x.n===n) || LEVELS[0];
    if(window.burstConfetti && !reduceMotion()) burstConfetti();
    if(window.playSfx) playSfx('star');
    if(window.say) say('Level up! You are now level ' + n + ', ' + L.name + '! ' + this.praise());
    Celebrate.show('LEVEL ' + n + '! ' + L.name, null, '🎉');
  }

  rollChallenges(){
    const s = this.s, t = todayKey();
    if(s.challenges.date === t && s.challenges.list.length) return;
    const seed = parseInt(t.replace(/-/g,''),10) % 233280;
    s.challenges = {date:t, list: seededShuffle(CHALLENGE_POOL, seed).slice(0,3).map(c=>({...c, done:0})), claimed:false};
    s.counters = {};
    this.store.save();
  }
  bumpChallenge(track, amount){
    const s = this.s;
    if(!track) return;
    s.counters[track] = (s.counters[track]||0) + amount;
    let all = true, justDone = null;
    s.challenges.list.forEach(c=>{
      const was = c.done >= c.goal;
      c.done = Math.min(c.goal, s.counters[c.track]||0);
      if(!was && c.done >= c.goal) justDone = c;
      if(c.done < c.goal) all = false;
    });
    if(justDone) HUD.toast('✅ ' + justDone.text);
    if(all && !s.challenges.claimed){
      s.challenges.claimed = true;
      s.stars += 30; this.store.today().stars += 30;
      HUD.toast('🎁 All missions done! +30 stars');
      if(window.burstConfetti && !reduceMotion()) burstConfetti();
    }
    this.store.save();
  }

  stats(){
    const s = this.s, d = this.store.today();
    const NAMES = {math:'Maths', letters:'Letters & Words', counting:'Counting', shapes:'Shapes & Colors',
      science:'Science & Nature', memory:'Memory', patterns:'Patterns', logic:'Logic & Puzzles', art:'Creativity', general:'Play'};
    const entries = Object.entries(s.skills).sort((a,b)=>b[1]-a[1]);
    const week = [];
    for(let i=6;i>=0;i--){
      const k = new Date(Date.now()-i*864e5).toISOString().slice(0,10);
      const day = s.days[k] || {secs:0,stars:0,games:0,correct:0,wrong:0};
      week.push({date:k, label:new Date(k).toLocaleDateString(undefined,{weekday:'short'}), ...day});
    }
    // weak areas = skills practised with rolling accuracy under 60%
    const weak = Object.entries(s.recent)
      .filter(([,r])=>r.length>=4 && (r.reduce((a,b)=>a+b,0)/r.length) < .6)
      .map(([k])=>NAMES[k]||k);
    const total = s.totalCorrect + s.totalWrong;
    return {
      todaySecs:d.secs, todayGames:d.games, todayStars:d.stars,
      stars:s.stars, xp:s.xp, level:s.level, streak:s.streak, longestStreak:s.longestStreak||s.streak,
      accuracy: total ? Math.round(s.totalCorrect/total*100) : 0,
      strongest: entries.length ? (NAMES[entries[0][0]]||entries[0][0]) : '—',
      weakest: weak.length ? weak.join(', ') : (entries.length>1 ? (NAMES[entries[entries.length-1][0]]||entries[entries.length-1][0]) : '—'),
      week, skills: entries.map(([k,v])=>({key:k, name:NAMES[k]||k, value:v})),
      achievements: ACHIEVEMENTS.map(a=>({...a, got:s.achievements.includes(a.id)})),
      stickers: s.stickers.slice(),
      worlds: this.worlds(),
      lessonsDone: Object.keys(s.lessons).length
    };
  }
  reset(){
    if(!confirm('Reset ALL progress? This cannot be undone.')) return;
    localStorage.removeItem('vp.state');
    location.reload();
  }
  setSetting(k, v){ this.s.settings[k] = v; this.store.save(); applySettings(); }
}

/* =============================================================
   Quiz — the shared multiple-choice engine every subject uses.
   A page supplies only a generator: () => {prompt, speak, answer,
   choices, visual?, hint?, difficulty?}
   ============================================================= */
class Quiz {
  constructor(cfg){
    this.gen = cfg.generate;          // required
    this.skill = cfg.skill || 'general';
    this.track = cfg.track || this.skill;
    this.round = cfg.round || 5;
    this.mount = cfg.mount || document.getElementById('quiz');
    this.onRound = cfg.onRound || null;
    this.i = 0; this.results = [];
    this.render = this.render.bind(this);
    this.mount.innerHTML =
      '<div class="q-prompt" id="qPrompt"></div>' +
      '<div class="q-visual" id="qVisual"></div>' +
      '<div class="q-choices" id="qChoices"></div>' +
      '<div class="q-hint" id="qHint"></div>' +
      '<div class="q-msg" id="qMsg"></div>' +
      '<div class="q-dots" id="qDots"></div>';
    this.render();
  }
  dots(){
    document.getElementById('qDots').innerHTML =
      Array.from({length:this.round}, (_,i)=>{
        const r = this.results[i];
        return '<span class="' + (r===true?'hit':r===false?'miss':'') + '"></span>';
      }).join('');
  }
  render(){
    if(this.i >= this.round){
      const perfect = this.results.every(r=>r===true);
      VP.finishRound({perfect, track:this.track,
        title: perfect ? 'PERFECT ROUND! 🏆' : VP.praise() + ' 🎉'});
      this.i = 0; this.results = [];
      if(this.onRound) this.onRound();
      setTimeout(this.render, 900);
      return;
    }
    const q = this.q = this.gen(VP.adaptive(this.skill));
    document.getElementById('qPrompt').innerHTML = q.prompt;
    document.getElementById('qVisual').innerHTML = q.visual || '';
    document.getElementById('qMsg').textContent = '';
    // a struggling child gets the hint straight away, otherwise after a wrong try
    const hintBox = document.getElementById('qHint');
    hintBox.textContent = (q.hint && VP.needsHelp(this.skill)) ? '💡 ' + q.hint : '';
    this.dots();
    if(q.speak !== false) say(q.speak || q.prompt.replace(/<[^>]+>/g,' '));
    const box = document.getElementById('qChoices');
    box.innerHTML = '';
    q.choices.forEach(c=>{
      const b = document.createElement('button');
      b.className = 'q-btn' + (String(c).length > 3 ? ' wide' : '');
      b.innerHTML = c;
      b.setAttribute('aria-label', String(c).replace(/<[^>]+>/g,''));
      b.onclick = () => this.answer(c, b, q);
      box.appendChild(b);
    });
  }
  answer(val, btn, q){
    const right = String(val) === String(q.answer);
    if(right){
      btn.classList.add('right');
      [...btn.parentNode.children].forEach(b=>b.disabled = true);
      playSfx('correct');
      this.results[this.i] = this.results[this.i] !== false;
      VP.correct({difficulty:q.difficulty || 'medium', skill:this.skill, track:this.track});
      const p = VP.praise();
      document.getElementById('qMsg').textContent = '🎉 ' + p;
      say(p + ' ' + (q.answerSpeak || ''));
      this.i++;
      this.dots();
      setTimeout(this.render, 1500);
    }else{
      btn.classList.add('wrong'); btn.disabled = true;
      playSfx('wrong');
      this.results[this.i] = false;
      VP.wrong({skill:this.skill});
      const e = VP.encourage();
      document.getElementById('qMsg').textContent = e;
      if(q.hint) document.getElementById('qHint').textContent = '💡 ' + q.hint;
      say(e);
      Mascot.cheer();
    }
  }
}

/* =============================================================
   Mascot — Foxy the guide
   ============================================================= */
const Mascot = {
  el:null,
  mount(){
    if(this.el || document.body.dataset.noMascot) return;
    const m = document.createElement('button');
    m.id = 'vpMascot'; m.setAttribute('aria-label','Foxy the helper');
    m.innerHTML = '<span class="mface">🦊</span><span class="mbub" id="mbub"></span>';
    m.onclick = () => this.say(window.VP.praise() + " I'm Foxy. Tap a game and let's learn!");
    document.body.appendChild(m);
    this.el = m;
  },
  say(text, ms){
    if(!this.el) return;
    const b = document.getElementById('mbub');
    b.textContent = text; b.classList.add('show');
    this.el.classList.add('hop');
    if(window.say) window.say(text);
    clearTimeout(this._t);
    this._t = setTimeout(()=>{ b.classList.remove('show'); this.el.classList.remove('hop'); }, ms || 4200);
  },
  cheer(){
    if(!this.el) return;
    this.el.classList.add('hop');
    setTimeout(()=>this.el.classList.remove('hop'), 700);
  }
};

/* =============================================================
   HUD + Celebrate
   ============================================================= */
const HUD = {
  el:null,
  mount(){
    if(this.el || document.body.dataset.noHud) return;
    const w = document.createElement('div');
    w.id = 'vpHud';
    w.innerHTML =
      '<a class="vp-hud-home" href="index.html" aria-label="Back to the map">🗺️</a>' +
      '<span class="vp-hud-chip" id="vpStars">⭐ 0</span>' +
      '<span class="vp-hud-chip" id="vpLvl">Lv 1</span>' +
      '<span class="vp-hud-bar"><i id="vpXp"></i></span>';
    document.body.appendChild(w);
    const t = document.createElement('div'); t.id='vpToasts'; document.body.appendChild(t);
    this.el = w; this.refresh();
  },
  refresh(){
    if(!this.el) return;
    if(!window.VP) return;
    const i = window.VP.levelInfo();
    const st = document.getElementById('vpStars'), lv = document.getElementById('vpLvl'), xp = document.getElementById('vpXp');
    if(st) st.textContent = '⭐ ' + window.VP.s.stars;
    if(lv) lv.textContent = 'Lv ' + i.cur.n;
    if(xp) xp.style.width = i.pct + '%';
  },
  toast(text){
    const box = document.getElementById('vpToasts'); if(!box) return;
    const t = document.createElement('div'); t.className='vp-toast'; t.textContent=text;
    box.appendChild(t);
    setTimeout(()=>{ t.classList.add('out'); setTimeout(()=>t.remove(),400); }, 2200);
  },
  badge(a){
    const box = document.getElementById('vpToasts'); if(!box) return;
    const t = document.createElement('div'); t.className='vp-toast vp-badge-toast';
    t.innerHTML = '<span class="bi">'+a.icon+'</span><span><b>Achievement!</b><br>'+a.name+'</span>';
    box.appendChild(t);
    if(window.playSfx) playSfx('star');
    if(window.burstConfetti && !reduceMotion()) burstConfetti();
    setTimeout(()=>{ t.classList.add('out'); setTimeout(()=>t.remove(),400); }, 3600);
  }
};

const Celebrate = {
  show(title, sticker, emoji){
    const ov = document.createElement('div');
    ov.className = 'vp-celebrate';
    ov.innerHTML =
      '<div class="vp-cel-box">' +
        '<div class="vp-mascot">' + (emoji || '🦊') + '</div>' +
        '<h2>' + title + '</h2>' +
        (sticker ? '<p class="vp-cel-sub">You unlocked a sticker!</p><div class="vp-sticker-pop">' + sticker.emoji +
                   '</div><p class="vp-cel-pack">' + sticker.pack + ' pack</p>' : '') +
        '<button class="vp-cel-btn">Keep Playing! ▶</button>' +
      '</div>';
    document.body.appendChild(ov);
    if(window.burstConfetti && !reduceMotion()) burstConfetti();
    if(window.playSfx) playSfx('star');
    const close = () => ov.remove();
    ov.querySelector('.vp-cel-btn').onclick = close;
    ov.onclick = e => { if(e.target === ov) close(); };
    setTimeout(close, 7000);
  }
};

/* =============================================================
   Settings + styles
   ============================================================= */
function applySettings(){
  const st = (window.VP && window.VP.s.settings) || {};
  document.documentElement.classList.toggle('vp-reduce', !!st.reduceMotion || reduceMotion());
  document.documentElement.classList.toggle('vp-contrast', !!st.highContrast);
  try{ localStorage.setItem('vp.reduceMotion', st.reduceMotion ? '1' : '0'); }catch(e){}
}

function injectStyles(){
  const css = `
  :root{--vp-font:'Comic Sans MS','Chalkboard SE',cursive,sans-serif}
  html.vp-reduce *,html.vp-reduce *::before,html.vp-reduce *::after{animation-duration:.01ms !important;animation-iteration-count:1 !important;transition-duration:.01ms !important}
  html.vp-contrast body{filter:contrast(1.35) saturate(1.25)}
  #vpHud{position:fixed;top:0;left:0;right:0;display:flex;align-items:center;gap:8px;padding:8px 12px;
    background:rgba(255,255,255,.94);backdrop-filter:blur(6px);box-shadow:0 2px 10px rgba(0,0,0,.12);z-index:900;font-family:var(--vp-font)}
  #vpHud .vp-hud-home{font-size:1.4rem;text-decoration:none;min-width:40px;text-align:center;line-height:1}
  #vpHud .vp-hud-chip{background:#f3e8ff;color:#6b21a8;font-weight:bold;border-radius:12px;padding:6px 12px;font-size:1rem;white-space:nowrap}
  #vpHud .vp-hud-bar{flex:1;height:14px;background:#e9d5ff;border-radius:99px;overflow:hidden;min-width:50px}
  #vpHud .vp-hud-bar i{display:block;height:100%;width:0;border-radius:99px;background:linear-gradient(90deg,#facc15,#f97316,#ec4899);transition:width .6s cubic-bezier(.2,.8,.2,1)}
  body.vp-has-hud{padding-top:56px !important}
  #vpToasts{position:fixed;top:64px;right:12px;z-index:950;display:flex;flex-direction:column;gap:8px;align-items:flex-end;pointer-events:none}
  .vp-toast{background:#fff;color:#6b21a8;font-family:var(--vp-font);font-weight:bold;padding:10px 16px;border-radius:16px;
    box-shadow:0 6px 18px rgba(0,0,0,.18);animation:vpIn .35s cubic-bezier(.2,1.4,.4,1);max-width:76vw}
  .vp-toast.out{animation:vpOut .4s forwards}
  .vp-badge-toast{display:flex;gap:10px;align-items:center;background:linear-gradient(135deg,#fef3c7,#fde68a)}
  .vp-badge-toast .bi{font-size:2rem}
  @keyframes vpIn{from{transform:translateX(40px) scale(.8);opacity:0}to{transform:none;opacity:1}}
  @keyframes vpOut{to{transform:translateX(40px);opacity:0}}
  .vp-celebrate{position:fixed;inset:0;background:rgba(88,28,135,.55);display:flex;align-items:center;justify-content:center;z-index:960;
    animation:vpFade .3s;font-family:var(--vp-font);padding:16px}
  @keyframes vpFade{from{opacity:0}to{opacity:1}}
  .vp-cel-box{background:#fff;border-radius:32px;padding:26px 30px;text-align:center;max-width:360px;width:100%;
    box-shadow:0 20px 60px rgba(0,0,0,.35);animation:vpPop .45s cubic-bezier(.2,1.5,.4,1)}
  @keyframes vpPop{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}
  .vp-mascot{font-size:4.4rem;animation:vpBounce 1s infinite alternate}
  @keyframes vpBounce{from{transform:translateY(0) rotate(-4deg)}to{transform:translateY(-14px) rotate(4deg)}}
  .vp-cel-box h2{color:#7c3aed;font-size:1.5rem;margin:6px 0 4px}
  .vp-cel-sub{color:#9333ea;font-size:1rem}
  .vp-sticker-pop{font-size:4rem;animation:vpSpin .8s cubic-bezier(.2,1.5,.4,1)}
  @keyframes vpSpin{from{transform:scale(0) rotate(-180deg)}to{transform:scale(1) rotate(0)}}
  .vp-cel-pack{color:#a855f7;font-size:.9rem;margin-bottom:8px}
  .vp-cel-btn{margin-top:14px;width:100%;font-family:inherit;font-size:1.2rem;font-weight:bold;padding:14px;border:none;
    border-radius:18px;background:#7c3aed;color:#fff;cursor:pointer;box-shadow:0 5px 0 #5b21b6}
  .vp-cel-btn:active{transform:translateY(3px);box-shadow:none}
  /* ---- mascot ---- */
  #vpMascot{position:fixed;left:12px;bottom:12px;z-index:880;background:none;border:none;cursor:pointer;font-family:var(--vp-font);
    display:flex;align-items:flex-end;gap:8px;padding:0}
  #vpMascot .mface{font-size:3rem;filter:drop-shadow(0 4px 6px rgba(0,0,0,.25));display:block;transition:transform .3s}
  #vpMascot.hop .mface{animation:vpHop .55s ease}
  @keyframes vpHop{0%,100%{transform:translateY(0) rotate(0)}30%{transform:translateY(-16px) rotate(-8deg)}60%{transform:translateY(-6px) rotate(6deg)}}
  #vpMascot .mbub{max-width:min(58vw,260px);background:#fff;color:#6b21a8;font-weight:bold;font-size:.92rem;text-align:left;
    padding:0 0;border-radius:16px;box-shadow:0 6px 18px rgba(0,0,0,.18);opacity:0;transform:scale(.7);transform-origin:0 100%;
    transition:opacity .25s,transform .25s,padding .25s;overflow:hidden;max-height:0}
  #vpMascot .mbub.show{opacity:1;transform:scale(1);padding:10px 14px;max-height:200px;margin-bottom:6px}
  /* ---- shared Quiz component ---- */
  .q-wrap{background:rgba(255,255,255,.9);border-radius:28px;padding:20px 16px;max-width:660px;width:100%;
    text-align:center;box-shadow:0 8px 26px rgba(0,0,0,.12);font-family:var(--vp-font)}
  .q-prompt{font-size:clamp(1.3rem,5.5vw,2rem);font-weight:bold;color:#334155;margin-bottom:10px;line-height:1.35}
  .q-visual{font-size:clamp(2rem,9vw,3rem);line-height:1.45;margin-bottom:8px;word-break:break-word}
  .q-choices{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:8px}
  .q-btn{font-family:var(--vp-font);font-size:2rem;font-weight:bold;min-width:88px;min-height:88px;padding:8px 14px;border:none;
    border-radius:22px;background:#fff;color:#334155;box-shadow:0 6px 0 rgba(0,0,0,.15);cursor:pointer;transition:transform .12s}
  .q-btn.wide{font-size:1.4rem;min-width:120px}
  .q-btn:hover:not(:disabled){transform:translateY(-3px)}
  .q-btn:active:not(:disabled){transform:translateY(3px);box-shadow:none}
  .q-btn.right{background:#22c55e;color:#fff;animation:vpParty .5s}
  .q-btn.wrong{background:#fca5a5;animation:vpShake .4s}
  .q-btn:disabled{opacity:.5;cursor:default}
  @keyframes vpParty{50%{transform:scale(1.2) rotate(6deg)}}
  @keyframes vpShake{25%{transform:translateX(-7px)}75%{transform:translateX(7px)}}
  .q-hint{color:#0891b2;font-size:1rem;margin-top:10px;min-height:1.2rem;font-weight:bold}
  .q-msg{margin-top:6px;font-size:1.15rem;color:#7c3aed;font-weight:bold;min-height:1.6rem}
  .q-dots{display:flex;gap:6px;justify-content:center;margin-top:12px}
  .q-dots span{width:15px;height:15px;border-radius:50%;background:#e2e8f0;border:2px solid #cbd5e1;transition:background .3s}
  .q-dots span.hit{background:#22c55e;border-color:#16a34a}
  .q-dots span.miss{background:#fca5a5;border-color:#ef4444}
  @media(max-width:480px){#vpHud .vp-hud-chip{font-size:.85rem;padding:5px 9px}#vpMascot .mface{font-size:2.4rem}}
  `;
  const st = document.createElement('style'); st.id='vpCoreStyles'; st.textContent = css;
  document.head.appendChild(st);
}

/* ---------- boot ---------- */
injectStyles();
window.VP = new Progress();
window.Quiz = Quiz;
window.Mascot = Mascot;
window.VPHud = HUD;
window.VPCelebrate = Celebrate;
window.VPData = {LEVELS, ACHIEVEMENTS, STICKER_PACKS, ALL_STICKERS, XP_BY_DIFFICULTY, WORLDS, LESSONS};
applySettings();

function boot(){
  if(!document.body.dataset.noHud){ document.body.classList.add('vp-has-hud'); HUD.mount(); }
  Mascot.mount();
  applySettings();
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
})();
