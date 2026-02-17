import { state } from "./core/state.js";
import { createDevice } from "./ui/device.js";

const workspace = document.getElementById("workspace");
const paletteItems = document.querySelectorAll(".palette-item");
const setBtn = document.getElementById("setBtn");

let draggingDevice = null;
let offsetX = 0;
let offsetY = 0;

const MARGIN = 20;

/* =========================
   パレット → デバイス生成
========================= */
paletteItems.forEach(item => {
  item.addEventListener("click", () => {
    const type = item.dataset.type;
    const device = createDevice(type);

    device.style.left = "100px";
    device.style.top = "100px";

    workspace.appendChild(device);

    state.devices.push({
      id: device.dataset.id,
      type,
      x: 100,
      y: 100
    });
  });
});

/* =========================
   ドラッグ処理（スマホ対応）
========================= */
workspace.addEventListener("pointerdown", (e) => {
  const target = e.target.closest(".device");
  if (!target) return;

  draggingDevice = target;

  const rect = target.getBoundingClientRect();
  offsetX = e.clientX - rect.left;
  offsetY = e.clientY - rect.top;

  target.setPointerCapture(e.pointerId);
});

workspace.addEventListener("pointermove", (e) => {
  if (!draggingDevice) return;

  const x = e.clientX - offsetX;
  const y = e.clientY - offsetY;

  draggingDevice.style.left = x + "px";
  draggingDevice.style.top = y + "px";
});

workspace.addEventListener("pointerup", () => {
  draggingDevice = null;
});

/* =========================
   セットボタン
========================= */
setBtn.addEventListener("click", () => {
  alert("セット完了（仮）");
});
