
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
function photoMotion(data = null, canvas2 = { width: 1920, height: 1080 }) {
  data = data || {};
  const g = new Graph(data), p = parameters(data, { strength: 1, holdSeconds: 1, cover: 1 });
  const mode = choice(p, data, "motion", Object.fromEntries(MOTIONS.map((m, i) => [m, i])), "off");
  const dir = data.direction === -1 ? -1 : 1, axis = data.axis === "y" ? 1 : 0;
  g.pass(`let hold=max(1.0,${p.refs.holdSeconds}*uniforms.clock.y-1.0);
    let m=photoMotion(u32(${mode}),uniforms.clock.x/hold,clamp(${p.refs.strength},0.0,2.0),${f32(dir)},${axis}u,${p.refs.cover},vec2f(${f32(number(canvas2.width, 1920))},${f32(number(canvas2.height, 1080))}));
    let xy=floor(m.xy*100000.0+.5)/100000.0;let z=floor(m.z*10000.0+.5)/10000.0;
    let a=floor((m.w/.01745329252)*1000.0+.5)/1000.0*.01745329252;
    let size=uniforms.resolution.xy;
    return source(rotate((uv-.5-xy)*size,-a)/z/size+.5);`, { ...p, functions: PHOTO_MOTION });
  return g.finish();
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
var canvas = (d) => {
  const c = d.canvasInBox || {};
  return [number(c.x), number(c.y), number(c.w, 100), number(c.h, 100)].map((x) => x / 100);
};
function timing(d, p) {
  return `let t=uniforms.clock.z-${d.timeOrigin === "source" ? f32(number(d.sourceStartSeconds)) : "0.0"};let clip=${p.refs.clipSeconds};`;
}
function summerLook(data = null) {
  data = data || {};
  const g = new Graph(data), p = parameters(data, { strength: 0.45, grain: 0.35, leakOutSeconds: 0, leakStrength: 1, clipSeconds: 0 });
  const r = p.refs;
  const tone = `fn tone(x:f32,s:f32,ch:u32)->f32 {
 let sc=x-.3*s*sin(6.28318530718*x)/6.28318530718;let sh=6.75*x*(1.0-x)*(1.0-x);let hl=6.75*x*x*(1.0-x);let roll=ease((x-.6)/.4);
 let v=vec3f(sc)+s*(vec3f(-.08,.012,.05)*sh+vec3f(.07,.012,-.11)*hl-vec3f(.02,.04,.1)*roll);return rnd(sat(v[ch]),10000.0);
 }
 fn table(x:f32,s:f32,ch:u32)->f32 {let k=sat(x)*16.0;let a=floor(k)/16.0;return mix(tone(a,s,ch),tone(min(1.0,a+1.0/16.0),s,ch),fract(k));}
 fn cool(c:vec3f,s:f32)->vec3f{let satValue=1.0-.7*s;let m=.35*s;let d=1.0-.08*s;let lum=vec3f(.213,.715,.072);let rr=(lum*(1.0-satValue)+vec3f(satValue,0.0,0.0))*d;let gg=(lum*(1.0-satValue)+vec3f(0.0,satValue,0.0))*d;let bb=m*gg+(1.0-m)*(lum*(1.0-satValue)+vec3f(0.0,0.0,satValue))*d;
 return clamp(vec3f(dot(c,floor(rr*1000.0+.5)/1000.0),dot(c,floor(gg*1000.0+.5)/1000.0),dot(c,floor(bb*1000.0+.5)/1000.0)),vec3f(0.0),vec3f(1.0));}
 `;
  let input = g.pass(`let c=straight(source(uv));let s=sat(${r.strength});let rgb=vec3f(table(c.r,s,0u),table(c.g,s,1u),table(c.b,s,2u));let mask=sat(dot(rgb,vec3f(-2.5,2.0,.5)))*c.a;
 return premul(vec4f(mix(saturation(rgb,rnd(1.0+.08*s,1000.0)),cool(rgb,s),mask),c.a));`, { ...p, functions: GRADIENTS + tone });
  input = g.pass(`${timing(data, p)}var c=source(uv);let span=${r.leakOutSeconds};let k=clamp(${r.leakStrength},0.0,2.0);let box=${vec(canvas(data))};let at=(uv-box.xy)/box.zw;
 if(span>0.0&&clip>0.0&&k>0.0&&t>=clip-span&&all(at>=vec2f(0.0))&&all(at<=vec2f(1.0))){let u=sat((t-clip+span)/span);let e=ease(u);
 let wash=sat((.85+.15*e)*k);let glow=sat((.5+.3*e)*k);let bloom=sat((.1+.9*pow(u,1.6))*k);let edge=sat(.65*e*k);let x=line(at,100.0,uniforms.resolution.xy*box.zw);
 c=blendOverlay(c,stop3(x,.5,rgba(vec3f(255.0,150.0,60.0),.75*wash),rgba(vec3f(255.0,110.0,40.0),.85*wash),rgba(vec3f(255.0,90.0,40.0),.9*wash)));
 c=screen(c,stop2(x,0.0,1.0,rgba(vec3f(255.0,110.0,40.0),.5*glow),rgba(vec3f(255.0,80.0,30.0),.7*glow)));
 let b=radial(at,vec2f(38.0-14.0*e,30.0+4.0*e)/100.0,vec2f(50.0+55.0*e,60.0+60.0*e)/100.0);
 var bc=stop2(b,0.0,.35,rgba(vec3f(255.0,228.0,170.0),.85*bloom),rgba(vec3f(255.0,205.0,135.0),.8*bloom));
 if(b>.35){bc=stop2(b,.35,.65,rgba(vec3f(255.0,205.0,135.0),.8*bloom),rgba(vec3f(255.0,165.0,80.0),.5*bloom));}if(b>.65){bc=stop2(b,.65,1.0,rgba(vec3f(255.0,165.0,80.0),.5*bloom),vec4f(0.0));}c=screen(c,bc);
 let ed=radial(at,vec2f(.98,.5),vec2f(.12,.9));c=screen(c,stop3(ed,.5,rgba(vec3f(255.0,120.0,30.0),edge),rgba(vec3f(255.0,90.0,30.0),.5*edge),vec4f(0.0)));}
 return c;`, { ...p, inputs: [input], functions: GRADIENTS });
  const grains = [];
  for (let seed = 0; seed < 8; seed++) grains.push(g.image(`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><filter id="g" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="${seed}" stitchTiles="stitch"/><feColorMatrix values=".33 .33 .33 0 0 .33 .33 .33 0 0 .33 .33 .33 0 0 0 0 0 0 1"/><feComponentTransfer><feFuncR type="linear" slope="3" intercept="-1"/><feFuncG type="linear" slope="3" intercept="-1"/><feFuncB type="linear" slope="3" intercept="-1"/></feComponentTransfer></filter><rect width="256" height="256" filter="url(#g)"/></svg>`, { width: 256, height: 256 }));
  const noise = g.pass(`let f=u32(max(0.0,round(uniforms.clock.x)));var h=(f+1u)*2654435761u;h^=h>>15u;h*=2246822519u;h^=h>>13u;
 let p=fract((uv*uniforms.resolution.xy-vec2f(f32(h%256u),f32((h>>8u)%256u)))/256.0);let i=f%8u;
 ${grains.map((_, i) => `if(i==${i}u){return textureSampleLevel(input${i},linearSampler,p,0.0);}`).join("\n")}return vec4f(0.0);`, { inputs: grains });
  g.pass(`let b=source(uv);let n=textureSampleLevel(input1,linearSampler,uv,0.0);let a=rnd(sat(${r.grain})*sat(${r.strength})*.5,1000.0);return blendOverlay(b,n*a);`, { ...p, inputs: [input, noise], functions: GRADIENTS });
  return g.finish();
}
function videoMotion(data = null) {
  data = data || {};
  const g = new Graph(data), p = parameters(data, { strength: 1, clipSeconds: 0 });
  g.pass(`${timing(data, p)}let span=max(1.0,round(clip*uniforms.clock.y)-1.0);let e=.5-.5*cos(3.14159265359*sat(t*uniforms.clock.y/span));let z=select(1.0,1.0+.04*clamp(${p.refs.strength},0.0,2.0)*e,clip>0.0);return source((uv-.5)/(floor(z*100000.0+.5)/100000.0)+.5);`, p);
  return g.finish();
}
function gridPanel(data = null) {
  data = data || {};
  const g = new Graph(data), i = data.insetPct || {};
  const v = (k) => Math.round(Math.max(0, Math.min(100, number(i[k]))) * 1e4) / 1e6;
  const x = v("left"), y = v("top"), w = 1 - x - v("right"), h = 1 - y - v("bottom");
  g.pass(`let box=${vec([x, y, w, h])};return source(uv)*within((uv-box.xy)/max(box.zw,vec2f(.000001)),box.zw*uniforms.resolution.xy);`);
  return g.finish();
}
function filmFrame(data = null) {
  data = data || {};
  const g = new Graph(data), p = parameters(data, { windowW: 0.87, windowH: 0.84, radius: 0.02, feather: 0.012, fringe: 1, leakInSeconds: 0, leakStrength: 1, fadeOutFrames: 0, clipSeconds: 0 });
  const r = p.refs, c = canvas(data), m = data.motion || {};
  const frame = `${timing(data, p)}let canvas=${vec(c)};let at=(uv-canvas.xy)/canvas.zw;`;
  const pulses = (data.pulses || []).map((q) => {
    const dur = Math.max(0.05, Math.min(10, number(q.dur, 0.4))), at = number(q.at), cut = at - dur / 2 <= 0 || number(data.clipSeconds) <= 0 || at + dur / 2 >= data.clipSeconds;
    return `{let u=(t-${f32(at)})/${f32(dur)}+.5;if(u>=0.0&&u<=1.0){let env=sat(pow(sin(3.14159265359*u),1.5)*k);
   ${q.kind === "flare" ? `let rr=radial(at,vec2f(.18+.2*u,.78-.16*u),vec2f(.7,.8));c=screen(c,stop3(rr,.45,rgba(vec3f(255.0,150.0,70.0),.7*env),rgba(vec3f(255.0,120.0,55.0),.4*env),vec4f(0.0)));c=blendOverlay(c,stop3(line(at,30.0,vec2f(1920.0,1080.0)),.6,rgba(vec3f(255.0,140.0,60.0),.55*env),rgba(vec3f(255.0,170.0,90.0),.3*env),vec4f(0.0)));` : cut ? `let cy=.22+.16*u;let rr=radial(at,vec2f(.97,cy),vec2f(.12,.26));let soft=rgba(vec3f(255.0,130.0,60.0),.35*env*(1.0-sat(radial(at,vec2f(.96,cy+.06),vec2f(.28,.4)))));let hot=stop3(rr,.5,rgba(vec3f(255.0,70.0,40.0),.95*env),rgba(vec3f(230.0,40.0,50.0),.55*env),vec4f(0.0));c=screen(c,over(hot,soft));` : `let rr=radial(at,vec2f(.66-.14*u,.8),vec2f(.6,.5));let hot=stop3(rr,.45,rgba(vec3f(235.0,50.0,55.0),.85*env),rgba(vec3f(220.0,40.0,60.0),.5*env),vec4f(0.0));let pos=line(at,150.0,vec2f(1920.0,1080.0));let a=select(sat((pos-.3)/.4),1.0-sat((pos-.7)/.3),pos>.7);c=screen(c,over(hot,rgba(vec3f(255.0,90.0,50.0),.35*env*a)));`}
  }}`;
  }).join("\n");
  const picture = g.pass(`${frame}let origin=canvas.xy+canvas.zw*.5;
  let motion=photoMotion(${Math.max(0, MOTIONS.indexOf(m.motion))}u,select(0.0,t/max(.000001,clip),clip>0.0),${f32(number(m.strength, 1))},${f32(m.direction === -1 ? -1 : 1)},${m.axis === "y" ? 1 : 0}u,1.0,vec2f(1920.0,1080.0));
  let coord=rotate((uv-origin-motion.xy*canvas.zw)*uniforms.resolution.xy,-motion.w)/motion.z/uniforms.resolution.xy+origin;var c=over(source(coord),vec4f(0.0,0.0,0.0,1.0));let k=clamp(${r.leakStrength},0.0,2.0);
  if(k>0.0){let span=${r.leakInSeconds};if(span>0.0&&t>=0.0&&t<span){let u=sat(t/span);let e=ease(u);let wash=sat(pow(1.0-e,2.2)*k);let tint=sat(sin(3.14159265359*min(1.0,.35+.65*u))*k);let band=sat(sqrt(max(0.0,sin(3.14159265359*min(1.0,.1+.9*u))))*k);
  c=screen(c,stop3(at.x,.55,rgba(vec3f(255.0,190.0,105.0),.6*wash),rgba(vec3f(255.0,200.0,120.0),.7*wash),rgba(vec3f(255.0,185.0,100.0),.7*wash)));
  c=blendOverlay(c,stop3(at.x,.6,rgba(vec3f(255.0,140.0,50.0),.55*tint),rgba(vec3f(255.0,110.0,40.0),.8*tint),rgba(vec3f(255.0,90.0,40.0),.85*tint)));
  let rad=radial(at,vec2f(.8-.35*e,.55),vec2f(.26-.14*e,.85));c=screen(c,stop3(rad,.5,rgba(vec3f(255.0,70.0,40.0),.9*band),rgba(vec3f(240.0,40.0,40.0),.55*band),vec4f(0.0)));}
  ${pulses}}
  return c*within(at,canvas.zw*uniforms.resolution.xy);`, { ...p, functions: GRADIENTS + PHOTO_MOTION });
  const masks = g.pass(`let canvas=${vec(c)};let at=(uv-canvas.xy)/canvas.zw*vec2f(1920.0,1080.0);let win=vec2f(clamp(${r.windowW},.1,1.0)*1920.0,clamp(${r.windowH},.1,1.0)*1080.0);let origin=(vec2f(1920.0,1080.0)-win)*.5;let radius=clamp(${r.radius},0.0,.5)*1080.0;
 let mask=roundRect(at-origin,win,min(radius,min(win.x,win.y)*.5));return vec4f(mask);`, p);
  let mask = masks;
  for (const axis of [0, 1]) mask = g.pass(`let sigma=max(.0,${r.feather})*uniforms.resolution[${axis}]*${f32(c[axis + 2])}*${axis === 0 ? "1080.0/1920.0" : "1.0"};if(sigma<.01){return source(uv);}let step=max(1.0,sigma/20.0);var c=vec4f(0.0);var weight=0.0;
  for(var i=-60;i<=60;i++){let v=f32(i)*step;let w=exp(-.5*v*v/(sigma*sigma));c+=source(uv+${axis === 0 ? "vec2f(v,0.0)" : "vec2f(0.0,v)"}/uniforms.resolution.xy)*w;weight+=w;}return c/weight;`, { ...p, inputs: [mask] });
  g.pass(`${frame}let mask=textureSampleLevel(input1,linearSampler,uv,0.0).a;let c=source(uv);var out=vec4f(c.rgb*mask,1.0);
  let amount=clamp(${r.fringe},0.0,2.0);let shift=max(1.0,${r.feather}*1080.0*.25)*amount;let delta=vec2f(shift/1920.0,.4*shift/1080.0)*canvas.zw;
  let warm=abs(textureSampleLevel(input1,linearSampler,uv-delta,0.0).a-mask);let cool=abs(textureSampleLevel(input1,linearSampler,uv+delta,0.0).a-mask);
  out=screen(out,vec4f((vec3f(1.0,70.0/255.0,40.0/255.0)*warm+vec3f(40.0/255.0,160.0/255.0,1.0)*cool)*sat(.3*amount),0.0));
  let fade=select(0.0,sat((round(t*uniforms.clock.y)-(round(clip*uniforms.clock.y)-${r.fadeOutFrames})+1.0)/max(1.0,${r.fadeOutFrames})),clip>0.0&&${r.fadeOutFrames}>0.0);return vec4f(out.rgb*(1.0-fade),1.0);`, { ...p, inputs: [picture, mask], functions: GRADIENTS });
  return g.finish();
}

// shared/shader-effects/summer-trip.mjs
function options(kind, input, context = null) {
  context = context || {};
  if ("tsxCode" in input) throw Error("A WGSL effect cannot carry legacy TSX");
  const data = { ...Object.fromEntries((input.editableParameters || []).map((control) => [control.key, control.defaultValue])), ...input.parameters };
  let shader;
  switch (kind) {
    case "look":
      shader = summerLook(data);
      break;
    case "filmFrame":
      shader = filmFrame(data);
      break;
    case "videoMotion":
      shader = videoMotion(data);
      break;
    case "gridPanel":
      shader = gridPanel(data);
      break;
    case "motion":
      shader = photoMotion(data, context);
      break;
    default:
      throw Error("Unknown summer-trip effect: " + kind);
  }
  return { ...input, parameters: data, shader };
}

return options;})();
const cfg = __CONFIG__;
const d = selects.draft(cfg.sequenceId);
const W = cfg.W || 1920, H = cfg.H || 1080;
const LOOK = 'Summer look', GRID = 'Grid panel', FILM = 'Film frame', MOTION = 'Photo motion', VMOTION = 'Video motion';
const TITLE = 'Summer Trip title', LABELS = 'Summer Trip labels';
// Adjust labels in the panel's UI language at Build (the names above stay English: they identify what is already there).
const LB = cfg.adjustLabels || {};
const lab = (key, english) => (typeof LB[key] === 'string' && LB[key] ? LB[key] : english);
const fr = cfg.frames;
const fps = (await d.meta()).fps;
const notes = [];
if (cfg.fps && cfg.fps !== fps) notes.push('the Draft runs at ' + fps + ' fps, assembled at ' + cfg.fps);
const photoIds = new Set(cfg.photos || []);
const sizes = cfg.sizes || {};
// JSON round trip: parameter definitions built here lose their literal types in the run_script TypeScript check
// ("number" widens to string), so they are passed as `any`.
const loose = v => JSON.parse(JSON.stringify(v));
const all = () => d.clips({ trackScope: 'all' });
const rowById = async id => (await all()).find(c => c.clipId === id);
const hasEffect = async (clip, label) => (await d.videoEffects(clip)).some(e => e.name === label || e.effectName === label);

// The canvas rectangle `rect` ({ x, y, w, h } in canvas px) in % of a clip's own box. The clip is conformed to FIT
// the canvas, then scaled by the transform's scale about its centre and moved by its position (% of the canvas
// height from the centre, +y up). Same maths as the effects lane's stCanvasInBox.
const stRectInBox = (size, t, rect) => {
  const ok = size && size.width > 0 && size.height > 0;
  const sw = ok ? size.width : W, sh = ok ? size.height : H;
  const fit = Math.min(W / sw, H / sh);
  const sx = t && t.scale ? t.scale.x : 1, sy = t && t.scale ? t.scale.y : 1;
  const px = t && t.position ? t.position.x : 0, py = t && t.position ? t.position.y : 0;
  const bw = sw * fit * sx, bh = sh * fit * sy;
  const left = W / 2 + px / 100 * H - bw / 2, top = H / 2 - py / 100 * H - bh / 2;
  return { x: (rect.x - left) / bw * 100, y: (rect.y - top) / bh * 100, w: rect.w / bw * 100, h: rect.h / bh * 100 };
};
const stCanvasInBox = (size, t) => stRectInBox(size, t, { x: 0, y: 0, w: W, h: H });
const QUAD_RECT = { TL: { x: 0, y: 0 }, TR: { x: W / 2, y: 0 }, BR: { x: W / 2, y: H / 2 }, BL: { x: 0, y: H / 2 } };
const is169 = size => !(size && size.width > 0 && size.height > 0) || Math.abs(size.width / size.height - W / H) < 0.01;

// Main clip i is the one starting on mainFrames[i] (clipId from assemble as a fallback); grid clips by track kind,
// resource and start frame. Never by row index.
const mainClip = (rows, i) => {
  const m = (cfg.placed || [])[i] || {};
  return rows.find(c => c.trackKind === 'main' && c.resourceId !== null && c.startFrame === fr.mainFrames[i]) ||
    rows.find(c => c.trackKind === 'main' && c.clipId === m.clipId);
};
const gridClip = (rows, gp) =>
  rows.find(c => c.trackKind === 'video' && c.resourceId === gp.rid && c.startFrame === gp.a) ||
  rows.find(c => c.trackKind === 'video' && c.clipId === gp.clipId);

// Idempotent: a retry after a half-finished or unreported earlier run adds only what is still missing.
// Mute first: setAudioTracks reads the saved Draft's audio inventory, which a Draft created in the same call lacks.
let muted = false, muteKept = false;
if (cfg.mute) {
  const main = (await d.clips({ trackScope: 'main' })).filter(c => c.resourceId !== null);
  const videos = main.filter(c => !photoIds.has(c.resourceId));
  if (videos.every(c => Array.isArray(c.audioSourceIndexes) && c.audioSourceIndexes.length === 0)) muteKept = true;
  else {
    const end = main.reduce((a, c) => Math.max(a, c.endFrame), 0);
    // Clips whose source has no audio stream keep null routing after muting, so the check above cannot see a finished
    // mute on them. The EditDiff decides: opCount 0 means already muted or nothing to mute.
    let diff;
    try { diff = await d.setAudioTracks({ target: await d.rangeAtFrames(0, end), audioSourceIndexes: [] }); }
    catch (e) { throw Error('Could not mute the clips\' own sound: ' + (e && e.message || e)); }
    if (diff && diff.opCount === 0) muteKept = true; else muted = true;
  }
}

// Grid panels are visual-only. 'routing' routes each panel to no audio source; setAudioTracks is specified for Main
// clips, so the panel row itself is passed as the target and the Main routing is checked afterwards. When the call
// is refused, the panel is lowered to the -60 dB floor instead (reported, not called a mute). If the Main routing
// changed, the run throws before committing, so nothing is saved.
const grid = { mode: cfg.gridSound || 'none', routed: 0, kept: 0, lowered: 0 };
if (grid.mode === 'routing') {
  const mainRouting = async () => JSON.stringify((await d.clips({ trackScope: 'main' })).map(c => [c.clipId, c.audioSourceIndexes]));
  const mainBefore = await mainRouting();
  for (const gp of cfg.gridPlaced || []) {
    const clip = gridClip(await all(), gp);
    if (!clip) continue;
    if (Array.isArray(clip.audioSourceIndexes) && clip.audioSourceIndexes.length === 0) { grid.kept++; continue; }
    let diff = null, refused = null;
    try { diff = await d.setAudioTracks({ target: Object(clip), audioSourceIndexes: [] }); } catch (e) { refused = e; }
    if (!refused) {
      if (diff && diff.opCount === 0) grid.kept++; else grid.routed++;
      continue;
    }
    const again = await rowById(clip.clipId);
    if (!again) continue;
    const r = await d.setClipAudio({ clip: again, volumeDb: -60 });
    if (r && r.diff && r.diff.opCount === 0) grid.kept++; else grid.lowered++;
  }
  if (grid.lowered) notes.push('grid panel sound lowered to -60 dB (routing unavailable)');
  if (await mainRouting() !== mainBefore) throw Error('Routing the grid panels\' sound changed the Main clips; nothing was saved. Use gridSound "volume".');
}

// Title over [0, F(8)), labels over [F(12), Fe).
const graphics = (await d.motionGraphics()).map(g => g.name);
let titleAdded = false, labelsAdded = false;
if (cfg.title && !graphics.includes(TITLE)) {
  await d.addMotionGraphic({ within: await d.rangeAtFrames(0, fr.titleFrames[1]), label: TITLE, tsxCode: cfg.title.tsx, parameters: cfg.title.parameters, editableParameters: cfg.title.editableParameters });
  titleAdded = true;
}
if (cfg.labels && !graphics.includes(LABELS)) {
  const span = fr.labelsFrames[fr.labelsFrames.length - 1];
  await d.addMotionGraphic({ within: await d.rangeAtFrames(span[0], span[1]), label: LABELS, tsxCode: cfg.labels.tsx, parameters: cfg.labels.parameters, editableParameters: cfg.labels.editableParameters });
  labelsAdded = true;
}

const added = { look: 0, gridPanel: 0, filmFrame: 0, motion: 0, videoMotion: 0 }, kept = { look: 0, gridPanel: 0, filmFrame: 0, motion: 0, videoMotion: 0 };
// Adds one effect unless the clip already has one with that label.
const ensure = async (id, key, label, build) => {
  const clip = await rowById(id);
  if (!clip) return;
  if (await hasEffect(clip, label)) { kept[key]++; return; }
  const e = await build(clip);
  await d.addVideoEffect(pluginShaderOptions(key,{clip,
label,
parameters: e.parameters,
editableParameters: loose(e.editableParameters || [])}));
  added[key]++;
};
const timeOrigin = (cfg.filmFrame && cfg.filmFrame.timeOrigin) || (cfg.look && cfg.look.timeOrigin) || 'clip';
const leakStrength = x => (x && typeof x.leakStrength === 'number' ? x.leakStrength : 1);
const leakOutSeconds = (fr.endingFrame - fr.leakFrames.a) / fps;
const leakInSeconds = (fr.leakFrames.b - fr.endingFrame) / fps;
// canvasInBox (the last montage clip only): the canvas in % of the clip's own box, so the transition leak is laid
// out on the canvas, not on a cover-cropped portrait or photo box.
// Film grain (0-1) of the Summer look; its opacity also scales with the look strength, so a look at 0 has none.
const lookGrain = cfg.look && typeof cfg.look.grain === 'number' ? cfg.look.grain : 0.35;
const lookFor = (clip, sourceStartSeconds, leakOut, canvasInBox) => ({
  tsx: cfg.look.tsx,
  parameters: { strength: cfg.look.gradeOff ? 0 : cfg.look.strength, grain: lookGrain, leakOutSeconds: leakOut, leakStrength: leakStrength(cfg.look), clipSeconds: (clip.endFrame - clip.startFrame) / fps, sourceStartSeconds, timeOrigin,
    ...(canvasInBox ? { canvasInBox } : {}) },
  editableParameters: [
    { key: 'strength', label: lab('look', 'Summer look'), type: 'number', defaultValue: cfg.look.strength, min: 0, max: 1, step: 0.05 },
    { key: 'grain', label: lab('grain', 'Film grain'), type: 'number', defaultValue: lookGrain, min: 0, max: 1, step: 0.05 },
    { key: 'leakStrength', label: lab('leak', 'Light leak'), type: 'number', defaultValue: leakStrength(cfg.look), min: 0, max: 2, step: 0.05 }],
});
const motionDefs = m => [
  { key: 'motion', label: lab('motion', 'Motion'), type: 'select', defaultValue: m.motion, options: cfg.motion.options || [] },
  { key: 'strength', label: lab('motionStrength', 'Motion strength'), type: 'number', defaultValue: cfg.motion.strength, min: 0, max: 2, step: 0.1 }];

const nMain = fr.mainFrames.length - 1;
const endingFirst = nMain - 3, lastMontage = nMain - 4;
// Leak pulses (centres at pulseFrames, half a beat wide) in each ending clip's local seconds; a pulse that straddles
// a cut appears in both clips. With three or more pulses the last one (ending + 7 beats) is the warm end flare
// (kind 'flare'), three times as wide (1.5 beats), so the final hold does not end on a clean dark picture.
const halfLeak = (fr.leakFrames.b - fr.leakFrames.a) / 2;
const flareAt = fr.pulseFrames.length >= 3 ? fr.pulseFrames.length - 1 : -1;
const pulsesFor = clip => fr.pulseFrames
  .map((f, k) => ({ f, half: k === flareAt ? 3 * halfLeak : halfLeak, flare: k === flareAt }))
  .filter(q => q.f + q.half > clip.startFrame && q.f - q.half < clip.endFrame)
  .map(q => (q.flare ? { at: (q.f - clip.startFrame) / fps, dur: 2 * q.half / fps, kind: 'flare' } : { at: (q.f - clip.startFrame) / fps, dur: 2 * q.half / fps }));
let missing = 0;
for (let i = 0; i < nMain; i++) {
  const clip = mainClip(await all(), i);
  if (!clip) { missing++; continue; }
  const m = (cfg.placed || [])[i] || {};
  const isPhoto = photoIds.has(clip.resourceId);
  const ss = typeof m.sourceStart === 'number' ? m.sourceStart : 0;
  // Montage photos: Photo motion first, so the grade (and its leak) sits on top of the moving picture.
  const mm = cfg.motion && cfg.motion.byClipIndex && cfg.motion.byClipIndex[String(i)];
  if (isPhoto && mm && i >= 2 && i <= lastMontage) {
    await ensure(clip.clipId, 'motion', MOTION, c => ({ tsx: cfg.motion.tsx,
      parameters: { motion: mm.motion, strength: cfg.motion.strength, direction: mm.direction, axis: mm.axis, cover: mm.cover || 1, holdSeconds: Math.round((c.endFrame - c.startFrame) / fps * 1000) / 1000 },
      editableParameters: motionDefs(mm) }));
  }
  // Montage videos: Video motion (a slow push-in) first, under the grade, like the photos' Photo motion. Grid panels
  // and ending clips keep a still picture.
  if (!isPhoto && cfg.videoMotion && i >= 2 && i <= lastMontage) {
    await ensure(clip.clipId, 'videoMotion', VMOTION, c => ({ tsx: cfg.videoMotion.tsx,
      parameters: { strength: cfg.videoMotion.strength, clipSeconds: (c.endFrame - c.startFrame) / fps, sourceStartSeconds: ss, timeOrigin },
      editableParameters: [{ key: 'strength', label: lab('videoMotion', 'Video motion'), type: 'number', defaultValue: cfg.videoMotion.strength, min: 0, max: 2, step: 0.1 }] }));
  }
  // Summer look on every clip; the last montage clip carries the outgoing leak (a quarter beat before the ending cut).
  // Look off (gradeOff): no grade anywhere, but the last montage clip keeps a strength-0 look for its outgoing leak.
  if (cfg.look && (!cfg.look.gradeOff || i === lastMontage)) {
    await ensure(clip.clipId, 'look', LOOK, async c => (i === lastMontage
      ? lookFor(c, ss, leakOutSeconds, stCanvasInBox(sizes[c.resourceId], await d.clipTransform(c)))
      : lookFor(c, ss, 0, null)));
  }
  // Ending clips: Film frame after the look. The window is fixed on the canvas (canvasInBox); ending photos move
  // inside it (motion), the first clip opens with the leak wash, the last fades to black.
  if (cfg.filmFrame && i >= endingFirst) {
    const k = i - endingFirst;
    const em = cfg.endingMotion && cfg.endingMotion[String(k)];
    const win = cfg.filmFrame.window || {};
    await ensure(clip.clipId, 'filmFrame', FILM, async c => {
      const t = await d.clipTransform(c);
      const fringe = cfg.filmFrame.fringe != null ? cfg.filmFrame.fringe : win.fringe;
      const parameters = {
        canvasInBox: stCanvasInBox(sizes[c.resourceId], t),
        windowW: win.w, windowH: win.h, radius: win.radius, feather: win.feather,
        leakInSeconds: k === 0 ? leakInSeconds : 0, pulses: pulsesFor(c), leakStrength: leakStrength(cfg.filmFrame),
        fadeOutFrames: k === 2 ? fr.endFrame - fr.fadeStartFrame : 0, clipSeconds: (c.endFrame - c.startFrame) / fps,
        motion: isPhoto && em ? { motion: em.motion, direction: em.direction, axis: em.axis, strength: cfg.motion ? cfg.motion.strength : 1 } : null,
        sourceStartSeconds: ss, timeOrigin, ...(fringe != null ? { fringe } : {}),
      };
      return { tsx: cfg.filmFrame.tsx, parameters,
        editableParameters: [{ key: 'leakStrength', label: lab('leak', 'Light leak'), type: 'number', defaultValue: leakStrength(cfg.filmFrame), min: 0, max: 2, step: 0.05 }] };
    });
  }
}
// Grid panels: the look, then a quadrant mask on sources that are not 16:9 (their cover crop overflows the quadrant).
for (const gp of cfg.gridPlaced || []) {
  const clip = gridClip(await all(), gp);
  if (!clip) { missing++; continue; }
  if (cfg.look && !cfg.look.gradeOff) await ensure(clip.clipId, 'look', LOOK, c => lookFor(c, gp.sourceStart || 0, 0, null));
  if (cfg.gridPanel && !is169(sizes[gp.rid])) {
    await ensure(clip.clipId, 'gridPanel', GRID, async c => {
      const q = QUAD_RECT[gp.quad];
      const r = stRectInBox(sizes[gp.rid], await d.clipTransform(c), { x: q.x, y: q.y, w: W / 2, h: H / 2 });
      const clamp = v => Math.max(0, Math.min(100, v));
      return { tsx: cfg.gridPanel.tsx, parameters: { insetPct: { top: clamp(r.y), right: clamp(100 - r.x - r.w), bottom: clamp(100 - r.y - r.h), left: clamp(r.x) } } };
    });
  }
}
if (missing) notes.push(missing + (missing === 1 ? ' clip was' : ' clips were') + ' not found for effects');

// Commit only when this run changed something: commitAll rejects an empty change ("Nothing to stage"), which a retry
// after a landed but unreported commit would otherwise hit. Nothing to do is success (alreadyDone).
const changed = muted || grid.routed > 0 || grid.lowered > 0 || titleAdded || labelsAdded || Object.values(added).some(n => n > 0);
if (changed) await d.commitAll('Summer Trip: title and look');
return { titleAdded, labelsAdded, muted, muteKept, gridSound: grid, effects: { added, kept }, committed: changed, alreadyDone: !changed, notes };
