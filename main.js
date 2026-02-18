const freezeBtn = document.getElementById("freezeBtn");
const freezeScreen = document.getElementById("freezeScreen");

const freezeSound = new Audio("sound/freeze.mp3");
const impactSound = new Audio("sound/impact.mp3");

let isFreezing = false;

freezeBtn.addEventListener("click", () => {

  if (isFreezing) return;
  isFreezing = true;

  // 画面表示
  freezeScreen.style.display = "flex";

  // レインボー開始
  freezeScreen.classList.add("rainbow");

  // フリーズ音
  freezeSound.currentTime = 0;
  freezeSound.play().catch(e => console.log(e));

  // 0.8秒後 プチュン衝撃
  setTimeout(() => {
    impactSound.currentTime = 0;
    impactSound.play().catch(e => console.log(e));
  }, 800);

  // 4秒後解除
  setTimeout(() => {
    freezeScreen.style.display = "none";
    freezeScreen.classList.remove("rainbow");
    isFreezing = false;
  }, 4000);

});
