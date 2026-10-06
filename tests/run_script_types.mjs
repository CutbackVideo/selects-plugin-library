// Check generated script bodies as Selects does: lenient on style, strict on
// inferred object shapes. Local SDK declarations additionally check API calls.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';

export function checkScriptTypes(scripts){
 const require=createRequire(import.meta.url);
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'panel-script-types-'));
 try{
  const files=[];
  const sdk=process.env.SELECTS_SDK_TYPES??path.join(os.homedir(),'.selects-staging','resources','sdk');
  const hasSdk=fs.existsSync(path.join(sdk,'core.d.ts'));
  if(process.env.SELECTS_SDK_TYPES&&!hasSdk)throw Error('SELECTS_SDK_TYPES does not contain core.d.ts');
  if(hasSdk){
   for(const filename of fs.readdirSync(sdk).filter(name=>name.endsWith('.d.ts'))){
    fs.copyFileSync(path.join(sdk,filename),path.join(temporary,filename));
    files.push(filename);
   }
  }else{
   fs.writeFileSync(path.join(temporary,'globals.d.ts'),'declare const selects: any;\n');
   files.push('globals.d.ts');
  }
  scripts.forEach(({name,script},index)=>{
   const filename=`script-${index}.ts`;
   // Module scope isolates each serialized request's inferred object types.
   fs.writeFileSync(path.join(temporary,filename),`// ${name}\nexport {};\n(async () => {\n${script}\n})();\n`);
   files.push(filename);
  });
  const config=path.join(temporary,'tsconfig.json');
  fs.writeFileSync(config,JSON.stringify({compilerOptions:{target:'ES2022',lib:['ES2022'],strict:false,noImplicitAny:false,skipLibCheck:true,types:[],noEmit:true,allowUnreachableCode:true},files}));

  let command,args;
  if(process.env.SELECTS_TSC){
   command=process.execPath;
   args=[process.env.SELECTS_TSC];
  }else{
   try{
    command=process.execPath;
    args=[require.resolve('typescript/bin/tsc')];
   }catch{
    // CI already uses npx TypeScript for the other plugins' script tests.
    command=process.platform==='win32'?'npx.cmd':'npx';
    args=['--yes','--package','typescript@5.9.3','tsc'];
   }
  }
  const result=spawnSync(command,[...args,'--project',config,'--pretty','false'],{encoding:'utf8',timeout:60_000});
  if(result.error||result.status!==0){
   throw Error('Generated script TypeScript check failed:\n'+(result.error?.message??'')+result.stdout+result.stderr);
  }
  return {scripts:scripts.length,sdkTypings:hasSdk};
 }finally{
  fs.rmSync(temporary,{recursive:true,force:true});
 }
}
