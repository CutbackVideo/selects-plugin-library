# Private customer regression fixtures

Customer packs have migrated to built-in Shortform Clips and share-code delivery.
Their JSON, images, authoring documents and legacy customer snapshots are no longer
published in this repository.

Tests that require these exact customer assets remain available for internal use.
Public CI explicitly skips these suites; it does not claim customer-pack coverage.
Other Shortform Clips unit tests continue to run.

For an authorized local regression run, restore private copies of all four packs
under `plugins/shortform-clips/template-packs/`, plus the three customer snapshot
files listed in `customer-fixtures.cjs` under `tests/fixtures/`. These paths are
gitignored. Do not republish them or fetch them from old public Git revisions.
Then run the existing tests with `SBS_PANEL_TEST_MODULES` set as before.
The real-footage `tests/regression/run.cjs` also requires the private Chosun pack.
