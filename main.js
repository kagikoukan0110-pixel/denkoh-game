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

  timer: {
    remaining: 0,
    id: null
  },

  bossHP: 100,
  playerHP: 100,
  combo: 0,

  titleIndex: 0,

  isFreezing: false
};

/* ===============================
   UI UPDATE
================================= */

function updateUI(){
  bossBar.style.width = gameState.bossHP + "%";
  playerBar.style.width = gameState.playerHP + "%";
  comboUI.textContent = "COMBO: " + gameState.combo;
}

/* ===============================
   DAMAGE SYSTEM
================================= */

function damageBoss(){

  gameState.combo++;

  let attackPower = 10 + gameState.combo * 2;

  gameState.bossHP -= attackPower;
  if(gameState.bossHP < 0) gameState.bossHP = 0;

  updateUI();

  if(gameState.bossHP === 0){
    startFreeze();
  }
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
   FREEZE SYSTEM
================================= */

freezeBtn.addEventListener("click", startFreeze);

function startFreeze(){

  if(gameState.isFreezing) return;
  gameState.isFreezing = true;

  freezeScreen.style.display = "block";

  freezeSound.currentTime = 0;
  freezeSound.play().catch(()=>{});

  // 3秒後プチュン
  setTimeout(()=>{
    impactSound.currentTime = 0;
    impactSound.play().catch(()=>{});
  },3000);

  // さらに3秒暗転キープ（合計6秒）
  setTimeout(()=>{
    freezeScreen.style.display = "none";
    gameState.isFreezing = false;
  },6000);
}

/* ===============================
   TEMP TEST
================================= */

// ダブルクリックでボス攻撃
document.body.addEventListener("dblclick",()=>{
  damageBoss();
});

// 右クリックで被弾
document.body.addEventListener("contextmenu",(e)=>{
  e.preventDefault();
  damagePlayer(20);
});

updateUI();
