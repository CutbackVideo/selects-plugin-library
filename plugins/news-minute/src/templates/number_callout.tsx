import React from 'react';
import { Img, interpolate, Easing, useCurrentFrame, useVideoConfig } from 'remotion';

const FALLBACK = "'Pretendard','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif";

// Before -> after value over a dimmed photo: small white label, large white old value and a down
// arrow, then the new value as black text on a yellow box (the headline line-2 look). Label and old
// value fade in first; arrow and new value follow `revealSec` later. `from`/`to` are numbers (shown
// with their own decimals plus `unit`) or already-formatted strings. The caption is hidden here.
const show = (v, unit) => {
  if (typeof v === 'number') {
    const s = String(v);
    const d = s.includes('.') ? s.length - s.indexOf('.') - 1 : 0;
    return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: Math.abs(v) >= 10000 }) + unit;
  }
  return String(v ?? '') + unit;
};

export default function NumberCallout({ data }) {
  const frame = useCurrentFrame();
  const { width, fps } = useVideoConfig();
  const k = width / 1080;
  const family = typeof data?.fontFamily === 'string' ? data.fontFamily.trim() : '';
  const fontFamily = family === '' ? FALLBACK : '"' + family + '", ' + FALLBACK;
  const top = Number(data?.windowTop ?? 480);
  const height = Number(data?.windowHeight ?? 920);
  const image = typeof data?.image === 'string' ? data.image : '';
  const unit = String(data?.unit ?? '');
  const from = show(data?.from, unit);
  const to = show(data?.to, unit);
  const label = String(data?.label ?? '');
  const ease = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) };
  const late = Math.round(fps * Number(data?.revealSec ?? 0.75));
  const a = interpolate(frame, [0, Math.round(fps * 0.25)], [0, 1], ease);
  const b = interpolate(frame, [late, late + Math.round(fps * 0.25)], [0, 1], ease);
  const fit = (s, size, max) => Math.min(size, max / Math.max(1, [...s].reduce((n, c) => n + (c === ' ' ? 0.3 : /[\x21-\x7e]/.test(c) ? 0.58 : 0.95), 0)));
  const zoom = 1 + 0.04 * interpolate(frame, [0, fps * 8], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: 0, top: top * k, width: 1080 * k, height: height * k, overflow: 'hidden', background: '#000000', pointerEvents: 'none' }}>
      {image ? <Img src={image} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(' + zoom + ')' }} /> : null}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,' + Number(data?.dim ?? 0.45) + ')' }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily, color: '#FFFFFF', textShadow: '0 ' + 3 * k + 'px ' + 10 * k + 'px rgba(0,0,0,0.5)' }}>
        <div style={{ opacity: a, transform: 'translateY(' + (1 - a) * 16 * k + 'px)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {label ? <div style={{ fontWeight: 700, fontSize: fit(label, 72, 900) * k, letterSpacing: -2 * k, whiteSpace: 'nowrap' }}>{label}</div> : null}
          <div style={{ fontWeight: 800, fontSize: fit(from, 120, 1000) * k, letterSpacing: -3 * k, whiteSpace: 'nowrap', lineHeight: 1.15 }}>{from}</div>
        </div>
        <div style={{ opacity: b, display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 16 * k }}>
          <svg width={70 * k} height={130 * k} viewBox="0 0 70 130" style={{ transform: 'translateY(' + (1 - b) * -20 * k + 'px)' }}>
            <rect x="29" y="0" width="12" height="88" fill="#FFFFFF" />
            <polygon points="0,80 70,80 35,130" fill="#FFFFFF" />
          </svg>
          <div style={{ marginTop: 34 * k, background: String(data?.boxColor ?? '#FFD700'), color: '#000000', textShadow: 'none', fontWeight: 900, fontSize: fit(to, 120, 980) * k, letterSpacing: -3 * k, lineHeight: 1.12, padding: '0 ' + 18 * k + 'px', whiteSpace: 'nowrap', transform: 'scale(' + (0.9 + 0.1 * b) + ')' }}>{to}</div>
        </div>
      </div>
    </div>
  );
}
