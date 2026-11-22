"use strict";
/* بازی‌های عربی‌یار — فقط از واژه‌ها و سؤال‌های خود کتاب ساخته می‌شوند. */
const GAMES=[
  {id:"match",ico:"🔗",name:"وصل کن",desc:"واژهٔ عربی را به معنی‌اش وصل کن",tag:"۵ جفت • سریع باش"},
  {id:"memory",ico:"🧠",name:"حافظه",desc:"کارت‌ها را باز کن و جفت‌ها را پیدا کن",tag:"۶ جفت • کم‌حرکت‌تر بهتر"},
  {id:"builder",ico:"🔤",name:"کلمه‌ساز",desc:"حرف‌های بُر خورده را مرتب کن",tag:"۶ واژه • املا یاد می‌گیری"},
  {id:"speed",ico:"⏱️",name:"یک دقیقه",desc:"در ۶۰ ثانیه تا می‌توانی جواب بده",tag:"رکوردشکنی"},
  {id:"tf",ico:"⚡",name:"درست یا غلط",desc:"هر ادعا فقط ۶ ثانیه وقت دارد",tag:"۱۰ ادعا"},
  {id:"boss",ico:"👹",name:"غول واژه‌ها",desc:"با جواب‌های پشت‌سرهم غول را شکست بده",tag:"۳ جان • ضربهٔ ترکیبی"}
];
const G={timers:[],token:0};
function stopGames(){G.timers.forEach(t=>{clearInterval(t);clearTimeout(t)});G.timers=[];G.token++}
const later=(fn,ms)=>{const t=setTimeout(fn,ms);G.timers.push(t);return t};
const every=(fn,ms)=>{const t=setInterval(fn,ms);G.timers.push(t);return t};

function renderGames(){
  $("#gameCards").innerHTML=GAMES.map(g=>`<button class="game-card" onclick="startGame('${g.id}')"><div class="ico">${g.ico}</div><b>${g.name}</b><span>${g.desc}</span><em>${g.tag}${state.best[g.id]?` • رکورد ${fa(state.best[g.id])}`:""}</em></button>`).join("");
}
async function startGame(id){
  stopGames();
  const gate=await heartGate();if(gate==="no")return;
  G.free=gate==="free";
  const box=$("#arenaBox");box.onclick=null;box.scrollIntoView({behavior:state.anim?"smooth":"auto",block:"start"});
  ({match:matchGame,memory:memoryGame,builder:builderGame,speed:speedGame,tf:tfGame,boss:bossGame})[id](box);
}
/* پایان بازی: امتیاز، جایزه، رکورد */
function gameDone(box,id,{score,xp,coins,win=true,title,extra=""}){
  stopGames();
  state.stats.games++;state.daily.game++;
  const newBest=score>(state.best[id]||0);if(newBest)state.best[id]=score;
  if(!G.free){award(xp,coins,true);xpPop(`+${fa(xp)} امتیاز`)}save();beep(win?"win":"no");if(win)confetti();checkAchievements();renderTop();renderGames();
  box.innerHTML=`<div class="result"><div class="big">${win?"🏆":"💪"}</div><h2>${title||(win?"آفرین!":"تمرین کن، می‌شود!")}</h2><p>امتیاز: <b>${fa(score)}</b>${newBest&&score>0?" 🎉 رکورد تازه!":""}</p>${extra}
    <p class="muted">${G.free?"(حالت تمرین: بدون جایزه)":`+${fa(xp)} امتیاز • +${fa(coins)} سکه`}</p>
    <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="primary" onclick="startGame('${id}')">دوباره بازی کن</button><button class="ghost" onclick="$('#gameCards').scrollIntoView({behavior:'smooth'})">بازی دیگر</button></div></div>`;
}
const arSpan=t=>`<span class="ar">${esc(t)}</span>`;

/* یک سؤال چندگزینه‌ای با بازخورد و رفتن خودکار به بعدی */
function qCard(box,q,headHtml,cb,delay){
  box.innerHTML=`${headHtml}<div class="q-text">${q.html?q.q:esc(q.q)}</div><div class="options">${q.opts.map((o,j)=>`<button data-j="${j}">${q.arOpts?`<span class="ar" style="font-size:24px">${esc(o)}</span>`:esc(o)}</button>`).join("")}</div><div id="fb"></div>`;
  const btns=$$("#arenaBox .options button");let locked=false;const tk=G.token;
  btns.forEach(b=>b.onclick=()=>{
    if(locked||tk!==G.token)return;locked=true;const j=+b.dataset.j,ok=j===q.a;
    btns.forEach(x=>x.disabled=true);btns[q.a].classList.add("right");if(!ok){btns[j].classList.add("wrong");recordMistake(q)}
    state.stats[ok?"correct":"wrong"]++;beep(ok?"ok":"no");
    if(delay>=700)$("#fb").innerHTML=`<div class="feedback ${ok?'ok':'no'}">${ok?"✅ درست!":"❌ نه"} ${esc(q.exp||"")}</div>`;
    later(()=>{if(tk===G.token)cb(ok)},delay);
  });
}
const allVocabQs=n=>{const out=[];let guard=0;while(out.length<n&&guard++<n*6){const v=VOCAB[Math.random()*VOCAB.length|0];const q=vocabQuestion(v,VOCAB);if(q&&!out.some(o=>o.key===q.key))out.push(q)}return out};
const mixedQs=n=>{
  const gram=DATA.units.flatMap(u=>u.quiz.filter(q=>!q.q.startsWith("در واژه‌نامهٔ")).map(q=>({...shuffleQ(q),unit:u.number,key:"g:"+q.q})));
  return shuffle([...pick(gram,Math.min(gram.length,Math.round(n/3))),...allVocabQs(n)]).slice(0,n);
};

/* ۱) وصل کن */
function matchGame(box){
  const seenA=new Set(),seenF=new Set(),pool=shuffle(VOCAB).filter(v=>{const a=norm(v.ar),f=v.fa;if(seenA.has(a)||seenF.has(f))return false;seenA.add(a);seenF.add(f);return true}).slice(0,5);
  let sel=null,left=pool.length,errors=0,t0=Date.now(),L=shuffle(pool),R=shuffle(pool);const tk=G.token;
  box.innerHTML=`<div class="q-head"><h2>🔗 وصل کن</h2><span class="tag" id="mtime">۰ ثانیه</span></div><div class="match"><div id="mL"></div><div id="mR"></div></div>`;
  const draw=()=>{
    $("#mL").innerHTML=L.map((v,i)=>`<button data-s="L" data-i="${i}" class="ar ${v.gone?'gone':''} ${sel&&sel.s==='L'&&sel.i===i?'sel':''}" style="font-size:24px">${esc(v.ar)}</button>`).join("");
    $("#mR").innerHTML=R.map((v,i)=>`<button data-s="R" data-i="${i}" class="${v.gone?'gone':''} ${sel&&sel.s==='R'&&sel.i===i?'sel':''}">${esc(v.fa)}</button>`).join("");
  };
  draw();every(()=>{const e=$("#mtime");if(e&&tk===G.token)e.textContent=fa(Math.round((Date.now()-t0)/1000))+" ثانیه"},500);
  box.onclick=e=>{
    const b=e.target.closest("button[data-s]");if(!b||tk!==G.token)return;const s=b.dataset.s,i=+b.dataset.i,item=(s==="L"?L:R)[i];if(item.gone)return;
    if(!sel||sel.s===s){sel={s,i};beep("tick");draw();return}
    const other=(sel.s==="L"?L:R)[sel.i];
    if(other.id===item.id){other.gone=item.gone=true;left--;sel=null;beep("ok");draw();
      if(!left){const sec=Math.round((Date.now()-t0)/1000),score=Math.max(10,100-sec-errors*8);
        later(()=>gameDone(box,"match",{score,xp:20+(errors<2?15:0),coins:8+(errors<2?6:0),extra:`<p>${fa(sec)} ثانیه • ${fa(errors)} اشتباه</p>`}),400)}}
    else{errors++;beep("no");const bs=$$("#mL button,#mR button");[...bs].forEach(x=>{if((x.dataset.s===sel.s&&+x.dataset.i===sel.i)||x===b)x.classList.add("err")});sel=null;later(draw,420)}
  };
}

/* ۲) حافظه */
function memoryGame(box){
  const seen=new Set(),pool=shuffle(VOCAB).filter(v=>{if(seen.has(norm(v.ar))||seen.has(v.fa))return false;seen.add(norm(v.ar));seen.add(v.fa);return true}).slice(0,6);
  const deck=shuffle(pool.flatMap(v=>[{id:v.id,t:v.ar,ar:true},{id:v.id,t:v.fa}]));let open=[],matched=[],moves=0,lock=false;const tk=G.token;
  const draw=()=>{box.innerHTML=`<div class="q-head"><h2>🧠 حافظه</h2><span class="tag">حرکت: ${fa(moves)} • جفت: ${fa(matched.length/2)}/6</span></div><div class="memory-grid">${deck.map((c,i)=>{const on=open.includes(i),dn=matched.includes(i);
    return `<button class="memory-card ${on?'open':''} ${dn?'done':''}" data-i="${i}">${on||dn?(c.ar?arSpan(c.t):esc(c.t)):"?"}</button>`}).join("")}</div>`;
    $$("#arenaBox .memory-card").forEach(b=>b.onclick=()=>pickCard(+b.dataset.i))};
  const pickCard=i=>{
    if(lock||tk!==G.token||open.includes(i)||matched.includes(i))return;open.push(i);beep("tick");draw();if(open.length<2)return;
    moves++;lock=true;const[a,b]=open;
    if(deck[a].id===deck[b].id){matched.push(a,b);open=[];lock=false;beep("ok");draw();
      if(matched.length===12){const score=Math.max(10,120-moves*6);later(()=>gameDone(box,"memory",{score,xp:20+(moves<=10?15:0),coins:8+(moves<=10?6:0),extra:`<p>${fa(moves)} حرکت</p>`}),500)}}
    else later(()=>{open=[];lock=false;draw()},800);
  };
  draw();
}

/* ۳) کلمه‌ساز */
function builderGame(box){
  const cand=VOCAB.filter(v=>{const s=stripAr(v.ar);return !/\s/.test(s)&&s.length>=3&&s.length<=6});
  const words=shuffle(cand).slice(0,6);let wi=0,got=[],score=0,skipped=0,avail=[];const tk=G.token;
  const next=()=>{
    if(wi>=words.length)return gameDone(box,"builder",{score:score*15,xp:15+score*4,coins:5+score*2,win:score>=3,extra:`<p>${fa(score)} از ${fa(words.length)} را درست ساختی</p>`});
    const w=words[wi],target=Array.from(stripAr(w.ar));got=[];avail=shuffle(target.map((c,i)=>({c,i,used:false})));
    if(avail.length>1&&avail.map(x=>x.c).join("")===target.join(""))avail.reverse();
    draw();
  };
  const draw=()=>{
    const w=words[wi],n=Array.from(stripAr(w.ar)).length;
    box.innerHTML=`<div class="q-head"><h2>🔤 کلمه‌ساز</h2><span class="tag">${fa(wi+1)} از ${fa(words.length)}</span></div>
      <p style="text-align:center;font-size:20px;font-weight:700;margin:4px 0">معنی: ${esc(w.fa)}</p>
      <div class="slots">${Array.from({length:n},(_,k)=>`<span class="${got[k]?'f':''}">${got[k]?esc(got[k].c):""}</span>`).join("")}</div>
      <div class="letters">${avail.map((a,k)=>`<button data-k="${k}" ${a.used?"disabled":""}>${esc(a.c)}</button>`).join("")}</div>
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="ghost" id="bUndo">↩️ پاک کن</button><button class="ghost" id="bHint">💡 راهنما (-۱ امتیاز)</button><button class="ghost" id="bSkip">رد شو</button></div><div id="fb" style="text-align:center"></div>`;
    $$("#arenaBox .letters button").forEach(b=>b.onclick=()=>tap(+b.dataset.k));
    $("#bUndo").onclick=()=>{const l=got.pop();if(l){l.used=false;draw()}};
    $("#bSkip").onclick=()=>{skipped++;wi++;next()};
    $("#bHint").onclick=()=>{const t=Array.from(stripAr(w.ar));$("#fb").innerHTML=`<div class="feedback ok">حرف اول: <span class="ar" style="font-size:26px">${esc(t[0])}</span> • ${fa(t.length)} حرف</div>`;w.hint=true};
  };
  const tap=k=>{
    if(tk!==G.token)return;const a=avail[k];if(!a||a.used)return;a.used=true;got.push(a);beep("tick");
    const w=words[wi],target=Array.from(stripAr(w.ar));
    if(got.length<target.length)return draw();
    draw();
    if(got.map(x=>x.c).join("")===target.join("")){
      score+=w.hint?0.5:1;beep("ok");award(5,2);state.stats.correct++;
      $("#fb").innerHTML=`<div class="feedback ok">✅ آفرین! ${arSpan(w.ar)} = ${esc(w.fa)}</div>`;speak(w.ar);later(()=>{wi++;next()},1300);
    }else{
      beep("no");state.stats.wrong++;$("#fb").innerHTML=`<div class="feedback no">❌ درست نشد؛ دوباره امتحان کن.</div>`;
      later(()=>{got.forEach(x=>x.used=false);got=[];draw()},900);
    }
  };
  next();
}

/* ۴) یک دقیقه */
function speedGame(box){
  let left=60,score=0,wrong=0;const tk=G.token,qs=allVocabQs(80);let qi=0;
  const draw=()=>{
    if(qi>=qs.length)return end();
    qCard(box,qs[qi],`<div class="q-head"><h2>⏱️ یک دقیقه</h2><span class="tag" id="sT">${fa(left)} ثانیه • ✅ ${fa(score)}</span></div><div class="timer"><i id="tbar" style="width:${left/60*100}%"></i></div>`,ok=>{if(ok)score++;else wrong++;qi++;draw()},ok_delay);
  };
  const ok_delay=450;
  const end=()=>gameDone(box,"speed",{score,xp:10+score*3,coins:4+score,win:score>=8,extra:`<p>${fa(score)} درست • ${fa(wrong)} غلط</p>`});
  every(()=>{if(tk!==G.token)return;left--;const t=$("#sT"),b=$("#tbar");if(t)t.textContent=`${fa(Math.max(0,left))} ثانیه • ✅ ${fa(score)}`;if(b)b.style.width=Math.max(0,left)/60*100+"%";if(left<=0)end()},1000);
  draw();
}

/* ۵) درست یا غلط */
function tfGame(box){
  const items=pick(VOCAB,10);let i=0,score=0;const tk=G.token;
  const draw=()=>{
    if(i>=items.length)return gameDone(box,"tf",{score:score*10,xp:10+score*3,coins:4+score,win:score>=7,extra:`<p>${fa(score)} از ${fa(items.length)} درست</p>`});
    const v=items[i],truth=Math.random()<.5;let shown=v.fa;
    if(!truth){const o=shuffle(VOCAB.filter(x=>x.fa!==v.fa&&norm(x.ar)!==norm(v.ar)))[0];shown=o.fa}
    box.innerHTML=`<div class="q-head"><h2>⚡ درست یا غلط</h2><span class="tag">${fa(i+1)} از ${fa(items.length)} • ✅ ${fa(score)}</span></div><div class="timer"><i id="tbar" style="transition:width 6s linear"></i></div>
      <div class="q-text" style="text-align:center">${arSpan(v.ar)}<br>یعنی «${esc(shown)}»؟</div><div class="options" style="grid-template-columns:1fr 1fr"><button data-a="1">✅ درست</button><button data-a="0">❌ غلط</button></div><div id="fb"></div>`;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{const b=$("#tbar");if(b)b.style.width="0%"}));
    let done=false;
    const resolve=(ans)=>{if(done||tk!==G.token)return;done=true;const ok=ans===truth;
      $$("#arenaBox .options button").forEach(b=>b.disabled=true);
      if(ok){score++;beep("ok")}else{beep("no");recordMistake({key:"tf:"+v.id,q:`«${v.ar}» یعنی چه؟`,opts:[v.fa,...shuffle(VOCAB.filter(x=>x.fa!==v.fa).map(x=>x.fa)).slice(0,3)],a:0,exp:`${v.ar} = ${v.fa}`,unit:v.unit});
        state.stats.wrong++}
      if(ok)state.stats.correct++;
      $("#fb").innerHTML=`<div class="feedback ${ok?'ok':'no'}">${ok?"✅ درست گفتی":"❌ نه"} — ${esc(v.ar)} = ${esc(v.fa)}</div>`;save();
      later(()=>{i++;draw()},1100)};
    $$("#arenaBox .options button").forEach(b=>b.onclick=()=>resolve(b.dataset.a==="1"));
    later(()=>resolve(null),6000);
  };
  draw();
}

/* ۶) غول واژه‌ها */
function bossGame(box){
  const qs=mixedQs(14);let i=0,hp=100,lives=3,combo=0,hits=0;const tk=G.token;
  const draw=()=>{
    if(hp<=0)return gameDone(box,"boss",{score:100+lives*20,xp:45,coins:20,title:"غول را شکست دادی! 👑",extra:`<p>${fa(lives)} جان باقی ماند</p>`});
    if(lives<=0||i>=qs.length)return gameDone(box,"boss",{score:100-hp,xp:12,coins:4,win:false,title:"غول هنوز زنده است!",extra:`<p>${fa(hp)}٪ از جان غول مانده — دوباره بجنگ</p>`});
    const head=`<div class="boss"><div class="face">${hp<35?"🥵":hp<70?"😠":"👹"}</div><div style="flex:1"><div class="bar"><i style="width:${hp}%"></i></div><small class="muted">جان غول: ${fa(Math.max(0,hp))}٪</small></div><div>${"❤️".repeat(lives)}${"🖤".repeat(3-lives)}</div></div>${combo>1?`<div class="combo" style="margin-bottom:6px">🔥 ضربهٔ ترکیبی ×${fa(combo)}</div>`:""}`;
    qCard(box,qs[i],head,ok=>{
      if(ok){combo++;hp-=Math.min(26,12+combo*3)}else{combo=0;lives--}
      i++;draw();
    },1000);
  };
  draw();
}
