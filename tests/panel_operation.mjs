// Loads the plan and finishing-step code a Panel carries between its
// `// @operation-start` and `// @operation-end` lines: the same code the installed
// Panel runs. A `<name>Source` export is a function kept as source text (the Panel
// sends it to run_script or an effect as written); it is also returned compiled
// as `<name>` so tests can call it.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';

export function loadPanelOperation(id){
 const source=fs.readFileSync(path.resolve(import.meta.dirname,'../plugins',id,'panel.tsx'),'utf8');
 const start=source.indexOf('// @operation-start'),end=source.indexOf('// @operation-end');
 if(start<0||end<start)throw Error('No operation section in '+id+'/panel.tsx');
 const body=source.slice(start,end);
 const names=[...body.matchAll(/^export (?:async )?(?:const|function) ([A-Za-z_$][\w$]*)/gm)].map(m=>m[1]);
 // A compiled `<name>Source` sees the section's constants, as it did in the module.
 const compiled=names.filter(n=>n.endsWith('Source')).map(n=>n.slice(0,-'Source'.length)+':eval("("+'+n+'+")")');
 return vm.runInThisContext('(function(){'+body.replace(/^export (?=(?:async )?(?:const|function) )/gm,'')+'\nreturn {'+[...names,...compiled].join(',')+'};})()');
}

// Runs a Panel's shell step as the Selects shell would, with only the system tools
// on PATH (no Node.js), HOME at a test folder and the plugins installed from here.
export function runPanelShell(command,{home,shell='/bin/sh'}){
 return spawnSync(shell,['-c',command],{encoding:'utf8',env:{PATH:'/usr/bin:/bin',HOME:home,SELECTS_USER_SKILLS_ROOT:path.resolve(import.meta.dirname,'../plugins')}});
}
