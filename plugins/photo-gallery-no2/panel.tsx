// @name Photo Gallery 21
// @icon image
// Build a native, editable 3×7 photo/video gallery in the current Selects project.
import React from 'react';
const SCRIPT_PREFIX = "// Pure Photo Gallery contract. All frame values use the 60 fps output clock.\nconst REFERENCE = Object.freeze({\n  width: 1080,\n  height: 1920,\n  fps: 60,\n  durationFrames: 853,\n  nominalBpm: 113,\n  colorFrame: 270,\n  revealFrames: Object.freeze([0, 12, 23, 36, 45, 52, 62, 73, 81, 90, 100, 113, 122, 133, 143, 151, 161, 172, 182, 192, 205]),\n});\n\nfunction assertPositiveInteger(value, label) {\n  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${label} must be a positive integer`);\n}\n\nfunction validateMedia(media) {\n  if (!Array.isArray(media) || media.length !== 21) throw new Error('Exactly 21 visual media slots are required');\n  return media.map((item, index) => {\n    if (!item || !['image', 'video'].includes(item.kind)) throw new Error(`Slot ${index + 1} needs an Image or Video Resource`);\n    if (typeof item.resourceId !== 'string' || !item.resourceId.trim()) throw new Error(`Slot ${index + 1} needs a resource ID`);\n    assertPositiveInteger(item.width, `Slot ${index + 1} width`);\n    assertPositiveInteger(item.height, `Slot ${index + 1} height`);\n    const focusX = item.focusX ?? 0.5;\n    const focusY = item.focusY ?? 0.5;\n    if (![focusX, focusY].every((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1)) {\n      throw new Error(`Slot ${index + 1} focus must be between 0 and 1`);\n    }\n    if (item.kind === 'video') assertPositiveInteger(item.durationFrames, `Slot ${index + 1} durationFrames`);\n    return { ...item, focusX, focusY };\n  });\n}\n\nfunction tileRect(row, column) {\n  return {\n    left: column * 360 + 2,\n    right: (column + 1) * 360 - 2,\n    top: Math.round(row * REFERENCE.height / 7) + 2,\n    bottom: Math.round((row + 1) * REFERENCE.height / 7) - 2,\n  };\n}\n\nfunction planGallery(input) {\n  if (!input || typeof input !== 'object') throw new Error('Gallery input is required');\n  const media = validateMedia(input.media);\n  const durationFrames = input.durationFrames ?? REFERENCE.durationFrames;\n  assertPositiveInteger(durationFrames, 'durationFrames');\n  if (media.some((item) => item.kind === 'video' && item.durationFrames < durationFrames)) {\n    throw new Error('A selected video is too short; extend it with hold_video.py before planning');\n  }\n  const hasManualBpm = input.manualBpm !== undefined && input.manualBpm !== null;\n  const bpm = hasManualBpm ? Number(input.manualBpm) : Number(input.estimatedBpm);\n  if (!Number.isFinite(bpm) || bpm <= 0 || (!input.music && !hasManualBpm)) {\n    throw new Error('BPM is required; provide a manual BPM when there is no music or no reliable estimate');\n  }\n  const ratio = REFERENCE.nominalBpm / bpm;\n  const revealFrames = REFERENCE.revealFrames.map((frame) => Math.round(frame * ratio));\n  if (revealFrames.some((frame, i) => i > 0 && frame <= revealFrames[i - 1])) {\n    throw new Error('BPM is too high to show all 21 tiles in distinct output frames');\n  }\n  const colorFrame = Math.round(REFERENCE.colorFrame * ratio);\n  if (colorFrame >= durationFrames) throw new Error('Color transition would occur after the output end');\n  if (input.music) {\n    if (typeof input.music.resourceId !== 'string' || !input.music.resourceId.trim()) throw new Error('Music needs a resource ID');\n    assertPositiveInteger(input.music.durationFrames, 'Music durationFrames');\n    const musicStartFrame = input.music.startFrame ?? 0;\n    if (!Number.isSafeInteger(musicStartFrame) || musicStartFrame < 0) throw new Error('Music startFrame must be nonnegative');\n    if (input.music.durationFrames - musicStartFrame < durationFrames) throw new Error('Selected music is too short for the output');\n  }\n  const tiles = media.map((item, i) => ({\n    slotKey: `tile-${String(i + 1).padStart(2, '0')}`,\n    resourceId: item.resourceId,\n    kind: item.kind,\n    row: Math.floor(i / 3),\n    column: i % 3,\n    rect: tileRect(Math.floor(i / 3), i % 3),\n    revealFrame: revealFrames[i],\n    endFrame: durationFrames,\n    focusX: item.focusX,\n    focusY: item.focusY,\n  }));\n  return {\n    frameSize: { width: REFERENCE.width, height: REFERENCE.height },\n    fps: REFERENCE.fps,\n    durationFrames,\n    bpm,\n    bpmSource: hasManualBpm ? 'manual' : 'estimated',\n    colorFrame,\n    music: input.music ?? null,\n    tiles,\n  };\n}\n\n// Executed inside Selects run_script by both the panel and the chat skill.\nconst TILE_EFFECT = `import {useCurrentFrame} from 'remotion';\nexport default function PhotoGalleryTile({Source,data}) {\n  const frame = useCurrentFrame();\n  const sourceW = data.sourceWidth, sourceH = data.sourceHeight;\n  const frameW = data.frameWidth, frameH = data.frameHeight;\n  const x = Math.max(frameW - sourceW, Math.min(0, frameW / 2 - data.focusX * sourceW));\n  const y = Math.max(frameH - sourceH, Math.min(0, frameH / 2 - data.focusY * sourceH));\n  return <div style={{position:'absolute',inset:0}}>\n    <div style={{position:'absolute',left:data.cropLeft,top:data.cropTop,width:frameW,height:frameH,overflow:'hidden',filter:frame < data.colorAfterLocalFrame ? 'grayscale(1)' : 'none'}}>\n      <div style={{position:'absolute',left:x,top:y,width:sourceW,height:sourceH}}><Source/></div>\n    </div>\n  </div>;\n}`;\n\nfunction galleryFail(message) { throw new Error(message); }\n\nfunction galleryResolveResource(items, resourceId, path, label) {\n  const byId = items.find((item) => item.resourceId === resourceId);\n  if (typeof path !== 'string' || !path.startsWith('/')) galleryFail(`${label} path is required`);\n  if (byId?.path === path) return byId;\n  const matches = items.filter((item) => item.path === path);\n  if (matches.length !== 1) galleryFail(`${label} path is missing or ambiguous in this Project`);\n  return matches[0];\n}\n\nasync function galleryInventory(project) {\n  const resources = await project.resources();\n  const byId = new Map();\n  for (const row of resources) byId.set(row.resourceId, row);\n  const overview = await project.sourceFiles();\n  const nodes = [];\n  const visit = (items) => {\n    for (const item of items || []) {\n      if (item.type === 'dir') visit(item.children);\n      else nodes.push(item);\n    }\n  };\n  if (Array.isArray(overview.fileTree)) visit(overview.fileTree);\n  else if (overview.mode === 'summary' && Array.isArray(overview.folders)) {\n    for (const folder of overview.folders) {\n      const part = await project.sourceFiles({ folder: folder.name });\n      if (!Array.isArray(part.fileTree)) galleryFail('Media inventory is incomplete');\n      visit(part.fileTree);\n    }\n  } else galleryFail('Media inventory is unavailable');\n  const media = [], audio = [];\n  const seen = new Set();\n  for (const node of nodes) {\n    const resource = byId.get(node.resourceId);\n    if (!resource || seen.has(node.resourceId) || typeof node.path !== 'string') continue;\n    const type = String(resource.type).toLowerCase();\n    const kind = type === 'image' ? 'image' : type === 'video' ? 'video' : type === 'audio' ? 'audio' : null;\n    if (!kind) continue;\n    const durationFrames = Number.isFinite(node.durationSeconds) ? Math.round(node.durationSeconds * 60) : null;\n    const common = { resourceId: node.resourceId, name: node.name, path: node.path, durationFrames };\n    if (kind === 'audio') audio.push(common);\n    else if (kind === 'image' || (node.frameSize?.width > 0 && node.frameSize?.height > 0)) {\n      media.push({ ...common, kind, width: node.frameSize?.width ?? null, height: node.frameSize?.height ?? null });\n    }\n    seen.add(node.resourceId);\n  }\n  const unavailable = resources.filter((resource) =>\n    ['image', 'video', 'audio'].includes(String(resource.type).toLowerCase()) &&\n    !media.some((item) => item.resourceId === resource.resourceId) &&\n    !audio.some((item) => item.resourceId === resource.resourceId));\n  return { media, audio, unavailable: unavailable.map((item) => ({ resourceId: item.resourceId, name: item.name })) };\n}\n\nfunction galleryGeometry(tile, source, colorFrame) {\n  const { left, right, top, bottom } = tile.rect;\n  const width = right - left, height = bottom - top;\n  const q = Math.min(source.width / width, source.height / height);\n  const frameWidth = width * q, frameHeight = height * q;\n  const conform = Math.min(1080 / source.width, 1920 / source.height);\n  return {\n    effect: {\n      sourceWidth: source.width, sourceHeight: source.height,\n      frameWidth, frameHeight,\n      cropLeft: (source.width - frameWidth) / 2,\n      cropTop: (source.height - frameHeight) / 2,\n      focusX: tile.focusX, focusY: tile.focusY,\n      colorAfterLocalFrame: colorFrame - tile.revealFrame,\n    },\n    transform: {\n      position: { x: (((left + right) / 2) - 540) / 1920 * 100, y: (960 - (top + bottom) / 2) / 1920 * 100 },\n      scale: { x: 1 / (q * conform), y: 1 / (q * conform) },\n    },\n  };\n}\n\nfunction assertGalleryInput(input) {\n  if (!input || typeof input !== 'object' || Array.isArray(input)) galleryFail('Gallery input is required');\n  if (typeof input.projectId !== 'string' || !input.projectId) galleryFail('Select a Project');\n  if (!['inspect', 'importConverted', 'create', 'preflight', 'createBase', 'fillBase', 'placeVideosExisting', 'styleExisting', 'verifyCreated'].includes(input.operation)) galleryFail('Unknown gallery action');\n  if (['create', 'preflight', 'createBase', 'placeVideosExisting', 'styleExisting'].includes(input.operation) && (!Array.isArray(input.media) || input.media.length !== 21)) galleryFail('Select exactly 21 visual slots');\n  return input;\n}\n\nasync function galleryImportConverted(selects, project, input, inventory, onImportStarted) {\n  const requiredFrames = input.durationFrames ?? 853;\n  if (!Number.isSafeInteger(requiredFrames) || requiredFrames < 1 || requiredFrames > 36000) {\n    galleryFail('Held video duration must be an integer from 1 to 36000 frames');\n  }\n  if (!Array.isArray(input.converted) || input.converted.length < 1 || input.converted.length > 21) {\n    galleryFail('Provide one to 21 held video files');\n  }\n  const seenSources = new Set();\n  for (const item of input.converted) {\n    const source = galleryResolveResource(inventory.media, item?.sourceResourceId, item?.sourcePath, 'Selected source');\n    if (source.kind !== 'video' || seenSources.has(source.resourceId) ||\n        typeof item.path !== 'string' || !/^\\/(?:[^\\0]+)\\.mp4$/i.test(item.path)) {\n      galleryFail('A held clip must match one distinct Project video and absolute MP4 path');\n    }\n    seenSources.add(source.resourceId);\n  }\n  const paths = [...new Set(input.converted.map((item) => item.path))];\n  const probe = await selects.media.probe({ filePaths: paths });\n  const probed = new Set((probe.files || []).filter((file) => !file.type || /video/i.test(file.type)).map((file) => file.path));\n  if (probe.error || probe.errors?.length || probe.summary?.failed || paths.some((path) => !probed.has(path))) {\n    galleryFail('A held video file is missing or unreadable; no Project media was imported');\n  }\n  const currentByPath = new Map();\n  for (const item of inventory.media) if (item.kind === 'video') currentByPath.set(item.path, item);\n  const missing = paths.filter((path) => !currentByPath.has(path));\n  if (missing.length) {\n    if (typeof project.importFiles !== 'function') galleryFail('This Selects version cannot import held videos');\n    onImportStarted();\n    await project.importFiles({ paths: missing });\n  }\n  const fresh = missing.length ? await galleryInventory(project) : inventory;\n  const importedByPath = new Map();\n  for (const item of fresh.media) if (item.kind === 'video') importedByPath.set(item.path, item);\n  const converted = input.converted.map((item) => {\n    const video = importedByPath.get(item.path);\n    if (!video || video.durationFrames == null || video.durationFrames < requiredFrames) {\n      galleryFail('Held video import or length could not be verified; inspect Project files before retrying');\n    }\n    const source = galleryResolveResource(fresh.media, item.sourceResourceId, item.sourcePath, 'Selected source');\n    return { sourceResourceId: item.sourceResourceId, resolvedSourceResourceId: source?.resourceId,\n      resourceId: video.resourceId,\n      path: item.path, width: video.width, height: video.height, durationFrames: video.durationFrames };\n  });\n  return { status: 'prepared', converted };\n}\n\nasync function galleryPreflight(selects, project, input, inventory) {\n  const chosen = input.media.map((item, i) => {\n    const fresh = galleryResolveResource(inventory.media, item.resourceId, item.path, `Slot ${i + 1}`);\n    const width = fresh.width ?? item.width, height = fresh.height ?? item.height;\n    if (!Number.isSafeInteger(width) || width < 1 || !Number.isSafeInteger(height) || height < 1) {\n      galleryFail(`Slot ${i + 1} photo dimensions are unavailable through the plugin SDK; no Draft was saved`);\n    }\n    if ((item.width != null && fresh.width != null && fresh.width !== item.width) ||\n        (item.height != null && fresh.height != null && fresh.height !== item.height)) {\n      galleryFail(`Slot ${i + 1} dimensions changed`);\n    }\n    return { ...fresh, width, height, focusX: item.focusX, focusY: item.focusY };\n  });\n  const music = input.music == null ? null :\n    galleryResolveResource(inventory.audio, input.music.resourceId, input.music.path, 'Music');\n  if (input.music != null && !music) galleryFail('Selected music is missing or moved');\n  const selectedMusic = music && { ...music, startFrame: input.music.startFrame ?? 0 };\n  const plan = planGallery({ media: chosen, music: selectedMusic, manualBpm: input.manualBpm, estimatedBpm: input.estimatedBpm, durationFrames: input.durationFrames });\n  const paths = [...new Set([...chosen.map((item) => item.path), ...(music ? [music.path] : [])])];\n  const probe = await selects.media.probe({ filePaths: paths });\n  const confirmed = new Set((probe.files || []).map((file) => file.path));\n  if (probe.error || (probe.errors || []).length || (probe.summary?.failed || 0) || paths.some((path) => !confirmed.has(path))) {\n    galleryFail('A selected media file is missing, unreadable, or corrupt; no Draft was saved');\n  }\n  const meta = await project.meta();\n  if (!Array.isArray(meta.draftIds)) galleryFail('Project Draft list is unavailable');\n  return { plan, chosen, music: selectedMusic };\n}\n\nasync function galleryCreate(selects, project, input, inventory, onCommitStarted) {\n  const { plan, chosen, music } = await galleryPreflight(selects, project, input, inventory);\n  const name = typeof input.name === 'string' && input.name.trim() ? input.name.trim() : 'Photo Gallery';\n  const draft = await project.createDraft({ name });\n  if ((await draft.meta()).fps !== 60) galleryFail('This Project is not 60 fps; no Draft was saved');\n  await draft.insertGap({ seconds: plan.durationFrames / plan.fps });\n  await draft.setFrameSize(plan.frameSize);\n  const prepared = await draft.meta();\n  if (prepared.fps !== plan.fps || prepared.durationFrames !== plan.durationFrames ||\n      prepared.frameSize?.width !== plan.frameSize.width || prepared.frameSize?.height !== plan.frameSize.height) {\n    galleryFail('The working Draft does not match the requested 60 fps, canvas, and duration; no Draft was saved');\n  }\n  let knownClipIds = new Set((await draft.clips({ trackScope: 'all' })).map((row) => row.clipId));\n  for (let i = 0; i < plan.tiles.length; i++) {\n    const tile = plan.tiles[i], source = chosen[i];\n    try {\n      await draft.overlayResource({ resource: project.resource(tile.resourceId), over: await draft.rangeAtFrames(tile.revealFrame, tile.endFrame) });\n    } catch (error) {\n      if (source.kind === 'image' && /not a Video\\/Audio asset/i.test(String(error?.message || error))) {\n        galleryFail('The plugin SDK cannot place original Image Resources on video tracks, although the editor can; no Draft was saved');\n      }\n      throw error;\n    }\n    const after = await draft.clips({ trackScope: 'all' });\n    const added = after.filter((row) => !knownClipIds.has(row.clipId) && row.resourceId === tile.resourceId && row.startFrame === tile.revealFrame && row.endFrame === tile.endFrame);\n    if (added.length !== 1) galleryFail(`Could not identify tile ${i + 1} after placement; no Draft was saved`);\n    const clip = added[0];\n    const geometry = galleryGeometry(tile, source, plan.colorFrame);\n    await draft.addVideoEffect({\n      clip, label: `Gallery ${tile.slotKey} color-${plan.colorFrame}`,\n      tsxCode: TILE_EFFECT,\n      parameters: geometry.effect,\n      editableParameters: [\n        { key: 'focusX', label: 'Horizontal focus', type: 'number', defaultValue: 0.5, min: 0, max: 1, step: 0.01 },\n        { key: 'focusY', label: 'Vertical focus', type: 'number', defaultValue: 0.5, min: 0, max: 1, step: 0.01 },\n      ],\n    });\n    const freshClip = (await draft.clips({ trackScope: 'all' })).find((row) => row.clipId === clip.clipId);\n    if (!freshClip) galleryFail(`Tile ${i + 1} disappeared before placement was complete`);\n    await draft.setClipTransform({ clip: freshClip, position: geometry.transform.position, scale: geometry.transform.scale });\n    const finalRows = await draft.clips({ trackScope: 'all' });\n    const finalClip = finalRows.find((row) => row.clipId === clip.clipId);\n    if (!finalClip) galleryFail(`Tile ${i + 1} disappeared after transform`);\n    knownClipIds = new Set(finalRows.map((row) => row.clipId));\n  }\n  if (music) await draft.overlayResource({ resource: project.resource(music.resourceId), over: await draft.rangeAtFrames(0, plan.durationFrames), sourceStartSeconds: music.startFrame / plan.fps });\n  const rows = await draft.clips({ trackScope: 'all' });\n  if (rows.some((row) => row.trackKind === 'main' && row.resourceId)) galleryFail('The working Draft has an unexpected Main Resource');\n  if (rows.filter((row) => row.trackKind === 'video' && row.resourceId != null).length !== 21) galleryFail('The working Draft does not contain all 21 editable tiles');\n  onCommitStarted();\n  const saved = await draft.commitAll('Create editable 21-tile Photo Gallery');\n  if (!saved?.createdDraftId) galleryFail('Save outcome is unknown; inspect Project Drafts before retrying');\n  return { status: 'saved', draftId: saved.createdDraftId, tileCount: 21, durationFrames: plan.durationFrames, colorFrame: plan.colorFrame };\n}\n\nasync function galleryCreateBase(project, input, onCommitStarted) {\n  const name = typeof input.name === 'string' && input.name.trim() ? input.name.trim() : 'Photo Gallery';\n  const draft = await project.createDraft({ name });\n  await draft.setFrameSize({ width: 1080, height: 1920 });\n  onCommitStarted();\n  const saved = await draft.commitAll('Create empty Photo Gallery Draft');\n  if (!saved?.createdDraftId) galleryFail('Empty Draft save outcome is unknown');\n  return { status: 'baseCreated', draftId: saved.createdDraftId };\n}\n\nasync function galleryFillBase(selects, project, input, onCommitStarted) {\n  if (typeof input.draftId !== 'string' || !(await project.meta()).draftIds?.includes(input.draftId)) {\n    galleryFail('Target Draft does not belong to this Project');\n  }\n  if (!Number.isSafeInteger(input.durationFrames) || input.durationFrames < 1) galleryFail('Invalid Gallery duration');\n  const draft = selects.draft(input.draftId);\n  const meta = await draft.meta();\n  if (meta.fps !== 60 || meta.durationFrames !== 0 || meta.frameSize?.width !== 1080 || meta.frameSize?.height !== 1920) {\n    galleryFail('Target Draft must be an empty 60 fps portrait Draft');\n  }\n  await draft.insertGap({ seconds: input.durationFrames / 60 });\n  if ((await draft.meta()).durationFrames !== input.durationFrames) galleryFail('Could not author exact Gallery duration');\n  onCommitStarted();\n  const saved = await draft.commitAll('Set Photo Gallery duration');\n  if (!saved?.commitId) galleryFail('Duration save outcome is unknown');\n  return { status: 'baseFilled', draftId: input.draftId, durationFrames: input.durationFrames };\n}\n\nasync function galleryPlaceVideosExisting(selects, project, input, inventory, onCommitStarted) {\n  if (typeof input.draftId !== 'string' || !(await project.meta()).draftIds?.includes(input.draftId)) {\n    galleryFail('Target Draft does not belong to this Project');\n  }\n  const { plan } = await galleryPreflight(selects, project, input, inventory);\n  const videos = plan.tiles.filter(tile => tile.kind === 'video');\n  if (!videos.length) return { status: 'videosPlaced', draftId: input.draftId, tileCount: 0 };\n  const draft = selects.draft(input.draftId);\n  const meta = await draft.meta();\n  if (meta.fps !== 60 || meta.durationFrames !== plan.durationFrames ||\n      meta.frameSize?.width !== 1080 || meta.frameSize?.height !== 1920) {\n    galleryFail('Target Draft clock, canvas, or duration changed');\n  }\n  const rows = await draft.clips({ trackScope: 'all' });\n  const existing = rows.filter(row => row.trackKind === 'video' && row.resourceId);\n  const imageTiles = plan.tiles.filter(tile => tile.kind === 'image');\n  if (existing.length !== imageTiles.length ||\n      rows.some(row => row.trackKind === 'audio' && row.resourceId) ||\n      rows.some(row => row.trackKind === 'main' && row.resourceId)) galleryFail('Target Draft has unexpected media');\n  const used = new Set();\n  for (const tile of imageTiles) {\n    const matches = existing.filter(row => row.resourceId === tile.resourceId &&\n      row.startFrame === tile.revealFrame && row.endFrame === tile.endFrame && !used.has(row.clipId));\n    if (matches.length !== 1) galleryFail(`Image ${tile.slotKey} changed before video placement`);\n    used.add(matches[0].clipId);\n  }\n  for (const tile of videos) {\n    const resource = project.resource(tile.resourceId);\n    const overlay = async (startFrame) => {\n      const before = new Set((await draft.clips({ trackScope: 'all' })).map(row => row.clipId));\n      await draft.overlayResource({ resource, over: await draft.rangeAtFrames(startFrame, tile.endFrame) });\n      const rows = (await draft.clips({ trackScope: 'all' })).filter(row => !before.has(row.clipId));\n      const visual = rows.filter(row => row.trackKind === 'video' && row.resourceId === tile.resourceId);\n      if (visual.length !== 1 || visual[0].startFrame !== startFrame) galleryFail(`Video ${tile.slotKey} did not create one independent clip`);\n      const sourceAudio = rows.filter(row => row.trackKind === 'audio' && row.resourceId);\n      if (sourceAudio.length) await draft.removeClips(sourceAudio);\n      return visual[0];\n    };\n    let clip = await overlay(tile.revealFrame);\n    if (clip.endFrame < tile.endFrame) {\n      // The SDK may quantize a seconds-based overlay one frame short at some\n      // 60 fps start positions. Re-place with enough source time, then use the\n      // public clip move and trim operations to get exact frame boundaries.\n      await draft.removeClips([clip]);\n      if (tile.revealFrame < 1) galleryFail(`Video ${tile.slotKey} cannot cover the output end`);\n      clip = await overlay(tile.revealFrame - 1);\n      const moved = await draft.moveOverlayClip({ clip, startFrame: tile.revealFrame });\n      const matches = (await draft.clips({ trackScope: 'all' })).filter(row => row.clipId === moved.clipId);\n      if (matches.length !== 1) galleryFail(`Video ${tile.slotKey} moved clip could not be read back`);\n      clip = matches[0];\n    }\n    if (clip.endFrame > tile.endFrame) {\n      await draft.remove(await draft.rangeAtFrames(tile.endFrame, clip.endFrame), { tracks: [clip.trackId] });\n    }\n    const exact = (await draft.clips({ trackScope: 'all' })).filter(row => row.clipId === clip.clipId &&\n      row.trackKind === 'video' && row.resourceId === tile.resourceId &&\n      row.startFrame === tile.revealFrame && row.endFrame === tile.endFrame);\n    if (exact.length !== 1) galleryFail(`Video ${tile.slotKey} could not reach its exact reveal and end frames`);\n    if ((await draft.clips({ trackScope: 'all' })).some(row => row.trackKind === 'audio' && row.resourceId)) {\n      galleryFail(`Video ${tile.slotKey} retained source audio`);\n    }\n  }\n  onCommitStarted();\n  const saved = await draft.commitAll('Place Photo Gallery video tiles');\n  if (!saved?.commitId) galleryFail('Video placement save outcome is unknown');\n  return { status: 'videosPlaced', draftId: input.draftId, tileCount: videos.length };\n}\n\nasync function galleryStyleExisting(selects, project, input, inventory, onCommitStarted) {\n  if (typeof input.draftId !== 'string' || !input.draftId) galleryFail('An explicit target Draft is required');\n  const projectMeta = await project.meta();\n  if (!projectMeta.draftIds?.includes(input.draftId)) galleryFail('Target Draft does not belong to this Project');\n  const chosen = input.media.map((item, i) => {\n    const fresh = galleryResolveResource(inventory.media, item.resourceId, item.path, `Slot ${i + 1}`);\n    if (fresh.kind !== item.kind) galleryFail(`Slot ${i + 1} Resource type changed`);\n    const width = fresh.width ?? item.width, height = fresh.height ?? item.height;\n    if (!Number.isSafeInteger(width) || width < 1 || !Number.isSafeInteger(height) || height < 1) {\n      galleryFail(`Slot ${i + 1} photo dimensions are unavailable`);\n    }\n    if (fresh.width != null && fresh.width !== item.width || fresh.height != null && fresh.height !== item.height) {\n      galleryFail(`Slot ${i + 1} photo dimensions changed`);\n    }\n    return { ...fresh, width, height, focusX: item.focusX, focusY: item.focusY };\n  });\n  const music = input.music == null ? null : galleryResolveResource(inventory.audio, input.music.resourceId, input.music.path, 'Music');\n  const plan = planGallery({ media: chosen, music: music ? { ...music, startFrame: input.music.startFrame ?? 0 } : null, manualBpm: input.manualBpm,\n    estimatedBpm: input.estimatedBpm, durationFrames: input.durationFrames });\n  const draft = selects.draft(input.draftId);\n  const meta = await draft.meta();\n  if (meta.fps !== plan.fps || meta.durationFrames !== plan.durationFrames ||\n      meta.frameSize?.width !== plan.frameSize.width || meta.frameSize?.height !== plan.frameSize.height) {\n    galleryFail('Target Draft clock, canvas, or duration does not match the Gallery plan');\n  }\n  const allRows = await draft.clips({ trackScope: 'all' });\n  if (allRows.some((row) => row.trackKind === 'main' && row.resourceId)) galleryFail('Target Draft Main track is not blank');\n  if (allRows.some((row) => row.trackKind === 'audio' && row.resourceId)) galleryFail('Target Draft has unexpected source audio');\n  const rows = allRows.filter((row) => row.trackKind === 'video' && row.resourceId);\n  if (rows.length !== 21 || new Set(rows.map((row) => row.trackId)).size !== 21) {\n    galleryFail('Target Draft must contain exactly 21 independent visual tracks');\n  }\n  const used = new Set(), targets = [];\n  for (let i = 0; i < 21; i++) {\n    const tile = plan.tiles[i];\n    const matches = rows.filter((row) => row.resourceId === tile.resourceId &&\n      row.startFrame === tile.revealFrame && row.endFrame === tile.endFrame && !used.has(row.clipId));\n    if (matches.length !== 1) galleryFail(`Target tile ${tile.slotKey} does not match the selected Resource and frames`);\n    const clip = matches[0];\n    if ((await draft.videoEffects(clip)).length) galleryFail(`Target tile ${tile.slotKey} already has effects; inspect it before retrying`);\n    const transform = await draft.clipTransform(clip);\n    const identity = !transform || !transform.enabled ||\n      (transform.position?.x === 0 && transform.position?.y === 0 &&\n       transform.scale?.x === 1 && transform.scale?.y === 1 &&\n       transform.rotation === 0 && transform.anchor?.x === 0 && transform.anchor?.y === 0);\n    if (!identity) galleryFail(`Target tile ${tile.slotKey} already has a manual transform; inspect it before retrying`);\n    used.add(clip.clipId);\n    targets.push(clip);\n  }\n  for (let i = 0; i < 21; i++) {\n    const tile = plan.tiles[i];\n    const geometry = galleryGeometry(tile, chosen[i], plan.colorFrame);\n    const current = (await draft.clips({ trackScope: 'all' })).find((row) => row.clipId === targets[i].clipId);\n    if (!current) galleryFail(`Target tile ${tile.slotKey} disappeared before styling`);\n    await draft.addVideoEffect({ clip: current, label: `Gallery ${tile.slotKey} color-${plan.colorFrame}`,\n      tsxCode: TILE_EFFECT, parameters: geometry.effect,\n      editableParameters: [\n        { key: 'focusX', label: 'Horizontal focus', type: 'number', defaultValue: 0.5, min: 0, max: 1, step: 0.01 },\n        { key: 'focusY', label: 'Vertical focus', type: 'number', defaultValue: 0.5, min: 0, max: 1, step: 0.01 },\n      ] });\n    const fresh = (await draft.clips({ trackScope: 'all' })).find((row) => row.clipId === targets[i].clipId);\n    if (!fresh) galleryFail(`Target tile ${tile.slotKey} disappeared during styling`);\n    await draft.setClipTransform({ clip: fresh, position: geometry.transform.position, scale: geometry.transform.scale });\n  }\n  if (plan.music) await draft.overlayResource({ resource: project.resource(plan.music.resourceId),\n    over: await draft.rangeAtFrames(0, plan.durationFrames), sourceStartSeconds: plan.music.startFrame / plan.fps });\n  onCommitStarted();\n  const saved = await draft.commitAll('Style 21 original Image tiles as the Photo Gallery');\n  if (!saved?.commitId) galleryFail('Style save outcome is unknown; inspect the Draft before retrying');\n  return { status: 'styled', draftId: input.draftId, tileCount: 21, durationFrames: plan.durationFrames,\n    colorFrame: plan.colorFrame };\n}\n\nasync function galleryVerifyCreated(selects, project, input, inventory) {\n  if (typeof input.draftId !== 'string' || !input.draftId) galleryFail('The saved Draft ID is required for readback');\n  const { plan, chosen } = await galleryPreflight(selects, project, input, inventory);\n  const projectMeta = await project.meta();\n  if (!projectMeta.draftIds?.includes(input.draftId)) galleryFail('The saved Draft does not belong to this Project');\n  const draft = selects.draft(input.draftId);\n  const meta = await draft.meta();\n  if (meta.fps !== 60 || meta.durationFrames !== plan.durationFrames ||\n      meta.frameSize?.width !== 1080 || meta.frameSize?.height !== 1920) {\n    galleryFail('Saved Draft canvas, frame rate, or duration does not match the request');\n  }\n  const allRows = await draft.clips({ trackScope: 'all' });\n  if (allRows.some((row) => row.trackKind === 'main' && row.resourceId)) galleryFail('Saved Draft has an unexpected Main Resource');\n  const rows = allRows.filter((row) => row.trackKind === 'video' && row.resourceId);\n  if (rows.length !== 21) galleryFail('Saved Draft does not contain exactly 21 independent visual clips');\n  const audioRows = allRows.filter((row) => row.trackKind === 'audio' && row.resourceId);\n  if (plan.music) {\n    if (audioRows.length !== 1 || audioRows[0].resourceId !== plan.music.resourceId ||\n        audioRows[0].startFrame !== 0 || audioRows[0].endFrame !== plan.durationFrames) {\n      galleryFail('Saved Draft music does not match the requested Resource and duration');\n    }\n  } else if (audioRows.length) galleryFail('Saved Draft has unexpected music');\n  const usedClipIds = new Set();\n  for (let tileIndex = 0; tileIndex < plan.tiles.length; tileIndex++) {\n    const tile = plan.tiles[tileIndex];\n    const matches = rows.filter((row) => row.resourceId === tile.resourceId &&\n      row.startFrame === tile.revealFrame && row.endFrame === tile.endFrame && !usedClipIds.has(row.clipId));\n    if (matches.length !== 1) galleryFail(`Saved tile ${tile.slotKey} does not match its requested Resource and frames`);\n    const clip = matches[0];\n    const effects = await draft.videoEffects(clip);\n    if (effects.filter((effect) => effect.name === `Gallery ${tile.slotKey} color-${plan.colorFrame}` && effect.enabled !== false).length !== 1) {\n      galleryFail(`Saved tile ${tile.slotKey} has no matching color-transition effect`);\n    }\n    const actual = await draft.clipTransform(clip);\n    const expected = galleryGeometry(tile, chosen[tileIndex], plan.colorFrame).transform;\n    const close = (left, right) => typeof left === 'number' && Number.isFinite(left) && Math.abs(left - right) <= 1e-5;\n    if (!actual?.enabled || !close(actual.position?.x, expected.position.x) ||\n        !close(actual.position?.y, expected.position.y) ||\n        !close(actual.scale?.x, expected.scale.x) || !close(actual.scale?.y, expected.scale.y)) {\n      galleryFail(`Saved tile ${tile.slotKey} position or crop transform does not match the requested grid`);\n    }\n    usedClipIds.add(clip.clipId);\n  }\n  return { status: 'verified', draftId: input.draftId, tileCount: 21, durationFrames: plan.durationFrames,\n    colorFrame: plan.colorFrame, structuralOnly: true };\n}\n\nasync function galleryOperation(selects, raw) {\n  let commitStarted = false;\n  try {\n    const input = assertGalleryInput(raw);\n    const project = selects.project(input.projectId);\n    const inventory = await galleryInventory(project);\n    if (input.operation === 'inspect') return { status: 'inspected', projectId: input.projectId, ...inventory };\n    if (input.operation === 'importConverted') return await galleryImportConverted(selects, project, input, inventory, () => { commitStarted = true; });\n    if (input.operation === 'create') return await galleryCreate(selects, project, input, inventory, () => { commitStarted = true; });\n    if (input.operation === 'preflight') {\n      const { plan } = await galleryPreflight(selects, project, input, inventory);\n      return { status: 'ready', plan };\n    }\n    if (input.operation === 'createBase') return await galleryCreateBase(project, input, () => { commitStarted = true; });\n    if (input.operation === 'fillBase') return await galleryFillBase(selects, project, input, () => { commitStarted = true; });\n    if (input.operation === 'placeVideosExisting') return await galleryPlaceVideosExisting(selects, project, input, inventory, () => { commitStarted = true; });\n    if (input.operation === 'styleExisting') return await galleryStyleExisting(selects, project, input, inventory, () => { commitStarted = true; });\n    if (input.operation === 'verifyCreated') return await galleryVerifyCreated(selects, project, input, inventory);\n    galleryFail('Unknown gallery action');\n  } catch (error) {\n    return { status: commitStarted ? 'outcomeUnknown' : 'notSaved', message: String(error?.message || error) };\n  }\n}\n\nreturn await galleryOperation(selects, ";
const buildScript = input => SCRIPT_PREFIX + JSON.stringify(input) + ');';
// Panel-only adapter to the editor's own timeline mutation service. The
// public plugin SDK currently refuses Image Resources in overlayResource.
async function galleryNativeContext(projectId) {
  const app = window.parent;
  const match = app.location.pathname.match(/libraries\/([^/]+)\/projects\/([^/]+)/);
  if (!match || match[2] !== projectId) throw new Error('The open Project changed; reload its media');
  const di = app.__DI__;
  if (typeof di?.TimelineMutation?.run !== 'function' ||
      typeof di?.ProjectRepository?.findById !== 'function' ||
      typeof di?.ResourceRepository?.findById !== 'function' ||
      typeof di?.SequenceRepository?.findById !== 'function') {
    throw new Error('This Selects build does not expose native Image placement to plugins');
  }
  const project = await di.ProjectRepository.findById(match[1], projectId);
  if (!project) throw new Error('The open Project was not found');
  return { di, libraryId: match[1], project };
}

async function galleryNativeResources(projectId, media) {
  const ctx = await galleryNativeContext(projectId);
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

async function galleryNativeSetFps(projectId, draftId) {
  const ctx = await galleryNativeContext(projectId);
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

async function galleryNativePlace(projectId, draftId, media, plan) {
  const imageTiles = plan.tiles.map((tile, i) => ({ tile, media: media[i], index: i })).filter(item => item.tile.kind === 'image');
  if (!imageTiles.length) return;
  const ctx = await galleryNativeResources(projectId, imageTiles.map(item => item.media));
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


const SLOT_KEYS = Array.from({ length: 21 }, (_, i) => `tile-${String(i + 1).padStart(2, '0')}`);
const REFERENCE_VIDEO_SLOTS = new Set([4, 6, 11, 17, 19, 21]);
const emptySlots = () => SLOT_KEYS.map(() => ({ resourceId: '', focusX: 0.5, focusY: 0.5 }));
const shellQuote = value => "'" + String(value).replace(/'/g, "'\"'\"'") + "'";
const STRINGS = {
  ko: {
    title: '\ud3ec\ud1a0 \uac24\ub7ec\ub9ac 21\uce78', description: '3\uc5f4 × 7\ud589\uc774 \ucc28\ub840\ub85c \ucc44\uc6cc\uc9c0\uace0 \uc804\uccb4\uac00 \ud751\ubc31\uc5d0\uc11c \uceec\ub7ec\ub85c \ubc14\ub01d\ub2c8\ub2e4. \uc0c8 \ud3b8\uc9d1\ubcf8\uc758 21\uce78\uc5d0 \uc0ac\uc9c4\uacfc \uc601\uc0c1\uc744 \uac01\uac01 \uc9c0\uc815\ud569\ub2c8\ub2e4.',
    noProject: '\uba3c\uc800 \ud504\ub85c\uc81d\ud2b8\ub97c \uc5ec\uc138\uc694.', load: '\ud504\ub85c\uc81d\ud2b8 \ubbf8\ub514\uc5b4 \ubd88\ub7ec\uc624\uae30', changed: '\ud504\ub85c\uc81d\ud2b8 \ub610\ub294 \ud3b8\uc9d1\ubcf8\uc774 \ubc14\ub00c\uc5c8\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \ubd88\ub7ec\uc624\uc138\uc694.',
    createMode: '\uc0c8 \ud3b8\uc9d1\ubcf8',
    slot: '\uce78', media: '\uc0ac\uc9c4 \ub610\ub294 \uc601\uc0c1', choose: '\ubbf8\ub514\uc5b4 \uc120\ud0dd', noMedia: '\ud504\ub85c\uc81d\ud2b8\uc5d0 \uc0ac\uc9c4 \ub610\ub294 \uc601\uc0c1\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.',
    assigned: '\uc9c0\uc815\ud55c \uce78', fill: '21\uac1c\ub97c \ubaa9\ub85d \uc21c\uc11c\ub85c \uc9c0\uc815', fillHint: '\uc0ac\uc9c4 21\uac1c\uac00 \uc788\uc73c\uba74 \uc0ac\uc9c4\uc744 \uc6b0\uc120\ud569\ub2c8\ub2e4. \uac19\uc740 \ubbf8\ub514\uc5b4\ub97c \uc5ec\ub7ec \uce78\uc5d0 \uc4f0\ub824\uba74 \uac01 \uce78\uc5d0\uc11c \uc9c1\uc811 \uace0\ub974\uc138\uc694.',
    referenceMix: '\uc6d0\ubcf8 \uc6c0\uc9c1\uc784 \uad6c\uc131\uc73c\ub85c \uc9c0\uc815 (\uc0ac\uc9c4 15 + \uc601\uc0c1 6)',
    motionMissing: '\uc6d0\ubcf8\uc5d0\uc11c\ub294 \ub2e4\uc74c \uce78\uc774 \uc6c0\uc9c1\uc785\ub2c8\ub2e4. \ud604\uc7ac \uc0ac\uc9c4\uc73c\ub85c \uc9c0\uc815\ub41c \uce78: ',
    focusX: '\uac00\ub85c \ucd08\uc810', focusY: '\uc138\ub85c \ucd08\uc810',
    editLimits: "\uc0dd\uc131\ub41c 21\uce78\uc740 Selects \ud0c0\uc784\ub77c\uc778\uc5d0\uc11c \uac01\uac01 \ud3b8\uc9d1\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4. \ud50c\ub7ec\uadf8\uc778\uc758 \uae30\uc874 \ud3b8\uc9d1\ubcf8 \ud55c \uce78\ub9cc \ubc14\uafb8\uae30\ub294 \uc544\uc9c1 \uc9c0\uc6d0\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.",
    music: '\uc74c\uc545', noMusic: '\uc74c\uc545 \uc5c6\uc74c',
    bpmManual: 'BPM \uc9c1\uc811 \uc9c0\uc815', bpm: 'BPM', estimate: '\uc74c\uc545 BPM \ucd94\uc815', estimated: '\ucd94\uc815 BPM', uncertain: 'BPM\uc744 \ud655\uc2e4\ud788 \ucd94\uc815\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. \uc9c1\uc811 \uc785\ub825\ud574 \uc8fc\uc138\uc694.',
    duration: '\uc601\uc0c1 \uae38\uc774', durationNote: '\uae30\ubcf8 14.217\ucd08 · 60fps. \uc74c\uc545\uc744 \uace0\ub974\uba74 \uc774 \uae38\uc774\ub97c \ucc44\uc6b8 \uc218 \uc788\uc5b4\uc57c \ud569\ub2c8\ub2e4.',
    name: '\ud3b8\uc9d1\ubcf8 \uc774\ub984', create: '\uc0c8 \ud3b8\uc9d1\ubcf8 \ub9cc\ub4e4\uae30',
    busy: '\ucc98\ub9ac \uc911\u2026', missing: '21\uac1c \uce78\uc5d0 \ubbf8\ub514\uc5b4\ub97c \uc815\ud655\ud788 \uc9c0\uc815\ud574 \uc8fc\uc138\uc694.', bpmMissing: '\uc74c\uc545\uc744 \uc120\ud0dd\ud558\uac70\ub098 BPM\uc744 \uc9c1\uc811 \uc785\ub825\ud574 \uc8fc\uc138\uc694.',
    saved: '\uc800\uc7a5\ud588\uc2b5\ub2c8\ub2e4. \uc2e4\uc81c \uc7ac\uc0dd\uacfc \ub0b4\ubcf4\ub0b4\uae30\ub294 \ubcc4\ub3c4\ub85c \ud655\uc778\ud574 \uc8fc\uc138\uc694.', readback: '\uc800\uc7a5 \ud6c4 \ud3b8\uc9d1\ubcf8\uc758 21\uce78\uc744 \ub2e4\uc2dc \ud655\uc778\ud588\uc2b5\ub2c8\ub2e4. \uc7ac\uc0dd\uacfc \ub0b4\ubcf4\ub0b4\uae30\ub294 \ubcc4\ub3c4 \uac80\uc99d\uc774 \ud544\uc694\ud569\ub2c8\ub2e4.',
    readbackMismatch: '\uc800\uc7a5 \ud6c4 \uc694\uccad\ud55c \uce78 \uac12\uc744 \ud655\uc778\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. \ub3d9\uc77c\ud55c \uc791\uc5c5\uc744 \ubc18\ubcf5\ud558\uc9c0 \ub9d0\uace0 \ud3b8\uc9d1\ubcf8\uc744 \ud655\uc778\ud574 \uc8fc\uc138\uc694.',
    failed: '\uc791\uc5c5\uc744 \ub9c8\uce58\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.', unknown: '\uc800\uc7a5 \uc5ec\ubd80\ub97c \ud655\uc778\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4. \uac19\uc740 \uc791\uc5c5\uc744 \ub2e4\uc2dc \uc2e4\ud589\ud558\uc9c0 \ub9d0\uace0 \ud3b8\uc9d1\ubcf8\uc744 \ud655\uc778\ud574 \uc8fc\uc138\uc694.',
  },
  en: {
    title: '21-tile photo gallery', description: 'A 3 × 7 gallery fills in order, then all tiles switch from monochrome to color. Assign a photo or video to each tile when creating a Draft.',
    noProject: 'Open a project first.', load: 'Load project media', changed: 'The project or Draft changed. Reload its media.',
    createMode: 'New Draft',
    slot: 'Tile', media: 'Photo or video', choose: 'Choose media', noMedia: 'No photos or videos in this project.',
    assigned: 'Assigned tiles', fill: 'Assign all 21 in listed order', fillHint: 'When there are 21 photos, they take priority. To reuse an item, choose it for each tile explicitly.',
    referenceMix: 'Assign reference mix', motionMissing: 'The reference moves in these tiles, which currently contain still photos: ',
    focusX: 'Horizontal focus', focusY: 'Vertical focus',
    editLimits: 'Each of the 21 tiles can be edited in the Selects timeline. Plugin-guided single-tile replacement is not yet available.',
    music: 'Music', noMusic: 'No music',
    bpmManual: 'Enter BPM manually', bpm: 'BPM', estimate: 'Estimate music BPM', estimated: 'Estimated BPM', uncertain: 'Could not estimate BPM reliably. Enter it manually.',
    duration: 'Video length', durationNote: 'Default 14.217 seconds at 60 fps. Music must cover this length.',
    name: 'Draft name', create: 'Create Draft',
    busy: 'Working\u2026', missing: 'Assign media to exactly 21 tiles.', bpmMissing: 'Select music or enter BPM manually.',
    saved: 'Saved. Check actual playback and export separately.', readback: 'Saved and read back all 21 tiles. Playback and export still need separate checks.',
    readbackMismatch: 'Saved, but the requested tile values were not verified. Inspect the Draft before repeating this action.',
    failed: 'Could not complete the action.', unknown: 'Save outcome is unknown. Inspect the Draft before repeating this action.',
  },
};

export default function Panel({ sdk, context, ui }) {
  const t = STRINGS[context.language] || STRINGS.en;
  const [inventory, setInventory] = React.useState(null);
  const [loadedKey, setLoadedKey] = React.useState('');
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
  const key = JSON.stringify([context.projectId, context.sequenceId]);
  const ready = loadedKey === key && !!inventory;
  const slotIndex = Number(selectedSlot);
  const slot = slots[slotIndex];
  const selectedMusic = inventory?.audio?.find(item => item.resourceId === musicChoice);
  const assigned = slots.filter(item => !!item.resourceId).length;
  const photos = inventory?.media?.filter(item => item.kind === 'image') || [];
  const videos = inventory?.media?.filter(item => item.kind === 'video') || [];
  const autoFillMedia = photos.length === 21 ? photos : inventory?.media?.length === 21 ? inventory.media : null;
  const canAssignReferenceMix = inventory?.media?.length === 21 && photos.length === 15 && videos.length === 6;
  const missingMotion = assigned === 21 ? [...REFERENCE_VIDEO_SLOTS].filter(number =>
    inventory.media.find(item => item.resourceId === slots[number - 1].resourceId)?.kind !== 'video') : [];
  const sameContext = (projectId, sequenceId) => current.current.projectId === projectId && current.current.sequenceId === sequenceId;

  React.useEffect(() => {
    setInventory(null); setLoadedKey(''); setSlots(emptySlots()); setMusicChoice('none');
    setEstimated(null); setUnknown(false); setSavedTarget(null); setStatus(null);
  }, [context.projectId, context.sequenceId]);

  function updateSlot(patch) {
    setSlots(previous => previous.map((item, i) => i === slotIndex ? { ...item, ...patch } : item));
  }

  async function load() {
    if (running.current || !context.projectId) return;
    const projectId = context.projectId, sequenceId = context.sequenceId, requestedKey = key;
    running.current = true; setBusy(true); setStatus(null);
    try {
      const input = { operation: 'inspect', projectId };
      const response = await sdk.runScript({ script: buildScript(input), summary: 'Inspect Photo Gallery project', allowCommit: false });
      if (response.isError || response.result?.status !== 'inspected' || !Array.isArray(response.result.media) || !Array.isArray(response.result.audio)) {
        throw new Error(response.result?.message || response.output || t.failed);
      }
      const native = await galleryNativeResources(projectId, response.result.media);
      if (!sameContext(projectId, sequenceId) || requestedKey !== key) { setStatus({ tone: 'error', text: t.changed }); return; }
      setInventory({ ...response.result, media: native.selected.map(({ nativeResource, ...item }) => item) }); setLoadedKey(requestedKey);
      setSlots(emptySlots()); setName('Photo Gallery'); setDurationFrames(853);
      setMusicChoice('none'); setManualEnabled(false); setManualBpm(113); setEstimated(null);
      setStatus(null);
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

  async function resolveBpm(audio) {
    if (manualEnabled) {
      if (!Number.isFinite(manualBpm) || manualBpm <= 0) throw new Error(t.bpmMissing);
      return { manualBpm };
    }
    if (audio) return { estimatedBpm: await estimateMusic(audio) };
    throw new Error(t.bpmMissing);
  }

  async function prepareVisuals(media, frames, projectId, onImportStarted, isCurrent) {
    const videos = [...new Map(media.filter(item => item.kind === 'video').map(item => [item.resourceId, item])).values()];
    if (videos.some(item => !Number.isSafeInteger(item.durationFrames) || item.durationFrames < 1)) {
      throw new Error('A selected video has no verified duration.');
    }
    const shortVideos = videos.filter(item => item.durationFrames < frames);
    const groups = [{ sources: shortVideos, key: 'videos', script: 'hold_video.py',
      summary: 'Extend only short gallery videos with their last frame' }];
    const requestPaths = [];
    for (const group of groups) {
      if (!group.sources.length) continue;
      if (group.sources.some(item => !item.path)) throw new Error('Selected Project media has no readable file path.');
      if (!isCurrent()) throw new Error(t.changed);
      const request = { [group.key]: group.sources.map(item => ({ path: item.path })), durationFrames: frames };
      const command = 'printf %s ' + shellQuote(JSON.stringify(request)) +
        ' | python3 "$SELECTS_USER_SKILLS_ROOT/photo-gallery-no2/' + group.script + '"';
      const shell = await sdk.runShell({ command, summary: group.summary,
        timeoutMs: 300000, maxOutputBytes: 49152 });
      let converted;
      try { converted = JSON.parse(shell.stdout); } catch { throw new Error(shell.stderr || shell.output || 'Media conversion produced no readable result.'); }
      const output = converted[group.key];
      if (shell.isError || shell.exitCode !== 0 || converted.status !== 'converted' || output?.length !== group.sources.length) {
        throw new Error(converted.message || shell.stderr || 'Media conversion failed.');
      }
      if (converted.fps !== 60 || converted.durationFrames !== frames || output.some((item, i) =>
        item.inputIndex !== i || item.sourcePath !== group.sources[i].path || typeof item.outputPath !== 'string')) {
        throw new Error('Media conversion result does not match the requested inputs.');
      }
      requestPaths.push(...group.sources.map((source, i) => ({ sourceResourceId: source.resourceId,
        sourcePath: source.path, path: output[i].outputPath })));
    }
    if (!requestPaths.length) return media;
    if (!isCurrent()) throw new Error(t.changed);
    const prepared = [];
    // Panel runScript has a fixed 30-second deadline. Keep persistent imports small.
    for (let start = 0; start < requestPaths.length; start += 3) {
      if (!isCurrent()) throw new Error(t.changed);
      const chunk = requestPaths.slice(start, start + 3);
      onImportStarted();
      const imported = await sdk.runScript({ script: buildScript({ operation: 'importConverted', projectId,
        converted: chunk, durationFrames: frames }), summary: 'Import independent Photo Gallery tile videos', allowCommit: true });
      if (imported.isError || imported.result?.status === 'outcomeUnknown' || !imported.result) throw new Error(t.unknown);
      if (imported.result.status === 'notSaved') {
        throw Object.assign(new Error(imported.result.message || 'Converted videos were not imported.'), { safeNotSaved: true });
      }
      if (imported.result.status !== 'prepared' || imported.result.converted?.length !== chunk.length) {
        throw new Error(imported.result.message || 'Converted videos could not be verified in the Project.');
      }
      prepared.push(...imported.result.converted);
    }
    const bySource = new Map(prepared.map(item => [item.sourceResourceId, item]));
    if (bySource.size !== requestPaths.length || requestPaths.some(item => !bySource.get(item.sourceResourceId)?.resourceId)) {
      throw new Error('Converted Project resources do not match the selected media.');
    }
    return media.map(item => bySource.has(item.resourceId)
      ? { ...bySource.get(item.resourceId), kind: 'video', focusX: item.focusX, focusY: item.focusY }
      : item);
  }

  async function createGallery() {
    if (running.current || unknown || !ready || !context.projectId) return;
    const projectId = context.projectId, sequenceId = context.sequenceId, requestedKey = key;
    let input;
    try {
      if (assigned !== 21) throw new Error(t.missing);
      input = { operation: 'create', projectId, name: name.trim(), durationFrames,
        media: slots.map(item => ({ ...inventory.media.find(media => media.resourceId === item.resourceId), focusX: item.focusX, focusY: item.focusY })),
        music: selectedMusic ? { resourceId: selectedMusic.resourceId, path: selectedMusic.path,
          durationFrames: selectedMusic.durationFrames, startFrame: 0 } : null };
      if (!input.name || input.media.some(item => !item.resourceId)) throw new Error(t.missing);
      if (input.media.some(item => !Number.isSafeInteger(item.width) || !Number.isSafeInteger(item.height))) throw new Error('A selected tile has no verified dimensions');
    } catch (error) { setStatus({ tone: 'error', text: String(error?.message || error) }); return; }
    running.current = true; setBusy(true); setStatus(null);
    let dispatched = false;
    try {
      Object.assign(input, await resolveBpm(selectedMusic));
      if (!sameContext(projectId, sequenceId) || requestedKey !== key) { setStatus({ tone: 'error', text: t.changed }); return; }
      input.media = await prepareVisuals(input.media, input.durationFrames, projectId,
        () => { dispatched = true; }, () => sameContext(projectId, sequenceId) && requestedKey === key);
      if (!sameContext(projectId, sequenceId) || requestedKey !== key) { setStatus({ tone: 'error', text: t.changed }); return; }
      input.media = (await galleryNativeResources(projectId, input.media)).selected.map(({ nativeResource, ...item }) => item);
      const preflight = await sdk.runScript({ script: buildScript({ ...input, operation: 'preflight' }),
        summary: 'Check Photo Gallery media and timing', allowCommit: false });
      if (preflight.isError || preflight.result?.status !== 'ready') throw Object.assign(
        new Error(preflight.result?.message || preflight.output || t.failed), { safeNotSaved: true });
      const plan = preflight.result.plan;
      if (!sameContext(projectId, sequenceId) || requestedKey !== key) throw Object.assign(new Error(t.changed), { safeNotSaved: true });
      dispatched = true;
      const base = await sdk.runScript({ script: buildScript({ ...input, operation: 'createBase' }),
        summary: 'Create Photo Gallery Draft', allowCommit: true });
      if (base.isError || base.result?.status !== 'baseCreated' || !base.result.draftId) throw new Error(base.result?.message || t.unknown);
      const draftId = base.result.draftId;
      setSavedTarget({ projectId, draftId });
      await galleryNativeSetFps(projectId, draftId);
      const fill = await sdk.runScript({ script: buildScript({ operation: 'fillBase', projectId,
        draftId, durationFrames: plan.durationFrames }), summary: 'Set Photo Gallery duration', allowCommit: true });
      if (fill.isError || fill.result?.status !== 'baseFilled') throw new Error(fill.result?.message || t.unknown);
      await galleryNativePlace(projectId, draftId, input.media, plan);
      if (input.media.some(item => item.kind === 'video')) {
        const videos = await sdk.runScript({ script: buildScript({ ...input, operation: 'placeVideosExisting', draftId }),
          summary: 'Place Gallery video tiles', allowCommit: true });
        if (videos.isError || videos.result?.status !== 'videosPlaced') throw new Error(videos.result?.message || t.unknown);
      }
      const styled = await sdk.runScript({ script: buildScript({ ...input, operation: 'styleExisting', draftId }),
        summary: 'Style Photo Gallery tiles', allowCommit: true });
      if (styled.isError || styled.result?.status !== 'styled') throw new Error(styled.result?.message || t.unknown);
      let verified = false;
      let readReturned = false;
      try {
        const readInput = { ...input, operation: 'verifyCreated', draftId };
        const read = await sdk.runScript({ script: buildScript(readInput), summary: 'Read saved Photo Gallery Draft', allowCommit: false });
        readReturned = true;
        verified = !read.isError && read.result?.status === 'verified' && read.result.tileCount === 21;
      } catch { /* The mutating call already returned a saved Draft ID. */ }
      // Selects may open the just-created Draft while its readback runs. That
      // expected sequence change must not turn a verified save into an error.
      if (verified) {
        setStatus({ tone: 'success', text: t.readback });
      } else if (readReturned) {
        setUnknown(true); setStatus({ tone: 'error', text: t.readbackMismatch });
      } else { setUnknown(true); setStatus({ tone: 'error', text: t.unknown }); }
    } catch (error) {
      if (dispatched && !error?.safeNotSaved) {
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
    <ui.Section title={t.createMode}>
      <ui.Button variant="secondary" onClick={load} busy={busy} disabled={!context.projectId}>{t.load}</ui.Button>
    </ui.Section>
    {ready && <ui.Section title={t.media}>
      <p>{t.assigned}: {assigned}/21</p>
      {autoFillMedia && <ui.Button variant="secondary" onClick={() => setSlots(autoFillMedia.map(item => ({ resourceId: item.resourceId, focusX: 0.5, focusY: 0.5 })))} disabled={busy}>{t.fill}</ui.Button>}
      {canAssignReferenceMix && <ui.Button variant="secondary" onClick={() => {
        let photoIndex = 0, videoIndex = 0;
        setSlots(SLOT_KEYS.map((_, index) => ({ resourceId: (REFERENCE_VIDEO_SLOTS.has(index + 1)
          ? videos[videoIndex++] : photos[photoIndex++]).resourceId, focusX: 0.5, focusY: 0.5 })));
      }} disabled={busy}>{t.referenceMix}</ui.Button>}
      {autoFillMedia && <small>{t.fillHint}</small>}
      {missingMotion.length > 0 && <small>{t.motionMissing}{missingMotion.join(', ')}</small>}
      {inventory.media.length === 0 && <ui.Message tone="error">{t.noMedia}</ui.Message>}
      <ui.Select label={t.slot} value={selectedSlot} onChange={setSelectedSlot} options={SLOT_KEYS.map((value, i) => ({ value: String(i), label: String(i + 1).padStart(2, '0') + ' · ' + (slots[i].resourceId ? (inventory.media.find(media => media.resourceId === slots[i].resourceId)?.name || slots[i].resourceId) : t.choose) }))}/>
      <ui.Select label={t.media} value={slot.resourceId || null} onChange={resourceId => updateSlot({ resourceId })} options={inventory.media.map(item => ({ value: item.resourceId, label: item.name + ' · ' + item.kind }))} placeholder={t.choose} disabled={busy}/>
      <ui.Slider label={t.focusX} value={slot.focusX} onChange={focusX => updateSlot({ focusX })} min={0} max={1} step={0.01} disabled={busy || !slot.resourceId}/>
      <ui.Slider label={t.focusY} value={slot.focusY} onChange={focusY => updateSlot({ focusY })} min={0} max={1} step={0.01} disabled={busy || !slot.resourceId}/>
    </ui.Section>}
    {ready && <ui.Section title={t.music}>
      <ui.Select label={t.music} value={musicChoice} onChange={value => { setMusicChoice(value); setEstimated(null); }} options={[
        { value: 'none', label: t.noMusic },
        ...inventory.audio.map(item => ({ value: item.resourceId, label: item.name })),
      ]} disabled={busy}/>
      <ui.Toggle label={t.bpmManual} value={manualEnabled} onChange={setManualEnabled} disabled={busy}/>
      {manualEnabled && <ui.NumberField label={t.bpm} value={manualBpm} onChange={setManualBpm} min={1} max={300} step={0.1} disabled={busy}/>}
      {!manualEnabled && selectedMusic && <ui.Button variant="secondary" onClick={estimateOnClick} disabled={busy}>{t.estimate}</ui.Button>}
      {estimated && selectedMusic && estimated.resourceId === selectedMusic.resourceId && <small>{t.estimated}: {estimated.bpm}</small>}
      <ui.NumberField label={t.duration} value={Number((durationFrames / 60).toFixed(3))} onChange={seconds => setDurationFrames(Math.max(1, Math.round(seconds * 60)))} min={1 / 60} step={1 / 60} unit="s" disabled={busy}/>
      <small>{t.durationNote}</small>
    </ui.Section>}
    {ready && <ui.Section title={t.createMode}>
      <ui.TextField label={t.name} value={name} onChange={setName} disabled={busy}/>
      <ui.Actions><ui.Button variant="primary" busy={busy} busyLabel={t.busy} disabled={unknown || busy || assigned !== 21 || !name.trim() || (musicChoice === 'none' && !manualEnabled)} onClick={createGallery}>{t.create}</ui.Button></ui.Actions>
      <small>{t.editLimits}</small>
    </ui.Section>}
    {status && <ui.Message tone={status.tone}>{status.text}</ui.Message>}
    {savedTarget && <ui.Button variant="secondary" onClick={openSaved} disabled={busy}>{context.language === 'ko' ? '\uc800\uc7a5\ud55c \ud3b8\uc9d1\ubcf8 \uc5f4\uae30' : 'Open saved Draft'}</ui.Button>}
  </ui.Stack>;
}
