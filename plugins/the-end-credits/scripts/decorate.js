
const pluginShaderOptions=(()=>{// shared/shader-effects/graph.mjs
var IMAGE = `
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
`;
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
  return `vec${values.length}f(${values.map(f32).join(",")})`;
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
    const id = `p${this.passes.length}`;
    this.passes.push({ id, inputs, parameters: values, wgsl: IMAGE + functions + `
fn effect(uv:vec2f)->vec4f {${body}}`, ...scale !== 1 ? { scale } : {} });
    for (const binding of bindings) this.uniforms.push({ pass: id, ...binding });
    return id;
  }
  image(svg, size = null) {
    const id = `image${this.images.length}`;
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
function parameters(data, defaults) {
  const values = [], bindings = [], refs = /* @__PURE__ */ Object.create(null);
  for (const [key, fallback] of Object.entries(defaults)) {
    const index = values.length;
    values.push(number(data[key], Number(fallback)));
    if (data[key] != null) bindings.push({ index, parameter: key });
    refs[key] = `uniforms.values[${Math.floor(index / 4)}][${index % 4}]`;
  }
  return { values, bindings, refs };
}
function choice(p, data, key, values, fallback) {
  const value = data[key] ?? fallback, index = p.values.length;
  if (!Object.hasOwn(values, String(value))) throw Error(`Unsupported ${key}: ${value}`);
  p.values.push(values[String(value)]);
  if (data[key] != null) p.bindings.push({ index, parameter: key, values });
  return `uniforms.values[${Math.floor(index / 4)}][${index % 4}]`;
}

// shared/shader-effects/grades.mjs
var TABLE = `
fn rounded5(x:f32)->f32{return floor(sat(x)*100000.0+0.5)/100000.0;}
fn archivePoint(channel:u32,x:f32,s:f32,w:f32)->f32 {
 let h=ease((x-.5)/.5);let u=sat(x/.5);let toe=16.0*u*u*(1.0-u)*(1.0-u);
 let base=x+.12*s*sin(6.28318530718*x)/6.28318530718-.1*s*toe-.06*s*ease((x-.6)/.4);
 var shift=-.1*s*w*h;if(channel==0u){shift=.35*s*w*h*(1.0-x);}else if(channel==1u){shift=-.015*s*w*h;}
 return rounded5(base+shift);
}
fn creditsPoint(channel:u32,x:f32,s:f32)->f32 {
 let shadow=vec3f(-.05,.012,.035);let high=vec3f(-.03,-.01,.005);
 return rounded5(x+s*(shadow[channel]*6.75*x*(1.0-x)*(1.0-x)+high[channel]*(256.0/27.0)*x*x*x*(1.0-x)));
}
fn curve(channel:u32,x:f32,s:f32,w:f32,kind:u32)->f32 {
 let at=sat(x)*32.0;let lo=floor(at)/32.0;let hi=min(1.0,lo+1.0/32.0);
 if(kind==0u){return mix(archivePoint(channel,lo,s,w),archivePoint(channel,hi,s,w),fract(at));}
 return mix(creditsPoint(channel,lo,s),creditsPoint(channel,hi,s),fract(at));
}
`;
function grade(kind, data = null) {
  data = data || {};
  const g = new Graph(data);
  const p = parameters(data, { strength: kind === "archive" ? 0.3 : kind === "credits" ? 0.5 : 0.35, warmth: 1 });
  const s = `sat(${p.refs.strength})`, w = `clamp(${p.refs.warmth},0.0,2.0)`;
  let body;
  if (kind === "archive") body = `
    let s=${s};let w=${w};let src=source(uv);if(s==0.0){return src;}var c=straight(src).rgb;
    let green=sat(10.0*(c.g-c.r)-.1)*sat(1.0-4.0*(c.b-c.g));
    c=mix(c,saturation(c,1.0-.7*s),green);
    let orange=sat(2.5*(c.r-c.b)-1.0);c=mix(c,saturation(c,1.0-.6*s),orange);
    c=saturation(c,1.0+.05*s);
    return premul(vec4f(curve(0u,c.r,s,w,0u),curve(1u,c.g,s,w,0u),curve(2u,c.b,s,w,0u),src.a));`;
  else if (kind === "credits") body = `
    let s=${s};let src=source(uv);if(s==0.0){return src;}var c=straight(src).rgb;
    let warm=sat(1.6*(c.r-c.b)-.4);c=mix(c,saturation(c,1.0-.45*s),warm);c=saturation(c,1.0-.12*s);
    return premul(vec4f(curve(0u,c.r,s,0.0,1u),curve(1u,c.g,s,0.0,1u),curve(2u,c.b,s,0.0,1u),src.a));`;
  else if (kind === "soft") body = `
    let s=${s};let src=source(uv);let c=straight(src).rgb;let l=dot(c,vec3f(.2126,.7152,.0722));
    let graded=clamp(c*(1.0-.08*s)+.046*s,vec3f(0.0),vec3f(1.0));
    let tint=vec3f(1.0,0.0,.55)*max(0.0,.25*s*(l-.6));
    return premul(vec4f(clamp(graded+tint,vec3f(0.0),vec3f(1.0)),src.a));`;
  else if (kind === "golden") body = `
    let s=${s};let src=source(uv);var c=straight(src).rgb;
    c=sepia(c,floor(.22*s*1000.0+.5)/1000.0);
    c=saturation(c,floor((1.0+.3*s)*1000.0+.5)/1000.0);
    c=hue(c,(floor(-6.0*s*100.0+.5)/100.0)*.01745329252);
    c=brightness(c,floor((1.0+.03*s)*1000.0+.5)/1000.0);
    c=contrast(c,floor((1.0+.05*s)*1000.0+.5)/1000.0);
    return premul(vec4f(c,src.a));`;
  else throw Error(`Unknown grade: ${kind}`);
  g.pass(body, { ...p, functions: TABLE });
  return g.finish();
}

// shared/shader-effects/motion.mjs
var MOTIONS = ["off", "push-in", "pull-out", "drift-left", "drift-right", "drift-up", "drift-down", "tilt", "push-drift"];
var PHOTO_MOTION = `
fn photoMotion(mode:u32,p:f32,s:f32,dir:f32,axis:u32,cover:f32,size:vec2f)->vec4f {
 let e=.5-.5*cos(3.14159265359*sat(p));let k=max(1.0,cover);var z=1.0;var xy=vec2f(0.0);var angle=0.0;
 if(mode==1u){z=1.0+.07*s*e;}else if(mode==2u){z=1.0+.07*s*(1.0-e);}
 else if(mode>=3u&&mode<=6u){z=1.0+(6.0*s+2.0)/100.0;
   let sign=select(1.0,-1.0,mode==3u||mode==5u);let at=sign*.03*s*(2.0*e-1.0)/k;
   if(mode<=4u){xy.x=at;}else{xy.y=at;}
 }else if(mode==7u){angle=2.5*s*e*dir*.01745329252;let a=abs(angle);z=(cos(a)+max(size.x/size.y,size.y/size.x)*sin(a))*1.003;}
 else if(mode==8u){z=1.0+.07*s*e;let at=dir*.02*s*e/k;if(axis==1u){xy.y=at;}else{xy.x=at;}}
 return vec4f(xy,z,angle);
}
`;

// shared/shader-effects/credits.mjs
function shotFrame(data) {
  const g = new Graph(data), p = parameters(data, { x: 50.73, y: 12.69, w: 42.6, strength: 1, fadeInSeconds: 0, fadeOutSeconds: 0 });
  const modes = { none: 0, ...Object.fromEntries(MOTIONS.map((m, i) => [m, i])) };
  const mode = choice(p, data, "motion", modes, "none");
  const aspect = number(data.srcAspect, 16 / 9), A = 16 / 9;
  const vis = aspect < A ? [0, (1 - aspect / A) / 2, 1, aspect / A] : [(1 - A / aspect) / 2, 0, A / aspect, 1];
  const duration = Math.max(1, Math.round(number(data.durationFrames, 1))), fps = number(data.fps, 30);
  g.pass(`let visible=${vec(vis)};let width=clamp(${p.refs.w},1.0,100.0)/100.0;
    let origin=visible.xy+visible.zw*clamp(vec2f(${p.refs.x},${p.refs.y}),vec2f(0.0),vec2f(100.0))/100.0;
    let win=visible.zw*width;let local=uniforms.clock.x-${f32(number(data.originFrame))};
    let m=photoMotion(u32(${mode}),local/${f32(Math.max(1, duration - 1))},clamp(${p.refs.strength},0.0,2.0)*.6,${f32(data.direction === -1 ? -1 : 1)},${data.axis === "y" ? "1u" : "0u"},1.0,vec2f(16.0,9.0));
    let shift=origin+win*.5-.5+m.xy*win;
    let translation=floor(shift*1000000.0+.5)/1000000.0;
    let z=floor((width*max(visible.z,visible.w)*m.z*1.002)*100000.0+.5)/100000.0;
    let a=floor(m.w/.01745329252*1000.0+.5)/1000.0*.01745329252;
    let size=uniforms.resolution.xy;let coord=rotate((uv-.5-translation)*size,-a)/z/size+.5;
    let at=(uv-origin)/win;let mask=within(at,win*size);
    var opacity=1.0;let fin=max(0.0,${p.refs.fadeInSeconds})*${f32(fps)};let fout=max(0.0,${p.refs.fadeOutSeconds})*${f32(fps)};
    if(fin>0.0){opacity=min(opacity,local/fin);}if(fout>0.0){opacity=min(opacity,(${f32(duration - 1)}-local)/fout);}
    return over(source(coord)*mask*sat(opacity),vec4f(0.0,0.0,0.0,1.0));`, { ...p, functions: PHOTO_MOTION });
  return g.finish();
}

// shared/shader-effects/the-end-credits.mjs
function options(kind, input, context = null) {
  context = context || {};
  if ("tsxCode" in input) throw Error("A WGSL effect cannot carry legacy TSX");
  const data = { ...Object.fromEntries((input.editableParameters || []).map((control) => [control.key, control.defaultValue])), ...input.parameters };
  let shader;
  switch (kind) {
    case "look":
      shader = grade("credits", data);
      break;
    case "frame":
      shader = shotFrame(data);
      break;
    default:
      throw Error("Unknown the-end-credits effect: " + kind);
  }
  return { ...input, parameters: data, shader };
}

return options;})();
const cfg = __CONFIG__;
const d = selects.draft(cfg.sequenceId);
const GRAPHIC_LABEL = 'THE END credits', LOOK_LABEL = 'Cinematic look', FRAME_LABEL = 'Shot frame';
// cfg is the frozen build record plus the programs: graphic {tsx, parameters, editableParameters}, frame {tsx},
// look {tsx, strength, on}, photoMotion {byRid: {rid: {motion, direction, axis}} (photos), byShot: [{motion, direction,
// axis, frameStrength} | null] (every shot, in Main order; the planner's tecShotMotions)}. Every clock comes from cfg.frames
// (assemble.js), never from seconds. The Shot frame and look Inspector definitions are built here, per clip.
// Optional keys are read through `opt`: a config inlined as a JSON literal has no type for keys it lacks.
const opt: any = cfg;
const classic = cfg.layout !== 'full';
const WINDOWS = { classic: { x: 50.73, y: 12.69, w: 42.6 }, full: { x: 0, y: 0, w: 100 } };
const win = opt.window || (classic ? WINDOWS.classic : WINDOWS.full);
const fades = opt.fades || {};
const fadeIn = typeof fades.inSec === 'number' ? fades.inSec : 0.5;
const fadeOut = typeof fades.outSec === 'number' ? fades.outSec : 1.13;
const endFrame = cfg.frames[cfg.frames.length - 1];
const photos = opt.photos || {};
const byRid = (opt.photoMotion && opt.photoMotion.byRid) || {};
const byShot = opt.photoMotion && Array.isArray(opt.photoMotion.byShot) ? opt.photoMotion.byShot : null;
// The Shot frame's motion strength: photos 1, videos 0.5 (the effect scales both by 0.6 inside the small window).
const VIDEO_STRENGTH = 0.5;
const isPhoto = rid => Object.prototype.hasOwnProperty.call(photos, rid);
const aspectOf = rid => {
  const s = (opt.sources || {})[rid] || photos[rid];
  return s && s.aspect > 0 ? s.aspect : 16 / 9;
};
const shots = async () => (await d.clips({ trackScope: 'main' })).filter(c => c.resourceId !== null).sort((a, b) => a.startFrame - b.startFrame);
// A label can come back as the effect's name or its effectName; both count.
const stack = async clip => [].concat(...(await d.videoEffects(clip)).map(e => [e.name, e.effectName]));
// Inspector definitions. Each default is this clip's own value (the fades differ per clip). The window is adjustable
// in Classic only; every shot (video or photo) gets its motion and strength (the effect scales the strength to the
// window's restrained move).
// Labels come from cfg.labels in the panel's UI language at build time; each one falls back to English (the headless
// driver sends none).
const labels = opt.labels || {};
const label = (key, en) => (typeof labels[key] === 'string' && labels[key] ? labels[key] : en);
const motionLabels = labels.motions || {};
const MOTIONS = [['none', 'None'], ['push-in', 'Push in'], ['pull-out', 'Pull out'], ['drift-left', 'Drift left'], ['drift-right', 'Drift right'],
  ['drift-up', 'Drift up'], ['drift-down', 'Drift down'], ['tilt', 'Tilt'], ['push-drift', 'Push and drift']]
  .map(([value, en]) => ({ label: typeof motionLabels[value] === 'string' && motionLabels[value] ? motionLabels[value] : en, value }));
const num = (key, label, value, min, max, step) => ({ key, label, type: 'number', defaultValue: value, min, max, step });
const frameDefs = params => {
  const defs: any[] = [];
  if (classic) defs.push(num('x', label('windowX', 'Window X (%)'), params.x, 0, 100, 0.1), num('y', label('windowY', 'Window Y (%)'), params.y, 0, 100, 0.1),
    num('w', label('windowSize', 'Window size (%)'), params.w, 5, 100, 0.1));
  defs.push(num('fadeInSeconds', label('fadeIn', 'Fade in (s)'), params.fadeInSeconds, 0, 3, 0.05), num('fadeOutSeconds', label('fadeOut', 'Fade out (s)'), params.fadeOutSeconds, 0, 3, 0.05));
  defs.push({ key: 'motion', label: label('motion', 'Motion'), type: 'select', defaultValue: params.motion, options: MOTIONS }, num('strength', label('motionStrength', 'Motion strength'), params.strength, 0, 2, 0.1));
  return defs;
};
const notes = [];
// Idempotent: a retry after a half-finished or unreported earlier run adds only what is still missing, and never
// replaces an effect that is already there (Adjust edits survive a retry).
// Mute first: setAudioTracks reads the saved Draft's audio inventory, which a Draft created in the same call lacks.
let muted = false, muteKept = false;
if (cfg.clipSound === 'off') {
  const main = await shots();
  const videos = main.filter(c => !isPhoto(c.resourceId));
  if (!main.length || videos.every(c => Array.isArray(c.audioSourceIndexes) && c.audioSourceIndexes.length === 0)) muteKept = true;
  else {
    // Clips whose source has no audio stream keep null routing after muting, so the check above cannot see a finished
    // mute on them. The EditDiff decides: opCount 0 means already muted or nothing to mute. The target starts at the
    // first shot so the Classic lead-in gap stays out of it.
    let diff;
    try { diff = await d.setAudioTracks({ target: await d.rangeAtFrames(main[0].startFrame, main[main.length - 1].endFrame), audioSourceIndexes: [] }); }
    catch (e) { throw Error('Could not mute the clips\' own sound: ' + (e && e.message || e)); }
    if (diff && diff.opCount === 0) muteKept = true; else muted = true;
  }
}
const hasGraphic = (await d.motionGraphics()).some(g => g.name === GRAPHIC_LABEL);
if (!hasGraphic) await d.addMotionGraphic({ within: await d.rangeAtFrames(0, endFrame), label: GRAPHIC_LABEL, tsxCode: cfg.graphic.tsx,
  parameters: cfg.graphic.parameters, editableParameters: cfg.graphic.editableParameters as any });
// Per shot: the Cinematic look first, then the Shot frame last, so the look never tints the black surround.
const lookOn = !!(cfg.look && cfg.look.on);
const lookStrength = cfg.look && typeof cfg.look.strength === 'number' ? cfg.look.strength : 0.5;
const lookDefs = [num('strength', label('lookStrength', 'Look strength'), lookStrength, 0, 1, 0.05)];
let looks = 0, looksKept = 0, looksSkipped = 0, shotFrames = 0, shotFramesKept = 0;
const count = (await shots()).length;
for (let i = 0; i < count; i++) {
  // Re-read each time: every edit makes earlier rows stale.
  let clip = (await shots())[i];
  const names = await stack(clip);
  const hasFrame = names.includes(FRAME_LABEL);
  if (lookOn) {
    if (names.includes(LOOK_LABEL)) looksKept++;
    // A look appended after an existing Shot frame would tint the black surround; the frame is never replaced.
    else if (hasFrame) looksSkipped++;
    else {
      await d.addVideoEffect(pluginShaderOptions("look",{clip,
label: LOOK_LABEL,
parameters: { strength: lookStrength },
editableParameters: lookDefs as any}));
      looks++;
      clip = (await shots())[i];
    }
  }
  if (hasFrame) { shotFramesKept++; continue; }
  const rid = clip.resourceId;
  const photo = isPhoto(rid);
  const params: any = { x: win.x, y: win.y, w: win.w, srcAspect: aspectOf(rid), fps: cfg.fps,
    durationFrames: clip.endFrame - clip.startFrame, originFrame: 0,
    fadeInSeconds: classic && i === 0 ? fadeIn : 0, fadeOutSeconds: i === count - 1 ? fadeOut : 0,
    motion: 'none', strength: photo ? 1 : VIDEO_STRENGTH, direction: 1, axis: 'x' };
  // Per shot when the record has it for every shot (a source used twice can move differently), else photos by rid.
  const pm = byShot && byShot.length === count ? byShot[i] : photo ? byRid[rid] : null;
  if (pm) {
    params.motion = pm.motion || 'none';
    if (pm.direction != null) params.direction = pm.direction;
    if (pm.axis != null) params.axis = pm.axis;
    if (typeof pm.frameStrength === 'number') params.strength = pm.frameStrength;
  }
  const defs = frameDefs(params);
  await d.addVideoEffect(pluginShaderOptions("frame",{clip,
label: FRAME_LABEL,
parameters: params,
editableParameters: defs as any}));
  shotFrames++;
}
if (looksSkipped) notes.push(looksSkipped + (looksSkipped === 1 ? ' shot keeps its frame' : ' shots keep their frame') + ' without the look');
// Commit only when this run added or changed something: commitAll rejects an empty change ("Nothing to stage"), which a
// retry after a landed but unreported commit would otherwise hit. Nothing to do is success (alreadyDone).
const committed = muted || !hasGraphic || looks > 0 || shotFrames > 0;
if (committed) await d.commitAll('THE END Credits: title and look');
return { graphicAdded: !hasGraphic, looks, looksKept, looksSkipped, shotFrames, shotFramesKept, muted, muteKept, committed, alreadyDone: !committed, notes };
