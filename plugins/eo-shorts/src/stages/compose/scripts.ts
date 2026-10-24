import { lit } from "../../host/runScript.ts";
import { GUARD_WORDS_JS } from "./wordsGuard.ts";
import { SPLIT_CROSSING_JS, type SplitRoots } from "./splitCrossing.ts";

export type ComposeGuard = {
  projectId: string;
  draftId: string;
  fps: number;
  frameSize: { width: number; height: number };
  mainEnd: number;
  wordsSig: string | null;
};

export const SOURCE_FILES_JS = `const sourceFiles = async (p) => {
  const files = [];
  const walk = (nodes) => { for (const n of nodes || []) { if (n.type === "dir") walk(n.children); else files.push(n); } };
  const tree = await p.sourceFiles();
  if ("fileTree" in tree) walk(tree.fileTree);
  else for (const f of tree.folders || []) { const t = await p.sourceFiles({ folder: f.name }); walk("fileTree" in t ? t.fileTree : []); }
  return files;
};
const normPath = (s) => String(s == null ? "" : s).replace(/\\\\/g, "/").toLowerCase();
const samePath = (a, b) => normPath(a) === normPath(b);
const under = (path, root) => normPath(path).startsWith(normPath(root).replace(/\\/?$/, "/"));`;

function prelude(g: ComposeGuard): string {
  return `const G = ${lit(g)};
const p = selects.project(G.projectId);
const d = selects.draft(G.draftId);
${GUARD_WORDS_JS}
${SOURCE_FILES_JS}
const mainClips = async () => (await d.clips({ trackScope: "main" })).filter((c) => c.trackKind === "main").sort((a, b) => a.startFrame - b.startFrame);
const guard = async () => {
  const pm = await p.meta();
  if (!pm.draftIds.includes(G.draftId)) throw new Error("guard: the draft is no longer in its project");
  const meta = await d.meta();
  if (Math.abs(meta.fps - G.fps) > 1e-6 || meta.frameSize.width !== G.frameSize.width || meta.frameSize.height !== G.frameSize.height) {
    throw new Error("guard: the draft is now " + meta.frameSize.width + "x" + meta.frameSize.height + " at " + meta.fps + " fps, planned " + G.frameSize.width + "x" + G.frameSize.height + " at " + G.fps);
  }
  const main = await mainClips();
  const mainEnd = main.reduce((m, c) => Math.max(m, c.endFrame), 0);
  if (mainEnd !== G.mainEnd) throw new Error("guard: Main now ends at frame " + mainEnd + ", planned " + G.mainEnd);
  for (const c of main) { const sp = c.playbackSpeed; if (sp && sp.numerator !== sp.denominator) throw new Error("guard: Main clip " + c.startFrame + "-" + c.endFrame + " is not at 1x"); }
  if (G.wordsSig !== null) {
    const sig = guardWordsSig(await d.words());
    if (sig !== G.wordsSig) throw new Error("guard: the draft's words changed (" + sig + ", planned " + G.wordsSig + ")");
  }
  return { mainEnd };
};`;
}

export function stateScript(projectId: string, draftId: string): string {
  return `const p = selects.project(${lit(projectId)});
const d = selects.draft(${lit(draftId)});
${GUARD_WORDS_JS}
const pm = await p.meta();
if (!pm.draftIds.includes(${lit(draftId)})) throw new Error("the draft is not in the project");
const meta = await d.meta();
const main = (await d.clips({ trackScope: "main" })).filter((c) => c.trackKind === "main");
return { fps: meta.fps, frameSize: meta.frameSize, durationFrames: meta.durationFrames, mainEnd: main.reduce((m, c) => Math.max(m, c.endFrame), 0), wordsSig: guardWordsSig(await d.words()), name: meta.name };`;
}

export type ResolvedFile = { path: string; resourceId: string | null; frameSize: { width: number; height: number } | null; durationSeconds: number | null };

const RESOLVE_JS = `const files = await sourceFiles(p);
const resolve = (paths) => paths.map((path) => { const f = files.find((x) => samePath(x.path, path)); return { path, resourceId: f ? f.resourceId : null, frameSize: f && f.frameSize ? f.frameSize : null, durationSeconds: f && f.durationSeconds != null ? f.durationSeconds : null }; });`;

export function resolveScript(projectId: string, paths: string[]): string {
  return `const p = selects.project(${lit(projectId)});
${SOURCE_FILES_JS}
${RESOLVE_JS}
return resolve(${lit(paths)});`;
}

export function importScript(projectId: string, paths: string[]): string {
  return `const p = selects.project(${lit(projectId)});
${SOURCE_FILES_JS}
const want = ${lit(paths)};
const before = await sourceFiles(p);
const missing = want.filter((path) => !before.some((x) => samePath(x.path, path)));
let added = [];
if (missing.length) added = (await p.importFiles({ paths: missing })).addedResourceIds;
${RESOLVE_JS}
const out = resolve(want);
const lost = out.filter((r) => !r.resourceId).map((r) => r.path);
if (lost.length) throw new Error("import: the project still lacks " + lost.join(", "));
return { imported: missing, added, files: out };`;
}

export function splitCheckScript(g: ComposeGuard, i: SplitRoots & { splits: number[] }): string {
  return `${prelude(g)}
const P = ${lit({ splits: i.splits, roots: { footage: i.footageRoot, sound: i.soundRoot } })};
await guard();
const files = await sourceFiles(p);
${SPLIT_CROSSING_JS}
const bounds = new Set((await mainClips()).flatMap((c) => [c.startFrame, c.endFrame]));
const splits = P.splits.filter((k) => !bounds.has(k));
const x = splits.length ? await splitCrossing(splits, P.roots) : { graphics: [], overlays: [], sound: [], foreign: [], mainEffects: [] };
return { splits, graphics: crossingRows(x.graphics), overlays: crossingRows(x.overlays), sound: crossingRows(x.sound), foreign: crossingRows(x.foreign), mainEffects: x.mainEffects, refusal: x.foreign.length ? crossingError(x.foreign) : null };`;
}

export type PlaceInput = SplitRoots & {
  splits: number[];
  overlays: { path: string; start: number; end: number }[];
  label?: string;
};

export function placeScript(g: ComposeGuard, i: PlaceInput): string {
  return `${prelude(g)}
const P = ${lit({ splits: i.splits, overlays: i.overlays, root: i.footageRoot, roots: { footage: i.footageRoot, sound: i.soundRoot }, label: i.label ?? "EO Shorts: footage overlays" })};
await guard();
const files = await sourceFiles(p);
${SPLIT_CROSSING_JS}
const ridOf = (path) => { const f = files.find((x) => samePath(x.path, path)); return f ? f.resourceId : null; };
for (const o of P.overlays) if (!ridOf(o.path)) throw new Error("place: " + o.path + " is not in the project; import it first");
const ours = new Set(files.filter((f) => f.resourceId && under(f.path, P.root)).map((f) => f.resourceId));
const isEoGraphic = (name) => name.startsWith("EO ");
const overlaps = (c, o) => c.startFrame < o.end && c.endFrame > o.start;
const oursNow = async () => (await d.clips({ trackScope: "all" })).filter((c) => c.trackKind === "video" && c.resourceId && ours.has(c.resourceId));
let changed = false;
const removedGraphics = [];
let removedOverlays = 0;
let removedSound = [];
let mainEffects = [];
// 1. Main splits, after taking away what they would cut in two (or refusing, before any edit)
const bounds = new Set((await mainClips()).flatMap((c) => [c.startFrame, c.endFrame]));
const splits = P.splits.filter((k) => !bounds.has(k));
if (splits.length) {
  const x = await splitCrossing(splits, P.roots);
  if (x.foreign.length) throw new Error(crossingError(x.foreign));
  const cut = x.graphics.concat(x.overlays, x.sound);
  if (cut.length) {
    await d.removeClips(cut.map((r) => r.clip));
    removedGraphics.push(...x.graphics.map((r) => r.name));
    removedOverlays += x.overlays.length;
    removedSound = crossingRows(x.sound);
  }
  mainEffects = x.mainEffects;
  for (const k of splits) await d.splitAt({ frame: k });
  changed = true;
}
// 2. overlays: keep exact ones, remove the rest of ours, place the missing
let have = await oursNow();
const keep = new Set();
const toPlace = [];
for (const o of P.overlays) {
  const rid = ridOf(o.path);
  const c = have.find((x) => !keep.has(x.clipId) && x.resourceId === rid && x.startFrame === o.start && x.endFrame === o.end);
  if (c) keep.add(c.clipId); else toPlace.push(o);
}
const stale = have.filter((c) => !keep.has(c.clipId));
const coverG = toPlace.length ? (await d.motionGraphics()).filter((x) => isEoGraphic(x.name) && toPlace.some((o) => overlaps(x.clip, o))) : [];
if (stale.length || coverG.length) {
  await d.removeClips(stale.concat(coverG.map((x) => x.clip)));
  removedGraphics.push(...coverG.map((x) => x.name));
  removedOverlays += stale.length;
  changed = true;
}
for (const o of toPlace) {
  await d.overlayResource({ resource: p.resource(ridOf(o.path)), over: await d.rangeAtFrames(o.start, o.end), sourceStartSeconds: 0 });
  changed = true;
}
let commitId = null;
if (changed) commitId = (await d.commitAll(P.label)).commitId || null;
// read back
have = await oursNow();
const missing = P.overlays.filter((o) => have.filter((x) => x.resourceId === ridOf(o.path) && x.startFrame === o.start && x.endFrame === o.end).length !== 1);
if (missing.length) throw new Error("read back: overlays not in place: " + missing.map((o) => o.path + " " + o.start + "-" + o.end).join(", "));
const after = new Set((await mainClips()).flatMap((c) => [c.startFrame, c.endFrame]));
const unsplit = P.splits.filter((k) => !after.has(k));
if (unsplit.length) throw new Error("read back: Main is not split at " + unsplit.join(", "));
return { splits, placed: toPlace.length, kept: keep.size, removedOverlays, removedGraphics, removedSound, mainEffects, overlays: have.length, commitId };`;
}

export type EffectTarget = {
  kind: "main" | "overlay";
  path?: string;
  start: number;
  end: number;
  label: string;
  params: Record<string, unknown>;
};

export type EffectsInput = {
  targets: EffectTarget[];
  expected: { kind: "main" | "overlay"; path?: string; start: number; end: number; label: string }[];
  footageRoot: string;
  tsx: string;
  label?: string;
};

const withPath = <T extends { path?: string }>(t: T): T & { path: string | null } => ({ ...t, path: t.path ?? null });

export function effectsScript(g: ComposeGuard, i: EffectsInput): string {
  return `
const pluginShaderOptions=(()=>{// shared/shader-effects/graph.mjs
var IMAGE = \`
fn sat(x:f32)->f32{return clamp(x,0.0,1.0);}
fn straight(c:vec4f)->vec4f{return vec4f(c.rgb/max(c.a,0.000001),c.a);}
fn premul(c:vec4f)->vec4f{return vec4f(c.rgb*c.a,c.a);}
fn over(a:vec4f,b:vec4f)->vec4f{return a+b*(1.0-a.a);}
fn within(p:vec2f,size:vec2f)->f32 {
 let a=clamp(p*size+0.5,vec2f(0.0),vec2f(1.0));
 let b=clamp((1.0-p)*size+0.5,vec2f(0.0),vec2f(1.0));return a.x*a.y*b.x*b.y;
}
fn source(p:vec2f)->vec4f{return textureSampleLevel(input0,linearSampler,p,0.0)*within(p,vec2f(textureDimensions(input0)));}
fn rotate(p:vec2f,a:f32)->vec2f {let c=cos(a);let s=sin(a);return vec2f(c*p.x-s*p.y,s*p.x+c*p.y);}
fn ease(p:f32)->f32{let q=sat(p);return q*q*(3.0-2.0*q);}
fn outCubic(p:f32)->f32{return 1.0-pow(1.0-sat(p),3.0);}
fn roundRect(p:vec2f,size:vec2f,r:f32)->f32 {
 let q=abs(p-size*0.5)-size*0.5+r;
 let d=length(max(q,vec2f(0.0)))+min(max(q.x,q.y),0.0)-r;
 return sat(0.5-d);
}
fn saturation(c:vec3f,s:f32)->vec3f{return clamp(mix(vec3f(dot(c,vec3f(.213,.715,.072))),c,s),vec3f(0.0),vec3f(1.0));}
fn sepia(c:vec3f,s:f32)->vec3f {
 let v=vec3f(dot(c,vec3f(.393,.769,.189)),dot(c,vec3f(.349,.686,.168)),dot(c,vec3f(.272,.534,.131)));
 return clamp(mix(c,v,sat(s)),vec3f(0.0),vec3f(1.0));
}
fn hue(c:vec3f,a:f32)->vec3f {
 let co=cos(a);let si=sin(a);
 let r=vec3f(.213,.715,.072)+co*vec3f(.787,-.715,-.072)+si*vec3f(-.213,-.715,.928);
 let g=vec3f(.213,.715,.072)+co*vec3f(-.213,.285,-.072)+si*vec3f(.143,.140,-.283);
 let b=vec3f(.213,.715,.072)+co*vec3f(-.213,-.715,.928)+si*vec3f(-.787,.715,.072);
 return clamp(vec3f(dot(c,r),dot(c,g),dot(c,b)),vec3f(0.0),vec3f(1.0));
}
fn contrast(c:vec3f,s:f32)->vec3f{return clamp((c-.5)*s+.5,vec3f(0.0),vec3f(1.0));}
fn brightness(c:vec3f,s:f32)->vec3f{return clamp(c*s,vec3f(0.0),vec3f(1.0));}
\`;
function number(value, fallback = 0) {
  const n = typeof value === "number" ? value : Number(value);
  return value == null || value === "" || !Number.isFinite(n) ? fallback : n;
}
function f32(value) {
  const n = number(value, NaN);
  if (!Number.isFinite(n) || Math.abs(n) > 34028234663852886e22) throw Error("Invalid shader coefficient");
  const s = String(n);
  return /[.e]/i.test(s) ? s : s + ".0";
}
function vec(values) {
  return \`vec\${values.length}f(\${values.map(f32).join(",")})\`;
}
function xml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);
}
var Graph = class {
  data = null;
  passes = [];
  images = [];
  uniforms = [];
  svgParameters = [];
  constructor(data = {}) {
    this.data = data;
  }
  pass(body, { inputs = ["source"], values = [], bindings = [], functions = "", scale = 1 } = {}) {
    const id = \`p\${this.passes.length}\`;
    this.passes.push({ id, inputs, parameters: values, wgsl: IMAGE + functions + \`
fn effect(uv:vec2f)->vec4f {\${body}}\`, ...scale !== 1 ? { scale } : {} });
    for (const binding of bindings) this.uniforms.push({ pass: id, ...binding });
    return id;
  }
  image(svg, size = null) {
    const id = \`image\${this.images.length}\`;
    this.images.push({ id, svg, ...size ? { size } : {} });
    return id;
  }
  finish(output = this.passes.at(-1)?.id) {
    if (!output || !this.passes.some((p) => p.id === output)) throw Error("Missing shader output");
    if (this.passes.length > 128 || this.images.length > 16) throw Error("Effect exceeds shader graph budget");
    for (const p of this.passes) {
      if (p.parameters.length > 4096 || p.parameters.some((n) => !Number.isFinite(n))) throw Error("Invalid shader parameters");
      if (p.wgsl.length > 262144 || p.inputs.length > 8) throw Error("Effect exceeds shader pass budget");
    }
    return { graph: { schema: "Cutback.ShaderEffect.1", passes: this.passes, output, ...this.images.length ? { images: this.images } : {} }, ...this.uniforms.length ? { uniforms: this.uniforms } : {}, ...this.svgParameters.length ? { svgParameters: this.svgParameters } : {} };
  }
};
function cssColor(expression, filters) {
  let c = expression;
  if (!filters || filters === "none") return c;
  const parts = [...filters.matchAll(/([a-z-]+)\\(([^()]*)\\)/g)];
  if (parts.map((p) => p[0]).join("").replace(/\\s/g, "") !== filters.replace(/\\s/g, "")) throw Error("Unsupported color filter");
  for (const [, kind, raw] of parts) {
    const value = parseFloat(raw) / (raw.endsWith("%") ? 100 : 1);
    const v = f32(value);
    if (kind === "saturate") c = \`saturation(\${c},\${v})\`;
    else if (kind === "grayscale") c = \`saturation(\${c},\${f32(1 - Math.min(1, Math.max(0, value)))})\`;
    else if (kind === "sepia") c = \`sepia(\${c},\${v})\`;
    else if (kind === "brightness" || kind === "contrast") c = \`\${kind}(\${c},\${v})\`;
    else if (kind === "hue-rotate") c = \`hue(\${c},\${f32(value * (raw.endsWith("rad") ? 1 : raw.endsWith("turn") ? 2 * Math.PI : Math.PI / 180))})\`;
    else throw Error(\`Unsupported color filter: \${kind}\`);
  }
  return c;
}

// shared/shader-effects/summer.mjs
var GRADIENTS = \`
fn rnd(v:f32,k:f32)->f32{return floor(v*k+.5)/k;}
fn screen(b:vec4f,s:vec4f)->vec4f{return vec4f(b.rgb+s.rgb*(1.0-b.rgb),b.a+s.a*(1.0-b.a));}
fn blendOverlay(b:vec4f,s:vec4f)->vec4f {let cb=straight(b).rgb;let cs=straight(s).rgb;let rgb=select(2.0*cb*cs,1.0-2.0*(1.0-cb)*(1.0-cs),cb>vec3f(.5));return vec4f(rgb*b.a*s.a+b.rgb*(1.0-s.a)+s.rgb*(1.0-b.a),s.a+b.a*(1.0-s.a));}
fn rgba(c:vec3f,a:f32)->vec4f {let alpha=rnd(sat(a),1000.0);return vec4f(c/255.0*alpha,alpha);}
fn stop2(t:f32,a:f32,b:f32,ca:vec4f,cb:vec4f)->vec4f{return mix(ca,cb,sat((t-a)/max(.000001,b-a)));}
fn stop3(t:f32,m:f32,a:vec4f,b:vec4f,c:vec4f)->vec4f {return select(stop2(t,0.0,m,a,b),stop2(t,m,1.0,b,c),t>m);}
fn line(uv:vec2f,angle:f32,size:vec2f)->f32{let d=vec2f(sin(radians(angle)),-cos(radians(angle)));return .5+dot((uv-.5)*size,d)/dot(abs(d),size);}
fn radial(uv:vec2f,at:vec2f,r:vec2f)->f32{return length((uv-at)/r);}
\`;

// shared/shader-effects/eo.mjs
var wrap = (body) => \`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">\${body}</svg>\`;
function ground(bg) {
  const p = bg.print || { period: 7, angle: 23, radius: 1.15, ink: bg.ink || "#111612", base: "transparent", blur: 0 };
  const f = bg.fleck, m = number(f?.mottle), amount = number(f?.flecks);
  return wrap(\`<defs><filter id="soft" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="\${number(p.blur)}"/></filter><pattern id="p" width="\${p.period}" height="\${p.period}" patternUnits="userSpaceOnUse" patternTransform="rotate(\${number(p.angle)})"><rect width="\${p.period}" height="\${p.period}" fill="\${xml(p.base)}"/><circle cx="\${p.period / 2}" cy="\${p.period / 2}" r="\${p.radius}" fill="\${xml(p.ink)}" filter="url(#soft)"/></pattern>\${f ? \`<filter id="f" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="\${f.scale || 0.03}" numOctaves="3" seed="\${f.seed || 5}" result="cloud"/><feColorMatrix in="cloud" values="\${[0, 1, 2].map(() => \`\${m} 0 0 0 \${0.5 - m / 2}\`).join(" ")} 0 0 0 0 1" result="grey"/><feTurbulence type="fractalNoise" baseFrequency="\${f.fleckScale || 0.3}" numOctaves="2" seed="\${(f.seed || 5) + 1}" result="grain"/><feColorMatrix in="grain" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 30 0 0 0 \${-30 * (f.threshold || 0.68)}" result="peaks"/><feComponentTransfer in="peaks" result="flecks"><feFuncA type="linear" slope="\${amount}"/></feComponentTransfer><feMerge><feMergeNode in="grey"/><feMergeNode in="flecks"/></feMerge></filter>\` : ""}</defs><rect width="1080" height="1920" fill="\${xml(bg.color || "#000")}"/><rect width="1080" height="1920" fill="url(#p)" opacity="\${bg.print ? 1 : number(bg.texture)}"/>\${f ? '<rect width="1080" height="1920" filter="url(#f)" style="mix-blend-mode:soft-light"/>' : ""}\`);
}
function screenSvg(sc) {
  const p = number(sc.period, 7), base = number(sc.base, 128), a = number(sc.amplitude, 40), radius = number(sc.radius, p * 0.34), blur = number(sc.blur, 0.6);
  const gray = (v) => \`rgb(\${Array(3).fill(Math.max(0, Math.min(255, Math.round(v)))).join(",")})\`;
  let transform = \`rotate(\${number(sc.angle)})\`;
  if (sc.axes) {
    const ks = sc.axes.map((a2) => [Math.cos(a2.angle * Math.PI / 180) / a2.period, Math.sin(a2.angle * Math.PI / 180) / a2.period]), det = ks[0][0] * ks[1][1] - ks[0][1] * ks[1][0];
    if (!Number.isFinite(det) || Math.abs(det) < 1e-9) throw Error("Invalid print axes");
    transform = \`matrix(\${ks[1][1] / det / p} \${-ks[1][0] / det / p} \${-ks[0][1] / det / p} \${ks[0][0] / det / p} 0 0)\`;
  }
  const dots = [[0, 0], [p, 0], [0, p], [p, p]].map(([x, y]) => \`<circle cx="\${x}" cy="\${y}" r="\${radius}" fill="\${gray(base - a)}"/>\`).join("") + (sc.checker !== false ? \`<circle cx="\${p / 2}" cy="\${p / 2}" r="\${radius}" fill="\${gray(base + a * number(sc.lightRatio, 0.6))}"/>\` : "");
  return wrap(\`<defs><filter id="soft" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="linearRGB"><feGaussianBlur stdDeviation="\${blur}"/></filter><pattern id="s" width="\${p}" height="\${p}" patternUnits="userSpaceOnUse" patternTransform="\${transform}"><rect width="\${p}" height="\${p}" fill="\${gray(base)}"/><g\${sc.highlights ? "" : ' filter="url(#soft)"'}>\${dots}</g></pattern></defs><rect width="1080" height="1920" fill="url(#s)"\${sc.highlights ? ' filter="url(#soft)"' : ""}/>\`);
}
var hex = (s) => {
  const m = /^#([a-f0-9]{6}|[a-f0-9]{3})$/i.exec(s || "");
  if (s === "transparent") return [0, 0, 0, 0];
  if (!m) return [0, 0, 0, 1];
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
  return [...[0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255), 1];
};
function cadence(c, frame, fps) {
  if (!c?.fps || c.fps >= fps) return frame;
  return \`cadence(\${frame},\${f32(fps / c.fps)},\${f32(number(c.phase))})\`;
}
function eoLook(data = null) {
  data = data || {};
  const ex = data.execution;
  if (!ex || !Array.isArray(ex.footage)) throw Error("Missing EO execution");
  const g = new Graph(data), fps = number(ex.fps, 30), offset = number(data.nativeFrameOffset), win = data.cropWindow, bgs = ex.backgrounds?.length ? ex.backgrounds : [{ from: 0, color: "#000" }];
  let first = g.pass(\`let f=uniforms.clock.x+\${f32(offset)};let frame=\${cadence(ex.cadence, "f", fps)};let scene=\${win ? \`(uv*\${vec([win.frameWidth || win.h * 16 / 9, win.frameHeight || win.h])}-\${vec([win.x0, win.y0 || 0])})/\${f32(win.w / 1080)}\` : "uv*vec2f(1080.0,1920.0)"};var bg=\${vec(hex(bgs[0].color))};\${bgs.map((b) => \`if(frame>=\${f32(b.from)}){bg=\${vec(hex(b.color))};}\`).join("")}
 return bg;\`, { functions: "fn cadence(f:f32,p:f32,phase:f32)->f32{return max(0.0,ceil(floor((f+phase)/p)*p-phase));}" });
  for (let i = 0; i < bgs.length; i++) {
    const b = bgs[i], image = g.image(ground(b));
    first = g.pass(\`let f=uniforms.clock.x+\${f32(offset)};let frame=\${cadence(ex.cadence, "f", fps)};let scene=\${win ? \`(uv*\${vec([win.frameWidth || win.h * 16 / 9, win.frameHeight || win.h])}-\${vec([win.x0, win.y0 || 0])})/\${f32(win.w / 1080)}\` : "uv*vec2f(1080.0,1920.0)"};
 if(frame>=\${f32(i ? b.from : -1e9)}&&frame<\${f32(bgs[i + 1]?.from ?? 1e9)}){let at=scene/vec2f(1080.0,1920.0);return over(textureSampleLevel(input1,linearSampler,at,0.0)*within(at,vec2f(1080.0,1920.0)),source(uv));}return source(uv);\`, { inputs: [first, image], functions: "fn cadence(f:f32,p:f32,phase:f32)->f32{return max(0.0,ceil(floor((f+phase)/p)*p-phase));}" });
  }
  const shots = ex.footage.map((shot) => {
    const inset = shot.layout === "inset", box = shot.box || { x: 0, y: 0, w: 1080, h: 1920 };
    let grade = "c.rgb";
    if (shot.grade) {
      const a = shot.grade;
      grade = \`clamp(pow(saturation(\${grade},\${f32(number(a.saturation, 1))}),vec3f(\${f32(number(a.gamma, 1))}))*\${f32(number(a.brightness, 1))},vec3f(0.0),vec3f(1.0))\`;
    }
    const filters = { none: "none", bw: "grayscale(1) contrast(1.12)", "bw-halftone": "grayscale(1) contrast(1.22)", halftone: "none", "warm-film": "sepia(0.28) saturate(1.15) contrast(1.06) brightness(0.96)" };
    grade = cssColor(grade, filters[shot.treatment || "none"]);
    if (shot.gamma) grade = \`pow(\${grade},vec3f(\${f32(shot.gamma)}))\`;
    return \`if(f>=\${f32(shot.from)}&&f<\${f32(shot.to)}){
   let local=max(0.0,\${cadence(shot.cadence, "f", fps)}-\${f32(shot.from)});let push=\${shot.move === "slow-push" ? \`1.0+.06*local/\${f32(Math.max(1, shot.to - shot.from))}\` : "1.0"};
   \${inset ? \`let box=\${vec([box.x, box.y, box.w, box.h])};let at=(scene-box.xy)/box.zw;let sourceSize=vec2f(textureDimensions(input0));let scale=max(box.z/sourceSize.x,box.w/sourceSize.y);let fitted=sourceSize*scale;let coord=((at-.5)*box.zw/push)/fitted+.5;let mask=roundRect(scene-box.xy,box.zw,\${f32(box.r || 36)});\` : \`let origin=\${win ? vec([(win.x0 + win.w / 2) / (win.frameWidth || win.h * 16 / 9), ((win.y0 || 0) + win.h / 2) / (win.frameHeight || win.h)]) : "vec2f(.5)"};let coord=(uv-origin)/push+origin;let mask=1.0;\`}
   let c=straight(source(coord));result=over(premul(vec4f(\${grade},c.a))*mask,result);
  }\`;
  }).join("\\n");
  let output = g.pass(\`let f=uniforms.clock.x+\${f32(offset)};let scene=\${win ? \`(uv*\${vec([win.frameWidth || win.h * 16 / 9, win.frameHeight || win.h])}-\${vec([win.x0, win.y0 || 0])})/\${f32(win.w / 1080)}\` : "uv*vec2f(1080.0,1920.0)"};var result=textureSampleLevel(input1,linearSampler,uv,0.0);\${shots}return result;\`, { inputs: ["source", first], functions: "fn cadence(f:f32,p:f32,phase:f32)->f32{return max(0.0,ceil(floor((f+phase)/p)*p-phase));}" });
  if (ex.screen) {
    for (const [footage, sc] of [[false, ex.screen], [true, ex.footageScreen]].filter(([, s]) => s)) {
      const image = g.image(screenSvg(sc)), on = ex.screenSpans ? ex.screenSpans.map((sp) => \`(f>=\${f32(sp.from)}&&f<\${f32(sp.to)})\`).join("||") || "false" : "true";
      const useFootage = ex.footage.filter((s) => s.screen === "footage").map((s) => \`(f>=\${f32(s.from)}&&f<\${f32(s.to)})\`).join("||") || "false";
      const h = sc.highlights, weight = h ? \`1.0-\${f32(1 - number(h.keep, 1))}*sat((dot(straight(result).rgb,vec3f(.299,.587,.114))*255.0-\${f32(number(h.from))})/\${f32(Math.max(1e-6, number(h.to, 1) - number(h.from)))})\` : "1.0";
      output = g.pass(\`let f=uniforms.clock.x+\${f32(offset)};var result=source(uv);let enabled=(\${on})&&\${footage ? \`(\${useFootage})\` : ex.footageScreen ? \`!(\${useFootage})\` : "true"};if(!enabled){return result;}
   let scene=\${win ? \`(uv*\${vec([win.frameWidth || win.h * 16 / 9, win.frameHeight || win.h])}-\${vec([win.x0, win.y0 || 0])})/\${f32(win.w / 1080)}\` : "uv*vec2f(1080.0,1920.0)"};let at=scene/vec2f(1080.0,1920.0);var weight=\${weight};
   \${ex.footage.filter((s) => s.clean && s.box).map((s) => \`if(f>=\${f32(s.from)}&&f<\${f32(s.to)}&&all(scene>=\${vec([s.box.x, s.box.y])})&&all(scene<=\${vec([s.box.x + s.box.w, s.box.y + s.box.h])})){weight=0.0;}\`).join("\\n")}
   let n=textureSampleLevel(input1,linearSampler,at,0.0);let gray=mix(vec3f(\${f32(number(sc.base, 128) / 255)}),n.rgb,weight);let mask=within(at,vec2f(1080.0,1920.0));
   \${sc.blend === "multiply" ? "return vec4f(mix(result.rgb,result.rgb*gray,mask),result.a);" : sc.blend === "screen" ? "return screen(result,vec4f(gray,1.0)*mask);" : "return blendOverlay(result,vec4f(gray,1.0)*mask);"}\`, { inputs: [output, image], functions: GRADIENTS });
    }
  }
  return g.finish(output);
}

// shared/shader-effects/eo-shorts.mjs
function options(kind, input, context = null) {
  context = context || {};
  if ("tsxCode" in input) throw Error("A WGSL effect cannot carry legacy TSX");
  const data = { ...Object.fromEntries((input.editableParameters || []).map((control) => [control.key, control.defaultValue])), ...input.parameters };
  let shader;
  switch (kind) {
    case "look":
      shader = eoLook(data);
      break;
    default:
      throw Error("Unknown eo-shorts effect: " + kind);
  }
  return { ...input, parameters: data, shader };
}

return options;})();
${prelude(g)}
const TSX = ${lit(i.tsx)};
const P = ${lit({ targets: i.targets.map(withPath), expected: i.expected.map(withPath), root: i.footageRoot, label: i.label ?? "EO Shorts: footage looks" })};
await guard();
const files = await sourceFiles(p);
const ridOf = (path) => { const f = files.find((x) => samePath(x.path, path)); return f ? f.resourceId : null; };
const ours = new Set(files.filter((f) => f.resourceId && under(f.path, P.root)).map((f) => f.resourceId));
const isLook = (name) => /^EO [A-Za-z0-9_.-]+ look [0-9a-f]{12}$/.test(name);
const mineClip = (c) => c.resourceId && (c.trackKind === "main" || (c.trackKind === "video" && ours.has(c.resourceId)));
const sameClip = (t, c) => c.startFrame === t.start && c.endFrame === t.end && (t.kind === "main" ? c.trackKind === "main" : c.trackKind === "video" && c.resourceId === ridOf(t.path));
const wanted = (c) => P.expected.filter((t) => sameClip(t, c)).map((t) => t.label);
let removed = [];
for (let n = 0; n < 1000; n += 1) {
  let hit = null;
  for (const c of await d.clips({ trackScope: "all" })) {
    if (!mineClip(c)) continue;
    const want = wanted(c);
    const seen = new Set();
    for (const e of await d.videoEffects(c)) {
      if (!isLook(e.name)) continue;
      if (!want.includes(e.name) || seen.has(e.name)) { hit = { e, at: c.startFrame + "-" + c.endFrame }; break; }
      seen.add(e.name);
    }
    if (hit) break;
  }
  if (!hit) break;
  await d.removeVideoEffect(hit.e);
  removed.push(hit.e.name + " @ " + hit.at);
}
const find = async (t) => (await d.clips({ trackScope: "all" })).find((c) => sameClip(t, c)) || null;
let added = 0, kept = 0;
for (const t of P.targets) {
  const c = await find(t);
  if (!c) throw new Error("effects: no clip " + t.kind + " " + t.start + "-" + t.end + (t.path ? " (" + t.path + ")" : ""));
  if ((await d.videoEffects(c)).some((e) => e.name === t.label)) { kept += 1; continue; }
  await d.addVideoEffect(pluginShaderOptions("look",{clip: c,
label: t.label,
parameters: t.params}));
  added += 1;
}
let commitId = null;
if (added || removed.length) commitId = (await d.commitAll(P.label)).commitId || null;
const bad = [];
for (const t of P.targets) {
  const c = await find(t);
  const names = c ? (await d.videoEffects(c)).map((e) => e.name) : null;
  if (!names || names.filter((x) => x === t.label).length !== 1) bad.push(t.label + " on " + t.kind + " " + t.start + "-" + t.end + ": " + JSON.stringify(names));
}
if (bad.length) throw new Error("read back: " + bad.join("; "));
return { added, kept, removed, commitId };`;
}

export function effectsStateScript(g: ComposeGuard, i: Pick<EffectsInput, "targets" | "footageRoot">): string {
  return `${prelude(g)}
const P = ${lit({ targets: i.targets.map(({ params: _p, ...t }) => withPath(t)), root: i.footageRoot })};
await guard();
const files = await sourceFiles(p);
const ridOf = (path) => { const f = files.find((x) => samePath(x.path, path)); return f ? f.resourceId : null; };
const sameClip = (t, c) => c.startFrame === t.start && c.endFrame === t.end && (t.kind === "main" ? c.trackKind === "main" : c.trackKind === "video" && c.resourceId === ridOf(t.path));
const all = await d.clips({ trackScope: "all" });
let placed = 0;
for (const t of P.targets) {
  const c = all.find((x) => sameClip(t, x));
  if (c && (await d.videoEffects(c)).filter((e) => e.name === t.label).length === 1) placed += 1;
}
return { placed, of: P.targets.length };`;
}

export function compositionScript(g: ComposeGuard, footageRoot: string): string {
  return `${prelude(g)}
const ROOT = ${lit(footageRoot)};
await guard();
const files = await sourceFiles(p);
const fileOf = (rid) => files.find((f) => f.resourceId === rid) || null;
const meta = await d.meta();
const out = { fps: meta.fps, frameSize: meta.frameSize, durationFrames: meta.durationFrames, mainEnd: 0, main: [], overlays: [], graphics: [], other: 0 };
for (const c of await d.clips({ trackScope: "all" })) {
  if (c.trackKind === "main") {
    out.mainEnd = Math.max(out.mainEnd, c.endFrame);
    if (!c.resourceId) { out.main.push({ start: c.startFrame, end: c.endFrame, resourceId: null, path: null, source: null, transform: null, effects: [] }); continue; }
    const f = fileOf(c.resourceId);
    let t = null;
    try { t = await d.clipTransform(c); } catch (e) { t = null; }
    out.main.push({ start: c.startFrame, end: c.endFrame, resourceId: c.resourceId, path: f ? f.path : null, source: f && f.frameSize ? f.frameSize : null,
      transform: t && t.enabled !== false ? { scale: t.scale, position: t.position, rotation: t.rotation, anchor: t.anchor } : null,
      effects: (await d.videoEffects(c)).map((e) => e.name) });
  } else if (c.trackKind === "video" && c.resourceId) {
    const f = fileOf(c.resourceId);
    out.overlays.push({ start: c.startFrame, end: c.endFrame, resourceId: c.resourceId, path: f ? f.path : null, trackId: c.trackId, ours: !!(f && under(f.path, ROOT)),
      effects: (await d.videoEffects(c)).map((e) => e.name) });
  } else if (c.trackKind === "video" || c.trackKind === "audio") out.other += 1;
}
out.main.sort((a, b) => a.start - b.start);
out.overlays.sort((a, b) => a.start - b.start);
out.graphics = (await d.motionGraphics()).map((x) => ({ name: x.name, start: x.clip.startFrame, end: x.clip.endFrame, trackId: x.clip.trackId })).sort((a, b) => a.start - b.start);
return out;`;
}
