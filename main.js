const workspace = document.getElementById("workspace");
const wireLayer = document.getElementById("wireLayer");

let sw1 = 1;
let sw2 = 3;

let selected = null;
let wires = [];

// ===============================
// 端子クリック
// ===============================

function terminalClick(device, terminal, element) {

    if (!selected) {
        selected = { device, terminal, element };
        element.style.background = "yellow";
        return;
    }

    if (selected.element === element) {
        element.style.background = "#21a8d8";
        selected = null;
        return;
    }

    const wire = drawWire(selected.element, element);

    wires.push({
        a: selected.device + "-" + selected.terminal,
        b: device + "-" + terminal,
        svg: wire
    });

    selected.element.style.background = "#21a8d8";
    selected = null;

    checkPower();
}

// ===============================
// 折れ線描画
// ===============================

function drawWire(el1, el2) {

    const r1 = el1.getBoundingClientRect();
    const r2 = el2.getBoundingClientRect();
    const base = workspace.getBoundingClientRect();

    const x1 = r1.left - base.left + r1.width/2;
    const y1 = r1.top - base.top + r1.height/2;
    const x2 = r2.left - base.left + r2.width/2;
    const y2 = r2.top - base.top + r2.height/2;

    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    poly.setAttribute("points", `${x1},${y1} ${x2},${y1} ${x2},${y2}`);
    poly.setAttribute("fill", "none");
    poly.setAttribute("stroke", "#222");
    poly.setAttribute("stroke-width", "4");

    wireLayer.appendChild(poly);
    return poly;
}

// ===============================
// 三路切替
// ===============================

function toggleSwitch1() {
    sw1 = (sw1 === 1) ? 3 : 1;
    document.getElementById("sw1").classList.toggle("switch-on");
    checkPower();
}

function toggleSwitch2() {
    sw2 = (sw2 === 1) ? 3 : 1;
    document.getElementById("sw2").classList.toggle("switch-on");
    checkPower();
}

// ===============================
// グラフ生成
// ===============================

function buildGraph() {

    let graph = {};

    function connect(a, b) {
        if (!graph[a]) graph[a] = [];
        if (!graph[b]) graph[b] = [];
        graph[a].push(b);
        graph[b].push(a);
    }

    wires.forEach(w => connect(w.a, w.b));

    connect("三路1-0", "三路1-" + sw1);
    connect("三路2-0", "三路2-" + sw2);

    return graph;
}

// ===============================
// DFS探索
// ===============================

function dfs(graph, start) {
    let visited = new Set();
    let stack = [start];

    while (stack.length) {
        const node = stack.pop();
        if (!visited.has(node)) {
            visited.add(node);
            (graph[node] || []).forEach(n => stack.push(n));
        }
    }
    return visited;
}

// ===============================
// 通電チェック
// ===============================

function checkPower() {

    const graph = buildGraph();
    const powered = dfs(graph, "電源-L");

    // 短絡チェック
    if (powered.has("電源-N")) {
        workspace.classList.add("short");
        setTimeout(() => workspace.classList.remove("short"), 500);
        return;
    }

    const lampOn =
        powered.has("ランプ-L") &&
        powered.has("ランプ-N");

    const lamp = document.getElementById("lamp");

    if (lampOn) {
        lamp.classList.add("on");

        wires.forEach(w => {
            w.svg.setAttribute("stroke", "red");
            w.svg.style.strokeDasharray = "6 6";
            w.svg.style.animation = "flow 1s linear infinite";
        });

    } else {
        lamp.classList.remove("on");

        wires.forEach(w => {
            w.svg.setAttribute("stroke", "#222");
            w.svg.style.animation = "";
        });
    }
}
