import {spokenWords, wordTimer, parseMarkup, readingOrderOf, alignWords, onsetTimer} from '../words.mjs';
import {toneTransfer} from './tone-transfer.mjs';
import {safeInkPitch} from './line-pitch.mjs';
import {semanticParts, pieceOnsets} from './semantic-parts.mjs';
import {subjectBox, subjectPivot} from './subject-motion.mjs';
import {executionFont} from './font-faces.mjs';
import {captionStroke} from './caption-contrast.mjs';
import {cos, cbrt} from './libm.mjs';

const W = 1080, H = 1920;

export const executionText = execution => JSON.stringify(execution, null, 1);
export const reportText = report => JSON.stringify(report, null, 2);

export function pictureShape({w, h, rgba: d}) {
  const rows = [], lum = [];
  for (let y = 0; y < h; y++) {
    let lo = -1, hi = -1;
    for (let x = 0; x < w; x++) {
      const k = (y * w + x) * 4;
      if (d[k + 3] > 40) { if (lo < 0) lo = x; hi = x; if ((x + y) % 7 === 0) lum.push(0.299 * d[k] + 0.587 * d[k + 1] + 0.114 * d[k + 2]); }
    }
    rows.push([lo, hi]);
  }
  lum.sort((a, b) => a - b);
  const q = f => lum.length ? lum[Math.floor(f * (lum.length - 1))] : 128;
  return {w, h, rows, levels: {p5: q(0.05), p95: q(0.95), qs: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7].map(q)}};
}

export function joinPath(...parts) {
  const joined = parts.filter(p => p !== '').join('/');
  if (!joined) return '.';
  const absolute = joined.startsWith('/'), trailing = joined.endsWith('/'), out = [];
  for (const seg of joined.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg !== '..') out.push(seg);
    else if (out.length && out.at(-1) !== '..') out.pop();
    else if (!absolute) out.push('..');
  }
  if (!out.length) return absolute ? '/' : trailing ? './' : '.';
  return (absolute ? '/' : '') + out.join('/') + (trailing ? '/' : '');
}

export async function compile({plan, style, pictures, ...rest}, host) {
  const {execution, report} = await compileCopies({...rest, plan: structuredClone(plan), style: structuredClone(style),
    pictures: Object.fromEntries(Object.entries(pictures || {}).map(([id, p]) => [id, p && {...p, semanticParts: structuredClone(p.semanticParts)}]))}, host);
  return {execution: JSON.parse(JSON.stringify(execution)), report: JSON.parse(JSON.stringify(report))};
}

async function compileCopies({plan, style, pictures = {}, sceneDir = '', footageRoot = '', kerning = 'normal'}, host) {
const join = host.join || joinPath;
const CUTTER = typeof host.cutPieces === 'function';
const KERNING = kerning;
const fps = style.fps, N = plan.durationFrames;
const compileWarnings = [], revealReport = [];
function warn(text) { compileWarnings.push(text); host.warn?.(text); }

const fonts = {};
for (const [role, f] of Object.entries(style.fonts)) {
  fonts[role] = executionFont(f, style.type.figures);
}
await host.loadFonts(fonts);
const measureCache = new Map();
async function measure(text, face, size, weight, spacing = 0, wordSpacing = 0) {
  const f = fonts[face], key = JSON.stringify([text, face, size, weight, spacing, wordSpacing]);
  if (measureCache.has(key)) return measureCache.get(key);
  const m = await host.measureText({text, font: `${f.style} ${weight} ${size}px "${f.family}"`, family: f.family, style: f.style, weight, size,
    spacing, wordSpacing, kerning: KERNING});
  measureCache.set(key, m); return m;
}

const assetInfo = {};
for (const a of plan.assets || []) {
  const picture = pictures[a.id];
  if (!picture) throw Error(`plan asset ${a.id}: no picture given`);
  const dim = pictureShape(await host.decodeImage(picture.bytes));
  const metadata = picture.semanticParts ?? null;
  const cutHere = a.pieces?.length && !metadata && CUTTER;
  const demoted = a.pieces?.length && !metadata && !CUTTER && a.pieces.some(pc => pc.motion?.length || pc.exit);
  if (demoted) warn(`${a.id}: per-piece motion and exits need complete-object masks; dropped, the pieces move with the picture`);
  const semantic = cutHere ? null : semanticParts(demoted ? {...a, pieces: a.pieces.map(({motion, exit, ...pc}) => pc)} : a, dim.w, dim.h, metadata);
  assetInfo[a.id] = {...a, ...dim, semanticParts: semantic};
  if (a.pieces?.length && !semantic && !cutHere)
    warn(`${a.id}: no complete-object masks; revealing one whole group at its first onset. Individual stagger needs separate assets or semantic-parts metadata.`);
}
if (CUTTER && (plan.assets || []).some(a => assetInfo[a.id].pieces?.length && !assetInfo[a.id].semanticParts)) {
  const toCut = plan.assets.filter(a => a.pieces?.length && !assetInfo[a.id].semanticParts);
  const cut = await host.cutPieces(toCut.map(a => a.id));
  for (const a of toCut) assetInfo[a.id].rasterCut = cut[a.id];
}
const sequenceMembers = new Set((plan.assets || []).flatMap(a => a.sequence || []));

const spoken = spokenWords(plan.words);
const frameOf = sec => Math.round(sec * fps);
const copyById = Object.fromEntries((plan.copy || []).map(c => [c.id, c]));
parseMarkup(plan.copy);
const readingOrder = readingOrderOf(plan.copy);
alignWords(readingOrder, spoken, frameOf);
const wordTime = wordTimer(spoken, frameOf);
const {onsetOf} = onsetTimer({copyById, readingOrder, wordTime, timing: style.timing});
const unspoken = (what, word, fallback) => {
  if (word != null && wordTime(word) == null) warn(`${what} '${word}' is not spoken; ${fallback}`);
};
for (const c of plan.copy || []) unspoken(`copy ${c.id}: timing.onWord`, c.timing?.onWord, 'its words keep their spoken times');
for (const a of plan.assets || []) unspoken(`picture ${a.id}: anchorWord`, a.anchorWord, 'it lands with its page');
(plan.beats || []).forEach((b, n) => { if (b.with !== 'key-entrance') unspoken(`beats[${n}]: onWord`, b.onWord, 'the beat is dropped'); });
[plan.camera].flat().forEach(cam => unspoken('camera: fromWord', cam?.fromWord, 'the move starts at its default point'));
(plan.shots || []).forEach((sh, k) => unspoken(`shot ${k}: from`, sh.from?.word, 'it starts with the scene'));

const xr = {};
for (const face of Object.keys(fonts)) xr[face] = (await measure('x', face, 100, face === 'sans' ? 400 : fonts[face].weight)).xHeight / 100;
const leadXH = style.type.leadXHeightPx;
const leadSize = leadXH / xr.sans;
function serifItalicFace(weight) {
  const sf = style.fonts.serifItalic, light = style.fonts.serifItalicLight;
  if (light && (light.forWeights || ['light']).includes(weight)) return {face: 'serifItalicLight', weight: light.weight};
  return {face: 'serifItalic', weight: weight === 'regular' || weight === 'light' ? (sf.regularWeight || sf.weight) : weight === 'bold' ? (sf.boldWeight || sf.weight) : sf.weight};
}
function faceOf(c) {
  if (c.role === 'caption') {
    if (c.face === 'serif-italic') return serifItalicFace(c.weight);
    return {face: style.caption.face, weight: c.weight === 'bold' ? (style.caption.boldWeight || 700) : style.caption.weight};
  }
  if (c.role === 'key' || c.role === 'number' || c.face) {
    const face = c.face || (c.role === 'number' ? 'sans-heavy' : style.type.keyFace === 'serifItalic' ? 'serif-italic' : 'sans-heavy');
    if (face === 'serif-italic') return serifItalicFace(c.weight);
    const heavy = style.fonts.sansHeavy ? 'sansHeavy' : 'sans', hf = style.fonts[heavy], sans = style.fonts.sans;
    const w = {light: hf.lightWeight ?? 300, regular: hf.regularWeight ?? sans.leadWeight, bold: hf.boldWeight ?? 700, black: hf.heavyWeight ?? sans.heavyWeight}[c.weight || 'black'];
    return {face: heavy, weight: w};
  }
  return {face: 'sans', weight: c.weight === 'bold' ? 600 : c.weight === 'light' ? 300 : style.fonts.sans.leadWeight};
}
const SIZE = {small: 0.72, normal: 1, large: 1.3, xlarge: 1.5};
const HALF_STEP = style.type.sizeHalfStep || Math.sqrt(SIZE.large);
function sizeStep(name = 'normal') {
  const [, step, half] = /^([a-z]+)([+-]?)$/.exec(name);
  return SIZE[step] * (half === '+' ? HALF_STEP : half === '-' ? 1 / HALF_STEP : 1);
}
const sameXHeight = face => (face === 'serifItalicLight' ? xr.serifItalic / xr.serifItalicLight : 1);
let LEAD_SCALE = 1;
async function sizeOf(c, {cards = null} = {}) {
  const {face, weight} = faceOf(c);
  const width = async (line, li, size) => (cards ? (await measure(line, face, size, weight, keySpacing(size, face), wordSpacingPx(c, face, size))).width
    : (await lineMetrics(c, line, size, li)).width);
  const lines = cards || c.lines;
  if (c.role === 'caption') {
    let size = style.caption.sizePx * (c.face === 'serif-italic' ? (style.caption.emphasisScale || 1.2) : 1) * sizeStep(c.size) * sameXHeight(face);
    const limit = (style.caption.maxWidth || 1) * W;
    for (const [li, line] of lines.entries()) {
      const w = await width(line, li, size);
      if (w > limit) size *= limit / w;
    }
    return size;
  }
  if (c.role === 'lead' || c.role === 'tail') {
    let size = leadSize * (c.role === 'tail' ? 1.1 : 1) * sizeStep(c.size) * LEAD_SCALE * sameXHeight(face);
    for (const [li, line] of lines.entries()) {
      const w = await width(line, li, size);
      const limit = (style.type.leadMaxWidth || 0.72) * W;
      if (w > limit) size *= limit / w;
    }
    return size;
  }
  const targetXH = (style.type.keyXHeightPx || leadXH * style.type.keyXHeightRatio) * sizeStep(c.size);
  let size = targetXH / xr[face];
  for (const [li, line] of lines.entries()) {
    const w = await width(line, li, size);
    const maxW = KEY_MAX ?? style.type.keyMaxWidth;
    if (w > maxW * W) size *= maxW * W / w;
  }
  return size;
}
let KEY_MAX = null;
const keySpacing = (size, face) => (style.fonts[face]?.trackingEm ?? (/^serif/.test(face) ? style.type.keyTrackingEm : style.type.sansKeyTrackingEm) ?? 0) * size;
const WORD_SPACE = {tight: -1, normal: 0, loose: 1};
const wordSpacingPx = (c, face, size) => ((style.fonts[face]?.wordSpacingEm || 0) + (style.type.wordSpaceStepEm || 0) * (WORD_SPACE[c.wordSpace] || 0)) * size;

const C = style.colors;
const TOKEN_FALLBACK = {accentSoft: 'accent', accentDeep: 'accent', floodAlt: 'flood', discAccent: 'accent'};
const tokenKey = token => String(token).replace(/-(\w)/g, (_, x) => x.toUpperCase());
function palette(token) {
  let key = tokenKey(token);
  while (!C[key] && TOKEN_FALLBACK[key]) key = TOKEN_FALLBACK[key];
  if (!C[key]) throw Error(`style ${style.id} has no colour '${token}'`);
  return C[key];
}
const isFlood = ground => ground === 'flood' || ground === 'flood-alt';
const PRINT = (style.printScale || {})[plan.print || 'fine'] ?? 1;
const grounds = [];
const pages = plan.pages || [];
pages.forEach(p => { if (p.groups && !p.items) p.items = p.groups.flatMap(g => g.items || []); });
const pageStart = pages.map((p, i) => i === 0 || p.start === 'scene-start' || !p.start ? (i === 0 ? 0 : null) : wordTime(p.start.word, p.start.at || 'start'));
for (let i = 1; i < pages.length; i++) if (pageStart[i] == null) {
  pageStart[i] = Math.round(N * i / pages.length);
  warn(`page ${i}: ${pages[i].start?.word ? `start word '${pages[i].start.word}' is not spoken` : 'no start word'}; it starts by page count on frame ${pageStart[i]}`);
}
pages.forEach((p, i) => grounds.push({from: pageStart[i], ground: p.ground || 'paper'}));
const deferredBeats = [];
for (const b of plan.beats || []) {
  if (b.with === 'key-entrance') { deferredBeats.push(b); continue; }
  const f = b.at ? wordTime(b.onWord, b.at) : (wordTime(b.onWord) ?? null);
  if (f != null) grounds.push({from: Math.max(0, f + (b.at ? 0 : style.timing.groundFlipOffsetFrames)), ground: b.ground, invert: b.textOnFlip !== 'keep'});
}
pages.forEach((p, i) => {
  if (p.block === 'cards' && Array.isArray(p.cardGrounds)) p.items.forEach((id, k) => {
    if (k === 0 || !p.cardGrounds[k]) return;
    const c = copyById[id]; const t = onsetOf(id, 0, 0) + offsetFor(entranceOf(id, c.role), c.role);
    grounds.push({from: Math.max(pageStart[i], t), ground: p.cardGrounds[k], invert: true});
  });
});
for (const b of deferredBeats) {
  const named = (plan.copy || []).find(c => c.role === 'key' && (!b.onWord || c.lines.join(' ').toLowerCase().includes(String(b.onWord).split('#')[0].toLowerCase())));
  const key = named || (plan.copy || []).find(c => c.role === 'key');
  if (!named) warn(`beat with key-entrance: ${!key ? 'no key, so the beat is dropped' : `no key shows '${b.onWord}'; it flips with ${key.id}`}`);
  if (!key) continue;
  const t = onsetOf(key.id, 0, 0) + offsetFor(entranceOf(key.id, key.role), key.role);
  grounds.push({from: Math.max(0, t), ground: b.ground, invert: b.textOnFlip !== 'keep'});
}
grounds.sort((a, b) => a.from - b.from);
const SCENE_DIR = sceneDir;
const FOOTAGE_ROOT = footageRoot;
const shotList = (plan.shots || []).map((sh, k) => ({...sh, k,
  start: !sh.from || sh.from === 'scene-start' ? 0 : (wordTime(sh.from.word, sh.from.at || 'start') ?? 0)})).sort((a, b) => a.start - b.start);
const insetBox = style.layout.inset || {x: 108, y: 753, w: 874, h: 492, r: 36};
const FOOTAGE = style.footage || {};
const screened = sh => /halftone/.test(sh.treatment);
const FOOTAGE_STEP = style.cadence?.footage;
const footageCadence = style.cadence?.fps < fps && FOOTAGE_STEP && FOOTAGE_STEP !== 'ones' ? {fps: style.cadence.fps, phase: FOOTAGE_STEP.phase ?? style.cadence.phase ?? 0} : null;
const brought = sh => sh.source !== 'podcast';
function gridTick(f, c) {
  const period = fps / c.fps;
  let k = Math.floor((f + c.phase) / period) - 1;
  while (Math.ceil(k * period - c.phase - 1e-9) < f) k++;
  return Math.ceil(k * period - c.phase - 1e-9);
}
const cutAt = sh => (footageCadence && brought(sh) ? gridTick(Math.round(sh.start), footageCadence) : Math.round(sh.start));
const footage = shotList.map((sh, i) => {
  const from = i === 0 ? 0 : Math.max(0, cutAt(sh)), to = i + 1 < shotList.length ? Math.max(from + 1, cutAt(shotList[i + 1])) : N;
  const base = {id: `shot-${sh.k}`, from, to, treatment: sh.treatment || 'none', layout: sh.layout || 'full', move: sh.move || 'none', box: sh.layout === 'inset' ? insetBox : undefined};
  if (FOOTAGE.screenGamma && screened(base)) base.gamma = FOOTAGE.screenGamma;
  if (base.layout === 'inset' && !screened(base)) base.clean = true;
  if (FOOTAGE.screen && screened(base) && base.layout !== 'inset') base.screen = 'footage';
  if (!brought(sh)) return {...base, dir: join(FOOTAGE_ROOT, plan.sceneId), offset: from};
  if (FOOTAGE.grade && (sh.grade || 'film') === 'film') base.grade = FOOTAGE.grade;
  if (footageCadence) base.cadence = footageCadence;
  if (sh.speed === 'slow') {
    if (FOOTAGE.slowRate) base.rate = FOOTAGE.slowRate;
    else warn(`film ${style.id} has no footage.slowRate; shot ${sh.k} plays at normal speed`);
  }
  if (sh.source === 'person') return {...base, dir: join(SCENE_DIR, 'shots', String(sh.k)), still: true, file: 'still.jpg'};
  return {...base, dir: join(SCENE_DIR, 'shots', String(sh.k), 'frames'), offset: 0};
});
const onFootageAt = f => footage.some(x => x.layout !== 'inset' && f >= x.from && f < x.to);

const groundAt = f => [...grounds].reverse().find(g => f >= g.from) || grounds[0];
function textColour(c, ground, atFrame = 0) {
  if (c.role === 'caption') return c.colour && c.colour !== 'ink' ? palette(c.colour) : (onFootageAt(atFrame) ? (C.caption || '#FFFFFF') : C.ink);
  if (c.colour === 'money') return C.money;
  if (isFlood(ground)) return c.role === 'key' ? C.accentOnFlood : C.reversed;
  if (c.colour) return palette(c.colour);
  return c.role === 'key' ? C.accent : C.ink;
}

const layers = [];
let z = 10;
const pageEnd = i => (i + 1 < pages.length ? pageStart[i + 1] : N);
const LAYERS_CUT = plan.ending === 'clear' ? N - 2 : plan.ending === 'cut-to-black' ? N - 1 : N;

async function runMetrics(c, text, size) {
  const {face, weight} = faceOf(c);
  const spacing = c.role === 'key' || c.role === 'number' ? keySpacing(size, face) : 0, wordSpacing = wordSpacingPx(c, face, size);
  const m = await measure(text, face, size, weight, spacing, wordSpacing);
  return {face, weight, size, spacing, wordSpacing, width: m.width, ascent: m.ascent, descent: m.descent, xh: m.xHeight};
}

const lookOf = c => (c.emphasis ? {...c, ...c.emphasis} : {...c, face: undefined, weight: undefined, colour: undefined});
function emphasisSize(c, look, size) {
  const [from, to] = [faceOf(c).face, faceOf(look).face];
  if (c.role !== 'caption') return size * xr[from] / xr[to];
  const grow = x => (x.face === 'serif-italic' ? (style.caption.emphasisScale || 1.2) : 1);
  return size * grow(look) / grow(c) * sameXHeight(to) / sameXHeight(from);
}

async function lineMetrics(c, line, size, li = 0) {
  const base = await runMetrics(c, line, size), marks = c.emph?.[li] || [];
  if (!marks.some(Boolean)) return base;
  const words = line.split(/\s+/).filter(Boolean), look = lookOf(c), space = (await runMetrics(c, ' ', size)).width;
  const placed = [];
  let x = 0, ascent = 0, descent = 0;
  for (let i = 0, j; i < words.length; i = j) {
    for (j = i; j < words.length && marks[j] === marks[i];) j++;
    const runC = marks[i] ? look : c, runSize = marks[i] ? emphasisSize(c, look, size) : size;
    for (let k = i; k < j; k++) {
      const before = k > i ? (await runMetrics(runC, words.slice(i, k).join(' ') + ' ', runSize)).width : 0;
      placed.push({...(await runMetrics(runC, words[k], runSize)), x: x + before, look: runC});
    }
    const run = await runMetrics(runC, words.slice(i, j).join(' '), runSize);
    ascent = Math.max(ascent, run.ascent); descent = Math.max(descent, run.descent);
    x += run.width + (j < words.length ? space : 0);
  }
  return {...base, width: x, ascent, descent, words: placed};
}

let SPACING = 1;
function pitchBetween(a, b) {
  let preferred;
  if (a.role === 'caption' && b.role === 'caption' && style.caption.leadingXH) preferred = style.caption.leadingXH * (a.m.xh + b.m.xh) / 2 * SPACING;
  else if (a.c === b.c && (a.role === 'key' || a.role === 'number')) preferred = (style.type.keyLeadingXH || 1.6) * a.m.xh * SPACING;
  else if (a.c === b.c) preferred = style.type.leadPitchXH * leadXH * Math.min(SPACING, 1.25);
  else if (a.role !== 'key' && b.role !== 'key' && a.role !== 'number' && b.role !== 'number') preferred = style.type.leadPitchXH * leadXH * SPACING;
  else preferred = a.m.descent + b.m.ascent + style.type.leadToKeyGapXH * leadXH * (SPACING > 1 ? SPACING * 3 : SPACING);
  const gap = style.type.leadToKeyGapXH * leadXH * Math.min(SPACING, 1.25);
  return safeInkPitch(a.m, b.m, preferred, gap);
}

async function stackLines(items, opts) {
  const rows = [];
  for (const id of items) {
    const c = copyById[id]; if (!c) continue;
    const size = await sizeOf(c);
    for (let li = 0; li < c.lines.length; li++) rows.push({c, li, role: c.role, text: c.lines[li], m: await lineMetrics(c, c.lines[li], size, li)});
  }
  let y = 0;
  rows.forEach((r, i) => { if (i) y += pitchBetween(rows[i - 1], r); r.baseline = y; });
  const top = rows.length ? rows[0].baseline - rows[0].m.ascent : 0;
  const bottom = rows.length ? rows[rows.length - 1].baseline + rows[rows.length - 1].m.descent : 0;
  return {rows, top, bottom, width: Math.max(0, ...rows.map(r => r.m.width))};
}

function placeRowsX(stack, align, keyAlign, centreX = W / 2, edges = {}) {
  const leadRows = stack.rows.filter(r => r.role !== 'key');
  const leadWidth = Math.max(0, ...leadRows.map(r => r.m.width));
  const blockW = stack.width;
  const left = align === 'left' ? edges.left ?? style.layout.leftMargin * W
    : align === 'right' ? (edges.right ?? W - style.layout.leftMargin * W) - blockW : centreX - blockW / 2;
  for (const r of stack.rows) {
    if (align === 'center-lines') { r.x = centreX - r.m.width / 2; r.anchor = 'middle'; }
    else if (align === 'right') { r.x = left + blockW - r.m.width; r.anchor = 'end'; }
    else { r.x = left; r.anchor = align === 'center' && stack.rows.length === 1 ? 'middle' : 'start'; }
    if (r.role === 'key' && keyAlign === 'center') { r.x = centreX - r.m.width / 2; r.anchor = 'middle'; }
    if (r.role === 'key' && keyAlign === 'right-to-lead' && leadRows.length) { r.x = left + Math.max(leadWidth, r.m.width) - r.m.width + (leadWidth < r.m.width ? 0 : 0); r.anchor = 'end'; }
  }
}

function placeStackX(st, align, keyAlign, edges = {}) {
  if (align === 'justify') {
    const measure = Math.max(...st.rows.filter(r => r.role === 'key').map(r => r.m.width), (style.layout.measure || 0.81) * W);
    const left = (W - measure) / 2;
    st.rows.forEach(r => { r.x = left; r.anchor = 'start'; if (r.text.trim().split(/\s+/).length > 1) r.justifyTo = measure; });
  } else if (align === 'staircase') {
    const n = st.rows.length, m = style.layout.leftMargin * W;
    st.rows.forEach((r, k) => {
      const f = n > 1 ? k / (n - 1) : 0.5;
      r.x = m + f * (W - 2 * m - r.m.width); r.anchor = f < 1 / 3 ? 'start' : f > 2 / 3 ? 'end' : 'middle';
    });
  } else if (align === 'picture-left') placeRowsX(st, 'left', keyAlign, W / 2, {left: edges.left});
  else if (align === 'picture-right') placeRowsX(st, 'right', keyAlign, W / 2, {right: edges.right});
  else placeRowsX(st, align, keyAlign);
}

async function emitRows(rows, pageIndex) {
  for (const r of rows) {
    const words = r.text.split(/\s+/).filter(Boolean);
    if (entranceOf(r.c.id, r.c.role) === 'typewriter' && (r.c.scope || 'word') !== 'word') {
      if (!r.m.words) { await emitWord(r, 0, r.text, r.x, r.baseline, pageIndex); continue; }
      const line = words.join(' ');
      for (let i = 0, j; i < words.length; i = j) {
        for (j = i; j < words.length && r.m.words[j].look === r.m.words[i].look;) j++;
        const typed = {at: i ? words.slice(0, i).join(' ').length + 1 : 0, of: line.length};
        await emitWord(r, i, words.slice(i, j).join(' '), r.x + r.m.words[i].x, r.baseline, pageIndex, r.m.words[i], typed);
      }
      continue;
    }
    let prefix = '', extra = 0;
    if (r.justifyTo && words.length > 1) extra = Math.max(0, (r.justifyTo - r.m.width) / (words.length - 1));
    for (let wi = 0; wi < words.length; wi++) {
      if (r.m.words) {
        await emitWord(r, wi, words[wi], r.x + r.m.words[wi].x + extra * wi, r.baseline, pageIndex, r.m.words[wi]);
        continue;
      }
      const before = prefix ? (await measure(prefix + ' ', r.m.face, r.m.size, r.m.weight, r.m.spacing, r.m.wordSpacing)).width : 0;
      prefix = prefix ? prefix + ' ' + words[wi] : words[wi];
      await emitWord(r, wi, words[wi], r.x + before + extra * wi, r.baseline, pageIndex);
    }
  }
}

function entranceOf(id, role) {
  const e = (plan.entrances || {})[id];
  if (e) return e;
  if (role === 'caption') return (style.timing.caption || {}).entrance || 'pop';
  if (role === 'key') return style.timing.key.entrance;
  if (role === 'number') return style.timing.number.entrance;
  return style.timing.lead.entrance;
}

const PRESET = {
  fade: {fadeFrames: 2, opacityFrom: 0, curve: 'linear'},
  'blur-rise': {dir: 'up', distanceXH: 0.4, moveFrames: 4.8, fadeFrames: 4.8, blur: 8, opacityFrom: 0.15, curve: 'expo'},
  'blur-rise-short': {dir: 'up', distanceXH: 0.13, moveFrames: 4, fadeFrames: 4, blur: 3, opacityFrom: 0.78, curve: 'expo'},
  rise: {dir: 'up', distanceXH: 0.3, moveFrames: 3, fadeFrames: 2, opacityFrom: 0, curve: 'linear'},
  'slide-up': {dir: 'up', distanceXH: 0.3, moveFrames: 3, fadeFrames: 0, curve: 'linear'},
  'blur-in': {fadeFrames: 4, blur: 8, opacityFrom: 0.3, curve: 'expo'},
  'rack-focus': {fadeFrames: 5, blur: 15, opacityFrom: 1, curve: 'expo'},
};
const STILL = {fadeFrames: 0, curve: 'linear'};
const ENTER_CURVE = {expo: 'expo', 'ease-out': 'out2', linear: 'linear', smooth: 'smooth'};
const CURVES = {linear: p => p, out2: p => 1 - (1 - p) * (1 - p), smooth: p => p * p * (3 - 2 * p), expo: p => (1 - Math.pow(27, -p)) / (1 - 1 / 27)};

function entranceParams(kind, role, enter) {
  const S = style.entrance || {}, film = (S.presets || {})[kind] || {};
  if (!PRESET[kind] && !(enter && (kind === 'pop' || kind === 'count-up'))) return null;
  const p = {...(PRESET[kind] || STILL), ...film, ...(film.roles || {})[role]};
  delete p.roles;
  if (role === 'asset' && p.distanceXH) p.distanceXH = 1;
  if (!enter) return p;
  const step = (scale, v) => { const n = (S.steps || {})[scale]?.[v]; if (n == null) throw Error(`style.entrance.steps.${scale} has no '${v}'`); return n; };
  if (enter.dir) {
    p.dir = enter.dir;
    if (!p.distanceXH) p.distanceXH = step('distance', 'short');
    if (!p.moveFrames) p.moveFrames = p.fadeFrames || step('move', 'quick');
  }
  if (enter.distance) p.distanceXH = step('distance', enter.distance);
  if (enter.move) p.moveFrames = step('move', enter.move);
  if (enter.fade) {
    p.fadeFrames = step('fade', enter.fade);
    if (p.fadeFrames && (p.opacityFrom ?? 0) >= 1 && !p.blur) p.opacityFrom = 0;
  }
  if (enter.blur) p.blur = step('blur', enter.blur);
  if (enter.curve) p.curve = ENTER_CURVE[enter.curve];
  return p;
}

function paramKeys(p, t, x, y, xh) {
  const F = p.fadeFrames || 0, d = p.dir && p.dir !== 'none' && p.moveFrames ? (p.distanceXH || 0) * xh : 0, M = d ? p.moveFrames : 0;
  const [dx, dy] = {up: [0, d], down: [0, -d], left: [d, 0], right: [-d, 0]}[p.dir] || [0, 0];
  const o = F ? (p.opacityFrom ?? 0) : 1, b = F ? (p.blur || 0) : 0, D = Math.max(F, M);
  if (!D) return [{frame: t, x, y, opacity: 1}];
  const pose = (tau, curve) => {
    const ease = CURVES[p.curve] || CURVES.linear, qm = M ? ease(Math.min(1, tau / M)) : 1, qf = F ? ease(Math.min(1, tau / F)) : 1;
    const k = {frame: t + tau, x: x + dx * (1 - qm), y: y + dy * (1 - qm), opacity: o + (1 - o) * qf, curve};
    if (b) k.blur = b * (1 - qf);
    return k;
  };
  const start = {frame: t, x: x + dx, y: y + dy, opacity: o}, end = {frame: t + D, x, y, opacity: 1, curve: p.curve};
  if (b) { start.blur = b; end.blur = 0; }
  if (!F || !M || F === M) return [start, end];
  if ((p.curve || 'linear') === 'linear') return [start, pose(Math.min(F, M), 'linear'), end];
  const keys = [start];
  for (let tau = 1; tau < D; tau++) keys.push(pose(tau, 'linear'));
  return [...keys, {...end, curve: 'linear'}];
}

function entranceKeys(kind, t, x, y, xh, role = 'key', enter = null, lead = 0) {
  if (kind === 'present') return {from: t, keys: [{frame: t, x, y, opacity: 1}]};
  if (kind === 'flicker-on') {
    const t0 = tickAtOrAfter(t), keys = [{frame: t0, x, y, opacity: 1}];
    [[1, 0], [3, 1], [4, 0], [5, 1], [6, 0], [7, 1]].forEach(([k, o]) => keys.push({frame: tickN(t0, k), x, y, opacity: o, curve: 'cut'}));
    return {from: t0, keys};
  }
  const p = entranceParams(kind, role, enter);
  if (!p) return {from: t, keys: [{frame: t, x, y, opacity: 1}]};
  const keys = paramKeys(p, t, x, y, xh);
  if (keys.length > 1) keys.forEach(k => { k.frame -= lead; });
  return {from: t, keys};
}

function offsetFor(kind, role) {
  if (kind === 'typewriter') return (style.timing.typewriter || {}).offsetFrames ?? 0;
  if (role === 'caption') return (style.timing.caption || {}).offsetFrames ?? 0;
  if (role === 'key') return style.timing.key.offsetFrames;
  if (role === 'number') return style.timing.number.offsetFrames;
  return style.timing.lead.offsetFrames;
}

const TICK = style.cadence?.fps ? fps / style.cadence.fps : 1;
const CAPTIONS_ON_ONES = style.cadence?.captions === 'ones';
const TEXT_ON_ONES = TICK > 1 && (plan.textCadence === 'ones' || style.cadence?.text === 'ones');
const flashAt = f => footage.some(x => x.to - x.from === 1 && x.from === f);
function captionTick(f) {
  let t = CAPTIONS_ON_ONES ? Math.max(0, Math.round(f)) : tickAtOrAfter(f);
  while (flashAt(t)) t = CAPTIONS_ON_ONES ? t + 1 : tickN(t, 1);
  return t;
}
const tickFor = role => (role === 'caption' ? captionTick : TEXT_ON_ONES ? f => Math.max(0, Math.round(f)) : tickAtOrAfter);
const TICK_LEAD = TICK > 1 ? (style.entrance?.tickLeadFrames || 0) : 0;
const tickAtOrAfter = f => {
  if (TICK <= 1) return Math.round(f);
  let k = Math.floor((f + 1e-9) / TICK), t = Math.ceil(k * TICK - 1e-9);
  if (t > f + 1e-9) t = Math.ceil((k - 1) * TICK - 1e-9);
  return Math.max(0, t);
};
const tickIndex = f => { for (let k = Math.floor(f / TICK) - 1; k <= Math.floor(f / TICK) + 1; k++) if (Math.ceil(k * TICK - 1e-9) === f) return k; return Math.round(f / TICK); };
const tickN = (t0, k) => (TICK > 1 ? Math.ceil((tickIndex(t0) + k) * TICK - 1e-9) : t0 + k);
const cutTick = f => { if (TICK <= 1) return Math.round(f); const t = tickAtOrAfter(f); return t >= f - 1e-9 ? t : tickN(t, 1); };

function startOf(c, kind, onset, pageIndex) {
  const p = pages[pageIndex], p0 = pageStart[pageIndex];
  if (kind === 'present') return p0;
  if (c.role === 'caption' && (style.timing.caption || {}).firstOnPageStart && p.block === 'captions' && (p.items || [])[0] === c.id && onset <= p0) return p0;
  return Math.max(p0, onset + offsetFor(kind, c.role));
}

async function emitWord(r, wi, text, x, y, pageIndex, w = r.m, typed = null) {
  const c = r.c, kind = entranceOf(c.id, c.role), look = w.look || c;
  const onset = onsetOf(c.id, r.li, typed ? 0 : wi);
  const ones = c.role === 'caption' ? CAPTIONS_ON_ONES : TEXT_ON_ONES && kind !== 'flicker-on';
  const cut = r.cutAt ?? pageStart[pageIndex];
  const start = Math.max(tickFor(c.role)(startOf(c, kind, onset, pageIndex)), ones ? Math.round(cut) : cutTick(cut));
  const t = ones && c.role !== 'caption' ? Math.max(start, cutTick(cut)) : start;
  const motion = Math.min(t, c.scope === 'line-join' ? tickFor(c.role)(startOf(c, kind, onsetOf(c.id, r.li, 0), pageIndex)) : start);
  const entrance = entranceKeys(kind, Math.min(motion, N - 2), x, y, w.xh, c.role, c.enter, ones ? 0 : TICK_LEAD);
  const keys = entrance.keys, from = motion < t ? Math.min(t, N - 2) : entrance.from;
  const to = pageEnd(pageIndex);
  const flips = grounds.filter(g => g.from > from && g.from < to && g.invert !== false).map(g => g.from);
  const colorKeys = [from, ...flips].map(f => ({from: f, color: textColour(look, groundAt(f).ground, f)}));
  {
    const layer = {id: `${c.id}-${r.li}-${wi}`, kind: 'text', copyId: c.id, text, font: w.face, size: w.size, weight: w.weight,
      spacing: w.spacing || 0, color: colorKeys[0].color, colorKeys: colorKeys.length > 1 ? colorKeys : undefined,
      from, to, z: z++, keyframes: keys, fitWidth: Math.ceil(r.m.width + 200)};
    if (ones) layer.cadence = 'ones';
    if (kind === 'typewriter') {
      const runs = [], {at = 0, of = text.length} = typed || {};
      for (let i = 0; i < text.length; i++) {
        const adv = (await measure(text.slice(0, i + 1), w.face, w.size, w.weight, 0, w.wordSpacing)).width - (i ? (await measure(text.slice(0, i), w.face, w.size, w.weight, 0, w.wordSpacing)).width : 0);
        const tw = style.timing.typewriter || {charsPerSecond: 37};
        let perChar = fps / tw.charsPerSecond;
        if ((c.scope || 'word') !== 'word') {
          const lineWords = readingOrder.filter(w => w.copyId === c.id && w.li === r.li);
          const span = Math.max(...lineWords.map(w => w.end ?? w.onset + 3)) - Math.min(...lineWords.map(w => w.onset));
          perChar = Math.max(fps / (tw.charsPerSecond * 1.3), Math.min(fps / (tw.charsPerSecond * 0.5), span / of));
        }
        runs.push({text: text[i], at: Math.round((at + i) * perChar), advance: adv});
      }
      const tw = style.timing.typewriter || {};
      layer.reveal = {mode: 'word-assembly', durationFrames: tw.settleFrames || 0, opacityFrom: tw.opacityFrom ?? 1, offsetY: 0, blur: tw.blur || 0, runs};
    }
    if (countOf(c, kind) && kind !== 'typewriter' && FIGURE.test(text)) {
      const n = r.text.split(/\s+/).filter(Boolean).length;
      const anchor = n === 1 ? r.anchor || 'start' : wi === 0 ? 'end' : wi === n - 1 ? 'start' : 'middle';
      const shift = {start: 0, middle: 0.5, end: 1}[anchor] * (await measure(text, w.face, w.size, w.weight, w.spacing || 0, w.wordSpacing || 0)).width;
      keys.forEach(k => { k.x += shift; });
      if (anchor !== 'start') layer.anchor = anchor;
      layer.countOf = c.id;
    }
    layers.push(layer);
  }
}

const FIGURE = /^([^0-9]*)([0-9][0-9,]*(?:\.[0-9]+)?)([^0-9]*)$/;
const COUNT = style.count || {};
const countOf = (c, kind) => c.count || (kind === 'count-up' ? {} : null);
const figureValue = s => Number(String(s).match(/[0-9][0-9,]*(?:\.[0-9]+)?/)[0].replaceAll(',', ''));
function countFrom(spec, target) {
  if (spec.from && spec.from !== 'zero') return figureValue(spec.from);
  if (spec.direction !== 'down') return 0;
  const x = target * (COUNT.countdownFrom ?? 10), p = 10 ** Math.floor(Math.log10(x));
  return [1, 2, 2.5, 5, 10].map(k => k * p).find(v => v >= x * (1 - 1e-9));
}
function countEnd(l, end, seen = []) {
  const c = copyById[l.countOf], spec = (c.count || {})[end], next = [...seen, `${c.id}.${end}`];
  if (seen.includes(next.at(-1))) throw Error(`copy ${c.id}: count.${end} waits on itself (${next.join(' -> ')})`);
  if (spec?.with) {
    const other = layers.find(x => x.countOf === spec.with);
    if (!other) throw Error(`copy ${c.id}: count.${end}.with '${spec.with}' is not a counting figure`);
    return countEnd(other, end, next);
  }
  if (spec === 'scene-start') return 0;
  if (spec === 'scene-end') return tickAtOrAfter(LAYERS_CUT - 1 - (COUNT.endHoldFrames ?? 1));
  if (spec?.word) {
    const f = wordTime(spec.word, spec.at || 'start');
    if (f != null) return f;
    warn(`copy ${c.id}: count.${end} word '${spec.word}' is not spoken`);
  }
  return end === 'land' ? countEnd(l, 'start', next) + (COUNT.durationFrames ?? 8) : l.from;
}
function resolveCounters() {
  const counting = layers.filter(l => l.countOf);
  const motions = counting.map(l => {
    const spec = copyById[l.countOf].count || {}, figure = FIGURE.exec(l.text)[2];
    const start = countEnd(l, 'start'), land = countEnd(l, 'land');
    if (land <= start) warn(`copy ${l.countOf}: count lands before it starts`);
    const m = {mode: 'count-up', from: countFrom(spec, figureValue(figure)), durationFrames: Math.max(1, land - start)};
    const to = Math.min(l.to, layersCutFor(l)), landed = start + m.durationFrames, shown = l.cadence === 'ones' ? landed : cutTick(landed);
    if (shown >= to) warn(`copy ${l.countOf}: count would first show its figure on frame ${shown}, but the item is gone from frame ${to} (a later page, card or caption group replaces it, or the scene clears): it never lands`);
    if (start !== l.from) m.delayFrames = start - l.from;
    const places = spec.decimals ? {none: 0, one: 1, two: 2}[spec.decimals] : (figure.split('.')[1] || '').length;
    if (places) m.decimals = places;
    return m;
  });
  counting.forEach((l, i) => { l.numberMotion = motions[i]; delete l.countOf; });
}

const RIM = style.image.rim || {};
const rimSize = a => ((a.rim || 'none') === 'cut-paper' ? (RIM.size || 0) * PRINT : 0);
function rampFor(hue) {
  const named = (style.image.hues || {})[hue];
  if (named) return named;
  if (!C[tokenKey(hue)] && !TOKEN_FALLBACK[tokenKey(hue)]) return null;
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const [dark, mid, light] = [C.ink, palette(hue), C.paper].map(rgb);
  const at = (0.299 * mid[0] + 0.587 * mid[1] + 0.114 * mid[2]) / 255;
  return Array.from({length: 9}, (_, i) => {
    const t = i / 8, [a, b, f] = t <= at ? [dark, mid, t / at] : [mid, light, (t - at) / (1 - at)];
    return '#' + a.map((v, k) => Math.round(v + (b[k] - v) * f).toString(16).padStart(2, '0')).join('').toUpperCase();
  });
}
function pictureMaterial(a) {
  const tone = a.tone || style.image.tone, I = style.image, nat = (tone === 'faded' && I.faded) || I.natural || {};
  const material = {mode: 'natural', saturation: tone === 'greyscale' || tone === 'duotone' ? 0 : (nat.saturation ?? 1), contrast: 1.05, brightness: 0, soften: nat.soften || 0};
  if (tone === 'drawn') Object.assign(material, {saturation: 1, contrast: 1, soften: 0});
  const range = {greyscale: I.greyscaleRange || [40, 225], natural: nat.range, faded: nat.range, duotone: (I.duotone || {}).range || [0, 255]}[tone];
  if (I.levels === 'picture') {
    if (range) {
      const [lo, hi] = range, L = a.levels, black = tone === 'greyscale' && I.blackFraction ? L.qs[Math.max(0, Math.min(6, Math.round(I.blackFraction * 10) - 1))] : L.p5;
      const slope = (hi - lo) / Math.max(20, L.p95 - black);
      material.contrast = slope; material.brightness = (lo - black * slope) / 255;
    }
  } else Object.assign(material, toneTransfer(tone, range));
  if (tone === 'duotone') {
    const hue = a.hue || (I.duotone || {}).hue || 'accent';
    material.ramp = rampFor(hue);
    if (!material.ramp) {
      warn(`film ${style.id} has no picture hue '${hue}'`);
      material.ramp = rampFor((I.duotone || {}).hue || 'accent');
    }
  }
  if (rimSize(a) > 0) material.paperEdge = {size: rimSize(a), wobble: (RIM.wobble || 0) * PRINT, wobbleFrequency: RIM.wobbleFrequency, color: C.rim, x: 0, y: 0, seed: 7,
    line: RIM.line ? {size: RIM.line.size, color: C.rimLine, opacity: RIM.line.opacity} : null};
  const e = a.rim === 'offset-edge' && RIM.offsetEdge;
  if (e) material.paperEdge = {size: e.size * PRINT, wobble: 0, color: palette(e.colour || 'rim'), x: e.x * PRINT, y: e.y * PRINT, seed: 7, line: null};
  else if (a.rim === 'offset-edge') warn(`film ${style.id} has no offset edge`);
  return material;
}

const MOTION = style.motion || {};
const EASE = {linear: p => p, in2: p => p * p, out2: p => 1 - (1 - p) * (1 - p), 'in-out': p => (1 - cos(Math.PI * p)) / 2};
const DIRS = {left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1], 'up-left': [-1, -1], 'up-right': [1, -1], 'down-left': [-1, 1], 'down-right': [1, 1]};
const POSE_CURVES = {...CURVES, cut: p => (p >= 1 ? 1 : 0), out: p => 1 - (1 - p) ** 3, in: p => p ** 3, steps: p => Math.floor(p * 5) / 5, in2: p => p * p};
function poseOf(keys, f) {
  let pose = {x: 0, y: 0, width: 0, height: 0, scale: 1, rotation: 0, opacity: 1, blur: 0, ...keys[0]};
  for (let i = 1; i < keys.length; i++) {
    const next = {...pose, ...keys[i]};
    if (f >= next.frame) { pose = next; continue; }
    const q = POSE_CURVES[next.curve || 'cut'](Math.max(0, Math.min(1, (f - pose.frame) / (next.frame - pose.frame)))), mid = {...pose};
    for (const k of ['x', 'y', 'width', 'height', 'scale', 'rotation', 'opacity', 'blur']) mid[k] = pose[k] + (next[k] - pose[k]) * q;
    pose = mid; break;
  }
  return pose;
}
const tickTime = f => (TICK > 1 && Math.ceil(tickIndex(f) * TICK - 1e-9) === f ? tickIndex(f) * TICK : f);
const spanAnchor = spec => (spec === 'scene-start' ? 0 : spec === 'scene-end' ? LAYERS_CUT - 1 : spec?.word ? wordTime(spec.word, spec.at || 'start') : null);
function motionSpan(m, layer, what) {
  const kind = (MOTION.types || {})[m.type] || {};
  let t0 = m.from ? spanAnchor(m.from) : layer.from;
  if (t0 == null) { warn(`${what}: motion from word '${m.from.word}' is not spoken; it starts with the picture`); t0 = layer.from; }
  let t1 = m.to ? spanAnchor(m.to) : kind.frames ? t0 + kind.frames : Math.min(layer.to, LAYERS_CUT) - 1;
  if (t1 == null || t1 <= t0) { warn(`${what}: motion ${m.type} ends before it starts; it takes the film's length`); t1 = t0 + (kind.frames || 8); }
  const lead = m.preRoll === 'short' ? MOTION.preRollFrames || 0 : m.preRoll === 'half' ? t1 - t0 : 0;
  return {t0: t0 - lead, t1, ease: EASE[m.ease || kind.ease || 'linear']};
}
const rimReach = material => {
  const e = material?.paperEdge;
  return e ? e.size + (e.wobble || 0) + Math.max(Math.abs(e.x || 0), Math.abs(e.y || 0)) + (e.line?.size || 0) : 0;
};
let motionCamera = null;
function seenOver(a, b) {
  if (!motionCamera) return {x0: 0, y0: 0, x1: W, y1: H};
  const {pivot: o, keyframes: keys} = motionCamera, r = {x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity};
  const lo = Math.min(N - 1, Math.max(0, Math.floor(a))), hi = Math.min(N - 1, Math.max(lo, Math.ceil(b)));
  for (let f = lo; f <= hi; f++) {
    const c = poseOf(keys, tickAtOrAfter(f)), s = c.scale || 1;
    r.x0 = Math.min(r.x0, o.x - (o.x + c.x) / s); r.x1 = Math.max(r.x1, o.x + (W - o.x - c.x) / s);
    r.y0 = Math.min(r.y0, o.y - (o.y + c.y) / s); r.y1 = Math.max(r.y1, o.y + (H - o.y - c.y) / s);
  }
  return r;
}
function offFrameDistance(u, box, parts, seen) {
  return Math.max(0, ...parts.map(({part: q, material}) => {
    const pad = rimReach(material), x0 = box.x + q.x * box.w, y0 = box.y + q.y * box.h, x1 = x0 + q.w * box.w, y1 = y0 + q.h * box.h, t = [];
    if (u[0] > 1e-6) t.push((seen.x1 - x0 + pad) / u[0]); else if (u[0] < -1e-6) t.push((x1 + pad - seen.x0) / -u[0]);
    if (u[1] > 1e-6) t.push((seen.y1 - y0 + pad) / u[1]); else if (u[1] < -1e-6) t.push((y1 + pad - seen.y0) / -u[1]);
    return t.length ? Math.min(...t) : 0;
  }));
}
const distanceOf = m => m.distance || (m.type === 'exit' ? 'off-frame' : 'short');
function motionDistance(m, u, box, off) {
  const distance = distanceOf(m);
  if (distance === 'off-frame') return offFrameDistance(u, box, off.parts, off.seen);
  if (distance === 'across') {
    const margin = 2 * (MOTION.acrossMargin || 0) * W, t = [];
    if (Math.abs(u[0]) > 1e-6) t.push((Math.abs(box.w - W) + margin) / Math.abs(u[0]));
    if (Math.abs(u[1]) > 1e-6) t.push((Math.abs(box.h - H) + margin) / Math.abs(u[1]));
    return t.length ? Math.max(...t) : 0;
  }
  return ((MOTION.distance || {})[distance] ?? 0) * W;
}
function applyMotion(layer, tracks, what, {origin = () => ({x: W / 2, y: H / 2}), parts = [{part: WHOLE, material: layer.material}], subject = WHOLE} = {}) {
  if (!tracks?.length) return;
  const base = layer.keyframes, clock = TICK > 1 && layer.cadence !== 'ones' ? tickTime : f => f;
  const moves = [];
  const at = (f, upto = moves.length) => {
    const p = poseOf(base, f), tau = clock(f), done = mv => mv.ease(Math.max(0, Math.min(1, (tau - mv.t0) / (mv.t1 - mv.t0))));
    let {x, y, width: w, height: h} = p;
    for (const mv of moves.slice(0, upto)) {
      if (mv.travel) { const q = mv.type === 'glide' ? done(mv) - 1 : mv.type === 'truck' ? done(mv) - 0.5 : done(mv); x += mv.u[0] * mv.d * q; y += mv.u[1] * mv.d * q; }
    }
    for (const mv of moves.slice(0, upto)) {
      if (mv.travel) continue;
      const e = done(mv), s = mv.scale > 1 ? 1 + (mv.scale - 1) * e : 1 / (1 + (1 / mv.scale - 1) * e);
      x += mv.pivot[0] * w * (1 - s); y += mv.pivot[1] * h * (1 - s); w *= s; h *= s;
    }
    return {...p, x, y, width: w, height: h};
  };
  const shownBy = t => { let f = Math.ceil(t - 1e-9); while (clock(f) < t - 1e-9) f++; return f; };
  let gone = Infinity;
  for (const m of tracks) {
    const span = motionSpan(m, layer, what);
    if (m.type === 'push' || m.type === 'pull') {
      const pose = at(Math.round(Math.max(span.t0, layer.from)));
      const pivot = subjectPivot(pose, subject, {width: W, height: H});
      const k = (MOTION.push || {})[m.amount || 'small'] ?? 1.1;
      moves.push({...span, scale: m.type === 'push' ? k : 1 / k, pivot}); continue;
    }
    const ref = Math.round(m.type === 'exit' ? Math.max(span.t0, layer.from) : m.type === 'truck' ? (span.t0 + span.t1) / 2 : span.t1);
    const pose = at(ref), box = {x: pose.x, y: pose.y, w: pose.width, h: pose.height};
    let u = DIRS[m.dir] || [0, 0];
    if (m.dir === 'outward') { const o = origin(ref), visible = subjectBox(pose, subject); u = [visible.x + visible.w / 2 - o.x, visible.y + visible.h / 2 - o.y]; }
    const n = Math.hypot(...u);
    u = n > 1e-6 ? [u[0] / n, u[1] / n] : [0, -1];
    const away = m.type === 'glide' ? [-u[0], -u[1]] : u;
    const out = m.type === 'exit' && distanceOf(m) === 'off-frame' ? shownBy(span.t1) : null;
    const [a, b] = m.type === 'glide' ? [Math.min(span.t0, layer.from), span.t0] : [span.t1, out ?? span.t1];
    const off = {seen: seenOver(a, b), parts: parts.filter(p => p.part && (p.from ?? -Infinity) <= b && (p.to ?? Infinity) > a)};
    moves.push({...span, type: m.type, travel: true, u, d: motionDistance(m, away, distanceOf(m) === 'off-frame' ? box : subjectBox(pose, subject), off)});
    if (out != null) gone = Math.min(gone, out);
  }
  layer.to = Math.min(layer.to, Math.max(layer.from + 1, gone));
  const moved = Math.max(...moves.map(mv => mv.t1)), end = Math.max(base.at(-1).frame, moved);
  const f0 = Math.floor(Math.min(base[0].frame, layer.from));
  const f1 = Math.max(f0, Math.min(layer.to, Math.ceil(end)), Math.min(layer.to - 1, shownBy(moved)));
  const poses = Array.from({length: f1 - f0 + 1}, (_, i) => ({...at(f0 + i), frame: f0 + i}));
  const props = ['x', 'y', 'width', 'height', 'opacity', ...['blur', 'scale', 'rotation'].filter(k => poses.some(p => p[k] !== (k === 'scale' ? 1 : 0)))];
  layer.keyframes = poses.map(p => ({frame: p.frame, ...Object.fromEntries(props.map(k => [k, p[k]])), curve: 'linear'}));
}

const WHOLE = {x: 0, y: 0, w: 1, h: 1};
const partKeys = (keys, part) => keys.map(k => ({...k, x: k.x + part.x * k.width, y: k.y + part.y * k.height, width: part.w * k.width, height: part.h * k.height}));
const PARTS = new Map();
function partsOf(a, L) {
  if (!PARTS.has(L)) PARTS.set(L, a.pieces ? pieceParts(a) : a.sequence ? carouselParts(a, L) : [{part: WHOLE, material: L.material}]);
  return PARTS.get(L);
}
function pieceParts(a) {
  const info = assetInfo[a.id];
  if (info.rasterCut) return a.pieces.map((pc, j) => {
    const c = info.rasterCut.pieces[j];
    return {part: c.w ? {x: c.x / info.w, y: c.y / info.h, w: c.w / info.w, h: c.h / info.h} : null, material: pictureMaterial({...info, rim: pc.rim || a.rim})};
  });
  if (!info.semanticParts) return [{part: WHOLE, material: pictureMaterial(info)}];
  return info.semanticParts.map(({part, clip}, j) => ({part, clip,
    material: pictureMaterial({...info, rim: a.pieces[j].rim || a.rim})}));
}
function pieceLayers(a, L) {
  if (assetInfo[a.id].rasterCut) return cutPieceLayers(a, L);
  const info = assetInfo[a.id], step = (style.image.pieces || {}).stepFrames ?? 5;
  const schedule = pieceOnsets(a.pieces, L.from, {step, wordTime, tickAtOrAfter});
  if (!info.semanticParts) {
    const first = schedule[0], from = first?.from ?? L.from;
    if (from >= L.to) return [];
    revealReport.push({assetId: a.id, layerId: L.id, mode: 'whole-group',
      requestedOnsets: schedule.map(entry => entry.from), emittedOnsets: [from]});
    return [{...L, from}];
  }
  const parts = partsOf(a, L);
  const emitted = a.pieces.flatMap((pc, j) => {
    const {part, clip, material} = parts[j], what = `${a.id} complete object ${j + 1}`;
    const timing = schedule[j];
    if (timing.missingWord) warn(`${what}: onset word '${pc.onset.word}' is not spoken; it lands with the picture`);
    const from = timing.from;
    if (from >= L.to) { warn(`${what} would land on frame ${from}, after the picture is gone`); return []; }
    const layer = {...L, id: `${L.id}.object${j}`, assetId: a.id, from, material,
      semanticClip: clip, keyframes: L.keyframes.map(key => ({...key}))};
    if (pc.exit) {
      const f = pc.exit === 'scene-end' ? tickAtOrAfter(N - 1) : wordTime(pc.exit.word, pc.exit.at || 'start');
      if (f == null) warn(`${what}: exit word '${pc.exit.word}' is not spoken`); else layer.to = Math.min(layer.to, Math.max(from + 1, f));
    }
    const centre = f => { const k = poseOf(L.keyframes, f); return {x: k.x + k.width / 2, y: k.y + k.height / 2}; };
    applyMotion(layer, pc.motion, what, {origin: centre, parts: [{part, material}], subject: part});
    return [layer];
  });
  revealReport.push({assetId: a.id, layerId: L.id, mode: 'explicit-complete-objects',
    requestedOnsets: schedule.map(entry => entry.from), emittedOnsets: emitted.map(layer => layer.from)});
  return emitted;
}
function cutPieceLayers(a, L) {
  const info = assetInfo[a.id], cut = info.rasterCut, step = (style.image.pieces || {}).stepFrames ?? 5, parts = partsOf(a, L);
  let prev = L.from;
  return a.pieces.flatMap((pc, j) => {
    const {part, material} = parts[j], what = `${a.id} piece ${j + 1}`;
    const word = pc.onset?.word ? wordTime(pc.onset.word, pc.onset.at || 'start') : null;
    if (pc.onset?.word && word == null) warn(`${what}: onset word '${pc.onset.word}' is not spoken; it lands with the picture`);
    const onset = pc.onset === 'next' ? prev + step : word ?? L.from;
    prev = onset;
    if (!part) { warn(`${what}: the cut leaves nothing of the picture in it`); return []; }
    const from = Math.max(L.from, tickAtOrAfter(onset));
    if (from >= L.to) { warn(`${what} would land on frame ${from}, after the picture is gone`); return []; }
    const layer = {...L, id: `${L.id}.p${j}`, assetId: `${a.id}.p${j}`, from, material, keyframes: partKeys(L.keyframes, part)};
    if (pc.exit) {
      const f = pc.exit === 'scene-end' ? tickAtOrAfter(N - 1) : wordTime(pc.exit.word, pc.exit.at || 'start');
      if (f == null) warn(`${what}: exit word '${pc.exit.word}' is not spoken`); else layer.to = Math.min(layer.to, Math.max(from + 1, f));
    }
    const centre = f => { const k = poseOf(L.keyframes, f); return {x: k.x + cut.centre[0] / info.w * k.width, y: k.y + cut.centre[1] / info.h * k.height}; };
    applyMotion(layer, pc.motion, what, {origin: centre});
    return [layer];
  });
}
function carouselParts(a, L) {
  const ids = [...a.sequence, a.id], host = assetInfo[a.id], rate = (style.image.sequence || {}).fps || style.cadence?.fps || fps;
  const per = Math.max(1, Math.round((style.cadence?.fps || fps) / rate));
  const stepAt = i => (TICK > 1 ? tickN(L.from, i * per) : Math.round(L.from + i * fps / rate));
  const settled = L.keyframes.at(-1).width / host.w, margin = style.layout.leftMargin * W;
  return ids.map((id, i) => {
    const m = assetInfo[id];
    let part = WHOLE;
    if (id !== a.id) {
      const k = pictureStep(m) / pictureStep(host), fit = Math.min(1, (W - 2 * margin) / (m.w * k * settled), BAND_H / (m.h * k * settled));
      const w = m.w * k * fit / host.w, h = m.h * k * fit / host.h;
      part = {x: (1 - w) / 2, y: (1 - h) / 2, w, h};
    }
    return {id, part, material: pictureMaterial(m), from: i ? stepAt(i) : L.from, to: i + 1 < ids.length ? stepAt(i + 1) : L.to};
  });
}
function sequenceLayers(a, L) {
  const parts = partsOf(a, L), out = [];
  for (const [i, p] of parts.entries()) {
    if (p.from >= L.to) { warn(`${a.id}: its carousel is cut short at picture ${i + 1} of ${parts.length} by the end of the picture (frame ${L.to})`); break; }
    out.push({...L, id: `${L.id}.s${i}`, assetId: p.id, from: p.from, to: Math.min(p.to, L.to), material: p.material, keyframes: partKeys(L.keyframes, p.part)});
  }
  return out;
}
function splitPictures() {
  for (const a of plan.assets || []) {
    if (!a.pieces && !a.sequence) continue;
    for (const L of layers.filter(l => l.kind === 'asset' && l.assetId === a.id)) layers.splice(layers.indexOf(L), 1, ...(a.pieces ? pieceLayers(a, L) : sequenceLayers(a, L)));
  }
}

const SPLIT = style.layout.split || {text: 0.144, picture: [0.31, 0.94]};
const BAND_H = (SPLIT.picture[1] - SPLIT.picture[0]) * H;
const PICTURE_STEPS = {small: 0.6, normal: 1, large: 1.3};
const pictureStep = a => PICTURE_STEPS[a.size || 'normal'] ?? 1;
function pictureSize(a, box) {
  const k = pictureStep(a);
  const s = a.size === 'band' ? Math.min((style.layout.bandWidth || 1) * W / a.w, BAND_H / a.h)
    : a.size === 'bleed' ? Math.max(BAND_H / a.h, W / a.w) : Math.min(box.w * k / a.w, box.h * k / a.h);
  return {w: a.w * s, h: a.h * s};
}
const carriedLayer = (id, pageIndex) => pageIndex > 0 && layers.find(l => l.assetId === id && l.to === pageStart[pageIndex]);
const isPagePicture = id => !!assetInfo[id] && assetInfo[id].layout !== 'scatter' && !String(assetInfo[id].role || '').startsWith('reach-in');

function assetLayer(id, box, pageIndex, kindOverride, layerId) {
  const a = assetInfo[id], kind = kindOverride || entranceOf(id, 'asset');
  const carried = !layerId && carriedLayer(id, pageIndex);
  const {w, h} = box.drawn || pictureSize(a, box);
  if (carried) {
    const last = carried.keyframes.at(-1);
    carried.to = pageEnd(pageIndex);
    if (a.carry === 'in-place') return {x: last.x, y: last.y, w: last.width, h: last.height, kept: true};
    carried.keyframes.push({...last, frame: pageStart[pageIndex]}, {...last, frame: pageStart[pageIndex] + 6, x: box.cx - w / 2, y: box.cy - h / 2, width: w, height: h, curve: 'out2'});
    return {x: box.cx - w / 2, y: box.cy - h / 2, w, h};
  }
  const x = box.cx - w / 2, y = box.cy - h / 2;
  const material = pictureMaterial(a);
  const anchor = a.anchorWord ? wordTime(a.anchorWord, a.at || 'start') : null;
  let t = kind === 'present' ? pageStart[pageIndex] : anchor != null ? tickAtOrAfter(anchor) : Math.max(tickAtOrAfter(assetOnset(id, pageIndex)), cutTick(pageStart[pageIndex]));
  const {from, keys} = entranceKeys(kind, t, x, y, (MOTION.distance?.short ?? 0) * W, 'asset', a.enter, TICK_LEAD);
  keys.forEach(k => { k.width = w; k.height = h; });
  layers.push({id: layerId || `asset-${id}-p${pageIndex}`, kind: 'asset', assetId: id, from, to: pageEnd(pageIndex), z: 5, keyframes: keys, material});
  return {x: box.cx - w / 2, y: box.cy - h / 2, w, h};
}

function assetOnset(id, pageIndex) {
  const p = pages[pageIndex], ids = [...(p.items || []), ...(p.under || []), ...(p.left || []), ...(p.right || [])];
  const keyId = ids.find(i => copyById[i]?.role === 'key');
  if (keyId) return onsetOf(keyId, 0, 0) - 2;
  return pageStart[pageIndex];
}

const SPACINGS = {tight: 0.85, normal: 1, airy: 1.7};
const pageGap = p => ((style.layout.gaps || {})[p.gap || 'normal'] ?? 0.05) * H;
let pivot = {x: W / 2, y: H / 2};
function heroPart(id, pi) {
  const a = assetInfo[id], kept = a.carry === 'in-place' && carriedLayer(id, pi);
  if (kept) { const k = kept.keyframes.at(-1); return {w: k.width, h: k.height, kept: k, fit: {w: k.width, h: k.height}}; }
  const s = Math.min(style.layout.heroWidthMax * W * 1.2 / a.w, style.layout.heroHeight * H * 1.25 / a.h), fit = {w: a.w * s, h: a.h * s};
  return {...((a.size || 'normal') === 'normal' ? fit : pictureSize(a, fit)), fit};
}
function emitPicture(q, pi) {
  const cx = q.kept ? q.x + q.w / 2 : W / 2, cy = q.y + q.h / 2;
  assetLayer(q.asset, {cx, cy, w: q.fit.w, h: q.fit.h, drawn: q.drawn}, pi);
  pivot = {x: cx, y: cy};
}
function placeBandPictures(parts, pi, side = 'below', text = null) {
  const [f0, f1] = side === 'below' ? SPLIT.picture : [1 - SPLIT.picture[1], 1 - SPLIT.picture[0]];
  let top = f0 * H, bottom = f1 * H;
  const gap = pageGap(pages[pi]);
  if (text) {
    const [top0, bottom0] = [top, bottom], clear = ((style.layout.gaps || {}).tight ?? 0.01) * H;
    if (side === 'below') top = Math.max(top, text.bottom + clear); else bottom = Math.min(bottom, text.top - clear);
    const fixed = parts.filter(q => q.kept || assetInfo[q.asset].size === 'bleed'), scalable = parts.filter(q => !fixed.includes(q));
    const room = bottom - top - gap * (parts.length - 1) - fixed.reduce((s, q) => s + q.h, 0), want = scalable.reduce((s, q) => s + q.h, 0);
    if (bottom - top <= 0 || (want && room <= 0)) {
      warn(`page ${pi}: the captions leave no room in the picture band for ${parts.map(q => q.asset).join(', ')}, which keeps the band's place over them`);
      [top, bottom] = [top0, bottom0];
    } else if (want > room) {
      const s = room / want;
      scalable.forEach(q => { q.w *= s; q.h *= s; q.drawn = {w: q.w, h: q.h}; });
      if (s < 0.5) warn(`page ${pi}: ${scalable.map(q => q.asset).join(', ')} shrunk to ${Math.round(s * 100)}% to clear the captions`);
    }
  }
  let y = side === 'below' ? top : bottom;
  for (const q of side === 'below' ? parts : [...parts].reverse()) {
    if (!text && q.h > BAND_H) q.y = (f0 + f1) / 2 * H - q.h / 2;
    else { q.y = side === 'below' ? y : y - q.h; y = side === 'below' ? y + q.h + gap : y - q.h - gap; }
    q.x = W / 2 - q.w / 2;
    if (q.kept) Object.assign(q, {x: q.kept.x, y: q.kept.y});
  }
  parts.forEach(q => emitPicture(q, pi));
}
async function layoutParts(p, pi, band, defaults) {
  const split = p.layout === 'split', gap = pageGap(p), anchor = p.anchor || (split ? style.layout.stackAnchor : defaults.anchor);
  const groups = (p.groups || [{items: p.items}]).map(g => ({...g, parts: []}));
  for (const g of groups) {
    for (const id of g.items || []) {
      if (isPagePicture(id)) g.parts.push({asset: id, ...heroPart(id, pi)});
      else if (copyById[id]) { const run = g.parts.at(-1); if (run?.ids) run.ids.push(id); else g.parts.push({ids: [id]}); }
    }
    for (const q of g.parts.filter(q => q.ids)) {
      SPACING = SPACINGS[g.spacing || p.spacing || 'normal'];
      q.stack = await stackLines(q.ids, {}); q.h = q.stack.bottom - q.stack.top;
      SPACING = 1;
    }
  }
  const column = (parts, line, how) => {
    const total = parts.reduce((s, q) => s + q.h, 0) + gap * Math.max(0, parts.length - 1), r0 = parts[0]?.stack?.rows[0];
    let y = how === 'first-line' && r0 ? line + r0.m.xh / 2 - (r0.baseline - parts[0].stack.top) : line - total / 2;
    for (const q of parts) { q.y = y; y += q.h + gap; }
    const kept = parts.find(q => q.kept);
    if (kept) { const d = kept.kept.y - kept.y; parts.forEach(q => { q.y += d; }); }
  };
  const flowing = groups.filter(g => !g.slot), pictures = groups.flatMap(g => g.parts.filter(q => q.asset));
  const inColumn = q => !split || !q.asset;
  column(flowing.flatMap(g => g.parts.filter(inColumn)), split ? SPLIT.text * H : band, anchor);
  for (const g of groups.filter(g => g.slot)) column(g.parts.filter(inColumn), style.layout.slots[g.slot] * H, 'block');
  if (split) {
    const runs = flowing.flatMap(g => g.parts.filter(q => q.stack)), end = Math.max(...runs.map(q => q.y + q.h));
    if (pictures.length && end > SPLIT.picture[0] * H) warn(`page ${pi}: the split page's text runs to y ${Math.round(end)}, into the picture band (from y ${Math.round(SPLIT.picture[0] * H)}); shorten it or stack the page`);
    placeBandPictures(pictures, pi);
  } else pictures.forEach(q => { q.x = q.kept ? q.kept.x : W / 2 - q.w / 2; });
  const margin = style.layout.leftMargin * W;
  const edge = (st, side) => {
    const q = pictures[0];
    if (!q) return undefined;
    const a = assetInfo[q.asset], sc = q.w / a.w, above = (st.top + st.bottom) / 2 < q.y + q.h / 2;
    let v = side === 'left' ? Infinity : -Infinity;
    for (let y = above ? 0 : Math.floor(a.h * 2 / 3); y < (above ? Math.ceil(a.h / 3) : a.h); y++) {
      const [lo, hi] = a.rows[y] || [-1, -1];
      if (lo >= 0) v = side === 'left' ? Math.min(v, lo) : Math.max(v, hi);
    }
    if (!Number.isFinite(v)) v = side === 'left' ? 0 : a.w;
    const x = q.x + v * sc + (side === 'left' ? -1 : 1) * rimSize(a);
    const held = side === 'left' ? Math.max(margin, Math.min(x, W - margin - st.width)) : Math.min(W - margin, Math.max(x, margin + st.width));
    if (Math.abs(held - x) > 1) warn(`page ${pi}: picture-${side} rows cannot sit on the ${side} edge of ${q.asset} (x ${Math.round(x)}) inside the film's margins; they ${side === 'left' ? 'start' : 'end'} at x ${Math.round(held)}`);
    return held;
  };
  for (const g of groups) for (const q of g.parts) {
    if (q.asset) { if (!split) emitPicture(q, pi); continue; }
    q.stack.rows.forEach(r => { r.baseline += q.y - q.stack.top; });
    const st = {...q.stack, top: q.y, bottom: q.y + q.h}, align = g.align || p.align || defaults.align;
    const side = {'picture-left': 'left', 'picture-right': 'right'}[align];
    placeStackX(q.stack, align, g.keyAlign || p.keyAlign || 'block', side ? {[side]: edge(st, side)} : {});
    await emitRows(q.stack.rows, pi);
  }
  if (!pictures.length && p.block === 'stack') pivot = {x: W / 2, y: band};
}

if (TEXT_ON_ONES) grounds.forEach(g => { g.from = cutTick(g.from); });

for (let pi = 0; pi < pages.length; pi++) {
  const p = pages[pi], band = (p.band === 'upper' ? style.layout.bandUpper : style.layout.bandCentre) * H;
  if (p.block === 'captions') {
    const C2 = style.caption, ids = (p.items || []).filter(id => copyById[id]);
    const midY = (C2.xHeightCentre[p.band] ?? C2.xHeightCentre.centre) * H, margin = style.layout.leftMargin * W;
    const place = (st) => {
      if (!st.rows.length) return;
      let shift = midY + st.rows[0].m.xh / 2 - st.rows[0].baseline;
      const last = st.rows.at(-1), bottom = last.baseline + shift + last.m.descent;
      if (C2.bottomLimit && bottom > C2.bottomLimit * H) shift -= bottom - C2.bottomLimit * H;
      st.rows.forEach(r => {
        r.baseline += shift;
        r.x = (p.align === 'left' ? margin : p.align === 'right' ? W - margin - r.m.width : W / 2 - r.m.width / 2) + (C2.offsetXPx || 0);
        r.anchor = {left: 'start', right: 'end'}[p.align] || 'middle';
      });
    };
    const stackCaptions = async list => { SPACING = SPACINGS[p.spacing || 'normal']; const st = await stackLines(list, {}); SPACING = 1; return st; };
    const shown = [];
    if ((p.mode || 'replace') === 'build') {
      const st = await stackCaptions(ids); place(st); shown.push(...st.rows); await emitRows(st.rows, pi);
    } else {
      for (let k = 0; k < ids.length; k++) {
        const st = await stackCaptions([ids[k]]); place(st); shown.push(...st.rows); await emitRows(st.rows, pi);
        if (k + 1 < ids.length) {
          const c2 = copyById[ids[k + 1]], next = tickFor(c2.role)(onsetOf(ids[k + 1], 0, 0) + offsetFor(entranceOf(ids[k + 1], c2.role), c2.role));
          layers.filter(l => l.copyId === ids[k]).forEach(l => { l.to = Math.min(l.to, Math.max(l.from + 1, next)); });
        }
      }
    }
    const pictures = (p.items || []).filter(isPagePicture);
    const ink = shown.length ? {top: Math.min(...shown.map(r => r.baseline - r.m.ascent)), bottom: Math.max(...shown.map(r => r.baseline + r.m.descent))} : null;
    if (pictures.length) placeBandPictures(pictures.map(id => ({asset: id, ...heroPart(id, pi)})), pi, ['chest', 'lower'].includes(p.band) ? 'above' : 'below', ink);
    continue;
  }
  if (p.block === 'stack' || p.block === 'cards') {
    if (p.block === 'cards') {
      const ids = p.items; const cs = ids.map(i => copyById[i]);
      const allLines = cs.flatMap(c => c.lines);
      const common = await sizeOf({...cs[0], role: 'key'}, {cards: allLines});
      const cardOn = k => onsetOf(ids[k], 0, 0) + offsetFor(entranceOf(ids[k], cs[k].role), cs[k].role);
      for (let k = 0; k < ids.length; k++) {
        const c = cs[k]; const m = await lineMetrics(c, c.lines[0], common);
        const r = {c, li: 0, role: c.role, text: c.lines[0], m, baseline: band + m.xh / 2, x: W / 2 - m.width / 2, anchor: 'middle',
          cutAt: k ? Math.max(pageStart[pi], cardOn(k)) : pageStart[pi]};
        const nextOn = k + 1 < ids.length ? cardOn(k + 1) : pageEnd(pi);
        await emitRows([r], pi);
        layers.filter(l => l.copyId === c.id).forEach(l => { l.to = Math.min(l.to, Math.max(l.from + 1, nextOn)); });
      }
      continue;
    }
    if (p.groups || p.layout === 'split') {
      await layoutParts(p, pi, band, {align: 'center', anchor: style.layout.stackAnchor});
      continue;
    }
    SPACING = SPACINGS[p.spacing || 'normal'];
    const st = await stackLines(p.items, {});
    SPACING = 1;
    const h = st.bottom - st.top;
    const shift = (p.anchor || style.layout.stackAnchor) === 'first-line' && st.rows.length ? band + st.rows[0].m.xh / 2 - st.rows[0].baseline : band - h / 2 - st.top;
    st.rows.forEach(r => r.baseline += shift);
    placeStackX(st, p.align || 'center', p.keyAlign || 'block');
    await emitRows(st.rows, pi);
    pivot = {x: W / 2, y: band};
  } else if (p.block === 'flank-hero') {
    const a = assetInfo[p.hero];
    const boxH = style.layout.heroHeight * H, boxW = style.layout.heroWidthMax * W;
    const scale = Math.min(boxW / a.w, boxH / a.h), hw = a.w * scale, hh = a.h * scale;
    KEY_MAX = style.type.flankKeyMaxWidth || null;
    const under = await stackLines(p.under || [], {});
    KEY_MAX = null;
    const underH = under.rows.length ? under.bottom - under.top : 0;
    const gap = 0.6 * leadXH;
    const total = hh + (underH ? gap + underH : 0);
    let heroTop = band - total / 2, heroH = hh, heroCx = W / 2, heroCy = heroTop + hh / 2;
    const placed = assetLayer(p.hero, {cx: heroCx, cy: heroCy, w: hw, h: hh}, pi);
    if (placed.kept) {
      [heroTop, heroH, heroCx] = [placed.y, placed.h, placed.x + placed.w / 2];
      heroCy = heroTop + heroH / 2;
    }
    const standoff = (style.layout.flankStandoffXH ?? style.layout.standoffXH) * leadXH + rimSize(a);
    const sc = placed.w / a.w;
    const extent = (y0, y1, side) => {
      let v = side === 'left' ? Infinity : -Infinity;
      for (let y = Math.max(0, Math.floor((y0 - placed.y) / sc)); y <= Math.min(a.h - 1, Math.ceil((y1 - placed.y) / sc)); y++) {
        const [lo, hi] = a.rows[y] || [-1, -1]; if (lo < 0) continue;
        v = side === 'left' ? Math.min(v, placed.x + lo * sc) : Math.max(v, placed.x + hi * sc);
      }
      return Number.isFinite(v) ? v : (side === 'left' ? placed.x + placed.w * 0.25 : placed.x + placed.w * 0.75);
    };
    LEAD_SCALE = (style.type.flankLeadXHeightPx || leadXH) / leadXH;
    let leftRows = [];
    for (const [side, ids] of [['left', p.left || []], ['right', p.right || []]]) {
      const col = await stackLines(ids, {});
      const pitch = style.type.leadPitchXH * leadXH * LEAD_SCALE;
      let startY = heroTop + heroH * 0.28;
      if (side === 'right') {
        const stagger = p.stagger || 'half';
        if (stagger === 'half') startY += pitch * 0.8;
        if (stagger === 'low' && leftRows.length) startY = leftRows.at(-1).baseline + pitch - (col.rows.length - 1) * pitch - col.rows[0].m.ascent;
      }
      const colShift = col.rows.length ? startY - col.rows[0].baseline + col.rows[0].m.ascent : 0;
      col.rows.forEach(r => { r.baseline += colShift; });
      const edges = col.rows.map(r => extent(r.baseline - r.m.ascent - 6, r.baseline + r.m.descent + 6, side));
      if (p.align === 'center' || p.align === 'center-lines') {
        const axis = side === 'left' ? Math.min(...col.rows.map((r, k) => edges[k] - standoff - r.m.width / 2)) : Math.max(...col.rows.map((r, k) => edges[k] + standoff + r.m.width / 2));
        col.rows.forEach(r => { r.x = axis - r.m.width / 2; r.anchor = 'middle'; });
      } else col.rows.forEach((r, k) => { r.x = side === 'left' ? edges[k] - standoff - r.m.width : edges[k] + standoff; r.anchor = side === 'left' ? 'end' : 'start'; });
      col.rows.forEach(r => { r.x = Math.max(40, Math.min(W - 40 - r.m.width, r.x)); });
      if (side === 'left') leftRows = col.rows;
      await emitRows(col.rows, pi);
    }
    LEAD_SCALE = 1;
    if (under.rows.length) {
      const shift = heroTop + heroH + gap - under.top;
      under.rows.forEach(r => { r.baseline += shift; r.x = p.align === 'left' ? style.layout.leftMargin * W : heroCx - r.m.width / 2; r.anchor = p.align === 'left' ? 'start' : 'middle'; });
      await emitRows(under.rows, pi);
    }
    pivot = {x: heroCx, y: heroCy};
  } else if (p.block === 'hero-stack') {
    await layoutParts(p, pi, band, {align: 'center-lines', anchor: 'block'});
  }
}

const textBoxes = () => layers.filter(l => l.kind === 'text').map(l => {
  const k = l.keyframes.at(-1), w = l.fitWidth - 200, x = k.x - ({middle: 0.5, end: 1}[l.anchor] || 0) * w;
  return {x0: x - 20, x1: x + w + 20, y0: k.y - l.size, y1: k.y + l.size * 0.3};
});
for (const a of plan.assets || []) {
  if (layers.some(l => l.assetId === a.id) || (sequenceMembers.has(a.id) && !a.sequence)) continue;
  const pi = Math.max(0, pages.findIndex(p => (p.items || []).includes(a.id)));
  if (a.layout === 'scatter') {
    const n = a.count === 'few' ? 4 : 8, tiers = [0.34, 0.17, 0.11], boxes = textBoxes();
    let seed = 17;
    const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    for (let k = 0, tries = 0; k < n && tries < 400; tries++) {
      const wBox = W * tiers[k % 3], cx = -0.08 * W + rnd() * 1.16 * W, cy = 0.08 * H + rnd() * 0.84 * H;
      const hBox = wBox * assetInfo[a.id].h / assetInfo[a.id].w;
      const clash = boxes.some(b => cx + wBox / 2 > b.x0 && cx - wBox / 2 < b.x1 && cy + hBox / 2 > b.y0 && cy - hBox / 2 < b.y1);
      const crowd = layers.filter(l => l.assetId === a.id).some(l => Math.hypot(l.keyframes[0].x + l.keyframes[0].width / 2 - cx, l.keyframes[0].y + l.keyframes[0].height / 2 - cy) < (wBox + l.keyframes[0].width) * 0.55);
      if (clash || crowd) continue;
      assetLayer(a.id, {cx, cy, w: wBox, h: hBox}, pi, undefined, `asset-${a.id}-${k}`);
      k++;
    }
    continue;
  }
  const side = a.role === 'reach-in-left' ? -1 : 1;
  const hero = layers.find(l => l.kind === 'asset' && l.from < pageEnd(pi) && l.to > pageStart[pi]);
  const hk = hero ? hero.keyframes.at(-1) : {x: W * 0.3, y: H * 0.4, width: W * 0.4, height: H * 0.2};
  const target = {cx: side < 0 ? hk.x - W * 0.08 : hk.x + hk.width + W * 0.08, cy: hk.y + hk.height * (side < 0 ? 0.75 : 0.25), w: W * 0.36, h: H * 0.16};
  const placed = assetLayer(a.id, target, pi, a.role.startsWith('reach-in') ? 'pop' : undefined);
  if (a.role.startsWith('reach-in')) {
    const l = layers.at(-1), k0 = l.keyframes[0];
    const offX = side < 0 ? -placed.w - 20 : W + 20;
    l.keyframes = [{...k0, x: offX}, {...k0, frame: k0.frame + 18, x: placed.x, curve: 'out2'}];
  }
}
pages.forEach((p, i) => {
  if (i === 0 || p.handoff !== 'overlap') return;
  const end = Math.min(N, pageStart[i] + (style.timing.pageOverlapFrames ?? 2));
  layers.filter(l => l.to === pageStart[i]).forEach(l => { l.to = end; });
});
const typeOnOnes = l => l.kind === 'text' && l.cadence === 'ones' && copyById[l.copyId]?.role !== 'caption';
const layersCutFor = l => (typeOnOnes(l) ? Math.min(N, cutTick(LAYERS_CUT)) : LAYERS_CUT);
layers.filter(typeOnOnes).forEach(l => { l.to = Math.min(N, cutTick(l.to)); });
for (const item of [...(plan.copy || []), ...(plan.assets || [])]) {
  if (!item.exit) continue;
  const f = item.exit === 'scene-end' ? N - 1 : wordTime(item.exit.word, item.exit.at || 'start');
  if (f == null) { warn(`${item.id}: exit word '${item.exit.word}' is not spoken`); continue; }
  layers.filter(l => l.copyId === item.id || l.assetId === item.id).forEach(l => {
    l.to = Math.min(l.to, item.exit === 'scene-end' && l.cadence !== 'ones' ? tickAtOrAfter(f) : f);
  });
}

const cameraMoves = (Array.isArray(plan.camera) ? plan.camera : [plan.camera || {move: 'none'}]).filter(c => c && c.move && c.move !== 'none');
const lastSpoken = spoken.length ? frameOf(spoken[spoken.length - 1].end) : N;
function cameraPath() {
  if (!cameraMoves.length) return null;
  const S = style.camera, keys = [{frame: 0, scale: 1, x: 0, y: 0}];
  for (const cam of cameraMoves) {
    if (cam.phase === 'enter-settle') {
      keys.length = 0;
      const first = Math.max(0, Math.min(N - 2, ...layers.map(l => l.from)));
      if (cam.move.startsWith('pan')) keys.push({frame: first, scale: 1, x: (cam.move === 'pan-left' ? 1 : -1) * (S.panEnterFraction || S.panFraction) * W, y: 0}, {frame: first + S.settleFrames + 4, scale: 1, x: 0, y: 0, curve: 'out2'});
      else keys.push({frame: first, scale: cam.move === 'pull-out' ? S.settleFrom : 1 / S.settleFrom, x: 0, y: 0}, {frame: first + S.settleFrames, scale: 1, x: 0, y: 0, curve: 'out2'});
      continue;
    }
    let start = cam.phase === 'exit-after-speech' ? lastSpoken + 2 : cam.fromWord ? (wordTime(cam.fromWord, cam.at || 'start') ?? Math.round(N * 0.55)) : Math.round(N * 0.55);
    start = Math.max(start, keys.at(-1).frame);
    const amt = cam.amount === 'small' ? S.pullOutSmall : S.pullOutLarge;
    const end = {frame: N - 1, curve: 'in2', x: 0, y: 0, scale: 1};
    if (cam.move === 'pull-out') end.scale = amt;
    if (cam.move === 'push-in') end.scale = 1 / amt;
    if (cam.move === 'pan-left') end.x = -S.panFraction * W * (cam.amount === 'small' ? 0.6 : 1);
    if (cam.move === 'pan-right') end.x = S.panFraction * W * (cam.amount === 'small' ? 0.6 : 1);
    if (start < N - 2) keys.push({...keys.at(-1), frame: Math.min(start, N - 3), curve: 'cut'}, end);
  }
  const pv = cameraMoves.find(m => m.pivot)?.pivot;
  return {pivot: pv === 'frame' ? {x: W / 2, y: H / 2} : pivot, keyframes: keys};
}

motionCamera = cameraPath();
for (const a of plan.assets || []) {
  if (a.motion) layers.filter(l => l.kind === 'asset' && l.assetId === a.id).forEach(l => applyMotion(l, a.motion, a.id, {parts: partsOf(a, l)}));
}

pages.forEach((p, i) => {
  if (!p.shape || p.shape === 'none') return;
  const hero = layers.find(l => l.kind === 'asset' && l.assetId === (p.hero || (p.items || []).find(isPagePicture)));
  if (!hero) return;
  const k0 = hero.keyframes.at(-1), d = Math.max(k0.width, k0.height) * 0.92;
  const colour = p.shape === 'disc-flood' ? C.flood : p.shape === 'disc-accent' ? palette('disc-accent') : C.discWarm || '#F2A93B';
  const keys = hero.keyframes.map(k => ({frame: k.frame, x: k.x + k.width / 2 - d / 2 * (k.width / k0.width), y: k.y + k.height / 2 - d / 2 * (k.width / k0.width),
    width: d * k.width / k0.width, height: d * k.width / k0.width, opacity: k.opacity ?? 1, blur: k.blur || 0, curve: k.curve}));
  layers.push({id: `shape-${i}`, kind: 'ellipse', color: colour, from: hero.from, to: hero.to, z: 4, keyframes: keys});
});

resolveCounters();

for (const [id, mode] of Object.entries(plan.idle || {})) {
  if (mode !== 'float') continue;
  for (const l of layers.filter(l => l.assetId === id || l.copyId === id)) {
    const base = l.keyframes[l.keyframes.length - 1], keys = [...l.keyframes];
    let seed = id.length * 7 + 3;
    for (let f = base.frame + 12; f < N; f += 18) {
      seed = (seed * 9301 + 49297) % 233280; const dx = (seed / 233280 - 0.5) * 8;
      seed = (seed * 9301 + 49297) % 233280; const dy = (seed / 233280 - 0.5) * 8;
      keys.push({...base, frame: f, x: base.x + dx, y: base.y + dy, curve: 'smooth'});
    }
    l.keyframes = keys;
  }
}

splitPictures();
const camera = cameraPath();

if (plan.ending === 'clear' || plan.ending === 'cut-to-black') {
  layers.forEach(l => { l.to = Math.min(l.to, layersCutFor(l)); });
  if (plan.ending === 'cut-to-black') grounds.push({from: N - 1, ground: 'black'});
}

for (const item of [...(plan.copy || []), ...(plan.assets || [])]) {
  const own = layers.filter(l => l.copyId === item.id || l.assetId === item.id);
  if (own.length && own.every(l => l.to <= l.from)) {
    warn(`${item.id}: never shows (it would enter on frame ${Math.min(...own.map(l => l.from))}, but its page or exit ends it on frame ${Math.max(...own.map(l => l.to))})${copyById[item.id] ? '; its words still take their spoken times from the items around it' : ''}`);
  }
}

grounds.sort((a, b) => a.from - b.from);
const groundColour = g => (g === 'black' ? '#000000' : g === 'white' ? (C.white || '#FFFFFF') : palette(g));
const backgrounds = grounds.map(g => {
  const look = (style.grounds || {})[g.ground] || {};
  return {from: g.from, color: groundColour(g.ground), ...(look.fleck && {fleck: look.fleck})};
});
await warnBarelySeen();

async function warnBarelySeen() {
  const warnOf = (id, text) => warn(`${id}: ${text}`);
  const settleOf = l => (l.reveal ? l.from + (l.reveal.durationFrames || 0) : Math.max(l.from, ...l.keyframes.map(k => k.frame)));
  for (const c of plan.copy || []) {
    const own = layers.filter(l => l.copyId === c.id && l.kind === 'text');
    if (!own.length || own.every(l => l.to <= l.from) || own.some(l => l.to >= layersCutFor(l))) continue;
    const settled = Math.min(...own.map(settleOf)), gone = Math.max(...own.map(l => l.to));
    const said = Math.max(-Infinity, ...readingOrder.filter(w => w.copyId === c.id && !w.unspoken).map(w => w.end));
    if (gone <= settled) warnOf(c.id, `gone on frame ${gone}, before its entrance settles (frame ${+settled.toFixed(2)}): it never shows in full`);
    else if (own.some(l => l.to <= l.from)) warnOf(c.id, 'some of its words never draw, yet take their spoken times from the items around them');
    else if (gone - settled < (style.timing.minHoldFrames || 0) && !(gone >= said - 3)) warnOf(c.id, `gone on frame ${gone}, ${+(gone - settled).toFixed(2)} frames after its entrance settles${said > -Infinity ? ` and before its last word is said (frame ${said})` : ''}: it barely shows`);
  }
  const lab = hex => {
    const lin = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(x => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    const [x, y, z] = [[0.4124, 0.3576, 0.1805, 0.95047], [0.2126, 0.7152, 0.0722, 1], [0.0193, 0.1192, 0.9505, 1.08883]]
      .map(([a, b, cc, white]) => (a * lin[0] + b * lin[1] + cc * lin[2]) / white).map(t => (t > 0.008856 ? cbrt(t) : 7.787 * t + 16 / 116));
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
  };
  const SAME_COLOUR = 8;
  for (const c of plan.copy || []) {
    const at = layers.filter(l => l.copyId === c.id && l.kind === 'text').map(l => {
      const keys = l.colorKeys || [{from: l.from, color: l.color}];
      const cuts = [l.from, ...grounds.map(g => g.from), ...footage.flatMap(x => [x.from, x.to])].filter(f => f >= l.from && f < l.to);
      return cuts.sort((a, b) => a - b).find(f => {
        const colour = [...keys].reverse().find(k => k.from <= f)?.color || l.color, under = groundColour(groundAt(f).ground);
        return !onFootageAt(f) && /^#[0-9a-f]{6}$/i.test(colour) && Math.hypot(...lab(colour).map((v, i) => v - lab(under)[i])) < SAME_COLOUR;
      });
    }).filter(f => f != null);
    if (at.length) warnOf(c.id, `drawn in about its ground's colour from frame ${Math.min(...at)}: it shows nothing there`);
  }
  for (const c of plan.copy || []) {
    const odd = {blank: new Set(), missing: new Set()};
    for (const [li, line] of c.lines.entries()) {
      for (const [wi, word] of line.split(/\s+/).filter(Boolean).entries()) {
        const {face, weight} = faceOf(c.emph?.[li]?.[wi] ? lookOf(c) : c), f = fonts[face];
        if (f.system) continue;
        for (const ch of new Set(word.normalize('NFC'))) {
          const [glyph, none] = await Promise.all([ch, '\u0378'].map(x => measure(x, face, 100, weight)));
          const box = m => [m.width, m.left + m.right, m.ascent + m.descent];
          if (!(glyph.left + glyph.right > 0 && glyph.ascent + glyph.descent > 0)) odd.blank.add(ch);
          else if (box(glyph).every((v, i) => v === box(none)[i])) odd.missing.add(ch);
        }
      }
    }
    const codes = set => [...set].map(ch => `U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`).join(', ');
    if (odd.missing.size) warnOf(c.id, `no font has a glyph for ${codes(odd.missing)}: drawn as an empty box`);
    if (odd.blank.size) warnOf(c.id, `${codes(odd.blank)} draws nothing: it pushes text about like a space`);
  }
}
function printScreen(screen = style.screen) {
  if (!screen || PRINT === 1) return screen;
  const sc = {...screen, period: screen.period * PRINT, blur: (screen.blur ?? 0.6) * PRINT};
  if (sc.radius) sc.radius *= PRINT;
  if (sc.axes) sc.axes = sc.axes.map(a => ({...a, period: a.period * PRINT}));
  return sc;
}
const footageScreen = footage.some(x => x.screen === 'footage') ? printScreen({...style.screen, ...FOOTAGE.screen}) : undefined;
const cadence = style.cadence && {fps: style.cadence.fps, ...(style.cadence.phase != null && {phase: style.cadence.phase})};
for (const l of layers) { const stroke = captionStroke(style, l, copyById[l.copyId]); if (stroke) l.stroke = stroke; }
const execution = {
  sceneId: plan.sceneId, durationFrames: N, fps, fpsRational: style.fpsRational, canvas: {width: W, height: H},
  fonts, backgrounds, layers, camera, screen: printScreen(), footageScreen, cadence, footage,
  screenSpans: footage.length ? (() => {
    const spans = [], covered = f => footage.find(x => f >= x.from && f < x.to);
    let start = null;
    for (let f = 0; f <= N; f++) {
      const sh = f < N ? covered(f) : null, on = f < N && (!sh || sh.layout === 'inset' || screened(sh));
      if (on && start === null) start = f;
      if (!on && start !== null) { spans.push({from: start, to: f}); start = null; }
    }
    return spans;
  })() : undefined,
  assetFiles: Object.fromEntries(Object.entries(assetInfo).flatMap(([id, a]) => [[id, `assets/${id}.png`],
    ...(a.rasterCut?.pieces || []).map((c, j) => [`${id}.p${j}`, `assets/${c.file}`])])),
  compiler: {schema: plan.schema, style: style.id},
};
return {execution, report: {sceneId: plan.sceneId, warningScope: 'every compiler warning (also on stderr)', warnings: compileWarnings, reveals: revealReport}};
}
