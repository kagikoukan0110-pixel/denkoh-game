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

      <!-- 三路1本体 -->
      <rect id="s1_body" x="240" y="110" width="90" height="110"
        fill="#e0e0e0" stroke="#999"/>

      <!-- 三路1内部線 -->
      <line id="s1_internal"
        x1="260" y1="160"
        x2="300" y2="130"
        stroke="#555"
        stroke-width="2"/>

      <!-- 三路2本体 -->
      <rect id="s2_body" x="500" y="110" width="90" height="110"
        fill="#e0e0e0" stroke="#999"/>

      <!-- 三路2内部線 -->
      <line id="s2_internal"
        x1="560" y1="160"
        x2="520" y2="130"
        stroke="#555"
        stroke-width="2"/>

      <!-- 端子は前回と同じ -->
      <!-- （省略せずそのまま貼ってOK） -->

      <!-- ブレーカー -->
      <circle cx="120" cy="120" r="9" fill="#fff" stroke="#000" stroke-width="2"
        class="terminal" data-id="breaker_L"/>
      <text x="135" y="125" font-size="12">L</text>

      <circle cx="120" cy="160" r="9" fill="#fff" stroke="#000" stroke-width="2"
        class="terminal" data-id="breaker_N"/>
      <text x="135" y="165" font-size="12">N</text>

      <!-- 三路1端子 -->
      <circle cx="260" cy="160" r="9" fill="#fff" stroke="#000" stroke-width="2"
        class="terminal" data-id="s1_0"/>
      <text x="240" y="165" font-size="12">0</text>

      <circle cx="300" cy="130" r="9" fill="#fff" stroke="#000" stroke-width="2"
        class="terminal" data-id="s1_1"/>
      <text x="315" y="135" font-size="12">1</text>

      <circle cx="300" cy="190" r="9" fill="#fff" stroke="#000" stroke-width="2"
        class="terminal" data-id="s1_3"/>
      <text x="315" y="195" font-size="12">3</text>

      <!-- 三路2端子 -->
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
