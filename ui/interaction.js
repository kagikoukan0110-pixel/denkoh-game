export function setupInteraction(workspace){

  let dragging = null;
  let offsetX = 0;
  let offsetY = 0;

  workspace.addEventListener("pointerdown",(e)=>{
    const target = e.target.closest(".device");
    if(!target) return;

    dragging = target;

    const rect = target.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    target.setPointerCapture(e.pointerId);
  });

  workspace.addEventListener("pointermove",(e)=>{
    if(!dragging) return;

    dragging.style.left = (e.clientX - offsetX) + "px";
    dragging.style.top = (e.clientY - offsetY) + "px";
  });

  workspace.addEventListener("pointerup",()=>{
    dragging = null;
  });
}
