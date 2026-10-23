import React from 'react';
import { useVideoConfig } from 'remotion';

const FALLBACK = "'Pretendard','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif";

// One caption chunk (2-4 words of the approved script), one line, centred at the bottom of the media
// window on a translucent black box that hugs the text. Chunks switch with a hard cut, so no animation.
export default function Caption({ data }) {
  const { width } = useVideoConfig();
  const k = width / 1080;
  const family = typeof data?.fontFamily === 'string' ? data.fontFamily.trim() : '';
  const fontFamily = family === '' ? FALLBACK : '"' + family + '", ' + FALLBACK;
  const text = String(data?.text ?? '');
  const em = [...text].reduce((n, c) => n + (c === ' ' ? 0.3 : /[\x21-\x7e]/.test(c) ? 0.56 : 1), 0);
  const size = Math.min(Number(data?.fontSize ?? 54), 980 / Math.max(1, em));
  const bottom = Number(data?.bottom ?? 1385);
  const boxHeight = Number(data?.boxHeight ?? 70);
  if (!text) return null;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: (bottom - boxHeight) * k, height: boxHeight * k, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <div style={{ fontFamily, fontWeight: 600, fontSize: size * k, lineHeight: boxHeight * k + 'px', height: boxHeight * k, padding: '0 ' + 12 * k + 'px', background: String(data?.boxColor ?? 'rgba(0,0,0,0.44)'), color: String(data?.textColor ?? '#FFFFFF'), letterSpacing: -1 * k, whiteSpace: 'nowrap' }}>{text}</div>
    </div>
  );
}
