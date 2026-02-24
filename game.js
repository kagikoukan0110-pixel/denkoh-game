// game.js — tap→tapで即決定（SET不要）版 (完全置換用)
(() => {
  // --- state ---
  const state = {
    playerHP: 100,
    bossHP: 100,
    switchOn: false,
    selectedTerminal: null,   // DOM element selected on first tap
    connections: [],          // [{aId,bId}]
    lines: []                 // computed lines for drawing [{a,b,p1,p2,color}]
  };

  // --- DOM refs ---
  const board = document.getElementById('board');
  const canvas = document.getElementById('wireCanvas');
  const ctx = canvas.getContext('2d', { alpha: true });
  const setBtn = document.getElementById('setBtn');      // still available for boss/quiz
  const resetBtn = document.getElementById('resetBtn');
  const switchBtn = document.getElementById('switchBtn') || document.getElementById('switch'); // tolerant
  const playerHPEl = document.getElementById('playerHP');
  const bossHPBar = document.getElementById('bossHP');

  // --- sizing helpers ---
  function resizeCanvas(){
    const br = board.getBoundingClientRect();
    canvas.width = Math.round(br.width * devicePixelRatio);
    canvas.height = Math.round(br.height * devicePixelRatio);
    canvas.style.width = br.width + 'px';
    canvas.style.height = br.height + 'px';
    ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
    recomputeLines();
    redrawAll();
  }
  window.addEventListener('resize', () => setTimeout(resizeCanvas, 80));
  window.addEventListener('load', () => setTimeout(resizeCanvas, 120));

  function terminalCenter(el){
    const boardRect = board.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: (r.left - boardRect.left) + r.width/2, y: (r.top - boardRect.top) + r.height/2 };
  }

  function colorForId(id){
    if(!id) return '#ffffff';
    if(id.includes('-L') || id.toLowerCase().includes('l')) return '#d63535'; // live red
    if(id.includes('-N') || id.toLowerCase().includes('n')) return '#ffffff'; // neutral white
    if(id.includes('t1') || id.toLowerCase().includes('t1')) return '#d63535';
    if(id.includes('t2') || id.toLowerCase().includes('t2')) return '#000000';
    return '#ffffff';
  }

  // --- draw helpers ---
  function clearCanvas(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
  }

  function drawPath(p1, p2, color='#fff', width=8){
    ctx.save();
    ctx.lineCap = 'round';
    // shadow for contrast
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = width + 6;
    ctx.beginPath();
    const mx = (p1.x + p2.x)/2;
    ctx.moveTo(p1.x, p1.y);
    ctx.quadraticCurveTo(mx, p1.y, p2.x, p2.y);
    ctx.stroke();
    // main
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.quadraticCurveTo(mx, p1.y, p2.x, p2.y);
    ctx.stroke();
    ctx.restore();
  }

  function redrawAll(){
    clearCanvas();
    // committed lines
    state.lines.forEach(l => drawPath(l.p1, l.p2, l.color, 8));
  }

  // recompute state.lines from state.connections (call after layout/resize)
  function recomputeLines(){
    state.lines = state.connections.map(c => {
      const aEl = document.querySelector(`[data-id="${c.a}"]`);
      const bEl = document.querySelector(`[data-id="${c.b}"]`);
      const p1 = aEl ? terminalCenter(aEl) : {x:0,y:0};
      const p2 = bEl ? terminalCenter(bEl) : {x:0,y:0};
      return { a:c.a, b:c.b, p1, p2, color: colorForId(c.a) || colorForId(c.b) || '#ffffff' };
    });
  }

  // --- selection / commit (tap→tap immediate commit) ---
  function clearSelectedVisual(){
    if(state.selectedTerminal){
      state.selectedTerminal.classList.remove('selected');
    }
    state.selectedTerminal = null;
  }

  function commitConnection(aEl, bEl){
    const aId = aEl.dataset.id;
    const bId = bEl.dataset.id;
    if(!aId || !bId) return;
    if(aId === bId) { clearSelectedVisual(); return; }
    // avoid duplicates (either order)
    if(state.connections.some(c => (c.a===aId && c.b===bId) || (c.a===bId && c.b===aId))){
      // already connected -> just deselect
      clearSelectedVisual();
      return;
    }
    // add connection
    state.connections.push({a:aId, b:bId});
    recomputeLines();
    redrawAll();
    // feedback: small highlight pulse on terminals
    aEl.classList.add('just-connected'); bEl.classList.add('just-connected');
    setTimeout(()=>{ aEl.classList.remove('just-connected'); bEl.classList.remove('just-connected'); }, 300);
    clearSelectedVisual();
  }

  // terminal tap handler
  function onTerminalTap(tEl){
    // first tap: select
    if(!state.selectedTerminal){
      state.selectedTerminal = tEl;
      tEl.classList.add('selected');
      return;
    }
    // second tap: if same element -> deselect; else commit immediately
    if(state.selectedTerminal === tEl){
      clearSelectedVisual();
      return;
    }
    // commit
    commitConnection(state.selectedTerminal, tEl);
  }

  // attach terminal listeners
  function attachTerminals(){
    document.querySelectorAll('.terminal').forEach(t => {
      t.classList.add('terminal-touchable'); // ensure CSS for highlight works
      const handler = (ev) => {
        ev.preventDefault();
        onTerminalTap(t);
      };
      t.addEventListener('click', handler, {passive:false});
      t.addEventListener('touchstart', handler, {passive:false});
    });
  }

  attachTerminals();

  // --- Reset / Switch ---
  resetBtn.addEventListener('click', () => {
    state.connections = [];
    state.lines = [];
    clearSelectedVisual();
    recomputeLines();
    redrawAll();
  });

  if(switchBtn){
    switchBtn.addEventListener('click', () => {
      state.switchOn = !state.switchOn;
      // reflect (if a dedicated element)
      try{
        const swLabel = document.getElementById('switchState');
        if(swLabel) swLabel.textContent = state.switchOn ? 'Switch: ON' : 'Switch: OFF';
      }catch(e){}
    });
  }

  // SET remains for boss/quiz triggers; keep it but not for committing wires
  if(setBtn){
    setBtn.addEventListener('click', async () => {
      // optional: evaluate wiring then boss flow etc.
      // keep current behavior unchanged — if you want SET to do something else, tell me.
      if(!state.switchOn){
        alert('SwitchをONにしてください（またはSETはボス開始用に残しています）。');
        return;
      }
      // simple check/demo: if wiring seems reasonable, animate then boss
      if(state.connections.length === 0){
        alert('配線を作ってください。');
        return;
      }
      // example: animate lines briefly
      await animateLinePulse();
      // call boss sequence if needed (external)
      if(typeof window.startBossSequence === 'function') window.startBossSequence();
    });
  }

  function animateLinePulse(){
    return new Promise(resolve => {
      const start = performance.now();
      const dur = 600;
      function frame(t){
        const p = Math.min(1,(t-start)/dur);
        clearCanvas();
        // draw each line with alpha
        state.lines.forEach(l => {
          const alpha = 0.25 + 0.75 * p;
          const color = l.color === '#ffffff' ? `rgba(255,255,255,${alpha})` : l.color;
          drawPath(l.p1, l.p2, color, 8 + 6*p);
        });
        if(p < 1) requestAnimationFrame(frame);
        else { redrawAll(); resolve(); }
      }
      requestAnimationFrame(frame);
    });
  }

  // --- recompute lines after layout changes ---
  function safeRecompute(){
    recomputeLines();
    redrawAll();
  }
  // call initially
  setTimeout(resizeCanvas, 150);

  // expose for debugging
  window.__gameDebug = { state, recomputeLines, redrawAll, commitConnection };

})();
