# Preserve the rejected source's reason

Actual SDK reproduction with a deliberately absent Resource ID reached the canonical resolver's diagnostic failure list. Mini Vlog nevertheless replaced that known reason with the generic `Selects could not complete this step.` message. This hid whether the source was absent, incompatible or inaccessible.

When every chosen source fails, the template now uses the first available bounded SDK reason in its existing person-facing error, retaining the diagnostic code and complete failure list. Missing details still use the existing localized fallback. Valid selections and partial-success handling are unchanged; no shared resolver or SDK code changes are required.

Validation:
- The panel regression fails against the previous source and passes after the change for absent-resource, incompatible-settings and permission failures, generic fallback, and valid-source continuation. Existing panel/i18n checks pass.
- The same actual absent UUID through the entire production template entry now reports `Resource ... is not part of project ...` rather than the generic error.
- A healthy whole production run with eight labelled 29.97-fps replacement sources was repeated after the change through real inventory, local shot scoring, full original-file identity verification, music preparation, assembly, styling, canonical save and independent readback: Draft `280fe5bf-60e3-4c67-a475-460c684c18e3`, 337 frames at 23.976 fps, 1920×1080. Native export is validated separately in the runtime receipt.

Evidence is retained in the local analysis workspace under `repro-20261023/reported-cases/round3/vlog/mini-*-after*`. The preceding healthy run's native export also fully decoded without errors. Installed-gallery interactions and perceived output quality are separate checks.
