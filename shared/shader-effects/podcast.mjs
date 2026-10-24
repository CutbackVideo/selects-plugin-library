import{Graph,f32,number,vec,gaussian}from'./graph.mjs';
import{podcastGrid}from'./podcast-grid.mjs';
const EASE=`fn tween(p:f32,kind:u32)->vec2f{let t=sat(p);if(kind==1u){return vec2f(t,1.0);}if(kind==2u){return vec2f(1.0-pow(1.0-t,3.0),3.0*pow(1.0-t,2.0));}if(kind==3u){return vec2f(t*t*t,3.0*t*t);}if(kind==4u){return select(vec2f(1.0-pow(-2.0*t+2.0,5.0)*.5,80.0*pow(1.0-t,4.0)),vec2f(16.0*pow(t,5.0),80.0*pow(t,4.0)),t<.5);}return select(vec2f(1.0-pow(-2.0*t+2.0,3.0)*.5,12.0*pow(1.0-t,2.0)),vec2f(4.0*t*t*t,12.0*t*t),t<.5);}`;
const mode=e=>({lin:1,o:2,i:3,whip:4}[e]||0);
function camera(keys){return `struct Camera{position:vec3f,velocity:vec3f};fn camera(f:f32)->Camera{var p=vec3f(1.0,0.0,0.0);var v=vec3f(0.0);${(keys||[]).map(k=>`if(f>=${f32(k.at)}){let d=${f32(Math.max(0,k.d))};let progress=select(1.0,sat((f-${f32(k.at)})/max(.000001,d)),d>0.0);let e=tween(progress,${mode(k.e)}u);let destination=${vec([k.z,k.x,k.y])};v=select(vec3f(0.0),(destination-p)*e.y/max(.000001,d),d>0.0&&progress<1.0);p=mix(p,destination,e.x);}`).join('')}return Camera(p,v);}`;}
function scalar(keys,name='gridZoom'){if(!keys?.length)return `fn ${name}(f:f32)->f32{return 1.0;}`;return `fn ${name}(f:f32)->f32{if(f<=${f32(keys[0][0])}){return ${f32(keys[0][1])};}${keys.slice(1).map((k,i)=>`if(f<=${f32(k[0])}){return mix(${f32(keys[i][1])},${f32(k[1])},tween((f-${f32(keys[i][0])})/${f32(Math.max(.000001,k[0]-keys[i][0]))},${mode(k[2])}u).x);}`).join('')}return ${f32(keys.at(-1)[1])};}`;}
function gradeCode(grade){const l=[.2126,.7152,.0722],s=number(grade.sat,1),gain=[grade.r,grade.g,grade.b];const rows=l.map((_,i)=>l.map((v,j)=>Number(((v*(1-s)+(i===j?s:0))*number(gain[i],1)).toFixed(4))));return `clamp(clamp(vec3f(dot(c.rgb,${vec(rows[0])}),dot(c.rgb,${vec(rows[1])}),dot(c.rgb,${vec(rows[2])})),vec3f(0.0),vec3f(1.0))*${f32(number(grade.slope,1))}+${f32(number(grade.off))},vec3f(0.0),vec3f(1.0))`;}

export function podcastLook(data=null){
 data=data||{};const g=new Graph(data),W=number(data.W,1080),H=number(data.H,1920),sw=number(data.sw,1920),sh=number(data.sh,1080),fps=number(data.fps,30),start=number(data.start),card=data.mode==='card';
 const grade=data.grade||(card?{sat:1.2,r:1.06,g:1,b:.9,slope:1.08,off:-.02}:{sat:1.6,r:1.07,g:1,b:.89,slope:1.1,off:-.035});
 if(!card){
  const shots=data.shots||[],fallback=shots.at(-1)||{x:0,y:(H-W*sh/sw)/2,w:W,h:W*sh/sw};
  const funcs=EASE+camera(data.camera)+`fn free(f:f32)->bool{return ${(data.free||[]).map(r=>`(f>=${f32(r[0])}&&f<${f32(r[1])})`).join('||')||'false'};}`;
  const frame=g.pass(`let f=uniforms.clock.x+${f32(start)};let point=uv*${vec([W,H])};var shot=${vec([fallback.x,fallback.y,fallback.w,fallback.h])};${shots.map(s=>`if(f>=${f32(s.from)}&&f<${f32(s.to)}){shot=${vec([s.x,s.y,s.w,s.h])};}`).join('')}
   let c=straight(source((point-shot.xy)/shot.zw));return premul(vec4f(${gradeCode(grade)},c.a));`);
  let blurred=frame;
  for(const axis of [0,1])blurred=g.pass(`let f=uniforms.clock.x+${f32(start)};let cam=camera(f);let v=abs(cam.velocity[${axis+1}]/100.0*${f32(axis?H:W)});var sigma=min(12.0,.06*max(0.0,v-${axis?'60.0':'30.0'}));if(sigma<.6||free(f)){sigma=0.0;}sigma=round(sigma*100.0)/100.0*uniforms.resolution[${axis}]/${f32(axis?H:W)};if(sigma<.01){return source(uv);}let step=max(1.0,sigma/20.0);var sum=vec4f(0.0);var weight=0.0;for(var i=-60;i<=60;i++){let d=f32(i)*step;let w=exp(-.5*d*d/(sigma*sigma));let c=straight(source(uv+${axis?'vec2f(0.0,d)':'vec2f(d,0.0)'}/uniforms.resolution.xy));sum+=premul(vec4f(toLinear(c.rgb),c.a))*w;weight+=w;}let c=straight(sum/weight);return premul(vec4f(toSrgb(c.rgb),c.a));`,{inputs:[blurred],functions:funcs+`fn toLinear(c:vec3f)->vec3f{return select(c/12.92,pow((c+.055)/1.055,vec3f(2.4)),c>vec3f(.04045));}fn toSrgb(c:vec3f)->vec3f{return select(c*12.92,1.055*pow(max(c,vec3f(0.0)),vec3f(1.0/2.4))-.055,c>vec3f(.0031308));}`});
  g.pass(`let f=uniforms.clock.x+${f32(start)};let size=${vec([W,H])};var shot=${vec([fallback.x,fallback.y,fallback.w,fallback.h])};${shots.map(s=>`if(f>=${f32(s.from)}&&f<${f32(s.to)}){shot=${vec([s.x,s.y,s.w,s.h])};}`).join('')}
   var cam=camera(f).position;if(!free(f)){cam.x=max(cam.x,max(size.x/shot.z,size.y/shot.w));let low=size*.5-cam.x*(shot.xy+shot.zw-size*.5);let high=-size*.5-cam.x*(shot.xy-size*.5);let translation=min(high,max(low,cam.yz/100.0*size));cam=vec3f(cam.x,translation/size*100.0);}
   let translation=round(cam.yz/100.0*size*100.0)/100.0;let zoom=round(cam.x*100000.0)/100000.0;let coord=((uv-.5)*size-translation)/zoom/size+.5;return over(source(coord),vec4f(0.0,0.0,0.0,1.0));`,{inputs:[blurred],functions:funcs});return g.finish();
 }
 const dur=Math.max(1,number(data.dur,60)),kind=data.kind||'portrait',grid=podcastGrid(g,W,H,sw,sh),size=vec([W,H]);
 let cardBody='';
 if(kind==='landscape'){
  const ch=.33*H,cw=ch*Math.max(1.2,sw/sh>1?sw/sh:16/9),cy=.37*H;
  cardBody=`let point=rotate((uv*size-vec2f(size.x*.5,${f32(cy)})),radians(3.0))+vec2f(size.x*.5,${f32(cy)});let drift=-.12*size.x+.3*size.x*min(1.0,t/${f32(dur)});let wh=${vec([cw,ch])};var result=vec4f(0.0);
   ${[0,...(data.strip!==false?[1]:[])].map(i=>`{let at=point-vec2f((size.x-wh.x)*.5+drift-${f32(i*(cw+.028*W))},${f32(cy-ch/2)});result=over(drawCard(at,wh,t),result);}`).join('')}return result;`;
 }else{
  const cw=.7*W,ch=cw*16/9;
  cardBody=`let wh=${vec([cw,ch])};let sway=round(1.1*sin(6.28318530718*t/${f32(2.8*fps)})*1000.0)/1000.0;let bob=.004*size.y*sin(6.28318530718*t/${f32(3.4*fps)});let dx=${kind==='portrait2'?`-.3*size.x*(1.0-outCubic(t/${f32(Math.max(1,Math.round(5*fps/30)))}))`:'0.0'};let zoom=${kind==='portrait2'?'1.0':`1.3-.3*outCubic(t/${f32(Math.max(1,Math.round(9*fps/30)))})`};let origin=vec2f((size.x-wh.x)*.5+dx,.075*size.y+bob)+wh*vec2f(.5,.4);let at=rotate(uv*size-origin,-radians(sway))/(round(zoom*10000.0)/10000.0)+wh*vec2f(.5,.4);return drawCard(at,wh,t);`;
 }
 const picture=g.pass(`let size=${size};let t=uniforms.clock.x;${cardBody}`,{functions:`fn drawCard(at:vec2f,wh:vec2f,t:f32)->vec4f{let fitted=${vec([sw,sh])}*max(wh.x/${f32(sw)},wh.y/${f32(sh)});let push=round((1.0+.08*min(1.0,t/${f32(dur)}))*10000.0)/10000.0;let c=straight(source((at-wh*.5)/fitted/push+.5));return premul(vec4f(${gradeCode(grade)},c.a))*roundRect(at,wh,.035*wh.x);}`});
 const shadow=gaussian(g,picture,`.025*uniforms.resolution.y`,{maxSigma:64});
 const functions=EASE+scalar(data.gridZoom)+grid.functions;
 g.pass(`let f=uniforms.clock.x+${f32(start)};let z=gridZoom(f);let b=z-gridZoom(f-1.0);let a=gridZoom(f+1.0)-z;var velocity=(a+b)*.5;if(abs(b)>.45){velocity=a;}if(abs(a)>.45){velocity=b;}if(abs(a)>.45&&abs(b)>.45){velocity=0.0;}
  let bg=grid(uv*${size},z,velocity,f,${f32(fps)});let shadow=textureSampleLevel(input2,linearSampler,uv-vec2f(0.0,.02),0.0).a*.55;let backdrop=vec4f(bg*(1.0-shadow),1.0);return over(source(uv),backdrop);`,{inputs:[picture,grid.atlas,shadow],functions});return g.finish();
}
