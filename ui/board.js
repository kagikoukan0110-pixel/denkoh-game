export function initBoard(){

  const app = document.getElementById("app");

  app.innerHTML = `
    <svg id="board" viewBox="0 0 800 500">
      <circle id="lamp" cx="600" cy="200" r="20" fill="gray"/>
    </svg>
  `;
}
