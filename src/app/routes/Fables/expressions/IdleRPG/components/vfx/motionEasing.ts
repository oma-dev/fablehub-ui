/**
 * Maps a signed acceleration value to a cubic-bezier easing curve.
 * 0 = linear, positive = accelerate (ease-in), negative = decelerate (ease-out).
 */
export function getAccelerationEase(acceleration?: number): 'linear' | [number, number, number, number] {
  const raw = typeof acceleration === 'number' ? acceleration : 0
  if (!Number.isFinite(raw) || raw === 0) return 'linear'
  const clamped = Math.max(-3, Math.min(3, raw))
  const t = Math.abs(clamped) / 3
  if (clamped > 0) {
    // Stronger positive values push more movement toward the end.
    return [0.25, 0, 1, 1 - 0.6 * t]
  }
  // Stronger negative values push more movement toward the beginning.
  return [0, 0.6 * t, 0.75, 1]
}
