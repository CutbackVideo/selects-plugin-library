export type Enums = ReadonlyMap<string, ReadonlySet<string>>;
const S = (...xs: string[]): ReadonlySet<string> => new Set(xs);
const E = (o: Record<string, ReadonlySet<string>>): Enums => new Map(Object.entries(o));
const merge = (base: Enums, over: Enums): Enums => new Map([...base, ...over]);

const SIZES = ["small", "normal", "large", "xlarge"];
export const ENUMS = E({
  face: S("serif-italic", "sans-heavy"), colour: S("ink", "accent", "accent-soft", "accent-deep", "money", "flood", "flood-alt"),
  tone: S("natural", "faded", "greyscale", "drawn", "duotone"), rim: S("cut-paper", "offset-edge", "none"),
  hue: S("accent", "accent-deep", "money", "flood", "flood-alt", "blue", "teal"), print: S("fine", "coarse"),
  block: S("stack", "flank-hero", "hero-stack", "cards", "captions"), mode: S("replace", "build"),
  textCadence: S("film", "ones"),
  align: S("left", "center", "center-lines", "right", "staircase", "justify", "picture-left", "picture-right"),
  keyAlign: S("block", "center", "right-to-lead"),
  band: S("centre", "upper", "lower", "chest"), ground: S("paper", "flood", "flood-alt", "white"), stagger: S("level", "half", "low"),
  textOnFlip: S("invert", "keep"),
  move: S("none", "pull-out", "push-in", "pan-left", "pan-right"),
  phase: S("exit-accelerate", "enter-settle", "exit-after-speech"), amount: S("small", "large"),
  scope: S("word", "line", "item", "line-join"), at: S("before", "start", "mid", "end", "after"), with: S("key-entrance"),
  nudge: S("earlier", "later"),
  size: S(...SIZES, ...SIZES.flatMap((s) => [`${s}-`, `${s}+`])),
  weight: S("light", "regular", "bold", "black"), wordSpace: S("tight", "normal", "loose"),
  spacing: S("tight", "normal", "airy"), anchor: S("block", "first-line"),
  shape: S("none", "disc", "disc-flood", "disc-accent"),
  ending: S("hold", "clear", "cut-to-black"), pivot: S("hero", "frame"),
});
const COPY_ENUMS = E({ role: S("lead", "key", "tail", "number", "caption"), stagger: S("speech", "even", "tight") });
const PAGE_ENUMS = E({ layout: S("stacked", "split"), gap: S("tight", "normal", "airy"), slot: S("top", "upper", "centre", "lower"), handoff: S("cut", "overlap") });
const PICTURE_SIZES = S("small", "normal", "large", "band", "bleed");
const ASSET_ENUMS = E({
  role: S("hero", "decor", "reach-in-left", "reach-in-right"), carry: S("glide", "in-place"),
  size: PICTURE_SIZES, cut: S("radial", "columns", "rows", "grid"), onset: S("with-picture", "next"),
  layout: S("scatter"), count: S("few", "many"), aspect: S("square", "wide", "tall"),
});
const SHOT_ENUMS = E({
  source: S("podcast", "stock-video", "person"), treatment: S("none", "bw", "bw-halftone", "halftone", "warm-film"),
  layout: S("full", "inset"), move: S("none", "slow-push"), speed: S("normal", "fast", "very-fast", "slow"),
  grade: S("film", "none"), framing: S("wide", "medium", "close"),
});
export const COPY_ALL = merge(ENUMS, COPY_ENUMS);
export const PAGE_ALL = merge(ENUMS, PAGE_ENUMS);
export const ASSET_ALL = merge(ENUMS, ASSET_ENUMS);
export const SHOT_ALL = merge(ENUMS, SHOT_ENUMS);
export const NO_ENUMS: Enums = new Map();

export const COPY = S("id", "role", "lines", "face", "weight", "size", "colour", "scope", "timing", "stagger", "enter", "emphasis",
  "wordSpace", "count", "exit");
export const ASSET = S("id", "role", "prompt", "aspect", "tone", "hue", "rim", "anchorWord", "at", "size", "layout", "count", "enter",
  "carry", "exit", "motion", "sequence", "cut", "pieces");
export const PAGE = S("block", "items", "groups", "hero", "left", "right", "under", "align", "keyAlign", "band", "ground", "start",
  "spacing", "anchor", "gap", "layout", "handoff", "shape", "cardGrounds", "stagger", "mode");
export const BEAT = S("onWord", "ground", "textOnFlip", "at", "with");
export const CAMERA = S("move", "phase", "fromWord", "at", "amount", "pivot");
export const SHOT = S("source", "query", "name", "context", "from", "treatment", "layout", "move", "speed", "grade", "framing", "mustShow");
export const TIMING = S("onWord", "at", "nudge");
export const SEARCH_FILLER = S("a", "an", "the", "of", "on", "in", "at", "to", "and", "with", "its", "his", "her", "their", "some", "one");
const PAGE_COMMON = ["block", "start", "ground", "band", "handoff", "shape"];
const PARTS_FIELDS = ["items", "groups", "align", "keyAlign", "spacing", "anchor", "gap", "layout"];
export const BLOCK_FIELDS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ["stack", S(...PAGE_COMMON, ...PARTS_FIELDS)], ["hero-stack", S(...PAGE_COMMON, ...PARTS_FIELDS)],
  ["flank-hero", S(...PAGE_COMMON, "items", "hero", "left", "right", "under", "stagger", "align")],
  ["cards", S(...PAGE_COMMON, "items", "cardGrounds")],
  ["captions", S(...PAGE_COMMON, "items", "align", "spacing", "mode", "gap")],
]);
export const BLOCK_ALIGNS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ["flank-hero", S("left", "center", "center-lines")], ["captions", S("left", "center", "right")],
]);
export const BLOCK_HINTS: ReadonlyMap<string, string> = new Map([
  ["captions", "captions take band, align left/center/right, spacing, mode, and gap between two or more pictures; for a key hung" +
    " on caption lines (keyAlign) or a laid-out lockup use a split hero-stack, where caption items keep their look"],
  ["flank-hero", "its words hug the picture: align center or center-lines centres each column, left sets the rows under it" +
    " at the margin; for other layouts use a hero-stack"],
  ["cards", "each card is its item's first line centred on the band; for lines laid out together use a stack"],
]);
export const MOTION = S("type", "dir", "distance", "amount", "from", "to", "ease", "preRoll");
export const MOTION_ENUMS = E({
  type: S("glide", "truck", "exit", "push", "pull"), ease: S("linear", "in2", "out2", "in-out"),
  dir: S("left", "right", "up", "down", "up-left", "up-right", "down-left", "down-right", "outward"),
  distance: S("short", "medium", "long", "across", "off-frame"), amount: S("small", "large"),
  preRoll: S("none", "short", "half"),
});
export const PIECE = S("onset", "rim", "motion", "exit");
export const GROUP = S("items", "align", "keyAlign", "spacing", "slot");
export const ENTER = E({
  dir: S("up", "down", "left", "right", "none"), distance: S("none", "short", "medium", "long"),
  fade: S("cut", "quick", "medium", "slow", "slower"), move: S("quick", "medium", "slow"),
  blur: S("none", "soft", "medium", "heavy"), curve: S("expo", "ease-out", "linear", "smooth"),
});
export const ASSET_ENTER = S("fade", "blur", "curve");
export const EMPHASIS = S("face", "weight", "colour");
export const COUNT = S("from", "direction", "start", "land", "decimals");
export const COUNT_ENUMS = E({ direction: S("up", "down"), decimals: S("none", "one", "two"), at: ENUMS.get("at")! });
export const FIGURE = /^[^0-9]*([0-9][0-9,]*(?:\.[0-9]+)?)[^0-9]*$/u;
export const ENTRANCES = S("present", "pop", "fade", "blur-rise", "blur-rise-short", "rise", "slide-up", "blur-in", "typewriter", "flicker-on",
  "rack-focus", "reach-in", "count-up");
export const TOP = S("schema", "sceneId", "film", "durationFrames", "words", "context", "craftIntent", "copy", "assets", "pages", "beats",
  "entrances", "camera", "idle", "ending", "shots", "print", "textCadence");
