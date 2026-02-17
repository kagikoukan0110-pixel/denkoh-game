export function initBoard(){

  const app = document.getElementById("app");

  app.innerHTML = `
  <div id="colorBar" style="margin:10px;">
    <button data-color="black">黒</button>
    <button data-color="white">白</button>
    <button data-color="red">赤</button>
  </div>

  <svg viewBox="0 0 900 400">

    <g id="wires"></g>

    <g id="devices">

      <!-- ブレーカー -->
      <circle cx="120" cy="120" r="9" fill="#fff" stroke="#000" stroke-width="2"
        class="terminal" data-id="breaker_L"/>
      <text x="135" y="125" font-size="12">L</text>

      <circle cx="120" cy="160" r="9" fill="#fff" stroke="#000" stroke-width="2"
        class="terminal" data-id="breaker_N"/>
      <text x="135" y="165" font-size="12">N</text>

      <!-- 三路1 -->
      <circle cx="260" cy="160" r="9" fill="#fff" stroke="#000" stroke-width="2"
        class="terminal" data-id="s1_0"/>
      <text x="240" y="165" font-size="12">0</text>

      <circle cx="300" cy="130" r="9" fill="#fff" stroke="#000" stroke-width="2"
        class="terminal" data-id="s1_1"/>
      <text x="315" y="135" font-size="12">1</text>

      <circle cx="300" cy="190" r="9" fill="#fff" stroke="#000" stroke-width="2"
        class="terminal" data-id="s1_3"/>
      <text x="315" y="195" font-size="12">3</text>

      <!-- 三路2 -->
      <circle cx="520" cy="130" r="9" fill="#fff" stroke="#000" stroke-width="2"
        class="terminal" data-id="s2_1"/>
      <text x="500" y="135" font-size="12">1</text>

      <circle cx="520" cy="190" r="9" fill="#fff" stroke="#000" stroke-width="2"
        class="terminal" data-id="s2_3"/>
      <text x="500" y="195" font-size="12">3</text>

      <circle cx="560" cy="160" r="9" fill="#fff" stroke="#000" stroke-width="2"
        class="terminal" data-id="s2_0"/>
      <text x="575" y="165" font-size="12">0</text>

      <!-- ランプ -->
      <circle cx="720" cy="150" r="9" fill="#fff" stroke="#000" stroke-width="2"
        class="terminal" data-id="lamp_L"/>
      <text x="735" y="155" font-size="12">L</text>

      <circle cx="720" cy="190" r="9" fill="#fff" stroke="#000" stroke-width="2"
        class="terminal" data-id="lamp_N"/>
      <text x="735" y="195" font-size="12">N</text>

    </g>

  </svg>
  `;
}
