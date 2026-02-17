const workspace = document.getElementById("workspace")
const wireLayer = document.getElementById("wireLayer")
const clearOverlay = document.getElementById("clearOverlay")
const retryBtn = document.getElementById("retryBtn")

let devices = []
let wires = []
let currentStart = null

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

  const device = { type, element: div, terminals: {} }

  if (type === "電源") {
    createTerminal(device, "L", -10, 15)
    createTerminal(device, "N", -10, 45)
  }

  if (type === "三路") {
    // 0 左
    createTerminal(device, "0", -10, 30)
    // 1 右上
    createTerminal(device, "1", 110, 15)
    // 3 右下
    createTerminal(device, "3", 110, 45)
  }

  if (type === "ランプ") {
    createTerminal(device, "L", -10, 30)
    createTerminal(device, "N", 110, 30)
  }

  devices.push(device)
}

/* ===========================
   端子生成
=========================== */

function createTerminal(device, label, offsetX, offsetY) {
  const t = document.createElement("div")
  t.className = "terminal"
  t.innerText = label

  t.style.left = offsetX + "px"
  t.style.top = offsetY + "px"

  device.element.appendChild(t)

  device.terminals[label] = t

  t.addEventListener("click", (e) => {
    e.stopPropagation()
    handleTerminalClick(device, label)
  })
}

/* ===========================
   配線処理
=========================== */

function handleTerminalClick(device, label) {
  const terminal = device.terminals[label]

  if (!currentStart) {
    currentStart = { device, label, terminal }
    return
  }

  if (currentStart.device === device) {
    currentStart = null
    return
  }

  drawWire(currentStart.terminal, terminal)

  wires.push({
    from: currentStart.device.type + currentStart.label,
    to: device.type + label
  })

  currentStart = null

  checkClear()
}

function drawWire(t1, t2) {
  const rect1 = t1.getBoundingClientRect()
  const rect2 = t2.getBoundingClientRect()

  const line = document.createElementNS("http://www.w3.org/2000/svg", "line")

  line.setAttribute("x1", rect1.left + rect1.width / 2)
  line.setAttribute("y1", rect1.top + rect1.height / 2)
  line.setAttribute("x2", rect2.left + rect2.width / 2)
  line.setAttribute("y2", rect2.top + rect2.height / 2)

  line.setAttribute("stroke", "red")
  line.setAttribute("stroke-width", "4")

  wireLayer.appendChild(line)
}

/* ===========================
   クリア判定（β簡易）
=========================== */

function checkClear() {
  const hasPower = wires.some(w =>
    w.from.includes("電源L") && w.to.includes("三路0")
  )

  const hasLamp = wires.some(w =>
    w.from.includes("三路1") && w.to.includes("ランプL")
  )

  if (hasPower && hasLamp) {
    clearOverlay.style.display = "flex"
  }
}

/* ===========================
   リトライ
=========================== */

retryBtn.addEventListener("click", () => {
  location.reload()
})

/* ===========================
   初期化
=========================== */

function init() {
  devices = []
  wires = []
  wireLayer.innerHTML = ""

  createDevice("電源", 40, 400)
  createDevice("三路", 180, 400)
  createDevice("三路", 340, 400)
  createDevice("ランプ", 500, 400)
}

init()
