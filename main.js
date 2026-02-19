document.addEventListener("DOMContentLoaded", function () {

  console.log("main loaded");

  // =========================
  // 状態管理
  // =========================
  let playerHP = 100;
  let bossHP = 100;
  let currentQuestion = 0;
  let quizMistakes = 0;
  let phase = "quiz"; // quiz → boss

  // =========================
  // DOM取得
  // =========================
  const bossBar = document.getElementById("bossHP");
  const playerBar = document.getElementById("playerHP");
  const comboUI = document.getElementById("comboUI");

  const quizContainer = document.getElementById("quizContainer");
  const questionText = document.getElementById("questionText");
  const choicesContainer = document.getElementById("choicesContainer");

  const bossArea = document.getElementById("bossArea");

  const freezeScreen = document.getElementById("freezeScreen");

  const freezeSound = new Audio("sound/freeze.mp3");
  const impactSound = new Audio("sound/impact.mp3");

  // =========================
  // 問題（5問固定）
  // =========================
  const questions = [
    {
      text: "三路スイッチの端子数はどれか。",
      choices: ["2", "3", "4", "5"],
      answer: 1
    },
    {
      text: "接地工事D種の接地抵抗値はどれか。",
      choices: ["10Ω以下", "100Ω以下", "500Ω以下", "制限なし"],
      answer: 1
    },
    {
      text: "VVFケーブルの接地側の色はどれか。",
      choices: ["黒", "白", "赤", "青"],
      answer: 1
    },
    {
      text: "100V回路の電圧許容誤差はどれか。",
      choices: ["±5%", "±6%", "±10%", "±15%"],
      answer: 1
    },
    {
      text: "過電流遮断器の目的は何か。",
      choices: ["漏電防止", "過負荷保護", "感電防止", "電圧安定"],
      answer: 1
    }
  ];

  // =========================
  // UI更新
  // =========================
  function updateHP() {
    if (bossBar) bossBar.style.width = bossHP + "%";
    if (playerBar) playerBar.style.width = playerHP + "%";
  }

  // =========================
  // クイズ表示
  // =========================
  function loadQuestion() {

    if (currentQuestion >= questions.length) {
      startBossBattle();
      return;
    }

    const q = questions[currentQuestion];
    questionText.textContent = q.text;
    choicesContainer.innerHTML = "";

    q.choices.forEach((choice, index) => {
      const btn = document.createElement("button");
      btn.textContent = choice;
      btn.className = "choiceBtn";
      btn.onclick = () => checkAnswer(index);
      choicesContainer.appendChild(btn);
    });
  }

  // =========================
  // 回答判定
  // =========================
  function checkAnswer(selected) {
    const correct = questions[currentQuestion].answer;

    if (selected === correct) {
      bossHP -= 15;
      if (bossHP < 0) bossHP = 0;
    } else {
      playerHP -= 15;
      if (playerHP < 0) playerHP = 0;
      quizMistakes++;
    }

    updateHP();

    currentQuestion++;

    setTimeout(() => {
      loadQuestion();
    }, 800);
  }

  // =========================
  // ボス戦開始
  // =========================
  function startBossBattle() {

    phase = "boss";

    quizContainer.style.display = "none";
    bossArea.style.display = "block";

    // クイズでミス多いほど不利
    playerHP -= quizMistakes * 5;
    if (playerHP < 10) playerHP = 10;

    updateHP();
  }

  // =========================
  // ボス撃破演出
  // =========================
  function triggerFreeze() {

    freezeScreen.style.display = "block";

    freezeSound.currentTime = 0;
    freezeSound.play().catch(()=>{});

    // 3秒後プチュン
    setTimeout(()=>{
      impactSound.currentTime = 0;
      impactSound.play().catch(()=>{});
    },3000);

    // 合計6秒後復帰
    setTimeout(()=>{
      freezeScreen.style.display = "none";
      alert("WORLD1 CLEAR");
      location.reload();
    },6000);
  }

  // =========================
  // 仮ボス攻撃（タップで削る）
  // =========================
  bossArea.addEventListener("click", function(){

    if (phase !== "boss") return;

    bossHP -= 20;
    if (bossHP < 0) bossHP = 0;

    updateHP();

    if (bossHP === 0) {
      triggerFreeze();
    }
  });

  // =========================
  // 初期化
  // =========================
  updateHP();
  loadQuestion();

});
