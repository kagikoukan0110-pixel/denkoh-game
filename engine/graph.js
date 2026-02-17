export class Graph {

  constructor(){
    this.s1State = 0;
    this.s2State = 0;
    this.breakerOn = false;

    this.crimpDone = false;
    this.crimpSize = null; // "small" | "medium" | "large"

    this.wireCount = 2; // 今回の問題は2本接続
  }

  toggleBreaker(){
    this.breakerOn = !this.breakerOn;
  }

  toggleS1(){
    this.s1State = this.s1State === 0 ? 1 : 0;
  }

  toggleS2(){
    this.s2State = this.s2State === 0 ? 1 : 0;
  }

  setCrimp(size){
    this.crimpDone = true;
    this.crimpSize = size;
  }

  isLampOn(){

    if(!this.breakerOn) return false;

    const s1Output = this.s1State === 0 ? "T1" : "T2";
    const s2Input  = this.s2State === 0 ? "T1" : "T2";

    const circuitComplete = s1Output === s2Input;

    return circuitComplete && this.crimpDone && this.crimpSize === "small";
  }

}
