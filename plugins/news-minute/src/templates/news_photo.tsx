import React from 'react';
import { Img, interpolate, Easing, useCurrentFrame, useVideoConfig } from 'remotion';

const FALLBACK = "'Pretendard','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif";

// Article photo cover-filling the 1080x920 media window with a slow Ken Burns move over the scene:
// push-in by `zoom` (default 9 %) plus a slight drift, or a pan. `image` is a data URL. Optional
// source credit sits top-right inside the window.
const MOVES = {
  push_in: { s: [0, 1], x: [0, -0.012], y: [0, -0.008] },
  pull_out: { s: [1, 0], x: [0, 0], y: [0, 0] },
  pan_left: { s: [0.6, 0.6], x: [0.03, -0.03], y: [0, 0] },
  pan_right: { s: [0.6, 0.6], x: [-0.03, 0.03], y: [0, 0] },
  pan_up: { s: [0.6, 0.6], x: [0, 0], y: [0.035, -0.035] },
  pan_down: { s: [0.6, 0.6], x: [0, 0], y: [-0.035, 0.035] },
};
const FOCUS = { center: '50% 50%', top: '50% 20%', bottom: '50% 80%', left: '25% 50%', right: '75% 50%' };

export default function NewsPhoto({ data }) {
  const frame = useCurrentFrame();
  const { width, fps, durationInFrames } = useVideoConfig();
  const k = width / 1080;
  const family = typeof data?.fontFamily === 'string' ? data.fontFamily.trim() : '';
  const fontFamily = family === '' ? FALLBACK : '"' + family + '", ' + FALLBACK;
  const dur = Number(data?.durationSec) > 0 ? Math.round(Number(data.durationSec) * fps) : durationInFrames;
  const t = interpolate(frame, [0, Math.max(1, dur - 1)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.33, 0, 0.67, 1) });
  const move = MOVES[String(data?.motion ?? 'push_in')] ?? MOVES.push_in;
  const zoom = Number(data?.zoom ?? 0.09);
  const scale = 1 + zoom * (move.s[0] + (move.s[1] - move.s[0]) * t);
  const dx = (move.x[0] + (move.x[1] - move.x[0]) * t) * 1080;
  const dy = (move.y[0] + (move.y[1] - move.y[0]) * t) * 920;
  const top = Number(data?.windowTop ?? 480);
  const height = Number(data?.windowHeight ?? 920);
  const image = typeof data?.image === 'string' ? data.image : '';
  const credit = String(data?.credit ?? '');
  return (
    <div style={{ position: 'absolute', left: 0, top: top * k, width: 1080 * k, height: height * k, overflow: 'hidden', background: '#000000', pointerEvents: 'none' }}>
      {image ? (
        <Img src={image} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: FOCUS[String(data?.focus ?? 'center')] ?? FOCUS.center, transform: 'translate(' + dx * k + 'px,' + dy * k + 'px) scale(' + scale + ')', transformOrigin: '50% 50%' }} />
      ) : null}
      {data?.dim ? <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,' + Number(data.dim) + ')' }} /> : null}
      {credit ? (
        <div style={{ position: 'absolute', right: 38 * k, top: 46 * k, fontFamily, fontWeight: 300, fontSize: 35 * k, color: '#FFFFFF', whiteSpace: 'nowrap', textShadow: '0 ' + 2 * k + 'px ' + 6 * k + 'px rgba(0,0,0,0.7)' }}>{credit}</div>
      ) : null}
    </div>
  );
}
