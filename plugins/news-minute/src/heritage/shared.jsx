// Heritage look shared by the scene templates (customer style spec of 2026-10-21, values from its
// omin_style.py). build.mjs pastes this file in place of the `// @heritage` line of each template, so
// every template stays one self-contained tsxCode string. Needs React, useCurrentFrame, useVideoConfig,
// delayRender, continueRender and cancelRender imported by the template.
//
// Coordinates are px of the 1080-wide frame inside the graphic window (frame y 481..1290, 809 tall);
// frame y = window y + 481. Keep content above window y 794 (the caption sits at frame y ~1310..1380).
const FALLBACK = "'Pretendard','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif";
const C = {
  ivory: '#F6F1E4', ink: '#1E2422', ink2: '#5A605C', gray: '#8A8478', bar: '#C9C3B5', line: '#DED6C4',
  card: '#EEE6D4', acc: '#A9222B', accD: '#8C1820', accL: '#F3DEDA', hl: 'rgba(235,200,114,0.85)',
  green: '#23342E', gold: '#B08D57', goldL: '#C4A062', good: '#2E6B4A', white: '#FFFFFF', area: '#E9E0CC',
};
const X0 = 60, X1 = 1020;

// Every move starts and ends at rest (smootherstep). settle passes the target by `over` at 72 % of the
// move and comes back to rest on it; only bars, numbers, ribbons and icons use it.
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const prog = (t, t0, t1) => clamp((t - t0) / (t1 - t0));
const smooth = (x) => { x = clamp(x); return x * x * x * (x * (6 * x - 15) + 10); };
const settle = (x, over = 0.03) => { x = clamp(x); return x < 0.72 ? (1 + over) * smooth(x / 0.72) : 1 + over * (1 - smooth((x - 0.72) / 0.28)); };
const lerp = (a, b, x) => a + (b - a) * x;

// Hold rendering until the face the panel embedded in `fontCss` has loaded, so no frame is drawn
// in a fallback font. Without `fontCss` the graphic uses the installed fonts in FALLBACK.
function useEmbeddedFont(data) {
  const css = typeof data?.fontCss === 'string' ? data.fontCss : '';
  const [hold] = React.useState(() => (css ? delayRender('News minute font') : null));
  React.useEffect(() => {
    if (hold === null) return;
    const loads = Array.isArray(data?.fontLoads) ? data.fontLoads : [];
    Promise.all(loads.map((f) => document.fonts.load(String(f)))).then(() => document.fonts.ready).then(() => continueRender(hold)).catch(cancelRender);
  }, [hold]);
  return css ? <style>{css}</style> : null;
}

// Scene clock and scale: t in seconds, k = px per frame px, window placement from params.
// `natural` is when the template's last entrance ends at normal speed. The finished frame must hold
// for the last HOLD seconds of the clip (spec 5-3), so a clip shorter than natural + HOLD runs the
// whole timeline faster instead of cutting entrances off.
const HOLD = 1.5;
function useScene(data, natural = 0) {
  const fontFace = useEmbeddedFont(data);
  const frame = useCurrentFrame();
  const { width, fps, durationInFrames } = useVideoConfig();
  const family = typeof data?.fontFamily === 'string' ? data.fontFamily.trim() : '';
  const end = durationInFrames / fps;
  const room = Math.max(end * 0.5, end - HOLD);
  const speed = natural > room ? natural / room : 1;
  return {
    fontFace, fps, frame, t: (frame / fps) * speed, speed, end, k: width / 1080,
    fontFamily: family === '' ? FALLBACK : '"' + family + '", ' + FALLBACK,
    top: Number(data?.windowTop ?? 481), height: Number(data?.windowHeight ?? 809),
  };
}

// The graphic window: ivory paper with a slightly lighter middle. `background: "transparent"` or a
// zero-alpha hex such as "#F6F1E400" (the form a colour control accepts) leaves it clear for a damask
// plate laid underneath.
function Win({ s, data, children }) {
  const bg = String(data?.background ?? C.ivory);
  const paper = bg === 'transparent' || bg === 'none' || /^#[0-9a-f]{6}00$/i.test(bg) ? 'transparent'
    : 'radial-gradient(ellipse 430px 360px at 50% 49%, rgba(255,255,255,0.22), rgba(255,255,255,0) 100%), ' + bg;
  return (
    <div style={{ position: 'absolute', left: 0, top: s.top * s.k, width: 1080 * s.k, height: s.height * s.k, background: paper, overflow: 'hidden', fontFamily: s.fontFamily, color: C.ink, pointerEvents: 'none' }}>
      {s.fontFace}
      {children}
    </div>
  );
}

// Positioned box in window px. anchor: c (centre), l (left-middle), r (right-middle), lt (left-top),
// b (centre-bottom). The box takes its content's size.
const ANCHOR = { c: 'translate(-50%,-50%)', l: 'translate(0,-50%)', r: 'translate(-100%,-50%)', lt: 'none', b: 'translate(-50%,-100%)' };
function At({ s, x, y, anchor = 'c', style, children }) {
  return <div style={{ position: 'absolute', left: x * s.k, top: y * s.k, transform: ANCHOR[anchor], whiteSpace: 'nowrap', ...style }}>{children}</div>;
}

// rise: glides up dy px from rest to rest, fading in over the first 75 % (0.8 s, 20 px by default).
function rise(s, t0, dur = 0.8, dy = 20) {
  const p = prog(s.t, t0, t0 + dur);
  return { opacity: smooth(p / 0.75), transform: 'translateY(' + (1 - smooth(p)) * dy * s.k + 'px)' };
}
function Rise({ s, t0, dur, dy, x, y, anchor = 'c', style, children }) {
  return (
    <At s={s} x={x} y={y} anchor={anchor} style={style}>
      <div style={rise(s, t0, dur, dy)}>{children}</div>
    </At>
  );
}
// pop: numbers and ribbons grow from 90 % to 3 % past full size and settle, 3 % taller while growing.
function pop(s, t0, dur = 0.8) {
  const p = prog(s.t, t0, t0 + dur);
  const sc = lerp(0.9, 1, settle(p, 0.3));
  const st = 0.03 * Math.sin(Math.PI * Math.min(1, p / 0.72));
  return { opacity: smooth(p / 0.5), transform: 'scale(' + sc * (1 - st / 2) + ',' + sc * (1 + st) + ')' };
}
function Pop({ s, t0, dur, x, y, anchor = 'c', children }) {
  return (
    <At s={s} x={x} y={y} anchor={anchor}>
      <div style={pop(s, t0, dur)}>{children}</div>
    </At>
  );
}

// Double gold rule (2.2 px over 1.2 px, 6 px apart) with a small diamond in the middle, drawn from
// the centre outwards over `dur`.
function GoldRule({ s, x0 = X0, x1 = X1, y, t0, dur = 0.9, ornament = true }) {
  const p = smooth(prog(s.t, t0, t0 + dur));
  if (p <= 0) return null;
  const w = x1 - x0, cx = w / 2, gap = ornament ? 13 : 0, half = (w / 2) * p;
  const seg = (yy, lw) => (
    <g key={yy} stroke={C.gold} strokeWidth={lw}>
      <line x1={cx - half} y1={yy} x2={cx - gap} y2={yy} />
      <line x1={cx + gap} y1={yy} x2={cx + half} y2={yy} />
    </g>
  );
  return (
    <svg width={w * s.k} height={18 * s.k} viewBox={'0 0 ' + w + ' 18'} style={{ position: 'absolute', left: x0 * s.k, top: (y - 9) * s.k, overflow: 'visible' }}>
      {seg(6, 2.2)}
      {seg(12, 1.2)}
      {ornament ? <polygon points={cx + ',2.5 ' + (cx + 6.5) + ',9 ' + cx + ',15.5 ' + (cx - 6.5) + ',9'} fill={C.gold} opacity={smooth(p * 3)} /> : null}
    </svg>
  );
}

// Scene title (50/800) top-left, double gold rule under it, optional sub line (30/500) under the rule;
// the sub line takes [ ] / { } marks like any sentence.
// Order: title 0 s, rule 0.2 s, sub line 0.4 s.
function Header({ s, title, subtitle, t0 = 0 }) {
  return (
    <>
      {title ? <Rise s={s} t0={t0} dy={16} x={X0} y={56} anchor="l"><div style={{ fontSize: 50 * s.k, fontWeight: 800, letterSpacing: -1 * s.k }}>{title}</div></Rise> : null}
      {title ? <GoldRule s={s} y={104} t0={t0 + 0.2} /> : null}
      {subtitle ? <Rise s={s} t0={t0 + 0.4} dy={10} x={X0} y={140} anchor="l"><div style={{ fontSize: 30 * s.k, fontWeight: 500, color: C.gray }}><Marked s={s} text={subtitle} hlAt={t0 + 0.95} /></div></Rise> : null}
    </>
  );
}

// Source line, always bottom-right (26/500).
function Source({ s, text, t0 = 0.3 }) {
  if (!text) return null;
  return <Rise s={s} t0={t0} dy={8} x={X1} y={772} anchor="r"><div style={{ fontSize: 26 * s.k, fontWeight: 500, color: C.gray }}>{text}</div></Rise>;
}

// Emphasis markup: [word] = crimson, {phrase} = crimson on an ochre brush stroke.
function parseMarks(text) {
  const out = [];
  for (const m of String(text ?? '').matchAll(/\[([^\]]*)\]|\{([^}]*)\}|([^[{]+)/g)) {
    if (m[1] !== undefined) out.push({ text: m[1], mark: 'acc' });
    else if (m[2] !== undefined) out.push({ text: m[2], mark: 'hl' });
    else out.push({ text: m[3], mark: '' });
  }
  return out.filter((p) => p.text);
}
const plainText = (text) => parseMarks(text).map((p) => p.text).join('');

// Ochre highlighter stroke 1.08 x the text height, ragged edges and dry streaks toward its end,
// swept in left to right by p (0..1).
function Brush({ p, seed = 0 }) {
  const id = 'nmb' + seed + Math.round(p * 1000);
  const r = (i) => { const v = Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453; return v - Math.floor(v); };
  const top = [], bot = [];
  for (let i = 0; i <= 20; i += 1) { top.push(i * 5 + ',' + (6 + r(i) * 4 + (i === 0 ? 5 : 0))); bot.unshift(i * 5 + ',' + (94 - r(i + 40) * 4)); }
  const streaks = [0, 1, 2, 3, 4].map((i) => ({ y: 22 + r(i + 80) * 56, x: 62 + r(i + 90) * 28, w: 1.5 + r(i + 99) * 2 }));
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', left: '-0.12em', right: '-0.12em', top: '0.02em', height: '1.08em', width: 'calc(100% + 0.24em)', zIndex: -1 }}>
      <defs>
        <linearGradient id={id}>
          <stop offset={Math.max(0, p * 1.15 - 0.15)} stopColor="#fff" />
          <stop offset={p * 1.15} stopColor="#000" />
        </linearGradient>
        <mask id={id + 'm'}><rect width="100" height="100" fill={'url(#' + id + ')'} /></mask>
      </defs>
      <g mask={'url(#' + id + 'm)'}>
        <polygon points={top.concat(bot).join(' ')} fill={C.hl} />
        {streaks.map((q, i) => <line key={i} x1={q.x} y1={q.y} x2="100" y2={q.y + 1} stroke={C.ivory} strokeWidth={q.w} />)}
      </g>
    </svg>
  );
}

// One line of markup text. The brush sweeps in from `hlAt` (seconds) over 0.9 s.
function Marked({ s, text, color = C.ink, accent = C.acc, hlAt = 0 }) {
  return (
    <>
      {parseMarks(text).map((p, i) => p.mark === '' ? <span key={i}>{p.text}</span> : (
        <span key={i} style={{ color: accent, position: 'relative', zIndex: 0, isolation: 'isolate' }}>
          {p.mark === 'hl' ? <Brush p={smooth(prog(s.t, hlAt, hlAt + 0.9))} seed={i} /> : null}
          {p.text}
        </span>
      ))}
    </>
  );
}

// say(): a markup line that rises in at t0; its {phrase} brush follows once the line has nearly
// settled (t0 + 0.55 s), riding with the line.
function Say({ s, text, x, y, t0, size, weight = 800, color = C.ink, anchor = 'l', dur = 0.8, dy = 20 }) {
  return (
    <Rise s={s} t0={t0} dur={dur} dy={dy} x={x} y={y} anchor={anchor}>
      <div style={{ fontSize: size * s.k, fontWeight: weight, color, letterSpacing: -1 * s.k }}><Marked s={s} text={text} hlAt={t0 + 0.55} /></div>
    </Rise>
  );
}

// Ribbon label with swallow-tail ends (notch 14, padding 34 x 6) and logo-gold lines 5 px inside.
function Ribbon({ s, text, size = 40, bg = C.acc, fg = C.white, weight = 800 }) {
  const k = s.k, n = 14 * k;
  const line = { position: 'absolute', left: n + 6 * k, right: n + 6 * k, height: 1.5 * k, background: C.goldL };
  return (
    <div style={{ position: 'relative', padding: 6 * k + 'px ' + 34 * k + 'px', fontSize: size * k, fontWeight: weight, color: fg, lineHeight: 1.25 }}>
      <div style={{ position: 'absolute', inset: 0, background: bg, clipPath: 'polygon(0 0, 100% 0, calc(100% - ' + n + 'px) 50%, 100% 100%, 0 100%, ' + n + 'px 50%)' }} />
      <div style={{ ...line, top: 4.25 * k }} />
      <div style={{ ...line, bottom: 4.25 * k }} />
      <span style={{ position: 'relative' }}>{text}</span>
    </div>
  );
}

// Card: ivory-beige fill, gold border, radius 12, no shadow. Hero cards take a crimson 3 px border.
function cardStyle(s, hero = false) {
  return { boxSizing: 'border-box', background: C.card, border: (hero ? 3 : 2) * s.k + 'px solid ' + (hero ? C.acc : C.gold), borderRadius: 12 * s.k };
}

// Count-up: split a value into fixed text around one number so it can count from 0.
// 3592 -> {num: 3592}, "$3,592.5" -> {head: "$", num: 3592.5}. null when it has none or several numbers.
const NUM = /-?\d[\d,]*(?:\.\d+)?/g;
function countable(v) {
  const text = typeof v === 'number' ? String(v) : String(v ?? '');
  const hits = text.match(NUM) || [];
  if (hits.length !== 1) return null;
  const raw = hits[0], at = text.indexOf(raw), dot = raw.indexOf('.');
  return { head: text.slice(0, at), tail: text.slice(at + raw.length), num: Number(raw.replace(/,/g, '')), decimals: dot < 0 ? 0 : raw.length - dot - 1, group: raw.includes(',') || Math.abs(Number(raw.replace(/,/g, ''))) >= 10000 };
}
// Rounded first so a negative value starts at 0, not -0.
const counted = (c, p) => c.head + (Number((c.num * p).toFixed(c.decimals)) || 0).toLocaleString('en-US', { minimumFractionDigits: c.decimals, maximumFractionDigits: c.decimals, useGrouping: c.group }) + c.tail;

// Rough text width in em for fitting type into a box: Latin and digits ~0.58, Hangul ~0.95.
const ems = (text) => [...String(text)].reduce((n, ch) => n + (ch === ' ' ? 0.3 : /[\x21-\x7e]/.test(ch) ? 0.58 : 0.95), 0);
const fitSize = (text, size, maxW) => Math.min(size, maxW / Math.max(0.01, ems(text)));
