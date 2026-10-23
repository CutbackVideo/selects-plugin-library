import React from 'react';
import { Img, useCurrentFrame, useVideoConfig, delayRender, continueRender, cancelRender } from 'remotion';

// @heritage

// Before -> after value under the scene title: the old value (96, dark grey) rises in, a crimson
// arrow draws down `revealSec` later, then the new value (150, crimson) pops and counts up from the
// old one (from 0 when the two are not comparable numbers). `from`/`to` are numbers (shown with their
// own decimals plus `unit`) or already-formatted strings. An optional photo shows faintly through
// the paper, never competing with the numbers.
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
  // Last entrance: the count-up, 1.2 s after the new value starts.
  const s = useScene(data, toAt + 1.2);
  const k = s.k;
  const title = String(data?.title ?? '');
  const label = String(data?.label ?? '');
  const unit = String(data?.unit ?? '');
  const from = show(data?.from), to = show(data?.to);
  const image = typeof data?.image === 'string' ? data.image : '';
  const cf = countable(from), ct = countable(to);
  const cp = smooth(prog(s.t, toAt, toAt + 1.2));
  // Count from the old value when both hold one number in the same format, else from 0.
  const running = !ct ? to : cf && cf.head === ct.head && cf.tail === ct.tail
    ? counted({ ...ct, num: lerp(cf.num, ct.num, cp), decimals: Math.max(cf.decimals, ct.decimals) }, 1)
    : counted(ct, cp);
  const top = title ? 150 : 40;
  const mid = (top + 794) / 2;
  const yFrom = mid - 190 + (label ? 30 : 0), yArrow = yFrom + 80, yTo = yFrom + 290;
  const sFrom = Math.min(1, 900 / Math.max(1, ems(from) * 96 + ems(unit) * 53));
  const sTo = Math.min(1, 900 / Math.max(1, ems(to) * 150 + ems(unit) * 80));
  const ap = smooth(prog(s.t, arrowAt, arrowAt + 0.6));
  const tnum = { fontVariantNumeric: 'tabular-nums', lineHeight: 1 };
  return (
    <Win s={s} data={data}>
      {image ? <Img src={image} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.16, filter: 'grayscale(1) sepia(0.35)' }} /> : null}
      <Header s={s} title={title} subtitle={String(data?.subtitle ?? '')} />
      {label ? (
        <Rise s={s} t0={0.4} dy={10} x={540} y={yFrom - 110}>
          <div style={{ fontSize: fitSize(label, 44, 900) * k, fontWeight: 700, color: C.ink2 }}>{label}</div>
        </Rise>
      ) : null}
      <Rise s={s} t0={fromAt} x={540} y={yFrom}>
        <div style={{ display: 'flex', alignItems: 'baseline', color: C.ink2, fontWeight: 800, letterSpacing: -2 * k }}>
          <span style={{ ...tnum, fontSize: 96 * sFrom * k }}>{from}</span>
          {unit ? <span style={{ ...tnum, fontSize: 53 * sFrom * k, fontWeight: 700, marginLeft: 4 * k }}>{unit}</span> : null}
        </div>
      </Rise>
      {ap > 0 ? (
        <svg width={60 * k} height={110 * k} viewBox="0 0 60 110" style={{ position: 'absolute', left: 510 * k, top: yArrow * k }}>
          <line x1="30" y1="0" x2="30" y2={Math.max(0, 110 * ap - 30)} stroke={C.acc} strokeWidth="12" strokeLinecap="round" />
          {ap > 0.25 ? <polygon points={'30,' + 110 * ap + ' 8,' + (110 * ap - 34) + ' 52,' + (110 * ap - 34)} fill={C.acc} /> : null}
        </svg>
      ) : null}
      <Pop s={s} t0={toAt} x={540} y={yTo}>
        <div style={{ display: 'flex', alignItems: 'baseline', color: C.acc, fontWeight: 800, letterSpacing: -4 * sTo * k }}>
          <span style={{ position: 'relative' }}>
            {/* The final value sizes the line; the counting value is laid over it so nothing shifts. */}
            <span style={{ ...tnum, fontSize: 150 * sTo * k, visibility: 'hidden' }}>{to}</span>
            <span style={{ ...tnum, fontSize: 150 * sTo * k, position: 'absolute', right: 0, bottom: 0 }}>{running}</span>
          </span>
          {unit ? <span style={{ ...tnum, fontSize: 80 * sTo * k, fontWeight: 700, marginLeft: 6 * k }}>{unit}</span> : null}
        </div>
      </Pop>
      <Source s={s} text={String(data?.source ?? '')} />
    </Win>
  );
}
