const workspace = document.getElementById("workspace");

function createDevice(label, x, y) {
  const device = document.createElement("div");
  device.className = "device";
  device.textContent = label;
  device.style.left = x + "px";
  device.style.top = y + "px";
  workspace.appendChild(device);
}

function createTerminal(label, x, y) {
  const terminal = document.createElement("div");
  terminal.className = "terminal";
  terminal.textContent = label;
  terminal.style.left = x + "px";
  terminal.style.top = y + "px";
  workspace.appendChild(terminal);
}

/* ===== 縦画面レイアウト ===== */

createDevice("電源", 40, 120);
createTerminal("L", 130, 135);
createTerminal("N", 130, 165);

createDevice("三路", 160, 120);
createTerminal("0", 150, 150);
createTerminal("1", 260, 130);
createTerminal("3", 260, 170);

createDevice("三路", 40, 260);
createTerminal("0", 30, 290);
createTerminal("1", 140, 270);
createTerminal("3", 140, 310);

createDevice("ランプ", 180, 260);
createTerminal("L", 170, 285);
createTerminal("N", 280, 285);
