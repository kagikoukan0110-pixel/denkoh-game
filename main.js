import { initBoard } from "./ui/board.js";
import { setupInteraction } from "./ui/interaction.js";
import { Graph } from "./engine/graph.js";

alert("STEP3 OK");

const graph = new Graph();

initBoard();
setupInteraction(graph, {});
