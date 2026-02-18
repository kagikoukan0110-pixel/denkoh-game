const workspace=document.getElementById("workspace");
const wireLayer=document.getElementById("wireLayer");

let sw1=1;
let sw2=3;
let selected=null;
let wires=[];
let bossHP=100;
let xp=0;
let title="一般人";

const audioCtx=new (window.AudioContext||window.webkitAudioContext)();

function playTone(freq,dur,type="sine",vol=0.2){
  const osc=audioCtx.createOscillator();
  const gain=audioCtx.createGain();
  osc.type=type;
  osc.frequency.value=freq;
  gain.gain.value=vol;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime+dur);
}

function terminalClick(device,terminal,element){
  if(!selected){
    selected={device,terminal,element};
    element.style.background="yellow";
    return;
  }

  if(selected.element===element){
    element.style.background="#21a8d8";
    selected=null;
    return;
  }

  drawWire(selected.element,element);

  wires.push({
    a:selected.device+"-"+selected.terminal,
    b:device+"-"+terminal
  });

  selected.element.style.background="#21a8d8";
  selected=null;

  checkPower();
}

function drawWire(el1,el2){
  const r1=el1.getBoundingClientRect();
  const r2=el2.getBoundingClientRect();
  const base=workspace.getBoundingClientRect();

  const x1=r1.left-base.left+r1.width/2;
  const y1=r1.top-base.top+r1.height/2;
  const x2=r2.left-base.left+r2.width/2;
  const y2=r2.top-base.top+r2.height/2;

  const line=document.createElementNS("http://www.w3.org/2000/svg","line");
  line.setAttribute("x1",x1);
  line.setAttribute("y1",y1);
  line.setAttribute("x2",x2);
  line.setAttribute("y2",y2);
  line.setAttribute("stroke","#222");
  line.setAttribute("stroke-width","4");

  wireLayer.appendChild(line);
}

function toggleSwitch1(){sw1=(sw1===1)?3:1;checkPower();}
function toggleSwitch2(){sw2=(sw2===1)?3:1;checkPower();}

function buildGraph(){
  let graph={};
  function connect(a,b){
    if(!graph[a])graph[a]=[];
    if(!graph[b])graph[b]=[];
    graph[a].push(b);
    graph[b].push(a);
  }
  wires.forEach(w=>connect(w.a,w.b));
  connect("三路1-0","三路1-"+sw1);
  connect("三路2-0","三路2-"+sw2);
  return graph;
}

function dfs(graph,start){
  let visited=new Set();
  let stack=[start];
  while(stack.length){
    const node=stack.pop();
    if(!visited.has(node)){
      visited.add(node);
      (graph[node]||[]).forEach(n=>stack.push(n));
    }
  }
  return visited;
}

function checkPower(){
  const graph=buildGraph();
  const powered=dfs(graph,"電源-L");

  if(powered.has("電源-N")){
    bossHP-=20;
    document.getElementById("bossHP").style.width=bossHP+"%";
    triggerFreeze();
    return;
  }

  const lampOn=powered.has("ランプ-L")&&powered.has("ランプ-N");
  const lamp=document.getElementById("lamp");

  if(lampOn){
    lamp.classList.add("on");
    xp+=10;
    updateTitle();
  }else{
    lamp.classList.remove("on");
  }
}

function updateTitle(){
  let old=title;
  if(xp>=100)title="電気神ゼウス";
  else if(xp>=60)title="一流電気工事士";
  else if(xp>=30)title="二流電気工事士";

  document.getElementById("titleInfo").innerText=title;
  document.getElementById("xpInfo").innerText="XP:"+xp;

  if(title!==old){
    titleFreeze(title);
  }
}

function titleFreeze(text){
  document.body.classList.add("rainbow-bg");
  document.getElementById("freeze").classList.add("freeze-blackout");
  playTone(440,0.2,"sawtooth",0.3);

  setTimeout(()=>{
    document.body.classList.remove("rainbow-bg");
    document.getElementById("freeze").classList.remove("freeze-blackout");
    document.getElementById("clearText").style.display="flex";
    document.getElementById("clearText").innerText=text;
    setTimeout(()=>{
      document.getElementById("clearText").style.display="none";
    },1200);
  },400);
}

function triggerFreeze(){
  document.getElementById("freeze").classList.add("freeze-blackout");
  playTone(60,0.3,"sawtooth",0.5);
  setTimeout(()=>{
    document.getElementById("freeze").classList.remove("freeze-blackout");
  },400);
}
