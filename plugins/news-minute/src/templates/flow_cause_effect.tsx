import React from 'react';
import { useCurrentFrame, useVideoConfig, delayRender, continueRender, cancelRender } from 'remotion';

// @heritage

// "Because of A, B happens" (style spec 6-7, bottom row): the cause card (400 x 330, gold edge) rises
// in, a gold arrow grows to the right, then the effect card (crimson 3 px edge) follows. Each card
// shows an optional small `caption` (green) over its big `word`; the effect word is crimson. Under
// the scene title and rule. No pictograms: the cards carry words only until a shared icon set exists.
// Text that does not fit keeps its size (style spec 1): the caption and the word break at a space onto more lines,
// stacked in the middle of the card; both cards grow together (never below 330) to hold the taller text.
const FW = 400, FH = 330, LCX = 290, RCX = 790, IN = FW - 60, CL = 48, WL = 76, CGAP = 20, PAD = 60;

// A card's text as lines and the height of their stack.
function laidOut(c) {
  const caption = c.caption ? wrapLines(c.caption, 40, IN, font(40, 800)) : [];
  const word = wrapLines(c.word, 64, IN, font(64, 900, -1));
  return { caption, word, h: caption.length * CL + (caption.length ? CGAP : 0) + word.length * WL };
}

function Card({ s, cx, cy, t0, hero, lines, H }) {
  const k = s.k;
  const y0 = cy - lines.h / 2, wy = y0 + lines.caption.length * CL + (lines.caption.length ? CGAP : 0);
  return (
    <>
      <Rise s={s} t0={t0} dur={0.9} dy={22} x={cx} y={cy}>
        <div style={{ ...cardStyle(s, hero), width: FW * k, height: H * k }} />
      </Rise>
      {lines.caption.map((l, j) => (
        <Rise key={'c' + j} s={s} t0={t0 + 0.25} dy={10} x={cx} y={y0 + CL * (j + 0.5)}>
          <div style={{ fontSize: 40 * k, fontWeight: 800, color: C.green }}><Marked s={s} text={l} hlAt={t0 + 0.8} /></div>
        </Rise>
      ))}
      {lines.word.map((l, j) => (
        <Rise key={'w' + j} s={s} t0={t0 + (lines.caption.length ? 0.45 : 0.3)} dy={12} x={cx} y={wy + WL * (j + 0.5)}>
          <div style={{ fontSize: 64 * k, fontWeight: 900, letterSpacing: -1 * k, color: hero ? C.acc : C.ink }}><Marked s={s} text={l} hlAt={t0 + 1.0} /></div>
        </Rise>
      ))}
    </>
  );
}

export default function FlowCauseEffect({ data }) {
  const cause = { word: String(data?.cause?.word ?? ''), caption: String(data?.cause?.caption ?? '') };
  const effect = { word: String(data?.effect?.word ?? ''), caption: String(data?.effect?.caption ?? '') };
  const tCause = 0.5, tArrow = 1.6, tEffect = 2.2;
  const subtitle = String(data?.subtitle ?? '');
  // Last entrance: the effect word, 0.45 + 0.8 s after its card, or a caption/word brush (0.8 / 1.0 + 0.9 s after it).
  const cardEnd = (c, t0) => Math.max(brushEnd(c.caption, t0 + 0.8), brushEnd(c.word, t0 + 1.0));
  const s = useScene(data, Math.max(tEffect + 1.25, cardEnd(cause, tCause), cardEnd(effect, tEffect), headerEnd(String(data?.title ?? ''), subtitle)));
  const cy = (subtitle ? 190 : 150) + (794 - (subtitle ? 190 : 150)) / 2;
  const ap = smooth(prog(s.t, tArrow, tArrow + 0.7));
  const ax0 = LCX + FW / 2 + 14, ax1 = RCX - FW / 2 - 14;
  const L = (ax1 - ax0) * ap, head = 26;
  const lc = laidOut(cause), le = laidOut(effect);
  const H = Math.max(FH, lc.h + 2 * PAD, le.h + 2 * PAD);
  const top = subtitle ? 162 : 112;
  [[lc, LCX], [le, RCX]].forEach(([c, cx]) => {
    const y0 = cy - c.h / 2, wy = y0 + c.caption.length * CL + (c.caption.length ? CGAP : 0);
    const inCard = [cx - FW / 2 + 30, cy - H / 2, cx + FW / 2 - 30, cy + H / 2];
    report('card', c.caption.join(' ') + ' ' + c.word.join(' '), [cx - FW / 2, cy - H / 2, cx + FW / 2, cy + H / 2], [X0, top, X1, roomBottom(data)]);
    reportLines('caption', c.caption.map((l, j) => ({ text: l, x: cx, y: y0 + CL * (j + 0.5), anchor: 'c' })), 40, inCard, 2, font(40, 800));
    reportLines('word', c.word.map((l, j) => ({ text: l, x: cx, y: wy + WL * (j + 0.5), anchor: 'c' })), 64, inCard, 2, font(64, 900, -1));
  });
  return (
    <Win s={s} data={data}>
      <Header s={s} title={String(data?.title ?? '')} subtitle={subtitle} />
      <Card s={s} cx={LCX} cy={cy} t0={tCause} hero={false} lines={lc} H={H} />
      {ap > 0 ? (
        <svg width={1080 * s.k} height={809 * s.k} viewBox="0 0 1080 809" style={{ position: 'absolute', left: 0, top: 0 }}>
          {L > head ? <line x1={ax0} y1={cy} x2={ax0 + L - head + 2} y2={cy} stroke={C.gold} strokeWidth="9" strokeLinecap="round" /> : null}
          <polygon points={(ax0 + L) + ',' + cy + ' ' + (ax0 + L - head) + ',' + (cy - head * 0.62 * Math.min(1, L / head)) + ' ' + (ax0 + L - head) + ',' + (cy + head * 0.62 * Math.min(1, L / head))} fill={C.gold} />
        </svg>
      ) : null}
      <Card s={s} cx={RCX} cy={cy} t0={tEffect} hero lines={le} H={H} />
    </Win>
  );
}
