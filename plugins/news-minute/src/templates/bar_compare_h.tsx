import React from 'react';
import { interpolate, Easing, useCurrentFrame, useVideoConfig, delayRender, continueRender, cancelRender } from 'remotion';

const FALLBACK = "'Pretendard','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif";

// Horizontal bar comparison on the white data window (2-3 bars). Each bar has a bold label, an
// optional grey `sub` (period), grows from the left with a count-up value, and starts after the
// previous one so the scene builds across `within`; the value fades in once the bar can hold it.
// A dashed marker holds the first bar's end.
// `bars: [{ label, sub?, value, tone: "grey" | "accent" }]`, values are numbers in `unit`.
const decimals = (v) => {
  const s = String(v);
  return s.includes('.') ? s.length - s.indexOf('.') - 1 : 0;
};
// Korean graphics write 5000 but 12,500: group thousands only from five digits up.
const fmt = (v, d) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: Math.abs(v) >= 10000 });

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

export default function BarCompareH({ data }) {
  const fontFace = useEmbeddedFont(data);
  const frame = useCurrentFrame();
  const { width, fps, durationInFrames } = useVideoConfig();
  const k = width / 1080;
  const family = typeof data?.fontFamily === 'string' ? data.fontFamily.trim() : '';
  const fontFamily = family === '' ? FALLBACK : '"' + family + '", ' + FALLBACK;
  const dur = Number(data?.durationSec) > 0 ? Math.round(Number(data.durationSec) * fps) : durationInFrames;
  const top = Number(data?.windowTop ?? 480);
  const height = Number(data?.windowHeight ?? 920);
  const accent = String(data?.accentColor ?? '#E8502F');
  const bars = (Array.isArray(data?.bars) ? data.bars : []).slice(0, 3);
  const unit = String(data?.unit ?? '');
  const title = String(data?.title ?? '');
  const source = String(data?.source ?? '');
  const max = Math.max(1e-9, ...bars.map((b) => Math.abs(Number(b?.value) || 0)));
  const step = bars.length > 1 ? Math.min(fps * 2, (dur * 0.45) / (bars.length - 1)) : 0;
  const grow = Math.round(fps * 1.1);
  const ease = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) };
  const trackL = 60, trackW = 960, barH = 148, rowH = 300;
  const y0 = (title ? 230 : 70) + (bars.length < 3 ? 0 : -40);
  const first = bars.length ? (Math.abs(Number(bars[0].value) || 0) / max) * 0.89 * trackW : 0;
  const markerIn = interpolate(frame, [grow, grow + 6], [0, 1], ease);
  return (
    <div style={{ position: 'absolute', left: 0, top: top * k, width: 1080 * k, height: height * k, background: '#FDFDFD', fontFamily, pointerEvents: 'none', overflow: 'hidden' }}>
      {fontFace}
      {title ? <div style={{ position: 'absolute', left: 65 * k, top: 60 * k, right: 65 * k, fontWeight: 800, fontSize: 46 * k, color: '#222222', letterSpacing: -1 * k }}>{title}</div> : null}
      {bars.map((b, i) => {
        const v = Number(b?.value) || 0;
        const start = Math.round(i * step);
        const t = interpolate(frame, [start, start + grow], [0, 1], ease);
        const appear = interpolate(frame, [start, start + Math.round(fps * 0.25)], [0, 1], ease);
        const hot = b?.tone === 'accent';
        const w = (Math.abs(v) / max) * 0.89 * trackW * t;
        const d = decimals(v);
        const y = y0 + i * rowH;
        return (
          <div key={i} style={{ opacity: appear }}>
            <div style={{ position: 'absolute', left: trackL * k, top: (y + (1 - appear) * 12) * k, display: 'flex', alignItems: 'baseline', gap: 22 * k, whiteSpace: 'nowrap' }}>
              <div style={{ fontWeight: 900, fontSize: 56 * k, color: hot ? '#B83A22' : '#222222', letterSpacing: -1 * k }}>{String(b?.label ?? '')}</div>
              {b?.sub ? <div style={{ fontWeight: 500, fontSize: 32 * k, color: '#8A8A8A' }}>{String(b.sub)}</div> : null}
            </div>
            <div style={{ position: 'absolute', left: trackL * k, top: (y + 100) * k, width: trackW * k, height: barH * k, borderRadius: 16 * k, background: '#F2F2F0' }} />
            <div style={{ position: 'absolute', left: trackL * k, top: (y + 100) * k, width: w * k, height: barH * k, borderRadius: 16 * k, background: hot ? accent : '#AAB0AC', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' }}>
              <div style={{ color: '#FFFFFF', fontWeight: 900, fontSize: 84 * k, letterSpacing: -1 * k, paddingRight: 26 * k, whiteSpace: 'nowrap', opacity: interpolate(w, [200, 300], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
                {fmt(v * t, d)}<span style={{ fontSize: 44 * k, marginLeft: 4 * k }}>{unit}</span>
              </div>
            </div>
          </div>
        );
      })}
      {bars.length > 1 ? (
        <div style={{ position: 'absolute', left: (trackL + first) * k, top: (y0 + 60) * k, height: (rowH * (bars.length - 1) + barH + 80) * k, borderLeft: 3 * k + 'px dashed #555555', opacity: markerIn }} />
      ) : null}
      {source ? <div style={{ position: 'absolute', right: 65 * k, top: 760 * k, fontWeight: 500, fontSize: 26 * k, color: '#8A8A8A' }}>{source}</div> : null}
    </div>
  );
}
