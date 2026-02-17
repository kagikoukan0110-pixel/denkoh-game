// 三路スイッチ内部ロジック

/**
 * 三路スイッチの内部導通を返す
 * @param {string} position  "left" or "right"
 * @returns {Array} 接続されている端子ペア
 */
export function getThreeWayConnections(position) {
  if (position === "left") {
    return [
      ["0", "1"],
      ["1", "0"]
    ];
  }

  if (position === "right") {
    return [
      ["0", "3"],
      ["3", "0"]
    ];
  }

  return [];
}
