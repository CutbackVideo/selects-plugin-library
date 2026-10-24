
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
function photoMotion(data = null, canvas = { width: 1920, height: 1080 }) {
  data = data || {};
  const g = new Graph(data), p = parameters(data, { strength: 1, holdSeconds: 1, cover: 1 });
  const mode = choice(p, data, "motion", Object.fromEntries(MOTIONS.map((m, i) => [m, i])), "off");
  const dir = data.direction === -1 ? -1 : 1, axis = data.axis === "y" ? 1 : 0;
  g.pass(`let hold=max(1.0,${p.refs.holdSeconds}*uniforms.clock.y-1.0);
    let m=photoMotion(u32(${mode}),uniforms.clock.x/hold,clamp(${p.refs.strength},0.0,2.0),${f32(dir)},${axis}u,${p.refs.cover},vec2f(${f32(number(canvas.width, 1920))},${f32(number(canvas.height, 1080))}));
    let xy=floor(m.xy*100000.0+.5)/100000.0;let z=floor(m.z*10000.0+.5)/10000.0;
    let a=floor((m.w/.01745329252)*1000.0+.5)/1000.0*.01745329252;
    let size=uniforms.resolution.xy;
    return source(rotate((uv-.5-xy)*size,-a)/z/size+.5);`, { ...p, functions: PHOTO_MOTION });
  return g.finish();
}
function letterbox(data = null) {
  data = data || {};
  const g = new Graph(data), p = parameters(data, { revealSeconds: number(data.revealEnd, 2.35) - number(data.revealStart, 0.22) });
  const visible = number(data.visible, 1), enabled = choice(p, data, "enabled", { true: 1, false: 0 }, true);
  g.pass(`let t=uniforms.clock.z-${f32(number(data.revealStart, 0.22))};
    let amount=select(1.0,select(sat(t/max(.000001,${p.refs.revealSeconds})),select(0.0,1.0,t>=0.0),${p.refs.revealSeconds}<=0.0),${enabled}>.5);
    let h=amount*${f32(visible)};let mask=sat((h*.5-abs(uv.y-.5))*uniforms.resolution.y+.5);
    return over(source(uv)*mask,vec4f(0.0,0.0,0.0,1.0));`, p);
  return g.finish();
}
function fadeOut(data = null) {
  data = data || {};
  const g = new Graph(data), p = parameters(data, { fadeSeconds: 1 });
  g.pass(`let dur=${f32(number(data.durationFrames))};let n=min(dur,${p.refs.fadeSeconds}*uniforms.clock.y);
    let fade=select(0.0,sat((uniforms.clock.x-(dur-n))/max(.000001,n-1.0)),n>0.0&&dur>0.0);
    return over(vec4f(0.0,0.0,0.0,fade),source(uv));`, p);
  return g.finish();
}

// shared/shader-effects/archive-vlog.mjs
function options(kind, input, context = null) {
  context = context || {};
  if ("tsxCode" in input) throw Error("A WGSL effect cannot carry legacy TSX");
  const data = { ...Object.fromEntries((input.editableParameters || []).map((control) => [control.key, control.defaultValue])), ...input.parameters };
  let shader;
  switch (kind) {
    case "look":
      shader = grade("archive", data);
      break;
    case "motion":
      shader = photoMotion(data, context);
      break;
    case "letterbox":
      shader = letterbox(data);
      break;
    case "fade":
      shader = fadeOut(data);
      break;
    default:
      throw Error("Unknown archive-vlog effect: " + kind);
  }
  return { ...input, parameters: data, shader };
}

return options;})();
const cfg = __CONFIG__;
if (!(cfg.videoEnd > 0)) throw Error('decorate: cfg.videoEnd missing');
const d = selects.draft(cfg.sequenceId);
// Graphic and effect names: a retry and the readback recognise what is already there by them, so they stay English.
const TITLE_LABEL = 'Archive title', CREDIT_LABEL = 'Archived credit', LETTERBOX_LABEL = 'Letterbox reveal', LOOK_LABEL = 'Cinematic look';
const FADE_LABEL = 'Fade out', MOTION_LABEL = 'Photo motion', SHOT_MOTION_LABEL = 'Shot motion';
const OUR_EFFECTS = [LETTERBOX_LABEL, LOOK_LABEL, FADE_LABEL, MOTION_LABEL, SHOT_MOTION_LABEL];
// Inspector (Adjust) labels in the panel's UI language at Build (cfg.adjustLabels), English without them. The title and
// credit Adjust items come ready-made from the panel (cfg.title / cfg.credit editableParameters).
const LABELS = { motion: 'Motion', motionStrength: 'Motion strength', reveal: 'Reveal', letterbox: 'Letterbox reveal', look: 'Look strength',
  warmth: 'Warmth', fade: 'Fade out', ...(cfg.adjustLabels || {}) };
const num = (v, fallback) => (typeof v === 'number' && isFinite(v) ? v : fallback);
// Photo resource ids in this Draft. Photos have no sound, so their audio routing stays null after muting.
const photoIds = new Set(cfg.photos || []);
// Effects on photo clips (every kind: motion, letterbox, fade, look) only when cfg.photoEffects is exactly true. Export
// renders them; Draft.captureFrames cannot render a frame with an effect on an image clip, so never preview such frames.
const photoEffects = cfg.photoEffects === true;
// The Main clips in timeline order: clip 0 is the opening shot, clip 1 the credit shot, the last one the final shot.
const mainClips = async () => (await d.clips({ trackScope: 'main' })).filter(c => c.resourceId !== null).sort((a, b) => a.startFrame - b.startFrame);
// Every clip by id, read once and again only after an edit (any edit makes earlier rows stale): one read per pass
// and per edit instead of one per lookup, which a long Draft could not afford inside run_script's deadline.
let current = null;
const allClips = async () => current || (current = await d.clips({ trackScope: 'all' }));
const clipById = async id => (await allClips()).find(c => c.clipId === id);
const edited = () => { current = null; };
// Idempotent: a retry after a half-finished or unreported earlier run adds only what is still missing (by name).
// Mute first: setAudioTracks reads the saved Draft's audio inventory, which a Draft created in the same call lacks.
let muted = false, muteKept = false;
if (cfg.mute) {
  const main = await mainClips();
  const videos = main.filter(c => !photoIds.has(c.resourceId));
  if (videos.every(c => Array.isArray(c.audioSourceIndexes) && c.audioSourceIndexes.length === 0)) muteKept = true;
  else {
    const end = main.reduce((a, c) => Math.max(a, c.endFrame), 0);
    // Clips whose source has no audio stream keep null routing after muting, so the check above cannot see a finished
    // mute on them. The EditDiff decides: opCount 0 means already muted or nothing to mute (an all-silent Draft).
    let diff;
    try { diff = await d.setAudioTracks({ target: await d.rangeAtFrames(0, end), audioSourceIndexes: [] }); }
    catch (e) { throw Error('Could not mute the clips\' own sound: ' + (e && e.message || e)); }
    if (diff && diff.opCount === 0) muteKept = true; else muted = true;
  }
}
const rows = await mainClips();
if (!rows.length) throw Error('decorate: the Draft has no clips');
const fps = (await d.meta()).fps;
const graphics = (await d.motionGraphics()).map(g => g.name);
// Title lockup within the opening shot's range (clip 0, from frame 0); its timing (parameters.timing) comes from the
// panel (planner avOpeningTiming of the opening's length). The credit sits within the credit shot (clip 1).
let titleAdded = false, creditAdded = false;
if (cfg.title && !graphics.includes(TITLE_LABEL)) {
  await d.addMotionGraphic({ within: await d.rangeAtFrames(rows[0].startFrame, rows[0].endFrame), label: TITLE_LABEL, tsxCode: cfg.title.tsx, parameters: cfg.title.parameters, editableParameters: cfg.title.editableParameters });
  titleAdded = true; edited();
}
if (cfg.credit && rows.length > 1 && !graphics.includes(CREDIT_LABEL)) {
  await d.addMotionGraphic({ within: await d.rangeAtFrames(rows[1].startFrame, rows[1].endFrame), label: CREDIT_LABEL, tsxCode: cfg.credit.tsx, parameters: cfg.credit.parameters, editableParameters: cfg.credit.editableParameters });
  creditAdded = true; edited();
}
// Effects, one pass per clip in this order (each call appends to the clip's stack): Photo motion (photos) or Shot motion
// (video clips but the opening, which has the reveal) -> Letterbox reveal (clip 0) / Fade out (the last clip; a one-clip
// Draft gets both, reveal first) -> Cinematic look last, so the grade wraps the move and the black.
let letterbox = 0, fades = 0, effects = 0, effectsKept = 0, motions = 0, videoMotions = 0, photoEffectsSkipped = 0;
const motion = cfg.motion || null, video = motion && motion.video ? motion.video : null;
const motionEditable = (value, strength) => [
  { key: 'motion', label: LABELS.motion, type: 'select', defaultValue: value, options: motion.options },
  { key: 'strength', label: LABELS.motionStrength, type: 'number', defaultValue: strength, min: 0, max: 2, step: 0.1 }];
const addEffect = async (id, have, label, tsxCode, parameters, editableParameters) => {
  if (have.includes(label)) { effectsKept++; return false; }
  const clip = await clipById(id);
  if (!clip) return false;
  await d.addVideoEffect(pluginShaderOptions(({[LOOK_LABEL]:'look',[MOTION_LABEL]:'motion',[SHOT_MOTION_LABEL]:'motion',[LETTERBOX_LABEL]:'letterbox',[FADE_LABEL]:'fade'})[label],{clip,
label,
parameters,
editableParameters}));
  edited();
  return true;
};
const lookOn = async (id, have) => {
  if (!cfg.look) return;
  const strength = num(cfg.look.strength, 0.3), warmth = num(cfg.look.warmth, 1);
  if (await addEffect(id, have, LOOK_LABEL, cfg.look.tsx, { strength, warmth }, [
    { key: 'strength', label: LABELS.look, type: 'number', defaultValue: strength, min: 0, max: 1, step: 0.05 },
    { key: 'warmth', label: LABELS.warmth, type: 'number', defaultValue: warmth, min: 0, max: 2, step: 0.1 }])) effects++;
};
for (let i = 0; i < rows.length; i++) {
  const row = rows[i], id = row.clipId, photo = photoIds.has(row.resourceId);
  if (photo && !photoEffects) { photoEffectsSkipped++; continue; }
  // The rows above predate this run's edits: the clip's current row (read again after an edit) for its effects.
  const now = await clipById(id);
  if (!now) continue;
  const have = (await d.videoEffects(now)).flatMap(e => [e.name, e.effectName]).filter(n => OUR_EFFECTS.includes(n));
  const holdSeconds = Math.round((row.endFrame - row.startFrame) / fps * 1000) / 1000;
  const m = photo ? (motion && motion.byRid && motion.byRid[row.resourceId]) : (i > 0 && video && video.byIndex ? video.byIndex[String(i)] : null);
  if (m && photo) {
    if (await addEffect(id, have, MOTION_LABEL, motion.tsx,
      { motion: m.motion, strength: motion.strength, direction: m.direction, axis: m.axis, cover: m.cover || 1, holdSeconds },
      motionEditable(m.motion, motion.strength))) motions++;
  } else if (m) {
    const strength = num(video.strength, 0.5);
    if (await addEffect(id, have, SHOT_MOTION_LABEL, motion.tsx,
      { motion: m.motion, strength, direction: m.direction, axis: m.axis, cover: 1, holdSeconds },
      motionEditable(m.motion, strength))) videoMotions++;
  }
  if (i === 0 && cfg.letterbox) {
    const lp = cfg.letterbox.parameters || {};
    const revealSeconds = num(lp.revealSeconds, num(lp.revealEnd, 2.35) - num(lp.revealStart, 0.22));
    if (await addEffect(id, have, LETTERBOX_LABEL, cfg.letterbox.tsx, { ...lp, revealSeconds, enabled: lp.enabled !== false }, [
      { key: 'revealSeconds', label: LABELS.reveal, type: 'number', defaultValue: Math.round(revealSeconds * 100) / 100, min: 0, max: 5, step: 0.05 },
      { key: 'enabled', label: LABELS.letterbox, type: 'boolean', defaultValue: lp.enabled !== false }])) letterbox++;
  }
  if (i === rows.length - 1 && cfg.fade) {
    // The effect counts the clip's own frames: its last frame is fully black.
    const fadeSeconds = num(cfg.fade.fadeSeconds, 1);
    if (await addEffect(id, have, FADE_LABEL, cfg.fade.tsx, { durationFrames: row.endFrame - row.startFrame, fadeSeconds }, [
      { key: 'fadeSeconds', label: LABELS.fade, type: 'number', defaultValue: fadeSeconds, min: 0, max: 3, step: 0.1 }])) fades++;
  }
  await lookOn(id, have);
}
// Cinematic look also on clips placed on other video tracks (none in a fresh Build; a user's B-roll on a retry). The
// Main clips had their pass above, so they are left out here even if the host lists them as video rows.
if (cfg.look) {
  const mainIds = new Set(rows.map(r => r.clipId));
  const others = (await allClips()).filter(c => c.trackKind === 'video' && c.resourceId !== null && !mainIds.has(c.clipId)).map(c => c.clipId);
  for (const id of others) {
    const c = await clipById(id);
    if (!c) continue;
    if (photoIds.has(c.resourceId) && !photoEffects) { photoEffectsSkipped++; continue; }
    await lookOn(id, (await d.videoEffects(c)).flatMap(e => [e.name, e.effectName]));
  }
}
// Commit only when this run added or changed something: commitAll rejects an empty change ("Nothing to stage"), which a
// retry after a landed but unreported commit would otherwise hit. Nothing to do is success (alreadyDone).
// effects counts the Cinematic looks added; effectsKept every effect of ours (any name above) already there.
const committed = muted || titleAdded || creditAdded || letterbox + fades + effects + motions + videoMotions > 0;
if (committed) await d.commitAll('Archive Vlog: title and look');
// Built in one literal (run_script type-checks the script, so no properties are added after the fact).
return { titleAdded, creditAdded, letterbox, fades, effects, effectsKept, motions, videoMotions, muted, muteKept, committed, alreadyDone: !committed, photoEffectsSkipped };
