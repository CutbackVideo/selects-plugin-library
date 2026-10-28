# SDK-free status-load correction

Observed failure: a valid native `running` reply arrived after5.303s while the
private template adapter had already rejected it at5s and cancelled useful work.
The preceding8da95e5 correction covered source fingerprints only.

This follow-up keeps the public SDK and app source unchanged:

- Native source checks in generated assembly scripts yield150ms between running
  observations and cancellation polls. The standard nonblocking scheduler is
  checked before native dispatch. Completed output still drains fully.
- Existing asset owners pass their absolute deadline and scope guard into the
  private local client. One pending status reply can outlive5s within that
  operation budget; cancellation/expiry still ends the operation. Startup and
  cancellation settlement retain their existing bounded unknown-outcome policy.
- No14, Camera Shutter, Four Photo Stop Motion and Polaroid delegate PCM decoding
  to the existing asset owner, capturing the original client for reads/cleanup.
  Unconfirmed producer exit retains its workspace and cannot become null duration.
  Camera receives the same existing asset module through the delivery registry.

Regression evidence:19 new cases fail on8da95e5 and pass after the change. An
existing owner-contract case also fails on the preceding asset runner and passes
when its budget/guard reaches the private adapter. Real FFmpeg PCM controls cover
all four photo wrappers and Mini. The577 affected checks pass without skips.
Ownership classifications and acceptance flags are unchanged; only source hashes
and coordinates are refreshed.

CI host-lifetime regressions also retain each executing VM context until its
script settles and close owned transports on fixture teardown. Forced GC made
the prior async wait remain pending; retaining the context restores completion.
An unfinished-script teardown probe independently caught an open transport.
Both counterexamples now pass, as do 175 related Archive/Mini cases on Node22.
The unchanged app's real query executor also completes the same forced-GC wait
probe on Node22.23.3 and Node24.10.0; this correction is confined to the test host.

Actual installed-app comparison used the same4GiB MP4 bytes, second video,
default bundled music/options, three sustained legacy full-byte readers and two
Claude-subscription Chris runs. Targets started80s after the readers in both arms.
The Chris runs were stopped as load drivers and are not acceptance results.

| Observation | Before8da95e5 | After |
| --- | ---: | ---: |
| Total native status reads |43,603|1,583|
| SDK assembly status reads |42,571|518|
| Mini generation/save |169.808s|196.871s|
| Archive generation/save |173.788s|201.127s|
| Max renderer heartbeat delay during target runs |474ms|1,785ms|
| Max observed private reply delay |800ms|1,845ms|

Both targets saved. Total status traffic fell96.4%, and SDK assembly traffic98.8%.
This pair does **not** establish faster completion or reduced UI stalls; completion
and maximum delays were worse in the second arm. Concurrent AI/provider activity
is variable. Neither arm reproduced a new natural5s reply in this pair. Delayed
valid replies and expired ownership are separately protected by deterministic
regression cases. Large legacy readers still continue after their SDK call times
out; an SDK-wide expiry barrier is outside this change.

Output comparison preserves the music Resource UUID, exact source range, fades,
canvas and completion length. Complete video edit JSON differs, including selected
source windows and chapter boundaries, so byte-identical editing is not claimed.
Each run passed its own final assembly validation. Restart/export receipts and
remaining acceptance boundaries are kept in the task's private verification report.

Additional controls: Camera and Four Photo Stop Motion saved in the actual app.
No14 failed effect-preset reference verification and Polaroid failed graphic
placement verification, both with this change and the preceding8da95e5 panels on
the same photos. They also failed in a separate photo-only Project; frame rate is
not established as the cause. These existing failures are not silently marked
fixed or hidden by weakening verification. They are outside this status/PCM fix.

Chan files, existing work and the existing PR are preserved. No merge is performed.
