// =========================
// 状態管理
// =========================

let playerHP = 100;
let bossHP = 100;
let currentQuestion = 0;
let connections = [];
let selectedTerminal = null;

// =========================
// 問題（固定5問）
// =========================

const questions = [
  {
    text: "三路スイッチの端子数はどれか。",
    choices: ["2", "3", "4", "5"],
    answer: 1
  },
  {
    text: "接地工事D種の接地抵抗値はどれか。",
    choices: ["10Ω以下", "100Ω以下", "500Ω以下", "1000Ω以下"],
    answer: 1
  },
  {
    text: "VVFケーブルの接地側の色はどれか。",
    choices: ["黒", "白", "赤", "青"],
    answer: 1
  },
  {
    text: "単相100V回路の電圧はどれか。",
    choices: ["50V", "100V", "200V", "220V"],
    answer: 1
  },
  {
    text: "リングスリーブ小で接続可能な本数はどれか。",
    choices: ["1本", "2本", "3本", "4本"],
    answer: 1
  }
];

// =========================
// 初期化
// =========================

document.addEventListener("DOMContentLoaded", () => {
  loadQuestion();
  updateHP();
  setupTerminals();
  document.getElementById("setButton").addEventListener("click", checkCircuit);
});

// =========================
// HP更新
// =========================

function updateHP() {
  document.getElementById("playerHPBar").style.width = playerHP + "%";
  document.getElementById("bossHPBar").style.width = bossHP + "%";
  document.getElementById("playerHPBarBoss").style.width = playerHP + "%";
  document.getElementById("bossHPBarBoss").style.width = bossHP + "%";
}

// =========================
// クイズ
// =========================

function loadQuestion() {

  if (currentQuestion >= questions.length) {
    startBossBattle();
    return;
  }

  const q = questions[currentQuestion];

  document.getElementById("questionNumber").textContent =
    "問題 " + (currentQuestion + 1) + " / 5";

  document.getElementById("questionText").textContent = q.text;

  const choicesDiv = document.getElementById("choices");
  choicesDiv.innerHTML = "";

  q.choices.forEach((choice, index) => {
    const btn = document.createElement("button");
    btn.textContent = choice;
    btn.className = "choiceBtn";
    btn.onclick = () => checkAnswer(index);
    choicesDiv.appendChild(btn);
  });
}

function checkAnswer(index) {
  const q = questions[currentQuestion];

  if (index === q.answer) {
    bossHP -= 15;
    if (bossHP < 0) bossHP = 0;
    document.getElementById("resultMessage").textContent = "○ 正解！";
  } else {
    playerHP -= 10;
    if (playerHP < 0) playerHP = 0;
    document.getElementById("resultMessage").textContent = "× 不正解";
  }

  updateHP();

  setTimeout(() => {
    document.getElementById("resultMessage").textContent = "";
    currentQuestion++;
    loadQuestion();
  }, 1500);
}

// =========================
// ボス戦開始
// =========================

function startBossBattle() {
  document.getElementById("quizScreen").classList.add("hidden");
  document.getElementById("bossScreen").classList.remove("hidden");
}

// =========================
// 配線処理（タップ→タップ）
// =========================

function setupTerminals() {
  const terminals = document.querySelectorAll(".terminal");

  terminals.forEach(t => {
    t.addEventListener("click", () => {

      if (!selectedTerminal) {
        selectedTerminal = t;
        t.classList.add("selected");
      } else {

        if (selectedTerminal === t) {
          t.classList.remove("selected");
          selectedTerminal = null;
          return;
        }

        connections.push([
          selectedTerminal.dataset.id,
          t.dataset.id
        ]);

        selectedTerminal.classList.remove("selected");
        selectedTerminal = null;
      }
    });
  });
}

// =========================
// 回路判定
// =========================

function checkCircuit() {

  const hasLtoSwitch =
    hasConnection("powerL", "switchIn") ||
    hasConnection("switchIn", "powerL");

  const hasSwitchToLamp =
    hasConnection("switchOut", "lampL") ||
    hasConnection("lampL", "switchOut");

  const hasLampToN =
    hasConnection("lampN", "powerN") ||
    hasConnection("powerN", "lampN");

  if (hasLtoSwitch && hasSwitchToLamp && hasLampToN) {

    document.getElementById("lampVisual").classList.add("on");

    setTimeout(() => {
      worldClear();
    }, 800);

  } else {

    alert("回路が成立していない！");
  }
}

function hasConnection(a, b) {
  return connections.some(conn =>
    (conn[0] === a && conn[1] === b)
  );
}

// =========================
// WORLD CLEAR
// =========================

function worldClear() {

  const overlay = document.getElementById("overlay");
  const text = document.getElementById("overlayText");
  const nextBtn = document.getElementById("nextWorldBtn");

  overlay.classList.remove("hidden");
  text.textContent = "WORLD 1 CLEAR";

  nextBtn.classList.remove("hidden");

  nextBtn.onclick = () => {
    alert("WORLD2 未実装");
  };
}
