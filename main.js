document.addEventListener("DOMContentLoaded", () => {

let bossHP = 100;
let playerHP = 100;
let switchOn = false;

const bossBar = document.getElementById("bossHP");
const playerBar = document.getElementById("playerHP");
const setBtn = document.getElementById("setBtn");
const overlay = document.getElementById("overlay");
const switchEl = document.getElementById("switch");
const lampEl = document.getElementById("lamp");

let selected = null;
let connections = [];

function updateHP(){
  bossBar.style.width = bossHP + "%";
  playerBar.style.width = playerHP + "%";
}

updateHP();

document.querySelectorAll(".terminal").forEach(t=>{
  t.addEventListener("click", ()=>{
    if(!selected){
      selected = t;
      t.classList.add("selected");
    }else{
      if(selected !== t){
        connections.push([selected.dataset.id, t.dataset.id]);
      }
      selected.classList.remove("selected");
      selected = null;
    }
  });
});

switchEl.addEventListener("click", ()=>{
  switchOn = !switchOn;
  switchEl.classList.toggle("on", switchOn);
});

function buildGraph(){
  const graph = {};

  connections.forEach(([a,b])=>{
    if(!graph[a]) graph[a] = [];
    if(!graph[b]) graph[b] = [];
    graph[a].push(b);
    graph[b].push(a);
  });

  if(switchOn){
    if(!graph["switch-IN"]) graph["switch-IN"]=[];
    if(!graph["switch-OUT"]) graph["switch-OUT"]=[];
    graph["switch-IN"].push("switch-OUT");
    graph["switch-OUT"].push("switch-IN");
  }

  return graph;
}

function dfs(graph,start,target,visited=new Set()){
  if(start===target) return true;
  visited.add(start);
  if(!graph[start]) return false;

  for(const next of graph[start]){
    if(!visited.has(next)){
      if(dfs(graph,next,target,visited)) return true;
    }
  }
  return false;
}

setBtn.addEventListener("click", ()=>{

  const graph = buildGraph();

  const lRoute =
    dfs(graph,"power-L","lamp-L");

  const nRoute =
    dfs(graph,"power-N","lamp-N");

  if(lRoute && nRoute){
    bossHP = 0;
    updateHP();
    lampEl.classList.add("on");

    setTimeout(()=>{
      overlay.style.display="flex";
    },500);

  }else{
    playerHP -= 20;
    if(playerHP < 0) playerHP = 0;
    updateHP();
    if(playerHP===0){
      alert("GAME OVER");
      location.reload();
    }
  }

});

});
