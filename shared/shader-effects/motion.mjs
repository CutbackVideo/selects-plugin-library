import {Graph, parameters, choice, number, f32} from './graph.mjs';

export const MOTIONS = ['off','push-in','pull-out','drift-left','drift-right','drift-up','drift-down','tilt','push-drift'];

export const PHOTO_MOTION = `
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

export function photoMotion(data = null, canvas = {width:1920,height:1080}) {
  data=data||{};
  const g = new Graph(data), p = parameters(data,{strength:1,holdSeconds:1,cover:1});
  const mode = choice(p,data,'motion',Object.fromEntries(MOTIONS.map((m,i)=>[m,i])),'off');
  const dir = data.direction === -1 ? -1 : 1, axis = data.axis === 'y' ? 1 : 0;
  g.pass(`let hold=max(1.0,${p.refs.holdSeconds}*uniforms.clock.y-1.0);
    let m=photoMotion(u32(${mode}),uniforms.clock.x/hold,clamp(${p.refs.strength},0.0,2.0),${f32(dir)},${axis}u,${p.refs.cover},vec2f(${f32(number(canvas.width,1920))},${f32(number(canvas.height,1080))}));
    let xy=floor(m.xy*100000.0+.5)/100000.0;let z=floor(m.z*10000.0+.5)/10000.0;
    let a=floor((m.w/.01745329252)*1000.0+.5)/1000.0*.01745329252;
    let size=uniforms.resolution.xy;
    return source(rotate((uv-.5-xy)*size,-a)/z/size+.5);`,{...p, functions:PHOTO_MOTION});
  return g.finish();
}

export function beatPunch(data = null) {
  data=data||{};
  const g=new Graph(data),p=parameters(data,{strength:1,push:1});
  const starts=(data.punches||[]).map(Number).filter(Number.isFinite);
  const beat=number(data.beatFrames),origin=f32(number(data.sourceStartFrame)),duration=number(data.durationFrames);
  const pieces=starts.map(start=>`{let t=frame-${f32(start)};var e=0.0;
    if(t>=0.0&&t<=rise){let u=t/rise;e=1.0-(1.0-u)*(1.0-u);}
    else if(t>rise&&t<2.0*rise){e=.5+.5*cos(3.14159265359*(t-rise)/rise);}
    extra=max(extra,.06*sat(${p.refs.strength})*e);}`).join('\n');
  g.pass(`var frame=uniforms.clock.x-${origin};if(frame<0.0){frame=uniforms.clock.x;}var extra=0.0;
    ${starts.length && beat>0 ? `let rise=${f32(.25*beat)};${pieces}` : !starts.length && duration>1 ? `extra=.03*sat(${p.refs.push})*sat(${p.refs.strength})*sat(frame/${f32(duration-1)});` : ''}
    let z=floor((1.0+max(0.0,extra))*100000.0+.5)/100000.0;return source((uv-.5)/z+.5);`,p);
  return g.finish();
}

export function letterbox(data = null) {
  data=data||{};
  const g=new Graph(data),p=parameters(data,{revealSeconds:number(data.revealEnd,2.35)-number(data.revealStart,.22)});
  const visible=number(data.visible,1),enabled=choice(p,data,'enabled',{true:1,false:0},true);
  g.pass(`let t=uniforms.clock.z-${f32(number(data.revealStart,.22))};
    let amount=select(1.0,select(sat(t/max(.000001,${p.refs.revealSeconds})),select(0.0,1.0,t>=0.0),${p.refs.revealSeconds}<=0.0),${enabled}>.5);
    let h=amount*${f32(visible)};let mask=sat((h*.5-abs(uv.y-.5))*uniforms.resolution.y+.5);
    return over(source(uv)*mask,vec4f(0.0,0.0,0.0,1.0));`,p);
  return g.finish();
}

export function fadeOut(data = null) {
  data=data||{};
  const g=new Graph(data),p=parameters(data,{fadeSeconds:1});
  g.pass(`let dur=${f32(number(data.durationFrames))};let n=min(dur,${p.refs.fadeSeconds}*uniforms.clock.y);
    let fade=select(0.0,sat((uniforms.clock.x-(dur-n))/max(.000001,n-1.0)),n>0.0&&dur>0.0);
    return over(vec4f(0.0,0.0,0.0,fade),source(uv));`,p);
  return g.finish();
}
