export function generateStage(level){

  return {
    difficulty: level,
    devices:[
      { type:"power", id:"P1" },
      { type:"switch-single", id:"S1" },
      { type:"lamp", id:"L1" }
    ],
    goal:{
      type:"light_on",
      targets:["L1"]
    }
  };

}
