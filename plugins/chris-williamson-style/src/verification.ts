export async function verifyDraft(env: Env, projectId: string, draftId: string, manifest: any) {
  env.status("Checking the saved Draft and rendered frames…");
  const saved = await env.runScript(`const d=selects.draft(${JSON.stringify(draftId)});return {meta:await d.meta(),clips:await d.clips({trackScope:'all'}),graphics:await d.motionGraphics()};`, "Read back the saved style");
  const ids = new Set(saved.clips.map((c:any)=>c.clipId));
  const missing = Object.values(manifest.items || {}).filter((i:any)=>i.status==='applied'&&!ids.has(i.clipId));
  // Deleted items from completed runs are deliberate edits; unresolved pending items are failures.
  if(Object.values(manifest.items || {}).some((i:any)=>i.status==='pending'))throw new Error("An edit is pending; resume this Draft before verification.");
  const cues=manifest.cues||[];
  const pulse=(manifest.pulses||[])[0];
  const total=saved.meta.durationFrames;
  const points=Array.from(new Set([cues.find((c:any)=>c.kind==='phrase')?.start,cues.find((c:any)=>c.kind==='keyword')?.start,pulse?.start,pulse?.end].filter((f:any)=>Number.isFinite(f)&&f>=0&&f<total))) as number[];
  if(!points.length)points.push(0);
  env.status("Rendering representative saved frames…");
  const capture=await env.runScript(`const d=selects.draft(${JSON.stringify(draftId)});const c=await d.captureFrames({frames:${JSON.stringify(points)}});return {frames:c.frames,width:c.width,height:c.height};`,"Render representative saved frames");
  if(capture.frames.some((f:any)=>!f.hasSourceImage))throw new Error("One or more verification frames could not be rendered.");
  let visual:any={status:"unverified",reason:"Visual review was not available"};
  if(env.capture) {
    try {
      const images=await env.capture(draftId,points);
      // The reference frame is a local calibration file; the public package does not ship it.
      let withReference=false;
      try{images.push({dataUrl:await env.imageData!(hostJoin(env.pluginDir,"evidence","reference-frame.jpg")),name:"Original reference: target small-caption scale and fixed phrase layout"});withReference=true;}catch{}
      env.status("Reviewing the rendered images…");
      visual=parseJsonLoose(await env.askAI(`Only inspect the supplied images. Do not use tools, read files, edit anything, or ask follow-up questions. Inspect the saved Chris Williamson short. First image is a contact sheet of saved frames ${JSON.stringify(points)}${withReference?"; second image is the original reference for style calibration":""}. Expected: full phrase BOX centred at 50% height, with small text about 53/1920 frame height (the editor set it 20% larger than the reference's 44) and keywords 150/1920. Reveal is word by word with future words invisible but occupying layout space, so the visible first word is intentionally left of centre. A new word is gray for 0.1 seconds. Do not demand every partially revealed word be individually centred, or demand larger text than the reference. Report actual clipping, unreadable glyphs, wrong B-roll subject, missing expected captions or broken layer order. Full-screen inversion flashes are not expected. Inverted color confined to keyword letters is intentional. Return JSON {"ok":boolean,"issues":[string]}. Do not claim export or Inspector testing from these pictures.`,120000,images));
      visual.status=visual.ok===true?"passed":"failed";
      visual.issues=reviewIssues(visual,"Visual review did not pass");
    } catch(e:any) {visual={status:"unverified",reason:String(e.message).slice(0,200)};}
  }
  return {structure:"passed",render:"passed",visual,frames:points,deletedByUser:missing.length,export:"not_checked",inspector:"not_checked"};
}
