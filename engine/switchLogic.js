export function getSwitchConnections(deviceEl) {
  const mode = deviceEl.dataset.mode;

  if (mode === "left") {
    return [["0", "1"]];
  } else {
    return [["0", "3"]];
  }
}
