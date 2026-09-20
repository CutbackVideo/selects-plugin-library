import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';

// Editable, photo-first typography. No flattened footage is generated.
export default function PlaceStoryType({data}) {
  const frame = useCurrentFrame();
  const {width, height, fps, durationInFrames} = useVideoConfig();
  const wide = width > height;
  const scale = wide ? height / 720 : width / 720;
  const margin = (wide ? 48 : 56) * scale;
  const smooth = n => { const t = Math.max(0, Math.min(1, n)); return t*t*(3-2*t); };
  const enter = smooth(frame / Math.max(1, fps * 0.3));
  const exit = smooth((durationInFrames - 1 - frame) / Math.max(1, fps * 0.2));
  const opacity = Math.min(enter, exit);
  const accent = data.accent || '#d8c6aa';
  const title = String(data.title || 'Untitled place');
  const description = String(data.description || '');
  const intro = data.kind === 'intro';
  const titleSize = intro ? (title.length > 26 ? 78 : 102) : (title.length > 42 ? 46 : title.length > 26 ? 54 : 66);
  const maxWidth = wide ? width * 0.69 : width - margin * 2;
  const textY = intro ? height * 0.39 : undefined;
  const bottom = intro ? undefined : (wide ? 48 : 148) * scale;
  const fade = Number(data.contrast ?? 0.72);
  return <div style={{position:'absolute', inset:0, overflow:'hidden'}}>
    <div style={{position:'absolute', inset:0, background:intro
      ? `linear-gradient(180deg, rgba(8,12,14,${fade*0.08}) 0%, rgba(8,12,14,${fade*0.44}) 47%, rgba(8,12,14,${fade*0.8}) 100%)`
      : `linear-gradient(180deg, rgba(8,12,14,0) 37%, rgba(8,12,14,${fade*0.2}) 61%, rgba(8,12,14,${fade}) 100%)`}} />
    <div style={{position:'absolute', left:margin, top:textY, bottom, width:maxWidth,
      opacity, transform:`translateY(${(1-enter)*12*scale}px)`, color:'#faf9f6', textAlign:'left'}}>
      <div style={{display:'flex', alignItems:'center', gap:12*scale, marginBottom:18*scale,
        fontFamily:'Arial', fontWeight:500, fontSize:17*scale, letterSpacing:3.2*scale, lineHeight:1.3}}>
        <span style={{width:30*scale, height:1*scale, background:accent, flexShrink:0}} />
        <span style={{color:accent}}>{intro ? (data.eyebrow || 'A FIELD GUIDE') : String(data.index || 1).padStart(2,'0') + ' / ' + String(data.count || 1).padStart(2,'0')}</span>
      </div>
      <div style={{fontFamily:data.titleFont || 'Georgia', fontWeight:400,
        fontSize:titleSize*scale, letterSpacing:-1.8*scale, lineHeight:1.04,
        whiteSpace:'pre-line', overflowWrap:'break-word'}}>{title}</div>
      {description && <div style={{fontFamily:'Arial', fontWeight:400, fontSize:(intro ? 25 : 26)*scale,
        lineHeight:1.38, letterSpacing:0.05*scale, color:'rgba(250,249,246,0.82)',
        maxWidth:wide ? maxWidth*0.82 : maxWidth, marginTop:18*scale,
        whiteSpace:'pre-line'}}>{description}</div>}
    </div>
  </div>;
}
