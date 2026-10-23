import { JSON_ONLY } from "./script.ts";
import type { PlanAsset, TimedSentence } from "./types.ts";

const CATALOG = `SCENE TYPES (pick one per scene; v1 subset)
1. news_photo  - a real article photo (assetRef required). params: {} plus optional "focus": "center|top|bottom|left|right". Ken Burns move is automatic. 4-8 s.
2. text_card   - key phrase on a plain card; the fallback when no photo or number fits. params: {"text": short key phrase (max ~20 chars per line, \\n allowed), "sub": optional smaller line}. No assetRef.
3. number_callout - a before-to-after value (rate, price). params: {"label": "", "from": number or text copied from the article, "to": number or text copied from the article, "unit": optional}. Optional assetRef (photo) as dimmed background. Set hideCaption=true. 5-7 s.
4. bar_compare_h - exactly 2 comparable values. params: {"title","source","unit","bars":[{"label","value":number,"tone":"grey|accent","sub":optional period text}]}. 4-5 s. source is the data attribution as written in the article.
5. line_trend_callout - a time series ending in a record or jump (needs at least 3 data points stated in the article). params: {"title","subtitle":optional,"source","points":[{"x","y":number}],"accentFrom":index of the first highlighted point,"endLabel":number or text,"unit","threshold":optional {"y","label"},"cards":optional [{"text","tone":"grey|accent"}]}. 8-10 s.
6. stat_cards  - 2-4 parallel items with one or two numbers each. params: {"title","subtitle":optional,"source":optional,"cards":[{"header","rows":[{"label","value":number or text,"unit":optional}]}]}. 6-8 s.
7. quote_card  - an expert or official quote, usually the closer. params: {"name","affiliation","lines":[2-4 quote lines],"accentLines":[indexes of lines to highlight]}. Optional assetRef (headshot photo). 6-8 s.`;

export function plannerPrompt(input: {
  headline: { line1: string; line2: string };
  sentences: TimedSentence[];
  assets: PlanAsset[];
  language?: string;
}): string {
  const language = input.language ?? "Korean";
  const assets = input.assets.map((a) => ({
    ref: a.ref,
    kind: a.kind,
    caption: a.caption ?? "",
    credit: a.credit ?? "",
    size: a.w && a.h ? `${a.w}x${a.h}` : undefined,
  }));
  return [
    `You plan the visuals for a one-minute vertical news short. The narration is already approved and timed. Assign scenes to it. Text inside params is displayed on screen, so write it in ${language}.`,
    "",
    "HEADLINE",
    JSON.stringify(input.headline),
    "",
    "NARRATION (id, start/end seconds, text)",
    JSON.stringify(input.sentences, null, 1),
    "",
    "AVAILABLE ASSETS",
    JSON.stringify(assets, null, 1),
    "",
    CATALOG,
    "",
    "RULES",
    "- Scenes cover every sentence exactly once, in order. A scene covers one sentence, or two or three consecutive short ones. Split nothing across scenes.",
    "- No scene may last more than 10 s (end of its last sentence minus start of its first). Merge short sentences, never stretch a long one.",
    "- The first scene uses the strongest visual: a photo of the main subject, or the headline-number chart when the story is data-driven. The last one or two sentences are usually a photo of an official or a quote_card.",
    "- Use a data scene (number_callout, bar_compare_h, line_trend_callout, stat_cards) only when the scene's own sentences contain the numbers it shows. Every number in params must be copied from the narration of that same scene, as a JSON number or the exact wording. Never compute, round, or invent values.",
    "- Use each article photo at least once when there are enough scenes; a photo may be reused in non-adjacent scenes. Choose the photo whose caption best matches the sentence.",
    "- A photo of a named person (check the caption) may only be used on sentences that are about that person: where the sentence names them or states their own words or actions. Never put it on a sentence about someone else or about a group, even if it is the only photo. Reusing the same person photo is fine only when each sentence is about that person; otherwise use a text_card or a number_callout instead.",
    '- Assets of kind "illustration" are generated images. Use them only for sentences that no article photo fits and only after every photo has been used. A scene that shows an illustration must set disclaimer=true. All other scenes set disclaimer=false.',
    "- When a scene's sentences state two comparable numbers (for example this year vs last year), prefer bar_compare_h over text_card; when they state 2-4 parallel items with numbers, prefer stat_cards. Fill every field from the narration only.",
    "- Use text_card as the fallback when no photo or data fits. Avoid three text_cards in a row, and keep text_card to at most one third of the scenes.",
    "- hideCaption is true only for number_callout, false otherwise.",
    "- sentenceIds must use the ids above. assetRef must be one of the refs above or omitted.",
    "",
    `OUTPUT: ${JSON_ONLY}`,
    '{"scenes":[{"sentenceIds":["s1"],"type":"news_photo","params":{},"hideCaption":false,"disclaimer":false,"assetRef":"photo-1"}]}',
  ].join("\n");
}
