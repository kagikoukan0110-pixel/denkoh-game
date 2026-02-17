const workspace = document.getElementById("workspace");
const wireLayer = document.getElementById("wireLayer");
const breakerBtn = document.getElementById("breakerBtn");
const result = document.getElementById("result");

let wires = [];
let terminals = {};
let breakerOn = false;

function createDevice(id, label, x, y) {
  const el = document.createElement("div");
  el.className = "device";
  el.style.left = x + "px";
  el.style.top = y + "px";
  el.innerText = label;
  workspace.appendChild(el);
  return el;
}

function createTerminal(device, name, dx, dy) {
  const t = document.createElement("div");
  t.className = "terminal";
  t.innerText = name;
  t.style.left = dx + "px";
  t.style.top = dy + "px";
  device.appendChild(t);
  terminals[device.innerText + "-" + name] = t;
  t.dataset.key = device.innerText + "-" + name;
  t.addEventListener("click", () => selectTerminal(t));
}

let selected = null;

function selectTerminal(t) {
  if (!selected) {
    selected = t;
    return;
  }
  drawWire(selected, t);
  selected = null;
}

function drawWire(a, b) {
  const line = document.createElementNS("http://www.w3.org/2000/svg","line");
  const rectA = a.getBoundingClientRect();
  const rectB = b.getBoundingClientRect();
  const rectW = workspace.getBoundingClientRect();

  line.setAttribute("x1", rectA.left - rectW.left + 11);
  line.setAttribute("y1", rectA.top - rectW.top + 11);
  line.setAttribute("x2", rectB.left - rectW.left + 11);
  line.setAttribute("y2", rectB.top - rectW.top + 11);
  line.setAttribute("stroke","red");
  line.setAttribute("stroke-width","3");
  wireLayer.appendChild(line);

  wires.push([a.dataset.key, b.dataset.key]);
}

function buildGraph() {
  let graph = {};
  wires.forEach(([a,b])=>{
    graph[a] = graph[a] || [];
    graph[b] = graph[b] || [];
    graph[a].push(b);
    graph[b].push(a);
  });
  return graph;
}

function dfs(graph,start,visited=new Set()){
  visited.add(start);
  (graph[start]||[]).forEach(n=>{
    if(!visited.has(n)) dfs(graph,n,visited);
  });
  return visited;
}

function checkClear() {
  if (!breakerOn) return;
  const graph = buildGraph();
  const powered = dfs(graph,"電源-L");
  if (powered.has("ランプ-L") && powered.has("ランプ-N")) {
    result.classList.remove("hidden");
  }
}

breakerBtn.onclick = ()=>{
  breakerOn = !breakerOn;
  checkClear();
};

function init() {
  const power = createDevice("power","電源",40,300);
  createTerminal(power,"L",80,15);
  createTerminal(power,"N",80,40);

  const sw1 = createDevice("sw1","三路",170,300);
  createTerminal(sw1,"0",-11,25);
  createTerminal(sw1,"1",89,5);
  createTerminal(sw1,"3",89,45);

  const sw2 = createDevice("sw2","三路",310,300);
  createTerminal(sw2,"0",-11,25);
  createTerminal(sw2,"1",89,5);
  createTerminal(sw2,"3",89,45);

  const lamp = createDevice("lamp","ランプ",450,300);
  createTerminal(lamp,"L",-11,25);
  createTerminal(lamp,"N",89,25);
}

init();
