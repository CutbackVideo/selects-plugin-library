// Domain reads and editable Image placement use the public Project/Draft SDK.
async function galleryNativeResources(sdk, projectId, media, libraryId = null) {
  const result = await sdk.runScript({
    script: `const p=selects.project(${JSON.stringify(projectId)}),resources=await p.resources(),nodes=[];
      const visit=items=>{for(const node of items||[])node.type==='dir'?visit(node.children):nodes.push(node);};
      const view=await p.sourceFiles();if(view.fileTree)visit(view.fileTree);else for(const folder of view.folders||[])visit((await p.sourceFiles({folder:folder.name})).fileTree);
      return ${JSON.stringify(media)}.map((item,index)=>{const matches=nodes.filter(node=>node.path===item.path&&resources.some(r=>r.resourceId===node.resourceId&&r.type.toLowerCase()===item.kind));
        if(matches.length!==1)throw Error('Tile '+(index+1)+' has no unique Project Resource at its selected path');
        const row=matches[0],size=row.frameSize;
        if(!Number.isSafeInteger(size?.width)||size.width<1||!Number.isSafeInteger(size?.height)||size.height<1)throw Error('Tile '+(index+1)+' has no verified image dimensions');
        return {...item,resourceId:row.resourceId,width:size.width,height:size.height};});`,
    summary: 'Verify Gallery Project media', allowCommit: false,
  });
  if (result.isError || !Array.isArray(result.result)) throw new Error(result.output || 'Project media could not be verified');
  return { selected: result.result };
}

async function galleryNativePlace(sdk, projectId, draftId, media, plan, libraryId = null) {
  const selected = (await galleryNativeResources(sdk, projectId, media, libraryId)).selected;
  const result = await sdk.runScript({
    script: `const p=selects.project(${JSON.stringify(projectId)}),d=selects.draft(${JSON.stringify(draftId)}),plan=${JSON.stringify(plan)},media=${JSON.stringify(selected)};
      if(!(await p.meta()).draftIds.includes(${JSON.stringify(draftId)}))throw Error('Target Draft does not belong to this Project');
      const meta=await d.meta();if(meta.fps!==plan.fps||meta.durationFrames!==plan.durationFrames)throw Error('Gallery Draft clock or duration changed');
      const placements=[];for(let index=0;index<plan.tiles.length;index++){const tile=plan.tiles[index];if(tile.kind!=='image')continue;
        const before=new Set((await d.clips({trackScope:'all'})).map(c=>c.clipId));
        await d.overlayResource({resource:p.resource(media[index].resourceId),over:await d.rangeAtFrames(tile.revealFrame,tile.endFrame)});
        const added=(await d.clips({trackScope:'all'})).filter(c=>!before.has(c.clipId));
        if(added.length!==1||added[0].resourceId!==media[index].resourceId||added[0].startFrame!==tile.revealFrame||added[0].endFrame!==tile.endFrame)throw Error('Gallery Image interval changed');
        placements.push(added[0]);}
      if((await d.meta()).durationFrames!==plan.durationFrames)throw Error('Gallery duration changed');
      if(placements.length)await d.commitAll('Place original Gallery Images');return {placements};`,
    summary: 'Place original Gallery Images', allowCommit: true, timeoutSeconds:120,
  });
  if (result.isError || !result.result) throw new Error(result.output || 'Image placement could not be confirmed; inspect the Draft before retrying');
  return result.result;
}
