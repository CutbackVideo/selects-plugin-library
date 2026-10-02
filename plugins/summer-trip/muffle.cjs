'use strict';
// Ending muffle (spec 7.2, 15.6): the low-passed copy of the music that replaces the dry music over the ending.
// One filter for both paths: dev/build-cues.cjs bakes the bundled cues' "-muffled" files with it, and the panel (which
// embeds a copy of stMuffleArgs) bakes the user's own music with it through the host's ffmpeg (Runtime.runFFmpeg, an
// argument array: no shell, so the same on macOS and Windows).
//
// Change the filter here only, then rebuild the cues and update the panel's copy (tests/panel.test.cjs checks it).
// st-muffle:start
// Cutoff: the similarity reference keeps 0.30 % of its energy above 3 kHz over the ending, from 2.56 % before it (x 0.117,
// -9.3 dB). The spec's starting point (1.2 kHz, 2-pole) kept 0.5 % of the dry share (-23 dB), far darker.
// Share of the energy above 3 kHz, the filter run on each bundled -11 LUFS dry cue, over the dry's own share
// (dev/measure-muffle.cjs; mean of the four cues; dry shares surf 3.43 %, tropical 2.50 %, cinematic 1.63 %, disco 4.44 %):
//   lowpass=f=1200:p=2  -23.3 dB      lowpass=f=1200:p=1  -12.2 dB      lowpass=f=1600:p=1  -10.0 dB
//   lowpass=f=2500:p=2  -11.3 dB      lowpass=f=2700:p=2  -10.2 dB      lowpass=f=3000:p=2   -8.8 dB
//   lowpass=f=2800:p=2   -9.7 dB (surf / tropical / cinematic / disco -9.2 / -10.5 / -9.7 / -9.5)  <- chosen: in the
//   1/8-1/10 band, 2-pole like the starting point. The shipped 96k -muffled.mp3 files keep 0.44 / 0.24 / 0.19 / 0.53 %
//   (-8.9 / -10.2 / -9.4 / -9.2 dB against the dry).
// The -1 dB keeps the wet a touch under the dry it replaces at the ending cut.
const ST_MUFFLE_FILTER = 'lowpass=f=2800:p=2,volume=-1dB';
const ST_MUFFLE_BITRATE = '96k';
// 8 hex digits of the filter's FNV-1a hash: part of the own-music muffled copy's cached file name, so a filter change
// bakes a new copy instead of reusing one made with the old filter.
const ST_MUFFLE_TAG = (() => {
  let h = 0x811c9dc5;
  for (const ch of ST_MUFFLE_FILTER) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
  return h.toString(16).padStart(8, '0');
})();

// The ffmpeg arguments (after the program name) that bake the muffled copy of inPath into outPath, as an array: each
// path is one element, never quoted or split by a shell. The output codec follows outPath's extension: .wav -> 16-bit
// PCM (no encoder delay, so it lines up sample for sample with any dry source; the choice for own music, whose dry
// resource is the user's file), anything else -> MP3 at ST_MUFFLE_BITRATE (the bundled cues, whose dry file is an MP3
// from the same PCM and so carries the same encoder delay). 44.1 kHz stereo, metadata dropped, the output overwritten.
function stMuffleArgs(inPath, outPath) {
  const wav = /\.wav$/i.test(String(outPath));
  return ['-nostdin', '-v', 'error', '-y', '-i', String(inPath), '-af', ST_MUFFLE_FILTER, '-ar', '44100', '-ac', '2',
    ...(wav ? ['-c:a', 'pcm_s16le'] : ['-c:a', 'libmp3lame', '-b:a', ST_MUFFLE_BITRATE]), '-map_metadata', '-1', String(outPath)];
}
// st-muffle:end

module.exports = { ST_MUFFLE_FILTER, ST_MUFFLE_BITRATE, ST_MUFFLE_TAG, stMuffleArgs };
