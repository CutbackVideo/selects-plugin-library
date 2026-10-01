// @name 2026 Recap
// @name:de 2026 Rückblick
// @name:en 2026 Recap
// @name:es Resumen de 2026
// @name:fr Rétrospective 2026
// @name:it Recap 2026
// @name:ja 2026 まとめ
// @name:pt Retrospectiva de 2026
// @name:tr 2026 Özeti
// @name:zh 2026 年度回顾
// @collection visual-highlights
// @icon clock
// Build a beat-timed, editable recap Draft from footage in the current project.
import React from "react";

const SLUG = "recap-2026";
// Output shapes. Vertical stays the default; the other two exist because most
// phone footage is landscape and a 9:16 crop throws away most of the width.
const CANVAS = {
  vertical: { w: 1080, h: 1920 },
  horizontal: { w: 1920, h: 1080 },
  square: { w: 1080, h: 1080 },
};
const canvasOf = (key) => CANVAS[key] || CANVAS.vertical;
const AUDIO_NAME = "recap-2026-fixed-soundtrack.wav";
const AUDIO_SOURCE_NAME = "recap-preview-v3-beatmatched-61s.wav";
const TITLE_CODE = [
  "import React from 'react';",
  "export default function Graphic({data}) {",
  "return <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',color:'#fff',textAlign:'center',textShadow:'0 2px 14px rgba(0,0,0,.5)'}}>",
  "<div style={{fontFamily:'Georgia,serif',fontSize:56*(data.scale||1),fontStyle:'italic',lineHeight:1.2}}>{data.top}</div>",
  "<div style={{fontFamily:'Avenir Next,sans-serif',fontSize:174*(data.scale||1),fontWeight:900,lineHeight:1}}>{data.year}</div>",
  "</div>;}"
].join("");
const FADE_CODE = [
  "import React from 'react';import {useCurrentFrame,useVideoConfig} from 'remotion';",
  "export default function Graphic(){const f=useCurrentFrame(),fps=useVideoConfig().fps;",
  "const a=Math.max(0,Math.min(1,f/(fps*0.75)));",
  "return <div style={{width:'100%',height:'100%',backgroundColor:'rgba(0,0,0,'+a+')'}}/>;}"
].join("");
const WORDS = {
  ko: {
    reframe: "\uc138\ub85c \uad6c\ub3c4 \ub9de\ucd94\uae30", reframeRun: "\uad6c\ub3c4 \uc790\ub3d9\uc73c\ub85c \ub9de\ucd94\uae30", reframeRedo: "\uc804\ubd80 \ub2e4\uc2dc \ub9de\ucd94\uae30", reframeBusy: "\uad6c\ub3c4 \ucc3e\ub294 \uc911", reframeDone: "\uad6c\ub3c4\ub97c \ub9de\ucdc4\uc2b5\ub2c8\ub2e4.", reframeNone: "\ub9de\ucd9c \ucef7\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.", reframeHint: "\ucef7\ub9c8\ub2e4 \ud504\ub808\uc784\uc744 \ud55c \uc7a5\uc529 \ubcf4\uace0 \uc778\ubb3c\uc774 \uac00\uc6b4\ub370 \uc624\ub3c4\ub85d \uc88c\uc6b0\ub85c \ubc09\ub2c8\ub2e4. \uc138\ub85c·\uc815\uc0ac\uac01\uc77c \ub54c\ub9cc \uc758\ubbf8\uac00 \uc788\uc2b5\ub2c8\ub2e4.", reframeState: "\uad6c\ub3c4 \uc9c0\uc815\ub428", reframeScope: "\uce21\uc815 \ubc94\uc704", reframeScopeSample: "12\ucd08 \uc0d8\ud50c", reframeScopeFull: "\uc804\uccb4", reframeUncropped: "\ucef7\uc740 \uc548 \uc798\ub824\uc11c \uc81c\uc678", stepTiming: "\ud0c0\uc774\ubc0d \uc77d\ub294 \uc911", stepAudio: "\uc74c\uc545 \uc900\ube44 \uc911", stepIntro: "\uc778\ud2b8\ub85c \ub9cc\ub4dc\ub294 \uc911", stepClips: "\ud074\ub9bd \ub123\ub294 \uc911", stepFinish: "\uc74c\uc545·\uc81c\ubaa9 \uc5b9\ub294 \uc911", reframeOf: " / ", reframeNudge: "\uac00\ub85c \uc704\uce58", reframeNudgeHint: "0\uc774 \uc67c\ucabd \ub05d, 100\uc774 \uc624\ub978\ucabd \ub05d\uc785\ub2c8\ub2e4.", shape: "\uc601\uc0c1 \ube44\uc728", shapeVertical: "\uc138\ub85c 9:16", shapeHorizontal: "\uac00\ub85c 16:9", shapeSquare: "\uc815\uc0ac\uac01 1:1", shapeHint: "\uac00\ub85c\ub85c \ucc0d\uc740 \uc601\uc0c1\uc744 \uc138\ub85c\uc5d0 \ub123\uc73c\uba74 \uc88c\uc6b0\uac00 \uc798\ub9bd\ub2c8\ub2e4. \uc62c\ub9b4 \uacf3\uc5d0 \ub9de\ucdb0 \uace0\ub974\uc138\uc694.",
    folder: "\ud478\ud2f0\uc9c0 \ud3f4\ub354", intro: "\uc778\ud2b8\ub85c \uc601\uc0c1", slot: "\ube60\ub978 \ucef7 \ubc88\ud638 (1–159)",
    video: "\uc774 \ucef7\uc5d0 \uc0ac\uc6a9\ud560 \uc601\uc0c1", start: "\uc6d0\ubcf8 \uc601\uc0c1 \uc2dc\uc791\uc810", sample: "12\ucd08 \uc0d8\ud50c \ub9cc\ub4e4\uae30",
    full: "\uc804\uccb4 Draft \ub9cc\ub4e4\uae30", loading: "\ud478\ud2f0\uc9c0 \ubd88\ub7ec\uc624\ub294 \uc911…",
    noProject: "Selects \ud504\ub85c\uc81d\ud2b8\ub97c \uba3c\uc800 \uc5f4\uc5b4\uc8fc\uc138\uc694.",
    noVideo: "\uc0ac\uc6a9\ud560 \uc601\uc0c1\uc744 \ud558\ub098 \uc774\uc0c1 \uc120\ud0dd\ud558\uc138\uc694.",
    summary: "\uc601\uc0c1 \ud480", ready: "\uc778\ud2b8\ub85c", progress: "Draft \uc0dd\uc131 \uc911",
    audio: "\uace0\uc815 \uc74c\uc545\uacfc 2026 \ub0b4\ub808\uc774\uc158 \ud3ec\ud568", introTip: "\uae34 \uc778\ud2b8\ub85c \ub4a4\uc5d0 \ube60\ub978 \ucef7\uc774 \uc790\ub3d9\uc73c\ub85c \uc774\uc5b4\uc9d1\ub2c8\ub2e4.",
    choose: "\uc778\ud2b8\ub85c\ub97c \uace0\ub974\uace0 \ube60\ub978 \ucef7\uc6a9 \ud3f4\ub354\ub97c \uc120\ud0dd\ud558\uba74 \ub098\uba38\uc9c0\ub294 \uc790\ub3d9\uc73c\ub85c \ubc30\uce58\ub429\ub2c8\ub2e4.",
    invalid: "\uc778\ud2b8\ub85c \uc601\uc0c1\uc740 \uc120\ud0dd\ud55c \uc2dc\uc791\uc810\ubd80\ud130 5\ucd08 \uc774\uc0c1 \ud544\uc694\ud569\ub2c8\ub2e4.",
    gallery: "\ud2b9\uc815 \uc601\uc0c1 \uc81c\uc678 (\uc120\ud0dd \uc0ac\ud56d)", preview: "\uc778\ud2b8\ub85c \uad6c\uac04 \uc120\ud0dd", previous: "\uc774\uc804", next: "\ub2e4\uc74c",
    previewHint: "\uc544\ub798 \ud0c0\uc784\ub77c\uc778\uc5d0\uc11c \ub178\ub780 \uad6c\uac04\uc744 \uc6c0\uc9c1\uc5ec \uc0ac\uc6a9\ud560 4.7\ucd08\ub97c \uace0\ub974\uc138\uc694.",
    galleryHint: "\uc120\ud0dd\ud55c \ud3f4\ub354\uc758 \uc601\uc0c1\uc740 \ubaa8\ub450 \uc790\ub3d9 \uc0ac\uc6a9\ub429\ub2c8\ub2e4. \ube7c\uace0 \uc2f6\uc740 \uc601\uc0c1\ub9cc \uccb4\ud06c\ud558\uc138\uc694.",
    folderGuide: "\uc601\uc0c1 \ud30c\uc77c\uc744 \ud55c \ud3f4\ub354\uc5d0 \ubaa8\uc73c\uba74 \ud3b8\ub9ac\ud569\ub2c8\ub2e4. \uc5ec\ub7ec \ud3f4\ub354\ub97c \uc120\ud0dd\ud574\ub3c4 \ub429\ub2c8\ub2e4.",
    folderPick: "\ube60\ub978 \ucef7\uc6a9 \ud3f4\ub354", include: "\uc774 \uc601\uc0c1 \uc81c\uc678", poolRule: "\uc120\ud0dd\ud55c \ud3f4\ub354\uc758 \uc601\uc0c1\uc740 \uae30\ubcf8\uc801\uc73c\ub85c \ubaa8\ub450 \uc0ac\uc6a9\ud569\ub2c8\ub2e4. \ubd80\uc871\ud558\uba74 \ud30c\uc77c\uba85 \uc21c\uc11c\ub300\ub85c \ubc18\ubcf5\ud558\uba70, \uacb0\uacfc \uae38\uc774\ub294 \uc74c\uc545\uc5d0 \ub9de\ucdb0 \uc57d 61.5\ucd08\ub85c \uace0\uc815\ub429\ub2c8\ub2e4.",
    footageCount: "\ube60\ub978 \ucef7\uc6a9 \uc601\uc0c1", repeatNote: "160\uac1c \uc2ac\ub86f\uc744 \ucc44\uc6b0\uae30 \uc704\ud574 \uc601\uc0c1\uc774 \ubc18\ubcf5\ub429\ub2c8\ub2e4.",
    selectAll: "\uc81c\uc678 \ubaa9\ub85d \ucd08\uae30\ud654", selectNone: "\uc804\uccb4 \ud574\uc81c", rebuildHint: "\uc81c\uc678 \uc124\uc815\uc744 \ubc14\uafb8\uba74 \ube60\ub978 \ucef7\uc774 \ub2e4\uc2dc \uc790\ub3d9\uc73c\ub85c \ubc30\uce58\ub429\ub2c8\ub2e4.",
    advanced: "\ube60\ub978 \ucef7 \ud558\ub098 \uc870\uc815 (\uc120\ud0dd \uc0ac\ud56d)", introStart: "\uc778\ud2b8\ub85c \uc2dc\uc791\uc810",
    advancedHint: "1\ubc88\uc740 \uc778\ud2b8\ub85c \uc9c1\ud6c4\uc758 \uccab \ucef7\uc785\ub2c8\ub2e4. \uac19\uc740 \uc601\uc0c1 \uc790\ub9ac\uc758 \ud6c4\ubc18 \ubc18\ubcf5\ubd84\ub3c4 \ud568\uaed8 \ubc14\ub01d\ub2c8\ub2e4.",
    outputAt: "\uc644\uc131 \uc601\uc0c1\uc5d0\uc11c", sourceWindow: "\uc774 \ucef7\uc5d0 \uc0ac\uc6a9\ud560 \uc6d0\ubcf8 \uad6c\uac04",
    advancedSourceHint: "\uc6d0\ubcf8 \ud0c0\uc784\ub77c\uc778\uc758 \ub178\ub780 \uad6c\uac04\uc744 \uc62e\uaca8 \uc774 \ucef7\uc5d0 \uc0ac\uc6a9\ud560 \uc7a5\uba74\uc744 \uace0\ub974\uc138\uc694.",
    repeatsLater: "\uc774 \ucef7\uc740 \ud6c4\ubc18 \ubc18\ubcf5 \uad6c\uac04\uc5d0\ub3c4 \ub2e4\uc2dc \ub098\uc624\uba70 \ud568\uaed8 \ubcc0\uacbd\ub429\ub2c8\ub2e4.",
    rules: "\uc790\ub3d9 \ubc30\uce58 \uaddc\uce59", quickRule: "\ud544\uc694\ud558\uba74 \ubc18\ubcf5 · \uc57d 61.5\ucd08 \uace0\uc815",
    noneIncluded: "\uc0ac\uc6a9\ud560 \uc601\uc0c1\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. \ube60\ub978 \ucef7\uc6a9 \ud3f4\ub354\ub97c \uc120\ud0dd\ud558\uac70\ub098 \uc81c\uc678 \ubaa9\ub85d\uc744 \ucd08\uae30\ud654\ud558\uc138\uc694.",
    shortNotice: "1.7\ucd08 \ubbf8\ub9cc \uc601\uc0c1\uc740 \uae34 \ucef7\uc744 \ucc44\uc6b8 \uc218 \uc5c6\uc5b4 \uc81c\uc678\ub429\ub2c8\ub2e4. \uc778\ud2b8\ub85c\uc5d0\ub294 5\ucd08 \uc774\uc0c1 \uc601\uc0c1\uc774 \ud544\uc694\ud569\ub2c8\ub2e4.",
    example: "\uc644\uc131 \uc608\uc2dc", exampleHint: "61.5\ucd08 \uc644\uc131\ubcf8. \uc7ac\uc0dd\ud574\uc11c \uc601\uc0c1\uacfc \ube44\ud2b8\uc758 \ud750\ub984\uc744 \ud655\uc778\ud558\uc138\uc694.",
    exampleMissing: "\uc608\uc2dc \uc601\uc0c1\uc744 \ubd88\ub7ec\uc62c \uc218 \uc5c6\uc2b5\ub2c8\ub2e4."
  },
  en: {
    folder: "Footage folder", intro: "Intro video", slot: "Fast-cut number (1–159)",
    video: "Video for this cut", start: "Source video start", sample: "Create 12s sample",
    full: "Create full Draft", loading: "Loading footage…",
    noProject: "Open a Selects project first.",
    noVideo: "Choose at least one video.",
    summary: "Footage pool", ready: "Intro", progress: "Building Draft",
    audio: "Fixed music with 2026 narration", introTip: "Fast cuts follow the long intro automatically.",
    choose: "Choose the intro and folders for fast cuts. The rest is arranged automatically.",
    invalid: "The intro needs at least five seconds after its source start.",
    gallery: "Exclude specific videos (optional)", preview: "Select the intro segment", previous: "Previous", next: "Next",
    previewHint: "Move the yellow window on the timeline to choose the 4.7 seconds to use.",
    galleryHint: "All videos in the selected folders are used automatically. Check only the videos you want to leave out.",
    folderGuide: "Putting videos in one folder is easiest. You can also select multiple folders.",
    reframe: "Vertical framing", reframeRun: "Find the framing", reframeRedo: "Redo them all", reframeBusy: "Finding framing", reframeDone: "Framing set.", reframeNone: "Nothing left to frame.", reframeHint: "Reads one frame per cut and slides it so the subject lands in the middle. Only matters for vertical and square.", reframeState: "framed", reframeScope: "Measure", reframeScopeSample: "12s sample", reframeScopeFull: "Full", reframeUncropped: "not cropped, skipped", stepTiming: "Reading timing", stepAudio: "Preparing music", stepIntro: "Building the intro", stepClips: "Placing clips", stepFinish: "Adding music and title", reframeOf: " / ", reframeNudge: "Horizontal position", reframeNudgeHint: "0 is the left edge, 100 the right.", shape: "Output shape", shapeVertical: "Vertical 9:16", shapeHorizontal: "Horizontal 16:9", shapeSquare: "Square 1:1", shapeHint: "Landscape footage loses its sides in a vertical frame. Pick the shape you will post.", folderPick: "Folders for fast cuts", include: "Exclude this video", poolRule: "All videos in selected folders are used by default. When there are fewer videos than slots, footage repeats in filename order. Runtime stays fixed at about 61.5 seconds to match the music.",
    footageCount: "Fast-cut videos", repeatNote: "Videos will repeat to fill the 160 slots.",
    selectAll: "Reset exclusions", selectNone: "Clear all", rebuildHint: "Changing exclusions rearranges the fast cuts automatically.",
    advanced: "Adjust one fast cut (optional)", introStart: "Intro source start",
    advancedHint: "Number 1 is the first cut after the intro. If this position repeats later, both copies change together.",
    outputAt: "In finished video", sourceWindow: "Source segment for this cut",
    advancedSourceHint: "Move the yellow window on the source timeline to choose the moment used for this cut.",
    repeatsLater: "This cut also appears in the later repeat; both copies change together.",
    rules: "How auto-fill works", quickRule: "Repeats if needed · fixed ~61.5s",
    noneIncluded: "No footage is available. Choose a fast-cut folder or reset exclusions.",
    shortNotice: "Clips under 1.7 seconds are excluded. The intro needs a video of at least 5 seconds.",
    example: "Finished example", exampleHint: "Play the 61.5s example to see the footage and beat timing.",
    exampleMissing: "The example video could not be loaded."
  }
};
const embedded = (value) => JSON.stringify(value);
const scriptResult = (r) => {
  if (r.isError) throw new Error(r.output || "Selects edit failed");
  if (r.result == null) throw new Error("Selects returned no result");
  return r.result;
};
const shellResult = (r) => {
  if (r.isError || r.exitCode !== 0) throw new Error(r.stderr || r.output || "Host action failed");
  return r.stdout.trim();
};
const core = (cfg) => "const cfg=JSON.parse(" + embedded(JSON.stringify(cfg)) + ");const p=selects.project(cfg.projectId);";
const shellQuote = (value) => "'" + String(value).replace(/'/g, "'\"'\"'") + "'";
const gallerySize = 8;
const thumbnailKey = (video, seconds) => video.resourceId + ":" + seconds.toFixed(2);

// ---- Auto reframe ---------------------------------------------------------
// A 9:16 frame shows roughly a third of a landscape shot, and the panel used to
// keep the middle third whatever was in it. These helpers find where the
// subject actually sits and slide the window onto it.
// Each askAI call is a full agent turn and costs about 40 seconds, so the
// sheet carries as many cuts as will fit under the shell's reply limit.
const SAMPLE_CUTS = 33;
const REFRAME_BATCH = 12;
const REFRAME_WORKERS = 2;
// Smaller build batches mean the progress line moves more often.
const BUILD_BATCH = 12;
const reframeGrid = (n) => { const cols = Math.min(4, Math.max(1, n)); return { cols, rows: Math.ceil(n / cols) }; };
// run_shell returns at most 48 KB, so the sheet is sized to land near 30 KB of
// base64 with room to spare on a busy frame. Both dimensions stay even for JPEG.
const TILE_W = 256, TILE_H = 144, TILE_Q = 20, SHELL_LIMIT = 48000;
const reframeKey = (slot) => slot.resourceId + ":" + Number(slot.startSeconds || 0).toFixed(2);

// Subject position is stored as a fraction of the SOURCE frame, so one reading
// stays valid when the output shape changes.
// A clip whose shape already matches the canvas has nothing to slide.
function needsReframe(frameSize, canvas) {
  if (!frameSize?.width || !frameSize?.height) return false;
  const m = Math.max(canvas.w / frameSize.width, canvas.h / frameSize.height);
  return (frameSize.width * m - canvas.w > 2) || (frameSize.height * m - canvas.h > 2);
}

function reframePosition(subject, frameSize, canvas) {
  if (!subject || !frameSize?.width || !frameSize?.height) return { x: 0, y: 0 };
  const sw = frameSize.width, sh = frameSize.height;
  const m = Math.max(canvas.w / sw, canvas.h / sh);
  const dispW = sw * m, dispH = sh * m;
  const maxX = Math.max(0, (dispW - canvas.w) / 2);
  const maxY = Math.max(0, (dispH - canvas.h) / 2);
  const clamp = (v, lim) => Math.max(-lim, Math.min(lim, v));
  const px = clamp((0.5 - subject.fx) * dispW, maxX);
  const py = clamp((subject.fy - 0.5) * dispH, maxY);
  // setClipTransform measures position in percent of the frame's HEIGHT, +Y up.
  return { x: Math.round(px / canvas.h * 1000) / 10, y: Math.round(py / canvas.h * 1000) / 10 };
}

// One shell round trip per batch: grab each frame, pad them to a common size,
// then tile them into a single sheet the model can read in one go.
function reframeSheetCommand(items, quality) {
  const lines = ["d=$(mktemp -d)", "ok=0", "why=''"];
  items.forEach((item, index) => {
    const n = String(index).padStart(2, "0");
    const vf = "scale=" + TILE_W + ":" + TILE_H + ":force_original_aspect_ratio=decrease," +
      "pad=" + TILE_W + ":" + TILE_H + ":(ow-iw)/2:(oh-ih)/2";
    lines.push(
      "if err=$(ffmpeg -nostdin -loglevel error -ss " + item.time.toFixed(3) + " -i " + shellQuote(item.path) +
      " -frames:v 1 -vf " + shellQuote(vf) + " -q:v " + quality + " \"$d/" + n + ".jpg\" 2>&1); then ok=$((ok+1)); else " +
      "[ -z \"$why\" ] && why=$(printf '%s' \"$err\" | head -c 160); " +
      "ffmpeg -nostdin -loglevel error -f lavfi -i color=c=black:s=" + TILE_W + "x" + TILE_H +
      " -frames:v 1 \"$d/" + n + ".jpg\" >/dev/null 2>&1; fi"
    );
  });
  // First line is the report, everything after it is the sheet.
  lines.push("printf 'OK %d %s\\n' \"$ok\" \"$why\"");
  lines.push(
    "ffmpeg -nostdin -loglevel error -i \"$d/%02d.jpg\" -vf " +
    shellQuote("tile=" + reframeGrid(items.length).cols + "x" + reframeGrid(items.length).rows + ":color=black") +
    " -frames:v 1 -q:v " + quality + " -f image2pipe -vcodec mjpeg - 2>/dev/null | base64 | tr -d '\\n'"
  );
  lines.push("rm -rf \"$d\"");
  return lines.join("\n");
}

const REFRAME_PROMPT = (count) =>
  "The image is a contact sheet of " + count + " frames from different video clips, laid out as " +
  reframeGrid(count).cols + " columns by " + reframeGrid(count).rows + " rows, numbered 1 to " + count +
  " left to right, top to bottom. Solid black tiles have no subject.\n\n" +
  "Each frame will be cropped to a tall 9:16 window that keeps only about a THIRD of its width. " +
  "I need to know where to put that window, so your reading has to be precise.\n\n" +
  "For each numbered frame:\n" +
  "- If a person is visible, locate their HEAD (the face, or the back of the head when turned away). " +
  "That is what must not be cut. Ignore their body and anything else.\n" +
  "- If no person is visible, locate the main object or feature the shot is about.\n" +
  "- Give the centre of that head or object as a percentage of the tile's own picture: " +
  "x=0 at the left edge, x=100 at the right edge, y=0 at the top, y=100 at the bottom. " +
  "Ignore any black padding bars.\n\n" +
  "Use the whole 0-100 range. A face sitting in the left part of the frame is near 20, not 45. " +
  "Do NOT answer 50 to play safe — only use it when the subject genuinely sits dead centre. " +
  "Set kind to \"none\" (and x/y to 50) only for a black tile or a frame with nothing to centre on.\n\n" +
  "Answer straight from the picture: do not call any tools, do not explain, do not restate the task. " +
  "Output only the JSON array, one entry per frame:\n" +
  "[{\"i\":1,\"kind\":\"person\",\"x\":22,\"y\":34}]";

function parseReframeReply(text, count) {
  const match = String(text || "").match(/\[[\s\S]*\]/);
  if (!match) throw new Error("Could not read the reframe answer");
  const rows = JSON.parse(match[0]);
  const out = {};
  for (const row of rows) {
    const i = Number(row?.i);
    if (!Number.isInteger(i) || i < 1 || i > count) continue;
    if (String(row?.kind || "").toLowerCase() === "none") continue;
    const x = Number(row?.x), y = Number(row?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    out[i - 1] = { fx: Math.max(0, Math.min(1, x / 100)), fy: Math.max(0, Math.min(1, y / 100)) };
  }
  return out;
}

async function captureThumbnail(sdk, video, seconds) {
  if (!video.path) return null;
  const time = Math.max(0, Math.min(video.durationSeconds - 0.1, seconds));
  const command = "ffmpeg -nostdin -loglevel error -ss " + time.toFixed(3) +
    " -i " + shellQuote(video.path) +
    " -frames:v 1 -vf scale=240:-2 -q:v 12 -f image2pipe -vcodec mjpeg - 2>/dev/null | base64 | tr -d '\\n'";
  const result = await sdk.runShell({summary:"Preview footage frame",command,maxOutputBytes:48000,timeoutMs:20000});
  if (result.isError || result.exitCode !== 0 || result.truncated || !result.stdout.trim()) return null;
  return "data:image/jpeg;base64," + result.stdout.trim();
}

function SourceWindowPicker({sdk,ui,video,startSeconds,windowSeconds,sourceMargin,onChange,disabled,label,hint,loading,compact=false}) {
  const [frames,setFrames]=React.useState({});
  const cache=React.useRef({});
  const duration=video?.durationSeconds||0;
  const maxStart=Math.max(0,duration-windowSeconds-sourceMargin);
  const stripTimes=video?Array.from({length:6},(_,i)=>Math.round(duration*(i+0.5)/6*100)/100):[];
  const previewAt=Math.round(Math.min(duration-0.1,startSeconds+windowSeconds/2)*10)/10;
  const closest=stripTimes.length?stripTimes.reduce((best,at)=>Math.abs(at-previewAt)<Math.abs(best-previewAt)?at:best,stripTimes[0]):0;
  const previewUrl=video?(frames[thumbnailKey(video,previewAt)]||frames[thumbnailKey(video,closest)]):null;

  React.useEffect(()=>{cache.current={};setFrames({});},[video?.resourceId]);
  React.useEffect(()=>{
    if(!video)return;
    let live=true;
    (async()=>{
      for(const at of stripTimes){
        const key=thumbnailKey(video,at);
        if(cache.current[key]!==undefined)continue;
        cache.current[key]=null;
        let url=null;
        try{url=await captureThumbnail(sdk,video,at);}catch(_){}
        cache.current[key]=url;
        if(live)setFrames((old)=>({...old,[key]:url}));
      }
    })();
    return ()=>{live=false;};
  },[video?.resourceId]);
  React.useEffect(()=>{
    if(!video||compact)return;
    const key=thumbnailKey(video,previewAt);
    if(cache.current[key]!==undefined)return;
    let live=true;
    const timer=setTimeout(async()=>{
      cache.current[key]=null;
      let url=null;
      try{url=await captureThumbnail(sdk,video,previewAt);}catch(_){}
      cache.current[key]=url;
      if(live)setFrames((old)=>({...old,[key]:url}));
    },180);
    return ()=>{live=false;clearTimeout(timer);};
  },[video?.resourceId,previewAt,compact]);

  if(!video)return null;
  const move=(event)=>{
    if(disabled)return;
    const box=event.currentTarget.getBoundingClientRect();
    if(!box.width)return;
    const second=Math.max(0,Math.min(1,(event.clientX-box.left)/box.width))*duration;
    onChange(Math.min(maxStart,Math.round(Math.max(0,Math.min(maxStart,second-windowSeconds/2))*10)/10));
  };
  return <div>
    {!compact&&<><h3>{label}</h3><small>{hint}</small>
      <div style={{width:"100%",height:220,maxHeight:"45vw",background:"#111",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",marginTop:8,borderRadius:6}}>
        {previewUrl?<img src={previewUrl} alt={video.name+" preview"} style={{width:"100%",height:"100%",objectFit:"contain",display:"block"}}/>:<small>{loading}</small>}
      </div></>}
    <div onPointerDown={(event)=>{if(disabled)return;event.currentTarget.setPointerCapture(event.pointerId);move(event);}}
      onPointerMove={(event)=>{if(event.currentTarget.hasPointerCapture(event.pointerId))move(event);}}
      onPointerUp={(event)=>{if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);}}
      style={{display:"flex",position:"relative",width:"100%",height:64,overflow:"hidden",borderRadius:6,background:"#111",cursor:disabled?"default":"ew-resize",touchAction:"none",marginTop:8}}>
      {stripTimes.map((at,index)=>{
        const url=frames[thumbnailKey(video,at)];
        return <div key={index} style={{flex:"1 1 0",minWidth:0,height:"100%",borderRight:"1px solid var(--panel-border)",pointerEvents:"none"}}>
          {url&&<img src={url} alt="" style={{width:"100%",height:"100%",objectFit:"contain",display:"block",pointerEvents:"none"}}/>}
        </div>;
      })}
      <div style={{position:"absolute",top:0,bottom:0,left:(startSeconds/duration*100)+"%",width:(windowSeconds/duration*100)+"%",boxSizing:"border-box",border:"3px solid #eed65d",background:"rgba(238,214,93,0.12)",pointerEvents:"none"}}/>
    </div>
    <small>{startSeconds.toFixed(1)}s – {(startSeconds+windowSeconds).toFixed(1)}s / {duration.toFixed(1)}s</small>
    {!compact&&<ui.Slider label={label} value={Math.max(0,Math.min(maxStart,startSeconds))} onChange={(value)=>onChange(Math.max(0,Math.min(maxStart,value)))} min={0} max={maxStart} step={0.1} unit="s" disabled={disabled}/>}
  </div>;
}

function buildSlots(videos, intro) {
  if (!videos.length || !intro?.resourceId) return [];
  const slots = [{...intro}];
  for (let i = 0; i < 159; i++) {
    const v = videos[i % videos.length];
    const pass = Math.floor(i / videos.length);
    const fraction = pass === 0 ? 0.35 : Math.min(0.8, 0.35 + pass * 0.25);
    const start = Math.max(0, Math.min(v.durationSeconds - 1.7, v.durationSeconds * fraction));
    slots.push({ resourceId: v.resourceId, startSeconds: Math.round(start * 1000) / 1000 });
  }
  return slots;
}

function createScript(cfg) {
  return [
    core(cfg),
    "const d=await p.createDraft({name:cfg.name});",
    "await d.insertResource({resourceId:cfg.intro.resourceId,sourceRange:{startSeconds:cfg.intro.startSeconds,endSeconds:cfg.intro.startSeconds+5}});",
    "await d.setFrameSize({width:cfg.canvas.w,height:cfg.canvas.h});",
    "const fps=(await d.meta()).fps,target=Math.round(cfg.introEnd*fps);",
    "const clips=await d.clips({trackScope:'main'}),end=Math.max(...clips.map(c=>c.endFrame));",
    "if(end<target)throw Error('Intro shorter than target');",
    "if(end>target)await d.remove(await d.rangeAtFrames(target,end),{tracks:'main'});",
    "const cur=(await d.clips({trackScope:'main'}))[0];",
    "const sz=cfg.intro.frameSize;if(cur&&sz?.width&&sz?.height){const fit=Math.min(cfg.canvas.w/sz.width,cfg.canvas.h/sz.height),cover=Math.max(cfg.canvas.w/sz.width,cfg.canvas.h/sz.height)/fit,pos=cfg.intro.pos;const patch:Record<string,any>={};if(cover>1.001)patch.scale={x:cover,y:cover};if(pos&&(pos.x||pos.y))patch.position={x:pos.x,y:pos.y};if(Object.keys(patch).length)await d.setClipTransform({clip:cur,...patch});}",
    "const commit=await d.commitAll('2026 Recap: create intro');",
    "return {draftId:commit.createdDraftId,fps,mainCount:1};"
  ].join("\n");
}

function batchScript(cfg) {
  return [
    core(cfg),
    "const d=selects.draft(cfg.draftId);const fps=(await d.meta()).fps;",
    "let cs=await d.clips({trackScope:'main'}),count=cs.length;",
    "if(count>cfg.end)throw Error('Draft contains more clips than expected');",
    "for(let i=Math.max(count,cfg.start);i<cfg.end;i++){",
    "const row=cfg.placements[i],slot=cfg.slots[row.slot-1],media=cfg.media[slot.resourceId];",
    "if(!media)throw Error('Missing footage for slot '+row.slot);",
    "cs=await d.clips({trackScope:'main'});const before=Math.max(...cs.map(c=>c.endFrame));",
    "const wanted=Math.round(row.endSeconds*fps),n=wanted-before;",
    "if(n<1)throw Error('Invalid timing at placement '+i);",
    "const start=slot.startSeconds,sourceEnd=start+(n+3)/fps;",
    "if(sourceEnd>media.durationSeconds)throw Error('Source too short for slot '+row.slot);",
    "await d.insertResource({resourceId:slot.resourceId,sourceRange:{startSeconds:start,endSeconds:sourceEnd}});",
    "cs=await d.clips({trackScope:'main'});const actual=Math.max(...cs.map(c=>c.endFrame));",
    "if(actual<wanted)throw Error('Clip short after conform at slot '+row.slot);",
    "if(actual>wanted)await d.remove(await d.rangeAtFrames(wanted,actual),{tracks:'main'});",
    "cs=await d.clips({trackScope:'main'});const c=[...cs].reverse().find(x=>x.resourceId===slot.resourceId);",
    "const sz=media.frameSize;if(c&&sz?.width&&sz?.height){const fit=Math.min(cfg.canvas.w/sz.width,cfg.canvas.h/sz.height),cover=Math.max(cfg.canvas.w/sz.width,cfg.canvas.h/sz.height)/fit,pos=slot.pos;const patch:Record<string,any>={};if(cover>1.001)patch.scale={x:cover,y:cover};if(pos&&(pos.x||pos.y))patch.position={x:pos.x,y:pos.y};if(Object.keys(patch).length)await d.setClipTransform({clip:c,...patch});}",
    "}",
    "if((await d.clips({trackScope:'main'})).length===count)return {draftId:cfg.draftId,mainCount:count,unchanged:true};",
    "const commit=await d.commitAll('2026 Recap: add footage batch');",
    "return {draftId:cfg.draftId,mainCount:(await d.clips({trackScope:'main'})).length,commitId:commit.commitId};"
  ].join("\n");
}

function finishScript(cfg) {
  return [
    core(cfg),
    "const d=selects.draft(cfg.draftId),fps=(await d.meta()).fps;",
    "const main=await d.clips({trackScope:'main'}),end=Math.max(...main.map(c=>c.endFrame));",
    "await d.setAudioTracks({target:await d.rangeAtFrames(0,end),audioSourceIndexes:[]});",
    "const all=await d.clips({trackScope:'all'});",
    "if(!all.some(c=>c.resourceId===cfg.audioId))await d.overlayResource({resource:p.resource(cfg.audioId),over:await d.rangeAtFrames(0,end)});",
    "const graphics=await d.motionGraphics();",
    "if(!graphics.some(g=>g.name==='2026 Recap title'))await d.addMotionGraphic({label:'2026 Recap title',tsxCode:cfg.titleCode,parameters:{top:'thank you',year:'2026',scale:cfg.canvas.w/1080},editableParameters:[{key:'top',label:'Top line',type:'text',defaultValue:'thank you'},{key:'year',label:'Year',type:'text',defaultValue:'2026'}],within:await d.rangeAtFrames(0,Math.round(cfg.introEnd*fps))});",
    "if(cfg.full&&!graphics.some(g=>g.name==='2026 Recap fade')){const a=Math.min(end-2,Math.round(60.55*fps));await d.addMotionGraphic({label:'2026 Recap fade',tsxCode:cfg.fadeCode,within:await d.rangeAtFrames(a,end)});}",
    "const commit=await d.commitAll('2026 Recap: add fixed soundtrack and title');",
    "return {draftId:cfg.draftId,endFrames:end,mainCount:main.length,commitId:commit.commitId};"
  ].join("\n");
}

async function ensureAudio(sdk, projectId) {
  let r = await sdk.runScript({
    summary:"Find fixed soundtrack",
    script:core({projectId}) + "const r=await p.resources();return r.filter(x=>x.type==='Audio'&&(x.name===cfg.fixed||x.name===cfg.original)).map(x=>({id:x.resourceId,name:x.name,status:x.status}));".replace("cfg.fixed",embedded(AUDIO_NAME)).replace("cfg.original",embedded(AUDIO_SOURCE_NAME))
  });
  let found = scriptResult(r);
  if (found.length) return found.find((x) => x.name === AUDIO_NAME)?.id || found[0].id;
  const path = shellResult(await sdk.runShell({
    summary:"Locate fixed soundtrack",
    command:'printf "%s" "$SELECTS_USER_SKILLS_ROOT/' + SLUG + '/assets/' + AUDIO_NAME + '"'
  }));
  r = await sdk.runScript({
    summary:"Import fixed soundtrack",allowCommit:true,
    script:core({projectId,path}) + "return await p.importFiles({paths:[cfg.path]});"
  });
  let imported = scriptResult(r).addedResourceIds;
  if (!imported?.length) {
    const alternate = shellResult(await sdk.runShell({
      summary:"Prepare fixed soundtrack",
      command:'cp "$SELECTS_USER_SKILLS_ROOT/' + SLUG + '/assets/' + AUDIO_NAME + '" "$HOME/Downloads/' + AUDIO_NAME + '" && printf "%s" "$HOME/Downloads/' + AUDIO_NAME + '"'
    }));
    r = await sdk.runScript({
      summary:"Import fixed soundtrack",allowCommit:true,
      script:core({projectId,path:alternate}) + "return await p.importFiles({paths:[cfg.path]});"
    });
    imported = scriptResult(r).addedResourceIds;
  }
  if (!imported?.length) throw new Error("Could not import the bundled soundtrack");
  const id = imported[0];
  r = await sdk.runScript({
    summary:"Analyze fixed soundtrack",allowCommit:true,
    script:core({projectId,id}) + "return await p.startAnalysis({resourceIds:[cfg.id]});"
  });
  scriptResult(r);
  for (let attempt=0;attempt<60;attempt++) {
    await new Promise((resolve) => setTimeout(resolve,2000));
    r = await sdk.runScript({
      summary:"Check soundtrack analysis",
      script:core({projectId,id}) + "const x=(await p.resources()).find(v=>v.resourceId===cfg.id);return {status:x?.status};"
    });
    const status = scriptResult(r).status;
    if (status === "analyzingSucceeded") return id;
    if (status === "analyzingFailed" || status === "samplingFailed") throw new Error("Soundtrack analysis failed: " + status);
  }
  throw new Error("Soundtrack analysis is still running. Wait for it to finish, then create the Draft again.");
}


// Builds the recap Draft: the intro, the 242 fast cuts in batches, then the
// soundtrack and title. `slots` holds the intro and 159 cut sources; `byId`
// the videos they name. Resolves the new Draft's id, name and clip count.
async function buildRecap(sdk,{projectId,slots,byId,intro,mode,canvas=canvasOf("vertical"),onProgress=(_count,_limit)=>{},onStep=(_kind,_to,_limit)=>{}}) {
  // Steps are reported before the call that performs them, so a long script
  // still leaves something on screen saying what is happening.
  onStep("timing");
  const manifestText = shellResult(await sdk.runShell({
    summary:"Read recap timing",
    command:'cat "$SELECTS_USER_SKILLS_ROOT/' + SLUG + '/timing.json"',
    maxOutputBytes:48000
  }));
  const manifest = JSON.parse(manifestText);
  if (manifest.placements?.length !== 243) throw new Error("Template timing is incomplete");
  onStep("audio");
  const audioId = await ensureAudio(sdk, projectId);
  const name = "2026 Recap — " + (mode === "sample" ? "12s sample " : "") + new Date().toLocaleString();
  onStep("intro");
  let r = await sdk.runScript({
    summary:"Create recap intro",allowCommit:true,
    script:createScript({projectId,name,intro,canvas,introEnd:manifest.placements[1].startSeconds})
  });
  const draftId = scriptResult(r).draftId;
  if (!draftId) throw new Error("Created Draft ID missing");
  const limit = mode === "sample" ? SAMPLE_CUTS : manifest.placements.length;
  for (let end=1+BUILD_BATCH;end<limit+BUILD_BATCH;end+=BUILD_BATCH) {
    const to = Math.min(end,limit);
    if (to <= 1) break;
    onStep("clips", to, limit);
    r = await sdk.runScript({
      summary:"Add recap footage",allowCommit:true,
      script:batchScript({projectId,draftId,canvas,start:1,end:to,placements:manifest.placements,slots,media:byId})
    });
    const out = scriptResult(r);
    onProgress(out.mainCount, limit);
    if (to === limit) break;
  }
  onStep("finish");
  r = await sdk.runScript({
    summary:"Finish recap Draft",allowCommit:true,
    script:finishScript({projectId,draftId,audioId,canvas,introEnd:manifest.placements[1].startSeconds,full:mode==="full",titleCode:TITLE_CODE,fadeCode:FADE_CODE})
  });
  const out = scriptResult(r);
  return {draftId,name,mainCount:out.mainCount};
}

// Every video of the project at least 1.7 s long, with its path, length and size.
const allVideosScript = (projectId) => core({projectId}) +
  "const items=[];const walk=(nodes)=>{for(const n of nodes||[]){if(n.type==='dir')walk(n.children);else if(n.type==='video'&&n.resourceId)items.push({resourceId:n.resourceId,name:n.name,path:n.path,durationSeconds:n.durationSeconds,frameSize:n.frameSize});}};const r=await p.sourceFiles();if('fileTree' in r)walk(r.fileTree);else for(const f of r.folders){const page=await p.sourceFiles({folder:f.name});if('fileTree' in page)walk(page.fileTree);}return items;";

const TEMPLATE_FAILED = "2026 Recap couldn't make the timeline. Try again.";

// A Clip highlights run (`context.template`): the intro and clips picked in
// the app, cut in full to the soundtrack, built out of sight, reported once.
function TemplateRun({ sdk, context }) {
  const runId = context.template?.runId;
  const [status, setStatus] = React.useState("Making your recap\u2026");
  const started = React.useRef(null), alive = React.useRef(true), latest = React.useRef(context);
  latest.current = context;
  React.useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  React.useEffect(() => {
    if (!runId || started.current === runId) return;
    started.current = runId;
    const live = () => alive.current && latest.current.template?.runId === runId;
    let ended = false;
    const finish = (result) => { if (ended) return; ended = true; if (!live()) return; try { sdk.finishTemplate(result); } catch (_) {} };
    (async () => {
      const template = context.template, projectId = context.projectId;
      if (!projectId) throw new Error("Open a project, then try again.");
      const introPick = (template.inputs?.intro || []).find((x) => x?.resourceId);
      const clipPicks = (template.inputs?.clips || []).filter((x) => x?.resourceId);
      if (!introPick || !clipPicks.length) throw new Error("Pick an intro and at least one clip, then try again.");
      const found = scriptResult(await sdk.runScript({ script: allVideosScript(projectId), summary: "Read footage" }));
      const byId = Object.fromEntries(found.map((v) => [v.resourceId, v]));
      const introVideo = byId[introPick.resourceId];
      if (!introVideo || !(introVideo.durationSeconds >= 5)) throw new Error("Pick an intro clip at least 5 seconds long.");
      const videos = clipPicks.map((x) => byId[x.resourceId]);
      const short = clipPicks.find((x, i) => !(videos[i]?.durationSeconds >= 1.7));
      if (short) throw new Error((short.name || "A picked clip") + " is shorter than 1.7 seconds. Pick longer clips.");
      const intro = { resourceId: introVideo.resourceId, startSeconds: 0 };
      const slots = buildSlots(videos, intro);
      if (!live()) return;
      setStatus("Cutting your clips to the beat\u2026");
      // Only the picked videos go into each batch script.
      const media = Object.fromEntries([introVideo, ...videos].map((v) => [v.resourceId, v]));
      const made = await buildRecap(sdk, { projectId, slots, byId: media, intro: { ...intro, frameSize: introVideo.frameSize }, mode: "full" });
      finish({ sequenceId: made.draftId });
    })().catch((e) => {
      console.warn("[recap-2026] template run failed:", e);
      const said = String(e?.message || "");
      finish({ error: said && said.length <= 160 && !/[\n{]/.test(said) ? said : TEMPLATE_FAILED });
    });
  }, [runId]);
  return <small>{status}</small>;
}

export default function Panel(props) {
  return props.context?.template ? <TemplateRun {...props} /> : <RecapPanel {...props} />;
}

function RecapPanel({ sdk, context, ui }) {
  const t = WORDS[context.language] || WORDS.en;
  const projectId = context.projectId;
  const [orientation, setOrientation] = React.useState("vertical");
  const [subjects, setSubjects] = React.useState({});
  const [reframeRun, setReframeRun] = React.useState(null);
  const [reframeNote, setReframeNote] = React.useState("");
  const [reframeScope, setReframeScope] = React.useState("sample");
  const [buildStep, setBuildStep] = React.useState(null);
  const [activity, setActivity] = React.useState(null);
  const [folders, setFolders] = React.useState([]);
  const [selectedFolders, setSelectedFolders] = React.useState([]);
  const [videos, setVideos] = React.useState([]);
  const [excludedIds, setExcludedIds] = React.useState([]);
  const [introChoice, setIntroChoice] = React.useState(null);
  const [loadedKey, setLoadedKey] = React.useState(null);
  const [slots, setSlots] = React.useState([]);
  const [editSlot, setEditSlot] = React.useState(2);
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [excludeOpen, setExcludeOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");
  const [galleryPage, setGalleryPage] = React.useState(0);
  const [thumbnails, setThumbnails] = React.useState({});
  const thumbnailCache = React.useRef({});

  React.useEffect(() => {
    if (!projectId) return;
    let live = true;
    setVideos([]);setSlots([]);setSelectedFolders([]);setExcludedIds([]);setIntroChoice(null);setLoadedKey(null);setMessage(t.loading);setError("");
    setGalleryPage(0);setThumbnails({});thumbnailCache.current={};
    const script = core({projectId}) +
      "const r=await p.sourceFiles();if(!('fileTree' in r))return r.folders.map(x=>({name:x.name,count:x.videoCount}));const out=[];const rootCount=r.fileTree.filter(x=>x.type==='video').length;if(rootCount)out.push({name:'(root)',count:rootCount});for(const x of r.fileTree){if(x.type==='dir')out.push({name:x.name,count:x.children.filter(y=>y.type==='video').length});}return out;";
    sdk.runScript({script,summary:"List footage folders"}).then((r) => {
      if (!live) return;
      const found = scriptResult(r).filter((x) => x.count > 0);
      found.sort((a,b) => b.count-a.count);
      let initial=found[0]?[found[0].name]:[];
      try {
        const saved=JSON.parse(localStorage.getItem(SLUG+":"+projectId+":folders")||"null");
        if(Array.isArray(saved))initial=found.map((x)=>x.name).filter((name)=>saved.includes(name));
      }catch(_){}
      setFolders(found);setSelectedFolders(initial);setMessage("");
    }).catch((e) => {if(live){setError(String(e.message || e));setMessage("");}});
    return () => {live = false;};
  }, [projectId]);

  React.useEffect(() => {
    if (!projectId || !folders.length) return;
    let live = true;
    setLoadedKey(null);
    setMessage(t.loading);setError("");setGalleryPage(0);
    setThumbnails({});thumbnailCache.current={};
    const script = core({projectId,folders:folders.map((x)=>x.name)}) +
      "const out=[];for(const name of cfg.folders){const r=await p.sourceFiles({folder:name});if(!('fileTree' in r))throw Error('Footage folder returned a summary');for(const x of r.fileTree){if(x.type==='video'&&x.durationSeconds>=1.7)out.push({resourceId:x.resourceId,name:x.name,path:x.path,durationSeconds:x.durationSeconds,frameSize:x.frameSize,folderName:name});}}return out;";
    sdk.runScript({script,summary:"Read footage folders"}).then((r) => {
      if (!live) return;
      const found = [...new Map(scriptResult(r).map((v)=>[v.resourceId,v])).values()].sort((a,b) => a.name.localeCompare(b.name));
      setVideos(found);
      const key=SLUG+":"+projectId+":"+selectedFolders.join("|");
      let intro=null;
      let excluded=[];
      let next=[];
      try {
        const saved = JSON.parse(localStorage.getItem(key) || "null");
        const savedIntro=JSON.parse(localStorage.getItem(SLUG+":"+projectId+":intro")||"null")||JSON.parse(localStorage.getItem(key+":intro")||"null")||(Array.isArray(saved)?saved[0]:null);
        const introMedia=found.find((v)=>v.resourceId===savedIntro?.resourceId&&v.durationSeconds>=5);
        if(introMedia)intro={resourceId:introMedia.resourceId,startSeconds:Math.max(0,Math.min(introMedia.durationSeconds-5,savedIntro.startSeconds||0))};
        const storedOrientation=localStorage.getItem(SLUG+":"+projectId+":orientation");
        if(storedOrientation&&CANVAS[storedOrientation])setOrientation(storedOrientation);
        const storedSubjects=JSON.parse(localStorage.getItem(SLUG+":"+projectId+":subjects")||"{}");
        if(storedSubjects&&typeof storedSubjects==="object")setSubjects(storedSubjects);
        const storedExcluded=JSON.parse(localStorage.getItem(SLUG+":"+projectId+":excluded")||"[]");
        if(Array.isArray(storedExcluded))excluded=storedExcluded.filter((id)=>found.some((v)=>v.resourceId===id));
        const available=found.filter((v)=>selectedFolders.includes(v.folderName)&&!excluded.includes(v.resourceId));
        if (Array.isArray(saved) && saved.length === 160 && saved.every((x,index) => index===0?x.resourceId===intro?.resourceId:available.some((v)=>v.resourceId===x.resourceId))) next = saved.map((slot,index)=>{
          const media=found.find((v)=>v.resourceId===slot.resourceId);
          const max=Math.max(0,(media?.durationSeconds||0)-(index===0?5:1.7));
          return {...slot,startSeconds:Math.max(0,Math.min(max,slot.startSeconds||0))};
        });
      } catch (_) {}
      if(!intro){const first=found.find((v)=>v.durationSeconds>=5);intro=first?{resourceId:first.resourceId,startSeconds:0}:null;}
      if(!next.length)next=buildSlots(found.filter((v)=>selectedFolders.includes(v.folderName)&&!excluded.includes(v.resourceId)),intro);
      setExcludedIds(excluded);
      setIntroChoice(intro);setSlots(next);setLoadedKey(projectId);setMessage(found.length ? t.ready : t.noVideo);
    }).catch((e) => {if(live){setError(String(e.message || e));setMessage("");}});
    return () => {live = false;};
  }, [projectId, folders.map((x)=>x.name).join("|")]);

  React.useEffect(() => {
    if (!projectId || loadedKey!==projectId) return;
    const key=SLUG+":"+projectId+":"+selectedFolders.join("|");
    try {
      localStorage.setItem(SLUG+":"+projectId+":excluded",JSON.stringify(excludedIds));
      localStorage.setItem(SLUG+":"+projectId+":intro",JSON.stringify(introChoice));
      if(slots.length===160)localStorage.setItem(key,JSON.stringify(slots));
    } catch (_) {}
  }, [projectId, selectedFolders.join("|"), loadedKey, introChoice, excludedIds, slots]);

  const current = slots[editSlot-1];
  const currentVideo = videos.find((v) => v.resourceId === current?.resourceId);
  const introVideo=videos.find((v)=>v.resourceId===introChoice?.resourceId);
  const folderVideos=videos.filter((v)=>selectedFolders.includes(v.folderName));
  const selectedVideos=folderVideos.filter((v)=>!excludedIds.includes(v.resourceId));
  const changeSlot = (patch) => setSlots((old) => old.map((x,i) => i === editSlot-1 ? {...x,...patch} : x));
  const changeIntro=(patch)=>{
    const next={...introChoice,...patch};
    setIntroChoice(next);
    setSlots((old)=>old.length===160?[next,...old.slice(1)]:buildSlots(selectedVideos,next));
  };
  const toggleFolder=(name)=>{
    const next=selectedFolders.includes(name)?selectedFolders.filter((x)=>x!==name):folders.map((x)=>x.name).filter((x)=>selectedFolders.includes(x)||x===name);
    try{localStorage.setItem(SLUG+":"+projectId+":folders",JSON.stringify(next));}catch(_){}
    setSelectedFolders(next);
    setGalleryPage(0);
    setSlots(buildSlots(videos.filter((v)=>next.includes(v.folderName)&&!excludedIds.includes(v.resourceId)),introChoice));
  };
  const toggleExclusion=(id)=>{
    const next=excludedIds.includes(id)?excludedIds.filter((x)=>x!==id):[...excludedIds,id];
    setExcludedIds(next);
    setSlots(buildSlots(videos.filter((v)=>selectedFolders.includes(v.folderName)&&!next.includes(v.resourceId)),introChoice));
  };
  const clearExclusions=()=>{
    setExcludedIds([]);
    setSlots(buildSlots(folderVideos,introChoice));
  };
  // Cuts this output shape actually crops, and how many of them already have a
  // reading. The progress bar and the count both speak about these.
  const framable = React.useMemo(() => {
    const canvas = canvasOf(orientation);
    const byId = Object.fromEntries(videos.map((v) => [v.resourceId, v]));
    const keys = new Set(), skipped = new Set();
    const scopeLimit = reframeScope === "sample" ? Math.min(SAMPLE_CUTS, slots.length) : slots.length;
    for (const slot of slots.slice(0, scopeLimit)) {
      const media = byId[slot.resourceId];
      if (!media?.path) continue;
      (needsReframe(media.frameSize, canvas) ? keys : skipped).add(reframeKey(slot));
    }
    let framed = 0;
    keys.forEach((key) => { if (subjects[key]) framed += 1; });
    return { total: keys.size, framed, skipped: skipped.size };
  }, [slots, videos, orientation, subjects, reframeScope]);

  async function runReframe(redo) {
    const projectId = context.projectId;
    if (!projectId || busy || !slots.length) return;
    const byId = Object.fromEntries(videos.map((v) => [v.resourceId, v]));
    const targets = [], seen = new Set();
    const scopeLimit = reframeScope === "sample" ? Math.min(SAMPLE_CUTS, slots.length) : slots.length;
    slots.slice(0, scopeLimit).forEach((slot, index) => {
      const media = byId[slot.resourceId];
      if (!media?.path) return;
      if (!needsReframe(media.frameSize, canvasOf(orientation))) return;
      const key = reframeKey(slot);
      if (seen.has(key)) return;
      if (!redo && subjects[key]) return;
      seen.add(key);
      // Most cuts are a fifth of a second long, so read the middle of the cut
      // that actually plays — not a moment the viewer never sees.
      const cut = slotTiming[index + 1]?.maxDuration;
      const offset = Number.isFinite(cut) && cut > 0 ? cut / 2 : 0.1;
      const duration = media.durationSeconds || 0;
      targets.push({ key, path: media.path, time: Math.max(0, Math.min(duration - 0.1, (slot.startSeconds || 0) + offset)) });
    });
    if (!targets.length) { setReframeNote(t.reframeNone); return; }
    setBusy(true); setActivity("reframe"); setError(""); setReframeNote("");
    setReframeRun({ running: true, failed: 0, trouble: "" });
    const found = redo ? {} : { ...subjects };
    const total = targets.length;
    let failed = 0, trouble = "";
    const note = (text) => { if (!trouble) trouble = text; };

    // A batch that comes back over the shell's reply limit is retried at lower
    // quality, then split in half and pushed back on the queue. Nothing here
    // depends on the user's footage being small.
    const queue = [];
    for (let i = 0; i < targets.length; i += REFRAME_BATCH) queue.push(targets.slice(i, i + REFRAME_BATCH));

    const worker = async () => {
      while (queue.length) {
        const chunk = queue.shift();
        let sheet = null, lastNote = "";
        for (const quality of [TILE_Q, 20, 28]) {
          try {
            sheet = await sdk.runShell({ summary: "Capture reframe sheet", command: reframeSheetCommand(chunk, quality), maxOutputBytes: SHELL_LIMIT, timeoutMs: 120000 });
          } catch (e) { lastNote = "frame capture: " + String(e?.message || e); sheet = null; break; }
          if (!sheet.truncated) break;
          lastNote = "contact sheet above the " + SHELL_LIMIT + " byte shell reply limit";
          sheet = null;
        }
        if (!sheet) {
          if (chunk.length > 1) {
            const mid = Math.ceil(chunk.length / 2);
            queue.unshift(chunk.slice(mid));
            queue.unshift(chunk.slice(0, mid));
            continue;
          }
          failed += chunk.length; note(lastNote || "frame capture failed"); continue;
        }
        if (sheet.isError || sheet.exitCode !== 0 || !sheet.stdout.trim()) {
          failed += chunk.length;
          note("frame capture exit " + sheet.exitCode + " " + String(sheet.stderr || sheet.output || "").slice(0, 160));
          continue;
        }
        // First line reports how many of this batch's frames were really grabbed.
        const lines = sheet.stdout.split("\n");
        const report = (lines[0] || "").match(/^OK (\d+) ?(.*)$/);
        const base64 = (report ? lines.slice(1).join("") : sheet.stdout).trim();
        if (report && Number(report[1]) === 0) {
          failed += chunk.length;
          note("ffmpeg could not read the footage: " + (report[2] || "no detail"));
          continue;
        }
        if (!base64) { failed += chunk.length; note("empty contact sheet"); continue; }
        let parsed = {};
        try {
          const reply = await sdk.askAI({
            prompt: REFRAME_PROMPT(chunk.length),
            images: [{ dataUrl: "data:image/jpeg;base64," + base64, name: "frames.jpg" }],
            timeoutMs: 90000,
          });
          parsed = parseReframeReply(reply.text, chunk.length);
          if (!Object.keys(parsed).length) note("the assistant returned no usable numbers");
        } catch (e) { failed += chunk.length; note("askAI: " + String(e?.message || e)); continue; }
        chunk.forEach((item, n) => { if (parsed[n]) found[item.key] = parsed[n]; });
        setSubjects({ ...found });
        try { localStorage.setItem(SLUG + ":" + projectId + ":subjects", JSON.stringify(found)); } catch (_) {}
      }
    };
    try {
      await Promise.all(Array.from({ length: Math.min(REFRAME_WORKERS, queue.length) }, worker));
      setReframeRun({ running: false, failed, trouble });
      setReframeNote(failed ? t.reframeDone + " — " + failed + "/" + total + " skipped. " + trouble : t.reframeDone);
    } catch (e) {
      setError(String(e?.message || e));
    } finally { setReframeRun({ running: false, failed, trouble }); setActivity(null); setBusy(false); }
  }

  function nudgeSubject(slot, value) {
    const key = reframeKey(slot);
    const next = { ...subjects, [key]: { fx: Math.max(0, Math.min(1, value / 100)), fy: subjects[key]?.fy ?? 0.5 } };
    setSubjects(next);
    try { localStorage.setItem(SLUG + ":" + context.projectId + ":subjects", JSON.stringify(next)); } catch (_) {}
  }

  const [slotTiming,setSlotTiming]=React.useState({});
  const [timingError,setTimingError]=React.useState("");
  React.useEffect(()=>{
    if(!advancedOpen||Object.keys(slotTiming).length)return;
    let live=true;
    sdk.runShell({summary:"Read fast-cut timings",command:'cat "$SELECTS_USER_SKILLS_ROOT/'+SLUG+'/timing.json"',maxOutputBytes:48000})
      .then((result)=>{
        if(!live)return;
        const manifest=JSON.parse(shellResult(result));
        const bySlot={};
        for(const row of manifest.placements){
          if(row.slot<2)continue;
          const prior=bySlot[row.slot];
          if(!prior)bySlot[row.slot]={firstStart:row.startSeconds,maxDuration:row.endSeconds-row.startSeconds};
          else prior.maxDuration=Math.max(prior.maxDuration,row.endSeconds-row.startSeconds);
        }
        setSlotTiming(bySlot);setTimingError("");
      }).catch((error)=>{if(live)setTimingError(String(error.message||error));});
    return ()=>{live=false;};
  },[advancedOpen]);

  React.useEffect(() => {
    if(!excludeOpen)return;
    let live=true;
    const pageVideos=folderVideos.slice(galleryPage*gallerySize,(galleryPage+1)*gallerySize);
    (async () => {
      for(let i=0;i<pageVideos.length;i+=4){
        await Promise.all(pageVideos.slice(i,i+4).map(async (video) => {
          const at=Math.min(video.durationSeconds*0.35,video.durationSeconds-0.1);
          const key=thumbnailKey(video,at);
          if(thumbnailCache.current[key]!==undefined)return;
          thumbnailCache.current[key]=null;
          let url=null;
          try{url=await captureThumbnail(sdk,video,at);}catch(_){}
          thumbnailCache.current[key]=url;
          if(live)setThumbnails((old)=>({...old,[key]:url}));
        }));
      }
    })();
    return ()=>{live=false;};
  },[excludeOpen,videos,selectedFolders.join("|"),galleryPage]);

  async function make(mode) {
    if (!projectId || slots.length !== 160 || busy || loadedKey!==projectId) return;
    setBusy(true);setActivity(mode);setError("");setMessage("");
    const canvas = canvasOf(orientation);
    // Steps are announced before the call that performs them, so a long script
    // still leaves something on screen saying what is happening.
    const limit = mode === "sample" ? 33 : 243;
    const batches = Math.max(1, Math.ceil((limit - 1) / BUILD_BATCH));
    const totalSteps = 3 + batches + 1;
    let step = 0;
    const announce = (label) => { step += 1; setBuildStep({ label, done: step, total: totalSteps }); };
    try {
      if (!introVideo || !selectedVideos.length) throw new Error(t.noVideo);
      const byId = Object.fromEntries(videos.map((v) => [v.resourceId,v]));
      const withPos = slots.map((slot)=>{
        const media=byId[slot.resourceId];
        const subject=subjects[reframeKey(slot)];
        return {...slot,pos:subject?reframePosition(subject,media?.frameSize,canvas):null};
      });
      const intro = {...withPos[0],frameSize:byId[slots[0].resourceId]?.frameSize};
      if ((byId[intro.resourceId]?.durationSeconds || 0)-intro.startSeconds < 5) throw new Error(t.invalid);
      const STEP = {timing:t.stepTiming,audio:t.stepAudio,intro:t.stepIntro,finish:t.stepFinish};
      const {name,mainCount} = await buildRecap(sdk,{projectId,slots:withPos,byId,intro,mode,canvas,
        onStep:(kind,to,lim)=>announce(kind==="clips" ? t.stepClips + " " + to + "/" + lim : STEP[kind])});
      setMessage("Draft created: " + name + " (" + mainCount + " video clips)");
    } catch (e) {
      setError(String(e.message || e));
    } finally {setBuildStep(null);setActivity(null);setBusy(false);}
  }

  if (!projectId) return <ui.Message tone="error">{t.noProject}</ui.Message>;
  return <div>
    <ui.Section title="2026 Recap">
      <ui.Stack>
        <p>{t.audio}</p>
        <p>{t.choose}</p>
      </ui.Stack>
    </ui.Section>
    {videos.length>0 && <ui.Section title={t.ready}>
      <ui.Stack>
        <ui.Select label={t.intro} value={introChoice?.resourceId||null} onChange={(resourceId)=>changeIntro({resourceId,startSeconds:0})} options={videos.filter((x)=>x.durationSeconds>=5).map((x)=>({value:x.resourceId,label:x.name}))} disabled={busy}/>
        {introVideo&&<SourceWindowPicker sdk={sdk} ui={ui} video={introVideo} startSeconds={introChoice?.startSeconds||0} windowSeconds={4.7} sourceMargin={0.3} onChange={(startSeconds)=>changeIntro({startSeconds})} disabled={busy} label={t.preview} hint={t.previewHint} loading={t.loading} compact/>}
      </ui.Stack>
    </ui.Section>}
    <ui.Section title={t.folderPick}>
      <ui.Stack>
        <small>{t.folderGuide}</small>
        {folders.map((item)=><label key={item.name} style={{display:"flex",alignItems:"center",gap:8}}>
          <input type="checkbox" checked={selectedFolders.includes(item.name)} disabled={busy} onChange={()=>toggleFolder(item.name)}/>
          <span>{item.name} ({item.count})</span>
        </label>)}
        <small>{t.footageCount}: {selectedVideos.length} · {t.quickRule}</small>
        {selectedVideos.length===0&&loadedKey===projectId&&<ui.Message tone="muted">{t.noneIncluded}</ui.Message>}
        <details><summary>{t.rules}</summary><p>{t.poolRule}</p><p>{t.shortNotice}</p></details>
      </ui.Stack>
    </ui.Section>
    <ui.Section title={t.shape}>
      <ui.Stack>
        <ui.Segmented label={t.shape} value={orientation} disabled={busy}
          onChange={(value)=>{setOrientation(value);try{localStorage.setItem(SLUG+":"+context.projectId+":orientation",value);}catch(_){}}}
          options={[{value:"vertical",label:t.shapeVertical},{value:"horizontal",label:t.shapeHorizontal},{value:"square",label:t.shapeSquare}]} />
        <small>{t.shapeHint}</small>
      </ui.Stack>
    </ui.Section>
    {orientation!=="horizontal" && framable.total>0 && <ui.Section title={t.reframe}>
      <ui.Stack>
        <small>{t.reframeHint}</small>
        <ui.Segmented label={t.reframeScope} value={reframeScope} disabled={busy}
          onChange={setReframeScope}
          options={[{value:"sample",label:t.reframeScopeSample},{value:"full",label:t.reframeScopeFull}]} />
        {/* One bar carries the state whether or not a run is going. */}
        <ui.Progress value={framable.total ? framable.framed / framable.total : 0}
          label={(reframeRun && reframeRun.running ? t.reframeBusy + " " : "") + framable.framed + t.reframeOf + framable.total + " " + t.reframeState
            + (reframeRun && reframeRun.failed ? " · " + reframeRun.failed + " skipped" : "")} />
        {framable.skipped>0 && <small>{framable.skipped} {t.reframeUncropped}</small>}
        <ui.Actions>
          <ui.Button variant="secondary" busy={activity==="reframe"} busyLabel={t.reframeBusy} disabled={busy||framable.framed>=framable.total} onClick={()=>runReframe(false)}>{t.reframeRun}</ui.Button>
          <ui.Button variant="ghost" disabled={busy||!framable.total} onClick={()=>runReframe(true)}>{t.reframeRedo}</ui.Button>
        </ui.Actions>
        {reframeNote && <ui.Message tone={reframeNote.indexOf("skipped")>=0?"error":"success"}>{reframeNote}</ui.Message>}
      </ui.Stack>
    </ui.Section>}
    {folderVideos.length>0 && <details onToggle={(event)=>setExcludeOpen(event.currentTarget.open)}>
      <summary>{t.gallery} {excludedIds.filter((id)=>folderVideos.some((v)=>v.resourceId===id)).length>0?"("+excludedIds.filter((id)=>folderVideos.some((v)=>v.resourceId===id)).length+")":""}</summary>
      <ui.Section title={t.gallery}>
      <small>{t.galleryHint}</small>
      <small>{t.rebuildHint}</small>
      {excludedIds.length>0&&<ui.Actions><ui.Button variant="secondary" disabled={busy} onClick={clearExclusions}>{t.selectAll}</ui.Button></ui.Actions>}
      <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:8}}>
        {folderVideos.slice(galleryPage*gallerySize,(galleryPage+1)*gallerySize).map((video) => {
          const at=Math.min(video.durationSeconds*0.35,video.durationSeconds-0.1);
          const url=thumbnails[thumbnailKey(video,at)];
          const active=excludedIds.includes(video.resourceId);
          return <label key={video.resourceId} style={{display:"flex",alignItems:"center",gap:8,padding:4,border:active?"2px solid var(--panel-accent)":"1px solid var(--panel-border)",borderRadius:6,minWidth:0}}>
              <input type="checkbox" checked={excludedIds.includes(video.resourceId)} disabled={busy} onChange={()=>toggleExclusion(video.resourceId)}/>
              {url?<img src={url} alt="" style={{width:84,height:52,objectFit:"contain",background:"#111",display:"block",flexShrink:0}}/>:<div style={{width:84,height:52,background:"#111",flexShrink:0}}/>}
              <span style={{minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{video.name}</span>
          </label>;
        })}
      </div>
      <ui.Actions>
        <ui.Button variant="secondary" disabled={busy || galleryPage===0} onClick={()=>setGalleryPage((p)=>p-1)}>{t.previous}</ui.Button>
        <small>{galleryPage+1}/{Math.max(1,Math.ceil(folderVideos.length/gallerySize))}</small>
        <ui.Button variant="secondary" disabled={busy || (galleryPage+1)*gallerySize>=folderVideos.length} onClick={()=>setGalleryPage((p)=>p+1)}>{t.next}</ui.Button>
      </ui.Actions>
      </ui.Section>
    </details>}
    <details onToggle={(event)=>setAdvancedOpen(event.currentTarget.open)}>
      <summary>{t.advanced}</summary>
      {advancedOpen&&slots.length===160&&<ui.Section title={t.advanced}>
        <ui.Stack>
          <small>{t.advancedHint}</small>
          <ui.NumberField label={t.slot} value={editSlot-1} onChange={(v)=>setEditSlot(Math.max(2,Math.min(160,Math.round(v)+1)))} min={1} max={159} step={1} disabled={busy}/>
          {slotTiming[editSlot]&&<small>{t.outputAt}: {slotTiming[editSlot].firstStart.toFixed(2)}s · {slotTiming[editSlot].maxDuration.toFixed(2)}s</small>}
          {editSlot>=61&&editSlot<=143&&<small>{t.repeatsLater}</small>}
          <ui.Select label={t.video} value={current?.resourceId||null} onChange={(resourceId)=>changeSlot({resourceId,startSeconds:0})} options={selectedVideos.map((x)=>({value:x.resourceId,label:x.name}))} disabled={busy}/>
          {timingError&&<ui.Message tone="error">{timingError}</ui.Message>}
          {currentVideo&&slotTiming[editSlot]&&<SourceWindowPicker sdk={sdk} ui={ui} video={currentVideo} startSeconds={current?.startSeconds||0} windowSeconds={slotTiming[editSlot].maxDuration} sourceMargin={0.15} onChange={(startSeconds)=>changeSlot({startSeconds})} disabled={busy} label={t.sourceWindow} hint={t.advancedSourceHint} loading={t.loading}/>}
          {currentVideo&&orientation!=="horizontal"&&<ui.Stack gap={4}>
            <ui.Slider label={t.reframeNudge} min={0} max={100} step={1} disabled={busy}
              value={Math.round((subjects[reframeKey(current||{resourceId:"",startSeconds:0})]?.fx ?? 0.5)*100)}
              onChange={(value)=>current&&nudgeSubject(current,value)} />
            <small>{t.reframeNudgeHint}</small>
          </ui.Stack>}
        </ui.Stack>
      </ui.Section>}
    </details>
    <ui.Section title="Draft">
      <ui.Actions>
        <ui.Button variant="secondary" busy={activity==="sample"} busyLabel={t.progress} disabled={busy || slots.length !== 160 || loadedKey!==projectId} onClick={() => make("sample")}>{t.sample}</ui.Button>
        <ui.Button variant="primary" busy={activity==="full"} busyLabel={t.progress} disabled={busy || slots.length !== 160 || loadedKey!==projectId} onClick={() => make("full")}>{t.full}</ui.Button>
      </ui.Actions>
      {buildStep && <ui.Progress value={buildStep.done / buildStep.total}
        label={buildStep.label + " · " + buildStep.done + "/" + buildStep.total} />}
      {message && <ui.Message tone="muted">{message}</ui.Message>}
      {error && <ui.Message tone="error">{error}</ui.Message>}
    </ui.Section>
  </div>;
}
