const bossBar = document.getElementById("bossHP");
const playerBar = document.getElementById("playerHP");
const comboUI = document.getElementById("comboUI");
const freezeScreen = document.getElementById("freezeScreen");
const freezeBtn = document.getElementById("freezeBtn");

const freezeSound = new Audio("sound/freeze.mp3");
const impactSound = new Audio("sound/impact.mp3");

let bossHP = 100;
let playerHP = 100;
let combo = 0;
let isFreezing = false;

freezeBtn.addEventListener("click", startFreeze);

function updateUI(){
  bossBar.style.width = bossHP + "%";
  playerBar.style.width = playerHP + "%";
  comboUI.textContent = "COMBO: " + combo;
}

function damageBoss(){

  combo++;
  let attackPower = 10 + combo * 2;

  bossHP -= attackPower;
  if(bossHP < 0) bossHP = 0;

  updateUI();

  if(bossHP === 0){
    startFreeze();
  }
}

function damagePlayer(amount){

  combo = 0;

  playerHP -= amount;
  if(playerHP < 0) playerHP = 0;

  updateUI();

  if(playerHP === 0){
    alert("GAME OVER");
    location.reload();
  }
}

function startFreeze(){

  if(isFreezing) return;
  isFreezing = true;

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
    isFreezing = false;
  },6000);
}

// 仮テスト用：画面タップでボス攻撃
document.body.addEventListener("dblclick",()=>{
  damageBoss();
});

// 仮テスト用：右クリックでプレイヤー被弾
document.body.addEventListener("contextmenu",(e)=>{
  e.preventDefault();
  damagePlayer(20);
});

updateUI();
