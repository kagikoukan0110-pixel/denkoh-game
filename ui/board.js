export function initBoard(){

  const app = document.getElementById("app");

  app.innerHTML = `
    <svg viewBox="0 0 800 500">

      <rect id="breaker" x="100" y="80" width="60" height="60" fill="#ccc"/>
      <rect id="s1" x="250" y="150" width="60" height="60" fill="#ddd"/>
      <rect id="s2" x="400" y="150" width="60" height="60" fill="#ddd"/>

      <circle id="lamp" cx="650" cy="200" r="20" fill="gray"/>

    </svg>

    <button id="checkBtn"
      style="position:absolute; bottom:20px; left:20px;">
      採点
    </button>

    <div id="result"
      style="position:absolute; bottom:20px; right:20px;
             background:#222; color:#fff;
             padding:10px 15px; border-radius:8px;">
      ---
    </div>
  `;
}
