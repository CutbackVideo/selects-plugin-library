export const norm = s => s.toLowerCase().replace(/[^a-z0-9%$]/g, '');

export function spokenWords(words) {
  return (words || []).flatMap(w => {
    const parts = String(w.text).split(/(?<=\w)[-–—]+(?=\w)/);
    if (parts.length < 2) return [w];
    const total = parts.reduce((a, x) => a + x.length, 0);
    let t = w.start;
    return parts.map(x => { const d = (w.end - w.start) * x.length / total, o = {...w, text: x, start: t, end: t + d}; t += d; return o; });
  }).map(w => ({...w, n: norm(w.text)}));
}

export function lev(a, b) {
  const d = Array.from({length: a.length + 1}, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
export function sim(a, b) {
  const x = norm(a), y = norm(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const dx = x.replace(/\D/g, ''), dy = y.replace(/\D/g, '');
  if (dx && dx === dy) return 0.95;
  const NUMW = {hundred: 3, thousand: 4, million: 7, billion: 10, trillion: 13};
  if (dx && NUMW[y] && dx.length === NUMW[y]) return 0.9;
  if ((x.length > 2 && y.startsWith(x)) || (y.length > 2 && x.startsWith(y))) return 0.8;
  const s = 1 - lev(x, y) / Math.max(x.length, y.length);
  return s >= 0.6 ? s : 0;
}

export const wordTimer = (spoken, frameOf) => (spec, at = 'start') => {
  const [word, nth] = String(spec).split('#'), n = Number(nth || 1);
  const exact = spoken.filter(w => w.n === norm(word));
  const w = (exact.length >= n ? exact : spoken.filter(x => sim(x.text, word) >= 0.8))[n - 1];
  if (!w) return null;
  const s0 = frameOf(w.start), e0 = frameOf(w.end);
  return at === 'before' ? s0 - 3 : at === 'mid' ? frameOf((w.start + w.end) / 2) : at === 'end' ? e0 : at === 'after' ? e0 + 3 : s0;
};

export function parseMarkup(copy) {
  for (const c of copy || []) {
    let unit = -1, open = false;
    c.units = c.lines.map(line => line.split(/\s+/).filter(Boolean).map(w => {
      const b = w.replace(/\*/g, '');
      if (!open || b.startsWith('[')) unit++;
      open = (open || b.startsWith('[')) && !b.endsWith(']');
      return unit;
    }));
    c.emph = c.lines.map(line => {
      let starred = false;
      return line.split(/\s+/).filter(Boolean).map(w => {
        const s = w.replace(/[[\]]/g, ''), on = starred || s.startsWith('*');
        starred = on && !(s.length > 1 && s.endsWith('*')) && s !== '*';
        return on;
      });
    });
    c.lines = c.lines.map(line => line.replace(/[[\]*]/g, '').split(/\s+/).filter(Boolean).join(' '));
  }
}

export const readingOrderOf = copy => (copy || []).flatMap(c => c.lines.flatMap((line, li) =>
  line.split(/\s+/).filter(Boolean).map((w, wi) => ({copyId: c.id, li, wi, text: w}))));

export function alignWords(readingOrder, spoken, frameOf) {
  const A = readingOrder, B = spoken, n = A.length, m = B.length;
  const S = Array.from({length: n + 1}, () => Array(m + 1).fill(0)), P = Array.from({length: n + 1}, () => Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    const diag = S[i - 1][j - 1] + sim(A[i - 1].text, B[j - 1].text);
    const opts = [[S[i - 1][j], 1], [S[i][j - 1], 2], [sim(A[i - 1].text, B[j - 1].text) > 0 ? diag : -1, 3]];
    const best = opts.reduce((x, y) => (y[0] > x[0] ? y : x));
    S[i][j] = best[0]; P[i][j] = best[1];
  }
  let i = n, j = m;
  while (i > 0 && j > 0) {
    if (P[i][j] === 3) { A[i - 1].onset = frameOf(B[j - 1].start); A[i - 1].end = frameOf(B[j - 1].end); i--; j--; }
    else if (P[i][j] === 1) i--; else j--;
  }
  for (let i = 0; i < A.length; i++) if (A[i].onset == null) {
    const prev = A.slice(0, i).reverse().find(w => w.onset != null);
    const next = A.slice(i + 1).find(w => w.onset != null);
    A[i].onset = prev ? Math.min(prev.end ?? prev.onset + 3, next ? next.onset - 1 : Infinity) : next ? Math.max(0, next.onset - 2) : 0;
    A[i].end = A[i].onset + 4;
    A[i].unspoken = true;
  }
}

export function onsetTimer({copyById, readingOrder, wordTime, timing}) {
  const itemAnchor = c => (c.timing && c.timing.onWord ? wordTime(c.timing.onWord, c.timing.at || 'start') : null);
  const nudgeOf = c => ({earlier: -1, later: 1}[c.timing?.nudge] || 0) * (timing.nudgeFrames || 2);
  const STAGGER = timing.stagger || {floor: 3};
  const onsetOf = (copyId, li, wi) => {
    const c = copyById[copyId], anchor = itemAnchor(c), scope = c.scope || (c.role === 'caption' ? 'item' : 'word');
    const words = readingOrder.filter(w => w.copyId === copyId), nudge = nudgeOf(c);
    if (scope === 'item') return (anchor ?? Math.min(...words.map(w => w.onset))) + nudge;
    if (scope === 'line') return (anchor ?? Math.min(...words.filter(w => w.li === li).map(w => w.onset))) + nudge;
    const u = c.units[li][wi], first = words.find(w => c.units[w.li][w.wi] === u);
    const step = c.stagger === 'even' || c.stagger === 'tight' ? STAGGER[c.stagger] : null;
    if (step != null) return (anchor ?? words[0].onset) + step * u + nudge;
    if (anchor != null) return anchor + Math.max(first.onset - words[0].onset, STAGGER.floor * u) + nudge;
    return first.onset + nudge;
  };
  return {itemAnchor, nudgeOf, onsetOf, STAGGER};
}
