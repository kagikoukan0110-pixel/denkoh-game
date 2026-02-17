export class Graph {

  constructor(){
    this.s1State = 0;
    this.s2State = 0;
    this.breakerOn = false;

    this.crimpOK = false; // 🔥 圧着状態
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

  toggleCrimp(){
    this.crimpOK = !this.crimpOK;
  }

  isLampOn(){

    if(!this.breakerOn) return false;

    const s1Output = this.s1State === 0 ? "T1" : "T2";
    const s2Input  = this.s2State === 0 ? "T1" : "T2";

    const circuitComplete = s1Output === s2Input;

    // 🔥 圧着がOKでないと導通しない
    return circuitComplete && this.crimpOK;
  }

}
