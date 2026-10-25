const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
test('source controls reframe original pixels inside an unchanged cell and reset exactly',{skip:!process.env.SBS_PANEL_TEST_MODULES},()=>{
 const dep=createRequire(path.resolve(process.env.SBS_PANEL_TEST_MODULES,'../package.json')),es=dep('esbuild'),m={exports:{}};
 new Function('require','module','exports',es.transformSync(fs.readFileSync(path.join(__dirname,'../panel.tsx'),'utf8')+'\nexport {STACKED_REFRAME_EFFECT,SOURCE_PANEL_CONTROLS};',{loader:'tsx',format:'cjs'}).code)(dep,m,m.exports);
 const effect={exports:{}};new Function('require','module','exports',es.transformSync(m.exports.STACKED_REFRAME_EFFECT,{loader:'tsx',format:'cjs'}).code)(n=>n==='remotion'?{AbsoluteFill:'main'}:dep(n),effect,effect.exports);
 const data={sourceW:1920,sourceH:1080,windowH:800,panels:[{fit:'region',rect:{x:500,y:200,width:500,height:600},destination:{x:.5,y:0,width:.5,height:.5}}]};
 const render=values=>effect.exports.default({Source:()=>null,data:{...data,...values}}).props.children[0];
 const before=render({}),changed=render({sourceX:10,sourceY:-10,sourceZoom:75}),reset=render({sourceX:0,sourceY:0,sourceZoom:100});
 assert.deepEqual(before.props.style,changed.props.style);
 const picture=node=>node.props.children[1].props.style;
 assert.ok(picture(before).clipPath);assert.equal(picture(changed).clipPath,undefined);
 assert.notEqual(picture(before).transform,picture(changed).transform);assert.notEqual(picture(before).left,picture(changed).left);assert.notEqual(picture(before).top,picture(changed).top);
 assert.deepEqual(picture(before),picture(reset));
 assert.deepEqual(m.exports.SOURCE_PANEL_CONTROLS.map(x=>x.key),['sourceX','sourceY','sourceZoom']);
 for(const panel of [{w:500,cx:960,cy:500},{fit:'contain'},data.panels[0]])assert.doesNotThrow(()=>effect.exports.default({Source:()=>null,data:{...data,panels:[panel]}}));
});
