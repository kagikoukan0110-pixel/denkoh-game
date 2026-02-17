import { getThreeWayConnections } from "./switchLogic.js";

export function buildCircuitGraph(devices, wires) {
  const graph = {};

  function add(a, b) {
    if (!graph[a]) graph[a] = [];
    graph[a].push(b);
  }

  // 外部配線
  wires.forEach(w => {
    add(w.from, w.to);
    add(w.to, w.from);
  });

  // 三路内部導通
  devices.forEach(d => {
    if (d.type.startsWith("switch")) {
      const connections = getThreeWayConnections(d);
      connections.forEach(([a, b]) => {
        add(a, b);
        add(b, a);
      });
    }
  });

  return graph;
}
