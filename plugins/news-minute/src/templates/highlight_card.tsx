import React from 'react';
import { useCurrentFrame, useVideoConfig, delayRender, continueRender, cancelRender } from 'remotion';

// @heritage

// One big value (style spec 6-3, last line): a crimson-bordered card 860 x 400 holding the title (50),
// a short gold rule and the value (150, crimson) with its unit (80). The number inside `value` counts
// up from 0 and slows to a stop so its last digits read; text around it (a "$" prefix, a word before it) stays fixed.
// `subtitle` sits under the card, `source` bottom-right.
export default function HighlightCard({ data }) {
  // Last entrance: count-up 0.8 + 1.2 s, sub line 1.2 + 0.8 s.
  const s = useScene(data, 2.0);
  const k = s.k;
  const title = String(data?.title ?? '');
  const subtitle = String(data?.subtitle ?? '');
  const value = typeof data?.value === 'number' ? String(data.value) : String(data?.value ?? '');
  const unit = String(data?.unit ?? '');
  const W = 860, H = 400, x0 = (1080 - W) / 2, y0 = subtitle ? 190 : 214;
  const count = countable(value);
  const cp = prog(s.t, 0.8, 0.8 + 1.2);
  // Value and unit shrink together only when they would overflow the card.
  const scale = Math.min(1, (W - 100) / Math.max(1, ems(value) * 150 + ems(unit) * 80 + 8));
  const num = { fontSize: 150 * scale * k, fontWeight: 800, color: C.acc, letterSpacing: -4 * scale * k, fontVariantNumeric: 'tabular-nums', lineHeight: 1 };
  return (
    <Win s={s} data={data}>
      <Rise s={s} t0={0} dur={0.9} dy={22} x={x0} y={y0} anchor="lt">
        <div style={{ ...cardStyle(s, true), width: W * k, height: H * k }} />
      </Rise>
      {title ? (
        <Rise s={s} t0={0.3} dy={14} x={540} y={y0 + 78}>
          <div style={{ fontSize: fitSize(plainText(title), 50, W - 80) * k, fontWeight: 800, letterSpacing: -1 * k }}><Marked s={s} text={title} hlAt={0.85} /></div>
        </Rise>
      ) : null}
      <GoldRule s={s} x0={540 - 120} x1={540 + 120} y={y0 + 136} t0={0.5} />
      <Pop s={s} t0={0.8} x={540} y={y0 + (title ? 262 : 200)}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline' }}>
          {/* The final value sizes the line; the counting value is laid over it so nothing shifts. */}
          <span style={{ position: 'relative' }}>
            <span style={{ ...num, visibility: count ? 'hidden' : 'visible' }}>{value}</span>
            {count ? <span style={{ ...num, position: 'absolute', right: 0, bottom: 0 }}>{counted(count, smooth(cp))}</span> : null}
          </span>
          {unit ? <span style={{ fontSize: 80 * scale * k, fontWeight: 700, color: C.acc, marginLeft: 6 * k, lineHeight: 1 }}>{unit}</span> : null}
        </div>
      </Pop>
      {subtitle ? (
        <Rise s={s} t0={1.2} dy={10} x={540} y={y0 + H + 58}>
          <div style={{ fontSize: 30 * k, fontWeight: 500, color: C.gray }}><Marked s={s} text={subtitle} hlAt={1.75} /></div>
        </Rise>
      ) : null}
      <Source s={s} text={String(data?.source ?? '')} />
    </Win>
  );
}
