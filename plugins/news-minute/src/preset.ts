// Presets: brand text and colours handed to the templates. Hangul is written as \uXXXX (public-source check).

export type Preset = {
  id: string;
  label: string;
  background: string; // frame and plate colour
  accentColor: string; // logo gold
  logoMain: string;
  logoAccent: string;
  tagline: string;
  disclaimer: string;
  scriptLanguage: string; // prompt output language
  ttsLanguage: string; // narration language code
};

export const PRESETS: Record<string, Preset> = {
  chosun: {
    id: "chosun",
    label: "Chosun Ilbo · 오늘의 1분",
    background: "#21302A",
    accentColor: "#D8B66A",
    logoMain: "오늘의", // "today's"
    logoAccent: "1분", // "1 minute"
    tagline: "1분으로 이해하는 이슈", // "the issue in one minute"
    disclaimer: "※위 사진은 해당 보도와 관련 없습니다", // "this image is unrelated to the report"
    scriptLanguage: "Korean",
    ttsLanguage: "ko",
  },
  generic: {
    id: "generic",
    label: "Generic news",
    background: "#1E2430",
    accentColor: "#F2C14E",
    logoMain: "NEWS",
    logoAccent: "1 MIN",
    tagline: "",
    disclaimer: "Illustration, not a photo of the event",
    scriptLanguage: "Korean",
    ttsLanguage: "ko",
  },
};

// Default voice: Sarah (premade). Its alignment came back on Staging; Matilda's did not (2026-10-23).
export const DEFAULT_VOICE = "EXAVITQu4vr4xnSDxMaL";
