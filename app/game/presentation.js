// Camera volumes include roof fixtures and a margin for the camera near plane.
export function obstructionFraction(from, to, buildings, padding = 0.6) {
  let first = 1;
  for (const b of buildings) {
    const lo = [b.x - b.w / 2 - padding, -1, b.z - b.d / 2 - padding];
    const hi = [b.x + b.w / 2 + padding, b.h + 4, b.z + b.d / 2 + padding];
    let enter = 0,
      leave = 1;
    for (const [i, key] of ['x', 'y', 'z'].entries()) {
      const d = to[key] - from[key];
      if (Math.abs(d) < 1e-8) {
        if (from[key] < lo[i] || from[key] > hi[i]) {
          enter = 2;
          break;
        }
      } else {
        const a = (lo[i] - from[key]) / d,
          c = (hi[i] - from[key]) / d;
        enter = Math.max(enter, Math.min(a, c));
        leave = Math.min(leave, Math.max(a, c));
      }
    }
    if (enter <= leave && leave > 0 && enter < first)
      first = Math.max(0, enter);
  }
  return first;
}
export function clearCameraPosition(target, desired, buildings) {
  const fraction = obstructionFraction(target, desired, buildings);
  if (fraction === 1) return { ...desired };
  const length = Math.hypot(
    desired.x - target.x,
    desired.y - target.y,
    desired.z - target.z,
  );
  const t = Math.max(0, fraction - 0.3 / Math.max(length, 0.001));
  return {
    x: target.x + (desired.x - target.x) * t,
    y: target.y + (desired.y - target.y) * t,
    z: target.z + (desired.z - target.z) * t,
  };
}
