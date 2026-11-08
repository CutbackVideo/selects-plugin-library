'use strict';

const MICROSECONDS_PER_SECOND = 1_000_000;
const SPEAKER_WINDOW_MICROSECONDS = 3 * MICROSECONDS_PER_SECOND;
const MAX_SPEAKER_MICROSECONDS = 60 * MICROSECONDS_PER_SECOND;

// The decoder represents elapsed time in whole microseconds.
function speakerDurationMicroseconds({startSeconds, endSeconds}) {
  return Math.round((endSeconds - startSeconds) * MICROSECONDS_PER_SECOND);
}

function isSpeakerDurationSupported(range) {
  if (!range) return false;
  const duration = speakerDurationMicroseconds(range);
  return duration >= 1 && duration <= MAX_SPEAKER_MICROSECONDS;
}

module.exports = {
  MICROSECONDS_PER_SECOND,
  SPEAKER_WINDOW_MICROSECONDS,
  speakerDurationMicroseconds,
  isSpeakerDurationSupported,
};
