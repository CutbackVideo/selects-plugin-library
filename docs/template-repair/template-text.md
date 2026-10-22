# Shared text lookup: preserve dictionary ownership

All seven original runtimes reproduced the same actual-function counterexample:
missing keys such as constructor/toString/__proto__ returned empty text instead
of the key or optional label, because ordinary lookup inherited JavaScript object
properties. Missing placeholder variables could also stringify constructor or
toString functions instead of retaining the placeholder.

One canonical template-text runtime now admits only own dictionary entries and
own variables. It preserves explicit own values with those names. Language
selection, English fallback, plural selection, number formatting and field widths
retain their existing contract. The seven STRINGS blocks are byte-identical to
the originals. All 54,750 original/current comparisons across the existing keys,
ten languages and five counts are equal. No observed installed-UI incident is
claimed from these function-level counterexamples.

Archive, Mini, City Weekend, Selfie Aesthetic, Summer Trip, THE END and Torn Paper
Love use the existing generator. No new import path, transport or SDK is added.
The managed pool now has thirteen modules and eighteen plugin consumers:
seventeen templates and the existing Medical compatibility consumer. New module
ownership covers runtime mechanics; extraction of the separate developer checker
remains planned. Template-specific wording and error policies remain local.

RED: the initial 29 checks fail on all seven inherited-key cases plus the missing
canonical owner. After that fix, seven additional placeholder cases reproduce
the same ownership problem. GREEN: all 36 cases pass. Scope includes locale
switches, navigator/English fallbacks, dictionary isolation, plural/numeric
formatting, missing placeholders, explicitly registered prototype-named entries
and existing code-point clipping. Source snapshots and all-key parity are stored
in clip-highlights-analysis/repro-20261023/template-text.

Related generator/ownership/runtime checks pass 70 tests. All fourteen existing
panel/i18n suites pass after narrowing Archive's field-helper extractor to the
actual functions; every previous counter/clipping assertion remains. Full Python
checks pass 318 tests with six skips. Strict ES2020/DOM TypeScript checking reports
no diagnostics. Public/package and ownership checks pass. Outside the text
declarations, all seven complete panels retain identical AST tokens after
normalizing the intentional version bump; manifests change only their version.

No Electron is launched for this pure runtime change. Source/adapter and package
evidence remain separate from installed-panel, complete saved output, full-video
playback/audio, export and Windows acceptance. The existing two Draft PRs remain
the review units; Chan apps remain excluded and whole-template acceptance is0/28.
