# Web platform admission audit

This migration reviews all 50 current packages. `platforms` is the client's
installation decision, not automatic inference from a panel's source code.
Only `short-form-safe-zones` is admitted to web in this change. The other 49
retain the existing macOS/Windows declarations. That does **not** assert that
all 49 are inherently impossible in a browser.

- **Blocked**: a declared native dependency or required unavailable host path is identified.
- **Native operation present**: a concrete native operation exists; this alone does not prove every alternative workflow is impossible.
- **Pending**: no conclusive admission yet. Missing browser validation must not be described as a proven platform limitation.
- **Web admitted**: main editing logic has browser execution evidence, with scope below.

Do not automatically enable web merely because a package has no `runtime` or
`runShell`. The shared local-client facade also contains real browser-capable
files/media APIs; its name or an FFmpeg reference alone is not a blocker.
Service credentials, source media, CORS, specific media arguments and optional
features still matter. Manifest metadata cannot guarantee those runtime conditions.

## Per-package decision

| Plugin | Decision | Evidence / outstanding verification |
| --- | --- | --- |
| `a16z-style-captions` | Blocked | [plugin.json](../plugins/a16z-style-captions/plugin.json): Required dependency selects-ai-runtime declares a native runtime; the installation closure cannot run in web. |
| `ali-abdaal-style` | Pending | [panel.tsx](../plugins/ali-abdaal-style/panel.tsx#L203): Browser panel compilation and six portrait-geometry tests pass. Transcript analysis, model response, and the complete edit/commit flow still need browser verification. |
| `archive-vlog` | Pending | [panel.tsx](../plugins/archive-vlog/panel.tsx#L3698): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `camera-shutter-dump` | Pending | [panel.tsx](../plugins/camera-shutter-dump/panel.tsx#L1792): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `card-news-maker` | Native operation present | [panel.tsx](../plugins/card-news-maker/panel.tsx#L3026): Shell execution is used by the panel; browser substitutes and the complete card-generation path are not verified. |
| `chris-williamson-style` | Blocked | [plugin.json](../plugins/chris-williamson-style/plugin.json): Required dependency selects-ai-runtime declares a native runtime; the installation closure cannot run in web. |
| `cinema-vlog-studio` | Pending | [panel.tsx](../plugins/cinema-vlog-studio/panel.tsx#L194): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `city-weekend-vlog` | Pending | [panel.tsx](../plugins/city-weekend-vlog/panel.tsx#L1984): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `cutout-beat-gallery` | Blocked | [plugin.json](../plugins/cutout-beat-gallery/plugin.json): Required dependency selects-ai-runtime declares a native runtime; the installation closure cannot run in web. |
| `daily-vlog-8` | Pending | [panel.tsx](../plugins/daily-vlog-8/panel.tsx#L583): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `depth-type-captions` | Blocked | [plugin.json](../plugins/depth-type-captions/plugin.json): Required dependency selects-ai-runtime declares a native runtime; the installation closure cannot run in web. |
| `doac-style` | Blocked | [panel.tsx](../plugins/doac-style/panel.tsx#L157): The caption workflow invokes a bundled Python runtime through the shell. |
| `eo-shorts` | Blocked | [plugin.json](../plugins/eo-shorts/plugin.json): Required dependency selects-ai-runtime declares a native runtime; the installation closure cannot run in web. |
| `epidemic-sound-search` | Blocked | [panel.tsx](../plugins/epidemic-sound-search/panel.tsx#L1020): Provider workflow uses shell/Python and desktop browser control. |
| `fast-switching-stopmotion` | Pending | [panel.tsx](../plugins/fast-switching-stopmotion/panel.tsx#L283): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `four-photo-stop-motion` | Pending | [panel.tsx](../plugins/four-photo-stop-motion/panel.tsx#L2070): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `gongju-gallery` | Pending | [panel.tsx](../plugins/gongju-gallery/panel.tsx#L158): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `imessage-generator` | Native operation present | [panel.tsx](../plugins/imessage-generator/panel.tsx#L234): Local Kokoro setup and speech use Python/shell. Alternative cloud or silent paths have not been certified for web. |
| `jared-vox-editorial` | Pending | [panel.tsx](../plugins/jared-vox-editorial/panel.tsx#L327): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `jude-kinetic-style` | Blocked | [plugin.json](../plugins/jude-kinetic-style/plugin.json): Required dependency selects-ai-runtime declares a native runtime; the installation closure cannot run in web. |
| `medical-explainer` | Pending | [panel.tsx](../plugins/medical-explainer/panel.tsx#L568): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `mini-vlog` | Pending | [panel.tsx](../plugins/mini-vlog/panel.tsx#L2994): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `multicam-generator` | Pending | [panel.tsx](../plugins/multicam-generator/panel.tsx#L578): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `music` | Blocked | [panel.tsx](../plugins/music/panel.tsx#L10): EpidemicSound and Artlist providers are unimplemented web adapters in the client. |
| `news-minute` | Pending | [panel.tsx](../plugins/news-minute/panel.tsx#L444): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `no14-still-video` | Pending | [panel.tsx](../plugins/no14-still-video/panel.tsx#L1814): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `photo-gallery-no2` | Native operation present | [panel.tsx](../plugins/photo-gallery-no2/panel.tsx#L494): Uses selects.ai without declaring selects-ai-runtime. Browser workers have no native AI host; review dependency declaration before enabling web. |
| `place-count` | Pending | [panel.tsx](../plugins/place-count/panel.tsx#L919): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `podcast-hook-captions` | Blocked | [plugin.json](../plugins/podcast-hook-captions/plugin.json): Required dependency selects-ai-runtime declares a native runtime; the installation closure cannot run in web. |
| `polaroid-photo-dump` | Pending | [panel.tsx](../plugins/polaroid-photo-dump/panel.tsx#L1344): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `portrait-beat-montage` | Blocked | [plugin.json](../plugins/portrait-beat-montage/plugin.json): Required dependency selects-ai-runtime declares a native runtime; the installation closure cannot run in web. |
| `postcard-cutout-studio` | Native operation present | [panel.tsx](../plugins/postcard-cutout-studio/panel.tsx#L216): Bundled runtime invokes shell for cutout processing. A complete browser alternative has not been verified. |
| `recap-2026` | Native operation present | [panel.tsx](../plugins/recap-2026/panel.tsx#L686): Uses selects.ai without declaring selects-ai-runtime. Browser workers have no native AI host; review dependency declaration before enabling web. |
| `selects-ai-runtime` | Blocked | [plugin.json](../plugins/selects-ai-runtime/plugin.json): Declares runtime.json, a native runtime requiring a desktop host. |
| `selfie-aesthetic` | Pending | [panel.tsx](../plugins/selfie-aesthetic/panel.tsx#L2231): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `short-form-safe-zones` | Web admitted | [panel.tsx](../plugins/short-form-safe-zones/panel.tsx#L102): Browser worker compiles the panel. Read/add/update/remove pass against the real editing SDK and motion-graphic validator in Chromium. |
| `shortform-clips` | Blocked | [plugin.json](../plugins/shortform-clips/plugin.json): Required dependency selects-ai-runtime declares a native runtime; the installation closure cannot run in web. |
| `shortform-cloner` | Native operation present | [panel.tsx](../plugins/shortform-cloner/panel.tsx#L237): Panel invokes shell; URL ingestion and full reconstruction need a browser implementation/verification. |
| `six-clip-velocity` | Pending | [panel.tsx](../plugins/six-clip-velocity/panel.tsx#L319): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `summer-trip` | Pending | [panel.tsx](../plugins/summer-trip/panel.tsx#L3123): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `tang-poetry-explainer` | Pending | [panel.tsx](../plugins/tang-poetry-explainer/panel.tsx#L327): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `tetris` | Pending / partial | [panel.tsx](../plugins/tetris/panel.tsx#L57): Single-player looks browser-compatible; multiplayer uses a Python/MQTT shell relay. Neither complete browser interaction nor desktop-operation guidance is verified. |
| `thank-you-recap` | Pending | [panel.tsx](../plugins/thank-you-recap/panel.tsx#L387): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `the-end-credits` | Pending | [panel.tsx](../plugins/the-end-credits/panel.tsx#L1986): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `timeline-shorts-builder` | Pending | [panel.tsx](../plugins/timeline-shorts-builder/panel.tsx#L32): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `torn-paper-love` | Pending | [panel.tsx](../plugins/torn-paper-love/panel.tsx#L3008): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `travel-beat-vlog` | Blocked | [plugin.json](../plugins/travel-beat-vlog/plugin.json): Required dependency selects-ai-runtime declares a native runtime; the installation closure cannot run in web. |
| `vlog-edit` | Native operation present | [SKILL.md](../plugins/vlog-edit/SKILL.md): Skill instructions require a local contact-sheet HTTP server. A browser-only instruction path has not been verified. |
| `vlog-opening` | Pending | [panel.tsx](../plugins/vlog-opening/panel.tsx#L1776): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |
| `vox-explainer` | Pending | [panel.tsx](../plugins/vox-explainer/panel.tsx#L328): Uses the media/files SDK. Browser implementations exist, but this plugin's actual FFmpeg arguments, assets/network access, and full edit/commit workflow have not been verified. |

## Reproduce the admitted workflow

From this repository, with a dependency-installed client checkout containing the
companion platform PR and the client's Playwright Chromium browser installed:

```sh
python3 tools/test_web_platforms.py --client /path/to/cutback-client
python3 -m unittest discover -s tests -p 'test_plugin_files.py'
python3 tools/plugin_files.py check
```

The browser harness compiles Safe Zones and Ali Abdaal using the real browser
compiler worker. It runs Safe Zones read/add/update/remove scripts with the real
shared editing SDK, real domain sequence objects, and the real motion-graphic
validator in Chromium. Persistence is an isolated in-memory draft gateway; no
user project or account is touched. This is not a full signed-in UI test, an
export/pixel comparison, or proof of Ali Abdaal's model/transcription workflow.
Ali Abdaal therefore remains pending despite successful compilation.

The publication check rejects missing/invalid platform arrays, web packages with
native runtimes, and web packages whose declared dependencies do not support web.
Running it over all packages checks dependency consistency transitively. The
client independently traverses the pinned dependency closure before installation.
Undeclared dependencies and arbitrary behavior inside plugin code cannot be
inferred by the manifest validator; source review and browser verification remain
required before adding web. Revisit this table when those workflows are tested.
