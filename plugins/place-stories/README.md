# Place Stories

Turn location folders into a photo-first, editable travel story.

**Experimental.** Tested with a compatible Selects development build on macOS. Released-version, Windows, and full live smart-assist coverage across codecs are unverified. See [installation and requirements](INSTALL.md).

## Use

1. Open a Selects project and the **Place Stories** panel.
2. Choose **Choose footage** and select a parent folder with one subfolder per place. Up to 20 places and 24 video files per place are supported. Folders are identified by their full paths, so different libraries can use the same folder names.
3. Optionally edit your title, place names, or short descriptions through **Edit details**. **Story settings** controls portrait or landscape format, pace, opening title, accent color, optional music, and original clip audio.
4. Choose **Create draft**. Smart assist selects footage and writes concise English descriptions grounded in the contact images. It does not browse the web or start source analysis. If assist cannot finish a place, valid current selections are retained with a notice; unavailable descriptions stay empty.
5. Open the saved Draft and edit it in Selects. Use **More → New story**, **Duplicate story**, or **Recent stories** for another version. Use **Recover draft** after an interrupted build; recovery looks for the existing Draft before continuing.

There is no mandatory review screen. The output is an editable Selects Draft: original source clips, text graphics, and optional user-selected music remain separate. The plugin does not flatten footage into one rendered clip. Export finished video separately through **Handoff → Export**.

## Look and feel

Warm ivory typography, restrained serif titles, concise descriptions, a fine accent rule, generous margins, and a short fade with a subtle lift. Descriptions are limited to 14 words and 110 characters. Balanced pace gives each place roughly 3.5 seconds; Quick and Unhurried alternatives are available. An opening is omitted if it would require repeating the same source moment.

## Local processing and data

Frame contact images are decoded locally with the host browser and cached per project. Smart assist sends the chosen location's label and contact images to the signed-in Selects AI profile, with at most two requests per panel instance. No separate provider key is required. This is sampled-frame selection, not continuous-motion verification.

Workspaces use project-scoped browser storage. Contact images, recovery data, and history live under `<home>/.selects/plugin-data/place-stories/<project-id>`. Keep those files while using recovery or history. Existing projects, prior plugin data, and source files are not deleted. An optional **Import previous footage selection** action imports only an older workspace's location and clip selections.

## Limits and verification

- Codec preview support follows the host browser. Some media that Selects can edit may not be browser-decodable. Valid current selections can still be used; offline selected sources block creation.
- Original clip audio is off by default. Supply your own music or enable original audio. Short music tracks are not silently looped.
- Asset loading relies on host adapters exposed through `window.parent.__DI__`. They are runtime-checked but are not stable public plugin APIs.
- Native image compatibility and portrait, landscape, opening, and text-motion rendering were checked in non-committed simulations. Planner, source-path collision, alias normalization, recovery, concurrency, and create-flow tests use isolated fixtures or mocked services.
- Full live smart-assist runs, all supported codecs, clean-machine installation, and cross-platform behavior need further QA. These source checks do not prove every output's editorial quality.

Run the portable development tests with Node.js 22 or newer:

```sh
node tests/core.test.cjs
node tests/create.test.cjs
node tests/path-collision.test.cjs
```

See [third-party components](THIRD_PARTY.md). This package contains no source footage, reference media, models, credentials, runtime caches, or installed dependencies.
