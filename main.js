document.addEventListener("DOMContentLoaded", function () {

  let playerHP = 100;
  let bossHP = 100;

  const bossBar = document.getElementById("bossHP");
  const playerBar = document.getElementById("playerHP");
  const setBtn = document.getElementById("setBtn");
  const freezeScreen = document.getElementById("freezeScreen");
  const wireLayer = document.getElementById("wireLayer");

  let connections = [];
  let selected = null;

  updateHP();

  function updateHP() {
    bossBar.style.width = bossHP + "%";
    playerBar.style.width = playerHP + "%";
  }

  document.querySelectorAll(".terminal").forEach(t => {
    t.addEventListener("click", () => {

      if (!selected) {
        selected = t;
        t.classList.add("selected");
      } else {

        if (selected === t) {
          t.classList.remove("selected");
          selected = null;
          return;
        }

        connectTerminals(selected, t);

        selected.classList.remove("selected");
        selected = null;
      }
    });
  });

  function connectTerminals(t1, t2) {

    const id1 = t1.dataset.id;
    const id2 = t2.dataset.id;

    if (id1 === id2) return;

    connections.push([id1, id2]);

    drawWire(t1, t2);
  }

  function drawWire(t1, t2) {

    const rect1 = t1.getBoundingClientRect();
    const rect2 = t2.getBoundingClientRect();

    const x1 = rect1.left + rect1.width/2;
    const y1 = rect1.top + rect1.height/2;
    const x2 = rect2.left + rect2.width/2;
    const y2 = rect2.top + rect2.height/2;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");

    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x1);
    line.setAttribute("y2", y1);
    line.setAttribute("stroke", "yellow");
    line.setAttribute("stroke-width", "3");

    wireLayer.appendChild(line);

    let progress = 0;
    const animate = setInterval(() => {
      progress += 0.05;
      if (progress >= 1) {
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);
        clearInterval(animate);
      } else {
        line.setAttribute("x2", x1 + (x2 - x1) * progress);
        line.setAttribute("y2", y1 + (y2 - y1) * progress);
      }
    }, 16);
  }

  setBtn.addEventListener("click", checkCircuit);

  function has(a, b) {
    return connections.some(c =>
      (c[0] === a && c[1] === b) ||
      (c[0] === b && c[1] === a)
    );
  }

  function checkCircuit() {

    const correct =
      has("powerL","switchIn") &&
      has("switchOut","lampL") &&
      has("lampN","powerN");

    if (correct) {
      bossHP = 0;
      updateHP();
      triggerFreeze();
    } else {
      playerHP -= 20;
      if (playerHP < 0) playerHP = 0;
      updateHP();
      alert("回路が違う！");
    }
  }

  function triggerFreeze() {
    freezeScreen.style.display = "block";
    setTimeout(() => {
      freezeScreen.style.display = "none";
      alert("WORLD1 CLEAR");
      location.reload();
    }, 3000);
  }

});
