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
  | "quote_card";

const FONT: EditableParameterDefinition = { key: "fontFamily", label: "Font", type: "text", defaultValue: "" };
const ACCENT: EditableParameterDefinition = { key: "accentColor", label: "Accent", type: "color", defaultValue: "#E8502F" };
const TITLE: EditableParameterDefinition = { key: "title", label: "Title", type: "text", defaultValue: "" };
const SOURCE: EditableParameterDefinition = { key: "source", label: "Source", type: "text", defaultValue: "" };

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
    { key: "zoom", label: "Zoom", type: "number", defaultValue: 0.09, min: 0, max: 0.3, step: 0.01 },
    { key: "credit", label: "Credit", type: "text", defaultValue: "" },
  ],
  text_card: [
    FONT,
    { key: "text", label: "Text", type: "text", defaultValue: "" },
    { key: "sub", label: "Sub line", type: "text", defaultValue: "" },
    { key: "source", label: "Source", type: "text", defaultValue: "" },
    { key: "fontSize", label: "Size", type: "number", defaultValue: 84, min: 40, max: 120, step: 1 },
  ],
  number_callout: [
    FONT,
    { key: "label", label: "Label", type: "text", defaultValue: "" },
    { key: "unit", label: "Unit", type: "text", defaultValue: "" },
    { key: "dim", label: "Photo dim", type: "number", defaultValue: 0.45, min: 0, max: 0.9, step: 0.05 },
    { key: "background", label: "Background (no photo)", type: "color", defaultValue: "#2B3D34" },
    { key: "revealSec", label: "New value delay (s)", type: "number", defaultValue: 0.75, min: 0, max: 5, step: 0.05 },
    { key: "boxColor", label: "Box", type: "color", defaultValue: "#FFD700" },
  ],
  bar_compare_h: [FONT, TITLE, SOURCE, { key: "unit", label: "Unit", type: "text", defaultValue: "" }, ACCENT],
  line_trend_callout: [
    FONT,
    TITLE,
    { key: "subtitle", label: "Subtitle", type: "text", defaultValue: "" },
    SOURCE,
    { key: "unit", label: "Unit", type: "text", defaultValue: "" },
    ACCENT,
  ],
  stat_cards: [
    FONT,
    TITLE,
    { key: "subtitle", label: "Subtitle", type: "text", defaultValue: "" },
    SOURCE,
    ACCENT,
    { key: "headerColor", label: "Card header", type: "color", defaultValue: "#D9705A" },
  ],
  quote_card: [
    FONT,
    { key: "name", label: "Name", type: "text", defaultValue: "" },
    { key: "affiliation", label: "Affiliation", type: "text", defaultValue: "" },
    ACCENT,
  ],
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
};
