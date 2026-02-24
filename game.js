// game.js — World1 完全版（新規）
// 目的：iPhone縦固定向けに、HTMLは最小で動くように作る。
// 前提：index.html に <div id="app"></div> と <script src="game.js"></script>
// 注意：assets/boss/boss.png を配置しておいてください（ボス画像）。

(() => {
  'use strict';

  /* -----------------------
     設計メモ（端的）
     - state マシン: opening -> quiz -> play -> boss -> clear
     - canvas で配線を描画（消えない）
     - DOMはJSで生成（index は最小）
     - World1 は片切りスイッチのみ
     ----------------------- */

  // ---------- utilities ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const create = (tag, attrs = {}, parent = null) => {
    const el = document.createElement(tag);
    for (const k in attrs) {
      if (k === 'class') el.className = attrs[k];
      else if (k === 'style') Object.assign(el.style, attrs[k]);
      else el.setAttribute(k, attrs[k]);
    }
    if (parent) parent.appendChild(el);
    return el;
  };

  // ---------- state ----------
  const STATE = {
    opening: 'opening',
    quiz: 'quiz',
    play: 'play',
    boss: 'boss',
    clear: 'clear'
  };
  let state = STATE.opening;
  let currentWorld = 1; // 今はWorld1
  let playerHP = 100;
  let bossHP = 100;

  // connection model: {fromId, toId, color}
  const connections = [];

  // selected terminal DOM for creating connection
  let selectedTerminal = null;

  // store terminal elements and their cached center coords
  const terminals = new Map(); // id -> {el, cx, cy}

  // canvas & rendering
  let canvas, ctx;
  let DPR = window.devicePixelRatio || 1;

  // main app container
  const app = document.getElementById('app');

  // ---------- UI creation ----------
  function buildInitialDOM() {
    app.innerHTML = ''; // ensure clean

    // header
    const header = create('div', { id: 'header' }, app);
    create('div', { id: 'title', style: { fontWeight: '800', fontSize: '5vw', color: '#fff' } }, header).textContent = '俺らの電工 β';
    create('div', { id: 'worldLabel', style: { fontSize: '3.6vw', color: '#ccc', marginTop: '1vh' } }, header).textContent = 'World 1';

    // player HP bar wrapper (visual only)
    const hpWrap = create('div', { id: 'hpBar', style: { marginTop: '1vh', width: '92vw', height: '2vh', background: '#222', borderRadius: '20px', overflow: 'hidden' } }, header);
    create('div', { id: 'playerHP', style: { height: '100%', width: '100%', background: '#34d058' } }, hpWrap);

    // canvas full-screen (under DOM UI)
    canvas = create('canvas', { id: 'wireCanvas', style: { position: 'absolute', top: '0', left: '0', width: '100vw', height: '100vh', zIndex: 1 } }, app);
    ctx = canvas.getContext('2d');

    // gameLayer — all devices live here (z-index above canvas)
    const gameLayer = create('div', { id: 'gameLayer', style: { position: 'absolute', top: '0', left: '0', width: '100vw', height: '100vh', zIndex: 2 } }, app);

    // Controls area: we'll render set/reset below
    const controls = create('div', { id: 'controls', style: { position: 'absolute', bottom: '4vh', left: '0', width: '100vw', display: 'flex', justifyContent: 'center', gap: '6vw', zIndex: 4 } }, app);
    const setBtn = create('button', { id: 'setBtn', style: { padding: '2vh 8vw', borderRadius: '28px', fontSize: '4vw', background: '#ffd000', border: 'none', fontWeight: '800' } }, controls);
    setBtn.textContent = 'SET';
    const resetBtn = create('button', { id: 'resetBtn', style: { padding: '2vh 6vw', borderRadius: '28px', fontSize: '4vw', background: '#333', color: '#fff', border: 'none' } }, controls);
    resetBtn.textContent = 'Reset';

    // quiz modal + boss overlay will be created now
    buildQuizModal();
    buildBossOverlay();

    // event bindings
    setBtn.addEventListener('click', onSetPressed);
    resetBtn.addEventListener('click', resetWires);

    // create devices for World1
    renderWorld1Devices(gameLayer);
  }

  // ---------- quiz modal ----------
  let quizModal, quizQuestionEl, quizOptionsEl, quizIndexEl, quizIdx = 0;
  const questions = [
    {q:'電気で L は何を表す？', opts:['中性線','活線(L)','地線','照明'], correct:1},
    {q:'単相100Vの家庭用コンセントでLとNの意味は？', opts:['L=中性,N=活線','L=活線,N=中性','どちらも地線','L=地線,N=活線'], correct:1},
    {q:'接地(アース)の目的は？', opts:['電流を増やす','絶縁を破る','漏電時に安全に逃がす','スイッチの代わり'], correct:2}
  ];
  function buildQuizModal() {
    quizModal = create('div', { id: 'quizModal', style: { position: 'fixed', inset: '0', display: 'none', alignItems: 'center', justifyContent: 'center', zIndex: 999, background: 'rgba(0,0,0,0.75)' } }, app);
    const box = create('div', { style: { background: '#111', color: '#fff', padding: '4vw', borderRadius: '8px', width: '86vw' } }, quizModal);
    create('div', { style: { fontSize: '6vw', color: '#ffd200', fontWeight: '800', marginBottom: '2vh' } }, box).textContent = '学科問題';
    quizQuestionEl = create('div', { id: 'quizQuestion', style: { marginBottom: '3vh', fontSize: '4.2vw' } }, box);
    quizOptionsEl = create('div', { id: 'quizOptions', style: { display: 'flex', flexDirection: 'column', gap: '2vh' } }, box);
    const btnRow = create('div', { style: { display: 'flex', gap: '4vw', marginTop: '3vh', alignItems: 'center' } }, box);
    const answerBtn = create('button', { id: 'answerBtn', style: { padding: '2vh 6vw', borderRadius: '20px', fontSize: '4vw' } }, btnRow);
    answerBtn.textContent = '回答';
    const skipBtn = create('button', { id: 'skipQuiz', style: { padding: '2vh 4vw', borderRadius: '20px', fontSize: '3.6vw', background: '#444', color: '#fff', border: 'none' } }, btnRow);
    skipBtn.textContent = 'スキップ';
    quizIndexEl = create('div', { style: { marginLeft: 'auto', color: '#ccc' } }, btnRow);
    answerBtn.addEventListener('click', onAnswerQuiz);
    skipBtn.addEventListener('click', ()=>{ hideQuiz(); startPlay(); });
  }
  function showQuiz() {
    quizIdx = 0;
    renderQuiz();
    quizModal.style.display = 'flex';
    state = STATE.quiz;
  }
  function hideQuiz() {
    quizModal.style.display = 'none';
  }
  function renderQuiz() {
    const q = questions[quizIdx];
    quizQuestionEl.textContent = q.q;
    quizOptionsEl.innerHTML = '';
    q.opts.forEach((opt,i)=>{
      const b = create('button', { class: 'quizOpt', style: { padding: '1.6vh 2.4vw', fontSize: '4vw', borderRadius: '8px', textAlign: 'left', background: '#222', color: '#fff', border: 'none' } }, quizOptionsEl);
      b.textContent = opt;
      b.dataset.index = i;
      b.addEventListener('click', ()=>{
        Array.from(quizOptionsEl.querySelectorAll('.quizOpt')).forEach(x=>x.style.outline='');
        b.style.outline = '3px solid #ffd800';
      });
    });
    quizIndexEl.textContent = (quizIdx+1) + ' / ' + questions.length;
  }
  function onAnswerQuiz() {
    const chosen = Array.from(quizOptionsEl.querySelectorAll('.quizOpt')).find(x=>x.style.outline);
    if(!chosen){ alert('選択肢を選んでください。'); return; }
    const selectedIndex = Number(chosen.dataset.index);
    const correctIndex = questions[quizIdx].correct;
    if(selectedIndex !== correctIndex){
      playerHP = Math.max(0, playerHP - 10);
      updatePlayerHPBar();
    }
    quizIdx++;
    if(quizIdx < questions.length){ renderQuiz(); }
    else { hideQuiz(); startPlay(); }
  }

  // ---------- boss overlay ----------
  let bossOverlay, bossImgEl, bossHPBarEl, attackBtn;
  function buildBossOverlay() {
    bossOverlay = create('div', { id: 'bossOverlay', style: { position: 'fixed', inset: '0', display: 'none', alignItems: 'center', justifyContent: 'center', zIndex: 1200, background: 'rgba(0,0,0,0.95)' } }, app);
    const box = create('div', { id: 'bossBox', style: { width: '86vw', color: '#fff', textAlign: 'center' } }, bossOverlay);
    bossImgEl = create('img', { id: 'bossImg', src: 'assets/boss/boss.png', style: { width: '100%', borderRadius: '8px' } }, box);
    const hpWrap = create('div', { id: 'bossHPBar', style: { marginTop: '3vh', width: '100%', height: '3vh', background: '#2b1818', borderRadius: '12px', overflow: 'hidden' } }, box);
    bossHPBarEl = create('div', { id: 'bossHP', style: { height: '100%', width: '100%', background: '#e74c3c', transition: 'width 700ms ease' } }, hpWrap);
    attackBtn = create('button', { id: 'attackBtn', style: { marginTop: '3vh', padding: '2vh 8vw', borderRadius: '28px', background: '#ffd000', fontWeight: '800', border: 'none' } }, box);
    attackBtn.textContent = '撃破';
    attackBtn.addEventListener('click', ()=>{ completeBossSequence(); });
  }

  // ---------- render World1 devices (DOM) ----------
  function renderWorld1Devices(container) {
    // container is gameLayer
    container.innerHTML = '';

    // positions are percentage-based so they scale with viewport
    // power — top center
    const power = create('div', { class: 'device power', id: 'power', style: { position: 'absolute', top: '12vh', left: '37vw', width: '26vw', height: '14vh', background: '#ddd', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-around', zIndex: 3 } }, container);
    create('div', { class: 'breaker', style: { width: '12vw', height: '3.2vh', background: '#444', borderRadius: '6px' } }, power);
    const pTermRow = create('div', { style: { display: 'flex', gap: '6vw', width: '100%', justifyContent: 'center', marginBottom: '1vh' } }, power);
    const pL = create('div', { class: 'terminal', 'data-id': 'power-L', style: { width: '7vw', height: '7vw', borderRadius: '50%', background:'#222', color:'#fff', display:'flex',alignItems:'center',justifyContent:'center' } }, pTermRow);
    pL.textContent = 'L';
    const pN = create('div', { class: 'terminal', 'data-id': 'power-N', style: { width: '7vw', height: '7vw', borderRadius: '50%', background:'#222', color:'#fff', display:'flex',alignItems:'center',justifyContent:'center' } }, pTermRow);
    pN.textContent = 'N';

    // switch — left middle
    const sw = create('div', { class: 'device switch', id: 'switch1', style: { position: 'absolute', top: '26vh', left: '8vw', width: '22vw', height: '18vh', background: '#eaffef', borderRadius: '12px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'space-between', padding:'1vh', zIndex:3 } }, container);
    create('div', { style: { height: '6vh' } }, sw); // spacer
    const swRow = create('div', { style: { display:'flex', gap: '3vw', width:'100%', justifyContent:'space-around' } }, sw);
    const sIn = create('div', { class: 'terminal', 'data-id': 'sw-IN', style: { width: '8vw', height:'8vw', borderRadius:'50%', background:'#222', color:'#fff', display:'flex',alignItems:'center',justifyContent:'center' } }, swRow);
    sIn.textContent = 'IN';
    const sOut = create('div', { class: 'terminal', 'data-id': 'sw-OUT', style: { width: '8vw', height:'8vw', borderRadius:'50%', background:'#222', color:'#fff', display:'flex',alignItems:'center',justifyContent:'center' } }, swRow);
    sOut.textContent = 'OUT';

    // JB — center
    const jb = create('div', { class: 'device jb', id: 'jb', style: { position: 'absolute', top: '38vh', left: '28vw', width: '44vw', height: '16vh', background:'#ddd', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', zIndex:3 } }, container);
    const jbRow = create('div', { class: 'jb-row', style: { display:'flex', gap: '6vw', width:'80%', justifyContent:'space-between' } }, jb);
    // 4 terminals on top
    for (let i=1;i<=4;i++){
      const t = create('div', { class: 'terminal', 'data-id': `jb-${i}`, style: { width:'7.6vw', height:'7.6vw', borderRadius:'50%', background:'#222' } }, jbRow);
      t.textContent = '';
    }
    // two terminals bottom
    const jbBottom = create('div', { style: { position:'absolute', bottom:'1.2vh', left:'50%', transform:'translateX(-50%)', display:'flex', gap:'6vw' } }, jb);
    const jbB1 = create('div', { class: 'terminal', 'data-id': 'jb-b1', style: { width:'8.4vw', height:'8.4vw', borderRadius:'50%', background:'#222' } }, jbBottom);
    const jbB2 = create('div', { class: 'terminal', 'data-id': 'jb-b2', style: { width:'8.4vw', height:'8.4vw', borderRadius:'50%', background:'#222' } }, jbBottom);

    // lamp — bottom center (icon + two terminals left/right above)
    const lamp = create('div', { class: 'device lamp', id: 'lamp1', style: { position: 'absolute', bottom: '18vh', left: '34vw', width: '32vw', height: '20vh', background: '#eee', borderRadius: '12px', display:'flex', flexDirection:'column', alignItems:'center', paddingTop:'1vh', zIndex:3 } }, container);
    const lampIcon = create('div', { class: 'lamp-icon', style: { width: '12vw', height:'12vw', borderRadius:'999px', background:'radial-gradient(circle,#fff 40%,#ccc 100%)' } }, lamp);
    const lampTermRow = create('div', { style: { display:'flex', gap:'6vw', width:'80%', justifyContent:'space-between', marginTop:'1vh' } }, lamp);
    const lampL = create('div', { class: 'terminal', 'data-id': 'lamp-L', style: { width:'7.4vw', height:'7.4vw', borderRadius:'50%', background:'#222' } }, lampTermRow);
    lampL.textContent = 'L';
    const lampN = create('div', { class: 'terminal', 'data-id': 'lamp-N', style: { width:'7.4vw', height:'7.4vw', borderRadius:'50%', background:'#222' } }, lampTermRow);
    lampN.textContent = 'N';

    // register terminals
    updateTerminalsCache();

    // attach terminal click handlers
    attachTerminalHandlers();
  }

  // populate terminals map with bounding centers
  function updateTerminalsCache() {
    terminals.clear();
    const els = document.querySelectorAll('.terminal');
    els.forEach(el=>{
      const id = el.getAttribute('data-id') || ('term-' + Math.random().toString(36).slice(2,8));
      terminals.set(id, { el, cx:0, cy:0 });
    });
    recalcTerminalPositions();
  }

  // compute center coordinates of each terminal relative to canvas coordinate space
  function recalcTerminalPositions() {
    const rect = canvas.getBoundingClientRect();
    DPR = window.devicePixelRatio || 1;
    canvas.width  = Math.round(rect.width * DPR);
    canvas.height = Math.round(rect.height * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    terminals.forEach((v,k)=>{
      const r = v.el.getBoundingClientRect();
      v.cx = r.left - rect.left + r.width/2;
      v.cy = r.top - rect.top + r.height/2;
    });
    renderAll(); // redraw wires when positions change
  }

  // attach click handler to terminals
  function attachTerminalHandlers() {
    document.querySelectorAll('.terminal').forEach(el=>{
      el.style.touchAction = 'manipulation';
      el.addEventListener('click', (e)=>{
        onTerminalClick(e.currentTarget);
      });
    });
  }

  // handle terminal click
  function onTerminalClick(el) {
    const id = el.getAttribute('data-id');
    if(!id) return;
    // toggle selection
    if(selectedTerminal === el){
      el.style.boxShadow = '';
      selectedTerminal = null;
      renderAll();
      return;
    }
    if(!selectedTerminal){
      selectedTerminal = el;
      el.style.boxShadow = '0 0 0 4px #ffd800';
      renderAll();
      return;
    }
    // second terminal clicked — create or remove connection
    const fromId = selectedTerminal.getAttribute('data-id');
    const toId = id;
    // ignore same terminal
    if(fromId === toId){ selectedTerminal.style.boxShadow=''; selectedTerminal=null; renderAll(); return; }
    // check if existing connection -> remove
    for (let i=0;i<connections.length;i++){
      const c = connections[i];
      if((c.from === fromId && c.to === toId) || (c.from === toId && c.to === fromId)){
        connections.splice(i,1);
        selectedTerminal.style.boxShadow='';
        selectedTerminal=null;
        renderAll();
        return;
      }
    }
    // determine color: L -> black, N -> white, others default black
    const color = getWireColorForTerminal(fromId);
    connections.push({ from: fromId, to: toId, color });
    if(selectedTerminal) selectedTerminal.style.boxShadow='';
    selectedTerminal = null;
    renderAll();
  }

  // determine line color by terminal id suffix
  function getWireColorForTerminal(termId) {
    // rule: '-L' => black, '-N' => white, default black
    if(/-L$/.test(termId)) return '#000000';
    if(/-N$/.test(termId)) return '#ffffff';
    // for JB or others, try to infer if connected to power-L vs N later - default black
    return '#000000';
  }

  // ---------- drawing ----------
  function clearCanvas() {
    ctx.clearRect(0,0,canvas.width/DPR, canvas.height/DPR);
  }

  function drawWire(x1,y1,x2,y2, color='#000', width=4, dashed=false) {
    ctx.save();
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    if(dashed) ctx.setLineDash([8,8]); else ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x1,y1);
    // simple curved path for nicer visuals: quadratic midpoint
    const mx = (x1 + x2)/2;
    const my = (y1 + y2)/2 - 12; // slight arch
    ctx.quadraticCurveTo(mx, my, x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  function renderAll() {
    clearCanvas();
    // draw persistent connections first
    connections.forEach(c=>{
      const a = terminals.get(c.from);
      const b = terminals.get(c.to);
      if(!a || !b) return;
      drawWire(a.cx, a.cy, b.cx, b.cy, c.color, 6, false);
    });
    // if a terminal selected, draw a highlight line from that terminal to pointer? we draw a thin white outline around its node by using DOM style
  }

  // ---------- helpers: connection check ----------
  function connHas(a,b){
    return connections.some(c=>(c.from===a && c.to===b) || (c.from===b && c.to===a));
  }

  // ---------- validation for World1 ----------
  function checkSolutionWorld1(){
    // require: power-L connected to some JB terminal
    const jbIds = Array.from(terminals.keys()).filter(id=>/^jb-/.test(id));
    const anyJB = jbIds.some(jb=>connHas('power-L', jb));
    if(!anyJB) return false;
    // require: power-N connected to some JB terminal
    const anyJBN = jbIds.some(jb=>connHas('power-N', jb));
    if(!anyJBN) return false;
    // require: some JB terminal connected to sw-IN
    const jbToSwIn = jbIds.some(jb=>connHas(jb, 'sw-IN'));
    if(!jbToSwIn) return false;
    // require: sw-OUT connected back to JB
    const swOutToJb = jbIds.some(jb=>connHas('sw-OUT', jb));
    if(!swOutToJb) return false;
    // require: lamp-L connected to JB and lamp-N connected to JB (any jb)
    const lampLok = jbIds.some(jb=>connHas(jb, 'lamp-L'));
    const lampNok = jbIds.some(jb=>connHas(jb, 'lamp-N'));
    if(!(lampLok && lampNok)) return false;
    // simple positive check passed
    return true;
  }

  // ---------- UI actions ----------
  function onSetPressed() {
    if(state !== STATE.play && state !== STATE.quiz){
      // if still opening, show quiz
      if(state === STATE.opening){ showQuiz(); return; }
    }
    // require switch ON? We don't simulate a switch toggle; assume player must connect correctly
    const ok = checkSolutionWorld1();
    if(!ok){
      playerHP = Math.max(0, playerHP - 20);
      updatePlayerHPBar();
      if(playerHP <= 0){ alert('PLAYER HP 0 - game over'); resetGame(); }
      else { alert('配線が正しくありません。PLAYER -20'); }
      return;
    }
    // animate wires forward (visual pulse) then boss
    animateWirePulse().then(()=>{ triggerBossSequence(); });
  }

  function resetWires() {
    connections.length = 0;
    renderAll();
  }

  function resetGame(){
    connections.length = 0;
    playerHP = 100;
    bossHP = 100;
    updatePlayerHPBar();
    updateBossHPBar();
    state = STATE.opening;
    hideBoss();
    showQuiz();
  }

  function updatePlayerHPBar(){
    const el = $('#playerHP');
    if(el) el.style.width = playerHP + '%';
  }
  function updateBossHPBar(){
    if(bossHPBarEl) bossHPBarEl.style.width = Math.max(0,bossHP) + '%';
  }

  // small wire pulse animation (visual) implemented by drawing thicker lines for a moment
  function animateWirePulse(){
    return new Promise(resolve=>{
      const original = connections.slice();
      let step=0;
      const t = setInterval(()=>{
        clearCanvas();
        // draw pulse stage
        const width = (step%2===0)?10:6;
        connections.forEach(c=>{
          const a = terminals.get(c.from), b = terminals.get(c.to);
          if(!a||!b) return;
          drawWire(a.cx,a.cy,b.cx,b.cy,c.color,width,false);
        });
        step++;
        if(step>3){ clearInterval(t); renderAll(); resolve(); }
      }, 180);
    });
  }

  // ---------- boss sequence ----------
  function triggerBossSequence(){
    state = STATE.boss;
    // show boss overlay
    showBoss();
    // simulate damage animation
    setTimeout(()=>{
      // play freeze/explode sound if exists (ignored if not)
      bossHP -= 40;
      updateBossHPBar();
      // if dead
      if(bossHP <= 0){
        setTimeout(()=>{ completeBossSequence(); }, 1000);
      }
    }, 800); // short delay for effect
  }

  function showBoss(){
    if(bossOverlay) bossOverlay.style.display = 'flex';
  }
  function hideBoss(){
    if(bossOverlay) bossOverlay.style.display = 'none';
  }
  async function completeBossSequence(){
    // flashy animation
    const overlayFlash = create('div', { style: { position:'fixed', inset:'0', background:'#fff', opacity:'0', zIndex:1300 } }, app);
    overlayFlash.style.transition = 'opacity 220ms ease';
    overlayFlash.style.opacity = '1';
    await new Promise(r=>setTimeout(r,160));
    overlayFlash.style.opacity = '0';
    await new Promise(r=>setTimeout(r,200));
    overlayFlash.remove();
    // show defeat dialog text and move to clear
    hideBoss();
    state = STATE.clear;
    // show a simple clear overlay then reload into World2 step (for now just alert)
    alert('BOSS撃破！WORLD1 CLEAR');
    // for now, stop. Later we will transition to World2.
  }

  // ---------- flow control ----------
  function startPlay(){
    state = STATE.play;
    // ensure terminals positions are up-to-date
    setTimeout(()=>{ recalcTerminalPositions(); }, 120);
  }

  // ---------- lifecycle ----------
  function init(){
    buildInitialDOM();
    // show quiz immediately
    showQuiz();
    // setup resize handler
    window.addEventListener('resize', recalcTerminalPositions);
    window.addEventListener('orientationchange', ()=>{ setTimeout(recalcTerminalPositions,120); });
    // initial recalc after layout
    setTimeout(recalcTerminalPositions,160);
    // render loop for canvas (minimal rAF to keep crisp)
    (function loop(){ renderAll(); requestAnimationFrame(loop); })();
  }

  // ---------- ensure DOM ready ----------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else init();

})();
