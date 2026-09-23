import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';

// Travel-list typography measured from the Place Count gallery preview:
// gold Times place titles numbered "1. Name", a short white line beneath,
// centred in the upper third with a soft drop shadow and no backing panel,
// and a curved "N Places to Visit" opening over the city name. Every value
// below is an editable parameter of this graphic; no footage is flattened.
export default function PlaceCountTitle({data}) {
  const frame = useCurrentFrame();
  const {width, height, fps, durationInFrames} = useVideoConfig();
  const wide = width > height;
  // Measurements are in the reference's 720x1280 frame. A landscape frame
  // keeps the same type proportions against its shorter side.
  const s = wide ? (height / 720) * 0.8 : width / 720;
  const f = frame * 30 / fps;
  const intro = data.kind === 'intro';
  // Each title lands on its cut, which is on the beat, and clears before the
  // next one: half a beat of the 92 BPM theme early for a place, six frames
  // for the opening. No fades.
  const delay = Number(data.delayFrames ?? 0);
  const clear = Number(data.clearFrames ?? (intro ? 6 : 0.5 * 60 / 92 * 30));
  if (f < delay || f >= durationInFrames * 30 / fps - clear) return null;

  const family = data.titleFont || 'Times New Roman';
  const yellow = data.accent || '#f8d103';
  const white = '#ffffff';
  // A tight drop shadow for the letter edges plus a wide soft glow, so the
  // titles stay readable over sky and other bright footage without a panel.
  const shadow = `0 ${s}px ${2 * s}px rgba(0,0,0,0.7), 0 0 ${6 * s}px rgba(0,0,0,0.55), 0 0 ${16 * s}px rgba(0,0,0,0.35)`;
  const title = String(data.title || '');
  const note = String(data.description || '');

  if (intro) {
    // Vertical positions are the reference's, re-centred for landscape.
    const top = wide ? height / 2 - 150 * s : 218 * s;
    const count = Number(data.count || 0);
    return <div style={{position:'absolute', inset:0, fontFamily:family, fontWeight:400,
      textAlign:'center', color:white, textShadow:shadow}}>
      <svg viewBox="0 0 720 230" style={{position:'absolute', top, left:'50%',
        transform:'translateX(-50%)', width:720 * s, height:230 * s, overflow:'visible'}}>
        <defs><path id="place-count-arc" d="M 96 198 Q 360 -35 624 198"/></defs>
        <text fill={yellow} fontSize="65" fontFamily={family} fontWeight="400">
          <textPath href="#place-count-arc" startOffset="50%" textAnchor="middle">
            {count > 0 ? `${count} Places to Visit` : 'Places to Visit'}
          </textPath>
        </text>
      </svg>
      <div style={{position:'absolute', top:top + 101 * s, width:'100%', fontSize:67 * s,
        lineHeight:1, color:yellow}}>in</div>
      <div style={{position:'absolute', top:top + 170 * s, width:'100%', padding:`0 ${28 * s}px`,
        boxSizing:'border-box', fontSize:Math.min(106, 640 / (Math.max(1, title.length) * 0.47)) * s,
        lineHeight:1}}>{title}</div>
      {note && <div style={{position:'absolute', top:top + 293 * s, width:'100%', fontSize:54 * s,
        lineHeight:1, fontStyle:'italic'}}>{note}</div>}
    </div>;
  }

  const prefix = data.index && !/^\d+\./.test(title) ? `${data.index}. ` : '';
  const top = wide ? height * 0.3 : 379 * s;
  return <div style={{position:'absolute', inset:0, boxSizing:'border-box', paddingTop:top,
    fontFamily:family, fontWeight:400, textAlign:'center', textShadow:shadow}}>
    <div style={{fontSize:53 * s, lineHeight:1.04, color:yellow, padding:`0 ${28 * s}px`,
      whiteSpace:'pre-line', overflowWrap:'break-word'}}>{prefix}{title}</div>
    {note && <div style={{fontSize:34 * s, lineHeight:1.12, color:white, padding:`0 ${28 * s}px`,
      marginTop:10 * s, whiteSpace:'pre-line', overflowWrap:'break-word'}}>{note}</div>}
  </div>;
}
