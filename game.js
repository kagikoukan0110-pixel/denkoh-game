/* WORLD2 - 完成版ゲームロジック + モリモリ boss effects
   - 実務三路ロジック（COM 黒 / T1 白 / T2 赤）
   - JB 端子6個
   - ランプ2灯並列
   - 曲線ワイヤー描画
   - boss effects (particles, flash, shake, slow)
*/

"use strict";

/* ---------------------------
   State
----------------------------*/
let connections = []; // {a:'id', b:'id', path:SVGPathElement, color:'#hex'}
let selectedTerminal = null;
let bossHP = 160;
let sw1 = 0, sw2 = 0;
let wiringCorrect = false;

/* ---------------------------
   Elements
----------------------------*/
const board = document.getElementById("board");
const wireLayer = document.getElementById("wireLayer");
const bossHPbar = document.getElementById("bossHPbar");
const setBtn = document.getElementById("setBtn");
const resetBtn = document.getElementById("resetBtn");
const bossImg = document.getElementById("bossImg");

/* boss effects elements */
const bossCanvas = document.getElementById('bossCanvas');
const flashEl = document.getElementById('bossFlash');
const sfxHit = document.getElementById('sfxHit');
const sfxExplode = document.getElementById('sfxExplode');
const sfxSlow = document.getElementById('sfxSlow');
let canvasCtx = null;

/* ---------------------------
   Helpers
----------------------------*/
function updateBossHP(){
  bossHPbar.style.width = Math.max(0, bossHP) + "%";
}
function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }

/* ---------------------------
   Canvas setup for particles
----------------------------*/
function ensureCanvas(){
  if(!bossCanvas) return;
  bossCanvas.width = window.innerWidth;
  bossCanvas.height = window.innerHeight;
  canvasCtx = bossCanvas.getContext('2d');
}
window.addEventListener('resize', ensureCanvas);
ensureCanvas();

/* ---------------------------
   Layout (fixed)
----------------------------*/
function place(id,x,y){
  const el = document.getElementById(id);
  if(!el) return;
  el.style.left = x + "px";
  el.style.top  = y + "px";
}
function layout(){
  const w = board.clientWidth;
  const cx = w/2;
  place("power", cx, 80);
  place("sw1", cx - 200, 190);
  place("sw2", cx + 200, 190);
  place("junction", cx, 320);
  place("lamp1", cx - 120, 480);
  place("lamp2", cx + 120, 480);
  resizeSvg();
}
window.addEventListener('load', layout);
window.addEventListener('resize', layout);

/* ---------------------------
   SVG viewBox resize
----------------------------*/
function resizeSvg(){
  const r = board.getBoundingClientRect();
  wireLayer.setAttribute("viewBox", `0 0 ${r.width} ${r.height}`);
  wireLayer.style.left = '0';
  wireLayer.style.top = '0';
}
resizeSvg();

/* ---------------------------
   Wire color logic (実務準拠)
   returns hex color
----------------------------*/
function match(a,b,x,y){ return (a===x && b===y) || (a===y && b===x); }
function wireColor(a,b){
  // T1 (white)
  if(match(a,b,"sw1-T1","sw2-T1")) return "#ffffff";
  // T2 (red)
  if(match(a,b,"sw1-T2","sw2-T2")) return "#ff3b30";
  // any -N (neutral) -> white
  if(a.includes("-N") || b.includes("-N")) return "#ffffff";
  // COM related -> black
  if(a.includes("COM") || b.includes("COM")) return "#000000";
  return "#000000";
}

/* ---------------------------
   Draw curved wire (SVG path)
----------------------------*/
function drawWireElement(aEl,bEl,color){
  const r1 = aEl.getBoundingClientRect();
  const r2 = bEl.getBoundingClientRect();
  const br = board.getBoundingClientRect();

  const x1 = r1.left - br.left + r1.width/2;
  const y1 = r1.top - br.top + r1.height/2;
  const x2 = r2.left - br.left + r2.width/2;
  const y2 = r2.top - br.top + r2.height/2;

  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  // quadratic control point for a gentle arc
  const cx = mx;
  const cy = my - 60;

  const path = document.createElementNS("http://www.w3.org/2000/svg","path");
  path.setAttribute("d", `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`);
  path.setAttribute("stroke", color);
  path.setAttribute("stroke-width", color === "#ffffff" ? "3" : (color === "#ff3b30" ? "4" : "5"));
  path.setAttribute("stroke-linecap","round");
  path.setAttribute("fill","none");
  wireLayer.appendChild(path);
  return path;
}

/* ---------------------------
   Connection API
----------------------------*/
function connectTerminals(aEl,bEl){
  const idA = aEl.dataset.id;
  const idB = bEl.dataset.id;
  if(!idA || !idB) return;
  if(idA === idB) return;

  // avoid double identical connection (simple check)
  if(connections.some(c => (c.a===idA && c.b===idB) || (c.a===idB && c.b===idA))) {
    // remove existing connection if clicked again (toggle)
    const idx = connections.findIndex(c => (c.a===idA && c.b===idB) || (c.a===idB && c.b===idA));
    if(idx >= 0){
      const ex = connections[idx];
      if(ex.path && ex.path.remove) ex.path.remove();
      connections.splice(idx,1);
      updateLamps();
    }
    return;
  }

  const color = wireColor(idA,idB);
  const pathEl = drawWireElement(aEl,bEl,color);
  connections.push({a:idA,b:idB,path:pathEl,color});
  updateLamps();
}

/* click handler */
document.querySelectorAll(".terminal").forEach(t=>{
  t.addEventListener('click', ()=>{
    if(!selectedTerminal){
      selectedTerminal = t;
      t.classList.add('selected');
      return;
    }
    // connect and clear selection
    const prev = selectedTerminal;
    prev.classList.remove('selected');
    selectedTerminal = null;
    connectTerminals(prev, t);
  });
});

/* reset wires */
resetBtn.addEventListener('click', ()=>{
  // remove svg paths
  connections.forEach(c=>{ if(c.path && c.path.remove) c.path.remove(); });
  connections = [];
  selectedTerminal = null;
  updateLamps();
});

/* helper to test if two nodes are connected (undirected) */
function connected(a,b){
  return connections.some(c => (c.a===a && c.b===b) || (c.a===b && c.b===a));
}

/* ---------------------------
   Real wiring checks (実務判定)
   - power-L -> sw1-COM (black)
   - sw1-T1 <-> sw2-T1 (white)
   - sw1-T2 <-> sw2-T2 (red)
   - sw2-COM -> junction
   - power-N -> junction
   - junction -> lamp1-L & lamp2-L and junction -> lamp1-N & lamp2-N (neutral)
----------------------------*/

function hasNeutralPath(){
  return connected("power-N","junction-1") || connected("power-N","junction-2") || connected("power-N","junction-3") || connected("power-N","junction-4") || connected("power-N","junction-5") || connected("power-N","junction-6");
}
function hasLoadPath(){
  // sw2-COM connected to any junction terminal
  return connected("sw2-COM","junction-1")||connected("sw2-COM","junction-2")||connected("sw2-COM","junction-3")||connected("sw2-COM","junction-4")||connected("sw2-COM","junction-5")||connected("sw2-COM","junction-6");
}
function junctionFeedsLampL(){
  // check junction connected to lamp1-L and lamp2-L (through any jb terminal)
  const lamp1L = connected("junction-1","lamp1-L")||connected("junction-2","lamp1-L")||connected("junction-3","lamp1-L")||connected("junction-4","lamp1-L")||connected("junction-5","lamp1-L")||connected("junction-6","lamp1-L");
  const lamp2L = connected("junction-1","lamp2-L")||connected("junction-2","lamp2-L")||connected("junction-3","lamp2-L")||connected("junction-4","lamp2-L")||connected("junction-5","lamp2-L")||connected("junction-6","lamp2-L");
  return lamp1L && lamp2L;
}
function junctionFeedsLampN(){
  const lamp1N = connected("junction-1","lamp1-N")||connected("junction-2","lamp1-N")||connected("junction-3","lamp1-N")||connected("junction-4","lamp1-N")||connected("junction-5","lamp1-N")||connected("junction-6","lamp1-N");
  const lamp2N = connected("junction-1","lamp2-N")||connected("junction-2","lamp2-N")||connected("junction-3","lamp2-N")||connected("junction-4","lamp2-N")||connected("junction-5","lamp2-N")||connected("junction-6","lamp2-N");
  return lamp1N && lamp2N;
}

function checkWiringCorrect(){
  const cond1 = connected("power-L","sw1-COM");
  const cond2 = connected("sw1-T1","sw2-T1");
  const cond3 = connected("sw1-T2","sw2-T2");
  const cond4 = hasLoadPath();
  const cond5 = junctionFeedsLampL();
  const cond6 = hasNeutralPath(); // power-N -> JB
  const cond7 = junctionFeedsLampN();

  wiringCorrect = cond1 && cond2 && cond3 && cond4 && cond5 && cond6 && cond7;
  return wiringCorrect;
}

/* ---------------------------
   Lamp state (三路動作判定)
   lampOn = wiringCorrect && (sw1 XOR sw2)
----------------------------*/
function isThreeWayActive(){
  // determine which terminal from left side is connected depending on sw1
  const leftOut = sw1 ? "sw1-T2" : "sw1-T1";
  const rightIn = sw2 ? "sw2-T2" : "sw2-T1";
  return connected(leftOut, rightIn);
}

function updateLamps(){
  const wiringOK = checkWiringCorrect();
  const active = wiringOK && isThreeWayActive() && hasLoadPath() && hasNeutralPath();
  document.getElementById("lamp1").classList.toggle("lit", active);
  document.getElementById("lamp2").classList.toggle("lit", active);
}

/* ---------------------------
   Switch buttons
----------------------------*/
document.getElementById("sw1Btn").addEventListener('click', ()=>{
  sw1 ^= 1;
  updateLamps();
});
document.getElementById("sw2Btn").addEventListener('click', ()=>{
  sw2 ^= 1;
  updateLamps();
});

/* ---------------------------
   Boss effects (particles / flash / shake / slow)
   Re-used functions: spawnParticles, doFlash, doScreenShake, doSlowMotion, playBossHitEffect, playBossDefeatEffect
----------------------------*/

function waitMs(ms){ return new Promise(r=>setTimeout(r,ms)); }

function doScreenShake(duration=700){
  document.body.classList.add('boss-shake');
  return waitMs(duration).then(()=>document.body.classList.remove('boss-shake'));
}

function doFlash(duration=380){
  flashEl.style.display='block';
  flashEl.style.opacity='1';
  return waitMs(duration).then(()=>{ flashEl.style.opacity='0'; return waitMs(220); }).then(()=>{ flashEl.style.display='none'; });
}

function bossImgHitPulse(){
  bossImg.classList.remove('boss-hit');
  void bossImg.offsetWidth;
  bossImg.classList.add('boss-hit');
}

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

function doSlowMotion(duration=800){
  try{ sfxSlow.currentTime = 0; sfxSlow.play(); } catch(e){}
  document.body.classList.add('slow-motion');
  return waitMs(duration).then(()=>document.body.classList.remove('slow-motion'));
}

async function playBossHitEffect({x=null,y=null,strong=false} = {}){
  if(!bossImg) return;
  if(x === null || y === null){
    const r = bossImg.getBoundingClientRect();
    x = r.left + r.width/2;
    y = r.top + r.height/2;
  }
  try{ sfxHit.currentTime = 0; sfxHit.play(); } catch(e){}
  // shake & pulse & particles & flash
  doScreenShake(strong?900:600);
  bossImgHitPulse();
  spawnParticles(x,y, strong? '#ff6b6b':'#ffd54a', strong? 90:40, strong? 240:180);
  await doFlash(strong?500:300);
  if(strong) await doSlowMotion(700);
}

async function playBossDefeatEffect(){
  if(!bossImg) return;
  const r = bossImg.getBoundingClientRect();
  const cx = r.left + r.width/2;
  const cy = r.top + r.height/2;
  try{ sfxExplode.currentTime = 0; sfxExplode.play(); } catch(e){}
  // big sequence
  for(let i=0;i<2;i++){
    spawnParticles(cx,cy, i%2? '#ff3b30' : '#ffd54a', 180, 360);
    await doFlash(260 + i*120);
    await doScreenShake(380 + i*120);
  }
  bossImg.style.transition = 'transform 650ms ease, opacity 700ms ease';
  bossImg.style.transform = 'scale(1.35) rotate(-6deg)';
  bossImg.style.opacity = '0';
  // final strong flash
  flashEl.style.background = '#ffffff';
  await doFlash(420);
  flashEl.style.background = '';
  await waitMs(600);
  if(canvasCtx){ canvasCtx.clearRect(0,0,bossCanvas.width,bossCanvas.height); bossCanvas.style.display='none'; }
  // show clear overlay
  const ov = document.getElementById('overlay');
  if(ov) ov.style.display = 'flex';
}

/* ---------------------------
   SET button (攻撃トリガ)
   - if lamp lit, then damage and fancy effect
----------------------------*/
setBtn.addEventListener('click', async ()=>{
  // check current lamp lit state
  const lamp1Lit = document.getElementById("lamp1").classList.contains("lit");
  if(!lamp1Lit){
    // feedback small shake / no damage
    await doScreenShake(200);
    return;
  }
  // damage
  const strong = bossHP <= 80; // stronger effect near death
  bossHP -= (strong?60:40);
  updateBossHP();
  await playBossHitEffect({strong});
  if(bossHP <= 0){
    await playBossDefeatEffect();
  }
});

/* ---------------------------
   Initial setup
----------------------------*/
updateBossHP();
layout();
ensureCanvas();
