export const EDIT_POLICY = {
  silenceMinSeconds: 0.25,
  silencePadSeconds: 0.1,
  audioCutNoiseOffsetDb: -18,
  audioCutMinSeconds: 0.25,
  audioCutPadSeconds: 0.1,
  audioCutMaxShare: 0.02,
  audioCutMaxPasses: 2,
  pauseGateNoiseOffsetDb: -25,
  pauseGateSeconds: 0.3,
  wordGapGateSeconds: 0.3,
  speakerGapCapSeconds: 0.2,
  rateTargetFactor: 0.97,
  maxDropShare: 0.3,
  maxClauseWords: 25,
  fillerTrimFrames: 0,
};

export type EditPolicy = typeof EDIT_POLICY;

export const EDIT_STAGE_VERSION = "edit/1";

export const KEEP_ROLE = "edit.keep";
