// Regenerate measurements with the real existing application factory, offline.
// No app/SDK invocation, source copy, model, dependency installation or PCM file.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const args=process.argv.slice(2),option=name=>{const i=args.indexOf(name);return i<0?null:args[i+1];};
const app=option('--app-root'),output=option('--output');
if(!app||!output)throw Error('Use --app-root <existing cutback-client> --output <new JSON path>.');
if(fs.existsSync(output))throw Error('Output exists; preserve it and choose a new path.');
const require=createRequire(path.join(path.resolve(app),'package.json'));
const esbuild=require(process.env.SELECTS_ESBUILD||'esbuild');
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const song=path.join(repo,'plugins/gongju-gallery/assets/gallery-bgm-gallery-montage-12s-v2.wav');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const source=fs.readFileSync(song);
const entry='electron/mcp/source-preparation/measure-beat-sync.ts';
const built=esbuild.buildSync({absWorkingDir:path.resolve(app),entryPoints:[entry],bundle:true,platform:'node',format:'esm',target:'node22',write:false,metafile:true,tsconfig:path.resolve(app,'tsconfig.json')});
const inputs=Object.keys(built.metafile.inputs).sort().map(relative=>({path:relative,sha256:hash(fs.readFileSync(path.resolve(app,relative)))}));
const {createBeatSyncMeasurer}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].contents).toString('base64'));
const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),120_000);
let m;
try{[m]=await createBeatSyncMeasurer({ffmpegPath:option('--ffmpeg')||'ffmpeg',ffprobePath:option('--ffprobe')||'ffprobe'}).measure({sources:[{path:song}],includeBeatAnalysis:true},controller.signal);}
finally{clearTimeout(timer);}
if(m.audio.status!=='measured'||!m.audio.beatAnalysis)throw Error('Actual Beat Sync interpretation unavailable.');
if(hash(fs.readFileSync(song))!==hash(source))throw Error('Song changed while measured.');
const a=m.audio;
const fixture={schemaVersion:1,
 source:{filename:path.basename(song),bytes:source.length,sha256:hash(source)},
 generation:{factory:'createBeatSyncMeasurer',entry,appCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:app,encoding:'utf8'}).trim(),
   generator:{path:'tests/fixtures/gongju-gallery/measure.mjs',sha256:hash(fs.readFileSync(fileURLToPath(import.meta.url)))},
   esbuildVersion:esbuild.version,nodeVersion:process.version,
   ffmpegVersion:execFileSync(option('--ffmpeg')||'ffmpeg',['-version'],{encoding:'utf8'}).split('\n')[0],
   ffprobeVersion:execFileSync(option('--ffprobe')||'ffprobe',['-version'],{encoding:'utf8'}).split('\n')[0],
   request:{sources:[{path:'<same SHA-256 bundled song>'}],includeBeatAnalysis:true},implementation:inputs,
   decodedSampleRate:24000,decodePolicy:'Production FFmpeg aresample=24000:async=1, mono f32le; memory only.',
   clock:'Raw onsets/pulse phase use window-centre time; interpreted band onsets/firstBeat estimate attacks.',
   command:'node tests/fixtures/gongju-gallery/measure.mjs --app-root <existing cutback-client> --output <new measurement.json> [--ffmpeg <existing executable>] [--ffprobe <existing executable>]',
   limitation:'Offline exact factory execution, not an app/PanelHost test; no listening or instrument labels.'},
 measurement:{durationSeconds:m.durationSeconds,status:a.status,startSeconds:a.startSeconds,hopSeconds:a.hopSeconds,windowSeconds:a.windowSeconds,
   rawFrameCount:a.frames.t.length,rawOnsets:a.onsets,beatAnalysis:a.beatAnalysis,
   rawFramesSHA256:hash(JSON.stringify(a.frames))}};
fs.writeFileSync(output,JSON.stringify(fixture,null,2)+'\n');
console.log(JSON.stringify({output,source:fixture.source,bpm:a.beatAnalysis.bpm,grid:a.beatAnalysis.grid,rawFrameCount:a.frames.t.length},null,2));
