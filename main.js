// ===============================
// 俺らの電工 β - 配線アニメ版
// ===============================

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

    drawAnimatedWire(selected.element, element);

    wires.push({
        a: selected.device + "-" + selected.terminal,
        b: device + "-" + terminal
    });

    selected.element.style.background = "#21a8d8";
    selected = null;

    checkPower();
}

// ===============================
// 🔥 ゆっくり伸びる配線
// ===============================

function drawAnimatedWire(el1, el2) {

    const rect1 = el1.getBoundingClientRect();
    const rect2 = el2.getBoundingClientRect();
    const base = workspace.getBoundingClientRect();

    const x1 = rect1.left - base.left + rect1.width/2;
    const y1 = rect1.top - base.top + rect1.height/2;
    const x2 = rect2.left - base.left + rect2.width/2;
    const y2 = rect2.top - base.top + rect2.height/2;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");

    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);

    line.setAttribute("stroke", "red");
    line.setAttribute("stroke-width", "4");
    line.setAttribute("stroke-linecap", "round");

    wireLayer.appendChild(line);

    // 線の長さ計算
    const length = Math.hypot(x2 - x1, y2 - y1);

    // 初期状態：見えない
    line.style.strokeDasharray = length;
    line.style.strokeDashoffset = length;

    // 強制再描画
    line.getBoundingClientRect();

    // アニメーション
    line.style.transition = "stroke-dashoffset 0.4s ease";
    line.style.strokeDashoffset = "0";
}

// ===============================
// 三路切替
// ===============================

function toggleSwitch1() {
    sw1 = (sw1 === 1) ? 3 : 1;
    checkPower();
}

function toggleSwitch2() {
    sw2 = (sw2 === 1) ? 3 : 1;
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
// 通電判定
// ===============================

function checkPower() {

    const graph = buildGraph();
    const powered = dfs(graph, "電源-L");

    const lampOn =
        powered.has("ランプ-L") &&
        powered.has("ランプ-N");

    const lamp = document.getElementById("lamp");

    if (lampOn) {
        lamp.classList.add("on");
    } else {
        lamp.classList.remove("on");
    }
}
