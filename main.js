const workspace = document.getElementById("workspace");

function createDevice(type, x, y) {
  const device = document.createElement("div");
  device.className = "device";
  device.style.left = x + "px";
  device.style.top = y + "px";

  const label = document.createElement("div");

  if (type === "threeway") label.textContent = "三路";
  if (type === "power") label.textContent = "電源";
  if (type === "lamp") label.textContent = "ランプ";

  device.appendChild(label);

  if (type === "threeway") {
    createTerminal(device, "0", 0, 50);
    createTerminal(device, "1", 100, 25);
    createTerminal(device, "3", 100, 75);
  }

  if (type === "power") {
    createTerminal(device, "L", 100, 30);
    createTerminal(device, "N", 100, 70);
  }

  if (type === "lamp") {
    createTerminal(device, "L", 0, 50);
    createTerminal(device, "N", 100, 50);
  }

  workspace.appendChild(device);
}

function createTerminal(device, name, xPercent, yPercent) {
  const terminal = document.createElement("div");
  terminal.className = "terminal";
  terminal.textContent = name;
  terminal.style.left = xPercent + "%";
  terminal.style.top = yPercent + "%";
  device.appendChild(terminal);
}

createDevice("power", 150, 350);
createDevice("threeway", 500, 320);
createDevice("threeway", 900, 320);
createDevice("lamp", 1300, 320);
