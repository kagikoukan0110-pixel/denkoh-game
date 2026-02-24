// game.js (full integrated version)
// Features:
// - stable preview path (pointer/touch)
// - L=N color logic (L black, N white), no red wires
// - bezier routing with device-avoidance
// - parallel offset
// - device shrink (20%), non-overlap placement
// - full boss sequence + particles + flash + dialog
// - quiz selection visual preserved
// - mobile pointer/touch friendly

/* =========================
   STATE
========================= */
let bossHP = 100;
let playerHP = 100;
let roundNum = 1;
let switchOn = false;
let selectedTerminal = null;
let previewPath = null;
let connections = []; // {a,b,path,color,offset}
let state = 'title';

/* =========================
   ELEMENTS
========================= */
const board = document.getElementById('board');
const wireLayer = document.getElementById('wireLayer');
const playerBar = document.getElementById('playerHP');
const bossHPbar = document.getElementById('bossHPbar');
const setBtn = document.getElementById('setBtn');
const switchBtn = document.getElementById('switchBtn');
const roundLabel = document.getElementById('roundLabel');
const lampsContainer = document.getElementById('lampsContainer');
const hitText = document.getElementById('hitText');
const bossPanel = document.getElementById('bossPanel');
const explosionEl = document.getElementById('explosion');
const defeatDialog = document.getElementById('defeatDialog');
const finalVideoWrap = document.getElementById('finalVideoWrap');
const finalVideo = document.getElementById('finalVideo');
const freezeSound = document.getElementById('freezeSound');
const explodeSound = document.getElementById('explodeSound');
const flashOverlay = document.getElementById('flashOverlay');

/* safety */
if(!board || !wireLayer) console.warn('Missing #board or #wireLayer in DOM.');

/* =========================
   UTIL
========================= */
function updateHP(){ playerBar.style.width = playerHP + '%'; }
function updateBossHP(){ bossHPbar.style.width = Math.max(0,bossHP) + '%'; }
function updateRound(){ roundLabel.textContent = roundNum; }
function setState(s){
  state = s;
  const sl = document.getElementById('stateLabel');
  if(sl) sl.textContent = s;
}

/* resize svg overlay to board */
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

/* =========================
   GEOMETRY / PATHS
========================= */
function pathForPoints(x1,y1,x2,y2, offset=0){
  const mx=(x1+x2)/2, my=(y1+y2)/2;
  const dx=x2-x1, dy=y2-y1;
  const len = Math.hypot(dx,dy)||1;
  const nx = -dy/len, ny = dx/len;
  const cx = mx + nx*offset, cy = my + ny*offset;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}
function sampleCurvePoints(x1,y1,x2,y2, offset=0, samples=20){
  const mx=(x1+x2)/2, my=(y1+y2)/2;
  const dx=x2-x1, dy=y2-y1;
  const len = Math.hypot(dx,dy)||1;
  const nx = -dy/len, ny = dx/len;
  const cx = mx + nx*offset, cy = my + ny*offset;
  const pts=[];
  for(let i=0;i<=samples;i++){
    const t = i/samples;
    const xt = (1-t)*(1-t)*x1 + 2*(1-t)*t*cx + t*t*x2;
    const yt = (1-t)*(1-t)*y1 + 2*(1-t)*t*cy + t*t*y2;
    pts.push([xt,yt]);
  }
  return pts;
}
function rectsForDevices(){
  const br = board.getBoundingClientRect();
  return Array.from(document.querySelectorAll('.device')).map(d=>{
    const r = d.getBoundingClientRect();
    return {el:d, left:r.left-br.left, top:r.top-br.top, right:r.right-br.left, bottom:r.bottom-br.top};
  });
}
function curveHitsRects(x1,y1,x2,y2, offset, margin=12){
  const rects = rectsForDevices();
  const pts = sampleCurvePoints(x1,y1,x2,y2,offset,20);
  for(const p of pts){
    for(const r of rects){
      if(p[0] > r.left - margin && p[0] < r.right + margin && p[1] > r.top - margin && p[1] < r.bottom + margin){
        return true;
      }
    }
  }
  return false;
}
function findParallelCount(a,b){
  return connections.filter(c => (c.a===a && c.b===b) || (c.a===b && c.b===a)).length;
}
function pickWireColor(a,b){
  const A=(a||'').toLowerCase(), B=(b||'').toLowerCase();
  if(A.includes('-n') || B.includes('-n') || A.endsWith('n') || B.endsWith('n')) return '#ffffff';
  return '#0b0b0b';
}

/* =========================
   PREVIEW (pointer/touch stable)
========================= */
function removePreview(){
  if(previewPath && previewPath.parentNode) previewPath.remove();
  previewPath = null;
  board.removeEventListener('pointermove', onPointerMovePreview);
}
function onPointerMovePreview(e){
  if(!selectedTerminal || !previewPath) return;
  e.preventDefault && e.preventDefault();
  const br = board.getBoundingClientRect();
  const sr = selectedTerminal.getBoundingClientRect();
  const x1 = sr.left - br.left + sr.width/2;
  const y1 = sr.top - br.top + sr.height/2;
  let clientX = e.clientX, clientY = e.clientY;
  if(e.touches && e.touches[0]){ clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; }
  const x2 = clientX - br.left;
  const y2 = clientY - br.top;
  const d = pathForPoints(x1,y1,x2,y2,0);
  previewPath.setAttribute('d', d);
  // keep preview top
  wireLayer.appendChild(previewPath);
}
function createPreviewForTerminal(el){
  removePreview();
  if(!el) return;
  const id = normalizeId(el.dataset.id, el);
  const color = pickWireColor(id, id);
  previewPath = document.createElementNS('http://www.w3.org/2000/svg','path');
  previewPath.setAttribute('stroke', color);
  previewPath.setAttribute('stroke-width', color === '#ffffff' ? '2' : (getComputedStyle(document.documentElement).getPropertyValue('--wirew')||4));
  previewPath.setAttribute('fill', 'none');
  previewPath.setAttribute('stroke-linecap','round');
  previewPath.style.pointerEvents = 'none';
  wireLayer.appendChild(previewPath);
  board.addEventListener('pointermove', onPointerMovePreview, {passive:false});
  // tiny segment
  const br = board.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const sx = r.left - br.left + r.width/2;
  const sy = r.top - br.top + r.height/2;
  previewPath.setAttribute('d', `M ${sx} ${sy} Q ${sx} ${sy} ${sx+1} ${sy+1}`);
}

/* reuse normalizeId */
function normalizeId(id, el){
  if(!id && el) id = el.dataset.id;
  if(!id) return id;
  if(id === 'jb') return 'jb';
  if(el && el.closest && el.closest('#junction')) return 'jb';
  return id;
}

/* =========================
   CONNECTION (permanent)
========================= */
function connHas(a,b){
  return connections.some(c => (c.a===a && c.b===b) || (c.a===b && c.b===a));
}
function createConnection(aEl,bEl){
  const idA = normalizeId(aEl.dataset.id, aEl);
  const idB = normalizeId(bEl.dataset.id, bEl);
  if(!idA || !idB || idA === idB) return;

  // toggle removal if exists
  for(let i=0;i<connections.length;i++){
    const c=connections[i];
    if((c.a===idA && c.b===idB) || (c.a===idB && c.b===idA)){
      if(c.path && c.path.parentNode) c.path.remove();
      connections.splice(i,1);
      return;
    }
  }

  const br = board.getBoundingClientRect();
  const rA = aEl.getBoundingClientRect();
  const rB = bEl.getBoundingClientRect();
  const x1 = rA.left - br.left + rA.width/2;
  const y1 = rA.top - br.top + rA.height/2;
  const x2 = rB.left - br.left + rB.width/2;
  const y2 = rB.top - br.top + rB.height/2;

  const baseCount = findParallelCount(idA,idB);
  const offsetStep = 14;
  const offsetIndex = baseCount;
  const total = baseCount + 1;
  const centerIndex = (total - 1)/2;
  const baseOffset = (offsetIndex - centerIndex) * offsetStep;

  const tryOffsets = [baseOffset, baseOffset+18, baseOffset-18, baseOffset+36, baseOffset-36, baseOffset+54, baseOffset-54];
  let chosenOffset = tryOffsets[0];
  for(const off of tryOffsets){
    if(!curveHitsRects(x1,y1,x2,y2, off, 12)){
      chosenOffset = off;
      break;
    }
  }

  const d = pathForPoints(x1,y1,x2,y2, chosenOffset);
  const color = pickWireColor(idA, idB);
  const path = document.createElementNS('http://www.w3.org/2000/svg','path');
  path.setAttribute('d', d);
  path.setAttribute('stroke', color);
  path.setAttribute('stroke-width', color === '#ffffff' ? '2' : (getComputedStyle(document.documentElement).getPropertyValue('--wirew')||4));
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke-linecap','round');
  path.setAttribute('data-from', idA);
  path.setAttribute('data-to', idB);

  const len = path.getTotalLength ? path.getTotalLength() : Math.hypot(x2-x1,y2-y1);
  path.style.strokeDasharray = len;
  path.style.strokeDashoffset = len;

  wireLayer.appendChild(path);
  connections.push({a:idA,b:idB,path: path,color:color,offset:chosenOffset});
}

/* animate committed lines */
function animateLinesForward(ms){
  return new Promise(res=>{
    const els = Array.from(wireLayer.querySelectorAll('path')).filter(p => p !== previewPath);
    if(els.length===0){ setTimeout(res, ms); return; }
    els.forEach(el=>{
      const len = el.getTotalLength ? el.getTotalLength() : 200;
      el.style.transition='none';
      el.style.strokeDasharray = len;
      el.style.strokeDashoffset = len;
      void el.getBoundingClientRect();
      el.style.transition = `stroke-dashoffset ${ms}ms linear`;
      el.style.strokeDashoffset = '0';
    });
    setTimeout(res, ms + 60);
  });
}

/* =========================
   TERMINAL HANDLERS
========================= */
function attachTerminalListeners(root){
  root.querySelectorAll('.terminal, .jb-term').forEach(t=>{
    const clone = t.cloneNode(true);
    t.parentNode.replaceChild(clone, t);
    clone.addEventListener('click', (ev) => {
      if(state !== 'play') return;
      if(clone.classList.contains('jb-term')) clone.dataset.id = 'jb';
      if(selectedTerminal === clone){
        clone.classList.remove('selected');
        selectedTerminal = null;
        removePreview();
        return;
      }
      if(!selectedTerminal){
        selectedTerminal = clone;
        clone.classList.add('selected');
        createPreviewForTerminal(clone);
        return;
      }
      if(selectedTerminal !== clone){
        createConnection(selectedTerminal, clone);
      }
      if(selectedTerminal) selectedTerminal.classList.remove('selected');
      selectedTerminal = null;
      removePreview();
    });
  });
}
attachTerminalListeners(document);
function refreshTerminals(){ attachTerminalListeners(document); }

/* =========================
   LAMP CREATION
========================= */
function createLamps(count){
  Array.from(document.querySelectorAll("[id^='lamp-']")).forEach(el=>el.remove());
  for(let i=1;i<=count;i++){
    const id = `lamp-${i}`;
    const div = document.createElement('div');
    div.className = 'device lamp';
    div.id = id;
    div.innerHTML = `
      <div class="light-halo" aria-hidden="true"></div>
      <svg class="bulb-shape icon" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M32 8c-6.6 0-12 5.4-12 12 0 4.6 2.7 8.6 5.6 10.8 1.9 1.5 3 3.6 3 5.8v3.2c0 .6.4 1 1 1h5.8c.6 0 1-.4 1-1V37c0-2.2 1.1-4.3 3-5.8 2.9-2.2 5.6-6.2 5.6-10.8 0-6.6-5.4-12-12-12z" fill="#f4f4f2" stroke="#ddd"/>
        <rect x="28" y="44" width="8" height="8" rx="1" fill="#bbb"/>
      </svg>
      <div style="display:flex;gap:8px;margin-top:6px;justify-content:center;">
        <div class="terminal" data-id="${id}-L">L</div>
        <div class="terminal" data-id="${id}-N">N</div>
      </div>
    `;
    lampsContainer.appendChild(div);
  }
  refreshTerminals();
  setTimeout(()=>{ randomizeDevicePositions(); resizeSVG(); }, 60);
}
function getLampIds(){ return Array.from(document.querySelectorAll("[id^='lamp-']")).map(el=>el.id); }

/* =========================
   DEVICE POSITIONING (non-overlap) - shrink 20%
========================= */
function randomizeDevicePositions(){
  const boardRect = board.getBoundingClientRect();
  const anchored = new Set(['junction','power','switch']);
  const devices = Array.from(document.querySelectorAll('.device')).filter(d=>!anchored.has(d.id));
  const placed = [];
  const j = document.getElementById('junction');
  const jRect = j ? j.getBoundingClientRect() : null;
  const jLocal = jRect ? {left:jRect.left - boardRect.left, top:jRect.top - boardRect.top, right:jRect.right - boardRect.left, bottom:jRect.bottom - boardRect.top} : null;
  const MARGIN = 18;

  devices.forEach((dev, idx) => {
    const shrink = 0.8;
    dev.style.transformOrigin = 'center';
    dev.style.transform = `translate(-50%,-50%) scale(${shrink})`;
    const w = (dev.offsetWidth || 86) * shrink;
    const h = (dev.offsetHeight || 86) * shrink;
    const minX = 20 + w/2;
    const maxX = Math.max(minX, boardRect.width - 20 - w/2);
    const minY = 20 + h/2;
    const maxY = Math.max(minY, boardRect.height - 180 - h/2);

    let attempts = 0;
    let placedRect = null;
    while(attempts++ < 1200){
      const leftPx = Math.random() * (maxX - minX) + minX;
      const topPx = Math.random() * (maxY - minY) + minY;
      const rect = {left:leftPx - w/2, top: topPx - h/2, right:leftPx + w/2, bottom: topPx + h/2};
      if(jLocal){
        const overlapJ = !(rect.right < jLocal.left - MARGIN || rect.left > jLocal.right + MARGIN || rect.bottom < jLocal.top - MARGIN || rect.top > jLocal.bottom + MARGIN);
        if(overlapJ) continue;
      }
      let ok = true;
      for(const p of placed){
        const overlap = !(rect.right < p.left - MARGIN || rect.left > p.right + MARGIN || rect.bottom < p.top - MARGIN || rect.top > p.bottom + MARGIN);
        if(overlap){ ok=false; break; }
      }
      if(!ok) continue;
      placed.push(rect);
      placedRect = rect;
      dev.style.left = (leftPx / boardRect.width * 100) + '%';
      dev.style.top = (topPx / boardRect.height * 100) + '%';
      dev.style.position = 'absolute';
      dev.style.zIndex = 60;
      break;
    }
    if(!placedRect){
      const cols = Math.max(1, Math.round(Math.sqrt(devices.length)));
      const col = idx % cols;
      const row = Math.floor(idx/cols);
      const leftPx = minX + ((cols===1?0.5:col/(cols-1))*(maxX-minX||0));
      const rows = Math.ceil(devices.length/cols);
      const topPx = minY + ((rows===1?0.5:row/(rows-1))*(maxY-minY||0));
      dev.style.left = (leftPx/boardRect.width*100) + '%';
      dev.style.top = (topPx/boardRect.height*100) + '%';
      dev.style.position = 'absolute';
      dev.style.zIndex = 60;
      placed.push({left:leftPx-w/2, top:topPx-h/2, right:leftPx+w/2, bottom:topPx+h/2});
    }
  });
  setTimeout(resizeSVG,80);
}

/* =========================
   PARTICLES & BOSS SEQ
========================= */
function makeParticles(cx,cy,count=28){
  for(let i=0;i<count;i++){
    const p = document.createElement('div');
    p.className = 'particle';
    document.body.appendChild(p);
    const angle = Math.random()*Math.PI*2;
    const speed = 120 + Math.random()*260;
    const dx = Math.cos(angle)*speed;
    const dy = Math.sin(angle)*speed;
    p.style.left = (cx - 6) + 'px';
    p.style.top = (cy - 6) + 'px';
    p.style.background = `hsl(${30 + Math.random()*40},85%,${60 + Math.random()*8}%)`;
    p.style.transition = `transform 900ms cubic-bezier(.1,.9,.2,1), opacity 900ms linear`;
    requestAnimationFrame(()=>{ p.style.transform = `translate(${dx}px, ${dy}px) scale(${0.6 + Math.random()*1.4})`; p.style.opacity = 0; });
    setTimeout(()=>p.remove(), 1100);
  }
}

async function doBossSequence(){
  const bossScreen = document.getElementById('bossScreen');
  if(bossScreen) bossScreen.style.display = 'flex';
  document.getElementById('stateLabel') && (document.getElementById('stateLabel').textContent = 'boss');
  try{ freezeSound.currentTime = 0; await freezeSound.play(); }catch(e){}
  const dmg = 40;
  hitText.style.display = 'block';
  hitText.textContent = `HIT - ${dmg}`;
  bossPanel.classList.add('boss-damage');
  await new Promise(r=>setTimeout(r,2000));
  bossPanel.classList.remove('boss-damage');
  hitText.style.display = 'none';
  bossHP -= dmg;
  updateBossHP();

  if(bossHP <= 0 || roundNum >= 3){
    explosionEl.style.display = 'block';
    explosionEl.style.transform = 'translate(-50%,-50%) scale(0.01)';
    void explosionEl.offsetWidth;
    explosionEl.style.transition = 'transform 900ms cubic-bezier(.2,.9,.2,1), opacity 900ms linear';
    explosionEl.style.transform = 'translate(-50%,-50%) scale(1.6)';
    try{ explodeSound.currentTime = 0; await explodeSound.play(); }catch(e){}
    const bpRect = bossPanel.getBoundingClientRect();
    makeParticles(bpRect.left + bpRect.width/2, bpRect.top + bpRect.height/2, 44);
    flashOverlay.style.display = 'block';
    flashOverlay.style.opacity = '1';
    flashOverlay.style.transition = 'opacity 1200ms ease';
    setTimeout(()=>{ flashOverlay.style.opacity = '0'; }, 180);
    setTimeout(()=>{ flashOverlay.style.display = 'none'; }, 1400);
    await new Promise(r=>setTimeout(r,900));
    explosionEl.style.opacity = '0';
    await new Promise(r=>setTimeout(r,360));
    explosionEl.style.display = 'none';

    const lines = ['ぶっ壊したぞ……！','先行配線させとけば良かった。','街の電気は守られる。'];
    defeatDialog.style.display = 'block';
    for(const line of lines){
      defeatDialog.textContent = line;
      defeatDialog.style.transform = 'translate(-50%,-50%) scale(0.9)';
      defeatDialog.style.opacity = '0';
      void defeatDialog.offsetWidth;
      defeatDialog.style.transition = 'transform 220ms ease, opacity 220ms ease';
      defeatDialog.style.transform = 'translate(-50%,-50%) scale(1)';
      defeatDialog.style.opacity = '1';
      await new Promise(r=>setTimeout(r,1400));
    }
    await new Promise(r=>setTimeout(r,600));
    defeatDialog.style.display = 'none';
    if(bossScreen) bossScreen.style.display = 'none';
    finalVideoWrap.style.display = 'flex';
    try{
      finalVideo.muted = false;
      await finalVideo.play();
    }catch(e){
      try{ finalVideo.muted = true; await finalVideo.play(); }catch(err){ console.warn('video autoplay blocked'); }
    }
    setTimeout(()=>{
      try{ finalVideo.pause(); }catch(e){}
      finalVideoWrap.style.display = 'none';
      const overlay = document.getElementById('overlay');
      if(overlay){ overlay.style.display = 'flex'; overlay.textContent = 'WORLD1 CLEAR'; }
      document.getElementById('stateLabel') && (document.getElementById('stateLabel').textContent = 'clear');
    }, 3000);
    return;
  }

  await new Promise(r=>setTimeout(r,600));
  if(bossScreen) bossScreen.style.display = 'none';

  // clear wires & selection for next round
  document.querySelectorAll('.terminal.selected').forEach(t=>t.classList.remove('selected'));
  Array.from(wireLayer.querySelectorAll('path')).forEach(p => p.remove());
  connections = [];
  selectedTerminal = null;
  removePreview();

  roundNum++;
  updateRound();
  createLamps(roundNum);
  setState('play');
}

/* =========================
   UI ACTIONS
========================= */
setBtn.addEventListener('click', async ()=>{
  if(state !== 'play'){ alert('配線パートで実行してください'); return; }
  if(!switchOn){ alert('スイッチがOFFです。SWITCH を押して ON にしてください。'); return; }

  await animateLinesForward(1400);

  // basic validation
  if(!connections.some(c => c.a === 'jb' || c.b === 'jb')){
    playerHP = Math.max(0, playerHP - 20);
    updateHP();
    if(playerHP <= 0) alert('PLAYER HP 0 - game over');
    return;
  }
  const baseOk = connHas('power-L','jb') && connHas('jb','switch-IN') && connHas('switch-OUT','jb') && connHas('power-N','jb');
  if(!baseOk){
    playerHP = Math.max(0, playerHP - 20);
    updateHP();
    if(playerHP <= 0) alert('PLAYER HP 0 - game over');
    return;
  }

  // light correctly connected lamps
  getLampIds().forEach(id=>{
    const lit = connHas('jb', `${id}-L`) && connHas('jb', `${id}-N`);
    const el = document.getElementById(id);
    if(el){
      if(lit){ el.classList.add('lit'); setTimeout(()=>el.classList.remove('lit'), 2200); }
      else el.classList.remove('lit');
    }
  });

  // user requested extra +2s wait before boss sequence
  await new Promise(r=>setTimeout(r, 2000));
  await doBossSequence();
});

document.getElementById('resetWires') && document.getElementById('resetWires').addEventListener('click', ()=>{
  Array.from(wireLayer.querySelectorAll('path')).forEach(p=>{
    if(p === previewPath) return;
    p.remove();
  });
  connections = [];
  selectedTerminal = null;
  removePreview();
  document.querySelectorAll('.terminal.selected').forEach(t => t.classList.remove('selected'));
});

document.getElementById('restart') && document.getElementById('restart').addEventListener('click', ()=>{
  playerHP=100; bossHP=100; roundNum=1;
  updateHP(); updateBossHP(); updateRound();
  const overlay = document.getElementById('overlay');
  if(overlay) overlay.style.display = 'none';
  Array.from(wireLayer.querySelectorAll('path')).forEach(p => p.remove());
  connections = [];
  selectedTerminal = null;
  removePreview();
  document.querySelectorAll('.lamp').forEach(l => l.classList.remove('lit'));
  setState('title');
});

switchBtn.addEventListener('click', ()=>{
  switchOn = !switchOn;
  const s = document.getElementById('switchState');
  if(s) s.textContent = switchOn ? 'Switch: ON' : 'Switch: OFF';
});

/* =========================
   QUIZ INTERFACE (keeps chosen style)
========================= */
const questions = [
  {q:'電気で L は何を表す？', opts:['中性線','活線(L)','地線','照明'], correct:1},
  {q:'単相100Vの家庭用コンセントでLとNの意味は？', opts:['L=中性,N=活線','L=活線,N=中性','どちらも地線','L=地線,N=活線'], correct:1},
  {q:'接地(アース)の目的は？', opts:['電流を増やす','絶縁を破る','漏電時に安全に逃がす','スイッチの代わり'], correct:2},
  {q:'片切スイッチとは？', opts:['2か所で操作するスイッチ','1つの回路を入切するスイッチ','常時接続の端子','漏電遮断器'], correct:1},
  {q:'ジョイントボックスの役割は？', opts:['電気を貯める','配線を接続・保護する','電圧を上げる','照明を点ける'], correct:1}
];
let quizIdx = 0;
function renderQuiz(){
  const quizQuestion = document.getElementById('quizQuestion');
  const quizOptions = document.getElementById('quizOptions');
  const quizIndex = document.getElementById('quizIndex');
  const q = questions[quizIdx];
  quizQuestion.textContent = q.q;
  quizOptions.innerHTML = '';
  q.opts.forEach((opt,i)=>{
    const b = document.createElement('button');
    b.className = 'quizOpt small';
    b.textContent = opt;
    b.dataset.index = i;
    b.addEventListener('click', ()=> {
      document.querySelectorAll('.quizOpt').forEach(x=>x.classList.remove('chosen'));
      b.classList.add('chosen');
    });
    quizOptions.appendChild(b);
  });
  quizIndex.textContent = (quizIdx+1) + ' / ' + questions.length;
}
document.getElementById('toQuiz').addEventListener('click', ()=>{ quizIdx=0; renderQuiz(); setState('quiz'); });
document.getElementById('skipQuiz').addEventListener('click', ()=>{ startPlay(); });
document.getElementById('answerBtn').addEventListener('click', ()=>{
  const chosen = Array.from(document.querySelectorAll('.quizOpt')).find(x=>x.classList.contains('chosen'));
  if(!chosen){ alert('選択肢を選んでください'); return; }
  const sel = Number(chosen.dataset.index);
  const correct = questions[quizIdx].correct;
  if(sel !== correct){ playerHP = Math.max(0, playerHP - 10); updateHP(); }
  quizIdx++;
  if(quizIdx < questions.length) renderQuiz(); else startPlay();
});

/* =========================
   START / INIT
========================= */
function startPlay(){
  setState('play');
  // anchor reposition of junction/power/switch left as in HTML; randomize others
  createLamps(roundNum);
  removePreview();
  connections = [];
  selectedTerminal = null;
  setTimeout(()=>{ randomizeDevicePositions(); resizeSVG(); }, 120);
}
updateHP(); updateBossHP(); updateRound();
startPlay();

/* expose for debug */
window.__game = {
  createConnection, connections, createLamps, randomizeDevicePositions, startPlay
};
