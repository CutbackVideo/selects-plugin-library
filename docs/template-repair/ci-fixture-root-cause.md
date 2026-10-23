# CI fixture dependency failures

## Cause

The previous Depth fixes added one missing helper to each test's manual list.
Those lists could become stale again whenever the production component gained
another local dependency. Other tests sliced emitted modules at compiler comment
banners; esbuild emitted `local-client.ts` in two sections around an imported
dependency, so one selected section was incomplete. Expanding the selected text
still depended on the compiler's current layout.

The same problem existed in the surrounding AI adapter, Portrait/Jude lifecycle,
and Jude sprite tests. Package checks also pinned the current patch version even
though they tested platform support, not behavior exclusive to that version.

## Change

- Load the entire portable panel with the CI-installed TypeScript compiler in a
  fresh VM. Local declarations, imports and JSX retain their actual structure;
  no production helper list or emitted comment boundaries are used.
- Tests explicitly replace only host or expensive-operation boundaries. Removed
  override declarations, unexpected imports and syntax errors fail the fixture
  instead of silently becoming empty mocks.
- Keep real defaults, error mappings and generated CommonJS wrappers in the
  affected tests. Continue checking the intended execution stage, error text,
  retry/reopen behavior, cancellation and saved-Draft ownership.
- Always run the shared and four local-client consumer round trips on macOS and
  Windows host fixtures. Installed-app SDK type checking remains a separate,
  optional test; its absence no longer skips consumer execution.
- Check package identity and platform support in the two Windows tests. The
  existing mandatory `tools/plugin_files.py check` owns version syntax validation;
  unrelated patch releases no longer require editing these behavior assertions.

No application, production panel, shared product module, SDK or manifest changed.
Host fixtures do not constitute real Windows or installed-app acceptance.

## Regression evidence

- Add another transitive helper to the actual Depth framing helper in memory:
  the former isolated-function loader fails with a missing-name error; the whole
  module loader returns the same actual framing script without naming that helper.
- Remove generated module banners from the real a16z panel: the actual interleaved
  file-observation implementation still executes to fingerprint a file.
- Insert an error in a real dependency: execution fails; the loader does not
  mask it. Invalid syntax, an undeclared import and an obsolete fixture override
  also fail. Nested bindings retain their actual scope.
- Local affected JavaScript suites: 127 passed, one pre-existing skip because
  the AI-enabled app SDK declarations are absent (128 total).
- Python suite: 312 passed, six existing skips (318 total).
- The complete remote workflow must be checked on the new commit separately;
  the previous successful CI run does not verify this change.

These changes address this class of fixture drift. They do not establish that
all 53 reported product issues are resolved.
