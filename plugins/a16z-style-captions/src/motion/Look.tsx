import React from "react";
import { useCurrentFrame } from "remotion";

// The 9:16 frame for one Main clip. The clip's Transform stretches its source-sized raster to fill the
// frame, so a frame-sized layer scaled by (sw/W, sh/H) lays out in frame pixels; inside it the source is
// placed where its shot's crop puts it. The first shot opens with a zoom-out settle:
// s(f) = 1 + (s0 - 1) * 0.68^f, 90% settled by frame 6 (at 24 fps).

type Shot = { from: number; to: number; x: number; y: number; w: number; h: number };
type Data = {
  W?: number;
  H?: number;
  sw?: number;
  sh?: number;
  start?: number;
  fps?: number;
  shots?: Shot[];
  open?: { s0: number; ax: number; ay: number } | null;
  push?: number; // a slow push over the clip (B-roll), as a fraction
  end?: number;
};

const n = (v: any, f: number) => (typeof v === "number" && Number.isFinite(v) ? v : f);

export default function Look({ Source, data }: { Source: React.ComponentType; data?: Data }) {
  const d = data || {};
  const W = n(d.W, 1080);
  const H = n(d.H, 1920);
  const sw = n(d.sw, 1920);
  const sh = n(d.sh, 1080);
  const local = useCurrentFrame();
  const f = local + n(d.start, 0);
  const shots = Array.isArray(d.shots) ? d.shots : [];
  const s = shots.find((x) => f >= x.from && f < x.to) || shots[shots.length - 1] || { x: 0, y: (H - (W * sh) / sw) / 2, w: W, h: (W * sh) / sw };
  let transform = "";
  if (d.push && d.end && d.end > n(d.start, 0)) {
    const z = 1 + d.push * Math.max(0, Math.min(1, (f - n(d.start, 0)) / (d.end - n(d.start, 0))));
    transform = "translate(" + W / 2 + "px," + H / 2 + "px) scale(" + z.toFixed(4) + ") translate(" + -W / 2 + "px," + -H / 2 + "px)";
  } else if (d.open && shots.length && s === shots[0]) {
    const k = (f - n(shots[0].from, 0)) * (24 / n(d.fps, 24));
    const z = 1 + (d.open.s0 - 1) * Math.pow(0.68, Math.max(0, k));
    if (z > 1.0005) transform = "translate(" + d.open.ax + "px," + d.open.ay + "px) scale(" + z.toFixed(4) + ") translate(" + -d.open.ax + "px," + -d.open.ay + "px)";
  }
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", backgroundColor: "#000" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transformOrigin: "0 0", transform: "scale(" + sw / W + ", " + sh / H + ")", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transform: transform || undefined, transformOrigin: "0 0" }}>
          <div style={{ position: "absolute", left: s.x, top: s.y, width: s.w, height: s.h }}>
            <Source />
          </div>
        </div>
      </div>
    </div>
  );
}
