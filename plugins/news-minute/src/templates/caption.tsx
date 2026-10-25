import React from 'react';
import { useVideoConfig, delayRender, continueRender, cancelRender } from 'remotion';

const FALLBACK = "'Pretendard','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif";

// Hold rendering until the face the panel embedded in `fontCss` has loaded, so no frame is drawn
// in a fallback font. Without `fontCss` the graphic uses the installed fonts in FALLBACK.
function useEmbeddedFont(data) {
  const css = typeof data?.fontCss === 'string' ? data.fontCss : '';
  const [hold] = React.useState(() => (css ? delayRender('News minute font') : null));
  React.useEffect(() => {
    if (hold === null) return;
    const loads = Array.isArray(data?.fontLoads) ? data.fontLoads : [];
    Promise.all(loads.map((f) => document.fonts.load(String(f)))).then(() => document.fonts.ready).then(() => continueRender(hold)).catch(cancelRender);
  }, [hold]);
  return css ? <style>{css}</style> : null;
}

// One caption chunk (2-4 words of the approved script), one line, centred under the graphics on a box that
// hugs the text with padX each side (translucent black unless the preset gives a colour). The line shrinks to
// fit maxWidth.
// Chunks switch with a hard cut, so no animation.
export default function Caption({ data }) {
  const fontFace = useEmbeddedFont(data);
  const { width } = useVideoConfig();
  const k = width / 1080;
  const family = typeof data?.fontFamily === 'string' ? data.fontFamily.trim() : '';
  const fontFamily = family === '' ? FALLBACK : '"' + family + '", ' + FALLBACK;
  const text = String(data?.text ?? '');
  const em = [...text].reduce((n, c) => n + (c === ' ' ? 0.3 : /[\x21-\x7e]/.test(c) ? 0.56 : 1), 0);
  const size = Math.min(Number(data?.fontSize ?? 54), Number(data?.maxWidth ?? 980) / Math.max(1, em));
  const bottom = Number(data?.bottom ?? 1385);
  const boxHeight = Number(data?.boxHeight ?? 70);
  const padX = Number(data?.padX ?? 12);
  if (!text) return null;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: (bottom - boxHeight) * k, height: boxHeight * k, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      {fontFace}
      <div style={{ fontFamily, fontWeight: Number(data?.fontWeight ?? 600), fontSize: size * k, lineHeight: boxHeight * k + 'px', height: boxHeight * k, padding: '0 ' + padX * k + 'px', background: String(data?.boxColor ?? 'rgba(0,0,0,0.44)'), color: String(data?.textColor ?? '#FFFFFF'), letterSpacing: -1 * k, whiteSpace: 'nowrap' }}>{text}</div>
    </div>
  );
}
