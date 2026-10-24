import {Graph, parameters, number, f32, vec, gaussian} from './graph.mjs';

function hex(value) {
  const rgb=/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/.exec(value||'');if(rgb)return rgb.slice(1).map(v=>Math.max(0,Math.min(255,Number(v)))/255);
  if(value==='black')return [0,0,0];if(value==='white')return [1,1,1];
  const m=/^#([a-f\d]{6}|[a-f\d]{3})$/i.exec(value||'');
  if (!m) throw Error('Expected an RGB hex color');
  const h=m[1].length===3?[...m[1]].map(c=>c+c).join(''):m[1];
  return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255);
}

function cropCode(data, p) {
  const b=data.g;
  if (!b || ![b.w,b.h,b.mw,b.mh].every(n=>Number.isFinite(n)&&n>0)) throw Error('Invalid crop geometry');
  const size=vec([b.w,b.h]), window=vec([b.mw,b.mh]);
  return `let size=${size};let win=${window};let at=uv*size-${vec([b.left,b.top])};
    let focus=vec2f(${p.refs.focusX},${p.refs.focusY});let offset=max(win-size,min(vec2f(0.0),win*.5-focus*size));
    let coord=(at-offset)/size;let mask=within(at/win,win);`;
}

export function photoCrop(data) {
  const g=new Graph(data),p=parameters(data,{focusX:.5,focusY:.5});
  g.pass(`${cropCode(data,p)}return source(coord)*mask;`,p);return g.finish();
}

export function galleryTile(data) {
  const d={...data,g:{w:data.sourceWidth,h:data.sourceHeight,mw:data.frameWidth,mh:data.frameHeight,left:data.cropLeft,top:data.cropTop}};
  const g=new Graph(data),p=parameters(data,{focusX:.5,focusY:.5});
  g.pass(`${cropCode(d,p)}let c=straight(source(coord));
    let rgb=select(c.rgb,saturation(c.rgb,0.0),uniforms.clock.x<${f32(data.colorAfterLocalFrame)});
    return premul(vec4f(rgb,c.a))*mask;`,p);return g.finish();
}

export function travelClip(data) {
  const g=new Graph(data),p=parameters(data,{focusX:.5,focusY:.5});
  const grade=data.grade,fade=data.fade;
  const transform=grade?`clamp(c.rgb*${vec(grade.map(c=>c.gain))}+${vec(grade.map(c=>c.offset))},vec3f(0.0),vec3f(1.0))`:'c.rgb';
  const opacity=fade?`sat((${f32(fade[1])}-(uniforms.clock.x+${f32(data.startFrame)})/${f32(data.fps)})/${f32(fade[1]-fade[0])})`:'1.0';
  g.pass(`${cropCode(data,p)}let c=straight(source(coord));let result=premul(vec4f(${transform},c.a))*mask*${opacity};
    return ${fade?`over(result,vec4f(${vec(hex(data.fadeTo))},1.0))`:'result'};`,p);return g.finish();
}

export function polaroid(data, frameOnly=false) {
  const g=new Graph(data),p=parameters(data,{focusX:.5,focusY:.5,grade:1});
  const w=number(data.w),h=number(data.h),m=number(data.m);
  if (!(w>0&&h>0&&m>0&&data.fps>0)) throw Error('Invalid polaroid geometry');
  const sx=x=>w/2+(x-540)/m,sy=y=>h/2+(y-960)/m;
  const origin=vec([sx(data.cx),sy(data.cy)]),size=vec([w,h]);
  const base=`let size=${size};let origin=${origin};let z=1.0+${f32(data.zoom)}*(uniforms.clock.x+${f32(data.startFrame)})/${f32(data.fps)};
    let position=(uv*size-origin)/z+origin;`;
  if (frameOnly) g.pass(base+'return source(position/size);',p);
  else {
    const win=data.win,ww=win.width/m,wh=win.height/m,k=Math.max(ww/w,wh/h);
    g.pass(base+`let win=${vec([ww,wh])};let at=position-${vec([sx(win.x),sy(win.y)])};
      let fitted=size*${f32(k)};let focus=vec2f(${p.refs.focusX},${p.refs.focusY});let offset=max(win-fitted,min(vec2f(0.0),win*.5-focus*fitted));
      let c=straight(source((at-offset)/fitted));let amount=${p.refs.grade};
      let rgb=brightness(contrast(saturation(sepia(c.rgb,.18*amount),1.0+.08*amount),1.0+.05*amount),1.0+.02*amount);
      return premul(vec4f(rgb,c.a))*within(at/win,win);`,p);
  }
  return g.finish();
}

export function stopMotion(data) {
  const g=new Graph(data),p=parameters(data,{focusX:.5,focusY:.5});
  const hits=(data.hitShake||[]).map(number),q=number(data.g.q,1);
  const functions=`fn referenceFrame()->f32{return max(0.0,floor((uniforms.clock.x+${f32(data.startFrame)})/${f32(data.fps)}*30.0-${f32(data.refStart)}+.000001));}
    fn hit()->bool{return ${data.kind==='hit'?'true':'false'}&&referenceFrame()<${f32(hits.length)};}
    fn sigma()->f32{return ${data.kind==='intro'?f32(number(data.introBlur)*q):`select(0.0,${f32(number(data.hitBlur)*q)},hit())`};}`;
  const blur=gaussian(g,'source','sigma()',{space:[data.g.w,data.g.h],functions});
  const shakes=hits.length?`let shakes=array<f32,${hits.length}>(${hits.map(f32).join(',')});let dy=select(0.0,shakes[min(u32(referenceFrame()),${hits.length-1}u)]*${f32(q)},hit());`:'let dy=0.0;';
  g.pass(`${cropCode(data,p)}var c=source(coord);${shakes}
    if(sigma()>0.0){c=over(textureSampleLevel(input1,linearSampler,coord,0.0)*within(coord,size),c);}
    if(dy!=0.0){let moved=coord-vec2f(0.0,dy/size.y);c=over(textureSampleLevel(input1,linearSampler,moved,0.0)*within(moved,size),c);}
    return c*mask;`,{...p,inputs:['source',blur],functions});return g.finish();
}

export function velocity(data) {
  const g=new Graph(data),p=parameters(data,{focusX:.5,focusY:.5});
  const q=number(data.g.q,1),profile=data.profile||[0,0,0,0,0];
  if (!(data.speed>0&&data.fps>0) || profile.length!==5) throw Error('Invalid velocity timing');
  const functions=`fn amount()->f32{let t=(uniforms.clock.x/${f32(data.speed)}+${f32(data.startFrame)})/${f32(data.fps)}*30.0;
    let profile=array<f32,5>(${profile.map(f32).join(',')});var a=0.0;
    ${(data.blurCuts||[]).map(c=>`{let k=floor(t-${f32(c)}+.5);if(k>=-2.0&&k<=2.0){a=max(a,profile[u32(k+2.0)]);}}`).join('\n')}
    return a;}`;
  const blur=gaussian(g,'source',`${f32(number(data.blurSoft)*q)}*amount()`,{space:[data.g.w,data.g.h],functions});
  g.pass(`${cropCode(data,p)}var c=source(coord);let a=amount();if(a>0.0){
    for(var i=0u;i<8u;i++){let dy=(f32(i)/7.0-.5)*${f32(number(data.blurLength)*q)}*a;
      let moved=coord-vec2f(0.0,dy/size.y);let layer=textureSampleLevel(input1,linearSampler,moved,0.0)*within(moved,size)/(f32(i)+1.0);c=over(layer,c);
    }}return c*mask;`,{...p,inputs:['source',blur],functions});return g.finish();
}

export function panelReveal(data) {
  const g=new Graph(data),p=parameters(data,{leftPct:0,rightPct:100,revealSeconds:0});
  g.pass(`let progress=select(1.0,sat(uniforms.clock.z/max(.000001,${p.refs.revealSeconds})),${p.refs.revealSeconds}>0.0);
    let left=${p.refs.leftPct}/100.0;let right=mix(left,${p.refs.rightPct}/100.0,progress);
    let mask=sat((uv.x-left)*uniforms.resolution.x+.5)*sat((right-uv.x)*uniforms.resolution.x+.5);
    return source(uv)*mask;`,p);return g.finish();
}

export function fourPhotoReveal(data, fps=30) {
  const g=new Graph(data),p=parameters(data,{focusX:.5,focusY:.5,radius:0});
  const reveal=data.revealStart==null?'1.0':`reveal((t-${f32(data.revealStart)})/${f32(data.revealDuration)},${data.lateEase?'true':'false'})`;
  const fade=data.fadeStart==null?'1.0':`(1.0-ease((t-${f32(data.fadeStart)})/${f32(data.fadeDuration)}))`;
  const transitions=[data.transitionIn,data.transitionOut].filter(Boolean).map(item=>`if(frame>=${f32(item.startFrame)}&&frame<${f32(item.startFrame+item.durationFrames)}){
    let c=transition((frame-${f32(item.startFrame)})/${f32(Math.max(1,item.durationFrames-1))});gain=c.y;${item===data.transitionIn?'alpha*=c.x;':''}}`).join('\n');
  g.pass(`${cropCode(data,p)}let frame=uniforms.clock.x+${f32(data.startFrame)};let t=frame/${f32(fps)};
    var alpha=${reveal}*${fade};var gain=1.0;${transitions}
    let c=straight(source(coord));let radius=max(0.0,${p.refs.radius});
    return premul(vec4f(brightness(c.rgb,gain),c.a))*alpha*roundRect(at,win,radius);`,{...p,functions:`
      fn reveal(progress:f32,late:bool)->f32{let p=sat(progress);if(!late||p<=5.0/9.0){return p;}let u=(p-5.0/9.0)/(4.0/9.0);return 5.0/9.0+4.0/9.0*(1.0-pow(1.0-u,2.1));}
      fn transition(progress:f32)->vec2f {
        let alphas=array<f32,10>(0.0,.0901,.2356,.3011,.3622,.5160,.6777,.7667,.8582,1.0);
        let gains=array<f32,10>(1.0,1.0240,1.0451,1.0602,1.0677,1.0936,1.1063,1.0860,1.0542,1.0);
        let at=sat(progress)*9.0;let i=min(8u,u32(floor(at)));let t=at-f32(i);
        return vec2f(mix(alphas[i],alphas[i+1u],t),mix(gains[i],gains[i+1u],t));
      }`});return g.finish();
}

export function shortformPanels(data) {
  const g=new Graph(data),p=parameters(data,{sourceZoom:100,sourceX:0,sourceY:0});
  const W=number(data.sourceW),H=number(data.sourceH),windowH=number(data.windowH),panels=data.panels||[];
  if (!(W>0&&H>0&&windowH>0) || !panels.length) throw Error('Missing panel geometry');
  const blurred=panels.some(p=>p.backdrop==='blur')?gaussian(g,'source','24.0',{space:[W,H]}):null;
  const branches=panels.map((panel,i)=>{
    const count=panel.count||panels.length,slot=panel.slot??i;
    const r=panel.destination||{x:0,y:slot/count,width:1,height:1/count};
    const outW=1080*r.width,outH=windowH*r.height,rect=panel.fit==='region'?panel.rect:null;
    const baseW=rect?Math.max(rect.width,rect.height*outW/outH):panel.fit==='contain'?Math.max(W,H*outW/outH):Math.max(1,Math.min(W,panel.w));
    const baseScale=outW/baseW,baseH=outH/baseScale;
    const baseX=rect?rect.x-(baseW-rect.width)/2:panel.fit==='contain'?(W-baseW)/2:Math.max(0,Math.min(W-baseW,panel.cx-baseW/2));
    const baseY=rect?rect.y-(baseH-rect.height)/2:panel.fit==='contain'?(H-baseH)/2:baseH>H?(H-baseH)/2:Math.max(0,Math.min(H-baseH,panel.cy-baseH*.4));
    const cw=Math.min(W,H*outW/outH)/1.1,ch=outH/(outW/cw);
    const region=rect?`if(!manual){let r=(coord*size-${vec([rect.x,rect.y])})/${vec([rect.width,rect.height])};src*=within(r,${vec([rect.width,rect.height])});}`:'';
    return `{
      let destination=${vec([r.x,r.y,r.width,r.height])};let cell=(uv-destination.xy)/destination.zw;let mask=within(cell,destination.zw*size);
      let base=${vec([baseW,baseH])};let basePosition=${vec([baseX,baseY])};let crop=base/zoom;var position=basePosition;
      if(manual){let candidate=basePosition+(base-crop)*.5+offset;position=select(clamp(candidate,vec2f(0.0),max(vec2f(0.0),size-crop)),(size-crop)*.5,crop>size);}
      let coord=(position+cell*crop)/size;var src=source(coord);${region}
      var bg=vec4f(0.0,0.0,0.0,1.0);
      ${panel.backdrop==='blur'?`let back=((size-${vec([cw,ch])})*.5+cell*${vec([cw,ch])})/size;bg=over(textureSampleLevel(input1,linearSampler,back,0.0)*within(back,size),bg);`:''}
      result=over(over(src,bg)*mask,result);
    }`;
  }).join('\n');
  g.pass(`let size=${vec([W,H])};let zoom=clamp(${p.refs.sourceZoom},25.0,400.0)/100.0;
    let offset=clamp(vec2f(${p.refs.sourceX},${p.refs.sourceY}),vec2f(-100.0),vec2f(100.0))/100.0*size;
    let manual=zoom!=1.0||any(offset!=vec2f(0.0));var result=vec4f(0.0);${branches}return result;`,{...p,inputs:blurred?['source',blurred]:['source']});return g.finish();
}
