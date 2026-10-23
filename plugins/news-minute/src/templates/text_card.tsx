import React from 'react';
import { interpolate, Easing, useCurrentFrame, useVideoConfig } from 'remotion';

const FALLBACK = "'Pretendard','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif";

// Fallback scene when no photo or number fits: the sentence's key phrase on a white media window
// (the data-card look), with a yellow highlighter sweeping under it and an optional grey sub line.
// Use '\n' in `text` for a manual line break.
export default function TextCard({ data }) {
  const frame = useCurrentFrame();
  const { width, fps } = useVideoConfig();
  const k = width / 1080;
  const family = typeof data?.fontFamily === 'string' ? data.fontFamily.trim() : '';
  const fontFamily = family === '' ? FALLBACK : '"' + family + '", ' + FALLBACK;
  const top = Number(data?.windowTop ?? 480);
  const height = Number(data?.windowHeight ?? 920);
  const text = String(data?.text ?? '');
  const sub = String(data?.sub ?? '');
  const source = String(data?.source ?? '');
  const longest = Math.max(1, ...text.split('\n').map((l) => l.length));
  const size = Math.min(Number(data?.fontSize ?? 84), 900 / Math.max(6, Math.min(longest, 12)));
  const ease = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) };
  const rise = interpolate(frame, [0, Math.round(fps * 0.25)], [0, 1], ease);
  const sweep = interpolate(frame, [Math.round(fps * 0.3), Math.round(fps * 0.9)], [0, 100], ease);
  const subIn = interpolate(frame, [Math.round(fps * 0.5), Math.round(fps * 0.75)], [0, 1], ease);
  const mark = String(data?.highlightColor ?? 'rgba(255,215,0,0.8)');
  return (
    <div style={{ position: 'absolute', left: 0, top: top * k, width: 1080 * k, height: height * k, background: String(data?.background ?? '#FDFDFD'), pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: 80 * k, right: 80 * k, top: 0, bottom: 120 * k, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ fontFamily, fontWeight: 900, fontSize: size * k, lineHeight: 1.3, letterSpacing: -2 * k, color: String(data?.textColor ?? '#222222'), whiteSpace: 'pre-line', opacity: rise, transform: 'translateY(' + (1 - rise) * 24 * k + 'px)' }}>
          <span style={{ backgroundImage: 'linear-gradient(transparent 60%, ' + mark + ' 60%, ' + mark + ' 92%, transparent 92%)', backgroundRepeat: 'no-repeat', backgroundSize: sweep + '% 100%', boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone', padding: '0 ' + 6 * k + 'px' }}>{text}</span>
        </div>
        {sub ? <div style={{ fontFamily, fontWeight: 500, fontSize: 40 * k, lineHeight: 1.35, color: '#6B6B6B', marginTop: 36 * k, opacity: subIn, whiteSpace: 'pre-line' }}>{sub}</div> : null}
      </div>
      {source ? <div style={{ position: 'absolute', right: 65 * k, top: 760 * k, fontFamily, fontWeight: 500, fontSize: 26 * k, color: '#8A8A8A' }}>{source}</div> : null}
    </div>
  );
}
