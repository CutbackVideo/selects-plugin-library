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
const tree: any = await p.sourceFiles();
const files: any[] = [];
const walk = (nodes: any[]) => { for (const n of nodes || []) { if (n.type === "dir") walk(n.children); else files.push(n); } };
walk(Array.isArray(tree) ? tree : ("fileTree" in tree ? tree.fileTree : []));
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
- broll: moments where real footage of a concrete thing would carry the line, as an a16z editor cuts away from the speaker: an object, a place, an action or an era the words literally name (never a metaphor, a feeling or an abstract idea; skip the opening and the final sentence; never two moments in a row). About one per 6 seconds. {"s", "q": the 4-12 spoken words it covers, "kind": "object" | "place" | "action" | "era" | "people", "query": a 2-4 word stock-footage search naming that exact thing in plain documentary terms (prefer objects and places over people; no names, brands or abstract words), "alt": a second search for the same thing}.
- designs: designed full-screen inserts the a16z team builds from the words themselves (0-5, about one per 12-15 s, at least 5 s apart, not in the first 3 s or the last 2 s, never on the same words as a card or a broll moment). Every text field is copied exactly from the transcript except "numeral". Kinds:
  {"kind": "chapter", "s", "numeral": "I." / "II." / "III.", "q": the 2-7 spoken words naming that section} - only when the speaker announces numbered sections or reasons ("the first one is", "number two").
  {"kind": "list", "s", "items": ["...", "...", "..."]} - three or more items named in a row (1-4 spoken words each, in spoken order; they may run into the next sentences).
  {"kind": "versus", "s", "left": "...", "connector": "&" | "vs" | "or" | "not", "right": "..."} - two things set against each other (1-5 spoken words each).
  {"kind": "number", "s", "q": the spoken number words, "numeral": how it is written ("1000x", "97%", "10 years"), "label": 1-4 spoken words saying what it counts} - a magnitude that pays off a claim.
  {"kind": "bubbles", "s", "lines": [{"who": "them" | "me", "q": "..."}]} - a short exchange or message the speaker quotes (each line 2-12 spoken words; "me" is the speaker's side).
  {"kind": "quote", "s", "q": the single thesis sentence (4-10 spoken words), "key": the one word of it to set in serif italic}.`;
var SHAPE = `{"format":"standard","hook":{"type":"H1","big":"AI native"},"key":[{"s":3,"q":"much less","kind":"I","p":4}],"punch":[{"s":9,"q":"keep doing stuff"}],"compounds":[{"s":2,"q":"venture capital"}],"reveal":[],"quotes":[],"drops":[],"cards":[{"s":5,"q":"the inventor","text":"inventor"}],"broll":[{"s":4,"q":"the first time I walked into the factory","kind":"place","query":"factory floor machines","alt":"assembly line"}],"designs":[{"kind":"list","s":9,"items":["taste","experience","soul"]}]}`;
async function ask(sdk, prompt, images) {
  let last = null;
  const waits = [0, 4e3, 12e3, 3e4, 6e4];
  for (let attempt = 0; attempt < waits.length; attempt += 1) {
    if (waits[attempt]) await new Promise((r) => setTimeout(r, waits[attempt]));
    try {
      return (await sdk.askAI(images && images.length ? { prompt, timeoutMs: 3e5, images } : { prompt, timeoutMs: 3e5 })).text;
    } catch (e) {
      last = e;
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
    return { head: headOf(words2, sp), span: sp, kind, priority: Math.max(1, Math.min(5, Math.round(Number(k.p) || 3))) };
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
  return { tags, cards, broll, designs, missing, raw };
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
      const conn = ["&", "vs", "or", "not"].includes(d.connector) ? d.connector : "&";
      if (l && r) out.push({ kind: "versus", parts: [{ role: "item", span: l, text: String(d.left) }, { role: "connector", span: null, text: conn }, { role: "item", span: r, text: String(d.right) }] });
    } else if (d?.kind === "number") {
      const sp = f(s, d.q);
      const lab = d.label ? near(s, String(d.label)) : null;
      const numeral = String(d.numeral || "").trim();
      if (sp && /\d/.test(numeral)) out.push({ kind: "number", numeral, parts: [{ role: "key", span: sp, text: numeral }, ...lab ? [{ role: "label", span: lab, text: String(d.label) }] : []] });
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
function planFraming(clips, faces, fps) {
  const out = [];
  const shots = [];
  const cuts = [];
  let framed = 0;
  let total = 0;
  let m = 1;
  let lastCutAt = -1e9;
  let lastM = 1;
  let jumps = 0;
  clips.forEach((c, ci) => {
    const found = faces[String(c.src.clipId)];
    const sw = found?.W || c.src.sw || 1920;
    const sh = found?.H || c.src.sh || 1080;
    const srcIn = c.srcIn;
    const srcOut = srcIn + (c.end - c.start) / fps;
    const list = (found?.shots || []).filter((s) => s.end > srcIn && s.start < srcOut);
    const withFace = (found?.shots || []).filter((s) => s.face);
    if (c.jump) {
      jumps += 1;
      const r = hash(jumps + ci);
      let next = r < 0.45 ? m : m === 1 ? r < 0.75 ? 1.1 : 1.18 : 1;
      const t = c.start / fps;
      if (next === lastM && t - lastCutAt < 0.8) next = m === 1 ? 1.1 : 1;
      m = next;
    } else if (ci > 0) m = 1;
    if (ci > 0) {
      cuts.push(c.start / fps);
      lastCutAt = c.start / fps;
      lastM = m;
    }
    const pieces = list.length ? list : [{ start: srcIn, end: srcOut, face: null }];
    const clipShots = [];
    pieces.forEach((s, i) => {
      let face = s.face;
      if (!face && withFace.length) {
        const mid = (s.start + s.end) / 2;
        face = withFace.slice().sort((a, b) => Math.abs((a.start + a.end) / 2 - mid) - Math.abs((b.start + b.end) / 2 - mid))[0].face;
      }
      const from = i === 0 ? c.start : Math.max(c.start, Math.min(c.end, c.start + Math.round((s.start - srcIn) * fps)));
      const to = i === pieces.length - 1 ? c.end : Math.max(c.start, Math.min(c.end, c.start + Math.round((s.end - srcIn) * fps)));
      if (to <= from) return;
      const fr = shotFrame(sw, sh, face);
      const ax = fr.face ? fr.face.cx * W : W / 2;
      const ay = fr.face ? fr.face.eyes * H : H * 0.4;
      const rect = punch(fr.rect, m, ax, ay);
      clipShots.push({ from, to, ...rect });
      total += 1;
      if (fr.face) framed += 1;
      if (i > 0) cuts.push(from / fps);
      const f = fr.face ? { cx: (ax + (fr.face.cx * W - ax) * m) / W, cy: (ay + (fr.face.eyes + fr.face.chin) / 2 * H - ay) / H, w: 0, h: fr.face.h * m, chin: (ay + (fr.face.chin * H - ay) * m) / H } : null;
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
var lookCode = 'import m from"react";import{useCurrentFrame as b}from"remotion";var e=(a,p)=>typeof a=="number"&&Number.isFinite(a)?a:p;function c({Source:a,data:p}){let t=p||{},n=e(t.W,1080),o=e(t.H,1920),l=e(t.sw,1920),d=e(t.sh,1080),u=b()+e(t.start,0),s=Array.isArray(t.shots)?t.shots:[],i=s.find(r=>u>=r.from&&u<r.to)||s[s.length-1]||{x:0,y:(o-n*d/l)/2,w:n,h:n*d/l},h="";if(t.push&&t.end&&t.end>e(t.start,0)){let r=1+t.push*Math.max(0,Math.min(1,(u-e(t.start,0))/(t.end-e(t.start,0))));h="translate("+n/2+"px,"+o/2+"px) scale("+r.toFixed(4)+") translate("+-n/2+"px,"+-o/2+"px)"}else if(t.open&&s.length&&i===s[0]){let r=(u-e(s[0].from,0))*(24/e(t.fps,24)),f=1+(t.open.s0-1)*Math.pow(.68,Math.max(0,r));f>1.0005&&(h="translate("+t.open.ax+"px,"+t.open.ay+"px) scale("+f.toFixed(4)+") translate("+-t.open.ax+"px,"+-t.open.ay+"px)")}return m.createElement("div",{style:{position:"absolute",inset:0,overflow:"hidden",backgroundColor:"#000"}},m.createElement("div",{style:{position:"absolute",left:0,top:0,width:n,height:o,transformOrigin:"0 0",transform:"scale("+l/n+", "+d/o+")",overflow:"hidden"}},m.createElement("div",{style:{position:"absolute",left:0,top:0,width:n,height:o,transform:h||void 0,transformOrigin:"0 0"}},m.createElement("div",{style:{position:"absolute",left:i.x,top:i.y,width:i.w,height:i.h,filter:t.grade||void 0}},m.createElement(a,null)))))}export{c as default};\n';
var graphicCode = `import rt,{useEffect as Et,useState as Ct}from"react";import{useCurrentFrame as Xt,delayRender as Yt,continueRender as Kt}from"remotion";var ot={},st={};function gt(){for(let t of Object.keys(ot))delete ot[t];for(let t of Object.keys(st))delete st[t]}var nt;function yt(){if(nt!==void 0)return nt;try{nt=typeof document>"u"?null:document.createElement("canvas").getContext("2d")}catch{nt=null}return nt}var Ft=(t,o)=>(t.style==="italic"?"italic ":"")+t.weight+" "+o+"px "+t.family;function X(t,o){let e=o.family+"|"+o.weight+"|"+o.style+"|"+t;if(ot[e]!=null)return ot[e];let i=0,s=yt();if(s){s.font=Ft(o,100);let r=s.measureText(t);r&&r.width>0&&(i=r.width)}return i>0||(i=t.length*o.estimate*100),ot[e]=i,i}function E(t){let o=t.family+"|"+t.weight+"|"+t.style;if(st[o])return st[o];let e={xh:.53,cap:.72,ascent:.95,descent:.25},i=yt();if(i){i.font=Ft(t,100);let s=i.measureText("xzvw"),r=i.measureText("HXEI"),n=Number(s.actualBoundingBoxAscent)/100,l=Number(r.actualBoundingBoxAscent)/100,d=Number(r.fontBoundingBoxAscent)/100,a=Number(r.fontBoundingBoxDescent)/100;n>.2&&l>.3&&d>0&&(e={xh:n,cap:l,ascent:d,descent:a>=0?a:.25})}return st[o]=e,e}import Bt from"react";var Z={};function wt(){for(let t of Object.keys(Z))delete Z[t]}var kt=(t,o)=>o===1?t.serif:o===2?t.roman:t.sans;function dt(t,o,e,i){if(t!==o.sans)return-.012;let s="and the world",r=X(s,t)/100*i,n=(.5*e-r)/(s.length*i);return Math.max(-.045,Math.min(0,n))}function J(t,o,e,i){let s=0,r=[];return t.toks.forEach((n,l)=>{let d=dt(n.face,o,e,i)*n.size,a=X(n.text,n.face)/100*n.size+n.text.length*d;if(l>0){let f=X(" ",o.sans)/100*Math.min(n.size,t.toks[l-1].size)*.86;s+=f}r.push({dx:s,w:a}),s+=a}),{width:s,parts:r}}function ut(t,o,e,i,s){let r=e.uid+"|"+o+"|"+s.toFixed(3);if(Z[r])return Z[r];let n=e.W,l=e.H,d=E(i.sans),a=e.xh*l/d.xh,f=t.g||1,k=(u,h)=>u===i.sans?h:h*d.xh/E(u).xh,W=(u,h)=>kt(i,h||u),g=t.l.map(u=>({from:u[0],to:u[1],scale:u[2],face:u[3],big:u[4]===1})),w=g.findIndex(u=>u.big),y=[],C=(u,h)=>{let T=g[u];return{align:"center",toks:t.t.slice(T.from,T.to).map((j,Q)=>{let V=W(T.face,j[2]);return{text:j[0],face:V,size:k(V,h),reveal:j[1],accent:j[3],kept:(t.sw||0)>T.from+Q}})}},P=0,H=0;if(g.length===1||w<0){let u=(e.xh<.029?.9:.86)*n,h=t.y*l;g.forEach((j,Q)=>{let V=a*g[Q].scale*f*s,ct=C(Q,V),et=J(ct,i,n,a);et.width>u&&(V*=u/et.width,ct=C(Q,V),et=J(ct,i,n,a));let xt=d.cap*V,lt=Q===0?h+xt/2:h,At=(n-et.width)/2;ct.toks.forEach(($,Lt)=>y.push({text:$.text,x:At+et.parts[Lt].dx,base:lt,size:$.size,face:$.face,track:dt($.face,i,n,a)*$.size,reveal:$.reveal,accent:$.accent,kept:$.kept})),Q===0&&(P=lt-xt),H=lt+d.descent*V*.5,h=lt+V*1.12});let T={tokens:y,top:P,bottom:H};return Z[r]=T,T}let O=kt(i,g[w].face),A=a*g[w].scale*s,x=C(w,A),c=J(x,i,n,a);c.width>.8*n&&(A*=.8*n/c.width,x=C(w,A),c=J(x,i,n,a)),A=Math.min(A,3.3*a),x=C(w,A),c=J(x,i,n,a);let m=E(O).xh*k(O,A),p=Math.max(.7*a,.42*m/d.xh)*1,F=[],M=t.tp==="stack"||t.tp==="two";F.push({li:w,line:x,m:c,base:0,x0:0});let z=0;for(let u=w-1;u>=0;u-=1){let h=C(u,p*s),T=J(h,i,n,a),j=E(O).cap*k(O,A);z=u===w-1?-(j+.12*m):z-1.08*p*s,F.push({li:u,line:h,m:T,base:z,x0:M?(c.width-T.width)/2:0})}z=0;for(let u=w+1;u<g.length;u+=1){let h=C(u,p*s),T=J(h,i,n,a),j=p*s;z=u===w+1?M?E(O).descent*k(O,A)+d.cap*j+.05*m:It(x,c,j,m,d.xh):z+1.08*j;let Q=Math.min(c.width+.06*n,Math.max(c.width,T.width));F.push({li:u,line:h,m:T,base:z,x0:M?(c.width-T.width)/2:Q-T.width})}let v=1e9,L=-1e9,I=1e9,b=-1e9;for(let u of F){v=Math.min(v,u.x0),L=Math.max(L,u.x0+u.m.width);let h=u.line.toks[0]?.size||a,T=u.line.toks[0]?.face||i.sans;I=Math.min(I,u.base-E(T).cap*h),b=Math.max(b,u.base+E(T).descent*h*.4)}let N=t.y*l-d.cap*a/2-I;b+N>.83*l&&(N=.83*l-b);let q=(n-(L-v))/2-v;for(let u of F)u.line.toks.forEach((h,T)=>y.push({text:h.text,x:q+u.x0+u.m.parts[T].dx,base:u.base+N,size:h.size,face:h.face,track:dt(h.face,i,n,a)*h.size,reveal:h.reveal,accent:h.accent,kept:h.kept}));let G={tokens:y,top:I+N,bottom:b+N};return Z[r]=G,G}function It(t,o,e,i,s){let r=!1;t.toks.forEach((l,d)=>{let a=o.parts[d];a.dx+a.w>o.width*.4&&/[gjpqy,;]/.test(l.text)&&(r=!0)});let n=t.toks[0]?.size||0;return(r?.24*n+.15*e:.14*i)+s*e}var Ot=(t,o,e)=>{let i=n=>[1,3,5].map(l=>parseInt(n.slice(l,l+2),16)),s=i(t),r=i(o);return"rgb("+s.map((n,l)=>Math.round(n+(r[l]-n)*e)).join(",")+")"};function vt(t,o,e,i,s,r){let n=ut(t,o,i,s,r),l=i.W/1080,d=i.xh*i.H,[a,f,k,W]=t.e;return n.tokens.map((g,w)=>{if(e<g.reveal&&!g.kept)return null;let y=g.kept?1e6:e-g.reveal,C=0,P=0,H=0;if(a==="b"&&y<k){let m=Math.min(1,y/Math.max(1,k)),p=W==="c"?Math.pow(1-m,3):Math.pow(1-m,2);C=f*p*l,P=.35*Math.pow(1-m,2)}else a==="r"&&y<3&&(H=.4*d*Math.pow(1-y/3,3));let O=t.d?"#363636":"#FFFFFF";if(g.accent&&!t.d){let p=Math.max(1,Math.round(.45*i.fps)-3);O=y<3?g.accent:Ot(g.accent,"#FFFFFF",Math.min(1,(y-3)/p))}let A=E(g.face),x=g.base-g.size*(1+A.ascent-A.descent)/2+H,c=t.d?"none":"0 "+(1*l).toFixed(1)+"px "+(.3*d).toFixed(1)+"px rgba(0,0,0,0.30)"+(P>.004?", 0 0 "+(2*C).toFixed(1)+"px rgba(255,255,255,"+P.toFixed(3)+")":"");return Bt.createElement("div",{key:o+"-"+w,style:{position:"absolute",left:g.x,top:x,fontFamily:g.face.family,fontWeight:g.face.weight,fontStyle:g.face.style,fontSize:g.size,lineHeight:1,letterSpacing:g.track,whiteSpace:"pre",color:O,textShadow:c,filter:C>.05?"blur("+C.toFixed(2)+"px)":void 0,fontKerning:"normal"}},g.text)})}import it from"react";var Gt="#8A2636",Pt=t=>1-(1-t)*(1-t),jt=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2,zt=t=>Math.max(0,Math.min(1,t));function Mt(t,o,e,i){let s=e.W,r=e.H,n=e.fps/24,l=(o-t.a)/n,d=t.cap*r,a=d/E(i.roman).cap,f=a*.68,k=a*E(i.roman).xh/E(i.serif).xh,W=X(t.first+" ",i.roman)/100*a,g=X(t.last,i.serif)/100*k,w=X(t.role,i.sans)/100*f-t.role.length*.01*f,y=.012*s,C=t.x*s,P=C+y+.0065*s,H=t.y*r,O=H+d,A=O+f*1.18,x=Math.max(W+g,w),c=H-.08*d,m=A+f*.28,p=P+x+.012*s,F=C,M=p,z=!0;if(l<7){let S=Pt(zt(l/7));F=p-(p-C)*(.35+.65*S)}else if(l<20){let S=jt(zt((l-8)/12));M=p-(p-(C+y))*S,F=C-.02*s*S}else z=!1;let v=l<8?p:z?M:0,L=E(i.roman),I=E(i.sans),b=(S,N,q,G,u,h,T=0)=>it.createElement("div",{key:S,style:{position:"absolute",left:N,top:q-G*(1+E(u).ascent-E(u).descent)/2,fontFamily:u.family,fontWeight:u.weight,fontStyle:u.style,fontSize:G,lineHeight:1,letterSpacing:T,whiteSpace:"pre",color:"#FFFFFF"}},h);return it.createElement("div",{key:"nametag",style:{position:"absolute",inset:0}},it.createElement("div",{style:{position:"absolute",inset:0,clipPath:"inset(0 0 0 "+Math.max(0,v).toFixed(1)+"px)"}},b("n1",P,O,a,i.roman,t.first+" "),b("n2",P+W,O,k,i.serif,t.last),b("n3",P,A,f,i.sans,t.role,-.01*f)),z?it.createElement("div",{style:{position:"absolute",left:F,width:Math.max(0,M-F),top:c,height:m-c,background:"linear-gradient(90deg, #962C39, #5E0A22)"}}):it.createElement("div",{style:{position:"absolute",left:C,width:y,top:H-.05*d,height:m-H-.1*d,background:Gt}}))}import D from"react";var tt=t=>Math.max(0,Math.min(1,t)),mt=t=>1-Math.pow(1-tt(t),3),pt="#0A1A3E",Y="#141414",Ut="#F4F2EA",St="#4C070E";function ft(t){let o=Math.sin(t*12.9898+78.233)*43758.5453;return o-Math.floor(o)}function bt(t,o,e,i){return D.createElement("svg",{key:t,width:"100%",height:"100%",style:{position:"absolute",inset:0,opacity:e,mixBlendMode:i}},D.createElement("filter",{id:t},D.createElement("feTurbulence",{type:"fractalNoise",baseFrequency:"0.9",numOctaves:2,seed:o,stitchTiles:"stitch"}),D.createElement("feColorMatrix",{type:"saturate",values:"0"})),D.createElement("rect",{width:"100%",height:"100%",filter:"url(#"+t+")"}))}function Rt(t,o,e){let i=t.W*105/1080;return[D.createElement("div",{key:"bg",style:{position:"absolute",inset:0,background:"linear-gradient(180deg, #8F213E 0%, #6E1429 55%, #4E0617 100%)"}}),D.createElement("div",{key:"rad",style:{position:"absolute",inset:0,background:"radial-gradient(ellipse at 50% 46%, rgba(120,30,55,0.55) 0%, rgba(40,0,10,0) 55%, rgba(30,0,8,0.55) 100%)"}}),D.createElement("svg",{key:"grid",width:"100%",height:"100%",style:{position:"absolute",inset:0,opacity:.32}},D.createElement("defs",null,D.createElement("pattern",{id:"g"+o,width:i,height:i,patternUnits:"userSpaceOnUse"},D.createElement("path",{d:"M "+i+" 0 L 0 0 0 "+i,fill:"none",stroke:"#C0637F",strokeWidth:1.6}))),D.createElement("rect",{width:"100%",height:"100%",fill:"url(#g"+o+")"})),bt("n"+o,1+Math.floor(e/2)%7,.13,"overlay")]}function ht(t,o,e,i,s=!0){let r=t.W,n=t.H,l=r*.62-i,d=n*.3,a=[];for(let k=0;k<48;k+=1){let W=Math.PI*2*k/48;a.push("M "+l.toFixed(0)+" "+d.toFixed(0)+" L "+(l+Math.cos(W)*r*1.6).toFixed(0)+" "+(d+Math.sin(W)*r*1.6).toFixed(0))}let f=[];for(let k=0;k<7;k+=1){let W=r*(.12+k*.09),g=r*.18-i*.6,w=n*.86;f.push("M "+(g-W).toFixed(0)+" "+w.toFixed(0)+" A "+W.toFixed(0)+" "+(W*1.4).toFixed(0)+" 0 0 1 "+(g+W).toFixed(0)+" "+w.toFixed(0))}return[D.createElement("div",{key:"bg",style:{position:"absolute",inset:0,background:Ut}}),s?D.createElement("svg",{key:"eng",width:"100%",height:"100%",style:{position:"absolute",inset:0,opacity:.55}},D.createElement("path",{d:a.join(" "),stroke:"#E0DACB",strokeWidth:1.2,fill:"none"}),D.createElement("path",{d:f.join(" "),stroke:"#DCD5C3",strokeWidth:1.6,fill:"none"})):null,bt("n"+o,3+Math.floor(e/2)%5,.1,"multiply")]}function B(t){return X(t.text,t.face)/100*t.size+t.text.length*(t.track||0)*t.size}function U(t,o){return o/E(t).cap}function _(t,o){let e=B(t);return e>o?{...t,size:t.size*o/e}:t}function R(t,o,e,i,s={}){let r=E(o.face);return D.createElement("div",{key:t,style:{position:"absolute",left:e,top:i-o.size*(1+r.ascent-r.descent)/2,fontFamily:o.face.family,fontWeight:o.face.weight,fontStyle:o.face.style,fontSize:o.size,lineHeight:1,letterSpacing:(o.track||0)*o.size,whiteSpace:"pre",color:o.color,...s}},o.text)}function Tt(t,o,e,i,s,r,n){let l=Math.max(1,Math.round(.35*n)),d=[],a=e;for(let f=0;f<o.text.length;f+=1){let k=o.text[f],W=X(k,o.face)/100*o.size+(o.track||0)*o.size,g=r+Math.floor(ft(f*7+t.length)*l),w=tt((s-g)/3);s>=r&&d.push(R(t+f,{...o,text:k,color:w>=1?o.color:qt("#B9B6AE",o.color,w)},a,i,{opacity:s>=g?1:0})),a+=W}return d}function qt(t,o,e){let i=n=>[1,3,5].map(l=>parseInt(n.slice(l,l+2),16)),s=i(t),r=i(o);return"rgb("+s.map((n,l)=>Math.round(n+(r[l]-n)*e)).join(",")+")"}var K=(t,o)=>t.items.filter(e=>!o||e.role===o);function Dt(t,o,e,i,s){let r=i.W,n=i.H,l=i.fps,d=l/24,a=e-t.a,f=Math.max(1,t.b-t.a),k=i.uid+"c"+o,W=E(s.sans),g=i.xh*n/W.xh,w=[],y=[],C=0,P={},H=0;if(t.kind==="keyword"){w=Rt(i,k,e),C=.05;let x=K(t)[0];if(x){let c=_({text:x.text,face:s.sans,size:U(s.sans,.057*n),color:"#FFFFFF",track:-.03},.8*r),m=.49*n+E(s.sans).cap*c.size/2,p=(e-x.at)/d;if(p>=4){let F=tt((p-4)/6);y.push(R("k"+o,c,(r-B(c))/2,m,{opacity:.36+.64*F,filter:F<1?"blur("+((1-F)*4*(r/1080)).toFixed(2)+"px)":void 0,textShadow:"0 0 "+(.12*c.size).toFixed(1)+"px rgba(255,225,232,0.45)"}))}if(p>=3&&p<7)for(let F=0;F<7;F+=1)y.push(D.createElement("div",{key:"sp"+F,style:{position:"absolute",left:(r-B(c))/2+ft(F+3)*B(c),top:m-E(s.sans).xh*c.size*(.2+.8*ft(F+17)),width:5,height:5,borderRadius:3,background:"#FFF6F8",boxShadow:"0 0 12px 5px rgba(255,220,230,0.8)",opacity:1-Math.abs(p-5)/2}}))}}else if(t.kind==="chapter"){let x=Math.max(1,Math.round(.38*l)),c=mt(a/x),m=a>f-x?mt((a-(f-x))/x):0;P={transform:"translateX("+((1-c)*r-m*r).toFixed(1)+"px)"},w=ht(i,k,e,a/f*r*.06);let F={text:t.numeral||"I.",face:s.serif,size:U(s.serif,.03*n),color:pt};y.push(R("num",F,(r-B(F))/2,.455*n));let M=K(t,"title"),z=M.map(b=>b.text).join(" "),v=_({text:z,face:s.serif,size:U(s.serif,.035*n),color:pt,track:-.01},.82*r),L=(r-B(v))/2;M.forEach((b,S)=>{let N={...v,text:(S?" ":"")+b.text};e>=b.at&&y.push(R("t"+S,N,L,.5*n+E(s.serif).cap*v.size/2)),L+=B(N)});let I=.13*r;y.push(D.createElement("div",{key:"barin",style:{position:"absolute",left:-I,top:0,width:I,height:n,background:St,opacity:c<1?1:0}})),y.push(D.createElement("div",{key:"barout",style:{position:"absolute",left:r,top:0,width:I,height:n,background:St,opacity:m>0?1:0}}))}else if(t.kind==="number"){w=ht(i,k,e,0,!1),C=.06,H=4;let x=t.numeral||K(t,"key")[0]?.text||"",c=/^([^\\d]*)([\\d,.]+)(.*)$/.exec(x),m=K(t,"key")[0]?.at??t.a,p=x;if(c){let M=Number(c[2].replace(/,/g,"")),z=Math.round(12*d),v=tt((e-m)/z),L=M*mt(v),b=(/\\./.test(c[2])?1:0)?L.toFixed(1):/,/.test(c[2])?Math.round(L).toLocaleString("en-US"):String(Math.round(L));p=c[1]+b+c[3]}if(e>=m){let M=_({text:p,face:s.roman,size:U(s.roman,.11*n),color:Y},.82*r),z=_({text:x,face:s.roman,size:U(s.roman,.11*n),color:Y},.82*r);y.push(R("n",{...M,size:z.size},(r-B({...M,size:z.size}))/2,.47*n))}K(t,"label").forEach((M,z)=>{if(e<M.at)return;let v=_({text:M.text,face:s.sans,size:g*.95,color:Y,track:-.03},.8*r);y.push(R("l"+z,v,(r-B(v))/2,.56*n+z*1.15*v.size))})}else if(t.kind==="versus"){w=[D.createElement("div",{key:"bg",style:{position:"absolute",inset:0,background:"#FDFDFD"}}),bt("n"+k,5,.06,"multiply")],H=4;let x=K(t,"item")[0],c=K(t,"connector")[0],m=K(t,"item")[1];if(x){let p=_({text:x.text,face:s.sans,size:U(s.sans,.05*n),color:Y,track:-.035},.74*r);y.push(...Tt("L",p,(r-B(p))/2,.45*n,e,x.at,l))}if(c&&e>=c.at){let p={text:c.text,face:s.serif,size:U(s.serif,.028*n),color:Y};y.push(R("C",p,(r-B(p))/2,.505*n))}if(m){let p=_({text:m.text,face:s.serif,size:U(s.serif,.05*n),color:Y},.74*r);y.push(...Tt("R",p,(r-B(p))/2,.575*n,e,m.at,l))}}else if(t.kind==="list"){w=ht(i,k,e,a/f*r*.04),H=4;let x=K(t,"title")[0];if(x&&e>=x.at){let c=_({text:x.text,face:s.serif,size:U(s.serif,.032*n),color:pt},.8*r);y.push(R("ti",c,.12*r,.3*n))}K(t,"item").forEach((c,m)=>{if(e<c.at)return;let p=Math.max(0,1-(e-c.at)/(3*d))*.01*n,F={text:m+1+".",face:s.roman,size:U(s.roman,.03*n),color:pt},M=_({text:c.text,face:s.sans,size:U(s.sans,.03*n),color:Y,track:-.03},.7*r),z=.39*n+m*.075*n+p;y.push(R("in"+m,F,.12*r,z)),y.push(R("it"+m,M,.2*r,z))})}else if(t.kind==="bubbles"){w=[D.createElement("div",{key:"bg",style:{position:"absolute",inset:0,background:"#FFFFFF"}})],H=3;let x=.3*n,c=U(s.sans,.022*n),m=c*1.25,p=.03*r,F=.012*n,M=.68*r,z=t.items.filter(v=>v.role==="me"||v.role==="them");z.forEach((v,L)=>{let I=v.text.split(/\\s+/),b=[],S="";for(let h of I){let T=S?S+" "+h:h;B({text:T,face:s.sans,size:c,color:Y})>M-2*p&&S?(b.push(S),S=h):S=T}S&&b.push(S);let N=Math.max(...b.map(h=>B({text:h,face:s.sans,size:c,color:Y})))+2*p,q=b.length*m+2*F,G=v.role==="me",u=G?.92*r-N:.08*r;if(e>=v.at){let h=mt((e-v.at)/(4*d));y.push(D.createElement("div",{key:"b"+L,style:{position:"absolute",left:u,top:x,width:N,height:q,borderRadius:.025*n,background:G?"#0A84FF":"#E9E9EB",transform:"scale("+(.85+.15*h).toFixed(3)+")",transformOrigin:G?"100% 100%":"0% 100%",opacity:.4+.6*h}},b.map((T,j)=>D.createElement("div",{key:j,style:{position:"absolute",left:p,top:F+j*m,fontFamily:s.sans.family,fontWeight:500,fontSize:c,lineHeight:m+"px",whiteSpace:"pre",color:G?"#FFFFFF":"#111111"}},T)))),G&&L===z.length-1&&e>=v.at+6*d&&y.push(R("dl",{text:"Delivered",face:s.sans,size:c*.55,color:"#8E8E93"},.92*r-B({text:"Delivered",face:s.sans,size:c*.55,color:""}),x+q+c*.75))}x+=q+.012*n})}else if(t.kind==="quote"){w=ht(i,k,e,a/f*r*.03),C=.03,H=4;let x=b=>b.role==="key"?s.serif:s.sans,c=.042*n,m=t.items.map(b=>({it:b,t:{text:b.text,face:x(b),size:U(x(b),c),color:Y,track:b.role==="key"?0:-.03}})),p=X(" ",s.sans)/100*U(s.sans,c)*.9,F=b=>b.reduce((S,N)=>S+B(N.t),0)+p*Math.max(0,b.length-1),M=[m];if(F(m)>.82*r&&m.length>2){let b=1,S=1e9;for(let N=1;N<m.length;N+=1){let q=Math.max(F(m.slice(0,N)),F(m.slice(N)));q<S&&(S=q,b=N)}M=[m.slice(0,b),m.slice(b)]}let z=Math.max(...M.map(F)),v=z>.84*r?.84*r/z:1,L=c*v*1.75;M.forEach((b,S)=>{let N=(r-F(b)*v)/2,q=.5*n+(S-(M.length-1)/2)*L+c*v/2;b.forEach((G,u)=>{let h={...G.t,size:G.t.size*v};e>=G.it.at&&y.push(R("q"+S+"-"+u,h,N,q)),N+=B(h)+p*v})});let I={text:"\\u201C",face:s.roman,size:.16*n,color:"#E3DCCB"};y.unshift(R("qm",I,(r-B(I))/2,.5*n-L*.6))}let O=1+C*tt(a/f),A=H?1-tt(a/(H*d)):0;return D.createElement("div",{key:"card"+o,style:{position:"absolute",inset:0,overflow:"hidden",...P}},w,D.createElement("div",{style:{position:"absolute",inset:0,transform:"scale("+O.toFixed(4)+")",transformOrigin:"50% 49%"}},y),A>0?D.createElement("div",{style:{position:"absolute",inset:0,background:"#FFFFFF",opacity:A}}):null)}var Nt="Editorial Sans",at={},Wt="Editorial Serif",Ht="Editorial Roman";function Qt(t){let o=[[Nt,t?.sans||"","500","normal"],[Wt,t?.serif||"","400","italic"],[Ht,t?.roman||"","400","normal"]],e=o.some(n=>n[1]),[i,s]=Ct(!e),[r]=Ct(()=>e?Yt("caption fonts"):null);return Et(()=>{if(i)return;let n=!1,l=()=>{if(!n){n=!0,gt(),wt();for(let f of Object.keys(at))delete at[f];s(!0)}},d=([f,k,W,g])=>{if(!k)return Promise.resolve();try{return new window.FontFace(f,"url(data:font/woff2;base64,"+k+")",{weight:W,style:g}).load().then(y=>document.fonts.add(y)).catch(()=>{})}catch{return Promise.resolve()}};Promise.all(o.map(d)).then(l,l);let a=setTimeout(l,4e3);return()=>clearTimeout(a)},[i]),Et(()=>{i&&r!=null&&Kt(r)},[i,r]),i}function Vt({data:t}){let o=Xt(),e=t||{W:1080,H:1920,fps:24,uid:"g",xh:.029,units:[]},i=Qt(e.fonts),s={sans:{family:(e.fonts?.sans?'"'+Nt+'", ':"")+'"Inter Display", "Helvetica Neue", Helvetica, Arial, sans-serif',weight:500,style:"normal",estimate:.52},serif:{family:(e.fonts?.serif?'"'+Wt+'", ':"")+'"Playfair Display", Didot, "Times New Roman", serif',weight:400,style:"italic",estimate:.45},roman:{family:(e.fonts?.roman?'"'+Ht+'", ':"")+'"Playfair Display", Didot, "Times New Roman", serif',weight:400,style:"normal",estimate:.5}};if(!i)return null;let r=e.units||[],n=a=>1,l=r.map((a,f)=>({u:a,k:f})).filter(({u:a})=>o>=a.a&&o<a.b),d=(e.quoteBlocks||[]).find(a=>o>=a[0]&&o<a[1]);return rt.createElement("div",{style:{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none"}},(e.cards||[]).filter(a=>o>=a.a&&o<a.b).map((a,f)=>Dt(a,f,o,e,s)),e.nameTag&&o>=e.nameTag.a&&o<e.nameTag.b?Mt($t(e,s),o,e,s):null,d&&l.length?_t(ut(l[0].u,l[0].k,e,s,n(l[0].k)).top,e,s):null,l.map(({u:a,k:f})=>rt.createElement(rt.Fragment,{key:f},vt(a,f,o,e,s,n(f)))),e.mark?rt.createElement("img",{src:e.mark.src,style:{position:"absolute",left:.724*e.W,top:.043*e.H,width:.199*e.W,height:.052*e.H,objectFit:"contain",objectPosition:"right center",opacity:e.mark.opacity}}):null)}function _t(t,o,e){let i=o.H,s=E(e.roman),r=.023*i/.27,n=t-.006*i+.44*r;return rt.createElement("div",{style:{position:"absolute",left:0,width:o.W,top:n-r*(1+s.ascent-s.descent)/2,textAlign:"center",fontFamily:e.roman.family,fontWeight:400,fontSize:r,lineHeight:1,color:"#FFFFFF",textShadow:"0 1px "+(.3*o.xh*i).toFixed(1)+"px rgba(0,0,0,0.30)"}},"\\u201C")}function $t(t,o){let e=t.nameTag,i=t.uid;if(at[i])return at[i];let s=0;(t.units||[]).forEach((n,l)=>{n.b<=e.a||n.a>=e.b||(s=Math.max(s,ut(n,l,t,o,1).bottom))});let r=Math.min(.82,Math.max(e.y,s/t.H+.03));return at[i]={...e,y:r}}export{Vt as default};
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
    "Add the music to the Project",
    `const p = selects.project(${J(pid)});
const paths: string[] = ${J(paths)};
const list = async () => {
  const tree: any = await p.sourceFiles();
  const files: any[] = [];
  const walk = (nodes: any[]) => { for (const n of nodes || []) { if (n.type === "dir") walk(n.children); else files.push(n); } };
  walk(Array.isArray(tree) ? tree : ("fileTree" in tree ? tree.fileTree : []));
  return files;
};
// a rebuild reuses files the Project already has
const have = await list();
const missing = paths.filter((path) => !have.some((x: any) => x.path === path));
if (missing.length) await p.importFiles({ paths: missing });
const files = missing.length ? await list() : have;
return paths.map((path) => { const f = files.find((x: any) => x.path === path); return { id: f ? f.resourceId : null, path }; });`,
    true
  );
}
async function finishShort(sdk, rid, pid, endFrame, data, music, voiceDb, inserts = [], fps = 24) {
  return script(
    sdk,
    "Add B-roll, captions, graphics and music",
    `const d = selects.draft(${J(rid)});
const p = selects.project(${J(pid)});
const INS: any[] = ${J(inserts)};
const LOOK = ${J(inserts.length ? lookCode : "")};
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
    if (DISCOURSE.test(n)) s -= 2.5;
    else if (wordClass(t.t) === "CONT") s += 0.6 + Math.min(0.6, n.length / 15);
    else s -= 0.4;
  }
  if (line.length > 3) s -= 2 * (line.length - 3);
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
  if (lead > 4 || tail2 > 4) return null;
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
    if (g.kind === "plain" || g.lines.length < 2 || next.kind !== "plain" || next.sentence !== g.sentence) continue;
    const tailFrom = g.lines[g.lines.length - 1];
    if (g.lines.length - 1 <= g.big) continue;
    const tail2 = g.toks.slice(tailFrom);
    if (!tail2.every(isFunction) || tail2.some(stall) || /[.?!]$/.test(tail2[tail2.length - 1].t)) continue;
    gs[k] = { ...g, toks: g.toks.slice(0, tailFrom), lines: g.lines.slice(0, -1), template: g.lines.length - 1 === 1 ? "single" : g.big === 0 ? "headTail" : "leadBig", sentenceEnd: false, phraseEnd: false };
    gs[k + 1] = { ...next, toks: [...tail2, ...next.toks] };
  }
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
  const segY = /* @__PURE__ */ new Map();
  const yFor = (t) => {
    const s = shotAt(t);
    if (!s) return 0.5;
    if (s.kind !== "speaker") return 0.52;
    if (style.yAnchor === "fixed_050") return 0.5;
    const seg = s.segment ?? -1;
    if (segY.has(seg)) return segY.get(seg);
    const first = shots.find((x) => x.kind === "speaker" && (x.segment ?? -1) === seg && x.face) || s;
    const f = first.face;
    const y = f ? Math.min(0.8, Math.max(0.36, Math.max(0.5, f.chin + style.chinGap * f.h + 0.0225))) : 0.5;
    segY.set(seg, y);
    return y;
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
        lines[0].tier = "large";
        lines[0].scale = n <= 2 ? 1.6 : 1.37;
        role = "large";
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
      template: lines.length === 1 ? "single" : u.template,
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
      const spoken = dz.parts.filter((p) => p.span);
      const first = onset(spoken[0]?.span || null);
      const lastPart = spoken[spoken.length - 1]?.span;
      const last = lastPart ? at(lastPart[1]) : void 0;
      if (!first || !last) continue;
      const lead = dz.kind === "chapter" ? 0.1 : 0.12;
      const a = Math.round((first.s - lead) * fps);
      const minDur = dz.kind === "chapter" ? 1.6 : 1.4;
      const maxDur = dz.kind === "list" || dz.kind === "bubbles" ? 5.5 : 3.2;
      const b = Math.round(Math.min(first.s + maxDur, Math.max(first.s + minDur, last.e + 0.35)) * fps);
      if (!free(a, b)) continue;
      const items = dz.parts.map((p, k) => {
        const w = onset(p.span);
        const prev = dz.parts[k - 1]?.span ? at(dz.parts[k - 1].span[1]) : void 0;
        const t = w ? w.s : prev ? prev.e : first.s;
        const text = p.role === "key" && dz.kind === "number" ? p.text : p.text.replace(/["“”]/g, "").split(/\s+/).map(caseWord).join(" ");
        return { text, at: Math.max(a, Math.round((t - 1 / fps) * fps)), role: p.role };
      });
      place({ a, b, kind: dz.kind, items, numeral: dz.numeral });
    }
  }
  cards.sort((x, y) => x.a - y.a);
  for (const c of cards) cuts.push(c.a / fps, c.b / fps);
  cuts.sort((a, b) => a - b);
  return { fps, duration, words: words2, semantic, cuts, cards, suppress };
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
  const nm = (job.opts.name || "").trim();
  if (nm) {
    const parts = nm.split(/\s+/);
    const last = parts.length > 1 ? parts.pop() : "";
    const firstCard = cards.length ? cards[0].a : Infinity;
    const firstInsert = o.inserts.length ? Math.round(o.inserts[0].a * fps) : Infinity;
    const a = Math.round(0.1 * fps);
    const b = Math.min(firstCard, firstInsert, a + Math.round(2.6 * fps));
    const y = Math.min(0.8, (track.units[0]?.y || 0.55) + 0.12);
    nameTag = { a, b, first: parts.join(" "), last, role: (job.opts.role || "").trim(), x: 0.1, y, cap: 0.042 };
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
  const quoteBlocks = [];
  const spans = [];
  for (const q2 of (tags.quotes || []).filter((x) => x.kind === "reported" || x.kind === "imagined").sort((x, y) => x.span[0] - y.span[0])) {
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
    fonts: o.fonts
  };
  try {
    const rows = track.units.map((u) => u.start.toFixed(2) + "-" + u.end.toFixed(2) + " " + u.role + (u.build ? "*" : "") + (u.emphasis ? ":" + u.emphasis : "") + " " + u.entrance.kind + " y" + u.y.toFixed(3) + "  " + unitText(u));
    const dir = fs().join(fs().homedir(), ".selects", "plugin-data", "a16z-style-captions", "shorts", job.shortId);
    await fs().writeFile(fs().join(dir, "captions.txt"), rows.join("\n"));
    await fs().writeFile(fs().join(dir, "inputs.json"), JSON.stringify({ words: words2, tags, cuts, shots, duration, suppress, cards, fps, inserts: o.inserts }));
  } catch {
  }
  const lockups2 = track.units.filter((u) => u.lines.length > 1).length;
  const summary = units.length + " captions, " + lockups2 + " lockups, " + cards.length + " card" + (cards.length === 1 ? "" : "s") + (nameTag ? ", name tag" : "");
  return { data, notes: [...notes, ...track.notes.filter((n) => /^No /.test(n))], summary };
}
function properNoun(w, words2) {
  const n = norm3(w);
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
  const out = fs().join(dir, "stock-" + Math.abs(hash2(c.id + "@" + start.toFixed(2))) + ".mp4");
  if (!fs().existsSync(out)) {
    const portrait = c.height > c.width;
    const box = portrait ? "1080:1920" : "1920:1080";
    await shell(
      sdk,
      "Download stock B-roll",
      FF + 'set -e; "$FF" -v error -y -ss ' + start.toFixed(2) + " -t " + Math.max(1.5, Math.min(12, seconds)).toFixed(2) + " -i " + q(c.url) + " -an -c:v libx264 -preset veryfast -crf 19 -pix_fmt yuv420p -vf " + q("scale=" + box + ":force_original_aspect_ratio=increase:force_divisible_by=2") + " " + q(out + ".part.mp4") + " && mv " + q(out + ".part.mp4") + " " + q(out),
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
  const onsets = words2.map((w) => w.s).sort((a, b) => a - b);
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
    let a = Math.max(0, w0.s - 0.04);
    let e = Math.max(w1.e, Math.min(sentenceEnd2(w1), a + 5.5)) + 0.08;
    const next = onsets.find((o) => o > e - 0.08);
    if (next != null && next - e < 0.35) e = next - 0.04;
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
    const prev = runs[runs.length - 1];
    if (prev && a < prev.b + 1.5) {
      const end = Math.min(e, prev.a + 6.4);
      if (end - prev.b >= 0.9) {
        const s0 = prev.b;
        prev.b = end;
        prev.shots.push({ a: s0, b: end, query: b.query, alt: b.alt || b.query, run: runs.length - 1, k: prev.shots.length });
        covered += end - s0;
      }
      continue;
    }
    if ((covered + (e - a)) / duration > 0.32) break;
    const n = Math.max(1, Math.min(4, Math.round((e - a) / 1.45)));
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
async function fetchInserts(sdk, runs, dir, onTick, cache = {}, words2 = []) {
  const notes = [];
  if (!runs.length) return { shots: [], notes };
  if (!stockSearchAvailable()) return { shots: [], notes: ["No B-roll: this Selects version has no stock footage search. Update Selects."] };
  const out = [];
  const used = /* @__PURE__ */ new Set();
  const todo = [];
  for (const r of runs) {
    const hits = r.shots.map((s) => cache[cacheKey(s)]);
    if (hits.every((h) => h && fs().existsSync(h.clip.path))) {
      for (const h of hits) if (h && !h.clip.dur) h.clip.dur = await probeDuration(sdk, h.clip.path);
      r.shots.forEach((s, k) => {
        used.add(hits[k].clip.id);
        out.push({ ...s, clip: hits[k].clip, luma: hits[k].luma });
      });
    } else todo.push(r);
  }
  if (!todo.length) return { shots: out, notes };
  const cands = [];
  for (let k = 0; k < todo.length; k += 1) {
    onTick("Searching footage " + (k + 1) + " of " + todo.length);
    const s0 = todo[k].shots[0];
    cands.push(await searchCandidates([s0.query, s0.alt], 6, used).catch(() => []));
  }
  const pdir = fs().join(dir, "previews");
  fs().mkdirSync(pdir, { recursive: true });
  const file = (c) => fs().join(pdir, "p" + Math.abs(hash2(c.id)) + ".jpg");
  const all = cands.flat().filter((c) => !fs().existsSync(file(c)));
  if (all.length) {
    onTick("Fetching previews");
    await shell(sdk, "Fetch footage previews", all.map((c) => "curl -sfL --max-time 20 -o " + q(file(c)) + " " + q(c.preview) + " || true").join("; "), 18e4, 4e3).catch(() => "");
  }
  const sheets = [];
  for (let s = 0; s * 4 < todo.length && s < 4; s += 1) {
    const rows = [];
    for (let r = s * 4; r < Math.min(todo.length, s * 4 + 4); r += 1) rows.push(r);
    const sd = fs().join(dir, "sheet-" + s);
    const tiles = [];
    rows.forEach((r, ri) => {
      for (let c = 0; c < 6; c += 1) {
        const cand = cands[r][c];
        tiles.push(cand && fs().existsSync(file(cand)) ? file(cand) : "");
        void ri;
      }
    });
    const cmd = FF + "set -e; rm -rf " + q(sd) + "; mkdir -p " + q(sd) + "; " + tiles.map((t, i) => {
      const name = q(fs().join(sd, String(i + 1).padStart(3, "0") + ".jpg"));
      return t ? '"$FF" -v error -y -i ' + q(t) + " -vf " + q("scale=180:320:force_original_aspect_ratio=decrease,pad=180:320:(ow-iw)/2:(oh-ih)/2:color=0x202020") + " -frames:v 1 " + name : '"$FF" -v error -y -f lavfi -i color=c=0x202020:s=180x320 -frames:v 1 ' + name;
    }).join("; ") + '; "$FF" -v error -y -framerate 1 -i ' + q(fs().join(sd, "%03d.jpg")) + " -vf " + q("tile=6x" + rows.length + ":padding=6:margin=6:color=white") + " -frames:v 1 -q:v 5 " + q(fs().join(dir, "sheet-" + s + ".jpg"));
    try {
      await shell(sdk, "Lay out footage candidates", cmd, 12e4, 4e3);
      sheets.push({ path: fs().join(dir, "sheet-" + s + ".jpg"), rows });
    } catch {
    }
  }
  let choice = {};
  if (sheets.length) {
    onTick("Checking the footage against the words");
    const said = (r) => words2.filter((w) => w.s >= r.a - 0.05 && w.s < r.b).map((w) => w.t).join(" ");
    const lines = [];
    sheets.forEach(
      (sh, si) => sh.rows.forEach((r, ri) => {
        const run2 = todo[r];
        lines.push("Sheet " + (si + 1) + ", row " + (ri + 1) + " = moment M" + (r + 1) + ': the speaker says "' + said(run2) + '" (footage wanted: ' + run2.shots[0].query + "). Needs " + run2.shots.length + " shot" + (run2.shots.length > 1 ? "s" : "") + ".");
      })
    );
    const prompt = "Pure image task: do NOT use any tools. You pick stock B-roll for an a16z-style Short. Each attached sheet has one row per moment; each row shows up to six candidate clips (columns 1-6, left to right; dark grey tiles are empty).\n\n" + lines.join("\n") + `

For each moment choose, in order of preference, the columns whose clip clearly shows the exact thing the words name (an object, place, action or era - coffee is not tea, a treadmill is not a conveyor belt). Never choose: a stranger's face or posed person as the main subject (unless the words are about people in general), neon or club lighting, strong colour casts, visible text, logos or watermarks, charts or screens with made-up data, fog or near-empty frames, or a visual pun. Return an empty list when nothing fits; staying on the speaker is better than a wrong clip.

Reply with ONLY a JSON object like {"M1": [3, 1], "M2": []}.`;
    const images = [];
    for (let si = 0; si < sheets.length; si += 1) {
      try {
        const buf = await fs().readFile(sheets[si].path);
        const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
        let bin = "";
        for (let k = 0; k < bytes.length; k += 1) bin += String.fromCharCode(bytes[k]);
        images.push({ dataUrl: "data:image/jpeg;base64," + btoa(bin), name: "Sheet " + (si + 1) });
      } catch {
      }
    }
    try {
      const o = parseLoose(await ask(sdk, prompt, images));
      for (const [k, v] of Object.entries(o || {})) if (Array.isArray(v)) choice[k] = v.map(Number).filter((n) => n >= 1 && n <= 6);
    } catch (e) {
      notes.push("B-roll check failed (" + String(e?.message || e).slice(0, 100) + "); B-roll was left out.");
      choice = {};
    }
  }
  for (let r = 0; r < todo.length; r += 1) {
    const run2 = todo[r];
    const need = Math.max(...run2.shots.map((s) => s.b - s.a)) + 0.7;
    const picks = (choice["M" + (r + 1)] || []).map((c) => cands[r][c - 1]).filter((c) => c && !used.has(c.id) && c.duration >= need);
    for (let k = 0; k < run2.shots.length; k += 1) {
      const s = run2.shots[k];
      const cand = picks[k] || (picks.length && run2.shots.length > picks.length ? picks[k % picks.length] : null);
      if (!cand) continue;
      onTick("Cutting footage " + (out.length + 1));
      const offset = 0.4 + (picks.indexOf(cand) !== k ? 2.5 : 0);
      const clip = await cutCandidate(sdk, cand, fs().join(dir, "stock"), s.b - s.a + 0.4, offset).catch(() => null);
      if (!clip) continue;
      used.add(cand.id);
      const whole = await frameLuma(sdk, clip.path, (s.b - s.a) / 2).catch(() => null);
      if (whole != null && whole < 28) continue;
      const luma = await captionLuma(sdk, clip.path, (s.b - s.a) / 2).catch(() => null);
      cache[cacheKey(s)] = { clip, luma };
      out.push({ ...s, clip, luma });
    }
  }
  const wanted = runs.reduce((n, r) => n + r.shots.length, 0);
  if (out.length < wanted) notes.push("B-roll: " + (wanted - out.length) + " of " + wanted + " shots had no fitting footage and stay on the speaker.");
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
  const job = { version: 1, projectId: pid, sourceId: ctx.sequenceId, shortId: made.id, name: made.name, fps, semantic, framing, srcWords: tw, opts };
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
      const runs = planInserts(prep.words, job.semantic.broll, prep.duration, blocked, { earliest: 2.4 });
      job.brollCache = job.brollCache || {};
      const got = await fetchInserts(sdk, runs, dir, (s) => onStep("broll", "run", s), job.brollCache, prep.words);
      notes.push(...got.notes);
      if (got.shots.length) {
        const paths = [...new Set(got.shots.map((x) => x.clip.path))];
        const imp = await importFiles(sdk, pid, paths);
        const idOf = (p) => imp.find((x) => x.path === p)?.id || "";
        job.brollIds = [.../* @__PURE__ */ new Set([...job.brollIds || [], ...imp.map((x) => x.id).filter(Boolean)])];
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
  const fonts = await readFonts(sdk);
  const look = await buildGraphic({ job, prep, fonts, logo: job.opts.logo, inserts: insertTimes });
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
  await finishShort(sdk, job.shortId, pid, end, look.data, music, voiceDb, placed, fps);
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
  const [sans, serif, roman] = await Promise.all([read2("InterDisplay-Medium.woff2.b64"), read2("EditorialSerif-Italic.woff2.b64"), read2("EditorialSerif-Regular.woff2.b64")]);
  return { sans, serif, roman };
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
  return /* @__PURE__ */ React.createElement("div", { style: { padding: 16, display: "flex", flexDirection: "column", gap: 14, fontSize: 13, lineHeight: 1.45 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 15, fontWeight: 600 } }, "a16z-style Short, one click"), /* @__PURE__ */ React.createElement("div", { style: muted }, "Turns this talking-head Draft into a new 9:16 Short in the a16z house style: tightened pauses, speaker framing, editorial captions with lockups and emphasis, keyword cards, B-roll, a name tag and a music bed.")), /* @__PURE__ */ React.createElement("label", { style: field }, /* @__PURE__ */ React.createElement("span", null, "Speaker name (optional, for the name tag)"), /* @__PURE__ */ React.createElement("input", { type: "text", value: name, disabled: busy, placeholder: "e.g. Jane Doe", onChange: (e) => setName(e.target.value) })), /* @__PURE__ */ React.createElement("label", { style: field }, /* @__PURE__ */ React.createElement("span", null, "Role line"), /* @__PURE__ */ React.createElement("input", { type: "text", value: role, disabled: busy, placeholder: "e.g. Founder, Example Labs", onChange: (e) => setRole(e.target.value) })), /* @__PURE__ */ React.createElement("label", { style: field }, /* @__PURE__ */ React.createElement("span", null, "Your logo (optional): path to a small PNG or SVG, shown top right"), /* @__PURE__ */ React.createElement("input", { type: "text", value: logo, disabled: busy, placeholder: "~/Pictures/logo.png", onChange: (e) => setLogo(e.target.value) })), /* @__PURE__ */ React.createElement("label", { style: field }, /* @__PURE__ */ React.createElement("span", null, "Note for the editor (optional)"), /* @__PURE__ */ React.createElement("input", { type: "text", value: hint, disabled: busy, placeholder: "e.g. the key idea is 'taste'", onChange: (e) => setHint(e.target.value) })), /* @__PURE__ */ React.createElement("label", { style: { display: "flex", gap: 8, alignItems: "center" } }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: music, disabled: busy, onChange: (e) => setMusic(e.target.checked) }), /* @__PURE__ */ React.createElement("span", null, "Music bed (AI-generated, uses generation credits)")), /* @__PURE__ */ React.createElement("label", { style: { display: "flex", gap: 8, alignItems: "center" } }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: cards, disabled: busy, onChange: (e) => setCards(e.target.checked) }), /* @__PURE__ */ React.createElement("span", null, "Keyword cards")), /* @__PURE__ */ React.createElement("label", { style: { display: "flex", gap: 8, alignItems: "center" } }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: broll, disabled: busy, onChange: (e) => setBroll(e.target.checked) }), /* @__PURE__ */ React.createElement("span", null, "B-roll from stock footage (Pexels and Pixabay, no credits)")), isShort && /* @__PURE__ */ React.createElement("button", { onClick: () => go(true), disabled: busy, style: { padding: "10px 12px", fontWeight: 600, cursor: busy ? "default" : "pointer" } }, "Rebuild captions and graphics"), /* @__PURE__ */ React.createElement("button", { onClick: () => go(false), disabled: busy, style: { padding: "10px 12px", fontWeight: 600, cursor: busy ? "default" : "pointer" } }, busy ? "Making the Short\u2026 " + clock + " s" : isShort ? "Make a new Short from this Draft" : "Make the Short"), (busy || run.steps.some((s) => s.state !== "wait")) && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } }, run.steps.map((s) => /* @__PURE__ */ React.createElement("div", { key: s.id, style: { display: "flex", gap: 8, opacity: s.state === "wait" ? 0.5 : 1 } }, /* @__PURE__ */ React.createElement("span", { style: { width: 14, textAlign: "center" } }, icon(s.state)), /* @__PURE__ */ React.createElement("span", { style: { flex: 1 } }, s.label, s.note ? /* @__PURE__ */ React.createElement("span", { style: muted }, " \u2014 ", s.note) : null)))), run.error && /* @__PURE__ */ React.createElement("div", { style: { color: "var(--panel-destructive-fg, #e5484d)", whiteSpace: "pre-wrap" } }, run.error), run.result && !busy && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } }, /* @__PURE__ */ React.createElement("div", null, "Made \u201C", run.result.name, "\u201D in ", Math.round(run.result.seconds), " s."), run.result.notes.length ? /* @__PURE__ */ React.createElement("ul", { style: { margin: 0, paddingLeft: 18, ...muted } }, run.result.notes.map((n, i) => /* @__PURE__ */ React.createElement("li", { key: i }, n))) : null, /* @__PURE__ */ React.createElement("button", { onClick: open, style: { padding: "8px 12px" } }, "Open the Short")), /* @__PURE__ */ React.createElement("div", { style: { ...muted, fontSize: 11 } }, "A style study, not affiliated with a16z. Use your own name, role and logo."));
}
export {
  A16zShort as default
};
