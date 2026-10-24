import{Graph,parameters,choice,number,f32,vec,xml,gaussian}from'./graph.mjs';
import{GRADIENTS}from'./summer.mjs';

function backdropSvg(kind,color){
 const base=color||({night:'#151113',red:'#4a0f12',kraft:'#6b5a45',photo:'#151113'}[kind]);
 const grain=kind==='kraft'?.16:kind==='red'?.05:.07,freq=kind==='kraft'?.7:.85,vignette=kind==='red'?.45:kind==='kraft'?.3:.35;
 let folds='';if(kind==='red'){let seed=0x4a0f12;const rnd=()=>{seed=(seed+0x6d2b79f5)>>>0;let t=Math.imul(seed^(seed>>>15),seed|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};let at=0,i=0;while(at<1){const shade=(i++%2?1:-1)*(.5+.5*rnd());folds+=`<stop offset="${at.toFixed(4)}" stop-color="${shade<0?'black':'white'}" stop-opacity="${Math.abs(shade)*(shade<0?.5:.13)}"/>`;at+=.055+.05*rnd();}folds+='<stop offset="1" stop-color="black" stop-opacity=".3"/>';}
 const filters=[['gl',7,`0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 3 0 0 0 -1.5`,freq,2],['gd',11,`0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -3 0 0 0 1.5`,freq,2],['bl',5,`0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -2 0 0 0 1.1`,'.004 .007',3]].map(([id,seed,matrix,f,n])=>`<filter id="${id}" x="0" y="0" width="1440" height="1080" filterUnits="userSpaceOnUse"><feTurbulence type="fractalNoise" baseFrequency="${f}" numOctaves="${n}" seed="${seed}" stitchTiles="stitch"/><feColorMatrix values="${matrix}"/></filter>`).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1080"><defs>${filters}<linearGradient id="folds">${folds}</linearGradient><radialGradient id="v" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="black" stop-opacity="0"/><stop offset="1" stop-color="black" stop-opacity="${vignette}"/></radialGradient></defs><rect width="1440" height="1080" fill="${base}"/>${folds?'<rect width="1440" height="1080" fill="url(#folds)"/>':''}${kind==='kraft'?'<rect width="1440" height="1080" filter="url(#bl)" opacity=".22"/>':''}<rect width="1440" height="1080" filter="url(#gl)" opacity="${grain}"/><rect width="1440" height="1080" filter="url(#gd)" opacity="${grain*1.4}"/><rect width="1440" height="1080" fill="url(#v)"/></svg>`;
}
export function tornPhoto(data=null){
 data=data||{};const g=new Graph(data),p=parameters(data,{seed:0,inset:.92,edge:1.4,look:.6,tilt:0,holdFrames:0,motionStrength:.5});const r=p.refs;
 const motion=choice(p,data,'motion',{off:0,'push-in':1,'pull-out':2,drift:3},'off'),bg=choice(p,data,'backdrop',{night:0,red:1,kraft:2,photo:3},'night');
 const backdrops=['night','red','kraft','photo'].map(kind=>g.image(backdropSvg(kind,data.backdropColor!=null?'__PARAM_BACKDROPCOLOR__':null)));
 if(data.backdropColor!=null)for(const id of backdrops)g.svgParameters.push({image:id,token:'__PARAM_BACKDROPCOLOR__',parameter:'backdropColor'});
 const vis=data.vis||{x:0,y:0,w:100,h:100},box=vec([vis.x,vis.y,vis.w,vis.h].map(x=>x/100));
 const blur=gaussian(g,'source',`.012*uniforms.resolution.x*${f32(vis.w/100)}`,{maxSigma:64});
 let phases=[];for(const side of ['entry','exit']){const list=data.phases?.[side]||[],offset=side==='exit'?`(${r.holdFrames}-${f32(Math.max(0,...list.map(q=>q.end)))})`:'0.0';for(const ph of list)phases.push(`if(phase==0u&&local>=${f32(ph.start)}+${offset}&&local<${f32(ph.end)}+${offset}){phase=${({white:1,over:2,flare:3,glow:4,full:5}[ph.name]||0)}u;progress=(local-${f32(ph.start)}-${offset})/${f32(Math.max(1,ph.end-ph.start-1))};}`);}
 g.pass(`let local=uniforms.clock.x-${data.clock==='source'?f32(number(data.originFrame)):'0.0'};let canvas=${box};let at=(uv-canvas.xy)/canvas.zw;let size=vec2f(1440.0,1080.0);let aa=max(1440.0/(uniforms.resolution.x*canvas.z),1080.0/(uniforms.resolution.y*canvas.w));
 var background=textureSampleLevel(input2,linearSampler,at,0.0);let bg=u32(${bg});if(bg==1u){background=textureSampleLevel(input3,linearSampler,at,0.0);}if(bg==2u){background=textureSampleLevel(input4,linearSampler,at,0.0);}if(bg==3u){background=textureSampleLevel(input5,linearSampler,at,0.0);${data.allowPhotoBackdrop!==false?'let c=straight(textureSampleLevel(input1,linearSampler,uv,0.0));background=over(premul(vec4f(saturation(brightness(contrast(c.rgb,.7),.32),.55),c.a)),background);':''}}
 var slide=0.0;${data.entry==='slide'?`if(${r.holdFrames}>0.0){let progress=local/${r.holdFrames};slide=-1080.0*(1.0-pow(sat((progress-.28)/.48),3.0));background=vec4f(background.rgb*sat((progress-.76)/.18),1.0);}`:''}
 var phase=0u;var progress=0.0;${phases.join('\n')}
 if(phase==5u){return vec4f(1.0)*within(at,canvas.zw*uniforms.resolution.xy);}
 let point=rotate((at-.5)*size-vec2f(0.0,slide),-radians(clamp(${r.tilt},-5.0,5.0)));
 let inset=clamp(select(${r.inset},${r.inset}/100.0,${r.inset}>1.0),.7,.95);let half=size*inset*.5;let edge=clamp(${r.edge},.5,3.0)*14.4;let seed=max(0.0,floor(${r.seed}));
 let angle=atan2(point.y,point.x);let radius=length(point);let ray=point/max(radius,.000001);let base=min(half.x/max(abs(ray.x),.000001),half.y/max(abs(ray.y),.000001));
 let rough=sin(angle*3.0+seed*.73)*6.5+sin(angle*7.0+seed*1.31)*4.5+sin(angle*17.0+seed*.37)*2.7+noise(angle*97.0,seed)*3.0;
 let distance=radius-base-rough;let width=edge*(.9+.16*sin(angle*9.0+seed));let photo=sat(.5-distance/aa);let paper=sat(.5-(distance-width)/aa);
 let shadow=.45*exp(-.5*pow(max(0.0,distance-width-2.88)/8.64,2.0));var result=over(vec4f(0.0,0.0,0.0,shadow),background);
 let flare=select(0.0,1.0-.65*progress,phase==3u);if(phase==4u){let glow=.85*exp(-.5*pow(max(0.0,distance-width)/28.8,2.0));result=over(premul(vec4f(vec3f(220.0,235.0,255.0)/255.0,glow)),result);}if(flare>0.0){let halo=flare*exp(-.5*pow((distance-width)/8.64,2.0));result=over(vec4f(vec3f(halo),halo),result);}
 var color=vec3f(230.0,224.0,212.0)/255.0;if(flare>0.0){color=vec3f(1.0);}var rim=vec3f(178.0,172.0,161.0)/255.0;
 let rimSize=edge*(.2+.07*sin(angle*19.0+seed));if(distance<rimSize*.7){rim=vec3f(147.0,141.0,131.0)/255.0;}if(distance<rimSize*.4){rim=vec3f(118.0,113.0,106.0)/255.0;}
 if(phase!=1u){color=mix(color,rim,sat(.5-(distance-rimSize)/aa)*(1.0-.8*flare));}result=over(premul(vec4f(color,paper)),result);
 let progressMotion=select(0.0,sat(local/max(1.0,${r.holdFrames}-1.0)),${r.holdFrames}>1.0);let e=.5-.5*cos(3.14159265359*progressMotion);let strength=sat(${r.motionStrength});var zoom=1.0;var dx=0.0;
 if(${motion}==1.0){zoom+=.08*strength*e;}if(${motion}==2.0){zoom+=.08*strength*(1.0-e);}if(${motion}==3.0){zoom+=.05*strength;dx=(2.0*e-1.0)*.02*strength;}
 let photoScale=inset+.03;let coord=canvas.xy+canvas.zw*(point/size/(photoScale*zoom)-vec2f(dx,0.0)/zoom+.5);let c=straight(source(coord));let strengthLook=sat(${r.look});let black=.07*strengthLook;let white=1.0-strengthLook/3.0;let k=black+white;
 var rgb=sepia(saturation(brightness(contrast(c.rgb,rnd((white-black)/k,10000.0)),rnd(k,10000.0)),rnd(1.0-.5*strengthLook,1000.0)),rnd(strengthLook/3.0,1000.0));
 if(phase==1u){rgb=vec3f(1.0);}if(phase==2u){rgb=brightness(rgb,rnd(mix(2.2,1.5,progress),1000.0));}if(phase==3u){rgb=brightness(rgb,rnd(mix(2.0,1.35,progress),1000.0));}if(phase==4u){rgb=brightness(rgb,1.8);}
 result=over(premul(vec4f(rgb,c.a))*photo,result);return result*within(at,canvas.zw*uniforms.resolution.xy);`,{...p,inputs:['source',blur,...backdrops],functions:GRADIENTS+`fn noise(x:f32,seed:f32)->f32{let a=floor(x);let t=fract(x);let n=fract(sin(a*127.1+seed*311.7)*43758.5453);let m=fract(sin((a+1.0)*127.1+seed*311.7)*43758.5453);return mix(n,m,t*t*(3.0-2.0*t))*2.0-1.0;}`});return g.finish();
}
