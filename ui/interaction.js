export function setupInteraction(){

  let selectedTerminal = null;

  const terminals = document.querySelectorAll(".terminal");

  terminals.forEach(term => {

    term.addEventListener("click", ()=>{

      const id = term.dataset.id;

      // 同じ端子を2回タップ → 解除
      if(selectedTerminal === term){
        term.setAttribute("fill", "#fff");
        selectedTerminal = null;
        return;
      }

      // 1回目選択
      if(!selectedTerminal){
        term.setAttribute("fill", "#2196f3");
        selectedTerminal = term;
        return;
      }

      // 別端子タップ → 接続ログ
      console.log("connect:", selectedTerminal.dataset.id, "→", id);

      selectedTerminal.setAttribute("fill", "#fff");
      selectedTerminal = null;

    });

  });

}
