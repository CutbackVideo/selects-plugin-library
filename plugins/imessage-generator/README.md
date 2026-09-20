# iMessage Generator

Insert an editable iMessage-style chat conversation overlay into the current
Selects Draft, at the playhead, above the existing timeline. Write the
conversation as a simple script (one line per bubble, `Them:` / `Me:`,
`---` for an explicit page break) and the panel lays out animated bubbles
with a fixed-size preview.

**Experimental · 0.1.0**

## Features

- Script-driven chat bubbles (unread-count header, left/right colors, font,
  width, layout all configurable).
- Optional synced narration per message:
  - **Local · Free** — [Kokoro](https://github.com/thewh1teagle/kokoro-onnx)
    ONNX text-to-speech, downloaded and run entirely on this machine (no
    account, no per-use cost).
  - **ElevenLabs** — cloud voices using your own ElevenLabs API key
    (metered by your ElevenLabs account).
- Inserts the overlay (and narration audio, if generated) as separate,
  editable Draft content — original tracks are preserved.
- **Undo** reverts the panel's last insert via the Draft's own commit
  history.

## Setup

See [INSTALL.md](INSTALL.md). See [THIRD_PARTY.md](THIRD_PARTY.md) for
third-party model/service licensing.

## Use

1. Open a Draft, position the playhead where the overlay should start.
2. Open **iMessage Generator**, write or paste a script on the **Script**
   tab (see the built-in example for the format).
3. On the **Voice** tab, choose **Voice** for narration or **Silent** to create
   bubbles without audio. Silent mode uses the Time tab for message pacing.
4. If using Voice, set up the free local engine once or connect an ElevenLabs
   API key, then **Generate voices**.
5. Click **Apply to Draft** to insert the overlay (and narration, if used) at
   the current playhead.
6. Export the finished video through **Handoff → Export**.

## Limitations

- macOS development-build packaging only; released-version and other
  platform compatibility are unverified.
- Local voice setup downloads a ~140 MB model on first use and requires
  Python 3.10–3.13 and `ffmpeg` on `PATH`.
- ElevenLabs voices require the user's own API key and consume that
  account's quota; no key is bundled or stored by this repository.
- Conversation audio is capped at 10 minutes; very long scripts are
  rejected rather than silently truncated.
