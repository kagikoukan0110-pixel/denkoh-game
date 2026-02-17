export function setupInteraction(graph, scoring){

  document.addEventListener("click",(e)=>{

    const lamp = document.getElementById("lamp");
    const breaker = document.getElementById("breaker");

    if(e.target.id === "breaker"){
      graph.toggleBreaker();
      breaker.setAttribute("fill", graph.breakerOn ? "#4caf50" : "#ccc");
    }

    if(e.target.id === "s1"){
      graph.toggleS1();
    }

    if(e.target.id === "s2"){
      graph.toggleS2();
    }

    // 🔥 採点ボタン
    if(e.target.id === "checkBtn"){

      const result = scoring.run();

      if(result.major){
        alert(result.major);
        return;
      }

      alert(
        `得点: ${result.score}\n` +
        `判定: ${result.pass ? "合格水準" : "再確認が必要"}`
      );
    }

    // ランプ更新
    if(graph.isLampOn()){
      lamp.setAttribute("fill","yellow");
    } else {
      lamp.setAttribute("fill","gray");
    }

  });

}
