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
const BASE = 600;
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
  // Last entrance: the hero count-up (bar start + 1.2 + 1.3 s) or a grey value pop (start + 0.6 + 0.8 s).
  const natural = Math.max(1.2, ...base.map((t0, i) => t0 + tail(i)));
  const s = useScene(data, natural);
  const k = s.k;
  // A clip with room to spare spaces the bars out (up to +1 s each, half the slack) so they follow the
  // narration; a sped-up clip has no slack.
  const extra = n > 1 && s.speed === 1 ? Math.min(1, Math.max(0, s.end - HOLD - natural) * 0.5 / (n - 1)) : 0;
  const start = base.map((t0, i) => t0 + extra * i);
  // Equal gaps between the bars and the margins x 60..1020.
  const ws = bars.map((_, i) => (i === hero ? 290 : 200));
  const space = (X1 - X0 - ws.reduce((a, w) => a + w, 0)) / (n + 1);
  const cx = ws.map((w, i) => X0 + space * (i + 1) + ws.slice(0, i).reduce((a, x) => a + x, 0) + w / 2);
  const max = Math.max(1e-9, ...vals);
  // The tallest bar is 400 when it holds its value inside; a value above it needs room under the header.
  const top = vals.indexOf(Math.max(...vals));
  const tallH = top === hero ? 400 : subtitle ? 340 : 380;
  const H = vals.map((v) => (v / max) * tallH);
  const inside = hero >= 0 && H[hero] >= 150;
  const pb = smooth(prog(s.t, 0.1, 1.0));
  const valueRun = (text, size, uSize, color, maxW) => {
    const sc = Math.min(1, maxW / Math.max(1, ems(text) * size + ems(unit) * uSize + 4));
    return (
      <div style={{ display: 'flex', alignItems: 'baseline', color, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        <span style={{ fontSize: size * sc * k, letterSpacing: -1 * sc * k }}>{text}</span>
        {unit ? <span style={{ fontSize: uSize * sc * k, fontWeight: 700, marginLeft: 3 * sc * k }}>{unit}</span> : null}
      </div>
    );
  };
  return (
    <Win s={s} data={data}>
      <Header s={s} title={String(data?.title ?? '')} subtitle={subtitle} />
      {pb > 0 ? <div style={{ position: 'absolute', left: X0 * k, top: BASE * k, width: (X1 - X0) * pb * k, height: 2 * k, background: C.gold }} /> : null}
      {bars.map((b, i) => {
        const big = i === hero, t0 = start[i], w = ws[i];
        const h = H[i] * settle(prog(s.t, t0, t0 + (big ? 1.7 : 1.0)), big ? 0.015 : 0.03);
        const slot = w + space - 8;
        const label = String(b?.label ?? ''), sub = String(b?.sub ?? '');
        const v = Number(b?.value) || 0;
        // Hero count-up: starts once the bar is about up, slows into its final value (1.3 s).
        const cp = prog(s.t, t0 + 1.2, t0 + 2.5);
        return (
          <React.Fragment key={i}>
            {h > 0.5 ? <div style={{ position: 'absolute', left: (cx[i] - w / 2) * k, top: (BASE - h) * k, width: w * k, height: h * k, background: big ? accent : C.bar, borderRadius: Math.min(8, h) * k + 'px ' + Math.min(8, h) * k + 'px 0 0' }} /> : null}
            <Rise s={s} t0={t0 + 0.05} dy={14} x={cx[i]} y={BASE + 48}>
              <div style={{ fontSize: fitSize(label, 54, slot) * k, fontWeight: 800, letterSpacing: -1 * k, color: big ? (accent === C.acc ? C.accD : accent) : C.ink }}>{label}</div>
            </Rise>
            {sub ? (
              <Rise s={s} t0={t0 + 0.17} dy={14} x={cx[i]} y={BASE + 100}>
                <div style={{ fontSize: fitSize(sub, 30, slot) * k, fontWeight: 500, color: C.gray }}>{sub}</div>
              </Rise>
            ) : null}
            {!big ? <Pop s={s} t0={t0 + 0.6} x={cx[i]} y={BASE - H[i] - 48}>{valueRun(fmt(v, dec), 58, 34, C.ink2, slot)}</Pop> : null}
            {big && inside && cp > 0 ? (
              <At s={s} x={cx[i]} y={BASE - h + 80}>
                <div style={{ opacity: smooth(cp / 0.35), transform: 'scale(' + lerp(0.94, 1, settle(cp, 0.3)) + ')' }}>{valueRun(fmt(v * smooth(cp), dec), 86, 48, C.white, w - 24)}</div>
              </At>
            ) : null}
            {big && !inside ? <Pop s={s} t0={t0 + 1.2} x={cx[i]} y={BASE - H[i] - 52}>{valueRun(fmt(v, dec), 72, 40, accent, slot)}</Pop> : null}
          </React.Fragment>
        );
      })}
      <Source s={s} text={String(data?.source ?? '')} />
    </Win>
  );
}
