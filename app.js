
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const ADMIN_CODE="59";
const KEY="aq_omega_state";
let DATA=null, ADMIN=null, state=null, flashIndex=0, flashFlipped=false, arena=null;

const seedState=()=>({
  logged:false,firstName:"",lastName:"",phone:"",xp:0,coins:120,hearts:5,streak:0,
  completed:[],mistakes:[],achievements:[],missions:{learn:0,arena:0,flash:0,quiz:0},
  theme:"dark",sound:true,anim:true,unread:0,arenaRecord:0,arenaWins:0,
  shop:{boost:false,heart:false,avatar:false}
});
function load(){
  try{state=JSON.parse(localStorage.getItem(KEY))||seedState()}catch{state=seedState()}
  fetch("data.json").then(r=>r.json()).then(d=>{DATA=d;renderAll()}).catch(()=>toast("data.json پیدا نشد؛ فایل‌ها را کنار هم قرار بده."));
  fetch("admin.json").then(r=>r.json()).then(d=>ADMIN=d).catch(()=>ADMIN={admin_code:ADMIN_CODE,students:[],messages:[],retention_days:3});
}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function toast(t){const x=$("#toast");x.textContent=t;x.classList.add("show");clearTimeout(window._toast);window._toast=setTimeout(()=>x.classList.remove("show"),2200)}
function xpPop(txt="+10 XP"){if(!state.anim)return;const x=document.createElement("div");x.className="xp-pop";x.textContent=txt;x.style.left=(50+Math.random()*20-10)+"%";x.style.top="55%";document.body.appendChild(x);setTimeout(()=>x.remove(),950)}
function award(x=10,c=0){state.xp+=x;state.coins+=c;save();xpPop(`+${x} XP${c?`  +${c} 🪙`:""}`);renderAll()}
function level(){return Math.max(1,Math.floor(state.xp/120)+1)}
function nextXP(){return level()*120}
function go(page){
  $$(".page").forEach(p=>p.classList.remove("active"));
  const p=$("#page-"+page); if(p)p.classList.add("active");
  $$("#nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  $("#sidebar").classList.remove("open");
  if(page==="flash")renderFlash();
  if(page==="admin")renderAdmin();
  if(page==="lesson" && window.currentLesson!=null)renderLesson(window.currentLesson);
  window.scrollTo({top:0,behavior:"smooth"});
}
function login(){
  const f=$("#firstName").value.trim(),l=$("#lastName").value.trim(),ph=$("#phone").value.trim();
  if(!f||!l||!ph)return toast("هر سه فیلد را پر کن.");
  state.logged=true;state.firstName=f;state.lastName=l;state.phone=ph;state.streak=Math.max(1,state.streak);save();
  toast("ورود موفق! ماجراجویی شروع شد 🚀");go("home");renderAll();
}
function renderTop(){
  const lv=level(), cur=state.xp-(lv-1)*120, pct=Math.min(100,cur/120*100);
  $("#hearts").textContent=state.hearts;$("#coins").textContent=state.coins;$("#xp").textContent=state.xp;
  $("#level").textContent=lv;$("#xpToNext").textContent=cur;$("#nextXP").textContent=120;$("#xpBar").style.width=pct+"%";
  const name=state.firstName||"قهرمان";$("#heroName").textContent=name;$("#sideName").textContent=name;$("#sideLevel").textContent="Level "+lv;
  const initial=(name[0]||"A").toUpperCase();$("#avatarBtn").textContent=initial;$("#sideAvatar").textContent=initial;
  $("#streak").textContent=state.streak+" روز";
  $("#themeLabel").textContent=state.theme==="light"?"روشن":state.theme==="dark"?"تاریک":"سیستم";
  $("#soundLabel").textContent=state.sound?"روشن":"خاموش";$("#animLabel").textContent=state.anim?"روشن":"خاموش";
  document.body.classList.toggle("light",state.theme==="light");
  $("#msgBadge").classList.toggle("hidden",!state.unread);
}
function renderHome(){
  const total=(DATA?.units||[]).length, done=state.completed.length;
  $("#quickStats").innerHTML=[
    ["📚",done+"/"+total,"درس‌های تکمیل‌شده"],["🎯",Math.round(done/Math.max(1,total)*100)+"%","پیشرفت مسیر"],
    ["⚔️",state.arenaRecord,"بهترین رکورد آرنا"],["❌",state.mistakes.length,"دفترچه اشتباهات"]
  ].map(x=>`<div class="stat"><span>${x[0]} ${x[2]}</span><b>${x[1]}</b></div>`).join("");
  const m=state.missions.learn>=1?{t:"فلش‌کارت بزن",r:"+20 XP",d:"یک کارت را مرور کن."}:{t:"یک درس را شروع کن",r:"+30 XP",d:"اولین مرحلهٔ امروز را بزن."};
  $("#dailyMission").innerHTML=`<b>${m.t}</b><p class="muted">${m.d}</p><span class="tag">${m.r}</span><button class="primary" style="margin-top:10px" onclick="go('learn')">انجام مأموریت</button>`;
  $("#streakDots").innerHTML=Array.from({length:7},(_,i)=>`<i class="${i<Math.min(7,state.streak)?'on':''}"></i>`).join("");
  $("#pathMini").innerHTML=(DATA?.units||[]).map((u,i)=>`<div class="node ${state.completed.includes(u.id)?'done':''} ${i>state.completed.length?'lock':''}"><div>${u.icon}</div><small>مرحله ${i+1}</small></div>`).join("");
}
function renderMap(){
  $("#mapGrid").innerHTML=(DATA?.units||[]).map((u,i)=>{const done=state.completed.includes(u.id);return `<div class="map-card"><div class="map-icon">${u.icon}</div><span class="tag">مرحله ${i+1} • سختی ${u.difficulty}/4</span><h2>${u.title}</h2><p>${u.theme}</p><button class="${done?'ghost':'primary'}" onclick="openLesson(${i})">${done?'مرور دوباره':'ورود به مرحله'}</button></div>`}).join("");
}
function renderLessons(){
  const units=DATA?.units||[];
  $("#lessonGrid").innerHTML=units.map((u,i)=>`<article class="lesson-card"><div class="map-icon">${u.icon}</div><span class="tag">درس ${u.number} • صفحه ${u.book_page_start}</span><h3>${u.title}</h3><p>${u.book_focus}</p><small class="muted">متن کتاب: ${Math.max(1,u.source_text.length)} نویسه • ${u.quiz.length} سؤال تمرینی</small><button class="primary" onclick="openLesson(${i})">مطالعه درس 📖</button></article>`).join("");
}
function openLesson(i){window.currentLesson=i;go("lesson");renderLesson(i)}
function renderLesson(i){
  const u=DATA.units[i]; if(!u)return;
  const esc=escapeHtml(u.source_text||"");
  $("#lessonDetail").innerHTML=`<div class="card"><div class="page-title"><span>${u.icon}</span><div><h1>${u.title}</h1><p>${u.book_focus}</p><span class="tag">صفحه ${u.book_page_start} تا ${u.book_page_end}</span></div></div>
  <div class="grid two"><div class="stat"><span>📚 جایگاه در کتاب</span><b>درس ${u.number} از 17</b><p>${u.book_focus}</p></div><div class="stat"><span>📄 منبع</span><b>متن واقعی کتاب</b><p>استخراج‌شده از فایل کتاب بارگذاری‌شده.</p></div></div>
  <h2 style="margin-top:25px">📖 متن و محتوای کتاب</h2><div class="book-source">${esc.replace(/\n/g,'<br>')}</div>
  <h2 style="margin-top:25px">🧠 نکات این بخش</h2><ul>${u.tips.map(t=>`<li style="margin:9px 0">${escapeHtml(t)}</li>`).join("")}</ul>
  <button class="primary full" onclick="startLessonQuiz(${i})">تمرین و آزمون این درس 🧪</button></div>`;
}
function startLessonQuiz(i){
  const u=DATA.units[i];let q=0,score=0;
  const box=$("#lessonDetail");
  const draw=()=>{if(q>=u.quiz.length){const perfect=score===u.quiz.length; if(!state.completed.includes(u.id))state.completed.push(u.id);state.missions.quiz++;award(perfect?50:25,perfect?25:10);state.missions.learn++;save();box.innerHTML=`<div class="card empty"><div><h2>${perfect?'🏆 عالی!':'✨ خوب بود!'}</h2><p>امتیاز: ${score}/${u.quiz.length}</p><button class="primary" onclick="openLesson(${i})">مرور درس</button></div></div>`;return}
    const item=u.quiz[q];box.innerHTML=`<div class="card"><span class="tag">سؤال ${q+1}/${u.quiz.length}</span><h2 class="arena-question">${item.q}</h2><div class="options">${item.opts.map((o,j)=>`<button onclick="answerLesson(${i},${q},${j})">${o}</button>`).join("")}</div></div>`;
    window._lessonScore=score;
  };
  window._lessonQuiz={i,q,score,draw};draw();
}
function answerLesson(i,q,j){const u=DATA.units[i],item=u.quiz[q],ok=j===item.a;if(!ok)state.mistakes.push(item.q);if(ok)window._lessonQuiz.score++;else toast("جواب اشتباه؛ نکته را دوباره بخوان.");window._lessonQuiz.q++;window._lessonScore=window._lessonQuiz.score;save();window._lessonQuiz.draw=(()=>{});const nq=window._lessonQuiz.q;if(nq>=u.quiz.length){const score=window._lessonQuiz.score;const perfect=score===u.quiz.length;if(!state.completed.includes(u.id))state.completed.push(u.id);state.missions.quiz++;if(perfect)state.coins+=25;state.xp+=perfect?50:25;state.missions.learn++;save();$("#lessonDetail").innerHTML=`<div class="card empty"><div><h2>${perfect?'🏆 Perfect!':'✨ نتیجه'}</h2><p>${score} از ${u.quiz.length}</p><button class="primary" onclick="openLesson(${i})">مرور درس</button></div></div>`;renderAll();return}
  const item2=u.quiz[nq];$("#lessonDetail").innerHTML=`<div class="card"><span class="tag">سؤال ${nq+1}/${u.quiz.length}</span><h2 class="arena-question">${item2.q}</h2><div class="options">${item2.opts.map((o,k)=>`<button onclick="answerLesson(${i},${nq},${k})">${o}</button>`).join("")}</div></div>`;
}
function renderFlash(){
  const all=(DATA?.units||[]).flatMap(u=>u.vocab);if(!all.length)return;
  const v=all[flashIndex%all.length];flashFlipped=false;$("#flashCard").classList.remove("flip");$("#flashFront").textContent=v.ar;$("#flashBack").innerHTML=`${v.fa}<br><small>${v.tip}</small>`;
}
function flipFlash(){flashFlipped=!flashFlipped;$("#flashCard").classList.toggle("flip",flashFlipped)}
function flashRate(ok){state.missions.flash++;if(ok)award(8,3);else toast("اشکال ندارد؛ دوباره ببین.");flashIndex++;renderFlash();save();renderAll()}
function renderMissions(){
  const list=[["📚","یک درس را کامل کن",state.completed.length>0,30],["🃏","۳ فلش‌کارت مرور کن",state.missions.flash>=3,state.missions.flash>=3?0:20],["⚔️","یک آرنا بازی کن",state.missions.arena>=1,state.missions.arena>=1?0:25]];
  $("#missionGrid").innerHTML=list.map(m=>`<div class="mission"><div class="map-icon">${m[0]}</div><h3>${m[1]}</h3><p class="muted">${m[2]?'ماموریت تکمیل شد.':'هنوز باقی مانده.'}</p><div class="reward">${m[2]?'✓ کامل شد':'+'+m[3]+' XP'}</div></div>`).join("");
}
const achievements=[
  ["🌱","اولین قدم",()=>state.completed.length>=1],["📚","کتاب‌خوان",()=>state.completed.length>=4],["👑","استاد مسیر",()=>state.completed.length>=8],
  ["⚔️","آرناباز",()=>state.arenaWins>=3],["⚡","XP Hunter",()=>state.xp>=500],["🃏","کارت‌خوان",()=>state.missions.flash>=10]
];
function renderAchievements(){$("#achievementGrid").innerHTML=achievements.map(a=>`<div class="achievement ${a[2]()?'':'locked'}"><div class="icon">${a[0]}</div><h3>${a[1]}</h3><p class="muted">${a[2]()?'باز شده!':'هنوز قفل است.'}</p></div>`).join("")}
const shop=[
  ["🧪","XP Booster","در آمار ظاهری نشان ویژه فعال می‌شود.",80,"boost"],["❤️","Heart Pack","یک قلب اضافه.",60,"heart"],["🪄","Avatar Aura","افکت پروفایل ویژه.",100,"avatar"]
];
function renderShop(){$("#shopGrid").innerHTML=shop.map(s=>`<div class="shop-item"><div class="map-icon">${s[0]}</div><h3>${s[1]}</h3><p class="muted">${s[2]}</p><span class="price">🪙 ${s[3]}</span><button class="primary" onclick="buy('${s[4]}',${s[3]})">${state.shop[s[4]]?'خریده شد':'خرید'}</button></div>`).join("")}
function buy(k,c){if(state.shop[k])return toast("این مورد را قبلاً خریده‌ای.");if(state.coins<c)return toast("سکه کافی نیست.");state.coins-=c;state.shop[k]=true;if(k==="heart")state.hearts++;save();toast("خرید موفق! 🎉");renderAll()}
function sendMessage(){const t=$("#messageText").value.trim();if(!t)return toast("پیام خالی است.");const msgs=JSON.parse(localStorage.getItem("aq_omega_msgs")||"[]");msgs.push({id:Date.now(),from:"student",text:t,time:new Date().toISOString(),reply:""});localStorage.setItem("aq_omega_msgs",JSON.stringify(msgs));$("#messageText").value="";toast("پیام ذخیره شد.");renderMessages()}
function cleanupMessages(){const msgs=JSON.parse(localStorage.getItem("aq_omega_msgs")||"[]");const keep=(ADMIN?.retention_mode==="always")?Infinity:((ADMIN?.retention_days||3)*86400000);const now=Date.now();const filtered=msgs.filter(m=>keep===Infinity||now-new Date(m.time).getTime()<=keep);localStorage.setItem("aq_omega_msgs",JSON.stringify(filtered));return filtered}
function renderMessages(){const msgs=cleanupMessages();$("#messageList").innerHTML=msgs.length?msgs.slice().reverse().map(m=>`<div class="message"><b>${m.from==="student"?'تو':'مدیر'}</b><p>${escapeHtml(m.text)}</p><small>${new Date(m.time).toLocaleString("fa-IR")}</small>${m.reply?`<div class="stat" style="margin-top:8px"><b>پاسخ مدیر</b><p>${escapeHtml(m.reply)}</p></div>`:""}</div>`).join(""):`<div class="empty">هنوز پیامی نیست.</div>`}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function renderProfile(){$("#profileBox").innerHTML=`<div class="grid two"><div><h2>${state.firstName||"مهمان"} ${state.lastName||""}</h2><p class="muted">📱 ${state.phone||"—"}</p><p>🏫 دبیرستان امیر داماد</p></div><div class="stat"><span>XP</span><b>${state.xp}</b><span>سکه ${state.coins} • رکورد آرنا ${state.arenaRecord}</span></div></div><hr style="border-color:var(--line);border-width:1px 0 0;margin:18px 0"><p>درس‌های کامل‌شده: ${state.completed.length}</p><p>اشتباهات ثبت‌شده: ${state.mistakes.length}</p><p>مأموریت فلش‌کارت: ${state.missions.flash}</p>`}
function cycleTheme(){state.theme=state.theme==="dark"?"light":"dark";save();renderAll()}
function toggleSetting(k){state[k]=!state[k];save();renderAll()}
function exportBackup(){const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="arabicyar-omega-backup.json";a.click();URL.revokeObjectURL(a.href)}
function importBackup(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);state={...seedState(),...x};save();renderAll();toast("پشتیبان وارد شد.")}catch{toast("فایل JSON معتبر نیست.")}};r.readAsText(f)}
function resetProgress(){if(!confirm("همه پیشرفت محلی پاک شود؟"))return;state=seedState();save();renderAll();go("home")}
function renderAdmin(){
  const ok=sessionStorage.getItem("omega_admin")==="1";
  if(!ok){$("#adminBox").innerHTML=`<div class="card" style="max-width:520px"><h2>🔐 ورود مدیر</h2><input id="adminCode" inputmode="numeric" placeholder="کد مدیر"><button class="primary full" style="margin-top:8px" onclick="adminLogin()">ورود</button></div>`;return}
  const msgs=cleanupMessages();
  $("#adminBox").innerHTML=`<div class="admin-tabs"><button class="primary" onclick="renderAdmin()">داشبورد</button><button class="ghost" onclick="adminLogout()">خروج</button></div>
  <div class="grid four"><div class="stat"><span>دانش‌آموز این مرورگر</span><b>${state.firstName||"—"}</b></div><div class="stat"><span>XP</span><b>${state.xp}</b></div><div class="stat"><span>پیام‌ها</span><b>${msgs.length}</b></div><div class="stat"><span>درس‌ها</span><b>${DATA.units.length}</b></div></div>
  <div class="grid two"><div class="card"><h2>💬 صندوق پیام</h2>${msgs.length?msgs.slice().reverse().map(m=>`<div class="message"><b>${escapeHtml(state.firstName||"دانش‌آموز")}</b><p>${escapeHtml(m.text)}</p><textarea id="reply_${m.id}" placeholder="پاسخ مدیر">${escapeHtml(m.reply||"")}</textarea><button class="primary" onclick="replyMsg(${m.id})">ذخیره پاسخ</button></div>`).join(""):`<div class="empty">پیامی نیست.</div>`}</div>
  <div class="card"><h2>📦 داده‌ها</h2><p class="muted">محتوای آموزشی در data.json قرار دارد. داده‌های کاربر و پیام‌ها در localStorage همین مرورگر نگهداری می‌شوند.</p><button class="setting" onclick="downloadAdminBackup()">دانلود admin backup</button></div></div>`;
}
function adminLogin(){if($("#adminCode").value.trim()===ADMIN_CODE){sessionStorage.setItem("omega_admin","1");toast("ورود مدیر موفق شد.");renderAdmin()}else toast("کد نادرست است.")}
function adminLogout(){sessionStorage.removeItem("omega_admin");renderAdmin()}
function replyMsg(id){const msgs=JSON.parse(localStorage.getItem("aq_omega_msgs")||"[]");const m=msgs.find(x=>x.id===id);if(!m)return;m.reply=$("#reply_"+id).value.trim();localStorage.setItem("aq_omega_msgs",JSON.stringify(msgs));toast("پاسخ ذخیره شد.");renderMessages();renderAdmin()}
function downloadAdminBackup(){const blob=new Blob([JSON.stringify({state,messages:JSON.parse(localStorage.getItem("aq_omega_msgs")||"[]")},null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="arabicyar-omega-admin-backup.json";a.click()}
function startArena(type){
  arena={type,index:0,score:0,deck:[],locked:false};
  if(type==="memory")memoryArena(); else if(type==="tf")trueFalseArena(); else comboArena();
}
function arenaAward(x,c){state.xp+=x;state.coins+=c;state.missions.arena++;xpPop(`+${x} XP +${c} 🪙`);save();renderTop()}
function finishArena(){state.arenaRecord=Math.max(state.arenaRecord,arena.score);state.arenaWins++;save();renderAll();toast(`آرنا تمام شد! امتیاز ${arena.score}`)}
function memoryArena(){
  const all=DATA.units.flatMap(u=>u.vocab).sort(()=>Math.random()-.5).slice(0,4),cards=all.flatMap((v,i)=>[{id:i,key:i,text:v.ar},{id:i,key:i+4,text:v.fa}]).sort(()=>Math.random()-.5);
  arena.deck=cards;arena.open=[];arena.matched=[];
  const draw=()=>{$("#arenaBox").innerHTML=`<div class="card-head"><h2>🧠 Memory Rush</h2><span>جفت‌ها: ${arena.matched.length/2}/4</span></div><div class="memory-grid">${cards.map((c,i)=>`<button class="memory-card ${arena.open.includes(i)||arena.matched.includes(i)?'open':''}" onclick="memoryPick(${i})">${arena.open.includes(i)||arena.matched.includes(i)?c.text:'?'}</button>`).join("")}</div>`};
  arena.draw=draw;draw();
}
function memoryPick(i){if(arena.locked||arena.open.includes(i)||arena.matched.includes(i))return;arena.open.push(i);arena.draw();if(arena.open.length<2)return;arena.locked=true;const [a,b]=arena.open;if(arena.deck[a].id===arena.deck[b].id){arena.matched.push(a,b);arena.open=[];arena.locked=false;arena.score+=20;arenaAward(10,8);if(arena.matched.length===8){finishArena();}else arena.draw()}else setTimeout(()=>{arena.open=[];arena.locked=false;arena.draw()},650)}
function trueFalseArena(){
  const all=DATA.question_bank.slice(0,6);arena.deck=all;arena.score=0;drawTF();
}
function drawTF(){if(arena.index>=arena.deck.length){finishArena();return}const q=arena.deck[arena.index],isTrue=Math.random()>.5;arena.current={...q,isTrue};const shown=isTrue?q.opts[q.a]:q.opts[(q.a+1)%q.opts.length];arena.current.shown=shown;$("#arenaBox").innerHTML=`<div class="card"><span class="tag">⚡ سؤال ${arena.index+1}/${arena.deck.length}</span><h2 class="arena-question">${q.q}</h2><div class="stat">ادعا: <b>${shown}</b></div><div class="options"><button onclick="answerTF(true)">✅ درست</button><button onclick="answerTF(false)">❌ غلط</button></div></div>`}
function answerTF(ans){const ok=ans===arena.current.isTrue;if(ok){arena.score+=20;arenaAward(12,6)}else{state.mistakes.push(arena.current.q);save();toast("غلط بود!");}arena.index++;drawTF()}
function comboArena(){arena.deck=[...DATA.question_bank].sort(()=>Math.random()-.5).slice(0,10);arena.index=0;arena.score=0;drawCombo()}
function drawCombo(){if(arena.index>=arena.deck.length){finishArena();return}const q=arena.deck[arena.index];arena.current=q;$("#arenaBox").innerHTML=`<div class="card"><span class="tag">👑 باس • ${arena.index+1}/10</span><h2 class="arena-question">${q.q}</h2><div class="options">${q.opts.map((o,i)=>`<button onclick="answerCombo(${i})">${o}</button>`).join("")}</div></div>`}
function answerCombo(i){const q=arena.current;if(i===q.a){arena.score+=30;arenaAward(15,7)}else{state.mistakes.push(q.q);save();toast(q.exp||"جواب درست نبود.");}arena.index++;drawCombo()}
function renderAll(){
  if(!DATA)return;
  if(!state.logged){go("login");return}
  renderTop();renderHome();renderMap();renderLessons();renderMissions();renderAchievements();renderShop();renderMessages();renderProfile();renderAdmin();renderFlash();
}
$("#nav").addEventListener("click",e=>{const b=e.target.closest("button[data-page]");if(b)go(b.dataset.page)});
$("#menuBtn").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
$("#avatarBtn").addEventListener("click",()=>go("profile"));
window.addEventListener("load",load);
