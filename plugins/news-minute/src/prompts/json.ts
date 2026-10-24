// Tolerant JSON extraction for model replies: a lead-in sentence, a code fence, trailing explanation,
// trailing commas and surrounding whitespace are all survivable.

// Returns the substring of the first balanced {...} starting at or after `from`, honouring strings.
function balancedObject(s: string, from: number): { text: string; end: number } | null {
  const start = s.indexOf("{", from);
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (c === "\\") i++;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return { text: s.slice(start, i + 1), end: i + 1 };
  }
  return null;
}

function tryParse(t: string): any {
  for (const x of [t, t.replace(/,\s*([}\]])/g, "$1")]) {
    try {
      return JSON.parse(x);
    } catch {
      // try the next variant
    }
  }
  return undefined;
}

export function parseJsonLoose(text: string): any {
  const s = String(text ?? "").replace(/^\uFEFF/, "").trim();
  const sources = [s];
  for (const m of s.matchAll(/```[a-zA-Z]*\s*([\s\S]*?)```/g)) sources.push(m[1].trim());
  for (const src of sources) {
    const whole = tryParse(src);
    if (whole && typeof whole === "object") return whole;
    // Try each top-level object in turn; the first one that parses wins.
    let pos = 0;
    for (;;) {
      const found = balancedObject(src, pos);
      if (!found) break;
      const v = tryParse(found.text);
      if (v && typeof v === "object") return v;
      pos = found.end;
    }
  }
  throw new Error("No parseable JSON object in model reply");
}
