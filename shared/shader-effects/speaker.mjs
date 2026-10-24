import {Graph,number,f32,vec,cssColor} from './graph.mjs';

export function a16zLook(data = null) {
  data=data||{};
  const g=new Graph(data),W=number(data.W,1080),H=number(data.H,1920),sw=number(data.sw,1920),sh=number(data.sh,1080);
  const start=number(data.start),shots=data.shots||[];
  const fallback=shots.at(-1)||{x:0,y:(H-W*sh/sw)/2,w:W,h:W*sh/sw};
  const windows=(data.windows||[]).map(win=>`if(f>=${f32(win.from)}&&f<${f32(win.to)}){
    let progress=sat((f-${f32(win.from)})/${f32(Math.max(1,win.to-win.from))});let w=.78*${f32(W)}*(1.0-.04*progress);let h=w*${f32(sh/sw)};
    let at=(uv*size-vec2f((${f32(W)}-w)*.5,.54*${f32(H)}-h*.5))/vec2f(w,h);
    return over(source(at)*within(at,vec2f(w,h)),vec4f(vec3f(244.0,245.0,247.0)/255.0,1.0));
  }`).join('\n');
  const find=shots.map((s,i)=>`${i?'else ':''}if(f>=${f32(s.from)}&&f<${f32(s.to)}){shot=${vec([s.x,s.y,s.w,s.h])};first=${i===0?'true':'false'};}`).join('\n');
  let move='';
  if(data.push&&data.end>start)move=`z=floor((1.0+${f32(data.push)}*sat((f-${f32(start)})/${f32(data.end-start)}))*10000.0+.5)/10000.0;`;
  else if(data.open&&shots.length)move=`if(first){let k=max(0.0,(f-${f32(number(shots[0].from))})*${f32(24/number(data.fps,24))});
    let candidate=1.0+${f32(data.open.s0-1)}*pow(.68,k);if(candidate>1.0005){z=floor(candidate*10000.0+.5)/10000.0;origin=${vec([data.open.ax,data.open.ay])};}}`;
  g.pass(`let size=${vec([W,H])};let f=uniforms.clock.x+${f32(start)};${windows}
    var shot=${vec([fallback.x,fallback.y,fallback.w,fallback.h])};var first=false;${find}
    var z=1.0;var origin=size*.5;${move}
    let at=(uv*size-origin)/z+origin;let coord=(at-shot.xy)/shot.zw;
    let c=straight(source(coord));return over(premul(vec4f(${cssColor('c.rgb',data.grade)},c.a)),vec4f(0.0,0.0,0.0,1.0));`);
  return g.finish();
}
