// @name Postcard Style Template
// @icon video
// Build a reusable Swiss postcard Draft with thumbnail media pickers, a draggable subject in-point selector with a multi-frame scene preview, per-slot minimum landscape length (later-revealing panels need less), variable photo count, title/subtitle color pickers, an alpha-verified cutout generation path with a persisted pending marker the button waits out, a remount-proof "already generating" banner, a locked form while building, and automatic per-project save/restore of the last-used selections.
import React, { useEffect, useMemo, useRef, useState } from "react";

const graphicCode = `
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&?";
export default function SwissPostcardTitle({ data }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const introStart = Math.round(8.25 * fps);
  if (frame < introStart) return null;
  const local = frame - introStart;
  const seconds = local / fps;
  const blackTitle = seconds < 2.1;
  const title = String(data.title || "SWITZERLAND");
  const subtitle = String(data.subtitle || "moving postcards from");
  const familyName = String(data.fontFamily || "Futura Condensed ExtraBold").trim();
  const fontFamily = familyName ? "\\\"" + familyName + "\\\", Arial Narrow, Arial, sans-serif" : "Arial Narrow, Arial, sans-serif";
  const titleSize = Number(data.titleSize || 240);
  const subtitleSize = Number(data.subtitleSize || 100);
  const titleColor = String(data.titleColor || "#e15760");
  const subtitleColor = String(data.subtitleColor || "#ffffff");
  const titleX = Number(data.titleX ?? 50);
  const titleY = Number(data.titleY ?? 49.3);
  const subtitleX = Number(data.subtitleX ?? 50);
  const subtitleY = Number(data.subtitleY ?? 42.8);
  const scrambling = seconds >= 0.42 && seconds < 1.45;
  const progress = Math.max(0, Math.min(1, (seconds - 0.42) / 1.03));
  const chars = Array.from(title).map((ch, i) => {
    if (!scrambling || progress >= 1) return ch;
    const lock = 0.12 + 0.88 * (i / Math.max(1, title.length - 1));
    if (progress >= lock) return ch;
    const n = Math.abs(Math.sin((frame + 1) * (i + 3) * 12.9898));
    return GLYPHS[Math.floor(n * GLYPHS.length) % GLYPHS.length];
  });
  return (
    <AbsoluteFill style={{ pointerEvents: "none", backgroundColor: blackTitle ? "#000000" : "transparent" }}>
      <div style={{ position: "absolute", top: subtitleY + "%", left: subtitleX + "%", transform: "translateX(-50%)", textAlign: "center", color: subtitleColor, fontFamily, fontSize: subtitleSize, lineHeight: 1, fontWeight: 400, whiteSpace: "nowrap", textShadow: "0 2px 6px rgba(0,0,0,.35)" }}>{subtitle}</div>
      <div style={{ position: "absolute", top: titleY + "%", left: titleX + "%", transform: "translateX(-50%)", textAlign: "center", color: titleColor, fontFamily, fontSize: titleSize, lineHeight: 0.78, fontWeight: 800, letterSpacing: 0, whiteSpace: "nowrap", textShadow: "0 3px 8px rgba(0,0,0,.35)" }}>
        {chars.map((ch, i) => <span key={i} style={{ display: "inline-block", transform: scrambling && progress < 1 ? "translateY(" + ((1 - progress) * Math.sin((frame + i) * 0.8) * 5) + "px)" : "none" }}>{ch}</span>)}
      </div>
    </AbsoluteFill>
  );
}
`;

const DEFAULT_DIVISIONS = 3;
const DEFAULT_PHOTOS = 3;
const DEFAULT_TITLE_COLOR = "#e15760";
const DEFAULT_SUBTITLE_COLOR = "#ffffff";
// The template only ever shows the subject for this many seconds (see
// INTRO_DURATION=8.25 in render_template.sh); the picked window must be at
// least that long. Kept slightly above 8.25 so a small drag imprecision
// never leaves the renderer short of frames.
const SUBJECT_WINDOW_SECONDS = 8.5;
const SCENE_PREVIEW_FRAME_COUNT = 4;
// These MUST match render_template.sh's own REVEAL_START / REVEAL_FRAMES /
// INTRO_DURATION constants (and its fixed 60fps). render_template.sh now
// plays each landscape panel starting exactly when its own reveal begins
// (setpts offset), instead of always decoding from second 0 for the whole
// 8.25s — so a LATER-revealing panel genuinely needs LESS source footage.
// Panel i (0-based) starts revealing at (REVEAL_START + i*REVEAL_FRAMES)
// frames and must supply footage from then until INTRO_DURATION.
const REVEAL_START_FRAMES = 48;
const REVEAL_FRAMES_PER_PANEL = 60;
const INTRO_FPS = 60;
const INTRO_DURATION_SECONDS = 8.25;
const LANDSCAPE_SAFETY_MARGIN_SECONDS = 0.05;
function minLandscapeSecondsForSlot(slotIndex) {
  const startFrame = REVEAL_START_FRAMES + slotIndex * REVEAL_FRAMES_PER_PANEL;
  const startSeconds = startFrame / INTRO_FPS;
  return Math.max(0.5, Math.round((INTRO_DURATION_SECONDS - startSeconds + LANDSCAPE_SAFETY_MARGIN_SECONDS) * 10) / 10);
}

// Where the panel remembers (a) the LAST selections (subject/in-point,
// landscape + photo picks, title/subtitle/font/colors) and (b) which cutout
// AI jobs are currently in flight, so reopening the panel or clicking the
// button again never re-picks everything or re-launches a duplicate AI job.
// One JSON file, keyed by projectId (so switching projects does not mix up
// their state), merged read-modify-write.
const PANEL_STATE_DIR = `"$HOME/.selects/skills/swiss-postcard-style"`;
const PANEL_STATE_FILE = `"$HOME/.selects/skills/swiss-postcard-style/panel-state.json"`;
// A background-removal job has been observed taking anywhere from ~5 to
// ~25+ minutes for a single 8.5s 1080p clip. CUTOUT_PENDING_TTL_MS is the
// outer bound: a pending job younger than this is trusted and waited out;
// only past this age is it treated as abandoned/failed and a fresh one
// started. CUTOUT_POLL_MAX_WAIT_MS caps how long any ONE button click's own
// blocking wait can run (it resumes an older job's remaining time, capped
// by this, rather than restarting a fresh full-length wait every click).
const CUTOUT_PENDING_TTL_MS = 45 * 60 * 1000;
const CUTOUT_POLL_MAX_WAIT_MS = 42 * 60 * 1000;
const CUTOUT_POLL_INTERVAL_MS = 20000;
// TWO different "verified fast/specific model" attempts were tried here and
// BOTH silently produced a video with NO usable alpha channel despite every
// surface signal suggesting success (matching name, "succeeded" status, even
// an `alpha_mode=1` container tag in one case) — confirmed only by actually
// downloading the result and checking with ffprobe pix_fmt / a full-frame
// alpha histogram. Meanwhile the plain, UNDIRECTED instruction below
// ("use the project's own media-generation workflow") has a 3-for-3 track
// record of producing genuine yuva444p12le alpha. Do not "optimize" this
// into a specific modelId/params again without first generating a real
// cutout through it and verifying with ffprobe — a model that CLAIMS alpha
// support in its schema is not proof it actually delivers a decodable one.

const shellQuote = (value) => "'" + String(value).replace(/'/g, "'\\''") + "'";
const norm = (value) => String(value || "").normalize("NFC");
const isVideoPath = (path) => /\.(mov|mp4|m4v|webm|mkv)$/i.test(String(path || ""));
const isImagePath = (path) => /\.(jpg|jpeg|png|webp)$/i.test(String(path || ""));
const isHexColor = (value) => /^#[0-9a-fA-F]{6}$/.test(String(value || ""));
const generatedName = (name) => /reference|template|draft|base_no_title|swiss-postcard-subject/i.test(norm(name));
// Only the panel's OWN generated cutout output (named subject_cutout_<slug> by
// cutoutNameFor, below) is auto-recognized as "already made". A user's own
// footage that merely looks like it might already be a processed cutout by
// name is NOT assumed to be one — guessing cutout status from a naming
// convention previously hid a user's genuine subject footage from the
// subject picker and mislabeled it as a ready-made cutout at the same time.
const looksLikeGeneratedCutout = (name) => /^subject_cutout_/i.test(norm(name));
// Suggested filename handed to the AI (a hint only — see cutoutMatchesWindow
// below for how a cutout is actually RECOGNIZED, which does not depend on
// this stem surviving intact). ASCII-only by design: source file names can
// use any script, and always norm()-ing to NFC first avoids a real bug where
// macOS hands React a resource name in NFD (decomposed) Unicode form —
// several separate combining codepoints per visual character instead of one
// precomposed one — which can make a naive "keep only these codepoint
// ranges" character-class regex silently collapse an entire non-Latin name
// to nothing. Stripping to ASCII sidesteps that class of bug entirely
// without losing anything, since the stem is cosmetic only.
function cutoutNameFor(subjectName, startSec) {
  const stem = norm(subjectName || "subject").replace(/\.[^.]+$/, "").replace(/[^\w-]+/g, "_");
  const startTag = `_ds${Math.round((Number(startSec) || 0) * 10)}`;
  return `subject_cutout_${stem}${startTag}`;
}
// Matches a cutout to a subject+in-point WITHOUT relying on the human-
// readable "stem" (see cutoutNameFor above) surviving all the way through to
// the actual file that gets created — it might not, whether from Unicode
// normalization quirks or the background-removal job's own file-naming
// behavior. The always-ASCII, always-present decisecond suffix
// (Math.round(startSec*10), the SAME precision prepareSubjectWindow uses for
// its own trimmed-clip filename) is the one thing that reliably survives, so
// matching is done on ONLY that.
function cutoutDecisecondsFromName(name) {
  const n = norm(name);
  const m = n.match(/_ds(\d+)(?:\.[^.]*)?$/i);
  return m ? parseInt(m[1], 10) : null;
}
function cutoutMatchesWindow(name, startSec) {
  if (!looksLikeGeneratedCutout(name)) return false;
  const wantedDs = Math.round((Number(startSec) || 0) * 10);
  const ds = cutoutDecisecondsFromName(name);
  return ds !== null && ds === wantedDs;
}
// The key used to track an in-flight cutout job in PANEL_STATE_FILE's
// __pending__ map. Deliberately independent of cutoutNameFor()'s stem — that
// stem is cosmetic (a hint for the AI) and can legitimately change if the
// naming logic is ever improved again, which previously caused an already
// in-flight job's pending marker to become invisible under its old key and
// get silently re-launched as a duplicate. resourceId + decisecond is the
// stable identity of "this subject, this in-point" and never changes.
function pendingKeyFor(subjectResourceId, startSec) {
  return `${subjectResourceId}_ds${Math.round((Number(startSec) || 0) * 10)}`;
}

function Stepper({ value, min, max, onChange, disabled }) {
  const step = (delta) => onChange(Math.max(min, Math.min(max, value + delta)));
  const btnStyle = { width: 26, height: 30, flexShrink: 0, background: "#2c2c2c", color: "#fff", border: "1px solid #666", borderRadius: 4, cursor: "pointer", fontSize: 14, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, opacity: disabled ? 0.5 : 1 }}>
      <button type="button" onClick={() => step(-1)} disabled={disabled || value <= min} style={{ ...btnStyle, opacity: value <= min ? 0.4 : 1 }} aria-label="decrease">−</button>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))}
        style={{ width: 40, textAlign: "center", padding: "5px 2px", background: "#202020", color: "#fff", border: "1px solid #555", borderRadius: 4, boxSizing: "border-box" }}
      />
      <button type="button" onClick={() => step(1)} disabled={disabled || value >= max} style={{ ...btnStyle, opacity: value >= max ? 0.4 : 1 }} aria-label="increase">＋</button>
    </div>
  );
}

// A labeled native color swatch + hex readout, used for the title/subtitle
// color pickers. Native <input type="color"> works fine here (unlike
// <video>, it isn't blocked by the panel iframe's CSP).
function ColorField({ label, value, onChange, disabled }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, opacity: disabled ? 0.5 : 1 }}>
      <span style={{ fontSize: 12, color: "#d7d7d7" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="color"
          value={isHexColor(value) ? value : "#000000"}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 34, height: 28, padding: 0, border: "1px solid #555", borderRadius: 4, background: "#202020", cursor: "pointer" }}
        />
        <input
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 78, padding: "5px 6px", fontSize: 12, background: "#202020", color: "#fff", border: "1px solid #555", borderRadius: 4, boxSizing: "border-box" }}
        />
      </div>
    </div>
  );
}

// One fixed-height horizontally scrolling ROW of thumbnails (confirmed working
// by the user). The row's own height must comfortably fit the thumbnail +
// 2-line name (+ an optional too-short warning line) + card padding/border,
// or content gets visually clipped even though the row itself scrolls fine.
const THUMB_W = 76;
const THUMB_H = 54; // slightly taller than 16:10 to avoid rounding clipping
const CARD_W = THUMB_W + 8;
const NAME_H = 26; // ~2 lines at 9.5px
const WARN_H = 12; // one small line for the "too short" notice
const CARD_H = THUMB_H + NAME_H + WARN_H + 8 /* inner gaps */ + 10 /* card padding */ + 2 /* border */;
const ROW_H = CARD_H + 16 /* row padding */ + 2 /* row border */;

function ChoiceGrid({ label, itemKey, openKey, setOpenKey, value, options, onPick, thumb, loading, minDurationSec, disabled }) {
  const open = openKey === itemKey && !disabled;
  const current = options.find((o) => o.resourceId === value);
  const isTooShort = (o) => minDurationSec != null && typeof o.durationSeconds === "number" && o.durationSeconds > 0 && o.durationSeconds < minDurationSec;
  const currentTooShort = current ? isTooShort(current) : false;
  return (
    <div style={{ marginBottom: 12, width: "100%", boxSizing: "border-box", opacity: disabled ? 0.55 : 1 }}>
      <div style={{ fontSize: 12, color: "#d7d7d7", marginBottom: 4 }}>{label}</div>
      <div style={{ background: "#202020", border: currentTooShort ? "1px solid #d71920" : "1px solid #777", borderRadius: 4, padding: 8, width: "100%", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <div style={{ width: 72, height: 44, flexShrink: 0, background: "#000", borderRadius: 3, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>{thumb(value)}</div>
          <div style={{ flex: "1 1 auto", minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "#fff", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{current ? current.name : "Choose one"}</div>
            {currentTooShort && <div style={{ fontSize: 10, color: "#ff8080", marginTop: 2 }}>This clip is shorter than {minDurationSec}s — pick a different one.</div>}
          </div>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpenKey(open ? null : itemKey)}
          style={{ display: "block", width: "100%", marginTop: 8, padding: "7px 8px", fontSize: 12, background: "#3b3b3b", color: "#fff", border: "1px solid #666", borderRadius: 4, cursor: disabled ? "not-allowed" : "pointer", boxSizing: "border-box" }}
        >{open ? "Close" : "Change (scroll sideways to pick)"}</button>
      </div>
      {open && (
        loading
          ? <div style={{ marginTop: 6, fontSize: 11, color: "#aaa" }}>Loading media…</div>
          : options.length === 0
            ? <div style={{ marginTop: 6, fontSize: 11, color: "#c77" }}>No options available. Check the status message below and try Refresh.</div>
            : <div style={{
                marginTop: 6,
                height: ROW_H,
                display: "flex",
                flexDirection: "row",
                flexWrap: "nowrap",
                alignItems: "flex-start",
                overflowX: "auto",
                overflowY: "hidden",
                WebkitOverflowScrolling: "touch",
                gap: 6,
                padding: 8,
                border: "1px solid #666",
                borderRadius: 4,
                background: "#1b1b1b",
                width: "100%",
                boxSizing: "border-box",
              }}>
                {options.map((o) => {
                  const tooShort = isTooShort(o);
                  return (
                    <button
                      type="button"
                      key={o.resourceId}
                      disabled={tooShort}
                      onClick={() => { if (tooShort) return; onPick(o.resourceId); setOpenKey(null); }}
                      title={tooShort ? `${Math.round((o.durationSeconds || 0) * 10) / 10}s — needs at least ${minDurationSec}s` : undefined}
                      style={{ width: CARD_W, height: CARD_H, flexShrink: 0, padding: 4, background: value === o.resourceId ? "#4b171a" : "#262626", border: tooShort ? "1px solid #822" : (value === o.resourceId ? "1px solid #d71920" : "1px solid #444"), borderRadius: 4, cursor: tooShort ? "not-allowed" : "pointer", opacity: tooShort ? 0.45 : 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, boxSizing: "border-box" }}
                    >
                      <div style={{ width: THUMB_W, height: THUMB_H, flexShrink: 0, background: "#000", borderRadius: 3, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>{thumb(o.resourceId)}</div>
                      <div style={{ fontSize: 9.5, color: "#ddd", width: THUMB_W, height: NAME_H, lineHeight: 1.2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", textAlign: "center", wordBreak: "break-word" }}>{o.name}</div>
                      <div style={{ fontSize: 8.5, color: tooShort ? "#ff8080" : "#777", height: WARN_H, textAlign: "center" }}>
                        {tooShort ? `${Math.round((o.durationSeconds || 0) * 10) / 10}s (min ${minDurationSec}s)` : (typeof o.durationSeconds === "number" ? `${Math.round(o.durationSeconds * 10) / 10}s` : "")}
                      </div>
                    </button>
                  );
                })}
              </div>
      )}
    </div>
  );
}

// Drag-to-select the subject's in-point. The window length stays fixed at
// SUBJECT_WINDOW_SECONDS because render_template.sh's whole reveal/flash/black
// timing is hard-coded against an 8.25s subject clip; letting the user also
// resize the window would desync every transition. Dragging anywhere on the
// filmstrip recenters the fixed-length window under the pointer. The value is
// snapped to a 0.5s grid (see dragTo) so trivial pointer jitter between two
// interactions that were "meant" to be the same spot reliably lands on the
// exact same subjectStartSec — otherwise a sub-second difference silently
// computes a different pendingKeyFor/cutoutMatchesWindow target and looks
// like an entirely fresh selection with no memory of prior progress.
//
// The "scene preview" row shows several evenly spaced still frames across the
// chosen window rather than a playable video: the panel's own iframe cannot
// load the app's media scheme into a <video> element (CSP), and an animated
// GIF wide/long enough to read comfortably measured well past the panel
// host's 48KB sdk.runShell output cap. Several stills is what actually shows
// the motion arc within that budget.
function RangeSlider({ durationSec, windowSec, startSec, onChange, filmstrip, loading, previewFrames, previewLoading, previewError, disabled }) {
  const trackRef = useRef(null);
  const draggingRef = useRef(false);
  const clampStart = (v) => Math.max(0, Math.min(Math.max(0, durationSec - windowSec), v));
  const dragTo = (clientX) => {
    if (disabled) return;
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || durationSec <= 0 || rect.width <= 0) return;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const raw = clampStart(ratio * durationSec - windowSec / 2);
    const snapped = Math.round(raw * 2) / 2; // snap to 0.5s
    onChange(clampStart(snapped));
  };
  const onPointerDown = (e) => { if (disabled) return; draggingRef.current = true; try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {} dragTo(e.clientX); };
  const onPointerMove = (e) => { if (draggingRef.current) dragTo(e.clientX); };
  const onPointerUp = (e) => { draggingRef.current = false; try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) {} };
  const fmt = (s) => { const m = Math.floor(s / 60); const ss = Math.floor(s % 60); return `${m}:${String(ss).padStart(2, "0")}`; };
  const leftPct = durationSec > 0 ? (startSec / durationSec) * 100 : 0;
  const widthPct = durationSec > 0 ? Math.min(100, (windowSec / durationSec) * 100) : 100;
  return (
    <div style={{ marginBottom: 12, width: "100%", boxSizing: "border-box", opacity: disabled ? 0.55 : 1 }}>
      <div style={{ fontSize: 12, color: "#d7d7d7", marginBottom: 4 }}>Selected range (drag to move — fixed length {windowSec}s){disabled ? " — locked while building" : ""}</div>
      {loading
        ? <div style={{ fontSize: 11, color: "#aaa" }}>Loading range preview…</div>
        : durationSec <= 0
          ? <div style={{ fontSize: 11, color: "#c77" }}>Couldn't read the video length. Check the status message below and try Refresh.</div>
          : <>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${SCENE_PREVIEW_FRAME_COUNT}, 1fr)`, gap: 5, marginBottom: 6 }}>
                {Array.from({ length: SCENE_PREVIEW_FRAME_COUNT }).map((_, i) => {
                  const b64 = previewFrames[i];
                  return (
                    <div key={i} style={{ width: "100%", aspectRatio: "16 / 9", background: "#000", borderRadius: 3, overflow: "hidden", border: "1px solid #555", display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}>
                      {previewLoading
                        ? <span style={{ fontSize: 9, color: "#888" }}>…</span>
                        : b64
                          ? <img src={`data:image/jpeg;base64,${b64}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          : <span style={{ fontSize: 9, color: "#666" }}>—</span>}
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 10, color: "#999", marginBottom: 6, textAlign: "center" }}>
                {previewError ? previewError : "4 stills across the selected range, in order (playback isn't available here)"}
              </div>
              <div
                ref={trackRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{ position: "relative", height: 54, borderRadius: 4, overflow: "hidden", border: "1px solid #666", background: "#000", cursor: disabled ? "not-allowed" : "grab", display: "flex", touchAction: "none", boxSizing: "border-box" }}
              >
                {filmstrip.map((b64, i) => (
                  <div key={i} style={{ flex: 1, height: "100%", backgroundImage: b64 ? `url(data:image/jpeg;base64,${b64})` : "none", backgroundSize: "cover", backgroundPosition: "center", backgroundColor: "#111" }} />
                ))}
                <div style={{ position: "absolute", top: 0, bottom: 0, left: `${leftPct}%`, width: `${widthPct}%`, background: "rgba(215,25,32,0.28)", border: "2px solid #d71920", boxSizing: "border-box", pointerEvents: "none" }} />
              </div>
              <div style={{ fontSize: 11, color: "#ccc", marginTop: 4 }}>{fmt(startSec)} – {fmt(startSec + windowSec)} selected (of {fmt(durationSec)})</div>
            </>}
    </div>
  );
}

export default function SwissPostcardStyle({ sdk, context }) {
  const [rows, setRows] = useState([]);
  const [subjectId, setSubjectId] = useState("");
  const [subjectStartSec, setSubjectStartSec] = useState(0);
  const [subjectDurationSec, setSubjectDurationSec] = useState(0);
  const [filmstrip, setFilmstrip] = useState([]);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [scenePreviewFrames, setScenePreviewFrames] = useState([]);
  const [scenePreviewLoading, setScenePreviewLoading] = useState(false);
  const [scenePreviewError, setScenePreviewError] = useState("");
  const [divisionCount, setDivisionCount] = useState(DEFAULT_DIVISIONS);
  const [bgIds, setBgIds] = useState(() => Array.from({ length: DEFAULT_DIVISIONS }, () => ""));
  const [photoCount, setPhotoCount] = useState(DEFAULT_PHOTOS);
  const [photoIds, setPhotoIds] = useState(() => Array.from({ length: DEFAULT_PHOTOS }, () => ""));
  const [title, setTitle] = useState("SWITZERLAND");
  const [subtitle, setSubtitle] = useState("moving postcards from");
  const [fontFamily, setFontFamily] = useState("Futura Condensed ExtraBold");
  const [titleColor, setTitleColor] = useState(DEFAULT_TITLE_COLOR);
  const [subtitleColor, setSubtitleColor] = useState(DEFAULT_SUBTITLE_COLOR);
  const [openKey, setOpenKey] = useState(null);
  const [thumbnails, setThumbnails] = useState({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Loading project media…");
  // Saved-settings restore/persist state (see PANEL_STATE_FILE above).
  // savedSettings is null until the on-disk file has been read for the
  // CURRENT projectId; restoreReady only flips true once whatever was found
  // (or nothing) has been applied, which is also the earliest moment it is
  // safe to start auto-saving (so a premature save never overwrites a
  // not-yet-loaded file with blank defaults).
  const [savedSettings, setSavedSettings] = useState(null);
  const [restoreReady, setRestoreReady] = useState(false);
  // Ticks once a second purely to re-render the pending-cutout banner's
  // elapsed-time text and to re-check whether a pending marker exists for
  // the CURRENT subject+in-point — this is what makes an in-flight job
  // visible immediately on mount/reopen (a fresh React mount resets `busy`
  // to false, so `busy` alone cannot show "already generating" after a
  // panel reload; a real background job kept running while the UI showed a
  // deceptively fresh, clickable red button — exactly what let a 0.5s-off
  // re-drag silently spawn a duplicate target instead of resuming the
  // original one).
  const [clockTick, setClockTick] = useState(0);
  const thumbCache = useRef({});
  const bgIdsFilled = useRef(false);
  const photoIdsFilled = useRef(false);
  const scenePreviewSeq = useRef(0);
  const wholeFileRef = useRef({});
  const appliedRestoreRef = useRef(false);
  const preparedWindowRef = useRef({ key: null, window: null });

  useEffect(() => {
    const id = setInterval(() => setClockTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const fetchThumbnails = async (items) => {
    const helper = `"$HOME/.selects/skills/swiss-postcard-style/thumbnails.py"`;
    const pending = items.filter((it) => it.path && !thumbCache.current[it.id]);
    const batchSize = 4;
    for (let i = 0; i < pending.length; i += batchSize) {
      const batch = pending.slice(i, i + batchSize);
      const args = batch.flatMap((it) => [shellQuote(it.id), shellQuote(it.path), shellQuote(it.kind)]);
      const command = ["python3", helper, ...args].join(" ");
      try {
        const shell = await sdk.runShell({ summary: "Generate media thumbnails", command, timeoutMs: 30000, maxOutputBytes: 49152 });
        const raw = String(shell.stdout ?? shell.output ?? "").trim();
        if (raw) {
          const parsed = JSON.parse(raw);
          thumbCache.current = { ...thumbCache.current, ...parsed };
          setThumbnails((old) => ({ ...old, ...parsed }));
        }
      } catch (e) {
        // A failed batch just leaves those items with a text-only placeholder.
      }
    }
  };

  // `silent` skips every status-text update this function would normally
  // make (the data refresh — setRows/setSubjectId/etc — still happens).
  // MUST be used whenever loadSources() is called from inside an in-flight
  // build()/ensureCutout() poll: without it, loadSources' OWN "Found N
  // videos… Loading thumbnails…" → (later, async) "Ready. Click Change…"
  // sequence would race with — and could silently overwrite — the more
  // relevant status build()/ensureCutout sets right after loadSources()
  // returns (e.g. "still generating in the background, check back later").
  const loadSources = async (opts = {}) => {
    const silent = !!opts.silent;
    setLoading(true);
    if (!silent) setStatus(`Loading media for project ${context.projectId}…`);
    // durationSeconds is now carried through so the panel can warn about (and
    // block picking) a landscape clip shorter than its own slot's minimum.
    const r = await sdk.runScript({
      summary: "Read postcard template sources",
      allowCommit: false,
      script: `const p = selects.project(${JSON.stringify(context.projectId)});
const [resources, sourceFiles] = await Promise.all([p.resources(), p.sourceFiles()]);
const flat = (nodes, out = []) => { for (const n of nodes || []) { if (n.type === "dir") flat(n.children, out); else if (n.path) out.push(n); } return out; };
let files = [];
if ("fileTree" in sourceFiles) {
  files = flat(sourceFiles.fileTree);
} else {
  for (const folder of sourceFiles.folders || []) {
    const detail = await p.sourceFiles({ folder: folder.name });
    if ("fileTree" in detail) files = files.concat(flat(detail.fileTree));
  }
}
const pathById = new Map(files.map((f) => [f.resourceId, f.path]));
const items = [];
for (const resource of resources) {
  const path = pathById.get(resource.resourceId) || "";
  if (path) items.push({ resourceId: resource.resourceId, name: resource.name, path, durationSeconds: typeof resource.durationSeconds === "number" ? resource.durationSeconds : null });
}
return { items, resourceCount: resources.length, fileCount: files.length };`,
    });
    if (r.isError) {
      setLoading(false);
      throw new Error(r.output || "project media script failed");
    }
    if (r.result == null) {
      setLoading(false);
      throw new Error("The media list was too large to load. Please try Refresh again.");
    }
    const next = Array.isArray(r.result.items) ? r.result.items : [];
    // Subject candidates are every project video except the panel's own
    // rendered outputs, its own trimmed-window clips, and its own generated
    // cutouts (subject_cutout_*). A user's own footage stays selectable as a
    // subject even if its name happens to look like it could already be a
    // cutout — a name alone does not prove it is already a
    // transparent-background cutout.
    const sourceVideos = next.filter((x) => isVideoPath(x.path) && !generatedName(x.name));
    const subjectCandidates = sourceVideos.filter((x) => !looksLikeGeneratedCutout(x.name));
    const imgs = next.filter((x) => isImagePath(x.path));
    const preferredSubject = subjectCandidates[0];
    const backgroundPool = subjectCandidates.filter((x) => x.resourceId !== preferredSubject?.resourceId);
    // Prefer longer clips first for the earliest (most demanding) slots so
    // the default auto-fill is not immediately flagged too-short.
    const sortedByDurationDesc = [...backgroundPool].sort((a, b) => (b.durationSeconds || 0) - (a.durationSeconds || 0));
    setRows(next);
    setSubjectId((old) => (old && subjectCandidates.some((x) => x.resourceId === old)) ? old : (preferredSubject?.resourceId || ""));
    if (!bgIdsFilled.current && sortedByDurationDesc.length) {
      bgIdsFilled.current = true;
      setBgIds((old) => old.map((v, i) => v || sortedByDurationDesc[i]?.resourceId || ""));
    }
    if (!photoIdsFilled.current && imgs.length) {
      photoIdsFilled.current = true;
      setPhotoIds((old) => old.map((v, i) => v || imgs[i]?.resourceId || ""));
    }
    setLoading(false);
    if (!next.length) {
      if (!silent) setStatus(`No media with a resolvable path found in this project. (${r.result.resourceCount ?? 0} resources, ${r.result.fileCount ?? 0} files)`);
    } else if (!sourceVideos.length && !imgs.length) {
      if (!silent) setStatus(`Found ${next.length} media items, but none are usable videos or photos. Check file types (.mov/.mp4/.jpg/.png).`);
    } else {
      if (!silent) {
        setStatus(`Found ${sourceVideos.length} videos and ${imgs.length} photos. Loading thumbnails…`);
        const items = [
          ...sourceVideos.map((x) => ({ id: x.resourceId, path: x.path, kind: "video" })),
          ...imgs.map((x) => ({ id: x.resourceId, path: x.path, kind: "image" })),
        ];
        fetchThumbnails(items).then(() => setStatus(`Ready. Click "Change" and scroll sideways to pick. (${sourceVideos.length} videos, ${imgs.length} photos)`));
      }
    }
    return next;
  };

  // Mount-time load, with ONE automatic silent retry (after a short delay)
  // if the very first attempt throws. A transient hiccup right as the panel
  // mounts (e.g. the host app still finishing its own startup/indexing)
  // previously left the panel permanently empty — "No options available" /
  // "Couldn't read the video length" — with no way to recover except
  // guessing to hit "Refresh". This makes a first-load failure self-heal
  // once before it's shown to the user as a real error.
  useEffect(() => {
    let alive = true;
    const attempt = async (retriesLeft) => {
      try {
        await loadSources();
      } catch (e) {
        if (retriesLeft > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          if (alive) return attempt(retriesLeft - 1);
          return;
        }
        if (alive) { setLoading(false); setStatus("Couldn't load media: " + String(e?.message || e)); }
      }
    };
    attempt(1);
    return () => { alive = false; };
  }, [context.projectId]);

  const videoOptions = useMemo(() => rows.filter((x) => isVideoPath(x.path) && !generatedName(x.name)), [rows]);
  const subjectOptions = useMemo(() => videoOptions.filter((x) => !looksLikeGeneratedCutout(x.name)), [videoOptions]);
  const images = useMemo(() => rows.filter((x) => isImagePath(x.path)), [rows]);
  const byId = useMemo(() => new Map(rows.map((r) => [r.resourceId, r])), [rows]);
  const selectedSubject = byId.get(subjectId);

  // Load this project's remembered settings (if any) from PANEL_STATE_FILE.
  // Runs once per projectId; resets the restore/ready flags first so a
  // project switch cannot apply a stale project's settings or start saving
  // before the new project's file has actually been read.
  useEffect(() => {
    let alive = true;
    appliedRestoreRef.current = false;
    setRestoreReady(false);
    setSavedSettings(null);
    (async () => {
      let parsed = {};
      try {
        const cmd = `mkdir -p ${PANEL_STATE_DIR} 2>/dev/null; cat ${PANEL_STATE_FILE} 2>/dev/null || true`;
        const r = await sdk.runShell({ summary: "Load saved panel settings", command: cmd, timeoutMs: 10000, maxOutputBytes: 49152 });
        const raw = String(r.stdout ?? r.output ?? "").trim();
        if (raw) parsed = JSON.parse(raw);
      } catch (e) {
        parsed = {};
      }
      if (!alive) return;
      wholeFileRef.current = parsed && typeof parsed === "object" ? parsed : {};
      const entry = wholeFileRef.current[context.projectId];
      setSavedSettings(entry && typeof entry === "object" ? entry : {});
    })();
    return () => { alive = false; };
  }, [context.projectId]);

  // Apply the remembered settings exactly once, as soon as both they and the
  // project's media rows are available — validating every remembered
  // resourceId against what actually still exists in THIS project so a
  // deleted/renamed file never leaves a picker silently pointing at nothing.
  useEffect(() => {
    if (savedSettings === null || appliedRestoreRef.current || rows.length === 0) return;
    appliedRestoreRef.current = true;
    const s = savedSettings;
    const validVideoIds = new Set(subjectOptions.map((x) => x.resourceId));
    const validImageIds = new Set(images.map((x) => x.resourceId));
    if (s.subjectId && validVideoIds.has(s.subjectId)) {
      setSubjectId(s.subjectId);
      setSubjectStartSec(Math.max(0, Number(s.subjectStartSec) || 0));
    }
    if (Array.isArray(s.bgIds) && s.bgIds.length) {
      const filtered = s.bgIds.map((id) => (validVideoIds.has(id) ? id : ""));
      bgIdsFilled.current = true;
      setDivisionCount(Math.max(1, Math.min(6, filtered.length)));
      setBgIds(filtered);
    }
    if (Array.isArray(s.photoIds) && s.photoIds.length) {
      const filtered = s.photoIds.map((id) => (validImageIds.has(id) ? id : ""));
      photoIdsFilled.current = true;
      setPhotoCount(Math.max(1, Math.min(12, filtered.length)));
      setPhotoIds(filtered);
    }
    if (typeof s.title === "string" && s.title) setTitle(s.title);
    if (typeof s.subtitle === "string" && s.subtitle) setSubtitle(s.subtitle);
    if (typeof s.fontFamily === "string" && s.fontFamily) setFontFamily(s.fontFamily);
    if (isHexColor(s.titleColor)) setTitleColor(s.titleColor);
    if (isHexColor(s.subtitleColor)) setSubtitleColor(s.subtitleColor);
    setRestoreReady(true);
  }, [savedSettings, rows, subjectOptions, images]);

  // Debounced auto-save of everything the user can tune, merged into the
  // whole (all-projects) file so testing repeatedly never loses the last
  // picks. Waits for restoreReady so the very first render (before anything
  // has been restored) cannot stomp a real saved file with blank defaults.
  useEffect(() => {
    if (!restoreReady) return;
    const timer = setTimeout(() => {
      const payload = { subjectId, subjectStartSec, divisionCount, bgIds, photoCount, photoIds, title, subtitle, fontFamily, titleColor, subtitleColor };
      wholeFileRef.current = { ...wholeFileRef.current, [context.projectId]: payload };
      const json = JSON.stringify(wholeFileRef.current);
      const cmd = `mkdir -p ${PANEL_STATE_DIR} && printf '%s' ${shellQuote(json)} > ${PANEL_STATE_FILE}`;
      sdk.runShell({ summary: "Save panel settings", command: cmd, timeoutMs: 10000, maxOutputBytes: 2000 }).catch(() => {});
    }, 700);
    return () => clearTimeout(timer);
  }, [restoreReady, context.projectId, subjectId, subjectStartSec, divisionCount, bgIds, photoCount, photoIds, title, subtitle, fontFamily, titleColor, subtitleColor]);

  // Picking a NEW subject clip (a deliberate user action) always restarts
  // the in-point at 0 — unlike a restore, which sets subjectId and
  // subjectStartSec together and must NOT be reset back to 0 afterward.
  const pickSubject = (id) => { setSubjectId(id); setSubjectStartSec(0); };

  // Fetch the selected subject's duration and a filmstrip of sample frames
  // whenever the subject changes. Does NOT touch subjectStartSec itself —
  // that is set explicitly by pickSubject (user picks) or by the restore
  // effect above (remembered in-point), so this effect can't clobber either.
  useEffect(() => {
    let alive = true;
    if (!selectedSubject?.path) { setSubjectDurationSec(0); setFilmstrip([]); return; }
    setRangeLoading(true);
    (async () => {
      let dur = 0;
      try {
        const probeCmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", shellQuote(selectedSubject.path)].join(" ");
        const probe = await sdk.runShell({ summary: "Probe subject duration", command: probeCmd, timeoutMs: 15000, maxOutputBytes: 4000 });
        const raw = String(probe.stdout ?? probe.output ?? "").trim();
        const parsed = raw ? JSON.parse(raw) : null;
        dur = Number(parsed?.format?.duration) || 0;
      } catch (e) {
        dur = 0;
      }
      if (!alive) return;
      setSubjectDurationSec(dur);
      if (dur > 0) {
        try {
          const helper = `"$HOME/.selects/skills/swiss-postcard-style/filmstrip.py"`;
          const stripCmd = ["python3", helper, shellQuote(selectedSubject.path), String(dur), "8"].join(" ");
          const stripResult = await sdk.runShell({ summary: "Build subject filmstrip", command: stripCmd, timeoutMs: 30000, maxOutputBytes: 49152 });
          const stripRaw = String(stripResult.stdout ?? stripResult.output ?? "").trim();
          if (alive && stripRaw) setFilmstrip(JSON.parse(stripRaw));
        } catch (e) {
          if (alive) setFilmstrip([]);
        }
      } else {
        setFilmstrip([]);
      }
      if (alive) setRangeLoading(false);
    })();
    return () => { alive = false; };
  }, [selectedSubject?.resourceId]);

  // Multi-frame preview of the currently dragged window. Debounced so a fast
  // drag does not spawn a burst of ffmpeg calls; only the latest request's
  // result wins (scenePreviewSeq guards an in-flight older call). Any failure
  // is surfaced in scenePreviewError rather than silently leaving black boxes.
  useEffect(() => {
    if (!selectedSubject?.path || subjectDurationSec <= 0) { setScenePreviewFrames([]); setScenePreviewError(""); return; }
    const mySeq = ++scenePreviewSeq.current;
    setScenePreviewLoading(true);
    const endSec = Math.min(subjectDurationSec, subjectStartSec + SUBJECT_WINDOW_SECONDS);
    const timer = setTimeout(async () => {
      try {
        const helper = `"$HOME/.selects/skills/swiss-postcard-style/scene_preview.py"`;
        const cmd = ["python3", helper, shellQuote(selectedSubject.path), String(subjectStartSec), String(endSec), String(SCENE_PREVIEW_FRAME_COUNT)].join(" ");
        const result = await sdk.runShell({ summary: "Preview selected range frames", command: cmd, timeoutMs: 25000, maxOutputBytes: 49152 });
        if (mySeq !== scenePreviewSeq.current) return;
        if (result.isError) throw new Error(result.stderr || result.output || "Failed to generate preview");
        const raw = String(result.stdout ?? result.output ?? "").trim();
        if (!raw) throw new Error("Preview output was empty.");
        const parsed = JSON.parse(raw);
        const frames = Array.isArray(parsed.frames) ? parsed.frames : [];
        setScenePreviewFrames(frames);
        setScenePreviewError(frames.every((f) => !f) ? "Couldn't generate a preview." : "");
      } catch (e) {
        if (mySeq === scenePreviewSeq.current) { setScenePreviewFrames([]); setScenePreviewError("Preview failed: " + String(e?.message || e)); }
      } finally {
        if (mySeq === scenePreviewSeq.current) setScenePreviewLoading(false);
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [selectedSubject?.resourceId, subjectStartSec, subjectDurationSec]);

  const existingCutout = useMemo(() => {
    if (!selectedSubject) return undefined;
    // A quick, SYNCHRONOUS name-only match, used only to render the
    // informational hint text below the range slider. The alpha-channel
    // sanity check (see hasAlphaChannel/findValidCutout below, which
    // ensureCutout actually relies on before accepting a cutout) needs an
    // async ffprobe call and so cannot run inside a useMemo — a name match
    // that turns out to lack a usable alpha channel will still show this
    // hint, but build() will not accept it and will keep waiting/regenerate.
    return videoOptions.find((x) => cutoutMatchesWindow(x.name, subjectStartSec));
  }, [selectedSubject, subjectStartSec, videoOptions]);

  // Read/write the persisted "cutout job in flight" marker for one key,
  // scoped under a project's own PENDING map so it survives panel reloads
  // and never launches a second AI job for the same subject+in-point while
  // one is already running.
  const getPendingCutoutStartedAt = (key) => {
    const all = wholeFileRef.current.__pending__ || {};
    const forProject = all[context.projectId] || {};
    return typeof forProject[key] === "number" ? forProject[key] : null;
  };
  const setPendingCutoutStartedAt = async (key, startedAtOrNull) => {
    const all = { ...(wholeFileRef.current.__pending__ || {}) };
    const forProject = { ...(all[context.projectId] || {}) };
    if (startedAtOrNull == null) delete forProject[key]; else forProject[key] = startedAtOrNull;
    all[context.projectId] = forProject;
    wholeFileRef.current = { ...wholeFileRef.current, __pending__: all };
    const json = JSON.stringify(wholeFileRef.current);
    const cmd = `mkdir -p ${PANEL_STATE_DIR} && printf '%s' ${shellQuote(json)} > ${PANEL_STATE_FILE}`;
    try { await sdk.runShell({ summary: "Save pending cutout marker", command: cmd, timeoutMs: 10000, maxOutputBytes: 2000 }); } catch (e) {}
  };

  // Remount-proof visibility into an already-in-flight job for the CURRENT
  // subject+in-point, computed from persisted state alone — independent of
  // this render's own `busy` (which resets to false on every fresh mount,
  // even though the real background job keeps running server-side). This is
  // what lets the panel show "already generating, don't touch the slider"
  // immediately on reopen, instead of a deceptively fresh red button that
  // invites a duplicate. Recomputed every second via clockTick so the
  // elapsed-time text stays live without requiring any user interaction.
  const pendingCutoutInfo = useMemo(() => {
    void clockTick;
    if (!selectedSubject || savedSettings === null) return null;
    const key = pendingKeyFor(selectedSubject.resourceId, subjectStartSec);
    const startedAt = getPendingCutoutStartedAt(key);
    if (typeof startedAt !== "number") return null;
    const ageMs = Date.now() - startedAt;
    if (ageMs >= CUTOUT_PENDING_TTL_MS) return null;
    return { key, startedAt, elapsedMin: Math.max(0, Math.round(ageMs / 60000)) };
  }, [selectedSubject, subjectStartSec, savedSettings, clockTick]);

  const setSlot = (kind, index, value) => {
    if (kind === "bg") setBgIds((old) => old.map((v, i) => i === index ? value : v));
    else setPhotoIds((old) => old.map((v, i) => i === index ? value : v));
  };
  const resizeSlots = (kind, nextCount) => {
    if (kind === "bg") {
      setDivisionCount(nextCount);
      const sortedByDurationDesc = [...subjectOptions].sort((a, b) => (b.durationSeconds || 0) - (a.durationSeconds || 0));
      setBgIds((old) => Array.from({ length: nextCount }, (_, i) => old[i] || sortedByDurationDesc[i]?.resourceId || ""));
    } else {
      setPhotoCount(nextCount);
      setPhotoIds((old) => Array.from({ length: nextCount }, (_, i) => old[i] || images[i % Math.max(1, images.length)]?.resourceId || ""));
    }
  };

  const thumb = (id) => {
    const b64 = thumbnails[id];
    if (b64) return <img src={`data:image/jpeg;base64,${b64}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />;
    return <span style={{ fontSize: 9, color: "#666" }}>{id ? "…" : "—"}</span>;
  };

  const refresh = () => {
    loadSources().catch((e) => setStatus("Couldn't load media: " + String(e?.message || e)));
  };

  // Cut exactly the dragged window out of the full-length source BEFORE any
  // AI step runs. Doing this with local ffmpeg first — rather than asking the
  // AI to trim a long file itself — is what keeps background removal fast and
  // bounded. Cached by subject+in-point so repeated build() clicks (e.g. while
  // waiting on a pending cutout) don't re-trim/re-import a fresh duplicate
  // resource every time.
  const prepareSubjectWindow = async () => {
    const start = Math.max(0, subjectStartSec || 0);
    const key = `${selectedSubject.resourceId}:${Math.round(start * 10)}`;
    if (preparedWindowRef.current.key === key && preparedWindowRef.current.window) {
      return preparedWindowRef.current.window;
    }
    const outPath = `/tmp/swiss-postcard-subject-${selectedSubject.resourceId}-${Math.round(start * 10)}.mp4`;
    const cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", shellQuote(selectedSubject.path), "-ss", String(start), "-t", String(SUBJECT_WINDOW_SECONDS), "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-an", shellQuote(outPath)].join(" ");
    const shell = await sdk.runShell({ summary: "Trim subject to selected range", command: cmd, timeoutMs: 60000, maxOutputBytes: 4000 });
    if (shell.isError || shell.exitCode !== 0) throw new Error("Couldn't trim the selected range: " + (shell.stderr || shell.output || "unknown error"));
    const script = `const p = selects.project(${JSON.stringify(context.projectId)}); const imported = await p.importFiles({ paths: [${JSON.stringify(outPath)}] }); return { resourceId: imported.addedResourceIds[0] };`;
    const r = await sdk.runScript({ summary: "Import trimmed subject window", script, allowCommit: true });
    if (r.isError || !r.result?.resourceId) throw new Error("Couldn't import the trimmed clip into the project: " + (r.output || ""));
    const win = { resourceId: r.result.resourceId, path: outPath, name: `swiss-postcard-subject_${selectedSubject.name}_${Math.round(start)}s` };
    preparedWindowRef.current = { key, window: win };
    return win;
  };

  // A background-removal output that matches by name (cutoutMatchesWindow)
  // is NOT necessarily usable — one observed run produced a plain opaque
  // .webm (no alpha channel at all) despite the correct name pattern, which
  // would have silently broken the "person mask" compositing in
  // render_template.sh. Every name match is verified here before acceptance.
  const hasAlphaChannel = async (path) => {
    try {
      const cmd = ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=pix_fmt", "-of", "csv=p=0", shellQuote(path)].join(" ");
      const r = await sdk.runShell({ summary: "Check cutout alpha channel", command: cmd, timeoutMs: 10000, maxOutputBytes: 500 });
      const pix = String(r.stdout ?? r.output ?? "").trim().toLowerCase();
      return /yuva|rgba|argb|bgra|ya8|ayuv/.test(pix);
    } catch (e) {
      return false;
    }
  };
  const findValidCutout = async (list) => {
    const candidates = list.filter((x) => cutoutMatchesWindow(x.name, subjectStartSec));
    for (const c of candidates) {
      if (await hasAlphaChannel(c.path)) return c;
    }
    return null;
  };

  // Ensure a cutout for the selected subject + in-point, reusing one if it
  // already exists.
  //
  // The prompt explicitly requires ffmpeg-verifiable alpha (pix_fmt "yuva...")
  // before accepting a result, and tells the agent to try a different model
  // if the first attempt didn't actually produce one — see the note above
  // this file's top-level constants for why two different "verified fast
  // model" shortcuts were tried and abandoned (both silently produced
  // opaque video despite every surface signal suggesting success).
  //
  // sdk.askAI's OWN client-side wait can still give up (throw) before the
  // actual generation finishes — but the job itself keeps running
  // server-side regardless of whether this call awaits its completion,
  // proven by cutout files appearing on disk minutes after askAI had
  // already thrown here before. So this is fire-and-forget for the AI call
  // itself, but — per explicit user request — the BUTTON stays on
  // "Building…" and this function keeps blocking/polling (not just a short
  // opportunistic check) until a VALID cutout (see findValidCutout above) is
  // found or the job's persisted age passes CUTOUT_PENDING_TTL_MS, so the
  // red button never reappears mid-generation with nothing to show for it:
  //   1. If a job for this exact subject+in-point is already marked pending
  //      (persisted under pendingKeyFor, survives a panel reopen) and still
  //      within CUTOUT_PENDING_TTL_MS, DON'T relaunch it — resume waiting.
  //   2. Otherwise kick one off without awaiting its result, and persist the
  //      pending marker immediately so a concurrent/retry click never
  //      double-launches.
  //   3. Poll every CUTOUT_POLL_INTERVAL_MS (via SILENT loadSources calls —
  //      see the loadSources comment above for why silent matters here)
  //      until a valid cutout is found, updating the status line with
  //      elapsed/remaining time each round so "Building…" reads as alive,
  //      not frozen. This single click's own wait is capped at
  //      CUTOUT_POLL_MAX_WAIT_MS, but resumes an older job's remaining
  //      budget rather than restarting a fresh full-length wait, so the true
  //      end-to-end cap is CUTOUT_PENDING_TTL_MS regardless of how many
  //      times the button gets clicked along the way.
  const ensureCutout = async (subjectWindow) => {
    const already = await findValidCutout(videoOptions);
    if (already) return already;

    const wantedTag = cutoutNameFor(selectedSubject.name, subjectStartSec); // suggested output name
    const pendingKey = pendingKeyFor(selectedSubject.resourceId, subjectStartSec);

    let startedAt = getPendingCutoutStartedAt(pendingKey);
    const isFreshPending = typeof startedAt === "number" && (Date.now() - startedAt) < CUTOUT_PENDING_TTL_MS;

    if (!isFreshPending) {
      startedAt = Date.now();
      setStatus(`No cutout for the selected ${SUBJECT_WINDOW_SECONDS}s range — starting one in the background. This usually takes a few minutes but can occasionally run longer; keep this panel tab open and the button will stay on "Building…" until it's done…`);
      await setPendingCutoutStartedAt(pendingKey, startedAt);
      sdk.askAI({
        timeoutMs: 480000,
        prompt: `In Selects project ${context.projectId}, create a transparent-background video cutout of the video resource ${subjectWindow.resourceId} named ${subjectWindow.name} at path ${subjectWindow.path}. This clip is already trimmed to about ${SUBJECT_WINDOW_SECONDS} seconds — process the whole clip as-is, do not trim it further. Use the project's media-generation background-removal workflow (the generate_media tool), preferably ProRes 4444 with alpha. The output MUST have an actual, ffmpeg-decodable alpha channel (transparent background) — after generating, verify with ffprobe (pix_fmt should contain "yuva", e.g. yuva444p12le) before importing; if the chosen model/params did not actually produce alpha (e.g. pix_fmt has no "a", or every pixel decodes as fully opaque), try a different background-removal model rather than importing an unusable result. Import the resulting file back into the same project with a file name that starts with ${wantedTag}. Do not create or modify a Draft. Return the imported resource id and file name as JSON: {"resourceId": "...", "name": "..."}. This action may use media-generation credits; proceed because the user explicitly requested automatic cutout creation for the selected subject range.`,
      }).catch(() => {});
    } else {
      const elapsedMin = Math.max(0, Math.round((Date.now() - startedAt) / 60000));
      setStatus(`Resuming an in-progress cutout (started about ${elapsedMin} min ago). Keep this panel tab open — the button stays on "Building…" until it's done…`);
    }

    const deadline = Math.min(startedAt + CUTOUT_PENDING_TTL_MS, Date.now() + CUTOUT_POLL_MAX_WAIT_MS);
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, CUTOUT_POLL_INTERVAL_MS));
      const next = await loadSources({ silent: true });
      const made = await findValidCutout(next);
      if (made) { await setPendingCutoutStartedAt(pendingKey, null); return made; }
      const elapsedMin = Math.max(0, Math.round((Date.now() - startedAt) / 60000));
      const remainingMin = Math.max(0, Math.round((deadline - Date.now()) / 60000));
      setStatus(`Still generating the cutout in the background… (about ${elapsedMin} min elapsed, checking again in ${Math.round(CUTOUT_POLL_INTERVAL_MS / 1000)}s). Keep this panel tab open — the button stays on "Building…" for up to ~${remainingMin} more min before giving up.`);
    }

    const err = new Error(`Cutout generation has been running for over ${Math.round(CUTOUT_PENDING_TTL_MS / 60000)} minutes without producing a usable (alpha-channel) result. It may still complete on its own — click "Refresh" then "Create Editable Draft" again later to check. If it never completes, try a different in-point.`);
    err.isCutoutPending = true;
    throw err;
  };

  // Auto-resume: if a pending job for the CURRENT subject+in-point is
  // detected (pendingCutoutInfo, computed from disk, survives remounts) and
  // this render is not already busy, kick off build() automatically instead
  // of waiting for a click. Without this, the MAIN button's own disabled
  // state was the only thing guarding against a stray click after a
  // remount — fixed below via `locked` — but the button would otherwise sit
  // there fully clickable-looking (or, once fixed, grey-and-inert) with no
  // way to resume the live "Building…" polling view except an explicit
  // click. This makes reopening the panel while a job is in flight
  // immediately show live progress with zero user action required.
  const autoResumeAttemptedRef = useRef(false);
  useEffect(() => {
    if (autoResumeAttemptedRef.current) return;
    if (!pendingCutoutInfo || busy || loading || !rows.length) return;
    autoResumeAttemptedRef.current = true;
    build();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCutoutInfo, busy, loading, rows.length]);

  const build = async () => {
    if (!selectedSubject?.path) { setStatus("Pick a subject video first."); return; }
    const bgRows = bgIds.map((id) => byId.get(id));
    const photoRows = photoIds.map((id) => byId.get(id));
    if (bgRows.some((r) => !r?.path) || photoRows.some((r) => !r?.path)) {
      setStatus("Pick every landscape and photo slot first."); return;
    }
    // Final guard: never let a too-short landscape clip reach the renderer,
    // checked per slot index — a later-revealing slot needs less footage.
    for (let i = 0; i < bgRows.length; i++) {
      const need = minLandscapeSecondsForSlot(i);
      const r = bgRows[i];
      if (typeof r.durationSeconds === "number" && r.durationSeconds > 0 && r.durationSeconds < need) {
        setStatus(`Landscape ${i + 1} "${r.name}" is shorter than ${need}s (it's ${Math.round(r.durationSeconds * 10) / 10}s). Please pick a longer clip.`);
        return;
      }
    }
    setBusy(true);
    let subjectWindow, cutout;
    try {
      setStatus("Trimming the selected range…");
      subjectWindow = await prepareSubjectWindow();
      cutout = await ensureCutout(subjectWindow);
    } catch (e) {
      setBusy(false);
      setStatus(e && e.isCutoutPending ? String(e.message) : "Couldn't prepare the cutout: " + String(e?.message || e));
      return;
    }
    setStatus("Rendering the base video with your chosen panel/photo counts…");
    const output = `/tmp/swiss-postcard-template-${Date.now()}.mp4`;
    const helper = `"$HOME/.selects/skills/swiss-postcard-style/render_template.sh"`;
    const args = ["bash", helper, shellQuote(subjectWindow.path), shellQuote(cutout.path), String(bgRows.length), ...bgRows.map((r) => shellQuote(r.path)), String(photoRows.length), ...photoRows.map((r) => shellQuote(r.path)), shellQuote(output)];
    const shell = await sdk.runShell({ summary: "Render Swiss postcard template", command: args.join(" "), timeoutMs: 300000, maxOutputBytes: 12000 });
    if (shell.isError || shell.exitCode !== 0) { setBusy(false); setStatus("Render failed: " + (shell.stderr || shell.output || "unknown error")); return; }
    setStatus("Creating the editable Draft…");
    const script = `const p = selects.project(${JSON.stringify(context.projectId)}); const imported = await p.importFiles({ paths: [${JSON.stringify(output)}] }); const d = await p.createDraft({ name: "Reference Style Template" }); await d.insertResource({ resourceId: imported.addedResourceIds[0] }); await d.setFrameSize({ width: 1920, height: 1080 }); const clips = await d.clips({ trackScope: "main" }); const endFrame = clips.reduce((m,c) => Math.max(m,c.endFrame), 0); const target = await d.rangeAtFrames(0, endFrame); const tsxCode = ${JSON.stringify(graphicCode)}; await d.addMotionGraphic({ label: "Swiss Postcard Title", tsxCode, parameters: ${JSON.stringify({ title, subtitle, fontFamily, titleSize: 240, subtitleSize: 100, titleColor, subtitleColor, titleX: 50, titleY: 49.3, subtitleX: 50, subtitleY: 42.8 })}, editableParameters: [{ key: "title", label: "Title", type: "text", defaultValue: title }, { key: "subtitle", label: "Subtitle", type: "text", defaultValue: subtitle }, { key: "fontFamily", label: "Font", type: "text", defaultValue: fontFamily }, { key: "titleSize", label: "Title size", type: "number", defaultValue: 240, min: 120, max: 360, step: 1 }, { key: "subtitleSize", label: "Subtitle size", type: "number", defaultValue: 100, min: 40, max: 160, step: 1 }, { key: "titleColor", label: "Title color", type: "color", defaultValue: titleColor }, { key: "subtitleColor", label: "Subtitle color", type: "color", defaultValue: subtitleColor }, { key: "titleX", label: "Title horizontal position", type: "number", defaultValue: 50, min: 0, max: 100, step: 0.1 }, { key: "titleY", label: "Title vertical position", type: "number", defaultValue: 49.3, min: 0, max: 100, step: 0.1 }, { key: "subtitleX", label: "Subtitle horizontal position", type: "number", defaultValue: 50, min: 0, max: 100, step: 0.1 }, { key: "subtitleY", label: "Subtitle vertical position", type: "number", defaultValue: 42.8, min: 0, max: 100, step: 0.1 }], within: target }); const commit = await d.commitAll("Create editable Swiss postcard template"); return { commit };`;
    const result = await sdk.runScript({ summary: "Create editable postcard Draft", script, allowCommit: true });
    setBusy(false);
    if (result.isError) setStatus("Draft failed: " + (result.output || "unknown error"));
    else setStatus("Done. Open the new Draft and select the title Motion Graphic to edit text, font, position, and size.");
  };

  const locked = busy || !!pendingCutoutInfo;

  return <div style={{ padding: 0, color: "#fff", background: "#151515", fontFamily: "Arial, sans-serif", boxSizing: "border-box", maxWidth: "100%", overflowX: "hidden" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
      <div style={{ fontSize: 17, fontWeight: 700 }}>Postcard Style</div>
      <button type="button" onClick={refresh} disabled={loading || busy} style={{ width: "auto", flexShrink: 0, padding: "5px 9px", fontSize: 11, background: "#2c2c2c", color: "#fff", border: "1px solid #666", borderRadius: 4, cursor: loading || busy ? "default" : "pointer", opacity: loading || busy ? 0.5 : 1 }}>{loading ? "Loading…" : "Refresh"}</button>
    </div>
    <ol style={{ fontSize: 12, color: "#aaa", lineHeight: 1.55, marginTop: 0, marginBottom: 12, paddingLeft: 18 }}>
      <li>Pick a subject video, then drag on the strip below to choose the ~8.5s stretch to use.</li>
      <li>Set how many landscape panels you want and pick a video for each (each shows its own minimum length — earlier panels need longer clips).</li>
      <li>Set how many photos you want for the ending and pick them.</li>
      <li>Optionally edit the title, subtitle, colors, and font.</li>
      <li>Click "Create Editable Draft". If no cutout exists yet for your chosen range, the button stays on "Building…" the whole time it's generating in the background — keep this panel tab open; it only turns red again once the Draft is actually created (or a real error happens).</li>
    </ol>
    {pendingCutoutInfo && !busy && (
      <div style={{ fontSize: 11, color: "#ffcc80", margin: "0 0 12px", padding: 9, background: "#33280f", border: "1px solid #7a5a1a", borderRadius: 4, lineHeight: 1.5 }}>
        ⏳ A cutout for the CURRENT subject + range is already generating in the background (started about {pendingCutoutInfo.elapsedMin} min ago, even if this panel was reopened since). Don't change the subject video or drag the range slider — that would abandon this progress and start an unrelated new one. Just wait and click "Create Editable Draft" to pick it up once ready.
      </div>
    )}
    <ChoiceGrid label="Subject video" itemKey="subject" openKey={openKey} setOpenKey={setOpenKey} value={subjectId} options={subjectOptions} onPick={pickSubject} thumb={thumb} loading={loading} disabled={locked} />
    <RangeSlider durationSec={subjectDurationSec} windowSec={SUBJECT_WINDOW_SECONDS} startSec={subjectStartSec} onChange={setSubjectStartSec} filmstrip={filmstrip} loading={rangeLoading} previewFrames={scenePreviewFrames} previewLoading={scenePreviewLoading} previewError={scenePreviewError} disabled={locked} />
    <div style={{ fontSize: 11, color: existingCutout ? "#8c8" : "#c98", margin: "-4px 0 12px" }}>
      {loading || rangeLoading ? "" : existingCutout ? `Reusing cutout made by this panel: ${existingCutout.name}` : `No cutout yet for this range — one will be generated automatically when you create the Draft.`}
    </div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "8px 0 6px" }}><span style={{ fontSize: 12, color: "#d7d7d7" }}>Number of landscape panels</span><Stepper value={divisionCount} min={1} max={6} onChange={(v) => resizeSlots("bg", v)} disabled={locked} /></div>
    {bgIds.map((id, i) => <ChoiceGrid key={"bg" + i} label={`Landscape ${i + 1} · panel (min ${minLandscapeSecondsForSlot(i)}s)`} itemKey={"bg" + i} openKey={openKey} setOpenKey={setOpenKey} value={id} options={subjectOptions} onPick={(value) => setSlot("bg", i, value)} thumb={thumb} loading={loading} minDurationSec={minLandscapeSecondsForSlot(i)} disabled={locked} />)}
    <div style={{ fontSize: 11, color: "#888", margin: "3px 0 12px" }}>Panels are placed left to right. Supports 1-6 panels. Panels that appear earlier need longer source clips.</div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "8px 0 6px" }}><span style={{ fontSize: 12, color: "#d7d7d7" }}>Number of photos</span><Stepper value={photoCount} min={1} max={12} onChange={(v) => resizeSlots("photo", v)} disabled={locked} /></div>
    {photoIds.map((id, i) => <ChoiceGrid key={"photo" + i} label={"Photo " + (i + 1)} itemKey={"photo" + i} openKey={openKey} setOpenKey={setOpenKey} value={id} options={images} onPick={(value) => setSlot("photo", i, value)} thumb={thumb} loading={loading} disabled={locked} />)}
    <div style={{ fontSize: 11, color: "#888", margin: "3px 0 12px" }}>Each photo stays on screen for about 0.2s. Supports 1-12 photos.</div>
    <label style={{ display: "block", marginBottom: 8, fontSize: 12, color: "#d7d7d7", opacity: locked ? 0.55 : 1 }}>Main title<input value={title} disabled={locked} onChange={(e) => setTitle(e.target.value)} style={{ display: "block", width: "100%", marginTop: 4, padding: 7, background: "#202020", color: "#fff", border: "1px solid #555", borderRadius: 4, boxSizing: "border-box" }} /></label>
    <label style={{ display: "block", marginBottom: 8, fontSize: 12, color: "#d7d7d7", opacity: locked ? 0.55 : 1 }}>Subtitle<input value={subtitle} disabled={locked} onChange={(e) => setSubtitle(e.target.value)} style={{ display: "block", width: "100%", marginTop: 4, padding: 7, background: "#202020", color: "#fff", border: "1px solid #555", borderRadius: 4, boxSizing: "border-box" }} /></label>
    <label style={{ display: "block", marginBottom: 12, fontSize: 12, color: "#d7d7d7", opacity: locked ? 0.55 : 1 }}>Font family<input value={fontFamily} disabled={locked} onChange={(e) => setFontFamily(e.target.value)} style={{ display: "block", width: "100%", marginTop: 4, padding: 7, background: "#202020", color: "#fff", border: "1px solid #555", borderRadius: 4, boxSizing: "border-box" }} /></label>
    <ColorField label="Title color" value={titleColor} onChange={setTitleColor} disabled={locked} />
    <ColorField label="Subtitle color" value={subtitleColor} onChange={setSubtitleColor} disabled={locked} />
    <div style={{ height: 4 }} />
    <button onClick={build} disabled={locked || !rows.length} style={{ width: "100%", padding: "10px 12px", background: locked ? "#555" : "#d71920", color: "#fff", border: 0, borderRadius: 5, fontWeight: 700, cursor: locked ? "default" : "pointer", boxSizing: "border-box" }}>{locked ? "Building…" : "Create Editable Draft"}</button>
    <div style={{ marginTop: 12, fontSize: 11, color: "#aaa", lineHeight: 1.4 }}>{status}</div>
  </div>;
}
