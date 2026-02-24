/* game.js - 修正版（器具が常に DOM にある構成） */
"use strict";

/* ---------- state ---------- */
let world = 1; // 1 or 2
let state = 'title';
let playerHP = 100;
let bossHP = 100;
let selected = null;
let connections = []; // {a,b,path,color}
let sw1 = 0, sw2 = 0;

/* elements */
const board = document.getElementById("board");
const wireLayer = document.getElementById("wireLayer");
const playerBar = document.getElementById("playerHP");
const bossHPbar = document.getElementById("bossHPbar");
const devicesContainer = document.getElementById("devicesContainer");

const titleScreen = document.getElementById("titleScreen");
const quizScreen = document.getElementById("quizScreen");
const toQuiz = document.getElementById("toQuiz");
const answerBtn = document.getElementById("answerBtn");
const skipQuiz = document.getElementById("skipQuiz");
const quizQuestion = document.getElementById("quizQuestion");
const quizOptions = document.getElementById("quizOptions");
const quizIndex = document.getElementById("quizIndex");

const setBtn = document.getElementById("setBtn");
const resetWires = document.getElementById("resetWires");
const switchBtn = document.getElementById("switchBtn");
const restartBtn = document.getElementById("restart");

const bossImg = document.getElementById("bossImg");
const bossScreen = document.getElementById("bossScreen");
const bossPanel = document.getElementById("bossPanel");
const hitText = document.getElementById("hitText");

const bossCanvas = document.getElementById('bossCanvas');
const flashEl = document.getElementById('bossFlash');
const freezeSound = document.getElementById('freezeSound');
const explodeSound = document.getElementById('explodeSound');
const sfxHit = document.getElementById('sfxHit');
const sfxExplode = document.getElementById('sfxExplode');
const sfxSlow = document.getElementById('sfxSlow');
const overlay = document.getElementById('overlay');

/* helpers */
function updatePlayerHP(){ playerBar.style.width = Math.max(0, playerHP) + "%"; }
function updateBossHP(){ bossHPbar.style.width = Math.max(0, bossHP) + "%"; }
function setState(s){ state = s; document.getElementById('stateLabel').textContent = s; }

/* resize svg */
function resizeSVG(){
  const r = board.getBoundingClientRect();
  wireLayer.setAttribute("viewBox", `0 0 ${r.width} ${r.height}`);
  wireLayer.style.left = r.left + 'px';
  wireLayer.style.top = r.top + 'px';
  wireLayer.style.width = r.width + 'px';
  wireLayer.style.height = r.height + 'px';
}
window.addEventListener('resize', resizeSVG);
window.addEventListener('load', ()=>{ resizeSVG(); setTimeout(resizeSVG,120); });

/* ---------- quiz ---------- */
const questions = [
  {q:'電気で L は何を表す？', opts:['中性線','活線(L)','地線','照明'], correct:1},
  {q:'単相100Vの家庭用コンセントでLとNの意味は？', opts:['L=中性,N=活線','L=活線,N=中性','どちらも地線','L=地線,N=活線'], correct:1},
  {q:'接地(アース)の目的は？', opts:['電流を増やす','絶縁を破る','漏電時に安全に逃がす','スイッチの代わり'], correct:2},
  {q:'片切スイッチとは？', opts:['2か所で操作するスイッチ','1つの回路を入切するスイッチ','常時接続の端子','漏電遮断器'], correct:1},
  {q:'ジョイントボックスの役割は？', opts:['電気を貯める','配線を接続・保護する','電圧を上げる','照明を点ける'], correct:1}
];
let quizIdx = 0;
function renderQuiz(){
  const q = questions[quizIdx];
  quizQuestion.textContent = q.q;
  quizOptions.innerHTML = '';
  q.opts.forEach((opt,i)=>{
    const b = document.createElement('button');
    b.className = 'quizOpt small';
    b.textContent = opt;
    b.dataset.index = i;
    b.addEventListener('click', ()=>{
      document.querySelectorAll('.quizOpt').forEach(x=>x.classList.remove('chosen'));
      b.classList.add('chosen');
    });
    quizOptions.appendChild(b);
  });
  quizIndex.textContent = (quizIdx+1) + ' / ' + questions.length;
}
toQuiz.addEventListener('click', ()=>{ quizIdx=0; renderQuiz(); titleScreen.classList.remove('show'); quizScreen.classList.add('show'); setState('quiz'); });
skipQuiz.addEventListener('click', ()=>{ startWorld1(); });
answerBtn.addEventListener('click', ()=>{
  const chosen = Array.from(document.querySelectorAll('.quizOpt')).find(x=>x.classList.contains('chosen'));
  if(!chosen){ alert('選択肢を選んでください。'); return; }
  const selectedIndex = Number(chosen.dataset.index);
  const correctIndex = questions[quizIdx].correct;
  if(selectedIndex !== correctIndex){ playerHP = Math.max(0, playerHP - 10); updatePlayerHP(); }
  quizIdx++;
  if(quizIdx < questions.length) renderQuiz(); else startWorld1();
});

/* ---------- attach terminal handlers (shared) ---------- */
function terminalClickHandler(e){
  const t = e.currentTarget;
  if(state !== 'play') return;
  if(!selected){ selected = t; t.classList.add('selected'); showPreviewLine(t); return; }
  const prev = selected; prev.classList.remove('selected'); selected = null; removePreviewLine();
  connectTerminals(prev, t);
}
function attachAllTerminals(){ document.querySelectorAll('.terminal').forEach(t=>{ t.removeEventListener('click', terminalClickHandler); t.addEventListener('click', terminalClickHandler); }); }

/* ---------- preview (world1) ---------- */
let previewLine = null;
function showPreviewLine(t){
  removePreviewLine();
  const r = t.getBoundingClientRect();
  const br = board.getBoundingClientRect();
  const x1 = r.left - br.left + r.width/2;
  const y1 = r.top - br.top + r.height/2;
  previewLine = document.createElementNS("http://www.w3.org/2000/svg","line");
  previewLine.setAttribute("x1",x1); previewLine.setAttribute("y1",y1); previewLine.setAttribute("x2",x1); previewLine.setAttribute("y2",y1);
  previewLine.setAttribute("stroke","#fff"); previewLine.setAttribute("stroke-width","2"); previewLine.setAttribute("stroke-linecap","round");
  wireLayer.appendChild(previewLine);
  function move(e){
    const mx = (e.touches && e.touches[0])?e.touches[0].clientX:e.clientX;
    const my = (e.touches && e.touches[0])?e.touches[0].clientY:e.clientY;
    previewLine.setAttribute("x2", mx - br.left);
    previewLine.setAttribute("y2", my - br.top);
  }
  window.addEventListener('mousemove', move);
  window.addEventListener('touchmove', move, {passive:true});
  setTimeout(removePreviewLine, 3000);
}
function removePreviewLine(){ if(previewLine){ previewLine.remove(); previewLine = null; } }

/* ---------- connect (draw) ---------- */
function drawStraight(aEl,bEl,color,width){
  const r1 = aEl.getBoundingClientRect();
  const r2 = bEl.getBoundingClientRect();
  const br = board.getBoundingClientRect();
  const x1 = r1.left - br.left + r1.width/2;
  const y1 = r1.top - br.top + r1.height/2;
  const x2 = r2.left - br.left + r2.width/2;
  const y2 = r2.top - br.top + r2.height/2;
  const line = document.createElementNS("http://www.w3.org/2000/svg","line");
  line.setAttribute("x1",x1); line.setAttribute("y1",y1); line.setAttribute("x2",x2); line.setAttribute("y2",y2);
  line.setAttribute("stroke",color); line.setAttribute("stroke-width",width||4); line.setAttribute("stroke-linecap","round");
  wireLayer.appendChild(line);
  return line;
}
function drawCurved(aEl,bEl,color){
  const r1 = aEl.getBoundingClientRect();
  const r2 = bEl.getBoundingClientRect();
  const br = board.getBoundingClientRect();
  const x1 = r1.left - br.left + r1.width/2;
  const y1 = r1.top - br.top + r1.height/2;
  const x2 = r2.left - br.left + r2.width/2;
  const y2 = r2.top - br.top + r2.height/2;
  const mx = (x1+x2)/2;
  const my = (y1+y2)/2;
  const cx = mx;
  const cy = my - Math.min(80, Math.abs(y2-y1)*0.4);
  const path = document.createElementNS("http://www.w3.org/2000/svg","path");
  path.setAttribute("d", `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`);
  path.setAttribute("stroke", color);
  path.setAttribute("stroke-width", color === "#ffffff" ? "3" : (color === "#ff3b30" ? "4" : "5"));
  path.setAttribute("stroke-linecap","round");
  path.setAttribute("fill","none");
  wireLayer.appendChild(path);
  return path;
}

function connectTerminals(aEl,bEl){
  const idA = aEl.dataset.id, idB = bEl.dataset.id;
  if(!idA || !idB || idA===idB) return;
  const idx = connections.findIndex(c => (c.a===idA && c.b===idB) || (c.a===idB && c.b===idA));
  if(idx >= 0){ // toggle remove
    const ex = connections[idx]; if(ex.path && ex.path.remove) ex.path.remove(); connections.splice(idx,1); updateLamps(); return;
  }
  // choose color & shape by world
  let color = 'black', elPath=null, width=5;
  if(world===1){
    color = (idA.includes('-N')||idB.includes('-N')) ? '#ffffff' : '#000000';
    elPath = drawStraight(aEl,bEl,color, color==='#ffffff'?2:4);
  } else {
    // world2 color rules
    if( (idA==='sw1-T1' && idB==='sw2-T1') || (idB==='sw1-T1' && idA==='sw2-T1') ) color='#ffffff';
    else if( (idA==='sw1-T2' && idB==='sw2-T2') || (idB==='sw1-T2' && idA==='sw2-T2') ) color='#ff3b30';
    else if(idA.includes('-N')||idB.includes('-N')) color='#ffffff';
    else if(idA.includes('COM')||idB.includes('COM')) color='#000000';
    elPath = drawCurved(aEl,bEl,color);
  }
  connections.push({a:idA,b:idB,path:elPath,color});
  updateLamps();
}

/* ---------- simple connection helpers ---------- */
function connected(a,b){ return connections.some(c=> (c.a===a && c.b===b) || (c.a===b && c.b===a)); }

/* ---------- World1 simple checks ---------- */
function getLampIds(){ return ['lamp1','lamp2'].concat(Array.from(document.querySelectorAll("[id^='lamp-']")).map(el=>el.id)); }
function checkSolutionWorld1(){
  // require power-L connected to at least one junction terminal and that junction connects to both L and N of any lamp
  const jbAny = ["junction-1","junction-2","junction-3","junction-4","junction-5","junction-6"].some(j => connected("power-L", j));
  if(!jbAny) return false;
  const lamps = getLampIds();
  for(const lid of lamps){
    if( connected("junction-1", `${lid}-L`) && connected("junction-1", `${lid}-N`) ) return true;
  }
  return false;
}
function animateLinesForward(ms){
  return new Promise(res=>{
    const lines = Array.from(wireLayer.querySelectorAll("path,line"));
    if(lines.length===0){ setTimeout(res,ms); return; }
    lines.forEach(l=>{
      const len = l.getTotalLength ? l.getTotalLength() : Math.hypot(100,100);
      l.style.transition='none';
      l.style.strokeDasharray = len;
      l.style.strokeDashoffset = len;
      void l.getBoundingClientRect();
      l.style.transition = `stroke-dashoffset ${ms}ms linear`;
      l.style.strokeDashoffset = 0;
    });
    setTimeout(res, ms + 60);
  });
}

/* ---------- Boss sequence for World1 (simple) ---------- */
async function doBossSequenceWorld1(){
  document.getElementById('stateLabel').textContent = 'boss';
  bossScreen.style.display='flex';
  try{ freezeSound.currentTime=0; freezeSound.play().catch(()=>{}); } catch(e){}
  hitText.style.display='block'; hitText.textContent='HIT - 40';
  bossPanel.classList.add('boss-damage');
  await new Promise(r=>setTimeout(r,2000));
  bossPanel.classList.remove('boss-damage'); hitText.style.display='none';
  bossHP -= 40; updateBossHP();
  if(bossHP <= 0){
    // explosion + advance
    try{ explodeSound.currentTime=0; explodeSound.play().catch(()=>{}); } catch(e){}
    await new Promise(r=>setTimeout(r,700));
    bossScreen.style.display='none';
    // start world2
    startWorld2();
    return;
  }
  bossScreen.style.display='none';
  // clear wires for next round
  connections.forEach(c=>{ if(c.path && c.path.remove) c.path.remove(); });
  connections = []; selected = null; removePreviewLine();
}

/* ---------- World2 real checks & effects ---------- */
function hasNeutralPath(){
  return ["junction-1","junction-2","junction-3","junction-4","junction-5","junction-6"].some(j => connected("power-N", j));
}
function hasLoadPath(){
  return ["junction-1","junction-2","junction-3","junction-4","junction-5","junction-6"].some(j => connected("sw2-COM", j));
}
function junctionFeedsLampL(){
  const lamp1L = ["junction-1","junction-2","junction-3","junction-4","junction-5","junction-6"].some(j => connected(j,"lamp1-L"));
  const lamp2L = ["junction-1","junction-2","junction-3","junction-4","junction-5","junction-6"].some(j => connected(j,"lamp2-L"));
  return lamp1L && lamp2L;
}
function junctionFeedsLampN(){
  const lamp1N = ["junction-1","junction-2","junction-3","junction-4","junction-5","junction-6"].some(j => connected(j,"lamp1-N"));
  const lamp2N = ["junction-1","junction-2","junction-3","junction-4","junction-5","junction-6"].some(j => connected(j,"lamp2-N"));
  return lamp1N && lamp2N;
}
function checkWiringWorld2(){
  const cond1 = connected("power-L","sw1-COM");
  const cond2 = connected("sw1-T1","sw2-T1");
  const cond3 = connected("sw1-T2","sw2-T2");
  const cond4 = hasLoadPath();
  const cond5 = junctionFeedsLampL();
  const cond6 = hasNeutralPath();
  const cond7 = junctionFeedsLampN();
  return cond1 && cond2 && cond3 && cond4 && cond5 && cond6 && cond7;
}
function isThreeWayActive(){
  const leftOut = sw1 ? "sw1-T2" : "sw1-T1";
  const rightIn = sw2 ? "sw2-T2" : "sw2-T1";
  return connected(leftOut, rightIn);
}

/* ---------- update lamps (both worlds) ---------- */
function updateLamps(){
  if(world===1){
    const lampIds = getLampIds();
    lampIds.forEach(id=>{
      const el = document.getElementById(id);
      if(!el) return;
      const both = connected("junction-1", id + "-L") && connected("junction-1", id + "-N");
      el.classList.toggle('lit', both);
    });
  } else {
    const wiringOK = checkWiringWorld2();
    const active = wiringOK && isThreeWayActive() && hasLoadPath() && hasNeutralPath();
    document.getElementById("lamp1").classList.toggle("lit", active);
    document.getElementById("lamp2").classList.toggle("lit", active);
  }
}

/* ---------- boss effects (particles/flash/shake) ---------- */
let canvasCtx = null;
function ensureCanvas(){ if(!bossCanvas) return; bossCanvas.width = window.innerWidth; bossCanvas.height = window.innerHeight; canvasCtx = bossCanvas.getContext('2d'); }
window.addEventListener('resize', ensureCanvas); ensureCanvas();
function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }
function doScreenShake(duration=700){ document.body.classList.add('boss-shake'); return wait(duration).then(()=>document.body.classList.remove('boss-shake')); }
function doFlash(duration=380){ flashEl.style.display='block'; flashEl.style.opacity='1'; return wait(duration).then(()=>{ flashEl.style.opacity='0'; return wait(220); }).then(()=>{ flashEl.style.display='none'; }); }
function bossImgHitPulse(){ bossImg.classList.remove('boss-hit'); void bossImg.offsetWidth; bossImg.classList.add('boss-hit'); }
function spawnParticles(x,y,color='#ffd54a',count=40,spread=180){
  if(!canvasCtx) return;
  bossCanvas.style.display='block';
  const particles=[];
  for(let i=0;i<count;i++){
    const angle = (Math.random()*spread - spread/2) * Math.PI/180;
    const speed = 2 + Math.random()*6;
    particles.push({ x,y, vx: Math.cos(angle)*speed*(0.6+Math.random()), vy: Math.sin(angle)*speed*(0.6+Math.random()) - (Math.random()*2), life: 400 + Math.random()*700, size: 3 + Math.random()*8, color, born: performance.now() });
  }
  let raf;
  function tick(now){
    canvasCtx.clearRect(0,0,bossCanvas.width,bossCanvas.height);
    const alive=[];
    for(const p of particles){
      const t = now - p.born;
      if(t > p.life) continue;
      p.x += p.vx; p.y += p.vy; p.vy += 0.12;
      const alpha = 1 - (t / p.life);
      canvasCtx.globalAlpha = Math.max(0, alpha);
      canvasCtx.fillStyle = p.color;
      canvasCtx.beginPath();
      canvasCtx.ellipse(p.x,p.y,p.size,p.size*0.7,0,0,Math.PI*2);
      canvasCtx.fill();
      alive.push(p);
    }
    if(alive.length === 0){ cancelAnimationFrame(raf); bossCanvas.style.display='none'; canvasCtx.clearRect(0,0,bossCanvas.width,bossCanvas.height); return; }
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
}
async function playBossHitEffect({strong=false} = {}){
  try{ sfxHit.currentTime=0; sfxHit.play().catch(()=>{}); }catch(e){}
  doScreenShake(strong?900:600);
  bossImgHitPulse();
  const r = bossImg.getBoundingClientRect();
  spawnParticles(r.left + r.width/2, r.top + r.height/2, strong? '#ff6b6b':'#ffd54a', strong? 90:40, strong? 240:180);
  await doFlash(strong?500:300);
  if(strong) await doSlowMotion(700);
}
async function playBossDefeatEffect(){
  try{ sfxExplode.currentTime=0; sfxExplode.play().catch(()=>{}); }catch(e){}
  const r = bossImg.getBoundingClientRect();
  const cx = r.left + r.width/2, cy = r.top + r.height/2;
  for(let i=0;i<2;i++){ spawnParticles(cx,cy, i%2? '#ff3b30' : '#ffd54a', 180, 360); await doFlash(260 + i*120); await doScreenShake(380 + i*120); }
  bossImg.style.transition = 'transform 650ms ease, opacity 700ms ease'; bossImg.style.transform = 'scale(1.35) rotate(-6deg)'; bossImg.style.opacity = '0';
  flashEl.style.background = '#ffffff'; await doFlash(420); flashEl.style.background = '';
  await wait(600);
  if(canvasCtx){ canvasCtx.clearRect(0,0,bossCanvas.width,bossCanvas.height); bossCanvas.style.display='none'; }
  overlay.style.display='flex';
}
function doSlowMotion(duration=700){ try{ sfxSlow.currentTime=0; sfxSlow.play().catch(()=>{});}catch(e){} document.body.classList.add('slow-motion'); return wait(duration).then(()=>document.body.classList.remove('slow-motion')); }

/* ---------- SET button ---------- */
setBtn.addEventListener('click', async ()=>{
  if(world===1){
    if(!checkSolutionWorld1()){ playerHP = Math.max(0, playerHP - 20); updatePlayerHP(); if(playerHP<=0) alert('PLAYER HP 0'); return; }
    await animateLinesForward(1500);
    await doBossSequenceWorld1();
  } else {
    const lampLit = document.getElementById('lamp1').classList.contains('lit');
    if(!lampLit){ await doScreenShake(200); return; }
    const strong = bossHP <= 80;
    bossHP -= (strong?60:40); updateBossHP(); await playBossHitEffect({strong}); if(bossHP<=0) await playBossDefeatEffect();
  }
});

/* ---------- reset / restart ---------- */
resetWires.addEventListener('click', ()=>{
  connections.forEach(c=> { if(c.path && c.path.remove) c.path.remove(); });
  connections = []; selected = null; removePreviewLine(); updateLamps();
});
restartBtn.addEventListener('click', ()=>{
  world = 1; setState('title'); document.getElementById('worldLabel').textContent='1';
  playerHP = 100; bossHP = 100; updatePlayerHP(); updateBossHP();
  connections.forEach(c=>{ if(c.path && c.path.remove) c.path.remove(); }); connections = []; selected=null; removePreviewLine();
  // reset visuals
  document.getElementById('lamp1').classList.remove('lit'); document.getElementById('lamp2').classList.remove('lit');
  titleScreen.classList.add('show'); quizScreen.classList.remove('show');
});

/* ---------- switches ---------- */
document.getElementById('sw1Btn').addEventListener('click', ()=>{ sw1 ^= 1; updateLamps(); });
document.getElementById('sw2Btn').addEventListener('click', ()=>{ sw2 ^= 1; updateLamps(); });

/* ---------- start world1/world2 ---------- */
function startWorld1(){
  world = 1; document.getElementById('worldLabel').textContent='1'; setState('play'); titleScreen.classList.remove('show'); quizScreen.classList.remove('show');
  bossHP = 100; updateBossHP();
  // create a tutorial lamp (also lamp1/lamp2 are present) — make sure terminals exist
  // (we keep lamp1/lamp2 always present; additional dynamic lamps not necessary)
  attachAllTerminals();
  updateLamps();
}
function layoutWorld2(){
  // place devices by fraction so they don't get clipped
  const br = board.getBoundingClientRect();
  function place(id, fx, fy){ const e=document.getElementById(id); if(!e) return; e.style.left = Math.round(br.width*fx) + 'px'; e.style.top = Math.round(br.height*fy) + 'px'; }
  place('power', 0.5, 0.08); place('sw1', 0.18, 0.28); place('sw2', 0.82, 0.28); place('junction',0.5,0.46); place('lamp1',0.35,0.72); place('lamp2',0.65,0.72);
  resizeSVG();
}
function startWorld2(){
  world = 2; document.getElementById('worldLabel').textContent='2'; setState('play');
  bossHP = 160; updateBossHP();
  layoutWorld2(); attachAllTerminals(); updateLamps();
}

/* ---------- init ---------- */
updatePlayerHP(); updateBossHP(); setState('title'); resizeSVG(); attachAllTerminals();
window._G = { startWorld1, startWorld2, connections };
