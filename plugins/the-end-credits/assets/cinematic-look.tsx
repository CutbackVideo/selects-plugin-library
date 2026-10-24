// THE END Credits "Cinematic look": a calm, cool teal grade like the reference's footage. At strength 1:
// - warm hues (reds, oranges, yellows) lose up to 45 % of their saturation, weighted by how warm the pixel is
//   (a mask from R - B), so a sunset is muted while skin, which is only mildly warm, keeps most of its colour;
// - overall saturation -12 %;
// - teal/cyan shadows and mids (red down, green and blue up) and soft, slightly cool highlights; nothing is pushed warm.
// data.strength 0-1 (default 0.5); 0 leaves the picture untouched. Pure black stays black and pure white stays white:
// the tone curves are 0 at both ends of every channel. It sits before "Shot frame" on the same clip, so it only
// grades the source, never the black surround.
import React from "react";
import { AbsoluteFill } from "remotion";

// render-color-filter:start
// RGB-only grades share a stable source surface and preserve original coverage.
// The caller owns its color policy and supplies a graph from input to output.
function useColorFilter(React,{AbsoluteFill,Source,children,idPrefix,enabled,render}){
 // React's document identity is independent of settings and compiled programs.
 // Older React callers retain an entropy-backed per-mount fallback, not a module
 // counter that can restart when a second independently compiled program loads.
 const token=typeof React.useId==='function'?React.useId():React.useMemo(()=>{
  if(!globalThis.crypto?.getRandomValues)throw Error('Color filter identity is unavailable.');
  return Array.from(globalThis.crypto.getRandomValues(new Uint32Array(4)),n=>n.toString(16).padStart(8,'0')).join('');
 },[]);
 const id=idPrefix+'-'+Array.from(token,c=>c.codePointAt(0).toString(16)).join('-');
 const h=React.createElement,input='colorInput',output='colorOutput';
 return h(AbsoluteFill,null,
  h('svg',{width:0,height:0,'aria-hidden':true,style:{position:'absolute',width:0,height:0}},
   h('defs',null,enabled?h('filter',{id,x:0,y:0,width:'100%',height:'100%',colorInterpolationFilters:'sRGB'},
    // Color matrices read unpremultiplied RGB. Grade an opaque copy so arithmetic
    // additions cannot multiply the source alpha or darken translucent colors.
    h('feColorMatrix',{in:'SourceGraphic',type:'matrix',values:'1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0 1',result:input}),
    render(input,output),
    h('feComposite',{in:output,in2:'SourceGraphic',operator:'in'})
   ):null)),
  // Keep both container positions even when disabled. Only the filter changes;
  // the original Source/children stay mounted until their real owner retires.
  h(AbsoluteFill,{style:enabled?{filter:'url(#'+id+')'}:undefined},Source?h(Source):children)
 );
}
// render-color-filter:end


// tec-look:start
const TEC_LOOK_DEFAULT = 0.5;
// Tone at strength 1, per channel (r, g, b): the shadow/mid shift peaks at v = 1/3, the highlight shift at v = 3/4.
const TEC_LOOK_SHADOW = [-0.05, 0.012, 0.035];
const TEC_LOOK_HIGHLIGHT = [-0.03, -0.01, 0.005];
const TEC_LOOK_DESAT = 0.12;      // overall saturation -12 % at strength 1
const TEC_LOOK_WARM_DESAT = 0.45; // extra saturation cut on fully warm pixels at strength 1
// Warm mask m = clamp(WARM_GAIN * (r - b) - WARM_OFFSET): 0 for neutral and cool pixels, ~0.2 for skin, 1 for a
// saturated orange.
const TEC_LOOK_WARM_GAIN = 1.6;
const TEC_LOOK_WARM_OFFSET = 0.4;
const TEC_LOOK_SAMPLES = 33;      // feComponentTransfer table size

function tecLookStrength(strength) {
  const s = typeof strength === "number" ? strength : Number(strength);
  return isFinite(s) ? Math.max(0, Math.min(1, s)) : TEC_LOOK_DEFAULT;
}
function tecLookClamp(v) { return Math.max(0, Math.min(1, v)); }

// The per-channel tone curve, channel i (0 r, 1 g, 2 b), value v in 0-1. The shadow weight 27/4 v (1 - v)^2 peaks
// at v = 1/3 and the highlight weight 256/27 v^3 (1 - v) at v = 3/4; both are 0 at v = 0 and v = 1.
function tecLookChannel(i, v, strength) {
  const s = tecLookStrength(strength), x = tecLookClamp(Number(v) || 0);
  if (s === 0) return x;
  const ws = 6.75 * x * Math.pow(1 - x, 2), wh = (256 / 27) * Math.pow(x, 3) * (1 - x);
  return tecLookClamp(x + s * (TEC_LOOK_SHADOW[i] * ws + TEC_LOOK_HIGHLIGHT[i] * wh));
}

// The feColorMatrix "saturate" matrix (SVG 1.1 coefficients) for saturation t: 20 numbers.
function tecLookSaturation(t) {
  return [
    0.213 + 0.787 * t, 0.715 - 0.715 * t, 0.072 - 0.072 * t, 0, 0,
    0.213 - 0.213 * t, 0.715 + 0.285 * t, 0.072 - 0.072 * t, 0, 0,
    0.213 - 0.213 * t, 0.715 - 0.715 * t, 0.072 + 0.928 * t, 0, 0,
    0, 0, 0, 1, 0,
  ];
}
// Overall saturation 1 - 0.12 * strength.
function tecLookSaturateMatrix(strength) { return tecLookSaturation(1 - TEC_LOOK_DESAT * tecLookStrength(strength)); }
// The desaturated copy that warm pixels blend towards: saturation 1 - 0.45 * strength.
function tecLookWarmMatrix(strength) { return tecLookSaturation(1 - TEC_LOOK_WARM_DESAT * tecLookStrength(strength)); }
// The warm mask (keep = false) or its complement (keep = true) in r, g and b, alpha 1: 20 numbers. The complement is
// built by the matrix itself (clamp(1 - x) = 1 - clamp(x)), so the blend never needs a subtraction, which the
// premultiplied arithmetic composite would clamp.
function tecLookMaskMatrix(keep) {
  const a = TEC_LOOK_WARM_GAIN, o = TEC_LOOK_WARM_OFFSET;
  const row = keep ? [-a, 0, a, 0, 1 + o] : [a, 0, -a, 0, -o];
  return [...row, ...row, ...row, 0, 0, 0, 0, 1];
}

function tecLookApply(m, c) {
  return [0, 1, 2].map(r => tecLookClamp(m[r * 5] * c[0] + m[r * 5 + 1] * c[1] + m[r * 5 + 2] * c[2] + m[r * 5 + 4]));
}

// One opaque pixel through the whole filter, as it applies it in sRGB with every primitive clamped to 0-1:
// warm mask blend (source x (1 - m) + warm-desaturated x m), overall saturation, then the tone curves.
function tecLookPixel(rgb, strength) {
  const s = tecLookStrength(strength);
  const c = [0, 1, 2].map(i => tecLookClamp(Number(rgb[i]) || 0));
  const keep = tecLookApply(tecLookMaskMatrix(true), c)[0], mask = tecLookApply(tecLookMaskMatrix(false), c)[0];
  const muted = tecLookApply(tecLookWarmMatrix(s), c);
  const blended = c.map((v, i) => tecLookClamp(v * keep + muted[i] * mask));
  const d = tecLookApply(tecLookSaturateMatrix(s), blended);
  return d.map((v, i) => tecLookChannel(i, v, s));
}

// The feComponentTransfer tableValues for channel i (the tone curve sampled at 33 points).
function tecLookTable(i, strength) {
  const out = [];
  for (let n = 0; n < TEC_LOOK_SAMPLES; n++) out.push(Number(tecLookChannel(i, n / (TEC_LOOK_SAMPLES - 1), strength).toFixed(5)));
  return out;
}
// tec-look:end

const fmt = (m) => m.map((v) => v.toFixed(5)).join(" ");

export default function CinematicLook({ Source, children, data }) {
  const s = tecLookStrength(data?.strength);
  return useColorFilter(React,{AbsoluteFill,Source,children,idPrefix:"tec-cinematic-look",enabled:s !== 0,render:(input,output)=>{
    return (
      <>
        <feColorMatrix in={input} type="matrix" values={fmt(tecLookWarmMatrix(s))} result="warmMuted" />
        <feColorMatrix in={input} type="matrix" values={fmt(tecLookMaskMatrix(false))} result="warmMask" />
        <feColorMatrix in={input} type="matrix" values={fmt(tecLookMaskMatrix(true))} result="keepMask" />
        <feComposite in={input} in2="keepMask" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result="kept" />
        <feComposite in="warmMuted" in2="warmMask" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result="muted" />
        <feComposite in="kept" in2="muted" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="blended" />
        <feColorMatrix in="blended" type="matrix" values={fmt(tecLookSaturateMatrix(s))} result="desaturated" />
        <feComponentTransfer in="desaturated" result={output}>
          <feFuncR type="table" tableValues={tecLookTable(0, s).join(" ")} />
          <feFuncG type="table" tableValues={tecLookTable(1, s).join(" ")} />
          <feFuncB type="table" tableValues={tecLookTable(2, s).join(" ")} />
        </feComponentTransfer>
      </>
    );
  }});
}
