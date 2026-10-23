# C01: show the existing template step and its age

Jude, Chris, DOAC and Depth already receive real stage messages while producing
captions. Their TemplateRun views now share one read-only presentation module:
the current message, time since that message changed, and a notice after 120
seconds without a different message. The notice says completion is unconfirmed;
it does not declare failure, estimate a percentage/ETA, cancel, retry or submit
another job. Repeated identical polling messages do not reset the step-change age.
This age measures the displayed message, not disk activity or worker health.

Completion preserves the existing result/error payload and stops the display
interval. Removing the frame clears its timer. A distinct run ID starts a fresh
clock; late updates cannot restart a completed view. The existing host Stop and
workflow protocols remain responsible for generation, independently of this view.
No SDK capability, IPC, persistence or AI stage is added. DOAC now also displays
its existing finish payload in the view instead of leaving its previous step text.

The host exposes the same running frame through a separate app change. This
module alone does not make a hidden frame visible or prove C01 fixed in the live
app. C19 actual cancellation and C46 historical timeout checks remain independent.

`shared/template-progress.cjs` is the only source. The registry embeds it into the
four standalone panels and Chris's source template. The synchronization tool's
new source exception allows only `plugins/chris-williamson-style/src/panel.template.tsx`;
other source paths and traversal remain rejected before any writes. The official
Chris builder reproduces the same complete generated panel.

Tests render the canonical module and all four complete production modules with
real React/ReactDOM and a fake clock. Existing expensive generation boundaries
are held in unit fixtures; no real model or media job is started. They check
identical messages, stage changes, long pauses, terminal errors, run reuse,
StrictMode/unmount cleanup, unchanged generation/SDK counts and build parity.
The module registry and existing transitive fixture checks are retained.

Coverage is explicitly four of 28 in `template-progress-coverage.json`. The other
24 templates are inventoried as unchanged, without claiming they have this clock
or equivalent progress telemetry. Chan's shorts apps remain excluded.
