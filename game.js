// game.js — 完全差替版 (World1 → ボスの入りまで)
// index.html と style.css を上書き後に同名で保存してください。
// 必ずブラウザのキャッシュをクリアして再読込みを行ってください。

(() => {
  'use strict';

  // short helpers
  const $ = (s, r=document)=> r.querySelector(s);
  const create = (tag, attrs={}, parent=null) => {
    const e = document.createElement(tag);
    Object.entries(attrs).forEach(([k,v])=>{
      if(k==='style') Object.assign(e.style, v);
      else if(k==='class') e.className = v;
      else e.setAttribute(k,v);
    });
    if(parent) parent.appendChild(e);
    return e;
  };

  // state
  let canvas, ctx, DPR = window.devicePixelRatio || 1;
  const terminals = new Map(); // id -> {el,cx,cy}
  let connections = []; // {from,to,color}
  let selected = null; // DOM element
  let pointer = {x:0,y:0,down:false};
  let playerHP = 100, bossHP = 100;
  const board = $('#board');

  // init
  function init(){
    canvas = $('#wireCanvas');
    ctx = canvas.getContext('2d');
    // render devices
    renderDevices();
    // ensure terminals collected & handlers
    collectTerminals();
    attachTerminalHandlers();
    recalcCanvas();
    window.addEventListener('resize', ()=>{ setTimeout(recalcCanvas,80); });
    window.addEventListener('orientationchange', ()=> setTimeout(recalcCanvas,140));
    // pointer capture on document so devices above canvas don't block preview
    ['pointermove','pointerdown','pointerup','pointercancel'].forEach(ev=>{
      document.addEventListener(ev, onPointer, {passive:false});
    });
    // start render loop
    requestAnimationFrame(loop);
    // quiz show on start
    showQuiz();
    updateHP();
  }

  // devices layout (safe coords to avoid overlap on typical iPhone)
  function renderDevices(){
    board.innerHTML = '';
    // power
    createDevice('power',36,8,28,14, buildPower);
    // switch (left)
    createDevice('switch1',6,24,22,22, buildSwitch);
    // JB
    createDevice('jb',28,34,44,18, buildJB);
    // lamp bottom
    createDevice('lamp1',34,56,28,22, buildLamp);
    // controls already in HTML; ensure attach
    $('#setBtn').addEventListener('click', onSet);
    $('#resetBtn').addEventListener('click', ()=>{ connections=[]; selected=null; collectTerminals(); });
  }

  function createDevice(id,left,top,w,h,builder){
    const el = create('div',{class:'device', id:id, style:{left:left+'vw', top:top+'vh', width:w+'vw', height:h+'vh'}}, board);
    builder(el);
  }

  function buildPower(el){
    el.innerHTML = '';
    create('div',{class:'breaker'},el);
    const row = create('div',{style:{display:'flex',gap:'6vw',width:'100%',justifyContent:'center',marginTop:'1vh'}},el);
    const L = create('div',{class:'terminal mid','data-id':'power-L',style:{width:'7.4vw',height:'7.4vw',borderRadius:'999px',background:'#222',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}},row); L.textContent='L';
    const N = create('div',{class:'terminal mid','data-id':'power-N',style:{width:'7.4vw',height:'7.4vw',borderRadius:'999px',background:'#222',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}},row); N.textContent='N';
  }

  function buildSwitch(el){
    el.innerHTML = '';
    el.style.background='#eaffef';
    const row = create('div',{style:{display:'flex',gap:'3vw',width:'100%',justifyContent:'space-around'}},el);
    const IN = create('div',{class:'terminal small','data-id':'sw-IN',style:{width:'8vw',height:'8vw',borderRadius:'999px',background:'#222',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}},row); IN.textContent='IN';
    const OUT = create('div',{class:'terminal small','data-id':'sw-OUT',style:{width:'8vw',height:'8vw',borderRadius:'999px',background:'#222',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}},row); OUT.textContent='OUT';
  }

  function buildJB(el){
    el.innerHTML = '';
    el.style.background = '#ddd';
    // top 4, bottom 2
    const topRow = create('div',{style:{display:'flex',gap:'5vw',width:'80%',justifyContent:'space-between',marginTop:'1vh'}},el);
    for(let i=1;i<=4;i++){
      const t = create('div',{class:'terminal small','data-id':`jb-${i}`}, topRow);
      t.style.width='7.4vw'; t.style.height='7.4vw';
      t.style.borderRadius='999px'; t.style.background='#222';
    }
    const bottom = create('div',{style:{position:'absolute',bottom:'1.6vh',left:'50%',transform:'translateX(-50%)',display:'flex',gap:'6vw'}},el);
    const b1 = create('div',{class:'terminal small','data-id':'jb-b1'}, bottom); b1.style.background='#222';
    const b2 = create('div',{class:'terminal small','data-id':'jb-b2'}, bottom); b2.style.background='#222';
  }

  function buildLamp(el){
    el.innerHTML = '';
    el.style.background='#eee';
    const icon = create('div',{style:{width:'12vw',height:'12vw',borderRadius:'999px',background:'radial-gradient(circle,#fff 40%,#ccc 100%)',marginTop:'1vh'}},el);
    const row = create('div',{style:{display:'flex',gap:'6vw',width:'80%',justifyContent:'space-between',marginTop:'1vh'}},el);
    const L = create('div',{class:'terminal mid','data-id':'lamp-L'},row); L.textContent='L';
    const N = create('div',{class:'terminal mid','data-id':'lamp-N'},row); N.textContent='N';
  }

  // collect terminal elements and compute positions
  function collectTerminals(){
    terminals.clear();
    document.querySelectorAll('.terminal').forEach(el=>{
      const id = el.getAttribute('data-id') || ('term-'+Math.random().toString(36).slice(2,8));
      el.dataset.id = id;
      terminals.set(id, { el, cx:0, cy:0 });
    });
    recalcCanvas();
  }

  // attach terminal click handlers
  function attachTerminalHandlers(){
    document.querySelectorAll('.terminal').forEach(el=>{
      el.onclick = (e)=>{
        e.stopPropagation();
        onTerminalClick(el);
      };
    });
  }

  function onTerminalClick(el){
    if(selected === el){
      el.classList.remove('terminal-selected');
      selected = null;
      return;
    }
    if(!selected){
      selected = el;
      el.classList.add('terminal-selected');
      return;
    }
    // create/toggle connection
    const a = selected.dataset.id, b = el.dataset.id;
    if(!a || !b){ selected.classList.remove('terminal-selected'); selected=null; return; }
    // if exist, remove
    for(let i=0;i<connections.length;i++){
      const c = connections[i];
      if((c.from===a && c.to===b) || (c.from===b && c.to===a)){
        connections.splice(i,1);
        selected.classList.remove('terminal-selected');
        selected=null;
        return;
      }
    }
    // else add
    const color = colorForId(a);
    connections.push({from:a,to:b,color});
    if(selected) selected.classList.remove('terminal-selected');
    selected=null;
  }

  // color rule: L -> black, N -> white; default black
  function colorForId(id){
    if(!id) return '#000';
    if(id.endsWith('-L') || id.includes('COM') || id.startsWith('jb')) return '#000000';
    if(id.endsWith('-N')) return '#ffffff';
    // fallback
    return '#000000';
  }

  // pointer handling to track preview coords even when UI overlay on top
  function onPointer(e){
    if(e.type === 'pointermove'){
      pointer.x = e.clientX; pointer.y = e.clientY;
    } else if(e.type === 'pointerdown'){
      pointer.down = true; pointer.x = e.clientX; pointer.y = e.clientY;
    } else if(e.type === 'pointerup' || e.type === 'pointercancel'){
      pointer.down = false;
    }
  }

  // canvas sizing and terminal coords
  function recalcCanvas(){
    if(!canvas) return;
    const rect = canvas.getBoundingClientRect();
    DPR = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * DPR);
    canvas.height = Math.round(rect.height * DPR);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.setTransform(DPR,0,0,DPR,0,0);

    // compute terminal center coords
    terminals.forEach((v,k)=>{
      const r = v.el.getBoundingClientRect();
      v.cx = r.left - rect.left + r.width/2;
      v.cy = r.top - rect.top + r.height/2;
    });
  }

  // drawing helpers
  function clear(){ ctx.clearRect(0,0,canvas.width/DPR, canvas.height/DPR); }
  function drawCurve(x1,y1,x2,y2, color='#000', width=8){
    ctx.save();
    // if white main stroke, draw small dark outline behind for visibility
    if(color === '#ffffff'){
      ctx.lineWidth = width+4;
      ctx.strokeStyle = '#222';
      ctx.beginPath();
      const mx=(x1+x2)/2, my=(y1+y2)/2 - 22;
      ctx.moveTo(x1,y1);
      ctx.quadraticCurveTo(mx,my,x2,y2);
      ctx.stroke();
      ctx.lineWidth = width;
    }
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const mx=(x1+x2)/2, my=(y1+y2)/2 - 22;
    ctx.moveTo(x1,y1);
    ctx.quadraticCurveTo(mx,my,x2,y2);
    ctx.stroke();
    ctx.restore();
  }

  // render loop
  function loop(){
    recalcCanvas(); // safe to call often (fast)
    clear();
    // draw persistent wires
    connections.forEach(c=>{
      const a = terminals.get(c.from);
      const b = terminals.get(c.to);
      if(!a || !b) return;
      drawCurve(a.cx, a.cy, b.cx, b.cy, c.color, 8);
    });
    // draw preview if selected
    if(selected){
      const sid = selected.dataset.id;
      const s = terminals.get(sid);
      if(s){
        // pointer relative to canvas
        const rect = canvas.getBoundingClientRect();
        const px = pointer.x - rect.left;
        const py = pointer.y - rect.top;
        // preview: thin white line (always white for visibility)
        drawCurve(s.cx, s.cy, px, py, '#ffffff', 4);
      }
    }
    requestAnimationFrame(loop);
  }

  // check world1 solution
  function connHas(a,b){ return connections.some(c=> (c.from===a && c.to===b) || (c.from===b && c.to===a)); }
  function checkSolution(){
    // require power-L->some jb*, power-N->some jb*, jb->sw-IN, sw-OUT->jb, lamp-L & lamp-N connected to jb
    const jbIds = Array.from(terminals.keys()).filter(k => k.startsWith('jb-') || k.startsWith('jb-b'));
    if(jbIds.length===0) return false;
    const anyPL = jbIds.some(j=> connHas('power-L', j));
    const anyPN = jbIds.some(j=> connHas('power-N', j));
    const jbToIn = jbIds.some(j=> connHas(j, 'sw-IN'));
    const outToJb = jbIds.some(j=> connHas('sw-OUT', j));
    const lampL = jbIds.some(j=> connHas(j, 'lamp-L'));
    const lampN = jbIds.some(j=> connHas(j, 'lamp-N'));
    return anyPL && anyPN && jbToIn && outToJb && lampL && lampN;
  }

  // actions
  function onSet(){
    if(!checkSolution()){
      playerHP = Math.max(0, playerHP-20); updateHP();
      if(playerHP<=0){ alert('PLAYER HP 0 - game over'); resetAll(); }
      else alert('配線誤り。PLAYER -20');
      return;
    }
    // success -> pulse animation then boss
    pulseThenBoss();
  }

  function pulseThenBoss(){
    let t=0;
    const iv = setInterval(()=>{
      // quick redraw with thicker wires flicker
      clear();
      connections.forEach(c=>{
        const a = terminals.get(c.from), b = terminals.get(c.to);
        if(!a||!b) return;
        drawCurve(a.cx,a.cy,b.cx,b.cy,c.color, 10 + (t%2?2:0));
      });
      t++; if(t>4){ clearInterval(iv); showBoss(); }
    },120);
  }

  function showBoss(){
    const bo = $('#bossOverlay'); bo.style.display='flex'; bo.setAttribute('aria-hidden','false');
    $('#bossHP').style.width = bossHP+'%';
    $('#attackBtn').onclick = ()=>{ reduceBoss(40); };
  }

  function reduceBoss(d){
    bossHP = Math.max(0, bossHP - d);
    $('#bossHP').style.width = bossHP+'%';
    // damage flash
    const f = create('div',{style:{position:'fixed',inset:0,background:'#fff',opacity:0.95,zIndex:1500}},document.body);
    setTimeout(()=> f.remove(),300);
    if(bossHP<=0){ setTimeout(()=>{ alert('BOSS撃破！World1クリア'); $('#bossOverlay').style.display='none'; },400); }
  }

  function updateHP(){ const el = $('#playerHP'); if(el) el.style.width = playerHP+'%'; }

  function resetAll(){
    connections=[]; selected=null; collectTerminals(); updateHP();
    $('#bossOverlay').style.display='none';
  }

  // --- quiz minimal ---
  function showQuiz(){
    const qmodal = $('#quizModal');
    qmodal.style.display='flex';
    qmodal.innerHTML = '';
    const box = create('div',{style:{background:'#111',padding:'4vw',borderRadius:'8px',width:'86vw',color:'#fff'}},qmodal);
    create('div',{style:{fontSize:'6vw',color:'#ffd200',fontWeight:800,marginBottom:'2vh'}},box).textContent='学科問題';
    create('div',{id:'sampleQ',style:{fontSize:'4vw',marginBottom:'3vh'}},box).textContent='Lは何？';
    const ok = create('button',{style:{padding:'2vh 6vw',borderRadius:'20px',fontSize:'4vw',background:'#ffd000',border:'none'}},box);
    ok.textContent='開始'; ok.onclick = ()=>{ qmodal.style.display='none'; };
  }

  // final utilities: recompute terminals properly after DOM changes
  function ensureUpdate(){
    collectTerminals();
    attachTerminalHandlers();
    recalcCanvas();
  }

  // boot
  document.addEventListener('DOMContentLoaded', ()=>{ init(); setTimeout(ensureUpdate,120); });

})();
