export function semanticParts(asset, width, height, metadata) {
  if (metadata == null) {
    if (asset.pieces?.some(piece => piece.motion?.length || piece.exit)) {
      throw new Error(`${asset.id}: per-object motion/exit needs semantic-parts metadata or separate assets`);
    }
    return null;
  }
  if (!asset.pieces?.length || metadata.sourceWidth !== width || metadata.sourceHeight !== height ||
      !Array.isArray(metadata.parts) || metadata.parts.length !== asset.pieces.length) {
    throw new Error(`${asset.id}: semantic-parts dimensions/count must match source PNG and plan pieces`);
  }
  return metadata.parts.map((shape, index) => {
    const fail = () => { throw new Error(`${asset.id}: invalid semantic part ${index + 1}`); };
    if (!shape || Boolean(shape.rect) === Boolean(shape.polygon)) fail();
    let x, y, w, h;
    if (shape.rect) {
      ({x, y, w, h} = shape.rect);
      if (![x, y, w, h].every(Number.isFinite)) fail();
    } else {
      if (!Array.isArray(shape.polygon) || shape.polygon.length < 3 ||
          !shape.polygon.every(point => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite))) fail();
      const xs = shape.polygon.map(point => point[0]), ys = shape.polygon.map(point => point[1]);
      x = Math.min(...xs); y = Math.min(...ys); w = Math.max(...xs) - x; h = Math.max(...ys) - y;
      const twiceArea = shape.polygon.reduce((sum, point, i, points) => {
        const next = points[(i + 1) % points.length]; return sum + point[0] * next[1] - next[0] * point[1];
      }, 0);
      if (Math.abs(twiceArea) < 1e-9) fail();
    }
    if (x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > width || y + h > height) fail();
    return {clip: {sourceWidth: width, sourceHeight: height,
      ...(shape.rect ? {rect: {...shape.rect}} : {polygon: shape.polygon.map(point => [...point])})},
      part: {x: x / width, y: y / height, w: w / width, h: h / height}};
  });
}

export function pieceOnsets(pieces, layerFrom, {step, wordTime, tickAtOrAfter}) {
  let previous = layerFrom;
  return pieces.map(piece => {
    const word = piece.onset?.word ? wordTime(piece.onset.word, piece.onset.at || 'start') : null;
    const raw = piece.onset === 'next' ? previous + step : word ?? layerFrom;
    previous = raw;
    return {raw, from: Math.max(layerFrom, tickAtOrAfter(raw)),
      missingWord: Boolean(piece.onset?.word && word == null)};
  });
}
