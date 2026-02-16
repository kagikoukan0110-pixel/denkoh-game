import { initBoard } from "./ui/board.js";
import { setupInteraction } from "./ui/interaction.js";
import { Graph } from "./engine/graph.js";
import { Scoring } from "./engine/scoring.js";

alert("STEP4 OK");

const graph = new Graph();
const scoring = new Scoring(graph);

initBoard();
setupInteraction(graph, scoring);
