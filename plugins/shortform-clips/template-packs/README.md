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
| `renderer` | `separate-headlines` for independent background/headline/logo graphics; `series` for a series frame with labels and optional speaker framing |
| `layout` | Video window, source crop, headline/logo positions, optional speaker framing |
| `background`, `border`, `headline`, `logo` | Design settings; `image` values reference declared `assets/` files |
| `captions` | Caption mode, position, typeface, size and emphasis |
| `editing` | Filler and silence handling |
| `detect` | Keywords, exclusions and program description |
| `prompt` | Role, format, good/bad clips, length/count guidance, rules and headlines |
| `variants.tiktok` (optional) | Design overrides for the TikTok layout; base is the Shorts layout |
| `labels` (optional) | Top/footer labels; footer can derive an episode date |
| `framingMode` (optional) | Fixed single-speaker crop note |

For a `series` template with `layout.reframe` enabled, `layout.edgeMin` optionally
sets the minimum close-up width at the source edge in face widths (positive,
maximum 20). It defaults to `closeUpMin`. News Direct uses 3.6 to avoid an overly
tight crop of the outermost panellist. Money Lab retains its split-screen rules;
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
