const clearText = document.getElementById("clearText");
const freeze = document.getElementById("freeze");

// ===== 音 =====
const freezeSound = new Audio("sound/freeze.mp3");
const impactSound = new Audio("sound/impact.mp3");

freezeSound.preload = "auto";
impactSound.preload = "auto";

let freezeActive = false;

function titleFreeze(title = "電気神ゼウス") {
  if (freezeActive) return;
  freezeActive = true;

  // ===== プチュン =====
  freeze.style.display = "block";
  freeze.style.background = "black";

  impactSound.currentTime = 0;
  impactSound.play();

  setTimeout(() => {

    // ===== フリーズ本編 =====
    clearText.textContent = title;
    clearText.style.display = "block";

    freezeSound.currentTime = 0;
    freezeSound.play();

    document.body.style.animation = "rainbowMove 1s linear infinite";

  }, 300); // 0.3秒プチュン

  setTimeout(() => {
    freeze.style.display = "none";
    clearText.style.display = "none";
    document.body.style.animation = "none";
    freezeActive = false;
  }, 4500);
}

function testFreeze(){
  titleFreeze("電気神ゼウス");
}

window.titleFreeze = titleFreeze;
window.testFreeze = testFreeze;
