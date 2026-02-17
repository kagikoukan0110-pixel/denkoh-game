export function setupInteraction(graph, scoring){

  alert("interaction start");

  const lamp = document.getElementById("lamp");
  const breaker = document.getElementById("breaker");
  const s1 = document.getElementById("s1");
  const s2 = document.getElementById("s2");
  const checkBtn = document.getElementById("checkBtn");

  alert(checkBtn ? "button found" : "button NOT found");

  // ブレーカー
  breaker.addEventListener("click", ()=>{
    graph.toggleBreaker();
    breaker.setAttribute("fill", graph.breakerOn ? "#4caf50" : "#ccc");
    updateLamp();
  });

  // スイッチ1
  s1.addEventListener("click", ()=>{
    graph.toggleS1();
    updateLamp();
  });

  // スイッチ2
  s2.addEventListener("click", ()=>{
    graph.toggleS2();
    updateLamp();
  });

  // 採点ボタン
  if(checkBtn){
    checkBtn.addEventListener("click", ()=>{
      alert("採点ボタン押された");

      const result = scoring.run();

      if(result.major){
        alert(result.major);
        return;
      }

      alert(
        `得点: ${result.score}\n` +
        `判定: ${result.pass ? "合格水準" : "再確認が必要"}`
      );
    });
  }

  function updateLamp(){
    if(graph.isLampOn()){
      lamp.setAttribute("fill","yellow");
    } else {
      lamp.setAttribute("fill","gray");
    }
  }

}
