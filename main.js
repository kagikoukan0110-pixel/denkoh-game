document.addEventListener("DOMContentLoaded", () => {

let bossHP = 100;
let playerHP = 100;

const bossBar = document.getElementById("bossHP");
const playerBar = document.getElementById("playerHP");
const setBtn = document.getElementById("setBtn");
const overlay = document.getElementById("overlay");

let selected = null;
let connections = [];

function updateHP(){
  bossBar.style.width = bossHP + "%";
  playerBar.style.width = playerHP + "%";
}

function has(a,b){
  return connections.some(c =>
    (c[0]===a && c[1]===b) ||
    (c[0]===b && c[1]===a)
  );
}

function showClear(){
  overlay.classList.remove("hidden");
}

updateHP();

document.querySelectorAll(".terminal").forEach(t=>{
  t.addEventListener("click",()=>{
    if(!selected){
      selected = t;
      t.classList.add("selected");
    }else{
      if(selected !== t){
        connections.push([
          selected.dataset.id,
          t.dataset.id
        ]);
      }
      selected.classList.remove("selected");
      selected = null;
    }
  });
});

setBtn.addEventListener("click",()=>{

  const correct =
    has("power-L","switch-IN") &&
    has("switch-OUT","lamp-L") &&
    has("power-N","lamp-N");

  if(correct){
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

});

});
