import React from 'react';
import { useCurrentFrame, useVideoConfig, delayRender, continueRender, cancelRender } from 'remotion';

// @heritage

// Fallback scene when no photo or number fits: the key sentence (72/800 ink, '\n' for a line break)
// centred on the paper, one line after another. A line wider than x 60..1020 breaks onto the next line at the
// same size (style spec 1), never smaller. [word] turns crimson, {phrase} gets the ochre brush once its line
// has settled. Optional scene `title` (+ double gold rule) top-left, `sub` as a smaller grey line under the
// sentence (it wraps the same way), `source` bottom-right.
export default function TextCard({ data }) {
  const title = String(data?.title ?? '');
  const sub = String(data?.sub ?? '');
  const size = Number(data?.fontSize ?? 72);
  const lines = String(data?.text ?? '').split('\n').filter((l) => l.trim() !== '').flatMap((l) => wrapLines(l, size, X1 - X0));
  const subLines = sub ? wrapLines(sub, 36, X1 - X0) : [];
  const at = (i) => (title ? 0.5 : 0.1) + 0.35 * i;
  // Last entrance: the sub line (0.8 s, its brush 0.55 + 0.9 s) or the last line's brush (0.55 + 0.9 s after the line starts).
  const s = useScene(data, Math.max(sub ? at(lines.length) + 0.8 : 0, brushEnd(sub, at(lines.length) + 0.55), at(Math.max(0, lines.length - 1)) + 1.45, headerEnd(title, '')));
  const k = s.k;
  const lh = size * 1.32;
  const top = title ? 150 : 0;
  const block = lines.length * lh + (sub ? 36 + 44 * subLines.length : 0);
  const y0 = top + (794 - top - block) / 2;
  return (
    <Win s={s} data={data}>
      <Header s={s} title={title} subtitle="" />
      {lines.map((l, i) => <Say key={i} s={s} text={l} x={540} y={y0 + lh * (i + 0.5)} t0={at(i)} size={size} anchor="c" />)}
      {subLines.map((l, j) => (
        <Rise key={'s' + j} s={s} t0={at(lines.length)} dy={10} x={540} y={y0 + lines.length * lh + 36 + 44 * j + 22}>
          <div style={{ fontSize: 36 * k, fontWeight: 600, color: C.gray }}><Marked s={s} text={l} hlAt={at(lines.length) + 0.55} /></div>
        </Rise>
      ))}
      <Source s={s} text={String(data?.source ?? '')} />
    </Win>
  );
}
