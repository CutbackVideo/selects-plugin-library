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

// Host paths: POSIX (/…) on macOS; a drive (C:\… or C:/…) or UNC (\\server\…) path on Windows.
function galleryAbsolute(path) {
  return typeof path === 'string' && !path.includes('\0') && /^(?:\/|[A-Za-z]:[\\/]|\\\\)./.test(path);
}
// One comparison key per host path: NFC; a Windows path (drive letter or backslash) also gets / separators and is
// case-folded, as Windows paths are case-insensitive. POSIX paths stay case-sensitive.
function galleryPathKey(path) {
  const text = String(path ?? '').normalize('NFC');
  return /^[A-Za-z]:(?:[\\/]|$)/.test(text) || text.includes('\\') ? text.replace(/\\/g, '/').toLowerCase() : text;
}
function gallerySamePath(a, b) { return typeof a === 'string' && typeof b === 'string' && galleryPathKey(a) === galleryPathKey(b); }

function galleryResolveResource(items, resourceId, path, label) {
  const byId = items.find((item) => item.resourceId === resourceId);
  if (!galleryAbsolute(path)) galleryFail(`${label} path is required`);
  if (gallerySamePath(byId?.path, path)) return byId;
  const matches = items.filter((item) => gallerySamePath(item.path, path));
  if (matches.length !== 1) galleryFail(`${label} path is missing or ambiguous in this Project`);
  return matches[0];
}

async function galleryInventory(project, paths = null) {
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
    if (!resource || seen.has(node.resourceId) || typeof node.path !== 'string' || (paths && !paths.includes(node.path))) continue;
    const type = String(resource.type).toLowerCase();
    const kind = type === 'image' ? 'image' : type === 'video' ? 'video' : type === 'audio' ? 'audio' : null;
    if (!kind) continue;
    const durationSeconds = Number.isFinite(node.durationSeconds) ? node.durationSeconds : resource.durationSeconds;
    const durationFrames = Number.isFinite(durationSeconds) ? Math.round(durationSeconds * 60) : null;
    const common = { resourceId: node.resourceId, name: node.name, path: node.path, durationFrames };
    if (kind === 'audio') audio.push(common);
    else if (kind === 'image' || (node.frameSize?.width > 0 && node.frameSize?.height > 0)) {
      media.push({ ...common, kind, width: node.frameSize?.width ?? null, height: node.frameSize?.height ?? null });
    }
    seen.add(node.resourceId);
  }
  const unavailable = resources.filter((resource) =>
    (!paths || nodes.some(n => n.resourceId === resource.resourceId && paths.includes(n.path))) &&
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
  if (!['inspect', 'importBundledMusic', 'importConverted', 'create', 'preflight', 'createBase', 'fillBase', 'placeVideosExisting', 'styleExisting', 'verifyCreated'].includes(input.operation)) galleryFail('Unknown gallery action');
  if (['create', 'preflight', 'createBase', 'placeVideosExisting', 'styleExisting'].includes(input.operation) && (!Array.isArray(input.media) || input.media.length !== 21)) galleryFail('Select exactly 21 visual slots');
  return input;
}

async function galleryImportConverted(selects, project, input, inventory, onImportStarted) {
  const requiredFrames = input.durationFrames ?? 853;
  if (!Number.isSafeInteger(requiredFrames) || requiredFrames < 1 || requiredFrames > 36000) {
    galleryFail('Held video duration must be an integer from 1 to 36000 frames');
  }
  if (!Array.isArray(input.converted) || input.converted.length < 1 || input.converted.length > 21) {
    galleryFail('Provide one to 21 held video files');
  }
  const seenSources = new Set();
  for (const item of input.converted) {
    const source = galleryResolveResource(inventory.media, item?.sourceResourceId, item?.sourcePath, 'Selected source');
    if (source.kind !== 'video' || seenSources.has(source.resourceId) ||
        !galleryAbsolute(item.path) || !/\.mp4$/i.test(item.path)) {
      galleryFail('A held clip must match one distinct Project video and absolute MP4 path');
    }
    seenSources.add(source.resourceId);
  }
  const paths = [...new Map(input.converted.map((item) => [galleryPathKey(item.path), item.path])).values()];
  const probe = await selects.media.probe({ filePaths: paths });
  const probed = new Set((probe.files || []).filter((file) => !file.type || /video/i.test(file.type)).map((file) => galleryPathKey(file.path)));
  if (probe.error || probe.errors?.length || probe.summary?.failed || paths.some((path) => !probed.has(galleryPathKey(path)))) {
    galleryFail('A held video file is missing or unreadable; no Project media was imported');
  }
  const currentByPath = new Map();
  for (const item of inventory.media) if (item.kind === 'video') currentByPath.set(galleryPathKey(item.path), item);
  const missing = paths.filter((path) => !currentByPath.has(galleryPathKey(path)));
  if (missing.length) {
    if (typeof project.importFiles !== 'function') galleryFail('This Selects version cannot import held videos');
    onImportStarted();
    await project.importFiles({ paths: missing });
  }
  const fresh = missing.length ? await galleryInventory(project) : inventory;
  const importedByPath = new Map();
  for (const item of fresh.media) if (item.kind === 'video') importedByPath.set(galleryPathKey(item.path), item);
  const converted = input.converted.map((item) => {
    const video = importedByPath.get(galleryPathKey(item.path));
    if (!video || video.durationFrames == null || video.durationFrames < requiredFrames) {
      galleryFail('Held video import or length could not be verified; inspect Project files before retrying');
    }
    const source = galleryResolveResource(fresh.media, item.sourceResourceId, item.sourcePath, 'Selected source');
    return { sourceResourceId: item.sourceResourceId, resolvedSourceResourceId: source?.resourceId,
      resourceId: video.resourceId,
      // The Project's own spelling of the path, which native placement later compares exactly.
      path: video.path, width: video.width, height: video.height, durationFrames: video.durationFrames };
  });
  return { status: 'prepared', converted };
}

async function galleryImportBundledMusic(selects, project, input, inventory, onImportStarted) {
  const frames = input.durationFrames ?? 853;
  if (!Number.isSafeInteger(frames) || frames < 1 || frames > 36000) galleryFail('Music length must be an integer from 1 to 36000 frames');
  if (!galleryAbsolute(input.path) || !/\.mp3$/i.test(input.path)) galleryFail('Bundled music requires an absolute MP3 path');
  const probe = await selects.media.probe({ filePaths: [input.path] });
  if (probe.error || probe.errors?.length || probe.summary?.failed ||
      !(probe.files || []).some(file => gallerySamePath(file.path, input.path) && (!file.type || /audio/i.test(file.type)))) {
    galleryFail('Bundled music is missing or corrupt; reinstall the plugin');
  }
  const matches = inventory.audio.filter(item => gallerySamePath(item.path, input.path));
  if (matches.length > 1 || inventory.media.some(item => gallerySamePath(item.path, input.path))) galleryFail('Bundled music path is ambiguous or is not Audio');
  if (!matches.length) {
    onImportStarted();
    await project.importFiles({ paths: [input.path] });
    inventory = await galleryInventory(project);
  }
  const audio = inventory.audio.filter(item => gallerySamePath(item.path, input.path));
  if (audio.length !== 1 || !Number.isSafeInteger(audio[0].durationFrames)) galleryFail('Bundled music import is not ready; inspect Project media before retrying');
  if (audio[0].durationFrames < frames) galleryFail('Music is too short for this result length; shorten the result or choose a longer track');
  return { status: 'musicReady', music: { ...audio[0], startFrame: 0 } };
}

async function galleryPreflight(selects, project, input, inventory) {
  const chosen = input.media.map((item, i) => {
    const fresh = galleryResolveResource(inventory.media, item.resourceId, item.path, `Slot ${i + 1}`);
    const width = fresh.width ?? item.width, height = fresh.height ?? item.height;
    if (!Number.isSafeInteger(width) || width < 1 || !Number.isSafeInteger(height) || height < 1) {
      galleryFail(`Slot ${i + 1} photo dimensions are unavailable through the plugin SDK; no Draft was saved`);
    }
    if ((item.width != null && fresh.width != null && fresh.width !== item.width) ||
        (item.height != null && fresh.height != null && fresh.height !== item.height)) {
      galleryFail(`Slot ${i + 1} dimensions changed`);
    }
    return { ...fresh, width, height, focusX: item.focusX, focusY: item.focusY };
  });
  const music = input.music == null ? null :
    galleryResolveResource(inventory.audio, input.music.resourceId, input.music.path, 'Music');
  if (input.music != null && !music) galleryFail('Selected music is missing or moved');
  const selectedMusic = music && { ...music, startFrame: input.music.startFrame ?? 0 };
  const plan = planGallery({ media: chosen, music: selectedMusic, manualBpm: input.manualBpm, estimatedBpm: input.estimatedBpm, durationFrames: input.durationFrames, fps: input.fps });
  const paths = [...new Set([...chosen.map((item) => item.path), ...(music ? [music.path] : [])])];
  const probe = await selects.media.probe({ filePaths: paths });
  const confirmed = new Set((probe.files || []).map((file) => galleryPathKey(file.path)));
  if (probe.error || (probe.errors || []).length || (probe.summary?.failed || 0) || paths.some((path) => !confirmed.has(galleryPathKey(path)))) {
    galleryFail('A selected media file is missing, unreadable, or corrupt; no Draft was saved');
  }
  const meta = await project.meta();
  if (!Array.isArray(meta.draftIds)) galleryFail('Project Draft list is unavailable');
  return { plan, chosen, music: selectedMusic };
}

async function galleryCreate(selects, project, input, inventory, onCommitStarted) {
  const { plan, chosen, music } = await galleryPreflight(selects, project, input, inventory);
  const name = typeof input.name === 'string' && input.name.trim() ? input.name.trim() : 'Photo Gallery';
  const draft = await project.createDraft({ name });
  if ((await draft.meta()).fps !== plan.fps) galleryFail('The Project frame rate changed; no Draft was saved');
  await draft.insertGap({ seconds: plan.durationFrames / plan.fps });
  await draft.setFrameSize(plan.frameSize);
  const prepared = await draft.meta();
  if (prepared.fps !== plan.fps || prepared.durationFrames !== plan.durationFrames ||
      prepared.frameSize?.width !== plan.frameSize.width || prepared.frameSize?.height !== plan.frameSize.height) {
    galleryFail('The working Draft does not match the requested frame grid, canvas, and duration; no Draft was saved');
  }
  let knownClipIds = new Set((await draft.clips({ trackScope: 'all' })).map((row) => row.clipId));
  for (let i = 0; i < plan.tiles.length; i++) {
    const tile = plan.tiles[i], source = chosen[i];
    try {
      await draft.overlayResource({ resource: project.resource(tile.resourceId), over: await draft.rangeAtFrames(tile.revealFrame, tile.endFrame) });
    } catch (error) {
      if (source.kind === 'image' && /not a Video\/Audio asset/i.test(String(error?.message || error))) {
        galleryFail('The plugin SDK cannot place original Image Resources on video tracks, although the editor can; no Draft was saved');
      }
      throw error;
    }
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
  if (music) await draft.overlayResource({ resource: project.resource(music.resourceId), over: await draft.rangeAtFrames(0, plan.durationFrames), sourceStartSeconds: (music.startSeconds ?? music.startFrame / 60) });
  const rows = await draft.clips({ trackScope: 'all' });
  if (rows.some((row) => row.trackKind === 'main' && row.resourceId)) galleryFail('The working Draft has an unexpected Main Resource');
  if (rows.filter((row) => row.trackKind === 'video' && row.resourceId != null).length !== 21) galleryFail('The working Draft does not contain all 21 editable tiles');
  onCommitStarted();
  const saved = await draft.commitAll('Create editable 21-tile Photo Gallery');
  if (!saved?.createdDraftId) galleryFail('Save outcome is unknown; inspect Project Drafts before retrying');
  return { status: 'saved', draftId: saved.createdDraftId, tileCount: 21, durationFrames: plan.durationFrames, colorFrame: plan.colorFrame };
}

async function galleryCreateBase(project, input, onCommitStarted) {
  const name = typeof input.name === 'string' && input.name.trim() ? input.name.trim() : 'Photo Gallery';
  const draft = await project.createDraft({ name });
  await draft.setFrameSize({ width: 1080, height: 1920 });
  const fps=(await draft.meta()).fps;
  if(fps!==(input.fps??60))galleryFail('Project frame rate changed');
  await draft.insertGap({seconds:input.durationFrames/fps});
  onCommitStarted();
  const saved = await draft.commitAll('Create Photo Gallery Draft');
  if (!saved?.createdDraftId) galleryFail('Empty Draft save outcome is unknown');
  return { status: 'baseCreated', draftId: saved.createdDraftId };
}

async function galleryFillBase(selects, project, input, onCommitStarted) {
  if (typeof input.draftId !== 'string' || !(await project.meta()).draftIds?.includes(input.draftId)) {
    galleryFail('Target Draft does not belong to this Project');
  }
  if (!Number.isSafeInteger(input.durationFrames) || input.durationFrames < 1) galleryFail('Invalid Gallery duration');
  const draft = selects.draft(input.draftId);
  const meta = await draft.meta();
  if (meta.fps !== (input.fps ?? 60) || meta.durationFrames !== 0 || meta.frameSize?.width !== 1080 || meta.frameSize?.height !== 1920) {
    galleryFail('Target Draft must be an empty portrait Draft');
  }
  await draft.insertGap({ seconds: input.durationFrames / meta.fps });
  if ((await draft.meta()).durationFrames !== input.durationFrames) galleryFail('Could not author exact Gallery duration');
  onCommitStarted();
  const saved = await draft.commitAll('Set Photo Gallery duration');
  if (!saved?.commitId) galleryFail('Duration save outcome is unknown');
  return { status: 'baseFilled', draftId: input.draftId, durationFrames: input.durationFrames };
}

function galleryBatchTiles(tiles, slotKeys, limit) {
  if (slotKeys === undefined) return tiles;
  if (!Array.isArray(slotKeys) || slotKeys.length < 1 || slotKeys.length > limit ||
      new Set(slotKeys).size !== slotKeys.length ||
      slotKeys.some(key => !tiles.some(tile => tile.slotKey === key))) {
    galleryFail(`Provide one to ${limit} distinct eligible slot keys`);
  }
  const selected = new Set(slotKeys);
  return tiles.filter(tile => selected.has(tile.slotKey));
}

async function galleryPlaceVideosExisting(selects, project, input, inventory, onCommitStarted) {
  if (typeof input.draftId !== 'string' || !(await project.meta()).draftIds?.includes(input.draftId)) {
    galleryFail('Target Draft does not belong to this Project');
  }
  const { plan } = await galleryPreflight(selects, project, input, inventory);
  const videos = galleryBatchTiles(plan.tiles.filter(tile => tile.kind === 'video'), input.slotKeys, 1);
  if (!videos.length) return { status: 'videosPlaced', draftId: input.draftId, tileCount: 0 };
  const draft = selects.draft(input.draftId);
  const meta = await draft.meta();
  if (meta.fps !== (input.fps ?? 60) || meta.durationFrames !== plan.durationFrames ||
      meta.frameSize?.width !== 1080 || meta.frameSize?.height !== 1920) {
    galleryFail('Target Draft clock, canvas, or duration changed');
  }
  const rows = await draft.clips({ trackScope: 'all' });
  const existing = rows.filter(row => row.trackKind === 'video' && row.resourceId);
  const imageTiles = plan.tiles.filter(tile => tile.kind === 'image');
  if (new Set(existing.map(row => row.clipId)).size !== existing.length ||
      new Set(existing.map(row => row.trackId)).size !== existing.length ||
      rows.some(row => row.trackKind === 'audio' && row.resourceId) ||
      rows.some(row => row.trackKind === 'main' && row.resourceId)) galleryFail('Target Draft has unexpected media');
  const used = new Set();
  for (const tile of imageTiles) {
    const matches = existing.filter(row => row.resourceId === tile.resourceId &&
      row.startFrame === tile.revealFrame && row.endFrame === tile.endFrame && !used.has(row.clipId));
    if (matches.length !== 1) galleryFail(`Image ${tile.slotKey} changed before video placement`);
    used.add(matches[0].clipId);
  }
  // Earlier bounded calls may have saved Videos already. Validate all of them
  // against this frozen plan, but never replace or duplicate an existing target.
  const placedVideoKeys = new Set();
  for (const row of existing.filter(row => !used.has(row.clipId))) {
    const matches = plan.tiles.filter(tile => tile.kind === 'video' &&
      tile.resourceId === row.resourceId && tile.revealFrame === row.startFrame && tile.endFrame === row.endFrame);
    if (matches.length !== 1 || placedVideoKeys.has(matches[0].slotKey)) galleryFail('Target Draft has unexpected or duplicate video media');
    placedVideoKeys.add(matches[0].slotKey);
  }
  if (videos.some(tile => placedVideoKeys.has(tile.slotKey))) galleryFail('A selected Video is already present; inspect the Draft before retrying');
  for (const tile of videos) {
    const resource = project.resource(tile.resourceId);
    const overlay = async (startFrame) => {
      const before = new Set((await draft.clips({ trackScope: 'all' })).map(row => row.clipId));
      await draft.overlayResource({ resource, over: await draft.rangeAtFrames(startFrame, tile.endFrame) });
      const rows = (await draft.clips({ trackScope: 'all' })).filter(row => !before.has(row.clipId));
      const visual = rows.filter(row => row.trackKind === 'video' && row.resourceId === tile.resourceId);
      if (visual.length !== 1 || visual[0].startFrame !== startFrame) galleryFail(`Video ${tile.slotKey} did not create one independent clip`);
      const sourceAudio = rows.filter(row => row.trackKind === 'audio' && row.resourceId);
      if (sourceAudio.length) await draft.removeClips(sourceAudio);
      return visual[0];
    };
    let clip = await overlay(tile.revealFrame);
    if (clip.endFrame < tile.endFrame) {
      // The SDK may quantize a seconds-based overlay one frame short at some
      // 60 fps start positions. Re-place with enough source time, then use the
      // public clip move and trim operations to get exact frame boundaries.
      await draft.removeClips([clip]);
      if (tile.revealFrame < 1) galleryFail(`Video ${tile.slotKey} cannot cover the output end`);
      clip = await overlay(tile.revealFrame - 1);
      const moved = await draft.moveOverlayClip({ clip, startFrame: tile.revealFrame });
      const matches = (await draft.clips({ trackScope: 'all' })).filter(row => row.clipId === moved.clipId);
      if (matches.length !== 1) galleryFail(`Video ${tile.slotKey} moved clip could not be read back`);
      clip = matches[0];
    }
    if (clip.endFrame > tile.endFrame) {
      await draft.remove(await draft.rangeAtFrames(tile.endFrame, clip.endFrame), { tracks: [clip.trackId] });
    }
    const exact = (await draft.clips({ trackScope: 'all' })).filter(row => row.clipId === clip.clipId &&
      row.trackKind === 'video' && row.resourceId === tile.resourceId &&
      row.startFrame === tile.revealFrame && row.endFrame === tile.endFrame);
    if (exact.length !== 1) galleryFail(`Video ${tile.slotKey} could not reach its exact reveal and end frames`);
    if ((await draft.clips({ trackScope: 'all' })).some(row => row.trackKind === 'audio' && row.resourceId)) {
      galleryFail(`Video ${tile.slotKey} retained source audio`);
    }
  }
  onCommitStarted();
  const saved = await draft.commitAll('Place Photo Gallery video tiles');
  if (!saved?.commitId) galleryFail('Video placement save outcome is unknown');
  return { status: 'videosPlaced', draftId: input.draftId, tileCount: videos.length };
}

async function galleryStyleExisting(selects, project, input, inventory, onCommitStarted) {
  if (typeof input.draftId !== 'string' || !input.draftId) galleryFail('An explicit target Draft is required');
  const projectMeta = await project.meta();
  if (!projectMeta.draftIds?.includes(input.draftId)) galleryFail('Target Draft does not belong to this Project');
  const chosen = input.media.map((item, i) => {
    const fresh = galleryResolveResource(inventory.media, item.resourceId, item.path, `Slot ${i + 1}`);
    if (fresh.kind !== item.kind) galleryFail(`Slot ${i + 1} Resource type changed`);
    const width = fresh.width ?? item.width, height = fresh.height ?? item.height;
    if (!Number.isSafeInteger(width) || width < 1 || !Number.isSafeInteger(height) || height < 1) {
      galleryFail(`Slot ${i + 1} photo dimensions are unavailable`);
    }
    if (fresh.width != null && fresh.width !== item.width || fresh.height != null && fresh.height !== item.height) {
      galleryFail(`Slot ${i + 1} photo dimensions changed`);
    }
    return { ...fresh, width, height, focusX: item.focusX, focusY: item.focusY };
  });
  const music = input.music == null ? null : galleryResolveResource(inventory.audio, input.music.resourceId, input.music.path, 'Music');
  const plan = planGallery({ media: chosen, music: music ? { ...music, startFrame: input.music.startFrame ?? 0 } : null, manualBpm: input.manualBpm,
    estimatedBpm: input.estimatedBpm, durationFrames: input.durationFrames });
  const selectedTiles = galleryBatchTiles(plan.tiles, input.slotKeys, 3);
  const selectedKeys = new Set(selectedTiles.map(tile => tile.slotKey));
  if (input.placeMusic !== undefined && typeof input.placeMusic !== 'boolean') galleryFail('placeMusic must be a boolean');
  const draft = selects.draft(input.draftId);
  const meta = await draft.meta();
  if (meta.fps !== plan.fps || meta.durationFrames !== plan.durationFrames ||
      meta.frameSize?.width !== plan.frameSize.width || meta.frameSize?.height !== plan.frameSize.height) {
    galleryFail('Target Draft clock, canvas, or duration does not match the Gallery plan');
  }
  const allRows = await draft.clips({ trackScope: 'all' });
  if (allRows.some((row) => row.trackKind === 'main' && row.resourceId)) galleryFail('Target Draft Main track is not blank');
  if (allRows.some((row) => row.trackKind === 'audio' && row.resourceId)) galleryFail('Target Draft has unexpected source audio');
  const rows = allRows.filter((row) => row.trackKind === 'video' && row.resourceId);
  if (rows.length !== 21 || new Set(rows.map((row) => row.trackId)).size !== 21) {
    galleryFail('Target Draft must contain exactly 21 independent visual tracks');
  }
  const used = new Set(), targets = [];
  for (let i = 0; i < 21; i++) {
    const tile = plan.tiles[i];
    const matches = rows.filter((row) => row.resourceId === tile.resourceId &&
      row.startFrame === tile.revealFrame && row.endFrame === tile.endFrame && !used.has(row.clipId));
    if (matches.length !== 1) galleryFail(`Target tile ${tile.slotKey} does not match the selected Resource and frames`);
    const clip = matches[0];
    used.add(clip.clipId);
    if (!selectedKeys.has(tile.slotKey)) continue;
    if ((await draft.videoEffects(clip)).length) galleryFail(`Target tile ${tile.slotKey} already has effects; inspect it before retrying`);
    const transform = await draft.clipTransform(clip);
    const identity = !transform || !transform.enabled ||
      (transform.position?.x === 0 && transform.position?.y === 0 &&
       transform.scale?.x === 1 && transform.scale?.y === 1 &&
       transform.rotation === 0 && transform.anchor?.x === 0 && transform.anchor?.y === 0);
    if (!identity) galleryFail(`Target tile ${tile.slotKey} already has a manual transform; inspect it before retrying`);
    targets.push({ clip, tile, source: chosen[i] });
  }
  for (const { clip, tile, source } of targets) {
    const geometry = galleryGeometry(tile, source, plan.colorFrame);
    const current = (await draft.clips({ trackScope: 'all' })).find((row) => row.clipId === clip.clipId);
    if (!current) galleryFail(`Target tile ${tile.slotKey} disappeared before styling`);
    await draft.addVideoEffect({ clip: current, label: `Gallery ${tile.slotKey} color-${plan.colorFrame}`,
      tsxCode: TILE_EFFECT, parameters: geometry.effect,
      editableParameters: [
        { key: 'focusX', label: 'Horizontal focus', type: 'number', defaultValue: 0.5, min: 0, max: 1, step: 0.01 },
        { key: 'focusY', label: 'Vertical focus', type: 'number', defaultValue: 0.5, min: 0, max: 1, step: 0.01 },
      ] });
    const fresh = (await draft.clips({ trackScope: 'all' })).find((row) => row.clipId === clip.clipId);
    if (!fresh) galleryFail(`Target tile ${tile.slotKey} disappeared during styling`);
    await draft.setClipTransform({ clip: fresh, position: geometry.transform.position, scale: geometry.transform.scale });
  }
  if (plan.music && input.placeMusic !== false) await draft.overlayResource({ resource: project.resource(plan.music.resourceId),
    over: await draft.rangeAtFrames(0, plan.durationFrames), sourceStartSeconds: (plan.music.startSeconds ?? plan.music.startFrame / 60) });
  onCommitStarted();
  const saved = await draft.commitAll('Style Photo Gallery tiles');
  if (!saved?.commitId) galleryFail('Style save outcome is unknown; inspect the Draft before retrying');
  return { status: 'styled', draftId: input.draftId, tileCount: targets.length, durationFrames: plan.durationFrames,
    colorFrame: plan.colorFrame };
}

async function galleryVerifyCreated(selects, project, input, inventory) {
  if (typeof input.draftId !== 'string' || !input.draftId) galleryFail('The saved Draft ID is required for readback');
  const { plan, chosen } = await galleryPreflight(selects, project, input, inventory);
  const projectMeta = await project.meta();
  if (!projectMeta.draftIds?.includes(input.draftId)) galleryFail('The saved Draft does not belong to this Project');
  const draft = selects.draft(input.draftId);
  const meta = await draft.meta();
  if (meta.fps !== (input.fps ?? 60) || meta.durationFrames !== plan.durationFrames ||
      meta.frameSize?.width !== 1080 || meta.frameSize?.height !== 1920) {
    galleryFail('Saved Draft canvas, frame rate, or duration does not match the request');
  }
  const allRows = await draft.clips({ trackScope: 'all' });
  if (allRows.some((row) => row.trackKind === 'main' && row.resourceId)) galleryFail('Saved Draft has an unexpected Main Resource');
  const rows = allRows.filter((row) => row.trackKind === 'video' && row.resourceId);
  if (rows.length !== 21) galleryFail('Saved Draft does not contain exactly 21 independent visual clips');
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
    const inventory = await galleryInventory(project, input.operation === 'inspect' ? input.paths : null);
    if (input.operation === 'inspect') return { status: 'inspected', projectId: input.projectId, ...inventory };
    if (input.operation === 'importBundledMusic') return await galleryImportBundledMusic(selects, project, input, inventory, () => { commitStarted = true; });
    if (input.operation === 'importConverted') return await galleryImportConverted(selects, project, input, inventory, () => { commitStarted = true; });
    if (input.operation === 'create') return await galleryCreate(selects, project, input, inventory, () => { commitStarted = true; });
    if (input.operation === 'preflight') {
      const { plan } = await galleryPreflight(selects, project, input, inventory);
      return { status: 'ready', plan };
    }
    if (input.operation === 'createBase') return await galleryCreateBase(project, input, () => { commitStarted = true; });
    if (input.operation === 'fillBase') return await galleryFillBase(selects, project, input, () => { commitStarted = true; });
    if (input.operation === 'placeVideosExisting') return await galleryPlaceVideosExisting(selects, project, input, inventory, () => { commitStarted = true; });
    if (input.operation === 'styleExisting') return await galleryStyleExisting(selects, project, input, inventory, () => { commitStarted = true; });
    if (input.operation === 'verifyCreated') return await galleryVerifyCreated(selects, project, input, inventory);
    galleryFail('Unknown gallery action');
  } catch (error) {
    return { status: commitStarted ? 'outcomeUnknown' : 'notSaved', message: String(error?.message || error) };
  }
}
