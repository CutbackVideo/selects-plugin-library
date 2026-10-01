import React from "react";
import { useCurrentFrame } from "remotion";
import { camAt, camCss, camBlur, scalarAt, type CamKey, type ScalarKey } from "./camera";
import { GridSet, zoomVelocity } from "./grid";
import { GradeFilter, SPEAKER_GRADE, BROLL_GRADE, type Grade } from "./grade";

// The Reel Look effect, on every picture clip of the reel.
//
// Canvas: the effect draws into the clip's source-sized raster, which the clip's Transform stretches to
// exactly fill the frame (scale x = W / (sw * contain), y = H / (sh * contain)). A W x H layer scaled by
// (sw / W, sh / H) therefore lays out in frame pixels, and everything below is in frame pixels.
//
// "main": the speaker. The source is placed where the YuNet reframe put it for the current shot, the
// camera moves it, and the warm grade is applied.
// "card": a B-roll clip, shown as a rounded card standing on the dark grid set.
type Shot = { from: number; to: number; x: number; y: number; w: number; h: number };
type Props = { Source: React.ComponentType; data?: Record<string, any> };

const n = (v: any, f: number) => (typeof v === "number" && Number.isFinite(v) ? v : f);

export default function ReelLook({ Source, data = {} }: Props) {
  const local = useCurrentFrame();
  const W = n(data.W, 1080);
  const H = n(data.H, 1920);
  const sw = n(data.sw, 1920);
  const sh = n(data.sh, 1080);
  const fps = n(data.fps, 30);
  const f = local + n(data.start, 0);
  const uid = String(data.uid || "0").replace(/[^a-zA-Z0-9_-]/g, "");
  const toFrame: React.CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    width: W,
    height: H,
    transformOrigin: "0 0",
    transform: "scale(" + (sw / W).toFixed(6) + ", " + (sh / H).toFixed(6) + ")",
    overflow: "hidden",
  };
  const mode = data.mode === "card" ? "card" : "main";
  const grade: Grade = data.grade || (mode === "card" ? BROLL_GRADE : SPEAKER_GRADE);

  if (mode === "main") {
    const shots: Shot[] = Array.isArray(data.shots) ? data.shots : [];
    const shot = shots.find((s) => f >= s.from && f < s.to) || shots[shots.length - 1] || { from: 0, to: 1e9, x: 0, y: (H - (W * sh) / sw) / 2, w: W, h: (W * sh) / sw };
    let cam = camAt(data.camera as CamKey[], f);
    // The plan keeps the picture covering the frame for the shot it was made for; a different shot of the
    // same clip may be framed differently, so clamp here too (except on the set, where the grid covers).
    const free = Array.isArray(data.free) && (data.free as number[][]).some((r) => f >= r[0] && f < r[1]);
    if (!free) {
      const z = Math.max(cam.z, W / shot.w, H / shot.h);
      const lo = (a: number, size: number, frame: number) => frame / 2 - z * (a + size - frame / 2);
      const hi = (a: number, frame: number) => -frame / 2 - z * (a - frame / 2);
      const tx = Math.min(hi(shot.x, W), Math.max(lo(shot.x, shot.w, W), (cam.x / 100) * W));
      const ty = Math.min(hi(shot.y, H), Math.max(lo(shot.y, shot.h, H), (cam.y / 100) * H));
      cam = { ...cam, z, x: (tx / W) * 100, y: (ty / H) * 100 };
    }
    // Moves on the set (the drop and the rise) stay sharp, as in the reference.
    const blur = free ? { sx: 0, sy: 0 } : camBlur(cam, W, H);
    const filters = ["url(#grade" + uid + ")"];
    if (blur.sx || blur.sy) filters.push("url(#mb" + uid + ")");
    return (
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", backgroundColor: "#000" }}>
        <svg width="0" height="0" style={{ position: "absolute" }}>
          <defs>
            <GradeFilter id={"grade" + uid} grade={grade} />
            <filter id={"mb" + uid} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation={blur.sx.toFixed(2) + " " + blur.sy.toFixed(2)} />
            </filter>
          </defs>
        </svg>
        <div style={toFrame}>
          <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transformOrigin: "50% 50%", transform: camCss(cam, W, H), filter: filters.join(" ") }}>
            <div style={{ position: "absolute", left: shot.x, top: shot.y, width: shot.w, height: shot.h }}>
              <Source />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- B-roll card ------------------------------------------------------------------------------------
  // Portrait card: 70% of the width, top at 7.5% of the height, 9:16. Landscape: a two-card film strip
  // 33% of the height tall, centred at 37%, tilted 3 degrees and drifting right. "portrait2" is the
  // reference's reprise of the first clip, sliding in from the left.
  const kind = String(data.kind || "portrait");
  const dur = Math.max(1, n(data.dur, 60));
  const F = (x: number) => Math.max(1, Math.round((x * fps) / 30));
  const t = local;
  const srcAspect = sw / sh;
  const gridZoom = scalarAt(data.gridZoom as ScalarKey[], f, 1);
  const cardBox = (cw: number, ch: number) => {
    // Cover the card with the clip, centred.
    const k = Math.max(cw / sw, ch / sh);
    return { w: sw * k, h: sh * k, x: (cw - sw * k) / 2, y: (ch - sh * k) / 2 };
  };
  const easeOut = (p: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, p)), 3);
  const card = (cw: number, ch: number, key: string, extra: React.CSSProperties) => {
    const box = cardBox(cw, ch);
    const push = 1 + 0.08 * Math.min(1, t / dur);
    return (
      <div
        key={key}
        style={{
          position: "absolute",
          width: cw,
          height: ch,
          borderRadius: 0.035 * cw,
          overflow: "hidden",
          boxShadow: "0 " + 0.02 * H + "px " + 0.05 * H + "px rgba(0,0,0,0.55)",
          ...extra,
        }}
      >
        <div style={{ position: "absolute", left: box.x, top: box.y, width: box.w, height: box.h, transform: "scale(" + push.toFixed(4) + ")", transformOrigin: "50% 50%", filter: "url(#grade" + uid + ")" }}>
          <Source />
        </div>
      </div>
    );
  };
  let content: React.ReactNode;
  if (kind === "landscape") {
    const ch = 0.33 * H;
    const cw = ch * Math.max(1.2, srcAspect > 1 ? srcAspect : 16 / 9);
    const gap = 0.028 * W;
    const drift = -0.12 * W + 0.3 * W * Math.min(1, t / dur);
    const cy = 0.37 * H;
    content = (
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transform: "rotate(-3deg)", transformOrigin: "50% " + (cy / H) * 100 + "%" }}>
        {card(cw, ch, "a", { left: (W - cw) / 2 + drift, top: cy - ch / 2 })}
        {data.strip !== false ? card(cw, ch, "b", { left: (W - cw) / 2 + drift - cw - gap, top: cy - ch / 2 }) : null}
      </div>
    );
  } else {
    const cw = 0.7 * W;
    const ch = (cw * 16) / 9;
    const sway = 1.1 * Math.sin((2 * Math.PI * t) / (2.8 * fps));
    const bob = 0.004 * H * Math.sin((2 * Math.PI * t) / (3.4 * fps));
    let scale = 1;
    let dx = 0;
    // The returning card whips in from the left and is already mostly in frame on its first frame, so the
    // swap never shows an empty set (reference).
    if (kind === "portrait2") dx = -0.3 * W * (1 - easeOut(t / F(5)));
    else scale = 1.3 - 0.3 * easeOut(t / F(9));
    content = card(cw, ch, "p", {
      left: (W - cw) / 2 + dx,
      top: 0.075 * H + bob,
      transform: "rotate(" + sway.toFixed(3) + "deg) scale(" + scale.toFixed(4) + ")",
      transformOrigin: "50% 40%",
    });
  }
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", backgroundColor: "#000" }}>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <GradeFilter id={"grade" + uid} grade={grade} />
        </defs>
      </svg>
      <div style={toFrame}>
        <GridSet
          W={W}
          H={H}
          zoom={gridZoom}
          uid={uid}
          frame={f}
          fps={fps}
          zoomVel={zoomVelocity(data.gridZoom as ScalarKey[], f)}
          rasterScale={Math.min(sw / W, sh / H)}
        />
        {content}
      </div>
    </div>
  );
}
