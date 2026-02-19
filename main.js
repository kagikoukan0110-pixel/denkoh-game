let bossHP = 100;
let playerHP = 100;

const bossBar = document.getElementById("bossHP");
const playerBar = document.getElementById("playerHP");
const setBtn = document.getElementById("setBtn");
const overlay = document.getElementById("overlay");

let selected = null;
let connections = [];

updateHP();

document.querySelectorAll(".terminal").forEach(t=>{
  t.addEventListener("click",()=>{
    if(!selected){
      selected = t;
      t.classList.add("selected");
    }else{
      if(selected !== t){
        connections.push([selected.dataset.id, t.dataset.id]);
      }
      selected.classList.remove("selected");
      selected = null;
    }
  });
});

setBtn.addEventListener("click",checkCircuit);

function checkCircuit(){

  const ok =
    has("power-L","jb-1") &&
    has("jb-1","switch-IN") &&
    has("switch-OUT","jb-2") &&
    has("jb-2","lamp-L") &&
    has("power-N","lamp-N");

  if(ok){
    bossHP = 0;
    updateHP();
    showClear();
  }else{
    playerHP -= 20;
    if(playerHP < 0) playerHP = 0;
    updateHP();
    if(playerHP === 0){
      alert("GAME OVER");
      location.reload();
    }
  }
}

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
