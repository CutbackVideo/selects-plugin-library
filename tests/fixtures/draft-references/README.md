# Fixed Draft contracts

These mandatory fixtures replace comparisons against the moving `origin/main`
branch. They work in PR checkouts, on main, and in source downloads with no Git
directory. Missing data is an error, never a reason to skip a test.

Each JSON records the accepted source revision and SHA-256 for provenance, plus
the expected result at 30000/1001 and 30 fps. Thank You Recap uses the already
trimmed 20.633-second reference and the 5.25-second music offset documented in its
README. The offset must not be subtracted from the reference duration again.

Cinema and Portrait store per-call method/hash receipts to avoid copying entire
graphic programs. Their existing comparison boundaries are preserved: Cinema
projects inset-layout calls to clip, label and width; Portrait compares source
end positions in frames. All remaining call contents and ordering must match.

Fixtures are reviewed test data, not generated during CI. Update them only for
an intentional, reviewed behavior change, checking the result and every changed
call against the new specification. The source hash is provenance, not a demand
that the whole Panel stay byte-identical.

`node --test tests/fixed_draft_references.test.mjs` verifies all six reference
checks execute with no skips, survive changes to the remote branch, reject
missing fixtures, and detect real timing/canvas mutations. It uses disposable
source copies and does not modify template implementations or the SDK.
