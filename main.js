import { generateStage } from "./engine/stageGenerator.js";
import { loadStage } from "./ui/board.js";
import { setupInteraction } from "./ui/interaction.js";
import { state } from "./core/state.js";

window.startStage = function(level){

  const stage = generateStage(level);
  loadStage(stage);
};

document.addEventListener("DOMContentLoaded",()=>{

  setupInteraction();
  startStage(state.level);

});
