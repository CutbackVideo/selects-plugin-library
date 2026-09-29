// Dev-only Staging probe (spec §15.2, plan Task 7): builds one committed Draft that answers
//   P-43    does a 1440x1080 frame size survive the first insert and export?
//   P-clock what does an effect's useCurrentFrame() count from (clip start vs source time), for a video that starts
//           at a non-zero source time, its repeat, and an Image?
//   P-mg    does a Motion Graphic placed within [a, b) see frame 0 at timeline frame a?
//   P-two   can one effect render <Source/> twice (blurred backdrop + clipped copy)?
//   P-img   does an Image with a native cover transform + a clip-path effect render in the export?
// Run with the kit's run-script.mjs --allow-commit; export the Draft with readback.mjs --export.
// cfg: { projectId, video: rid, video2: rid, image: rid, name }
const cfg = __CONFIG__;
const p = selects.project(cfg.projectId);
const W = 1440, H = 1080;
const d = await p.createDraft({ name: cfg.name || 'TPL test probe' });
const main = async () => (await d.clips({ trackScope: 'main' })).filter(c => c.resourceId !== null);
const notes = [];
// Main: V[3.0, 5.0) · I[0, 2) · V[3.0, 5.0) · V2[0, 2)
await d.insertResource({ resourceId: cfg.video, sourceRange: { startSeconds: 3, endSeconds: 5 } });
const afterFirst = await d.meta();
notes.push({ afterFirstInsert: afterFirst.frameSize, fps: afterFirst.fps });
await d.setFrameSize({ width: W, height: H });
await d.insertResource({ resourceId: cfg.image, sourceRange: { startSeconds: 0, endSeconds: 2 } });
await d.insertResource({ resourceId: cfg.video, sourceRange: { startSeconds: 3, endSeconds: 5 } });
await d.insertResource({ resourceId: cfg.video2, sourceRange: { startSeconds: 0, endSeconds: 2 } });
const meta = await d.meta();
notes.push({ afterAll: meta.frameSize, fps: meta.fps });
const CLOCK = `import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
export default function ProbeClock({ Source, children, data }) {
  const f = useCurrentFrame(); const v = useVideoConfig();
  return <AbsoluteFill>{Source ? <Source /> : children}
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ background: "#000", color: "#ff0", fontSize: "12vh", fontFamily: "monospace", padding: "1vh 2vh" }}>{data.tag} f{f}</div>
      <div style={{ background: "#000", color: "#0ff", fontSize: "4vh", fontFamily: "monospace", marginTop: "2vh" }}>{v.width}x{v.height}@{Math.round(v.fps * 100) / 100}</div>
    </AbsoluteFill></AbsoluteFill>;
}`;
const TWO = `import React from "react";
import { AbsoluteFill } from "remotion";
export default function ProbeTwo({ Source, children }) {
  const S = Source;
  return <AbsoluteFill style={{ background: "#300" }}>
    <AbsoluteFill style={{ filter: "blur(12px) brightness(0.5)" }}>{S ? <S /> : children}</AbsoluteFill>
    <AbsoluteFill style={{ clipPath: "polygon(20% 20%, 80% 15%, 85% 80%, 15% 85%)" }}>{S ? <S /> : children}</AbsoluteFill>
  </AbsoluteFill>;
}`;
const CLIP = `import React from "react";
import { AbsoluteFill } from "remotion";
export default function ProbeClip({ Source, children }) {
  return <AbsoluteFill style={{ background: "#151113" }}>
    <AbsoluteFill style={{ background: "#f7f5f0", clipPath: "polygon(4% 5%, 50% 2%, 97% 6%, 95% 50%, 96% 95%, 50% 98%, 3% 94%, 5% 50%)" }} />
    <AbsoluteFill style={{ clipPath: "polygon(7% 8%, 50% 5%, 94% 9%, 92% 50%, 93% 92%, 50% 95%, 6% 91%, 8% 50%)" }}>{Source ? <Source /> : children}</AbsoluteFill>
  </AbsoluteFill>;
}`;
let rows = await main();
const tags = ['V@3s', 'IMG', 'V@3s#2', 'V2@0'];
for (let i = 0; i < rows.length; i++) {
  const clip = (await main())[i];
  await d.addVideoEffect({ clip, label: 'Probe clock', tsxCode: CLOCK, parameters: { tag: tags[i] } });
}
// P-img: cover transform on the Image, then a clip-path effect on top of the clock effect.
{
  const clip = (await main())[1];
  await d.setClipTransform({ clip, scale: { x: 1.3, y: 1.3 }, position: { x: 0, y: 0 } });
  await d.addVideoEffect({ clip: (await main())[1], label: 'Probe clip', tsxCode: CLIP, parameters: {} });
}
// P-two on the last clip.
await d.addVideoEffect({ clip: (await main())[3], label: 'Probe two', tsxCode: TWO, parameters: {} });
rows = await main();
const end = rows.reduce((a, c) => Math.max(a, c.endFrame), 0);
const MG = `import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
export default function ProbeMg() {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "flex-start", padding: "3vh" }}>
    <div style={{ background: "#fff", color: "#c00", fontSize: "8vh", fontFamily: "monospace", padding: "0 2vh" }}>MG f{f}</div>
  </AbsoluteFill>;
}`;
const mgStart = 45;
await d.addMotionGraphic({ within: await d.rangeAtFrames(mgStart, end), label: 'Probe letters clock', tsxCode: MG, parameters: {} });
const commit = await d.commitAll('TPL probe');
return { sequenceId: commit.createdDraftId, mgStart, clips: rows.map(c => ({ rid: c.resourceId, startFrame: c.startFrame, endFrame: c.endFrame, sourceStart: c.sourceStartSeconds ?? c.sourceRange ?? null })), notes };
