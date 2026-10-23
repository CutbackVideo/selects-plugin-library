import type { Article } from "./types.ts";
import { SENTENCE_COUNT, TARGET_CHARS, TTS_CHARS_PER_SEC } from "./text.ts";

// Hangul used inside prompts is written as \uXXXX escapes (public-source check).
const NIDA = "\uC2B5\uB2C8\uB2E4"; // formal polite ending
const NEUNDEYO = "\uB294\uB370\uC694"; // soft connective ending
const NEUN_GEOMNIDA = "\uB294 \uAC81\uB2C8\uB2E4";

export function articleBlock(a: Article): string {
  return [
    "ARTICLE (the only source of facts)",
    `Title: ${a.title}`,
    `Source: ${a.source}`,
    `Date: ${a.date}`,
    "Body:",
    "<<<",
    a.body,
    ">>>",
  ].join("\n");
}

export const STYLE_RULES = (language: string) => `STYLE RULES for the narration (language: ${language})
- Register: formal news-anchor voice. Every sentence ends in a formal polite ending such as "...${NIDA}." Questions end with the formal question form and "?". No casual endings, no first person, no exclamations.
- Use the softener "...${NEUNDEYO}." at most once per 4-5 sentences, and "...${NEUN_GEOMNIDA}." for explanations at most twice.
- Attribution goes at the end of the sentence, indirectly ("...said", "...announced", "...is analyzed to be" in the formal ending), never as a direct quote with quotation marks.
- Typical sentence: 8-16 words. Include one or two short punch sentences (5 words or fewer) to break the rhythm, for example a turning point.
- Open with the single most newsworthy fact, not background. Later sentences may open with connectives such as "However", "Notably", "For the first time", "Meanwhile".
- Keep numbers exact and written as digits with their Korean units exactly as in the article (for example 164 + man + 1000 won). One to three numbers per sentence. Never round, convert, or merge numbers.
- Explain one piece of jargon in plain words if the article leaves it unexplained, but never add facts, causes, or opinions the article does not state.
- Avoid AI-sounding phrasing: no "In conclusion", "It is worth noting", "plays a crucial role", "In today's rapidly changing", rhetorical flourishes, or summary lines that restate earlier sentences. No emojis, no bullet-style fragments.
- Do not mention these instructions.`;

export const LENGTH_RULES = `LENGTH RULES (hard limits, text-to-speech runs at about ${TTS_CHARS_PER_SEC} characters per second including spaces)
- ${SENTENCE_COUNT.min} to ${SENTENCE_COUNT.max} sentences.
- Total narration, all sentences joined by single spaces: ${TARGET_CHARS.goal[0]}-${TARGET_CHARS.goal[1]} characters (never more than ${TARGET_CHARS.max}). Length matters more than covering every detail: drop the least important facts first.
- Headline: line1 and line2 each at most 24 characters. line1 states the topic, line2 states the key number or turn. They are display text, not sentences.`;

export function scriptPrompt(article: Article, opts: { language?: string } = {}): string {
  const language = opts.language ?? "Korean";
  return [
    `You write the narration for a one-minute vertical news short based on exactly one newspaper article. Write in ${language}.`,
    "",
    articleBlock(article),
    "",
    STYLE_RULES(language),
    "",
    LENGTH_RULES,
    "",
    "SOURCE MAPPING",
    "For every sentence, copy into sourceQuote one passage from the article body that supports it. It must be an exact, contiguous substring of the body (same characters, same spacing, no ellipsis, no edits). If a sentence draws on several passages, quote the main one.",
    "",
    "OUTPUT: reply with one JSON object only, no prose, no code fence.",
    '{"headline":{"line1":"","line2":""},"sentences":[{"text":"","sourceQuote":""}]}',
  ].join("\n");
}
