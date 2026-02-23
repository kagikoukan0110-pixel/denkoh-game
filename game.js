/* ---------- state ---------- */
let bossHP = 100;
let playerHP = 100;
let roundNum = 1;
let switchOn = false;
let selected = null;            // selected terminal DOM element
let previewPath = null;         // SVG path for preview line
let connections = []; // [idA,idB,svgPath]
let state = 'title';

/* elements */
const board = document.getElementById("board");
const wireLayer = document.getElementById("wireLayer");
const playerBar = document.getElementById("playerHP");
const bossHPbar = document.getElementById("bossHPbar");
const overlay = document.getElementById("overlay");
const bossScreen = document.getElementById("bossScreen");
const setBtn = document.getElementById("setBtn");
const switchState = document.getElementById("switchState");
const stateLabel = document.getElementById("stateLabel");
const titleScreen = document.getElementById("titleScreen");
const quizScreen = document.getElementById("quizScreen");
const toQuiz = document.getElementById("toQuiz");
const answerBtn = document.getElementById("answerBtn");
const skipQuiz = document.getElementById("skipQuiz");
const freezeSound = document.getElementById("freezeSound");
const explodeSound = document.getElementById("explodeSound");
const finalVideoWrap = document.getElementById("finalVideoWrap");
const finalVideo = document.getElementById("finalVideo");
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

/* ---------- helpers ---------- */
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
function setState(s){
  state = s;
  stateLabel.textContent = s;
  if(s==='title'){ titleScreen.classList.add('show'); quizScreen.classList.remove('show'); quizScreen.setAttribute('aria-hidden','true'); }
  else if(s==='quiz'){ titleScreen.classList.remove('show'); quizScreen.classList.add('show'); quizScreen.setAttribute('aria-hidden','false'); }
  else { titleScreen.classList.remove('show'); quizScreen.classList.remove('show'); quizScreen.setAttribute('aria-hidden','true'); }
}

/* ---------- quiz (unchanged) ---------- */
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

/* ---------- terminals attach + preview line ---------- */
function normalizeId(id, el){
  if(!id && el) id = el.dataset.id;
  if(!id) return id;
  if(id==='jb') return 'jb';
  if(el && el.closest && el.closest('#junction')) return 'jb';
  return id;
}

function removePreview(){
  if(previewPath && previewPath.parentNode) previewPath.remove();
  previewPath = null;
  board.removeEventListener('mousemove', onMouseMovePreview);
}

function getPreviewColorFromId(id){
  if(!id) return '#ffffff';
  const s = id.toLowerCase();
  if(s.includes('-n') || s.endsWith('n')) return '#ffffff';
  return '#0b0b0b';
}

function onMouseMovePreview(e){
  if(!selected || !previewPath) return;
  const boardRect = board.getBoundingClientRect();
  const startRect = selected.getBoundingClientRect();
  const x1 = startRect.left - boardRect.left + startRect.width/2;
  const y1 = startRect.top - boardRect.top + startRect.height/2;
  const x2 = e.clientX - boardRect.left;
  const y2 = e.clientY - boardRect.top;
  const d = pathForPoints(x1,y1,x2,y2, 0);
  previewPath.setAttribute('d', d);
}

/* create preview path and attach mousemove */
function createPreviewFor(selectedEl){
  removePreview();
  if(!selectedEl) return;
  const color = getPreviewColorFromId(selectedEl.dataset.id);
  previewPath = document.createElementNS("http://www.w3.org/2000/svg","path");
  previewPath.setAttribute("stroke", color);
  previewPath.setAttribute("stroke-width", color === '#ffffff' ? "2" : "3");
  previewPath.setAttribute("fill","none");
  previewPath.setAttribute("stroke-linecap","round");
  previewPath.style.pointerEvents = 'none';
  // append last so preview is on top
  wireLayer.appendChild(previewPath);
  board.addEventListener('mousemove', onMouseMovePreview);
  // initialize small segment so user sees it immediately
  const r = selectedEl.getBoundingClientRect(), br = board.getBoundingClientRect();
  const sx = r.left - br.left + r.width/2, sy = r.top - br.top + r.height/2;
  previewPath.setAttribute('d', `M ${sx} ${sy} Q ${sx} ${sy} ${sx+1} ${sy+1}`);
}

/* attach listeners */
function attachTerminalListeners(root){
  root.querySelectorAll(".terminal, .jb-term").forEach(t=>{
    const clone = t.cloneNode(true);
    t.parentNode.replaceChild(clone, t);
    clone.addEventListener("click", (e)=>{
      if(state !== 'play') return;
      if(clone.classList.contains('jb-term')) clone.dataset.id = 'jb';

      // deselect if same
      if(selected === clone){
        clone.classList.remove("selected"); selected = null; removePreview(); return;
      }

      // select start
      if(!selected){
        selected = clone;
        clone.classList.add("selected");
        createPreviewFor(selected);
        return;
      }

      // second click -> connect
      if(selected !== clone){
        connect(selected, clone);
      }

      // clear selection & preview
      if(selected) selected.classList.remove("selected");
      selected = null;
      removePreview();
    });
  });
}
attachTerminalListeners(document);

/* ---------- dynamic lamps ---------- */
function createLamps(count){
  Array.from(document.querySelectorAll("[id^='lamp-']")).forEach(el=>el.remove());
  for(let i=1;i<=count;i++){
    const id = `lamp-${i}`;
    const div = document.createElement('div');
    div.className = 'device lamp';
    div.id = id;
    div.style.left = (20 + i*10) + '%';
    div.style.top = (40 + (i%2)*18) + '%';
    div.innerHTML = `<h3 style="font-size:12px">ランプ</h3>
      <div class="icon" style="position:relative;">
        <div class="light-halo" aria-hidden></div>
        <svg class="bulb-shape" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path d="M32 6c-7.2 0-13 5.8-13 13 0 5 3 9.4 6 11.8 2 1.6 3.1 3.8 3.1 6.2v3.5c0 .6.4 1 1 1h5.8c.6 0 1-.4 1-1V37c0-2.4 1.1-4.6 3.1-6.2 3-2.4 6-6.8 6-11.8 0-7.2-5.8-13-13-13z" fill="#f4f4f2" stroke="#ddd"/>
          <rect x="26" y="44" width="12" height="10" rx="2" fill="#bbb"/>
        </svg>
      </div>
      <div style="text-align:center;">
        <div class="terminal" data-id="${id}-L">L</div>
        <div class="terminal" data-id="${id}-N">N</div>
      </div>`;
    lampsContainer.appendChild(div);
    attachTerminalListeners(div);
  }
  setTimeout(()=>{ randomizeDevicePositions(); resizeSVG(); }, 60);
}
function getLampIds(){ return Array.from(document.querySelectorAll("[id^='lamp-']")).map(el=>el.id); }

/* ---------- wiring: curved path, World1 color rules ---------- */
function pathForPoints(x1,y1,x2,y2, offset=0){
  const mx = (x1 + x2)/2;
  const my = (y1 + y2)/2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx,dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const ox = nx * offset;
  const oy = ny * offset;
  const cx = mx + ox;
  const cy = my + oy;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

/* World1: N系（-N）= white, それ以外 = black */
function pickWireColor(idA, idB){
  const a = (idA||'').toLowerCase(), b = (idB||'').toLowerCase();
  if(a.includes('-n') || b.includes('-n') || a.endsWith('n') || b.endsWith('n')) return '#ffffff';
  return '#0b0b0b';
}

function findParallelCount(idA, idB){
  return connections.filter(c=>{
    const a=c[0], b=c[1];
    return (a===idA && b===idB) || (a===idB && b===idA);
  }).length;
}

function connect(a,b){
  const idA = normalizeId(a.dataset.id,a);
  const idB = normalizeId(b.dataset.id,b);
  if(!idA || !idB) return;
  if(idA === idB) return;

  // toggle remove existing
  for(let i=0;i<connections.length;i++){
    const c = connections[i];
    if((c[0]===idA && c[1]===idB) || (c[0]===idB && c[1]===idA)){
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

  const baseCount = findParallelCount(idA, idB);
  const offsetStep = 12;
  const offsetIndex = baseCount;
  const total = baseCount + 1;
  const centerIndex = (total - 1) / 2;
  const offset = (offsetIndex - centerIndex) * offsetStep;

  const d = pathForPoints(x1,y1,x2,y2, offset);
  const path = document.createElementNS("http://www.w3.org/2000/svg","path");
  path.setAttribute("d", d);
  const color = pickWireColor(idA, idB);
  path.setAttribute("stroke", color);
  if(color === '#ffffff'){
    path.setAttribute("stroke-width", "2");
    path.setAttribute("stroke-opacity", "0.98");
  } else {
    path.setAttribute("stroke-width", getComputedStyle(document.documentElement).getPropertyValue('--wirew') || 4);
    path.setAttribute("stroke-opacity", "1");
  }
  path.setAttribute("fill","none");
  path.setAttribute("stroke-linecap","round");
  path.setAttribute("data-from", idA);
  path.setAttribute("data-to", idB);
  const len = path.getTotalLength ? path.getTotalLength() : Math.hypot(x2-x1,y2-y1);
  path.style.strokeDasharray = len;
  path.style.strokeDashoffset = len;
  wireLayer.appendChild(path);

  connections.push([idA, idB, path]);
}

function connHas(a,b){
  return connections.some(c => (c[0]===a && c[1]===b) || (c[0]===b && c[1]===a));
}

/* ---------- validation ---------- */
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

/* animate wires forward (excludes previewPath) */
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

/* ---------- layout (anchor power/switch/junction) ---------- */
/* (same as prior: randomizeDevicePositions anchors power/switch/junction) */
/* ... reuse existing layout function from previous iteration ... */
function randomizeDevicePositions(){
  const boardRect = board.getBoundingClientRect();
  const headerEl = document.querySelector('.header');
  const controlsEl = document.querySelector('.controls');
  let headerRect = {bottom: 0};
  let controlsRect = {top: boardRect.bottom};
  try{ headerRect = headerEl.getBoundingClientRect(); } catch(e){}
  try{ controlsRect = controlsEl.getBoundingClientRect(); } catch(e){}

  const topMargin = Math.max( (headerRect.bottom - boardRect.top) + 12, 20 );
  const bottomMargin = Math.max( boardRect.height - (controlsRect.top - boardRect.top) + 12, 20 );

  const anchoredIds = new Set(['junction','power','switch']);
  const devices = Array.from(document.querySelectorAll('.device')).filter(d=>!anchoredIds.has(d.id));
  const placed = [];
  const jRect = document.getElementById('junction').getBoundingClientRect();
  const jLocal = {left:jRect.left - boardRect.left, top:jRect.top - boardRect.top, right:jRect.right - boardRect.left, bottom:jRect.bottom - boardRect.top};

  const MARGIN = 18;
  devices.forEach((dev, idx)=>{
    const devRect = dev.getBoundingClientRect();
    const w = devRect.width || (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--device-w')) || 62);
    const h = devRect.height || 62;

    let attempts = 0;
    let placedRect = null;

    const minX = 20 + w/2;
    const maxX = Math.max( minX, boardRect.width - 20 - w/2 );
    const minY = Math.max(20 + h/2, topMargin + h/2);
    const maxY = Math.min(boardRect.height - 20 - h/2, boardRect.height - bottomMargin - h/2);

    while(attempts++ < 1200){
      const leftPx = Math.random() * (maxX - minX) + minX;
      const topPx = Math.random() * (maxY - minY) + minY;
      const rect = {left:leftPx - w/2, top:topPx - h/2, right:leftPx + w/2, bottom:topPx + h/2};

      const overlapJ = !(rect.right < jLocal.left - MARGIN || rect.left > jLocal.right + MARGIN || rect.bottom < jLocal.top - MARGIN || rect.top > jLocal.bottom + MARGIN);
      if(overlapJ) continue;

      let ok=true;
      for(const p of placed){
        const overlap = !(rect.right < p.left - MARGIN || rect.left > p.right + MARGIN || rect.bottom < p.top - MARGIN || rect.top > p.bottom + MARGIN);
        if(overlap){ ok=false; break; }
      }
      if(!ok) continue;

      placed.push(rect);
      placedRect = rect;
      dev.style.left = (leftPx / boardRect.width * 100) + '%';
      dev.style.top = (topPx / boardRect.height * 100) + '%';
      break;
    }

    if(!placedRect){
      const cols = Math.max(1, Math.round(Math.sqrt(devices.length)));
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const leftPx = minX + ( (cols===1 ? 0.5 : col/(cols-1)) * (maxX - minX || 0) );
      const rows = Math.ceil(devices.length/cols);
      const topPx = minY + ( (rows===1 ? 0.5 : row/(rows-1)) * (maxY - minY || 0) );
      dev.style.left = (leftPx / boardRect.width * 100) + '%';
      dev.style.top = (topPx / boardRect.height * 100) + '%';
      placed.push({left:leftPx - w/2, top:topPx - h/2, right:leftPx + w/2, bottom:topPx + h/2});
    }
  });

  setTimeout(resizeSVG, 80);
}

/* ---------- particles & boss sequence (kept) ---------- */
function makeParticles(centerX, centerY, count=28){
  for(let i=0;i<count;i++){
    const p = document.createElement('div');
    p.className = 'particle';
    document.body.appendChild(p);
    const angle = Math.random()*Math.PI*2;
    const speed = 120 + Math.random()*220;
    const dx = Math.cos(angle)*speed;
    const dy = Math.sin(angle)*speed;
    p.style.left = (centerX - 4) + 'px';
    p.style.top = (centerY - 4) + 'px';
    p.style.background = `hsl(${30 + Math.random()*40}, 90%, ${60 + Math.random()*10}%)`;
    p.style.transition = `transform 900ms cubic-bezier(.1,.9,.2,1), opacity 900ms ease`;
    requestAnimationFrame(()=> {
      p.style.transform = `translate(${dx}px, ${dy}px) scale(${0.6 + Math.random()*1.2})`;
      p.style.opacity = 0;
    });
    setTimeout(()=> p.remove(), 1000);
  }
}

async function doBossSequence(){
  stateLabel.textContent = 'boss';
  bossScreen.style.display = 'flex';
  bossScreen.setAttribute('aria-hidden','false');
  await new Promise(r=>setTimeout(r,220));
  try{ freezeSound.currentTime = 0; await freezeSound.play(); } catch(e){}

  const dmg = 50;
  hitText.style.display = 'block';
  hitText.textContent = `HIT - ${dmg}`;
  bossPanel.classList.add('boss-damage');
  document.body.classList.add('body-shake');
  await new Promise(r=>setTimeout(r,900));
  bossPanel.classList.remove('boss-damage');
  document.body.classList.remove('body-shake');
  hitText.style.display = 'none';

  bossHP -= dmg;
  updateBossHP();

  if(bossHP <= 0 || roundNum >= 3){
    explosionEl.style.display = 'block';
    explosionEl.style.transform = 'translate(-50%,-50%) scale(0.01)';
    void explosionEl.offsetWidth;
    explosionEl.style.transition = 'transform 900ms cubic-bezier(.2,.9,.2,1), opacity 1000ms linear';
    explosionEl.style.transform = 'translate(-50%,-50%) scale(1.6)';
    try{ explodeSound.currentTime = 0; await explodeSound.play(); } catch(e){}

    const bpRect = bossPanel.getBoundingClientRect();
    makeParticles(bpRect.left + bpRect.width/2, bpRect.top + bpRect.height/2, 34);
    if(navigator.vibrate) navigator.vibrate([120,60,120,60,200]);

    flashOverlay.style.display = 'block';
    flashOverlay.style.opacity = '1';
    flashOverlay.style.transition = 'opacity 1200ms ease';
    setTimeout(()=>{ flashOverlay.style.opacity = '0'; }, 180);
    setTimeout(()=>{ flashOverlay.style.display='none'; }, 1400);

    await new Promise(r=>setTimeout(r,900));

    explosionEl.style.opacity = '0';
    await new Promise(r=>setTimeout(r,360));
    explosionEl.style.display = 'none';
    explosionEl.style.transition = '';
    explosionEl.style.opacity = '1';

    const lines = [
      'ぶっ壊したぞ……！',
      '先行配線させとけば良かった。',
      '街の電気は守られる。'
    ];
    defeatDialog.style.display = 'block';
    for(let i=0;i<lines.length;i++){
      defeatDialog.textContent = lines[i];
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

    bossScreen.style.display = 'none';

    finalVideoWrap.style.display = 'flex';
    finalVideo.style.display = 'block';
    finalVideo.muted = false;
    try{
      await finalVideo.play();
    } catch(err){
      try{ finalVideo.muted = true; await finalVideo.play(); } catch(e){ console.warn('video autoplay blocked'); }
    }
    setTimeout(()=>{ try{ finalVideo.pause(); }catch(e){} finalVideoWrap.style.display='none'; overlay.style.display='flex'; overlay.textContent='WORLD1 CLEAR'; stateLabel.textContent='clear'; }, 3000);

    return;
  }

  await new Promise(r=>setTimeout(r,480));
  bossScreen.style.display = 'none';
  bossScreen.setAttribute('aria-hidden','true');

  document.querySelectorAll(".terminal.selected").forEach(t=>t.classList.remove("selected"));
  wireLayer.querySelectorAll("path, line").forEach(l=>l.remove());
  connections = []; selected = null;

  roundNum++;
  updateRound();

  createLamps(roundNum);

  stateLabel.textContent = 'play';
}

/* ---------- UI interactions (SET) ---------- */
setBtn.addEventListener("click", async ()=>{
  if(state !== 'play'){ alert('配線パートで実行してください'); return; }
  if(!switchOn){ alert("スイッチがOFFです。SWITCH を押して ON にしてください。"); return; }

  await animateLinesForward(1000);

  if(checkSolution()){
    const lamps = getLampIds();
    lamps.forEach(id=>{
      const lit = connHas("jb", `${id}-L`) && connHas("jb", `${id}-N`);
      const el = document.getElementById(id);
      if(lit){
        el.classList.add('lit');
        el.style.transition = 'transform 250ms ease';
        el.style.transform = 'translateY(-6px)';
        setTimeout(()=>{ el.style.transform = ''; }, 260);
      } else {
        el.classList.remove('lit');
      }
    });

    // wait extra 2000ms (+ small delay) before boss sequence
    await new Promise(r=>setTimeout(r, 2360));
    await doBossSequence();
    return;
  }

  playerHP = Math.max(0, playerHP - 20);
  updateHP();
  document.querySelectorAll('.lamp').forEach(l=>{
    l.classList.add('lit');
    setTimeout(()=>l.classList.remove('lit'), 700);
  });
  if(playerHP <= 0){ alert('PLAYER HP 0 - game over'); }
});

/* reset / restart */
document.getElementById("resetWires").addEventListener("click", ()=>{
  wireLayer.querySelectorAll("path, line").forEach(l=>l.remove());
  connections = []; selected = null; removePreview();
  document.querySelectorAll(".terminal.selected").forEach(t=>t.classList.remove("selected"));
});
document.getElementById("restart").addEventListener("click", ()=>{
  playerHP = 100; bossHP = 100; roundNum = 1; updateHP(); updateBossHP(); updateRound();
  overlay.style.display = 'none';
  wireLayer.querySelectorAll("path, line").forEach(l=>l.remove());
  connections = []; selected = null; switchOn=false; switchState.textContent="Switch: OFF"; stateLabel.textContent="title";
  document.querySelectorAll('.lamp').forEach(l=>l.classList.remove('lit'));
  removePreview();
  setState('title');
});

/* switch toggle */
switchBtn.addEventListener("click", ()=>{
  switchOn = !switchOn;
  switchState.textContent = switchOn ? "Switch: ON" : "Switch: OFF";
  document.getElementById("switch").style.background = switchOn ? "#e7ffec" : "";
});

/* ---------- quiz handlers ---------- */
toQuiz.addEventListener("click", ()=>{ quizIdx = 0; renderQuiz(); setState('quiz'); });
skipQuiz.addEventListener("click", ()=>{ startPlay(); });
answerBtn.addEventListener("click", ()=>{
  const chosen = Array.from(document.querySelectorAll('.quizOpt')).find(x=>x.classList.contains('chosen'));
  if(!chosen){ alert('選択肢を選んでください。'); return; }
  const selectedIndex = Number(chosen.dataset.index);
  const correctIndex = questions[quizIdx].correct;
  if(selectedIndex !== correctIndex){
    playerHP = Math.max(0, playerHP - 10);
    updateHP();
  }
  quizIdx++;
  if(quizIdx < questions.length){ renderQuiz(); }
  else { startPlay(); }
});

/* ---------- start play ---------- */
function startPlay(){
  setState('play');
  stateLabel.textContent = 'play';
  document.getElementById('junction').style.left = '40%';
  document.getElementById('junction').style.top = '42%';
  createLamps(roundNum);
  document.querySelectorAll(".terminal.selected").forEach(t=>t.classList.remove("selected"));
  wireLayer.querySelectorAll("path, line").forEach(l=>l.remove());
  connections = []; selected = null; removePreview();
  setTimeout(()=>{ randomizeDevicePositions(); resizeSVG(); },120);
}

/* boss image loader (fallback) */
(function loadBossImage(){
  const bossEl = document.getElementById('bossImg');
  const candidates = ['boss.png','boss.jpg','boss.png.jpg'];
  let idx = 0;
  function tryNext(){
    if(idx >= candidates.length){
      bossEl.innerHTML = `<svg viewBox="0 0 64 64" width="80" height="80" aria-hidden><rect x="4" y="4" width="56" height="56" rx="8" fill="#333" /></svg><div style="margin-left:8px">汚ねえ大工</div>`;
      bossEl.style.display = 'flex';
      bossEl.style.gap = '8px';
      bossEl.style.justifyContent = 'center';
      bossEl.style.alignItems = 'center';
      setTimeout(resizeSVG,120);
      return;
    }
    const candidate = candidates[idx++];
    const img = new Image();
    img.onload = () => {
      img.style.width = '100%'; img.style.height = '100%'; img.style.objectFit = 'cover'; img.style.borderRadius = '8px';
      bossEl.innerHTML = '';
      bossEl.appendChild(img);
      setTimeout(resizeSVG,120);
    };
    img.onerror = () => { tryNext(); };
    setTimeout(()=>{ img.src = candidate; }, 50);
  }
  tryNext();
})();

/* ---------- init ---------- */
updateHP(); updateBossHP(); updateRound();
setState('title');
resizeSVG();
