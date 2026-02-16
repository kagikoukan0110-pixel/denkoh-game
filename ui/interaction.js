export function setupInteraction(graph, scoring){

  document.addEventListener("click",(e)=>{

    if(e.target.id === "lamp"){
      graph.connect("L","lamp");
      const score = scoring.calculate();
      console.log("Score:", score);
    }

  });

}
