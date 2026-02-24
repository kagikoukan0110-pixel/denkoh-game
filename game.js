/* game.js */

/* state */
let bossHP = 100;
let playerHP = 100;
let roundNum = 1;
let switchOn = false;
let selected = null;
let previewPath = null;         // preview (mouse-follow) path DOM
let connections = [];           // [idA,idB,path]
let state = 'title';

/* elements */
const board = document.getElementById("board");
const wireLayer = document.getElementById("wireLayer");
const playerBar = document.getElementById("playerHP");
const bossHPbar = document.getElementById("bossHPbar");
const setBtn = document.getElementById("setBtn");
const switchBtn = document.getElementById("switchBtn");
const roundLabel = document.getElementById("roundLabel");
const quizQuestion = document.getElementById("quizQuestion");
const quizOptions = document.getElementById("quizOptions");
const quizIndex = document.getElementById("quizIndex");
const lampsContainer = document.getElementById("lampsContainer");
const hitText = document.getElementById("hitText");
const bossPanel = document.getElementById("bossPanel");
const explosionEl = document.getElementById("explosion");
const defeatDialog = document.getElementById("defeatDialog");
const flashOverlay = document.getElementById("flashOverlay");
const freezeSound = document.getElementById("freezeSound");
const explodeSound = document.getElementById("explodeSound");

/* helpers */
function resizeSVG(){
  const r = board.getBoundingClientRect();
  wireLayer.setAttribute("viewBox", `0 0 ${r.width} ${r.height}`);
  wireLayer.style.left = r.left + 'px';
  wireLayer.style.top = r.top + 'px';
  wireLayer.style.width = r.width + 'px';
  wireLayer.style.height = r.height + 'px';
}
window.addEventListener("resize", resizeSVG);
window.addEventListener("load", ()=>{ resizeSVG(); setTimeout(resizeSVG,120); });

function updateHP(){ playerBar.style.width = playerHP + "%"; }
function updateBossHP(){ bossHPbar.style.width = Math.max(0,bossHP) + "%"; }
function updateRound(){ roundLabel.textContent = roundNum; }
function setState(s){ state = s; document.getElementById('stateLabel').textContent = s;
  const title = document.getElementById('titleScreen'), quiz = document.getElementById('quizScreen');
  if(s==='title'){ title.classList.add('show'); quiz.classList.remove('show'); }
  else if(s==='quiz'){ title.classList.remove('show'); quiz.classList.add('show'); }
  else { title.classList.remove('show'); quiz.classList.remove('show'); }
}

/* quiz (visual selection marks applied via 'chosen' class) */
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
    b.addEventListener('click', ()=>{ document.querySelectorAll('.quizOpt').forEach(x=>x.classList.remove('chosen')); b.classList.add('chosen'); });
    quizOptions.appendChild(b);
  });
  quizIndex.textContent = (quizIdx+1) + ' / ' + questions.length;
}

/* terminals and preview handling */
function normalizeId(id, el){ if(!id && el) id = el.dataset.id; if(!id) return id; if(id==='jb') return 'jb'; if(el && el.closest && el.closest('#junction')) return 'jb'; return id; }

function removePreview(){
  if(previewPath && previewPath.parentNode) previewPath.remove();
  previewPath = null;
  board.removeEventListener('mousemove', onMouseMovePreview);
}
function getPreviewColorFromId(id){
  if(!id) return '#ffffff';
  const s = id.toLowerCase();
  return (s.includes('-n') || s.endsWith('n')) ? '#ffffff' : '#0b0b0b';
}
function onMouseMovePreview(e){
  if(!selected || !previewPath) return;
  const boardRect = board.getBoundingClientRect();
  const startRect = selected.getBoundingClientRect();
  const x1 = startRect.left - boardRect.left + startRect.width/2;
  const y1 = startRect.top - boardRect.top + startRect.height/2;
  const x2 = e.clientX - boardRect.left;
  const y2 = e.clientY - boardRect.top;
  const d = pathForPoints(x1,y1,x2,y2,0);
  previewPath.setAttribute('d', d);
  // ensure preview path is on top
  wireLayer.appendChild(previewPath);
}
function createPreviewFor(el){
  removePreview();
  if(!el) return;
  const color = getPreviewColorFromId(el.dataset.id);
  previewPath = document.createElementNS("http://www.w3.org/2000/svg","path");
  previewPath.setAttribute("stroke", color);
  previewPath.setAttribute("stroke-width", color === '#ffffff' ? "2" : "3");
  previewPath.setAttribute("fill","none");
  previewPath.setAttribute("stroke-linecap","round");
  previewPath.style.pointerEvents = 'none';
  wireLayer.appendChild(previewPath);
  board.addEventListener('mousemove', onMouseMovePreview);
  // small initial segment
  const r = el.getBoundingClientRect(), br = board.getBoundingClientRect();
  const sx = r.left - br.left + r.width/2, sy = r.top - br.top + r.height/2;
  previewPath.setAttribute('d', `M ${sx} ${sy} Q ${sx} ${sy} ${sx+1} ${sy+1}`);
}

/* attach terminal listeners */
function attachTerminalListeners(root){
  root.querySelectorAll(".terminal, .jb-term").forEach(t=>{
    const clone = t.cloneNode(true);
    t.parentNode.replaceChild(clone,t);
    clone.addEventListener('click',(e)=>{
      if(state !== 'play') return;
      if(clone.classList.contains('jb-term')) clone.dataset.id = 'jb';
      if(selected === clone){ clone.classList.remove('selected'); selected=null; removePreview(); return; }
      if(!selected){ selected = clone; clone.classList.add('selected'); createPreviewFor(clone); return; }
      if(selected !== clone){ connect(selected, clone); }
      if(selected) selected.classList.remove('selected');
      selected = null;
      removePreview();
    });
  });
}
attachTerminalListeners(document);

/* dynamic lamps (compact, no text) */
function createLamps(count){
  Array.from(document.querySelectorAll("[id^='lamp-']")).forEach(el=>el.remove());
  for(let i=1;i<=count;i++){
    const id = `lamp-${i}`;
    const div = document.createElement('div');
    div.className = 'device lamp';
    div.id = id;
    div.style.left = (20 + i*12) + '%';
    div.style.top = (40 + (i%2)*22) + '%';
    div.innerHTML = `<div class="light-halo" aria-hidden></div>
      <svg class="bulb-shape icon" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M32 8c-6.6 0-12 5.4-12 12 0 4.6 2.7 8.6 5.6 10.8 1.9 1.5 3 3.6 3 5.8v3.2c0 .6.4 1 1 1h5.8c.6 0 1-.4 1-1V37c0-2.2 1.1-4.3 3-5.8 2.9-2.2 5.6-6.2 5.6-10.8 0-6.6-5.4-12-12-12z" fill="#f4f4f2" stroke="#ddd"/>
        <rect x="28" y="44" width="8" height="8" rx="1" fill="#bbb"/>
      </svg>
      <div style="display:flex;gap:8px;margin-top:6px;">
        <div class="terminal" data-id="${id}-L">L</div>
        <div class="terminal" data-id="${id}-N">N</div>
      </div>`;
    lampsContainer.appendChild(div);
    attachTerminalListeners(div);
  }
  setTimeout(()=>{ randomizeDevicePositions(); resizeSVG(); }, 60);
}
function getLampIds(){ return Array.from(document.querySelectorAll("[id^='lamp-']")).map(el=>el.id); }

/* routing: path with offset; avoid device rectangles by sampling the curve */
function pathForPoints(x1,y1,x2,y2, offset=0){
  const mx=(x1+x2)/2, my=(y1+y2)/2;
  const dx=x2-x1, dy=y2-y1;
  const len = Math.hypot(dx,dy)||1;
  const nx = -dy/len, ny = dx/len;
  const cx = mx + nx*offset, cy = my + ny*offset;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}
function sampleCurvePoints(x1,y1,x2,y2, offset=0, samples=18){
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
    return {el:d, left:r.left - br.left, top:r.top - br.top, right:r.right - br.left, bottom:r.bottom - br.top};
  });
}
function curveHitsRects(x1,y1,x2,y2, offset, margin=10){
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

/* pick color: World1 rule N=white else black */
function pickWireColor(idA,idB){
  const a=(idA||'').toLowerCase(), b=(idB||'').toLowerCase();
  if(a.includes('-n') || b.includes('-n') || a.endsWith('n') || b.endsWith('n')) return '#ffffff';
  return '#0b0b0b';
}

function findParallelCount(idA,idB){
  return connections.filter(c=>{
    const a=c[0], b=c[1];
    return (a===idA && b===idB) || (a===idB && b===idA);
  }).length;
}

/* connect with avoidance: try offsets until curve doesn't hit device rects */
function connect(a,b){
  const idA = normalizeId(a.dataset.id,a);
  const idB = normalizeId(b.dataset.id,b);
  if(!idA||!idB) return;
  if(idA===idB) return;

  // toggle: if exists remove
  for(let i=0;i<connections.length;i++){
    const c=connections[i];
    if((c[0]===idA && c[1]===idB)||(c[0]===idB && c[1]===idA)){
      if(c[2] && c[2].parentNode) c[2].remove();
      connections.splice(i,1);
      return;
    }
  }

  const rectA = a.getBoundingClientRect();
  const rectB = b.getBoundingClientRect();
  const boardRect = board.getBoundingClientRect();
  const x1 = rectA.left - boardRect.left + rectA.width/2;
  const y1 = rectA.top - boardRect.top + rectA.height/2;
  const x2 = rectB.left - boardRect.left + rectB.width/2;
  const y2 = rectB.top - boardRect.top + rectB.height/2;

  // parallel offset index
  const baseCount = findParallelCount(idA,idB);
  const offsetStep = 12;
  const offsetIndex = baseCount;
  const total = baseCount + 1;
  const centerIndex = (total - 1) / 2;
  const baseOffset = (offsetIndex - centerIndex) * offsetStep;

  // try offsets to avoid device rects (increase in both perpendicular directions)
  const tryOffsets = [baseOffset, baseOffset+16, baseOffset-16, baseOffset+32, baseOffset-32, baseOffset+48, baseOffset-48];
  let chosenOffset = tryOffsets[0];
  for(const off of tryOffsets){
    if(!curveHitsRects(x1,y1,x2,y2, off, 10)){ chosenOffset = off; break; }
  }

  const d = pathForPoints(x1,y1,x2,y2, chosenOffset);
  const path = document.createElementNS("http://www.w3.org/2000/svg","path");
  path.setAttribute("d", d);
  const color = pickWireColor(idA,idB);
  path.setAttribute("stroke", color);
  if(color === '#ffffff'){ path.setAttribute("stroke-width","2"); path.setAttribute("stroke-opacity","0.98"); }
  else { path.setAttribute("stroke-width", getComputedStyle(document.documentElement).getPropertyValue('--wirew')||4); path.setAttribute("stroke-opacity","1"); }
  path.setAttribute("fill","none");
  path.setAttribute("stroke-linecap","round");
  path.setAttribute("data-from", idA);
  path.setAttribute("data-to", idB);
  const len = path.getTotalLength ? path.getTotalLength() : Math.hypot(x2-x1,y2-y1);
  path.style.strokeDasharray = len;
  path.style.strokeDashoffset = len;
  wireLayer.appendChild(path); // appended last -> top
  connections.push([idA,idB,path]);
}

/* check solution */
function connHas(a,b){ return connections.some(c => (c[0]===a && c[1]===b) || (c[0]===b && c[1]===a)); }
function checkSolution(){
  if(!connections.some(c=>c[0]==='jb' || c[1]==='jb')) return false;
  const baseOk = connHas("power-L","jb") && connHas("jb","switch-IN") && connHas("switch-OUT","jb") && connHas("power-N","jb");
  if(!baseOk) return false;
  const lamps = getLampIds();
  for(const lid of lamps){
    if(connHas("jb", `${lid}-L`) && connHas("jb", `${lid}-N`)) return true;
  }
  return false;
}

/* animate wires forward (exclude previewPath) */
function animateLinesForward(ms){
  return new Promise(res=>{
    const els = Array.from(wireLayer.querySelectorAll("path, line")).filter(el => el !== previewPath);
    if(els.length===0){ setTimeout(res,ms); return; }
    els.forEach(el=>{
      const len = el.getTotalLength ? el.getTotalLength() : 200;
      el.style.transition='none';
      el.style.strokeDasharray = len;
      el.style.strokeDashoffset = len;
      void el.getBoundingClientRect();
      el.style.transition = `stroke-dashoffset ${ms}ms linear`;
      el.style.strokeDashoffset = 0;
    });
    setTimeout(res, ms + 60);
  });
}

/* layout: stronger non-overlap and anchor certain devices */
function randomizeDevicePositions(){
  const boardRect = board.getBoundingClientRect();
  const anchored = new Set(['junction','power','switch']);
  const devices = Array.from(document.querySelectorAll('.device')).filter(d=>!anchored.has(d.id));
  const placed = [];
  const junctionRect = document.getElementById('junction').getBoundingClientRect();
  const jLocal = {left:junctionRect.left - boardRect.left, top:junctionRect.top - boardRect.top, right:junctionRect.right - boardRect.left, bottom:junctionRect.bottom - boardRect.top};

  const MARGIN = 20;
  devices.forEach((dev, idx)=>{
    const w = dev.offsetWidth || 48;
    const h = dev.offsetHeight || 56;
    const minX = 20 + w/2;
    const maxX = Math.max(minX, boardRect.width - 20 - w/2);
    const minY = 20 + h/2;
    const maxY = Math.max(minY, boardRect.height - 20 - h/2);
    let attempts=0, placedRect=null;
    while(attempts++<1200){
      const leftPx = Math.random()*(maxX-minX)+minX;
      const topPx = Math.random()*(maxY-minY)+minY;
      const rect={left:leftPx-w/2, top:topPx-h/2, right:leftPx+w/2, bottom:topPx+h/2};
      // avoid junction area
      const overlapJ = !(rect.right < jLocal.left - MARGIN || rect.left > jLocal.right + MARGIN || rect.bottom < jLocal.top - MARGIN || rect.top > jLocal.bottom + MARGIN);
      if(overlapJ) continue;
      // avoid placed
      let ok=true;
      for(const p of placed){
        const overlap = !(rect.right < p.left - MARGIN || rect.left > p.right + MARGIN || rect.bottom < p.top - MARGIN || rect.top > p.bottom + MARGIN);
        if(overlap){ ok=false; break; }
      }
      if(!ok) continue;
      placed.push(rect);
      placedRect=rect;
      dev.style.left = (leftPx/boardRect.width*100)+'%';
      dev.style.top = (topPx/boardRect.height*100)+'%';
      break;
    }
    if(!placedRect){
      // fallback grid
      const cols = Math.max(1, Math.round(Math.sqrt(devices.length)));
      const col = idx % cols;
      const row = Math.floor(idx/cols);
      const leftPx = minX + ((cols===1?0.5:col/(cols-1))*(maxX-minX||0));
      const rows = Math.ceil(devices.length/cols);
      const topPx = minY + ((rows===1?0.5:row/(rows-1))*(maxY-minY||0));
      dev.style.left = (leftPx/boardRect.width*100)+'%';
      dev.style.top = (topPx/boardRect.height*100)+'%';
      placed.push({left:leftPx-w/2, top:topPx-h/2, right:leftPx+w/2, bottom:topPx+h/2});
    }
  });
  setTimeout(resizeSVG,80);
}

/* particles & boss sequence */
function makeParticles(cx,cy,count=28){ for(let i=0;i<count;i++){ const p=document.createElement('div');p.className='particle';document.body.appendChild(p); const angle=Math.random()*Math.PI*2, speed=120+Math.random()*220, dx=Math.cos(angle)*speed, dy=Math.sin(angle)*speed; p.style.left=(cx-4)+'px'; p.style.top=(cy-4)+'px'; p.style.background=`hsl(${30+Math.random()*40},90%,${60+Math.random()*10}%)`; p.style.transition=`transform 900ms cubic-bezier(.1,.9,.2,1), opacity 900ms ease`; requestAnimationFrame(()=>{ p.style.transform=`translate(${dx}px, ${dy}px) scale(${0.6+Math.random()*1.2})`; p.style.opacity=0; }); setTimeout(()=>p.remove(),1000); } }

async function doBossSequence(){
  document.getElementById('stateLabel').textContent='boss';
  document.getElementById('bossScreen').style.display='flex';
  await new Promise(r=>setTimeout(r,220));
  try{ freezeSound.currentTime=0; await freezeSound.play(); }catch(e){}
  const dmg=50;
  hitText.style.display='block'; hitText.textContent=`HIT - ${dmg}`; bossPanel.classList.add('boss-damage');
  await new Promise(r=>setTimeout(r,900));
  bossPanel.classList.remove('boss-damage'); hitText.style.display='none';
  bossHP -= dmg; updateBossHP();
  if(bossHP <= 0 || roundNum >= 3){
    explosionEl.style.display='block'; explosionEl.style.transform='translate(-50%,-50%) scale(0.01)'; void explosionEl.offsetWidth;
    explosionEl.style.transition='transform 900ms cubic-bezier(.2,.9,.2,1), opacity 1000ms linear'; explosionEl.style.transform='translate(-50%,-50%) scale(1.6)';
    try{ explodeSound.currentTime=0; await explodeSound.play(); }catch(e){}
    const bpRect = bossPanel.getBoundingClientRect(); makeParticles(bpRect.left+bpRect.width/2,bpRect.top+bpRect.height/2,36);
    flashOverlay.style.display='block'; flashOverlay.style.opacity='1'; flashOverlay.style.transition='opacity 1200ms ease';
    setTimeout(()=>{ flashOverlay.style.opacity='0'; },180); setTimeout(()=>flashOverlay.style.display='none',1400);
    await new Promise(r=>setTimeout(r,900));
    explosionEl.style.opacity='0'; await new Promise(r=>setTimeout(r,360)); explosionEl.style.display='none';
    const lines=['ぶっ壊したぞ……！','先行配線させとけば良かった。','街の電気は守られる。'];
    defeatDialog.style.display='block';
    for(const line of lines){ defeatDialog.textContent=line; defeatDialog.style.transform='translate(-50%,-50%) scale(0.9)'; defeatDialog.style.opacity='0'; void defeatDialog.offsetWidth; defeatDialog.style.transition='transform 220ms ease, opacity 220ms ease'; defeatDialog.style.transform='translate(-50%,-50%) scale(1)'; defeatDialog.style.opacity='1'; await new Promise(r=>setTimeout(r,1400)); }
    await new Promise(r=>setTimeout(r,600)); defeatDialog.style.display='none'; document.getElementById('bossScreen').style.display='none';
    document.getElementById('finalVideoWrap').style.display='flex'; try{ document.getElementById('finalVideo').play(); }catch(e){}
    setTimeout(()=>{ try{ document.getElementById('finalVideo').pause(); }catch(e){} document.getElementById('finalVideoWrap').style.display='none'; document.getElementById('overlay').style.display='flex'; document.getElementById('overlay').textContent='WORLD1 CLEAR'; document.getElementById('stateLabel').textContent='clear'; },3000);
    return;
  }
  await new Promise(r=>setTimeout(r,480));
  document.getElementById('bossScreen').style.display='none';
  // reset wires / selection
  document.querySelectorAll(".terminal.selected").forEach(t=>t.classList.remove('selected'));
  Array.from(wireLayer.querySelectorAll("path, line")).forEach(x=>x.remove());
  connections = []; selected=null; removePreview();
  roundNum++; updateRound(); createLamps(roundNum); document.getElementById('stateLabel').textContent='play';
}

/* UI interactions (SET) */
setBtn.addEventListener("click", async ()=>{
  if(state !== 'play'){ alert('配線パートで実行してください'); return; }
  if(!switchOn){ alert('スイッチがOFFです。'); return; }
  await animateLinesForward(1000);
  if(checkSolution()){
    getLampIds().forEach(id=>{
      const lit = connHas('jb', `${id}-L`) && connHas('jb', `${id}-N`);
      const el = document.getElementById(id);
      if(el){ if(lit){ el.classList.add('lit'); setTimeout(()=>el.classList.remove('lit'),2200);} else el.classList.remove('lit'); }
    });
    // extra wait before boss
    await new Promise(r=>setTimeout(r,2360));
    await doBossSequence();
    return;
  }
  playerHP = Math.max(0, playerHP - 20); updateHP();
  document.querySelectorAll('.lamp').forEach(l=>{ l.classList.add('lit'); setTimeout(()=>l.classList.remove('lit'),700); });
  if(playerHP <= 0) alert('PLAYER HP 0 - game over');
});

/* reset/restart */
document.getElementById("resetWires").addEventListener("click", ()=>{
  Array.from(wireLayer.querySelectorAll("path, line")).forEach(x=>x.remove());
  connections = []; selected=null; removePreview();
  document.querySelectorAll(".terminal.selected").forEach(t=>t.classList.remove('selected'));
});
document.getElementById("restart").addEventListener("click", ()=>{
  playerHP=100; bossHP=100; roundNum=1; updateHP(); updateBossHP(); updateRound();
  document.getElementById('overlay').style.display='none';
  Array.from(wireLayer.querySelectorAll("path, line")).forEach(x=>x.remove());
  connections = []; selected=null; removePreview(); document.querySelectorAll('.lamp').forEach(l=>l.classList.remove('lit'));
  setState('title');
});

/* switch toggle */
switchBtn.addEventListener("click", ()=>{ switchOn = !switchOn; document.getElementById('switchState').textContent = switchOn ? 'Switch: ON' : 'Switch: OFF'; });

/* quiz handlers */
document.getElementById('toQuiz').addEventListener('click', ()=>{ quizIdx=0; renderQuiz(); setState('quiz'); });
document.getElementById('skipQuiz').addEventListener('click', ()=>{ startPlay(); });
document.getElementById('answerBtn').addEventListener('click', ()=>{
  const chosen = Array.from(document.querySelectorAll('.quizOpt')).find(x=>x.classList.contains('chosen'));
  if(!chosen){ alert('選択肢を選んでください'); return; }
  const selectedIndex = Number(chosen.dataset.index);
  const correctIndex = questions[quizIdx].correct;
  if(selectedIndex !== correctIndex){ playerHP = Math.max(0, playerHP - 10); updateHP(); }
  quizIdx++;
  if(quizIdx < questions.length) renderQuiz(); else startPlay();
});

/* start play */
function startPlay(){
  setState('play'); document.getElementById('stateLabel').textContent='play';
  document.getElementById('junction').style.left='40%'; document.getElementById('junction').style.top='42%';
  createLamps(roundNum);
  document.querySelectorAll(".terminal.selected").forEach(t=>t.classList.remove('selected'));
  Array.from(wireLayer.querySelectorAll("path, line")).forEach(x=>x.remove());
  connections=[]; selected=null; removePreview();
  setTimeout(()=>{ randomizeDevicePositions(); resizeSVG(); },120);
}

/* boss image loader fallback */
(function loadBossImage(){ const bossEl=document.getElementById('bossImg'); const candidates=['boss.png','boss.jpg','boss.png.jpg']; let idx=0; function tryNext(){ if(idx>=candidates.length){ bossEl.innerHTML=`<svg viewBox="0 0 64 64" width="80" height="80"><rect x="4" y="4" width="56" height="56" rx="8" fill="#333"/></svg><div style="margin-left:8px">汚ねえ大工</div>`; return; } const candidate=candidates[idx++]; const img=new Image(); img.onload=()=>{ bossEl.innerHTML=''; img.style.width='100%'; img.style.height='100%'; img.style.objectFit='cover'; img.style.borderRadius='8px'; bossEl.appendChild(img); }; img.onerror=()=>tryNext(); setTimeout(()=>img.src=candidate,50);} tryNext(); })();

/* init */
updateHP(); updateBossHP(); updateRound(); setState('title'); resizeSVG();
