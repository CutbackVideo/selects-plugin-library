
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
function gaussian(g, input, sigma, { maxSigma = 64, space = null, scale = 1, values = [], bindings = [], functions = "" } = {}) {
  for (const axis of ["x", "y"]) input = g.pass(`
    let size=${space ? vec(space) : "uniforms.resolution.xy"};
    let s=max(0.0,${sigma});if(s<0.01){return source(uv);}
    let pixels=s*uniforms.resolution.${axis}/size.${axis};
    let radius=min(60,i32(ceil(3.0*pixels)));let stride=max(1.0,3.0*pixels/60.0);
    let step=vec2f(${axis === "x" ? "1.0,0.0" : "0.0,1.0"})/uniforms.resolution.xy;
    var sum=vec4f(0.0);var weight=0.0;
    for(var i=-60;i<=60;i++){if(abs(i)<=radius){
      let distance=f32(i)*stride;let w=exp(-distance*distance/(2.0*pixels*pixels));
      sum+=source(uv+step*distance)*w;weight+=w;
    }}return sum/max(weight,0.000001);`, { inputs: [input], scale, values, bindings, functions });
  return input;
}

// shared/shader-effects/summer.mjs
var GRADIENTS = `
fn rnd(v:f32,k:f32)->f32{return floor(v*k+.5)/k;}
fn screen(b:vec4f,s:vec4f)->vec4f{return vec4f(b.rgb+s.rgb*(1.0-b.rgb),b.a+s.a*(1.0-b.a));}
fn blendOverlay(b:vec4f,s:vec4f)->vec4f {let cb=straight(b).rgb;let cs=straight(s).rgb;let rgb=select(2.0*cb*cs,1.0-2.0*(1.0-cb)*(1.0-cs),cb>vec3f(.5));return vec4f(rgb*b.a*s.a+b.rgb*(1.0-s.a)+s.rgb*(1.0-b.a),s.a+b.a*(1.0-s.a));}
fn rgba(c:vec3f,a:f32)->vec4f {let alpha=rnd(sat(a),1000.0);return vec4f(c/255.0*alpha,alpha);}
fn stop2(t:f32,a:f32,b:f32,ca:vec4f,cb:vec4f)->vec4f{return mix(ca,cb,sat((t-a)/max(.000001,b-a)));}
fn stop3(t:f32,m:f32,a:vec4f,b:vec4f,c:vec4f)->vec4f {return select(stop2(t,0.0,m,a,b),stop2(t,m,1.0,b,c),t>m);}
fn line(uv:vec2f,angle:f32,size:vec2f)->f32{let d=vec2f(sin(radians(angle)),-cos(radians(angle)));return .5+dot((uv-.5)*size,d)/dot(abs(d),size);}
fn radial(uv:vec2f,at:vec2f,r:vec2f)->f32{return length((uv-at)/r);}
`;

// shared/shader-effects/torn.mjs
function backdropSvg(kind, color) {
  const base = color || { night: "#151113", red: "#4a0f12", kraft: "#6b5a45", photo: "#151113" }[kind];
  const grain = kind === "kraft" ? 0.16 : kind === "red" ? 0.05 : 0.07, freq = kind === "kraft" ? 0.7 : 0.85, vignette = kind === "red" ? 0.45 : kind === "kraft" ? 0.3 : 0.35;
  let folds = "";
  if (kind === "red") {
    let seed = 4853522;
    const rnd = () => {
      seed = seed + 1831565813 >>> 0;
      let t = Math.imul(seed ^ seed >>> 15, seed | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
    let at = 0, i = 0;
    while (at < 1) {
      const shade = (i++ % 2 ? 1 : -1) * (0.5 + 0.5 * rnd());
      folds += `<stop offset="${at.toFixed(4)}" stop-color="${shade < 0 ? "black" : "white"}" stop-opacity="${Math.abs(shade) * (shade < 0 ? 0.5 : 0.13)}"/>`;
      at += 0.055 + 0.05 * rnd();
    }
    folds += '<stop offset="1" stop-color="black" stop-opacity=".3"/>';
  }
  const filters = [["gl", 7, `0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 3 0 0 0 -1.5`, freq, 2], ["gd", 11, `0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -3 0 0 0 1.5`, freq, 2], ["bl", 5, `0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -2 0 0 0 1.1`, ".004 .007", 3]].map(([id, seed, matrix, f, n]) => `<filter id="${id}" x="0" y="0" width="1440" height="1080" filterUnits="userSpaceOnUse"><feTurbulence type="fractalNoise" baseFrequency="${f}" numOctaves="${n}" seed="${seed}" stitchTiles="stitch"/><feColorMatrix values="${matrix}"/></filter>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1080"><defs>${filters}<linearGradient id="folds">${folds}</linearGradient><radialGradient id="v" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="black" stop-opacity="0"/><stop offset="1" stop-color="black" stop-opacity="${vignette}"/></radialGradient></defs><rect width="1440" height="1080" fill="${base}"/>${folds ? '<rect width="1440" height="1080" fill="url(#folds)"/>' : ""}${kind === "kraft" ? '<rect width="1440" height="1080" filter="url(#bl)" opacity=".22"/>' : ""}<rect width="1440" height="1080" filter="url(#gl)" opacity="${grain}"/><rect width="1440" height="1080" filter="url(#gd)" opacity="${grain * 1.4}"/><rect width="1440" height="1080" fill="url(#v)"/></svg>`;
}
function tornPhoto(data = null) {
  data = data || {};
  const g = new Graph(data), p = parameters(data, { seed: 0, inset: 0.92, edge: 1.4, look: 0.6, tilt: 0, holdFrames: 0, motionStrength: 0.5 });
  const r = p.refs;
  const motion = choice(p, data, "motion", { off: 0, "push-in": 1, "pull-out": 2, drift: 3 }, "off"), bg = choice(p, data, "backdrop", { night: 0, red: 1, kraft: 2, photo: 3 }, "night");
  const backdrops = ["night", "red", "kraft", "photo"].map((kind) => g.image(backdropSvg(kind, data.backdropColor != null ? "__PARAM_BACKDROPCOLOR__" : null)));
  if (data.backdropColor != null) for (const id of backdrops) g.svgParameters.push({ image: id, token: "__PARAM_BACKDROPCOLOR__", parameter: "backdropColor" });
  const vis = data.vis || { x: 0, y: 0, w: 100, h: 100 }, box = vec([vis.x, vis.y, vis.w, vis.h].map((x) => x / 100));
  const blur = gaussian(g, "source", `.012*uniforms.resolution.x*${f32(vis.w / 100)}`, { maxSigma: 64 });
  let phases = [];
  for (const side of ["entry", "exit"]) {
    const list = data.phases?.[side] || [], offset = side === "exit" ? `(${r.holdFrames}-${f32(Math.max(0, ...list.map((q) => q.end)))})` : "0.0";
    for (const ph of list) phases.push(`if(phase==0u&&local>=${f32(ph.start)}+${offset}&&local<${f32(ph.end)}+${offset}){phase=${{ white: 1, over: 2, flare: 3, glow: 4, full: 5 }[ph.name] || 0}u;progress=(local-${f32(ph.start)}-${offset})/${f32(Math.max(1, ph.end - ph.start - 1))};}`);
  }
  g.pass(`let local=uniforms.clock.x-${data.clock === "source" ? f32(number(data.originFrame)) : "0.0"};let canvas=${box};let at=(uv-canvas.xy)/canvas.zw;let size=vec2f(1440.0,1080.0);let aa=max(1440.0/(uniforms.resolution.x*canvas.z),1080.0/(uniforms.resolution.y*canvas.w));
 var background=textureSampleLevel(input2,linearSampler,at,0.0);let bg=u32(${bg});if(bg==1u){background=textureSampleLevel(input3,linearSampler,at,0.0);}if(bg==2u){background=textureSampleLevel(input4,linearSampler,at,0.0);}if(bg==3u){background=textureSampleLevel(input5,linearSampler,at,0.0);${data.allowPhotoBackdrop !== false ? "let c=straight(textureSampleLevel(input1,linearSampler,uv,0.0));background=over(premul(vec4f(saturation(brightness(contrast(c.rgb,.7),.32),.55),c.a)),background);" : ""}}
 var slide=0.0;${data.entry === "slide" ? `if(${r.holdFrames}>0.0){let progress=local/${r.holdFrames};slide=-1080.0*(1.0-pow(sat((progress-.28)/.48),3.0));background=vec4f(background.rgb*sat((progress-.76)/.18),1.0);}` : ""}
 var phase=0u;var progress=0.0;${phases.join("\n")}
 if(phase==5u){return vec4f(1.0)*within(at,canvas.zw*uniforms.resolution.xy);}
 let point=rotate((at-.5)*size-vec2f(0.0,slide),-radians(clamp(${r.tilt},-5.0,5.0)));
 let inset=clamp(select(${r.inset},${r.inset}/100.0,${r.inset}>1.0),.7,.95);let half=size*inset*.5;let edge=clamp(${r.edge},.5,3.0)*14.4;let seed=max(0.0,floor(${r.seed}));
 let angle=atan2(point.y,point.x);let radius=length(point);let ray=point/max(radius,.000001);let base=min(half.x/max(abs(ray.x),.000001),half.y/max(abs(ray.y),.000001));
 let rough=sin(angle*3.0+seed*.73)*6.5+sin(angle*7.0+seed*1.31)*4.5+sin(angle*17.0+seed*.37)*2.7+noise(angle*97.0,seed)*3.0;
 let distance=radius-base-rough;let width=edge*(.9+.16*sin(angle*9.0+seed));let photo=sat(.5-distance/aa);let paper=sat(.5-(distance-width)/aa);
 let shadow=.45*exp(-.5*pow(max(0.0,distance-width-2.88)/8.64,2.0));var result=over(vec4f(0.0,0.0,0.0,shadow),background);
 let flare=select(0.0,1.0-.65*progress,phase==3u);if(phase==4u){let glow=.85*exp(-.5*pow(max(0.0,distance-width)/28.8,2.0));result=over(premul(vec4f(vec3f(220.0,235.0,255.0)/255.0,glow)),result);}if(flare>0.0){let halo=flare*exp(-.5*pow((distance-width)/8.64,2.0));result=over(vec4f(vec3f(halo),halo),result);}
 var color=vec3f(230.0,224.0,212.0)/255.0;if(flare>0.0){color=vec3f(1.0);}var rim=vec3f(178.0,172.0,161.0)/255.0;
 let rimSize=edge*(.2+.07*sin(angle*19.0+seed));if(distance<rimSize*.7){rim=vec3f(147.0,141.0,131.0)/255.0;}if(distance<rimSize*.4){rim=vec3f(118.0,113.0,106.0)/255.0;}
 if(phase!=1u){color=mix(color,rim,sat(.5-(distance-rimSize)/aa)*(1.0-.8*flare));}result=over(premul(vec4f(color,paper)),result);
 let progressMotion=select(0.0,sat(local/max(1.0,${r.holdFrames}-1.0)),${r.holdFrames}>1.0);let e=.5-.5*cos(3.14159265359*progressMotion);let strength=sat(${r.motionStrength});var zoom=1.0;var dx=0.0;
 if(${motion}==1.0){zoom+=.08*strength*e;}if(${motion}==2.0){zoom+=.08*strength*(1.0-e);}if(${motion}==3.0){zoom+=.05*strength;dx=(2.0*e-1.0)*.02*strength;}
 let photoScale=inset+.03;let coord=canvas.xy+canvas.zw*(point/size/(photoScale*zoom)-vec2f(dx,0.0)/zoom+.5);let c=straight(source(coord));let strengthLook=sat(${r.look});let black=.07*strengthLook;let white=1.0-strengthLook/3.0;let k=black+white;
 var rgb=sepia(saturation(brightness(contrast(c.rgb,rnd((white-black)/k,10000.0)),rnd(k,10000.0)),rnd(1.0-.5*strengthLook,1000.0)),rnd(strengthLook/3.0,1000.0));
 if(phase==1u){rgb=vec3f(1.0);}if(phase==2u){rgb=brightness(rgb,rnd(mix(2.2,1.5,progress),1000.0));}if(phase==3u){rgb=brightness(rgb,rnd(mix(2.0,1.35,progress),1000.0));}if(phase==4u){rgb=brightness(rgb,1.8);}
 result=over(premul(vec4f(rgb,c.a))*photo,result);return result*within(at,canvas.zw*uniforms.resolution.xy);`, { ...p, inputs: ["source", blur, ...backdrops], functions: GRADIENTS + `fn noise(x:f32,seed:f32)->f32{let a=floor(x);let t=fract(x);let n=fract(sin(a*127.1+seed*311.7)*43758.5453);let m=fract(sin((a+1.0)*127.1+seed*311.7)*43758.5453);return mix(n,m,t*t*(3.0-2.0*t))*2.0-1.0;}` });
  return g.finish();
}

// shared/shader-effects/torn-paper-love.mjs
function options(kind, input, context = null) {
  context = context || {};
  if ("tsxCode" in input) throw Error("A WGSL effect cannot carry legacy TSX");
  const data = { ...Object.fromEntries((input.editableParameters || []).map((control) => [control.key, control.defaultValue])), ...input.parameters };
  let shader;
  switch (kind) {
    case "torn":
      shader = tornPhoto(data);
      break;
    default:
      throw Error("Unknown torn-paper-love effect: " + kind);
  }
  return { ...input, parameters: data, shader };
}

return options;})();
// Torn Paper Love, commit 2 (idempotent): Off muting, one "Torn photo" effect per Main clip, the "Ransom letters" graphic.
// cfg (JSON):
// {
//   sequenceId, mute: boolean,            // mute = clip sound Off
//   photos: string[],                     // photo resource ids (no sound: their routing stays null after muting)
//   torn: {
//     tsx, editable: EditableParameterDefinition[],
//     clips: [{ rid, sourceStartSeconds, data }]   // 2N entries in Main order; sourceStartSeconds = the clip's source
//                                                  // start (0 for photos); data = the effect's data without
//                                                  // holdFrames/originFrame (filled in here from the Draft)
//   },
//   letters: { tsx, parameters, editable: EditableParameterDefinition[], startFrame, endFrame }
// }
// returns { effects, effectsKept, lettersAdded, muted, muteKept, committed, alreadyDone }
const cfg = __CONFIG__;
const d = selects.draft(cfg.sequenceId);
const TORN_LABEL = 'Torn photo', LETTERS_LABEL = 'Ransom letters';
const photoIds = new Set(cfg.photos || []);
const tornClips = cfg.torn.clips;
const mainRows = async () => (await d.clips({ trackScope: 'main' })).filter(c => c.resourceId !== null);
const hasEffect = async (clip, label) => (await d.videoEffects(clip)).some(e => e.name === label || e.effectName === label);
// ClipInfo has no source start, so each effect's data comes from the config by Main position. Decorate never changes
// Main, so a mismatch means the config is stale for this Draft: stop before any change.
const ids = (await mainRows()).map(c => ({ clipId: c.clipId, rid: c.resourceId }));
if (ids.length !== tornClips.length || ids.some((c, i) => c.rid !== tornClips[i].rid)) {
  throw Error('decorate: the Draft\'s ' + ids.length + ' pictures don\'t match the ' + tornClips.length + ' planned ones');
}
// Idempotent: a retry after a half-finished or unreported earlier run adds only what is still missing.
// Mute first: setAudioTracks reads the saved Draft's audio inventory, which a Draft created in the same call lacks.
let muted = false, muteKept = false;
if (cfg.mute) {
  const main = await mainRows();
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
// One Torn photo per Main clip. holdFrames = the clip's length on the timeline; originFrame = its source start in
// Draft frames (0 for photos), used when the effect clock turns out to be source time (spec 15.2).
const fps = (await d.meta()).fps;
let effects = 0, effectsKept = 0;
for (let i = 0; i < ids.length; i++) {
  // Re-read each time: an edit makes earlier rows stale.
  const clip = (await mainRows()).find(c => c.clipId === ids[i].clipId);
  if (!clip) continue;
  if (await hasEffect(clip, TORN_LABEL)) { effectsKept++; continue; }
  const entry = tornClips[i];
  const originFrame = photoIds.has(clip.resourceId) ? 0 : Math.round((entry.sourceStartSeconds || 0) * fps);
  await d.addVideoEffect(pluginShaderOptions("torn",{clip,
label: TORN_LABEL,
parameters: { ...entry.data, holdFrames: clip.endFrame - clip.startFrame, originFrame },
editableParameters: /** @type {any} */ (cfg.torn.editable.map(e => (e.key in entry.data ? { ...e, defaultValue: entry.data[e.key] } : e)))}));
  effects++;
}
const lettersFound = (await d.motionGraphics()).some(g => g.name === LETTERS_LABEL);
if (!lettersFound) {
  await d.addMotionGraphic({ within: await d.rangeAtFrames(cfg.letters.startFrame, cfg.letters.endFrame), label: LETTERS_LABEL,
    tsxCode: cfg.letters.tsx, parameters: /** @type {any} */ (cfg.letters.parameters), editableParameters: /** @type {any} */ (cfg.letters.editable) });
}
// Commit only when this run added or changed something: commitAll rejects an empty change ("Nothing to stage"), which a
// retry after a landed but unreported commit would otherwise hit. Nothing to do is success (alreadyDone).
const committed = muted || !lettersFound || effects > 0;
if (committed) await d.commitAll('Torn Paper Love: letters and paper');
return { effects, effectsKept, lettersAdded: !lettersFound, muted, muteKept, committed, alreadyDone: !committed };
