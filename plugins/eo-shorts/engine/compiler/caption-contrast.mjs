export function captionStroke(style, layer, copy) {
  const s = style.caption?.stroke;
  if (!s || layer.kind !== 'text' || copy?.role !== 'caption' || layer.font !== style.caption.face) return null;
  return {fill: s.fill, color: s.color, width: s.width};
}

export function strokeApplies(stroke, fill) {
  return !!stroke && String(fill).toUpperCase() === String(stroke.fill).toUpperCase();
}
