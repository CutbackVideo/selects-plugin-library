// Run-script builders that write the Short into Drafts. Each saves with commitAll inside the same run.
import { J, LIST_FILES, script, type Sdk } from "./host";
import { lookCode, graphicCode } from "../renderers";
import type { ClipFrame } from "./framing";
import { W, H } from "./framing";

export const LOOK_LABEL = "a16z Vertical Frame";
export const GRAPHIC_LABEL = "a16z Captions";

// One commit: a new 9:16 Draft holding the kept ranges of the source Draft, every Main clip stretched to
// the frame and given the framing effect. The app opens a Draft created this way at once, so it is
// framed before it opens.
export async function createShort(sdk: Sdk, pid: string, sid: string, baseName: string, ranges: [number, number][], frames: ClipFrame[], fps: number): Promise<{ id: string; name: string }> {
  const plan = frames.map((c) => ({ start: c.start, end: c.end, sw: c.sw, sh: c.sh, shots: c.shots, open: c.open || null }));
  const r = await script(
    sdk,
    "Create the 9:16 Short",
    `
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

// shared/shader-effects/speaker.mjs
function a16zLook(data = null) {
  data = data || {};
  const g = new Graph(data), W = number(data.W, 1080), H = number(data.H, 1920), sw = number(data.sw, 1920), sh = number(data.sh, 1080);
  const start = number(data.start), shots = data.shots || [];
  const fallback = shots.at(-1) || { x: 0, y: (H - W * sh / sw) / 2, w: W, h: W * sh / sw };
  const windows = (data.windows || []).map((win) => \`if(f>=\${f32(win.from)}&&f<\${f32(win.to)}){
    let progress=sat((f-\${f32(win.from)})/\${f32(Math.max(1, win.to - win.from))});let w=.78*\${f32(W)}*(1.0-.04*progress);let h=w*\${f32(sh / sw)};
    let at=(uv*size-vec2f((\${f32(W)}-w)*.5,.54*\${f32(H)}-h*.5))/vec2f(w,h);
    return over(source(at)*within(at,vec2f(w,h)),vec4f(vec3f(244.0,245.0,247.0)/255.0,1.0));
  }\`).join("\\n");
  const find = shots.map((s, i) => \`\${i ? "else " : ""}if(f>=\${f32(s.from)}&&f<\${f32(s.to)}){shot=\${vec([s.x, s.y, s.w, s.h])};first=\${i === 0 ? "true" : "false"};}\`).join("\\n");
  let move = "";
  if (data.push && data.end > start) move = \`z=floor((1.0+\${f32(data.push)}*sat((f-\${f32(start)})/\${f32(data.end - start)}))*10000.0+.5)/10000.0;\`;
  else if (data.open && shots.length) move = \`if(first){let k=max(0.0,(f-\${f32(number(shots[0].from))})*\${f32(24 / number(data.fps, 24))});
    let candidate=1.0+\${f32(data.open.s0 - 1)}*pow(.68,k);if(candidate>1.0005){z=floor(candidate*10000.0+.5)/10000.0;origin=\${vec([data.open.ax, data.open.ay])};}}\`;
  g.pass(\`let size=\${vec([W, H])};let f=uniforms.clock.x+\${f32(start)};\${windows}
    var shot=\${vec([fallback.x, fallback.y, fallback.w, fallback.h])};var first=false;\${find}
    var z=1.0;var origin=size*.5;\${move}
    let at=(uv*size-origin)/z+origin;let coord=(at-shot.xy)/shot.zw;
    let c=straight(source(coord));return over(premul(vec4f(\${cssColor("c.rgb", data.grade)},c.a)),vec4f(0.0,0.0,0.0,1.0));\`);
  return g.finish();
}

// shared/shader-effects/a16z-style-captions.mjs
function options(kind, input, context = null) {
  context = context || {};
  if ("tsxCode" in input) throw Error("A WGSL effect cannot carry legacy TSX");
  const data = { ...Object.fromEntries((input.editableParameters || []).map((control) => [control.key, control.defaultValue])), ...input.parameters };
  let shader;
  switch (kind) {
    case "look":
      shader = a16zLook(data);
      break;
    default:
      throw Error("Unknown a16z-style-captions effect: " + kind);
  }
  return { ...input, parameters: data, shader };
}

return options;})();
const p = selects.project(${J(pid)});
const src = selects.draft(${J(sid)});
const taken: string[] = [];
for (const id of ((await p.meta()) as any).draftIds || []) { try { taken.push((await selects.draft(id).meta()).name); } catch {} }
let name = ${J(baseName)};
for (let k = 2; taken.includes(name); k += 1) name = ${J(baseName)} + " (" + k + ")";
const d = await p.createDraft({ name });
for (const [s, e] of ${J(ranges)} as [number, number][]) await d.insert({ source: await src.rangeAtFrames(s, e), tracks: "main" });
await d.setFrameSize({ width: ${W}, height: ${H} });
const PLAN: any[] = ${J(plan)};
const LOOK = ${J(lookCode)};
const mains = async () => (await d.clips({ trackScope: "main" })).filter((c: any) => c.trackKind === "main" && c.resourceId != null);
const stretch = (sw: number, sh: number) => { const k = Math.min(${W} / sw, ${H} / sh); return { x: ${W} / (sw * k), y: ${H} / (sh * k) }; };
const ids: number[] = [];
const missing: number[] = [];
for (const m of PLAN) {
  const all = await mains();
  const clip: any = all.find((c: any) => c.startFrame === m.start) || all.find((c: any) => c.startFrame <= m.start && c.endFrame > m.start);
  if (!clip) { missing.push(m.start); ids.push(-1); continue; }
  ids.push(clip.clipId);
  await d.setClipTransform({ clip, scale: stretch(m.sw, m.sh), position: { x: 0, y: 0 }, rotation: 0 });
}
for (let k = 0; k < PLAN.length; k += 1) {
  if (ids[k] < 0) continue;
  const m = PLAN[k];
  const clip: any = (await mains()).find((c: any) => c.clipId === ids[k]);
  if (!clip) continue;
  await d.addVideoEffect(pluginShaderOptions("look",{clip,
label: ${J(LOOK_LABEL)},
parameters: { W: ${W}, H: ${H}, fps: ${J(fps)}, sw: m.sw, sh: m.sh, start: clip.startFrame, shots: m.shots, open: m.open },
editableParameters: []}));
}
const saved = await d.commitAll("a16z Style Captions: new 9:16 Short");
if (!saved.createdDraftId) throw new Error("The Short was not created.");
return { id: saved.createdDraftId, name, missing };`,
    true
  );
  if (!r?.id) throw new Error("The Short was not created.");
  return { id: r.id, name: r.name };
}

export async function importFiles(sdk: Sdk, pid: string, paths: string[]): Promise<{ id: string; path: string }[]> {
  return script(
    sdk,
    "Add the Short's media to the Project",
    `const p = selects.project(${J(pid)});
const paths: string[] = ${J(paths)};
${LIST_FILES}
// a rebuild reuses files the Project already has
const have = await listFiles(p);
const missing = paths.filter((path) => !have.some((x: any) => x.path === path));
const added = missing.length ? (await p.importFiles({ paths: missing })).addedResourceIds : [];
const files = missing.length ? await listFiles(p) : have;
return paths.map((path) => {
  const f = files.find((x: any) => x.path === path);
  // a single new file is the one resource the import added, even before the listing shows it
  const id = f ? f.resourceId : missing.length === 1 && added.length === 1 && missing[0] === path ? added[0] : null;
  return { id, path };
});`,
    true
  );
}

export type PlacedInsert = { id: string; a: number; b: number; sw: number; sh: number; rect: { x: number; y: number; w: number; h: number }; push: number };

// B-roll first (each clip silent, cover-cropped by the frame effect), then the graphic over the whole
// Short (new tracks go on top, so the captions sit over the B-roll), the music bed and the gains, in
// one commit.
export async function finishShort(
  sdk: Sdk,
  rid: string,
  pid: string,
  endFrame: number,
  data: any,
  music: { id: string; db: number } | null,
  voiceDb: number,
  inserts: PlacedInsert[] = [],
  fps = 24,
  relook: { clips: ClipFrame[]; windows: { from: number; to: number }[] } | null = null
) {
  const frames = relook ? relook.clips.map((c) => ({ start: c.start, sw: c.sw, sh: c.sh, shots: c.shots, open: c.open || null })) : [];
  return script(
    sdk,
    "Add B-roll, captions, graphics and music",
    `
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

// shared/shader-effects/speaker.mjs
function a16zLook(data = null) {
  data = data || {};
  const g = new Graph(data), W = number(data.W, 1080), H = number(data.H, 1920), sw = number(data.sw, 1920), sh = number(data.sh, 1080);
  const start = number(data.start), shots = data.shots || [];
  const fallback = shots.at(-1) || { x: 0, y: (H - W * sh / sw) / 2, w: W, h: W * sh / sw };
  const windows = (data.windows || []).map((win) => \`if(f>=\${f32(win.from)}&&f<\${f32(win.to)}){
    let progress=sat((f-\${f32(win.from)})/\${f32(Math.max(1, win.to - win.from))});let w=.78*\${f32(W)}*(1.0-.04*progress);let h=w*\${f32(sh / sw)};
    let at=(uv*size-vec2f((\${f32(W)}-w)*.5,.54*\${f32(H)}-h*.5))/vec2f(w,h);
    return over(source(at)*within(at,vec2f(w,h)),vec4f(vec3f(244.0,245.0,247.0)/255.0,1.0));
  }\`).join("\\n");
  const find = shots.map((s, i) => \`\${i ? "else " : ""}if(f>=\${f32(s.from)}&&f<\${f32(s.to)}){shot=\${vec([s.x, s.y, s.w, s.h])};first=\${i === 0 ? "true" : "false"};}\`).join("\\n");
  let move = "";
  if (data.push && data.end > start) move = \`z=floor((1.0+\${f32(data.push)}*sat((f-\${f32(start)})/\${f32(data.end - start)}))*10000.0+.5)/10000.0;\`;
  else if (data.open && shots.length) move = \`if(first){let k=max(0.0,(f-\${f32(number(shots[0].from))})*\${f32(24 / number(data.fps, 24))});
    let candidate=1.0+\${f32(data.open.s0 - 1)}*pow(.68,k);if(candidate>1.0005){z=floor(candidate*10000.0+.5)/10000.0;origin=\${vec([data.open.ax, data.open.ay])};}}\`;
  g.pass(\`let size=\${vec([W, H])};let f=uniforms.clock.x+\${f32(start)};\${windows}
    var shot=\${vec([fallback.x, fallback.y, fallback.w, fallback.h])};var first=false;\${find}
    var z=1.0;var origin=size*.5;\${move}
    let at=(uv*size-origin)/z+origin;let coord=(at-shot.xy)/shot.zw;
    let c=straight(source(coord));return over(premul(vec4f(\${cssColor("c.rgb", data.grade)},c.a)),vec4f(0.0,0.0,0.0,1.0));\`);
  return g.finish();
}

// shared/shader-effects/a16z-style-captions.mjs
function options(kind, input, context = null) {
  context = context || {};
  if ("tsxCode" in input) throw Error("A WGSL effect cannot carry legacy TSX");
  const data = { ...Object.fromEntries((input.editableParameters || []).map((control) => [control.key, control.defaultValue])), ...input.parameters };
  let shader;
  switch (kind) {
    case "look":
      shader = a16zLook(data);
      break;
    default:
      throw Error("Unknown a16z-style-captions effect: " + kind);
  }
  return { ...input, parameters: data, shader };
}

return options;})();
const d = selects.draft(${J(rid)});
const p = selects.project(${J(pid)});
const INS: any[] = ${J(inserts)};
const LOOK = ${J(inserts.length || relook ? lookCode : "")};
// the Main clips' frame effect again, with this build's window cards
const FRAMES: any[] = ${J(frames)};
const WINDOWS: any[] = ${J(relook ? relook.windows : [])};
for (const m of FRAMES) {
  const clip: any = (await d.clips({ trackScope: "main" })).find((c: any) => c.trackKind === "main" && c.startFrame === m.start);
  if (!clip) continue;
  for (const e of await d.videoEffects(clip)) if (e.name === ${J(LOOK_LABEL)}) await d.removeVideoEffect(e);
  const again: any = (await d.clips({ trackScope: "main" })).find((c: any) => c.clipId === clip.clipId);
  await d.addVideoEffect(pluginShaderOptions("look",{clip: again,
label: ${J(LOOK_LABEL)},
parameters: { W: ${W}, H: ${H}, fps: ${J(fps)}, sw: m.sw, sh: m.sh, start: again.startFrame, shots: m.shots, open: m.open, windows: WINDOWS },
editableParameters: []}));
}
const stretch = (sw: number, sh: number) => { const k = Math.min(${W} / sw, ${H} / sh); return { x: ${W} / (sw * k), y: ${H} / (sh * k) }; };
let placed = 0;
const skipped: number[] = [];
for (const b of INS) {
  // one clip that will not place must not stop the captions
  try { await d.overlayResource({ resource: p.resource(b.id), over: await d.rangeAtFrames(b.a, b.b), sourceStartSeconds: 0 }); } catch { skipped.push(b.a); continue; }
  const all = await d.clips({ trackScope: "all" });
  const video: any = all.filter((c: any) => c.trackKind === "video" && c.resourceId === b.id && c.startFrame === b.a)[0];
  if (!video) continue;
  const audio = all.filter((c: any) => c.trackKind === "audio" && c.resourceId === b.id && c.startFrame === b.a);
  if (audio.length) await d.removeClips(audio);
  const v1: any = (await d.clips({ trackScope: "all" })).find((c: any) => c.clipId === video.clipId);
  await d.setClipTransform({ clip: v1, scale: stretch(b.sw, b.sh), position: { x: 0, y: 0 }, rotation: 0 });
  const v2: any = (await d.clips({ trackScope: "all" })).find((c: any) => c.clipId === video.clipId);
  await d.addVideoEffect(pluginShaderOptions("look",{clip: v2,
label: ${J(LOOK_LABEL)},
parameters: { W: ${W}, H: ${H}, fps: ${J(fps)}, sw: b.sw, sh: b.sh, start: b.a, end: b.b, push: b.push, grade: "saturate(0.8) contrast(1.05) brightness(0.97) sepia(0.07)", shots: [{ from: b.a, to: b.b, ...b.rect }] },
editableParameters: []}));
  placed += 1;
}
const g = await d.addMotionGraphic({ label: ${J(GRAPHIC_LABEL)}, tsxCode: ${J(graphicCode)}, parameters: ${J(data)}, editableParameters: [], within: await d.rangeAtFrames(0, ${endFrame}) });
const music: any = ${J(music)};
let musicInserted = 0;
if (music && music.id) {
  const resource = (await p.resources()).find((r) => r.resourceId === music.id);
  const draftFps = (await d.meta()).fps;
  // A generated or cached bed can be shorter than the Short (generation is capped at 150s).
  // Floor to whole Draft frames so no repetition asks past the available source.
  const musicFrames = Math.floor(Number(resource?.durationSeconds) * draftFps);
  if (!Number.isSafeInteger(musicFrames) || musicFrames < 1) throw new Error("The music resource has no usable duration. Reimport the music before rebuilding.");
  for (let start = 0; start < ${endFrame}; start += musicFrames) {
    const end = Math.min(${endFrame}, start + musicFrames);
    // Explicit 1x keeps the exact target length when the source and Draft frame grids differ.
    const bed = await d.overlayResource({ resource: p.resource(music.id), over: await d.rangeAtFrames(start, end), sourceStartSeconds: 0, playbackSpeed: { numerator: 1, denominator: 1 } });
    musicInserted += bed.inserted;
  }
  const clips = (await d.clips({ trackScope: "all" })).filter((c: any) => c.resourceId === music.id);
  for (const c of clips) { const cur: any = (await d.clips({ trackScope: "all" })).find((x: any) => x.clipId === c.clipId); if (cur) await d.setClipAudio({ clip: cur, volumeDb: music.db }); }
}
const voice: number = ${J(voiceDb)};
if (voice) for (const id of (await d.clips({ trackScope: "main" })).filter((c: any) => c.trackKind === "main" && c.resourceId != null).map((c: any) => c.clipId)) {
  const clip: any = (await d.clips({ trackScope: "main" })).find((c: any) => c.clipId === id);
  if (clip) await d.setClipAudio({ clip, volumeDb: voice });
}
const saved = await d.commitAll("a16z Style Captions: B-roll, captions, graphics and music");
return { commitId: saved.commitId, graphic: g.clipId, music: musicInserted, placed, skipped };`,
    true
  );
}

// Back to the bare framed cut: remove this plugin's graphic, the B-roll and music clips (by Resource),
// and reset the voice gain.
export async function stripShort(sdk: Sdk, rid: string, resourceIds: string[]) {
  return script(
    sdk,
    "Clear the previous captions and music",
    `const d = selects.draft(${J(rid)});
const ids: string[] = ${J(resourceIds.filter(Boolean))};
const graphics = (await d.motionGraphics()).filter((g: any) => g.name === ${J(GRAPHIC_LABEL)});
for (const g of graphics) { const cur = (await d.motionGraphics()).find((x: any) => x.clip.clipId === g.clip.clipId); if (cur) await d.removeClips(cur.clip); }
const extra = (await d.clips({ trackScope: "all" })).filter((c: any) => c.resourceId != null && ids.includes(c.resourceId) && c.trackKind !== "main");
if (extra.length) await d.removeClips(extra);
let reset = 0;
for (const id of (await d.clips({ trackScope: "main" })).filter((c: any) => c.trackKind === "main" && c.resourceId != null).map((c: any) => c.clipId)) {
  const clip: any = (await d.clips({ trackScope: "main" })).find((c: any) => c.clipId === id);
  if (clip) { const r: any = await d.setClipAudio({ clip, volumeDb: 0 }); if (r.diff && r.diff.opCount) reset += 1; }
}
if (!graphics.length && !extra.length && !reset) return { graphics: 0, clips: 0, commitId: null };
const saved = await d.commitAll("a16z Style Captions: clear for rebuild");
return { graphics: graphics.length, clips: extra.length, commitId: saved.commitId };`,
    true
  );
}
