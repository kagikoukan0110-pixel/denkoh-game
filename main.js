const svg = document.getElementById("board");
const devicesLayer = document.getElementById("devices");
const wireLayer = document.getElementById("wireLayer");
const bundleLayer = document.getElementById("bundleLayer");
const setBtn = document.getElementById("setBtn");
const overlay = document.getElementById("overlay");

let selected = null;
let connections = [];
let switchOn = false;
let lampOn = false;

const terminals = {};
const bundles = {};
let bundleIdCounter = 0;

/* ============================
   固定デバイス描画
============================ */

function createTerminal(id, x, y) {
  const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  c.setAttribute("cx", x);
  c.setAttribute("cy", y);
  c.setAttribute("r", 20);
  c.setAttribute("class", "terminal");
  c.dataset.id = id;

  c.addEventListener("click", () => handleTerminalClick(id, c));
  svg.appendChild(c);

  terminals[id] = { x, y, element: c };
}

function drawDevices() {

  // 電源
  createTerminal("power-L", 300, 200);
  createTerminal("power-N", 700, 200);

  // JB 4端子
  createTerminal("jb-1", 350, 600);
  createTerminal("jb-2", 650, 600);
  createTerminal("jb-3", 350, 800);
  createTerminal("jb-4", 650, 800);

  // 片切
  createTerminal("switch-IN", 300, 1100);
  createTerminal("switch-OUT", 700, 1100);

  // ランプ
  createTerminal("lamp-L", 400, 1400);
  createTerminal("lamp-N", 600, 1400);

  drawLamp();
}

function drawLamp() {
  const bulb = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  bulb.setAttribute("cx", 500);
  bulb.setAttribute("cy", 1350);
  bulb.setAttribute("r", 80);
  bulb.setAttribute("id", "lampBulb");
  svg.appendChild(bulb);

  const filament = document.createElementNS("http://www.w3.org/2000/svg", "line");
  filament.setAttribute("x1", 450);
  filament.setAttribute("y1", 1350);
  filament.setAttribute("x2", 550);
  filament.setAttribute("y2", 1350);
  filament.setAttribute("id", "filament");
  svg.appendChild(filament);
}

/* ============================
   接続処理
============================ */

function handleTerminalClick(id, el) {

  if (!selected) {
    selected = id;
    el.classList.add("active");
    return;
  }

  if (selected === id) {
    el.classList.remove("active");
    selected = null;
    return;
  }

  // JB経由必須
  if (!selected.startsWith("jb") && !id.startsWith("jb")) {
    resetSelection();
    return;
  }

  connections.push([selected, id]);
  drawWire(selected, id);

  resetSelection();
  recalc();
}

function resetSelection() {
  document.querySelectorAll(".terminal").forEach(t => t.classList.remove("active"));
  selected = null;
}

function drawWire(a, b) {
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", terminals[a].x);
  line.setAttribute("y1", terminals[a].y);
  line.setAttribute("x2", terminals[b].x);
  line.setAttribute("y2", terminals[b].y);
  line.setAttribute("class", "wire");
  wireLayer.appendChild(line);
}

/* ============================
   束計算
============================ */

function recalc() {
  calculateBundles();
  checkShort();
  checkPower();
}

function calculateBundles() {

  Object.keys(terminals).forEach(t => bundles[t] = null);
  bundleIdCounter = 0;

  connections.forEach(([a,b]) => {
    if (bundles[a] == null && bundles[b] == null) {
      const id = "b" + (++bundleIdCounter);
      bundles[a] = id;
      bundles[b] = id;
    } else if (bundles[a] && !bundles[b]) {
      bundles[b] = bundles[a];
    } else if (!bundles[a] && bundles[b]) {
      bundles[a] = bundles[b];
    } else if (bundles[a] !== bundles[b]) {
      const old = bundles[b];
      Object.keys(bundles).forEach(k => {
        if (bundles[k] === old) bundles[k] = bundles[a];
      });
    }
  });

  updateBundleDots();
}

function updateBundleDots() {
  bundleLayer.innerHTML = "";

  Object.keys(bundles).forEach(t => {
    if (!bundles[t]) return;

    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", terminals[t].x);
    dot.setAttribute("cy", terminals[t].y - 35);
    dot.setAttribute("r", 8);

    if (t === "power-L") dot.setAttribute("class", "bundle-dot bundle-L");
    else if (t === "power-N") dot.setAttribute("class", "bundle-dot bundle-N");
    else dot.setAttribute("class", "bundle-dot bundle-unknown");

    bundleLayer.appendChild(dot);
  });
}

/* ============================
   ショート検出
============================ */

function checkShort() {
  if (bundles["power-L"] && bundles["power-L"] === bundles["power-N"]) {
    alert("ショート！");
    resetAll();
  }
}

function resetAll() {
  connections = [];
  wireLayer.innerHTML = "";
  bundleLayer.innerHTML = "";
  lampOff();
}

/* ============================
   通電判定
============================ */

function checkPower() {

  if (!bundles["power-L"]) return lampOff();

  const lBundle = bundles["power-L"];
  const nBundle = bundles["power-N"];

  if (!lBundle || !nBundle) return lampOff();

  // スイッチ内部接続
  if (switchOn && bundles["switch-IN"]) {
    if (bundles["switch-IN"] === lBundle) {
      bundles["switch-OUT"] = lBundle;
    }
  }

  if (bundles["lamp-L"] === lBundle &&
      bundles["lamp-N"] === nBundle) {

    lampOnState();
  } else {
    lampOff();
  }
}

function lampOnState() {
  if (lampOn) return;
  lampOn = true;
  document.getElementById("lampBulb").classList.add("on");
  document.getElementById("filament").classList.add("on");
  setBtn.classList.add("active");
}

function lampOff() {
  lampOn = false;
  document.getElementById("lampBulb").classList.remove("on");
  document.getElementById("filament").classList.remove("on");
  setBtn.classList.remove("active");
}

/* ============================
   スイッチ
============================ */

svg.addEventListener("dblclick", () => {
  switchOn = !switchOn;
  recalc();
});

/* ============================
   SET処理
============================ */

setBtn.addEventListener("click", () => {
  if (!lampOn) return;

  overlay.classList.remove("hidden");
  setTimeout(() => {
    overlay.classList.add("hidden");
    alert("称号昇格！");
  }, 1500);
});

/* ============================ */

drawDevices();
