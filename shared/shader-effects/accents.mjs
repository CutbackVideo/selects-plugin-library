import {Graph, parameters, choice, f32, number, cssColor} from './graph.mjs';

export function aliCamera(data = null) {
  data=data||{};
  const g=new Graph(data),keys=Array.isArray(data.camera)?data.camera:[];
  const moves=keys.map((k,i)=>{const prev=i?keys[i-1]:{zoom:1,y:0};return `if(f>=${f32(k.at)}){
    let p=ease((f-${f32(k.at)})/${f32(Math.max(1,number(k.frames,1)))});z=mix(${f32(prev.zoom)},${f32(k.zoom)},p);y=mix(${f32(number(prev.y))},${f32(number(k.y))},p);}`;}).join('\n');
  g.pass(`let f=uniforms.clock.x+${f32(number(data.start))};var z=1.0;var y=0.0;${moves}
    let coord=(uv-vec2f(.509,.17)-vec2f(0.0,y/100.0))/z+vec2f(.509,.17);
    let c=straight(source(coord));return premul(vec4f(${cssColor('c.rgb','contrast(1.28) brightness(1.3) saturate(1.18)')},c.a));`);
  return g.finish();
}

export function cinemaGlitch(data = null) {
  data=data||{};
  const g=new Graph(data),p=parameters(data,{triggerLocalFrame:0});
  g.pass(`let k=uniforms.clock.x-${p.refs.triggerLocalFrame};if(k<0.0||k>=5.0){return source(uv);}
    let hard=k==0.0||k==2.0||k==4.0;let direction=select(-1.0,1.0,k%2.0!=0.0);
    let coord=uv-vec2f(direction*(6.0+k*3.0)/uniforms.resolution.x,0.0);let c=straight(source(coord));
    let rgb=brightness(contrast(saturation(c.rgb,0.0),select(2.5,5.0,hard)),select(1.3,2.2,hard));
    return premul(vec4f(rgb,c.a));`,p);return g.finish();
}

export function cinemaCard(data = null) {
  data=data||{};
  const g=new Graph(data),p=parameters(data,{widthPct:50});
  // A box shadow is the Gaussian integral of the rectangular alpha mask.
  g.pass(`let size=uniforms.resolution.xy;let width=${p.refs.widthPct}/100.0*size.x;let box=vec2f(width,width*9.0/16.0);
    let at=uv*size-(size-box)*.5;let coord=at/box;let c=source(coord)*within(coord,box);
    let sigma=17.5;let a=(at-box)/sigma;let b=at/sigma;
    let shadow=.2*(normalCdf(b.x)-normalCdf(a.x))*(normalCdf(b.y)-normalCdf(a.y));
    return over(c,vec4f(vec3f(shadow),1.0));`,{...p,functions:`fn normalCdf(x:f32)->f32 {
      let v=abs(x);let t=1.0/(1.0+.2316419*v);
      let q=.3989422804*exp(-v*v*.5)*t*(.319381530+t*(-.356563782+t*(1.781477937+t*(-1.821255978+t*1.330274429))));
      return select(q,1.0-q,x>=0.0);
    }`});return g.finish();
}

export function sticker(data = null) {
  data=data||{};
  const g=new Graph(data),p=parameters(data,{x:0,y:0,s:1});
  const dir=choice(p,data,'dir',{instant:0,right:1,left:2,up:3,down:4,fade:5},'instant');
  g.pass(`let e=ease(uniforms.clock.x/6.0);let dir=u32(${dir});var offset=vec2f(${p.refs.x},${p.refs.y});
    if(dir==1u){offset.x-=1250.0*(1.0-e);}if(dir==2u){offset.x+=1250.0*(1.0-e);}
    if(dir==3u){offset.y+=2100.0*(1.0-e);}if(dir==4u){offset.y-=2100.0*(1.0-e);}
    let coord=(uv-.5-offset/uniforms.resolution.xy)/max(.000001,${p.refs.s})+.5;
    return source(coord)*select(1.0,e,dir==5u);`,p);return g.finish();
}

export function spotlight(data = null) {
  data=data||{};
  const g=new Graph(data),p=parameters(data,{at:0,x:.5,y:.5});
  g.pass(`let t=uniforms.clock.x-${p.refs.at};var layer=vec4f(0.0);
    if(t>=0.0&&t<6.0){let distance=length((uv-vec2f(${p.refs.x},${p.refs.y}))*uniforms.resolution.xy);
      let a=.64*sat((distance-(70.0+75.0*t))/3.0);layer=vec4f(vec3f(8.0,40.0,44.0)/255.0*a,a);
    }else if(t>=6.0&&t<9.0){layer=vec4f(vec3f(112.0,18.0,30.0)/255.0*.4,.4);}
    return over(layer,source(uv));`,p);return g.finish();
}

// W3C non-separable "color" blend: take the source hue/saturation and backdrop
// luminance, then clip colors without shifting luminance at gamut boundaries.
const COLOR_BLEND=`
fn lum(c:vec3f)->f32{return dot(c,vec3f(.3,.59,.11));}
fn setLum(c0:vec3f,l:f32)->vec3f {
 var c=c0+vec3f(l-lum(c0));let n=min(min(c.r,c.g),c.b);let x=max(max(c.r,c.g),c.b);
 if(n<0.0){c=vec3f(l)+(c-vec3f(l))*l/max(.000001,l-n);}
 if(x>1.0){c=vec3f(l)+(c-vec3f(l))*(1.0-l)/max(.000001,x-l);}
 return c;
}`;
export function colorSplit(data = null) {
  data=data||{};
  const g=new Graph(data),p=parameters(data,{at:0});
  g.pass(`let t=uniforms.clock.x-${p.refs.at};let src=source(uv);if(t<0.0||t>=4.0){return src;}
    let right=uv.x>=(46.0+t*3.0)/100.0;let rgb=select(vec3f(60.0,100.0,255.0),vec3f(255.0,150.0,105.0),right)/255.0;
    let a=select(.5,.38,right);let blended=setLum(rgb,lum(straight(src).rgb));
    return vec4f(blended*a*src.a+rgb*a*(1.0-src.a)+src.rgb*(1.0-a),a+src.a*(1.0-a));`,{...p,functions:COLOR_BLEND});return g.finish();
}

export function vintageAfter(data = null) {
  data=data||{};
  const g=new Graph(data),p=parameters(data,{at:0});
  g.pass(`let src=source(uv);if(uniforms.clock.x<${p.refs.at}){return src;}
    let c=straight(src);return premul(vec4f(${cssColor('c.rgb','sepia(0.14) saturate(0.82) contrast(1.07) brightness(0.97)')},c.a));`,p);return g.finish();
}

export function iris(data = null) {
  data=data||{};
  const g=new Graph(data),p=parameters(data,{holdFrames:6,openFrames:16});
  g.pass(`let e=outCubic((uniforms.clock.x-${p.refs.holdFrames})/max(.000001,${p.refs.openFrames}));
    let z=1.18-.18*e;let coord=(uv-.5)/z+.5;let size=uniforms.resolution.xy;
    let radius=(.02+.78*e)*length(size)/sqrt(2.0);
    let mask=sat((radius-length((coord-.5)*size))*z+.5);
    return over(source(coord)*mask,vec4f(0.0,0.0,0.0,1.0));`,p);return g.finish();
}
