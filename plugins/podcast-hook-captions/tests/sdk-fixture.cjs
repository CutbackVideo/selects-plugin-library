// Pipeline suites receive an initialized async local-client fixture. The shared
// client's runScript transport is tested separately; host gates stay real here.
const fs = require('node:fs/promises');
function sdkFixturePlugin() {
  return {name:'initialized-podcast-sdk-fixture',setup(build){
    build.onResolve({filter:/shared\/local-client$/},()=>({path:'local-client',namespace:'podcast-sdk-fixture'}));
    build.onLoad({filter:/.*/,namespace:'podcast-sdk-fixture'},()=>({contents:'export const panelLocalClient = sdk => sdk;',loader:'ts'}));
    build.onLoad({filter:/podcast-hook-captions\/src\/pipeline\/host\.ts$/},async args=>({
      contents:await fs.readFile(args.path,'utf8')+'\nglobalThis.__initializePodcastHost = hostUseSdk;',loader:'ts'}));
  }};
}
function initializedSdk(files,version='2.0.560') {
  return {files,media:{},environment:{get version(){return typeof version==='function'?version():version;},platform:'darwin'}};
}
module.exports={sdkFixturePlugin,initializedSdk};
function asyncMemoryFiles(files) {
  return {
    join:(...parts)=>parts.join('/'),
    exists:async name=>files.has(name)||[...files.keys()].some(file=>file.startsWith(name+'/')),
    readdir:async name=>[...files.keys()].filter(file=>file.startsWith(name+'/')).map(file=>file.slice(name.length+1)),
    readFile:async name=>files.get(name),
    writeFile:async(name,value)=>{files.set(name,value);},
    compareAndReplace:async(path,expected,text)=>{
      const current=files.has(path)?files.get(path):null;
      if(current!==expected)return false;
      files.set(path,text);return true;
    },
    rename:async(from,to)=>{if(!files.has(from))throw Error('Missing rename source');files.set(to,files.get(from));files.delete(from);},
  };
}
module.exports.asyncMemoryFiles=asyncMemoryFiles;
