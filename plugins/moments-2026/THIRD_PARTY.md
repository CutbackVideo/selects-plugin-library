# Third-party components

- React and Remotion are imported from the Selects host environment. This package does not redistribute those runtimes.
- Users supply their own footage. No reference footage, sample recordings or model weights are included.
- Fonts are not bundled. The year, title and subtitle use fonts installed on the computer (Avenir Next and Didot by default, with system fallbacks).

## Music

`assets/music.m4a` is a 28-second excerpt (0-28 s) of **One Cool Minute** by **Loyalty Freak Music**, from the album
*MINIMAL AMBIENT BOUNCE*, released under **CC0 1.0 Universal** (public domain dedication). Attribution is not required;
the artist and source are recorded for traceability.

- Source page: https://freemusicarchive.org/music/Loyalty_Freak_Music/MINIMAL_AMBIENT_BOUNCE/Loyalty_Freak_Music_-_MINIMAL_AMBIENT_BOUNCE_-_02_One_Cool_Minute/
- Licence evidence: `assets/licenses/one-cool-minute.txt` (the same recording and evidence bundled with the EO Shorts plugin, track `m06`).
- Licence legal code: `assets/licenses/CC0-1.0.txt`.
- Processing (ffmpeg): the first 28 s of the EO Shorts excerpt, +4 dB gain, limiter at -1.5 dBFS, 0.6 s fade-out at the end, AAC-LC 160 kb/s. About -14 LUFS integrated.
- Tempo 120 BPM, first downbeat at 0 s. The template's cuts sit on this grid.

## Gallery preview

`preview.mp4` and `poster.webp` show a build of this plugin on AI-generated test footage made for it in Selects. No stock or third-party footage appears in them.
