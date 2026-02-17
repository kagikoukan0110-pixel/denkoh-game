import { state } from "./core/state.js";
import { createDevice } from "./ui/device.js";
import { setupBoard } from "./ui/board.js";
import { setupInteraction } from "./ui/interaction.js";
import { buildCircuitGraph } from "./engine/circuitEngine.js";
import { calculateScore } from "./engine/scoring.js";

const workspace = document.getElementById("workspace");
const paletteItems = document.querySelectorAll(".palette-item");
const setBtn = document.getElementById("setBtn");

setupBoard(workspace);
setupInteraction(workspace);

/* パレット → 生成 */
paletteItems.forEach(item=>{
  item.addEventListener("click",()=>{

    const type = item.dataset.type;
    const device = createDevice(type);

    workspace.appendChild(device);
    state.devices.push(device);
  });
});

/* セット */
setBtn.addEventListener("click",()=>{

  const graph = buildCircuitGraph(state.devices);
  const score = calculateScore(graph);

  alert("セット完了\nスコア:" + score);
});
