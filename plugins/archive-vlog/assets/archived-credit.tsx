// Archive Vlog credit: "<prefix> <name>" (e.g. "ARCHIVED BY YOURNAME"), centred, static, over the second shot.
import React, { useMemo } from "react";
import { AbsoluteFill, continueRender, delayRender, cancelRender, useVideoConfig } from "remotion";

// av-credit:start
// Pure layout, shared with the panel preview (which evaluates this block as plain JS). Measured with the per-font
// advance table from presets.json passed in `data.fonts[i].metrics`. Reference (1920x1080): Oswald Bold-like caps,
// cap height 25 px, centred on the frame.
var AVC_FACE = { family: "AV Oswald Bold", weight: 700 };
var AVC_CAP = 25 / 1080;
var AVC_FIT = 0.8; // max width, fraction of canvas width
var AVC_DEFAULTS = { prefix: "ARCHIVED BY", name: "YOURNAME", color: "#FFFFFF" };
var AVC_FALLBACK_METRICS = { unitsPerEm: 1000, xHeight: 500, capHeight: 700, ascent: 720, descent: -220, advances: {} };
// Korean names: no uppercase or tracking, both Korean system faces in the stack. Wide characters are drawn in the
// system Korean face ("Apple SD Gothic Neo" / "Malgun Gothic"), so the render and the panel measure them with a canvas
// (avcKoMeasure) and pass `data.koInk` ({ up, down } em) and `data.koAdvances` ({ char: em }). Without them (Node) a
// wide character counts as 1 em, its ink 0.86 em up and 0.12 em down (tuned on Apple SD Gothic Neo).
var AVC_HANGUL_RE = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/;
var AVC_WIDE_RE = /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]/;
var AVC_WIDE_UP = 0.86, AVC_WIDE_DOWN = 0.12;
function avcFontStack(family) {
  return '"' + family + '", "Arial Narrow", Impact, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
}
function avcKoWide(data) {
  var ink = data.koInk, adv = data.koAdvances;
  var ok = ink && typeof ink.up === "number" && typeof ink.down === "number" && ink.up > 0.3 && ink.up < 1.5 && ink.down >= 0 && ink.down < 0.6;
  return { up: ok ? ink.up : AVC_WIDE_UP, down: ok ? ink.down : AVC_WIDE_DOWN, adv: adv && typeof adv === "object" ? adv : null };
}
function avcKoAdvance(kw, ch) {
  var a = kw.adv ? kw.adv[ch] : undefined;
  return typeof a === "number" && isFinite(a) && a > 0.2 && a < 2 ? a : 1;
}
// The credit's text as drawn, or "" when empty: Latin in capitals even next to Hangul (Hangul has no case, so it stays
// as typed), e.g. "ARCHIVED BY KIM <Korean name>".
function avcFullText(data) {
  var text = [avcText(data, "prefix"), avcText(data, "name")].filter(Boolean).join(" ");
  return text.toUpperCase();
}
// Measures the wide glyphs on a 2D canvas with the exact stack and weight the credit draws them with (call it once
// the fonts are loaded): { koInk, koAdvances } to merge into `data`, or null in Node or without a wide glyph.
function avcKoMeasure(data) {
  data = data || {};
  var text = avcFullText(data);
  if (!AVC_WIDE_RE.test(text) || typeof document === "undefined" || !document.createElement) return null;
  var ctx = null;
  try { ctx = document.createElement("canvas").getContext("2d"); } catch (e) { ctx = null; }
  if (!ctx || typeof ctx.measureText !== "function") return null;
  var px = 100;
  ctx.font = (AVC_HANGUL_RE.test(text) ? 700 : AVC_FACE.weight) + " " + px + "px " + avcFontStack(AVC_FACE.family);
  // Built in one literal at the end (the panel type-checks this block: no keys added later). Object({}) is an
  // untyped map for the per-character advances.
  var s = ctx.measureText("\ud55c\uae00");
  var ink = s && s.actualBoundingBoxAscent > 0 && s.actualBoundingBoxDescent >= 0 ? { up: s.actualBoundingBoxAscent / px, down: s.actualBoundingBoxDescent / px } : null;
  var adv = Object({}), chars = Array.from(text);
  for (var i = 0; i < chars.length; i++) {
    if (AVC_WIDE_RE.test(chars[i]) && !(chars[i] in adv)) adv[chars[i]] = ctx.measureText(chars[i]).width / px;
  }
  return ink ? { koAdvances: adv, koInk: ink } : { koAdvances: adv };
}
function avcNum(v, d, lo, hi) { return typeof v === "number" && isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; }
// Each of prefix and name is cut to AVC_MAX width units (a wide character counts 2), as the panel's fields count
// them: Adjust edits never pass the panel's limit.
var AVC_MAX = 24;
function avcClip(text) {
  var out = "", n = 0, chars = Array.from(String(text));
  for (var i = 0; i < chars.length; i++) {
    var w = AVC_WIDE_RE.test(chars[i]) ? 2 : 1;
    if (n + w > AVC_MAX) break;
    out += chars[i]; n += w;
  }
  return out;
}
function avcText(data, key) {
  var v = typeof data[key] === "string" ? data[key] : AVC_DEFAULTS[key];
  return avcClip(String(v).replace(/\s+/g, " ").trim()).trim();
}

// { text, x (left), y (baseline), size, w, color, family, weight, stack, box } or null when there is no text.
function avCreditLayout(data, width, height) {
  data = data || {};
  var W = width > 0 ? width : 1920, H = height > 0 ? height : 1080;
  var text = avcFullText(data);
  if (!text) return null;
  var ko = AVC_HANGUL_RE.test(text), kw = avcKoWide(data);
  var m = null, fonts = Array.isArray(data.fonts) ? data.fonts : [];
  for (var i = 0; i < fonts.length; i++) if (fonts[i] && fonts[i].family === AVC_FACE.family && fonts[i].metrics) m = fonts[i].metrics;
  m = m || AVC_FALLBACK_METRICS;
  var size = (AVC_CAP * H * (avcNum(data.size, 100, 60, 200) / 100)) / (m.capHeight / m.unitsPerEm);
  var units = 0, chars = Array.from(text);
  for (var j = 0; j < chars.length; j++) {
    var a = m.advances[chars[j]];
    units += typeof a === "number" ? a : (AVC_WIDE_RE.test(chars[j]) ? avcKoAdvance(kw, chars[j]) : 0.56) * m.unitsPerEm;
  }
  var w = (units * size) / m.unitsPerEm;
  // Shrink a long name to the fit width.
  if (w > AVC_FIT * W) { size *= (AVC_FIT * W) / w; w = AVC_FIT * W; }
  var up = Math.max(m.capHeight / m.unitsPerEm, AVC_WIDE_RE.test(text) ? kw.up : 0);
  var down = Math.max(/[gjpqy,;()[\]{}|]/.test(text) ? -m.descent / m.unitsPerEm : 0, AVC_WIDE_RE.test(text) ? kw.down : 0);
  // The ink box is centred on (x %, y %) of the canvas.
  var cx = (avcNum(data.x, 50, 10, 90) / 100) * W, cy = (avcNum(data.y, 50, 10, 90) / 100) * H;
  var x = cx - w / 2, y = cy + ((up - down) / 2) * size;
  return { text: text, x: x, y: y, size: size, w: w, hangul: ko, color: typeof data.color === "string" && data.color ? data.color : AVC_DEFAULTS.color,
    family: AVC_FACE.family, weight: ko ? 700 : AVC_FACE.weight, stack: avcFontStack(AVC_FACE.family), box: [x, y - up * size, x + w, y + down * size] };
}
// av-credit:end

const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);

// render-fonts:start
// Render-document font readiness, independent of panel/file/media job lifetimes.
// React and the render gate are supplied by the standalone program's host.
function useRenderFonts(React, options){
 const {fonts=[],wideText='',wideFont='',label='graphic fonts',delayRender,continueRender,cancelRender,timeoutMs=20000}=options??{};
 if(!Array.isArray(fonts)||typeof wideText!=='string'||typeof wideFont!=='string'||typeof label!=='string'||
  !Number.isFinite(timeoutMs)||timeoutMs<1||timeoutMs>2147483647||[delayRender,continueRender,cancelRender].some(fn=>typeof fn!=='function'))throw Error('The graphic font preparation request is invalid.');
 const faces=fonts.map(face=>{
  if(!face||typeof face.family!=='string'||!face.family||typeof face.b64!=='string'||!face.b64||!['string','number'].includes(typeof face.weight)||face.style!==undefined&&typeof face.style!=='string')throw Error('The graphic font source is invalid.');
  return {family:face.family,weight:face.weight,style:face.style||'normal',b64:face.b64};
 });
 const key=JSON.stringify([faces,wideText,wideText?wideFont:'']);
 const needed=faces.length>0||!!wideText;
 const fontSet=typeof document!=='undefined'?document.fonts:null;
 const request=React.useMemo(()=>Object({key}),[key,fontSet,label,timeoutMs,delayRender,continueRender,cancelRender]);
 const [result,setResult]=React.useState(null),owner=React.useRef(null);
 // Allocate only after commit. StrictMode/discarded renders must not leak gates.
 React.useLayoutEffect(()=>{
  if(!needed)return;
  const scope=Object({live:true,settled:false,released:false,handle:null,timer:null,release:null});
  owner.current=scope;
  const issue=(message,cause)=>Object.assign(Error(message),cause?{cause}:{});
  const cancel=error=>{try{cancelRender(error);}catch{/* Remotion records cancellation before throwing. */}};
  const fail=error=>{
   if(!scope.live||scope.settled)return;
   scope.settled=true;clearTimeout(scope.timer);
   cancel(error);setResult({request,error});
  };
  scope.release=()=>{
   if(scope.released||scope.handle===null)return;
   scope.released=true;
   try{continueRender(scope.handle);}catch(cause){const error=issue('The graphic font render gate could not be released.',cause);cancel(error);if(scope.live)setResult({request,error});}
  };
  try{
   const handle=delayRender(label);
   if(typeof handle!=='number'||!Number.isFinite(handle))throw issue('The graphic font render gate is unavailable.');
   scope.handle=handle;
   const load=fontSet?.load;
   if(typeof load!=='function')throw issue('This renderer cannot confirm graphic font readiness.');
   const expires=performance.now()+timeoutMs,expired=()=>issue('The graphic fonts took too long to prepare.');
   scope.timer=setTimeout(()=>fail(expired()),timeoutMs);
   const specs=faces.map(face=>[face.style+' '+face.weight+' 100px "'+face.family+'"']);
   if(wideText)specs.push([wideFont,wideText]);
   // Attach rejection handlers before invoking a host API that can throw.
   const loads=specs.map(args=>Promise.resolve().then(()=>{
    if(!scope.live||scope.settled)return;
    return load.apply(fontSet,args);
   }));
   Promise.all(loads).then(results=>{
    if(!scope.live||scope.settled)return;
    if(performance.now()>=expires){fail(expired());return;}
    if(results.some(value=>!Array.isArray(value)))throw issue('The graphic font readiness result is invalid.');
    scope.settled=true;clearTimeout(scope.timer);setResult({request,error:null});
   }).catch(cause=>fail(issue('The graphic fonts could not be prepared.',cause)));
  }catch(error){fail(error);}
  return ()=>{
   scope.live=false;clearTimeout(scope.timer);scope.release();
   if(owner.current===scope)owner.current=null;
  };
 },[request]);
 const current=result?.request===request?result:null,ready=!needed||!!current&&!current.error;
 // Release after the ready layout/measurement has committed, never on load ack.
 React.useLayoutEffect(()=>{
  if(ready)owner.current?.release();
 },[ready,request]);
 if(current?.error)throw current.error;
 return ready;
}
// render-fonts:end

export default function ArchivedCredit({ data: raw }: { data: any }) {
  const data = (raw || {}) as any;
  const config = useVideoConfig();
  const width = num(config && config.width, 1920);
  const height = num(config && config.height, 1080);
  const fonts: any[] = Array.isArray(data.fonts) ? data.fonts.filter((f: any) => f && f.b64) : [];
  // Wide (Hangul) text is measured on a canvas once the fonts are loaded, so the render waits for that too.
  const fullText = avcFullText(data);
  const wideText = AVC_WIDE_RE.test(fullText) ? fullText : "";
  const ready = useRenderFonts(React, { fonts, wideText,
    wideFont: `700 100px ${avcFontStack(AVC_FACE.family)}`, label: "archive vlog credit fonts",
    delayRender, continueRender, cancelRender,
  });

  // Measured wide-glyph metrics (koInk / koAdvances) once the fonts are in; null for Latin-only text.
  const ko: any = useMemo(() => (ready ? avcKoMeasure(data) : null), [ready, raw]);
  // Static: the layout depends only on the parameters, the measured metrics and the canvas size.
  const c: any = useMemo(() => avCreditLayout(ko ? Object.assign({}, data, ko) : data, width, height), [ko, raw, width, height]);
  const shadow = Math.max(0, Math.min(1, num(data.shadow, 0.3)));
  const fontFaces = fonts.map((f) => `@font-face{font-family:"${f.family}";src:url("data:font/woff2;base64,${f.b64}") format("woff2");font-style:${f.style || "normal"};font-weight:${f.weight};}`).join("");
  return (
    <AbsoluteFill>
      {fontFaces ? <style>{fontFaces}</style> : null}
      {ready && c ? (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", filter: shadow > 0 ? `drop-shadow(0 ${height * 0.002}px ${height * 0.006}px rgba(0,0,0,${shadow}))` : undefined }}>
          <text x={c.x} y={c.y} fill={c.color} fontSize={c.size} fontFamily={c.stack} fontWeight={c.weight} style={{ whiteSpace: "pre", fontKerning: "none", fontVariantLigatures: "none" }}>{c.text}</text>
        </svg>
      ) : null}
    </AbsoluteFill>
  );
}
