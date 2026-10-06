import type { JsonSchema } from "./types.ts";

export function topLevelObjects(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (depth > 0 && inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === "{") {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === "}" && depth > 0) {
      depth -= 1;
      if (depth === 0) out.push(text.slice(start, i + 1));
    } else if (ch === '"' && depth > 0) {
      inString = true;
    }
  }
  return out;
}

function stripSlips(body: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (inString) {
      out += ch;
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
    } else if (ch === "/" && body[i + 1] === "/") {
      while (i < body.length && body[i] !== "\n") i += 1;
      out += "\n";
    } else if (ch === "/" && body[i + 1] === "*") {
      const end = body.indexOf("*/", i + 2);
      i = end < 0 ? body.length : end + 1;
    } else if (ch === ",") {
      let j = i + 1;
      while (j < body.length && /\s/.test(body[j])) j += 1;
      if (body[j] !== "}" && body[j] !== "]") out += ch;
    } else {
      out += ch;
    }
  }
  return out;
}

function parseCandidate(body: string): { ok: true; value: unknown } | { ok: false; error: string } {
  const tries = [body, stripSlips(body), stripSlips(body.replace(/[“”]/g, '"'))];
  let first = "";
  for (const t of tries) {
    try {
      return { ok: true, value: JSON.parse(t) };
    } catch (e) {
      if (!first) first = String((e as Error).message);
    }
  }
  return { ok: false, error: first };
}

export type Extracted = { ok: true; value: Record<string, unknown> } | { ok: false; reason: string };

export function extractJsonObject(text: string): Extracted {
  const candidates = topLevelObjects(String(text ?? ""));
  if (!candidates.length) return { ok: false, reason: "the reply has no JSON object" };
  let firstError = "";
  for (const c of candidates) {
    const r = parseCandidate(c);
    if (r.ok && r.value && typeof r.value === "object" && !Array.isArray(r.value)) {
      return { ok: true, value: r.value as Record<string, unknown> };
    }
    if (!r.ok && !firstError) firstError = r.error;
  }
  return { ok: false, reason: "the JSON object does not parse: " + (firstError || "not an object") };
}

const MAX_SCHEMA_ERRORS = 20;

function typeOf(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  if (typeof v === "number") return Number.isInteger(v) ? "integer" : "number";
  return typeof v;
}

function typeMatches(want: string, v: unknown): boolean {
  const t = typeOf(v);
  if (want === "number") return t === "number" || t === "integer";
  return want === t;
}

export function validateSchema(value: unknown, schema: JsonSchema, path = "$", errors: string[] = []): string[] {
  if (errors.length >= MAX_SCHEMA_ERRORS || !schema || typeof schema !== "object") return errors;
  const s = schema as Record<string, unknown>;
  const push = (msg: string) => {
    if (errors.length < MAX_SCHEMA_ERRORS) errors.push(path + ": " + msg);
  };
  if (Array.isArray(s.anyOf) || Array.isArray(s.oneOf)) {
    const options = (s.anyOf ?? s.oneOf) as JsonSchema[];
    if (!options.some((o) => validateSchema(value, o, path, []).length === 0)) push("matches none of the allowed shapes");
  }
  if (Array.isArray(s.allOf)) for (const o of s.allOf as JsonSchema[]) validateSchema(value, o, path, errors);
  if (s.type !== undefined) {
    const types = Array.isArray(s.type) ? (s.type as string[]) : [s.type as string];
    if (!types.some((t) => typeMatches(t, value))) {
      push("expected " + types.join(" or ") + ", got " + typeOf(value));
      return errors;
    }
  }
  if ("const" in s && JSON.stringify(s.const) !== JSON.stringify(value)) push("must be " + JSON.stringify(s.const));
  if (Array.isArray(s.enum) && !s.enum.some((e) => JSON.stringify(e) === JSON.stringify(value))) {
    push("must be one of " + JSON.stringify(s.enum).slice(0, 120));
  }
  if (typeof value === "string") {
    if (typeof s.minLength === "number" && value.length < s.minLength) push("shorter than " + s.minLength);
    if (typeof s.maxLength === "number" && value.length > s.maxLength) push("longer than " + s.maxLength);
  }
  if (typeof value === "number") {
    if (typeof s.minimum === "number" && value < s.minimum) push("below " + s.minimum);
    if (typeof s.maximum === "number" && value > s.maximum) push("above " + s.maximum);
  }
  if (Array.isArray(value)) {
    if (typeof s.minItems === "number" && value.length < s.minItems) push("fewer than " + s.minItems + " items");
    if (typeof s.maxItems === "number" && value.length > s.maxItems) push("more than " + s.maxItems + " items");
    if (s.items && typeof s.items === "object" && !Array.isArray(s.items)) {
      value.forEach((item, i) => validateSchema(item, s.items as JsonSchema, path + "[" + i + "]", errors));
    }
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const props = (s.properties && typeof s.properties === "object" ? s.properties : {}) as Record<string, JsonSchema>;
    if (Array.isArray(s.required)) for (const k of s.required as string[]) if (!(k in obj)) push("missing " + JSON.stringify(k));
    for (const [k, v] of Object.entries(obj)) {
      const child = path + "." + k;
      if (props[k]) validateSchema(v, props[k], child, errors);
      else if (s.additionalProperties === false) {
        if (errors.length < MAX_SCHEMA_ERRORS) errors.push(child + ": not allowed");
      } else if (s.additionalProperties && typeof s.additionalProperties === "object") {
        validateSchema(v, s.additionalProperties as JsonSchema, child, errors);
      }
    }
  }
  return errors;
}

export type Parsed = { ok: true; value: Record<string, unknown> } | { ok: false; reason: string };

export function parseModelJson(
  text: string,
  schema?: JsonSchema,
  validate?: (value: unknown) => string[] | null | undefined,
): Parsed {
  const ex = extractJsonObject(text);
  if (!ex.ok) return ex;
  const problems = schema ? validateSchema(ex.value, schema) : [];
  if (!problems.length && validate) {
    try {
      problems.push(...(validate(ex.value) ?? []));
    } catch (e) {
      problems.push("validator threw: " + String((e as Error)?.message ?? e).slice(0, 200));
    }
  }
  if (problems.length) return { ok: false, reason: "the JSON does not match the expected shape: " + problems.slice(0, 8).join("; ") };
  return ex;
}

export function reaskPrompt(prompt: string, reason: string): string {
  return (
    prompt +
    "\n\nYour previous reply could not be used (" +
    reason.slice(0, 400) +
    "). Reply again with ONLY the complete JSON object: double-quoted keys and strings, no comments, no Markdown fences."
  );
}

export function schemaInstruction(schema: JsonSchema): string {
  return "\n\nReply with ONLY one JSON object that matches this JSON Schema:\n" + JSON.stringify(schema);
}
