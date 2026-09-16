#!/bin/bash
set -euo pipefail

# Usage:
# render_template.sh SUBJECT CUTOUT DIVISIONS BG1 ... BGn PHOTO_COUNT PHOTO1 ... PHOTOm OUTPUT
if [ "$#" -lt 7 ]; then
  echo "Usage: render_template.sh SUBJECT CUTOUT DIVISIONS BG1...BGn PHOTO_COUNT PHOTO1...PHOTOm OUTPUT" >&2
  exit 2
fi

SUBJECT="$1"
CUTOUT="$2"
DIVISIONS="$3"
shift 3

if ! [[ "$DIVISIONS" =~ ^[1-9][0-9]*$ ]]; then
  echo "DIVISIONS must be a positive integer" >&2
  exit 2
fi
if [ "$#" -lt "$DIVISIONS" ]; then
  echo "Not enough landscape inputs for DIVISIONS=$DIVISIONS" >&2
  exit 2
fi
BGS=("${@:1:$DIVISIONS}")
shift "$DIVISIONS"

PHOTO_COUNT="$1"
shift
if ! [[ "$PHOTO_COUNT" =~ ^[1-9][0-9]*$ ]]; then
  echo "PHOTO_COUNT must be a positive integer" >&2
  exit 2
fi
if [ "$#" -lt "$((PHOTO_COUNT + 1))" ]; then
  echo "Not enough photo inputs for PHOTO_COUNT=$PHOTO_COUNT" >&2
  exit 2
fi
PHOTOS=("${@:1:$PHOTO_COUNT}")
shift "$PHOTO_COUNT"
OUTPUT="$1"

WORK="$(mktemp -d /tmp/swiss-postcard-template.XXXXXX)"
trap 'rm -rf "$WORK"' EXIT
INTRO_GRAPH="$WORK/intro.graph"
INTRO="$WORK/intro.mp4"
PHOTOS_RENDER="$WORK/photos.mp4"
TITLE_BLACK="$WORK/title_black.mp4"
TITLE_PHOTOS="$WORK/title_photos.mp4"
BASE="$WORK/base.mp4"

# Keep the overall template timing stable while adapting the reveal to the number
# of panels. For three panels this preserves the original one-second reveal beats.
REVEAL_START=48
REVEAL_FRAMES=60
CUTOUT_MAIN_END=348
CUTOUT_WHITE_START=348
CUTOUT_WHITE_END=387
# The closing "curtain" (top+bottom black bars converging on the middle)
# animates across this frame window in many small quantized steps rather
# than jumping through a few big discrete states, so it reads as
# smoothly-stepped instead of jerky, while still keeping a staircase feel
# (matching the reference reel's own closing wipe, which grows in small
# increments roughly every 2-3 frames instead of a few large jumps).
BLACK_CLOSE_START=435
BLACK_CLOSE_END=471
BLACK_CLOSE_FRAMES=$((BLACK_CLOSE_END - BLACK_CLOSE_START))
BLACK_CLOSE_STEP_HOLD=3
BLACK_CLOSE_STEPS=$((BLACK_CLOSE_FRAMES / BLACK_CLOSE_STEP_HOLD))
CUTOUT_WHITE_START_SECONDS="$(awk -v n="$CUTOUT_WHITE_START" 'BEGIN{printf "%.3f", n/60}')"
CUTOUT_WHITE_END_SECONDS="$(awk -v n="$CUTOUT_WHITE_END" 'BEGIN{printf "%.3f", n/60}')"
INTRO_DURATION=8.25

{
  CUTOUT_INDEX=$((DIVISIONS + 1))
  printf '%s\n' "color=c=black:s=1920x1080:r=60:d=${INTRO_DURATION},format=rgba[canvas];"
  printf '%s\n' "[0:v]tpad=stop_mode=clone:stop=-1,trim=duration=${INTRO_DURATION},setpts=PTS-STARTPTS,scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1,fps=60,format=rgba[main_raw];"
  printf '%s\n' "[${CUTOUT_INDEX}:v]tpad=stop_mode=clone:stop=-1,setpts=PTS-STARTPTS,scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1,fps=60,format=rgba,trim=duration=5.8,setpts=PTS-STARTPTS,alphaextract,format=gray,geq=lum='255-lum(X\,Y)',tpad=stop_mode=add:stop=-1:color=white,trim=duration=${INTRO_DURATION},setpts=PTS-STARTPTS[personMaskInv];"
  printf '%s\n' "[main_raw][personMaskInv]alphamerge,format=rgba[main];"
  printf '%s\n' "[canvas][main]overlay=shortest=0:eof_action=pass:format=auto[c0];"

  CURRENT="[c0]"
  for ((i=0; i<DIVISIONS; i++)); do
    INPUT_INDEX=$((i + 1))
    OUT_LABEL="p$((i + 1))"
    X0=$((1920 * i / DIVISIONS))
    X1=$((1920 * (i + 1) / DIVISIONS))
    START=$((REVEAL_START + i * REVEAL_FRAMES))
    WIDTH=$((X1 - X0))
    START_SECONDS="$(awk -v n="$START" 'BEGIN{printf "%.4f", n/60}')"
    PANEL_DURATION="$(awk -v total="$INTRO_DURATION" -v s="$START_SECONDS" 'BEGIN{d=total-s; if (d<0.1) d=0.1; printf "%.4f", d}')"
    printf '%s\n' "[${INPUT_INDEX}:v]tpad=stop_mode=clone:stop=-1,trim=duration=${PANEL_DURATION},setpts=PTS-STARTPTS+${START_SECONDS}/TB,scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1,fps=60,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lt(N,${REVEAL_FRAMES}),if(between(X,${X0},${X0}+${WIDTH}*N/${REVEAL_FRAMES}),255,0),if(between(X,${X0},${X1}),255,0))'[${OUT_LABEL}];"
    NEXT_LABEL="c$((i + 1))"
    printf '%s\n' "${CURRENT}[${OUT_LABEL}]overlay=shortest=0:eof_action=pass:format=auto[${NEXT_LABEL}];"
    CURRENT="[${NEXT_LABEL}]"
  done

  printf '%s\n' "[${CUTOUT_INDEX}:v]tpad=stop_mode=clone:stop=-1,setpts=PTS-STARTPTS,scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1,fps=60,format=rgba,split=2[cutMainSrc][cutWhiteSrc];"
  printf '%s\n' "[cutMainSrc]trim=duration=5.8,setpts=PTS-STARTPTS[cutMain];"
  printf '%s\n' "${CURRENT}[cutMain]overlay=shortest=0:eof_action=pass:format=auto[csubject];"
  printf '%s\n' "[cutWhiteSrc]trim=start=${CUTOUT_WHITE_START_SECONDS}:end=${CUTOUT_WHITE_END_SECONDS},setpts=PTS-STARTPTS,lutrgb=r='val*0+255':g='val*0+255':b='val*0+255',fade=t=in:st=0:d=0.08:alpha=1,fade=t=out:st=0.25:d=0.38:alpha=1,setpts=PTS-STARTPTS+${CUTOUT_WHITE_START_SECONDS}/TB[whiteFlash];"
  printf '%s\n' "[csubject][whiteFlash]overlay=shortest=0:eof_action=pass:format=auto[cwhite];"
  # Symmetric top+bottom black curtain: a single quantized progress value
  # (0..540, in BLACK_CLOSE_STEPS stair-steps across BLACK_CLOSE_FRAMES) is
  # computed once via st(0,...) and reused via ld(0) for BOTH the top box's
  # height and the bottom box's start row (1080-h) — so the two halves
  # always meet exactly, with no rounding gap at the very bottom row like
  # the old independently-rounded "ih*0.33" / "ih-ih*0.33" pair produced.
  BLACK_WIPE_EXPR="max(lt(Y,st(0,floor(floor(clip(N-${BLACK_CLOSE_START},0,${BLACK_CLOSE_FRAMES})/${BLACK_CLOSE_STEP_HOLD})/${BLACK_CLOSE_STEPS}*540))),gte(Y,1080-ld(0)))*255"
  printf '%s\n' "color=c=black:s=1920x1080:r=60:d=${INTRO_DURATION},format=rgba,geq=r=0:g=0:b=0:a='${BLACK_WIPE_EXPR}'[blackwipe];"
  printf '%s\n' "[cwhite][blackwipe]overlay=shortest=0:eof_action=pass:format=auto,trim=duration=${INTRO_DURATION},setpts=PTS-STARTPTS[outv]"
} > "$INTRO_GRAPH"

INPUT_ARGS=( -i "$SUBJECT" )
for BG in "${BGS[@]}"; do INPUT_ARGS+=( -i "$BG" ); done
INPUT_ARGS+=( -i "$CUTOUT" )
ffmpeg -hide_banner -loglevel error "${INPUT_ARGS[@]}" \
  -filter_complex_script "$INTRO_GRAPH" -map '[outv]' -an -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart -video_track_timescale 60000 -y "$INTRO"

PHOTO_INPUT_ARGS=()
for PHOTO in "${PHOTOS[@]}"; do PHOTO_INPUT_ARGS+=( -loop 1 -t 0.2 -i "$PHOTO" ); done
PHOTO_FILTER=""
PHOTO_LABELS=()
PHOTO_BASE_INDEX=0
for ((i=0; i<PHOTO_COUNT; i++)); do
  INPUT_INDEX=$((PHOTO_BASE_INDEX + i))
  LABEL="ph${i}"
  PHOTO_LABELS+=("[$LABEL]")
  PHOTO_FILTER+="[${INPUT_INDEX}:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1,fps=60,trim=duration=0.2,setpts=PTS-STARTPTS[${LABEL}];"
done
CONCAT_INPUT=""
for LABEL in "${PHOTO_LABELS[@]}"; do CONCAT_INPUT+="$LABEL"; done
CYCLE_FRAMES=$((PHOTO_COUNT * 12))
TARGET_FRAMES=324
CYCLES=$(( (TARGET_FRAMES + CYCLE_FRAMES - 1) / CYCLE_FRAMES ))
LOOP_COUNT=$((CYCLES - 1))
PHOTO_FILTER+="${CONCAT_INPUT}concat=n=${PHOTO_COUNT}:v=1:a=0[cycle];[cycle]loop=loop=${LOOP_COUNT}:size=${CYCLE_FRAMES}:start=0,setpts=N/(60*TB)[photos];color=c=black@0.0:s=1920x1080:r=60:d=5.4,format=rgba,geq=r='0':g='0':b='0':a='if(lt(N,324),if(lt(Y,540*(1-((N/324)*(N/324)*(3-2*(N/324))))),255,if(gt(Y,1080-540*(1-((N/324)*(N/324)*(3-2*(N/324))))),255,0)),0)'[bars];[photos][bars]overlay=shortest=1:eof_action=pass:format=auto,trim=duration=5.4,setpts=PTS-STARTPTS[outv]"
ffmpeg -hide_banner -loglevel error "${PHOTO_INPUT_ARGS[@]}" \
  -filter_complex "$PHOTO_FILTER" -map '[outv]' -an -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart -video_track_timescale 60000 -y "$PHOTOS_RENDER"

ffmpeg -hide_banner -loglevel error -f lavfi -i "color=c=black:s=1920x1080:r=60:d=2.1" \
  -an -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart -video_track_timescale 60000 -y "$TITLE_BLACK"
printf "file '%s'\nfile '%s'\n" "$TITLE_BLACK" "$PHOTOS_RENDER" > "$WORK/title_list.txt"
ffmpeg -hide_banner -loglevel error -f concat -safe 0 -i "$WORK/title_list.txt" -c copy -movflags +faststart -video_track_timescale 60000 -y "$TITLE_PHOTOS"
printf "file '%s'\nfile '%s'\n" "$INTRO" "$TITLE_PHOTOS" > "$WORK/list.txt"
ffmpeg -hide_banner -loglevel error -f concat -safe 0 -i "$WORK/list.txt" -c copy -movflags +faststart -video_track_timescale 60000 -y "$BASE"
ffmpeg -hide_banner -loglevel error -i "$BASE" -vf fps=60 -r 60 -an -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart -video_track_timescale 60000 -y "$OUTPUT"
ffprobe -v error -show_entries format=duration:stream=width,height,avg_frame_rate,nb_frames -of json "$OUTPUT"
