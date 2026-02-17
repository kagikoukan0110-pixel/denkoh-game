import { getThreeWayConnections } from "./switchLogic.js";

/**
 * 全デバイスと配線から導通グラフを作る
 */
export function buildCircuitGraph(devices, wires) {

  const graph = {};

  function addConnection(a, b) {
    if (!graph[a]) graph[a] = [];
    graph[a].push(b);
  }

  // 外部配線
  wires.forEach(wire => {
    addConnection(wire.from, wire.to);
    addConnection(wire.to, wire.from);
  });

  // 三路内部導通
  devices.forEach(device => {

    if (device.type === "switch-left" || device.type === "switch-right") {

      const connections = getThreeWayConnections(device.mode);

      connections.forEach(([a, b]) => {
        const nodeA = device.id + "_" + a;
        const nodeB = device.id + "_" + b;

        addConnection(nodeA, nodeB);
      });
    }

  });

  return graph;
}
export function hasPath(graph, start, target) {

  const visited = new Set();
  const stack = [start];

  while (stack.length > 0) {

    const node = stack.pop();

    if (node === target) return true;

    if (!visited.has(node)) {
      visited.add(node);

      const neighbors = graph[node] || [];
      neighbors.forEach(n => stack.push(n));
    }
  }

  return false;
}
