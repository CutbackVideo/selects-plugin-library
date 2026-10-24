import React from 'react';
import { useCurrentFrame, useVideoConfig, delayRender, continueRender, cancelRender } from 'remotion';

// @heritage

// One big value (style spec 6-3, last line): a crimson-bordered card 860 x 400 holding the title (50),
// a short gold rule and the value (150, crimson) with its unit (80). The number inside `value` counts
// up from 0 and slows to a stop so its last digits read; text around it (a "$" prefix, a word before it) stays fixed.
// Text that does not fit keeps its size and breaks onto more lines (style spec 1): the title at a space, the
// value after \uC5B5/\uB9CC (1\uC5B5 / 5000\uB9CC) or a space, the unit onto a line of its own; the card grows to hold them (a
// value on several lines shows its final text, without the count-up). `subtitle` sits under the card,
// `source` bottom-right.
const W = 860, IN = W - 100, TL = 62, VL = 160, UL = 96;
export default function HighlightCard({ data }) {
  const title = String(data?.title ?? '');
  const subtitle = String(data?.subtitle ?? '');
  // Last entrance: count-up 0.8 + 1.2 s, sub line 1.2 + 0.8 s, or a brush in the title or sub line.
  const s = useScene(data, Math.max(2.0, brushEnd(title, 0.85), brushEnd(subtitle, 1.75)));
  const k = s.k;
  const raw = typeof data?.value === 'number' ? String(data.value) : String(data?.value ?? '');
  // The count-up lands on its final text (1000000 -> 1,000,000): the lines and the layout check use that text.
  const final = countable(raw);
  const value = final ? counted(final, 1) : raw;
  const unit = String(data?.unit ?? '');
  const titleLines = title ? wrapLines(title, 50, W - 80) : [];
  const subLines = subtitle ? wrapLines(subtitle, 30, X1 - X0) : [];
  // Value and unit at their drawn widths (tabular digits, letter spacing, the unit's 6 px margin).
  const valueW = (t) => textW(t, 150, 800, -4), unitW = unit ? textW(unit, 80, 700) : 0;
  const vLines = wrapLines(value, 150, IN, valueW);
  // The unit stays beside the last value line when it fits there.
  const unitOwn = !!unit && valueW(vLines[vLines.length - 1]) + 6 + unitW > IN;
  const grow = Math.max(0, titleLines.length - 1) * TL + (vLines.length - 1) * VL + (unitOwn ? UL : 0);
  const H = 400 + grow;
  const x0 = (1080 - W) / 2;
  const below = subLines.length ? 58 + 40 * subLines.length : 0;
  const y0 = Math.max(0, Math.min(subtitle ? 190 : 214, 770 - H - below));
  const count = vLines.length === 1 && !unitOwn ? countable(value) : null;
  const cp = prog(s.t, 0.8, 0.8 + 1.2);
  const num = { fontSize: 150 * k, fontWeight: 800, color: C.acc, letterSpacing: -4 * k, fontVariantNumeric: 'tabular-nums', lineHeight: 1 };
  const unitStyle = { fontSize: 80 * k, fontWeight: 700, color: C.acc, marginLeft: 6 * k, lineHeight: 1 };
  const vy = y0 + (title ? 262 : 200) + Math.max(0, titleLines.length - 1) * TL;
  const inCard = (pad) => [x0 + pad, y0, x0 + W - pad, y0 + H];
  report('card', title + ' ' + value + unit, [x0, y0, x0 + W, y0 + H], [X0, 0, X1, roomBottom(data)]);
  reportLines('title', titleLines.map((l, j) => ({ text: l, x: 540, y: y0 + 78 + TL * j, anchor: 'c' })), 50, inCard(40));
  const beside = (r) => !!unit && !unitOwn && r === vLines.length - 1;
  reportLines('value', vLines.map((l, r) => ({ text: l + (beside(r) ? unit : ''), x: 540, y: vy + VL * r, anchor: 'c', w: valueW(l) + (beside(r) ? 6 + unitW : 0) })), 150, inCard(50));
  reportLines('unit', unitOwn ? [{ text: unit, x: 540, y: vy + VL * (vLines.length - 1) + 128, anchor: 'c', w: unitW }] : [], 80, inCard(50), 1);
  reportLines('sub line', subLines.map((l, j) => ({ text: l, x: 540, y: y0 + H + 58 + 40 * j, anchor: 'c' })), 30, [X0, 0, X1, roomBottom(data)]);
  return (
    <Win s={s} data={data}>
      <Rise s={s} t0={0} dur={0.9} dy={22} x={x0} y={y0} anchor="lt">
        <div style={{ ...cardStyle(s, true), width: W * k, height: H * k }} />
      </Rise>
      {titleLines.map((l, j) => (
        <Rise key={'t' + j} s={s} t0={0.3} dy={14} x={540} y={y0 + 78 + TL * j}>
          <div style={{ fontSize: 50 * k, fontWeight: 800, letterSpacing: -1 * k }}><Marked s={s} text={l} hlAt={0.85} /></div>
        </Rise>
      ))}
      <GoldRule s={s} x0={540 - 120} x1={540 + 120} y={y0 + 136 + Math.max(0, titleLines.length - 1) * TL} t0={0.5} />
      {vLines.map((l, r) => (
        <Pop key={'v' + r} s={s} t0={0.8} x={540} y={vy + VL * r}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline' }}>
            {/* The final value sizes the line; the counting value is laid over it so nothing shifts. */}
            <span style={{ position: 'relative' }}>
              <span style={{ ...num, visibility: count ? 'hidden' : 'visible' }}>{l}</span>
              {count ? <span style={{ ...num, position: 'absolute', right: 0, bottom: 0 }}>{counted(count, smooth(cp))}</span> : null}
            </span>
            {unit && !unitOwn && r === vLines.length - 1 ? <span style={unitStyle}>{unit}</span> : null}
          </div>
        </Pop>
      ))}
      {unitOwn ? <Pop s={s} t0={0.8} x={540} y={vy + VL * (vLines.length - 1) + 128}><span style={{ ...unitStyle, marginLeft: 0 }}>{unit}</span></Pop> : null}
      {subLines.map((l, j) => (
        <Rise key={'s' + j} s={s} t0={1.2} dy={10} x={540} y={y0 + H + 58 + 40 * j}>
          <div style={{ fontSize: 30 * k, fontWeight: 500, color: C.gray }}><Marked s={s} text={l} hlAt={1.75} /></div>
        </Rise>
      ))}
      <Source s={s} text={String(data?.source ?? '')} />
    </Win>
  );
}
