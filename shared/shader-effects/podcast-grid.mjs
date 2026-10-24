import{dustLoop}from'./podcast-dust.mjs';
import{f32,vec,xml}from'./graph.mjs';
function table(name,values){return `fn ${name}(v:f32)->f32{${values.slice(1).map(([x,y],i)=>`if(v<=${f32(x)}){return mix(${f32(values[i][1])},${f32(y)},sat((v-${f32(values[i][0])})/${f32(x-values[i][0])}));}`).join('')}return ${f32(values.at(-1)[1])};}`;}
export function podcastGrid(g,W,H,sourceWidth,sourceHeight){
 const marks=dustLoop(),assets=[],cells=[];let count=0;
 const sprites=new Map();
 for(const speck of marks)for(const m of speck.marks)if(m.kind===1||m.kind===3){const key=JSON.stringify([m.d,m.s,m.kind]);if(!sprites.has(key)){const i=count++,x=i%8*128,y=Math.floor(i/8)*128;const content=m.kind===1?`<g fill="none" stroke="white" stroke-linecap="round" stroke-linejoin="round"><path d="${xml(m.d)}" stroke-width="${9/m.s}" opacity=".22"/><path d="${xml(m.d)}" stroke-width="${6/m.s}"/></g>`:`<defs><filter id="f${i}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${1.5/m.s}"/></filter></defs><path d="${xml(m.d)}" fill="white" filter="url(#f${i})"/>`;cells.push(`<svg x="${x}" y="${y}" width="128" height="128" viewBox="-.65 -.65 1.3 1.3">${content}</svg>`);sprites.set(key,i);}}
 const height=Math.max(128,Math.ceil(count/8)*128),atlas=g.image(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="${height}">${cells.join('')}</svg>`,{width:1024,height});
 const dust=marks.map((sp,id)=>{const branches=sp.marks.map((m,age)=>{
  const sprite=sprites.get(JSON.stringify([m.d,m.s,m.kind]));
  const shape=m.kind===0?`let rr=${f32(m.s/2.355*2.6*W/1080)};var a=dustDot(length(delta)/rr);${m.twin?`a=1.0-(1.0-a)*(1.0-.8*dustDot(length(delta-vec2f(cos(angle),sin(angle))*${f32(10*W/1080)})/(rr*.85)));`:''}`:
   m.kind===2?`let size=${f32(m.s*W/1080)};let at=rotate(delta,-angle)/size;var a=dustSmudge(length(at)/.42);a=1.0-(1.0-a)*(1.0-dustSmudge(length(at-vec2f(.3*sx,.12))/.3));a=1.0-(1.0-a)*(1.0-dustSmudge(length(at-vec2f(-.22*sx,-.2))/.26));`:
   `let at=rotate(delta,-angle)/${f32(m.s*W/1080)}*vec2f(sx,1.0)/1.3+.5;let tile=(${vec([sprite%8*128,Math.floor(sprite/8)*128])}+at*128.0)/vec2f(1024.0,${f32(height)});let a=textureSampleLevel(input1,linearSampler,tile,0.0).a*within(at,vec2f(128.0));`;
  return `if(age==${age}u){var pos=${vec([m.x,m.y])};let cycle=floor((df-f32(age))/28.0);let flip=${sp.keep?'false':'i32(cycle)%2!=0'};let sx=select(1.0,-1.0,flip);
   ${sp.keep?'':`if(cycle!=0.0){pos.x=fract(select(pos.x,1.0-pos.x,flip)+fract(cycle*.618034));pos.y=fract(pos.y+fract(cycle*.754878));let h=fract(sin(${f32(id)}*12.9898+cycle*78.233)*43758.5453);let density=select(select(select(0.0,.1,pos.y<.85),.4,pos.y<.8),1.0,pos.y<.6);if(h>=density){return 0.0;}}`}
   let angle=radians(select(${f32(m.rot)},${f32(180-m.rot)},flip));let delta=point-pos*size;${shape}return a*${f32(Math.min(1,m.a/217))};}`;
 }).join('');return `fn speck${id}(point:vec2f,df:f32)->f32{let size=vec2f(${f32(W)},${f32(H)});let age=u32(((i32(df)%28)-${sp.birth}+28)%28);${branches}return 0.0;}`;}).join('\n');
 const funcs=table('dustDot',[[0,1],[.1,.981],[.2,.857],[.28,.655],[.36,.407],[.44,.193],[.52,.066],[.6,.016],[.7,.001],[1,0]])+table('dustSmudge',[[0,1],[.4,.75],[.75,.3],[1,0]])+dust;
 const shade=[[.5,1],[.52,.985],[.56,.978],[.58,.962],[.6,.935],[.62,.875],[.64,.8],[.66,.745],[.68,.715],[.7,.655],[.72,.625],[.74,.6],[.76,.545],[.78,.515],[.8,.49],[.82,.44],[.84,.405],[.86,.37],[.88,.3],[.9,.27],[.92,.235],[.94,.18],[.96,.14],[.98,.11],[1,.075]];
 const vars=Array.from({length:1001},(_,i)=>{let x=Math.sin((i-500)*12.9898+78.233)*43758.5453;return 1+.18*(x-Math.floor(x)-.5);});
 const raster=Math.max(0,Math.min(1,(Math.min(sourceWidth/W,sourceHeight/H)-.22)/.1)),amp=7.3*raster*raster*(3-2*raster);
 return {atlas,functions:funcs+table('shade',shade)+table('texFade',[[.6,1],[.655,.8],[.71,.38],[.77,.38],[.85,.55],[1,.55]])+table('tealAlpha',[[0,.9],[.3,.8],[.52,.52],[.7,.25],[.85,.07],[1,0]])+`
 fn lineWidth(index:i32)->f32{let values=array<f32,1001>(${vars.map(f32).join(',')});return values[u32(clamp(index+500,0,1000))];}
 fn grid(point:vec2f,z:f32,velocity:f32,frame:f32,fps:f32)->vec3f{
 let size=vec2f(${f32(W)},${f32(H)});let pivot=size*vec2f(.4996,.4984);let pitch=${f32(.10152*W)};let origin=size*vec2f(.50167,.5125);let width=${f32(5.5*W/1080)};
 let smear=abs(velocity)>.015;let n=select(1u,u32(clamp(ceil(.5*abs(velocity)*.5*max(size.x,size.y)/width)+1.0,5.0,32.0)),smear);var lines=vec4f(0.0);var dustSum=vec4f(0.0);
 for(var i=0u;i<n;i++){let zoom=max(.05,z+select(0.0,(f32(i)/max(1.0,f32(n)-1.0)-.5)*.5*velocity,smear));let p=(point-pivot)/zoom+pivot;let cell=round((p-origin)/pitch);let distance=abs(p-origin-cell*pitch);let coverage=1.0-(1.0-sat((width*lineWidth(i32(cell.x))*.5-distance.x)*zoom+.5))*(1.0-sat((width*lineWidth(i32(cell.y)+101)*.5-distance.y)*zoom+.5));
 let uv=p/size;let teal=tealAlpha(length((uv-vec2f(0.0,.2))/vec2f(1.0,.45)));let pink=.6*(1.0-sat(length((uv-vec2f(1.0,.42))/vec2f(.3,.2))));let color=mix(mix(vec3f(130.5,127.5,131.0),vec3f(92.0,140.0,134.0),teal),vec3f(132.0,112.0,122.0),pink)-${f32(amp*2)};
 let gain=select(1.0,1.0+.8*ease((abs(velocity)-.08)/.07),smear);lines+=vec4f(color/255.0*coverage,coverage)*gain/f32(n);
 let df=floor(frame*20.0/fps+.000001);var dust=0.0;${marks.map((_,i)=>`dust=1.0-(1.0-dust)*(1.0-speck${i}(p,df));`).join('')}dustSum+=vec4f(vec3f(dust),dust)/f32(n);}
 let uv=point/size;var bg=(vec3f(36.8,36.6,38.2)-${f32(amp*2)})/255.0;
 bg*=1.0-.13*(1.0-sat(length((uv-vec2f(1.0,0.0))/vec2f(.45,.22))));bg=mix(bg,vec3f(1.0),.008*(1.0-sat(length(uv/vec2f(.4,.12)))));bg=mix(bg,vec3f(1.0),.009*(1.0-sat(uv.y/.14)));
 if(smear){let a=sat(lines.a);lines=vec4f(min(straight(lines).rgb,vec3f(.45))*a,a);}var result=over(lines,vec4f(bg,1.0));
 let period=${f32(.011287*W)};let px=point.x-${f32(.48*W/1080)};let py=point.y-(${f32(-.51*W/1080)});
 let dots=${f32(amp)}*(2.0+cos(6.28318530718*(px+py)/period)+cos(6.28318530718*(px-py)/period));let fade=texFade(uv.y);result=vec4f(result.rgb+vec3f((dots*fade+${f32(amp*2)}*(1.0-fade))/255.0),result.a);
 result=over(dustSum,result);return result.rgb*shade(uv.y);
 }
 `};
}
