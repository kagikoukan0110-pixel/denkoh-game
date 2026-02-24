/* ===== 修正版 game.js ===== */

/* =========================
   STATE
========================= */
let bossHP = 100;
let playerHP = 100;
let roundNum = 1;
let switchOn = false;
let selectedTerminal = null;
let previewPath = null;
let connections = [];
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

/* =========================
   BASIC
========================= */
function updateHP(){ playerBar.style.width = playerHP + '%'; }
function updateBossHP(){ bossHPbar.style.width = bossHP + '%'; }
function updateRound(){ roundLabel.textContent = roundNum; }
function setState(s){
  state = s;
  document.getElementById('stateLabel').textContent = s;

  const title = document.getElementById('titleScreen');
  const quiz = document.getElementById('quizScreen');

  if(s === 'title'){
    title.classList.add('show');
    quiz.classList.remove('show');
  }
  else if(s === 'quiz'){
    title.classList.remove('show');
    quiz.classList.add('show');
  }
  else{
    title.classList.remove('show');
    quiz.classList.remove('show');
  }
}

/* =========================
   START BUTTON FIX
========================= */
document.getElementById('toQuiz').addEventListener('click', ()=>{
  setState('quiz');
  renderQuiz();
});

/* =========================
   QUIZ
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
  const q = questions[quizIdx];
  document.getElementById('quizQuestion').textContent = q.q;
  const box = document.getElementById('quizOptions');
  box.innerHTML = '';

  q.opts.forEach((opt,i)=>{
    const b = document.createElement('button');
    b.className = 'quizOpt small';
    b.textContent = opt;
    b.dataset.index = i;
    b.onclick = ()=>{
      document.querySelectorAll('.quizOpt').forEach(x=>x.classList.remove('chosen'));
      b.classList.add('chosen');
    };
    box.appendChild(b);
  });

  document.getElementById('quizIndex').textContent =
    (quizIdx+1) + ' / ' + questions.length;
}

document.getElementById('answerBtn').addEventListener('click', ()=>{
  const chosen = document.querySelector('.quizOpt.chosen');
  if(!chosen){ alert('選択肢を選んでください'); return; }

  const sel = Number(chosen.dataset.index);
  if(sel !== questions[quizIdx].correct){
    playerHP = Math.max(0, playerHP - 10);
    updateHP();
  }

  quizIdx++;
  if(quizIdx < questions.length){
    renderQuiz();
  }else{
    startPlay();
  }
});

/* =========================
   PLAY START
========================= */
function startPlay(){
  setState('play');
  createLamps(roundNum);
  randomizeDevicePositions();
}

/* =========================
   LAMPS
========================= */
function createLamps(count){
  lampsContainer.innerHTML = '';
  for(let i=1;i<=count;i++){
    const div = document.createElement('div');
    div.className = 'device lamp';
    div.id = 'lamp-'+i;
    div.innerHTML = `
      <div class="light-halo"></div>
      <svg viewBox="0 0 64 64" class="bulb-shape icon">
        <circle cx="32" cy="28" r="14" fill="#f4f4f2"/>
        <rect x="28" y="42" width="8" height="8" fill="#bbb"/>
      </svg>
      <div class="term-row">
        <div class="terminal" data-id="lamp-${i}-L">L</div>
        <div class="terminal" data-id="lamp-${i}-N">N</div>
      </div>
    `;
    lampsContainer.appendChild(div);
  }
  attachTerminalListeners(document);
}

/* =========================
   DEVICE POSITION (NO OVERLAP)
========================= */
function randomizeDevicePositions(){
  const boardRect = board.getBoundingClientRect();
  const devices = document.querySelectorAll('.device');
  const placed = [];

  devices.forEach(dev=>{
    const w = dev.offsetWidth;
    const h = dev.offsetHeight;

    let tries=0;
    while(tries++<1000){
      const x = Math.random()*(boardRect.width - w);
      const y = Math.random()*(boardRect.height - h - 150);

      const rect = {x,y,w,h};
      const overlap = placed.some(p =>
        !(x + w < p.x - 20 || x > p.x + p.w + 20 ||
          y + h < p.y - 20 || y > p.y + p.h + 20)
      );
      if(!overlap){
        dev.style.left = x + 'px';
        dev.style.top = y + 'px';
        placed.push(rect);
        break;
      }
    }
  });
}

/* =========================
   TERMINAL HANDLING
========================= */
function attachTerminalListeners(root){
  root.querySelectorAll('.terminal, .jb-term').forEach(t=>{
    t.onclick = ()=>{
      if(state !== 'play') return;

      if(!selectedTerminal){
        selectedTerminal = t;
        t.classList.add('selected');
        return;
      }

      if(selectedTerminal === t){
        t.classList.remove('selected');
        selectedTerminal = null;
        return;
      }

      // simple line draw
      const line = document.createElementNS('http://www.w3.org/2000/svg','line');
      const br = board.getBoundingClientRect();
      const r1 = selectedTerminal.getBoundingClientRect();
      const r2 = t.getBoundingClientRect();

      line.setAttribute('x1', r1.left - br.left + r1.width/2);
      line.setAttribute('y1', r1.top - br.top + r1.height/2);
      line.setAttribute('x2', r2.left - br.left + r2.width/2);
      line.setAttribute('y2', r2.top - br.top + r2.height/2);

      const color = selectedTerminal.dataset.id.includes('-N') ? '#ffffff' : '#000000';
      line.setAttribute('stroke', color);
      line.setAttribute('stroke-width','4');
      wireLayer.appendChild(line);

      selectedTerminal.classList.remove('selected');
      selectedTerminal = null;
    };
  });
}

/* =========================
   INIT
========================= */
updateHP();
updateBossHP();
updateRound();
setState('title');
resizeSVG();
