export class Scoring {

  constructor(graph){
    this.graph = graph;
  }

  run(){

    let score = 100;
    let mistakes = [];

    // 🔴 重大欠陥チェック（最優先）
    const major = this.checkMajor();

    if(major){
      return {
        score: 0,
        pass: false,
        major: major,
        mistakes: [major]
      };
    }

    // 🔹 圧着未施工
    if(!this.graph.crimpDone){
      score -= 30;
      mistakes.push("圧着未施工");
    }

    // 🔹 回路未完成
    if(!this.graph.isLampOn()){
      score -= 20;
      mistakes.push("回路未完成");
    }

    // 🔹 剥き長さ
    if(this.graph.stripLength < 8 || this.graph.stripLength > 12){
      score -= 20;
      mistakes.push("剥き長さ不適正");
    }

    return {
      score: score,
      pass: score >= 60,
      major: null,
      mistakes: mistakes
    };
  }

  checkMajor(){

    if(this.graph.shortCircuit){
      return "重大欠陥：L-N短絡";
    }

    if(this.graph.burned){
      return "重大欠陥：圧着部焼損";
    }

    if(this.graph.contactFault && this.graph.crimpSize !== "small"){
      return "重大欠陥：スリーブサイズ不適合";
    }

    if(this.graph.stripLength < 5){
      return "重大欠陥：剥き長さ不足";
    }

    if(this.graph.boxWireCount > 4){
      return "重大欠陥：BOX内過密";
    }

    return null;
  }

}
