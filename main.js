alert("MAIN LOADED");
import { state } from "./core/state.js";
import { createDevice } from "./ui/deviceFactory.js";

const workspace = document.getElementById("workspace");
const paletteItems = document.querySelectorAll(".item");
const setBtn = document.getElementById("setBtn");

let draggingDevice = null;
let offsetX = 0;
let offsetY = 0;

const MARGIN = 20;

/* パレットから生成 */
paletteItems.forEach(item=>{
  item.addEventListener("pointerdown",(e)=>{

    if(state.mode !== "placement") return;

    const rect = workspace.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    draggingDevice = createDevice(item.dataset.type,x,y);

    offsetX = 35;
    offsetY = 50;

  });
});

/* ドラッグ移動 */
workspace.addEventListener("pointermove",(e)=>{

  if(!draggingDevice) return;
  if(draggingDevice.locked) return;

  const rect = workspace.getBoundingClientRect();

  let x = e.clientX - rect.left - offsetX;
  let y = e.clientY - rect.top - offsetY;

  const maxX = rect.width - draggingDevice.width - MARGIN;
  const maxY = rect.height - draggingDevice.height - MARGIN;

  x = Math.max(MARGIN, Math.min(x,maxX));
  y = Math.max(MARGIN, Math.min(y,maxY));

  draggingDevice.x = x;
  draggingDevice.y = y;
  draggingDevice.group.setAttribute("transform",`translate(${x},${y})`);

});

window.addEventListener("pointerup",()=>{
  draggingDevice = null;
});

setBtn.addEventListener("click",()=>{
  state.mode = "wiring";
  state.devices.forEach(d=> d.locked = true);
  alert("施工モード開始");
});
