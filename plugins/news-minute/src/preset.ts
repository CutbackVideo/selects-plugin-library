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
    label: "Chosun Ilbo \u00B7 \uC624\uB298\uC758 1\uBD84",
    background: "#21302A",
    accentColor: "#D8B66A",
    logoMain: "\uC624\uB298\uC758", // "today's"
    logoAccent: "1\uBD84", // "1 minute"
    tagline: "1\uBD84\uC73C\uB85C \uC774\uD574\uD558\uB294 \uC774\uC288", // "the issue in one minute"
    disclaimer: "\u203B\uC704 \uC0AC\uC9C4\uC740 \uD574\uB2F9 \uBCF4\uB3C4\uC640 \uAD00\uB828 \uC5C6\uC2B5\uB2C8\uB2E4", // "this image is unrelated to the report"
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
