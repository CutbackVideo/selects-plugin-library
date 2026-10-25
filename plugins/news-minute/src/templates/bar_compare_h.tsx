import React from 'react';
import { useCurrentFrame, useVideoConfig, delayRender, continueRender, cancelRender } from 'remotion';

// @heritage

// Bar comparison (style spec 6-1), 2-3 vertical bars on a gold baseline (window y 600, drawn left to
// right 0.1-1.0 s), no grid. The accent bar is the hero: crimson, 290 wide, grows 1.7 s and settles
// 1.5 %, its value counts up in white inside the bar once it is up. Grey bars are 200 wide, grow 1.0 s
// and settle 3 %, their value pops above the bar 0.6 s after it starts. Name (54/800) and optional
// `sub` (30/500 grey) sit under the baseline. Bars come in array order (narration order); a long
// clip spaces them further apart. No multiples or ratios are drawn (spec 7).
// `bars: [{ label, sub?, value, tone: "grey" | "accent" }]`, values are numbers in `unit`.
// Text that does not fit keeps its size (style spec 1): a name or sub line breaks onto more lines at a space and the
// baseline rises by those lines (the bars get shorter) so they stay above the source line; a value with its unit
// wider than its slot puts the unit on a line of its own; a hero value that does not fit inside its bar goes above
// it (72) like a short bar's. What still does not fit is reported for the layout check.
const BASE0 = 600, LL = 60, SL = 36, UL = 44;
const decimals = (v) => { const t = String(v); return t.includes('.') && !/e/i.test(t) ? t.length - t.indexOf('.') - 1 : 0; };
// Korean graphics write 5000 but 12,500: group thousands only from five digits up.
const fmt = (v, d) => (Number(v.toFixed(d)) || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: Math.abs(v) >= 10000 });

export default function BarCompareH({ data }) {
  const accent = String(data?.accentColor ?? C.acc);
  const bars = (Array.isArray(data?.bars) ? data.bars : []).slice(0, 3);
  const n = bars.length;
  const unit = String(data?.unit ?? '');
  const subtitle = String(data?.subtitle ?? '');
  const vals = bars.map((b) => Math.abs(Number(b?.value) || 0));
  const hero = bars.findIndex((b) => b?.tone === 'accent');
  // One decimal count for every bar, so 0.6 and 0.69 read 0.60 and 0.69.
  const dec = Math.min(3, Math.max(0, ...bars.map((b) => decimals(Number(b?.value) || 0))));
  // Bar i starts after the previous one: 1.0 s after a grey bar, 1.5 s after the hero.
  const gap = (i) => (i === hero ? 1.5 : 1.0);
  const tail = (i) => (i === hero ? 2.5 : 1.4);
  const base = bars.map((_, i) => 0.6 + bars.slice(0, i).reduce((a, __, j) => a + gap(j), 0));
  // Last entrance at the tightest spacing: the hero count-up (bar start + 1.2 + 1.3 s), a grey value pop
  // (start + 0.6 + 0.8 s) or a name/sub brush (start + 0.6/0.72 + 0.9 s).
  const brushed = (b) => Math.max(brushEnd(b?.label, 0.6), brushEnd(b?.sub, 0.72));
  const tight = Math.max(1.2, ...base.map((t0, i) => t0 + Math.max(tail(i), brushed(bars[i]))));
  // A clip with room to spare spaces the bars out (up to +1 s each, half the slack) so they follow the
  // narration; a clip too short for the tight timeline has no slack. Worked out before useScene so its
  // `natural` (where the preview seeks to) includes the spacing.
  const { fps, durationInFrames } = useVideoConfig();
  const end = durationInFrames / fps;
  const extra = n > 1 && tight <= Math.max(end * 0.5, end - HOLD) ? Math.min(1, Math.max(0, end - HOLD - tight) * 0.5 / (n - 1)) : 0;
  const start = base.map((t0, i) => t0 + extra * i);
  const s = useScene(data, Math.max(tight + extra * (n - 1), headerEnd(String(data?.title ?? ''), subtitle)));
  const k = s.k;
  // Equal gaps between the bars and the margins x 60..1020.
  const ws = bars.map((_, i) => (i === hero ? 290 : 200));
  const space = (X1 - X0 - ws.reduce((a, w) => a + w, 0)) / (n + 1);
  const cx = ws.map((w, i) => X0 + space * (i + 1) + ws.slice(0, i).reduce((a, x) => a + x, 0) + w / 2);
  const slots = ws.map((w) => w + space - 8);
  // Names and sub lines at full size on as many lines as they need; the baseline rises by the longest.
  const names = bars.map((b, i) => wrapLines(String(b?.label ?? ''), 54, slots[i], font(54, 800, -1)));
  const subs = bars.map((b, i) => (String(b?.sub ?? '') ? wrapLines(String(b.sub), 30, slots[i], font(30, 500)) : []));
  const nameExtra = (Math.max(1, ...names.map((l) => l.length)) - 1) * LL;
  const subExtra = (Math.max(1, ...subs.map((l) => l.length)) - 1) * SL;
  const BASE = BASE0 - nameExtra - subExtra;
  const max = Math.max(1e-9, ...vals);
  // Values and units at their drawn widths (tabular digits, the value's letter spacing, the unit's 3 px margin).
  const numW = (text, size) => textW(text, size, 800, -1), unitW = (uSize) => (unit ? textW(unit, uSize, 700) : 0);
  // A value with its unit wider than maxW puts the unit under it.
  const unitOwn = (text, size, uSize, maxW) => !!unit && numW(text, size) + 3 + unitW(uSize) > maxW;
  const finals = bars.map((b) => fmt(Number(b?.value) || 0, dec));
  // The hero value counts up inside its bar (86, its unit under it when they do not fit side by side) when the number
  // fits the bar's width; else it pops above the bar (72).
  const fitsInside = hero >= 0 && numW(finals[hero], 86) <= ws[hero] - 24;
  const ownInside = fitsInside && unitOwn(finals[hero], 86, 48, ws[hero] - 24);
  const above = (i) => (i === hero ? (fitsInside ? null : { size: 72, uSize: 40, lift: 52 }) : { size: 58, uSize: 34, lift: 48 });
  // The tallest bar is 400 when it holds its value inside; a value above it needs room under the header (and a line
  // more for a unit of its own). Lines the names and sub lines took come off the bars.
  const top = vals.indexOf(Math.max(...vals));
  const ownAbove = bars.some((_, i) => above(i) && unitOwn(finals[i], above(i).size, above(i).uSize, slots[i]));
  const tallH = (top === hero && fitsInside ? 400 : subtitle ? 340 : 380) - nameExtra - subExtra - (ownAbove ? UL : 0);
  const H = vals.map((v) => (v / max) * tallH);
  const inside = fitsInside && H[hero] >= 150 + (ownInside ? UL : 0);
  const pb = smooth(prog(s.t, 0.1, 1.0));
  const valueRun = (text, size, uSize, color, own) => (
    <div style={{ display: 'flex', flexDirection: own ? 'column' : 'row', alignItems: own ? 'center' : 'baseline', color, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
      <span style={{ fontSize: size * k, letterSpacing: -1 * k }}>{text}</span>
      {unit ? <span style={{ fontSize: uSize * k, fontWeight: 700, marginLeft: own ? 0 : 3 * k, marginTop: own ? (UL - uSize) * k : 0 }}>{unit}</span> : null}
    </div>
  );
  // Where each value's line(s) sit: above the bar (its centre `lift` over the bar top, raised half a line when the unit
  // has its own), or inside the hero bar.
  const valueAt = bars.map((_, i) => {
    const a = i === hero && inside ? null : above(i) ?? { size: 72, uSize: 40, lift: 52 };
    if (!a) return { inside: true, size: 86, uSize: 48, own: ownInside, y: BASE - H[i] + 80 + (ownInside ? UL / 2 : 0) };
    const own = unitOwn(finals[i], a.size, a.uSize, slots[i]);
    return { inside: false, size: a.size, uSize: a.uSize, own, y: BASE - H[i] - a.lift - (own ? UL / 2 : 0) };
  });
  const roomTop = subtitle ? 162 : 112;
  bars.forEach((_, i) => {
    const area = [cx[i] - slots[i] / 2, BASE, cx[i] + slots[i] / 2, roomBottom(data)];
    reportLines('bar name', names[i].map((l, j) => ({ text: l, x: cx[i], y: BASE + 48 + LL * j, anchor: 'c' })), 54, area, 2, font(54, 800, -1));
    reportLines('bar sub line', subs[i].map((l, j) => ({ text: l, x: cx[i], y: BASE + 100 + nameExtra + SL * j, anchor: 'c' })), 30, area, 2, font(30, 500));
    const v = valueAt[i];
    const vArea = v.inside ? [cx[i] - ws[i] / 2 + 12, BASE - H[i], cx[i] + ws[i] / 2 - 12, BASE] : [cx[i] - slots[i] / 2, roomTop, cx[i] + slots[i] / 2, BASE - H[i]];
    // The value and its unit at their own sizes, side by side or the unit under the value.
    const vw = numW(finals[i], v.size), uw = unitW(v.uSize);
    const vy = v.own ? v.y - UL / 2 : v.y, half = (v.own ? Math.max(vw, uw) : vw + uw + (unit ? 3 : 0)) / 2;
    const vBox = [cx[i] - half, vy - 0.6 * v.size, cx[i] + half, (v.own ? v.y + UL / 2 + 0.6 * v.uSize : vy + 0.6 * v.size)];
    report('bar value', finals[i] + unit, vBox, vArea, { size: v.size, lines: 1, maxLines: 1 });
    // In the bar it counts up (and stays in the bar); above it, it pops in.
    reportGrown('bar value', finals[i] + unit, vBox, v.inside ? [COUNT_GROW, [cx[i] - ws[i] / 2, -Infinity, cx[i] + ws[i] / 2, Infinity], 'bar'] : [POP_GROW, SAFE, 'safe area'], v.size);
  });
  return (
    <Win s={s} data={data}>
      <Header s={s} title={String(data?.title ?? '')} subtitle={subtitle} />
      {pb > 0 ? <div style={{ position: 'absolute', left: X0 * k, top: BASE * k, width: (X1 - X0) * pb * k, height: 2 * k, background: C.gold }} /> : null}
      {bars.map((b, i) => {
        const big = i === hero, t0 = start[i], w = ws[i];
        const h = H[i] * settle(prog(s.t, t0, t0 + (big ? 1.7 : 1.0)), big ? 0.015 : 0.03);
        const v = Number(b?.value) || 0;
        // Hero count-up: starts once the bar is about up, slows into its final value (1.3 s).
        const cp = prog(s.t, t0 + 1.2, t0 + 2.5);
        return (
          <React.Fragment key={i}>
            {h > 0.5 ? <div style={{ position: 'absolute', left: (cx[i] - w / 2) * k, top: (BASE - h) * k, width: w * k, height: h * k, background: big ? accent : C.bar, borderRadius: Math.min(8, h) * k + 'px ' + Math.min(8, h) * k + 'px 0 0' }} /> : null}
            {names[i].map((l, j) => (
              <Rise key={'n' + j} s={s} t0={t0 + 0.05} dy={14} x={cx[i]} y={BASE + 48 + LL * j}>
                <div style={{ fontSize: 54 * k, fontWeight: 800, letterSpacing: -1 * k, color: big ? (accent === C.acc ? C.accD : accent) : C.ink }}><Marked s={s} text={l} hlAt={t0 + 0.6} /></div>
              </Rise>
            ))}
            {subs[i].map((l, j) => (
              <Rise key={'u' + j} s={s} t0={t0 + 0.17} dy={14} x={cx[i]} y={BASE + 100 + nameExtra + SL * j}>
                <div style={{ fontSize: 30 * k, fontWeight: 500, color: C.gray }}><Marked s={s} text={l} hlAt={t0 + 0.72} /></div>
              </Rise>
            ))}
            {!big ? <Pop s={s} t0={t0 + 0.6} x={cx[i]} y={valueAt[i].y}>{valueRun(finals[i], 58, 34, C.ink2, valueAt[i].own)}</Pop> : null}
            {big && inside && cp > 0 ? (
              <At s={s} x={cx[i]} y={BASE - h + 80 + (ownInside ? UL / 2 : 0)}>
                <div style={{ opacity: smooth(cp / 0.35), transform: 'scale(' + lerp(0.94, 1, settle(cp, 0.3)) + ')' }}>{valueRun(fmt(v * smooth(cp), dec), 86, 48, C.white, ownInside)}</div>
              </At>
            ) : null}
            {big && !inside ? <Pop s={s} t0={t0 + 1.2} x={cx[i]} y={valueAt[i].y}>{valueRun(finals[i], 72, 40, accent, valueAt[i].own)}</Pop> : null}
          </React.Fragment>
        );
      })}
      <Source s={s} text={String(data?.source ?? '')} />
    </Win>
  );
}
