# Publishing

1. Add or update `plugins/<id>/`. List portable files in `plugin.json`; include concise English usage and setup instructions. Exclude runtimes, models, credentials, personal paths and test data. Follow the [installation layout](#installation-layout); `tools/plugin_files.py check` enforces it.
2. Run `python3 tools/check_public.py`, `python3 tools/plugin_files.py check`, and `python3 -m unittest discover -s tests`.
3. Submit a pull request and merge after checks pass. Share the plugin's folder link.
4. Verify anonymous download from the merged commit with `python3 tools/plugin_files.py download <id> --ref <commit> --destination <new-folder>`.

After a merge to `main`, the **Publish catalog** workflow copies every `plugin.json` at that commit to the catalog the Selects app lists (`tools/publish_catalog.py`); the app reads the library through the Selects API, not GitHub's API. A plugin appears in the app only once that run succeeds. Media and install files are still downloaded from this repository at the listed commit.

Only designated Cutback maintainers publish. Each Git commit preserves a version of the plugin. No separate release or archive is needed.

## Common template module delivery

Install the build-only dependencies once with `npm ci` (Node.js 22 and Python 3).
After changing a registered common module or one of its generator inputs, run:

```sh
npm run templates:prepare
```

This rebuilds the file fingerprint helper, synchronizes the registered module
blocks and standalone files, updates the Gongju/Recap duration helpers and the
seven explicitly scoped private Panel adapters, and rebuilds the Mini, Archive,
Gallery and Chris artifacts. It then checks the completed result. Review and
commit the generated changes with their source changes. Repeated runs produce
the same files. Chan's Shortform plugins and template packs are excluded.

To detect missing synchronization or generation without changing any file:

```sh
npm run templates:check
```

The existing required `validate` CI job runs this read-only gate on every push
and pull request. The catalog publishing workflow runs the same gate before
obtaining AWS credentials or publishing anything. Neither workflow repairs stale
files: a missed build fails and must be committed by the author. The optional
pre-push hook also checks this boundary when enabled.

The pipeline covers the registered common modules and the delivery paths above,
not every generator in this repository. A newly registered build-time consumer
must be added to the pipeline; an unknown builder is rejected. New template
consumers must still be registered in `shared/panel-modules.json`. These checks
prove artifact freshness, not real-app playback or export quality. Existing
behavior tests remain in CI.

CI may set `SELECTS_DEV_REPO` to reuse an existing build dependency directory;
local commands otherwise use this checkout's pinned dependencies. Branch
protection is managed separately in GitHub: keep `validate` required. Existing
administrator bypass permissions are not changed by these workflow files.

## Installation layout

Every plugin installs the same way, so the app and the install agent treat all
plugins alike:

- `panel.tsx`, if the plugin has a Panel, goes to `SELECTS_USER_PANELS_ROOT/<id>/panel.tsx`.
  That folder holds nothing else. Its name is the plugin ID, which is how the app
  recognizes the installation.
- Every other listed file goes beneath `SELECTS_USER_SKILLS_ROOT/<id>`, keeping its
  relative path. A Panel reads its scripts, templates and assets from there
  (`$SELECTS_USER_SKILLS_ROOT/<id>/...` in a shell command). A folder without
  `SKILL.md` is not listed as a Skill.
- Files the plugin creates while running (runs, caches, logs, generated media) go
  beneath `.selects/plugin-data/<id>` in the user's home, never in either install
  folder, so an update never replaces them.

`INSTALL.md` covers only what this layout does not: dependencies, models and
checks. It does not copy files anywhere else.

## Localized library metadata

Keep the top-level `name` and `summary` as the original fallback text.
`plugin.json` may also include a `localized` object keyed by app language code:

```json
"localized": {
  "de": {
    "name": "Beispiel",
    "summary": "Ein Beispiel-Plugin."
  }
}
```

`localized` is optional, and each language entry is optional. When supplied,
an entry is an object with string `name` and `summary` fields. An empty
`localized` object is valid. The app selects the entry matching its language;
if that entry is absent, it uses the top-level `name` and `summary`.
No other metadata fields are localized by this contract.

For public plugins, the authoring agent writes translations directly for
`de en es fr it ja ko pt tr zh`. This is authoring guidance: the manifest
validator does not require translations, an English dictionary, or all ten
languages. There is no CI translation pipeline or translation build step.
Installed app lists and panel tabs read names from `panel.tsx` header comments,
not from the manifest's `localized` entries. To show a Korean installed name,
put a literal Korean title in `// @name:ko` within the first 24 lines.
The public-source checker exempts only that metadata from its Korean-text rule;
all secret and private-path checks still apply. Use Unicode escapes for Korean
strings elsewhere in source files.

## Gallery previews

A plugin may include `preview.mp4` (H.264 MP4, at most 8 MiB),
`poster.webp` (WebP, at most 512 KiB), or both at its root. Review their visible
content before publishing; file-header checks do not review media content.
Use a compact preview, preserve its aspect ratio, and enable MP4 fast start.

Declare them in `plugin.json` under `preview`, for example:

```json
"preview": {
  "video": "preview.mp4",
  "poster": "poster.webp",
  "width": 540,
  "height": 960
}
```

Paths are relative to the plugin folder at the same Git commit as the manifest.
For a still-image preview, omit `video` and declare only `poster`, `width` and
`height`. A video-only preview may omit `poster`. When `preview` is present,
at least one media file and positive integer dimensions are required. The app
shows the video when available, otherwise the poster, otherwise a default icon.
These are gallery assets, not installation files: keep them out of `files`.
A variant (`variants[]`) may declare its own `preview` the same way, named
`preview-<variant id>.mp4` and `poster-<variant id>.webp`; one that declares
none shows the plugin's.
Preview-only changes do not change the plugin runtime version.

## Required plugins

A plugin that runs on another library plugin, such as the shared
`selects-ai-runtime`, lists it in `"requiresPlugins": ["selects-ai-runtime"]`.
When the app installs a template, it installs each required plugin from the
same library commit. Keep the INSTALL.md note too: older apps and installs
outside the template gallery still rely on it.

## Clip highlights templates

A template (`"collection": "visual-highlights"`) must also say so in its
panel's header (`// @collection visual-highlights` within the first 24 lines),
and ship a thumbnail (`preview.poster`, `poster.webp`), a demo video of about
three seconds (`preview.video`, `preview.mp4`) with `preview.width` and
`preview.height`, a `prepare` list of 1-4 short lines, and `usesCredits`.
`tools/check_templates.py` checks these in CI and in the pre-push hook; a
demo far from three seconds is reported as a warning. Enable the hook once per
clone:

```sh
git config core.hooksPath .githooks
```

A template may set `galleryOrder`, a non-negative number: the gallery lists
templates with one first, lower first, then the rest by name. A style in
`variants` may set its own, which overrides its package's, so one package's
styles can sit apart. Apps without support ignore it and list by name.

## Template pack images

Plugins may ship PNG, JPEG or WebP images under
`plugins/<plugin-id>/template-packs/<pack-id>/assets/`. The public-source
checker validates file signatures and allows up to 20 MiB per image.

## Minimum Selects version

A plugin that needs a newer Selects host may declare `"minSelectsVersion": "2.0.730"`
in `plugin.json`. This is an optional strict SemVer version, not a range.
Prerelease and build metadata are accepted; numeric prerelease identifiers cannot
have leading zeroes. Omitting the field imposes no minimum. Declare it only when
the app requires that host version; do not copy the example into every manifest.
The host applies the minimum to installation and update eligibility. Older hosts
may ignore this new metadata, so keep feature guards for any unsupported host APIs.

### Update guards for panel apps

The common host installer asks open apps whether they can be reloaded. Panel apps
use `sdk.updates?.registerGuard` when available; older hosts simply skip the guard.
The shared React hook in `shared/app-update-guard.ts` combines mounted editors into
one guard. Any active operation or unsaved editor can reject a reload, including a
reload caused by updating a dependency such as `selects-ai-runtime`.

When adding an app or new editor, add its live busy/dirty predicate to
`shared/app-update-guard-policies.json` and call `useAppUpdateGuard` from the React
component. Do not call hooks from async job functions. Run
`python3 tools/sync_app_update_guards.py` after editing the shared helper, then
rebuild panels that have source generators. The policy test checks component hook
coverage; application-specific state handling still needs review when an editor
changes. The guard throws a localized message; it never downloads or installs.

The existing Shortform Clips update provider remains in place for compatibility
with the first opt-in host. Removing that provider and its updater is a separate
release after the common host is available. This change does not update template
packs or migrate user data.

## Supported platforms

Every published plugin.json must declare a non-empty `compatibility.platforms` array using only
`web` and `desktop`, without duplicates. Existing plugins start with
`"compatibility": {"platforms": ["desktop"]}`. Add `web` only after running the actual web target, installing the plugin through
the real installer, and directly verifying its core workflows and visible results,
including required dependencies and persistence after reopening. Compilation,
SDK-only tests, and source inspection are supporting evidence, not admission. Desktop support declarations
preserve the existing product support policy; they do not claim new OS testing.

The install button remains available. After a web installation attempt, the client
checks the pinned package and its required dependency closure before placing files.
If any package omits `web` or requires a native runtime, installation fails with a
desktop download prompt. Older manifests without compatibility.platforms are desktop-only.
There is no separate webSupport field or unverified install state.

A web declaration covers the main workflow. Optional desktop-only operations still
report their limitation when invoked. Do not add web based only on an absence of
shell commands; browser SDK, storage, network, and media paths also need verification.

See [the per-package web audit](docs/web-platform-audit.md) for admission evidence
and outstanding browser checks. Publication rejects web/native-runtime and
web/desktop-only-dependency contradictions.

Panels receive the app target as `context.platform` (`"desktop"` or `"web"`).
Use it to select platform-specific actions; it describes the host, not the OS
running a browser, and does not guarantee that an individual operation succeeds.

The top-level `platforms` field is not used and publication rejects it. Existing
compatibility notes remain alongside the canonical platforms list.
