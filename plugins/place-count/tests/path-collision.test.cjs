const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const pluginRoot = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(pluginRoot, 'panel.tsx'), 'utf8');
const file = (folder, resourceId) => ({
  type: 'video', name: 'same.mp4', path: folder + '/01_Downtown/same.mp4',
  resourceId, durationSeconds: 5, frameRate: 30, frameSize: {width: 1920, height: 1080},
});

(async () => {
  const {loadPanelFunctions} = await import('../../../tests/windows_host.mjs');
  const panel = loadPanelFunctions(source,
    ['fullProjectInventory', 'readMediaPages', 'locationsFromPaths', 'norm', 'issue', 'VIDEO'],
    {window: {parent: new Proxy({}, {get() {throw Error('Host access is forbidden');}})}});
  const seoul = file('/media/seoul/selected-200', 'r0');
  const la = file('/media/la/selected-200', 'r1');
  const resources = ['native-seoul', 'native-la'].map(resourceId => ({resourceId, name: 'same.mp4', type: 'Video'}));
  let reads = 0;
  const sdk = {
    async call(method, projectId) {
      assert.equal(projectId, 'project');
      if (method === 'getProjectDraftScaffold') return {owner: {libraryId: 'library', projectId}};
      assert.equal(method, 'listProjectResources');
      return resources;
    },
    async runScript({script, allowCommit}) {
      assert.equal(allowCommit, false);
      reads++;
      const project = {
        resources: async () => resources.map((r, i) => ({...r, resourceId: 'r' + i})),
        sourceFiles: async () => ({fileTree: [
          {type: 'dir', name: 'selected-200', children: [seoul]},
          {type: 'dir', name: 'selected-200', children: [la]},
        ]}),
      };
      return {result: await vm.runInNewContext('(async()=>{' + script + '})()', {selects: {project: () => project}})};
    },
  };
  const inventory = await panel.fullProjectInventory(sdk, 'project');
  assert.deepEqual(Array.from(inventory, row => row.resourceId), ['native-seoul', 'native-la']);
  const result = panel.locationsFromPaths(inventory, '/media/la/selected-200/');
  assert.equal(result.places.length, 1);
  assert.equal(result.places[0].files[0].path, la.path);
  assert.ok(!JSON.stringify(result).includes('/seoul/'));
  assert.equal(panel.locationsFromPaths(inventory, '/media/la/selected-20').places.length, 0);
  const windows = panel.locationsFromPaths([file('C:/media/la/selected-200', 'native-win')], 'C:\\media\\la\\selected-200');
  assert.equal(windows.places.length, 1);
  await assert.rejects(panel.fullProjectInventory({call: async () => ({owner: {libraryId: 'library', projectId: 'foreign'}})}, 'project'), /verified/);
  assert.equal(reads, 1);
  console.log('Full-path collisions, host resource identity, Windows paths, and Project ownership: passed');
})().catch(error => {console.error(error); process.exit(1);});
