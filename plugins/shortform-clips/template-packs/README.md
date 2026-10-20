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

Branch and tag links resolve to one commit before downloading. Links with branch
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

## Portable ZIP files and legacy JSON

File export now produces `.shortform-template.zip`. The archive contains
`template.json` and content-addressed PNG/JPEG/WebP files under `assets/`.
Settings reference images with `{ "$asset": "assets/<sha256>.<extension>" }`;
identical images used by backgrounds, logos, and thumbnail references are included
once. Export preserves original image bytes and current settings without resizing
or recompressing images. Entries are stored without additional compression because
the supported raster formats already compress their payloads.

File import detects ZIP versus JSON from the contents, not the extension. Existing
API 1/2 JSON exports remain supported, including identity-free legacy files. ZIP
and JSON use the same identity, conflict, baseline, and recovery rules. Older app
versions cannot import the new ZIP format; recipients need the updated app.

ZIP transfer is limited to 100 MiB, with 100 MiB total expanded content, 128 entries,
20 MiB per image, and 4 MiB for settings JSON. Existing thumbnail reference count
and editor limits are unchanged. Legacy JSON retains its 20 MiB limit. ZIP imports
support stored and Deflate entries, validate checksums and asset hashes, and reject
unsafe/duplicate paths, symlinks, missing assets, unknown files, and oversized
expansion before changing template storage. Nothing is extracted to arbitrary disk
paths. Multi-volume, encrypted, and ZIP64 archives are unsupported.

The existing cross-platform binary file APIs are sufficient; no client change is
required. Deflate imports use the browser's `DecompressionStream`. Chunked host
transfers still affect large-file performance. GitHub pack links and folder-based
`pack.json` installation are unchanged; portable ZIPs contain one template.

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
- `captions.cleanSpeechText`: text-only caption omissions; never trims audio.
- `captions.highlight`, `highlightColor`, `left`, `width`: emphasis and placement
  supported together, regardless of template origin.
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
