// Executed inside Selects run_script by both the panel and the chat skill.
const GALLERY_ID = 'photo-gallery-no2';
const GALLERY_VERSION = '1';
const TILE_EFFECT_SHA256 = 'bf1d24dab2ac13a45fcd5a1ce5ff0587de86be31f900ab03976cbbc1fc5eba86';
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

async function galleryInventory(project) {
  const resources = await project.resources();
  const byId = new Map(resources.map((row) => [row.resourceId, row]));
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
    const durationFrames = Number.isFinite(node.durationSeconds) ? Math.floor(node.durationSeconds * 60 + 1e-6) : null;
    const common = { resourceId: node.resourceId, name: node.name, path: node.path, durationFrames };
    if (kind === 'audio') audio.push(common);
    else if (node.frameSize?.width > 0 && node.frameSize?.height > 0) {
      media.push({ ...common, kind, width: node.frameSize.width, height: node.frameSize.height });
    }
    seen.add(node.resourceId);
  }
  const unavailable = resources.filter((resource) =>
    ['image', 'video', 'audio'].includes(String(resource.type).toLowerCase()) &&
    !media.some((item) => item.resourceId === resource.resourceId) &&
    !audio.some((item) => item.resourceId === resource.resourceId));
  if (unavailable.length) {
    galleryFail(`${unavailable.length} Project media resource(s) have no readable path or dimensions in this Selects SDK; no Draft was changed`);
  }
  return { media, audio };
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
  if (!['inspect', 'create', 'update', 'updateTiming'].includes(input.operation)) galleryFail('Unknown gallery action');
  if (input.operation === 'create' && (!Array.isArray(input.media) || input.media.length !== 21)) galleryFail('Select exactly 21 visual slots');
  return input;
}

function galleryFocus(effect, key) {
  const edit = effect.editableParameters;
  const definition = edit?.definitions?.find((entry) => entry.key === key);
  const value = edit?.values?.[key] ?? definition?.defaultValue;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) galleryFail(`Gallery ${key} control is unreadable`);
  return value;
}

async function galleryReadExisting(selects, project, input, inventory) {
  if (!input.draftId) return null;
  const projectMeta = await project.meta();
  if (!projectMeta.draftIds?.includes(input.draftId)) galleryFail('Target Draft does not belong to this Project');
  const draft = selects.draft(input.draftId);
  if (typeof draft.clipTemplateBinding !== 'function' || typeof draft.videoEffects !== 'function') return null;
  const draftMeta = await draft.meta();
  const rows = (await draft.clips({ trackScope: 'all' })).filter((row) => row.resourceId && (row.trackKind === 'video' || row.trackKind === 'main'));
  const groups = new Map();
  for (const row of rows) {
    const binding = await draft.clipTemplateBinding(row);
    if (!binding || binding.templateId !== GALLERY_ID || binding.templateVersion !== GALLERY_VERSION) continue;
    if (!groups.has(binding.instanceId)) groups.set(binding.instanceId, []);
    groups.get(binding.instanceId).push({ row, binding });
  }
  const instanceId = input.instanceId || (groups.size === 1 ? [...groups.keys()][0] : null);
  if (!instanceId || !groups.has(instanceId)) return null;
  const bound = groups.get(instanceId);
  const bySlot = new Map();
  for (const item of bound) {
    const slotKey = item.binding.slotKey;
    if (!/^tile-(0[1-9]|1[0-9]|2[01])$/.test(slotKey) || item.binding.occurrenceKey !== slotKey) return null;
    if (!bySlot.has(slotKey)) bySlot.set(slotKey, []);
    bySlot.get(slotKey).push(item.row);
  }
  if (bySlot.size !== 21) return null;
  const inventoryById = new Map(inventory.media.map((item) => [item.resourceId, item]));
  const media = [], effectsBySlot = new Map();
  for (let i = 1; i <= 21; i++) {
    const slotKey = `tile-${String(i).padStart(2, '0')}`;
    const clips = bySlot.get(slotKey);
    if (!clips?.length || new Set(clips.map((clip) => clip.resourceId)).size !== 1) return null;
    const source = inventoryById.get(clips[0].resourceId);
    if (!source) return null;
    const effects = [];
    for (const clip of clips) {
      const stack = await draft.videoEffects(clip);
      const matched = stack.filter((effect) => effect.sourceIdentity?.sha256 === TILE_EFFECT_SHA256 && effect.name === `Gallery ${slotKey}`);
      if (matched.length !== 1) return null;
      effects.push(matched[0]);
    }
    const focusX = galleryFocus(effects[0], 'focusX');
    const focusY = galleryFocus(effects[0], 'focusY');
    if (effects.some((effect) => galleryFocus(effect, 'focusX') !== focusX || galleryFocus(effect, 'focusY') !== focusY)) return null;
    media.push({ slotKey, resourceId: clips[0].resourceId, kind: source.kind, focusX, focusY });
    effectsBySlot.set(slotKey, effects);
  }
  return {
    draft, bySlot, effectsBySlot,
    existing: { draftId: input.draftId, instanceId, media, bpm: null, musicResourceId: null,
      durationFrames: draftMeta.durationFrames, fps: draftMeta.fps, frameSize: draftMeta.frameSize,
      timingEditable: false, name: draftMeta.name },
  };
}

async function galleryUpdate(selects, project, input, inventory, onCommitStarted) {
  if (typeof input.slotKey !== 'string' || !/^tile-(0[1-9]|1[0-9]|2[01])$/.test(input.slotKey)) galleryFail('Select one tile from tile-01 to tile-21');
  if (typeof input.instanceId !== 'string' || !input.instanceId) galleryFail('A verified gallery instance ID is required');
  const state = await galleryReadExisting(selects, project, input, inventory);
  if (!state) galleryFail('The target Draft is not a verified 21-tile Photo Gallery; no change was saved');
  const current = state.existing.media.find((item) => item.slotKey === input.slotKey);
  const nextResourceId = input.resourceId ?? current.resourceId;
  const replacement = inventory.media.find((item) => item.resourceId === nextResourceId);
  if (!replacement) galleryFail('Replacement media is missing or moved');
  const currentResource = inventory.media.find((item) => item.resourceId === current.resourceId);
  if (!currentResource) galleryFail('Current tile media is missing or moved');
  const focusX = input.focusX ?? current.focusX, focusY = input.focusY ?? current.focusY;
  if (![focusX, focusY].every((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1)) galleryFail('Focus must be between 0 and 1');
  const resourceChanged = nextResourceId !== current.resourceId;
  const focusChanged = focusX !== current.focusX || focusY !== current.focusY;
  if (!resourceChanged && !focusChanged) return { status: 'unchanged', draftId: input.draftId, instanceId: input.instanceId, slotKey: input.slotKey };
  if (resourceChanged) {
    if (current.kind !== 'image' || replacement.kind !== 'image' || typeof state.draft.replaceImageResource !== 'function') {
      galleryFail('This Selects version cannot replace this tile without losing its editable presentation; no change was saved');
    }
    if (replacement.width !== currentResource.width || replacement.height !== currentResource.height) {
      galleryFail('An image with different dimensions needs crop recalculation, which this Selects version cannot preserve safely; no change was saved');
    }
    if (focusChanged && typeof state.draft.setVideoEffectParameters !== 'function') {
      galleryFail('This Selects version cannot edit tile focus; no change was saved');
    }
    const probe = await selects.media.probe({ filePaths: [replacement.path] });
    if (probe.error || probe.errors?.length || probe.summary?.failed || !probe.files?.some((file) => file.path === replacement.path)) galleryFail('Replacement image is unreadable; no change was saved');
    await state.draft.replaceImageResource({ clips: state.bySlot.get(input.slotKey), resource: project.resource(nextResourceId), preservePresentation: { fit: 'cover' } });
  }
  if (focusChanged) {
    const rows = (await state.draft.clips({ trackScope: 'all' })).filter((row) => state.bySlot.get(input.slotKey).some((clip) => clip.clipId === row.clipId));
    const effects = [];
    for (const row of rows) {
      const stack = await state.draft.videoEffects(row);
      const matched = stack.filter((effect) => effect.sourceIdentity?.sha256 === TILE_EFFECT_SHA256 && effect.name === `Gallery ${input.slotKey}`);
      if (matched.length !== 1) galleryFail('Tile effect changed during edit; no change was saved');
      effects.push(matched[0]);
    }
    if (typeof state.draft.setVideoEffectParameters !== 'function') galleryFail('This Selects version cannot edit tile focus; no change was saved');
    await state.draft.setVideoEffectParameters({ effects, values: { focusX, focusY } });
  }
  onCommitStarted();
  const saved = await state.draft.commitAll(`Update Photo Gallery ${input.slotKey}`);
  if (!saved?.commitId) galleryFail('Save outcome is unknown; inspect the Draft before retrying');
  return { status: 'saved', draftId: input.draftId, instanceId: input.instanceId, slotKey: input.slotKey, commitId: saved.commitId };
}

async function galleryPreflight(selects, project, input, inventory) {
  const mediaById = new Map(inventory.media.map((item) => [item.resourceId, item]));
  const audioById = new Map(inventory.audio.map((item) => [item.resourceId, item]));
  const chosen = input.media.map((item, i) => {
    const fresh = mediaById.get(item.resourceId);
    if (!fresh) galleryFail(`Slot ${i + 1} media is missing or moved`);
    return { ...fresh, focusX: item.focusX, focusY: item.focusY };
  });
  const music = input.music == null ? null : audioById.get(input.music.resourceId);
  if (input.music != null && !music) galleryFail('Selected music is missing or moved');
  const selectedMusic = music && { ...music, startFrame: input.music.startFrame ?? 0 };
  const plan = planGallery({ media: chosen, music: selectedMusic, manualBpm: input.manualBpm, estimatedBpm: input.estimatedBpm, durationFrames: input.durationFrames });
  const paths = [...new Set([...chosen.map((item) => item.path), ...(music ? [music.path] : [])])];
  const probe = await selects.media.probe({ filePaths: paths });
  const confirmed = new Set((probe.files || []).map((file) => file.path));
  if (probe.error || (probe.errors || []).length || (probe.summary?.failed || 0) || paths.some((path) => !confirmed.has(path))) {
    galleryFail('A selected media file is missing, unreadable, or corrupt; no Draft was saved');
  }
  const meta = await project.meta();
  if (!Array.isArray(meta.draftIds)) galleryFail('Project Draft list is unavailable');
  return { plan, chosen, music: selectedMusic };
}

async function galleryCreate(selects, project, input, inventory, onCommitStarted) {
  const { plan, chosen, music } = await galleryPreflight(selects, project, input, inventory);
  if (chosen.some((item) => item.kind === 'video' && item.durationFrames == null)) galleryFail('A selected video has no known duration');
  if (plan.tiles.some((tile) => tile.segments.some((part) => part.kind === 'hold-last-frame'))) {
    galleryFail('This Selects version cannot hold the last frame of a short video; no Draft was saved');
  }
  const meta = await project.meta();
  if (meta.draftIds?.length && typeof selects.draft(meta.draftIds[0]).bindTemplateClips !== 'function') {
    galleryFail('This Selects version cannot preserve gallery slot identity; no Draft was saved');
  }
  const name = typeof input.name === 'string' && input.name.trim() ? input.name.trim() : 'Photo Gallery';
  const draft = await project.createDraft({ name });
  if (typeof draft.bindTemplateClips !== 'function') galleryFail('This Selects version cannot preserve gallery slot identity; no Draft was saved');
  if ((await draft.meta()).fps !== 60) galleryFail('This Project is not 60 fps; no Draft was saved');
  await draft.insertGap({ seconds: plan.durationFrames / plan.fps });
  await draft.setFrameSize(plan.frameSize);
  const prepared = await draft.meta();
  if (prepared.fps !== plan.fps || prepared.durationFrames !== plan.durationFrames ||
      prepared.frameSize?.width !== plan.frameSize.width || prepared.frameSize?.height !== plan.frameSize.height) {
    galleryFail('The working Draft does not match the requested 60 fps, canvas, and duration; no Draft was saved');
  }
  const bindings = [];
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
      clip, label: `Gallery ${tile.slotKey}`,
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
    bindings.push({ clipId: finalClip.clipId, slotKey: tile.slotKey, occurrenceKey: tile.slotKey });
  }
  if (music) await draft.overlayResource({ resource: project.resource(music.resourceId), over: await draft.rangeAtFrames(0, plan.durationFrames), sourceStartSeconds: music.startFrame / plan.fps });
  const rows = await draft.clips({ trackScope: 'all' });
  if (rows.filter((row) => row.trackKind === 'video' && row.resourceId != null).length !== 21) galleryFail('The working Draft does not contain all 21 editable tiles');
  const bound = await draft.bindTemplateClips({
    templateId: GALLERY_ID,
    templateVersion: GALLERY_VERSION,
    clips: bindings.map((binding) => {
      const clip = rows.find((row) => row.clipId === binding.clipId);
      if (!clip) galleryFail(`Tile ${binding.slotKey} is missing before save`);
      return { clip, slotKey: binding.slotKey, occurrenceKey: binding.occurrenceKey };
    }),
  });
  onCommitStarted();
  const saved = await draft.commitAll('Create editable 21-tile Photo Gallery');
  if (!saved?.commitId || !saved?.createdDraftId) galleryFail('Save outcome is unknown; inspect Project Drafts before retrying');
  return { status: 'saved', draftId: saved.createdDraftId, instanceId: bound.instanceId, tileCount: 21, durationFrames: plan.durationFrames, colorFrame: plan.colorFrame };
}

async function galleryOperation(selects, raw) {
  let commitStarted = false;
  try {
    const input = assertGalleryInput(raw);
    const project = selects.project(input.projectId);
    const inventory = await galleryInventory(project);
    if (input.operation === 'inspect') {
      const state = await galleryReadExisting(selects, project, input, inventory);
      return { status: 'inspected', projectId: input.projectId, ...inventory, existing: state?.existing ?? null };
    }
    if (input.operation === 'create') return await galleryCreate(selects, project, input, inventory, () => { commitStarted = true; });
    if (input.operation === 'update') return await galleryUpdate(selects, project, input, inventory, () => { commitStarted = true; });
    galleryFail('Changing gallery timing is not supported by this Selects SDK; no changes were made');
  } catch (error) {
    return { status: commitStarted ? 'outcomeUnknown' : 'notSaved', message: String(error?.message || error) };
  }
}
