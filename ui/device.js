export function createDevice(type) {
  const el = document.createElement("div");
  el.classList.add("device");
  el.dataset.type = type;
  el.dataset.id = crypto.randomUUID();

  switch (type) {
    case "switch-left":
      el.textContent = "三路 左0";
      break;
    case "switch-right":
      el.textContent = "三路 右0";
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
