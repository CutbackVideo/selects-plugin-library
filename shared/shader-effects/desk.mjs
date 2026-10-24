import {Graph,parameters,number,xml,f32,vec} from './graph.mjs';
const rand=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const W=1920,H=1080,SX=700,SY=120,SW=600,SH=338;
const DECK=[[SX-6,SY+SH+40],[SX+SW+6,SY+SH+40],[SX+SW+120,1010],[SX-190,1010]],TABLE=[[-260,450],[2180,450],[2900,1180],[-980,1180]];
function on(poly,u,v){return [0,1].map(i=>(poly[0][i]+(poly[1][i]-poly[0][i])*u)*(1-v)+(poly[3][i]+(poly[2][i]-poly[3][i])*u)*v);}
function quad(poly,u0,v0,u1,v1){return 'M'+[[u0,v0],[u1,v0],[u1,v1],[u0,v1]].map(([u,v])=>on(poly,u,v).map(n=>n.toFixed(1)).join(' ')).join(' L')+' Z';}
export function desk(data=null){
 data=data||{};const g=new Graph(data),p=parameters(data,{holdFrames:60,beatFrames:12});
 const color=(key,value)=>data[key]!=null?`__PARAM_${key.toUpperCase()}__`:xml(value);
 const paper=color('paper','#fbf8ee'),check=color('check','#e58497'),body=color('laptop','#cfcfd1'),ink=color('ink','#262626');
 const cells=[];for(let j=0;j<7;j++)for(let i=0;i<16;i++)if((i+j)%2===0)cells.push(`<path d="${quad(TABLE,i/16,(j/7)**1.45,(i+1)/16,((j+1)/7)**1.45)}"/>`);
 const keys=[];[[11,.08,.2],[11,.24,.36],[10,.4,.52]].forEach(([n,v0,v1],row)=>{for(let k=0;k<n;k++){const u0=.07+k/n*.86+(row===2?.03:0),u1=u0+.86/n-.012,c=on(DECK,(u0+u1)/2,(v0+v1)/2),s=rand(row*31+k);keys.push(`<path d="${quad(DECK,u0,v0,u1,v1)}"/><path d="M${c[0]-12} ${c[1]+4} q ${6+s*8} ${-14-s*6} ${14+s*6} ${-4+s*6} t ${8-s*4} ${6+s*4}" stroke-width="2.5"/>`);}});
 const svg=content=>`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">${content}</svg>`;
 const ground=g.image(svg(`<defs><filter id="light" color-interpolation-filters="sRGB"><feColorMatrix values=".22 0 0 0 .78 0 .22 0 0 .78 0 0 .22 0 .78 0 0 0 1 0"/></filter></defs><rect width="1920" height="1080" fill="${paper}"/><path d="${quad(TABLE,0,0,1,1)}" fill="${check}" filter="url(#light)"/>`));
 const table=g.image(svg(`<defs><filter id="light" color-interpolation-filters="sRGB"><feColorMatrix values=".88 0 0 0 .12 0 .88 0 0 .12 0 0 .88 0 .12 0 0 0 1 0"/></filter></defs><g fill="${check}" filter="url(#light)">${cells.join('')}</g>`));
 const laptop=g.image(svg(`<g stroke="${ink}" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M-260 450 L2180 450" stroke-width="4"/><path d="M${DECK.map(p=>p.join(' ')).join(' L')}Z" fill="${body}" stroke-width="5"/><g stroke-width="3" opacity=".75">${keys.join('')}</g><path d="${quad(DECK,.24,.57,.76,.64)}" stroke-width="3" opacity=".75"/><path d="${quad(DECK,.36,.7,.64,.95)}" stroke-width="3.5" opacity=".75"/><rect x="674" y="94" width="652" height="398" rx="22" fill="${body}" stroke-width="5"/><rect x="700" y="120" width="600" height="338" stroke-width="7.68" fill="black"/></g>`));
 for(const image of g.images)for(const key of ['paper','check','laptop','ink'])if(data[key]!=null&&image.svg.includes(`__PARAM_${key.toUpperCase()}__`))g.svgParameters.push({image:image.id,token:`__PARAM_${key.toUpperCase()}__`,parameter:key});
 const nudges=Array.from({length:4},(_,step)=>[step?(rand(step*7.3)-.5)*.04:0,step?(rand(step*3.1)-.5)*.03:0]);
 g.pass(`let step=select(0u,min(3u,1u+u32(max(0.0,floor((uniforms.clock.x-${p.refs.holdFrames})/max(.000001,${p.refs.beatFrames}))))),uniforms.clock.x>=${p.refs.holdFrames});
 let steps=array<f32,4>(0.0,.34,.66,.9);let angles=array<f32,4>(0.0,-1.8,1.3,-.6);let nudges=array<vec2f,4>(${nudges.map(vec).join(',')});let q=steps[step];let origin=vec2f(1000.0/1920.0,289.0/1080.0);let size=vec2f(1920.0,1080.0);let shift=(.5-origin)*q+nudges[step];
 let coord=rotate((uv-origin-shift)*size,-radians(angles[step]))/size/(1.0+2.2*q)+origin;let tick=floor(uniforms.clock.x/3.0)+f32(step)*17.0;
 var result=textureSampleLevel(input1,linearSampler,coord,0.0);
 let tableUv=coord+(vec2f(noise(coord*size*.05,tick+5.0),noise(coord*size*.05,tick+137.0))-.5)*9.0/size;
 let laptopUv=coord+(vec2f(noise(coord*size*.018,tick),noise(coord*size*.018,tick+132.0))-.5)*7.0/size;
 result=over(textureSampleLevel(input2,linearSampler,tableUv,0.0)*within(tableUv,uniforms.resolution.xy),result);
 result=over(textureSampleLevel(input3,linearSampler,laptopUv,0.0)*within(laptopUv,uniforms.resolution.xy),result);
 let window=(coord*size-vec2f(700.0,120.0))/vec2f(600.0,338.0);return over(over(source(window),vec4f(0.0,0.0,0.0,1.0))*within(window,vec2f(600.0,338.0)*uniforms.resolution.xy/size),result);`,{...p,inputs:['source',ground,table,laptop],functions:`fn hash(p:vec2f,seed:f32)->f32{return fract(sin(dot(p,vec2f(127.1,311.7))+seed*74.7)*43758.5453);}
 fn noise(p:vec2f,seed:f32)->f32{let i=floor(p);let f=fract(p);let u=f*f*(3.0-2.0*f);let a=mix(hash(i,seed),hash(i+vec2f(1.0,0.0),seed),u.x);let b=mix(hash(i+vec2f(0.0,1.0),seed),hash(i+1.0,seed),u.x);return mix(a,b,u.y);}`});
 return g.finish();
}
