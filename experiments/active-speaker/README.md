# Offline active-speaker evaluation

This experiment compares Light-ASD's published AVA and TalkSet-finetuned weights
on fixed Aiden source windows previously evaluated by the shortform agent.
It does not register a new Runtime task, edit a Draft, or change the app prompt.

## Reproduce

Use a separate Python 3.12 environment with torch, opencv-python-headless, scipy,
and python_speech_features. Clone https://github.com/Junhua-Liao/Light-ASD at
`ed38c232de5efe0261dbd68627c0ade7cdfe14eb` and obtain OpenCV's
`face_detection_yunet_2023mar.onnx` as `yunet.onnx` in that checkout.
The upstream code/model license is in its LICENSE (MIT).

```sh
python evaluate.py --upstream /path/to/Light-ASD \
  --cases /path/to/cases.json --output /path/to/output
```

Cases contain an ID, draft anchor frame/time, and cameras with `videoIndex`,
absolute `path`, `sourceStartSeconds`, and `duration: 3.0`. Source times must
already be mapped through the sync timeline and any removed silence. Each
window begins 0.5 seconds before the reviewed anchor. Video decodes at 25 fps;
16 kHz mono audio from the first camera is shared across synchronized angles.
Do not pass unsynchronized cameras.

YuNet detections at every frame are associated by IoU and one-to-one assignment.
Tracks must cover at least 70% of the window with no detection gap above five
frames. Missing positions are interpolated; edge positions are held. This is
short-window tracking, not a persistent or cross-camera person identity system.
Face preprocessing follows the upstream demo: median-smoothed boxes, expanded
224px crops, grayscale center 112px patch, 13-coefficient MFCC audio, and an
explicit 1/2/3-second ensemble. CPU execution uses four Torch threads.

`results.json` saves every track, box and per-frame score from BOTH checkpoints,
model hashes, and decode/detection/inference times. `anchorMean` is the mean
score at 0.2–1.0 seconds, around the review anchor. Scores are logits, not
calibrated confidence probabilities. The harness does not choose an identity
or force the top-ranked person to be a speaker. Reference photos show track IDs
for manual comparison. Initialization/model loading and dependency installation
are excluded from per-case timings.

This is a small offline feasibility test, not an end-to-end speed benchmark or
production Runtime integration. Windows/Mac provisioning, portable inference,
long-term tracking, cross-camera identity, overlap, off-screen voices, and score
calibration require separate validation before exposing a public Runtime task.

## Controls and review artifacts

Repeat evaluation with `--controls --output /path/to/output/controls`. This
keeps the baseline measurements intact and adds silence (zero PCM, then MFCC)
and an 800 ms circular audio-feature shift. A positive result during silence
is a failure of the chosen zero-logit operating threshold, not proof that all
other weights are calibrated. A shift inside sustained speech is not a clean
synchronization ground-truth test.

```sh
python render.py /path/to/output
python report.py /path/to/output
```

Rendering uses the AVA checkpoint, saves synchronized comparison videos with
audio, and shows the raw score beside each face. Color is only score > 0,
not a correctness verdict. The report includes both checkpoints and controls.
Person descriptions are assigned spatially for these fixed-camera samples
only; they are not supplied to the model or used as ground-truth labels.

Measured local run: 8 three-second windows, 24 face tracks, two checkpoints,
31.42 seconds total (3.93 seconds/window), excluding initialization and control
runs. AVA produced a positive candidate in 7/8 windows and 0/8 silent windows.
TalkSet produced a positive candidate in 7/8 silent windows, so is not selected.
Neither count is accuracy: independent audiovisual ground truth is absent.
The earlier still-photo-based speaker judgments conflict with these outputs
and must not be treated as established ground truth.
