# Consolidated template repair review layout

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
