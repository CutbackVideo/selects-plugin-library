# Reported template cases: actual verification status - 2026-10-23

This report combines the preserved original case inventory with actual runtime, UI and output evidence. Original inputs and existing work remain preserved. Chan remains excluded. LLM evidence uses the Claude subscription only; no hosted LLM fallback was substituted.

**Report-specific closures: 8/53. Full-style acceptance: 0.** The scoped closures are C-08, C-12, C-28, C-39, C-43, C-50, C-51 and C-52, limited to their stated reported behavior. They do not close the remaining quality or installation issues of those templates.

Actual runtime/UI/output evidence covers **49 cases, including the 7 failures**. The case categories are mutually exclusive: **42 tested with remaining gates, 7 current reported failures, 4 unverified**. T means relevant actual test evidence exists, with remaining gates stated; it is not a pass for every stage. F means the reported undesirable UI/output is still observed, including unresolved quality/design behavior. U means the key reported behavior remains unverified. Separate QA preparation, readiness and additional quality failures are not relabeled as reproductions of the original report.

Export, whole-file decoding, playback transport and observed playback pixels are separate. Jude retry reached the end in the actual Driver, but that retry did not verify video pixels. Earlier cold playback failures remain preserved. C18/C25 face-placement prototypes failed acceptance and are not included in the accepted fixes.

C46 now has a fresh actual Gallery success and one saved Draft with readback. Its earlier failures had separate confirmed QA causes: missing canonical assets, then an existing request key whose resolved source path changed after the evidence-volume move. Neither was the original 60-second timeout. The initial export was canceled during volume detachment. After read-only filesystem verification and recovery, the same saved Draft exports successfully: 904 frames, 1080 x 1920, 30.163467 seconds; complete video/audio decoding passes. This Draft still failed Preview readiness.

C39 passes actual preview/poster transport after the minimal UTF-8 app fix; the preview is an explicit QA placeholder. C53 passes the actual Korean chat trigger; English remains unverified. C50 actual Depth restored-render playback, Place Count contact-sheet/shot display, and Recap local-example playback pass. SDK contracts remain unchanged. The separate minimal app PR #7742 explicitly reads local manifest text as UTF-8; no IPC/native/version change is required.

| Case | Area | Category | Latest conclusion | Remaining gate | Report closed |
|---|---|---|---|---|---|
| C-01 | Host progress | F | Live UI shows only a generic spinner and Stop. | Current phase, last activity and stall information remain missing. | No |
| C-02 | Target identity | U | Static/context checks exist; the reported focus confusion is not fully exercised. | Actual Project/Draft A/B focus changes and visible target identity. | No |
| C-03 | Apps / Gallery entry | U | Both entry points have not been compared as one actual workflow. | Verify their input, target and result differences. | No |
| C-04 | Result discovery | T | Ali/DOAC saved IDs and exports are real. | Success notice to list/open/playback discovery remains separate. | No |
| C-05 | Daily Auto select | T | Actual UI selected Opening 1 + Clips 7 and created a new Draft. | All shortage/sufficient cases; installed-output playback/export. | No |
| C-06 | Cancel Auto select | T | Actual Cancel snapshot has no selection and Apply disabled. | Prove late analysis responses cannot repopulate selection. | No |
| C-07 | Disabled Apply | T | Actual Recap shows requirements and enables Apply for sufficient inputs. | Separate shortage, short duration and unanalyzed explanations. | No |
| C-08 | Gallery inventory | T | Actual resource event refreshes 8 to 9 photos, preserving settings and allowing the new photo. | Closed for inventory refresh only; C33 remains open. | Yes |
| C-09 | Vlog error reporting | T | Controlled diagnostics and actual missing-resource before/after preserve the real cause. | Whole-path OS permission/settings failures remain unverified. | No |
| C-10 | City generation | T | Matching overlay failure reproduced; explicit 1x fixes full save/readback/export. | Installed-entry and final foreground playback acceptance. | No |
| C-11 | Travel reorder | T | Five distinct production orders save/export after the overlay fix. | Actual reorder UI; latest full-output playback and editorial repeats. | No |
| C-12 | Gongju length | T | Missing tree duration reproduced; 15-shot save, real-picture playback and full export pass. | Closed for the length decision; C35 style/timing remains separate. | Yes |
| C-13 | Summer ordering | T | Current output follows scene/role selection; source follow-up classifies this as a feature request. | Ordering policy is a product decision, not a completed bug fix. | No |
| C-14 | No14 output | T | Missing originals reject before save; healthy real-photo save/export succeeds. | Earlier playback pass and newer readiness failures remain run-specific. | No |
| C-15 | Opening orientation | T | Actual old-reader baseline is portrait; revised Whip/Motion save/export landscape. | Installed UI, reference edit quality and full playback remain separate. | No |
| C-16 | Daily reuse / font | T | Spare-source duplication fixed and real 7/8/9 cases save/export. | Intended seven-input reuse retained; exact sample title font unverified. | No |
| C-17 | Repeated footage | T | Actual source IDs/ranges quantify reuse across Travel, Mini, Archive, City and Torn. | Sufficient-source comparisons and editorial naturalness remain open. | No |
| C-18 | Jude face overlap | F | Actual mouth overlap remains in 3 stacks after the held placement prototype. | Prototype fails acceptance; no full-motion safety claim. | No |
| C-19 | Jude cold stall | T | Substitute full pipelines pass faces, matte and save; PNG fixes a separate encoder failure. | Original 26-face jobs with no matte submission is not reproduced. | No |
| C-20 | Chris contrast | T | Same real failing frames show an opposite-color phrase outline; full export/decode pass. | Brief gray introduction and whole-motion readability remain limited. | No |
| C-21 | Chris silent warning | T | Real warnings display fully; both Done and Close preserve the saved ID. | Original transient/persistent search failures and retry remain separate. | No |
| C-22 | DOAC lower anchor | T | All 16 saved animated blocks end at 740; matched A/B, PNG and MP4 pass. | Whole playback remains open; entering-word motion is intentionally retained. | No |
| C-23 | Caption portrait | T | Ali, Depth and DOAC save/render/export portrait without the old bars. | Center cropping can lose edge faces; framing acceptance remains separate. | No |
| C-24 | Unknown host version | U | The unknown-version fail-closed policy remains unchanged. | Supported, unsupported and unknown runtime decisions need explicit verification. | No |
| C-25 | Depth face overlap | F | 721/721 face observations pass, but 6 deferred phrases become hidden behind the person. | Held prototype fails semantic acceptance and is not integrated. | No |
| C-26 | Ali text effects | T | Same actual-plan portrait comparison separates headline, chips and body more clearly. | Long/short text combinations, crop and dark heading contrast remain open. | No |
| C-27 | Chris search / relevance | F | Actual full search exceeded the 20-minute observation window before completing. | Latency and contextual suitability of literal B-roll remain unresolved. | No |
| C-28 | Shared AI read retry | T | One controlled transport fault recovers the same real inference job without duplicate submit. | Closed for the transient-read contract, not full-style quality. | Yes |
| C-29 | Summer labels | T | Default after-grid text and retained manual values appear in real saved/exported output. | Manual UI change path and automatic seasonal design acceptance remain open. | No |
| C-30 | Thank You opening | T | Timeline/title/music are aligned to the reference start; export correlation confirms it. | Latest full foreground playback remains unresolved. | No |
| C-31 | Cinema geometry | T | Portrait image size corrected; landscape regression pixels match exactly. | Foreground playback and inset/fullscreen preference remain separate. | No |
| C-32 | Stop Motion pause | F | Actual export reproduces the same pause as the reference. | The reported awkward pause remains; no redesign was applied. | No |
| C-33 | Gallery face / music | F | Default crop loses an edge face; manual focus is only a workaround. | Default framing and music preference remain unresolved. | No |
| C-34 | Recap face / music | F | The 239-placement full output reproduces edge-person cropping. | Crop/music quality remains open; the broader redesign PR is preserved. | No |
| C-35 | Gongju timing / look | T | Actual music matches the bundled source from time zero. | Precise piano onset, added camera motion and aesthetic judgment remain open. | No |
| C-36 | Archive title center | T | The final title hold is rendered; the existing anchor is horizontally centered and slightly high. | Measure actual glyph bounds and decide optical centering. | No |
| C-37 | Daily sound effects | T | Actual assets and schedules match the current reference; alignment metrics pass. | Historical asset differences and full audiovisual listening remain open. | No |
| C-38 | Travel hero cutout | T | Fresh actual RVM full runs and exported subject masks succeed. | Original failed image and failure-to-retry recovery are not reproduced. | No |
| C-39 | Local preview/poster | T | Actual Gallery shows chat registration with local preview/poster after the UTF-8 fix; video is an explicit QA placeholder. | Output fidelity and publishing are separate. | Yes |
| C-40 | First-source FPS | T | Current mixed-FPS full pipelines save/export; extra current range errors were fixed separately. | Original old-binary failure and every mixed-FPS combination remain unverified. | No |
| C-41 | Installed updates | U | Automated checks and an isolated installer do not prove all old packages update in the app. | Old install to new catalog plus dependency/runtime propagation. | No |
| C-42 | Cold AI probe | T | Whole 307.4-second cold and repeated jobs complete; both report no timeline-cache hit. | Do not claim warm-cache speedup or original timeout reproduction. | No |
| C-43 | Depth host version | T | Real supported-host UI reads the SDK version and enables Behind speaker. | Closed for this host path; unknown-version and face-quality cases remain separate. | Yes |
| C-44 | Depth still export | T | Behind-person layers appear in actual PNG and MP4, with full decode success. | Actual in-app preview pixels remain a separate gate; original failure was still-only. | No |
| C-45 | Mini ending audio | T | Real export has a tail and fades close to silence. | Full listening and historical same-track before/after remain open. | No |
| C-46 | Jude cutting timeout | T | Actual Gallery cutting/style succeeds, saves exactly one Draft, survives restart, exports and fully decodes 904 frames. | Original60s timeout not reproduced; this Draft live Preview readiness failed. | No |
| C-47 | Travel old runtime | T | Current full pipelines avoid obsolete Runtime calls; the historical reporter confirmed an update helped. | This run did not exercise old-install to catalog-update propagation. | No |
| C-48 | SDK migration family | T | All six current consumers have save/export evidence, including fresh Postcard and actual PlaceCount UI creation. | Historical signatures remain separate; PlaceCount crop fails quality and full playback is incomplete. | No |
| C-49 | Portrait RVM / Travel / DOAC | T | Real Portrait masks15/15 and transitions15/15 pass; renderer reaches2/17 before V8 heap exhaustion. Other consumer evidence is separate. | Portrait save/export/composite remain unverified; old cwd error is not the new cause. | No |
| C-50 | Local media CSP | T | Actual Panel frames display/play Depth restored render, Place Count sheets/shot preview and Recap local example. | Closed for these display paths; semantic output quality remains separate. | Yes |
| C-51 | Explore View all | T | Actual click opens the full 36-card list from the 10-card shelf. | Closed for the current UI; old-binary propagation is separate. | Yes |
| C-52 | Empty timeline generation | T | Actual Gallery Daily and fresh Jude start without an open Draft, save and auto-open the new result. | Closed for the open-timeline prerequisite only. | Yes |
| C-53 | Chat registration | T | Actual Korean Claude-subscription chat registers the local template successfully. | English trigger is unverified; preview remains a QA placeholder. | No |

Evidence index: recovered all-53 verdict checkpoint (53 cases; caption 17 rows, photo 12 cases, vlog 15 cases / 29 subclaims, plus 11 root-owned cases; overlaps are merged by case ID). The final owner must merge newer receipts before publication.

CI follow-up corrects three stale test fixtures: real Depth portrait setup is loaded before observation/retry assertions, and the complete generated local-client module is extracted. Product/SDK source is unchanged by these CI fixes. The local workflow packet runs204 commands:203 pass and one is blocked by a missing local FFmpeg rubberband filter; explicit conditional skips remain skips. Remote final-head CI is recorded separately.

The validation volume was temporarily detached. Reattaching read-only and a complete filesystem check passed; a948-file,7.90GB image copy was verified byte-for-byte before read-write recovery. Completed CI worktrees/dependencies/scratch have been cleaned; final results, saved-project media and existing work remain preserved.

Earlier details remain in [the prior evidence checkpoint](reported-case-validation-prior-checkpoint.md). Implementation references: [SDK-free compatibility](sdk-free-compatibility.md), [common Worker ownership](analysis-worker.md), [caption evidence](../reported-caption-round3.md). Private stage-by-stage receipts and original sources are retained in the owned case matrix.
