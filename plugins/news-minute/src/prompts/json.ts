// Tolerant JSON extraction for LLM replies (fenced blocks, leading prose, trailing commas).
export function parseJsonLoose(text: string): any {
  const s = String(text ?? "").trim();
  const candidates: string[] = [s];
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) candidates.push(fence[1].trim());
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first >= 0 && last > first) candidates.push(s.slice(first, last + 1));
  for (const c of candidates) {
    for (const t of [c, c.replace(/,\s*([}\]])/g, "$1")]) {
      try {
        return JSON.parse(t);
      } catch {
        // try the next candidate
      }
    }
  }
  throw new Error("No parseable JSON object in model reply");
}
