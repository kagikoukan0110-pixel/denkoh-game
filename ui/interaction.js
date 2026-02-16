if(e.target.id === "lamp"){
  graph.connect("L","lamp");
  const score = scoring.calculate();

  e.target.setAttribute("fill", score === 100 ? "yellow" : "red");
}
