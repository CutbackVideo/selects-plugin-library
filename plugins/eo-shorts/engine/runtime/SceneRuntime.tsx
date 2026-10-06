import React from 'react';
import {useCurrentFrame,delayRender,continueRender,cancelRender} from 'remotion';

const clamp = (value:number) => Math.max(0,Math.min(1,value));
const curves:any = {
  cut:(p:number)=>p>=1?1:0,
  linear:(p:number)=>p,
  out:(p:number)=>1-Math.pow(1-p,3),
  in:(p:number)=>p*p*p,
  smooth:(p:number)=>p*p*(3-2*p),
  steps:(p:number)=>Math.floor(p*5)/5,
  in2:(p:number)=>p*p,
  out2:(p:number)=>1-(1-p)*(1-p),
  expo:(p:number)=>(1-Math.pow(27,-p))/(1-1/27),
};

export function cadenceFrame(frame:number,cadence:any,fps:number) {
  if(!cadence?.fps||cadence.fps>=fps)return frame;
  const period=fps/cadence.fps,phase=cadence.phase||0;
  let k=Math.floor((frame+phase)/period),tick=Math.ceil(k*period-phase);
  if(tick>frame)tick=Math.ceil((k-1)*period-phase);
  return Math.max(0,tick);
}

export function cameraAt(camera:any,frame:number) {
  if(!camera?.keyframes?.length)return {x:0,y:0,scale:1};
  const p=poseAt({keyframes:camera.keyframes},frame);
  return {x:p.x||0,y:p.y||0,scale:p.scale??1};
}
export function poseAt(layer:any, frame:number) {
  const keys=layer.keyframes;
  let pose={x:0,y:0,width:0,height:0,scale:1,rotation:0,opacity:1,blur:0,...keys[0]};
  for(let i=1;i<keys.length;i++) {
    const next={...pose,...keys[i]};
    if(frame>=next.frame) {pose=next;continue;}
    const progress=clamp((frame-pose.frame)/(next.frame-pose.frame));
    const q=curves[next.curve||'cut'](progress), result={...pose};
    for(const prop of ['x','y','width','height','scale','rotation','opacity','blur'])
      result[prop]=pose[prop]+(next[prop]-pose[prop])*q;
    pose=result;break;
  }
  if(layer.printMotion && frame>=layer.printMotion.from) {
    const tick=Math.floor((frame-layer.printMotion.from)/layer.printMotion.stepFrames);
    const offsets=[[-.35,.15],[.2,-.45],[.4,.3],[-.15,.5],[-.25,-.15],[.1,.1]];
    const d=offsets[(tick+(layer.printMotion.phase||0))%offsets.length];
    pose.x+=d[0]*layer.printMotion.amplitude;
    pose.y+=d[1]*layer.printMotion.amplitude;
  }
  if(layer.exit) {
    const e=layer.exit, q=curves.smooth(clamp((frame-e.start)/(e.end-e.start)));
    pose.x+=(e.shiftX||0)*q;pose.y+=(e.shiftY||0)*q;
    pose.opacity*=1-q;pose.blur+=(e.blur||0)*q;
  }
  return pose;
}

export function digitState(target:number,frame:number,start:number,duration:number) {
  const progress=curves.out(clamp((frame-start)/duration));
  return {progress,position:progress*3,digits:[3,2,1,0].map(n=>(target+n)%10)};
}

export function countedText(layer:any,frame:number) {
  const m=layer.numberMotion,match=layer.text.match(/^([^0-9]*)([0-9][0-9,]*)([^0-9]*)$/);
  const target=Number(match[2].replaceAll(',','')),elapsed=Math.max(0,frame-layer.from);
  if(elapsed>=m.durationFrames && elapsed>=(m.suffixDelayFrames||0))return layer.text;
  const digits=String(target).length,places=Math.max(0,digits-3);
  const countDuration=places?Math.max(2,m.durationFrames-places*2):m.durationFrames;
  const base=target/Math.pow(10,places);
  let value=Math.round(base*curves.out(clamp(elapsed/countDuration)));
  if(elapsed>countDuration)value=Math.round(base*Math.pow(10,Math.min(places,Math.floor((elapsed-countDuration)/2))));
  const suffix=elapsed<(m.suffixDelayFrames||0)?'':match[3];
  return match[1]+(match[2].includes(',')?value.toLocaleString('en-US'):String(value))+suffix;
}

export function countUpText(layer:any,frame:number) {
  const m=layer.numberMotion,match=layer.text.match(/^([^0-9]*)([0-9][0-9,]*(?:\.[0-9]+)?)([^0-9]*)$/);
  if(!match)return layer.text;
  const target=Number(match[2].replaceAll(',','')),from=m.from||0,places=m.decimals||0;
  const q=clamp((frame-layer.from-(m.delayFrames||0))/Math.max(1,m.durationFrames));
  if(q>=1)return layer.text;
  const value=Math.round((from+(target-from)*q)*10**places)/10**places;
  const shown=match[2].includes(',')?value.toLocaleString('en-US',{minimumFractionDigits:places,maximumFractionDigits:places}):value.toFixed(places);
  return match[1]+shown+match[3];
}

export function fontFeatureStyle(font:any) {
  const style:any={};
  if(font?.figures==='lining')style.fontVariantNumeric='lining-nums';
  if(font?.opticalSize)style.fontVariationSettings=`'opsz' ${font.opticalSize}`;
  return style;
}

function AnimatedType({ex,layer,frame,color}:{ex:any,layer:any,frame:number,color:string}) {
  const font=ex.fonts[layer.font],m=layer.numberMotion,r=layer.reveal;
  const outline=layer.stroke&&String(color).toUpperCase()===String(layer.stroke.fill).toUpperCase()
    ?{stroke:layer.stroke.color,strokeWidth:layer.stroke.width,paintOrder:'stroke fill'}:{};
  const common:any={dominantBaseline:'alphabetic',fill:color,...outline,fontFamily:JSON.stringify(font.family),
    fontSize:layer.size,fontWeight:layer.weight||400,fontStyle:font.style||'normal',style:fontFeatureStyle(font)};
  if(layer.richLines) return <g>{layer.richLines.map((line:any,i:number)=>{
    const elapsed=frame-layer.from-(line.at||0);if(elapsed<0)return null;
    const face=ex.fonts[line.font||layer.font];
    const q=line.clarify?curves.out(clamp(elapsed/line.clarify)):1;
    return <text key={i} {...common} data-eo-text={layer.id+'-'+i} x={line.x||0} y={line.y||0}
      fontFamily={JSON.stringify(face.family)} fontStyle={face.style||'normal'}
      fontSize={line.size||layer.size} fontWeight={line.weight||layer.weight||400}
      style={{...fontFeatureStyle(face),filter:q<1?`blur(${(1-q)*3}px)`:'none'}}>{line.text}</text>;
  })}</g>;
  if(m?.mode==='count-up')return <text {...common} data-eo-text={layer.id} x={0} y={0}
    textAnchor={layer.anchor||'start'} letterSpacing={layer.spacing||0}>{countUpText(layer,frame)}</text>;
  if(m?.mode==='count-build')return <text {...common} data-eo-text={layer.id} x={0} y={0}
    textAnchor={layer.anchor||'start'} letterSpacing={layer.spacing||0}>{countedText(layer,frame)}</text>;
  if(m) {
        const total=m.advances.reduce((sum:number,n:number)=>sum+n,0),pitch=layer.size*1.05;
    let x=layer.anchor==='middle'?-total/2:0, digitIndex=0;
    return <g>
      <text {...common} data-eo-text={layer.id} x={0} y={0} textAnchor={layer.anchor||'start'}
        letterSpacing={layer.spacing||0} opacity={0}>{layer.text}</text>
      {[...layer.text].map((char:string,i:number)=>{
        const left=x,advance=m.advances[i];x+=advance;
        if(!/\d/.test(char))return <text key={i} {...common} x={left} y={0}
          opacity={char==='×'&&frame<layer.from+(m.suffixDelayFrames||0)?0:1}>{char}</text>;
        const start=layer.from+digitIndex++*(m.staggerFrames||0),state=digitState(+char,frame,start,m.durationFrames);
        const id=idFor(ex,layer.id+'-digit-'+i);
        return <g key={i}><defs><clipPath id={id}><rect x={left-3} y={-layer.size*.79}
          width={advance+6} height={layer.size*.83}/></clipPath></defs>
          <g clipPath={`url(#${id})`}>
            {state.digits.map((digit:number,j:number)=><text key={j} {...common} x={left}
              y={(j-state.position)*pitch}>{digit}</text>)}
          </g></g>;
      })}
    </g>;
  }
  if(r) {
    const total=r.runs.reduce((sum:number,run:any)=>sum+run.advance,0);
    let x=layer.anchor==='middle'?-total/2:0;
    return <g>{r.runs.map((run:any,i:number)=>{
      const left=x;x+=run.advance;
      if(frame<layer.from+run.at)return null;
      const q=r.durationFrames>0?curves.out(clamp((frame-layer.from-run.at)/r.durationFrames)):1;
      return <text key={i} {...common} data-eo-text={layer.id+'-'+i} x={left} y={(r.offsetY||0)*(1-q)}
        letterSpacing={layer.spacing||0} opacity={(r.opacityFrom??.35)+(1-(r.opacityFrom??.35))*q}
        style={{...common.style,filter:r.blur?`blur(${r.blur*(1-q)}px)`:'none',whiteSpace:'pre'}}>{run.text}</text>;
    })}</g>;
  }
  return <text {...common} data-eo-text={layer.id} x={0} y={0} textAnchor={layer.anchor||'start'}
    letterSpacing={layer.spacing||0}>{layer.text}</text>;
}

const idFor=(ex:any,part:string)=>`eo-${String(ex.sceneId+'-'+part).replace(/[^a-zA-Z0-9_-]/g,'-')}`;
const rgb=(hex:string)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
const geometry=(layer:any)=>({width:layer.keyframes[0].width,height:layer.keyframes[0].height});
const patternCache=new Map<string,string>();
export function screenUri(print:any,width:number,height:number) {
  const key=JSON.stringify([print,width,height]);
  if(patternCache.has(key))return patternCache.get(key)!;
  const p=print.period,blur=print.blur||0;
  const xml=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs>
    <filter id="soft" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="${blur}"/></filter>
    <pattern id="screen" width="${p}" height="${p}" patternUnits="userSpaceOnUse" patternTransform="rotate(${print.angle})">
      <rect width="${p}" height="${p}" fill="#ffffff"/>
      <circle cx="${p/2}" cy="${p/2}" r="${print.radius}" fill="${print.ink}" opacity="${print.strength}" filter="url(#soft)"/>
    </pattern></defs><rect width="100%" height="100%" fill="url(#screen)"/></svg>`;
  const uri='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(xml);patternCache.set(key,uri);return uri;
}

function PrintPattern({id,print}:{id:string,print:any}) {
  const p=print.period;
  return <><filter id={id+'-soft'} x="-100%" y="-100%" width="300%" height="300%">
    <feGaussianBlur stdDeviation={print.blur||0}/></filter>
    <pattern id={id} width={p} height={p} patternUnits="userSpaceOnUse" patternTransform={`rotate(${print.angle})`}>
      <rect width={p} height={p} fill={print.base}/>
      <circle cx={p/2} cy={p/2} r={print.radius} fill={print.ink} filter={`url(#${id}-soft)`}/>
    </pattern></>;
}

function NaturalPrint({id,layer}:{id:string,layer:any}) {
  const m=layer.material,{width,height}=geometry(layer),edge=m.paperEdge;
  const wob=edge?.wobble||0,pad=edge?edge.size+wob+Math.max(Math.abs(edge.x||0),Math.abs(edge.y||0))+(edge.line?edge.line.size:0)+4:0;
  return <filter id={id} filterUnits="userSpaceOnUse" x={-pad} y={-pad} width={width+pad*2} height={height+pad*2} colorInterpolationFilters="sRGB">
    <feGaussianBlur in="SourceGraphic" stdDeviation={m.soften||0} result="soft"/>
    <feColorMatrix in="soft" type="saturate" values={String(m.saturation??1)} result="sat"/>
    <feComponentTransfer in="sat" result={m.ramp?'leveled':'toned'}>
      {['R','G','B'].map(channel=>React.createElement('feFunc'+channel,{key:channel,type:'linear',slope:m.contrast??1,intercept:m.brightness??0}))}
    </feComponentTransfer>
    {}
    {m.ramp&&<feComponentTransfer in="leveled" result="toned">
      {[0,1,2].map(c=>React.createElement('feFunc'+'RGB'[c],{key:c,type:'table',
        tableValues:m.ramp.map((hex:string)=>(parseInt(hex.slice(1+2*c,3+2*c),16)/255).toFixed(4)).join(' ')}))}
    </feComponentTransfer>}
    <feComposite in="toned" in2="SourceAlpha" operator="in" result="cutout"/>
    {edge&&<><feMorphology in="SourceAlpha" operator="dilate" radius={edge.size} result="grown"/>
      <feTurbulence type="fractalNoise" baseFrequency={edge.wobbleFrequency||0.035} numOctaves={2} seed={edge.seed||3} result="noise"/>
      <feDisplacementMap in="grown" in2="noise" scale={wob*2} xChannelSelector="R" yChannelSelector="G" result="rough"/>
      <feOffset in="rough" dx={edge.x||0} dy={edge.y||0} result="offset"/>
      <feFlood floodColor={edge.color} result="paper"/><feComposite in="paper" in2="offset" operator="in" result="paper-edge"/>
      {edge.line&&<><feMorphology in="offset" operator="dilate" radius={edge.line.size} result="lined"/>
        <feFlood floodColor={edge.line.color} floodOpacity={edge.line.opacity??1} result="ink"/>
        <feComposite in="ink" in2="lined" operator="in" result="edge-line"/></>}
      <feMerge>{edge.line&&<feMergeNode in="edge-line"/>}<feMergeNode in="paper-edge"/><feMergeNode in="cutout"/></feMerge></>}
  </filter>;
}

function AssetPrint({id,layer}:{id:string,layer:any}) {
  if(layer.material.mode==='natural')return <NaturalPrint id={id} layer={layer}/>;
  const m=layer.material,{width,height}=geometry(layer),dark=rgb(m.ink),light=rgb(m.paper);
  const matrix=dark.map((d,i)=>`${light[i]-d} 0 0 0 ${d}`).join(' ')+' 0 0 0 1 0';
  const edge=m.paperEdge,pad=edge?edge.size+Math.max(Math.abs(edge.x),Math.abs(edge.y))+2:0;
  return <filter id={id} filterUnits="userSpaceOnUse" x={-pad} y={-pad} width={width+pad*2} height={height+pad*2} colorInterpolationFilters="sRGB">
    <feColorMatrix in="SourceGraphic" type="saturate" values="0" result="gray"/>
    <feComponentTransfer in="gray" result="contrast">
      {['R','G','B'].map(channel=>React.createElement('feFunc'+channel,{key:channel,type:'linear',slope:m.contrast,intercept:m.brightness}))}
    </feComponentTransfer>
    <feColorMatrix in="contrast" type="matrix" values={matrix} result="toned"/>
    <feImage href={screenUri(m.screen,width,height)} x={0} y={0} width={width} height={height} result="screen"/>
    <feBlend in="toned" in2="screen" mode="multiply" result="printed"/>
    <feComposite in="printed" in2="SourceAlpha" operator="in" result="cutout"/>
    {edge&&<><feMorphology in="SourceAlpha" operator="dilate" radius={edge.size} result="outline"/>
      <feOffset in="outline" dx={edge.x} dy={edge.y} result="offset"/>
      <feFlood floodColor={edge.color} result="paper"/><feComposite in="paper" in2="offset" operator="in" result="paper-edge"/>
      <feMerge><feMergeNode in="paper-edge"/><feMergeNode in="cutout"/></feMerge></>}
  </filter>;
}

export function sceneExecution(data:any) {
  const ex=data.execution;
  return ex.layers&&ex.fonts?ex:{...ex,layers:ex.layers||[],fonts:ex.fonts||{}};
}

export function materialImageUris(data:any) {
  const ex=sceneExecution(data);
  return [...Object.values(data.assets||{}) as string[],...ex.layers.filter((l:any)=>l.material&&l.material.mode!=='natural').map((l:any)=>{
    const g=geometry(l);return screenUri(l.material.screen,g.width,g.height);
  }),...[ex.screen,ex.footageScreen].filter((sc:any)=>sc?.highlights).map((sc:any)=>frameScreenUri(sc))];
}

function PrintDefinitions({ex}:{ex:any}) {
  return <defs>
    {ex.backgrounds.filter((b:any)=>b.print).map((b:any)=><PrintPattern key={b.from} id={idFor(ex,'bg-'+b.from)} print={b.print}/>)}
    {ex.layers.filter((l:any)=>l.print).map((l:any)=><PrintPattern key={l.id} id={idFor(ex,l.id+'-print')} print={l.print}/>)}
    {ex.layers.filter((l:any)=>l.material).map((l:any)=><AssetPrint key={l.id} id={idFor(ex,l.id+'-material')} layer={l}/>)}
  </defs>;
}

export function screenTransform(sc:any) {
  if(!sc.axes)return `rotate(${sc.angle})`;
  const [k1,k2]=sc.axes.map((a:any)=>{const t=a.angle*Math.PI/180;return [Math.cos(t)/a.period,Math.sin(t)/a.period];});
  const det=k1[0]*k2[1]-k1[1]*k2[0],p=sc.period;
  const a1=[k2[1]/det,-k2[0]/det],a2=[-k1[1]/det,k1[0]/det];
  return `matrix(${a1[0]/p} ${a1[1]/p} ${a2[0]/p} ${a2[1]/p} 0 0)`;
}

function screenTile(sc:any) {
  const p=sc.period,a=sc.amplitude??40,base=sc.base??128;
  const g=(v:number)=>{const c=Math.max(0,Math.min(255,Math.round(v)));return `rgb(${c},${c},${c})`;};
  const dots=[[0,0],[p,0],[0,p],[p,p]].map(([x,y])=>({x,y,fill:g(base-a)}));
  if(sc.checker!==false)dots.push({x:p/2,y:p/2,fill:g(base+a*(sc.lightRatio??.6))});
  return {p,r:sc.radius??p*.34,cell:g(base),dots,blur:sc.blur??.6,transform:screenTransform(sc)};
}

function ScreenPattern({id,sc}:{id:string,sc:any}) {
  const t=screenTile(sc);
  return <><filter id={id+'-soft'} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={t.blur}/></filter>
    <pattern id={id} width={t.p} height={t.p} patternUnits="userSpaceOnUse" patternTransform={t.transform}>
      <rect width={t.p} height={t.p} fill={t.cell}/>
      <g filter={`url(#${id}-soft)`}>
        {t.dots.map((d,i)=><circle key={i} cx={d.x} cy={d.y} r={t.r} fill={d.fill}/>)}
      </g>
    </pattern></>;
}

function CompositeScreen({ex,sc,hole}:{ex:any,sc:any,hole?:any}) {
  const id=idFor(ex,'composite-screen');
  return <svg width={1080} height={1920} style={{position:'absolute',inset:0,mixBlendMode:sc.blend||'overlay',pointerEvents:'none',zIndex:100000}}>
    <defs><ScreenPattern id={id} sc={sc}/>
      {hole&&<mask id={id+'-hole'}><rect width={1080} height={1920} fill="#fff"/>
        <rect x={hole.x} y={hole.y} width={hole.w} height={hole.h} rx={hole.r||0} fill="#000"/></mask>}</defs>
    <rect width={1080} height={1920} fill={`url(#${id})`} mask={hole?`url(#${id}-hole)`:undefined}/>
  </svg>;
}

export function frameScreenUri(sc:any) {
  const key=JSON.stringify(['frame',sc]);
  if(patternCache.has(key))return patternCache.get(key)!;
  const t=screenTile(sc);
  const xml=`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><defs>
    <pattern id="screen" width="${t.p}" height="${t.p}" patternUnits="userSpaceOnUse" patternTransform="${t.transform}">
      <rect width="${t.p}" height="${t.p}" fill="${t.cell}"/>${t.dots.map(d=>`<circle cx="${d.x}" cy="${d.y}" r="${t.r}" fill="${d.fill}"/>`).join('')}
    </pattern></defs><rect width="1080" height="1920" fill="url(#screen)"/></svg>`;
  const uri='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(xml);patternCache.set(key,uri);return uri;
}

export function highlightWeight(h:any,luminance:number) {
  return 1-(1-h.keep)*Math.max(0,Math.min(1,(luminance-h.from)/(h.to-h.from)));
}

function TonedScreen({id,sc,hole,preserveAlpha,region}:{id:string,sc:any,hole?:any,preserveAlpha?:boolean,region?:any}) {
  const base=(sc.base??128)/255,luma='0.299 0.587 0.114 0 0';
  const weight=Array.from({length:256},(_,v)=>highlightWeight(sc.highlights||{from:0,to:1,keep:1},v).toFixed(4)).join(' ');
  const r=region?{x:region.left,y:region.top,width:region.width,height:region.height}:{x:0,y:0,width:1080,height:1920};
  return <filter id={id} filterUnits="userSpaceOnUse" {...r} colorInterpolationFilters="sRGB">
    <feImage href={frameScreenUri(sc)} x={0} y={0} width={1080} height={1920} result="dots"/>
    <feGaussianBlur in="dots" stdDeviation={screenTile(sc).blur} colorInterpolationFilters="linearRGB" result="screen"/>
    <feColorMatrix in="SourceGraphic" type="matrix" values={`${luma} ${luma} ${luma} 0 0 0 0 1`} result="tone"/>
    <feComponentTransfer in="tone" result="weight">
      {['R','G','B'].map(c=>React.createElement('feFunc'+c,{key:c,type:'table',tableValues:weight}))}
    </feComponentTransfer>
    {hole&&<><feFlood floodColor="#000" x={hole.x} y={hole.y} width={hole.w} height={hole.h} result="hole"/>
      <feMerge result="weight"><feMergeNode in="weight"/><feMergeNode in="hole"/></feMerge></>}
    {}
    <feComposite in="screen" in2="weight" operator="arithmetic" k1={1} k2={0} k3={-base} k4={base} result="faded"/>
    <feBlend in="faded" in2="SourceGraphic" mode={sc.blend||'overlay'} result="printed"/>
    {preserveAlpha&&<feComposite in="printed" in2="SourceGraphic" operator="in"/>}
  </filter>;
}

function FootageGamma({id,gamma}:{id:string,gamma:number}) {
  return <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
    <feComponentTransfer>{['R','G','B'].map(c=>React.createElement('feFunc'+c,{key:c,type:'gamma',amplitude:1,exponent:gamma,offset:0}))}</feComponentTransfer>
  </filter>;
}

function FootageGrade({id,grade}:{id:string,grade:any}) {
  return <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
    <feColorMatrix type="saturate" values={String(grade.saturation??1)} result="saturated"/>
    <feComponentTransfer in="saturated">{['R','G','B'].map(c=>React.createElement('feFunc'+c,{key:c,type:'gamma',
      amplitude:grade.brightness??1,exponent:grade.gamma??1,offset:0}))}</feComponentTransfer>
  </filter>;
}

export function footageFrame(shot:any,videoFrame:number,fps:number) {
  const local=Math.max(0,(shot.cadence?cadenceFrame(videoFrame,shot.cadence,fps):videoFrame)-shot.from);
  return {local,source:(shot.offset||0)+Math.round(local*(shot.rate??1))};
}

function GroundFleck({id,fleck}:{id:string,fleck:any}) {
  const m=fleck.mottle||0,f=fleck.flecks||0;
  return <>
    <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency={fleck.scale||0.03} numOctaves={3} seed={fleck.seed||5} result="cloud"/>
      <feColorMatrix in="cloud" type="matrix" result="grey"
        values={[0,1,2].map(()=>`${m} 0 0 0 ${0.5-m/2}`).join(' ')+' 0 0 0 0 1'}/>
      <feTurbulence type="fractalNoise" baseFrequency={fleck.fleckScale||0.3} numOctaves={2} seed={(fleck.seed||5)+1} result="grain"/>
      <feColorMatrix in="grain" type="matrix" result="peaks"
        values={`0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  30 0 0 0 ${-30*(fleck.threshold||0.68)}`}/>
      <feComponentTransfer in="peaks" result="flecks"><feFuncA type="linear" slope={f}/></feComponentTransfer>
      <feMerge><feMergeNode in="grey"/><feMergeNode in="flecks"/></feMerge>
    </filter>
    <rect width={1080} height={1920} filter={`url(#${id})`} style={{mixBlendMode:'soft-light'}}/>
  </>;
}

function SemanticAssetImage({source,geometry:g,clip,clipId,materialFilter}:any) {
  const picture=<image href={source} width={g.width} height={g.height} preserveAspectRatio="xMidYMid meet"/>;
  if(!clip)return <image href={source} width={g.width} height={g.height} preserveAspectRatio="xMidYMid meet" filter={materialFilter}/>;
  const sx=g.width/clip.sourceWidth,sy=g.height/clip.sourceHeight;
  const shape=clip.rect?<rect x={clip.rect.x*sx} y={clip.rect.y*sy} width={clip.rect.w*sx} height={clip.rect.h*sy}/>:
    <polygon points={clip.polygon.map(([x,y]:number[])=>`${x*sx},${y*sy}`).join(' ')}/>;
  return <><defs><clipPath id={clipId} clipPathUnits="userSpaceOnUse">{shape}</clipPath></defs>
    <g filter={materialFilter}><g clipPath={`url(#${clipId})`}>{picture}</g></g></>;
}

export function cropGeometry(win:any) {
  const h=win.h,w=win.w,y0=win.y0||0,fw=win.frameWidth||h*16/9,fh=win.frameHeight||h;
  const k=w/1080;
  return {x0:win.x0,y0,w,h,fw,fh,k,
    box:{left:`${win.x0/fw*100}%`,top:`${y0/fh*100}%`,width:`${w/fw*100}%`,height:`${h/fh*100}%`},
    frame:{left:(0-win.x0)/k,top:(0-y0)/k,width:fw/k,height:fh/k},
    centre:`${(win.x0+w/2)/fw*100}% ${(y0+h/2)/fh*100}%`};
}

const LOOKS:any={none:'none',bw:'grayscale(1) contrast(1.12)','bw-halftone':'grayscale(1) contrast(1.22)',
  'warm-film':'sepia(0.28) saturate(1.15) contrast(1.06) brightness(0.96)'};
function Footage({ex,data,frame,videoFrame}:{ex:any,data:any,frame:number,videoFrame:number}) {
  const shot=(ex.footage||[]).find((f:any)=>videoFrame>=f.from&&videoFrame<f.to);
  if(!shot)return null;
  const urls=data.footageUrls?.[shot.id]||[];
  const NativeSource=data.Source;
  if(!urls.length&&!NativeSource)return null;
  const {local,source}=footageFrame(shot,videoFrame,ex.fps);
  const push=shot.move==='slow-push'?1+0.06*(local/Math.max(1,shot.to-shot.from)):1;
  const look=LOOKS[shot.treatment||'none'];
  const filters=[shot.grade&&`url(#${idFor(ex,shot.id+'-grade')})`,look!=='none'&&look,shot.gamma&&`url(#${idFor(ex,shot.id+'-gamma')})`].filter(Boolean);
  const filter=filters.length?filters.join(' '):look;
  const inset=shot.layout==='inset';
  const crop=NativeSource&&data.cropWindow&&!inset?cropGeometry(data.cropWindow):null;
  let media;
  if(NativeSource) {
    const fit=crop?'fill':inset||data.sourceObjectFit==='cover'?'cover':undefined;
    media=<div data-eo-native-source-fit={fit} style={{position:'absolute',...(crop?crop.frame:{inset:0}),width:crop?crop.frame.width:'100%',
      height:crop?crop.frame.height:'100%',transform:`scale(${push})`,transformOrigin:crop?crop.centre:undefined,filter}}><NativeSource/></div>;
  } else {
    const href=urls[Math.max(0,Math.min(urls.length-1,shot.still?0:source))];
    media=<svg data-eo-footage={shot.id} style={{position:'absolute',inset:0,width:'100%',height:'100%',overflow:'hidden',transform:`scale(${push})`,filter}}>
      <image href={href} width="100%" height="100%" preserveAspectRatio="xMidYMid slice"/></svg>;
  }
  if(inset){const b=shot.box;
    return <div style={{position:'absolute',left:b.x,top:b.y,width:b.w,height:b.h,borderRadius:b.r||36,overflow:'hidden'}}>{media}</div>;}
  return <div style={{position:'absolute',inset:0,overflow:crop?'visible':'hidden'}}>{media}</div>;
}
const SOURCE_FIT_CSS=['cover','fill'].map(fit=>`[data-eo-native-source-fit="${fit}"] canvas,[data-eo-native-source-fit="${fit}"] video,`+
  `[data-eo-native-source-fit="${fit}"] img{width:100%!important;height:100%!important;object-fit:${fit}!important;object-position:center!important;}`).join('');

export function nativeExecution(data:any) {
  const ex=sceneExecution(data),part=data.nativePartition;
  const clear=(bs:any[])=>bs.map((b:any)=>({...b,color:'transparent',print:null,texture:0,fleck:null}));
  if(data.nativeTransparent)return {...ex,footage:[],screen:null,screenSpans:[],backgrounds:clear(ex.backgrounds)};
  if(part)return {...ex,sceneId:ex.sceneId+'-native-'+part.id,footage:[],layers:ex.layers.filter((l:any)=>part.layerIds.includes(l.id)),
    backgrounds:part.kind==='ground'?ex.backgrounds:clear(ex.backgrounds)};
  return ex;
}

export function SceneFrame({frame:videoFrame,data}:{frame:number,data:any}) {
  const ex=nativeExecution(data),part=data.nativePartition;
  const frame=cadenceFrame(videoFrame,ex.cadence,ex.fps);
  const cam=cameraAt(ex.camera,frame),pivot=ex.camera?.pivot||{x:540,y:960};
  const bg=[...ex.backgrounds].reverse().find((b:any)=>frame>=b.from)||ex.backgrounds[0];
  const patternId=idFor(ex,'legacy-print');
  const at=(layer:any)=>layer.cadence==='ones'?videoFrame:frame;
  const screenOn=ex.screen&&(!ex.screenSpans||ex.screenSpans.some((sp:any)=>videoFrame>=sp.from&&videoFrame<sp.to));
  const shotNow=(ex.footage||[]).find((f:any)=>videoFrame>=f.from&&videoFrame<f.to);
  const sc=shotNow?.screen==='footage'&&ex.footageScreen?ex.footageScreen:ex.screen;
  const toned=screenOn&&(sc.highlights||part?.kind==='foreground'),tonedId=idFor(ex,'toned-screen');
  const hole=(ex.footage||[]).find((f:any)=>f.clean&&videoFrame>=f.from&&videoFrame<f.to)?.box;
  const crop=data.Source&&data.cropWindow?cropGeometry(data.cropWindow):null;
  return <div style={{position:'absolute',inset:0,overflow:crop?'visible':'hidden',background:bg.color||'#000'}}>
    <style>{data.fontCss}</style>
    {data.Source&&<style>{SOURCE_FIT_CSS}</style>}
    {toned&&<svg width={0} height={0} style={{position:'absolute'}}><defs><TonedScreen id={tonedId} sc={sc} hole={hole}
      preserveAlpha={part?.kind==='foreground'} region={crop?.frame}/></defs></svg>}
    {}
    <div style={{position:'absolute',inset:0,filter:toned?`url(#${tonedId})`:undefined}}>
    <svg width={1080} height={1920} style={{position:'absolute',inset:0}}>
      <PrintDefinitions ex={ex}/>
      <defs><pattern id={patternId} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(23)">
        <circle cx="3.5" cy="3.5" r="1.15" fill={bg.ink||'#111612'}/>
      </pattern>
        {(ex.footage||[]).filter((f:any)=>f.gamma).map((f:any)=><FootageGamma key={f.id} id={idFor(ex,f.id+'-gamma')} gamma={f.gamma}/>)}
        {(ex.footage||[]).filter((f:any)=>f.grade).map((f:any)=><FootageGrade key={f.id+'-grade'} id={idFor(ex,f.id+'-grade')} grade={f.grade}/>)}
      </defs>
      <rect width={1080} height={1920} fill={bg.color||'#000'}/>{}
      <rect width={1080} height={1920} fill={bg.print?`url(#${idFor(ex,'bg-'+bg.from)})`:`url(#${patternId})`} opacity={bg.print?1:bg.texture||0}/>
      {bg.fleck&&<GroundFleck id={idFor(ex,'fleck-'+bg.from)} fleck={bg.fleck}/>}
    </svg>
    <Footage ex={ex} data={data} frame={frame} videoFrame={videoFrame}/>
    <div style={{position:'absolute',inset:0,transformOrigin:`${pivot.x}px ${pivot.y}px`,
      transform:`translate(${cam.x}px,${cam.y}px) scale(${cam.scale})`}}>
    {ex.layers.filter((l:any)=>at(l)>=l.from&&at(l)<l.to).sort((a:any,b:any)=>a.z-b.z).map((layer:any)=>{
      const frame=at(layer);
      const keyed=layer.colorKeys?[...layer.colorKeys].reverse().find((k:any)=>frame>=k.from)||layer.colorKeys[0]:null;
      const p=poseAt(layer,frame), color=layer.print?`url(#${idFor(ex,layer.id+'-print')})`:(keyed?keyed.color:layer.color)||'#111612';
      const transform=`translate(${p.x}px,${p.y}px) rotate(${p.rotation}deg) scale(${p.scale})`;
      const style:any={position:'absolute',left:0,top:0,transform,transformOrigin:layer.origin||'0 0',
        width:p.width||undefined,height:p.height||undefined,opacity:p.opacity,
        filter:p.blur?`blur(${p.blur}px)`:'none',zIndex:layer.z,pointerEvents:'none'};
      if(layer.kind==='text') {
        return <svg key={layer.id} width={layer.fitWidth||1080} height={layer.size*1.5} style={{...style,overflow:'visible'}}>
          <AnimatedType ex={ex} layer={layer} frame={frame} color={color}/>
        </svg>;
      }
      if(layer.kind==='asset') {
        const g=geometry(layer);
        const sequence=layer.assetSequence;
        const sample=sequence?Math.min(sequence.ids.length-1,Math.floor(Math.max(0,Math.min(frame,sequence.stopFrame)-sequence.startFrame)/sequence.stepFrames)):0;
        const source=data.assets?.[sequence?sequence.ids[sample]:layer.assetId];
        if(g.width&&g.height)return <svg key={layer.id} data-eo-asset={layer.id}
          style={{...style,overflow:'visible'}} viewBox={`0 0 ${g.width} ${g.height}`}>
          {layer.filmFrame&&<><rect x={-7} y={-22} width={g.width+14} height={g.height+44} fill={layer.filmFrame.ink}/>
            {[0,1,2,3,4,5,6,7].flatMap(i=>[-16,g.height+6].map(y=><rect key={i+'-'+y}
              x={10+i*(g.width-28)/8} y={y} width={18} height={10} rx={1.5} fill={layer.filmFrame.paper}/>))}</>}
          <SemanticAssetImage source={source} geometry={g} clip={layer.semanticClip}
            clipId={idFor(ex,layer.id+'-semantic-clip')} materialFilter={layer.material?`url(#${idFor(ex,layer.id+'-material')})`:undefined}/></svg>;
        if(!(p.width&&p.height))return null;
        return <svg key={layer.id} data-eo-asset={layer.id} style={{...style,overflow:'visible'}} width={p.width} height={p.height}>
          <image href={source} width={p.width} height={p.height} preserveAspectRatio="xMidYMid meet"/></svg>;
      }
      if(layer.kind==='triangle') return <svg key={layer.id} style={style} viewBox="0 0 100 100"><path d="M25 10L90 50L25 90Z" fill={color}/></svg>;
      return <svg key={layer.id} style={style}>
        {layer.kind==='ellipse'?<ellipse cx={p.width/2} cy={p.height/2} rx={p.width/2} ry={p.height/2} fill={color}/>
          :<rect width={p.width} height={p.height} fill={color}/>}</svg>;
    })}
    </div>
    </div>
    {screenOn&&!toned&&<CompositeScreen ex={ex} sc={sc} hole={hole}/>}
  </div>;
}

const prefetched=new Map<string,HTMLImageElement>();
export function prefetchImages(urls:string[]|undefined) {
  for(const url of urls||[]){if(prefetched.has(url))continue;const im=new Image();im.decoding='async';im.src=url;prefetched.set(url,im);}
  return prefetched;
}

function CropWindow({win,ground,children}:{win:any,ground?:string,children:any}) {
  const g=cropGeometry(win),ref=React.useRef<HTMLDivElement>(null);
  const [k,setK]=React.useState(g.k);
  React.useLayoutEffect(()=>{
    const w=ref.current?parseFloat(getComputedStyle(ref.current).width):NaN;
    if(w>0&&Math.abs(w/1080-k)>1e-6)setK(w/1080);
  });
  return <div style={{position:'absolute',inset:0,background:ground}}>
    <div ref={ref} style={{position:'absolute',...g.box}}>
      <div style={{position:'absolute',left:0,top:0,width:1080,height:1920,transform:`scale(${k})`,transformOrigin:'0 0'}}>{children}</div>
    </div></div>;
}

export function NativeFrame({frame,data,Source}:{frame:number,data:any,Source?:any}) {
  const d=Source?{...data,Source}:data;
  if(!(Source&&data.cropWindow))return <SceneFrame frame={frame} data={d}/>;
  const ex=nativeExecution(data),f=cadenceFrame(frame,ex.cadence,ex.fps);
  const bg=[...ex.backgrounds].reverse().find((b:any)=>f>=b.from)||ex.backgrounds[0];
  return <CropWindow win={data.cropWindow} ground={bg?.color}><SceneFrame frame={frame} data={d}/></CropWindow>;
}

export default function EOScene({data,Source}:{data:any,Source?:any}) {
  prefetchImages(data.prefetch);
  const [handle]=React.useState(()=>delayRender('EO print materials and fonts'));
  React.useEffect(()=>{Promise.all([
    Promise.all(materialImageUris(data).map(src=>new Promise<void>((resolve,reject)=>{
      const im=new Image();im.onload=()=>resolve();im.onerror=()=>reject(new Error('EO material image failed'));im.src=src;}))),
    Promise.all((data.fontLoads||[]).map((font:string)=>document.fonts.load(font))).then(()=>document.fonts.ready),
  ]).then(()=>continueRender(handle)).catch(cancelRender);},[data,handle]);
  return <NativeFrame frame={useCurrentFrame()+(data.nativeFrameOffset||0)} data={data} Source={Source}/>;
}
