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
  // Last entrance: the rise/fall triangle, 1.0 + 0.6 s after the new value starts.
  const s = useScene(data, toAt + 1.6);
  const k = s.k;
  const title = String(data?.title ?? '');
  const label = String(data?.label ?? '');
  const unit = String(data?.unit ?? '');
  const from = show(data?.from), to = show(data?.to);
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
  // Rose or fell: only when both values hold one number in the same format.
  const dir = cf && ct && cf.head === ct.head && cf.tail === ct.tail && cf.num !== ct.num ? (ct.num > cf.num ? 'up' : 'down') : '';
  const tri = prog(s.t, toAt + 1.0, toAt + 1.6);
  const tnum = { fontVariantNumeric: 'tabular-nums', lineHeight: 1 };
  return (
    <Win s={s} data={data}>
      <Header s={s} title={title} subtitle={String(data?.subtitle ?? '')} />
      {label ? (
        <Rise s={s} t0={0.4} dy={10} x={540} y={yFrom - 110}>
          <div style={{ fontSize: fitSize(plainText(label), 44, 900) * k, fontWeight: 700, color: C.ink2 }}><Marked s={s} text={label} hlAt={0.95} /></div>
        </Rise>
      ) : null}
      <Rise s={s} t0={fromAt} x={540} y={yFrom}>
        <div style={{ display: 'flex', alignItems: 'baseline', color: C.ink2, fontWeight: 800, letterSpacing: -2 * k }}>
          <span style={{ ...tnum, fontSize: 96 * sFrom * k }}>{from}</span>
          {unit ? <span style={{ ...tnum, fontSize: 53 * sFrom * k, fontWeight: 700, marginLeft: 4 * k }}>{unit}</span> : null}
        </div>
      </Rise>
      {ap > 0 ? (
        // Gold chevron, opening from its centre outwards.
        <svg width={80 * k} height={60 * k} viewBox="0 0 80 60" style={{ position: 'absolute', left: 500 * k, top: (yArrow + 25) * k }}>
          <polyline points={(40 - 28 * ap) + ',' + (14 + 22 * (1 - ap)) + ' 40,36 ' + (40 + 28 * ap) + ',' + (14 + 22 * (1 - ap))} fill="none" stroke={C.gold} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
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
          {dir ? (
            <svg width={44 * sTo * k} height={40 * sTo * k} viewBox="0 0 44 40" style={{ marginLeft: 18 * sTo * k, alignSelf: 'center', opacity: smooth(tri / 0.6), transform: 'translateY(' + (1 - smooth(tri)) * (dir === 'up' ? 8 : -8) * k + 'px)' }}>
              <polygon points={dir === 'up' ? '22,2 42,38 2,38' : '2,2 42,2 22,38'} fill={C.acc} />
            </svg>
          ) : null}
        </div>
      </Pop>
      <Source s={s} text={String(data?.source ?? '')} />
    </Win>
  );
}
