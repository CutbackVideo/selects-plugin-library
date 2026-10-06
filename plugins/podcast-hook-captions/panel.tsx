// @name Podcast Hook Captions
// @name:de Podcast-Hook-Untertitel
// @name:en Podcast Hook Captions
// @name:es Subtítulos gancho para pódcast
// @name:fr Sous-titres accroche podcast
// @name:it Sottotitoli hook per podcast
// @name:ja ポッドキャスト・フック字幕
// @name:ko Podcast Hook Captions
// @name:pt Legendas de gancho para podcast
// @name:tr Podcast Kanca Altyazıları
// @name:zh 播客钩子字幕
// @icon captions
// One click turns a podcast Draft into a vertical reel: face-tracked reframe, camera moves, the speaker cut out onto a grid set, kinetic titles, word captions, B-roll cards, music and sound effects.

// plugins/podcast-hook-captions/src/pipeline/host.ts
var PANEL_ID = "podcast-hook-captions";
function app() {
  const parent = window.parent;
  if (parent?.__DI__) return parent;
  const opener = parent?.opener || window.opener;
  if (opener?.__DI__) return opener;
  throw new Error("This Selects version does not expose native panel services.");
}
function di() {
  return app().__DI__;
}
function libraryId() {
  const id = app().location.pathname.match(/libraries\/([^/]+)/)?.[1];
  if (!id) throw new Error("Open a Draft in Selects first.");
  return id;
}
function fs() {
  return hostSdk.files;
}
function dataRoot() {
  const f = fs();
  return f.join(f.homedir(), ".selects", "plugin-data", PANEL_ID);
}
function skillRoot() {
  const f = fs();
  return f.join(f.homedir(), ".selects", "skills", PANEL_ID);
}
function hostVersion() {
  try {
    return String(hostSdk?.environment?.version || "");
  } catch {
    return "";
  }
}
function versionBelow(version, minimum) {
  const a = String(version || "0").split(".").map((n) => parseInt(n, 10) || 0);
  const b = minimum.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i += 1) if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) < (b[i] || 0);
  return false;
}
var J = (v) => JSON.stringify(v);
var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function script(sdk, summary, body, allowCommit = false) {
  const r = await sdk.runScript({ summary, script: body, allowCommit });
  if (r.isError) {
    let msg = String(r.output || "The edit script failed.");
    try {
      const o = JSON.parse(msg);
      msg = o.error ? String(o.error) + (o.diagnostics ? " " + JSON.stringify(o.diagnostics).slice(0, 600) : "") : msg;
    } catch {
    }
    throw new Error(summary + ": " + msg.slice(0, 900));
  }
  return r.result;
}
async function ffmpeg(label, args, timeoutMs = 3e5, captureLog = false) {
  const rt = hostSdk.media;
  if (typeof rt?.runFFmpeg !== "function") throw new Error("This Selects version cannot run ffmpeg for plug-ins. Update Selects.");
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  let out = "";
  let err = "";
  try {
    if (!captureLog) {
      const r = await rt.runFFmpeg(["-hide_banner", "-nostdin", ...args], true, ac.signal);
      return { stdout: String(r?.stdout ?? ""), stderr: String(r?.stderr ?? "") };
    }
    await rt.runFFmpeg(["-hide_banner", "-nostdin", ...args], true, ac.signal, (c) => out += c, (c) => err += c);
    return { stdout: out, stderr: err };
  } catch (e) {
    if (ac.signal.aborted) throw new Error(label + " took too long.");
    throw new Error(label + " failed" + toolError(e, err));
  } finally {
    clearTimeout(timer);
  }
}
async function ffprobe(label, args, timeoutMs = 6e4) {
  const rt = hostSdk.media;
  if (typeof rt?.runFFprobe !== "function") throw new Error("This Selects version cannot run ffprobe for plug-ins. Update Selects.");
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await rt.runFFprobe(["-hide_banner", ...args], true, ac.signal);
    return String(r?.stdout ?? "");
  } catch (e) {
    if (ac.signal.aborted) throw new Error(label + " took too long.");
    throw new Error(label + " failed" + toolError(e, ""));
  } finally {
    clearTimeout(timer);
  }
}
function toolError(e, streamed) {
  let text = streamed;
  if (!text) {
    if (e && typeof e === "object" && e.stderr) text = String(e.stderr);
    else {
      const raw = String(e?.message ?? e ?? "");
      try {
        const o = JSON.parse(raw);
        text = String(o.stderr || o.message || raw);
      } catch {
        text = raw;
      }
    }
  }
  text = text.trim();
  return text ? ": " + text.slice(-600) : ".";
}
async function removeFile(path) {
  try {
    if (await fs().exists(path)) await fs().rm(path);
  } catch {
  }
}
async function filesIn(dir, pattern) {
  try {
    return (await fs().readdir(dir)).map(String).filter((n) => pattern.test(n));
  } catch {
    return [];
  }
}
function lastJsonObject(text) {
  const s = String(text || "");
  const end = s.lastIndexOf("}");
  if (end < 0) throw new Error("The assistant did not return JSON.");
  let depth = 0;
  for (let i = end; i >= 0; i -= 1) {
    if (s[i] === "}") depth += 1;
    else if (s[i] === "{") {
      depth -= 1;
      if (depth === 0) return JSON.parse(s.slice(i, end + 1));
    }
  }
  throw new Error("The assistant's JSON could not be read.");
}
var hostSdk;
function hostUseSdk(sdk) {
  hostSdk = sdk;
  if (!sdk?.files || !sdk?.media || !sdk?.environment) throw new Error("Update Selects to use this plugin.");
}
function media() {
  return hostSdk.media;
}

// plugins/podcast-hook-captions/src/Panel.tsx
import React2, { useEffect, useRef, useState } from "react";

// plugins/podcast-hook-captions/src/pipeline/select.ts
var norm = (s) => String(s || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
var toks = (s) => String(s || "").split(/\s+/).map(norm).filter(Boolean);
function sentences(words, fps) {
  const out = [];
  let from = 0;
  for (let k = 0; k < words.length; k += 1) {
    const w = words[k];
    const next = words[k + 1];
    if (/[.!?]["”']?$/.test(w.t) || !next || next.s - w.e > Math.round(0.8 * fps) || k - from >= 30) {
      out.push({ from, to: k });
      from = k + 1;
    }
  }
  return out;
}
var STYLE = `The reel follows one fixed podcast-clip edit. Its titles, in order:
- "opener": an editorial question to the viewer that is NOT spoken, shown for the first 4 s, in the second person and ending with "?": 2-4 small lead words + ONE big key word of 8-13 letters. Example ["WHY DO YOU", "PROCRASTINATE?"]. The final title answers it.
- "stackA" (starts at least 5 s in, about 20-30% into the reel): 4 consecutive spoken words = 2 lead words + 2 key words. Example ["heightening your", "self awareness"].
- "stackB": the spoken words right after stack A (gap under 1 s): 1-2 lead lines of 1-4 words, then ONE key word. Example ["on the things that's", "causing the", "discomfort"].
- "punch" (about 40-55% in, at least 1.5 s after stack B): 1-3 lead words + 1-2 key words, the most surprising claim. Example ["we have", "no idea"].
- "broll": 8-18 consecutive spoken words right after the punch that describe something concrete and filmable, plus two stock-footage search queries of 2-4 plain words each ("search": first for a vertical clip, second for a horizontal one, e.g. ["woman sweeping floor", "hand writing notebook"]) and two literal shot descriptions (no text, logos or famous people), one vertical ("portrait") and one horizontal ("landscape").
- "final": the concluding spoken line in the last 20%, followed by 1-2 more seconds of speech before the segment ends (a short closing phrase, as the reference does): 1-2 lead lines of 1-4 words, then ONE key word that is the last and strongest word (never "can't", "it", "that", "is").
Every spoken title is an exact, consecutive quote from the transcript (same words, same order); its lines together form one quote. Key words are what a viewer should remember: nouns, strong adjectives or verbs of 4+ letters. Never a pronoun, filler or vague word (it, that, this, thing, work, word, can't, is, just, really, stuff), and never a word already in the same title's lead lines.`;
var SHAPE = `{
  "start": "the exact first 6-10 words of the segment",
  "end": "the exact last 6-10 words of the segment",
  "opener": ["LEAD WORDS", "KEY?"],
  "stackA": ["lead words", "key words"],
  "stackB": ["lead line", "second lead line", "key"],
  "punch": ["lead words", "key words"],
  "broll": {"quote": "the exact spoken words it covers", "search": ["vertical query", "horizontal query"], "portrait": "vertical shot description", "landscape": "horizontal shot description"},
  "final": ["lead line", "second lead line", "key"],
  "why": "one sentence"
}`;
async function chooseAll(sdk, words, fps, target, hint) {
  const total = words.length ? words[words.length - 1].e / fps : 0;
  const whole = total <= target + 12;
  const lines = sentences(words, fps).map((s) => "[" + (words[s.from].s / fps).toFixed(1) + "s] " + words.slice(s.from, s.to + 1).map((w) => w.t).join(" "));
  const prompt = "Pure text task: do NOT use any tools or read the project; everything you need is below. Think briefly and reply with ONLY one JSON object.\n\nYou are cutting a vertical short-form reel from a podcast transcript. " + (whole ? "The whole transcript (" + total.toFixed(1) + " s) is used: set start/end to its first and last words.\n" : "Choose ONE continuous segment of " + (target - 1) + "-" + (target + 2) + " seconds (use the line times) that opens with a strong claim or question, is self-contained, and ends on a punchline. Start and end on sentence boundaries.\n") + (hint ? "The editor's note: " + hint + "\n" : "") + "\n" + STYLE + "\n\nJSON:\n" + SHAPE + "\n\nTranscript (each line starts with its time):\n" + lines.join("\n");
  let best = null;
  let lastErr = null;
  for (let round = 0; round < 2; round += 1) {
    const ask = !best ? prompt : prompt + "\n\nYour previous answer:\n" + best.text + "\n\nIt breaks these rules:\n- " + best.issues.join("\n- ") + "\nReply with the corrected, complete JSON object.";
    let text;
    try {
      text = (await askWithRetry(sdk, ask)).text;
    } catch (e) {
      lastErr = e;
      if (best) break;
      continue;
    }
    try {
      const o = lastJsonObject(text);
      const choice = resolve(o, words, whole, fps);
      const issues = checkChoice(o, choice, words, fps, whole ? 0 : target);
      if (!best || !best.choice || issues.length < best.issues.length) best = { choice, issues, text };
    } catch (e) {
      lastErr = e;
      if (!best) best = { choice: null, issues: [String(e?.message || e)], text };
    }
    if (best && best.choice && !best.issues.length) break;
  }
  if (!best || !best.choice) throw lastErr || new Error("The assistant did not answer.");
  return { ...best.choice, issues: best.issues };
}
async function askWithRetry(sdk, prompt) {
  let lastErr = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt) await new Promise((res) => setTimeout(res, attempt === 1 ? 4e3 : 12e3));
    try {
      return await sdk.askAI({ prompt, timeoutMs: 3e5 });
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("The assistant did not answer.");
}
var WEAK = new Set(
  "a an and are as at be but can't cannot cant did do does don't for get go going got had has have he her him his how i i'm in is it it's its just kind like lot me my no not of on one or our really she so some something sort stuff that that's the them there these they thing things this those to us very was way we were what when which who why will with word words work you your".split(" ")
);
var low = (t) => String(t || "").toLowerCase().replace(/[’]/g, "'").replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, "");
var weakKey = (ts) => ts.every((t) => WEAK.has(low(t)) || low(t).length < 3 && !/^[A-Z]{2,}$/.test(String(t).replace(/[^\p{L}]/gu, "")));
function checkChoice(o, c, words, fps, target) {
  const out = [...c.missing.map((m) => "quote not found in the transcript: " + m)];
  const p = c.picks;
  const [a, b] = c.spans[0];
  if (target) {
    const d = (words[b].e - words[a].s) / fps;
    if (d < target - 3 || d > target + 6) out.push("the segment is " + d.toFixed(1) + " s; it must be " + (target - 1) + "-" + (target + 2) + " s");
  }
  const op = Array.isArray(o.opener) ? o.opener.map(String) : [];
  const opKey = op.length ? op[op.length - 1] : "";
  const letters = opKey.replace(/[^\p{L}]/gu, "").length;
  if (op.length < 2) out.push("opener is missing");
  else {
    if (letters < 8 || letters > 13) out.push('opener key "' + opKey + '" has ' + letters + " letters; it must be one word of 8-13 letters");
    if (!/\?\s*$/.test(op.join(" "))) out.push("opener must end with a question mark");
    if (!/\byou(r|rs|'re)?\b/i.test(op.join(" "))) out.push('opener must address the viewer ("you")');
  }
  const text = (ids) => ids.map((i) => words[i].t);
  const checkKey = (name, lead, key) => {
    const kt = text(key);
    if (weakKey(kt)) out.push(name + ' key "' + kt.join(" ") + '" is a weak word');
    const leadSet = new Set(lead.flat().map((i) => low(words[i].t)));
    if (kt.some((t) => !WEAK.has(low(t)) && leadSet.has(low(t)))) out.push(name + ' key "' + kt.join(" ") + '" repeats a lead word');
  };
  if (p.stackA) {
    checkKey("stackA", [p.stackA.lead], p.stackA.key);
    if (words[p.stackA.lead[0]].s - words[a].s < 4.3 * fps) out.push("stackA starts before 5 s into the segment");
  } else out.push("stackA is missing");
  if (p.stackB) checkKey("stackB", p.stackB.lines, p.stackB.key);
  if (p.punch) checkKey("punch", [p.punch.lead], p.punch.key);
  if (p.final) checkKey("final", p.final.lines, p.final.key);
  else out.push("final is missing");
  return out;
}
function resolve(o, words, whole, fps) {
  const tk = words.map((w) => norm(w.t));
  const missing = [];
  const find = (seq, from, to) => {
    if (!seq.length) return -1;
    for (let i = Math.max(0, from); i + seq.length - 1 <= Math.min(to, tk.length - 1); i += 1) {
      let ok = true;
      for (let j = 0; j < seq.length; j += 1) if (tk[i + j] !== seq[j]) {
        ok = false;
        break;
      }
      if (ok) return i;
    }
    return -1;
  };
  let a = 0;
  let b = words.length - 1;
  if (!whole) {
    const st = toks(o.start).slice(0, 8);
    const en = toks(o.end).slice(-8);
    const i = find(st, 0, tk.length - 1);
    const j = i >= 0 ? find(en, i, tk.length - 1) : -1;
    if (i < 0 || j < 0) throw new Error("The assistant's segment could not be found in the transcript.");
    a = i;
    b = j + en.length - 1;
  }
  let cursor = a;
  const after = (sec) => {
    const t0 = words[a].s + sec * fps;
    for (let i = a; i <= b; i += 1) if (words[i].s >= t0) return i;
    return b;
  };
  const lines = (name, v, minLines, notBefore = a) => {
    if (!Array.isArray(v) || v.length < minLines) return null;
    const parts = v.map((x) => toks(String(x))).filter((x) => x.length);
    const all = parts.flat();
    let at = find(all, Math.max(cursor, notBefore), b);
    if (at < 0) at = find(all, cursor, b);
    if (at < 0) at = find(all, a, b);
    if (at < 0) {
      missing.push(name + ": " + v.join(" / "));
      return null;
    }
    const out = [];
    let k = at;
    for (const p of parts) {
      out.push(p.map((_x, n) => k + n));
      k += p.length;
    }
    cursor = k;
    return out;
  };
  const picks = {};
  picks.opener = Array.isArray(o.opener) && o.opener.length >= 2 ? { lead: String(o.opener[0]), key: String(o.opener[o.opener.length - 1]) } : null;
  const A = lines("stackA", o.stackA, 2, after(4.3));
  picks.stackA = A ? { lead: A[0], key: A.slice(1).flat() } : null;
  const B = lines("stackB", o.stackB, 2);
  picks.stackB = B ? { lines: B.slice(0, -1), key: B[B.length - 1] } : null;
  const P = lines("punch", o.punch, 2);
  picks.punch = P ? { lead: P.slice(0, -1).flat(), key: P[P.length - 1] } : null;
  if (o.broll && o.broll.quote) {
    const q = toks(o.broll.quote);
    let span = null;
    for (let len = q.length; len >= Math.max(4, Math.ceil(q.length * 0.4)) && !span; len -= 1) {
      for (let off = 0; off + len <= q.length && !span; off += 1) {
        const sub = q.slice(off, off + len);
        let at = find(sub, cursor, b);
        if (at < 0) at = find(sub, a, b);
        if (at >= 0) span = [Math.max(a, at - off), Math.min(b, at - off + q.length - 1)];
      }
    }
    if (span) {
      picks.broll = { from: span[0], to: span[1], search: Array.isArray(o.broll.search) ? o.broll.search.map(String).slice(0, 2) : [], portrait: String(o.broll.portrait || ""), landscape: String(o.broll.landscape || "") };
      cursor = Math.max(cursor, span[1] + 1);
    } else missing.push("broll: " + o.broll.quote);
  }
  const Fn = lines("final", o.final, 2);
  picks.final = Fn ? { lines: Fn.slice(0, -1), key: Fn[Fn.length - 1] } : null;
  return { spans: [[a, b]], picks, why: o.why, missing };
}
function mapPicks(picks, map) {
  const ids = (a) => Array.isArray(a) ? a.map((i) => map.get(Number(i))) : null;
  const ok = (a) => !!a && a.length > 0 && a.every((x) => x != null);
  const out = { opener: picks.opener && typeof picks.opener.key === "string" ? { lead: String(picks.opener.lead || ""), key: String(picks.opener.key) } : null };
  const two = (o) => {
    if (!o) return null;
    const lead = ids(o.lead);
    const key = ids(o.key);
    return ok(lead) && ok(key) ? { lead, key } : null;
  };
  const block = (o) => {
    if (!o) return null;
    const lines = Array.isArray(o.lines) ? o.lines.map(ids).filter((l) => ok(l)) : [];
    const key = ids(o.key);
    return lines.length && ok(key) ? { lines, key } : null;
  };
  out.stackA = two(picks.stackA);
  out.stackB = block(picks.stackB);
  out.punch = two(picks.punch);
  out.final = block(picks.final);
  if (picks.broll) {
    const a = map.get(Number(picks.broll.from));
    const b = map.get(Number(picks.broll.to));
    out.broll = a != null && b != null && b >= a ? { from: a, to: b, search: picks.broll.search || [], portrait: String(picks.broll.portrait || ""), landscape: String(picks.broll.landscape || "") } : null;
  }
  return out;
}

// plugins/podcast-hook-captions/src/pipeline/reel.ts
async function readSource(sdk, sid) {
  return script(
    sdk,
    "Read the podcast Draft",
    `const d = selects.draft(${J(sid)});
const m = await d.meta();
const ws = (await d.words()).filter((w: any) => !w.nonSpeech && !w.cut && w.endFrame > w.startFrame);
return { name: m.name, fps: m.fps, width: m.frameSize.width, height: m.frameSize.height,
  words: ws.map((w: any, i: number) => ({ i, t: w.text, s: w.startFrame, e: w.endFrame, ss: w.sourceStartFrame, sr: w.sourceResourceId })) };`
  );
}
async function createReel(sdk, pid, sid, name, ranges) {
  const r = await script(
    sdk,
    "Create the reel Draft",
    `const p = selects.project(${J(pid)});
const src = selects.draft(${J(sid)});
const taken: string[] = [];
for (const id of ((await p.meta()) as any).draftIds || []) { try { taken.push((await selects.draft(id).meta()).name); } catch {} }
let name = ${J(name)};
for (let k = 2; taken.includes(name); k += 1) name = ${J(name)} + " (" + k + ")";
const d = await p.createDraft({ name });
for (const [s, e] of ${J(ranges)} as [number, number][]) await d.insert({ source: await src.rangeAtFrames(s, e), tracks: "main" });
await d.setFrameSize({ width: 1080, height: 1920 });
const c = await d.commitAll("Podcast Hook Captions: new reel");
return { id: c.createdDraftId, name };`,
    true
  );
  if (!r?.id) throw new Error("The reel Draft was not created.");
  return r.id;
}
async function readReel(sdk, pid, rid) {
  const r = await script(
    sdk,
    "Read the reel Draft",
    `const p = selects.project(${J(pid)});
const d = selects.draft(${J(rid)});
const m = await d.meta();
const words = (await d.words()).filter((w: any) => !w.nonSpeech && !w.cut && w.endFrame > w.startFrame)
  .map((w: any) => ({ t: w.text, s: w.startFrame, e: w.endFrame, ss: w.sourceStartFrame }));
const main = (await d.clips({ trackScope: "main" })).filter((c: any) => c.trackKind === "main" && c.resourceId != null);
const tree: any = await p.sourceFiles();
const files: any[] = [];
const walk = (nodes: any[]) => { for (const n of nodes || []) { if (n.type === "dir") walk(n.children); else files.push(n); } };
walk("fileTree" in tree ? tree.fileTree : []);
const clips = main.map((c: any) => {
  const f = files.find((x: any) => x.resourceId === c.resourceId);
  const offs = words.filter((w: any) => w.s >= c.startFrame && w.e <= c.endFrame && w.ss != null).map((w: any) => w.ss - w.s).sort((a: number, b: number) => a - b);
  const off = offs.length ? offs[Math.floor(offs.length / 2)] : null;
  return { clipId: c.clipId, rid: c.resourceId, s: c.startFrame, e: c.endFrame, path: f ? f.path : null,
    sw: f?.frameSize?.width || 0, sh: f?.frameSize?.height || 0, srcStart: off == null ? -1 : (c.startFrame + off) / m.fps };
});
return { fps: m.fps, endFrame: main.reduce((a: number, c: any) => Math.max(a, c.endFrame), 0), words, clips };`
  );
  return r;
}

// plugins/podcast-hook-captions/src/pipeline/faceFrames.ts
var CHUNK_BYTES = 128 * 1024 * 1024;
var chunkSamples = (plan) => Math.max(30, Math.floor(CHUNK_BYTES / (plan.w * plan.h * 3)));
var CHUNK_TIMEOUT_MS = 10 * 60 * 1e3;
function runtime() {
  const rt = media();
  if (typeof rt?.runFFmpeg !== "function" || typeof rt?.runFFprobe !== "function") throw new Error("This Selects version cannot run ffmpeg for plug-ins. Update Selects.");
  return rt;
}
function toolMessage(e) {
  let text = "";
  if (e && typeof e === "object" && typeof e.stderr === "string") text = e.stderr || e.message || "";
  else {
    const raw = String(e && e.message != null ? e.message : e);
    try {
      const o = JSON.parse(raw);
      text = String(o.stderr || o.message || raw);
    } catch {
      text = raw;
    }
  }
  text = text.trim();
  return text ? text.slice(-600) : "no details";
}
async function withTimeout(run, ms, outer) {
  const ac = new AbortController();
  const stop = () => ac.abort();
  if (outer) {
    if (outer.aborted) throw new Error("Face tracking was cancelled.");
    outer.addEventListener("abort", stop);
  }
  const timer = setTimeout(stop, ms);
  try {
    return await run(ac.signal);
  } catch (e) {
    if (outer && outer.aborted) throw new Error("Face tracking was cancelled.");
    if (ac.signal.aborted) throw new Error("ffmpeg took longer than " + Math.round(ms / 1e3) + " s.");
    throw e;
  } finally {
    clearTimeout(timer);
    if (outer) outer.removeEventListener("abort", stop);
  }
}
var rate = (s) => {
  const m = String(s || "").match(/^(\d+(?:\.\d+)?)(?:\/(\d+(?:\.\d+)?))?$/);
  if (!m) return 0;
  const v = m[2] != null ? Number(m[1]) / Number(m[2]) : Number(m[1]);
  return Number.isFinite(v) && v > 0 ? v : 0;
};
async function probeVideo(path, signal) {
  const args = [
    "-v",
    "error",
    "-hide_banner",
    "-select_streams",
    "V:0",
    "-show_entries",
    "stream=width,height,avg_frame_rate,r_frame_rate,start_time:stream_tags=rotate:stream_side_data=rotation:format=start_time",
    "-of",
    "json",
    path
  ];
  const r = await withTimeout((s2) => runtime().runFFprobe(args, true, s2), 6e4, signal);
  const j = JSON.parse(String(r && r.stdout || "").replace(/[\r\n]/g, ""));
  const s = j && j.streams && j.streams[0];
  if (!s || !(Number(s.width) > 0) || !(Number(s.height) > 0)) throw new Error("no video stream");
  let rot = 0;
  for (const sd of s.side_data_list || []) if (sd && sd.rotation != null) rot = Number(sd.rotation) || 0;
  if (!rot && s.tags && s.tags.rotate != null) rot = Number(s.tags.rotate) || 0;
  const turned = Math.abs(Math.round(rot / 90)) % 2 === 1;
  const W = turned ? Number(s.height) : Number(s.width);
  const H = turned ? Number(s.width) : Number(s.height);
  const fps = rate(s.avg_frame_rate) || rate(s.r_frame_rate) || 30;
  const st = Number(s.start_time), ft = Number(j.format && j.format.start_time);
  const offset = Number.isFinite(st) ? st - (Number.isFinite(ft) ? ft : 0) : 0;
  return { W, H, fps, offset, frameS: 1 / Math.max(fps, rate(s.r_frame_rate)) };
}
function timeStart(info, plan, first = 0) {
  const f = plan.f0 + first * plan.step;
  return { seek: f > 0 ? Math.max(0, info.offset + (f - 0.5) / info.fps) : 0, keyframe: false, skip: 0 };
}
var STATS_FMT = ["-enc_time_base:v", "demux", "-stats_enc_pre_fmt", "{n} {pts} {tb}"];
var seekArgs = (s) => s.seek > 0 ? ["-ss", s.seek.toFixed(6)].concat(s.keyframe ? ["-noaccurate_seek"] : []) : [];
async function cvFrameSeek(path, info, plan, stats, run) {
  if (plan.f0 <= 0) return { seek: 0, keyframe: false, skip: 0 };
  let delta = 16;
  for (let tries = 0; tries < 8; tries += 1) {
    const ft = Math.max(plan.f0 - delta, 0);
    const probe = { seek: Math.max(0, info.offset + ft / info.fps), keyframe: true, skip: 0 };
    await removeQuiet(stats);
    await run([
      "-nostdin",
      "-hide_banner",
      "-v",
      "error",
      "-y",
      ...seekArgs(probe),
      "-i",
      path,
      "-map",
      "0:V:0",
      "-an",
      "-sn",
      "-dn",
      "-fps_mode",
      "passthrough",
      "-frames:v",
      "1",
      "-stats_enc_pre",
      stats,
      ...STATS_FMT,
      "-f",
      "null",
      "-"
    ]);
    let t = null;
    try {
      t = sampleTime(String(await fs().readFile(stats, "utf8")), 0);
    } catch {
    }
    await removeQuiet(stats);
    if (t == null) return null;
    const n = Math.floor(info.fps * (probe.seek + t - info.offset) + 0.5);
    if (n >= 0 && n <= plan.f0 - 1) return { seek: probe.seek, keyframe: true, skip: plan.f0 - n };
    if (ft === 0) return null;
    delta = delta < 16 ? delta * 2 : Math.floor(delta * 3 / 2);
  }
  return null;
}
function frameArgs(path, plan, start, n, out, stats = null) {
  const vf = (start.skip > 0 ? "trim=start_frame=" + start.skip + "," : "") + "framestep=" + plan.step + ",scale=iw:ih:flags=bicubic:in_color_matrix=bt601,format=bgr24,scale=" + plan.w + ":" + plan.h + ":flags=area";
  return [
    "-nostdin",
    "-hide_banner",
    "-v",
    "error",
    "-y",
    ...seekArgs(start),
    "-i",
    path,
    "-map",
    "0:V:0",
    "-an",
    "-sn",
    "-dn",
    "-vf",
    vf,
    "-fps_mode",
    "passthrough",
    ...stats ? ["-stats_enc_pre", stats].concat(STATS_FMT) : [],
    "-frames:v",
    String(stats ? n + 1 : n),
    "-f",
    "rawvideo",
    "-pix_fmt",
    "bgr24",
    out
  ];
}
function sampleTime(statsText, n) {
  for (const line of String(statsText || "").split(/\r?\n/)) {
    const m = line.trim().match(/^(\d+) (-?\d+) (\d+)\/(\d+)$/);
    if (m && Number(m[1]) === n && Number(m[4]) > 0) return Number(m[2]) * Number(m[3]) / Number(m[4]);
  }
  return null;
}
function toBytes(v) {
  if (v instanceof Uint8Array) return v;
  if (Object.prototype.toString.call(v) === "[object ArrayBuffer]") return new Uint8Array(v);
  if (v && ArrayBuffer.isView(v)) return new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
  if (v && v.type === "Buffer" && Array.isArray(v.data)) return Uint8Array.from(v.data);
  return new Uint8Array(0);
}
async function removeQuiet(path) {
  try {
    if (await fs().exists(path)) await fs().rm(path);
  } catch {
  }
}
async function fileSize(path) {
  try {
    const st = await fs().stat(path);
    return st && typeof st.size === "number" ? st.size : null;
  } catch {
    return null;
  }
}
async function* sampleFrames(path, info, plan, workDir, tag, signal) {
  const fb = plan.w * plan.h * 3;
  const per = chunkSamples(plan);
  const chunks = [];
  for (let s = 0, k = 0; s < plan.count; s += per, k += 1) {
    const base = fs().join(workDir, "frames-" + tag + "-" + k);
    chunks.push({ first: s, n: Math.min(per, plan.count - s), file: base + ".bgr", stats: s + per < plan.count ? base + ".txt" : null });
  }
  if (!chunks.length) return;
  await fs().mkdir(workDir, { recursive: true });
  const ac = new AbortController();
  const stop = () => ac.abort();
  if (signal) signal.addEventListener("abort", stop);
  const ffmpeg2 = (args) => withTimeout((s) => runtime().runFFmpeg(args, true, s), CHUNK_TIMEOUT_MS, ac.signal);
  const extract = (c, from) => {
    const p = (async () => {
      await removeQuiet(c.file);
      let start = from;
      if (!start) {
        const probeStats = fs().join(workDir, "frames-" + tag + "-seek.txt");
        start = await cvFrameSeek(path, info, plan, probeStats, ffmpeg2).catch((e) => {
          if (ac.signal.aborted) throw e;
          return null;
        }) || timeStart(info, plan);
      }
      if (c.stats) await removeQuiet(c.stats);
      try {
        await ffmpeg2(frameArgs(path, plan, start, c.n, c.file, c.stats));
      } catch (e) {
        if (ac.signal.aborted || !c.stats) throw e;
        c.stats = null;
        await removeQuiet(c.file);
        await ffmpeg2(frameArgs(path, plan, start, c.n, c.file, null));
      }
      let next = null;
      if (c.stats) {
        try {
          const t = sampleTime(String(await fs().readFile(c.stats, "utf8")), c.n);
          if (t != null) next = { seek: Math.max(0, start.seek + t - info.frameS / 2), keyframe: false, skip: 0 };
        } catch {
        }
        await removeQuiet(c.stats);
      }
      return { c, next };
    })().catch((e) => {
      if (ac.signal.aborted) throw e;
      throw new Error("Reading frames for face tracking failed: " + toolMessage(e));
    });
    p.catch(() => {
    });
    return p;
  };
  let pending = extract(chunks[0], null);
  try {
    for (let k = 0; k < chunks.length; k += 1) {
      const { c, next } = await pending;
      pending = null;
      const size = await fileSize(c.file);
      const full = size == null || size >= c.n * fb;
      if (full && k + 1 < chunks.length) pending = extract(chunks[k + 1], next || timeStart(info, plan, chunks[k + 1].first));
      let got = 0;
      if (await fs().exists(c.file)) {
        for (let i = 0; i < c.n; i += 1) {
          if (signal && signal.aborted) throw new Error("Face tracking was cancelled.");
          const bytes = toBytes(await fs().readRange(c.file, i * fb, fb));
          if (bytes.length < fb) break;
          got += 1;
          yield bytes;
        }
      }
      await removeQuiet(c.file);
      if (got < c.n) break;
    }
  } finally {
    if (pending) {
      ac.abort();
      await pending.catch(() => null);
    }
    if (signal) signal.removeEventListener("abort", stop);
    for (const c of chunks) {
      await removeQuiet(c.file);
      if (c.stats) await removeQuiet(c.stats);
    }
    await removeQuiet(fs().join(workDir, "frames-" + tag + "-seek.txt"));
  }
}

// plugins/podcast-hook-captions/src/pipeline/yunetModel.ts
var ORT_VERSION = "1.30.0";
var ORT_DIST = (host) => host + "/onnxruntime-web@" + ORT_VERSION + "/dist/";
var ORT_JS = {
  name: "ort.wasm.bundle.min.mjs",
  label: "face tracker runtime",
  urls: [ORT_DIST("https://cdn.jsdelivr.net/npm") + "ort.wasm.bundle.min.mjs", ORT_DIST("https://unpkg.com") + "ort.wasm.bundle.min.mjs"],
  sha256: "11e64bd8ffe11bd1a2a2f0d6275fdfbbba7262f0b76b99b53d228a8a22ef3d90",
  bytes: 73054
};
var ORT_WASM = {
  name: "ort-wasm-simd-threaded.wasm",
  label: "face tracker engine",
  urls: [ORT_DIST("https://cdn.jsdelivr.net/npm") + "ort-wasm-simd-threaded.wasm", ORT_DIST("https://unpkg.com") + "ort-wasm-simd-threaded.wasm"],
  sha256: "3398c10d07d229bd91b364548e130e0e51a8e5704b88c7c083ebbeb78842dee2",
  bytes: 14239897
};
var YUNET_MODEL = {
  name: "face_detection_yunet_2023mar.onnx",
  label: "face model",
  urls: [
    "https://media.githubusercontent.com/media/opencv/opencv_zoo/f12e12798e8314f7c074a6656816c048dcc95b7a/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
  ],
  sha256: "8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4",
  bytes: 232589
};
var YUNET_STRIDES = [8, 16, 32];
var YUNET_DIVISOR = 32;
var YUNET_OUTPUTS = ["cls", "obj", "bbox", "kps"];
async function sha256(bytes) {
  const subtle = webCrypto();
  if (subtle) {
    try {
      const d = new Uint8Array(await subtle.digest("SHA-256", bytes));
      return Array.from(d, (x) => x.toString(16).padStart(2, "0")).join("");
    } catch {
    }
  }
  return sha256Hex(bytes);
}
function webCrypto() {
  const g = globalThis;
  if (g.crypto?.subtle) return g.crypto.subtle;
  try {
    if (typeof window !== "undefined" && window.parent?.crypto?.subtle) return window.parent.crypto.subtle;
  } catch {
  }
  return null;
}
var K = Uint32Array.from([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]);
function sha256Hex(bytes) {
  const n = bytes.length;
  const total = Math.ceil((n + 9) / 64) * 64;
  const msg = new Uint8Array(total);
  msg.set(bytes);
  msg[n] = 128;
  const view = new DataView(msg.buffer);
  view.setUint32(total - 8, Math.floor(n / 536870912));
  view.setUint32(total - 4, n * 8 >>> 0);
  const h = Uint32Array.from([1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225]);
  const w = new Uint32Array(64);
  const rotr = (x, r) => x >>> r | x << 32 - r;
  for (let off = 0; off < total; off += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(off + 4 * i);
    for (let i = 16; i < 64; i += 1) {
      const a2 = w[i - 15], b2 = w[i - 2];
      w[i] = w[i - 16] + (rotr(a2, 7) ^ rotr(a2, 18) ^ a2 >>> 3) + w[i - 7] + (rotr(b2, 17) ^ rotr(b2, 19) ^ b2 >>> 10) >>> 0;
    }
    let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
    for (let i = 0; i < 64; i += 1) {
      const t1 = hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + (e & f ^ ~e & g) + K[i] + w[i] >>> 0;
      const t2 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + (a & b ^ a & c ^ b & c) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = d + t1 >>> 0;
      d = c;
      c = b;
      b = a;
      a = t1 + t2 >>> 0;
    }
    h[0] += a;
    h[1] += b;
    h[2] += c;
    h[3] += d;
    h[4] += e;
    h[5] += f;
    h[6] += g;
    h[7] += hh;
  }
  return Array.from(h, (x) => x.toString(16).padStart(8, "0")).join("");
}
function varint(b, p) {
  let v = 0, mul = 1;
  for (let i = 0; i < 10; i += 1) {
    const x = b[p + i];
    if (x === void 0) throw new Error("The face model file is truncated.");
    v += (x & 127) * mul;
    if (x < 128) return [v, p + i + 1];
    mul *= 128;
  }
  throw new Error("The face model file is not a valid ONNX model.");
}
function fields(b, from = 0, to = b.length) {
  const out = [];
  for (let p = from; p < to; ) {
    const start = p;
    const [key, q] = varint(b, p);
    const no = Math.floor(key / 8), wire = key % 8;
    let value = 0, len = 0;
    if (wire === 0) [value, p] = varint(b, q);
    else if (wire === 1) p = q + 8;
    else if (wire === 5) p = q + 4;
    else if (wire === 2) {
      [len, value] = varint(b, q);
      p = value + len;
    } else throw new Error("The face model file has an unsupported protobuf field (wire type " + wire + ").");
    if (p > to) throw new Error("The face model file is truncated.");
    out.push({ no, wire, start, end: p, value, len });
  }
  return out;
}
function encodeVarint(v) {
  const out = [];
  while (v >= 128) {
    out.push(v % 128 | 128);
    v = Math.floor(v / 128);
  }
  out.push(v);
  return out;
}
function concat(parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
var lenField = (no, payload2) => concat([Uint8Array.from(encodeVarint(no * 8 + 2).concat(encodeVarint(payload2.length))), payload2]);
var varintField = (no, v) => Uint8Array.from(encodeVarint(no * 8).concat(encodeVarint(v)));
var textField = (no, s) => lenField(no, new TextEncoder().encode(s));
var payload = (b, f) => b.subarray(f.value, f.value + f.len);
var one = (fs2, no) => fs2.find((f) => f.no === no && f.wire === 2);
function readTensorInfo(b) {
  const vi = fields(b);
  const name = new TextDecoder().decode(payload(b, one(vi, 1)));
  const type = one(vi, 2);
  const tensor = type && one(fields(b, type.value, type.value + type.len), 1);
  if (!tensor) throw new Error("The face model's " + name + " is not a tensor.");
  const tf = fields(b, tensor.value, tensor.value + tensor.len);
  const et = tf.find((f) => f.no === 1 && f.wire === 0);
  const shape = one(tf, 2);
  const dims = shape ? fields(b, shape.value, shape.value + shape.len).filter((f) => f.no === 1 && f.wire === 2).map((d) => {
    const df = fields(b, d.value, d.value + d.len);
    const v = df.find((f) => f.no === 1 && f.wire === 0);
    const p = one(df, 2);
    return v ? v.value : p ? new TextDecoder().decode(payload(b, p)) : "?";
  }) : [];
  return { name, elemType: et ? et.value : 0, dims };
}
function writeTensorInfo(t) {
  const dims = t.dims.map((d) => lenField(1, typeof d === "number" ? varintField(1, d) : textField(2, d)));
  const tensor = concat([varintField(1, t.elemType), lenField(2, concat(dims))]);
  return concat([textField(1, t.name), lenField(2, lenField(1, tensor))]);
}
function withSymbolicInputSize(model2) {
  const top = fields(model2);
  const graph = top.find((f) => f.no === 7 && f.wire === 2);
  if (!graph) throw new Error("The face model file has no graph.");
  const parts = [];
  let inputs = 0, outputs = 0;
  for (const f of fields(model2, graph.value, graph.value + graph.len)) {
    if (f.no === 13) continue;
    if ((f.no === 11 || f.no === 12) && f.wire === 2) {
      const t = readTensorInfo(payload(model2, f));
      if (f.no === 11) {
        if (t.elemType !== 1 || t.dims.length !== 4 || t.dims[0] !== 1 || t.dims[1] !== 3) throw new Error("Unexpected face model input " + t.name + ".");
        t.dims = [1, 3, "H", "W"];
        inputs += 1;
      } else {
        if (t.elemType !== 1 || t.dims.length !== 3 || t.dims[0] !== 1) throw new Error("Unexpected face model output " + t.name + ".");
        t.dims = [1, "N_" + t.name, t.dims[2]];
        outputs += 1;
      }
      parts.push(lenField(f.no, writeTensorInfo(t)));
      continue;
    }
    parts.push(model2.subarray(f.start, f.end));
  }
  if (inputs !== 1 || outputs !== YUNET_STRIDES.length * YUNET_OUTPUTS.length) throw new Error("Unexpected face model: " + inputs + " inputs, " + outputs + " outputs.");
  const newGraph = lenField(7, concat(parts));
  return concat(top.map((f) => f === graph ? newGraph : model2.subarray(f.start, f.end)));
}

// plugins/podcast-hook-captions/src/pipeline/yunetDecode.ts
var YUNET_SCORE_THRESHOLD = 0.8;
var YUNET_NMS_THRESHOLD = 0.3;
var YUNET_TOP_K = 5e3;
function paddedSize(width, height) {
  const up = (x) => Math.floor((x - 1) / YUNET_DIVISOR + 1) * YUNET_DIVISOR;
  return { width: up(width), height: up(height) };
}
function bgrToBlob(bgr, width, height, out) {
  const pad = paddedSize(width, height);
  const plane = pad.width * pad.height;
  if (bgr.length < width * height * 3) throw new Error("A face frame has " + bgr.length + " bytes, not " + width * height * 3 + ".");
  const data = out && out.length === 3 * plane ? out : new Float32Array(3 * plane);
  if (out === data) data.fill(0);
  for (let y = 0; y < height; y += 1) {
    let p = y * width * 3;
    let o = y * pad.width;
    for (let x = 0; x < width; x += 1, p += 3, o += 1) {
      data[o] = bgr[p];
      data[plane + o] = bgr[p + 1];
      data[2 * plane + o] = bgr[p + 2];
    }
  }
  return { data, width: pad.width, height: pad.height };
}
var clamp01 = (v) => Math.min(1, Math.max(0, v));
var f32 = Math.fround;
function decodeYuNet(outputs, padWidth, padHeight, o = {}) {
  const threshold = f32(o.score == null ? YUNET_SCORE_THRESHOLD : o.score);
  const faces = [];
  for (const stride of YUNET_STRIDES) {
    const cols = Math.floor(padWidth / stride), rows = Math.floor(padHeight / stride);
    const cls = outputs["cls_" + stride], obj = outputs["obj_" + stride], bbox = outputs["bbox_" + stride], kps = outputs["kps_" + stride];
    if (!cls || !obj || !bbox || !kps) throw new Error("The face model gave no output for stride " + stride + ".");
    if (cls.length !== rows * cols || bbox.length !== rows * cols * 4 || kps.length !== rows * cols * 10) throw new Error("The face model's stride-" + stride + " output does not fit a " + padWidth + "x" + padHeight + " input.");
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const idx = r * cols + c;
        const score = f32(Math.sqrt(f32(clamp01(cls[idx]) * clamp01(obj[idx]))));
        if (score < threshold) continue;
        const cx = f32((c + bbox[idx * 4]) * stride), cy = f32((r + bbox[idx * 4 + 1]) * stride);
        const w = f32(f32(Math.exp(bbox[idx * 4 + 2])) * stride), h = f32(f32(Math.exp(bbox[idx * 4 + 3])) * stride);
        const landmarks = [];
        for (let n = 0; n < 5; n += 1) landmarks.push([f32((kps[idx * 10 + 2 * n] + c) * stride), f32((kps[idx * 10 + 2 * n + 1] + r) * stride)]);
        faces.push({ box: [f32(cx - w / 2), f32(cy - h / 2), w, h], landmarks, score });
      }
    }
  }
  if (faces.length <= 1) return faces;
  return nmsBoxes(faces, threshold, f32(o.nms == null ? YUNET_NMS_THRESHOLD : o.nms), o.topK == null ? YUNET_TOP_K : o.topK).map((i) => faces[i]);
}
var intRect = (b) => [Math.trunc(b[0]), Math.trunc(b[1]), Math.trunc(b[2]), Math.trunc(b[3])];
function rectOverlap(a, b) {
  const aa = a[2] * a[3], ab = b[2] * b[3];
  if (aa + ab <= 0) return 1;
  const x1 = Math.max(a[0], b[0]), y1 = Math.max(a[1], b[1]);
  const x2 = Math.min(a[0] + a[2], b[0] + b[2]), y2 = Math.min(a[1] + a[3], b[1] + b[3]);
  const inter = x2 > x1 && y2 > y1 ? (x2 - x1) * (y2 - y1) : 0;
  return f32(1 - f32(1 - inter / (aa + ab - inter)));
}
function nmsBoxes(faces, scoreThreshold, nmsThreshold, topK) {
  const order = faces.map((f, i) => ({ s: f.score, i })).filter((p) => p.s > scoreThreshold);
  order.sort((a, b) => b.s - a.s || a.i - b.i);
  if (topK > 0 && order.length > topK) order.length = topK;
  const rects = faces.map((f) => intRect(f.box));
  const kept = [];
  for (const { i } of order) if (kept.every((k) => rectOverlap(rects[i], rects[k]) <= nmsThreshold)) kept.push(i);
  return kept;
}

// plugins/podcast-hook-captions/src/pipeline/faceWorker.ts
var WORKER_SOURCE = `
let ort = null, session = null, input = "input";
self.onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.type === "init") {
      ort = await import(m.ortUrl);
      ort.env.logLevel = "error";
      ort.env.wasm.wasmBinary = m.wasm;
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.proxy = false;
      session = await ort.InferenceSession.create(m.model, { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
      input = session.inputNames[0] || "input";
      self.postMessage({ id: m.id, ok: true, ort: String((ort.env.versions && ort.env.versions.web) || "") });
    } else if (m.type === "run") {
      const out = await session.run({ [input]: new ort.Tensor("float32", m.data, m.dims) });
      const res = {};
      const moved = [m.data.buffer];
      for (const k of Object.keys(out)) {
        const copy = new Float32Array(out[k].data);
        res[k] = copy;
        moved.push(copy.buffer);
      }
      self.postMessage({ id: m.id, ok: true, res, input: m.data }, moved);
    }
  } catch (err) {
    self.postMessage({ id: m.id, ok: false, error: String((err && err.message) || err) });
  }
};
`;
var INIT_TIMEOUT_MS = 6e4;
var RUN_TIMEOUT_MS = 3e4;
async function startWorkerEngine(ortJs, wasm, model2) {
  const g = globalThis;
  if (typeof g.Worker !== "function" || typeof g.Blob !== "function" || !g.URL || typeof g.URL.createObjectURL !== "function") throw new Error("no Worker here");
  const ortUrl = g.URL.createObjectURL(new g.Blob([ortJs], { type: "text/javascript" }));
  const workerUrl = g.URL.createObjectURL(new g.Blob([WORKER_SOURCE], { type: "text/javascript" }));
  let worker;
  try {
    worker = new g.Worker(workerUrl, { type: "module", name: "podcast-hook-captions faces" });
  } catch (e) {
    g.URL.revokeObjectURL(ortUrl);
    g.URL.revokeObjectURL(workerUrl);
    throw e;
  }
  const pending = /* @__PURE__ */ new Map();
  let seq = 0;
  let dead = null;
  const fail = (e) => {
    dead = e;
    for (const p of pending.values()) {
      clearTimeout(p.timer);
      p.reject(e);
    }
    pending.clear();
  };
  worker.onmessage = (e) => {
    const m = e.data;
    const p = pending.get(m.id);
    if (!p) return;
    pending.delete(m.id);
    clearTimeout(p.timer);
    if (m.ok) p.resolve(m);
    else p.reject(new Error(m.error));
  };
  worker.onerror = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    fail(new Error("The face tracker worker stopped: " + (e && e.message || "error")));
  };
  const call = (msg, transfer, ms) => new Promise((resolve2, reject) => {
    if (dead) return reject(dead);
    const id = seq += 1;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error("The face tracker worker did not answer in " + ms / 1e3 + " s."));
    }, ms);
    pending.set(id, { resolve: resolve2, reject, timer });
    worker.postMessage(Object.assign({ id }, msg), transfer);
  });
  let ort = "";
  try {
    ort = (await call({ type: "init", ortUrl, wasm, model: model2 }, [], INIT_TIMEOUT_MS)).ort;
  } catch (e) {
    worker.terminate();
    throw e;
  } finally {
    g.URL.revokeObjectURL(ortUrl);
    g.URL.revokeObjectURL(workerUrl);
  }
  return {
    kind: "worker",
    via: "blob",
    ort,
    async run(data, width, height) {
      const r = await call({ type: "run", data, dims: [1, 3, height, width] }, [data.buffer], RUN_TIMEOUT_MS);
      return { outputs: r.res, input: r.input };
    }
  };
}

// plugins/podcast-hook-captions/src/pipeline/faceRuntime.ts
var DOWNLOAD_TIMEOUT_MS = 5 * 60 * 1e3;
function runtimeDir() {
  return fs().join(dataRoot(), "runtime");
}
var errText = (e) => String(e && e.message || e || "unknown error").slice(0, 300);
async function readVerified(path, file) {
  if (!await fs().exists(path)) return null;
  try {
    const bytes = toBytes(await fs().readFile(path));
    if (bytes.length === file.bytes && await sha256(bytes) === file.sha256) return bytes;
  } catch {
  }
  await removeQuiet(path);
  return null;
}
async function renameWithRetry(from, to) {
  for (let k = 0; ; k += 1) {
    try {
      await fs().rename(from, to);
      return;
    } catch (e) {
      if (k >= 4) throw e;
      await new Promise((r) => setTimeout(r, 200 * (k + 1)));
    }
  }
}
async function download(file, dest) {
  const reasons = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const url = file.urls[Math.min(attempt, file.urls.length - 1)];
    const part = dest + ".part" + attempt;
    await removeQuiet(part);
    try {
      let timer = null;
      await Promise.race([
        fs().downloadFile(url, part),
        new Promise((_, reject) => timer = setTimeout(() => reject(new Error("no answer after " + DOWNLOAD_TIMEOUT_MS / 1e3 + " s")), DOWNLOAD_TIMEOUT_MS))
      ]).finally(() => clearTimeout(timer));
      if (!await fs().exists(part)) throw new Error("nothing was saved");
      const bytes = toBytes(await fs().readFile(part));
      if (bytes.length !== file.bytes) throw new Error("the server sent " + bytes.length + " bytes, not " + file.bytes);
      const got = await sha256(bytes);
      if (got !== file.sha256) throw new Error("the file's checksum is wrong (sha256 " + got.slice(0, 12) + "\u2026)");
      await renameWithRetry(part, dest);
      return bytes;
    } catch (e) {
      reasons.push(url.replace(/^https:\/\/([^/]+)\/.*$/, "$1") + ": " + errText(e));
      await removeQuiet(part);
    }
  }
  throw new Error("Could not download the " + file.label + " (" + file.name + "). " + reasons.join("; ") + ". Check the internet connection and try again.");
}
async function pinnedFiles(want, progress) {
  const got = [];
  for (const w of want) {
    let hit = null;
    for (const p of [w.dest].concat(w.also)) {
      const bytes = await readVerified(p, w.file);
      if (bytes) {
        hit = { bytes, path: p };
        break;
      }
    }
    got.push(hit);
  }
  const missing = want.filter((_, i) => !got[i]);
  if (missing.length) {
    const mb = missing.reduce((n, w) => n + w.file.bytes, 0) / 1e6;
    progress("Downloading face tracking (one time, " + (mb < 1 ? mb.toFixed(1) : Math.round(mb)) + " MB)\u2026");
  }
  for (let i = 0; i < want.length; i += 1) {
    if (got[i]) continue;
    await fs().mkdir(fs().dirname(want[i].dest), { recursive: true });
    got[i] = { bytes: await download(want[i].file, want[i].dest), path: want[i].dest };
  }
  return got;
}
var importUrl = new Function("u", "return import(u)");
function base64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 32768) s += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 32768)));
  return btoa(s);
}
async function importOrt(js) {
  const g = globalThis;
  let first = "";
  if (typeof g.Blob === "function" && g.URL && typeof g.URL.createObjectURL === "function") {
    const url = g.URL.createObjectURL(new g.Blob([js], { type: "text/javascript" }));
    try {
      return { ort: await importUrl(url), via: "blob" };
    } catch (e) {
      first = errText(e);
    } finally {
      g.URL.revokeObjectURL(url);
    }
  }
  try {
    return { ort: await importUrl("data:text/javascript;base64," + base64(js)), via: "data" };
  } catch (e) {
    throw new Error("The face tracker runtime could not be started: " + (first ? first + "; " : "") + errText(e));
  }
}
async function panelEngine(js, wasm, model2) {
  const { ort, via } = await importOrt(js);
  if (!ort || !ort.env || !ort.InferenceSession) throw new Error("The face tracker runtime did not load (no onnxruntime API).");
  ort.env.logLevel = "error";
  ort.env.wasm.wasmBinary = wasm;
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  let session;
  try {
    session = await ort.InferenceSession.create(model2, { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
  } catch (e) {
    throw new Error("The face model could not be loaded: " + errText(e));
  }
  const input = session.inputNames[0] || "input";
  return {
    kind: "panel",
    via,
    ort: String(ort.env.versions && ort.env.versions.web || ORT_VERSION),
    async run(data, width, height) {
      const out = await session.run({ [input]: new ort.Tensor("float32", data, [1, 3, height, width]) });
      const outputs = {};
      for (const k of Object.keys(out)) outputs[k] = out[k].data;
      return { outputs, input: data };
    }
  };
}
async function createDetector(progress, o) {
  const t0 = Date.now();
  const dir = runtimeDir();
  const ortDir = fs().join(dir, "onnxruntime-web-" + ORT_VERSION);
  const [model2, js, wasm] = await pinnedFiles(
    [
      // a model the earlier Python setup downloaded is the same file
      { file: YUNET_MODEL, dest: fs().join(dir, YUNET_MODEL.name), also: [fs().join(dataRoot(), "models", YUNET_MODEL.name)] },
      { file: ORT_JS, dest: fs().join(ortDir, ORT_JS.name), also: [] },
      { file: ORT_WASM, dest: fs().join(ortDir, ORT_WASM.name), also: [] }
    ],
    progress
  );
  progress("Starting face tracking\u2026");
  const symbolic = withSymbolicInputSize(model2.bytes);
  let engine = null;
  let workerError = "";
  if (o.worker !== false) {
    try {
      engine = await startWorkerEngine(js.bytes, wasm.bytes, symbolic);
    } catch (e) {
      workerError = errText(e);
    }
  }
  if (!engine) engine = await panelEngine(js.bytes, wasm.bytes, symbolic);
  const eng = engine;
  let scratch;
  let queue = Promise.resolve();
  const detectOne = async (bgr, width, height) => {
    const blob = bgrToBlob(bgr, width, height, scratch);
    const r = await eng.run(blob.data, blob.width, blob.height);
    scratch = r.input;
    return decodeYuNet(r.outputs, blob.width, blob.height);
  };
  return {
    info: { ort: eng.ort || ORT_VERSION, engine: eng.kind, loadedVia: eng.via, workerError, loadMs: Date.now() - t0, files: [model2.path, js.path, wasm.path] },
    detect(bgr, width, height) {
      const run = queue.then(() => detectOne(bgr, width, height));
      queue = run.catch(() => void 0);
      return run;
    }
  };
}
var loading = /* @__PURE__ */ new Map();
function loadFaceDetector(progress = () => {
}, o = {}) {
  const key = o.worker === false ? "panel" : "auto";
  let p = loading.get(key);
  if (!p) {
    const created = createDetector(progress, o);
    p = created;
    loading.set(key, created);
    created.catch(() => {
      if (loading.get(key) === created) loading.delete(key);
    });
  }
  return p;
}

// plugins/podcast-hook-captions/src/pipeline/cvstats.ts
var HSV_SHIFT = 12;
var HSV_HALF = 1 << HSV_SHIFT - 1;
var SDIV = new Int32Array(256);
var HDIV180 = new Int32Array(256);
for (let i = 1; i < 256; i += 1) {
  SDIV[i] = Math.round((255 << HSV_SHIFT) / i);
  HDIV180[i] = Math.round((180 << HSV_SHIFT) / (6 * i));
}
var HIST_H_BINS = 32;
var HIST_S_BINS = 16;
var H_TAB = new Int32Array(256);
var S_TAB = new Int32Array(256);
for (let j = 0; j < 256; j += 1) {
  H_TAB[j] = j < 180 ? Math.floor(j * (HIST_H_BINS / 180)) : -1;
  S_TAB[j] = Math.floor(j * (HIST_S_BINS / 256));
}
function frameStats(bgr, width, height, color) {
  const n = width * height;
  const counts = new Float64Array(HIST_H_BINS * HIST_S_BINS);
  const grayCounts = color ? new Float64Array(256) : null;
  let sb = 0, sg = 0, sr = 0, ss = 0;
  for (let i = 0, p = 0; i < n; i += 1, p += 3) {
    const b = bgr[p], g = bgr[p + 1], r = bgr[p + 2];
    let v = b, mn = b;
    if (g > v) v = g;
    if (r > v) v = r;
    if (g < mn) mn = g;
    if (r < mn) mn = r;
    const diff = v - mn;
    const s = diff * SDIV[v] + HSV_HALF >> HSV_SHIFT;
    let h = v === r ? g - b : v === g ? b - r + 2 * diff : r - g + 4 * diff;
    h = h * HDIV180[diff] + HSV_HALF >> HSV_SHIFT;
    if (h < 0) h += 180;
    const hb = H_TAB[h];
    if (hb >= 0) counts[hb * HIST_S_BINS + S_TAB[s]] += 1;
    if (grayCounts) {
      sb += b;
      sg += g;
      sr += r;
      ss += s;
      grayCounts[b * 1868 + g * 9617 + r * 4899 + 8192 >> 14] += 1;
    }
  }
  let sq = 0;
  for (let i = 0; i < counts.length; i += 1) sq += counts[i] * counts[i];
  const scale = sq > 0 ? 1 / Math.sqrt(sq) : 0;
  const hist = new Float32Array(counts.length);
  for (let i = 0; i < counts.length; i += 1) hist[i] = counts[i] * scale;
  if (!grayCounts) return { hist, color: null };
  return {
    hist,
    color: [sr / n, sg / n, sb / n, ss / n / 255, percentileOfCounts(grayCounts, 5), percentileOfCounts(grayCounts, 95)]
  };
}
function chiSquareAlt(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i += 1) {
    const d = a[i] - b[i];
    const t = a[i] + b[i];
    if (Math.abs(t) > 2220446049250313e-31) s += d * d / t;
  }
  return 2 * s;
}
function percentileOfCounts(counts, q) {
  let n = 0;
  for (let i = 0; i < counts.length; i += 1) n += counts[i];
  if (!n) return NaN;
  const virtual = (n - 1) * (q / 100);
  const lo = Math.floor(virtual);
  const valueAt = (rank) => {
    let seen = 0;
    for (let v = 0; v < counts.length; v += 1) {
      seen += counts[v];
      if (rank < seen) return v;
    }
    return counts.length - 1;
  };
  const a = valueAt(lo);
  const b = valueAt(Math.min(n - 1, lo + 1));
  return lerp(a, b, virtual - lo);
}
function lerp(a, b, t) {
  const d = b - a;
  return t >= 0.5 ? b - d * (1 - t) : a + d * t;
}
function npMedian(xs) {
  const a = Array.from(xs).sort((p, q) => p - q);
  const n = a.length;
  if (!n) return NaN;
  return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
}
function npMean(xs) {
  return xs.length ? pairwiseSum(xs, 0, xs.length) / xs.length : NaN;
}
function pairwiseSum(a, from, n) {
  if (n < 8) {
    let s = 0;
    for (let i = 0; i < n; i += 1) s += a[from + i];
    return s;
  }
  if (n <= 128) {
    const r = [a[from], a[from + 1], a[from + 2], a[from + 3], a[from + 4], a[from + 5], a[from + 6], a[from + 7]];
    let i = 8;
    for (; i < n - n % 8; i += 8) for (let k = 0; k < 8; k += 1) r[k] += a[from + i + k];
    let s = r[0] + r[1] + (r[2] + r[3]) + (r[4] + r[5] + (r[6] + r[7]));
    for (; i < n; i += 1) s += a[from + i];
    return s;
  }
  let n2 = Math.floor(n / 2);
  n2 -= n2 % 8;
  return pairwiseSum(a, from, n2) + pairwiseSum(a, from + n2, n - n2);
}
function pyRound(x, nd = 0) {
  if (!Number.isFinite(x)) return x;
  const neg = x < 0;
  const s = Math.abs(x).toFixed(Math.min(100, nd + 30));
  const dot = s.indexOf(".");
  const ip = dot < 0 ? s : s.slice(0, dot);
  const fp = dot < 0 ? "" : s.slice(dot + 1);
  const digits = ip + fp.slice(0, nd);
  const rest = fp.slice(nd);
  let up = false;
  if (rest[0] > "5") up = true;
  else if (rest[0] === "5") up = /[1-9]/.test(rest.slice(1)) || Number(digits[digits.length - 1]) % 2 === 1;
  const mag = (Number(digits) + (up ? 1 : 0)) / Math.pow(10, nd);
  const out = neg ? -mag : mag;
  return out === 0 ? 0 : out;
}

// plugins/podcast-hook-captions/src/pipeline/faceTrack.ts
var TRACK = { fps: 6, score: 0.8, minFace: 0.05, cut: 0.35, longSide: 640, colorSamples: 40, minShot: 0.5 };
var F = Math.fround;
var SCORE = F(TRACK.score);
var MIN_FACE = F(TRACK.minFace);
var MIN_RATIO = F(0.5);
var MAX_RATIO = F(1.6);
function samplePlan(info, start, end) {
  const fps = info.fps;
  const f0 = Math.max(0, pyRound(Number(start) * fps));
  const f1 = Math.max(f0 + 1, pyRound(Number(end) * fps));
  const step = Math.max(1, pyRound(fps / TRACK.fps));
  const k = Math.min(1, TRACK.longSide / Math.max(info.W, info.H));
  return { f0, f1, step, w: Math.max(1, pyRound(info.W * k)), h: Math.max(1, pyRound(info.H * k)), count: Math.ceil((f1 - f0) / step) };
}
function keepFaces(rows, plan, info) {
  const sw = plan.w, sh = plan.h;
  const faces = [];
  for (const r of rows) {
    const x = F(r.box[0] / sw), y = F(r.box[1] / sh), w = F(r.box[2] / sw), h = F(r.box[3] / sh);
    const ratio = F(F(w * info.W) / F(h * info.H));
    if (F(r.score) < SCORE || h < MIN_FACE || !(MIN_RATIO < ratio && ratio < MAX_RATIO)) continue;
    const eyes = F(F(F(r.landmarks[0][1] + r.landmarks[1][1]) / 2) / sh);
    const eyeX = F(F(F(r.landmarks[0][0] + r.landmarks[1][0]) / 2) / sw);
    faces.push({ b: [x, y, w, h], ex: eyeX, ey: eyes, s: F(r.score) });
  }
  return faces;
}
function iou(a, b) {
  const ax2 = a[0] + a[2], ay2 = a[1] + a[3], bx2 = b[0] + b[2], by2 = b[1] + b[3];
  const iw = Math.max(0, Math.min(ax2, bx2) - Math.max(a[0], b[0]));
  const ih = Math.max(0, Math.min(ay2, by2) - Math.max(a[1], b[1]));
  const inter = iw * ih;
  return inter / (a[2] * a[3] + b[2] * b[3] - inter + 1e-9);
}
function buildShots(samples, cuts, f1, fps) {
  const bounds = cuts.concat([f1]);
  const shots = [];
  for (let i = 0; i < cuts.length; i += 1) {
    const ss = samples.filter((s) => bounds[i] <= s.f && s.f < bounds[i + 1]);
    const shot = { start: pyRound(bounds[i] / fps, 4), end: pyRound(bounds[i + 1] / fps, 4), face: null, faces: 0, ambiguous: false };
    if (ss.length) {
      const tracks = [];
      for (const s of ss) {
        for (const face of s.faces) {
          let best = null;
          let bestIou = -Infinity;
          for (const t of tracks) {
            const v = iou(t.last, face.b);
            if (v > bestIou) {
              best = t;
              bestIou = v;
            }
          }
          if (best === null || bestIou < 0.3 || best.lastF === s.f) {
            best = { rows: [], last: null, lastF: null };
            tracks.push(best);
          }
          best.rows.push(face);
          best.last = face.b;
          best.lastF = s.f;
        }
      }
      const weight = (t) => t.rows.length / ss.length * npMedian(t.rows.map((r) => r.b[3])) * npMean(t.rows.map((r) => r.s));
      const weights = new Map(tracks.map((t) => [t, weight(t)]));
      const ranked = tracks.slice().sort((a, b) => weights.get(b) - weights.get(a));
      shot.faces = Math.max(...ss.map((s) => s.faces.length));
      if (ranked.length) {
        const m = ranked[0].rows;
        const med = (key) => pyRound(npMedian(m.map(key)), 4);
        shot.face = {
          cx: med((r) => r.ex),
          eyes: med((r) => r.ey),
          h: med((r) => r.b[3]),
          w: med((r) => r.b[2]),
          top: med((r) => r.b[1]),
          coverage: pyRound(m.length / ss.length, 3)
        };
        shot.ambiguous = ranked.length > 1 && weights.get(ranked[1]) > 0.6 * weights.get(ranked[0]);
      }
    }
    shots.push(shot);
  }
  const merged = [];
  for (const s of shots) {
    const last = merged.length ? merged[merged.length - 1] : null;
    if (last && (s.end - s.start < TRACK.minShot || last.end - last.start < TRACK.minShot)) {
      const keep = last.face && last.end - last.start >= s.end - s.start || !s.face ? last : s;
      merged[merged.length - 1] = { ...keep, start: last.start, end: s.end };
    } else merged.push(s);
  }
  return merged;
}
function colorSummary(colors) {
  if (!colors.length) return null;
  const m = [0, 1, 2, 3, 4, 5].map((k) => npMedian(colors.map((c) => c[k])));
  return { r: pyRound(m[0], 1), g: pyRound(m[1], 1), b: pyRound(m[2], 1), sat: pyRound(m[3], 3), p5: pyRound(m[4], 1), p95: pyRound(m[5], 1) };
}
async function scanJob(job, detect, o) {
  let info;
  try {
    info = await probeVideo(job.path, o.signal);
  } catch (e) {
    if (o.signal && o.signal.aborted) throw e;
    return { id: job.id, error: "cannot open source" };
  }
  return scanProbed(job, info, samplePlan(info, job.start, job.end), detect, o);
}
async function scanProbed(job, info, plan, detect, o) {
  const samples = [];
  const cuts = [plan.f0];
  const colors = [];
  let prev = null;
  let i = 0;
  const frames = o.frames ? o.frames(info, plan) : sampleFrames(job.path, info, plan, o.workDir, String(job.id).replace(/[^\w-]/g, "_"), o.signal);
  for await (const img of frames) {
    const f = plan.f0 + i * plan.step;
    i += 1;
    const wantColor = colors.length < TRACK.colorSamples && (f - plan.f0) % (plan.step * 3) === 0;
    const st = frameStats(img, plan.w, plan.h, wantColor);
    if (st.color) colors.push(st.color);
    if (prev !== null && chiSquareAlt(prev, st.hist) > TRACK.cut) cuts.push(f);
    prev = st.hist;
    const rows = await detect(img, plan.w, plan.h);
    if (o.onSample) o.onSample(f, rows);
    samples.push({ f, faces: keepFaces(rows, plan, info) });
    if (o.onFrame) o.onFrame(i);
  }
  return { id: job.id, width: info.W, height: info.H, fps: info.fps, shots: buildShots(samples, cuts, plan.f1, info.fps), color: colorSummary(colors) };
}

// plugins/podcast-hook-captions/src/pipeline/faces.ts
var TARGET = { faceH: 0.36, cx: 0.51, eyes: 0.21, maxUpscale: 2.8 };
async function ensureFaceRuntime(progress) {
  return loadFaceDetector(progress);
}
function adaptiveGrade(faces) {
  const cs = Object.values(faces).map((f2) => f2.color).filter(Boolean);
  const med = (k, d) => {
    if (!cs.length) return d;
    const v = cs.map((c) => c[k]).sort((a, b) => a - b);
    return v[Math.floor(v.length / 2)];
  };
  const sat = med("sat", 0.15);
  const warm = (med("r", 100) - med("b", 100)) / Math.max(1, med("g", 100));
  const f = Math.max(1.1, Math.min(1.7, 1 + (0.42 - sat) * 2.2));
  const hot = warm > 0.05;
  return {
    sat: +f.toFixed(3),
    r: hot ? 1.04 : 1.07,
    g: 1,
    b: hot ? 0.93 : 0.89,
    slope: med("p95", 170) < 165 ? 1.15 : 1.1,
    off: med("p5", 15) < 10 ? -0.015 : -0.035
  };
}
async function trackFaces(rt, dir, clips, fps, progress = () => {
}, signal) {
  const jobs = clips.filter((c) => c.path && c.srcStart >= 0).map((c) => ({ id: c.clipId, path: c.path, start: c.srcStart, end: c.srcStart + (c.e - c.s) / fps }));
  const out = {};
  if (!jobs.length) return out;
  await fs().writeFile(fs().join(dir, "face-jobs.json"), J(jobs));
  const workDir = fs().join(dir, "face-frames");
  const total = jobs.reduce((n, j) => n + Math.max(1, Math.ceil(Math.max(0, j.end - j.start) * 6)), 0);
  let done = 0;
  let shown = -1;
  const t0 = Date.now();
  const results = [];
  try {
    for (const job of jobs) {
      let mine = 0;
      const r = await scanJob(job, (bgr, w, h) => rt.detect(bgr, w, h), {
        workDir,
        signal,
        onFrame: (n) => {
          mine = n;
          const pct = Math.min(99, Math.floor((done + n) / total * 100));
          if (pct !== shown) {
            shown = pct;
            progress("Finding the speaker\u2026 " + pct + "%");
          }
        }
      }).catch((e) => {
        if (signal && signal.aborted) throw e;
        return { id: job.id, error: String(e && e.message || e) };
      });
      done += mine;
      results.push(r);
    }
  } finally {
    try {
      await fs().rm(workDir, { recursive: true, force: true });
    } catch {
    }
  }
  const frames = done;
  await fs().writeFile(fs().join(dir, "faces.json"), J({ jobs: results, engine: "yunet-onnxruntime-web " + rt.info.ort, frames, ms: Date.now() - t0 }));
  for (const j of results) if ("width" in j) out[Number(j.id)] = { W: j.width, H: j.height, shots: j.shots, color: j.color || null };
  const failed = results.filter((j) => j.error && j.error !== "cannot open source");
  if (failed.length === results.length) throw new Error("Face tracking failed: " + failed[0].error);
  return out;
}
function reframe(W, H, sw, sh, face) {
  const fill = Math.max(W / sw, H / sh);
  let k = fill;
  if (face && face.h > 0) k = Math.max(fill, Math.min(TARGET.faceH * H / (face.h * sh), TARGET.maxUpscale));
  const w = sw * k;
  const h = sh * k;
  const cx = face ? face.cx : 0.5;
  const ey = face ? face.eyes : 0.38;
  const x = Math.min(0, Math.max(W - w, TARGET.cx * W - cx * w));
  const y = Math.min(0, Math.max(H - h, TARGET.eyes * H - ey * h));
  const onFrame = face ? { cx: (x + face.cx * w) / W, cy: (y + (face.top + face.h / 2) * h) / H, h: face.h * h / H } : null;
  return { rect: { x: +x.toFixed(2), y: +y.toFixed(2), w: +w.toFixed(2), h: +h.toFixed(2) }, face: onFrame };
}
function reelShots(W, H, fps, clips, faces) {
  const out = [];
  for (const c of clips) {
    const f = faces[c.clipId];
    const sw = f?.W || c.sw || 1920;
    const sh = f?.H || c.sh || 1080;
    const shots = f?.shots?.length ? f.shots : [{ start: c.srcStart, end: c.srcStart + (c.e - c.s) / fps, face: null }];
    const withFace = shots.filter((s) => s.face);
    shots.forEach((s, i) => {
      let face = s.face;
      if (!face && withFace.length) {
        const mid = (s.start + s.end) / 2;
        face = withFace.slice().sort((a, b) => Math.abs((a.start + a.end) / 2 - mid) - Math.abs((b.start + b.end) / 2 - mid))[0].face;
      }
      const from = i === 0 ? c.s : Math.max(c.s, Math.min(c.e, c.s + Math.round((s.start - c.srcStart) * fps)));
      const to = i === shots.length - 1 ? c.e : Math.max(c.s, Math.min(c.e, c.s + Math.round((s.end - c.srcStart) * fps)));
      if (to <= from) return;
      const r = reframe(W, H, sw, sh, face);
      out.push({ from, to, rect: r.rect, face: r.face });
    });
  }
  return out.sort((a, b) => a.from - b.from);
}

// plugins/podcast-hook-captions/src/pipeline/media.ts
var b64url = (s) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
var model = (endpoint) => "model_v1_" + b64url(endpoint);
var FAILED = /* @__PURE__ */ new Set(["failed", "cancelled", "canceled", "input_failed", "submission_rejected", "upload_failed", "handoff_failed"]);
var StuckError = class extends Error {
};
async function generate(pid, r, label, onTick, timeoutMs, tries = 3) {
  let last = null;
  for (let k = 0; k < tries; k += 1) {
    try {
      if (k) await sleep(1e4 * k);
      const id = await submit(pid, k ? { ...r, key: r.key.slice(0, 56) + "-r" + k } : r);
      return await waitFor(pid, id, label, onTick, timeoutMs);
    } catch (e) {
      last = e;
      if (!(e instanceof StuckError)) throw e;
      if (onTick) onTick(label + ": retrying");
    }
  }
  throw last;
}
function mediaGeneration() {
  const mg = di().MediaGeneration;
  if (!mg?.isAvailable?.()) throw new Error("Selects generation is not available for this account.");
  if (!mg.supportsPluginFiles?.()) throw new Error("This needs Selects 2.0.512 or later (plug-in generation files). Update Selects.");
  return mg;
}
async function submit(pid, r) {
  const mg = mediaGeneration();
  await fs().mkdir(r.folder, { recursive: true });
  const res = await mg.submit({
    scope: { libraryId: libraryId(), projectId: pid },
    key: r.key.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64),
    modelId: model(r.endpoint),
    input: r.input,
    ...r.inputMediaSeconds ? { inputMediaSeconds: r.inputMediaSeconds } : {},
    uploads: r.uploads || {},
    delivery: { pluginFolder: r.folder },
    outputName: r.outputName,
    batch: 1,
    origin: { tool: r.tool, tab: "podcast-hook-captions", recipeId: r.recipeId }
  });
  const id = res?.jobIds?.[0];
  if (!id) throw new Error("Generation was not accepted.");
  return id;
}
async function waitFor(pid, jobId, label, onTick, timeoutMs = 15 * 6e4) {
  const mg = mediaGeneration();
  const scope = { libraryId: libraryId(), projectId: pid };
  const t0 = Date.now();
  let redeliveries = 0;
  for (; ; ) {
    await sleep(1500);
    const j = (await mg.list(scope)).find((x) => x.jobId === jobId);
    if (j) {
      if (j.deliveryStatus === "delivered") {
        const p = (j.outputs || []).find((o) => o.path)?.path;
        if (!p) throw new Error(label + ": nothing came back.");
        return p;
      }
      if (["download_failed", "result_collection_failed"].includes(j.deliveryStatus) && j.status === "succeeded" && redeliveries < 3) {
        redeliveries += 1;
        if (onTick) onTick(label + ": fetching the result again");
        await mg.retryDelivery(scope, jobId).catch(() => {
        });
        await sleep(2e3 * redeliveries);
        continue;
      }
      if (FAILED.has(j.status) || ["download_failed", "result_collection_failed"].includes(j.deliveryStatus)) {
        const code = String(j.errorCode || j.status || j.deliveryStatus);
        if (/upload|handoff|submission_rejected|input_failed/.test(code + " " + j.status)) throw new StuckError(label + " failed (" + code + ").");
        throw new Error(label + " failed (" + code + ").");
      }
      if (j.status === "submission_unknown" && j.errorCode && Date.now() - t0 > 45e3) {
        mg.cancel(scope, jobId).catch(() => {
        });
        throw new StuckError(label + " was not accepted (" + j.errorCode + ").");
      }
      if (["preparing", "uploading", "submitting"].includes(j.status) && j.errorCode && Date.now() - t0 > 9e4) {
        mg.cancel(scope, jobId).catch(() => {
        });
        throw new StuckError(label + " stalled (" + j.errorCode + ").");
      }
    }
    if (onTick) onTick(label + " \xB7 " + Math.round((Date.now() - t0) / 1e3) + " s");
    if (Date.now() - t0 > timeoutMs) {
      mg.cancel(scope, jobId).catch(() => {
      });
      throw new Error(label + " took too long.");
    }
  }
}
var SFX_VERSION = "v2";
var SFX_PROMPTS = {
  deep_woosh: { text: "fast cinematic whoosh transition, bright airy swish with a punchy low body, clean, no music", seconds: 1.4 },
  woosh_medium: { text: "quick bright swish whoosh, crisp air swipe passing by, short and clean, no music", seconds: 0.9 },
  movie_title: { text: "punchy trailer title impact, bright metallic transient with a deep boom and a short reverb tail", seconds: 2.2 },
  es_whoosh: { text: "very short crisp air swish, bright and clean, subtle", seconds: 0.7 },
  tick: { text: "crisp bright UI click tick, single, dry, very short", seconds: 0.5 },
  bass_drop: { text: "808 sub bass drop hit with a crisp transient, deep and punchy, single", seconds: 1.8 },
  hit_reverb: { text: "bright punchy cinematic hit with a snappy transient and reverb, single impact", seconds: 1.8 },
  camera: { text: "crisp camera shutter click, photo snap, single", seconds: 0.6 }
};
var SFX_ANCHOR = {
  deep_woosh: 0.23,
  woosh_medium: 0.05,
  movie_title: 0.03,
  es_whoosh: 0.14,
  tick: 0.2,
  bass_drop: 0.56,
  hit_reverb: 0.02,
  camera: 0.14
};
async function ensureSfxLibrary(pid, onTick) {
  const dir = fs().join(fsDataRoot(), "sfx-lib");
  await fs().mkdir(dir, { recursive: true });
  const have = {};
  const want = [];
  for (const k of Object.keys(SFX_PROMPTS)) {
    const p = fs().join(dir, k + "-" + SFX_VERSION + ".mp3");
    if (await fs().exists(p)) have[k] = p;
    else want.push(k);
  }
  if (!want.length) return have;
  onTick("Making sound effects (one time)\u2026");
  await Promise.all(
    want.map(async (k) => {
      const got = await generate(
        pid,
        {
          key: "phc-sfx-" + k + "-" + SFX_VERSION,
          endpoint: "fal-ai/elevenlabs/sound-effects/v2",
          input: { text: SFX_PROMPTS[k].text, duration_seconds: SFX_PROMPTS[k].seconds, prompt_influence: 0.55, output_format: "mp3_44100_128" },
          folder: fs().join(dir, "incoming-" + k + "-" + SFX_VERSION),
          outputName: "reel-sfx-" + k,
          tool: "audio",
          recipeId: "reel-sfx"
        },
        "Sound effect " + k,
        onTick
      );
      const dest = fs().join(dir, k + "-" + SFX_VERSION + ".mp3");
      await fs().writeFile(dest, await fs().readFile(got));
      have[k] = dest;
    })
  );
  return have;
}
function fsDataRoot() {
  const f = fs();
  return f.join(f.homedir(), ".selects", "plugin-data", "podcast-hook-captions");
}

// plugins/podcast-hook-captions/src/pipeline/render.ts
async function sourceRevision(sequenceId, resourceIds) {
  const lib = libraryId();
  const sequence = await di().SequenceRepository.findById(lib, sequenceId);
  if (!sequence) throw new Error("The render copy could not be reloaded.");
  const resources = await Promise.all(resourceIds.map((id) => di().ResourceRepository.findById(lib, id)));
  const json = JSON.stringify({ sequence: sequence.toJSON(), resources: resources.map((r) => r?.toJSON() ?? null) });
  const digest = await app().crypto.subtle.digest("SHA-256", new (app()).TextEncoder().encode(json));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
async function renderDraft(pid, sid, outputPath, progress) {
  const d = di();
  const lib = libraryId();
  const project = await d.ProjectRepository.findById(lib, pid);
  const source = await d.SequenceRepository.findById(lib, sid);
  if (!project || !source) throw new Error("The reel Draft could not be read for rendering.");
  const copyId = app().crypto.randomUUID();
  const name = "Reel matte render " + copyId;
  const copy = source.clone({ id: copyId, name });
  copy.setTracks(copy.getTracks().filter((t) => !t.isChapterTrack() && !t.isSubChapterTrack() && !t.isWordTrack()));
  if (typeof copy.authorFrameSize === "function") copy.authorFrameSize({ width: 1080, height: 1920 });
  let saved = false;
  try {
    await d.SequenceRepository.save(copy, "podcast-hook-captions-render");
    saved = true;
    const overlaySnapshot = await d.RemotionOverlay.getSnapshotForExport(copyId, copy, project);
    const resourceIds = [...project.getResources()];
    const rev = await sourceRevision(copyId, resourceIds);
    const job = await d.WorkflowClient.start({
      type: "export:video",
      input: {
        resolution: "FHD",
        title: "Reel matte render",
        internal: true,
        outputPath,
        projectId: pid,
        libraryId: lib,
        sequenceId: copyId,
        resourceIds,
        audioOnly: false,
        overwriteOutput: false,
        overlaySnapshot,
        sourceRevision: rev
      }
    });
    await new Promise((resolve2, reject) => {
      let done = false;
      let off = () => {
      };
      const read = (v) => {
        if (done || !v) return;
        if (["succeeded", "failed", "canceled"].includes(v.status)) {
          done = true;
          off();
          v.status === "succeeded" ? resolve2() : reject(new Error("Render " + v.status + (v.lastError?.message ? ": " + v.lastError.message : "")));
        } else progress("Rendering the reel for speaker mattes \xB7 " + (v.progressDescription || v.status));
      };
      off = d.WorkflowClient.subscribe((e) => {
        if (e.type === "UPSERT" && e.workflow.workflowId === job.workflowId) read(e.workflow);
      });
      read(d.WorkflowClient.list().find((x) => x.workflowId === job.workflowId));
      if (done) off();
    });
  } finally {
    if (saved) {
      const temp = await d.SequenceRepository.findById(lib, copyId);
      if (temp?.getName() === name) await d.SequenceRepository.delete(lib, copyId);
    }
  }
}
var VEED = "veed/video-background-removal/fast";
async function makeMattes(sdk, pid, render, seconds, dir, key, progress) {
  const alpha = await generate(
    pid,
    {
      key: "phc-matte-" + key,
      endpoint: VEED,
      input: { video_url: "selects-input:source", output_codec: "h264", refine_foreground_edges: false, subject_is_person: true },
      // The server prices VEED by frames from this length; milliseconds are plenty.
      inputMediaSeconds: { video: Math.round(seconds * 1e3) / 1e3 },
      uploads: { source: { pluginFile: render } },
      folder: fs().join(dir, "cloud"),
      outputName: "reel-speaker-mattes",
      tool: "video",
      recipeId: "speaker-masks"
    },
    "Speaker mattes (VEED)",
    progress,
    10 * 6e4
  );
  progress("Writing speaker matte frames\u2026");
  const MATTE = /^matte_\d{6}\.png$/;
  for (const n of await filesIn(dir, MATTE)) await removeFile(fs().join(dir, n));
  await ffmpeg(
    "Write matte frames",
    ["-v", "error", "-y", "-i", alpha, "-vf", "format=gray,negate,scale=1080:1920:flags=bicubic,dilation,dilation,lut=y=clip((val-24)*1.2\\,0\\,255)", "-start_number", "1", fs().join(dir.replace(/%/g, "%%"), "matte_%06d.png")],
    6e5
  );
  const count = (await filesIn(dir, MATTE)).length;
  if (!count) throw new Error("No matte frames were written.");
  const base = String(await fs().pathToLocalURL(dir)).replace(/\/$/, "");
  return { base, count };
}

// plugins/podcast-hook-captions/src/pipeline/stock.ts
function stockSearchAvailable() {
  try {
    return typeof di()?.StockMediaSearch?.searchVideos === "function";
  } catch {
    return false;
  }
}
async function stockClip(sdk, queries, orientation, dir, seconds, avoid = []) {
  const service = di().StockMediaSearch;
  await fs().mkdir(dir, { recursive: true });
  const tried = /* @__PURE__ */ new Set();
  let lastErr = null;
  for (const raw of queries) {
    const query = String(raw || "").replace(/[^\p{L}\p{N}\s'-]+/gu, " ").replace(/\s+/g, " ").trim().split(" ").slice(0, 5).join(" ");
    if (!query || tried.has(query)) continue;
    tried.add(query);
    let rows = [];
    try {
      rows = await service.searchVideos({ query, per: 10, orientation });
    } catch {
      continue;
    }
    const pick = chooseStock(rows.filter((v) => !avoid.includes(v.originalUrl)), orientation);
    if (!pick) continue;
    const out = fs().join(dir, "stock-" + Math.abs(hash(pick.video.originalUrl)) + ".mp4");
    if (!await fs().exists(out)) {
      const box = orientation === "portrait" ? "1080:1920" : "1920:1080";
      const src = out + ".src";
      const part = out + ".part.mp4";
      try {
        await Promise.race([fs().downloadFile(pick.url, src), sleep(12e4).then(() => Promise.reject(new Error("The stock download took too long.")))]);
        await ffmpeg(
          "Cut stock B-roll",
          ["-v", "error", "-y", "-ss", "0.4", "-t", Math.max(4, Math.min(12, seconds)).toFixed(1), "-i", src, "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-pix_fmt", "yuv420p", "-vf", "scale=" + box + ":force_original_aspect_ratio=increase:force_divisible_by=2", "-f", "mp4", part],
          15e4
        );
        for (let k = 0; ; k += 1) {
          try {
            await fs().rename(part, out);
            break;
          } catch (e) {
            if (k >= 5) throw e;
            await sleep(200 * (k + 1));
          }
        }
      } catch (e) {
        await removeFile(part);
        lastErr = e;
        continue;
      } finally {
        await removeFile(src);
      }
    }
    const probe = (await ffprobe("Probe stock B-roll", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", out]).catch(() => "")).trim().split(",").map(Number);
    return {
      id: pick.video.originalUrl,
      path: out,
      width: probe[0] || pick.width,
      height: probe[1] || pick.height,
      credit: pick.video.authorName || serviceLabel(pick.video.serviceName),
      url: pick.video.authorUrl,
      service: serviceLabel(pick.video.serviceName)
    };
  }
  if (lastErr) throw lastErr;
  return null;
}
function serviceLabel(name) {
  return /^pex/i.test(name) ? "Pexels" : name || "stock";
}
function chooseStock(rows, orientation) {
  const need = orientation === "portrait" ? 1080 : 720;
  let best = null;
  rows.forEach((v, rank) => {
    if (!(v.duration >= 4)) return;
    const files = v.files && v.files.length ? v.files : [{ url: v.originalUrl, width: v.width, height: v.height }];
    for (const f of files) {
      if (!f.url || !f.width || !f.height) continue;
      if (orientation === "portrait" !== f.height > f.width) continue;
      const short = Math.min(f.width, f.height);
      if (short < need * 0.66) continue;
      const fit = short >= need ? (short - need) / 4 : (need - short) * 3;
      const score = fit + rank * 30 + (v.duration > 40 ? 150 : 0);
      if (!best || score < best.score) best = { video: v, url: f.url, width: f.width, height: f.height, score };
    }
  });
  return best;
}
function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) h = (h << 5) + h + s.charCodeAt(i) | 0;
  return h;
}

// plugins/podcast-hook-captions/src/pipeline/sound.ts
var MUSIC_PROMPT = "Instrumental drift phonk, 123 BPM, punchy trap drums, heavy distorted 808 bass, cowbell melody, dark and energetic, steady groove from the first second, no vocals, no intro fade";
async function makeMusic(pid, seconds, dir, key, onTick) {
  return generate(
    pid,
    {
      key: "phc-music-" + key,
      endpoint: "elevenlabs/music/v2.5",
      input: { prompt: MUSIC_PROMPT, music_length_ms: Math.round(Math.min(120, Math.max(12, seconds + 2)) * 1e3), force_instrumental: true, output_format: "mp3_44100_128" },
      folder: fs().join(dir, "music"),
      outputName: "reel-music",
      tool: "audio",
      recipeId: "reel-music"
    },
    "Music",
    onTick,
    10 * 6e4
  );
}
async function loudnessInfo(path) {
  try {
    const { stderr } = await ffmpeg("Measure loudness", ["-nostats", "-i", path, "-vn", "-af", "loudnorm=print_format=json", "-f", "null", "-"], 12e4, true);
    const i = Number((/"input_i"\s*:\s*"(-?[\d.]+)"/.exec(stderr) || [])[1]);
    const tp = Number((/"input_tp"\s*:\s*"(-?[\d.]+)"/.exec(stderr) || [])[1]);
    return Number.isFinite(i) && i > -70 ? { i, tp: Number.isFinite(tp) ? tp : -3 } : null;
  } catch {
    return null;
  }
}
async function loudness(path) {
  return (await loudnessInfo(path))?.i ?? null;
}
async function peakInfo(path, scratch) {
  const raw = scratch + ".s16";
  try {
    const rate2 = 8e3;
    await ffmpeg("Measure peak", ["-v", "error", "-y", "-i", path, "-vn", "-ac", "2", "-ar", String(rate2), "-f", "s16le", raw], 6e4);
    const bytes = await fs().readFile(raw);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let best = 0;
    let bestAt = 0;
    for (let k = 0; k + 1 < bytes.byteLength; k += 2) {
      const v = Math.abs(view.getInt16(k, true));
      if (v > best) {
        best = v;
        bestAt = Math.floor(k / 4);
      }
    }
    if (!best) return null;
    return { db: 20 * Math.log10(best / 32768), at: Math.floor(bestAt / (rate2 / 100)) / 100 };
  } catch {
    return null;
  } finally {
    await removeFile(raw);
  }
}
var VOICE_CHAIN = "highpass=f=80,acompressor=threshold=-22dB:ratio=3:attack=5:release=90:makeup=3,equalizer=f=250:t=q:w=1:g=-2,equalizer=f=3200:t=q:w=1:g=2.5,equalizer=f=9000:t=h:w=0.7:g=1.5";
var MUSIC_CHAIN = "highpass=f=35,equalizer=f=2500:t=q:w=1.2:g=-4";
var LOUD_TARGET = -9;
var PEAK_LIMIT = 0.85;
async function mixSound(plan, voiceFrom, music, lib, outPath, dir) {
  const S = plan.endFrame / plan.fps;
  const dur = S.toFixed(3);
  const voicePath = fs().join(dir, "voice-" + Date.now().toString(36) + ".wav");
  await ffmpeg(
    "Process the voice",
    ["-v", "error", "-y", "-i", voiceFrom, "-vn", "-af", "aformat=sample_rates=48000:channel_layouts=stereo," + VOICE_CHAIN + ",apad=whole_dur=" + dur + ",atrim=0:" + dur, "-c:a", "pcm_s24le", voicePath],
    18e4
  );
  const voice = await loudness(voicePath) ?? -18;
  const inputs = [voicePath];
  const graph = ["[0:a]anull[v]"];
  const mixIn = ["[v]"];
  if (music) {
    const mi = await loudness(music) ?? -14;
    const idx = inputs.length;
    inputs.push(music);
    graph.push(
      "[" + idx + ":a]aformat=sample_rates=48000:channel_layouts=stereo,atrim=0:" + dur + "," + MUSIC_CHAIN + ",volume=" + (voice - 13 - mi).toFixed(2) + "dB,afade=t=in:d=0.15,afade=t=out:st=" + Math.max(0, S - 0.35).toFixed(3) + ":d=0.35[m]"
    );
    mixIn.push("[m]");
  }
  const peaks = {};
  const cachePath = fs().join(dir, "..", "sfx-peaks-v2.json");
  try {
    Object.assign(peaks, JSON.parse(String(await fs().readFile(cachePath, "utf8"))));
  } catch {
  }
  for (const k of Object.keys(lib)) {
    if (peaks[k]) continue;
    const got = await peakInfo(lib[k], fs().join(dir, "peak-" + k));
    if (got) peaks[k] = got;
  }
  try {
    await fs().writeFile(cachePath, J(peaks));
  } catch {
  }
  for (const ev of plan.sfx) {
    const file = lib[ev.kind];
    if (!file) continue;
    const pk = peaks[ev.kind] || { db: -3, at: 0 };
    const idx = inputs.length;
    inputs.push(file);
    const g = voice + 9 - pk.db + 20 * Math.log10(Math.max(0.05, ev.gain * 0.85));
    const start = ev.t + (SFX_ANCHOR[ev.kind] ?? 0) - pk.at;
    const ms = Math.max(0, Math.round(start * 1e3));
    const head = start < 0 ? "atrim=start=" + (-start).toFixed(3) + ",asetpts=PTS-STARTPTS," : "";
    const hp = ev.kind === "bass_drop" || ev.kind === "movie_title" ? "" : "highpass=f=140,";
    graph.push("[" + idx + ":a]aformat=sample_rates=48000:channel_layouts=stereo," + head + hp + "volume=" + g.toFixed(2) + "dB,adelay=" + ms + "|" + ms + "[s" + idx + "]");
    mixIn.push("[s" + idx + "]");
  }
  graph.push(mixIn.join("") + "amix=inputs=" + mixIn.length + ":normalize=0:duration=longest,apad=whole_dur=" + dur + ",atrim=0:" + dur + "[out]");
  await fs().writeFile(fs().join(dir, "mix.txt"), graph.join(";\n"));
  const pre = fs().join(dir, "premaster-" + Date.now().toString(36) + ".wav");
  await ffmpeg(
    "Mix voice, music and sound effects",
    ["-v", "error", "-y", ...inputs.flatMap((p) => ["-i", p]), "-filter_complex", graph.join(";"), "-map", "[out]", "-c:a", "pcm_s24le", pre],
    24e4
  );
  const preI = await loudness(pre) ?? -16;
  const master = async (gainDb) => ffmpeg(
    "Master the sound",
    ["-v", "error", "-y", "-i", pre, "-af", "volume=" + gainDb.toFixed(2) + "dB,alimiter=limit=" + PEAK_LIMIT + ":attack=3:release=60:level=disabled", "-c:a", "pcm_s16le", outPath],
    12e4
  );
  let gain = LOUD_TARGET - preI;
  await master(gain);
  let out = await loudnessInfo(outPath);
  if (out && out.i < LOUD_TARGET - 0.4) {
    gain += Math.min(4, LOUD_TARGET - out.i);
    await master(gain);
    out = await loudnessInfo(outPath);
  }
  await removeFile(voicePath);
  await removeFile(pre);
  return { lufs: out ? out.i : LOUD_TARGET, truePeak: out ? out.tp : null };
}

// plugins/podcast-hook-captions/src/renderers.ts
var lookCode = `// plugins/podcast-hook-captions/src/motion/Look.tsx
import React3 from "react";
import { useCurrentFrame } from "remotion";

// plugins/podcast-hook-captions/src/motion/camera.ts
function ease(kind, p) {
  switch (kind) {
    case "lin":
      return [p, 1];
    case "o":
      return [1 - Math.pow(1 - p, 3), 3 * Math.pow(1 - p, 2)];
    case "i":
      return [p * p * p, 3 * p * p];
    case "whip":
      return p < 0.5 ? [16 * Math.pow(p, 5), 80 * Math.pow(p, 4)] : [1 - Math.pow(-2 * p + 2, 5) / 2, 80 * Math.pow(1 - p, 4)];
    case "io":
    default:
      return p < 0.5 ? [4 * p * p * p, 12 * p * p] : [1 - Math.pow(-2 * p + 2, 3) / 2, 12 * Math.pow(1 - p, 2)];
  }
}
function camAt(keys, frame) {
  let z = 1;
  let x = 0;
  let y = 0;
  let vz = 0;
  let vx = 0;
  let vy = 0;
  for (const k of keys || []) {
    if (frame < k.at) break;
    const d = Math.max(0, k.d);
    const p = d <= 0 ? 1 : Math.min(1, (frame - k.at) / d);
    const [e, de] = ease(k.e, p);
    const z0 = z;
    const x0 = x;
    const y0 = y;
    z = z0 + (k.z - z0) * e;
    x = x0 + (k.x - x0) * e;
    y = y0 + (k.y - y0) * e;
    if (d > 0 && p < 1) {
      vz = (k.z - z0) * de / d;
      vx = (k.x - x0) * de / d;
      vy = (k.y - y0) * de / d;
    } else {
      vz = 0;
      vx = 0;
      vy = 0;
    }
  }
  return { z, x, y, vz, vx, vy };
}
function camCss(c, W, H) {
  return "translate(" + (c.x / 100 * W).toFixed(2) + "px, " + (c.y / 100 * H).toFixed(2) + "px) scale(" + c.z.toFixed(5) + ")";
}
function camBlur(c, W, H) {
  const px = Math.abs(c.vx / 100 * W);
  const py = Math.abs(c.vy / 100 * H);
  const pz = Math.abs(c.vz) * Math.hypot(W, H) * 0.5;
  const sx = Math.min(12, 0.06 * Math.max(0, px - 30));
  const sy = Math.min(12, 0.06 * Math.max(0, py - 60));
  return { sx: sx < 0.6 ? 0 : sx, sy: sy < 0.6 ? 0 : sy };
}
function scalarAt(keys, frame, fallback) {
  const ks = keys || [];
  if (!ks.length) return fallback;
  if (frame <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i += 1) {
    const [f1, v1, e] = ks[i];
    const [f0, v0] = ks[i - 1];
    if (frame <= f1) {
      const p = f1 > f0 ? (frame - f0) / (f1 - f0) : 1;
      return v0 + (v1 - v0) * ease(e, p)[0];
    }
  }
  return ks[ks.length - 1][1];
}

// plugins/podcast-hook-captions/src/motion/grid.tsx
import React from "react";
var GRID = {
  // Unshaded cell colour as seen (texture mean included).
  bg: [36.8, 36.6, 38.2],
  // Neutral line colour (the lines' core), teal and pink tints mixed in by position.
  line: [130.5, 127.5, 131],
  teal: [92, 140, 134],
  pink: [132, 112, 122],
  pitch: 0.10152,
  // cell pitch / W (46.69 ref px)
  cx: 0.50167,
  // a line crossing (the lattice origin), fractions of W and H
  cy: 0.5125,
  px: 0.4996,
  // the zoom's fixed point, fractions of W and H
  py: 0.4984,
  lineAt1080: 5.5,
  // Dot texture: axis period / W, amplitude of each 45-degree grating (levels at 1080).
  texPeriod: 0.011287,
  texAmp: 7.3,
  // about 12% is lost to the export's H.264
  // Dust: dust frames per second, frames per loop, new specks per dust frame.
  dustFps: 20,
  dustLoop: 28,
  dustRate: 5.2,
  // candidates per dust frame over the whole frame; about 3.5 survive the height density
  dustSeed: 24081041
};
function zoomVelocity(keys, frame) {
  const z = (f2) => scalarAt(keys, f2, 1);
  const b = z(frame) - z(frame - 1);
  const f = z(frame + 1) - z(frame);
  const cut = (d) => Math.abs(d) > 0.45;
  if (cut(b) && cut(f)) return 0;
  if (cut(b)) return f;
  if (cut(f)) return b;
  return (b + f) / 2;
}
var SHADE = [
  [0.5, 1],
  [0.52, 0.985],
  [0.56, 0.978],
  [0.58, 0.962],
  [0.6, 0.935],
  [0.62, 0.875],
  [0.64, 0.8],
  [0.66, 0.745],
  [0.68, 0.715],
  [0.7, 0.655],
  [0.72, 0.625],
  [0.74, 0.6],
  [0.76, 0.545],
  [0.78, 0.515],
  [0.8, 0.49],
  [0.82, 0.44],
  [0.84, 0.405],
  [0.86, 0.37],
  [0.88, 0.3],
  [0.9, 0.27],
  [0.92, 0.235],
  [0.94, 0.18],
  [0.96, 0.14],
  [0.98, 0.11],
  [1, 0.075]
];
var TEX_FADE = [[0.6, 1], [0.655, 0.8], [0.71, 0.38], [0.77, 0.38], [0.85, 0.55], [1, 0.55]];
var finite = (v, fallback) => typeof v === "number" && Number.isFinite(v) ? v : fallback;
var clamp01 = (v) => Math.min(1, Math.max(0, v));
var smoothstep = (a, b, v) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
var CAP_TABLE = Array.from({ length: 41 }, (_, i) => Math.min(i / 40, 0.45).toFixed(4)).join(" ");
var frac = (v) => v - Math.floor(v);
var mod = (a, n2) => (a % n2 + n2) % n2;
var DOT = 0;
var HAIR = 1;
var SMUDGE = 2;
var FLAKE = 3;
function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t = t + 1831565813 >>> 0;
    let r = Math.imul(t ^ t >>> 15, 1 | t);
    r = r + Math.imul(r ^ r >>> 7, 61 | r) ^ r;
    return ((r ^ r >>> 14) >>> 0) / 4294967296;
  };
}
function poisson(rnd, mean) {
  const L = Math.exp(-mean);
  let k = 0;
  let p = rnd();
  while (p > L && k < 20) {
    k++;
    p *= rnd();
  }
  return k;
}
var HAIRS = [
  "M0 -0.5 C0.02 -0.1 0.04 0.22 -0.1 0.36 S-0.38 0.46 -0.45 0.3",
  "M-0.1 -0.5 C-0.06 -0.12 -0.08 0.1 0.02 0.17 C0.12 0.24 0.3 0.19 0.45 0.22",
  "M-0.4 -0.28 C-0.15 -0.31 0.15 -0.25 0.4 -0.3 M0.02 -0.28 C0 -0.05 0.05 0.15 0.01 0.35",
  "M-0.12 -0.45 Q0.3 0 -0.12 0.45",
  "M-0.5 0.1 C-0.2 -0.25 0.15 0.3 0.5 -0.05",
  "M0 -0.32 C0.16 -0.2 0.15 0.1 -0.06 0.3",
  "M-0.5 0.02 C-0.2 -0.02 0.2 0.03 0.5 -0.01"
];
var HAIR_PICK = [0.1, 0.2, 0.25, 0.45, 0.65, 0.8, 1];
var pick = (cum, u) => {
  let i = 0;
  while (i < cum.length - 1 && u > cum[i]) i++;
  return i;
};
var FLAKES = [
  [[-0.4, -0.3], [0.4, -0.28], [0.39, -0.09], [0.09, -0.09], [0.08, 0.26], [-0.09, 0.27], [-0.09, -0.1], [-0.4, -0.11]],
  [[-0.28, -0.4], [-0.1, -0.39], [-0.1, 0.18], [0.38, 0.17], [0.38, 0.36], [-0.29, 0.37]],
  [[-0.4, -0.1], [-0.08, -0.12], [0.4, -0.07], [0.39, 0.1], [-0.08, 0.08], [-0.4, 0.1]],
  [[-0.22, -0.13], [0.03, -0.2], [0.13, -0.17], [0.25, -0.02], [0.12, 0.05], [0.14, 0.17], [-0.1, 0.16], [-0.24, 0.06]],
  [[-0.26, -0.02], [-0.18, -0.16], [0, -0.18], [0.16, -0.12], [0.26, 0.02], [0.18, 0.14], [0.04, 0.08], [-0.08, 0.14], [-0.22, 0.1]],
  [[-0.24, -0.18], [0.24, -0.14], [0.04, 0.22], [-0.04, 0.06]]
];
var FLAKE_PICK = [0.25, 0.45, 0.8, 0.9, 0.97, 1];
function flakePath(rnd) {
  const u = rnd();
  let i = 0;
  while (i < FLAKE_PICK.length - 1 && u > FLAKE_PICK[i]) i++;
  const sx = i < 3 ? 0.85 + 0.3 * rnd() : 0.7 + 0.5 * rnd();
  const d = FLAKES[i].map(([x, y], j) => (j ? "L" : "M") + (x * sx + 0.07 * (rnd() - 0.5)).toFixed(3) + " " + (y + 0.07 * (rnd() - 0.5)).toFixed(3)).join(" ") + " Z";
  return { d, chunk: i >= 3 };
}
function dustDensity(y) {
  return y < 0.6 ? 1 : y < 0.8 ? 0.4 : y < 0.85 ? 0.1 : 0;
}
var dustCache = null;
function dustLoop() {
  if (dustCache) return dustCache;
  const rnd = mulberry32(GRID.dustSeed);
  const out = [];
  for (let b = 0; b < GRID.dustLoop; b++) {
    const n2 = poisson(rnd, GRID.dustRate);
    for (let i = 0; i < n2; i++) {
      const y = 5e-3 + 0.99 * rnd();
      if (rnd() >= dustDensity(y)) continue;
      const u = rnd();
      const kind = u < 0.74 ? DOT : u < 0.86 ? HAIR : u < 0.95 ? FLAKE : SMUDGE;
      const c = rnd();
      const cls = c < 0.3 ? 0 : c < 0.65 ? 1 : 2;
      const shape = rnd();
      const flake = kind === FLAKE ? flakePath(mulberry32(Math.floor(shape * 4294967296) ^ 625341585)) : null;
      let lv;
      let size;
      if (kind === DOT) {
        lv = cls === 0 ? 22 + 20 * rnd() : cls === 1 ? 70 + 60 * rnd() : 104 + 92 * rnd();
        size = [6, 7.5, 11.5][cls] + [2.5, 3, 3.5][cls] * rnd();
      } else if (kind === HAIR) {
        lv = 110 + 80 * rnd();
        size = 25 + 25 * rnd();
      } else if (kind === FLAKE) {
        lv = 140 + 55 * rnd();
        size = flake && flake.chunk ? 40 + 20 * rnd() : 35 + 25 * rnd();
      } else {
        lv = 100 + 50 * rnd();
        size = 16 + 14 * rnd();
      }
      const lr = rnd();
      const life = lr < 0.45 ? 1 : lr < 0.78 ? 2 : lr < 0.93 ? 3 : 4;
      const mark = {
        x: 0.01 + 0.98 * rnd(),
        y,
        kind,
        a: lv,
        s: size,
        rot: 360 * rnd(),
        d: kind === HAIR ? HAIRS[pick(HAIR_PICK, shape)] : flake ? flake.d : "",
        twin: kind === DOT && rnd() < 0.04 ? 1 : 0,
        // No dark fringes: the dark rims around the reference's specks come from its video compression, which
        // puts them on ours too. The draws stay so the rest of the loop keeps its measured layout.
        fringe: (kind === HAIR || kind === FLAKE ? rnd() < 0.5 : kind === DOT && cls > 0 && rnd() < (cls === 2 ? 0.3 : 0.15)) ? 0 * rnd() : 0
      };
      const marks = [mark];
      for (let k = 1; k < life; k++) {
        const prev = marks[k - 1];
        marks.push({ ...prev, a: prev.a * (0.6 + 0.4 * rnd()), s: prev.s * (0.9 + 0.2 * rnd()), x: prev.x + (rnd() - 0.5) * 2e-3, y: prev.y + (rnd() - 0.5) * 1e-3 });
      }
      out.push({ birth: b, life, keep: rnd() < 0.8, marks });
    }
  }
  dustCache = out;
  return out;
}
function dustFrame(frame, fps) {
  return Math.floor(frame * GRID.dustFps / fps + 1e-6);
}
function dustAt(frame, fps) {
  const df = dustFrame(frame, fps);
  const di = mod(df, GRID.dustLoop);
  const out = [];
  dustLoop().forEach((sp, id) => {
    if (!sp || !sp.marks) return;
    const age = mod(di - sp.birth, GRID.dustLoop);
    if (age >= sp.life) return;
    const m = sp.marks[age];
    if (!m) return;
    const pass = Math.floor((df - age) / GRID.dustLoop);
    const flip = !sp.keep && mod(pass, 2) === 1;
    let fx = m.x;
    let fy = m.y;
    if (!sp.keep && pass !== 0) {
      fx = frac((flip ? 1 - fx : fx) + frac(pass * 0.618034));
      fy = frac(fy + frac(pass * 0.754878));
      const h = Math.sin(id * 12.9898 + pass * 78.233) * 43758.5453;
      if (h - Math.floor(h) >= dustDensity(fy)) return;
    }
    out.push({ ...m, id, fx, fy, flip });
  });
  return out;
}
function Dust({ W, H, frame, fps, uid }) {
  const k = W / 1080;
  const els = [];
  dustAt(frame, fps).forEach((m) => {
    const i = m.id;
    const flip = m.flip;
    const x = m.fx * W;
    const y = m.fy * H;
    const op = Math.min(1, m.a / 217);
    const rot = flip ? 180 - m.rot : m.rot;
    const ang = rot * Math.PI / 180;
    const sx = flip ? -1 : 1;
    if (m.kind === DOT) {
      const r = m.s * k / 2.355 * 2.6;
      els.push(/* @__PURE__ */ React.createElement("circle", { key: i, cx: x, cy: y, r, fill: "url(#dd" + uid + ")", opacity: op }));
      if (m.twin) els.push(/* @__PURE__ */ React.createElement("circle", { key: i + "t", cx: x + 10 * k * Math.cos(ang), cy: y + 10 * k * Math.sin(ang), r: r * 0.85, fill: "url(#dd" + uid + ")", opacity: op * 0.8 }));
      if (m.fringe) els.push(/* @__PURE__ */ React.createElement("circle", { key: i + "f", cx: x + 0.7 * r * Math.cos(ang), cy: y + 0.7 * r * Math.sin(ang), r: r * 0.45, fill: "url(#dk" + uid + ")", opacity: Math.min(1, m.fringe / 38) }));
    } else if (m.kind === HAIR) {
      const s = m.s * k;
      const st = m.d.slice(1).split(" ").slice(0, 2).map(Number);
      const tf = "translate(" + x.toFixed(1) + " " + y.toFixed(1) + ") rotate(" + rot.toFixed(1) + ") scale(" + (sx * s).toFixed(2) + " " + s.toFixed(2) + ")";
      els.push(
        /* @__PURE__ */ React.createElement("g", { key: i, transform: tf, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("path", { d: m.d, stroke: "#fff", strokeWidth: 9 * k / s, opacity: op * 0.22 }), /* @__PURE__ */ React.createElement("path", { d: m.d, stroke: "#fff", strokeWidth: 6 * k / s, opacity: op }), m.fringe ? /* @__PURE__ */ React.createElement("circle", { cx: st[0] * 1.15, cy: st[1] * 1.15, r: 5 * k / s, fill: "url(#dk" + uid + ")", opacity: Math.min(1, m.fringe / 38) }) : null)
      );
    } else if (m.kind === FLAKE) {
      const s = m.s * k;
      const tf = "translate(" + x.toFixed(1) + " " + y.toFixed(1) + ") rotate(" + rot.toFixed(1) + ") scale(" + (sx * s).toFixed(2) + " " + s.toFixed(2) + ")";
      const off = 3.5 * k / s;
      els.push(
        /* @__PURE__ */ React.createElement("g", { key: i, filter: "url(#fb" + uid + ")" }, m.fringe ? /* @__PURE__ */ React.createElement("g", { transform: tf }, /* @__PURE__ */ React.createElement("path", { d: m.d, transform: "translate(" + (off * 0.6).toFixed(4) + " " + off.toFixed(4) + ")", fill: "#000", opacity: Math.min(1, m.fringe / 38) })) : null, /* @__PURE__ */ React.createElement("g", { transform: tf }, /* @__PURE__ */ React.createElement("path", { d: m.d, fill: "#fff", opacity: op })))
      );
    } else {
      const s = m.s * k;
      const c = Math.cos(ang);
      const sn = Math.sin(ang);
      [
        [0, 0, 0.42],
        [0.3, 0.12, 0.3],
        [-0.22, -0.2, 0.26]
      ].forEach(
        ([dx, dy, rr], j) => els.push(/* @__PURE__ */ React.createElement("circle", { key: i + "s" + j, cx: x + s * (sx * dx * c - dy * sn), cy: y + s * (sx * dx * sn + dy * c), r: s * rr, fill: "url(#ds" + uid + ")", opacity: op }))
      );
    }
  });
  return /* @__PURE__ */ React.createElement(React.Fragment, null, els);
}
var rgb = (c, sub) => "rgb(" + c.map((v) => Math.max(0, v - sub).toFixed(1)).join(",") + ")";
function grating(angle, phase, period, amp) {
  const n2 = 8;
  const ph = mod(phase, period);
  const stops = [];
  for (let i = 0; i <= n2; i++) {
    const v = amp * (1 + Math.cos(2 * Math.PI * (i / n2 - 0.5)));
    stops.push("rgb(" + v.toFixed(2) + "," + v.toFixed(2) + "," + v.toFixed(2) + ") " + (ph - period / 2 + i * period / n2).toFixed(3) + "px");
  }
  return "repeating-linear-gradient(" + angle + "deg, " + stops.join(", ") + ")";
}
var lineVar = (i) => {
  const h = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return 1 + 0.18 * (h - Math.floor(h) - 0.5);
};
var gradY = (stops, col) => "linear-gradient(to bottom, " + stops.map(([t, v]) => col(v) + " " + (t * 100).toFixed(1) + "%").join(", ") + ")";
function rasterTexture(r) {
  const t = clamp01((r - 0.22) / 0.1);
  return t * t * (3 - 2 * t);
}
function GridSet(props) {
  const W = Math.max(1, finite(props.W, 1080));
  const H = Math.max(1, finite(props.H, 1920));
  const zin = finite(props.zoom, 1);
  const z = Math.max(0.05, zin);
  const vel = finite(props.zoomVel, 0);
  const smear = Math.abs(vel) > 0.015;
  const nExp = smear ? Math.min(32, Math.max(5, Math.ceil(0.5 * Math.abs(vel) * 0.5 * Math.max(W, H) / (GRID.lineAt1080 * (W / 1080))) + 1)) : 1;
  const zs = smear ? Array.from({ length: nExp }, (_, i) => Math.max(0.05, z + (i / (nExp - 1) - 0.5) * 0.5 * vel)) : [z];
  const zMin = Math.min(...zs);
  const fpsIn = finite(props.fps, 30);
  const fps = fpsIn > 0 ? fpsIn : 30;
  const frame = finite(props.frame, 0);
  const uid = String(props.uid ?? "0").replace(/[^a-zA-Z0-9_-]/g, "");
  const texK = clamp01(finite(props.texture, 1)) * rasterTexture(finite(props.rasterScale, 1));
  const k = W / 1080;
  const pitch = GRID.pitch * W;
  const lw = GRID.lineAt1080 * k;
  const ox = GRID.cx * W;
  const oy = GRID.cy * H;
  const pvx = GRID.px * W;
  const pvy = GRID.py * H;
  const amp = GRID.texAmp * texK;
  const showTex = amp > 0.01;
  const tex = showTex ? 2 * amp : 0;
  const full = { position: "absolute", left: 0, top: 0, width: W, height: H };
  const x0 = pvx - pvx / zMin;
  const x1 = pvx + (W - pvx) / zMin;
  const y0 = pvy - pvy / zMin;
  const y1 = pvy + (H - pvy) / zMin;
  const rects = [];
  for (let i = Math.floor((x0 - ox) / pitch) - 1; i <= Math.ceil((x1 - ox) / pitch) + 1; i++) {
    const w = lw * lineVar(i);
    rects.push([ox + i * pitch - w / 2, y0 - lw, w, y1 - y0 + 2 * lw]);
  }
  for (let j = Math.floor((y0 - oy) / pitch) - 1; j <= Math.ceil((y1 - oy) / pitch) + 1; j++) {
    const w = lw * lineVar(j + 101);
    rects.push([x0 - lw, oy + j * pitch - w / 2, x1 - x0 + 2 * lw, w]);
  }
  const ztOf = (zz) => "translate(" + pvx.toFixed(3) + " " + pvy.toFixed(3) + ") scale(" + zz.toFixed(6) + ") translate(" + (-pvx).toFixed(3) + " " + (-pvy).toFixed(3) + ")";
  const exposures = (key, body, gain = 1, cap = false) => smear ? /* @__PURE__ */ React.createElement("g", { style: { isolation: "isolate" }, filter: cap ? "url(#sc" + uid + ")" : void 0 }, zs.map((zz, n2) => /* @__PURE__ */ React.createElement("g", { key: key + n2, transform: ztOf(zz), opacity: Math.min(1, gain / zs.length), style: { mixBlendMode: "plus-lighter" } }, body))) : /* @__PURE__ */ React.createElement("g", { transform: ztOf(z) }, body);
  const P = GRID.texPeriod * W;
  const bx = 0.48 * k;
  const by = -0.51 * k;
  const fadeMask = gradY(TEX_FADE, (a) => "rgba(0,0,0," + a.toFixed(3) + ")");
  const fadeFill = gradY(TEX_FADE, (a) => {
    const v = (tex * (1 - a)).toFixed(2);
    return "rgb(" + v + "," + v + "," + v + ")";
  });
  const shade = gradY(SHADE, (m) => "rgba(0,0,0," + (1 - m).toFixed(3) + ")");
  const bgTint = "linear-gradient(to bottom, rgba(255,255,255,0.009), rgba(255,255,255,0) 14%), radial-gradient(ellipse " + (0.4 * W).toFixed(0) + "px " + (0.12 * H).toFixed(0) + "px at 0px 0px, rgba(255,255,255,0.008), rgba(255,255,255,0)), radial-gradient(ellipse " + (0.45 * W).toFixed(0) + "px " + (0.22 * H).toFixed(0) + "px at " + W + "px 0px, rgba(0,0,0,0.13), rgba(0,0,0,0))";
  const tint = (o, a) => /* @__PURE__ */ React.createElement("stop", { key: o, offset: o, stopColor: "#fff", stopOpacity: a });
  const lattice = rects.map(([x, y, w, h], j) => /* @__PURE__ */ React.createElement("rect", { key: j, x: x.toFixed(3), y: y.toFixed(3), width: w.toFixed(3), height: h.toFixed(3) }));
  const region = { x: x0 - 2 * lw, y: y0 - 2 * lw, width: x1 - x0 + 4 * lw, height: y1 - y0 + 4 * lw };
  return /* @__PURE__ */ React.createElement("div", { style: { ...full, overflow: "hidden", isolation: "isolate", backgroundColor: rgb(GRID.bg, tex), backgroundImage: bgTint } }, /* @__PURE__ */ React.createElement("svg", { width: W, height: H, style: { position: "absolute", left: 0, top: 0 } }, /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("radialGradient", { id: "at" + uid, gradientUnits: "userSpaceOnUse", cx: 0, cy: 0, r: W, gradientTransform: "translate(0 " + (0.2 * H).toFixed(1) + ") scale(1 " + (0.45 * H / W).toFixed(4) + ")" }, [[0, 0.9], [0.3, 0.8], [0.52, 0.52], [0.7, 0.25], [0.85, 0.07], [1, 0]].map(([o, a]) => tint(o, a))), /* @__PURE__ */ React.createElement("radialGradient", { id: "ap" + uid, gradientUnits: "userSpaceOnUse", cx: W, cy: 0, r: 0.3 * W, gradientTransform: "translate(0 " + (0.42 * H).toFixed(1) + ") scale(1 " + (0.2 * H / (0.3 * W)).toFixed(4) + ")" }, [[0, 0.6], [1, 0]].map(([o, a]) => tint(o, a))), /* @__PURE__ */ React.createElement("mask", { id: "mt" + uid, maskUnits: "userSpaceOnUse", ...region }, /* @__PURE__ */ React.createElement("rect", { ...region, fill: "url(#at" + uid + ")" })), /* @__PURE__ */ React.createElement("mask", { id: "mp" + uid, maskUnits: "userSpaceOnUse", ...region }, /* @__PURE__ */ React.createElement("rect", { ...region, fill: "url(#ap" + uid + ")" })), /* @__PURE__ */ React.createElement("filter", { id: "sc" + uid, filterUnits: "userSpaceOnUse", x: 0, y: 0, width: W, height: H, colorInterpolationFilters: "sRGB" }, /* @__PURE__ */ React.createElement("feComponentTransfer", null, /* @__PURE__ */ React.createElement("feFuncR", { type: "table", tableValues: CAP_TABLE }), /* @__PURE__ */ React.createElement("feFuncG", { type: "table", tableValues: CAP_TABLE }), /* @__PURE__ */ React.createElement("feFuncB", { type: "table", tableValues: CAP_TABLE }))), /* @__PURE__ */ React.createElement("mask", { id: "ml" + uid, maskUnits: "userSpaceOnUse", ...region }, /* @__PURE__ */ React.createElement("g", { fill: "#fff" }, lattice))), exposures(
    "l",
    /* @__PURE__ */ React.createElement("g", { mask: "url(#ml" + uid + ")" }, /* @__PURE__ */ React.createElement("rect", { ...region, fill: rgb(GRID.line, tex) }), /* @__PURE__ */ React.createElement("rect", { ...region, fill: rgb(GRID.teal, tex), mask: "url(#mt" + uid + ")" }), /* @__PURE__ */ React.createElement("rect", { ...region, fill: rgb(GRID.pink, tex), mask: "url(#mp" + uid + ")" })),
    1 + 0.8 * smoothstep(0.08, 0.15, Math.abs(vel)),
    true
  )), showTex ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { ...full, isolation: "isolate", mixBlendMode: "plus-lighter", maskImage: fadeMask, WebkitMaskImage: fadeMask } }, /* @__PURE__ */ React.createElement("div", { style: { ...full, backgroundImage: grating(135, (bx + by) / Math.SQRT2, P / Math.SQRT2, amp) } }), /* @__PURE__ */ React.createElement("div", { style: { ...full, backgroundImage: grating(45, (bx - by + H) / Math.SQRT2, P / Math.SQRT2, amp), mixBlendMode: "plus-lighter" } })), /* @__PURE__ */ React.createElement("div", { style: { ...full, backgroundImage: fadeFill, mixBlendMode: "plus-lighter" } })) : null, /* @__PURE__ */ React.createElement("svg", { width: W, height: H, style: { position: "absolute", left: 0, top: 0 } }, /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("radialGradient", { id: "dd" + uid }, [[0, 1], [0.1, 0.981], [0.2, 0.857], [0.28, 0.655], [0.36, 0.407], [0.44, 0.193], [0.52, 0.066], [0.6, 0.016], [0.7, 1e-3], [1, 0]].map(([o, a]) => /* @__PURE__ */ React.createElement("stop", { key: o, offset: o, stopColor: "#fff", stopOpacity: a }))), /* @__PURE__ */ React.createElement("radialGradient", { id: "ds" + uid }, [[0, 1], [0.4, 0.75], [0.75, 0.3], [1, 0]].map(([o, a]) => /* @__PURE__ */ React.createElement("stop", { key: o, offset: o, stopColor: "#fff", stopOpacity: a }))), /* @__PURE__ */ React.createElement("radialGradient", { id: "dk" + uid }, /* @__PURE__ */ React.createElement("stop", { offset: "0", stopColor: "#000", stopOpacity: 1 }), /* @__PURE__ */ React.createElement("stop", { offset: "1", stopColor: "#000", stopOpacity: 0 })), /* @__PURE__ */ React.createElement("filter", { id: "fb" + uid, x: "-50%", y: "-50%", width: "200%", height: "200%" }, /* @__PURE__ */ React.createElement("feGaussianBlur", { stdDeviation: (1.5 * k).toFixed(3) }))), exposures("d", /* @__PURE__ */ React.createElement(Dust, { W, H, frame, fps, uid }))), /* @__PURE__ */ React.createElement("div", { style: { ...full, backgroundImage: shade } }));
}

// plugins/podcast-hook-captions/src/motion/grade.tsx
import React2 from "react";
var SPEAKER_GRADE = { sat: 1.6, r: 1.07, g: 1, b: 0.89, slope: 1.1, off: -0.035 };
var BROLL_GRADE = { sat: 1.2, r: 1.06, g: 1, b: 0.9, slope: 1.08, off: -0.02 };
function matrix(g) {
  const s = g.sat;
  const lr = 0.2126;
  const lg = 0.7152;
  const lb = 0.0722;
  const rows = [
    [lr + (1 - lr) * s, lg - lg * s, lb - lb * s],
    [lr - lr * s, lg + (1 - lg) * s, lb - lb * s],
    [lr - lr * s, lg - lg * s, lb + (1 - lb) * s]
  ];
  const gain = [g.r, g.g, g.b];
  return rows.map((row, i) => row.map((v) => (v * gain[i]).toFixed(4)).join(" ") + " 0 0").concat(["0 0 0 1 0"]).join(" ");
}
function GradeFilter({ id, grade }) {
  return /* @__PURE__ */ React2.createElement("filter", { id, x: "0%", y: "0%", width: "100%", height: "100%", colorInterpolationFilters: "sRGB" }, /* @__PURE__ */ React2.createElement("feColorMatrix", { type: "matrix", values: matrix(grade) }), /* @__PURE__ */ React2.createElement("feComponentTransfer", null, /* @__PURE__ */ React2.createElement("feFuncR", { type: "linear", slope: grade.slope, intercept: grade.off }), /* @__PURE__ */ React2.createElement("feFuncG", { type: "linear", slope: grade.slope, intercept: grade.off }), /* @__PURE__ */ React2.createElement("feFuncB", { type: "linear", slope: grade.slope, intercept: grade.off })));
}

// plugins/podcast-hook-captions/src/motion/Look.tsx
var n = (v, f) => typeof v === "number" && Number.isFinite(v) ? v : f;
function ReelLook({ Source, data = {} }) {
  const local = useCurrentFrame();
  const W = n(data.W, 1080);
  const H = n(data.H, 1920);
  const sw = n(data.sw, 1920);
  const sh = n(data.sh, 1080);
  const fps = n(data.fps, 30);
  const f = local + n(data.start, 0);
  const uid = String(data.uid || "0").replace(/[^a-zA-Z0-9_-]/g, "");
  const toFrame = {
    position: "absolute",
    left: 0,
    top: 0,
    width: W,
    height: H,
    transformOrigin: "0 0",
    transform: "scale(" + (sw / W).toFixed(6) + ", " + (sh / H).toFixed(6) + ")",
    overflow: "hidden"
  };
  const mode = data.mode === "card" ? "card" : "main";
  const grade = data.grade || (mode === "card" ? BROLL_GRADE : SPEAKER_GRADE);
  if (mode === "main") {
    const shots = Array.isArray(data.shots) ? data.shots : [];
    const shot = shots.find((s) => f >= s.from && f < s.to) || shots[shots.length - 1] || { from: 0, to: 1e9, x: 0, y: (H - W * sh / sw) / 2, w: W, h: W * sh / sw };
    let cam = camAt(data.camera, f);
    const free = Array.isArray(data.free) && data.free.some((r) => f >= r[0] && f < r[1]);
    if (!free) {
      const z = Math.max(cam.z, W / shot.w, H / shot.h);
      const lo = (a, size, frame) => frame / 2 - z * (a + size - frame / 2);
      const hi = (a, frame) => -frame / 2 - z * (a - frame / 2);
      const tx = Math.min(hi(shot.x, W), Math.max(lo(shot.x, shot.w, W), cam.x / 100 * W));
      const ty = Math.min(hi(shot.y, H), Math.max(lo(shot.y, shot.h, H), cam.y / 100 * H));
      cam = { ...cam, z, x: tx / W * 100, y: ty / H * 100 };
    }
    const blur = free ? { sx: 0, sy: 0 } : camBlur(cam, W, H);
    const filters = ["url(#grade" + uid + ")"];
    if (blur.sx || blur.sy) filters.push("url(#mb" + uid + ")");
    return /* @__PURE__ */ React3.createElement("div", { style: { position: "absolute", inset: 0, overflow: "hidden", backgroundColor: "#000" } }, /* @__PURE__ */ React3.createElement("svg", { width: "0", height: "0", style: { position: "absolute" } }, /* @__PURE__ */ React3.createElement("defs", null, /* @__PURE__ */ React3.createElement(GradeFilter, { id: "grade" + uid, grade }), /* @__PURE__ */ React3.createElement("filter", { id: "mb" + uid, x: "-20%", y: "-20%", width: "140%", height: "140%" }, /* @__PURE__ */ React3.createElement("feGaussianBlur", { stdDeviation: blur.sx.toFixed(2) + " " + blur.sy.toFixed(2) })))), /* @__PURE__ */ React3.createElement("div", { style: toFrame }, /* @__PURE__ */ React3.createElement("div", { style: { position: "absolute", left: 0, top: 0, width: W, height: H, transformOrigin: "50% 50%", transform: camCss(cam, W, H), filter: filters.join(" ") } }, /* @__PURE__ */ React3.createElement("div", { style: { position: "absolute", left: shot.x, top: shot.y, width: shot.w, height: shot.h } }, /* @__PURE__ */ React3.createElement(Source, null)))));
  }
  const kind = String(data.kind || "portrait");
  const dur = Math.max(1, n(data.dur, 60));
  const F = (x) => Math.max(1, Math.round(x * fps / 30));
  const t = local;
  const srcAspect = sw / sh;
  const gridZoom = scalarAt(data.gridZoom, f, 1);
  const cardBox = (cw, ch) => {
    const k = Math.max(cw / sw, ch / sh);
    return { w: sw * k, h: sh * k, x: (cw - sw * k) / 2, y: (ch - sh * k) / 2 };
  };
  const easeOut = (p) => 1 - Math.pow(1 - Math.max(0, Math.min(1, p)), 3);
  const card = (cw, ch, key, extra) => {
    const box = cardBox(cw, ch);
    const push = 1 + 0.08 * Math.min(1, t / dur);
    return /* @__PURE__ */ React3.createElement(
      "div",
      {
        key,
        style: {
          position: "absolute",
          width: cw,
          height: ch,
          borderRadius: 0.035 * cw,
          overflow: "hidden",
          boxShadow: "0 " + 0.02 * H + "px " + 0.05 * H + "px rgba(0,0,0,0.55)",
          ...extra
        }
      },
      /* @__PURE__ */ React3.createElement("div", { style: { position: "absolute", left: box.x, top: box.y, width: box.w, height: box.h, transform: "scale(" + push.toFixed(4) + ")", transformOrigin: "50% 50%", filter: "url(#grade" + uid + ")" } }, /* @__PURE__ */ React3.createElement(Source, null))
    );
  };
  let content;
  if (kind === "landscape") {
    const ch = 0.33 * H;
    const cw = ch * Math.max(1.2, srcAspect > 1 ? srcAspect : 16 / 9);
    const gap = 0.028 * W;
    const drift = -0.12 * W + 0.3 * W * Math.min(1, t / dur);
    const cy = 0.37 * H;
    content = /* @__PURE__ */ React3.createElement("div", { style: { position: "absolute", left: 0, top: 0, width: W, height: H, transform: "rotate(-3deg)", transformOrigin: "50% " + cy / H * 100 + "%" } }, card(cw, ch, "a", { left: (W - cw) / 2 + drift, top: cy - ch / 2 }), data.strip !== false ? card(cw, ch, "b", { left: (W - cw) / 2 + drift - cw - gap, top: cy - ch / 2 }) : null);
  } else {
    const cw = 0.7 * W;
    const ch = cw * 16 / 9;
    const sway = 1.1 * Math.sin(2 * Math.PI * t / (2.8 * fps));
    const bob = 4e-3 * H * Math.sin(2 * Math.PI * t / (3.4 * fps));
    let scale = 1;
    let dx = 0;
    if (kind === "portrait2") dx = -0.3 * W * (1 - easeOut(t / F(5)));
    else scale = 1.3 - 0.3 * easeOut(t / F(9));
    content = card(cw, ch, "p", {
      left: (W - cw) / 2 + dx,
      top: 0.075 * H + bob,
      transform: "rotate(" + sway.toFixed(3) + "deg) scale(" + scale.toFixed(4) + ")",
      transformOrigin: "50% 40%"
    });
  }
  return /* @__PURE__ */ React3.createElement("div", { style: { position: "absolute", inset: 0, overflow: "hidden", backgroundColor: "#000" } }, /* @__PURE__ */ React3.createElement("svg", { width: "0", height: "0", style: { position: "absolute" } }, /* @__PURE__ */ React3.createElement("defs", null, /* @__PURE__ */ React3.createElement(GradeFilter, { id: "grade" + uid, grade }))), /* @__PURE__ */ React3.createElement("div", { style: toFrame }, /* @__PURE__ */ React3.createElement(
    GridSet,
    {
      W,
      H,
      zoom: gridZoom,
      uid,
      frame: f,
      fps,
      zoomVel: zoomVelocity(data.gridZoom, f),
      rasterScale: Math.min(sw / W, sh / H)
    }
  ), content));
}
export {
  ReelLook as default
};
`;
var reelCode = `// plugins/podcast-hook-captions/src/motion/Reel.tsx
import React2, { useEffect, useState } from "react";
import { useCurrentFrame, delayRender, continueRender } from "remotion";

// plugins/podcast-hook-captions/src/motion/camera.ts
function ease(kind, p) {
  switch (kind) {
    case "lin":
      return [p, 1];
    case "o":
      return [1 - Math.pow(1 - p, 3), 3 * Math.pow(1 - p, 2)];
    case "i":
      return [p * p * p, 3 * p * p];
    case "whip":
      return p < 0.5 ? [16 * Math.pow(p, 5), 80 * Math.pow(p, 4)] : [1 - Math.pow(-2 * p + 2, 5) / 2, 80 * Math.pow(1 - p, 4)];
    case "io":
    default:
      return p < 0.5 ? [4 * p * p * p, 12 * p * p] : [1 - Math.pow(-2 * p + 2, 3) / 2, 12 * Math.pow(1 - p, 2)];
  }
}
function camAt(keys, frame) {
  let z = 1;
  let x = 0;
  let y = 0;
  let vz = 0;
  let vx = 0;
  let vy = 0;
  for (const k of keys || []) {
    if (frame < k.at) break;
    const d = Math.max(0, k.d);
    const p = d <= 0 ? 1 : Math.min(1, (frame - k.at) / d);
    const [e, de] = ease(k.e, p);
    const z0 = z;
    const x0 = x;
    const y0 = y;
    z = z0 + (k.z - z0) * e;
    x = x0 + (k.x - x0) * e;
    y = y0 + (k.y - y0) * e;
    if (d > 0 && p < 1) {
      vz = (k.z - z0) * de / d;
      vx = (k.x - x0) * de / d;
      vy = (k.y - y0) * de / d;
    } else {
      vz = 0;
      vx = 0;
      vy = 0;
    }
  }
  return { z, x, y, vz, vx, vy };
}
function pinCss(a, b, W, H) {
  const r = b.z / a.z;
  const tx = b.x / 100 * W - r * (a.x / 100 * W);
  const ty = b.y / 100 * H - r * (a.y / 100 * H);
  return "translate(" + tx.toFixed(2) + "px, " + ty.toFixed(2) + "px) scale(" + r.toFixed(5) + ")";
}
function scalarAt(keys, frame, fallback) {
  const ks = keys || [];
  if (!ks.length) return fallback;
  if (frame <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i += 1) {
    const [f1, v1, e] = ks[i];
    const [f0, v0] = ks[i - 1];
    if (frame <= f1) {
      const p = f1 > f0 ? (frame - f0) / (f1 - f0) : 1;
      return v0 + (v1 - v0) * ease(e, p)[0];
    }
  }
  return ks[ks.length - 1][1];
}

// plugins/podcast-hook-captions/src/motion/grid.tsx
import React from "react";
var GRID = {
  // Unshaded cell colour as seen (texture mean included).
  bg: [36.8, 36.6, 38.2],
  // Neutral line colour (the lines' core), teal and pink tints mixed in by position.
  line: [130.5, 127.5, 131],
  teal: [92, 140, 134],
  pink: [132, 112, 122],
  pitch: 0.10152,
  // cell pitch / W (46.69 ref px)
  cx: 0.50167,
  // a line crossing (the lattice origin), fractions of W and H
  cy: 0.5125,
  px: 0.4996,
  // the zoom's fixed point, fractions of W and H
  py: 0.4984,
  lineAt1080: 5.5,
  // Dot texture: axis period / W, amplitude of each 45-degree grating (levels at 1080).
  texPeriod: 0.011287,
  texAmp: 7.3,
  // about 12% is lost to the export's H.264
  // Dust: dust frames per second, frames per loop, new specks per dust frame.
  dustFps: 20,
  dustLoop: 28,
  dustRate: 5.2,
  // candidates per dust frame over the whole frame; about 3.5 survive the height density
  dustSeed: 24081041
};
function zoomVelocity(keys, frame) {
  const z = (f2) => scalarAt(keys, f2, 1);
  const b = z(frame) - z(frame - 1);
  const f = z(frame + 1) - z(frame);
  const cut = (d) => Math.abs(d) > 0.45;
  if (cut(b) && cut(f)) return 0;
  if (cut(b)) return f;
  if (cut(f)) return b;
  return (b + f) / 2;
}
var SHADE = [
  [0.5, 1],
  [0.52, 0.985],
  [0.56, 0.978],
  [0.58, 0.962],
  [0.6, 0.935],
  [0.62, 0.875],
  [0.64, 0.8],
  [0.66, 0.745],
  [0.68, 0.715],
  [0.7, 0.655],
  [0.72, 0.625],
  [0.74, 0.6],
  [0.76, 0.545],
  [0.78, 0.515],
  [0.8, 0.49],
  [0.82, 0.44],
  [0.84, 0.405],
  [0.86, 0.37],
  [0.88, 0.3],
  [0.9, 0.27],
  [0.92, 0.235],
  [0.94, 0.18],
  [0.96, 0.14],
  [0.98, 0.11],
  [1, 0.075]
];
var TEX_FADE = [[0.6, 1], [0.655, 0.8], [0.71, 0.38], [0.77, 0.38], [0.85, 0.55], [1, 0.55]];
var finite = (v, fallback) => typeof v === "number" && Number.isFinite(v) ? v : fallback;
var clamp01 = (v) => Math.min(1, Math.max(0, v));
var smoothstep = (a, b, v) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
var CAP_TABLE = Array.from({ length: 41 }, (_, i) => Math.min(i / 40, 0.45).toFixed(4)).join(" ");
var frac = (v) => v - Math.floor(v);
var mod = (a, n2) => (a % n2 + n2) % n2;
var DOT = 0;
var HAIR = 1;
var SMUDGE = 2;
var FLAKE = 3;
function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t = t + 1831565813 >>> 0;
    let r = Math.imul(t ^ t >>> 15, 1 | t);
    r = r + Math.imul(r ^ r >>> 7, 61 | r) ^ r;
    return ((r ^ r >>> 14) >>> 0) / 4294967296;
  };
}
function poisson(rnd, mean) {
  const L = Math.exp(-mean);
  let k = 0;
  let p = rnd();
  while (p > L && k < 20) {
    k++;
    p *= rnd();
  }
  return k;
}
var HAIRS = [
  "M0 -0.5 C0.02 -0.1 0.04 0.22 -0.1 0.36 S-0.38 0.46 -0.45 0.3",
  "M-0.1 -0.5 C-0.06 -0.12 -0.08 0.1 0.02 0.17 C0.12 0.24 0.3 0.19 0.45 0.22",
  "M-0.4 -0.28 C-0.15 -0.31 0.15 -0.25 0.4 -0.3 M0.02 -0.28 C0 -0.05 0.05 0.15 0.01 0.35",
  "M-0.12 -0.45 Q0.3 0 -0.12 0.45",
  "M-0.5 0.1 C-0.2 -0.25 0.15 0.3 0.5 -0.05",
  "M0 -0.32 C0.16 -0.2 0.15 0.1 -0.06 0.3",
  "M-0.5 0.02 C-0.2 -0.02 0.2 0.03 0.5 -0.01"
];
var HAIR_PICK = [0.1, 0.2, 0.25, 0.45, 0.65, 0.8, 1];
var pick = (cum, u) => {
  let i = 0;
  while (i < cum.length - 1 && u > cum[i]) i++;
  return i;
};
var FLAKES = [
  [[-0.4, -0.3], [0.4, -0.28], [0.39, -0.09], [0.09, -0.09], [0.08, 0.26], [-0.09, 0.27], [-0.09, -0.1], [-0.4, -0.11]],
  [[-0.28, -0.4], [-0.1, -0.39], [-0.1, 0.18], [0.38, 0.17], [0.38, 0.36], [-0.29, 0.37]],
  [[-0.4, -0.1], [-0.08, -0.12], [0.4, -0.07], [0.39, 0.1], [-0.08, 0.08], [-0.4, 0.1]],
  [[-0.22, -0.13], [0.03, -0.2], [0.13, -0.17], [0.25, -0.02], [0.12, 0.05], [0.14, 0.17], [-0.1, 0.16], [-0.24, 0.06]],
  [[-0.26, -0.02], [-0.18, -0.16], [0, -0.18], [0.16, -0.12], [0.26, 0.02], [0.18, 0.14], [0.04, 0.08], [-0.08, 0.14], [-0.22, 0.1]],
  [[-0.24, -0.18], [0.24, -0.14], [0.04, 0.22], [-0.04, 0.06]]
];
var FLAKE_PICK = [0.25, 0.45, 0.8, 0.9, 0.97, 1];
function flakePath(rnd) {
  const u = rnd();
  let i = 0;
  while (i < FLAKE_PICK.length - 1 && u > FLAKE_PICK[i]) i++;
  const sx = i < 3 ? 0.85 + 0.3 * rnd() : 0.7 + 0.5 * rnd();
  const d = FLAKES[i].map(([x, y], j) => (j ? "L" : "M") + (x * sx + 0.07 * (rnd() - 0.5)).toFixed(3) + " " + (y + 0.07 * (rnd() - 0.5)).toFixed(3)).join(" ") + " Z";
  return { d, chunk: i >= 3 };
}
function dustDensity(y) {
  return y < 0.6 ? 1 : y < 0.8 ? 0.4 : y < 0.85 ? 0.1 : 0;
}
var dustCache = null;
function dustLoop() {
  if (dustCache) return dustCache;
  const rnd = mulberry32(GRID.dustSeed);
  const out = [];
  for (let b = 0; b < GRID.dustLoop; b++) {
    const n2 = poisson(rnd, GRID.dustRate);
    for (let i = 0; i < n2; i++) {
      const y = 5e-3 + 0.99 * rnd();
      if (rnd() >= dustDensity(y)) continue;
      const u = rnd();
      const kind = u < 0.74 ? DOT : u < 0.86 ? HAIR : u < 0.95 ? FLAKE : SMUDGE;
      const c = rnd();
      const cls = c < 0.3 ? 0 : c < 0.65 ? 1 : 2;
      const shape = rnd();
      const flake = kind === FLAKE ? flakePath(mulberry32(Math.floor(shape * 4294967296) ^ 625341585)) : null;
      let lv;
      let size;
      if (kind === DOT) {
        lv = cls === 0 ? 22 + 20 * rnd() : cls === 1 ? 70 + 60 * rnd() : 104 + 92 * rnd();
        size = [6, 7.5, 11.5][cls] + [2.5, 3, 3.5][cls] * rnd();
      } else if (kind === HAIR) {
        lv = 110 + 80 * rnd();
        size = 25 + 25 * rnd();
      } else if (kind === FLAKE) {
        lv = 140 + 55 * rnd();
        size = flake && flake.chunk ? 40 + 20 * rnd() : 35 + 25 * rnd();
      } else {
        lv = 100 + 50 * rnd();
        size = 16 + 14 * rnd();
      }
      const lr = rnd();
      const life = lr < 0.45 ? 1 : lr < 0.78 ? 2 : lr < 0.93 ? 3 : 4;
      const mark = {
        x: 0.01 + 0.98 * rnd(),
        y,
        kind,
        a: lv,
        s: size,
        rot: 360 * rnd(),
        d: kind === HAIR ? HAIRS[pick(HAIR_PICK, shape)] : flake ? flake.d : "",
        twin: kind === DOT && rnd() < 0.04 ? 1 : 0,
        // No dark fringes: the dark rims around the reference's specks come from its video compression, which
        // puts them on ours too. The draws stay so the rest of the loop keeps its measured layout.
        fringe: (kind === HAIR || kind === FLAKE ? rnd() < 0.5 : kind === DOT && cls > 0 && rnd() < (cls === 2 ? 0.3 : 0.15)) ? 0 * rnd() : 0
      };
      const marks = [mark];
      for (let k = 1; k < life; k++) {
        const prev = marks[k - 1];
        marks.push({ ...prev, a: prev.a * (0.6 + 0.4 * rnd()), s: prev.s * (0.9 + 0.2 * rnd()), x: prev.x + (rnd() - 0.5) * 2e-3, y: prev.y + (rnd() - 0.5) * 1e-3 });
      }
      out.push({ birth: b, life, keep: rnd() < 0.8, marks });
    }
  }
  dustCache = out;
  return out;
}
function dustFrame(frame, fps) {
  return Math.floor(frame * GRID.dustFps / fps + 1e-6);
}
function dustAt(frame, fps) {
  const df = dustFrame(frame, fps);
  const di = mod(df, GRID.dustLoop);
  const out = [];
  dustLoop().forEach((sp, id) => {
    if (!sp || !sp.marks) return;
    const age = mod(di - sp.birth, GRID.dustLoop);
    if (age >= sp.life) return;
    const m = sp.marks[age];
    if (!m) return;
    const pass = Math.floor((df - age) / GRID.dustLoop);
    const flip = !sp.keep && mod(pass, 2) === 1;
    let fx = m.x;
    let fy = m.y;
    if (!sp.keep && pass !== 0) {
      fx = frac((flip ? 1 - fx : fx) + frac(pass * 0.618034));
      fy = frac(fy + frac(pass * 0.754878));
      const h = Math.sin(id * 12.9898 + pass * 78.233) * 43758.5453;
      if (h - Math.floor(h) >= dustDensity(fy)) return;
    }
    out.push({ ...m, id, fx, fy, flip });
  });
  return out;
}
function Dust({ W, H, frame, fps, uid }) {
  const k = W / 1080;
  const els = [];
  dustAt(frame, fps).forEach((m) => {
    const i = m.id;
    const flip = m.flip;
    const x = m.fx * W;
    const y = m.fy * H;
    const op = Math.min(1, m.a / 217);
    const rot = flip ? 180 - m.rot : m.rot;
    const ang = rot * Math.PI / 180;
    const sx = flip ? -1 : 1;
    if (m.kind === DOT) {
      const r = m.s * k / 2.355 * 2.6;
      els.push(/* @__PURE__ */ React.createElement("circle", { key: i, cx: x, cy: y, r, fill: "url(#dd" + uid + ")", opacity: op }));
      if (m.twin) els.push(/* @__PURE__ */ React.createElement("circle", { key: i + "t", cx: x + 10 * k * Math.cos(ang), cy: y + 10 * k * Math.sin(ang), r: r * 0.85, fill: "url(#dd" + uid + ")", opacity: op * 0.8 }));
      if (m.fringe) els.push(/* @__PURE__ */ React.createElement("circle", { key: i + "f", cx: x + 0.7 * r * Math.cos(ang), cy: y + 0.7 * r * Math.sin(ang), r: r * 0.45, fill: "url(#dk" + uid + ")", opacity: Math.min(1, m.fringe / 38) }));
    } else if (m.kind === HAIR) {
      const s = m.s * k;
      const st = m.d.slice(1).split(" ").slice(0, 2).map(Number);
      const tf = "translate(" + x.toFixed(1) + " " + y.toFixed(1) + ") rotate(" + rot.toFixed(1) + ") scale(" + (sx * s).toFixed(2) + " " + s.toFixed(2) + ")";
      els.push(
        /* @__PURE__ */ React.createElement("g", { key: i, transform: tf, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("path", { d: m.d, stroke: "#fff", strokeWidth: 9 * k / s, opacity: op * 0.22 }), /* @__PURE__ */ React.createElement("path", { d: m.d, stroke: "#fff", strokeWidth: 6 * k / s, opacity: op }), m.fringe ? /* @__PURE__ */ React.createElement("circle", { cx: st[0] * 1.15, cy: st[1] * 1.15, r: 5 * k / s, fill: "url(#dk" + uid + ")", opacity: Math.min(1, m.fringe / 38) }) : null)
      );
    } else if (m.kind === FLAKE) {
      const s = m.s * k;
      const tf = "translate(" + x.toFixed(1) + " " + y.toFixed(1) + ") rotate(" + rot.toFixed(1) + ") scale(" + (sx * s).toFixed(2) + " " + s.toFixed(2) + ")";
      const off = 3.5 * k / s;
      els.push(
        /* @__PURE__ */ React.createElement("g", { key: i, filter: "url(#fb" + uid + ")" }, m.fringe ? /* @__PURE__ */ React.createElement("g", { transform: tf }, /* @__PURE__ */ React.createElement("path", { d: m.d, transform: "translate(" + (off * 0.6).toFixed(4) + " " + off.toFixed(4) + ")", fill: "#000", opacity: Math.min(1, m.fringe / 38) })) : null, /* @__PURE__ */ React.createElement("g", { transform: tf }, /* @__PURE__ */ React.createElement("path", { d: m.d, fill: "#fff", opacity: op })))
      );
    } else {
      const s = m.s * k;
      const c = Math.cos(ang);
      const sn = Math.sin(ang);
      [
        [0, 0, 0.42],
        [0.3, 0.12, 0.3],
        [-0.22, -0.2, 0.26]
      ].forEach(
        ([dx, dy, rr], j) => els.push(/* @__PURE__ */ React.createElement("circle", { key: i + "s" + j, cx: x + s * (sx * dx * c - dy * sn), cy: y + s * (sx * dx * sn + dy * c), r: s * rr, fill: "url(#ds" + uid + ")", opacity: op }))
      );
    }
  });
  return /* @__PURE__ */ React.createElement(React.Fragment, null, els);
}
var rgb = (c, sub) => "rgb(" + c.map((v) => Math.max(0, v - sub).toFixed(1)).join(",") + ")";
function grating(angle, phase, period, amp) {
  const n2 = 8;
  const ph = mod(phase, period);
  const stops = [];
  for (let i = 0; i <= n2; i++) {
    const v = amp * (1 + Math.cos(2 * Math.PI * (i / n2 - 0.5)));
    stops.push("rgb(" + v.toFixed(2) + "," + v.toFixed(2) + "," + v.toFixed(2) + ") " + (ph - period / 2 + i * period / n2).toFixed(3) + "px");
  }
  return "repeating-linear-gradient(" + angle + "deg, " + stops.join(", ") + ")";
}
var lineVar = (i) => {
  const h = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return 1 + 0.18 * (h - Math.floor(h) - 0.5);
};
var gradY = (stops, col) => "linear-gradient(to bottom, " + stops.map(([t, v]) => col(v) + " " + (t * 100).toFixed(1) + "%").join(", ") + ")";
function rasterTexture(r) {
  const t = clamp01((r - 0.22) / 0.1);
  return t * t * (3 - 2 * t);
}
function GridSet(props) {
  const W = Math.max(1, finite(props.W, 1080));
  const H = Math.max(1, finite(props.H, 1920));
  const zin = finite(props.zoom, 1);
  const z = Math.max(0.05, zin);
  const vel = finite(props.zoomVel, 0);
  const smear = Math.abs(vel) > 0.015;
  const nExp = smear ? Math.min(32, Math.max(5, Math.ceil(0.5 * Math.abs(vel) * 0.5 * Math.max(W, H) / (GRID.lineAt1080 * (W / 1080))) + 1)) : 1;
  const zs = smear ? Array.from({ length: nExp }, (_, i) => Math.max(0.05, z + (i / (nExp - 1) - 0.5) * 0.5 * vel)) : [z];
  const zMin = Math.min(...zs);
  const fpsIn = finite(props.fps, 30);
  const fps = fpsIn > 0 ? fpsIn : 30;
  const frame = finite(props.frame, 0);
  const uid = String(props.uid ?? "0").replace(/[^a-zA-Z0-9_-]/g, "");
  const texK = clamp01(finite(props.texture, 1)) * rasterTexture(finite(props.rasterScale, 1));
  const k = W / 1080;
  const pitch = GRID.pitch * W;
  const lw = GRID.lineAt1080 * k;
  const ox = GRID.cx * W;
  const oy = GRID.cy * H;
  const pvx = GRID.px * W;
  const pvy = GRID.py * H;
  const amp = GRID.texAmp * texK;
  const showTex = amp > 0.01;
  const tex = showTex ? 2 * amp : 0;
  const full = { position: "absolute", left: 0, top: 0, width: W, height: H };
  const x0 = pvx - pvx / zMin;
  const x1 = pvx + (W - pvx) / zMin;
  const y0 = pvy - pvy / zMin;
  const y1 = pvy + (H - pvy) / zMin;
  const rects = [];
  for (let i = Math.floor((x0 - ox) / pitch) - 1; i <= Math.ceil((x1 - ox) / pitch) + 1; i++) {
    const w = lw * lineVar(i);
    rects.push([ox + i * pitch - w / 2, y0 - lw, w, y1 - y0 + 2 * lw]);
  }
  for (let j = Math.floor((y0 - oy) / pitch) - 1; j <= Math.ceil((y1 - oy) / pitch) + 1; j++) {
    const w = lw * lineVar(j + 101);
    rects.push([x0 - lw, oy + j * pitch - w / 2, x1 - x0 + 2 * lw, w]);
  }
  const ztOf = (zz) => "translate(" + pvx.toFixed(3) + " " + pvy.toFixed(3) + ") scale(" + zz.toFixed(6) + ") translate(" + (-pvx).toFixed(3) + " " + (-pvy).toFixed(3) + ")";
  const exposures = (key, body, gain = 1, cap = false) => smear ? /* @__PURE__ */ React.createElement("g", { style: { isolation: "isolate" }, filter: cap ? "url(#sc" + uid + ")" : void 0 }, zs.map((zz, n2) => /* @__PURE__ */ React.createElement("g", { key: key + n2, transform: ztOf(zz), opacity: Math.min(1, gain / zs.length), style: { mixBlendMode: "plus-lighter" } }, body))) : /* @__PURE__ */ React.createElement("g", { transform: ztOf(z) }, body);
  const P = GRID.texPeriod * W;
  const bx = 0.48 * k;
  const by = -0.51 * k;
  const fadeMask = gradY(TEX_FADE, (a) => "rgba(0,0,0," + a.toFixed(3) + ")");
  const fadeFill = gradY(TEX_FADE, (a) => {
    const v = (tex * (1 - a)).toFixed(2);
    return "rgb(" + v + "," + v + "," + v + ")";
  });
  const shade = gradY(SHADE, (m) => "rgba(0,0,0," + (1 - m).toFixed(3) + ")");
  const bgTint = "linear-gradient(to bottom, rgba(255,255,255,0.009), rgba(255,255,255,0) 14%), radial-gradient(ellipse " + (0.4 * W).toFixed(0) + "px " + (0.12 * H).toFixed(0) + "px at 0px 0px, rgba(255,255,255,0.008), rgba(255,255,255,0)), radial-gradient(ellipse " + (0.45 * W).toFixed(0) + "px " + (0.22 * H).toFixed(0) + "px at " + W + "px 0px, rgba(0,0,0,0.13), rgba(0,0,0,0))";
  const tint = (o, a) => /* @__PURE__ */ React.createElement("stop", { key: o, offset: o, stopColor: "#fff", stopOpacity: a });
  const lattice = rects.map(([x, y, w, h], j) => /* @__PURE__ */ React.createElement("rect", { key: j, x: x.toFixed(3), y: y.toFixed(3), width: w.toFixed(3), height: h.toFixed(3) }));
  const region = { x: x0 - 2 * lw, y: y0 - 2 * lw, width: x1 - x0 + 4 * lw, height: y1 - y0 + 4 * lw };
  return /* @__PURE__ */ React.createElement("div", { style: { ...full, overflow: "hidden", isolation: "isolate", backgroundColor: rgb(GRID.bg, tex), backgroundImage: bgTint } }, /* @__PURE__ */ React.createElement("svg", { width: W, height: H, style: { position: "absolute", left: 0, top: 0 } }, /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("radialGradient", { id: "at" + uid, gradientUnits: "userSpaceOnUse", cx: 0, cy: 0, r: W, gradientTransform: "translate(0 " + (0.2 * H).toFixed(1) + ") scale(1 " + (0.45 * H / W).toFixed(4) + ")" }, [[0, 0.9], [0.3, 0.8], [0.52, 0.52], [0.7, 0.25], [0.85, 0.07], [1, 0]].map(([o, a]) => tint(o, a))), /* @__PURE__ */ React.createElement("radialGradient", { id: "ap" + uid, gradientUnits: "userSpaceOnUse", cx: W, cy: 0, r: 0.3 * W, gradientTransform: "translate(0 " + (0.42 * H).toFixed(1) + ") scale(1 " + (0.2 * H / (0.3 * W)).toFixed(4) + ")" }, [[0, 0.6], [1, 0]].map(([o, a]) => tint(o, a))), /* @__PURE__ */ React.createElement("mask", { id: "mt" + uid, maskUnits: "userSpaceOnUse", ...region }, /* @__PURE__ */ React.createElement("rect", { ...region, fill: "url(#at" + uid + ")" })), /* @__PURE__ */ React.createElement("mask", { id: "mp" + uid, maskUnits: "userSpaceOnUse", ...region }, /* @__PURE__ */ React.createElement("rect", { ...region, fill: "url(#ap" + uid + ")" })), /* @__PURE__ */ React.createElement("filter", { id: "sc" + uid, filterUnits: "userSpaceOnUse", x: 0, y: 0, width: W, height: H, colorInterpolationFilters: "sRGB" }, /* @__PURE__ */ React.createElement("feComponentTransfer", null, /* @__PURE__ */ React.createElement("feFuncR", { type: "table", tableValues: CAP_TABLE }), /* @__PURE__ */ React.createElement("feFuncG", { type: "table", tableValues: CAP_TABLE }), /* @__PURE__ */ React.createElement("feFuncB", { type: "table", tableValues: CAP_TABLE }))), /* @__PURE__ */ React.createElement("mask", { id: "ml" + uid, maskUnits: "userSpaceOnUse", ...region }, /* @__PURE__ */ React.createElement("g", { fill: "#fff" }, lattice))), exposures(
    "l",
    /* @__PURE__ */ React.createElement("g", { mask: "url(#ml" + uid + ")" }, /* @__PURE__ */ React.createElement("rect", { ...region, fill: rgb(GRID.line, tex) }), /* @__PURE__ */ React.createElement("rect", { ...region, fill: rgb(GRID.teal, tex), mask: "url(#mt" + uid + ")" }), /* @__PURE__ */ React.createElement("rect", { ...region, fill: rgb(GRID.pink, tex), mask: "url(#mp" + uid + ")" })),
    1 + 0.8 * smoothstep(0.08, 0.15, Math.abs(vel)),
    true
  )), showTex ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { ...full, isolation: "isolate", mixBlendMode: "plus-lighter", maskImage: fadeMask, WebkitMaskImage: fadeMask } }, /* @__PURE__ */ React.createElement("div", { style: { ...full, backgroundImage: grating(135, (bx + by) / Math.SQRT2, P / Math.SQRT2, amp) } }), /* @__PURE__ */ React.createElement("div", { style: { ...full, backgroundImage: grating(45, (bx - by + H) / Math.SQRT2, P / Math.SQRT2, amp), mixBlendMode: "plus-lighter" } })), /* @__PURE__ */ React.createElement("div", { style: { ...full, backgroundImage: fadeFill, mixBlendMode: "plus-lighter" } })) : null, /* @__PURE__ */ React.createElement("svg", { width: W, height: H, style: { position: "absolute", left: 0, top: 0 } }, /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("radialGradient", { id: "dd" + uid }, [[0, 1], [0.1, 0.981], [0.2, 0.857], [0.28, 0.655], [0.36, 0.407], [0.44, 0.193], [0.52, 0.066], [0.6, 0.016], [0.7, 1e-3], [1, 0]].map(([o, a]) => /* @__PURE__ */ React.createElement("stop", { key: o, offset: o, stopColor: "#fff", stopOpacity: a }))), /* @__PURE__ */ React.createElement("radialGradient", { id: "ds" + uid }, [[0, 1], [0.4, 0.75], [0.75, 0.3], [1, 0]].map(([o, a]) => /* @__PURE__ */ React.createElement("stop", { key: o, offset: o, stopColor: "#fff", stopOpacity: a }))), /* @__PURE__ */ React.createElement("radialGradient", { id: "dk" + uid }, /* @__PURE__ */ React.createElement("stop", { offset: "0", stopColor: "#000", stopOpacity: 1 }), /* @__PURE__ */ React.createElement("stop", { offset: "1", stopColor: "#000", stopOpacity: 0 })), /* @__PURE__ */ React.createElement("filter", { id: "fb" + uid, x: "-50%", y: "-50%", width: "200%", height: "200%" }, /* @__PURE__ */ React.createElement("feGaussianBlur", { stdDeviation: (1.5 * k).toFixed(3) }))), exposures("d", /* @__PURE__ */ React.createElement(Dust, { W, H, frame, fps, uid }))), /* @__PURE__ */ React.createElement("div", { style: { ...full, backgroundImage: shade } }));
}

// plugins/podcast-hook-captions/src/motion/text.ts
var widthCache = {};
var metricCache = {};
function clearTextCache() {
  for (const k of Object.keys(widthCache)) delete widthCache[k];
  for (const k of Object.keys(metricCache)) delete metricCache[k];
}
function ctx() {
  try {
    if (typeof document === "undefined") return null;
    return document.createElement("canvas").getContext("2d");
  } catch {
    return null;
  }
}
function width100(text, family, weight, trackingEm, estimateEm, kern = true) {
  const key = family + "|" + weight + "|" + trackingEm + "|" + kern + "|" + text;
  if (widthCache[key] != null) return widthCache[key];
  let w = 0;
  const c = ctx();
  if (c) {
    c.font = weight + " 100px " + family;
    c.fontKerning = kern ? "normal" : "none";
    const m = c.measureText(text);
    if (m && m.width > 0) w = m.width;
  }
  if (!(w > 0)) w = text.length * estimateEm * 100;
  w += text.length * trackingEm * 100;
  widthCache[key] = w;
  return w;
}
function capMetrics(family, weight, capEstimate) {
  const key = family + "|" + weight;
  if (metricCache[key]) return metricCache[key];
  let out = { cap: capEstimate, top: (1 - capEstimate) / 2 };
  const c = ctx();
  if (c) {
    c.font = weight + " 100px " + family;
    const m = c.measureText("HXE");
    const cap = Number(m.actualBoundingBoxAscent) / 100;
    const A = Number(m.fontBoundingBoxAscent) / 100;
    const D = Number(m.fontBoundingBoxDescent) / 100;
    if (cap > 0.2 && A > 0 && D >= 0) out = { cap, top: (1 - (A + D)) / 2 + A - cap };
  }
  metricCache[key] = out;
  return out;
}

// plugins/podcast-hook-captions/src/motion/Reel.tsx
var n = (v, f) => typeof v === "number" && Number.isFinite(v) ? v : f;
var clamp012 = (v) => Math.max(0, Math.min(1, v));
var easeOut = (p) => 1 - Math.pow(1 - clamp012(p), 3);
var easeIn = (p) => Math.pow(clamp012(p), 3);
var easeIO = (p) => {
  const q = clamp012(p);
  return q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2;
};
var inRanges = (rs, f) => (rs || []).some((r) => f >= r[0] && f < r[1]);
var YELLOW_CAPTION = "#F7C952";
var YELLOW_KEY = "#FBD036";
var WHITE = "#F9FAF9";
function Reel({ data = {} }) {
  const frame = useCurrentFrame();
  const W = n(data.W, 1080);
  const H = n(data.H, 1920);
  const fps = n(data.fps, 30);
  const F = (x) => Math.max(1, Math.round(x * fps / 30));
  const uid = String(data.uid || "r").replace(/[^a-zA-Z0-9_-]/g, "");
  const fontData = [
    ["Reel Hero", typeof data.heroFontData === "string" ? data.heroFontData : "", "400"],
    ["Reel Caption", typeof data.captionFontData === "string" ? data.captionFontData : "", "700"],
    ["Reel Lead", typeof data.leadFontData === "string" ? data.leadFontData : "", "800"]
  ];
  const has = (family) => fontData.some(([f, b64]) => f === family && !!b64);
  const [ready, setReady] = useState(!fontData.some(([, b64]) => b64));
  const [handle] = useState(() => fontData.some(([, b64]) => b64) ? delayRender("reel fonts") : null);
  useEffect(() => {
    if (ready) return;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTextCache();
      setReady(true);
    };
    const load = ([family, b64, weight]) => {
      if (!b64) return Promise.resolve();
      try {
        const face = new window.FontFace(family, "url(data:font/woff2;base64," + b64 + ")", { weight });
        return face.load().then((f) => document.fonts.add(f)).catch(() => {
        });
      } catch {
        return Promise.resolve();
      }
    };
    Promise.all(fontData.map(load)).then(finish, finish);
    const timer = setTimeout(finish, 4e3);
    return () => clearTimeout(timer);
  }, [ready]);
  useEffect(() => {
    if (ready && handle != null) continueRender(handle);
  }, [ready, handle]);
  const KEY_FAMILY = (has("Reel Hero") ? '"Reel Hero", ' : "") + '"Six Caps", "League Gothic", "Bebas Neue", "Impact", sans-serif';
  const KEY_WEIGHT = has("Reel Hero") ? 400 : 700;
  const lead = {
    family: (has("Reel Lead") ? '"Reel Lead", ' : "") + '"Avenir Next", "Montserrat", "Helvetica Neue", Arial, sans-serif',
    weight: 800,
    track: has("Reel Lead") ? -0.032 : 0.02,
    est: 0.68,
    capEst: 0.7,
    kern: false
  };
  const key = { family: KEY_FAMILY, weight: KEY_WEIGHT, track: 0.015, est: 0.24, capEst: 0.9, kern: true };
  const capFace = {
    family: (has("Reel Caption") ? '"Reel Caption", ' : "") + '"Roboto Condensed", "Helvetica Neue", "Arial Narrow", sans-serif',
    weight: 700,
    track: -8e-3,
    est: 0.5,
    capEst: 0.71,
    kern: false
  };
  const sizeForCap = (face, cap) => cap / capMetrics(face.family, face.weight, face.capEst).cap;
  const sizeForWidth = (face, text, width) => width / width100(text, face.family, face.weight, face.track, face.est, face.kern) * 100;
  const capOf = (face, size) => size * capMetrics(face.family, face.weight, face.capEst).cap;
  const textW = (face, text, size) => width100(text, face.family, face.weight, face.track, face.est, face.kern) * size / 100;
  const camera = Array.isArray(data.camera) ? data.camera : [];
  const cam = camAt(camera, frame);
  const renderLine = (k, face, words2, size, x, capTop, color, appear, extra = {}) => {
    const m = capMetrics(face.family, face.weight, face.capEst);
    const glow = face === key ? "0 0 " + (0.06 * size).toFixed(1) + "px rgba(251,208,54,0.55), 0 0 " + (0.16 * size).toFixed(1) + "px rgba(160,110,20,0.45)" : (
      // White lead lines: the reference's soft near-white halo; the drop shadow keeps them readable on pale shots.
      "0 0 " + (0.55 * size).toFixed(1) + "px rgba(255,255,255,0.6), 0 " + (0.03 * size).toFixed(1) + "px " + (0.08 * size).toFixed(1) + "px rgba(0,0,0,0.55)"
    );
    return /* @__PURE__ */ React2.createElement(
      "div",
      {
        key: k,
        style: {
          position: "absolute",
          left: x,
          top: capTop - m.top * size,
          fontFamily: face.family,
          fontWeight: face.weight,
          fontSize: size,
          lineHeight: 1,
          letterSpacing: face.track + "em",
          fontKerning: face.kern ? "normal" : "none",
          whiteSpace: "nowrap",
          color,
          textTransform: "uppercase",
          textShadow: glow,
          // Six Caps is lighter than the reference's display face; a same-colour stroke adds the weight.
          ...face === key ? { WebkitTextStroke: (0.022 * size).toFixed(1) + "px " + color } : {},
          ...extra
        }
      },
      words2.map((w, i) => {
        const st = appear(w, i, size);
        return /* @__PURE__ */ React2.createElement(React2.Fragment, { key: i }, i > 0 ? " " : "", /* @__PURE__ */ React2.createElement("span", { style: { display: "inline-block", ...st || { visibility: "hidden" } } }, w.t));
      })
    );
  };
  const lineText = (ws) => ws.map((w) => w.t).join(" ");
  const pop = (w) => frame >= w.at ? { opacity: 1 } : null;
  const fadeRise = (dist, dur) => (w, _i, size) => {
    const t = frame - w.at;
    if (t < 0) return null;
    const p = easeOut(t / dur);
    return { opacity: clamp012(t / Math.max(1, dur * 0.6)), transform: "translateY(" + ((1 - p) * dist * size).toFixed(1) + "px)" };
  };
  const riseBlur = (distPx, dur) => (w) => {
    const t = frame - w.at;
    if (t < 0) return null;
    const p = easeOut(t / dur);
    const v = t < dur ? 3 * Math.pow(1 - t / dur, 2) : 0;
    const blur = v * distPx * 0.02;
    return {
      opacity: clamp012(t / Math.max(1, dur * 0.4)),
      transform: "translateY(" + ((1 - p) * distPx).toFixed(1) + "px)",
      filter: blur > 0.4 ? "url(#vb" + uid + "_" + Math.min(8, Math.round(blur / 3)) + ")" : void 0
    };
  };
  const titles = Array.isArray(data.titles) ? data.titles : [];
  const pinned = (t, node) => {
    if (t.anchor == null) return node;
    const a = camAt(camera, t.anchor);
    return /* @__PURE__ */ React2.createElement("div", { style: { position: "absolute", left: 0, top: 0, width: W, height: H, transformOrigin: "50% 50%", transform: pinCss(a, cam, W, H) } }, node);
  };
  const leadsOf = (t) => t.lines.filter((l) => l.role === "lead");
  const keyOf = (t) => t.lines.find((l) => l.role === "key") || { role: "key", words: [] };
  const renderTitle = (t, idx) => {
    if (frame < t.start - 1 || frame >= t.end) return null;
    const K = keyOf(t);
    const leads = leadsOf(t);
    const kText = lineText(K.words);
    const nodes = [];
    let wrapStyle = {};
    if (t.kind === "opener") {
      const L = leads[0] ? leads[0].words : [];
      const lSize = Math.min(sizeForCap(lead, 0.03 * H), sizeForWidth(lead, lineText(L), 0.8 * W));
      const kSize = Math.min(sizeForCap(key, 0.16 * H), sizeForWidth(key, kText, 0.88 * W));
      const lTop = 0.03 * H;
      const kTop = 0.092 * H;
      nodes.push(renderLine("l", lead, L, lSize, (W - textW(lead, lineText(L), lSize)) / 2, lTop, WHITE, fadeRise(-0.4, F(4))));
      nodes.push(
        renderLine("k", key, K.words, kSize, (W - textW(key, kText, kSize)) / 2, kTop, YELLOW_KEY, (w) => {
          const tt = frame - w.at;
          if (tt < 0) return null;
          const p = easeOut(tt / F(7));
          return { clipPath: "inset(0 0 " + ((1 - p) * 100).toFixed(1) + "% 0)", transform: "translateY(" + (-(1 - p) * 0.12 * kSize).toFixed(1) + "px)" };
        })
      );
      const fade = clamp012((t.end - frame) / F(6));
      wrapStyle = { opacity: fade };
    } else if (t.kind === "stackA") {
      const L = leads[0] ? leads[0].words : [];
      const x0 = 0.22 * W;
      const bw = 0.7 * W;
      const lSize = Math.min(sizeForCap(lead, 0.028 * H), sizeForWidth(lead, lineText(L), bw));
      const k1 = K.words.slice(0, 1);
      const k2 = K.words.slice(1);
      const gap = 0.03 * W;
      const both = lineText(k1) + (k2.length ? " " + lineText(k2) : "");
      const kSize = Math.min(sizeForCap(key, 0.125 * H), sizeForWidth(key, both, bw - gap));
      const kCap = capOf(key, kSize);
      const lTop = (typeof t.y === "number" ? t.y : 0.5) * H;
      const kTop = lTop + capOf(lead, lSize) + 0.018 * H;
      nodes.push(renderLine("l", lead, L, lSize, x0, lTop, WHITE, fadeRise(0.35, F(8))));
      nodes.push(renderLine("k1", key, k1, kSize, x0, kTop, YELLOW_KEY, riseBlur(0.135 * H, F(13))));
      if (k2.length) {
        const w1 = textW(key, lineText(k1), kSize);
        nodes.push(renderLine("k2", key, k2, kSize, x0 + w1 + gap, kTop, YELLOW_KEY, riseBlur(0.135 * H, F(13))));
      }
      if (t.arrowAt != null) nodes.push(arrow(t.arrowAt, x0 - 0.015 * W, kTop + 0.45 * kCap, x0 - 0.19 * W, lTop - 0.035 * H));
      wrapStyle = { opacity: clamp012((t.end - frame) / F(3)) };
    } else if (t.kind === "stackB" || t.kind === "final") {
      const isB = t.kind === "stackB";
      const maxW = isB ? 0.64 * W : 0.87 * W;
      const minW = isB ? 0.42 * W : 0.62 * W;
      const caps = isB ? [0.034, 0.053] : [0.034, 0.059];
      const kCapRef = (isB ? 0.151 : 0.1875) * H;
      const leadNominal = leads.map((l, i) => textW(lead, lineText(l.words), sizeForCap(lead, caps[Math.min(i, caps.length - 1)] * H)));
      const bw = Math.min(maxW, Math.max(minW, textW(key, kText, sizeForCap(key, kCapRef)), ...leadNominal));
      const kSize = Math.min(sizeForCap(key, kCapRef * 1.1), sizeForWidth(key, kText, bw));
      const kW = textW(key, kText, kSize);
      const kCap = capOf(key, kSize);
      const x0 = isB ? 0.05 * W : (W - bw) / 2;
      const lines = leads.map((l, i) => {
        const c = caps[Math.min(i, caps.length - 1)] * H;
        const fitW = sizeForWidth(lead, lineText(l.words), bw);
        const hi = sizeForCap(lead, Math.max(0.8 * c, Math.min(1.15 * c, 0.3 * kCap)));
        const s = Math.min(fitW, Math.max(sizeForCap(lead, 0.8 * c), Math.min(hi, fitW)));
        return { l, s, cap: capOf(lead, s), w: textW(lead, lineText(l.words), s) };
      });
      const gapY = 7e-3 * H;
      let y;
      if (isB) y = 0.21 * H;
      else {
        const kTopFinal = 0.628 * H;
        y = kTopFinal - lines.reduce((a, r) => a + r.cap + gapY, 0);
      }
      lines.forEach((r, i) => {
        const x = isB ? x0 : x0 + (bw - r.w) / 2;
        nodes.push(renderLine("l" + i, lead, r.l.words, r.s, x, y, WHITE, isB ? fadeRise(0.3, F(5)) : fadeRise(0.2, F(6))));
        y += r.cap + gapY;
      });
      const kx = isB ? x0 : x0 + (bw - kW) / 2;
      if (isB) nodes.push(renderLine("k", key, K.words, kSize, kx, y, YELLOW_KEY, riseBlur(0.12 * H, F(10))));
      else
        nodes.push(
          renderLine("k", key, K.words, kSize, kx, y, YELLOW_KEY, (w) => {
            const tt = frame - w.at;
            if (tt < 0) return null;
            const p = easeOut(tt / F(5));
            const v = tt < F(5) ? 3 * Math.pow(1 - tt / F(5), 2) : 0;
            return { transform: "translateX(" + ((1 - p) * 0.29 * W).toFixed(1) + "px)", filter: v > 0.2 ? "url(#hb" + uid + "_" + Math.min(8, Math.round(v * 3)) + ")" : void 0 };
          })
        );
      if (!isB && t.blowAt != null) {
        const p = easeIn((frame - t.blowAt) / Math.max(1, t.end - t.blowAt));
        const s = 1 + 0.39 * p;
        wrapStyle = { transform: "scale(" + s.toFixed(4) + ")", transformOrigin: "50% " + 0.7 * H / H * 100 + "%" };
      }
    } else if (t.kind === "punch") {
      const L = leads[0] ? leads[0].words : [];
      const one = Math.min(sizeForCap(key, 0.238 * H), sizeForWidth(key, kText, 0.92 * W));
      const rows = K.words.length >= 2 && capOf(key, one) < 0.14 * H ? [K.words.slice(0, Math.ceil(K.words.length / 2)), K.words.slice(Math.ceil(K.words.length / 2))] : [K.words];
      const kSize = Math.min(...rows.map((r) => Math.min(sizeForCap(key, (rows.length > 1 ? 0.19 : 0.238) * H), sizeForWidth(key, lineText(r), 0.92 * W))));
      const kCap = capOf(key, kSize);
      const kW = Math.max(...rows.map((r) => textW(key, lineText(r), kSize)));
      const lSize = Math.min(sizeForCap(lead, 0.045 * H), sizeForWidth(lead, lineText(L), Math.min(0.55 * W, 0.75 * kW)));
      const kTop = (rows.length > 1 ? 0.5 : 0.574) * H;
      const lTop = kTop - 0.02 * H - capOf(lead, lSize);
      nodes.push(renderLine("l", lead, L, lSize, (W - textW(lead, lineText(L), lSize)) / 2, lTop, WHITE, pop));
      const keyPop = (w) => {
        const tt = frame - w.at;
        if (tt < 0) return null;
        const s2 = 1.08 - 0.08 * easeOut(tt / F(3));
        return { transform: "scale(" + s2.toFixed(4) + ")" };
      };
      rows.forEach((r, ri) => nodes.push(renderLine("k" + ri, key, r, kSize, (W - textW(key, lineText(r), kSize)) / 2, kTop + ri * (kCap + 0.018 * H), YELLOW_KEY, keyPop)));
      if (t.blowAt != null && frame >= t.blowAt) {
        const p = easeIO((frame - t.blowAt) / F(9));
        const s = 1 + Math.max(0, Math.min(0.3, 0.98 * W / Math.max(1, kW) - 1)) * p;
        const dy = p * (0.78 * H - kTop);
        wrapStyle = { transform: "translateY(" + dy.toFixed(1) + "px) scale(" + s.toFixed(4) + ")", transformOrigin: "50% " + (kTop / H * 100).toFixed(2) + "%" };
      }
    }
    const node = /* @__PURE__ */ React2.createElement("div", { key: "t" + idx, style: { position: "absolute", left: 0, top: 0, width: W, height: H, ...wrapStyle } }, nodes);
    return pinned(t, node);
  };
  function arrow(at, tailX, tailY, tipX, tipY) {
    const t = frame - at;
    if (t < 0) return null;
    const p = easeOut(t / F(5));
    const dx = tipX - tailX;
    const dy = tipY - tailY;
    const c1x = tailX + 0.3 * dx - 0.02 * W;
    const c1y = tailY + 0.3 * dy + 0.035 * H;
    const c2x = tailX + 0.75 * dx + 0.01 * W;
    const c2y = tailY + 0.75 * dy + 0.03 * H;
    const d = "M " + tailX.toFixed(1) + " " + tailY.toFixed(1) + " C " + c1x.toFixed(1) + " " + c1y.toFixed(1) + ", " + c2x.toFixed(1) + " " + c2y.toFixed(1) + ", " + tipX.toFixed(1) + " " + tipY.toFixed(1);
    const len = 1.35 * Math.hypot(dx, dy) + 0.05 * W;
    const head = 0.024 * H;
    const sw = Math.max(3, 68e-4 * W);
    const ang = Math.atan2(tipY - c2y, tipX - c2x);
    const a1 = ang + Math.PI - 0.5;
    const a2 = ang + Math.PI + 0.5;
    return /* @__PURE__ */ React2.createElement("svg", { key: "arrow", width: W, height: H, style: { position: "absolute", left: 0, top: 0, overflow: "visible", filter: "drop-shadow(0 0 " + (8e-3 * W).toFixed(1) + "px rgba(251,208,54,0.75))" } }, /* @__PURE__ */ React2.createElement("path", { d, fill: "none", stroke: YELLOW_KEY, strokeWidth: sw, strokeLinecap: "round", strokeDasharray: len.toFixed(1), strokeDashoffset: ((1 - p) * len).toFixed(1) }), p > 0.8 ? /* @__PURE__ */ React2.createElement(
      "path",
      {
        d: "M " + (tipX + head * Math.cos(a1)).toFixed(1) + " " + (tipY + head * Math.sin(a1)).toFixed(1) + " L " + tipX.toFixed(1) + " " + tipY.toFixed(1) + " L " + (tipX + head * Math.cos(a2)).toFixed(1) + " " + (tipY + head * Math.sin(a2)).toFixed(1),
        fill: "none",
        stroke: YELLOW_KEY,
        strokeWidth: sw,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        opacity: clamp012((p - 0.8) / 0.2)
      }
    ) : null);
  }
  const masks = data.masks && typeof data.masks.base === "string" && n(data.masks.count, 0) > 0 ? data.masks : null;
  const setOpacity = scalarAt(data.setOpacity, frame, 0);
  const gridZoom = scalarAt(data.gridZoom, frame, 1);
  const behind = titles.filter((t) => t.behind && frame >= t.start - 1 && frame < t.end);
  const front = titles.filter((t) => !t.behind);
  let maskLayer = null;
  if (masks && (setOpacity > 2e-3 || behind.length)) {
    const idx = Math.min(masks.count, Math.max(1, frame + 1));
    const url = 'url("' + masks.base + "/matte_" + String(idx).padStart(6, "0") + '.png")';
    maskLayer = /* @__PURE__ */ React2.createElement(
      "div",
      {
        style: {
          position: "absolute",
          left: 0,
          top: 0,
          width: W,
          height: H,
          maskImage: url,
          WebkitMaskImage: url,
          maskMode: "luminance",
          maskSize: "100% 100%",
          WebkitMaskSize: "100% 100%",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "0 0"
        }
      },
      setOpacity > 2e-3 ? /* @__PURE__ */ React2.createElement("div", { style: { position: "absolute", left: 0, top: 0, width: W, height: H, opacity: setOpacity } }, /* @__PURE__ */ React2.createElement(
        GridSet,
        {
          W,
          H,
          zoom: gridZoom,
          uid,
          frame,
          fps,
          zoomVel: zoomVelocity(data.gridZoom, frame),
          texture: scalarAt(data.gridTexture, frame, 1)
        }
      )) : null,
      behind.map((t, i) => renderTitle(t, 100 + i))
    );
  } else if (!masks && behind.length) {
    maskLayer = /* @__PURE__ */ React2.createElement(React2.Fragment, null, behind.map((t, i) => renderTitle(t, 100 + i)));
  }
  const words = Array.isArray(data.words) ? data.words : [];
  let caption = null;
  if (!inRanges(data.capHide, frame)) {
    let cur = null;
    for (let i = 0; i < words.length; i += 1) {
      const w = words[i];
      const next = words[i + 1];
      const until = next && next[1] - w[2] < Math.round(0.3 * fps) ? next[1] : w[2] + F(2);
      if (frame >= w[1] && frame < until) cur = w;
      if (w[1] > frame) break;
    }
    if (cur) {
      const text = String(cur[0]).toUpperCase().replace(/[.,!?;:"\u201C\u201D]+$/g, "").replace(/^["\u201C\u201D]+/, "");
      const size0 = sizeForCap(capFace, 0.0375 * H);
      const size = Math.min(size0, sizeForWidth(capFace, text, 0.9 * W));
      let top = 0.552 * H;
      for (const r of data.capY || []) if (frame >= r[0] && frame < r[1]) top = (r[2] + 3e-3) * H;
      const m = capMetrics(capFace.family, capFace.weight, capFace.capEst);
      caption = /* @__PURE__ */ React2.createElement(
        "div",
        {
          style: {
            position: "absolute",
            left: 0,
            width: W,
            top: top - m.top * size,
            textAlign: "center",
            fontFamily: capFace.family,
            fontWeight: capFace.weight,
            fontSize: size,
            lineHeight: 1,
            letterSpacing: capFace.track + "em",
            fontKerning: "none",
            color: YELLOW_CAPTION,
            whiteSpace: "nowrap",
            // Measured against the reference: its glow is a broad Gaussian blur of the letters in bright amber,
            // composited with plain alpha (as this graphic is over the video), sigma about 0.65 cap and about
            // 1.4x the letter coverage near the edge, so two identical shadows. Dark layers would muddy bright
            // footage; only a thin warm-dark contact line stays, to keep the letters readable on pale shots.
            textShadow: "0 0 " + (0.03 * size).toFixed(1) + "px rgba(50,25,0,0.8), 0 0 " + (0.2 * size).toFixed(1) + "px rgba(60,30,0,0.35), 0 0 " + (0.88 * size).toFixed(1) + "px rgb(255,186,30), 0 0 " + (0.88 * size).toFixed(1) + "px rgba(255,186,30,0.4)"
          }
        },
        text
      );
    }
  }
  const LEAK = [
    [193, 109, 53, 0.45],
    [205, 132, 52, 0.62],
    [221, 161, 51, 0.8],
    [228, 196, 122, 0.92],
    [232, 220, 173, 0.97],
    [214, 158, 88, 0.86],
    [190, 118, 58, 0.66],
    [160, 83, 45, 0.45],
    [160, 83, 45, 0.2]
  ];
  let leak = null;
  for (const c of data.flashes || []) {
    const i = frame - c + 4;
    if (i < 0 || i >= LEAK.length) continue;
    const [r, g, b, a] = LEAK[i];
    leak = /* @__PURE__ */ React2.createElement(
      "div",
      {
        style: {
          position: "absolute",
          left: 0,
          top: 0,
          width: W,
          height: H,
          mixBlendMode: "screen",
          background: "radial-gradient(ellipse 90% 70% at 62% 42%, rgba(" + r + "," + g + "," + b + "," + a + ") 0%, rgba(" + r + "," + g + "," + b + "," + (a * 0.85).toFixed(3) + ") 55%, rgba(" + Math.round(r * 0.8) + "," + Math.round(g * 0.6) + "," + Math.round(b * 0.6) + "," + (a * 0.7).toFixed(3) + ") 100%)"
        }
      }
    );
  }
  if (!ready) return null;
  const blurDefs = [];
  for (let i = 1; i <= 8; i += 1) {
    blurDefs.push(
      /* @__PURE__ */ React2.createElement("filter", { key: "vb" + i, id: "vb" + uid + "_" + i, x: "-10%", y: "-40%", width: "120%", height: "180%" }, /* @__PURE__ */ React2.createElement("feGaussianBlur", { stdDeviation: "0 " + i * 3 })),
      /* @__PURE__ */ React2.createElement("filter", { key: "hb" + i, id: "hb" + uid + "_" + i, x: "-40%", y: "-10%", width: "180%", height: "120%" }, /* @__PURE__ */ React2.createElement("feGaussianBlur", { stdDeviation: i * 4 + " 0" }))
    );
  }
  return /* @__PURE__ */ React2.createElement("div", { style: { position: "absolute", left: 0, top: 0, width: W, height: H, overflow: "hidden" } }, /* @__PURE__ */ React2.createElement("svg", { width: "0", height: "0", style: { position: "absolute" } }, /* @__PURE__ */ React2.createElement("defs", null, blurDefs)), maskLayer, front.map((t, i) => renderTitle(t, i)), caption, leak);
}
export {
  Reel as default
};
`;

// plugins/podcast-hook-captions/src/motion/grade.tsx
import React from "react";
var SPEAKER_GRADE = { sat: 1.6, r: 1.07, g: 1, b: 0.89, slope: 1.1, off: -0.035 };
var BROLL_GRADE = { sat: 1.2, r: 1.06, g: 1, b: 0.9, slope: 1.08, off: -0.02 };

// plugins/podcast-hook-captions/src/pipeline/apply.ts
var LOOK_LABEL = "Reel Look";
var GRAPHIC_LABEL = "Reel Titles";
var PLACE_BROLL = `const placed: any[] = [];
for (const b of BROLL) {
  const res: any = await d.overlayResource({ resource: p.resource(b.rid), over: await d.rangeAtFrames(b.start, b.end), sourceStartSeconds: b.offset });
  const all = await d.clips({ trackScope: "all" });
  const video: any = all.filter((c: any) => c.trackKind === "video" && c.resourceId === b.rid && c.startFrame === b.start)[0];
  if (!video) throw new Error("B-roll clip was not placed.");
  const audio = all.filter((c: any) => c.trackKind === "audio" && c.resourceId === b.rid && c.startFrame === b.start);
  if (audio.length) await d.removeClips(audio);
  const again: any = (await d.clips({ trackScope: "all" })).find((c: any) => c.clipId === video.clipId);
  await d.setClipTransform({ clip: again, scale: stretch(b.sw, b.sh), position: { x: 0, y: 0 }, rotation: 0 });
  const again2: any = (await d.clips({ trackScope: "all" })).find((c: any) => c.clipId === video.clipId);
  await d.addVideoEffect({ clip: again2, label: ${J(LOOK_LABEL)}, tsxCode: LOOK, parameters: b.data, editableParameters: [] });
  placed.push({ clipId: video.clipId, inserted: res.inserted });
}
`;
var SOURCE_FILES = `const sourceFiles = async (p: any) => {
  const files: any[] = [];
  const walk = (nodes: any[]) => { for (const n of nodes || []) { if (n.type === "dir") walk(n.children); else files.push(n); } };
  const tree: any = await p.sourceFiles();
  // Over 200 files the overview is a per-folder summary; read each folder's full list then.
  if ("fileTree" in tree) walk(tree.fileTree);
  else for (const f of tree.folders || []) { const t: any = await p.sourceFiles({ folder: f.name }); walk("fileTree" in t ? t.fileTree : []); }
  return files;
};
const samePath = (a: string, b: string) => String(a).replace(/\\\\/g, "/").toLowerCase() === String(b).replace(/\\\\/g, "/").toLowerCase();
`;
async function importFiles(sdk, pid, paths) {
  return script(
    sdk,
    "Add generated media to the Project",
    `const p = selects.project(${J(pid)});
${SOURCE_FILES}const paths: string[] = ${J(paths)};
const have = await sourceFiles(p);
const missing = paths.filter((path) => !have.some((x: any) => samePath(x.path, path)));
if (missing.length) await p.importFiles({ paths: missing });
const files = missing.length ? await sourceFiles(p) : have;
return paths.map((path) => { const f = files.find((x: any) => samePath(x.path, path)); return { id: f ? f.resourceId : null, path, w: f?.frameSize?.width || 0, h: f?.frameSize?.height || 0 }; });`,
    true
  );
}
function brollPlacements(plan, brolls) {
  return plan.broll.map((b, i) => {
    const r = brolls[b.clip];
    if (!r || !r.id) return null;
    return {
      rid: r.id,
      start: b.start,
      end: b.end,
      offset: b.offsetSeconds,
      sw: r.w || 1080,
      sh: r.h || 1920,
      data: { mode: "card", kind: b.kind, W: plan.W, H: plan.H, fps: plan.fps, sw: r.w || 1080, sh: r.h || 1920, start: b.start, dur: b.end - b.start, uid: "b" + i, gridZoom: plan.gridZoom, grade: BROLL_GRADE }
    };
  }).filter(Boolean);
}
async function applyLook(sdk, rid, pid, plan, clips, shots, brolls, grade = SPEAKER_GRADE) {
  const mainData = clips.map((c) => ({
    clipId: c.clipId,
    sw: c.sw || 1920,
    sh: c.sh || 1080,
    data: {
      mode: "main",
      W: plan.W,
      H: plan.H,
      fps: plan.fps,
      sw: c.sw || 1920,
      sh: c.sh || 1080,
      start: c.s,
      uid: "m" + c.clipId,
      shots: shots.filter((s) => s.to > c.s && s.from < c.e).map((s) => ({ from: s.from, to: s.to, ...s.rect })),
      camera: plan.camera,
      free: plan.free,
      grade
    }
  }));
  const brollData = brollPlacements(plan, brolls);
  return script(
    sdk,
    "Reframe, grade and place B-roll",
    `const d = selects.draft(${J(rid)});
const p = selects.project(${J(pid)});
const LOOK = ${J(lookCode)};
const MAIN: any[] = ${J(mainData)};
const BROLL: any[] = ${J(brollData)};
const stretch = (sw: number, sh: number) => { const c = Math.min(${plan.W} / sw, ${plan.H} / sh); return { x: ${plan.W} / (sw * c), y: ${plan.H} / (sh * c) }; };
const mains = async () => (await d.clips({ trackScope: "main" })).filter((c: any) => c.trackKind === "main" && c.resourceId != null);
for (const m of MAIN) {
  const clip: any = (await mains()).find((c: any) => c.clipId === m.clipId);
  if (!clip) throw new Error("Main clip " + m.clipId + " is gone.");
  await d.setClipTransform({ clip, scale: stretch(m.sw, m.sh), position: { x: 0, y: 0 }, rotation: 0 });
}
for (const m of MAIN) {
  const clip: any = (await mains()).find((c: any) => c.clipId === m.clipId);
  await d.addVideoEffect({ clip, label: ${J(LOOK_LABEL)}, tsxCode: LOOK, parameters: m.data, editableParameters: [] });
}
${PLACE_BROLL}const saved = await d.commitAll("Podcast Hook Captions: reframe, look and B-roll");
return { commitId: saved.commitId, placed };`,
    true
  );
}
async function finishReel(sdk, rid, pid, plan, data, soundId, brolls, mainDb = 0) {
  const brollData = brollPlacements(plan, brolls);
  return script(
    sdk,
    "Add B-roll, titles, captions and sound",
    `const d = selects.draft(${J(rid)});
const p = selects.project(${J(pid)});
const LOOK = ${J(brollData.length ? lookCode : "")};
const BROLL: any[] = ${J(brollData)};
const stretch = (sw: number, sh: number) => { const c = Math.min(${plan.W} / sw, ${plan.H} / sh); return { x: ${plan.W} / (sw * c), y: ${plan.H} / (sh * c) }; };
${PLACE_BROLL}const g = await d.addMotionGraphic({ label: ${J(GRAPHIC_LABEL)}, tsxCode: ${J(reelCode)}, parameters: ${J(data)}, editableParameters: [], within: await d.rangeAtFrames(0, ${plan.endFrame}) });
let sound: any = null;
const sid: string | null = ${J(soundId)};
if (sid) sound = await d.overlayResource({ resource: p.resource(sid), over: await d.rangeAtFrames(0, ${plan.endFrame}) });
const gain: number = ${J(Math.round(mainDb * 10) / 10)};
for (const id of (await d.clips({ trackScope: "main" })).filter((c: any) => c.trackKind === "main" && c.resourceId != null).map((c: any) => c.clipId)) {
  const clip: any = (await d.clips({ trackScope: "main" })).find((c: any) => c.clipId === id);
  if (clip) await d.setClipAudio({ clip, volumeDb: gain });
}
const saved = await d.commitAll("Podcast Hook Captions: B-roll, titles, captions and sound");
return { commitId: saved.commitId, graphic: g.clipId, placed, sound: sound ? sound.inserted : 0 };`,
    true
  );
}
async function stripReel(sdk, rid, pid, folder) {
  return script(
    sdk,
    "Clear the previous reel layers",
    `const d = selects.draft(${J(rid)});
const p = selects.project(${J(pid)});
${SOURCE_FILES}const root = String(${J(folder)}).replace(/\\\\/g, "/").toLowerCase().replace(/\\/?$/, "/");
const ids: string[] = (await sourceFiles(p)).filter((f: any) => f.resourceId && String(f.path).replace(/\\\\/g, "/").toLowerCase().startsWith(root)).map((f: any) => f.resourceId);
let removedEffects = 0;
for (let guard = 0; guard < 200; guard += 1) {
  let hit: any = null;
  for (const c of await d.clips({ trackScope: "all" })) {
    if (c.resourceId == null || (c.trackKind !== "main" && c.trackKind !== "video")) continue;
    const e = (await d.videoEffects(c)).find((x: any) => x.name === ${J(LOOK_LABEL)});
    if (e) { hit = e; break; }
  }
  if (!hit) break;
  await d.removeVideoEffect(hit);
  removedEffects += 1;
}
const graphics = (await d.motionGraphics()).filter((g: any) => g.name === ${J(GRAPHIC_LABEL)});
for (const g of graphics) { const cur = (await d.motionGraphics()).find((x: any) => x.clip.clipId === g.clip.clipId); if (cur) await d.removeClips(cur.clip); }
const extra = (await d.clips({ trackScope: "all" })).filter((c: any) => c.resourceId != null && ids.includes(c.resourceId) && c.trackKind !== "main");
if (extra.length) await d.removeClips(extra);
// Back to unity voice gain (a build mutes the Main clips under its mastered soundtrack), so the next
// build renders the voice as it really is.
let reset = 0;
for (const id of (await d.clips({ trackScope: "main" })).filter((c: any) => c.trackKind === "main" && c.resourceId != null).map((c: any) => c.clipId)) {
  const clip: any = (await d.clips({ trackScope: "main" })).find((c: any) => c.clipId === id);
  if (clip) { const r: any = await d.setClipAudio({ clip, volumeDb: 0 }); if (r.diff && r.diff.opCount) reset += 1; }
}
if (!removedEffects && !graphics.length && !extra.length && !reset) return { removedEffects, graphics: 0, clips: 0, commitId: null };
const saved = await d.commitAll("Podcast Hook Captions: clear for rebuild");
return { removedEffects, graphics: graphics.length, clips: extra.length, commitId: saved.commitId };`,
    true
  );
}

// plugins/podcast-hook-captions/src/motion/camera.ts
function ease(kind, p) {
  switch (kind) {
    case "lin":
      return [p, 1];
    case "o":
      return [1 - Math.pow(1 - p, 3), 3 * Math.pow(1 - p, 2)];
    case "i":
      return [p * p * p, 3 * p * p];
    case "whip":
      return p < 0.5 ? [16 * Math.pow(p, 5), 80 * Math.pow(p, 4)] : [1 - Math.pow(-2 * p + 2, 5) / 2, 80 * Math.pow(1 - p, 4)];
    case "io":
    default:
      return p < 0.5 ? [4 * p * p * p, 12 * p * p] : [1 - Math.pow(-2 * p + 2, 3) / 2, 12 * Math.pow(1 - p, 2)];
  }
}
function camAt(keys, frame) {
  let z = 1;
  let x = 0;
  let y = 0;
  let vz = 0;
  let vx = 0;
  let vy = 0;
  for (const k of keys || []) {
    if (frame < k.at) break;
    const d = Math.max(0, k.d);
    const p = d <= 0 ? 1 : Math.min(1, (frame - k.at) / d);
    const [e, de] = ease(k.e, p);
    const z0 = z;
    const x0 = x;
    const y0 = y;
    z = z0 + (k.z - z0) * e;
    x = x0 + (k.x - x0) * e;
    y = y0 + (k.y - y0) * e;
    if (d > 0 && p < 1) {
      vz = (k.z - z0) * de / d;
      vx = (k.x - x0) * de / d;
      vy = (k.y - y0) * de / d;
    } else {
      vz = 0;
      vx = 0;
      vy = 0;
    }
  }
  return { z, x, y, vz, vx, vy };
}

// plugins/podcast-hook-captions/src/plan.ts
function buildPlan(input) {
  const { fps, W, H, endFrame, words, shots } = input;
  const picks = input.picks || {};
  const F2 = (n30) => Math.max(1, Math.round(n30 * fps / 30));
  const notes = [];
  const wAt = (i) => words[Math.max(0, Math.min(words.length - 1, i))];
  const valid = (ids) => Array.isArray(ids) && ids.length > 0 && ids.every((i) => Number.isInteger(i) && i >= 0 && i < words.length);
  const clean = (t) => String(t).toUpperCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  const W_ = (ids) => ids.map((i) => ({ t: clean(words[i].t), at: words[i].s }));
  const firstOf = (ids) => Math.min(...ids.flat().map((i) => words[i].s));
  const lastEnd = (ids) => Math.max(...ids.flat().map((i) => words[i].e));
  const shotAt = (f) => shots.find((s) => f >= s.from && f < s.to) || shots[shots.length - 1];
  const face0 = (f) => {
    const s = shotAt(f);
    return s && s.face ? s.face : { cx: 0.46, cy: 0.29, h: 0.3 };
  };
  const place = (f, z, fx, fy) => {
    const b = face0(f);
    return { z, x: (fx - 0.5 - z * (b.cx - 0.5)) * 100, y: (fy - 0.5 - z * (b.cy - 0.5)) * 100 };
  };
  const faceOn = (f, s) => {
    const b = face0(f);
    return { fx: 0.5 + s.z * (b.cx - 0.5) + s.x / 100, fy: 0.5 + s.z * (b.cy - 0.5) + s.y / 100 };
  };
  const cover = (f, s) => {
    const sh = shotAt(f);
    if (!sh) return s;
    const r = sh.rect;
    const zMin = Math.max(W / r.w, H / r.h) * 1.001;
    const z = Math.max(s.z, zMin);
    const lo = (a, size, frame) => frame - frame / 2 - z * (a + size - frame / 2);
    const hi = (a, frame) => -frame / 2 - z * (a - frame / 2);
    const tx = Math.min(hi(r.x, W), Math.max(lo(r.x, r.w, W), s.x / 100 * W));
    const ty = Math.min(hi(r.y, H), Math.max(lo(r.y, r.h, H), s.y / 100 * H));
    return { z, x: tx / W * 100, y: ty / H * 100 };
  };
  const camera = [];
  let cur = { z: 1, x: 0, y: 0 };
  const move = (at, d, next, e = "io", free2 = false) => {
    const s = free2 ? next : cover(at + d, next);
    camera.push({ at: Math.round(at), d: Math.max(0, Math.round(d)), z: +s.z.toFixed(5), x: +s.x.toFixed(3), y: +s.y.toFixed(3), e });
    cur = s;
  };
  let A = picks.stackA && valid(picks.stackA.lead.concat(picks.stackA.key)) ? picks.stackA : null;
  let B = picks.stackB && valid(picks.stackB.lines.flat().concat(picks.stackB.key)) ? picks.stackB : null;
  let P = picks.punch && valid(picks.punch.lead.concat(picks.punch.key)) ? picks.punch : null;
  let Fn = picks.final && valid(picks.final.lines.flat().concat(picks.final.key)) ? picks.final : null;
  let R = picks.broll && Number.isInteger(picks.broll.from) && Number.isInteger(picks.broll.to) && picks.broll.from >= 0 && picks.broll.to < words.length && picks.broll.to >= picks.broll.from ? picks.broll : null;
  const opener = picks.opener && picks.opener.key ? picks.opener : null;
  const strengthen = (lines, key) => {
    if (!weakKey(key.map((i) => words[i].t))) return { lines, key };
    const all = lines.flat();
    let p = -1;
    all.forEach((i, k) => {
      const t = clean(words[i].t);
      if (t.length >= 4 && !weakKey([t]) && (p < 0 || t.length >= clean(words[all[p]].t).length)) p = k;
    });
    if (p < 0) return null;
    const cut = all[p];
    notes.push("Weak title key replaced with " + clean(words[cut].t) + ".");
    return { lines: lines.map((l) => l.filter((i) => i < cut)).filter((l) => l.length), key: [cut] };
  };
  if (B) {
    const s = strengthen(B.lines, B.key);
    B = s && s.lines.length ? s : B;
  }
  if (Fn) {
    const s = strengthen(Fn.lines, Fn.key);
    Fn = s && s.lines.length ? s : Fn;
  }
  if (P) {
    const s = strengthen([P.lead], P.key);
    P = s && s.lines.length ? { lead: s.lines.flat(), key: s.key } : P;
  }
  const startOf = {
    A: () => A ? firstOf([A.lead, A.key]) : Infinity,
    B: () => B ? firstOf([...B.lines, B.key]) : Infinity,
    P: () => P ? firstOf([P.lead, P.key]) : Infinity,
    Fn: () => Fn ? firstOf([...Fn.lines, Fn.key]) : Infinity
  };
  if (A && startOf.A() < F2(84)) {
    notes.push("Stack A starts too early for the opening set; dropped.");
    A = null;
  }
  if (A && B && startOf.B() < lastEnd([A.lead, A.key]) - F2(2)) {
    notes.push("Stack B overlaps stack A; dropped.");
    B = null;
  }
  if (!A && B) {
    notes.push("Stack B needs stack A; dropped.");
    B = null;
  }
  const afterStacks = B ? lastEnd([...B.lines, B.key]) : A ? lastEnd([A.lead, A.key]) : F2(150);
  if (P && startOf.P() < afterStacks - F2(2)) {
    notes.push("Punch overlaps the stacks; dropped.");
    P = null;
  }
  if (Fn && startOf.Fn() > endFrame - F2(43)) {
    notes.push("Final block too close to the end; dropped.");
    Fn = null;
  }
  const titles = [];
  const capHide = [];
  const capY = [];
  const setOpacity = [];
  const gridZoom = [];
  const gridTexture = [];
  const flashes = [];
  const broll = [];
  const sfx = [];
  const S = (f, kind, gain = 1) => sfx.push({ t: Math.max(0, f) / fps, kind, gain });
  const aStart = startOf.A();
  const exitAt = Math.round(Math.max(F2(54), Math.min(F2(121), (Number.isFinite(aStart) ? aStart : F2(200)) - F2(46))));
  const setEnd = Math.round(Math.min(exitAt + F2(29), (Number.isFinite(aStart) ? aStart : Infinity) - F2(8)));
  const b0 = face0(0);
  camera.push({ at: 0, d: 0, z: 1, x: 0, y: 0, e: "lin" });
  move(F2(4), F2(24), place(F2(4), 0.95, b0.cx, Math.max(b0.cy + 0.16, 0.33 + 0.475 * b0.h)), "o", true);
  const dropEnd = F2(28);
  if (opener) {
    const lead = String(opener.lead || "").trim().toUpperCase().split(/\s+/).filter(Boolean);
    const keyText = String(opener.key).trim().toUpperCase();
    const t0 = F2(13);
    titles.push({
      kind: "opener",
      start: t0,
      end: exitAt + F2(18),
      anchor: dropEnd,
      behind: true,
      lines: [
        { role: "lead", words: lead.map((t, i) => ({ t, at: t0 + i * F2(3) })) },
        { role: "key", words: [{ t: keyText, at: t0 + lead.length * F2(3) + F2(3) }] }
      ]
    });
  }
  move(exitAt, F2(18), place(exitAt, 0.95 * 1.11, b0.cx, 0.3), "io", true);
  setOpacity.push([0, 0], [F2(3), 1, "io"], [setEnd + 1, 1], [setEnd + F2(19), 0, "lin"]);
  const settle = Math.min(F2(68), setEnd - F2(32));
  const rise0 = Math.max(settle + 1, setEnd - F2(64));
  gridZoom.push([0, 1], [F2(7), 1], [F2(7) + 1, 1.86, "lin"], [Math.max(F2(9), F2(7) + 2), 1.685, "lin"], [F2(12), 1.408, "lin"], [F2(19), 1.189, "lin"], [settle, 1, "o"]);
  gridZoom.push([rise0, 1], [setEnd - F2(11), 1.211, "i"], [setEnd - F2(4), 1.409, "lin"], [setEnd - F2(1), 1.69, "lin"], [setEnd, 1.96, "lin"], [setEnd + 1, 1, "lin"]);
  capY.push([0, exitAt + F2(4), 0.658]);
  S(0, "deep_woosh", 0.9);
  S(exitAt + F2(4), "movie_title", 0.85);
  if (opener) {
    const nLead = String(opener.lead || "").trim().split(/\s+/).filter(Boolean).length;
    for (let i = 0; i < nLead; i += 1) S(F2(13) + i * F2(3), "tick", 0.35);
  }
  if (!A || aStart - (exitAt + F2(35)) > F2(20)) {
    const fo = faceOn(exitAt + F2(18), cur);
    move(exitAt + F2(35), F2(9), place(exitAt + F2(35), cur.z * 1.14, fo.fx, fo.fy), "io");
  }
  let lastBeat = setEnd;
  if (A) {
    const aS = aStart;
    const zA = Math.max(0.95, cur.z * 0.79);
    move(aS - F2(2), F2(24), place(aS, zA, 0.29, faceOn(aS, cur).fy), "io");
    const chinA = faceOn(aS + F2(22), cur).fy + cur.z * face0(aS).h / 2;
    const aTop = Math.max(0.46, Math.min(0.64, chinA + 0.035));
    S(aS - F2(2), "woosh_medium", 0.8);
    A.lead.forEach((i) => S(words[i].s, "tick", 0.45));
    A.key.forEach((i, k) => S(words[i].s, k === 0 ? "es_whoosh" : "tick", k === 0 ? 0.7 : 0.5));
    const aKeyEnd = lastEnd([A.key]);
    let aEnd;
    let arrowAt = null;
    if (B) {
      const bS = startOf.B();
      const whipAt = Math.max(aKeyEnd, bS - F2(2));
      arrowAt = Math.max(aKeyEnd - F2(2), whipAt - F2(6));
      move(whipAt - F2(3), F2(9), place(whipAt, cur.z, 0.87, faceOn(whipAt, cur).fy), "io");
      S(whipAt - F2(8), "deep_woosh", 0.85);
      const bKey = B.key.map((i) => words[i]);
      const bLast = lastEnd([...B.lines, B.key]);
      let backAt = Math.max(bLast + F2(6), bKey[0].s + F2(17));
      const pNext = startOf.P();
      if (Number.isFinite(pNext)) backAt = Math.max(bKey[0].s + F2(8), Math.min(backAt, pNext - F2(7)));
      aEnd = Math.max(whipAt + F2(10), backAt - F2(6));
      titles.push({
        kind: "stackB",
        start: bS,
        end: backAt + F2(6),
        anchor: whipAt + F2(6),
        lines: [...B.lines.map((l) => ({ role: "lead", words: W_(l) })), { role: "key", words: W_(B.key) }]
      });
      capHide.push([bS, backAt + F2(6)]);
      B.lines.flat().forEach((i) => S(words[i].s, "tick", 0.4));
      S(bKey[0].s + F2(2), "bass_drop", 0.9);
      move(backAt - F2(3), F2(9), place(backAt, cur.z, 0.47, faceOn(backAt, cur).fy), "io");
      S(backAt - F2(4), "woosh_medium", 0.8);
      lastBeat = backAt + F2(6);
    } else {
      aEnd = aKeyEnd + F2(24);
      move(aKeyEnd + F2(15), F2(9), place(aKeyEnd + F2(18), cur.z / 0.79, 0.47, faceOn(aKeyEnd, cur).fy), "io");
      S(aKeyEnd + F2(14), "woosh_medium", 0.8);
      lastBeat = aEnd;
    }
    titles.push({
      kind: "stackA",
      start: firstOf([A.lead, A.key]),
      end: aEnd,
      anchor: aS + F2(22),
      lines: [{ role: "lead", words: W_(A.lead) }, { role: "key", words: W_(A.key) }],
      arrowAt,
      y: +aTop.toFixed(4)
    });
    if (arrowAt != null) S(arrowAt, "tick", 0.45);
    capHide.push([firstOf([A.lead, A.key]), aEnd]);
  }
  const pS = startOf.P();
  if (Number.isFinite(pS) ? pS - lastBeat > F2(60) : endFrame - lastBeat > F2(90)) {
    const at = lastBeat + F2(36);
    const fo = faceOn(at, cur);
    move(at, F2(27), place(at, cur.z * 1.19, fo.fx, fo.fy), "io");
    S(at + F2(3), "es_whoosh", 0.6);
  }
  let punchEnd = 0;
  let blowAt = 0;
  if (P) {
    const keyWords = P.key.map((i) => words[i]);
    const lastKey = keyWords[keyWords.length - 1];
    blowAt = Math.max(lastKey.s + F2(25), lastKey.e + F2(4));
    const fo = faceOn(pS, cur);
    move(pS + F2(5), F2(12), place(pS + F2(5), Math.max(1, cur.z * 0.82), fo.fx, fo.fy), "io");
    move(blowAt - F2(3), F2(9), place(blowAt, cur.z * 1.21, fo.fx, fo.fy), "io");
    punchEnd = blowAt + F2(40);
    titles.push({ kind: "punch", start: pS, end: punchEnd, anchor: null, lines: [{ role: "lead", words: W_(P.lead) }, { role: "key", words: W_(P.key) }], blowAt });
    capHide.push([pS, blowAt + F2(9)]);
    S(pS + F2(3), "es_whoosh", 0.7);
    keyWords.forEach((w, k) => S(w.s, k === keyWords.length - 1 ? "hit_reverb" : "tick", k === keyWords.length - 1 ? 1 : 0.5));
    S(blowAt - F2(7), "deep_woosh", 0.85);
    lastBeat = blowAt + F2(9);
  }
  const fStart = startOf.Fn();
  if (R) {
    let bS = Math.max(words[R.from].s - F2(3), P ? blowAt + F2(24) : lastBeat + F2(6));
    const room = (Number.isFinite(fStart) ? fStart - F2(45) : endFrame - F2(30)) - bS;
    const len = Math.min(F2(165), Math.max(F2(105), words[R.to].e + F2(6) - bS), room);
    if (len >= F2(60)) {
      const peak = bS;
      bS = peak + F2(1);
      const bE = bS + len;
      flashes.push(peak);
      if (P && punchEnd > peak + F2(1)) {
        punchEnd = peak + F2(1);
        titles[titles.length - 1].end = punchEnd;
      } else if (P) {
        titles[titles.length - 1].end = Math.min(punchEnd, peak + F2(1));
      }
      const c1 = bS + Math.round(len * 0.47);
      const c2 = c1 + Math.round(len * 0.34);
      broll.push({ kind: "portrait", start: bS, end: c1, clip: 0, offsetSeconds: 0 });
      broll.push({ kind: "landscape", start: c1, end: c2, clip: 1, offsetSeconds: 0 });
      broll.push({ kind: "portrait2", start: c2, end: bE, clip: 0, offsetSeconds: (c1 - bS) / fps + 0.3 });
      const settleB = Math.min(bS + F2(73), bE - F2(30));
      const riseB = Math.max(settleB + 1, bE - F2(55));
      gridZoom.push([bS - 1, 1], [bS, 2.15, "lin"], [bS + F2(1), 1.935, "lin"], [bS + F2(3), 1.638, "lin"], [bS + F2(7), 1.379, "lin"], [bS + F2(15), 1.184, "lin"], [settleB, 1, "o"]);
      const pushB = bE + F2(21);
      const cutB = pushB + 3;
      gridZoom.push([riseB, 1], [bE + F2(6), 1.169, "i"], [bE + F2(18), 1.392, "lin"], [pushB, 1.703, "lin"], [pushB + 1, 1.9, "lin"], [pushB + 2, 2.11, "lin"], [cutB, 1, "lin"]);
      gridTexture.push([cutB - F2(11), 1], [cutB - F2(4), 0, "lin"]);
      const fc = face0(bE);
      move(bE - 1, 0, place(bE, 1, 0.47, 0.756), "lin", true);
      move(bE, F2(9), place(bE, 1, 0.47, 0.26), "io", true);
      setOpacity.push([bE - 1, 0], [bE, 1], [cutB, 1], [Math.max(cutB + F2(12), bE + F2(48)), 0, "lin"]);
      void fc;
      S(peak - F2(4), "camera", 0.9);
      S(bS + F2(2), "movie_title", 0.8);
      S(c1 - F2(6), "deep_woosh", 0.75);
      S(c2 + F2(1), "woosh_medium", 0.75);
      S(bE - F2(1), "deep_woosh", 0.85);
      S(bE + F2(9), "movie_title", 0.75);
      lastBeat = bE + F2(20);
    } else notes.push("No room for B-roll between the punch and the final block; skipped.");
  }
  if (P && !flashes.length) {
    titles[titles.length - 1].end = Math.min(punchEnd, Number.isFinite(fStart) ? fStart - F2(4) : endFrame);
  }
  let panFrom = endFrame - F2(39);
  if (Fn) {
    const k = words[Fn.key[0]];
    const last = lastEnd([...Fn.lines, Fn.key]);
    const bAt = Math.max(k.s + F2(25), last + F2(2));
    const end = Math.min(endFrame, bAt + F2(6));
    titles.push({ kind: "final", start: fStart, end, anchor: null, lines: [...Fn.lines.map((l) => ({ role: "lead", words: W_(l) })), { role: "key", words: W_(Fn.key) }], blowAt: bAt });
    capHide.push([fStart, end]);
    Fn.lines.flat().forEach((i, j) => j > 0 && S(words[i].s, "tick", 0.4));
    S(k.s, "es_whoosh", 0.7);
    S(bAt - F2(3), "deep_woosh", 0.8);
    S(end, "woosh_medium", 0.75);
    panFrom = end + F2(2);
  }
  if (endFrame - panFrom >= F2(12)) {
    const fo = faceOn(panFrom, cur);
    move(panFrom, endFrame - panFrom, place(panFrom, cur.z, Math.min(0.62, fo.fx + 0.08), fo.fy), "lin");
  }
  camera.sort((a, b) => a.at - b.at);
  {
    const busy = camera.map((k) => [k.at - F2(12), k.at + k.d + F2(12)]);
    broll.forEach((b) => busy.push([b.start - F2(12), b.end + F2(24)]));
    titles.forEach((t) => (t.kind === "final" || t.kind === "punch") && busy.push([t.start - F2(6), t.end + F2(4)]));
    busy.push([0, setEnd + F2(12)]);
    busy.sort((a, b) => a[0] - b[0]);
    const gaps = [];
    let at = 0;
    for (const [a, b] of busy) {
      if (a - at > F2(96)) gaps.push([at, a]);
      at = Math.max(at, b);
    }
    if (endFrame - at > F2(96)) gaps.push([at, endFrame]);
    const extra = [];
    let side = 1;
    for (const [g0, g1] of gaps) {
      let t = g0 + F2(14);
      while (t + F2(44) < g1) {
        const near = words.find((w) => w.s >= t - F2(8) && w.s <= t + F2(10));
        const s0 = near ? near.s : t;
        const base = camAt(camera.concat(extra).sort((a, b) => a.at - b.at), s0);
        const st = { z: base.z, x: base.x, y: base.y };
        const fo = faceOn(s0, st);
        const inn = cover(s0 + F2(7), place(s0, st.z * 1.13, fo.fx + side * 0.025, fo.fy));
        extra.push({ at: s0, d: F2(7), z: +inn.z.toFixed(5), x: +inn.x.toFixed(3), y: +inn.y.toFixed(3), e: "io" });
        extra.push({ at: s0 + F2(34), d: F2(12), z: +st.z.toFixed(5), x: +st.x.toFixed(3), y: +st.y.toFixed(3), e: "io" });
        S(s0, "es_whoosh", 0.35);
        side = -side;
        t = s0 + F2(66);
      }
    }
    camera.push(...extra);
    camera.sort((a, b) => a.at - b.at);
  }
  const merge = (rs) => rs.sort((a, b) => a[0] - b[0]);
  gridZoom.sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < gridZoom.length; i += 1) if (gridZoom[i][0] <= gridZoom[i - 1][0]) gridZoom[i][0] = gridZoom[i - 1][0] + 1;
  gridTexture.sort((a, b) => a[0] - b[0]);
  setOpacity.sort((a, b) => a[0] - b[0]);
  sfx.sort((a, b) => a.t - b.t);
  const free = [[0, setEnd + F2(19)]];
  if (broll.length) free.push([broll[broll.length - 1].end - 1, broll[broll.length - 1].end + F2(48)]);
  return { fps, W, H, endFrame, camera, titles, setOpacity, gridZoom, gridTexture, capHide: merge(capHide), capY, free, flashes, broll, sfx, notes };
}

// plugins/podcast-hook-captions/src/pipeline/make.ts
var FILLER = /^(uh+|um+|uhm|erm|er|ah+|hmm+|mm+)[.,!?]*$/i;
var STEPS = [
  ["pick", "Pick the moment and write the titles"],
  ["draft", "Create the 9:16 reel Draft"],
  ["faces", "Find the speaker and reframe"],
  ["look", "Camera, grade and B-roll cards"],
  ["mattes", "Speaker mattes (VEED)"],
  ["sound", "Music and sound effects"],
  ["titles", "Titles, captions and set"]
];
var jobDir = (reelId) => fs().join(dataRoot(), "reels", reelId);
async function saveJob(job) {
  await fs().writeFile(fs().join(jobDir(job.reelId), "job.json"), J(job));
}
async function loadJob(reelId) {
  try {
    return JSON.parse(String(await fs().readFile(fs().join(jobDir(reelId), "job.json"), "utf8")));
  } catch {
    return null;
  }
}
function preflight() {
  const v = hostVersion();
  if (v && versionBelow(v, "2.0.512")) throw new Error("This needs Selects 2.0.512 or later (this is " + v + ").");
  mediaGeneration();
}
async function makeReel(sdk, ctx, opts, onStep) {
  const t0 = Date.now();
  preflight();
  const pid = ctx.projectId;
  onStep("pick", "run", "Reading the transcript\u2026");
  const src = await readSource(sdk, ctx.sequenceId);
  if (src.words.length < 30) throw new Error("This Draft has too few transcribed words for a reel.");
  onStep("pick", "run", "Choosing the moment and writing titles\u2026");
  const choice = await chooseAll(sdk, src.words, src.fps, opts.seconds, opts.hint);
  const ranges = choice.spans.map(([a, b]) => {
    const prev = src.words[a - 1];
    const next = src.words[b + 1];
    const s = Math.max(prev ? prev.e : 0, src.words[a].s - Math.round(0.1 * src.fps));
    const e = Math.min(next ? next.s - 1 : src.words[b].e + Math.round(1 * src.fps), src.words[b].e + Math.round(1 * src.fps));
    return [s, e];
  });
  onStep("pick", "done", choice.why || "");
  onStep("draft", "run", "Creating the Draft\u2026");
  const reelId = await createReel(sdk, pid, ctx.sequenceId, src.name + " \xB7 Reel", ranges);
  await fs().mkdir(jobDir(reelId), { recursive: true });
  const reel = await readReel(sdk, pid, reelId);
  const byKey = /* @__PURE__ */ new Map();
  reel.words.forEach((w, i) => byKey.set(w.ss + "|" + w.t, i));
  const map = /* @__PURE__ */ new Map();
  for (const w of src.words) {
    const k = byKey.get(w.ss + "|" + w.t);
    if (k != null) map.set(w.i, k);
  }
  const job = { version: 2, projectId: pid, sourceId: ctx.sequenceId, reelId, name: src.name + " \xB7 Reel", why: choice.why, issues: choice.issues, picks: mapPicks(choice.picks, map) };
  await saveJob(job);
  onStep("draft", "done", (reel.endFrame / reel.fps).toFixed(1) + " s");
  const notes = await build(sdk, job, reel, onStep, opts);
  if (choice.missing.length) notes.unshift("Titles not found in the transcript and left out: " + choice.missing.join("; "));
  await script(sdk, "Open the reel", `return await selects.editor.openDraft(${J(reelId)});`).catch(() => null);
  return { reelId, name: job.name, notes, seconds: (Date.now() - t0) / 1e3, credits: job.brollCredits };
}
async function rebuildReel(sdk, reelId, onStep, opts = {}) {
  const t0 = Date.now();
  preflight();
  const job = await loadJob(reelId);
  if (!job) throw new Error("This reel has no saved job to rebuild from.");
  onStep("pick", "skip", "kept");
  onStep("draft", "run", "Clearing the previous layers\u2026");
  await stripReel(sdk, reelId, job.projectId, jobDir(reelId));
  const reel = await readReel(sdk, job.projectId, reelId);
  onStep("draft", "done", (reel.endFrame / reel.fps).toFixed(1) + " s");
  const notes = await build(sdk, job, reel, onStep, opts);
  return { reelId, name: job.name, notes, seconds: (Date.now() - t0) / 1e3, credits: job.brollCredits };
}
async function build(sdk, job, reel, onStep, opts) {
  const pid = job.projectId;
  const dir = jobDir(job.reelId);
  const notes = [];
  const say = (id) => (s) => onStep(id, "run", s);
  const W = 1080;
  const H = 1920;
  const key = job.reelId.replace(/-/g, "").slice(0, 16) + "-" + Date.now().toString(36);
  const picks = job.picks;
  const savedBroll = await Promise.all((job.brollPaths || []).map(async (path) => path && await fs().exists(path) ? path : null));
  const style = ". Realistic cinematic stock footage, natural warm light, shallow depth of field, smooth slow camera move, no text, no logos, no captions.";
  const gen = async (slot, prompt, aspect, dur, label) => {
    const have = job.brollPaths?.[slot];
    if (have && await fs().exists(have)) return Promise.resolve(have);
    try {
      const folder = fs().join(dir, "broll-" + slot);
      const late = await fs().exists(folder) ? (await fs().readdir(folder)).map(String).find((n) => /\.mp4$/i.test(n)) : null;
      if (late) return Promise.resolve(fs().join(folder, late));
    } catch {
    }
    return generate(
      pid,
      {
        key: "phc-b" + slot + "-" + key,
        endpoint: "bytedance/seedance-2.0/fast/text-to-video",
        input: { prompt: prompt + style, aspect_ratio: aspect, duration: dur, resolution: "720p", generate_audio: false },
        folder: fs().join(dir, "broll-" + slot),
        outputName: "reel-broll-" + slot,
        tool: "video",
        recipeId: "reel-broll"
      },
      label,
      void 0,
      12 * 6e4
    ).catch((e) => (notes.push(String(e.message || e)), null));
  };
  const stock = async () => {
    if (job.brollPaths && savedBroll.every(Boolean)) return job.brollPaths;
    const b = picks.broll;
    const words = (t) => String(t || "").split(/\s+/).filter((w) => w.length > 3).slice(0, 3).join(" ");
    const search = Array.isArray(b.search) ? b.search : [];
    const credits = [];
    const folder = fs().join(dir, "stock");
    const first = await stockClip(sdk, [search[0], words(b.portrait), search[1]].filter(Boolean), "portrait", folder, 8).catch((e) => (notes.push("Stock B-roll: " + String(e.message || e)), null));
    if (first) credits.push({ credit: first.credit, url: first.url, service: first.service });
    const second = await stockClip(sdk, [search[1], words(b.landscape), search[0]].filter(Boolean), "landscape", folder, 6, first ? [first.id] : []).catch((e) => (notes.push("Stock B-roll: " + String(e.message || e)), null));
    if (second) credits.push({ credit: second.credit, url: second.url, service: second.service });
    job.brollCredits = credits;
    if (!first && !second) notes.push("No stock B-roll was found for this moment.");
    return [first ? first.path : null, second ? second.path : null];
  };
  let brollJobs = [];
  if (picks.broll) {
    if (stockSearchAvailable()) {
      const both = stock();
      brollJobs = [both.then((r) => r[0]), both.then((r) => r[1])];
    } else if (opts.generate) brollJobs = [gen(0, picks.broll.portrait, "9:16", "5", "B-roll 1"), gen(1, picks.broll.landscape, "16:9", "4", "B-roll 2")];
    else if (savedBroll.some(Boolean)) brollJobs = savedBroll.map((path) => Promise.resolve(path));
    else notes.push("No B-roll: this Selects version has no stock search. Update Selects, or allow AI-generated B-roll in the panel.");
  }
  const musicJob = job.musicPath && await fs().exists(job.musicPath) ? Promise.resolve(job.musicPath) : makeMusic(pid, reel.endFrame / reel.fps, dir, key, () => {
  }).catch((e) => (notes.push("Music: " + String(e.message || e)), null));
  const sfxJob = ensureSfxLibrary(pid, () => {
  }).catch((e) => (notes.push("Sound effects: " + String(e.message || e)), {}));
  onStep("faces", "run", "Preparing face tracking\u2026");
  let faces = job.faces;
  if (!faces || !Object.keys(faces).length || Object.values(faces).some((f) => f.color === void 0)) {
    try {
      const rt = await ensureFaceRuntime(say("faces"));
      onStep("faces", "run", "Finding the speaker\u2026");
      faces = await trackFaces(rt, dir, reel.clips, reel.fps, say("faces"));
      job.faces = faces;
      await saveJob(job);
    } catch (e) {
      notes.push("Face tracking unavailable (" + String(e?.message || e) + "); shots are centred.");
      faces = {};
    }
  }
  const shots = reelShots(W, H, reel.fps, reel.clips, faces);
  onStep("faces", "done", shots.filter((s) => s.face).length + " of " + shots.length + " shots framed on a face");
  const plan = buildPlan({ fps: reel.fps, W, H, endFrame: reel.endFrame, words: reel.words.map((w) => ({ t: w.t, s: w.s, e: w.e })), shots, picks });
  notes.push(...plan.notes);
  await fs().writeFile(fs().join(dir, "plan.json"), J({ picks, plan, shots }));
  onStep("look", "run", "Applying the look\u2026");
  await applyLook(sdk, job.reelId, pid, plan, reel.clips, shots, [], adaptiveGrade(faces));
  onStep("look", "done", picks.broll ? "B-roll cards follow when they are ready" : "");
  onStep("mattes", "run", "Rendering the reel for speaker mattes\u2026");
  const render = fs().join(dir, "render-" + Date.now() + ".mp4");
  await renderDraft(pid, job.reelId, render, say("mattes"));
  let masks = null;
  try {
    const matteDir = fs().join(dir, "mattes-" + Date.now().toString(36));
    await fs().mkdir(matteDir, { recursive: true });
    masks = await makeMattes(sdk, pid, render, reel.endFrame / reel.fps, matteDir, key, say("mattes"));
    onStep("mattes", "done", masks.count + " frames");
  } catch (e) {
    notes.push("Speaker mattes failed (" + String(e.message || e) + "); the set and the behind-the-head title are left out.");
    onStep("mattes", "fail", String(e.message || e));
  }
  onStep("sound", "run", "Waiting for music and sound effects\u2026");
  const [music, lib] = await Promise.all([musicJob, sfxJob]);
  job.musicPath = music;
  let soundId = null;
  try {
    const wav = fs().join(dir, "reel-sound-" + Date.now().toString(36) + ".wav");
    const mixed = await mixSound(plan, render, music, lib || {}, wav, dir);
    const imp = await importFiles(sdk, pid, [wav]);
    soundId = imp[0]?.id || null;
    if (soundId) job.soundIds = [...job.soundIds || [], soundId];
    onStep("sound", "done", "mastered to " + mixed.lufs.toFixed(1) + " LUFS" + (music ? ", music \u221213 dB" : ", no music"));
  } catch (e) {
    notes.push("Sound: " + String(e.message || e));
    onStep("sound", "fail", String(e.message || e));
  }
  await saveJob(job);
  onStep("titles", "run", picks.broll ? "Waiting for B-roll\u2026" : "Adding titles and captions\u2026");
  let brollPaths = await Promise.all(brollJobs);
  if (brollPaths.some(Boolean) && !brollPaths.every(Boolean)) {
    const one2 = brollPaths.find(Boolean);
    brollPaths = brollPaths.map((p) => p || one2);
  }
  let brolls = [];
  if (brollPaths.length && brollPaths.every(Boolean)) {
    const uniq = [...new Set(brollPaths)];
    const imported = await importFiles(sdk, pid, uniq);
    brolls = brollPaths.map((p) => imported.find((x) => x.path === p)).map((x) => ({ id: x.id, w: x.w, h: x.h }));
    job.brollPaths = brollPaths;
    job.brollIds = brolls;
    await saveJob(job);
  } else if (plan.broll.length) {
    notes.push("B-roll could not be generated; the reel has no B-roll cards.");
    plan.broll = [];
    plan.flashes = [];
  }
  onStep("titles", "run", "Adding B-roll, titles and captions\u2026");
  const font = async (file) => {
    try {
      return String(await fs().readFile(fs().join(skillRoot(), "fonts", file), "utf8")).trim();
    } catch {
      return "";
    }
  };
  const heroFontData = await font("SixCaps-Regular.woff2.b64");
  const captionFontData = await font("RobotoFlex-Caption.woff2.b64");
  const leadFontData = await font("RedditSans-Lead.woff2.b64");
  const data = {
    W,
    H,
    fps: reel.fps,
    uid: key.slice(0, 8),
    // Hesitations stay in the audio but never become a caption.
    words: reel.words.filter((w) => !FILLER.test(w.t)).map((w) => [w.t, w.s, w.e]),
    capHide: plan.capHide,
    capY: plan.capY,
    camera: plan.camera,
    titles: plan.titles,
    setOpacity: masks ? plan.setOpacity : [],
    gridZoom: plan.gridZoom,
    gridTexture: plan.gridTexture,
    flashes: plan.flashes,
    masks,
    heroFontData,
    captionFontData,
    leadFontData
  };
  await finishReel(sdk, job.reelId, pid, plan, data, soundId, brolls, soundId ? -60 : 0);
  onStep("titles", "done");
  return notes;
}

// plugins/podcast-hook-captions/src/Panel.tsx
var readStore = (k) => {
  try {
    return localStorage.getItem(k) || "";
  } catch {
    return "";
  }
};
var writeStore = (k, v) => {
  try {
    if (v) localStorage.setItem(k, v);
    else localStorage.removeItem(k);
  } catch {
  }
};
var STORE = "podcast-hook-captions:v2:";
function PodcastHookReel({ sdk, context }) {
  hostUseSdk(sdk);
  const [seconds, setSeconds] = useState(25);
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [steps, setSteps] = useState(STEPS.map(([id, label]) => ({ id, label, state: "wait" })));
  const [result, setResult] = useState(null);
  const [clock, setClock] = useState(0);
  const [isReel, setIsReel] = useState(false);
  const [genBroll, setGenBroll] = useState(() => readStore(STORE + "genBroll") === "1");
  const alive = useRef(true);
  useEffect(() => () => void (alive.current = false), []);
  useEffect(() => {
    try {
      setResult(JSON.parse(localStorage.getItem(STORE + context?.sequenceId) || "null"));
    } catch {
      setResult(null);
    }
    if (!busy) setSteps(STEPS.map(([id, label]) => ({ id, label, state: "wait" })));
    setIsReel(false);
    if (context?.sequenceId) loadJob(context.sequenceId).then((j) => alive.current && setIsReel(!!j)).catch(() => {
    });
  }, [context?.sequenceId]);
  useEffect(() => {
    if (!busy) return;
    const t0 = Date.now();
    const id = setInterval(() => alive.current && setClock(Math.round((Date.now() - t0) / 1e3)), 1e3);
    return () => clearInterval(id);
  }, [busy]);
  const onStep = (id, state, note) => {
    if (!alive.current) return;
    setSteps((cur) => cur.map((s) => s.id === id ? { ...s, state, note: note ?? s.note } : s));
  };
  const make = async (rebuild = false) => {
    if (busy) return;
    if (!context?.sequenceId || !context?.projectId) {
      setError("Open the podcast Draft first.");
      return;
    }
    const host = app();
    const held = host.__phcRunning;
    if (held && Date.now() - held < 40 * 6e4) {
      setError("A reel is already being made in this window. Wait for it to finish.");
      return;
    }
    host.__phcRunning = Date.now();
    setBusy(true);
    setError("");
    setResult(null);
    setSteps(STEPS.map(([id, label]) => ({ id, label, state: "wait" })));
    try {
      const broll = { generate: genBroll };
      const r = rebuild ? await rebuildReel(sdk, context.sequenceId, onStep, broll) : await makeReel(sdk, { projectId: context.projectId, sequenceId: context.sequenceId }, { seconds, hint: hint.trim(), ...broll }, onStep);
      const keep = { ...r, plan: void 0 };
      try {
        localStorage.setItem(STORE + context.sequenceId, JSON.stringify(keep));
      } catch {
      }
      if (alive.current) setResult(keep);
    } catch (e) {
      if (alive.current) {
        setError(String(e?.message || e));
        setSteps((cur) => cur.map((s) => s.state === "run" ? { ...s, state: "fail" } : s));
      }
    } finally {
      host.__phcRunning = 0;
      if (alive.current) setBusy(false);
    }
  };
  const open = async () => {
    if (!result) return;
    await sdk.runScript({ summary: "Open the reel", script: "return await selects.editor.openDraft(" + JSON.stringify(result.reelId) + ");" });
  };
  const icon = (s) => s === "done" ? "\u2713" : s === "run" ? "\u2026" : s === "fail" ? "!" : s === "skip" ? "\u2013" : "\xB7";
  return /* @__PURE__ */ React2.createElement("div", { style: { padding: 16, display: "flex", flexDirection: "column", gap: 14, fontSize: 13, lineHeight: 1.45 } }, /* @__PURE__ */ React2.createElement("div", null, /* @__PURE__ */ React2.createElement("div", { style: { fontSize: 15, fontWeight: 600 } }, "Podcast reel, one click"), /* @__PURE__ */ React2.createElement("div", { style: { color: "var(--panel-muted-fg)" } }, "Turns this podcast Draft into a new 9:16 reel: the strongest moment, face-tracked reframe, camera moves, the speaker cut out onto a grid set, kinetic titles, word captions, B-roll cards, music and sound effects.")), /* @__PURE__ */ React2.createElement("label", { style: { display: "flex", flexDirection: "column", gap: 4 } }, /* @__PURE__ */ React2.createElement("span", null, "Reel length: ", seconds, " s"), /* @__PURE__ */ React2.createElement("input", { type: "range", min: 18, max: 40, step: 1, value: seconds, disabled: busy, onChange: (e) => setSeconds(Number(e.target.value)) })), /* @__PURE__ */ React2.createElement("label", { style: { display: "flex", flexDirection: "column", gap: 4 } }, /* @__PURE__ */ React2.createElement("span", null, "Note for the editor (optional)"), /* @__PURE__ */ React2.createElement("input", { type: "text", value: hint, disabled: busy, placeholder: "e.g. use the part about dopamine", onChange: (e) => setHint(e.target.value) })), /* @__PURE__ */ React2.createElement("label", { style: { display: "flex", gap: 8, alignItems: "flex-start" } }, /* @__PURE__ */ React2.createElement(
    "input",
    {
      type: "checkbox",
      checked: genBroll,
      disabled: busy,
      onChange: (e) => {
        setGenBroll(e.target.checked);
        writeStore(STORE + "genBroll", e.target.checked ? "1" : "");
      }
    }
  ), /* @__PURE__ */ React2.createElement("span", null, "B-roll comes from stock footage. If this Selects version has no stock search, generate it with AI instead (4-12 minutes and about $2 per reel).")), isReel && /* @__PURE__ */ React2.createElement("button", { onClick: () => make(true), disabled: busy, style: { padding: "10px 12px", fontWeight: 600, cursor: busy ? "default" : "pointer" } }, "Rebuild this reel"), /* @__PURE__ */ React2.createElement("button", { onClick: () => make(false), disabled: busy, style: { padding: "10px 12px", fontWeight: 600, cursor: busy ? "default" : "pointer" } }, busy ? "Making the reel\u2026 " + clock + " s" : result ? "Make another reel" : "Make reel"), (busy || steps.some((s) => s.state !== "wait")) && /* @__PURE__ */ React2.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } }, steps.map((s) => /* @__PURE__ */ React2.createElement("div", { key: s.id, style: { display: "flex", gap: 8, opacity: s.state === "wait" ? 0.5 : 1 } }, /* @__PURE__ */ React2.createElement("span", { style: { width: 14, textAlign: "center" } }, icon(s.state)), /* @__PURE__ */ React2.createElement("span", { style: { flex: 1 } }, s.label, s.note ? /* @__PURE__ */ React2.createElement("span", { style: { color: "var(--panel-muted-fg)" } }, " \u2014 ", s.note) : null)))), error && /* @__PURE__ */ React2.createElement("div", { style: { color: "var(--panel-destructive-fg, #e5484d)", whiteSpace: "pre-wrap" } }, error), result && !busy && /* @__PURE__ */ React2.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } }, /* @__PURE__ */ React2.createElement("div", null, "Made \u201C", result.name, "\u201D in ", Math.round(result.seconds), " s."), result.credits?.length ? /* @__PURE__ */ React2.createElement("div", { style: { color: "var(--panel-muted-fg)" } }, "B-roll:", " ", result.credits.map((c, i) => /* @__PURE__ */ React2.createElement(React2.Fragment, { key: i }, i ? ", " : "", /* @__PURE__ */ React2.createElement("a", { href: c.url, target: "_blank", rel: "noreferrer" }, c.credit), c.service ? " (" + c.service + ")" : ""))) : null, result.notes?.length ? /* @__PURE__ */ React2.createElement("ul", { style: { margin: 0, paddingLeft: 18, color: "var(--panel-muted-fg)" } }, result.notes.map((n, i) => /* @__PURE__ */ React2.createElement("li", { key: i }, n))) : null, /* @__PURE__ */ React2.createElement("button", { onClick: open, style: { padding: "8px 12px" } }, "Open the reel")));
}
export {
  PodcastHookReel as default
};
