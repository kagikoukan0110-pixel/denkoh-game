import { state } from "./core/state.js";
import { createDevice } from "./ui/deviceFactory.js";

const workspace = document.getElementById("workspace");
const board = document.getElementById("board");
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

  if(!isOverlapping(draggingDevice,x,y)){
    draggingDevice.x = x;
    draggingDevice.y = y;
    draggingDevice.group.setAttribute("transform",`translate(${x},${y})`);
  }

});

/* ドロップ */
window.addEventListener("pointerup",()=>{
  draggingDevice = null;
});

/* セット */
setBtn.addEventListener("click",()=>{

  state.mode = "wiring";

  state.devices.forEach(d=>{
    d.locked = true;
  });

  alert("施工モード開始（端子は次ステップ）");
});

/* 重なり判定 */
function isOverlapping(dev,newX,newY){

  return state.devices.some(other=>{

    if(other.id === dev.id) return false;

    return !(
      newX + dev.width < other.x ||
      newX > other.x + other.width ||
      newY + dev.height < other.y ||
      newY > other.y + other.height
    );
  });

}
