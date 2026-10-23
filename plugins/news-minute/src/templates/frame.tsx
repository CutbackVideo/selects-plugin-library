import React from 'react';
import { Img, useVideoConfig, delayRender, continueRender, cancelRender } from 'remotion';

const FALLBACK = "'Pretendard','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif";
const SERIF = "'Noto Serif KR','AppleMyungjo','Batang','Times New Roman',serif";

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

// Persistent frame: brand background above and below the 1080x920 media window (y 480-1400), plus the
// logo block under the window. The window itself stays transparent so the scene clips show through
// whatever the track order is. Brand text comes in as parameters (the preset supplies it).
export default function Frame({ data }) {
  const fontFace = useEmbeddedFont(data);
  const { width } = useVideoConfig();
  const k = width / 1080;
  const family = typeof data?.fontFamily === 'string' ? data.fontFamily.trim() : '';
  const fontFamily = family === '' ? FALLBACK : '"' + family + '", ' + FALLBACK;
  const bg = String(data?.background ?? '#21302A');
  const top = Number(data?.windowTop ?? 480);
  const bottom = Number(data?.windowBottom ?? 1400);
  const gold = String(data?.accentColor ?? '#D8B66A');
  const logo = typeof data?.logo === 'string' ? data.logo : '';
  const logoMain = String(data?.logoMain ?? '');
  const logoAccent = String(data?.logoAccent ?? '');
  const tagline = String(data?.tagline ?? '');
  // `backgroundImage` (data URL of a clean full 1080x1920 frame, e.g. with the damask pattern) replaces the flat colour.
  const art = typeof data?.backgroundImage === 'string' ? data.backgroundImage : '';
  const band = { position: 'absolute', left: 0, width: '100%', background: art ? bg + ' url(' + art + ') no-repeat' : bg, backgroundSize: art ? width + 'px auto' : undefined };
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {fontFace}
      <div style={{ ...band, top: 0, height: top * k }} />
      <div style={{ ...band, top: bottom * k, bottom: 0, backgroundPosition: art ? '0 ' + -bottom * k + 'px' : undefined }} />
      {logo ? (
        <div style={{ position: 'absolute', left: 0, right: 0, top: (bottom + 20) * k, height: 240 * k, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Img src={logo} style={{ maxHeight: 240 * k, maxWidth: 900 * k, objectFit: 'contain' }} />
        </div>
      ) : (
        <div style={{ position: 'absolute', left: 0, right: 0, top: (bottom + 12) * k, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 22 * k, height: 150 * k }}>
            {logoMain ? <div style={{ fontFamily, fontWeight: 900, fontStyle: 'italic', fontSize: 100 * k, color: '#FFFFFF', letterSpacing: -2 * k, textShadow: '0 ' + 4 * k + 'px ' + 10 * k + 'px rgba(0,0,0,0.45)' }}>{logoMain}</div> : null}
            {logoAccent ? <div style={{ fontFamily: SERIF, fontWeight: 900, fontStyle: 'italic', fontSize: 134 * k, color: gold, letterSpacing: -3 * k, textShadow: '0 ' + 4 * k + 'px ' + 10 * k + 'px rgba(0,0,0,0.45)' }}>{logoAccent}</div> : null}
          </div>
          {logoMain || logoAccent ? <div style={{ width: 486 * k, height: 3 * k, marginTop: 8 * k, background: gold }} /> : null}
          {tagline ? <div style={{ fontFamily, fontWeight: 300, fontSize: 52 * k, color: '#FFFFFF', marginTop: 16 * k, letterSpacing: -1 * k }}>{tagline}</div> : null}
        </div>
      )}
    </div>
  );
}
