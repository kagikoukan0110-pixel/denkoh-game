const workspace = document.getElementById("workspace")

function createDevice(type, x, y) {
  const div = document.createElement("div")
  div.className = "device"
  div.style.left = x + "px"
  div.style.top = y + "px"
  div.innerText = type

  workspace.appendChild(div)

  if (type === "電源") {
    createTerminal(div, "L", 52, 8)
    createTerminal(div, "N", 52, 24)
  }

  if (type === "三路") {
    // 0 左内側中央
    createTerminal(div, "0", -8, 14)

    // 1 右上内側
    createTerminal(div, "1", 58, 4)

    // 3 右下内側
    createTerminal(div, "3", 58, 24)
  }

  if (type === "ランプ") {
    createTerminal(div, "L", 52, 8)
    createTerminal(div, "N", 52, 24)
  }
}

function createTerminal(parent, label, x, y) {
  const t = document.createElement("div")
  t.className = "terminal"
  t.innerText = label
  t.style.left = x + "px"
  t.style.top = y + "px"
  parent.appendChild(t)
}

/* ===== 横並び完全表示位置 ===== */

function init() {
  const baseY = 380

  createDevice("電源", 15, baseY)
  createDevice("三路", 105, baseY)
  createDevice("三路", 195, baseY)
  createDevice("ランプ", 285, baseY)
}

init()
