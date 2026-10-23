// Full-cue fallback can produce a longer hero than the reference's 400-frame control.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const{test}=require('node:test'),{stripTypeScriptTypes:strip}=require('node:module');
const panel=fs.readFileSync(process.env.VLOG_OPENING_PANEL||path.join(__dirname,'..','panel.tsx'),'utf8');
const between=(a,b)=>panel.slice(panel.indexOf(a),panel.indexOf(b,panel.indexOf(a)));
const K=new Function(strip(between('const GFX_SMEAR = `','// ---------------------------------------------------------------------------\n// Scripts.')+between('function decorateScript(','function finishScript('),{mode:'strip'})+';return {decorateScript};')();
for(const [name,heroLength,beatSeconds,fps] of [['reported full-cue',719,.4754749999999992,60],['slow beat',900,2,60],['fast beat',60,.02,60],['reference-like',86,.4,25]])test(name+': generated effect defaults fit editable bounds without retiming',async()=>{
 let effect,commits=0;const rows=[{clipId:1,resourceId:'r1',trackKind:'main',startFrame:0,endFrame:heroLength}];
 const draft={clips:async()=>rows,addVideoEffect:async e=>{effect=e;for(const p of e.editableParameters){if(p.type==='number')assert.ok(p.defaultValue>=p.min&&p.defaultValue<=p.max,JSON.stringify(p));}},insertGap:async()=>{},rangeAtFrames:async(a,b)=>({a,b}),addMotionGraphic:async()=>{},chapters:async()=>[],commitAll:async()=>{commits++;}};
 const script=K.decorateScript({sequenceId:'owned',style:'motion',fps,title:'',subtitle:'',letterbox:false,palette:{accent:'#123456',skyMid:'#123456'},gapSeconds:1,titleEnd:null,burstSeconds:.2,beatSeconds});
 await new Function('selects',strip('async function run(){'+script+'}',{mode:'strip'})+';return run();')({draft:()=>draft});
 assert.equal(effect.parameters.holdFrames,Math.max(6,Math.round(heroLength-3*beatSeconds*fps)));
 assert.equal(effect.parameters.beatFrames,beatSeconds*fps);assert.equal(commits,1);
});
