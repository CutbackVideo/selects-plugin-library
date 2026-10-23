import React from 'react';
import { Img, interpolate, Easing, useCurrentFrame, useVideoConfig, delayRender, continueRender, cancelRender } from 'remotion';

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

// Expert or official quote on the white data window: round headshot (optional data URL), name,
// affiliation and a divider pop in first, then the quote lines are revealed one by one across the
// scene. Lines listed in `accentLines` (indexes) are red with a yellow highlighter sweep.
export default function QuoteCard({ data }) {
  const fontFace = useEmbeddedFont(data);
  const frame = useCurrentFrame();
  const { width, fps, durationInFrames } = useVideoConfig();
  const k = width / 1080;
  const family = typeof data?.fontFamily === 'string' ? data.fontFamily.trim() : '';
  const fontFamily = family === '' ? FALLBACK : '"' + family + '", ' + FALLBACK;
  const dur = Number(data?.durationSec) > 0 ? Math.round(Number(data.durationSec) * fps) : durationInFrames;
  const top = Number(data?.windowTop ?? 480);
  const height = Number(data?.windowHeight ?? 920);
  const headshot = typeof data?.headshot === 'string' ? data.headshot : '';
  const lines = (Array.isArray(data?.lines) ? data.lines : []).map((l) => String(l)).slice(0, 5);
  const accentLines = new Set((Array.isArray(data?.accentLines) ? data.accentLines : []).map(Number));
  const accent = String(data?.accentColor ?? '#E8502F');
  const mark = String(data?.highlightColor ?? 'rgba(255,200,40,0.75)');
  const ease = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) };
  const head = interpolate(frame, [0, Math.round(fps * 0.3)], [0, 1], ease);
  const first = Math.round(fps * 0.4);
  const step = lines.length > 1 ? Math.max(Math.round(fps * 0.3), Math.round((dur * 0.7 - first) / lines.length)) : 0;
  const longest = Math.max(1, ...lines.map((l) => l.length));
  const size = Math.min(64, 950 / Math.max(10, longest));
  const x = headshot ? 230 : 65;
  return (
    <div style={{ position: 'absolute', left: 0, top: top * k, width: 1080 * k, height: height * k, background: '#FDFDFD', fontFamily, pointerEvents: 'none', overflow: 'hidden' }}>
      {fontFace}
      <div style={{ opacity: head, transform: 'scale(' + (0.94 + 0.06 * head) + ')', transformOrigin: '65px 120px' }}>
        {headshot ? (
          <div style={{ position: 'absolute', left: 60 * k, top: 50 * k, width: 150 * k, height: 150 * k, borderRadius: '50%', overflow: 'hidden', background: '#DDDDDD' }}>
            <Img src={headshot} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 25%' }} />
          </div>
        ) : null}
        <div style={{ position: 'absolute', left: x * k, top: 70 * k, fontWeight: 900, fontSize: 68 * k, color: '#222222', letterSpacing: -1 * k, whiteSpace: 'nowrap' }}>{String(data?.name ?? '')}</div>
        <div style={{ position: 'absolute', left: x * k, top: 156 * k, fontWeight: 500, fontSize: 34 * k, color: '#7A7A7A', whiteSpace: 'nowrap' }}>{String(data?.affiliation ?? '')}</div>
        <div style={{ position: 'absolute', left: 60 * k, right: 60 * k, top: 240 * k, height: 2 * k, background: '#E2E2E2' }} />
      </div>
      <div style={{ position: 'absolute', left: 65 * k, right: 65 * k, top: 290 * k }}>
        {lines.map((l, i) => {
          const start = first + i * step;
          const o = interpolate(frame, [start, start + Math.round(fps * 0.25)], [0, 1], ease);
          const sweep = interpolate(frame, [start + Math.round(fps * 0.2), start + Math.round(fps * 0.8)], [0, 100], ease);
          const hot = accentLines.has(i);
          return (
            <div key={i} style={{ opacity: o, transform: 'translateY(' + (1 - o) * 14 * k + 'px)', fontWeight: 800, fontSize: size * k, lineHeight: 1.45, color: hot ? accent : '#222222', letterSpacing: -1 * k, whiteSpace: 'nowrap' }}>
              <span style={hot ? { backgroundImage: 'linear-gradient(transparent 50%, ' + mark + ' 50%, ' + mark + ' 95%, transparent 95%)', backgroundRepeat: 'no-repeat', backgroundSize: sweep + '% 100%', padding: '0 ' + 4 * k + 'px' } : undefined}>{l}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
