/* game.js
   Combined World1 -> World2 flow in one file.
   - World1: title -> quiz -> play (dynamic lamps) -> SET triggers boss sequence (light)
   - World2: fixed layout (three-way + JB + 2 lamps), real wiring rules, boss effects (particles/flash/shake)
   Single-file game logic controlling both worlds.
*/

"use strict";

/* -----------------------
   Global state
------------------------*/
let world = 1; // 1 or 2
let state = 'title'; // title, quiz, play
let roundNum = 1;
let playerHP = 100;
let bossHP = 100; // world1 boss hp initial, will be set per world
let selected = null;
let connections = []; // {a,b,path,color}
let wiringCorrect = false;

/* world2 specific */
let sw1 = 0, sw2 = 0;

/* DOM elements */
const board = document.getElementById('board');
const wireLayer = document.getElementById('wireLayer');
const devicesContainer = document.getElementById('devicesContainer');
const world2Devices = document.getElementById('world2Devices');
const playerBar = document.getElementById('playerHP');
const bossHPbar = document.getElementById('bossHPbar');
const hitText = document.getElementById('hitText');

const titleScreen = document.getElementById('titleScreen');
const quizScreen = document.getElementById('quizScreen');
const toQuiz = document.getElementById('toQuiz');
const answerBtn = document.getElementById('answerBtn');
const skipQuiz = document.getElementById('skipQuiz');
const quizQuestion = document.getElementById('quizQuestion');
const quizOptions = document.getElementById('quizOptions');
const quizIndex = document.getElementById('quizIndex');

const setBtn = document.getElementById('setBtn');
const resetWires = document.getElementById('resetWires');
const switchBtn = document.getElementById('switchBtn');
const restartBtn = document.getElementById('restart');

const bossImg = document.getElementById('bossImg');
const bossScreen = document.getElementById('bossScreen');
const bossPanel = document.getElementById('bossPanel');

const bossCanvas = document.getElementById('bossCanvas');
const flashEl = document.getElementById('bossFlash');
const freezeSound = document.getElementById('freezeSound');
const explodeSound = document.getElementById('explodeSound');
const sfxHit = document.getElementById('sfxHit');
const sfxExplode = document.getElementById('sfxExplode');
const sfxSlow = document.getElementById('sfxSlow');

const overlay = document.getElementById('overlay');

/* -----------------------
   Utility
------------------------*/
function updatePlayerHP(){ playerBar.style.width = Math.max(0, playerHP) + "%"; }
function updateBossHP(){ bossHPbar.style.width = Math.max(0, bossHP) + "%"; }
function setState(s){ state = s; document.getElementById('stateLabel').textContent = s; }

/* resize svg viewBox */
function resizeSVG(){
  const r = board.getBoundingClientRect();
  wireLayer.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
  wireLayer.style.left = r.left + 'px';
  wireLayer.style.top = r.top + 'px';
  wireLayer.style.width = r.width + 'px';
  wireLayer.style.height = r.height + 'px';
}
window.addEventListener('resize', resizeSVG);
window.addEventListener('load', ()=>{ resizeSVG(); setTimeout(resizeSVG,120); });

/* -----------------------
   WORLD1: quiz + lamps dynamic
------------------------*/
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

/* quiz handlers */
toQuiz.addEventListener('click', ()=>{ quizIdx = 0; renderQuiz(); titleScreen.classList.remove('show'); quizScreen.classList.add('show'); setState('quiz'); });
skipQuiz.addEventListener('click', ()=>{ startWorld1(); });
answerBtn.addEventListener('click', ()=>{
  const chosen = Array.from(document.querySelectorAll('.quizOpt')).find(x=>x.classList.contains('chosen'));
  if(!chosen){ alert('選択肢を選んでください。'); return; }
  const selectedIndex = Number(chosen.dataset.index);
  const correctIndex = questions[quizIdx].correct;
  if(selectedIndex !== correctIndex){ playerHP = Math.max(0, playerHP - 10); updatePlayerHP(); }
  quizIdx++;
  if(quizIdx < questions.length){ renderQuiz(); }
  else { startWorld1(); }
});

/* -----------------------
   World1 play: dynamic lamps + wiring
------------------------*/
let lampCount = 1;
function createLamps(count){
  devicesContainer.innerHTML = ''; // clear
  for(let i=1;i<=count;i++){
    const id = `lamp-${i}`;
    const div = document.createElement('div');
    div.className = 'device';
    div.id = id;
    div.style.left = (20 + i*12) + '%';
    div.style.top = (40 + (i%2)*18) + '%';
    div.innerHTML = `<h3 style="font-size:12px">ランプ</h3>
      <div style="text-align:center;">
        <div class="terminal" data-id="${id}-L">L</div>
        <div class="terminal" data-id="${id}-N">N</div>
      </div>`;
    devicesContainer.appendChild(div);
    attachTerminalListeners(div);
  }
  setTimeout(()=>{ resizeSVG(); }, 60);
}

function getLampIds(){ return Array.from(document.querySelectorAll("[id^='lamp-']")).map(el=>el.id); }

/* attach terminal listeners generic */
function attachTerminalListeners(root){
  root.querySelectorAll(".terminal, .jb-term").forEach(t=>{
    const clone = t.cloneNode(true);
    t.parentNode.replaceChild(clone, t);
    clone.addEventListener("click", (e)=>{
      if(state !== 'play') return;
      if(clone.classList.contains('jb-term')) clone.dataset.id = 'jb';
      if(selected === clone){ clone.classList.remove("selected"); selected = null; return; }
      if(!selected){ selected = clone; clone.classList.add("selected"); showPreviewLine(clone); return; }
      if(selected !== clone){ connect(selected, clone); }
      if(selected) selected.classList.remove("selected");
      selected = null;
      removePreviewLine();
    });
  });
}

/* wiring connect for World1 (simple straight lines) */
function connect(a,b){
  const idA = normalizeId(a.dataset.id,a);
  const idB = normalizeId(b.dataset.id,b);
  if(!idA || !idB) return;
  if(idA === idB) return;
  // toggle: if exists remove
  for(let i=0;i<connections.length;i++){
    const c = connections[i];
    if((c.a===idA && c.b===idB) || (c.a===idB && c.b===idA)){
      if(c.el && c.el.remove) c.el.remove();
      connections.splice(i,1);
      return;
    }
  }
  // draw
  const rectA = a.getBoundingClientRect();
  const rectB = b.getBoundingClientRect();
  const boardRect = board.getBoundingClientRect();
  const x1 = rectA.left - boardRect.left + rectA.width/2;
  const y1 = rectA.top - boardRect.top + rectA.height/2;
  const x2 = rectB.left - boardRect.left + rectB.width/2;
  const y2 = rectB.top - boardRect.top + rectB.height/2;
  const line = document.createElementNS("http://www.w3.org/2000/svg","line");
  line.setAttribute("x1",x1); line.setAttribute("y1",y1); line.setAttribute("x2",x2); line.setAttribute("y2",y2);
  line.setAttribute("stroke", getWireColor(idA,idB));
  line.setAttribute("stroke-width", getWireColor(idA,idB)==='white'?2:5);
  line.setAttribute("stroke-linecap","round");
  line.setAttribute("data-from", idA); line.setAttribute("data-to", idB);
  wireLayer.appendChild(line);
  connections.push({a:idA,b:idB,el:line,color:getWireColor(idA,idB)});
}

/* preview line for selection */
let previewLine = null;
function showPreviewLine(t){
  removePreviewLine();
  const r = t.getBoundingClientRect();
  const boardRect = board.getBoundingClientRect();
  const x1 = r.left - boardRect.left + r.width/2;
  const y1 = r.top - boardRect.top + r.height/2;
  previewLine = document.createElementNS("http://www.w3.org/2000/svg","line");
  previewLine.setAttribute("x1",x1); previewLine.setAttribute("y1",y1);
  previewLine.setAttribute("x2",x1); previewLine.setAttribute("y2",y1);
  previewLine.setAttribute("stroke","#fff"); previewLine.setAttribute("stroke-width","2"); previewLine.setAttribute("stroke-linecap","round");
  wireLayer.appendChild(previewLine);
  // follow pointer temporarily
  function move(e){
    const mx = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
    const my = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;
    const x2 = mx - boardRect.left; const y2 = my - boardRect.top;
    previewLine.setAttribute("x2", x2); previewLine.setAttribute("y2", y2);
  }
  window.addEventListener('mousemove', move);
  window.addEventListener('touchmove', move, {passive:true});
  // remove after 3s if not used
  setTimeout(removePreviewLine, 3000);
}
function removePreviewLine(){
  if(previewLine){ previewLine.remove(); previewLine=null; }
}

/* normalize id for jb */
function normalizeId(id, el){
  if(!id && el) id = el.dataset.id;
  if(!id) return id;
  if(id==='jb') return 'jb';
  if(el && el.closest && el.closest('#junction')) return 'junction-1'; // map any JB terminal to first for world1 simple check
  return id;
}

/* World1 wire color rule (simple): L->black, N->white else black */
function getWireColor(a,b){
  if(a.includes('-N')||b.includes('-N')) return 'white';
  return 'black';
}

/* World1 solution check (simple - at least one lamp connected to JB) */
function checkSolutionWorld1(){
  if(!connections.some(c=>c.a.includes('junction') || c.b.includes('junction'))) return false;
  const baseOk = connHas("power-L","junction-1") || connHas("power-L","junction-1");
  if(!baseOk) return false;
  const lamps = getLampIds();
  for(const lid of lamps){
    if(connHas("junction-1", `${lid}-L`) && connHas("junction-1", `${lid}-N`)) return true;
  }
  return false;
}
function connHas(a,b){ return connections.some(c => (c.a===a && c.b===b) || (c.a===b && c.b===a)); }

/* World1 animate lines forward */
function animateLinesForward(ms){
  return new Promise(res=>{
    const lines = Array.from(wireLayer.querySelectorAll("line"));
    if(lines.length===0){ setTimeout(res,ms); return; }
    lines.forEach(l=>{
      const len = l.getTotalLength ? l.getTotalLength() : 200;
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

/* -----------------------
   World1 boss sequence (simpler)
------------------------*/
async function doBossSequenceWorld1(){
  stateLabel.textContent = 'boss';
  bossScreen.style.display='flex';
  await new Promise(r=>setTimeout(r,300));
  try{ freezeSound.currentTime=0; await freezeSound.play(); } catch(e){ }
  const dmg = 40;
  hitText.style.display='block';
  hitText.textContent = `HIT - ${dmg}`;
  bossPanel.classList.add('boss-damage');
  await new Promise(r=>setTimeout(r,2000));
  bossPanel.classList.remove('boss-damage');
  hitText.style.display='none';
  bossHP -= dmg;
  updateBossHP();
  if(bossHP <= 0 || roundNum >= 1){
    // show explosion quick and final
    explodeSound.play().catch(()=>{});
    // simple defeat dialog
    const lines = ['やったな。','次はWORLD2だ。'];
    document.getElementById('defeatDialog').textContent = lines.join('\n');
    document.getElementById('defeatDialog').style.display='block';
    await new Promise(r=>setTimeout(r,900));
    document.getElementById('defeatDialog').style.display='none';
    bossScreen.style.display='none';
    // goto World2
    startWorld2();
    return;
  }
  bossScreen.style.display='none';
  // reset for next round
  connections.forEach(c=>{ if(c.el && c.el.remove) c.el.remove(); });
  connections = [];
  selected = null;
  roundNum++;
}

/* -----------------------
   World2: fixed layout + real wiring logic + boss effects
------------------------*/

/* layout fractions for world2 devices (will be applied when world2 starts) */
const layoutMap = {
  power: [0.5, 0.07],
  sw1:   [0.18, 0.28],
  sw2:   [0.82, 0.28],
  junction: [0.5, 0.46],
  lamp1: [0.35, 0.72],
  lamp2: [0.65, 0.72],
};

/* place by fraction on board */
function placeByFraction(id, fracX, fracY){
  const el = document.getElementById(id);
  if(!el) return;
  const br = board.getBoundingClientRect();
  const x = Math.round(br.width * fracX);
  const y = Math.round(br.height * fracY);
  el.style.left = x + "px";
  el.style.top  = y + "px";
}

/* world2 layout (called on start/resizes) */
function layoutWorld2(){
  Object.keys(layoutMap).forEach(k=>{
    placeByFraction(k, layoutMap[k][0], layoutMap[k][1]);
  });
  resizeSVG();
}

/* wire color logic (World2 real rules) */
function match(a,b,x,y){ return (a===x && b===y) || (a===y && b===x); }
function wireColorWorld2(a,b){
  if(match(a,b,"sw1-T1","sw2-T1")) return "#ffffff"; // T1 white
  if(match(a,b,"sw1-T2","sw2-T2")) return "#ff3b30"; // T2 red
  if(a.includes("-N") || b.includes("-N")) return "#ffffff";
  if(a.includes("COM") || b.includes("COM")) return "#000000";
  return "#000000";
}

/* draw curved path for World2 (SVG path) */
function drawCurvedPath(aEl,bEl,color){
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

/* connectTerminals generic (handles both worlds; chooses style based on world) */
function connectTerminals(aEl,bEl){
  const idA = aEl.dataset.id;
  const idB = bEl.dataset.id;
  if(!idA || !idB || idA===idB) return;
  // toggle: remove if exists
  const idx = connections.findIndex(c=> (c.a===idA && c.b===idB) || (c.a===idB && c.b===idA));
  if(idx >= 0){
    const ex = connections[idx];
    if(ex.path && ex.path.remove) ex.path.remove();
    connections.splice(idx,1);
    updateLamps();
    return;
  }
  // draw
  const color = (world===2) ? wireColorWorld2(idA,idB) : getWireColor(idA,idB);
  const path = (world===2) ? drawCurvedPath(aEl,bEl,color) : drawStraight(aEl,bEl,color);
  connections.push({a:idA,b:idB,path,color});
  updateLamps();
}

/* straight line for world1 */
function drawStraight(aEl,bEl,color){
  const r1 = aEl.getBoundingClientRect();
  const r2 = bEl.getBoundingClientRect();
  const br = board.getBoundingClientRect();
  const x1 = r1.left - br.left + r1.width/2;
  const y1 = r1.top - br.top + r1.height/2;
  const x2 = r2.left - br.left + r2.width/2;
  const y2 = r2.top - br.top + r2.height/2;
  const line = document.createElementNS("http://www.w3.org/2000/svg","line");
  line.setAttribute("x1",x1); line.setAttribute("y1",y1); line.setAttribute("x2",x2); line.setAttribute("y2",y2);
  line.setAttribute("stroke",color);
  line.setAttribute("stroke-width", color==='#ffffff' ? 2 : 5);
  line.setAttribute("stroke-linecap","round");
  wireLayer.appendChild(line);
  return line;
}

/* selection listener shared: terminals in DOM are already created for world2 and dynamically for world1 */
function attachAllTerminals(){
  document.querySelectorAll('.terminal').forEach(t=>{
    t.removeEventListener('click', terminalClickHandler);
    t.addEventListener('click', terminalClickHandler);
  });
}
function terminalClickHandler(e){
  const t = e.currentTarget;
  if(state!=='play') return;
  if(!selected){ selected = t; t.classList.add('selected'); if(world===1) showPreviewLine(t); return; }
  const prev = selected; prev.classList.remove('selected'); selected=null; if(world===1) removePreviewLine();
  connectTerminals(prev, t);
}

/* preview for world1 */
let preview = null;
function showPreviewLine(t){
  removePreviewLine();
  const r = t.getBoundingClientRect();
  const br = board.getBoundingClientRect();
  const x1 = r.left - br.left + r.width/2;
  const y1 = r.top - br.top + r.height/2;
  preview = document.createElementNS("http://www.w3.org/2000/svg","line");
  preview.setAttribute("x1",x1); preview.setAttribute("y1",y1); preview.setAttribute("x2",x1); preview.setAttribute("y2",y1);
  preview.setAttribute("stroke","#fff"); preview.setAttribute("stroke-width","2"); preview.setAttribute("stroke-linecap","round");
  wireLayer.appendChild(preview);
  function move(e){
    const mx = (e.touches && e.touches[0])?e.touches[0].clientX:e.clientX;
    const my = (e.touches && e.touches[0])?e.touches[0].clientY:e.clientY;
    preview.setAttribute("x2", mx - br.left);
    preview.setAttribute("y2", my - br.top);
  }
  window.addEventListener('mousemove', move);
  window.addEventListener('touchmove', move, {passive:true});
  setTimeout(removePreviewLine, 3000);
}
function removePreviewLine(){ if(preview){ preview.remove(); preview=null; } }

/* helper functions for connections (undirected) */
function connected(a,b){ return connections.some(c=> (c.a===a && c.b===b) || (c.a===b && c.b===a) ); }

/* -----------------------
   World2 wiring checks (realistic)
------------------------*/
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
  wiringCorrect = cond1 && cond2 && cond3 && cond4 && cond5 && cond6 && cond7;
  return wiringCorrect;
}

/* three-way active: XOR */
function isThreeWayActive(){
  const leftOut = sw1 ? "sw1-T2" : "sw1-T1";
  const rightIn = sw2 ? "sw2-T2" : "sw2-T1";
  return connected(leftOut, rightIn);
}

/* update lamps (both worlds) */
function updateLamps(){
  if(world===1){
    // simple: any lamp connected to junction with both L & N lights
    const lampIds = getLampIds();
    lampIds.forEach(id=>{
      const el = document.getElementById(id);
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

/* -----------------------
   Boss effects (particles / flash / shake / slow)
   Minimal but effective. Reused from previous spec.
------------------------*/
let canvasCtx = null;
function ensureCanvas(){
  if(!bossCanvas) return;
  bossCanvas.width = window.innerWidth;
  bossCanvas.height = window.innerHeight;
  canvasCtx = bossCanvas.getContext('2d');
}
window.addEventListener('resize', ensureCanvas);
ensureCanvas();

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
    particles.push({
      x, y,
      vx: Math.cos(angle)*speed*(0.6+Math.random()),
      vy: Math.sin(angle)*speed*(0.6+Math.random()) - (Math.random()*2),
      life: 400 + Math.random()*700,
      size: 3 + Math.random()*8,
      color,
      born: performance.now()
    });
  }
  let raf;
  function tick(now){
    canvasCtx.clearRect(0,0,bossCanvas.width,bossCanvas.height);
    const alive=[];
    for(const p of particles){
      const t = now - p.born;
      if(t > p.life) continue;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      const alpha = 1 - (t / p.life);
      canvasCtx.globalAlpha = Math.max(0, alpha);
      canvasCtx.fillStyle = p.color;
      canvasCtx.beginPath();
      canvasCtx.ellipse(p.x, p.y, p.size, p.size*0.7, 0, 0, Math.PI*2);
      canvasCtx.fill();
      alive.push(p);
    }
    if(alive.length === 0){
      cancelAnimationFrame(raf);
      bossCanvas.style.display='none';
      canvasCtx.clearRect(0,0,bossCanvas.width,bossCanvas.height);
      return;
    }
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
}
function doSlowMotion(duration=700){ try{ sfxSlow.currentTime=0; sfxSlow.play(); } catch(e){} document.body.classList.add('slow-motion'); return wait(duration).then(()=>document.body.classList.remove('slow-motion')); }

async function playBossHitEffect({strong=false} = {}){
  try{ sfxHit.currentTime=0; sfxHit.play(); }catch(e){}
  doScreenShake(strong?900:600);
  bossImgHitPulse();
  const r = bossImg.getBoundingClientRect();
  spawnParticles(r.left + r.width/2, r.top + r.height/2, strong? '#ff6b6b':'#ffd54a', strong? 90:40, strong? 240:180);
  await doFlash(strong?500:300);
  if(strong) await doSlowMotion(700);
}
async function playBossDefeatEffect(){
  try{ sfxExplode.currentTime=0; sfxExplode.play(); }catch(e){}
  const r = bossImg.getBoundingClientRect();
  const cx = r.left + r.width/2;
  const cy = r.top + r.height/2;
  for(let i=0;i<2;i++){
    spawnParticles(cx,cy, i%2? '#ff3b30' : '#ffd54a', 180, 360);
    await doFlash(260 + i*120);
    await doScreenShake(380 + i*120);
  }
  bossImg.style.transition = 'transform 650ms ease, opacity 700ms ease';
  bossImg.style.transform = 'scale(1.35) rotate(-6deg)';
  bossImg.style.opacity = '0';
  flashEl.style.background = '#ffffff';
  await doFlash(420);
  flashEl.style.background = '';
  await wait(600);
  if(canvasCtx){ canvasCtx.clearRect(0,0,bossCanvas.width,bossCanvas.height); bossCanvas.style.display='none'; }
  overlay.style.display = 'flex';
}

/* -----------------------
   SET button behavior (world-specific)
------------------------*/
setBtn.addEventListener('click', async ()=>{
  if(world===1){
    // world1: check solution (simple)
    if(!checkSolutionWorld1()){
      playerHP = Math.max(0, playerHP - 20);
      updatePlayerHP();
      if(playerHP <= 0) alert('PLAYER HP 0 - game over');
      return;
    }
    // animate lines, then boss dmg
    await animateLinesForward(1500);
    // boss sequence simple
    bossHP = 100;
    updateBossHP();
    await doBossSequenceWorld1();
  } else {
    // world2: if lamp lit then damage
    const lamp1Lit = document.getElementById('lamp1').classList.contains('lit');
    if(!lamp1Lit){
      // small feedback
      await doScreenShake(180);
      return;
    }
    const strong = bossHP <= 80;
    bossHP -= (strong?60:40);
    updateBossHP();
    await playBossHitEffect({strong});
    if(bossHP <= 0) await playBossDefeatEffect();
  }
});

/* reset wires */
resetWires.addEventListener('click', ()=>{
  connections.forEach(c=>{ if(c.path && c.path.remove) c.path.remove(); });
  connections = []; selected = null; removePreviewLine();
  attachAllTerminals();
});

/* restart */
restartBtn.addEventListener('click', ()=>{
  // reset global
  world = 1; roundNum=1; playerHP=100; bossHP=100; updatePlayerHP(); updateBossHP();
  selected=null; connections=[]; devicesContainer.innerHTML=''; world2Devices.style.display='none';
  document.getElementById('worldLabel').textContent = '1';
  titleScreen.classList.add('show'); quizScreen.classList.remove('show'); setState('title');
});

/* switch button (simple toggle for world1 tutorial) */
let switchOn = false;
switchBtn.addEventListener('click', ()=>{
  switchOn = !switchOn;
  switchBtn.textContent = switchOn ? 'SWITCH ON' : 'SWITCH';
});

/* -----------------------
   Start World1 -> create lamps and attach terminals
------------------------*/
function startWorld1(){
  world = 1;
  document.getElementById('worldLabel').textContent = '1';
  titleScreen.classList.remove('show'); quizScreen.classList.remove('show');
  setState('play');
  bossHP = 100; updateBossHP();
  // create 1 lamp for tutorial
  lampCount = 1;
  createLamps(lampCount);
  attachAllTerminals();
}

/* -----------------------
   Start World2
------------------------*/
function startWorld2(){
  world = 2;
  document.getElementById('worldLabel').textContent = '2';
  // clear world1 artifacts
  devicesContainer.innerHTML='';
  // show world2 devices
  world2Devices.style.display='block';
  setState('play');
  bossHP = 160; updateBossHP();
  // layout world2 and attach terminals
  layoutWorld2();
  attachAllTerminals();
  // initialize sw1/sw2 visuals
  sw1 = 0; sw2 = 0;
  updateLamps();
}

/* -----------------------
   World2 switch buttons
------------------------*/
document.getElementById('sw1Btn')?.addEventListener('click', ()=>{
  sw1 ^= 1; updateLamps();
});
document.getElementById('sw2Btn')?.addEventListener('click', ()=>{
  sw2 ^= 1; updateLamps();
});

/* -----------------------
   Init
------------------------*/
updatePlayerHP();
updateBossHP();
setState('title');
resizeSVG();
attachAllTerminals();

/* expose some helpers for debugging in console */
window._G = { connections, updateLamps, startWorld1, startWorld2, layoutWorld2 };
