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
// Text that does not fit keeps its size (style spec 1). In the hole: the hero value (76) with its unit (42), the unit
// on a line of its own when they do not fit side by side, and the hero label (28) on as many lines as it needs, the
// stack centred on the hole. In the legend: a name breaks at a space and the rows below move down by its extra lines.
// What still does not fit (a value wider than the hole, rows past the source line) is reported for the layout check.
const HOLE = 220, VH = 80, UH = 48, LH = 34, LEG_X = 628;

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
  // Last entrance: the legend row that arrives last (0.8 s, its brush 0.55 + 0.9 s), the count-up, or the hero label brush.
  const s = useScene(data, Math.max(2.6, ...rowAt.map((x, i) => Math.max(x + 0.8, brushEnd(all[i].label, x + 0.55))), brushEnd(all[hi]?.label, 2.65),
    headerEnd(String(data?.title ?? ''), String(data?.subtitle ?? ''))));
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
  // The hole: value, unit (beside it or under it) and label lines, centred on the donut's middle.
  const heroText = fmt(hero.value);
  // Value and unit at their drawn widths (tabular digits, no margin between them).
  const heroW = textW(heroText, 76, 800), heroUnitW = unit ? textW(unit, 42, 700) : 0;
  const unitOwn = !!unit && heroW + heroUnitW > HOLE;
  const heroLabel = hero.label ? wrapLines(hero.label, 28, HOLE + 10) : [];
  const holeH = VH + (unitOwn ? UH : 0) + (heroLabel.length ? 14 + heroLabel.length * LH : 0);
  const vy = DCY - holeH / 2 + VH / 2;
  const ly = vy + VH / 2 + (unitOwn ? UH : 0) + 14 + LH / 2;
  const holeArea = [DCX - RI + 12, DCY - RI + 12, DCX + RI - 12, DCY + RI - 12];
  reportLines('value', [{ text: heroText + (unit && !unitOwn ? unit : ''), x: DCX, y: vy, anchor: 'c', w: heroW + (unitOwn ? 0 : heroUnitW) }], 76, holeArea, 1);
  reportLines('unit', unitOwn ? [{ text: unit, x: DCX, y: vy + VH / 2 + UH / 2, anchor: 'c', w: heroUnitW }] : [], 42, holeArea, 1);
  reportLines('label', heroLabel.map((l, j) => ({ text: l, x: DCX, y: ly + LH * j, anchor: 'c' })), 28, holeArea);
  // Legend rows: the hero row first and larger, then the others in narration order; a name takes the room left of
  // its value.
  const rows = [];
  let y = 300;
  [hi, ...all.map((_, i) => i).filter((i) => i !== hi)].forEach((i) => {
    const x = all[i];
    if (!x) return;
    const big = i === hi, sz = big ? 38 : 28, step = big ? 44 : 34;
    const valueW = textW(fmt(x.value), big ? 40 : 32, 800) + textW(unit, big ? 28 : 22, 700);
    // The name beside its value; a name that would take more than two lines there gets the full width and its value
    // goes on the line under it.
    let names = wrapLines(x.label, sz, Math.min(300, X1 - valueW - 16 - LEG_X)), below = false;
    if (names.length > 2) { names = wrapLines(x.label, sz, X1 - LEG_X); below = true; }
    const vy = below ? y + step * names.length : y;
    rows[i] = { y, names, sz, step, vy };
    reportLines('legend name', names.map((l, j) => ({ text: l, x: LEG_X, y: y + step * j, anchor: 'l' })), sz, [LEG_X, 150, below ? X1 : X1 - valueW - 8, roomBottom(data)]);
    report('legend value', fmt(x.value) + unit, [X1 - valueW, vy - 0.6 * (big ? 40 : 32), X1, vy + 0.6 * (big ? 40 : 32)], [LEG_X, 150, X1, roomBottom(data)], { size: big ? 40 : 32, lines: 1, maxLines: 1 });
    y += (big ? 82 : 58) + (names.length - 1 + (below ? 1 : 0)) * step;
  });
  return (
    <Win s={s} data={data}>
      <Header s={s} title={String(data?.title ?? '')} subtitle={String(data?.subtitle ?? '')} />
      <svg width={1080 * k} height={809 * k} viewBox="0 0 1080 809" style={{ position: 'absolute', left: 0, top: 0 }}>
        <circle cx={DCX} cy={DCY} r={(R + RI) / 2} fill="none" stroke={C.line} strokeWidth={R - RI} opacity={0.7 * ring} />
        {arcs}
        {gaps.map((g) => { const [x0, y0] = pt(g - 90, RI - 2), [x1, y1] = pt(g - 90, R + 2); return <line key={g} x1={x0} y1={y0} x2={x1} y2={y1} stroke={C.ivory} strokeWidth="5" />; })}
      </svg>
      {cp > 0 ? (
        <At s={s} x={DCX + 4} y={vy + (unitOwn ? UH / 2 : 0)}>
          <div style={{ opacity: smooth(cp / 0.35), transform: 'scale(' + lerp(0.94, 1, settle(cp, 0.3)) + ')', display: 'flex', flexDirection: unitOwn ? 'column' : 'row', alignItems: unitOwn ? 'center' : 'baseline', color: C.acc, fontWeight: 800 }}>
            <span style={{ ...tnum, fontSize: 76 * k, height: unitOwn ? VH * k : undefined, display: 'flex', alignItems: 'center' }}>{count ? counted(count, smooth(cp)) : heroText}</span>
            {unit ? <span style={{ ...tnum, fontSize: 42 * k, fontWeight: 700, height: unitOwn ? UH * k : undefined }}>{unit}</span> : null}
          </div>
        </At>
      ) : null}
      {heroLabel.map((l, j) => (
        <Rise key={'h' + j} s={s} t0={2.1} dy={8} x={DCX} y={ly + LH * j}>
          <div style={{ fontSize: 28 * k, fontWeight: 700, color: C.ink2 }}><Marked s={s} text={l} hlAt={2.65} /></div>
        </Rise>
      ))}
      {all.map((x, i) => {
        const big = i === hi;
        const { y, names, sz, step, vy } = rows[i];
        return (
          <React.Fragment key={i}>
            <Rise s={s} t0={rowAt[i]} dy={14} x={592} y={y} anchor="l">
              <div style={{ width: 24 * k, height: 24 * k, borderRadius: 4 * k, background: x.color }} />
            </Rise>
            {names.map((l, j) => (
              <Rise key={'n' + j} s={s} t0={rowAt[i]} dy={14} x={LEG_X} y={y + step * j} anchor="l">
                <div style={{ fontSize: sz * k, fontWeight: big ? 800 : 600, color: big ? C.ink : C.ink2 }}><Marked s={s} text={l} hlAt={rowAt[i] + 0.55} /></div>
              </Rise>
            ))}
            <Rise s={s} t0={rowAt[i]} dy={14} x={X1} y={vy} anchor="r">
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
