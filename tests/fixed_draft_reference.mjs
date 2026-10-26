import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

// Test data is mandatory and versioned with the test, never read from a branch.
export function readDraftReference(id) {
  const reference = JSON.parse(readFileSync(new URL('./fixtures/draft-references/' + id + '.json', import.meta.url), 'utf8'));
  assert.equal(reference.schemaVersion, 1, 'Unsupported Draft reference');
  assert.deepEqual(reference.cases.map(row => row.fps), [30000 / 1001, 30], 'Both reference frame rates must be tested');
  for (const row of reference.cases) assert.ok(row.result && Array.isArray(row.calls) && row.calls.length, 'Incomplete Draft reference');
  return reference;
}

// Preserve the previous call-by-call comparison without duplicating graphic code.
export function draftCallDigests(calls, normalize = call => call) {
  return calls.map(call => ({method: call.split(' ')[0], sha256: createHash('sha256').update(normalize(call)).digest('hex')}));
}
