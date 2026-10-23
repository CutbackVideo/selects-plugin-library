import React from 'react';
import { interpolate, Easing, useCurrentFrame, useVideoConfig } from 'remotion';

const FALLBACK = "'Pretendard','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif";

// Time-series line on the white data window: grey history, accent segment from point `accentFrom`,
// light fill under the line, and a large accent callout above the last point that counts up once the
// line arrives. Optional dashed `threshold` and 1-2 delta `cards` below the chart (`text` may hold
// "small header\nbold value"). `points: [{ x, y }]` with `x` as the axis label, `y` a number.
const decimals = (v) => {
  const s = String(v);
  return s.includes('.') ? s.length - s.indexOf('.') - 1 : 0;
};
// Korean graphics write 5000 but 12,500: group thousands only from five digits up.
const fmt = (v, d) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: Math.abs(v) >= 10000 });

export default function LineTrendCallout({ data }) {
  const frame = useCurrentFrame();
  // Unique per placement so two trend lines in one document never share a clip path.
  const clipId = 'ltc-' + String(React.useId ? React.useId() : 'reveal').replace(/[^A-Za-z0-9_-]/g, '');
  const { width, fps, durationInFrames } = useVideoConfig();
  const k = width / 1080;
  const family = typeof data?.fontFamily === 'string' ? data.fontFamily.trim() : '';
  const fontFamily = family === '' ? FALLBACK : '"' + family + '", ' + FALLBACK;
  const dur = Number(data?.durationSec) > 0 ? Math.round(Number(data.durationSec) * fps) : durationInFrames;
  const top = Number(data?.windowTop ?? 480);
  const height = Number(data?.windowHeight ?? 920);
  const accent = String(data?.accentColor ?? '#E8502F');
  const pts = (Array.isArray(data?.points) ? data.points : []).filter((p) => Number.isFinite(Number(p?.y)));
  const n = pts.length;
  const accentFrom = Math.max(0, Math.min(n - 1, Number(data?.accentFrom ?? n - 2)));
  const unit = String(data?.unit ?? '');
  const threshold = data?.threshold && Number.isFinite(Number(data.threshold.y)) ? data.threshold : null;
  const cards = (Array.isArray(data?.cards) ? data.cards : []).slice(0, 2);
  const ys = pts.map((p) => Number(p.y)).concat(threshold ? [Number(threshold.y)] : []);
  const lo = Math.min(...ys), hi = Math.max(...ys);
  const pad = (hi - lo || Math.abs(hi) || 1) * 0.12;
  const cx0 = 90, cx1 = 990, cy0 = 300, cy1 = cards.length ? 560 : 640;
  const X = (i) => cx0 + (n > 1 ? (i / (n - 1)) * (cx1 - cx0) : (cx1 - cx0) / 2);
  const Y = (v) => cy1 - ((v - (lo - pad)) / (hi + pad - (lo - pad))) * (cy1 - cy0);
  const ease = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) };
  const drawEnd = Math.max(Math.round(fps * 1.5), Math.min(Math.round(fps * 3), Math.round(dur * 0.4)));
  const draw = interpolate(frame, [Math.round(fps * 0.3), drawEnd], [0, 1], ease);
  const count = interpolate(frame, [drawEnd, drawEnd + Math.round(fps * 1.1)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const headIn = interpolate(frame, [0, Math.round(fps * 0.25)], [0, 1], { extrapolateRight: 'clamp' });
  const path = (a, b) => pts.slice(a, b + 1).map((p, j) => (j ? 'L' : 'M') + X(a + j).toFixed(1) + ' ' + Y(Number(p.y)).toFixed(1)).join(' ');
  const greyLen = n > 1 ? accentFrom / (n - 1) : 1;
  const greyDraw = greyLen > 0 ? Math.min(1, draw / greyLen) : 1;
  const hotDraw = greyLen < 1 ? Math.max(0, (draw - greyLen) / (1 - greyLen)) : 0;
  const last = n ? Number(pts[n - 1].y) : 0;
  const rawEnd = data?.endLabel;
  const endNum = typeof rawEnd === 'number' ? rawEnd : rawEnd == null || rawEnd === '' ? last : null;
  const endText = endNum != null ? fmt(endNum * count, decimals(endNum)) : String(rawEnd);
  const fill = n > 1 ? path(0, n - 1) + ' L' + X(n - 1) + ' ' + cy1 + ' L' + X(0) + ' ' + cy1 + ' Z' : '';
  const labelEvery = Math.max(1, Math.ceil(n / 5));
  return (
    <div style={{ position: 'absolute', left: 0, top: top * k, width: 1080 * k, height: height * k, background: '#FDFDFD', fontFamily, pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{ opacity: headIn }}>
        <div style={{ position: 'absolute', left: 65 * k, top: 60 * k, right: 65 * k, fontWeight: 800, fontSize: 46 * k, color: '#222222', letterSpacing: -1 * k }}>{String(data?.title ?? '')}</div>
        {data?.subtitle ? <div style={{ position: 'absolute', left: 65 * k, top: 124 * k, fontWeight: 500, fontSize: 28 * k, color: '#8A8A8A' }}>{String(data.subtitle)}</div> : null}
      </div>
      <svg width={1080 * k} height={height * k} viewBox={'0 0 1080 ' + height} style={{ position: 'absolute', left: 0, top: 0 }}>
        <line x1={cx0} x2={cx1} y1={cy1} y2={cy1} stroke="#E4E4E2" strokeWidth="2" />
        <clipPath id={clipId}><rect x={cx0 - 10} y="0" width={(cx1 - cx0 + 20) * draw} height={height} /></clipPath>
        {fill ? <path d={fill} fill="#F0F0EE" clipPath={'url(#' + clipId + ')'} /> : null}
        {threshold ? (
          <g opacity={headIn}>
            <line x1={cx0} x2={cx1} y1={Y(Number(threshold.y))} y2={Y(Number(threshold.y))} stroke={accent} strokeWidth="3" strokeDasharray="10 8" />
            <text x={cx0} y={Y(Number(threshold.y)) - 12} fill={accent} fontSize="26" fontWeight="700" fontFamily={fontFamily}>{String(threshold.label ?? '')}</text>
          </g>
        ) : null}
        {accentFrom > 0 ? <path d={path(0, accentFrom)} fill="none" stroke="#555555" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - greyDraw} /> : null}
        {n > 1 && accentFrom < n - 1 ? <path d={path(accentFrom, n - 1)} fill="none" stroke={accent} strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - hotDraw} /> : null}
        {n ? <circle cx={X(0)} cy={Y(Number(pts[0].y))} r="9" fill="#FFFFFF" stroke="#555555" strokeWidth="4" /> : null}
        {n > 1 && draw >= 1 ? <circle cx={X(n - 1)} cy={Y(last)} r="11" fill="#FFFFFF" stroke={accent} strokeWidth="5" /> : null}
        {pts.map((p, i) => (i % labelEvery === 0 || i === n - 1 ? (
          <text key={i} x={X(i)} y={cy1 + 44} textAnchor="middle" fill="#7A7A7A" fontSize="28" fontWeight="500" fontFamily={fontFamily}>{String(p.x ?? '')}</text>
        ) : null))}
      </svg>
      {n ? (
        <div style={{ position: 'absolute', right: (1080 - Math.min(cx1 + 30, X(n - 1) + 30)) * k, top: (Y(last) - 110) * k, opacity: count > 0 ? 1 : 0, color: accent, fontWeight: 900, fontSize: 76 * k, letterSpacing: -2 * k, whiteSpace: 'nowrap' }}>
          {endText}<span style={{ fontSize: 40 * k, marginLeft: 4 * k }}>{unit}</span>
        </div>
      ) : null}
      {cards.map((c, i) => {
        const start = drawEnd + Math.round(fps * (0.6 + 0.25 * i));
        const o = interpolate(frame, [start, start + Math.round(fps * 0.25)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const [a, b] = String(c?.text ?? '').split('\n');
        const hot = c?.tone === 'accent';
        const w = cards.length > 1 ? 465 : 960;
        return (
          <div key={i} style={{ position: 'absolute', left: (60 + i * (w + 30)) * k, top: (650 + (1 - o) * 14) * k, width: w * k, height: 120 * k, borderRadius: 16 * k, background: hot ? '#FDEDE8' : '#F2F2F0', opacity: o, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: hot ? accent : '#222222' }}>
            {b !== undefined ? <div style={{ fontWeight: 500, fontSize: 26 * k }}>{a}</div> : null}
            <div style={{ fontWeight: 900, fontSize: 44 * k, whiteSpace: 'nowrap' }}>{b !== undefined ? b : a}</div>
          </div>
        );
      })}
      {data?.source ? <div style={{ position: 'absolute', right: 65 * k, top: 790 * k, fontWeight: 500, fontSize: 26 * k, color: '#8A8A8A' }}>{String(data.source)}</div> : null}
    </div>
  );
}
