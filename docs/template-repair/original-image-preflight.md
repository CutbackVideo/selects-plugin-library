# Original Image availability checkpoint

Consumers: Four Photo Reveal (`no14-still-video` 0.5.2) and Camera Shutter Dump
(`camera-shutter-dump` 0.1.9). This is one input feature, not completion of either
template or the full 28-template repair scope.

## Reproduction and ownership

The old implementation accepted retained Project metadata without reading the
original. A removed photo reached music/sound import or Draft creation. It also
accepted a different Resource at the selected original path. The input feature
must reject these before persistent effects, while preserving valid selections,
native dimensions, ordering and duplicate occurrences.

The initial 24 input regressions failed against the original implementation.
Four Photo Reveal first passed its 12 cases before extraction. Camera Shutter
Dump then passed the same contract using the extracted source. Two additional
tests reproduced loss of the filename in the final user error; the structured
SDK result now retains error code, Resource ID and the safe public message.

`shared/native-image-input.js` is the canonical source. The explicit registry
and generic synchronization tool embed it into the two reviewed consumers.
Existing placement rules and other native Image consumers remain compatible.

## Verification on 2026-10-21

- The three suites added to CI pass 57 tests: input preflight, generic module
  synchronization, and existing native SDK placement consumers.
- The broader photo/reference/platform-script regression run passed 144 tests
  before the final two changed-file-snapshot tests were added. The subsequent
  focused input/module run passed 35 tests, including those cases.
- Real temporary PNG files pass; deletion while metadata remains prevents any
  Project write or Draft creation. Deletion after prepare is checked again before
  native Image placement.
- The generated preflight scripts pass TypeScript against the installed SDK.
  Both panel TSX files transform successfully with no esbuild warnings.
- Python discovery ran 291 tests: 285 passed, 6 skipped.
- Public-source, package-file, template-gallery, module-copy and diff checks pass.

## Remaining evidence and limits

One-byte reads verify availability, not complete image decoding or content
identity. Repeated stat observations do not lock the file against later changes.
No new mutation retries or saved-Draft cleanup policy are introduced.

An installed-app run, independent saved-result readback, complete audio/video
playback, export and execution on Windows remain unverified. Simulated Windows
and UNC path tests are not Windows execution. Unsupported file APIs fail before
mutation, rather than bypassing the source check. Keep the full repair goal active.
