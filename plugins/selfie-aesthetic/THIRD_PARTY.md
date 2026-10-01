# Third-party components

- React and Remotion are imported from the Selects host environment. This package does not redistribute those runtimes; the host's dependency versions and applicable terms govern their use.
- ffmpeg is not bundled. Music previews and your own music use the ffmpeg that is bundled with Selects, run through the Selects host.
- `beat-detect.cjs` is the beat detector from the Selects app kit (selects-app-kit). It is our own code, not a third-party library. The panel embeds its logic and also reads this file at runtime.
- Users supply their own footage and, optionally, their own music. No sample recordings, reference footage or model weights are included. The edit is inspired by a CapCut aesthetic-edit template; no part of that template is included.

## Music

The four bundled tracks in `assets/cues/` are excerpts of tracks released under **CC0 1.0 Universal** (public domain dedication) and downloaded from the Free Music Archive. CC0 does not require attribution; the credits are given here as a courtesy. Each source page carries the licence line quoted below. Licence text: https://creativecommons.org/publicdomain/zero/1.0/

Processing (all four): a 65 s excerpt at the original tempo and pitch (no tempo or pitch change), with a 0.5 s fade in and a 2 s fade out, loudness normalised to about -10.5 LUFS (static gain plus a -2 dBFS limiter), and re-encoded as 44.1 kHz stereo MP3 at 160 kbps. Tempo, first beat and content hash are recorded in `assets/cues/manifest.json`.

### Make Funk by HoliznaCC0

- File: `assets/cues/make-funk.mp3`
- Source: https://freemusicarchive.org/music/holiznacc0/bassic/make-funk/
- Download: https://files.freemusicarchive.org/storage-freemusicarchive-org/tracks/gvipQswrNI4uF5PNymw5d1cWq9gqqdTIsgHDMKCJ.mp3
- Licence: CC0 1.0 Universal (https://creativecommons.org/publicdomain/zero/1.0/)
- Licence line on the source page: "Make Funk by HoliznaCC0 is licensed under a CC0 1.0 Universal License."
- Accessed: 2026-10-01
- Excerpt: starts at 20.712 s in the source track, 65 s long. Excerpt at native tempo and pitch; static gain -0.60 dB and a -2 dBFS limiter (4x oversampled) to -10.5 LUFS; 44.1 kHz stereo MP3 160 kbps.

### Day Trips by HoliznaCC0

- File: `assets/cues/day-trips.mp3`
- Source: https://freemusicarchive.org/music/holiznacc0/city-slacker/day-trips/
- Download: https://files.freemusicarchive.org/storage-freemusicarchive-org/tracks/8mlLtuhQCO7ohFxygnQb39fJBNNxM2iTjr6Bdrff.mp3
- Licence: CC0 1.0 Universal (https://creativecommons.org/publicdomain/zero/1.0/)
- Licence line on the source page: "Day Trips by HoliznaCC0 is licensed under a CC0 1.0 Universal License."
- Accessed: 2026-10-01
- Excerpt: starts at 116.838 s in the source track, 65 s long. Excerpt at native tempo and pitch; static gain 2.82 dB and a -2 dBFS limiter (4x oversampled) to -10.5 LUFS; 44.1 kHz stereo MP3 160 kbps.

### Sensual Melancholia by Loyalty Freak Music

- File: `assets/cues/sensual-melancholia.mp3`
- Source: https://freemusicarchive.org/music/Loyalty_Freak_Music/INSTRUMENTAL_RB_BEATS_TO_SING_OR_RAP_ON/Loyalty_Freak_Music_-_INSTRUMENTAL_RB_BEATS_TO_SING_OR_RAP_ON_-_03_Sensual_Melancholia/
- Download: https://files.freemusicarchive.org/storage-freemusicarchive-org/music/Music_for_Video/Loyalty_Freak_Music/INSTRUMENTAL_RB_BEATS_TO_SING_OR_RAP_ON/Loyalty_Freak_Music_-_03_-_Sensual_Melancholia.mp3
- Licence: CC0 1.0 Universal (https://creativecommons.org/publicdomain/zero/1.0/)
- Licence line on the source page: "Sensual Melancholia by Loyalty Freak Music is licensed under a CC0 1.0 Universal License."
- Accessed: 2026-10-01
- Excerpt: starts at 168.648 s in the source track, 65 s long. Excerpt at native tempo and pitch; static gain 0.70 dB and a -2 dBFS limiter (4x oversampled) to -10.5 LUFS; 44.1 kHz stereo MP3 160 kbps.

### Pantheon by HoliznaCC0

- File: `assets/cues/pantheon.mp3`
- Source: https://freemusicarchive.org/music/holiznacc0/phonk-aura-farming/pantheon/
- Download: https://files.freemusicarchive.org/storage-freemusicarchive-org/tracks/15yiCDxLujj0mWw7LZHHsSxb33E1qfdAHyzoTqPB.mp3
- Licence: CC0 1.0 Universal (https://creativecommons.org/publicdomain/zero/1.0/)
- Licence line on the source page: "Pantheon by HoliznaCC0 is licensed under a CC0 1.0 Universal License."
- Accessed: 2026-10-01
- Excerpt: starts at 109.334 s in the source track, 65 s long. Excerpt at native tempo and pitch; static gain 1.05 dB and a -2 dBFS limiter (4x oversampled) to -10.5 LUFS; 44.1 kHz stereo MP3 160 kbps.

