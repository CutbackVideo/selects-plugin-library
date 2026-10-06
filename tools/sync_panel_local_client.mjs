// Panels are distributed as single files. Keep their private adapter identical to
// the canonical build input; the app's public SDK remains runScript/call.
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const shared=readFileSync(path.join(root,'shared/local-client.ts'),'utf8')
  .replace(/^import React from "react";\n/,'')
  .replace(/\nexport \{[^}]+\};\s*$/,'');
function visit(directory) {
  for(const entry of readdirSync(directory,{withFileTypes:true})) {
    const file=path.join(directory,entry.name);
    if(entry.isDirectory())visit(file);
    else if(entry.name.endsWith('.tsx')) {
      const source=readFileSync(file,'utf8');
      const start=source.indexOf('// local-sdk:start\n');
      const end=source.indexOf('// local-sdk:end',start);
      if(start<0||end<0)continue;
      const exported=source.slice(start,end).match(/export default withPanelLocalClient\(\w+\);/);
      if(!exported)throw new Error(`Missing panel wrapper in ${file}`);
      writeFileSync(file,source.slice(0,start)+'// local-sdk:start\n'+shared+'\n'+exported[0]+'\n// local-sdk:end'+source.slice(end+'// local-sdk:end'.length));
    }
  }
}
visit(path.join(root,'plugins'));
