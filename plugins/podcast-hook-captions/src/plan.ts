// The reel plan: the reference edit's beat structure, laid over the chosen speech.
//
// Everything is in reel Draft frames. Timings are the reference's (measured at 30 fps, F() rescales),
// anchored to the words the writer picked: stack A/B, the punch, the B-roll span and the final block are
// spoken words shown as they are spoken; the opener is an editorial question that is not spoken.
import { weakKey } from "./pipeline/select";
import { camAt, type CamKey, type ScalarKey } from "./motion/camera";

export type RWord = { t: string; s: number; e: number };
export type ShotFrame = {
  from: number;
  to: number;
  // Reframed picture rectangle in frame px at camera identity, and the face in frame fractions.
  rect: { x: number; y: number; w: number; h: number };
  face: { cx: number; cy: number; h: number } | null;
};
export type Picks = {
  opener?: { lead: string; key: string } | null;
  stackA?: { lead: number[]; key: number[] } | null;
  stackB?: { lines: number[][]; key: number[] } | null;
  punch?: { lead: number[]; key: number[] } | null;
  broll?: { from: number; to: number; portrait: string; landscape: string } | null;
  final?: { lines: number[][]; key: number[] } | null;
};
export type SfxKind = "deep_woosh" | "woosh_medium" | "movie_title" | "es_whoosh" | "tick" | "bass_drop" | "hit_reverb" | "camera";
export type Plan = {
  fps: number;
  W: number;
  H: number;
  endFrame: number;
  camera: CamKey[];
  titles: any[];
  setOpacity: ScalarKey[];
  gridZoom: ScalarKey[];
  gridTexture: ScalarKey[]; // dot texture strength on the set (1 = as on the reference's set)
  capHide: number[][];
  capY: number[][];
  free: number[][];
  flashes: number[];
  broll: { kind: "portrait" | "landscape" | "portrait2"; start: number; end: number; clip: 0 | 1; offsetSeconds: number }[];
  sfx: { t: number; kind: SfxKind; gain: number }[];
  notes: string[];
};

export function buildPlan(input: { fps: number; W: number; H: number; endFrame: number; words: RWord[]; shots: ShotFrame[]; picks: Picks }): Plan {
  const { fps, W, H, endFrame, words, shots } = input;
  const picks: Picks = input.picks || {};
  const F = (n30: number) => Math.max(1, Math.round((n30 * fps) / 30));
  const notes: string[] = [];
  const wAt = (i: number) => words[Math.max(0, Math.min(words.length - 1, i))];
  const valid = (ids: number[] | undefined) => Array.isArray(ids) && ids.length > 0 && ids.every((i) => Number.isInteger(i) && i >= 0 && i < words.length);
  const clean = (t: string) => String(t).toUpperCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  const W_ = (ids: number[]) => ids.map((i) => ({ t: clean(words[i].t), at: words[i].s }));
  const firstOf = (ids: number[][]) => Math.min(...ids.flat().map((i) => words[i].s));
  const lastEnd = (ids: number[][]) => Math.max(...ids.flat().map((i) => words[i].e));

  // ---- camera helpers: states are placed by where the face should land ---------------------------------
  const shotAt = (f: number) => shots.find((s) => f >= s.from && f < s.to) || shots[shots.length - 1];
  const face0 = (f: number) => {
    const s = shotAt(f);
    return s && s.face ? s.face : { cx: 0.46, cy: 0.29, h: 0.3 };
  };
  type St = { z: number; x: number; y: number };
  // Camera state with zoom z that puts the face centre at (fx, fy) (fractions of the frame).
  const place = (f: number, z: number, fx: number, fy: number): St => {
    const b = face0(f);
    return { z, x: (fx - 0.5 - z * (b.cx - 0.5)) * 100, y: (fy - 0.5 - z * (b.cy - 0.5)) * 100 };
  };
  // Where the face is on screen under state s.
  const faceOn = (f: number, s: St) => {
    const b = face0(f);
    return { fx: 0.5 + s.z * (b.cx - 0.5) + s.x / 100, fy: 0.5 + s.z * (b.cy - 0.5) + s.y / 100 };
  };
  // Keep the picture covering the frame (except on the set, where the grid covers the room).
  const cover = (f: number, s: St): St => {
    const sh = shotAt(f);
    if (!sh) return s;
    const r = sh.rect;
    const zMin = Math.max(W / r.w, H / r.h) * 1.001;
    const z = Math.max(s.z, zMin);
    const lo = (a: number, size: number, frame: number) => frame - frame / 2 - z * (a + size - frame / 2);
    const hi = (a: number, frame: number) => -frame / 2 - z * (a - frame / 2);
    const tx = Math.min(hi(r.x, W), Math.max(lo(r.x, r.w, W), (s.x / 100) * W));
    const ty = Math.min(hi(r.y, H), Math.max(lo(r.y, r.h, H), (s.y / 100) * H));
    return { z, x: (tx / W) * 100, y: (ty / H) * 100 };
  };
  const camera: CamKey[] = [];
  let cur: St = { z: 1, x: 0, y: 0 };
  const move = (at: number, d: number, next: St, e: CamKey["e"] = "io", free = false) => {
    const s = free ? next : cover(at + d, next);
    camera.push({ at: Math.round(at), d: Math.max(0, Math.round(d)), z: +s.z.toFixed(5), x: +s.x.toFixed(3), y: +s.y.toFixed(3), e });
    cur = s;
  };

  // ---- pick validation ------------------------------------------------------------------------------
  let A = picks.stackA && valid(picks.stackA.lead.concat(picks.stackA.key)) ? picks.stackA : null;
  let B = picks.stackB && valid(picks.stackB.lines.flat().concat(picks.stackB.key)) ? picks.stackB : null;
  let P = picks.punch && valid(picks.punch.lead.concat(picks.punch.key)) ? picks.punch : null;
  let Fn = picks.final && valid(picks.final.lines.flat().concat(picks.final.key)) ? picks.final : null;
  let R = picks.broll && Number.isInteger(picks.broll.from) && Number.isInteger(picks.broll.to) && picks.broll.from >= 0 && picks.broll.to < words.length && picks.broll.to >= picks.broll.from ? picks.broll : null;
  const opener = picks.opener && picks.opener.key ? picks.opener : null;
  // A key that is only a weak word ("it", "that") cannot carry a title: the longest strong word of the
  // quote becomes the key and the words before it the lead lines; the words after it are dropped.
  const strengthen = (lines: number[][], key: number[]): { lines: number[][]; key: number[] } | null => {
    if (!weakKey(key.map((i) => words[i].t))) return { lines, key };
    const all = lines.flat();
    let p = -1;
    all.forEach((i, k) => {
      const t = clean(words[i].t);
      if (t.length >= 4 && !weakKey([t]) && (p < 0 || t.length >= clean(words[all[p]].t).length)) p = k;
    });
    if (p < 0) return null;
    const cut = all[p];
    notes.push("Weak title key replaced with " + clean(words[cut].t) + ".");
    return { lines: lines.map((l) => l.filter((i) => i < cut)).filter((l) => l.length), key: [cut] };
  };
  if (B) {
    const s = strengthen(B.lines, B.key);
    B = s && s.lines.length ? s : B;
  }
  if (Fn) {
    const s = strengthen(Fn.lines, Fn.key);
    Fn = s && s.lines.length ? s : Fn;
  }
  if (P) {
    const s = strengthen([P.lead], P.key);
    P = s && s.lines.length ? { lead: s.lines.flat(), key: s.key } : P;
  }
  const startOf = {
    A: () => (A ? firstOf([A.lead, A.key]) : Infinity),
    B: () => (B ? firstOf([...B.lines, B.key]) : Infinity),
    P: () => (P ? firstOf([P.lead, P.key]) : Infinity),
    Fn: () => (Fn ? firstOf([...Fn.lines, Fn.key]) : Infinity),
  };
  // Order and spacing: A before B before the punch before the B-roll before the final block.
  if (A && startOf.A() < F(84)) { notes.push("Stack A starts too early for the opening set; dropped."); A = null; }
  if (A && B && startOf.B() < lastEnd([A.lead, A.key]) - F(2)) { notes.push("Stack B overlaps stack A; dropped."); B = null; }
  if (!A && B) { notes.push("Stack B needs stack A; dropped."); B = null; }
  const afterStacks = B ? lastEnd([...B.lines, B.key]) : A ? lastEnd([A.lead, A.key]) : F(150);
  if (P && startOf.P() < afterStacks - F(2)) { notes.push("Punch overlaps the stacks; dropped."); P = null; }
  if (Fn && startOf.Fn() > endFrame - F(43)) { notes.push("Final block too close to the end; dropped."); Fn = null; }

  const titles: any[] = [];
  const capHide: number[][] = [];
  const capY: number[][] = [];
  const setOpacity: ScalarKey[] = [];
  const gridZoom: ScalarKey[] = [];
  const gridTexture: ScalarKey[] = [];
  const flashes: number[] = [];
  const broll: Plan["broll"] = [];
  const sfx: Plan["sfx"] = [];
  const S = (f: number, kind: SfxKind, gain = 1) => sfx.push({ t: Math.max(0, f) / fps, kind, gain });

  // ---- 1. Opening set: the speaker cut out onto the grid, the editorial question behind the head ------
  const aStart = startOf.A();
  const exitAt = Math.round(Math.max(F(54), Math.min(F(121), (Number.isFinite(aStart) ? aStart : F(200)) - F(46))));
  const setEnd = Math.round(Math.min(exitAt + F(29), (Number.isFinite(aStart) ? aStart : Infinity) - F(8)));
  const b0 = face0(0);
  camera.push({ at: 0, d: 0, z: 1, x: 0, y: 0, e: "lin" });
  // Drop: face centre +19% of the height, 0.95x, 0.13 -> 0.93 s, ease-out.
  // The reference lands the face box top at 33% of the height, clear of the title above it.
  move(F(4), F(24), place(F(4), 0.95, b0.cx, Math.max(b0.cy + 0.16, 0.33 + 0.475 * b0.h)), "o", true);
  const dropEnd = F(28);
  if (opener) {
    const lead = String(opener.lead || "").trim().toUpperCase().split(/\s+/).filter(Boolean);
    const keyText = String(opener.key).trim().toUpperCase();
    const t0 = F(13);
    titles.push({
      kind: "opener",
      start: t0,
      end: exitAt + F(18),
      anchor: dropEnd,
      behind: true,
      lines: [
        { role: "lead", words: lead.map((t, i) => ({ t, at: t0 + i * F(3) })) },
        { role: "key", words: [{ t: keyText, at: t0 + lead.length * F(3) + F(3) }] },
      ],
    });
  }
  // Push-in 1.11x with a tilt up (face centre back to 30%) that carries the title off the top.
  move(exitAt, F(18), place(exitAt, 0.95 * 1.11, b0.cx, 0.3), "io", true);
  // The set leaves at an even pace over about 0.6 s after the grid's cut (reference).
  setOpacity.push([0, 0], [F(3), 1, "io"], [setEnd + 1, 1], [setEnd + F(19), 0, "lin"]);
  // Grid zoom as measured on the reference: it punches in to 1.86x in one frame, settles to 1 by about
  // 2.2 s, holds, pushes back in to about 2x and cuts to 1 as the set leaves. Cuts are one raw frame at any
  // fps; a short set keeps its push-in from jumping.
  const settle = Math.min(F(68), setEnd - F(32));
  const rise0 = Math.max(settle + 1, setEnd - F(64));
  gridZoom.push([0, 1], [F(7), 1], [F(7) + 1, 1.86, "lin"], [Math.max(F(9), F(7) + 2), 1.685, "lin"], [F(12), 1.408, "lin"], [F(19), 1.189, "lin"], [settle, 1, "o"]);
  gridZoom.push([rise0, 1], [setEnd - F(11), 1.211, "i"], [setEnd - F(4), 1.409, "lin"], [setEnd - F(1), 1.69, "lin"], [setEnd, 1.96, "lin"], [setEnd + 1, 1, "lin"]);
  capY.push([0, exitAt + F(4), 0.658]);
  S(0, "deep_woosh", 0.9);
  S(exitAt + F(4), "movie_title", 0.85);
  if (opener) {
    const nLead = String(opener.lead || "").trim().split(/\s+/).filter(Boolean).length;
    for (let i = 0; i < nLead; i += 1) S(F(13) + i * F(3), "tick", 0.35);
  }
  // Back in the room: a quick 1.14x punch-in, unless stack A is already on its way.
  if (!A || aStart - (exitAt + F(35)) > F(20)) {
    const fo = faceOn(exitAt + F(18), cur);
    move(exitAt + F(35), F(9), place(exitAt + F(35), cur.z * 1.14, fo.fx, fo.fy), "io");
  }

  // ---- 2. Stack A -> whip -> stack B -> whip back ------------------------------------------------------
  let lastBeat = setEnd;
  if (A) {
    const aS = aStart;
    // Zoom out 0.79x and pan the face to 29% of the width: room for the block on the right.
    const zA = Math.max(0.95, cur.z * 0.79);
    move(aS - F(2), F(24), place(aS, zA, 0.29, faceOn(aS, cur).fy), "io");
    // The block sits on the chest, just under the chin, wherever the camera has put the face.
    const chinA = faceOn(aS + F(22), cur).fy + (cur.z * face0(aS).h) / 2;
    const aTop = Math.max(0.46, Math.min(0.64, chinA + 0.035));
    S(aS - F(2), "woosh_medium", 0.8);
    A.lead.forEach((i) => S(words[i].s, "tick", 0.45));
    A.key.forEach((i, k) => S(words[i].s, k === 0 ? "es_whoosh" : "tick", k === 0 ? 0.7 : 0.5));
    const aKeyEnd = lastEnd([A.key]);
    let aEnd: number;
    let arrowAt: number | null = null;
    if (B) {
      const bS = startOf.B();
      const whipAt = Math.max(aKeyEnd, bS - F(2));
      // Stack A stays on the picture through the whip: it ends up at the right edge while stack B builds
      // in the space the whip opens on the left, and A's arrow (drawn just before the whip, pointing up-left)
      // now points at B. It leaves just before the whip back, as in the reference (8.63 s vs 8.87 s).
      arrowAt = Math.max(aKeyEnd - F(2), whipAt - F(6));
      // Measured on the reference: the whip takes 9 frames and never moves more than about a fifth of
      // the way in one frame, so the face stays readable throughout.
      move(whipAt - F(3), F(9), place(whipAt, cur.z, 0.87, faceOn(whipAt, cur).fy), "io");
      S(whipAt - F(8), "deep_woosh", 0.85);
      const bKey = B.key.map((i) => words[i]);
      const bLast = lastEnd([...B.lines, B.key]);
      let backAt = Math.max(bLast + F(6), bKey[0].s + F(17));
      // The whip back has to be over before the punch starts.
      const pNext = startOf.P();
      if (Number.isFinite(pNext)) backAt = Math.max(bKey[0].s + F(8), Math.min(backAt, pNext - F(7)));
      aEnd = Math.max(whipAt + F(10), backAt - F(6));
      titles.push({
        kind: "stackB",
        start: bS,
        end: backAt + F(6),
        anchor: whipAt + F(6),
        lines: [...B.lines.map((l) => ({ role: "lead", words: W_(l) })), { role: "key", words: W_(B.key) }],
      });
      capHide.push([bS, backAt + F(6)]);
      B.lines.flat().forEach((i) => S(words[i].s, "tick", 0.4));
      S(bKey[0].s + F(2), "bass_drop", 0.9);
      move(backAt - F(3), F(9), place(backAt, cur.z, 0.47, faceOn(backAt, cur).fy), "io");
      S(backAt - F(4), "woosh_medium", 0.8);
      lastBeat = backAt + F(6);
    } else {
      aEnd = aKeyEnd + F(24);
      move(aKeyEnd + F(15), F(9), place(aKeyEnd + F(18), cur.z / 0.79, 0.47, faceOn(aKeyEnd, cur).fy), "io");
      S(aKeyEnd + F(14), "woosh_medium", 0.8);
      lastBeat = aEnd;
    }
    titles.push({
      kind: "stackA",
      start: firstOf([A.lead, A.key]),
      end: aEnd,
      anchor: aS + F(22),
      lines: [{ role: "lead", words: W_(A.lead) }, { role: "key", words: W_(A.key) }],
      arrowAt,
      y: +aTop.toFixed(4),
    });
    if (arrowAt != null) S(arrowAt, "tick", 0.45);
    capHide.push([firstOf([A.lead, A.key]), aEnd]);
  }

  // ---- 3. Slow push, then the punch ----------------------------------------------------------------
  const pS = startOf.P();
  if (Number.isFinite(pS) ? pS - lastBeat > F(60) : endFrame - lastBeat > F(90)) {
    const at = lastBeat + F(36);
    const fo = faceOn(at, cur);
    move(at, F(27), place(at, cur.z * 1.19, fo.fx, fo.fy), "io");
    S(at + F(3), "es_whoosh", 0.6);
  }
  let punchEnd = 0;
  let blowAt = 0;
  if (P) {
    const keyWords = P.key.map((i) => words[i]);
    const lastKey = keyWords[keyWords.length - 1];
    blowAt = Math.max(lastKey.s + F(25), lastKey.e + F(4));
    const fo = faceOn(pS, cur);
    move(pS + F(5), F(12), place(pS + F(5), Math.max(1, cur.z * 0.82), fo.fx, fo.fy), "io");
    move(blowAt - F(3), F(9), place(blowAt, cur.z * 1.21, fo.fx, fo.fy), "io");
    punchEnd = blowAt + F(40);
    titles.push({ kind: "punch", start: pS, end: punchEnd, anchor: null, lines: [{ role: "lead", words: W_(P.lead) }, { role: "key", words: W_(P.key) }], blowAt });
    capHide.push([pS, blowAt + F(9)]);
    S(pS + F(3), "es_whoosh", 0.7);
    keyWords.forEach((w, k) => S(w.s, k === keyWords.length - 1 ? "hit_reverb" : "tick", k === keyWords.length - 1 ? 1 : 0.5));
    S(blowAt - F(7), "deep_woosh", 0.85);
    lastBeat = blowAt + F(9);
  }

  // ---- 4. Flash into B-roll cards on the grid, then the speaker rises back in ------------------------
  const fStart = startOf.Fn();
  if (R) {
    let bS = Math.max(words[R.from].s - F(3), P ? blowAt + F(24) : lastBeat + F(6));
    const room = (Number.isFinite(fStart) ? fStart - F(45) : endFrame - F(30)) - bS;
    const len = Math.min(F(165), Math.max(F(105), words[R.to].e + F(6) - bS), room);
    if (len >= F(60)) {
      const peak = bS;
      bS = peak + F(1);
      const bE = bS + len;
      flashes.push(peak);
      if (P && punchEnd > peak + F(1)) {
        punchEnd = peak + F(1);
        titles[titles.length - 1].end = punchEnd;
      } else if (P) {
        titles[titles.length - 1].end = Math.min(punchEnd, peak + F(1));
      }
      const c1 = bS + Math.round(len * 0.47);
      const c2 = c1 + Math.round(len * 0.34);
      broll.push({ kind: "portrait", start: bS, end: c1, clip: 0, offsetSeconds: 0 });
      broll.push({ kind: "landscape", start: c1, end: c2, clip: 1, offsetSeconds: 0 });
      broll.push({ kind: "portrait2", start: c2, end: bE, clip: 0, offsetSeconds: (c1 - bS) / fps + 0.3 });
      // Under the cards the grid punches in to about 2.15x and settles to 1 (reference); after the cards it
      // pushes in to about 2.1x and cuts back to 1, now without its dot texture, while the set fades out.
      const settleB = Math.min(bS + F(73), bE - F(30));
      const riseB = Math.max(settleB + 1, bE - F(55));
      gridZoom.push([bS - 1, 1], [bS, 2.15, "lin"], [bS + F(1), 1.935, "lin"], [bS + F(3), 1.638, "lin"], [bS + F(7), 1.379, "lin"], [bS + F(15), 1.184, "lin"], [settleB, 1, "o"]);
      // The last push is three raw frames at any fps, then the cut; the dots go a little before it.
      const pushB = bE + F(21);
      const cutB = pushB + 3;
      gridZoom.push([riseB, 1], [bE + F(6), 1.169, "i"], [bE + F(18), 1.392, "lin"], [pushB, 1.703, "lin"], [pushB + 1, 1.9, "lin"], [pushB + 2, 2.11, "lin"], [cutB, 1, "lin"]);
      gridTexture.push([cutB - F(11), 1], [cutB - F(4), 0, "lin"]);
      // The speaker rises from below (face centre 75.6% -> 29.6% in 6 frames) in front of the grid.
      const fc = face0(bE);
      // The speaker rises from below over 9 frames (face centre 75.6% -> 26%), sharp, in front of the grid,
      // which holds a moment and then gives way to the room.
      move(bE - 1, 0, place(bE, 1, 0.47, 0.756), "lin", true);
      move(bE, F(9), place(bE, 1, 0.47, 0.26), "io", true);
      setOpacity.push([bE - 1, 0], [bE, 1], [cutB, 1], [Math.max(cutB + F(12), bE + F(48)), 0, "lin"]);
      void fc;
      S(peak - F(4), "camera", 0.9);
      S(bS + F(2), "movie_title", 0.8);
      S(c1 - F(6), "deep_woosh", 0.75);
      S(c2 + F(1), "woosh_medium", 0.75);
      S(bE - F(1), "deep_woosh", 0.85);
      S(bE + F(9), "movie_title", 0.75);
      lastBeat = bE + F(20);
    } else notes.push("No room for B-roll between the punch and the final block; skipped.");
  }
  if (P && !flashes.length) {
    titles[titles.length - 1].end = Math.min(punchEnd, Number.isFinite(fStart) ? fStart - F(4) : endFrame);
  }

  // ---- 5. Final block, then a slow pan to the end -----------------------------------------------------
  let panFrom = endFrame - F(39);
  if (Fn) {
    const k = words[Fn.key[0]];
    const last = lastEnd([...Fn.lines, Fn.key]);
    // Reference: the key word holds 0.83 s, blows out in 4 frames and cuts, and the reel runs on for
    // about 1.4 s of speech with a slow pan.
    const bAt = Math.max(k.s + F(25), last + F(2));
    const end = Math.min(endFrame, bAt + F(6));
    titles.push({ kind: "final", start: fStart, end, anchor: null, lines: [...Fn.lines.map((l) => ({ role: "lead", words: W_(l) })), { role: "key", words: W_(Fn.key) }], blowAt: bAt });
    capHide.push([fStart, end]);
    Fn.lines.flat().forEach((i, j) => j > 0 && S(words[i].s, "tick", 0.4));
    S(k.s, "es_whoosh", 0.7);
    S(bAt - F(3), "deep_woosh", 0.8);
    S(end, "woosh_medium", 0.75);
    panFrom = end + F(2);
  }
  if (endFrame - panFrom >= F(12)) {
    const fo = faceOn(panFrom, cur);
    move(panFrom, endFrame - panFrom, place(panFrom, cur.z, Math.min(0.62, fo.fx + 0.08), fo.fy), "lin");
  }

  camera.sort((a, b) => a.at - b.at);
  // ---- 6. No dead air: the reference changes the frame about every second and a half. Stretches of
  // talking with no planned move get a punch-in on a word, then a release, every ~2.2 s.
  {
    const busy: number[][] = camera.map((k) => [k.at - F(12), k.at + k.d + F(12)]);
    broll.forEach((b) => busy.push([b.start - F(12), b.end + F(24)]));
    titles.forEach((t) => (t.kind === "final" || t.kind === "punch") && busy.push([t.start - F(6), t.end + F(4)]));
    busy.push([0, setEnd + F(12)]);
    busy.sort((a, b) => a[0] - b[0]);
    const gaps: number[][] = [];
    let at = 0;
    for (const [a, b] of busy) {
      if (a - at > F(96)) gaps.push([at, a]);
      at = Math.max(at, b);
    }
    if (endFrame - at > F(96)) gaps.push([at, endFrame]);
    const extra: CamKey[] = [];
    let side = 1;
    for (const [g0, g1] of gaps) {
      let t = g0 + F(14);
      while (t + F(44) < g1) {
        const near = words.find((w) => w.s >= t - F(8) && w.s <= t + F(10));
        const s0 = near ? near.s : t;
        const base = camAt(camera.concat(extra).sort((a, b) => a.at - b.at), s0);
        const st = { z: base.z, x: base.x, y: base.y };
        const fo = faceOn(s0, st);
        const inn = cover(s0 + F(7), place(s0, st.z * 1.13, fo.fx + side * 0.025, fo.fy));
        extra.push({ at: s0, d: F(7), z: +inn.z.toFixed(5), x: +inn.x.toFixed(3), y: +inn.y.toFixed(3), e: "io" });
        extra.push({ at: s0 + F(34), d: F(12), z: +st.z.toFixed(5), x: +st.x.toFixed(3), y: +st.y.toFixed(3), e: "io" });
        S(s0, "es_whoosh", 0.35);
        side = -side;
        t = s0 + F(66);
      }
    }
    camera.push(...extra);
    camera.sort((a, b) => a.at - b.at);
  }
  const merge = (rs: number[][]) => rs.sort((a, b) => a[0] - b[0]);
  gridZoom.sort((a, b) => a[0] - b[0]);
  // At low frame rates two keys can land on one frame; keep every key, one frame apart.
  for (let i = 1; i < gridZoom.length; i += 1) if (gridZoom[i][0] <= gridZoom[i - 1][0]) gridZoom[i][0] = gridZoom[i - 1][0] + 1;
  gridTexture.sort((a, b) => a[0] - b[0]);
  setOpacity.sort((a, b) => a[0] - b[0]);
  sfx.sort((a, b) => a.t - b.t);
  // Frames where the grid set covers the room, so the picture may leave the frame edge (drop and rise).
  const free: number[][] = [[0, setEnd + F(19)]];
  if (broll.length) free.push([broll[broll.length - 1].end - 1, broll[broll.length - 1].end + F(48)]);
  return { fps, W, H, endFrame, camera, titles, setOpacity, gridZoom, gridTexture, capHide: merge(capHide), capY, free, flashes, broll, sfx, notes };
}
