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

/* ========= デバイス配置 ========= */

createDevice("電源", 100, 250);
createTerminal("L", 210, 260);
createTerminal("N", 210, 300);

createDevice("三路", 350, 250);
createTerminal("0", 330, 285);
createTerminal("1", 470, 255);
createTerminal("3", 470, 315);

createDevice("三路", 650, 250);
createTerminal("0", 630, 285);
createTerminal("1", 770, 255);
createTerminal("3", 770, 315);

createDevice("ランプ", 950, 250);
createTerminal("L", 930, 275);
createTerminal("N", 1080, 275);
