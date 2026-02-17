export function createDevice(type) {
  const el = document.createElement("div");
  el.classList.add("device");
  el.dataset.type = type;
  el.dataset.id = crypto.randomUUID();

  el.style.position = "absolute";
  el.style.width = "100px";
  el.style.height = "100px";
  el.style.background = "#ddd";
  el.style.borderRadius = "10px";
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.fontWeight = "bold";
  el.style.touchAction = "none";

  // 三路スイッチ
  if (type === "switch-left" || type === "switch-right") {

    const label = document.createElement("div");
    label.innerText = type === "switch-left" ? "三路 左0" : "三路 右0";
    el.appendChild(label);

    // 初期モード
    el.dataset.mode = "left";

    // タップで切替
    el.addEventListener("click", (e) => {
      e.stopPropagation();

      const current = el.dataset.mode;
      el.dataset.mode = current === "left" ? "right" : "left";

      updateSwitchVisual(el);
    });

    updateSwitchVisual(el);
  }

  if (type === "lamp") {
    el.innerText = "ランプ";
  }

  if (type === "power") {
    el.innerText = "電源";
  }

  return el;
}

function updateSwitchVisual(el) {
  const mode = el.dataset.mode;

  if (mode === "left") {
    el.style.background = "#cfd8dc"; // 左側
  } else {
    el.style.background = "#ffe082"; // 右側
  }
}
