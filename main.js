const bossBar = document.getElementById("bossHP");
const playerBar = document.getElementById("playerHP");
const comboUI = document.getElementById("comboUI");
const freezeScreen = document.getElementById("freezeScreen");
const freezeBtn = document.getElementById("freezeBtn");

const freezeSound = new Audio("sound/freeze.mp3");
const impactSound = new Audio("sound/impact.mp3");

/* ===============================
   GAME STATE
================================= */

const gameState = {
  mode: "normal",
  phaseIndex: 0,
  placedParts: [],
  connections: [],
  nodes: {},
  switchStates: {},
  timer: { remaining: 0, id: null },
  bossHP: 100,
  playerHP: 100,
  combo: 0,
  titleIndex: 0,
  isFreezing: false,
  selectedNode: null
};

const bossPhases = [
  { type: "single", timeLimit: 60 },
  { type: "threeway", timeLimit: 45 },
  { type: "threeway_box", timeLimit: 30 }
];

/* ===============================
   UI UPDATE
================================= */

function updateUI(){
  bossBar.style.width = gameState.bossHP + "%";
  playerBar.style.width = gameState.playerHP + "%";
  comboUI.textContent = "COMBO: " + gameState.combo;
}

/* ===============================
   DAMAGE
================================= */

function damageBoss(){
  gameState.combo++;
  let attackPower = 10 + gameState.combo * 2;
  gameState.bossHP -= attackPower;
  if(gameState.bossHP < 0) gameState.bossHP = 0;
  updateUI();
  if(gameState.bossHP === 0) startFreeze();
}

function damagePlayer(amount){
  gameState.combo = 0;
  gameState.playerHP -= amount;
  if(gameState.playerHP < 0) gameState.playerHP = 0;
  updateUI();
  if(gameState.playerHP === 0){
    alert("GAME OVER");
    location.reload();
  }
}

/* ===============================
   FREEZE
================================= */

freezeBtn.addEventListener("click", startFreeze);

function startFreeze(){
  if(gameState.isFreezing) return;
  gameState.isFreezing = true;
  freezeScreen.style.display = "block";
  freezeSound.currentTime = 0;
  freezeSound.play().catch(()=>{});
  setTimeout(()=>{
    impactSound.currentTime = 0;
    impactSound.play().catch(()=>{});
  },3000);
  setTimeout(()=>{
    freezeScreen.style.display = "none";
    gameState.isFreezing = false;
  },6000);
}

/* ===============================
   BOSS MODE
================================= */

function startBossBattle(){
  gameState.mode = "boss";
  gameState.phaseIndex = 0;
  document.body.classList.add("boss-mode");
  loadPhase();
}

function loadPhase(){
  const phase = bossPhases[gameState.phaseIndex];
  resetBoard();
  autoPlaceParts(phase.type);
}

function nextPhase(){
  gameState.phaseIndex++;
  if(gameState.phaseIndex >= bossPhases.length){
    endBossBattle();
    return;
  }
  loadPhase();
}

function endBossBattle(){
  gameState.mode = "normal";
  document.body.classList.remove("boss-mode");
}

/* ===============================
   RESET
================================= */

function resetBoard(){
  gameState.placedParts = [];
  gameState.connections = [];
  gameState.nodes = {};
  gameState.switchStates = {};
  gameState.selectedNode = null;

  document.querySelectorAll(".part").forEach(e=>e.remove());
  document.querySelectorAll(".terminal").forEach(e=>e.remove());
  document.getElementById("wireLayer").innerHTML = "";
}

/* ===============================
   AUTO PLACE
================================= */

function autoPlaceParts(type){

  const width = window.innerWidth;
  const height = window.innerHeight;
  const y = height * 0.4;

  function createPart(id,label,xPercent){

    const workspace = document.getElementById("workspace");
    const x = width * xPercent;

    const part = document.createElement("div");
    part.className = "part";
    part.textContent = label;
    part.style.left = x + "px";
    part.style.top = y + "px";
    workspace.appendChild(part);

    function createTerminal(suffix,offsetX,offsetY){
      const nodeId = id + "-" + suffix;
      const t = document.createElement("div");
      t.className = "terminal";
      t.dataset.node = nodeId;
      t.style.left = (x+offsetX)+"px";
      t.style.top = (y+offsetY)+"px";
      workspace.appendChild(t);
      gameState.nodes[nodeId] = true;
    }

    if(label==="電源"){
      createTerminal("L",-25,0);
      createTerminal("N",25,0);
    }

    if(label==="ランプ"){
      createTerminal("L",-20,0);
      createTerminal("N",20,0);
    }

    if(label==="片切"){
      createTerminal("0",-20,0);
      createTerminal("1",20,0);
    }

    if(label==="三路"){
      createTerminal("0",-20,0);
      createTerminal("1",20,-10);
      createTerminal("3",20,10);
    }

    if(label==="BOX"){
      createTerminal("J",0,0);
    }

  }

  if(type==="single"){
    createPart("power1","電源",0.2);
    createPart("sw1","片切",0.5);
    createPart("lamp1","ランプ",0.8);
  }

  if(type==="threeway"){
    createPart("power1","電源",0.1);
    createPart("sw1","三路",0.35);
    createPart("sw2","三路",0.65);
    createPart("lamp1","ランプ",0.9);
  }

  if(type==="threeway_box"){
    createPart("power1","電源",0.05);
    createPart("sw1","三路",0.25);
    createPart("box1","BOX",0.5);
    createPart("sw2","三路",0.75);
    createPart("lamp1","ランプ",0.95);
  }

}

/* ===============================
   WIRE SYSTEM
================================= */

document.addEventListener("click",(e)=>{

  if(!e.target.classList.contains("terminal")) return;

  const node = e.target.dataset.node;

  if(!gameState.selectedNode){
    gameState.selectedNode = node;
    e.target.classList.add("selected");
    return;
  }

  if(gameState.selectedNode === node){
    gameState.selectedNode = null;
    e.target.classList.remove("selected");
    return;
  }

  drawWire(gameState.selectedNode,node);
  gameState.connections.push([gameState.selectedNode,node]);

  document.querySelectorAll(".terminal").forEach(t=>t.classList.remove("selected"));
  gameState.selectedNode = null;

});

function drawWire(nodeA,nodeB){

  const wireLayer = document.getElementById("wireLayer");

  const elA = document.querySelector(`[data-node="${nodeA}"]`);
  const elB = document.querySelector(`[data-node="${nodeB}"]`);

  const rectA = elA.getBoundingClientRect();
  const rectB = elB.getBoundingClientRect();

  const x1 = rectA.left + rectA.width/2;
  const y1 = rectA.top + rectA.height/2;
  const x2 = rectB.left + rectB.width/2;
  const y2 = rectB.top + rectB.height/2;

  const line = document.createElementNS("http://www.w3.org/2000/svg","line");

  line.setAttribute("x1",x1);
  line.setAttribute("y1",y1);
  line.setAttribute("x2",x2);
  line.setAttribute("y2",y2);
  line.setAttribute("stroke","#ffffff");
  line.setAttribute("stroke-width","2");

  wireLayer.appendChild(line);

  const length = line.getTotalLength();

  line.style.strokeDasharray = length;
  line.style.strokeDashoffset = length;

  line.getBoundingClientRect();

  line.style.transition = "stroke-dashoffset 0.25s ease";
  line.style.strokeDashoffset = "0";
}

/* ===============================
   DEBUG
================================= */

document.addEventListener("keydown",(e)=>{
  if(e.key==="b") startBossBattle();
  if(e.key==="n") nextPhase();
});

updateUI();
