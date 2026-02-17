export function initBoard(){

  const app = document.getElementById("app");

  app.innerHTML = `
    <svg viewBox="0 0 800 500">

      <rect id="breaker" x="100" y="80" width="60" height="60" fill="#ccc"/>
      <text x="100" y="70">ブレーカー</text>

      <rect id="s1" x="250" y="150" width="60" height="60" fill="#ddd"/>
      <text x="250" y="140">三路1</text>

      <rect id="s2" x="400" y="150" width="60" height="60" fill="#ddd"/>
      <text x="400" y="140">三路2</text>

      <circle id="lamp" cx="650" cy="200" r="20" fill="gray"/>

      <rect id="crimpSmall" x="200" y="300" width="60" height="40" fill="#999"/>
      <text x="210" y="325">小</text>

      <rect id="crimpMedium" x="280" y="300" width="60" height="40" fill="#999"/>
      <text x="290" y="325">中</text>

      <rect id="crimpLarge" x="360" y="300" width="60" height="40" fill="#999"/>
      <text x="370" y="325">大</text>

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
