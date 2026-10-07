// Use the same source zero as shared AI: the first displayed video PTS, which
// can differ from a container/audio start. Sampling keeps real PTS for VFR too.
export function cameraSampleArgs(input: {path: string; start: number; end: number}, output: string, width: number, height: number, step: number): string[] {
  return ["-hide_banner", "-nostdin", "-loglevel", "info", "-y", "-i", input.path,
    "-map", "0:V:0", "-an", "-sn", "-dn", "-vf",
    `setpts=PTS-STARTPTS,trim=start=${input.start}:end=${input.end},framestep=${step},showinfo=checksum=0,scale=${width}:${height}:flags=area`,
    "-pix_fmt", "rgb24", "-fps_mode", "passthrough", "-f", "rawvideo", output];
}
export function cameraSampleTimes(stderr: string, count: number, start: number, end: number): number[] {
  const base = stderr.match(/config in time_base:\s*(\d+)\/(\d+)/);
  if (!base || !(Number(base[1]) > 0 && Number(base[2]) > 0)) throw new Error("Camera sample time base was unavailable.");
  const unit = Number(base[1]) / Number(base[2]), times: number[] = [];
  for (const line of stderr.split(/\r?\n/)) {
    if (!/showinfo/i.test(line)) continue;
    const match = line.match(/\bn:\s*(\d+)\s+pts:\s*(-?\d+)\s+pts_time:/);
    if (!match) continue;
    const pts = Number(match[2]), time = pts * unit;
    if (Number(match[1]) !== times.length || !Number.isSafeInteger(pts) || !Number.isFinite(time) ||
      time < start - 1e-7 || time >= end || (times.length && time <= times.at(-1)!)) throw new Error("Camera sample source timestamps were incomplete or unordered.");
    times.push(time);
  }
  if (times.length !== count) throw new Error("Camera sample timestamps do not match the decoded frames.");
  return times;
}
