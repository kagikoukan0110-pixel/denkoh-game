export class Scoring {

  constructor(graph){
    this.graph = graph;
  }

  calculate(){
    let score = 100;

    if(!this.graph.isConnected("L","lamp")){
      score -= 20;
    }

    return score;
  }
}
