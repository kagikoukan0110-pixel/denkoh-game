/* game.js — 修正版（黒線可視化 / プレビュー安定化 / 4択クイズ復活 / JB端子改善）
   注意: index.html は既に差し替え済みとのことなので、このファイルだけ上書きしてください。
   保存後、iPhone Safari で「履歴とWebサイトデータを消去」→ページリロードを必ず行ってください。
*/
(() => {
  'use strict';

  /* ---- utilities ---- */
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const create = (tag, attrs={}, parent=null) => {
    const e = document.createElement(tag);
    Object.entries(attrs).forEach(([k,v])=>{
      if(k==='class') e.className = v;
      else if(k==='style') Object.assign(e.style, v);
      else e.setAttribute(k,v);
    });
    if(parent) parent.appendChild(e);
    return e;
  };

  /* ---- state ---- */
  let canvas, ctx, DPR = window.devicePixelRatio || 1;
  const terminals = new Map(); // id -> {el, cx, cy}
  let connections = []; // {from,to,color}
  let selectedTerm = null;
  let pointer = {x:0,y:0,down:false};
  let playerHP = 100, bossHP = 100;
  const board = $('#board');

  /* ---- init ---- */
  function init(){
    canvas = $('#wireCanvas');
    ctx = canvas.getContext('2d');

    // render devices (index.html may contain none; ensure board has devices)
    if(!board) {
      console.error('board element not found');
      return;
    }

    renderDevicesIfMissing();
    collectTerminals();
    attachTerminalHandlers();

    // pointer capture globally so UI overlay doesn't block preview
    ['pointermove','pointerdown','pointerup','pointercancel'].forEach(ev=>{
      document.addEventListener(ev, onPointer, {passive:false});
    });

    // resize/calc
    window.addEventListener('resize', debounce(recalcAll, 80));
    window.addEventListener('orientationchange', debounce(recalcAll, 120));
    // hook controls
    $('#setBtn') && $('#setBtn').addEventListener('click', onSet);
    $('#resetBtn') && $('#resetBtn').addEventListener('click', ()=>{ connections=[]; selectedTerm=null; collectTerminals(); });

    // render loop
    requestAnimationFrame(renderLoop);

    // show quiz first
    showQuiz();
  }

  /* ---- debounce helper ---- */
  function debounce(fn, ms){
    let t;
    return function(...a){ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); };
  }

  /* ---- ensure devices exist (if index already had them this is safe) ---- */
  function renderDevicesIfMissing(){
    // If the index replaced the markup, do nothing. Otherwise create minimal devices.
    if($$('.device').length > 0) {
      // still adjust classes/sizes for mobile
      applyDeviceSizing();
      return;
    }
    // create a set similar to earlier structure (safe fallback)
    createDevice('power', 36, 8, 28, 14, buildPower);
    createDevice('switch1', 6, 24, 22, 22, buildSwitch);
    createDevice('jb', 28, 34, 44, 18, buildJB);
    createDevice('lamp1', 34, 56, 28, 22, buildLamp);
  }

  function createDevice(id,left,top,w,h,builder){
    const el = create('div',{class:'device', id, style:{left:left+'vw', top:top+'vh', width:w+'vw', height:h+'vh'}}, board);
    builder(el);
  }

  function applyDeviceSizing(){
    // minor fixes to ensure terminals are inside device bounds across iPhones
    $$('.device').forEach(dev=>{
      dev.style.minWidth = dev.style.width || '20vw';
      dev.style.minHeight = dev.style.height || '12vh';
    });
  }

  /* ---- individual device building helpers ---- */
  function buildPower(el){
    el.innerHTML = '';
    create('div',{class:'breaker'},el);
    const row = create('div',{style:{display:'flex',gap:'4vw',width:'100%',justifyContent:'center',marginTop:'1vh'}},el);
    const L = create('div',{class:'terminal mid','data-id':'power-L',style:{width:'8vw',height:'8vw',display:'flex',alignItems:'center',justifyContent:'center'}},row); L.textContent='L';
    const N = create('div',{class:'terminal mid','data-id':'power-N',style:{width:'8vw',height:'8vw',display:'flex',alignItems:'center',justifyContent:'center'}},row); N.textContent='N';
  }
  function buildSwitch(el){
    el.innerHTML = '';
    el.style.background = '#eaffef';
    const row = create('div',{style:{display:'flex',gap:'3vw',width:'100%',justifyContent:'space-around'}},el);
    const IN = create('div',{class:'terminal small','data-id':'sw-IN',style:{width:'9vw',height:'9vw'}},row); IN.textContent='IN';
    const OUT = create('div',{class:'terminal small','data-id':'sw-OUT',style:{width:'9vw',height:'9vw'}},row); OUT.textContent='OUT';
  }
  function buildJB(el){
    el.innerHTML='';
    el.style.background='#ddd';
    // top 4 small vertical ovals (representive) and bottom 2 round
    const top = create('div',{style:{display:'flex',justifyContent:'space-between',width:'86%',marginTop:'1vh'}},el);
    for(let i=1;i<=4;i++){
      const t = create('div',{class:'terminal small','data-id':`jb-${i}`,style:{width:'6.6vw',height:'9vw',borderRadius:'999px',background:'#222'}},top);
    }
    const bottom = create('div',{style:{position:'absolute',bottom:'1.8vh',left:'50%',transform:'translateX(-50%)',display:'flex',gap:'5.6vw'}},el);
    create('div',{class:'terminal mid','data-id':'jb-b1',style:{width:'9vw',height:'9vw'}},bottom);
    create('div',{class:'terminal mid','data-id':'jb-b2',style:{width:'9vw',height:'9vw'}},bottom);
  }
  function buildLamp(el){
    el.innerHTML = '';
    el.style.background = '#eee';
    const icon = create('div',{style:{width:'16vw',height:'12vh',borderRadius:'999px',background:'radial-gradient(circle,#fff 50%, #ddd 100%)',marginTop:'2vh'}},el);
    const row = create('div',{style:{display:'flex',gap:'6vw',width:'70%',justifyContent:'space-between',marginTop:'1vh'}},el);
    const L = create('div',{class:'terminal mid','data-id':'lamp-L',style:{width:'9vw',height:'9vw'}},row); L.textContent='L';
    const N = create('div',{class:'terminal mid','data-id':'lamp-N',style:{width:'9vw',height:'9vw'}},row); N.textContent='N';
  }

  /* ---- collect terminals positions ---- */
  function collectTerminals(){
    terminals.clear();
    $$('.terminal').forEach(el=>{
      const id = el.dataset.id || ('t-'+Math.random().toString(36).slice(2,8));
      el.dataset.id = id;
      terminals.set(id, { el, cx:0, cy:0 });
    });
    recalcCanvas(); // compute positions
  }

  /* ---- attach handlers ---- */
  function attachTerminalHandlers(){
    $$('.terminal').forEach(el=>{
      el.onclick = (ev)=>{
        ev.stopPropagation();
        onTerminalClick(el);
      };
    });
  }

  function onTerminalClick(el){
    // toggle selection / connect
    if(selectedTerm === el){
      el.classList.remove('terminal-selected');
      selectedTerm = null;
      return;
    }
    if(!selectedTerm){
      selectedTerm = el;
      el.classList.add('terminal-selected');
      return;
    }
    // create or toggle connection
    const a = selectedTerm.dataset.id, b = el.dataset.id;
    if(!a || !b){ selectedTerm.classList.remove('terminal-selected'); selectedTerm=null; return; }
    // if exists, remove
    const idx = connections.findIndex(c=> (c.from===a && c.to===b) || (c.from===b && c.to===a));
    if(idx>=0){ connections.splice(idx,1); selectedTerm.classList.remove('terminal-selected'); selectedTerm=null; return; }
    // add with color rule
    const color = colorFor(a,b);
    connections.push({from:a,to:b,color});
    selectedTerm.classList.remove('terminal-selected');
    selectedTerm = null;
  }

  // color rule: if any endpoint is '-N' -> white line, else black
  function colorFor(a,b){
    if(a && a.endsWith('-N')) return '#ffffff';
    if(b && b.endsWith('-N')) return '#ffffff';
    // if either contains 'jb' but other is 'lamp-N' handled above
    return '#000000';
  }

  /* ---- pointer (global) ---- */
  function onPointer(e){
    // track coords for preview even if UI on top
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    if(e.type === 'pointerdown') pointer.down = true;
    if(e.type === 'pointerup' || e.type === 'pointercancel') pointer.down = false;
  }

  /* ---- canvas resize and terminal coords ---- */
  function recalcCanvas(){
    if(!canvas) return;
    const rect = canvas.getBoundingClientRect();
    DPR = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * DPR);
    canvas.height = Math.round(rect.height * DPR);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.setTransform(DPR,0,0,DPR,0,0);
    // compute center coordinates for terminals
    const boardRect = rect;
    terminals.forEach((v,k)=>{
      const r = v.el.getBoundingClientRect();
      v.cx = r.left - boardRect.left + r.width/2;
      v.cy = r.top - boardRect.top + r.height/2;
    });
  }

  function recalcAll(){ collectTerminals(); }

  /* ---- drawing stable curves (outline + main stroke) ---- */
  function drawCurve(a,b, opts={}){
    const {color='#000000', width=8} = opts;
    // control point for gentle curve
    const mx = (a.x + b.x)/2;
    const my = (a.y + b.y)/2 - Math.min(60, Math.abs(a.x-b.x)/2 + 10);

    ctx.lineCap = 'round';

    // outer stroke for visibility: choose contrasting outline
    let outline;
    if(color === '#ffffff') outline = '#222'; // dark outline for white
    else outline = 'rgba(255,255,255,0.08)'; // slight light halo for black
    ctx.beginPath();
    ctx.lineWidth = width + 4;
    ctx.strokeStyle = outline;
    ctx.moveTo(a.x,a.y);
    ctx.quadraticCurveTo(mx,my,b.x,b.y);
    ctx.stroke();

    // main stroke
    ctx.beginPath();
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.moveTo(a.x,a.y);
    ctx.quadraticCurveTo(mx,my,b.x,b.y);
    ctx.stroke();
  }

  /* ---- main render loop ---- */
  function renderLoop(){
    if(!canvas) return;
    recalcCanvas(); // light-weight safe call to keep coords fresh
    // clear
    ctx.clearRect(0,0,canvas.width/DPR, canvas.height/DPR);

    // draw connections
    connections.forEach(c=>{
      const a = terminals.get(c.from);
      const b = terminals.get(c.to);
      if(!a || !b) return;
      drawCurve({x:a.cx, y:a.cy}, {x:b.cx, y:b.cy}, {color: c.color, width: 8});
    });

    // draw preview if selected
    if(selectedTerm){
      const s = terminals.get(selectedTerm.dataset.id);
      if(s){
        const rect = canvas.getBoundingClientRect();
        const px = pointer.x - rect.left;
        const py = pointer.y - rect.top;
        // preview thin white
        drawCurve({x:s.cx, y:s.cy}, {x:px, y:py}, {color:'#ffffff', width:3});
      }
    }

    requestAnimationFrame(renderLoop);
  }

  /* ---- solution check & set handling ---- */
  function connHas(a,b){
    return connections.some(c=> (c.from===a && c.to===b) || (c.from===b && c.to===a));
  }

  function checkSolution(){
    // same basic conditions as before but resilient to jb-names
    const jbIds = Array.from(terminals.keys()).filter(k=> k.startsWith('jb-') || k.startsWith('jb-b'));
    if(!jbIds.length) return false;
    const anyPL = jbIds.some(j=> connHas('power-L', j));
    const anyPN = jbIds.some(j=> connHas('power-N', j));
    const jbToIn = jbIds.some(j=> connHas(j, 'sw-IN'));
    const outToJb = jbIds.some(j=> connHas('sw-OUT', j));
    const lampL = jbIds.some(j=> connHas(j, 'lamp-L'));
    const lampN = jbIds.some(j=> connHas(j, 'lamp-N'));
    return anyPL && anyPN && jbToIn && outToJb && lampL && lampN;
  }

  function onSet(){
    // if miswired penalize
    if(!checkSolution()){
      playerHP = Math.max(0, playerHP - 20);
      updateHP();
      if(playerHP <= 0){ alert('PLAYER HP 0 — game over'); resetAll(); }
      else alert('配線ミス: PLAYER -20');
      return;
    }
    // success: brief wire animation (flicker) then boss overlay
    pulseThenBoss();
  }

  function pulseThenBoss(){
    let steps=0;
    const interval = setInterval(()=>{
      // draw highlight flicker: increase width temporarily
      ctx.clearRect(0,0,canvas.width/DPR, canvas.height/DPR);
      connections.forEach(c=>{
        const a = terminals.get(c.from), b = terminals.get(c.to);
        if(!a||!b) return;
        drawCurve({x:a.cx,y:a.cy},{x:b.cx,y:b.cy},{color:c.color, width: 10 + (steps%2)*3});
      });
      steps++;
      if(steps>4){ clearInterval(interval); showBoss(); }
    },120);
  }

  function showBoss(){
    const bo = $('#bossOverlay');
    if(bo){
      bo.style.display='flex'; bo.setAttribute('aria-hidden','false');
      $('#bossHP') && ($('#bossHP').style.width = bossHP + '%');
      $('#attackBtn') && ($('#attackBtn').onclick = ()=>{ reduceBoss(40); });
    } else {
      alert('ボス（仮）: クリア');
    }
  }

  function reduceBoss(d){
    bossHP = Math.max(0, bossHP - d);
    $('#bossHP') && ($('#bossHP').style.width = bossHP + '%');
    const flash = create('div',{style:{position:'fixed',inset:0,background:'#fff',opacity:0.9,zIndex:2000}},document.body);
    setTimeout(()=>flash.remove(),300);
    if(bossHP<=0){
      setTimeout(()=>{ alert('BOSS撃破！World1クリア'); $('#bossOverlay').style.display='none'; }, 400);
    }
  }

  function updateHP(){ const el = $('#playerHP'); if(el) el.style.width = playerHP + '%'; }

  function resetAll(){ connections=[]; selectedTerm=null; collectTerminals(); updateHP(); $('#bossOverlay') && ($('#bossOverlay').style.display='none'); }

  /* ---- quiz system (4択, random) ---- */
  const QUESTIONS = [
    {q:'電気で L は何を表す？', opts:['中性線','活線(L)','地線','照明'], correct:1},
    {q:'単相100VでLとNは？', opts:['L=中性,N=活線','L=活線,N=中性','どちらも地線','L=地線,N=活線'], correct:1},
    {q:'接地の目的は？', opts:['電流を増やす','絶縁を破る','漏電時に安全に逃がす','スイッチ代わり'], correct:2},
    {q:'片切スイッチとは？', opts:['2か所で操作する','1つの回路を入切','常時接続','漏電遮断器'], correct:1},
    {q:'ジョイントボックスの役割は？', opts:['電気を貯める','配線を接続・保護','電圧を上げる','照明を点ける'], correct:1}
  ];

  function showQuiz(){
    const modal = $('#quizModal');
    if(!modal) return;
    modal.style.display='flex';
    modal.setAttribute('aria-hidden','false');
    modal.innerHTML = '';
    // pick 4 random questions (shuffle)
    const qs = QUESTIONS.slice().sort(()=>0.5-Math.random()).slice(0,4);
    let idx = 0;
    function renderQ(){
      modal.innerHTML = '';
      const box = create('div',{style:{background:'#111',padding:'5vw',borderRadius:'8px',width:'86vw',color:'#fff'}},modal);
      create('div',{style:{fontSize:'6vw',color:'#ffd200',fontWeight:800,marginBottom:'2vh'}},box).textContent='学科問題';
      create('div',{id:'qtxt',style:{fontSize:'4vw',marginBottom:'3vh'}},box).textContent = qs[idx].q;
      const optsWrap = create('div',{style:{display:'flex',flexDirection:'column',gap:'3vw'}},box);
      qs[idx].opts.forEach((opt,i)=>{
        const b = create('button',{class:'quizOpt',style:{padding:'2.6vh 3vw',borderRadius:'8px',fontSize:'4vw',textAlign:'left',background:'#222',color:'#fff',border:'none'}},optsWrap);
        b.textContent = opt;
        b.dataset.index = i;
        b.onclick = ()=>{
          // highlight selection
          $$('.quizOpt', optsWrap).forEach(x=>x.style.background='#222');
          b.style.background = '#ffd200';
        };
      });
      const ctrl = create('div',{style:{display:'flex',gap:'4vw',marginTop:'3vh',alignItems:'center'}},box);
      const next = create('button',{style:{padding:'1.8vh 4vw',borderRadius:'8px',fontSize:'4vw',background:'#ffd000',border:'none'}},ctrl);
      next.textContent = (idx < qs.length-1) ? '次へ' : '回答';
      next.onclick = ()=>{
        const chosen = Array.from(optsWrap.querySelectorAll('.quizOpt')).find(x=> x.style.background === 'rgb(255, 210, 0)' || x.style.background === '#ffd200' || x.style.background === 'rgb(255, 210, 0)');
        if(!chosen){ alert('選択してください'); return; }
        const sel = Number(chosen.dataset.index);
        if(sel !== qs[idx].correct){
          playerHP = Math.max(0, playerHP - 10);
          updateHP();
        }
        idx++;
        if(idx < qs.length) renderQ();
        else { modal.style.display='none'; modal.setAttribute('aria-hidden','true'); }
      };
    }
    renderQ();
  }

  /* ---- start on DOM ready ---- */
  document.addEventListener('DOMContentLoaded', ()=>{
    setTimeout(()=>{ init(); }, 60);
  });

})();
