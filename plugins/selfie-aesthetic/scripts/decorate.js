
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

// shared/shader-effects/selfie.mjs
function selfie(data = null) {
  data = data || {};
  const g = new Graph(data), p = parameters(data, { whip: 1, whipIn: 1, whipOut: 1, angle: 30, angleIn: number(data.angle, 30), angleOut: number(data.angle, 30), cover: 1, lookStrength: data.look === "soft-glow" || data.look == null ? 0.5 : 0.35 });
  const look = choice(p, data, "look", { "soft-glow": 1, "night-glam": 2, clean: 3, none: 0 }, "soft-glow");
  const framing = choice(p, data, "framing", { full: 0, punch: 1, tight: 2 }, "full");
  const ki = choice(p, data, "kindIn", { none: 0, dir: 1, spin: 2 }, "none"), ko = choice(p, data, "kindOut", { none: 0, dir: 1, spin: 2 }, "none");
  const r = p.refs;
  const fn = `
 fn rounded(v:f32,k:f32)->f32{return floor(v*k+.5)/k;}
 fn toLinear(c:vec3f)->vec3f{return select(c/12.92,pow((c+.055)/1.055,vec3f(2.4)),c>vec3f(.04045));}
 fn toSrgb(c:vec3f)->vec3f{return select(c*12.92,1.055*pow(max(c,vec3f(0.0)),vec3f(1.0/2.4))-.055,c>vec3f(.0031308));}
 struct Pose { amount:f32, angle:f32, xy:vec2f, rotation:f32, scale:f32 };
 fn pose()->Pose {
  var out=Pose(0.0,0.0,vec2f(0.0),0.0,1.0);
  let f=floor(uniforms.clock.x);let dur=floor(uniforms.clock.w);let fps=uniforms.clock.y;
  if(dur<=0.0||f<0.0||f>=dur){return out;}
  let global=clamp(${r.whip},0.0,1.5);let a=select(0.0,clamp(${r.whipIn},0.0,1.5)*global,${ki}>0.0);let b=select(0.0,clamp(${r.whipOut},0.0,1.5)*global,${ko}>0.0);
  let w=max(1.0,round(.067*fps));var wi=select(0.0,w,a>0.0);var wo=select(0.0,w,b>0.0);
  if(wi+wo>dur){if(wi>0.0&&wo>0.0){if(dur>=2.0){wi=floor(dur/2.0);wo=wi;}else{wi=select(1.0,0.0,b>=a);wo=1.0-wi;}}else{wi=min(wi,dur);wo=min(wo,dur);}}
  var dir=0.0;var dist=0.0;var strength=0.0;var kind=0.0;var deg=0.0;
  if(f<wi){dir=-1.0;dist=f;strength=a;kind=${ki};deg=${r.angleIn};}else if(f>=dur-wo){dir=1.0;dist=dur-1.0-f;strength=b;kind=${ko};deg=${r.angleOut};}else{return out;}
  let e=select(.07,1.0,(dist+.5)/fps<=.04+0.000000001)*strength;if(e<=0.0){return out;}
  deg=clamp(deg,-180.0,180.0);let angle=radians(deg);let size=uniforms.resolution.xy;let c=cos(angle);let s=sin(angle);let cover=max(1.0,${r.cover});
  let delta=dir*.06*size.x*e*vec2f(c,s)/cover;let rotation=select(0.0,dir*select(1.0,-1.0,deg<0.0)*8.0*e,kind==2.0);
  let sigma=.035*e*size.x;let fringe=2.0*sigma*vec2f(abs(c)+.08*abs(s),abs(s)+.08*abs(c));let half=max(vec2f(1.0),size*.5-fringe);var need=1.0;
  for(var i=0u;i<4u;i++){let corner=vec2f(select(-.5,.5,(i&1u)!=0u),select(-.5,.5,(i&2u)!=0u))*size;let q=abs(rotate(corner-delta,-radians(rotation)))/half;need=max(need,max(q.x,q.y));}
  out.amount=e;out.angle=angle;out.xy=delta/size;out.rotation=radians(rotation);out.scale=max(1.0+select(.08,.12,kind==2.0)*e,need*1.002);return out;
 }
 `;
  const grade = g.pass(`let c=straight(source(uv));let t=sat(${r.lookStrength});let look=u32(${look});var rgb=c.rgb;
  var coeff=vec4f(0.0,1.0,0.0,1.0);var light=1.0;
  if(look==1u){coeff=vec4f(1.0,2.2,-20.0,.95);light=.82;}else if(look==2u){coeff=vec4f(.35,1.15,-48.0,1.12);light=.92;}else if(look==3u){coeff=vec4f(.15,1.04,0.0,.98);}
  rgb=brightness(contrast(hue(saturation(sepia(rgb,rounded(min(1.0,coeff.x*t),1000.0)),rounded(mix(1.0,coeff.y,t),1000.0)),radians(rounded(coeff.z*t,100.0))),rounded(mix(1.0,coeff.w,t),1000.0)),rounded(mix(1.0,light,t),1000.0));
  var result=premul(vec4f(rgb,c.a));
  if(look==1u){let a=rounded(.03*t,10000.0);let overlay=vec3f(1.0,122.0/255.0,154.0/255.0);result=vec4f(mix(result.rgb,max(rgb,overlay)*c.a+overlay*(1.0-c.a),a),c.a+a*(1.0-c.a));
   let radius=length((uv-.5)*sqrt(2.0));let v=.5*t*select(.4*sat((radius-.6)/.125),.4+.6*sat((radius-.725)/.125),radius>.725);result=over(vec4f(0.0,0.0,0.0,v),result);
  }else if(look==2u){let a=rounded(.05*t,10000.0);let overlay=vec3f(1.0,79.0/255.0,163.0/255.0);result=vec4f(result.rgb+(1.0-result.rgb)*overlay*a,result.a+a*(1.0-result.a));}
  return premul(vec4f(toLinear(straight(result).rgb),result.a));`, { ...p, functions: fn });
  let input = grade;
  for (const across of [false, true]) input = g.pass(`let m=pose();let sigma=.035*m.amount*uniforms.resolution.x*${across ? ".08" : "1.0"};if(sigma<.01){return source(uv);}
  let direction=vec2f(cos(m.angle+${across ? "1.57079632679" : "0.0"}),sin(m.angle+${across ? "1.57079632679" : "0.0"}));
  let step=max(1.0,sigma/20.0);var sum=vec4f(0.0);var total=0.0;
  for(var i=-60;i<=60;i++){let d=f32(i)*step;if(abs(d)<=ceil(3.0*sigma)){let weight=exp(-.5*d*d/(sigma*sigma));sum+=source(uv+direction*d/uniforms.resolution.xy)*weight;total+=weight;}}
  return sum/max(total,.000001);`, { ...p, inputs: [input], functions: fn });
  g.pass(`let m=pose();let mode=u32(${framing});let fs=select(select(1.0,1.12,mode==1u),1.14,mode==2u);let dy=select(select(0.0,.04,mode==1u),.0168,mode==2u)/max(1.0,${r.cover});
  let xy=vec2f(rounded(m.xy.x*100.0,1000.0),rounded((m.xy.y+dy)*100.0,1000.0))/100.0;let scale=rounded(fs*m.scale,10000.0);
  let coord=rotate((uv-.5-xy)*uniforms.resolution.xy,-m.rotation)/uniforms.resolution.xy/scale+.5;
  let c=straight(source(coord));return premul(vec4f(toSrgb(c.rgb),c.a));`, { ...p, inputs: [input], functions: fn });
  return g.finish();
}

// shared/shader-effects/selfie-aesthetic.mjs
function options(kind, input, context = null) {
  context = context || {};
  if ("tsxCode" in input) throw Error("A WGSL effect cannot carry legacy TSX");
  const data = { ...Object.fromEntries((input.editableParameters || []).map((control) => [control.key, control.defaultValue])), ...input.parameters };
  let shader;
  switch (kind) {
    case "look":
      shader = selfie(data);
      break;
    default:
      throw Error("Unknown selfie-aesthetic effect: " + kind);
  }
  return { ...input, parameters: data, shader };
}

return options;})();
const cfg: any = __CONFIG__;
const d = selects.draft(cfg.sequenceId);
// Effect and transition names identify what an earlier run added (and the kit's readback), so they stay English.
const EFFECT_LABEL = 'Selfie whip + look', TRANSITION_LABEL = 'Selfie whip';
// Inspector parameter labels in the panel's UI language at build time (cfg.adjustLabels); English without them.
const LABELS = { look: 'Look', lookStrength: 'Look strength', whip: 'Whip strength', framing: 'Framing', ...(cfg.adjustLabels || {}) };
// Framing choices of a video clip (cfg.framingOptions in the UI language; English without them).
const FRAMING_OPTIONS = cfg.framingOptions || [{ label: 'Tight', value: 'tight' }, { label: 'Full', value: 'full' }];
const holds = cfg.holds || [];
const mode = cfg.whipMode === 'transition' ? 'transition' : 'effect';
const effect = cfg.effect || {};
const look = typeof effect.look === 'string' ? effect.look : 'soft-glow';
const lookStrength = typeof effect.lookStrength === 'number' ? effect.lookStrength : 0.35;
const whip = typeof effect.whip === 'number' ? effect.whip : 1;
const covers = cfg.covers || [];
// The cover scale assemble applied to clip i (assemble's result `covers`); 1 when none.
const coverOf = i => (typeof covers[i] === 'number' && covers[i] > 0 ? covers[i] : 1);
const notes = [];
// Whip angles: both clips of a cut share the cut's angle. The planner gives each hold angleIn (its head's cut) and
// angleOut (its tail's cut); `angle` = angleOut. Older holds without them: angleOut = angle, angleIn = the previous
// hold's angleOut (its own angle on the first hold).
const num = (v, dflt) => (typeof v === 'number' && isFinite(v) ? v : dflt);
const angleOutOf = i => num(holds[i] && holds[i].angleOut, num(holds[i] && holds[i].angle, 0));
const angleInOf = i => num(holds[i] && holds[i].angleIn, i > 0 ? angleOutOf(i - 1) : num(holds[i] && holds[i].angle, 0));
const photoIds = new Set(holds.filter(h => h.kind === 'photo').map(h => h.rid));
// Main clips in timeline order, read from trackScope 'all' (addVideoEffect / addTransition want those rows).
const main = async () => (await d.clips({ trackScope: 'all' })).filter(c => c.trackKind === 'main' && c.resourceId !== null).sort((a, b) => a.startFrame - b.startFrame);
const hasEffect = async (clip) => (await d.videoEffects(clip)).some(e => e.name === EFFECT_LABEL || e.effectName === EFFECT_LABEL);
// Idempotent: a retry after a half-finished or unreported earlier run adds only what is still missing.
// Mute first: setAudioTracks reads the saved Draft's audio inventory, which a Draft created in the same call lacks.
let muted = false, muteKept = false;
if (cfg.clipSound === 'off') {
  const rows = await main();
  const videos = rows.filter(c => !photoIds.has(c.resourceId));
  if (videos.every(c => Array.isArray(c.audioSourceIndexes) && c.audioSourceIndexes.length === 0)) muteKept = true;
  else {
    const end = rows.reduce((a, c) => Math.max(a, c.endFrame), 0);
    // Clips whose source has no audio stream keep null routing after muting, so the check above cannot see a finished
    // mute on them. The EditDiff decides: opCount 0 means already muted or nothing to mute (an all-silent Draft).
    let diff;
    try { diff = await d.setAudioTracks({ target: await d.rangeAtFrames(0, end), audioSourceIndexes: [] }); }
    catch (e) { throw Error('Could not mute the clips\' own sound: ' + (e && e.message || e)); }
    if (diff && diff.opCount === 0) muteKept = true; else muted = true;
  }
}
const fps = (await d.meta()).fps;
// Whip length on each side of a cut: w = max(1, round(0.067 * fps)) frames (2 frames at 23.976-30 fps).
const w = Math.max(1, Math.round(0.067 * fps));
const count = (await main()).length;
if (count !== holds.length) notes.push('the Draft has ' + count + ' clips for ' + holds.length + ' planned holds');
const n = Math.min(count, holds.length);
const lookDefs = [
  { key: 'look', label: LABELS.look, type: 'select', defaultValue: look, options: cfg.lookOptions || [] },
  { key: 'lookStrength', label: LABELS.lookStrength, type: 'number', defaultValue: lookStrength, min: 0, max: 1, step: 0.05 }];
const whipDef = { key: 'whip', label: LABELS.whip, type: 'number', defaultValue: whip, min: 0, max: 1.5, step: 0.1 };
// Whip strength of a side: the planner's per-cut hold.whipIn / hold.whipOut (spin 1, standard bar 0.6, subtle bar 0.35,
// finale 0.75; both clips of a cut carry the same value); older holds without them whip at 1.
const strengthIn = h => num(h.whipIn, 1), strengthOut = h => num(h.whipOut, 1);
// One effect per Main clip. In effect mode it smears the clip's head and tail (whipIn / whipOut: the side's strength,
// 0 = none, which the first clip's head and the last clip's tail always are); in transition mode the native
// transitions whip, so the effect only carries the look and the photo framing.
let effects = 0, effectsKept = 0;
for (let i = 0; i < n; i++) {
  // Re-read before each edit: any edit makes earlier rows stale.
  const clip = (await main())[i];
  if (!clip) continue;
  if (await hasEffect(clip)) { effectsKept++; continue; }
  const h = holds[i];
  const whipIn = mode === 'effect' && i > 0 && h.cutIn !== 'none' ? strengthIn(h) : 0;
  const whipOut = mode === 'effect' && i < n - 1 && h.cutOut !== 'none' ? strengthOut(h) : 0;
  // Video clips get a Framing select (tight: zoom toward the upper middle, full: the whole frame); photos keep their
  // planned full / punch framing without one.
  const video = h.kind !== 'photo';
  const framing = video ? (h.framing === 'tight' ? 'tight' : 'full') : h.framing || null;
  const parameters = { whipIn, whipOut, kindIn: h.cutIn || 'none', kindOut: h.cutOut || 'none', angle: num(h.angle, 0),
    angleIn: angleInOf(i), angleOut: angleOutOf(i), whip, look, lookStrength, framing, cover: coverOf(i) };
  const framingDef = { key: 'framing', label: LABELS.framing, type: 'select', defaultValue: framing, options: FRAMING_OPTIONS };
  const defs = [...lookDefs, ...(mode === 'effect' ? [whipDef] : []), ...(video ? [framingDef] : [])];
  await d.addVideoEffect(pluginShaderOptions("look",{clip,
label: EFFECT_LABEL,
parameters,
editableParameters: defs as any}));
  effects++;
}
// Transition mode (the A/B alternative): one native transition of w + w frames on every cut between two clips; never
// after the last clip (no transition from/to nothing). A cut that already has one keeps it.
// selfie-whip-transition.tsx data: { kind, angle, strength (per cut: the outgoing hold's whipOut), whip (global, editable), cover }. Both clips
// render during the transition; the smaller cover of the two keeps the translated frames covered (1 = worst case).
const transitionCover = i => Math.min(coverOf(i), coverOf(i + 1));
let transitions = 0, transitionsKept = 0;
if (mode === 'transition') {
  for (let i = 0; i < n - 1; i++) {
    const clip = (await main())[i];
    if (!clip) continue;
    const existing = (await d.transitions()).some(t => (t.name === TRANSITION_LABEL || t.transitionType === TRANSITION_LABEL) && t.editPointFrame === clip.endFrame);
    if (existing) { transitionsKept++; continue; }
    const h = holds[i];
    await d.addTransition({ after: clip, label: TRANSITION_LABEL, tsxCode: cfg.transitionTsx, inOffsetSeconds: w / fps, outOffsetSeconds: w / fps,
      parameters: { kind: h.cutOut && h.cutOut !== 'none' ? h.cutOut : 'dir', angle: angleOutOf(i), strength: strengthOut(h), whip, cover: transitionCover(i) },
      editableParameters: [whipDef] as any });
    transitions++;
  }
}
// Commit only when this run added or changed something: commitAll rejects an empty change ("Nothing to stage"), which a
// retry after a landed but unreported commit would otherwise hit. Nothing to do is success (alreadyDone).
const committed = muted || effects > 0 || transitions > 0;
if (committed) await d.commitAll('Selfie Aesthetic Edit: whip and look');
return { mode, effects, effectsKept, transitions, transitionsKept, muted, muteKept, committed, alreadyDone: !committed, notes };
