import {Graph, parameters, cssColor} from './graph.mjs';

// Match the legacy SVG's piecewise-linear, rounded component-transfer tables,
// rather than substituting an approximately similar LUT or generic preset.
const TABLE = `
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

export function grade(kind, data = null) {
  data=data||{};
  const g = new Graph(data);
  const p = parameters(data, {strength:kind==='archive'?0.3:kind==='credits'?0.5:0.35, warmth:1});
  const s = `sat(${p.refs.strength})`, w = `clamp(${p.refs.warmth},0.0,2.0)`;
  let body;
  if (kind === 'archive') body = `
    let s=${s};let w=${w};let src=source(uv);if(s==0.0){return src;}var c=straight(src).rgb;
    let green=sat(10.0*(c.g-c.r)-.1)*sat(1.0-4.0*(c.b-c.g));
    c=mix(c,saturation(c,1.0-.7*s),green);
    let orange=sat(2.5*(c.r-c.b)-1.0);c=mix(c,saturation(c,1.0-.6*s),orange);
    c=saturation(c,1.0+.05*s);
    return premul(vec4f(curve(0u,c.r,s,w,0u),curve(1u,c.g,s,w,0u),curve(2u,c.b,s,w,0u),src.a));`;
  else if (kind === 'credits') body = `
    let s=${s};let src=source(uv);if(s==0.0){return src;}var c=straight(src).rgb;
    let warm=sat(1.6*(c.r-c.b)-.4);c=mix(c,saturation(c,1.0-.45*s),warm);c=saturation(c,1.0-.12*s);
    return premul(vec4f(curve(0u,c.r,s,0.0,1u),curve(1u,c.g,s,0.0,1u),curve(2u,c.b,s,0.0,1u),src.a));`;
  else if (kind === 'soft') body = `
    let s=${s};let src=source(uv);let c=straight(src).rgb;let l=dot(c,vec3f(.2126,.7152,.0722));
    let graded=clamp(c*(1.0-.08*s)+.046*s,vec3f(0.0),vec3f(1.0));
    let tint=vec3f(1.0,0.0,.55)*max(0.0,.25*s*(l-.6));
    return premul(vec4f(clamp(graded+tint,vec3f(0.0),vec3f(1.0)),src.a));`;
  else if (kind === 'golden') body = `
    let s=${s};let src=source(uv);var c=straight(src).rgb;
    c=sepia(c,floor(.22*s*1000.0+.5)/1000.0);
    c=saturation(c,floor((1.0+.3*s)*1000.0+.5)/1000.0);
    c=hue(c,(floor(-6.0*s*100.0+.5)/100.0)*.01745329252);
    c=brightness(c,floor((1.0+.03*s)*1000.0+.5)/1000.0);
    c=contrast(c,floor((1.0+.05*s)*1000.0+.5)/1000.0);
    return premul(vec4f(c,src.a));`;
  else throw Error(`Unknown grade: ${kind}`);
  g.pass(body, {...p, functions:TABLE});
  return g.finish();
}

export function cssGrade(filters) {
  const g = new Graph();
  g.pass(`let c=straight(source(uv));return premul(vec4f(${cssColor('c.rgb',filters)},c.a));`);
  return g.finish();
}
