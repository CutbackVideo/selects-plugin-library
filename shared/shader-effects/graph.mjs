// Portable clip-effect authoring. This code runs once when authoring a Draft;
// only the resulting WGSL graph runs during Preview and Export.
export const IMAGE = `
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

export function number(value, fallback = 0) {
  const n = typeof value === 'number' ? value : Number(value);
  return value == null || value === '' || !Number.isFinite(n) ? fallback : n;
}

export function f32(value) {
  const n = number(value, NaN);
  if (!Number.isFinite(n) || Math.abs(n) > 3.4028234663852886e38) throw Error('Invalid shader coefficient');
  const s = String(n);
  return /[.e]/i.test(s) ? s : s + '.0';
}

export function vec(values) { return `vec${values.length}f(${values.map(f32).join(',')})`; }

export function xml(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
}

export class Graph {
  data = null;
  passes = [];
  images = [];
  uniforms = [];
  svgParameters = [];
  constructor(data = {}) { this.data = data; }
  pass(body, {inputs = ['source'], values = [], bindings = [], functions = '', scale = 1} = {}) {
    const id = `p${this.passes.length}`;
    this.passes.push({id, inputs, parameters: values, wgsl: IMAGE + functions + `\nfn effect(uv:vec2f)->vec4f {${body}}`, ...(scale !== 1 ? {scale} : {})});
    for (const binding of bindings) this.uniforms.push({pass:id, ...binding});
    return id;
  }
  image(svg, size = null) {
    const id = `image${this.images.length}`;
    this.images.push({id, svg, ...(size ? {size} : {})});
    return id;
  }
  finish(output = this.passes.at(-1)?.id) {
    if (!output || !this.passes.some(p => p.id === output)) throw Error('Missing shader output');
    if (this.passes.length > 128 || this.images.length > 16) throw Error('Effect exceeds shader graph budget');
    for (const p of this.passes) {
      if (p.parameters.length > 4096 || p.parameters.some(n => !Number.isFinite(n))) throw Error('Invalid shader parameters');
      if (p.wgsl.length > 262144 || p.inputs.length > 8) throw Error('Effect exceeds shader pass budget');
    }
    return {graph:{schema:'Cutback.ShaderEffect.1', passes:this.passes, output, ...(this.images.length ? {images:this.images} : {})}, ...(this.uniforms.length ? {uniforms:this.uniforms} : {}), ...(this.svgParameters.length ? {svgParameters:this.svgParameters} : {})};
  }
}

// Use uniform slots for every editable number, so Adjust does not recompile a
// graph or accidentally leave a baked coefficient unchanged.
export function parameters(data, defaults) {
  const values = [], bindings = [], refs = Object.create(null);
  for (const [key, fallback] of Object.entries(defaults)) {
    const index = values.length;
    values.push(number(data[key], Number(fallback)));
    // The caller supplies defaults in the persisted parameter object as well.
    if (data[key] != null) bindings.push({index, parameter:key});
    refs[key] = `uniforms.values[${Math.floor(index/4)}][${index%4}]`;
  }
  return {values, bindings, refs};
}

export function choice(p, data, key, values, fallback) {
  const value=data[key]??fallback,index=p.values.length;
  if (!Object.hasOwn(values,String(value))) throw Error(`Unsupported ${key}: ${value}`);
  p.values.push(values[String(value)]);
  if(data[key]!=null)p.bindings.push({index,parameter:key,values});
  return `uniforms.values[${Math.floor(index/4)}][${index%4}]`;
}

export function cssColor(expression, filters) {
  let c = expression;
  if (!filters || filters === 'none') return c;
  const parts = [...filters.matchAll(/([a-z-]+)\(([^()]*)\)/g)];
  if (parts.map(p=>p[0]).join('').replace(/\s/g,'') !== filters.replace(/\s/g,'')) throw Error('Unsupported color filter');
  for (const [, kind, raw] of parts) {
    const value = parseFloat(raw) / (raw.endsWith('%') ? 100 : 1);
    const v = f32(value);
    if (kind === 'saturate') c = `saturation(${c},${v})`;
    else if (kind === 'grayscale') c = `saturation(${c},${f32(1-Math.min(1,Math.max(0,value)))})`;
    else if (kind === 'sepia') c = `sepia(${c},${v})`;
    else if (kind === 'brightness' || kind === 'contrast') c = `${kind}(${c},${v})`;
    else if (kind === 'hue-rotate') c = `hue(${c},${f32(value*(raw.endsWith('rad') ? 1 : raw.endsWith('turn') ? 2*Math.PI : Math.PI/180))})`;
    else throw Error(`Unsupported color filter: ${kind}`);
  }
  return c;
}

// Separable Gaussian in the declared coordinate space. Adaptive tap spacing
// covers three sigma even at 4K or at the largest editable blur setting.
export function gaussian(g, input, sigma, {maxSigma=64, space=null, scale=1, values=[], bindings=[], functions=''} = {}) {
  for (const axis of ['x','y']) input = g.pass(`
    let size=${space?vec(space):'uniforms.resolution.xy'};
    let s=max(0.0,${sigma});if(s<0.01){return source(uv);}
    let pixels=s*uniforms.resolution.${axis}/size.${axis};
    let radius=min(60,i32(ceil(3.0*pixels)));let stride=max(1.0,3.0*pixels/60.0);
    let step=vec2f(${axis==='x'?'1.0,0.0':'0.0,1.0'})/uniforms.resolution.xy;
    var sum=vec4f(0.0);var weight=0.0;
    for(var i=-60;i<=60;i++){if(abs(i)<=radius){
      let distance=f32(i)*stride;let w=exp(-distance*distance/(2.0*pixels*pixels));
      sum+=source(uv+step*distance)*w;weight+=w;
    }}return sum/max(weight,0.000001);`, {inputs:[input],scale,values,bindings,functions});
  return input;
}
