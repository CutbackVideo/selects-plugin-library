// Choosing what the reel says: the segment of the podcast, and which spoken words become each title.
// The assistant answers with exact quotes (fast to write, no index bookkeeping) and the code finds them
// in the transcript, in order, and turns them into word indices.
import { lastJsonObject, type Sdk } from "./host";

export type SrcWord = { i: number; t: string; s: number; e: number; ss: number | null; sr: string | null };
export type Choice = {
  spans: [number, number][]; // word index ranges (inclusive) in the source Draft
  picks: any; // title picks, word indices in the source Draft
  why?: string;
  missing: string[];
  issues?: string[]; // rules the kept answer still breaks
};

const norm = (s: string) => String(s || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
const toks = (s: string) => String(s || "").split(/\s+/).map(norm).filter(Boolean);

function sentences(words: SrcWord[], fps: number) {
  const out: { from: number; to: number }[] = [];
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

const STYLE = `The reel follows one fixed podcast-clip edit. Its titles, in order:
- "opener": an editorial question to the viewer that is NOT spoken, shown for the first 4 s, in the second person and ending with "?": 2-4 small lead words + ONE big key word of 8-13 letters. Example ["WHY DO YOU", "PROCRASTINATE?"]. The final title answers it.
- "stackA" (starts at least 5 s in, about 20-30% into the reel): 4 consecutive spoken words = 2 lead words + 2 key words. Example ["heightening your", "self awareness"].
- "stackB": the spoken words right after stack A (gap under 1 s): 1-2 lead lines of 1-4 words, then ONE key word. Example ["on the things that's", "causing the", "discomfort"].
- "punch" (about 40-55% in, at least 1.5 s after stack B): 1-3 lead words + 1-2 key words, the most surprising claim. Example ["we have", "no idea"].
- "broll": 8-18 consecutive spoken words right after the punch that describe something concrete and filmable, plus two stock-footage search queries of 2-4 plain words each ("search": first for a vertical clip, second for a horizontal one, e.g. ["woman sweeping floor", "hand writing notebook"]) and two literal shot descriptions (no text, logos or famous people), one vertical ("portrait") and one horizontal ("landscape").
- "final": the concluding spoken line in the last 20%, followed by 1-2 more seconds of speech before the segment ends (a short closing phrase, as the reference does): 1-2 lead lines of 1-4 words, then ONE key word that is the last and strongest word (never "can't", "it", "that", "is").
Every spoken title is an exact, consecutive quote from the transcript (same words, same order); its lines together form one quote. Key words are what a viewer should remember: nouns, strong adjectives or verbs of 4+ letters. Never a pronoun, filler or vague word (it, that, this, thing, work, word, can't, is, just, really, stuff), and never a word already in the same title's lead lines.`;

const SHAPE = `{
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

export async function chooseAll(sdk: Sdk, words: SrcWord[], fps: number, target: number, hint: string): Promise<Choice> {
  const total = words.length ? words[words.length - 1].e / fps : 0;
  const whole = total <= target + 12;
  const lines = sentences(words, fps).map((s) => "[" + (words[s.from].s / fps).toFixed(1) + "s] " + words.slice(s.from, s.to + 1).map((w) => w.t).join(" "));
  const prompt =
    "Pure text task: do NOT use any tools or read the project; everything you need is below. Think briefly and reply with ONLY one JSON object.\n\n" +
    "You are cutting a vertical short-form reel from a podcast transcript. " +
    (whole
      ? "The whole transcript (" + total.toFixed(1) + " s) is used: set start/end to its first and last words.\n"
      : "Choose ONE continuous segment of " + (target - 1) + "-" + (target + 2) + " seconds (use the line times) that opens with a strong claim or question, is self-contained, and ends on a punchline. Start and end on sentence boundaries.\n") +
    (hint ? "The editor's note: " + hint + "\n" : "") +
    "\n" + STYLE + "\n\nJSON:\n" + SHAPE + "\n\nTranscript (each line starts with its time):\n" + lines.join("\n");
  // One answer, checked; when it breaks a rule the code can see, ask once more with the problems listed
  // and keep whichever answer has fewer.
  let best: { choice: Choice | null; issues: string[]; text: string } | null = null;
  let lastErr: any = null;
  for (let round = 0; round < 2; round += 1) {
    const ask = !best ? prompt : prompt + "\n\nYour previous answer:\n" + best.text + "\n\nIt breaks these rules:\n- " + best.issues.join("\n- ") + "\nReply with the corrected, complete JSON object.";
    let text: string;
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
    } catch (e: any) {
      lastErr = e;
      if (!best) best = { choice: null, issues: [String(e?.message || e)], text };
    }
    if (best && best.choice && !best.issues.length) break;
  }
  if (!best || !best.choice) throw lastErr || new Error("The assistant did not answer.");
  return { ...best.choice, issues: best.issues };
}

async function askWithRetry(sdk: Sdk, prompt: string): Promise<{ text: string }> {
  let lastErr: any = null;
  // The app's first assistant turn after a restart can fail while its agent runtime is still starting
  // ("model metadata unavailable"); later turns work, so retry after a pause.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt) await new Promise((res) => setTimeout(res, attempt === 1 ? 4000 : 12000));
    try {
      return await sdk.askAI({ prompt, timeoutMs: 300000 });
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("The assistant did not answer.");
}

// Words that never carry a title on their own.
export const WEAK = new Set(
  ("a an and are as at be but can't cannot cant did do does don't for get go going got had has have he her him his how i i'm in is it it's its just kind like lot me my " +
    "no not of on one or our really she so some something sort stuff that that's the them there these they thing things this those to us very was way we were what " +
    "when which who why will with word words work you your").split(" ")
);
const low = (t: string) => String(t || "").toLowerCase().replace(/[’]/g, "'").replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, "");
// Short words are weak too, except acronyms as spoken ("AI").
export const weakKey = (ts: string[]) => ts.every((t) => WEAK.has(low(t)) || (low(t).length < 3 && !/^[A-Z]{2,}$/.test(String(t).replace(/[^\p{L}]/gu, ""))));

// Rules the code can check on an answer; the rest (does the final answer the opener) is the writer's.
function checkChoice(o: any, c: Choice, words: SrcWord[], fps: number, target: number): string[] {
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
  const text = (ids: number[]) => ids.map((i) => words[i].t);
  const checkKey = (name: string, lead: number[][], key: number[]) => {
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

// Quotes -> indices.
function resolve(o: any, words: SrcWord[], whole: boolean, fps: number): Choice {
  const tk = words.map((w) => norm(w.t));
  const missing: string[] = [];
  const find = (seq: string[], from: number, to: number) => {
    if (!seq.length) return -1;
    for (let i = Math.max(0, from); i + seq.length - 1 <= Math.min(to, tk.length - 1); i += 1) {
      let ok = true;
      for (let j = 0; j < seq.length; j += 1) if (tk[i + j] !== seq[j]) { ok = false; break; }
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
  // Index of the first word at least `sec` seconds into the segment.
  const after = (sec: number) => {
    const t0 = words[a].s + sec * fps;
    for (let i = a; i <= b; i += 1) if (words[i].s >= t0) return i;
    return b;
  };
  const lines = (name: string, v: any, minLines: number, notBefore = a) => {
    if (!Array.isArray(v) || v.length < minLines) return null;
    const parts = v.map((x: any) => toks(String(x))).filter((x: string[]) => x.length);
    const all = parts.flat();
    // Phrases repeat in speech: prefer the occurrence where the title belongs.
    let at = find(all, Math.max(cursor, notBefore), b);
    if (at < 0) at = find(all, cursor, b);
    if (at < 0) at = find(all, a, b);
    if (at < 0) {
      missing.push(name + ": " + v.join(" / "));
      return null;
    }
    const out: number[][] = [];
    let k = at;
    for (const p of parts) {
      out.push(p.map((_x: string, n: number) => k + n));
      k += p.length;
    }
    cursor = k;
    return out;
  };
  const picks: any = {};
  picks.opener = Array.isArray(o.opener) && o.opener.length >= 2 ? { lead: String(o.opener[0]), key: String(o.opener[o.opener.length - 1]) } : null;
  const A = lines("stackA", o.stackA, 2, after(4.3));
  picks.stackA = A ? { lead: A[0], key: A.slice(1).flat() } : null;
  const B = lines("stackB", o.stackB, 2);
  picks.stackB = B ? { lines: B.slice(0, -1), key: B[B.length - 1] } : null;
  const P = lines("punch", o.punch, 2);
  picks.punch = P ? { lead: P.slice(0, -1).flat(), key: P[P.length - 1] } : null;
  if (o.broll && o.broll.quote) {
    // The B-roll only needs a span, so a quote that is slightly off still places it: the longest run of
    // its words found in the segment anchors the whole quote.
    const q = toks(o.broll.quote);
    let span: [number, number] | null = null;
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

// Map picks from source-Draft word indices to reel word indices; anything outside the reel is dropped.
export function mapPicks(picks: any, map: Map<number, number>): any {
  const ids = (a: any) => (Array.isArray(a) ? a.map((i: any) => map.get(Number(i))) : null);
  const ok = (a: (number | undefined)[] | null) => !!a && a.length > 0 && a.every((x) => x != null);
  const out: any = { opener: picks.opener && typeof picks.opener.key === "string" ? { lead: String(picks.opener.lead || ""), key: String(picks.opener.key) } : null };
  const two = (o: any) => {
    if (!o) return null;
    const lead = ids(o.lead);
    const key = ids(o.key);
    return ok(lead) && ok(key) ? { lead: lead as number[], key: key as number[] } : null;
  };
  const block = (o: any) => {
    if (!o) return null;
    const lines = Array.isArray(o.lines) ? o.lines.map(ids).filter((l: any) => ok(l)) : [];
    const key = ids(o.key);
    return lines.length && ok(key) ? { lines: lines as number[][], key: key as number[] } : null;
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
