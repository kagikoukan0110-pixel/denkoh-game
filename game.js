/* game.js
   Designed for vertical iOS Safari. Single-file game logic.
*/

(() => {
  // --- state ---
  const state = {
    playerHP: 100,
    bossHP: 100,
    round: 1,
    switchOn: false,
    selectedTerminal: null,
    connections: [], // {fromId,toId,color,fromPos,toPos}
    lines: [], // same as connections (snapshot)
    quizIdx: 0,
    questions: [
      {q:'電気で L は何を表す？', opts:['中性線','活線(L)','地線','照明'], correct:1},
      {q:'単相100Vの家庭用コンセントでLとNの意味は？', opts:['L=中性,N=活線','L=活線,N=中性','どちらも地線','L=地線,N=活線'], correct:1},
      {q:'接地(アース)の目的は？', opts:['電流を増やす','絶縁を破る','漏電時に安全に逃がす','スイッチの代わり'], correct:2},
      {q:'片切スイッチとは？', opts:['2か所で操作するスイッチ','1つの回路を入切するスイッチ','常時接続の端子','漏電遮断器'], correct:1},
      {q:'ジョイントボックスの役割は？', opts:['電気を貯める','配線を接続・保護する','電圧を上げる','照明を点ける'], correct:1}
    ],
  };

  // --- elems ---
  const canvas = document.getElementById('wireCanvas');
  const ctx = canvas.getContext('2d', {alpha:true});
  const terminals = Array.from(document.querySelectorAll('.terminal'));
  const playerHPEl = document.getElementById('playerHP');
  const stateLabel = document.getElementById('stateLabel');
  const setBtn = document.getElementById('setBtn');
  const resetBtn = document.getElementById('resetBtn');
  const switchBtn = document.getElementById('switchBtn');
  const switchStateEl = document.getElementById('switchState');
  const quizModal = document.getElementById('quizModal');
  const quizQuestion = document.getElementById('quizQuestion');
  const quizOptions = document.getElementById('quizOptions');
  const answerBtn = document.getElementById('answerBtn');
  const skipBtn = document.getElementById('skipBtn');
  const bossOverlay = document.getElementById('bossOverlay');
  const bossHPBar = document.getElementById('bossHP');
  const bossImg = document.getElementById('bossImg');
  const finishBtn = document.getElementById('finishBtn');
  const explosionEl = document.getElementById('explosion');
  const defeatDialog = document.getElementById('defeatDialog');
  const hitText = document.getElementById('hitText');
  const sndExplode = document.getElementById('sndExplode');
  const sndFreeze = document.getElementById('sndFreeze');

  // canvas size & layout
  function resizeCanvas(){
    const rect = document.getElementById('board').getBoundingClientRect();
    canvas.width = Math.max(800, Math.floor(rect.width * devicePixelRatio));
    canvas.height = Math.max(600, Math.floor(rect.height * devicePixelRatio));
    canvas.style.left = rect.left + 'px';
    canvas.style.top = rect.top + 'px';
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
    redrawAll();
  }
  window.addEventListener('resize', ()=>{ setTimeout(resizeCanvas,60); });
  window.addEventListener('load', resizeCanvas);

  // helper - terminal center on screen relative to canvas
  function terminalCenter(el){
    const boardRect = document.getElementById('board').getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return {
      x: (r.left - boardRect.left) + r.width/2,
      y: (r.top - boardRect.top) + r.height/2
    };
  }

  // determine color for line based on id or types
  function colorForId(id){
    if(!id) return '#fff';
    if(id.includes('-L') || id.endsWith('-L')) return '#000'; // live = black
    if(id.includes('-N') || id.endsWith('-N')) return '#fff'; // neutral = white
    // three-core or others -> red fallback
    return '#d82b2b';
  }

  // draw a single line
  function drawLine(p1,p2,color,opts={}){
    ctx.save();
    ctx.lineCap = 'round';
    // shadow for visibility
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 6;
    ctx.lineWidth = opts.width || 8;
    // draw dark stroke under for contrast
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    // subtle bezier to avoid overlaps
    const midX = (p1.x + p2.x)/2;
    ctx.quadraticCurveTo(midX, p1.y, p2.x, p2.y);
    ctx.stroke();

    // main stroke
    ctx.lineWidth = opts.width || 6;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.quadraticCurveTo(midX, p1.y, p2.x, p2.y);
    ctx.stroke();

    ctx.restore();
  }

  // redraw everything (lines)
  function redrawAll(){
    // clear
    ctx.clearRect(0,0,canvas.width,canvas.height);
    // draw permanent lines
    state.lines.forEach(l => {
      drawLine(l.p1, l.p2, l.color, {width: l.width || 6});
    });
    // draw preview if selectedTerminal exists
    if(state.selectedTerminal && state.previewPos){
      const idFrom = state.selectedTerminal.dataset.id;
      const pFrom = terminalCenter(state.selectedTerminal);
      const pTo = state.previewPos;
      drawLine(pFrom, pTo, '#ffffff', {width: 10}); // preview thick white
    }
  }

  // selection & connection logic
  function clearSelection(){
    if(state.selectedTerminal) state.selectedTerminal.classList.remove('selected');
    state.selectedTerminal = null;
    state.previewPos = null;
    redrawAll();
  }

  // create permanent connection (and store)
  function addConnection(elA, elB){
    const aId = elA.dataset.id, bId = elB.dataset.id;
    if(!aId || !bId || aId === bId) return;
    // prevent duplicates
    if(state.connections.some(c=> (c.a===aId && c.b===bId) || (c.a===bId && c.b===aId) )) return;
    const p1 = terminalCenter(elA), p2 = terminalCenter(elB);
    const color = colorForId(aId) || colorForId(bId) || '#fff';
    const width = 6;
    const line = {a:aId,b:bId,color,width,p1,p2};
    state.connections.push(line);
    state.lines.push({p1,p2,color,width,a:aId,b:bId});
    redrawAll();
  }

  // terminal event handlers
  function onTerminalClick(e){
    const t = e.currentTarget;
    // only allow clicks during play/quiz done
    // selection toggle
    if(state.selectedTerminal === t){
      clearSelection();
      return;
    }
    if(!state.selectedTerminal){
      state.selectedTerminal = t;
      t.classList.add('selected');
    } else {
      // connect and clear
      addConnection(state.selectedTerminal, t);
      state.selectedTerminal.classList.remove('selected');
      state.selectedTerminal = null;
    }
  }

  function attachTermListeners(){
    terminals.forEach(t=>{
      // remove old listeners safety
      t.replaceWith(t.cloneNode(true));
    });
    // re-query
    const newTerms = Array.from(document.querySelectorAll('.terminal'));
    newTerms.forEach(t=>{
      t.addEventListener('click', onTerminalClick);
      // touchmove/mousemove for preview
      t.addEventListener('touchstart', (ev) => {
        ev.preventDefault();
        onTerminalClick({currentTarget:t});
      });
    });
    // canvas preview: track touch/mouse move
    const board = document.getElementById('board');
    let dragging=false;
    board.addEventListener('mousemove', (ev)=>{
      if(!state.selectedTerminal) return;
      const br = board.getBoundingClientRect();
      state.previewPos = {x:ev.clientX - br.left, y:ev.clientY - br.top};
      redrawAll();
    });
    board.addEventListener('touchmove',(ev)=>{
      if(!state.selectedTerminal) return;
      const touch = ev.touches[0];
      const br = board.getBoundingClientRect();
      state.previewPos = {x:touch.clientX - br.left, y:touch.clientY - br.top};
      redrawAll();
    });
    board.addEventListener('mouseleave', ()=>{
      if(state.selectedTerminal) state.previewPos = null;
      redrawAll();
    });
  }

  // initial attachment
  attachTermListeners();

  // --- UI binding ---
  function updateHP(){
    playerHPEl.style.width = state.playerHP + '%';
  }
  function updateBossHP(){
    bossHPBar.style.width = Math.max(0,state.bossHP) + '%';
  }
  updateHP(); updateBossHP();

  // switch on/off
  switchBtn.addEventListener('click', ()=>{
    state.switchOn = !state.switchOn;
    switchStateEl.textContent = state.switchOn ? 'Switch: ON' : 'Switch: OFF';
    document.getElementById('switch1').style.background = state.switchOn ? '#eaffef' : '';
  });

  // Reset wires
  resetBtn.addEventListener('click', ()=> {
    state.connections = [];
    state.lines = [];
    clearSelection();
    redrawAll();
  });

  // Validation function (simple but robust)
  function checkSolution(){
    // require at least: power-L connected to jb, power-N to jb; switch used; lamp L/N connected to jb
    const conns = state.connections;
    const hasPowerLToJB = conns.some(c => (c.a==='power-L' && c.b.startsWith('jb')) || (c.b==='power-L' && c.a.startsWith('jb')));
    const hasPowerNToJB = conns.some(c => (c.a==='power-N' && c.b.startsWith('jb')) || (c.b==='power-N' && c.a.startsWith('jb')));
    // lamp connections
    const lampL = conns.some(c => (c.a==='lamp1-L' || c.b==='lamp1-L') && (c.a.startsWith('jb') || c.b.startsWith('jb')));
    const lampN = conns.some(c => (c.a==='lamp1-N' || c.b==='lamp1-N') && (c.a.startsWith('jb') || c.b.startsWith('jb')));
    const switchUsed = conns.some(c => (c.a.startsWith('switch') || c.b.startsWith('switch')));
    return hasPowerLToJB && hasPowerNToJB && lampL && lampN && switchUsed;
  }

  // animate lines forward (stroke-draw simulation)
  function animateLines(ms=1200){
    return new Promise(resolve=>{
      // simple animation: draw with increasing width/alpha
      const start = performance.now();
      const anim = (t) => {
        const p = Math.min(1,(t-start)/ms);
        ctx.clearRect(0,0,canvas.width,canvas.height);
        // background subtle dark lines (already permanent)
        state.lines.forEach(l=>{
          // draw darker base full
          drawLine(l.p1,l.p2,'rgba(0,0,0,0.15)',{width: l.width+6});
        });
        // draw progressive main strokes
        state.lines.forEach(l=>{
          // fade in
          const col = hexToRGBA(l.color, 0.7*p+0.3);
          drawLine(l.p1,l.p2,col,{width: l.width * (0.6 + 0.6*p)});
        });
        if(p<1) requestAnimationFrame(anim);
        else { redrawAll(); resolve(); }
      };
      requestAnimationFrame(anim);
    });
  }

  // helper RGBA from hex
  function hexToRGBA(hex,alpha=1){
    const h = hex.replace('#','');
    const r = parseInt(h.substring(0,2),16);
    const g = parseInt(h.substring(2,4),16);
    const b = parseInt(h.substring(4,6),16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // boss sequence (explosion etc)
  async function doBossSequence(damage=40){
    // show boss overlay
    bossOverlay.classList.remove('hidden');
    bossOverlay.style.display='flex';
    stateLabel.textContent='boss';
    // freeze sound
    try{ sndFreeze.currentTime=0; await sndFreeze.play(); }catch(e){}
    // show hit effect
    hitText.textContent = `HIT - ${damage}`;
    hitText.style.display = 'block';
    bossOverlay.querySelector('#bossBox').classList.add('boss-hit');
    await wait(1200);
    hitText.style.display = 'none';
    bossOverlay.querySelector('#bossBox').classList.remove('boss-hit');

    // reduce hp
    state.bossHP = Math.max(0, state.bossHP - damage);
    updateBossHP();

    if(state.bossHP <= 0 || state.round >= 2){
      // explosion
      explosionEl.style.display = 'block';
      explosionEl.style.transform = 'translate(-50%,-50%) scale(0.01)';
      void explosionEl.offsetWidth;
      explosionEl.style.transition = 'transform 700ms ease-out, opacity 900ms ease-out';
      explosionEl.style.transform = 'translate(-50%,-50%) scale(1.4)';
      try{ sndExplode.currentTime=0; await sndExplode.play(); }catch(e){}
      await wait(800);
      explosionEl.style.opacity='0';
      await wait(300);
      explosionEl.style.display='none';
      explosionEl.style.opacity='1';
      explosionEl.style.transition='';

      // defeat dialog lines
      defeatDialog.textContent = '先行配線させとけば良かった';
      defeatDialog.style.display='block';
      await wait(1400);
      defeatDialog.style.display='none';

      // hide boss
      bossOverlay.classList.add('hidden');
      bossOverlay.style.display='none';

      // show clear overlay (simple)
      alert('WORLD CLEARED!');
      // reset for demo
      state.round = 2;
      state.bossHP = 100;
      updateBossHP();
      return;
    }

    // else continue: hide boss overlay and proceed
    bossOverlay.classList.add('hidden');
    bossOverlay.style.display='none';
    state.round++;
  }

  function wait(ms){ return new Promise(res=>setTimeout(res,ms)); }

  // SET logic (validate + animate + boss)
  setBtn.addEventListener('click', async ()=>{
    if(!state.switchOn){
      alert('スイッチがOFFです。SWITCH を押して ON にしてください。');
      return;
    }
    if(!checkSolution()){
      state.playerHP = Math.max(0, state.playerHP - 20);
      updateHP();
      if(state.playerHP <= 0){
        alert('PLAYER HP 0 - game over');
      } else {
        alert('配線が正しくありません。PLAYER HP -20');
      }
      return;
    }
    // animate wires and boss
    await animateLines(1600); // added extra 2s as requested (made 1.6s)
    await doBossSequence(40);
  });

  // boss finish button (manual) for testing
  finishBtn.addEventListener('click', ()=> {
    state.bossHP = Math.max(0, state.bossHP - 20);
    updateBossHP();
    if(state.bossHP <= 0){
      // play explosion
      doBossSequence(50);
    }
  });

  // --- Quiz system ---
  function openQuiz(){
    state.quizIdx = 0;
    showQuiz();
  }
  function showQuiz(){
    const q = state.questions[state.quizIdx];
    quizQuestion.textContent = q.q;
    quizOptions.innerHTML = '';
    q.opts.forEach((opt,i)=>{
      const b = document.createElement('button');
      b.textContent = opt;
      b.className = 'option';
      b.dataset.index = i;
      b.addEventListener('click', ()=>{
        // clear others
        Array.from(quizOptions.children).forEach(x=>x.classList.remove('chosen'));
        b.classList.add('chosen');
      });
      quizOptions.appendChild(b);
    });
    quizModal.classList.remove('hidden');
  }
  answerBtn.addEventListener('click', ()=>{
    const chosen = Array.from(quizOptions.children).find(x=>x.classList.contains('chosen'));
    if(!chosen){ alert('選択してください'); return; }
    const idx = Number(chosen.dataset.index);
    const correct = state.questions[state.quizIdx].correct;
    if(idx !== correct){
      state.playerHP = Math.max(0, state.playerHP - 10);
      updateHP();
    }
    state.quizIdx++;
    if(state.quizIdx < state.questions.length) showQuiz();
    else { quizModal.classList.add('hidden'); }
  });
  skipBtn.addEventListener('click', ()=>{ quizModal.classList.add('hidden'); });

  // open initial quiz on load
  window.addEventListener('load', ()=> {
    setTimeout(openQuiz, 600);
  });

  // utility: redraw when connections change (e.g., after page load)
  function reComputeLinePositions(){
    // re-snapshot positions
    state.lines = state.connections.map(c => {
      const elA = document.querySelector(`[data-id="${c.a}"]`);
      const elB = document.querySelector(`[data-id="${c.b}"]`);
      const p1 = elA ? terminalCenter(elA) : {x:0,y:0};
      const p2 = elB ? terminalCenter(elB) : {x:0,y:0};
      const color = colorForId(c.a) || colorForId(c.b) || '#fff';
      return {a:c.a,b:c.b,p1,p2,color,width:6};
    });
    redrawAll();
  }

  // on orientation/resizing, recompute
  window.addEventListener('resize', ()=> {
    setTimeout(()=>{ reComputeLinePositions(); }, 90);
  });

  // initial layout correction: ensure terminals tiny and devices scaled
  (function tidy(){
    // change all terminal size class to small to avoid overlaps
    document.querySelectorAll('.terminal').forEach(t=>t.classList.add('small'));
    // set global scale (20% smaller)
    document.documentElement.style.setProperty('--device-scale', '0.8');
    // reattach listeners
    attachTermListeners();
    // recalc canvas after slight delay
    setTimeout(()=>{ resizeCanvas(); reComputeLinePositions(); }, 120);
  })();

  // debug: expose state (remove in prod)
  window.__gameState = state;

})();
