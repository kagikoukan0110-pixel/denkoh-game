export function setupInteraction(){

  let selectedTerminal = null;
  let selectedColor = "black";
  let wireCount = 0;

  let s1State = 0;
  let s2State = 0;

  const colorMap = {
    black: "#000",
    white: "#eee",
    red: "#d32f2f"
  };

  /* 色選択 */
  document.querySelectorAll("#colorBar button").forEach(btn=>{
    btn.addEventListener("click",()=>{
      selectedColor = btn.dataset.color;
    });
  });

  /* 三路切替 */

  document.getElementById("s1_body")
    .addEventListener("click",()=>{
      s1State = s1State === 0 ? 1 : 0;
      updateInternal("s1", s1State);
    });

  document.getElementById("s2_body")
    .addEventListener("click",()=>{
      s2State = s2State === 0 ? 1 : 0;
      updateInternal("s2", s2State);
    });

  function updateInternal(sw, state){

    const line = document.getElementById(sw + "_internal");

    if(sw === "s1"){

      if(state === 0){
        line.setAttribute("x2","300");
        line.setAttribute("y2","130");
      } else {
        line.setAttribute("x2","300");
        line.setAttribute("y2","190");
      }

    } else {

      if(state === 0){
        line.setAttribute("x2","520");
        line.setAttribute("y2","130");
      } else {
        line.setAttribute("x2","520");
        line.setAttribute("y2","190");
      }

    }

  }

  /* 外部配線（前回と同じ） */

  document.querySelectorAll(".terminal").forEach(term=>{

    term.addEventListener("click",()=>{

      if(selectedTerminal === term){
        term.setAttribute("fill","#fff");
        selectedTerminal = null;
        return;
      }

      if(!selectedTerminal){
        term.setAttribute("fill","#2196f3");
        selectedTerminal = term;
        return;
      }

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
