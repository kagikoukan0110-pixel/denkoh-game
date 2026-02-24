/* game.js ー 安定版 */

/* =========================
   STATE
========================= */
let bossHP = 100;
let playerHP = 100;
let roundNum = 1;
let switchOn = false;
let selected = null;
let previewPath = null;
let connections = [];
let state = 'title';

/* =========================
   ELEMENTS
========================= */
const board = document.getElementById("board");
const wireLayer = document.getElementById("wireLayer");
const playerBar = document.getElementById("playerHP");
const bossHPbar = document.getElementById("bossHPbar");
const setBtn = document.getElementById("setBtn");
const switchBtn = document.getElementById("switchBtn");
const lampsContainer = document.getElementById("lampsContainer");

/* =========================
   SVG RESIZE
========================= */
function resizeSVG(){
  const r = board.getBoundingClientRect();
  wireLayer.setAttribute("viewBox", `0 0 ${r.width} ${r.height}`);
}
window.addEventListener("resize", resizeSVG);
window.addEventListener("load", resizeSVG);

/* =========================
   PREVIEW LINE
========================= */
function removePreview(){
  if(previewPath){
    previewPath.remove();
    previewPath = null;
  }
  board.removeEventListener('mousemove', movePreview);
}

function movePreview(e){
  if(!selected || !previewPath) return;

  const br = board.getBoundingClientRect();
  const sr = selected.getBoundingClientRect();

  const x1 = sr.left - br.left + sr.width/2;
  const y1 = sr.top - br.top + sr.height/2;
  const x2 = e.clientX - br.left;
  const y2 = e.clientY - br.top;

  previewPath.setAttribute("d", `M ${x1} ${y1} L ${x2} ${y2}`);
}

function createPreview(el){
  removePreview();

  const id = el.dataset.id.toLowerCase();
  const color = id.includes('-n') ? "#ffffff" : "#000000";

  previewPath = document.createElementNS("http://www.w3.org/2000/svg","path");
  previewPath.setAttribute("stroke", color);
  previewPath.setAttribute("stroke-width", "2");
  previewPath.setAttribute("fill", "none");
  previewPath.setAttribute("stroke-linecap","round");

  wireLayer.appendChild(previewPath);
  board.addEventListener("mousemove", movePreview);
}

/* =========================
   CONNECT
========================= */
function pickColor(a,b){
  if(a.includes('-n') || b.includes('-n')) return "#ffffff";
  return "#000000";
}

function connect(a,b){
  const idA = a.dataset.id;
  const idB = b.dataset.id;
  if(idA === idB) return;

  const br = board.getBoundingClientRect();
  const r1 = a.getBoundingClientRect();
  const r2 = b.getBoundingClientRect();

  const x1 = r1.left - br.left + r1.width/2;
  const y1 = r1.top - br.top + r1.height/2;
  const x2 = r2.left - br.left + r2.width/2;
  const y2 = r2.top - br.top + r2.height/2;

  const path = document.createElementNS("http://www.w3.org/2000/svg","path");
  path.setAttribute("d", `M ${x1} ${y1} L ${x2} ${y2}`);
  path.setAttribute("stroke", pickColor(idA,idB));
  path.setAttribute("stroke-width","3");
  path.setAttribute("fill","none");
  path.setAttribute("stroke-linecap","round");

  wireLayer.appendChild(path);
  connections.push([idA,idB,path]);
}

/* =========================
   TERMINAL CLICK
========================= */
document.querySelectorAll(".terminal").forEach(t=>{
  t.addEventListener("click", ()=>{
    if(state !== "play") return;

    if(!selected){
      selected = t;
      t.classList.add("selected");
      createPreview(t);
      return;
    }

    if(selected === t){
      selected.classList.remove("selected");
      selected = null;
      removePreview();
      return;
    }

    connect(selected, t);
    selected.classList.remove("selected");
    selected = null;
    removePreview();
  });
});

/* =========================
   CHECK SOLUTION
========================= */
function checkSolution(){
  return connections.length >= 4;
}

/* =========================
   LAMP EFFECT
========================= */
function lightLamps(){
  document.querySelectorAll(".lamp").forEach(l=>{
    l.classList.add("lit");
    setTimeout(()=>l.classList.remove("lit"),2000);
  });
}

/* =========================
   SET BUTTON
========================= */
setBtn.addEventListener("click", async ()=>{
  if(state !== "play") return;
  if(!switchOn){ alert("スイッチがOFF"); return; }

  if(!checkSolution()){
    playerHP -= 20;
    playerBar.style.width = playerHP + "%";
    return;
  }

  lightLamps();

  // 演出時間 +2秒追加
  await new Promise(r=>setTimeout(r,3000));

  doBossSequence();
});

/* =========================
   SWITCH
========================= */
switchBtn.addEventListener("click", ()=>{
  switchOn = !switchOn;
});

/* =========================
   DEVICE NON-OVERLAP
========================= */
function randomizeDevices(){
  const devices = document.querySelectorAll(".device");
  const boardRect = board.getBoundingClientRect();
  const used = [];

  devices.forEach(dev=>{
    const w = dev.offsetWidth;
    const h = dev.offsetHeight;

    let tries = 0;
    while(tries++ < 1000){
      const x = Math.random() * (boardRect.width - w);
      const y = Math.random() * (boardRect.height - h);

      const rect = {x,y,w,h};
      const overlap = used.some(r =>
        !(x + w < r.x - 20 || x > r.x + r.w + 20 ||
          y + h < r.y - 20 || y > r.y + r.h + 20)
      );
      if(!overlap){
        dev.style.left = x + "px";
        dev.style.top = y + "px";
        used.push(rect);
        break;
      }
    }
  });
}

/* =========================
   BOSS
========================= */
async function doBossSequence(){
  bossHP -= 50;
  bossHPbar.style.width = bossHP + "%";

  if(bossHP <= 0){
    alert("先行配線させとけば良かった…");
  }
}

/* =========================
   INIT
========================= */
function startPlay(){
  state = "play";
  randomizeDevices();
  resizeSVG();
}

startPlay();
