let playerHP = 100;
let bossHP = 100;

const bossBar = document.getElementById("bossHP");
const playerBar = document.getElementById("playerHP");
const freezeScreen = document.getElementById("freezeScreen");

const freezeSound = new Audio("sound/freeze.mp3");
const impactSound = new Audio("sound/impact.mp3");

let connections = [];
let selected = null;

updateHP();

// 端子クリック
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

document.getElementById("setBtn").addEventListener("click", checkAnswer);

function checkAnswer(){

  const correct =
    has("power-L","switch-IN") &&
    has("switch-OUT","lamp-L") &&
    has("power-N","lamp-N");

  if(correct){
    bossHP -= 30;
    if(bossHP < 0) bossHP = 0;
  }else{
    playerHP -= 20;
    if(playerHP < 0) playerHP = 0;
  }

  updateHP();
  connections = [];

  if(bossHP === 0){
    startFreeze();
  }
}

function has(a,b){
  return connections.some(pair =>
    (pair[0]===a && pair[1]===b) ||
    (pair[0]===b && pair[1]===a)
  );
}

function updateHP(){
  bossBar.style.width = bossHP + "%";
  playerBar.style.width = playerHP + "%";
}

function startFreeze(){
  freezeScreen.style.display = "flex";

  freezeSound.currentTime = 0;
  freezeSound.play().catch(()=>{});

  setTimeout(()=>{
    impactSound.currentTime = 0;
    impactSound.play().catch(()=>{});
  },3000);

  setTimeout(()=>{
    freezeScreen.style.display = "none";
  },6000);
}
