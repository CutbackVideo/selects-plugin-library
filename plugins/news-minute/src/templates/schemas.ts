// Inspector controls, labels and placement flags for each template in this folder. build.mjs pairs
// each `<type>.tsx` source (as `tsxCode`) with PARAM_SCHEMAS[type] (as `editableParameters`).
// Only scalar controls belong here; array params (bars, points, cards, lines) and image data URLs
// are passed in `parameters` and never listed as controls. Brand text (logo, tagline, disclaimer
// sentence) is supplied by the preset, so its defaults stay empty.

export type EditableParameterDefinition =
  | { key: string; label: string; type: "text"; defaultValue: string }
  | { key: string; label: string; type: "number"; defaultValue: number; min: number; max: number; step: number }
  | { key: string; label: string; type: "color"; defaultValue: string }
  | { key: string; label: string; type: "boolean"; defaultValue: boolean }
  | { key: string; label: string; type: "select"; defaultValue: string; options: Array<{ label: string; value: string }> };

export type TemplateType =
  | "frame"
  | "headline"
  | "caption"
  | "disclaimer"
  | "news_photo"
  | "text_card"
  | "number_callout"
  | "bar_compare_h"
  | "line_trend_callout"
  | "stat_cards"
  | "quote_card"
  | "highlight_card"
  | "donut_ratio"
  | "verdict_card"
  | "flow_cause_effect";

const FONT: EditableParameterDefinition = { key: "fontFamily", label: "Font", type: "text", defaultValue: "" };
const ACCENT: EditableParameterDefinition = { key: "accentColor", label: "Accent", type: "color", defaultValue: "#A9222B" };
const TITLE: EditableParameterDefinition = { key: "title", label: "Title", type: "text", defaultValue: "" };
const SOURCE: EditableParameterDefinition = { key: "source", label: "Source", type: "text", defaultValue: "" };
const SUBTITLE: EditableParameterDefinition = { key: "subtitle", label: "Subtitle", type: "text", defaultValue: "" };
// Heritage scenes paint ivory paper; "transparent" leaves the window clear for a damask plate below.
const PAPER: EditableParameterDefinition = { key: "background", label: "Paper", type: "color", defaultValue: "#F6F1E4" };

export const PARAM_SCHEMAS: Record<TemplateType, EditableParameterDefinition[]> = {
  frame: [
    FONT,
    { key: "background", label: "Background", type: "color", defaultValue: "#21302A" },
    { key: "accentColor", label: "Logo accent", type: "color", defaultValue: "#D8B66A" },
    { key: "logoMain", label: "Logo text", type: "text", defaultValue: "" },
    { key: "logoAccent", label: "Logo accent text", type: "text", defaultValue: "" },
    { key: "tagline", label: "Tagline", type: "text", defaultValue: "" },
  ],
  headline: [
    FONT,
    { key: "line1", label: "Line 1", type: "text", defaultValue: "" },
    { key: "line2", label: "Line 2", type: "text", defaultValue: "" },
    { key: "accent", label: "Line 1 accent words", type: "text", defaultValue: "" },
    { key: "fontSize", label: "Size", type: "number", defaultValue: 96, min: 40, max: 130, step: 1 },
    { key: "boxColor", label: "Box", type: "color", defaultValue: "#FFD700" },
    { key: "line1Color", label: "Line 1 colour", type: "color", defaultValue: "#FFFFFF" },
    { key: "line2Color", label: "Line 2 colour", type: "color", defaultValue: "#000000" },
  ],
  caption: [
    FONT,
    { key: "text", label: "Text", type: "text", defaultValue: "" },
    { key: "fontSize", label: "Size", type: "number", defaultValue: 54, min: 30, max: 80, step: 1 },
    { key: "textColor", label: "Text colour", type: "color", defaultValue: "#FFFFFF" },
  ],
  disclaimer: [
    FONT,
    { key: "text", label: "Text", type: "text", defaultValue: "" },
    { key: "fontSize", label: "Size", type: "number", defaultValue: 35, min: 20, max: 60, step: 1 },
  ],
  news_photo: [
    FONT,
    {
      key: "motion", label: "Motion", type: "select", defaultValue: "push_in",
      options: [
        { label: "Push in", value: "push_in" },
        { label: "Pull out", value: "pull_out" },
        { label: "Pan left", value: "pan_left" },
        { label: "Pan right", value: "pan_right" },
        { label: "Tilt up", value: "pan_up" },
        { label: "Tilt down", value: "pan_down" },
      ],
    },
    {
      key: "focus", label: "Focus", type: "select", defaultValue: "center",
      options: [
        { label: "Centre", value: "center" },
        { label: "Top", value: "top" },
        { label: "Bottom", value: "bottom" },
        { label: "Left", value: "left" },
        { label: "Right", value: "right" },
      ],
    },
    {
      key: "fit", label: "Fit", type: "select", defaultValue: "cover",
      options: [
        { label: "Fill (crop)", value: "cover" },
        { label: "Whole image", value: "contain" },
      ],
    },
    { key: "zoom", label: "Zoom", type: "number", defaultValue: 0.06, min: 0, max: 0.3, step: 0.01 },
    { key: "credit", label: "Credit", type: "text", defaultValue: "" },
    PAPER,
  ],
  text_card: [
    FONT,
    TITLE,
    { key: "text", label: "Text ([word] crimson, {phrase} highlighter)", type: "text", defaultValue: "" },
    { key: "sub", label: "Sub line", type: "text", defaultValue: "" },
    SOURCE,
    { key: "fontSize", label: "Size", type: "number", defaultValue: 72, min: 40, max: 120, step: 1 },
    PAPER,
  ],
  highlight_card: [
    FONT,
    TITLE,
    SUBTITLE,
    { key: "value", label: "Value", type: "text", defaultValue: "" },
    { key: "unit", label: "Unit", type: "text", defaultValue: "" },
    SOURCE,
    PAPER,
  ],
  number_callout: [
    FONT,
    TITLE,
    SUBTITLE,
    { key: "label", label: "Label", type: "text", defaultValue: "" },
    { key: "unit", label: "Unit", type: "text", defaultValue: "" },
    SOURCE,
    { key: "revealSec", label: "New value delay (s)", type: "number", defaultValue: 0.75, min: 0, max: 5, step: 0.05 },
    PAPER,
  ],
  bar_compare_h: [FONT, TITLE, SUBTITLE, SOURCE, { key: "unit", label: "Unit", type: "text", defaultValue: "" }, ACCENT, PAPER],
  line_trend_callout: [
    FONT,
    TITLE,
    { key: "subtitle", label: "Subtitle", type: "text", defaultValue: "" },
    SOURCE,
    { key: "unit", label: "Unit", type: "text", defaultValue: "" },
    PAPER,
  ],
  stat_cards: [
    FONT,
    TITLE,
    { key: "subtitle", label: "Subtitle", type: "text", defaultValue: "" },
    SOURCE,
    ACCENT,
    { key: "headerColor", label: "Card header", type: "color", defaultValue: "#23342E" },
    PAPER,
  ],
  quote_card: [
    FONT,
    { key: "name", label: "Name", type: "text", defaultValue: "" },
    { key: "affiliation", label: "Affiliation", type: "text", defaultValue: "" },
    PAPER,
  ],
  donut_ratio: [FONT, TITLE, SUBTITLE, SOURCE, ACCENT, PAPER, { key: "unit", label: "Unit", type: "text", defaultValue: "" }],
  verdict_card: [FONT, TITLE, SUBTITLE, ACCENT, PAPER],
  flow_cause_effect: [FONT, TITLE, SUBTITLE, ACCENT, PAPER],
};

// Static graphics whose output does not depend on time: pass as addMotionGraphic `timeIndependent`.
export const TIME_INDEPENDENT: Record<TemplateType, boolean> = {
  frame: true,
  headline: true,
  caption: true,
  disclaimer: true,
  news_photo: false,
  text_card: false,
  number_callout: false,
  bar_compare_h: false,
  line_trend_callout: false,
  stat_cards: false,
  quote_card: false,
  highlight_card: false,
  donut_ratio: false,
  verdict_card: false,
  flow_cause_effect: false,
};

// Clip labels shown in the timeline.
export const LABELS: Record<TemplateType, string> = {
  frame: "News frame",
  headline: "Headline",
  caption: "Caption",
  disclaimer: "Disclaimer",
  news_photo: "Photo",
  text_card: "Text card",
  number_callout: "Number callout",
  bar_compare_h: "Bar comparison",
  line_trend_callout: "Trend line",
  stat_cards: "Stat cards",
  quote_card: "Quote",
  highlight_card: "Highlight card",
  donut_ratio: "Share donut",
  verdict_card: "Verdict cards",
  flow_cause_effect: "Cause and effect",
};
