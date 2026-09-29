'use strict';
// Ending muffle (spec 7.2, 15.6): the low-passed copy of the music that replaces the dry music over the ending.
// One filter for both paths: dev/build-cues.cjs bakes the bundled cues' "-muffled" files with it, and the panel (which
// embeds a copy of stMuffleCommand) bakes the user's own music with it through runShell.
//
// The cutoff was chosen as the spec's starting point (1.2 kHz, 2-pole, -1 dB); change it here only, then rebuild the
// cues and update the panel's copy.
// st-muffle:start
const ST_MUFFLE_FILTER = 'lowpass=f=1200:p=2,volume=-1dB';
const ST_MUFFLE_BITRATE = '96k';

// POSIX shell single-quoting: the whole value in '...', each ' closed, escaped and reopened ('\'').
function sq(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

// The ffmpeg command line that bakes the muffled copy of inPath into outPath. The output codec follows outPath's
// extension: .wav -> 16-bit PCM (no encoder delay, so it lines up sample for sample with any dry source; the choice
// for own music, whose dry resource is the user's file), anything else -> MP3 at ST_MUFFLE_BITRATE (the bundled cues,
// whose dry file is an MP3 from the same PCM and so carries the same encoder delay). 44.1 kHz stereo, metadata
// dropped, the output overwritten.
function stMuffleCommand(inPath, outPath) {
  const wav = /\.wav$/i.test(String(outPath));
  return ['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', sq(inPath), '-af', sq(ST_MUFFLE_FILTER), '-ar', '44100', '-ac', '2',
    ...(wav ? ['-c:a', 'pcm_s16le'] : ['-c:a', 'libmp3lame', '-b:a', ST_MUFFLE_BITRATE]), '-map_metadata', '-1', sq(outPath)].join(' ');
}
// st-muffle:end

module.exports = { ST_MUFFLE_FILTER, ST_MUFFLE_BITRATE, sq, stMuffleCommand };
