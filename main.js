document.addEventListener("DOMContentLoaded", () => {

let bossHP = 100;
let playerHP = 100;
let switchOn = false;
let selected = null;

const bossBar = document.getElementById("bossHP");
const playerBar = document.getElementById("playerHP");
const setBtn = document.getElementById("setBtn");
const switchEl = document.getElementById("switch");
const board = document.getElementById("board");
const wireLayer = document.getElementById("wireLayer");

let connections = [];

function updateHP(){
  bossBar.style.width = bossHP + "%";
  playerBar.style.width = playerHP + "%";
}

updateHP();

switchEl.addEventListener("click", ()=>{
  switchOn = !switchOn;
  switchEl.classList.toggle("on", switchOn);
});

function createRightAnglePath(x1, y1, x2, y2){
  const midY = (y1 + y2) / 2;
  return `
    M ${x1} ${y1}
    L ${x1} ${midY}
    L ${x2} ${midY}
    L ${x2} ${y2}
  `;
}

function drawWire(aEl, bEl){

  const rect1 = aEl.getBoundingClientRect();
  const rect2 = bEl.getBoundingClientRect();
  const boardRect = board.getBoundingClientRect();

  const x1 = rect1.left + rect1.width/2 - boardRect.left;
  const y1 = rect1.top + rect1.height/2 - boardRect.top;

  const x2 = rect2.left + rect2.width/2 - boardRect.left;
  const y2 = rect2.top + rect2.height/2 - boardRect.top;

  const path = document.createElementNS("http://www.w3.org/2000/svg","path");

  path.setAttribute("d", createRightAnglePath(x1,y1,x2,y2));
  path.setAttribute("stroke","#666");
  path.setAttribute("stroke-width","3");
  path.setAttribute("fill","none");

  wireLayer.appendChild(path);

  return path;
}

document.querySelectorAll(".terminal").forEach(t=>{
  t.addEventListener("click", ()=>{
    if(!selected){
      selected = t;
      t.classList.add("selected");
    }else{
      if(selected !== t){
        const path = drawWire(selected, t);

        connections.push({
          a: selected.dataset.id,
          b: t.dataset.id,
          path: path
        });
      }
      selected.classList.remove("selected");
      selected = null;
    }
  });
});

});
