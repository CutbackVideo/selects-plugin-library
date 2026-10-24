// Mini Vlog soft look: a slight shadow lift, a little less contrast and a touch of pink in the highlights only.
// Strength 0 leaves the picture untouched. The grade is an inline SVG filter evaluated in sRGB 0-1; mvSoftMap below
// is the exact per-pixel maths of that filter chain (tests/look.test.cjs samples it).
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


// mv-soft:start
// Rec.709 luma weights, applied to sRGB values (the filter runs with color-interpolation-filters sRGB).
const MV_SOFT_LUMA = [0.2126, 0.7152, 0.0722];
// Highlight tint per channel, relative to warmth: toward the title pink #F7C8E6 (R most, B some, G none).
const MV_SOFT_TINT = [1, 0, 0.55];

function mvSoftClamp01(x) {
  return Math.max(0, Math.min(1, x));
}

// Attribute precision: the spec numbers are rounded once here so the filter and mvSoftMap use the same values.
function mvSoftRound(x) {
  return Number(x.toFixed(6));
}

// strength 0-1 -> grade parameters. 0 is neutral everywhere.
function mvSoftParams(strength) {
  const s = mvSoftClamp01(Number(strength) || 0);
  return {
    lift: 0.006 * s,          // extra black-point lift on top of the contrast pivot
    contrast: 1 - 0.08 * s,   // -8 % at full strength, pivoted at 0.5
    warmth: 0.1 * s,          // red added at luma 1 (scaled by MV_SOFT_TINT per channel)
    pinkThreshold: 0.6,       // no tint at or below this luma
  };
}

// The filter's attribute numbers, or null when there is nothing to do (strength 0 renders no filter at all).
// grade: feComponentTransfer type="linear" on R, G, B of the source.
// luma: feColorMatrix rows that write the source luma into R, G and B.
// tint: feComponentTransfer type="linear" per channel on that luma: max(0, slope * (L - threshold)).
// The graded image and the tint are summed by feComposite operator="arithmetic" k2=1 k3=1.
function mvSoftSpec(strength) {
  const p = mvSoftParams(strength);
  if (p.lift === 0 && p.contrast === 1 && p.warmth === 0) return null;
  const k = p.warmth / (1 - p.pinkThreshold);
  return {
    grade: { slope: mvSoftRound(p.contrast), intercept: mvSoftRound((1 - p.contrast) * 0.5 + p.lift) },
    luma: MV_SOFT_LUMA,
    tint: MV_SOFT_TINT.map(t => ({ slope: mvSoftRound(k * t), intercept: mvSoftRound(-k * t * p.pinkThreshold) })),
  };
}

// (r, g, b) 0-1 -> (r, g, b) 0-1, exactly as the filter chain computes it: every primitive clamps its output to
// 0-1 and the arithmetic composite clamps the sum. Assumes an opaque pixel (alpha 1), so premultiplied = straight.
function mvSoftMap(r, g, b, strength) {
  const spec = mvSoftSpec(strength);
  if (!spec) return [r, g, b];
  const src = [r, g, b];
  const L = mvSoftClamp01(spec.luma[0] * r + spec.luma[1] * g + spec.luma[2] * b);
  return src.map((c, i) => {
    const graded = mvSoftClamp01(spec.grade.slope * c + spec.grade.intercept);
    const tint = mvSoftClamp01(spec.tint[i].slope * L + spec.tint[i].intercept);
    return mvSoftClamp01(graded + tint);
  });
}
// mv-soft:end

export default function SoftLook({ Source, children, data }) {
  const strength = typeof data?.strength === "number" ? data.strength : 0.35;
  const spec = mvSoftSpec(strength);
  return useColorFilter(React,{AbsoluteFill,Source,children,idPrefix:"mv-soft-look",enabled:!!spec,render:(input,output)=>{
    const lumaRow = `${spec.luma.join(" ")} 0 0`;
    const g = spec.grade, t = spec.tint;
    return (
      <>
        <feComponentTransfer in={input} result="graded">
          <feFuncR type="linear" slope={g.slope} intercept={g.intercept} />
          <feFuncG type="linear" slope={g.slope} intercept={g.intercept} />
          <feFuncB type="linear" slope={g.slope} intercept={g.intercept} />
        </feComponentTransfer>
        <feColorMatrix in={input} type="matrix" values={`${lumaRow} ${lumaRow} ${lumaRow} 0 0 0 1 0`} result="luma" />
        <feComponentTransfer in="luma" result="tint">
          <feFuncR type="linear" slope={t[0].slope} intercept={t[0].intercept} />
          <feFuncG type="linear" slope={t[1].slope} intercept={t[1].intercept} />
          <feFuncB type="linear" slope={t[2].slope} intercept={t[2].intercept} />
        </feComponentTransfer>
        <feComposite in="graded" in2="tint" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result={output} />
      </>
    );
  }});
}
