import React from 'react';
import { useVideoConfig } from 'remotion';

const FALLBACK = "'Pretendard','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif";

// Fixed two-line headline above the media window, on screen for the whole video with no animation.
// Line 1: white text (an optional accent substring in the box colour). Line 2: black text on a box
// that hugs the text width. Both lines shrink to fit when they run long.
export default function Headline({ data }) {
  const { width } = useVideoConfig();
  const k = width / 1080;
  const family = typeof data?.fontFamily === 'string' ? data.fontFamily.trim() : '';
  const fontFamily = family === '' ? FALLBACK : '"' + family + '", ' + FALLBACK;
  const size = Number(data?.fontSize ?? 96);
  const boxColor = String(data?.boxColor ?? '#FFD700');
  const line1 = String(data?.line1 ?? '');
  const line2 = String(data?.line2 ?? '');
  const accent = String(data?.accent ?? '');
  // Hangul glyphs at this weight run close to 0.95em; digits and spaces are narrower.
  const em = (s) => [...s].reduce((n, c) => n + (c === ' ' ? 0.3 : /[\x21-\x7e]/.test(c) ? 0.58 : 0.95), 0);
  const fit = (s, max) => Math.min(size, max / Math.max(1, em(s)));
  const size1 = fit(line1, 1010);
  const size2 = fit(line2, 1030);
  const at = accent && line1.includes(accent) ? line1.indexOf(accent) : -1;
  const text1 = at < 0 ? line1 : (
    <>
      {line1.slice(0, at)}
      <span style={{ color: boxColor }}>{accent}</span>
      {line1.slice(at + accent.length)}
    </>
  );
  const type = { fontFamily, fontWeight: 900, letterSpacing: -2 * k, whiteSpace: 'nowrap' };
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {line1 ? (
        <div style={{ position: 'absolute', left: 0, right: 0, top: Number(data?.line1Top ?? 228) * k, height: 110 * k, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ ...type, fontSize: size1 * k, lineHeight: 1, color: String(data?.line1Color ?? '#FFFFFF') }}>{text1}</div>
        </div>
      ) : null}
      {line2 ? (
        <div style={{ position: 'absolute', left: 0, right: 0, top: Number(data?.line2Top ?? 343) * k, height: 114 * k, display: 'flex', justifyContent: 'center' }}>
          <div style={{ ...type, fontSize: size2 * k, lineHeight: 114 * k + 'px', height: 114 * k, padding: '0 ' + 18 * k + 'px', maxWidth: 1050 * k, background: boxColor, color: String(data?.line2Color ?? '#000000') }}>{line2}</div>
        </div>
      ) : null}
    </div>
  );
}
