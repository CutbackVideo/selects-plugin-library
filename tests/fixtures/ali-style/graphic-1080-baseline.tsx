
import React from 'react';
import {useCurrentFrame,useVideoConfig} from 'remotion';
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{x=clamp(x);return 1-Math.pow(1-x,3)};
function cameraAt(f,data) {
  const keys=Array.isArray(data.camera)?data.camera:[];let zoom=1,y=0;
  for(let i=0;i<keys.length;i++) {
    const k=keys[i];if(f<k.at)break;const from=i?keys[i-1]:{zoom:1,y:0};
    const p=1-Math.pow(1-clamp((f-k.at)/Math.max(1,Number(k.frames||1))),3);
    zoom=Number(from.zoom)+(Number(k.zoom)-Number(from.zoom))*p;
    y=Number(from.y||0)+(Number(k.y||0)-Number(from.y||0))*p;
  }
  return {zoom,y};
}
function Camera({children,data,f}) {
  const c=cameraAt(f,data);
  return <div style={{position:'absolute',inset:0,willChange:'transform',transformOrigin:'50.9% 17%',transform:'translateY('+c.y+'%) scale('+c.zoom+')'}}>{children}</div>;
}
export default function Graphic({data}) {
  const frame=useCurrentFrame(),{width,height}=useVideoConfig(),f=frame+Number(data.start||0);
  const enter=ease((f-Number(data.enter||0))/14),exit=1-ease((f-(Number(data.end||f+1)-16))/16);
  const visible=enter*exit, ink='#213b31', gold='#a87824', paper='#eef0e8';
  const items=Array.isArray(data.items)?data.items:[];
  const titleWords=String(data.title||'').trim().split(/\s+/).filter(Boolean).slice(0,7);
  const top=data.kind==='list'?Math.round(height*.13):Math.round(height*.16);
  return <div style={{position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none',opacity:visible}}><Camera data={data} f={f}>
    <div style={{position:'absolute',left:Math.round(width*.07),right:Math.round(width*.07),top,color:ink,textAlign:'center',transform:'translateY('+((1-enter)*34)+'px)'}}>
      <div style={{fontFamily:'Arial,sans-serif',fontSize:Math.round(width*.022),fontWeight:800,letterSpacing:4,color:gold,opacity:ease((f-Number(data.enter||0))/10),marginBottom:18}}>ALI ABDAAL STYLE</div>
      <div style={{fontFamily:'Georgia,serif',fontSize:data.kind==='list'?Math.round(width*.075):Math.round(width*.095),lineHeight:1.02,fontWeight:600,letterSpacing:-2,textShadow:'0 3px 0 rgba(255,255,255,.35)'}}>{titleWords.map((word,i)=>{const p=ease((f-Number(data.enter||0)-i*4)/12);return <span key={i} style={{display:'inline-block',margin:'0 7px',opacity:p,transform:'translateY('+((1-p)*24)+'px)',color:i===titleWords.length-1&&data.kind!=='list'?gold:ink,fontStyle:i===titleWords.length-1?'italic':undefined}}>{word}</span>})}</div>
      {data.body&&<div style={{margin:'24px auto 0',maxWidth:Math.round(width*.82),textAlign:'center',fontFamily:'Georgia,serif',fontStyle:'italic',fontSize:Math.round(width*.038),lineHeight:1.08,color:gold,opacity:ease((f-Number(data.enter||0)-14)/13),transform:'translateY('+(1-ease((f-Number(data.enter||0)-14)/13))*18+'px)'}}>{data.body}</div>}
      {items.length>0&&<div style={{display:'flex',justifyContent:'center',gap:16,marginTop:34,flexWrap:'wrap'}}>{items.slice(0,4).map((item,i)=>{const p=ease((f-Number(data.enter||0)-10-i*4)/14);return <div key={i} style={{background:paper,borderRadius:14,padding:'16px 22px',fontFamily:'Arial,sans-serif',fontWeight:750,fontSize:Math.round(width*.026),boxShadow:'0 10px 26px rgba(20,40,30,.18)',opacity:p,transform:'translateY('+((1-p)*26)+'px) rotate('+((i%2?-1:1)*(1-p)*2.5)+'deg)'}}><span style={{fontSize:Math.round(width*.017),opacity:.48,marginRight:10}}>{String(i+1).padStart(2,'0')}</span>{item}</div>})}</div>}
      <div style={{height:6,width:Math.min(Math.round(width*.64),Math.max(180,String(data.title||'').length*20)),margin:'26px auto 0',background:gold,borderRadius:6,transformOrigin:'center',transform:'scaleX('+ease((f-Number(data.enter||0)-22)/16)+')'}} />
    </div>
  </Camera></div>;
}
