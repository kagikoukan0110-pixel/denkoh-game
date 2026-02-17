/* ===============================
   俺らの電工 β
   main.js 完全版
================================= */

const workspace = document.getElementById("workspace");
const wireLayer = document.getElementById("wireLayer");

/* ===============================
   状態管理
================================= */

let devices = [];
let wires = [];
let selectedTerminal = null;

/* ===============================
   ステージ1-1（β固定）
================================= */

function loadStage11() {
  workspace.innerHTML = `<svg id="wireLayer"></svg>`;
  wireLayer = document.getElementById("wireLayer");

  devices = [
    {
      id: "power",
      type: "power",
      label: "電源",
      x: 80,
      y: 180,
      terminals: ["L"]
    },
    {
      id: "sw1",
      type: "threeway",
      label: "三路",
      x: 300,
      y: 150,
      terminals: ["COM", "T1", "T2"]
    },
    {
      id: "sw2",
      type: "threeway",
      label: "三路",
      x: 520,
      y: 150,
      terminals: ["COM", "T1", "T2"]
    },
    {
      id: "lamp",
      type: "lamp",
      label: "ランプ",
      x: 740,
      y: 180,
      terminals: ["L"]
    }
  ];

  wires = [];
  renderDevices();
}

/* ===============================
   デバイス描画
================================= */

function renderDevices() {
  devices.forEach(device => {
    const el = document.createElement("div");
    el.className = "device";
    el.innerText = device.label;
    el.style.left = device.x + "px";
    el.style.top = device.y + "px";
    el.dataset.id = device.id;

    workspace.appendChild(el);

    // 端子描画
    device.terminals.forEach((t, index) => {
      const terminal = document.createElement("div");
      terminal.className = "terminal";
      terminal.dataset.device = device.id;
      terminal.dataset.terminal = t;

      terminal.style.left = device.x + 60 + "px";
      terminal.style.top =
        device.y + 20 + index * 20 + "px";

      terminal.addEventListener("click", () =>
        handleTerminalClick(device.id, t)
      );

      workspace.appendChild(terminal);
    });
  });
}

/* ===============================
   接続制御
================================= */

function handleTerminalClick(deviceId, terminalName) {
  const clicked = { deviceId, terminalName };

  if (!selectedTerminal) {
    selectedTerminal = clicked;
    return;
  }

  // 同一デバイス禁止
  if (selectedTerminal.deviceId === deviceId) {
    selectedTerminal = null;
    return;
  }

  // 接続ルール制限
  if (!isValidConnection(selectedTerminal, clicked)) {
    selectedTerminal = null;
    return;
  }

  createWire(selectedTerminal, clicked);
  selectedTerminal = null;
}

/* ===============================
   接続ルール
================================= */

function isValidConnection(a, b) {
  const da = devices.find(d => d.id === a.deviceId);
  const db = devices.find(d => d.id === b.deviceId);

  // 電源は三路COMにのみ接続可
  if (da.type === "power") {
    return db.type === "threeway" && b.terminalName === "COM";
  }
  if (db.type === "power") {
    return da.type === "threeway" && a.terminalName === "COM";
  }

  // 三路同士はT1-T1、T2-T2のみ可
  if (da.type === "threeway" && db.type === "threeway") {
    return (
      a.terminalName === b.terminalName &&
      (a.terminalName === "T1" || a.terminalName === "T2")
    );
  }

  // 三路COM → ランプ
  if (
    (da.type === "threeway" && a.terminalName === "COM" && db.type === "lamp") ||
    (db.type === "threeway" && b.terminalName === "COM" && da.type === "lamp")
  ) {
    return true;
  }

  return false;
}

/* ===============================
   配線描画
================================= */

function createWire(a, b) {
  const line = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "line"
  );

  const elA = getTerminalPosition(a);
  const elB = getTerminalPosition(b);

  line.setAttribute("x1", elA.x);
  line.setAttribute("y1", elA.y);
  line.setAttribute("x2", elB.x);
  line.setAttribute("y2", elB.y);
  line.setAttribute("stroke", "#ff3b3b");
  line.setAttribute("stroke-width", "3");

  wireLayer.appendChild(line);
}

function getTerminalPosition(t) {
  const terminals = document.querySelectorAll(".terminal");
  for (let el of terminals) {
    if (
      el.dataset.device === t.deviceId &&
      el.dataset.terminal === t.terminalName
    ) {
      const rect = el.getBoundingClientRect();
      const wsRect = workspace.getBoundingClientRect();
      return {
        x: rect.left - wsRect.left + 5,
        y: rect.top - wsRect.top + 5
      };
    }
  }
}

/* ===============================
   初期化
================================= */

loadStage11();
