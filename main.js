const workspace = document.getElementById("workspace");
const wireLayer = document.getElementById("wireLayer");

let devices = [];
let wires = [];

let selectedTerminal = null;

/* ===== デバイス生成 ===== */

function createDevice(id, label, x, y, terminals) {
  const div = document.createElement("div");
  div.className = "device";
  div.innerText = label;
  div.style.left = x + "px";
  div.style.top = y + "px";
  div.dataset.id = id;

  workspace.appendChild(div);

  devices.push({ id, x, y, terminals });

  div.addEventListener("click", () => {
    if (!selectedTerminal) {
      selectedTerminal = id;
      div.style.background = "#ffd54f";
    } else {
      if (selectedTerminal !== id) {
        createWire(selectedTerminal, id);
      }
      resetDeviceColors();
      selectedTerminal = null;
    }
  });
}

function resetDeviceColors() {
  document.querySelectorAll(".device").forEach(d=>{
    d.style.background="#e0e0e0";
  });
}

/* ===== 配線描画 ===== */

function createWire(fromId, toId) {
  const from = devices.find(d => d.id === fromId);
  const to = devices.find(d => d.id === toId);

  const line = document.createElementNS("http://www.w3.org/2000/svg","line");

  const x1 = from.x + 40;
  const y1 = from.y + 30;
  const x2 = to.x + 40;
  const y2 = to.y + 30;

  line.setAttribute("x1", x1);
  line.setAttribute("y1", y1);
  line.setAttribute("x2", x2);
  line.setAttribute("y2", y2);
  line.setAttribute("stroke", "#4da3ff");
  line.setAttribute("stroke-width", "4");

  wireLayer.appendChild(line);
  wires.push({fromId,toId});
}

/* ===== ステージ1-1固定 ===== */

function loadStage() {

  createDevice("power","電源",80,250);
  createDevice("sw1","三路 左0",350,200);
  createDevice("sw2","三路 右0",600,200);
  createDevice("lamp","ランプ",850,250);

}

loadStage();
