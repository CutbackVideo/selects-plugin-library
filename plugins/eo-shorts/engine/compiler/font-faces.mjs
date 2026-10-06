export function roleFiles(f) {
  if (f.system) return [];
  if (f.files) return Object.entries(f.files).map(([w, p]) => ({path: p, weight: String(w)}));
  return [{path: f.path, weight: f.style === 'italic' && !f.variable ? String(f.weight || 400) : '100 900'}];
}

export function executionFont(f, figuresDefault) {
  const files = roleFiles(f), figures = f.figures || figuresDefault;
  return {family: f.family, path: f.path || files[0]?.path, files, style: f.style, weight: f.weight || 400, variable: !!f.variable, system: !!f.system,
    ...(figures && {figures}), ...(f.opticalSize && {opticalSize: f.opticalSize})};
}

export function featureDescriptors(font) {
  return {
    ...(font.figures === 'lining' && {featureSettings: '"lnum" 1'}),
    ...(font.opticalSize && {variationSettings: `"opsz" ${font.opticalSize}`}),
  };
}

export function fontFormat(file) {
  return file.endsWith('.ttf') ? 'truetype' : file.endsWith('.otf') ? 'opentype' : 'woff2';
}

export function fontMime(format) {
  return `font/${format === 'truetype' ? 'ttf' : format}`;
}

export function fontFaceCss(font, file, src, {format = fontFormat(file.path), display} = {}) {
  const d = featureDescriptors(font);
  return `@font-face{font-family:${JSON.stringify(font.family)};src:url(${src}) format('${format}');font-style:${font.style};font-weight:${file.weight};` +
    (d.featureSettings ? `font-feature-settings:${d.featureSettings};` : '') +
    (d.variationSettings ? `font-variation-settings:${d.variationSettings};` : '') +
    (display ? `font-display:${display};` : '') + '}';
}

export function fontFaceDescriptors(font, file) {
  return {style: font.style, weight: file.weight, ...featureDescriptors(font)};
}

export function fileForWeight(font, weight) {
  const w = Number(weight);
  const files = font.files?.length ? font.files : roleFiles(font);
  const hits = files.filter(x => {
    const [lo, hi = lo] = String(x.weight).split(/\s+/).map(Number);
    return String(x.weight).includes(' ') ? lo <= w && w <= hi : lo === w;
  });
  if (hits.length !== 1) throw Error(`font ${font.family}: ${hits.length ? 'several files' : 'no file'} declared for weight ${weight}`);
  return hits[0];
}

export function fontLoads(fonts) {
  return Object.values(fonts).flatMap(f => (f.files.length > 1 ? f.files.map(x => x.weight) : ['400', ...(f.variable ? ['900'] : [])])
    .map(w => `${f.style} ${w} 100px "${f.family}"`));
}
