import React from 'react';
import { useCurrentFrame, useVideoConfig, delayRender, continueRender, cancelRender } from 'remotion';

// @heritage

// Before -> after value under the scene title: the old value (96, dark grey) rises in, a gold
// chevron (reading order only, no up/down meaning) draws `revealSec` later, then the new value (150,
// crimson) pops and counts up from the old one (from 0 when the two are not comparable numbers). A
// small crimson triangle beside the new value says whether it rose or fell, by comparing the two
// numbers; no difference is computed or shown. `from`/`to` are numbers (shown with their own
// decimals plus `unit`) or already-formatted strings. A photo is never drawn here (spec 2: no
// decoration behind the numbers).
// Text that does not fit keeps its size (style spec 1): the label breaks at a space, a value after \uC5B5/\uB9CC
// (1\uC5B5 / 5000\uB9CC) or a space, and a unit that no longer fits beside its value takes a line of its own; the whole
// column stays centred. A new value on several lines shows its final text, without the count-up.
const LBL = 52, FL = 104, FU = 86, TL = 160, TU = 120, W = 900;
const show = (v) => {
  if (typeof v === 'number') {
    const str = String(v);
    const d = str.includes('.') ? str.split('.')[1].length : 0;
    return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  return String(v ?? '');
};

export default function NumberCallout({ data }) {
  const reveal = Math.max(0, Number(data?.revealSec ?? 0.75));
  const fromAt = 0.5, arrowAt = fromAt + reveal, toAt = arrowAt + 0.5;
  // Last entrance: the rise/fall triangle, 1.0 + 0.6 s after the new value starts (label and header brushes end earlier
  // unless the reveal is very short).
  const s = useScene(data, Math.max(toAt + 1.6, brushEnd(data?.label, 0.95), headerEnd(String(data?.title ?? ''), String(data?.subtitle ?? ''))));
  const k = s.k;
  const title = String(data?.title ?? '');
  const label = String(data?.label ?? '');
  const unit = String(data?.unit ?? '');
  const from = show(data?.from), raw = show(data?.to);
  const cf = countable(from), ct = countable(raw);
  const cp = smooth(prog(s.t, toAt, toAt + 1.2));
  // Count from the old value when both hold one number in the same format, else from 0.
  const same = cf && ct && cf.head === ct.head && cf.tail === ct.tail;
  const running = !ct ? raw : same
    ? counted({ ...ct, num: lerp(cf.num, ct.num, cp), decimals: Math.max(cf.decimals, ct.decimals) }, 1)
    : counted(ct, cp);
  // The text the count-up lands on ("1000000" -> 1,000,000): the lines and the layout check use it.
  const to = !ct ? raw : same ? counted({ ...ct, decimals: Math.max(cf.decimals, ct.decimals) }, 1) : counted(ct, 1);
  const top = title ? 150 : 40;
  const mid = (top + 794) / 2;
  // Rose or fell: only when both values hold one number in the same format.
  const dir = cf && ct && cf.head === ct.head && cf.tail === ct.tail && cf.num !== ct.num ? (ct.num > cf.num ? 'up' : 'down') : '';
  const labelLines = label ? wrapLines(label, 44, W) : [];
  // Values and units at their drawn widths: tabular digits, the line's letter spacing (on the unit beside it too),
  // the unit's margin; the new value's triangle takes 62 px (18 + 44). Values may use the whole graphic area x 60..1020.
  const fromW = (t) => textW(t, 96, 800, -2), toW = (t) => textW(t, 150, 800, -4);
  const fromUnitW = (ls) => textW(unit, 53, 700, ls), toUnitW = (ls) => textW(unit, 80, 700, ls);
  const VW = X1 - X0;
  const fromLines = wrapLines(from, 96, VW, fromW), toLines = wrapLines(to, 150, VW, toW);
  const last = (l) => l[l.length - 1];
  const fromOwn = !!unit && fromW(last(fromLines)) + 4 + fromUnitW(-2) > VW;
  const toOwn = !!unit && toW(last(toLines)) + 6 + toUnitW(-4) + (dir ? 62 : 0) > VW;
  // Lines past one (and units on their own line) push the column down; it moves up by half of that to stay centred.
  const labelExtra = Math.max(0, labelLines.length - 1) * LBL;
  const fromExtra = (fromLines.length - 1) * FL + (fromOwn ? FU : 0);
  const toExtra = (toLines.length - 1) * TL + (toOwn ? TU : 0);
  // One-line values sit where the sian puts them; extra lines grow the column downwards, and it moves up only as far as
  // it must to end above the source line (never above the title).
  const place = (yFrom) => {
    const yTo = yFrom + fromExtra + 290, yToUnit = yTo + (toLines.length - 1) * TL + TU;
    return { yFrom, yArrow: yFrom + fromExtra + 80, yTo, yToUnit, bottom: toOwn ? yToUnit + 48 : yTo + (toLines.length - 1) * TL + 90,
      top: label ? yFrom - 110 - labelExtra - 26 : yFrom - 58 };
  };
  const first = place(mid - 190 + (label ? 30 : 0) + labelExtra);
  const { yFrom, yArrow, yTo, yToUnit } = place(first.yFrom - Math.max(0, Math.min(first.bottom - (roomBottom(data) - 6), first.top - (top + 6))));
  const counts = toLines.length === 1 && !toOwn;
  const ap = smooth(prog(s.t, arrowAt, arrowAt + 0.6));
  const area = [X0 + 30, top, X1 - 30, roomBottom(data)], valueArea = [X0, top, X1, roomBottom(data)];
  const col = (list, y, step) => list.map((l, j) => ({ text: l, x: 540, y: y + step * j, anchor: 'c' }));
  reportLines('label', col(labelLines, yFrom - 110 - labelExtra, LBL), 44, area);
  // A value's lines with the unit (at its own smaller size) beside the last one, as drawn.
  const valueReport = (what, list, y, step, size, lineW, beside, own) => {
    if (!list.length) return;
    const w = list.map((l, j) => lineW(l) + (j === list.length - 1 ? beside : 0));
    const x0 = Math.min(...w.map((x) => 540 - x / 2)), x1 = Math.max(...w.map((x) => 540 + x / 2));
    report(what, list.join(' ') + (own ? '' : unit), [x0, y - 0.6 * size, x1, y + step * (list.length - 1) + 0.6 * size], valueArea, { size, lines: list.length, maxLines: 2 });
  };
  valueReport('old value', fromLines, yFrom, FL, 96, fromW, unit && !fromOwn ? 4 + fromUnitW(-2) : 0, fromOwn);
  reportLines('old value unit', fromOwn ? col([unit], yFrom + (fromLines.length - 1) * FL + FU, 0).map((l) => ({ ...l, w: fromUnitW(0) })) : [], 53, valueArea, 1);
  valueReport('new value', toLines, yTo, TL, 150, toW, (unit && !toOwn ? 6 + toUnitW(-4) : 0) + (dir && !toOwn ? 62 : 0), toOwn);
  reportLines('new value unit', toOwn ? col([unit], yToUnit, 0).map((l) => ({ ...l, w: toUnitW(0) + (dir ? 62 : 0) })) : [], 80, valueArea, 1);
  const tri = prog(s.t, toAt + 1.0, toAt + 1.6);
  const tnum = { fontVariantNumeric: 'tabular-nums', lineHeight: 1 };
  const triangle = dir ? (
    <svg width={44 * k} height={40 * k} viewBox="0 0 44 40" style={{ marginLeft: 18 * k, alignSelf: 'center', opacity: smooth(tri / 0.6), transform: 'translateY(' + (1 - smooth(tri)) * (dir === 'up' ? 8 : -8) * k + 'px)' }}>
      <polygon points={dir === 'up' ? '22,2 42,38 2,38' : '2,2 42,2 22,38'} fill={C.acc} />
    </svg>
  ) : null;
  return (
    <Win s={s} data={data}>
      <Header s={s} title={title} subtitle={String(data?.subtitle ?? '')} />
      {labelLines.map((l, j) => (
        <Rise key={'l' + j} s={s} t0={0.4} dy={10} x={540} y={yFrom - 110 - labelExtra + LBL * j}>
          <div style={{ fontSize: 44 * k, fontWeight: 700, color: C.ink2 }}><Marked s={s} text={l} hlAt={0.95} /></div>
        </Rise>
      ))}
      {fromLines.map((l, j) => (
        <Rise key={'f' + j} s={s} t0={fromAt} x={540} y={yFrom + FL * j}>
          <div style={{ display: 'flex', alignItems: 'baseline', color: C.ink2, fontWeight: 800, letterSpacing: -2 * k }}>
            <span style={{ ...tnum, fontSize: 96 * k }}>{l}</span>
            {unit && !fromOwn && j === fromLines.length - 1 ? <span style={{ ...tnum, fontSize: 53 * k, fontWeight: 700, marginLeft: 4 * k }}>{unit}</span> : null}
          </div>
        </Rise>
      ))}
      {fromOwn ? (
        <Rise s={s} t0={fromAt} x={540} y={yFrom + (fromLines.length - 1) * FL + FU}>
          <span style={{ ...tnum, fontSize: 53 * k, fontWeight: 700, color: C.ink2 }}>{unit}</span>
        </Rise>
      ) : null}
      {ap > 0 ? (
        // Gold chevron, opening from its centre outwards.
        <svg width={80 * k} height={60 * k} viewBox="0 0 80 60" style={{ position: 'absolute', left: 500 * k, top: (yArrow + 25) * k }}>
          <polyline points={(40 - 28 * ap) + ',' + (14 + 22 * (1 - ap)) + ' 40,36 ' + (40 + 28 * ap) + ',' + (14 + 22 * (1 - ap))} fill="none" stroke={C.gold} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
      {toLines.map((l, j) => (
        <Pop key={'t' + j} s={s} t0={toAt} x={540} y={yTo + TL * j}>
          <div style={{ display: 'flex', alignItems: 'baseline', color: C.acc, fontWeight: 800, letterSpacing: -4 * k }}>
            <span style={{ position: 'relative' }}>
              {/* The final value sizes the line; the counting value is laid over it so nothing shifts. */}
              <span style={{ ...tnum, fontSize: 150 * k, visibility: counts ? 'hidden' : 'visible' }}>{l}</span>
              {counts ? <span style={{ ...tnum, fontSize: 150 * k, position: 'absolute', right: 0, bottom: 0 }}>{running}</span> : null}
            </span>
            {unit && !toOwn && j === toLines.length - 1 ? <span style={{ ...tnum, fontSize: 80 * k, fontWeight: 700, marginLeft: 6 * k }}>{unit}</span> : null}
            {!toOwn && j === toLines.length - 1 ? triangle : null}
          </div>
        </Pop>
      ))}
      {toOwn ? (
        <Pop s={s} t0={toAt} x={540} y={yToUnit}>
          <div style={{ display: 'flex', alignItems: 'baseline', color: C.acc, fontWeight: 800 }}>
            <span style={{ ...tnum, fontSize: 80 * k, fontWeight: 700 }}>{unit}</span>
            {triangle}
          </div>
        </Pop>
      ) : null}
      <Source s={s} text={String(data?.source ?? '')} />
    </Win>
  );
}
