import { JSON_ONLY } from "./script.ts";
import { TARGET_CHARS, totalChars } from "./text.ts";

// Builds the follow-up prompt for a failed validation. `basePrompt` is the original script, fidelity or
// planner prompt, `previous` the parsed reply that failed, `errors` the validator's error list.
export function repairPrompt(basePrompt: string, previous: any, errors: string[]): string {
  const lines = ["", "YOUR PREVIOUS REPLY:", JSON.stringify(previous), "", "IT FAILED VALIDATION. Fix every problem below and change nothing else:"];
  for (const e of errors) lines.push(`- ${e}`);
  const texts = Array.isArray(previous?.sentences) ? previous.sentences.map((s: any) => String(s?.text ?? "")) : null;
  if (texts && errors.some((e) => e.startsWith("narration is "))) {
    const [lo, hi] = TARGET_CHARS.goal;
    const now = totalChars(texts);
    lines.push(
      "",
      `LENGTH FIX: the narration is currently ${now} characters (spaces included). Make the total land between ${lo} and ${hi} characters: not below ${lo}, not above ${hi}.` +
        (now > hi ? ` Cut about ${now - Math.round((lo + hi) / 2)} characters by removing the least important fact or shortening wording; do not strip more than needed.` : ` Add about ${Math.round((lo + hi) / 2) - now} characters by restoring the next most important fact from the article.`) +
        " Add up the characters of all sentences before replying.",
    );
  }
  lines.push("", `Reply with the full corrected JSON object. ${JSON_ONLY}`);
  return `${basePrompt}\n${lines.join("\n")}`;
}
