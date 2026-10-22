import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import test from 'node:test';
import {execFileSync} from 'node:child_process';
const modules=process.env.SBS_PANEL_TEST_MODULES;
if(!modules)throw Error('Set SBS_PANEL_TEST_MODULES to React/esbuild/jsdom dependencies.');
const dep=createRequire(path.resolve(modules,'../package.json'));
const React=dep('react'),{createRoot}=dep('react-dom/client'),{JSDOM}=dep('jsdom'),esbuild=dep('esbuild');
const directory=new URL('../plugins/archive-vlog/',import.meta.url);
const presets=JSON.parse(fs.readFileSync(new URL('assets/fonts/presets.json',directory),'utf8'));
const fonts=presets.presets[0].fonts.map(f=>({...f,metrics:presets.metrics[f.family],b64:fs.readFileSync(new URL('assets/fonts/'+f.file,directory),'utf8').trim()}));
const wideA='\ud55c',wideB='\uae00';
async function fixture(t,kind){
 const dom=new JSDOM('<div id="root"></div>'),previous={};
 for(const [key,value]of Object.entries({window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true})){
  previous[key]=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
 }
 const calls=[],measured=[],gates=[],released=[],releaseSnapshots=[],cancelled=[],errors=[],timers=new Map();let width=70,closed=false,timerId=0,epoch=0,now=0;
 Object.defineProperty(document,'fonts',{configurable:true,value:{load:(font,text)=>new Promise((resolve,reject)=>calls.push({font,text,resolve,reject,settled:false}))}});
 dom.window.HTMLCanvasElement.prototype.getContext=()=>({font:'',measureText(text){measured.push(text);return {width:Array.from(text).length*width,actualBoundingBoxAscent:70,actualBoundingBoxDescent:20};}});
 const remotion={AbsoluteFill:({children})=>React.createElement('div',null,children),useCurrentFrame:()=>180,useVideoConfig:()=>({width:1920,height:1080,fps:30}),delayRender:label=>{const id=gates.length+1;gates.push({id,label});return id;},continueRender:id=>{released.push(id);releaseSnapshots.push({id,textCount:document.querySelectorAll('svg text').length});},cancelRender:error=>{cancelled.push(error);throw error;}};
 const file=kind==='title'?'decode-title.tsx':'archived-credit.tsx',source=fs.readFileSync(process.env.ARCHIVE_RENDER_SOURCE_ROOT?path.join(process.env.ARCHIVE_RENDER_SOURCE_ROOT,file):new URL('assets/'+file,directory),'utf8');
 const code=esbuild.transformSync(source,{loader:'tsx',format:'cjs',jsx:'automatic',target:'es2022'}).code,module={exports:{}};
 new Function('require','module','exports','setTimeout','clearTimeout','performance',code)(name=>name==='remotion'?remotion:dep(name),module,module.exports,(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id;},id=>timers.delete(id),{now:()=>now});
 const Component=module.exports.default,root=createRoot(document.getElementById('root'));
 const base=kind==='title'?{preset:'cinematic',kicker:'MINI VLOG',title:'A',tagline:'CAPTURE',font:'anton',fonts}:{prefix:'ARCHIVED BY',name:'A',fonts:fonts.filter(f=>f.family==='AV Oswald Bold')};
 class Boundary extends React.Component {
  state={error:null};static getDerivedStateFromError(error){return {error};}
  componentDidCatch(error){errors.push(error);}
  render(){return this.state.error?React.createElement('p',{role:'alert'},this.state.error.message):this.props.children;}
 }
 const consoleError=console.error;console.error=(...args)=>{if(String(args[0]).includes('The above error occurred'))return;consoleError(...args);};
 const render=async(data,{strict=false,fresh=false}={})=>React.act(async()=>{if(fresh)epoch++;const child=React.createElement(Component,{data});root.render(React.createElement(Boundary,{key:epoch},strict?React.createElement(React.StrictMode,null,child):child));});
 const reject=async call=>React.act(async()=>{call.settled=true;call.reject(Error('font source unavailable'));});
 const fireTimeouts=async()=>React.act(async()=>{for(const[id,value]of [...timers]){if(!timers.has(id))continue;timers.delete(id);value.fn();}});
 const resolve=async text=>React.act(async()=>{for(const call of calls.filter(c=>!c.settled&&(text===undefined||c.text===text))){call.settled=true;call.resolve([]);}});
 const remove=async()=>{if(!closed){closed=true;await React.act(async()=>root.unmount());}};
 t.after(async()=>{await remove();console.error=consoleError;dom.window.close();for(const[key,value]of Object.entries(previous)){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}});
 const change=value=>({...base,[kind==='title'?'title':'name']:value});
 return {base,render,resolve,reject,fireTimeouts,remove,change,calls,measured,gates,released,releaseSnapshots,cancelled,errors,timers,remotion,setWidth:value=>{width=value;},advanceClock:value=>{now+=value;}};
}
for(const kind of ['title','credit']){
 test('Archive '+kind+': packaged Latin fonts prepare once and color-only updates preserve the prepared scope',async t=>{
  const f=await fixture(t,kind);await f.render(f.base);assert.ok(f.calls.length>0);assert.equal(f.released.length,0);await f.resolve();assert.equal(f.released.length,1);assert.ok(f.releaseSnapshots[0].textCount>0,'release follows the graphic DOM commit');const count=f.calls.length;
  await f.render({...f.base,titleColor:'#FF0000',color:'#FF0000'});assert.equal(f.calls.length,count);assert.equal(f.released.length,1);
  await f.remove();assert.equal(f.released.length,1,'each owned gate is released once');
 });
 test('Archive '+kind+': valid Latin-to-Hangul Adjust waits before measuring the new text',async t=>{
  const f=await fixture(t,kind);await f.render(f.base);await f.resolve();f.measured.length=0;
  await f.render(f.change(wideA));assert.ok(f.calls.some(c=>c.text?.includes(wideA)),'new wide glyphs have an explicit font preparation');assert.equal(f.measured.length,0,'no measurement using an unprepared fallback');assert.equal(f.gates.length-f.released.length,1,'the changed request owns a render gate');
  f.setWidth(93);await f.resolve();assert.ok(f.measured.length>0);assert.equal(f.gates.length,f.released.length);
 });
 test('Archive '+kind+': stale wide-text preparation cannot release or measure its replacement',async t=>{
  const f=await fixture(t,kind);await f.render(f.base);await f.resolve();await f.render(f.change(wideA));await f.render(f.change(wideB));f.measured.length=0;
  const latest=f.calls.find(c=>c.text?.includes(wideB));assert.ok(latest,'replacement glyphs have their own request');
  await f.resolve(f.calls.find(c=>c.text?.includes(wideA)).text);assert.equal(f.measured.length,0,'old preparation cannot publish readiness for new text');assert.ok(f.gates.length>f.released.length,'replacement stays blocked');
  await f.resolve();assert.ok(f.measured.length>0);assert.equal(f.gates.length,f.released.length);
 });
 test('Archive '+kind+': unmount releases pending readiness once and late font replies have no owner',async t=>{
  const f=await fixture(t,kind);await f.render(f.change(wideA));assert.equal(f.gates.length,1);await f.remove();assert.deepEqual(f.released,[f.gates[0].id]);const count=f.measured.length;await f.resolve();assert.equal(f.measured.length,count);assert.equal(f.released.length,1);
 });
}

for(const kind of ['title','credit']){
 test('Archive '+kind+': StrictMode retires its first scope and releases every committed gate once',async t=>{
  const f=await fixture(t,kind);await f.render(f.change(wideA),{strict:true});assert.equal(f.gates.length,2);assert.equal(f.released.length,1);await f.resolve();assert.equal(f.released.length,2);assert.equal(new Set(f.released).size,2);assert.equal(f.timers.size,0);await f.remove();assert.equal(f.released.length,2);
 });
 test('Archive '+kind+': font failure cancels rendering, ignores late replies and permits fresh-mount recovery',async t=>{
  const f=await fixture(t,kind);await f.render(f.change(wideA));await f.reject(f.calls[0]);assert.equal(f.errors.length,1);assert.equal(f.cancelled.length,1);assert.equal(f.timers.size,0);assert.equal(f.released.length,f.gates.length);const measured=f.measured.length;await f.resolve();assert.equal(f.errors.length,1);assert.equal(f.measured.length,measured);
  await f.render(f.base,{fresh:true});await f.resolve();assert.equal(f.released.length,f.gates.length);assert.equal(f.cancelled.length,1);assert.ok(document.querySelector('svg text'),'fresh mount recovers the normal graphic');
 });
 test('Archive '+kind+': a never-settling font has an explicit deadline and cannot publish late readiness',async t=>{
  const f=await fixture(t,kind);await f.render(f.change(wideA));assert.equal([...f.timers.values()][0].ms,20000);await f.fireTimeouts();assert.equal(f.errors.length,1);assert.match(f.errors[0].message,/too long/);assert.equal(f.timers.size,0);assert.equal(f.cancelled.length,1);assert.equal(f.released.length,f.gates.length);await f.resolve();assert.equal(f.measured.length,0);assert.equal(f.cancelled.length,1);
 });
}
test('Archive title: already loaded Anton/Oswald choices keep their existing readiness and design',async t=>{
 const f=await fixture(t,'title');await f.render(f.base);await f.resolve();const calls=f.calls.length;await f.render({...f.base,font:'oswald'});assert.equal(f.calls.length,calls);assert.equal(f.gates.length,1);assert.ok([...document.querySelectorAll('svg text')].some(node=>node.getAttribute('font-family')?.includes('AV Oswald Bold')));
});

for(const kind of ['title','credit']){
 test('Archive '+kind+': returning to earlier text cannot reuse readiness from a retired scope',async t=>{
  const f=await fixture(t,kind);await f.render(f.change(wideA));await f.resolve();await f.render(f.change(wideB));f.measured.length=0;await f.render(f.change(wideA));assert.equal(f.measured.length,0,'the new A request must prepare before measuring');assert.equal(f.gates.length-f.released.length,1);await f.resolve();assert.ok(f.measured.length>0);assert.equal(f.gates.length,f.released.length);
 });
 test('Archive '+kind+': a replacement FontFaceSet needs its own preparation even for identical text',async t=>{
  const f=await fixture(t,kind);await f.render(f.change(wideA));await f.resolve();const load=document.fonts.load;Object.defineProperty(document,'fonts',{configurable:true,value:{load}});f.measured.length=0;await f.render(f.change(wideA));assert.equal(f.measured.length,0);assert.equal(f.gates.length-f.released.length,1);await f.resolve();assert.equal(f.gates.length,f.released.length);await f.remove();assert.equal(new Set(f.released).size,f.gates.length);
 });
 test('Archive '+kind+': a font reply after the deadline fails even before an overdue timer runs',async t=>{
  const f=await fixture(t,kind);await f.render(f.change(wideA));f.advanceClock(20001);await f.resolve();assert.equal(f.errors.length,1);assert.match(f.errors[0].message,/too long/);assert.equal(f.measured.length,0);assert.equal(f.timers.size,0);assert.equal(f.gates.length,f.released.length);
 });
 test('Archive '+kind+': missing font readiness API fails and retires its allocated gate',async t=>{
  const f=await fixture(t,kind);Object.defineProperty(document,'fonts',{configurable:true,value:null});await f.render(f.base);assert.equal(f.errors.length,1);assert.match(f.errors[0].message,/cannot confirm/);assert.equal(f.cancelled.length,1);assert.equal(f.timers.size,0);assert.deepEqual(f.released,[1]);
 });
 test('Archive '+kind+': malformed font readiness results cannot become successful graphics',async t=>{
  const f=await fixture(t,kind);await f.render(f.base);await React.act(async()=>{for(const call of f.calls){call.settled=true;call.resolve(undefined);}});assert.equal(f.errors.length,1);assert.match(f.errors[0].cause.message,/invalid/);assert.equal(f.cancelled.length,1);assert.equal(f.timers.size,0);assert.equal(document.querySelector('svg text'),null);assert.equal(f.gates.length,f.released.length);
 });
 test('Archive '+kind+': gate release failure is reported and never retried as successful cleanup',async t=>{
  const f=await fixture(t,kind),release=f.remotion.continueRender;f.remotion.continueRender=id=>{release(id);throw Error('gate owner unavailable');};await f.render(f.base);await f.resolve();assert.equal(f.errors.length,1);assert.match(f.errors[0].message,/gate could not be released/);assert.equal(f.cancelled.length,1);assert.deepEqual(f.released,[1]);await f.remove();assert.deepEqual(f.released,[1]);
 });
}

test('render-fonts: a later synchronous load throw observes every earlier pending rejection',()=>{
 const source=fs.readFileSync(new URL('../shared/render-fonts.js',import.meta.url),'utf8');
 const script=[
  "const unhandled=[],cancelled=[],released=[],effects=[];process.on('unhandledRejection',error=>unhandled.push(error.message));let firstReject,n=0;",
  "globalThis.document={fonts:{load(){if(++n===2)throw Error('second load threw');return new Promise((resolve,reject)=>{firstReject=reject;});}}};",
  "const React={useState:()=>[null,()=>{}],useRef:()=>({current:null}),useMemo:fn=>fn(),useLayoutEffect:fn=>effects.push(fn)};",
  "const hook=new Function('setTimeout','clearTimeout',"+JSON.stringify(source+"\nreturn useRenderFonts;")+ ")(()=>1,()=>{});",
  "hook(React,{fonts:[{family:'A',weight:400,b64:'a'},{family:'B',weight:400,b64:'b'}],delayRender:()=>1,continueRender:id=>released.push(id),cancelRender:error=>{cancelled.push(error.message);throw error;}});",
  "const cleanup=effects[0]();await Promise.resolve();await Promise.resolve();firstReject(Error('late first rejection'));await new Promise(setImmediate);cleanup();console.log(JSON.stringify({unhandled,cancelled,released}));"
 ].join('');
 const result=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',script],{encoding:'utf8'}));assert.deepEqual(result.unhandled,[]);assert.equal(result.cancelled.length,1);assert.deepEqual(result.released,[1]);
});
