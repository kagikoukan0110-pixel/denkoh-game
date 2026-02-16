export class Graph {

  constructor(){
    this.connections = {};
  }

  connect(a,b){
    if(!this.connections[a]) this.connections[a]=[];
    this.connections[a].push(b);
  }

  isConnected(a,b){
    return this.connections[a]?.includes(b);
  }
}
