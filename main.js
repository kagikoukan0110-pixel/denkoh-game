import { state } from "./core/state.js";
import { buildCircuitGraph } from "./engine/circuitEngine.js";
import { calculateScore } from "./engine/scoring.js";

/* ================================
   DOM取得
================================ */

const workspace = document.getElementById("workspace");
const paletteItems = document.querySelectorAll(".palette-item");
const setBtn = document.getElementById("setBtn");
const freezeOverlay = document.getElementById("freezeOverlay");
const bossBanner = document.getElementById("bossBanner");

let dragging = null;
let offsetX = 0;
let offsetY = 0;
let selectedTerminal = null;

/* ================================
   パレット → デバイス生成
================================ */

paletteItems.forEach(item => {
  item.addEventListener("click", () => {
    const type = item.dataset.type;
    createDevice(type);
  });
});

function createDevice(type) {
  const el = document.createElement("div");
  el.className = "device";
  el.dataset.type = type;
  el.dataset.id = crypto.randomUUID();

  if (type === "lamp") {
    el.classList.add("lamp");
    el.textContent = "ランプ";
  } else if (type === "switch-left") {
    el.textContent = "三路 左0";
    el.dataset.position = "left";
    el.dataset.mode = "0";
  } else if (type === "switch-right") {
    el.textContent = "三路 右0";
    el.dataset.position = "right";
    el.dataset.mode = "0";
  } else if (type === "power") {
    el.textContent = "電源";
  }

  el.style.left = "100px";
  el.style.top = "100px";

  workspace.appendChild(el);
  state.devices.push(el);

  attachDeviceEvents(el);
}

/* ================================
   デバイス操作
================================ */

function attachDeviceEvents(device) {

  /* ドラッグ開始 */
  device.addEventListener("pointerdown", e => {
    dragging = device;
    const rect = device.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    device.setPointerCapture(e.pointerId);
  });

  /* 三路スイッチ切替 */
  device.addEventListener("dblclick", () => {
    if (!device.dataset.position) return;

    device.dataset.mode = device.dataset.mode === "0" ? "1" : "0";

    if (device.dataset.position === "left") {
      device.textContent = device.dataset.mode === "0" ? "三路 左0" : "三路 左1";
    } else {
      device.textContent = device.dataset.mode === "0" ? "三路 右0" : "三路 右1";
    }

    updateCircuit();
  });

  /* 端子クリック（簡易：デバイス中央同士接続） */
  device.addEventListener("click", e => {
    if (e.detail > 1) return; // ダブルクリック除外

    if (!selectedTerminal) {
      selectedTerminal = device;
      device.classList.add("active");
    } else if (selectedTerminal !== device) {
      createWire(selectedTerminal, device);
      selectedTerminal.classList.remove("active");
      selectedTerminal = null;
      updateCircuit();
    }
  });
}

/* ================================
   ドラッグ処理
================================ */

workspace.addEventListener("pointermove", e => {
  if (!dragging) return;

  dragging.style.left = e.clientX - offsetX + "px";
  dragging.style.top = e.clientY - offsetY + "px";

  redrawWires();
});

workspace.addEventListener("pointerup", () => {
  dragging = null;
});

/* ================================
   ワイヤー処理
================================ */

const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
svg.id = "wires";
svg.setAttribute("width", "100%");
svg.setAttribute("height", "100%");
workspace.appendChild(svg);

function createWire(a, b) {
  state.wires.push({ from: a.dataset.id, to: b.dataset.id });
  redrawWires();
}

function redrawWires() {
  svg.innerHTML = "";

  state.wires.forEach(wire => {
    const a = state.devices.find(d => d.dataset.id === wire.from);
    const b = state.devices.find(d => d.dataset.id === wire.to);

    if (!a || !b) return;

    const rectA = a.getBoundingClientRect();
    const rectB = b.getBoundingClientRect();
    const wsRect = workspace.getBoundingClientRect();

    const x1 = rectA.left - wsRect.left + rectA.width / 2;
    const y1 = rectA.top - wsRect.top + rectA.height / 2;
    const x2 = rectB.left - wsRect.left + rectB.width / 2;
    const y2 = rectB.top - wsRect.top + rectB.height / 2;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    line.setAttribute("class", "wire-line");

    svg.appendChild(line);
  });
}

/* ================================
   回路更新
================================ */

function updateCircuit() {
  const graph = buildCircuitGraph(state.devices, state.wires);

  state.devices.forEach(device => {
    if (device.dataset.type === "lamp") {
      const isOn = graph.powered?.includes(device.dataset.id);
      device.classList.toggle("on", isOn);

      if (isOn) triggerFreeze();
    }
  });
}

/* ================================
   プチュン演出
================================ */

function triggerFreeze() {
  freezeOverlay.classList.add("active");

  setTimeout(() => {
    freezeOverlay.classList.remove("active");
  }, 200);
}

/* ================================
   セットボタン
================================ */

setBtn.addEventListener("click", () => {
  const score = calculateScore(state);
  console.log("Score:", score);

  if (score >= 100) {
    triggerBoss();
  }
});

/* ================================
   ボス演出
================================ */

function triggerBoss() {
  bossBanner.classList.add("active");

  setTimeout(() => {
    bossBanner.classList.remove("active");
  }, 2000);
}
