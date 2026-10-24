import React from 'react';
import { useCurrentFrame, useVideoConfig, delayRender, continueRender, cancelRender } from 'remotion';

// @heritage

// Number cards (style spec 6-3): 2-4 cards side by side in x 60..1020 (gap 36; three cards are 296
// wide), each with a green header band (84 tall, white 44/800 name) over a logo-gold 3 px line.
// Cards rise 0.42 s apart, their first label 0.3 s later; once the last card is in, each card's key
// number (72 crimson, unit 36) pops 0.22 s apart, then the second row (label 30/600 grey, value 38/800
// ink, under a quiet divider) rises 0.18 s apart. Numbers pop, no count-up (spec 5-3).
// `cards: [{ header, rows: [{ label, value: number | text, unit? }] }]`, at most two rows per card.
const fmt = (v) => { const c = countable(v); return c && typeof v === 'number' ? counted(c, 1) : String(v ?? ''); };

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
  const gap = 36, W = (X1 - X0 - gap * (n - 1)) / n, BAND = 84;
  // Two-row cards are 450 tall (sian); one-row cards end under the key number, centred on the same middle.
  const Hc = two ? 450 : 300;
  const y0 = (subtitle ? 206 : 186) + (450 - Hc) / 2;
  return (
    <Win s={s} data={data}>
      <Header s={s} title={String(data?.title ?? '')} subtitle={subtitle} />
      {cards.map((c, i) => {
        const x = X0 + i * (W + gap), cx = x + W / 2, t0 = at(i);
        const header = String(c?.header ?? '');
        const [r0, r1] = rowsOf(c);
        const v0 = fmt(r0?.value), u0 = String(r0?.unit ?? '');
        const v1 = r1 ? fmt(r1.value) + String(r1.unit ?? '') : '';
        // The key number and its unit shrink together only when they would overflow the card.
        const sc = Math.min(1, (W - 28) / Math.max(1, ems(v0) * 72 + ems(u0) * 36 + 4));
        return (
          <React.Fragment key={i}>
            <Rise s={s} t0={t0} dur={0.9} dy={22} x={x} y={y0} anchor="lt">
              <div style={{ ...cardStyle(s), position: 'relative', width: W * k, height: Hc * k }}>
                {/* Inner coordinates are 2 px (the border) above and left of the sian card's. */}
                <div style={{ position: 'absolute', left: -2 * k, right: -2 * k, top: -2 * k, height: BAND * k, background: band, borderRadius: 12 * k + 'px ' + 12 * k + 'px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.white, fontSize: fitSize(plainText(header), 44, W - 24) * k, fontWeight: 800, letterSpacing: -1 * k }}>{plainText(header)}</div>
                <div style={{ position: 'absolute', left: -2 * k, right: -2 * k, top: (BAND - 2.5) * k, height: 3 * k, background: C.goldL }} />
                {r1 ? <div style={{ position: 'absolute', left: 28 * k, right: 28 * k, top: 279 * k, height: 2 * k, background: C.line }} /> : null}
              </div>
            </Rise>
            {r0?.label ? (
              <Rise s={s} t0={t0 + 0.3} dy={10} x={cx} y={y0 + 140}>
                <div style={{ fontSize: fitSize(plainText(r0.label), 32, W - 24) * k, fontWeight: 700, color: accent === C.acc ? C.accD : accent }}><Marked s={s} text={String(r0.label)} hlAt={t0 + 0.85} /></div>
              </Rise>
            ) : null}
            {r0 ? (
              <Pop s={s} t0={numAt + 0.22 * i} x={cx} y={y0 + 214}>
                <div style={{ display: 'flex', alignItems: 'baseline', color: accent, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                  <span style={{ fontSize: 72 * sc * k, letterSpacing: -1.5 * sc * k }}>{v0}</span>
                  {u0 ? <span style={{ fontSize: 36 * sc * k, fontWeight: 700, marginLeft: 2 * sc * k }}>{u0}</span> : null}
                </div>
              </Pop>
            ) : null}
            {r1?.label ? (
              <Rise s={s} t0={row2At + 0.18 * i} dy={10} x={cx} y={y0 + 330}>
                <div style={{ fontSize: fitSize(plainText(r1.label), 30, W - 24) * k, fontWeight: 600, color: C.gray }}><Marked s={s} text={String(r1.label)} hlAt={row2At + 0.18 * i + 0.55} /></div>
              </Rise>
            ) : null}
            {r1 ? (
              <Rise s={s} t0={row2At + 0.18 * i + 0.12} dy={10} x={cx} y={y0 + 385}>
                <div style={{ fontSize: fitSize(v1, 38, W - 24) * k, fontWeight: 800, color: C.ink, letterSpacing: -0.5 * k }}>{v1}</div>
              </Rise>
            ) : null}
          </React.Fragment>
        );
      })}
      <Source s={s} text={String(data?.source ?? '')} />
    </Win>
  );
}
