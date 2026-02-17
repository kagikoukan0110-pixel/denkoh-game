import { state } from "../core/state.js";

let selected = null;

export function setupInteraction(){

  document.addEventListener("click",(e)=>{

    if(!e.target.classList.contains("device")) return;

    if(!selected){
      selected = e.target;
      selected.style.background = "yellow";
    }
    else{
      createWire(selected, e.target);
      selected.style.background = "";
      selected = null;
    }

  });
}

function createWire(d1,d2){

  state.wires.push({
    from:d1.dataset.id,
    to:d2.dataset.id
  });

  checkClear();
}

function checkClear(){

  const hasConnection =
    state.wires.find(w=>
      (w.from==="S1" && w.to==="L1") ||
      (w.from==="L1" && w.to==="S1")
    );

  if(hasConnection){
    showClear();
  }
}

function showClear(){

  const overlay = document.getElementById("overlay");
  overlay.style.display="flex";
  overlay.innerText="CLEAR!";

  setTimeout(()=>{
    overlay.style.display="none";
    nextStage();
  },1500);
}

function nextStage(){
  state.level++;
  window.startStage(state.level);
}
