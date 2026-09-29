// Pure Photo Gallery contract. All frame values use the 60 fps output clock.
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
    if (item.kind === 'video') assertPositiveInteger(item.durationFrames, `Slot ${index + 1} durationFrames`);
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

export function planGallery(input) {
  if (!input || typeof input !== 'object') throw new Error('Gallery input is required');
  const media = validateMedia(input.media);
  const durationFrames = input.durationFrames ?? REFERENCE.durationFrames;
  assertPositiveInteger(durationFrames, 'durationFrames');
  if (media.some((item) => item.kind === 'video' && item.durationFrames < durationFrames)) {
    throw new Error('A selected video is too short; extend it with hold_video.py before planning');
  }
  const hasManualBpm = input.manualBpm !== undefined && input.manualBpm !== null;
  const bpm = hasManualBpm ? Number(input.manualBpm) : Number(input.estimatedBpm);
  if (!Number.isFinite(bpm) || bpm <= 0 || (!input.music && !hasManualBpm)) {
    throw new Error('BPM is required; provide a manual BPM when there is no music or no reliable estimate');
  }
  const ratio = REFERENCE.nominalBpm / bpm;
  const revealFrames = REFERENCE.revealFrames.map((frame) => Math.round(frame * ratio));
  if (revealFrames.some((frame, i) => i > 0 && frame <= revealFrames[i - 1])) {
    throw new Error('BPM is too high to show all 21 tiles in distinct output frames');
  }
  const colorFrame = Math.round(REFERENCE.colorFrame * ratio);
  if (colorFrame >= durationFrames) throw new Error('Color transition would occur after the output end');
  if (input.music) {
    if (typeof input.music.resourceId !== 'string' || !input.music.resourceId.trim()) throw new Error('Music needs a resource ID');
    assertPositiveInteger(input.music.durationFrames, 'Music durationFrames');
    const musicStartFrame = input.music.startFrame ?? 0;
    if (!Number.isSafeInteger(musicStartFrame) || musicStartFrame < 0) throw new Error('Music startFrame must be nonnegative');
    if (input.music.durationFrames - musicStartFrame < durationFrames) throw new Error('Selected music is too short for the output');
  }
  const tiles = media.map((item, i) => ({
    slotKey: `tile-${String(i + 1).padStart(2, '0')}`,
    resourceId: item.resourceId,
    kind: item.kind,
    row: Math.floor(i / 3),
    column: i % 3,
    rect: tileRect(Math.floor(i / 3), i % 3),
    revealFrame: revealFrames[i],
    endFrame: durationFrames,
    focusX: item.focusX,
    focusY: item.focusY,
  }));
  return {
    frameSize: { width: REFERENCE.width, height: REFERENCE.height },
    fps: REFERENCE.fps,
    durationFrames,
    bpm,
    bpmSource: hasManualBpm ? 'manual' : 'estimated',
    colorFrame,
    music: input.music ?? null,
    tiles,
  };
}
