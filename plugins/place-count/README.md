# Place Count

Turn a folder of trip footage into an editable, numbered travel-story reel.

**Experimental.** Tested with a compatible Selects development build on macOS. Released-version, Windows, and full live smart-assist coverage across codecs are unverified. See [installation and requirements](INSTALL.md).

## Use

1. Open a Selects project and the **Place Count** panel.
2. Choose **Choose folder** and select your footage. Clips are grouped into places by when and where they were shot; a folder already sorted into subfolders keeps one place per subfolder. A story has 1 to 20 places. Folders are identified by their full paths, so different libraries can use the same folder names.
3. Type the story title and opening subtitle in the panel. Each place's name and description can be edited in place, its checkbox includes or leaves it out, and **Clips and timing** shows its clips. The **Story settings** button beside the folder name controls portrait or landscape format, pace, opening title, accent color, music, and original clip audio.
4. Choose **Analyze footage**. It names the trip, then looks at each place's contact images to name it, write a short note, and pick its clips. It does not browse the web or start source analysis. Review and edit the results; **Re-analyze** runs it again without overwriting a name or description you typed. If a place cannot be analyzed, its current clips are kept with a notice, and **Retry failed** analyzes only those places again.
5. Choose **Create draft**. This builds the Draft from what you reviewed and makes no AI requests. The Draft is named after the trip, such as "Los Angeles"; later versions become "Los Angeles (1)", "Los Angeles (2)", and so on.
6. Choose **Open draft** and edit it in Selects. **Make another version** keeps your places and settings for a new Draft; the home button returns to folder selection. If a build is interrupted, **Recover draft** looks for the existing Draft before continuing.

There is no mandatory review screen. The output is an editable Selects Draft: original source clips, text graphics, and optional user-selected music remain separate. The plugin does not flatten footage into one rendered clip. Export finished video separately through **Handoff → Export**.

## Look and feel

A numbered travel-list reel: yellow Times place titles as "1. Name", a short white note beneath, centred in the upper third with a soft shadow and no backing panel, and a curved "N Places to Visit" opening over the city and country. Values are measured from the reference reel and kept in `design.json`. Notes aim for one line: 6 words and 42 characters. Timing follows the theme music at 92 BPM: the opening and each Quick-pace place last one bar (2.6 seconds), Balanced places 6 beats (3.9 seconds) and Unhurried places 7 beats (4.6 seconds), and the cuts inside a place fall on beats. An opening is omitted if it would require repeating the same source moment.

## Local processing and data

Frame contact images are decoded locally with the host browser and cached per project, then attached to the request; they are not added to your project. Analysis sends those contact sheets, each place's folder label, and the GPS position its clips recorded (when they carry one) to the signed-in Selects AI profile: one request for the trip title and one per place whose selection is not already cached. No separate provider key is required. This is sampled-frame selection, not continuous-motion verification.

Workspaces use project-scoped browser storage. Contact images and recovery data live under `<home>/.selects/plugin-data/place-count/<project-id>`. Keep those files while using recovery. Existing projects, prior plugin data, and source files are not deleted.

## Limits and verification

- Codec preview support follows the host browser. Some media that Selects can edit may not be browser-decodable. Valid current selections can still be used; offline selected sources block creation.
- Every Draft gets the bundled theme music unless you add your own track or clear **Place Count theme music** in Story settings. It is cut to the story's length and faded out over its last 1.5 seconds; see [THIRD_PARTY.md](THIRD_PARTY.md) for its source. Original clip audio is off by default. Short music tracks you supply are not silently looped.
- Asset loading relies on host adapters exposed through `window.parent.__DI__`. They are runtime-checked but are not stable public plugin APIs.
- Native image compatibility and portrait, landscape, opening, and text-motion rendering were checked in non-committed simulations. Planner, source-path collision, alias normalization, recovery, concurrency, and create-flow tests use isolated fixtures or mocked services.
- Full live smart-assist runs, all supported codecs, clean-machine installation, and cross-platform behavior need further QA. These source checks do not prove every output's editorial quality.

Run the portable development tests with Node.js 22 or newer:

```sh
node tests/core.test.cjs
node tests/places.test.cjs
node tests/create.test.cjs
node tests/path-collision.test.cjs
```

See [third-party components](THIRD_PARTY.md). This package contains no source footage, reference media, models, credentials, runtime caches, or installed dependencies.
