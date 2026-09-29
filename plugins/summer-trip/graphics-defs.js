// st-graphics:start
// Summer Trip graphics: parameter builders and Adjust (editable parameter) definitions for the two Motion Graphics.
// A plain script: panel.tsx embeds it verbatim (like planner.js) and the tests load it in node:vm. Callers that inline
// these objects into a run_script config should cast them `as any`: inline JSON literals widen string unions.
// Parameters are flat top-level keys because the Inspector edits one top-level key per definition.
const ST_TITLE_GRAPHIC_LABEL = 'Summer Trip title';
const ST_LABELS_GRAPHIC_LABEL = 'Summer Trip labels';
// Layout of the labels differs between the two graphics, as in the reference: during the title the labels sit lower
// (top 12.6%, credit 89.9%, credit uppercase "BY NAME"); from the place title on they sit near the edges (8.6% / 93.0%)
// and the credit keeps the typed case ("By Name"). Sizes are px of a 1080-high frame, positions % of the frame.
const ST_TITLE_LAYOUT = { labelSize: 41, creditSize: 36, topY: 12.6, creditY: 89.9, creditUppercase: true, marginPct: 6, stackGap: 24 };
const ST_LABELS_LAYOUT = {
  labelSize: 40, creditSize: 40, topY: 8.6, creditY: 93.0, creditUppercase: false, marginPct: 6,
  placeSize: 220, placeX: 72.5, placeY: 38.9, prefixScale: 0.43, prefixDrop: 0.38, placeCapRatio: 0.75,
};
const ST_ROLE_KEYS_TITLE = ['line1', 'season', 'label', 'labelItalic'];
const ST_ROLE_KEYS_LABELS = ['label', 'labelItalic', 'place', 'placePrefix'];

function stPreset(presets, presetId) {
  const list = (presets && presets.presets) || [];
  return list.find(p => p.id === presetId) || list[0] || null;
}
// Faces for the given roles ({ family, case, tracking, scaleX, fillWidth }) and the files they need.
function stFacesFor(presets, preset, roleKeys) {
  const faces = {}, files = [];
  for (const key of roleKeys) {
    const role = preset.roles[key];
    const font = presets.fonts[role.file];
    const face = { family: font.family, case: role.case || 'none', tracking: role.tracking || 0, scaleX: role.scaleX || 1 };
    if (role.fillWidth) face.fillWidth = role.fillWidth;
    faces[key] = face;
    if (!files.includes(role.file)) files.push(role.file);
  }
  return { faces, files };
}
// `fontsB64`: { [file]: base64 text } for at least the files of the chosen preset (presets.json `fonts` list).
function stFontParams(presets, files, fontsB64) {
  const out = {};
  for (const file of files) {
    const b64 = fontsB64 && fontsB64[file];
    if (typeof b64 === 'string' && b64) out[presets.fonts[file].family] = b64.replace(/\s+/g, '');
  }
  return out;
}
const stClean = v => (typeof v === 'string' ? v : '');

// Title over [0, drop): times are seconds from the graphic's start.
function stTitleParameters(o) {
  const presets = o.presets, preset = stPreset(presets, o.presetId);
  const { faces, files } = stFacesFor(presets, preset, ST_ROLE_KEYS_TITLE);
  return {
    preset: preset.id,
    line1: stClean(o.line1), season: stClean(o.season),
    wordTimes: (o.wordTimes || []).slice(), seasonPartTime: o.seasonPartTime, seasonFullTime: o.seasonFullTime,
    seasonPartLength: o.seasonPartLength, labelsTime: o.labelsTime,
    topMain: stClean(o.topMain), topItalic: stClean(o.topItalic), creditPrefix: stClean(o.creditPrefix), creditName: stClean(o.creditName),
    creditUppercase: ST_TITLE_LAYOUT.creditUppercase,
    line1Color: preset.colors.line1, seasonColor: preset.colors.season, labelColor: preset.colors.labels, shadow: preset.shadow,
    line1Size: preset.title.line1Size, seasonSize: preset.title.seasonSize, labelSize: ST_TITLE_LAYOUT.labelSize, creditSize: ST_TITLE_LAYOUT.creditSize,
    line1Y: preset.title.line1Y, seasonY: preset.title.seasonY, topY: ST_TITLE_LAYOUT.topY, creditY: ST_TITLE_LAYOUT.creditY,
    marginPct: ST_TITLE_LAYOUT.marginPct, stackGap: ST_TITLE_LAYOUT.stackGap,
    faces, fonts: stFontParams(presets, files, o.fontsB64),
  };
}
// Labels over [place title, ending): `placeSeconds` from the graphic's start (2 beats).
function stLabelsParameters(o) {
  const presets = o.presets, preset = stPreset(presets, o.presetId);
  const { faces, files } = stFacesFor(presets, preset, ST_ROLE_KEYS_LABELS);
  const L = ST_LABELS_LAYOUT;
  return {
    preset: preset.id,
    topMain: stClean(o.topMain), topItalic: stClean(o.topItalic), creditPrefix: stClean(o.creditPrefix), creditName: stClean(o.creditName),
    creditUppercase: L.creditUppercase,
    placePrefix: stClean(o.placePrefix), place: stClean(o.place), placeSeconds: o.placeSeconds,
    labelColor: preset.colors.labels, placeColor: preset.colors.place, shadow: preset.shadow,
    labelSize: L.labelSize, creditSize: L.creditSize, placeSize: L.placeSize,
    topY: L.topY, creditY: L.creditY, placeX: L.placeX, placeY: L.placeY,
    prefixScale: L.prefixScale, prefixDrop: L.prefixDrop, placeCapRatio: L.placeCapRatio, marginPct: L.marginPct,
    faces, fonts: stFontParams(presets, files, o.fontsB64),
  };
}
// Files (presets.json `fonts` keys) a build embeds for a preset: only the chosen preset's fonts.
function stPresetFontFiles(presets, presetId) {
  const preset = stPreset(presets, presetId);
  return preset ? preset.fonts.slice() : [];
}

// Adjust definitions (defaultValue filled from the parameters by stEditable).
const ST_TITLE_EDITABLE = [
  { key: 'line1', label: 'Line 1', type: 'text' },
  { key: 'season', label: 'Season word', type: 'text' },
  { key: 'topMain', label: 'Top label', type: 'text' },
  { key: 'topItalic', label: 'Top label (italic part)', type: 'text' },
  { key: 'creditPrefix', label: 'Credit prefix', type: 'text' },
  { key: 'creditName', label: 'Credit name (empty hides the credit)', type: 'text' },
  { key: 'line1Color', label: 'Line 1 color', type: 'color' },
  { key: 'seasonColor', label: 'Season color', type: 'color' },
  { key: 'labelColor', label: 'Label color', type: 'color' },
  { key: 'shadow', label: 'Shadow', type: 'number', min: 0, max: 1, step: 0.05 },
  { key: 'line1Size', label: 'Line 1 size', type: 'number', min: 40, max: 200, step: 1 },
  { key: 'seasonSize', label: 'Season size', type: 'number', min: 80, max: 700, step: 2 },
  { key: 'labelSize', label: 'Label size', type: 'number', min: 20, max: 80, step: 1 },
  { key: 'line1Y', label: 'Line 1 height (%)', type: 'number', min: 5, max: 95, step: 0.5 },
  { key: 'seasonY', label: 'Season height (%)', type: 'number', min: 5, max: 95, step: 0.5 },
  { key: 'topY', label: 'Top label height (%)', type: 'number', min: 2, max: 50, step: 0.5 },
  { key: 'creditY', label: 'Credit height (%)', type: 'number', min: 50, max: 98, step: 0.5 },
];
const ST_LABELS_EDITABLE = [
  { key: 'placePrefix', label: 'Place prefix', type: 'text' },
  { key: 'place', label: 'Place (empty hides the place title)', type: 'text' },
  { key: 'topMain', label: 'Top label', type: 'text' },
  { key: 'topItalic', label: 'Top label (italic part)', type: 'text' },
  { key: 'creditPrefix', label: 'Credit prefix', type: 'text' },
  { key: 'creditName', label: 'Credit name (empty hides the credit)', type: 'text' },
  { key: 'placeColor', label: 'Place color', type: 'color' },
  { key: 'labelColor', label: 'Label color', type: 'color' },
  { key: 'shadow', label: 'Shadow', type: 'number', min: 0, max: 1, step: 0.05 },
  { key: 'placeSize', label: 'Place size', type: 'number', min: 80, max: 400, step: 2 },
  { key: 'labelSize', label: 'Label size', type: 'number', min: 20, max: 80, step: 1 },
  { key: 'placeX', label: 'Place across (%)', type: 'number', min: 10, max: 90, step: 0.5 },
  { key: 'placeY', label: 'Place height (%)', type: 'number', min: 5, max: 95, step: 0.5 },
  { key: 'topY', label: 'Top label height (%)', type: 'number', min: 2, max: 50, step: 0.5 },
  { key: 'creditY', label: 'Credit height (%)', type: 'number', min: 50, max: 98, step: 0.5 },
];
// Definitions with defaultValue = the parameter's current value.
function stEditable(defs, params) {
  return defs.map(d => Object.assign({}, d, { defaultValue: params[d.key] }));
}
// st-graphics:end
