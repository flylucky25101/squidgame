// Swipe values are viewport-normalized, so the same gesture works on phones and PCs.
export function swipeVelocity(dx, dy, seconds) {
  if (![dx, dy, seconds].every(Number.isFinite) || dy > -0.08 || seconds <= 0)
    return null;
  const power = Math.max(0.05, Math.min(1, -dy / 0.65));
  const speedBonus = Math.max(
    -0.6,
    Math.min(0.6, (-dy / seconds - 0.75) * 0.45),
  );
  return {
    vx: Math.max(-8, Math.min(8, (dx / Math.max(0.1, -dy)) * 7)),
    vy: 3.4 + power * 1.8,
    vz: -(10 + power * 9 + speedBonus),
  };
}
export function segmentHitsStone(a, b) {
  // Swept AABB collision prevents fast swipes tunnelling through the upright stone.
  let lo = 0,
    hi = 1;
  for (const [key, min, max] of [
    ['x', -0.6, 0.6],
    ['y', 0, 1.7],
    ['z', -8.55, -7.45],
  ]) {
    const d = b[key] - a[key];
    if (Math.abs(d) < 1e-9) {
      if (a[key] < min || a[key] > max) return false;
    } else {
      const t1 = (min - a[key]) / d,
        t2 = (max - a[key]) / d;
      lo = Math.max(lo, Math.min(t1, t2));
      hi = Math.min(hi, Math.max(t1, t2));
      if (lo > hi) return false;
    }
  }
  return true;
}
