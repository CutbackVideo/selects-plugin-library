import{Graph,f32,number,vec,xml,cssColor}from'./graph.mjs';
import{GRADIENTS}from'./summer.mjs';
const wrap=body=>`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">${body}</svg>`;
function ground(bg){
 const p=bg.print||{period:7,angle:23,radius:1.15,ink:bg.ink||'#111612',base:'transparent',blur:0};
 const f=bg.fleck,m=number(f?.mottle),amount=number(f?.flecks);
 return wrap(`<defs><filter id="soft" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="${number(p.blur)}"/></filter><pattern id="p" width="${p.period}" height="${p.period}" patternUnits="userSpaceOnUse" patternTransform="rotate(${number(p.angle)})"><rect width="${p.period}" height="${p.period}" fill="${xml(p.base)}"/><circle cx="${p.period/2}" cy="${p.period/2}" r="${p.radius}" fill="${xml(p.ink)}" filter="url(#soft)"/></pattern>${f?`<filter id="f" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="${f.scale||.03}" numOctaves="3" seed="${f.seed||5}" result="cloud"/><feColorMatrix in="cloud" values="${[0,1,2].map(()=>`${m} 0 0 0 ${.5-m/2}`).join(' ')} 0 0 0 0 1" result="grey"/><feTurbulence type="fractalNoise" baseFrequency="${f.fleckScale||.3}" numOctaves="2" seed="${(f.seed||5)+1}" result="grain"/><feColorMatrix in="grain" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 30 0 0 0 ${-30*(f.threshold||.68)}" result="peaks"/><feComponentTransfer in="peaks" result="flecks"><feFuncA type="linear" slope="${amount}"/></feComponentTransfer><feMerge><feMergeNode in="grey"/><feMergeNode in="flecks"/></feMerge></filter>`:''}</defs><rect width="1080" height="1920" fill="${xml(bg.color||'#000')}"/><rect width="1080" height="1920" fill="url(#p)" opacity="${bg.print?1:number(bg.texture)}"/>${f?'<rect width="1080" height="1920" filter="url(#f)" style="mix-blend-mode:soft-light"/>':''}`);
}
function screenSvg(sc){
 const p=number(sc.period,7),base=number(sc.base,128),a=number(sc.amplitude,40),radius=number(sc.radius,p*.34),blur=number(sc.blur,.6);
 const gray=v=>`rgb(${Array(3).fill(Math.max(0,Math.min(255,Math.round(v)))).join(',')})`;
 let transform=`rotate(${number(sc.angle)})`;
 if(sc.axes){const ks=sc.axes.map(a=>[Math.cos(a.angle*Math.PI/180)/a.period,Math.sin(a.angle*Math.PI/180)/a.period]),det=ks[0][0]*ks[1][1]-ks[0][1]*ks[1][0];if(!Number.isFinite(det)||Math.abs(det)<1e-9)throw Error('Invalid print axes');transform=`matrix(${ks[1][1]/det/p} ${-ks[1][0]/det/p} ${-ks[0][1]/det/p} ${ks[0][0]/det/p} 0 0)`;}
 const dots=[[0,0],[p,0],[0,p],[p,p]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="${radius}" fill="${gray(base-a)}"/>`).join('')+(sc.checker!==false?`<circle cx="${p/2}" cy="${p/2}" r="${radius}" fill="${gray(base+a*number(sc.lightRatio,.6))}"/>`:'');
 return wrap(`<defs><filter id="soft" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="linearRGB"><feGaussianBlur stdDeviation="${blur}"/></filter><pattern id="s" width="${p}" height="${p}" patternUnits="userSpaceOnUse" patternTransform="${transform}"><rect width="${p}" height="${p}" fill="${gray(base)}"/><g${sc.highlights?'':' filter="url(#soft)"'}>${dots}</g></pattern></defs><rect width="1080" height="1920" fill="url(#s)"${sc.highlights?' filter="url(#soft)"':''}/>`);
}
const hex=s=>{const m=/^#([a-f0-9]{6}|[a-f0-9]{3})$/i.exec(s||'');if(s==='transparent')return [0,0,0,0];if(!m)return [0,0,0,1];const h=m[1].length===3?[...m[1]].map(c=>c+c).join(''):m[1];return [...[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255),1];};
function cadence(c,frame,fps){if(!c?.fps||c.fps>=fps)return frame;return `cadence(${frame},${f32(fps/c.fps)},${f32(number(c.phase))})`;}
export function eoLook(data=null){
 data=data||{};const ex=data.execution;if(!ex||!Array.isArray(ex.footage))throw Error('Missing EO execution');
 const g=new Graph(data),fps=number(ex.fps,30),offset=number(data.nativeFrameOffset),win=data.cropWindow,bgs=ex.backgrounds?.length?ex.backgrounds:[{from:0,color:'#000'}];
 let first=g.pass(`let f=uniforms.clock.x+${f32(offset)};let frame=${cadence(ex.cadence,'f',fps)};let scene=${win?`(uv*${vec([win.frameWidth||win.h*16/9,win.frameHeight||win.h])}-${vec([win.x0,win.y0||0])})/${f32(win.w/1080)}`:'uv*vec2f(1080.0,1920.0)'};var bg=${vec(hex(bgs[0].color))};${bgs.map(b=>`if(frame>=${f32(b.from)}){bg=${vec(hex(b.color))};}`).join('')}
 return bg;`,{functions:'fn cadence(f:f32,p:f32,phase:f32)->f32{return max(0.0,ceil(floor((f+phase)/p)*p-phase));}'});
 // Compose each background separately so a scene with many backgrounds does not
 // consume a pass's eight texture slots.
 for(let i=0;i<bgs.length;i++){const b=bgs[i],image=g.image(ground(b));first=g.pass(`let f=uniforms.clock.x+${f32(offset)};let frame=${cadence(ex.cadence,'f',fps)};let scene=${win?`(uv*${vec([win.frameWidth||win.h*16/9,win.frameHeight||win.h])}-${vec([win.x0,win.y0||0])})/${f32(win.w/1080)}`:'uv*vec2f(1080.0,1920.0)'};
 if(frame>=${f32(i?b.from:-1e9)}&&frame<${f32(bgs[i+1]?.from??1e9)}){let at=scene/vec2f(1080.0,1920.0);return over(textureSampleLevel(input1,linearSampler,at,0.0)*within(at,vec2f(1080.0,1920.0)),source(uv));}return source(uv);`,{inputs:[first,image],functions:'fn cadence(f:f32,p:f32,phase:f32)->f32{return max(0.0,ceil(floor((f+phase)/p)*p-phase));}'});}
 const shots=ex.footage.map(shot=>{
  const inset=shot.layout==='inset',box=shot.box||{x:0,y:0,w:1080,h:1920};
  let grade='c.rgb';if(shot.grade){const a=shot.grade;grade=`clamp(pow(saturation(${grade},${f32(number(a.saturation,1))}),vec3f(${f32(number(a.gamma,1))}))*${f32(number(a.brightness,1))},vec3f(0.0),vec3f(1.0))`;}
  const filters={none:'none',bw:'grayscale(1) contrast(1.12)','bw-halftone':'grayscale(1) contrast(1.22)',halftone:'none','warm-film':'sepia(0.28) saturate(1.15) contrast(1.06) brightness(0.96)'};
  grade=cssColor(grade,filters[shot.treatment||'none']);if(shot.gamma)grade=`pow(${grade},vec3f(${f32(shot.gamma)}))`;
  return `if(f>=${f32(shot.from)}&&f<${f32(shot.to)}){
   let local=max(0.0,${cadence(shot.cadence,'f',fps)}-${f32(shot.from)});let push=${shot.move==='slow-push'?`1.0+.06*local/${f32(Math.max(1,shot.to-shot.from))}`:'1.0'};
   ${inset?`let box=${vec([box.x,box.y,box.w,box.h])};let at=(scene-box.xy)/box.zw;let sourceSize=vec2f(textureDimensions(input0));let scale=max(box.z/sourceSize.x,box.w/sourceSize.y);let fitted=sourceSize*scale;let coord=((at-.5)*box.zw/push)/fitted+.5;let mask=roundRect(scene-box.xy,box.zw,${f32(box.r||36)});`:
   `let origin=${win?vec([(win.x0+win.w/2)/(win.frameWidth||win.h*16/9),((win.y0||0)+win.h/2)/(win.frameHeight||win.h)]):'vec2f(.5)'};let coord=(uv-origin)/push+origin;let mask=1.0;`}
   let c=straight(source(coord));result=over(premul(vec4f(${grade},c.a))*mask,result);
  }`;
 }).join('\n');
 let output=g.pass(`let f=uniforms.clock.x+${f32(offset)};let scene=${win?`(uv*${vec([win.frameWidth||win.h*16/9,win.frameHeight||win.h])}-${vec([win.x0,win.y0||0])})/${f32(win.w/1080)}`:'uv*vec2f(1080.0,1920.0)'};var result=textureSampleLevel(input1,linearSampler,uv,0.0);${shots}return result;`,{inputs:['source',first],functions:'fn cadence(f:f32,p:f32,phase:f32)->f32{return max(0.0,ceil(floor((f+phase)/p)*p-phase));}'});
 if(ex.screen){for(const [footage,sc]of [[false,ex.screen],[true,ex.footageScreen]].filter(([,s])=>s)){
  const image=g.image(screenSvg(sc)),on=ex.screenSpans?ex.screenSpans.map(sp=>`(f>=${f32(sp.from)}&&f<${f32(sp.to)})`).join('||')||'false':'true';
  const useFootage=ex.footage.filter(s=>s.screen==='footage').map(s=>`(f>=${f32(s.from)}&&f<${f32(s.to)})`).join('||')||'false';
  const h=sc.highlights,weight=h?`1.0-${f32(1-number(h.keep,1))}*sat((dot(straight(result).rgb,vec3f(.299,.587,.114))*255.0-${f32(number(h.from))})/${f32(Math.max(.000001,number(h.to,1)-number(h.from)))})`:'1.0';
  output=g.pass(`let f=uniforms.clock.x+${f32(offset)};var result=source(uv);let enabled=(${on})&&${footage?`(${useFootage})`:ex.footageScreen?`!(${useFootage})`:'true'};if(!enabled){return result;}
   let scene=${win?`(uv*${vec([win.frameWidth||win.h*16/9,win.frameHeight||win.h])}-${vec([win.x0,win.y0||0])})/${f32(win.w/1080)}`:'uv*vec2f(1080.0,1920.0)'};let at=scene/vec2f(1080.0,1920.0);var weight=${weight};
   ${ex.footage.filter(s=>s.clean&&s.box).map(s=>`if(f>=${f32(s.from)}&&f<${f32(s.to)}&&all(scene>=${vec([s.box.x,s.box.y])})&&all(scene<=${vec([s.box.x+s.box.w,s.box.y+s.box.h])})){weight=0.0;}`).join('\n')}
   let n=textureSampleLevel(input1,linearSampler,at,0.0);let gray=mix(vec3f(${f32(number(sc.base,128)/255)}),n.rgb,weight);let mask=within(at,vec2f(1080.0,1920.0));
   ${sc.blend==='multiply'?'return vec4f(mix(result.rgb,result.rgb*gray,mask),result.a);':sc.blend==='screen'?'return screen(result,vec4f(gray,1.0)*mask);':'return blendOverlay(result,vec4f(gray,1.0)*mask);'}`,{inputs:[output,image],functions:GRADIENTS});
 }}
 return g.finish(output);
}
