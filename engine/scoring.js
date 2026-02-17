export class Scoring {

  constructor(graph){
    this.graph = graph;
  }

  run(){

    let score = 100;

    // 🔥 重大欠陥チェック
    const major = this.checkMajor();

    if(major){
      return {
        score: 0,
        pass: false,
        major: major
      };
    }

    // 減点チェック
    if(!this.graph.crimpDone){
      score -= 30;
    }

    if(!this.graph.isLampOn()){
      score -= 20;
    }

    return {
      score: score,
      pass: score >= 60,
      major: null
    };
  }

  checkMajor(){

    // 芯線2本なのに中・大を使ったら重大
    if(this.graph.crimpDone && this.graph.crimpSize !== "small"){
      return "重大欠陥：スリーブサイズ不適合";
    }

    // 芯線本数が2本でない場合（将来拡張用）
    if(this.graph.wireCount !== 2){
      return "重大欠陥：芯線本数不一致";
    }

    return null;
  }

}
