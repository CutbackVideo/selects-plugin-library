import {CHRIS_FONTS} from './chris-font.mjs';
import {Graph,parameters,choice,number,f32,xml,gaussian} from './graph.mjs';

const BLENDS=`
fn overlay(b:vec3f,s:vec3f)->vec3f{return select(2.0*b*s,1.0-2.0*(1.0-b)*(1.0-s),b>vec3f(.5));}
fn softLight(b:vec3f,s:vec3f)->vec3f{let d=select(((16.0*b-12.0)*b+4.0)*b,sqrt(b),b>vec3f(.25));return select(b-(1.0-2.0*s)*b*(1.0-b),b+(2.0*s-1.0)*(d-b),s>vec3f(.5));}
fn rnd(v:f32,k:f32)->f32{return floor(v*k+.5)/k;}
`;

export function chrisLook(data=null) {
 data=data||{};const g=new Graph(data),p=parameters(data,{clipFrames:120,clipStart:0,zoom:.06,faceX:42,faceY:32,warmth:1,vignette:.55,grain:.12,contrast:1.12});
 const zoomIn=choice(p,data,'zoomIn',{true:1,false:0},true),r=p.refs;
 const noise=[];
 for(let seed=1;seed<=7;seed++)noise.push(g.image(`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><filter id="n" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="${seed}" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="1920" height="1080" filter="url(#n)"/></svg>`));
 g.pass(`let local=max(0.0,uniforms.clock.x-${r.clipStart});let t=.5-.5*cos(3.14159265359*sat(local/max(1.0,${r.clipFrames})));
  let z=rnd(1.0+max(0.0,${r.zoom})*select(1.0-t,t,${zoomIn}>.5),10000.0);let origin=vec2f(rnd(${r.faceX},100.0),rnd(${r.faceY},100.0))/100.0;
  let c=straight(source((uv-origin)/z+origin));var rgb=brightness(sepia(saturation(contrast(c.rgb,rnd(${r.contrast},1000.0)),rnd(1.05+.1*${r.warmth},1000.0)),rnd(.18*${r.warmth},1000.0)),.96)*c.a;
  let far=max(origin,1.0-origin)*sqrt(2.0);let distance=length((uv-origin)/far);rgb*=1.0-rnd(.85*${r.vignette},1000.0)*sat((distance-.35)/.65);
  rgb=mix(rgb,softLight(rgb,vec3f(1.0,140.0/255.0,60.0/255.0)),sat(.06*${r.warmth}));
  var n=vec4f(0.0);let index=u32(max(0.0,uniforms.clock.x))%7u;
  ${noise.map((_,i)=>`if(index==${i}u){n=textureSampleLevel(input${i+1},linearSampler,uv,0.0);}`).join('\n')}
  rgb=mix(rgb,overlay(rgb,straight(n).rgb),sat(${r.grain})*n.a);return vec4f(rgb,1.0);`,{...p,inputs:['source',...noise],functions:BLENDS});
 return g.finish();
}

export function chrisBroll(data=null) {
 data=data||{};const g=new Graph(data),p=parameters(data,{clipStart:0,clipFrames:60,zoom:.12,originX:50,originY:45,warmth:.8,vignette:.5,baseBrightness:1,keyStart:-1,keyEnd:-1,keyScale:1,captionY:50,fillWhite:0,fillBlur:10,fillBrightness:1});
 const r=p.refs,zoomIn=choice(p,data,'zoomIn',{true:1,false:0},true),only=choice(p,data,'keywordOnly',{true:1,false:0},false);
 const transforms=`let local=max(0.0,uniforms.clock.x-${r.clipStart});let t=1.0-pow(1.0-sat(local/max(1.0,${r.clipFrames})),2.0);let z=rnd(1.0+max(0.0,${r.zoom})*select(1.0-t,t,${zoomIn}>.5),10000.0);let origin=vec2f(rnd(${r.originX},100.0),rnd(${r.originY},100.0))/100.0;`;
 const filter=`brightness(sepia(saturation(contrast(c.rgb,1.1),1.12),rnd(.14*${r.warmth},1000.0)),rnd(${r.baseBrightness},1000.0))`;
 const base=g.pass(`${transforms}let c=straight(source((uv-origin)/z+origin));return premul(vec4f(${filter},c.a));`,{...p,functions:BLENDS});
 const inverted=g.pass(`let c=straight(source(uv));return premul(vec4f(brightness(1.0-c.rgb,rnd(max(.05,${r.fillBrightness}),1000.0)),c.a));`,{...p,inputs:[base],functions:BLENDS});
 const blurred=gaussian(g,inverted,`max(0.0,${r.fillBlur})*min(uniforms.resolution.x/1080.0,uniforms.resolution.y/1920.0)`,{maxSigma:100,values:p.values,bindings:p.bindings});
 // Static glyph texture; text/font edits are resolved by the host before native
 // installation. Only UV animation and footage filtering run on each frame.
 const bind=(key,fallback)=>data[key]!=null?`__PARAM_${key.toUpperCase()}__`:xml(fallback);
 const textKey=data.text!=null?'text':'keyText';
 const mask=g.image(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><text x="540" y="960" text-anchor="middle" dominant-baseline="central" font-family="${bind('fontFamily','Inter,Helvetica Neue,Arial,sans-serif')}" font-weight="${bind('fontWeight',800)}" font-size="${bind(data.fontSize!=null?'fontSize':'keywordSize',150)}" letter-spacing="${number(data.trackingEm,-.03)}em" fill="white">${bind(textKey,'')}</text></svg>`);
 g.images.find(image=>image.id===mask).fonts=CHRIS_FONTS;
 for(const key of [textKey,'fontFamily','fontWeight',data.fontSize!=null?'fontSize':'keywordSize'])if(data[key]!=null)g.svgParameters.push({image:mask,token:`__PARAM_${key.toUpperCase()}__`,parameter:key});
 g.pass(`let local=max(0.0,uniforms.clock.x-${r.clipStart});var base=textureSampleLevel(input0,linearSampler,uv,0.0);let v=rnd(.8*${r.vignette},1000.0)*sat((length((uv-.5)*sqrt(2.0))-.4)/.6);
  base=vec4f(base.rgb*(1.0-v),1.0);if(${only}>.5){base=vec4f(0.0);}
  if(local<${r.keyStart}||local>=${r.keyEnd}){return base;}
  let glyph=(uv-vec2f(.5,${r.captionY}/100.0))/max(.000001,${r.keyScale})+.5;
  let alpha=textureSampleLevel(input2,linearSampler,glyph,0.0).a*within(glyph,uniforms.resolution.xy);
  let fill=textureSampleLevel(input1,linearSampler,uv,0.0);let white=sat(${r.fillWhite});return over(over(vec4f(vec3f(white),white),fill)*alpha,base);`,{...p,inputs:[base,blurred,mask],functions:BLENDS});
 return g.finish();
}
