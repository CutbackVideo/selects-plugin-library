// @name Quote Lockup Reel
// @name:de Zitat-Reel mit Typo-Lockups
// @name:en Quote Lockup Reel
// @name:es Reel de citas tipográfico
// @name:fr Reel de citation typographique
// @name:it Reel di citazioni tipografico
// @name:ja 名言タイポグラフィ・リール
// @name:ko Quote Lockup Reel
// @name:pt Reel de citações tipográfico
// @name:tr Tipografik Alıntı Reel'i
// @name:zh 金句排版短片
// @icon captions
// One click turns a podcast Draft into a 9:16 quote reel: clause cuts, a rounded card on black, packed lockup captions, a black key line, stock B-roll and a piano bed.

// src/Panel.tsx
import React, { useEffect, useRef, useState } from "react";

// src/host.ts
var ID = "quote-lockup-reel";
var J = JSON.stringify;
function di() {
  const d = window.parent?.__DI__;
  if (!d) throw new Error("This panel must run inside Selects.");
  return d;
}
var fs = () => di().FileSystem;
var join = (...parts) => fs().join(...parts);
var isWindows = () => /Windows/i.test(navigator.userAgent) || /^win/i.test(navigator.platform || "");
var skillsDir = () => join(fs().homedir(), ".selects", "skills", ID);
var dataDir = (...parts) => {
  const p = join(fs().homedir(), ".selects", "plugin-data", ID, ...parts);
  fs().mkdirSync(p, { recursive: true });
  return p;
};
async function readBytes(p) {
  const b = await fs().readFile(p);
  const u8 = b instanceof Uint8Array ? b : new Uint8Array(b);
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
}
async function readText(p) {
  return String(await fs().readFile(p, "utf8"));
}
async function writeText(p, text) {
  await fs().writeFile(p, text);
}
var exists = (p) => {
  const f = fs();
  try {
    return typeof f.existsSync === "function" ? !!f.existsSync(p) : false;
  } catch {
    return false;
  }
};
async function script(sdk, summary, body, allowCommit = false) {
  const r = await sdk.runScript({ summary, script: body, allowCommit });
  if (r.isError) {
    let msg = r.output;
    try {
      const o = JSON.parse(r.output);
      msg = o.error || o.message || r.output;
      if (o.diagnostics) msg += "\n" + J(o.diagnostics).slice(0, 1200);
    } catch {
    }
    throw new Error(summary + ": " + String(msg).slice(0, 1600));
  }
  return r.result;
}
var posixQuote = (v) => "'" + v.replace(/'/g, "'\\''") + "'";
var cmdQuote = (v) => {
  if (v.includes('"')) throw new Error("A path holds a double quote: " + v);
  return /^[A-Za-z0-9_.:\\/+@=,-]+$/.test(v) ? v : '"' + v.replace(/(\\+)$/, "$1$1").replace(/%/g, "%%") + '"';
};
async function ffmpegRuns(sdk, summary, runs, timeoutMs = 12e4) {
  const win = isWindows();
  const base = ["-nostdin", "-hide_banner", "-loglevel", "error", "-y"];
  const lines = runs.map((args) => {
    const words = [...base, ...args].map(String);
    return win ? "ffmpeg " + words.map(cmdQuote).join(" ") + " 1>NUL 2>NUL" : "'command' 'ffmpeg' " + words.map(posixQuote).join(" ") + " >/dev/null 2>&1";
  });
  for (let i = 0; i < lines.length; ) {
    let j = i, size2 = 0;
    while (j < lines.length && size2 + lines[j].length < 12e3) size2 += lines[j++].length + 2;
    if (j === i) j = i + 1;
    const command = win ? lines.slice(i, j).join("\r\n") : lines.slice(i, j).join(" ; ") + " ; true";
    await sdk.runShell({ summary, command, timeoutMs, maxOutputBytes: 48 * 1024 });
    i = j;
  }
}
async function ask(sdk, prompt, onWait) {
  const waits = [0, 4e3, 12e3, 3e4, 6e4];
  let last = null;
  for (let i = 0; i < waits.length; i += 1) {
    if (waits[i]) {
      onWait?.(i);
      await new Promise((r) => setTimeout(r, waits[i]));
    }
    try {
      return (await sdk.askAI({ prompt, timeoutMs: 3e5 })).text;
    } catch (e) {
      last = e;
    }
  }
  throw new Error("The Selects AI did not answer: " + String(last?.message || last));
}
function parseJson(text) {
  const raw = String(text || "");
  try {
    return parseBlocks(raw);
  } catch {
    return parseBlocks(raw.replace(/[“”]/g, '"'));
  }
}
function parseBlocks(s) {
  const blocks = [];
  let depth = 0, start = -1, inStr = false, esc = false;
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"' && depth > 0) inStr = true;
    else if (c === "{") {
      if (depth === 0) start = i;
      depth += 1;
    } else if (c === "}" && depth > 0) {
      depth -= 1;
      if (depth === 0) blocks.push(s.slice(start, i + 1));
    }
  }
  for (const b of blocks.reverse()) {
    for (const t of [b, b.replace(/,\s*([}\]])/g, "$1")]) {
      try {
        return JSON.parse(t);
      } catch {
      }
    }
  }
  throw new Error("The AI reply had no JSON object.");
}

// src/source.ts
var PAGE = 3e3;
async function readSource(sdk, projectId, sequenceId) {
  const words = [];
  let head = null;
  for (let from = 0; ; from += PAGE) {
    const r = await script(
      sdk,
      "Read the podcast Draft",
      `const from: number = ${from};
const d = selects.draft(${J(sequenceId)});
const ws = (await d.words()).filter((w: any) => !w.nonSpeech && !w.cut && w.endFrame > w.startFrame);
const page = ws.slice(from, from + ${PAGE});
const out: any = { total: ws.length, t: page.map((w: any) => w.text), s: page.map((w: any) => w.startFrame), e: page.map((w: any) => w.endFrame) };
if (from === 0) {
  const m = await d.meta();
  const main = (await d.clips({ trackScope: "main" })).filter((c: any) => c.trackKind === "main" && c.resourceId != null);
  out.name = m.name; out.fps = m.fps;
  const tree: any = await selects.project(${J(projectId)}).sourceFiles();
  const files: any[] = [];
  const walk = (nodes: any[]) => { for (const n of nodes || []) { if (n.type === "dir") walk(n.children); else files.push(n); } };
  walk("fileTree" in tree ? tree.fileTree : []);
  // Words count source frames in the Resource's analyzed sequence, whose rate can differ from the file's own
  // (a 25 fps file analyzed at 23.976): read that rate rather than the file's.
  const rates: Record<string, number> = {};
  for (const rid of [...new Set(main.map((c: any) => c.resourceId))] as string[]) {
    try { rates[rid] = ((await selects.project(${J(projectId)}).resource(rid).meta()) as any).fps || m.fps; } catch { rates[rid] = m.fps; }
  }
  out.clips = main.map((c: any) => {
    const f = files.find((x: any) => x.resourceId === c.resourceId);
    const rate = rates[c.resourceId] || m.fps;
    // Words map Draft time to source time; their slope is the clip's playback speed (1 unless it was retimed).
    const inside = ws.filter((w: any) => w.startFrame >= c.startFrame && w.endFrame <= c.endFrame && w.sourceStartFrame != null);
    const first = inside[0], last = inside[inside.length - 1];
    const span = first && last ? (last.startFrame - first.startFrame) / m.fps : 0;
    const speed = span > 1 ? (last.sourceStartFrame / rate - first.sourceStartFrame / rate) / span : 1;
    const offs = inside.map((w: any) => w.sourceStartFrame / rate - speed * (w.startFrame / m.fps)).sort((a: number, b: number) => a - b);
    return { s: c.startFrame, e: c.endFrame, rid: c.resourceId, path: f?.path ?? null, sw: f?.frameSize?.width || 0, sh: f?.frameSize?.height || 0,
      off: offs.length ? offs[Math.floor(offs.length / 2)] : null, speed };
  });
  out.endFrame = main.reduce((a: number, c: any) => Math.max(a, c.endFrame), 0);
}
return out;`
    );
    if (!r || !Array.isArray(r.t)) throw new Error("Could not read the open Draft.");
    if (from === 0) head = r;
    r.t.forEach((t, k) => words.push({ i: from + k, t, s: r.s[k], e: r.e[k] }));
    if (from + PAGE >= r.total) break;
  }
  if (words.length < 20) throw new Error("This Draft has almost no transcript. Open an analyzed podcast Draft.");
  return { name: head.name, fps: head.fps, words, clips: head.clips, endFrame: head.endFrame };
}

// src/story.ts
var norm = (s) => String(s || "").toLowerCase().replace(/[’‘]/g, "'").replace(/[^\p{L}\p{N}']+/gu, "").replace(/^'+|'+$/g, "");
var toks = (s) => String(s || "").split(/\s+/).map(norm).filter(Boolean);
function sentences(words, fps) {
  const out = [];
  let from = 0;
  for (let i = 0; i < words.length; i += 1) {
    const end = /[.!?]["”’)]*$/.test(words[i].t);
    const gap = i + 1 < words.length ? (words[i + 1].s - words[i].e) / fps : 99;
    if (end || gap > 0.9 || i - from >= 39 || i === words.length - 1) {
      out.push({ from, to: i });
      from = i + 1;
    }
  }
  return out;
}
var GUIDE = `You are the editor of a short-form "quote" channel. From the podcast transcript below, pick ONE quote and plan its reel.

The reel format:
- The quote is 15-22 seconds of continuous speech, self-contained and quotable (a clear insight, advice or reframing), starting at the beginning of a thought.
- It is cut into 6-10 clauses. Each clause becomes one shot with one typographic caption. Cut only at natural boundaries: a sentence end, a comma, or before a conjunction ("and", "but", "because"), never inside a phrase that belongs together.
- Keep the rhythm of a real edit, mostly quick with a few longer beats: the hook 7-10 words, the black key line 6-10 words, most other clauses 4-8 words (about 1.5-2.5 seconds), and never more than 10 words in a clause.
- Clause roles:
  - "speaker": the speaker on camera. The first clause (the hook) is always "speaker".
  - "black": the core line of the quote on a black screen with no music. Exactly ONE clause, ideally clause 2 or 3, the line that states the thesis.
  - "broll": stock footage that literally shows what the clause says (an action, place or object). Give a concrete stock search "query" of 2-4 words (e.g. "man working late desk", "runner on track"). At most 3, never the first clause and never adjacent to each other.
  - "outro": the final clause, if it is a short closing line of at most 8 words. Otherwise the last clause is "speaker".

Reply with ONLY one JSON object like:
{"s": 12, "why": "one short sentence", "clauses": [{"text": "exact words of clause 1", "role": "speaker"}, {"text": "...", "role": "black"}, {"text": "...", "role": "broll", "query": "..."}]}

"s" is the number of the transcript sentence where the quote starts. Each clause "text" must copy the transcript words exactly and in order, and the clauses must follow each other with nothing skipped.`;
async function planStory(sdk, words, fps, onWait) {
  const sents = sentences(words, fps);
  const lines = sents.map((x, k) => "S" + (k + 1) + " [" + (words[x.from].s / fps).toFixed(1) + "s] " + words.slice(x.from, x.to + 1).map((w) => w.t.replace(/"/g, "'")).join(" "));
  const base = "Pure text task: do NOT use any tools or read the project; everything you need is below. Think briefly and reply with ONLY one JSON object.\n\n" + GUIDE + "\n\nTranscript:\n" + lines.join("\n");
  let prompt = base;
  let best = null;
  for (let round2 = 0; round2 < 2; round2 += 1) {
    let raw = "";
    try {
      raw = await ask(sdk, prompt, onWait);
      const story = resolve(parseJson(raw), words, sents, fps);
      story.raw = raw;
      if (!best || (story.issues?.length || 0) < (best.issues?.length || 0)) best = story;
      if (!story.issues?.length) return story;
      prompt = base + "\n\nYour previous answer:\n" + raw + "\n\nIt breaks these rules:\n- " + story.issues.join("\n- ") + "\nAnswer again with a corrected JSON object.";
    } catch (e) {
      prompt = base + "\n\nYour previous answer could not be used (" + String(e?.message || e) + "). Answer again with ONLY the JSON object.";
    }
  }
  if (best && best.clauses.length >= 3) return best;
  return ruleStory(words, fps, "The AI plan could not be used; the quote was picked by rules.");
}
function resolve(o, words, sents, fps) {
  const issues = [];
  const list2 = Array.isArray(o?.clauses) ? o.clauses : [];
  if (!list2.length) throw new Error("no clauses");
  const first = toks(list2[0].text);
  const s = Math.max(1, Math.round(Number(o.s) || 1));
  const tries = [s - 1, s - 2, s, s - 3, s + 1].filter((x, i, a) => x >= 0 && x < sents.length && a.indexOf(x) === i);
  let at = -1;
  for (const si of tries) {
    for (let a = sents[si].from; a <= sents[si].to && at < 0; a += 1) if (matchAt(words, a, first) >= 0) at = a;
    if (at >= 0) break;
  }
  if (at < 0) {
    for (let a = 0; a < words.length && at < 0; a += 1) if (matchAt(words, a, first) >= 0) at = a;
  }
  if (at < 0) throw new Error("the first clause is not in the transcript");
  const clauses = [];
  let cursor = at;
  for (let k = 0; k < list2.length; k += 1) {
    const want = toks(list2[k].text);
    let hit = -1, from = -1;
    for (let skip = 0; skip <= 3 && hit < 0; skip += 1) {
      hit = matchAt(words, cursor + skip, want);
      if (hit >= 0) from = cursor + skip;
    }
    if (hit < 0) {
      issues.push("clause " + (k + 1) + ' ("' + String(list2[k].text).slice(0, 40) + '") does not continue the transcript exactly');
      break;
    }
    const role = ["speaker", "broll", "black", "outro"].includes(list2[k].role) ? list2[k].role : "speaker";
    clauses.push({ a: from, b: hit, role, query: role === "broll" ? String(list2[k].query || list2[k].text).slice(0, 60) : void 0 });
    cursor = hit + 1;
  }
  if (!clauses.length) throw new Error("no clause matched the transcript");
  clauses[0].role = "speaker";
  const blacks = clauses.map((c, i) => c.role === "black" ? i : -1).filter((i) => i >= 0);
  if (!blacks.length) {
    if (clauses.length > 1) clauses[1].role = "black";
    issues.push("there must be exactly one black clause");
  }
  for (const i of blacks.slice(1)) clauses[i].role = "speaker";
  let brolls = 0;
  clauses.forEach((c, i) => {
    if (c.role === "outro" && (i !== clauses.length - 1 || c.b - c.a + 1 > 10)) c.role = "speaker";
    if (c.role === "broll" && (i === 0 || clauses[i - 1].role === "broll" || brolls >= 3)) c.role = "speaker";
    if (c.role === "broll") brolls += 1;
  });
  const dur = (words[clauses[clauses.length - 1].b].e - words[clauses[0].a].s) / fps;
  if (dur < 14) issues.push("the quote is only " + dur.toFixed(1) + " s; it must be 15-22 s");
  if (dur > 24) issues.push("the quote is " + dur.toFixed(1) + " s; it must be 15-22 s");
  const shots = mergeShort(splitLong(clauses, words, fps));
  for (const c of shots) {
    if (c.role !== "outro" && c.b - c.a + 1 < CLAUSE_WORDS.min) {
      issues.push('the clause "' + words.slice(c.a, c.b + 1).map((w) => w.t).join(" ") + '" has only ' + (c.b - c.a + 1) + " words; every clause needs at least " + CLAUSE_WORDS.min + " (the hook 7-10)");
    }
  }
  return { clauses: shots, why: String(o.why || "").slice(0, 200), source: "ai", issues };
}
function matchAt(words, a, want) {
  if (!want.length || a < 0 || a + want.length > words.length) return -1;
  for (let j = 0; j < want.length; j += 1) if (norm(words[a + j].t) !== want[j]) return -1;
  return a + want.length - 1;
}
function ruleStory(words, fps, why) {
  const sents = sentences(words, fps);
  let best = { a: 0, b: Math.min(words.length - 1, 40), score: 1e9 };
  for (let i = 0; i < sents.length; i += 1) {
    for (let j = i; j < sents.length; j += 1) {
      const d = (words[sents[j].to].e - words[sents[i].from].s) / fps;
      if (d > 26) break;
      const score = Math.abs(d - 16);
      if (score < best.score) best = { a: sents[i].from, b: sents[j].to, score };
    }
  }
  const clauses = [];
  let a = best.a;
  for (let i = best.a; i <= best.b; i += 1) {
    const len = (words[i].e - words[a].s) / fps;
    const gap = i < best.b ? (words[i + 1].s - words[i].e) / fps : 99;
    const punct = PUNCT.test(words[i].t);
    const room = best.b - i >= CLAUSE_WORDS.min;
    if (i === best.b || room && (i - a + 1 >= 5 && (punct || gap > 0.25) || i - a + 1 >= 9)) {
      clauses.push({ a, b: i, role: "speaker" });
      a = i + 1;
    }
  }
  if (clauses.length > 1) clauses[1].role = "black";
  return { clauses: mergeShort(splitLong(clauses, words, fps)), why, source: "rules" };
}
var CLAUSE_WORDS = { min: 4, max: 10, keyMax: 14 };
var PUNCT = /[,.;:!?]["”’)]*$/;
function splitLong(list2, words, fps) {
  const out = [];
  const queue = list2.map((c) => ({ ...c }));
  while (queue.length) {
    const c = queue.shift();
    const n = c.b - c.a + 1;
    if (c.role === "outro" || n <= (c.role === "black" ? CLAUSE_WORDS.keyMax : CLAUSE_WORDS.max)) {
      out.push(c);
      continue;
    }
    let at = -1, best = -1e9;
    for (let j = c.a + CLAUSE_WORDS.min - 1; j <= c.b - CLAUSE_WORDS.min; j += 1) {
      const gap = Math.min(1, Math.max(0, (words[j + 1].s - words[j].e) / fps));
      const score = (PUNCT.test(words[j].t) ? 1 : 0) + 2 * gap - Math.abs(j + 0.5 - (c.a + c.b) / 2) / n;
      if (score > best) [best, at] = [score, j];
    }
    if (at < 0) {
      out.push(c);
      continue;
    }
    queue.unshift({ a: c.a, b: at, role: c.role, query: c.query }, { a: at + 1, b: c.b, role: "speaker" });
  }
  return out;
}
function mergeShort(list2) {
  const n = (c) => c.b - c.a + 1;
  const span = (x, y) => y.b - x.a + 1;
  const out = list2.map((c) => ({ ...c }));
  const join2 = (x, y) => {
    const role = x.role === "black" || y.role === "black" ? "black" : x.role === "broll" || y.role === "broll" ? "broll" : "speaker";
    return { a: x.a, b: y.b, role, query: role === "broll" ? x.query || y.query : void 0 };
  };
  const free = (c) => !!c && c.role !== "black" && c.role !== "outro";
  for (let i = 0; i < out.length; ) {
    const c = out[i], next = out[i + 1], prev = out[i - 1];
    if (n(c) >= CLAUSE_WORDS.min || c.role === "outro") {
      i += 1;
      continue;
    }
    if (c.role === "black") {
      if (free(next) && span(c, next) <= CLAUSE_WORDS.max) out.splice(i, 2, join2(c, next));
      else i += 1;
      continue;
    }
    if (free(next) && span(c, next) <= CLAUSE_WORDS.max) out.splice(i, 2, join2(c, next));
    else if (free(prev) && span(prev, c) <= CLAUSE_WORDS.max) {
      out.splice(i - 1, 2, join2(prev, c));
      i -= 1;
    } else i += 1;
  }
  if (out[0] && out[0].role === "broll" && out.length > 1) out[0].role = "speaker";
  for (let i = 1; i < out.length; i += 1) {
    if (out[i].role === "broll" && out[i - 1].role === "broll") out[i] = { a: out[i].a, b: out[i].b, role: "speaker" };
  }
  return out;
}

// src/plan.ts
var W = 1080;
var H = 1920;
var CARD = { x: 47, y: 255.5, w: 986, h: 1409, r: 120 };
var MUSIC = { file: "momentum.m4a", cue: 11.486, seconds: 94.14, volumeDb: -6 };
var FADE_SECONDS = 0.27;
var sourceAt = (shot, f) => shot.src + (f - shot.from);
var CUT = {
  hold: 0.2,
  intoKey: 0.1,
  keyLead: 0.65,
  keyHold: 0.8,
  onset: 2
  /* frames */
};
function displayWord(t) {
  return String(t || "").replace(/[“”"«»]/g, "").replace(/[,.;:!…]+/g, "").replace(/^[-–—'‘]+|[-–—]+$/g, "").trim();
}
function makePlan(src, story) {
  const { words, fps } = src;
  const cl = story.clauses;
  const sec = (x) => Math.round(x * fps);
  const a0 = cl[0].a, b1 = cl[cl.length - 1].b;
  const srcFrom = Math.max(a0 > 0 ? words[a0 - 1].e : 0, words[a0].s - sec(0.15));
  const srcTo = Math.max(words[b1].e, Math.min(b1 + 1 < words.length ? words[b1 + 1].s : src.endFrame, words[b1].e + sec(0.8)));
  const at = (f) => f - srcFrom;
  const spans = cl.map(() => ({ a: 0, b: srcTo - srcFrom }));
  for (let k = 1; k < cl.length; k += 1) {
    const said = at(words[cl[k].a - 1].e), next = at(words[cl[k].a].s) - CUT.onset;
    const intoKey = cl[k].role === "black";
    const hold = intoKey ? CUT.intoKey : cl[k - 1].role === "black" ? CUT.keyHold : CUT.hold;
    const shown = at(words[cl[k - 1].b].s) + CUT.onset + 1;
    const end = Math.max(spans[k - 1].a + 1, shown, Math.min(next, said + sec(hold)));
    spans[k - 1].b = end;
    spans[k].a = Math.max(end, intoKey ? next - sec(CUT.keyLead) : next);
  }
  let t = 0;
  const shots = cl.map((c, k) => {
    const from = t;
    t += spans[k].b - spans[k].a;
    const shift = spans[k].a - from;
    const ws = words.slice(c.a, c.b + 1).map((w) => {
      const reveal = Math.max(from, at(w.s) - shift);
      return { t: displayWord(w.t), reveal, end: Math.max(reveal, Math.min(t, at(w.e) - shift)) };
    }).filter((w) => w.t);
    return { k, role: c.role, from, to: t, src: spans[k].a, query: c.query, text: ws.map((w) => w.t).join(" "), words: ws };
  });
  return { fps, srcFrom, srcTo, end: t, shots };
}
var blackRanges = (plan) => plan.shots.filter((s) => s.role === "black" || s.role === "outro").map((s) => [s.from, s.to]);
function musicClips(plan) {
  const fps = plan.fps;
  const black = plan.shots.find((s) => s.role === "black");
  const out = [];
  if (!black) {
    out.push({ from: 0, to: plan.end, sourceStart: Math.max(0, MUSIC.cue - 2), part: "after" });
    return out;
  }
  if (black.from > 0) {
    const before = black.from / fps;
    const startAt = before > MUSIC.cue ? Math.round((before - MUSIC.cue) * fps) : 0;
    out.push({ from: startAt, to: black.from, sourceStart: Math.max(0, MUSIC.cue - before), part: "before" });
  }
  const last = black.words[black.words.length - 1];
  const back = last ? Math.max(black.from + 1, Math.min(black.to, last.end + 1)) : black.to;
  if (back < plan.end) out.push({ from: back, to: plan.end, sourceStart: MUSIC.cue, part: "after" });
  return out;
}
function coverScale(sw, sh) {
  if (!sw || !sh) return 1;
  const c = Math.min(W / sw, H / sh);
  return Math.max(CARD.w / (sw * c), CARD.h / (sh * c));
}

// src/faces/yunetModel.ts
var YUNET_DIR = "yunet";
var YUNET_MODEL_FILE = "face_detection_yunet_2023mar.onnx";
var YUNET_MODEL_SHA256 = "8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4";
var ORT_JS_FILE = "ort.wasm.bundle.min.mjs";
var ORT_WASM_FILE = "ort-wasm-simd-threaded.wasm";
var YUNET_STRIDES = [8, 16, 32];
var YUNET_DIVISOR = 32;
var YUNET_OUTPUTS = ["cls", "obj", "bbox", "kps"];
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
    } else throw new Error(`The face model file has an unsupported protobuf field (wire type ${wire}).`);
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
var lenField = (no, payload2) => concat([Uint8Array.from([...encodeVarint(no * 8 + 2), ...encodeVarint(payload2.length)]), payload2]);
var varintField = (no, v) => Uint8Array.from([...encodeVarint(no * 8), ...encodeVarint(v)]);
var textField = (no, s) => lenField(no, new TextEncoder().encode(s));
function concat(parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
var payload = (b, f) => b.subarray(f.value, f.value + f.len);
var one = (fs2, no) => fs2.find((f) => f.no === no && f.wire === 2);
function readTensorInfo(b) {
  const vi = fields(b);
  const name = new TextDecoder().decode(payload(b, one(vi, 1)));
  const type = one(vi, 2), tensor = type && one(fields(b, type.value, type.value + type.len), 1);
  if (!tensor) throw new Error(`The face model's ${name} is not a tensor.`);
  const tf2 = fields(b, tensor.value, tensor.value + tensor.len);
  const elemType = tf2.find((f) => f.no === 1 && f.wire === 0)?.value ?? 0;
  const shape = one(tf2, 2);
  const dims = shape ? fields(b, shape.value, shape.value + shape.len).filter((f) => f.no === 1 && f.wire === 2).map((d) => {
    const df = fields(b, d.value, d.value + d.len);
    const v = df.find((f) => f.no === 1 && f.wire === 0);
    const p = one(df, 2);
    return v ? v.value : p ? new TextDecoder().decode(payload(b, p)) : "?";
  }) : [];
  return { name, elemType, dims };
}
function writeTensorInfo(t) {
  const dims = t.dims.map((d) => lenField(1, typeof d === "number" ? varintField(1, d) : textField(2, d)));
  const tensor = concat([varintField(1, t.elemType), lenField(2, concat(dims))]);
  return concat([textField(1, t.name), lenField(2, lenField(1, tensor))]);
}
function withSymbolicInputSize(model) {
  const top = fields(model);
  const graph = top.find((f) => f.no === 7 && f.wire === 2);
  if (!graph) throw new Error("The face model file has no graph.");
  const parts = [];
  let inputs = 0, outputs = 0;
  for (const f of fields(model, graph.value, graph.value + graph.len)) {
    if (f.no === 13) continue;
    if ((f.no === 11 || f.no === 12) && f.wire === 2) {
      const t = readTensorInfo(payload(model, f));
      if (f.no === 11) {
        if (t.elemType !== 1 || t.dims.length !== 4 || t.dims[0] !== 1 || t.dims[1] !== 3) throw new Error(`Unexpected face model input ${t.name} [${t.dims}].`);
        t.dims = [1, 3, "H", "W"];
        inputs += 1;
      } else {
        if (t.elemType !== 1 || t.dims.length !== 3 || t.dims[0] !== 1) throw new Error(`Unexpected face model output ${t.name} [${t.dims}].`);
        t.dims = [1, `N_${t.name}`, t.dims[2]];
        outputs += 1;
      }
      parts.push(lenField(f.no, writeTensorInfo(t)));
      continue;
    }
    parts.push(model.subarray(f.start, f.end));
  }
  if (inputs !== 1 || outputs !== YUNET_STRIDES.length * YUNET_OUTPUTS.length) throw new Error(`Unexpected face model: ${inputs} inputs, ${outputs} outputs.`);
  const newGraph = lenField(7, concat(parts));
  return concat(top.map((f) => f === graph ? newGraph : model.subarray(f.start, f.end)));
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
    let [a, b, c, d, e, f, g, hh] = h;
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

// src/faces/yunetDecode.ts
var YUNET_SCORE_THRESHOLD = 0.6;
var YUNET_NMS_THRESHOLD = 0.3;
var YUNET_TOP_K = 5e3;
function paddedSize(width, height) {
  const up = (x) => Math.floor((x - 1) / YUNET_DIVISOR + 1) * YUNET_DIVISOR;
  return { width: up(width), height: up(height) };
}
function bgrToBlob(bgr, width, height, out) {
  const pad = paddedSize(width, height);
  const plane = pad.width * pad.height;
  if (bgr.length < width * height * 3) throw new Error(`A face frame has ${bgr.length} bytes, not ${width * height * 3}.`);
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
  return { data, ...pad };
}
var clamp01 = (v) => Math.min(1, Math.max(0, v));
var f32 = Math.fround;
function decodeYuNet(outputs, padWidth, padHeight, o = {}) {
  const threshold = o.score ?? YUNET_SCORE_THRESHOLD;
  const faces = [];
  for (const stride of YUNET_STRIDES) {
    const cols = Math.floor(padWidth / stride), rows = Math.floor(padHeight / stride);
    const cls = outputs[`cls_${stride}`], obj = outputs[`obj_${stride}`], bbox = outputs[`bbox_${stride}`], kps = outputs[`kps_${stride}`];
    if (!cls || !obj || !bbox || !kps) throw new Error(`The face model gave no output for stride ${stride}.`);
    if (cls.length !== rows * cols || bbox.length !== rows * cols * 4 || kps.length !== rows * cols * 10) throw new Error(`The face model's stride-${stride} output does not fit a ${padWidth}x${padHeight} input.`);
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
  return nmsBoxes(faces, threshold, o.nms ?? YUNET_NMS_THRESHOLD, o.topK ?? YUNET_TOP_K).map((i) => faces[i]);
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

// src/faces/detector.ts
var importUrl = new Function("u", "return import(u)");
var SOURCES = {
  [YUNET_MODEL_FILE]: {
    url: "https://github.com/opencv/opencv_zoo/raw/f12e12798e8314f7c074a6656816c048dcc95b7a/models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
    sha256: YUNET_MODEL_SHA256
  },
  [ORT_JS_FILE]: { url: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/ort.wasm.bundle.min.mjs", sha256: "11e64bd8ffe11bd1a2a2f0d6275fdfbbba7262f0b76b99b53d228a8a22ef3d90" },
  [ORT_WASM_FILE]: { url: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/ort-wasm-simd-threaded.wasm", sha256: "3398c10d07d229bd91b364548e130e0e51a8e5704b88c7c083ebbeb78842dee2" }
};
async function file(name) {
  const src = SOURCES[name];
  const dir = dataDir("models", YUNET_DIR);
  const p = join(dir, name), ok = p + ".ok";
  if (exists(p) && exists(ok)) return new Uint8Array(await readBytes(p));
  const part = p + ".part";
  try {
    await fs().downloadFile(src.url, part);
  } catch (e) {
    throw new Error("The face detector could not be downloaded (" + name + "): " + String(e?.message || e));
  }
  const bytes = exists(part) ? new Uint8Array(await readBytes(part)) : new Uint8Array();
  if (sha256Hex(bytes) !== src.sha256) {
    try {
      fs().rmSync(part, { force: true });
    } catch {
    }
    throw new Error("The face detector download did not match its checksum (" + name + ").");
  }
  await fs().writeFile(p, bytes);
  await fs().writeFile(ok, src.sha256);
  try {
    fs().rmSync(part, { force: true });
  } catch {
  }
  return bytes;
}
var pending = null;
function loadFaceDetector() {
  if (!pending) {
    pending = create();
    pending.catch(() => pending = null);
  }
  return pending;
}
async function create() {
  const model = await file(YUNET_MODEL_FILE);
  if (sha256Hex(model) !== YUNET_MODEL_SHA256) throw new Error("The face model file is damaged. Reinstall the plugin.");
  const [js, wasm] = await Promise.all([file(ORT_JS_FILE), file(ORT_WASM_FILE)]);
  const url = URL.createObjectURL(new Blob([js], { type: "text/javascript" }));
  let ort;
  try {
    ort = await importUrl(url);
  } finally {
    URL.revokeObjectURL(url);
  }
  ort.env.logLevel = "error";
  ort.env.wasm.wasmBinary = wasm;
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  const session = await ort.InferenceSession.create(withSymbolicInputSize(model), { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
  const input = session.inputNames[0] ?? "input";
  let queue = Promise.resolve();
  const one2 = async (bgr, width, height) => {
    const blob = bgrToBlob(bgr, width, height);
    const out = await session.run({ [input]: new ort.Tensor("float32", blob.data, [1, 3, blob.height, blob.width]) });
    const outputs = {};
    for (const [k, v] of Object.entries(out)) outputs[k] = v.data;
    return decodeYuNet(outputs, blob.width, blob.height);
  };
  return {
    detect(bgr, width, height) {
      const run = queue.then(() => one2(bgr, width, height));
      queue = run.catch(() => void 0);
      return run;
    }
  };
}

// src/faces/index.ts
function hueBins(bgr, w, h, faces, bins) {
  const keep = (x, y) => !faces.some((f) => x >= f.box[0] - 0.2 * f.box[2] && x <= f.box[0] + 1.2 * f.box[2] && y >= f.box[1] - 0.3 * f.box[3] && y <= f.box[1] + 1.2 * f.box[3]);
  let n = 0;
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const i = (y * w + x) * 3, b = bgr[i] / 255, g = bgr[i + 1] / 255, r = bgr[i + 2] / 255;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
      n += 1;
      if (mx < 0.3 || d / mx < 0.35 || !keep(x, y)) continue;
      let hue = mx === r ? (g - b) / d % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      hue = (hue * 60 + 360) % 360;
      bins[Math.floor(hue / 15) % 24] += d / mx * mx;
    }
  }
  return n;
}
var SHORT = 360;
async function decode(path) {
  const bytes = await readBytes(path);
  const bmp = await createImageBitmap(new Blob([bytes], { type: "image/jpeg" }));
  const cv = new OffscreenCanvas(bmp.width, bmp.height);
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bmp, 0, 0);
  const rgba = ctx.getImageData(0, 0, bmp.width, bmp.height).data;
  const bgr = new Uint8Array(bmp.width * bmp.height * 3);
  for (let i = 0, o = 0; i < rgba.length; i += 4, o += 3) {
    bgr[o] = rgba[i + 2];
    bgr[o + 1] = rgba[i + 1];
    bgr[o + 2] = rgba[i];
  }
  return { bgr, width: bmp.width, height: bmp.height };
}
async function facesFor(sdk, runKey, asks, palettes) {
  const dir = dataDir("frames", runKey);
  const jobs = asks.flatMap((a) => a.seconds.map((t, i) => ({ key: a.key, out: join(dir, a.key + "-" + i + ".jpg"), path: a.path, t, portrait: a.portrait })));
  const todo = jobs.filter((j) => !exists(j.out));
  if (todo.length) {
    await ffmpegRuns(sdk, "Read frames for face detection", todo.map((j) => [
      "-ss",
      Math.max(0, j.t).toFixed(3),
      "-i",
      j.path,
      "-frames:v",
      "1",
      "-vf",
      j.portrait ? "scale=" + SHORT + ":-2" : "scale=-2:" + SHORT,
      "-q:v",
      "4",
      j.out
    ]));
  }
  try {
    return await detectAll(asks, jobs, palettes);
  } finally {
    try {
      fs().rmSync(dir, { recursive: true, force: true });
    } catch {
    }
  }
}
async function detectAll(asks, jobs, palettes) {
  const detector = await loadFaceDetector();
  const out = {};
  for (const a of asks) {
    const found = [];
    const bins = new Float64Array(24);
    let pixels = 0;
    for (const j of jobs.filter((x) => x.key === a.key)) {
      if (!exists(j.out)) continue;
      let img, faces;
      try {
        img = await decode(j.out);
        faces = (await detector.detect(img.bgr, img.width, img.height)).filter((f) => f.score >= 0.6);
      } catch {
        continue;
      }
      pixels += hueBins(img.bgr, img.width, img.height, faces, bins);
      const big = faces.reduce((b, f) => !b || f.box[2] * f.box[3] > b.box[2] * b.box[3] ? f : b, null);
      if (big) found.push({ f: big, w: img.width, h: img.height, count: faces.length });
    }
    if (palettes) {
      const total = bins.reduce((x, y) => x + y, 0) || 1;
      const peaks = [];
      for (let k = 0; k < 24; k += 1) {
        const w = bins[k] + 0.5 * (bins[(k + 23) % 24] + bins[(k + 1) % 24]);
        if (bins[k] >= bins[(k + 23) % 24] && bins[k] > bins[(k + 1) % 24] && bins[k] > 0) peaks.push({ hue: k * 15 + 7.5, share: w / total, vivid: total / Math.max(1, pixels) });
      }
      palettes[a.key] = peaks.sort((x, y) => y.share - x.share).slice(0, 2);
    }
    if (!found.length) {
      out[a.key] = null;
      continue;
    }
    const med = (xs) => xs.slice().sort((p, q) => p - q)[Math.floor(xs.length / 2)];
    out[a.key] = {
      x: med(found.map((r) => r.f.box[0] / r.w)),
      y: med(found.map((r) => r.f.box[1] / r.h)),
      w: med(found.map((r) => r.f.box[2] / r.w)),
      h: med(found.map((r) => r.f.box[3] / r.h)),
      eyeY: med(found.map((r) => (r.f.landmarks[0][1] + r.f.landmarks[1][1]) / 2 / r.h)),
      yaw: med(found.map((r) => {
        const [e0, e1, nose] = r.f.landmarks;
        const iod = Math.abs(e1[0] - e0[0]) || 1;
        return (nose[0] - (e0[0] + e1[0]) / 2) / iod;
      })),
      score: med(found.map((r) => r.f.score)),
      count: Math.max(...found.map((r) => r.count))
    };
  }
  return out;
}

// src/colors.ts
var ACCENT = { minVivid: 8e-3, secondShare: 0.25, lightness: 0.66, yellowLightness: 0.56, saturation: 0.92, minLightness: 0.6 };
function hsl(h, s, l) {
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
}
function toHsl(c) {
  const [r, g, b] = c.map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? (g - b) / d % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}
var vivid = (h) => hsl(h, ACCENT.saturation, h >= 40 && h <= 75 ? ACCENT.yellowLightness : ACCENT.lightness);
function shotAccents(p) {
  if (!p?.length || p[0].vivid < ACCENT.minVivid) return null;
  const out = [vivid(p[0].hue)];
  if (p[1] && p[1].share >= ACCENT.secondShare && Math.abs((p[1].hue - p[0].hue + 540) % 360 - 180) > 30) out.push(vivid(p[1].hue));
  return out;
}
function liftAccent(c) {
  const [h, s, l] = toHsl(c);
  return l >= ACCENT.minLightness ? c : hsl(h, Math.max(s, 0.8), ACCENT.lightness);
}
var isAccent = (c) => Math.min(...c) < 225 || Math.max(...c) - Math.min(...c) > 30;
var HOUSE = [[255, 138, 83], [243, 198, 15], [102, 189, 255], [161, 134, 255], [254, 166, 128]];
function poolPalettes(list2) {
  const score = /* @__PURE__ */ new Map(), vivid2 = [];
  for (const p of list2) {
    if (!p?.length) continue;
    vivid2.push(p[0].vivid);
    for (const q of p) score.set(q.hue, (score.get(q.hue) || 0) + q.share * q.vivid);
  }
  if (!vivid2.length) return void 0;
  const total = [...score.values()].reduce((a, b) => a + b, 0) || 1;
  const v = vivid2.reduce((a, b) => a + b, 0) / vivid2.length;
  return [...score.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([hue, w]) => ({ hue, share: w / total, vivid: v }));
}

// src/layout.ts
var RULES = {
  faceX: 0.35,
  // face centre (cw) when the text is on the right; 1 - faceX when on the left
  faceTop: 0.16,
  // face-box top (ch)
  faceH: 0.31,
  // target face-box height (ch); we only zoom in, by at most maxZoom
  maxZoom: 1.35,
  yawTurned: 0.1,
  roomMin: 0.36,
  // a column needs this much room beside the face (cw)
  outer: 0.065,
  // column outer edge to card edge (cw)
  colTop: 0.25,
  // column top above the face top (fh)
  colHeight: [[4, 0.22], [7, 0.39], [10, 0.58], [999, 0.78]],
  // words -> column height (ch)
  colHero: 0.12,
  // hero cap height in a column (ch)
  flowBesideHero: 0.1,
  // a flow's beside part is set smaller: its hero goes under the chin
  underGap: 0.12,
  // chin to the under-chin part (ch), inset card
  underOnlyGap: 0.053,
  underWidth: 0.77,
  // cw
  underHero: 0.16,
  // hero cap height under the chin (ch)
  leadHero: 0.06,
  // a lead-in line stacked above the under-chin words (ch)
  roomStack: 0.32,
  // free width beside the head (cw, person mask) below which everything goes under the chin
  besideMinCap: 0.05,
  // a beside part smaller than this (cap height, ch) is unreadable: stack instead
  bottom: 0.07,
  // lowest text to card bottom (ch)
  top: 0.04,
  // card top to highest text (ch)
  side: 0.06,
  // card side to text (cw)
  underRoom: 0.35,
  // below this much space under the chin (ch) a long line goes beside the face instead
  besideMaxWords: 4,
  // longer lines go under the chin as one block
  smallFace: 0.15,
  // below this face height (ch) the talking-head rules do not apply
  bigFace: 0.5,
  free: { cy: 0.44, width: 0.75, hero: 0.16, height: 0.5 }
};
var cw = CARD.w;
var ch = CARD.h;
var cx0 = CARD.x;
var cy0 = CARD.y;
var cx1 = CARD.x + CARD.w;
var cy1 = CARD.y + CARD.h;
var round = (v, d = 1e3) => Math.round(v * d) / d;
function picture(sw, sh) {
  const c = Math.min(W / sw, H / sh);
  const fitW = sw * c, fitH = sh * c;
  return { fitW, fitH, cover: Math.max(cw / fitW, ch / fitH) };
}
function planShot(sw, sh, face, n, angle) {
  const pic = picture(sw || 1920, sh || 1080);
  if (!face && angle) face = angle.face;
  if (!face) {
    const iw2 = pic.fitW * pic.cover, ih2 = pic.fitH * pic.cover;
    return { family: "free", side: null, crop: { scale: round(pic.cover, 1e4), posX: 0, posY: 0 }, face: null, eye: null, split: n, yaw: 0, pic: [W / 2 - iw2 / 2, H / 2 - ih2 / 2, W / 2 + iw2 / 2, H / 2 + ih2 / 2] };
  }
  const frameFace = angle ? angle.face : face;
  const fh0 = frameFace.h * pic.fitH * pic.cover / ch;
  const zoom = Math.max(1, Math.min(RULES.maxZoom, RULES.faceH / Math.max(1e-3, fh0)));
  const S = pic.cover * zoom, iw = pic.fitW * S, ih = pic.fitH * S;
  const maxX = Math.max(0, (iw - cw) / 2), maxY = Math.max(0, (ih - ch) / 2);
  const clampX = (v) => Math.max(-maxX, Math.min(maxX, v)), clampY = (v) => Math.max(-maxY, Math.min(maxY, v));
  const fcx = (frameFace.x + frameFace.w / 2 - 0.5) * iw;
  const py = clampY(cy0 + RULES.faceTop * ch - (H / 2 + (frameFace.y - 0.5) * ih));
  const boxAt = (px) => {
    const x0 = W / 2 + px + (face.x - 0.5) * iw, y0 = H / 2 + py + (face.y - 0.5) * ih;
    return [x0, y0, x0 + face.w * iw, y0 + face.h * ih];
  };
  const pxFor = (side2) => clampX((side2 === "right" ? cx0 + RULES.faceX * cw : side2 === "left" ? cx1 - RULES.faceX * cw : W / 2) - W / 2 - fcx);
  const room = (side2) => {
    const b = boxAt(pxFor(side2));
    return (side2 === "right" ? cx1 - b[2] : b[0] - cx0) / cw;
  };
  let side = face.yaw >= RULES.yawTurned ? "right" : face.yaw <= -RULES.yawTurned ? "left" : room("right") >= room("left") ? "right" : "left";
  if (room(side) < RULES.roomMin && room(side === "right" ? "left" : "right") >= RULES.roomMin) side = side === "right" ? "left" : "right";
  if (angle?.side) side = angle.side;
  const eye = H / 2 + py + (face.eyeY - 0.5) * ih;
  const picAt = (px) => [W / 2 + px - iw / 2, H / 2 + py - ih / 2, W / 2 + px + iw / 2, H / 2 + py + ih / 2];
  const crop = (px) => ({ scale: round(S, 1e4), posX: round(px / H * 100), posY: round(-py / H * 100) });
  const fhCard = face.h * ih / ch;
  const sideBox = boxAt(pxFor(side));
  const faceCy = ((sideBox[1] + sideBox[3]) / 2 - cy0) / ch;
  if (fhCard < RULES.smallFace) {
    const px = angle?.side ? pxFor(angle.side) : pxFor(null), b = boxAt(px);
    return { family: faceCy > 0.39 ? "above" : "under", side: null, crop: crop(px), face: b, eye, split: n, yaw: face.yaw, pic: picAt(px) };
  }
  const roomOk = room(side) >= RULES.roomMin;
  const underSpace = (cy1 - sideBox[3]) / ch;
  let family;
  if (n <= RULES.besideMaxWords && roomOk) family = "column";
  else if (underSpace < RULES.underRoom && roomOk) family = "column";
  else family = "under";
  if (family === "under") {
    const px = angle?.side ? pxFor(angle.side) : pxFor(null);
    return { family, side: null, crop: crop(px), face: boxAt(px), eye, split: n, yaw: face.yaw, pic: picAt(px) };
  }
  return { family, side, crop: crop(pxFor(side)), face: sideBox, eye, split: n, yaw: face.yaw, pic: picAt(pxFor(side)) };
}
var tf = (b, s, x0, y0) => [round(s), round(x0 - s * b[0], 10), round(y0 - s * b[1], 10)];
function placeParts(p, parts, tuck = 0) {
  const out = [];
  const dims = (b) => [Math.max(1, b[2] - b[0]), Math.max(1, b[3] - b[1])];
  const heroScale = (part, capCh) => capCh * ch / Math.max(1, part.heroCap);
  const f = p.face;
  if (p.family === "free" || !f) {
    const [bw, bh] = dims(parts[0].box);
    const s = Math.min(heroScale(parts[0], RULES.free.hero), RULES.free.width * cw / bw, RULES.free.height * ch / bh);
    const cy = Math.max(cy0 + RULES.top * ch + s * bh / 2, Math.min(cy1 - RULES.bottom * ch - s * bh / 2, cy0 + RULES.free.cy * ch));
    return [tf(parts[0].box, s, W / 2 - s * bw / 2, cy - s * bh / 2)];
  }
  const fh = f[3] - f[1];
  if (p.family === "above" || p.family === "under") {
    const [bw, bh] = dims(parts[0].box);
    const above = p.family === "above";
    const top = above ? cy0 + RULES.top * ch : f[3] + RULES.underOnlyGap * ch;
    const bottom = above ? f[1] - 0.15 * fh : cy1 - RULES.bottom * ch;
    const s = Math.max(0.2, Math.min(heroScale(parts[0], RULES.underHero), RULES.underWidth * cw / bw, Math.max(40, bottom - top) / bh));
    const y = above ? Math.max(top, bottom - s * bh) : top;
    return [tf(parts[0].box, s, W / 2 - s * bw / 2, y)];
  }
  const right = p.side !== "left";
  const fw = f[2] - f[0];
  const inner = right ? f[2] - tuck * fw : f[0] + tuck * fw;
  const outerEdge = right ? cx1 - RULES.outer * cw : cx0 + RULES.outer * cw;
  const width = Math.max(60, right ? outerEdge - inner : inner - outerEdge);
  const nA = p.split;
  let colH = (RULES.colHeight.find(([n]) => nA <= n) || RULES.colHeight[RULES.colHeight.length - 1])[1] * ch;
  if (p.family === "flow") colH = Math.min(colH, f[3] + (RULES.underGap - 0.03) * ch - (f[1] - RULES.colTop * fh));
  {
    const [bw, bh] = dims(parts[0].box);
    const s = Math.min(heroScale(parts[0], p.family === "column" ? RULES.colHero : RULES.flowBesideHero), width / bw, colH / bh);
    const x = right ? inner : inner - s * bw;
    const eye = p.eye ?? f[1] + 0.4 * fh;
    let y = eye - s * bh / 2;
    y = Math.max(y, f[1] - RULES.colTop * fh, cy0 + RULES.top * ch);
    const floor = p.family === "flow" ? f[3] + (RULES.underGap - 0.03) * ch : cy1 - RULES.bottom * ch;
    y = Math.min(y, floor - s * bh);
    out.push(tf(parts[0].box, s, x, y));
  }
  if (p.family === "flow" && parts[1]) {
    const [bw, bh] = dims(parts[1].box);
    const a = out[0];
    const besideBottom = a[2] + a[0] * parts[0].box[3];
    const top = Math.max(f[3] + RULES.underGap * ch, besideBottom + 0.01 * ch);
    const avail = cy1 - RULES.bottom * ch - top;
    const s = Math.max(0.2, Math.min(heroScale(parts[1], RULES.underHero), RULES.underWidth * cw / bw, Math.max(60, avail) / bh));
    out.push(tf(parts[1].box, s, W / 2 - s * bw / 2, top));
  }
  return out;
}
function angleSide(sw, sh, face) {
  return planShot(sw, sh, face, 3).side;
}
function placeStacked(p, parts) {
  const f = p.face;
  if (!f) return placeParts(p, parts);
  const dims = (b) => [Math.max(1, b[2] - b[0]), Math.max(1, b[3] - b[1])];
  const heroScale = (part, capCh) => capCh * ch / Math.max(1, part.heroCap);
  const top = f[3] + RULES.underOnlyGap * ch, avail = cy1 - RULES.bottom * ch - top, gap = 0.01 * ch;
  const sc = parts.map((part, i) => {
    const [bw] = dims(part.box);
    const lead = parts.length > 1 && i === 0;
    return Math.min(heroScale(part, lead ? RULES.leadHero : RULES.underHero), RULES.underWidth * cw / bw);
  });
  const heights = parts.map((part, i) => sc[i] * dims(part.box)[1]);
  const total = heights.reduce((a, b) => a + b, 0) + gap * (parts.length - 1);
  const k = total > avail ? Math.max(0.3, avail / total) : 1;
  const out = [];
  let y = top;
  parts.forEach((part, i) => {
    const s = sc[i] * k, [bw, bh] = dims(part.box);
    out.push(tf(part.box, s, W / 2 - s * bw / 2, y));
    y += s * bh + gap * k;
  });
  return out;
}
function personRoom(p, mattes) {
  const f = p.face;
  if (!f || !p.side || !mattes.length) return null;
  const [px0, py0, px1, py1] = p.pic;
  const fh = f[3] - f[1];
  let room = Infinity;
  for (const m of mattes) {
    for (let y = f[1] - 0.25 * fh; y <= f[3]; y += fh / 8) {
      const my = Math.round((y - py0) / (py1 - py0) * m.h);
      if (my < 0 || my >= m.h) continue;
      const edge = p.side === "right" ? cx1 : cx0, step = p.side === "right" ? -2 : 2;
      let x = edge, free = 0;
      for (; p.side === "right" ? x > f[0] : x < f[2]; x += step) {
        const mx = Math.round((x - px0) / (px1 - px0) * m.w);
        if (mx >= 0 && mx < m.w && m.data[my * m.w + mx] < 128) break;
        free = Math.abs(x - edge);
      }
      room = Math.min(room, free);
    }
  }
  return Number.isFinite(room) ? room : null;
}

// src/lockups.ts
var SYSTEM_FONTS = () => isWindows() ? { b: ["C:\\Windows\\Fonts\\arialbi.ttf"], o: ["C:\\Windows\\Fonts\\arial.ttf"] } : { b: ["/System/Library/Fonts/Supplemental/Arial Bold Italic.ttf", "/Library/Fonts/Arial Bold Italic.ttf"], o: ["/System/Library/Fonts/Supplemental/Arial.ttf", "/Library/Fonts/Arial.ttf"] };
async function fonts() {
  const sys = SYSTEM_FONTS();
  const pick = (list2) => list2.find((p) => exists(p));
  const b = pick(sys.b), o = pick(sys.o);
  if (!b || !o) throw new Error("Arial (Bold Italic and Regular) is needed for the captions and was not found on this computer.");
  const text = (await readText(join(skillsDir(), "fonts", "Literata-VF.ttf.gz.b64"))).replace(/\s+/g, "");
  const bin = atob(text), gz = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) gz[i] = bin.charCodeAt(i);
  const s = await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
  return { b: await readBytes(b), o: await readBytes(o), s };
}
async function layoutJobs(jobs, onProgress) {
  const code = await readText(join(skillsDir(), "engine.js"));
  const url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
  const f = await fonts();
  const out = new Array(jobs.length);
  const cores = Math.max(2, Math.min(6, (navigator.hardwareConcurrency || 4) - 2));
  let next = 0, done = 0;
  const runOne = (job) => new Promise((resolve2, reject) => {
    const w = new Worker(url);
    w.onmessage = (e) => {
      w.terminate();
      resolve2(e.data);
    };
    w.onerror = (e) => {
      w.terminate();
      reject(new Error("Caption layout failed: " + (e.message || "worker error")));
    };
    w.postMessage({ fonts: { b: f.b.slice(0), s: f.s.slice(0), o: f.o.slice(0) }, job });
  });
  try {
    await Promise.all(
      Array.from({ length: Math.min(cores, jobs.length) }, async () => {
        while (next < jobs.length) {
          const i = next++;
          out[i] = await runOne(jobs[i]);
          onProgress?.(++done, jobs.length);
        }
      })
    );
  } finally {
    URL.revokeObjectURL(url);
  }
  return out;
}
var hex = (c) => "#" + c.slice(0, 3).map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
var r1 = (v) => Math.round(v * 10) / 10;
function graphicData(plan, captions, uid, masks = null) {
  const defIndex = /* @__PURE__ */ new Map(), defs = [];
  const colorIndex = /* @__PURE__ */ new Map(), colors = [];
  const scenes = plan.shots.map((shot, si) => {
    const cap = captions[si];
    const g = [];
    const remap = /* @__PURE__ */ new Map();
    const recolor = (c) => {
      if (!cap.shadow || !isAccent(c)) return c;
      const key = c.join(",");
      if (!remap.has(key)) remap.set(key, cap.accents?.length ? cap.accents[Math.min(remap.size, cap.accents.length - 1)] : liftAccent(c));
      return remap.get(key);
    };
    cap.parts.forEach((lay, pi) => {
      const paths = new Map(lay.defs);
      const [s, tx, ty] = cap.tfs[pi] || [1, 0, 0];
      for (const gl of lay.glyphs) {
        if (!defIndex.has(gl.key)) {
          defIndex.set(gl.key, defs.length);
          defs.push(paths.get(gl.key) || "");
        }
        const c = hex(recolor(gl.color));
        if (!colorIndex.has(c)) {
          colorIndex.set(c, colors.length);
          colors.push(c);
        }
        const w = shot.words[Math.min(cap.firstWord[pi] + gl.word, shot.words.length - 1)];
        g.push(defIndex.get(gl.key), r1(tx + s * gl.x), r1(ty + s * gl.y), Math.round(s * gl.k * 1e5) / 1e5, colorIndex.get(c), w ? w.reveal : shot.from);
      }
    });
    const behind = masks && cap.behind?.length && cap.pic ? cap.behind : void 0;
    return { from: shot.from, to: shot.to, tf: null, shadow: cap.shadow ? 1 : 0, g, ...behind ? { behind, pic: cap.pic.map((v) => r1(v)), ms: shot.src - shot.from } : {} };
  });
  return { uid, fade: Math.max(1, Math.round(FADE_SECONDS * plan.fps)), defs, colors, scenes, ...masks ? { masks } : {} };
}

// src/broll.ts
var stockAvailable = () => {
  try {
    return typeof di()?.StockMediaSearch?.searchVideos === "function";
  } catch {
    return false;
  }
};
var hash = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
};
async function findStock(query, seconds, avoid) {
  const q = String(query || "").replace(/[^\p{L}\p{N}\s'-]+/gu, " ").split(/\s+/).filter(Boolean).slice(0, 5).join(" ");
  if (!q) return null;
  for (const orientation of ["portrait", "landscape"]) {
    let rows = [];
    try {
      rows = await di().StockMediaSearch.searchVideos({ query: q, per: 10, orientation }) || [];
    } catch {
      rows = [];
    }
    for (const v of rows) {
      if (!v || avoid.has(v.originalUrl) || !(v.duration >= seconds + 1)) continue;
      const files = (Array.isArray(v.files) && v.files.length ? v.files : [{ url: v.originalUrl, width: v.width, height: v.height }]).filter((f) => f && f.url);
      const fit = files.filter((f) => Math.min(f.width || 0, f.height || 0) >= 720).sort((a, b) => a.width * a.height - b.width * b.height)[0];
      if (!fit) continue;
      const dir = dataDir("stock");
      const path = join(dir, "stock-" + hash(fit.url) + ".mp4");
      if (!exists(path)) {
        try {
          await fs().downloadFile(fit.url, path);
        } catch {
          continue;
        }
      }
      if (!exists(path)) continue;
      avoid.add(v.originalUrl);
      const service = /^pex/i.test(String(v.serviceName || "")) ? "Pexels" : String(v.serviceName || "");
      return { path, w: fit.width, h: fit.height, duration: v.duration, credit: String(v.authorName || "unknown"), url: String(v.authorUrl || v.originalUrl), service };
    }
  }
  return null;
}

// src/matte.ts
var MODEL = "model_v1_dmVlZC92aWRlby1iYWNrZ3JvdW5kLXJlbW92YWwvZmFzdA";
var FAILED = /* @__PURE__ */ new Set(["failed", "cancelled", "input_failed", "submission_rejected", "upload_failed", "handoff_failed"]);
var HEIGHT = 720;
var hash2 = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
};
var fpsExpr = (fps) => {
  for (const [n, d] of [[24e3, 1001], [3e4, 1001], [6e4, 1001], [24, 1], [25, 1], [30, 1], [50, 1], [60, 1]]) if (Math.abs(fps - n / d) < 1e-3) return n + "/" + d;
  return fps.toFixed(4);
};
var list = (dir) => {
  try {
    return fs().readdirSync(dir).map(String).filter((n) => /^matte_\d{6}\.png$/.test(n)).sort();
  } catch {
    return [];
  }
};
async function size(path) {
  const bmp = await createImageBitmap(new Blob([await readBytes(path)], { type: "image/png" }));
  const out = { w: bmp.width, h: bmp.height };
  bmp.close?.();
  return out;
}
async function speakerMattes(sdk, projectId, src, plan, notes, progress) {
  const mg = di().MediaGeneration;
  if (!mg?.supportsPluginFiles?.()) {
    notes.push("No speaker masks: this Selects version cannot send plugin files to generation (needs 2.0.512 or later).");
    return null;
  }
  const libraryId = (window.parent.location.pathname.match(/libraries\/([^/]+)/) || [])[1];
  if (!libraryId) return null;
  const clips = src.clips.filter((c) => c.e > plan.srcFrom && c.s < plan.srcTo);
  if (!clips.length || clips.some((c) => !c.path || c.off == null || c.rid !== clips[0].rid || Math.abs(c.off - clips[0].off) > 0.05)) {
    notes.push("No speaker masks: the quote spans more than one source stretch.");
    return null;
  }
  if (clips.some((c) => Math.abs(c.speed - 1) > 0.02)) {
    notes.push("No speaker masks: the quote plays at a changed speed.");
    return null;
  }
  const clip = clips[0];
  const start = plan.srcFrom / plan.fps + clip.off, seconds = (plan.srcTo - plan.srcFrom) / plan.fps;
  const dir = dataDir("mattes", hash2(clip.path + "|" + start.toFixed(3) + "|" + seconds.toFixed(3) + "|" + plan.fps));
  const base = String(fs().pathToLocalURL(dir)).replace(/\/+$/, "");
  const expected = Math.round(seconds * plan.fps);
  const complete = (n) => n >= expected - 2;
  const done = list(dir);
  if (done.length && complete(done.length)) return { dir, base, count: done.length, ...await size(join(dir, done[0])) };
  const attemptsFile = join(dir, "attempt.txt");
  let attempt = exists(attemptsFile) ? Number(await readText(attemptsFile)) || 0 : 0;
  if (done.length) {
    for (const n of done) {
      try {
        fs().rmSync(join(dir, n), { force: true });
      } catch {
      }
    }
    attempt += 1;
    await writeText(attemptsFile, String(attempt));
  }
  const input = join(dir, "source.mp4"), cutDone = join(dir, "source.ok");
  if (!exists(input) || !exists(cutDone)) {
    progress("cutting the quote for speaker masks");
    await ffmpegRuns(sdk, "Cut the quote for speaker masks", [[
      "-ss",
      start.toFixed(3),
      "-i",
      clip.path,
      "-t",
      seconds.toFixed(3),
      "-an",
      "-vf",
      "scale=-2:" + HEIGHT + ",fps=" + fpsExpr(plan.fps),
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "20",
      "-pix_fmt",
      "yuv420p",
      input
    ]], 3e5);
    if (!exists(input)) throw new Error("The quote could not be cut for speaker masks.");
    await writeText(cutDone, "ok");
  }
  const scope = { libraryId, projectId };
  progress("sending the quote for speaker masks");
  let jobId;
  try {
    jobId = (await mg.submit({
      scope,
      key: "qlr-" + dir.split(/[\\/]/).pop() + (attempt ? "-" + attempt : ""),
      // one request per cut and attempt: a reload never pays twice
      modelId: MODEL,
      input: { video_url: "selects-input:source", output_codec: "h264", refine_foreground_edges: false, subject_is_person: true },
      inputMediaSeconds: { video: seconds },
      uploads: { source: { pluginFile: input } },
      delivery: { pluginFolder: join(dir, "cloud") },
      outputName: "speaker-masks",
      batch: 1,
      origin: { tool: "video", tab: ID, recipeId: "speaker-masks" }
    })).jobIds[0];
  } catch (e) {
    const code = e?.code || e?.message;
    throw new Error(code === "insufficient_credits" ? "Not enough Selects credits for speaker masks." : "Speaker masks could not be requested (" + code + ").");
  }
  const t0 = Date.now();
  let alpha = null;
  for (; ; ) {
    await new Promise((r) => setTimeout(r, 1500));
    const j = (await mg.list(scope)).find((x) => x.jobId === jobId);
    if (!j) continue;
    if (j.deliveryStatus === "delivered") {
      alpha = (j.outputs || []).find((o) => o.path)?.path ?? null;
      break;
    }
    if (FAILED.has(j.status) || ["download_failed", "result_collection_failed"].includes(j.deliveryStatus)) {
      await writeText(attemptsFile, String(attempt + 1));
      throw new Error("Speaker masks failed (" + (j.errorCode || j.status) + ").");
    }
    const uploading = ["preparing", "uploading", "submitting"].includes(j.status);
    progress((uploading ? "uploading for speaker masks" : "making speaker masks") + " \xB7 " + Math.round((Date.now() - t0) / 1e3) + " s");
    if (Date.now() - t0 > (uploading ? 4 : 15) * 6e4) {
      await mg.cancel(scope, jobId).catch(() => {
      });
      await writeText(attemptsFile, String(attempt + 1));
      throw new Error(uploading ? "the upload for speaker masks did not go through" + (j.errorCode ? " (" + j.errorCode + ")" : "") + "; words stay in front of the speaker." : "Speaker masks took too long.");
    }
  }
  if (!alpha) {
    await writeText(attemptsFile, String(attempt + 1));
    throw new Error("No speaker masks came back.");
  }
  progress("writing speaker mask files");
  await ffmpegRuns(sdk, "Write speaker mask files", [["-i", alpha, "-vf", "format=gray,negate", join(dir, "matte_%06d.png")]], 3e5);
  const names = list(dir);
  if (!names.length) throw new Error("The speaker mask files could not be written.");
  if (!complete(names.length)) {
    for (const n of names) {
      try {
        fs().rmSync(join(dir, n), { force: true });
      } catch {
      }
    }
    try {
      fs().rmSync(join(dir, "cloud"), { recursive: true, force: true });
    } catch {
    }
    await writeText(attemptsFile, String(attempt + 1));
    throw new Error("the masks came back incomplete (" + names.length + " of " + expected + " frames); words stay in front of the speaker.");
  }
  for (const extra of [input, cutDone, join(dir, "cloud")]) {
    try {
      fs().rmSync(extra, { recursive: true, force: true });
    } catch {
    }
  }
  return { dir, base, count: names.length, ...await size(join(dir, names[0])) };
}
async function readMatte(m, frame) {
  const p = join(m.dir, "matte_" + String(Math.max(1, Math.min(m.count, frame + 1))).padStart(6, "0") + ".png");
  if (!exists(p)) return null;
  const bmp = await createImageBitmap(new Blob([await readBytes(p)], { type: "image/png" }));
  const cv = new OffscreenCanvas(bmp.width, bmp.height);
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bmp, 0, 0);
  const rgba = ctx.getImageData(0, 0, bmp.width, bmp.height).data;
  const data = new Uint8Array(bmp.width * bmp.height);
  for (let i = 0, o = 0; i < rgba.length; i += 4, o += 1) data[o] = rgba[i];
  return { data, w: bmp.width, h: bmp.height };
}

// src/behind.ts
var BEHIND = { tucks: [0.45, 0.3, 0.15, 0, -0.15, -0.3, -0.5], minVisible: 0.9, minGlyph: 0.6, frames: [0.1, 0.3, 0.5, 0.7, 0.9] };
function behindGlyphs(p, parts, tfs, firstWord, mattes) {
  const f = p.face;
  if (!f || !mattes.length) return { behind: [], minVisible: 1 };
  const fw = f[2] - f[0], fh = f[3] - f[1];
  const head = [f[0] - 0.5 * fw, f[1] - 0.7 * fh, f[2] + 0.5 * fw, f[3] + 0.1 * fh];
  const [px0, py0, px1, py1] = p.pic;
  const covered = (m, b) => {
    const mx = (x) => (x - px0) / (px1 - px0) * m.w, my = (y) => (y - py0) / (py1 - py0) * m.h;
    const x0 = Math.max(0, Math.floor(mx(b[0]))), x1 = Math.min(m.w - 1, Math.ceil(mx(b[2])));
    const y0 = Math.max(0, Math.floor(my(b[1]))), y1 = Math.min(m.h - 1, Math.ceil(my(b[3])));
    if (x1 <= x0 || y1 <= y0) return 0;
    const step = Math.max(1, Math.floor(Math.min(x1 - x0, y1 - y0) / 12));
    let hit = 0, all = 0;
    for (let y = y0; y <= y1; y += step) for (let x = x0; x <= x1; x += step, all += 1) if (m.data[y * m.w + x] < 128) hit += 1;
    return all ? hit / all : 0;
  };
  const behind = [];
  const words = /* @__PURE__ */ new Map();
  let index = 0, worstGlyph = 1;
  parts.forEach((lay, pi) => {
    const t = tfs[pi] || [1, 0, 0];
    for (const g of lay.glyphs) {
      const b = [t[1] + t[0] * g.box[0], t[2] + t[0] * g.box[1], t[1] + t[0] * g.box[2], t[2] + t[0] * g.box[3]];
      const area = Math.max(1, (b[2] - b[0]) * (b[3] - b[1]));
      const w = firstWord[pi] + g.word;
      const acc = words.get(w) || { area: 0, hidden: 0 };
      acc.area += area;
      const nearHead = pi === 0 && b[0] < head[2] && b[2] > head[0] && b[1] < head[3] && b[3] > head[1];
      if (nearHead) {
        behind.push(index);
        const c = Math.max(...mattes.map((m) => covered(m, b)));
        acc.hidden += area * c;
        worstGlyph = Math.min(worstGlyph, 1 - c);
      }
      words.set(w, acc);
      index += 1;
    }
  });
  const minWord = Math.min(1, ...[...words.values()].map((v) => 1 - v.hidden / v.area));
  const minVisible = worstGlyph < BEHIND.minGlyph ? Math.min(minWord, worstGlyph) : minWord;
  return { behind, minVisible };
}

// src/renderers.ts
var matteCode = '// src/motion/Matte.tsx\nimport React from "react";\nimport { useCurrentFrame, useVideoConfig } from "remotion";\nvar n = (v, f) => typeof v === "number" && Number.isFinite(v) ? v : f;\nfunction Matte({ data = {} }) {\n  const f = useCurrentFrame();\n  const { width: W, height: H } = useVideoConfig();\n  const blacks = Array.isArray(data.blacks) ? data.blacks : [];\n  if (blacks.some((b) => f >= b[0] && f < b[1])) return /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", inset: 0, backgroundColor: "#000" } });\n  const c = data.card || {};\n  const x = n(c.x, 47), y = n(c.y, 255.5), w = n(c.w, 986), h = n(c.h, 1409), r = n(c.r, 120);\n  const hole = "M" + (x + r) + "," + y + " H" + (x + w - r) + " A" + r + "," + r + " 0 0 1 " + (x + w) + "," + (y + r) + " V" + (y + h - r) + " A" + r + "," + r + " 0 0 1 " + (x + w - r) + "," + (y + h) + " H" + (x + r) + " A" + r + "," + r + " 0 0 1 " + x + "," + (y + h - r) + " V" + (y + r) + " A" + r + "," + r + " 0 0 1 " + (x + r) + "," + y + " Z";\n  return /* @__PURE__ */ React.createElement("svg", { width: W, height: H, viewBox: "0 0 " + W + " " + H, style: { position: "absolute", left: 0, top: 0 } }, /* @__PURE__ */ React.createElement("path", { d: "M0,0 H" + W + " V" + H + " H0 Z " + hole, fill: "#000", fillRule: "evenodd" }));\n}\nexport {\n  Matte as default\n};\n';
var lockupsCode = `// src/motion/Lockups.tsx
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
var n = (v, f) => typeof v === "number" && Number.isFinite(v) ? v : f;
function Lockups({ data = {} }) {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const scenes = Array.isArray(data.scenes) ? data.scenes : [];
  const scene = scenes.find((s) => f >= n(s.from, 0) && f < n(s.to, 0));
  if (!scene) return null;
  const defs = Array.isArray(data.defs) ? data.defs : [];
  const colors = Array.isArray(data.colors) ? data.colors : ["#fff"];
  const fade = Math.max(1, n(data.fade, 8));
  const uid = String(data.uid || "q").replace(/[^a-zA-Z0-9_-]/g, "");
  const g = Array.isArray(scene.g) ? scene.g : [];
  const masks = data.masks && typeof data.masks.base === "string" ? data.masks : null;
  const pic = masks && Array.isArray(scene.pic) ? scene.pic : null;
  const back = new Set(pic && Array.isArray(scene.behind) ? scene.behind : []);
  const used = /* @__PURE__ */ new Set();
  const front = [], behind = [];
  for (let i = 0; i + 5 < g.length; i += 6) {
    const op = Math.max(0, Math.min(1, (f - g[i + 5]) / fade));
    if (op <= 0) continue;
    used.add(g[i]);
    const el = /* @__PURE__ */ React.createElement(
      "use",
      {
        key: i,
        href: "#" + uid + "g" + g[i],
        transform: "translate(" + g[i + 1] + " " + g[i + 2] + ") scale(" + g[i + 3] + " " + -g[i + 3] + ")",
        fill: colors[g[i + 4]] || "#fff",
        opacity: op
      }
    );
    (back.has(i / 6) ? behind : front).push(el);
  }
  const sx = W / 1080, sy = H / 1920;
  const shadow = scene.shadow ? "url(#" + uid + "sh)" : void 0;
  let layer = null;
  if (pic && behind.length) {
    const url = masks.base + "/matte_" + String(Math.min(n(masks.count, 1), Math.max(1, f + n(scene.ms, 0) + 1))).padStart(6, "0") + ".png";
    const left = pic[0] * sx, top = pic[1] * sy, w = (pic[2] - pic[0]) * sx, h = (pic[3] - pic[1]) * sy;
    layer = /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", left, top, width: w, height: h, overflow: "hidden", maskImage: 'url("' + url + '")', maskMode: "luminance", maskSize: "100% 100%", maskRepeat: "no-repeat", maskPosition: "0 0" } }, /* @__PURE__ */ React.createElement("svg", { width: W, height: H, viewBox: "0 0 1080 1920", style: { position: "absolute", left: -left, top: -top } }, /* @__PURE__ */ React.createElement("g", { filter: shadow }, behind)));
  }
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("svg", { width: 0, height: 0, style: { position: "absolute" } }, /* @__PURE__ */ React.createElement("defs", null, [...used].map((d) => /* @__PURE__ */ React.createElement("path", { key: d, id: uid + "g" + d, d: defs[d] || "" })), /* @__PURE__ */ React.createElement("filter", { id: uid + "sh", x: "-20%", y: "-20%", width: "140%", height: "140%" }, /* @__PURE__ */ React.createElement("feDropShadow", { dx: "0", dy: "2", stdDeviation: "9", floodColor: "#000", floodOpacity: "0.6" })))), layer, /* @__PURE__ */ React.createElement("svg", { width: W, height: H, viewBox: "0 0 1080 1920", style: { position: "absolute", left: 0, top: 0 } }, /* @__PURE__ */ React.createElement("g", { filter: shadow }, front)));
}
export {
  Lockups as default
};
`;

// src/draft.ts
var LABELS = { matte: "Quote Reel Frame", lockups: "Quote Reel Captions" };
async function importFiles(sdk, projectId, paths) {
  return script(
    sdk,
    "Import music and B-roll",
    `const p = selects.project(${J(projectId)});
const paths: string[] = ${J(paths)};
const list = async () => { const tree: any = await p.sourceFiles(); const files: any[] = [];
  const walk = (nodes: any[]) => { for (const n of nodes || []) { if (n.type === "dir") walk(n.children); else files.push(n); } };
  walk(Array.isArray(tree) ? tree : ("fileTree" in tree ? tree.fileTree : [])); return files; };
const have = await list();
const missing = paths.filter((path) => !have.some((x: any) => x.path === path));
let added: string[] = [];
if (missing.length) added = ((await p.importFiles({ paths: missing })) as any).addedResourceIds || [];
const files = missing.length ? await list() : have;
return paths.map((path) => { const f = files.find((x: any) => x.path === path); if (f) return f.resourceId;
  const m = missing.indexOf(path); return m >= 0 && added.length === missing.length ? added[m] : null; });`,
    true
  );
}
async function createReel(sdk, projectId, sequenceId, name, plan, crops, voiceDb = 0) {
  return script(
    sdk,
    "Create the reel Draft",
    `const p = selects.project(${J(projectId)});
const src = selects.draft(${J(sequenceId)});
const taken: string[] = ((await p.readFootage()) as any).drafts.map((d: any) => d.name);
let name = ${J(name)};
for (let k = 2; taken.includes(name); k += 1) name = ${J(name)} + " (" + k + ")";
const d = await p.createDraft({ name });
// Each shot's stretch of the quote, in order (the long pauses between clauses left out).
const spans: number[][] = ${J(plan.shots.map((s) => [plan.srcFrom + s.src, plan.srcFrom + s.src + s.to - s.from]))};
for (let i = 0; i < spans.length; i += 1) {
  await d.insert({ source: await src.rangeAtFrames(spans[i][0], spans[i][1]), tracks: "main" });
  if (i === 0) await d.setFrameSize({ width: ${1080}, height: ${1920} });
}
const shots: { from: number; to: number; crop: { scale: number; posX: number; posY: number } | null; rid: string | null }[] = ${J(crops)};
// One Main clip per shot, so every shot gets its own framing (inserts of touching stretches may have joined).
for (const s of shots.slice(1)) { try { await d.splitAt({ frame: s.from }); } catch {} }
const sizes: Record<string, number[]> = {};
const mains = async () => (await d.clips({ trackScope: "main" })).filter((c: any) => c.trackKind === "main" && c.resourceId != null);
const voiceDb: number = ${voiceDb};
for (const id of (await mains()).map((c: any) => c.clipId)) {
  // The voice at its measured level (the music is set under it). This replaces any volume set on the podcast Draft's
  // clips: the measurement reads the recording itself.
  const c0: any = (await mains()).find((c: any) => c.clipId === id);
  if (c0) await d.setClipAudio({ clip: c0, volumeDb: voiceDb });
  const clip: any = (await mains()).find((c: any) => c.clipId === id);
  if (!clip) continue;
  const shot = shots.find((s) => clip.startFrame >= s.from && clip.startFrame < s.to);
  // The crop was planned on one file's picture; a clip from another camera file gets the plain card cover.
  if (shot && shot.crop && (!shot.rid || shot.rid === clip.resourceId)) { await d.setClipTransform({ clip, scale: { x: shot.crop.scale, y: shot.crop.scale }, position: { x: shot.crop.posX, y: shot.crop.posY } }); continue; }
  if (!sizes[clip.resourceId]) {
    // meta() needs an analyzed Resource; a still or unanalyzed insert on Main falls back to 1920x1080.
    try { const m: any = await p.resource(clip.resourceId).meta(); sizes[clip.resourceId] = [m?.frameSize?.width || 1920, m?.frameSize?.height || 1080]; }
    catch { sizes[clip.resourceId] = [1920, 1080]; }
  }
  const [sw, sh] = sizes[clip.resourceId];
  const c = Math.min(1080 / sw, 1920 / sh);
  const s = Math.max(${CARD.w} / (sw * c), ${CARD.h} / (sh * c));
  await d.setClipTransform({ clip, scale: { x: s, y: s }, position: { x: 0, y: 0 } });
}
const frames = (await d.meta()).durationFrames;
if (Math.abs(frames - ${plan.end}) > 2) throw new Error("The reel came out " + frames + " frames long instead of " + ${plan.end} + ".");
const saved = await d.commitAll("Quote Lockup Reel: new reel");
if (!saved.createdDraftId) throw new Error("The reel Draft was not created.");
return { id: saved.createdDraftId, name };`,
    true
  );
}
async function finishReel(sdk, projectId, reelId, plan, broll, musicId, captions, levels) {
  const music = musicId ? musicClips(plan).map((m) => ({ ...m, volumeDb: levels.musicDb[m.part] })) : [];
  return script(
    sdk,
    "Add B-roll, frame, captions and music",
    `const p = selects.project(${J(projectId)});
const d = selects.draft(${J(reelId)});
const MATTE = ${J(matteCode)};
const LOCKUPS = ${J(lockupsCode)};
const all = async () => await d.clips({ trackScope: "all" });
let placed = 0; const skipped: number[] = [];
for (const b of ${J(broll.map((b) => ({ ...b, scale: b.crop?.scale ?? coverScale(b.sw, b.sh), posX: b.crop?.posX ?? 0, posY: b.crop?.posY ?? 0 })))}) {
  try { await d.overlayResource({ resource: p.resource(b.id), over: await d.rangeAtFrames(b.from, b.to), sourceStartSeconds: b.offset }); }
  catch { skipped.push(b.from); continue; }
  const rows = await all();
  const video: any = rows.find((c: any) => c.trackKind === "video" && c.resourceId === b.id && c.startFrame === b.from);
  const audio = rows.filter((c: any) => c.trackKind === "audio" && c.resourceId === b.id && c.startFrame === b.from);
  if (audio.length) await d.removeClips(audio);
  if (video) { const v: any = (await all()).find((c: any) => c.clipId === video.clipId); if (v) await d.setClipTransform({ clip: v, scale: { x: b.scale, y: b.scale }, position: { x: b.posX, y: b.posY } }); }
  placed += 1;
}
const whole = await d.rangeAtFrames(0, ${plan.end});
await d.addMotionGraphic({ label: ${J(LABELS.matte)}, tsxCode: MATTE, parameters: ${J({ card: CARD, blacks: blackRanges(plan) })}, editableParameters: [], within: whole });
await d.addMotionGraphic({ label: ${J(LABELS.lockups)}, tsxCode: LOCKUPS, parameters: ${J(captions)}, editableParameters: [], within: await d.rangeAtFrames(0, ${plan.end}) });
let beds = 0;
for (const m of ${J(music)}) {
  if (m.to - m.from < 2) continue;
  const r: any = await d.overlayResource({ resource: p.resource(${J(musicId)}), over: await d.rangeAtFrames(m.from, m.to), sourceStartSeconds: m.sourceStart });
  const clip: any = (await all()).find((c: any) => c.trackKind === "audio" && c.resourceId === ${J(musicId)} && c.startFrame === (r?.atFrame ?? m.from));
  // The piano bed has no fades: it stops on the cut into the key line and comes back as the line ends.
  if (clip) await d.setClipAudio({ clip, volumeDb: m.volumeDb });
  beds += 1;
}
const saved = await d.commitAll("Quote Lockup Reel: B-roll, frame, captions and music");
return { placed, skipped, beds, commitId: (saved as any).commitId ?? null };`,
    true
  );
}
async function openDraft(sdk, id) {
  return script(sdk, "Open the reel", "return await selects.editor.openDraft(" + J(id) + ");");
}
async function canAuthor(sdk) {
  try {
    return !!await sdk.call("canAuthorGeneratedMedia");
  } catch {
    return true;
  }
}

// src/loudness.ts
var LEVELS = { voice: -16, peak: -3, gap: 6, maxLift: 12, maxCut: 10, music: { before: -18, after: -16.8 } };
var RATE = 48e3;
var clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
var round1 = (v) => Math.round(v * 10) / 10;
function mixLevels(v) {
  if (!v || !Number.isFinite(v.lufs) || v.lufs <= -60) return { voiceDb: 0, musicDb: { before: MUSIC.volumeDb, after: MUSIC.volumeDb } };
  const voiceDb = clamp(Math.min(LEVELS.voice - v.lufs, LEVELS.peak - v.peak), -LEVELS.maxCut, LEVELS.maxLift);
  const music = v.lufs + voiceDb - LEVELS.gap;
  return { voiceDb: round1(voiceDb), musicDb: { before: round1(clamp(music - LEVELS.music.before, -40, 6)), after: round1(clamp(music - LEVELS.music.after, -40, 6)) } };
}
function voiceSpans(src, plan) {
  const out = [];
  for (const s of plan.shots) {
    const a = plan.srcFrom + s.src, b = a + (s.to - s.from);
    for (const c of src.clips) {
      const x = Math.max(a, c.s), y = Math.min(b, c.e);
      if (y <= x || !c.path || c.off == null) continue;
      const t0 = c.speed * x / plan.fps + c.off, t1 = c.speed * y / plan.fps + c.off;
      if (t1 - t0 > 0.05) out.push({ path: c.path, start: Math.max(0, t0), seconds: t1 - t0 });
    }
  }
  return out;
}
function loudness(parts, rate = RATE) {
  const [b0, b1, b2, a1, a2] = [1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585];
  const [c1, c2] = [-1.99004745483398, 0.99007225036621];
  const st = [0, 1].map(() => ({ x1: 0, x2: 0, y1: 0, y2: 0, u1: 0, u2: 0, w1: 0, w2: 0 }));
  const step = Math.round(rate * 0.1);
  const sums = [];
  let acc = 0, n = 0, peak = 0;
  for (const p of parts) {
    for (let i = 0; i + 1 < p.length; i += 2) {
      for (let ch2 = 0; ch2 < 2; ch2 += 1) {
        const x = p[i + ch2], s = st[ch2];
        if (Math.abs(x) > peak) peak = Math.abs(x);
        const y = b0 * x + b1 * s.x1 + b2 * s.x2 - a1 * s.y1 - a2 * s.y2;
        s.x2 = s.x1;
        s.x1 = x;
        s.y2 = s.y1;
        s.y1 = y;
        const w = y - 2 * s.u1 + s.u2 - c1 * s.w1 - c2 * s.w2;
        s.u2 = s.u1;
        s.u1 = y;
        s.w2 = s.w1;
        s.w1 = w;
        acc += w * w;
      }
      n += 1;
      if (n === step) {
        sums.push(acc / step);
        acc = 0;
        n = 0;
      }
    }
  }
  const peakDb = peak > 0 ? 20 * Math.log10(peak) : -120;
  const blocks = [];
  for (let k = 0; k + 3 < sums.length; k += 1) blocks.push((sums[k] + sums[k + 1] + sums[k + 2] + sums[k + 3]) / 4);
  const lufs = (z) => -0.691 + 10 * Math.log10(z);
  const mean = (zs) => zs.reduce((x, y) => x + y, 0) / zs.length;
  const loud = blocks.filter((z) => z > 0 && lufs(z) > -70);
  if (!loud.length) return { lufs: -70, peak: peakDb };
  const gate = lufs(mean(loud)) - 10;
  const kept = loud.filter((z) => lufs(z) > gate);
  return { lufs: lufs(mean(kept)), peak: peakDb };
}
async function voiceLoudness(sdk, src, plan, runKey) {
  const spans = voiceSpans(src, plan);
  if (!spans.length) return null;
  const dir = dataDir("voice", runKey);
  try {
    const outs = spans.map((_, i) => join(dir, "v" + i + ".f32"));
    await ffmpegRuns(sdk, "Measure the voice level", spans.map((s, i) => [
      "-ss",
      s.start.toFixed(3),
      "-i",
      s.path,
      "-t",
      s.seconds.toFixed(3),
      "-vn",
      "-ac",
      "2",
      "-ar",
      RATE,
      "-f",
      "f32le",
      outs[i]
    ]));
    const parts = [];
    for (const o of outs) {
      if (!exists(o)) continue;
      const buf = await readBytes(o);
      parts.push(new Float32Array(buf, 0, Math.floor(buf.byteLength / 4)));
    }
    return parts.length ? loudness(parts) : null;
  } finally {
    try {
      fs().rmSync(dir, { recursive: true, force: true });
    } catch {
    }
  }
}

// src/make.ts
var STEPS = [
  ["read", "Read the podcast Draft"],
  ["story", "Pick the quote and plan the shots (AI, about 2-3 min)"],
  ["broll", "Find stock B-roll"],
  ["faces", "Find faces and frame the shots"],
  ["masks", "Speaker masks for words behind the head (VEED, about 1-2 min, credits)"],
  ["captions", "Lay out the captions"],
  ["draft", "Build the reel Draft"]
];
async function sourceOf(sequenceId) {
  const p = join(fs().homedir(), ".selects", "plugin-data", "quote-lockup-reel", "reels", sequenceId, "job.json");
  if (!exists(p)) return sequenceId;
  try {
    return JSON.parse(await readText(p)).sourceId || sequenceId;
  } catch {
    return sequenceId;
  }
}
async function makeReel(sdk, open, onStep) {
  const t0 = Date.now();
  const ctx = { projectId: open.projectId, sequenceId: await sourceOf(open.sequenceId) };
  const notes = [];
  if (!await canAuthor(sdk)) throw new Error("This Selects account cannot add motion graphics yet, which the reel needs.");
  onStep("read", "run");
  const src = await readSource(sdk, ctx.projectId, ctx.sequenceId);
  onStep("read", "done", src.words.length + " words");
  onStep("story", "run");
  const story = await planStory(sdk, src.words, src.fps, (n) => onStep("story", "run", "AI busy, retry " + n));
  if (story.source === "rules") notes.push(story.why);
  if (story.issues?.length) notes.push("AI plan issues: " + story.issues.join("; "));
  const plan = makePlan(src, story);
  onStep("story", "done", (plan.end / plan.fps).toFixed(1) + " s, " + plan.shots.length + " shots");
  onStep("masks", "run");
  const mattesP = speakerMattes(sdk, ctx.projectId, src, plan, notes, (m) => onStep("masks", "run", m)).then(
    (m) => (onStep("masks", m ? "done" : "skip", m ? m.count + " frames" : "not available"), m),
    (e) => (notes.push("Speaker masks: " + String(e?.message || e)), onStep("masks", "fail", "words stay in front"), null)
  );
  onStep("broll", "run");
  const broll = await findBroll(plan, notes);
  onStep("broll", broll.length || plan.shots.some((s) => s.role === "broll") ? "done" : "skip", broll.length + " clip(s)");
  for (const s of plan.shots) if (s.role === "broll" && !broll.some((b) => b.shot === s.k)) s.role = "speaker";
  onStep("faces", "run");
  let shotPlans;
  const palettes = {};
  const angleOf = /* @__PURE__ */ new Map();
  try {
    shotPlans = await planShots(sdk, src, plan, broll, palettes, angleOf);
    const fams = shotPlans.filter(Boolean).map((p) => p.family);
    onStep("faces", "done", fams.filter((f) => f !== "free").length + " face shot(s): " + [...new Set(fams)].join(", "));
  } catch (e) {
    notes.push("Face detection failed; captions use the default position: " + String(e?.message || e));
    onStep("faces", "fail", "default positions");
    shotPlans = plan.shots.map((s, i) => {
      if (s.role !== "speaker" && s.role !== "broll") return null;
      const g = geometry(src, plan, broll, i);
      return planShot(g.sw, g.sh, null, s.words.length);
    });
  }
  onStep("captions", "run");
  const { jobs, owners } = captionJobs(plan, shotPlans);
  const layouts = await layoutJobs(jobs, (d, n) => onStep("captions", "run", d + "/" + n));
  const accentsOf = (i) => {
    const g = angleOf.get(i);
    if (g == null) return shotAccents(palettes["s" + plan.shots[i].k]);
    const members = [...angleOf.entries()].filter(([, x]) => x === g).map(([j]) => palettes["s" + plan.shots[j].k]);
    return shotAccents(poolPalettes(members)) ?? [HOUSE[g % HOUSE.length]];
  };
  const mattes = await mattesP;
  let tucked = 0, stacked = 0;
  const captions = [];
  for (const [i, s] of plan.shots.entries()) {
    const mine = owners.map((o, j) => o.shot === i ? j : -1).filter((j) => j >= 0);
    const parts = mine.map((j) => layouts[j]);
    const firstWord = mine.map((j) => owners[j].firstWord);
    const sp = shotPlans[i];
    const boxes = parts.map((l) => ({ box: l.box, heroCap: l.meta?.heroCap || 100 }));
    let tfs = sp ? placeParts(sp, boxes) : parts.map(() => null);
    let behind;
    if (mattes && sp && s.role === "speaker" && (sp.family === "column" || sp.family === "flow")) {
      const frames = (await Promise.all(BEHIND.frames.map((q) => readMatte(mattes, sourceAt(s, Math.round(s.from + (s.to - s.from) * q)))))).filter(Boolean);
      let found = false;
      for (const tuck of BEHIND.tucks) {
        const t = placeParts(sp, boxes, tuck);
        const r = behindGlyphs(sp, parts, t, firstWord, frames);
        if (r.minVisible >= BEHIND.minVisible) {
          tfs = t;
          behind = r.behind;
          found = true;
          break;
        }
      }
      const room = personRoom(sp, frames);
      const cap = tfs[0] ? tfs[0][0] * boxes[0].heroCap : 0;
      if (room != null && room < RULES.roomStack * CARD.w || cap < RULES.besideMinCap * CARD.h || !found) {
        tfs = placeStacked(sp, boxes);
        behind = [];
        stacked += 1;
      } else if (behind?.length) tucked += 1;
    } else if (sp && s.role === "speaker" && sp.family === "flow" && sp.face) {
      const cap = tfs[0] ? tfs[0][0] * boxes[0].heroCap : 0;
      if (cap < RULES.besideMinCap * CARD.h) {
        tfs = placeStacked(sp, boxes);
        stacked += 1;
      }
    }
    captions.push({ parts, tfs, firstWord, shadow: !!sp, behind, pic: sp?.pic, accents: sp ? accentsOf(i) : null });
  }
  const fallbacks = layouts.filter((x) => x.meta?.engineError).length;
  onStep("captions", "done", jobs.length + " part(s)" + (tucked ? ", " + tucked + " behind the head" : "") + (stacked ? ", " + stacked + " under the chin" : "") + (fallbacks ? ", " + fallbacks + " used the simple layout" : ""));
  onStep("draft", "run", "importing");
  const musicPath = await musicCopy();
  const ids = await importFiles(sdk, ctx.projectId, [musicPath, ...broll.map((b) => b.stock.path)]);
  const musicId = ids[0];
  if (!musicId) notes.push("The music could not be imported.");
  const places = broll.map((b, i) => ({ b, id: ids[i + 1] })).filter((x) => x.id).map(({ b, id }) => {
    const s = plan.shots[b.shot];
    return { id, from: s.from, to: s.to, sw: b.stock.w, sh: b.stock.h, offset: brollOffset(b.stock, plan, b.shot), crop: shotPlans[b.shot]?.crop ?? null };
  });
  onStep("draft", "run", "measuring the voice");
  let voice = null;
  try {
    voice = await voiceLoudness(sdk, src, plan, String(Date.now()));
  } catch (e) {
    notes.push("Voice level: " + String(e?.message || e));
  }
  if (!voice) notes.push("The voice level could not be measured; the music keeps its default level.");
  const levels = mixLevels(voice);
  onStep("draft", "run", "creating");
  const crops = plan.shots.map((sh, i) => ({ from: sh.from, to: sh.to, crop: sh.role === "speaker" ? shotPlans[i]?.crop ?? null : null, rid: sh.role === "speaker" ? geometry(src, plan, broll, i).rid ?? null : null }));
  const reel = await createReel(sdk, ctx.projectId, ctx.sequenceId, src.name + " \xB7 Quote Reel", plan, crops, levels.voiceDb);
  const dir = dataDir("reels", reel.id);
  const job = { version: 2, projectId: ctx.projectId, sourceId: ctx.sequenceId, reelId: reel.id, name: reel.name, story, plan, broll, musicId, ids, shotPlans, voice, levels };
  await writeText(join(dir, "job.json"), J(job));
  onStep("draft", "run", "captions, B-roll and music");
  const data = graphicData(plan, captions, reel.id.slice(0, 8), mattes ? { base: mattes.base, count: mattes.count } : null);
  const fin = await finishReel(sdk, ctx.projectId, reel.id, plan, places, musicId, data, levels);
  if (fin?.skipped?.length) notes.push(fin.skipped.length + " B-roll clip(s) could not be placed.");
  await writeText(join(dir, "captions.json"), J(captions.map((c, i) => ({ shot: i, tfs: c.tfs, firstWord: c.firstWord, parts: c.parts.map((l) => ({ id: l.id, box: l.box, meta: l.meta })) }))));
  onStep("draft", "done");
  try {
    await openDraft(sdk, reel.id);
  } catch {
  }
  return {
    reelId: reel.id,
    name: reel.name,
    seconds: (Date.now() - t0) / 1e3,
    notes,
    credits: broll.map((b) => ({ credit: b.stock.credit, url: b.stock.url, service: b.stock.service }))
  };
}
async function musicCopy() {
  const dst = join(dataDir("music"), "momentum.m4a");
  if (!exists(dst)) await fs().writeFile(dst, new Uint8Array(await readBytes(join(skillsDir(), "music", "momentum.m4a"))));
  return dst;
}
async function findBroll(plan, notes) {
  const want = plan.shots.filter((s) => s.role === "broll");
  if (!want.length) return [];
  if (!stockAvailable()) {
    notes.push("No B-roll: this Selects version has no stock footage search.");
    return [];
  }
  const used = /* @__PURE__ */ new Set(), got = [];
  for (const s of want) {
    const stock = await findStock(s.query || s.text, (s.to - s.from) / plan.fps + 0.6, used);
    if (stock) got.push({ shot: s.k, stock });
    else notes.push('No stock clip for "' + (s.query || s.text) + '"; the speaker stays on screen.');
  }
  return got;
}
var brollOffset = (stock, plan, k) => Math.min(0.5, Math.max(0, stock.duration - (plan.shots[k].to - plan.shots[k].from) / plan.fps - 0.2));
function geometry(src, plan, broll, i) {
  const s = plan.shots[i];
  const at = [0.2, 0.5, 0.8].map((q) => s.from + (s.to - s.from) * q);
  const key = "s" + s.k;
  if (s.role === "broll") {
    const b = broll.find((x) => x.shot === s.k);
    if (!b) return { sw: 1920, sh: 1080, ask: null };
    const off = brollOffset(b.stock, plan, s.k);
    return { sw: b.stock.w, sh: b.stock.h, ask: { key, path: b.stock.path, portrait: b.stock.h > b.stock.w, seconds: at.map((f) => off + (f - s.from) / plan.fps) } };
  }
  const onSource = (f) => plan.srcFrom + sourceAt(s, f);
  const clip = src.clips.find((c) => c.s <= onSource(at[1]) && onSource(at[1]) < c.e);
  if (!clip) return { sw: 1920, sh: 1080, ask: null };
  const ask2 = clip.path && clip.off != null ? { key, path: clip.path, portrait: clip.sh > clip.sw, seconds: at.map((f) => clip.speed * onSource(f) / plan.fps + clip.off) } : null;
  return { sw: clip.sw || 1920, sh: clip.sh || 1080, ask: ask2, rid: clip.rid };
}
async function planShots(sdk, src, plan, broll, palettes, angleOf) {
  const geo = plan.shots.map((s, i) => s.role === "speaker" || s.role === "broll" ? geometry(src, plan, broll, i) : null);
  const asks = geo.map((g) => g?.ask).filter(Boolean);
  const faces = asks.length ? await facesFor(sdk, String(Date.now()), asks, palettes) : {};
  const angles = speakerAngles(plan, geo, faces);
  for (const [i, a] of angles) angleOf.set(i, a.group);
  return plan.shots.map((s, i) => {
    const g = geo[i];
    if (!g) return null;
    const a = angles.get(i);
    return planShot(g.sw, g.sh, faces["s" + s.k] ?? null, s.words.length, a);
  });
}
function speakerAngles(plan, geo, faces) {
  const groups = [];
  plan.shots.forEach((s, i) => {
    const g = geo[i], f = faces["s" + s.k];
    if (s.role !== "speaker" || !g || !f) return;
    const cx = f.x + f.w / 2;
    const hit = groups.find((x) => x.rid === g.rid && Math.abs(x.first.x + x.first.w / 2 - cx) < 0.1 && Math.abs(x.first.h - f.h) / x.first.h < 0.3);
    if (hit) hit.members.push(i);
    else groups.push({ rid: g.rid || "", first: f, members: [i] });
  });
  const med = (xs) => xs.slice().sort((p, q) => p - q)[Math.floor(xs.length / 2)];
  const out = /* @__PURE__ */ new Map();
  for (const [gi, grp] of groups.entries()) {
    const fs2 = grp.members.map((i) => faces["s" + plan.shots[i].k]);
    const face = {
      x: med(fs2.map((f) => f.x)),
      y: med(fs2.map((f) => f.y)),
      w: med(fs2.map((f) => f.w)),
      h: med(fs2.map((f) => f.h)),
      eyeY: med(fs2.map((f) => f.eyeY)),
      yaw: med(fs2.map((f) => f.yaw)),
      score: med(fs2.map((f) => f.score)),
      count: Math.max(...fs2.map((f) => f.count))
    };
    const g = geo[grp.members[0]];
    const side = angleSide(g.sw, g.sh, face);
    for (const i of grp.members) out.set(i, { face, side, group: gi });
  }
  plan.shots.forEach((s, i) => {
    const g = geo[i];
    if (s.role !== "speaker" || !g || faces["s" + s.k] || out.has(i)) return;
    const same = groups.filter((x) => x.rid === g.rid);
    if (same.length === 1) out.set(i, out.get(same[0].members[0]));
  });
  return out;
}
function captionJobs(plan, shotPlans) {
  const jobs = [], owners = [];
  plan.shots.forEach((s, i) => {
    const words = s.words.map((w) => w.t);
    const sp = shotPlans[i];
    const add = (from, to, kind, opts) => {
      jobs.push({ id: "shot" + s.k + "-" + from, text: words.slice(from, to).join(" "), kind, opts });
      owners.push({ shot: i, firstWord: from });
    };
    if (s.role === "outro") add(0, words.length, "line");
    else if (sp && (sp.family === "under" || sp.family === "above") && words.length >= 7) add(0, words.length, "lockup", { aspectBias: -0.6 });
    else if (!sp || sp.family === "free" || sp.family === "under" || sp.family === "above") add(0, words.length, "lockup");
    else if (sp.family === "column") add(0, words.length, "lockup", words.length > 4 ? { aspectBias: 0.6 } : void 0);
    else {
      add(0, sp.split, "lockup", sp.split > 4 ? { aspectBias: 0.6 } : void 0);
      add(sp.split, words.length, "lockup");
    }
  });
  return { jobs, owners };
}

// src/Panel.tsx
var fresh = () => STEPS.map(([id, label]) => ({ id, label, state: "wait" }));
var current = {
  busy: false,
  steps: fresh(),
  result: null,
  error: "",
  started: 0
};
var listeners = /* @__PURE__ */ new Set();
var update = (patch) => {
  current = { ...current, ...patch };
  listeners.forEach((l) => l());
};
function QuoteLockupReel({ sdk, context }) {
  const [, force] = useState(0);
  const [clock, setClock] = useState(0);
  const alive = useRef(true);
  useEffect(() => {
    const l = () => alive.current && force((x) => x + 1);
    listeners.add(l);
    return () => {
      alive.current = false;
      listeners.delete(l);
    };
  }, []);
  useEffect(() => {
    if (!current.busy) return;
    const id = setInterval(() => alive.current && setClock(Math.round((Date.now() - current.started) / 1e3)), 1e3);
    return () => clearInterval(id);
  }, [current.busy]);
  const onStep = (id, state, note) => update({ steps: current.steps.map((s) => s.id === id ? { ...s, state, note: note ?? (state === "run" ? s.note : note) } : s) });
  const make = async () => {
    if (current.busy) return;
    if (!context?.sequenceId || !context?.projectId) {
      update({ error: "Open the podcast Draft first." });
      return;
    }
    update({ busy: true, steps: fresh(), result: null, error: "", started: Date.now() });
    try {
      const r = await makeReel(sdk, { projectId: context.projectId, sequenceId: context.sequenceId }, onStep);
      update({ result: r });
    } catch (e) {
      update({ error: String(e?.message || e), steps: current.steps.map((s) => s.state === "run" ? { ...s, state: "fail" } : s) });
    } finally {
      update({ busy: false });
    }
  };
  const open = async () => {
    if (!current.result) return;
    await sdk.runScript({ summary: "Open the reel", script: "return await selects.editor.openDraft(" + JSON.stringify(current.result.reelId) + ");" });
  };
  const icon = (s) => s === "done" ? "\u2713" : s === "run" ? "\u2026" : s === "fail" ? "!" : s === "skip" ? "\u2013" : "\xB7";
  const { busy, steps, result, error } = current;
  return /* @__PURE__ */ React.createElement("div", { style: { padding: 16, display: "flex", flexDirection: "column", gap: 14, fontSize: 13, lineHeight: 1.45 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 15, fontWeight: 600 } }, "Quote reel, one click"), /* @__PURE__ */ React.createElement("div", { style: { color: "var(--panel-muted-fg)" } }, "Turns this podcast Draft into a new 9:16 reel: the best 15-22 s quote cut by clause, the picture in a rounded card on black, packed lockup captions that appear as each word is spoken, the key line on black, stock B-roll and a piano bed.")), /* @__PURE__ */ React.createElement("button", { onClick: make, disabled: busy, style: { padding: "10px 12px", fontWeight: 600, cursor: busy ? "default" : "pointer" } }, busy ? "Making the reel\u2026 " + clock + " s" : result ? "Make another reel" : "Make reel"), (busy || steps.some((s) => s.state !== "wait")) && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } }, steps.map((s) => /* @__PURE__ */ React.createElement("div", { key: s.id, style: { display: "flex", gap: 8, opacity: s.state === "wait" ? 0.5 : 1 } }, /* @__PURE__ */ React.createElement("span", { style: { width: 14, textAlign: "center" } }, icon(s.state)), /* @__PURE__ */ React.createElement("span", { style: { flex: 1 } }, s.label, s.note ? /* @__PURE__ */ React.createElement("span", { style: { color: "var(--panel-muted-fg)" } }, " \u2014 ", s.note) : null)))), error && /* @__PURE__ */ React.createElement("div", { style: { color: "var(--panel-destructive-fg, #e5484d)", whiteSpace: "pre-wrap" } }, error), result && !busy && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } }, /* @__PURE__ */ React.createElement("div", null, "Made \u201C", result.name, "\u201D in ", Math.round(result.seconds), " s."), result.credits.length ? /* @__PURE__ */ React.createElement("div", { style: { color: "var(--panel-muted-fg)" } }, "B-roll:", " ", result.credits.map((c, i) => /* @__PURE__ */ React.createElement(React.Fragment, { key: i }, i ? ", " : "", /* @__PURE__ */ React.createElement("a", { href: c.url, target: "_blank", rel: "noreferrer" }, c.credit), c.service ? " (" + c.service + ")" : ""))) : null, result.notes.length ? /* @__PURE__ */ React.createElement("ul", { style: { margin: 0, paddingLeft: 18, color: "var(--panel-muted-fg)" } }, result.notes.map((n, i) => /* @__PURE__ */ React.createElement("li", { key: i }, n))) : null, /* @__PURE__ */ React.createElement("button", { onClick: open, style: { padding: "8px 12px" } }, "Open the reel")));
}
export {
  QuoteLockupReel as default
};
