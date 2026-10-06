# EO scene plan — `eo-plan/0`

A plan is what the planning stage writes for one scene. It holds **directing decisions only**: what is said on screen,
how it is grouped, which treatment each part gets, and when things happen, anchored to spoken words. It never holds
coordinates, sizes, frame numbers, colour values or references to any existing video. The film's look (colours, fonts,
print screen, cadence, measured sizes and timings) lives in the style profile chosen for the whole film
(`styles/<film>.json`); a plan names steps of it.

Sections 1-9 are the field reference, each field with when to use it; section 10 is guidance for choosing well.
The lint checks every field below and rejects anything else.

```jsonc
{
  "schema": "eo-plan/0",
  "sceneId": "S01",
  "film": "A",                      // style profile id, fixed for the whole film
  "durationFrames": 52,             // given by the edit, not authored
  "words": [{"text": "Most", "start": 0.0, "end": 0.18}],   // transcript, seconds from the scene start (given)
  "context": {"scenePurpose": "...", "previous": "...", "next": "..."},
  "craftIntent": "One or two sentences on what the viewer should feel or understand.",
  "copy": [                         // every piece of on-screen text, in reading order
    {"id": "lead1", "role": "lead", "lines": ["most people", "start with"]},
    {"id": "key", "role": "key", "lines": ["a plan."]}
  ],
  "assets": [                       // generated pictures (text to image, no reference images)
    {"id": "map", "role": "hero", "tone": "greyscale", "rim": "cut-paper", "anchorWord": "plan",
     "prompt": "isolated photograph of a folded paper map"}
  ],
  "pages": [                        // one page = one composition; a new page clears the one before
    {"block": "hero-stack", "items": ["lead1", "map", "key"], "band": "centre", "ground": "paper", "start": "scene-start"}
  ],
  "beats": [{"onWord": "plan", "ground": "flood", "textOnFlip": "invert"}],   // ground changes inside a page
  "entrances": {"key": "blur-rise", "map": "rack-focus"},   // overrides of the role defaults
  "camera": {"move": "pull-out", "phase": "exit-accelerate", "fromWord": "plan", "amount": "small"},
  "idle": {"map": "float"},
  "ending": "hold"
}
```

## 1. Ground rules

**Allowed values.** Authored fields are enums, word anchors, ids, on-screen copy and plain-English prompts or search
words. Lint rejects numbers, coordinates, sizes, durations, hex or rgb colours, the name of any font a style profile
sets (a face is chosen by `face` and `weight`), unknown fields or values, and wording that points at an existing video
(`original`, `reference`, `match`, `same as`, `like the clip`, the channel's name). Every object (copy, asset, page,
group, beat, camera move, shot, motion, piece, count) is written as an object and takes only the fields listed for it
here; lists are lists (lint reports a wrong shape instead of guessing).

**Word anchors.** Text appears when it is spoken: every word of every copy line is matched, in order, to the
transcript; words that are not spoken (added for clarity) appear with their neighbours. Anchors name a spoken word:
`"word"`, or `"word#2"` for its second occurrence. Occurrences of the exact word count first; only a word spoken fewer
times than asked falls back to close matches (a misheard or inflected word, one part of a hyphenated word), so `them`
never lands on an earlier `the`. Lint resolves every anchor (page starts, item timing, picture landings, moves, pieces,
exits, counts, beats, camera, shots) with the compiler's own rule and rejects one that names no spoken word: without it the compiler
falls back (a later page spread by page count, a beat dropped, a shot from the scene's start). Where a field takes
`{"word": ..., "at": ...}`, `at` is

| `at` | the point in the word |
|---|---|
| `before` | about three frames before the word starts |
| `start` (default) | as the word starts |
| `mid` | the middle of the word (a cut while the word is still being said) |
| `end` | as the word ends |
| `after` | about three frames after it ends |

**Ids.** Copy items and pictures share one set of ids, each used once. `entrances`, `idle`, pages, groups and carousels
refer to them. Every copy item is shown by a page and enters before its page ends and before its `exit`; every picture
is on a page (decor and reach-in pictures in the items of the page they belong to) or in a carousel. Once an item's
entrance has settled it stays a moment (the film's minimum hold, a quarter second), or for copy until its last word is
said, before its exit, its page's end or the next card or caption group takes it away (§3; the scene's end may cut
anything).

## 2. Copy (`copy[]`)

| Field | Values | When to use |
|---|---|---|
| `id`, `role` | role `lead` (small connective words), `key` (the dominant word or phrase), `tail` (small words after the key), `number` (a figure), `caption` (spoken-word captions, on `captions` pages) | every item |
| `lines` | on-screen lines, your line breaks | lowercase unless a capital is the point; no empty lines; words parted by one plain space (no leading, trailing or repeated spaces); letters, figures, punctuation, currency signs and `%` the film's fonts draw (lint reads each font's glyphs) |
| `face` | `serif-italic`, `sans-heavy` | default: the film's key face for `key`, heavy sans for `number`, the film's sans for leads/tails, the caption face for captions. Captions take only `serif-italic` |
| `weight` | `light`, `regular`, `bold`, `black` | a weight step of the face. On `serif-italic`, `light` is the film's separate hairline italic (film A a light Didone, also its `regular`; film B a thin bracketed italic): soft lead-ins and asides against a heavy key. It changes weight only: a light lead reads as big as a bold italic at the same `size`. A heavier caption word is `weight: bold`, never `sans-heavy` |
| `size` | `small`, `normal`, `large`, `xlarge`, and half steps `small-` `small+` `normal-` `normal+` `large-` `large+` `xlarge-` `xlarge+` | a step within the role's size (x0.72, x1, x1.3, x1.5; a half step is about x1.14 below or above), e.g. an oversized key, a thin small lead, a key a little under the key size (`normal-`) |
| `colour` | `ink`, `accent`, `accent-soft`, `accent-deep`, `money`, `flood`, `flood-alt` | default: key `accent`, others `ink`. On paper the plan's colour wins; on a flood every colour reverses except `money`. `accent-soft` is a pale tint of the accent (a contrast's connective), `accent-deep` the accent's deeper companion (film B: a crimson), for a second accented element that must stand apart from an accent one, `flood`/`flood-alt` words in a flood colour. A caption keeps its colour on any ground: never the colour of the ground it sits on (lint rejects text drawn in about its ground's colour, starred words and beats included) |
| `wordSpace` | `tight`, `normal`, `loose` | word spacing against the film's: `tight` closes a heavy line up |
| `emphasis` | object of `face`, `weight`, `colour` | the look of the starred words (see below) |
| `scope`, `timing`, `stagger`, `enter`, `count`, `exit` | | timing and entrance (§6), counters (§7), exits (§3) |

**Markup inside `lines`.**
- `[in time] for`: the bracketed words of one line enter together as one unit (one step of a stagger). Brackets are
  not shown and close on their line.
- `a *quiet* room`, `*two words* here`: the starred words change look inside the line, on its baseline and x-height
  (in a caption, at the caption size of their face). Without `emphasis` they take the role's own look (the item's
  `face`, `weight`, `colour` dropped): a `light` italic line whose one word is the film's bold key italic. With
  `emphasis` they take the item's look with those fields changed, e.g. `{"face": "sans-heavy"}` for one heavy word in a
  lead. A `typewriter` line (`scope` `line`, `item`, `line-join`) types each run in its own look in turn. Lint rejects
  stars that would look like the rest of the line in the film. Brackets and stars combine.

## 3. Pages and blocks (`pages[]`)

A page is one composition from its `start` until the next page starts; everything on it is cleared then (except a
picture listed on both pages, which carries over, and anything `exit` cuts out earlier).

| Block | What it lays out | The fields it reads (besides `start`, `ground`, `handoff`, `shape`) |
|---|---|---|
| `stack` | lines top to bottom on the band | `items` (copy only; for pictures write `groups` or `layout: split`), `align` (any), `keyAlign`, `anchor`, `spacing`, `band`; `groups`, `gap` and `layout` |
| `hero-stack` | parts top to bottom: each run of consecutive copy items a text block (set as a `stack` sets it), each picture a part as big as it is drawn; parts a `gap` apart, centred on the band | as `stack`; `items` holds copy and pictures. Write a lead and its key as neighbours: they sit at the stack's tight lead-to-key pitch |
| `flank-hero` | one picture with words hugging its silhouette in two columns and rows under it (the key) | `hero` (picture id), `left`, `right`, `under` (copy ids), `stagger`, `align` (`center`, `center-lines`, `left` only), `band`; `items` only for reach-in or scattered pictures |
| `cards` | one item at a time, each replacing the last on its first word; every card shows its item's first line, all at one size, centred on the band (write one line per card) | `items` (copy), `cardGrounds`, `band` |
| `captions` | spoken-word captions over footage or paper (§9) | `items` (caption items, plus pictures for the picture band), `mode`, `align` (`left`, `center`, `right` only), `spacing`, `band`; `gap` between two or more pictures |

Lint rejects a field the page's block does not read, an `align` it does not know, and a field left with nothing to
do: `gap` on a plain stack (it parts groups, or text and pictures), `keyAlign` on rows that `justify` or `staircase`
sets, `anchor` or `band` on a page whose every group sits on a `slot`, `band` on a split page. Its error names what to
write instead (a key hung on caption lines, for one, is a split `hero-stack`, §9).

| Field | Values | When to use |
|---|---|---|
| `start` | `"scene-start"` (the first page), `{"word": ..., "at": ...}` | a later page starts on a spoken word (lint rejects a later page without one) |
| `ground` | `paper` (default), `white`, `flood`, `flood-alt` | the page's ground (§4) |
| `band` | `centre` (default), `upper`; captions also `chest`, `lower` | the line the page is centred on (a split page sets its text in the top band, slotted groups on their slots) |
| `align` | `left`, `center`, `center-lines`, `right`, `staircase`, `justify`, `picture-left`, `picture-right` | `center`: the block centred, its lines sharing one left edge (a block of one line is that line centred); `center-lines`: each line centred (hero-stack default; stack default is `center`); `staircase`: lines step from the left margin to the right; `justify`: multi-word lines spread to one measure (the key line's width); `picture-left`/`picture-right`: the rows' left (right) edge on the page picture's silhouette edge (pages that lay out a picture: a hero-stack, or a stack in groups or split; by a band or bleed picture they hold the margin). Flank-hero: default hugs the picture line by line, `center`/`center-lines` make each column a centred stack, `left` sets the under rows at the margin. Captions: `center` (default), `left`, `right` |
| `keyAlign` | `block` (default), `center`, `right-to-lead` | the key's own alignment: `right-to-lead` hangs it under the end of the lead line above |
| `anchor` | `block`, `first-line` | centre the whole block on the band, or put its first line on the band and let the rest hang (a long set-up with the key hung below) |
| `spacing` | `tight`, `normal`, `airy` | line spacing (`airy` leaves room for pictures between lines); on captions pages the rows' leading |
| `gap` | `tight`, `normal`, `airy` | the space between parts and groups: `tight` hugs a line to its picture, `airy` sets groups well apart; on a captions page, between its pictures |
| `groups` | list of `{"items", "align", "keyAlign", "spacing", "slot"}` instead of `items` | blocks of one page placed apart, each with its own alignment and spacing: a right-aligned pair high, a centred pair, a left-aligned pair low; rows that hold a picture's edge. Groups flow in order with the page's `gap`; a group with a `slot` sits on that line instead. Scattered decor and reach-in pictures listed in a group are still placed as decor, not as parts. `stack` and `hero-stack` pages |
| `groups[].slot` | `top`, `upper`, `centre`, `lower` | the group is centred on that line of the frame (the top band, about a quarter down, about the middle, about two-thirds down) whatever else is on the page: diagonal or corner compositions, a headline high over a centred picture, a word on the frame's middle |
| `layout` | `stacked` (default), `split` | `split`: the text flows in the film's top band and the pictures hang in the lower band (a short text block over a big picture; pictures keep their place across pages). Keep the text to two or three rows. `stack` and `hero-stack` |
| `stagger` | `level`, `half` (default), `low` | flank-hero: how far the right column hangs below the left (`low`: its last line one line below the left column's last, just above the key) |
| `shape` | `none`, `disc`, `disc-flood`, `disc-accent` | a flat circle behind the page's picture: the film's warm yellow-orange, its flood, or its orange-red disc colour |
| `cardGrounds` | list of grounds, one per card | each card brings its own ground: paper/flood/paper for a list, flood/paper for a contrast |
| `mode` | `replace` (default), `build` | captions: each group replaces the last, or groups accumulate |
| `handoff` | `cut` (default), `overlap` | `overlap`: the previous page holds a couple of frames into this one, so its last frames share the screen with the first entrance here |

**Per item on pages.** `copy[].exit` and `assets[].exit` (`{"word": ..., "at": ...}` or `"scene-end"`): the item cuts
out on that word (or one frame before the cut) while the rest of its page holds, e.g. a line cleared before the next
scene while the picture stays. An item first draws on its entrance (a `present` one on its page's first frame, a
picture on its `anchorWord` or with its page's first key word) and must show in full before it goes: lint rejects an
exit, a page end, or a next card or caption group that comes before the entrance settles or within the film's minimum
hold after it, unless the copy's words are still being said then (a card or caption group follows its speech).

```jsonc
"pages": [{"block": "stack", "gap": "airy", "groups": [
  {"items": ["onlyLead", "seatsKey"], "align": "right", "slot": "upper", "spacing": "tight"},
  {"items": ["count", "total"], "align": "center-lines", "slot": "centre", "spacing": "tight"},
  {"items": ["teamsLead", "rowKey"], "align": "left", "slot": "lower", "spacing": "tight"}]}]
```

## 4. Grounds and beats

Grounds: `paper` (default), `white` (pure white), `flood` (the film's flood), `flood-alt` (its second flood: film A
the brighter red-orange of its opening hook, film B a warm orange). Text reverses on a flood (key in the film's
accent-on-flood); `money` stays green. A beat changes the ground inside a page on a spoken word:

| `beats[]` field | Values | When to use |
|---|---|---|
| `onWord` | a spoken word | the flip point (default: the film's flip lead before the word) |
| `ground` | a ground | the new ground |
| `at` | an `at` value | where in the word it flips |
| `with` | `key-entrance` | the ground changes on the frame the key starts entering (`onWord` then picks the key) |
| `textOnFlip` | `invert` (default), `keep` | words already on screen reverse with the flip, or keep their colour |

## 5. Pictures (`assets[]`)

Pictures are generated from `prompt` (text to image, transparent background) and laid out by their page.

| Field | Values | When to use |
|---|---|---|
| `role` | `hero` (laid out by its page), `decor` (with `layout: scatter`), `reach-in-left`, `reach-in-right` (a hand that slides in from its frame edge towards the page's hero) | every picture |
| `prompt` | plain English | what to draw (§10) |
| `aspect` | `square` (default), `wide`, `tall` | the canvas it is generated on: `wide` for a panorama or a long subject (a `band` or `bleed` picture, a truck along it), `tall` for a standing figure or a tower. Generation only; the compiler lays out what is delivered |
| `tone` | `natural`, `faded`, `greyscale`, `drawn`, `duotone` | `natural`: a photo in the film's print (levelled to true blacks, slightly muted; film B prints `natural` and `greyscale` pale under its dark dots); `faded`: a pale, soft vintage print; `greyscale`; `drawn`: an illustration or doodle kept as drawn (its ink outline, flat fills and saturation); `duotone`: printed in one hue, black through the hue to near white |
| `hue` | `blue`, `teal`, `accent`, `accent-deep`, `money`, `flood`, `flood-alt` | the duotone's hue (`blue` film A, `teal` film B, else the film's own); a palette token runs ink, the colour, then the paper |
| `rim` | `cut-paper`, `offset-edge`, `none` | `cut-paper`: the film's wobbly paper border; `offset-edge`: a hard paper-white copy of the silhouette shifted up and left, read as a cut-paper strip down one side (film B's cut-out photos) |
| `size` | `small`, `normal`, `large`, `band`, `bleed` | a size step of its slot; `band`: as wide as the frame (a frame-wide picture under the text); `bleed`: as tall as the lower band and at least as wide as the frame, so a wide picture runs off both edges and is cropped (write `aspect: wide`). Band and bleed are best on a split page |
| `layout`, `count` | `scatter`; `few`, `many` | decor copies scattered around the text in three size tiers, some bleeding off the edges (a mass noun) |
| `anchorWord`, `at` | a spoken word; an `at` value | when the picture lands (default: with the page's first key word, else with the page). A word before its page's start shows it from that word; on the first page, `before` the first word starts its entrance before the scene, so it is under way on the first frame (a focus pull still softening) |
| `enter` | `fade`, `blur`, `curve` (§6) | e.g. a focus pull that stays soft longer: `rack-focus` with `{"curve": "ease-out"}` |
| `carry` | `glide` (default), `in-place` | a picture listed on the next page too: `glide` moves it to its new slot over a few frames; `in-place` keeps its place and size and lays the next page out around it |
| `exit` | a word anchor, `"scene-end"` | the picture cuts out while its page holds |
| `motion`, `sequence`, `cut` + `pieces` | | below |

The print screen, picture levels and hue ramps are the film's; `print: coarse` (§8) scales its dots and paper rims.

### Pictures that move: `assets[].motion`

A picture can move on its own while the text holds still. Moves add to its entrance, its page glides and each other,
in order. Do not use `camera` for this: the camera moves the text with it.

```jsonc
{"id": "pier", "role": "hero", "size": "bleed", "aspect": "wide", "carry": "in-place", "prompt": "...",
 "motion": [{"type": "truck", "dir": "left", "distance": "across", "from": "scene-start", "to": {"word": "harbour", "at": "mid"},
             "ease": "in-out", "preRoll": "short"},
            {"type": "push", "amount": "small", "from": {"word": "home", "at": "after"}, "to": "scene-end"}]}
```

| `motion[]` field | Values | When to use |
|---|---|---|
| `type` | `glide`, `truck`, `exit`, `push`, `pull` | `glide` arrives at its place from `distance` back along `dir` (a short slide into place, or from `off-frame`); `truck` passes through its place from half the distance before to half after (a pan along a wide picture under still captions); `exit` leaves along `dir` (dragged out of frame); `push`/`pull` scale it up/down about the middle of what is seen of it (a picture-only push-in after the voice) |
| `dir` | `left`, `right`, `up`, `down`, `up-left`, `up-right`, `down-left`, `down-right`, `outward` | glide, truck, exit. `outward`: away from the frame's centre; for a piece, away from its picture's centre (pieces pulled apart) |
| `distance` | `short`, `medium`, `long`, `across`, `off-frame` | the film's steps (`short` is its picture glide); `across` (truck): from one end of a `bleed` picture to the other; `off-frame` (glide, exit): until everything the picture draws, rims included, is outside what the frame shows then (camera moves included); a picture that exits off-frame is gone from then on. Default: `off-frame` for exit, `short` otherwise |
| `amount` | `small`, `large` | push and pull (film A small: x1.1) |
| `from`, `to` | `"scene-start"` or a word anchor; `"scene-end"` or a word anchor | the span. Default `from`: the picture's first frame (an exit must name it); `to`: the film's length for glide and exit, the picture's last frame for the others |
| `ease` | `linear`, `in2` (accelerates), `out2` (decelerates), `in-out` | default per type from the film: glide `linear` (dead stop), truck `in-out`, exit and push `in2`, pull `out2` |
| `preRoll` | `none` (default), `short`, `half` | the move started before `from`: by the film's pre-roll, or half done on its first frame (a picture already moving when the scene cuts in) |

On film A's 15 fps ticks a moving picture advances evenly per tick and rests at its end from the first tick after the
move ends. A travelling entrance preset on a picture (`rise`, `slide-up`, `blur-rise`) travels the film's short picture
distance; for any other direction use a `glide`.

### Carousels: `assets[].sequence`

`"sequence": ["cup", "leaf", "kite", "boot"]` makes the slot show those pictures in turn, one per step at the film's
rate (film A: one per 15 fps tick, no fades or gaps), then this picture, which holds. Ids may repeat (never the same one
twice in a row reads best). The held picture keeps its laid-out size (any `size`, `band` and `bleed` too); every other
picture keeps its own drawn size and shape at the slot's scale, with its own `tone` and `rim`. Listed pictures are not put
on pages themselves; the carousel takes the slot's entrance, page moves and `motion`. Use it for a rapid montage in one
place (a line about many things, or a choice among them), never `flicker-on` (which blinks to empty ground).

### Pictures in pieces: `assets[].cut` + `pieces`

The picture is cut into as many pieces as `pieces` lists, after it is generated (prompt it whole and uncut):
`radial` equal wedges about the centre of the subject's body, clockwise from twelve o'clock; `columns` left to right;
`rows` top to bottom; `grid` rows of cells in reading order. The cut follows the subject's body; anything reaching out of
it (a hand gripping an edge, an arm) goes whole with the piece it touches most.

| `pieces[]` field | Values | When to use |
|---|---|---|
| `onset` | `with-picture` (default), `next`, a word anchor | when the piece cuts in: with the picture, the film's piece step (5 frames) after the piece before it, or on a word: a collage that assembles piece by piece |
| `rim` | `cut-paper`, `offset-edge`, `none` | the piece's own rim (default: the picture's); rimmed pieces show paper seams |
| `motion`, `exit` | as `assets[].motion`; a word anchor or `"scene-end"` | the piece's own moves on top of the picture's (a hand pulling its piece out of frame) and its cut-out |

A piece is a region of the picture: a rimless part (a hand) lying on a rimmed piece takes its rim, and the part of a hand
lying over the body is cut with the body, so hands should grip the edge rather than lie across the subject.

## 6. Entrances and word timing

`entrances` maps an item id to a preset; without it each role takes the film's default (film A: leads, figures and
captions `pop`, keys `blur-rise`; film B: leads and figures `fade`, keys `rise`, captions `pop`). Pictures take the
leads' default.

| Preset | What it does | When to use |
|---|---|---|
| `present` | there from its page's first frame | carried or already-placed things |
| `pop` | appears at once on its word | film A leads, tails |
| `fade` | fades in (film B per role: leads 4 frames, keys 5, figures 6) | film B leads |
| `rise`, `slide-up` | a short rise with a quick fade; a solid, steady rise with a dead stop | film B keys; a second pole |
| `blur-rise`, `blur-rise-short` | rises out of blur; a shallower version | film A keys; with a flood or on a second page |
| `blur-in` | sharpens in place | a picture present at the start |
| `rack-focus` | a picture's focus pull at full opacity | pictures |
| `typewriter` | letters typed at the film's rate; with `scope` `line`/`item` the line types across its spoken span | one light typed caption |
| `flicker-on` | flickers on, then steady | things that switch on (a bulb), never as a carousel |
| `reach-in` | slides in from its frame edge | hands (`reach-in-*` roles do it by default) |
| `count-up` | pops in counting up from zero over the film's count length | the short form of `copy[].count` |

**Changing one entrance: `copy[].enter`** (object, any of these; pictures take `fade`, `blur`, `curve` only). Works on
every preset except `present`, `typewriter`, `flicker-on`, and on `pop`/`count-up` (a counter that fades in while it
counts). Use it when one item enters unlike the film's default.

| `enter` field | Values | Effect |
|---|---|---|
| `dir` | `up` (rises from below), `down`, `left` (slides in from the right), `right`, `none` | direction of travel; an in-place preset given a direction travels `short` with its fade |
| `distance` | `none`, `short`, `medium`, `long` | about 0.3 / 0.6 / 1.0 of its own x-height |
| `fade` | `cut`, `quick`, `medium`, `slow`, `slower` | how long it takes to appear (3, 5, 8, 11 frames; `cut` at once) |
| `move` | `quick`, `medium`, `slow` | how long the travel takes, apart from the fade (a short lift that stops while a slow fade goes on) |
| `blur` | `none`, `soft`, `medium`, `heavy` | how far out of focus it starts |
| `curve` | `expo` (fast, long settle), `ease-out`, `linear` (steady, dead stop), `smooth` | the shape of fade and move |

**When words appear.**

| Field | Values | When to use |
|---|---|---|
| `copy[].scope` | `word` (default; captions `item`), `line`, `item`, `line-join` | the entrance unit: each word (or `[group]`) on its own word, a whole line, or the whole item together. `line-join`: every word appears on its spoken word but joins the line's entrance already under way, landing almost settled |
| `copy[].timing` | `{"onWord": ..., "at": ..., "nudge": ...}` | anchor the whole item to one spoken word (words that are not spoken, a run-up that lands early). With `scope: word` the anchor sets the first word and later words keep their spoken stagger. `nudge`: `earlier`/`later` moves the item about two frames, with or without `onWord` |
| `copy[].stagger` | `speech` (default), `even`, `tight` | with `scope: word`: `even` steps word after word by the film's fixed step from the item's start, whatever the speech (a quick build that runs ahead of the voice); `tight` a quicker step |
| `textCadence` (top level) | `film` (default), `ones` | film A: `ones` lets the scene's type start and move on every video frame while pictures, flickers and grounds keep the 15 fps step (words that rise smoothly over stepped pictures, onsets the ticks cannot reach). Page and card cuts stay on the ticks. Film B is on ones already (lint rejects it) |

## 7. Counters (`copy[].count`)

A figure that ticks up or down under the voice. The line holds the figure it lands on (`"3.5%"`, `"$40,000"`) and the
item shows exactly one figure; it works on any role and entrance except `typewriter`, keeps the figure's prefix, suffix
and commas, and holds the edge its line is aligned on (`center-lines` for a counter that stays centred in a stack of
several lines).

```jsonc
{"id": "rate", "role": "number", "lines": ["3.5%"], "count": {"from": "90%", "land": "scene-end"}},
{"id": "fund", "role": "number", "lines": ["$40000"], "count": {"start": {"with": "rate"}, "land": {"with": "rate"}}}
```

| Field | Values | When to use |
|---|---|---|
| `from` | `zero` (default) or the start figure as on screen | a count down, or one that picks up from an earlier figure |
| `direction` | `up`, `down` | without `from`: `down` starts at the film's countdown start, a round figure far above the landing one |
| `start` | a word anchor, `"scene-start"`, `{"with": id}` | default: as the item starts to enter; earlier for a counter already mid-count when it appears |
| `land` | a word anchor, `"scene-end"`, `{"with": id}` | default: the film's count length after the start; `scene-end` lands just before the cut and holds; `with` lands two counters together. Lint rejects `scene-end` on an item replaced before the end |
| `decimals` | `none`, `one`, `two` | decimals shown while counting (default: as the figure has) |

## 8. Camera, idle, ending, print

| Field | Values | When to use |
|---|---|---|
| `camera` | one move or a list of moves | the whole composition moves (text and pictures together): settle in, then pan out after speech |
| `camera.move` | `none`, `pull-out`, `push-in`, `pan-left`, `pan-right` | |
| `camera.phase` | `exit-accelerate` (default), `enter-settle`, `exit-after-speech` | accelerate out from `fromWord` (default about half-way) to the cut; open moved and settle; start just after the last spoken word |
| `camera.fromWord`, `camera.at` | a spoken word; an `at` value | when an exit move starts |
| `camera.amount` | `small`, `large` | |
| `camera.pivot` | `hero` (default), `frame` | what the move centres on |
| `idle` | `{id: "float" \| "static"}` | `float`: a slow drift after the item lands (a picture on a disc) |
| `ending` | `hold` (default), `clear`, `cut-to-black` | how the last frames end: hold, everything leaves just before the cut, or the last frame black |
| `print` | `fine` (default), `coarse` | film A prints its opening hook coarser (screen dots and paper rims about 1.5x); film B has one grain |

## 9. Footage: shots and captions

A scene may lay footage under its text. `shots` is an ordered list; each shot runs until the next one starts.

```jsonc
"shots": [
  {"source": "podcast", "from": "scene-start", "treatment": "none", "layout": "full"},
  {"source": "stock-video", "query": "bicycle on a coast road", "framing": "wide", "mustShow": "bicycle",
   "from": {"word": "because"}, "treatment": "halftone", "speed": "slow"},
  {"source": "person", "name": "Full Name", "context": "who they are, era", "from": {"word": "founder"}, "treatment": "bw-halftone"}
]
```

| Field | Values | When to use |
|---|---|---|
| `source` | `podcast` (the edit's own speaker footage, given), `stock-video` (stock search), `person` (a photo of a real, named person) | |
| `query` | stock video: 2-5 plain English words naming what is visible (objects, action, place) | no names, brands or logos, no style words, no shot sizes (`framing` adds them; lint rejects "wide shot", "close up", "full body" here) |
| `framing` | `wide`, `medium`, `close` | stock video and person: the shot size the pick must have. The stock search adds its words to the query first (§10) |
| `mustShow` | a few plain words | stock video and person: what must be visible in the pick (the object the line depends on). On stock video name it in `query` too (lint checks): the search finds only what the query names |
| `name`, `context` | person: the name and a few words to tell them apart (role, company, era) | |
| `from` | `"scene-start"` or a word anchor | shots usually cut on a word |
| `treatment` | `none`, `bw`, `bw-halftone`, `halftone`, `warm-film` | the print screen covers halftone treatments only; a plain shot prints clean |
| `layout` | `full` (fills the frame), `inset` (a rounded 16:9 window on a paper card) | |
| `move` | `none`, `slow-push` | stills |
| `speed` | `normal`, `fast`, `very-fast`, `slow` | stock video only. `slow` plays slower without new in-between frames, each held (film A: one new frame per 15 fps tick, about 0.6x): a calm, dreamy insert |
| `grade` | `film` (default), `none` | stock video and person: footage the film brings in takes the film's grade (film A's b-roll is low-key: mid-tones sink, whites stay white); `none` keeps a bright insert apart. Not on podcast shots |

The cadence is the film's: film A steps its stock footage on 15 fps ticks of their own (a cut to it lands on one of its
ticks) and cuts captions on the video frames; film B draws everything on the video frames. Full-frame halftone footage
prints the film's footage screen where it has one (film A's mostly dark dots), at the scene's `print` scale. A shot that
lasts one frame is a flash: a caption that would start on it appears on the frame after. Every shot lasts at least one
frame, so to open a scene on a one-frame flash write the flash as the first shot (in a halftone treatment, `halftone`
or `bw-halftone`) and start the next shot on the same frame (`from: "scene-start"`).

**Captions** are copy items with `role: "caption"` placed by a `captions` page:

```jsonc
"copy": [{"id": "c1", "role": "caption", "lines": ["once a"]}, {"id": "c2", "role": "caption", "lines": ["week"]}],
"pages": [{"block": "captions", "items": ["c1", "c2"], "mode": "replace", "band": "centre"}]
```

- Each caption item is one group of words shown together when its first word is spoken. Lines inside an item are your
  line breaks; the text may differ from the transcript where an editor would rewrite it.
- The look is the film's (font, size, white over footage, ink on paper). An item may set `face: serif-italic`, `weight`
  (`light` on serif-italic, `bold` for a heavier word), `size`, `colour` and starred emphasis.
- Bands, top to bottom: `upper` (top quarter), `centre` (just below the middle; film A puts every footage caption here),
  `chest` (about two-thirds down: on the chest of a medium speaker shot, under the collar), `lower` (bottom quarter: under
  the chin of a close-up, or low on b-roll). Pick the band from the footage so the words sit on a calm area clear of
  faces.
- Every group centres its first line's x-height on one fixed line per band, so groups of one size share one baseline
  and swaps never hop; a bigger group grows about the same centre. Later lines and later `build` groups hang below; a
  block that would run below the film's lowest caption line moves up as a whole (keep builds to three or four rows). A
  line wider than the film's widest caption shrinks to fit.
- `size` steps are relative to the film's base caption: film A's ordinary caption is `normal`. Film B sets three:
  `large` is its ordinary caption (write it on every ordinary group), `normal` a smaller lead-in phrase above a bigger
  line, `xlarge` one step above the ordinary caption (every card after a punch-in jump cut).
- Captions cut on the video frames of the edit, the film's reaction offset after the group's first spoken word (or its
  `timing` anchor). In film A the first group of a captions page whose words are already under way cuts in with the page.
- Pictures listed on a captions page hang in the film's picture band: below the captions on `upper`/`centre`, above
  them on `chest`/`lower`, always clear of every caption row the page shows (a picture too tall for what is left is
  scaled down; a `bleed` picture runs off the frame instead). On `centre` captions a picture gets only the lower part of
  the frame, so put the captions `upper` over a big picture. Scattered decor and reach-in pictures listed on a captions
  page are placed as decor. For a top caption lockup that needs `keyAlign`, use a split `hero-stack` page: caption
  items keep their caption look and cut timing there, and a `key` hangs on them with `keyAlign: right-to-lead` (a
  captions page reads no `keyAlign` or `anchor`; lint rejects them there).

## 10. Choosing well (encoder guidance)

Each point names a device an editor used, the field that expresses it, and the stand-in to avoid.

**Blocks and roles.**
- A single picture alone on a page: `flank-hero` with only `hero` keeps the film's hero size, centred on the band;
  `hero-stack` draws its pictures about a fifth larger (its slot is made for a picture between text).
- Text over a big picture: a `hero-stack` with `layout: split` (text in the top band, picture in the lower band), or a
  captions page with the captions `upper`. A `stack` or `cards` page places no picture (lint rejects one listed there).
- Blocks that each hold their place (a diagonal of pairs, a headline high over a centred picture, a word on the frame's
  middle): `groups` with `slot`s; `gap` and `spacing` for the air between and within them.
- A light italic against a heavy sans: `face: serif-italic`, `weight: light` (leads, keys and captions alike); one
  heavier word inside a light line: `*word*` with `emphasis`.
- A figure smaller than the key scale: `size: small-` (or role `lead`/`tail` with `face: sans-heavy`).

**Stand-ins to avoid.**
- `camera` moves everything; a picture that moves under still text is `assets[].motion` (truck, glide, exit, push).
- `flicker-on` blinks to empty ground; a slot that flips through pictures is a carousel (`sequence`).
- Blank lines, runs of spaces and characters that draw nothing or that the film's fonts lack (non-breaking, zero-width
  or other invisible spaces, blank glyphs, symbols set in another font), text in its ground's colour, copy items no page
  shows or that leave before they show in full (they still take spoken words from the items around them), pictures on
  no page or gone before they show (the items around them still make room), and later pages whose start names no
  spoken word only worked by accident and are rejected: place text with `band`, `anchor`, `groups`/`slot`, `gap`,
  `align`, `keyAlign`; size it with `size`; time it with `stagger`, `timing` and word anchors.
- The same picture on several pages is one asset listed on each page (it carries: `glide` or `in-place`), not several
  assets with one prompt.

**Search the anchors.** Every word anchor (a page's start, a beat, a picture's landing, move or exit, a piece, a
count's start or landing, a shot's cut, an item's `timing.onWord`) can land on the previous word's `after`, this
word's `before`, `start`, `mid`, `end` or `after`. A copy item can also move about two frames with `timing.nudge`
(`earlier`/`later`), with or without `onWord`, and so can a card or a caption group, which enter as their item does;
pages, beats, pictures, counts and shots take no nudge. The role's reaction offset comes on top. Try the points in turn
and take the one that lands where the cut belongs (with the voice, a beat ahead of it, or as a word ends), not only the
word's start.

**Size hierarchy.** Rank the words on screen by what the line stresses and give the stressed word the biggest size;
set connective lines down (`small`, half steps) rather than pushing the payoff past the film's sizes. Keep the order
across pages: a later phase that is more emphatic is bigger. In film B footage scenes a punch-in jump cut steps every
later caption up one size (`large` to `xlarge`).

**Picture prompts.** Each picture is generated alone on a transparent canvas; the generator adds "exactly one subject,
isolated cutout, no shadow, no text, letters, numbers, logos or watermark". So:
- Wide pictures: write `aspect: wide` and prompt the whole long subject from end to end ("a long wooden pier seen from
  the side, from the shore to its far end, gulls along its rail"). Never squeeze a subject whose length is the point
  onto a square canvas; pair it with `size: bleed` (or `band`) and a `truck` along it. `aspect: tall` for a standing
  figure, a tower or a bottle.
- Hand-drawn doodles: image models default to clean, symmetric vector icons. Say what makes a drawing hand-made: "drawn
  quickly by hand with a felt-tip pen, a dark outline that wobbles and changes thickness, lopsided proportions, flat
  bright colour that spills over the line in places, no shading or gradients, not a vector icon", and set
  `tone: drawn` (keeps the ink and the fills) and `rim: none`. This wording has not yet been tried against the
  generator: look at what comes back. Letters and logos are never generated, so a doodled logo or sign is drawn as the
  object it stands for. Give every picture of a carousel the same drawing words.
- Photos: "isolated photograph of <object>", one real object, a hand where it helps. The print is the film's `tone`:
  leave tints out of the prompt (a tint named there shifts the duotone's hue) and set `tone: duotone` with `hue`. Paper
  rims and offset edges are `rim`, not prompt words.
- Collages that assemble or come apart: one picture with `cut` + `pieces`, prompted whole and uncut, with no cut lines;
  hands grip its edge from outside and nothing lies across its face. Do not prompt the slices or gaps.

**Stock b-roll.** The candidates sheet shows each candidate as it will fill the
frame, shades where the plan's captions will sit, and flags a face in that band and fine stripes that will moire under
the screen. Choose with it:
- `query`: what is visible, 2-5 words (subject, action, object, place); no style words and no shot sizes.
- `framing`: the shot size the scene needs. `wide`: the whole body with room around it, the subject small in the frame
  and its setting visible (when the place is the point: a person walking along a beach); `medium`: waist up; `close`: a
  face, hands or one object filling the frame. The search runs the query with the framing's words first ("wide shot",
  "medium shot", "close up") and the query alone after it; the sheet marks the framed search's candidates.
- `mustShow`: the object the line depends on, named in the query too; a candidate without it is wrong however good it
  looks.
- Pick a candidate without flags whose framing and subject fit: faces above or below the caption band (the captions
  belong on a calm, darker area of the shot), no window blinds, finely striped fabric or grilles across the frame
  (broad stripes are fine), and write its number to `pick.json`. No check sees framing or what is visible, so a shot
  that names `framing` or `mustShow` is fetched only from an explicit pick; without them `fetch` takes the first
  candidate that passes the checks. If none fits, rewrite the query (another setting, action or subject) and search
  again rather than taking a misfit. `fetch` repeats the checks on the frames it extracts and warns.
