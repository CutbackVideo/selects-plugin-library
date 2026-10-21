'use strict';
// Deterministic real-media replay of the production crop compiler and TSX renderer.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{createRequire}=require('node:module'),{execFileSync}=require('node:child_process');
if(!process.env.SHORTFORM_REGRESSION_ROOT)throw Error('Set SHORTFORM_REGRESSION_ROOT to your local inspection workspace (cases.json and fixtures/)');
const root=path.resolve(process.env.SHORTFORM_REGRESSION_ROOT),repo=path.resolve(__dirname,'../../../..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8')),cases=read('cases.json');
const id=new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomBytes(3).toString('hex'),dir=path.join(root,'test-runs',id);fs.mkdirSync(dir,{recursive:true});
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shell=(title,body)=>`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title><style>body{font:16px/1.6 system-ui;background:#111827;color:#e5e7eb;max-width:1200px;margin:40px auto;padding:20px}a{color:#93c5fd}section{padding:24px;background:#1f2937;border-radius:12px;margin:20px 0}img{max-width:100%}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}code{overflow-wrap:anywhere}small{color:#cbd5e1}</style><h1>${esc(title)}</h1>${body}</html>`;
fs.writeFileSync(path.join(dir,'cases.json'),JSON.stringify(cases,null,2));
const report={visualQuality:'needs-review: burned-in source graphics remain',id,createdAt:new Date().toISOString(),scope:'Production compiler + browser TSX renderer; fixed local face observations',limitations:cases.limitations,results:[]};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
let browser;
(async()=>{
 const modules=process.env.SBS_PANEL_TEST_MODULES;if(!modules)throw Error('Set SBS_PANEL_TEST_MODULES to a node_modules directory containing esbuild, react and react-dom');
 global.navigator??={userAgent:'node'};
 const dep=createRequire(path.resolve(modules,'../package.json')),esbuild=dep('esbuild'),React=dep('react'),{renderToStaticMarkup}=dep('react-dom/server');
 const panel=fs.readFileSync(path.join(__dirname,'../../panel.tsx'),'utf8'),m={exports:{}};
 report.panelSha256=hash(panel);report.casesSha256=hash(fs.readFileSync(path.join(root,'cases.json')));
 report.gitHead=execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim();report.gitStatus=execFileSync('git',['status','--short'],{cwd:repo,encoding:'utf8'}).trim();
 new Function('require','module','exports',esbuild.transformSync(panel+'\nexport {sourceCompositionAdapter,measuredFaceShots,compileSourceCropPlan,checkSourceCompositionGeometry,STACKED_REFRAME_EFFECT,RadioPreviewFrame,radioFrameParams};',{loader:'tsx',format:'cjs'}).code)(dep,m,m.exports);
 const f=m.exports,effect={exports:{}};new Function('require','module','exports',esbuild.transformSync(f.STACKED_REFRAME_EFFECT,{loader:'tsx',format:'cjs'}).code)(n=>n==='remotion'?{AbsoluteFill:({children,style,...p})=>React.createElement('div',{...p,style:{position:'absolute',inset:0,...style}},children)}:dep(n),effect,effect.exports);
 const pw=require(process.env.PLAYWRIGHT_MODULES||'playwright');browser=await pw.chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const page=await browser.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});report.browser=browser.version();
 const pack=path.join(__dirname,'../../template-packs/chosun-ilbo'),t=JSON.parse(fs.readFileSync(path.join(pack,'templates/heukbaek.json'),'utf8'));
 const asset=p=>'data:image/webp;base64,'+fs.readFileSync(path.join(pack,p)).toString('base64');
 report.templateSha256=hash(fs.readFileSync(path.join(pack,'templates/heukbaek.json')));
 report.inputs=[];
 const frameData=f.radioFrameParams(t,'\ubd84\ud560 \ud68c\uadc0 \ud14c\uc2a4\ud2b8','\ud751\ubc31\uc5ec\uc758\ub3c4',{background:asset(t.background.image),logo:asset(t.logo.image)});
 const sources=[{resourceId:'fixture',meta:{frameSize:{width:1920,height:1080}}}];
 for(const c of cases.cases){
  const result={id:c.id,description:c.description,status:'failed',images:[],checks:[]};report.results.push(result);
  try{
   const observations=read('fixtures/'+c.fixture+'/observations.json');
   const faces=observations.flatMap((sample,j)=>sample.faces.map((box,q)=>({id:`F${j}-${q}`,resourceId:'fixture',draftFrame:Math.round((sample.sourceSeconds-c.range[0])*30),box})));
   report.inputs.push({caseId:c.id,observationsSha256:hash(JSON.stringify(observations)),samples:observations.map(x=>({file:x.file,sourceSeconds:x.sourceSeconds,sha256:hash(fs.readFileSync(path.join(root,x.file)))}))});
   const L={...t.layout,reframe:true,allowedLayouts:cases.cases.map(c=>c.layout),splitPolicy:'frequent',fixedLayout:c.layout};
   const plan={version:1,status:'planned',shots:[{startFrame:0,endFrame:300,compositionId:c.id,layout:c.layout,panels:c.subjects.map(q=>({camera:'fixture',targets:[{subjectId:'quadrant-'+q,refs:observations.map((_,j)=>`F${j}-${q}`)}],sourcePane:{x:q%2*.5,y:Math.floor(q/2)*.5,width:.5,height:.5}}))}]};
   if(c.automatic){plan.shots[0].people=c.subjects.map(q=>({camera:'fixture',subjectId:'person-'+q,refs:observations.map((_,j)=>`F${j}-${q}`)}));delete plan.shots[0].panels;}
   const adapted=f.sourceCompositionAdapter(plan,sources,300,L,faces),measured=f.measuredFaceShots(adapted.shots,faces,sources,L),compiled=f.checkSourceCompositionGeometry(f.compileSourceCropPlan(measured,sources,300,L),L)[0];
   assert.equal(compiled.panels.length,c.layout==='grid-4'?4:3);
   assert.equal(adapted.shots[0].panels.flatMap(p=>p.targets).length,c.subjects.length);
   result.groups=adapted.shots[0].panels.map(p=>p.targets.map(t=>t.subjectId));
   result.scales=compiled.panels.map(p=>p.fit==='region'?Math.min(1080*p.destination.width/p.rect.width,807*p.destination.height/p.rect.height):1080*p.destination.width/p.w);
   if(c.automatic){assert.ok(Math.max(...result.scales)-Math.min(...result.scales)<1e-6,'whole-shot cells must share magnification');result.checks.push('\ub3d9\uc77c \uc804\uccb4\uc0f7\uc758 \ubaa8\ub4e0 \uce78\uc5d0 \uacf5\ud1b5 \ud655\ub300 \ubc30\uc728 \uc801\uc6a9');}
   if(c.automatic&&c.layout==='columns-3'){result.sourceTops=compiled.panels.map(p=>p.cy-p.w*807*p.destination.height/(1080*p.destination.width)*.4);assert.ok(Math.max(...result.sourceTops)-Math.min(...result.sourceTops)<1e-6,'side-by-side whole-shot cells must share source y');result.checks.push('\uc88c\uc6b0 3\ubd84\ud560\uc758 \uc138\ub85c \ud06c\ub86d \uc704\uce58 \uc77c\uce58: \uc6d0\ubcf8 \uc218\ud3c9\uc120 \ub192\uc774 \ubcf4\uc874');}assert.equal(compiled.startFrame,0);assert.equal(compiled.endFrame,300);
   assert.equal(compiled.panels.reduce((a,p)=>a+p.destination.width*p.destination.height,0),1);
   for(let a=0;a<compiled.panels.length;a++)for(let b=a+1;b<compiled.panels.length;b++){
    const p=compiled.panels[a].destination,q=compiled.panels[b].destination;
    assert.ok(p.x+p.width<=q.x||q.x+q.width<=p.x||p.y+p.height<=q.y||q.y+q.height<=p.y,'destination panels must not overlap');
   }
   for(const [i,p] of compiled.panels.entries()){
    const h=p.w*(L.windowBottom-L.windowTop)*p.destination.height/(1080*p.destination.width),crop=p.fit==='region'?p.rect:{x:p.cx-p.w/2,y:p.cy-h*.4,width:p.w,height:h},q=c.subjects[i];
    if(!c.automatic){assert.ok(crop.x>=q%2*960-1e-6&&crop.x+crop.width<=(q%2+1)*960+1e-6);assert.ok(crop.y>=Math.floor(q/2)*540-1e-6&&crop.y+crop.height<=(Math.floor(q/2)+1)*540+1e-6);}
    for(const target of adapted.shots[0].panels[i].targets)for(const ref of target.refs){const b=faces.find(f=>f.id===ref).box;assert.ok(crop.x<=b.xmin&&crop.y<=b.ymin&&crop.x+crop.width>=b.xmax&&crop.y+crop.height>=b.ymax,'every grouped face must remain inside crop');}
   }
   result.checks.push('\uc120\ud0dd \uc778\uc6d0 \uc218·\uc6d0\ubcf8 \ud328\ub110 \uacbd\uacc4·\uc804\uccb4 \uc0d8\ud50c·\uc804\uccb4 \uadf8\ub8f9 \uc778\ubb3c \ubcf4\uc874·\uc2dc\uac04 \ubc94\uc704·\ucd9c\ub825 \uba74\uc801 \uac80\uc99d');
   fs.writeFileSync(path.join(dir,c.id+'.json'),JSON.stringify({plan,resolvedPlan:adapted,compiled},null,2));
   for(const [j,s] of observations.entries()){
    const data='data:image/jpeg;base64,'+fs.readFileSync(path.join(root,s.file)).toString('base64');
    const Source=()=>React.createElement('img',{'data-source':true,src:data,style:{width:1920,height:1080,display:'block'}});
    const video=renderToStaticMarkup(React.createElement(effect.exports.default,{Source,data:compiled})),overlay=renderToStaticMarkup(React.createElement(f.RadioPreviewFrame,{data:frameData}));
    await page.setContent(`<body style="margin:0;background:black"><div style="position:absolute;left:0;top:${L.windowTop}px;width:1920px;height:1080px;transform-origin:0 0;transform:scale(${1080/1920},${(L.windowBottom-L.windowTop)/1080})">${video}</div><div style="position:absolute;inset:0;pointer-events:none">${overlay}</div></body>`);
    await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
    assert.equal(await page.locator('[data-source]').count(),compiled.panels.length);
    const file=c.id+'-'+j+'.jpg';await page.screenshot({path:path.join(dir,file),quality:90});result.images.push({file,sourceSeconds:s.sourceSeconds});
   }
   result.checks.push('\uc2e4\uc81c TSX \ud6a8\uacfc + \uc774\uad00 \ud15c\ud50c\ub9bf\uc744 Chrome\uc5d0\uc11c \ub80c\ub354\ub9c1: \uc0d8\ud50c\ubcc4 \ucd9c\ub825 \ucea1\ucc98');result.status='passed';
  }catch(e){result.error=e.stack;}
 }
})().catch(e=>{report.error=e.stack;}).finally(async()=>{
 if(browser)await browser.close();report.status=!report.error&&report.results.length===cases.cases.length&&report.results.every(r=>r.status==='passed')?'passed':'failed';
 fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(report,null,2));
 fs.writeFileSync(path.join(dir,'index.html'),shell('\ubd84\ud560 \ud14c\uc2a4\ud2b8 \uc2e4\ud589 '+id,`<a href="../../index.html">\ucf00\uc774\uc2a4 \ubaa9\ub85d</a><p>${report.status} · ${esc(report.scope)}</p><p>\uc774 \uacb0\uacfc\ub294 \uc544\ub798 \uc81c\ud55c \ubc94\uc704\uc758 \ud1b5\uacfc\uc774\uba70 \uc804\uccb4 \uc0dd\uc131 E2E \ud1b5\uacfc\uac00 \uc544\ub2d9\ub2c8\ub2e4.</p><ul>${report.limitations.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><a href="report.json">\uc2e4\ud589 \uba54\ud0c0\ub370\uc774\ud130 / \uc624\ub958 / \uc785\ub825 \ud574\uc2dc</a>${report.error?`<pre>${esc(report.error)}</pre>`:''}${report.results.map(r=>`<section><h2>${esc(r.description)} · ${r.status}</h2>${r.scales?`<p>\ubc30\uc728: ${r.scales.map(s=>s.toFixed(3)+"×").join(" | ")}</p>`:""}${r.groups?`<p>\ubc30\uce58: ${esc(r.groups.map(g=>g.join(" + ")).join(" | "))}</p>`:""}${r.error?`<pre>${esc(r.error)}</pre>`:''}<ul>${r.checks.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><a href="${r.id}.json">\uc785\ub825 \uacc4\ud68d\uacfc \ucef4\ud30c\uc77c \uacb0\uacfc</a><div class="grid">${r.images.map(i=>`<figure><a href="${i.file}"><img src="${i.file}"></a><figcaption>${i.sourceSeconds}s</figcaption></figure>`).join('')}</div></section>`).join('')}`));
 const runs=fs.readdirSync(path.join(root,'test-runs')).filter(n=>fs.existsSync(path.join(root,'test-runs',n,'report.json'))).sort().reverse();
 fs.writeFileSync(path.join(root,'index.html'),shell('\uc20f\ud3fc \uc2e4\uc81c \uc601\uc0c1 \ud68c\uadc0 \ud14c\uc2a4\ud2b8',`<p>\uc870\uc120\uc77c\ubcf4 / \ud751\ubc31\uc5ec\uc758\ub3c4 · \uace0\uc815 \uc785\ub825 \uc7ac\uc2e4\ud589. \uc2e4\ud589\ubcc4 \uacb0\uacfc\ub294 \uc0c8 \ud3f4\ub354\uc5d0 \ubcf4\uc874\ud569\ub2c8\ub2e4.</p><h2>\uc6d0\ubcf8\uacfc \uc694\uccad \uad6c\uac04</h2>${cases.references.map(r=>`<section><a href="${r.url}">${r.range.join('–')}\ucd08 · \uc694\uccad ${r.requested}</a><p>${r.status}: ${r.observed}</p>${r.evidence?`<img src="${r.evidence}">`:'<img src="fixtures/heukbaek-4/0.jpg">'}</section>`).join('')}<h2>\ud14c\uc2a4\ud2b8 \ucf00\uc774\uc2a4</h2><ul>${cases.cases.map(c=>`<li>${esc(c.id)}: ${esc(c.description)}</li>`).join('')}</ul><h2>\uac80\uc99d \ubc94\uc704\uc640 \ubbf8\ud574\uacb0 \ud56d\ubaa9</h2><ul>${cases.limitations.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><h2>\uc2e4\ud589 \uc774\ub825</h2><p>\ucd08\uae30 3\uac1c \uc2e4\ud589 \uae30\ub85d\uc758 3\ubd84\ud560\uc740 \uace0\uac1d \uc694\uad6c\uc640 \ub2e4\ub974\uac8c \ud574\uc11d\ud55c \ubcf4\uc870 \uac80\uc0ac\uc785\ub2c8\ub2e4. \ucd5c\uc2e0 \ucf00\uc774\uc2a4\ub294 \uc804\uccb4\uc0f7\uc758 \ubaa8\ub4e0 \uc778\ubb3c\uc744 \ubcf4\uc874\ud569\ub2c8\ub2e4.</p><ul>${runs.map(n=>{const r=JSON.parse(fs.readFileSync(path.join(root,'test-runs',n,'report.json')));return `<li><a href="test-runs/${n}/index.html">${n}</a> · ${r.status}</li>`;}).join('')}</ul><p>\uc7ac\uc2e4\ud589 \ubc29\ubc95: README.md · \ucf00\uc774\uc2a4 \uc6d0\ubcf8: cases.json</p>`));
 console.log(JSON.stringify({id,status:report.status,results:report.results.map(r=>({id:r.id,status:r.status,error:r.error})),error:report.error}));if(report.status!=='passed')process.exitCode=1;
});
