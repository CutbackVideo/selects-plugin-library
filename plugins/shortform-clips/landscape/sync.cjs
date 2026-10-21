// Refresh standalone panel copies after editing the landscape source files.
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),p=path.join(root,'panel.tsx');let s=fs.readFileSync(p,'utf8');
const graphic=fs.readFileSync(path.join(__dirname,'graphic.tsx'),'utf8'),runtime=fs.readFileSync(path.join(__dirname,'runtime.ts'),'utf8');
const ascii=v=>JSON.stringify(v).replace(/[\u007f-\uffff]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
const component=graphic.replace("import React from 'react';\n",'').replace('export default function','function');
const a=s.indexOf('\n// Shared by template preview')+1,b=s.indexOf('function cropTransform(',a);
s=s.slice(0,a)+component.trimStart()+'\n'+runtime+'\nconst LANDSCAPE_GRAPHIC_TSX = '+ascii(graphic)+';\n'+s.slice(b);
const lines=s.split('\n'),i=lines.findIndex(l=>l.startsWith('const SCRIPT_BUILD:'));const m=lines[i].match(/("(?:[^"\\]|\\.)*");$/);let build=JSON.parse(m[1]);
const start=build.indexOf('// These helpers are embedded'),end=build.indexOf('const FRAME_TSX:',start);
build=build.slice(0,start)+runtime+'\nconst LANDSCAPE_GRAPHIC_TSX = '+ascii(graphic)+';\n'+build.slice(end);
lines[i]=lines[i].slice(0,m.index)+ascii(build)+';';fs.writeFileSync(p,lines.join('\n'));
