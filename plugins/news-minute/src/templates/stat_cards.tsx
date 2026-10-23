import React from 'react';
import { interpolate, Easing, useCurrentFrame, useVideoConfig } from 'remotion';

const FALLBACK = "'Pretendard','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif";

// 2-4 equal cards on the white data window, each with a coloured header and 1-2 rows of numbers.
// The first row's value is large and in the accent colour, the rest are smaller and dark. Cards rise
// in staggered and their numbers count up. `cards: [{ header, rows: [{ label, value, unit? }] }]`;
// a string value is shown as written (no count-up).
const decimals = (v) => {
  const s = String(v);
  return s.includes('.') ? s.length - s.indexOf('.') - 1 : 0;
};
// Korean graphics write 5000 but 12,500: group thousands only from five digits up.
const fmt = (v, d) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: Math.abs(v) >= 10000 });

export default function StatCards({ data }) {
  const frame = useCurrentFrame();
  const { width, fps, durationInFrames } = useVideoConfig();
  const k = width / 1080;
  const family = typeof data?.fontFamily === 'string' ? data.fontFamily.trim() : '';
  const fontFamily = family === '' ? FALLBACK : '"' + family + '", ' + FALLBACK;
  const dur = Number(data?.durationSec) > 0 ? Math.round(Number(data.durationSec) * fps) : durationInFrames;
  const top = Number(data?.windowTop ?? 480);
  const height = Number(data?.windowHeight ?? 920);
  const accent = String(data?.accentColor ?? '#E8502F');
  const headerColor = String(data?.headerColor ?? '#D9705A');
  const cards = (Array.isArray(data?.cards) ? data.cards : []).slice(0, 4);
  const n = Math.max(1, cards.length);
  const title = String(data?.title ?? '');
  const subtitle = String(data?.subtitle ?? '');
  const source = String(data?.source ?? '');
  const ease = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) };
  const step = Math.min(Math.round(fps * 0.6), Math.round((dur * 0.4) / n));
  const gap = 24, left = 60, cardW = (960 - gap * (n - 1)) / n;
  const big = n >= 4 ? 56 : n === 3 ? 70 : 84;
  return (
    <div style={{ position: 'absolute', left: 0, top: top * k, width: 1080 * k, height: height * k, background: '#FDFDFD', fontFamily, pointerEvents: 'none', overflow: 'hidden' }}>
      {title ? <div style={{ position: 'absolute', left: 65 * k, top: 60 * k, right: 65 * k, fontWeight: 800, fontSize: 46 * k, color: '#222222', letterSpacing: -1 * k }}>{title}</div> : null}
      {subtitle ? <div style={{ position: 'absolute', left: 65 * k, top: 124 * k, right: 65 * k, fontWeight: 500, fontSize: 30 * k, color: '#8A8A8A' }}>{subtitle}</div> : null}
      {cards.map((c, i) => {
        const start = i * step;
        const p = interpolate(frame, [start, start + Math.round(fps * 0.3)], [0, 1], ease);
        const count = interpolate(frame, [start, start + Math.round(fps * 1.1)], [0, 1], ease);
        const rows = Array.isArray(c?.rows) ? c.rows.slice(0, 2) : [];
        return (
          <div key={i} style={{ position: 'absolute', left: (left + i * (cardW + gap)) * k, top: (240 + (1 - p) * 30) * k, width: cardW * k, height: 470 * k, opacity: p, borderRadius: 18 * k, background: '#F4F3F0', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '100%', height: 96 * k, background: headerColor, color: '#FFFFFF', fontWeight: 800, fontSize: (n >= 4 ? 34 : 40) * k, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap' }}>{String(c?.header ?? '')}</div>
            {rows.map((r, j) => {
              const raw = r?.value;
              const num = typeof raw === 'number';
              const shown = num ? fmt(raw * count, decimals(raw)) : String(raw ?? '');
              return (
                <div key={j} style={{ marginTop: (j === 0 ? 40 : 34) * k, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontWeight: 500, fontSize: 30 * k, color: '#7A7A7A', whiteSpace: 'nowrap' }}>{String(r?.label ?? '')}</div>
                  <div style={{ fontWeight: 900, fontSize: (j === 0 ? big : big * 0.62) * k, color: j === 0 ? accent : '#222222', letterSpacing: -1 * k, whiteSpace: 'nowrap', marginTop: 6 * k }}>
                    {shown}<span style={{ fontSize: (j === 0 ? big : big * 0.62) * 0.5 * k, marginLeft: 3 * k }}>{String(r?.unit ?? '')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
      {source ? <div style={{ position: 'absolute', right: 65 * k, top: 760 * k, fontWeight: 500, fontSize: 26 * k, color: '#8A8A8A' }}>{source}</div> : null}
    </div>
  );
}
