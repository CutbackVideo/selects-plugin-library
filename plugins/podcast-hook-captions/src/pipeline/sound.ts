// The reel's soundtrack: the Draft's voice, a generated phonk track under it and the sound effects the
// plan cues, mixed and mastered with ffmpeg into one WAV laid over the whole Draft. Levels follow the
// reference: the music about 13 dB under the voice, the effects peaking over it, mastered to about -9 LUFS.
import { ffmpeg, fs, J, removeFile } from "./host";
import { generate, SFX_ANCHOR } from "./media";
import type { Plan } from "../plan";

export const MUSIC_PROMPT =
  "Instrumental drift phonk, 123 BPM, punchy trap drums, heavy distorted 808 bass, cowbell melody, dark and energetic, steady groove from the first second, no vocals, no intro fade";

export async function makeMusic(pid: string, seconds: number, dir: string, key: string, onTick: (s: string) => void): Promise<string> {
  return generate(
    pid,
    {
    key: "phc-music-" + key,
    endpoint: "elevenlabs/music/v2.5",
    input: { prompt: MUSIC_PROMPT, music_length_ms: Math.round(Math.min(120, Math.max(12, seconds + 2)) * 1000), force_instrumental: true, output_format: "mp3_44100_128" },
    folder: fs().join(dir, "music"),
    outputName: "reel-music",
    tool: "audio",
    recipeId: "reel-music",
    },
    "Music",
    onTick,
    10 * 60000
  );
}

async function loudnessInfo(path: string): Promise<{ i: number; tp: number } | null> {
  try {
    // loudnorm prints its measurement (JSON) at the end of the log.
    const { stderr } = await ffmpeg("Measure loudness", ["-nostats", "-i", path, "-vn", "-af", "loudnorm=print_format=json", "-f", "null", "-"], 120000, true);
    const i = Number((/"input_i"\s*:\s*"(-?[\d.]+)"/.exec(stderr) || [])[1]);
    const tp = Number((/"input_tp"\s*:\s*"(-?[\d.]+)"/.exec(stderr) || [])[1]);
    return Number.isFinite(i) && i > -70 ? { i, tp: Number.isFinite(tp) ? tp : -3 } : null;
  } catch {
    return null;
  }
}
async function loudness(path: string): Promise<number | null> {
  return (await loudnessInfo(path))?.i ?? null;
}
// Peak level (dB) and when it happens (s, to 10 ms); null when it cannot be measured. The effect is
// decoded to raw 16-bit samples and scanned here.
async function peakInfo(path: string, scratch: string): Promise<{ db: number; at: number } | null> {
  const raw = scratch + ".s16";
  try {
    const rate = 8000;
    await ffmpeg("Measure peak", ["-v", "error", "-y", "-i", path, "-vn", "-ac", "2", "-ar", String(rate), "-f", "s16le", raw], 60000);
    const bytes: Uint8Array = await fs().readFile(raw);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let best = 0;
    let bestAt = 0;
    for (let k = 0; k + 1 < bytes.byteLength; k += 2) {
      const v = Math.abs(view.getInt16(k, true));
      if (v > best) {
        best = v;
        bestAt = Math.floor(k / 4); // frame index (2 channels x 2 bytes)
      }
    }
    if (!best) return null;
    return { db: 20 * Math.log10(best / 32768), at: Math.floor(bestAt / (rate / 100)) / 100 };
  } catch {
    return null;
  } finally {
    (await removeFile(raw));
  }
}

// Speech chain: rumble cut, steady compression, a little less mud and a little more presence.
const VOICE_CHAIN =
  "highpass=f=80,acompressor=threshold=-22dB:ratio=3:attack=5:release=90:makeup=3,equalizer=f=250:t=q:w=1:g=-2,equalizer=f=3200:t=q:w=1:g=2.5,equalizer=f=9000:t=h:w=0.7:g=1.5";
// The music leaves room for the voice.
const MUSIC_CHAIN = "highpass=f=35,equalizer=f=2500:t=q:w=1.2:g=-4";
const LOUD_TARGET = -9; // LUFS; the reference is mastered at about -8.4
const PEAK_LIMIT = 0.85; // about -1.4 dBFS, leaving room for inter-sample peaks

// The whole soundtrack in one clip: the Draft's voice (processed), the music about 13 dB under it and the
// cued effects, mastered loud like the reference. The Main clips are muted by the caller, so an edit to
// the reel's cut needs a rebuild to bring the sound along.
export async function mixSound(plan: Plan, voiceFrom: string, music: string | null, lib: Record<string, string>, outPath: string, dir: string) {
  const S = plan.endFrame / plan.fps;
  const dur = S.toFixed(3);
  const voicePath = fs().join(dir, "voice-" + Date.now().toString(36) + ".wav");
  await ffmpeg(
    "Process the voice",
    ["-v", "error", "-y", "-i", voiceFrom, "-vn", "-af", "aformat=sample_rates=48000:channel_layouts=stereo," + VOICE_CHAIN + ",apad=whole_dur=" + dur + ",atrim=0:" + dur, "-c:a", "pcm_s24le", voicePath],
    180000
  );
  const voice = (await loudness(voicePath)) ?? -18;
  const inputs: string[] = [voicePath];
  const graph: string[] = ["[0:a]anull[v]"];
  const mixIn: string[] = ["[v]"];
  if (music) {
    const mi = (await loudness(music)) ?? -14;
    const idx = inputs.length;
    inputs.push(music);
    graph.push(
      "[" + idx + ":a]aformat=sample_rates=48000:channel_layouts=stereo,atrim=0:" + dur + "," + MUSIC_CHAIN + ",volume=" + (voice - 13 - mi).toFixed(2) + "dB,afade=t=in:d=0.15,afade=t=out:st=" + Math.max(0, S - 0.35).toFixed(3) + ":d=0.35[m]"
    );
    mixIn.push("[m]");
  }
  const peaks: Record<string, { db: number; at: number }> = {};
  const cachePath = fs().join(dir, "..", "sfx-peaks-v2.json");
  try {
    Object.assign(peaks, JSON.parse(String(await fs().readFile(cachePath, "utf8"))));
  } catch {}
  for (const k of Object.keys(lib)) {
    if (peaks[k]) continue;
    const got = await peakInfo(lib[k], fs().join(dir, "peak-" + k));
    if (got) peaks[k] = got;
  }
  try {
    await fs().writeFile(cachePath, J(peaks));
  } catch {}
  for (const ev of plan.sfx) {
    const file = lib[ev.kind];
    if (!file) continue;
    const pk = peaks[ev.kind] || { db: -3, at: 0 };
    const idx = inputs.length;
    inputs.push(file);
    // Effects peak about 9 dB over the voice's loudness times the cue's weight (the level the first
    // mix used), with the low end of the airy ones cut so they stay crisp.
    const g = voice + 9 - pk.db + 20 * Math.log10(Math.max(0.05, ev.gain * 0.85));
    const start = ev.t + (SFX_ANCHOR[ev.kind] ?? 0) - pk.at;
    const ms = Math.max(0, Math.round(start * 1000));
    const head = start < 0 ? "atrim=start=" + (-start).toFixed(3) + ",asetpts=PTS-STARTPTS," : "";
    const hp = ev.kind === "bass_drop" || ev.kind === "movie_title" ? "" : "highpass=f=140,";
    graph.push("[" + idx + ":a]aformat=sample_rates=48000:channel_layouts=stereo," + head + hp + "volume=" + g.toFixed(2) + "dB,adelay=" + ms + "|" + ms + "[s" + idx + "]");
    mixIn.push("[s" + idx + "]");
  }
  // Pre-master: exactly the reel's length (the clip is laid over the whole Draft).
  graph.push(mixIn.join("") + "amix=inputs=" + mixIn.length + ":normalize=0:duration=longest,apad=whole_dur=" + dur + ",atrim=0:" + dur + "[out]");
  // The graph is passed as one argument (no shell); a copy is kept beside the reel for inspection.
  await fs().writeFile(fs().join(dir, "mix.txt"), graph.join(";\n"));
  const pre = fs().join(dir, "premaster-" + Date.now().toString(36) + ".wav");
  await ffmpeg(
    "Mix voice, music and sound effects",
    ["-v", "error", "-y", ...inputs.flatMap((p) => ["-i", p]), "-filter_complex", graph.join(";"), "-map", "[out]", "-c:a", "pcm_s24le", pre],
    240000
  );
  // Master: gain up to the target loudness into a brick-wall limiter. The limiter takes some loudness
  // back, so the gain is corrected once from a measurement of the first pass.
  const preI = (await loudness(pre)) ?? -16;
  const master = async (gainDb: number) =>
    ffmpeg(
      "Master the sound",
      ["-v", "error", "-y", "-i", pre, "-af", "volume=" + gainDb.toFixed(2) + "dB,alimiter=limit=" + PEAK_LIMIT + ":attack=3:release=60:level=disabled", "-c:a", "pcm_s16le", outPath],
      120000
    );
  let gain = LOUD_TARGET - preI;
  await master(gain);
  let out = await loudnessInfo(outPath);
  if (out && out.i < LOUD_TARGET - 0.4) {
    gain += Math.min(4, LOUD_TARGET - out.i);
    await master(gain);
    out = await loudnessInfo(outPath);
  }
  (await removeFile(voicePath));
  (await removeFile(pre));
  return { lufs: out ? out.i : LOUD_TARGET, truePeak: out ? out.tp : null };
}
