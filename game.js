"use strict";

/* ------- state ------- */
let world = 1;
let state = 'title';
let playerHP = 100;
let bossHP = 100;
let selected = null;
let connections = [];
let sw1 = 0, sw2 = 0;

/* DOM */
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

/* SVG resize */
function resizeSVG(){
  const r = board.getBoundingClientRect();
  wireLayer.setAttribute("viewBox", `0 0 ${r.width} ${r.height}`);
  wireLayer.style.left = r.left + 'px';
  wireLayer.style.top = r.top + 'px';
  wireLayer.style.width = r.width + 'px';
  wireLayer.style.height = r.height + 'px';
}

/* ---------- Layout: percentage-based + clamped ---------- */
const layoutMap = {
  power: [0.50, 0.12],
  sw1:   [0.18, 0.30],
  sw2:   [0.82, 0.30],
  junction: [0.50, 0.46],
  lamp1: [0.33, 0.72],
  lamp2: [0.67, 0.72],
};

function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

function placePercent(id, fx, fy){
  const el = document.getElementById(id);
  if(!el) return;
  // apply safety margins so items do not get under header or controls
  const safeX = clamp(fx, 0.08, 0.92);
  const safeY = clamp(fy, 0.08, 0.86);
  el.style.left = (safeX * 100) + '%';
  el.style.top  = (safeY * 100) + '%';
}

function layoutAll(){
  // place each element by % (works independent of pixel measurement timing)
  Object.keys(layoutMap).forEach(k=>{
    placePercent(k, layoutMap[k][0], layoutMap[k][1]);
  });
  // also ensure board svg coords up to date
  resizeSVG();
  // reattach terminals and redraw wires (because viewBox changed)
  attachAllTerminals();
  // recalc existing connection paths: easiest is to remove and redraw
  const current = connections.slice(); // copy
  connections.forEach(c=>{ if(c.path && c.path.remove) c.path.remove(); });
  connections = [];
  // redraw from saved pairs (recreate simple straight or curved)
  current.forEach(c => {
    const aEl = document.querySelector(`.terminal[data-id="${c.a}"]`);
    const bEl = document.querySelector(`.terminal[data-id="${c.b}"]`);
    if(aEl && bEl) connectTerminals(aEl, bEl);
  });
}

/* call layoutAll on load and resize */
window.addEventListener('resize', ()=>{ layoutAll(); });
window.addEventListener('load', ()=>{ setTimeout(()=>{ layoutAll(); }, 80); });

/* ---------- terminals / preview / connect (same approach as before) ---------- */
function terminalClickHandler(e){
  const t = e.currentTarget;
  if(state !== 'play') return;
  if(!selected){ selected = t; t.classList.add('selected'); showPreviewLine(t); return; }
  const prev = selected; prev.classList.remove('selected'); selected = null; removePreviewLine();
  connectTerminals(prev, t);
}
function attachAllTerminals(){ document.querySelectorAll('.terminal').forEach(t=>{ t.removeEventListener('click', terminalClickHandler); t.addEventListener('click', terminalClickHandler); }); }

/* preview */
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

/* draw helpers */
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

/* connect */
function connectTerminals(aEl,bEl){
  const idA = aEl.dataset.id, idB = bEl.dataset.id;
  if(!idA || !idB || idA===idB) return;
  const idx = connections.findIndex(c => (c.a===idA && c.b===idB) || (c.a===idB && c.b===idA));
  if(idx >= 0){ const ex = connections[idx]; if(ex.path && ex.path.remove) ex.path.remove(); connections.splice(idx,1); updateLamps(); return; }
  let color = '#000000', path;
  if(world===1){
    color = (idA.includes('-N')||idB.includes('-N')) ? '#ffffff' : '#000000';
    path = drawStraight(aEl,bEl,color, color==='#ffffff'?2:4);
  } else {
    // world2 color rules (COM=black, T1=white, T2=red, N=white)
    if( (idA==='sw1-T1' && idB==='sw2-T1') || (idB==='sw1-T1' && idA==='sw2-T1') ) color='#ffffff';
    else if( (idA==='sw1-T2' && idB==='sw2-T2') || (idB==='sw1-T2' && idA==='sw2-T2') ) color='#ff3b30';
    else if(idA.includes('-N')||idB.includes('-N')) color='#ffffff';
    else if(idA.includes('COM')||idB.includes('COM')) color='#000000';
    path = drawCurved(aEl,bEl,color);
  }
  connections.push({a:idA,b:idB,path,color});
  updateLamps();
}

/* helpers */
function connected(a,b){ return connections.some(c=> (c.a===a && c.b===b) || (c.a===b && c.b===a)); }

/* ---------- World1 simple logic ---------- */
function getLampIds(){ return ['lamp1','lamp2']; /* dynamic lamps optional */ }
function checkSolutionWorld1(){
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
      const len = l.getTotalLength ? l.getTotalLength() : 200;
      l.style.transition='none'; l.style.strokeDasharray = len; l.style.strokeDashoffset = len;
      void l.getBoundingClientRect();
      l.style.transition = `stroke-dashoffset ${ms}ms linear`; l.style.strokeDashoffset = 0;
    });
    setTimeout(res, ms + 60);
  });
}

/* ---------- World1 boss sequence ---------- */
async function doBossSequenceWorld1(){
  document.getElementById('stateLabel').textContent = 'boss';
  bossScreen.style.display='flex';
  try{ freezeSound.currentTime=0; freezeSound.play().catch(()=>{}); }catch(e){}
  hitText.style.display='block'; hitText.textContent='HIT - 40';
  bossPanel.classList.add('boss-damage');
  await new Promise(r=>setTimeout(r,2000));
  bossPanel.classList.remove('boss-damage'); hitText.style.display='none';
  bossHP -= 40; updateBossHP();
  if(bossHP <= 0){
    try{ explodeSound.currentTime=0; explodeSound.play().catch(()=>{}); }catch(e){}
    bossScreen.style.display='none';
    startWorld2();
    return;
  }
  bossScreen.style.display='none';
  // clear wires
  connections.forEach(c=>{ if(c.path && c.path.remove) c.path.remove(); }); connections=[];
  selected = null; removePreviewLine();
}

/* ---------- World2 wiring checks & lamp update ---------- */
function hasNeutralPath(){
  return ["junction-1","junction-2","junction-3","junction-4","junction-5","junction-6"].some(j => connected("power-N", j));
}
function hasLoadPath(){
  return ["junction-1","junction-2","junction-3","junction-4","junction-5","junction-6"].some(j => connected("sw2-COM", j));
}
function junctionFeedsLampL(){
  return ["junction-1","junction-2","junction-3","junction-4","junction-5","junction-6"].some(j => connected(j,"lamp1-L"))
      && ["junction-1","junction-2","junction-3","junction-4","junction-5","junction-6"].some(j => connected(j,"lamp2-L"));
}
function junctionFeedsLampN(){
  return ["junction-1","junction-2","junction-3","junction-4","junction-5","junction-6"].some(j => connected(j,"lamp1-N"))
      && ["junction-1","junction-2","junction-3","junction-4","junction-5","junction-6"].some(j => connected(j,"lamp2-N"));
}
function isThreeWayActive(){ const leftOut = sw1 ? "sw1-T2" : "sw1-T1"; const rightIn = sw2 ? "sw2-T2" : "sw2-T1"; return connected(leftOut, rightIn); }
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
function updateLamps(){
  if(world===1){
    getLampIds().forEach(id=>{
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

/* ---------- boss effects (kept as before, not repeated here to shorten) ---------- */
/* for brevity assume spawnParticles/doFlash/doScreenShake/playBossHitEffect/playBossDefeatEffect exist
   (they can be copied from the prior version if you need the full particle code) */

/* ---------- SET button ---------- */
setBtn.addEventListener('click', async ()=>{
  if(world===1){
    if(!checkSolutionWorld1()){ playerHP = Math.max(0, playerHP - 20); updatePlayerHP(); if(playerHP<=0) alert('PLAYER HP 0'); return; }
    await animateLinesForward(1500);
    await doBossSequenceWorld1();
  } else {
    const lampLit = document.getElementById('lamp1').classList.contains('lit');
    if(!lampLit){ /* small feedback */ return; }
    const strong = bossHP <= 80;
    bossHP -= (strong?60:40); updateBossHP();
    // play boss hit (implement effects as before)
    // here we only update HP (effects code previously provided can be pasted)
    if(bossHP <= 0){
      // defeat effects (previous implementation)
    }
  }
});

/* reset/restart */
resetWires.addEventListener('click', ()=>{
  connections.forEach(c=>{ if(c.path && c.path.remove) c.path.remove(); });
  connections = []; selected=null; removePreviewLine(); updateLamps();
});
restartBtn.addEventListener('click', ()=>{
  world=1; setState('title'); document.getElementById('worldLabel').textContent='1';
  playerHP=100; bossHP=100; updatePlayerHP(); updateBossHP();
  connections.forEach(c=>{ if(c.path && c.path.remove) c.path.remove(); }); connections=[];
  selected=null; removePreviewLine();
  document.getElementById('lamp1').classList.remove('lit'); document.getElementById('lamp2').classList.remove('lit');
  titleScreen.classList.add('show'); quizScreen.classList.remove('show');
});

/* switches */
document.getElementById('sw1Btn').addEventListener('click', ()=>{ sw1 ^= 1; updateLamps(); });
document.getElementById('sw2Btn').addEventListener('click', ()=>{ sw2 ^= 1; updateLamps(); });

/* start world functions */
function startWorld1(){
  world=1; document.getElementById('worldLabel').textContent='1';
  titleScreen.classList.remove('show'); quizScreen.classList.remove('show'); setState('play');
  bossHP=100; updateBossHP();
  attachAllTerminals(); layoutAll(); updateLamps();
}
function startWorld2(){
  world=2; document.getElementById('worldLabel').textContent='2'; setState('play');
  bossHP=160; updateBossHP();
  layoutAll(); attachAllTerminals(); updateLamps();
}

/* quiz setup (same as before) */
const questions = [
  {q:'電気で L は何を表す？', opts:['中性線','活線(L)','地線','照明'], correct:1},
  {q:'単相100Vの家庭用コンセントでLとNの意味は？', opts:['L=中性,N=活線','L=活線,N=中性','どちらも地線','L=地線,N=活線'], correct:1},
  {q:'接地(アース)の目的は？', opts:['電流を増やす','絶縁を破る','漏電時に安全に逃がす','スイッチの代わり'], correct:2},
  {q:'片切スイッチとは？', opts:['2か所で操作するスイッチ','1つの回路を入切するスイッチ','常時接続の端子','漏電遮断器'], correct:1},
  {q:'ジョイントボックスの役割は？', opts:['電気を貯める','配線を接続・保護する','電圧を上げる','照明を点ける'], correct:1}
];
let quizIdx = 0;
function renderQuiz(){ const q = questions[quizIdx]; quizQuestion.textContent=q.q; quizOptions.innerHTML=''; q.opts.forEach((opt,i)=>{ const b=document.createElement('button'); b.className='quizOpt small'; b.textContent=opt; b.dataset.index=i; b.addEventListener('click', ()=>{ document.querySelectorAll('.quizOpt').forEach(x=>x.classList.remove('chosen')); b.classList.add('chosen'); }); quizOptions.appendChild(b); }); quizIndex.textContent=(quizIdx+1)+' / '+questions.length; }
toQuiz.addEventListener('click', ()=>{ quizIdx=0; renderQuiz(); titleScreen.classList.remove('show'); quizScreen.classList.add('show'); setState('quiz'); });
skipQuiz.addEventListener('click', ()=>{ startWorld1(); });
answerBtn.addEventListener('click', ()=>{ const chosen = Array.from(document.querySelectorAll('.quizOpt')).find(x=>x.classList.contains('chosen')); if(!chosen){ alert('選択肢を選んでください。'); return; } const selectedIndex = Number(chosen.dataset.index); const correctIndex = questions[quizIdx].correct; if(selectedIndex !== correctIndex){ playerHP = Math.max(0, playerHP - 10); updatePlayerHP(); } quizIdx++; if(quizIdx < questions.length) renderQuiz(); else startWorld1(); });

/* init */
updatePlayerHP(); updateBossHP(); setState('title'); resizeSVG(); layoutAll(); attachAllTerminals();
window._G = { layoutAll, connections };
