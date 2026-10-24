import {Graph,parameters,choice,f32,number} from './graph.mjs';

export function selfie(data=null) {
 data=data||{};
 const g=new Graph(data),p=parameters(data,{whip:1,whipIn:1,whipOut:1,angle:30,angleIn:number(data.angle,30),angleOut:number(data.angle,30),cover:1,lookStrength:data.look==='soft-glow'||data.look==null?.5:.35});
 const look=choice(p,data,'look',{'soft-glow':1,'night-glam':2,clean:3,none:0},'soft-glow');
 const framing=choice(p,data,'framing',{full:0,punch:1,tight:2},'full');
 const ki=choice(p,data,'kindIn',{none:0,dir:1,spin:2},'none'),ko=choice(p,data,'kindOut',{none:0,dir:1,spin:2},'none');
 const r=p.refs;
 const fn=`
 fn rounded(v:f32,k:f32)->f32{return floor(v*k+.5)/k;}
 fn toLinear(c:vec3f)->vec3f{return select(c/12.92,pow((c+.055)/1.055,vec3f(2.4)),c>vec3f(.04045));}
 fn toSrgb(c:vec3f)->vec3f{return select(c*12.92,1.055*pow(max(c,vec3f(0.0)),vec3f(1.0/2.4))-.055,c>vec3f(.0031308));}
 struct Pose { amount:f32, angle:f32, xy:vec2f, rotation:f32, scale:f32 };
 fn pose()->Pose {
  var out=Pose(0.0,0.0,vec2f(0.0),0.0,1.0);
  let f=floor(uniforms.clock.x);let dur=floor(uniforms.clock.w);let fps=uniforms.clock.y;
  if(dur<=0.0||f<0.0||f>=dur){return out;}
  let global=clamp(${r.whip},0.0,1.5);let a=select(0.0,clamp(${r.whipIn},0.0,1.5)*global,${ki}>0.0);let b=select(0.0,clamp(${r.whipOut},0.0,1.5)*global,${ko}>0.0);
  let w=max(1.0,round(.067*fps));var wi=select(0.0,w,a>0.0);var wo=select(0.0,w,b>0.0);
  if(wi+wo>dur){if(wi>0.0&&wo>0.0){if(dur>=2.0){wi=floor(dur/2.0);wo=wi;}else{wi=select(1.0,0.0,b>=a);wo=1.0-wi;}}else{wi=min(wi,dur);wo=min(wo,dur);}}
  var dir=0.0;var dist=0.0;var strength=0.0;var kind=0.0;var deg=0.0;
  if(f<wi){dir=-1.0;dist=f;strength=a;kind=${ki};deg=${r.angleIn};}else if(f>=dur-wo){dir=1.0;dist=dur-1.0-f;strength=b;kind=${ko};deg=${r.angleOut};}else{return out;}
  let e=select(.07,1.0,(dist+.5)/fps<=.04+0.000000001)*strength;if(e<=0.0){return out;}
  deg=clamp(deg,-180.0,180.0);let angle=radians(deg);let size=uniforms.resolution.xy;let c=cos(angle);let s=sin(angle);let cover=max(1.0,${r.cover});
  let delta=dir*.06*size.x*e*vec2f(c,s)/cover;let rotation=select(0.0,dir*select(1.0,-1.0,deg<0.0)*8.0*e,kind==2.0);
  let sigma=.035*e*size.x;let fringe=2.0*sigma*vec2f(abs(c)+.08*abs(s),abs(s)+.08*abs(c));let half=max(vec2f(1.0),size*.5-fringe);var need=1.0;
  for(var i=0u;i<4u;i++){let corner=vec2f(select(-.5,.5,(i&1u)!=0u),select(-.5,.5,(i&2u)!=0u))*size;let q=abs(rotate(corner-delta,-radians(rotation)))/half;need=max(need,max(q.x,q.y));}
  out.amount=e;out.angle=angle;out.xy=delta/size;out.rotation=radians(rotation);out.scale=max(1.0+select(.08,.12,kind==2.0)*e,need*1.002);return out;
 }
 `;
 const grade=g.pass(`let c=straight(source(uv));let t=sat(${r.lookStrength});let look=u32(${look});var rgb=c.rgb;
  var coeff=vec4f(0.0,1.0,0.0,1.0);var light=1.0;
  if(look==1u){coeff=vec4f(1.0,2.2,-20.0,.95);light=.82;}else if(look==2u){coeff=vec4f(.35,1.15,-48.0,1.12);light=.92;}else if(look==3u){coeff=vec4f(.15,1.04,0.0,.98);}
  rgb=brightness(contrast(hue(saturation(sepia(rgb,rounded(min(1.0,coeff.x*t),1000.0)),rounded(mix(1.0,coeff.y,t),1000.0)),radians(rounded(coeff.z*t,100.0))),rounded(mix(1.0,coeff.w,t),1000.0)),rounded(mix(1.0,light,t),1000.0));
  var result=premul(vec4f(rgb,c.a));
  if(look==1u){let a=rounded(.03*t,10000.0);let overlay=vec3f(1.0,122.0/255.0,154.0/255.0);result=vec4f(mix(result.rgb,max(rgb,overlay)*c.a+overlay*(1.0-c.a),a),c.a+a*(1.0-c.a));
   let radius=length((uv-.5)*sqrt(2.0));let v=.5*t*select(.4*sat((radius-.6)/.125),.4+.6*sat((radius-.725)/.125),radius>.725);result=over(vec4f(0.0,0.0,0.0,v),result);
  }else if(look==2u){let a=rounded(.05*t,10000.0);let overlay=vec3f(1.0,79.0/255.0,163.0/255.0);result=vec4f(result.rgb+(1.0-result.rgb)*overlay*a,result.a+a*(1.0-result.a));}
  return premul(vec4f(toLinear(straight(result).rgb),result.a));`,{...p,functions:fn});
 // Fixed 121 taps cover three deviations. Step scales with sigma, preserving the
 // directional blur in box-relative coordinates at every render resolution.
 let input=grade;
 for(const across of [false,true]) input=g.pass(`let m=pose();let sigma=.035*m.amount*uniforms.resolution.x*${across?'.08':'1.0'};if(sigma<.01){return source(uv);}
  let direction=vec2f(cos(m.angle+${across?'1.57079632679':'0.0'}),sin(m.angle+${across?'1.57079632679':'0.0'}));
  let step=max(1.0,sigma/20.0);var sum=vec4f(0.0);var total=0.0;
  for(var i=-60;i<=60;i++){let d=f32(i)*step;if(abs(d)<=ceil(3.0*sigma)){let weight=exp(-.5*d*d/(sigma*sigma));sum+=source(uv+direction*d/uniforms.resolution.xy)*weight;total+=weight;}}
  return sum/max(total,.000001);`,{...p,inputs:[input],functions:fn});
 g.pass(`let m=pose();let mode=u32(${framing});let fs=select(select(1.0,1.12,mode==1u),1.14,mode==2u);let dy=select(select(0.0,.04,mode==1u),.0168,mode==2u)/max(1.0,${r.cover});
  let xy=vec2f(rounded(m.xy.x*100.0,1000.0),rounded((m.xy.y+dy)*100.0,1000.0))/100.0;let scale=rounded(fs*m.scale,10000.0);
  let coord=rotate((uv-.5-xy)*uniforms.resolution.xy,-m.rotation)/uniforms.resolution.xy/scale+.5;
  let c=straight(source(coord));return premul(vec4f(toSrgb(c.rgb),c.a));`,{...p,inputs:[input],functions:fn});
 return g.finish();
}
