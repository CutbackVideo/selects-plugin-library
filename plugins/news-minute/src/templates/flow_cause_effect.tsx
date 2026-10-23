import React from 'react';
import { useCurrentFrame, useVideoConfig, delayRender, continueRender, cancelRender } from 'remotion';

// @heritage

// "Because of A, B happens" (style spec 6-7, bottom row): the cause card (400 x 330, gold edge) rises
// in, a gold arrow grows to the right, then the effect card (crimson 3 px edge) follows. Each card
// shows an optional small `caption` (green) over its big `word`; the effect word is crimson. Under
// the scene title and rule. No pictograms: the cards carry words only until a shared icon set exists.
const FW = 400, FH = 330, LCX = 290, RCX = 790;

function Card({ s, cx, cy, t0, hero, caption, word }) {
  const k = s.k;
  const size = fitSize(plainText(word), 64, FW - 60);
  return (
    <>
      <Rise s={s} t0={t0} dur={0.9} dy={22} x={cx} y={cy}>
        <div style={{ ...cardStyle(s, hero), width: FW * k, height: FH * k }} />
      </Rise>
      {caption ? (
        <Rise s={s} t0={t0 + 0.25} dy={10} x={cx} y={cy - 56}>
          <div style={{ fontSize: fitSize(plainText(caption), 40, FW - 60) * k, fontWeight: 800, color: C.green }}><Marked s={s} text={caption} hlAt={t0 + 0.8} /></div>
        </Rise>
      ) : null}
      <Rise s={s} t0={t0 + (caption ? 0.45 : 0.3)} dy={12} x={cx} y={cy + (caption ? 26 : 0)}>
        <div style={{ fontSize: size * k, fontWeight: 900, letterSpacing: -1 * k, color: hero ? C.acc : C.ink }}><Marked s={s} text={word} hlAt={t0 + 1.0} /></div>
      </Rise>
    </>
  );
}

export default function FlowCauseEffect({ data }) {
  const cause = { word: String(data?.cause?.word ?? ''), caption: String(data?.cause?.caption ?? '') };
  const effect = { word: String(data?.effect?.word ?? ''), caption: String(data?.effect?.caption ?? '') };
  const tCause = 0.5, tArrow = 1.6, tEffect = 2.2;
  // Last entrance: the effect word, 0.45 + 0.8 s after its card.
  const s = useScene(data, tEffect + 1.25);
  const subtitle = String(data?.subtitle ?? '');
  const cy = (subtitle ? 190 : 150) + (794 - (subtitle ? 190 : 150)) / 2;
  const ap = smooth(prog(s.t, tArrow, tArrow + 0.7));
  const ax0 = LCX + FW / 2 + 14, ax1 = RCX - FW / 2 - 14;
  const L = (ax1 - ax0) * ap, head = 26;
  return (
    <Win s={s} data={data}>
      <Header s={s} title={String(data?.title ?? '')} subtitle={subtitle} />
      <Card s={s} cx={LCX} cy={cy} t0={tCause} hero={false} {...cause} />
      {ap > 0 ? (
        <svg width={1080 * s.k} height={809 * s.k} viewBox="0 0 1080 809" style={{ position: 'absolute', left: 0, top: 0 }}>
          {L > head ? <line x1={ax0} y1={cy} x2={ax0 + L - head + 2} y2={cy} stroke={C.gold} strokeWidth="9" strokeLinecap="round" /> : null}
          <polygon points={(ax0 + L) + ',' + cy + ' ' + (ax0 + L - head) + ',' + (cy - head * 0.62 * Math.min(1, L / head)) + ' ' + (ax0 + L - head) + ',' + (cy + head * 0.62 * Math.min(1, L / head))} fill={C.gold} />
        </svg>
      ) : null}
      <Card s={s} cx={RCX} cy={cy} t0={tEffect} hero {...effect} />
    </Win>
  );
}
