
let DATA, state = JSON.parse(localStorage.getItem("arabic7_state")||'{"xp":0,"done":[],"streak":0,"badges":[],"lastDay":""}');
let currentLesson=null, quizList=[], quizIndex=0, quizScore=0, timer=null, speed=false;

const fa=n=>new Intl.NumberFormat("fa-IR").format(n);
async function boot(){
  DATA=JSON.parse(localStorage.getItem("arabic7_data")||"null");
  if(!DATA){DATA=await fetch("data.json").then(r=>r.json()); saveData();}
  renderHome(); updateStats();
}
function saveData(){localStorage.setItem("arabic7_data",JSON.stringify(DATA))}
function saveState(){localStorage.setItem("arabic7_state",JSON.stringify(state));updateStats()}
function toast(t){const x=document.getElementById("toast");x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),2200)}
function show(id){document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));document.getElementById(id).classList.add("active");scrollTo({top:0,behavior:"smooth"})}
function scrollToMap(){document.getElementById("mapSection").scrollIntoView({behavior:"smooth"})}
function goHome(){show("home");renderHome()}
function renderHome(){
 const grid=document.getElementById("lessonGrid"); grid.innerHTML="";
 DATA.lessons.forEach((l,i)=>{
   const unlocked=i===0||state.done.includes(DATA.lessons[i-1].id);
   const done=state.done.includes(l.id);
   grid.innerHTML+=`<article class="lesson-card ${!unlocked?"locked":""} ${done?"done":""}" onclick="${unlocked?`openLesson(${l.id})`:``}">
      <span class="lesson-number">${fa(i+1)}</span><div class="lesson-emoji">${l.emoji||"📘"}</div>
      <h3>${l.title}</h3><p>${l.summary}</p><div class="mini-progress"><i style="width:${done?100:0}%"></i></div>
      <small>${done?"✅ تکمیل شد":unlocked?"▶ شروع مرحله":"🔒 قفل"}</small>
   </article>`;
 });
}
function updateStats(){
 let xp=state.xp||0, level=Math.floor(xp/100)+1, inside=xp%100;
 document.getElementById("xpText").textContent=fa(xp);
 document.getElementById("xpStat").textContent=fa(xp);
 document.getElementById("levelText").textContent=fa(level);
 document.getElementById("xpFill").style.width=inside+"%";
 document.getElementById("doneCount").textContent=fa(state.done.length);
 document.getElementById("badgeCount").textContent=fa(state.badges.length);
 document.getElementById("streak").textContent=fa(state.streak||0);
}
function addXP(n){state.xp+=n;if(state.xp>=100&&!state.badges.includes("level1")){state.badges.push("level1");toast("🏅 نشان اول را گرفتی!")}saveState()}
function openLesson(id){
 currentLesson=DATA.lessons.find(x=>x.id===id); show("lesson");
 const notes=currentLesson.notes.map(n=>`<div class="note"><b>${n.title}</b><div>${n.body}</div></div>`).join("");
 document.getElementById("lessonView").innerHTML=`<div class="lesson-hero"><div class="big">${currentLesson.emoji}</div><span class="pill">مرحله ${fa(currentLesson.id)}</span><h1>${currentLesson.title}</h1><p>${currentLesson.summary}</p></div>
 <div class="content-grid"><div class="panel"><h2>📖 جزوه</h2>${notes}</div>
 <div><div class="panel"><h2>🧠 قواعد</h2><p style="line-height:2">${currentLesson.grammar}</p></div>
 <div class="panel"><h2>🎮 مأموریت</h2><p>برای بازکردن مرحله بعد، آزمون این درس را کامل کن.</p><button class="primary wide" onclick="startLessonQuiz(${id})">شروع آزمون 🎯</button></div></div></div>`;
}
function startLessonQuiz(id){const l=DATA.lessons.find(x=>x.id===id);startQuiz(l.questions,`آزمون ${l.title}`)}
function openAllQuiz(){
 const all=DATA.lessons.flatMap(l=>l.questions.map(q=>({...q,lesson:l.title}))).sort(()=>Math.random()-.5).slice(0,10);
 startQuiz(all,"🏆 آزمون جامع")
}
function startSpeedQuiz(){speed=true;const all=DATA.lessons.flatMap(l=>l.questions).sort(()=>Math.random()-.5).slice(0,5);startQuiz(all,"⚡ چالش سرعتی")}
function startWordGame(){const all=DATA.lessons.flatMap(l=>l.questions).sort(()=>Math.random()-.5).slice(0,5);startQuiz(all,"🧠 واژه‌یاب")}
function startQuiz(list,title){
 quizList=list;quizIndex=0;quizScore=0;show("quiz");renderQuestion(title);
}
function renderQuestion(title){
 clearInterval(timer);
 if(quizIndex>=quizList.length){finishQuiz();return}
 const q=quizList[quizIndex];
 document.getElementById("quizView").innerHTML=`<div class="quiz-box"><div class="quiz-top"><span>${title}</span><span>${fa(quizIndex+1)} / ${fa(quizList.length)}</span></div>
 <h2 class="question">${q.q}</h2><div class="options">${q.options.map((o,i)=>`<button class="option" onclick="answer(${i},${q.answer})">${String.fromCharCode(65+i)}) ${o}</button>`).join("")}</div></div>`;
}
function answer(choice,correct){
 const opts=[...document.querySelectorAll(".option")];opts.forEach(x=>x.disabled=true);
 if(choice===correct){opts[choice].classList.add("correct");quizScore++;addXP(DATA.app.xpPerCorrect);toast("✅ درست! +10 XP")}
 else{opts[choice].classList.add("wrong");opts[correct].classList.add("correct");toast("❌ جواب درست را ببین و دوباره تمرین کن")}
 setTimeout(()=>{quizIndex++;renderQuestion("ادامه آزمون")},650);
}
function finishQuiz(){
 clearInterval(timer); const pct=Math.round(quizScore/quizList.length*100);
 if(currentLesson && quizScore>=Math.ceil(quizList.length*.6) && !state.done.includes(currentLesson.id)){
   state.done.push(currentLesson.id);state.streak=(state.streak||0)+1;
   addXP(20);toast("🎉 مرحله کامل شد! مرحله بعد باز شد.");
 }
 document.getElementById("quizView").innerHTML=`<div class="quiz-box result"><div class="trophy">${pct>=80?"🏆":pct>=50?"🌟":"💪"}</div><h1>آزمون تمام شد!</h1><p>امتیاز تو: <b>${fa(quizScore)} از ${fa(quizList.length)}</b></p><p>${pct>=80?"عالی بود!":"یک دور دیگر تمرین کن تا قوی‌تر شوی."}</p><button class="primary" onclick="goHome()">برگشت به نقشه</button></div>`;
 currentLesson=null;saveState();
}
function askAdmin(){
 const code=prompt("🔐 عدد رمز مدیریت را وارد کن:");
 if(code==="59"){show("admin");renderAdmin();toast("🛠️ حالت مدیریت فعال شد")}else if(code!==null)toast("⛔ رمز اشتباه است")
}
function renderAdmin(){
 const box=document.getElementById("adminLessons");
 box.innerHTML=DATA.lessons.map(l=>`<div class="admin-row"><span>${l.emoji||"📘"} ${l.title}</span><button onclick="removeLesson(${l.id})">حذف</button></div>`).join("");
}
function addLesson(){
 const title=document.getElementById("newTitle").value.trim()||"درس جدید";
 const summary=document.getElementById("newSummary").value.trim()||"درس جدید عربی هفتم";
 const grammar=document.getElementById("newGrammar").value.trim()||"قواعد این درس را اینجا اضافه کنید.";
 const id=Math.max(...DATA.lessons.map(x=>x.id),0)+1;
 DATA.lessons.push({id,title,emoji:"✨",summary,grammar,notes:[{title:"جزوه",body:"محتوای این درس را از پنل مدیریت یا فایل JSON تکمیل کنید."}],questions:[{q:"این یک سؤال نمونه است. گزینه درست کدام است؟",options:["گزینه ۱","گزینه ۲","گزینه ۳","گزینه ۴"],answer:0}]});
 saveData();renderAdmin();renderHome();toast("درس اضافه شد");
}
function removeLesson(id){if(confirm("این درس حذف شود؟")){DATA.lessons=DATA.lessons.filter(x=>x.id!==id);saveData();renderAdmin();renderHome()}}
function exportData(){
 const blob=new Blob([JSON.stringify(DATA,null,2)],{type:"application/json"}),a=document.createElement("a");
 a.href=URL.createObjectURL(blob);a.download="data.json";a.click();URL.revokeObjectURL(a.href);
}
function importData(e){
 const f=e.target.files[0];if(!f)return;const r=new FileReader();
 r.onload=()=>{try{DATA=JSON.parse(r.result);saveData();renderAdmin();renderHome();toast("JSON وارد شد")}catch{toast("JSON نامعتبر است")}};r.readAsText(f)
}
function resetLocal(){if(confirm("همه تغییرات محلی پاک شود؟")){localStorage.removeItem("arabic7_data");location.reload()}}
document.getElementById("adminBtn").onclick=askAdmin;
document.getElementById("themeBtn").onclick=()=>{document.body.classList.toggle("dark");localStorage.setItem("arabic7_dark",document.body.classList.contains("dark"))};
if(localStorage.getItem("arabic7_dark")==="true")document.body.classList.add("dark");
boot();
