import { clipLevel, shiftLine, type Breakpoint, type ClipLevel } from "./gainCurve.ts";
import { musicAudio, type MusicAudio } from "./ducking.ts";
import type { ClipAudio, SoundClip } from "./scripts.ts";

export const MIN_DB = -60;
export const MAX_DB = 12;

export type Piece = [number, number];

const clampDb = (db: number, warn: (m: string) => void, what: string): number => {
  if (db < MIN_DB || db > MAX_DB) {
    warn(what + " needs " + db.toFixed(2) + " dB, outside " + MIN_DB + "..+" + MAX_DB + " dB; set to the nearest.");
    return Math.min(MAX_DB, Math.max(MIN_DB, db));
  }
  return db;
};

const clampLevel = (l: ClipLevel, warn: (m: string) => void, what: string): ClipAudio =>
  "volumeDb" in l ? { volumeDb: clampDb(l.volumeDb, warn, what) } : { volumeKeys: l.volumeKeys.map((k) => ({ atSeconds: k.atSeconds, volumeDb: clampDb(k.volumeDb, warn, what) })) };

export function keyedPiece(pieces: readonly Piece[]): Piece | null {
  let best: Piece | null = null;
  for (const p of pieces) if (p[1] - p[0] >= 2 && (!best || p[1] - p[0] > best[1] - best[0])) best = p;
  return best;
}

export function passMainLevels(pieces: readonly Piece[], gainDb: number, fps: number, warn: (m: string) => void = () => {}): { start: number; end: number; audio: ClipAudio }[] {
  const g = clampDb(gainDb, warn, "The voice");
  const keyed = keyedPiece(pieces);
  return pieces.map((p) => ({
    start: p[0],
    end: p[1],
    audio: p === keyed ? { volumeKeys: [{ atSeconds: 0, volumeDb: g }, { atSeconds: (p[1] - p[0] - 1) / fps, volumeDb: g }] } : { volumeDb: g },
  }));
}

export function finalMainLevels(pieces: readonly Piece[], voiceLine: readonly Breakpoint[], fps: number, warn: (m: string) => void = () => {}): { start: number; end: number; audio: ClipAudio }[] {
  return pieces.map((p) => ({ start: p[0], end: p[1], audio: clampLevel(clipLevel(voiceLine, { start: p[0], end: p[1] }, fps), warn, "The voice") }));
}

export const voiceLine = (gainDb: number, dipOffsets: readonly Breakpoint[]): Breakpoint[] => shiftLine(dipOffsets.length ? dipOffsets : [{ frame: 0, db: 0 }], gainDb);

export type MusicLay = { path: string; start: number; end: number; offsetSeconds: number; line: Breakpoint[] };
export type SfxLay = { path: string; start: number; end: number; gainDb: number };

export function soundClips(music: MusicLay | null, sfx: readonly SfxLay[], fps: number, offsetDb: number, warn: (m: string) => void = () => {}): { clips: SoundClip[]; music: MusicAudio | null } {
  const clips: SoundClip[] = [];
  let audio: MusicAudio | null = null;
  if (music) {
    audio = musicAudio(music.line, music.start, music.end - music.start, fps, offsetDb);
    clips.push({
      role: "music",
      path: music.path,
      start: music.start,
      end: music.end,
      offset: music.offsetSeconds,
      audio: { volumeKeys: audio.volumeKeys.map((k) => ({ atSeconds: k.atSeconds, volumeDb: clampDb(k.volumeDb, warn, "The music") })), fadeInSeconds: audio.fadeInSeconds, fadeOutSeconds: audio.fadeOutSeconds },
    });
  }
  for (const s of sfx) {
    clips.push({ role: "sfx", path: s.path, start: s.start, end: s.end, offset: 0, audio: { volumeDb: Math.round(clampDb(s.gainDb + offsetDb, warn, "A sound effect") * 1e4) / 1e4, fadeInSeconds: 0, fadeOutSeconds: 0 } });
  }
  return { clips, music: audio };
}
