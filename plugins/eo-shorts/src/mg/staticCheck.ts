export type CheckProblem = { where: string; problem: string };

const ALLOWED_IMPORTS = new Set(["react", "remotion"]);

function codeOnly(tsx: string): string {
  let out = "";
  let i = 0;
  const n = tsx.length;
  while (i < n) {
    const c = tsx[i],
      d = tsx[i + 1];
    if (c === "/" && d === "/") {
      while (i < n && tsx[i] !== "\n") i += 1;
      continue;
    }
    if (c === "/" && d === "*") {
      const end = tsx.indexOf("*/", i + 2);
      i = end < 0 ? n : end + 2;
      out += " ";
      continue;
    }
    if (c === '"' || c === "'") {
      const q = c;
      out += q;
      i += 1;
      while (i < n && tsx[i] !== q && tsx[i] !== "\n") {
        if (tsx[i] === "\\") i += 1;
        i += 1;
        out += " ";
      }
      out += q;
      i += 1;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

export function importSpecifiers(tsx: string): string[] {
  const out: string[] = [];
  const re = /^[ \t]*(?:import|export)\s[^;'"]*?\bfrom\s*["']([^"']+)["']|^[ \t]*import\s*["']([^"']+)["']/gm;
  for (const m of tsx.matchAll(re)) out.push(m[1] ?? m[2]);
  return out;
}

export function checkRuntimeCode(tsx: string): CheckProblem[] {
  const problems: CheckProblem[] = [];
  for (const spec of importSpecifiers(tsx)) {
    if (!ALLOWED_IMPORTS.has(spec)) problems.push({ where: "tsx", problem: "imports " + spec + " (only react and remotion)" });
  }
  const code = codeOnly(tsx);
  const rules: [RegExp, string][] = [
    [/\bimport\s*\(/, "dynamic import()"],
    [/\brequire\s*\(/, "require()"],
    [/<img[\s/>]/i, "an HTML <img> element (fails a native export with plugin-data pictures)"],
    [/<Img[\s/>]|\bImg\b\s*[,}]/, "remotion's Img (fails a native export with plugin-data pictures)"],
    [/\bfetch\s*\(/, "fetch() (blocked in the export page)"],
    [/\bXMLHttpRequest\b/, "XMLHttpRequest (blocked in the export page)"],
  ];
  for (const [re, what] of rules) if (re.test(code)) problems.push({ where: "tsx", problem: "uses " + what });
  return problems;
}

const LOOPBACK = /\b(?:https?|wss?):\/\/(?:localhost|127\.\d+\.\d+\.\d+|\[::1\]|0\.0\.0\.0)(?::\d+)?/i;

export function checkParameters(params: unknown): CheckProblem[] {
  const problems: CheckProblem[] = [];
  const walk = (v: unknown, path: string[], inArray = false) => {
    if (typeof v === "string") {
      const where = path.join(".") || "(root)";
      const asset = path.length === 2 && path[0] === "assets";
      const still = path.length === 3 && path[0] === "footageUrls" && inArray;
      const picture = asset || still || (path.length === 2 && path[0] === "prefetch");
      if (LOOPBACK.test(v)) problems.push({ where, problem: "holds a loopback URL" });
      if (/^file:/i.test(v) || /url\(\s*["']?file:/i.test(v)) problems.push({ where, problem: "holds a file:// URL" });
      if (/^https?:/i.test(v)) problems.push({ where, problem: "holds a network URL" });
      if (/local:\/\//i.test(v) && !(picture && /^local:\/\//i.test(v))) problems.push({ where, problem: "holds a plugin-data file URL outside the pictures" });
      if (path[0] === "prefetch" && !/^local:\/\//i.test(v)) problems.push({ where, problem: "a picture to preload must be a plugin-data file URL" });
      if ((asset || still) && !/^(?:local:\/\/|data:image\/)/i.test(v)) problems.push({ where, problem: "a picture must be a data:image URI or a plugin-data file URL" });
      return;
    }
    if (Array.isArray(v)) v.forEach((x, i) => walk(x, [...path, String(i)], true));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, [...path, k]);
  };
  walk(params, []);
  return problems;
}

export function assertInstallable(tsx: string, params: unknown, sceneId: string): void {
  const problems = [...checkRuntimeCode(tsx), ...checkParameters(params)];
  if (problems.length) throw new Error("Scene " + sceneId + " cannot be installed: " + problems.map((p) => p.where + " " + p.problem).join("; ") + ".");
}
