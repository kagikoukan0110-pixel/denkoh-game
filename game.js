// game.js — World1 修正版（プレビュー線・端子配置修正・描画安定化）
// 上書きで丸ごと貼ってください。iPhone Safari 縦向け想定。
// index.html は <div id="app"></div> の最小構成であること。

(() => {
  'use strict';

  // ---- utilities ----
  const $ = (s, r=document) => r.querySelector(s);
  const create = (tag, attrs={}, parent=null) => {
    const el = document.createElement(tag);
    for (const k in attrs) {
      if (k === 'class') el.className = attrs[k];
      else if (k === 'style') Object.assign(el.style, attrs[k]);
      else el.setAttribute(k, attrs[k]);
    }
    if (parent) parent.appendChild(el);
    return el;
  };

  // ---- state ----
  const STATE = { opening:'opening', quiz:'quiz', play:'play', boss:'boss', clear:'clear' };
  let state = STATE.opening;
  let playerHP = 100;
  let bossHP = 100;
  const connections = []; // {from,to,color}
  let selectedTerminal = null; // DOM element
  const terminals = new Map(); // id -> {el,cx,cy}
  let canvas, ctx, DPR = window.devicePixelRatio || 1;
  let pointer = { x:0, y:0, active:false };

  const app = document.getElementById('app');

  // ---- build DOM ----
  function buildDOM(){
    app.innerHTML = '';
    // header
    const header = create('div', { id:'header', style:{padding:'4vw 4vw 2vw 4vw'} }, app);
    create('div', { id:'title', style:{fontSize:'6.6vw', fontWeight:800, color:'#fff'} }, header).textContent = '俺らの電工 β';
    create('div', { id:'worldLabel', style:{fontSize:'3.4vw', color:'#ccc', marginTop:'1vh'} }, header).textContent = 'World 1';
    const hpWrap = create('div', { style:{marginTop:'2vh', width:'92vw', height:'2.6vh', background:'#222', borderRadius:'999px', overflow:'hidden'} }, header);
    create('div', { id:'playerHP', style:{width: playerHP+'%', height:'100%', background:'#34d058'} }, hpWrap);

    // canvas
    canvas = create('canvas', { id:'wireCanvas', style:{position:'fixed', left:0, top:0, width:'100vw', height:'100vh', zIndex:1} }, app);
    ctx = canvas.getContext('2d');

    // game layer
    const layer = create('div', { id:'gameLayer', style:{position:'fixed', left:0, top:0, width:'100vw', height:'100vh', zIndex:2} }, app);

    // controls
    const controls = create('div', { id:'controls', style:{position:'fixed', left:0, right:0, bottom:'4vh', display:'flex', justifyContent:'center', gap:'6vw', zIndex:4} }, app);
    const setBtn = create('button', { id:'setBtn', style:{padding:'2.2vh 8vw', borderRadius:'28px', background:'#ffd000', border:'none', fontWeight:800, fontSize:'4.4vw'} }, controls);
    setBtn.textContent = 'SET';
    const resetBtn = create('button', { id:'resetBtn', style:{padding:'2.2vh 6vw', borderRadius:'28px', background:'#333', color:'#fff', border:'none', fontSize:'4vw'} }, controls);
    resetBtn.textContent = 'Reset';

    // modal & boss overlay placeholders
    buildQuizModal();
    buildBossOverlay();

    // render devices
    renderWorld1(layer);

    // handlers
    setBtn.addEventListener('click', onSet);
    resetBtn.addEventListener('click', ()=>{
      connections.length = 0; selectedTerminal = null; updateTerminals(); renderAll();
    });

    // pointer handling for preview line
    ['pointermove','pointerdown','pointerup','pointercancel'].forEach(ev=>{
      canvas.addEventListener(ev, onPointerEvent, {passive:false});
    });

    // resize
    window.addEventListener('resize', ()=>{ recalcTerminals(); });
    window.addEventListener('orientationchange', ()=>{ setTimeout(recalcTerminals,120); });

    // init sizes
    setTimeout(()=>{ recalcTerminals(); },120);
    // render loop
    (function loop(){ renderAll(); requestAnimationFrame(loop); })();
  }

  // ---- quiz modal ----
  let quizModal, quizQuestionEl, quizOptionsEl, quizIdx=0;
  const questions = [
    {q:'電気で L は何を表す？', opts:['中性線','活線(L)','地線','照明'], correct:1},
    {q:'単相100Vの家庭用コンセントでLとNの意味は？', opts:['L=中性,N=活線','L=活線,N=中性','どちらも地線','L=地線,N=活線'], correct:1},
    {q:'接地(アース)の目的は？', opts:['電流を増やす','絶縁を破る','漏電時に安全に逃がす','スイッチの代わり'], correct:2}
  ];
  function buildQuizModal(){
    quizModal = create('div', { id:'quizModal', style:{position:'fixed',inset:0,display:'none',alignItems:'center',justifyContent:'center',zIndex:900,background:'rgba(0,0,0,0.75)'} }, app);
    const box = create('div', { style:{background:'#111', color:'#fff', padding:'4vw', borderRadius:'8px', width:'86vw'} }, quizModal);
    create('div',{style:{fontSize:'6vw', color:'#ffd200', fontWeight:800, marginBottom:'2vh'}},box).textContent='学科問題';
    quizQuestionEl = create('div',{style:{fontSize:'4vw', marginBottom:'3vh'}},box);
    quizOptionsEl = create('div',{style:{display:'flex',flexDirection:'column',gap:'2vh'}},box);
    const row = create('div',{style:{display:'flex',gap:'4vw',marginTop:'3vh'}},box);
    const ansBtn = create('button',{style:{padding:'2vh 6vw',borderRadius:'20px',fontSize:'4vw'}},row);
    ansBtn.textContent='回答';
    ansBtn.addEventListener('click', onAnswer);
    const skip = create('button',{style:{padding:'2vh 4vw',borderRadius:'20px',fontSize:'3.6vw',background:'#444',color:'#fff',border:'none'}},row);
    skip.textContent='スキップ';
    skip.addEventListener('click', ()=>{ hideQuiz(); startPlay(); });
  }
  function showQuiz(){ quizIdx=0; renderQuiz(); quizModal.style.display='flex'; state=STATE.quiz; }
  function hideQuiz(){ quizModal.style.display='none'; }
  function renderQuiz(){
    const q = questions[quizIdx]; quizQuestionEl.textContent = q.q; quizOptionsEl.innerHTML='';
    q.opts.forEach((opt,i)=>{
      const b = create('button',{class:'quizOpt', style:{padding:'1.6vh 2.4vw',fontSize:'4vw',borderRadius:'8px',background:'#222',color:'#fff',border:'none',textAlign:'left'}},quizOptionsEl);
      b.textContent = opt; b.dataset.index=i;
      b.addEventListener('click', ()=>{ Array.from(quizOptionsEl.children).forEach(x=>x.style.outline=''); b.style.outline='3px solid #ffd800'; });
    });
  }
  function onAnswer(){
    const chosen = Array.from(quizOptionsEl.querySelectorAll('.quizOpt')).find(x=>x.style.outline);
    if(!chosen){ alert('選択肢を選んでください。'); return; }
    const sel = Number(chosen.dataset.index);
    const correct = questions[quizIdx].correct;
    if(sel !== correct){ playerHP = Math.max(0,playerHP-10); updatePlayerHP(); }
    quizIdx++;
    if(quizIdx < questions.length) renderQuiz(); else { hideQuiz(); startPlay(); }
  }

  // ---- boss overlay ----
  let bossOverlay, bossImg, bossHPBar, attackBtn;
  function buildBossOverlay(){
    bossOverlay = create('div',{id:'bossOverlay', style:{position:'fixed',inset:0,display:'none',alignItems:'center',justifyContent:'center',zIndex:1200,background:'rgba(0,0,0,0.95)'}},app);
    const box = create('div',{style:{width:'86vw',textAlign:'center',color:'#fff'}},bossOverlay);
    bossImg = create('img',{src:'assets/boss/boss_World2.PNG', style:{width:'100%',borderRadius:'8px'}},box);
    const hpWrap = create('div',{style:{marginTop:'3vh',width:'100%',height:'3vh',background:'#2b1818',borderRadius:'12px',overflow:'hidden'}},box);
    bossHPBar = create('div',{style:{height:'100%',width: bossHP+'%',background:'#e74c3c'}},hpWrap);
    attackBtn = create('button',{style:{marginTop:'3vh',padding:'2vh 8vw',borderRadius:'28px',background:'#ffd000',fontWeight:800,border:'none'}},box);
    attackBtn.textContent='撃破';
    attackBtn.addEventListener('click', completeBoss);
  }

  // ---- world1 devices (non-overlapping safe coords) ----
  function renderWorld1(layer){
    layer.innerHTML = '';
    // positions chosen to avoid overlap on typical iPhone heights
    // power (top-center)
    createDevice(layer, 'power', 36, 10, 28, 14, buildPower);
    // switch left
    createDevice(layer, 'switch1', 6, 24, 24, 20, buildSwitch);
    // JB center
    createDevice(layer, 'jb', 28, 38, 44, 18, buildJB);
    // lamp bottom center
    createDevice(layer, 'lamp1', 34, 60, 32, 20, buildLamp);
  }

  // helper to create device container and call builder
  function createDevice(parent, id, leftPerc, topPerc, wPerc, hPerc, builder){
    const dev = create('div',{class:'device', id:id, style:{position:'absolute', left:leftPerc+'vw', top:topPerc+'vh', width:wPerc+'vw', height:hPerc+'vh', zIndex:3}}, parent);
    builder(dev);
  }
  function buildPower(dev){
    dev.style.background='#ddd'; dev.style.borderRadius='12px'; dev.style.display='flex'; dev.style.flexDirection='column'; dev.style.alignItems='center'; dev.style.justifyContent='space-around';
    create('div',{style:{width:'12vw',height:'3.2vh',background:'#444',borderRadius:'6px'}},dev);
    const row = create('div',{style:{display:'flex',gap:'6vw',width:'100%',justifyContent:'center',marginBottom:'1vh'}},dev);
    const pL = create('div',{class:'terminal','data-id':'power-L', style:{width:'7vw',height:'7vw',borderRadius:'50%',background:'#222',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}},row); pL.textContent='L';
    const pN = create('div',{class:'terminal','data-id':'power-N', style:{width:'7vw',height:'7vw',borderRadius:'50%',background:'#222',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}},row); pN.textContent='N';
  }
  function buildSwitch(dev){
    dev.style.background='#eaffef'; dev.style.borderRadius='12px'; dev.style.display='flex'; dev.style.flexDirection='column'; dev.style.alignItems='center'; dev.style.justifyContent='space-between'; dev.style.padding='1vh';
    create('div',{style:{height:'6vh'}},dev);
    const row = create('div',{style:{display:'flex',gap:'3vw',width:'100%',justifyContent:'space-around'}},dev);
    const sIn = create('div',{class:'terminal','data-id':'sw-IN', style:{width:'8vw',height:'8vw',borderRadius:'50%',background:'#222',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}},row); sIn.textContent='IN';
    const sOut = create('div',{class:'terminal','data-id':'sw-OUT', style:{width:'8vw',height:'8vw',borderRadius:'50%',background:'#222',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}},row); sOut.textContent='OUT';
  }
  function buildJB(dev){
    dev.style.background='#ddd'; dev.style.borderRadius='12px'; dev.style.display='flex'; dev.style.alignItems='center'; dev.style.justifyContent='center'; dev.style.position='relative';
    const topRow = create('div',{style:{display:'flex',gap:'6vw',width:'80%',justifyContent:'space-between',marginTop:'1vh'}},dev);
    for(let i=1;i<=4;i++){
      const t = create('div',{class:'terminal','data-id':`jb-${i}`, style:{width:'7.6vw',height:'7.6vw',borderRadius:'50%',background:'#222',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}},topRow);
      t.textContent='';
    }
    const bottom = create('div',{style:{position:'absolute',bottom:'1.6vh',left:'50%',transform:'translateX(-50%)',display:'flex',gap:'6vw'}},dev);
    const b1 = create('div',{class:'terminal','data-id':'jb-b1', style:{width:'8.4vw',height:'8.4vw',borderRadius:'50%',background:'#222'}},bottom);
    const b2 = create('div',{class:'terminal','data-id':'jb-b2', style:{width:'8.4vw',height:'8.4vw',borderRadius:'50%',background:'#222'}},bottom);
  }
  function buildLamp(dev){
    dev.style.background='#eee'; dev.style.borderRadius='12px'; dev.style.display='flex'; dev.style.flexDirection='column'; dev.style.alignItems='center'; dev.style.paddingTop='1vh';
    const icon = create('div',{style:{width:'12vw',height:'12vw',borderRadius:'999px',background:'radial-gradient(circle,#fff 40%,#ccc 100%)'}},dev);
    const row = create('div',{style:{display:'flex',gap:'6vw',width:'80%',justifyContent:'space-between',marginTop:'1vh'}},dev);
    const l = create('div',{class:'terminal','data-id':'lamp-L', style:{width:'7.4vw',height:'7.4vw',borderRadius:'50%',background:'#222',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}},row); l.textContent='L';
    const n = create('div',{class:'terminal','data-id':'lamp-N', style:{width:'7.4vw',height:'7.4vw',borderRadius:'50%',background:'#222',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}},row); n.textContent='N';
  }

  // ---- terminal geometry ----
  function updateTerminals(){
    terminals.clear();
    document.querySelectorAll('.terminal').forEach(el=>{
      const id = el.dataset.id || ('term-' + Math.random().toString(36).slice(2,7));
      terminals.set(id, { el, cx:0, cy:0 });
    });
    recalcTerminals();
  }
  function recalcTerminals(){
    if(!canvas) return;
    const rect = canvas.getBoundingClientRect();
    DPR = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * DPR);
    canvas.height = Math.round(rect.height * DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0);
    terminals.forEach((v,k)=>{
      const r = v.el.getBoundingClientRect();
      v.cx = r.left - rect.left + r.width/2;
      v.cy = r.top - rect.top + r.height/2;
    });
  }

  // ---- attach terminal clicks ----
  function attachTerminalHandlers(){
    document.querySelectorAll('.terminal').forEach(el=>{
      el.style.touchAction = 'manipulation';
      el.addEventListener('click', ()=>{ terminalClicked(el); });
    });
  }

  function terminalClicked(el){
    // selection logic
    if(selectedTerminal === el){
      el.style.boxShadow = '';
      selectedTerminal = null;
      return;
    }
    if(!selectedTerminal){
      selectedTerminal = el;
      el.style.boxShadow = '0 0 0 4px #ffd800';
      return;
    }
    const a = selectedTerminal.dataset.id;
    const b = el.dataset.id;
    if(a === b){ selectedTerminal.style.boxShadow=''; selectedTerminal=null; return; }
    // toggle connection if exists
    for(let i=0;i<connections.length;i++){
      const c = connections[i];
      if((c.from===a && c.to===b) || (c.from===b && c.to===a)){
        connections.splice(i,1);
        selectedTerminal.style.boxShadow=''; selectedTerminal=null;
        return;
      }
    }
    // create new connection - color by from terminal
    const color = determineColorFor(a);
    connections.push({from:a,to:b,color});
    selectedTerminal.style.boxShadow=''; selectedTerminal=null;
    // update immediately (positions persist)
  }

  function determineColorFor(id){
    if(id.endsWith('-L') || id.endsWith('COM') || id.endsWith('jb-')) return '#000000';
    if(id.endsWith('-N')) return '#ffffff';
    // fallback black
    return '#000000';
  }

  // ---- pointer events for preview ----
  function onPointerEvent(e){
    if(e.type === 'pointermove'){
      pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
    } else if(e.type === 'pointerdown'){
      pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
    } else if(e.type === 'pointerup' || e.type === 'pointercancel'){
      pointer.active = false;
    }
  }

  // ---- drawing ----
  function clearCanvas(){ ctx.clearRect(0,0,canvas.width/DPR, canvas.height/DPR); }

  function drawWire(x1,y1,x2,y2,color='#000',width=6){
    ctx.save();
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    // add slight shadow for visibility
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 6;
    // set contrasting stroke for white lines (draw black outline)
    if(color === '#ffffff'){
      ctx.strokeStyle = '#222';
      ctx.beginPath();
      ctx.moveTo(x1,y1);
      const mx=(x1+x2)/2, my=(y1+y2)/2 - 18;
      ctx.quadraticCurveTo(mx,my,x2,y2);
      ctx.lineWidth = width + 4;
      ctx.stroke();
      ctx.lineWidth = width;
    }
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1,y1);
    const mx=(x1+x2)/2, my=(y1+y2)/2 - 18;
    ctx.quadraticCurveTo(mx,my,x2,y2);
    ctx.stroke();
    ctx.restore();
  }

  function renderAll(){
    if(!canvas) return;
    clearCanvas();
    // draw persistent connections
    connections.forEach(c=>{
      const a = terminals.get(c.from);
      const b = terminals.get(c.to);
      if(!a || !b) return;
      drawWire(a.cx, a.cy, b.cx, b.cy, c.color, 8);
    });
    // draw preview line if a terminal selected and pointer active
    if(selectedTerminal && pointer.active){
      const sid = selectedTerminal.dataset.id;
      const s = terminals.get(sid);
      if(s){
        // get color by selected terminal
        const color = determineColorFor(sid) === '#ffffff' ? '#ffffff' : '#ffd800'; // show highlight for selected (yellow) if L
        drawWire(s.cx, s.cy, pointer.x - canvas.getBoundingClientRect().left, pointer.y - canvas.getBoundingClientRect().top, color, 4);
      }
    }
  }

  // ---- solution check for World1 (simple) ----
  function connHas(a,b){ return connections.some(c=> (c.from===a && c.to===b) || (c.from===b && c.to===a)); }
  function checkSolutionWorld1(){
    // must have power-L -> some jb, power-N -> some jb, jb -> sw-IN, sw-OUT -> jb, lamp-L & lamp-N both connected to jb
    const jbIds = Array.from(terminals.keys()).filter(id=> /^jb-/.test(id) || id.startsWith('jb-') || id==='jb-b1' || id==='jb-b2');
    if(jbIds.length === 0) return false;
    const anyPL = jbIds.some(j=> connHas('power-L', j) );
    const anyPN = jbIds.some(j=> connHas('power-N', j) );
    const jbToIn = jbIds.some(j=> connHas(j, 'sw-IN') );
    const outToJb = jbIds.some(j=> connHas('sw-OUT', j) );
    const lampL = jbIds.some(j=> connHas(j,'lamp-L'));
    const lampN = jbIds.some(j=> connHas(j,'lamp-N'));
    return anyPL && anyPN && jbToIn && outToJb && lampL && lampN;
  }

  // ---- actions ----
  function onSet(){
    if(state === STATE.opening){ showQuiz(); return; }
    const ok = checkSolutionWorld1();
    if(!ok){
      playerHP = Math.max(0, playerHP - 20); updatePlayerHP();
      if(playerHP <= 0) { alert('PLAYER HP 0 - game over'); resetGame(); }
      else { alert('配線が正しくありません。PLAYER -20'); }
      return;
    }
    // animate and trigger boss
    pulseAndThenBoss();
  }

  function pulseAndThenBoss(){
    // quick visual pulse
    let t=0;
    const iv = setInterval(()=>{
      clearCanvas();
      connections.forEach(c=>{
        const a = terminals.get(c.from), b = terminals.get(c.to);
        if(!a||!b) return;
        drawWire(a.cx,a.cy,b.cx,b.cy,c.color, 8 + (t%2?4:0));
      });
      t++;
      if(t>3){ clearInterval(iv); renderAll(); showBossOverlay(); setTimeout(()=>{ reduceBossHP(40); }, 800); }
    }, 160);
  }

  function showBossOverlay(){ bossOverlay.style.display='flex'; state=STATE.boss; }
  function hideBossOverlay(){ bossOverlay.style.display='none'; }

  function reduceBossHP(d){
    bossHP = Math.max(0, bossHP - d); if(bossHPBar) bossHPBar.style.width = bossHP+'%';
    if(bossHP <= 0) { setTimeout(()=>{ completeBoss(); }, 600); }
  }

  function completeBoss(){
    // flash + dialog
    const f = create('div',{style:{position:'fixed',inset:0,background:'#fff',opacity:0,zIndex:1300}},app);
    f.style.transition='opacity 180ms ease';
    f.style.opacity='1';
    setTimeout(()=>{ f.style.opacity='0'; setTimeout(()=>{ f.remove(); hideBossOverlay(); alert('BOSS撃破！WORLD1 CLEAR'); },200); },180);
  }

  function resetGame(){
    connections.length=0; selectedTerminal=null; playerHP=100; bossHP=100; updatePlayerHP(); if(bossHPBar) bossHPBar.style.width=bossHP+'%';
    hideBossOverlay(); showQuiz();
    updateTerminals(); renderAll();
  }

  function updatePlayerHP(){ const el = $('#playerHP'); if(el) el.style.width = playerHP+'%'; }

  // ---- lifecycle ----
  function init(){
    buildDOM();
    updateTerminals();
    attachTerminalHandlers();
    showQuiz();
  }

  // start
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

})();
