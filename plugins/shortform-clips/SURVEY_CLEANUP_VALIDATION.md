# Survey capture cleanup validation

Only remove deduplicated capture paths owned by this survey. Never enumerate or stat the shared frames folder during generation. Historical orphan capture sweeping is outside this change.

## Customer evidence

October 30: four cleanup SDK calls took 60.484, 86.831, 94.487 and 88.773 seconds (330.576 seconds total). Median wall time rose from 0.751 seconds on October 29 to 87.802 seconds on October 30. These calls include Main/IPC waits; the customer directory file count is unknown. The sum is not an additive estimate of overall generation savings.

## Windows before/after (2026-10-31)

On signed Selects 2.0.878, a disposable directory with 20,000 unrelated files and five owned captures took 22,480 ms with the original scan versus 82 ms with owned-only deletion. The original scan still took 21,135 ms with logging disabled. All five owned captures were removed and all unrelated files survived. This isolates traversal scaling from logging; it does not recreate the earlier Main-wide stall.

## Independent branch checks

`SBS_PANEL_TEST_MODULES=/path/to/node_modules node --test plugins/shortform-clips/tests/shortform_windows_speed.test.cjs`

The cleanup regression fails against the unmodified main panel and passes with this change. All 11 checks pass, including duplicate paths, a failed/missing deletion, preserved survey results and script type checks. This branch retains the original nine FFmpeg batches; frame batching is a separate PR.

Full customer generation and the original source video remain unverified. No customer data or unrelated files are modified by these fixtures.

[Customer report](https://cutbackworkspace.slack.com/archives/C09C6B68N1K/p1793349122572779)
