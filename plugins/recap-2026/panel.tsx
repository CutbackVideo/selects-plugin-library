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

// media-duration:start
// Source-media seconds only: never derive these from a Draft's frame rate.
// Zero, missing, non-numeric and non-finite values are unknown, not short clips.
// This pure function is also serialized into read-only run_script queries.
function mediaDurationFact(resourceSeconds = null, treeSeconds = null) {
  if (typeof resourceSeconds === "number" && Number.isFinite(resourceSeconds) && resourceSeconds > 0) {
    return { durationSeconds: resourceSeconds, durationSource: "resource" };
  }
  if (typeof treeSeconds === "number" && Number.isFinite(treeSeconds) && treeSeconds > 0) {
    return { durationSeconds: treeSeconds, durationSource: "source-tree" };
  }
  return { durationSeconds: null, durationSource: "unknown" };
}

// Keep each row's identity, name and path together; do not mutate caller snapshots.
// The caller supplies its existing read-only host probe, not an import or analysis.
async function resolveMediaDurations(rows, probeSeconds) {
  const resolved = [];
  for (const row of rows) {
    let fact = mediaDurationFact(row.durationSeconds);
    if (fact.durationSeconds !== null) {
      fact.durationSource = row.durationSource || "provided";
    } else if (row.path) {
      try {
        const seconds = await probeSeconds(row.path);
        if (typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0) {
          fact = { durationSeconds: seconds, durationSource: "probe" };
        }
      } catch { /* A failed observation remains unknown. */ }
    }
    resolved.push({ ...row, ...fact });
  }
  return resolved;
}

function requireMediaDurations(rows) {
  const unknown = rows.find(row => mediaDurationFact(row.durationSeconds).durationSeconds === null);
  if (unknown) {
    throw Object.assign(new Error(`Could not read the duration of ${unknown.name || "a picked video"}. Try again.`), {
      code: "media-duration-unknown", resourceId: unknown.resourceId,
    });
  }
}
// media-duration:end

// panel-storage:start
// Keep writes ordered even across a panel remount; failed writes remain visible to callers.
const panelStorageClients = new WeakMap();
function panelStorage(sdk) {
  const storage = sdk?.storage;
  if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function" || typeof storage.removeItem !== "function") {
    throw new Error("Update Selects to use this plugin: sdk.storage is required.");
  }
  if (!panelStorageClients.has(storage)) {
    let tail = Promise.resolve();
    const enqueue = (operation) => {
      const pending = tail.then(operation);
      tail = pending.catch(() => {});
      return pending;
    };
    panelStorageClients.set(storage, {
      getItem: (key) => enqueue(() => storage.getItem(key)),
      setItem: (key, value) => enqueue(() => storage.setItem(key, value)),
      removeItem: (key) => enqueue(() => storage.removeItem(key)),
    });
  }
  return panelStorageClients.get(storage);
}
function withStoredPanel(Component, load) {
  return function StoredPanel(props) {
    const [state, setState] = React.useState(null);
    const [attempt, retry] = React.useState(0);
    React.useEffect(() => {
      let current = true;
      setState(null);
      Promise.resolve().then(() => load(panelStorage(props.sdk))).then(
        (saved) => { if (current) setState({sdk: props.sdk, saved}); },
        (error) => { if (current) setState({sdk: props.sdk, error: String(error?.message || error)}); },
      );
      return () => { current = false; };
    }, [props.sdk, attempt]);
    if (state?.error) return React.createElement("div", {role: "alert"}, state.error, React.createElement("button", {onClick: () => retry(n => n + 1)}, "Retry loading saved settings"));
    if (state?.sdk !== props.sdk) return React.createElement("div", {role: "status"}, "Loading saved settings…");
    return React.createElement(Component, {...props, saved: state.saved});
  };
}
// panel-storage:end


const SLUG = "recap-2026";
// The default song. The cut plan is measured from whichever song is used, so another file can replace it.
const AUDIO_NAME = "brighter-year-ahead.wav";
const TITLE_CODE = [
  "import React from 'react';",
  "export default function Graphic({data}) {",
  "return <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',color:'#fff',textAlign:'center',textShadow:'0 2px 14px rgba(0,0,0,.5)'}}>",
  "<div style={{fontFamily:'Georgia,serif',fontSize:56,fontStyle:'italic',lineHeight:1.2}}>{data.top}</div>",
  "<div style={{fontFamily:'Avenir Next,Segoe UI Black,Arial Black,sans-serif',fontSize:174,fontWeight:900,lineHeight:1}}>{data.year}</div>",
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
    restoreSelection: "예전 선택에 임시 번호가 사용됐거나 원본이 달라졌습니다. 기존 선택 기록은 보존했습니다. 인트로와 사용할 영상을 다시 골라주세요.",
    focusHint: "자동 얼굴 초점은 일부 프레임을 분석하므로 사람을 놓칠 수 있습니다. 완성된 구도를 확인하세요. 멀리 떨어진 여러 사람은 세로 화면에 모두 담기 어려울 수 있습니다.",
    folder: "\ud478\ud2f0\uc9c0 \ud3f4\ub354", intro: "\uc778\ud2b8\ub85c \uc601\uc0c1", slot: "\ube60\ub978 \ucef7 \ubc88\ud638 (1\u2013157)",
    video: "\uc774 \ucef7\uc5d0 \uc0ac\uc6a9\ud560 \uc601\uc0c1", start: "\uc6d0\ubcf8 \uc601\uc0c1 \uc2dc\uc791\uc810", sample: "12\ucd08 \uc0d8\ud50c \ub9cc\ub4e4\uae30",
    full: "\uc804\uccb4 Draft \ub9cc\ub4e4\uae30", loading: "\ud478\ud2f0\uc9c0 \ubd88\ub7ec\uc624\ub294 \uc911…",
    noProject: "Selects \ud504\ub85c\uc81d\ud2b8\ub97c \uba3c\uc800 \uc5f4\uc5b4\uc8fc\uc138\uc694.",
    noVideo: "\uc0ac\uc6a9\ud560 \uc601\uc0c1\uc744 \ud558\ub098 \uc774\uc0c1 \uc120\ud0dd\ud558\uc138\uc694.",
    summary: "\uc601\uc0c1 \ud480", ready: "\uc778\ud2b8\ub85c", progress: "Draft \uc0dd\uc131 \uc911",
    audio: "\uace0\uc815 \uc74c\uc545 \ud3ec\ud568", introTip: "\uae34 \uc778\ud2b8\ub85c \ub4a4\uc5d0 \ube60\ub978 \ucef7\uc774 \uc790\ub3d9\uc73c\ub85c \uc774\uc5b4\uc9d1\ub2c8\ub2e4.",
    choose: "\uc778\ud2b8\ub85c\ub97c \uace0\ub974\uace0 \ube60\ub978 \ucef7\uc6a9 \ud3f4\ub354\ub97c \uc120\ud0dd\ud558\uba74 \ub098\uba38\uc9c0\ub294 \uc790\ub3d9\uc73c\ub85c \ubc30\uce58\ub429\ub2c8\ub2e4.",
    invalid: "\uc778\ud2b8\ub85c \uc601\uc0c1\uc740 \uc120\ud0dd\ud55c \uc2dc\uc791\uc810\ubd80\ud130 8.5\ucd08 \uc774\uc0c1 \ud544\uc694\ud569\ub2c8\ub2e4.",
    gallery: "\ud2b9\uc815 \uc601\uc0c1 \uc81c\uc678 (\uc120\ud0dd \uc0ac\ud56d)", preview: "\uc778\ud2b8\ub85c \uad6c\uac04 \uc120\ud0dd", previous: "\uc774\uc804", next: "\ub2e4\uc74c",
    previewHint: "\uc544\ub798 \ud0c0\uc784\ub77c\uc778\uc5d0\uc11c \ub178\ub780 \uad6c\uac04\uc744 \uc6c0\uc9c1\uc5ec \uc0ac\uc6a9\ud560 8.1\ucd08\ub97c \uace0\ub974\uc138\uc694.",
    galleryHint: "\uc120\ud0dd\ud55c \ud3f4\ub354\uc758 \uc601\uc0c1\uc740 \ubaa8\ub450 \uc790\ub3d9 \uc0ac\uc6a9\ub429\ub2c8\ub2e4. \ube7c\uace0 \uc2f6\uc740 \uc601\uc0c1\ub9cc \uccb4\ud06c\ud558\uc138\uc694.",
    folderGuide: "\uc601\uc0c1 \ud30c\uc77c\uc744 \ud55c \ud3f4\ub354\uc5d0 \ubaa8\uc73c\uba74 \ud3b8\ub9ac\ud569\ub2c8\ub2e4. \uc5ec\ub7ec \ud3f4\ub354\ub97c \uc120\ud0dd\ud574\ub3c4 \ub429\ub2c8\ub2e4.",
    folderPick: "\ube60\ub978 \ucef7\uc6a9 \ud3f4\ub354", include: "\uc774 \uc601\uc0c1 \uc81c\uc678", poolRule: "\uc120\ud0dd\ud55c \ud3f4\ub354\uc758 \uc601\uc0c1\uc740 \uae30\ubcf8\uc801\uc73c\ub85c \ubaa8\ub450 \uc0ac\uc6a9\ud569\ub2c8\ub2e4. \ubd80\uc871\ud558\uba74 \ud30c\uc77c\uba85 \uc21c\uc11c\ub300\ub85c \ubc18\ubcf5\ud558\uba70, \uacb0\uacfc \uae38\uc774\ub294 \uc74c\uc545\uc5d0 \ub9de\ucdb0 \uc57d 68.6\ucd08\ub85c \uace0\uc815\ub429\ub2c8\ub2e4.",
    footageCount: "\ube60\ub978 \ucef7\uc6a9 \uc601\uc0c1", repeatNote: "158\uac1c \uc2ac\ub86f\uc744 \ucc44\uc6b0\uae30 \uc704\ud574 \uc601\uc0c1\uc774 \ubc18\ubcf5\ub429\ub2c8\ub2e4.",
    selectAll: "\uc81c\uc678 \ubaa9\ub85d \ucd08\uae30\ud654", selectNone: "\uc804\uccb4 \ud574\uc81c", rebuildHint: "\uc81c\uc678 \uc124\uc815\uc744 \ubc14\uafb8\uba74 \ube60\ub978 \ucef7\uc774 \ub2e4\uc2dc \uc790\ub3d9\uc73c\ub85c \ubc30\uce58\ub429\ub2c8\ub2e4.",
    advanced: "\ube60\ub978 \ucef7 \ud558\ub098 \uc870\uc815 (\uc120\ud0dd \uc0ac\ud56d)", introStart: "\uc778\ud2b8\ub85c \uc2dc\uc791\uc810",
    advancedHint: "1\ubc88\uc740 \uc778\ud2b8\ub85c \uc9c1\ud6c4\uc758 \uccab \ucef7\uc785\ub2c8\ub2e4. \uac19\uc740 \uc601\uc0c1 \uc790\ub9ac\uc758 \ud6c4\ubc18 \ubc18\ubcf5\ubd84\ub3c4 \ud568\uaed8 \ubc14\ub01d\ub2c8\ub2e4.",
    outputAt: "\uc644\uc131 \uc601\uc0c1\uc5d0\uc11c", sourceWindow: "\uc774 \ucef7\uc5d0 \uc0ac\uc6a9\ud560 \uc6d0\ubcf8 \uad6c\uac04",
    advancedSourceHint: "\uc6d0\ubcf8 \ud0c0\uc784\ub77c\uc778\uc758 \ub178\ub780 \uad6c\uac04\uc744 \uc62e\uaca8 \uc774 \ucef7\uc5d0 \uc0ac\uc6a9\ud560 \uc7a5\uba74\uc744 \uace0\ub974\uc138\uc694.",
    repeatsLater: "\uc774 \ucef7\uc740 \ud6c4\ubc18 \ubc18\ubcf5 \uad6c\uac04\uc5d0\ub3c4 \ub2e4\uc2dc \ub098\uc624\uba70 \ud568\uaed8 \ubcc0\uacbd\ub429\ub2c8\ub2e4.",
    rules: "\uc790\ub3d9 \ubc30\uce58 \uaddc\uce59", quickRule: "\ud544\uc694\ud558\uba74 \ubc18\ubcf5 \u00b7 \uc57d 68.6\ucd08 \uace0\uc815",
    noneIncluded: "\uc0ac\uc6a9\ud560 \uc601\uc0c1\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. \ube60\ub978 \ucef7\uc6a9 \ud3f4\ub354\ub97c \uc120\ud0dd\ud558\uac70\ub098 \uc81c\uc678 \ubaa9\ub85d\uc744 \ucd08\uae30\ud654\ud558\uc138\uc694.",
    shortNotice: "1.7\ucd08 \ubbf8\ub9cc \uc601\uc0c1\uc740 \uae34 \ucef7\uc744 \ucc44\uc6b8 \uc218 \uc5c6\uc5b4 \uc81c\uc678\ub429\ub2c8\ub2e4. \uc778\ud2b8\ub85c\uc5d0\ub294 8.5\ucd08 \uc774\uc0c1 \uc601\uc0c1\uc774 \ud544\uc694\ud569\ub2c8\ub2e4.",
    example: "\uc644\uc131 \uc608\uc2dc", exampleHint: "68.6\ucd08 \uc644\uc131\ubcf8. \uc7ac\uc0dd\ud574\uc11c \uc601\uc0c1\uacfc \ube44\ud2b8\uc758 \ud750\ub984\uc744 \ud655\uc778\ud558\uc138\uc694.",
    exampleMissing: "\uc608\uc2dc \uc601\uc0c1\uc744 \ubd88\ub7ec\uc62c \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.",
    hostTooOld: "\uc774 \uae30\ub2a5\uc740 \ub354 \ucd5c\uc2e0 \ubc84\uc804\uc758 Selects\uac00 \ud544\uc694\ud569\ub2c8\ub2e4. Selects\ub97c \uc5c5\ub370\uc774\ud2b8\ud55c \ub4a4 \ub2e4\uc2dc \uc2dc\ub3c4\ud558\uc138\uc694."
  },
  en: {
    restoreSelection: "Saved choices used temporary IDs or refer to unavailable footage. Choose the intro and footage again; the old choices have been kept.",
    focusHint: "Automatic face focus uses sampled frames and can miss people. Inspect the finished framing; widely separated people may not fit the vertical crop.",
    folder: "Footage folder", intro: "Intro video", slot: "Fast-cut number (1\u2013157)",
    video: "Video for this cut", start: "Source video start", sample: "Create 12s sample",
    full: "Create full Draft", loading: "Loading footage…",
    noProject: "Open a Selects project first.",
    noVideo: "Choose at least one video.",
    summary: "Footage pool", ready: "Intro", progress: "Building Draft",
    audio: "Fixed music", introTip: "Fast cuts follow the long intro automatically.",
    choose: "Choose the intro and folders for fast cuts. The rest is arranged automatically.",
    invalid: "The intro needs at least 8.5 seconds after its source start.",
    gallery: "Exclude specific videos (optional)", preview: "Select the intro segment", previous: "Previous", next: "Next",
    previewHint: "Move the yellow window on the timeline to choose the 8.1 seconds to use.",
    galleryHint: "All videos in the selected folders are used automatically. Check only the videos you want to leave out.",
    folderGuide: "Putting videos in one folder is easiest. You can also select multiple folders.",
    folderPick: "Folders for fast cuts", include: "Exclude this video", poolRule: "All videos in selected folders are used by default. When there are fewer videos than slots, footage repeats in filename order. Runtime stays fixed at about 68.6 seconds to match the music.",
    footageCount: "Fast-cut videos", repeatNote: "Videos will repeat to fill the 158 slots.",
    selectAll: "Reset exclusions", selectNone: "Clear all", rebuildHint: "Changing exclusions rearranges the fast cuts automatically.",
    advanced: "Adjust one fast cut (optional)", introStart: "Intro source start",
    advancedHint: "Number 1 is the first cut after the intro. If this position repeats later, both copies change together.",
    outputAt: "In finished video", sourceWindow: "Source segment for this cut",
    advancedSourceHint: "Move the yellow window on the source timeline to choose the moment used for this cut.",
    repeatsLater: "This cut also appears in the later repeat; both copies change together.",
    rules: "How auto-fill works", quickRule: "Repeats if needed \u00b7 fixed ~68.6s",
    noneIncluded: "No footage is available. Choose a fast-cut folder or reset exclusions.",
    shortNotice: "Clips under 1.7 seconds are excluded. The intro needs a video of at least 8.5 seconds.",
    example: "Finished example", exampleHint: "Play the 68.6s example to see the footage and beat timing.",
    exampleMissing: "The example video could not be loaded.",
    hostTooOld: "This needs a newer version of Selects. Update Selects and try again."
  }
};
const embedded = (value) => JSON.stringify(value);
const scriptResult = (r) => {
  if (r.isError) throw new Error(r.output || "Selects edit failed");
  if (r.result == null) throw new Error("Selects returned no result");
  return r.result;
};
// One message for a Selects build that lacks a host service (av-host 'host-missing').
const hostMessage = (e, t) => e?.code === "host-missing" ? t.hostTooOld : String(e?.message || e);
// The install folder (the recap-2026 folder beneath the Skills root, holding SKILL.md), found once through the Selects SDK
// (selects.files) and shared by the panel and template runs: a Selects build that runs panels in an isolated frame
// gives them no host services, so window.parent is not used for it. The data folder (thumbnails, a soundtrack copy)
// still comes from the host when it has one; without it the panel shows no thumbnails and the template needs none.
let recapRootsPromise = null;
const recapRoots = (sdk) => { hostUseSdk(sdk); return recapRootsPromise || (recapRootsPromise = hostRoots(sdk, SLUG, "SKILL.md").catch((e) => { recapRootsPromise = null; throw e; })); };
// The song's pulse: subdivision period inside [lo, hi] s and phase, fitted to the onset flux over the
// whole song; loudness entry/exit (0.5 s windows within 8 dB of the median); onsets for snapping.
function songGrid(m, lo, hi) {
  const a = m.audio;
  if (!a || a.status !== "measured") throw new Error("The song has no measurable audio.");
  const h = a.hopSeconds, t0 = a.startSeconds, flux = a.frames.flux, rms = a.frames.rmsDb, n = flux.length, dur = m.durationSeconds;
  let mean = 0; for (let i = 0; i < n; i++) mean += flux[i]; mean /= n;
  const ac = (p) => { let s = 0; for (let i = p; i < n; i++) s += (flux[i] - mean) * (flux[i - p] - mean); return s / (n - p); };
  let p0 = Math.round(lo / h), best = -Infinity;
  for (let p = Math.round(lo / h); p <= Math.round(hi / h); p++) { const v = ac(p); if (v > best) { best = v; p0 = p; } }
  // Loudness windows.
  const win = [], w = Math.round(0.5 / h);
  for (let i = 0; i + w <= n; i += w) { let s = 0; for (let k = i; k < i + w; k++) s += rms[k]; win.push({ t: t0 + i * h, db: s / w }); }
  const body = win.map((x) => x.db).sort((x, y) => x - y)[Math.floor(win.length / 2)];
  const loud = win.filter((x) => x.db >= body - 8);
  const entry = loud.length ? loud[0].t : 0, exit = loud.length ? loud[loud.length - 1].t + 0.5 : dur;
  // Fine period and phase: the comb that the most onset flux sits on (within 12 ms) between entry and exit
  // (2.5 ms phase steps, 0.1 ms period steps). Onset times, not flux peaks, are what cuts snap to.
  const hits = a.onsets.filter((o) => o.t >= entry && o.t <= exit);
  let fit = { s: -1, P: p0 * h, phase: 0 };
  for (let P = p0 * h * 0.985; P <= p0 * h * 1.015; P += 0.0001) {
    for (let ph = 0; ph < P; ph += 0.0025) {
      let s = 0;
      for (const o of hits) { const r = (((o.t - entry - ph) % P) + P) % P; if (Math.min(r, P - r) <= 0.012) s += o.flux; }
      if (s > fit.s) fit = { s, P, phase: entry + ph };
    }
  }
  const onsets = a.onsets.map((o) => ({ t: o.t, f: o.flux }));
  // The strongest onset within `tol` of t, else t itself.
  const snap = (t, tol) => { let b = null; for (const o of onsets) if (Math.abs(o.t - t) <= tol && (!b || o.f > b.f)) b = o; return b ? b.t : t; };
  const gridAfter = (t) => fit.phase + Math.ceil((t - fit.phase - 1e-6) / fit.P) * fit.P;
  return { dur, period: fit.P, phase: fit.phase, entry, exit, body, win, onsets, snap, gridAfter };
}

// 2026 Recap (rules/recap-2026.md): intro hold to the first strong downbeat after the song enters, a cut on every
// subdivision (0.18–0.30 s band) snapped to onsets, every clip once then a replay from 38 %, the last clip held
// through the tail with a fade to black. Returns placements in timing.json's shape plus the slot counts.
function planRecap(m) {
  const g = songGrid(m, 0.18, 0.30), tol = 0.02, P = g.period;
  // The reference holds its intro 4.67 s from the song's entry and cuts on the strongest onset there.
  const aim = g.entry + 4.67;
  const intro = g.onsets.filter((o) => Math.abs(o.t - aim) <= 0.6).sort((x, y) => y.f - x.f)[0];
  // Every later cut is one subdivision after the previous cut, moved onto the strongest onset within `tol`, so the
  // cuts stay on the pulse that downbeat belongs to (the original: 159/240 cuts within a 60 fps frame).
  const introEnd = intro ? intro.t : aim;
  const cuts = [introEnd];
  for (let t = introEnd + P; t <= g.exit - P; t = cuts[cuts.length - 1] + P) cuts.push(g.snap(t, tol));
  const lastCut = cuts[cuts.length - 1];
  const quiet = g.win.find((x) => x.t >= g.exit && x.db < g.body - 16);
  const fadeStart = Math.min(g.dur - 0.9, Math.max(lastCut + 0.6, quiet ? quiet.t : g.dur - 0.95));
  // Slots: 1 = intro, then the fast cuts. The last fast cut holds to the end.
  const fast = cuts.length; // placements after the intro, including the final hold
  const unique = Math.max(1, Math.ceil(fast * 159 / 242)); // the original: 159 distinct clips over 242 cuts
  const replayFrom = Math.floor(unique * 60 / 159);
  const placements = [{ slot: 1, startSeconds: 0, endSeconds: introEnd }];
  for (let i = 0; i < fast; i++) {
    const k = i < unique ? i : replayFrom + ((i - unique) % (unique - replayFrom || 1));
    placements.push({ slot: k + 2, startSeconds: cuts[i], endSeconds: i + 1 < fast ? cuts[i + 1] : g.dur });
  }
  return {
    durationSeconds: g.dur, periodSeconds: P, introEnd, fadeStart, slotCount: unique + 1, placements,
    holdSeconds: g.dur - lastCut, visibleHoldSeconds: fadeStart + 0.75 - lastCut,
  };
}

// The song's cut plan, measured once per panel session inside Selects (selects.media.measureBeatSync).
let recapPlanPromise = null;
const readPlan = (sdk) => recapPlanPromise || (recapPlanPromise = (async () => {
  const path = hostJoin((await recapRoots(sdk)).plugin, "assets", AUDIO_NAME);
  const r = await sdk.runScript({
    summary:"Measure the song's beat", timeoutSeconds:120,
    script:"if(typeof selects.media?.measureBeatSync!=='function')return {missing:true};" + songGrid.toString() + planRecap.toString() +
      "const m=(await selects.media.measureBeatSync({sources:[{path:" + JSON.stringify(path) + "}]}))[0];return planRecap(m);"
  });
  const plan = scriptResult(r);
  if (plan.missing) throw Object.assign(new Error("measureBeatSync is missing"), { code: "host-missing" });
  return plan;
})().catch((e) => { recapPlanPromise = null; throw e; }));
// Host file names compare after NFC, \ to / and the basename (and case on Windows).
const normPath = (s) => { const v = String(s || "").normalize("NFC").replace(/\\/g, "/"); const b = v.slice(v.lastIndexOf("/") + 1); return hostIsWindows() ? b.toLowerCase() : b; };
const core = (cfg) => "const cfg=JSON.parse(" + embedded(JSON.stringify(cfg)) + ");const p=selects.project(cfg.projectId);";
const gallerySize = 8;
const thumbnailKey = (video, seconds) => video.resourceId + ":" + seconds.toFixed(2);
// Gallery files are not installed. Pin their published revision and cache them through the SDK.
const EXAMPLE_REVISION = "e8b2230019bad4090d0f6b6cf0c3a69e7a8ecea3";
const EXAMPLE_ASSETS = [
  {name: "preview.mp4", bytes: 6706153},
  {name: "poster.webp", bytes: 21664},
];
async function loadExampleMedia(sdk) {
  const {data} = await recapRoots(sdk);
  if (!data) throw new Error("The example cache is unavailable.");
  const files = panelLocalClient(sdk).files;
  const cachedUrl = async ({name, bytes}) => {
    const path = files.join(data, "example-" + EXAMPLE_REVISION.slice(0, 12) + "-" + name);
    if ((await files.stat(path))?.size !== bytes) {
      const url = "https://raw.githubusercontent.com/CutbackVideo/selects-plugin-library/" + EXAMPLE_REVISION + "/plugins/recap-2026/" + name;
      // The SDK owns temporary files, so a download survives the panel losing its reply.
      await files.downloadFile(url, path);
      if ((await files.stat(path))?.size !== bytes) {
        await files.removeFile({filePath: path}).catch(() => {});
        throw new Error("The example download is incomplete.");
      }
    }
    const url = await files.pathToLocalURL(path);
    if (typeof url !== "string" || !url) throw new Error("The example URL is unavailable.");
    return url;
  };
  const src = await cachedUrl(EXAMPLE_ASSETS[0]);
  // A missing poster must not prevent the video from playing.
  const poster = await cachedUrl(EXAMPLE_ASSETS[1]).catch(() => undefined);
  return {src, poster};
}
function FinishedExample({sdk,t,ui}) {
  const video=React.useRef<HTMLVideoElement | null>(null);
  const [media,setMedia]=React.useState<{src:string;poster?:string} | null>(null);
  const [error,setError]=React.useState("");
  React.useEffect(()=>{
    let active=true;
    const player=video.current;
    setMedia(null);
    setError("");
    loadExampleMedia(sdk).then((value)=>{if(active)setMedia(value);})
      .catch((e)=>{if(active)setError(e?.code==="host-missing"?t.hostTooOld:t.exampleMissing);});
    return ()=>{active=false;if(player){player.pause();player.removeAttribute("src");player.load();}};
  },[sdk,t.hostTooOld,t.exampleMissing]);
  return <ui.Section title={t.example}>
    <small>{t.exampleHint}</small>
    <div style={{marginTop:8,width:"100%",maxWidth:280}}>
      <video ref={video} src={media?.src} poster={media?.poster} controls preload="metadata" playsInline
        onError={()=>setError(t.exampleMissing)}
        style={{display:"block",width:"100%",maxHeight:420,background:"#111",borderRadius:8,aspectRatio:"9 / 16",objectFit:"contain"}}/>
    </div>
    {error&&<ui.Message tone="error">{error}</ui.Message>}
  </ui.Section>;
}
// One frame as a JPEG data URL: the host's ffmpeg writes an ASCII-named file in the data folder, read back and removed.
async function captureThumbnail(sdk, video, seconds) {
  hostUseSdk(sdk);
  if (!video.path) return null;
  const rt = hostApi("Runtime", "runFFmpeg");
  const {data} = await recapRoots(sdk);
  if (!rt || !data) return null;
  const time = Math.max(0, Math.min(video.durationSeconds - 0.1, seconds));
  const out = hostJoin(data, "thumb-" + Date.now() + "-" + Math.floor(Math.random() * 1e6) + ".jpg");
  const controller = typeof AbortController === "undefined" ? null : new AbortController();
  const timer = controller ? setTimeout(() => controller.abort(), 20000) : null;
  try {
    await rt.runFFmpeg(["-nostdin", "-v", "error", "-y", "-ss", time.toFixed(3), "-i", video.path, "-frames:v", "1", "-vf", "scale=240:-2", "-q:v", "12", out], true, controller ? controller.signal : undefined);
    const b = await hostReadBytes(out);
    if (!b.length) return null;
    let s = "";
    for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return "data:image/jpeg;base64," + btoa(s);
  } finally {
    if (timer) clearTimeout(timer);
    await hostRemove(out);
  }
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

// file-observation:start
// Generated by tools/build_file_observation.mjs; edit file-observation.source.js.
async function fingerprintTemplateFile(files,path,check=()=>{}) {
/* @noble/hashes 2.2.0; license retained inside serialized SDK copies.
The MIT License (MIT)

Copyright (c) 2022 Paul Miller (https://paulmillr.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the “Software”), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
const __templateHashAny=value=>value;
var __templateFileHash = __templateHashAny((() => { var w = __templateHashAny(Object).defineProperty; var G = __templateHashAny(Object).getOwnPropertyDescriptor; var V = __templateHashAny(Object).getOwnPropertyNames; var O = __templateHashAny(__templateHashAny(Object).prototype).hasOwnProperty; var k = (t, e, r) => e in t ? __templateHashAny(w)(t, e, { enumerable: !0, configurable: !0, writable: !0, value: r }) : __templateHashAny(t)[e] = r; var R = (t, e) => { for (var r in e)
    __templateHashAny(w)(t, r, { get: __templateHashAny(e)[r], enumerable: !0 }); }, $ = (t, e, r, o) => { if (e && typeof e == "object" || typeof e == "function")
    for (let n of __templateHashAny(V)(e))
        !__templateHashAny(O).call(t, n) && n !== r && __templateHashAny(w)(t, n, { get: () => __templateHashAny(e)[n], enumerable: !(o = __templateHashAny(G)(e, n)) || __templateHashAny(o).enumerable }); return t; }; var M = t => __templateHashAny($)(__templateHashAny(w)({}, "__esModule", { value: !0 }), t); var a = (t, e, r) => __templateHashAny(k)(t, typeof e != "symbol" ? e + "" : e, r); var N = {}; __templateHashAny(R)(N, { sha256: () => _ }); function j(t) { return t instanceof Uint8Array || __templateHashAny(ArrayBuffer).isView(t) && __templateHashAny(__templateHashAny(t).constructor).name === "Uint8Array" && "BYTES_PER_ELEMENT" in t && __templateHashAny(t).BYTES_PER_ELEMENT === 1; } function m(t, e, r = "") { let o = __templateHashAny(j)(t), n = __templateHashAny(t)?.length, f = e !== void 0; if (!o || f && n !== e) {
    let s = r && `"${r}" `, x = f ? ` of length ${e}` : "", i = o ? `length=${n}` : `type=${typeof t}`, h = s + "expected Uint8Array" + x + ", got " + i;
    throw o ? new (__templateHashAny(RangeError))(h) : new (__templateHashAny(TypeError))(h);
} return t; } function L(t, e = !0) { if (__templateHashAny(t).destroyed)
    throw new (__templateHashAny(Error))("Hash instance has been destroyed"); if (e && __templateHashAny(t).finished)
    throw new (__templateHashAny(Error))("Hash#digest() has already been called"); } function C(t, e) { __templateHashAny(m)(t, void 0, "digestInto() output"); let r = __templateHashAny(e).outputLen; if (__templateHashAny(t).length < r)
    throw new (__templateHashAny(RangeError))('"digestInto() output" expected to be of length >=' + r); } function y(...t) { for (let e = 0; e < __templateHashAny(t).length; e++)
    __templateHashAny(__templateHashAny(t)[e]).fill(0); } function A(t) { return new (__templateHashAny(DataView))(__templateHashAny(t).buffer, __templateHashAny(t).byteOffset, __templateHashAny(t).byteLength); } function d(t, e) { return t << 32 - e | t >>> e; } function F(t, e = {}) { let r = (n, f) => __templateHashAny(__templateHashAny(__templateHashAny(t)(f)).update(n)).digest(), o = __templateHashAny(t)(void 0); return __templateHashAny(r).outputLen = __templateHashAny(o).outputLen, __templateHashAny(r).blockLen = __templateHashAny(o).blockLen, __templateHashAny(r).canXOF = __templateHashAny(o).canXOF, __templateHashAny(r).create = n => __templateHashAny(t)(n), __templateHashAny(Object).assign(r, e), __templateHashAny(Object).freeze(r); } var T = t => ({ oid: __templateHashAny(Uint8Array).from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, t]) }); function D(t, e, r) { return t & e ^ ~t & r; } function I(t, e, r) { return t & e ^ t & r ^ e & r; } var E = class {
    constructor(e, r, o, n) { __templateHashAny(a)(__templateHashAny(this), "blockLen"); __templateHashAny(a)(__templateHashAny(this), "outputLen"); __templateHashAny(a)(__templateHashAny(this), "canXOF", !1); __templateHashAny(a)(__templateHashAny(this), "padOffset"); __templateHashAny(a)(__templateHashAny(this), "isLE"); __templateHashAny(a)(__templateHashAny(this), "buffer"); __templateHashAny(a)(__templateHashAny(this), "view"); __templateHashAny(a)(__templateHashAny(this), "finished", !1); __templateHashAny(a)(__templateHashAny(this), "length", 0); __templateHashAny(a)(__templateHashAny(this), "pos", 0); __templateHashAny(a)(__templateHashAny(this), "destroyed", !1); __templateHashAny(__templateHashAny(this)).blockLen = e, __templateHashAny(__templateHashAny(this)).outputLen = r, __templateHashAny(__templateHashAny(this)).padOffset = o, __templateHashAny(__templateHashAny(this)).isLE = n, __templateHashAny(__templateHashAny(this)).buffer = new (__templateHashAny(Uint8Array))(e), __templateHashAny(__templateHashAny(this)).view = __templateHashAny(A)(__templateHashAny(__templateHashAny(this)).buffer); }
    update(e) { __templateHashAny(L)(__templateHashAny(this)), __templateHashAny(m)(e); let { view: r, buffer: o, blockLen: n } = __templateHashAny(this), f = __templateHashAny(e).length; for (let s = 0; s < f;) {
        let x = __templateHashAny(Math).min(n - __templateHashAny(__templateHashAny(this)).pos, f - s);
        if (x === n) {
            let i = __templateHashAny(A)(e);
            for (; n <= f - s; s += n)
                __templateHashAny(__templateHashAny(this)).process(i, s);
            continue;
        }
        __templateHashAny(o).set(__templateHashAny(e).subarray(s, s + x), __templateHashAny(__templateHashAny(this)).pos), __templateHashAny(__templateHashAny(this)).pos += x, s += x, __templateHashAny(__templateHashAny(this)).pos === n && (__templateHashAny(__templateHashAny(this)).process(r, 0), __templateHashAny(__templateHashAny(this)).pos = 0);
    } return __templateHashAny(__templateHashAny(this)).length += __templateHashAny(e).length, __templateHashAny(__templateHashAny(this)).roundClean(), __templateHashAny(this); }
    digestInto(e) { __templateHashAny(L)(__templateHashAny(this)), __templateHashAny(C)(e, __templateHashAny(this)), __templateHashAny(__templateHashAny(this)).finished = !0; let { buffer: r, view: o, blockLen: n, isLE: f } = __templateHashAny(this), { pos: s } = __templateHashAny(this); __templateHashAny(r)[s++] = 128, __templateHashAny(y)(__templateHashAny(__templateHashAny(__templateHashAny(this)).buffer).subarray(s)), __templateHashAny(__templateHashAny(this)).padOffset > n - s && (__templateHashAny(__templateHashAny(this)).process(o, 0), s = 0); for (let c = s; c < n; c++)
        __templateHashAny(r)[c] = 0; __templateHashAny(o).setBigUint64(n - 8, __templateHashAny(BigInt)(__templateHashAny(__templateHashAny(this)).length * 8), f), __templateHashAny(__templateHashAny(this)).process(o, 0); let x = __templateHashAny(A)(e), i = __templateHashAny(__templateHashAny(this)).outputLen; if (i % 4)
        throw new (__templateHashAny(Error))("_sha2: outputLen must be aligned to 32bit"); let h = i / 4, u = __templateHashAny(__templateHashAny(this)).get(); if (h > __templateHashAny(u).length)
        throw new (__templateHashAny(Error))("_sha2: outputLen bigger than state"); for (let c = 0; c < h; c++)
        __templateHashAny(x).setUint32(4 * c, __templateHashAny(u)[c], f); }
    digest() { let { buffer: e, outputLen: r } = __templateHashAny(this); __templateHashAny(__templateHashAny(this)).digestInto(e); let o = __templateHashAny(e).slice(0, r); return __templateHashAny(__templateHashAny(this)).destroy(), o; }
    _cloneInto(e) { e || (e = new (__templateHashAny((__templateHashAny(__templateHashAny(this)).constructor)))), __templateHashAny(e).set(...__templateHashAny(__templateHashAny(this)).get()); let { blockLen: r, buffer: o, length: n, finished: f, destroyed: s, pos: x } = __templateHashAny(this); return __templateHashAny(e).destroyed = s, __templateHashAny(e).finished = f, __templateHashAny(e).length = n, __templateHashAny(e).pos = x, n % r && __templateHashAny(__templateHashAny(e).buffer).set(o), e; }
    clone() { return __templateHashAny(__templateHashAny(this))._cloneInto(); }
}, b = __templateHashAny(Uint32Array).from([1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225]); var W = __templateHashAny(Uint32Array).from([1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, 2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479, 3329325298]), l = new (__templateHashAny(Uint32Array))(64), B = class extends __templateHashAny(E) {
    constructor(e) { super(64, e, 8, !1); }
    get() { let { A: e, B: r, C: o, D: n, E: f, F: s, G: x, H: i } = __templateHashAny(this); return [e, r, o, n, f, s, x, i]; }
    set(e, r, o, n, f, s, x, i) { __templateHashAny(__templateHashAny(this)).A = e | 0, __templateHashAny(__templateHashAny(this)).B = r | 0, __templateHashAny(__templateHashAny(this)).C = o | 0, __templateHashAny(__templateHashAny(this)).D = n | 0, __templateHashAny(__templateHashAny(this)).E = f | 0, __templateHashAny(__templateHashAny(this)).F = s | 0, __templateHashAny(__templateHashAny(this)).G = x | 0, __templateHashAny(__templateHashAny(this)).H = i | 0; }
    process(e, r) { for (let c = 0; c < 16; c++, r += 4)
        __templateHashAny(l)[c] = __templateHashAny(e).getUint32(r, !1); for (let c = 16; c < 64; c++) {
        let g = __templateHashAny(l)[c - 15], p = __templateHashAny(l)[c - 2], S = __templateHashAny(d)(g, 7) ^ __templateHashAny(d)(g, 18) ^ g >>> 3, H = __templateHashAny(d)(p, 17) ^ __templateHashAny(d)(p, 19) ^ p >>> 10;
        __templateHashAny(l)[c] = H + __templateHashAny(l)[c - 7] + S + __templateHashAny(l)[c - 16] | 0;
    } let { A: o, B: n, C: f, D: s, E: x, F: i, G: h, H: u } = __templateHashAny(this); for (let c = 0; c < 64; c++) {
        let g = __templateHashAny(d)(x, 6) ^ __templateHashAny(d)(x, 11) ^ __templateHashAny(d)(x, 25), p = u + g + __templateHashAny(D)(x, i, h) + __templateHashAny(W)[c] + __templateHashAny(l)[c] | 0, H = (__templateHashAny(d)(o, 2) ^ __templateHashAny(d)(o, 13) ^ __templateHashAny(d)(o, 22)) + __templateHashAny(I)(o, n, f) | 0;
        u = h, h = i, i = x, x = s + p | 0, s = f, f = n, n = o, o = p + H | 0;
    } o = o + __templateHashAny(__templateHashAny(this)).A | 0, n = n + __templateHashAny(__templateHashAny(this)).B | 0, f = f + __templateHashAny(__templateHashAny(this)).C | 0, s = s + __templateHashAny(__templateHashAny(this)).D | 0, x = x + __templateHashAny(__templateHashAny(this)).E | 0, i = i + __templateHashAny(__templateHashAny(this)).F | 0, h = h + __templateHashAny(__templateHashAny(this)).G | 0, u = u + __templateHashAny(__templateHashAny(this)).H | 0, __templateHashAny(__templateHashAny(this)).set(o, n, f, s, x, i, h, u); }
    roundClean() { __templateHashAny(y)(l); }
    destroy() { __templateHashAny(__templateHashAny(this)).destroyed = !0, __templateHashAny(__templateHashAny(this)).set(0, 0, 0, 0, 0, 0, 0, 0), __templateHashAny(y)(__templateHashAny(__templateHashAny(this)).buffer); }
}, U = class extends __templateHashAny(B) {
    constructor() { super(32); __templateHashAny(a)(__templateHashAny(this), "A", __templateHashAny(b)[0] | 0); __templateHashAny(a)(__templateHashAny(this), "B", __templateHashAny(b)[1] | 0); __templateHashAny(a)(__templateHashAny(this), "C", __templateHashAny(b)[2] | 0); __templateHashAny(a)(__templateHashAny(this), "D", __templateHashAny(b)[3] | 0); __templateHashAny(a)(__templateHashAny(this), "E", __templateHashAny(b)[4] | 0); __templateHashAny(a)(__templateHashAny(this), "F", __templateHashAny(b)[5] | 0); __templateHashAny(a)(__templateHashAny(this), "G", __templateHashAny(b)[6] | 0); __templateHashAny(a)(__templateHashAny(this), "H", __templateHashAny(b)[7] | 0); }
}; var _ = __templateHashAny(F)(() => new (__templateHashAny(U)), __templateHashAny(T)(1)); return __templateHashAny(M)(N); }))();

 if(typeof path!=='string'||!path||path.includes('\0')||typeof check!=='function'||typeof files?.stat!=='function'||typeof files?.readRange!=='function')throw Error('The original file observation input is invalid.');
 const observe=async operation=>{check();const result=await operation();check();return result;};
 const before=await observe(()=>files.stat(path));
 if(before===null)return null;
 if(!before||before.isDirectory!==false||!Number.isSafeInteger(before.size)||before.size<0||!Number.isFinite(before.mtimeMs)||!Number.isFinite(before.ino))throw Error("The file's size or identity could not be confirmed.");
 const hash=__templateFileHash.sha256.create(),alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
 for(let offset=0;offset<before.size;){
  const length=Math.min(49152,before.size-offset);
  const chunk=await observe(()=>files.readRange({path,offset,length}));
  if(!chunk||chunk.bytesRead!==length||typeof chunk.base64!=='string'||chunk.base64.length!==4*Math.ceil(length/3)||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(chunk.base64))throw Error('The file read returned an incomplete or invalid binary chunk.');
  const bytes=new Uint8Array(length);
  let position=0;
  for(let i=0;i<chunk.base64.length;i+=4){
   const a=alphabet.indexOf(chunk.base64[i]),b=alphabet.indexOf(chunk.base64[i+1]),c=chunk.base64[i+2]==='='?0:alphabet.indexOf(chunk.base64[i+2]),d=chunk.base64[i+3]==='='?0:alphabet.indexOf(chunk.base64[i+3]);
   if(chunk.base64[i+2]==='='&&(b&15)!==0||chunk.base64[i+3]==='='&&chunk.base64[i+2]!=='='&&(c&3)!==0)throw Error('The file read returned a noncanonical binary chunk.');
   bytes[position++]=(a<<2)|(b>>4);
   if(position<length)bytes[position++]=((b&15)<<4)|(c>>2);
   if(position<length)bytes[position++]=((c&3)<<6)|d;
  }
  hash.update(bytes);check();offset+=length;
 }
 const after=await observe(()=>files.stat(path));
 if(!after||after.isDirectory!==false||before.size!==after.size||before.mtimeMs!==after.mtimeMs||before.ino!==after.ino)throw Error('The file changed while its contents were read.');
 const digest=hash.digest();check();
 let hex='';for(let index=0;index<digest.length;index++)hex+=digest[index].toString(16).padStart(2,'0');
 return {size:before.size,sha256:hex};
}
// file-observation:end

const sharedAiJobs=(()=>{const module={exports:{}};
// ai-job-client:start
// Plugin-private durable orchestration of the existing public AI SDK.
// This module is bundled into panels; it has no Node or renderer-global dependencies.
const STATUS = new Set(['queued', 'running', 'canceling', 'succeeded', 'failed', 'canceled']);
const terminal = status => ['succeeded', 'failed', 'canceled'].includes(status);
const UUID = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const writes = new Map();
const error = (code, message) => Object.assign(new Error(message), { code });
const invalid = () => error('SHARED_AI_INVALID', 'Saved AI analysis does not match this source or task.');
const clone = value => JSON.parse(JSON.stringify(value));
function stable(value) {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint' || typeof value === 'number' && !Number.isFinite(value)) throw invalid();
  return JSON.stringify(value);
}
function attached(signal) {
  if (signal?.aborted) throw error('SHARED_AI_DETACHED', 'AI observation stopped. Reopen to recover the saved job.');
}
function inputFor(projectId, request) {
  if (!request || !['faces.detect', 'person.matte'].includes(request.task) || !UUID.test(request.resourceId)) throw invalid();
  const input = { runtimeId: 'selects-ai-runtime', projectId, resourceId: request.resourceId, task: request.task };
  if (request.sourceRange !== undefined) {
    const { startSeconds, endSeconds } = request.sourceRange || {};
    if (!Number.isFinite(startSeconds) || startSeconds < 0 || !Number.isFinite(endSeconds) || endSeconds <= startSeconds) throw invalid();
    input.sourceRange = { startSeconds, endSeconds };
  }
  if (request.options !== undefined) {
    if (!request.options || Array.isArray(request.options) || typeof request.options !== 'object') throw invalid();
    stable(request.options); input.options = clone(request.options);
  }
  return input;
}
async function requestKey(scope, identity, input, attempt) {
  const withoutKey = { ...input }; delete withoutKey.requestKey;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(stable({ scope, identity, input: withoutKey, attempt })));
  return 'shared-ai-' + Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
}
function createSharedAiJobClient(env) {
  const { projectId, scope, runScript, load, save } = env || {};
  if (typeof projectId !== 'string' || !projectId || typeof scope !== 'string' || !scope ||
      ![runScript, load, save].every(f => typeof f === 'function')) throw invalid();
  const storageKey = stable({ projectId, scope });
  const fresh = () => ({ version: 1, projectId, scope, records: [] });
  // Observe one saved job; timing out a read never cancels or resubmits it.
  // Use the monotonic clock when available, rather than the user's wall clock.
  function observation(options, cancel = false) {
    const timing = (value, fallback, max, zero = false) => {
      const n = value ?? fallback;
      if (!Number.isFinite(n) || n < (zero ? 0 : 1) || n > max) throw invalid();
      return n;
    };
    const maxWaitMs = timing(options.maxWaitMs ?? env.maxWaitMs, cancel ? 60000 : 1800000, 86400000);
    const pollMs = timing(options.pollMs ?? env.pollMs, 500, 60000, true);
    const readTimeoutMs = timing(options.readTimeoutMs ?? env.readTimeoutMs, 30000, 60000);
    const readRetryMs = timing(options.readRetryMs ?? env.readRetryMs, 500, 60000, true);
    const now = typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? () => performance.now() : () => Date.now();
    const deadline = now() + maxWaitMs, signal = options.signal;
    const pending = (record, cause) => {
      const message = cancel ? 'AI cancellation could not be confirmed. Cancellation is saved; reopen to recover it.'
        : 'AI progress or results could not be confirmed. Reopen to recover the saved job.';
      return Object.assign(error(cancel ? 'SHARED_AI_CANCEL_PENDING' : 'SHARED_AI_OBSERVATION_PENDING', message),
        { publicMessage: message, workflowId: record?.workflowId, projectId, ...(cause === undefined ? {} : { cause }) });
    };
    const check = record => { attached(signal); if (now() >= deadline) throw pending(record); };
    // Late read replies are ignored. This helper is never used for a write.
    function wait(task, milliseconds, onTimeout) {
      return new Promise((resolve, reject) => {
        let done = false;
        const finish = (fn, value) => {
          if (done) return;
          done = true; clearTimeout(timer); signal?.removeEventListener('abort', abort); fn(value);
        };
        const abort = () => { try { attached(signal); } catch (cause) { finish(reject, cause); } };
        const timer = setTimeout(() => task ? finish(reject, onTimeout()) : finish(resolve), milliseconds);
        signal?.addEventListener('abort', abort, { once: true });
        if (signal?.aborted) { abort(); return; }
        if (task) Promise.resolve().then(task).then(value => finish(resolve, value), cause => finish(reject, cause));
      });
    }
    async function pause(milliseconds, record) {
      check(record);
      const remaining = Math.max(0, deadline - now());
      await wait(null, Math.min(milliseconds, remaining));
      // Timers may round fractional milliseconds down. A capped delay consumes
      // the budget; do not squeeze another request into that rounding gap.
      if (milliseconds >= remaining) throw pending(record);
      check(record);
    }
    async function read(record, script, summary) {
      for (let attempt = 0; attempt < 3; attempt++) {
        check(record);
        let value;
        try {
          const remaining = Math.max(0, deadline - now());
          value = await wait(() => runScript(script, summary, false), Math.min(readTimeoutMs, remaining),
            () => readTimeoutMs >= remaining ? pending(record) : error('SHARED_AI_READ_TIMEOUT', 'The AI observation read timed out.'));
        } catch (cause) {
          if (['SHARED_AI_DETACHED','SHARED_AI_OBSERVATION_PENDING','SHARED_AI_CANCEL_PENDING'].includes(cause?.code)) throw cause;
          check(record);
          if (attempt === 2) throw pending(record, cause);
          await pause(Math.min(60000, readRetryMs * 2 ** attempt), record);
          continue;
        }
        check(record); return value;
      }
    }
    return { check, read, pause: record => pause(pollMs, record) };
  }
  async function read() {
    let journal;
    try { journal = await load(); }
    catch (cause) {
      if (String(cause?.message || cause).trim() === 'The file is unavailable.' || /ENOENT|not found|does not exist/i.test(String(cause?.message || cause))) journal = null;
      else throw cause;
    }
    if (journal == null) return fresh();
    if (typeof journal === 'string') { try { journal = JSON.parse(journal); } catch { throw invalid(); } }
    if (journal.version !== 1 || journal.projectId !== projectId || journal.scope !== scope || !Array.isArray(journal.records) || journal.records.length > 10000) throw invalid();
    const keys = new Set();
    for (const r of journal.records) {
      if (!r || typeof r.identity !== 'string' || !Number.isSafeInteger(r.attempt) || r.attempt < 0 || r.attempt > 255 ||
          !/^shared-ai-[\da-f]{64}$/.test(r.input?.requestKey) || keys.has(r.input.requestKey) ||
          (r.workflowId !== undefined && (typeof r.workflowId !== 'string' || !r.workflowId)) ||
          (r.status !== undefined && !STATUS.has(r.status)) || (r.cancelRequested !== undefined && typeof r.cancelRequested !== 'boolean')) throw invalid();
      const input = inputFor(projectId, r.input);
      if (stable({ ...input, requestKey: r.input.requestKey }) !== stable(r.input)) throw invalid();
      keys.add(r.input.requestKey);
    }
    return clone(journal);
  }
  async function update(record) {
    const prior = writes.get(storageKey) || Promise.resolve();
    const pending = prior.catch(() => {}).then(async () => {
      const journal = await read(), i = journal.records.findIndex(r => r.input.requestKey === record.input.requestKey), old = journal.records[i];
      if (old?.workflowId && record.workflowId && old.workflowId !== record.workflowId) throw invalid();
      const next = { ...old, ...record, cancelRequested: Boolean(old?.cancelRequested || record.cancelRequested) };
      if (old?.workflowId) next.workflowId = old.workflowId;
      if (old && terminal(old.status)) next.status = old.status;
      if (i < 0) journal.records.push(next); else journal.records[i] = next;
      await save(clone(journal)); Object.assign(record, next);
    });
    writes.set(storageKey, pending);
    try { await pending; } finally { if (writes.get(storageKey) === pending) writes.delete(storageKey); }
  }
  async function ack(record, signal) {
    if (record.workflowId) return;
    attached(signal);
    const value = await runScript(`if(typeof selects.ai?.submit!=='function')throw new Error('AI_UPDATE_REQUIRED');const j=await selects.ai.submit(${JSON.stringify(record.input)});return {workflowId:j.workflowId};`, 'Start shared AI analysis', true);
    if (typeof value?.workflowId !== 'string' || !value.workflowId) throw invalid();
    record.workflowId = value.workflowId;
    // Preserve an acknowledgment even when a panel detached during submit.
    await update(record); attached(signal);
  }
  async function status(record, observer, cancel = false) {
    observer.check(record);
    const script = `return await selects.ai.job(${JSON.stringify(record.workflowId)},${JSON.stringify(projectId)}).${cancel ? 'cancel' : 'status'}();`;
    // A cancellation is a write, so its transport failure is never retried here.
    const value = cancel ? await runScript(script, 'Cancel shared AI analysis', true)
      : await observer.read(record, script, 'Read shared AI progress');
    if (value?.workflowId !== record.workflowId || value.projectId !== projectId || value.runtimeId !== 'selects-ai-runtime' || value.task !== record.input.task || !STATUS.has(value.status)) throw invalid();
    record.status = value.status; await update(record); return value;
  }
  async function stop(record, options, observer) {
    record.cancelRequested = true; await update(record); await ack(record, options.signal);
    if (!terminal(record.status)) await status(record, observer, true);
    while (!terminal(record.status)) {
      await observer.pause(record);
      await status(record, observer);
    }
  }
  async function run(request, options = {}) {
    attached(options.signal);
    const observer = observation(options);
    const input = inputFor(projectId, request), identity = options.identity ?? '';
    if (typeof identity !== 'string') throw invalid();
    const journal = await read();
    let record = journal.records.filter(r => r.identity === identity && stable(inputFor(projectId, r.input)) === stable(input)).sort((a, b) => b.attempt - a.attempt)[0];
    if (record && record.input.requestKey !== await requestKey(scope, identity, input, record.attempt)) throw invalid();
    // A detached panel can have saved 'running' while Main has since stopped.
    // Refresh only during recovery; failure of a newly submitted job is not retried.
    if (record?.workflowId && options.retryTerminal) {
      attached(options.signal); await status(record, observer); attached(options.signal);
    }
    if (record && options.retryTerminal && record.cancelRequested && !terminal(record.status)) await stop(record, options, observer);
    if (!record || options.retryTerminal && (['failed', 'canceled'].includes(record.status) || record.cancelRequested && terminal(record.status))) {
      const attempt = record ? record.attempt + 1 : 0;
      if (attempt > 255) throw invalid();
      record = { identity, attempt, input: { ...input, requestKey: await requestKey(scope, identity, input, attempt) } };
      await update(record);
    }
    await ack(record, options.signal);
    for (;;) {
      attached(options.signal);
      const latest = (await read()).records.find(r => r.input.requestKey === record.input.requestKey);
      if (!latest) throw invalid(); Object.assign(record, latest);
      const value = await status(record, observer, record.cancelRequested && !terminal(record.status));
      attached(options.signal);
      if (record.cancelRequested || record.status === 'canceled') throw error('SHARED_AI_CANCELED', 'AI analysis was canceled. Start again to retry.');
      if (record.status === 'failed') throw error('SHARED_AI_FAILED', 'AI analysis failed. ' + String(value.lastErrorMessage || '').slice(0, 300));
      if (record.status === 'succeeded') {
        const result = await observer.read(record, `return await selects.ai.job(${JSON.stringify(record.workflowId)},${JSON.stringify(projectId)}).result();`, 'Read shared AI result');
        attached(options.signal);
        if (result?.workflowId !== record.workflowId || result.task !== record.input.task || !result.files || typeof result.files !== 'object') throw invalid();
        return { workflowId: record.workflowId, input: clone(record.input), result };
      }
      options.onProgress?.(value);
      await observer.pause(record);
    }
  }
  async function cancel(options = {}) {
    const observer = observation(options, true);
    const journal = await read();
    for (const record of journal.records) {
      if (options.identity !== undefined && record.identity !== options.identity || terminal(record.status)) continue;
      if (record.input.requestKey !== await requestKey(scope, record.identity, record.input, record.attempt)) throw invalid();
      await stop(record, options, observer);
    }
  }
  return { run, cancel };
}
module.exports = { createSharedAiJobClient };
// ai-job-client:end
return module.exports;})();
const sharedAiResources=(()=>{const module={exports:{}};
// ai-resources:start
// Private joins between short run_script ids and persistent Project Resource ids.
const UUID = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const fingerprint = rows => JSON.stringify(rows.map(r => [r.resourceId, r.name, r.type]));
function canonicalResourceBindings(core, { projectId, draftId, trackKinds = ['Main'] } = {}) {
  if (!core?.owner?.projectId || projectId && core.owner.projectId !== projectId || draftId && core.sequenceJson?.id !== draftId) throw new Error('The Draft belongs to another Project.');
  const bindings = new Map();
  function walk(rows) {
    for (const row of rows || []) {
      const id = row.mediaReferences?.defaultMedia?.id;
      if (Number.isSafeInteger(row.id) && UUID.test(id)) {
        if (bindings.has(row.id) && bindings.get(row.id) !== id) throw new Error('Ambiguous clip source binding.');
        bindings.set(row.id, id);
      }
      if (Array.isArray(row.children)) walk(row.children);
    }
  }
  for (const track of core.sequenceJson?.tracks?.children || []) if (trackKinds.includes(track.kind)) walk(track.children);
  return bindings;
}
function pathKey(value) {
  const path = String(value).normalize('NFC'), windows = /^[a-z]:[\\/]|^\\\\/i.test(path);
  const normalized = path.replace(/\\/g, '/'); return windows ? normalized.toLowerCase() : normalized;
}
function runner(sdk, runScript) {
  return runScript || (async (script, summary, allowCommit = false) => {
    const value = await sdk.runScript({ script, summary, allowCommit });
    if (value?.isError || value?.result === undefined) throw new Error(value?.output || 'The Project read returned an incomplete result.');
    return value.result;
  });
}
async function joinRows(sdk, projectId, runScript, script) {
  const before = await sdk.call('listProjectResources', projectId);
  if (!Array.isArray(before)) throw new Error('Could not read Project Resources.');
  const observed = await runner(sdk, runScript)(script, 'Resolve persistent AI source');
  const after = await sdk.call('listProjectResources', projectId);
  if (!Array.isArray(after) || fingerprint(before) !== fingerprint(after) || observed?.count !== before.length || !Array.isArray(observed.rows)) throw new Error('Project Resources changed while resolving the AI source.');
  const out = new Map();
  for (const row of observed.rows) {
    const raw = before[row?.index];
    if (!Number.isSafeInteger(row?.index) || !raw || raw.name !== row.name || raw.type !== row.type || !UUID.test(raw.resourceId) || typeof row.id !== 'string') throw new Error('The persistent AI source could not be matched.');
    out.set(row.id, raw.resourceId);
  }
  return out;
}
async function resolveSharedAiResources(sdk, projectId, aliases, runScript) {
  if (!Array.isArray(aliases) || aliases.some(id => typeof id !== 'string' || !id)) throw new Error('Invalid AI source ids.');
  const wanted = [...new Set(aliases)];
  const mappings = await joinRows(sdk, projectId, runScript, `const p=selects.project(${JSON.stringify(projectId)});const all=await p.resources();const wanted=${JSON.stringify(wanted)};return {count:all.length,rows:all.flatMap((r,index)=>wanted.includes(r.resourceId)?[{index,id:r.resourceId,name:r.name,type:r.type}]:[])};`);
  for (const id of wanted) if (UUID.test(id)) {
    const raw = await sdk.call('listProjectResources', projectId);
    if (!raw.some(r => r.resourceId === id)) throw new Error('The AI source is no longer in this Project.');
    mappings.set(id, id);
  }
  if (wanted.some(id => !mappings.has(id))) throw new Error('The AI source id is unavailable.');
  return mappings;
}
async function importSharedAiResource(sdk, projectId, path, runScript) {
  if (typeof path !== 'string' || !path || !(/^(?:[a-z]:[\\/]|\\\\|\/)/i.test(path))) throw new Error('An absolute AI source path is required.');
  const run = runner(sdk, runScript);
  const script = `const p=selects.project(${JSON.stringify(projectId)});const all=await p.resources();const key=${pathKey.toString()};const aliases=new Set<string>();const visit=(rows:any[])=>{for(const n of rows||[]){if(n.type==='dir')visit(n.children);else if(n.path&&key(n.path)===key(${JSON.stringify(path)}))aliases.add(n.resourceId);}};const tree=await p.sourceFiles();if('fileTree' in tree)visit(tree.fileTree);else for(const f of tree.folders||[]){const part=await p.sourceFiles({folder:f.name});if('fileTree' in part)visit(part.fileTree);}return {count:all.length,rows:all.flatMap((r,index)=>aliases.has(r.resourceId)?[{index,id:r.resourceId,name:r.name,type:r.type}]:[])};`;
  let map = await joinRows(sdk, projectId, run, script);
  if (!map.size) {
    await run(`return await selects.project(${JSON.stringify(projectId)}).importFiles({paths:[${JSON.stringify(path)}]});`, 'Register AI source media', true);
    map = await joinRows(sdk, projectId, run, script);
  }
  const ids = [...new Set(map.values())];
  if (ids.length !== 1) throw new Error('The imported AI source path is missing or ambiguous.');
  return ids[0];
}
module.exports = { canonicalResourceBindings, resolveSharedAiResources, importSharedAiResource, importSharedAiVideo: importSharedAiResource };
// ai-resources:end
return module.exports;})();

const sharedCoverFocus=(()=>{const module={exports:{}};
// cover-focus:start
// Calculates focus for observed face boxes only; undetected faces and unsampled motion remain unknown.
// Detection boxes are in the displayed source raster, before the existing cover crop.
// This only finds a feasible focus; it cannot make an over-wide group fit a fixed crop.
function faceSafeCoverFocus(source, frame, observation, manualFocus = null) {
  if (manualFocus) {
    if (![manualFocus.focusX, manualFocus.focusY].every(n => Number.isFinite(n) && n >= 0 && n <= 1)) throw Error('Invalid manual focus');
    return { status: 'manual', focusX: manualFocus.focusX, focusY: manualFocus.focusY };
  }
  const W = source.width, H = source.height, w = frame.width, h = frame.height;
  if (![W, H, w, h].every(n => Number.isFinite(n) && n > 0)) throw Error('Invalid crop dimensions');
  if (observation?.coordinateSpace !== 'display-pixels' || observation?.boxFormat !== 'xyxy' ||
      observation?.frameSize?.width !== W || observation?.frameSize?.height !== H || !Array.isArray(observation.samples) || !observation.samples.length) {
    return { status: 'unavailable', reason: 'face-coordinates' };
  }
  let boxCount = 0;
  const bounds = { left: W, right: 0, top: H, bottom: 0 };
  for (const sample of observation.samples) {
    if (!Array.isArray(sample.faces)) return { status: 'unavailable', reason: 'face-coordinates' };
    for (const face of sample.faces) {
      const b = face?.box;
      if (!b || ![b.xmin, b.ymin, b.xmax, b.ymax].every(Number.isFinite) ||
          b.xmin < 0 || b.ymin < 0 || b.xmax > W || b.ymax > H || b.xmin >= b.xmax || b.ymin >= b.ymax) {
        return { status: 'unavailable', reason: 'face-coordinates' };
      }
      boxCount++;
      bounds.left = Math.min(bounds.left, b.xmin); bounds.right = Math.max(bounds.right, b.xmax);
      bounds.top = Math.min(bounds.top, b.ymin); bounds.bottom = Math.max(bounds.bottom, b.ymax);
    }
  }
  if (!boxCount) return { status: 'unavailable', reason: 'no-faces' };
  const cropW = Math.min(W, H * w / h), cropH = Math.min(H, W * h / w);
  if (bounds.right - bounds.left > cropW + 1e-7 || bounds.bottom - bounds.top > cropH + 1e-7) {
    return { status: 'cannot-fit', reason: 'faces-wider-than-crop', observedFaceBoxes: boxCount };
  }
  // Keep the existing centered composition when it already contains every box.
  const centered = bounds.left >= (W - cropW) / 2 && bounds.right <= (W + cropW) / 2 &&
    bounds.top >= (H - cropH) / 2 && bounds.bottom <= (H + cropH) / 2;
  if (centered) return { status: 'focused', focusX: 0.5, focusY: 0.5, changed: false,
    observedFaceBoxes: boxCount, observedBounds: bounds, cropWidth: cropW, cropHeight: cropH };
  const x = Math.max(cropW / 2, Math.min(W - cropW / 2, (bounds.left + bounds.right) / 2));
  const y = Math.max(cropH / 2, Math.min(H - cropH / 2, (bounds.top + bounds.bottom) / 2));
  return { status: 'focused', focusX: x / W, focusY: y / H, changed: true, observedFaceBoxes: boxCount,
    observedBounds: bounds, cropWidth: cropW, cropHeight: cropH };
}

module.exports = { faceSafeCoverFocus };
// cover-focus:end
return module.exports;})();
const recapFaceFocus=sharedCoverFocus.faceSafeCoverFocus;

// Position uses FCP units: percent of the output height, +X right and +Y up.
function recapFocusTransform(source,focus) {
  const pixelScale=Math.max(1080/source.width,1920/source.height);
  const fit=Math.min(1080/source.width,1920/source.height),cover=pixelScale/fit;
  return {scale:{x:cover,y:cover},position:{x:(0.5-focus.focusX)*source.width*pixelScale/1920*100,y:(focus.focusY-0.5)*source.height*pixelScale/1920*100}};
}
// Reuse only the source windows the existing assembler requests. Overlapping
// windows merge; disjoint selected times remain separate, never min..max gaps.
function recapFaceWindows(slots,media,placements,introEnd,limit,fps) {
  if(!Number.isFinite(fps)||fps<=0)return [];
  const windows=[];
  const add=(slot,start,end)=>{if(Number.isFinite(start)&&Number.isFinite(end)&&start>=0&&end>start)windows.push({slot,resourceId:slots[slot-1].resourceId,startSeconds:start,endSeconds:end});};
  add(1,slots[0].startSeconds,slots[0].startSeconds+introEnd+0.3);
  for(let i=1;i<limit;i++){
    const row=placements[i],slot=slots[row.slot-1],source=media[slot?.resourceId];
    if(!source||!Number.isFinite(source.durationSeconds))continue;
    const frames=Math.round(row.endSeconds*fps)-Math.round(placements[i-1].endSeconds*fps);
    if(frames<1)continue;
    const end=Math.min(source.durationSeconds-0.05,slot.startSeconds+(frames+3)/fps);
    add(row.slot,slot.startSeconds,end);
    // A short source is repeated from zero by the current assembler. Its
    // repeated prefix must also constrain the fixed focus used by that slot.
    if(end-slot.startSeconds<(frames+3)/fps-1e-9)add(row.slot,0,Math.min(source.durationSeconds-0.05,(frames+3)/fps));
  }
  return windows;
}
function recapMergeFaceWindows(windows) {
  const merged=[];
  for(const row of [...windows].sort((a,b)=>a.resourceId.localeCompare(b.resourceId)||a.startSeconds-b.startSeconds||a.endSeconds-b.endSeconds)){
    const last=merged.at(-1);
    if(last&&last.resourceId===row.resourceId&&row.startSeconds<=last.endSeconds+1e-9)last.endSeconds=Math.max(last.endSeconds,row.endSeconds);
    else merged.push({resourceId:row.resourceId,startSeconds:row.startSeconds,endSeconds:row.endSeconds});
  }
  return merged;
}
async function recapFaceScript(sdk,script,summary,allowCommit=false) {
  const response=await sdk.runScript({script,summary,allowCommit});
  if(response?.isError||response?.result==null)throw Error(response?.output||'Face analysis could not be read.');
  return response.result;
}
async function prepareRecapFaceFocus(sdk,{projectId,slots,byId,manifest,limit,isCurrent=()=>true}) {
  const check=()=>{if(!isCurrent())throw Error('The recap ended during face analysis.');};check();
  const fps=byId[slots[0]?.resourceId]?.frameRate;
  const windows=recapFaceWindows(slots,byId,manifest.placements,manifest.introEnd,limit,fps);
  const diagnostics=[],focusBySlot={};
  if(!windows.length||!sdk.storage?.getItem||!sdk.storage?.setItem)return {fps,focusBySlot,diagnostics:[{status:'unavailable',reason:'source-clock-or-storage'}]};
  let capability;try{capability=await recapFaceScript(sdk,"return {supported:typeof selects.ai?.submit==='function'};",'Check selected-window face analysis');}catch{}
  check();if(!capability?.supported)return {fps,focusBySlot,diagnostics:[{status:'unavailable',reason:'host-support'}]};
  const automatic=windows.filter(row=>!(Number.isFinite(slots[row.slot-1].focusX)&&Number.isFinite(slots[row.slot-1].focusY)));
  const ranges=recapMergeFaceWindows(automatic),aliases=await sharedAiResources.resolveSharedAiResources(sdk,projectId,ranges.map(row=>row.resourceId));check();
  const key='recap-2026:face-source-window-v1:'+projectId;
  const jobs=sharedAiJobs.createSharedAiJobClient({projectId,scope:'recap-2026:face-source-window-v1',runScript:(code,summary,write)=>{check();return recapFaceScript(sdk,code,summary,write)},load:async()=>{const value=await panelStorage(sdk).getItem(key);return value==null?null:JSON.parse(value)},save:value=>panelStorage(sdk).setItem(key,JSON.stringify(value)),maxWaitMs:120000,readTimeoutMs:10000,pollMs:500});
  const observations=[],fingerprints=new Map(),deadline=Date.now()+120000;
  for(const range of ranges){
    check();const sourceRange={startSeconds:range.startSeconds,endSeconds:range.endSeconds},rawId=aliases.get(range.resourceId),source=byId[range.resourceId];
    if(Date.now()>=deadline){diagnostics.push({...range,status:'unavailable',reason:'observation-budget'});continue;}
    if(!fingerprints.has(range.resourceId)){
      const fingerprint=await recapFaceScript(sdk,'return await ('+fingerprintTemplateFile.toString()+')(selects.files,'+JSON.stringify(source.path)+');','Verify selected-window source bytes');check();
      if(!fingerprint)throw Error('The original recap source is missing.');
      fingerprints.set(range.resourceId,fingerprint);
    }
    try{
      const observed=await jobs.run({task:'faces.detect',resourceId:rawId,sourceRange,options:{provider:'cpu',scoreThreshold:0.8,sampleEverySeconds:0.25}},{identity:JSON.stringify({resourceId:rawId,path:source.path,...fingerprints.get(range.resourceId),frameSize:source.frameSize,sourceRange}),maxWaitMs:Math.max(1,deadline-Date.now())});check();
      const artifact=observed.result.files.detections;if(!artifact)throw Error('No video face coordinates.');
      const data=await recapFaceScript(sdk,`return await selects.ai.readJSON(${JSON.stringify(artifact)},${JSON.stringify(projectId)});`,'Read selected-window face coordinates');check();
      if(data?.contractVersion!==1||data.task!=='faces.detect'||data.sourceKind==='image'||data.frameSize?.width!==source.frameSize?.width||data.frameSize?.height!==source.frameSize?.height||data.parameters?.sourceRange?.startSeconds!==range.startSeconds||data.parameters?.sourceRange?.endSeconds!==range.endSeconds||!Array.isArray(data.samples)||!data.samples.length||data.samples.some(row=>!Number.isFinite(row.sourceTimeSeconds)||row.sourceTimeSeconds<range.startSeconds-1e-7||row.sourceTimeSeconds>=range.endSeconds+1e-7))throw Error('The selected video face coordinates have another source window.');
      observations.push({...range,data,workflowId:observed.workflowId});
    }catch(error){check();diagnostics.push({...range,status:'unavailable',reason:error.code||'face-analysis',message:String(error.message||error).slice(0,160)});}
  }
  for(const [resourceId,before] of fingerprints){
    const after=await recapFaceScript(sdk,'return await ('+fingerprintTemplateFile.toString()+')(selects.files,'+JSON.stringify(byId[resourceId].path)+');','Verify selected-window source bytes');check();
    if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Original recap footage changed during face analysis.');
  }
  for(let index=0;index<slots.length;index++){
    check();const slot=slots[index],source=byId[slot.resourceId];if(!source?.frameSize)continue;
    const selected=windows.filter(row=>row.slot===index+1),manual=Number.isFinite(slot.focusX)&&Number.isFinite(slot.focusY)?slot:null;
    const matches=selected.map(window=>observations.find(row=>row.resourceId===window.resourceId&&row.startSeconds<=window.startSeconds+1e-9&&row.endSeconds>=window.endSeconds-1e-9));
    const complete=selected.length&&matches.every(Boolean);
    const first=matches.find(Boolean)?.data;
    const samples=complete?selected.flatMap((window,i)=>matches[i].data.samples.filter(sample=>sample.sourceTimeSeconds>=window.startSeconds-1e-7&&sample.sourceTimeSeconds<window.endSeconds+1e-7)):[];
    const focus=recapFaceFocus(source.frameSize,{width:1080,height:1920},first?{...first,samples}:null,manual);
    diagnostics.push({slot:index+1,...focus,coverage:'sampled-source-windows'});
    if(focus.status==='manual'||focus.status==='focused'&&focus.changed)focusBySlot[index+1]=recapFocusTransform(source.frameSize,focus);
  }
  check();return {fps,focusBySlot,diagnostics,sourceGuard:Object.fromEntries([...fingerprints].map(([id,value])=>[id,{path:byId[id].path,...value}]))};
}

function buildSlots(videos, intro, count) {
  if (!videos.length || !intro?.resourceId || !(count > 1)) return [];
  const slots = [{...intro}];
  for (let i = 0; i < count - 1; i++) {
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
    "if(cfg.faceTransform&&cfg.sourceGuard?.[cfg.intro.resourceId]){const expected=cfg.sourceGuard[cfg.intro.resourceId],actual=await ("+fingerprintTemplateFile.toString()+")(selects.files,expected.path);if(!actual||actual.size!==expected.size||actual.sha256!==expected.sha256)throw Error('Intro changed after face analysis');}",
    "const d=await p.createDraft({name:cfg.name});",
    "await d.insertResource({resourceId:cfg.intro.resourceId,sourceRange:{startSeconds:cfg.intro.startSeconds,endSeconds:cfg.intro.startSeconds+cfg.introEnd+0.3}});",
    "await d.setFrameSize({width:1080,height:1920});",
    "const fps=(await d.meta()).fps,target=Math.round(cfg.introEnd*fps);",
    "const clips=await d.clips({trackScope:'main'}),end=Math.max(...clips.map(c=>c.endFrame));",
    "if(end<target)throw Error('Intro shorter than target');",
    "if(end>target)await d.remove(await d.rangeAtFrames(target,end),{tracks:'main'});",
    "const cur=(await d.clips({trackScope:'main'}))[0];",
    "const sz=cfg.intro.frameSize;if(cur&&sz?.width&&sz?.height){const fit=Math.min(1080/sz.width,1920/sz.height),cover=Math.max(1080/sz.width,1920/sz.height)/fit,face=cfg.faceTransform&&fps===cfg.expectedFps?cfg.faceTransform:null;if(cover>1.001||face)await d.setClipTransform({clip:cur,...(face||{scale:{x:cover,y:cover}})});}",
    "const commit=await d.commitAll('2026 Recap: create intro');",
    "return {draftId:commit.createdDraftId,fps,mainCount:1};"
  ].join("\n");
}

function batchScript(cfg) {
  return [
    core(cfg),
    "const d=selects.draft(cfg.draftId);const fps=(await d.meta()).fps;",
    "let cs=await d.clips({trackScope:'main'}),count=cs.length;const checkedSources=new Set();",
    "if(count>cfg.end)throw Error('Draft contains more clips than expected');",
    "for(let i=Math.max(count,cfg.start);i<cfg.end;i++){",
    "const row=cfg.placements[i],slot=cfg.slots[row.slot-1],media=cfg.media[slot.resourceId];",
    "if(!media)throw Error('Missing footage for slot '+row.slot);",
    "if(cfg.faceFocus?.[row.slot]&&!checkedSources.has(slot.resourceId)){const expected=cfg.sourceGuard?.[slot.resourceId];if(!expected)throw Error('Face analysis source evidence missing');const actual=await ("+fingerprintTemplateFile.toString()+")(selects.files,expected.path);if(!actual||actual.size!==expected.size||actual.sha256!==expected.sha256)throw Error('Footage changed after face analysis');checkedSources.add(slot.resourceId);}",
    "cs=await d.clips({trackScope:'main'});const before=Math.max(...cs.map(c=>c.endFrame));",
    "const wanted=Math.round(row.endSeconds*fps),n=wanted-before;",
    "if(n<1)throw Error('Invalid timing at placement '+i);",
    "let start=slot.startSeconds,actual=before;",
    "while(actual<wanted){const sourceEnd=Math.min(media.durationSeconds-0.05,start+(wanted-actual+3)/fps);",
    "if(sourceEnd-start<2/fps)throw Error('Source too short for slot '+row.slot);",
    "await d.insertResource({resourceId:slot.resourceId,sourceRange:{startSeconds:start,endSeconds:sourceEnd}});",
    "cs=await d.clips({trackScope:'main'});actual=Math.max(...cs.map(c=>c.endFrame));start=0;}",
    "if(actual<wanted)throw Error('Clip short after conform at slot '+row.slot);",
    "if(actual>wanted)await d.remove(await d.rangeAtFrames(wanted,actual),{tracks:'main'});",
    "const sz=media.frameSize;if(sz?.width&&sz?.height){const fit=Math.min(1080/sz.width,1920/sz.height),cover=Math.max(1080/sz.width,1920/sz.height)/fit;",
    "if(cover>1.001||cfg.faceFocus?.[row.slot])for(const id of (await d.clips({trackScope:'main'})).filter(x=>x.startFrame>=before&&x.resourceId===slot.resourceId).map(x=>x.clipId)){const c=(await d.clips({trackScope:'main'})).find(x=>x.clipId===id);if(c)await d.setClipTransform({clip:c,...(cfg.faceFocus?.[row.slot]||{scale:{x:cover,y:cover}})});}}",
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
    "if(!graphics.some(g=>g.name==='2026 Recap title'))await d.addMotionGraphic({label:'2026 Recap title',tsxCode:cfg.titleCode,parameters:{top:'thank you',year:'2026'},editableParameters:[{key:'top',label:'Top line',type:'text',defaultValue:'thank you'},{key:'year',label:'Year',type:'text',defaultValue:'2026'}],within:await d.rangeAtFrames(0,Math.round(cfg.introEnd*fps))});",
    "if(cfg.full&&!graphics.some(g=>g.name==='2026 Recap fade')){const a=Math.min(end-2,Math.round(cfg.fadeStart*fps));await d.addMotionGraphic({label:'2026 Recap fade',tsxCode:cfg.fadeCode,within:await d.rangeAtFrames(a,end)});}",
    "const commit=await d.commitAll('2026 Recap: add the song and title');",
    "return {draftId:cfg.draftId,endFrames:end,mainCount:main.length,commitId:commit.commitId};"
  ].join("\n");
}

async function ensureAudio(sdk, projectId) {
  hostUseSdk(sdk);
  let r = await sdk.runScript({
    summary:"Find fixed soundtrack",
    script:core({projectId}) + "const r=await p.resources();return r.filter(x=>x.type==='Audio').map(x=>({id:x.resourceId,name:x.name,status:x.status}));"
  });
  const found = scriptResult(r).find((x) => normPath(x.name) === normPath(AUDIO_NAME));
  if (found) return found.id;
  const {plugin, data} = await recapRoots(sdk);
  const path = hostJoin(plugin, "assets", AUDIO_NAME);
  r = await sdk.runScript({
    summary:"Import fixed soundtrack",allowCommit:true,
    script:core({projectId,path}) + "return await p.importFiles({paths:[cfg.path]});"
  });
  let imported = scriptResult(r).addedResourceIds;
  if (!imported?.length && data) {
    // Retry from a copy in the data folder (written through the host FileSystem, staged then renamed).
    const alternate = hostJoin(data, AUDIO_NAME), tmp = hostJoin(data, "soundtrack-" + Date.now() + ".part"), move = hostApi("FileSystem", "rename");
    await hostNeed("FileSystem", "writeFile").writeFile(move ? tmp : alternate, await hostReadBytes(path));
    if (move) { await hostRemove(alternate); (await move.rename(tmp, alternate)); }
    r = await sdk.runScript({
      summary:"Import fixed soundtrack",allowCommit:true,
      script:core({projectId,path:alternate}) + "return await p.importFiles({paths:[cfg.path]});"
    });
    imported = scriptResult(r).addedResourceIds;
  }
  if (!imported?.length) throw new Error("Could not import the bundled soundtrack");
  // The song is placed without analysis: an overlay needs none, and starting one asks the user to spend credits.
  return imported[0];
}


// Builds the recap Draft: the intro, the song's fast cuts in batches, then the
// song and title. `slots` holds the intro and one source per plan slot; `byId`
// the videos they name. Resolves the new Draft's id, name and clip count.
async function buildRecap(sdk,{projectId,slots,byId,intro,mode,onProgress=(_count,_limit)=>{},isCurrent=()=>true}) {
  hostUseSdk(sdk);
  const manifest = await readPlan(sdk);
  if (slots.length !== manifest.slotCount) throw new Error("The clip plan does not match the song");
  const limit = mode === "sample" ? manifest.placements.filter((p) => p.startSeconds < 12).length : manifest.placements.length;
  const faceFocus=await prepareRecapFaceFocus(sdk,{projectId,slots,byId,manifest,limit,isCurrent});
  if(!isCurrent())throw Error('The recap ended before creating a Draft.');
  const audioId = await ensureAudio(sdk, projectId);
  if(!isCurrent())throw Error('The recap ended before creating a Draft.');
  const name = "2026 Recap — " + (mode === "sample" ? "12s sample " : "") + new Date().toLocaleString();
  let r = await sdk.runScript({
    summary:"Create recap intro",allowCommit:true,timeoutSeconds:120,
    script:createScript({projectId,name,intro,introEnd:manifest.introEnd,faceTransform:faceFocus.focusBySlot[1],expectedFps:faceFocus.fps,sourceGuard:faceFocus.sourceGuard})
  });
  const created=scriptResult(r),draftId=created.draftId;
  if(created.fps!==faceFocus.fps)faceFocus.focusBySlot={};
  if (!draftId) throw new Error("Created Draft ID missing");
  for (let end=25;end<limit+24;end+=24) {
    const to = Math.min(end,limit);
    if (to <= 1) break;
    r = await sdk.runScript({
      summary:"Add recap footage",allowCommit:true,timeoutSeconds:120,
      script:batchScript({projectId,draftId,start:1,end:to,placements:manifest.placements,slots,media:byId,faceFocus:faceFocus.focusBySlot,sourceGuard:faceFocus.sourceGuard})
    });
    const out = scriptResult(r);
    onProgress(out.mainCount, limit);
    if (to === limit) break;
  }
  r = await sdk.runScript({
    summary:"Finish recap Draft",allowCommit:true,timeoutSeconds:120,
    script:finishScript({projectId,draftId,audioId,introEnd:manifest.introEnd,fadeStart:manifest.fadeStart,full:mode==="full",titleCode:TITLE_CODE,fadeCode:FADE_CODE})
  });
  const out = scriptResult(r);
  return {draftId,name,mainCount:out.mainCount,faceFocus:faceFocus.diagnostics};
}

// The length the Resource itself reports (the source-file tree keeps the length from when the tree was built,
// which can be missing or 0), keyed by script resource id. Prepended to a script that reads `dur`.
const RESOURCE_SECONDS = mediaDurationFact.toString() + ";const res=await p.resources();const dur={};for(const x of res)dur[x.resourceId]=x.durationSeconds;";
// Return only the picked videos across the script boundary, including Resources missing from the tree.
const selectedVideosScript = (projectId, resourceIds) => core({projectId,resourceIds}) + RESOURCE_SECONDS +
  "const items=[];const walk=(nodes)=>{for(const n of nodes||[]){if(n.type==='dir')walk(n.children);else if(n.type==='video'&&n.resourceId)items.push({resourceId:n.resourceId,name:n.name,path:n.path,...mediaDurationFact(dur[n.resourceId],n.durationSeconds),frameSize:n.frameSize,frameRate:n.frameRate});}};const r=await p.sourceFiles();if('fileTree' in r)walk(r.fileTree);else for(const f of r.folders){const page=await p.sourceFiles({folder:f.name});if('fileTree' in page)walk(page.fileTree);}const seen=new Set(items.map(x=>x.resourceId));for(const x of res)if(String(x.type).toLowerCase()==='video'&&!seen.has(x.resourceId))items.push({resourceId:x.resourceId,name:x.name,path:null,...mediaDurationFact(x.durationSeconds)});return items.filter(x=>cfg.resourceIds.includes(x.resourceId));";
// A clip with no length yet is measured with the host's ffprobe (av-host hostProbeSeconds) when it has a path.
async function withDurations(list) {
  return resolveMediaDurations(list, hostProbeSeconds);
}

const TEMPLATE_FAILED = "2026 Recap couldn't make the timeline. Try again.";

// The app hands a template its own Resource ids, but every run_script read
// (resources(), clips()) speaks the short ids the script SDK gives out (r0, r1…).
// The app's list (sdk.call) and the script's list are the Project's Resources in
// the same order. Return only the picked rows and compare their names and types
// before using their script ids.
async function scriptResourceIds(sdk, projectId, resourceIds) {
  const app = await sdk.call("listProjectResources", projectId);
  if (!Array.isArray(app)) throw new Error("Could not read the project resources.");
  const indices = [...new Set(resourceIds)].map(id => app.findIndex(r => r.resourceId === id));
  if (indices.includes(-1)) throw new Error("A picked clip is missing from this project.");
  const run = await sdk.runScript({ summary: "Match picked clips", allowCommit: false, script: `const rows=await selects.project(${JSON.stringify(projectId)}).resources();return {count:rows.length,rows:${JSON.stringify(indices)}.map(i=>{const r=rows[i];return r?{id:r.resourceId,name:r.name,type:r.type}:null;})};` });
  const result = scriptResult(run), rows = result.rows;
  if (result.count !== app.length || !Array.isArray(rows) || rows.length !== indices.length || indices.some((index, i) => app[index].name !== rows[i]?.name || app[index].type !== rows[i]?.type)) throw new Error("Could not match the picked clips to this project.");
  return new Map(indices.map((index, i) => [app[index].resourceId, rows[i].id]));
}

// Saved selections use durable Project Resource UUIDs. rN is a script-session
// alias and must never be used to reconnect a saved source after a restart.
const recapSelectionKey=(projectId)=>SLUG+':selection-v2:'+projectId;
async function bindRecapSourceIdentities(sdk,projectId,videos) {
  const mapping=await sharedAiResources.resolveSharedAiResources(sdk,projectId,videos.map(row=>row.resourceId));
  const found=videos.map(row=>({...row,projectId,sourceResourceId:mapping.get(row.resourceId)}));
  if(found.some(row=>!row.sourceResourceId)||new Set(found.map(row=>row.sourceResourceId)).size!==found.length)throw Error('Recap source identity is missing or duplicated.');
  return found;
}
function recapStoredSelection(projectId,{videos,folders,excludedIds,intro,slots},slotCount) {
  if(!projectId||!Array.isArray(videos)||videos.some(row=>row.projectId!==projectId))throw Error('Recap selection belongs to another Project.');
  const byAlias=new Map(videos.map(row=>[row.resourceId,row]));
  const raw=alias=>{const row=byAlias.get(alias);if(!row||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(row.sourceResourceId))throw Error('Recap source is missing.');return row.sourceResourceId;};
  const encode=slot=>{if(!slot||!Number.isFinite(slot.startSeconds)||slot.startSeconds<0)throw Error('Recap source window is invalid.');if(('focusX'in slot||'focusY'in slot)&&![slot.focusX,slot.focusY].every(n=>Number.isFinite(n)&&n>=0&&n<=1))throw Error('Recap focus is invalid.');return {sourceResourceId:raw(slot.resourceId),startSeconds:slot.startSeconds,...Number.isFinite(slot.focusX)&&Number.isFinite(slot.focusY)?{focusX:slot.focusX,focusY:slot.focusY}:{}};};
  if(!intro||slots.length!==slotCount)throw Error('Choose Recap footage before saving its selection.');
  return {version:2,projectId,folders:[...folders],excludedResourceIds:excludedIds.map(raw),intro:encode(intro),slots:slots.map(encode)};
}
function restoreRecapSelection(projectId,saved,videos,folders,slotCount,introNeed) {
  const fail=()=>{throw Error('Saved recap footage is unavailable or belongs to another Project. Choose the footage again.');};
  if(!saved||saved.version!==2||saved.projectId!==projectId||!Array.isArray(saved.slots)||saved.slots.length!==slotCount||!Array.isArray(saved.excludedResourceIds)||!Array.isArray(saved.folders)||JSON.stringify([...saved.folders].sort())!==JSON.stringify([...folders].sort())||videos.some(row=>row.projectId!==projectId))fail();
  const byRaw=new Map();
  for(const row of videos){if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(row.sourceResourceId)||byRaw.has(row.sourceResourceId))fail();byRaw.set(row.sourceResourceId,row);}
  const resolve=id=>{const row=byRaw.get(id);if(!row)fail();return row;};
  if(new Set(saved.excludedResourceIds).size!==saved.excludedResourceIds.length)fail();
  const excluded=saved.excludedResourceIds.map(id=>resolve(id).resourceId),excludedRaw=new Set(saved.excludedResourceIds);
  const decode=(slot,index)=>{
    const row=resolve(slot?.sourceResourceId),need=index===0?introNeed:1.7;
    if(!Number.isFinite(slot.startSeconds)||slot.startSeconds<0||slot.startSeconds>row.durationSeconds-need+1e-9||index>0&&(!folders.includes(row.folderName)||excludedRaw.has(row.sourceResourceId)))fail();
    if('focusX'in slot||'focusY'in slot)if(![slot.focusX,slot.focusY].every(n=>Number.isFinite(n)&&n>=0&&n<=1))fail();
    return {resourceId:row.resourceId,startSeconds:slot.startSeconds,...'focusX'in slot?{focusX:slot.focusX,focusY:slot.focusY}:{}};
  };
  const intro=decode(saved.intro,0),slots=saved.slots.map(decode);
  if(slots[0].resourceId!==intro.resourceId||slots[0].startSeconds!==intro.startSeconds)fail();
  return {intro,slots,excluded};
}
async function saveRecapSelection(sdk,projectId,state,slotCount) {
  const saved=recapStoredSelection(projectId,state,slotCount),storage=panelStorage(sdk);
  // New keys leave every legacy alias-only byte available for inspection.
  await storage.setItem(recapSelectionKey(projectId),JSON.stringify(saved));
}

// A Clip highlights run (`context.template`): the intro and clips picked in
// the app, cut in full to the soundtrack, built out of sight, reported once.
function TemplateRun({ sdk, context }) {
  useAppUpdateGuard(sdk, context?.language, () => !!(true));
  const runId = context.template?.runId;
  const [status, setStatus] = React.useState("Making your recap\u2026");
  const started = React.useRef(null), alive = React.useRef(true), latest = React.useRef(context);
  latest.current = context;
  React.useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  React.useEffect(() => {
    if (!runId || started.current === runId) return;
    started.current = runId;
    const live = () => alive.current && latest.current.template?.runId === runId && latest.current.projectId === context.projectId && latest.current.template?.libraryId === context.template?.libraryId;
    let ended = false;
    const finish = (result) => { if (ended) return; ended = true; if (!live()) return; try { sdk.finishTemplate(result); } catch (_) {} };
    (async () => {
      const template = context.template, projectId = context.projectId;
      if (!projectId) throw new Error("Open a project, then try again.");
      const introPick = (template.inputs?.intro || []).find((x) => x?.resourceId);
      const clipPicks = (template.inputs?.clips || []).filter((x) => x?.resourceId);
      if (!introPick || !clipPicks.length) throw new Error("Pick an intro and at least one clip, then try again.");
      const ids = await scriptResourceIds(sdk, projectId, [introPick, ...clipPicks].map(x => x.resourceId));
      const own = (id) => ids.get(id) ?? id;
      const found = await withDurations(scriptResult(await sdk.runScript({ script: selectedVideosScript(projectId, [...ids.values()]), summary: "Read footage" })));
      const byId = Object.fromEntries(found.map((v) => [v.resourceId, v]));
      const introVideo = byId[own(introPick.resourceId)];
      const videos = clipPicks.map((x) => byId[own(x.resourceId)]);
      if (!introVideo) throw new Error("The picked intro clip could not be read. Try again.");
      if (videos.some(video => !video)) throw new Error("A picked clip could not be read. Try again.");
      requireMediaDurations([introVideo, ...videos]);
      setStatus("Listening to the song\u2026");
      const plan = await readPlan(sdk);
      const introNeed = Math.ceil((plan.introEnd + 0.3) * 10) / 10;
      if (!(introVideo.durationSeconds >= introNeed)) throw new Error("Pick an intro clip at least " + introNeed + " seconds long.");
      const short = clipPicks.find((x, i) => !(videos[i]?.durationSeconds >= 1.7));
      if (short) throw new Error((short.name || "A picked clip") + " is shorter than 1.7 seconds. Pick longer clips.");
      const intro = { resourceId: introVideo.resourceId, startSeconds: 0 };
      const slots = buildSlots(videos, intro, plan.slotCount);
      if (!live()) return;
      setStatus("Cutting your clips to the beat\u2026");
      // Only the picked videos go into each batch script.
      const media = Object.fromEntries([introVideo, ...videos].map((v) => [v.resourceId, v]));
      const made = await buildRecap(sdk, { projectId, slots, byId: media, intro: { ...intro, frameSize: introVideo.frameSize }, mode: "full",isCurrent:live });
      finish({ sequenceId: made.draftId });
    })().catch((e) => {
      console.warn("[recap-2026] template run failed:", e);
      const said = e?.code === "host-missing" ? WORDS.en.hostTooOld : String(e?.message || "");
      finish({ error: said && said.length <= 160 && !/[\n{]/.test(said) ? said : TEMPLATE_FAILED });
    });
  }, [runId]);
  return <small>{status}</small>;
}

function Panel(props) {
  hostUseSdk(props.sdk);
  return props.context?.template ? <TemplateRun {...props} /> : <RecapPanel key={props.context?.projectId} {...props} />;
}

function RecapPanel({ sdk, context, ui }) {
  useAppUpdateGuard(sdk, context?.language, () => !!(busy));
  const t = WORDS[context.language] || WORDS.en;
  const projectId = context.projectId;
  const [folders, setFolders] = React.useState([]);
  const [selectedFolders, setSelectedFolders] = React.useState([]);
  const [videos, setVideos] = React.useState([]);
  const [excludedIds, setExcludedIds] = React.useState([]);
  const [introChoice, setIntroChoice] = React.useState(null);
  const [loadedKey, setLoadedKey] = React.useState(null);
  const [slots, setSlots] = React.useState([]);
  const [plan, setPlan] = React.useState(null);
  const slotCount = plan?.slotCount || 0, introSeconds = plan ? plan.introEnd : 0, introNeed = plan ? Math.ceil((plan.introEnd + 0.3) * 10) / 10 : Infinity;
  React.useEffect(() => {
    let live = true;
    readPlan(sdk).then((p) => { if (live) setPlan(p); }).catch((e) => { if (live) setError(hostMessage(e, t)); });
    return () => { live = false; };
  }, []);
  const [editSlot, setEditSlot] = React.useState(2);
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [excludeOpen, setExcludeOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const faceScope=React.useRef(true);
  React.useEffect(()=>{faceScope.current=true;return()=>{faceScope.current=false;};},[]);
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
    sdk.runScript({script,summary:"List footage folders"}).then(async (r) => {
      if (!live) return;
      const found = scriptResult(r).filter((x) => x.count > 0);
      found.sort((a,b) => b.count-a.count);
      let initial=found[0]?[found[0].name]:[];
      const storage=panelStorage(sdk),newFolders=JSON.parse((await storage.getItem(recapSelectionKey(projectId)))||'null');
      if(newFolders&&(newFolders.version!==2||newFolders.projectId!==projectId||!Array.isArray(newFolders.folders)))throw Error('Saved recap folders belong to another Project.');
      const saved=newFolders?.folders??JSON.parse((await storage.getItem(SLUG+":"+projectId+":folders"))||"null");
      if (!live) return;
      if(Array.isArray(saved))initial=found.map((x)=>x.name).filter((name)=>saved.includes(name));
      setFolders(found);setSelectedFolders(initial);setMessage("");
    }).catch((e) => {if(live){setError(String(e.message || e));setMessage("");}});
    return () => {live = false;};
  }, [projectId]);

  React.useEffect(() => {
    if (!projectId || !folders.length || !plan) return;
    let live = true;
    setLoadedKey(null);
    setMessage(t.loading);setError("");setGalleryPage(0);
    setThumbnails({});thumbnailCache.current={};
    const script = core({projectId,folders:folders.map((x)=>x.name)}) + RESOURCE_SECONDS +
      "const out=[];for(const name of cfg.folders){const r=await p.sourceFiles({folder:name});if(!('fileTree' in r))throw Error('Footage folder returned a summary');for(const x of r.fileTree){if(x.type!=='video')continue;const fact=mediaDurationFact(dur[x.resourceId],x.durationSeconds);if(fact.durationSeconds===null||fact.durationSeconds>=1.7)out.push({resourceId:x.resourceId,name:x.name,path:x.path,...fact,frameSize:x.frameSize,frameRate:x.frameRate,folderName:name});}}return out;";
    readMediaPages(sdk,{script,summary:"Read footage folders"}).then((r) => withDurations(scriptResult(r))).then(async (list) => {
      if (!live) return;
      const unique=[...new Map(list.filter(v=>v.durationSeconds>=1.7).map(v=>[v.resourceId,v])).values()].sort((a,b)=>a.name.localeCompare(b.name));
      const found=await bindRecapSourceIdentities(sdk,projectId,unique);if(!live)return;
      const storage=panelStorage(sdk),savedText=await storage.getItem(recapSelectionKey(projectId));
      let intro=null,excluded=[],next=[],needsSelection=false;
      if(savedText){
        try{const restored=restoreRecapSelection(projectId,JSON.parse(savedText),found,selectedFolders,slotCount,introNeed);intro=restored.intro;excluded=restored.excluded;next=restored.slots;}
        catch{needsSelection=true;}
      }else{
        const legacyKey=SLUG+':'+projectId+':'+selectedFolders.join('|');
        const legacy=await Promise.all([storage.getItem(legacyKey),storage.getItem(SLUG+':'+projectId+':intro'),storage.getItem(legacyKey+':intro'),storage.getItem(SLUG+':'+projectId+':excluded')]);
        needsSelection=legacy.some(value=>value!==null&&value!==undefined);
      }
      if(!live)return;
      if(!intro&&!needsSelection){const first=found.find(v=>v.durationSeconds>=introNeed);intro=first?{resourceId:first.resourceId,startSeconds:0}:null;}
      if(!next.length&&!needsSelection)next=buildSlots(found.filter(v=>selectedFolders.includes(v.folderName)&&!excluded.includes(v.resourceId)),intro,slotCount);
      setVideos(found);setExcludedIds(excluded);setIntroChoice(intro);setSlots(next);setLoadedKey(projectId);setMessage(found.length?t.ready:t.noVideo);
      if(needsSelection)setError(t.restoreSelection||WORDS.en.restoreSelection);
    }).catch((e) => {if(live){setError(String(e.message || e));setMessage("");}});
    return () => {live = false;};
  }, [projectId, folders.map((x)=>x.name).join("|"), slotCount]);

  // Capture each complete selection before queueing writes, including the final edit.
  const saveSelection = () => {
    if(!introChoice||!slotCount||slots.length!==slotCount)return Promise.resolve();
    return saveRecapSelection(sdk,projectId,{videos,folders:selectedFolders,excludedIds,intro:introChoice,slots},slotCount);
  };
  React.useEffect(() => {
    if (!projectId || loadedKey!==projectId) return;
    let current = true;
    saveSelection().catch(e => { if(current) setError("Could not save recap selections: " + String(e?.message || e)); });
    return () => { current = false; };
  }, [projectId, selectedFolders.join("|"), loadedKey, introChoice, excludedIds, slots]);

  const current = slots[editSlot-1];
  const currentVideo = videos.find((v) => v.resourceId === current?.resourceId);
  const introVideo=videos.find((v)=>v.resourceId===introChoice?.resourceId);
  const folderVideos=videos.filter((v)=>selectedFolders.includes(v.folderName));
  const selectedVideos=folderVideos.filter((v)=>!excludedIds.includes(v.resourceId));
  const changeSlot = (patch) => setSlots((old) => old.map((x,i) => i === editSlot-1 ? {...x,...patch} : x));
  const changeIntro=(patch)=>{
    setError("");
    const next={...introChoice,...patch};
    setIntroChoice(next);
    setSlots((old)=>old.length===slotCount?[next,...old.slice(1)]:buildSlots(selectedVideos,next,slotCount));
  };
  const toggleFolder=(name)=>{
    const next=selectedFolders.includes(name)?selectedFolders.filter((x)=>x!==name):folders.map((x)=>x.name).filter((x)=>selectedFolders.includes(x)||x===name);
    setSelectedFolders(next);
    setGalleryPage(0);
    setSlots(buildSlots(videos.filter((v)=>next.includes(v.folderName)&&!excludedIds.includes(v.resourceId)),introChoice,slotCount));
  };
  const toggleExclusion=(id)=>{
    const next=excludedIds.includes(id)?excludedIds.filter((x)=>x!==id):[...excludedIds,id];
    setExcludedIds(next);
    setSlots(buildSlots(videos.filter((v)=>selectedFolders.includes(v.folderName)&&!next.includes(v.resourceId)),introChoice,slotCount));
  };
  const clearExclusions=()=>{
    setExcludedIds([]);
    setSlots(buildSlots(folderVideos,introChoice,slotCount));
  };
  const [slotTiming,setSlotTiming]=React.useState({});
  React.useEffect(()=>{
    if(!plan)return;
    const bySlot={};
    for(const row of plan.placements){
      if(row.slot<2)continue;
      const prior=bySlot[row.slot],length=Math.min(1.5,row.endSeconds-row.startSeconds);
      if(!prior)bySlot[row.slot]={firstStart:row.startSeconds,maxDuration:length,uses:1};
      else{prior.maxDuration=Math.max(prior.maxDuration,length);prior.uses++;}
    }
    setSlotTiming(bySlot);
  },[plan]);

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
    if (!projectId || !slotCount || slots.length !== slotCount || busy || loadedKey!==projectId) return;
    setBusy(true);setError("");setMessage(t.progress);
    try {
      await saveSelection();
      if (!introVideo || !selectedVideos.length) throw new Error(t.noVideo);
      const byId = Object.fromEntries(videos.map((v) => [v.resourceId,v]));
      const intro = {...slots[0],frameSize:byId[slots[0].resourceId]?.frameSize};
      if ((byId[intro.resourceId]?.durationSeconds || 0)-intro.startSeconds < introNeed) throw new Error(t.invalid);
      const {name,mainCount} = await buildRecap(sdk,{projectId,slots,byId,intro,mode,onProgress:(count,limit)=>{if(faceScope.current)setMessage(t.progress + " " + count + "/" + limit)},isCurrent:()=>faceScope.current});
      setMessage("Draft created: " + name + " (" + mainCount + " video clips)");
    } catch (e) {
      setError(hostMessage(e,t));
    } finally {setBusy(false);}
  }

  if (!projectId) return <ui.Message tone="error">{t.noProject}</ui.Message>;
  return <div>
    <ui.Section title="2026 Recap">
      <ui.Stack>
        <p>{t.audio}</p>
        <p>{t.choose}</p>
        <small>{t.focusHint || WORDS.en.focusHint}</small>
      </ui.Stack>
    </ui.Section>
    <FinishedExample sdk={sdk} t={t} ui={ui}/>
    {videos.length>0 && <ui.Section title={t.ready}>
      <ui.Stack>
        <ui.Select label={t.intro} value={introChoice?.resourceId||null} onChange={(resourceId)=>changeIntro({resourceId,startSeconds:0})} options={videos.filter((x)=>x.durationSeconds>=introNeed).map((x)=>({value:x.resourceId,label:x.name}))} disabled={busy || loadedKey!==projectId}/>
        {introVideo&&<SourceWindowPicker sdk={sdk} ui={ui} video={introVideo} startSeconds={introChoice?.startSeconds||0} windowSeconds={introSeconds} sourceMargin={0.3} onChange={(startSeconds)=>changeIntro({startSeconds})} disabled={busy || loadedKey!==projectId} label={t.preview} hint={t.previewHint} loading={t.loading} compact/>}
      </ui.Stack>
    </ui.Section>}
    <ui.Section title={t.folderPick}>
      <ui.Stack>
        <small>{t.folderGuide}</small>
        {folders.map((item)=><label key={item.name} style={{display:"flex",alignItems:"center",gap:8}}>
          <input type="checkbox" checked={selectedFolders.includes(item.name)} disabled={busy || loadedKey!==projectId} onChange={()=>toggleFolder(item.name)}/>
          <span>{item.name} ({item.count})</span>
        </label>)}
        <small>{t.footageCount}: {selectedVideos.length} · {t.quickRule}</small>
        {selectedVideos.length===0&&loadedKey===projectId&&<ui.Message tone="muted">{t.noneIncluded}</ui.Message>}
        <details><summary>{t.rules}</summary><p>{t.poolRule}</p><p>{t.shortNotice}</p></details>
      </ui.Stack>
    </ui.Section>
    {folderVideos.length>0 && <details onToggle={(event)=>setExcludeOpen(event.currentTarget.open)}>
      <summary>{t.gallery} {excludedIds.filter((id)=>folderVideos.some((v)=>v.resourceId===id)).length>0?"("+excludedIds.filter((id)=>folderVideos.some((v)=>v.resourceId===id)).length+")":""}</summary>
      <ui.Section title={t.gallery}>
      <small>{t.galleryHint}</small>
      <small>{t.rebuildHint}</small>
      {excludedIds.length>0&&<ui.Actions><ui.Button variant="secondary" disabled={busy || loadedKey!==projectId} onClick={clearExclusions}>{t.selectAll}</ui.Button></ui.Actions>}
      <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:8}}>
        {folderVideos.slice(galleryPage*gallerySize,(galleryPage+1)*gallerySize).map((video) => {
          const at=Math.min(video.durationSeconds*0.35,video.durationSeconds-0.1);
          const url=thumbnails[thumbnailKey(video,at)];
          const active=excludedIds.includes(video.resourceId);
          return <label key={video.resourceId} style={{display:"flex",alignItems:"center",gap:8,padding:4,border:active?"2px solid var(--panel-accent)":"1px solid var(--panel-border)",borderRadius:6,minWidth:0}}>
              <input type="checkbox" checked={excludedIds.includes(video.resourceId)} disabled={busy || loadedKey!==projectId} onChange={()=>toggleExclusion(video.resourceId)}/>
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
      {advancedOpen&&slotCount>0&&slots.length===slotCount&&<ui.Section title={t.advanced}>
        <ui.Stack>
          <small>{t.advancedHint}</small>
          <ui.NumberField label={t.slot} value={editSlot-1} onChange={(v)=>setEditSlot(Math.max(2,Math.min(slotCount,Math.round(v)+1)))} min={1} max={slotCount-1} step={1} disabled={busy || loadedKey!==projectId}/>
          {slotTiming[editSlot]&&<small>{t.outputAt}: {slotTiming[editSlot].firstStart.toFixed(2)}s · {slotTiming[editSlot].maxDuration.toFixed(2)}s</small>}
          {slotTiming[editSlot]?.uses>1&&<small>{t.repeatsLater}</small>}
          <ui.Select label={t.video} value={current?.resourceId||null} onChange={(resourceId)=>changeSlot({resourceId,startSeconds:0})} options={selectedVideos.map((x)=>({value:x.resourceId,label:x.name}))} disabled={busy || loadedKey!==projectId}/>
          {currentVideo&&slotTiming[editSlot]&&<SourceWindowPicker sdk={sdk} ui={ui} video={currentVideo} startSeconds={current?.startSeconds||0} windowSeconds={slotTiming[editSlot].maxDuration} sourceMargin={0.15} onChange={(startSeconds)=>changeSlot({startSeconds})} disabled={busy || loadedKey!==projectId} label={t.sourceWindow} hint={t.advancedSourceHint} loading={t.loading}/>}
        </ui.Stack>
      </ui.Section>}
    </details>
    <ui.Section title="Draft">
      <ui.Actions>
        <ui.Button variant="secondary" busy={busy} busyLabel={t.progress} disabled={!slotCount || slots.length !== slotCount || loadedKey!==projectId} onClick={() => make("sample")}>{t.sample}</ui.Button>
        <ui.Button variant="primary" busy={busy} busyLabel={t.progress} disabled={!slotCount || slots.length !== slotCount || loadedKey!==projectId} onClick={() => make("full")}>{t.full}</ui.Button>
      </ui.Actions>
      {message && <ui.Message tone="muted">{message}</ui.Message>}
      {error && <ui.Message tone="error">{error}</ui.Message>}
    </ui.Section>
  </div>;
}

// av-host:start
// Local files and media tools use the public async SDK. Paths remain host-native.
let hostSdk = null;
function hostUseSdk(sdk) { hostSdk = panelLocalClient(sdk); }
function hostError(code, message, member = "") { return Object.assign(new Error(message), { code, member }); }
// A host service when it has every named method, else null.
function hostApi(name, ...methods) {
  const s = name === "FileSystem" ? hostSdk?.files : name === "Runtime" ? hostSdk?.media : null;
  return s && methods.every((m) => typeof s[m] === "function") ? s : null;
}
// A host service that must have `method`; throws a 'host-missing' error when this build lacks it.
function hostNeed(name, method) {
  const s = hostApi(name, method);
  if (!s) throw hostError("host-missing", "Update Selects to use this plugin: missing SDK " + name + "." + method, name + "." + method);
  return s;
}
// The host initializes the environment before mounting the panel.
function hostIsWindows() { return /^win/i.test(String(hostSdk?.environment?.platform || "")); }
// Joins path parts with the host's join (the OS separator), or by hand with the OS separator.
function hostJoin(...parts) {
  const fs = hostApi("FileSystem", "join");
  if (fs) { try { return String(fs.join(...parts)); } catch { /* join by hand */ } }
  const sep = hostIsWindows() ? "\\" : "/";
  return parts.filter((x) => x !== "").map((x, i) => (i === 0 ? x.replace(/[\\/]+$/, "") : x.replace(/^[\\/]+|[\\/]+$/g, ""))).join(sep);
}
// A Buffer, ArrayBuffer or typed array as bytes (a Buffer may be a view into a larger pool). The value comes from the
// host window (window.parent), another JavaScript realm, so `instanceof ArrayBuffer` is false for it: the checks use
// the internal [[Class]] tag and array-likeness instead.
function hostBytes(v) {
  const tag = (x) => Object.prototype.toString.call(x);
  if (tag(v) === "[object ArrayBuffer]") return new Uint8Array(v);
  if (v && typeof v.byteLength === "number" && v.buffer && tag(v.buffer) === "[object ArrayBuffer]") {
    return new Uint8Array(v.buffer, v.byteOffset || 0, v.byteLength);
  }
  if (v && typeof v === "object" && typeof v.length === "number") return Uint8Array.from(v);
  throw hostError("read-failed", "the file could not be read");
}
// A file's bytes (FileSystem.readFile without an encoding).
async function hostReadBytes(path) {
  const v = await hostNeed("FileSystem", "readFile").readFile(path);
  if (typeof v === "string") throw hostError("read-failed", "the file came back as text");
  return hostBytes(v);
}
// A text file (some host builds return text directly, others bytes).
async function hostReadText(path) {
  const v = await hostNeed("FileSystem", "readFile").readFile(path);
  return typeof v === "string" ? v : new TextDecoder().decode(hostBytes(v));
}
// Cleanup is best effort; all disk operations cross the async SDK bridge.
async function hostRemove(path) {
  try { await hostNeed("FileSystem", "removeFile").removeFile({ filePath: path }); } catch { /* leftover temporary file */ }
}
async function hostRoots(sdk, id, marker) {
  hostUseSdk(sdk);
  const fs = hostNeed("FileSystem", "exists");
  const plugin = fs.join(fs.homedir(), ".selects", "skills", id);
  if (!await fs.exists(fs.join(plugin, marker))) throw hostError("not-found", "the plugin folder could not be found");
  let data = fs.join(fs.homedir(), ".selects", "plugin-data", id);
  try { await fs.mkdir(data, { recursive: true }); } catch { data = null; }
  return { plugin, data };
}
// Mono 32-bit float samples of an audio file at `rate`, at most `maxSeconds`, decoded by the host's ffmpeg into a
// temporary file in `dataDir` and read back (the file is removed). null when this host has no ffmpeg or no data folder;
// throws when ffmpeg fails or `signal` (optional) aborts it.
async function hostDecodePcm(path, dataDir, rate, maxSeconds, signal, timeoutMs = 120000) {
  const rt = hostApi("Runtime", "runFFmpeg");
  if (!rt || !dataDir || !hostApi("FileSystem", "readFile")) return null;
  const tmp = hostJoin(dataDir, "pcm-" + Date.now() + "-" + Math.floor(Math.random() * 1e6) + ".f32");
  const controller = typeof AbortController === "undefined" ? null : new AbortController();
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  const relay = () => { if (controller) controller.abort(); };
  if (signal) { if (signal.aborted) relay(); else signal.addEventListener("abort", relay); }
  try {
    await rt.runFFmpeg(["-nostdin", "-v", "error", "-y", "-t", String(maxSeconds), "-i", path, "-ac", "1", "-ar", String(rate), "-f", "f32le", tmp], true, controller ? controller.signal : undefined);
    const bytes = await hostReadBytes(tmp);
    // A copy, so the samples sit on a 4-byte boundary.
    const samples = new Float32Array(bytes.slice(0, Math.floor(bytes.byteLength / 4) * 4).buffer);
    if (!samples.length) throw hostError("decode-failed", "ffmpeg returned no audio");
    return samples;
  } finally {
    if (timer) clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", relay);
    await hostRemove(tmp);
  }
}
// An audio or video file's length in seconds from the host's ffprobe, or null.
async function hostProbeSeconds(path) {
  try {
    const rt = hostApi("Runtime", "runFFprobe");
    if (!rt) return null;
    const r = await rt.runFFprobe(["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path], true);
    const v = parseFloat(String(r?.stdout || "").trim());
    return v > 0 ? v : null;
  } catch { return null; }
}
// av-host:end

// Only read-only media queries use this: keep every row without exceeding run_script's response limit.
async function readMediaPages(sdk, args) {
  let result, total;
  for (let offset = 0; ; offset += 32) {
    const script = `const value=await(async()=>{${args.script}\n})();const array=Array.isArray(value);const data=array?{rows:value}:value;const page={};let total=0;for(const key of Object.keys(data)){const rows=data[key];page[key]=Array.isArray(rows)?rows.slice(${offset},${offset + 32}):rows;if(Array.isArray(rows))total=Math.max(total,rows.length);}return {array,page,total};`;
    const reply = await sdk.runScript({ ...args, script, allowCommit: false });
    if (reply.isError || !reply.result?.page) throw new Error(reply.output || 'Could not read the Project media.');
    const batch = reply.result;
    if (total !== undefined && total !== batch.total) throw new Error('Project media changed while loading. Try again.');
    total = batch.total;
    if (offset === 0) result = batch.page;
    else for (const key of Object.keys(batch.page)) if (Array.isArray(batch.page[key])) result[key].push(...batch.page[key]);
    if (offset + 32 >= total) return { ...reply, result: batch.array ? result.rows : result };
  }
}

// local-sdk:start
/** Pure host-platform path operations; no filesystem or renderer globals. */
function panelLocalPaths(platform: string) {
  const windows = platform === "win32";
  const slash = (path: string) => {
    if (typeof path !== "string")
      throw new TypeError("A path must be a string.");
    return windows ? path.replace(/\\/g, "/") : path;
  };
  const rootOf = (path: string) => {
    if (windows) {
      const unc = path.match(/^\/\/[^/]+\/[^/]+\/?/);
      if (unc) return unc[0].replace(/\/?$/, "/");
      const drive = path.match(/^[a-z]:\/?/i);
      if (drive) return drive[0];
    }
    return path.startsWith("/") ? "/" : "";
  };
  const native = (value: string) =>
    windows ? value.replace(/\//g, "\\") : value;
  const normalize = (value: string) => {
    const path = slash(value),
      root = rootOf(path),
      absolute = root.endsWith("/");
    const segments: string[] = [];
    for (const segment of path
      .slice(Math.min(root.length, path.length))
      .split("/")) {
      if (!segment || segment === ".") continue;
      if (segment === ".." && segments.length && segments.at(-1) !== "..")
        segments.pop();
      else if (segment !== ".." || !absolute) segments.push(segment);
    }
    let result = root + segments.join("/");
    if (!result || (windows && /^[a-z]:$/i.test(result))) result += ".";
    if (path.endsWith("/") && !result.endsWith("/")) result += "/";
    return native(result);
  };
  const basename = (value: string, extension?: string) => {
    const path = slash(value).replace(/\/+$/, "");
    const withoutDrive = windows ? path.replace(/^[a-z]:/i, "") : path;
    const name = withoutDrive.slice(withoutDrive.lastIndexOf("/") + 1);
    return extension && name.endsWith(extension)
      ? name.slice(0, -extension.length)
      : name;
  };
  return {
    normalize,
    join: (...paths: string[]) => {
      const parts = paths.map(slash).filter(Boolean);
      let joined = parts.join("/");
      if (windows && !/^\/\/[^/]/.test(parts[0] || ""))
        joined = joined.replace(/^\/{2,}/, "/");
      return normalize(joined);
    },
    dirname(value: string) {
      const path = slash(value),
        root = rootOf(path);
      const end = path.replace(/\/+$/, "").lastIndexOf("/");
      if (end < root.length) return value.slice(0, root.length) || ".";
      return value.slice(0, end);
    },
    basename,
    extname(value: string) {
      const name = basename(value),
        dot = name.lastIndexOf(".");
      return dot <= 0 || name === ".." ? "" : name.slice(dot);
    },
    isAbsolute: (value: string) => rootOf(slash(value)).endsWith("/"),
  };
}


/** Plugin-private composition of canonical SDK methods, not a public SDK surface. */
async function createPanelLocalClient(sdk: any) {
  const run = async (method: string, args: unknown[], write = false) => {
    // method names below are fixed implementation constants; values always use JSON encoding.
    // Direct arguments keep object literals contextually typed by the SDK signature.
    const response = await sdk.runScript({
      summary: "Use local media workspace",
      allowCommit: write,
      script: "return await selects." + method + "(" + JSON.stringify(args).slice(1, -1) + ");",
    });
    if (response.isError) throw new Error(response.output || "Local SDK operation failed.");
    // A clipped report has no result. Every read returning data rejects that case below.
    return response.result;
  };
  const environment = await run("files.environment", []);
  if (!environment || typeof environment.platform !== "string" || !environment.homedir)
    throw new Error("Update Selects to use this plugin's local media workspace.");
  const paths = panelLocalPaths(environment.platform);
  const CHUNK_BYTES = 48 * 1024;
  const readRange = async (path: string, offset: number, length: number) => {
    const parts: Uint8Array[] = [];
    let total = 0;
    while (total < length) {
      const result = await run("files.readRange", [{ path, offset: offset + total, length: Math.min(CHUNK_BYTES, length - total) }]);
      if (!result || typeof result.base64 !== "string" || !Number.isInteger(result.bytesRead)) throw new Error("The file read returned an incomplete result.");
      const bytes = Uint8Array.from(atob(result.base64), (character) => character.charCodeAt(0));
      if (bytes.length !== result.bytesRead) throw new Error("The file read returned invalid bytes.");
      parts.push(bytes); total += bytes.length;
      if (bytes.length < Math.min(CHUNK_BYTES, length - (total - bytes.length))) break;
    }
    const output = new Uint8Array(total);
    let position = 0;
    for (const bytes of parts) { output.set(bytes, position); position += bytes.length; }
    return output;
  };
  const files = {
    ...paths,
    homedir: () => environment.homedir,
    getOrCreateTmpDirPath: async () => environment.tempDirectory,
    exists: (path: string) => run("files.exists", [path]),
    stat: (path: string) => run("files.stat", [path]),
    readdir: (path: string) => run("files.readdir", [path]),
    readRange,
    async readFile(path: string, encoding?: string) {
      const stat = await run("files.stat", [path]);
      if (!stat || !Number.isSafeInteger(stat.size) || stat.size < 0) throw new Error("The file is unavailable.");
      const bytes = await readRange(path, 0, stat.size);
      if (bytes.length !== stat.size) throw new Error("The file changed while it was being read.");
      if (encoding !== undefined && encoding !== "utf8") throw new Error("Only utf8 text encoding is supported.");
      return encoding === "utf8" ? new TextDecoder().decode(bytes) : bytes;
    },
    async writeFile(path: string, data: string | Uint8Array, options?: string | { encoding?: string; flag?: "w" | "a" | "wx" }) {
      const encoding = typeof options === "string" ? options : options?.encoding;
      const flag = typeof options === "object" ? options.flag : undefined;
      if (flag !== undefined && !["w", "a", "wx"].includes(flag)) throw new Error("Unsupported file write flag.");
      if (encoding !== undefined && encoding !== "utf8") throw new Error("Only utf8 text encoding is supported.");
      const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
      if ((flag === "a" || flag === "wx") && bytes.length > CHUNK_BYTES) throw new Error("Atomic append and exclusive creation are limited to 48 KiB.");
      // Each complete replacement has its own sibling file. Other panels cannot
      // overwrite one of its chunks before the final atomic rename publishes it.
      const replacement = flag !== "a" && flag !== "wx";
      const destination = replacement ? path + ".tmp-" + crypto.randomUUID() : path;
      let published = false;
      try {
        for (let offset = 0; offset < bytes.length || offset === 0; offset += CHUNK_BYTES) {
          const chunk = bytes.subarray(offset, offset + CHUNK_BYTES);
          let binary = "";
          for (const byte of chunk) binary += String.fromCharCode(byte);
          const mode = offset === 0 ? (flag === "a" ? "append" : "exclusive") : undefined;
          const result = await run("files.writeChunk", [{ path: destination, offset, base64: btoa(binary), ...(mode ? { mode } : {}) }], true);
          if (result?.bytesWritten !== chunk.length) throw new Error("The file write returned an incomplete result. Check the file before retrying.");
        }
        if (replacement) await run("files.rename", [destination, path], true);
        published = true;
      } finally {
        if (replacement && !published) await run("files.remove", [destination, { force: true }], true).catch(() => {});
      }
    },
    async compareAndReplace(path: string, expectedText: string | null, text: string) {
      const encode = (value: string) => {
        const bytes = new TextEncoder().encode(value);
        if (bytes.length > CHUNK_BYTES) throw new Error("Atomic file values are limited to 48 KiB.");
        let binary = "";
        for (const byte of bytes) binary += String.fromCharCode(byte);
        return btoa(binary);
      };
      const result = await run("files.compareAndReplace", [{path, expectedBase64: expectedText === null ? null : encode(expectedText), base64: encode(text)}], true);
      if (typeof result?.replaced !== "boolean") throw new Error("The atomic file update returned an incomplete result. Read the file before retrying.");
      return result.replaced;
    },
    mkdir: (path: string, options?: { recursive?: boolean }) => run("files.mkdir", [path, options ?? {}], true),
    rm: (path: string, options?: { recursive?: boolean; force?: boolean }) => run("files.remove", [path, options ?? {}], true),
    removeFile: ({ filePath }: { filePath: string }) => run("files.remove", [filePath, { force: true }], true),
    rename: (from: string, to: string) => run("files.rename", [from, to], true),
    copyFile: (from: string, to: string) => run("files.copy", [from, to], true),
    downloadFile: (url: string, path: string) => run("files.download", [url, path], true),
    pathToLocalURL: (path: string) => run("files.localUrl", [path]),
    localURLToPath: (url: string) => run("files.pathFromLocalUrl", [url]),
  };
  const activeJobs = new Set<string>();
  let disposed = false;
  const cancel = async (jobId: string) => {
    const response = await sdk.runScript({ summary: "Cancel local media processing", allowCommit: true, script: "await selects.media.job(" + JSON.stringify(jobId) + ").cancel();" });
    if (response.isError) throw new Error(response.output || "Media cancellation failed.");
  };
  const process = async (executable: "FFmpeg" | "FFprobe", args: string[], _withoutLog?: boolean, signal?: AbortSignal, onStdout?: (text: string) => void, onStderr?: (text: string) => void) => {
    if (disposed || signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const started = await run("media.start" + executable, [{ args }], true);
    if (!started?.jobId) throw new Error("The media process did not return a job id.");
    const jobId = started.jobId;
    activeJobs.add(jobId);
    let cancellation: Promise<void> | null = null;
    const abort = () => { cancellation ??= cancel(jobId); void cancellation.catch(() => {}); };
    signal?.addEventListener("abort", abort, { once: true });
    if (disposed || signal?.aborted) abort();
    let cursor = 0, stdout = "", stderr = "";
    try {
      while (true) {
        if (cancellation) await cancellation;
        const status = await sdk.call("getLocalMediaJobStatus", jobId, { cursor });
        if (!status || !Array.isArray(status.events)) throw new Error("Media status is unavailable.");
        if (status.truncated) throw new Error("Media output was truncated; no incomplete result was accepted.");
        for (const event of status.events) {
          if (event.stream === "stdout") { stdout += event.text; onStdout?.(event.text); }
          else { stderr += event.text; onStderr?.(event.text); }
        }
        cursor = status.nextCursor;
        if (status.state !== "running" && status.events.length === 0) {
          if (status.state === "cancelled" || signal?.aborted) throw new DOMException("Aborted", "AbortError");
          if (status.state === "failed") throw new Error(status.error || stderr || "Media processing failed.");
          return { stdout, stderr };
        }
        if (status.state === "running") await new Promise((resolve) => setTimeout(resolve, 150));
      }
    } catch (error) {
      await cancel(jobId).catch(() => {});
      throw error;
    } finally {
      signal?.removeEventListener("abort", abort);
      activeJobs.delete(jobId);
    }
  };
  return {
    files,
    environment,
    media: {
      runFFmpeg: (args: string[], quiet?: boolean, signal?: AbortSignal, stdout?: (text: string) => void, stderr?: (text: string) => void) => process("FFmpeg", args, quiet, signal, stdout, stderr),
      runFFprobe: (args: string[], quiet?: boolean, signal?: AbortSignal) => process("FFprobe", args, quiet, signal),
    },
    dialogs: {
      pickFilePath: (filters?: Array<{ name: string; extensions: string[] }>) => run("editor.pickFile", [{ filters }]),
      pickDirectoryPath: () => run("editor.pickDirectory", []),
      pickSavePath: (defaultPath: string) => run("editor.pickSavePath", [{ defaultPath }]),
    },
    dispose() { disposed = true; for (const jobId of activeJobs) void cancel(jobId).catch(() => {}); },
  };
}

const panelLocalClients = new WeakMap<object, any>();
function panelLocalClient(sdk: any): any {
  const client = panelLocalClients.get(sdk);
  if (!client) throw new Error("Local SDK has not initialized.");
  return client;
}
function withPanelLocalClient(Component: any) {
  return function LocalSdkPanel(props: any) {
    const [state, setState] = React.useState<any>(null);
    React.useEffect(() => {
      let active = true;
      let client: any;
      createPanelLocalClient(props.sdk).then(value => {
        client = {...props.sdk, ...value};
        if (!active) { value.dispose(); return; }
        panelLocalClients.set(props.sdk, client);
        setState({sdk: props.sdk});
      }).catch(error => { if (active) setState({error: String(error?.message || error)}); });
      return () => {
        active = false;
        if (client) {
          if (panelLocalClients.get(props.sdk) === client) panelLocalClients.delete(props.sdk);
          client.dispose();
        }
      };
    }, [props.sdk]);
    if (state?.error) return React.createElement("div", {role: "alert"}, state.error);
    if (state?.sdk !== props.sdk) return React.createElement("div", {role: "status"}, "Connecting to Selects…");
    return React.createElement(Component, props);
  };
}

export default withPanelLocalClient(withStoredPanel(Panel, async () => ({})));
// local-sdk:end

// app-update-guard:start
// Shared source, inlined into portable panels by tools/sync_app_update_guards.py.
import * as AppUpdateGuardReact from 'react';

const appUpdateGuardScopes = new WeakMap<object, any>();

/** Each mounted editor contributes a live veto; the host receives one guard per SDK. */
function useAppUpdateGuard(sdk: any, language: string | undefined, readBlocked: (context: any) => boolean) {
  const live = AppUpdateGuardReact.useRef({ language, readBlocked });
  live.current = { language, readBlocked };
  AppUpdateGuardReact.useEffect(() => {
    const api = sdk?.updates;
    if (typeof api?.registerGuard !== 'function') return;
    let group = appUpdateGuardScopes.get(api);
    if (!group) {
      group = { entries: new Set(), dispose: null };
      appUpdateGuardScopes.set(api, group);
    }
    group.entries.add(live);
    if (!group.dispose) {
      group.dispose = api.registerGuard({
        async canUpdate(context: any) {
          for (const entry of group.entries) {
            // A partially initialized editor must not lose state during reload.
            let blocked = true;
            try { blocked = Boolean(entry.current.readBlocked(context)); } catch { /* fail closed */ }
            if (blocked) {
              const korean = String(entry.current.language || '').toLowerCase().startsWith('ko');
              throw new Error(korean
                ? '\uc9c4\ud589 \uc911\uc778 \uc791\uc5c5\uc744 \ub9c8\uce58\uace0 \ubcc0\uacbd\uc0ac\ud56d\uc744 \uc800\uc7a5\ud55c \ub4a4 \uc571\uc744 \uc5c5\ub370\uc774\ud2b8\ud574\uc8fc\uc138\uc694.'
                : 'Finish the current operation and save changes before updating this app.');
            }
          }
        },
      });
    }
    return () => {
      group.entries.delete(live);
      if (!group.entries.size) {
        group.dispose?.();
        appUpdateGuardScopes.delete(api);
      }
    };
  }, [sdk?.updates]);
}
// app-update-guard:end
