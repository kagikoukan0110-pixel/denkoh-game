// game.js — tap→tap プレビュー方式に変更した完全版
(() => {
  const state = {
    playerHP: 100,
    bossHP: 100,
    switchOn: false,
    selectedTerminal: null,      // DOM element of first-tap terminal
    previewConnection: null,     // { aId, bId, aEl, bEl, p1, p2, color, width }
    connections: [],             // committed connections [{a,b}]
    lines: []                    // rendered line snapshots [{a,b,p1,p2,color,width}]
  };

  const canvas = document.getElementById('wireCanvas');
  const ctx = canvas.getContext('2d', { alpha: true });
  const playerHPEl = document.getElementById('playerHP');
  const setBtn = document.getElementById('setBtn');
  const resetBtn = document.getElementById('resetBtn');
  const switchBtn = document.getElementById('switchBtn');
  const switchStateEl = document.getElementById('switchState');
  const bossOverlay = document.getElementById('bossOverlay');
  const bossHPBar = document.getElementById('bossHP');
  const finishBtn = document.getElementById('finishBtn');
  const sndExplode = document.getElementById('sndExplode');
  const sndFreeze = document.getElementById('sndFreeze');
  const board = document.getElementById('board');

  // ---------- canvas resize / helpers ----------
  function resizeCanvas(){
    const br = board.getBoundingClientRect();
    canvas.width = Math.max(800, Math.floor(br.width * devicePixelRatio));
    canvas.height = Math.max(600, Math.floor(br.height * devicePixelRatio));
    canvas.style.left = br.left + 'px';
    canvas.style.top = br.top + 'px';
    canvas.style.width = br.width + 'px';
    canvas.style.height = br.height + 'px';
    ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
    redrawAll();
  }
  window.addEventListener('resize', () => setTimeout(resizeCanvas, 80));
  window.addEventListener('load', () => setTimeout(resizeCanvas, 120));

  function terminalCenter(el){
    const br = board.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: (r.left - br.left) + r.width/2, y: (r.top - br.top) + r.height/2 };
  }

  function colorForId(id){
    if(!id) return '#ffffff';
    if(id.includes('-L')) return '#d82b2b'; // live = red
    if(id.includes('-N')) return '#ffffff'; // neutral = white
    return '#999999';
  }

  // draw curved path with shadow + main for visibility
  function drawPath(p1, p2, color, width=8){
    ctx.save();
    ctx.lineCap = 'round';

    // shadow/backdrop for contrast
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = width + 6;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    const mx = (p1.x + p2.x) / 2;
    ctx.quadraticCurveTo(mx, p1.y, p2.x, p2.y);
    ctx.stroke();

    // main line
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.quadraticCurveTo(mx, p1.y, p2.x, p2.y);
    ctx.stroke();

    ctx.restore();
  }

  function redrawAll(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    // committed lines
    state.lines.forEach(l => drawPath(l.p1, l.p2, l.color, l.width));
    // preview connection (if any)
    if(state.previewConnection){
      const pc = state.previewConnection;
      drawPath(pc.p1, pc.p2, '#ffffff', 10); // white thick preview (always visible)
    }
  }

  // ---------- selection & connection logic (tap→tap) ----------
  function clearSelection(){
    if(state.selectedTerminal) state.selectedTerminal.classList.remove('selected');
    if(state.previewConnection){
      // un-highlight both terminals
      if(state.previewConnection.aEl) state.previewConnection.aEl.classList.remove('selected');
      if(state.previewConnection.bEl) state.previewConnection.bEl.classList.remove('selected');
    }
    state.selectedTerminal = null;
    state.previewConnection = null;
    redrawAll();
  }

  function commitPreview(){
    // commit previewConnection into connections & lines
    const pc = state.previewConnection;
    if(!pc) return;
    // avoid duplicates
    const a = pc.aId, b = pc.bId;
    if(a === b) return;
    if(state.connections.some(c => (c.a===a && c.b===b) || (c.a===b && c.b===a))) {
      // already present -> just clear selection
      clearSelection(); return;
    }
    state.connections.push({a,b});
    state.lines.push({a,b,p1:pc.p1,p2:pc.p2,color:pc.color,width:8});
    clearSelection();
  }

  // terminal click handling
  function onTerminalClick(t){
    // first tap: select
    if(!state.selectedTerminal){
      state.selectedTerminal = t;
      t.classList.add('selected');
      // do not start drag/preview — wait for second tap
      return;
    }
    // if same terminal tapped again, do nothing (we removed double-tap toggle)
    if(state.selectedTerminal === t) return;

    // second tap: create previewConnection (but do NOT commit)
    const aEl = state.selectedTerminal;
    const bEl = t;
    // visually mark both as selected
    aEl.classList.add('selected');
    bEl.classList.add('selected');

    const p1 = terminalCenter(aEl), p2 = terminalCenter(bEl);
    const color = colorForId(aEl.dataset.id) || colorForId(bEl.dataset.id) || '#ffffff';
    state.previewConnection = {
      aId: aEl.dataset.id,
      bId: bEl.dataset.id,
      aEl, bEl, p1, p2,
      color, width: 8
    };
    redrawAll();
    // note: do NOT clear selection here; user confirms with SET, or cancels with Reset.
  }

  // attach listeners
  function attachTermListeners(){
    document.querySelectorAll('.terminal').forEach(t => {
      // click & touchstart (tap)
      t.addEventListener('click', (ev) => {
        ev.preventDefault();
        onTerminalClick(t);
      }, { passive:false });
      t.addEventListener('touchstart', (ev) => {
        ev.preventDefault();
        onTerminalClick(t);
      }, { passive:false });
    });
  }

  attachTermListeners();

  // ---------- SET / Reset / Switch ----------
  setBtn.addEventListener('click', async () => {
    // If preview exists -> commit it
    if(state.previewConnection){
      // commit after small animation
      await animatePreviewCommit();
      commitPreview();
      redrawAll();
      return;
    }
    // else if nothing selected/preview -> perform normal check + boss sequence
    if(!state.switchOn){
      alert('先にSWITCHをONにしてください。');
      return;
    }
    // evaluate wiring correctness
    if(!checkSolution()){
      state.playerHP = Math.max(0, state.playerHP - 20);
      playerHPEl.style.width = state.playerHP + '%';
      alert('配線ミス: -20 HP');
      return;
    }
    // play flow animation then boss
    await animateAllLines(2000);
    doBossSequence(40);
  });

  resetBtn.addEventListener('click', () => {
    // clear everything
    state.connections = [];
    state.lines = [];
    clearSelection();
    redrawAll();
    playerHPEl.style.width = state.playerHP + '%';
  });

  switchBtn.addEventListener('click', () => {
    state.switchOn = !state.switchOn;
    switchStateEl.textContent = state.switchOn ? 'Switch: ON' : 'Switch: OFF';
  });

  // ---------- helper animations & checks ----------
  function animatePreviewCommit(){
    // small visual — pulse the preview line then commit
    return new Promise(resolve => {
      const start = performance.now();
      const dur = 300;
      function step(t){
        const p = Math.min(1, (t-start)/dur);
        // pulse by redrawing (simplified)
        redrawAll();
        if(p < 1) requestAnimationFrame(step);
        else resolve();
      }
      requestAnimationFrame(step);
    });
  }

  function animateAllLines(ms=1200){
    return new Promise(resolve => {
      const start = performance.now();
      function anim(t){
        const p = Math.min(1,(t-start)/ms);
        ctx.clearRect(0,0,canvas.width,canvas.height);
        // subtle base
        state.lines.forEach(l => drawPath(l.p1,l.p2,'rgba(0,0,0,0.2)', l.width+6));
        // animated intensity
        state.lines.forEach(l => {
          const alpha = 0.25 + 0.75 * p;
          const c = l.color === '#ffffff' ? `rgba(255,255,255,${alpha})` : l.color;
          drawPath(l.p1,l.p2, c, Math.max(4, l.width * (0.6 + 0.8 * p)));
        });
        if(p < 1) requestAnimationFrame(anim);
        else { redrawAll(); resolve(); }
      }
      requestAnimationFrame(anim);
    });
  }

  function checkSolution(){
    // basic rules from earlier: power L->JB, power N->JB, lamp connected to JB, switch used
    const c = state.connections;
    const hasPowerLJB = c.some(x=> (x.a==='power-L' && x.b.startsWith('jb')) || (x.b==='power-L' && x.a.startsWith('jb')));
    const hasPowerNJB = c.some(x=> (x.a==='power-N' && x.b.startsWith('jb')) || (x.b==='power-N' && x.a.startsWith('jb')));
    const lampL = c.some(x=> (x.a==='lamp1-L' || x.b==='lamp1-L') && (x.a.startsWith('jb') || x.b.startsWith('jb')));
    const lampN = c.some(x=> (x.a==='lamp1-N' || x.b==='lamp1-N') && (x.a.startsWith('jb') || x.b.startsWith('jb')));
    const switchUsed = c.some(x=> x.a.startsWith('switch') || x.b.startsWith('switch'));
    return hasPowerLJB && hasPowerNJB && lampL && lampN && switchUsed;
  }

  // boss sequence (keeps behavior from prior code)
  async function doBossSequence(damage=40){
    bossOverlay.classList.remove('hidden');
    try{ sndFreeze.currentTime = 0; sndFreeze.play(); }catch(e){}
    await wait(700);
    state.bossHP = Math.max(0, state.bossHP - damage);
    bossHPBar.style.width = state.bossHP + '%';
    if(state.bossHP <= 0){
      // explosion
      try{ sndExplode.currentTime = 0; sndExplode.play(); }catch(e){}
      // simple visual: alert then reset boss
      alert('BOSS撃破！');
      state.bossHP = 100; bossHPBar.style.width = '100%';
    }
    bossOverlay.classList.add('hidden');
  }

  function wait(ms){ return new Promise(r => setTimeout(r, ms)); }

  // ---------- recompute lines on resize ----------
  function recomputeLines(){
    state.lines = state.connections.map(c => {
      const aEl = document.querySelector(`[data-id="${c.a}"]`);
      const bEl = document.querySelector(`[data-id="${c.b}"]`);
      return {
        a:c.a, b:c.b,
        p1: aEl ? terminalCenter(aEl) : {x:0,y:0},
        p2: bEl ? terminalCenter(bEl) : {x:0,y:0},
        color: colorForId(c.a) || colorForId(c.b) || '#ffffff',
        width: 8
      };
    });
    redrawAll();
  }
  window.addEventListener('resize', () => setTimeout(()=>{ resizeCanvas(); recomputeLines(); }, 120));

  // ---------- init ----------
  (function init(){
    // minimize terminals visually if needed
    document.querySelectorAll('.terminal').forEach(t => t.classList.add('small'));
    resizeCanvas();
    // no drag listeners; attachTermListeners already called above
    // ensure UI reflects HP
    playerHPEl.style.width = state.playerHP + '%';
    bossHPBar.style.width = state.bossHP + '%';
  })();

  // expose for debug
  window.__gameState = state;

})();
