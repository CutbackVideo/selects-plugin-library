import React from 'react';
import { useCurrentFrame, useVideoConfig, delayRender, continueRender, cancelRender } from 'remotion';

// @heritage

// Trend line (style spec 6-4): scene title + gold rule, a line drawn in one continuous sweep (dark grey
// 8 px history, crimson 9 px from point `accentFrom`) over a light fill, on a gold baseline with a few
// grey axis labels and no grid. Key points get an ivory dot in a grey ring and their value above; the
// end point a crimson ring. The end value (84 crimson + unit 46) counts up while the last segment draws.
// Optional crimson dashed `threshold` {y, label}, optional 1-2 small `cards` [{text: "header\nvalue",
// tone}] under the chart. `points: [{x, y}]`, `x` is the axis label, `y` a number.
const PX0 = 110, PX1 = 950, PLOT_TOP = 238;
const SWEEP_FROM = 0.6, SWEEP_MAX = 6.4, SWEEP_MIN = 2.6;
const CARD_H = 96, CARD_TOP = 642, CARD_GAP = 24, HL = 30, VL = 46, CARD_PAD = 20;
// Card text that does not fit keeps its size (style spec 1): a header or value breaks at a space onto more lines,
// the cards grow upwards together and the chart's baseline rises by the same amount (the cards keep ending at y 738).

// Korean graphics write 5000 but 12,500: group thousands only from five digits up.
const valueText = (v) => {
  const t = String(v), d = t.includes('.') ? t.length - t.indexOf('.') - 1 : 0;
  return Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: Math.abs(Number(v)) >= 10000 });
};
// Sine-speed sweep: starts and ends at rest, steady through the middle.
const sine = (x) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x));
// Axis labels: first, last and about two evenly spaced between (16 points -> 0, 5, 10, 15).
function labelIndexes(n) {
  if (n < 2) return n ? [0] : [];
  const step = Math.max(1, Math.round((n - 1) / 3));
  const out = [];
  for (let i = 0; i < n - 1 - step * 0.5; i += step) out.push(i);
  return out.concat([n - 1]);
}

export default function LineTrendCallout({ data }) {
  const { fps, durationInFrames } = useVideoConfig();
  const pts = (Array.isArray(data?.points) ? data.points : []).filter((p) => Number.isFinite(Number(p?.y)));
  const n = pts.length;
  const vals = pts.map((p) => Number(p.y));
  const accentFrom = Math.max(0, Math.min(n - 1, Math.round(Number(data?.accentFrom ?? n - 2)) || 0));
  const unit = String(data?.unit ?? '');
  const threshold = data?.threshold && Number.isFinite(Number(data.threshold.y)) ? data.threshold : null;
  const cards = (Array.isArray(data?.cards) ? data.cards : []).filter((c) => String(c?.text ?? '').trim() !== '').slice(0, 2);
  // The sweep fills the room before the hold, up to the sian's 0.6..6.4 s; cards rise after it.
  const end = durationInFrames / fps;
  const room = Math.max(end * 0.5, end - HOLD);
  // Card i rises 0.3 + 0.4 i s after the sweep (0.9 s); its brush starts 0.85 + 0.4 i s after it (0.9 s).
  const cardsTail = Math.max(0, ...cards.map((c, i) => Math.max(0.3 + 0.4 * i + 0.9, brushEnd(c.text, 0.85 + 0.4 * i))));
  // 0.1 s of slack so the frame at the hold's first frame is already final.
  const sweepEnd = clamp(room - 0.1 - cardsTail, SWEEP_MIN, SWEEP_MAX);
  // Last entrance: the sweep (the end value lands with it), then the cards; the header is done by 1.5 s.
  // (+0.1 s slack, also kept when a short clip speeds the scene up).
  // Axis label and threshold brushes start by 1.25 s.
  const early = Math.max(headerEnd(String(data?.title ?? ''), String(data?.subtitle ?? '')), brushEnd(threshold?.label, 1.25), ...pts.map((p, j) => brushEnd(p?.x, 0.7 + 0.08 * j)));
  const s = useScene(data, Math.max(1.5, early, sweepEnd + cardsTail) + 0.1);
  const k = s.k;

  // Value axis from the data (and threshold): the top value sits at PLOT_TOP, the floor leaves room
  // under the lowest point (17.7..52.3 -> floor 10, as in the sian), never below 0 for positive data.
  // The cards' text as lines and their shared height.
  const cardW = cards.length > 1 ? (X1 - X0 - CARD_GAP) / 2 : X1 - X0;
  const cardText = cards.map((c) => {
    const [a, b] = String(c.text).split('\n');
    const head = b !== undefined ? a : '', value = b !== undefined ? b : a;
    return { head: head ? wrapLines(head, 26, cardW - 40, font(26, 600)) : [], value: wrapLines(value, 40, cardW - 40, font(40, 800, -1)) };
  });
  const cardH = Math.max(CARD_H, ...cardText.map((t) => t.head.length * HL + t.value.length * VL + CARD_PAD));
  const cardTop = CARD_TOP + CARD_H - cardH;
  const base = cards.length ? 540 - (cardH - CARD_H) : 560;
  cardText.forEach((t, i) => {
    const x = X0 + i * (cardW + CARD_GAP), area = [x + 14, cardTop, x + cardW - 14, cardTop + cardH];
    const y0 = cardTop + (cardH - t.head.length * HL - t.value.length * VL) / 2;
    reportLines('card header', t.head.map((l, j) => ({ text: l, x: x + cardW / 2, y: y0 + HL * (j + 0.5), anchor: 'c' })), 26, area, 2, font(26, 600));
    reportLines('card value', t.value.map((l, j) => ({ text: l, x: x + cardW / 2, y: y0 + t.head.length * HL + VL * (j + 0.5), anchor: 'c' })), 40, area, 2, font(40, 800, -1));
  });
  const ys = vals.concat(threshold ? [Number(threshold.y)] : []);
  const hi = n ? Math.max(...ys) : 1, lo = n ? Math.min(...ys) : 0;
  const span = hi - lo || Math.abs(hi) || 1;
  const floor = lo >= 0 && lo - span * 0.22 < 0 ? 0 : lo - span * 0.22;
  const X = (i) => (n > 1 ? PX0 + (i / (n - 1)) * (PX1 - PX0) : (PX0 + PX1) / 2);
  const Y = (v) => base - ((v - floor) / (hi - floor || 1)) * (base - PLOT_TOP);
  const P = pts.map((p, i) => [X(i), Y(vals[i])]);

  // u: how far the line has drawn, in point indexes (uniform in x).
  const u = n > 1 ? (n - 1) * sine(prog(s.t, SWEEP_FROM, sweepEnd)) : s.t > SWEEP_FROM ? 1 : 0;
  const upto = (a, b) => {
    if (b <= a) return [];
    const j = Math.floor(b), out = P.slice(a, Math.min(j, n - 1) + 1);
    if (j < n - 1 && b > j) out.push([lerp(P[j][0], P[j + 1][0], b - j), lerp(P[j][1], P[j + 1][1], b - j)]);
    return out;
  };
  const poly = (q) => q.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const drawn = n > 1 && u > 0.001 ? upto(0, u) : [];
  const grey = n > 1 && u > 0.001 ? upto(0, Math.min(u, accentFrom)) : [];
  const red = n > 1 && u > accentFrom ? upto(accentFrom, u) : [];
  const done = n > 1 ? u >= n - 1 - 1e-6 : s.t >= SWEEP_FROM;
  // Real time (s.t) when the sweep reaches index i.
  const reach = (i) => SWEEP_FROM + (n > 1 ? Math.acos(1 - 2 * i / (n - 1)) / Math.PI : 0) * (sweepEnd - SWEEP_FROM);

  const labels = labelIndexes(n);
  const keys = labels.filter((i) => i < n - 1);
  const pb = smooth(prog(s.t, 0.1, 1.0));
  const pth = smooth(prog(s.t, 0.4, 1.5));
  const thY = threshold ? Y(Number(threshold.y)) : 0;

  // End value: counts from the previous point's value (or 0) in step with the last segment, so it
  // slows to a stop with the sine sweep.
  const rawEnd = data?.endLabel;
  const endValue = rawEnd == null || rawEnd === '' ? (n ? vals[n - 1] : '') : rawEnd;
  const rawText = typeof endValue === 'number' ? valueText(endValue) : String(endValue);
  const count = countable(rawText);
  // The text the count-up lands on ("1000000" -> 1,000,000) sizes the label and the layout check.
  const endText = count ? counted(count, 1) : rawText;
  const f = n > 1 ? clamp(u - (n - 2)) : done ? 1 : 0;
  const from = count && n > 1 && Math.abs(count.num - vals[n - 1]) < 1e-9 ? vals[n - 2] : 0;
  const shown = count ? counted({ ...count, num: lerp(from, count.num, f) }, 1) : endText;
  // The unit follows a number only (not a word label, nor a label that already ends with it).
  const showUnit = !!count && unit !== '' && !endText.trim().endsWith(unit);
  const numStyle = { fontSize: 84 * k, fontWeight: 800, color: C.acc, letterSpacing: -2 * k, fontVariantNumeric: 'tabular-nums', lineHeight: 1 };
  const endLabel = (
    <div style={{ display: 'flex', alignItems: 'baseline' }}>
      <span style={{ position: 'relative' }}>
        <span style={{ ...numStyle, visibility: count ? 'hidden' : 'visible' }}>{endText}</span>
        {count ? <span style={{ ...numStyle, position: 'absolute', right: 0, bottom: 0 }}>{shown}</span> : null}
      </span>
      {showUnit ? <span style={{ fontSize: 46 * k, fontWeight: 700, color: C.acc, marginLeft: 4 * k, lineHeight: 1 }}>{unit}</span> : null}
    </div>
  );
  const endY = n ? P[n - 1][1] - 68 : 0;
  // The end value runs left from the window's right edge; a text label wider than the window is cut off.
  const endW = textW(plainText(endText), 84, 800, -2) + (showUnit ? 4 + textW(unit, 46, 700) : 0);
  if (n && endText !== '') {
    report('end value', endText + (showUnit ? unit : ''), [X1 - endW, endY - 50, X1, endY + 50], [X0, 112, X1, base], { size: 84, lines: 1, maxLines: 1 });
    reportGrown('end value', endText + (showUnit ? unit : ''), [X1 - endW, endY - 50, X1, endY + 50], count ? null : [POP_GROW, SAFE, 'safe area', 'r'], 84);
    // Counting down from a longer previous value shows more digits, right-aligned where the value ends.
    const first = count ? counted({ ...count, num: from }, 1) : '';
    const firstW = count ? textW(first, 84, 800, -2) : 0;
    if (count && firstW > textW(endText, 84, 800, -2)) report('end value', first, [X1 - endW + textW(endText, 84, 800, -2) - firstW, endY - 50, X1, endY + 50], SAFE, { size: 84, counting: true, room: 'safe area' });
  }
  // A text end label without one number pops in as the last segment starts, at rest before the hold.
  const popAt = Math.min(n > 1 ? reach(n - 2) : SWEEP_FROM, sweepEnd - 0.8);

  return (
    <Win s={s} data={data}>
      <Header s={s} title={String(data?.title ?? '')} subtitle={String(data?.subtitle ?? '')} />
      <svg width={1080 * k} height={s.height * k} viewBox={'0 0 1080 ' + s.height} style={{ position: 'absolute', left: 0, top: 0 }}>
        {drawn.length > 1 ? <polygon points={poly(drawn.concat([[drawn[drawn.length - 1][0], base], [drawn[0][0], base]]))} fill={C.area} opacity={0.8} /> : null}
        {pb > 0 ? <line x1={X0} y1={base + 2} x2={lerp(X0, X1, pb)} y2={base + 2} stroke={C.gold} strokeWidth={2} strokeLinecap="round" /> : null}
        {threshold && pth > 0 ? <line x1={X0} y1={thY} x2={lerp(X0, X1, pth)} y2={thY} stroke={C.acc} strokeWidth={3} strokeDasharray="16 11" /> : null}
        {grey.length > 1 ? <polyline points={poly(grey)} fill="none" stroke={C.ink2} strokeWidth={8} strokeLinejoin="round" strokeLinecap="round" /> : null}
        {red.length > 1 ? <polyline points={poly(red)} fill="none" stroke={C.acc} strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" /> : null}
        {keys.map((i) => {
          const pp = settle(clamp((u - i) / 0.6 + (i === 0 && s.t > SWEEP_FROM ? 1 : 0)), 0.12);
          return pp > 0 ? <circle key={i} cx={P[i][0]} cy={P[i][1]} r={10 * pp} fill={C.ivory} stroke={C.ink2} strokeWidth={5} /> : null;
        })}
        {n && done ? <circle cx={P[n - 1][0]} cy={P[n - 1][1]} r={13} fill={C.ivory} stroke={C.acc} strokeWidth={6} /> : null}
        {!done && drawn.length > 1 ? <circle cx={drawn[drawn.length - 1][0]} cy={drawn[drawn.length - 1][1]} r={8} fill={u > accentFrom ? C.acc : C.ink2} /> : null}
      </svg>
      {labels.map((i, j) => (
        <Rise key={i} s={s} t0={0.15 + 0.08 * j} dy={8} x={X(i)} y={base + 38}>
          <div style={{ fontSize: 30 * k, fontWeight: 600, color: C.gray }}><Marked s={s} text={String(pts[i].x ?? '')} hlAt={0.7 + 0.08 * j} /></div>
        </Rise>
      ))}
      {threshold && String(threshold.label ?? '') !== '' ? (
        <Rise s={s} t0={0.7} dy={8} x={X0} y={thY - 24} anchor="l">
          <div style={{ fontSize: 30 * k, fontWeight: 800, color: C.accD }}><Marked s={s} text={String(threshold.label)} hlAt={1.25} /></div>
        </Rise>
      ) : null}
      {keys.map((i) => {
        const q = smooth(clamp((u - i) / 0.9 + (i === 0 && s.t > SWEEP_FROM ? 0.3 : 0)));
        const text = valueText(vals[i]);
        const half = (ems(text) * 40) / 2;
        return (
          <At key={i} s={s} x={Math.max(X0 + half, P[i][0] - (i === 0 ? 14 : 0))} y={P[i][1] - 48} style={{ opacity: q, transform: 'translate(-50%,-50%) translateY(' + (1 - q) * 10 * k + 'px)' }}>
            <div style={{ fontSize: 40 * k, fontWeight: 800, letterSpacing: -1 * k }}>{text}</div>
          </At>
        );
      })}
      {n && endText !== '' ? (
        count ? (
          <At s={s} x={X1} y={endY} anchor="r" style={{ opacity: smooth(Math.min(1, f * 2.5)) }}>{endLabel}</At>
        ) : (
          <Pop s={s} t0={popAt} x={X1} y={endY} anchor="r">{endLabel}</Pop>
        )
      ) : null}
      {cards.map((c, i) => {
        const hot = c?.tone === 'accent';
        const { head, value } = cardText[i];
        return (
          <Rise key={i} s={s} t0={sweepEnd + 0.3 + 0.4 * i} dur={0.9} dy={22} x={X0 + i * (cardW + CARD_GAP)} y={cardTop} anchor="lt">
            <div style={{ ...cardStyle(s, hot), width: cardW * k, height: cardH * k, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap' }}>
              {head.map((l, j) => <div key={'h' + j} style={{ fontSize: 26 * k, fontWeight: 600, color: C.gray, lineHeight: HL * k + 'px' }}><Marked s={s} text={l} hlAt={sweepEnd + 0.85 + 0.4 * i} /></div>)}
              {value.map((l, j) => <div key={'v' + j} style={{ fontSize: 40 * k, fontWeight: 800, color: hot ? C.acc : C.ink, letterSpacing: -1 * k, lineHeight: VL * k + 'px' }}><Marked s={s} text={l} hlAt={sweepEnd + 0.85 + 0.4 * i} /></div>)}
            </div>
          </Rise>
        );
      })}
      <Source s={s} text={String(data?.source ?? '')} />
    </Win>
  );
}
