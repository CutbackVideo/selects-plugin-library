import React from 'react';

// Shared by template preview and exported graphics. Coordinates use a 1280x720 canvas.
export default function LandscapeGraphic({data:d}:any) {
  const W=1280,H=720,L=d.landscape,part=d.designElement||'all';
  const show=(key:string)=>part==='all'||part===key;
  const font=(f:string)=>f?`"${f}", sans-serif`:'"Pretendard","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
  const bg=d.background||'#202329', x=L.videoX,y=L.videoY,w=L.videoWidth,h=w*9/16;
  const textStyle={fontFamily:font(d.fontFamily),textAlign:'center' as const,whiteSpace:'pre-wrap' as const,overflowWrap:'anywhere' as const};
  const fit=(text:string,size:number,width:number)=>Math.min(size,width/Math.max(1,Array.from(text).reduce((n,c)=>n+(/[\u3000-\u9fff\uac00-\ud7ff]/.test(c)?1:c===' '?.3:.6),0)));
  const backgroundStyle={background:bg,backgroundSize:`${W}px ${H}px`,...(d.backgroundImage?{backgroundImage:`url(${d.backgroundImage})`}:{})};
  const band=(left:number,top:number,width:number,height:number)=><div style={{position:'absolute',left,top,width,height,...backgroundStyle,backgroundPosition:`${-left}px ${-top}px`}}/>;
  const title=String(d.headline1??L.title??''),source=String(d.sourceText??L.source??'');
  const speaker=String(d.speakerText||''),text=String(d.text||'').replace(/\*/g,'');
  const lines=text.split('\n'),size=Math.min(Number(d.fontSize||44),...lines.map(t=>fit(t,Number(d.fontSize||44),L.captionWidth-36)),(L.captionHeight-16)/(Math.max(1,lines.length)*1.2));
  return <div style={{position:'absolute',width:W,height:H,pointerEvents:'none'}}>
    {show('background')&&<>{band(0,0,W,y)}{band(0,y,x,h)}{band(x+w,y,W-x-w,h)}{band(0,y+h,W,H-y-h)}</>}
    {(show('headline1')||show('source'))&&<div style={{position:'absolute',left:L.headerX,top:L.headerY,width:L.headerWidth,height:L.headerHeight,background:show('headline1')?'rgba(0,0,0,.85)':'transparent',borderRadius:20,...textStyle}}>
      {show('headline1')&&<div style={{padding:'3px 8px',fontSize:fit(title,d.headlineSize1||34,L.headerWidth-16),fontWeight:800,color:d.headlineColor1||'#FFD400'}}>{title}</div>}
      {show('source')&&<div style={{position:'absolute',left:8,right:8,bottom:3,fontSize:fit(source,L.sourceSize,L.headerWidth-16),fontWeight:700,color:'#FFFFFF'}}>{source}</div>}
    </div>}
    {show('caption')&&text&&<div style={{position:'absolute',left:L.captionX,top:L.captionY,width:L.captionWidth,height:L.captionHeight,background:d.boxColor||'#000000',display:'flex',alignItems:'center',justifyContent:'center',padding:'8px 18px',boxSizing:'border-box',...textStyle,fontSize:size,fontWeight:d.fontWeight||400,lineHeight:1.2,color:d.textColor||'#FFFFFF'}}>{text}</div>}
    {show('speaker')&&speaker&&<div style={{position:'absolute',left:L.speakerX,top:L.speakerY,maxWidth:L.captionWidth-20,height:L.speakerHeight,padding:'0 26px',boxSizing:'border-box',borderRadius:L.speakerHeight/2,background:d.speakerColor||'#FFD400',color:'#000000',display:'flex',alignItems:'center',...textStyle,fontWeight:600,fontSize:fit(speaker,L.speakerSize,L.captionWidth-72),whiteSpace:'nowrap'}}>{speaker}</div>}
  </div>;
}
