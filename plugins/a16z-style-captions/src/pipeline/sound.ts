// Music and levels (spec 14). The house bed is a soft pad with no drums, entering at full level on the
// first frame, sitting about 9 dB under the voice with no ducking, and stopping hard on the last frame.
// The voice is levelled with clip gain only, to about -16 LUFS, so the mix lands near -15.5 LUFS.
import { fs, hostFF, type Sdk } from "./host";
import { generate } from "./media";

export const MUSIC_PROMPT =
  "Instrumental ambient underscore for a thoughtful interview: soft warm synth pad, slow evolving chords, gentle airy texture, " +
  "subtle low drone, no drums, no percussion, no beat, no vocals, calm and reflective, steady level from the first second, no fade in";

export async function makeMusic(pid: string, seconds: number, dir: string, key: string, onTick: (s: string) => void): Promise<string> {
  return generate(
    pid,
    {
      key: "a16z-music-" + key,
      endpoint: "elevenlabs/music/v2.5",
      input: { prompt: MUSIC_PROMPT, music_length_ms: Math.round(Math.min(150, Math.max(12, seconds + 3)) * 1000), force_instrumental: true, output_format: "mp3_44100_128" },
      folder: fs().join(dir, "music"),
      outputName: "short-music",
      tool: "audio",
      recipeId: "short-music",
    },
    "Music",
    onTick,
    10 * 60000
  );
}

// Integrated loudness (LUFS) of a file, or of a time window of it (loudnorm prints its JSON on stderr).
export async function loudness(sdk: Sdk, path: string, from?: number, dur?: number): Promise<number | null> {
  try {
    const win = from != null ? ["-ss", from.toFixed(3), ...(dur != null ? ["-t", dur.toFixed(3)] : [])] : [];
    const r = await hostFF("runFFmpeg", ["-hide_banner", "-nostats", ...win, "-i", path, "-vn", "-af", "loudnorm=print_format=json", "-f", "null", "-"], 180000);
    const i = Number((/"input_i"\s*:\s*"(-?[\d.]+)"/.exec(r.stderr + r.stdout) || [])[1]);
    return Number.isFinite(i) && i > -70 ? i : null;
  } catch {
    return null;
  }
}

export const VOICE_TARGET = -16;
export const BED_UNDER = 9;

export function gains(voice: number | null, music: number | null): { voiceDb: number; musicDb: number } {
  const voiceDb = voice == null ? 0 : Math.max(-8, Math.min(10, VOICE_TARGET - voice));
  const musicDb = music == null ? -24 : Math.max(-40, Math.min(6, VOICE_TARGET - BED_UNDER - music));
  return { voiceDb: Math.round(voiceDb * 10) / 10, musicDb: Math.round(musicDb * 10) / 10 };
}
