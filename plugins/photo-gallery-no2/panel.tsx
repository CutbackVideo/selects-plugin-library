// @name Photo Gallery 21
// @icon image
// Build a native, editable 3×7 photo/video gallery in the current Selects project.
import React from 'react';
const SCRIPT_PREFIX = "// Pure Photo Gallery contract. All frame values use the 60 fps output clock.\nconst REFERENCE = Object.freeze({\n  width: 1080,\n  height: 1920,\n  fps: 60,\n  durationFrames: 853,\n  nominalBpm: 113,\n  colorFrame: 270,\n  revealFrames: Object.freeze([0, 12, 23, 36, 45, 52, 62, 73, 81, 90, 100, 113, 122, 133, 143, 151, 161, 172, 182, 192, 205]),\n});\n\nfunction assertPositiveInteger(value, label) {\n  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${label} must be a positive integer`);\n}\n\nfunction validateMedia(media) {\n  if (!Array.isArray(media) || media.length !== 21) throw new Error('Exactly 21 visual media slots are required');\n  return media.map((item, index) => {\n    if (!item || !['image', 'video'].includes(item.kind)) throw new Error(`Slot ${index + 1} needs visual image or video media`);\n    if (typeof item.resourceId !== 'string' || !item.resourceId.trim()) throw new Error(`Slot ${index + 1} needs a resource ID`);\n    assertPositiveInteger(item.width, `Slot ${index + 1} width`);\n    assertPositiveInteger(item.height, `Slot ${index + 1} height`);\n    const focusX = item.focusX ?? 0.5;\n    const focusY = item.focusY ?? 0.5;\n    if (![focusX, focusY].every((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1)) {\n      throw new Error(`Slot ${index + 1} focus must be between 0 and 1`);\n    }\n    if (item.kind === 'video') assertPositiveInteger(item.durationFrames, `Slot ${index + 1} durationFrames`);\n    return { ...item, focusX, focusY };\n  });\n}\n\nfunction visualSegments(item, revealFrame, durationFrames) {\n  if (item.kind === 'image') return [{ kind: 'image', startFrame: revealFrame, endFrame: durationFrames }];\n  const videoEnd = Math.min(durationFrames, revealFrame + item.durationFrames);\n  const segments = [{ kind: 'video', startFrame: revealFrame, endFrame: videoEnd, sourceStartFrame: 0 }];\n  if (videoEnd < durationFrames) segments.push({ kind: 'hold-last-frame', startFrame: videoEnd, endFrame: durationFrames, sourceFrame: item.durationFrames - 1 });\n  return segments;\n}\n\nfunction tileRect(row, column) {\n  return {\n    left: column * 360 + 2,\n    right: (column + 1) * 360 - 2,\n    top: Math.round(row * REFERENCE.height / 7) + 2,\n    bottom: Math.round((row + 1) * REFERENCE.height / 7) - 2,\n  };\n}\n\nfunction planGallery(input) {\n  if (!input || typeof input !== 'object') throw new Error('Gallery input is required');\n  const media = validateMedia(input.media);\n  const durationFrames = input.durationFrames ?? REFERENCE.durationFrames;\n  assertPositiveInteger(durationFrames, 'durationFrames');\n  const hasManualBpm = input.manualBpm !== undefined && input.manualBpm !== null;\n  const bpm = hasManualBpm ? Number(input.manualBpm) : Number(input.estimatedBpm);\n  if (!Number.isFinite(bpm) || bpm <= 0 || (!input.music && !hasManualBpm)) {\n    throw new Error('BPM is required; provide a manual BPM when there is no music or no reliable estimate');\n  }\n  const ratio = REFERENCE.nominalBpm / bpm;\n  const revealFrames = REFERENCE.revealFrames.map((frame) => Math.round(frame * ratio));\n  if (revealFrames.some((frame, i) => i > 0 && frame <= revealFrames[i - 1])) {\n    throw new Error('BPM is too high to show all 21 tiles in distinct output frames');\n  }\n  const colorFrame = Math.round(REFERENCE.colorFrame * ratio);\n  if (colorFrame >= durationFrames) throw new Error('Color transition would occur after the output end');\n  if (input.music) {\n    if (typeof input.music.resourceId !== 'string' || !input.music.resourceId.trim()) throw new Error('Music needs a resource ID');\n    assertPositiveInteger(input.music.durationFrames, 'Music durationFrames');\n    const musicStartFrame = input.music.startFrame ?? 0;\n    if (!Number.isSafeInteger(musicStartFrame) || musicStartFrame < 0) throw new Error('Music startFrame must be nonnegative');\n    if (input.music.durationFrames - musicStartFrame < durationFrames) throw new Error('Selected music is too short for the output');\n  }\n  const tiles = media.map((item, i) => ({\n    slotKey: `tile-${String(i + 1).padStart(2, '0')}`,\n    resourceId: item.resourceId,\n    kind: item.kind,\n    row: Math.floor(i / 3),\n    column: i % 3,\n    rect: tileRect(Math.floor(i / 3), i % 3),\n    revealFrame: revealFrames[i],\n    endFrame: durationFrames,\n    focusX: item.focusX,\n    focusY: item.focusY,\n    segments: visualSegments(item, revealFrames[i], durationFrames),\n  }));\n  return {\n    frameSize: { width: REFERENCE.width, height: REFERENCE.height },\n    fps: REFERENCE.fps,\n    durationFrames,\n    bpm,\n    bpmSource: hasManualBpm ? 'manual' : 'estimated',\n    colorFrame,\n    music: input.music ?? null,\n    tiles,\n  };\n}\n\n// Executed inside Selects run_script by both the panel and the chat skill.\nconst GALLERY_ID = 'photo-gallery-no2';\nconst GALLERY_VERSION = '1';\nconst TILE_EFFECT_SHA256 = 'bf1d24dab2ac13a45fcd5a1ce5ff0587de86be31f900ab03976cbbc1fc5eba86';\nconst TILE_EFFECT = `import {useCurrentFrame} from 'remotion';\nexport default function PhotoGalleryTile({Source,data}) {\n  const frame = useCurrentFrame();\n  const sourceW = data.sourceWidth, sourceH = data.sourceHeight;\n  const frameW = data.frameWidth, frameH = data.frameHeight;\n  const x = Math.max(frameW - sourceW, Math.min(0, frameW / 2 - data.focusX * sourceW));\n  const y = Math.max(frameH - sourceH, Math.min(0, frameH / 2 - data.focusY * sourceH));\n  return <div style={{position:'absolute',inset:0}}>\n    <div style={{position:'absolute',left:data.cropLeft,top:data.cropTop,width:frameW,height:frameH,overflow:'hidden',filter:frame < data.colorAfterLocalFrame ? 'grayscale(1)' : 'none'}}>\n      <div style={{position:'absolute',left:x,top:y,width:sourceW,height:sourceH}}><Source/></div>\n    </div>\n  </div>;\n}`;\n\nfunction galleryFail(message) { throw new Error(message); }\n\nasync function galleryInventory(project) {\n  const resources = await project.resources();\n  const byId = new Map(resources.map((row) => [row.resourceId, row]));\n  const overview = await project.sourceFiles();\n  const nodes = [];\n  const visit = (items) => {\n    for (const item of items || []) {\n      if (item.type === 'dir') visit(item.children);\n      else nodes.push(item);\n    }\n  };\n  if (Array.isArray(overview.fileTree)) visit(overview.fileTree);\n  else if (overview.mode === 'summary' && Array.isArray(overview.folders)) {\n    for (const folder of overview.folders) {\n      const part = await project.sourceFiles({ folder: folder.name });\n      if (!Array.isArray(part.fileTree)) galleryFail('Media inventory is incomplete');\n      visit(part.fileTree);\n    }\n  } else galleryFail('Media inventory is unavailable');\n  const media = [], audio = [];\n  const seen = new Set();\n  for (const node of nodes) {\n    const resource = byId.get(node.resourceId);\n    if (!resource || seen.has(node.resourceId) || typeof node.path !== 'string') continue;\n    const type = String(resource.type).toLowerCase();\n    const kind = type === 'image' ? 'image' : type === 'video' ? 'video' : type === 'audio' ? 'audio' : null;\n    if (!kind) continue;\n    const durationFrames = Number.isFinite(node.durationSeconds) ? Math.floor(node.durationSeconds * 60 + 1e-6) : null;\n    const common = { resourceId: node.resourceId, name: node.name, path: node.path, durationFrames };\n    if (kind === 'audio') audio.push(common);\n    else if (node.frameSize?.width > 0 && node.frameSize?.height > 0) {\n      media.push({ ...common, kind, width: node.frameSize.width, height: node.frameSize.height });\n    }\n    seen.add(node.resourceId);\n  }\n  const unavailable = resources.filter((resource) =>\n    ['image', 'video', 'audio'].includes(String(resource.type).toLowerCase()) &&\n    !media.some((item) => item.resourceId === resource.resourceId) &&\n    !audio.some((item) => item.resourceId === resource.resourceId));\n  if (unavailable.length) {\n    galleryFail(`${unavailable.length} Project media resource(s) have no readable path or dimensions in this Selects SDK; no Draft was changed`);\n  }\n  return { media, audio };\n}\n\nfunction galleryGeometry(tile, source, colorFrame) {\n  const { left, right, top, bottom } = tile.rect;\n  const width = right - left, height = bottom - top;\n  const q = Math.min(source.width / width, source.height / height);\n  const frameWidth = width * q, frameHeight = height * q;\n  const conform = Math.min(1080 / source.width, 1920 / source.height);\n  return {\n    effect: {\n      sourceWidth: source.width, sourceHeight: source.height,\n      frameWidth, frameHeight,\n      cropLeft: (source.width - frameWidth) / 2,\n      cropTop: (source.height - frameHeight) / 2,\n      focusX: tile.focusX, focusY: tile.focusY,\n      colorAfterLocalFrame: colorFrame - tile.revealFrame,\n    },\n    transform: {\n      position: { x: (((left + right) / 2) - 540) / 1920 * 100, y: (960 - (top + bottom) / 2) / 1920 * 100 },\n      scale: { x: 1 / (q * conform), y: 1 / (q * conform) },\n    },\n  };\n}\n\nfunction assertGalleryInput(input) {\n  if (!input || typeof input !== 'object' || Array.isArray(input)) galleryFail('Gallery input is required');\n  if (typeof input.projectId !== 'string' || !input.projectId) galleryFail('Select a Project');\n  if (!['inspect', 'create', 'update', 'updateTiming'].includes(input.operation)) galleryFail('Unknown gallery action');\n  if (input.operation === 'create' && (!Array.isArray(input.media) || input.media.length !== 21)) galleryFail('Select exactly 21 visual slots');\n  return input;\n}\n\nfunction galleryFocus(effect, key) {\n  const edit = effect.editableParameters;\n  const definition = edit?.definitions?.find((entry) => entry.key === key);\n  const value = edit?.values?.[key] ?? definition?.defaultValue;\n  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) galleryFail(`Gallery ${key} control is unreadable`);\n  return value;\n}\n\nasync function galleryReadExisting(selects, project, input, inventory) {\n  if (!input.draftId) return null;\n  const projectMeta = await project.meta();\n  if (!projectMeta.draftIds?.includes(input.draftId)) galleryFail('Target Draft does not belong to this Project');\n  const draft = selects.draft(input.draftId);\n  if (typeof draft.clipTemplateBinding !== 'function' || typeof draft.videoEffects !== 'function') return null;\n  const draftMeta = await draft.meta();\n  const rows = (await draft.clips({ trackScope: 'all' })).filter((row) => row.resourceId && (row.trackKind === 'video' || row.trackKind === 'main'));\n  const groups = new Map();\n  for (const row of rows) {\n    const binding = await draft.clipTemplateBinding(row);\n    if (!binding || binding.templateId !== GALLERY_ID || binding.templateVersion !== GALLERY_VERSION) continue;\n    if (!groups.has(binding.instanceId)) groups.set(binding.instanceId, []);\n    groups.get(binding.instanceId).push({ row, binding });\n  }\n  const instanceId = input.instanceId || (groups.size === 1 ? [...groups.keys()][0] : null);\n  if (!instanceId || !groups.has(instanceId)) return null;\n  const bound = groups.get(instanceId);\n  const bySlot = new Map();\n  for (const item of bound) {\n    const slotKey = item.binding.slotKey;\n    if (!/^tile-(0[1-9]|1[0-9]|2[01])$/.test(slotKey) || item.binding.occurrenceKey !== slotKey) return null;\n    if (!bySlot.has(slotKey)) bySlot.set(slotKey, []);\n    bySlot.get(slotKey).push(item.row);\n  }\n  if (bySlot.size !== 21) return null;\n  const inventoryById = new Map(inventory.media.map((item) => [item.resourceId, item]));\n  const media = [], effectsBySlot = new Map();\n  for (let i = 1; i <= 21; i++) {\n    const slotKey = `tile-${String(i).padStart(2, '0')}`;\n    const clips = bySlot.get(slotKey);\n    if (!clips?.length || new Set(clips.map((clip) => clip.resourceId)).size !== 1) return null;\n    const source = inventoryById.get(clips[0].resourceId);\n    if (!source) return null;\n    const effects = [];\n    for (const clip of clips) {\n      const stack = await draft.videoEffects(clip);\n      const matched = stack.filter((effect) => effect.sourceIdentity?.sha256 === TILE_EFFECT_SHA256 && effect.name === `Gallery ${slotKey}`);\n      if (matched.length !== 1) return null;\n      effects.push(matched[0]);\n    }\n    const focusX = galleryFocus(effects[0], 'focusX');\n    const focusY = galleryFocus(effects[0], 'focusY');\n    if (effects.some((effect) => galleryFocus(effect, 'focusX') !== focusX || galleryFocus(effect, 'focusY') !== focusY)) return null;\n    media.push({ slotKey, resourceId: clips[0].resourceId, kind: source.kind, focusX, focusY });\n    effectsBySlot.set(slotKey, effects);\n  }\n  return {\n    draft, bySlot, effectsBySlot,\n    existing: { draftId: input.draftId, instanceId, media, bpm: null, musicResourceId: null,\n      durationFrames: draftMeta.durationFrames, fps: draftMeta.fps, frameSize: draftMeta.frameSize,\n      timingEditable: false, name: draftMeta.name },\n  };\n}\n\nasync function galleryUpdate(selects, project, input, inventory, onCommitStarted) {\n  if (typeof input.slotKey !== 'string' || !/^tile-(0[1-9]|1[0-9]|2[01])$/.test(input.slotKey)) galleryFail('Select one tile from tile-01 to tile-21');\n  if (typeof input.instanceId !== 'string' || !input.instanceId) galleryFail('A verified gallery instance ID is required');\n  const state = await galleryReadExisting(selects, project, input, inventory);\n  if (!state) galleryFail('The target Draft is not a verified 21-tile Photo Gallery; no change was saved');\n  const current = state.existing.media.find((item) => item.slotKey === input.slotKey);\n  const nextResourceId = input.resourceId ?? current.resourceId;\n  const replacement = inventory.media.find((item) => item.resourceId === nextResourceId);\n  if (!replacement) galleryFail('Replacement media is missing or moved');\n  const currentResource = inventory.media.find((item) => item.resourceId === current.resourceId);\n  if (!currentResource) galleryFail('Current tile media is missing or moved');\n  const focusX = input.focusX ?? current.focusX, focusY = input.focusY ?? current.focusY;\n  if (![focusX, focusY].every((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1)) galleryFail('Focus must be between 0 and 1');\n  const resourceChanged = nextResourceId !== current.resourceId;\n  const focusChanged = focusX !== current.focusX || focusY !== current.focusY;\n  if (!resourceChanged && !focusChanged) return { status: 'unchanged', draftId: input.draftId, instanceId: input.instanceId, slotKey: input.slotKey };\n  if (resourceChanged) {\n    if (current.kind !== 'image' || replacement.kind !== 'image' || typeof state.draft.replaceImageResource !== 'function') {\n      galleryFail('This Selects version cannot replace this tile without losing its editable presentation; no change was saved');\n    }\n    if (replacement.width !== currentResource.width || replacement.height !== currentResource.height) {\n      galleryFail('An image with different dimensions needs crop recalculation, which this Selects version cannot preserve safely; no change was saved');\n    }\n    if (focusChanged && typeof state.draft.setVideoEffectParameters !== 'function') {\n      galleryFail('This Selects version cannot edit tile focus; no change was saved');\n    }\n    const probe = await selects.media.probe({ filePaths: [replacement.path] });\n    if (probe.error || probe.errors?.length || probe.summary?.failed || !probe.files?.some((file) => file.path === replacement.path)) galleryFail('Replacement image is unreadable; no change was saved');\n    await state.draft.replaceImageResource({ clips: state.bySlot.get(input.slotKey), resource: project.resource(nextResourceId), preservePresentation: { fit: 'cover' } });\n  }\n  if (focusChanged) {\n    const rows = (await state.draft.clips({ trackScope: 'all' })).filter((row) => state.bySlot.get(input.slotKey).some((clip) => clip.clipId === row.clipId));\n    const effects = [];\n    for (const row of rows) {\n      const stack = await state.draft.videoEffects(row);\n      const matched = stack.filter((effect) => effect.sourceIdentity?.sha256 === TILE_EFFECT_SHA256 && effect.name === `Gallery ${input.slotKey}`);\n      if (matched.length !== 1) galleryFail('Tile effect changed during edit; no change was saved');\n      effects.push(matched[0]);\n    }\n    if (typeof state.draft.setVideoEffectParameters !== 'function') galleryFail('This Selects version cannot edit tile focus; no change was saved');\n    await state.draft.setVideoEffectParameters({ effects, values: { focusX, focusY } });\n  }\n  onCommitStarted();\n  const saved = await state.draft.commitAll(`Update Photo Gallery ${input.slotKey}`);\n  if (!saved?.commitId) galleryFail('Save outcome is unknown; inspect the Draft before retrying');\n  return { status: 'saved', draftId: input.draftId, instanceId: input.instanceId, slotKey: input.slotKey, commitId: saved.commitId };\n}\n\nasync function galleryPreflight(selects, project, input, inventory) {\n  const mediaById = new Map(inventory.media.map((item) => [item.resourceId, item]));\n  const audioById = new Map(inventory.audio.map((item) => [item.resourceId, item]));\n  const chosen = input.media.map((item, i) => {\n    const fresh = mediaById.get(item.resourceId);\n    if (!fresh) galleryFail(`Slot ${i + 1} media is missing or moved`);\n    return { ...fresh, focusX: item.focusX, focusY: item.focusY };\n  });\n  const music = input.music == null ? null : audioById.get(input.music.resourceId);\n  if (input.music != null && !music) galleryFail('Selected music is missing or moved');\n  const selectedMusic = music && { ...music, startFrame: input.music.startFrame ?? 0 };\n  const plan = planGallery({ media: chosen, music: selectedMusic, manualBpm: input.manualBpm, estimatedBpm: input.estimatedBpm, durationFrames: input.durationFrames });\n  const paths = [...new Set([...chosen.map((item) => item.path), ...(music ? [music.path] : [])])];\n  const probe = await selects.media.probe({ filePaths: paths });\n  const confirmed = new Set((probe.files || []).map((file) => file.path));\n  if (probe.error || (probe.errors || []).length || (probe.summary?.failed || 0) || paths.some((path) => !confirmed.has(path))) {\n    galleryFail('A selected media file is missing, unreadable, or corrupt; no Draft was saved');\n  }\n  const meta = await project.meta();\n  if (!Array.isArray(meta.draftIds)) galleryFail('Project Draft list is unavailable');\n  return { plan, chosen, music: selectedMusic };\n}\n\nasync function galleryCreate(selects, project, input, inventory, onCommitStarted) {\n  const { plan, chosen, music } = await galleryPreflight(selects, project, input, inventory);\n  if (chosen.some((item) => item.kind === 'video' && item.durationFrames == null)) galleryFail('A selected video has no known duration');\n  if (plan.tiles.some((tile) => tile.segments.some((part) => part.kind === 'hold-last-frame'))) {\n    galleryFail('This Selects version cannot hold the last frame of a short video; no Draft was saved');\n  }\n  const meta = await project.meta();\n  if (meta.draftIds?.length && typeof selects.draft(meta.draftIds[0]).bindTemplateClips !== 'function') {\n    galleryFail('This Selects version cannot preserve gallery slot identity; no Draft was saved');\n  }\n  const name = typeof input.name === 'string' && input.name.trim() ? input.name.trim() : 'Photo Gallery';\n  const draft = await project.createDraft({ name });\n  if (typeof draft.bindTemplateClips !== 'function') galleryFail('This Selects version cannot preserve gallery slot identity; no Draft was saved');\n  if ((await draft.meta()).fps !== 60) galleryFail('This Project is not 60 fps; no Draft was saved');\n  await draft.insertGap({ seconds: plan.durationFrames / plan.fps });\n  await draft.setFrameSize(plan.frameSize);\n  const prepared = await draft.meta();\n  if (prepared.fps !== plan.fps || prepared.durationFrames !== plan.durationFrames ||\n      prepared.frameSize?.width !== plan.frameSize.width || prepared.frameSize?.height !== plan.frameSize.height) {\n    galleryFail('The working Draft does not match the requested 60 fps, canvas, and duration; no Draft was saved');\n  }\n  const bindings = [];\n  let knownClipIds = new Set((await draft.clips({ trackScope: 'all' })).map((row) => row.clipId));\n  for (let i = 0; i < plan.tiles.length; i++) {\n    const tile = plan.tiles[i], source = chosen[i];\n    await draft.overlayResource({ resource: project.resource(tile.resourceId), over: await draft.rangeAtFrames(tile.revealFrame, tile.endFrame) });\n    const after = await draft.clips({ trackScope: 'all' });\n    const added = after.filter((row) => !knownClipIds.has(row.clipId) && row.resourceId === tile.resourceId && row.startFrame === tile.revealFrame && row.endFrame === tile.endFrame);\n    if (added.length !== 1) galleryFail(`Could not identify tile ${i + 1} after placement; no Draft was saved`);\n    const clip = added[0];\n    const geometry = galleryGeometry(tile, source, plan.colorFrame);\n    await draft.addVideoEffect({\n      clip, label: `Gallery ${tile.slotKey}`,\n      tsxCode: TILE_EFFECT,\n      parameters: geometry.effect,\n      editableParameters: [\n        { key: 'focusX', label: 'Horizontal focus', type: 'number', defaultValue: 0.5, min: 0, max: 1, step: 0.01 },\n        { key: 'focusY', label: 'Vertical focus', type: 'number', defaultValue: 0.5, min: 0, max: 1, step: 0.01 },\n      ],\n    });\n    const freshClip = (await draft.clips({ trackScope: 'all' })).find((row) => row.clipId === clip.clipId);\n    if (!freshClip) galleryFail(`Tile ${i + 1} disappeared before placement was complete`);\n    await draft.setClipTransform({ clip: freshClip, position: geometry.transform.position, scale: geometry.transform.scale });\n    const finalRows = await draft.clips({ trackScope: 'all' });\n    const finalClip = finalRows.find((row) => row.clipId === clip.clipId);\n    if (!finalClip) galleryFail(`Tile ${i + 1} disappeared after transform`);\n    knownClipIds = new Set(finalRows.map((row) => row.clipId));\n    bindings.push({ clipId: finalClip.clipId, slotKey: tile.slotKey, occurrenceKey: tile.slotKey });\n  }\n  if (music) await draft.overlayResource({ resource: project.resource(music.resourceId), over: await draft.rangeAtFrames(0, plan.durationFrames), sourceStartSeconds: music.startFrame / plan.fps });\n  const rows = await draft.clips({ trackScope: 'all' });\n  if (rows.filter((row) => row.trackKind === 'video' && row.resourceId != null).length !== 21) galleryFail('The working Draft does not contain all 21 editable tiles');\n  const bound = await draft.bindTemplateClips({\n    templateId: GALLERY_ID,\n    templateVersion: GALLERY_VERSION,\n    clips: bindings.map((binding) => {\n      const clip = rows.find((row) => row.clipId === binding.clipId);\n      if (!clip) galleryFail(`Tile ${binding.slotKey} is missing before save`);\n      return { clip, slotKey: binding.slotKey, occurrenceKey: binding.occurrenceKey };\n    }),\n  });\n  onCommitStarted();\n  const saved = await draft.commitAll('Create editable 21-tile Photo Gallery');\n  if (!saved?.commitId || !saved?.createdDraftId) galleryFail('Save outcome is unknown; inspect Project Drafts before retrying');\n  return { status: 'saved', draftId: saved.createdDraftId, instanceId: bound.instanceId, tileCount: 21, durationFrames: plan.durationFrames, colorFrame: plan.colorFrame };\n}\n\nasync function galleryOperation(selects, raw) {\n  let commitStarted = false;\n  try {\n    const input = assertGalleryInput(raw);\n    const project = selects.project(input.projectId);\n    const inventory = await galleryInventory(project);\n    if (input.operation === 'inspect') {\n      const state = await galleryReadExisting(selects, project, input, inventory);\n      return { status: 'inspected', projectId: input.projectId, ...inventory, existing: state?.existing ?? null };\n    }\n    if (input.operation === 'create') return await galleryCreate(selects, project, input, inventory, () => { commitStarted = true; });\n    if (input.operation === 'update') return await galleryUpdate(selects, project, input, inventory, () => { commitStarted = true; });\n    galleryFail('Changing gallery timing is not supported by this Selects SDK; no changes were made');\n  } catch (error) {\n    return { status: commitStarted ? 'outcomeUnknown' : 'notSaved', message: String(error?.message || error) };\n  }\n}\n\nreturn await galleryOperation(selects, ";
const buildScript = input => SCRIPT_PREFIX + JSON.stringify(input) + ');';

const SLOT_KEYS = Array.from({ length: 21 }, (_, i) => `tile-${String(i + 1).padStart(2, '0')}`);
const emptySlots = () => SLOT_KEYS.map(() => ({ resourceId: '', focusX: 0.5, focusY: 0.5 }));
const shellQuote = value => "'" + String(value).replace(/'/g, "'\"'\"'") + "'";
const STRINGS = {
  ko: {
    title: '\ud3ec\ud1a0 \uac24\ub7ec\ub9ac 21\uce78', description: '3\uc5f4 × 7\ud589\uc774 \ucc28\ub840\ub85c \ucc44\uc6cc\uc9c0\uace0 \uc804\uccb4\uac00 \ud751\ubc31\uc5d0\uc11c \uceec\ub7ec\ub85c \ubc14\ub01d\ub2c8\ub2e4. \uc0c8 \ud3b8\uc9d1\ubcf8\uc758 21\uce78\uc5d0 \uc0ac\uc9c4\uacfc \uc601\uc0c1\uc744 \uac01\uac01 \uc9c0\uc815\ud569\ub2c8\ub2e4.',
    noProject: '\uba3c\uc800 \ud504\ub85c\uc81d\ud2b8\ub97c \uc5ec\uc138\uc694.', load: '\ud504\ub85c\uc81d\ud2b8 \ubbf8\ub514\uc5b4 \ubd88\ub7ec\uc624\uae30', changed: '\ud504\ub85c\uc81d\ud2b8 \ub610\ub294 \ud3b8\uc9d1\ubcf8\uc774 \ubc14\ub00c\uc5c8\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \ubd88\ub7ec\uc624\uc138\uc694.',
    mode: '\uc791\uc5c5', createMode: '\uc0c8 \ud3b8\uc9d1\ubcf8', updateMode: '\ud604\uc7ac \ud3b8\uc9d1\ubcf8 \uc218\uc815', noDraft: '\uc218\uc815\ud560 \ud3b8\uc9d1\ubcf8\uc744 \uba3c\uc800 \uc5f4\uc5b4 \uc8fc\uc138\uc694.',
    invalidDraft: '\ud604\uc7ac \ud3b8\uc9d1\ubcf8\uc5d0\uc11c \uc774 \ud50c\ub7ec\uadf8\uc778\uc758 21\uce78 \uad6c\uc131\uc744 \ud655\uc778\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. \ub2e4\ub978 \ud3b8\uc9d1\ubcf8\uc744 \ub36e\uc5b4\uc4f0\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.',
    slot: '\uce78', media: '\uc0ac\uc9c4 \ub610\ub294 \uc601\uc0c1', choose: '\ubbf8\ub514\uc5b4 \uc120\ud0dd', noMedia: '\ud504\ub85c\uc81d\ud2b8\uc5d0 \uc0ac\uc9c4 \ub610\ub294 \uc601\uc0c1\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.',
    assigned: '\uc9c0\uc815\ud55c \uce78', fill: '21\uac1c\ub97c \ubaa9\ub85d \uc21c\uc11c\ub85c \uc9c0\uc815', fillHint: '\ubaa9\ub85d\uc5d0 \ubbf8\ub514\uc5b4\uac00 \uc815\ud655\ud788 21\uac1c\uc77c \ub54c\ub9cc \uc0ac\uc6a9\ud569\ub2c8\ub2e4. \uac19\uc740 \ubbf8\ub514\uc5b4\ub97c \uc5ec\ub7ec \uce78\uc5d0 \uc4f0\ub824\uba74 \uac01 \uce78\uc5d0\uc11c \uc9c1\uc811 \uace0\ub974\uc138\uc694.',
    focusX: '\uac00\ub85c \ucd08\uc810', focusY: '\uc138\ub85c \ucd08\uc810', slotEdit: '\uc774 \uce78 \ubcc0\uacbd \uc800\uc7a5',
    editLimits: '\ud604\uc7ac SDK\uc5d0\uc11c\ub294 \uac19\uc740 \ud06c\uae30\uc758 \uc0ac\uc9c4 \uad50\uccb4\uc640 \ucd08\uc810 \uc218\uc815\ub9cc \uc548\uc804\ud558\uac8c \uc2dc\ub3c4\ud569\ub2c8\ub2e4. \uc601\uc0c1 \uad50\uccb4\ub098 \ub2e4\ub978 \ud06c\uae30\uc758 \uc0ac\uc9c4\uc740 \uc800\uc7a5 \uc804\uc5d0 \ucc28\ub2e8\ud569\ub2c8\ub2e4.',
    music: '\uc74c\uc545', noMusic: '\uc74c\uc545 \uc5c6\uc74c', musicKeep: '\ud604\uc7ac \uc74c\uc545 \uc720\uc9c0', musicRemove: '\uc74c\uc545 \uc81c\uac70',
    bpmManual: 'BPM \uc9c1\uc811 \uc9c0\uc815', bpm: 'BPM', estimate: '\uc74c\uc545 BPM \ucd94\uc815', estimated: '\ucd94\uc815 BPM', uncertain: 'BPM\uc744 \ud655\uc2e4\ud788 \ucd94\uc815\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. \uc9c1\uc811 \uc785\ub825\ud574 \uc8fc\uc138\uc694.',
    duration: '\uc601\uc0c1 \uae38\uc774', durationNote: '\uae30\ubcf8 14.217\ucd08 · 60fps. \uc74c\uc545\uc744 \uace0\ub974\uba74 \uc774 \uae38\uc774\ub97c \ucc44\uc6b8 \uc218 \uc788\uc5b4\uc57c \ud569\ub2c8\ub2e4.',
    name: '\ud3b8\uc9d1\ubcf8 \uc774\ub984', create: '\uc0c8 \ud3b8\uc9d1\ubcf8 \ub9cc\ub4e4\uae30', timingEdit: '\uc74c\uc545·\uc18d\ub3c4·\uae38\uc774 \ubcc0\uacbd \uc800\uc7a5',
    busy: '\ucc98\ub9ac \uc911\u2026', missing: '21\uac1c \uce78\uc5d0 \ubbf8\ub514\uc5b4\ub97c \uc815\ud655\ud788 \uc9c0\uc815\ud574 \uc8fc\uc138\uc694.', bpmMissing: '\uc74c\uc545\uc744 \uc120\ud0dd\ud558\uac70\ub098 BPM\uc744 \uc9c1\uc811 \uc785\ub825\ud574 \uc8fc\uc138\uc694.',
    saved: '\uc800\uc7a5\ud588\uc2b5\ub2c8\ub2e4. \uc2e4\uc81c \uc7ac\uc0dd\uacfc \ub0b4\ubcf4\ub0b4\uae30\ub294 \ubcc4\ub3c4\ub85c \ud655\uc778\ud574 \uc8fc\uc138\uc694.', readback: '\uc800\uc7a5 \ud6c4 \ud3b8\uc9d1\ubcf8\uc758 21\uce78\uc744 \ub2e4\uc2dc \ud655\uc778\ud588\uc2b5\ub2c8\ub2e4. \uc7ac\uc0dd\uacfc \ub0b4\ubcf4\ub0b4\uae30\ub294 \ubcc4\ub3c4 \uac80\uc99d\uc774 \ud544\uc694\ud569\ub2c8\ub2e4.',
    readbackMismatch: '\uc800\uc7a5 \ud6c4 \uc694\uccad\ud55c \uce78 \uac12\uc744 \ud655\uc778\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. \ub3d9\uc77c\ud55c \uc791\uc5c5\uc744 \ubc18\ubcf5\ud558\uc9c0 \ub9d0\uace0 \ud3b8\uc9d1\ubcf8\uc744 \ud655\uc778\ud574 \uc8fc\uc138\uc694.',
    failed: '\uc791\uc5c5\uc744 \ub9c8\uce58\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.', unknown: '\uc800\uc7a5 \uc5ec\ubd80\ub97c \ud655\uc778\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4. \uac19\uc740 \uc791\uc5c5\uc744 \ub2e4\uc2dc \uc2e4\ud589\ud558\uc9c0 \ub9d0\uace0 \ud3b8\uc9d1\ubcf8\uc744 \ud655\uc778\ud574 \uc8fc\uc138\uc694.',
    unavailable: '\uc774 \uae30\ub2a5\uc744 \ud604\uc7ac Selects\uc5d0\uc11c \uc548\uc804\ud558\uac8c \uc2e4\ud589\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.',
    timingUnavailable: '\ud604\uc7ac \ud3b8\uc9d1\ubcf8\uc758 \uc74c\uc545·\uc18d\ub3c4·\uae38\uc774\ub97c \uc548\uc804\ud558\uac8c \ud655\uc778\ud560 \uc218 \uc5c6\uc5b4 \ubcc0\uacbd\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.',
  },
  en: {
    title: '21-tile photo gallery', description: 'A 3 × 7 gallery fills in order, then all tiles switch from monochrome to color. Assign a photo or video to each tile when creating a Draft.',
    noProject: 'Open a project first.', load: 'Load project media', changed: 'The project or Draft changed. Reload its media.',
    mode: 'Action', createMode: 'New Draft', updateMode: 'Edit current Draft', noDraft: 'Open the Draft to edit first.',
    invalidDraft: 'This Draft does not contain a verified 21-tile instance of this plugin. It will not be overwritten.',
    slot: 'Tile', media: 'Photo or video', choose: 'Choose media', noMedia: 'No photos or videos in this project.',
    assigned: 'Assigned tiles', fill: 'Assign all 21 in listed order', fillHint: 'Available only with exactly 21 items. To reuse an item, choose it for each tile explicitly.',
    focusX: 'Horizontal focus', focusY: 'Vertical focus', slotEdit: 'Save this tile',
    editLimits: 'The current SDK can safely attempt focus edits and same-size image swaps only. Video swaps and differently sized images are blocked before saving.',
    music: 'Music', noMusic: 'No music', musicKeep: 'Keep current music', musicRemove: 'Remove music',
    bpmManual: 'Enter BPM manually', bpm: 'BPM', estimate: 'Estimate music BPM', estimated: 'Estimated BPM', uncertain: 'Could not estimate BPM reliably. Enter it manually.',
    duration: 'Video length', durationNote: 'Default 14.217 seconds at 60 fps. Music must cover this length.',
    name: 'Draft name', create: 'Create Draft', timingEdit: 'Save music, tempo and length',
    busy: 'Working\u2026', missing: 'Assign media to exactly 21 tiles.', bpmMissing: 'Select music or enter BPM manually.',
    saved: 'Saved. Check actual playback and export separately.', readback: 'Saved and read back all 21 tiles. Playback and export still need separate checks.',
    readbackMismatch: 'Saved, but the requested tile values were not verified. Inspect the Draft before repeating this action.',
    failed: 'Could not complete the action.', unknown: 'Save outcome is unknown. Inspect the Draft before repeating this action.',
    unavailable: 'This Selects build cannot perform this edit safely.',
    timingUnavailable: 'The current Draft\u2019s music, tempo or length could not be verified for safe editing.',
  },
};

function normalizedExisting(existing) {
  if (!existing || !Array.isArray(existing.media) || existing.media.length !== 21 || !existing.instanceId) return null;
  const byKey = new Map(existing.media.map((item, i) => [item.slotKey || SLOT_KEYS[i], item]));
  if (byKey.size !== 21 || SLOT_KEYS.some(key => !byKey.has(key))) return null;
  return { ...existing, slots: SLOT_KEYS.map(key => {
    const item = byKey.get(key);
    return { resourceId: item.resourceId, focusX: item.focusX ?? 0.5, focusY: item.focusY ?? 0.5 };
  }) };
}

function slotsMatch(actual, expected) {
  return actual.length === 21 && expected.length === 21 && actual.every((item, i) =>
    item.resourceId === expected[i].resourceId && item.focusX === expected[i].focusX && item.focusY === expected[i].focusY);
}

export default function Panel({ sdk, context, ui }) {
  const t = STRINGS[context.language] || STRINGS.en;
  const [mode, setMode] = React.useState('create');
  const [inventory, setInventory] = React.useState(null);
  const [loadedKey, setLoadedKey] = React.useState('');
  const [existing, setExisting] = React.useState(null);
  const [slots, setSlots] = React.useState(emptySlots);
  const [selectedSlot, setSelectedSlot] = React.useState('0');
  const [musicChoice, setMusicChoice] = React.useState('none');
  const [manualEnabled, setManualEnabled] = React.useState(false);
  const [manualBpm, setManualBpm] = React.useState(113);
  const [estimated, setEstimated] = React.useState(null);
  const [durationFrames, setDurationFrames] = React.useState(853);
  const [name, setName] = React.useState('Photo Gallery');
  const [busy, setBusy] = React.useState(false);
  const [unknown, setUnknown] = React.useState(false);
  const [status, setStatus] = React.useState(null);
  const [savedTarget, setSavedTarget] = React.useState(null);
  const running = React.useRef(false);
  const current = React.useRef({ projectId: context.projectId, sequenceId: context.sequenceId });
  current.current = { projectId: context.projectId, sequenceId: context.sequenceId };
  const key = JSON.stringify([context.projectId, mode === 'update' ? context.sequenceId : 'create', mode]);
  const ready = loadedKey === key && !!inventory;
  const slotIndex = Number(selectedSlot);
  const slot = slots[slotIndex];
  const selectedMedia = inventory?.media?.find(item => item.resourceId === slot.resourceId);
  const selectedMusic = inventory?.audio?.find(item => item.resourceId === musicChoice);
  const assigned = slots.filter(item => !!item.resourceId).length;
  const safeTarget = mode === 'update' && existing?.draftId === context.sequenceId && !!existing.instanceId;
  const sameContext = (projectId, sequenceId) => current.current.projectId === projectId && current.current.sequenceId === sequenceId;

  React.useEffect(() => {
    setInventory(null); setLoadedKey(''); setExisting(null); setSlots(emptySlots()); setMusicChoice(mode === 'update' ? 'keep' : 'none');
    setEstimated(null); setUnknown(false); setSavedTarget(null); setStatus(null);
  }, [context.projectId, context.sequenceId, mode]);

  function updateSlot(patch) {
    setSlots(previous => previous.map((item, i) => i === slotIndex ? { ...item, ...patch } : item));
  }

  async function load() {
    if (running.current || !context.projectId || (mode === 'update' && !context.sequenceId)) return;
    const projectId = context.projectId, sequenceId = context.sequenceId, requestedKey = key;
    running.current = true; setBusy(true); setStatus(null);
    try {
      const input = { operation: 'inspect', projectId, ...(mode === 'update' ? { draftId: sequenceId } : {}) };
      const response = await sdk.runScript({ script: buildScript(input), summary: 'Inspect Photo Gallery project and Draft', allowCommit: false });
      if (response.isError || response.result?.status !== 'inspected' || !Array.isArray(response.result.media) || !Array.isArray(response.result.audio)) {
        throw new Error(response.result?.message || response.output || t.failed);
      }
      if (!sameContext(projectId, sequenceId) || requestedKey !== key) { setStatus({ tone: 'error', text: t.changed }); return; }
      const verified = mode === 'update' ? normalizedExisting(response.result.existing) : null;
      setInventory(response.result); setLoadedKey(requestedKey); setExisting(verified);
      setSlots(verified ? verified.slots : emptySlots());
      setName(verified?.name || 'Photo Gallery');
      setDurationFrames(verified?.durationFrames || 853);
      setMusicChoice(mode === 'update' ? 'keep' : 'none');
      setManualEnabled(false); setManualBpm(verified?.bpm || 113); setEstimated(null);
      setStatus(verified || mode === 'create' ? null : { tone: 'error', text: t.invalidDraft });
    } catch (error) { setStatus({ tone: 'error', text: t.failed + ' ' + String(error?.message || error) }); }
    finally { running.current = false; setBusy(false); }
  }

  async function estimateMusic(audio) {
    if (!audio?.path) throw new Error(t.uncertain);
    if (estimated?.resourceId === audio.resourceId) return estimated.bpm;
    const command = 'python3 "$SELECTS_USER_SKILLS_ROOT/photo-gallery-no2/tempo.py" ' + shellQuote(audio.path);
    const response = await sdk.runShell({ command, summary: 'Estimate BPM from selected Photo Gallery music', timeoutMs: 60000 });
    if (response.isError || response.exitCode !== 0) throw new Error(response.stderr || response.output || t.uncertain);
    let value;
    try { value = JSON.parse(response.stdout); } catch { throw new Error(t.uncertain); }
    if (value?.status !== 'estimated' || !Number.isFinite(value.bpm)) throw new Error(value?.reason || t.uncertain);
    setEstimated({ resourceId: audio.resourceId, bpm: value.bpm });
    return value.bpm;
  }

  async function estimateOnClick() {
    if (running.current || !selectedMusic) return;
    running.current = true; setBusy(true); setStatus(null);
    try { const bpm = await estimateMusic(selectedMusic); setStatus({ tone: 'success', text: t.estimated + ': ' + bpm }); }
    catch (error) { setStatus({ tone: 'error', text: t.uncertain + ' ' + String(error?.message || error) }); }
    finally { running.current = false; setBusy(false); }
  }

  async function resolveBpm(audio, preserveExisting) {
    if (manualEnabled) {
      if (!Number.isFinite(manualBpm) || manualBpm <= 0) throw new Error(t.bpmMissing);
      return { manualBpm };
    }
    if (audio) return { estimatedBpm: await estimateMusic(audio) };
    if (preserveExisting && Number.isFinite(existing?.bpm) && existing.bpm > 0) return { manualBpm: existing.bpm };
    throw new Error(t.bpmMissing);
  }

  async function runAction(operation) {
    if (running.current || unknown || !ready || !context.projectId) return;
    const projectId = context.projectId, sequenceId = context.sequenceId, requestedKey = key;
    let input;
    try {
      if (operation === 'create') {
        if (assigned !== 21) throw new Error(t.missing);
        input = { operation, projectId, name: name.trim(), durationFrames,
          media: slots.map(item => ({ ...inventory.media.find(media => media.resourceId === item.resourceId), focusX: item.focusX, focusY: item.focusY })),
          music: selectedMusic ? { resourceId: selectedMusic.resourceId, durationFrames: selectedMusic.durationFrames, startFrame: 0 } : null };
        if (!input.name || input.media.some(item => !item.resourceId)) throw new Error(t.missing);
      } else if (operation === 'update') {
        if (!safeTarget || !selectedMedia) throw new Error(t.invalidDraft);
        const before = existing.slots[slotIndex];
        if (before.resourceId === selectedMedia.resourceId && before.focusX === slot.focusX && before.focusY === slot.focusY) {
          setStatus({ tone: 'muted', text: context.language === 'ko' ? '\uc774 \uce78\uc5d0 \ubcc0\uacbd \uc0ac\ud56d\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.' : 'No changes to this tile.' }); return;
        }
        input = { operation, projectId, draftId: sequenceId, instanceId: existing.instanceId,
          slotKey: SLOT_KEYS[slotIndex], resourceId: selectedMedia.resourceId };
        if (slot.focusX !== before.focusX) input.focusX = slot.focusX;
        if (slot.focusY !== before.focusY) input.focusY = slot.focusY;
      } else if (operation === 'updateTiming') {
        if (!safeTarget || existing.timingEditable !== true) throw new Error(t.unavailable);
        input = { operation, projectId, draftId: sequenceId, instanceId: existing.instanceId, durationFrames };
        if (musicChoice !== 'keep') input.music = selectedMusic
          ? { resourceId: selectedMusic.resourceId, durationFrames: selectedMusic.durationFrames, startFrame: 0 }
          : null;
      } else throw new Error(t.unavailable);
    } catch (error) { setStatus({ tone: 'error', text: String(error?.message || error) }); return; }
    running.current = true; setBusy(true); setStatus(null);
    let dispatched = false;
    try {
      if (operation !== 'update') {
        const musicForBpm = operation === 'create' || musicChoice !== 'keep' ? selectedMusic : null;
        Object.assign(input, await resolveBpm(musicForBpm, operation === 'updateTiming'));
      }
      if (!sameContext(projectId, sequenceId) || requestedKey !== key) { setStatus({ tone: 'error', text: t.changed }); return; }
      const script = buildScript(input);
      dispatched = true;
      const response = await sdk.runScript({ script, summary: `Photo Gallery ${operation}`, allowCommit: true });
      if (response.isError || !response.result || response.result.status === 'outcomeUnknown') {
        setUnknown(true); setStatus({ tone: 'error', text: t.unknown }); return;
      }
      if (response.result.status === 'notSaved') { setStatus({ tone: 'error', text: response.result.message || t.failed }); return; }
      if (response.result.status !== 'saved' || !response.result.draftId) {
        setUnknown(true); setStatus({ tone: 'error', text: t.unknown }); return;
      }
      setSavedTarget({ projectId, draftId: response.result.draftId });
      let verified = null;
      let readReturned = false;
      try {
        const read = await sdk.runScript({ script: buildScript({ operation: 'inspect', projectId, draftId: response.result.draftId }), summary: 'Read saved Photo Gallery Draft', allowCommit: false });
        readReturned = true;
        verified = !read.isError && read.result?.status === 'inspected' && normalizedExisting(read.result.existing);
      } catch { /* The mutating call already returned a saved Draft ID. */ }
      const expected = operation === 'create' ? slots : existing.slots.map((item, i) =>
        i === slotIndex ? { resourceId: input.resourceId, focusX: input.focusX ?? item.focusX, focusY: input.focusY ?? item.focusY } : item);
      const exact = verified && verified.draftId === response.result.draftId && verified.instanceId === response.result.instanceId &&
        slotsMatch(verified.slots, expected) &&
        (operation !== 'create' || (verified.durationFrames === input.durationFrames && verified.fps === 60 &&
          verified.frameSize?.width === 1080 && verified.frameSize?.height === 1920));
      if (exact && sameContext(projectId, sequenceId)) {
        setExisting(verified); setSlots(verified.slots); setStatus({ tone: 'success', text: t.readback });
      } else if (readReturned) {
        setUnknown(true); setStatus({ tone: 'error', text: t.readbackMismatch });
      } else { setUnknown(true); setStatus({ tone: 'error', text: t.unknown }); }
    } catch (error) {
      if (dispatched) {
        // A transport failure after a mutating call may hide a successful save.
        setUnknown(true); setStatus({ tone: 'error', text: t.unknown + ' ' + String(error?.message || error) });
      } else setStatus({ tone: 'error', text: String(error?.message || error) });
    } finally { running.current = false; setBusy(false); }
  }

  async function openSaved() {
    if (!savedTarget || running.current) return;
    try {
      const response = await sdk.runScript({ script: 'return await selects.editor.openDraft(' + JSON.stringify(savedTarget.draftId) + ');', summary: 'Open Photo Gallery Draft', allowCommit: false });
      if (response.isError) throw new Error(response.output || t.failed);
    } catch (error) { setStatus({ tone: 'error', text: String(error?.message || error) }); }
  }

  return <ui.Stack gap={16}>
    <ui.Section title={t.title}><p>{t.description}</p></ui.Section>
    {!context.projectId && <ui.Message tone="error">{t.noProject}</ui.Message>}
    <ui.Section title={t.mode}>
      <ui.Segmented label={t.mode} value={mode} onChange={setMode} options={[{ value: 'create', label: t.createMode }, { value: 'update', label: t.updateMode }]} disabled={busy}/>
      {mode === 'update' && !context.sequenceId && <ui.Message tone="error">{t.noDraft}</ui.Message>}
      <ui.Button variant="secondary" onClick={load} busy={busy} disabled={!context.projectId || (mode === 'update' && !context.sequenceId)}>{t.load}</ui.Button>
      {mode === 'update' && ready && !safeTarget && <ui.Message tone="error">{t.invalidDraft}</ui.Message>}
    </ui.Section>
    {ready && <ui.Section title={t.media}>
      <p>{t.assigned}: {assigned}/21</p>
      {mode === 'update' && <small>{t.editLimits}</small>}
      {mode === 'create' && inventory.media.length === 21 && <ui.Button variant="secondary" onClick={() => setSlots(inventory.media.map(item => ({ resourceId: item.resourceId, focusX: 0.5, focusY: 0.5 })))} disabled={busy}>{t.fill}</ui.Button>}
      {mode === 'create' && inventory.media.length === 21 && <small>{t.fillHint}</small>}
      {inventory.media.length === 0 && <ui.Message tone="error">{t.noMedia}</ui.Message>}
      <ui.Select label={t.slot} value={selectedSlot} onChange={setSelectedSlot} options={SLOT_KEYS.map((value, i) => ({ value: String(i), label: String(i + 1).padStart(2, '0') + ' · ' + (slots[i].resourceId ? (inventory.media.find(media => media.resourceId === slots[i].resourceId)?.name || slots[i].resourceId) : t.choose) }))}/>
      <ui.Select label={t.media} value={slot.resourceId || null} onChange={resourceId => updateSlot({ resourceId })} options={inventory.media.map(item => ({ value: item.resourceId, label: item.name + ' · ' + item.kind }))} placeholder={t.choose} disabled={busy || (mode === 'update' && !safeTarget)}/>
      <ui.Slider label={t.focusX} value={slot.focusX} onChange={focusX => updateSlot({ focusX })} min={0} max={1} step={0.01} disabled={busy || !slot.resourceId}/>
      <ui.Slider label={t.focusY} value={slot.focusY} onChange={focusY => updateSlot({ focusY })} min={0} max={1} step={0.01} disabled={busy || !slot.resourceId}/>
      {mode === 'update' && <ui.Actions><ui.Button variant="primary" busy={busy} busyLabel={t.busy} disabled={!safeTarget || !slot.resourceId || unknown} onClick={() => runAction('update')}>{t.slotEdit}</ui.Button></ui.Actions>}
    </ui.Section>}
    {ready && (mode === 'create' || safeTarget) && <ui.Section title={t.music}>
      <ui.Select label={t.music} value={musicChoice} onChange={value => { setMusicChoice(value); setEstimated(null); }} options={[
        ...(mode === 'update' ? [{ value: 'keep', label: t.musicKeep }, { value: 'none', label: t.musicRemove }] : [{ value: 'none', label: t.noMusic }]),
        ...inventory.audio.map(item => ({ value: item.resourceId, label: item.name })),
      ]} disabled={busy}/>
      <ui.Toggle label={t.bpmManual} value={manualEnabled} onChange={setManualEnabled} disabled={busy}/>
      {manualEnabled && <ui.NumberField label={t.bpm} value={manualBpm} onChange={setManualBpm} min={1} max={300} step={0.1} disabled={busy}/>}
      {!manualEnabled && selectedMusic && <ui.Button variant="secondary" onClick={estimateOnClick} disabled={busy}>{t.estimate}</ui.Button>}
      {estimated && selectedMusic && estimated.resourceId === selectedMusic.resourceId && <small>{t.estimated}: {estimated.bpm}</small>}
      <ui.NumberField label={t.duration} value={Number((durationFrames / 60).toFixed(3))} onChange={seconds => setDurationFrames(Math.max(1, Math.round(seconds * 60)))} min={1 / 60} step={1 / 60} unit="s" disabled={busy}/>
      <small>{t.durationNote}</small>
      {mode === 'update' && existing?.timingEditable !== true && <ui.Message tone="error">{t.timingUnavailable}</ui.Message>}
      {mode === 'update' && <ui.Actions><ui.Button variant="secondary" busy={busy} busyLabel={t.busy} disabled={unknown || busy || existing?.timingEditable !== true} onClick={() => runAction('updateTiming')}>{t.timingEdit}</ui.Button></ui.Actions>}
    </ui.Section>}
    {ready && mode === 'create' && <ui.Section title={t.createMode}>
      <ui.TextField label={t.name} value={name} onChange={setName} disabled={busy}/>
      <ui.Actions><ui.Button variant="primary" busy={busy} busyLabel={t.busy} disabled={unknown || busy || assigned !== 21 || !name.trim() || (musicChoice === 'none' && !manualEnabled)} onClick={() => runAction('create')}>{t.create}</ui.Button></ui.Actions>
    </ui.Section>}
    {status && <ui.Message tone={status.tone}>{status.text}</ui.Message>}
    {savedTarget && <ui.Button variant="secondary" onClick={openSaved} disabled={busy}>{context.language === 'ko' ? '\uc800\uc7a5\ud55c \ud3b8\uc9d1\ubcf8 \uc5f4\uae30' : 'Open saved Draft'}</ui.Button>}
  </ui.Stack>;
}
