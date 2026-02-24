const svg = document.getElementById("wireLayer");
let selected = null;
let wires = [];

function getCenter(el) {
  const r = el.getBoundingClientRect();
  return {
    x: r.left + r.width / 2,
    y: r.top + r.height / 2
  };
}

function drawWire(a, b, color) {
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  const p1 = getCenter(a);
  const p2 = getCenter(b);

  line.setAttribute("x1", p1.x);
  line.setAttribute("y1", p1.y);
  line.setAttribute("x2", p2.x);
  line.setAttribute("y2", p2.y);
  line.setAttribute("stroke", color);
  line.setAttribute("stroke-width", 4);
  line.setAttribute("stroke-linecap", "round");

  svg.appendChild(line);
  wires.push(line);
}

document.querySelectorAll(".terminal").forEach(t => {
  t.addEventListener("click", () => {
    if (!selected) {
      selected = t;
      t.style.outline = "2px solid yellow";
    } else {
      const color = selected.classList.contains("white") ? "white" :
                    selected.classList.contains("red") ? "red" : "black";

      drawWire(selected, t, color);
      selected.style.outline = "none";
      selected = null;
    }
  });
});

document.getElementById("setBtn").addEventListener("click", () => {
  document.getElementById("lampBulb").classList.add("on");
  setTimeout(() => {
    document.getElementById("bossOverlay").classList.remove("hidden");
  }, 2000);
});

document.getElementById("closeBoss").addEventListener("click", () => {
  document.getElementById("bossOverlay").classList.add("hidden");
});
