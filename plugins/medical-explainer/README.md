# Medical Explainer

Turns a topic, pasted text or a link into a vertical (9:16) health explainer. The script step picks how to explain
the topic, and the pictures and screen follow it:

- **Zoom** — from the big picture down to the detail, on a 16:9 strip card between a two-line title and a brand
  wordmark, with continuous camera-move transitions, pointer labels, a split comparison and circular insets.
- **Myth or fact** — two or three common beliefs, each with a big X or O stamp and a one-line reason card, on a full
  9:16 frame.
- **Timeline** — a day or a sequence of steps with time chips, on a full 9:16 frame.
- **Steps or list** — the conclusion first, then numbered step cards, on a full 9:16 frame.

In the myth, timeline and steps modes the script can add a short inside-the-body dive (2-4 scenes in 3D medical CG,
entered with a push and left with a pull) for the explanation; the "Inside-the-body shots" setting turns this on,
leaves it to the script (default) or turns it off.

The layout decides the picture's shape: the **16:9 strip card** (zoom by default) or the **full 9:16 frame** (the other
modes by default), with keyframes and video generated at that aspect. The explanation mode, the art style (3D medical
CG, photoreal everyday, stylized 3D character, clean infographic), the layout and the keyframe model can also be chosen
under Advanced settings. Every title, label, caption and card is its own editable graphic clip.

Medical facts stay general and well established, but every video still needs a medical review before it is published.

## Use

1. Open a Project, then open **Medical Explainer** from Apps.
2. Enter a topic, a link, or paste the text, and choose the brand preset (Generic or Chosun Ilbo Health; the Chosun
   preset shows the Chosun Ilbo logo). The line under the button summarises the settings: what is automatic, what you
   changed, the keyframe model and the voice. Everything else (narration language and voice, keyframe model,
   explanation mode, art style, inside-the-body shots, layout, music, the review steps, the wordmark and colours) is
   under **Advanced settings**, closed by default; its header counts the values you changed.
3. Press **Write the script**. Read the 8-10 sentences, the scene labels and the pointer labels, and edit the two title
   lines. The panel shows what will be generated (and paid for with Selects credits) before anything is made.
4. Press **Make keyframes**. Two candidate keyframes are drawn per scene and the AI picks one; change any pick, then
   press **Use these and make the video**. (Turn off the review switches to run straight through.)
5. The scene clips, transitions, labels and a scene check are made, and the video appears as an editable Draft in the
   Project. Every title, label, caption and pointer is its own graphic clip with editable text, colours and font.
6. Export it with **Handoff → Export**.

## What it generates

- Narration per sentence: ElevenLabs v3 (Daniel) by default, or MiniMax Speech 2.8 HD (Korean Calm Lady, Korean Gentle
  Woman). The measured sentence lengths set all timing.
- Keyframes: the keyframe model you choose (Seedream 5.0 Pro by default, or Nano Banana 2.1, Nano Banana Pro, GPT
  Image 2.5, FLUX 3), at the layout's aspect (16:9 strip or 9:16 full frame), two candidates per scene. There are two
  style families, each with its own reference: everyday scenes follow scene 1's chosen keyframe, inside-the-body scenes
  follow the first inside scene's. The first scene of each family is drawn from text and the rest are edits of it. FLUX
  3 has no edit model, so its later scenes are drawn from the text and style description alone.
- If Kling refuses a scene's keyframe for its content policy, the run stops and shows that scene. You choose: regenerate
  that scene's keyframe with a model you pick (a new paid request), or use the still image (a slow zoom on the
  keyframe). Nothing is regenerated or resubmitted without that choice. The keyframe model of a started job does not
  change; a different model means a new job.
- Scene clips: Kling v3 Standard (720p), start frame only, `max(5, ceil(length + 0.5))` seconds, two takes per scene.
  Each clip plays from its first frame at normal speed.
- Transitions follow the script: a hard cut, a three-frame white flash, a 0.5-second dissolve, or (push and pull only)
  a generated Kling v3 Standard clip of 3 seconds from the last frame a scene shows to the first frame of the next, two
  takes per boundary, played whole at about 1.7x in a 1.8-second slot centred in the 0.8-second pause between
  sentences. A generated transition that melts or jumps becomes a 0.5-second dissolve.
- A sentence too long for one video clip (more than 14.5 seconds on screen) stops the run after narration, before any
  keyframe or clip is made; split or shorten it in the script list and try again.

## Brand assets

`assets/chosun-ilbo-logo.svg` is the Chosun Ilbo text logo, from Wikimedia Commons
([File:Chosun IIbo Logo.svg](https://commons.wikimedia.org/wiki/File:Chosun_IIbo_Logo.svg)): public domain as a text
logo, and a trademark of Chosun Media Group (author: Chosun Media Group). Its fill is white here. It is installed with
the plugin beneath `SELECTS_USER_SKILLS_ROOT/medical-explainer/assets/` and used only by the Chosun Ilbo Health preset,
where **Advanced settings → Show the logo** turns it off; the other preset shows its text wordmark.

## Platforms

Verified on macOS (Selects Staging 2.0.736: zoom with the strip card, myth on the full frame, myth with inside-the-body
shots) and on Windows x64 (Selects Staging 2.0.715: timeline on the full frame, installed by the plugin installer, a
Draft with Korean captions). Not yet verified on Windows: user folders whose path has Korean characters or spaces, the
strip layout, and resuming after an app restart. On Windows a working path of 240 characters or more stops the run with
a message; long paths are not supported beyond that.
