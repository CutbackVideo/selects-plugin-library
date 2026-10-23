# Bounded face-result reads

Jude's dense face inference completed, but returning its entire JSON artifact
through `run_script` exceeded the existing result limit. The script returned a
clipped JSON head without `result`, so the panel correctly retained the captions
with an explicit unverified-clearance warning.

`shared/face-result-pages.cjs` reads the existing artifact through the unchanged
public SDK and returns at most 128 complete samples and 64 KiB per page. Each
sample preserves its original index, source PTS, display-pixel `xyxy` boxes and
scores. Unused landmarks are not transported. Empty face arrays are retained.
The reader checks page order, source metadata, totals and the monotonic clock;
one frame too large for the budget fails explicitly instead of truncating it.
Older v1 payloads may omit optional source-kind/parameter details; the reader
does not invent them. Existing clearance validation decides whether they suffice.

The module is delivered only to Jude's framing and caption-clearance consumers.
The registry generates its portable panel copy; there is no runtime repository
import. No AI resubmission, increased SDK cap, inference or layout-policy change
is part of this fix.

The actual artifact reproduced a 384,535-byte return clipped at 262,144 bytes.
The new reader returned six pages (largest 38,147 bytes), preserving all 719
samples, 881 faces and 67 empty samples. Each page's source PTS, boxes and scores
was independently compared with the same original artifact. This fixes reading;
the 67 empty detector frames remain unknown and cannot establish face safety.

Focused regression tests cover the real panel boundary, page byte/sample limits,
single-frame overflow, changed metadata, missing/duplicate pages, invalid clocks,
v1 compatibility and unchanged single-frame framing. The original saved result
is preserved; any same-plan render comparison is a separate controlled test.

Read-only call-site audit: Chris and Podcast already project selected geometry;
Depth projects normalized geometry inside its script. Their aggregate size may
still grow on larger inputs, and this patch does not claim those consumers were
fixed. Excluded templates and app/SDK code are unchanged.

The same real-plan controlled generation completed after paging, and the read
warning disappeared. Its 67 empty detector frames leave six of eleven source
segments unknown; five non-card caption stacks still require review. The
summary now checks every expected segment key, rather than only the entries
that returned verified faces. It reports required/verified/unknown segments and
never labels a partial set as complete. This metadata correction changes no
caption placement, font, timing, music or saved graphic parameters. Reading all
719 decoded frames is distinct from finding a confident face at every moment.
