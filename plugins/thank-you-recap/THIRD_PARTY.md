# Third-party components

- React and Remotion are imported from the Selects host environment. This
  package does not redistribute them; the host's dependency versions and terms
  govern their use.
- `ffmpeg` is not bundled. When it is available, the panel runs it through the
  Selects shell to build the hero-shot candidate sheet.
- `assets/music.mp3` was made by Cutback. The bass roll was synthesized from a
  sound effect generated with the ElevenLabs sound-effects model; the rest was
  generated with the ElevenLabs Music API under Cutback's paid plan. Parts of
  the generation used short excerpts of "Taps" and "Arroz Con Pollo" by Kevin
  MacLeod (incompetech.com, licensed under Creative Commons Attribution 4.0,
  https://creativecommons.org/licenses/by/4.0/) as style references. The file
  contains no recordings, samples or lyrics taken from other works.
- `assets/year-fonts.json` embeds digit-only subsets of these fonts, each
  licensed under the SIL Open Font License 1.1 (full texts in `licenses/`):
  Rubik Dirt (The Rubik Filtered Project Authors), Fraunces (The Fraunces
  Project Authors), Titan One (Rodrigo Fuenzalida), Caveat (The Caveat Project
  Authors), Great Vibes (The Great Vibes Pro Project Authors) and Fredoka (The
  Fredoka Project Authors). The fonts were instanced where variable, subset to
  digits and renamed "Recap…" internally; Titan One declares the Reserved Font
  Name "Titan", which modified versions may not use.
- Users supply their own footage. No sample footage or model weights are
  included. The preview video shows AI-generated travel footage.
