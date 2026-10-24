import React from 'react';
import { useCurrentFrame, useVideoConfig, delayRender, continueRender, cancelRender } from 'remotion';

// @heritage

// Applies or not, target or exempt (style spec 6-6). A plain gold rule draws across the top and the
// `title` ribbon pops on it; then one or two full-width cards (960 x 270) rise in, each with an icon
// disc on the left and a two-line sentence on the right ('\n' splits it; [word] crimson). A card of
// tone "accent" is the hero side: crimson X drawn one stroke after the other. Tone "contrast" is the
// opposite side (excluded, allowed): a green check drawn stroke by stroke. `subtitle` is an optional
// grey line under the ribbon. The second card waits until the first one has settled.
const CW = X1 - X0, CH = 270, D = 196;

function Mark({ s, tone, t0 }) {
  const p = smooth(prog(s.t, t0, t0 + 0.9));
  if (tone === 'contrast') {
    // Check: short stroke then long stroke.
    const a = clamp(p * 2), b = clamp(p * 2 - 1);
    return (
      <svg width={D * s.k} height={D * s.k} viewBox="0 0 196 196">
        <circle cx="98" cy="98" r="98" fill="#DCE9DF" />
        {a > 0 ? <line x1="58" y1="102" x2={lerp(58, 86, a)} y2={lerp(102, 130, a)} stroke={C.good} strokeWidth="16" strokeLinecap="round" /> : null}
        {b > 0 ? <line x1="86" y1="130" x2={lerp(86, 142, b)} y2={lerp(130, 70, b)} stroke={C.good} strokeWidth="16" strokeLinecap="round" /> : null}
      </svg>
    );
  }
  // X: the two strokes are drawn in turn (spec 6-6).
  const a = clamp(p * 2), b = clamp(p * 2 - 1);
  return (
    <svg width={D * s.k} height={D * s.k} viewBox="0 0 196 196">
      <circle cx="98" cy="98" r="98" fill={C.accL} />
      {a > 0 ? <line x1="62" y1="62" x2={lerp(62, 134, a)} y2={lerp(62, 134, a)} stroke={C.acc} strokeWidth="16" strokeLinecap="round" /> : null}
      {b > 0 ? <line x1="134" y1="62" x2={lerp(134, 62, b)} y2={lerp(62, 134, b)} stroke={C.acc} strokeWidth="16" strokeLinecap="round" /> : null}
    </svg>
  );
}

// The sentence as given when it has a '\n'; otherwise split at the space nearest the middle (outside
// any [ ] or { } mark) so it reads as the spec's two-line card.
function twoLines(text) {
  const given = text.split('\n').filter((l) => l.trim() !== '');
  if (given.length !== 1) return given.slice(0, 2);
  const one = given[0];
  let best = -1, depth = 0;
  for (let i = 0; i < one.length; i += 1) {
    const ch = one[i];
    if (ch === '[' || ch === '{') depth += 1;
    else if (ch === ']' || ch === '}') depth -= 1;
    else if (ch === ' ' && depth === 0 && (best < 0 || Math.abs(i - one.length / 2) < Math.abs(best - one.length / 2))) best = i;
  }
  return best < 0 || ems(plainText(one)) < 11 ? [one] : [one.slice(0, best), one.slice(best + 1)];
}

export default function VerdictCard({ data }) {
  const cards = (Array.isArray(data?.cards) ? data.cards : []).slice(0, 2).map((c) => ({ text: String(c?.text ?? ''), tone: c?.tone === 'contrast' ? 'contrast' : 'accent' }));
  const subtitle = String(data?.subtitle ?? '');
  const starts = cards.map((_, i) => (i === 0 ? 0.35 : 2.0));
  // Last entrance: the last card's icon mark (1.0 + 0.9 s after its card), its second line, or a line brush
  // (0.4 + 0.2 j + 0.55 + 0.9 s after the card).
  const lineEnd = (c, i) => Math.max(0, ...twoLines(c.text).map((l, j) => brushEnd(l, starts[i] + 0.4 + 0.2 * j + 0.55)));
  const s = useScene(data, Math.max(cards.length ? starts[cards.length - 1] + 1.9 : 1.1, brushEnd(subtitle, 1.05), ...cards.map(lineEnd)));
  const k = s.k;
  const top = subtitle ? 200 : 150;
  const gap = cards.length > 1 ? (794 - top - 2 * CH) / 3 : (794 - top - CH) / 2;
  return (
    <Win s={s} data={data}>
      <GoldRule s={s} y={78} t0={0} ornament={false} />
      <Pop s={s} t0={0.3} x={540} y={78}><Ribbon s={s} text={String(data?.title ?? '')} size={44} /></Pop>
      {subtitle ? <Rise s={s} t0={0.5} dy={10} x={540} y={152}><div style={{ fontSize: 30 * k, fontWeight: 500, color: C.gray }}><Marked s={s} text={subtitle} hlAt={1.05} /></div></Rise> : null}
      {cards.map((c, i) => {
        const t0 = starts[i];
        const y0 = top + gap + i * (CH + gap), cy = y0 + CH / 2;
        const lines = twoLines(c.text);
        const tx = X0 + 36 + D + 44;
        const size = Math.min(64, ...lines.map((l) => (X1 - 36 - tx) / Math.max(0.01, ems(plainText(l)))));
        const lh = size * 1.25;
        const iconIn = prog(s.t, t0 + 0.25, t0 + 1.05);
        return (
          <React.Fragment key={i}>
            <Rise s={s} t0={t0} dur={0.9} dy={22} x={X0} y={y0} anchor="lt">
              <div style={{ ...cardStyle(s, false), width: CW * k, height: CH * k, borderColor: c.tone === 'contrast' ? C.good : C.gold }} />
            </Rise>
            <At s={s} x={X0 + 36 + D / 2} y={cy}>
              <div style={{ opacity: smooth(iconIn / 0.5), transform: 'scale(' + lerp(0.9, 1, settle(iconIn, 0.3)) + ')' }}><Mark s={s} tone={c.tone} t0={t0 + 1.0} /></div>
            </At>
            {lines.map((l, j) => (
              <Say key={j} s={s} text={l} x={tx} y={cy + (j - (lines.length - 1) / 2) * lh} t0={t0 + 0.4 + 0.2 * j} size={size} dy={14} />
            ))}
          </React.Fragment>
        );
      })}
    </Win>
  );
}
