import React from 'react';
import { useCurrentFrame, useVideoConfig, delayRender, continueRender, cancelRender } from 'remotion';

// @heritage

// A share as a donut (style spec 6-5): outer radius 225, inner 138, on the left. The hero slice
// (tone "accent", crimson) sweeps alone from 12 o'clock, then the other slices follow in one
// continuous sweep with no stop between them, split by 5 px paper gaps. The hero value counts up in
// the middle with the hero label under it. The legend on the right lists the slices in their given
// (narration) order; each row arrives as its slice is drawn. Values are shown as given, never as a
// computed percentage.
const GREYS = ['#968E7E', '#BAB2A0', '#D6CEBC'];
const DCX = 300, DCY = 472, R = 225, RI = 138;
const HERO = [0.5, 1.5], REST = [1.9, 3.1];

const pt = (a, r) => [DCX + r * Math.cos((a * Math.PI) / 180), DCY + r * Math.sin((a * Math.PI) / 180)];
function sector(a0, a1) {
  const big = a1 - a0 > 180 ? 1 : 0;
  const [x0, y0] = pt(a0, R), [x1, y1] = pt(a1, R), [x2, y2] = pt(a1, RI), [x3, y3] = pt(a0, RI);
  return 'M' + x0 + ' ' + y0 + 'A' + R + ' ' + R + ' 0 ' + big + ' 1 ' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2 + 'A' + RI + ' ' + RI + ' 0 ' + big + ' 0 ' + x3 + ' ' + y3 + 'Z';
}
const fmt = (v) => { const s = String(v); const d = s.includes('.') ? s.split('.')[1].length : 0; return Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); };

export default function DonutRatio({ data }) {
  const all = (Array.isArray(data?.slices) ? data.slices : []).slice(0, 4).map((x) => ({ label: String(x?.label ?? ''), value: Math.max(0, Number(x?.value) || 0), hero: x?.tone === 'accent' }));
  let hi = all.findIndex((x) => x.hero);
  if (hi < 0) hi = 0;
  // Draw order: the hero first from 12 o'clock, then the rest in their given order.
  const order = [hi, ...all.map((_, i) => i).filter((i) => i !== hi)];
  const total = Math.max(1e-9, all.reduce((n, x) => n + x.value, 0));
  const span = (i) => (360 * all[i].value) / total;
  const restSpan = 360 - span(hi);
  // Time at which the continuous sweep reaches `deg` past the hero slice (inverse of smooth()).
  const tRest = (deg) => {
    let lo = 0, hiP = 1;
    for (let n = 0; n < 30; n += 1) { const m = (lo + hiP) / 2; if (smooth(m) * restSpan < deg) lo = m; else hiP = m; }
    return lerp(REST[0], REST[1], hiP);
  };
  const rowAt = all.map((_, i) => {
    if (i === hi) return 0.9;
    let before = 0;
    for (const j of order.slice(1)) { if (j === i) break; before += span(j); }
    return tRest(before + span(i) / 2);
  });
  // Last entrance: the legend row that arrives last (0.8 s), or the count-up.
  const s = useScene(data, Math.max(2.6, ...rowAt.map((x) => x + 0.8)));
  const k = s.k;
  const unit = String(data?.unit ?? '');
  const reach = span(hi) * smooth(prog(s.t, HERO[0], HERO[1])) + restSpan * smooth(prog(s.t, REST[0], REST[1]));
  const arcs = [];
  const gaps = [];
  let a = 0;
  let grey = 0;
  for (const i of order) {
    const col = i === hi ? C.acc : GREYS[Math.min(GREYS.length - 1, grey++)];
    all[i].color = col;
    const end = Math.min(a + span(i), reach);
    if (end > a + 0.05) {
      arcs.push(<path key={i} d={sector(a - 90, Math.min(end, a + 359.99) - 90)} fill={col} />);
      if (a > 0) gaps.push(a);
    }
    a += span(i);
  }
  const ring = smooth(prog(s.t, 0.2, 0.8));
  const hero = all[hi] ?? { label: '', value: 0 };
  const count = countable(fmt(hero.value));
  const cp = prog(s.t, 1.3, 2.6);
  const tnum = { fontVariantNumeric: 'tabular-nums', lineHeight: 1 };
  const rowY = (i) => 300 + (i === 0 ? 0 : 82 + (i - 1) * 58);
  // Legend rows in narration order, the hero row larger.
  let slot = 0;
  return (
    <Win s={s} data={data}>
      <Header s={s} title={String(data?.title ?? '')} subtitle={String(data?.subtitle ?? '')} />
      <svg width={1080 * k} height={809 * k} viewBox="0 0 1080 809" style={{ position: 'absolute', left: 0, top: 0 }}>
        <circle cx={DCX} cy={DCY} r={(R + RI) / 2} fill="none" stroke={C.line} strokeWidth={R - RI} opacity={0.7 * ring} />
        {arcs}
        {gaps.map((g) => { const [x0, y0] = pt(g - 90, RI - 2), [x1, y1] = pt(g - 90, R + 2); return <line key={g} x1={x0} y1={y0} x2={x1} y2={y1} stroke={C.ivory} strokeWidth="5" />; })}
      </svg>
      {cp > 0 ? (
        <At s={s} x={DCX + 4} y={DCY - 14}>
          <div style={{ opacity: smooth(cp / 0.35), transform: 'scale(' + lerp(0.94, 1, settle(cp, 0.3)) + ')', display: 'flex', alignItems: 'baseline', color: C.acc, fontWeight: 800 }}>
            <span style={{ ...tnum, fontSize: fitSize(fmt(hero.value), 76, 220 - ems(unit) * 42) * k }}>{count ? counted(count, smooth(cp)) : fmt(hero.value)}</span>
            {unit ? <span style={{ ...tnum, fontSize: 42 * k, fontWeight: 700 }}>{unit}</span> : null}
          </div>
        </At>
      ) : null}
      <Rise s={s} t0={2.1} dy={8} x={DCX} y={DCY + 50}>
        <div style={{ fontSize: fitSize(hero.label, 28, 230) * k, fontWeight: 700, color: C.ink2 }}>{hero.label}</div>
      </Rise>
      {all.map((x, i) => {
        const big = i === hi;
        const y = rowY(big ? 0 : ++slot);
        const sz = big ? 38 : 28;
        return (
          <React.Fragment key={i}>
            <Rise s={s} t0={rowAt[i]} dy={14} x={592} y={y} anchor="l">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 * k }}>
                <div style={{ width: 24 * k, height: 24 * k, borderRadius: 4 * k, background: x.color }} />
                <div style={{ fontSize: fitSize(x.label, sz, 300) * k, fontWeight: big ? 800 : 600, color: big ? C.ink : C.ink2 }}>{x.label}</div>
              </div>
            </Rise>
            <Rise s={s} t0={rowAt[i]} dy={14} x={X1} y={y} anchor="r">
              <div style={{ display: 'flex', alignItems: 'baseline', color: big ? C.acc : C.ink2, fontWeight: 800 }}>
                <span style={{ ...tnum, fontSize: (big ? 40 : 32) * k }}>{fmt(x.value)}</span>
                {unit ? <span style={{ ...tnum, fontSize: (big ? 28 : 22) * k, fontWeight: 700 }}>{unit}</span> : null}
              </div>
            </Rise>
          </React.Fragment>
        );
      })}
      <Source s={s} text={String(data?.source ?? '')} />
    </Win>
  );
}
