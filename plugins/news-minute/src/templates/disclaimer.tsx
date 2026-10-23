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

// Per-scene notice under the logo block, placed only over scenes that show illustrative imagery.
// The sentence itself comes from the preset.
export default function Disclaimer({ data }) {
  const fontFace = useEmbeddedFont(data);
  const { width } = useVideoConfig();
  const k = width / 1080;
  const family = typeof data?.fontFamily === 'string' ? data.fontFamily.trim() : '';
  const fontFamily = family === '' ? FALLBACK : '"' + family + '", ' + FALLBACK;
  const text = String(data?.text ?? '');
  if (!text) return null;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: Number(data?.top ?? 1672) * k, height: 50 * k, display: 'flex', justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }}>
      {fontFace}
      <div style={{ fontFamily, fontWeight: 300, fontSize: Number(data?.fontSize ?? 35) * k, color: String(data?.color ?? '#FFFFFF'), whiteSpace: 'nowrap' }}>{text}</div>
    </div>
  );
}
