"use strict";

/* ---------- state ---------- */
let world = 1; // 1 or 2
let state = 'title';
let playerHP = 100;
let bossHP = 100;
let selected = null;
let connections = []; // {a,b,color,shadowEl,mainEl}
let sw1 = 0, sw2 = 0;

/* ---------- DOM refs ---------- */
const board = document.getElementById("board");
const wireLayer = document.getElementById("wireLayer");
const playerBar = document.getElementById("playerHP");
const bossHPbar = document.getElementById("bossHPbar");

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
const restartBtn = document.getElementById("restart");
const switchBtn = document.getElementById("switchBtn");

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

/* ---------- helpers ---------- */
function setState(s){ state = s; document.getElementById('stateLabel').textContent = s; }
function updatePlayerHP(){ playerBar.style.width = Math.max(0,playerHP) + '%'; }
function updateBossHP(){ bossHPbar.style.width = Math.max(0,bossHP) + '%'; }

function resizeSVG(){
  const r = board.getBoundingClientRect();
  wireLayer.setAttribute("viewBox", `0 0 ${r.width} ${r.height}`);
  wireLayer.style.left = r.left + 'px';
  wireLayer.style.top = r.top + 'px';
  wireLayer.style.width = r.width + 'px';
  wireLayer.style.height = r.height + 'px';
}

/* layout map (percent) */
const layoutMap = {
  power: [0.50, 0.12],
  sw1:   [0.16, 0.28],
  sw2:   [0.84, 0.28],
  junction: [0.50, 0.42],
  lamp1: [0.33, 0.68],
  lamp2: [0.67, 0.68]
};
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
function placePercent(id, fx, fy){
  const el = document.getElementById(id); if(!el) return;
  const safeX = clamp(fx, 0.06, 0.94);
  const safeY = clamp(fy, 0.10, 0.80);
  el.style.left = (safeX*100) + '%';
  el.style.top  = (safeY*100) + '%';
}

/* layoutAll: set % positions and rebuild wires visually */
function layoutAll(){
  Object.keys(layoutMap).forEach(k => placePercent(k, layoutMap[k][0], layoutMap[k][1]));
  // update svg coords
  resizeSVG();
  // redraw existing connections (remove then redraw without duplicating array)
  const copy = connections.map(c => ({a:c.a,b:c.b,color:c.color}));
  connections.forEach(c => { if(c.shadowEl) c.shadowEl.remove(); if(c.mainEl) c.mainEl.remove(); });
  connections = [];
  copy.forEach(c => {
    const aEl = document.querySelector(`.terminal[data-id="${c.a}"]`);
    const bEl = document.querySelector(`.terminal[data-id="${c.b}"]`);
    if(aEl && bEl) drawConnection(aEl,bEl,c.color);
  });
}

/* run on load/resize */
window.addEventListener('resize', ()=>{ layoutAll(); });
window.addEventListener('load', ()=>{ setTimeout(()=>{ layoutAll(); }, 60); });

/* ---------- terminal attach & preview ---------- */
function attachAllTerminals(){
  document.querySelectorAll('.terminal').forEach(t=>{
    t.removeEventListener('click', onTerminalClick);
    t.addEventListener('click', onTerminalClick);
  });
}
function determineColorForTerminalId(id){
  if(world===1){
    if(id.includes('-N')) return getComputedStyle(document.documentElement).getPropertyValue('--wire-white').trim() || '#ffffff';
    return getComputedStyle(document.documentElement).getPropertyValue('--wire-black').trim() || '#111';
  } else {
    if(id.includes('T2')) return getComputedStyle(document.documentElement).getPropertyValue('--wire-red').trim() || '#ff3b30';
    if(id.includes('T1')) return getComputedStyle(document.documentElement).getPropertyValue('--wire-white').trim() || '#ffffff';
    if(id.includes('N')) return getComputedStyle(document.documentElement).getPropertyValue('--wire-white').trim() || '#ffffff';
    return getComputedStyle(document.documentElement).getPropertyValue('--wire-black').trim() || '#111';
  }
}

/* previewLine persistent until next action */
let preview = null;
function showPreviewLineFrom(el){
  removePreviewLine();
  const r = el.getBoundingClientRect();
  const br = board.getBoundingClientRect();
  const x1 = r.left - br.left + r.width/2;
  const y1 = r.top - br.top + r.height/2;
  // preview color based on starting terminal
  const color = determineColorForTerminalId(el.dataset.id);
  // shadow
  const shadow = document.createElementNS("http://www.w3.org/2000/svg","path");
  shadow.setAttribute("stroke", "#000");
  shadow.setAttribute("stroke-width", 8);
  shadow.setAttribute("stroke-linecap","round");
  shadow.setAttribute("fill","none");
  // main
  const main = document.createElementNS("http://www.w3.org/2000/svg","path");
  main.setAttribute("stroke", color);
  main.setAttribute("stroke-width", color === '#ffffff' ? 3 : 4);
  main.setAttribute("stroke-linecap","round");
  main.setAttribute("fill","none");
  wireLayer.appendChild(shadow);
  wireLayer.appendChild(main);
  preview = {startEl:el, shadow, main, br, x1, y1};
  // mousemove/touchmove update
  function move(e){
    const mx = (e.touches && e.touches[0])? e.touches[0].clientX : e.clientX;
    const my = (e.touches && e.touches[0])? e.touches[0].clientY : e.clientY;
    const x2 = mx - br.left, y2 = my - br.top;
    const cx = (x1 + x2)/2, cy = (y1 + y2)/2 - 40;
    const d = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
    shadow.setAttribute('d', d);
    main.setAttribute('d', d);
  }
  window.addEventListener('mousemove', move);
  window.addEventListener('touchmove', move, {passive:true});
  preview.moveHandler = move;
}
function removePreviewLine(){
  if(!preview) return;
  try{ window.removeEventListener('mousemove', preview.moveHandler); window.removeEventListener('touchmove', preview.moveHandler); }catch(e){}
  if(preview.shadow) preview.shadow.remove();
  if(preview.main) preview.main.remove();
  preview = null;
}

/* ---------- draw connection (shadow + main) ---------- */
function drawPathBetween(aEl,bEl, color){
  const r1 = aEl.getBoundingClientRect(), r2 = bEl.getBoundingClientRect(), br = board.getBoundingClientRect();
  const x1 = r1.left - br.left + r1.width/2, y1 = r1.top - br.top + r1.height/2;
  const x2 = r2.left - br.left + r2.width/2, y2 = r2.top - br.top + r2.height/2;
  const mx = (x1+x2)/2, my = (y1+y2)/2 - Math.min(80, Math.abs(y2-y1) * 0.4);
  const d = `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
  // shadow (outline)
  const shadow = document.createElementNS("http://www.w3.org/2000/svg","path");
  shadow.setAttribute("d", d);
  shadow.setAttribute("stroke", "#000");
  shadow.setAttribute("stroke-width", color === '#ffffff' ? 6 : 8);
  shadow.setAttribute("stroke-linecap","round");
  shadow.setAttribute("fill","none");
  shadow.style.opacity = color === '#ffffff' ? '0.9' : '0.92';
  // main
  const main = document.createElementNS("http://www.w3.org/2000/svg","path");
  main.setAttribute("d", d);
  main.setAttribute("stroke", color);
  main.setAttribute("stroke-width", color === '#ffffff' ? 3 : 5);
  main.setAttribute("stroke-linecap","round");
  main.setAttribute("fill","none");
  wireLayer.appendChild(shadow);
  wireLayer.appendChild(main);
  return {shadow, main};
}

/* add connection record and draw */
function drawConnection(aEl,bEl,color){
  // ensure aEl,bEl exist
  const {shadow, main} = drawPathBetween(aEl,bEl,color);
  connections.push({a:aEl.dataset.id, b:bEl.dataset.id, color, shadowEl:shadow, mainEl:main});
}

/* remove connection pair (and its DOM) */
function removeConnectionPair(index){
  const c = connections[index];
  if(!c) return;
  if(c.shadowEl) c.shadowEl.remove();
  if(c.mainEl) c.mainEl.remove();
  connections.splice(index,1);
}

/* find connection index by ids */
function findConnectionIndex(a,b){
  return connections.findIndex(c => (c.a===a && c.b===b) || (c.a===b && c.b===a));
}

/* ---------- terminal click handler ---------- */
function onTerminalClick(e){
  const t = e.currentTarget;
  if(state !== 'play') return;
  // clicking same selected => cancel
  if(selected && selected === t){
    selected.classList.remove('selected');
    selected = null;
    removePreviewLine();
    return;
  }
  // if no selected => set and show preview
  if(!selected){
    selected = t;
    t.classList.add('selected');
    showPreviewLineFrom(t);
    return;
  }
  // selected exists and different terminal clicked -> connect or toggle remove
  const aId = selected.dataset.id, bId = t.dataset.id;
  const idx = findConnectionIndex(aId,bId);
  // remove preview/selected
  selected.classList.remove('selected');
  selected = null;
  removePreviewLine();
  if(idx >= 0){
    // remove existing connection
    removeConnectionPair(idx);
    updateLamps();
    return;
  }
  // else make connection: choose color by world rules based on both ids
  const color = chooseConnectionColor(aId, bId);
  drawConnection(document.querySelector(`.terminal[data-id="${aId}"]`), document.querySelector(`.terminal[data-id="${bId}"]`), color);
  updateLamps();
}

/* color decision helper */
function chooseConnectionColor(aId,bId){
  if(world===1){
    // N -> white, else black
    if(aId.includes('-N') || bId.includes('-N')) return '#ffffff';
    return '#111';
  } else {
    // World2: COM=black, T1=white, T2=red, N=white
    if(aId.includes('T2') || bId.includes('T2')) return '#ff3b30';
    if(aId.includes('T1') || bId.includes('T1')) return '#ffffff';
    if(aId.includes('-N') || bId.includes('-N')) return '#ffffff';
    if(aId.includes('COM') || bId.includes('COM')) return '#111';
    return '#111';
  }
}

/* ---------- wire animation util ---------- */
function animateLines(ms){
  return new Promise(res=>{
    const shapes = Array.from(wireLayer.querySelectorAll('path,line'));
    if(shapes.length===0){ setTimeout(res,ms); return; }
    shapes.forEach(s=>{
      const len = s.getTotalLength ? s.getTotalLength() : 200;
      s.style.transition='none';
      s.style.strokeDasharray = len;
      s.style.strokeDashoffset = len;
      void s.getBoundingClientRect();
      s.style.transition = `stroke-dashoffset ${ms}ms linear`;
      s.style.strokeDashoffset = 0;
    });
    setTimeout(res, ms + 60);
  });
}

/* ---------- lamp / wiring checks ---------- */
function connected(a,b){ return findConnectionIndex(a,b) >= 0; }
function getJunctionIds(){ return ['junction-1','junction-2','junction-3','junction-4','junction-5','junction-6']; }
function checkSolutionWorld1(){
  // require any junction connected from power-L and that same JB connects both L and N of a lamp (simple)
  const jbConnected = getJunctionIds().some(j => connected('power-L', j));
  if(!jbConnected) return false;
  const lamps = ['lamp1','lamp2'];
  for(const lid of lamps){
    if( getJunctionIds().some(j => connected(j, `${lid}-L`) && getJunctionIds().some(k => connected(j, `${lid}-N`) ) ) ) return true;
  }
  return false;
}

/* update lamp visuals */
function updateLamps(){
  if(world===1){
    ['lamp1','lamp2'].forEach(id=>{
      const el = document.getElementById(id);
      if(!el) return;
      // naive: lit if some junction connects to both L and N of same lamp
      const lit = getJunctionIds().some(j => connected(j, `${id}-L`) && connected(j, `${id}-N`));
      el.classList.toggle('lit', lit);
    });
  } else {
    // world2 more strict
    const ok = checkWiringWorld2();
    const act = ok && isThreeWayActive() && hasLoadPath() && hasNeutralPath();
    document.getElementById('lamp1').classList.toggle('lit', act);
    document.getElementById('lamp2').classList.toggle('lit', act);
  }
}

/* ---------- world2 wiring helpers ---------- */
function hasNeutralPath(){ return getJunctionIds().some(j => connected('power-N', j)); }
function hasLoadPath(){ return getJunctionIds().some(j => connected('sw2-COM', j)); }
function junctionFeedsLampL(){ return getJunctionIds().some(j => connected(j,'lamp1-L')) && getJunctionIds().some(j => connected(j,'lamp2-L')); }
function junctionFeedsLampN(){ return getJunctionIds().some(j => connected(j,'lamp1-N')) && getJunctionIds().some(j => connected(j,'lamp2-N')); }
function isThreeWayActive(){ const leftOut = sw1 ? 'sw1-T2' : 'sw1-T1'; const rightIn = sw2 ? 'sw2-T2' : 'sw2-T1'; return connected(leftOut, rightIn); }
function checkWiringWorld2(){
  const cond1 = connected('power-L','sw1-COM');
  const cond2 = connected('sw1-T1','sw2-T1');
  const cond3 = connected('sw1-T2','sw2-T2');
  const cond4 = hasLoadPath();
  const cond5 = junctionFeedsLampL();
  const cond6 = hasNeutralPath();
  const cond7 = junctionFeedsLampN();
  return cond1 && cond2 && cond3 && cond4 && cond5 && cond6 && cond7;
}

/* ---------- boss sequence (World1 simple) ---------- */
async function doBossSequenceWorld1(){
  setState('boss');
  bossScreen.style.display = 'flex';
  try{ freezeSound.currentTime=0; freezeSound.play().catch(()=>{}); }catch(e){}
  hitText.style.display='block'; hitText.textContent='HIT - 40';
  bossPanel.classList.add('boss-damage');
  await new Promise(r=>setTimeout(r,2000));
  bossPanel.classList.remove('boss-damage'); hitText.style.display='none';
  bossHP -= 40; updateBossHP();
  if(bossHP <= 0){
    try{ explodeSound.currentTime=0; explodeSound.play().catch(()=>{}); }catch(e){}
    bossScreen.style.display='none';
    // advance to world2 after short delay
    await new Promise(r=>setTimeout(r,600));
    startWorld2();
    return;
  }
  bossScreen.style.display='none';
  // clear wires for next round
  connections.forEach((c)=>{ if(c.shadowEl) c.shadowEl.remove(); if(c.mainEl) c.mainEl.remove(); });
  connections = []; selected = null; removePreviewLine(); updateLamps();
}

/* ---------- SET button ---------- */
setBtn.addEventListener('click', async ()=>{
  if(world===1){
    if(!checkSolutionWorld1()){ playerHP = Math.max(0, playerHP - 20); updatePlayerHP(); if(playerHP<=0) alert('PLAYER HP 0'); return; }
    await animateLines(1200);
    await doBossSequenceWorld1();
  } else {
    // world2 attack: require lamp lit
    const lampLit = document.getElementById('lamp1').classList.contains('lit');
    if(!lampLit){ /* small feedback */ return; }
    const strong = bossHP <= 80;
    bossHP -= (strong?60:40); updateBossHP();
    // effect placeholders (can expand)
    try{ sfxHit.currentTime=0; sfxHit.play().catch(()=>{}); }catch(e){}
    if(bossHP <= 0){
      // defeat effects simplified
      try{ sfxExplode.currentTime=0; sfxExplode.play().catch(()=>{}); }catch(e){}
      // show overlay
      const ov = document.createElement('div'); ov.id='overlay'; ov.textContent='WORLD2 CLEAR'; ov.style.position='fixed'; ov.style.left='50%'; ov.style.top='50%'; ov.style.transform='translate(-50%,-50%)'; ov.style.zIndex='2147483647'; ov.style.padding='20px'; ov.style.background='rgba(0,0,0,0.9)'; ov.style.color='#ffd200'; ov.style.borderRadius='14px'; document.body.appendChild(ov);
    }
  }
});

/* ---------- reset/restart ---------- */
resetWires.addEventListener('click', ()=>{
  connections.forEach(c=>{ if(c.shadowEl) c.shadowEl.remove(); if(c.mainEl) c.mainEl.remove(); });
  connections = []; selected=null; removePreviewLine(); updateLamps();
});
restartBtn.addEventListener('click', ()=>{
  world = 1; setState('title'); document.getElementById('worldLabel').textContent='1';
  playerHP = 100; bossHP = 100; updatePlayerHP(); updateBossHP();
  connections.forEach(c=>{ if(c.shadowEl) c.shadowEl.remove(); if(c.mainEl) c.mainEl.remove(); });
  connections = []; selected=null; removePreviewLine(); document.getElementById('lamp1').classList.remove('lit'); document.getElementById('lamp2').classList.remove('lit');
  titleScreen.classList.add('show'); quizScreen.classList.remove('show');
});

/* ---------- switches ---------- */
document.getElementById('sw1Btn').addEventListener('click', ()=>{ sw1 ^= 1; updateLamps(); });
document.getElementById('sw2Btn').addEventListener('click', ()=>{ sw2 ^= 1; updateLamps(); });

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
  if(quizIdx < questions.length) renderQuiz();
  else startWorld1();
});

/* ---------- start worlds ---------- */
function startWorld1(){
  world = 1; setState('play'); document.getElementById('worldLabel').textContent='1';
  titleScreen.classList.remove('show'); quizScreen.classList.remove('show');
  bossHP = 100; updateBossHP();
  layoutAllAndAttach();
}
function startWorld2(){
  world = 2; setState('play'); document.getElementById('worldLabel').textContent='2';
  bossHP = 160; updateBossHP();
  layoutAllAndAttach();
}

/* helper: layout & attach */
function layoutAllAndAttach(){ layoutAll(); attachAllTerminals(); updateLamps(); }

/* init */
updatePlayerHP(); updateBossHP(); setState('title'); resizeSVG(); layoutAllAndAttach();

/* expose for debugging if needed */
window._GAME = { layoutAll, connections };
