// @name City Weekend Vlog
// @name:de Städte-Wochenend-Vlog
// @name:en City Weekend Vlog
// @name:es Vlog de fin de semana en la ciudad
// @name:fr Vlog week-end en ville
// @name:it Vlog weekend in città
// @name:ja シティ週末 Vlog
// @name:ko City Weekend Vlog
// @name:pt Vlog de fim de semana na cidade
// @name:tr Şehirde Hafta Sonu Vlogu
// @name:zh 城市周末 Vlog
// @icon sparkles
// Builds a beat-synced 9:16 city weekend vlog with a font-switching title as a new, editable Draft.
import React from "react";

const PLUGIN_ID = "city-weekend-vlog";
const SKILLS_DIR = "$SELECTS_USER_SKILLS_ROOT/" + PLUGIN_ID;
const DATA_DIR = "$HOME/.selects/plugin-data/" + PLUGIN_ID;
const CWV_QUERIES = {
  street: "busy city street with cars, taxis or people walking",
  architecture: "building facade architecture",
  landmark: "famous landmark or skyline",
  park: "green park, trees and lawn",
  detail: "close-up street detail, sign or storefront",
  wide: "wide open view of sky, lawn or skyline",
  talking: "person talking to the camera",
};
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// cwv-planner:start
// City Weekend Vlog planner. A plain script: panel.tsx embeds it verbatim and the tests load it in node:vm.
const CWV_TITLE_BEATS = [1.75, 1.5, 1.0, 0.25, 0.25, 0.25, 0.25, 0.5, 0.5, 0.5, 0.5, 0.5, 1.25];
const CWV_TITLE_ROLES = ['street', 'architecture', 'street', 'landmark', 'landmark', 'landmark', 'landmark', 'landmark', 'landmark', 'landmark', 'landmark', 'landmark', 'wide'];
// Font state of the switching line from each title slot on; null before the place line exists.
const CWV_FONT_STATES = [null, null, 'A', 'B', 'C', 'D', 'A', 'B', 'C', 'D', 'A', 'A', 'A'];
const CWV_MONTAGE_ROLES = ['architecture', 'park', 'street', 'detail'];
const CWV_MONTAGE_BEATS = 2;
const CWV_TITLE_TOTAL_BEATS = 9;
const CWV_LENGTHS = { short: 4, standard: 7, long: 12 };
const CWV_MIN_MONTAGE = 4;
const CWV_MAX_MONTAGE = 12;
const CWV_MIN_WINDOWS = CWV_TITLE_BEATS.length + CWV_MIN_MONTAGE;
const CWV_LINE1_OFFSET_BEATS = 0.25;
const CWV_REFERENCE_BPM = 99.2;
// searchScenes always returns its nearest hits, even on clips where nobody talks, so a talking hit only
// blocks footage when it beats the best other-role hit near it by this margin, or, with none near, reaches CWV_TALKING_MIN.
const CWV_TALKING_MARGIN = 0.05;
const CWV_TALKING_MIN = 0.3;

function cwvVideoBeats(montageShots) { return CWV_TITLE_TOTAL_BEATS + CWV_MONTAGE_BEATS * montageShots; }
function cwvVideoSeconds(bpm, montageShots) { return cwvVideoBeats(montageShots) * 60 / bpm; }

function cwvSchedule(opts) {
  const bpm = opts.bpm, fps = opts.fps, n = opts.montageShots;
  if (!(bpm > 0) || !(fps > 0) || !(n >= 0)) throw Error('cwvSchedule needs bpm, fps and montageShots');
  // Every boundary is an absolute beat position snapped once to a frame; durations never accumulate rounding.
  const frameAt = beats => Math.round(beats * 60 / bpm * fps);
  const beats = CWV_TITLE_BEATS.concat(Array(n).fill(CWV_MONTAGE_BEATS));
  const slots = [];
  let at = 0;
  beats.forEach((b, i) => {
    const inTitle = i < CWV_TITLE_BEATS.length;
    slots.push({
      index: i,
      role: inTitle ? CWV_TITLE_ROLES[i] : CWV_MONTAGE_ROLES[(i - CWV_TITLE_BEATS.length) % CWV_MONTAGE_ROLES.length],
      section: inTitle ? (i < 3 ? 'opening' : i < 12 ? 'burst' : 'hold') : 'montage',
      startFrame: frameAt(at),
      endFrame: frameAt(at + b),
    });
    at += b;
  });
  const fontSwitches = [];
  CWV_FONT_STATES.forEach((state, i) => {
    const last = fontSwitches.length ? fontSwitches[fontSwitches.length - 1].state : null;
    if (state && state !== last) fontSwitches.push({ frame: slots[i].startFrame, state });
  });
  return {
    slots,
    totalFrames: slots[slots.length - 1].endFrame,
    title: {
      line1Frame: frameAt(CWV_LINE1_OFFSET_BEATS),
      connectorFrame: slots[1].startFrame,
      placeFrame: slots[2].startFrame,
      fontSwitches,
      endFrame: slots[CWV_TITLE_BEATS.length - 1].endFrame,
    },
  };
}

function cwvFitMontage(opts) {
  for (let n = Math.min(opts.requested, CWV_MAX_MONTAGE); n >= CWV_MIN_MONTAGE; n--) {
    if (opts.sectionStart + cwvVideoSeconds(opts.bpm, n) <= opts.usableEnd + 1e-6) return n;
  }
  return 0;
}

function cwvSnapSection(opts) {
  const latest = opts.usableEnd - opts.videoSeconds;
  if (latest < -1e-6) return null;
  if (!opts.gridAccepted) return Math.max(0, Math.min(Math.floor(latest * 10) / 10, Math.round(opts.value * 10) / 10));
  const bar = 4 * 60 / opts.bpm;
  const maxK = Math.floor((latest - opts.firstBeat) / bar + 1e-9);
  if (maxK < 0) return null;
  const k = Math.max(0, Math.min(maxK, Math.round((opts.value - opts.firstBeat) / bar)));
  return opts.firstBeat + k * bar;
}

function cwvDefaultSection(opts) {
  const beat = 60 / opts.bpm, span = Math.round(opts.videoSeconds / beat);
  let best = null;
  for (let k = 0; ; k++) {
    const start = opts.firstBeat + k * 4 * beat;
    if (start + opts.videoSeconds > opts.usableEnd + 1e-6) break;
    const slice = opts.beatEnergy.slice(k * 4, k * 4 + span);
    if (slice.length < span) break;
    const mean = slice.reduce((a, b) => a + b, 0) / span;
    if (!best || mean > best.mean + 1e-9) best = { start, mean };
  }
  return best ? best.start : null;
}

function cwvHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}

// Which candidate roles may fill a slot role, best first.
const CWV_ROLE_FALLBACK = {
  street: ['street', 'detail', 'architecture'],
  architecture: ['architecture', 'landmark', 'street'],
  landmark: ['landmark', 'architecture', 'park', 'wide'],
  wide: ['wide', 'park', 'landmark'],
  park: ['park', 'wide', 'detail'],
  detail: ['detail', 'street', 'architecture'],
};

function cwvAllocate(opts) {
  const gap = opts.gapSeconds == null ? 0.5 : opts.gapSeconds;
  const finite = v => typeof v === 'number' && isFinite(v);
  const candidates = opts.candidates.filter(c => c && finite(c.t) && finite(c.score) && finite(c.sourceDuration));
  const used = {}, avoid = {}, recent = [], picks = [];
  // Only a dominant talking hit becomes a ±1 s avoid window; avoidTalking: false disables avoidance entirely.
  if (opts.avoidTalking !== false) {
    candidates.filter(c => c.role === 'talking').forEach(c => {
      let rival = -Infinity;
      for (const o of candidates) if (o.role !== 'talking' && o.rid === c.rid && Math.abs(o.t - c.t) <= 1 && o.score > rival) rival = o.score;
      const dominant = rival === -Infinity ? c.score >= CWV_TALKING_MIN : c.score >= rival + CWV_TALKING_MARGIN - 1e-9;
      if (dominant) (avoid[c.rid] = avoid[c.rid] || []).push([c.t - 1, c.t + 1]);
    });
  }
  const pool = candidates.filter(c => c.role !== 'talking' && c.sourceDuration > 0);
  let missing = 0;
  // Best fitting candidate for a slot. With roles == null, any non-talking role is accepted (last resort).
  function search(slot, roles) {
    let best = null;
    for (const c of pool) {
      const rank = roles ? roles.indexOf(c.role) : 0;
      if (rank < 0 || c.sourceDuration < slot.seconds) continue;
      const start = Math.max(0, Math.min(c.sourceDuration - slot.seconds, c.t - slot.seconds / 2));
      const end = start + slot.seconds;
      if ((used[c.rid] || []).some(([a, b]) => start < b + gap && end > a - gap)) continue;
      if ((avoid[c.rid] || []).some(([a, b]) => start < b && end > a)) continue;
      const repeats = recent.filter(r => r === c.rid).length;
      const value = c.score - rank * 0.15 - repeats * 0.2 + cwvHash(opts.seed + ':' + c.rid + ':' + c.t.toFixed(2)) * 0.05;
      const better = !best || value > best.value + 1e-12 ||
        (Math.abs(value - best.value) <= 1e-12 && (c.rid < best.c.rid || (c.rid === best.c.rid && c.t < best.c.t)));
      if (better) best = { value, c, start, end };
    }
    return best;
  }
  for (const slot of opts.slots) {
    // Preferred roles always win; any other role is only used when none of them fits.
    const best = search(slot, CWV_ROLE_FALLBACK[slot.role] || [slot.role]) || search(slot, null);
    if (!best) { missing++; picks.push(null); continue; }
    (used[best.c.rid] = used[best.c.rid] || []).push([best.start, best.end]);
    recent.push(best.c.rid);
    if (recent.length > 3) recent.shift();
    picks.push({ slot: slot.index, rid: best.c.rid, startSeconds: best.start, endSeconds: best.end });
  }
  return { picks, filled: picks.filter(Boolean).length, missing };
}

// Tries the requested montage length first, then shrinks toward CWV_MIN_MONTAGE. Every attempt allocates from scratch.
// If no length fits while avoiding talking, the same range is tried once more without that avoidance (relaxedTalking).
function cwvPlanBuild(opts) {
  const top = Math.min(CWV_MAX_MONTAGE, Math.max(CWV_MIN_MONTAGE, opts.montageShots));
  let bestFilled = 0;
  for (const avoidTalking of [true, false]) {
    for (let n = top; n >= CWV_MIN_MONTAGE; n--) {
      const schedule = cwvSchedule({ bpm: opts.bpm, fps: opts.fps, montageShots: n });
      const slots = schedule.slots.map(s => ({ index: s.index, role: s.role, seconds: (s.endFrame - s.startFrame) / opts.fps }));
      const alloc = cwvAllocate({ candidates: opts.candidates, slots, seed: opts.seed, avoidTalking });
      if (alloc.missing === 0) {
        const plan = { ok: true, schedule, picks: alloc.picks, montageShots: n, usableShots: alloc.picks.length, needed: CWV_MIN_WINDOWS };
        if (!avoidTalking) plan.relaxedTalking = true;
        return plan;
      }
      // Report the better of the two shortest attempts: each fills fewer than CWV_MIN_WINDOWS slots, so usableShots < needed.
      if (n === CWV_MIN_MONTAGE) bestFilled = Math.max(bestFilled, alloc.filled);
    }
  }
  return { ok: false, usableShots: bestFilled, needed: CWV_MIN_WINDOWS };
}

// Build steps shown in the panel's progress bar, with each step's share of the bar in percent.
const CWV_BUILD_STEPS = [
  { id: 'shots', label: 'Choosing shots', weight: 40 },
  { id: 'music', label: 'Preparing music', weight: 10 },
  { id: 'draft', label: 'Creating Draft', weight: 25 },
  { id: 'look', label: 'Adding title and look', weight: 20 },
  { id: 'open', label: 'Opening Draft', weight: 5 },
];

// Progress for a step that is `fraction` done. Floors the percent so 100% only shows at the very end.
function cwvProgress(stepId, fraction, detail) {
  const i = CWV_BUILD_STEPS.findIndex(s => s.id === stepId);
  if (i < 0) throw new Error('unknown build step ' + stepId);
  const total = CWV_BUILD_STEPS.reduce((a, s) => a + s.weight, 0);
  const before = CWV_BUILD_STEPS.slice(0, i).reduce((a, s) => a + s.weight, 0);
  const f = Math.min(1, Math.max(0, Number(fraction) || 0));
  const value = (before + CWV_BUILD_STEPS[i].weight * f) / total;
  const percent = Math.floor(value * 100 + 1e-9);
  const step = CWV_BUILD_STEPS[i];
  return {
    value,
    percent,
    current: i,
    label: 'Step ' + (i + 1) + '/' + CWV_BUILD_STEPS.length + ' · ' + step.label + (detail ? ' (' + detail + ')' : '') + ' · ' + percent + '%',
  };
}
// cwv-planner:end

// Double quotes let $HOME and $SELECTS_USER_SKILLS_ROOT expand: use only for those constants.
function dq(value: string) { return '"' + String(value).replace(/(["\\`])/g, "\\$1") + '"'; }
// Single quotes pass user paths to the shell literally (no $, backtick or glob expansion).
function sq(value: string) { return "'" + String(value).replace(/'/g, "'\\''") + "'"; }
function service(name: string, method: string) {
  const s = (window.parent as any)?.__DI__?.[name];
  if (!s || typeof s[method] !== "function") throw new Error("This Selects build needs an updated " + name + " adapter.");
  return s;
}
async function readText(root: string, rel: string) {
  const v = await service("FileSystem", "readFile").readFile(root + "/" + rel);
  // Some host builds return text directly; others return bytes.
  return typeof v === "string" ? v : new TextDecoder().decode(new Uint8Array(v));
}
function fill(script: string, cfg: unknown) { return script.replace("__CONFIG__", () => JSON.stringify(cfg)); }
function suggestPlace(projectName: string) {
  const name = String(projectName || "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!/^[A-Za-z][A-Za-z .']{1,30}$/.test(name)) return "";
  if (/\b(project|untitled|test|draft|copy|export|final|edit|vlog)\b/i.test(name)) return "";
  return name;
}
function suggestDay(dates: (string | null)[]) {
  const counts: Record<number, number> = {};
  for (const d of dates) { if (!d) continue; const t = new Date(d); if (!isNaN(t.getTime())) counts[t.getDay()] = (counts[t.getDay()] || 0) + 1; }
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1] || Number(a[0]) - Number(b[0]))[0];
  return best ? WEEKDAYS[Number(best[0])] : "A day";
}
// Thrown when the Project changed while a build was running; its results are dropped silently.
const STALE = new Error("The Project changed during the build.");
const STATE_KEYS = ["A", "B", "C", "D"];
const FALLBACK_FONT = '"Snell Roundhand", "Brush Script MT", cursive';
function faceStyle(s: any) {
  return { fontFamily: '"' + s.family + '", ' + FALLBACK_FONT, fontStyle: s.style, fontWeight: s.weight, textTransform: s.case === "upper" ? "uppercase" : "none" } as any;
}
// Preview font size: shrink long lines so they stay inside the preview box.
function previewSize(text: string, base: number, scale: number) { return Math.min(base, (base * 11) / Math.max(11, text.length)) * (scale || 1); }
// Title preview line slots, sized for the largest state scale so the box never changes height while fonts cycle.
const PREVIEW_BIG = 34, PREVIEW_SMALL = 15, PREVIEW_MAX_SCALE_FLOOR = 1.15;

function fmtTime(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}
// Resolves a --panel-* colour for canvas drawing; falls back when the token is missing or not a colour.
function themeColor(el: Element, ctx: CanvasRenderingContext2D, name: string, fallback: string) {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  if (!v) return fallback;
  ctx.fillStyle = "#010203";
  ctx.fillStyle = v;
  return ctx.fillStyle === "#010203" ? fallback : v;
}
const WAVE_HEIGHT = 56;

// Music section slider: waveform on a canvas with a draggable, bar-snapped window over the chosen section.
// While `audio` plays, a playhead follows its currentTime inside the window, redrawn on every animation frame.
function SectionSlider({ peaks, total, section, videoSeconds, barSeconds, snap, onChange, disabled, audio }: {
  peaks: number[]; total: number; section: number | null; videoSeconds: number; barSeconds: number;
  snap: (v: number) => number | null; onChange: (v: number | null) => void; disabled: boolean; audio: HTMLAudioElement | null;
}) {
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const dragRef = React.useRef<{ offset: number } | null>(null);
  const [width, setWidth] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const [focused, setFocused] = React.useState(false);

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    setWidth(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Bundled peaks can exceed 1.0 slightly, so scale by the loudest bar when it does.
  const peakMax = Math.max(1, ...peaks);
  // The latest draw, so the animation loop always paints with the current props. `playAt` is seconds into the section.
  const drawRef = React.useRef<(playAt: number | null) => void>(() => {});
  drawRef.current = (playAt: number | null) => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap || width <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    const cw = Math.round(width * dpr), chh = Math.round(WAVE_HEIGHT * dpr);
    if (canvas.width !== cw) canvas.width = cw;
    if (canvas.height !== chh) canvas.height = chh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, WAVE_HEIGHT);
    const accent = themeColor(wrap, ctx, "--panel-accent", "#f6c343");
    const muted = themeColor(wrap, ctx, "--panel-muted-fg", "#8a8a8a");
    const mid = WAVE_HEIGHT / 2;
    const x0 = section == null ? -1 : (section / total) * width;
    const x1 = section == null ? -1 : Math.min(width, ((section + videoSeconds) / total) * width);
    const inside = (x: number) => x >= x0 && x <= x1;
    // Selected window: translucent fill under the bars.
    if (section != null) {
      ctx.globalAlpha = 0.18; ctx.fillStyle = accent;
      ctx.fillRect(x0, 0, Math.max(2, x1 - x0), WAVE_HEIGHT);
      ctx.globalAlpha = 1;
    }
    // Mirrored bars, one per ~2.5 CSS px; each bar is the loudest peak it covers.
    const pitch = 2.5, count = Math.max(1, Math.floor(width / pitch)), barW = Math.max(1, pitch * 0.6);
    for (let i = 0; i < count; i++) {
      const x = i * pitch + (pitch - barW) / 2;
      let p = 0;
      if (peaks.length) {
        const a = Math.floor((i / count) * peaks.length), b = Math.max(a + 1, Math.floor(((i + 1) / count) * peaks.length));
        for (let j = a; j < b && j < peaks.length; j++) p = Math.max(p, peaks[j] || 0);
      }
      const h = Math.max(1, (p / peakMax) * (mid - 3));
      const on = inside(x + barW / 2);
      ctx.globalAlpha = on ? 1 : 0.4; ctx.fillStyle = on ? accent : muted;
      ctx.fillRect(x, mid - h, barW, h * 2);
    }
    ctx.globalAlpha = 1;
    // Window border and two grip handles so it reads as draggable.
    if (section != null) {
      const w = Math.max(2, x1 - x0);
      ctx.strokeStyle = accent; ctx.lineWidth = 1.5;
      ctx.strokeRect(x0 + 0.75, 0.75, Math.max(0.5, w - 1.5), WAVE_HEIGHT - 1.5);
      ctx.fillStyle = accent;
      const gh = Math.min(18, WAVE_HEIGHT * 0.4), gw = 4;
      for (const gx of [x0 + 1, x0 + w - 1 - gw]) {
        ctx.beginPath();
        if ((ctx as any).roundRect) (ctx as any).roundRect(gx, mid - gh / 2, gw, gh, 2); else ctx.rect(gx, mid - gh / 2, gw, gh);
        ctx.fill();
      }
      // Playhead: a vertical line at the playing position, kept inside the window.
      if (playAt != null) {
        const px = Math.min(x0 + w - 1, Math.max(x0 + 1, ((section + Math.min(playAt, videoSeconds)) / total) * width));
        ctx.fillStyle = themeColor(wrap, ctx, "--panel-fg", "#ffffff");
        ctx.fillRect(px - 1, 0, 2, WAVE_HEIGHT);
      }
    }
  };
  React.useEffect(() => { if (!audio) drawRef.current(null); }, [width, peaks, peakMax, section, videoSeconds, total, audio]);
  // Playback drives the playhead with requestAnimationFrame; the loop ends when playback stops.
  React.useEffect(() => {
    if (!audio) return;
    let frame = 0;
    const step = () => { drawRef.current(audio.currentTime); frame = requestAnimationFrame(step); };
    frame = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(frame); drawRef.current(null); };
  }, [audio]);

  const timeAt = (clientX: number) => {
    const r = wrapRef.current!.getBoundingClientRect();
    return (Math.min(Math.max(0, clientX - r.left), r.width) / Math.max(1, r.width)) * total;
  };
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || e.button !== 0) return;
    const t = timeAt(e.clientX);
    const s = section ?? 0;
    // Grabbing the window keeps the grab point; anywhere else centres the window there.
    const offset = section != null && t >= s && t <= s + videoSeconds ? t - s : videoSeconds / 2;
    dragRef.current = { offset };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
    setDragging(true);
    onChange(snap(t - offset));
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    onChange(snap(timeAt(e.clientX) - dragRef.current.offset));
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    if (e.type === "pointerup") onChange(snap(timeAt(e.clientX) - dragRef.current.offset));
    dragRef.current = null; setDragging(false);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* already released */ }
  };
  const first = snap(0), last = snap(total);
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled || section == null) return;
    let next: number | null | undefined;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = snap(section - barSeconds);
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") next = snap(section + barSeconds);
    else if (e.key === "Home") next = first;
    else if (e.key === "End") next = last;
    else return;
    e.preventDefault();
    onChange(next);
  };

  return (
    <div>
      <small style={{ display: "block", marginBottom: 4 }}>{"Music section — drag to choose"}</small>
      <div ref={wrapRef} role="slider" tabIndex={disabled ? -1 : 0} aria-label="Music section"
        aria-valuemin={Number((first ?? 0).toFixed(1))} aria-valuemax={Number((last ?? 0).toFixed(1))} aria-valuenow={Number((section ?? 0).toFixed(1))}
        aria-valuetext={section == null ? "This music is too short for this length" : "Starts at " + section.toFixed(1) + " s"} aria-disabled={disabled || undefined}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag} onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ position: "relative", width: "100%", minWidth: 0, height: WAVE_HEIGHT, touchAction: "none", userSelect: "none", outline: "none",
          cursor: disabled ? "default" : dragging ? "grabbing" : "grab", borderRadius: "var(--panel-radius, 6px)",
          boxShadow: focused ? "0 0 0 2px var(--panel-accent, #f6c343)" : "inset 0 0 0 1px var(--panel-border, rgba(128, 128, 128, 0.35))", opacity: disabled ? 0.6 : 1 }}>
        <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: WAVE_HEIGHT, pointerEvents: "none" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--panel-muted-fg)", fontVariantNumeric: "tabular-nums", marginTop: 2 }}>
        <span>0:00</span><span>{fmtTime(total)}</span>
      </div>
    </div>
  );
}

export default function Panel({ sdk, context, ui }: any) {
  const projectId = context?.projectId ?? null;
  const projectRef = React.useRef(projectId);
  projectRef.current = projectId;
  const [roots, setRoots] = React.useState<{ plugin: string; data: string } | null>(null);
  const [assets, setAssets] = React.useState<any>(null);
  const [inventory, setInventory] = React.useState<any>(null);
  const [candidates, setCandidates] = React.useState<any>(null);
  const [line1, setLine1] = React.useState("");
  const [connector, setConnector] = React.useState("in");
  const [place, setPlace] = React.useState("");
  const [cueId, setCueId] = React.useState("sunny-soul-strut");
  const [ownMusic, setOwnMusic] = React.useState<{ path: string; name: string } | null>(null);
  const [ownGrid, setOwnGrid] = React.useState<any>(null);
  const [preset, setPreset] = React.useState("classic");
  const [length, setLength] = React.useState<"short" | "standard" | "long">("standard");
  const [keepSound, setKeepSound] = React.useState(false);
  const [warm, setWarm] = React.useState(true);
  const [only, setOnly] = React.useState<string[] | null>(null);
  const [section, setSection] = React.useState<number | null>(0);
  const [seed, setSeed] = React.useState(1);
  const [busy, setBusy] = React.useState(false);
  // Single-flight guard: state updates are async, so a ref blocks a second click in the same tick.
  const busyRef = React.useRef(false);
  const [step, setStep] = React.useState("");
  const [tools, setTools] = React.useState({ ffmpeg: true, node: true });
  const [tick, setTick] = React.useState(0);
  const fontCache = React.useRef<Record<string, Promise<string>>>({});
  const registered = React.useRef<Set<string>>(new Set());
  // Build progress (bar + step list). `step` stays for the one-call spinner (own-music beat detection).
  const [progress, setProgress] = React.useState<any>(null);
  const progressRef = React.useRef<any>(null);
  const advance = (id: string, fraction: number, detail?: string) => { const p = cwvProgress(id, fraction, detail); progressRef.current = p; setProgress(p); };
  const [status, setStatus] = React.useState<{ tone: string; text: string } | null>(null);
  const [result, setResult] = React.useState<any>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const previewTokenRef = React.useRef(0);
  const previewUrlRef = React.useRef<string | null>(null);
  const [playState, setPlayState] = React.useState<"idle" | "loading" | "playing">("idle");
  const [playingAudio, setPlayingAudio] = React.useState<HTMLAudioElement | null>(null);

  const run = async (summary: string, script: string, allowCommit = false) => {
    let r = await sdk.runScript({ summary, script, allowCommit });
    // Only a lost session is resent, and never a committing call: its commit may already have landed.
    if (r.isError && !allowCommit && /No valid session ID/.test(r.output || "")) { await new Promise((d) => setTimeout(d, 1500)); r = await sdk.runScript({ summary, script, allowCommit }); }
    if (r.isError || r.result == null) throw new Error(r.output || "Selects could not complete this step.");
    return r.result as any;
  };
  const fontB64 = (plugin: string, file: string) => {
    if (!fontCache.current[file]) {
      fontCache.current[file] = readText(plugin, "assets/fonts/" + file)
        .then((t) => t.replace(/\s+/g, ""))
        .catch((e) => { delete fontCache.current[file]; throw e; });
    }
    return fontCache.current[file];
  };
  // Registers a preset state's bundled font in this panel's document for the preview and tiles.
  async function registerFace(plugin: string, s: any) {
    const key = s.family + "|" + s.style + "|" + s.weight;
    if (registered.current.has(key) || typeof FontFace === "undefined") return;
    const face = new FontFace(s.family, "url(data:font/woff2;base64," + (await fontB64(plugin, s.file)) + ")", { style: s.style, weight: String(s.weight) });
    await face.load();
    (document as any).fonts.add(face);
    registered.current.add(key);
  }
  const stopAt = (e: any) => {
    const at = progressRef.current;
    const where = at ? "Stopped at step " + (at.current + 1) + "/" + CWV_BUILD_STEPS.length + ", " + CWV_BUILD_STEPS[at.current].label + ": " : "";
    return where + String(e?.message || e);
  };
  const endRun = (pid: string) => {
    if (projectRef.current !== pid) return;
    busyRef.current = false; setBusy(false); setStep(""); setProgress(null); progressRef.current = null;
  };

  // Inventory bookkeeping: the inventory script, the last clip set seen, the title values we suggested, and a load in flight.
  const inventoryJsRef = React.useRef<string | null>(null);
  const invSigRef = React.useRef<string | null>(null);
  const autoRef = React.useRef<{ pid: string | null; line1: string; place: string }>({ pid: null, line1: "", place: "" });
  const invLoadingRef = React.useRef<string | null>(null);
  const mountedRef = React.useRef(true);
  const [invError, setInvError] = React.useState<string | null>(null);
  const [invLoading, setInvLoading] = React.useState(false);

  // Reads the Project's footage inventory. Never writes state for a stale Project, and never runs during a build.
  async function loadInventory(pid: string | null = projectRef.current, alive: () => boolean = () => true) {
    const script = inventoryJsRef.current;
    // One read per Project at a time; a read for another Project never blocks this one.
    if (!pid || !script || busyRef.current || invLoadingRef.current === pid) return;
    const live = () => mountedRef.current && alive() && projectRef.current === pid;
    invLoadingRef.current = pid; setInvLoading(true);
    try {
      const inv = await run("Read footage", fill(script, { projectId: pid, only: null }));
      // A build that started meanwhile keeps the clip set it began with; the next refresh picks this up.
      if (!live() || busyRef.current) return;
      const sig = inv.resources.map((r: any) => r.rid).sort().join(",") + "|" + (inv.skipped?.unanalysed || 0);
      // A changed clip set drops the cached scene search so a build never uses stale candidates.
      if (invSigRef.current !== sig) { if (invSigRef.current !== null) setCandidates(null); invSigRef.current = sig; }
      setInventory(inv); setInvError(null);
      // Prefill the title on the first load for this Project; later only replace values the user has not edited.
      const day = suggestDay(inv.resources.map((r: any) => r.recordedAt));
      const auto = autoRef.current;
      if (auto.pid !== pid) {
        const where = suggestPlace(context?.projectName);
        autoRef.current = { pid, line1: day, place: where };
        setLine1(day); setPlace(where);
      } else if (auto.line1 !== day) {
        const prev = auto.line1;
        autoRef.current = { ...auto, line1: day };
        setLine1((cur) => (cur === prev ? day : cur));
      }
    } catch (e: any) {
      if (live()) setInvError(String(e?.message || e));
    } finally {
      if (invLoadingRef.current === pid) invLoadingRef.current = null;
      if (mountedRef.current && projectRef.current === pid) setInvLoading(false);
    }
  }
  React.useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // Mount and Project switch: reset per-Project state, resolve folders, read bundled assets, inventory the Project.
  React.useEffect(() => {
    // Drop everything tied to the previous Project so a build never mixes Projects.
    setCandidates(null); setResult(null); setStatus(null); setInventory(null); setInvError(null); setInvLoading(false);
    invSigRef.current = null;
    busyRef.current = false; setBusy(false); setStep(""); setProgress(null); progressRef.current = null;
    if (!projectId) return;
    let alive = true;
    (async () => {
      try {
        const where = await sdk.runShell({ summary: "Locate plugin folders", command: "mkdir -p " + dq(DATA_DIR) + " && printf '%s\\n%s' " + dq(SKILLS_DIR) + " " + dq(DATA_DIR), timeoutMs: 10000 });
        const [plugin, data] = String(where?.stdout || "").split("\n").map((x) => x.trim());
        if (!plugin || !data) throw new Error("the plugin folders could not be found");
        if (!alive) return;
        setRoots({ plugin, data });
        // ffmpeg and node are only needed for previews and own music; bundled cues work without them.
        let have = "";
        try {
          const probe = await sdk.runShell({ summary: "Check music tools", command: "command -v ffmpeg >/dev/null && echo ffmpeg; command -v node >/dev/null && echo node", timeoutMs: 10000 });
          have = String(probe?.stdout || "");
        } catch { have = ""; }
        if (!alive) return;
        setTools({ ffmpeg: have.includes("ffmpeg"), node: have.includes("node") });
        const read = (rel: string) => readText(plugin, rel);
        const [manifest, presets, inventoryJs, searchJs, ensureJs, assembleJs, decorateJs, titleTsx, warmTsx] = await Promise.all([
          read("assets/cues/manifest.json"), read("assets/fonts/presets.json"), read("scripts/inventory.js"), read("scripts/search.js"),
          read("scripts/ensure-audio.js"), read("scripts/assemble.js"), read("scripts/decorate.js"), read("assets/title-graphic.tsx"), read("assets/warm-look.tsx")]);
        if (!alive) return;
        setAssets({ manifest: JSON.parse(manifest), presets: JSON.parse(presets), scripts: { inventoryJs, searchJs, ensureJs, assembleJs, decorateJs }, titleTsx, warmTsx });
        inventoryJsRef.current = inventoryJs;
        setStep("Checking clips");
        await loadInventory(projectId, () => alive);
      } catch (e: any) {
        if (alive) setStatus({ tone: "error", text: "City Weekend Vlog could not start: " + (e?.message || e) + ". Reinstall the plugin if this persists." });
      } finally { if (alive) setStep(""); }
    })();
    // Project switch or unmount stops a preview, including one still being prepared.
    return () => { alive = false; stopPreview(); };
  }, [projectId]);

  // Clips still being analysed (or none yet): re-read the inventory every 10 s until they are ready.
  // The effect re-arms on each new inventory, and stops on unmount, Project switch and while busy.
  const needsPoll = !!inventory && (inventory.skipped?.unanalysed > 0 || inventory.resources.length === 0);
  React.useEffect(() => {
    if (!projectId || !needsPoll || busy) return;
    const pid = projectId;
    const t = setInterval(() => { loadInventory(pid); }, 10000);
    return () => clearInterval(t);
  }, [projectId, needsPoll, busy]);
  // Coming back to the panel (tab shown or window focused) re-reads the inventory.
  React.useEffect(() => {
    if (!projectId) return;
    const pid = projectId;
    const onVisible = () => { if (document.visibilityState === "visible") loadInventory(pid); };
    const onFocus = () => { loadInventory(pid); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => { document.removeEventListener("visibilitychange", onVisible); window.removeEventListener("focus", onFocus); };
  }, [projectId]);

  // Fonts for the tiles (every preset's state A) and the live preview (all states of the chosen preset).
  React.useEffect(() => {
    if (!assets || !roots) return;
    const chosen = assets.presets.presets.find((x: any) => x.id === preset);
    const wanted = [...assets.presets.presets.map((x: any) => x.states.A), ...(chosen ? STATE_KEYS.map((k) => chosen.states[k]) : [])];
    // A font that fails to load only makes the preview fall back; the build reads the files again.
    wanted.forEach((s: any) => { registerFace(roots.plugin, s).catch(() => null); });
  }, [assets, roots, preset]);
  React.useEffect(() => { const t = setInterval(() => setTick((n) => n + 1), 600); return () => clearInterval(t); }, []);

  const cue = assets?.manifest.cues.find((c: any) => c.id === cueId) || null;
  const ownDuration = ownGrid && ownGrid.durationSeconds > 0 ? ownGrid.durationSeconds : null;
  const grid = ownMusic ? (ownGrid && ownGrid.accepted ? { bpm: ownGrid.bpm, firstBeat: ownGrid.firstBeat, usableEnd: ownGrid.durationSeconds - 0.5, beatEnergy: ownGrid.beatEnergy, peaks: ownGrid.peaks, accepted: true }
    : { bpm: CWV_REFERENCE_BPM, firstBeat: 0, usableEnd: ownDuration ? ownDuration - 0.5 : 0, beatEnergy: [], peaks: ownGrid?.peaks || [], accepted: false })
    : cue ? { bpm: cue.bpm, firstBeat: cue.firstBeat, usableEnd: cue.usableEnd, beatEnergy: cue.beatEnergy, peaks: cue.peaks, accepted: true }
    : { bpm: CWV_REFERENCE_BPM, firstBeat: 0, usableEnd: 600, beatEnergy: [], peaks: [], accepted: false };
  const requested = CWV_LENGTHS[length];
  const videoSeconds = cwvVideoSeconds(grid.bpm, requested);
  const snap = (value: number) => cwvSnapSection({ value, firstBeat: grid.firstBeat, bpm: grid.bpm, usableEnd: grid.usableEnd, videoSeconds, gridAccepted: grid.accepted });

  // A new track (or its grid) defaults the section to the most energetic window.
  // `assets` is a dependency so the default also applies once the manifest has loaded.
  React.useEffect(() => {
    if (!grid.accepted) { setSection(snap(0)); return; }
    setSection(cwvDefaultSection({ firstBeat: grid.firstBeat, bpm: grid.bpm, beatEnergy: grid.beatEnergy, usableEnd: grid.usableEnd, videoSeconds }) ?? grid.firstBeat);
  }, [assets, cueId, ownMusic?.path, ownGrid]);
  // A new length keeps the chosen start and only re-clamps it (spec section 5).
  React.useEffect(() => { setSection((s) => snap(s ?? 0)); }, [length]);
  // A new track, section or length makes a running preview stale, so it stops.
  React.useEffect(() => { stopPreview(); }, [cueId, ownMusic?.path, section, length]);

  async function detectOwnMusic(file: { path: string; name: string }) {
    if (busyRef.current || !roots) return;
    busyRef.current = true;
    setOwnMusic(file); setOwnGrid(null); setBusy(true); setStep("Listening for the beat");
    try {
      const pcm = roots.data + "/own-music.f32";
      const cmd = "ffmpeg -nostdin -v error -y -t 360 -i " + sq(file.path) + " -ac 1 -ar 22050 -f f32le " + sq(pcm) + " && node " + sq(roots.plugin + "/beat-detect.cjs") + " " + sq(pcm) + " 22050";
      const r = await sdk.runShell({ summary: "Find the beat of " + file.name, command: cmd, timeoutMs: 120000, maxOutputBytes: 48000 });
      const g = JSON.parse(String(r.stdout || "").trim().split("\n").pop() || "{}");
      if (r.isError || r.exitCode !== 0 || g.error) throw new Error(g.error || r.stderr || "beat detection failed");
      setOwnGrid(g);
      setStatus(g.accepted ? null : { tone: "info", text: "Music added; cuts use the original rhythm because its beat could not be found reliably." });
    } catch (e: any) {
      // Without a grid the cuts use fixed timing, but the track's real length still bounds the section.
      let duration: number | null = null;
      try {
        const pr = await sdk.runShell({ summary: "Read the length of " + file.name, command: "ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 " + sq(file.path), timeoutMs: 20000 });
        const v = parseFloat(String(pr?.stdout || "").trim());
        if (!pr?.isError && v > 0) duration = Math.min(v, 360);
      } catch { duration = null; }
      setOwnGrid({ accepted: false, durationSeconds: duration, peaks: [] });
      setStatus(duration
        ? { tone: "info", text: "Music added; cuts use the original rhythm (" + (e?.message || e) + ")." }
        : { tone: "error", text: "Could not read this music file (" + (e?.message || e) + "). Choose another file or one of the tracks." });
    } finally { busyRef.current = false; setBusy(false); setStep(""); }
  }

  // Section preview: "idle" -> "loading" (ffmpeg cut) -> "playing". Every start or stop bumps the token, so a late
  // result from a cancelled preparation is dropped.
  function stopPreview() {
    previewTokenRef.current++;
    const a = audioRef.current;
    audioRef.current = null;
    if (a) { a.onended = null; a.pause(); }
    if (previewUrlRef.current) { try { URL.revokeObjectURL(previewUrlRef.current); } catch { /* data URL */ } previewUrlRef.current = null; }
    if (mountedRef.current) { setPlayState("idle"); setPlayingAudio(null); }
  }

  async function preview() {
    if (playState !== "idle") { stopPreview(); return; }
    if ((!ownMusic && !cue) || !roots || section == null) return;
    stopPreview();
    const token = previewTokenRef.current;
    const live = () => previewTokenRef.current === token && mountedRef.current;
    setPlayState("loading");
    try {
      const file = ownMusic ? ownMusic.path : roots.plugin + "/assets/cues/" + cue.file;
      // The whole section, written to a file (stdout is too small for ~23 s) and read back as base64 text.
      // Earlier previews are removed first so the data folder never collects them.
      const dur = videoSeconds, base = roots.data + "/preview-" + token;
      const cmd = "rm -f " + sq(roots.data) + "/preview-*.mp3 " + sq(roots.data) + "/preview-*.b64; "
        + "ffmpeg -nostdin -v error -y -ss " + section.toFixed(2) + " -t " + dur.toFixed(2) + " -i " + sq(file)
        + " -ac 1 -ar 22050 -b:a 48k -af \"afade=t=out:st=" + Math.max(0, dur - 0.4).toFixed(2) + ":d=0.4\" -f mp3 " + sq(base + ".mp3")
        + " && base64 < " + sq(base + ".mp3") + " > " + sq(base + ".b64");
      const r = await sdk.runShell({ summary: "Preview music section", command: cmd, timeoutMs: 60000 });
      if (!live()) return;
      if (r?.isError || (r?.exitCode != null && r.exitCode !== 0)) throw new Error(r?.stderr || "the preview could not be cut");
      const b64 = (await readText(roots.data, "preview-" + token + ".b64")).replace(/\s+/g, "");
      if (!live()) return;
      if (b64.length < 200) throw new Error("no audio came back");
      let url: string;
      if (typeof Blob !== "undefined" && typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
        const bin = atob(b64), bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        url = URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" }));
        previewUrlRef.current = url;
      } else url = "data:audio/mpeg;base64," + b64;
      const audio = new Audio(url);
      audio.onended = () => { if (audioRef.current === audio) stopPreview(); };
      audioRef.current = audio;
      await audio.play();
      if (!live() || audioRef.current !== audio) { audio.pause(); return; }
      setPlayState("playing"); setPlayingAudio(audio);
    } catch (e: any) {
      if (!live()) return;
      stopPreview();
      setStatus({ tone: "error", text: "Could not play a preview: " + (e?.message || e) + "." });
    }
  }

  async function findCandidates(rids: string[], pid: string, check: () => void) {
    const list: any[] = []; const failed: string[] = [];
    // Four clips per call keeps each scene search under runScript's fixed 30 s deadline.
    for (let i = 0; i < rids.length; i += 4) {
      advance("shots", i / rids.length, i + "/" + rids.length + " clips checked");
      const r = await run("Search city shots", fill(assets.scripts.searchJs, { projectId: pid, rids: rids.slice(i, i + 4), queries: CWV_QUERIES, pageSize: 4 }));
      check();
      list.push(...r.candidates); failed.push(...r.failed);
    }
    return { list, failed };
  }

  async function build(nextSeed: number) {
    if (busyRef.current || !assets || !inventory || !roots) return;
    if (cueId === "own" && !ownMusic) { setStatus({ tone: "error", text: "Drop a music file, or choose one of the tracks." }); return; }
    if (ownMusic && !ownDuration) { setStatus({ tone: "error", text: "The length of your music could not be read. Choose another file or one of the tracks." }); return; }
    const pid = projectId;
    const check = () => { if (projectRef.current !== pid) throw STALE; };
    busyRef.current = true;
    stopPreview();
    setBusy(true); setStatus(null); setResult(null);
    advance("shots", 0);
    try {
      const key = pid + "|" + JSON.stringify(only);
      const rids: string[] = inventory.resources.filter((r: any) => !only || only.includes(r.rid)).map((r: any) => r.rid);
      const dur: Record<string, number> = Object.fromEntries(inventory.resources.map((r: any) => [r.rid, r.duration]));
      const cached = candidates && candidates.key === key ? candidates : null;
      let found = cached;
      if (!cached || cached.failed.length) {
        // Search everything the first time; afterwards retry only the clips whose search failed.
        const todo: string[] = cached ? cached.failed : rids;
        const fresh = await findCandidates(todo, pid, check);
        const retried = new Set(todo);
        found = { key, failed: fresh.failed,
          list: [...(cached ? cached.list.filter((c: any) => !retried.has(c.rid)) : []), ...fresh.list.map((c: any) => ({ ...c, sourceDuration: dur[c.rid] || 0 }))] };
        setCandidates(found);
      }
      advance("shots", 1);
      const start = grid.accepted ? snap(section || 0) : (section || 0);
      const fitted = cwvFitMontage({ bpm: grid.bpm, sectionStart: start ?? 0, usableEnd: grid.usableEnd, requested });
      if (!fitted) throw new Error("This music section is too short for the video. Move the section earlier or pick a shorter length.");
      // Plan at 30 fps for allocation; assembly re-snaps every boundary at the Draft's real rate.
      const plan = cwvPlanBuild({ candidates: found.list, bpm: grid.bpm, fps: 30, montageShots: fitted, seed: String(nextSeed) });
      if (!plan.ok) {
        const retry = found.failed.length ? " Could not check " + found.failed.length + " clips; press Build to retry them." : "";
        throw new Error("Found " + plan.usableShots + " usable shots; this style needs at least " + plan.needed + ". Add more varied footage or select more clips." + retry);
      }
      advance("music", 0);
      const music = cueId === "none" ? null
        : await run("Add music to the project", fill(assets.scripts.ensureJs, { projectId: pid, path: ownMusic ? ownMusic.path : roots.plugin + "/assets/cues/" + cue.file }), true);
      check();
      const beat = 60 / grid.bpm;
      const beatsAt = [0]; plan.schedule.slots.forEach((_s: any, i: number) => beatsAt.push(beatsAt[i] + (i < 13 ? CWV_TITLE_BEATS[i] : 2)));
      advance("music", 1);
      advance("draft", 0);
      const crops = Object.fromEntries(inventory.resources.map((r: any) => [r.rid, { width: r.width, height: r.height }]));
      const name = "City Weekend Vlog " + new Date().toISOString().slice(0, 16).replace("T", " ");
      const a = await run("Assemble City Weekend Vlog", fill(assets.scripts.assembleJs, {
        projectId: pid, draftName: name, picks: plan.picks, boundaries: beatsAt.map((b) => b * beat), crops, mute: !keepSound,
        music: music ? { resourceId: music.resourceId, sectionStart: start ?? 0 } : null }), true);
      check();
      if (!a.sequenceId) throw new Error("The Draft \"" + name + "\" was saved, but Selects did not report its id, so the title and look could not be added. Open it from the Drafts list, or build again.");
      const sched = cwvSchedule({ bpm: grid.bpm, fps: a.fps, montageShots: plan.montageShots });
      advance("draft", 1);
      setResult({ sequenceId: a.sequenceId, decorated: false, sched, plan, seed: nextSeed, notes: a.notes || [], link: null });
      await decorate(a.sequenceId, sched, plan, nextSeed, check);
    } catch (e: any) {
      if (e !== STALE && projectRef.current === pid) setStatus({ tone: "error", text: stopAt(e) });
    } finally { endRun(pid); }
  }

  async function finishTitle() {
    if (busyRef.current || !result || !assets || !roots) return;
    const pid = projectId;
    const check = () => { if (projectRef.current !== pid) throw STALE; };
    busyRef.current = true; stopPreview(); setBusy(true); setStatus(null);
    try { await decorate(result.sequenceId, result.sched, result.plan, result.seed, check); }
    catch (e: any) { if (e !== STALE && projectRef.current === pid) setStatus({ tone: "error", text: stopAt(e) }); }
    finally { endRun(pid); }
  }

  // Commit 2 (title and warm look), then open the Draft. decorate.js skips what an earlier attempt already added.
  async function decorate(sequenceId: string, sched: any, plan: any, usedSeed: number, check: () => void) {
    advance("look", 0);
    try {
      const p = assets.presets.presets.find((x: any) => x.id === preset);
      const files = [...new Set(STATE_KEYS.map((k) => p.states[k].file))];
      const fonts = await Promise.all(files.map(async (f) => {
        const s = Object.values(p.states).find((x: any) => x.file === f) as any;
        return { family: s.family, style: s.style, weight: s.weight, b64: await fontB64(roots!.plugin, f) };
      }));
      const parameters = { line1, connector, place, fontFamily: "", ink: "#F6ECB8", shadow: p.shadow, size: 150, rotation: -7, position: 46,
        events: sched.title, states: p.states, fonts, provenance: { plugin: PLUGIN_ID, version: "0.1.0-alpha.1", preset, cue: ownMusic ? "own" : cueId, seed: usedSeed, picks: plan.picks } };
      const editableParameters = [
        { key: "line1", label: "First line", type: "text", defaultValue: line1 },
        { key: "connector", label: "Connector", type: "text", defaultValue: connector },
        { key: "place", label: "Place", type: "text", defaultValue: place },
        { key: "fontFamily", label: "Main font (optional)", type: "text", defaultValue: "" },
        { key: "ink", label: "Title color", type: "color", defaultValue: "#F6ECB8" },
        { key: "shadow", label: "Shadow", type: "number", defaultValue: p.shadow, min: 0, max: 1, step: 0.05 },
        { key: "size", label: "Size", type: "number", defaultValue: 150, min: 60, max: 240, step: 2 },
        { key: "rotation", label: "Tilt", type: "number", defaultValue: -7, min: -20, max: 20, step: 1 },
        { key: "position", label: "Height (%)", type: "number", defaultValue: 46, min: 20, max: 80, step: 1 },
      ];
      await run("Add title and look", fill(assets.scripts.decorateJs, { sequenceId, titleEnd: sched.title.endFrame, title: { tsx: assets.titleTsx, parameters, editableParameters }, warm: warm ? { tsx: assets.warmTsx, strength: 0.35 } : null }), true);
    } catch (e: any) {
      if (e === STALE) throw e;
      throw new Error("The Draft was created, but its title and look were not added: " + (e?.message || e) + ". Press Finish title and look to try again.");
    }
    check();
    // The title is saved from here on, so a failed open must not offer the retry.
    setResult((r: any) => ({ ...r, decorated: true }));
    advance("open", 0);
    try {
      const o = await run("Open the new Draft", "const id = " + JSON.stringify(sequenceId) + ";\n"
        + "let link = null, openError = null;\n"
        + "try { link = (await selects.editor.linkToDraftFrame(id, 0)).deepLinkUrl; } catch (e) { link = null; }\n"
        + "try { await selects.editor.openDraft(id); } catch (e) { openError = String((e && e.message) || e); }\n"
        + "return { link, openError };");
      check();
      setResult((r: any) => ({ ...r, link: o.link || null }));
      if (o.openError) throw new Error(o.openError);
      advance("open", 1);
    } catch (e: any) {
      if (e === STALE) throw e;
      setStatus({ tone: "error", text: "The Draft is ready, but it could not be opened: " + (e?.message || e) + ". Use the link below or open it from the Drafts list." });
    }
  }

  const pending = inventory?.skipped?.unanalysed || 0;
  const readiness = !inventory ? (invError ? "Could not read the clips in this Project: " + invError : "Checking clips…")
    : inventory.resources.length === 0 ? (pending > 0
      ? pending + " clips are still being analysed. This updates automatically when they finish."
      : "No analysed video in this Project yet. Add and analyse video clips; this updates automatically.")
    : "Ready: " + inventory.resources.length + " analysed clips · about " + Math.round(videoSeconds) + " s" + (inventory.skipped.unanalysed ? " · " + inventory.skipped.unanalysed + " clips not analysed yet" : "");
  const peaks: number[] = grid.peaks || [];
  const total = ownMusic ? (ownDuration || 1) : (cue ? cue.duration : 1);
  const silent = cueId === "none" && !ownMusic && !keepSound;
  const canOwnMusic = tools.ffmpeg && tools.node;
  const presetList: any[] = assets?.presets.presets || [];
  const chosen = presetList.find((x) => x.id === preset) || null;
  const swapKey = STATE_KEYS[tick % STATE_KEYS.length];
  const placeText = place.trim();
  // Fixed preview geometry: the largest state scale across all presets (never below PREVIEW_MAX_SCALE_FLOOR).
  const maxScale = presetList.reduce((m, p) => Math.max(m, ...STATE_KEYS.map((k) => Number(p.states?.[k]?.scale) || 1)), PREVIEW_MAX_SCALE_FLOOR);
  const bigSlot = Math.ceil(PREVIEW_BIG * maxScale * 1.3), smallSlot = Math.ceil(PREVIEW_SMALL * maxScale * 1.3);
  // Three slots plus gaps, and room for the -7 degree tilt.
  const previewBox = bigSlot * 2 + smallSlot + 4 + 40;
  const slotStyle = (h: number) => ({ height: h, maxWidth: "100%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "visible" }) as any;

  if (!projectId) return <ui.Message tone="error">Open a Project to build a City Weekend Vlog.</ui.Message>;

  return (
    <ui.Stack gap={16}>
      <ui.Row gap={8} align="center">
        <ui.Message tone={!inventory && invError ? "error" : "muted"}>{readiness}</ui.Message>
        <ui.Button variant="ghost" busy={invLoading} busyLabel="Refreshing" disabled={busy || !assets} onClick={() => loadInventory()}>Refresh</ui.Button>
      </ui.Row>
      {inventory && invError ? <ui.Message tone="error">{"Could not refresh the clip list: " + invError}</ui.Message> : null}
      <ui.Section title="Title">
        <ui.TextField label="First line" value={line1} onChange={setLine1} />
        <ui.TextField label="Connector" value={connector} onChange={setConnector} />
        <ui.TextField label="Place" value={place} onChange={setPlace} />
        {chosen ? (
          // Live preview: the swapping line (place, or line 1 when place is empty) cycles the preset's A/B/C/D states.
          // Every line sits in a fixed-height slot sized for the largest scale of any preset, so the box keeps one height
          // while the fonts cycle and when the preset changes; long text shrinks via previewSize and never wraps.
          <div aria-label="Title preview" style={{ background: "#26231f", borderRadius: 8, height: previewBox, boxSizing: "border-box", padding: "0 12px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ transform: "rotate(-7deg)", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, width: "100%", minWidth: 0, color: "#F6ECB8", lineHeight: 1, textAlign: "center", whiteSpace: "nowrap", textShadow: "0 2px 8px rgba(0,0,0," + chosen.shadow + ")" }}>
              <div style={{ ...slotStyle(bigSlot), ...faceStyle(chosen.states[placeText ? "A" : swapKey]), fontSize: previewSize(line1, PREVIEW_BIG, chosen.states[placeText ? "A" : swapKey].scale) }}>{line1 || "\u00a0"}</div>
              {placeText ? <div style={{ ...slotStyle(smallSlot), ...faceStyle(chosen.states.A), fontSize: PREVIEW_SMALL * chosen.states.A.scale }}>{connector}</div> : null}
              {placeText ? <div style={{ ...slotStyle(bigSlot), ...faceStyle(chosen.states[swapKey]), fontSize: previewSize(placeText, PREVIEW_BIG, chosen.states[swapKey].scale) }}>{placeText}</div> : null}
            </div>
          </div>
        ) : null}
      </ui.Section>
      <ui.Section title="Font style">
        <div role="group" aria-label="Font style" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {presetList.map((p) => {
            const on = p.id === preset;
            return (
              <button key={p.id} type="button" aria-pressed={on} disabled={busy} onClick={() => setPreset(p.id)}
                style={{ flex: "1 1 96px", minWidth: 0, minHeight: 52, padding: "8px 6px", borderRadius: 8, cursor: busy ? "default" : "pointer", color: "inherit",
                  background: on ? "color-mix(in srgb, var(--panel-accent, #f6c343) 16%, transparent)" : "transparent", border: on ? "2px solid var(--panel-accent, #f6c343)" : "1px solid var(--panel-border, rgba(128, 128, 128, 0.45))",
                  ...faceStyle(p.states.A), textTransform: "none", fontSize: 20 * (p.states.A.scale || 1), lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.label}
              </button>
            );
          })}
        </div>
      </ui.Section>
      <ui.Section title="Music">
        <ui.Select label="Track" value={ownMusic ? "own" : cueId} onChange={(v: string) => { setCueId(v); if (v !== "own") { setOwnMusic(null); setOwnGrid(null); } }}
          options={[...(assets?.manifest.cues || []).map((c: any) => ({ label: c.label, value: c.id })), ...(canOwnMusic ? [{ label: "Your own music", value: "own" }] : []), { label: "No music", value: "none" }]} />
        {(ownMusic || cueId === "own") && canOwnMusic ? <ui.FileDrop accept={["audio"]} value={ownMusic} disabled={busy}
          onChange={(f: any) => { if (f) detectOwnMusic(f); else { setOwnMusic(null); setOwnGrid(null); } }} /> : null}
        {!canOwnMusic ? <ui.Message tone="muted">Install ffmpeg and Node.js 18+ to preview music or use your own track.</ui.Message> : null}
        {ownMusic || cue ? (
          // Esc on the slider or the preview button (the key bubbles up here) stops the preview.
          <div onKeyDown={(e) => { if (e.key === "Escape" && playState !== "idle") { e.preventDefault(); stopPreview(); } }}>
            <SectionSlider peaks={peaks} total={total} section={section} videoSeconds={videoSeconds} barSeconds={(4 * 60) / grid.bpm}
              snap={snap} onChange={setSection} disabled={busy} audio={playingAudio} />
            <ui.Row gap={8} align="center">
              {/* The kit has no stop icon; "pause" marks stop, and the label says what it does. */}
              <ui.IconButton icon={playState === "playing" ? "pause" : playState === "loading" ? "loading" : "play"}
                label={playState === "playing" ? "Stop preview" : playState === "loading" ? "Cancel preview" : "Preview this section"}
                onClick={preview} disabled={busy || !tools.ffmpeg || (playState === "idle" && section == null)} />
              <span>{ownMusic && !ownDuration ? (busy ? "Reading the music…" : "The length of this music is unknown")
                : section == null ? "This music is too short for this length" : "Starts at " + section.toFixed(1) + " s"}</span>
            </ui.Row>
          </div>
        ) : null}
      </ui.Section>
      <ui.Section title="Advanced">
        <ui.Segmented label="Length" value={length} onChange={setLength} options={[{ label: "Short", value: "short" }, { label: "Standard", value: "standard" }, { label: "Long", value: "long" }]} />
        <ui.Toggle label="Keep original clip sound" value={keepSound} onChange={setKeepSound} />
        <ui.Toggle label="Warm look" value={warm} onChange={setWarm} />
        {silent ? <ui.Message tone="muted">Silent video: no music and no original clip sound.</ui.Message> : null}
      </ui.Section>
      {progress ? <ui.Progress value={progress.value} label={progress.label} steps={CWV_BUILD_STEPS.map((s) => s.label)} current={progress.current} />
        : busy ? <ui.Progress label={step || "Working"} /> : null}
      {status ? <ui.Message tone={status.tone === "error" ? "error" : "muted"}>{status.text}</ui.Message> : null}
      {result && result.decorated ? (
        <ui.Message tone="success">
          {"Draft created. Select the title to edit its text or font, a clip to adjust crop or warmth, and the music to change its volume. Moving cuts inside the title will not move the title; rebuilding creates a new Draft and does not keep Inspector edits."}
        </ui.Message>
      ) : result && busy ? <ui.Message tone="muted">Draft created; adding title and look…</ui.Message> : null}
      {result?.link ? (
        <ui.Row gap={8} align="center">
          <a href={result.link} target="_blank" rel="noreferrer">Open the new Draft</a>
          <ui.IconButton icon="copy" label="Copy the link to the new Draft" onClick={() => { navigator.clipboard?.writeText(result.link).catch(() => null); }} />
        </ui.Row>
      ) : null}
      {result?.notes?.length ? <ui.Message tone="muted">{"Note: " + result.notes.join("; ") + "."}</ui.Message> : null}
      {result?.plan?.relaxedTalking ? <ui.Message tone="muted">Some shots may include people talking; there wasn't enough other footage.</ui.Message> : null}
      <ui.Actions>
        {result && !result.decorated ? <ui.Button onClick={finishTitle} disabled={busy}>Finish title and look</ui.Button> : null}
        {result ? <ui.Button onClick={() => { if (busyRef.current) return; const s = seed + 1; setSeed(s); build(s); }} disabled={busy}>Create another version</ui.Button> : null}
        <ui.Button variant="primary" busy={busy} busyLabel={step || "Building"} onClick={() => build(seed)} disabled={busy || !inventory || !inventory.resources.length}>Build</ui.Button>
      </ui.Actions>
    </ui.Stack>
  );
}
