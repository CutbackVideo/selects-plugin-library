# Template repair: one PR per repository

The review surface is now two Draft PRs. This packages existing repairs; it does
not mark the 28-template investigation complete or change its acceptance gates.
Chan's apps and other sessions' PRs remain outside this work.

| Retained PR | Scope | Replaced in this consolidation |
| --- | --- | --- |
| [selects-plugin-library #346](https://github.com/CutbackVideo/selects-plugin-library/pull/346) | Gongju/Recap duration, Place Count authoring, photo-template/Gallery/Mini/Archive repairs and their shared owners | #258, #260, #283, #303, #335 |
| [cutback-client #7876](https://github.com/CutbackVideo/cutback-client/pull/7876) | Read-only Clip source windows, script deadlines, fresh Project/source observations and native render geometry | #7828 |

Plugin #346 targets `main`; app #7876 targets `develop`. These are separate
repositories and require two PRs. App support must ship before dependent template
features can be accepted in an installed app. Neither PR is merged or deployed.

The Photo -> Gallery -> Mini -> Archive commits already form one history.
Gongju/Recap, Place Count and the independent app source-window branch are joined
with merge commits. All eight previous heads remain ancestors of their respective
retained heads. There is no rebase, force push, commit removal or branch deletion.
The only overlapping code resolution is the Windows test host: keep both the
bundled-asset fixture loader and the duration fixture loader.

Original PR bodies, discussions, branches and validation records are retained;
closed descriptions link to the consolidated PR. Separate consolidation workspaces
preserve the original dirty checkout and the in-progress font/readiness work.
That unfinished work is not included in these review heads.

Continue subsequent connected fixes in these two PRs. Explain their review order
inside each description instead of opening more stacked PRs for every small fix.
The historical 60 -> 8 packaging below is superseded by this 8 -> 2 consolidation.

---

# Historical first consolidation

The user's request to reduce similar PRs changes review packaging, not repair
acceptance. Existing commits, remote branches, worktrees, test evidence and closed
PR discussions are preserved. No history is rewritten or merged into a release.
The in-progress Archive preview joins its existing consolidated PR.

## Plugin library: 56 open repair PRs become six

| Retained PR | Review unit | Replaced PRs |
| --- | --- | --- |
| #283 | Photo input/asset/common safety, No14/Camera/Stop Motion/Polaroid complete saves and recovery | #259, #262, #263, #265, #267, #268, #270, #272, #273, #275, #276, #277, #278, #279, #281, #282 |
| #303 | Gallery original sources, verified caches/audio, complete Drafts, SDK/render contracts and resource lifetime | #284, #287, #289, #290, #293, #294, #296, #298, #299, #300, #301, #302 |
| #335 | Mini source/music analysis, shared ownership, execution and saved-run recovery | #304, #305, #306, #309, #310, #311, #313, #314, #317, #319, #320, #321, #322, #328, #330, #331, #332, #333, #334 |
| #346 | Archive two-video/optional-photo inputs, source analysis, Audio preview and saved-run recovery | #341, #342, #345 |
| #258 | Gongju duration validation | Independent existing PR |
| #260 | Place Count capability-based authoring | Independent existing PR |

Review dependency order is `main -> #283 -> #303 -> #335 -> #346`.
Gongju and Place Count retain their independent bases. Every replaced head is an
ancestor of its retained head; the four retained heads contain the complete
54-PR chain. The Archive head additionally advances by the tested preview packet.
Retargeting bases removes redundant stacked review units without cherry-picking,
rebasing or changing any other worktree's branch or files.

## App support: four open companion PRs become two

`cutback-client` #7876 retains #7847 (panel script deadlines) and #7866 (fresh
Project reads/source fingerprints), together with its native effect geometry and
raster-density fix. Both former heads are already ancestors of #7876; its base
becomes `develop`, with no app code change.

The independent read-only Clip source-window API remains #7828: its head is not
an ancestor of #7876. This keeps app consolidation metadata-only and preserves the
existing validated branches. The combined total is 60 open session PRs to eight.

Closed PR bodies retain their original contents and a link to the replacement.
Retained descriptions summarize the full final review unit, link predecessor PRs
and preserve the distinction between local tests, native feature evidence and
installed/playback/export acceptance. Draft status and all outstanding gates stay
in place. Chan and other authors' unrelated PRs remain outside this consolidation.
