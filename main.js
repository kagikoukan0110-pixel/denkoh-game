// ===== 初期化 =====
const clearText = document.getElementById("clearText");
const freeze = document.getElementById("freeze");

let freezeActive = false;

// ===== フリーズ演出 =====
function titleFreeze(title = "皇帝降臨") {
  if (freezeActive) return;
  freezeActive = true;

  freeze.style.display = "block";
  clearText.style.display = "block";
  clearText.textContent = title;

  document.body.style.animation = "rainbowMove 1s linear infinite";

  setTimeout(() => {
    freeze.style.display = "none";
    clearText.style.display = "none";
    document.body.style.animation = "none";
    freezeActive = false;
  }, 4000);
}

// ===== テストボタン =====
function testFreeze(){
  titleFreeze("フリーズ TEST");
}

// iPhone対応（グローバル公開）
window.titleFreeze = titleFreeze;
window.testFreeze = testFreeze;

// ===== 既存ロジック保護 =====
// 既存のゲーム処理がある場合はこの下にそのまま置く
