const ADMIN_CODE="59";
const KEY="aq_v2_state", DATAKEY="aq_v2_data", ADMINKEY="aq_v2_admin";
let data={},adminData={},state={},currentLesson=null,quiz=null,flashIndex=0;

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const seedState={first:"",last:"",phone:"",name:"",xp:0,coins:25,hearts:5,done:[],badges:[],streak:0,lastActive:"",correct:0,answered:0,quizzes:0,speedBest:0,mistakes:[],theme:"system",sound:true,anim:true,login:false,retention:3,owned:[],missions:{xp:0,quiz:0,flash:0},arenaRecord:0,arenaWins:0};
const flash=[["مَدرَسَةٌ","مدرسه"],["کِتابٌ","کتاب"],["قَلَمٌ","قلم"],["مُعَلِّمٌ","معلم"],["طالِبٌ","دانش‌آموز"],["بَیتٌ","خانه"],["أبٌ","پدر"],["أمٌّ","مادر"],["أخٌ","برادر"],["أختٌ","خواهر"],["خَمْسَةٌ","پنج"],["عَشَرَةٌ","ده"],["یَذهَبُ","می‌رود"],["کَتَبَ","نوشت"]];

async function boot(){
  try{data=JSON.parse(localStorage.getItem(DATAKEY))||await fetch("data.json").then(r=>r.json())}catch{data={lessons:[]}}
  try{adminData=JSON.parse(localStorage.getItem(ADMINKEY))||await fetch("admin.json").then(r=>r.json())}catch{adminData={students:[],messages:[],settings:{retentionDays:3}}}
  try{state={...clone(seedState),...JSON.parse(localStorage.getItem(KEY)||"{}")}}catch{state=clone(seedState)}
  if(!state.login) go("login"); else go("home");
  cleanupMessages(); applyTheme(); renderAll();
}
function clone(x){return JSON.parse(JSON.stringify(x))}
function save(){localStorage.setItem(KEY,JSON.stringify(state));localStorage.setItem(DATAKEY,JSON.stringify(data));localStorage.setItem(ADMINKEY,JSON.stringify(adminData))}
function toast(t){const x=$("#toast");x.textContent=t;x.classList.add("show");clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>x.classList.remove("show"),2300)}
function level(){return Math.floor(state.xp/100)+1}
function applyTheme(){let t=state.theme==="system"?(matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light"):state.theme;document.documentElement.dataset.theme=t}
function go(page){
  $$(".page").forEach(x=>x.classList.remove("active"));const el=$("#"+page);if(el)el.classList.add("active");
  $$(".nav[data-page]").forEach(x=>x.classList.toggle("active",x.dataset.page===page));
  if(page==="admin")renderAdmin(); if(page==="map")renderMap(); if(page==="messages")renderMessages();
  window.scrollTo({top:0,behavior:"smooth"});
}
function beep(ok=true){if(!state.sound)return;try{const c=new AudioContext(),o=c.createOscillator(),g=c.createGain();o.frequency.value=ok?650:180;g.gain.value=.03;o.connect(g);g.connect(c.destination);o.start();setTimeout(()=>{o.stop();c.close()},100)}catch{}}
function updateStats(){
  const total=data.lessons.length||1,acc=state.answered?Math.round(state.correct/state.answered*100):0,p=Math.round(state.done.length/total*100);
  $("#hearts").textContent=state.hearts;$("#coins").textContent=state.coins;$("#xp").textContent=state.xp;$("#homeXp").textContent=state.xp;
  $("#streak").textContent=state.streak;$("#badgeCount").textContent=state.badges.length;$("#done").textContent=`${state.done.length}/${data.lessons.length}`;
  $("#level").textContent=level();$("#mapLevel").textContent=level();$("#profileLevel").textContent=level();$("#profileXp").textContent=state.xp;
  $("#profileStreak").textContent=state.streak;$("#accuracy").textContent=acc+"%";$("#shopCoins").textContent=state.coins;
  const qA=$("#quickAccuracy"),qC=$("#quickCoins"),qM=$("#quickMistakes"),qS=$("#quickStreak"),qL=$("#homeLevelOrb"),qR=$("#arenaRecord");
  if(qA)qA.textContent=acc+"%";if(qC)qC.textContent=state.coins;if(qM)qM.textContent=state.mistakes.length;if(qS)qS.textContent=state.streak;if(qL)qL.textContent=level();if(qR)qR.textContent=state.arenaRecord||0;
  $("#bar").style.width=p+"%";$("#pct").textContent=p+"%";$("#homeBar").style.width=p+"%";$("#homePct").textContent=p+"%";
  const n=state.name||"دانش‌آموز";$("#greeting").textContent=`سلام ${n} 👋`;$("#topWelcome").textContent=`سلام، ${n} 👋`;
  $("#profileName").textContent=n;$("#profileMeta").textContent=`${state.phone||"بدون شماره"} • پایه هفتم`;
  $("#retentionLabel").textContent=state.retention===0?"همیشه":"۳ روز";
  const unread=(adminData.messages||[]).filter(m=>m.studentPhone===state.phone && !m.read).length;$("#msgBadge").textContent=unread;
}
function renderMap(){
  const html=data.lessons.map((l,i)=>{const unlocked=i===0||state.done.includes(data.lessons[i-1].id),done=state.done.includes(l.id);
    return `<article class="lessonCard card ${unlocked?"":"locked"}"><div class="lessonIcon">${done?"✅":l.icon||"✨"}</div><div><small>مرحله ${i+1}</small><h3>${l.title}</h3><p>${l.topic||""}</p></div><button class="${unlocked?"primary":"ghost"}" ${unlocked?`onclick="openLesson(${l.id})"`:"disabled"}>${done?"مرور":unlocked?"شروع":"🔒"}</button></article>`
  }).join("");
  $("#lessonMap").innerHTML=html;
  $("#homeMap").innerHTML=data.lessons.slice(0,5).map((l,i)=>`<div class="mini card"><small>مرحله ${i+1}</small><h3>${state.done.includes(l.id)?"✅":"🔹"} ${l.title}</h3><small>${i===0||state.done.includes(data.lessons[i-1]?.id)?"آماده":"🔒 قفل"}</small></div>`).join("");
}
function renderDaily(){
  const l=data.lessons[(new Date().getDate())%Math.max(1,data.lessons.length)],q=l?.questions?.[0];
  $("#daily").innerHTML=q?`<div><h3>🎯 ${q[0]}</h3><p>یک سؤال کوتاه از «${l.title}»؛ پاسخ درست یعنی XP و سکه.</p></div><button class="primary" onclick='startQuiz([${JSON.stringify(q)}],"چالش امروز",null)'>شروع</button>`:`<p>هنوز محتوایی اضافه نشده.</p>`;
}
function renderMissions(){
  const arr=[["⚡","کسب 100 XP",state.missions.xp,100],["🧠","یک آزمون کامل",state.missions.quiz,1],["🃏","مرور ۵ فلش‌کارت",state.missions.flash,5]];
  $("#missionsBox").innerHTML=arr.map(x=>`<div class="mission card"><b>${x[0]}</b><h3>${x[1]}</h3><p>${Math.min(x[2],x[3])}/${x[3]}</p><div class="progress"><div><i style="width:${Math.min(100,x[2]/x[3]*100)}%"></i></div></div></div>`).join("");
}
function renderAchievements(){
  const vals=[state.done.length>=1,state.streak>=3,state.speedBest>=10,(state.answered&&state.correct/state.answered>=.9),state.done.length>=data.lessons.length,state.coins>=100,state.quizzes>=5,state.hearts<=1];
  const a=[["🌱","شروع سفر"],["🔥","در مسیر"],["⚡","سرعت نور"],["🎯","تک‌تیرانداز"],["🏆","قهرمان عربی"],["🪙","کلکسیونر"],["🧠","دانشمند"],["❤️","جان‌سخت"]];
  $("#achievementsBox").innerHTML=a.map((x,i)=>`<div class="achievement card ${vals[i]?"":"locked"}"><div style="font-size:38px">${x[0]}</div><h3>${x[1]}</h3><small>${vals[i]?"🏆 باز شده":"🔒 قفل"}</small></div>`).join("");
  state.badges=vals.map((v,i)=>v?i:null).filter(x=>x!==null);
}
function renderShop(){
  const items=[["heart","❤️","قلب اضافه",25,"یک قلب اضافه می‌کند"],["shield","🛡️","سپر اشتباه",40,"یک اشتباه را بدون کم‌شدن قلب تحمل می‌کند"],["xp","⚡","بوستر XP",50,"برای آزمون بعدی XP بیشتری می‌دهد"]];
  $("#shopBox").innerHTML=items.map(x=>`<div class="shopItem card"><span style="font-size:36px">${x[1]}</span><div><h3>${x[2]}</h3><p>${x[4]}</p><button class="primary" onclick="buy('${x[0]}',${x[3]})">🪙 ${x[3]}</button></div></div>`).join("");
}
function buy(id,cost){
  if(state.coins<cost)return toast("🪙 سکه کافی نیست");
  state.coins-=cost;if(id==="heart")state.hearts=Math.min(5,state.hearts+1);else state.owned.push(id);
  save();renderAll();toast("خرید موفق بود 🎉");
}
function openLesson(id){
  const l=data.lessons.find(x=>x.id===id);if(!l)return;currentLesson=l;go("lesson");
  $("#lessonBox").innerHTML=`<div class="lessonHero"><small>مرحله ${data.lessons.indexOf(l)+1}</small><h1>${l.icon||"✨"} ${l.title}</h1><p>${l.topic||""}</p></div><div class="note"><b>📘 جزوه</b><br>${l.note||"جزوه آماده است."}</div><div class="note"><b>🧩 قواعد</b><br>${l.grammar||"نکته قواعد این مرحله."}</div><button class="primary" onclick='startQuiz(currentLesson.questions,"آزمون "+currentLesson.title,currentLesson)'>🚀 شروع آزمون</button>`;
}
function startQuiz(qs,title,lesson){quiz={questions:clone(qs),title,lesson,index:0,score:0,wrong:[],started:Date.now()};renderQuiz()}
function renderQuiz(){
  go("practice");const q=quiz.questions[quiz.index];$("#quiz").classList.remove("hidden");
  $("#quiz").innerHTML=`<div class="qtop"><span>${quiz.title}</span><span>${quiz.index+1}/${quiz.questions.length}</span></div><div class="question">${q[0]}</div><div class="answers">${q[1].map((a,i)=>`<button class="answer" onclick="answer(${i})">${a}</button>`).join("")}</div>`;
}
function answer(i){
  const q=quiz.questions[quiz.index],ok=i===q[2];$$(".answer").forEach((b,n)=>{b.disabled=true;if(n===q[2])b.classList.add("correct");if(n===i&&!ok)b.classList.add("wrong")});
  state.answered++;
  if(ok){state.correct++;quiz.score++;let gain=12;if(state.owned.includes("xp")){gain=20;state.owned.splice(state.owned.indexOf("xp"),1)}state.xp+=gain;state.coins+=3;state.missions.xp+=gain;beep(true);toast(`آفرین! +${gain} XP ⚡`)}
  else{quiz.wrong.push(q);if(state.owned.includes("shield"))state.owned.splice(state.owned.indexOf("shield"),1);else state.hearts=Math.max(0,state.hearts-1);state.mistakes.unshift(q);beep(false);toast("این یکی را دوباره مرور کن 🩹")}
  save();setTimeout(()=>{quiz.index++;quiz.index<quiz.questions.length?renderQuiz():finishQuiz()},550);
}
function finishQuiz(){
  const pct=Math.round(quiz.score/quiz.questions.length*100);
  if(quiz.lesson&&pct>=60&&!state.done.includes(quiz.lesson.id)){state.done.push(quiz.lesson.id);state.xp+=50;state.coins+=15;toast("مرحله باز شد! +50 XP 🎉")}
  state.quizzes++;state.missions.quiz++;if(pct===100)state.xp+=30;save();
  $("#quiz").innerHTML=`<div class="result"><div class="score">${pct}%</div><h2>${pct>=60?"🎉 عالی بود":"💪 دوباره تمرین کن"}</h2><p>${quiz.score} پاسخ درست از ${quiz.questions.length}</p><button class="primary" onclick="go('map');renderAll()">ادامه مسیر</button><button class="ghost" onclick='startQuiz(quiz.questions,quiz.title,quiz.lesson)'>دوباره</button></div>`;
  renderAll();
}
function speedGame(){
  const qs=data.lessons.flatMap(l=>l.questions).sort(()=>Math.random()-.5),end=Date.now()+60000;let i=0,score=0;go("practice");
  function tick(){
    if(Date.now()>=end||i>=qs.length){state.speedBest=Math.max(state.speedBest,score);state.xp+=score*8;state.coins+=score;save();$("#quiz").innerHTML=`<div class="result"><div class="score">${score}</div><h2>⏱️ تمام!</h2><p>رکورد: ${state.speedBest}</p></div>`;renderAll();return}
    const q=qs[i];$("#quiz").classList.remove("hidden");$("#quiz").innerHTML=`<div class="qtop"><span>⏱️ ${Math.max(0,Math.ceil((end-Date.now())/1000))}</span><span>${score} درست</span></div><div class="question">${q[0]}</div><div class="answers">${q[1].map((a,n)=>`<button class="answer" onclick="window.sa(${n})">${a}</button>`).join("")}</div>`;
    window.sa=n=>{if(n===q[2]){score++;state.correct++;beep(true)}else beep(false);state.answered++;i++;tick()};
  }tick();
}
function startMode(m){
  if(m==="speed")return speedGame();
  let qs=m==="mistakes"?state.mistakes.slice(0,8):data.lessons.flatMap(l=>l.questions).sort(()=>Math.random()-.5).slice(0,m==="word"?1:10);
  if(!qs.length)return toast("چیزی برای مرور نیست 🎉");
  startQuiz(qs,m==="word"?"شکار واژه":m==="mistakes"?"دفتر اشتباهات":"آزمون جامع",null);
}

let arena={type:null,index:0,score:0,deck:[],locked:false};
function startArena(type){
  arena={type,index:0,score:0,deck:[],locked:false};
  const box=$("#arenaBox");box.classList.remove("hidden");go("challenge");
  if(type==="memory") return memoryArena();
  if(type==="truefalse") return trueFalseArena();
  return comboArena();
}
function arenaAward(points){
  state.xp+=points;state.coins+=Math.max(1,Math.floor(points/8));state.arenaWins=(state.arenaWins||0)+1;
  state.arenaRecord=Math.max(state.arenaRecord||0,arena.score);save();renderAll();
  const el=document.createElement("div");el.className="floatingXP";el.textContent=`+${points} XP`;el.style.left=(innerWidth/2)+"px";el.style.top=(innerHeight/2)+"px";document.body.appendChild(el);setTimeout(()=>el.remove(),900);
}
function memoryArena(){
  const pairs=flash.slice(0,6).map((x,i)=>({id:i,a:x[0],b:x[1]}));let cards=[];
  pairs.forEach(p=>{cards.push({id:p.id,text:p.a});cards.push({id:p.id,text:p.b})});cards.sort(()=>Math.random()-.5);
  let selected=[],found=0;
  const box=$("#arenaBox");
  function draw(){
    box.innerHTML=`<div class="qtop"><span>🧠 حافظه واژه</span><span>${found}/6 جفت</span></div><div class="memoryGrid">${cards.map((c,i)=>`<button class="memoryCard" data-i="${i}">?</button>`).join("")}</div>`;
    $$(".memoryCard").forEach(b=>b.onclick=()=>flip(+b.dataset.i));
  }
  function flip(i){
    if(selected.length>=2||selected.includes(i))return;
    const b=$$(".memoryCard")[i];b.textContent=cards[i].text;b.classList.add("open");selected.push(i);
    if(selected.length===2){
      const [a,bx]=selected;
      if(cards[a].id===cards[bx].id){found++;selected=[];$$(".memoryCard")[a].classList.add("matched");$$(".memoryCard")[bx].classList.add("matched");arena.score=found;arenaAward(10);if(found===6){box.innerHTML=`<div class="result"><div class="score">${found}</div><h2>🧠 حافظه‌ات عالیه!</h2><p>+60 XP گرفتی.</p></div>`;return}}
      else setTimeout(()=>{[$$(".memoryCard")[a],$$(".memoryCard")[bx]].forEach(x=>{x.textContent="?";x.classList.remove("open")});selected=[]},650);
    }
  }
  draw();
}
function trueFalseArena(){
  const qs=data.lessons.flatMap(l=>l.questions).sort(()=>Math.random()-.5).slice(0,8);
  let i=0,score=0;
  const box=$("#arenaBox");
  function draw(){
    if(i>=qs.length){arena.score=score;arenaAward(score*8);box.innerHTML=`<div class="result"><div class="score">${score}</div><h2>⚡ تمام!</h2><p>امتیاز آرِنا ثبت شد.</p></div>`;return}
    const q=qs[i],correct=q[1][q[2]],shown=Math.random()>.5?correct:q[1][(q[2]+1)%q[1].length],truth=shown===correct;
    box.innerHTML=`<div class="qtop"><span>⚡ درست یا غلط</span><span>${i+1}/${qs.length}</span></div><div class="arenaQuestion">${q[0]}<br><strong style="color:var(--primary)">${shown}</strong></div><div class="arenaChoices"><button id="tfYes">✅ درست</button><button id="tfNo">❌ غلط</button></div>`;
    $("#tfYes").onclick=()=>pick(true);$("#tfNo").onclick=()=>pick(false);
    function pick(v){if(v===truth){score++;beep(true);toast("درست! +امتیاز")}else{beep(false);toast("اشتباه بود")}i++;setTimeout(draw,300)}
  }draw();
}
function comboArena(){
  const qs=data.lessons.flatMap(l=>l.questions).sort(()=>Math.random()-.5).slice(0,10);let i=0,score=0,combo=0;
  const box=$("#arenaBox");
  function draw(){
    if(i>=qs.length){arena.score=score;arenaAward(score*10);box.innerHTML=`<div class="result"><div class="score">${score}/10</div><h2>🔥 کمبو تمام شد!</h2><p>بیشترین کمبو: ${combo}</p></div>`;return}
    const q=qs[i];box.innerHTML=`<div class="qtop"><span>🔥 کمبو ${combo}</span><span>${i+1}/10</span></div><div class="comboBar"><i style="width:${i*10}%"></i></div><div class="arenaQuestion">${q[0]}</div><div class="arenaChoices">${q[1].map((a,n)=>`<button data-n="${n}">${a}</button>`).join("")}</div>`;
    $$(".arenaChoices button").forEach(b=>b.onclick=()=>{const ok=+b.dataset.n===q[2];if(ok){score++;combo++;beep(true)}else combo=0;i++;draw()});
  }draw();
}

function flashRender(){
  const f=flash[flashIndex%flash.length];const c=$("#flashCard");
  c.innerHTML=`<small>کارت ${flashIndex+1}</small><strong>${f[0]}</strong><small>برای دیدن معنی لمس کن</small>`;
  c.dataset.meaning=f[1];c.onclick=()=>{c.innerHTML=`<small>معنی</small><strong>${f[1]}</strong><small>${f[0]}</small>`};
}
function markActiveMessage(id){const m=adminData.messages.find(x=>x.id===id);if(m){m.read=true;save();renderMessages();updateStats()}}
function cleanupMessages(){
  if(!adminData.messages)adminData.messages=[];
  if(state.retention===0)return;
  const cutoff=Date.now()-state.retention*86400000;
  adminData.messages=adminData.messages.filter(m=>new Date(m.createdAt).getTime()>=cutoff);
  save();
}
function renderMessages(){
  cleanupMessages();const mine=(adminData.messages||[]).filter(m=>m.studentPhone===state.phone).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  $("#messageList").innerHTML=mine.length?mine.map(m=>`<article class="message card ${m.read?"":"unread"}" onclick="markActiveMessage('${m.id}')"><div class="messageHead"><b>${escapeHtml(m.subject||"بدون موضوع")}</b><small>${formatDate(m.createdAt)}</small></div><div class="messageBody">${escapeHtml(m.body)}</div>${m.reply?`<div class="reply"><b>پاسخ ادمین:</b><div>${escapeHtml(m.reply)}</div><small>${formatDate(m.repliedAt)}</small></div>`:""}</article>`).join(""):`<div class="card" style="padding:25px;text-align:center;color:var(--muted)">هنوز پیامی نداری. اگر سؤالی داری، از فرم کناری شروع کن.</div>`;
}
function sendMessage(){
  const subject=$("#msgSubject").value.trim()||"پیام دانش‌آموز",body=$("#msgBody").value.trim();
  if(!body)return toast("متن پیام را بنویس");
  adminData.messages=adminData.messages||[];adminData.messages.push({id:"m_"+Date.now(),studentPhone:state.phone,studentName:state.name,subject,body,createdAt:new Date().toISOString(),read:true,reply:"",repliedAt:""});
  $("#msgSubject").value="";$("#msgBody").value="";save();renderMessages();renderAdmin();toast("پیامت برای ادمین ثبت شد 💬");
}
function renderAdmin(){
  renderAdminStudents();renderAdminMessages();adminLessons();adminBackup();
}
function renderAdminStudents(){
  const s=adminData.students||[];
  $("#adminStudents").innerHTML=`<div class="card"><h3>👨‍🎓 دانش‌آموزان</h3>${s.length?s.map((x,i)=>`<div class="studentRow"><span>👤 <b>${escapeHtml(x.first)} ${escapeHtml(x.last)}</b><small> • ${escapeHtml(x.phone)}</small></span><input class="grade" type="number" min="0" max="20" value="${x.grade??""}" placeholder="نمره" onchange="setGrade(${i},this.value)"></div>`).join(""):`<p>هنوز دانش‌آموزی در این نسخه ثبت نشده است.</p>`}</div>`;
}
function renderAdminMessages(){
  const s=adminData.messages||[];
  $("#adminMessages").innerHTML=`<div class="card"><h3>💬 صندوق پیام‌ها</h3><p style="color:var(--muted)">پیام‌ها طبق تنظیم نگهداری فعلی پاک می‌شوند؛ حالت «همیشه» هم در تنظیمات وجود دارد.</p>${s.length?s.slice().reverse().map(m=>`<div class="adminMsg"><b>${escapeHtml(m.studentName||"دانش‌آموز")} — ${escapeHtml(m.subject)}</b><div class="meta">${escapeHtml(m.studentPhone)} • ${formatDate(m.createdAt)}</div><p>${escapeHtml(m.body)}</p><textarea id="reply_${m.id}" placeholder="پاسخ ادمین...">${escapeHtml(m.reply||"")}</textarea><button class="primary" onclick="replyMessage('${m.id}')">💌 ذخیره پاسخ</button><button class="ghost" onclick="deleteMessage('${m.id}')">حذف</button></div>`).join(""):`<p>صندوق پیام خالی است.</p>`}</div>`;
}
function replyMessage(id){
  const m=adminData.messages.find(x=>x.id===id);if(!m)return;
  const box=$("#reply_"+id);m.reply=box.value.trim();m.repliedAt=new Date().toISOString();m.read=false;save();renderAdminMessages();toast("پاسخ ذخیره شد و برای دانش‌آموز نمایش داده می‌شود.");
}
function deleteMessage(id){adminData.messages=adminData.messages.filter(x=>x.id!==id);save();renderAdmin();renderMessages();toast("پیام حذف شد")}
function setGrade(i,v){adminData.students[i].grade=Math.max(0,Math.min(20,Number(v)||0));save();toast("نمره ذخیره شد ✅")}
function adminLessons(){
  const rows=data.lessons.map((l,i)=>`<div class="adminRow"><span>${i+1}. ${escapeHtml(l.title)}</span><button class="ghost" onclick="deleteLesson(${l.id})">حذف</button></div>`).join("");
  $("#adminLessons").innerHTML=`<div class="card"><h3>📚 مدیریت درس‌ها</h3>${rows}<hr><input id="newTitle" placeholder="عنوان درس"><input id="newTopic" placeholder="موضوع"><textarea id="newNote" placeholder="جزوه"></textarea><br><button class="primary" onclick="addLesson()">➕ افزودن مرحله</button></div>`;
}
function adminBackup(){
  $("#adminBackup").innerHTML=`<div class="card"><h3>💾 پشتیبان و JSON</h3><p style="color:var(--muted)">نسخه فعلی همه داده‌های محلی را در JSON قابل انتقال نگه می‌دارد.</p><button class="ghost" onclick="downloadJSON('data.json',data)">📤 خروجی درس‌ها</button> <button class="ghost" onclick="downloadJSON('admin.json',adminData)">📤 خروجی ادمین + پیام‌ها</button><label class="file">📥 ورود JSON<input type="file" accept=".json" onchange="importJSON(event)"></label></div>`;
}
function addLesson(){
  const l={id:Date.now(),title:$("#newTitle").value||"درس جدید",topic:$("#newTopic").value||"موضوع",icon:"✨",note:$("#newNote").value||"جزوه جدید",grammar:"نکته قواعد",questions:[["سؤال نمونه",["گزینه ۱","گزینه ۲","گزینه ۳","گزینه ۴"],0]]};
  data.lessons.push(l);save();renderAll();renderAdmin();toast("مرحله اضافه شد");
}
function deleteLesson(id){data.lessons=data.lessons.filter(x=>x.id!==id);state.done=state.done.filter(x=>x!==id);save();renderAll();renderAdmin();toast("مرحله حذف شد")}
function downloadJSON(name,obj){const b=new Blob([JSON.stringify(obj,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
function importJSON(e){
  const f=e.target.files[0];if(!f)return;const r=new FileReader();
  r.onload=()=>{try{const x=JSON.parse(r.result);if(x.lessons)data=x;if(x.students||x.messages){adminData={...adminData,...x}}save();renderAll();renderAdmin();toast("JSON وارد شد")}catch{toast("JSON نامعتبر است")}};r.readAsText(f)
}
function loginStudent(){
  const first=$("#studentFirst").value.trim(),last=$("#studentLast").value.trim(),phone=$("#studentPhone").value.trim();
  if(!first||!last||!phone)return toast("نام، نام خانوادگی و شماره را وارد کن");
  state.first=first;state.last=last;state.phone=phone;state.name=first+" "+last;state.login=true;
  adminData.students=adminData.students||[];let found=adminData.students.find(s=>s.phone===phone);
  if(!found)adminData.students.push({first,last,phone,grade:null,joined:new Date().toISOString()});else{found.first=first;found.last=last}
  touchStreak();save();renderAll();go("home");toast(`خوش آمدی ${state.name} 🎉`);
}
function touchStreak(){
  const today=new Date().toISOString().slice(0,10);if(state.lastActive===today)return;
  const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
  state.streak=state.lastActive===yesterday?state.streak+1:1;state.lastActive=today;
}
function renderAll(){
  updateStats();renderMap();renderDaily();renderMissions();renderAchievements();renderShop();flashRender();renderMessages();
  $("#theme").value=state.theme;$("#retention").value=String(state.retention);$("#sound").textContent=state.sound?"روشن":"خاموش";$("#anim").textContent=state.anim?"روشن":"خاموش";
  save();
}
function formatDate(x){try{return new Intl.DateTimeFormat("fa-IR",{dateStyle:"short",timeStyle:"short"}).format(new Date(x))}catch{return x}}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

$$("[data-page]").forEach(b=>b.onclick=()=>go(b.dataset.page));
$$(".mode").forEach(b=>b.onclick=()=>startMode(b.dataset.mode));
$("#menuBtn").onclick=()=>{$("#sidebar").style.display=$("#sidebar").style.display==="block"?"none":"block"};
$("#profileBtn").onclick=()=>go("profile");
$("#continueBtn").onclick=()=>{const n=data.lessons.find(x=>!state.done.includes(x.id));openLesson(n?.id||data.lessons[0]?.id)};
$("#flashYes").onclick=()=>{state.xp+=5;state.coins++;state.missions.flash++;flashIndex++;save();renderAll();toast("+5 XP ⚡")};
$("#flashNo").onclick=()=>{const f=flash[flashIndex%flash.length];state.mistakes.push([f[0],[f[1]],0]);flashIndex++;save();flashRender();toast("دوباره مرور می‌کنیم 🩹")};
$("#editName").onclick=()=>{const n=prompt("نام نمایشی:",state.name);if(n?.trim()){state.name=n.trim();save();renderAll()}};
$("#theme").onchange=e=>{state.theme=e.target.value;save();applyTheme()};
$("#sound").onclick=()=>{state.sound=!state.sound;save();renderAll()};
$("#anim").onclick=()=>{state.anim=!state.anim;document.body.style.setProperty("--animation",state.anim?"1":"0");save();renderAll()};
$("#retention").onchange=e=>{state.retention=Number(e.target.value);save();cleanupMessages();renderAll();toast(state.retention===0?"پیام‌ها تا زمان پاک‌کردن دستی می‌مانند.":"پیام‌های قدیمی‌تر از ۳ روز حذف می‌شوند.")};
$("#clearExpired").onclick=()=>{cleanupMessages();renderMessages();renderAdmin();toast("پیام‌های منقضی پاک شدند.")};
$("#refreshMessages").onclick=()=>{renderMessages();toast("تازه شد.")};
$("#sendMessage").onclick=sendMessage;
$("#reset").onclick=()=>{if(confirm("پیشرفت دانش‌آموز پاک شود؟")){localStorage.removeItem(KEY);location.reload()}};
$("#adminBtn").onclick=()=>{const c=prompt("کد مدیریت را وارد کن:");if(c===ADMIN_CODE)go("admin");else if(c!==null)toast("کد نادرست است")};
$("#studentLogin").onclick=loginStudent;
$$(".arenaCard").forEach(b=>b.onclick=()=>startArena(b.dataset.arena));
$$("[data-admin-tab]").forEach(b=>b.onclick=()=>{$$("[data-admin-tab]").forEach(x=>x.classList.remove("active"));b.classList.add("active");["students","messages","lessons","backup"].forEach(x=>$("#admin"+x[0].toUpperCase()+x.slice(1)).classList.add("hidden"));$("#admin"+b.dataset.adminTab[0].toUpperCase()+b.dataset.adminTab.slice(1)).classList.remove("hidden")});
boot();
