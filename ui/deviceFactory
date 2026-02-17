import { state } from "../core/state.js";

export function createDevice(type,x,y){

  const id = "dev_" + (++state.deviceCount);

  const device = {
    id,
    type,
    x,
    y,
    width:70,
    height:100,
    locked:false,
    group:null
  };

  renderDevice(device);
  state.devices.push(device);
  return device;
}

function renderDevice(device){

  const svg = document.getElementById("board");

  const g = document.createElementNS("http://www.w3.org/2000/svg","g");
  g.setAttribute("class","device");
  g.setAttribute("transform",`translate(${device.x},${device.y})`);

  const rect = document.createElementNS("http://www.w3.org/2000/svg","rect");
  rect.setAttribute("width",70);
  rect.setAttribute("height",100);
  rect.setAttribute("rx",8);
  rect.setAttribute("fill","#e0e0e0");
  rect.setAttribute("stroke","#aaa");

  g.appendChild(rect);

  svg.appendChild(g);
  device.group = g;
}
