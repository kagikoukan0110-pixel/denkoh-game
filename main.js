/* =========================================
   俺らの電工 β ver 0.5
   固定ステージ版（1-1）
========================================= */

const workspace = document.getElementById("workspace");

const state = {
  devices: [],
  wires: []
};

let selectedDevice = null;

/* =========================================
   初期ステージ読み込み（固定）
========================================= */

function loadBetaStage() {

  workspace.innerHTML = "";
  state.devices = [];
  state.wires = [];

  // SVGレイヤー作成
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.id = "wireLayer";
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  workspace.appendChild(svg);

  // 固定配置
  createDevice("power", 80, 220);
  createDevice("switch-left", 300, 180);
  createDevice("switch-right", 500, 180);
  createDevice("lamp", 720, 220);
}

/* =========================================
   デバイス生成（固定座標）
========================================= */

function createDevice(type, x, y) {

  const el = document.createElement("div");
  el.className = "device";
  el.dataset.type = type;
  el.dataset.id = crypto.randomUUID();

  if (type === "power") {
    el.textContent = "電源";
  }

  if (type === "switch-left") {
    el.textContent = "三路 左0";
    el.dataset.position = "left";
    el.dataset.mode = "0";
  }

  if (type === "switch-right") {
    el.textContent = "三路 右0";
    el.dataset.position = "right";
    el.dataset.mode = "0";
  }

  if (type === "lamp") {
    el.textContent = "ランプ";
    el.classList.add("lamp");
  }

  el.style.position = "absolute";
  el.style.left = x + "px";
  el.style.top = y + "px";

  workspace.appendChild(el);
  state.devices.push(el);

  attachEvents(el);
}

/* =========================================
   デバイスイベント
========================================= */

function attachEvents(device) {

  // 三路スイッチ切替（ダブルクリック）
  device.addEventListener("dblclick", () => {

    if (!device.dataset.position) return;

    device.dataset.mode =
      device.dataset.mode === "0" ? "1" : "0";

    if (device.dataset.position === "left") {
      device.textContent =
        device.dataset.mode === "0"
          ? "三路 左0"
          : "三路 左1";
    } else {
      device.textContent =
        device.dataset.mode === "0"
          ? "三路 右0"
          : "三路 右1";
    }

    updateCircuit();
  });

  // 配線クリック
  device.addEventListener("click", () => {

    if (!selectedDevice) {
      selectedDevice = device;
      device.classList.add("active");
      return;
    }

    if (selectedDevice === device) {
      selectedDevice.classList.remove("active");
      selectedDevice = null;
      return;
    }

    createWire(selectedDevice, device);
    selectedDevice.classList.remove("active");
    selectedDevice = null;

    updateCircuit();
  });
}

/* =========================================
   ワイヤー処理
========================================= */

function createWire(a, b) {

  // 二重接続防止
  const exists = state.wires.find(w =>
    (w.from === a.dataset.id && w.to === b.dataset.id) ||
    (w.from === b.dataset.id && w.to === a.dataset.id)
  );

  if (exists) return;

  state.wires.push({
    from: a.dataset.id,
    to: b.dataset.id
  });

  redrawWires();
}

function redrawWires() {

  const svg = document.getElementById("wireLayer");
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
    line.setAttribute("stroke", "#ff3b3b");
    line.setAttribute("stroke-width", "4");
    line.setAttribute("stroke-linecap", "round");

    svg.appendChild(line);
  });
}

/* =========================================
   回路判定（簡易版β）
========================================= */

function updateCircuit() {

  const lamp = state.devices.find(d => d.dataset.type === "lamp");
  const power = state.devices.find(d => d.dataset.type === "power");

  if (!lamp || !power) return;

  const connected = state.wires.some(w =>
    (w.from === power.dataset.id && w.to === lamp.dataset.id) ||
    (w.from === lamp.dataset.id && w.to === power.dataset.id)
  );

  if (connected) {
    lamp.classList.add("on");
  } else {
    lamp.classList.remove("on");
  }
}

/* =========================================
   起動
========================================= */

loadBetaStage();
