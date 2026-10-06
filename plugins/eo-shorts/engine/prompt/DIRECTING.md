# Directing guide (blind planner)

How EO directs a scene, keyed to what a blind planner has: the scene's words and their timing, its type (`graphic`,
`speaker`, `b-roll`), its length, its film (A or B) and its neighbours (`context.previous` / `next`, and any plans already
written for them). Derived only from 23 reference scenes (film A: A01-A04, A10-A17; film B: B01-B07, B10, B12, B14,
B15; 11 graphic, 8 speaker, 4 b-roll). `n/N` counts are over the reference scenes a rule applies to. Fields: `SCHEMA.md`.
Every plan is linted. Plan from this guide, SCHEMA and lint's messages only.

Work in this order: which words show (§1), the device for the scene type (§2 graphic, §3 speaker, §4 b-roll),
entrances and timing (§5), a check against the neighbours (§6). §7 lists the film differences, §8 lint-checked examples.

## 1. Which words show (every scene type)

- **Scene edges.** A clause cut by the scene boundary belongs to the scene that holds most of it.
  - Words in the last ~0.5 s that run on into the next scene's phrase (`if`, `I`, `and`, `but`, `because`, `that`,
    `is not`, a question) get no copy here (14/16 scenes that end so); the next scene shows them.
  - Leading words that end the previous scene's sentence (`.` or `,` in the transcript) are dropped (3/4), unless they
    are the first item this scene shows (a list's first card).
  - A word the previous scene spoke but left uncaptioned may open this scene's first line (`if`, `that`, `is not`;
    4 scenes): `entrances: present` (film A) or `timing: {onWord: <first spoken word>, at: "before"}`.
- **Wording.** Spoken order. Graphic scenes show the set-up and the payoff and drop hedges (`kind of`), repeats, list
  connectives (`and very`) and words a picture or figure already says (a figures scene keeps the figures and the closing
  verdict); never the key or its noun. Captions show every word of the stretch they cover. Editor rewrites that read
  better are fine: `a lot of` → `lots of`, `versus` → `vs.`, a dropped contraction restored (`i'd`), spoken figures as
  numerals (`five hundredth` → `500th`, `one percent` → `1%`, money with `$`). Never add content.
- **Case.** Lowercase (film A 11/12 scenes, `I` capitalised; film B graphics 4/5). Film B captions may be sentence case
  (3/6); keep one convention per scene. Capitals for emphasis only: a negation in caps (`SHOULD*N'T*`, B02), one title-cased key.
- **Punctuation.** None, except: a period on a film A one-word `sans-heavy` key that ends the sentence, and on list
  cards (2/3 scenes with one-word sans keys); a final period on a film B caption that closes the sentence; `...` on a
  lead that trails into its key; `vs.`; commas inside figures. Hyphenated compounds stay whole on a card
  (`capital-light.`) and split across caption groups.

## 2. Graphic scenes

### 2.1 Device from the line's shape (first match wins)

| The line | Device | Reference |
|---|---|---|
| Figures compared (`%`, `$`) | `hero-stack` figure / picture / figure, counters, a page per option, disc | B06 |
| A list of 2-3 short qualities | `cards`, one item per card, middle card on flood | A17 |
| Two poles (`x or y`, `x not y`) | two `stack` pages, one pole each, the first on flood | B15 |
| Advice or a saying others give (`they say you shouldn't...`) | `stack` in `groups`: small sans frame line high, big serif payoff, flood on the payoff | B02 |
| Payoff is an object, a sum of money or an image-able noun (`idea`, `small`) | picture: film A `flank-hero`, film B `hero-stack` | A02 A03 B07 |
| Payoff is money or a mass noun in general | `hero-stack`, scattered decor, `staircase` | B14 |
| Set-up + adjective, verb or abstract payoff | type-only `stack`, flood on the key | A04 A14 |
| Set-up + payoff + a trailing qualifier | `stack`; the qualifier on a second page (film A) or a `tail` (film B) | A15 B14 |

Pictures appear in 5/11 graphic scenes (film A 2/6, film B 3/5) and never with a list, contrast, saying or verdict line
(0/6). Pages: one per clause, pole or option (8/11 scenes are a single page, up to 2.5 s long); each page at least
~0.5 s; three pages only in a long (8 s) figures scene.

### 2.2 Lead, key, tail

- **Key**: the clause's payoff, normally its last stressed content word or phrase (`small`, `unique`, `succeed.`). Keep
  an article or adjective that belongs to it (`the company`, `start a company`, `to make money`). Every list item and
  pole is a key; a clause in two halves gets a key per half, each ending its half (B07). Figures are `role: number`.
- **Leads**: the set-up, 2-4 words and at most ~16 characters per line, broken at phrase seams (`that makes it` /
  `more likely to`); in `flank-hero` one or two words per line.
- **Tail**: one short word after the key that turns it (`later`): `role: tail`. A longer qualifier phrase is a lead on
  its own page.
- **Face**: film A key `face: sans-heavy`, `weight: black` (or `bold`) when type-only (4/4); the film's default
  `serif-italic` beside a picture (2/2). Film B key `serif-italic` always (4/4; its default). Leads keep the film's sans;
  a quiet aside is `weight: light`.
- **Colour**: key `accent` (default). Money phrases `money` (3/3 film B). Key `ink` when a flood lands inside it (the flip
  reverses it). Film A's opening hook may set a paper key `flood-alt`. A contrast's small connective `flood-alt`. A caps
  negation starred, `emphasis: {weight: "bold", colour: "flood"}`.
- **Size**: leave defaults. `normal+` on every item of a sparse page of 2-4 type-only items (A04, B15); a quiet aside lead
  `small-`; two lead/key pairs sharing a picture: leads `small`, keys `small-` (B07).

### 2.3 Blocks

- `flank-hero` (film A pictures, 2/2): `hero` the picture, `left` then `right` the lead words in speech order, `under`
  the key; `stagger: low` when the right column runs on into the key.
- `stack` (type-only). Film A: a one-line lead with a short key `align: left`, `keyAlign: right-to-lead`,
  `anchor: first-line` (A14); a long one-line lead over a two-word key `align: justify`, `anchor: first-line` (A15); a
  two-line lead `align: center`, `anchor: block` (A04). Film B starts high (2/2): `groups` with the frame line on
  `slot: upper`, `align: left`, payoff under it, page `anchor: first-line` (B02), or `band: upper`, `align: left`,
  `keyAlign: right-to-lead` (B15); a closing page is centred, `spacing: tight`.
- `hero-stack` (film B pictures, 3/3): figures `items: [figure, picture, figure]`, `ground: white`, `shape: disc`,
  `gap: airy` (B06); two lead/key pairs around one picture as `groups`, `align: picture-right` above, the picture,
  `align: picture-left` with `slot: lower` below, page `gap: tight` (B07); `align: staircase`, `spacing: airy` with
  scattered decor (B14).
- `cards`: one line per card; three cards `cardGrounds: ["paper", "flood", "paper"]`.

### 2.4 Grounds

- Flood in 5/6 type-only graphic scenes, 0/5 picture scenes; the one type-only scene without it followed a flood scene.
- The flip lands on the key: `beats: [{onWord: <key>, with: "key-entrance", ground: <flood>}]` (A04), at the key's
  start (A14), or mid-way through the word before a one-word last key line (B02). Text inverts (`textOnFlip: invert`);
  a page never flips back.
- Which flood: film A `flood-alt` in its opening hook, `flood` later; film B `flood`. A two-pole scene puts its first
  page on `ground: flood` and its second on paper. Picture pages stay paper; figure pages with a disc are `white`.

### 2.5 Pictures (generated)

- **Subject**: one everyday physical object standing for the payoff, alone: `idea` → a glass filament bulb, `small` →
  a hand holding a phone upright, a huge sum → a heap of banknote bundles and a smaller sum → a small pile, `value` →
  one flat banknote, money in general → single bills scattered. Every reference picture is one such object (5/5); hands are
  welcome (2/5 scenes); no faces (0/5) and no text (the generator draws none).
- **Count**: one `hero` per page (4/5 scenes). A mass noun: one `decor` picture, `layout: scatter`, `count: many`. A
  take/choose verb: `reach-in-left` + `reach-in-right` hands toward the hero, landing on its words (B06).
- **Prompt**: `isolated photograph of <object>, <pose or view>, <two or three telling details>` ("standing upright",
  "lying perfectly flat, seen straight on from above", a hand "reaching in from the right, back of the hand up, forearm
  running off to the right"). No tints, style words, borders or backgrounds in the prompt.
- **aspect**: `tall` for upright things (a bulb, a hand holding a phone); `wide` for flat notes, heaps and forearms;
  else `square`.
- **tone / rim**: film A `greyscale`, or `faded` when the object's own warm light is the point; `rim: cut-paper` (2/2).
  Film B `greyscale` for notes and hands, `natural` for a heap whose colour reads as money; `rim: none` (6/6).
- **size**: default; `large` for one flat note the text hugs; `small` for the lesser of two compared piles.
- **Entrance**: on screen from the first frame (4/5) or landing with the key (1/5, `anchorWord: <key>, at: "before"`).
  Film A: `present` (or `blur-in`); `flicker-on` only for a thing that switches on. Film B: `rack-focus` (3/3) with
  `enter: {fade: "quick"}`, or `{fade: "slow", curve: "ease-out"}` for a big hero.
- `idle: float` only for a picture on a disc. A picture kept for the next page is listed on both, `carry: in-place`.
- **Not in the references** (0/5 picture scenes): picture `motion`, carousels (`sequence`), `cut` + `pieces`, `band`/`bleed`
  sizes, `drawn` or `duotone` tones. The references give no rule for when to use them; SCHEMA §5 and §10 say what each does.

### 2.6 Figures and counters

- Spoken figures are numerals with `$`/`%`; a figure is `role: number` (heavy sans), a film B money figure may be a
  `caption` item for the upright serif. Percentages count: `entrances: count-up` from zero, or `count: {from: <the
  previous figure>}` when one option's figure grows into the next (B06). A long money figure types out
  (`typewriter`). The payoff sum is `money`.
- Figures scene: one `hero-stack` page per option, `shape: disc` for the long shot and `disc-accent` for the sure one;
  the verdict builds on a final page that keeps the disc picture.

### 2.7 Camera, print, ending

- Camera only in film A's opening hook (the graphic scenes of the film's first sentence after the cold open; 3/3, 0/20
  elsewhere): exit on the key (`pull-out` or `pan-right`, `phase: exit-accelerate`, `fromWord: <key>`,
  `amount: large`); the next scene opens with the same move at `phase: enter-settle` (2/2 hand-offs). Those scenes also
  take `print: coarse` (3/3).
- `ending`: `hold` (21/23); `clear` after an exit pan; `cut-to-black` when the scene closes a thought and `next` starts a
  new one (B15).

## 3. Speaker scenes

- **Shots**: `podcast`, `layout: full`, `treatment: none` (7/8). The edit's own footage plays as it was shot, its
  angle changes included; a blind plan cannot see where they fall, and a second podcast shot changes nothing but its
  treatment. So write a second podcast shot only for a treatment change: film A, next scene graphic, a last podcast
  shot with `treatment: halftone` from the uncaptioned trailing word or the last word's middle (2/3). Keep
  `layout: full` (A12's `inset` framed footage from another camera, which only the video shows).
- **Page**: `block: captions`, `mode: replace`. Film A: `band: centre`, `align: center`, default face and size (5/5).
  Film B: `size: large` on every ordinary group. Its band follows the shot's framing, which a blind plan cannot see:
  Reference groups sit `lower` (B10, and B04's carried line) or `centre` (B04); use `lower`, which clears the face in a
  close-up and in a medium shot. The film's opening line is a `build` lockup on `chest`, `align: left`: a small upright
  lead-in group (`size: normal`) over a `serif-italic` line (B01).
- **Groups**: 1-3 words, at most ~14 characters, cut at phrase seams; mean 1.6 words, one group per 0.3-0.5 s. A short
  function word joins the next word (`a good`, `in the`, `to be`); a trailing article joins the word before (`it's a`);
  a content word of 7+ letters stands alone; groups narrow towards the key (`I think a` / `a good` / `business` /
  `means`). Words left for the next scene get no group.
- **Timing**: none needed; the first group shows from the first frame. A group may come a beat early
  (`timing: {nudge: "earlier"}`, or `onWord` with `at: "before"`), as reference captions often do.

## 4. B-roll scenes

- **Shots**: one `stock-video` shot per image-able key noun (A10 2 shots for 1 noun, B03 1/1, B05 2/2), the first from
  `scene-start`, later ones cut on their noun's first word (`at: "start"`) or on the connective before it (`versus`).
- **query**: the literal object or place standing for the noun, 3-5 words of what the camera sees (`pile of hundred
  dollar bills`, `coin spinning on wooden table`, `hanging restaurant sign old town`). `mustShow` names that object and
  the query does too. `framing: close` for an object or a screen (3/3), `medium` for signs and people (6/7). `speed:
  fast` only for data that should churn (a price chart); else normal.
- **treatment**: film A `halftone` (2/2, film grade); a b-roll that hands back to the speaker may end on the same footage
  with `treatment: none` from its last word. Film B `bw` for objects (2/2), `none` for a colour screen.
- **People**: a line about a kind of person whose famous examples the topic implies (founders): `person` shots, one per
  caption word, of well-known people tied to the topic, `name` plus `context` (role, company, era); `bw-halftone` for
  older photos, `halftone` for later ones; `framing: medium`; the last one `move: slow-push` (B12).
- **Captions**: film A as its speaker captions, mostly one word per group (A10). Film B `serif-italic`, `size: large`
  (3/3): single words replacing; a key noun alone, then `vs.` (upright, `size: xlarge`) over the next noun in a `stack`
  group on `slot: centre`; a short phrase as a lockup of `caption` items on a `stack` page, first line `slot: upper`
  centred, the rest `slot: lower`, `align: staircase`.
- **Payoff over footage** (film B): a `stack` page from the clause's first word with `ground: flood` so its lead and key
  read white over the shot, `groups` on `slot: lower`, `align: right`, a light lead and the serif key (B12).

## 5. Entrances and timing

Keep each role's film default (film A: leads `pop`, keys `blur-rise`; film B: leads `fade`, keys `rise`; captions `pop`)
and change only:

- Film A: a key that lands with a flood, or an item on a later page, `blur-rise-short` (or `blur-rise` with
  `enter: {move: "quick", fade: "quick"}`). A quiet one-line lead read out as it is spoken: `typewriter`,
  `scope: line`, `face: sans-heavy`, `weight: light`, `size: small-`, ending in `...` (A14).
- Film B: words fade in place: `rise` with `enter: {dir: "none"}`, or `fade`; a lead may rise (`rise`). A key the flood
  lands with, or one shown early with its lead, `pop`; a second pole `slide-up`; a tail `pop`.
- Words land on their spoken word (`scope: word`). A key may take `timing: {nudge: "earlier"}` (5/10 scenes) so it has
  settled as it is said; a fast-spoken lead `stagger: tight`. Never per-letter staggers, overshoot, scale pops or drift.
- Later pages cut on the first word of their clause, pole or option (`start: {word: ...}`); a contrast's connective
  waits for its pole's page (the `or` page starts on the second pole).

## 6. Scene to scene

- Never flood two scenes in a row (0 pairs in the references). After a flood scene a type-only scene stays on paper.
- A block repeats at most twice running (3 pairs), the second changing picture tone, ground or entrance.
- Picture scenes come in runs of at most two; the run ends on a type-only flood scene (2/2).
- A motif may carry while the talk stays on it (film B money: stock bills → heap → one note → scattered notes), in a new
  form each time.
- Film A hands over between types: speaker → graphic with a halftone tail on the speaker (2/3); the opening hook's
  graphic scenes pass one camera move along. Film B alternates speaker and b-roll around its graphics, upright captions
  on the speaker and italic on b-roll.

## 7. Film A vs film B

| | Film A | Film B |
|---|---|---|
| Type-only key | `sans-heavy` black/bold, period on one word | `serif-italic` |
| Key beside a picture | `serif-italic` | `serif-italic` |
| Entrances | leads `pop`, keys `blur-rise` | fade in place; `pop` with a flood; `slide-up` second pole |
| Text placement | `band: centre` | type-only scenes start high (`slot`/`band: upper`) |
| Picture block | `flank-hero` | `hero-stack` (groups, discs, decor) |
| Picture tone, rim | `greyscale`/`faded`, `cut-paper` | `greyscale`/`natural`, `none` |
| Flood | `flood-alt` in the opening hook, then `flood` | `flood` |
| Camera, print | opening hook only: hand-off moves, `print: coarse` | none |
| Speaker captions | film sans, lowercase, `band: centre` | upright serif `size: large`; `band: lower` (§3); sentence case allowed |
| B-roll | `halftone`, captions as speaker | `bw` objects, `none` screens, people `halftone`; `serif-italic` captions |
| Endings | `hold`; `clear` after an exit pan | `hold`; `cut-to-black` closing a thought |

## 8. Examples (neutral wording; each passes the lint with its words)

1. Film A, graphic, set-up + verdict ("it makes the whole job faster. So"):
```json
{"copy": [{"id": "lead", "role": "lead", "lines": ["it makes the", "whole job"], "size": "normal+"},
          {"id": "key", "role": "key", "lines": ["faster."], "face": "sans-heavy", "weight": "black", "size": "normal+", "timing": {"nudge": "earlier"}}],
 "pages": [{"block": "stack", "items": ["lead", "key"], "align": "center", "anchor": "block", "start": "scene-start"}],
 "beats": [{"onWord": "faster", "with": "key-entrance", "ground": "flood", "textOnFlip": "invert"}],
 "entrances": {"key": "blur-rise-short"}}
```
2. Film A, graphic, image-able payoff ("it all starts with one seed. And"):
```json
{"copy": [{"id": "l1", "role": "lead", "lines": ["it all", "starts"]}, {"id": "l2", "role": "lead", "lines": ["with", "one"]},
          {"id": "key", "role": "key", "lines": ["seed"]}],
 "assets": [{"id": "seed", "role": "hero", "tone": "greyscale", "rim": "cut-paper",
             "prompt": "isolated photograph of a hand holding one sunflower seed between thumb and forefinger, seen from the side, the striped seed and fingertips sharp"}],
 "pages": [{"block": "flank-hero", "hero": "seed", "left": ["l1"], "right": ["l2"], "under": ["key"], "stagger": "low", "start": "scene-start"}],
 "entrances": {"seed": "present"}}
```
3. Film B, graphic, two poles closing a thought ("you either rise or fall."):
```json
{"copy": [{"id": "l1", "role": "lead", "lines": ["you either"], "size": "normal+", "enter": {"dir": "none"}},
          {"id": "k1", "role": "key", "lines": ["rise"], "size": "normal+", "enter": {"dir": "none"}},
          {"id": "l2", "role": "lead", "lines": ["or"], "size": "normal+", "colour": "flood-alt", "enter": {"dir": "none"}},
          {"id": "k2", "role": "key", "lines": ["fall"], "size": "normal+", "weight": "bold"}],
 "pages": [{"block": "stack", "items": ["l1", "k1"], "ground": "flood", "band": "upper", "align": "left", "keyAlign": "right-to-lead", "start": "scene-start"},
           {"block": "stack", "items": ["l2", "k2"], "align": "center", "spacing": "tight", "start": {"word": "fall", "at": "start"}}],
 "entrances": {"l1": "rise", "k1": "rise", "l2": "rise", "k2": "slide-up"}, "ending": "cut-to-black"}
```
4. Film B, graphic, a figure ("only 3% of them reach the top."):
```json
{"copy": [{"id": "pct", "role": "number", "lines": ["3%"]}, {"id": "lead", "role": "lead", "lines": ["of them reach"]},
          {"id": "key", "role": "key", "lines": ["the top"]}],
 "assets": [{"id": "ladder", "role": "hero", "aspect": "tall", "tone": "greyscale", "rim": "none", "enter": {"fade": "quick"},
             "prompt": "isolated photograph of a tall wooden stepladder standing upright, seen from the side, its narrow top step at the very top"}],
 "pages": [{"block": "hero-stack", "items": ["pct", "ladder", "lead", "key"], "ground": "white", "shape": "disc", "gap": "airy", "start": "scene-start"}],
 "entrances": {"pct": "count-up", "ladder": "rack-focus"}, "idle": {"ladder": "float"}}
```
5. Film B, graphic, a saying ("they say you can't change careers."):
```json
{"copy": [{"id": "frame", "role": "lead", "lines": ["you *CAN'T*"], "emphasis": {"weight": "bold", "colour": "flood"}},
          {"id": "payoff", "role": "key", "lines": ["change", "careers"], "colour": "ink", "stagger": "tight"}],
 "pages": [{"block": "stack", "start": "scene-start", "anchor": "first-line",
            "groups": [{"items": ["frame"], "align": "left", "slot": "upper"}, {"items": ["payoff"], "align": "left"}]}],
 "beats": [{"onWord": "change", "at": "mid", "ground": "flood", "textOnFlip": "invert"}],
 "entrances": {"frame": "rise", "payoff": "pop"}}
```
6. Film A, speaker before a graphic scene ("and most of them never finished the course. But"):
```json
{"copy": [{"id": "c1", "role": "caption", "lines": ["and most"]}, {"id": "c2", "role": "caption", "lines": ["of them"]},
          {"id": "c3", "role": "caption", "lines": ["never"]}, {"id": "c4", "role": "caption", "lines": ["finished"]},
          {"id": "c5", "role": "caption", "lines": ["the course"]}],
 "pages": [{"block": "captions", "items": ["c1", "c2", "c3", "c4", "c5"], "mode": "replace", "band": "centre", "align": "center", "start": "scene-start"}],
 "shots": [{"source": "podcast", "from": "scene-start", "treatment": "none", "layout": "full"},
           {"source": "podcast", "from": {"word": "But", "at": "before"}, "treatment": "halftone", "layout": "full"}]}
```
7. Film A, b-roll ("the third coffee shop on this street is"):
```json
{"copy": [{"id": "c1", "role": "caption", "lines": ["the"]}, {"id": "c2", "role": "caption", "lines": ["3rd"]},
          {"id": "c3", "role": "caption", "lines": ["coffee shop"]}, {"id": "c4", "role": "caption", "lines": ["on this"]},
          {"id": "c5", "role": "caption", "lines": ["street"]}],
 "pages": [{"block": "captions", "items": ["c1", "c2", "c3", "c4", "c5"], "mode": "replace", "band": "centre", "start": "scene-start"}],
 "shots": [{"source": "stock-video", "query": "coffee shop sign on street", "framing": "medium", "mustShow": "coffee shop sign",
            "from": "scene-start", "treatment": "halftone", "layout": "full"},
           {"source": "stock-video", "query": "coffee shop window at night", "framing": "medium", "mustShow": "coffee shop window",
            "from": {"word": "coffee", "at": "start"}, "treatment": "halftone", "layout": "full"}]}
```
8. Film B, b-roll lockup ("it's a costly habit,"):
```json
{"copy": [{"id": "c1", "role": "caption", "lines": ["It's a"], "face": "serif-italic", "size": "large"},
          {"id": "c2", "role": "caption", "lines": ["costly"], "face": "serif-italic", "size": "large"},
          {"id": "c3", "role": "caption", "lines": ["habit"], "face": "serif-italic", "size": "large"}],
 "pages": [{"block": "stack", "start": "scene-start",
            "groups": [{"items": ["c1"], "align": "center", "slot": "upper"}, {"items": ["c2", "c3"], "align": "staircase", "slot": "lower"}]}],
 "shots": [{"source": "stock-video", "query": "coins falling into glass jar", "framing": "close", "mustShow": "coins",
            "from": "scene-start", "treatment": "bw", "layout": "full"}]}
```
