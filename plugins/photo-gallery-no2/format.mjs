// Inputs use the 60 fps reference clock; the result uses the Project frame grid.
export const REFERENCE = Object.freeze({
  width: 1080,
  height: 1920,
  fps: 60,
  durationFrames: 853,
  nominalBpm: 113,
  colorFrame: 270,
  revealFrames: Object.freeze([0, 12, 23, 36, 45, 52, 62, 73, 81, 90, 100, 113, 122, 133, 143, 151, 161, 172, 182, 192, 205]),
});

function assertPositiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${label} must be a positive integer`);
}

// Keep the reference clock, the Project frame grid and physical source seconds
// distinct. Prepared video is 60 fps, so its last frame must cover the rounded
// Project end, including when that end is later than the reference duration.
function galleryFrameClock(durationFrames, fps) {
  assertPositiveInteger(durationFrames, 'durationFrames');
  if (durationFrames > 36000) throw new Error('durationFrames must be at most 36000');
  if (typeof fps !== 'number' || !Number.isFinite(fps) || fps <= 0) throw new Error('Invalid Project frame rate');
  const frames = Math.round(durationFrames * fps / REFERENCE.fps);
  assertPositiveInteger(frames, 'Project durationFrames');
  const minimumSeconds = frames / fps;
  const preparedFrames = Math.max(durationFrames, Math.ceil(minimumSeconds * REFERENCE.fps - 1e-9));
  if (!Number.isSafeInteger(preparedFrames)) throw new Error('Prepared video duration is out of range');
  return {frames, minimumSeconds, durationFrames: preparedFrames};
}

function gallerySourceSeconds(item, label) {
  // Frame-only inputs remain supported by the standalone planner. Live Project
  // readers require exact seconds; a supplied invalid value never falls back.
  const seconds = item.durationSeconds === undefined ? item.durationFrames / REFERENCE.fps : item.durationSeconds;
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) throw new Error(`${label} needs a verified duration`);
  return seconds;
}

function validateMedia(media) {
  if (!Array.isArray(media) || media.length !== 21) throw new Error('Exactly 21 visual media slots are required');
  return media.map((item, index) => {
    if (!item || !['image', 'video'].includes(item.kind)) throw new Error(`Slot ${index + 1} needs an Image or Video Resource`);
    if (typeof item.resourceId !== 'string' || !item.resourceId.trim()) throw new Error(`Slot ${index + 1} needs a resource ID`);
    assertPositiveInteger(item.width, `Slot ${index + 1} width`);
    assertPositiveInteger(item.height, `Slot ${index + 1} height`);
    const focusX = item.focusX ?? 0.5;
    const focusY = item.focusY ?? 0.5;
    if (![focusX, focusY].every((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1)) {
      throw new Error(`Slot ${index + 1} focus must be between 0 and 1`);
    }
    if (item.kind === 'video') {
      if (item.durationSeconds === undefined) assertPositiveInteger(item.durationFrames, `Slot ${index + 1} durationFrames`);
      gallerySourceSeconds(item, `Slot ${index + 1}`);
    }
    return { ...item, focusX, focusY };
  });
}

function tileRect(row, column) {
  return {
    left: column * 360 + 2,
    right: (column + 1) * 360 - 2,
    top: Math.round(row * REFERENCE.height / 7) + 2,
    bottom: Math.round((row + 1) * REFERENCE.height / 7) - 2,
  };
}

export function planGallery(input, {preparing = false, pendingBpm = false} = {}) {
  if (!input || typeof input !== 'object') throw new Error('Gallery input is required');
  if (pendingBpm && !preparing) throw new Error('A pending BPM is only valid during preparation');
  const media = validateMedia(input.media);
  const durationFrames = input.durationFrames ?? REFERENCE.durationFrames;
  const fps = input.fps ?? REFERENCE.fps;
  const clock = galleryFrameClock(durationFrames, fps);
  const shortVideos = media.filter(item => item.kind === 'video' && gallerySourceSeconds(item, 'Video') + 1e-9 < clock.minimumSeconds);
  if (!preparing && shortVideos.length) {
    throw new Error('A selected video is too short; hold its last frame (the panel does this) before planning');
  }
  const hasManualBpm = input.manualBpm !== undefined && input.manualBpm !== null;
  const bpmPending = pendingBpm && !hasManualBpm && input.estimatedBpm == null;
  const bpm = bpmPending ? null : (hasManualBpm ? input.manualBpm : input.estimatedBpm);
  if (!bpmPending && (typeof bpm !== 'number' || !Number.isFinite(bpm) || bpm <= 0 || (!input.music && !hasManualBpm))) {
    throw new Error('BPM is required; provide a manual BPM when there is no music or no reliable estimate');
  }
  const toDraftFrame = frame => Math.round(frame * fps / REFERENCE.fps);
  const outputDurationFrames = clock.frames;
  const ratio = bpmPending ? null : REFERENCE.nominalBpm / bpm;
  const revealFrames = REFERENCE.revealFrames.map(frame => bpmPending ? null : toDraftFrame(frame * ratio));
  if (!bpmPending && revealFrames.some((frame, i) => !Number.isSafeInteger(frame) || i > 0 && frame <= revealFrames[i - 1])) {
    throw new Error('BPM is too high to show all 21 tiles in distinct output frames');
  }
  const colorFrame = bpmPending ? null : toDraftFrame(REFERENCE.colorFrame * ratio);
  if (!bpmPending && (!Number.isSafeInteger(colorFrame) || colorFrame >= outputDurationFrames)) throw new Error('Color transition would occur after the output end');
  if (input.music) {
    if (typeof input.music.resourceId !== 'string' || !input.music.resourceId.trim()) throw new Error('Music needs a resource ID');
    assertPositiveInteger(input.music.durationFrames, 'Music durationFrames');
    const musicStartFrame = input.music.startFrame ?? 0;
    if (!Number.isSafeInteger(musicStartFrame) || musicStartFrame < 0) throw new Error('Music startFrame must be nonnegative');
    if (gallerySourceSeconds(input.music, 'Music') - musicStartFrame / REFERENCE.fps + 1e-9 < clock.minimumSeconds) throw new Error('Selected music is too short for the output');
  }
  if (preparing && shortVideos.length && clock.durationFrames > 36000) throw new Error('Prepared video exceeds the 36000-frame limit');
  const tiles = media.map((item, i) => ({
    slotKey: `tile-${String(i + 1).padStart(2, '0')}`,
    resourceId: item.resourceId,
    kind: item.kind,
    row: Math.floor(i / 3),
    column: i % 3,
    rect: tileRect(Math.floor(i / 3), i % 3),
    revealFrame: revealFrames[i],
    endFrame: outputDurationFrames,
    focusX: item.focusX,
    focusY: item.focusY,
  }));
  return {
    frameSize: { width: REFERENCE.width, height: REFERENCE.height },
    fps,
    durationFrames: outputDurationFrames,
    bpm,
    bpmSource: bpmPending ? 'pending' : hasManualBpm ? 'manual' : 'estimated',
    preparation: {durationFrames: clock.durationFrames, minimumSeconds: clock.minimumSeconds},
    colorFrame,
    music: input.music ? { ...input.music, startSeconds: (input.music.startFrame ?? 0) / REFERENCE.fps } : null,
    tiles,
  };
}
