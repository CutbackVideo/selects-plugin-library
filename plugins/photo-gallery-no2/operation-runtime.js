// Executed inside Selects run_script by both the panel and the chat skill.
const TILE_EFFECT = `import {useCurrentFrame} from 'remotion';
export default function PhotoGalleryTile({Source,data}) {
  const frame = useCurrentFrame();
  const sourceW = data.sourceWidth, sourceH = data.sourceHeight;
  const frameW = data.frameWidth, frameH = data.frameHeight;
  const x = Math.max(frameW - sourceW, Math.min(0, frameW / 2 - data.focusX * sourceW));
  const y = Math.max(frameH - sourceH, Math.min(0, frameH / 2 - data.focusY * sourceH));
  return <div style={{position:'absolute',inset:0}}>
    <div style={{position:'absolute',left:data.cropLeft,top:data.cropTop,width:frameW,height:frameH,overflow:'hidden',filter:frame < data.colorAfterLocalFrame ? 'grayscale(1)' : 'none'}}>
      <div style={{position:'absolute',left:x,top:y,width:sourceW,height:sourceH}}><Source/></div>
    </div>
  </div>;
}`;

function galleryFail(message) { throw new Error(message); }

function galleryResolveResource(items, resourceId, path, label) {
  const byId = items.find((item) => item.resourceId === resourceId);
  if (typeof path !== 'string' || !path.startsWith('/')) galleryFail(`${label} path is required`);
  if (byId?.path === path) return byId;
  const matches = items.filter((item) => item.path === path);
  if (matches.length !== 1) galleryFail(`${label} path is missing or ambiguous in this Project`);
  return matches[0];
}

async function galleryInventory(project) {
  const resources = await project.resources();
  const byId = new Map();
  for (const row of resources) byId.set(row.resourceId, row);
  const overview = await project.sourceFiles();
  const nodes = [];
  const visit = (items) => {
    for (const item of items || []) {
      if (item.type === 'dir') visit(item.children);
      else nodes.push(item);
    }
  };
  if (Array.isArray(overview.fileTree)) visit(overview.fileTree);
  else if (overview.mode === 'summary' && Array.isArray(overview.folders)) {
    for (const folder of overview.folders) {
      const part = await project.sourceFiles({ folder: folder.name });
      if (!Array.isArray(part.fileTree)) galleryFail('Media inventory is incomplete');
      visit(part.fileTree);
    }
  } else galleryFail('Media inventory is unavailable');
  const media = [], audio = [];
  const seen = new Set();
  for (const node of nodes) {
    const resource = byId.get(node.resourceId);
    if (!resource || seen.has(node.resourceId) || typeof node.path !== 'string') continue;
    const type = String(resource.type).toLowerCase();
    const kind = type === 'image' ? 'image' : type === 'video' ? 'video' : type === 'audio' ? 'audio' : null;
    if (!kind) continue;
    const durationFrames = Number.isFinite(node.durationSeconds) ? Math.round(node.durationSeconds * 60) : null;
    const common = { resourceId: node.resourceId, name: node.name, path: node.path, durationFrames };
    if (kind === 'audio') audio.push(common);
    else if (kind === 'image' || (node.frameSize?.width > 0 && node.frameSize?.height > 0)) {
      media.push({ ...common, kind, width: node.frameSize?.width ?? null, height: node.frameSize?.height ?? null });
    }
    seen.add(node.resourceId);
  }
  const unavailable = resources.filter((resource) =>
    ['image', 'video', 'audio'].includes(String(resource.type).toLowerCase()) &&
    !media.some((item) => item.resourceId === resource.resourceId) &&
    !audio.some((item) => item.resourceId === resource.resourceId));
  return { media, audio, unavailable: unavailable.map((item) => ({ resourceId: item.resourceId, name: item.name })) };
}

function galleryGeometry(tile, source, colorFrame) {
  const { left, right, top, bottom } = tile.rect;
  const width = right - left, height = bottom - top;
  const q = Math.min(source.width / width, source.height / height);
  const frameWidth = width * q, frameHeight = height * q;
  const conform = Math.min(1080 / source.width, 1920 / source.height);
  return {
    effect: {
      sourceWidth: source.width, sourceHeight: source.height,
      frameWidth, frameHeight,
      cropLeft: (source.width - frameWidth) / 2,
      cropTop: (source.height - frameHeight) / 2,
      focusX: tile.focusX, focusY: tile.focusY,
      colorAfterLocalFrame: colorFrame - tile.revealFrame,
    },
    transform: {
      position: { x: (((left + right) / 2) - 540) / 1920 * 100, y: (960 - (top + bottom) / 2) / 1920 * 100 },
      scale: { x: 1 / (q * conform), y: 1 / (q * conform) },
    },
  };
}

function assertGalleryInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) galleryFail('Gallery input is required');
  if (typeof input.projectId !== 'string' || !input.projectId) galleryFail('Select a Project');
  if (!['inspect', 'importConverted', 'importBase', 'create', 'verifyCreated'].includes(input.operation)) galleryFail('Unknown gallery action');
  if (input.operation === 'create' && (!Array.isArray(input.media) || input.media.length !== 21)) galleryFail('Select exactly 21 visual slots');
  return input;
}

async function galleryImportConverted(selects, project, input, inventory, onImportStarted) {
  const requiredFrames = input.durationFrames ?? 853;
  if (!Number.isSafeInteger(requiredFrames) || requiredFrames < 1 || requiredFrames > 36000) {
    galleryFail('Converted still duration must be an integer from 1 to 36000 frames');
  }
  if (!Array.isArray(input.converted) || input.converted.length < 1 || input.converted.length > 21) {
    galleryFail('Provide one to 21 converted still-video files');
  }
  const seenSources = new Set();
  for (const item of input.converted) {
    const source = galleryResolveResource(inventory.media, item?.sourceResourceId, item?.sourcePath, 'Selected source');
    if (!source || seenSources.has(source.resourceId) ||
        typeof item.path !== 'string' || !/^\/(?:[^\0]+)\.mp4$/i.test(item.path)) {
      galleryFail('A prepared clip does not match one distinct Project photo or video and absolute MP4 path');
    }
    seenSources.add(source.resourceId);
  }
  const paths = [...new Set(input.converted.map((item) => item.path))];
  const probe = await selects.media.probe({ filePaths: paths });
  const probed = new Set((probe.files || []).filter((file) => !file.type || /video/i.test(file.type)).map((file) => file.path));
  if (probe.error || probe.errors?.length || probe.summary?.failed || paths.some((path) => !probed.has(path))) {
    galleryFail('A converted still-video file is missing or unreadable; no Project media was imported');
  }
  const currentByPath = new Map();
  for (const item of inventory.media) if (item.kind === 'video') currentByPath.set(item.path, item);
  const missing = paths.filter((path) => !currentByPath.has(path));
  if (missing.length) {
    if (typeof project.importFiles !== 'function') galleryFail('This Selects version cannot import converted still videos');
    onImportStarted();
    await project.importFiles({ paths: missing });
  }
  const fresh = missing.length ? await galleryInventory(project) : inventory;
  const importedByPath = new Map();
  for (const item of fresh.media) if (item.kind === 'video') importedByPath.set(item.path, item);
  const converted = input.converted.map((item) => {
    const video = importedByPath.get(item.path);
    if (!video || video.durationFrames == null || video.durationFrames < requiredFrames) {
      galleryFail('Converted still-video import or length could not be verified; inspect Project files before retrying');
    }
    const source = galleryResolveResource(fresh.media, item.sourceResourceId, item.sourcePath, 'Selected source');
    return { sourceResourceId: item.sourceResourceId, resolvedSourceResourceId: source?.resourceId,
      resourceId: video.resourceId,
      path: item.path, width: video.width, height: video.height, durationFrames: video.durationFrames };
  });
  return { status: 'prepared', converted };
}

async function galleryImportBase(selects, project, input, inventory, onImportStarted) {
  const frames = input.durationFrames ?? 853;
  if (!Number.isSafeInteger(frames) || frames < 1 || frames > 36000 ||
      typeof input.path !== 'string' || !/^\/(?:[^\0]+)\.mp4$/i.test(input.path)) {
    galleryFail('Provide an absolute prepared black-video path and valid duration');
  }
  const probe = await selects.media.probe({ filePaths: [input.path] });
  if (probe.error || probe.errors?.length || probe.summary?.failed ||
      !probe.files?.some((file) => file.path === input.path && (!file.type || /video/i.test(file.type)))) {
    galleryFail('The prepared black video is missing or unreadable');
  }
  let video = inventory.media.find((item) => item.kind === 'video' && item.path === input.path);
  if (!video) {
    if (typeof project.importFiles !== 'function') galleryFail('This Selects version cannot import the black Main video');
    onImportStarted();
    await project.importFiles({ paths: [input.path] });
    video = (await galleryInventory(project)).media.find((item) => item.kind === 'video' && item.path === input.path);
  }
  if (!video || video.width !== 1080 || video.height !== 1920 || video.durationFrames !== frames) {
    galleryFail('The black Main video import does not match the requested canvas or duration');
  }
  return { status: 'prepared', baseResourceId: video.resourceId, path: video.path, durationFrames: frames };
}

async function galleryPreflight(selects, project, input, inventory) {
  const base = galleryResolveResource(inventory.media, input.baseResourceId, input.basePath, 'Black Main');
  if (!base || base.kind !== 'video' || base.width !== 1080 || base.height !== 1920 ||
      base.durationFrames !== (input.durationFrames ?? 853)) {
    galleryFail('Prepare a full-length 1080×1920 black Main video before creating this Draft');
  }
  const chosen = input.media.map((item, i) => {
    const fresh = galleryResolveResource(inventory.media, item.resourceId, item.path, `Slot ${i + 1}`);
    if (!fresh) galleryFail(`Slot ${i + 1} media is missing or moved`);
    return { ...fresh, focusX: item.focusX, focusY: item.focusY };
  });
  if (chosen.some((item) => item.kind === 'image')) {
    galleryFail('Convert Project photos to individual video Resources before creating this Draft');
  }
  const music = input.music == null ? null :
    galleryResolveResource(inventory.audio, input.music.resourceId, input.music.path, 'Music');
  if (input.music != null && !music) galleryFail('Selected music is missing or moved');
  const selectedMusic = music && { ...music, startFrame: input.music.startFrame ?? 0 };
  const plan = planGallery({ media: chosen, music: selectedMusic, manualBpm: input.manualBpm, estimatedBpm: input.estimatedBpm, durationFrames: input.durationFrames });
  const paths = [...new Set([base.path, ...chosen.map((item) => item.path), ...(music ? [music.path] : [])])];
  const probe = await selects.media.probe({ filePaths: paths });
  const confirmed = new Set((probe.files || []).map((file) => file.path));
  if (probe.error || (probe.errors || []).length || (probe.summary?.failed || 0) || paths.some((path) => !confirmed.has(path))) {
    galleryFail('A selected media file is missing, unreadable, or corrupt; no Draft was saved');
  }
  const meta = await project.meta();
  if (!Array.isArray(meta.draftIds)) galleryFail('Project Draft list is unavailable');
  return { plan, chosen, music: selectedMusic, base };
}

async function galleryCreate(selects, project, input, inventory, onCommitStarted) {
  const { plan, chosen, music, base } = await galleryPreflight(selects, project, input, inventory);
  const name = typeof input.name === 'string' && input.name.trim() ? input.name.trim() : 'Photo Gallery';
  const draft = await project.createDraft({ name });
  if ((await draft.meta()).fps !== 60) galleryFail('This Project is not 60 fps; no Draft was saved');
  await draft.insertResource({ resourceId: base.resourceId });
  await draft.setFrameSize(plan.frameSize);
  const prepared = await draft.meta();
  if (prepared.fps !== plan.fps || prepared.durationFrames !== plan.durationFrames ||
      prepared.frameSize?.width !== plan.frameSize.width || prepared.frameSize?.height !== plan.frameSize.height) {
    galleryFail('The working Draft does not match the requested 60 fps, canvas, and duration; no Draft was saved');
  }
  let knownClipIds = new Set((await draft.clips({ trackScope: 'all' })).map((row) => row.clipId));
  for (let i = 0; i < plan.tiles.length; i++) {
    const tile = plan.tiles[i], source = chosen[i];
    await draft.overlayResource({ resource: project.resource(tile.resourceId), over: await draft.rangeAtFrames(tile.revealFrame, tile.endFrame) });
    const after = await draft.clips({ trackScope: 'all' });
    const added = after.filter((row) => !knownClipIds.has(row.clipId) && row.resourceId === tile.resourceId && row.startFrame === tile.revealFrame && row.endFrame === tile.endFrame);
    if (added.length !== 1) galleryFail(`Could not identify tile ${i + 1} after placement; no Draft was saved`);
    const clip = added[0];
    const geometry = galleryGeometry(tile, source, plan.colorFrame);
    await draft.addVideoEffect({
      clip, label: `Gallery ${tile.slotKey} color-${plan.colorFrame}`,
      tsxCode: TILE_EFFECT,
      parameters: geometry.effect,
      editableParameters: [
        { key: 'focusX', label: 'Horizontal focus', type: 'number', defaultValue: 0.5, min: 0, max: 1, step: 0.01 },
        { key: 'focusY', label: 'Vertical focus', type: 'number', defaultValue: 0.5, min: 0, max: 1, step: 0.01 },
      ],
    });
    const freshClip = (await draft.clips({ trackScope: 'all' })).find((row) => row.clipId === clip.clipId);
    if (!freshClip) galleryFail(`Tile ${i + 1} disappeared before placement was complete`);
    await draft.setClipTransform({ clip: freshClip, position: geometry.transform.position, scale: geometry.transform.scale });
    const finalRows = await draft.clips({ trackScope: 'all' });
    const finalClip = finalRows.find((row) => row.clipId === clip.clipId);
    if (!finalClip) galleryFail(`Tile ${i + 1} disappeared after transform`);
    knownClipIds = new Set(finalRows.map((row) => row.clipId));
  }
  if (music) await draft.overlayResource({ resource: project.resource(music.resourceId), over: await draft.rangeAtFrames(0, plan.durationFrames), sourceStartSeconds: music.startFrame / plan.fps });
  const rows = await draft.clips({ trackScope: 'all' });
  if (rows.filter((row) => row.trackKind === 'main' && row.resourceId === base.resourceId &&
      row.startFrame === 0 && row.endFrame === plan.durationFrames).length !== 1) {
    galleryFail('The working Draft does not contain its full-length black Main video');
  }
  if (rows.filter((row) => row.trackKind === 'video' && row.resourceId != null).length !== 21) galleryFail('The working Draft does not contain all 21 editable tiles');
  onCommitStarted();
  const saved = await draft.commitAll('Create editable 21-tile Photo Gallery');
  if (!saved?.createdDraftId) galleryFail('Save outcome is unknown; inspect Project Drafts before retrying');
  return { status: 'saved', draftId: saved.createdDraftId, tileCount: 21, durationFrames: plan.durationFrames, colorFrame: plan.colorFrame };
}

async function galleryVerifyCreated(selects, project, input, inventory) {
  if (typeof input.draftId !== 'string' || !input.draftId) galleryFail('The saved Draft ID is required for readback');
  const { plan, chosen, base } = await galleryPreflight(selects, project, input, inventory);
  const projectMeta = await project.meta();
  if (!projectMeta.draftIds?.includes(input.draftId)) galleryFail('The saved Draft does not belong to this Project');
  const draft = selects.draft(input.draftId);
  const meta = await draft.meta();
  if (meta.fps !== 60 || meta.durationFrames !== plan.durationFrames ||
      meta.frameSize?.width !== 1080 || meta.frameSize?.height !== 1920) {
    galleryFail('Saved Draft canvas, frame rate, or duration does not match the request');
  }
  const allRows = await draft.clips({ trackScope: 'all' });
  const mainRows = allRows.filter((row) => row.trackKind === 'main');
  if (mainRows.length !== 1 || mainRows[0].resourceId !== base.resourceId ||
      mainRows[0].startFrame !== 0 || mainRows[0].endFrame !== plan.durationFrames) {
    galleryFail('Saved Draft does not contain its requested full-length black Main video');
  }
  const rows = allRows.filter((row) => row.trackKind === 'video' && row.resourceId);
  if (rows.length !== 21) galleryFail('Saved Draft does not contain exactly 21 independent video clips');
  const audioRows = allRows.filter((row) => row.trackKind === 'audio' && row.resourceId);
  if (plan.music) {
    if (audioRows.length !== 1 || audioRows[0].resourceId !== plan.music.resourceId ||
        audioRows[0].startFrame !== 0 || audioRows[0].endFrame !== plan.durationFrames) {
      galleryFail('Saved Draft music does not match the requested Resource and duration');
    }
  } else if (audioRows.length) galleryFail('Saved Draft has unexpected music');
  const usedClipIds = new Set();
  for (let tileIndex = 0; tileIndex < plan.tiles.length; tileIndex++) {
    const tile = plan.tiles[tileIndex];
    const matches = rows.filter((row) => row.resourceId === tile.resourceId &&
      row.startFrame === tile.revealFrame && row.endFrame === tile.endFrame && !usedClipIds.has(row.clipId));
    if (matches.length !== 1) galleryFail(`Saved tile ${tile.slotKey} does not match its requested Resource and frames`);
    const clip = matches[0];
    const effects = await draft.videoEffects(clip);
    if (effects.filter((effect) => effect.name === `Gallery ${tile.slotKey} color-${plan.colorFrame}` && effect.enabled !== false).length !== 1) {
      galleryFail(`Saved tile ${tile.slotKey} has no matching color-transition effect`);
    }
    const actual = await draft.clipTransform(clip);
    const expected = galleryGeometry(tile, chosen[tileIndex], plan.colorFrame).transform;
    const close = (left, right) => typeof left === 'number' && Number.isFinite(left) && Math.abs(left - right) <= 1e-5;
    if (!actual?.enabled || !close(actual.position?.x, expected.position.x) ||
        !close(actual.position?.y, expected.position.y) ||
        !close(actual.scale?.x, expected.scale.x) || !close(actual.scale?.y, expected.scale.y)) {
      galleryFail(`Saved tile ${tile.slotKey} position or crop transform does not match the requested grid`);
    }
    usedClipIds.add(clip.clipId);
  }
  return { status: 'verified', draftId: input.draftId, tileCount: 21, durationFrames: plan.durationFrames,
    colorFrame: plan.colorFrame, structuralOnly: true };
}

async function galleryOperation(selects, raw) {
  let commitStarted = false;
  try {
    const input = assertGalleryInput(raw);
    const project = selects.project(input.projectId);
    const inventory = await galleryInventory(project);
    if (input.operation === 'inspect') return { status: 'inspected', projectId: input.projectId, ...inventory };
    if (input.operation === 'importConverted') return await galleryImportConverted(selects, project, input, inventory, () => { commitStarted = true; });
    if (input.operation === 'importBase') return await galleryImportBase(selects, project, input, inventory, () => { commitStarted = true; });
    if (input.operation === 'create') return await galleryCreate(selects, project, input, inventory, () => { commitStarted = true; });
    if (input.operation === 'verifyCreated') return await galleryVerifyCreated(selects, project, input, inventory);
    galleryFail('Unknown gallery action');
  } catch (error) {
    return { status: commitStarted ? 'outcomeUnknown' : 'notSaved', message: String(error?.message || error) };
  }
}
