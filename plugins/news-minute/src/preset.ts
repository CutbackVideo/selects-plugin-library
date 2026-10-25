// Presets: brand text and colours handed to the templates. Hangul is written as \uXXXX (public-source check).

// Screen layout in 1080x1920 px. Scenes draw in the graphic window; one caption line sits under it. When the
// preset names band and background images (shipped with the plug-in), the background becomes the Main plate and
// the bands go on the Draft as an image clip over the scenes; otherwise the frame graphic and a colour plate stand in.
export type Layout = {
  windowTop: number;
  windowHeight: number;
  frameWindowBottom: number; // lower edge of the frame graphic's opening (the bands image's transparent rows)
  captionBottom: number;
  captionHeight: number;
  captionMaxWidth: number;
  captionWeight: number;
  captionColor: string;
  captionBox: string;
  captionPad?: number; // caption box padding left and right
  bandsImage?: string; // path in the plug-in folder, 1080x1920 PNG with a transparent middle
  backgroundImage?: string; // path in the plug-in folder, opaque 1080x1920 PNG
};

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
  // Headline faces to use when installed on this computer, tried in order by full or PostScript name (CSS
  // local()). None installed, or none listed: the embedded Pretendard.
  headlineFonts?: string[];
  layout: Layout;
};

const DEFAULT_LAYOUT: Layout = {
  windowTop: 480, windowHeight: 920, frameWindowBottom: 1400,
  captionBottom: 1385, captionHeight: 70, captionMaxWidth: 980, captionWeight: 600, captionColor: "#FFFFFF", captionBox: "rgba(0,0,0,0.44)",
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
    // The customer's note with the style sheet: headline "210 \uC634\uB2C8\uACE0\uB515 050" ("210 OmniGothic 050";
    // the Premiere project's headline layers name TTOmniGothicH).
    headlineFonts: ["210 \uC634\uB2C8\uACE0\uB515 050", "210 OmniGothic 050", "210OmniGothic050", "210OmniGothic-050", "TTOmniGothicH"],
    // The customer's heritage style sheet (2026-10-21): graphics in y 481-1290, damask background, bands with the
    // logo above and below, one caption line about 720 px wide (Pretendard Medium). The caption box and colours come
    // from the broadcast episodes (CHOSUN_TODAY1MIN_FORMAT_SPEC): white text on translucent black (alpha 0.44),
    // box 70 tall at y 1315-1385 hugging the text with 10 px each side, centred.
    layout: {
      windowTop: 481, windowHeight: 809, frameWindowBottom: 1399,
      captionBottom: 1385, captionHeight: 70, captionMaxWidth: 720, captionWeight: 500, captionColor: "#FFFFFF", captionBox: "rgba(0,0,0,0.44)", captionPad: 10,
      bandsImage: "template-packs/chosun/assets/t1m_bands.png", backgroundImage: "template-packs/chosun/assets/t1m_background.png",
    },
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
    layout: DEFAULT_LAYOUT,
  },
};

// Default voice: Sarah (premade). Its alignment came back on Staging; Matilda's did not (2026-10-23).
export const DEFAULT_VOICE = "EXAVITQu4vr4xnSDxMaL";
