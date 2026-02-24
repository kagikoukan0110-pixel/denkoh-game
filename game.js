let selected=null;
let connections=[];
let bossHP=160;
let switch1State=0;
let switch2State=0;
let wiringCorrect=false;

const board=document.getElementById("board");
const wireLayer=document.getElementById("wireLayer");
const bossHPbar=document.getElementById("bossHPbar");

/* 固定レイアウト */
function place(id,x,y){
  const el=document.getElementById(id);
  el.style.left=x+"px";
  el.style.top=y+"px";
}

function layout(){
  const w=board.clientWidth;
  place("power",w/2,60);
  place("sw1",w/2-180,160);
  place("sw2",w/2+180,160);
  place("junction",w/2,280);
  place("lamp1",w/2-100,420);
  place("lamp2",w/2+100,420);
}
layout();

/* 接続 */
document.querySelectorAll(".terminal").forEach(t=>{
  t.addEventListener("click",()=>{
    if(!selected){
      selected=t;
      return;
    }
    connect(selected,t);
    selected=null;
  });
});

function connect(a,b){

  const idA=a.dataset.id;
  const idB=b.dataset.id;
  if(idA===idB) return;

  const r1=a.getBoundingClientRect();
  const r2=b.getBoundingClientRect();
  const br=board.getBoundingClientRect();

  const x1=r1.left-br.left+r1.width/2;
  const y1=r1.top-br.top+r1.height/2;
  const x2=r2.left-br.left+r2.width/2;
  const y2=r2.top-br.top+r2.height/2;

  const line=document.createElementNS("http://www.w3.org/2000/svg","line");
  line.setAttribute("x1",x1);
  line.setAttribute("y1",y1);
  line.setAttribute("x2",x2);
  line.setAttribute("y2",y2);

  const color=getColor(idA,idB);
  line.setAttribute("stroke",color);
  line.setAttribute("stroke-width",color==="white"?2:5);

  wireLayer.appendChild(line);
  connections.push({a:idA,b:idB,color});

  checkWiring();
}

function getColor(a,b){
  if(a.includes("-N")||b.includes("-N")) return "white";
  if(a.includes("T")&&b.includes("T")) return "red";
  return "black";
}

function exists(a,b,color){
  return connections.some(c=>
    ((c.a===a&&c.b===b)||(c.a===b&&c.b===a)) &&
    (!color||c.color===color)
  );
}

function checkWiring(){

  const cond1=exists("power-L","sw1-COM","black");
  const cond2=exists("sw1-T1","sw2-T1","red");
  const cond3=exists("sw1-T2","sw2-T2","red");
  const cond4=connections.some(c=>c.a==="sw2-COM"&&c.b.includes("junction"));
  const cond5=connections.some(c=>c.a==="junction-1"&&c.b==="lamp1-L");
  const cond6=connections.some(c=>c.a==="junction-1"&&c.b==="lamp2-L");
  const cond7=connections.some(c=>c.a==="power-N"&&c.b.includes("junction"));

  wiringCorrect=cond1&&cond2&&cond3&&cond4&&cond5&&cond6&&cond7;

  updateLamps();
}

document.getElementById("sw1Btn").onclick=()=>{
  switch1State^=1;
  updateLamps();
};

document.getElementById("sw2Btn").onclick=()=>{
  switch2State^=1;
  updateLamps();
};

function updateLamps(){
  const on=wiringCorrect&&(switch1State!==switch2State);
  document.getElementById("lamp1").classList.toggle("lit",on);
  document.getElementById("lamp2").classList.toggle("lit",on);
}

document.getElementById("setBtn").onclick=()=>{
  if(!wiringCorrect) return;

  bossHP-=40;
  bossHPbar.style.width=bossHP+"%";

  if(bossHP<=0){
    alert("図面通りなら…いけると思ったのに…");
  }
};
