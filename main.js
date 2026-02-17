const workspace = document.getElementById("workspace")

/* 横レイヤー作成 */
const deviceLayer = document.createElement("div")
deviceLayer.id = "deviceLayer"
workspace.appendChild(deviceLayer)

function createDevice(type, x, y) {
  const div = document.createElement("div")
  div.className = "device"
  div.style.left = x + "px"
  div.style.top = y + "px"
  div.innerText = type

  deviceLayer.appendChild(div)

  if (type === "電源") {
    createTerminal(div, "L", 48, 6)
    createTerminal(div, "N", 48, 24)
  }

  if (type === "三路") {
    createTerminal(div, "0", -6, 14)
    createTerminal(div, "1", 52, 4)
    createTerminal(div, "3", 52, 24)
  }

  if (type === "ランプ") {
    createTerminal(div, "L", 48, 6)
    createTerminal(div, "N", 48, 24)
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

/* ===== 横並び配置 ===== */

function init() {
  const baseY = 380

  createDevice("電源", 20, baseY)
  createDevice("三路", 110, baseY)
  createDevice("三路", 200, baseY)
  createDevice("ランプ", 290, baseY)
}

init()
