export function verificationFrames(cues:any[],pulses:any[],total:number,limit=64) {
  const wanted=[cues.find(c=>c.kind==='phrase')?.start,cues.find(c=>c.kind==='keyword')?.start,
    ...cues.map(c=>Number.isFinite(c.start)&&Number.isFinite(c.end)&&c.end>c.start?Math.min(total,c.end)-1:null),
    ...pulses.flatMap(p=>[p.start,p.end])];
  const all=Array.from(new Set(wanted.filter(f=>Number.isSafeInteger(f)&&f>=0&&f<total))).sort((a,b)=>a-b) as number[];
  if(!all.length)all.push(0);
  const frames=all.length<=limit?all:Array.from({length:limit},(_,i)=>all[Math.round(i*(all.length-1)/(limit-1))]);
  return {frames,complete:all.length<=limit,requested:all.length};
}

export async function verifyDraft(env: Env, projectId: string, draftId: string, manifest: any) {
  env.status(cwProgressText(env,"Checking the saved Draft and rendered frames…","\uc800\uc7a5\ub41c Draft\uc640 \ud654\uba74 \ud655\uc778 \uc911…"));
  const saved = await env.runScript(`const d=selects.draft(${JSON.stringify(draftId)});return {meta:await d.meta(),clips:await d.clips({trackScope:'all'}),graphics:await d.motionGraphics()};`, "Read back the saved style");
  const ids = new Set(saved.clips.map((c:any)=>c.clipId));
  const missing = Object.values(manifest.items || {}).filter((i:any)=>i.status==='applied'&&!ids.has(i.clipId));
  // Deleted items from completed runs are deliberate edits; unresolved pending items are failures.
  if(Object.values(manifest.items || {}).some((i:any)=>i.status==='pending'))throw new Error("An edit is pending; resume this Draft before verification.");
  const cues=manifest.cues||[];
  const total=saved.meta.durationFrames;
  const sampled=verificationFrames(cues,manifest.pulses||[],total),points=sampled.frames;
  env.status("Rendering representative saved frames…");
  // Small contact sheets keep late captions readable rather than shrinking the
  // entire short into the first phrase/keyword's two sample frames.
  const batches:number[][]=[];for(let i=0;i<points.length;i+=8)batches.push(points.slice(i,i+8));
  const images:any[]=[];
  for(const [batchIndex,frames] of batches.entries()) {
    env.status(cwProgressText(env,`Rendering saved preview batch ${batchIndex+1}/${batches.length}…`,`\uc800\uc7a5\ub41c \uacb0\uacfc \ubbf8\ub9ac\ubcf4\uae30 \ub80c\ub354 \uc911 ${batchIndex+1}/${batches.length}…`));
    // The host contact sheet already carries the source-render attestation.
    // Reuse that same artifact for visual review instead of rendering it twice.
    const captured=env.capture?await env.capture(draftId,frames):[];
    const observed=captured.flatMap(image=>image.frames||[]);
    if(observed.some(frame=>frame.hasSourceImage===false))throw new Error("One or more verification frames could not be rendered.");
    const attested=observed.length===frames.length&&observed.every((frame,i)=>frame.frameNumber===frames[i]&&frame.hasSourceImage===true);
    if(!attested) {
      // Older/custom environments may omit metadata. Keep the existing source
      // check in that case; absent evidence is never treated as a success.
      env.status(cwProgressText(env,`Checking saved preview sources ${batchIndex+1}/${batches.length}…`,`\uc800\uc7a5\ub41c \uacb0\uacfc \uc6d0\ubcf8 \ud45c\uc2dc \ud655\uc778 \uc911 ${batchIndex+1}/${batches.length}…`));
      const capture=await env.runScript(`const d=selects.draft(${JSON.stringify(draftId)});const c=await d.captureFrames({frames:${JSON.stringify(frames)}});return {frames:c.frames,width:c.width,height:c.height};`,"Render representative saved frames");
      if(!Array.isArray(capture.frames)||capture.frames.length!==frames.length||capture.frames.some((f:any)=>f.hasSourceImage!==true))throw new Error("One or more verification frames could not be rendered.");
    }
    images.push(...captured.map(image=>({...image,name:"Saved Draft frames "+frames.join(", ")})));
  }
  let visual:any={status:"unverified",reason:"Visual review was not available"};
  if(images.length) {
    try {
      // The reference frame is a local calibration file; the public package does not ship it.
      let withReference=false;
      try{images.push({dataUrl:await env.imageData!(hostJoin(env.pluginDir,"evidence","reference-frame.jpg")),name:"Original reference: target small-caption scale and fixed phrase layout"});withReference=true;}catch{}
      env.status(cwProgressText(env,"Reviewing the rendered images…","\ub80c\ub354\ub41c \ucd5c\uc885 \ud654\uba74 \uac80\ud1a0 \uc911…"));
      visual=parseJsonLoose(await env.askAI(`Only inspect the supplied images. Do not use tools, read files, edit anything, or ask follow-up questions. Inspect the saved Chris Williamson short. Every image named "Saved Draft frames ..." is a saved-result contact sheet; inspect all of those sheets, including late phrases. Their combined frame numbers are ${JSON.stringify(points)}.${withReference?' Only the separately named "Original reference: target small-caption scale and fixed phrase layout" image is the style-calibration reference.':" No original reference image is supplied."} Expected: full phrase BOX centred at 50% height, with small text about 53/1920 frame height (the editor set it 20% larger than the reference's 44) and keywords 150/1920. Reveal is word by word with future words invisible but occupying layout space, so the visible first word is intentionally left of centre. A new word is gray for 0.1 seconds. Do not demand every partially revealed word be individually centred, or demand larger text than the reference. Check the contrast of ordinary phrases over bright B-roll on every saved-result sheet, including the late phrases. Report actual clipping, unreadable glyphs, wrong B-roll subject, missing expected captions or broken layer order. Full-screen inversion flashes are not expected. Inverted color confined to keyword letters is intentional. Return JSON {"ok":boolean,"issues":[string]}. Do not claim export or Inspector testing from these pictures.`,120000,images));
      visual.status=visual.ok===true?"passed":"failed";
      visual.issues=reviewIssues(visual,"Visual review did not pass");
      if(visual.status==='passed'&&!sampled.complete)visual={status:'unverified',reason:`Only ${points.length} of ${sampled.requested} caption verification frames were reviewed.`};
    } catch(e:any) {visual={status:"unverified",reason:String(e.message).slice(0,200)};}
  }
  return {structure:"passed",render:"passed",visual,frames:points,sampling:sampled,deletedByUser:missing.length,export:"not_checked",inspector:"not_checked"};
}
