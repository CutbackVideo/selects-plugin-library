import React from 'react';
import { useCurrentFrame, useVideoConfig, delayRender, continueRender, cancelRender } from 'remotion';

// @heritage

// Fallback scene when no photo or number fits: the key sentence (72/800 ink, '\n' for a line break)
// centred on the paper, one line after another. [word] turns crimson, {phrase} gets the ochre brush
// once its line has settled. Optional scene `title` (+ double gold rule) top-left, `sub` as a smaller
// grey line under the sentence, `source` bottom-right.
export default function TextCard({ data }) {
  const s = useScene(data);
  const k = s.k;
  const title = String(data?.title ?? '');
  const sub = String(data?.sub ?? '');
  const lines = String(data?.text ?? '').split('\n').filter((l) => l.trim() !== '');
  // One size for every line: the longest decides, between 56 and the requested size.
  const want = Number(data?.fontSize ?? 72);
  const size = Math.max(Math.min(want, 56), Math.min(want, ...lines.map((l) => (X1 - X0) / Math.max(0.01, ems(plainText(l))))));
  const lh = size * 1.32;
  const top = title ? 150 : 0;
  const block = lines.length * lh + (sub ? 36 + 44 : 0);
  const y0 = top + (794 - top - block) / 2;
  const at = (i) => (title ? 0.5 : 0.1) + 0.35 * i;
  return (
    <Win s={s} data={data}>
      <Header s={s} title={title} subtitle="" />
      {lines.map((l, i) => <Say key={i} s={s} text={l} x={540} y={y0 + lh * (i + 0.5)} t0={at(i)} size={size} anchor="c" />)}
      {sub ? (
        <Rise s={s} t0={at(lines.length)} dy={10} x={540} y={y0 + lines.length * lh + 36 + 22}>
          <div style={{ fontSize: 36 * k, fontWeight: 600, color: C.gray }}>{sub}</div>
        </Rise>
      ) : null}
      <Source s={s} text={String(data?.source ?? '')} />
    </Win>
  );
}
