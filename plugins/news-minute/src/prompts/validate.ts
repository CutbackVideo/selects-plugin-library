import type { Article, FidelityJson, PlanAsset, ScriptJson, TimedSentence, Validation } from "./types.ts";
import {
  SENTENCE_COUNT,
  TARGET_CHARS,
  TTS_CHARS_PER_SEC,
  estimateSeconds,
  eojeolCount,
  headlineMax,
  isFormalEnding,
  isObj,
  isSoftEnding,
  normalizeWs,
  numberTokens,
  rawNumberTokens,
  totalChars,
} from "./text.ts";

function result(errors: string[], warnings: string[], stats: Validation["stats"]): Validation {
  return { ok: errors.length === 0, errors, warnings, stats };
}

type Row = { label: string; text: string; sourceQuote: string };

// Checks shared by the script and fidelity validators.
function checkRows(rows: Row[], headline: any, article: Article, errors: string[], warnings: string[]) {
  const body = normalizeWs(article.body);
  const bodyNums = new Set(numberTokens(article.body));

  for (const k of ["line1", "line2"] as const) {
    const v = headline?.[k];
    if (typeof v !== "string" || !v.trim()) errors.push(`headline.${k} is missing`);
    else if (v.trim().length > headlineMax) errors.push(`headline.${k} is ${v.trim().length} chars; keep it within ${headlineMax}`);
  }

  if (rows.length < SENTENCE_COUNT.min || rows.length > SENTENCE_COUNT.max) {
    errors.push(`need ${SENTENCE_COUNT.min}-${SENTENCE_COUNT.max} sentences, got ${rows.length}`);
  }

  let softCount = 0;
  let formalCount = 0;
  for (const r of rows) {
    const t = String(r.text ?? "").trim();
    if (!t) {
      errors.push(`${r.label}: empty text`);
      continue;
    }
    if (isFormalEnding(t)) formalCount++;
    else errors.push(`${r.label}: must end with a formal polite ending (...ni-da or a ...l-kka-yo question) and a period or question mark`);
    if (isSoftEnding(t)) softCount++;
    const ej = eojeolCount(t);
    if (ej > 22) errors.push(`${r.label}: ${ej} words is too long for one spoken sentence (max 22); split it`);
    else if (ej < 3) warnings.push(`${r.label}: only ${ej} words`);

    const q = normalizeWs(r.sourceQuote);
    if (!q) errors.push(`${r.label}: sourceQuote is empty`);
    else if (!body.includes(q)) errors.push(`${r.label}: sourceQuote is not an exact substring of the article body; copy the source text verbatim`);

    for (const n of numberTokens(t)) {
      if (!bodyNums.has(n)) errors.push(`${r.label}: number "${n}" does not appear in the article`);
    }
  }
  if (rows.length >= 5 && softCount > Math.ceil(rows.length / 4)) {
    warnings.push(`${softCount} sentences use the softener ending; keep it to about one in four or five`);
  }
  return { softCount, formalCount };
}

function checkLength(texts: string[], errors: string[]) {
  const chars = totalChars(texts);
  if (chars > TARGET_CHARS.max) {
    errors.push(`narration is ${chars} chars (spaces included); the hard cap is ${TARGET_CHARS.max} (about ${Math.round(TARGET_CHARS.max / TTS_CHARS_PER_SEC)} s). Shorten by at least ${chars - TARGET_CHARS.goal[1]} chars`);
  } else if (chars < TARGET_CHARS.min) {
    errors.push(`narration is only ${chars} chars; aim for ${TARGET_CHARS.goal[0]}-${TARGET_CHARS.goal[1]} (about ${Math.round(TARGET_CHARS.goal[0] / TTS_CHARS_PER_SEC)}-${Math.round(TARGET_CHARS.goal[1] / TTS_CHARS_PER_SEC)} s)`);
  }
  return chars;
}

export function validateScript(json: any, article: Article): Validation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObj(json) || !isObj(json.headline) || !Array.isArray(json.sentences)) {
    return result(["reply must be an object with headline {line1,line2} and sentences[]"], [], {});
  }
  const s = (json as ScriptJson).sentences;
  if (s.some((x) => !isObj(x))) return result(["every sentence must be an object {text, sourceQuote}"], [], {});
  const rows = s.map((x, i) => ({ label: `sentence ${i + 1}`, text: x.text, sourceQuote: x.sourceQuote }));
  const { softCount } = checkRows(rows, json.headline, article, errors, warnings);
  const texts = s.map((x) => String(x.text ?? ""));
  const chars = checkLength(texts, errors);
  return result(errors, warnings, {
    sentences: s.length,
    chars,
    estSeconds: Number(estimateSeconds(texts).toFixed(1)),
    softEndings: softCount,
  });
}

const ISSUE_KINDS = new Set(["meaning", "number", "unsupported", "ai_tone", "register"]);

export function validateFidelity(
  json: any,
  article: Article,
  prev: { headline?: { line1: string; line2: string }; sentences: { id: string; text: string }[] },
): Validation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObj(json) || !isObj(json.headline) || !Array.isArray(json.sentences)) {
    return result(["reply must be an object with headline {line1,line2,issues} and sentences[]"], [], {});
  }
  const out = (json as FidelityJson).sentences;
  if (out.some((x) => !isObj(x))) return result(["every sentence must be an object"], [], {});
  if (out.length !== prev.sentences.length) {
    errors.push(`sentence count changed from ${prev.sentences.length} to ${out.length}; keep every id, do not merge or drop sentences`);
  }
  let rewritten = 0;
  out.forEach((x, i) => {
    const p = prev.sentences[i];
    const label = `sentence ${p?.id ?? i + 1}`;
    if (p && x.id !== p.id) errors.push(`${label}: id must stay "${p.id}" in the same order, got "${x.id}"`);
    if (!Array.isArray(x.issues)) errors.push(`${label}: issues must be an array`);
    else {
      for (const is of x.issues) {
        if (!isObj(is) || !ISSUE_KINDS.has(is.kind)) errors.push(`${label}: issue kind must be one of ${[...ISSUE_KINDS].join("|")}`);
      }
    }
    if (typeof x.rewritten !== "boolean") errors.push(`${label}: rewritten must be true or false`);
    else if (x.rewritten) {
      rewritten++;
      if (!x.issues?.length) errors.push(`${label}: rewritten=true needs at least one issue explaining why`);
      if (p && x.text === p.text) errors.push(`${label}: rewritten=true but the text is unchanged`);
    } else if (p && x.text !== p.text) {
      errors.push(`${label}: rewritten=false but the text differs from the input; set rewritten=true and list the issue`);
    }
  });
  const rows = out.map((x, i) => ({ label: `sentence ${x.id ?? i + 1}`, text: x.text, sourceQuote: x.sourceQuote }));
  const { softCount } = checkRows(rows, json.headline, article, errors, warnings);
  const texts = out.map((x) => String(x.text ?? ""));
  const chars = checkLength(texts, errors);
  return result(errors, warnings, {
    sentences: out.length,
    rewritten,
    chars,
    estSeconds: Number(estimateSeconds(texts).toFixed(1)),
    softEndings: softCount,
  });
}

// ---------------------------------------------------------------- planner

export const SCENE_TYPES = [
  "news_photo",
  "text_card",
  "number_callout",
  "bar_compare_h",
  "line_trend_callout",
  "stat_cards",
  "quote_card",
] as const;

const TONES = new Set(["grey", "accent"]);
const FOCUS = new Set(["center", "top", "bottom", "left", "right"]);
const isStr = (x: any) => typeof x === "string" && x.trim().length > 0;
const isNum = (x: any) => typeof x === "number" && Number.isFinite(x);
const isNumOrStr = (x: any) => isNum(x) || isStr(x);

// A displayed numeric value must be traceable to the narration of the scene it sits in.
function traceNumbers(value: any, sceneNums: Set<string>, where: string, errors: string[]) {
  const text = isNum(value) ? String(value) : isStr(value) ? value : "";
  const toks = [...new Set([...numberTokens(text), ...rawNumberTokens(text)])];
  for (const t of toks) {
    if (!sceneNums.has(t)) errors.push(`${where}: number "${t}" is not in this scene's narration; use only numbers from the article`);
  }
}

function checkParams(type: string, p: any, sceneNums: Set<string>, where: string, errors: string[]) {
  if (!isObj(p)) {
    errors.push(`${where}: params must be an object`);
    return;
  }
  const need = (cond: boolean, msg: string) => {
    if (!cond) errors.push(`${where} (${type}): ${msg}`);
  };
  switch (type) {
    case "news_photo":
      if (p.focus !== undefined) need(FOCUS.has(p.focus), "focus must be center|top|bottom|left|right");
      break;
    case "text_card":
      need(isStr(p.text), "text is required");
      break;
    case "number_callout":
      need(isStr(p.label), "label is required");
      need(isNumOrStr(p.from) && isNumOrStr(p.to), "from and to are required (number or text copied from the article)");
      need(/\d/.test(String(p.from)) && /\d/.test(String(p.to)), "from and to must each contain a digit; use another scene type when the article gives only a phrase such as \"nearly double\"");
      traceNumbers(p.from, sceneNums, `${where}.from`, errors);
      traceNumbers(p.to, sceneNums, `${where}.to`, errors);
      break;
    case "bar_compare_h":
      need(isStr(p.title) && isStr(p.source) && isStr(p.unit), "title, source and unit are required");
      need(Array.isArray(p.bars) && p.bars.length === 2, "exactly 2 bars are required");
      (p.bars ?? []).forEach((b: any, i: number) => {
        need(isObj(b) && isStr(b.label) && isNum(b.value) && TONES.has(b.tone), `bars[${i}] needs label, numeric value, tone grey|accent`);
        if (isObj(b)) traceNumbers(b.value, sceneNums, `${where}.bars[${i}]`, errors);
      });
      break;
    case "line_trend_callout":
      need(isStr(p.title) && isStr(p.source) && isStr(p.unit), "title, source and unit are required");
      need(Array.isArray(p.points) && p.points.length >= 3, "at least 3 points {x,y} are required");
      need(isNumOrStr(p.endLabel), "endLabel is required");
      need(isNum(p.accentFrom) && p.accentFrom >= 0 && p.accentFrom < (p.points?.length ?? 0), "accentFrom must be a valid point index");
      (p.points ?? []).forEach((pt: any, i: number) => need(isObj(pt) && isNum(pt.y) && (isNum(pt.x) || isStr(pt.x)), `points[${i}] needs x and numeric y`));
      traceNumbers(p.endLabel, sceneNums, `${where}.endLabel`, errors);
      break;
    case "stat_cards":
      need(isStr(p.title), "title is required");
      need(Array.isArray(p.cards) && p.cards.length >= 2 && p.cards.length <= 4, "2-4 cards are required");
      (p.cards ?? []).forEach((c: any, i: number) => {
        need(isObj(c) && isStr(c.header) && Array.isArray(c.rows) && c.rows.length > 0, `cards[${i}] needs header and rows[]`);
        (c?.rows ?? []).forEach((r: any, j: number) => {
          need(isObj(r) && isStr(r.label) && isNumOrStr(r.value), `cards[${i}].rows[${j}] needs label and value`);
          if (isObj(r)) traceNumbers(r.value, sceneNums, `${where}.cards[${i}].rows[${j}]`, errors);
        });
      });
      break;
    case "quote_card":
      need(isStr(p.name) && isStr(p.affiliation), "name and affiliation are required");
      need(Array.isArray(p.lines) && p.lines.length >= 2 && p.lines.length <= 4 && p.lines.every(isStr), "2-4 quote lines are required");
      need(Array.isArray(p.accentLines) && p.accentLines.every((i: any) => Number.isInteger(i) && i >= 0 && i < (p.lines?.length ?? 0)), "accentLines must be valid line indexes");
      break;
  }
}

// Longest allowed scene, in seconds. Data scenes carry charts that need more time to read.
export const DATA_SCENE_TYPES = ["bar_compare_h", "line_trend_callout", "stat_cards", "number_callout"] as const;
export const SCENE_MAX_SEC = { default: 10.5, data: 12 };
export function sceneMaxSec(type: string): number {
  return (DATA_SCENE_TYPES as readonly string[]).includes(type) ? SCENE_MAX_SEC.data : SCENE_MAX_SEC.default;
}

// Turns number_callout scenes whose from/to carry no digit into text_card, for use after repair has failed.
export function demoteNumberlessCallouts(json: any, sentences: TimedSentence[]): { plan: any; demoted: number } {
  if (!isObj(json) || !Array.isArray(json.scenes)) return { plan: json, demoted: 0 };
  const byId = new Map(sentences.map((s) => [s.id, s]));
  let demoted = 0;
  const scenes = json.scenes.map((sc: any) => {
    const p = sc?.params;
    if (!isObj(sc) || sc.type !== "number_callout" || (/\d/.test(String(p?.from)) && /\d/.test(String(p?.to)))) return sc;
    demoted++;
    const first = byId.get(sc.sentenceIds?.[0])?.text ?? "";
    const text = isStr(p?.label) && p.label.trim() ? p.label.trim() : first.slice(0, 20);
    const { assetRef: _drop, ...rest } = sc;
    return { ...rest, type: "text_card", params: { text }, hideCaption: false };
  });
  return { plan: { ...json, scenes }, demoted };
}

// A text_card sub that reads like a data attribution belongs in `source`, not on the card.
const SOURCE_LIKE_SUB = /=|\u00A9|\uCD9C\uCC98|\uD30C\uC774\uB0B8\uC2A4|\uB274\uC2A4|\uC77C\uBCF4|\uC2E0\uBB38|\uD1B5\uC2E0|Reuters|Bloomberg|Yahoo|Finance|News/i;

export function validatePlan(json: any, sentences: TimedSentence[], assets: PlanAsset[]): Validation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObj(json) || !Array.isArray(json.scenes)) return result(["reply must be an object with scenes[]"], [], {});
  const byId = new Map(sentences.map((s) => [s.id, s]));
  const assetByRef = new Map(assets.map((a) => [a.ref, a]));
  const photoRefs = assets.filter((a) => a.kind === "photo").map((a) => a.ref);
  const usedPhotos = new Set<string>();

  const summaries = new Map<string, string>();
  if (Array.isArray(json.assetSummaries)) {
    for (const a of json.assetSummaries) if (isObj(a) && isStr(a.ref) && isStr(a.summary)) summaries.set(a.ref, a.summary.trim());
  }
  for (const a of assets) {
    if (!summaries.has(a.ref)) errors.push(`assetSummaries is missing a summary for "${a.ref}"; describe what each asset shows before planning scenes`);
  }

  const seen: string[] = [];
  let maxSceneSec = 0;
  json.scenes.forEach((sc: any, i: number) => {
    const where = `scene ${i + 1}`;
    if (!isObj(sc)) {
      errors.push(`${where}: must be an object`);
      return;
    }
    const ids: string[] = Array.isArray(sc.sentenceIds) ? sc.sentenceIds : [];
    if (!ids.length) errors.push(`${where}: sentenceIds is required`);
    for (const id of ids) {
      if (!byId.has(id)) errors.push(`${where}: unknown sentence id "${id}"`);
      seen.push(id);
    }
    if (!(SCENE_TYPES as readonly string[]).includes(sc.type)) {
      errors.push(`${where}: type must be one of ${SCENE_TYPES.join("|")}`);
      return;
    }
    const sceneSentences = ids.map((id) => byId.get(id)).filter(Boolean) as TimedSentence[];
    if (sceneSentences.length) {
      const dur = Math.max(...sceneSentences.map((s) => s.endSec)) - Math.min(...sceneSentences.map((s) => s.startSec));
      maxSceneSec = Math.max(maxSceneSec, dur);
      const maxSec = sceneMaxSec(sc.type);
      if (dur > maxSec) errors.push(`${where}: lasts ${dur.toFixed(1)} s; split it so a ${sc.type} scene does not run past ${Math.floor(maxSec)} s`);
    }
    const sceneText = sceneSentences.map((s) => s.text).join(" ");
    const sceneNums = new Set([...numberTokens(sceneText), ...rawNumberTokens(sceneText)]);
    checkParams(sc.type, sc.params ?? {}, sceneNums, where, errors);
    if (sc.type === "text_card" && isStr(sc.params?.sub) && SOURCE_LIKE_SUB.test(sc.params.sub)) {
      warnings.push(`${where}: text_card sub "${sc.params.sub}" looks like a source; sources belong in "source" of a data scene, not on a text card`);
    }

    if (typeof sc.hideCaption !== "boolean") errors.push(`${where}: hideCaption must be true or false`);
    else if (sc.hideCaption && sc.type !== "number_callout") errors.push(`${where}: hideCaption is only allowed on number_callout`);
    if (typeof sc.disclaimer !== "boolean") errors.push(`${where}: disclaimer must be true or false`);

    const asset = sc.assetRef ? assetByRef.get(sc.assetRef) : undefined;
    if (sc.assetRef && !asset) errors.push(`${where}: assetRef "${sc.assetRef}" is not in the asset list`);
    if (sc.type === "news_photo" && !asset) errors.push(`${where}: news_photo needs an assetRef`);
    if (sc.type !== "news_photo" && sc.type !== "number_callout" && sc.type !== "quote_card" && sc.assetRef) {
      errors.push(`${where}: ${sc.type} must not carry an assetRef`);
    }
    if (asset?.kind === "photo") usedPhotos.add(asset.ref);
    const usesIllustration = asset?.kind === "illustration";
    if (usesIllustration && sc.disclaimer !== true) errors.push(`${where}: a scene that shows an illustration must set disclaimer=true`);
    if (!usesIllustration && sc.disclaimer === true) errors.push(`${where}: disclaimer=true is only for illustration scenes`);
    if (usesIllustration) {
      const unused = photoRefs.filter((r) => !usedPhotos.has(r));
      if (unused.length) errors.push(`${where}: use the article photo(s) ${unused.join(", ")} before any illustration`);
    }
  });

  const expected = sentences.map((s) => s.id);
  if (seen.join(",") !== expected.join(",")) {
    errors.push(`scenes must cover every sentence exactly once, in order; expected [${expected.join(",")}] but got [${seen.join(",")}]`);
  }
  const first = json.scenes[0];
  const textCards = json.scenes.filter((sc: any) => sc?.type === "text_card").length;
  if (json.scenes.length >= 6 && textCards > json.scenes.length / 3) warnings.push(`${textCards} of ${json.scenes.length} scenes are text cards; use data scenes where the narration has numbers`);
  if (first && first.type === "text_card" && photoRefs.length) warnings.push("the opening scene should use the strongest visual, not a text card");
  if (photoRefs.length && usedPhotos.size < photoRefs.length) warnings.push(`unused article photos: ${photoRefs.filter((r) => !usedPhotos.has(r)).join(", ")}`);

  return result(errors, warnings, {
    scenes: json.scenes.length,
    maxSceneSec: Number(maxSceneSec.toFixed(1)),
    photosUsed: usedPhotos.size,
    assetSummaries: Object.fromEntries(summaries),
  });
}
