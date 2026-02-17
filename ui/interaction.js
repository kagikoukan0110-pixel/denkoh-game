export function setupInteraction(){

  let selectedTerminal = null;
  let selectedColor = "black";
  let wireCount = 0;

  const colorMap = {
    black: "#000",
    white: "#eee",
    red: "#d32f2f"
  };

  // 色選択
  document.querySelectorAll("#colorBar button").forEach(btn=>{
    btn.addEventListener("click",()=>{
      selectedColor = btn.dataset.color;
    });
  });

  // 端子クリック
  document.querySelectorAll(".terminal").forEach(term=>{

    term.addEventListener("click",()=>{

      // 同じ端子2回 → 解除
      if(selectedTerminal === term){
        term.setAttribute("fill","#fff");
        selectedTerminal = null;
        return;
      }

      // 1回目選択
      if(!selectedTerminal){
        term.setAttribute("fill","#2196f3");
        selectedTerminal = term;
        return;
      }

      // 2回目 → 接続
      const x1 = +selectedTerminal.getAttribute("cx");
      const y1 = +selectedTerminal.getAttribute("cy");

      const x2 = +term.getAttribute("cx");
      const y2 = +term.getAttribute("cy");

      const points = `${x1},${y1} ${x1},${y2} ${x2},${y2}`;

      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "polyline"
      );

      line.setAttribute("points", points);
      line.setAttribute("fill","none");
      line.setAttribute("stroke-width","5");
      line.setAttribute("stroke", colorMap[selectedColor]);

      const id = "wire_" + (++wireCount);
      line.dataset.id = id;
      line.dataset.from = selectedTerminal.dataset.id;
      line.dataset.to = term.dataset.id;

      document.getElementById("wires").appendChild(line);

      line.addEventListener("click",(e)=>{
        e.stopPropagation();
        line.remove();
        updateTerminalColors();
      });

      selectedTerminal.setAttribute("fill","#fff");
      selectedTerminal = null;

      updateTerminalColors();

    });

  });

  function updateTerminalColors(){

    const lines = document.querySelectorAll("#wires polyline");

    document.querySelectorAll(".terminal").forEach(t=>{
      const id = t.dataset.id;

      const connected = [...lines].some(line=>{
        return line.dataset.from === id ||
               line.dataset.to === id;
      });

      t.setAttribute("fill", connected ? "#4caf50" : "#fff");
    });

  }

}
