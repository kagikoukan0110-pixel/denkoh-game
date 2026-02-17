const workspace = document.getElementById("workspace");
const wireLayer = document.getElementById("wireLayer");

let devices = [];
let wires = [];
let selectedDevice = null;

/* ==========================
   デバイス生成
========================== */

function createDevice(id, label, type, x, y) {

  const div = document.createElement("div");
  div.className = "device";
  div.innerText = label;
  div.style.left = x + "px";
  div.style.top = y + "px";
  div.dataset.id = id;
  div.dataset.type = type;

  workspace.appendChild(div);

  devices.push({ id, type, x, y });

  div.addEventListener("click", () => {
    handleDeviceClick(id, div);
  });
}

/* ==========================
   接続ロジック制限
========================== */

function canConnect(a, b) {

  const A = devices.find(d => d.id === a);
  const B = devices.find(d => d.id === b);

  if (!A || !B) return false;

  // 同じものは不可
  if (A.id === B.id) return false;

  // 電源→三路右 直結禁止
  if (A.type === "power" && B.id === "sw2") return false;
  if (B.type === "power" && A.id === "sw2") return false;

  return true;
}

/* ==========================
   クリック処理
========================== */

function handleDeviceClick(id, element) {

  if (!selectedDevice) {
    selectedDevice = id;
    element.style.background = "#ffd54f";
  } else {

    if (canConnect(selectedDevice, id)) {
      createWire(selectedDevice, id);
    }

    resetDeviceColors();
    selectedDevice = null;
  }
}

function resetDeviceColors() {
  document.querySelectorAll(".device").forEach(d=>{
    d.style.background="#e0e0e0";
  });
}

/* ==========================
   配線描画
========================== */

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
  line.setAttribute("stroke", "#ff3b3b");
  line.setAttribute("stroke-width", "4");

  wireLayer.appendChild(line);
  wires.push({fromId,toId});
}

/* ==========================
   ステージ1-1固定
========================== */

function loadStage() {

  // 少し左に寄せて全体見えるように
  createDevice("power","電源","power",80,250);
  createDevice("sw1","三路","switch",350,200);
  createDevice("sw2","三路","switch",600,200);
  createDevice("lamp","ランプ","lamp",850,250);

}

loadStage();
