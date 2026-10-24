import {Graph,parameters,choice,f32,number,vec} from './graph.mjs';
import {PHOTO_MOTION,MOTIONS} from './motion.mjs';

export function shotFrame(data) {
  const g=new Graph(data),p=parameters(data,{x:50.73,y:12.69,w:42.6,strength:1,fadeInSeconds:0,fadeOutSeconds:0});
  const modes={none:0,...Object.fromEntries(MOTIONS.map((m,i)=>[m,i]))};
  const mode=choice(p,data,'motion',modes,'none');
  const aspect=number(data.srcAspect,16/9),A=16/9;
  const vis=aspect<A?[0,(1-aspect/A)/2,1,aspect/A]:[(1-A/aspect)/2,0,A/aspect,1];
  const duration=Math.max(1,Math.round(number(data.durationFrames,1))),fps=number(data.fps,30);
  g.pass(`let visible=${vec(vis)};let width=clamp(${p.refs.w},1.0,100.0)/100.0;
    let origin=visible.xy+visible.zw*clamp(vec2f(${p.refs.x},${p.refs.y}),vec2f(0.0),vec2f(100.0))/100.0;
    let win=visible.zw*width;let local=uniforms.clock.x-${f32(number(data.originFrame))};
    let m=photoMotion(u32(${mode}),local/${f32(Math.max(1,duration-1))},clamp(${p.refs.strength},0.0,2.0)*.6,${f32(data.direction===-1?-1:1)},${data.axis==='y'?'1u':'0u'},1.0,vec2f(16.0,9.0));
    let shift=origin+win*.5-.5+m.xy*win;
    let translation=floor(shift*1000000.0+.5)/1000000.0;
    let z=floor((width*max(visible.z,visible.w)*m.z*1.002)*100000.0+.5)/100000.0;
    let a=floor(m.w/.01745329252*1000.0+.5)/1000.0*.01745329252;
    let size=uniforms.resolution.xy;let coord=rotate((uv-.5-translation)*size,-a)/z/size+.5;
    let at=(uv-origin)/win;let mask=within(at,win*size);
    var opacity=1.0;let fin=max(0.0,${p.refs.fadeInSeconds})*${f32(fps)};let fout=max(0.0,${p.refs.fadeOutSeconds})*${f32(fps)};
    if(fin>0.0){opacity=min(opacity,local/fin);}if(fout>0.0){opacity=min(opacity,(${f32(duration-1)}-local)/fout);}
    return over(source(coord)*mask*sat(opacity),vec4f(0.0,0.0,0.0,1.0));`,{...p,functions:PHOTO_MOTION});
  return g.finish();
}
