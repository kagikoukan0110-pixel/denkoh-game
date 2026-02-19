let bossHP = 100;
let playerHP = 100;

const bossBar = document.getElementById("bossHP");
const playerBar = document.getElementById("playerHP");
const overlay = document.getElementById("overlay");
const setBtn = document.getElementById("setBtn");
const wireLayer = document.getElementById("wireLayer");

let selected = null;
let connections = [];
let switchOn = false;

updateHP();

/* ===== 端子クリック ===== */

document.querySelectorAll(".terminal").forEach(t=>{
  t.addEventListener("click",()=>{
    if(!selected){
      selected = t;
      t.classList.add("selected");
    }else{
      if(selected !== t){
        connections.push([selected.dataset.id, t.dataset.id]);
        redraw();
      }
      selected.classList.remove("selected");
      selected = null;
    }
  });
});

/* ===== 片切スイッチON/OFF ===== */

document.getElementById("switch").addEventListener("click",()=>{
  switchOn = !switchOn;
  document.getElementById("switch").style.background =
    switchOn ? "#aaffaa" : "#ddd";
});

/* ===== グループ化 ===== */

function getGroups(){
  let groups = [];

  connections.forEach(([a,b])=>{
    let gA = groups.find(g=>g.includes(a));
    let gB = groups.find(g=>g.includes(b));

    if(gA && gB && gA!==gB){
      gA.push(...gB);
      groups = groups.filter(g=>g!==gB);
    }
    else if(gA){
      if(!gA.includes(b)) gA.push(b);
    }
    else if(gB){
      if(!gB.includes(a)) gB.push(a);
    }
    else{
      groups.push([a,b]);
    }
  });

  return groups;
}

/* ===== 再描画 ===== */

function redraw(){

  wireLayer.innerHTML = "";

  const boardRect = document.getElementById("board").getBoundingClientRect();
  const jbRect = document.getElementById("junction").getBoundingClientRect();
  const jx = jbRect.left - boardRect.left + jbRect.width/2;
  const jy = jbRect.top - boardRect.top + jbRect.height/2;

  const groups = getGroups();

  groups.forEach(group=>{

    // 黒丸
    const circle = document.createElementNS("http://www.w3.org/2000/svg","circle");
    circle.setAttribute("cx",jx);
    circle.setAttribute("cy",jy);
    circle.setAttribute("r",6);
    circle.setAttribute("fill","black");
    wireLayer.appendChild(circle);

    group.forEach(id=>{
      const el = document.querySelector(`[data-id="${id}"]`);
      const rect = el.getBoundingClientRect();
      const x = rect.left - boardRect.left + rect.width/2;
      const y = rect.top - boardRect.top + rect.height/2;

      const line = document.createElementNS("http://www.w3.org/2000/svg","line");
      line.setAttribute("x1",x);
      line.setAttribute("y1",y);
      line.setAttribute("x2",jx);
      line.setAttribute("y2",jy);
      line.setAttribute("stroke","yellow");
      line.setAttribute("stroke-width","2");
      wireLayer.appendChild(line);
    });

  });
}

/* ===== 判定 ===== */

setBtn.addEventListener("click",()=>{

  if(!switchOn){
    alert("スイッチOFF");
    return;
  }

  const ok =
    has("power-L","switch-IN") &&
    has("switch-OUT","lamp-L") &&
    has("power-N","lamp-N");

  if(ok){
    bossHP = 0;
    updateHP();
    overlay.classList.remove("hidden");
  }else{
    playerHP -= 20;
    if(playerHP < 0) playerHP = 0;
    updateHP();
  }
});

function has(a,b){
  return connections.some(c =>
    (c[0]===a && c[1]===b) ||
    (c[0]===b && c[1]===a)
  );
}

function updateHP(){
  bossBar.style.width = bossHP + "%";
  playerBar.style.width = playerHP + "%";
}
