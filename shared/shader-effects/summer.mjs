import{Graph,parameters,choice,f32,number,vec}from'./graph.mjs';
import{PHOTO_MOTION,MOTIONS}from'./motion.mjs';

export const GRADIENTS=`
fn rnd(v:f32,k:f32)->f32{return floor(v*k+.5)/k;}
fn screen(b:vec4f,s:vec4f)->vec4f{return vec4f(b.rgb+s.rgb*(1.0-b.rgb),b.a+s.a*(1.0-b.a));}
fn blendOverlay(b:vec4f,s:vec4f)->vec4f {let cb=straight(b).rgb;let cs=straight(s).rgb;let rgb=select(2.0*cb*cs,1.0-2.0*(1.0-cb)*(1.0-cs),cb>vec3f(.5));return vec4f(rgb*b.a*s.a+b.rgb*(1.0-s.a)+s.rgb*(1.0-b.a),s.a+b.a*(1.0-s.a));}
fn rgba(c:vec3f,a:f32)->vec4f {let alpha=rnd(sat(a),1000.0);return vec4f(c/255.0*alpha,alpha);}
fn stop2(t:f32,a:f32,b:f32,ca:vec4f,cb:vec4f)->vec4f{return mix(ca,cb,sat((t-a)/max(.000001,b-a)));}
fn stop3(t:f32,m:f32,a:vec4f,b:vec4f,c:vec4f)->vec4f {return select(stop2(t,0.0,m,a,b),stop2(t,m,1.0,b,c),t>m);}
fn line(uv:vec2f,angle:f32,size:vec2f)->f32{let d=vec2f(sin(radians(angle)),-cos(radians(angle)));return .5+dot((uv-.5)*size,d)/dot(abs(d),size);}
fn radial(uv:vec2f,at:vec2f,r:vec2f)->f32{return length((uv-at)/r);}
`;
const canvas=d=>{const c=d.canvasInBox||{};return [number(c.x),number(c.y),number(c.w,100),number(c.h,100)].map(x=>x/100);};
function timing(d,p){return `let t=uniforms.clock.z-${d.timeOrigin==='source'?f32(number(d.sourceStartSeconds)):'0.0'};let clip=${p.refs.clipSeconds};`;}

export function summerLook(data=null){
 data=data||{};const g=new Graph(data),p=parameters(data,{strength:.45,grain:.35,leakOutSeconds:0,leakStrength:1,clipSeconds:0});const r=p.refs;
 const tone=`fn tone(x:f32,s:f32,ch:u32)->f32 {
 let sc=x-.3*s*sin(6.28318530718*x)/6.28318530718;let sh=6.75*x*(1.0-x)*(1.0-x);let hl=6.75*x*x*(1.0-x);let roll=ease((x-.6)/.4);
 let v=vec3f(sc)+s*(vec3f(-.08,.012,.05)*sh+vec3f(.07,.012,-.11)*hl-vec3f(.02,.04,.1)*roll);return rnd(sat(v[ch]),10000.0);
 }
 fn table(x:f32,s:f32,ch:u32)->f32 {let k=sat(x)*16.0;let a=floor(k)/16.0;return mix(tone(a,s,ch),tone(min(1.0,a+1.0/16.0),s,ch),fract(k));}
 fn cool(c:vec3f,s:f32)->vec3f{let satValue=1.0-.7*s;let m=.35*s;let d=1.0-.08*s;let lum=vec3f(.213,.715,.072);let rr=(lum*(1.0-satValue)+vec3f(satValue,0.0,0.0))*d;let gg=(lum*(1.0-satValue)+vec3f(0.0,satValue,0.0))*d;let bb=m*gg+(1.0-m)*(lum*(1.0-satValue)+vec3f(0.0,0.0,satValue))*d;
 return clamp(vec3f(dot(c,floor(rr*1000.0+.5)/1000.0),dot(c,floor(gg*1000.0+.5)/1000.0),dot(c,floor(bb*1000.0+.5)/1000.0)),vec3f(0.0),vec3f(1.0));}
 `;
 let input=g.pass(`let c=straight(source(uv));let s=sat(${r.strength});let rgb=vec3f(table(c.r,s,0u),table(c.g,s,1u),table(c.b,s,2u));let mask=sat(dot(rgb,vec3f(-2.5,2.0,.5)))*c.a;
 return premul(vec4f(mix(saturation(rgb,rnd(1.0+.08*s,1000.0)),cool(rgb,s),mask),c.a));`,{...p,functions:GRADIENTS+tone});
 input=g.pass(`${timing(data,p)}var c=source(uv);let span=${r.leakOutSeconds};let k=clamp(${r.leakStrength},0.0,2.0);let box=${vec(canvas(data))};let at=(uv-box.xy)/box.zw;
 if(span>0.0&&clip>0.0&&k>0.0&&t>=clip-span&&all(at>=vec2f(0.0))&&all(at<=vec2f(1.0))){let u=sat((t-clip+span)/span);let e=ease(u);
 let wash=sat((.85+.15*e)*k);let glow=sat((.5+.3*e)*k);let bloom=sat((.1+.9*pow(u,1.6))*k);let edge=sat(.65*e*k);let x=line(at,100.0,uniforms.resolution.xy*box.zw);
 c=blendOverlay(c,stop3(x,.5,rgba(vec3f(255.0,150.0,60.0),.75*wash),rgba(vec3f(255.0,110.0,40.0),.85*wash),rgba(vec3f(255.0,90.0,40.0),.9*wash)));
 c=screen(c,stop2(x,0.0,1.0,rgba(vec3f(255.0,110.0,40.0),.5*glow),rgba(vec3f(255.0,80.0,30.0),.7*glow)));
 let b=radial(at,vec2f(38.0-14.0*e,30.0+4.0*e)/100.0,vec2f(50.0+55.0*e,60.0+60.0*e)/100.0);
 var bc=stop2(b,0.0,.35,rgba(vec3f(255.0,228.0,170.0),.85*bloom),rgba(vec3f(255.0,205.0,135.0),.8*bloom));
 if(b>.35){bc=stop2(b,.35,.65,rgba(vec3f(255.0,205.0,135.0),.8*bloom),rgba(vec3f(255.0,165.0,80.0),.5*bloom));}if(b>.65){bc=stop2(b,.65,1.0,rgba(vec3f(255.0,165.0,80.0),.5*bloom),vec4f(0.0));}c=screen(c,bc);
 let ed=radial(at,vec2f(.98,.5),vec2f(.12,.9));c=screen(c,stop3(ed,.5,rgba(vec3f(255.0,120.0,30.0),edge),rgba(vec3f(255.0,90.0,30.0),.5*edge),vec4f(0.0)));}
 return c;`,{...p,inputs:[input],functions:GRADIENTS});
 const grains=[];for(let seed=0;seed<8;seed++)grains.push(g.image(`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><filter id="g" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="${seed}" stitchTiles="stitch"/><feColorMatrix values=".33 .33 .33 0 0 .33 .33 .33 0 0 .33 .33 .33 0 0 0 0 0 0 1"/><feComponentTransfer><feFuncR type="linear" slope="3" intercept="-1"/><feFuncG type="linear" slope="3" intercept="-1"/><feFuncB type="linear" slope="3" intercept="-1"/></feComponentTransfer></filter><rect width="256" height="256" filter="url(#g)"/></svg>`,{width:256,height:256}));
 const noise=g.pass(`let f=u32(max(0.0,round(uniforms.clock.x)));var h=(f+1u)*2654435761u;h^=h>>15u;h*=2246822519u;h^=h>>13u;
 let p=fract((uv*uniforms.resolution.xy-vec2f(f32(h%256u),f32((h>>8u)%256u)))/256.0);let i=f%8u;
 ${grains.map((_,i)=>`if(i==${i}u){return textureSampleLevel(input${i},linearSampler,p,0.0);}`).join('\n')}return vec4f(0.0);`,{inputs:grains});
 g.pass(`let b=source(uv);let n=textureSampleLevel(input1,linearSampler,uv,0.0);let a=rnd(sat(${r.grain})*sat(${r.strength})*.5,1000.0);return blendOverlay(b,n*a);`,{...p,inputs:[input,noise],functions:GRADIENTS});
 return g.finish();
}

export function videoMotion(data=null){data=data||{};const g=new Graph(data),p=parameters(data,{strength:1,clipSeconds:0});g.pass(`${timing(data,p)}let span=max(1.0,round(clip*uniforms.clock.y)-1.0);let e=.5-.5*cos(3.14159265359*sat(t*uniforms.clock.y/span));let z=select(1.0,1.0+.04*clamp(${p.refs.strength},0.0,2.0)*e,clip>0.0);return source((uv-.5)/(floor(z*100000.0+.5)/100000.0)+.5);`,p);return g.finish();}
export function gridPanel(data=null){data=data||{};const g=new Graph(data),i=data.insetPct||{};const v=k=>Math.round(Math.max(0,Math.min(100,number(i[k])))*10000)/1e6;const x=v('left'),y=v('top'),w=1-x-v('right'),h=1-y-v('bottom');g.pass(`let box=${vec([x,y,w,h])};return source(uv)*within((uv-box.xy)/max(box.zw,vec2f(.000001)),box.zw*uniforms.resolution.xy);`);return g.finish();}

export function filmFrame(data=null){
 data=data||{};const g=new Graph(data),p=parameters(data,{windowW:.87,windowH:.84,radius:.02,feather:.012,fringe:1,leakInSeconds:0,leakStrength:1,fadeOutFrames:0,clipSeconds:0});const r=p.refs,c=canvas(data),m=data.motion||{};
 const frame=`${timing(data,p)}let canvas=${vec(c)};let at=(uv-canvas.xy)/canvas.zw;`;
 const pulses=(data.pulses||[]).map(q=>{
  const dur=Math.max(.05,Math.min(10,number(q.dur,.4))),at=number(q.at),cut=at-dur/2<=0||number(data.clipSeconds)<=0||at+dur/2>=data.clipSeconds;
  return `{let u=(t-${f32(at)})/${f32(dur)}+.5;if(u>=0.0&&u<=1.0){let env=sat(pow(sin(3.14159265359*u),1.5)*k);
   ${q.kind==='flare'?`let rr=radial(at,vec2f(.18+.2*u,.78-.16*u),vec2f(.7,.8));c=screen(c,stop3(rr,.45,rgba(vec3f(255.0,150.0,70.0),.7*env),rgba(vec3f(255.0,120.0,55.0),.4*env),vec4f(0.0)));c=blendOverlay(c,stop3(line(at,30.0,vec2f(1920.0,1080.0)),.6,rgba(vec3f(255.0,140.0,60.0),.55*env),rgba(vec3f(255.0,170.0,90.0),.3*env),vec4f(0.0)));`:
   cut?`let cy=.22+.16*u;let rr=radial(at,vec2f(.97,cy),vec2f(.12,.26));let soft=rgba(vec3f(255.0,130.0,60.0),.35*env*(1.0-sat(radial(at,vec2f(.96,cy+.06),vec2f(.28,.4)))));let hot=stop3(rr,.5,rgba(vec3f(255.0,70.0,40.0),.95*env),rgba(vec3f(230.0,40.0,50.0),.55*env),vec4f(0.0));c=screen(c,over(hot,soft));`:
   `let rr=radial(at,vec2f(.66-.14*u,.8),vec2f(.6,.5));let hot=stop3(rr,.45,rgba(vec3f(235.0,50.0,55.0),.85*env),rgba(vec3f(220.0,40.0,60.0),.5*env),vec4f(0.0));let pos=line(at,150.0,vec2f(1920.0,1080.0));let a=select(sat((pos-.3)/.4),1.0-sat((pos-.7)/.3),pos>.7);c=screen(c,over(hot,rgba(vec3f(255.0,90.0,50.0),.35*env*a)));`}
  }}`;
 }).join('\n');
 const picture=g.pass(`${frame}let origin=canvas.xy+canvas.zw*.5;
  let motion=photoMotion(${Math.max(0,MOTIONS.indexOf(m.motion))}u,select(0.0,t/max(.000001,clip),clip>0.0),${f32(number(m.strength,1))},${f32(m.direction===-1?-1:1)},${m.axis==='y'?1:0}u,1.0,vec2f(1920.0,1080.0));
  let coord=rotate((uv-origin-motion.xy*canvas.zw)*uniforms.resolution.xy,-motion.w)/motion.z/uniforms.resolution.xy+origin;var c=over(source(coord),vec4f(0.0,0.0,0.0,1.0));let k=clamp(${r.leakStrength},0.0,2.0);
  if(k>0.0){let span=${r.leakInSeconds};if(span>0.0&&t>=0.0&&t<span){let u=sat(t/span);let e=ease(u);let wash=sat(pow(1.0-e,2.2)*k);let tint=sat(sin(3.14159265359*min(1.0,.35+.65*u))*k);let band=sat(sqrt(max(0.0,sin(3.14159265359*min(1.0,.1+.9*u))))*k);
  c=screen(c,stop3(at.x,.55,rgba(vec3f(255.0,190.0,105.0),.6*wash),rgba(vec3f(255.0,200.0,120.0),.7*wash),rgba(vec3f(255.0,185.0,100.0),.7*wash)));
  c=blendOverlay(c,stop3(at.x,.6,rgba(vec3f(255.0,140.0,50.0),.55*tint),rgba(vec3f(255.0,110.0,40.0),.8*tint),rgba(vec3f(255.0,90.0,40.0),.85*tint)));
  let rad=radial(at,vec2f(.8-.35*e,.55),vec2f(.26-.14*e,.85));c=screen(c,stop3(rad,.5,rgba(vec3f(255.0,70.0,40.0),.9*band),rgba(vec3f(240.0,40.0,40.0),.55*band),vec4f(0.0)));}
  ${pulses}}
  return c*within(at,canvas.zw*uniforms.resolution.xy);`,{...p,functions:GRADIENTS+PHOTO_MOTION});
 const masks=g.pass(`let canvas=${vec(c)};let at=(uv-canvas.xy)/canvas.zw*vec2f(1920.0,1080.0);let win=vec2f(clamp(${r.windowW},.1,1.0)*1920.0,clamp(${r.windowH},.1,1.0)*1080.0);let origin=(vec2f(1920.0,1080.0)-win)*.5;let radius=clamp(${r.radius},0.0,.5)*1080.0;
 let mask=roundRect(at-origin,win,min(radius,min(win.x,win.y)*.5));return vec4f(mask);`,p);
 let mask=masks;
 for(const axis of [0,1])mask=g.pass(`let sigma=max(.0,${r.feather})*uniforms.resolution[${axis}]*${f32(c[axis+2])}*${axis===0?'1080.0/1920.0':'1.0'};if(sigma<.01){return source(uv);}let step=max(1.0,sigma/20.0);var c=vec4f(0.0);var weight=0.0;
  for(var i=-60;i<=60;i++){let v=f32(i)*step;let w=exp(-.5*v*v/(sigma*sigma));c+=source(uv+${axis===0?'vec2f(v,0.0)':'vec2f(0.0,v)'}/uniforms.resolution.xy)*w;weight+=w;}return c/weight;`,{...p,inputs:[mask]});
 // The two feathered, displaced boundary samples form the warm/cool RGB rim.
 g.pass(`${frame}let mask=textureSampleLevel(input1,linearSampler,uv,0.0).a;let c=source(uv);var out=vec4f(c.rgb*mask,1.0);
  let amount=clamp(${r.fringe},0.0,2.0);let shift=max(1.0,${r.feather}*1080.0*.25)*amount;let delta=vec2f(shift/1920.0,.4*shift/1080.0)*canvas.zw;
  let warm=abs(textureSampleLevel(input1,linearSampler,uv-delta,0.0).a-mask);let cool=abs(textureSampleLevel(input1,linearSampler,uv+delta,0.0).a-mask);
  out=screen(out,vec4f((vec3f(1.0,70.0/255.0,40.0/255.0)*warm+vec3f(40.0/255.0,160.0/255.0,1.0)*cool)*sat(.3*amount),0.0));
  let fade=select(0.0,sat((round(t*uniforms.clock.y)-(round(clip*uniforms.clock.y)-${r.fadeOutFrames})+1.0)/max(1.0,${r.fadeOutFrames})),clip>0.0&&${r.fadeOutFrames}>0.0);return vec4f(out.rgb*(1.0-fade),1.0);`,{...p,inputs:[picture,mask],functions:GRADIENTS});return g.finish();
}
