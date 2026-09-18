// @name iMessage Generator
// @icon captions
// English-first conversation overlays: use a standalone --- line for explicit page breaks; voice timing and fixed output preview are preserved.
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
const h = React.createElement;
const TAG = 'selects-imessage-generator-v1';
const LEGACY_DEMO = "\uc0c1\ub300: \uc9c0\uae08 \uc5b4\ub514\uc57c?\n\ub098: \uc9d1 \uc55e\uc774\uc57c. \ubb34\uc2a8 \uc77c\uc774\uc57c?\n\uc0c1\ub300: \ubb38 \uc55e\uc5d0 \uc791\uc740 \uc120\ubb3c \ub194\ub480\uc5b4.\n\ub098: \ud639\uc2dc\u2026 \uc774 \ucee4\ub2e4\ub780 \uc0c1\uc790?\n\uc0c1\ub300: \uc751. \uc5f4\uc5b4 \ubd10!\n\ub098: \uc7a0\uae50, \uc6b0\ub9ac \uc9d1 \uace0\uc591\uc774\uac00 \uba3c\uc800 \ub4e4\uc5b4\uac14\uc5b4 \ud83d\ude02";
const STORY_EXAMPLE = {"name": "Roommate", "script": "Them[0.4]: Don't panic.\nThem[0.4]: Tiny problem.\nThem: Your cake's gone.\n---\nMe: My BIRTHDAY cake?\nMe[0.45]: Who ate it?\nThem[0.55]: Check the camera.\n---\nThem: Kitchen. Midnight.\nMe[0.4]: Wait.\nMe: That's me.\nMe[0.60]: Holding a fork.\n---\nThem: Happy birthday.\nThem[0.65]: Case closed.", "timingMode": "tts", "fit": false, "afterSpeech": 0.18, "tailSeconds": 0.6};
const DEFAULTS = { script: STORY_EXAMPLE.script, name: STORY_EXAMPLE.name, fontFamily: '', fontSize: 34, widthPct: 78, topPct: 14, leftColor: '#26262b', rightColor: '#0c83fb', uiVersion: 3, unreadCount: 15, speed: 1, startSeconds: 0, fit: false, portrait: false, interval: 2.5, autoLength: true, tailSeconds: STORY_EXAMPLE.tailSeconds, timingMode: 'tts', afterSpeech: STORY_EXAMPLE.afterSpeech, voiceProvider: 'kokoro', localThem: 'af_heart', localMe: 'am_michael', cloudThem: '', cloudMe: '', speechRate: 1, voiceData: null };
const REFERENCE_EXAMPLE = {"name": "My Ex 🧙‍♀️🧹 😞", "script": "Them: Come back home, babe.\nThem: 🍆😛\nThem: Waiting on you.\nThem: Oops, wrong person.\nThem: Meant to send that to my current boyfriend. My bad.", "widthPct": 76.85185185185185, "topPct": 14.0625, "fontSize": 34, "fontFamily": "", "leftColor": "#26262b", "rightColor": "#0c83fb", "unreadCount": 15, "mode": "page", "uiVersion": 3};
const REFERENCE_QA = {"testedOn": "2026-09-10", "bitwiseIdentical": false, "nearPixelPass": false, "threshold": "At least 99% of foreground pixels within \u00b15 per RGB channel, with MAE \u22641/255.", "frames": [{"time": 4.216666, "pixels": 143708, "bitwise_identical": false, "exact_pixel_pct": 58.096, "within_5_per_channel_pct": 79.162, "mean_absolute_error_0_255": 14.4546, "rmse_0_255": 44.594}, {"time": 18.216666, "pixels": 119220, "bitwise_identical": false, "exact_pixel_pct": 36.948, "within_5_per_channel_pct": 70.455, "mean_absolute_error_0_255": 22.0614, "rmse_0_255": 57.91}, {"time": 25.216666, "pixels": 27271, "bitwise_identical": false, "exact_pixel_pct": 50.457, "within_5_per_channel_pct": 71.842, "mean_absolute_error_0_255": 26.7474, "rmse_0_255": 67.2968}], "encodedExample": {"pixels": 143687, "bitwise_identical": false, "exact_pixel_pct": 1.292, "within_5_per_channel_pct": 78.674, "mean_absolute_error_0_255": 14.8504, "rmse_0_255": 44.4612}};
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, Number(n))); }
function parseScript(text) {
  const lines = String(text).split(/\r?\n/); const result=[];let page=0,pendingPage=false;
  lines.forEach((line,i) => {
    if(!line.trim()) return;
    if(line.trim()==='---'){if(result.length)pendingPage=true;return;}
    const m=line.match(/^\s*(Them|Me|Left|Right|L|R|\uC0C1\uB300|\uB098|\uC67C\uCABD|\uC624\uB978\uCABD)(?:\[([\d.]+)\])?\s*[:：]\s*(.+)$/i);
    if(!m||!m[3].trim()) throw new Error('Line '+(i+1)+' is invalid. Use Them: message, Me: message, or --- on its own line.');
    if(m[3].length>240) throw new Error('Line '+(i+1)+' is too long. Split it into messages of 240 characters or fewer.');
    const hold=m[2]==null?null:Number(m[2]);
    if(hold!=null && (!Number.isFinite(hold)||hold<0||hold>30)) throw new Error('Line '+(i+1)+' has an invalid duration. Use 0 to 30 seconds.');
    if(pendingPage){page++;pendingPage=false;}
    result.push({ page, side:/^(Me|Right|R|\uB098|\uC624\uB978\uCABD)$/i.test(m[1])?'right':'left', text:m[3].trim(), hold });
  });
  if(!result.length) throw new Error('Enter at least one message.');
  if(result.length>100) throw new Error('You can create up to 100 messages at a time.');
  return result;
}
function storySvg(data,time,width,height) {
  // Geometry is measured against the reference's 345 px message card.
  // Text uses real browser font metrics rather than per-character estimates.
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const limit=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(n))?Number(n):a));
  const color=(v,f)=>/^#[0-9a-f]{6}$/i.test(String(v))?String(v):f;
  const left=color(data.leftColor,'#26262b'),right=color(data.rightColor,'#0c83fb');
  let messages=[];try{messages=JSON.parse(data.messagesJSON||'[]');}catch{return '';}
  if(!Array.isArray(messages))return '';
  const id='imsg-'+String(data.instanceKey||'preview').replace(/[^a-z0-9-]/gi,'')+'-'+Math.round(time*1000);
  const W=1080,H=1080*height/width;
  const cardW=Math.min(W*limit(data.widthPct??78,45,96)/100,H*1.38),scale=cardW/345;
  const x=(W-cardW)/2,header=69,corner=14;
  const top=Math.max(0,Math.min(H*limit(data.topPct??14,0,65)/100,H-154*scale));
  const font=limit(data.fontSize??34,24,56)*13.2/34;
  const lineHeight=font*18/13.2,px=10,py=4.5,margin=18,maxBubble=264;
  const availableBody=Math.max(0,(H-top)/scale-header-10);
  const family=String(data.fontFamily||'').trim()?('"'+String(data.fontFamily).replace(/["\\]/g,'')+'", Arial, sans-serif'):'Arial, Helvetica, sans-serif';
  let ctx=null;
  try{if(typeof document!=='undefined'){if(!storySvg._canvas)storySvg._canvas=document.createElement('canvas');ctx=storySvg._canvas.getContext('2d');}}catch{}
  if(ctx)ctx.font='400 '+font+'px '+family;
  const measure=(text)=>ctx?ctx.measureText(text).width:Array.from(text).reduce((n,c)=>n+(/\s/.test(c)?0.28:/[ilI.,!':;|]/.test(c)?0.28:/[MW@#]/.test(c)?0.86:/[\u0000-\u00ff]/.test(c)?0.54:1),0)*font;
  const cap=maxBubble-px*2;
  const wrap=text=>{
    const out=[];let line='';
    let tokens=String(text).match(/[A-Za-z0-9À-ž]+(?:['’][A-Za-z0-9À-ž]+)*[^\S\r\n]*|[^\S\r\n]+|[^]/gu)||[];
    try{if(typeof Intl!=='undefined'&&Intl.Segmenter)tokens=Array.from(new Intl.Segmenter(undefined,{granularity:'word'}).segment(String(text)),r=>r.segment);}catch{}
    for(const token of tokens){
      if(measure(line+token.trimEnd())<=cap){line+=token;continue;}
      if(line.trim()){out.push(line.trimEnd());line='';}
      if(measure(token.trim())<=cap){line=token.trimStart();continue;}
      let parts=Array.from(token);
      try{if(typeof Intl!=='undefined'&&Intl.Segmenter)parts=Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(token),r=>r.segment);}catch{}
      for(const c of parts){if(measure(line+c)>cap&&line){out.push(line.trimEnd());line='';}line+=c;}
    }
    if(line.trim())out.push(line.trimEnd());
    return out.length?out:[''];
  };
  const gap=(a,b)=>a&&a.side===b.side?2:7;
  const layoutKey=JSON.stringify([data.messagesJSON,font,family,width,height,cardW,top,typeof document!=='undefined'?document.fonts?.status:'no-dom']);
  let cached=storySvg._layoutCache;
  if(!cached||cached.key!==layoutKey){
    const all=messages.filter(m=>m&&typeof m.text==='string').map(m=>{
      const lines=wrap(m.text),bw=lines.length>1?maxBubble:Math.min(maxBubble,Math.max(4,...lines.map(measure))+px*2);
      return {...m,page:Number.isInteger(m.page)&&m.page>=0?m.page:0,lines,font,lineHeight,w:bw,h:Math.max(27,lines.length*lineHeight+py*2)};
    });
    const groups=new Map();for(const m of all){if(!groups.has(m.page))groups.set(m.page,[]);groups.get(m.page).push(m);}
    const pages=Array.from(groups,([page,items])=>({page,height:Math.max(42,15+items.reduce((n,m,i)=>n+m.h+(i?gap(items[i-1],m):0),0)),count:items.length}));
    cached={key:layoutKey,all,pages};storySvg._layoutCache=cached;
  }
  const visible=cached.all.filter(m=>Number(m.start)<=time);
  const activePage=visible.length?visible[visible.length-1].page:(cached.all[0]?.page||0);
  const rows=visible.filter(m=>m.page===activePage);
  const body=Math.max(42,15+rows.reduce((n,m,i)=>n+m.h+(i?gap(rows[i-1],m):0),0)),offset=0;
  const overflowPages=cached.pages.filter(p=>p.height>availableBody+.01).map(p=>p.page+1);
  const bottom=header+body;
  const cardPath='M 14 0 H 331 Q 345 0 345 14 V '+(bottom-14)+' Q 345 '+bottom+' 331 '+bottom+' H 14 Q 0 '+bottom+' 0 '+(bottom-14)+' V 14 Q 0 0 14 0 Z';
  let s='<svg data-active-page="'+(activePage+1)+'" data-page-count="'+cached.pages.length+'" data-overflow-pages="'+overflowPages.join(',')+'" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+W+' '+H+'"><defs><filter id="'+id+'-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2.4" flood-opacity="0.32"/></filter><linearGradient id="'+id+'-header"><stop offset="0" stop-color="#292929"/><stop offset="0.58" stop-color="#272a2e"/><stop offset="1" stop-color="#20364a"/></linearGradient><linearGradient id="'+id+'-avatar" x2="0" y2="1"><stop stop-color="#a6aab2"/><stop offset="1" stop-color="#9397a0"/></linearGradient><clipPath id="'+id+'-card"><path d="'+cardPath+'"/></clipPath><clipPath id="'+id+'-body"><rect x="0" y="'+header+'" width="345" height="'+body+'"/></clipPath></defs>';
  s+='<g transform="translate('+x+' '+top+') scale('+scale+')" font-family="'+esc(family)+'" font-weight="400"><path d="'+cardPath+'" fill="#000" filter="url(#'+id+'-shadow)"/><g clip-path="url(#'+id+'-card)"><rect width="345" height="69" fill="url(#'+id+'-header)"/>';
  s+='<circle cx="172.5" cy="25" r="17.5" fill="url(#'+id+'-avatar)"/><text x="172.5" y="29.6" text-anchor="middle" fill="white" font-size="13.5">'+esc(Array.from(String(data.name||'Friend'))[0])+'</text>';
  const name=String(data.name||'Friend').slice(0,24);let nameWidth=measure(name)*13.2/font;
  s+='<text x="172.5" y="58.5" fill="white" text-anchor="middle" font-size="13.2">'+esc(name)+'</text><path d="M '+(172.5+nameWidth/2+3.5)+' 51.8 l 3 3.2 l -3 3.2" stroke="#e6e7e9" stroke-width="1" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
  s+='<path d="M 20 14 L 13 21 L 20 28" fill="none" stroke="'+right+'" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>';
  const unread=Math.round(limit(data.unreadCount??15,0,999));if(unread){const txt=String(unread),bw=Math.max(20,txt.length*6+6);s+='<rect x="23" y="13" width="'+bw+'" height="16" rx="8" fill="'+right+'"/><text x="'+(23+bw/2)+'" y="25" fill="white" text-anchor="middle" font-size="12">'+txt+'</text>';}
  s+='<rect x="307" y="15" width="17.5" height="14" rx="3" fill="none" stroke="'+right+'" stroke-width="1.4"/><path d="M 324.5 19 L 330 15.5 Q 331 15 331 16.2 V 27.8 Q 331 29 330 28.5 L 324.5 25" fill="none" stroke="'+right+'" stroke-width="1.4" stroke-linejoin="round"/>';
  s+='<g clip-path="url(#'+id+'-body)">';let yy=header+9-offset;
  for(let i=0;i<rows.length;i++){
    const m=rows[i];if(i)yy+=gap(rows[i-1],m);
    const isRight=m.side==='right',xx=isRight?345-margin-m.w:margin;
    const a=Math.min(1,Math.max(0,time-Number(m.start))/0.12),dy=(1-a)*(1-a)*4;
    const fill=isRight?right:left,tail=!rows[i+1]||rows[i+1].side!==m.side;
    s+='<g data-part="message" data-side="'+m.side+'" opacity="'+a+'" transform="translate('+xx+' '+(yy+dy)+')" fill="'+fill+'">';
    if(tail){
      const w=m.w,h=m.h,r=Math.min(corner,h/2),c=r*0.55228475;
      const path='M '+r+' 0 H '+(w-r)+' C '+(w-r+c)+' 0 '+w+' '+(r-c)+' '+w+' '+r+' V '+(h-12)+' C '+w+' '+(h-6)+' '+(w+2)+' '+(h-2)+' '+(w+8)+' '+(h-1)+' C '+(w+2)+' '+(h+1)+' '+(w-3)+' '+(h-1)+' '+(w-7)+' '+(h-4)+' C '+(w-10)+' '+(h-1)+' '+(w-13)+' '+h+' '+(w-17)+' '+h+' H '+r+' C '+(r-c)+' '+h+' 0 '+(h-r+c)+' 0 '+(h-r)+' V '+r+' C 0 '+(r-c)+' '+(r-c)+' 0 '+r+' 0 Z';
      s+='<path data-part="bubble" data-tail="true" d="'+path+'"'+(isRight?'':' transform="translate('+w+' 0) scale(-1 1)"')+'/>';
    }else{s+='<rect data-part="bubble" data-tail="false" width="'+m.w+'" height="'+m.h+'" rx="'+Math.min(corner,m.h/2)+'"/>';}
    m.lines.forEach((line,j)=>{s+='<text x="'+(px+0.75)+'" y="'+(py+2+m.font*0.94+j*m.lineHeight)+'" font-size="'+m.font+'" fill="white">'+esc(line)+'</text>';});
    s+='</g>';yy+=m.h;
  }
  return s+'</g></g></g></svg>';
}
const GRAPHIC = 'import React from "react";\nimport {useCurrentFrame,useVideoConfig} from "remotion";\n'+'const storySvg = '+storySvg.toString()+';\nexport default function IMessageStory({data}){const frame=useCurrentFrame();const config=useVideoConfig();const instanceKey=typeof React.useId==="function"?React.useId():"graphic";return React.createElement("div",{style:{position:"absolute",inset:0,width:"100%",height:"100%"},dangerouslySetInnerHTML:{__html:storySvg({...data,instanceKey},frame/config.fps,config.width,config.height)}});}';
const editableParameters = [
  {key:'name',label:'Contact',type:'text',defaultValue:'Friend'},
  {key:'fontFamily',label:'Font',type:'text',defaultValue:''},
  {key:'fontSize',label:'Font size',type:'number',defaultValue:34,min:24,max:56,step:1},
  {key:'widthPct',label:'Chat width (%)',type:'number',defaultValue:78,min:45,max:96,step:1},
  {key:'topPct',label:'Position (%)',type:'number',defaultValue:14,min:0,max:65,step:1},
  {key:'leftColor',label:'Incoming bubble',type:'color',defaultValue:'#26262b'},
  {key:'rightColor',label:'Outgoing bubble',type:'color',defaultValue:'#0c83fb'}
];
async function readDraft(sdk,pid,sid) {
  const r=await sdk.runScript({summary:'Read current draft',allowCommit:false,script:`
    const p=(await selects.listProjects()).find(p=>p.id===${JSON.stringify(pid)});
    if(!p||!p.draftIds.includes(${JSON.stringify(sid)}))throw new Error('Open an editable Draft in the current Project.');
    const d=selects.draft(${JSON.stringify(sid)});const m=await d.meta();const c=await d.clips({trackScope:'main'});
    return {name:m.name,width:m.frameSize.width,height:m.frameSize.height,fps:m.fps,endFrame:c.reduce((n,c)=>Math.max(n,c.endFrame),0)};`});
  if(r.isError)throw new Error(r.output);
  if(!r.result)throw new Error('No Draft information was returned. Reload the panel.');
  return r.result;
}
const LOCAL_TTS_PY = "import json,sys,hashlib,wave,subprocess\nfrom pathlib import Path\nimport numpy as np\nfrom kokoro_onnx import Kokoro\njob=json.loads(Path(sys.argv[1]).read_text());root=Path(job['root']).resolve();root.mkdir(parents=True,exist_ok=True);engine=Path(job['engineRoot']).resolve()\nmodel=engine/'kokoro-v1.0.int8.onnx';voices=engine/'voices-v1.0.bin'\nk=None;out=[];total=0;available=set(np.load(voices,allow_pickle=False).files)\nfor row in job['rows']:\n if Path(job['cancelPath']).exists():print(json.dumps({'cancelled':True,'pieces':out}));sys.exit(0)\n text=str(row['text']);voice=str(row['voice']);speed=float(job.get('rate',1))\n if voice not in available or not voice.startswith(('af_','am_','bf_','bm_')):raise ValueError('Choose an available English voice')\n if not .7<=speed<=1.2:raise ValueError('Speech rate is out of range')\n if not text.strip() or len(text)>1000:raise ValueError('Invalid message length')\n key=hashlib.sha256(json.dumps(['kokoro-v1-int8',voice,speed,text],ensure_ascii=False).encode()).hexdigest()[:32];wav=root/(key+'.wav');silent=not any(c.isalnum() for c in text)\n if not wav.exists():\n  if silent:\n   with wave.open(str(wav),'wb')as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(44100);f.writeframes(b'')\n  else:\n   if k is None:k=Kokoro(str(model),str(voices))\n   audio,sr=k.create(text,voice=voice,speed=speed,lang='en-gb' if voice.startswith('b') else 'en-us')\n   if not len(audio):raise ValueError('This English voice could not read a message. Rewrite the text.')\n   raw=root/(key+'-raw.wav')\n   with wave.open(str(raw),'wb')as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(sr);f.writeframes((np.clip(audio,-1,1)*32767).astype('<i2').tobytes())\n   subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(raw),'-ac','1','-ar','44100','-c:a','pcm_s16le',str(wav)],check=True,capture_output=True,timeout=90);raw.unlink(missing_ok=True)\n with wave.open(str(wav),'rb')as f:\n  duration=f.getnframes()/f.getframerate()\n  if duration<0 or duration>180 or (duration==0 and not silent):raise ValueError('Invalid generated speech duration')\n  info={'file':str(wav),'duration':duration,'frames':f.getnframes(),'sampleRate':f.getframerate(),'voice':voice,'silent':silent}\n total+=duration\n if total>600:raise ValueError('Keep generated speech below 10 minutes per conversation')\n out.append(info)\n if job.get('progressPath'):\n  Path(job['progressPath']).write_text(json.dumps({'done':len(out),'total':len(job['rows'])}))\nprint(json.dumps({'root':str(root),'pieces':out,'totalSpeechSeconds':total,'engine':'Kokoro v1.0 int8'}))\n";
const SETUP_KOKORO_PY = "import os,sys,json,subprocess,shutil,urllib.request,hashlib\nfrom pathlib import Path\nroot=Path(sys.argv[1]).expanduser().resolve();root.mkdir(parents=True,exist_ok=True)\nif root.name!='kokoro-v1':raise ValueError('Unexpected engine directory')\nlock=root/'install.lock'\ndef acquire_lock():\n try:\n  fd=os.open(lock,os.O_CREAT|os.O_EXCL|os.O_WRONLY)\n  with os.fdopen(fd,'w')as f:f.write(str(os.getpid()))\n except FileExistsError:\n  try:pid=int(lock.read_text().strip())\n  except ValueError:raise RuntimeError('An incomplete setup lock was found. Check that setup is stopped before removing '+str(lock))\n  try:os.kill(pid,0)\n  except ProcessLookupError:lock.unlink();return acquire_lock()\n  raise RuntimeError('Engine setup is already running. Wait before trying again.')\nacquire_lock()\ntry:\n python=None\n for name in ['python3.12','python3.11','python3.13','python3.10']:\n  candidate=shutil.which(name)\n  if candidate:python=candidate;break\n if not python and (3,10)<=sys.version_info[:2]<(3,14):python=sys.executable\n if not python:raise RuntimeError('Python 3.10\u20133.13 is required. Install it, then retry setup.')\n venv=root/'venv';exe=venv/('Scripts/python.exe' if os.name=='nt' else 'bin/python')\n if not exe.exists():subprocess.run([python,'-m','venv',str(venv)],check=True)\n env=dict(os.environ,PIP_CACHE_DIR=str(root/'pip-cache'))\n subprocess.run([str(exe),'-m','pip','install','--disable-pip-version-check','--no-input','-q','kokoro-onnx==0.6.1'],check=True,env=env,stdout=sys.stderr)\n assets=[('kokoro-v1.0.int8.onnx',114119327,'ae315a79b623f244700e4afb9246c46a26066782e049ba174bf3ba433970ee9c'),('voices-v1.0.bin',28214398,'bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d')]\n def digest(p):\n  h=hashlib.sha256()\n  with p.open('rb')as f:\n   for c in iter(lambda:f.read(1048576),b''):h.update(c)\n  return h.hexdigest()\n for name,size,expected in assets:\n  dest=root/name\n  if not dest.exists() or digest(dest)!=expected:\n   tmp=root/(name+'.part');url='https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/'+name\n   with urllib.request.urlopen(url,timeout=90)as response,tmp.open('wb')as f:shutil.copyfileobj(response,f,1048576)\n   if tmp.stat().st_size!=size or digest(tmp)!=expected:tmp.unlink(missing_ok=True);raise RuntimeError('Model download failed integrity verification: '+name)\n   tmp.replace(dest)\n for name,url in [('MODEL-CARD.md','https://huggingface.co/hexgrad/Kokoro-82M/raw/main/README.md'),('MODEL-LICENSE.txt','https://www.apache.org/licenses/LICENSE-2.0.txt'),('RUNTIME-LICENSE.txt','https://raw.githubusercontent.com/thewh1teagle/kokoro-onnx/main/LICENSE')]:\n  if not (root/name).exists():(root/name).write_bytes(urllib.request.urlopen(url,timeout=30).read())\n probe=subprocess.check_output([str(exe),'-c',\"import numpy as np,json,sys; names=np.load(sys.argv[1],allow_pickle=False).files;print(json.dumps([{'id':n,'name':n[3:].replace('_',' ').title(),'locale':'en_US' if n.startswith('a') else 'en_GB'} for n in names if n.startswith(('af_','am_','bf_','bm_'))]))\",str(root/'voices-v1.0.bin')],text=True)\n voices=json.loads(probe);(root/'voices.json').write_text(json.dumps(voices,indent=2))\n manifest={'ready':True,'python':str(exe),'engineRoot':str(root),'model':'kokoro-v1.0.int8.onnx','modelSha256':assets[0][2],'voicesSha256':assets[1][2],'modelLicense':'Apache-2.0','runtimeLicense':'MIT','package':'kokoro-onnx==0.6.1','voices':voices}\n (root/'engine.json').write_text(json.dumps(manifest,indent=2));print(json.dumps(manifest))\nfinally:lock.unlink(missing_ok=True)\n";
const AUDIO_PROCESS_PY = "import sys,json,subprocess,wave,hashlib,math\nfrom pathlib import Path\njob=json.loads(Path(sys.argv[1]).read_text());root=Path(job['root']).resolve();root.mkdir(parents=True,exist_ok=True)\ndef inside(path):\n p=Path(path).resolve()\n if root!=p and root not in p.parents:raise ValueError('Audio file is outside this generated-voice workspace')\n return p\nif job['action']=='normalize':\n pieces=[]\n for row in job['rows']:\n  if row.get('silent'):\n   dst=root/'silent-message.wav'\n   if not dst.exists():\n    with wave.open(str(dst),'wb')as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(44100);f.writeframes(b'')\n   src=dst\n  else:src=inside(row['file']);dst=src.with_suffix('.wav')\n  if not dst.exists():subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(src),'-ac','1','-ar','44100','-c:a','pcm_s16le',str(dst)],check=True,capture_output=True,timeout=90)\n  with wave.open(str(dst),'rb')as f:pieces.append({'file':str(dst),'duration':f.getnframes()/f.getframerate(),'frames':f.getnframes(),'sampleRate':f.getframerate(),'voice':row['voice']})\n if sum(p['duration'] for p in pieces)>600:raise ValueError('Keep generated speech below 10 minutes per conversation')\n print(json.dumps({'root':str(root),'pieces':pieces}));sys.exit(0)\nif job['action']!='mix':raise ValueError('Unknown audio action')\nrows=job['rows'];duration=float(job['duration']);sr=44100\nif not 0<duration<=1800:raise ValueError('Conversation must be between 0 and 1800 seconds')\nparts=[];digest=hashlib.sha256(json.dumps({'rows':rows,'duration':duration},sort_keys=True).encode())\nfor row in rows:\n src=inside(row['file']);raw=src.read_bytes();digest.update(raw)\n with wave.open(str(src),'rb')as f:\n  if f.getnchannels()!=1 or f.getsampwidth()!=2 or f.getframerate()!=sr:raise ValueError('Regenerate voices: invalid cached audio format')\n  if abs(f.getnframes()/sr-float(row['speechDuration']))>1/sr+.0001:raise ValueError('Cached audio duration changed. Regenerate voices')\n  parts.append((int(round(float(row['start'])*sr)),f.readframes(f.getnframes())))\nname='imessage-narration-'+digest.hexdigest()[:32]+'.wav';dest=root/name\nif not dest.exists():\n with wave.open(str(dest),'wb')as f:\n  f.setnchannels(1);f.setsampwidth(2);f.setframerate(sr);pos=0\n  for start,data in parts:\n   if start<pos-1:raise ValueError('Speech overlaps. Check the after-voice gap')\n   padding=max(0,start-pos);f.writeframes(b'\\0'*(padding*2));f.writeframes(data);pos=max(pos,start)+len(data)//2\n  # One second of unplaced silence ensures a rounded-up video-frame boundary never clips speech.\n  target=math.ceil((duration+1)*sr)\n  if target>pos:f.writeframes(b'\\0'*((target-pos)*2))\nprint(json.dumps({'path':str(dest),'mixKey':digest.hexdigest(),'conversationDuration':duration,'fileDuration':duration+1,'sampleRate':sr}))\n";
function speechSignature(s) {
  const provider=s.voiceProvider||'kokoro';
  return JSON.stringify({provider,rate:Number(s.speechRate)||1,left:provider==='kokoro'?s.localThem:s.cloudThem,right:provider==='kokoro'?s.localMe:s.cloudMe,rows:parseScript(s.script).map(r=>[r.side,r.text])});
}
function hasCurrentSpeech(s) {
  try{return !!s.voiceData&&s.voiceData.signature===speechSignature(s)&&s.voiceData.pieces.length===parseScript(s.script).length;}catch{return false;}
}
function scheduleStory(settings, availableSeconds) {
  const rows=parseScript(settings.script);
  if(settings.timingMode==='tts'){
    if(!hasCurrentSpeech(settings))throw new Error('Generate voices to calculate exact timing.');
    let t=0;const messages=rows.map((r,i)=>{
      const speechDuration=Number(settings.voiceData.pieces[i].duration),gap=Number(r.hold??settings.afterSpeech??.3);
      if(!Number.isFinite(speechDuration)||speechDuration<0)throw new Error('Regenerate voices: invalid audio duration.');
      if(!Number.isFinite(gap)||gap<0||gap>30)throw new Error('After-voice delay must be between 0 and 30 seconds.');
      if(speechDuration+gap<=0)throw new Error('A silent message needs a delay greater than zero.');
      const m={side:r.side,text:r.text,page:r.page,start:t,duration:speechDuration+gap,speechDuration,gap};t+=m.duration;return m;
    });
    t+=Number(settings.tailSeconds)||0;
    if(!Number.isFinite(t)||t<=0||t>1800)throw new Error('Keep the conversation below 30 minutes.');
    if(t>availableSeconds+1e-7)throw new Error('NO_ROOM:'+t.toFixed(1)+':'+Math.max(0,availableSeconds).toFixed(1));
    return {messages,duration:t,minHold:Math.min(...messages.map(m=>m.duration)),factor:1,measured:true};
  }
  const holds=rows.map(r=>(r.hold==null?(settings.autoLength?Math.max(1.3,Math.min(6,Array.from(r.text).length/8+0.6)):Number(settings.interval)):r.hold)/Number(settings.speed));
  const zeroIdx=holds.findIndex(n=>!Number.isFinite(n)||n<=0);
  if(zeroIdx>=0){
    const text=rows[zeroIdx].text,label=text.length>20?text.slice(0,20)+'…':text;
    throw new Error('"'+label+'" has a 0s duration. Raise its [bracket] value above 0.');
  }
  const tail=Number(settings.tailSeconds),raw=holds.reduce((a,b)=>a+b,0)+tail,target=settings.fit?Math.min(availableSeconds,120):raw;
  if(!Number.isFinite(target)||target<=0)throw new Error('There is no background footage after the start time.');
  if(!settings.fit&&raw>availableSeconds+.001)throw new Error('Needs '+raw.toFixed(1)+'s but only '+Math.max(0,availableSeconds).toFixed(1)+'s of background is available. Turn on Fit to compress it, or move the playhead earlier.');
  const factor=target/raw;let t=0;const messages=rows.map((r,i)=>{const m={side:r.side,text:r.text,page:r.page,start:t,duration:holds[i]*factor};t+=m.duration;return m;});
  const minHold=Math.min(...messages.map(r=>r.duration));
  if(minHold<.35){
    const shortIdx=messages.reduce((best,m,i)=>m.duration<messages[best].duration?i:best,0);
    const text=rows[shortIdx].text,label=text.length>20?text.slice(0,20)+'…':text;
    throw new Error('"'+label+'" is only '+messages[shortIdx].duration.toFixed(2)+'s. Silent mode needs 0.35s+ \u2014 raise its [bracket] or remove it.'+(settings.fit?' (Fit is compressing the timing.)':''));
  }
  return {messages,duration:target,minHold,factor,measured:false};
}
const IO_PY = "import sys,base64,json,os,pathlib\nargs=json.loads(base64.b64decode(sys.argv[1]).decode())\nhome=pathlib.Path.home();base=home/'.selects'/'generated-audio'/'text-story';state=home/'.selects'/'panel-state'/'text-story'\ndef guard(p,writable=True):\n rp=pathlib.Path(p).resolve()\n roots=[base.resolve(),state.resolve()] if writable else [base.resolve(),state.resolve(),(home/'.selects'/'tts').resolve()]\n if not any(r==rp or r in rp.parents for r in roots):raise ValueError('Path outside the panel workspace')\n return rp\naction=args['action']\nif action=='home':print(json.dumps({'home':str(home),'base':str(base),'state':str(state),'engine':str(home/'.selects'/'tts'/'kokoro-v1')}))\nelif action=='write':\n p=guard(args['path']);p.parent.mkdir(parents=True,exist_ok=True)\n with open(p,'ab' if args.get('append') else 'wb')as f:f.write(base64.b64decode(args['data']))\n print(json.dumps({'ok':True,'bytes':p.stat().st_size}))\nelif action=='mkdir':\n p=guard(args['path']);p.mkdir(parents=True,exist_ok=True);print(json.dumps({'ok':True,'path':str(p)}))\nelif action=='exists':print(json.dumps({paths:bool(0)} if False else {'exists':[pathlib.Path(x).exists() for x in args['paths']]}))\nelif action=='text':\n p=guard(args['path'],False);print(json.dumps({'text':p.read_text()[:args.get('limit',200000)]}))\nelif action=='bytes':\n p=guard(args['path'],False);off=int(args['offset']);size=int(args['size'])\n with open(p,'rb')as f:f.seek(off);chunk=f.read(size)\n print(json.dumps({'data':base64.b64encode(chunk).decode(),'total':p.stat().st_size,'eof':off+len(chunk)>=p.stat().st_size}))\nelse:raise ValueError('Unknown action')\n";
function shellQuote(s){return "'"+String(s).replace(/'/g,"'\\''")+"'";}
function joinPath(...parts){return parts.join('/').replace(/\/{2,}/g,'/');}
function encodeJob(value){const bytes=new TextEncoder().encode(JSON.stringify(value));let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);}
function decodeBytes(base64){const binary=atob(base64),out=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)out[i]=binary.charCodeAt(i);return out;}
async function runIO(sdk,summary,args){
  const r=await sdk.runShell({summary,command:'python3 -c '+shellQuote(IO_PY)+' '+shellQuote(encodeJob(args)),timeoutMs:60000,maxOutputBytes:49152});
  if(r.isError||r.exitCode!==0)throw new Error(r.stderr||r.output||'The panel could not reach its workspace.');
  try{return JSON.parse(r.stdout);}catch{throw new Error('The workspace helper returned an unreadable result.');}
}
async function writeWorkspaceFile(sdk,path,text){
  const bytes=new TextEncoder().encode(text);const step=24000;
  if(!bytes.length)return runIO(sdk,'Write panel workspace file',{action:'write',path,data:''});
  for(let offset=0;offset<bytes.length;offset+=step){
    let binary='';const slice=bytes.subarray(offset,offset+step);
    for(let i=0;i<slice.length;i+=8192)binary+=String.fromCharCode(...slice.subarray(i,i+8192));
    await runIO(sdk,'Write panel workspace file',{action:'write',path,data:btoa(binary),append:offset>0});
  }
  return {ok:true};
}
async function readWorkspaceBytes(sdk,path){
  const parts=[];let offset=0;
  for(let guard=0;guard<400;guard++){
    const chunk=await runIO(sdk,'Read generated audio',{action:'bytes',path,offset,size:30000});
    const bytes=decodeBytes(chunk.data);parts.push(bytes);offset+=bytes.length;
    if(chunk.eof||!bytes.length)break;
  }
  const total=parts.reduce((n,p)=>n+p.length,0),out=new Uint8Array(total);let at=0;
  for(const part of parts){out.set(part,at);at+=part.length;}
  return out;
}

async function readWorkspaceText(sdk,path,fallback){
  try{return (await runIO(sdk,'Read panel workspace file',{action:'text',path})).text;}catch{return fallback;}
}
async function workspacePaths(sdk,cache){
  if(!cache.current)cache.current=await runIO(sdk,'Locate panel workspace',{action:'home'});
  return cache.current;
}

async function runSpeechJob(sdk,pid,code,job,summary,cache){
  const paths=await workspacePaths(sdk,cache);
  if(!String(job.root||'').startsWith(joinPath(paths.base,'voice-')))throw new Error('The generated-voice folder is invalid. Regenerate voices.');
  let python='python3';
  if(code===LOCAL_TTS_PY){
    python=joinPath(paths.engine,'venv','bin','python');
    const ready=await runIO(sdk,'Check local voice engine',{action:'exists',paths:[python,joinPath(paths.engine,'engine.json')]});
    if(!ready.exists.every(Boolean))throw new Error('Set up the free local engine in the Voice tab first.');
    job={...job,engineRoot:paths.engine};
  }
  await runIO(sdk,'Prepare voice workspace',{action:'mkdir',path:job.root});
  const jobPath=joinPath(job.root,'job-'+crypto.randomUUID()+'.json');
  await writeWorkspaceFile(sdk,jobPath,JSON.stringify(job));
  const r=await sdk.runShell({summary,command:shellQuote(python)+' -c '+shellQuote(code)+' '+shellQuote(jobPath),timeoutMs:300000,maxOutputBytes:49152});
  if(r.isError||r.exitCode!==0)throw new Error(r.output||r.stderr||'The audio operation failed.');
  if(r.truncated)throw new Error('The audio result was truncated. No partial result was applied.');
  try{return JSON.parse(r.stdout);}catch{throw new Error('The audio helper returned an invalid result.');}
}
async function elevenRequest(path,key,options={}){
  if(!key.trim())throw new Error('Enter your ElevenLabs API key in the Voice tab.');
  let response;try{response=await fetch('https://api.elevenlabs.io'+path,{...options,headers:{'xi-api-key':key.trim(),...(options.body?{'Content-Type':'application/json'}:{})}});}catch(e){if(e.name==='AbortError')throw e;throw new Error('Could not reach ElevenLabs. Check this app network permissions or use Local Kokoro.');}
  if(!response.ok){let detail='';try{const j=await response.json();detail=typeof j.detail==='string'?j.detail:j.detail?.message||j.message||'';}catch{}detail=String(detail).split(key).join('[redacted]').split(key.trim()).join('[redacted]').slice(0,350);throw new Error('ElevenLabs '+response.status+(detail?': '+detail:'. Check key permissions, account access and billing.'));}
  return response;
}
function bytesOf(data){if(data instanceof Uint8Array)return new Uint8Array(data);if(data?.data&&Array.isArray(data.data))return new Uint8Array(data.data);if(Array.isArray(data))return new Uint8Array(data);return new Uint8Array(data);}


/** Optional renderer service. __DI__ is internal app wiring, not a published
 *  contract, so every member is checked at runtime and absence is not an error. */
function diService(name){try{return window.parent?.__DI__?.[name]||null;}catch{return null;}}
function readPlayheadFrame(sid){
  const state=diService('SequenceState');
  if(typeof state?.getPlayhead!=='function')return null;
  try{const value=state.getPlayhead(sid)?.resolvedOffset;return Number.isFinite(value)&&value>=0?value:null;}catch{return null;}
}
/** resolvedOffset is documented without a unit. Accept it only when it lands
 *  inside this Draft; otherwise fall back to the Draft start rather than
 *  silently pinning the conversation to the last frame. */
function playheadToFrame(raw,endFrame,fps){
  if(!Number.isFinite(raw)||raw<0||!(endFrame>0))return {frame:0,used:false,raw};
  const candidates=[['frames',raw],['seconds',raw*(fps||60)],['milliseconds',raw*(fps||60)/1000]];
  for(const [unit,frame] of candidates)if(frame<=endFrame)return {frame:Math.floor(frame),used:true,unit,raw};
  return {frame:0,used:false,outOfRange:true,raw};
}
function clampStartFrame(frame,endFrame){return Math.max(0,Math.min(Number.isFinite(frame)?frame:0,Math.max(0,(endFrame||0)-2)));}

function StudioIcon({name,size=14}) {
  const paths={more:'M 3 8h.01M 8 8h.01M 13 8h.01',play:'M 5 3l8 5-8 5z',pause:'M 5 3v10M 11 3v10',undo:'M 5 3L 2 6l3 3M 2 6h7a4 4 0 0 1 0 8',close:'M 4 4l8 8M 12 4l-8 8',reload:'M 13 6a5.5 5.5 0 1 0 .1 4M 13 2v4H 9',frame:'M 6 2H 2v4M 10 2h4v4M 14 10v4h-4M 6 14H 2v-4',check:'M 3 8l3 3 7-7'};
  return h('svg',{width:size,height:size,viewBox:'0 0 16 16',fill:name==='play'?'currentColor':'none',stroke:'currentColor',strokeWidth:name==='more'?3:1.5,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true,style:{display:'block',flexShrink:0}},h('path',{d:paths[name]||paths.more}));
}
function StudioPreview({markup,full,frameWidth,frameHeight,panelWidth,maxHeightPx}) {
  const heightBudget=maxHeightPx>0?maxHeightPx:430;
  const limit=full?Math.max(420,panelWidth*frameHeight/frameWidth):Math.max(240,Math.min(heightBudget,panelWidth*frameHeight/frameWidth));
  const width=Math.max(40,Math.min(Math.max(40,panelWidth-4),limit*frameWidth/frameHeight));
  const height=width*frameHeight/frameWidth;
  // Only output dimensions, panel width, or the explicit expand toggle set this box.
  // Message bounds NEVER participate in preview scale or viewBox calculation.
  const html=markup.replace('<svg ','<svg role="img" aria-label="Fixed output frame preview" style="display:block;width:100%;height:100%" ');
  return h('div',{'data-fixed-stage':true,style:{width:'100%',display:'flex',justifyContent:'center',padding:2}},h('div',{'data-output-frame':true,'data-output-size':frameWidth+'x'+frameHeight,style:{width,height,flexShrink:0,overflow:'hidden',boxShadow:'0 0 0 1px var(--panel-border)',borderRadius:2,background:'color-mix(in srgb,var(--panel-fg) 5%,transparent)'},dangerouslySetInnerHTML:{__html:html}}));
}

export default function IMessageGenerator({sdk,context}) {
  const [settings,setSettings]=useState({...DEFAULTS});
  const [info,setInfo]=useState(null);
  const [busy,setBusy]=useState(false),[status,setStatus]=useState('Checking the Draft…');
  const [time,setTime]=useState(0.8),[playing,setPlaying]=useState(false);
  const [lastCommit,setLastCommit]=useState(null),[link,setLink]=useState(null);
  const [readyKey,setReadyKey]=useState('');
  const [tab,setTab]=useState('script');
  const [scriptFocused,setScriptFocused]=useState(false);
  const [msgHelpOpen,setMsgHelpOpen]=useState(false);
  const [pane,setPane]=useState(null),[statusKind,setStatusKind]=useState('idle');
  const [inputUndo,setInputUndo]=useState(null),[notice,setNotice]=useState('');
  const [engineReady,setEngineReady]=useState(false),[setupBusy,setSetupBusy]=useState(false);
  const [playhead,setPlayhead]=useState(null),[progress,setProgress]=useState(null);
  const [voiceBusy,setVoiceBusy]=useState(false),[voicesLoading,setVoicesLoading]=useState(false),[voiceMessage,setVoiceMessage]=useState('Loading local voices…');
  const [localVoices,setLocalVoices]=useState([]),[cloudVoices,setCloudVoices]=useState([]),[cloudPage,setCloudPage]=useState('');
  const [apiKey,setApiKey]=useState(''),[cloudConnected,setCloudConnected]=useState(false),[cloudConsent,setCloudConsent]=useState(false),[audioLoading,setAudioLoading]=useState(false);
  const workspace=useRef(null),voiceRoot=useRef(null),voiceEpoch=useRef(0),voiceAbort=useRef(null),voiceCancelPath=useRef(''),cloudCache=useRef(new Map());
  const audioContext=useRef(null),audioBuffers=useRef(new Map()),audioNodes=useRef([]),audioClock=useRef(null),auditionNode=useRef(null),playEpoch=useRef(0),connectionEpoch=useRef(0);
  const [width,setWidth]=useState(180),[dark,setDark]=useState(true);
  const [panelHeight,setPanelHeight]=useState(0);
  const [previewMaxHeight,setPreviewMaxHeight]=useState(0);
  const rootRef=useRef(null),moreRef=useRef(null),scriptRef=useRef(null),widthRef=useRef(180),previewBoxRef=useRef(null);
  const lock=useRef(false),generation=useRef(0),latest=useRef(context),attempted=useRef('');
  latest.current=context;
  const pid=context.projectId,sid=context.sequenceId,key=pid+':'+sid;
  const same=()=>latest.current.projectId===pid&&latest.current.sequenceId===sid;
  useEffect(()=>{
    const el=rootRef.current;if(!el)return;
    // A vertical scrollbar toggling on/off around this panel shifts el's own
    // measured width by roughly a scrollbar's worth of pixels. Reacting to that
    // shift rescales the fixed-ratio preview height, which can push the content
    // back across the overflow threshold and make the scrollbar flicker in and
    // out at some panel/output aspect ratios. A hysteresis band absorbs that
    // scrollbar-sized delta so only a real panel resize updates layout.
    const SCROLLBAR_HYSTERESIS_PX=24;
    const applyDark=()=>{const rgb=getComputedStyle(el).color.match(/[\d.]+/g);if(rgb?.length>=3)setDark((Number(rgb[0])+Number(rgb[1])+Number(rgb[2]))/3>150);};
    const applyWidth=(next,force)=>{if(force||Math.abs(next-widthRef.current)>SCROLLBAR_HYSTERESIS_PX){widthRef.current=next;setWidth(next);}};
    applyWidth(el.getBoundingClientRect().width,true);applyDark();
    let raf=0;
    const measure=()=>{if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{raf=0;if(!rootRef.current)return;applyWidth(el.getBoundingClientRect().width,false);applyDark();});};
    const ro=typeof ResizeObserver==='function'?new ResizeObserver(measure):null;ro?.observe(el);
    const mo=new MutationObserver(measure);const themeOptions={attributes:true,attributeFilter:['class','style','data-theme','data-color-scheme']};mo.observe(document.documentElement,themeOptions);mo.observe(document.body,themeOptions);
    const close=e=>{if(moreRef.current&&!moreRef.current.contains(e.target))moreRef.current.open=false;};
    document.addEventListener('pointerdown',close);return()=>{if(raf)cancelAnimationFrame(raf);ro?.disconnect();mo.disconnect();document.removeEventListener('pointerdown',close);};
  },[]);
  useEffect(()=>{
    // documentElement.clientHeight is the rendered viewport height of whichever frame
    // this panel runs in, independent of any wrapper's own CSS height/overflow — those
    // are outside this file and not something to guess at. It is what this panel's
    // visible area actually is, so it is the right target to fill.
    const measure=()=>setPanelHeight(document.documentElement.clientHeight||window.innerHeight||0);
    measure();
    window.addEventListener('resize',measure);
    const ro=typeof ResizeObserver==='function'?new ResizeObserver(measure):null;ro?.observe(document.documentElement);
    return()=>{window.removeEventListener('resize',measure);ro?.disconnect();};
  },[]);
  useEffect(()=>{
    const measure=()=>{if(previewBoxRef.current)setPreviewMaxHeight(previewBoxRef.current.clientHeight);};
    measure();
    const ro=typeof ResizeObserver==='function'?new ResizeObserver(measure):null;if(previewBoxRef.current)ro?.observe(previewBoxRef.current);
    return()=>ro?.disconnect();
  },[]);
  async function load() {
    if(lock.current)return;
    attempted.current=key;const version=++generation.current;setBusy(true);setPlaying(false);setStatusKind('idle');setStatus('Loading the Draft…');
    try {
      if(!pid||!sid)throw new Error('Open a Draft to use as the background.');
      const data=await readDraft(sdk,pid,sid);if(!same()||version!==generation.current)return;
      setInfo(data);setReadyKey(key);
      setStatus('Ready. The conversation you write here is inserted into whichever Draft is open when you apply.');
    }catch(e){if(same()&&version===generation.current){setStatusKind('error');setStatus(String(e.message||e));}}
    finally{if(version===generation.current)setBusy(false);}
  }
  // The script/settings are session state only: they are never read back from a Draft,
  // so switching Drafts never resets or overwrites what you have typed. Apply always
  // inserts a fresh graphic (and narration) into whichever Draft is open at that moment.
  useEffect(()=>{setInfo(null);setReadyKey('');setLastCommit(null);setLink(null);setInputUndo(null);setNotice('');setPane(null);setPlaying(false);attempted.current='';load();},[pid,sid]);
  useEffect(()=>{if(!busy&&!lock.current&&attempted.current!==key)load();},[busy,key]);
  useEffect(()=>{
    setPlayhead(readPlayheadFrame(sid));
    const state=diService('SequenceState');
    if(typeof state?.subscribePlayhead!=='function')return;
    try{return state.subscribePlayhead(sid,(id,value)=>{if(id===sid)setPlayhead(Number.isFinite(value?.resolvedOffset)?Math.floor(value.resolvedOffset):null);});}catch{}
  },[sid]);
  useEffect(()=>{loadLocalVoices();return()=>{voiceEpoch.current++;playEpoch.current++;voiceAbort.current?.abort();stopPreviewSound();stopAudition();audioContext.current?.close?.();};},[]);
  useEffect(()=>{voiceEpoch.current++;playEpoch.current++;connectionEpoch.current++;voiceAbort.current?.abort();setVoiceBusy(false);setAudioLoading(false);setCloudConsent(false);voiceRoot.current=null;cloudCache.current.clear();audioBuffers.current.clear();stopPreviewSound();stopAudition();},[pid,sid]);
  useEffect(()=>{setApiKey('');setCloudConnected(false);setCloudVoices([]);},[pid]);
  const update=(k,v)=>{playEpoch.current++;stopPreviewSound();setPlaying(false);setNotice('');setStatusKind('idle');setSettings(s=>({...s,[k]:v}));};
  const voiceReady=hasCurrentSpeech(settings),voiceMode=settings.timingMode==='tts';
  const playheadRead=info?playheadToFrame(playhead,info.endFrame,info.fps):{frame:0,used:false};
  const startFrame=info?clampStartFrame(playheadRead.frame,info.endFrame):0;
  const startLabel=info?Math.floor(startFrame/info.fps/60)+':'+String(Math.floor((startFrame/info.fps)%60)).padStart(2,'0'):'0:00';
  let plan=null,error='',scriptRows=[];
  try{
    scriptRows=parseScript(settings.script);const available=info?(info.endFrame-startFrame)/info.fps:60;
    if(voiceMode&&!voiceReady){const estimate={...settings,timingMode:'manual',fit:false,script:scriptRows.map((r,i)=>(i&&r.page!==scriptRows[i-1].page?'---\n':'')+(r.side==='left'?'Them: ':'Me: ')+r.text).join('\n')};plan=scheduleStory(estimate,Infinity);if(plan.duration>available)plan=scheduleStory({...estimate,fit:true},available);plan.estimated=true;}
    else plan=scheduleStory(settings,available);
  }catch(e){error=String(e.message||e);}
  const numericChecks=[['widthPct','Width',45,96],['topPct','Top',0,65],['fontSize','Text size',24,56],['startSeconds','Start time',0,86400],['tailSeconds','End hold',0,10],['interval','Interval',.3,20],['speed','Speed',.5,2],['unreadCount','Back count',0,999],['afterSpeech','After voice',0,30],['speechRate','Speech rate',.7,1.2]];
  const invalidField=numericChecks.find(([k,label,min,max])=>settings[k]===''||!Number.isFinite(Number(settings[k]))||Number(settings[k])<min||Number(settings[k])>max);
  if(!error&&invalidField)error=invalidField[1]+' must be between '+invalidField[2]+' and '+invalidField[3]+'.';
  const w=settings.portrait?1080:(info?.width||1080),hh=settings.portrait?1920:(info?.height||1920),duration=plan?.duration||1;
  useEffect(()=>{if(!playing){stopPreviewSound();return;}const begin=performance.now(),initial=time,clock=audioClock.current;const timer=setInterval(()=>{const t=clock?clock.initial+Math.max(0,clock.ctx.currentTime-clock.epoch):initial+(performance.now()-begin)/1000;if(t>=duration){setTime(Math.max(0,duration-.001));setPlaying(false);}else setTime(t);},33);return()=>{clearInterval(timer);stopPreviewSound();};},[playing,duration]);
  const previewData={...settings,messagesJSON:JSON.stringify(plan?.messages||[])};
  const previewMarkup=storySvg(previewData,Math.min(time,duration-.001),w,hh);
  const overflowPages=(previewMarkup.match(/data-overflow-pages="([^"]*)"/)?.[1]||'').split(',').filter(Boolean);
  const pageCount=Number(previewMarkup.match(/data-page-count="(\d+)"/)?.[1]||1);
  const activePage=Number(previewMarkup.match(/data-active-page="(\d+)"/)?.[1]||1);
  if(!error&&overflowPages.length)error='Page '+overflowPages.join(', ')+' is too tall for the output frame. Add --- between messages, shorten a long message, or reduce the text size.';
  const canApply=!busy&&!voiceBusy&&!audioLoading&&!error&&!!info&&readyKey===key&&(!voiceMode||voiceReady);
  const canGenerate=!busy&&!voiceBusy&&!setupBusy&&!voicesLoading&&!!info&&info.endFrame>0&&scriptRows.length>0&&!invalidField&&(settings.voiceProvider==='elevenlabs'?(cloudConnected&&cloudConsent&&!!apiKey&&cloudVoices.some(v=>v.id===settings.cloudThem)&&cloudVoices.some(v=>v.id===settings.cloudMe)):engineReady&&localVoices.some(v=>v.id===settings.localThem)&&localVoices.some(v=>v.id===settings.localMe));
  function stopPreviewSound(){for(const n of audioNodes.current){try{n.stop();}catch{}}audioNodes.current=[];audioClock.current=null;}
  function stopAudition(){try{auditionNode.current?.stop?.();auditionNode.current?.pause?.();}catch{}auditionNode.current=null;}
  async function audioEngine(){const C=window.AudioContext||window.webkitAudioContext;if(!C)throw new Error('Audio preview is not supported in this app build.');if(!audioContext.current)audioContext.current=new C({sampleRate:44100});await audioContext.current.resume();return audioContext.current;}
  async function voiceWorkspace(){const paths=await workspacePaths(sdk,workspace);if(!voiceRoot.current){voiceRoot.current=joinPath(paths.base,'voice-'+crypto.randomUUID());await runIO(sdk,'Prepare voice workspace',{action:'mkdir',path:voiceRoot.current});}return voiceRoot.current;}
  async function decodeVoice(piece,root){const paths=await workspacePaths(sdk,workspace);const file=String(piece.file||'');if(!file.startsWith(joinPath(paths.base,'voice-'))||!file.toLowerCase().endsWith('.wav'))throw new Error('Invalid generated speech file. Regenerate voices.');if(audioBuffers.current.has(file))return audioBuffers.current.get(file);const ctx=await audioEngine();const bytes=await readWorkspaceBytes(sdk,file);if(!bytes.length)throw new Error('Generated audio is missing. Generate voices again.');const buffer=await ctx.decodeAudioData(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));audioBuffers.current.set(file,buffer);return buffer;}
  async function loadLocalVoices(){
    setVoicesLoading(true);
    try{
      const paths=await workspacePaths(sdk,workspace);
      const probe=await runIO(sdk,'Check local voice engine',{action:'exists',paths:[joinPath(paths.engine,'engine.json'),joinPath(paths.engine,'venv','bin','python'),joinPath(paths.engine,'kokoro-v1.0.int8.onnx'),joinPath(paths.engine,'voices-v1.0.bin')]});
      if(!probe.exists[0]){setEngineReady(false);setLocalVoices([]);setVoiceMessage('One-time setup downloads about 143 MB of model data into an isolated folder. No global packages change.');return;}
      if(!probe.exists.every(Boolean))throw new Error('Local engine files are incomplete. Run setup again.');
      const data=JSON.parse(await readWorkspaceText(sdk,joinPath(paths.engine,'engine.json'),'{}'));
      const rows=data.voices||[];
      if(!rows.length)throw new Error('No English voices were found. Run setup again.');
      setLocalVoices(rows);setEngineReady(true);
      setSettings(s=>({...s,localThem:rows.some(v=>v.id===s.localThem)?s.localThem:rows[0]?.id||'',localMe:rows.some(v=>v.id===s.localMe)?s.localMe:rows[1]?.id||rows[0]?.id||''}));
      setVoiceMessage(rows.length+' English neural voices ready · offline, no API charges.');
    }catch(e){setEngineReady(false);setVoiceMessage(String(e.message||e));}finally{setVoicesLoading(false);}
  }
  async function setupEngine(){
    if(setupBusy||voiceBusy)return;setSetupBusy(true);setVoiceMessage('Setting up the isolated local engine. This can take a few minutes…');
    try{
      const paths=await workspacePaths(sdk,workspace);
      const r=await sdk.runShell({summary:'Set up free Kokoro voices',command:'python3 -c '+shellQuote(SETUP_KOKORO_PY)+' '+shellQuote(paths.engine),timeoutMs:300000,maxOutputBytes:49152});
      if(r.isError||r.exitCode!==0)throw new Error(r.stderr||r.output||'Engine setup failed.');
      await loadLocalVoices();
    }catch(e){setVoiceMessage(String(e.message||e));}finally{setSetupBusy(false);}
  }
  async function connectEleven(more=false){
    if(voicesLoading)return;const requestToken=++connectionEpoch.current;setVoicesLoading(true);setVoiceMessage('Loading account voices…');
    try{const params=new URLSearchParams({page_size:'100',voice_type:'default',include_total_count:'false'});if(more&&cloudPage)params.set('next_page_token',cloudPage);const r=await elevenRequest('/v2/voices?'+params.toString(),apiKey);const j=await r.json();if(requestToken!==connectionEpoch.current||!same())return;const rows=(j.voices||[]).map(v=>({id:v.voice_id,name:v.name||v.voice_id,locale:v.labels?.accent||v.labels?.language||'Default',previewUrl:v.preview_url||''}));setCloudVoices(old=>more?[...old,...rows.filter(v=>!old.some(o=>o.id===v.id))]:rows);setCloudPage(j.has_more?j.next_page_token||'':'');setCloudConnected(true);setVoiceMessage(rows.length+' voices loaded'+(j.has_more?' · more available.':'.'));setSettings(s=>({...s,cloudThem:s.cloudThem||rows[0]?.id||'',cloudMe:s.cloudMe||rows[1]?.id||rows[0]?.id||''}));}
    catch(e){if(requestToken===connectionEpoch.current){setCloudConnected(false);setVoiceMessage(String(e.message||e));}}finally{if(requestToken===connectionEpoch.current)setVoicesLoading(false);}
  }
  async function cancelVoices(){voiceAbort.current?.abort();if(voiceCancelPath.current){try{await writeWorkspaceFile(sdk,voiceCancelPath.current,'cancel');}catch{}}setVoiceMessage('Stopping after the current request. Cloud requests may already have been billed.');}
  async function generateVoices(){
    if(voiceBusy||lock.current||setupBusy)return;if(settings.voiceProvider==='kokoro'&&!engineReady){setTab('voice');setVoiceMessage('Set up the free local engine first.');return;}let rows;try{rows=parseScript(settings.script);}catch(e){setVoiceMessage(e.message);setTab('script');return;}
    const cloud=settings.voiceProvider==='elevenlabs';
    if(cloud&&(!apiKey||!cloudConnected||!cloudConsent)){setVoiceMessage('Connect your key and approve metered API requests first.');setTab('voice');return;}
    const them=cloud?settings.cloudThem:settings.localThem,me=cloud?settings.cloudMe:settings.localMe;
    if(!them||!me){setVoiceMessage('Select a voice for both speakers.');setTab('voice');return;}
    const input=JSON.parse(JSON.stringify(settings)),signature=speechSignature(input),token=++voiceEpoch.current,controller=new AbortController();voiceAbort.current=controller;
    setVoiceBusy(true);setPlaying(false);stopPreviewSound();stopAudition();setVoiceMessage('Preparing voices…');setStatusKind('idle');
    try{
      const paths=await workspacePaths(sdk,workspace);
      let root=input.voiceData?.root;if(!root||!String(root).startsWith(joinPath(paths.base,'voice-')))root=await voiceWorkspace();
      await runIO(sdk,'Prepare voice workspace',{action:'mkdir',path:root});
      const cancelPath=joinPath(root,'cancel-'+crypto.randomUUID());voiceCancelPath.current=cancelPath;
      const keyed=rows.map(r=>{const voice=r.side==='left'?them:me;return {...r,voice,cacheKey:JSON.stringify([input.voiceProvider,Number(input.speechRate)||1,voice,r.text])};});
      let result;
      if(!cloud){
        const progressPath=joinPath(root,'progress-'+crypto.randomUUID()+'.json');
        setProgress({done:0,total:keyed.length});
        const job=runSpeechJob(sdk,pid,LOCAL_TTS_PY,{root,cancelPath,progressPath,rate:Number(input.speechRate)||1,rows:keyed.map(r=>({text:r.text,voice:r.voice}))},'Generate local TTS audio',workspace);
        let running=true;job.then(()=>{running=false;},()=>{running=false;});
        (async()=>{while(running&&token===voiceEpoch.current){
          await new Promise(done=>setTimeout(done,700));
          if(!running||token!==voiceEpoch.current)break;
          try{const raw=await readWorkspaceText(sdk,progressPath,'');if(raw){const seen=JSON.parse(raw);if(Number.isFinite(seen.done)&&token===voiceEpoch.current)setProgress({done:seen.done,total:seen.total||keyed.length});}}catch{}
        }})();
        result=await job;if(result.cancelled)throw new Error('Voice generation canceled. No Draft was changed.');}
      else{
        setProgress({done:0,total:keyed.length});
        for(const p of input.voiceData?.pieces||[])if(p.cacheKey)cloudCache.current.set(p.cacheKey,p.file);
        const raw=[];
        for(let i=0;i<keyed.length;i++){
          if(controller.signal.aborted)throw new Error('Voice generation canceled. Completed API requests may be billed.');
          const row=keyed[i];setProgress({done:i,total:keyed.length});if(!/[\p{L}\p{N}]/u.test(row.text)){raw.push({file:'',voice:row.voice,silent:true});continue;}let file=cloudCache.current.get(row.cacheKey);
          if(file&&!(await runIO(sdk,'Check cached voice',{action:'exists',paths:[file]})).exists[0])file=null;
          if(!file){const response=await elevenRequest('/v1/text-to-speech/'+encodeURIComponent(row.voice)+'?output_format=mp3_44100_128',apiKey,{method:'POST',signal:controller.signal,body:JSON.stringify({text:row.text,model_id:'eleven_multilingual_v2',voice_settings:{speed:Number(input.speechRate)||1}})});const bytes=new Uint8Array(await response.arrayBuffer());file=joinPath(root,'eleven-'+crypto.randomUUID()+'.mp3');let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));await runIO(sdk,'Store generated voice',{action:'write',path:file,data:btoa(binary)});cloudCache.current.set(row.cacheKey,file);}
          raw.push({file,voice:row.voice});
        }
        result=await runSpeechJob(sdk,pid,AUDIO_PROCESS_PY,{root,action:'normalize',rows:raw},'Measure generated voice audio',workspace);
      }
      if(controller.signal.aborted||token!==voiceEpoch.current||!same())return;
      if(result.pieces?.length!==rows.length)throw new Error('Not every message produced audio. No partial result was used.');
      const data={signature,root:result.root,pieces:result.pieces.map((p,i)=>({...p,cacheKey:keyed[i].cacheKey})),provider:input.voiceProvider,createdAt:Date.now()};
      for(const p of data.pieces)cloudCache.current.set(p.cacheKey,p.file);const keep=new Set(data.pieces.map(p=>p.file));for(const path of audioBuffers.current.keys())if(!keep.has(path))audioBuffers.current.delete(path);
      setSettings(s=>({...s,timingMode:'tts',fit:false,tailSeconds:s.timingMode==='tts'?s.tailSeconds:0,voiceData:data}));
      setVoiceMessage('');setTime(0);
    }catch(e){if(token===voiceEpoch.current&&same()){setVoiceMessage(e.name==='AbortError'?'Request stopped. Any completed cloud request may be billed.':String(e.message||e));setStatusKind('error');setStatus('Voice generation failed. '+(e.name==='AbortError'?'The request was canceled.':String(e.message||e)));}}
    finally{if(token===voiceEpoch.current){setVoiceBusy(false);setProgress(null);voiceCancelPath.current='';}}
  }
  async function audition(side){
    if(voiceBusy)return;const auditionToken=++voiceEpoch.current,controller=new AbortController();voiceAbort.current=controller;setVoiceBusy(true);setPlaying(false);stopPreviewSound();stopAudition();
    const cloud=settings.voiceProvider==='elevenlabs',id=cloud?(side==='left'?settings.cloudThem:settings.cloudMe):(side==='left'?settings.localThem:settings.localMe);
    try{
      if(cloud){const row=cloudVoices.find(v=>v.id===id);if(!row?.previewUrl||!row.previewUrl.startsWith('https://'))throw new Error('This voice has no free preview. Generate only after approving API usage.');const media=new Audio(row.previewUrl);auditionNode.current=media;await media.play();return;}
      const ctx=await audioEngine();const root=await voiceWorkspace();const cancelPath=joinPath(root,'cancel-'+crypto.randomUUID());voiceCancelPath.current=cancelPath;const out=await runSpeechJob(sdk,pid,LOCAL_TTS_PY,{root,cancelPath,rate:Number(settings.speechRate)||1,rows:[{text:'Hello. This is a preview of my voice.',voice:id}]},'Preview a local TTS voice',workspace);if(controller.signal.aborted||out.cancelled||auditionToken!==voiceEpoch.current||!same())return;const buffer=await decodeVoice(out.pieces[0],out.root);const node=ctx.createBufferSource();node.buffer=buffer;node.connect(ctx.destination);auditionNode.current=node;node.start();setVoiceMessage('Playing '+id+'.');
    }catch(e){if(auditionToken===voiceEpoch.current)setVoiceMessage(String(e.message||e));}finally{if(auditionToken===voiceEpoch.current){setVoiceBusy(false);voiceCancelPath.current='';}}
  }
  async function startPreview(){
    if(playing){setPlaying(false);stopPreviewSound();return;}
    if(error)return;let initial=time>=duration-.05?0:time;stopPreviewSound();stopAudition();setTime(initial);
    try{
      if(settings.timingMode==='tts'&&voiceReady){const token=++playEpoch.current;setAudioLoading(true);const ctx=await audioEngine(),buffers=[];for(const p of settings.voiceData.pieces)buffers.push(p.duration>0?await decodeVoice(p,settings.voiceData.root):null);if(token!==playEpoch.current||!same())return;const epoch=ctx.currentTime+.04;audioClock.current={ctx,epoch,initial};for(let i=0;i<buffers.length;i++){if(!buffers[i])continue;const rel=plan.messages[i].start-initial,offset=Math.max(0,-rel);if(offset>=buffers[i].duration)continue;const node=ctx.createBufferSource();node.buffer=buffers[i];node.connect(ctx.destination);node.start(epoch+Math.max(0,rel),offset);audioNodes.current.push(node);}setPlaying(true);}
      else{audioClock.current=null;if(settings.timingMode==='tts')setNotice('Silent estimate · generate voices for exact timing');setPlaying(true);}
    }catch(e){setStatusKind('error');setStatus(String(e.message||e));}finally{setAudioLoading(false);}
  }
  async function prepareNarration(input,plan){const root=input.voiceData.root;return runSpeechJob(sdk,pid,AUDIO_PROCESS_PY,{root,action:'mix',duration:plan.duration,rows:plan.messages.map((m,i)=>({file:input.voiceData.pieces[i].file,start:m.start,speechDuration:m.speechDuration}))},'Build timed narration track',workspace);}

  async function apply() {
    if(lock.current||busy||voiceBusy||!pid||!sid||!canApply)return;lock.current=true;setBusy(true);setPlaying(false);stopPreviewSound();setLink(null);setStatusKind('idle');setNotice('');
    let preparedNarration=null;
    try{
      if(readyKey!==key)throw new Error('Reload the current Draft before applying.');
      parseScript(settings.script);
      if(!(await sdk.call('canAuthorGeneratedMedia')))throw new Error('Motion graphics are not available in this app version.');
      const input=JSON.parse(JSON.stringify(settings));for(const [k]of numericChecks)input[k]=Number(input[k]);
      const fresh=await readDraft(sdk,pid,sid);if(!same())throw new Error('The Draft changed. Apply was canceled.');
      const startFrames=clampStartFrame(playheadToFrame(readPlayheadFrame(sid)??playhead,fresh.endFrame,fresh.fps).frame,fresh.endFrame);
      const startSeconds=startFrames/fresh.fps;
      input.startSeconds=startSeconds;
      const measuredPlan=scheduleStory(input,fresh.endFrame/fresh.fps-startSeconds);
      const checkedMarkup=storySvg({...input,messagesJSON:JSON.stringify(measuredPlan.messages)},0,input.portrait?1080:fresh.width,input.portrait?1920:fresh.height);
      const overflow=checkedMarkup.match(/data-overflow-pages="([^"]*)"/)?.[1];if(overflow)throw new Error('Page '+overflow+' exceeds the output frame. Add --- before applying.');
      let narrationAsset=null;
      if(input.timingMode==='tts'){
        setStatus('Building the narration track…');
        preparedNarration=await prepareNarration(input,measuredPlan);
        if(!same())throw new Error('The Draft changed. No narration was imported.');
        setStatus('Adding the narration to Project sources…');
        // Project-level writes must not share a run_script call with a Draft commit.
        const imported=await sdk.runScript({summary:'Import narration audio',allowCommit:true,script:`
          const pid=${JSON.stringify(pid)},path=${JSON.stringify(preparedNarration.path)};
          const owner=(await selects.listProjects()).find(p=>p.id===pid);if(!owner)throw new Error('The Project is no longer open.');
          const p=selects.project(pid);
          const flatten=(nodes)=>nodes.flatMap(n=>n.type==='dir'?flatten(n.children||[]):[n]);
          const findFile=async()=>flatten((await p.sourceFiles({folder:'(root)'})).fileTree||[]).find(f=>f.type==='audio'&&f.path===path);
          let asset=await findFile();
          if(!asset){
            try{const added=await p.importFiles({paths:[path]});if(added.addedResourceIds.length!==1)throw new Error('Narration import did not produce exactly one resource.');asset={resourceId:added.addedResourceIds[0],path};}
            catch(error){asset=await findFile();if(!asset)throw error;}
          }
          if(!(await p.resources()).some(r=>r.resourceId===asset.resourceId))throw new Error('The narration resource could not be verified in this Project.');
          return {resourceId:asset.resourceId,path};`});
        if(imported.isError)throw new Error(imported.output);
        if(!imported.result?.resourceId)throw new Error('The narration audio was not added to Project sources.');
        if(!same())throw new Error('The Draft changed. Apply was canceled.');
        narrationAsset=imported.result;
      }
      setStatus('Adding the conversation'+(preparedNarration?' and narration':'')+'…');
      const result=await sdk.runScript({summary:'Apply iMessage story with narration',allowCommit:true,script:`
        const parseScript=${parseScript.toString()};const speechSignature=${speechSignature.toString()};const hasCurrentSpeech=${hasCurrentSpeech.toString()};const scheduleStory=${scheduleStory.toString()};
        const pid=${JSON.stringify(pid)},sid=${JSON.stringify(sid)},settings=${JSON.stringify(input)},narration=${JSON.stringify(preparedNarration)},narrationAsset=${JSON.stringify(narrationAsset)};
        const owner=(await selects.listProjects()).find(p=>p.id===pid);if(!owner||!owner.draftIds.includes(sid))throw new Error('This Draft does not belong to the current Project.');
        const p=selects.project(pid),d=selects.draft(sid),m=await d.meta(),main=await d.clips({trackScope:'main'});
        const end=main.reduce((n,c)=>Math.max(n,c.endFrame),0),start=Math.max(0,Math.min(Math.round(settings.startSeconds*m.fps),Math.max(0,end-2)));
        if(end-start<2)throw new Error('There is no background after the start time.');
        const plan=scheduleStory(settings,(end-start)/m.fps);
        const expectedFrame=${JSON.stringify({width:fresh.width,height:fresh.height})};if(!settings.portrait&&(m.frameSize.width!==expectedFrame.width||m.frameSize.height!==expectedFrame.height))throw new Error('Output dimensions changed. Reload before applying.');
        if(narration&&Math.abs(narration.conversationDuration-plan.duration)>.001)throw new Error('Timing changed before apply. Try again with the current settings.');
        if(settings.portrait)await d.setFrameSize({width:1080,height:1920});
        const stop=Math.min(end,start+Math.max(2,Math.ceil(plan.duration*m.fps)));
        let asset=null;
        if(narrationAsset){
          const flatten=(nodes)=>nodes.flatMap(n=>n.type==='dir'?flatten(n.children||[]):[n]);
          const files=flatten((await p.sourceFiles({folder:'(root)'})).fileTree||[]);
          asset=files.find(f=>f.type==='audio'&&f.path===narrationAsset.path&&f.resourceId===narrationAsset.resourceId)||null;
          if(!asset)throw new Error('The narration audio is no longer in Project sources. Apply again.');
        }
        let newAudio=[];
        if(asset){const before=new Set((await d.clips({trackScope:'all'})).map(c=>c.clipId));const added=await d.overlayResource({resource:p.resource(asset.resourceId),over:await d.rangeAtFrames(start,stop),sourceStartSeconds:0});newAudio=(await d.clips({trackScope:'all'})).filter(c=>!before.has(c.clipId)&&c.trackKind==='audio'&&c.resourceId===asset.resourceId);if(added.inserted!==1||newAudio.length!==1)throw new Error('Narration placement did not produce exactly one audio clip.');}
        const narrationTargets=newAudio.map(c=>({clipId:c.clipId,trackId:c.trackId,path:asset.path}));
        const parameters={...settings,panelId:${JSON.stringify(TAG)},settingsJSON:JSON.stringify(settings),messagesJSON:JSON.stringify(plan.messages),narrationTargetsJSON:JSON.stringify(narrationTargets),narrationPath:narrationAsset?.path||''};
        const graphic=await d.addMotionGraphic({within:await d.rangeAtFrames(start,stop),label:'iMessage Generator',tsxCode:${JSON.stringify(GRAPHIC)},parameters,editableParameters:${JSON.stringify(editableParameters)}});
        const out=await d.commitAll('Apply iMessage story and narration');
        const placed=(await d.clips({trackScope:'all'})).find(c=>c.clipId===graphic.clipId);
        return {clipId:graphic.clipId,trackId:placed?.trackId||'',commitId:out.commitId||null,startFrame:start,endFrame:stop,seconds:(stop-start)/m.fps,messageCount:plan.messages.length,narrationTargets};`});
      if(result.isError)throw new Error(result.output);if(!result.result)throw new Error('No save result was returned. Reload before retrying.');
      const savedResult=result.result;if(!same())return;setLastCommit(savedResult.commitId);
      const data=await readDraft(sdk,pid,sid);
      const check=await sdk.runScript({summary:'Verify iMessage story and narration placement',allowCommit:false,script:`
        const pid=${JSON.stringify(pid)},sid=${JSON.stringify(sid)},result=${JSON.stringify(savedResult)};
        const owner=(await selects.listProjects()).find(p=>p.id===pid);if(!owner||!owner.draftIds.includes(sid))throw new Error('Draft ownership changed.');
        const d=selects.draft(sid),clips=await d.clips({trackScope:'all'}),graphic=clips.find(c=>c.clipId===result.clipId&&c.trackKind==='video');
        if(!graphic||graphic.startFrame!==result.startFrame||graphic.endFrame!==result.endFrame)throw new Error('The graphic has an unexpected saved range.');
        for(const t of result.narrationTargets){const c=clips.find(c=>c.clipId===t.clipId&&c.trackId===t.trackId&&c.trackKind==='audio');if(!c||c.startFrame!==result.startFrame||c.endFrame!==result.endFrame)throw new Error('Narration has an unexpected saved range.');}
        return {link:(await selects.editor.linkToDraftFrame(sid,graphic.startFrame)).deepLinkUrl,audioClips:result.narrationTargets.length};`});
      if(check.isError)throw new Error(check.output);if(!same())return;
      setInfo(data);setLink(check.result.link);setSettings(input);setStatusKind('success');
      setStatus(savedResult.messageCount+' messages · '+savedResult.seconds.toFixed(2)+' s added and verified'+(check.result.audioClips?' with narration.':' without narration.')+' Background audio and cuts were preserved. Undo reverts this insert; imported audio remains in Project sources.');
    }catch(e){
      let extra='';try{if(same()&&preparedNarration){const state=await sdk.runScript({summary:'Check narration import state',allowCommit:false,script:`const p=selects.project(${JSON.stringify(pid)});const rows=await p.sourceFiles({folder:'(root)'});const walk=n=>n.flatMap(x=>x.type==='dir'?walk(x.children||[]):[x]);return {present:walk(rows.fileTree||[]).some(x=>x.path===${JSON.stringify(preparedNarration.path)})};`});extra=state.result?.present?' The narration file is already in Project sources.':' Narration import was not confirmed.';}}catch{}
      if(same()){setStatusKind('error');setStatus(String(e.message||e)+extra+' No automatic retry was attempted.');}
    }finally{lock.current=false;setBusy(false);}
  }
  async function undo(){
    if(lock.current||!lastCommit)return;lock.current=true;setBusy(true);
    try{const r=await sdk.runScript({summary:'Undo iMessage change',allowCommit:true,script:`const p=(await selects.listProjects()).find(p=>p.id===${JSON.stringify(pid)});if(!p||!p.draftIds.includes(${JSON.stringify(sid)}))throw new Error('Draft ownership could not be verified.');return await selects.draft(${JSON.stringify(sid)}).revertCommit(${JSON.stringify(lastCommit)});`});if(r.isError)throw new Error(r.output);if(!same())return;setLastCommit(null);setLink(null);setStatusKind('success');setStatus('The last insert was undone.');}
    catch(e){if(same()){setStatusKind('error');setStatus(String(e.message||e));}}finally{lock.current=false;setBusy(false);}
  }
  const compact=width<168;
  const twoColumn=width>=430;
  const previewColumn=twoColumn?Math.max(162,Math.round(width*0.40)):width;
  const previewInner=twoColumn?previewColumn-13:previewColumn;
  const surface='var(--panel-bg, '+(dark?'#232428':'#ffffff')+')';
  const raised='color-mix(in srgb,var(--panel-fg) 6%,'+surface+')';
  const muted='var(--panel-muted-fg)',border='var(--panel-border)';
  const inputStyle={height:28,minHeight:28,minWidth:0,width:'100%',boxSizing:'border-box',padding:'3px 6px',fontSize:12,borderRadius:5};
  const iconStyle={width:28,height:28,minHeight:28,padding:6,display:'inline-flex',alignItems:'center',justifyContent:'center',flexShrink:0,borderRadius:5};
  const tinyStyle={width:'100%',height:27,minHeight:27,padding:'3px 6px',fontSize:11.5,lineHeight:1.2,minWidth:0,borderRadius:5};
  const small={fontSize:11,lineHeight:1.4,color:muted};
  const cleanStatus=setupBusy?'Setting up…':voicesLoading?'Loading voices…':voiceBusy?'Generating…':audioLoading?'Loading audio…':voiceMode&&!voiceReady?(settings.voiceProvider==='kokoro'&&!engineReady?'Set up voices':'Generate voices'):busy?(lock.current?'Saving…':'Loading…'):statusKind==='error'?'Needs attention':statusKind==='success'?(status==='The last insert was undone.'?'Undone':'Saved'):'';
  const formatTime=n=>{n=Math.max(0,Number(n)||0);return Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');};
  const closeMenu=()=>{if(moreRef.current)moreRef.current.open=false;};
  const remember=(patch,label)=>{closeMenu();setInputUndo({settings:JSON.parse(JSON.stringify(settings)),label});setSettings(s=>({...s,...patch}));setNotice(label);setPlaying(false);stopPreviewSound();playEpoch.current++;setStatusKind('idle');};
  const ROW=28,CTRL=compact?98:156;
  const rowStyle={display:'grid',gridTemplateColumns:'minmax(0,1fr) '+CTRL+'px',alignItems:'center',gap:8,minHeight:ROW};
  const labelStyle={fontSize:12,margin:0,lineHeight:1.2,color:muted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'};
  const ctrl={...inputStyle,height:24,minHeight:24,fontSize:11.5,padding:'2px 6px'};
  const ctrlSelect={...ctrl,paddingRight:20,textOverflow:'ellipsis'};
  const row=(text,control,id,title)=>h('div',{key:id||text,title,style:rowStyle},h('label',{htmlFor:id?'story-'+id:undefined,style:labelStyle},text),control);
  const tipRow=(code,text)=>h('div',{key:code+'|'+text,style:{display:'flex',alignItems:'baseline',gap:6}},h('code',{style:{fontFamily:'ui-monospace,SFMono-Regular,Menlo,monospace',fontSize:10,padding:'1px 5px',borderRadius:4,background:raised,color:'var(--panel-fg)',flexShrink:0,whiteSpace:'nowrap'}},code),h('span',{style:{flex:1,color:muted,lineHeight:1.35}},text));
  const group=(text)=>h('div',{key:'g-'+text,style:{fontSize:11,fontWeight:600,color:muted,letterSpacing:.1,margin:'8px 0 1px',minHeight:16,display:'flex',alignItems:'center'}},text);
  const hint=(text)=>h('div',{key:'h-'+String(text).slice(0,12),style:{fontSize:10.5,lineHeight:1.35,color:muted,margin:'1px 0 2px'}},text);
  const numberBox=(k,min,max,step)=>h('input',{id:'story-'+k,'aria-label':k,'aria-invalid':invalidField?.[0]===k,'aria-describedby':'story-validation',type:'number',min,max,step,value:settings[k],disabled:busy||voiceBusy,style:{...ctrl,textAlign:'right',padding:'2px 4px'},onChange:e=>update(k,e.target.value),onBlur:e=>{if(typeof settings[k]==='string'&&e.target.value!==''&&Number.isFinite(Number(e.target.value)))update(k,Number(e.target.value));}});
  const numberRow=(text,k,min,max,step=1)=>row(text,numberBox(k,min,max,step),k);
  const sliderRow=(text,k,min,max,step=1)=>row(text,h('div',{style:{display:'flex',alignItems:'center',gap:6,minWidth:0}},
      h('input',{type:'range','aria-label':text,min,max,step,value:settings[k],disabled:busy||voiceBusy,style:{flex:1,minWidth:0,margin:0,height:18},onChange:e=>update(k,Number(e.target.value))}),
      h('input',{id:'story-'+k,'aria-label':text+' value','aria-invalid':invalidField?.[0]===k,type:'number',min,max,step,value:settings[k],disabled:busy||voiceBusy,style:{...ctrl,width:42,flexShrink:0,textAlign:'right',padding:'2px 3px'},onChange:e=>update(k,e.target.value),onBlur:e=>{if(typeof settings[k]==='string'&&e.target.value!==''&&Number.isFinite(Number(e.target.value)))update(k,Number(e.target.value));}})),k);
  const selectRow=(text,k,options,extra)=>row(text,h('div',{style:{display:'flex',alignItems:'center',gap:4,minWidth:0}},
      h('select',{id:'story-'+k,'aria-label':text,value:settings[k],disabled:busy||voiceBusy||voicesLoading||!options.length,style:{...ctrlSelect,flex:1,minWidth:0,paddingLeft:4},onChange:e=>update(k,e.target.value)},...options),extra||null),k);
  const segmentRow=(text,value,items,onChange,id)=>row(text,h('div',{role:'group','aria-label':text,style:{display:'grid',gridTemplateColumns:'repeat('+items.length+',minmax(0,1fr))',padding:1,gap:1,border:'1px solid '+border,borderRadius:5,background:raised,height:24}},
      ...items.map(([v,t])=>h('button',{key:String(v),type:'button','data-variant':'ghost','aria-pressed':value===v,disabled:busy||voiceBusy,onClick:()=>onChange(v),style:{height:20,minHeight:20,padding:'0 2px',fontSize:11,borderRadius:4,border:'none',background:value===v?surface:'transparent',color:value===v?'var(--panel-fg)':muted,fontWeight:value===v?600:400,boxShadow:value===v?'0 1px 2px #00000014':'none'}},t))),id);
  const colorRow=(text,k)=>row(text,h('input',{id:'story-'+k,'aria-label':text,type:'color',value:settings[k],disabled:busy||voiceBusy,style:{...ctrl,padding:2,cursor:'pointer'},onChange:e=>update(k,e.target.value)}),k);
  const actionButton=(text,onClick,opts={})=>h('button',{key:text,type:'button','data-variant':opts.variant==='primary'?undefined:(opts.variant||'secondary'),disabled:opts.disabled,onClick,style:{width:'100%',height:26,minHeight:26,fontSize:11.5,borderRadius:5,marginTop:opts.gap?4:0}},text);
  const voiceCatalog=settings.voiceProvider==='elevenlabs'?cloudVoices:localVoices;
  const voiceKey=side=>settings.voiceProvider==='elevenlabs'?(side==='left'?'cloudThem':'cloudMe'):(side==='left'?'localThem':'localMe');
  const voiceOptions=k=>[
    !voiceCatalog.length&&h('option',{key:'none',value:settings[k]||''},voicesLoading?'Loading…':'No voices'),
    voiceCatalog.length>0&&settings[k]&&!voiceCatalog.some(v=>v.id===settings[k])&&h('option',{key:'gone',value:settings[k],disabled:true},'Unavailable'),
    ...voiceCatalog.map(v=>h('option',{key:v.id,value:v.id,title:v.name+' · '+v.locale},v.name+' · '+(String(v.locale).endsWith('GB')?'UK':String(v.locale).endsWith('US')?'US':v.locale)))
  ].filter(Boolean);
  const auditionButton=side=>h('button',{type:'button','data-variant':'ghost','aria-label':'Preview '+(side==='left'?'Them':'Me')+' voice',title:'Preview voice',disabled:busy||voiceBusy||voicesLoading||!voiceCatalog.length,onClick:()=>audition(side),style:{width:22,height:22,minHeight:22,padding:0,flexShrink:0,display:'inline-flex',alignItems:'center',justifyContent:'center',borderRadius:4}},h(StudioIcon,{name:'play',size:10}));
  const menuButton=(text,action)=>h('button',{type:'button','data-variant':'ghost',disabled:busy||voiceBusy,onClick:()=>{closeMenu();action();moreRef.current?.querySelector('summary')?.focus();},style:{width:'100%',minHeight:30,height:'auto',textAlign:'left',whiteSpace:'normal',overflowWrap:'anywhere',padding:'7px 8px',fontSize:12,lineHeight:1.3,borderRadius:4}},text);
  const play=startPreview;
  const clock=(seconds)=>{const n=Math.max(0,Number(seconds)||0);return n<60?n.toFixed(1)+'s':Math.floor(n/60)+':'+String(Math.round(n%60)).padStart(2,'0');};
  const voiceCount=plan?.messages.filter(m=>!m.silent&&/[\p{L}\p{N}]/u.test(m.text)).length||0;
  const primaryDetail=(()=>{
    if(busy||voiceBusy||setupBusy||voicesLoading||error||!plan)return '';
    if(voiceMode&&!voiceReady)return settings.voiceProvider==='kokoro'&&!engineReady?'':voiceCount+(voiceCount===1?' voice':' voices');
    if(!info)return '';
    return (voiceMode?voiceCount+(voiceCount===1?' voice · ':' voices · '):'')+clock(plan.duration)+' at '+startLabel;
  })();
  const primaryLabel=voicesLoading?'Loading voices…':voiceBusy?'Generating…':voiceMode&&!voiceReady?(settings.voiceProvider==='kokoro'&&!engineReady?'Set up voices':'Generate voices'):busy?(lock.current?'Applying…':'Loading…'):'Apply to Draft';
  const rawError=statusKind==='error'?status:(!scriptFocused?error:'');
  const readableError=(value)=>{
    let text=String(value||'').trim();
    if(text.startsWith('{')||text.startsWith('[')){
      try{const parsed=JSON.parse(text);text=String(parsed.error||parsed.message||parsed.detail?.message||parsed.detail||parsed.stderr||parsed.output||'').trim();}
      catch{text=(text.match(/"(?:error|message|detail|stderr)"\s*:\s*"((?:[^"\\]|\\.)*)"/)||[])[1]||'';}
    }
    text=text.replace(/^Error:\s*/i,'').split('\n').map(l=>l.trim()).filter(l=>l&&l!=='{'&&l!=='}'&&!/^(Traceback|File ")/.test(l))[0]||'';
    if(!text)return 'Something went wrong. Open Details.';
    return text.length>120?text.slice(0,117).trimEnd()+'…':text;
  };
  const firstError=(()=>{
    if(!rawError)return '';
    const text=String(rawError);
    const room=text.match(/NO_ROOM:([\d.]+):([\d.]+)/);
    if(room)return 'Needs '+room[1]+'s but only '+room[2]+'s left after '+startLabel+'. Move the playhead earlier.';
    return readableError(text);
  })();
  const helpContent=pane==='help'?h('div',{style:{display:'grid',gap:6}},h('strong',null,'Quick guide'),h('small',null,'One message per line. Use Them: for incoming and Me: for outgoing. Put --- on its own line to start a new page; it is never spoken. Empty pages are ignored. With Voice timing, Me[0.25]: Hello! adds a 0.25-second delay after speech. In Silent mode, brackets set total message duration.'),h('small',null,'The preview shows only the overlay. Your current Draft supplies the background. Existing background audio and cuts are preserved; generated narration is added on its own audio track.'),h('small',null,'Use Cmd/Ctrl+Enter to apply. Generate voices first, then apply. Local Kokoro TTS needs no API key. ElevenLabs may charge for API usage.')):pane==='qa'?h('div',{style:{display:'grid',gap:6}},h('strong',null,'Reference verification'),h('small',null,'Near-pixel match: not passed. Tested '+REFERENCE_QA.testedOn+'.'),...REFERENCE_QA.frames.map(row=>h('small',{key:row.time},row.time.toFixed(3)+' s · '+row.within_5_per_channel_pct.toFixed(1)+'% within ±5 RGB.')),h('small',null,'Historical static-layout test, before voice timing. This does not certify current speech timing or custom inputs. Bitwise equality was not achieved.')):pane==='details'?h('div',{style:{display:'grid',gap:6}},h('strong',null,'Action details'),h('small',{style:{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}},rawError||status)):null;
  const progressBar=(voiceBusy||setupBusy)&&h('div',{key:'progress',role:'progressbar','aria-label':setupBusy?'Setting up voices':'Generating voices','aria-valuemin':0,'aria-valuemax':progress?.total||100,'aria-valuenow':progress?.done,style:{display:'grid',gap:3,marginTop:4}},
    h('div',{style:{height:4,borderRadius:3,background:raised,overflow:'hidden',position:'relative'}},
      progress&&progress.total
        ?h('div',{style:{height:'100%',width:Math.round(Math.min(1,progress.done/progress.total)*100)+'%',background:'var(--panel-accent)',transition:'width .25s ease'}})
        :h('div',{'data-indeterminate':true,style:{height:'100%',width:'38%',borderRadius:3,background:'var(--panel-accent)',animation:'storyScan 1.1s ease-in-out infinite'}})),
    h('div',{style:{fontSize:10.5,color:muted,fontVariantNumeric:'tabular-nums'}},setupBusy?'Preparing engine…':progress&&progress.total?'Voice '+Math.min(progress.done+1,progress.total)+' of '+progress.total:'Working…'));
  const progressKeyframes=h('style',{key:'kf'},'@keyframes storyScan{0%{transform:translateX(-100%)}100%{transform:translateX(320%)}}');
  const previewSection=h('section',{'aria-label':'Overlay preview',style:{display:'flex',flexDirection:'column',gap:4,minWidth:0,minHeight:0,position:twoColumn?'sticky':'static',top:twoColumn?0:'auto',borderLeft:twoColumn?'1px solid '+border:'none',paddingLeft:twoColumn?12:0}},
      h('div',{ref:previewBoxRef,style:{display:'flex',alignItems:'center',justifyContent:'center',flex:1,minHeight:twoColumn?80:0,overflow:'hidden'}},
        h(StudioPreview,{markup:previewMarkup,full:false,frameWidth:w,frameHeight:hh,panelWidth:previewInner,maxHeightPx:previewMaxHeight})),
      h('div',{style:{display:'grid',gridTemplateColumns:'26px minmax(0,1fr) auto',gap:5,alignItems:'center'}},
        h('button',{'data-variant':'ghost',type:'button','aria-label':playing?'Pause preview':'Play preview',title:playing?'Pause preview':'Play preview',disabled:!!error||audioLoading||voiceBusy,onClick:play,style:{...iconStyle,width:26,height:26,minHeight:26,padding:6}},h(StudioIcon,{name:playing?'pause':'play',size:13})),
        h('input',{type:'range','aria-label':'Preview playhead',min:0,max:Math.max(.1,duration-.001),step:.05,value:Math.min(time,duration-.001),style:{width:'100%',minWidth:0,margin:0},onChange:e=>{playEpoch.current++;stopPreviewSound();setPlaying(false);setTime(Number(e.target.value));}}),
        h('span',{title:Math.min(time,duration).toFixed(2)+' / '+duration.toFixed(2)+' seconds',style:{fontSize:10.5,fontVariantNumeric:'tabular-nums',color:muted}},formatTime(Math.min(time,duration)))
      )
    );
  const controlsSection=h('div',{'data-controls':true,style:{display:'flex',flexDirection:'column',gap:6,minWidth:0}},compact?h('select',{'aria-label':'Editing section',value:tab,onChange:e=>setTab(e.target.value),style:inputStyle},h('option',{value:'script'},'Script'),h('option',{value:'voice'},'Voice'),h('option',{value:'timing'},'Timing'),h('option',{value:'style'},'Style')):
      h('div',{role:'tablist','aria-label':'Editing section',style:{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',padding:2,gap:2,background:raised,borderRadius:6,border:'1px solid '+border}},...['script','voice','timing','style'].map(t=>h('button',{key:t,id:'story-tab-'+t,role:'tab','aria-label':t[0].toUpperCase()+t.slice(1),'data-tab':t,'aria-selected':tab===t,'aria-controls':'story-panel-'+t,tabIndex:tab===t?0:-1,'data-variant':'ghost',onClick:()=>setTab(t),onKeyDown:e=>{const ts=['script','voice','timing','style'],i=ts.indexOf(tab);let next=null;if(e.key==='ArrowRight')next=ts[(i+1)%4];if(e.key==='ArrowLeft')next=ts[(i+3)%4];if(e.key==='Home')next=ts[0];if(e.key==='End')next=ts[3];if(next){e.preventDefault();setTab(next);e.currentTarget.parentElement.querySelector('[data-tab="'+next+'"]').focus();}},style:{...tinyStyle,fontSize:11,padding:'3px 2px',height:26,minHeight:26,background:tab===t?surface:'transparent',border:tab===t?'1px solid '+border:'1px solid transparent',color:tab===t?'var(--panel-fg)':muted,fontWeight:tab===t?600:400,boxShadow:tab===t?'0 1px 2px #00000012':'none'}},t==='timing'?'Time':t[0].toUpperCase()+t.slice(1)))),
    h('section',{id:'story-panel-'+tab,role:'tabpanel','aria-label':tab[0].toUpperCase()+tab.slice(1),style:{display:'flex',flexDirection:'column',gap:5,minWidth:0,flex:twoColumn?1:'none',minHeight:0}},
      tab==='script'?h(React.Fragment,null,
        row('Contact',h('input',{id:'story-name','aria-label':'Contact name',value:settings.name,maxLength:24,disabled:busy||voiceBusy,style:ctrl,onChange:e=>update('name',e.target.value)}),'name'),
        h('div',{style:{...rowStyle,gridTemplateColumns:'1fr'}},
          h('div',{style:{display:'flex',alignItems:'center',gap:4}},
            h('label',{htmlFor:'story-script',style:labelStyle},'Messages'),
            h('span',{style:{position:'relative',display:'inline-flex'}},
              h('span',{role:'button',tabIndex:0,'aria-expanded':msgHelpOpen,'aria-label':'Writing rules','aria-describedby':'story-msg-help',
                onMouseEnter:()=>setMsgHelpOpen(true),onMouseLeave:()=>setMsgHelpOpen(false),
                onFocus:()=>setMsgHelpOpen(true),onBlur:()=>setMsgHelpOpen(false),
                onClick:()=>setMsgHelpOpen(v=>!v),
                onKeyDown:e=>{if(e.key==='Escape'){setMsgHelpOpen(false);e.currentTarget.blur();}},
                style:{cursor:'help',fontSize:12,lineHeight:1,opacity:.85}},'\u2139\ufe0f'),
              msgHelpOpen&&h('div',{id:'story-msg-help',role:'tooltip',style:{position:'absolute',left:'100%',top:0,marginLeft:6,zIndex:20,width:200,padding:'8px 9px',borderRadius:8,background:surface,border:'1px solid '+border,boxShadow:'0 6px 16px #00000038',display:'grid',gap:5}},
                h('div',{style:{fontWeight:600,fontSize:11}},'Writing a conversation'),
                h('div',{style:{fontSize:10.5,color:muted,lineHeight:1.35}},'One line = one message.'),
                tipRow('Them: / Me:','shows who is texting'),
                tipRow('---','alone on a line starts a new page'),
                tipRow('[0.3]','Voice mode: pause afterward'),
                tipRow('[0.3]','Silent mode: time on screen'))))),
        h('textarea',{ref:scriptRef,id:'story-script','aria-label':'Message script','aria-invalid':!!error&&!scriptFocused,'aria-describedby':'story-validation',value:settings.script,onFocus:()=>setScriptFocused(true),onBlur:()=>setScriptFocused(false),spellCheck:false,disabled:busy||voiceBusy,placeholder:'Them: Hello\nMe: Hey!\n---\nThem: Next page',style:{...inputStyle,height:twoColumn?'auto':156,flex:twoColumn?1:'none',minHeight:104,maxHeight:twoColumn?'none':360,resize:twoColumn?'none':'vertical',lineHeight:1.55,padding:7,fontSize:12.5},onChange:e=>update('script',e.target.value)})
      ):tab==='voice'?h(React.Fragment,null,
        segmentRow('Narration',settings.timingMode,[['tts','Voice'],['manual','Silent']],v=>update('timingMode',v),'timingModeVoice'),
        settings.timingMode==='manual'
          ?hint('Silent is selected, so no voice will be generated or added. Pick Voice above to narrate the messages.')
          :h(React.Fragment,{key:'voice-controls'},
              row('Engine',h('select',{id:'story-voiceProvider','aria-label':'Speech engine',value:settings.voiceProvider,disabled:busy||voiceBusy,style:ctrlSelect,onChange:e=>{update('voiceProvider',e.target.value);setVoiceMessage('');}},h('option',{value:'kokoro'},'Local · Free'),h('option',{value:'elevenlabs'},'ElevenLabs')),'voiceProvider'),
              selectRow('Them voice',voiceKey('left'),voiceOptions(voiceKey('left')),auditionButton('left')),
              selectRow('Me voice',voiceKey('right'),voiceOptions(voiceKey('right')),auditionButton('right')),
              numberRow('Rate ×','speechRate',.7,1.2,.05),
              settings.voiceProvider==='kokoro'
                ?(!engineReady&&actionButton(setupBusy?'Setting up…':'Set up free voices',setupEngine,{disabled:setupBusy||voiceBusy,gap:true}))
                :h('details',{key:'account',open:!cloudConnected},
                    h('summary',{style:{fontSize:11,color:muted,padding:'3px 0'}},'ElevenLabs account'),
                    h('div',{style:{display:'grid',gap:4,paddingTop:2}},
                      h('input',{type:'password','aria-label':'ElevenLabs API key',autoComplete:'off',spellCheck:false,value:apiKey,placeholder:'API key',disabled:busy||voiceBusy||voicesLoading,style:ctrl,onChange:e=>{connectionEpoch.current++;setApiKey(e.target.value);setCloudConnected(false);}}),
                      row('Metered use',h('input',{type:'checkbox','aria-label':'Allow metered API requests',checked:cloudConsent,disabled:voiceBusy,style:{width:14,height:14,margin:0},onChange:e=>setCloudConsent(e.target.checked)}),'consent','Generating sends text to ElevenLabs and may be billed.'),
                      actionButton(voicesLoading?'Connecting…':cloudConnected?'Refresh voices':'Connect',()=>connectEleven(false),{disabled:busy||voiceBusy||voicesLoading||!apiKey}),
                      cloudPage&&actionButton('Load more voices',()=>connectEleven(true),{disabled:voicesLoading||voiceBusy}),
                      cloudConnected&&actionButton('Disconnect',()=>{connectionEpoch.current++;setApiKey('');setCloudConnected(false);setCloudVoices([]);setCloudConsent(false);stopAudition();},{disabled:voiceBusy}))),
              voiceReady&&!voiceBusy&&actionButton('Regenerate voices',generateVoices,{disabled:!canGenerate,gap:true}),
              progressBar,
              voiceBusy&&actionButton('Cancel',cancelVoices,{gap:true}),
              voiceMessage&&h('div',{role:'status',style:{fontSize:10.5,lineHeight:1.35,color:muted,overflowWrap:'anywhere',marginTop:2}},voiceMessage))
      ):tab==='style'?h(React.Fragment,null,
        group('Bubbles'),
        sliderRow('Width %','widthPct',45,96),
        sliderRow('Top %','topPct',0,65),
        sliderRow('Text size','fontSize',24,56),
        colorRow('Incoming','leftColor'),
        colorRow('Outgoing','rightColor'),
        group('Frame'),
        segmentRow('Output',settings.portrait,[[false,'Keep'],[true,'9:16']],v=>update('portrait',v),'portrait'),
        numberRow('Unread badge','unreadCount',0,999)
      ):h(React.Fragment,null,
        settings.timingMode==='tts'?h(React.Fragment,null,
          numberRow('After voice · s','afterSpeech',0,30,.05),
          numberRow('End hold · s','tailSeconds',0,10,.1),
          hint(voiceReady?'Message start = previous audio end + delay.':'Generate voices for exact timing; preview is an estimate.'),
          voiceReady&&h('details',null,h('summary',{style:{fontSize:11,color:muted,padding:'3px 0'}},'Measured timing'),
            ...(plan?.messages||[]).map((m,i)=>h('div',{key:i,style:{fontSize:10.5,color:muted,padding:'2px 0',display:'flex',justifyContent:'space-between',gap:8}},h('span',null,(i+1)+'. '+m.speechDuration.toFixed(2)+'s + '+m.gap.toFixed(2)+'s'),h('span',{style:{fontVariantNumeric:'tabular-nums'}},m.start.toFixed(2)+'s'))))
        ):h(React.Fragment,null,
          segmentRow('Duration',settings.fit,[[true,'Fit'],[false,'Custom']],v=>update('fit',v),'fit'),
          segmentRow('Pacing',settings.autoLength,[[true,'By text'],[false,'Fixed']],v=>update('autoLength',v),'autoLength'),
          numberRow('End hold · s','tailSeconds',0,10,.1),
          !settings.autoLength&&numberRow('Interval · s','interval',.3,20,.1),
          !settings.fit&&numberRow('Speed ×','speed',.5,2,.05),
          hint('Silent mode applies the graphic without narration.')
        )
      )
    ));
  const layout=twoColumn
    ?h('div',{'data-layout':'two-column',style:{display:'grid',gridTemplateColumns:'minmax(0,1fr) '+previewColumn+'px',gap:12,alignItems:'stretch',minWidth:0,flex:1,minHeight:0}},controlsSection,previewSection)
    :h('div',{'data-layout':'single-column',style:{display:'grid',gap:8,minWidth:0,flex:1,minHeight:0}},previewSection,controlsSection);
  return h('div',{ref:rootRef,'data-studio':'dense',style:{display:'flex',flexDirection:'column',gap:8,minWidth:0,minHeight:panelHeight>0?Math.max(0,panelHeight-6)+'px':undefined,fontSize:12,color:'var(--panel-fg)',colorScheme:dark?'dark':'light'},onKeyDown:e=>{if(e.key==='Escape'){const wasOpen=moreRef.current?.open;closeMenu();setPane(null);if(wasOpen)moreRef.current.querySelector('summary')?.focus();}if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){if(voiceMode&&!voiceReady&&canGenerate){e.preventDefault();generateVoices();}else if(canApply){e.preventDefault();apply();}}}},
    layout,
    notice&&h('div',{role:'status',style:{...small,display:'flex',alignItems:'center',gap:4,flexWrap:'wrap'}},h('span',{style:{flex:1,minWidth:0}},notice),inputUndo&&h('button',{'data-variant':'ghost',onClick:()=>{setSettings(inputUndo.settings);setNotice('Input change undone');setInputUndo(null);setPlaying(false);},style:{...tinyStyle,width:'auto',height:23,minHeight:23,padding:'2px 4px'}},'Undo')),
    helpContent&&h('aside',{style:{fontSize:11.5,lineHeight:1.4,padding:8,background:raised,border:'1px solid '+border,borderRadius:6,minWidth:0}},h('div',{style:{display:'flex',justifyContent:'flex-end',marginBottom:2}},h('button',{'data-variant':'ghost','aria-label':'Close information',onClick:()=>setPane(null),style:{...iconStyle,width:24,height:24,minHeight:24,padding:5}},h(StudioIcon,{name:'close'}))),helpContent),
    progressKeyframes,
    tab!=='voice'&&progressBar,
    h('footer',{'data-sticky-actions':true,style:{position:'sticky',bottom:0,zIndex:12,background:surface,borderTop:'1px solid '+border,padding:'8px 0 3px',display:'grid',gap:6,minWidth:0}},
      rawError&&h('div',{id:'story-validation',role:'alert',style:{display:'flex',alignItems:'baseline',gap:6,fontSize:11,lineHeight:1.35,color:'var(--panel-danger)',minWidth:0}},h('span',{style:{flex:1,minWidth:0,overflowWrap:'anywhere'}},firstError),h('button',{'data-variant':'ghost',title:'Show the full message',onClick:()=>setPane('details'),style:{...tinyStyle,width:'auto',height:20,minHeight:20,padding:'0 4px',fontSize:10.5,color:muted,flexShrink:0}},'Details')),
      cleanStatus&&cleanStatus!==primaryLabel&&h('div',{style:{...small,minWidth:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}},cleanStatus),
      h('div',{style:{display:'flex',gap:6,alignItems:'center'}},h('button',{type:'button',disabled:setupBusy||voicesLoading||(voiceMode&&!voiceReady?(settings.voiceProvider==='kokoro'&&!engineReady?busy||voiceBusy:!canGenerate):!canApply),onClick:voiceMode&&!voiceReady?(settings.voiceProvider==='kokoro'&&!engineReady?()=>setTab('voice'):generateVoices):apply,title:voiceMode&&!voiceReady?'Generate audio only; no Draft changes':'Insert at the playhead ('+startLabel+') · Cmd/Ctrl+Enter',style:{flex:1,minWidth:0,height:32,minHeight:32,fontSize:12,fontWeight:600,padding:'5px 7px',borderRadius:6,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:1,lineHeight:1.15,height:primaryDetail?38:32,minHeight:primaryDetail?38:32}},h('span',null,primaryLabel),primaryDetail&&h('span',{style:{fontSize:10,fontWeight:400,opacity:.78,fontVariantNumeric:'tabular-nums'}},primaryDetail)),lastCommit&&h('button',{'data-variant':'secondary','aria-label':'Undo last apply',title:'Undo last apply',disabled:busy||voiceBusy,onClick:undo,style:{...iconStyle,height:primaryDetail?38:32,minHeight:primaryDetail?38:32,width:30}},h(StudioIcon,{name:'undo'}))),
      link&&h('a',{href:link,style:{fontSize:11,textAlign:'center'}},'View in Timeline')
    )
  );
}
