export function getThreeWayConnections(device){

  if(device.dataset.type === "switch-left"){
    return [["common","L"]];
  }

  if(device.dataset.type === "switch-right"){
    return [["common","R"]];
  }

  return [];
}
