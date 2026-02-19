// =============================
// 要素取得
// =============================

const svg = document.getElementById("board");
const devicesLayer = document.getElementById("devices");
const wireLayer = document.getElementById("wireLayer");
const bundleLayer = document.getElementById("bundleLayer");
const setBtn = document.getElementById("setBtn");
const overlay = document.getElementById("overlay");

// =============================
// 状態管理
// =============================

let selected = null;
let connections = [];
let switchOn = false;
let lampOn = false;

const terminals = {};
const bundles = {};
let bundleIdCounter = 0;

// =============================
// 初期化
// =============================

// overlayは必ず非表示スタート
overlay.style.display = "none";

// =============================
// 端子クリック処理
// =============================

function selectTerminal(el) {

  if (!selected) {
    selected = el;
    el.classList.add("selected");
    return;
  }

  if (selected === el) {
    selected.classList.remove("selected");
    selected = null;
    return;
  }

  createWire(selected, el);

  selected.classList.remove("selected");
  selected = null;
}

// =============================
// 線生成
// =============================

function createWire(t1, t2) {

  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");

  const r1 = t1.getBoundingClientRect();
  const r2 = t2.getBoundingClientRect();

  const x1 = r1.left + r1.width / 2 + window.scrollX;
  const y1 = r1.top + r1.height / 2 + window.scrollY;

  const x2 = r2.left + r2.width / 2 + window.scrollX;
  const y2 = r2.top + r2.height / 2 + window.scrollY;

  line.setAttribute("x1", x1);
  line.setAttribute("y1", y1);
  line.setAttribute("x2", x2);
  line.setAttribute("y2", y2);

  line.setAttribute("stroke", "yellow");
  line.setAttribute("stroke-width", "4");

  wireLayer.appendChild(line);

  connections.push({
    from: t1.dataset.id,
    to: t2.dataset.id
  });
}

// =============================
// 通電判定（SETでのみ実行）
// =============================

function checkPower() {

  lampOn = false;

  const hasPowerToSwitch = connections.some(c =>
    (c.from === "powerL" && c.to === "switchIn") ||
    (c.from === "switchIn" && c.to === "powerL")
  );

  const hasSwitchToLamp = connections.some(c =>
    (c.from === "switchOut" && c.to === "lampL") ||
    (c.from === "lampL" && c.to === "switchOut")
  );

  const hasNeutral = connections.some(c =>
    (c.from === "powerN" && c.to === "lampN") ||
    (c.from === "lampN" && c.to === "powerN")
  );

  if (hasPowerToSwitch && hasSwitchToLamp && hasNeutral) {
    lampOn = true;
  }

  if (lampOn) {
    overlay.style.display = "flex";
  } else {
    overlay.style.display = "none";
  }
}

// =============================
// SETボタン
// =============================

setBtn.addEventListener("click", () => {
  checkPower();
});

// =============================
// 端子登録
// =============================

function registerTerminals() {

  document.querySelectorAll(".terminal").forEach(el => {

    terminals[el.dataset.id] = el;

    el.addEventListener("click", () => {
      selectTerminal(el);
    });
  });
}

registerTerminals();
