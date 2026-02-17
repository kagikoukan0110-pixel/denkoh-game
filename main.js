const workspace = document.getElementById("workspace");
const wireLayer = document.getElementById("wireLayer");

let selectedTerminal = null;
let wires = [];

/* ==========================
   デバイス定義
========================== */

const devices = [
  {
    id: "power",
    label: "電源",
    x: 80,
    y: 250,
    terminals: ["L", "N"]
  },
  {
    id: "sw1",
    label: "三路",
    x: 350,
    y: 200,
    terminals: ["0", "1", "3"]
  },
  {
    id: "sw2",
    label: "三路",
    x: 600,
    y: 200,
    terminals: ["0", "1", "3"]
  },
  {
    id: "lamp",
    label: "ランプ",
    x: 850,
    y: 250,
    terminals: ["L", "N"]
  }
];

/* ==========================
   描画
========================== */

function renderDevices() {

  devices.forEach(device => {

    const div = document.createElement("div");
    div.className = "device";
    div.style.left = device.x + "px";
    div.style.top = device.y + "px";
    div.innerText = device.label;

    workspace.appendChild(div);

    // 端子描画
    device.terminals.forEach((t, index) => {

      const terminal = document.createElement("div");
      terminal.className = "terminal";
      terminal.innerText = t;

      const offset = index * 30;

      terminal.style.left = device.x + 10 + "px";
      terminal.style.top = device.y + 60 + offset + "px";

      terminal.dataset.id = device.id + "_" + t;

      workspace.appendChild(terminal);

      terminal.addEventListener("click", () => {
        handleTerminalClick(terminal);
      });

    });

  });

}

/* ==========================
   端子クリック
========================== */

function handleTerminalClick(terminal) {

  if (!selectedTerminal) {

    selectedTerminal = terminal;
    terminal.style.background = "#ffd54f";

  } else {

    if (selectedTerminal !== terminal) {
      createWire(selectedTerminal, terminal);
    }

    selectedTerminal.style.background = "#fff";
    selectedTerminal = null;
  }
}

/* ==========================
   配線描画
========================== */

function createWire(t1, t2) {

  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");

  const r1 = t1.getBoundingClientRect();
  const r2 = t2.getBoundingClientRect();

  const wsRect = workspace.getBoundingClientRect();

  const x1 = r1.left - wsRect.left + r1.width / 2;
  const y1 = r1.top - wsRect.top + r1.height / 2;

  const x2 = r2.left - wsRect.left + r2.width / 2;
  const y2 = r2.top - wsRect.top + r2.height / 2;

  line.setAttribute("x1", x1);
  line.setAttribute("y1", y1);
  line.setAttribute("x2", x2);
  line.setAttribute("y2", y2);
  line.setAttribute("stroke", "#ff3b3b");
  line.setAttribute("stroke-width", "4");

  wireLayer.appendChild(line);

  wires.push({
    from: t1.dataset.id,
    to: t2.dataset.id
  });
}

/* ==========================
   初期化
========================== */

renderDevices();
