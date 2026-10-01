import React from "react";
import {AbsoluteFill, interpolate, useCurrentFrame, Easing} from "remotion";

// Reference look for a talking-head clip: warm low-key grade, vignette, light grain and a slow push-in
// aimed at the face. This effect's canvas is the clip's own picture (the source band); the clip's
// Transform scales that band to cover the vertical frame, so the zoom here is a gentle extra on top.
type Props = { Source: React.ComponentType; data?: Record<string, any> };
const CL = {extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const};
const num = (d: any, k: string, f: number) => (typeof d[k] === "number" && Number.isFinite(d[k]) ? d[k] : f);
const bool = (d: any, k: string, f: boolean) => (typeof d[k] === "boolean" ? d[k] : f);

export default function ReferenceLook({Source, data = {}}: Props) {
  const frame = useCurrentFrame();
  const fps = num(data, "fps", 30);
  const clipFrames = Math.max(1, num(data, "clipFrames", 120));
  const local = Math.max(0, frame - num(data, "clipStart", 0));
  const zoomAmount = Math.max(0, num(data, "zoom", 0.06));
  const zoomIn = bool(data, "zoomIn", true);
  const faceX = num(data, "faceX", 42);
  const faceY = num(data, "faceY", 32);
  const warmth = num(data, "warmth", 1);
  const vignette = num(data, "vignette", 0.55);
  const grain = num(data, "grain", 0.12);
  const contrast = num(data, "contrast", 1.12);
  const uid = String(data.uid == null ? 0 : data.uid).replace(/[^a-zA-Z0-9_-]/g, "");
  // Ease across the whole clip so a cut always lands on a slightly different framing.
  const p = interpolate(local, [0, clipFrames], [0, 1], {...CL, easing: Easing.inOut(Easing.sin)});
  const scale = zoomIn ? 1 + zoomAmount * p : 1 + zoomAmount * (1 - p);
  const origin = faceX.toFixed(2) + "% " + faceY.toFixed(2) + "%";
  const sepia = 0.18 * warmth;
  const filter = "contrast(" + contrast.toFixed(3) + ") saturate(" + (1.05 + 0.1 * warmth).toFixed(3) + ") sepia(" + sepia.toFixed(3) + ") brightness(0.96)";
  return (
    <AbsoluteFill style={{backgroundColor: "#000", overflow: "hidden"}}>
      <svg width="0" height="0" style={{position: "absolute"}}>
        <defs>
          <filter id={"grain" + uid} x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed={(frame % 7) + 1} stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
      </svg>
      <AbsoluteFill style={{transform: "scale(" + scale.toFixed(4) + ")", transformOrigin: origin, filter}}>
        <Source />
      </AbsoluteFill>
      {vignette > 0 && (
        <AbsoluteFill style={{background: "radial-gradient(ellipse at " + origin + ", rgba(0,0,0,0) 35%, rgba(0,0,0," + (0.85 * vignette).toFixed(3) + ") 100%)"}} />
      )}
      {warmth > 0 && (
        <AbsoluteFill style={{backgroundColor: "rgba(255,140,60,1)", opacity: 0.06 * warmth, mixBlendMode: "soft-light"}} />
      )}
      {grain > 0 && (
        <AbsoluteFill style={{filter: "url(#grain" + uid + ")", opacity: grain, mixBlendMode: "overlay"}} />
      )}
    </AbsoluteFill>
  );
}
