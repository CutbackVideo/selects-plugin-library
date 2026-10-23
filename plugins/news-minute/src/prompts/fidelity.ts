import type { Article, IdSentence } from "./types.ts";
import { TARGET_CHARS } from "./text.ts";
import { JSON_ONLY, LENGTH_RULES, STYLE_RULES, articleBlock } from "./script.ts";

export function fidelityPrompt(
  article: Article,
  script: { headline: { line1: string; line2: string }; sentences: IdSentence[]; language?: string },
): string {
  const language = script.language ?? "Korean";
  return [
    `You are a strict fact checker and copy editor for a one-minute news short narration (${language}). A draft was written from the article below. Check it against the article and fix only what is wrong.`,
    "",
    articleBlock(article),
    "",
    "DRAFT",
    JSON.stringify({ headline: script.headline, sentences: script.sentences }, null, 1),
    "",
    "CHECK EVERY SENTENCE AND THE HEADLINE for these issue kinds:",
    '- "meaning": the draft says something different from, stronger than, or weaker than the article (changed cause, subject, direction, certainty, or attribution).',
    '- "number": a number, date, unit, rank, ratio or name differs from the article, or was rounded, converted, or invented.',
    '- "unsupported": a claim, cause, comparison or opinion that the article does not state.',
    '- "ai_tone": stock AI phrasing, filler, flourish, or a line that only restates an earlier one.',
    '- "register": not the formal news-anchor voice, or sentence too long or hard to say aloud.',
    "",
    "REWRITE RULES",
    "- If a sentence has no issue, return it unchanged with rewritten=false and issues=[].",
    "- If it has an issue, rewrite that sentence minimally so it matches the article exactly, set rewritten=true, and list each issue with a short note in English (what was wrong and what you changed). Never paraphrase the meaning away to make a sentence smoother.",
    `- A rewrite must not make the total longer: if the draft total is already above ${TARGET_CHARS.goal[1]} characters, shorten while fixing. The final total must stay within the length rules below.`,
    "- Keep the same ids in the same order. Do not add, drop, merge, or reorder sentences.",
    "- Set sourceQuote for each sentence to an exact contiguous substring of the article body that supports the final text.",
    "- The headline obeys the same checks; list its issues in headline.issues and fix it in place.",
    "",
    STYLE_RULES(language),
    "",
    LENGTH_RULES,
    "",
    `OUTPUT: ${JSON_ONLY}`,
    '{"headline":{"line1":"","line2":"","issues":[{"kind":"meaning|number|unsupported|ai_tone|register","note":""}]},"sentences":[{"id":"","text":"","sourceQuote":"","issues":[{"kind":"","note":""}],"rewritten":false}]}',
  ].join("\n");
}
