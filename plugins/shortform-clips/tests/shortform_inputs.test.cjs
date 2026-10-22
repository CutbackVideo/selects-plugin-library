'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const modulesRoot = process.env.SBS_PANEL_TEST_MODULES;

test('shortform timeline inputs', {skip: !modulesRoot && 'Set SBS_PANEL_TEST_MODULES'}, async t => {
  const dep = createRequire(path.resolve(modulesRoot, '../package.json'));
  const esbuild = dep('esbuild');
  const source = fs.readFileSync(path.join(__dirname, '../panel.tsx'), 'utf8');
  const mod = {exports:{}};
  new Function('require','module','exports',esbuild.transformSync(source+'\nexport {sdkFiles,hostFiles,makeStore,SCRIPT_INPUTS,SCRIPT_SOURCE_READER,SCRIPT_TRANSCRIPT,SCRIPT_BUILD,RADIO_SCRIPT_BUILD};',{loader:'tsx',format:'cjs'}).code)(dep,mod,mod.exports);
  const api = mod.exports;
  const run = (code, selects) => new Function('selects',esbuild.transformSync('return (async()=>{'+code+'})();',{loader:'ts'}).code)(selects);
  const body = (code, P) => code.replace('const P: any = __P__;','const P: any = '+JSON.stringify(P)+';');
  await t.test('whole-project choice removes the single-source picker without changing existing inputs',()=>{
    const React=dep('react'),render=dep('react-dom/server').renderToStaticMarkup;
    const form=source.slice(source.indexOf('  const form = (',source.indexOf('function ShortformClipsPanel(')),source.indexOf('\n  const elapsed =',source.indexOf('  const form = (')));
    const code=esbuild.transformSync(`function view(mode){
      const S=new Proxy({},{get:(_,key)=>String(key)}),lang='en',templatesLoading=false,resourcesLoading=false;
      const templates=[],programOptions=[],videoOptions=[],countOptions=[],SELECTABLE_SPLIT_LAYOUTS=[];
      const COMPOSITION_LABELS={en:{}},url='',pick=null,program='auto',countMode='auto',count=1,fixedLayout='auto',framing=true,subjectInstructions='',note='',sourceAction=null;
      const setMode=()=>{},setUrl=()=>{},setPick=()=>{},setProgram=()=>{},setCountMode=()=>{},setCount=()=>{},setFixedLayout=()=>{},setFraming=()=>{},setSubjectInstructions=()=>{},setNote=()=>{};
      ${form}
      return form;
    }`,{loader:'tsx',format:'cjs'}).code;
    const ui={Stack:({children})=>React.createElement('div',null,children),Segmented:({options})=>React.createElement('div',null,options.map(o=>React.createElement('span',{key:o.value},o.value))),Select:({label})=>React.createElement('div',null,label),TextField:({placeholder})=>React.createElement('div',null,placeholder),Message:({children})=>React.createElement('p',null,children),Toggle:({label})=>React.createElement('div',null,label)};
    const view=new Function('React','ui',code+';return view;')(React,ui);
    const all=render(view('project-all')),single=render(view('project')),youtube=render(view('youtube'));
    assert.match(all,/project-all/);assert.match(all,/wholeProjectHint/);assert.doesNotMatch(all,/>pick</);assert.doesNotMatch(all,/urlPh/);
    assert.match(single,/>pick</);assert.match(youtube,/urlPh/);
  });
  await t.test('SDK batches legal chunks without losing binary bytes or hiding truncation',async()=>{
    let calls=0;const lengths=[];
    const bytes=Uint8Array.from({length:200000},(_,i)=>i%256);
    const files=await api.sdkFiles({runScript:async({script})=>{
      calls++;
      const result=await run(script,{files:{environment:async()=>({platform:'darwin',homedir:'/home'}),readRange:async({offset,length})=>{
        lengths.push(length);assert.ok(length<=49152);
        return {base64:Buffer.from(bytes.slice(offset,offset+length)).toString('base64')};
      }}});
      assert.ok(Buffer.byteLength(JSON.stringify({result})) < 256*1024, "Serialized file response must fit the script cap");
      return {result};
    }});
    const before=calls;
    assert.deepEqual(await files.readRange('/image',0,files.readPiece),bytes.slice(0,147456));
    assert.equal(calls-before,1);assert.equal(lengths.length,3);
    const whole=await files.readWhole(['/one','/two'],[70000,3000]);
    assert.deepEqual(whole,[bytes.slice(0,70000),bytes.slice(0,3000)]);
    await assert.rejects(files.readRange('/image',199999,2),/changed while/);
  });
  await t.test('shared readers preserve multi-megabyte files within each response cap',async()=>{
    const data=new Map([['/images/large.png',Uint8Array.from({length:2*1024*1024+17},(_,i)=>i%251)],...Array.from({length:25},(_,i)=>['/images/small-'+i+'.png',new Uint8Array(7000+i).fill(i)])]);
    const responseSizes=[];
    const backend=await api.sdkFiles({runScript:async({script})=>{
      const result=await run(script,{files:{
        environment:async()=>({platform:'darwin',homedir:'/home'}),
        stat:async p=>p==='/images'?{size:0,isDirectory:true,mtimeMs:1}:{size:data.get(p).length,isDirectory:false,mtimeMs:1},
        readdir:async()=>[...data.keys()].map(p=>p.split('/').pop()),
        readRange:async({path,offset,length})=>({base64:Buffer.from(data.get(path).slice(offset,offset+length)).toString('base64')})
      }});
      const size=Buffer.byteLength(JSON.stringify({result}));responseSizes.push(size);
      assert.ok(size<256*1024,'Response exceeds script cap: '+size);
      return {result};
    }});
    const files=api.hostFiles(backend);
    assert.deepEqual(await files.readFile('/images/large.png'),data.get('/images/large.png'));
    const rows=await files.readFolder('/images',/\.png$/);
    assert.equal(rows.length,data.size);
    for(const row of rows)assert.deepEqual(row.bytes,data.get('/images/'+row.name));
    assert.ok(responseSizes.length>10);
  });
  await t.test('concurrent saved-data readers share I/O but receive independent values',async()=>{
    let release,calls=0;
    const gate=new Promise(r=>release=r);
    const store=api.makeStore({homedir:()=>'/home',join:(...x)=>x.join('/'),readFolder:async()=>{calls++;await gate;return [{bytes:new TextEncoder().encode('[1]')}];}});
    const a=store.list('jobs'),b=store.list('jobs');release();
    const [first,second]=await Promise.all([a,b]);
    assert.equal(calls,1);first[0].push(2);assert.deepEqual(second,[[1]]);
    await store.list('jobs');assert.equal(calls,2);
  });
  await t.test('source inventory does not wait for Draft metadata',async()=>{
    const rows=await run(api.SCRIPT_INPUTS.replace('__PROJECT_ID__','"p"').replace('const inputScope: string = "all";','const inputScope: string = "sources";'),{
      project:()=>({resources:async()=>[{type:'Video',resourceId:'v',durationSeconds:1}],syncedTimelines:async()=>[],meta:()=>{throw Error('Draft enumeration blocks sources');}}),
      draft:()=>{throw Error('Draft read blocks sources');}
    });
    assert.equal(rows[0].id,'v');
  });
  await t.test('Draft inventory bounds concurrency at four and preserves order',async()=>{
    let active=0,peak=0;
    const rows=await run(api.SCRIPT_INPUTS.replace('__PROJECT_ID__','"p"').replace('const inputScope: string = "all";','const inputScope: string = "drafts";'),{
      project:()=>({meta:async()=>({draftIds:Array.from({length:9},(_,i)=>String(i))})}),
      draft:id=>({meta:async()=>{active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,2));active--;return {name:id,durationSeconds:1};}})
    });
    assert.equal(peak,4);assert.deepEqual(rows.map(x=>x.name),Array.from({length:9},(_,i)=>String(i)));
  });
  await t.test('source settings preserve NTSC rates before placement and reject unsupported rates',async()=>{
    for (const [fps,ratio] of [[24000/1001,'24000/1001'],[30000/1001,'30000/1001'],[60000/1001,'60000/1001'],[30,'30/1']]) {
      const result=await run(api.SCRIPT_SOURCE_READER+`let saved; await initializeShortformSettings({setSettings:async value=>{saved=value;}},{meta:{fps:${fps},frameSize:{width:1920,height:1080}}}); return saved;`,{});
      assert.deepEqual(result,{frameRate:ratio,frameSize:{width:1920,height:1080}});
    }
    await assert.rejects(run(api.SCRIPT_SOURCE_READER+'await initializeShortformSettings({}, {meta:{fps:27}});',{}),/Unsupported source frame rate/);
  });
  const word = (text,startFrame,endFrame,sourceStartFrame,extra={}) => ({text,startFrame,endFrame,sourceStartFrame,sourceEndFrame:sourceStartFrame+endFrame-startFrame,sourceResourceId:'camera',speakerId:1,...extra});
  const meta = {name:'Edited interview',fps:25,durationSeconds:60,durationFrames:1500,frameSize:{width:1920,height:1080}};
  const playback = [word('Second.',250,275,1000,{wordId:'b'}),word('First.',750,775,100,{wordId:'a'})];
  const draft = {meta:async()=>meta,words:async options=>{assert.deepEqual(options,{view:'playback'});return playback;}};
  const project = {meta:async()=>({draftIds:['d1']}),resources:async()=>[{resourceId:'v1',name:'Video',type:'Video',hasAnalysis:true,durationSeconds:30},{resourceId:'s1',name:'Sync',type:'Sequence',hasAnalysis:true,durationSeconds:60}],syncedTimelines:async()=>[{resourceId:'s1',sequenceId:'s',name:'Sync',hasAnalysis:true},{resourceId:'broken',issue:'missing-sequence'}]};
  const selects={project:()=>project,draft:id=>{assert.equal(id,'d1');return draft;}};

  await t.test('input inventory passes host TypeScript checks for broken synced timeline rows',()=>{
    const ts=dep('typescript');
    const filename=path.resolve('shortform-input-check.ts');
    const code=`
      declare const selects: {
        project(id:string): {
          resources(): Promise<any[]>;
          syncedTimelines(): Promise<({sequenceId:string,resourceId:string,name:string,hasAnalysis:boolean,issue?:never}|{resourceId:string,name:string,issue:"missing-sequence"})[]>;
          syncedTimeline(id:string): {layout():Promise<{frameRate:number,placements:{baseEndFrame:number}[]}>};
          meta(): Promise<{draftIds:string[]}>;
        };
        draft(id:string): {meta():Promise<{name:string,fps:number,durationSeconds:number}>};
      };
      async function inventory() {${api.SCRIPT_INPUTS.replace('__PROJECT_ID__','"p"')}}
    `;
    const options={noEmit:true,strict:true,types:[],target:ts.ScriptTarget.ES2022,skipLibCheck:true};
    const host=ts.createCompilerHost(options),original=host.getSourceFile;
    host.getSourceFile=(file,...args)=>file===filename?ts.createSourceFile(file,code,options.target,true):original.call(host,file,...args);
    const program=ts.createProgram([filename],options,host);
    const errors=ts.getPreEmitDiagnostics(program).filter(d=>d.category===ts.DiagnosticCategory.Error);
    assert.deepEqual(errors.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')),[]);
  });
  await t.test('inventory includes short videos, synced timelines, and project-owned Drafts exactly once',async()=>{
    const rows=await run(api.SCRIPT_INPUTS.replace('__PROJECT_ID__','"p"'),selects);
    assert.deepEqual(rows.map(r=>[r.id,r.kind]),[['v1','video'],['s1','synced'],['draft:d1','draft']]);
    assert.equal(rows[2].sourceDraftId,'d1');
    assert.equal(rows[0].sec,30);
  });
  await t.test('synced inventory uses layout duration when Resource duration is missing',async()=>{
    const p={...project,resources:async()=>[],syncedTimeline:()=>({layout:async()=>({frameRate:25,placements:[{baseEndFrame:1500},{baseEndFrame:3000}]})})};
    const rows=await run(api.SCRIPT_INPUTS.replace('__PROJECT_ID__','"p"'),{...selects,project:()=>p});
    assert.equal(rows[0].sec,120);
  });
  await t.test('Draft passage selection uses edited playback order and times, excluding cut words',async()=>{
    const d={...draft,words:async()=>[playback[0],word('Deleted.',500,525,600,{cut:true}),playback[1]]};
    const result=await run(body(api.SCRIPT_TRANSCRIPT,{projectId:'p',sourceKind:'draft',sourceDraftId:'d1',offset:0,limit:250}),{...selects,draft:()=>d});
    assert.deepEqual(result,{duration:60,total:2,lines:[[10,11,'Second.'],[30,31,'First.']]});
  });
  await t.test('synced input reads only its merged transcript and never the member transcripts',async()=>{
    let reads=0;
    const p={...project,resource:id=>{assert.equal(id,'s1');return {meta:async()=>meta,words:async opts=>{reads++;assert.deepEqual(opts,{view:'playback'});return playback;}};},transcription:()=>{throw Error('Do not concatenate members');}};
    const result=await run(body(api.SCRIPT_TRANSCRIPT,{projectId:'p',sourceKind:'synced',resourceId:'s1',resourceName:'Sync',offset:1,limit:1}),{project:()=>p});
    assert.equal(reads,1);assert.deepEqual(result.lines,[[30,31,'First.']]);assert.equal(result.total,2);
  });
  await t.test('missing Draft and unavailable merged transcript fail before creating output',async()=>{
    await assert.rejects(run(body(api.SCRIPT_TRANSCRIPT,{projectId:'p',sourceKind:'draft',sourceDraftId:'foreign'}),selects),/no longer in this project/);
    const p={...project,syncedTimelines:async()=>[{resourceId:'s1',hasAnalysis:false}]};
    await assert.rejects(run(body(api.SCRIPT_TRANSCRIPT,{projectId:'p',sourceKind:'synced',resourceId:'s1',resourceName:'Sync'}),{project:()=>p}),/merged transcript/);
  });
  for (const renderer of ['SCRIPT_BUILD','RADIO_SCRIPT_BUILD']) for(const kind of ['draft','synced']) {
    await t.test(`${renderer}: ${kind} builds disjoint passages through its own input clock`,async()=>{
      const calls=[],graphics=[];let frames=0;
      const d={...draft,rangeAtFrames:async(a,b)=>({owner:'input',startFrame:a,endFrame:b})};
      const add=(a,b)=>{frames+=b-a;};
      const out={
        insert:async opts=>{assert.equal(opts.tracks,'all');assert.equal(opts.source.owner,'input');calls.push(opts);add(opts.source.startFrame,opts.source.endFrame);},
        insertResource:async opts=>{assert.equal(opts.resourceId,'s1');calls.push(opts);add(Math.round(opts.sourceRange.startSeconds*25),Math.round(opts.sourceRange.endSeconds*25));},
        setSettings:async settings=>{assert.deepEqual(settings,{frameRate:'25/1',frameSize:meta.frameSize});assert.equal(calls.length,0);},setFrameSize:async()=>{},clips:async()=>[{resourceId:'camera',trackKind:'main',startFrame:0,endFrame:frames}],setClipTransform:async()=>{},
        meta:async()=>({...meta,durationFrames:frames,durationSeconds:frames/25}),rangeAtFrames:async(a,b)=>({startFrame:a,endFrame:b}),
        addMotionGraphic:async g=>graphics.push(g),commitAll:async()=>({createdDraftId:'output'}),
      };
      const p={...project,resource:id=>{assert.equal(id,'s1');return {meta:async()=>meta,words:async()=>playback};},createDraft:async()=>out};
      const P={projectId:'p',sourceKind:kind,sourceDraftId:'d1',resourceId:'s1',resourceName:'Sync',name:'Clip',segments:[[10,11],[30,31]],transform:{scale:1,posX:0,posY:0},frame:{},captions:false};
      const result=await run(body(api[renderer],P),{project:()=>p,draft:()=>d});
      assert.equal(result.draftId,'output');assert.equal(calls.length,2);assert.ok(graphics.length>0);
      if(kind==='draft') {
        assert.ok(calls[0].source.startFrame<250 && calls[0].source.endFrame>275);
        assert.ok(calls[1].source.startFrame<750 && calls[1].source.endFrame>775);
      } else assert.ok(calls[0].sourceRange.startSeconds<10);
    });
  }
  await t.test('caption omission timing maps repeated source occurrences to the selected Draft passage',async()=>{
    const input={draft:{},meta,words:[word('Yes',250,275,100,{wordId:'same'}),word('Yes',750,775,100,{wordId:'same'})]};
    const output=[word('Yes',0,30,120,{wordId:'same'})];
    const result=await run(api.SCRIPT_SOURCE_READER+'return inputCaptionWords('+JSON.stringify(output)+','+JSON.stringify(input)+',[[30,31]],30);',{});
    assert.equal(result[0].sourceStartFrame,750);
  });
});
