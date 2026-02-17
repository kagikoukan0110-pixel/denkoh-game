import { state } from "../core/state.js";

export function loadStage(stage){

  state.devices = [];
  state.wires = [];

  const workspace = document.getElementById("workspace");
  workspace.innerHTML = "";

  stage.devices.forEach((d,i)=>{

    const div = document.createElement("div");
    div.classList.add("device");
    div.innerText = d.type;
    div.dataset.id = d.id;

    div.style.left = (100 + i*150) + "px";
    div.style.top = "200px";

    workspace.appendChild(div);

    state.devices.push(d);
  });

  state.currentStage = stage;
}
