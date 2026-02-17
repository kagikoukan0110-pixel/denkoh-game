const workspace = document.getElementById("workspace")
const wireLayer = document.getElementById("wireLayer")

let devices = []

/* ===========================
   デバイス生成
=========================== */

function createDevice(type, x, y) {
  const div = document.createElement("div")
  div.className = "device"
  div.style.left = x + "px"
  div.style.top = y + "px"
  div.innerText = type

  workspace.appendChild(div)

  const device = { type, element: div }

  if (type === "電源") {
    createTerminal(div, "L", 70, 10)
    createTerminal(div, "N", 70, 30)
  }

  if (type === "三路") {
    // 0 左中央
    createTerminal(div, "0", -10, 18)

    // 1 右上
    createTerminal(div, "1", 80, 5)

    // 3 右下
    createTerminal(div, "3", 80, 30)
  }

  if (type === "ランプ") {
    createTerminal(div, "L", 70, 10)
    createTerminal(div, "N", 70, 30)
  }

  devices.push(device)
}

/* ===========================
   端子生成
=========================== */

function createTerminal(parent, label, x, y) {
  const t = document.createElement("div")
  t.className = "terminal"
  t.innerText = label
  t.style.left = x + "px"
  t.style.top = y + "px"
  parent.appendChild(t)
}

/* ===========================
   初期配置（縦画面最適化）
=========================== */

function init() {
  createDevice("電源", 30, 360)
  createDevice("三路", 140, 360)
  createDevice("三路", 250, 360)
  createDevice("ランプ", 360, 360)
}

init()
