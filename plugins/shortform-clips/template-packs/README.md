# Template packs

A pack supplies data to the shared [Shortform Clips app](..).
Customer branches and customer copies of the app are not required.

```text
plugins/shortform-clips/template-packs/<pack-id>/
  pack.json
  templates/<template-id>.json
  assets/<image>.png
```

## Distribution

Commit a pack's manifest, template JSON files and images together. Share its folder
link after publishing. In **Templates**, choose **+ Add templates** at the end
of the template picker, paste the link, and click **Add**. When no templates are
installed, use the **Add templates** button. A public manifest page or raw file
link also works.

Example after publication on main:
`https://github.com/CutbackVideo/selects-plugin-library/tree/main/plugins/shortform-clips/template-packs/sbs-radio`

Hosts supporting catalog installation links can install the app and a pack together:

```text
cutback-selects://plugin/install?id=shortform-clips&pack=sbs-radio
cutback-selects://plugin/install?id=shortform-clips&pack=hankook-ilbo
```

Use `cutback-selects-dev://` for the development app. These links require the client
release that advertises `deepLink.catalogInstall.v1` and a published app manifest
with `templatePackInstall: 1`. The host supplies a commit-pinned official pack URL
in `context.templatePack`; the app imports once through the same installer and
acknowledges the request with `sdk.finishTemplatePackInstall(requestId)`.
The Templates tab opens and selects a template from the installed pack. Busy jobs
and unsaved edits finish first. Failed imports keep the dialog open for retry.
Opening a link never starts clip generation. Older hosts retain manual link import.

Packs are excluded from the app manifest's `files` list. Installing the app does
not download these directories. A full repository clone or ZIP includes them.

### Update button

**Templates** lists each installed pack with an **Update** button. The pack entry in
`template-library/index.json` records how it was installed (`installSource`):
`catalog` for host catalog links and updates made with this button, `link` for pasted
links (with the URL and resolved commit), or `folder`. Template history, deletion and
copies do not change it. These packs update to the latest published catalog:

- `catalog` installs of this repository's `plugins/shortform-clips/template-packs/<pack-id>`.
- Pasted links to that folder on `main` or on a commit, including the commit-pinned
  links older host versions recorded at install time.

Links to other branches or repositories are updated by adding their link again. Packs installed before
`installSource` existed keep their link as `link` only when every template from the
pack recorded the same one; otherwise adding the link once records it. A shared
official URL alone is never treated as a catalog install.

1. The app registers its update provider again, so the host reads this app's entry
   from the Selects plugin catalog and passes its commit. The GitHub API is not used.
2. The app reads only `pack.json` at that commit from `raw.githubusercontent.com`.
3. A higher pack `version` installs through the same importer as **Add templates**:
   unmodified templates are replaced, saved edits ask to replace or add a copy, and
   templates missing from the new version are kept. Otherwise it reports the pack
   is up to date.

Unsaved edits or a running job must finish first. A host that does not answer
within 45 seconds, or a catalog without the pack, is reported as a failed check,
never as up to date. Adding a pack link again records its source without changing
template settings. Bump the pack `version` with every published change.

Branch and tag links resolve to one commit before downloading; commit links are used
as given, without a GitHub API request. Links with branch
names containing slashes are supported. The app downloads only the manifest and
its declared JSON/image files, validates the full pack, and installs a self-contained
snapshot. It stores the source URL and resolved commit with that snapshot. Repeat
the action to update; updates are explicit, never automatic. Public GitHub only;
no GitHub login or token is required. Rate limits and missing files are reported.
Downloads are bounded to 20 MiB per file, 100 MiB per pack and two minutes per attempt.

There is no file-upload flow, separate download tool, or new build step. Packs
contain data only. Plugin-local tests load every checked-in pack through the
same validator used by the app:

```sh
SBS_PANEL_TEST_MODULES=/path/to/node_modules node --test plugins/shortform-clips/tests/shortform_packs.test.cjs
```

## Manifest v1

```json
{
  "schemaVersion": 1,
  "id": "example-customer",
  "version": "1.0.0",
  "name": "Example Customer",
  "names": { "en": "Example Customer" },
  "requiresApp": { "id": "shortform-clips", "templateApi": 2 },
  "templates": ["templates/interview.json"],
  "assets": ["assets/logo.png"]
}
```

IDs use lowercase letters, digits and hyphens; pack IDs and template IDs are stable.
Names can be localized. Use Unicode escapes for Korean strings to satisfy the
repository's public-source checks. Every template and image must be declared.
Paths are relative to the pack root, with no absolute paths, parent traversal,
symlinks, remote URLs or executable content. PNG, JPEG and WebP assets are supported.
Limits: 100 templates, 200 assets, 20 MiB per file, 100 MiB per source pack.

## Template API 2

Start from one of the four [SBS templates](sbs-radio/templates), replacing customer
content and images. Each template is complete rather than inheriting another
customer's defaults. Required sections:

| Field | Meaning |
| --- | --- |
| `schemaVersion`, `id`, `version`, `names` | JSON schema version (1), stable local ID, positive integer revision, localized names |
| `layout` | Video window, source crop, headline/logo positions, optional speaker framing |
| `background`, `border`, `headline`, `logo` | Design settings; `image` values reference declared `assets/` files |
| `captions` | Caption mode, position, typeface, size and emphasis |
| `editing` | Filler and silence handling |
| `detect` | Keywords, exclusions and program description |
| `prompt` | Role, format, good/bad clips, length/count guidance, rules and headlines |
| `labels` (optional) | Top/footer labels; footer can derive an episode date |

For a `series` template with `layout.reframe` enabled, the app checks each clip's
picture once to choose the talker and the close-up width (see the app README), so a
template needs no edge rule. Money Lab retains its split-screen rules;
`separate-headlines` templates retain their fixed crop.

The shared app validates all templates and images before activation. Its renderer
features bound what a JSON file can express. New graphics behavior belongs in the
shared app and a future compatible template API.

## Template API 7 PDF input

A scene/layers template can declare `"input": {"kind": "pdf"}` to replace the
video source controls with a local PDF picker and a TTS voice
selector. Packs containing this declaration must require `templateApi: 7`.
Omitting `input`, or setting `kind` to `video`, preserves existing inputs.
Input kind survives library summaries, template copies and shared JSON files.

PDF preparation uses macOS PDFKit, retains an exact local source copy and provides
rendered pages plus normalized text-layer positions to both scene AI stages.
The PDF supplies the narration script. Selects narration generates speech and
character alignment (credits apply); no recorded input is required. A local
page-and-audio carrier adapts it to the existing scene timeline without STT.
This does not register PDF as a new Project resource type. See the Hankook Ilbo pack for the input limits and instructions.

## Template API 5 scene settings

Packs containing scene templates require Template API 5, even when they also
contain API 1/2 layouts. The app continues to read older layout packs. The
[Hankook Ilbo pack](hankook-ilbo) includes Huick Alpha alongside its existing
Knowledge Exchange and Issue Broadcast templates.

Scene templates retain the usual design, caption and prompt settings and add:

- `editorial.mode: "scenes"` and `editorial.execution: "layers"` select the
  planning-AI then production-AI workflow.
- `editorial.instructions` defines the channel's editing criteria and style.
- Optional `editorial.visualGuide.image` references a declared raster asset;
  `description` explains how to interpret it as style evidence rather than
  episode source material.

Keep channel criteria in the template and episode-specific requirements in the
creation brief. Declare the logo and visual guide in the containing pack's assets;
do not include source footage, generated cutouts, evaluation logs or test briefs.
See [Scene templates](../README.md#scene-templates) for runtime requirements and
the boundary between template defaults and AI decisions.

## Updates and local storage

All templates use one repository regardless of whether they arrived by link,
file, or duplication. A template has a stable identity, a baseline snapshot
(last accepted import), and a working snapshot (the complete current settings).
Settings are never merged with a changed baseline during updates.

- Identical incoming content: no-op.
- Newer version and unchanged working copy: replace baseline and working together.
- Local edits, different content at the same version, a downgrade, or a previously
  removed identity: ask to replace, add an independent copy, or cancel.
- Replace/reset: retain the prior baseline and working pointers in recovery history.
- Reset restores the imported baseline; it works for file imports and copies too.
- File exports retain a stable identity. Older identity-free files import as copies.

`template-library/index.json` is the mutable commit point. It references immutable
full-setting records in `template-snapshots`; embedded raster images are stored
once per content hash in `template-assets`. New snapshots are staged before the
index is replaced. Interrupted staging does not activate partial imports. Only
referenced snapshots/assets are read; unrelated history is not loaded for previews.

Existing `packs`, `custom-templates`, `overrides`, and `design-overrides` are read
for compatibility. The first successful mutation records their resolved baseline
and working settings in the unified library; the old files are left untouched.
No new imports or edits are written to those legacy collections.

## Portable JSON files

File export produces a self-contained `.shortform-template.json` containing current
settings and embedded Base64 raster images. Encoding preserves the stored image
bytes; export does not resize or recompress them. Shared files retain template
identity and use the same conflict, baseline, and recovery rules as pack imports.

API 1/2 JSON exports remain supported, including UTF-8 BOMs and identity-free
legacy files. File import/export is limited to 256 MiB (including Base64 image data). ZIP file transfer is no
longer supported. Templates previously imported from ZIP remain in the library
and can be exported as JSON without reinstalling them.

GitHub packs continue to use `pack.json`, template JSON files, and separate image
assets. GitHub links and folder-based pack installation are unchanged.

## Optional background music

A template may add `"music": {"path": "<absolute path or ~/...>"}`. The app adds
that file under every generated clip (see [Background music](../README.md#background-music)).
Only the path is stored: audio files are not part of a pack, so the file has to exist
at that path on each computer. Apps without this field ignore it.

## Settings-based generation

New templates do not need a `renderer` field. All templates use the same Draft
builder and expose the same AI framing, title, caption, logo and label controls.
Background, each title line, logo and enabled labels become separate editable
motion graphics. Existing Drafts are not migrated.

Legacy `series` and `separate-headlines` values are accepted only on input.
The loader converts their implicit behavior into explicit settings and removes
the tag from in-memory templates, duplicates, saved custom templates and shared
files. Checked-in legacy packs remain readable without rewriting user files.
Legacy field differences are resolved only during migration to complete snapshots.
Unknown legacy tags are rejected rather than silently changing a design.

Independent settings include:

- `headline.on`: show/hide titles (default true).
- `headline.fontWeight`, `lineHeight`, `letterSpacing`: typography.
- `headline.gap`: edge-to-edge line spacing; `rowGap` overrides it with fixed
  center-to-center spacing. Set `rowGap` to null to return to content-based spacing.
- `headline.strokeOn`, `strokeColor`, `strokeWidth`, `gradient1`, `gradient2`,
  `shadow`, `shadowCss`: independently composable title decoration.
- `headline.fitWidth`, `fitPadding`, `fitCjk`, `fitSpace`, `fitLatin`,
  `fitWideLatin`, `fitOther`: deterministic text fit metrics. Legacy migration
  records these values to preserve title size without a named renderer preset.
- `background.canvasAligned`: align gradient coordinates to the full canvas
  instead of restarting them inside each background band.
- `captions.cleanSpeechText`: LLM-selected text-only filler, stutter and accidental
  repetition omissions; defaults to true when absent and respects explicit false.
  One validated original word occurrence is hidden per omission. Invalid/ambiguous
  candidates are ignored; an empty list keeps all words. Never trims audio/video.
  The existing `editing.removeFillers` setting independently controls video edits.
- `captions.highlight`, `highlightColor`, `left`, `width`: emphasis and placement
  supported together, regardless of template origin.
- `captions.fontSizing`: `"fixed"` (default when omitted) keeps `fontSize` for
  every caption and lowers characters per line to what fits the width at that
  size, measured with the caption font, so long speech becomes more captions.
  Only a single word wider than the caption still shrinks. `"auto"` keeps
  `lineMax` and shrinks a caption whose longest line is wider than the caption
  area. Portrait templates only.
- `labels.top` / `labels.footer`: optional text; default disabled. Each has its
  own position, typography and on/off setting.
- `layout.reframe` and the existing framing preferences: AI framing can be
  enabled on every template. Migration never enables it implicitly.

Each template contains exactly one design. To create another layout, duplicate
and rename the template; there is no platform selector in creation or editing.
Legacy `variants.tiktok` and `platformLayouts` are accepted only on input. The
repository resolves user overrides, then retains only the former TikTok design
under the original name, ID and file path. It never creates a separate Shorts
template. Existing storage files and generated Drafts remain untouched. Different
designs can be created explicitly by duplicating a template. Legacy platform
choices do not change the design of new or resumed generation. The safety-zone
overlay remains a preview guide.

## Removed compatibility fields and rendering guarantees

Input normalization drops disconnected controls from the base and TikTok variant:
`layout.minShotSeconds`, `layout.closeUpMin`, `layout.splitHalves`, and
`layout.reframeMode`. It also removes the obsolete `framingMode`, `sbsStyle`,
`radioTemplate`, `logoArt`, `demoOverlay`, `headline.style` (after migrating legacy
renderer typography), and `thumbnail.enabled`. Thumbnails are generated manually
from result cards. The existing pack files need not be rewritten to load them;
newly saved custom templates and shared files omit these values.

`layout.cameraMode` is retained: its camera-preservation and split restrictions
still have live consumers. It is not an unused compatibility field.

Footer text, including automatically populated episode dates, carries its
configured gradient, stroke, shadow, position, size, weight and title font into
the separately editable footer graphic. Setting a label's `shadow` explicitly to
false suppresses even a saved `shadowCss`. Boxed titles retain their gradient and
other typography. `headline.strokeOn: false` or `strokeWidth: 0` renders no outline;
there is no implicit colored-stroke fallback. Caption `left` is honored even when
`width` is omitted, and a left position of zero remains zero.

Regression coverage includes normalization and share/import round trips, emitted
graphic parameters and rendered markup. Actual Selects frame comparisons verify
boxed-title and footer gradients together. These checks validate setting delivery
and rendering; AI editorial preferences still require judgment by the agent.

New packs and shared files require template API 2, so API 1 apps reject them
before installation. API 2 apps also accept API 1 packs and shared files; existing
installed templates need no reinstall. Template JSON schemaVersion remains 1.

## Current storage limits

Mutations are serialized within one panel instance. The catalog write is atomic,
but it is not a cross-window compare-and-swap: simultaneous saves from separate
panels can overwrite each other. Use one editing panel until host-level locking
is implemented. Conflict confirmation checks detect edits made before retry,
not concurrent writes after that check.

Recovery history and staged immutable records are retained without automatic
pruning. Images are deduplicated, but storage can still grow. Retention controls
are not part of this change.

## Original image preservation

Backgrounds, design logos, thumbnail logos, and thumbnail references retain their
uploaded PNG/JPEG/WebP bytes, including alpha and metadata. Upload no longer crops,
resizes, or recompresses originals. Each image is limited to 20 MiB, 33,000,000
pixels, and 8,192 pixels on either side. Dimensions are checked before decoding;
invalid or oversized inputs produce an error rather than a silently reduced image.
These limits also apply to template and pack imports. Reference count remains five.

UI previews use disposable downscaled copies. AI reference inputs use separate
bounded derivatives; the saved template and final thumbnail logo use originals.
Clip creation also retains the original background and logo. When settings exceed
the runScript inline budget, the panel writes an ASCII JSON parameter file and the
build script reads it through bounded SDK file reads. It does not compress images
to fit the script argument limit. Older already-compressed saved images cannot be
restored automatically; upload their original files again.

Per-line caption backgrounds can opt into `captions.boxPerLine`. In this mode
`boxPaddingX`, `boxPaddingTop`, `boxPaddingBottom`, `boxLineHeight`,
`letterSpacing` and `shadowCss` control each line. `rowGap` is the desired
baseline distance in pixels; boxes never overlap when their padding is larger
than this distance. Existing templates retain the shared background by default.

`headline.offsetX1` and `headline.offsetX2` are optional horizontal pixel offsets
from the centered title layout (-540 to 540). They default to zero.

For glyph-based backgrounds, set `captions.boxBounds: "ink"` together with
`boxPerLine: true` and `baselineBottom` (0..1920). This measures loaded font
ink bounds rather than CSS line boxes; `rowGap` sets fixed baseline spacing.
Padding may overlap if it exceeds that spacing. Long lines fit measured width.

`headline.shadowSpec` and `captions.shadowSpec` optionally specify `color`
(hex RGB), `opacity` (0..1), `angle` (0..360; clockwise from up), `distance`,
`size`, and `blur` in output pixels. The SVG shadow applies dilation radius
`size / 2` and Gaussian sigma `blur / 6`; this is an approximate Premiere
conversion. Existing templates keep their CSS shadows without this object.
