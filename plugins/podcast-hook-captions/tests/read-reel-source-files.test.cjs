'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createRequire, stripTypeScriptTypes } = require('node:module');
const { rawResources } = require('../src/pipeline/sharedAiFaces.cjs');

const projectId = 'project-a', draftId = 'draft-a';
const leaf = (resourceId, filePath, width = 1920, height = 1080) => ({
  type: 'video', name: resourceId + '.mp4', resourceId, path: filePath,
  hasTimecode: false, frameSize: { width, height },
});
const folder = (name, children) => ({ type: 'dir', name, children });
const filler = count => Array.from({ length: count }, (_, i) => leaf('unused-' + i, '/unused/' + i + '.mp4'));
const flatten = nodes => nodes.flatMap(node => node.type === 'dir' ? flatten(node.children) : [node]);
const words = [
  { text: 'one', startFrame: 30, endFrame: 45, sourceStartFrame: 90 },
  { text: 'two', startFrame: 45, endFrame: 60, sourceStartFrame: 105 },
  { text: 'cut', startFrame: 60, endFrame: 65, sourceStartFrame: 999, cut: true },
];

async function loadReel() {
  const source = await fs.readFile(path.join(__dirname, '../src/pipeline/reel.ts'), 'utf8');
  const executable = stripTypeScriptTypes(source)
    .replace(/^import[^\n]+\n/gm, '').replace(/^export /gm, '');
  return new Function('J', 'script', 'rawResources', executable + '\nreturn { readReel };')(
    JSON.stringify,
    async (sdk, summary, body) => (await sdk.runScript({ summary, script: body })).result,
    rawResources,
  ).readReel;
}

async function fixture(tree, overrides = {}) {
  const leaves = flatten(tree), selected = leaves.filter(node => node.resourceId.startsWith('source-'));
  const requestedFolders = [], scripts = [], calls = [];
  const clips = selected.map((file, i) => ({
    clipId: i + 1, trackKind: 'main', resourceId: file.resourceId, startFrame: 30 + i * 60, endFrame: 90 + i * 60,
  }));
  const overview = leaves.length <= 200 ? { fileTree: tree, fileCount: leaves.length } : {
    mode: 'summary', fileCount: leaves.length,
    folders: [
      ...(tree.some(node => node.type !== 'dir') ? [{ name: '(root)' }] : []),
      ...tree.filter(node => node.type === 'dir').map(node => ({ name: node.name })),
    ],
  };
  const project = {
    sourceFiles: async options => {
      if (!options) return overrides.overview || overview;
      requestedFolders.push(options.folder);
      if (overrides.detail) return overrides.detail(options.folder);
      const children = options.folder === '(root)' ? tree.filter(node => node.type !== 'dir')
        : tree.find(node => node.type === 'dir' && node.name === options.folder).children;
      return { mode: 'detail', folder: options.folder, fileTree: children };
    },
  };
  const sdk = {
    runScript: async ({ script }) => {
      scripts.push(script);
      const executable = stripTypeScriptTypes('async function run(selects) {\n' + script + '\n}');
      const result = await new Function('selects', executable + '\nreturn run(selects);')({
        project: id => { assert.equal(id, projectId); return project; },
        draft: id => {
          assert.equal(id, draftId);
          return { meta: async () => ({ fps: 30 }), words: async () => words, clips: async () => clips };
        },
      });
      return { isError: false, result };
    },
    call: async (method, id) => {
      calls.push([method, id]);
      return { owner: { projectId }, sequenceJson: { id: draftId, tracks: { children: [{ kind: 'Main', children:
        clips.map(clip => ({ id: clip.clipId, mediaReferences: { defaultMedia: { id: 'uuid-' + clip.resourceId } } })),
      }] } } };
    },
  };
  const readReel = await loadReel();
  return { read: () => readReel(sdk, projectId, draftId), requestedFolders, scripts, calls, leaves, overview };
}

test('readReel preserves source in-points, nested metadata and persistent UUIDs on a small Project', async () => {
  const f = await fixture([folder('recording', [folder('camera', [leaf('source-a', 'C:\\media\\a.mp4', 3840, 2160)])])]);
  const result = await f.read();
  assert.deepEqual(result.clips, [{ clipId: 1, rid: 'uuid-source-a', s: 30, e: 90, path: 'C:\\media\\a.mp4', sw: 3840, sh: 2160, srcStart: 3 }]);
  assert.equal(result.fps, 30); assert.equal(result.endFrame, 90); assert.equal(result.words.length, 2);
  assert.deepEqual(f.requestedFolders, []);
  assert.deepEqual(f.calls, [['getDraftCore', draftId]]);
});

test('readReel drills into all summarized folders, nested subtrees and loose root files', async () => {
  const f = await fixture([
    leaf('source-root', '/root.mp4'),
    folder('A', [...filler(199), folder('nested', [leaf('source-a', '/a.mp4')])]),
    folder('B', [leaf('source-b', '/b.mp4', 1280, 720)]),
  ]);
  const result = await f.read();
  assert.equal(f.overview.mode, 'summary');
  assert.deepEqual(f.requestedFolders, ['(root)', 'A', 'B']);
  assert.deepEqual(result.clips.map(clip => [clip.rid, clip.path, clip.sw, clip.sh]), [
    ['uuid-source-root', '/root.mp4', 1920, 1080], ['uuid-source-a', '/a.mp4', 1920, 1080], ['uuid-source-b', '/b.mp4', 1280, 720],
  ]);
});

test('one summarized folder can return more than 200 files without another overview or nested query', async () => {
  const f = await fixture([folder('all-recordings', [...filler(200), folder('last-camera', [leaf('source-a', '/last.mp4')])])]);
  const result = await f.read();
  assert.deepEqual(f.requestedFolders, ['all-recordings']);
  assert.equal(result.clips[0].path, '/last.mp4');
});

test('more than 200 loose files are recovered with the SDK root detail selector', async () => {
  const f = await fixture([...filler(200), leaf('source-a', '/loose.mp4')]);
  const result = await f.read();
  assert.deepEqual(f.requestedFolders, ['(root)']);
  assert.equal(result.clips[0].path, '/loose.mp4');
});

test('an incomplete folder read fails before a null media path or raw Resource join can escape', async () => {
  const f = await fixture([folder('A', [...filler(200), leaf('source-a', '/last.mp4')])], {
    detail: name => ({ mode: 'detail', folder: name, fileTree: [] }),
  });
  await assert.rejects(f.read(), /source inventory changed or is incomplete/);
  assert.deepEqual(f.calls, []);
});

test('a summary returned instead of a named-folder detail is rejected explicitly', async () => {
  const f = await fixture([folder('A', [...filler(200), leaf('source-a', '/last.mp4')])], {
    detail: () => ({ mode: 'summary', folders: [], fileCount: 201 }),
  });
  await assert.rejects(f.read(), /source folder could not be read: A/);
});

const modules = process.env.AI_PANEL_TEST_MODULES;
test('real SDK verifies the readReel literal and its root/multiple/nested/large-folder source projections', {
  skip: !modules && 'Set AI_PANEL_TEST_MODULES to an existing Selects node_modules',
}, async () => {
  const dependency = createRequire(path.join(path.resolve(modules), '..', 'package.json'));
  const esbuild = dependency('esbuild'), appRoot = path.dirname(path.resolve(modules));
  const rawSdk = { name: 'raw-sdk', setup(build) {
    build.onResolve({ filter: /\?raw$/ }, arg => ({ path: path.resolve(arg.resolveDir, arg.path.slice(0, -4)), namespace: 'raw' }));
    build.onLoad({ filter: /.*/, namespace: 'raw' }, async arg => ({ contents: await fs.readFile(arg.path, 'utf8'), loader: 'text' }));
  } };
  const bundle = async entry => {
    const result = await esbuild.build({ entryPoints: [path.join(appRoot, entry)], bundle: true, write: false,
      platform: 'node', format: 'cjs', external: ['typescript'], plugins: [rawSdk] });
    const loaded = { exports: {} };
    new Function('require', 'module', 'exports', result.outputFiles[0].text)(dependency, loaded, loaded.exports);
    return loaded.exports;
  };
  const { typecheckQueryScript } = await bundle('electron/mcp/script-runtime/typecheck.ts');
  const { projectSourceFiles } = await bundle('electron/mcp/source-preparation/source-files.ts');
  const tree = [leaf('source-root', '/root.mp4'), folder('A', [...filler(200), folder('nested', [leaf('source-a', '/a.mp4')])]), folder('B', [leaf('source-b', '/b.mp4')])];
  const f = await fixture(tree, { overview: projectSourceFiles(tree), detail: name => projectSourceFiles(tree, name) });
  const result = await f.read();
  assert.deepEqual(result.clips.map(clip => clip.path), ['/root.mp4', '/a.mp4', '/b.mp4']);
  assert.deepEqual(f.requestedFolders, ['(root)', 'A', 'B']);
  const check = typecheckQueryScript(f.scripts[0]);
  assert.equal(check.ok, true, JSON.stringify(check));
});
