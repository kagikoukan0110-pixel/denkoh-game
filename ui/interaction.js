export function setupInteraction(graph, scoring){

  const lamp = document.getElementById("lamp");
  const breaker = document.getElementById("breaker");
  const s1 = document.getElementById("s1");
  const s2 = document.getElementById("s2");
  const checkBtn = document.getElementById("checkBtn");
  const resultBox = document.getElementById("result");

  breaker.addEventListener("click", ()=>{
    graph.toggleBreaker();
    breaker.setAttribute("fill", graph.breakerOn ? "#4caf50" : "#ccc");
    updateLamp();
  });

  s1.addEventListener("click", ()=>{
    graph.toggleS1();
    updateLamp();
  });

  s2.addEventListener("click", ()=>{
    graph.toggleS2();
    updateLamp();
  });

  checkBtn.addEventListener("click", ()=>{

    const result = scoring.run();

    if(result.major){
      resultBox.innerHTML = result.major;
      resultBox.style.background = "#b00020";
      return;
    }

    resultBox.innerHTML =
      `得点: ${result.score}<br>` +
      `判定: ${result.pass ? "合格水準" : "再確認が必要"}`;

    resultBox.style.background =
      result.pass ? "#2e7d32" : "#c62828";
  });

  function updateLamp(){
    if(graph.isLampOn()){
      lamp.setAttribute("fill","yellow");
    } else {
      lamp.setAttribute("fill","gray");
    }
  }

}
