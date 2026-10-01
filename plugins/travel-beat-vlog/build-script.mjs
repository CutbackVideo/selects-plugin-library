#!/usr/bin/env node
import {buildFinishScript,buildCutoutScript,scenePlan,slotNeeds,musicFile,gradeClips,heroCutout} from './operation.mjs';
try{
 let body='';
 if(process.argv[2]){if(!/^[A-Za-z0-9_-]{1,300000}$/.test(process.argv[2]))throw Error('Invalid encoded input');body=Buffer.from(process.argv[2],'base64url').toString('utf8');}
 else for await(const chunk of process.stdin){body+=chunk;if(body.length>400000)throw Error('Input is too large');}
 const input=JSON.parse(body);
 const out=v=>process.stdout.write(typeof v==='string'?v:JSON.stringify(v));
 if(input?.mode==='plan')out(scenePlan(input.fps??30));
 else if(input?.mode==='needs')out(slotNeeds());
 else if(input?.mode==='music')out(musicFile());
 else if(input?.mode==='grade')out(gradeClips(input.clips,Number(input.strength??1)));
 else if(input?.mode==='cutout')out(heroCutout(input.photo,input.cutoutMode||'person'));
 else if(input?.mode==='finish')out(buildFinishScript(input));
 else if(input?.mode==='cutoutFinish')out(buildCutoutScript(input));
 else throw Error('Unsupported mode');
}catch(error){process.stderr.write(String(error?.message||error)+'\n');process.exitCode=1;}
