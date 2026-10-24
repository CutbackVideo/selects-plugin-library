import React from 'react';
import { useCurrentFrame, useVideoConfig, delayRender, continueRender, cancelRender } from 'remotion';

// @heritage

// Number cards (style spec 6-3): 2-4 cards side by side in x 60..1020 (gap 36; three cards are 296
// wide), each with a green header band (84 tall, white 44/800 name) over a logo-gold 3 px line.
// Cards rise 0.42 s apart, their first label 0.3 s later; once the last card is in, each card's key
// number (72 crimson, unit 36) pops 0.22 s apart, then the second row (label 30/600 grey, value 38/800
// ink, under a quiet divider) rises 0.18 s apart. Numbers pop, no count-up (spec 5-3).
// `cards: [{ header, rows: [{ label, value: number | text, unit? }] }]`, at most two rows per card.
// Text that does not fit its card keeps its size and breaks onto more lines (style spec 1): names and labels at
// a space, a number after \uC5B5/\uB9CC (1\uC5B5 / 5000\uB9CC), the unit onto a line of its own. Every card grows by the most
// lines any card needs in that row, so the rows stay level across the cards. Four one-row cards whose key
// number cannot fit a quarter of the width even broken up go two by two instead (cards 462 wide, at most 300 tall).
const fmt = (v) => { const c = countable(v); return c && typeof v === 'number' ? counted(c, 1) : String(v ?? ''); };
const BAND = 84, BL = 52, LL = 40, VL = 76, UL = 44, L2 = 38, V2 = 46;

export default function StatCards({ data }) {
  const accent = String(data?.accentColor ?? C.acc);
  const band = String(data?.headerColor ?? C.green);
  const cards = (Array.isArray(data?.cards) ? data.cards : []).slice(0, 4);
  const n = Math.max(1, cards.length);
  const subtitle = String(data?.subtitle ?? '');
  const rowsOf = (c) => (Array.isArray(c?.rows) ? c.rows.slice(0, 2) : []);
  const two = cards.some((c) => rowsOf(c).length > 1);
  const at = (i) => 0.45 + 0.42 * i;
  const numAt = at(n - 1) + 0.9;
  const row2At = numAt + 0.8;
  // Last entrance: the last second-row value (0.12 s after its label, 0.8 s rise), the last number pop, or a label
  // brush (0.85 s after its card / 0.55 s after its second-row label).
  const brushes = cards.map((c, i) => { const [r0, r1] = rowsOf(c); return Math.max(brushEnd(r0?.label, at(i) + 0.85), brushEnd(r1?.label, row2At + 0.18 * i + 0.55)); });
  const s = useScene(data, Math.max(two ? row2At + 0.18 * (n - 1) + 0.12 + 0.8 : numAt + 0.22 * (n - 1) + 0.8, ...brushes, headerEnd(String(data?.title ?? ''), subtitle)));
  const k = s.k;
  const gap = 36;
  const widest = (w) => Math.max(0, ...cards.map((c) => { const r0 = rowsOf(c)[0]; return r0 ? Math.max(...wrapLines(fmt(r0.value), 72, w - 28).map((l) => ems(l) * 72)) : 0; }));
  const grid = n === 4 && !two && widest((X1 - X0 - gap * 3) / 4) > (X1 - X0 - gap * 3) / 4 - 28;
  const cols = grid ? 2 : n, W = (X1 - X0 - gap * (cols - 1)) / cols;
  // Each card's text as lines, then each row's height from the card that needs the most lines.
  const laid = cards.map((c) => {
    const [r0, r1] = rowsOf(c);
    const v0 = r0 ? wrapLines(fmt(r0.value), 72, W - 28) : [];
    const u0 = String(r0?.unit ?? '');
    const unitOwn = !!u0 && v0.length > 0 && ems(v0[v0.length - 1]) * 72 + ems(u0) * 36 + 4 > W - 28;
    return {
      header: wrapLines(plainText(String(c?.header ?? '')), 44, W - 24), r0, r1, v0, u0, unitOwn,
      label0: r0?.label ? wrapLines(String(r0.label), 32, W - 24) : [],
      label1: r1?.label ? wrapLines(String(r1.label), 30, W - 24) : [],
      v1: r1 ? wrapLines(fmt(r1.value) + String(r1.unit ?? ''), 38, W - 24) : [],
    };
  });
  const most = (f) => Math.max(1, ...laid.map(f));
  const d1 = (most((c) => c.header.length) - 1) * BL;
  const d2 = d1 + (most((c) => c.label0.length) - 1) * LL;
  const d3 = d2 + (most((c) => c.v0.length) - 1) * VL + (laid.some((c) => c.unitOwn) ? UL : 0);
  const d4 = d3 + (most((c) => c.label1.length) - 1) * L2;
  const d5 = d4 + (most((c) => c.v1.length) - 1) * V2;
  // Two-row cards are 450 tall (sian); one-row cards end under the key number, centred on the same middle.
  // Two by two, the two rows of cards share the room from under the header to y 750 (20 px apart).
  const vgap = 20, top = subtitle ? 176 : 150;
  const Hc = grid ? Math.min(300 + d3, (750 - top - vgap) / 2) : two ? 450 + d5 : 300 + d3;
  const top0 = grid ? top : Math.min((subtitle ? 206 : 186) + (450 - (two ? 450 : 300)) / 2, 770 - Hc);
  return (
    <Win s={s} data={data}>
      <Header s={s} title={String(data?.title ?? '')} subtitle={subtitle} />
      {laid.map((c, i) => {
        const x = X0 + (i % cols) * (W + gap), cx = x + W / 2, t0 = at(i);
        const y0 = top0 + Math.floor(i / cols) * (Hc + vgap);
        const { r0, r1, v0, u0 } = c;
        return (
          <React.Fragment key={i}>
            <Rise s={s} t0={t0} dur={0.9} dy={22} x={x} y={y0} anchor="lt">
              <div style={{ ...cardStyle(s), position: 'relative', width: W * k, height: Hc * k }}>
                {/* Inner coordinates are 2 px (the border) above and left of the sian card's. */}
                <div style={{ position: 'absolute', left: -2 * k, right: -2 * k, top: -2 * k, height: (BAND + d1) * k, background: band, borderRadius: 12 * k + 'px ' + 12 * k + 'px 0 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.white, fontSize: 44 * k, fontWeight: 800, letterSpacing: -1 * k, lineHeight: BL * k + 'px', whiteSpace: 'nowrap' }}>
                  {c.header.map((l, j) => <div key={j}>{l}</div>)}
                </div>
                <div style={{ position: 'absolute', left: -2 * k, right: -2 * k, top: (BAND + d1 - 2.5) * k, height: 3 * k, background: C.goldL }} />
                {r1 ? <div style={{ position: 'absolute', left: 28 * k, right: 28 * k, top: (279 + d3) * k, height: 2 * k, background: C.line }} /> : null}
              </div>
            </Rise>
            {c.label0.map((l, j) => (
              <Rise key={'l' + j} s={s} t0={t0 + 0.3} dy={10} x={cx} y={y0 + 140 + d1 + LL * j}>
                <div style={{ fontSize: 32 * k, fontWeight: 700, color: accent === C.acc ? C.accD : accent }}><Marked s={s} text={l} hlAt={t0 + 0.85} /></div>
              </Rise>
            ))}
            {v0.map((l, r) => (
              <Pop key={'v' + r} s={s} t0={numAt + 0.22 * i} x={cx} y={y0 + 214 + d2 + VL * r}>
                <div style={{ display: 'flex', alignItems: 'baseline', color: accent, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                  <span style={{ fontSize: 72 * k, letterSpacing: -1.5 * k }}>{l}</span>
                  {u0 && !c.unitOwn && r === v0.length - 1 ? <span style={{ fontSize: 36 * k, fontWeight: 700, marginLeft: 2 * k }}>{u0}</span> : null}
                </div>
              </Pop>
            ))}
            {c.unitOwn ? (
              <Pop s={s} t0={numAt + 0.22 * i} x={cx} y={y0 + 214 + d2 + VL * (v0.length - 1) + 58}>
                <span style={{ fontSize: 36 * k, fontWeight: 700, color: accent, lineHeight: 1 }}>{u0}</span>
              </Pop>
            ) : null}
            {c.label1.map((l, j) => (
              <Rise key={'m' + j} s={s} t0={row2At + 0.18 * i} dy={10} x={cx} y={y0 + 330 + d3 + L2 * j}>
                <div style={{ fontSize: 30 * k, fontWeight: 600, color: C.gray }}><Marked s={s} text={l} hlAt={row2At + 0.18 * i + 0.55} /></div>
              </Rise>
            ))}
            {c.v1.map((l, j) => (
              <Rise key={'w' + j} s={s} t0={row2At + 0.18 * i + 0.12} dy={10} x={cx} y={y0 + 385 + d4 + V2 * j}>
                <div style={{ fontSize: 38 * k, fontWeight: 800, color: C.ink, letterSpacing: -0.5 * k }}>{l}</div>
              </Rise>
            ))}
          </React.Fragment>
        );
      })}
      <Source s={s} text={String(data?.source ?? '')} />
    </Win>
  );
}
