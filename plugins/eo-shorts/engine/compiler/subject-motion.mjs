export function subjectBox(pose, part) {
  return {x: pose.x + part.x * pose.width, y: pose.y + part.y * pose.height,
    w: part.w * pose.width, h: part.h * pose.height};
}

export function subjectPivot(pose, part, canvas) {
  const box = subjectBox(pose, part);
  const x0 = Math.max(0, box.x), x1 = Math.min(canvas.width, box.x + box.w);
  const y0 = Math.max(0, box.y), y1 = Math.min(canvas.height, box.y + box.h);
  return x1 > x0 && y1 > y0 ? [((x0 + x1) / 2 - pose.x) / pose.width,
    ((y0 + y1) / 2 - pose.y) / pose.height] : [part.x + part.w / 2, part.y + part.h / 2];
}
