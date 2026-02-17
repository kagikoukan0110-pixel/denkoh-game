let idCounter = 0;

export function createDevice(type){

  const el = document.createElement("div");
  el.classList.add("device");

  el.dataset.id = "d" + idCounter++;
  el.dataset.type = type;

  el.style.left = "100px";
  el.style.top = "100px";

  switch(type){
    case "switch-left":
      el.textContent = "三路左";
      break;
    case "switch-right":
      el.textContent = "三路右";
      break;
    case "lamp":
      el.textContent = "ランプ";
      break;
    case "power":
      el.textContent = "電源";
      break;
  }

  return el;
}
