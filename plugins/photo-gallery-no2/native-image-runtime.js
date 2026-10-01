// Panel-only adapter to the editor's own timeline mutation service. The
// public plugin SDK currently refuses Image Resources in overlayResource.
// A template run passes the library it was handed (`context.template.libraryId`),
// since it keeps running while the person moves to another page; the Panel reads
// the open Project from the app's address.
async function galleryNativeContext(projectId, knownLibraryId = null) {
  const app = window.parent;
  let libraryId = knownLibraryId;
  if (!libraryId) {
    const match = app.location.pathname.match(/libraries\/([^/]+)\/projects\/([^/]+)/);
    if (!match || match[2] !== projectId) throw new Error('The open Project changed; reload its media');
    libraryId = match[1];
  }
  const di = app.__DI__;
  if (typeof di?.TimelineMutation?.run !== 'function' ||
      typeof di?.ProjectRepository?.findById !== 'function' ||
      typeof di?.ResourceRepository?.findById !== 'function' ||
      typeof di?.SequenceRepository?.findById !== 'function') {
    throw new Error('This Selects build does not expose native Image placement to plugins');
  }
  const project = await di.ProjectRepository.findById(libraryId, projectId);
  if (!project) throw new Error('The open Project was not found');
  return { di, libraryId, project };
}

async function galleryNativeResources(projectId, media, libraryId = null) {
  const ctx = await galleryNativeContext(projectId, libraryId);
  const members = await Promise.all(ctx.project.getResources().map(id =>
    ctx.di.ResourceRepository.findById(ctx.libraryId, id)));
  const selected = media.map((item, index) => {
    const matches = members.filter(resource => resource?.getMedia()?.path === item.path &&
      resource.getType().toLowerCase() === item.kind);
    if (matches.length !== 1) throw new Error(`Tile ${index + 1} has no unique Project Resource at its selected path`);
    const resource = matches[0], source = resource.getMedia();
    if (!Number.isSafeInteger(source.width) || source.width < 1 ||
        !Number.isSafeInteger(source.height) || source.height < 1) {
      throw new Error(`Tile ${index + 1} has no verified image dimensions`);
    }
    return { ...item, width: source.width, height: source.height, nativeResource: resource };
  });
  return { ...ctx, selected };
}

async function galleryNativeDraft(ctx, draftId) {
  if (!ctx.project.getEditedSequences().includes(draftId)) throw new Error('Target Draft does not belong to this Project');
  const sequence = await ctx.di.SequenceRepository.findById(ctx.libraryId, draftId);
  if (!sequence) throw new Error('Target Draft was not found');
  return sequence;
}

async function galleryNativeSetFps(projectId, draftId, libraryId = null) {
  const ctx = await galleryNativeContext(projectId, libraryId);
  const sequence = await galleryNativeDraft(ctx, draftId);
  const outcome = await ctx.di.TimelineMutation.run(sequence, 'photoGallery:set60Fps', current => {
    if (!current.isEmpty() || current.getDuration('resolved') !== 0) throw new Error('The new Draft is no longer empty');
    const candidate = current.clone();
    candidate.setMediaProperties({ frameRateRatio: { numerator: 60, denominator: 1 },
      frameSize: { width: 1080, height: 1920 }, sampleRate: current.getSampleRate() });
    if (candidate.getFrameRate() !== 60) throw new Error('Could not set 60 fps');
    return candidate;
  });
  if (outcome.status !== 'committed') throw new Error(`60 fps change ${outcome.status}; inspect the Draft before retrying`);
}

async function galleryNativePlace(projectId, draftId, media, plan, libraryId = null) {
  const imageTiles = plan.tiles.map((tile, i) => ({ tile, media: media[i], index: i })).filter(item => item.tile.kind === 'image');
  if (!imageTiles.length) return;
  const ctx = await galleryNativeResources(projectId, imageTiles.map(item => item.media), libraryId);
  const prepared = await Promise.all(ctx.selected.map(async (item, i) => {
    const analyzed = await item.nativeResource.getAnalyzedSequence();
    const main = analyzed?.getMainTrack();
    const primary = main?.getClips().find(clip => !clip.isGap());
    if (!analyzed || !main || !primary) throw new Error(`Tile ${imageTiles[i].index + 1} has no native placement source`);
    return { analyzed, main, primary, resource: item.nativeResource };
  }));
  const sequence = await galleryNativeDraft(ctx, draftId);
  const outcome = await ctx.di.TimelineMutation.run(sequence, 'photoGallery:place21Resources', current => {
    if (current.getFrameRate() !== 60 || current.getDuration('resolved') !== plan.durationFrames) {
      throw new Error('Gallery Draft clock or duration changed');
    }
    const candidate = current.clone();
    for (let i = 0; i < imageTiles.length; i++) {
      const tile = imageTiles[i].tile, item = prepared[i], slot = imageTiles[i].index + 1;
      const ids = candidate.place({ working: item.analyzed, primaryTrack: item.main,
        primaryOffset: 0, primaryClipId: item.primary.getId() }, tile.revealFrame, { kind: 'overlay' });
      if (ids.length !== 1) throw new Error(`Tile ${slot} did not create one independent clip`);
      const position = candidate.getClipPositionById(ids[0]);
      const wanted = plan.durationFrames - tile.revealFrame;
      if (!position || wanted < 1) throw new Error(`Tile ${slot} has no valid source range`);
      const result = candidate.trimClipBoundary({ trackId: position.trackId, clipId: ids[0],
        position: 'end', delta: wanted - position.clip.getDuration(), sourceDuration: wanted });
      if (result.trimmedClipPosition?.clip.getDuration() !== wanted) {
        throw new Error(`Tile ${slot} did not reach the output end`);
      }
    }
    return candidate;
  });
  if (outcome.status !== 'committed') throw new Error(`Image placement ${outcome.status}; inspect the Draft before retrying`);
}
