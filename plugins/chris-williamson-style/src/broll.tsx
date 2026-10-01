import React from "react";
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing} from "remotion";

// B-roll clip look, matched to the reference frame by frame:
// - slow Ken Burns push (or pull) with a warm grade and vignette;
// - optional keyword whose letters show this same footage colour-inverted, the way the reference's
//   "internal" / "achieve it" do (no outline, no shadow);
// All frame numbers in data are this clip's own frames (0 = first visible frame).
type Props = { Source: React.ComponentType; data?: Record<string, any> };
const CL = {extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const};
const num = (d: any, k: string, f: number) => (typeof d[k] === "number" && Number.isFinite(d[k]) ? d[k] : f);
const str = (d: any, k: string, f: string) => (typeof d[k] === "string" ? d[k] : f);
const bool = (d: any, k: string, f: boolean) => (typeof d[k] === "boolean" ? d[k] : f);
const FALLBACK = '"Helvetica Neue", "Inter", "SF Pro Display", Arial, sans-serif';

export default function ReferenceBroll({Source, data = {}}: Props) {
  const frame = useCurrentFrame();
  const {width: VW, height: VH} = useVideoConfig();
  const clipFrames = Math.max(1, num(data, "clipFrames", 60));
  const local = Math.max(0, frame - num(data, "clipStart", 0));
  const amount = Math.max(0, num(data, "zoom", 0.12));
  const zoomIn = bool(data, "zoomIn", true);
  const ox = num(data, "originX", 50);
  const oy = num(data, "originY", 45);
  const warmth = num(data, "warmth", 0.8);
  const vignette = num(data, "vignette", 0.5);

  const p = interpolate(local, [0, clipFrames], [0, 1], {...CL, easing: Easing.out(Easing.quad)});
  const scale = zoomIn ? 1 + amount * p : 1 + amount * (1 - p);
  const origin = ox.toFixed(2) + "% " + oy.toFixed(2) + "%";
  // The footage under the type sits a little darker, so the brightened letters read (moody reference grade).
  const baseBright = num(data, "baseBrightness", 1);
  const baseFilter = "contrast(1.1) saturate(1.12) sepia(" + (0.14 * warmth).toFixed(3) + ") brightness(" + baseBright.toFixed(3) + ")";

  // Keyword through the footage.
  const keyText = str(data, "text", str(data, "keyText", ""));
  const keyStart = num(data, "keyStart", -1);
  const keyEnd = num(data, "keyEnd", -1);
  const showKey = keyText !== "" && local >= keyStart && local < keyEnd;
  const custom = str(data, "fontFamily", "Chris Reference Inter").trim();
  const font = custom ? '"' + custom.replace(/"/g, "") + '", ' + FALLBACK : FALLBACK;
  const weight = Number(data.fontWeight) > 0 ? Number(data.fontWeight) : 800;
  const u = Math.min(VW / 1080, VH / 1920);
  const size = num(data, "fontSize", num(data, "keywordSize", 150)) * num(data, "keyScale", 1) * u;
  const lineY = num(data, "captionY", 50);
  const fillWhite = num(data, "fillWhite", 0);
  // Softening the inverted footage inside the letters turns fine texture into smooth colour, which reads
  // as a solid fill the way the reference's letters do.
  const fillBlur = Math.max(0, num(data, "fillBlur", 10));
  // Below 1 the inverted fill is darkened: dark letters on light neutral footage, where inversion alone lands on mid grey.
  const fillBrightness = Math.max(0.05, num(data, "fillBrightness", 1));
  const cid = "kwclip" + String(data.uid == null ? 0 : data.uid).replace(/[^a-zA-Z0-9_-]/g, "");

  const layer = (filter: string) => (
    <AbsoluteFill style={{transform: "scale(" + scale.toFixed(4) + ")", transformOrigin: origin, filter}}>
      <Source />
    </AbsoluteFill>
  );

  return (
    <AbsoluteFill style={{backgroundColor: data.keywordOnly ? "transparent" : "#000", overflow: "hidden"}}>
      {data.fontCss && <style>{String(data.fontCss)}</style>}
      {!data.keywordOnly && layer(baseFilter)}
      {!data.keywordOnly && vignette > 0 && (
        <AbsoluteFill style={{background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, rgba(0,0,0," + (0.8 * vignette).toFixed(3) + ") 100%)"}} />
      )}
      {showKey && (
        <>
          <svg width="0" height="0" style={{position: "absolute"}}>
            <defs>
              <clipPath id={cid} clipPathUnits="userSpaceOnUse">
                <text x={VW / 2} y={(lineY / 100) * VH} textAnchor="middle" dominantBaseline="central" fontFamily={font} fontWeight={weight} fontSize={size} letterSpacing={(num(data,"trackingEm",-0.03) * size).toFixed(1)}>{keyText}</text>
              </clipPath>
            </defs>
          </svg>
          <AbsoluteFill style={{clipPath: "url(#" + cid + ")", WebkitClipPath: "url(#" + cid + ")"}}>
            {/* The letters show this same footage colour-inverted (measured on the reference: text pixels
                = 255 - background), so the "gradient" is whatever the shot is, flipped. */}
            {layer(baseFilter + " invert(1)" + (fillBrightness !== 1 ? " brightness(" + fillBrightness.toFixed(3) + ")" : "") + (fillBlur > 0 ? " blur(" + (fillBlur * u).toFixed(1) + "px)" : ""))}
            {fillWhite > 0 && <AbsoluteFill style={{backgroundColor: "#fff", opacity: fillWhite}} />}
          </AbsoluteFill>
        </>
      )}
    </AbsoluteFill>
  );
}
