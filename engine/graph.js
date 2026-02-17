export function buildGraph(devices){

  const graph = {};

  devices.forEach(d=>{
    graph[d.dataset.id] = [];
  });

  return graph;
}
