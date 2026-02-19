let bossHP = 100;
let playerHP = 100;

const bossBar = document.getElementById("bossHP");
const playerBar = document.getElementById("playerHP");
const overlay = document.getElementById("overlay");
const setBtn = document.getElementById("setBtn");
const wireLayer = document.getElementById("wireLayer");
const board = document.getElementById("board");

let selected = null;
let connections = [];
let switchOn = false;

updateHP();

/* ===== 端子クリック ===== */

document.querySelectorAll(".terminal").forEach(t=>{
  t.addEventListener("click",()=>{

    if(!selected){
      selected = t;
      t.classList.add("selected");
    }else{
      if(selected !== t){
        connect(selected,t);
      }
      selected.classList.remove("selected");
      selected = null;
    }
  });
});

/* ===== スイッチ ON/OFF（ダブルタップ）===== */

document.getElementById("switch").addEventListener("dblclick",()=>{
  switchOn = !switchOn;
  document.getElementById("switch").style.background =
    switchOn ? "#aaffaa" : "#ddd";
});

/* ===== 配線描画（ズレ修正版）===== */

function connect(a,b){

  const idA = a.dataset.id;
  const idB = b.dataset.id;

  connections.push([idA,idB]);

  const boardRect = board.getBoundingClientRect();
  const rectA = a.getBoundingClientRect();
  const rectB = b.getBoundingClientRect();

  const x1 = rectA.left - boardRect.left + rectA.width/2;
  const y1 = rectA.top - boardRect.top + rectA.height/2;

  const x2 = rectB.left - boardRect.left + rectB.width/2;
  const y2 = rectB.top - boardRect.top + rectB.height/2;

  const line = document.createElementNS("http://www.w3.org/2000/svg","line");
  line.setAttribute("x1",x1);
  line.setAttribute("y1",y1);
  line.setAttribute("x2",x2);
  line.setAttribute("y2",y2);
  line.setAttribute("stroke","yellow");
  line.setAttribute("stroke-width","3");

  wireLayer.appendChild(line);
}

/* ===== 判定 ===== */

setBtn.addEventListener("click",()=>{

  if(!switchOn){
    alert("スイッチがOFFだ");
    return;
  }

  const ok =
    has("power-L","jb-1") &&
    has("jb-1","switch-IN") &&
    has("switch-OUT","jb-2") &&
    has("jb-2","lamp-L") &&
    has("power-N","jb-3") &&
    has("jb-3","lamp-N");

  if(ok){
    bossHP = 0;
    updateHP();
    showClear();
  }else{
    playerHP -= 20;
    if(playerHP < 0) playerHP = 0;
    updateHP();
  }
});

function has(a,b){
  return connections.some(c =>
    (c[0]===a && c[1]===b) ||
    (c[0]===b && c[1]===a)
  );
}

function updateHP(){
  bossBar.style.width = bossHP + "%";
  playerBar.style.width = playerHP + "%";
}

function showClear(){
  overlay.classList.remove("hidden");
}
