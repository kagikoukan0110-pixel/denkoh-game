export function setupInteraction(graph, scoring){

  document.addEventListener("click",(e)=>{

    if(e.target.id === "lamp"){

      graph.connect("L","lamp");
      const score = scoring.calculate();

      const lamp = document.getElementById("lamp");

      if(score === 100){
        lamp.setAttribute("fill","yellow");
      } else {
        lamp.setAttribute("fill","red");
      }

    }

  });

}
