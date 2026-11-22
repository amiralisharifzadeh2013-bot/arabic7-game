"use strict";
/* عربی‌یار v2 — منطق اصلی. بازی‌ها در games.js هستند. */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const KEY="aq_omega_state", MSG_KEY="aq_omega_msgs", HEART_MS=10*60*1000, XP_PER_LEVEL=120;
let DATA=null, ADMIN={admin_code:"59",retention_days:3}, state=null, VOCAB=[], flashCur=null, lessonTab="words";
const AVATARS=["🦉","🦊","🐯","🐼","🦁","🐸","🐧","🦄"];
const LEVEL_TITLES=["نوآموز","کنجکاو","واژه‌یاب","خوش‌خوان","قهرمان","استاد","افسانه"];

/* ---------- ابزارها ---------- */
const fa=n=>String(n).replace(/\d/g,d=>"۰۱۲۳۴۵۶۷۸۹"[d]);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const pick=(a,n)=>shuffle(a).slice(0,n);
const today=()=>new Date().toISOString().slice(0,10);
const stripAr=s=>String(s).replace(/[\u064B-\u065F\u0670\u0640]/g,"");
const norm=s=>stripAr(s).toLowerCase().replace(/[يى]/g,"ی").replace(/ك/g,"ک").replace(/[أإآٱ]/g,"ا").replace(/ة/g,"ه").replace(/[\u200c\s]+/g," ").trim();
const faDigits=s=>String(s).replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d));
const wait=ms=>new Promise(r=>setTimeout(r,ms));

/* ---------- حالت ---------- */
const seedState=()=>({logged:false,firstName:"",lastName:"",phone:"",avatar:"🦉",xp:0,coins:60,hearts:5,heartAt:Date.now(),
  streak:0,lastDay:"",completed:[],read:[],mistakes:[],achievements:[],cards:{},lastLesson:null,
  daily:{date:"",learn:0,flash:0,game:0,claimed:{}},stats:{games:0,correct:0,wrong:0,perfect:0,words:0},
  best:{},theme:"auto",sound:true,anim:true,owned:[],boostUntil:0});
function load(){
  try{state={...seedState(),...(JSON.parse(localStorage.getItem(KEY))||{})}}catch{state=seedState()}
  state.mistakes=(state.mistakes||[]).filter(m=>m&&typeof m==="object");
  state.daily={...seedState().daily,...(state.daily||{})};
  Promise.all([
    fetch("data.json").then(r=>r.json()),
    fetch("admin.json").then(r=>r.json()).catch(()=>ADMIN)
  ]).then(([d,a])=>{DATA=d;ADMIN={...ADMIN,...a};init()})
  .catch(()=>{document.body.insertAdjacentHTML("afterbegin",'<div style="padding:30px;text-align:center">⚠️ فایل data.json پیدا نشد. همهٔ فایل‌ها باید کنار هم باشند و سایت باید از طریق GitHub Pages یا یک سرور باز شود (نه با دابل‌کلیک روی index.html).</div>')});
}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}};
function init(){
  VOCAB=DATA.units.flatMap(u=>u.vocab.map(v=>({ar:v.word,fa:v.meaning,unit:u.number,id:u.number+":"+v.word})));
  $("#avatarPick").innerHTML=AVATARS.map((a,i)=>`<button type="button" class="${a===state.avatar?'on':''}" onclick="pickAvatar('${a}')">${a}</button>`).join("");
  rollDay();regenHearts();
  $("#nav").addEventListener("click",e=>{const b=e.target.closest("button[data-page]");if(b)go(b.dataset.page)});
  $("#mobileNav").addEventListener("click",e=>{const b=e.target.closest("button[data-page]");if(b)go(b.dataset.page)});
  $("#menuBtn").onclick=()=>$("#sidebar").classList.toggle("open");
  $("#avatarBtn").onclick=()=>go("profile");
  $("#searchBtn").onclick=openSearch;$("#searchClose").onclick=closeSearch;
  $("#searchInput").oninput=e=>renderSearch(e.target.value);
  $("#searchOverlay").addEventListener("click",e=>{if(e.target.id==="searchOverlay")closeSearch()});
  $("#lessonFilter").oninput=renderLessons;$("#dictFilter").oninput=renderDict;
  $("#wotdSpeak").onclick=()=>speak(wotd().ar);
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeSearch()});
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change",()=>renderTop());
  setInterval(()=>{if(regenHearts())renderTop()},30000);
  renderAll();
  if(!state.logged)go("login");
}
function pickAvatar(a){state.avatar=a;$$("#avatarPick button").forEach(b=>b.classList.toggle("on",b.textContent===a))}
function rollDay(){
  const t=today();
  if(state.daily.date!==t)state.daily={date:t,learn:0,flash:0,game:0,claimed:{}};
  if(state.logged&&state.lastDay!==t){
    const y=new Date(Date.now()-864e5).toISOString().slice(0,10);
    state.streak=state.lastDay===y?state.streak+1:1;state.lastDay=t;
  }
  save();
}
function regenHearts(){
  if(state.hearts>=5){state.heartAt=Date.now();return false}
  const n=Math.floor((Date.now()-state.heartAt)/HEART_MS);
  if(n>0){state.hearts=Math.min(5,state.hearts+n);state.heartAt=state.hearts>=5?Date.now():state.heartAt+n*HEART_MS;save();return true}
  return false;
}
async function heartGate(){
  if(state.hearts>0)return "play";
  const mins=Math.max(1,Math.ceil((HEART_MS-(Date.now()-state.heartAt))/60000));
  const r=await askModal(`<h2>💔 قلب‌هایت تمام شد</h2><p>تا ${fa(mins)} دقیقه دیگر یک قلب برمی‌گردد. تا آن موقع می‌توانی بدون جایزه تمرین کنی${state.coins>=40?" یا با ۴۰ سکه قلب‌ها را پر کنی":""}.</p>`,
    [{t:"تمرین بدون جایزه",v:"free"},...(state.coins>=40?[{t:"پر کردن (۴۰ 🪙)",v:"buy",cls:"primary"}]:[]),{t:"بعداً",v:"no"}]);
  if(r==="buy"){state.coins-=40;state.hearts=5;save();renderTop();return "play"}
  return r;
}
function loseHeart(){if(state.hearts>=5)state.heartAt=Date.now();state.hearts=Math.max(0,state.hearts-1);save();renderTop()}

/* ---------- امتیاز، سطح، صدا ---------- */
const level=()=>Math.floor(state.xp/XP_PER_LEVEL)+1;
function award(x=10,c=0,silent){
  if(state.boostUntil>Date.now())x=Math.round(x*1.5);
  state.xp+=x;state.coins+=c;save();
  if(!silent)xpPop(`+${fa(x)} امتیاز${c?`  +${fa(c)} 🪙`:""}`);
  renderTop();checkAchievements();
}
function xpPop(txt){
  if(!state.anim)return;const x=document.createElement("div");x.className="xp-pop";x.textContent=txt;
  x.style.left=(40+Math.random()*20)+"%";x.style.top="55%";document.body.appendChild(x);setTimeout(()=>x.remove(),950);
}
function toast(t){const x=$("#toast");x.textContent=t;x.classList.add("show");clearTimeout(window._t);window._t=setTimeout(()=>x.classList.remove("show"),2400)}
let _ac=null;
function beep(kind){
  if(!state.sound)return;
  try{
    _ac=_ac||new (window.AudioContext||window.webkitAudioContext)();
    const notes={ok:[660,880],no:[220,170],win:[523,659,784,1047],tick:[500]}[kind]||[600];
    notes.forEach((f,i)=>{const o=_ac.createOscillator(),g=_ac.createGain();o.frequency.value=f;o.type=kind==="no"?"sawtooth":"triangle";
      g.gain.setValueAtTime(.001,_ac.currentTime+i*.11);g.gain.exponentialRampToValueAtTime(.16,_ac.currentTime+i*.11+.02);g.gain.exponentialRampToValueAtTime(.001,_ac.currentTime+i*.11+.16);
      o.connect(g).connect(_ac.destination);o.start(_ac.currentTime+i*.11);o.stop(_ac.currentTime+i*.11+.18)});
  }catch{}
}
function speak(text){
  if(!("speechSynthesis" in window))return toast("این دستگاه تلفظ صوتی را پشتیبانی نمی‌کند.");
  try{
    speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang="ar-SA";u.rate=.8;
    const v=speechSynthesis.getVoices().find(v=>v.lang&&v.lang.toLowerCase().startsWith("ar"));
    if(!v)toast("صدای عربی روی این دستگاه نصب نیست؛ شاید تلفظ درست نباشد.");else u.voice=v;
    speechSynthesis.speak(u);
  }catch{}
}
function confetti(){
  if(!state.anim)return;const c=$("#confetti"),x=c.getContext("2d");c.width=innerWidth;c.height=innerHeight;
  const cols=["#ffb300","#2f4bd8","#10b3a3","#ff5a6e","#1fc28a"];
  const ps=Array.from({length:90},()=>({x:Math.random()*c.width,y:-20-Math.random()*c.height*.4,vx:Math.random()*4-2,vy:2+Math.random()*4,s:5+Math.random()*7,c:cols[Math.random()*5|0],r:Math.random()*6}));
  let f=0;(function tick(){x.clearRect(0,0,c.width,c.height);ps.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.r+=.2;x.fillStyle=p.c;x.save();x.translate(p.x,p.y);x.rotate(p.r);x.fillRect(-p.s/2,-p.s/2,p.s,p.s*.6);x.restore()});
    if(++f<150)requestAnimationFrame(tick);else x.clearRect(0,0,c.width,c.height)})();
}
function askModal(html,buttons){
  return new Promise(res=>{const m=document.createElement("div");m.className="modal";
    m.innerHTML=`<div class="card">${html}<div class="row">${buttons.map((b,i)=>`<button class="${b.cls||'ghost'}" data-i="${i}">${b.t}</button>`).join("")}</div></div>`;
    m.onclick=e=>{const b=e.target.closest("button[data-i]");if(b){m.remove();res(buttons[b.dataset.i].v)}};document.body.appendChild(m)});
}

/* ---------- ناوبری ---------- */
function go(page){
  if(!state.logged&&page!=="login"){page="login"}
  $$(".page").forEach(p=>p.classList.remove("active"));
  const p=$("#page-"+page);if(p)p.classList.add("active");
  $$("#nav button, #mobileNav button").forEach(b=>b.classList.toggle("active",b.dataset.page===page||(page==="lesson"&&b.dataset.page==="learn")));
  $("#sidebar").classList.remove("open");
  if(window.stopGames)stopGames();
  ({home:renderHome,learn:renderLessons,dict:renderDict,games:renderGames,flash:renderFlash,mistakes:renderMistakes,missions:renderMissions,
    achievements:renderAchievements,shop:renderShop,messages:renderMessages,profile:renderProfile,admin:renderAdmin}[page]||(()=>{}))();
  window.scrollTo({top:0,behavior:state.anim?"smooth":"auto"});
}
function login(){
  const f=$("#firstName").value.trim(),l=$("#lastName").value.trim(),ph=$("#phone").value.trim();
  if(!f)return toast("اول اسمت را بنویس.");
  Object.assign(state,{logged:true,firstName:f,lastName:l,phone:ph});rollDay();save();
  toast("خوش آمدی "+f+"! 🎉");renderAll();go("home");
}

/* ---------- رندر بالا و خانه ---------- */
function renderTop(){
  const lv=level(),cur=state.xp-(lv-1)*XP_PER_LEVEL;
  $("#hearts").textContent=fa(state.hearts);$("#coins").textContent=fa(state.coins);$("#xp").textContent=fa(state.xp);
  $("#level").textContent=fa(lv);$("#xpToNext").textContent=fa(cur);$("#xpBar").style.width=(cur/XP_PER_LEVEL*100)+"%";
  $("#ring").style.setProperty("--p",(cur/XP_PER_LEVEL*100)+"%");
  const lt=LEVEL_TITLES[Math.min(LEVEL_TITLES.length-1,Math.floor((lv-1)/2))];$("#levelTitle").textContent=lt;
  const name=state.firstName||"قهرمان";$("#sideName").textContent=name;$("#sideLevel").textContent="سطح "+fa(lv)+" • "+lt;
  $("#avatarBtn").textContent=state.avatar;$("#sideAvatar").textContent=state.avatar;$("#streak").textContent=fa(state.streak)+" روز";
  $("#themeLabel").textContent={light:"روشن",dark:"تاریک",auto:"خودکار"}[state.theme];
  $("#soundLabel").textContent=state.sound?"روشن":"خاموش";$("#animLabel").textContent=state.anim?"روشن":"خاموش";
  const dark=state.theme==="dark"||(state.theme==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches);
  document.body.classList.toggle("dark",dark);
  const unread=JSON.parse(localStorage.getItem(MSG_KEY)||"[]").filter(m=>m.reply&&!m.seen).length;
  $("#msgBadge").textContent=fa(unread);$("#msgBadge").classList.toggle("hidden",!unread);
}
const wotd=()=>VOCAB[(new Date().getFullYear()*400+new Date().getMonth()*31+new Date().getDate())%VOCAB.length];
function nextLesson(){
  if(state.lastLesson!=null&&!state.completed.includes(DATA.units[state.lastLesson]?.id))return state.lastLesson;
  const i=DATA.units.findIndex(u=>!state.completed.includes(u.id));return i<0?0:i;
}
function renderHome(){
  const name=state.firstName||"قهرمان",u=DATA.units[nextLesson()],all=state.completed.length===DATA.units.length;
  $("#heroTitle").textContent=`سلام ${name} 👋`;
  $("#heroSub").innerHTML=all?"همهٔ درس‌ها را تمام کردی! با بازی‌ها و فلش‌کارت مرور کن.":`ادامهٔ مسیر: <b>${esc(shortTitle(u))}</b>`;
  $("#heroBtn").textContent=all?"برو سراغ بازی 🎮":(state.lastLesson!=null?"ادامه بده 📖":"شروع اولین درس 📖");
  $("#heroBtn").onclick=()=>all?go("games"):openLesson(nextLesson());
  const w=wotd();$("#wotdAr").textContent=w.ar;$("#wotdFa").textContent=w.fa;$("#wotdUnit").textContent="از درس "+fa(w.unit);
  $("#streakDots").innerHTML=Array.from({length:7},(_,i)=>`<i class="${i<Math.min(7,state.streak)?'on':''}"></i>`).join("");
  $("#quickStats").innerHTML=[["📚",fa(state.completed.length)+"/"+fa(DATA.units.length),"درس تمام‌شده"],["🃏",fa(Object.values(state.cards).filter(c=>c.box>=3).length),"واژهٔ حفظ‌شده"],
    ["🏆",fa(state.achievements.length),"دستاورد"],["📝",fa(state.mistakes.length),"اشتباه برای مرور"]].map(x=>`<div class="stat"><span>${x[0]} ${x[2]}</span><b>${x[1]}</b></div>`).join("");
  $("#miniMissions").innerHTML=missionList().map(m=>`<div style="display:flex;gap:8px;align-items:center;margin:6px 0">${m.done?"✅":"⬜"} <span style="flex:1">${m.title}</span><small class="muted">${fa(Math.min(m.have,m.need))}/${fa(m.need)}</small></div>`).join("");
}
const shortTitle=u=>u.title.replace(/^درس\s*\d+\s*—\s*/,"")||u.title;

/* ---------- درس‌ها ---------- */
let lvFilter=0;
function renderLessons(){
  $("#lessonChips").innerHTML=[[0,"همه"],[1,"آسان ⭐"],[2,"متوسط ⭐⭐"],[3,"چالشی ⭐⭐⭐"]].map(c=>`<button class="chip ${lvFilter===c[0]?'on':''}" onclick="lvFilter=${c[0]};renderLessons()">${c[1]}</button>`).join("");
  const q=norm(faDigits($("#lessonFilter").value||""));
  const list=DATA.units.map((u,i)=>({u,i})).filter(({u})=>(!lvFilter||u.difficulty===lvFilter)&&(!q||norm(faDigits(u.title+" "+u.book_focus+" "+u.number)).includes(q)));
  $("#lessonGrid").innerHTML=list.map(({u,i})=>{const done=state.completed.includes(u.id),read=state.read.includes(u.id);
    return `<button class="lesson-card ${done?'done':''}" onclick="openLesson(${i})"><div class="ico">${u.icon}</div><span class="tag">درس ${fa(u.number)} • صفحهٔ ${fa(u.book_page_start)}</span>
    <h3>${esc(shortTitle(u))}</h3><small class="muted">${fa(u.vocab.length)} واژه • ${"⭐".repeat(u.difficulty)}</small>
    <div class="bar"><i style="width:${done?100:read?50:0}%"></i></div><small class="muted">${done?"تمام شد":read?"خوانده‌ای؛ آزمون بده":"شروع نشده"}</small></button>`}).join("")||`<div class="empty">درسی پیدا نشد. عبارت دیگری امتحان کن.</div>`;
}
function openLesson(i,tab){state.lastLesson=i;save();lessonTab=tab||"words";window.currentLesson=i;go("lesson");renderLesson(i)}
function renderLesson(i){
  const u=DATA.units[i];if(!u)return;
  const tabs=[["words","📖 واژه‌ها"],["rules","📐 قواعد و نکته‌ها"],["book","📄 متن کتاب"],["quiz","🧪 آزمون"]];
  let body="";
  if(lessonTab==="words")body=`<p class="muted">روی هر واژه بزن تا تلفظ شود. ${fa(u.vocab.length)} واژهٔ این درس:</p><div class="vocab-list">${u.vocab.map(v=>`<button class="vocab" onclick="speak(this.dataset.w)" data-w="${esc(v.word)}"><span class="ar">${esc(v.word)}</span><span>${esc(v.meaning)}<small>🔊 بزن و بشنو</small></span></button>`).join("")}</div>
    <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><button class="ghost" onclick="flashLesson(${i})">🃏 فلش‌کارت این درس</button><button class="primary" onclick="lessonTab='quiz';renderLesson(${i})">برو به آزمون</button></div>`;
  else if(lessonTab==="rules")body=`<h2>قواعد این درس</h2><ul class="notes">${(u.grammar||[]).map(t=>`<li>${esc(t)}</li>`).join("")||"<li>برای این درس قاعدهٔ جداگانه‌ای ثبت نشده است.</li>"}</ul>
    <h2 style="margin-top:18px">نکته‌های مرور</h2><ul class="notes">${(u.tips||[]).map(t=>`<li>${esc(t)}</li>`).join("")}</ul>${(u.official_learning_focus?`<p class="muted">محور یادگیری: ${esc(u.official_learning_focus)}</p>`:"")}`;
  else if(lessonTab==="book")body=`<p class="muted">صفحه‌های ${fa(u.book_page_start)} تا ${fa(u.book_page_end)} کتاب. متن زیر مستقیم از فایل کتاب گرفته شده و ممکن است حروف و حرکت‌ها نامرتب دیده شوند؛ برای خواندن، کتاب چاپی را کنار دست بگذار.</p>
    <details class="raw"><summary>نمایش متن خام استخراج‌شده</summary><div class="book-source">${esc(u.source_text||"")}</div></details>`;
  else {startLessonQuiz(i);return}
  $("#lessonDetail").innerHTML=`<div class="card"><div class="page-title"><span>${u.icon}</span><div><h1>${esc(shortTitle(u))}</h1><p>درس ${fa(u.number)} از ${fa(DATA.units.length)} • صفحهٔ ${fa(u.book_page_start)}</p></div></div>
    <div class="tabs">${tabs.map(t=>`<button class="${lessonTab===t[0]?'on':''}" onclick="lessonTab='${t[0]}';renderLesson(${i})">${t[1]}</button>`).join("")}</div>${body}</div>`;
  if(!state.read.includes(u.id)&&lessonTab!=="quiz"){state.read.push(u.id);save();award(5,0,true)}
}

/* ---------- ساخت سؤال ---------- */
function shuffleQ(q){const right=q.opts[q.a],opts=shuffle(q.opts);return {...q,opts,a:opts.indexOf(right)}}
function vocabQuestion(v,pool){
  const rev=Math.random()<.4;
  const others=shuffle(pool.filter(x=>x.id!==v.id&&(rev?x.ar!==v.ar:(x.fa!==v.fa&&x.ar!==v.ar))));
  const seen=new Set([rev?v.ar:v.fa]),dis=[];
  for(const o of others){const t=rev?o.ar:o.fa;if(!seen.has(t)){seen.add(t);dis.push(t)}if(dis.length===3)break}
  if(dis.length<3)return null;
  const right=rev?v.ar:v.fa,opts=shuffle([right,...dis]);
  return {q:rev?`کدام واژهٔ عربی یعنی «${esc(v.fa)}»؟`:`معنی <span class="ar">${esc(v.ar)}</span> چیست؟`,html:true,opts,a:opts.indexOf(right),
    exp:`${v.ar} = ${v.fa}`,unit:v.unit,speak:rev?"":v.ar,arOpts:rev,key:"v:"+v.id};
}
function lessonQuestions(i){
  const u=DATA.units[i],pool=[...u.vocab.map(v=>({ar:v.word,fa:v.meaning,unit:u.number,id:u.number+":"+v.word})),...pick(VOCAB,12)];
  const own=u.vocab.map(v=>({ar:v.word,fa:v.meaning,unit:u.number,id:u.number+":"+v.word}));
  const vq=pick(own,Math.min(6,own.length)).map(v=>vocabQuestion(v,pool)).filter(Boolean);
  const gq=u.quiz.filter(q=>!q.q.startsWith("در واژه‌نامهٔ")).map(shuffleQ).map(q=>({...q,unit:u.number,key:"g:"+q.q}));
  return shuffle([...vq,...gq]).slice(0,10);
}
function recordMistake(q){
  const k=q.key||q.q;if(state.mistakes.some(m=>m.key===k))return;
  state.mistakes.push({key:k,q:q.q,html:!!q.html,opts:q.opts,a:q.a,exp:q.exp||"",unit:q.unit||0});
  if(state.mistakes.length>80)state.mistakes.shift();
}

/* ---------- موتور آزمون (برای درس‌ها، اشتباهات، آرنا) ---------- */
function runQuiz(box,questions,opts){
  const z={i:0,score:0,combo:0,best:0,done:false};opts=opts||{};
  const draw=()=>{
    if(z.i>=questions.length)return finish();
    const q=questions[z.i];
    box.innerHTML=`<div class="card"><div class="q-head"><span class="tag">سؤال ${fa(z.i+1)} از ${fa(questions.length)}</span><span>${z.combo>1?`<span class="combo">🔥 ${fa(z.combo)} پشت‌سرهم</span> `:""}❤️ ${fa(state.hearts)}</span></div>
      <div class="bar" style="margin-bottom:10px"><i style="width:${z.i/questions.length*100}%"></i></div>
      <div class="q-text">${q.html?q.q:esc(q.q)}</div>${q.speak?`<button class="ghost" style="margin-bottom:10px" onclick="speak('${esc(q.speak)}')">🔊 تلفظ</button>`:""}
      <div class="options">${q.opts.map((o,j)=>`<button data-j="${j}">${q.arOpts?`<span class="ar" style="font-size:24px">${esc(o)}</span>`:esc(o)}</button>`).join("")}</div><div id="fb"></div></div>`;
    $$("#"+box.id+" .options button").forEach(b=>b.onclick=()=>answer(+b.dataset.j));
  };
  const answer=j=>{
    const q=questions[z.i],ok=j===q.a,btns=$$("#"+box.id+" .options button");
    btns.forEach(b=>b.disabled=true);btns[q.a].classList.add("right");if(!ok)btns[j].classList.add("wrong");
    state.stats[ok?"correct":"wrong"]++;
    if(ok){z.score++;z.combo++;z.best=Math.max(z.best,z.combo);beep("ok");if(!opts.noReward)award(6+Math.min(z.combo,5),2,true);xpPop("+"+fa(6+Math.min(z.combo,5)));
      if(opts.fixMistakes)state.mistakes=state.mistakes.filter(m=>m.key!==q.key)}
    else{z.combo=0;beep("no");recordMistake(q);if(!opts.fixMistakes)loseHeart()}
    save();
    $("#fb").innerHTML=`<div class="feedback ${ok?'ok':'no'}">${ok?"✅ آفرین!":"❌ درست نبود."} ${q.exp?esc(q.exp):""}</div><button class="primary full" style="margin-top:10px" id="nextQ">${z.i+1>=questions.length?"دیدن نتیجه":"بعدی"}</button>`;
    $("#nextQ").onclick=()=>{z.i++;draw()};$("#nextQ").focus();
  };
  const finish=()=>{
    const n=questions.length,perfect=z.score===n,pass=z.score/n>=.6;
    if(!opts.noReward){award(perfect?40:pass?20:8,perfect?20:pass?8:0,true);state.daily.game+=opts.isLesson?0:1;if(perfect)state.stats.perfect++}
    if(opts.onFinish)opts.onFinish(z,pass,perfect);
    save();beep(pass?"win":"no");if(perfect)confetti();checkAchievements();renderTop();
    box.innerHTML=`<div class="card result"><div class="big">${perfect?"🏆":pass?"🎉":"💪"}</div><h2>${perfect?"عالی! همه درست!":pass?"آفرین، قبول شدی":"تمرین کن، دفعهٔ بعد بهتر می‌شود"}</h2>
      <p>${fa(z.score)} از ${fa(n)} درست • بیشترین زنجیره ${fa(z.best)}</p>${opts.doneHtml?opts.doneHtml(z,pass):""}</div>`;
  };
  draw();
}
async function startLessonQuiz(i){
  const u=DATA.units[i];lessonTab="quiz";window.currentLesson=i;
  const gate=await heartGate();if(gate==="no"){lessonTab="words";renderLesson(i);return}
  $("#lessonDetail").innerHTML=`<div id="quizBox"></div>`;
  runQuiz($("#quizBox"),lessonQuestions(i),{isLesson:true,noReward:gate==="free",onFinish:(z,pass)=>{
    if(pass&&!state.completed.includes(u.id)){state.completed.push(u.id)}state.daily.learn++;save()},
    doneHtml:(z,pass)=>`<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:12px"><button class="primary" onclick="startLessonQuiz(${i})">دوباره</button>
      ${i+1<DATA.units.length?`<button class="good" onclick="openLesson(${i+1})">درس بعدی ←</button>`:""}<button class="ghost" onclick="openLesson(${i})">مرور درس</button></div>`});
}

/* ---------- واژه‌نامه و جستجو ---------- */
function vocabRow(v){return `<button class="vocab" onclick="speak(this.dataset.w)" data-w="${esc(v.ar)}"><span class="ar">${esc(v.ar)}</span><span>${esc(v.fa)}<small>درس ${fa(v.unit)}</small></span></button>`}
function renderDict(){
  const q=norm($("#dictFilter").value||"");
  const list=VOCAB.filter(v=>!q||norm(v.ar).includes(q)||norm(v.fa).includes(q));
  $("#dictList").innerHTML=list.map(vocabRow).join("")||`<div class="empty">واژه‌ای پیدا نشد.</div>`;
}
function openSearch(){$("#searchOverlay").classList.add("open");$("#searchInput").value="";renderSearch("");setTimeout(()=>$("#searchInput").focus(),50)}
function closeSearch(){$("#searchOverlay").classList.remove("open")}
function renderSearch(raw){
  const q=norm(faDigits(raw));if(!q){$("#searchResults").innerHTML=`<div class="empty">نام درس، شمارهٔ درس، واژهٔ عربی یا معنی فارسی را بنویس.</div>`;return}
  const ls=DATA.units.map((u,i)=>({u,i})).filter(({u})=>norm(faDigits(u.title+" "+u.book_focus+" درس "+u.number)).includes(q)).slice(0,5);
  const vs=VOCAB.filter(v=>norm(v.ar).includes(q)||norm(v.fa).includes(q)).slice(0,10);
  $("#searchResults").innerHTML=(ls.length?`<h3>درس‌ها</h3>`+ls.map(({u,i})=>`<button class="hit" onclick="closeSearch();openLesson(${i})"><span style="font-size:26px">${u.icon}</span><span>درس ${fa(u.number)} — ${esc(shortTitle(u))}</span></button>`).join(""):"")+
    (vs.length?`<h3 style="margin-top:8px">واژه‌ها</h3>`+vs.map(v=>`<button class="hit" onclick="closeSearch();openLesson(${v.unit-1})"><span class="ar">${esc(v.ar)}</span><span>${esc(v.fa)} <small class="muted">• درس ${fa(v.unit)}</small></span></button>`).join(""):"")||`<div class="empty">چیزی پیدا نشد. املای دیگری امتحان کن.</div>`;
}

/* ---------- فلش‌کارت (لایتنر) ---------- */
const DAY=864e5,BOX_WAIT=[0,DAY,3*DAY,7*DAY];
function flashDeck(unitIdx){
  const pool=unitIdx==null?VOCAB:VOCAB.filter(v=>v.unit===DATA.units[unitIdx].number),now=Date.now();
  const due=pool.filter(v=>state.cards[v.id]&&state.cards[v.id].due<=now&&state.cards[v.id].box<3);
  const fresh=pool.filter(v=>!state.cards[v.id]);
  return {pool,list:shuffle(due).concat(shuffle(fresh)),dueCount:due.length,fresh:fresh.length};
}
let flashUnit=null;
function flashLesson(i){flashUnit=i;go("flash")}
function renderFlash(){
  const box=$("#flashBox"),d=flashDeck(flashUnit);
  const head=`<div class="chips"><button class="chip ${flashUnit==null?'on':''}" onclick="flashUnit=null;renderFlash()">همهٔ درس‌ها</button>${flashUnit!=null?`<button class="chip on">درس ${fa(DATA.units[flashUnit].number)}</button>`:""}</div>`;
  if(!d.list.length){flashCur=null;box.innerHTML=head+`<div class="card empty"><div style="font-size:50px">🎉</div><h2>برای امروز تمام شد!</h2><p>همهٔ کارت‌ها را مرور کرده‌ای. فردا دوباره بیا.</p><button class="primary" onclick="go('games')">برو به بازی‌ها</button></div>`;return}
  flashCur=d.list[0];
  box.innerHTML=head+`<p class="muted" style="text-align:center">${fa(d.dueCount)} کارت برای مرور • ${fa(d.fresh)} کارت جدید</p>
    <div class="flash-card" id="flashCard" onclick="this.classList.toggle('flip')"><div class="flash-front">${esc(flashCur.ar)}</div><div class="flash-back">${esc(flashCur.fa)}<br><small style="font-size:14px;opacity:.85">درس ${fa(flashCur.unit)}</small></div></div>
    <div style="text-align:center;margin-bottom:10px"><button class="ghost" onclick="speak(flashCur.ar)">🔊 تلفظ</button></div>
    <div class="flash-controls"><button class="bad" onclick="flashRate(false)">هنوز نه</button><button class="good" onclick="flashRate(true)">بلدم</button></div>`;
}
function flashRate(ok){
  if(!flashCur)return;const c=state.cards[flashCur.id]||{box:0,due:0};
  c.box=ok?Math.min(3,c.box+1):0;c.due=Date.now()+BOX_WAIT[c.box]*(ok?1:0)+(ok?0:5*60*1000);state.cards[flashCur.id]=c;
  state.daily.flash++;state.stats.words=Object.values(state.cards).filter(x=>x.box>=3).length;
  if(ok){beep("ok");award(4,1)}else beep("no");save();renderFlash();
}

/* ---------- دفترچه اشتباهات ---------- */
function renderMistakes(){
  const m=state.mistakes;
  $("#mistakeBox").innerHTML=m.length?`<div class="card"><p>${fa(m.length)} سؤال برای مرور داری. هر سؤالی که درست جواب بدهی از دفترچه پاک می‌شود.</p><button class="primary big-btn" onclick="practiceMistakes()">شروع تمرین 💪</button></div>
    <div style="margin-top:12px;display:grid;gap:8px">${m.slice().reverse().map(x=>`<div class="message"><div>${x.html?x.q:esc(x.q)}</div><small class="muted">پاسخ درست: ${esc(x.opts[x.a])}${x.unit?" • درس "+fa(x.unit):""}</small></div>`).join("")}</div>`
    :`<div class="card empty"><div style="font-size:50px">✨</div><h2>دفترچه خالی است</h2><p>هر سؤالی که غلط بزنی اینجا جمع می‌شود تا دوباره مرورش کنی.</p></div>`;
}
function practiceMistakes(){
  const qs=pick(state.mistakes,10).map(m=>({...shuffleQ({q:m.q,opts:m.opts,a:m.a}),html:m.html,exp:m.exp,key:m.key,unit:m.unit}));
  $("#mistakeBox").innerHTML=`<div id="mqBox"></div>`;
  runQuiz($("#mqBox"),qs,{fixMistakes:true,doneHtml:()=>`<button class="primary" style="margin-top:12px" onclick="renderMistakes()">برگشت به دفترچه</button>`});
}

/* ---------- مأموریت‌ها، دستاوردها، فروشگاه ---------- */
function missionList(){
  const d=state.daily;
  return [{id:"learn",ico:"📚",title:"یک آزمون درس بده",have:d.learn,need:1,xp:30,coins:10},
          {id:"flash",ico:"🃏",title:"۵ فلش‌کارت مرور کن",have:d.flash,need:5,xp:20,coins:8},
          {id:"game",ico:"🎮",title:"یک بازی انجام بده",have:d.game,need:1,xp:25,coins:10}].map(m=>({...m,done:m.have>=m.need,claimed:!!d.claimed[m.id]}));
}
function renderMissions(){
  $("#missionGrid").innerHTML=missionList().map(m=>`<div class="mission"><div class="ico">${m.ico}</div><div><h3>${m.title}</h3><div class="bar"><i style="width:${Math.min(100,m.have/m.need*100)}%"></i></div><small class="muted">${fa(Math.min(m.have,m.need))} از ${fa(m.need)}</small></div>
    ${m.claimed?'<span class="tag">گرفته شد ✓</span>':m.done?`<button class="good" onclick="claim('${m.id}')">بگیر +${fa(m.xp)}⚡</button>`:`<span class="tag">+${fa(m.xp)}⚡ +${fa(m.coins)}🪙</span>`}</div>`).join("");
}
function claim(id){const m=missionList().find(x=>x.id===id);if(!m||!m.done||m.claimed)return;state.daily.claimed[id]=true;award(m.xp,m.coins);beep("win");confetti();renderMissions();renderHome()}
const ACH=[["🌱","اولین قدم","یک درس را تمام کن",()=>state.completed.length>=1],["📚","کتاب‌خوان","۴ درس تمام کن",()=>state.completed.length>=4],["🎓","استاد مسیر","۱۰ درس تمام کن",()=>state.completed.length>=10],
  ["🏅","فارغ‌التحصیل","همهٔ ۱۷ درس",()=>DATA&&state.completed.length>=DATA.units.length],["⚡","شکارچی امتیاز","۵۰۰ امتیاز",()=>state.xp>=500],["🚀","هزار امتیاز","۱۰۰۰ امتیاز",()=>state.xp>=1000],
  ["🃏","کارت‌خوان","۱۰ واژه را حفظ کن",()=>Object.values(state.cards).filter(c=>c.box>=3).length>=10],["💯","بی‌نقص","یک آزمون ۱۰۰٪",()=>state.stats.perfect>=1],
  ["🎮","بازیکن","۱۰ بار بازی کن",()=>state.stats.games>=10],["🔥","پیوسته","۳ روز پشت‌سرهم",()=>state.streak>=3],["🗓️","هفتهٔ پرانرژی","۷ روز پشت‌سرهم",()=>state.streak>=7],["🧹","پاک‌کننده","دفترچه اشتباهات را خالی کن (بعد از ۵ اشتباه)",()=>state.stats.wrong>=5&&state.mistakes.length===0]];
function checkAchievements(){
  if(!DATA||!state.logged)return;
  ACH.forEach(a=>{if(!state.achievements.includes(a[1])&&a[3]()){state.achievements.push(a[1]);save();toast(`🏆 دستاورد تازه: ${a[1]}`);beep("win")}});
}
function renderAchievements(){$("#achievementGrid").innerHTML=ACH.map(a=>{const on=state.achievements.includes(a[1]);return `<div class="ach ${on?'':'locked'}"><div class="ico">${a[0]}</div><h3>${a[1]}</h3><small class="muted">${on?"باز شد!":a[2]}</small></div>`}).join("")}
const SHOP=[["❤️","پر کردن قلب‌ها","همهٔ قلب‌ها را پر کن.",40,"hearts",true],["🧪","تقویت‌کنندهٔ امتیاز","۱۵ دقیقه امتیاز ۱٫۵ برابر.",80,"boost",true],
  ["🦁","شیر","شخصیت پروفایل",60,"av:🦁"],["🦄","اسب تک‌شاخ","شخصیت پروفایل",60,"av:🦄"],["🐧","پنگوئن","شخصیت پروفایل",40,"av:🐧"],["🐸","قورباغه","شخصیت پروفایل",40,"av:🐸"]];
function renderShop(){
  $("#shopGrid").innerHTML=SHOP.map(s=>{const own=state.owned.includes(s[4]);const isAv=s[4].startsWith("av:");
    return `<div class="shop-item"><div class="ico">${s[0]}</div><h3>${s[1]}</h3><small class="muted">${s[2]}</small><div style="margin:8px 0;font-weight:700">🪙 ${fa(s[3])}</div>
    <button class="${own&&!s[5]?'ghost':'primary'}" onclick="buy('${s[4]}',${s[3]},${!!s[5]})">${own&&!s[5]?(state.avatar===s[4].slice(3)?"انتخاب‌شده":"انتخاب"):"بخر"}</button></div>`}).join("");
}
function buy(k,c,consumable){
  const own=state.owned.includes(k);
  if(own&&!consumable){if(k.startsWith("av:")){state.avatar=k.slice(3);save();renderTop();renderShop()}return}
  if(state.coins<c)return toast("سکهٔ کافی نداری؛ آزمون و بازی کن تا سکه جمع شود.");
  if(k==="hearts"&&state.hearts>=5)return toast("قلب‌هایت پر است!");
  state.coins-=c;
  if(k==="hearts"){state.hearts=5}else if(k==="boost"){state.boostUntil=Date.now()+15*60*1000}else{state.owned.push(k);if(k.startsWith("av:"))state.avatar=k.slice(3)}
  save();beep("win");toast("خرید انجام شد! 🎉");renderTop();renderShop();
}

/* ---------- پیام، پروفایل، تنظیمات، مدیر ---------- */
const msgs=()=>JSON.parse(localStorage.getItem(MSG_KEY)||"[]");
function cleanupMessages(){
  const keep=ADMIN.retention_mode==="always"?Infinity:(ADMIN.retention_days||3)*864e5,n=Date.now();
  const f=msgs().filter(m=>keep===Infinity||n-new Date(m.time).getTime()<=keep);localStorage.setItem(MSG_KEY,JSON.stringify(f));return f;
}
function sendMessage(){
  const t=$("#messageText").value.trim();if(!t)return toast("پیام خالی است.");
  const a=msgs();a.push({id:Date.now(),from:state.firstName||"دانش‌آموز",text:t,time:new Date().toISOString(),reply:""});
  localStorage.setItem(MSG_KEY,JSON.stringify(a));$("#messageText").value="";toast("پیام ذخیره شد.");renderMessages();
}
function renderMessages(){
  const a=cleanupMessages();a.forEach(m=>{if(m.reply)m.seen=true});localStorage.setItem(MSG_KEY,JSON.stringify(a));
  $("#messageList").innerHTML=a.length?a.slice().reverse().map(m=>`<div class="message"><b>تو</b><p style="margin:2px 0">${esc(m.text)}</p><small class="muted">${new Date(m.time).toLocaleString("fa-IR")}</small>${m.reply?`<div class="stat" style="margin-top:8px"><b style="font-size:15px">پاسخ مدیر</b><p style="margin:0">${esc(m.reply)}</p></div>`:""}</div>`).join(""):`<div class="empty">هنوز پیامی نیست.</div>`;
  renderTop();
}
function renderProfile(){
  const lv=level();
  $("#profileBox").innerHTML=`<div style="display:flex;gap:14px;align-items:center;margin-bottom:14px"><div class="avatar big">${state.avatar}</div><div><h2 style="margin:0">${esc(state.firstName)} ${esc(state.lastName)}</h2><p class="muted" style="margin:0">🏫 ${esc(DATA.school||"")}</p></div></div>
  <div class="grid four">${[["سطح",fa(lv)],["امتیاز",fa(state.xp)],["سکه",fa(state.coins)],["زنجیره",fa(state.streak)+" روز"],["درس تمام‌شده",fa(state.completed.length)+"/"+fa(DATA.units.length)],["پاسخ درست",fa(state.stats.correct)],["واژهٔ حفظ‌شده",fa(Object.values(state.cards).filter(c=>c.box>=3).length)],["بازی انجام‌شده",fa(state.stats.games)]].map(x=>`<div class="stat"><span>${x[0]}</span><b>${x[1]}</b></div>`).join("")}</div>`;
}
function cycleTheme(){state.theme={auto:"light",light:"dark",dark:"auto"}[state.theme];save();renderTop()}
function toggleSetting(k){state[k]=!state[k];save();renderTop()}
function exportBackup(){const b=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="arabicyar-backup.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
function importBackup(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(typeof x!=="object"||x===null||Array.isArray(x))throw 0;state={...seedState(),...x};state.mistakes=(state.mistakes||[]).filter(m=>m&&typeof m==="object");save();renderAll();toast("پشتیبان بازگردانی شد.")}catch{toast("این فایل پشتیبان معتبر نیست.")}};r.readAsText(f)}
async function resetProgress(){if(await askModal("<h2>پاک کردن پیشرفت؟</h2><p>همهٔ امتیاز و درس‌ها پاک می‌شود و برنمی‌گردد.</p>",[{t:"نه",v:false},{t:"پاک کن",v:true,cls:"bad"}])){state=seedState();save();renderAll();go("login")}}
function renderAdmin(){
  const ok=sessionStorage.getItem("omega_admin")==="1";
  if(!ok){$("#adminBox").innerHTML=`<div class="card" style="max-width:420px"><h2>ورود مدیر</h2><input class="field" id="adminCode" inputmode="numeric" placeholder="کد مدیر"><button class="primary full" style="margin-top:8px" onclick="adminLogin()">ورود</button></div>`;return}
  const a=cleanupMessages();
  $("#adminBox").innerHTML=`<div class="grid four" style="margin-bottom:14px"><div class="stat"><span>دانش‌آموز این دستگاه</span><b>${esc(state.firstName||"—")}</b></div><div class="stat"><span>امتیاز</span><b>${fa(state.xp)}</b></div><div class="stat"><span>پیام‌ها</span><b>${fa(a.length)}</b></div><div class="stat"><span>درس‌ها</span><b>${fa(DATA.units.length)}</b></div></div>
  <div class="grid two"><div class="card"><h2>صندوق پیام</h2>${a.length?a.slice().reverse().map(m=>`<div class="message"><b>${esc(m.from)}</b><p style="margin:2px 0">${esc(m.text)}</p><textarea class="field" id="reply_${m.id}" placeholder="پاسخ مدیر">${esc(m.reply||"")}</textarea><button class="primary" style="margin-top:6px" onclick="replyMsg(${m.id})">ذخیره پاسخ</button></div>`).join(""):`<div class="empty">پیامی نیست.</div>`}</div>
  <div class="card"><h2>دادهٔ این دستگاه</h2><p class="muted">پیام‌ها و پیشرفت در حافظهٔ همین مرورگر می‌ماند و بین دستگاه‌ها هماهنگ نمی‌شود. محتوای درس‌ها در data.json است.</p><button class="setting" onclick="downloadAdminBackup()">دانلود پشتیبان مدیر</button><button class="setting" onclick="adminLogout()">خروج از پنل مدیر</button></div></div>`;
}
function adminLogin(){if($("#adminCode").value.trim()===String(ADMIN.admin_code)){sessionStorage.setItem("omega_admin","1");toast("وارد شدی.");renderAdmin()}else toast("کد درست نیست.")}
function adminLogout(){sessionStorage.removeItem("omega_admin");renderAdmin()}
function replyMsg(id){const a=msgs(),m=a.find(x=>x.id===id);if(!m)return;m.reply=$("#reply_"+id).value.trim();m.seen=false;localStorage.setItem(MSG_KEY,JSON.stringify(a));toast("پاسخ ذخیره شد.");renderAdmin()}
function downloadAdminBackup(){const b=new Blob([JSON.stringify({state,messages:msgs()},null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="arabicyar-admin-backup.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}

function renderAll(){
  if(!DATA)return;renderTop();renderHome();renderLessons();renderMissions();renderAchievements();renderShop();renderMessages();renderProfile();
}
window.addEventListener("load",load);
