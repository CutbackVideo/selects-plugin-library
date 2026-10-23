import React from 'react';
import { Img, useCurrentFrame, useVideoConfig, delayRender, continueRender, cancelRender } from 'remotion';

// @heritage

// Who said it (style spec 6-2): a medal top-left (headshot data URL in a logo-gold ring, or a flat
// suit-and-tie pictogram without one), name (76/900) and affiliation (40/600 grey) beside it, a double
// gold rule, then the quote lines (66/800, no quote marks) one at a time across the scene as if spoken.
// {phrase} in a line gets the ochre brush; without any {} markup the lines listed in `accentLines`
// are brushed whole.
const MEDAL_D = 230, MEDAL_X = X0 + MEDAL_D / 2, MEDAL_Y = 155;
const LINE_X = X0, LINE_Y = 404, LINE_GAP = 92, LINE_SIZE = 66;
const FIRST_LINE = 1.4, STEP_MIN = 0.8, STEP_MAX = 1.5;

// Flat pictogram for a speaker without a photo: grey hair, green suit, white shirt, crimson tie.
function SuitPictogram() {
  const skin = '#E2B993', skinD = '#CFA27B', hair = '#9C9A94', hairD = '#86847E', suit = '#2C4339', suitL = '#3A5649';
  return (
    <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <rect width="100" height="100" fill="#E4DAC4" />
      <g transform="translate(50 100) scale(1.12) translate(-50 -100)">
        {/* suit body and lapels */}
        <path d="M10 104 C 11 84, 22 74, 38 70 L 50 74 L 62 70 C 78 74, 89 84, 90 104 Z" fill={suit} />
        <path d="M38 70 L 44 69 L 50 86 L 43 96 L 40 82 L 44 80 Z" fill={suitL} />
        <path d="M62 70 L 56 69 L 50 86 L 57 96 L 60 82 L 56 80 Z" fill={suitL} />
        {/* neck, shirt and collar */}
        <path d="M43.5 58 L 56.5 58 L 57 70 L 50 76 L 43 70 Z" fill={skinD} />
        <path d="M43 69 L 50 86 L 57 69 L 54 67.5 L 50 73 L 46 67.5 Z" fill={C.white} />
        <path d="M46 67.5 L 50 73 L 46.5 75.5 L 43 69 Z M54 67.5 L 50 73 L 53.5 75.5 L 57 69 Z" fill="#E9E6E0" />
        {/* tie */}
        <path d="M48 73.2 L 52 73.2 L 52.8 76.6 L 47.2 76.6 Z" fill={C.accD} />
        <path d="M47.4 76.4 L 52.6 76.4 L 54.6 91 L 50 96 L 45.4 91 Z" fill={C.acc} />
        {/* ears, face, hair */}
        <ellipse cx="34.6" cy="44" rx="3.4" ry="5" fill={skinD} />
        <ellipse cx="65.4" cy="44" rx="3.4" ry="5" fill={skinD} />
        <path d="M35 40 C 35 28, 42 22.5, 50 22.5 C 58 22.5, 65 28, 65 40 L 65 47 C 65 57, 58 63, 50 63 C 42 63, 35 57, 35 47 Z" fill={skin} />
        <path d="M33.8 42 C 32.5 27, 40.5 19, 50.5 19 C 60.5 19, 68 26, 66.2 42 C 64.8 36, 63 32.5, 60 31 C 55 33.5, 45 33.5, 39.5 30.5 C 36.6 32.5, 35 36.5, 33.8 42 Z" fill={hair} />
        <path d="M39.5 30.5 C 45 33.5, 55 33.5, 60 31 C 55 31.8, 46 31.6, 39.5 30.5 Z" fill={hairD} />
      </g>
    </svg>
  );
}

// Medal (spec 4): logo-gold disc, a 3 px ivory line 5 px in, the picture inside 8 px in.
function Medal({ s, headshot }) {
  const k = s.k;
  const pp = prog(s.t, 0.05, 0.95);
  const scale = lerp(0.92, 1, settle(pp, 0.25));
  const disc = (inset, extra) => ({ position: 'absolute', left: inset * k, top: inset * k, right: inset * k, bottom: inset * k, borderRadius: '50%', ...extra });
  return (
    <At s={s} x={MEDAL_X} y={MEDAL_Y}>
      <div style={{ position: 'relative', width: MEDAL_D * k, height: MEDAL_D * k, opacity: smooth(pp / 0.5), transform: 'scale(' + scale + ')' }}>
        <div style={disc(0, { background: C.goldL })} />
        <div style={disc(5, { background: C.ivory })} />
        <div style={disc(8, { overflow: 'hidden', background: C.card })}>
          {headshot ? <Img src={headshot} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 25%' }} /> : <SuitPictogram />}
        </div>
      </div>
    </At>
  );
}

export default function QuoteCard({ data }) {
  const { fps, durationInFrames } = useVideoConfig();
  const headshot = typeof data?.headshot === 'string' ? data.headshot : '';
  const name = String(data?.name ?? '');
  const affiliation = String(data?.affiliation ?? '');
  const raw = (Array.isArray(data?.lines) ? data.lines : []).map((l) => String(l)).filter((l) => l.trim() !== '').slice(0, 5);
  // Lines without any {} markup: brush the whole lines the planner listed in accentLines.
  const accentLines = new Set((Array.isArray(data?.accentLines) ? data.accentLines : []).map(Number));
  const marked = raw.some((l) => /\{[^}]*\}/.test(l));
  const lines = marked ? raw : raw.map((l, i) => (accentLines.has(i) ? '{' + l + '}' : l));
  const n = lines.length;
  // Line starts spread over the room before the hold (narration pace), 0.8..1.5 s apart; the last line
  // ends with its brush (0.55 + 0.9 s) or its rise (0.8 s), 0.1 s before the hold.
  const end = durationInFrames / fps;
  const room = Math.max(end * 0.5, end - HOLD);
  const tail = n && /\{[^}]*\}/.test(lines[n - 1]) ? 1.45 : 0.8;
  const step = n > 1 ? clamp((room - 0.1 - FIRST_LINE - tail) / (n - 1), STEP_MIN, STEP_MAX) : 0;
  const at = (i) => FIRST_LINE + step * i;
  // Last entrance: the last quote line (or the gold rule, 0.6 + 0.9 s, when there are no lines).
  // (+0.1 s slack, also kept when a short clip speeds the scene up).
  const s = useScene(data, (n ? at(n - 1) + tail : 1.5) + 0.1);
  const k = s.k;
  const gap = n > 4 ? Math.min(LINE_GAP, (740 - LINE_Y) / (n - 1)) : LINE_GAP;
  // Each line keeps 66 unless it would pass X1; then that line alone shrinks just enough to fit
  // (a 960 px line at 52 holds ~19 Hangul), which reads better than clipping it.
  const sizeOf = (l) => Math.min(LINE_SIZE, (X1 - LINE_X) / Math.max(0.01, ems(plainText(l))));
  return (
    <Win s={s} data={data}>
      <Medal s={s} headshot={headshot} />
      {name ? (
        <Rise s={s} t0={0.3} dy={16} x={330} y={122} anchor="l">
          <div style={{ fontSize: fitSize(name, 76, X1 - 330) * k, fontWeight: 900, letterSpacing: -1 * k }}>{name}</div>
        </Rise>
      ) : null}
      {affiliation ? (
        <Rise s={s} t0={0.5} dy={16} x={332} y={198} anchor="l">
          <div style={{ fontSize: fitSize(affiliation, 40, X1 - 332) * k, fontWeight: 600, color: C.gray }}>{affiliation}</div>
        </Rise>
      ) : null}
      <GoldRule s={s} y={318} t0={0.6} />
      {lines.map((l, i) => <Say key={i} s={s} text={l} x={LINE_X} y={LINE_Y + gap * i} t0={at(i)} size={sizeOf(l)} />)}
      <Source s={s} text={String(data?.source ?? '')} />
    </Win>
  );
}
