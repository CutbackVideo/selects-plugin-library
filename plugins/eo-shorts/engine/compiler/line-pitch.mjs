export function safeInkPitch(previous, next, preferredPitch, gap) {
  const inkPitch = Math.max(0, previous.descent) + Math.max(0, next.ascent) + Math.max(0, gap);
  return Math.max(preferredPitch, inkPitch);
}
