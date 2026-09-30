#!/usr/bin/env node
import {buildFinishScript,scenePlan,unpackAssets} from './operation.mjs';
try{
 let body='';
 if(process.argv[2]){if(!/^[A-Za-z0-9_-]{1,300000}$/.test(process.argv[2]))throw Error('Invalid encoded input');body=Buffer.from(process.argv[2],'base64url').toString('utf8');}
 else for await(const chunk of process.stdin){body+=chunk;if(body.length>200000)throw Error('Input is too large');}
 const input=JSON.parse(body);
 if(input?.mode==='plan')process.stdout.write(JSON.stringify(scenePlan(input.fps??30)));
 else if(input?.mode==='assets')process.stdout.write(JSON.stringify(unpackAssets()));
 else if(input?.mode==='finish')process.stdout.write(buildFinishScript(input));
 else throw Error('Unsupported mode');
}catch(error){process.stderr.write(String(error?.message||error)+'\n');process.exitCode=1;}
