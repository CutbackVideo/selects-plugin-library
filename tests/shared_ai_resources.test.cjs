const test = require('node:test');
const assert = require('node:assert/strict');
const { canonicalResourceBindings, resolveSharedAiResources, importSharedAiResource } = require('../shared/ai-resources.cjs');
const id = 'ee44b47f-3537-41be-a64f-92262c58a3a3';
const other = '11aabbcc-3537-41be-a64f-92262c58a3a3';
function fixture(path = '/media/photo.png', imported = true) {
  let rows = imported ? [{ resourceId: id, name: 'photo.png', type: 'image' }] : [], imports = 0;
  const sdk = { call: async () => structuredClone(rows) };
  const run = async script => {
    const project = {
      resources: async () => rows.map((r, i) => ({ ...r, resourceId: 'r' + i })),
      sourceFiles: async () => ({ fileTree: rows.map((r, i) => ({ ...r, resourceId: 'r' + i, path })) }),
      importFiles: async () => { imports++; rows = [{ resourceId: id, name: 'photo.png', type: 'image' }]; return { addedResourceIds: ['r0'] }; },
    };
    const js = script.replace(/new Set<string>\(\)/g, 'new Set()').replace(/\(rows:any\[\]\)/g, '(rows)');
    return new (Object.getPrototypeOf(async function () {}).constructor)('selects', js)({ project: () => project });
  };
  return { sdk, run, get imports() { return imports; }, set rows(value) { rows = value; } };
}
test('Main source bindings recurse and retain persistent ids', () => {
  const core = { owner: { projectId: 'p' }, sequenceJson: { id: 'd', tracks: { children: [{ kind: 'Main', children: [{ id: 2, children: [{ id: 3, mediaReferences: { defaultMedia: { id } } }] }] }, { kind: 'Audio', children: [{ id: 4, mediaReferences: { defaultMedia: { id: other } } }] }] } } };
  assert.deepEqual([...canonicalResourceBindings(core, { projectId: 'p', draftId: 'd' })], [[3, id]]);
  assert.throws(() => canonicalResourceBindings(core, { projectId: 'foreign' }), /another Project/);
});
test('alias joins validate persistent ordered Resources', async () => {
  const f = fixture(); assert.equal((await resolveSharedAiResources(f.sdk, 'p', ['r0'], f.run)).get('r0'), id);
  assert.equal((await resolveSharedAiResources(f.sdk, 'p', [id], f.run)).get(id), id);
  await assert.rejects(resolveSharedAiResources(f.sdk, 'p', ['r99'], f.run), /unavailable/);
});
test('resource changes during SDK observation are refused', async () => {
  const f = fixture();
  const run = async script => { const value = await f.run(script); f.rows = [{ resourceId: other, name: 'photo.png', type: 'image' }]; return value; };
  await assert.rejects(resolveSharedAiResources(f.sdk, 'p', ['r0'], run), /changed/);
});
test('existing source path reuses its UUID without another import', async () => {
  const f = fixture(); assert.equal(await importSharedAiResource(f.sdk, 'p', '/media/photo.png', f.run), id); assert.equal(f.imports, 0);
});
test('derived media registers once and retains persistent identity on reopen', async () => {
  const f = fixture('/derived/source.mp4', false);
  assert.equal(await importSharedAiResource(f.sdk, 'p', '/derived/source.mp4', f.run), id);
  assert.equal(await importSharedAiResource(f.sdk, 'p', '/derived/source.mp4', f.run), id);
  assert.equal(f.imports, 1);
});
test('Windows Unicode, slash and case changes match the same path', async () => {
  const f = fixture('C:\\Photos\\\uC778\uBB3C.png');
  assert.equal(await importSharedAiResource(f.sdk, 'p', 'c:/photos/\uC778\uBB3C.png', f.run), id);
  assert.equal(f.imports, 0);
});
test('ambiguous paths and nonabsolute inputs reject', async () => {
  const f = fixture(); f.rows = [{ resourceId: id, name: 'photo.png', type: 'image' }, { resourceId: other, name: 'photo.png', type: 'image' }];
  await assert.rejects(importSharedAiResource(f.sdk, 'p', '/media/photo.png', f.run), /ambiguous/);
  await assert.rejects(importSharedAiResource(f.sdk, 'p', '../photo.png', f.run), /absolute/);
});
