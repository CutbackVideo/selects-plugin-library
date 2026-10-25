import React from 'react';
import { Img, useCurrentFrame, useVideoConfig, delayRender, continueRender, cancelRender } from 'remotion';

// @heritage

// Article photo in a gold-edged frame (radius 12, 2 px gold) on the paper, zooming slowly over the
// whole clip (100 -> 106 % by default, or a pan). `image` is a data URL; `credit` sits bottom-right
// like a source line. `fit: "contain"` (graphics, charts, tall images) shows the whole image on the
// card colour inside the frame with a third of the move, so axes and titles never leave it.
const MOVES = {
  push_in: { s: [0, 1], x: [0, -0.012], y: [0, -0.008] },
  pull_out: { s: [1, 0], x: [0, 0], y: [0, 0] },
  pan_left: { s: [0.6, 0.6], x: [0.03, -0.03], y: [0, 0] },
  pan_right: { s: [0.6, 0.6], x: [-0.03, 0.03], y: [0, 0] },
  pan_up: { s: [0.6, 0.6], x: [0, 0], y: [0.03, -0.03] },
  pan_down: { s: [0.6, 0.6], x: [0, 0], y: [-0.03, 0.03] },
};
const FOCUS = { center: '50% 50%', top: '50% 20%', bottom: '50% 80%', left: '20% 50%', right: '80% 50%' };

export default function NewsPhoto({ data }) {
  // Last entrance: the credit line, 0.3 + 0.8 s.
  const s = useScene(data, 1.1);
  const k = s.k;
  // The move runs over the real clip length, not the entrance clock.
  const p = smooth(s.frame / s.fps / Math.max(0.1, s.end));
  const move = MOVES[String(data?.motion ?? 'push_in')] ?? MOVES.push_in;
  const contain = data?.fit === 'contain';
  const gentle = contain ? 1 / 3 : 1;
  const zoom = Number(data?.zoom ?? 0.06) * gentle;
  const scale = 1 + zoom * lerp(move.s[0], move.s[1], p);
  const credit = String(data?.credit ?? '');
  // Frame x 60..1020; from y 40 down to 40 px above the credit line (or the content floor).
  const fx = X0, fy = 40, fw = X1 - X0, fh = (credit ? 740 : 794) - fy;
  const dx = lerp(move.x[0], move.x[1], p) * fw * gentle;
  const dy = lerp(move.y[0], move.y[1], p) * fh * gentle;
  const image = typeof data?.image === 'string' ? data.image : '';
  const pad = contain ? 16 : 0;
  return (
    <Win s={s} data={data}>
      <Rise s={s} t0={0} dur={0.8} dy={20} x={fx} y={fy} anchor="lt">
        <div style={{ position: 'relative', width: fw * k, height: fh * k, borderRadius: 12 * k, overflow: 'hidden', background: contain ? C.card : C.line }}>
          {image ? (
            <Img src={image} style={{ position: 'absolute', left: pad * k, top: pad * k, width: (fw - 2 * pad) * k, height: (fh - 2 * pad) * k, objectFit: contain ? 'contain' : 'cover', objectPosition: FOCUS[String(data?.focus ?? 'center')] ?? FOCUS.center, transform: 'translate(' + dx * k + 'px,' + dy * k + 'px) scale(' + scale + ')', transformOrigin: '50% 50%' }} />
          ) : null}
          {data?.dim ? <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,' + Number(data.dim) + ')' }} /> : null}
          <div style={{ position: 'absolute', inset: 0, borderRadius: 12 * k, border: 2 * k + 'px solid ' + C.gold, boxSizing: 'border-box' }} />
        </div>
      </Rise>
      <Source s={s} text={credit} />
    </Win>
  );
}
