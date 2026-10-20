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
  "requiresApp": { "id": "shortform-clips", "templateApi": 1 },
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

## Template API 1

Start from one of the four [SBS templates](sbs-radio/templates), replacing customer
content and images. Each template is complete rather than inheriting another
customer's defaults. Required sections:

| Field | Meaning |
| --- | --- |
| `schemaVersion`, `id`, `version`, `names` | API version, stable local ID, positive integer revision, localized names |
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

## Updates

Increase the pack version (major.minor.patch) and changed templates' integer
versions. Existing template IDs must keep their renderer; use a new ID when changing
renderer behavior. Downgrades and incompatible API versions are rejected.

User changes are stored as field differences from the installed template, separately
from the pack. Reset removes those differences and uses the latest defaults.
Copies are full independent templates. Removed templates' overrides remain on disk.
An incompatible saved edit rejects the pack update so the working version remains.

For migration only, an optional `legacy` object declares an old app ID and a mapping
of old template IDs to current IDs. It copies old saved templates on the first pack
install without modifying legacy files. The old app's full snapshots cannot identify
which historical values were deliberate edits, so differences are preserved
conservatively. No customer-specific migration IDs are hardcoded into the app.

## Settings-based generation

New templates do not need a `renderer` field. All templates use the same Draft
builder and expose the same AI framing, title, caption, logo and label controls.
Background, each title line, logo and enabled labels become separate editable
motion graphics. Existing Drafts are not migrated.

Legacy `series` and `separate-headlines` values are accepted only on input.
The loader converts their implicit behavior into explicit settings and removes
the tag from in-memory templates, duplicates, saved custom templates and shared
files. Checked-in legacy packs remain readable without rewriting user files.
Local overrides still merge over pack defaults; their identity and version remain
pack-owned. Unknown legacy tags are rejected rather than silently changing a design.

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
repository resolves user overrides first, then exposes separate templates only
when the two designs differ. The former TikTok design retains the original ID;
the former Shorts design uses the `-shorts` suffix. Identical designs remain one
template. Migrated names can be changed freely. New edits are stored separately
from legacy overrides, so editing, resetting or deleting one design does not
change its sibling. Old job platform selections are used only to resume the
matching independent template. The safety-zone overlay remains a preview guide.

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
