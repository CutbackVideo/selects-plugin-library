'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const modulesRoot = process.env.SBS_PANEL_TEST_MODULES;

test('scene preflight source transcript compatibility', { skip: !modulesRoot && 'Set SBS_PANEL_TEST_MODULES' }, async t => {
  const dep = createRequire(path.resolve(modulesRoot, '../package.json'));
  const esbuild = dep('esbuild');
  const source = fs.readFileSync(path.join(__dirname, '../panel.tsx'), 'utf8');
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', esbuild.transformSync(source, { loader: 'tsx', format: 'cjs' }).code)(dep, loaded, loaded.exports);
  const script = loaded.exports.scenePreflightScript({ projectId: 'project', sourceName: 'A.mov', sceneRunsDirectory: '/scene-runs' });
  const executable = esbuild.transformSync('async function run(selects){' + script + '\n}', { loader: 'ts', target: 'es2022' }).code;
  const run = new Function(executable + '\nreturn run;')();

  function fixture(analyzed = false, failure = null) {
    const calls = [];
    const file = { resourceId: 'original', name: 'A.mov', path: '/episode/A.mov', type: 'file', frameRate: 30, durationSeconds: 10, frameSize: { width: 1920, height: 1080 } };
    const rows = [{ resourceId: 'original', name: 'A.mov', type: 'Video', hasTranscription: true, hasAnalysis: analyzed, durationSeconds: 10 }];
    const words = [{ startFrame: 30, endFrame: 42, text: 'Hello.', speakerId: 7, utteranceId: 'u1', nonSpeech: false }];
    const takeGroups = [{ id: 'take-group', alternatives: [] }];
    const project = {
      resources: async () => rows,
      sourceFiles: async () => ({ fileTree: [file] }),
      transcription: async () => {
        calls.push('transcription');
        return { utterances: [
          { resourceId: 'other', utteranceId: 'other', words: [{ start: 0, end: 1, word: 'Wrong resource' }] },
          { resourceId: 'original', utteranceId: 'u1', speaker: 7, words: [{ start: 1, end: 1.4, word: 'Hello', punctuatedWord: 'Hello.' }] }
        ] };
      },
      resource: id => {
        assert.equal(id, 'original');
        assert(analyzed, 'An unanalyzed source must not open the analyzed Resource handle');
        return {
          meta: async () => { calls.push('meta'); if (failure) throw Error(failure); return { fps: 30, durationFrames: 300, durationSeconds: 10, frameSize: file.frameSize }; },
          words: async () => { calls.push('words'); return words; },
          takeGroups: async options => { calls.push('takeGroups'); assert.deepEqual(options, { alternatives: 2 }); return takeGroups; }
        };
      }
    };
    const sdk = {
      project: id => { assert.equal(id, 'project'); return project; },
      files: {
        readdir: async directory => { assert(['/scene-runs', '/episode'].includes(directory)); return directory === '/episode' ? ['A.mov'] : []; },
        exists: async p => p === file.path,
        stat: async p => p === file.path ? { isDirectory: false, size: 100, mtimeMs: 1 } : null
      }
    };
    return { calls, words, takeGroups, run: () => run(sdk) };
  }

  await t.test('transcription-only original uses project words and file FPS without analyzed source APIs', async () => {
    const f = fixture(), result = await f.run();
    assert.deepEqual(f.calls, ['transcription']);
    assert.equal(result.sources[0].fps, 30);
    assert.equal(result.sources[0].durationFrames, 300);
    assert.deepEqual(result.sources[0].sourceWords, [[1, 1.4, 'Hello.', 7, 'u1', false]]);
    assert.deepEqual(result.sources[0].takeGroups, []);
    assert.equal(result.sources[0].analysisReadError, null);
    assert.deepEqual(result.warnings, []);
  });

  await t.test('analyzed original preserves source word clocks and take-group evidence', async () => {
    const f = fixture(true), before = structuredClone(f.words), result = await f.run();
    assert.deepEqual(f.calls, ['meta', 'words', 'takeGroups']);
    assert.equal(result.sources[0].durationFrames, 300);
    assert.deepEqual(result.sources[0].sourceWords, [[1, 1.4, 'Hello.', 7, 'u1', false]]);
    assert.deepEqual(result.sources[0].takeGroups, f.takeGroups);
    assert.deepEqual(f.words, before);
    assert.deepEqual(result.warnings, []);
  });

  await t.test('source read failures remain visible as scoped warnings', async () => {
    const f = fixture(true, 'source read unavailable'), result = await f.run();
    assert.deepEqual(result.sources[0].sourceWords, []);
    assert.match(result.sources[0].analysisReadError, /source read unavailable/);
    assert(result.warnings.some(row => row.resourceId === 'original' && /source read unavailable/.test(row.reason)));
  });

  await t.test('whole-project input spans folders, freezes membership and excludes generated sources', async () => {
    const originals=[
      {resourceId:'a',name:'A.mov',path:'/shoot/A.mov',type:'Video'},
      {resourceId:'b',name:'B.mov',path:'/other/B.mov',type:'Video'},
      {resourceId:'photo',name:'photo.png',path:'/photos/photo.png',type:'Image'},
      {resourceId:'sound',name:'sound.wav',path:'/audio/sound.wav',type:'Audio'},
      {resourceId:'render',name:'video.mp4',path:'/scene-runs/job/0/video.mp4',type:'Video'},
      {resourceId:'matte',name:'matte.mov',path:'/derived/matte.mov',type:'Video'}
    ];
    const evidencePath='/scene-runs/job/0/build-evidence.json';
    const evidence=Buffer.from(JSON.stringify({projectId:'project',importedAssetLineage:[{path:'/derived/matte.mov'}]}));
    const sdk={project:()=>({resources:async()=>originals,sourceFiles:async()=>({fileTree:originals})}),files:{
      readdir:async p=>p==='/scene-runs'?['job']:p==='/scene-runs/job'?['0']:[],
      exists:async p=>p===evidencePath||originals.some(r=>r.path===p),
      stat:async p=>({isDirectory:['/scene-runs/job','/scene-runs/job/0'].includes(p),size:p===evidencePath?evidence.length:100,mtimeMs:1}),
      readRange:async({offset,length})=>({base64:evidence.subarray(offset,offset+length).toString('base64'),bytesRead:Math.min(length,evidence.length-offset)})
    }};
    const execute=async extra=>{
      const code=loaded.exports.scenePreflightScript({projectId:'project',sourceName:'',sceneRunsDirectory:'/scene-runs',wholeProject:true,...extra});
      return new Function('selects',esbuild.transformSync('return (async()=>{'+code+'})();',{loader:'ts'}).code)(sdk);
    };
    const initial=await execute();
    assert.deepEqual(initial.sourceResourceIds,['a','b','photo','sound']);
    assert.equal(initial.anchor,null);assert.equal(initial.originalDirectory,null);
    assert.deepEqual((await execute({wholeProject:false,sourceName:'A.mov'})).sourceResourceIds,['a']);
    originals.push({resourceId:'later',name:'later.png',path:'/photos/later.png',type:'Image'});
    assert.deepEqual((await execute({sourceResourceIds:initial.sourceResourceIds})).sourceResourceIds,initial.sourceResourceIds);
    originals.splice(originals.findIndex(r=>r.resourceId==='b'),1);
    await assert.rejects(execute({sourceResourceIds:initial.sourceResourceIds}),/saved project source is missing/);
    originals.push({resourceId:'duplicate',name:'A.mov',path:'/second/A.mov',type:'Video'});
    await assert.rejects(execute(),/duplicate filenames/);
    originals.length=0;
    await assert.rejects(execute(),/no original source files/);
  });
});
