// @name a16z Style Captions
// @name:de a16z-Stil-Untertitel
// @name:en a16z Style Captions
// @name:es Subtítulos estilo a16z
// @name:fr Sous-titres style a16z
// @name:it Sottotitoli stile a16z
// @name:ja a16zスタイル字幕
// @name:ko a16z Style Captions
// @name:pt Legendas estilo a16z
// @name:tr a16z Tarzı Altyazılar
// @name:zh a16z 风格字幕
// @icon captions
// One click turns a talking-head Draft into a 9:16 Short in the a16z house style: tightened pauses, speaker framing, editorial captions with lockups and emphasis, keyword cards, a name tag and a music bed.

// plugins/a16z-style-captions/src/Panel.tsx
import React, { useEffect, useRef, useState } from "react";

// plugins/a16z-style-captions/src/pipeline/host.ts
var PANEL_ID = "a16z-style-captions";
function app() {
  const parent = window.parent;
  if (!parent?.__DI__) throw new Error("This Selects version does not expose native panel services.");
  return parent;
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
  return di().FileSystem;
}
function dataRoot() {
  const f = fs();
  return f.join(f.homedir(), ".selects", "plugin-data", PANEL_ID);
}
function envRoot() {
  const f = fs();
  return f.join(f.homedir(), ".selects", "python-envs", PANEL_ID);
}
function hostVersion() {
  try {
    return String(di().Runtime?.getHostingVersion?.() || "");
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
var q = (v) => "'" + String(v).replace(/'/g, "'\\''") + "'";
var J = (v) => JSON.stringify(v);
var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
var LIST_FILES = `const listFiles = async (p: any): Promise<any[]> => {
  const files: any[] = [];
  const walk = (nodes: any[]) => { for (const n of nodes || []) { if (n.type === "dir") walk(n.children); else files.push(n); } };
  const top: any = await p.sourceFiles();
  if (Array.isArray(top)) walk(top);
  else if ("fileTree" in top) walk(top.fileTree);
  else for (const f of top.folders || []) { const one: any = await p.sourceFiles({ folder: String(f.name) }); walk(one.fileTree); }
  return files;
};`;
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
async function shell(sdk, summary, command, timeoutMs = 12e4, maxOutputBytes = 16e3) {
  const r = await sdk.runShell({ summary, command, timeoutMs, maxOutputBytes });
  const code = r?.exitCode ?? (r?.isError ? 1 : 0);
  if (r?.isError || code !== 0) {
    const text = String(r?.stderr || r?.output || r?.stdout || "").trim();
    throw new Error(summary + " failed" + (text ? ": " + text.slice(-700) : "."));
  }
  return String(r?.stdout ?? r?.output ?? "");
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

// plugins/a16z-style-captions/src/pipeline/source.ts
var READ = (id, pid) => `const p = selects.project(${J(pid)});
const d = selects.draft(${J(id)});
const m = await d.meta();
const ws = (await d.words()).filter((w: any) => !w.nonSpeech && !w.cut && w.endFrame > w.startFrame);
const main = (await d.clips({ trackScope: "main" })).filter((c: any) => c.trackKind === "main" && c.resourceId != null);
${LIST_FILES}
const files = await listFiles(p);
const clips = main.map((c: any) => {
  const f = files.find((x: any) => x.resourceId === c.resourceId);
  const offs = ws.filter((w: any) => w.startFrame >= c.startFrame && w.endFrame <= c.endFrame && w.sourceStartFrame != null).map((w: any) => w.sourceStartFrame - w.startFrame).sort((a: number, b: number) => a - b);
  const off = offs.length ? offs[Math.floor(offs.length / 2)] : null;
  return { clipId: c.clipId, rid: c.resourceId, s: c.startFrame, e: c.endFrame, path: f ? f.path : null,
    sw: f?.frameSize?.width || 0, sh: f?.frameSize?.height || 0, srcStart: off == null ? -1 : (c.startFrame + off) / m.fps };
});
return { name: m.name, fps: m.fps, width: m.frameSize.width, height: m.frameSize.height,
  endFrame: main.reduce((a: number, c: any) => Math.max(a, c.endFrame), 0),
  words: ws.map((w: any, i: number) => ({ i, t: w.text, s: w.startFrame, e: w.endFrame, ss: w.sourceStartFrame ?? null, rid: w.sourceResourceId ?? null })),
  clips };`;
async function readDraft(sdk, pid, id, label = "Read the Draft") {
  return script(sdk, label, READ(id, pid));
}

// plugins/a16z-style-captions/src/captions/lexicon.ts
var set = (s) => new Set(s.split(/\s+/).filter(Boolean));
var DET = set("a an the this these those my your our their his her its some any every each no");
var PREP = set("of in on at for with to from by about into over through during like than as");
var CONJ = set("and or but so because cause if when while where which who whose whom that then");
var PRON = set(
  "i you we they he she it me us them i'm you're we're they're it's he's she's i've you've we've they've i'd you'd we'd i'll you'll there's that's what's"
);
var AUX = set(
  "is are was were be been am do does did don't doesn't didn't have has had will would can could should might must gonna wanna can't won't isn't wasn't weren't"
);
var INTERJ = set("hey okay ok oh wow no look listen yes");
var PHRASAL_VERB = set(
  "look looking looked looks think thinking thought thinks talk talking talked talks know knew worry worried care deal focus depend rely hear heard listen point figure come came go went get got"
);
var PARTICLE = set("at about into through out up on for with");
var NUM_WORDS = set("one two three four five six seven eight nine ten eleven twelve twenty thirty forty fifty hundred thousand million billion");
var FILLER = /^(uh+|um+|uhm+|erm+|er|ah+|hmm+|mm+|mhm)$/;
var OPENER = set("hey okay ok oh wow no look listen yes");
var COMMA_BREAKERS = set("well like now yeah");
var IMPERATIVE = set(
  "be do don't make keep stop start think try build go get find look focus remember imagine forget never always ask take give let stay work write learn read"
);
var INTENSIFIER = set("much very really extremely incredibly so super totally completely absolutely way far most least");
function norm(w) {
  return String(w || "").toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9'\-%]/g, "");
}
function wordClass(w) {
  const n = norm(w);
  if (DET.has(n)) return "DET";
  if (PREP.has(n)) return "PREP";
  if (CONJ.has(n)) return "CONJ";
  if (PRON.has(n)) return "PRON";
  if (AUX.has(n)) return "AUX";
  return "CONT";
}
function isNumberWord(w) {
  const n = norm(w);
  return /^\d/.test(n) || NUM_WORDS.has(n);
}
var PAIR = {
  "CONT>CONJ": 1,
  "DET>CONJ": 0.5,
  "CONT>AUX": -0.4,
  "PREP>CONJ": -0.5,
  "CONT>PREP": -0.6,
  "CONT>DET": -0.7,
  "AUX>CONT": -0.8,
  "CONJ>DET": -0.8,
  "CONT>CONT": -1,
  "PREP>CONT": -1,
  "CONT>PRON": -1.4,
  "PRON>CONT": -1.7,
  "CONJ>CONT": -2,
  "DET>CONT": -2.2,
  "PRON>AUX": -2.5,
  "PREP>DET": -2.9,
  "CONJ>PRON": -3.2
};
function pairScore(a, b) {
  const v = PAIR[a + ">" + b];
  return v == null ? -1.2 : v;
}

// plugins/a16z-style-captions/src/pipeline/semantic.ts
var norm2 = (s) => String(s || "").toLowerCase().replace(/[’]/g, "'").replace(/[^\p{L}\p{N}']+/gu, "");
var toks = (s) => String(s || "").split(/\s+/).map(norm2).filter(Boolean);
function sentences(words2) {
  const out = [];
  let from = 0;
  for (let k = 0; k < words2.length; k += 1) {
    const w = words2[k];
    const next = words2[k + 1];
    if (/[.!?]["”’)]*$/.test(w.t) || !next || next.s - w.e > 0.9 || k - from >= 40) {
      out.push({ from, to: k });
      from = k + 1;
    }
  }
  return out;
}
var GUIDE = `You are the story editor of an a16z-style talking-head Short (white blur-in captions, mixed-size caption lockups, a few burgundy keyword cards). Mark the transcript so the captions can be designed. Tag MEANING, not loudness. Be selective: roughly one key term per 5 seconds of speech.

Fields (every quote is copied exactly from the numbered sentence "s"; keep quotes 1-4 words unless stated):
- format: "standard" (a thesis or advice), "story" (a first-person anecdote) or "explainer".
- hook: {"type": "H1" if sentence 1 is short (<= 8 words) and states the thesis, "H6" if its thesis is 1-2 words, "H2" if it is a long claim, "H4" for a narrative opener; "big": the 1-3 content words of sentence 1 that should be set big (a noun, verb, adjective or number; never "sometimes", "so", "basically", "let's say" or a pronoun)}.
- key: emphasis targets, each {"s", "q", "kind", "p"}: kind T = the topic/thesis term (first mention), P = the payoff that answers a setup, C = a contrast or negation word, N = a number that pays off a scale claim, I = intensifier + head ("much less", "10x better"), D = an imperative ("keep doing stuff"), Q = a quoted punch line. p = priority 1-5 (5 = the most important idea of the Short).
- punch: the punchline sentences, each {"s", "q": its last 2-4 words}.
- compounds: multiword names and fixed collocations that must never be split across two captions ("social media", "venture capital", "Elon Musk").
- reveal: "the thing you want ... is | power" constructions: {"s", "setup": 1-4 words, "copula": "is", "payoff": 1-2 words}.
- quotes: quoted or imagined speech and coined terms: {"s", "q": the quoted words (up to 12), "kind": "reported" | "imagined" | "famous" | "coined"}.
- drops: words a careful editor would leave out of the captions: abandoned words before a self-interruption, stutters, a filler "like" that interrupts a phrase. {"s", "q"}.
- cards: 0-2 keyword cards. A card is a full-screen burgundy title shown for about 1.5 s while the speaker keeps talking: use it for a named concept introduced as the payoff of a setup ("the inventor", "taste"), or the single most important idea. {"s", "q": the 1-6 spoken words the card covers, "text": 1-3 of those exact spoken words, the concept itself; never a paraphrase}. Not in the first 3 seconds, not in the last 30% of the Short, at least 6 s apart.
- broll: moments where real footage would carry the line because the words literally name a concrete object, place, action or era you could film without actors (a factory floor, a cup of coffee, a server room, 1990s computers, a city at night). Never for people, feelings, relationships, ideas, metaphors, research, science or data - those stay on the speaker or become designs. Skip the opening and final sentence; never two moments in a row; about one per 8 seconds at most. {"s", "q": the 3-10 spoken words that name it, "kind": "object" | "place" | "action" | "era", "query": a 2-4 word stock-footage search naming that exact thing with no people in it, "alt": a second search for the same thing}.
- speaker: {"name": "...", "role": "..."} only if the speaker states their own name (and role) in the transcript; otherwise omit it.
- title: a hook title of at most 8 words stating the thesis or the question the Short answers, written as an a16z editor would title it ("Three mindset traps every founder makes"); used only when the first sentence is a set-up rather than a claim.
- designs: designed full-screen inserts the a16z team builds from the words themselves (0-5, about one per 12-15 s, at least 5 s apart, not in the first 3 s or the last 2 s, never on the same words as a card or a broll moment). Every text field is copied exactly from the transcript except "numeral". Kinds:
  {"kind": "chapter", "s", "numeral": "I." / "II." / "III.", "q": the 2-7 spoken words naming that section} - only when the speaker announces numbered sections or reasons ("the first one is", "number two").
  {"kind": "list", "s", "items": ["...", "...", "..."]} - three or more items named in a row (1-4 spoken words each, in spoken order; they may run into the next sentences).
  {"kind": "versus", "s", "left": "...", "connector": "&" | "vs" | "or", "right": "..."} - only when ONE sentence explicitly names two things as a pair or as opposites (both noun phrases of 1-4 spoken words, spoken within 3 seconds of each other); "&" for two parts of one thing, "vs" only for stated opposites.
  {"kind": "number", "s", "q": the spoken number words, "numeral": how it is written ("1000x", "97%", "10 years"), "label": 1-4 spoken words saying what it counts} - a magnitude that pays off a claim.
  {"kind": "bubbles", "s", "lines": [{"who": "them" | "me", "q": "..."}]} - a short exchange or message the speaker quotes (each line 2-12 spoken words; "me" is the speaker's side).
  {"kind": "quote", "s", "q": the single thesis sentence (4-10 spoken words), "key": the one word of it to set in serif italic}.
  {"kind": "window", "s", "q": a reflective or personal line of 4-12 spoken words} - the speaker's own picture shown inside a window card while those words type in above it; good for an aside, a confession or the moment the story turns.
  {"kind": "search", "s", "q": the 2-8 spoken words someone would type into a search box} - when the speaker describes looking something up, asking an AI or typing a question.
  {"kind": "document", "s", "q": the 5-14 spoken words of a finding, rule or claim from a study, book, article or law the speaker cites, "label": a 1-3 word written label for the source type ("Study", "The Backwards Law")} - shown as a page with that line highlighted.`;
var SHAPE = `{"format":"standard","hook":{"type":"H1","big":"AI native"},"key":[{"s":3,"q":"much less","kind":"I","p":4}],"punch":[{"s":9,"q":"keep doing stuff"}],"compounds":[{"s":2,"q":"venture capital"}],"reveal":[],"quotes":[],"drops":[],"cards":[{"s":5,"q":"the inventor","text":"inventor"}],"broll":[{"s":4,"q":"the first time I walked into the factory","kind":"place","query":"factory floor machines","alt":"assembly line"}],"designs":[{"kind":"list","s":9,"items":["taste","experience","soul"]}]}`;
async function ask(sdk, prompt, images) {
  let last = null;
  let timeouts = 0;
  const waits = [0, 4e3, 12e3, 3e4, 6e4, 9e4];
  for (let attempt = 0; attempt < waits.length; attempt += 1) {
    if (waits[attempt]) await new Promise((r) => setTimeout(r, waits[attempt]));
    try {
      return (await sdk.askAI(images && images.length ? { prompt, timeoutMs: 6e5, images } : { prompt, timeoutMs: 6e5 })).text;
    } catch (e) {
      last = e;
      if (/did not finish within/i.test(String(e?.message || e)) && ++timeouts >= 2) break;
    }
  }
  throw last || new Error("The assistant did not answer.");
}
function find(words2, sents, s, q2) {
  const want = toks(q2);
  if (!want.length) return null;
  const tries = [s - 1, s - 2, s, s - 3].filter((x, i, a) => x >= 0 && x < sents.length && a.indexOf(x) === i);
  for (const si of tries) {
    const { from, to } = sents[si];
    for (let a = from; a <= to; a += 1) {
      let ok = true;
      for (let j = 0; j < want.length; j += 1) if (a + j > to || norm2(words2[a + j].t) !== want[j]) ok = false;
      if (ok) return [words2[a].i, words2[a + want.length - 1].i];
    }
  }
  return null;
}
async function semanticPass(sdk, words2, hint = "") {
  const sents = sentences(words2);
  const lines = sents.map((x, k) => "S" + (k + 1) + " [" + words2[x.from].s.toFixed(1) + "s] " + words2.slice(x.from, x.to + 1).map((w) => w.t.replace(/"/g, "'")).join(" "));
  const total = words2.length ? words2[words2.length - 1].e - words2[0].s : 0;
  const prompt = "Pure text task: do NOT use any tools or read the project; everything you need is below. Think briefly and reply with ONLY one JSON object.\n\n" + GUIDE + (hint ? "\n\nThe editor's note: " + hint : "") + "\n\nThe Short runs " + total.toFixed(0) + " s: give about " + Math.max(3, Math.round(total / 5)) + " broll moments spread over it. Example of the JSON shape (sentence numbers are 1-based):\n" + SHAPE + "\n\nTranscript:\n" + lines.join("\n");
  let raw = await ask(sdk, prompt);
  let o;
  try {
    o = parseLoose(raw);
  } catch (e) {
    raw = await ask(sdk, prompt + "\n\nYour previous reply was not valid JSON (" + String(e?.message || e).slice(0, 120) + "). Reply again with ONLY the complete JSON object, double-quoted keys and strings, no comments.");
    o = parseLoose(raw);
  }
  return resolveSemantic(o, words2, sents, raw);
}
function parseLoose(text) {
  try {
    return lastJsonObject(text);
  } catch (first) {
    const s = String(text || "");
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start < 0 || end <= start) throw first;
    const body = s.slice(start, end + 1).replace(/[“”]/g, '"').replace(/\/\/[^\n"]*$/gm, "").replace(/,\s*([}\]])/g, "$1");
    try {
      return JSON.parse(body);
    } catch {
      throw first;
    }
  }
}
function resolveSemantic(o, words2, sents, raw = "") {
  let missing = 0;
  const f = (s, q2) => {
    const r = find(words2, sents, Number(s) || 0, String(q2 || ""));
    if (!r) missing += 1;
    return r;
  };
  const arr = (v) => Array.isArray(v) ? v : [];
  const tags = {};
  if (["standard", "story", "explainer", "montage_essay"].includes(o.format)) tags.format = o.format;
  if (o.hook && typeof o.hook === "object") {
    const big = o.hook.big ? f(1, o.hook.big) : null;
    tags.hook = { type: ["H1", "H2", "H3", "H4", "H5", "H6"].includes(o.hook.type) ? o.hook.type : void 0, big: big ? range(big) : [] };
  }
  const kinds = /* @__PURE__ */ new Set(["T", "P", "C", "N", "B", "I", "D", "K", "S", "Q", "R"]);
  tags.keyTerms = arr(o.key).map((k) => {
    const sp = f(k.s, k.q);
    if (!sp) return null;
    const kind = kinds.has(k.kind) ? k.kind : "T";
    const head = kind === "C" ? sp[0] : headOf(words2, sp);
    return { head, span: sp, kind, priority: Math.max(1, Math.min(5, Math.round(Number(k.p) || 3))) };
  }).filter(Boolean);
  tags.punchlines = arr(o.punch).map((p) => f(p.s, p.q)).filter(Boolean);
  tags.compounds = arr(o.compounds).map((c) => f(c.s, c.q)).filter((sp) => sp && sp[1] > sp[0]);
  tags.reveals = arr(o.reveal).map((r) => {
    const setup = f(r.s, r.setup);
    const cop = f(r.s, r.copula);
    const pay = f(r.s, r.payoff);
    return setup && cop && pay ? { setup, copula: cop[0], payoff: pay } : null;
  }).filter(Boolean);
  tags.quotes = arr(o.quotes).map((x) => {
    const sp = f(x.s, x.q);
    return sp ? { span: sp, kind: ["reported", "imagined", "famous", "coined"].includes(x.kind) ? x.kind : "reported" } : null;
  }).filter(Boolean);
  tags.drops = arr(o.drops).map((d) => f(d.s, d.q)).filter((sp) => sp && sp[1] - sp[0] <= 1);
  const cards = arr(o.cards).map((c) => {
    const sp = f(c.s, c.q);
    const text = String(c.text || "").trim().split(/\s+/).slice(0, 3).join(" ");
    if (!sp || !text) return null;
    const spoken = new Set(words2.filter((w) => w.i >= sp[0] && w.i <= sp[1]).map((w) => norm2(w.t)));
    return toks(text).every((t) => spoken.has(t)) ? { span: sp, text } : null;
  }).filter(Boolean);
  const broll = arr(o.broll).map((b) => {
    const sp = f(b.s, b.q);
    const query = String(b.query || "").trim();
    const alt = String(b.alt || "").trim();
    const kind = String(b.kind || "object");
    return sp && query ? { span: sp, query, alt: alt || query, kind } : null;
  }).filter(Boolean);
  const designs = resolveDesigns(arr(o.designs), words2, sents, f);
  let speaker;
  const nm = String(o.speaker?.name || "").trim();
  if (nm && nm.split(/\s+/).every((p) => words2.some((w) => norm2(w.t) === norm2(p)))) speaker = { name: nm, role: String(o.speaker?.role || "").trim().slice(0, 60) };
  const title = String(o.title || "").trim().split(/\s+/).slice(0, 8).join(" ") || void 0;
  return { tags, cards, broll, designs, speaker, title, missing, raw };
}
function resolveDesigns(list, words2, sents, f) {
  const out = [];
  const near = (s, q2, after = -1) => {
    for (let k = 0; k < 4; k += 1) {
      const sp = find(words2, sents, s + k, q2);
      if (sp && sp[0] > after) return sp;
    }
    return null;
  };
  for (const d of list) {
    const s = Number(d?.s) || 0;
    if (d?.kind === "chapter") {
      const sp = f(s, d.q);
      if (sp) out.push({ kind: "chapter", numeral: String(d.numeral || "I.").slice(0, 5), parts: [{ role: "title", span: sp, text: String(d.q) }] });
    } else if (d?.kind === "list") {
      const items = [];
      let after = -1;
      for (const it of Array.isArray(d.items) ? d.items.slice(0, 5) : []) {
        const sp = near(s, String(it), after);
        if (!sp) break;
        items.push({ role: "item", span: sp, text: String(it) });
        after = sp[1];
      }
      if (items.length >= 3) out.push({ kind: "list", parts: items });
    } else if (d?.kind === "versus") {
      const l = f(s, d.left);
      const r = near(s, String(d.right || ""), l ? l[1] : -1);
      const conn = ["&", "vs", "or"].includes(d.connector) ? d.connector : "&";
      const tOf = (i) => words2.find((w) => w.i === i)?.s ?? 0;
      if (l && r && tOf(r[0]) - tOf(l[0]) <= 3 && l[1] - l[0] <= 3 && r[1] - r[0] <= 3) out.push({ kind: "versus", parts: [{ role: "item", span: l, text: String(d.left) }, { role: "connector", span: null, text: conn }, { role: "item", span: r, text: String(d.right) }] });
    } else if (d?.kind === "number") {
      const sp = f(s, d.q);
      const lab = d.label ? near(s, String(d.label)) : null;
      const numeral = String(d.numeral || "").trim();
      if (sp && lab && /\d/.test(numeral)) out.push({ kind: "number", numeral, parts: [{ role: "key", span: sp, text: numeral }, ...lab ? [{ role: "label", span: lab, text: String(d.label) }] : []] });
    } else if (d?.kind === "bubbles") {
      const lines = [];
      let after = -1;
      for (const l of Array.isArray(d.lines) ? d.lines.slice(0, 4) : []) {
        const sp = near(s, String(l?.q || ""), after);
        if (!sp) continue;
        lines.push({ role: l?.who === "me" ? "me" : "them", span: sp, text: String(l.q) });
        after = sp[1];
      }
      if (lines.length) out.push({ kind: "bubbles", parts: lines });
    } else if (d?.kind === "window" || d?.kind === "search") {
      const sp = f(s, d.q);
      if (sp) {
        const parts = [];
        for (const w of words2) if (w.i >= sp[0] && w.i <= sp[1]) parts.push({ role: "item", span: [w.i, w.i], text: w.t.replace(/[.,!?;:"]+$/g, "") });
        out.push({ kind: d.kind, parts });
      }
    } else if (d?.kind === "document") {
      const sp = f(s, d.q);
      if (sp) out.push({ kind: "document", parts: [{ role: "label", span: null, text: String(d.label || "").slice(0, 32) }, { role: "item", span: sp, text: String(d.q) }] });
    } else if (d?.kind === "quote") {
      const sp = f(s, d.q);
      if (sp) {
        const key = norm2(String(d.key || ""));
        const parts = [];
        for (const w of words2) if (w.i >= sp[0] && w.i <= sp[1]) parts.push({ role: norm2(w.t) === key ? "key" : "item", span: [w.i, w.i], text: w.t.replace(/[.,!?;:"]+$/g, "") });
        out.push({ kind: "quote", parts });
      }
    }
  }
  return out;
}
var range = (sp) => {
  const out = [];
  for (let i = sp[0]; i <= sp[1]; i += 1) out.push(i);
  return out;
};
function headOf(words2, sp) {
  const by = new Map(words2.map((w) => [w.i, w]));
  for (let i = sp[1]; i >= sp[0]; i -= 1) {
    const w = by.get(i);
    if (w && wordClass(w.t) === "CONT" && norm2(w.t).length > 1) return i;
  }
  return sp[1];
}

// plugins/a16z-style-captions/src/pipeline/face_track.py
var face_track_default = '# Speaker face tracking for the 9:16 reframe (YuNet through OpenCV). Per job (one source range): split\n# into shots where the picture changes, link faces into tracks, keep the track seen most often, largest and\n# most confidently. Figures are fractions of the source frame.\nimport argparse, json, os\nimport cv2\nimport numpy as np\n\n\ndef iou(a, b):\n    ax2, ay2, bx2, by2 = a[0] + a[2], a[1] + a[3], b[0] + b[2], b[1] + b[3]\n    iw = max(0.0, min(ax2, bx2) - max(a[0], b[0]))\n    ih = max(0.0, min(ay2, by2) - max(a[1], b[1]))\n    inter = iw * ih\n    return inter / (a[2] * a[3] + b[2] * b[3] - inter + 1e-9)\n\n\ndef histogram(img):\n    h = cv2.calcHist([cv2.cvtColor(img, cv2.COLOR_BGR2HSV)], [0, 1], None, [32, 16], [0, 180, 0, 256])\n    return cv2.normalize(h, h)\n\n\ndef scan(job, model, rate=6.0, score=0.8, min_face=0.05, cut=0.35):\n    cap = cv2.VideoCapture(job["path"])\n    if not cap.isOpened():\n        return {"id": job.get("id"), "error": "cannot open source"}\n    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0\n    W, H = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))\n    f0 = max(0, int(round(float(job["start"]) * fps)))\n    f1 = max(f0 + 1, int(round(float(job["end"]) * fps)))\n    step = max(1, int(round(fps / rate)))\n    k = min(1.0, 640.0 / max(W, H))\n    small = (max(1, int(round(W * k))), max(1, int(round(H * k))))\n    det = cv2.FaceDetectorYN.create(model, "", small, score, 0.3, 5000)\n    if f0 > 0:\n        cap.set(cv2.CAP_PROP_POS_FRAMES, f0)\n    samples, cuts, prev = [], [f0], None\n    for f in range(f0, f1):\n        if not cap.grab():\n            break\n        if (f - f0) % step:\n            continue\n        ok, img = cap.retrieve()\n        if not ok:\n            break\n        img = cv2.resize(img, small, interpolation=cv2.INTER_AREA)\n        hist = histogram(img)\n        if prev is not None and cv2.compareHist(prev, hist, cv2.HISTCMP_CHISQR_ALT) > cut:\n            cuts.append(f)\n        prev = hist\n        _, rows = det.detect(img)\n        faces = []\n        for r in ([] if rows is None else rows):\n            x, y, w, h = r[0] / small[0], r[1] / small[1], r[2] / small[0], r[3] / small[1]\n            if r[14] < score or h < min_face or not (0.5 < (w * W) / (h * H) < 1.6):\n                continue\n            faces.append({"b": [float(x), float(y), float(w), float(h)], "ex": float((r[4] + r[6]) / 2 / small[0]),\n                          "ey": float((r[5] + r[7]) / 2 / small[1]), "s": float(r[14])})\n        samples.append({"f": f, "faces": faces})\n    cap.release()\n    bounds = cuts + [f1]\n    shots = []\n    for i in range(len(cuts)):\n        ss = [s for s in samples if bounds[i] <= s["f"] < bounds[i + 1]]\n        shot = {"start": round(bounds[i] / fps, 4), "end": round(bounds[i + 1] / fps, 4), "face": None, "faces": 0}\n        if ss:\n            tracks = []\n            for s in ss:\n                for face in s["faces"]:\n                    best = max(tracks, key=lambda t: iou(t["last"], face["b"]), default=None)\n                    if best is None or iou(best["last"], face["b"]) < 0.3 or best["lastF"] == s["f"]:\n                        best = {"rows": [], "last": None, "lastF": None}\n                        tracks.append(best)\n                    best["rows"].append(face)\n                    best["last"] = face["b"]\n                    best["lastF"] = s["f"]\n\n            def weight(t):\n                return len(t["rows"]) / len(ss) * float(np.median([r["b"][3] for r in t["rows"]])) * float(np.mean([r["s"] for r in t["rows"]]))\n\n            ranked = sorted(tracks, key=weight, reverse=True)\n            shot["faces"] = max(len(s["faces"]) for s in ss)\n            if ranked:\n                m = ranked[0]["rows"]\n                med = lambda key: round(float(np.median([key(r) for r in m])), 4)\n                shot["face"] = {"cx": med(lambda r: r["ex"]), "eyes": med(lambda r: r["ey"]), "h": med(lambda r: r["b"][3]),\n                                "w": med(lambda r: r["b"][2]), "top": med(lambda r: r["b"][1])}\n        shots.append(shot)\n    merged = []\n    for s in shots:\n        if merged and (s["end"] - s["start"] < 0.5 or merged[-1]["end"] - merged[-1]["start"] < 0.5):\n            keep = merged[-1] if (merged[-1]["face"] and (merged[-1]["end"] - merged[-1]["start"]) >= (s["end"] - s["start"])) or not s["face"] else s\n            merged[-1] = dict(keep, start=merged[-1]["start"], end=s["end"])\n        else:\n            merged.append(s)\n    return {"id": job.get("id"), "width": W, "height": H, "fps": fps, "shots": merged}\n\n\ndef main():\n    p = argparse.ArgumentParser()\n    p.add_argument("--model", required=True)\n    p.add_argument("--jobs", required=True)\n    p.add_argument("--out", required=True)\n    a = p.parse_args()\n    cv2.setNumThreads(2)\n    out = [scan(j, a.model) for j in json.load(open(a.jobs))]\n    tmp = a.out + ".tmp"\n    with open(tmp, "w") as fh:\n        json.dump({"jobs": out}, fh, separators=(",", ":"))\n    os.replace(tmp, a.out)\n    shots = [s for j in out for s in j.get("shots", [])]\n    print(json.dumps({"ok": True, "shots": len(shots), "noFace": sum(1 for s in shots if not s["face"]), "errors": [j["error"] for j in out if j.get("error")]}))\n\n\nmain()\n';

// plugins/a16z-style-captions/src/pipeline/faces.ts
var MODEL_URL = "https://media.githubusercontent.com/media/opencv/opencv_zoo/f12e12798e8314f7c074a6656816c048dcc95b7a/models/face_detection_yunet/face_detection_yunet_2023mar.onnx";
var MODEL_SHA = "8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4";
async function ensureFaceRuntime(sdk, progress) {
  const env = envRoot();
  const model2 = fs().join(dataRoot(), "models", "face_detection_yunet_2023mar.onnx");
  const py = fs().join(env, "bin", "python");
  const ok = await shell(sdk, "Check speaker framing", "[ -x " + q(py) + " ] && " + q(py) + " -c 'import cv2; cv2.FaceDetectorYN' 2>/dev/null && echo ENV; [ -f " + q(model2) + " ] && echo MODEL; true", 3e4);
  if (!/ENV/.test(ok)) {
    progress("Setting up speaker framing (one time, about a minute)\u2026");
    await shell(
      sdk,
      "Install speaker framing",
      "set -e; /usr/bin/python3 -m venv " + q(env) + " && " + q(fs().join(env, "bin", "pip")) + " install -q --disable-pip-version-check --only-binary=:all: numpy 'opencv-python-headless>=4.8'",
      3e5
    );
  }
  if (!/MODEL/.test(ok)) {
    const dir = fs().join(dataRoot(), "models");
    await shell(
      sdk,
      "Download the face model",
      "set -e; mkdir -p " + q(dir) + " && curl -sfL --max-time 120 -o " + q(model2 + ".part") + " " + q(MODEL_URL) + ' && [ "$(shasum -a 256 ' + q(model2 + ".part") + ` | cut -d' ' -f1)" = ` + MODEL_SHA + " ] && mv " + q(model2 + ".part") + " " + q(model2),
      15e4
    );
  }
  return { python: py, model: model2 };
}
async function trackFaces(sdk, rt, dir, jobs) {
  const out = {};
  if (!jobs.length) return out;
  fs().mkdirSync(dir, { recursive: true });
  const jobsPath = fs().join(dir, "face-jobs.json");
  const outPath = fs().join(dir, "faces.json");
  await fs().writeFile(jobsPath, J(jobs));
  await shell(sdk, "Find the speaker in each shot", q(rt.python) + " -c " + q(face_track_default) + " --model " + q(rt.model) + " --jobs " + q(jobsPath) + " --out " + q(outPath), 3e5);
  const res = JSON.parse(String(await fs().readFile(outPath, "utf8")));
  for (const j of res.jobs || []) if (!j.error) out[String(j.id)] = { W: j.width, H: j.height, shots: j.shots };
  return out;
}

// plugins/a16z-style-captions/src/pipeline/edit.ts
var FILLER2 = /^(uh+|um+|uhm+|erm+|er|ah+|hmm+|mm+)[.,!?]*$/i;
function planPauses(words2, fps, endFrame, tags = {}) {
  const ws = words2.filter((w) => !(FILLER2.test(w.t.trim()) && (w.e - w.s) / fps >= 0.1));
  if (!ws.length) return { ranges: [[0, endFrame]], removed: 0, cuts: 0, beats: 0 };
  const sec = (f) => f / fps;
  const gaps = [];
  const punchStarts = new Set((tags.punchlines || []).map((p) => p[0]));
  for (let k = 0; k + 1 < ws.length; k += 1) {
    const a = ws[k];
    const b = ws[k + 1];
    const gap = sec(b.s - a.e);
    const t = a.t.trim();
    const sentence = /[.!?]["”’)]*$/.test(t);
    const comma2 = /[,;:]["”’)]*$/.test(t);
    const target = sentence ? 0.22 : comma2 ? 0.14 : 0.1;
    gaps.push({ k, gap, target, save: gap - target, beat: sentence && punchStarts.has(b.i) });
  }
  const minutes = sec(ws[ws.length - 1].e - ws[0].s) / 60;
  const beatBudget = Math.max(1, Math.round(3 * minutes));
  let beatList = gaps.filter((g) => g.beat && g.gap > 0.45);
  if (!tags.punchlines) beatList = gaps.filter((g) => /[.!?]["”’)]*$/.test(ws[g.k].t.trim()) && g.gap > 0.6).sort((a, b) => b.gap - a.gap);
  beatList.slice(0, beatBudget).forEach((g) => {
    g.target = 0.45;
    g.save = g.gap - g.target;
    g.beat = true;
  });
  const maxCuts = Math.max(2, Math.round(16 * minutes));
  const chosen = new Set(
    gaps.filter((g) => g.save >= 0.25).sort((a, b) => b.save - a.save).slice(0, maxCuts).map((g) => g.k)
  );
  const ranges = [];
  let start = Math.max(0, ws[0].s - Math.round(0.06 * fps));
  for (const g of gaps) {
    if (!chosen.has(g.k)) continue;
    const a = ws[g.k];
    const b = ws[g.k + 1];
    const tail2 = Math.max(Math.round(0.06 * fps), Math.round(g.target * 0.6 * fps));
    const lead = Math.max(1, Math.round(g.target * fps) - tail2);
    ranges.push([start, Math.min(b.s, a.e + tail2)]);
    start = Math.max(a.e + tail2, b.s - lead);
  }
  ranges.push([start, Math.min(endFrame, ws[ws.length - 1].e + Math.round(0.12 * fps))]);
  const kept = ranges.reduce((n, r) => n + (r[1] - r[0]), 0);
  return { ranges: ranges.filter((r) => r[1] > r[0]), removed: sec(endFrame - kept), cuts: ranges.length - 1, beats: gaps.filter((g) => g.beat).length };
}
function layoutRanges(ranges, clips, fps) {
  const out = [];
  let at = 0;
  let prevSrc = null;
  ranges.forEach(([a, b], ri) => {
    const parts = clips.filter((c) => c.e > a && c.s < b).sort((x, y) => x.s - y.s);
    parts.forEach((c, j) => {
      const s = Math.max(a, c.s);
      const e = Math.min(b, c.e);
      if (e <= s) return;
      const jump = j === 0 && ri > 0 && prevSrc === c;
      out.push({ start: at, end: at + (e - s), src: c, srcIn: c.srcStart >= 0 ? c.srcStart + (s - c.s) / fps : -1, jump });
      at += e - s;
      prevSrc = c;
    });
  });
  return out;
}

// plugins/a16z-style-captions/src/pipeline/framing.ts
var W = 1080;
var H = 1920;
var F = { eyes: 0.2, cx: 0.5, faceH: 0.22, maxUpscale: 2.3, headMargin: 0.025, hair: 0.1 };
function shotFrame(sw, sh, face) {
  const fill = Math.max(W / sw, H / sh);
  const r2 = (v) => Math.round(v * 100) / 100;
  const r4 = (v) => Math.round(v * 1e4) / 1e4;
  if (!face || !(face.h > 0)) {
    const w2 = sw * fill;
    const h2 = sh * fill;
    return { rect: { x: r2((W - w2) / 2), y: r2((H - h2) / 2), w: r2(w2), h: r2(h2) }, face: null, zoom: r4(fill) };
  }
  const chin = face.top + face.h;
  const head = Math.max(0, 2 * face.eyes - chin - F.hair * face.h);
  const k = Math.max(fill, Math.min(F.maxUpscale, F.faceH * H / (face.h * sh)));
  const w = sw * k;
  const h = sh * k;
  const y = Math.min(0, Math.max(H - h, F.headMargin * H - head * h, F.eyes * H - face.eyes * h));
  const x = Math.min(0, Math.max(W - w, F.cx * W - face.cx * w));
  const on = (v) => r4((y + v * h) / H);
  return { rect: { x: r2(x), y: r2(y), w: r2(w), h: r2(h) }, face: { cx: r4((x + face.cx * w) / W), eyes: on(face.eyes), top: on(face.top), chin: on(chin), h: r4(face.h * h / H) }, zoom: r4(k) };
}
function punch(r, m, ax, ay) {
  if (m === 1) return r;
  const w = r.w * m;
  const h = r.h * m;
  let x = ax - (ax - r.x) * m;
  let y = ay - (ay - r.y) * m;
  x = Math.min(0, Math.max(W - w, x));
  y = Math.min(0, Math.max(H - h, y));
  return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, w: Math.round(w * 100) / 100, h: Math.round(h * 100) / 100 };
}
var hash = (i) => {
  const x = Math.sin(i * 91.17 + 3.7) * 43758.5453;
  return x - Math.floor(x);
};
function anglesOf(clips, faces) {
  const byKey = /* @__PURE__ */ new Map();
  for (const c of clips) {
    const f = faces[String(c.src.clipId)];
    if (!f) continue;
    const key = c.src.path || String(c.src.clipId);
    const list = byKey.get(key) || [];
    for (const s of f.shots) if (s.face && s.end - s.start >= 0.5) list.push(s.face);
    byKey.set(key, list);
  }
  const med = (xs) => {
    const v = xs.slice().sort((a, b) => a - b);
    return v.length ? v[Math.floor(v.length / 2)] : 0;
  };
  const out = [];
  for (const [key, list] of byKey) {
    const groups = [];
    for (const f of list.slice().sort((a, b) => a.h - b.h)) {
      const g = groups.find((x) => f.h <= med(x.map((y) => y.h)) * 1.18 && Math.abs(f.cx - med(x.map((y) => y.cx))) < 0.08);
      if (g) g.push(f);
      else groups.push([f]);
    }
    for (const g of groups) {
      const face = { cx: med(g.map((x) => x.cx)), eyes: med(g.map((x) => x.eyes)), h: med(g.map((x) => x.h)), w: med(g.map((x) => x.w)), top: med(g.map((x) => x.top)) };
      out.push({ key, h: face.h, cx: face.cx, face });
    }
  }
  return out;
}
function angleFor(angles, key, f) {
  const own = angles.filter((a) => a.key === key);
  if (!own.length) return f;
  return own.slice().sort((a, b) => Math.abs(Math.log(a.h / f.h)) + Math.abs(a.cx - f.cx) - (Math.abs(Math.log(b.h / f.h)) + Math.abs(b.cx - f.cx)))[0].face;
}
function planFraming(clips, faces, fps) {
  const out = [];
  const shots = [];
  const cuts = [];
  const angles = anglesOf(clips, faces);
  let framed = 0;
  let total = 0;
  let m = 1;
  let lastCutAt = -1e9;
  let lastM = 1;
  let jumps = 0;
  clips.forEach((c, ci) => {
    const found = faces[String(c.src.clipId)];
    const key = c.src.path || String(c.src.clipId);
    const sw = found?.W || c.src.sw || 1920;
    const sh = found?.H || c.src.sh || 1080;
    const srcIn = c.srcIn;
    const srcOut = srcIn + (c.end - c.start) / fps;
    const list = (found?.shots || []).filter((s) => s.end > srcIn && s.start < srcOut).map((s) => ({ ...s }));
    const withFace = (found?.shots || []).filter((s) => s.face);
    if (c.jump) {
      jumps += 1;
      const r = hash(jumps + ci);
      let next = r < 0.5 ? m : m === 1 ? r < 0.8 ? 1.1 : 1.15 : 1;
      const t = c.start / fps;
      if (next === lastM && t - lastCutAt < 0.8) next = m === 1 ? 1.1 : 1;
      m = next;
    } else if (ci > 0) m = 1;
    if (ci > 0) {
      cuts.push(c.start / fps);
      lastCutAt = c.start / fps;
      lastM = m;
    }
    const pieces = [];
    for (const s of list.length ? list : [{ start: srcIn, end: srcOut, face: null }]) {
      const prev = pieces[pieces.length - 1];
      if (prev && (Math.min(s.end, srcOut) - Math.max(s.start, srcIn) < 0.5 || Math.min(prev.end, srcOut) - Math.max(prev.start, srcIn) < 0.5)) {
        if (!prev.face || s.face && s.end - s.start > prev.end - prev.start) prev.face = s.face || prev.face;
        prev.end = s.end;
      } else pieces.push({ ...s });
    }
    const clipShots = [];
    pieces.forEach((s, i) => {
      let face = s.face;
      if (!face && withFace.length) {
        const mid = (s.start + s.end) / 2;
        face = withFace.slice().sort((a, b) => Math.abs((a.start + a.end) / 2 - mid) - Math.abs((b.start + b.end) / 2 - mid))[0].face;
      }
      if (face) face = angleFor(angles, key, face);
      const from = i === 0 ? c.start : Math.max(c.start, Math.min(c.end, c.start + Math.round((s.start - srcIn) * fps)));
      const to = i === pieces.length - 1 ? c.end : Math.max(c.start, Math.min(c.end, c.start + Math.round((s.end - srcIn) * fps)));
      if (to <= from) return;
      const fr = shotFrame(sw, sh, face);
      const ax = fr.face ? fr.face.cx * W : W / 2;
      const ay = fr.face ? fr.face.eyes * H : H * 0.4;
      const rect = punch(fr.rect, m, ax, ay);
      const f = fr.face ? { cx: (ax + (fr.face.cx * W - ax) * m) / W, cy: (ay + (fr.face.eyes + fr.face.chin) / 2 * H - ay) / H, w: 0, h: fr.face.h * m, chin: (ay + (fr.face.chin * H - ay) * m) / H } : null;
      const prev = clipShots[clipShots.length - 1];
      if (prev && prev.x === rect.x && prev.y === rect.y && prev.w === rect.w) {
        prev.to = to;
        shots[shots.length - 1].to = to / fps;
        return;
      }
      clipShots.push({ from, to, ...rect });
      total += 1;
      if (fr.face) framed += 1;
      if (clipShots.length > 1) cuts.push(from / fps);
      shots.push({ from: from / fps, to: to / fps, kind: "speaker", face: f, segment: c.src.clipId * 1e5 + Math.round(s.start * 10) });
    });
    const cf = { start: c.start, end: c.end, sw, sh, shots: clipShots };
    if (ci === 0 && clipShots.length) {
      const sf = shots[0]?.face;
      cf.open = { s0: 1.12, ax: sf ? sf.cx * W : W / 2, ay: sf ? (sf.chin - sf.h / 2) * H : H * 0.35 };
    }
    out.push(cf);
  });
  return { clips: out, shots, cuts: [...new Set(cuts.map((c) => Math.round(c * 1e3) / 1e3))].sort((a, b) => a - b), framed, total };
}
function addFramingChanges(plan, covered, starts, fps, duration) {
  const clips = plan.clips.map((c) => ({ ...c, shots: c.shots.map((x) => ({ ...x })) }));
  const shots = plan.shots.map((x) => ({ ...x, face: x.face ? { ...x.face } : x.face }));
  const cuts = plan.cuts.slice();
  const inside = (t) => covered.some(([a, b]) => t >= a - 0.05 && t < b + 0.05);
  const events = [...cuts, ...covered.flatMap(([a, b]) => [a, b])].sort((a, b) => a - b);
  let last = 0;
  const added = [];
  for (const t of starts.slice().sort((a, b) => a - b)) {
    while (events.length && events[0] <= t) last = Math.max(last, events.shift());
    if (t - last < 4 || inside(t) || t > duration - 0.8) continue;
    const nextEvent = events.length ? events[0] : duration;
    if (nextEvent - t < 1.2) continue;
    added.push(t);
    last = t;
  }
  for (const t of added) {
    const F2 = Math.round(t * fps);
    const clip = clips.find((c) => F2 > c.start && F2 < c.end);
    if (!clip) continue;
    const k = clip.shots.findIndex((x) => F2 > x.from && F2 < x.to);
    if (k < 0) continue;
    const cur = clip.shots[k];
    const cap = shots.find((x) => x.kind === "speaker" && t >= x.from && t < x.to);
    const f = cap?.face;
    const ax = f ? f.cx * W : W / 2;
    const ay = f ? (f.chin - f.h / 2) * H : 0.4 * H;
    const z = cur.z || 1;
    const factor = z > 1 ? 1 / z : 1.15;
    const rect = punch(cur, factor, ax, ay);
    clip.shots.splice(k, 1, { ...cur, to: F2 }, { ...rect, from: F2, to: cur.to, z: z > 1 ? 1 : 1.15 });
    if (cap) {
      const j = shots.indexOf(cap);
      const nf = f ? { ...f, h: f.h * factor, chin: (ay + (f.chin * H - ay) * factor) / H } : null;
      shots.splice(j, 1, { ...cap, to: t }, { ...cap, from: t, face: nf });
    }
    cuts.push(t);
  }
  return { ...plan, clips, shots, cuts: cuts.sort((a, b) => a - b) };
}

// plugins/a16z-style-captions/src/pipeline/media.ts
var b64url = (s) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
var model = (endpoint) => "model_v1_" + b64url(endpoint);
var FAILED = /* @__PURE__ */ new Set(["failed", "cancelled", "canceled", "input_failed", "submission_rejected", "upload_failed", "handoff_failed"]);
var StuckError = class extends Error {
};
async function generate(pid, r, label, onTick, timeoutMs, tries = 3) {
  let last = null;
  for (let k = 0; k < tries; k += 1) {
    try {
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
  fs().mkdirSync(r.folder, { recursive: true });
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
    origin: { tool: r.tool, tab: "a16z-style-captions", recipeId: r.recipeId }
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

// plugins/a16z-style-captions/src/pipeline/sound.ts
var MUSIC_PROMPT = "Instrumental ambient underscore for a thoughtful interview: soft warm synth pad, slow evolving chords, gentle airy texture, subtle low drone, no drums, no percussion, no beat, no vocals, calm and reflective, steady level from the first second, no fade in";
async function makeMusic(pid, seconds, dir, key, onTick) {
  return generate(
    pid,
    {
      key: "a16z-music-" + key,
      endpoint: "elevenlabs/music/v2.5",
      input: { prompt: MUSIC_PROMPT, music_length_ms: Math.round(Math.min(150, Math.max(12, seconds + 3)) * 1e3), force_instrumental: true, output_format: "mp3_44100_128" },
      folder: fs().join(dir, "music"),
      outputName: "short-music",
      tool: "audio",
      recipeId: "short-music"
    },
    "Music",
    onTick,
    10 * 6e4
  );
}
async function loudness(sdk, path, from, dur) {
  try {
    const win = from != null ? "-ss " + from.toFixed(3) + " " + (dur != null ? "-t " + dur.toFixed(3) + " " : "") : "";
    const out = await shell(sdk, "Measure loudness", FF + '"$FF" -hide_banner -nostats ' + win + "-i " + q(path) + " -vn -af loudnorm=print_format=json -f null - 2>&1 | tail -n 14", 18e4, 8e3);
    const i = Number((/"input_i"\s*:\s*"(-?[\d.]+)"/.exec(out) || [])[1]);
    return Number.isFinite(i) && i > -70 ? i : null;
  } catch {
    return null;
  }
}
var FF = 'FF="$(command -v ffmpeg || ls /opt/homebrew/bin/ffmpeg /usr/local/bin/ffmpeg "$HOME/.local/bin/ffmpeg" 2>/dev/null | head -n 1)"; ';
var VOICE_TARGET = -16;
var BED_UNDER = 9;
function gains(voice, music) {
  const voiceDb = voice == null ? 0 : Math.max(-8, Math.min(10, VOICE_TARGET - voice));
  const musicDb = music == null ? -24 : Math.max(-40, Math.min(6, VOICE_TARGET - BED_UNDER - music));
  return { voiceDb: Math.round(voiceDb * 10) / 10, musicDb: Math.round(musicDb * 10) / 10 };
}

// plugins/a16z-style-captions/src/renderers.ts
var lookCode = 'import r from"react";import{useCurrentFrame as c}from"remotion";var e=(a,f)=>typeof a=="number"&&Number.isFinite(a)?a:f;function x({Source:a,data:f}){let t=f||{},o=e(t.W,1080),s=e(t.H,1920),l=e(t.sw,1920),h=e(t.sh,1080),i=c()+e(t.start,0),d=Array.isArray(t.shots)?t.shots:[],u=d.find(n=>i>=n.from&&i<n.to)||d[d.length-1]||{x:0,y:(s-o*h/l)/2,w:o,h:o*h/l},b="";if(t.push&&t.end&&t.end>e(t.start,0)){let n=1+t.push*Math.max(0,Math.min(1,(i-e(t.start,0))/(t.end-e(t.start,0))));b="translate("+o/2+"px,"+s/2+"px) scale("+n.toFixed(4)+") translate("+-o/2+"px,"+-s/2+"px)"}else if(t.open&&d.length&&u===d[0]){let n=(i-e(d[0].from,0))*(24/e(t.fps,24)),m=1+(t.open.s0-1)*Math.pow(.68,Math.max(0,n));m>1.0005&&(b="translate("+t.open.ax+"px,"+t.open.ay+"px) scale("+m.toFixed(4)+") translate("+-t.open.ax+"px,"+-t.open.ay+"px)")}let p=(t.windows||[]).find(n=>i>=n.from&&i<n.to);if(p){let n=Math.max(0,Math.min(1,(i-p.from)/Math.max(1,p.to-p.from))),m=.78*o*(1-.04*n),w=m*h/l;return r.createElement("div",{style:{position:"absolute",inset:0,overflow:"hidden",backgroundColor:"#F4F5F7"}},r.createElement("div",{style:{position:"absolute",left:0,top:0,width:o,height:s,transformOrigin:"0 0",transform:"scale("+l/o+", "+h/s+")",overflow:"hidden",backgroundColor:"#F4F5F7"}},r.createElement("div",{style:{position:"absolute",left:(o-m)/2,top:.54*s-w/2,width:m,height:w,overflow:"hidden"}},r.createElement(a,null))))}return r.createElement("div",{style:{position:"absolute",inset:0,overflow:"hidden",backgroundColor:"#000"}},r.createElement("div",{style:{position:"absolute",left:0,top:0,width:o,height:s,transformOrigin:"0 0",transform:"scale("+l/o+", "+h/s+")",overflow:"hidden"}},r.createElement("div",{style:{position:"absolute",left:0,top:0,width:o,height:s,transform:b||void 0,transformOrigin:"0 0"}},r.createElement("div",{style:{position:"absolute",left:u.x,top:u.y,width:u.w,height:u.h,filter:t.grade||void 0}},r.createElement(a,null)))))}export{x as default};\n';
var graphicCode = `import Z,{useEffect as Nt,useState as Wt}from"react";import{useCurrentFrame as Qt,delayRender as Vt,continueRender as Jt}from"remotion";var it={},rt={};function wt(){for(let t of Object.keys(it))delete it[t];for(let t of Object.keys(rt))delete rt[t]}var st;function vt(){if(st!==void 0)return st;try{st=typeof document>"u"?null:document.createElement("canvas").getContext("2d")}catch{st=null}return st}var Mt=(t,i)=>(t.style==="italic"?"italic ":"")+t.weight+" "+i+"px "+t.family;function X(t,i){let e=i.family+"|"+i.weight+"|"+i.style+"|"+t;if(it[e]!=null)return it[e];let r=0,s=vt();if(s){s.font=Mt(i,100);let n=s.measureText(t);n&&n.width>0&&(r=n.width)}return r>0||(r=t.length*i.estimate*100),it[e]=r,r}function W(t){let i=t.family+"|"+t.weight+"|"+t.style;if(rt[i])return rt[i];let e={xh:.53,cap:.72,ascent:.95,descent:.25},r=vt();if(r){r.font=Mt(t,100);let s=r.measureText("xzvw"),n=r.measureText("HXEI"),o=Number(s.actualBoundingBoxAscent)/100,p=Number(n.actualBoundingBoxAscent)/100,x=Number(n.fontBoundingBoxAscent)/100,l=Number(n.fontBoundingBoxDescent)/100;o>.2&&p>.3&&x>0&&(e={xh:o,cap:p,ascent:x,descent:l>=0?l:.25})}return rt[i]=e,e}import Pt from"react";var nt={};function St(){for(let t of Object.keys(nt))delete nt[t]}var zt=(t,i)=>i===1?t.serif:i===2?t.roman:t.sans;function xt(t,i,e,r){if(t!==i.sans)return-.012;let s="and the world",n=X(s,t)/100*r,o=(.5*e-n)/(s.length*r);return Math.max(-.045,Math.min(0,o))}function et(t,i,e,r){let s=0,n=[];return t.toks.forEach((o,p)=>{let x=xt(o.face,i,e,r)*o.size,l=X(o.text,o.face)/100*o.size+o.text.length*x;if(p>0){let z=X(" ",i.sans)/100*Math.min(o.size,t.toks[p-1].size)*.86;s+=z}n.push({dx:s,w:l}),s+=l}),{width:s,parts:n}}function ut(t,i,e,r,s){let n=e.uid+"|"+i+"|"+s.toFixed(3);if(nt[n])return nt[n];let o=e.W,p=e.H,x=W(r.sans),l=e.xh*p/x.xh,z=t.g||1,v=(d,M)=>d===r.sans?M:M*x.xh/W(d).xh,A=(d,M)=>zt(r,M||d),y=t.l.map(d=>({from:d[0],to:d[1],scale:d[2],face:d[3],big:d[4]===1})),w=y.findIndex(d=>d.big),h=[],H=(d,M)=>{let N=y[d];return{align:"center",toks:t.t.slice(N.from,N.to).map((_,V)=>{let J=A(N.face,_[2]);return{text:_[0],face:J,size:v(J,M),reveal:_[1],accent:_[3],kept:(t.sw||0)>N.from+V}})}},I=0,O=0;if(y.length===1||w<0){let d=(e.xh<.029?.9:.86)*o,M=t.y*p;y.forEach((_,V)=>{let J=l*y[V].scale*z*s,pt=H(V,J),ot=et(pt,r,o,l);ot.width>d&&(J*=d/ot.width,pt=H(V,J),ot=et(pt,r,o,l));let kt=x.cap*J,ht=V===0?M+kt/2:M,Gt=(o-ot.width)/2;pt.toks.forEach((tt,Ot)=>h.push({text:tt.text,x:Gt+ot.parts[Ot].dx,base:ht,size:tt.size,face:tt.face,track:xt(tt.face,r,o,l)*tt.size,reveal:tt.reveal,accent:tt.accent,kept:tt.kept})),V===0&&(I=ht-kt),O=ht+x.descent*J*.5,M=ht+J*1.12});let N={tokens:h,top:I,bottom:O};return nt[n]=N,N}let j=zt(r,y[w].face),G=l*y[w].scale*s,u=H(w,G),a=et(u,r,o,l);a.width>.8*o&&(G*=.8*o/a.width,u=H(w,G),a=et(u,r,o,l)),G=Math.min(G,3.3*l),u=H(w,G),a=et(u,r,o,l);let c=W(j).xh*v(j,G),g=Math.max(.7*l,.42*c/x.xh)*1,b=[],f=t.tp==="stack"||t.tp==="two";b.push({li:w,line:u,m:a,base:0,x0:0});let k=0,F=d=>{let M=g*s,N=et(H(d,M),r,o,l).width;return N>a.width*.96&&(M*=Math.max(.75,a.width*.96/N)),M};for(let d=w-1;d>=0;d-=1){let M=H(d,F(d)),N=et(M,r,o,l),_=W(j).cap*v(j,G);k=d===w-1?-(_+.12*c):k-1.08*g*s,b.push({li:d,line:M,m:N,base:k,x0:f?(a.width-N.width)/2:0})}k=0;for(let d=w+1;d<y.length;d+=1){let M=H(d,F(d)),N=et(M,r,o,l),_=g*s;k=d===w+1?f?W(j).descent*v(j,G)+x.cap*_+.05*c:jt(u,a,_,c,x.xh):k+1.08*_;let V=Math.min(a.width+.06*o,Math.max(a.width,N.width));b.push({li:d,line:M,m:N,base:k,x0:f?(a.width-N.width)/2:V-N.width})}let T=1e9,C=-1e9,m=1e9,D=-1e9;for(let d of b){T=Math.min(T,d.x0),C=Math.max(C,d.x0+d.m.width);let M=d.line.toks[0]?.size||l,N=d.line.toks[0]?.face||r.sans;m=Math.min(m,d.base-W(N).cap*M),D=Math.max(D,d.base+W(N).descent*M*.4)}let B=t.y*p-x.cap*l/2-m;D+B>.83*p&&(B=.83*p-D);let P=(o-(C-T))/2-T;for(let d of b)d.line.toks.forEach((M,N)=>h.push({text:M.text,x:P+d.x0+d.m.parts[N].dx,base:d.base+B,size:M.size,face:M.face,track:xt(M.face,r,o,l)*M.size,reveal:M.reveal,accent:M.accent,kept:M.kept}));let U={tokens:h,top:m+B,bottom:D+B};return nt[n]=U,U}function jt(t,i,e,r,s){let n=!1;t.toks.forEach((p,x)=>{let l=i.parts[x];l.dx+l.w>i.width*.4&&/[gjpqy,;]/.test(p.text)&&(n=!0)});let o=t.toks[0]?.size||0;return(n?.24*o+.15*e:.14*r)+s*e}var Rt=(t,i,e)=>{let r=o=>[1,3,5].map(p=>parseInt(o.slice(p,p+2),16)),s=r(t),n=r(i);return"rgb("+s.map((o,p)=>Math.round(o+(n[p]-o)*e)).join(",")+")"};function Et(t,i,e,r,s,n){let o=ut(t,i,r,s,n),p=r.W/1080,x=r.xh*r.H,[l,z,v,A]=t.e;return o.tokens.map((y,w)=>{if(e<y.reveal&&!y.kept)return null;let h=y.kept?1e6:e-y.reveal,H=0,I=0,O=0;if(l==="b"&&h<v){let c=Math.min(1,h/Math.max(1,v)),g=A==="c"?Math.pow(1-c,3):Math.pow(1-c,2);H=z*g*p,I=.35*Math.pow(1-c,2)}else l==="r"&&h<3&&(O=.4*x*Math.pow(1-h/3,3));let j=t.d?"#363636":"#FFFFFF";if(y.accent&&!t.d){let g=Math.max(1,Math.round(.45*r.fps)-3);j=h<3?y.accent:Rt(y.accent,"#FFFFFF",Math.min(1,(h-3)/g))}let G=W(y.face),u=y.base-y.size*(1+G.ascent-G.descent)/2+O,a=t.d?"none":"0 "+(1*p).toFixed(1)+"px "+(.3*x).toFixed(1)+"px rgba(0,0,0,0.30)"+(I>.004?", 0 0 "+(2*H).toFixed(1)+"px rgba(255,255,255,"+I.toFixed(3)+")":"");return Pt.createElement("div",{key:i+"-"+w,style:{position:"absolute",left:y.x,top:u,fontFamily:y.face.family,fontWeight:y.face.weight,fontStyle:y.face.style,fontSize:y.size,lineHeight:1,letterSpacing:y.track,whiteSpace:"pre",color:j,textShadow:a,filter:H>.05?"blur("+H.toFixed(2)+"px)":void 0,fontKerning:"normal"}},y.text)})}import at from"react";var Ut="#8A2636",Xt=t=>1-(1-t)*(1-t),qt=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2,Dt=t=>Math.max(0,Math.min(1,t));function Yt(t){let i=t.split(" ");if(i.length<2)return[t];let e=t.length/2,r=1,s=1/0;for(let n=1;n<i.length;n+=1){let o=i.slice(0,n).join(" ").length,p=Math.abs(o-e)-(/,$/.test(i[n-1])?t.length:0);p<s&&(s=p,r=n)}return[i.slice(0,r).join(" "),i.slice(r).join(" ")]}function gt(t,i,e){let r=i.W,s=i.H,n=t.cap*s,o=f=>{let k=f/W(e.roman).cap,F=k*W(e.roman).xh/W(e.serif).xh;return X(t.first+" ",e.roman)/100*k+X(t.last,e.serif)/100*F};o(n)>.62*r&&(n*=.62*r/o(n));let p=n/W(e.roman).cap,x=p*W(e.roman).xh/W(e.serif).xh,l=X(t.first+" ",e.roman)/100*p,z=X(t.last,e.serif)/100*x,v=.012*r,A=t.x*r,y=A+v+.0065*r,w=.95*r-.012*r-y,h=(f,k)=>X(f,e.sans)/100*k-f.length*.01*k,H=p*.68,I=[t.role];if(h(t.role,H)>w){let f=H*w/h(t.role,H);if(f>=p*.52)H=f;else{I=Yt(t.role);let k=Math.max(...I.map(F=>h(F,H)));k>w&&(H*=w/k)}}let O=Math.max(...I.map(f=>h(f,H))),j=t.y*s,G=j+n,u=I.map((f,k)=>G+H*1.18*(k+1)),a=Math.max(l+z,O),c=j-.08*n,g=u[u.length-1]+H*.28,b=Math.min(.95*r,y+a+.012*r);return{capPx:n,size1:p,size2:H,serifSize:x,w1a:l,barW:v,barX:A,textX:y,top:j,base1:G,bases:u,roles:I,blockTop:c,blockBottom:g,R:b}}function Tt(t,i,e,r){let s=e.W,n=e.fps/24,o=(i-t.a)/n,{capPx:p,size1:x,size2:l,serifSize:z,w1a:v,barW:A,barX:y,textX:w,top:h,base1:H,bases:I,roles:O,blockTop:j,blockBottom:G,R:u}=gt(t,e,r),a=y,c=u,g=!0;if(o<7){let T=Xt(Dt(o/7));a=u-(u-y)*(.35+.65*T)}else if(o<20){let T=qt(Dt((o-8)/12));c=u-(u-(y+A))*T,a=y-.02*s*T}else g=!1;let b=o<8?u:g?c:0,f=W(r.roman),k=W(r.sans),F=(T,C,m,D,S,B,P=0)=>at.createElement("div",{key:T,style:{position:"absolute",left:C,top:m-D*(1+W(S).ascent-W(S).descent)/2,fontFamily:S.family,fontWeight:S.weight,fontStyle:S.style,fontSize:D,lineHeight:1,letterSpacing:P,whiteSpace:"pre",color:"#FFFFFF"}},B);return at.createElement("div",{key:"nametag",style:{position:"absolute",inset:0}},at.createElement("div",{style:{position:"absolute",inset:0,clipPath:"inset(0 0 0 "+Math.max(0,b).toFixed(1)+"px)"}},F("n1",w,H,x,r.roman,t.first+" "),F("n2",w+v,H,z,r.serif,t.last),O.map((T,C)=>F("n"+(3+C),w,I[C],l,r.sans,T,-.01*l))),g?at.createElement("div",{style:{position:"absolute",left:a,width:Math.max(0,c-a),top:j,height:G-j,background:"linear-gradient(90deg, #962C39, #5E0A22)"}}):at.createElement("div",{style:{position:"absolute",left:y,width:A,top:h-.05*p,height:G-h-.1*p,background:Ut}}))}import E from"react";var Q=t=>Math.max(0,Math.min(1,t)),mt=t=>1-Math.pow(1-Q(t),3),dt="#0A1A3E",Y="#141414",Kt="#F4F2EA",Ht="#4C070E";function ft(t){let i=Math.sin(t*12.9898+78.233)*43758.5453;return i-Math.floor(i)}function bt(t,i,e,r){return E.createElement("svg",{key:t,width:"100%",height:"100%",style:{position:"absolute",inset:0,opacity:e,mixBlendMode:r}},E.createElement("filter",{id:t},E.createElement("feTurbulence",{type:"fractalNoise",baseFrequency:"0.9",numOctaves:2,seed:i,stitchTiles:"stitch"}),E.createElement("feColorMatrix",{type:"saturate",values:"0"})),E.createElement("rect",{width:"100%",height:"100%",filter:"url(#"+t+")"}))}function _t(t,i,e){let r=t.W*105/1080;return[E.createElement("div",{key:"bg",style:{position:"absolute",inset:0,background:"linear-gradient(180deg, #8F213E 0%, #6E1429 55%, #4E0617 100%)"}}),E.createElement("div",{key:"rad",style:{position:"absolute",inset:0,background:"radial-gradient(ellipse at 50% 46%, rgba(120,30,55,0.55) 0%, rgba(40,0,10,0) 55%, rgba(30,0,8,0.55) 100%)"}}),E.createElement("svg",{key:"grid",width:"100%",height:"100%",style:{position:"absolute",inset:0,opacity:.32}},E.createElement("defs",null,E.createElement("pattern",{id:"g"+i,width:r,height:r,patternUnits:"userSpaceOnUse"},E.createElement("path",{d:"M "+r+" 0 L 0 0 0 "+r,fill:"none",stroke:"#C0637F",strokeWidth:1.6}))),E.createElement("rect",{width:"100%",height:"100%",fill:"url(#g"+i+")"})),bt("n"+i,1+Math.floor(e/2)%7,.13,"overlay")]}function ct(t,i,e,r,s=!0){let n=t.W,o=t.H,p=n*.62-r,x=o*.3,l=[];for(let v=0;v<48;v+=1){let A=Math.PI*2*v/48;l.push("M "+p.toFixed(0)+" "+x.toFixed(0)+" L "+(p+Math.cos(A)*n*1.6).toFixed(0)+" "+(x+Math.sin(A)*n*1.6).toFixed(0))}let z=[];for(let v=0;v<7;v+=1){let A=n*(.12+v*.09),y=n*.18-r*.6,w=o*.86;z.push("M "+(y-A).toFixed(0)+" "+w.toFixed(0)+" A "+A.toFixed(0)+" "+(A*1.4).toFixed(0)+" 0 0 1 "+(y+A).toFixed(0)+" "+w.toFixed(0))}return[E.createElement("div",{key:"bg",style:{position:"absolute",inset:0,background:Kt}}),s?E.createElement("svg",{key:"eng",width:"100%",height:"100%",style:{position:"absolute",inset:0,opacity:.55}},E.createElement("path",{d:l.join(" "),stroke:"#E0DACB",strokeWidth:1.2,fill:"none"}),E.createElement("path",{d:z.join(" "),stroke:"#DCD5C3",strokeWidth:1.6,fill:"none"})):null,bt("n"+i,3+Math.floor(e/2)%5,.1,"multiply")]}function L(t){return X(t.text,t.face)/100*t.size+t.text.length*(t.track||0)*t.size}function R(t,i){return i/W(t).cap}function $(t,i){let e=L(t);return e>i?{...t,size:t.size*i/e}:t}function q(t,i,e,r,s={}){let n=W(i.face);return E.createElement("div",{key:t,style:{position:"absolute",left:e,top:r-i.size*(1+n.ascent-n.descent)/2,fontFamily:i.face.family,fontWeight:i.face.weight,fontStyle:i.face.style,fontSize:i.size,lineHeight:1,letterSpacing:(i.track||0)*i.size,whiteSpace:"pre",color:i.color,...s}},i.text)}function yt(t,i,e,r,s,n,o){let p=Math.max(1,Math.round(.35*o)),x=[],l=e;for(let z=0;z<i.text.length;z+=1){let v=i.text[z],A=X(v,i.face)/100*i.size+(i.track||0)*i.size,y=n+Math.floor(ft(z*7+t.length)*p),w=Q((s-y)/3);s>=n&&x.push(q(t+z,{...i,text:v,color:w>=1?i.color:$t("#B9B6AE",i.color,w)},l,r,{opacity:s>=y?1:0})),l+=A}return x}function $t(t,i,e){let r=o=>[1,3,5].map(p=>parseInt(o.slice(p,p+2),16)),s=r(t),n=r(i);return"rgb("+s.map((o,p)=>Math.round(o+(n[p]-o)*e)).join(",")+")"}var K=(t,i)=>t.items.filter(e=>!i||e.role===i);function Ct(t,i,e,r,s){let n=r.W,o=r.H,p=r.fps,x=p/24,l=e-t.a,z=Math.max(1,t.b-t.a),v=r.uid+"c"+i,A=W(s.sans),y=r.xh*o/A.xh,w=[],h=[],H=0,I={},O=0;if(t.kind==="keyword"&&t.palette==="cream"){w=ct(r,v,e,l/z*n*.05),H=.05;let u=K(t,"label")[0],a=K(t,"key")[0],c=a?$({text:a.text,face:s.serif,size:R(s.serif,.06*o),color:Y},.84*n):null,g=u?$({text:u.text,face:s.sans,size:R(s.sans,.022*o),color:Y,track:-.03},.8*n):null,b=.5*o+(c?W(s.serif).cap*c.size/2:0);g&&u&&e>=u.at&&h.push(q("kl",g,c?(n-L(c))/2+.01*n:(n-L(g))/2,b-(c?W(s.serif).cap*c.size:0)-.03*o)),c&&a&&e>=a.at&&h.push(...yt("kk",c,(n-L(c))/2,b,e,a.at,p))}else if(t.kind==="keyword"){w=_t(r,v,e),H=.05;let a=K(t,"key")[0];if(a){let c=$({text:a.text,face:s.sans,size:R(s.sans,.057*o),color:"#FFFFFF",track:-.03},.8*n),g=.49*o+W(s.sans).cap*c.size/2,b=(e-a.at)/x;if(b>=4){let f=Q((b-4)/6);h.push(q("k"+i,c,(n-L(c))/2,g,{opacity:.36+.64*f,filter:f<1?"blur("+((1-f)*4*(n/1080)).toFixed(2)+"px)":void 0,textShadow:"0 0 "+(.12*c.size).toFixed(1)+"px rgba(255,225,232,0.45)"}))}if(b>=3&&b<7)for(let f=0;f<7;f+=1)h.push(E.createElement("div",{key:"sp"+f,style:{position:"absolute",left:(n-L(c))/2+ft(f+3)*L(c),top:g-W(s.sans).xh*c.size*(.2+.8*ft(f+17)),width:5,height:5,borderRadius:3,background:"#FFF6F8",boxShadow:"0 0 12px 5px rgba(255,220,230,0.8)",opacity:1-Math.abs(b-5)/2}}))}}else if(t.kind==="chapter"){let u=Math.max(1,Math.round(.38*p)),a=mt(l/u),c=l>z-u?mt((l-(z-u))/u):0;I={transform:"translateX("+((1-a)*n-c*n).toFixed(1)+"px)"},w=ct(r,v,e,l/z*n*.06);let b={text:t.numeral||"I.",face:s.serif,size:R(s.serif,.03*o),color:dt};h.push(q("num",b,(n-L(b))/2,.455*o));let f=K(t,"title"),k=f.map(m=>m.text).join(" "),F=$({text:k,face:s.serif,size:R(s.serif,.035*o),color:dt,track:-.01},.82*n),T=(n-L(F))/2;f.forEach((m,D)=>{let S={...F,text:(D?" ":"")+m.text};e>=m.at&&h.push(q("t"+D,S,T,.5*o+W(s.serif).cap*F.size/2)),T+=L(S)});let C=.13*n;h.push(E.createElement("div",{key:"barin",style:{position:"absolute",left:-C,top:0,width:C,height:o,background:Ht,opacity:a<1?1:0}})),h.push(E.createElement("div",{key:"barout",style:{position:"absolute",left:n,top:0,width:C,height:o,background:Ht,opacity:c>0?1:0}}))}else if(t.kind==="number"){w=ct(r,v,e,0,!1),H=.06,O=4;let u=t.numeral||K(t,"key")[0]?.text||"",a=/^([^\\d]*)([\\d,.]+)(.*)$/.exec(u),c=K(t,"key")[0]?.at??t.a,g=u;if(a){let f=Number(a[2].replace(/,/g,"")),k=Math.round(12*x),F=Q((e-c)/k),T=f*mt(F),m=(/\\./.test(a[2])?1:0)?T.toFixed(1):/,/.test(a[2])?Math.round(T).toLocaleString("en-US"):String(Math.round(T));g=a[1]+m+a[3]}if(e>=c){let f=$({text:g,face:s.roman,size:R(s.roman,.11*o),color:Y},.82*n),k=$({text:u,face:s.roman,size:R(s.roman,.11*o),color:Y},.82*n);h.push(q("n",{...f,size:k.size},(n-L({...f,size:k.size}))/2,.47*o))}K(t,"label").forEach((f,k)=>{if(e<f.at)return;let F=$({text:f.text,face:s.sans,size:y*.95,color:Y,track:-.03},.8*n);h.push(q("l"+k,F,(n-L(F))/2,.56*o+k*1.15*F.size))})}else if(t.kind==="versus"){w=[E.createElement("div",{key:"bg",style:{position:"absolute",inset:0,background:"#FDFDFD"}}),bt("n"+v,5,.06,"multiply")],O=4;let u=K(t,"item")[0],a=K(t,"connector")[0],c=K(t,"item")[1];if(u){let g=$({text:u.text,face:s.sans,size:R(s.sans,.05*o),color:Y,track:-.035},.74*n);h.push(...yt("L",g,(n-L(g))/2,.45*o,e,u.at,p))}if(a&&e>=a.at){let g={text:a.text,face:s.serif,size:R(s.serif,.028*o),color:Y};h.push(q("C",g,(n-L(g))/2,.505*o))}if(c){let g=$({text:c.text,face:s.serif,size:R(s.serif,.05*o),color:Y},.74*n);h.push(...yt("R",g,(n-L(g))/2,.575*o,e,c.at,p))}}else if(t.kind==="list"){w=ct(r,v,e,l/z*n*.04),O=4;let u=K(t,"title")[0];if(u&&e>=u.at){let a=$({text:u.text,face:s.serif,size:R(s.serif,.032*o),color:dt},.8*n);h.push(q("ti",a,.12*n,.3*o))}K(t,"item").forEach((a,c)=>{if(e<a.at)return;let g=Math.max(0,1-(e-a.at)/(3*x))*.01*o,b={text:c+1+".",face:s.roman,size:R(s.roman,.03*o),color:dt},f=$({text:a.text,face:s.sans,size:R(s.sans,.03*o),color:Y,track:-.03},.7*n),k=.39*o+c*.075*o+g;h.push(q("in"+c,b,.12*n,k)),h.push(q("it"+c,f,.2*n,k))})}else if(t.kind==="bubbles"){w=[E.createElement("div",{key:"bg",style:{position:"absolute",inset:0,background:"#FFFFFF"}})],O=3;let u=.3*o,a=R(s.sans,.022*o),c=a*1.25,g=.03*n,b=.012*o,f=.68*n,k=t.items.filter(F=>F.role==="me"||F.role==="them");k.forEach((F,T)=>{let C=F.text.split(/\\s+/),m=[],D="";for(let d of C){let M=D?D+" "+d:d;L({text:M,face:s.sans,size:a,color:Y})>f-2*g&&D?(m.push(D),D=d):D=M}D&&m.push(D);let S=Math.max(...m.map(d=>L({text:d,face:s.sans,size:a,color:Y})))+2*g,B=m.length*c+2*b,P=F.role==="me",U=P?.92*n-S:.08*n;if(e>=F.at){let d=mt((e-F.at)/(4*x));h.push(E.createElement("div",{key:"b"+T,style:{position:"absolute",left:U,top:u,width:S,height:B,borderRadius:.025*o,background:P?"#0A84FF":"#E9E9EB",transform:"scale("+(.85+.15*d).toFixed(3)+")",transformOrigin:P?"100% 100%":"0% 100%",opacity:.4+.6*d}},m.map((M,N)=>E.createElement("div",{key:N,style:{position:"absolute",left:g,top:b+N*c,fontFamily:s.sans.family,fontWeight:500,fontSize:a,lineHeight:c+"px",whiteSpace:"pre",color:P?"#FFFFFF":"#111111"}},M)))),P&&T===k.length-1&&e>=F.at+6*x&&h.push(q("dl",{text:"Delivered",face:s.sans,size:a*.55,color:"#8E8E93"},.92*n-L({text:"Delivered",face:s.sans,size:a*.55,color:""}),u+B+a*.75))}u+=B+.012*o})}else if(t.kind==="quote"){w=ct(r,v,e,l/z*n*.03),H=.03,O=4;let u=m=>m.role==="key"?s.serif:s.sans,a=.042*o,c=t.items.map(m=>({it:m,t:{text:m.text,face:u(m),size:R(u(m),a),color:Y,track:m.role==="key"?0:-.03}})),g=X(" ",s.sans)/100*R(s.sans,a)*.9,b=m=>m.reduce((D,S)=>D+L(S.t),0)+g*Math.max(0,m.length-1),f=[c];if(b(c)>.82*n&&c.length>2){let m=1,D=1e9;for(let S=1;S<c.length;S+=1){let B=Math.max(b(c.slice(0,S)),b(c.slice(S)));B<D&&(D=B,m=S)}f=[c.slice(0,m),c.slice(m)]}let k=Math.max(...f.map(b)),F=k>.84*n?.84*n/k:1,T=a*F*1.75;f.forEach((m,D)=>{let S=(n-b(m)*F)/2,B=.5*o+(D-(f.length-1)/2)*T+a*F/2;m.forEach((P,U)=>{let d={...P.t,size:P.t.size*F};e>=P.it.at&&h.push(q("q"+D+"-"+U,d,S,B)),S+=L(d)+g*F})});let C={text:"\\u201C",face:s.roman,size:.16*o,color:"#E3DCCB"};h.unshift(q("qm",C,(n-L(C))/2,.5*o-T*.6))}if(t.kind==="window"){let u=t.aspect||1.7777777777777777,a=.78*n*(1-.04*Q(l/z)),c=a/u,g=(n-a)/2,b=.54*o-c/2,f=.03*o,k=[E.createElement("div",{key:"shadow",style:{position:"absolute",left:g,top:b-f,width:a,height:c+f,boxShadow:"0 12px 40px rgba(0,0,0,0.18)",borderRadius:10}}),E.createElement("div",{key:"bar",style:{position:"absolute",left:g,top:b-f,width:a,height:f,background:"#E8E9EC",borderTopLeftRadius:10,borderTopRightRadius:10,borderBottom:"1px solid #D5D7DB"}}),...["#FF5F57","#FEBC2E","#28C840"].map((S,B)=>E.createElement("div",{key:"dot"+B,style:{position:"absolute",left:g+.02*n+B*.028*n,top:b-f+f/2-.006*n,width:.012*n,height:.012*n,borderRadius:"50%",background:S}}))],F=R(s.sans,.032*o),T=t.items,C=X(" ",s.sans)/100*F*.9,m=[[]],D=0;for(let S of T){let B=L({text:S.text,face:s.sans,size:F,color:Y,track:-.03});D+B>.8*n&&m[m.length-1].length&&(m.push([]),D=0),m[m.length-1].push(S),D+=B+C}return m.forEach((S,B)=>{let P=S.map(M=>L({text:M.text,face:s.sans,size:F,color:Y,track:-.03})),U=(n-(P.reduce((M,N)=>M+N,0)+C*(S.length-1)))/2,d=b-f-.035*o-(m.length-1-B)*F*1.22;S.forEach((M,N)=>{e>=M.at&&h.push(q("w"+B+"-"+N,{text:M.text,face:s.sans,size:F,color:Y,track:-.03},U,d)),U+=P[N]+C})}),E.createElement("div",{key:"card"+i,style:{position:"absolute",inset:0}},k,h)}if(t.kind==="search"){w=[E.createElement("div",{key:"bg",style:{position:"absolute",inset:0,background:"#FFFFFF"}})],O=3;let u=t.items.map(D=>D.text).join(" "),a=t.items[0]?.at??t.a,c=Math.max(0,Math.min(u.length,Math.floor((e-a)*1.6/x))),g=.84*n,b=.062*o,f=(n-g)/2,k=.4*o,F=R(s.sans,.022*o);h.push(E.createElement("div",{key:"box",style:{position:"absolute",left:f,top:k,width:g,height:b,borderRadius:b/2,border:"2px solid #DADCE0",boxShadow:"0 2px 10px rgba(32,33,36,0.16)",background:"#FFFFFF"}}));let T=b*.17;h.push(E.createElement("div",{key:"lens",style:{position:"absolute",left:f+b*.42,top:k+b/2-T-2,width:2*T,height:2*T,borderRadius:"50%",border:"3px solid #9AA0A6"}})),h.push(E.createElement("div",{key:"handle",style:{position:"absolute",left:f+b*.42+1.6*T,top:k+b/2+.6*T,width:T*.9,height:3,background:"#9AA0A6",transform:"rotate(45deg)",transformOrigin:"0 50%"}}));let C={text:u.slice(0,c),face:s.sans,size:F,color:"#202124",track:-.01},m=f+b*1.05;if(h.push(q("typed",C,m,k+b/2+W(s.sans).xh*F/2)),(Math.floor(e/(12*x))%2===0||c<u.length)&&h.push(E.createElement("div",{key:"cursor",style:{position:"absolute",left:m+L(C)+3,top:k+b*.25,width:2,height:b*.5,background:"#1A73E8"}})),c>=u.length){let D=Q((e-a-u.length/1.6*x)/(6*x));for(let S=0;S<3;S+=1)h.push(E.createElement("div",{key:"sg"+S,style:{position:"absolute",left:f+b*1.05,top:k+b*1.35+S*b*.75,width:g*(.62-S*.12),height:b*.2,borderRadius:6,background:"#E8EAED",opacity:D}}))}}if(t.kind==="document"){w=[E.createElement("div",{key:"bg",style:{position:"absolute",inset:0,background:"#E9E8E4"}}),bt("n"+v,4,.06,"multiply")],O=4;let u=K(t,"item")[0],a=K(t,"label")[0],c=.08*n,g=.84*n,b=.16*o,f=.72*o;h.push(E.createElement("div",{key:"page",style:{position:"absolute",left:c,top:b,width:g,height:f,background:"#FFFFFF",boxShadow:"0 10px 40px rgba(0,0,0,0.15)"}})),a&&h.push(q("lab",{text:a.text.toUpperCase(),face:s.sans,size:R(s.sans,.012*o),color:"#8A8A8A",track:.08},c+.06*n,b+.06*o));let k=(F,T,C)=>{for(let m=0;m<T;m+=1)h.push(E.createElement("div",{key:"bar"+C+m,style:{position:"absolute",left:c+.06*n,top:F+m*.022*o,width:g*(.72+.16*ft(C+m))-.12*n,height:.008*o,background:"#E3E3E3",borderRadius:3}}))};if(k(b+.09*o,9,11),u){let F=R(s.roman,.024*o),T=u.text.replace(/["\u201C\u201D]/g,"").split(/\\s+/),C=[],m="";for(let P of T){let U=m?m+" "+P:P;L({text:U,face:s.roman,size:F,color:Y})>g-.12*n&&m?(C.push(m),m=P):m=U}m&&C.push(m);let D=b+.33*o,S=F*1.5,B=Q((e-u.at)/Math.max(1,.45*p));C.forEach((P,U)=>{let d={text:P,face:s.roman,size:F,color:Y},M=L(d),N=Q(B*C.length-U);h.push(E.createElement("div",{key:"hl"+U,style:{position:"absolute",left:c+.055*n,top:D+U*S-F*.78,width:M*N+.01*n,height:F*1.05,background:"#F7E26B",opacity:N>0?.9:0}})),h.push(q("cl"+U,d,c+.06*n,D+U*S))}),k(D+C.length*S+.02*o,8,31),H=.12}}let j=1+H*Q(l/z),G=O?1-Q(l/(O*x)):0;return E.createElement("div",{key:"card"+i,style:{position:"absolute",inset:0,overflow:"hidden",...I}},w,E.createElement("div",{style:{position:"absolute",inset:0,transform:"scale("+j.toFixed(4)+")",transformOrigin:"50% 49%"}},h),G>0?E.createElement("div",{style:{position:"absolute",inset:0,background:"#FFFFFF",opacity:G}}):null)}var Bt="Editorial Sans",lt={},Ft="Editorial Serif",Lt="Editorial Roman",It="Editorial Light";function Zt(t){let i=[[Bt,t?.sans||"","500","normal"],[Ft,t?.serif||"","400","italic"],[Lt,t?.roman||"","400","normal"],[It,t?.light||"","400","italic"]],e=i.some(o=>o[1]),[r,s]=Wt(!e),[n]=Wt(()=>e?Vt("caption fonts"):null);return Nt(()=>{if(r)return;let o=!1,p=()=>{if(!o){o=!0,wt(),St();for(let z of Object.keys(lt))delete lt[z];s(!0)}},x=([z,v,A,y])=>{if(!v)return Promise.resolve();try{return new window.FontFace(z,"url(data:font/woff2;base64,"+v+")",{weight:A,style:y}).load().then(h=>document.fonts.add(h)).catch(()=>{})}catch{return Promise.resolve()}};Promise.all(i.map(x)).then(p,p);let l=setTimeout(p,4e3);return()=>clearTimeout(l)},[r]),Nt(()=>{r&&n!=null&&Jt(n)},[r,n]),r}function te({data:t}){let i=Qt(),e=t||{W:1080,H:1920,fps:24,uid:"g",xh:.029,units:[]},r=Zt(e.fonts),s={sans:{family:(e.fonts?.sans?'"'+Bt+'", ':"")+'"Inter Display", "Helvetica Neue", Helvetica, Arial, sans-serif',weight:500,style:"normal",estimate:.52},serif:{family:(e.fonts?.serif?'"'+Ft+'", ':"")+'"Playfair Display", Didot, "Times New Roman", serif',weight:400,style:"italic",estimate:.45},roman:{family:(e.fonts?.roman?'"'+Lt+'", ':"")+'"Playfair Display", Didot, "Times New Roman", serif',weight:400,style:"normal",estimate:.5},light:{family:(e.fonts?.light?'"'+It+'", ':e.fonts?.serif?'"'+Ft+'", ':"")+'"Playfair Display", Didot, "Times New Roman", serif',weight:400,style:"italic",estimate:.45}};if(!r)return null;let n=e.units||[],o=l=>1,p=n.map((l,z)=>({u:l,k:z})).filter(({u:l})=>i>=l.a&&i<l.b),x=(e.quoteBlocks||[]).find(l=>i>=l[0]&&i<l[1]);return Z.createElement("div",{style:{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none"}},(e.cards||[]).filter(l=>i>=l.a&&i<l.b).map((l,z)=>Ct(l,z,i,e,s)),e.nameTag&&i>=e.nameTag.a&&i<At(e,s).b?Tt(At(e,s),i,e,s):null,e.title&&i>=e.title.a&&i<e.title.b?ne(e.title,i,e,s):null,x&&p.length?ee(ut(p[0].u,p[0].k,e,s,o(p[0].k)).top,e,s):null,p.map(({u:l,k:z})=>Z.createElement(Z.Fragment,{key:z},Et(l,z,i,e,s,o(z)))),e.mark?Z.createElement("img",{src:e.mark.src,style:{position:"absolute",left:.724*e.W,top:.043*e.H,width:.199*e.W,height:.052*e.H,objectFit:"contain",objectPosition:"right center",opacity:e.mark.opacity}}):null)}function ee(t,i,e){let r=i.H,s=W(e.roman),n=.023*r/.27,o=t-.006*r+.44*n;return Z.createElement("div",{style:{position:"absolute",left:0,width:i.W,top:o-n*(1+s.ascent-s.descent)/2,textAlign:"center",fontFamily:e.roman.family,fontWeight:400,fontSize:n,lineHeight:1,color:"#FFFFFF",textShadow:"0 1px "+(.3*i.xh*r).toFixed(1)+"px rgba(0,0,0,0.30)"}},"\\u201C")}function At(t,i){let e=t.nameTag,r=t.uid;if(lt[r])return lt[r];let s=0,n=e.b,o=gt(e,t,i),p=Math.max(.1*t.H,o.blockBottom-o.top+.01*t.H),x=Math.min(.82,(.92*t.H-p)/t.H),l=(t.units||[]).map((v,A)=>({u:v,k:A})).filter(({u:v})=>v.b>e.a&&v.a<e.b);for(let{u:v,k:A}of l){let y=ut(v,A,t,i,1),w=Math.min(x*t.H,Math.max(e.y*t.H,s+.03*t.H));if(v.a>e.a+1.3*t.fps&&y.bottom+.02*t.H>w&&y.top<w+p){n=v.a;break}s=Math.max(s,y.bottom)}let z=Math.min(x,Math.max(e.y,s/t.H+.03));return lt[r]={...e,y:z,b:n}}function ne(t,i,e,r){let s=e.H,n=e.W,o=r.light,p=W(o),x=.034*s/p.cap,l=.018*n,z=x*1.32,v=.08*n,A=X(" ",o)/100*x,y=Math.max(...t.words.map(h=>h.line))+1,w=[];for(let h=0;h<y;h+=1){let H=t.words.filter(a=>a.line===h),I="",O=!1;for(let a of H){if(i<a.at)break;let c=Math.min(a.text.length,1+Math.floor((i-a.at)*2/Math.max(1,e.fps/24)));I+=(I?" ":"")+a.text.slice(0,c),c<a.text.length&&(O=!0)}if(!I)continue;let j=H.every(a=>i>=a.at)&&!O,G=X(I,o)/100*x,u=j?0:A*2;w.push(Z.createElement("div",{key:"tp"+h,style:{position:"absolute",left:v,top:.6*s+h*z,width:G+2*l+u,height:z,background:"#FFFFFF"}},Z.createElement("div",{style:{position:"absolute",left:l,top:z/2+p.cap*x/2-x*(1+p.ascent-p.descent)/2,fontFamily:o.family,fontStyle:o.style,fontWeight:o.weight,fontSize:x,lineHeight:1,whiteSpace:"pre",color:"#111111"}},I)))}return Z.createElement(Z.Fragment,{key:"title"},w)}export{te as default};
`;

// plugins/a16z-style-captions/src/pipeline/apply.ts
var LOOK_LABEL = "a16z Vertical Frame";
var GRAPHIC_LABEL = "a16z Captions";
async function createShort(sdk, pid, sid, baseName, ranges, frames, fps) {
  const plan = frames.map((c) => ({ start: c.start, end: c.end, sw: c.sw, sh: c.sh, shots: c.shots, open: c.open || null }));
  const r = await script(
    sdk,
    "Create the 9:16 Short",
    `const p = selects.project(${J(pid)});
const src = selects.draft(${J(sid)});
const taken: string[] = [];
for (const id of ((await p.meta()) as any).draftIds || []) { try { taken.push((await selects.draft(id).meta()).name); } catch {} }
let name = ${J(baseName)};
for (let k = 2; taken.includes(name); k += 1) name = ${J(baseName)} + " (" + k + ")";
const d = await p.createDraft({ name });
for (const [s, e] of ${J(ranges)} as [number, number][]) await d.insert({ source: await src.rangeAtFrames(s, e), tracks: "main" });
await d.setFrameSize({ width: ${W}, height: ${H} });
const PLAN: any[] = ${J(plan)};
const LOOK = ${J(lookCode)};
const mains = async () => (await d.clips({ trackScope: "main" })).filter((c: any) => c.trackKind === "main" && c.resourceId != null);
const stretch = (sw: number, sh: number) => { const k = Math.min(${W} / sw, ${H} / sh); return { x: ${W} / (sw * k), y: ${H} / (sh * k) }; };
const ids: number[] = [];
const missing: number[] = [];
for (const m of PLAN) {
  const all = await mains();
  const clip: any = all.find((c: any) => c.startFrame === m.start) || all.find((c: any) => c.startFrame <= m.start && c.endFrame > m.start);
  if (!clip) { missing.push(m.start); ids.push(-1); continue; }
  ids.push(clip.clipId);
  await d.setClipTransform({ clip, scale: stretch(m.sw, m.sh), position: { x: 0, y: 0 }, rotation: 0 });
}
for (let k = 0; k < PLAN.length; k += 1) {
  if (ids[k] < 0) continue;
  const m = PLAN[k];
  const clip: any = (await mains()).find((c: any) => c.clipId === ids[k]);
  if (!clip) continue;
  await d.addVideoEffect({ clip, label: ${J(LOOK_LABEL)}, tsxCode: LOOK, parameters: { W: ${W}, H: ${H}, fps: ${J(fps)}, sw: m.sw, sh: m.sh, start: clip.startFrame, shots: m.shots, open: m.open }, editableParameters: [] });
}
const saved = await d.commitAll("a16z Style Captions: new 9:16 Short");
if (!saved.createdDraftId) throw new Error("The Short was not created.");
return { id: saved.createdDraftId, name, missing };`,
    true
  );
  if (!r?.id) throw new Error("The Short was not created.");
  return { id: r.id, name: r.name };
}
async function importFiles(sdk, pid, paths) {
  return script(
    sdk,
    "Add the Short's media to the Project",
    `const p = selects.project(${J(pid)});
const paths: string[] = ${J(paths)};
${LIST_FILES}
// a rebuild reuses files the Project already has
const have = await listFiles(p);
const missing = paths.filter((path) => !have.some((x: any) => x.path === path));
const added = missing.length ? (await p.importFiles({ paths: missing })).addedResourceIds : [];
const files = missing.length ? await listFiles(p) : have;
return paths.map((path) => {
  const f = files.find((x: any) => x.path === path);
  // a single new file is the one resource the import added, even before the listing shows it
  const id = f ? f.resourceId : missing.length === 1 && added.length === 1 && missing[0] === path ? added[0] : null;
  return { id, path };
});`,
    true
  );
}
async function finishShort(sdk, rid, pid, endFrame, data, music, voiceDb, inserts = [], fps = 24, relook = null) {
  const frames = relook ? relook.clips.map((c) => ({ start: c.start, sw: c.sw, sh: c.sh, shots: c.shots, open: c.open || null })) : [];
  return script(
    sdk,
    "Add B-roll, captions, graphics and music",
    `const d = selects.draft(${J(rid)});
const p = selects.project(${J(pid)});
const INS: any[] = ${J(inserts)};
const LOOK = ${J(inserts.length || relook ? lookCode : "")};
// the Main clips' frame effect again, with this build's window cards
const FRAMES: any[] = ${J(frames)};
const WINDOWS: any[] = ${J(relook ? relook.windows : [])};
for (const m of FRAMES) {
  const clip: any = (await d.clips({ trackScope: "main" })).find((c: any) => c.trackKind === "main" && c.startFrame === m.start);
  if (!clip) continue;
  for (const e of await d.videoEffects(clip)) if (e.name === ${J(LOOK_LABEL)}) await d.removeVideoEffect(e);
  const again: any = (await d.clips({ trackScope: "main" })).find((c: any) => c.clipId === clip.clipId);
  await d.addVideoEffect({ clip: again, label: ${J(LOOK_LABEL)}, tsxCode: LOOK, parameters: { W: ${W}, H: ${H}, fps: ${J(fps)}, sw: m.sw, sh: m.sh, start: again.startFrame, shots: m.shots, open: m.open, windows: WINDOWS }, editableParameters: [] });
}
const stretch = (sw: number, sh: number) => { const k = Math.min(${W} / sw, ${H} / sh); return { x: ${W} / (sw * k), y: ${H} / (sh * k) }; };
let placed = 0;
const skipped: number[] = [];
for (const b of INS) {
  // one clip that will not place must not stop the captions
  try { await d.overlayResource({ resource: p.resource(b.id), over: await d.rangeAtFrames(b.a, b.b), sourceStartSeconds: 0 }); } catch { skipped.push(b.a); continue; }
  const all = await d.clips({ trackScope: "all" });
  const video: any = all.filter((c: any) => c.trackKind === "video" && c.resourceId === b.id && c.startFrame === b.a)[0];
  if (!video) continue;
  const audio = all.filter((c: any) => c.trackKind === "audio" && c.resourceId === b.id && c.startFrame === b.a);
  if (audio.length) await d.removeClips(audio);
  const v1: any = (await d.clips({ trackScope: "all" })).find((c: any) => c.clipId === video.clipId);
  await d.setClipTransform({ clip: v1, scale: stretch(b.sw, b.sh), position: { x: 0, y: 0 }, rotation: 0 });
  const v2: any = (await d.clips({ trackScope: "all" })).find((c: any) => c.clipId === video.clipId);
  await d.addVideoEffect({ clip: v2, label: ${J(LOOK_LABEL)}, tsxCode: LOOK, parameters: { W: ${W}, H: ${H}, fps: ${J(fps)}, sw: b.sw, sh: b.sh, start: b.a, end: b.b, push: b.push, grade: "saturate(0.8) contrast(1.05) brightness(0.97) sepia(0.07)", shots: [{ from: b.a, to: b.b, ...b.rect }] }, editableParameters: [] });
  placed += 1;
}
const g = await d.addMotionGraphic({ label: ${J(GRAPHIC_LABEL)}, tsxCode: ${J(graphicCode)}, parameters: ${J(data)}, editableParameters: [], within: await d.rangeAtFrames(0, ${endFrame}) });
const music: any = ${J(music)};
let bed: any = null;
if (music && music.id) {
  bed = await d.overlayResource({ resource: p.resource(music.id), over: await d.rangeAtFrames(0, ${endFrame}) });
  const clips = (await d.clips({ trackScope: "all" })).filter((c: any) => c.resourceId === music.id);
  for (const c of clips) { const cur: any = (await d.clips({ trackScope: "all" })).find((x: any) => x.clipId === c.clipId); if (cur) await d.setClipAudio({ clip: cur, volumeDb: music.db }); }
}
const voice: number = ${J(voiceDb)};
if (voice) for (const id of (await d.clips({ trackScope: "main" })).filter((c: any) => c.trackKind === "main" && c.resourceId != null).map((c: any) => c.clipId)) {
  const clip: any = (await d.clips({ trackScope: "main" })).find((c: any) => c.clipId === id);
  if (clip) await d.setClipAudio({ clip, volumeDb: voice });
}
const saved = await d.commitAll("a16z Style Captions: B-roll, captions, graphics and music");
return { commitId: saved.commitId, graphic: g.clipId, music: bed ? bed.inserted : 0, placed, skipped };`,
    true
  );
}
async function stripShort(sdk, rid, resourceIds) {
  return script(
    sdk,
    "Clear the previous captions and music",
    `const d = selects.draft(${J(rid)});
const ids: string[] = ${J(resourceIds.filter(Boolean))};
const graphics = (await d.motionGraphics()).filter((g: any) => g.name === ${J(GRAPHIC_LABEL)});
for (const g of graphics) { const cur = (await d.motionGraphics()).find((x: any) => x.clip.clipId === g.clip.clipId); if (cur) await d.removeClips(cur.clip); }
const extra = (await d.clips({ trackScope: "all" })).filter((c: any) => c.resourceId != null && ids.includes(c.resourceId) && c.trackKind !== "main");
if (extra.length) await d.removeClips(extra);
let reset = 0;
for (const id of (await d.clips({ trackScope: "main" })).filter((c: any) => c.trackKind === "main" && c.resourceId != null).map((c: any) => c.clipId)) {
  const clip: any = (await d.clips({ trackScope: "main" })).find((c: any) => c.clipId === id);
  if (clip) { const r: any = await d.setClipAudio({ clip, volumeDb: 0 }); if (r.diff && r.diff.opCount) reset += 1; }
}
if (!graphics.length && !extra.length && !reset) return { graphics: 0, clips: 0, commitId: null };
const saved = await d.commitAll("a16z Style Captions: clear for rebuild");
return { graphics: graphics.length, clips: extra.length, commitId: saved.commitId };`,
    true
  );
}

// plugins/a16z-style-captions/src/captions/tokens.ts
var SMALL = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90
};
var SCALE = { hundred: 100, thousand: 1e3, million: 1e6, billion: 1e9 };
var COMPARATIVE = /^(better|faster|more|bigger|less|cheaper|larger|smaller|higher|lower|greater|easier|harder|stronger)$/;
var tail = (t) => (t.match(/[.,!?;:"”’)]+$/) || [""])[0];
var bare = (t) => norm(t).replace(/'/g, "'");
function spelled(ws, k) {
  let total = 0;
  let cur = 0;
  let used = 0;
  let any = false;
  for (let j = k; j < ws.length && j < k + 6; j += 1) {
    const w = bare(ws[j].t);
    if (j > k && /[.,!?;:]$/.test(ws[j - 1].t)) break;
    if (w === "a" && j === k && j + 1 < ws.length && SCALE[bare(ws[j + 1].t)]) {
      cur = 1;
      used += 1;
      continue;
    }
    if (w === "and" && any && j + 1 < ws.length && SMALL[bare(ws[j + 1].t)] != null && cur >= 100) {
      used += 1;
      continue;
    }
    if (SMALL[w] != null) {
      cur += SMALL[w];
      any = true;
      used += 1;
      continue;
    }
    if (SCALE[w]) {
      cur = Math.max(1, cur) * SCALE[w];
      if (SCALE[w] >= 1e3) {
        total += cur;
        cur = 0;
      }
      any = true;
      used += 1;
      continue;
    }
    break;
  }
  if (!any) return null;
  return { value: total + cur, used };
}
var fmt = (v) => v >= 1e4 ? v.toLocaleString("en-US") : String(v);
function makeTokens(words2, tags = {}) {
  const out = [];
  for (let k = 0; k < words2.length; k += 1) {
    const w = words2[k];
    const n = bare(w.t);
    if (out.length && /^-\w/.test(w.t)) {
      const p = out[out.length - 1];
      p.t += w.t;
      p.src.push(w.i);
      p.e = w.e;
      continue;
    }
    if (FILLER.test(n)) {
      out.push({ t: w.t, src: [w.i], s: w.s, e: w.e, drop: "filler" });
      continue;
    }
    const num = isNumberWord(w.t) || n === "a" && k + 1 < words2.length && SCALE[bare(words2[k + 1].t)] ? spelled(words2, k) : null;
    if (num && num.used > 0) {
      const last = words2[k + num.used - 1];
      const next2 = words2[k + num.used];
      const nn2 = next2 ? bare(next2.t) : "";
      const money = /^(dollars?|bucks|pounds|euros)$/.test(nn2);
      let text = "";
      let used = num.used;
      if (!money && nn2 === "percent" && !/[.,!?;:]$/.test(last.t)) {
        text = fmt(num.value) + "%" + tail(next2.t);
        used += 1;
      } else if (!money && nn2 === "times" && !/[.,!?;:]$/.test(last.t)) {
        const after2 = words2[k + num.used + 1];
        if (!after2 || COMPARATIVE.test(bare(after2.t)) || /[.,!?;:]$/.test(next2.t) || DET.has(bare(after2.t))) {
          text = fmt(num.value) + "x" + tail(next2.t);
          used += 1;
        }
      }
      if (!text && !money && (num.value > 10 || num.used > 1)) text = fmt(num.value) + tail(last.t);
      if (text) {
        const src = words2.slice(k, k + used).map((x) => x.i);
        out.push({ t: text, src, s: w.s, e: words2[k + used - 1].e });
        k += used - 1;
        continue;
      }
    }
    const next = words2[k + 1];
    const nn = next ? bare(next.t) : "";
    const after = words2[k + 2];
    const noBreak = !/[.,!?;:]$/.test(w.t);
    if (n === "because") {
      out.push({ t: "cause" + tail(w.t), src: [w.i], s: w.s, e: w.e });
      continue;
    }
    if (noBreak && n === "going" && nn === "to" && after && wordClass(after.t) === "CONT" && !/ing$/.test(bare(after.t))) {
      out.push({ t: "gonna" + tail(next.t), src: [w.i, next.i], s: w.s, e: next.e });
      k += 1;
      continue;
    }
    if (noBreak && n === "want" && nn === "to" && after && wordClass(after.t) === "CONT") {
      out.push({ t: "wanna" + tail(next.t), src: [w.i, next.i], s: w.s, e: next.e });
      k += 1;
      continue;
    }
    if (noBreak && n === "you" && nn === "know" && k > 0 && (/,$/.test(next.t) || hedgeYouKnow(words2, k, tags))) {
      out.push({ t: "yknow,", src: [w.i, next.i], s: w.s, e: next.e });
      k += 1;
      continue;
    }
    out.push({ t: w.t, src: [w.i], s: w.s, e: w.e });
  }
  applyDrops(out, words2, tags);
  return out;
}
function hedgeYouKnow(words2, k, tags) {
  return (tags.hedges || []).some((h) => h.action === "keep" && (h.i === words2[k].i || h.i === words2[k + 1].i));
}
var inSpan = (i, sp) => i >= sp[0] && i <= sp[1];
function applyDrops(toks2, words2, tags) {
  const has2 = (t, spans) => !!spans && t.src.some((i) => spans.some((sp) => inSpan(i, sp)));
  const dropSpans = [...tags.drops || [], ...tags.abandoned || []];
  const stutters = (tags.repetitions || []).filter((r) => r.kind === "stutter").map((r) => r.span);
  const hedgeDrop = new Set((tags.hedges || []).filter((h) => h.action === "drop").map((h) => h.i));
  const hedgeKeep = new Set((tags.hedges || []).filter((h) => h.action === "keep").map((h) => h.i));
  for (let k = 0; k < toks2.length; k += 1) {
    const t = toks2[k];
    if (t.drop) continue;
    if (has2(t, dropSpans)) {
      t.drop = "semantic";
      continue;
    }
    const n = bare(t.t);
    const prev = toks2[k - 1];
    const next = toks2[k + 1];
    if (next && !next.drop && bare(next.t) === n && next.s - t.e < 0.35 && (has2(t, stutters) || !tags.repetitions && wordClass(t.t) !== "CONT")) {
      t.drop = "stutter";
      continue;
    }
    if (n === "like" && !hedgeKeep.has(t.src[0])) {
      const p = prev ? bare(prev.t) : "";
      if (hedgeDrop.has(t.src[0]) || (AUX.has(p) || p === "to" || p === "be") && !/,$/.test(t.t) && next && wordClass(next.t) !== "DET" && !/[.,]$/.test(prev?.t || "")) {
        t.drop = "hedge";
        continue;
      }
    }
  }
  let run2 = [];
  const flush = () => {
    if (run2.length >= 3) for (const k of run2.slice(1, -1)) toks2[k].drop = "interjection";
    run2 = [];
  };
  for (let k = 0; k < toks2.length; k += 1) {
    const n = bare(toks2[k].t);
    if (!toks2[k].drop && /^(hey|oh|okay|ok|wow|look|yeah|no|well|right)$/.test(n) && /,$/.test(toks2[k].t)) run2.push(k);
    else flush();
  }
  flush();
  for (let k = 0; k + 2 < toks2.length; k += 1) {
    const a = toks2[k];
    if (a.drop || !/,$/.test(a.t)) continue;
    let j = k + 1;
    while (j < toks2.length && toks2[j].drop && toks2[j].drop !== "card" && toks2[j].drop !== "filler") j += 1;
    if (j > k + 1 && j < toks2.length && /,$/.test(toks2[j - 1].t)) a.t = a.t.replace(/,$/, "");
  }
  void PRON;
  void words2;
}

// plugins/a16z-style-captions/src/captions/segment.ts
var sentenceEnd = (t) => /[.?!]["”’)]*$/.test(t);
var hardPunct = (t) => /[.?!;:]["”’)]*$/.test(t);
var comma = (t) => /,["”’)]*$/.test(t);
var inSpan2 = (i, sp) => i >= sp[0] && i <= sp[1];
function span(ws) {
  if (!ws.length) return 0;
  let tot = 0;
  for (let k = 0; k + 1 < ws.length; k += 1) tot += Math.min(Math.max(0, ws[k + 1].s - ws[k].s), 0.5);
  return tot + Math.min(Math.max(0, ws[ws.length - 1].e - ws[ws.length - 1].s), 0.35);
}
function gapBetween(a, b, words2, byIndex) {
  const ia = byIndex.get(a.src[a.src.length - 1]);
  const ib = byIndex.get(b.src[0]);
  if (ia == null || ib == null || ib <= ia) return Math.max(0, b.s - a.e);
  let g = 0;
  for (let k = ia; k < ib; k += 1) g = Math.max(g, words2[k + 1].s - words2[k].e);
  return g;
}
function phrases(all, words2, tags, cuts) {
  const byIndex = /* @__PURE__ */ new Map();
  words2.forEach((w, k) => byIndex.set(w.i, k));
  const openers = new Set(tags.openers || []);
  const quotativeEnds = new Set((tags.quotatives || []).map((q2) => q2[1]));
  const out = [];
  let cur = [];
  const close = () => {
    if (cur.length) out.push({ toks: cur, sentenceEnd: sentenceEnd(cur[cur.length - 1].t) });
    cur = [];
  };
  for (let k = 0; k + 2 < all.length; k += 1) {
    const a = all[k];
    const c = all[k + 1];
    const b = all[k + 2];
    if (!a.drop && !b.drop && norm(c.t) === "and" && norm(a.t) === norm(b.t) && wordClass(a.t) === "CONT" && a.t.length > 2) c.drop = "repeat-and";
  }
  let prev = null;
  let droppedSince = false;
  for (let k = 0; k < all.length; k += 1) {
    const t = all[k];
    if (t.drop) {
      if (t.drop === "card") droppedSince = true;
      continue;
    }
    if (prev) {
      let hard = hardPunct(prev.t) || droppedSince;
      if (!hard && gapBetween(prev, t, words2, byIndex) >= 0.1 - 1e-9) hard = true;
      if (!hard && comma(prev.t)) {
        hard = true;
        const n = norm(prev.t);
        const opener = (openers.has(prev.src[0]) || OPENER.has(n)) && cur.length === 1 && !COMMA_BREAKERS.has(n) && !quotativeEnds.has(prev.src[prev.src.length - 1]);
        if (opener) hard = false;
      }
      if (!hard && norm(prev.t) === norm(t.t) && wordClass(t.t) === "CONT") hard = true;
      if (!hard && (/^yknow/.test(norm(t.t)) || /^yknow/.test(norm(prev.t)))) hard = true;
      if (!hard && cur.length === 1 && /^(but|so)$/.test(norm(prev.t)) && cuts.some((c) => Math.abs(c - prev.s) <= 0.1)) hard = true;
      if (hard) close();
    }
    cur.push(t);
    prev = t;
    droppedSince = false;
  }
  close();
  return out;
}
function isHedgeLike(ws, j, ctx) {
  if (norm(ws[j].t) !== "like") return false;
  if (ctx.hedgeKeep.has(ws[j].src[0])) return true;
  const p = j > 0 ? norm(ws[j - 1].t) : "";
  const nx = j + 1 < ws.length ? norm(ws[j + 1].t) : "";
  if (/^(was|were|is|it's|he's|she's|feel|feels|felt|look|looks|looked|would|i|you|we|they|he|she|don't|didn't|i'd|something|be|just)$/.test(p)) return false;
  if (wordClass(nx) === "DET") return false;
  return /,$/.test(ws[j].t) || isNumberWord(nx);
}
function breakScore(ws, i, ctx) {
  const a = ws[i - 1];
  const b = ws[i];
  const ca = wordClass(a.t);
  const cb = wordClass(b.t);
  const na = norm(a.t);
  const nb = norm(b.t);
  let s = pairScore(ca, cb);
  if (isHedgeLike(ws, i, ctx)) s -= 2;
  if (isHedgeLike(ws, i - 1, ctx)) s += 2.5;
  if (nb === "or" && isNumberWord(a.t) && i + 1 < ws.length && isNumberWord(ws[i + 1].t)) s -= 3;
  if (isNumberWord(a.t) && cb === "CONT" && !isNumberWord(b.t) && !/[.,!?;:]$/.test(a.t)) s -= 2;
  if (na === "or" && isNumberWord(b.t) && i >= 2 && isNumberWord(ws[i - 2].t)) s -= 3;
  const particle = ctx.particles.has(b.src[0]) || ca === "CONT" && PHRASAL_VERB.has(na) && PARTICLE.has(nb);
  if (particle) s -= 2;
  if (i >= 2 && (ctx.particles.has(a.src[0]) || PHRASAL_VERB.has(norm(ws[i - 2].t)) && PARTICLE.has(na)) && cb === "DET") s = Math.max(s, -0.6);
  if ((nb === "to" || nb === "from") && ws.slice(0, i).some((x) => norm(x.t) === "from")) s += 2.5;
  if (ctx.compounds.some((sp) => inSpan2(a.src[a.src.length - 1], sp) && inSpan2(b.src[0], sp))) s -= 3;
  if ((ctx.tags.keyTerms || []).some((k) => k.span[1] - k.span[0] <= 2 && inSpan2(a.src[a.src.length - 1], k.span) && inSpan2(b.src[0], k.span))) s -= 3;
  const f = ctx.forced.get(b.src[0]);
  if (f) s += f;
  void CONJ;
  return s;
}
function unitsFor(n, sp, rate, style) {
  if (n <= 4 && sp <= 1.6) return 1;
  if (n === 5 && sp <= 0.8) return 1;
  const DIVW = 1.1 * style.TW;
  const DIVS = 0.214 * style.TW;
  void rate;
  return Math.min(n, Math.max(2, Math.round((n / DIVW + sp / DIVS) / 2)));
}
function split(ws, ctx, rate, whole) {
  const n = ws.length;
  const sp = span(ws);
  if (whole) return [ws];
  const k = unitsFor(n, sp, rate, ctx.style);
  if (k <= 1) return [ws];
  const maxW = rate < 3.6 ? 6 : 5;
  const mean = n / k;
  const tmean = sp / k;
  const NEG = -1e18;
  const dp = Array.from({ length: n + 1 }, () => new Array(k + 1).fill(NEG));
  const bp = Array.from({ length: n + 1 }, () => new Array(k + 1).fill(-1));
  dp[0][0] = 0;
  const bs = [0];
  for (let i = 1; i < n; i += 1) bs.push(breakScore(ws, i, ctx));
  for (let j = 1; j <= n; j += 1)
    for (let m = 1; m <= k; m += 1)
      for (let i = Math.max(0, j - maxW); i < j; i += 1) {
        if (dp[i][m - 1] === NEG) continue;
        const chunk = ws.slice(i, j);
        let sc = dp[i][m - 1] - 0.15 * (j - i - mean) ** 2 - 0.15 * ((span(chunk) - tmean) / 0.3) ** 2;
        if (i > 0) sc += bs[i];
        if (j - i === 1 && wordClass(ws[i].t) !== "CONT") sc -= 2;
        if (sc > dp[j][m]) {
          dp[j][m] = sc;
          bp[j][m] = i;
        }
      }
  let cutsAt = [];
  if (dp[n][k] === NEG) {
    for (let x = 1; x < k; x += 1) cutsAt.push(Math.round(x * n / k));
  } else {
    let j = n;
    for (let m = k; m > 0; m -= 1) {
      const i = bp[j][m];
      cutsAt.push(i);
      j = i;
    }
    cutsAt = cutsAt.filter((c) => c > 0).sort((a, b2) => a - b2);
  }
  const b = [0, ...cutsAt, n];
  const out = [];
  for (let x = 0; x + 1 < b.length; x += 1) out.push(ws.slice(b[x], b[x + 1]));
  return out;
}
function forcedBreaks(tags) {
  const m = /* @__PURE__ */ new Map();
  const add = (i, v) => m.set(i, Math.max(m.get(i) || 0, v));
  for (const k of tags.keyTerms || []) {
    if (!["P", "T", "N", "I"].includes(k.kind) || k.priority < 4) continue;
    if (k.span[1] - k.span[0] > 2) continue;
    add(k.span[0], 5);
  }
  for (const r of tags.reveals || []) {
    if (r.payoff[1] - r.payoff[0] > 1) continue;
    add(r.copula, 5);
    add(r.payoff[0], 5);
  }
  return m;
}
function rateAround(ph, k) {
  const ws = [...ph[k - 1]?.toks || [], ...ph[k].toks, ...ph[k + 1]?.toks || []];
  const sp = ws.length ? ws[ws.length - 1].e - ws[0].s : 0;
  return sp > 0.3 ? ws.length / sp : 4;
}
function splitPhrase(toks2, tags, style, rate = 4) {
  const ctx = {
    tags,
    style,
    compounds: tags.compounds || [],
    particles: new Set(tags.particles || []),
    hedgeKeep: new Set((tags.hedges || []).filter((h) => h.action === "keep").map((h) => h.i)),
    forced: forcedBreaks(tags)
  };
  return split(toks2, ctx, rate, false);
}
function segment(all, words2, tags, style, cuts) {
  const ph = phrases(all, words2, tags, cuts);
  const ctx = {
    tags,
    style,
    compounds: tags.compounds || [],
    particles: new Set(tags.particles || []),
    hedgeKeep: new Set((tags.hedges || []).filter((h) => h.action === "keep").map((h) => h.i)),
    forced: forcedBreaks(tags)
  };
  const out = [];
  ph.forEach((p, k) => {
    const rate = rateAround(ph, k);
    const chars = p.toks.map((t) => t.t).join(" ").length;
    const whole = rate < 3.6 && p.toks.length <= 6 && chars <= 27 && p.sentenceEnd;
    const parts = split(p.toks, ctx, rate, whole);
    parts.forEach((toks2, x) => out.push({ toks: toks2, phrase: k, sentenceEnd: p.sentenceEnd && x === parts.length - 1, phraseEnd: x === parts.length - 1 }));
  });
  return out;
}

// plugins/a16z-style-captions/src/captions/lockups.ts
var words = (g) => g.toks.length;
var DISCOURSE = /^(sometimes|so|basically|actually|really|just|like|well|now|then|also|maybe|probably|literally|obviously|honestly)$/;
var has = (t, i) => t.src.includes(i);
function plainGroups(chunks) {
  let sentence = 0;
  return chunks.map((c) => {
    const g = { toks: c.toks, lines: [0], kind: "plain", big: -1, template: "single", sentence, sentenceEnd: c.sentenceEnd, phraseEnd: c.phraseEnd, phrase: c.phrase };
    if (c.sentenceEnd) sentence += 1;
    return g;
  });
}
function bigScore(line, tags, isLast) {
  let s = 0;
  for (const k of tags.keyTerms || []) if (line.some((t) => has(t, k.head))) s += 2 + k.priority;
  for (const i of tags.hook?.big || []) if (line.some((t) => has(t, i) && !DISCOURSE.test(norm(t.t)))) s += 6;
  for (const t of line) {
    const n = norm(t.t);
    if (isNumberWord(t.t) || /\d/.test(t.t)) s += 3;
    if (INTENSIFIER.has(n)) s += 1.5;
    if (DISCOURSE.test(n)) s -= 1.2;
    else if (wordClass(t.t) === "CONT") s += 0.6 + Math.min(0.6, n.length / 15);
    else s -= 0.4;
  }
  if (line.length > 3) s -= 2 * (line.length - 3);
  if (line.every((t) => wordClass(t.t) !== "CONT" && !isNumberWord(t.t))) s -= 4;
  if (isLast) s += 0.8;
  return s;
}
function templateFor(nLines, big) {
  if (nLines === 1) return "single";
  if (big === 0) return nLines === 2 ? "headTail" : "stack";
  if (big === nLines - 1) return nLines === 2 ? "leadBig" : "stack";
  return "stair";
}
function lockupLines(chunks, tags, style) {
  let parts = chunks.map((c) => c.slice());
  if (parts.length === 1 && parts[0].length >= 3) {
    const n = parts[0].length;
    parts = splitPhrase(parts[0], tags, { ...style, TW: n >= 6 ? n / 3 : n / 2 }, 4);
    if (parts.length === 1) parts = [parts[0].slice(0, Math.ceil(n / 2)), parts[0].slice(Math.ceil(n / 2))];
  }
  let best = 0;
  let bestScore = -1e9;
  parts.forEach((p, k) => {
    const sc = bigScore(p, tags, k === parts.length - 1);
    if (sc > bestScore) {
      bestScore = sc;
      best = k;
    }
  });
  const bl = parts[best];
  if (bl.length > 3 && parts.length < 4) {
    let cut = 1;
    let sc = -1e9;
    for (let c = 1; c < bl.length; c += 1) {
      const a2 = bl.slice(0, c);
      const b2 = bl.slice(c);
      if (a2.length > 3 && b2.length > 3) continue;
      const v = Math.max(bigScore(a2, tags, false), bigScore(b2, tags, true));
      if (v > sc) {
        sc = v;
        cut = c;
      }
    }
    const a = bl.slice(0, cut);
    const b = bl.slice(cut);
    parts.splice(best, 1, a, b);
    best = bigScore(a, tags, false) > bigScore(b, tags, best + 1 === parts.length - 1) ? best : best + 1;
  }
  const lines = [];
  let off = 0;
  for (const p of parts) {
    lines.push(off);
    off += p.length;
  }
  return { lines, big: best };
}
function keyCentered(toks2, tags, kind) {
  const pos = (i) => toks2.findIndex((t) => t.src.includes(i));
  let a = -1;
  let b = -1;
  if (kind === "hook") {
    const ks = (tags.hook?.big || []).map(pos).filter((k) => k >= 0);
    if (ks.length) {
      a = Math.min(...ks);
      b = Math.max(...ks);
    }
  }
  if (a < 0) {
    const terms = (tags.keyTerms || []).filter((k) => pos(k.head) >= 0).sort((x, y) => y.priority - x.priority);
    if (terms.length) {
      const t = terms[0];
      a = Math.max(0, pos(t.span[0]) >= 0 ? pos(t.span[0]) : pos(t.head));
      b = Math.max(a, pos(t.span[1]) >= 0 ? pos(t.span[1]) : pos(t.head));
    }
  }
  if (a < 0) return null;
  if (b - a > 2) a = b - 2;
  if (DISCOURSE.test(norm(toks2[a].t)) && a === b) return null;
  const punct = (t) => /[.,!?;:]["”’)]*$/.test(t.t);
  const chars = () => toks2.slice(a, b + 1).map((t) => t.t).join(" ").length;
  while (b - a < 1 && b + 1 < toks2.length && !punct(toks2[b]) && wordClass(toks2[b + 1].t) === "CONT" && chars() + toks2[b + 1].t.length < 16) b += 1;
  while (b - a < 1 && a - 1 >= 0 && !punct(toks2[a - 1]) && wordClass(toks2[a - 1].t) === "CONT" && !isNumberWord(toks2[a].t) && !DISCOURSE.test(norm(toks2[a - 1].t))) a -= 1;
  while (b > a && wordClass(toks2[b].t) !== "CONT" && !isNumberWord(toks2[b].t)) b -= 1;
  const lead = a;
  const tail2 = toks2.length - 1 - b;
  if (lead > 3 || tail2 > 4) return null;
  const lines = [];
  if (lead) lines.push(0);
  lines.push(a);
  if (tail2) lines.push(b + 1);
  return { lines, big: lead ? 1 : 0 };
}
function makeLockup(chunks, kind, tags, style, why) {
  const toks2 = chunks.flatMap((c) => c.toks);
  const { lines, big } = keyCentered(toks2, tags, kind) || lockupLines(chunks.map((c) => c.toks), tags, style);
  return {
    toks: toks2,
    lines,
    kind,
    big,
    template: templateFor(lines.length, big),
    sentence: chunks[0].sentence,
    sentenceEnd: chunks[chunks.length - 1].sentenceEnd,
    phraseEnd: chunks[chunks.length - 1].phraseEnd,
    phrase: chunks[0].phrase,
    why
  };
}
function hook(gs, tags, style) {
  if (!gs.length) return gs;
  let end = gs.findIndex((g) => g.sentenceEnd);
  if (end < 0) end = gs.length - 1;
  const first = gs.slice(0, end + 1);
  const toks2 = first.flatMap((g) => g.toks);
  const n = toks2.length;
  const dur = toks2[n - 1].e - toks2[0].s;
  if (n > 2 && /^(and|so)$/.test(norm(toks2[0].t))) {
    first[0] = { ...first[0], toks: first[0].toks.slice(1) };
    if (!first[0].toks.length) first.shift();
  }
  const rest = gs.slice(end + 1);
  const want = tags.hook?.type;
  const words2 = first.reduce((a, g) => a + g.toks.length, 0);
  if (want === "H6" || words2 <= 2) {
    const g = { ...first[0], toks: first.flatMap((x) => x.toks), lines: [0], kind: "hook", big: 0, template: "single", why: "hook" };
    return [g, ...rest];
  }
  if (words2 <= 8 && dur <= 2.5 && want !== "H4" && want !== "H2") return [makeLockup(first, "hook", tags, style, "hook"), ...rest];
  if (want === "H4" || style.format === "story") {
    const two = first.slice(0, 2);
    const w2 = two.reduce((a, g) => a + g.toks.length, 0);
    if (two.length === 2 && w2 <= 5) return [makeLockup(two, "hook", tags, style, "hook"), ...first.slice(2), ...rest];
  }
  const out = [];
  let cur = [];
  let cw = 0;
  for (const g of first) {
    if (cur.length && (cw + g.toks.length > 6 || cur.length >= 3)) {
      out.push(cur.length > 1 || cw >= 3 ? makeLockup(cur, "hook", tags, style, "hook") : cur[0]);
      cur = [];
      cw = 0;
    }
    cur.push(g);
    cw += g.toks.length;
  }
  if (cur.length) out.push(cur.length > 1 || cw >= 3 ? makeLockup(cur, "hook", tags, style, "hook") : cur[0]);
  return [...out, ...rest];
}
function candidates(gs, tags, start) {
  const out = [];
  const at = (i) => gs.findIndex((g) => g.toks.some((t) => has(t, i)));
  const grow = (k, maxWords) => {
    let a = k;
    let b = k;
    const w = () => gs.slice(a, b + 1).reduce((s, g) => s + words(g), 0);
    while (w() < 3 || b - a < 1) {
      const canL = a - 1 >= start && gs[a - 1].kind === "plain" && gs[a - 1].sentence === gs[k].sentence;
      const canR = b + 1 < gs.length && gs[b + 1].kind === "plain" && gs[b + 1].phrase === gs[k].phrase && !gs[b].phraseEnd;
      if (canL && (!canR || words(gs[a - 1]) <= words(gs[b + 1]))) a -= 1;
      else if (canR) b += 1;
      else break;
      if (b - a >= 3) break;
    }
    if (w() < 3 || w() > maxWords || b - a < 1 || b - a > 3) return null;
    return [a, b];
  };
  const push = (k, score, why, maxWords = 7) => {
    if (k < start || k < 0) return;
    const r = grow(k, maxWords);
    if (r) out.push({ from: r[0], to: r[1], score, why });
  };
  for (const k of tags.keyTerms || []) if (["T", "P", "I", "N", "D"].includes(k.kind) && k.priority >= 4) push(at(k.head), k.priority + (k.kind === "P" ? 1 : 0), k.kind);
  for (const e of tags.enumerations || []) push(at(e.count[0]), 5, "count");
  for (const q2 of tags.quotes || []) if (q2.kind === "famous" || q2.kind === "coined") push(at(q2.span[1]), 4, "quote");
  if (!tags.keyTerms) {
    gs.forEach((g, k) => {
      if (k < start) return;
      if (g.toks.some((t) => /\d/.test(t.t) && /[x%]$|,\d{3}/.test(t.t))) push(k, 4, "N");
      const prev = gs[k - 1];
      if ((!prev || prev.sentenceEnd) && IMPERATIVE.has(norm(g.toks[0].t))) push(k, 3.5, "D");
      if (g.toks.some((t, j) => INTENSIFIER.has(norm(t.t)) && j + 1 < g.toks.length && wordClass(g.toks[j + 1].t) === "CONT")) push(k, 3, "I");
    });
  }
  const last = gs.length - 1;
  const lastSentence = gs[last]?.sentence;
  const isPunch = (tags.punchlines || []).some((p) => gs[last].toks.some((t) => t.src.some((i) => i >= p[0] && i <= p[1])));
  if (last >= start && (isPunch || !tags.punchlines)) {
    let a = last;
    while (a - 1 >= start && gs[a - 1].sentence === lastSentence && gs[a - 1].kind === "plain" && last - a < 3) a -= 1;
    const w = gs.slice(a, last + 1).reduce((s, g) => s + words(g), 0);
    if (last - a >= 1 && w >= 3 && w <= 10) out.push({ from: a, to: last, score: isPunch ? 6 : 3, why: "closer" });
  }
  return out;
}
function lockups(chunks, tags, style, duration) {
  let gs = hook(plainGroups(chunks), tags, style);
  const firstPlain = gs.findIndex((g) => g.kind === "plain");
  const start = firstPlain < 0 ? gs.length : firstPlain + (firstPlain > 0 ? 1 : 0);
  const budget = Math.round(style.lockupRate * duration / 60);
  const cands = candidates(gs, tags, start).sort((a, b) => b.score - a.score);
  const taken = [];
  for (const c of cands) {
    if (taken.length >= budget) break;
    if (taken.some((t) => c.from <= t.to + 1 && c.to >= t.from - 1)) continue;
    if (gs.slice(c.from, c.to + 1).some((g) => g.kind !== "plain")) continue;
    if (c.from > 0 && gs[c.from - 1].kind !== "plain") continue;
    taken.push(c);
  }
  taken.sort((a, b) => b.from - a.from);
  for (const c of taken) {
    const g = makeLockup(gs.slice(c.from, c.to + 1), "lockup", tags, style, c.why);
    gs = [...gs.slice(0, c.from), g, ...gs.slice(c.to + 1)];
  }
  void span;
  return tidy(gs);
}
var isFunction = (t) => wordClass(t.t) !== "CONT" && !isNumberWord(t.t);
var stall = (t) => /[,\-]$/.test(t.t);
function tidy(gs) {
  for (let k = 0; k + 1 < gs.length; k += 1) {
    const g = gs[k];
    const next = gs[k + 1];
    if (g.kind === "plain" || g.lines.length < 2 || next.sentence !== g.sentence) continue;
    const tailFrom = g.lines[g.lines.length - 1];
    if (g.lines.length - 1 <= g.big) continue;
    const tail2 = g.toks.slice(tailFrom);
    if (!tail2.every(isFunction) || tail2.some(stall) || /[.?!]$/.test(tail2[tail2.length - 1].t)) continue;
    gs[k] = { ...g, toks: g.toks.slice(0, tailFrom), lines: g.lines.slice(0, -1), template: g.lines.length - 1 === 1 ? "single" : g.big === 0 ? "headTail" : "leadBig", sentenceEnd: false, phraseEnd: false };
    gs[k + 1] = { ...next, toks: [...tail2, ...next.toks], lines: next.lines.map((o, j) => j === 0 ? 0 : o + tail2.length) };
  }
  const split2 = [];
  for (const g of gs) {
    const text = g.toks.map((t) => t.t).join(" ");
    if (g.kind !== "plain" || text.length <= 24 || g.toks.length < 4) {
      split2.push(g);
      continue;
    }
    const parts = splitPhrase(g.toks, {}, { TW: g.toks.length / 2 }, 4);
    if (parts.length < 2) {
      split2.push(g);
      continue;
    }
    parts.forEach((toks2, j) => split2.push({ ...g, toks: toks2, sentenceEnd: g.sentenceEnd && j === parts.length - 1, phraseEnd: g.phraseEnd && j === parts.length - 1 }));
  }
  gs = split2;
  const out = [];
  for (let k = 0; k < gs.length; k += 1) {
    const g = gs[k];
    const next = gs[k + 1];
    const lone = g.kind === "plain" && g.toks.length === 1 && isFunction(g.toks[0]) && !stall(g.toks[0]) && !/^(but|so|and)$/i.test(g.toks[0].t.replace(/[^a-z]/gi, ""));
    if (lone && next && next.kind === "plain" && next.sentence === g.sentence && next.toks.length <= 4) {
      gs[k + 1] = { ...next, toks: [...g.toks, ...next.toks] };
      continue;
    }
    out.push(g);
  }
  return out;
}

// plugins/a16z-style-captions/src/captions/text.ts
var TRAIL = /[.,!?;:]+(["”’)]*)$/;
var inSpan3 = (i, sp) => i >= sp[0] && i <= sp[1];
function caseOf(text, sentenceStart, mode, afterComma, seenLower = /* @__PURE__ */ new Set()) {
  const core = text.replace(/[^A-Za-z'’\-]/g, "");
  const isI = /^I(['’](m|ve|d|ll))?$/.test(core);
  const acronym = core.length >= 2 && /^[A-Z0-9\-]+$/.test(core) && !isI;
  const innerCaps = /[a-z][A-Z]/.test(core) || /^[a-z]+[A-Z]/.test(core);
  if (mode === "sentence") {
    let t = text;
    if (sentenceStart || afterComma) t = t.replace(/^([“"‘']?)([a-z])/, (_, q2, c) => q2 + c.toUpperCase());
    return t;
  }
  if (isI) return mode === "lower_keep_I" ? text : text.replace(/^I/, "i");
  if (acronym || innerCaps) return text;
  const n = norm(text);
  const common = wordClass(n) !== "CONT" || INTERJ.has(n) || seenLower.has(n) || /^(yeah|yep|nope|well|right|okay|ok|oh|hey|so|but|and|now|then|just|also|maybe|actually|what|who|why|how|when|where|which)$/.test(n);
  if (sentenceStart || common) return text.replace(/[A-Z]/, (c) => c.toLowerCase());
  return text;
}
function shownText(groups, tags, style) {
  const punchSpans = tags.punchlines || [];
  const quoteSpans = (tags.quotes || []).filter((q2) => q2.kind === "famous" || q2.kind === "coined").map((q2) => q2.span);
  let sentenceStart = true;
  let afterComma = false;
  const seenLower = /* @__PURE__ */ new Set();
  for (const g of groups) for (const t of g.toks) if (/^[“"'‘]?[a-z]/.test(t.t)) seenLower.add(norm(t.t));
  groups.forEach((g, gi) => {
    const last = gi === groups.length - 1;
    g.toks.forEach((t, k) => {
      const raw = t.t;
      const unitFinal = k === g.toks.length - 1;
      let text = caseOf(raw.replace(TRAIL, "$1"), sentenceStart, style.caseMode, afterComma && k === 0, seenLower);
      const punct = (raw.match(/[.,!?;:]+/g) || []).pop() || "";
      const endsSentence = /[.!?]/.test(punct);
      sentenceStart = endsSentence;
      afterComma = /,/.test(punct);
      let keep = "";
      if (/\?/.test(punct)) keep = "?";
      else if (/^yknow/.test(norm(raw))) keep = ",";
      else if (unitFinal) {
        const hedge = /^like$/.test(norm(raw)) && /,/.test(punct);
        const punchline = punchSpans.some((p) => t.src.some((i) => inSpan3(i, p)) && t.src.includes(p[1]));
        if (hedge) keep = ",";
        else if (style.punct === "full") keep = punct.replace(/[;:]/g, ",").slice(0, 1);
        else if (style.punct === "punchline" && /\./.test(punct) && (punchline || last)) keep = ".";
        else if (last && /[.!]/.test(punct)) keep = style.punct === "minimal" ? "" : punct.slice(0, 1);
        if (punct === "!" && keep === ".") keep = "!";
      } else if (style.punct === "full" && /,/.test(punct) && k === 0 && g.toks.length > 1) keep = ",";
      if (unitFinal && (tags.abandoned || []).some((a) => a[0] === t.src[t.src.length - 1] + 1)) keep = "-";
      text = text.replace(/^[“"]+|[”"]+$/g, "") + keep;
      if (quoteSpans.some((q2) => t.src[0] === q2[0])) text = "\u201C" + text;
      if (quoteSpans.some((q2) => t.src.includes(q2[1]))) text = text + "\u201D";
      t.t = text;
    });
  });
}

// plugins/a16z-style-captions/src/captions/compile.ts
var inSpan4 = (i, sp) => i >= sp[0] && i <= sp[1];
var BURGUNDY = "#A8495C";
var GOLD = "#DFBB88";
function timing(gs, cuts, duration, fps) {
  const f1 = 1 / fps;
  const units = gs.map((g) => ({ ...g, start: Math.max(0, g.toks[0].s - f1), end: 0 }));
  const claimed = /* @__PURE__ */ new Set();
  for (const c of cuts) {
    let best = -1;
    let bestD = 1e9;
    units.forEach((u, k) => {
      const onset = u.toks[0].s;
      const firstEnd = u.toks[0].e;
      const next = units[k + 1];
      if (next && Math.abs(next.toks[0].s - c) <= 0.05 && k !== units.length - 1) return;
      const r1 = c >= onset - 0.1 && c <= Math.min(onset + 0.25, firstEnd);
      const prevEnd = k > 0 ? units[k - 1].toks[units[k - 1].toks.length - 1].e : -1;
      const r2 = c >= onset - 0.3 && c < onset - 0.1 && prevEnd <= c;
      if (!r1 && !r2) return;
      const d = Math.abs(onset - c);
      if (d < bestD || d === bestD && k > best) {
        bestD = d;
        best = k;
      }
    });
    if (best >= 0 && !claimed.has(best)) {
      claimed.add(best);
      units[best].start = c;
    }
  }
  units.forEach((u, k) => {
    const next = units[k + 1];
    const lastEnd = u.toks[u.toks.length - 1].e;
    if (!next) {
      u.end = duration;
      return;
    }
    let out = next.start;
    const c = cuts.find((x) => x > lastEnd + 0.02 && x < next.start - 0.02);
    const pause = next.toks[0].s - lastEnd;
    if (c != null) {
      if (next.start - c <= 0.45 && !cuts.some((x) => x > c && x < next.start)) {
        next.start = c;
        out = c;
      } else if (pause >= 0.4 && u.toks.length >= 2) out = c;
    } else if (pause >= 0.8) {
      const discourse = u.toks.length === 1 && /,$/.test(u.toks[0].t);
      out = discourse ? Math.min(next.start, lastEnd + 2) : Math.min(next.start, lastEnd + 0.15);
    }
    u.end = Math.max(u.start + f1, out);
  });
  return units;
}
function mergeShort(us, fps) {
  const min = 5 / fps - 1e-6;
  for (let guard = 0; guard < 50; guard += 1) {
    const k = us.findIndex((u) => u.kind === "plain" && u.end - u.start < min);
    if (k < 0) break;
    const prev = us[k - 1];
    const next = us[k + 1];
    const into = prev && prev.kind === "plain" && (!next || next.kind !== "plain" || prev.toks.length <= next.toks.length) ? k - 1 : next && next.kind === "plain" ? k + 1 : -1;
    if (into < 0) {
      if (next) next.start = Math.min(next.end - min, us[k].start + min);
      us[k].end = us[k].start + min;
      if (next && next.start < us[k].end) next.start = us[k].end;
      break;
    }
    const a = us[Math.min(k, into)];
    const b = us[Math.max(k, into)];
    const m = { ...a, toks: [...a.toks, ...b.toks], lines: [0], end: b.end, sentenceEnd: b.sentenceEnd, phraseEnd: b.phraseEnd };
    us.splice(Math.min(k, into), 2, m);
  }
  return us;
}
function emphasisOf(u, k, us, tags) {
  const hit = (i) => u.toks.findIndex((t) => t.src.includes(i));
  let best = null;
  const take = (e) => {
    if (!best || e.score > best.score) best = e;
  };
  for (const kt of tags.keyTerms || []) {
    const j = hit(kt.head);
    if (j >= 0) take({ kind: kt.kind, score: kt.priority + (kt.kind === "P" ? 1 : 0), tok: j });
  }
  for (const p of tags.punchlines || []) if (u.toks.some((t) => t.src.includes(p[1]))) take({ kind: "P", score: 4.5 });
  if (!tags.keyTerms) {
    const prev = us[k - 1];
    if ((!prev || prev.sentenceEnd) && IMPERATIVE.has(norm(u.toks[0].t))) take({ kind: "D", score: 3 });
    const j = u.toks.findIndex((t) => /\d/.test(t.t) && /[x%]$|\d{3}/.test(t.t));
    if (j >= 0) take({ kind: "N", score: 3.5, tok: j });
    if (k === us.length - 1) take({ kind: "P", score: 3 });
  }
  return best;
}
function compileCaptions(inp) {
  const tags = inp.tags || {};
  const style = inp.style;
  const cuts = (inp.cuts || []).slice().sort((a, b) => a - b);
  const shots = inp.shots || [];
  const fps = style.fps;
  const notes = [];
  const toks2 = makeTokens(inp.words, tags);
  for (const t of toks2) if (!t.drop && (inp.suppress || []).some((r) => t.src.some((i) => i >= r[0] && i <= r[1]))) t.drop = "card";
  const chunks = segment(toks2, inp.words, tags, style, cuts);
  if (!chunks.length) return { units: [], style, notes: ["No words to caption."] };
  let groups = lockups(chunks, tags, style, inp.duration);
  shownText(groups, tags, style);
  let us = mergeShort(timing(groups, cuts, inp.duration, fps), fps);
  groups = us;
  const ems = us.map((u, k) => u.kind === "plain" ? emphasisOf(u, k, us, tags) : null);
  const chosen = /* @__PURE__ */ new Set();
  const target = Math.max(1, Math.round(inp.duration / 5));
  const already = us.filter((u) => u.kind !== "plain").length;
  const order = ems.map((e, k) => ({ e, k })).filter((x) => x.e).sort((a, b) => b.e.score - a.e.score);
  const near = (k) => {
    let n = 0;
    for (let j = Math.max(0, k - 5); j <= Math.min(us.length - 1, k + 5); j += 1) if (chosen.has(j) || us[j].kind !== "plain") n += 1;
    return n;
  };
  for (const { k } of order) {
    if (chosen.size + already >= target) break;
    if (near(k) >= 3) continue;
    if (k > 0 && us[k - 1].kind !== "plain") continue;
    chosen.add(k);
  }
  for (let guard = 0; guard < 20; guard += 1) {
    const ev = us.map((u, k) => chosen.has(k) || u.kind !== "plain" ? u.start : -1).filter((x) => x >= 0);
    const pts = [0, ...ev, inp.duration];
    let gapAt = -1;
    for (let j = 0; j + 1 < pts.length; j += 1) if (pts[j + 1] - pts[j] > 9) gapAt = j;
    if (gapAt < 0) break;
    const a = pts[gapAt];
    const b = pts[gapAt + 1];
    const mid = us.map((u, k) => ({ u, k })).filter((x) => x.u.kind === "plain" && ems[x.k] && x.u.start > a + 2 && x.u.start < b - 2 && !chosen.has(x.k)).sort((x, y) => ems[y.k].score - ems[x.k].score || Math.abs(x.u.start - (a + b) / 2) - Math.abs(y.u.start - (a + b) / 2));
    if (!mid.length) break;
    chosen.add(mid[0].k);
  }
  const huge = new Set(
    [...chosen].filter((k) => ems[k] && ems[k].kind === "P" && us[k].toks.length <= 2).sort((a, b) => ems[b].score - ems[a].score).slice(0, 1)
  );
  const shotAt = (t) => shots.find((s) => t >= s.from - 1e-6 && t < s.to) || shots[shots.length - 1];
  const raw = shots.filter((s) => s.kind === "speaker").map((s) => s.face ? Math.min(0.8, Math.max(0.5, s.face.chin + 0.046)) : 0.52);
  const levels = [];
  for (const v of [...raw].sort((a, b) => a - b)) {
    const last = levels[levels.length - 1];
    if (last != null && v - last < 0.04) levels[levels.length - 1] = Math.max(last, v);
    else levels.push(v);
  }
  while (levels.length > 3) {
    let k = 0;
    for (let j = 1; j + 1 < levels.length; j += 1) if (levels[j + 1] - levels[j] < levels[k + 1] - levels[k]) k = j;
    levels.splice(k, 2, Math.max(levels[k], levels[k + 1]));
  }
  const level = (v) => levels.find((l) => l >= v - 1e-6) ?? levels[levels.length - 1] ?? v;
  const yFor = (t) => {
    const s = shotAt(t);
    if (!s) return 0.5;
    if (s.kind !== "speaker") return 0.52;
    if (style.yAnchor === "fixed_050") return 0.5;
    return level(s.face ? Math.min(0.8, Math.max(0.5, s.face.chin + 0.046)) : 0.52);
  };
  const rapid = (k) => {
    const one = (j) => us[j] && us[j].toks.length === 1 && us[j].end - us[j].start < 0.4;
    return one(k) && one(k + 1) && one(k + 2) || one(k - 1) && one(k) && one(k + 1) || one(k - 2) && one(k - 1) && one(k);
  };
  const eligible = [];
  const build2 = /* @__PURE__ */ new Set();
  us.forEach((u, k) => {
    if (u.kind !== "plain") {
      build2.add(k);
      return;
    }
    const n = u.toks.length;
    const sp = u.toks[n - 1].s - u.toks[0].s;
    if (n === 1 || n >= 5 || rapid(k) || sp < 0.25) return;
    const isQuotative = (tags.quotatives || []).some((q2) => u.toks.some((t) => t.src.some((i) => inSpan4(i, q2))));
    if (isQuotative) return;
    let score = 0;
    const prev = us[k - 1];
    if (!prev || prev.sentenceEnd && u.toks[0].s - prev.toks[prev.toks.length - 1].e > 0.25) score += 1;
    if (chosen.has(k)) score += 0.8;
    if (u.toks.some((t) => isNumberWord(t.t) || /\d/.test(t.t))) score += 0.5;
    const s = shotAt(u.start);
    if (s && s.to - s.from >= 1 && us.filter((x) => x.start >= s.from && x.start < s.to).length > 1) score += 0.4;
    eligible.push({ k, score });
  });
  eligible.sort((a, b) => b.score - a.score || a.k - b.k);
  eligible.slice(0, Math.round(style.buildShare * eligible.length)).forEach((x) => build2.add(x.k));
  const body = { kind: "blur", sigma: style.sigma0, frames: style.blurFrames, curve: "quad" };
  const big = { kind: "blur", sigma: 8, frames: 8, curve: "quad" };
  const cut = { kind: "cut", sigma: 0, frames: 0, curve: "quad" };
  let punchCuts = 0;
  let flashes = 0;
  const serifVariant = style.typeVariant === "serif_sparse" || style.typeVariant === "serif_dense";
  let lastSerif = -1e9;
  const out = us.map((u, k) => {
    const em = u.kind === "plain" && chosen.has(k) ? ems[k] : null;
    const n = u.toks.length;
    const lines = [];
    const bounds = [...u.lines, n];
    for (let j = 0; j + 1 < bounds.length; j += 1) {
      const isBig = j === u.big;
      lines.push({ from: bounds[j], to: bounds[j + 1], tier: u.kind === "plain" ? "normal" : isBig ? "big" : "small", scale: u.kind === "plain" ? 1 : isBig ? 2 : 0.85, face: "sans" });
    }
    if (u.kind === "hook" && lines.length === 1) {
      lines[0].tier = "large";
      lines[0].scale = 1.5;
    }
    let role = u.kind === "hook" ? "hook" : u.kind === "lockup" ? "lockup" : "body";
    const tokens = u.toks.map((t) => ({ text: t.t, src: t.src, s: t.s, e: t.e, reveal: 0 }));
    if (em) {
      const kind = em.kind;
      if (huge.has(k)) {
        lines[0].tier = "huge";
        lines[0].scale = 2.2;
        role = "large";
      } else if (serifVariant && (kind === "C" || kind === "T" && n > 1) && em.tok != null && u.start - lastSerif >= 6) {
        tokens[em.tok].face = "serif";
        lastSerif = u.start;
      } else if (serifVariant && kind === "Q" && n <= 6 && u.start - lastSerif >= 6) {
        lines.forEach((l) => l.face = "serif");
        lastSerif = u.start;
      } else {
        let lead = 0;
        while (lead < n - 1 && wordClass(tokens[lead].text) !== "CONT" && !isNumberWord(tokens[lead].text)) lead += 1;
        if (lead > 0 && lead <= 3 && n - lead >= 1 && lines.length === 1) {
          lines.splice(0, 1, { from: 0, to: lead, tier: "small", scale: 0.85, face: "sans" }, { from: lead, to: n, tier: "big", scale: n - lead <= 2 ? 1.6 : 1.37, face: "sans" });
          role = "large";
        } else {
          lines[0].tier = "large";
          lines[0].scale = n <= 2 ? 1.6 : 1.37;
          role = "large";
        }
      }
    }
    if (u.kind !== "plain" && u.big >= 0 && serifVariant && u.why === "quote") lines[u.big].face = "serif";
    let entrance = u.kind === "plain" && !em ? body : big;
    if (style.dialect === "CUT") {
      const keep = k === 0 || k === us.length - 1 || u.kind !== "plain";
      entrance = keep ? { ...body, sigma: k === 0 || k === us.length - 1 ? 9 : 5, frames: k === 0 || k === us.length - 1 ? 9 : 4 } : cut;
    } else if (style.dialect === "RISE") entrance = { kind: "rise", sigma: 0, frames: 3, curve: "cubic" };
    if (rapid(k) && u.kind === "plain" && !(us[k - 1] && norm(us[k - 1].toks.map((t) => t.t).join(" ")) === norm(u.toks.map((t) => t.t).join(" ")))) entrance = cut;
    if (em && n === 1 && punchCuts < 2 && cuts.some((c) => Math.abs(c - u.start) < 0.5 / fps)) {
      entrance = cut;
      punchCuts += 1;
    }
    const f1 = 1 / fps;
    let last = -1;
    tokens.forEach((t) => {
      let r = Math.max(u.start, Math.round((t.s - f1) * fps) / fps);
      if (last >= 0 && r - last < 2 / fps) r = last;
      t.reveal = build2.has(k) ? r : u.start;
      last = r;
    });
    if (flashes < 1 && u.kind === "hook" && u.start < 1.5) {
      const bl = lines[Math.max(0, u.big)];
      const tok = tokens.slice(bl.from, bl.to).reduce((a, t, j) => wordClass(t.text) === "CONT" && t.text.length > (a >= 0 ? tokens[bl.from + a].text.length : 0) ? j : a, -1);
      if (tok >= 0) {
        tokens[bl.from + tok].accent = BURGUNDY;
        flashes += 1;
      }
    }
    for (const r of tags.reveals || [])
      if (flashes < 2) {
        const j = tokens.findIndex((t) => t.src.some((i) => inSpan4(i, r.setup)) && wordClass(t.text) === "CONT");
        if (j >= 0 && k > 0) {
          tokens[j].accent = GOLD;
          flashes += 1;
        }
      }
    const unit = {
      tokens,
      lines,
      template: lines.length === 1 ? "single" : u.kind === "plain" ? "leadBig" : u.template,
      start: u.start,
      end: u.end,
      build: build2.has(k),
      entrance,
      role,
      emphasis: em ? em.kind : u.kind !== "plain" ? "T" : void 0,
      y: yFor(u.start)
    };
    return unit;
  });
  let held = null;
  out.forEach((unit, k) => {
    const s = shotAt(unit.start);
    const onSpeaker = !s || s.kind === "speaker";
    if (onSpeaker && held && held.sentence === us[k].sentence) unit.y = held.y;
    else if (onSpeaker) held = { sentence: us[k].sentence, y: unit.y };
    else held = null;
  });
  for (let k = 1; k < out.length; k += 1) {
    const a = out[k - 1];
    const b = out[k];
    if (a.lines.length !== 1 || b.lines.length !== 1) continue;
    const same = (x, y) => norm(x.text) === norm(y.text);
    if (a.tokens.length === 1 && b.tokens.length === 1 && same(a.tokens[0], b.tokens[0])) {
      a.grow = a.grow || 1;
      b.grow = Math.min(1.35, (a.grow || 1) === 1 ? 1.15 : 1.35);
      b.entrance = a.entrance.kind === "cut" ? body : a.entrance;
      continue;
    }
    let p = 0;
    while (p < a.tokens.length - 1 && p < b.tokens.length - 1 && same(a.tokens[p], b.tokens[p])) p += 1;
    if (p >= 1 && b.tokens.length - p <= 2 && !cuts.some((c) => Math.abs(c - b.start) < 0.06) && Math.abs(a.end - b.start) < 0.05) b.swapFrom = p;
  }
  notes.push(out.length + " captions, " + out.filter((u) => u.role === "lockup" || u.role === "hook").length + " lockups, " + chosen.size + " emphasised");
  return { units: out, style, notes };
}
function unitText(u) {
  return u.lines.map((l) => u.tokens.slice(l.from, l.to).map((t) => t.text).join(" ")).join(" / ");
}

// plugins/a16z-style-captions/src/captions/style.ts
function seedOf(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}
function chooseStyle(words2, tags, fps, opts = {}) {
  const seed = seedOf(words2.slice(0, 40).map((w) => w.t).join(" "));
  const sp = words2.length ? words2[words2.length - 1].e - words2[0].s : 1;
  const rate = words2.length / Math.max(1, sp);
  const format = tags.format || "standard";
  const slow = rate < 3.6;
  const TW = format === "montage_essay" ? 2.4 : format === "story" ? 2.8 : slow ? 2.9 : 2.7;
  const buildShare = format === "story" ? 0.5 : format === "montage_essay" ? 0.12 : 0.3;
  const lockupRate = format === "story" ? 8 : format === "montage_essay" ? 2 : 5;
  const inserts = opts.insertsShare || 0;
  return {
    format,
    dialect: "BLUR",
    TW,
    caseMode: "lower",
    punct: "punchline",
    typeVariant: inserts >= 0.7 ? "plain" : format === "story" ? "serif_dense" : "serif_sparse",
    yAnchor: "chin",
    buildShare,
    lockupRate,
    xh: 0.029,
    chinGap: 0.1,
    // body blur jitter: +-1 px and +-1 frame per video, never per caption
    sigma0: 6 + Math.round((seed - 0.5) * 2),
    blurFrames: 7 + (seed > 0.8 ? 1 : seed < 0.2 ? -1 : 0),
    fps
  };
}

// plugins/a16z-style-captions/src/captions/pack.ts
var faceCode = (f) => f === "serif" ? 1 : f === "roman" ? 2 : 0;
function packCaptions(track, fps) {
  const fr = (t) => Math.max(0, Math.round(t * fps));
  let sentence = 0;
  return track.units.map((u, k) => {
    const a = fr(u.start);
    const b = Math.max(a + 1, fr(u.end));
    const t = u.tokens.map((x) => {
      const tok = [x.text, Math.max(a, fr(x.reveal)), faceCode(x.face)];
      if (x.accent) tok.push(x.accent);
      return tok;
    });
    const l = u.lines.map((x) => [x.from, x.to, Math.round(x.scale * 1e3) / 1e3, faceCode(x.face), x.tier === "big" ? 1 : 0]);
    const p = {
      a,
      b,
      y: Math.round(u.y * 1e4) / 1e4,
      tp: u.template,
      e: [u.entrance.kind === "blur" ? "b" : u.entrance.kind === "rise" ? "r" : "c", u.entrance.sigma, u.entrance.frames, u.entrance.curve === "cubic" ? "c" : "q"],
      t,
      l,
      s: sentence
    };
    if (u.swapFrom) p.sw = u.swapFrom;
    if (u.grow && u.grow !== 1) p.g = u.grow;
    if (u.dark) p.d = 1;
    if (/[.?!]$/.test(u.tokens[u.tokens.length - 1]?.text || "") || k === track.units.length - 1) sentence += 1;
    return p;
  });
}

// plugins/a16z-style-captions/src/pipeline/graphic.ts
var norm3 = (s) => String(s || "").toLowerCase().replace(/[’]/g, "'").replace(/[^\p{L}\p{N}']+/gu, "");
function alignWords(short, src, fps) {
  const out = [];
  let j = 0;
  for (const w of short) {
    let found = -1;
    for (let k = j; k < Math.min(src.length, j + 12); k += 1)
      if (norm3(src[k].t) === norm3(w.t)) {
        found = k;
        break;
      }
    const i = found >= 0 ? src[found].i : -1 - out.length;
    if (found >= 0) j = found + 1;
    out.push({ i, t: w.t, s: w.s / fps, e: w.e / fps });
  }
  return out;
}
function prepareShort(job, short) {
  const fps = short.fps;
  const duration = short.endFrame / fps;
  const words2 = alignWords(short.words, job.srcWords, fps);
  let semantic = job.semantic;
  if (semantic?.raw)
    try {
      semantic = resolveSemantic(parseLoose(semantic.raw), job.srcWords, sentences(job.srcWords), semantic.raw);
    } catch {
    }
  const tags = semantic?.tags || {};
  const at = (i) => words2.find((w) => w.i === i);
  const cutSet = /* @__PURE__ */ new Set();
  short.clips.forEach((c, k) => k > 0 && cutSet.add(Math.round(c.s / fps * 1e3) / 1e3));
  for (const c of job.framing.cuts) cutSet.add(c);
  const cuts = [...cutSet].sort((a, b) => a - b);
  const cards = [];
  const suppress = [];
  const caseWord = (w) => /[A-Z].*[A-Z]/.test(w) || properNoun(w, words2) ? w : w.toLowerCase();
  const free = (a, b) => a / fps >= 3 && b / fps <= duration - 1.5 && !cards.some((x) => a < x.b + 4 * fps && b > x.a - 4 * fps);
  const place = (c) => {
    cards.push(c);
    const inside = words2.filter((w) => w.s * fps >= c.a - 1 && w.s * fps < c.b && w.i >= 0).map((w) => w.i);
    if (inside.length) suppress.push([Math.min(...inside), Math.max(...inside)]);
  };
  const onset = (sp) => sp ? at(sp[0]) : void 0;
  if (job.opts.cards !== false) {
    for (const c of semantic?.cards || []) {
      if (cards.filter((x) => x.kind === "keyword").length >= 2) break;
      const first = at(c.span[0]);
      const last = at(c.span[1]);
      if (!first || !last) continue;
      const textWord = words2.find((w) => w.s >= first.s - 0.01 && w.e <= last.e + 0.01 && norm3(w.t) === norm3(c.text.split(/\s+/)[0])) || first;
      const a = Math.round((textWord.s - 4 / 24) * fps);
      const b = Math.min(Math.round((textWord.s + 2.2) * fps), Math.max(Math.round((textWord.s + 1.4) * fps), Math.round((last.e + 0.2) * fps)));
      if (a / fps > 0.7 * duration || !free(a, b)) continue;
      place({ a, b, kind: "keyword", items: [{ text: c.text.split(/\s+/).map(caseWord).join(" "), at: a, role: "key" }] });
    }
    for (const dz of semantic?.designs || []) {
      if (dz.kind === "window" && cards.some((c) => c.kind === "window")) continue;
      const spoken = dz.parts.filter((p) => p.span);
      const first = onset(spoken[0]?.span || null);
      const lastPart = spoken[spoken.length - 1]?.span;
      const last = lastPart ? at(lastPart[1]) : void 0;
      if (!first || !last) continue;
      const lead = dz.kind === "chapter" ? 0.1 : 0.12;
      const a = Math.round((first.s - lead) * fps);
      const minDur = dz.kind === "chapter" || dz.kind === "window" ? 1.6 : 1.4;
      const maxDur = dz.kind === "list" || dz.kind === "bubbles" ? 5.5 : dz.kind === "versus" ? 2.5 : dz.kind === "window" || dz.kind === "document" ? 4 : 3.2;
      const b = Math.round(Math.min(first.s + maxDur, Math.max(first.s + minDur, last.e + 0.35)) * fps);
      if (!free(a, b) || dz.kind === "window" && a / fps < 6) continue;
      const items = dz.parts.map((p, k) => {
        const w = onset(p.span);
        const prev = dz.parts[k - 1]?.span ? at(dz.parts[k - 1].span[1]) : void 0;
        const t = w ? w.s : prev ? prev.e : first.s;
        const text = p.role === "key" && dz.kind === "number" ? p.text : p.text.replace(/["“”]/g, "").split(/\s+/).map(caseWord).join(" ");
        return { text, at: Math.max(a, Math.round((t - 1 / fps) * fps)), role: p.role };
      });
      const src = short.clips[0];
      place({ a, b, kind: dz.kind, items, numeral: dz.numeral, aspect: src && src.sw && src.sh ? src.sw / src.sh : 16 / 9 });
    }
  }
  cards.sort((x, y) => x.a - y.a);
  for (const c of cards) if (c.items.length) c.items[0].at = Math.min(c.items[0].at, c.a + Math.round(4 * fps / 24));
  const light = cards.some((c) => c.kind !== "keyword" && c.kind !== "window");
  for (const c of cards) if (c.kind === "keyword") c.palette = light ? "cream" : "burgundy";
  const windows = cards.filter((c) => c.kind === "window").map((c) => ({ from: c.a, to: c.b }));
  let title = null;
  const hookType = semantic?.tags.hook?.type;
  const firstIdx = words2.findIndex((w) => /[.!?]["”’)]*$/.test(w.t));
  const opener = firstIdx >= 0 ? words2.slice(0, firstIdx + 1).filter((w) => w.i >= 0) : [];
  if (opener.length >= 4 && opener.length <= 10 && (hookType === "H4" || hookType === "H2" || semantic?.tags.format === "story") && !cards.some((c) => c.a < (opener[opener.length - 1].e + 0.5) * fps)) {
    const texts = opener.map((w, k) => {
      const t = w.t.replace(/[.,!;:"“”]+$/g, "").replace(/^["“]/, "");
      return k === 0 ? t.charAt(0).toUpperCase() + t.slice(1) : caseWord(t);
    });
    let cut = 1;
    let best = 1e9;
    for (let k = 1; k < texts.length; k += 1) {
      const a = texts.slice(0, k).join(" ").length;
      const b2 = texts.slice(k).join(" ").length;
      if (Math.max(a, b2) < best && texts.length - k >= 2) {
        best = Math.max(a, b2);
        cut = k;
      }
    }
    const one = texts.join(" ").length <= 18;
    const last = opener[opener.length - 1];
    const b = Math.round(Math.max(1.5, last.e + 0.35) * fps);
    title = { a: 0, b, words: opener.map((w, k) => ({ text: texts[k], at: Math.max(0, Math.round((w.s - 1 / fps) * fps)), line: one || k < cut ? 0 : 1 })) };
    suppress.push([opener[0].i, last.i]);
  }
  for (const c of cards) cuts.push(c.a / fps, c.b / fps);
  cuts.sort((a, b) => a - b);
  return { fps, duration, words: words2, semantic, cuts, cards, suppress, windows, title };
}
function fillCoverage(prep, inserts, starts, hasTag, aspect) {
  const { fps, duration, words: words2 } = prep;
  const tags = prep.semantic?.tags || {};
  const covered = () => [...inserts.map((x) => [x.a, x.b]), ...prep.cards.map((c) => [c.a / fps, c.b / fps]), ...prep.title ? [[0, prep.title.b / fps]] : []].sort((a, b) => a[0] - b[0]);
  const coverage = () => covered().reduce((n, [a, b]) => n + (b - a), 0) / duration;
  const caseWord = (w) => /[A-Z].*[A-Z]/.test(w) || properNoun(w, words2) ? w : w.toLowerCase();
  const clean2 = (t) => t.replace(/[.,!?;:"“”]+$/g, "").replace(/^["“]/, "");
  const free = (a, b) => covered().every(([x, y]) => b <= x - 1.4 || a >= y + 1.4);
  let added = 0;
  let lastKind = "";
  const sentenceFirst = words2.filter((w, k) => k === 0 || /[.!?]["”’)]*$/.test(words2[k - 1].t));
  const startsSentence = (t) => sentenceFirst.find((w) => Math.abs(w.s - t) < 0.15);
  const count = (kind) => prep.cards.filter((c) => c.kind === kind).length;
  const place = (t) => {
    const a = Math.round((t - 0.04) * fps);
    const inWin = (end) => words2.filter((w) => w.s >= t - 0.01 && w.s < end && w.i >= 0);
    const key = (tags.keyTerms || []).filter((k) => k.priority >= 3 && ["T", "P", "I", "N", "K"].includes(k.kind)).find((k) => {
      const w = words2.find((x) => x.i === k.head);
      return w && w.s >= t && w.s < t + 1.6;
    });
    const options = [];
    if (key) options.push(() => {
      const ws = words2.filter((w) => w.i >= key.span[0] && w.i <= key.span[1] && wordClass(w.t) === "CONT");
      if (!ws.length || count("keyword") >= 3) return false;
      const ka = Math.round((ws[0].s - 2 / 24) * fps);
      if (prep.cards.some((c) => c.kind === "keyword" && Math.abs(c.a - ka) < 8 * fps)) return false;
      const b = Math.round(Math.max(ws[0].s + 1.5, ws[ws.length - 1].e + 0.35) * fps);
      if (!free(ka / fps, b / fps)) return false;
      prep.cards.push({ a: ka, b, kind: "keyword", items: [{ text: ws.map((w) => caseWord(clean2(w.t))).join(" "), at: ka, role: "key" }] });
      lastKind = "keyword";
      return true;
    });
    const sw = startsSentence(t);
    if (sw) options.push(() => {
      const k0 = words2.indexOf(sw);
      let k1 = k0;
      while (k1 < words2.length - 1 && !/[.!?]["”’)]*$/.test(words2[k1].t)) k1 += 1;
      const ws = words2.slice(k0, k1 + 1).filter((w) => w.i >= 0);
      if (ws.length < 4 || ws.length > 10 || ws[ws.length - 1].e - t > 3.4) return false;
      const b = Math.round((ws[ws.length - 1].e + 0.35) * fps);
      if (!free(a / fps, b / fps)) return false;
      const keyIdx = ws.findIndex((w) => (tags.keyTerms || []).some((k) => k.head === w.i));
      prep.cards.push({ a, b, kind: "quote", items: ws.map((w, j) => ({ text: j === 0 ? clean2(w.t).charAt(0).toUpperCase() + clean2(w.t).slice(1) : caseWord(clean2(w.t)), at: Math.max(a, Math.round((w.s - 1 / fps) * fps)), role: j === keyIdx ? "key" : "item" })) });
      lastKind = "quote";
      return true;
    });
    options.push(() => {
      if (count("window") >= 0) return false;
      const ws = inWin(t + 2.2).slice(0, 10);
      if (ws.length < 3) return false;
      const b = Math.round(Math.max(t + 1.6, ws[ws.length - 1].e + 0.3) * fps);
      if (!free(a / fps, b / fps)) return false;
      prep.cards.push({ a, b, kind: "window", items: ws.map((w) => ({ text: caseWord(clean2(w.t)), at: Math.max(a, Math.round((w.s - 1 / fps) * fps)), role: "item" })), aspect });
      lastKind = "window";
      return true;
    });
    const kinds = options.map((o) => o === options[0] && key ? "keyword" : o === options[options.length - 1] ? "window" : "quote");
    const order = options.map((o, i) => ({ o, k: kinds[i] })).sort((x, y) => Number(x.k === lastKind) - Number(y.k === lastKind));
    for (const { o } of order) if (o()) return true;
    return false;
  };
  const limitFirst = prep.title || hasTag ? 4 : 2.5;
  if (!covered().some(([a]) => a <= limitFirst)) {
    for (const t of starts) if (t >= 1.2 && t <= limitFirst && place(t)) {
      added += 1;
      break;
    }
  }
  for (let guard = 0; guard < 12; guard += 1) {
    const cov = covered();
    const gaps = [];
    let at = 0;
    for (const [a, b] of cov) {
      if (a > at) gaps.push([at, a]);
      at = Math.max(at, b);
    }
    if (at < duration) gaps.push([at, duration]);
    const long = gaps.filter(([a, b]) => a < 0.8 * duration && b - a > (coverage() < 0.4 ? 4.5 : 6)).sort((x, y) => y[1] - y[0] - (x[1] - x[0]))[0];
    if (!long) break;
    const mid = long[0] + Math.min(3, (long[1] - long[0]) / 2);
    const cands = starts.filter((t) => t >= long[0] + 1.6 && t <= long[1] - 2.2).sort((x, y) => Math.abs(x - mid) - Math.abs(y - mid));
    let ok = false;
    for (const t of cands) if (place(t)) {
      ok = true;
      break;
    }
    if (!ok) break;
    added += 1;
  }
  prep.cards.sort((x, y) => x.a - y.a);
  for (const c of prep.cards) {
    const inside = words2.filter((w) => w.s * fps >= c.a - 1 && w.s * fps < c.b && w.i >= 0).map((w) => w.i);
    if (inside.length) prep.suppress.push([Math.min(...inside), Math.max(...inside)]);
    prep.cuts.push(c.a / fps, c.b / fps);
  }
  prep.cuts = [...new Set(prep.cuts)].sort((a, b) => a - b);
  const light = prep.cards.some((c) => c.kind !== "keyword" && c.kind !== "window");
  for (const c of prep.cards) if (c.kind === "keyword") c.palette = light ? "cream" : "burgundy";
  prep.windows = prep.cards.filter((c) => c.kind === "window").map((c) => ({ from: c.a, to: c.b }));
  return added;
}
function unitStarts(job, prep) {
  const tags = prep.semantic?.tags || {};
  const style = chooseStyle(prep.words, tags, prep.fps);
  const track = compileCaptions({ words: prep.words, tags, style, cuts: prep.cuts, shots: job.framing.shots, duration: prep.duration, suppress: prep.suppress });
  return track.units.map((u) => u.start);
}
async function buildGraphic(o) {
  const { job, prep } = o;
  const { fps, duration, words: words2, semantic, cards, suppress } = prep;
  const tags = semantic?.tags || {};
  const notes = [];
  const cuts = [...prep.cuts, ...o.inserts.flatMap((x) => [x.a, x.b])].sort((a, b) => a - b);
  const shots = [
    ...o.inserts.map((x) => ({ from: x.a, to: x.b, kind: "broll", face: null })),
    ...job.framing.shots.map((s) => ({ ...s }))
  ];
  const style = chooseStyle(words2, tags, fps);
  const track = compileCaptions({ words: words2, tags, style, cuts, shots, duration, suppress });
  const units = packCaptions(track, fps).filter((u) => !cards.some((c) => u.a >= c.a && u.a < c.b));
  for (const u of units) for (const c of cards) if (u.a < c.a && u.b > c.a) u.b = c.a;
  for (const u of units) {
    const ins = o.inserts.find((x) => u.a / fps >= x.a - 0.01 && u.a / fps < x.b);
    if (ins?.bright) u.d = 1;
  }
  let nameTag = null;
  const said = semantic?.speaker;
  const nm = (job.opts.name || "").trim() || (said?.name || "");
  const roleLine = (job.opts.name || "").trim() ? (job.opts.role || "").trim() : said?.role || "";
  if (nm) {
    const parts = nm.split(/\s+/);
    const last = parts.length > 1 ? parts.pop() : "";
    const firstCard = cards.length ? cards[0].a : Infinity;
    const firstInsert = o.inserts.length ? Math.round(o.inserts[0].a * fps) : Infinity;
    const a = prep.title ? prep.title.b : Math.round(0.1 * fps);
    const b = Math.min(firstCard, firstInsert, a + Math.round(2.6 * fps));
    const y = Math.min(0.8, (track.units[0]?.y || 0.55) + 0.12);
    if (b - a >= Math.round(1.2 * fps)) nameTag = { a, b, first: parts.join(" "), last, role: roleLine, x: 0.1, y, cap: 0.042 };
  }
  let mark = null;
  if (o.logo) {
    try {
      const path = o.logo.replace(/^~(?=\/)/, fs().homedir());
      const buf = await fs().readFile(path);
      const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
      if (bytes.length > 16e4) notes.push("The logo file is over 160 KB; it was left out.");
      else {
        let bin = "";
        for (let k = 0; k < bytes.length; k += 1) bin += String.fromCharCode(bytes[k]);
        const type = /\.svg$/i.test(path) ? "image/svg+xml" : /\.jpe?g$/i.test(path) ? "image/jpeg" : "image/png";
        mark = { src: "data:" + type + ";base64," + btoa(bin), w: 0, h: 0, opacity: 0.88 };
      }
    } catch {
      notes.push("The logo file could not be read; it was left out.");
    }
  }
  const q0 = (x) => x.span[0];
  const quoteBlocks = [];
  const spans = [];
  const quotativeEnds = (tags.quotatives || []).map((q2) => q2[1]);
  for (const q2 of (tags.quotes || []).filter((x) => (x.kind === "reported" || x.kind === "imagined") && quotativeEnds.some((e) => q0(x) - e >= 0 && q0(x) - e <= 3)).sort((x, y) => x.span[0] - y.span[0])) {
    const last = spans[spans.length - 1];
    if (last && q2.span[0] - last[1] <= 4) last[1] = Math.max(last[1], q2.span[1]);
    else spans.push([q2.span[0], q2.span[1]]);
  }
  for (const span2 of spans) {
    const q2 = { span: span2 };
    const inside = track.units.filter((u) => u.tokens.some((t) => t.src.some((i) => i >= q2.span[0] && i <= q2.span[1])));
    if (inside.length < 3) continue;
    const a = Math.round(inside[0].start * fps);
    const b = Math.round(inside[inside.length - 1].end * fps);
    if (cards.some((c) => a < c.b && b > c.a)) continue;
    quoteBlocks.push([a, b, inside[0].y]);
  }
  const data = {
    W: 1080,
    H: 1920,
    fps,
    uid: job.shortId.slice(0, 8) + Date.now().toString(36),
    xh: style.xh,
    units,
    nameTag,
    cards,
    mark,
    quoteBlocks,
    title: prep.title,
    fonts: o.fonts
  };
  try {
    const rows = track.units.map((u) => u.start.toFixed(2) + "-" + u.end.toFixed(2) + " " + u.role + (u.build ? "*" : "") + (u.emphasis ? ":" + u.emphasis : "") + " " + u.entrance.kind + " y" + u.y.toFixed(3) + "  " + unitText(u));
    const dir = fs().join(fs().homedir(), ".selects", "plugin-data", "a16z-style-captions", "shorts", job.shortId);
    await fs().writeFile(fs().join(dir, "captions.txt"), rows.join("\n"));
    await fs().writeFile(fs().join(dir, "inputs.json"), JSON.stringify({ words: words2, tags, cuts, shots, duration, suppress, cards, fps, inserts: o.inserts }));
  } catch {
  }
  try {
    const dir = fs().join(fs().homedir(), ".selects", "plugin-data", "a16z-style-captions", "shorts", job.shortId);
    await fs().writeFile(fs().join(dir, "graphic.json"), JSON.stringify({ ...data, fonts: void 0 }));
  } catch {
  }
  const lockups2 = track.units.filter((u) => u.lines.length > 1).length;
  const summary = units.length + " captions, " + lockups2 + " lockups, " + cards.length + " card" + (cards.length === 1 ? "" : "s") + (nameTag ? ", name tag" : "");
  return { data, notes: [...notes, ...track.notes.filter((n) => /^No /.test(n))], summary };
}
function properNoun(w, words2) {
  const n = norm3(w);
  if (wordClass(n) !== "CONT" || /^(what|who|why|how|when|where|which|yeah|okay|hey|well|so|now|then)$/.test(n)) return false;
  let caps = 0;
  let lower = 0;
  words2.forEach((x, k) => {
    if (norm3(x.t) !== n || k === 0 || /[.!?]["”’)]*$/.test(words2[k - 1].t)) return;
    if (/^[“"']?[A-Z]/.test(x.t)) caps += 1;
    else lower += 1;
  });
  return caps > 0 && lower === 0;
}

// plugins/a16z-style-captions/src/pipeline/stock.ts
function stockSearchAvailable() {
  try {
    return typeof di()?.StockMediaSearch?.searchVideos === "function";
  } catch {
    return false;
  }
}
var clean = (raw) => String(raw || "").replace(/[^\p{L}\p{N}\s'-]+/gu, " ").replace(/\s+/g, " ").trim().split(" ").slice(0, 5).join(" ");
async function searchCandidates(queries, max, avoid) {
  const service = di().StockMediaSearch;
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const orientation of ["portrait", "landscape"]) {
    for (const raw of queries) {
      const query = clean(raw);
      if (!query) continue;
      let rows = [];
      try {
        rows = await service.searchVideos({ query, per: 8, orientation });
      } catch {
        continue;
      }
      for (const v of rows) {
        if (out.length >= max) return out;
        if (!v.previewUrl || avoid.has(v.originalUrl) || seen.has(v.originalUrl)) continue;
        const pick = chooseStock([v], orientation);
        if (!pick) continue;
        seen.add(v.originalUrl);
        out.push({
          id: v.originalUrl,
          url: pick.url,
          width: pick.width,
          height: pick.height,
          duration: v.duration,
          preview: v.previewUrl,
          credit: v.authorName || serviceLabel(v.serviceName),
          authorUrl: v.authorUrl,
          service: serviceLabel(v.serviceName)
        });
      }
    }
    if (out.length >= Math.ceil(max / 2)) break;
  }
  return out;
}
async function cutCandidate(sdk, c, dir, seconds, offset = 0.4) {
  fs().mkdirSync(dir, { recursive: true });
  const start = Math.min(Math.max(0, c.duration - seconds - 0.2), offset);
  const length = Math.max(1.5, Math.min(12, seconds));
  const out = fs().join(dir, "stock-" + Math.abs(hash2(c.id + "@" + start.toFixed(2) + "+" + length.toFixed(2))) + ".mp4");
  if (!fs().existsSync(out)) {
    const portrait = c.height > c.width;
    const box = portrait ? "1080:1920" : "1920:1080";
    await shell(
      sdk,
      "Download stock B-roll",
      FF + 'set -e; "$FF" -v error -y -ss ' + start.toFixed(2) + " -t " + length.toFixed(2) + " -i " + q(c.url) + " -an -c:v libx264 -preset veryfast -crf 19 -pix_fmt yuv420p -vf " + q("scale=" + box + ":force_original_aspect_ratio=increase:force_divisible_by=2") + " " + q(out + ".part.mp4") + " && mv " + q(out + ".part.mp4") + " " + q(out),
      15e4,
      4e3
    );
  }
  const probe = (await shell(sdk, "Probe stock B-roll", 'FP="$(command -v ffprobe || ls /opt/homebrew/bin/ffprobe /usr/local/bin/ffprobe "$HOME/.local/bin/ffprobe" 2>/dev/null | head -n 1)"; "$FP" -v error -select_streams v:0 -show_entries stream=width,height:format=duration -of csv=p=0 ' + q(out) + " | tr '\\n' ','", 3e4, 2e3)).trim().split(",").map(Number);
  return { id: c.id, path: out, width: probe[0] || c.width, height: probe[1] || c.height, dur: probe[2] || 0, credit: c.credit, url: c.authorUrl, service: c.service };
}
function serviceLabel(name) {
  return /^pex/i.test(name) ? "Pexels" : name || "stock";
}
function chooseStock(rows, orientation) {
  const need = orientation === "portrait" ? 1080 : 720;
  let best = null;
  rows.forEach((v, rank) => {
    if (!(v.duration >= 3)) return;
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
function hash2(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) h = (h << 5) + h + s.charCodeAt(i) | 0;
  return h;
}
async function probeDuration(sdk, path) {
  const out = await shell(sdk, "Probe stock B-roll", 'FP="$(command -v ffprobe || ls /opt/homebrew/bin/ffprobe /usr/local/bin/ffprobe "$HOME/.local/bin/ffprobe" 2>/dev/null | head -n 1)"; "$FP" -v error -show_entries format=duration -of csv=p=0 ' + q(path), 3e4, 2e3).catch(() => "");
  return Number(String(out).trim()) || 0;
}

// plugins/a16z-style-captions/src/pipeline/inserts.ts
function planInserts(words2, beats, duration, blocked, opts) {
  const onsets = (opts.starts && opts.starts.length ? opts.starts : words2.map((w) => w.s)).slice().sort((a, b) => a - b);
  const snap = (t) => onsets.reduce((best, o) => Math.abs(o - t) < Math.abs(best - t) ? o : best, t);
  const at = (i) => words2.find((w) => w.i === i);
  const runs = [];
  let covered = 0;
  const sorted = beats.map((b) => ({ b, w0: at(b.span[0]), w1: at(b.span[1]) })).filter((x) => x.w0 && x.w1).sort((x, y) => x.w0.s - y.w0.s);
  const sentenceEnd2 = (w) => {
    const k = words2.indexOf(w);
    for (let j = k; j < words2.length; j += 1) if (/[.!?]["”’)]*$/.test(words2[j].t)) return words2[j].e;
    return words2[words2.length - 1].e;
  };
  for (const { b, w0, w1 } of sorted) {
    let a = Math.max(0, snap(w0.s) - 0.04);
    let e = w1.e + 0.08;
    const next = onsets.find((o) => o > e - 0.08);
    if (next != null && next - e < 0.6) e = next - 0.04;
    void sentenceEnd2;
    if (e - a < 2) e = snap(a + 2.2) - 0.04;
    if (e - a > 5.5) e = snap(a + 5) - 0.04;
    if (a < opts.earliest) {
      if (e - opts.earliest < 1.5) continue;
      a = snap(opts.earliest) - 0.04;
    }
    if (e > duration - 1.5) e = snap(duration - 1.5) - 0.04;
    if (e - a < 1.2) continue;
    const card = blocked.find(([x, y]) => a < y + 0.3 && e > x - 0.3);
    if (card) {
      if (e - (card[1] + 0.6) < 1.5) continue;
      a = snap(card[1] + 0.6) - 0.04;
    }
    const fits = (seconds) => (covered + seconds) / duration <= 0.32;
    const prev = runs[runs.length - 1];
    if (prev && a < prev.b + 1.5) {
      if (b.query !== prev.shots[0].query) {
        a = prev.b;
        if (e - a < 1.2) continue;
      } else {
        const end = Math.min(e, prev.a + 6.4);
        if (end - prev.b >= 0.9 && fits(end - prev.b)) {
          const s0 = prev.b;
          prev.b = end;
          prev.shots.push({ a: s0, b: end, query: b.query, alt: b.alt || b.query, run: runs.length - 1, k: prev.shots.length });
          covered += end - s0;
        }
        continue;
      }
    }
    if (!fits(e - a)) continue;
    const n = Math.max(1, Math.min(4, Math.ceil((e - a) / 1.8)));
    const cuts = [a];
    for (let k = 1; k < n; k += 1) cuts.push(Math.max(cuts[k - 1] + 0.9, snap(a + (e - a) * k / n) - 0.04));
    cuts.push(e);
    const run2 = { a, b: e, shots: [] };
    for (let k = 0; k + 1 < cuts.length; k += 1) if (cuts[k + 1] - cuts[k] > 0.5) run2.shots.push({ a: cuts[k], b: cuts[k + 1], query: b.query, alt: b.alt || b.query, run: runs.length, k });
    if (!run2.shots.length) continue;
    runs.push(run2);
    covered += e - a;
  }
  return runs;
}
var cacheKey = (s) => s.query + "|" + s.alt + "|" + s.k + "|" + Math.round((s.b - s.a) * 10);
async function fetchInserts(sdk, runs, dir, onTick, cache = {}) {
  const notes = [];
  if (!runs.length) return { shots: [], notes };
  if (!stockSearchAvailable()) return { shots: [], notes: ["No B-roll: this Selects version has no stock footage search. Update Selects."] };
  const out = [];
  const used = /* @__PURE__ */ new Set();
  const todo = [];
  for (const r of runs) {
    const hits = r.shots.map((s) => cache[cacheKey(s)]);
    if (hits.every((h) => h && (!h.clip || fs().existsSync(h.clip.path)))) {
      for (let k = 0; k < hits.length; k += 1) {
        const h = hits[k];
        if (!h.clip) continue;
        if (!h.clip.dur) h.clip.dur = await probeDuration(sdk, h.clip.path);
        used.add(h.clip.id);
        out.push({ ...r.shots[k], b: h.b ?? r.shots[k].b, clip: h.clip, luma: h.luma });
      }
    } else todo.push(r);
  }
  if (!todo.length) return { shots: out, notes };
  const found = [];
  const empty = [];
  for (let k = 0; k < todo.length; k += 1) {
    onTick("Searching footage " + (k + 1) + " of " + todo.length);
    const s0 = todo[k].shots[0];
    let list = await searchCandidates([s0.query, s0.alt], 6, used).catch(() => []);
    if (!list.length) {
      await sleep(3e3);
      list = await searchCandidates([s0.query, s0.alt], 6, used).catch(() => []);
    }
    if (list.length) found.push({ run: todo[k], cands: list });
    else empty.push(todo[k]);
  }
  if (empty.length) notes.push("B-roll: the stock search returned nothing for " + empty.length + " of " + todo.length + " moments (the service may be busy); rebuild to try them again.");
  todo.length = 0;
  todo.push(...found.map((f) => f.run));
  const cands = found.map((f) => f.cands);
  if (!todo.length) return { shots: out.sort((a, b) => a.a - b.a), notes };
  const cut = async (cand, s) => {
    onTick("Cutting footage " + (out.length + 1));
    const clip = await cutCandidate(sdk, cand, fs().join(dir, "stock"), s.b - s.a + 0.4).catch(() => null);
    if (!clip) return null;
    const whole = await frameLuma(sdk, clip.path, (s.b - s.a) / 2).catch(() => null);
    if (whole != null && whole < 28) return null;
    return { clip, luma: await captionLuma(sdk, clip.path, (s.b - s.a) / 2).catch(() => null) };
  };
  for (let r = 0; r < todo.length; r += 1) {
    const run2 = todo[r];
    const pool = cands[r].filter((c) => !used.has(c.id));
    let next = 0;
    for (const s0 of run2.shots) {
      let placed = false;
      while (!placed && next < pool.length) {
        const cand = pool[next++];
        if (used.has(cand.id) || cand.duration < s0.b - s0.a + 0.7) continue;
        const clip = await cut(cand, s0);
        if (!clip) continue;
        used.add(cand.id);
        cache[cacheKey(s0)] = { clip: clip.clip, luma: clip.luma };
        out.push({ ...s0, clip: clip.clip, luma: clip.luma });
        placed = true;
      }
      if (!placed) cache[cacheKey(s0)] = { clip: null };
    }
  }
  const wanted = runs.filter((r) => !empty.includes(r)).reduce((n, r) => n + (r.shots[r.shots.length - 1].b - r.a), 0);
  const got = out.reduce((n, x) => n + x.b - x.a, 0);
  if (got < wanted - 0.05) notes.push("B-roll: " + (wanted - got).toFixed(1) + " of " + wanted.toFixed(1) + " s had no fitting footage and stay on the speaker.");
  out.sort((a, b) => a.a - b.a);
  return { shots: out, notes };
}
function coverRect(sw, sh, W2, H2) {
  const k = Math.max(W2 / sw, H2 / sh);
  const w = sw * k;
  const h = sh * k;
  return { x: Math.round((W2 - w) / 2 * 100) / 100, y: Math.round((H2 - h) / 2 * 100) / 100, w: Math.round(w * 100) / 100, h: Math.round(h * 100) / 100 };
}
async function lumaOf(sdk, path, at, crop) {
  const vf = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" + crop + ",signalstats,metadata=print:key=lavfi.signalstats.YAVG";
  const out = await shell(sdk, "Measure B-roll brightness", FF + '"$FF" -hide_banner -nostats -ss ' + at.toFixed(2) + " -i " + q(path) + " -vf " + q(vf) + " -frames:v 1 -f null - 2>&1 | grep -o 'YAVG=[0-9.]*' | head -n 1", 3e4, 2e3);
  const v = Number((out.match(/YAVG=([\d.]+)/) || [])[1]);
  return Number.isFinite(v) ? v : null;
}
var frameLuma = (sdk, path, at) => lumaOf(sdk, path, at, "");
var captionLuma = (sdk, path, at) => lumaOf(sdk, path, at, ",crop=864:230:108:880");

// plugins/a16z-style-captions/src/pipeline/make.ts
var STEPS = [
  ["read", "Read the transcript"],
  ["think", "Mark key ideas (AI)"],
  ["faces", "Find the speaker"],
  ["cut", "Tighten pauses and frame 9:16"],
  ["music", "Music bed"],
  ["broll", "B-roll from stock footage"],
  ["captions", "Captions, cards and name tag"]
];
var jobDir = (id) => fs().join(dataRoot(), "shorts", id);
async function saveJob(job) {
  fs().mkdirSync(jobDir(job.shortId), { recursive: true });
  await fs().writeFile(fs().join(jobDir(job.shortId), "job.json"), J(job));
}
async function loadJob(id) {
  try {
    return JSON.parse(String(await fs().readFile(fs().join(jobDir(id), "job.json"), "utf8")));
  } catch {
    return null;
  }
}
var isWindows = () => /Windows/i.test(navigator.userAgent);
async function makeShort(sdk, ctx, opts, onStep) {
  const t0 = Date.now();
  const notes = [];
  const v = hostVersion();
  if (opts.music && v && versionBelow(v, "2.0.512")) {
    notes.push("Music needs Selects 2.0.512 or later; the Short has no music bed.");
    opts = { ...opts, music: false };
  }
  const pid = ctx.projectId;
  onStep("read", "run");
  const src = await readDraft(sdk, pid, ctx.sequenceId, "Read the talking-head Draft");
  if (src.words.length < 8) throw new Error("This Draft has too few transcribed words. Transcribe it first.");
  if (!src.clips.length) throw new Error("This Draft has no footage on Main.");
  const fps = src.fps;
  const tw = src.words.map((w) => ({ i: w.i, t: w.t, s: w.s / fps, e: w.e / fps }));
  onStep("read", "done", src.words.length + " words, " + (src.endFrame / fps).toFixed(1) + " s");
  onStep("think", "run", "Reading the story\u2026");
  const think = semanticPass(sdk, tw, opts.hint).then((s) => {
    onStep("think", "done", (s.tags.keyTerms?.length || 0) + " key terms, " + s.cards.length + " card" + (s.cards.length === 1 ? "" : "s"));
    return s;
  }).catch((e) => {
    notes.push("The AI pass failed (" + String(e?.message || e).slice(0, 160) + "); captions use the plain rules.");
    onStep("think", "fail", "plain rules");
    return null;
  });
  onStep("faces", "run");
  const facesJob = (async () => {
    if (isWindows()) {
      notes.push("Speaker framing needs macOS for now, so every shot is centred.");
      onStep("faces", "skip", "centred");
      return {};
    }
    try {
      const rt = await ensureFaceRuntime(sdk, (s) => onStep("faces", "run", s));
      const jobs = src.clips.filter((c) => c.path && c.srcStart >= 0).map((c) => ({ id: String(c.clipId), path: c.path, start: c.srcStart, end: c.srcStart + (c.e - c.s) / fps }));
      const dir = fs().join(dataRoot(), "sources", ctx.sequenceId);
      const faces2 = await trackFaces(sdk, rt, dir, jobs);
      const n = Object.values(faces2).reduce((a, f) => a + f.shots.filter((s) => s.face).length, 0);
      onStep("faces", "done", n + " shot" + (n === 1 ? "" : "s") + " with a face");
      return faces2;
    } catch (e) {
      notes.push("Speaker framing was skipped (" + String(e?.message || e).slice(0, 160) + "), so shots are centred.");
      onStep("faces", "fail", "centred");
      return {};
    }
  })();
  const [semantic, faces] = await Promise.all([think, facesJob]);
  onStep("cut", "run", "Tightening pauses\u2026");
  const cut = planPauses(src.words, fps, src.endFrame, semantic?.tags || {});
  const layout = layoutRanges(cut.ranges, src.clips, fps);
  const framing = planFraming(layout, faces, fps);
  const base = src.name.replace(/\s+·\s+9:16.*$/, "") + " \xB7 a16z Short";
  const made = await createShort(sdk, pid, ctx.sequenceId, base, cut.ranges, framing.clips, fps);
  onStep("cut", "done", cut.removed.toFixed(1) + " s of pauses removed, " + cut.cuts + " cuts");
  const job = { version: 1, projectId: pid, sourceId: ctx.sequenceId, shortId: made.id, name: made.name, fps, semantic, framing, layout, faces, srcWords: tw, opts };
  await saveJob(job);
  const more = await build(sdk, job, onStep);
  await script(sdk, "Open the Short", `return await selects.editor.openDraft(${J(made.id)});`).catch(() => null);
  return { shortId: made.id, name: made.name, notes: [...notes, ...more], seconds: (Date.now() - t0) / 1e3 };
}
async function rebuildShort(sdk, shortId, opts, onStep) {
  const t0 = Date.now();
  const job = await loadJob(shortId);
  if (!job) throw new Error("This Draft was not made by this panel, so there is nothing to rebuild.");
  job.opts = { ...job.opts, ...opts };
  for (const id of ["read", "faces", "cut"]) onStep(id, "skip", "kept");
  if (!job.semantic) {
    onStep("think", "run", "Reading the story\u2026");
    job.semantic = await semanticPass(sdk, job.srcWords, opts.hint).catch(() => null);
    onStep("think", job.semantic ? "done" : "fail", job.semantic ? (job.semantic.tags.keyTerms?.length || 0) + " key terms" : "plain rules");
    await saveJob(job);
  } else onStep("think", "skip", "kept");
  await stripShort(sdk, shortId, [job.musicId || "", ...job.brollIds || []]);
  const notes = await build(sdk, job, onStep);
  return { shortId, name: job.name, notes, seconds: (Date.now() - t0) / 1e3 };
}
async function build(sdk, job, onStep) {
  const notes = [];
  if (job.layout && job.faces) job.framing = planFraming(job.layout, job.faces, job.fps);
  const pid = job.projectId;
  const dir = jobDir(job.shortId);
  const short = await readDraft(sdk, pid, job.shortId, "Read the Short");
  const fps = short.fps;
  const end = short.endFrame;
  const key = job.shortId.replace(/-/g, "").slice(0, 12);
  onStep("music", job.opts.music ? "run" : "skip", job.opts.music ? "Composing\u2026" : "off");
  const musicJob = !job.opts.music ? Promise.resolve(null) : job.musicPath && fs().existsSync(job.musicPath) ? Promise.resolve(job.musicPath) : (async () => {
    mediaGeneration();
    return makeMusic(pid, end / fps, dir, key, (s) => onStep("music", "run", s));
  })().catch((e) => {
    notes.push("Music: " + String(e?.message || e).slice(0, 200));
    onStep("music", "fail", String(e?.message || e).slice(0, 80));
    return null;
  });
  const prep = prepareShort(job, short);
  let placed = [];
  let insertTimes = [];
  if (job.opts.broll !== false && job.semantic?.broll?.length) {
    onStep("broll", "run", "Finding footage\u2026");
    try {
      const blocked = prep.cards.map((c) => [c.a / fps, c.b / fps]);
      const runs = planInserts(prep.words, job.semantic.broll, prep.duration, blocked, { earliest: prep.title ? prep.title.b / fps + 0.3 : 2.4, starts: unitStarts(job, prep) });
      job.brollCache = job.brollCache || {};
      const got = await fetchInserts(sdk, runs, dir, (s) => onStep("broll", "run", s), job.brollCache);
      notes.push(...got.notes);
      if (got.shots.length) {
        const paths = [...new Set(got.shots.map((x) => x.clip.path))];
        const imp = await importFiles(sdk, pid, paths);
        const idOf = (p) => imp.find((x) => x.path === p)?.id || "";
        job.brollIds = [.../* @__PURE__ */ new Set([...job.brollIds || [], ...imp.map((x) => x.id).filter(Boolean)])];
        const lost = imp.filter((x) => !x.id).length;
        if (lost) notes.push("B-roll: " + lost + " of " + imp.length + " clips could not be added to the Project and were left out.");
        placed = got.shots.filter((x) => idOf(x.clip.path)).map((x, k) => ({
          id: idOf(x.clip.path),
          a: Math.round(x.a * fps),
          // never past the end of the cut clip
          b: Math.min(Math.round(x.b * fps), Math.round(x.a * fps) + (x.clip.dur ? Math.floor((x.clip.dur - 0.06) * fps) : 1e9)),
          sw: x.clip.width,
          sh: x.clip.height,
          rect: coverRect(x.clip.width, x.clip.height, 1080, 1920),
          // a slow push on about one shot in six
          push: k % 6 === 2 ? 0.06 : 0
        }));
        placed = placed.filter((x) => x.b - x.a >= Math.round(0.5 * fps));
        insertTimes = placed.map((x) => ({ a: x.a / fps, b: x.b / fps, bright: (got.shots.find((g) => idOf(g.clip.path) === x.id && Math.round(g.a * fps) === x.a)?.luma ?? 0) > 175 }));
        const credits = [...new Set(got.shots.map((x) => x.clip.credit + " (" + x.clip.service + ")"))];
        notes.push("Stock footage: " + credits.join(", ") + ".");
      }
      const cover = insertTimes.reduce((n, x) => n + x.b - x.a, 0) / prep.duration;
      onStep("broll", got.shots.length ? "done" : "skip", placed.length + " shots, " + Math.round(cover * 100) + "% of the Short");
    } catch (e) {
      notes.push("B-roll: " + String(e?.message || e).slice(0, 200));
      onStep("broll", "fail", String(e?.message || e).slice(0, 80));
    }
  } else onStep("broll", "skip", job.opts.broll === false ? "off" : "no footage moments");
  onStep("captions", "run", "Designing captions\u2026");
  const src0 = short.clips[0];
  const filled = job.opts.cards !== false ? fillCoverage(prep, insertTimes, unitStarts(job, prep), !!(job.opts.name || job.semantic?.speaker), src0 && src0.sw && src0.sh ? src0.sw / src0.sh : 16 / 9) : 0;
  if (filled) notes.push(filled + " designed card" + (filled === 1 ? "" : "s") + " added to keep the picture moving.");
  const covered = [
    ...insertTimes.map((x) => [x.a, x.b]),
    ...prep.cards.map((c) => [c.a / fps, c.b / fps]),
    ...prep.title ? [[0, prep.title.b / fps]] : []
  ];
  const framing = addFramingChanges(job.framing, covered, unitStarts(job, prep), fps, prep.duration);
  const view = { ...job, framing };
  prep.cuts = [.../* @__PURE__ */ new Set([...prep.cuts, ...framing.cuts])].sort((a, b) => a - b);
  const fonts = await readFonts(sdk);
  const look = await buildGraphic({ job: view, prep, fonts, logo: job.opts.logo, inserts: insertTimes });
  notes.push(...look.notes);
  const musicPath = await musicJob;
  let music = null;
  let voiceDb = 0;
  try {
    if (job.voiceLufs == null) {
      const first = short.clips[0];
      job.voiceLufs = first?.path && first.srcStart >= 0 ? await loudness(sdk, first.path, first.srcStart, Math.min(60, (end - first.s) / fps)) : null;
    }
    let musicLufs = null;
    if (musicPath) {
      musicLufs = await loudness(sdk, musicPath);
      if (job.musicPath !== musicPath || !job.musicId) {
        const imp = await importFiles(sdk, pid, [musicPath]);
        job.musicId = imp[0]?.id || null;
        job.musicPath = musicPath;
        if (!job.musicId) {
          notes.push("Music: the bed could not be added to the Project; the Short has no music.");
          onStep("music", "fail", "could not add it to the Project");
        }
      }
    }
    const g = gains(job.voiceLufs ?? null, musicLufs);
    voiceDb = g.voiceDb;
    if (musicPath && job.musicId) {
      music = { id: job.musicId, db: g.musicDb };
      onStep("music", "done", "bed " + (musicLufs != null && job.voiceLufs != null ? "9 dB under the voice" : "added"));
    }
  } catch (e) {
    notes.push("Levels: " + String(e?.message || e).slice(0, 160));
  }
  await saveJob(job);
  await finishShort(sdk, job.shortId, pid, end, look.data, music, voiceDb, placed, fps, { clips: framing.clips, windows: prep.windows });
  onStep("captions", "done", look.summary);
  return notes;
}
async function readFonts(sdk) {
  let root = "";
  try {
    root = (await shell(sdk, "Locate plugin files", 'printf %s "$SELECTS_USER_SKILLS_ROOT"', 1e4)).trim();
  } catch {
  }
  const read2 = async (file) => {
    if (!root) return "";
    try {
      return String(await fs().readFile(fs().join(root, "a16z-style-captions", "fonts", file), "utf8")).trim();
    } catch {
      return "";
    }
  };
  const [sans, serif, roman, light] = await Promise.all([read2("InterDisplay-Medium.woff2.b64"), read2("EditorialSerif-Italic.woff2.b64"), read2("EditorialSerif-Regular.woff2.b64"), read2("EditorialSerif-Light.woff2.b64")]);
  return { sans, serif, roman, light };
}

// plugins/a16z-style-captions/src/Panel.tsx
var STORE = "a16z-style-captions:v2:";
var read = (k) => {
  try {
    return localStorage.getItem(STORE + k) || "";
  } catch {
    return "";
  }
};
var write = (k, v) => {
  try {
    if (v) localStorage.setItem(STORE + k, v);
    else localStorage.removeItem(STORE + k);
  } catch {
  }
};
var fresh = () => STEPS.map(([id, label]) => ({ id, label, state: "wait" }));
var run = { busy: false, steps: fresh(), error: "", result: null, startedAt: 0 };
var listeners = /* @__PURE__ */ new Set();
var setRun = (patch) => {
  run = { ...run, ...patch };
  listeners.forEach((l) => l());
};
function A16zShort({ sdk, context }) {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  const [name, setName] = useState(() => read("name"));
  const [role, setRole] = useState(() => read("role"));
  const [logo, setLogo] = useState(() => read("logo"));
  const [hint, setHint] = useState("");
  const [music, setMusic] = useState(() => read("music") !== "0");
  const [cards, setCards] = useState(() => read("cards") !== "0");
  const [broll, setBroll] = useState(() => read("broll") !== "0");
  const [isShort, setIsShort] = useState(false);
  const [clock, setClock] = useState(0);
  const alive = useRef(true);
  useEffect(() => () => void (alive.current = false), []);
  useEffect(() => {
    setIsShort(false);
    if (context?.sequenceId) loadJob(context.sequenceId).then((j) => alive.current && setIsShort(!!j)).catch(() => {
    });
  }, [context?.sequenceId, run.result?.shortId]);
  useEffect(() => {
    if (!run.busy) return;
    const id = setInterval(() => alive.current && setClock(Math.round((Date.now() - run.startedAt) / 1e3)), 1e3);
    return () => clearInterval(id);
  }, [run.busy]);
  const onStep = (id, state, note) => setRun({ steps: run.steps.map((s) => s.id === id ? { ...s, state, note: note ?? s.note } : s) });
  const go = async (rebuild) => {
    if (run.busy) return;
    if (!context?.sequenceId || !context?.projectId) {
      setRun({ error: "Open a talking-head Draft first." });
      return;
    }
    const opts = { name: name.trim(), role: role.trim(), logo: logo.trim(), music, cards, broll, hint: hint.trim() };
    write("name", opts.name);
    write("role", opts.role);
    write("logo", opts.logo);
    write("music", music ? "" : "0");
    write("cards", cards ? "" : "0");
    write("broll", broll ? "" : "0");
    setRun({ busy: true, error: "", result: null, steps: fresh(), startedAt: Date.now() });
    try {
      const r = rebuild ? await rebuildShort(sdk, context.sequenceId, opts, onStep) : await makeShort(sdk, { projectId: context.projectId, sequenceId: context.sequenceId }, opts, onStep);
      setRun({ result: r });
    } catch (e) {
      setRun({ error: String(e?.message || e), steps: run.steps.map((s) => s.state === "run" ? { ...s, state: "fail" } : s) });
    } finally {
      setRun({ busy: false });
    }
  };
  const open = async () => {
    if (!run.result) return;
    await sdk.runScript({ summary: "Open the Short", script: "return await selects.editor.openDraft(" + JSON.stringify(run.result.shortId) + ");" });
  };
  const busy = run.busy;
  const icon = (s) => s === "done" ? "\u2713" : s === "run" ? "\u2026" : s === "fail" ? "!" : s === "skip" ? "\u2013" : "\xB7";
  const field = { display: "flex", flexDirection: "column", gap: 4 };
  const muted = { color: "var(--panel-muted-fg)" };
  return /* @__PURE__ */ React.createElement("div", { style: { padding: 16, display: "flex", flexDirection: "column", gap: 14, fontSize: 13, lineHeight: 1.45 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 15, fontWeight: 600 } }, "a16z-style Short, one click"), /* @__PURE__ */ React.createElement("div", { style: muted }, "Turns this talking-head Draft into a new 9:16 Short in the a16z house style: tightened pauses, speaker framing, editorial captions with lockups and emphasis, keyword cards, B-roll, a name tag and a music bed.")), /* @__PURE__ */ React.createElement("label", { style: field }, /* @__PURE__ */ React.createElement("span", null, "Speaker name (optional, for the name tag)"), /* @__PURE__ */ React.createElement("input", { type: "text", value: name, disabled: busy, placeholder: "e.g. Jane Doe", onChange: (e) => setName(e.target.value) })), /* @__PURE__ */ React.createElement("label", { style: field }, /* @__PURE__ */ React.createElement("span", null, "Role line"), /* @__PURE__ */ React.createElement("input", { type: "text", value: role, disabled: busy, placeholder: "e.g. Founder, Example Labs", onChange: (e) => setRole(e.target.value) })), /* @__PURE__ */ React.createElement("label", { style: field }, /* @__PURE__ */ React.createElement("span", null, "Your logo (optional): path to a small PNG or SVG, shown top right"), /* @__PURE__ */ React.createElement("input", { type: "text", value: logo, disabled: busy, placeholder: "~/Pictures/logo.png", onChange: (e) => setLogo(e.target.value) })), /* @__PURE__ */ React.createElement("label", { style: field }, /* @__PURE__ */ React.createElement("span", null, "Note for the editor (optional)"), /* @__PURE__ */ React.createElement("input", { type: "text", value: hint, disabled: busy, placeholder: "e.g. the key idea is 'taste'", onChange: (e) => setHint(e.target.value) })), /* @__PURE__ */ React.createElement("label", { style: { display: "flex", gap: 8, alignItems: "center" } }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: music, disabled: busy, onChange: (e) => setMusic(e.target.checked) }), /* @__PURE__ */ React.createElement("span", null, "Music bed (AI-generated, uses generation credits)")), /* @__PURE__ */ React.createElement("label", { style: { display: "flex", gap: 8, alignItems: "center" } }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: cards, disabled: busy, onChange: (e) => setCards(e.target.checked) }), /* @__PURE__ */ React.createElement("span", null, "Keyword cards")), /* @__PURE__ */ React.createElement("label", { style: { display: "flex", gap: 8, alignItems: "center" } }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: broll, disabled: busy, onChange: (e) => setBroll(e.target.checked) }), /* @__PURE__ */ React.createElement("span", null, "B-roll from stock footage (Pexels and Pixabay)")), isShort && /* @__PURE__ */ React.createElement("button", { onClick: () => go(true), disabled: busy, style: { padding: "10px 12px", fontWeight: 600, cursor: busy ? "default" : "pointer" } }, "Rebuild captions and graphics"), /* @__PURE__ */ React.createElement("button", { onClick: () => go(false), disabled: busy, style: { padding: "10px 12px", fontWeight: 600, cursor: busy ? "default" : "pointer" } }, busy ? "Making the Short\u2026 " + clock + " s" : isShort ? "Make a new Short from this Draft" : "Make the Short"), (busy || run.steps.some((s) => s.state !== "wait")) && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } }, run.steps.map((s) => /* @__PURE__ */ React.createElement("div", { key: s.id, style: { display: "flex", gap: 8, opacity: s.state === "wait" ? 0.5 : 1 } }, /* @__PURE__ */ React.createElement("span", { style: { width: 14, textAlign: "center" } }, icon(s.state)), /* @__PURE__ */ React.createElement("span", { style: { flex: 1 } }, s.label, s.note ? /* @__PURE__ */ React.createElement("span", { style: muted }, " \u2014 ", s.note) : null)))), run.error && /* @__PURE__ */ React.createElement("div", { style: { color: "var(--panel-destructive-fg, #e5484d)", whiteSpace: "pre-wrap" } }, run.error), run.result && !busy && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } }, /* @__PURE__ */ React.createElement("div", null, "Made \u201C", run.result.name, "\u201D in ", Math.round(run.result.seconds), " s."), run.result.notes.length ? /* @__PURE__ */ React.createElement("ul", { style: { margin: 0, paddingLeft: 18, ...muted } }, run.result.notes.map((n, i) => /* @__PURE__ */ React.createElement("li", { key: i }, n))) : null, /* @__PURE__ */ React.createElement("button", { onClick: open, style: { padding: "8px 12px" } }, "Open the Short")), /* @__PURE__ */ React.createElement("div", { style: { ...muted, fontSize: 11 } }, "A style study, not affiliated with a16z. Use your own name, role and logo."));
}
export {
  A16zShort as default
};
