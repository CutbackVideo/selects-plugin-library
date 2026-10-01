// Asset preparation is read-only with respect to Selects. No generated footage or paid services.
import fs from 'node:fs/promises';
import path from 'node:path';

async function inspect(file, ffmpeg, ffprobe, run) {
  const p=await run(ffprobe,['-v','error','-show_streams','-show_format','-of','json',file],{timeoutMs:20000});
  if(p.code!==0)throw Error('Unreadable media');
  const info=JSON.parse(p.out),v=info.streams?.find(s=>s.codec_type==='video');
  if(!v || v.width<320 || v.height<240)throw Error('Media below 320×240');
  const duration=Number(info.format?.duration||v.duration||0);
  const still=/image2|png_pipe|jpeg_pipe|webp_pipe/.test(info.format?.format_name||'') || duration===0;
  const times=still?[0]:[0.1,Math.min(duration*0.5,duration-0.05),Math.max(0,duration-0.1)];
  const pixels=[];
  // Binary pixels are written to files because the legacy process helper captures UTF-8 stdout.
  for(let i=0;i<times.length;i++) {
    const out=file+'.motion-'+i+'.rgb';
    const r=await run(ffmpeg,['-v','error','-y','-ss',String(times[i]),'-i',file,'-frames:v','1','-vf','scale=32:32','-pix_fmt','rgb24','-f','rawvideo',out],{timeoutMs:20000});
    if(r.code!==0)throw Error('Cannot decode sampled frame');
    pixels.push(await fs.readFile(out)); await fs.unlink(out);
  }
  let delta=0;
  for(const p of pixels.slice(1)) {if(p.length!==pixels[0].length)throw Error('Invalid sampled pixels');delta=Math.max(delta,p.reduce((s,x,i)=>s+Math.abs(x-pixels[0][i]),0)/p.length);}
  return {width:v.width,height:v.height,duration,kind:still||delta<2?'still':'video',motionDelta:Number(delta.toFixed(3))};
}
async function preview(file, out, info, ffmpeg, run, t=0) {
  const vf="split[a][b];[a]scale=256:456:force_original_aspect_ratio=decrease,pad=256:456:(ow-iw)/2:(oh-ih)/2[a1];[b]scale=256:456:force_original_aspect_ratio=increase,crop=256:456[b1];[a1][b1]hstack";
  const r=await run(ffmpeg,['-v','error','-y','-ss',String(t),'-i',file,'-filter_complex',vf,'-frames:v','1',out],{timeoutMs:30000});
  if(r.code!==0)throw Error('Cannot render asset preview');
}
export async function candidates(job, dir, u) {
  const spec=job.candidates, result=[]; await fs.mkdir(path.join(dir,'candidates'),{recursive:true});
  // Sequential download protects public source rate limits and bounds working-set memory.
  for(const item of spec.items) {
    let choices=(item.candidates||[]).filter(c=>c.path||c.url).slice(0,3);
    if(choices.length<3)choices.push(...(await u.commonsUrls(item.query,3)).slice(0,3-choices.length));
    const rows=[];
    for(const [i,c] of choices.entries()) {
      const id=item.id+'-'+i;
      try {
        const file=path.join(dir,'candidates',id+'.source');
        if(c.path)await fs.copyFile(c.path,file);else if(!await u.download(c.url,file))continue;
        const info=await inspect(file,spec.ffmpeg,spec.ffprobe,u.run);
        const thumb=path.join(dir,'candidates',id+'.jpg');await preview(file,thumb,info,spec.ffmpeg,u.run);
        const frames=[thumb];
        if(info.kind==='video') {const mid=path.join(dir,'candidates',id+'-mid.jpg');await preview(file,mid,info,spec.ffmpeg,u.run,info.duration/2);frames.push(mid);}
        rows.push({id,file,preview:thumb,frames,...info,source:c.source||(c.path?'project':'web'),page:c.page||c.url||c.path,url:c.url||null,license:c.license||'',author:c.author||'',title:c.title||'',originalPath:c.path||null});
      } catch(e) { rows.push({id,error:String(e.message)}); }
    }
    result.push({id:item.id,query:item.query,desiredKind:item.desiredKind||'video',candidates:rows});
  }
  return {items:result};
}
export async function assets(job, dir, u) {
  const spec=job.assets, media=path.join(dir,spec.mediaFolder);await fs.mkdir(media,{recursive:true});
  const rows=[];
  for(const item of spec.items) {
    const c=item.candidate;
    if(!c || c.error || !item.review?.accepted) {rows.push({id:item.id,ok:false,reason:'No visually accepted candidate'});continue;}
    const x=Number(item.review.focusX),y=Number(item.review.focusY);
    if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>1||y<0||y>1)throw Error('Invalid crop focus');
    const file=path.join(media,item.id+'.mp4'),seconds=Math.max(0.1,item.seconds);
    // Short videos are rejected instead of frozen or silently looped.
    if(c.kind==='video' && c.duration<seconds) {rows.push({id:item.id,ok:false,reason:'Video is shorter than its planned cutaway'});continue;}
    const args=['-v','error','-y',...(c.kind==='still'?['-loop','1']:[]),'-i',c.file,'-t',String(seconds),'-vf',`scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920:(iw-ow)*${x}:(ih-oh)*${y},setsar=1,format=yuv420p`,'-r',String(spec.fps),'-c:v','libx264','-preset','veryfast','-crf','18','-movflags','+faststart','-an',file];
    const r=await u.run(spec.ffmpeg,args,{timeoutMs:120000});
    if(r.code!==0)throw Error('Asset rendering failed: '+r.err.slice(-300));
    const frames=[];
    for(const [n,t] of (c.kind==='video'?[0,seconds/2,Math.max(0,seconds-0.1)]:[0]).entries()){
      const thumb=path.join(dir,item.id+'-final-'+n+'.jpg');
      const rr=await u.run(spec.ffmpeg,['-v','error','-y','-ss',String(t),'-i',file,'-frames:v','1','-vf','scale=256:456',thumb],{timeoutMs:20000});
      if(rr.code!==0)throw Error('Cannot inspect final crop');frames.push(thumb);
    }
    const thumb=frames[0];
    rows.push({id:item.id,ok:true,path:file,preview:thumb,frames,kind:c.kind,seconds,width:1080,height:1920,review:item.review,source:c.source,url:c.url,page:c.page,license:c.license,author:c.author,originalPath:c.originalPath,motionDelta:c.motionDelta,substitution:item.desiredKind==='video'&&c.kind==='still'});
  }
  // A second search pass adds to the credits of the first instead of replacing them.
  const creditsFile=path.join(dir,'CREDITS.json');let earlier=[];try{earlier=JSON.parse(await fs.readFile(creditsFile,'utf8'));}catch{}
  await fs.writeFile(creditsFile,JSON.stringify([...earlier.filter(e=>!rows.some(r=>r.id===e.id)),...rows],null,2));
  return {items:rows};
}
