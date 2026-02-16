export class Scoring {

  constructor(graph){
    this.graph = graph;
    this.deductions = [];
  }

  run(){

    let score = 100;

    // 重大欠陥チェック
    const major = this.checkMajorFault();

    if(major){
      return {
        score: 0,
        pass: false,
        major: major,
        deductions: []
      };
    }

    // 減点チェック
    score -= this.checkBreaker();
    score -= this.checkSwitchMismatch();

    return {
      score: score,
      pass: score >= 60,
      major: null,
      deductions: this.deductions
    };
  }

  checkMajorFault(){

    // ブレーカーOFFで導通があるのは重大
    if(!this.graph.breakerOn && this.graph.isLampOn()){
      return "重大欠陥：ブレーカー未投入で導通";
    }

    return null;
  }

  checkBreaker(){

    if(!this.graph.breakerOn){
      this.deductions.push("ブレーカー未投入");
      return 10;
    }

    return 0;
  }

  checkSwitchMismatch(){

    if(!this.graph.isLampOn()){
      this.deductions.push("回路未完成");
      return 20;
    }

    return 0;
  }

}
