// @name Photo Grid Reveal
// @name:de Photo Grid Reveal
// @name:en Photo Grid Reveal
// @name:es Photo Grid Reveal
// @name:fr Photo Grid Reveal
// @name:it Photo Grid Reveal
// @name:ja Photo Grid Reveal
// @name:ko Photo Grid Reveal
// @name:pt Photo Grid Reveal
// @name:tr Photo Grid Reveal
// @name:zh Photo Grid Reveal
// @collection visual-highlights
// @icon image
// Build a native, editable 3×7 photo/video gallery in the current Selects project.
import React from 'react';
const SCRIPT_PREFIX = "// Pure Photo Gallery contract. All frame values use the 60 fps output clock.\nconst REFERENCE = Object.freeze({\n  width: 1080,\n  height: 1920,\n  fps: 60,\n  durationFrames: 853,\n  nominalBpm: 113,\n  colorFrame: 270,\n  revealFrames: Object.freeze([0, 12, 23, 36, 45, 52, 62, 73, 81, 90, 100, 113, 122, 133, 143, 151, 161, 172, 182, 192, 205]),\n});\n\nfunction assertPositiveInteger(value, label) {\n  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${label} must be a positive integer`);\n}\n\nfunction validateMedia(media) {\n  if (!Array.isArray(media) || media.length !== 21) throw new Error('Exactly 21 visual media slots are required');\n  return media.map((item, index) => {\n    if (!item || !['image', 'video'].includes(item.kind)) throw new Error(`Slot ${index + 1} needs an Image or Video Resource`);\n    if (typeof item.resourceId !== 'string' || !item.resourceId.trim()) throw new Error(`Slot ${index + 1} needs a resource ID`);\n    assertPositiveInteger(item.width, `Slot ${index + 1} width`);\n    assertPositiveInteger(item.height, `Slot ${index + 1} height`);\n    const focusX = item.focusX ?? 0.5;\n    const focusY = item.focusY ?? 0.5;\n    if (![focusX, focusY].every((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1)) {\n      throw new Error(`Slot ${index + 1} focus must be between 0 and 1`);\n    }\n    if (item.kind === 'video') assertPositiveInteger(item.durationFrames, `Slot ${index + 1} durationFrames`);\n    return { ...item, focusX, focusY };\n  });\n}\n\nfunction tileRect(row, column) {\n  return {\n    left: column * 360 + 2,\n    right: (column + 1) * 360 - 2,\n    top: Math.round(row * REFERENCE.height / 7) + 2,\n    bottom: Math.round((row + 1) * REFERENCE.height / 7) - 2,\n  };\n}\n\nfunction planGallery(input) {\n  if (!input || typeof input !== 'object') throw new Error('Gallery input is required');\n  const media = validateMedia(input.media);\n  const durationFrames = input.durationFrames ?? REFERENCE.durationFrames;\n  assertPositiveInteger(durationFrames, 'durationFrames');\n  if (media.some((item) => item.kind === 'video' && item.durationFrames < durationFrames)) {\n    throw new Error('A selected video is too short; hold its last frame (the panel does this) before planning');\n  }\n  const hasManualBpm = input.manualBpm !== undefined && input.manualBpm !== null;\n  const bpm = hasManualBpm ? Number(input.manualBpm) : Number(input.estimatedBpm);\n  if (!Number.isFinite(bpm) || bpm <= 0 || (!input.music && !hasManualBpm)) {\n    throw new Error('BPM is required; provide a manual BPM when there is no music or no reliable estimate');\n  }\n  const ratio = REFERENCE.nominalBpm / bpm;\n  const revealFrames = REFERENCE.revealFrames.map((frame) => Math.round(frame * ratio));\n  if (revealFrames.some((frame, i) => i > 0 && frame <= revealFrames[i - 1])) {\n    throw new Error('BPM is too high to show all 21 tiles in distinct output frames');\n  }\n  const colorFrame = Math.round(REFERENCE.colorFrame * ratio);\n  if (colorFrame >= durationFrames) throw new Error('Color transition would occur after the output end');\n  if (input.music) {\n    if (typeof input.music.resourceId !== 'string' || !input.music.resourceId.trim()) throw new Error('Music needs a resource ID');\n    assertPositiveInteger(input.music.durationFrames, 'Music durationFrames');\n    const musicStartFrame = input.music.startFrame ?? 0;\n    if (!Number.isSafeInteger(musicStartFrame) || musicStartFrame < 0) throw new Error('Music startFrame must be nonnegative');\n    if (input.music.durationFrames - musicStartFrame < durationFrames) throw new Error('Selected music is too short for the output');\n  }\n  const tiles = media.map((item, i) => ({\n    slotKey: `tile-${String(i + 1).padStart(2, '0')}`,\n    resourceId: item.resourceId,\n    kind: item.kind,\n    row: Math.floor(i / 3),\n    column: i % 3,\n    rect: tileRect(Math.floor(i / 3), i % 3),\n    revealFrame: revealFrames[i],\n    endFrame: durationFrames,\n    focusX: item.focusX,\n    focusY: item.focusY,\n  }));\n  return {\n    frameSize: { width: REFERENCE.width, height: REFERENCE.height },\n    fps: REFERENCE.fps,\n    durationFrames,\n    bpm,\n    bpmSource: hasManualBpm ? 'manual' : 'estimated',\n    colorFrame,\n    music: input.music ?? null,\n    tiles,\n  };\n}\n\n// Executed inside Selects run_script by both the panel and the chat skill.\nconst TILE_EFFECT = `import {useCurrentFrame} from 'remotion';\nexport default function PhotoGalleryTile({Source,data}) {\n  const frame = useCurrentFrame();\n  const sourceW = data.sourceWidth, sourceH = data.sourceHeight;\n  const frameW = data.frameWidth, frameH = data.frameHeight;\n  const x = Math.max(frameW - sourceW, Math.min(0, frameW / 2 - data.focusX * sourceW));\n  const y = Math.max(frameH - sourceH, Math.min(0, frameH / 2 - data.focusY * sourceH));\n  return <div style={{position:'absolute',inset:0}}>\n    <div style={{position:'absolute',left:data.cropLeft,top:data.cropTop,width:frameW,height:frameH,overflow:'hidden',filter:frame < data.colorAfterLocalFrame ? 'grayscale(1)' : 'none'}}>\n      <div style={{position:'absolute',left:x,top:y,width:sourceW,height:sourceH}}><Source/></div>\n    </div>\n  </div>;\n}`;\n\nfunction galleryFail(message) { throw new Error(message); }\n\n// Host paths: POSIX (/…) on macOS; a drive (C:\\… or C:/…) or UNC (\\\\server\\…) path on Windows.\nfunction galleryAbsolute(path) {\n  return typeof path === 'string' && !path.includes('\\0') && /^(?:\\/|[A-Za-z]:[\\\\/]|\\\\\\\\)./.test(path);\n}\n// One comparison key per host path: NFC; a Windows path (drive letter or backslash) also gets / separators and is\n// case-folded, as Windows paths are case-insensitive. POSIX paths stay case-sensitive.\nfunction galleryPathKey(path) {\n  const text = String(path ?? '').normalize('NFC');\n  return /^[A-Za-z]:(?:[\\\\/]|$)/.test(text) || text.includes('\\\\') ? text.replace(/\\\\/g, '/').toLowerCase() : text;\n}\nfunction gallerySamePath(a, b) { return typeof a === 'string' && typeof b === 'string' && galleryPathKey(a) === galleryPathKey(b); }\n\nfunction galleryResolveResource(items, resourceId, path, label) {\n  const byId = items.find((item) => item.resourceId === resourceId);\n  if (!galleryAbsolute(path)) galleryFail(`${label} path is required`);\n  if (gallerySamePath(byId?.path, path)) return byId;\n  const matches = items.filter((item) => gallerySamePath(item.path, path));\n  if (matches.length !== 1) galleryFail(`${label} path is missing or ambiguous in this Project`);\n  return matches[0];\n}\n\nasync function galleryInventory(project) {\n  const resources = await project.resources();\n  const byId = new Map();\n  for (const row of resources) byId.set(row.resourceId, row);\n  const overview = await project.sourceFiles();\n  const nodes = [];\n  const visit = (items) => {\n    for (const item of items || []) {\n      if (item.type === 'dir') visit(item.children);\n      else nodes.push(item);\n    }\n  };\n  if (Array.isArray(overview.fileTree)) visit(overview.fileTree);\n  else if (overview.mode === 'summary' && Array.isArray(overview.folders)) {\n    for (const folder of overview.folders) {\n      const part = await project.sourceFiles({ folder: folder.name });\n      if (!Array.isArray(part.fileTree)) galleryFail('Media inventory is incomplete');\n      visit(part.fileTree);\n    }\n  } else galleryFail('Media inventory is unavailable');\n  const media = [], audio = [];\n  const seen = new Set();\n  for (const node of nodes) {\n    const resource = byId.get(node.resourceId);\n    if (!resource || seen.has(node.resourceId) || typeof node.path !== 'string') continue;\n    const type = String(resource.type).toLowerCase();\n    const kind = type === 'image' ? 'image' : type === 'video' ? 'video' : type === 'audio' ? 'audio' : null;\n    if (!kind) continue;\n    const durationSeconds = Number.isFinite(node.durationSeconds) ? node.durationSeconds : resource.durationSeconds;\n    const durationFrames = Number.isFinite(durationSeconds) ? Math.round(durationSeconds * 60) : null;\n    const common = { resourceId: node.resourceId, name: node.name, path: node.path, durationFrames };\n    if (kind === 'audio') audio.push(common);\n    else if (kind === 'image' || (node.frameSize?.width > 0 && node.frameSize?.height > 0)) {\n      media.push({ ...common, kind, width: node.frameSize?.width ?? null, height: node.frameSize?.height ?? null });\n    }\n    seen.add(node.resourceId);\n  }\n  const unavailable = resources.filter((resource) =>\n    ['image', 'video', 'audio'].includes(String(resource.type).toLowerCase()) &&\n    !media.some((item) => item.resourceId === resource.resourceId) &&\n    !audio.some((item) => item.resourceId === resource.resourceId));\n  return { media, audio, unavailable: unavailable.map((item) => ({ resourceId: item.resourceId, name: item.name })) };\n}\n\nfunction galleryGeometry(tile, source, colorFrame) {\n  const { left, right, top, bottom } = tile.rect;\n  const width = right - left, height = bottom - top;\n  const q = Math.min(source.width / width, source.height / height);\n  const frameWidth = width * q, frameHeight = height * q;\n  const conform = Math.min(1080 / source.width, 1920 / source.height);\n  return {\n    effect: {\n      sourceWidth: source.width, sourceHeight: source.height,\n      frameWidth, frameHeight,\n      cropLeft: (source.width - frameWidth) / 2,\n      cropTop: (source.height - frameHeight) / 2,\n      focusX: tile.focusX, focusY: tile.focusY,\n      colorAfterLocalFrame: colorFrame - tile.revealFrame,\n    },\n    transform: {\n      position: { x: (((left + right) / 2) - 540) / 1920 * 100, y: (960 - (top + bottom) / 2) / 1920 * 100 },\n      scale: { x: 1 / (q * conform), y: 1 / (q * conform) },\n    },\n  };\n}\n\nfunction assertGalleryInput(input) {\n  if (!input || typeof input !== 'object' || Array.isArray(input)) galleryFail('Gallery input is required');\n  if (typeof input.projectId !== 'string' || !input.projectId) galleryFail('Select a Project');\n  if (!['inspect', 'importBundledMusic', 'importConverted', 'create', 'preflight', 'createBase', 'fillBase', 'placeVideosExisting', 'styleExisting', 'verifyCreated'].includes(input.operation)) galleryFail('Unknown gallery action');\n  if (['create', 'preflight', 'createBase', 'placeVideosExisting', 'styleExisting'].includes(input.operation) && (!Array.isArray(input.media) || input.media.length !== 21)) galleryFail('Select exactly 21 visual slots');\n  return input;\n}\n\nasync function galleryImportConverted(selects, project, input, inventory, onImportStarted) {\n  const requiredFrames = input.durationFrames ?? 853;\n  if (!Number.isSafeInteger(requiredFrames) || requiredFrames < 1 || requiredFrames > 36000) {\n    galleryFail('Held video duration must be an integer from 1 to 36000 frames');\n  }\n  if (!Array.isArray(input.converted) || input.converted.length < 1 || input.converted.length > 21) {\n    galleryFail('Provide one to 21 held video files');\n  }\n  const seenSources = new Set();\n  for (const item of input.converted) {\n    const source = galleryResolveResource(inventory.media, item?.sourceResourceId, item?.sourcePath, 'Selected source');\n    if (source.kind !== 'video' || seenSources.has(source.resourceId) ||\n        !galleryAbsolute(item.path) || !/\\.mp4$/i.test(item.path)) {\n      galleryFail('A held clip must match one distinct Project video and absolute MP4 path');\n    }\n    seenSources.add(source.resourceId);\n  }\n  const paths = [...new Map(input.converted.map((item) => [galleryPathKey(item.path), item.path])).values()];\n  const probe = await selects.media.probe({ filePaths: paths });\n  const probed = new Set((probe.files || []).filter((file) => !file.type || /video/i.test(file.type)).map((file) => galleryPathKey(file.path)));\n  if (probe.error || probe.errors?.length || probe.summary?.failed || paths.some((path) => !probed.has(galleryPathKey(path)))) {\n    galleryFail('A held video file is missing or unreadable; no Project media was imported');\n  }\n  const currentByPath = new Map();\n  for (const item of inventory.media) if (item.kind === 'video') currentByPath.set(galleryPathKey(item.path), item);\n  const missing = paths.filter((path) => !currentByPath.has(galleryPathKey(path)));\n  if (missing.length) {\n    if (typeof project.importFiles !== 'function') galleryFail('This Selects version cannot import held videos');\n    onImportStarted();\n    await project.importFiles({ paths: missing });\n  }\n  const fresh = missing.length ? await galleryInventory(project) : inventory;\n  const importedByPath = new Map();\n  for (const item of fresh.media) if (item.kind === 'video') importedByPath.set(galleryPathKey(item.path), item);\n  const converted = input.converted.map((item) => {\n    const video = importedByPath.get(galleryPathKey(item.path));\n    if (!video || video.durationFrames == null || video.durationFrames < requiredFrames) {\n      galleryFail('Held video import or length could not be verified; inspect Project files before retrying');\n    }\n    const source = galleryResolveResource(fresh.media, item.sourceResourceId, item.sourcePath, 'Selected source');\n    return { sourceResourceId: item.sourceResourceId, resolvedSourceResourceId: source?.resourceId,\n      resourceId: video.resourceId,\n      // The Project's own spelling of the path, which native placement later compares exactly.\n      path: video.path, width: video.width, height: video.height, durationFrames: video.durationFrames };\n  });\n  return { status: 'prepared', converted };\n}\n\nasync function galleryImportBundledMusic(selects, project, input, inventory, onImportStarted) {\n  const frames = input.durationFrames ?? 853;\n  if (!Number.isSafeInteger(frames) || frames < 1 || frames > 36000) galleryFail('Music length must be an integer from 1 to 36000 frames');\n  if (!galleryAbsolute(input.path) || !/\\.mp3$/i.test(input.path)) galleryFail('Bundled music requires an absolute MP3 path');\n  const probe = await selects.media.probe({ filePaths: [input.path] });\n  if (probe.error || probe.errors?.length || probe.summary?.failed ||\n      !(probe.files || []).some(file => gallerySamePath(file.path, input.path) && (!file.type || /audio/i.test(file.type)))) {\n    galleryFail('Bundled music is missing or corrupt; reinstall the plugin');\n  }\n  const matches = inventory.audio.filter(item => gallerySamePath(item.path, input.path));\n  if (matches.length > 1 || inventory.media.some(item => gallerySamePath(item.path, input.path))) galleryFail('Bundled music path is ambiguous or is not Audio');\n  if (!matches.length) {\n    onImportStarted();\n    await project.importFiles({ paths: [input.path] });\n    inventory = await galleryInventory(project);\n  }\n  const audio = inventory.audio.filter(item => gallerySamePath(item.path, input.path));\n  if (audio.length !== 1 || !Number.isSafeInteger(audio[0].durationFrames)) galleryFail('Bundled music import is not ready; inspect Project media before retrying');\n  if (audio[0].durationFrames < frames) galleryFail('Music is too short for this result length; shorten the result or choose a longer track');\n  return { status: 'musicReady', music: { ...audio[0], startFrame: 0 } };\n}\n\nasync function galleryPreflight(selects, project, input, inventory) {\n  const chosen = input.media.map((item, i) => {\n    const fresh = galleryResolveResource(inventory.media, item.resourceId, item.path, `Slot ${i + 1}`);\n    const width = fresh.width ?? item.width, height = fresh.height ?? item.height;\n    if (!Number.isSafeInteger(width) || width < 1 || !Number.isSafeInteger(height) || height < 1) {\n      galleryFail(`Slot ${i + 1} photo dimensions are unavailable through the plugin SDK; no Draft was saved`);\n    }\n    if ((item.width != null && fresh.width != null && fresh.width !== item.width) ||\n        (item.height != null && fresh.height != null && fresh.height !== item.height)) {\n      galleryFail(`Slot ${i + 1} dimensions changed`);\n    }\n    return { ...fresh, width, height, focusX: item.focusX, focusY: item.focusY };\n  });\n  const music = input.music == null ? null :\n    galleryResolveResource(inventory.audio, input.music.resourceId, input.music.path, 'Music');\n  if (input.music != null && !music) galleryFail('Selected music is missing or moved');\n  const selectedMusic = music && { ...music, startFrame: input.music.startFrame ?? 0 };\n  const plan = planGallery({ media: chosen, music: selectedMusic, manualBpm: input.manualBpm, estimatedBpm: input.estimatedBpm, durationFrames: input.durationFrames });\n  const paths = [...new Set([...chosen.map((item) => item.path), ...(music ? [music.path] : [])])];\n  const probe = await selects.media.probe({ filePaths: paths });\n  const confirmed = new Set((probe.files || []).map((file) => galleryPathKey(file.path)));\n  if (probe.error || (probe.errors || []).length || (probe.summary?.failed || 0) || paths.some((path) => !confirmed.has(galleryPathKey(path)))) {\n    galleryFail('A selected media file is missing, unreadable, or corrupt; no Draft was saved');\n  }\n  const meta = await project.meta();\n  if (!Array.isArray(meta.draftIds)) galleryFail('Project Draft list is unavailable');\n  return { plan, chosen, music: selectedMusic };\n}\n\nasync function galleryCreate(selects, project, input, inventory, onCommitStarted) {\n  const { plan, chosen, music } = await galleryPreflight(selects, project, input, inventory);\n  const name = typeof input.name === 'string' && input.name.trim() ? input.name.trim() : 'Photo Gallery';\n  const draft = await project.createDraft({ name });\n  if ((await draft.meta()).fps !== 60) galleryFail('This Project is not 60 fps; no Draft was saved');\n  await draft.insertGap({ seconds: plan.durationFrames / plan.fps });\n  await draft.setFrameSize(plan.frameSize);\n  const prepared = await draft.meta();\n  if (prepared.fps !== plan.fps || prepared.durationFrames !== plan.durationFrames ||\n      prepared.frameSize?.width !== plan.frameSize.width || prepared.frameSize?.height !== plan.frameSize.height) {\n    galleryFail('The working Draft does not match the requested 60 fps, canvas, and duration; no Draft was saved');\n  }\n  let knownClipIds = new Set((await draft.clips({ trackScope: 'all' })).map((row) => row.clipId));\n  for (let i = 0; i < plan.tiles.length; i++) {\n    const tile = plan.tiles[i], source = chosen[i];\n    try {\n      await draft.overlayResource({ resource: project.resource(tile.resourceId), over: await draft.rangeAtFrames(tile.revealFrame, tile.endFrame) });\n    } catch (error) {\n      if (source.kind === 'image' && /not a Video\\/Audio asset/i.test(String(error?.message || error))) {\n        galleryFail('The plugin SDK cannot place original Image Resources on video tracks, although the editor can; no Draft was saved');\n      }\n      throw error;\n    }\n    const after = await draft.clips({ trackScope: 'all' });\n    const added = after.filter((row) => !knownClipIds.has(row.clipId) && row.resourceId === tile.resourceId && row.startFrame === tile.revealFrame && row.endFrame === tile.endFrame);\n    if (added.length !== 1) galleryFail(`Could not identify tile ${i + 1} after placement; no Draft was saved`);\n    const clip = added[0];\n    const geometry = galleryGeometry(tile, source, plan.colorFrame);\n    await draft.addVideoEffect({\n      clip, label: `Gallery ${tile.slotKey} color-${plan.colorFrame}`,\n      tsxCode: TILE_EFFECT,\n      parameters: geometry.effect,\n      editableParameters: [\n        { key: 'focusX', label: 'Horizontal focus', type: 'number', defaultValue: 0.5, min: 0, max: 1, step: 0.01 },\n        { key: 'focusY', label: 'Vertical focus', type: 'number', defaultValue: 0.5, min: 0, max: 1, step: 0.01 },\n      ],\n    });\n    const freshClip = (await draft.clips({ trackScope: 'all' })).find((row) => row.clipId === clip.clipId);\n    if (!freshClip) galleryFail(`Tile ${i + 1} disappeared before placement was complete`);\n    await draft.setClipTransform({ clip: freshClip, position: geometry.transform.position, scale: geometry.transform.scale });\n    const finalRows = await draft.clips({ trackScope: 'all' });\n    const finalClip = finalRows.find((row) => row.clipId === clip.clipId);\n    if (!finalClip) galleryFail(`Tile ${i + 1} disappeared after transform`);\n    knownClipIds = new Set(finalRows.map((row) => row.clipId));\n  }\n  if (music) await draft.overlayResource({ resource: project.resource(music.resourceId), over: await draft.rangeAtFrames(0, plan.durationFrames), sourceStartSeconds: music.startFrame / plan.fps });\n  const rows = await draft.clips({ trackScope: 'all' });\n  if (rows.some((row) => row.trackKind === 'main' && row.resourceId)) galleryFail('The working Draft has an unexpected Main Resource');\n  if (rows.filter((row) => row.trackKind === 'video' && row.resourceId != null).length !== 21) galleryFail('The working Draft does not contain all 21 editable tiles');\n  onCommitStarted();\n  const saved = await draft.commitAll('Create editable 21-tile Photo Gallery');\n  if (!saved?.createdDraftId) galleryFail('Save outcome is unknown; inspect Project Drafts before retrying');\n  return { status: 'saved', draftId: saved.createdDraftId, tileCount: 21, durationFrames: plan.durationFrames, colorFrame: plan.colorFrame };\n}\n\nasync function galleryCreateBase(project, input, onCommitStarted) {\n  const name = typeof input.name === 'string' && input.name.trim() ? input.name.trim() : 'Photo Gallery';\n  const draft = await project.createDraft({ name });\n  await draft.setFrameSize({ width: 1080, height: 1920 });\n  onCommitStarted();\n  const saved = await draft.commitAll('Create empty Photo Gallery Draft');\n  if (!saved?.createdDraftId) galleryFail('Empty Draft save outcome is unknown');\n  return { status: 'baseCreated', draftId: saved.createdDraftId };\n}\n\nasync function galleryFillBase(selects, project, input, onCommitStarted) {\n  if (typeof input.draftId !== 'string' || !(await project.meta()).draftIds?.includes(input.draftId)) {\n    galleryFail('Target Draft does not belong to this Project');\n  }\n  if (!Number.isSafeInteger(input.durationFrames) || input.durationFrames < 1) galleryFail('Invalid Gallery duration');\n  const draft = selects.draft(input.draftId);\n  const meta = await draft.meta();\n  if (meta.fps !== 60 || meta.durationFrames !== 0 || meta.frameSize?.width !== 1080 || meta.frameSize?.height !== 1920) {\n    galleryFail('Target Draft must be an empty 60 fps portrait Draft');\n  }\n  await draft.insertGap({ seconds: input.durationFrames / 60 });\n  if ((await draft.meta()).durationFrames !== input.durationFrames) galleryFail('Could not author exact Gallery duration');\n  onCommitStarted();\n  const saved = await draft.commitAll('Set Photo Gallery duration');\n  if (!saved?.commitId) galleryFail('Duration save outcome is unknown');\n  return { status: 'baseFilled', draftId: input.draftId, durationFrames: input.durationFrames };\n}\n\nfunction galleryBatchTiles(tiles, slotKeys, limit) {\n  if (slotKeys === undefined) return tiles;\n  if (!Array.isArray(slotKeys) || slotKeys.length < 1 || slotKeys.length > limit ||\n      new Set(slotKeys).size !== slotKeys.length ||\n      slotKeys.some(key => !tiles.some(tile => tile.slotKey === key))) {\n    galleryFail(`Provide one to ${limit} distinct eligible slot keys`);\n  }\n  const selected = new Set(slotKeys);\n  return tiles.filter(tile => selected.has(tile.slotKey));\n}\n\nasync function galleryPlaceVideosExisting(selects, project, input, inventory, onCommitStarted) {\n  if (typeof input.draftId !== 'string' || !(await project.meta()).draftIds?.includes(input.draftId)) {\n    galleryFail('Target Draft does not belong to this Project');\n  }\n  const { plan } = await galleryPreflight(selects, project, input, inventory);\n  const videos = galleryBatchTiles(plan.tiles.filter(tile => tile.kind === 'video'), input.slotKeys, 1);\n  if (!videos.length) return { status: 'videosPlaced', draftId: input.draftId, tileCount: 0 };\n  const draft = selects.draft(input.draftId);\n  const meta = await draft.meta();\n  if (meta.fps !== 60 || meta.durationFrames !== plan.durationFrames ||\n      meta.frameSize?.width !== 1080 || meta.frameSize?.height !== 1920) {\n    galleryFail('Target Draft clock, canvas, or duration changed');\n  }\n  const rows = await draft.clips({ trackScope: 'all' });\n  const existing = rows.filter(row => row.trackKind === 'video' && row.resourceId);\n  const imageTiles = plan.tiles.filter(tile => tile.kind === 'image');\n  if (new Set(existing.map(row => row.clipId)).size !== existing.length ||\n      new Set(existing.map(row => row.trackId)).size !== existing.length ||\n      rows.some(row => row.trackKind === 'audio' && row.resourceId) ||\n      rows.some(row => row.trackKind === 'main' && row.resourceId)) galleryFail('Target Draft has unexpected media');\n  const used = new Set();\n  for (const tile of imageTiles) {\n    const matches = existing.filter(row => row.resourceId === tile.resourceId &&\n      row.startFrame === tile.revealFrame && row.endFrame === tile.endFrame && !used.has(row.clipId));\n    if (matches.length !== 1) galleryFail(`Image ${tile.slotKey} changed before video placement`);\n    used.add(matches[0].clipId);\n  }\n  // Earlier bounded calls may have saved Videos already. Validate all of them\n  // against this frozen plan, but never replace or duplicate an existing target.\n  const placedVideoKeys = new Set();\n  for (const row of existing.filter(row => !used.has(row.clipId))) {\n    const matches = plan.tiles.filter(tile => tile.kind === 'video' &&\n      tile.resourceId === row.resourceId && tile.revealFrame === row.startFrame && tile.endFrame === row.endFrame);\n    if (matches.length !== 1 || placedVideoKeys.has(matches[0].slotKey)) galleryFail('Target Draft has unexpected or duplicate video media');\n    placedVideoKeys.add(matches[0].slotKey);\n  }\n  if (videos.some(tile => placedVideoKeys.has(tile.slotKey))) galleryFail('A selected Video is already present; inspect the Draft before retrying');\n  for (const tile of videos) {\n    const resource = project.resource(tile.resourceId);\n    const overlay = async (startFrame) => {\n      const before = new Set((await draft.clips({ trackScope: 'all' })).map(row => row.clipId));\n      await draft.overlayResource({ resource, over: await draft.rangeAtFrames(startFrame, tile.endFrame) });\n      const rows = (await draft.clips({ trackScope: 'all' })).filter(row => !before.has(row.clipId));\n      const visual = rows.filter(row => row.trackKind === 'video' && row.resourceId === tile.resourceId);\n      if (visual.length !== 1 || visual[0].startFrame !== startFrame) galleryFail(`Video ${tile.slotKey} did not create one independent clip`);\n      const sourceAudio = rows.filter(row => row.trackKind === 'audio' && row.resourceId);\n      if (sourceAudio.length) await draft.removeClips(sourceAudio);\n      return visual[0];\n    };\n    let clip = await overlay(tile.revealFrame);\n    if (clip.endFrame < tile.endFrame) {\n      // The SDK may quantize a seconds-based overlay one frame short at some\n      // 60 fps start positions. Re-place with enough source time, then use the\n      // public clip move and trim operations to get exact frame boundaries.\n      await draft.removeClips([clip]);\n      if (tile.revealFrame < 1) galleryFail(`Video ${tile.slotKey} cannot cover the output end`);\n      clip = await overlay(tile.revealFrame - 1);\n      const moved = await draft.moveOverlayClip({ clip, startFrame: tile.revealFrame });\n      const matches = (await draft.clips({ trackScope: 'all' })).filter(row => row.clipId === moved.clipId);\n      if (matches.length !== 1) galleryFail(`Video ${tile.slotKey} moved clip could not be read back`);\n      clip = matches[0];\n    }\n    if (clip.endFrame > tile.endFrame) {\n      await draft.remove(await draft.rangeAtFrames(tile.endFrame, clip.endFrame), { tracks: [clip.trackId] });\n    }\n    const exact = (await draft.clips({ trackScope: 'all' })).filter(row => row.clipId === clip.clipId &&\n      row.trackKind === 'video' && row.resourceId === tile.resourceId &&\n      row.startFrame === tile.revealFrame && row.endFrame === tile.endFrame);\n    if (exact.length !== 1) galleryFail(`Video ${tile.slotKey} could not reach its exact reveal and end frames`);\n    if ((await draft.clips({ trackScope: 'all' })).some(row => row.trackKind === 'audio' && row.resourceId)) {\n      galleryFail(`Video ${tile.slotKey} retained source audio`);\n    }\n  }\n  onCommitStarted();\n  const saved = await draft.commitAll('Place Photo Gallery video tiles');\n  if (!saved?.commitId) galleryFail('Video placement save outcome is unknown');\n  return { status: 'videosPlaced', draftId: input.draftId, tileCount: videos.length };\n}\n\nasync function galleryStyleExisting(selects, project, input, inventory, onCommitStarted) {\n  if (typeof input.draftId !== 'string' || !input.draftId) galleryFail('An explicit target Draft is required');\n  const projectMeta = await project.meta();\n  if (!projectMeta.draftIds?.includes(input.draftId)) galleryFail('Target Draft does not belong to this Project');\n  const chosen = input.media.map((item, i) => {\n    const fresh = galleryResolveResource(inventory.media, item.resourceId, item.path, `Slot ${i + 1}`);\n    if (fresh.kind !== item.kind) galleryFail(`Slot ${i + 1} Resource type changed`);\n    const width = fresh.width ?? item.width, height = fresh.height ?? item.height;\n    if (!Number.isSafeInteger(width) || width < 1 || !Number.isSafeInteger(height) || height < 1) {\n      galleryFail(`Slot ${i + 1} photo dimensions are unavailable`);\n    }\n    if (fresh.width != null && fresh.width !== item.width || fresh.height != null && fresh.height !== item.height) {\n      galleryFail(`Slot ${i + 1} photo dimensions changed`);\n    }\n    return { ...fresh, width, height, focusX: item.focusX, focusY: item.focusY };\n  });\n  const music = input.music == null ? null : galleryResolveResource(inventory.audio, input.music.resourceId, input.music.path, 'Music');\n  const plan = planGallery({ media: chosen, music: music ? { ...music, startFrame: input.music.startFrame ?? 0 } : null, manualBpm: input.manualBpm,\n    estimatedBpm: input.estimatedBpm, durationFrames: input.durationFrames });\n  const selectedTiles = galleryBatchTiles(plan.tiles, input.slotKeys, 3);\n  const selectedKeys = new Set(selectedTiles.map(tile => tile.slotKey));\n  if (input.placeMusic !== undefined && typeof input.placeMusic !== 'boolean') galleryFail('placeMusic must be a boolean');\n  const draft = selects.draft(input.draftId);\n  const meta = await draft.meta();\n  if (meta.fps !== plan.fps || meta.durationFrames !== plan.durationFrames ||\n      meta.frameSize?.width !== plan.frameSize.width || meta.frameSize?.height !== plan.frameSize.height) {\n    galleryFail('Target Draft clock, canvas, or duration does not match the Gallery plan');\n  }\n  const allRows = await draft.clips({ trackScope: 'all' });\n  if (allRows.some((row) => row.trackKind === 'main' && row.resourceId)) galleryFail('Target Draft Main track is not blank');\n  if (allRows.some((row) => row.trackKind === 'audio' && row.resourceId)) galleryFail('Target Draft has unexpected source audio');\n  const rows = allRows.filter((row) => row.trackKind === 'video' && row.resourceId);\n  if (rows.length !== 21 || new Set(rows.map((row) => row.trackId)).size !== 21) {\n    galleryFail('Target Draft must contain exactly 21 independent visual tracks');\n  }\n  const used = new Set(), targets = [];\n  for (let i = 0; i < 21; i++) {\n    const tile = plan.tiles[i];\n    const matches = rows.filter((row) => row.resourceId === tile.resourceId &&\n      row.startFrame === tile.revealFrame && row.endFrame === tile.endFrame && !used.has(row.clipId));\n    if (matches.length !== 1) galleryFail(`Target tile ${tile.slotKey} does not match the selected Resource and frames`);\n    const clip = matches[0];\n    used.add(clip.clipId);\n    if (!selectedKeys.has(tile.slotKey)) continue;\n    if ((await draft.videoEffects(clip)).length) galleryFail(`Target tile ${tile.slotKey} already has effects; inspect it before retrying`);\n    const transform = await draft.clipTransform(clip);\n    const identity = !transform || !transform.enabled ||\n      (transform.position?.x === 0 && transform.position?.y === 0 &&\n       transform.scale?.x === 1 && transform.scale?.y === 1 &&\n       transform.rotation === 0 && transform.anchor?.x === 0 && transform.anchor?.y === 0);\n    if (!identity) galleryFail(`Target tile ${tile.slotKey} already has a manual transform; inspect it before retrying`);\n    targets.push({ clip, tile, source: chosen[i] });\n  }\n  for (const { clip, tile, source } of targets) {\n    const geometry = galleryGeometry(tile, source, plan.colorFrame);\n    const current = (await draft.clips({ trackScope: 'all' })).find((row) => row.clipId === clip.clipId);\n    if (!current) galleryFail(`Target tile ${tile.slotKey} disappeared before styling`);\n    await draft.addVideoEffect({ clip: current, label: `Gallery ${tile.slotKey} color-${plan.colorFrame}`,\n      tsxCode: TILE_EFFECT, parameters: geometry.effect,\n      editableParameters: [\n        { key: 'focusX', label: 'Horizontal focus', type: 'number', defaultValue: 0.5, min: 0, max: 1, step: 0.01 },\n        { key: 'focusY', label: 'Vertical focus', type: 'number', defaultValue: 0.5, min: 0, max: 1, step: 0.01 },\n      ] });\n    const fresh = (await draft.clips({ trackScope: 'all' })).find((row) => row.clipId === clip.clipId);\n    if (!fresh) galleryFail(`Target tile ${tile.slotKey} disappeared during styling`);\n    await draft.setClipTransform({ clip: fresh, position: geometry.transform.position, scale: geometry.transform.scale });\n  }\n  if (plan.music && input.placeMusic !== false) await draft.overlayResource({ resource: project.resource(plan.music.resourceId),\n    over: await draft.rangeAtFrames(0, plan.durationFrames), sourceStartSeconds: plan.music.startFrame / plan.fps });\n  onCommitStarted();\n  const saved = await draft.commitAll('Style Photo Gallery tiles');\n  if (!saved?.commitId) galleryFail('Style save outcome is unknown; inspect the Draft before retrying');\n  return { status: 'styled', draftId: input.draftId, tileCount: targets.length, durationFrames: plan.durationFrames,\n    colorFrame: plan.colorFrame };\n}\n\nasync function galleryVerifyCreated(selects, project, input, inventory) {\n  if (typeof input.draftId !== 'string' || !input.draftId) galleryFail('The saved Draft ID is required for readback');\n  const { plan, chosen } = await galleryPreflight(selects, project, input, inventory);\n  const projectMeta = await project.meta();\n  if (!projectMeta.draftIds?.includes(input.draftId)) galleryFail('The saved Draft does not belong to this Project');\n  const draft = selects.draft(input.draftId);\n  const meta = await draft.meta();\n  if (meta.fps !== 60 || meta.durationFrames !== plan.durationFrames ||\n      meta.frameSize?.width !== 1080 || meta.frameSize?.height !== 1920) {\n    galleryFail('Saved Draft canvas, frame rate, or duration does not match the request');\n  }\n  const allRows = await draft.clips({ trackScope: 'all' });\n  if (allRows.some((row) => row.trackKind === 'main' && row.resourceId)) galleryFail('Saved Draft has an unexpected Main Resource');\n  const rows = allRows.filter((row) => row.trackKind === 'video' && row.resourceId);\n  if (rows.length !== 21) galleryFail('Saved Draft does not contain exactly 21 independent visual clips');\n  const audioRows = allRows.filter((row) => row.trackKind === 'audio' && row.resourceId);\n  if (plan.music) {\n    if (audioRows.length !== 1 || audioRows[0].resourceId !== plan.music.resourceId ||\n        audioRows[0].startFrame !== 0 || audioRows[0].endFrame !== plan.durationFrames) {\n      galleryFail('Saved Draft music does not match the requested Resource and duration');\n    }\n  } else if (audioRows.length) galleryFail('Saved Draft has unexpected music');\n  const usedClipIds = new Set();\n  for (let tileIndex = 0; tileIndex < plan.tiles.length; tileIndex++) {\n    const tile = plan.tiles[tileIndex];\n    const matches = rows.filter((row) => row.resourceId === tile.resourceId &&\n      row.startFrame === tile.revealFrame && row.endFrame === tile.endFrame && !usedClipIds.has(row.clipId));\n    if (matches.length !== 1) galleryFail(`Saved tile ${tile.slotKey} does not match its requested Resource and frames`);\n    const clip = matches[0];\n    const effects = await draft.videoEffects(clip);\n    if (effects.filter((effect) => effect.name === `Gallery ${tile.slotKey} color-${plan.colorFrame}` && effect.enabled !== false).length !== 1) {\n      galleryFail(`Saved tile ${tile.slotKey} has no matching color-transition effect`);\n    }\n    const actual = await draft.clipTransform(clip);\n    const expected = galleryGeometry(tile, chosen[tileIndex], plan.colorFrame).transform;\n    const close = (left, right) => typeof left === 'number' && Number.isFinite(left) && Math.abs(left - right) <= 1e-5;\n    if (!actual?.enabled || !close(actual.position?.x, expected.position.x) ||\n        !close(actual.position?.y, expected.position.y) ||\n        !close(actual.scale?.x, expected.scale.x) || !close(actual.scale?.y, expected.scale.y)) {\n      galleryFail(`Saved tile ${tile.slotKey} position or crop transform does not match the requested grid`);\n    }\n    usedClipIds.add(clip.clipId);\n  }\n  return { status: 'verified', draftId: input.draftId, tileCount: 21, durationFrames: plan.durationFrames,\n    colorFrame: plan.colorFrame, structuralOnly: true };\n}\n\nasync function galleryOperation(selects, raw) {\n  let commitStarted = false;\n  try {\n    const input = assertGalleryInput(raw);\n    const project = selects.project(input.projectId);\n    const inventory = await galleryInventory(project);\n    if (input.operation === 'inspect') return { status: 'inspected', projectId: input.projectId, ...inventory };\n    if (input.operation === 'importBundledMusic') return await galleryImportBundledMusic(selects, project, input, inventory, () => { commitStarted = true; });\n    if (input.operation === 'importConverted') return await galleryImportConverted(selects, project, input, inventory, () => { commitStarted = true; });\n    if (input.operation === 'create') return await galleryCreate(selects, project, input, inventory, () => { commitStarted = true; });\n    if (input.operation === 'preflight') {\n      const { plan } = await galleryPreflight(selects, project, input, inventory);\n      return { status: 'ready', plan };\n    }\n    if (input.operation === 'createBase') return await galleryCreateBase(project, input, () => { commitStarted = true; });\n    if (input.operation === 'fillBase') return await galleryFillBase(selects, project, input, () => { commitStarted = true; });\n    if (input.operation === 'placeVideosExisting') return await galleryPlaceVideosExisting(selects, project, input, inventory, () => { commitStarted = true; });\n    if (input.operation === 'styleExisting') return await galleryStyleExisting(selects, project, input, inventory, () => { commitStarted = true; });\n    if (input.operation === 'verifyCreated') return await galleryVerifyCreated(selects, project, input, inventory);\n    galleryFail('Unknown gallery action');\n  } catch (error) {\n    return { status: commitStarted ? 'outcomeUnknown' : 'notSaved', message: String(error?.message || error) };\n  }\n}\n\nreturn await galleryOperation(selects, ";
const buildScript = input => SCRIPT_PREFIX + JSON.stringify(input) + ');';
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


// av-host:start
// Host I/O for a style-app panel: plain JS and self-contained (no app names, no UI text), so it can move to a shared
// kit file and tests can run it in node:vm. Guarded access to the host's renderer services (window.parent.__DI__,
// documented as internal, so every member is checked before use), the platform, path joins, file reads and removal,
// the install and data folders, and the host's bundled ffmpeg (Runtime.runFFmpeg / runFFprobe: argv arrays, no shell,
// nothing for the user to install). Paths are built with FileSystem.join and never pass through a console; generated
// file names are ASCII. There is no shell call at all (kit windows.md). Errors carry `code`: 'host-missing' (with `member`, a service method this Selects
// build lacks: the caller shows one "needs a newer Selects" message) or 'not-found' (no install folder).
function hostError(code, message, member = "") { return Object.assign(new Error(message), { code, member }); }
function hostDI() { try { return (window.parent && window.parent["__DI__"]) || null; } catch { return null; } }
// A host service when it has every named method, else null.
function hostApi(name, ...methods) {
  const s = hostDI()?.[name];
  return s && methods.every((m) => typeof s[m] === "function") ? s : null;
}
// A host service that must have `method`; throws a 'host-missing' error when this build lacks it.
function hostNeed(name, method) {
  const s = hostApi(name, method);
  if (!s) throw hostError("host-missing", "this Selects build has no " + name + "." + method, name + "." + method);
  return s;
}
// Windows or not: the host's own answer (Runtime.getPlatform: "win32", "darwin"), else the browser's.
function hostIsWindows() {
  try {
    const rt = hostApi("Runtime", "getPlatform");
    const p = rt ? String(rt.getPlatform() || "") : "";
    if (p) return /^win/i.test(p);
  } catch { /* the browser decides */ }
  try {
    const n = navigator;
    return /^win/i.test(String(n.platform || "")) || /Windows NT/i.test(String(n.userAgent || ""));
  } catch { return false; }
}
// Joins path parts with the host's join (the OS separator), or by hand with the OS separator.
function hostJoin(...parts) {
  const fs = hostApi("FileSystem", "join");
  if (fs) { try { return String(fs.join(...parts)); } catch { /* join by hand */ } }
  const sep = hostIsWindows() ? "\\" : "/";
  return parts.filter((x) => x !== "").map((x, i) => (i === 0 ? x.replace(/[\\/]+$/, "") : x.replace(/^[\\/]+|[\\/]+$/g, ""))).join(sep);
}
// A Buffer, ArrayBuffer or typed array as bytes (a Buffer may be a view into a larger pool). The value comes from the
// host window (window.parent), another JavaScript realm, so `instanceof ArrayBuffer` is false for it: the checks use
// the internal [[Class]] tag and array-likeness instead.
function hostBytes(v) {
  const tag = (x) => Object.prototype.toString.call(x);
  if (tag(v) === "[object ArrayBuffer]") return new Uint8Array(v);
  if (v && typeof v.byteLength === "number" && v.buffer && tag(v.buffer) === "[object ArrayBuffer]") {
    return new Uint8Array(v.buffer, v.byteOffset || 0, v.byteLength);
  }
  if (v && typeof v === "object" && typeof v.length === "number") return Uint8Array.from(v);
  throw hostError("read-failed", "the file could not be read");
}
// A file's bytes (FileSystem.readFile without an encoding).
async function hostReadBytes(path) {
  const v = await hostNeed("FileSystem", "readFile").readFile(path);
  if (typeof v === "string") throw hostError("read-failed", "the file came back as text");
  return hostBytes(v);
}
// A text file (some host builds return text directly, others bytes).
async function hostReadText(path) {
  const v = await hostNeed("FileSystem", "readFile").readFile(path);
  return typeof v === "string" ? v : new TextDecoder().decode(hostBytes(v));
}
// Removes a file with the first of the host's FileSystem removers that works (removeFile, remove, rm, unlink,
// unlinkSync: host builds differ); each is tried only when present, and a failure only leaves the file behind.
async function hostRemove(path) {
  let fs = null;
  try { fs = hostDI()?.FileSystem; } catch { fs = null; }
  if (!fs) return;
  const tries = [["removeFile", () => fs.removeFile({ filePath: path })], ["remove", () => fs.remove(path)], ["rm", () => fs.rm(path)],
    ["unlink", () => fs.unlink(path)], ["unlinkSync", () => fs.unlinkSync(path)]];
  for (const [name, call] of tries) {
    if (typeof fs[name] !== "function") continue;
    try { await call(); return; } catch { /* the next one */ }
  }
}
// The plugin's install folder and its data folder. The install folder is the host's skills folder (the home folder
// joined with .selects, skills and <id>, the same place SELECTS_USER_SKILLS_ROOT names on macOS and Windows) when it
// holds `marker` (a file every install has). `sdk` is unused (kept so callers do not change). The data folder (<home>/.selects/plugin-data/<id>) is created when missing;
// null when this host cannot make it (callers then avoid temporary files). Throws 'not-found' without an install folder.
async function hostRoots(sdk, id, marker) {
  const fs = hostApi("FileSystem", "join", "homedir", "existsSync");
  const holds = (dir) => { try { return !!dir && (!fs || !!fs.existsSync(fs.join(dir, marker))); } catch { return false; } };
  let plugin = null;
  try { if (fs) { const dir = String(fs.join(fs.homedir(), ".selects", "skills", id)); if (holds(dir)) plugin = dir; } } catch { plugin = null; }
  if (!plugin) throw hostError("not-found", "the plugin folder could not be found");
  let data = null;
  try {
    const dfs = hostApi("FileSystem", "join", "homedir", "mkdirSync");
    if (dfs) { data = String(dfs.join(dfs.homedir(), ".selects", "plugin-data", id)); dfs.mkdirSync(data, { recursive: true }); }
  } catch { data = null; }
  return { plugin, data };
}
// Mono 32-bit float samples of an audio file at `rate`, at most `maxSeconds`, decoded by the host's ffmpeg into a
// temporary file in `dataDir` and read back (the file is removed). null when this host has no ffmpeg or no data folder;
// throws when ffmpeg fails or `signal` (optional) aborts it.
async function hostDecodePcm(path, dataDir, rate, maxSeconds, signal, timeoutMs = 120000) {
  const rt = hostApi("Runtime", "runFFmpeg");
  if (!rt || !dataDir || !hostApi("FileSystem", "readFile")) return null;
  const tmp = hostJoin(dataDir, "pcm-" + Date.now() + "-" + Math.floor(Math.random() * 1e6) + ".f32");
  const controller = typeof AbortController === "undefined" ? null : new AbortController();
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  const relay = () => { if (controller) controller.abort(); };
  if (signal) { if (signal.aborted) relay(); else signal.addEventListener("abort", relay); }
  try {
    await rt.runFFmpeg(["-nostdin", "-v", "error", "-y", "-t", String(maxSeconds), "-i", path, "-ac", "1", "-ar", String(rate), "-f", "f32le", tmp], true, controller ? controller.signal : undefined);
    const bytes = await hostReadBytes(tmp);
    // A copy, so the samples sit on a 4-byte boundary.
    const samples = new Float32Array(bytes.slice(0, Math.floor(bytes.byteLength / 4) * 4).buffer);
    if (!samples.length) throw hostError("decode-failed", "ffmpeg returned no audio");
    return samples;
  } finally {
    if (timer) clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", relay);
    await hostRemove(tmp);
  }
}
// An audio or video file's length in seconds from the host's ffprobe, or null.
async function hostProbeSeconds(path) {
  try {
    const rt = hostApi("Runtime", "runFFprobe");
    if (!rt) return null;
    const r = await rt.runFFprobe(["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path], true);
    const v = parseFloat(String(r?.stdout || "").trim());
    return v > 0 ? v : null;
  } catch { return null; }
}
// av-host:end

// hold:start
// Short-video hold (formerly hold_video.py), plain JS on the av-host helpers so tests can run it in node:vm. A selected
// video shorter than the result is re-encoded once at 60 fps with its last frame cloned to the full length, by the
// host's bundled ffmpeg/ffprobe (argv arrays, no shell), into <data>/held-v2. Long videos are never touched. A cache
// entry is keyed by the source path, size and modification time; it is reused only when its metadata matches and
// ffprobe still counts the expected frames. Result: { status: 'converted', fps: 60, durationFrames, videos: [{
// inputIndex, sourcePath, outputPath, sourceWidth, sourceHeight, outputWidth, outputHeight, cacheHit }] }.
const HOLD_FPS = 60, HOLD_MAX_EDGE = 1920, HOLD_MAX_FRAMES = 36000, HOLD_MAX_VIDEOS = 21;
const HOLD_ALGORITHM = 'photo-gallery-hold-v2-max1920-h264-crf18';
function holdError(message) { return Object.assign(new Error(message), { code: 'hold-failed' }); }
// Host paths compared as keys: NFC; a Windows path also gets / separators and is case-folded.
function holdPathKey(path) {
  const text = String(path ?? '').normalize('NFC');
  return /^[A-Za-z]:(?:[\\/]|$)/.test(text) || text.includes('\\') ? text.replace(/\\/g, '/').toLowerCase() : text;
}
// Runs Runtime.runFFmpeg/runFFprobe with a deadline. The host rejects with a JSON string, not an Error.
async function holdTool(kind, argv, seconds) {
  const rt = hostNeed('Runtime', kind);
  const controller = typeof AbortController === 'undefined' ? null : new AbortController();
  const timer = controller ? setTimeout(() => controller.abort(), seconds * 1000) : null;
  try { return await rt[kind](argv, true, controller ? controller.signal : undefined); }
  catch (error) {
    if (controller?.signal.aborted) throw holdError('Media conversion timed out');
    if (error?.code === 'host-missing') throw error;
    throw Object.assign(holdError(kind + ' failed'), { detail: String(error?.message ?? error).slice(0, 600) });
  } finally { if (timer) clearTimeout(timer); }
}
async function holdProbe(path, countFrames = false) {
  let result;
  try {
    result = await holdTool('runFFprobe', ['-v', 'error', ...(countFrames ? ['-count_frames'] : []), '-show_entries',
      'stream=index,codec_type,codec_name,width,height,r_frame_rate,avg_frame_rate,nb_read_frames', '-of', 'json', path], 45);
  } catch (error) { if (error.code === 'host-missing' || /timed out/.test(error.message)) throw error; throw holdError('Video cannot be decoded'); }
  let streams, video;
  try { streams = JSON.parse(String(result?.stdout || '')).streams; video = streams.find(item => item?.codec_type === 'video'); } catch { video = null; }
  if (!video) throw holdError('Media has no readable picture stream');
  if (!Number.isSafeInteger(video.width) || !Number.isSafeInteger(video.height) || video.width <= 0 || video.height <= 0) {
    throw holdError('Media dimensions are unavailable');
  }
  return { video, streams };
}
// The output size: at most 1920 on the long edge, then padded to even sides (as the encode filter does).
function holdDimensions(width, height) {
  const factor = Math.min(1, HOLD_MAX_EDGE / Math.max(width, height));
  // Python's round(): halves go to the even neighbour.
  const round = x => { const r = Math.round(x); return Math.abs(x % 1) === 0.5 && r % 2 ? r - 1 : r; };
  const w = Math.max(1, round(width * factor)), h = Math.max(1, round(height * factor));
  return [w + w % 2, h + h % 2];
}
async function holdValidate(path, frames, dimensions, decode = false) {
  const { video, streams } = await holdProbe(path, true);
  if (streams.length !== 1 || video.codec_name !== 'h264') throw holdError('Cached video has the wrong stream format');
  if (video.r_frame_rate !== '60/1' || video.avg_frame_rate !== '60/1') throw holdError('Cached video has the wrong frame rate');
  if (video.nb_read_frames !== String(frames)) throw holdError('Cached video has the wrong frame count');
  if (video.width !== dimensions[0] || video.height !== dimensions[1]) throw holdError('Cached video has the wrong dimensions');
  if (decode) {
    try { await holdTool('runFFmpeg', ['-nostdin', '-v', 'error', '-xerror', '-i', path, '-f', 'null', '-'], Math.max(60, Math.floor(frames / HOLD_FPS) * 5 + 30)); }
    catch (error) { if (/timed out/.test(error.message)) throw error; throw holdError('Generated video contains undecodable frames'); }
  }
  return video;
}
// { size, mtimeMs } of a file (FileSystem.statSync crosses IPC, so only its plain fields are used), or null.
function holdStat(path) {
  try {
    const stat = hostNeed('FileSystem', 'statSync').statSync(path);
    return stat && Number.isFinite(stat.size) ? { size: stat.size, mtimeMs: Number(stat.mtimeMs) || 0 } : null;
  } catch (error) { if (error?.code === 'host-missing') throw error; return null; }
}
async function holdKey(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
async function holdEncode(source, target, frames) {
  const scale = 'scale=w=\'min(iw,' + HOLD_MAX_EDGE + ')\':h=\'min(ih,' + HOLD_MAX_EDGE + ')\':' +
    'force_original_aspect_ratio=decrease:flags=lanczos,pad=ceil(iw/2)*2:ceil(ih/2)*2:0:0:black,setsar=1';
  // -write_tmcd 0: a source's timecode tag would otherwise add a tmcd data track, failing the one-stream check.
  const filters = 'fps=' + HOLD_FPS + ',tpad=stop_mode=clone:stop_duration=' + (frames / HOLD_FPS + 1).toFixed(6) + ',' + scale;
  try {
    await holdTool('runFFmpeg', ['-nostdin', '-v', 'error', '-y', '-i', source, '-vf', filters, '-an', '-frames:v', String(frames),
      '-r', String(HOLD_FPS), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart', '-write_tmcd', '0', '-metadata', 'creation_time=', '-f', 'mp4', target], Math.max(90, Math.min(900, Math.floor(frames / HOLD_FPS) * 8 + 60)));
  } catch (error) { if (/timed out/.test(error.message)) throw error; throw holdError('ffmpeg could not extend the short video'); }
}
async function holdCached(videoPath, metaPath, identity, frames, dimensions) {
  const fs = hostNeed('FileSystem', 'existsSync');
  try {
    if (!fs.existsSync(videoPath) || !fs.existsSync(metaPath)) return false;
    const data = JSON.parse(await hostReadText(metaPath));
    const stat = holdStat(videoPath);
    if (data?.algorithm !== HOLD_ALGORITHM || data.sourceSize !== identity.size || data.sourceMtimeMs !== identity.mtimeMs ||
        data.durationFrames !== frames || JSON.stringify(data.outputDimensions) !== JSON.stringify(dimensions) ||
        !stat || data.outputSize !== stat.size) return false;
    await holdValidate(videoPath, frames, dimensions);
    return true;
  } catch (error) { if (error?.code === 'host-missing') throw error; return false; }
}
async function holdConvertOne(source, identity, sourceDimensions, frames, cacheRoot) {
  const key = await holdKey([HOLD_ALGORITHM, holdPathKey(source), identity.size, identity.mtimeMs, frames, HOLD_FPS].join('\0'));
  const videoPath = hostJoin(cacheRoot, key + '.mp4'), metaPath = hostJoin(cacheRoot, key + '.json');
  const dimensions = holdDimensions(sourceDimensions[0], sourceDimensions[1]);
  if (await holdCached(videoPath, metaPath, identity, frames, dimensions)) return { videoPath, dimensions, reused: true };
  const fs = hostNeed('FileSystem', 'renameSync');
  const writer = hostNeed('FileSystem', 'writeFile');
  const stamp = Date.now() + '-' + Math.floor(Math.random() * 1e6);
  const temporary = hostJoin(cacheRoot, '.' + key + '-' + stamp + '.mp4.tmp');
  const temporaryMeta = hostJoin(cacheRoot, '.' + key + '-' + stamp + '.json.tmp');
  const unchanged = () => { const now = holdStat(source); return !!now && now.size === identity.size && now.mtimeMs === identity.mtimeMs; };
  try {
    await holdEncode(source, temporary, frames);
    if (!unchanged()) throw holdError('A video changed during extension');
    await holdValidate(temporary, frames, dimensions, true);
    const output = holdStat(temporary);
    if (!output) throw holdError('ffmpeg could not extend the short video');
    await writer.writeFile(temporaryMeta, JSON.stringify({ algorithm: HOLD_ALGORITHM, sourceSize: identity.size,
      sourceMtimeMs: identity.mtimeMs, durationFrames: frames, outputDimensions: dimensions, outputSize: output.size }));
    fs.renameSync(temporary, videoPath);
    fs.renameSync(temporaryMeta, metaPath);
  } finally {
    await hostRemove(temporary);
    await hostRemove(temporaryMeta);
  }
  return { videoPath, dimensions, reused: false };
}
// `request` is { videos: [{ path }], durationFrames }; `dataDir` is the plugin's data folder.
async function holdVideos(request, dataDir) {
  const videos = request?.videos, frames = request?.durationFrames;
  if (!Array.isArray(videos) || videos.length < 1 || videos.length > HOLD_MAX_VIDEOS) throw holdError('Provide between 1 and 21 short videos');
  if (!Number.isSafeInteger(frames) || frames < 1 || frames > HOLD_MAX_FRAMES) throw holdError('durationFrames must be a positive integer at most 36000');
  if (!dataDir) throw holdError('The plugin data folder is unavailable');
  hostNeed('Runtime', 'runFFmpeg'); hostNeed('Runtime', 'runFFprobe');
  const cacheRoot = hostJoin(dataDir, 'held-v2');
  hostNeed('FileSystem', 'mkdirSync').mkdirSync(cacheRoot, { recursive: true });
  const exists = hostNeed('FileSystem', 'existsSync');
  const completed = new Map(), output = [];
  for (let index = 0; index < videos.length; index++) {
    const raw = videos[index]?.path;
    if (typeof raw !== 'string') throw holdError('Video ' + (index + 1) + ' needs a file path');
    if (!raw || raw.includes('\0') || raw.length > 8192) throw holdError('Video ' + (index + 1) + ' has an invalid path');
    try {
      const identity = exists.existsSync(raw) ? holdStat(raw) : null;
      if (!identity) throw holdError('Video is missing');
      const id = holdPathKey(raw) + '\0' + identity.size + '\0' + identity.mtimeMs;
      if (!completed.has(id)) {
        const { video } = await holdProbe(raw, true);
        if (!(Number(video.nb_read_frames) >= 1)) throw holdError('Video has no readable frames');
        const sourceDimensions = [video.width, video.height];
        const done = await holdConvertOne(raw, identity, sourceDimensions, frames, cacheRoot);
        completed.set(id, { ...done, sourceDimensions });
      }
      const done = completed.get(id);
      output.push({ inputIndex: index, sourcePath: raw, outputPath: done.videoPath, sourceWidth: done.sourceDimensions[0],
        sourceHeight: done.sourceDimensions[1], outputWidth: done.dimensions[0], outputHeight: done.dimensions[1], cacheHit: done.reused });
    } catch (error) {
      if (error?.code === 'host-missing') throw error;
      throw Object.assign(holdError('Video ' + (index + 1) + ': ' + String(error?.message || error)), { detail: error?.detail });
    }
  }
  return { status: 'converted', fps: HOLD_FPS, durationFrames: frames, videos: output };
}
// hold:end

// tempo:start
// Bounded local BPM suggestion (formerly tempo.py), plain JS so tests can run it in node:vm. The first 30 s are
// decoded by the host's ffmpeg to mono samples at 11025 Hz (hostDecodePcm), quantized to 16-bit as tempo.py read
// them, then a ~10 ms RMS onset envelope is autocorrelated over 70-180 BPM. Ambiguous or silent input yields no BPM.
const TEMPO_RATE = 11025, TEMPO_HOP = 110, TEMPO_MIN_BPM = 70, TEMPO_MAX_BPM = 180, TEMPO_SECONDS = 30;
// Python's round(): halves go to the even neighbour.
function tempoRoundEven(x) { const r = Math.round(x); return Math.abs(x % 1) === 0.5 && r % 2 ? r - 1 : r; }
// `samples`: mono floats in [-1, 1] at TEMPO_RATE. Returns { status: 'estimated', bpm } or { status: 'uncertain', reason }.
function tempoEstimate(samples) {
  if (samples.length < TEMPO_RATE * 6) return { status: 'uncertain', reason: 'At least six seconds of audio are needed' };
  const pcm = Int16Array.from(samples, x => Math.max(-32768, Math.min(32767, tempoRoundEven(x * 32768))));
  const energy = [];
  for (let start = 0; start + TEMPO_HOP <= pcm.length; start += TEMPO_HOP) {
    let sum = 0;
    for (let i = start; i < start + TEMPO_HOP; i++) sum += pcm[i] * pcm[i];
    energy.push(Math.sqrt(sum / TEMPO_HOP));
  }
  const onset = [];
  for (let i = 1; i < energy.length; i++) onset.push(Math.max(0, energy[i] - energy[i - 1]));
  if (onset.reduce((sum, v) => sum + v * v, 0) < 1) return { status: 'uncertain', reason: 'No detectable rhythmic audio' };
  const lowerLag = tempoRoundEven(60 * TEMPO_RATE / (TEMPO_MAX_BPM * TEMPO_HOP));
  const upperLag = tempoRoundEven(60 * TEMPO_RATE / (TEMPO_MIN_BPM * TEMPO_HOP));
  const scores = [];
  for (let lag = lowerLag; lag <= upperLag; lag++) {
    const bpm = 60 * TEMPO_RATE / (lag * TEMPO_HOP);
    if (bpm < TEMPO_MIN_BPM || bpm > TEMPO_MAX_BPM) continue;
    let numerator = 0, left = 0, right = 0;
    for (let i = 0; i + lag < onset.length; i++) {
      numerator += onset[i] * onset[i + lag]; left += onset[i] * onset[i]; right += onset[i + lag] * onset[i + lag];
    }
    scores.push([left > 0 && right > 0 ? numerator / Math.sqrt(left * right) : 0, bpm, lag]);
  }
  // Highest correlation first; ties go to the higher BPM, then the larger lag (Python's reverse tuple sort).
  scores.sort((a, b) => b[0] - a[0] || b[1] - a[1] || b[2] - a[2]);
  const best = scores[0];
  // A doubled interval repeats the same pulse; it is not independent evidence for a different tempo.
  const unrelated = lag => Math.abs(lag - best[2]) > 4 && Math.abs(lag - 2 * best[2]) > 1 && Math.abs(best[2] - 2 * lag) > 1;
  const runnerUp = scores.filter(entry => unrelated(entry[2])).reduce((max, entry) => Math.max(max, entry[0]), 0);
  if (best[0] < 0.12 || best[0] < runnerUp * 1.08) return { status: 'uncertain', reason: 'Tempo is ambiguous; enter BPM manually' };
  return { status: 'estimated', bpm: tempoRoundEven(best[1] * 10) / 10 };
}
// The estimate for an audio file, decoded through the host's ffmpeg into `dataDir`; never throws for bad audio.
async function tempoOfFile(path, dataDir) {
  let samples;
  try { samples = await hostDecodePcm(path, dataDir, TEMPO_RATE, TEMPO_SECONDS, undefined, 45000); }
  catch (error) {
    if (error?.code === 'host-missing') throw error;
    return { status: 'uncertain', reason: 'Audio could not be decoded' };
  }
  if (!samples) return { status: 'uncertain', reason: 'This Selects build cannot decode audio for the estimate' };
  return tempoEstimate(samples);
}
// tempo:end

const SLOT_KEYS = Array.from({ length: 21 }, (_, i) => `tile-${String(i + 1).padStart(2, '0')}`);
const REFERENCE_VIDEO_SLOTS = new Set([4, 6, 11, 17, 19, 21]);
const emptySlots = () => SLOT_KEYS.map(() => ({ resourceId: '', focusX: 0.5, focusY: 0.5 }));
// `preparing.say` is whoever is showing progress at the time (the Panel or a template run).
const preparing = { say: null };
const STRINGS = {
  "ko": {
    "title": "Photo Grid Reveal",
    "description": "3\uc5f4 \u00d7 7\ud589\uc774 \ucc28\ub840\ub85c \ucc44\uc6cc\uc9c0\uace0 \uc804\uccb4\uac00 \ud751\ubc31\uc5d0\uc11c \uceec\ub7ec\ub85c \ubc14\ub01d\ub2c8\ub2e4. \uc0c8 \ud3b8\uc9d1\ubcf8\uc758 21\uce78\uc5d0 \uc0ac\uc9c4\uacfc \uc601\uc0c1\uc744 \uac01\uac01 \uc9c0\uc815\ud569\ub2c8\ub2e4.",
    "noProject": "\uba3c\uc800 \ud504\ub85c\uc81d\ud2b8\ub97c \uc5ec\uc138\uc694.",
    "load": "\ud504\ub85c\uc81d\ud2b8 \ubbf8\ub514\uc5b4 \ubd88\ub7ec\uc624\uae30",
    "changed": "\ud504\ub85c\uc81d\ud2b8 \ub610\ub294 \ud3b8\uc9d1\ubcf8\uc774 \ubc14\ub00c\uc5c8\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \ubd88\ub7ec\uc624\uc138\uc694.",
    "createMode": "\uc0c8 \ud3b8\uc9d1\ubcf8",
    "slot": "\uce78",
    "media": "\uc0ac\uc9c4 \ub610\ub294 \uc601\uc0c1",
    "choose": "\ubbf8\ub514\uc5b4 \uc120\ud0dd",
    "noMedia": "\ud504\ub85c\uc81d\ud2b8\uc5d0 \uc0ac\uc9c4 \ub610\ub294 \uc601\uc0c1\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.",
    "assigned": "\uc9c0\uc815\ud55c \uce78",
    "fill": "21\uac1c\ub97c \ubaa9\ub85d \uc21c\uc11c\ub85c \uc9c0\uc815",
    "fillHint": "\uc0ac\uc9c4 21\uac1c\uac00 \uc788\uc73c\uba74 \uc0ac\uc9c4\uc744 \uc6b0\uc120\ud569\ub2c8\ub2e4. \uac19\uc740 \ubbf8\ub514\uc5b4\ub97c \uc5ec\ub7ec \uce78\uc5d0 \uc4f0\ub824\uba74 \uac01 \uce78\uc5d0\uc11c \uc9c1\uc811 \uace0\ub974\uc138\uc694.",
    "referenceMix": "\uc6d0\ubcf8 \uc6c0\uc9c1\uc784 \uad6c\uc131\uc73c\ub85c \uc9c0\uc815 (\uc0ac\uc9c4 15 + \uc601\uc0c1 6)",
    "motionMissing": "\uc6d0\ubcf8\uc5d0\uc11c\ub294 \ub2e4\uc74c \uce78\uc774 \uc6c0\uc9c1\uc785\ub2c8\ub2e4. \ud604\uc7ac \uc0ac\uc9c4\uc73c\ub85c \uc9c0\uc815\ub41c \uce78: ",
    "focusX": "\uac00\ub85c \ucd08\uc810",
    "focusY": "\uc138\ub85c \ucd08\uc810",
    "editLimits": "\uc0dd\uc131\ub41c 21\uce78\uc740 Selects \ud0c0\uc784\ub77c\uc778\uc5d0\uc11c \uac01\uac01 \ud3b8\uc9d1\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4. \ud50c\ub7ec\uadf8\uc778\uc758 \uae30\uc874 \ud3b8\uc9d1\ubcf8 \ud55c \uce78\ub9cc \ubc14\uafb8\uae30\ub294 \uc544\uc9c1 \uc9c0\uc6d0\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.",
    "music": "\uc74c\uc545",
    "noMusic": "\uc74c\uc545 \uc5c6\uc74c",
    "bpmManual": "BPM \uc9c1\uc811 \uc9c0\uc815",
    "bpm": "BPM",
    "estimate": "\uc74c\uc545 BPM \ucd94\uc815",
    "estimated": "\ucd94\uc815 BPM",
    "uncertain": "BPM\uc744 \ud655\uc2e4\ud788 \ucd94\uc815\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. \uc9c1\uc811 \uc785\ub825\ud574 \uc8fc\uc138\uc694.",
    "duration": "\uc601\uc0c1 \uae38\uc774",
    "durationNote": "\uae30\ubcf8 14.217\ucd08 \u00b7 60fps. \uc74c\uc545\uc744 \uace0\ub974\uba74 \uc774 \uae38\uc774\ub97c \ucc44\uc6b8 \uc218 \uc788\uc5b4\uc57c \ud569\ub2c8\ub2e4.",
    "name": "\ud3b8\uc9d1\ubcf8 \uc774\ub984",
    "create": "\uc0c8 \ud3b8\uc9d1\ubcf8 \ub9cc\ub4e4\uae30",
    "busy": "\ucc98\ub9ac \uc911\u2026",
    "missing": "21\uac1c \uce78\uc5d0 \ubbf8\ub514\uc5b4\ub97c \uc815\ud655\ud788 \uc9c0\uc815\ud574 \uc8fc\uc138\uc694.",
    "bpmMissing": "\uc74c\uc545\uc744 \uc120\ud0dd\ud558\uac70\ub098 BPM\uc744 \uc9c1\uc811 \uc785\ub825\ud574 \uc8fc\uc138\uc694.",
    "saved": "\uc800\uc7a5\ud588\uc2b5\ub2c8\ub2e4. \uc2e4\uc81c \uc7ac\uc0dd\uacfc \ub0b4\ubcf4\ub0b4\uae30\ub294 \ubcc4\ub3c4\ub85c \ud655\uc778\ud574 \uc8fc\uc138\uc694.",
    "readback": "\uc800\uc7a5 \ud6c4 \ud3b8\uc9d1\ubcf8\uc758 21\uce78\uc744 \ub2e4\uc2dc \ud655\uc778\ud588\uc2b5\ub2c8\ub2e4. \uc7ac\uc0dd\uacfc \ub0b4\ubcf4\ub0b4\uae30\ub294 \ubcc4\ub3c4 \uac80\uc99d\uc774 \ud544\uc694\ud569\ub2c8\ub2e4.",
    "readbackMismatch": "\uc800\uc7a5 \ud6c4 \uc694\uccad\ud55c \uce78 \uac12\uc744 \ud655\uc778\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. \ub3d9\uc77c\ud55c \uc791\uc5c5\uc744 \ubc18\ubcf5\ud558\uc9c0 \ub9d0\uace0 \ud3b8\uc9d1\ubcf8\uc744 \ud655\uc778\ud574 \uc8fc\uc138\uc694.",
    "failed": "\uc791\uc5c5\uc744 \ub9c8\uce58\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.",
    "unknown": "\uc800\uc7a5 \uc5ec\ubd80\ub97c \ud655\uc778\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4. \uac19\uc740 \uc791\uc5c5\uc744 \ub2e4\uc2dc \uc2e4\ud589\ud558\uc9c0 \ub9d0\uace0 \ud3b8\uc9d1\ubcf8\uc744 \ud655\uc778\ud574 \uc8fc\uc138\uc694.",
    "openSaved": "\uc800\uc7a5\ud55c \ud3b8\uc9d1\ubcf8 \uc5f4\uae30",
    "musicSource": "\ucd9c\ucc98",
    "musicCredit": "\uc601\uc0c1\uc744 \uacf5\uc720\ud560 \ub54c \uc774 \ud06c\ub808\ub527\uc744 \ud568\uaed8 \ud45c\uae30\ud558\uc138\uc694. 39.650\u201353.867\ucd08 \ubc1c\ucdcc, \ubcfc\ub968 \u22123.090 dB, \uc18d\ub3c4 \ubcc0\uacbd \uc5c6\uc74c."
  },
  "en": {
    "title": "Photo Grid Reveal",
    "description": "A 3 \u00d7 7 gallery fills in order, then all tiles switch from monochrome to color. Assign a photo or video to each tile when creating a Draft.",
    "noProject": "Open a project first.",
    "load": "Load project media",
    "changed": "The project or Draft changed. Reload its media.",
    "createMode": "New Draft",
    "slot": "Tile",
    "media": "Photo or video",
    "choose": "Choose media",
    "noMedia": "No photos or videos in this project.",
    "assigned": "Assigned tiles",
    "fill": "Assign all 21 in listed order",
    "fillHint": "When there are 21 photos, they take priority. To reuse an item, choose it for each tile explicitly.",
    "referenceMix": "Assign reference mix",
    "motionMissing": "The reference moves in these tiles, which currently contain still photos: ",
    "focusX": "Horizontal focus",
    "focusY": "Vertical focus",
    "editLimits": "Each of the 21 tiles can be edited in the Selects timeline. Plugin-guided single-tile replacement is not yet available.",
    "music": "Music",
    "noMusic": "No music",
    "bpmManual": "Enter BPM manually",
    "bpm": "BPM",
    "estimate": "Estimate music BPM",
    "estimated": "Estimated BPM",
    "uncertain": "Could not estimate BPM reliably. Enter it manually.",
    "duration": "Video length",
    "durationNote": "Default 14.217 seconds at 60 fps. Music must cover this length.",
    "name": "Draft name",
    "create": "Create Draft",
    "busy": "Working\u2026",
    "missing": "Assign media to exactly 21 tiles.",
    "bpmMissing": "Select music or enter BPM manually.",
    "saved": "Saved. Check actual playback and export separately.",
    "readback": "Saved and read back all 21 tiles. Playback and export still need separate checks.",
    "readbackMismatch": "Saved, but the requested tile values were not verified. Inspect the Draft before repeating this action.",
    "failed": "Could not complete the action.",
    "unknown": "Save outcome is unknown. Inspect the Draft before repeating this action.",
    "openSaved": "Open saved Draft",
    "musicSource": "Source",
    "musicCredit": "Keep this credit with shared videos. Excerpt 39.650\u201353.867 s; gain \u22123.090 dB; no tempo change."
  },
  "de": {
    "title": "Photo Grid Reveal",
    "description": "Ein 3\u00d77-Raster f\u00fcllt sich nacheinander; danach wechseln alle Felder von Schwarzwei\u00df zu Farbe. W\u00e4hlen Sie f\u00fcr jedes Feld ein Foto oder Video.",
    "noProject": "\u00d6ffnen Sie zuerst ein Projekt.",
    "load": "Projektmedien laden",
    "changed": "Projekt oder Entwurf ge\u00e4ndert. Medien erneut laden.",
    "createMode": "Neuer Entwurf",
    "slot": "Feld",
    "media": "Foto oder Video",
    "choose": "Medium w\u00e4hlen",
    "noMedia": "Keine Fotos oder Videos im Projekt.",
    "assigned": "Belegte Felder",
    "fill": "Alle 21 in Listenreihenfolge zuweisen",
    "fillHint": "Bei 21 Fotos werden diese bevorzugt. W\u00e4hlen Sie wiederverwendete Medien ausdr\u00fccklich f\u00fcr jedes Feld.",
    "referenceMix": "Referenzmischung zuweisen",
    "motionMissing": "Diese bewegten Referenzfelder enthalten aktuell Fotos: ",
    "focusX": "Horizontaler Fokus",
    "focusY": "Vertikaler Fokus",
    "editLimits": "Alle 21 Felder sind in der Selects-Timeline editierbar. Einzelne Felder lassen sich noch nicht \u00fcber das Plugin ersetzen.",
    "music": "Musik",
    "noMusic": "Keine Musik",
    "bpmManual": "BPM manuell eingeben",
    "bpm": "BPM",
    "estimate": "Musik-BPM sch\u00e4tzen",
    "estimated": "Gesch\u00e4tzte BPM",
    "uncertain": "BPM nicht zuverl\u00e4ssig ermittelt. Bitte manuell eingeben.",
    "duration": "Videol\u00e4nge",
    "durationNote": "Standard: 14,217 Sekunden bei 60 fps. Die Musik muss diese L\u00e4nge abdecken.",
    "name": "Entwurfsname",
    "create": "Entwurf erstellen",
    "busy": "In Bearbeitung\u2026",
    "missing": "Weisen Sie genau 21 Feldern Medien zu.",
    "bpmMissing": "Musik w\u00e4hlen oder BPM manuell eingeben.",
    "saved": "Gespeichert. Wiedergabe und Export separat pr\u00fcfen.",
    "readback": "Alle 21 Felder gespeichert und erneut gelesen. Wiedergabe und Export separat pr\u00fcfen.",
    "readbackMismatch": "Gespeichert, aber Feldwerte nicht best\u00e4tigt. Vor erneutem Ausf\u00fchren den Entwurf pr\u00fcfen.",
    "failed": "Aktion konnte nicht abgeschlossen werden.",
    "unknown": "Speicherergebnis unbekannt. Vor erneutem Ausf\u00fchren den Entwurf pr\u00fcfen.",
    "openSaved": "Gespeicherten Entwurf \u00f6ffnen",
    "musicSource": "Quelle",
    "musicCredit": "Diesen Hinweis mit geteilten Videos beibehalten. Ausschnitt 39,650\u201353,867 s; Pegel \u22123,090 dB; Tempo unver\u00e4ndert."
  },
  "es": {
    "title": "Photo Grid Reveal",
    "description": "Una cuadr\u00edcula de 3\u00d77 se llena en orden y luego cambia de blanco y negro a color. Asigna una foto o v\u00eddeo a cada celda.",
    "noProject": "Abre primero un proyecto.",
    "load": "Cargar medios del proyecto",
    "changed": "El proyecto o borrador cambi\u00f3. Vuelve a cargar los medios.",
    "createMode": "Nuevo borrador",
    "slot": "Celda",
    "media": "Foto o v\u00eddeo",
    "choose": "Elegir medio",
    "noMedia": "No hay fotos ni v\u00eddeos en este proyecto.",
    "assigned": "Celdas asignadas",
    "fill": "Asignar las 21 en orden de lista",
    "fillHint": "Se priorizan las fotos si hay 21. Para reutilizar un medio, el\u00edgelo expl\u00edcitamente en cada celda.",
    "referenceMix": "Asignar mezcla de referencia",
    "motionMissing": "Estas celdas m\u00f3viles de la referencia contienen fotos: ",
    "focusX": "Enfoque horizontal",
    "focusY": "Enfoque vertical",
    "editLimits": "Las 21 celdas se editan en la l\u00ednea de tiempo de Selects. El plugin a\u00fan no permite sustituir una sola celda.",
    "music": "M\u00fasica",
    "noMusic": "Sin m\u00fasica",
    "bpmManual": "Introducir BPM manualmente",
    "bpm": "BPM",
    "estimate": "Estimar BPM de la m\u00fasica",
    "estimated": "BPM estimados",
    "uncertain": "No se pudo estimar el BPM con fiabilidad. Introd\u00facelo manualmente.",
    "duration": "Duraci\u00f3n del v\u00eddeo",
    "durationNote": "Predeterminado: 14,217 segundos a 60 fps. La m\u00fasica debe cubrir esta duraci\u00f3n.",
    "name": "Nombre del borrador",
    "create": "Crear borrador",
    "busy": "Procesando\u2026",
    "missing": "Asigna medios a exactamente 21 celdas.",
    "bpmMissing": "Selecciona m\u00fasica o introduce BPM manualmente.",
    "saved": "Guardado. Comprueba reproducci\u00f3n y exportaci\u00f3n por separado.",
    "readback": "Las 21 celdas se guardaron y volvieron a leer. Comprueba reproducci\u00f3n y exportaci\u00f3n por separado.",
    "readbackMismatch": "Guardado, pero los valores no se verificaron. Revisa el borrador antes de repetir.",
    "failed": "No se pudo completar la acci\u00f3n.",
    "unknown": "No se conoce el resultado del guardado. Revisa el borrador antes de repetir.",
    "openSaved": "Abrir borrador guardado",
    "musicSource": "Fuente",
    "musicCredit": "Conserva este cr\u00e9dito al compartir v\u00eddeos. Fragmento 39,650\u201353,867 s; ganancia \u22123,090 dB; sin cambio de tempo."
  },
  "fr": {
    "title": "Photo Grid Reveal",
    "description": "Une grille de 3\u00d77 se remplit dans l\u2019ordre, puis passe du noir et blanc \u00e0 la couleur. Choisissez une photo ou vid\u00e9o par case.",
    "noProject": "Ouvrez d\u2019abord un projet.",
    "load": "Charger les m\u00e9dias du projet",
    "changed": "Le projet ou brouillon a chang\u00e9. Rechargez les m\u00e9dias.",
    "createMode": "Nouveau brouillon",
    "slot": "Case",
    "media": "Photo ou vid\u00e9o",
    "choose": "Choisir un m\u00e9dia",
    "noMedia": "Ce projet ne contient aucune photo ni vid\u00e9o.",
    "assigned": "Cases attribu\u00e9es",
    "fill": "Attribuer les 21 dans l\u2019ordre de la liste",
    "fillHint": "Les 21 photos sont prioritaires si pr\u00e9sentes. Choisissez explicitement chaque r\u00e9utilisation dans sa case.",
    "referenceMix": "Attribuer le m\u00e9lange de r\u00e9f\u00e9rence",
    "motionMissing": "Ces cases anim\u00e9es de la r\u00e9f\u00e9rence contiennent des photos : ",
    "focusX": "Cadrage horizontal",
    "focusY": "Cadrage vertical",
    "editLimits": "Les 21 cases sont modifiables dans la timeline Selects. Le plugin ne remplace pas encore une seule case.",
    "music": "Musique",
    "noMusic": "Sans musique",
    "bpmManual": "Saisir le BPM manuellement",
    "bpm": "BPM",
    "estimate": "Estimer le BPM de la musique",
    "estimated": "BPM estim\u00e9",
    "uncertain": "Estimation du BPM incertaine. Saisissez-le manuellement.",
    "duration": "Dur\u00e9e de la vid\u00e9o",
    "durationNote": "Par d\u00e9faut : 14,217 secondes \u00e0 60 fps. La musique doit couvrir cette dur\u00e9e.",
    "name": "Nom du brouillon",
    "create": "Cr\u00e9er le brouillon",
    "busy": "En cours\u2026",
    "missing": "Attribuez des m\u00e9dias \u00e0 exactement 21 cases.",
    "bpmMissing": "Choisissez une musique ou saisissez le BPM.",
    "saved": "Enregistr\u00e9. V\u00e9rifiez s\u00e9par\u00e9ment la lecture et l\u2019export.",
    "readback": "Les 21 cases sont enregistr\u00e9es et relues. V\u00e9rifiez s\u00e9par\u00e9ment la lecture et l\u2019export.",
    "readbackMismatch": "Enregistr\u00e9, mais les valeurs ne sont pas v\u00e9rifi\u00e9es. Inspectez le brouillon avant de recommencer.",
    "failed": "Impossible de terminer l\u2019action.",
    "unknown": "R\u00e9sultat d\u2019enregistrement inconnu. Inspectez le brouillon avant de recommencer.",
    "openSaved": "Ouvrir le brouillon enregistr\u00e9",
    "musicSource": "Source",
    "musicCredit": "Conservez ce cr\u00e9dit avec les vid\u00e9os partag\u00e9es. Extrait 39,650\u201353,867 s ; gain \u22123,090 dB ; tempo inchang\u00e9."
  },
  "it": {
    "title": "Photo Grid Reveal",
    "description": "Una griglia 3\u00d77 si riempie in ordine, poi passa dal bianco e nero al colore. Assegna una foto o un video a ogni riquadro.",
    "noProject": "Apri prima un progetto.",
    "load": "Carica i media del progetto",
    "changed": "Il progetto o la bozza \u00e8 cambiato. Ricarica i media.",
    "createMode": "Nuova bozza",
    "slot": "Riquadro",
    "media": "Foto o video",
    "choose": "Scegli media",
    "noMedia": "Nessuna foto o video nel progetto.",
    "assigned": "Riquadri assegnati",
    "fill": "Assegna tutti i 21 nell\u2019ordine dell\u2019elenco",
    "fillHint": "Se ci sono 21 foto, hanno priorit\u00e0. Scegli esplicitamente il media in ogni riquadro per riutilizzarlo.",
    "referenceMix": "Assegna combinazione di riferimento",
    "motionMissing": "Questi riquadri animati del riferimento contengono foto: ",
    "focusX": "Fuoco orizzontale",
    "focusY": "Fuoco verticale",
    "editLimits": "Tutti i 21 riquadri sono modificabili nella timeline di Selects. Il plugin non sostituisce ancora un singolo riquadro.",
    "music": "Musica",
    "noMusic": "Nessuna musica",
    "bpmManual": "Inserisci BPM manualmente",
    "bpm": "BPM",
    "estimate": "Stima BPM della musica",
    "estimated": "BPM stimati",
    "uncertain": "Impossibile stimare i BPM in modo affidabile. Inseriscili manualmente.",
    "duration": "Durata del video",
    "durationNote": "Predefinita: 14,217 secondi a 60 fps. La musica deve coprire questa durata.",
    "name": "Nome della bozza",
    "create": "Crea bozza",
    "busy": "Elaborazione\u2026",
    "missing": "Assegna media a esattamente 21 riquadri.",
    "bpmMissing": "Seleziona musica o inserisci BPM manualmente.",
    "saved": "Salvato. Verifica riproduzione ed esportazione separatamente.",
    "readback": "I 21 riquadri sono salvati e riletti. Verifica riproduzione ed esportazione separatamente.",
    "readbackMismatch": "Salvato, ma i valori non sono verificati. Controlla la bozza prima di ripetere.",
    "failed": "Impossibile completare l\u2019azione.",
    "unknown": "Esito del salvataggio sconosciuto. Controlla la bozza prima di ripetere.",
    "openSaved": "Apri bozza salvata",
    "musicSource": "Fonte",
    "musicCredit": "Mantieni questi crediti nei video condivisi. Estratto 39,650\u201353,867 s; guadagno \u22123,090 dB; tempo invariato."
  },
  "ja": {
    "title": "Photo Grid Reveal",
    "description": "3\u5217\u00d77\u884c\u3092\u9806\u756a\u306b\u8868\u793a\u3057\u3001\u3059\u3079\u3066\u306e\u67a0\u304c\u30e2\u30ce\u30af\u30ed\u304b\u3089\u30ab\u30e9\u30fc\u306b\u5207\u308a\u66ff\u308f\u308a\u307e\u3059\u3002\u5404\u67a0\u306b\u5199\u771f\u307e\u305f\u306f\u52d5\u753b\u3092\u6307\u5b9a\u3057\u307e\u3059\u3002",
    "noProject": "\u5148\u306b\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u3092\u958b\u3044\u3066\u304f\u3060\u3055\u3044\u3002",
    "load": "\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u306e\u30e1\u30c7\u30a3\u30a2\u3092\u8aad\u307f\u8fbc\u3080",
    "changed": "\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u307e\u305f\u306f\u4e0b\u66f8\u304d\u304c\u5909\u308f\u308a\u307e\u3057\u305f\u3002\u518d\u8aad\u307f\u8fbc\u307f\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    "createMode": "\u65b0\u3057\u3044\u4e0b\u66f8\u304d",
    "slot": "\u67a0",
    "media": "\u5199\u771f\u307e\u305f\u306f\u52d5\u753b",
    "choose": "\u30e1\u30c7\u30a3\u30a2\u3092\u9078\u629e",
    "noMedia": "\u3053\u306e\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u306b\u5199\u771f\u3084\u52d5\u753b\u306f\u3042\u308a\u307e\u305b\u3093\u3002",
    "assigned": "\u6307\u5b9a\u6e08\u307f\u306e\u67a0",
    "fill": "\u4e00\u89a7\u9806\u306b21\u67a0\u3059\u3079\u3066\u3092\u6307\u5b9a",
    "fillHint": "\u5199\u771f\u304c21\u679a\u3042\u308b\u5834\u5408\u306f\u5199\u771f\u3092\u512a\u5148\u3057\u307e\u3059\u3002\u518d\u5229\u7528\u3059\u308b\u30e1\u30c7\u30a3\u30a2\u306f\u5404\u67a0\u3067\u660e\u793a\u7684\u306b\u9078\u629e\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    "referenceMix": "\u53c2\u7167\u3068\u540c\u3058\u69cb\u6210\u3092\u6307\u5b9a",
    "motionMissing": "\u53c2\u7167\u3067\u306f\u52d5\u3044\u3066\u3044\u308b\u6b21\u306e\u67a0\u306b\u9759\u6b62\u5199\u771f\u304c\u6307\u5b9a\u3055\u308c\u3066\u3044\u307e\u3059\uff1a",
    "focusX": "\u6a2a\u65b9\u5411\u306e\u7126\u70b9",
    "focusY": "\u7e26\u65b9\u5411\u306e\u7126\u70b9",
    "editLimits": "21\u67a0\u306fSelects\u30bf\u30a4\u30e0\u30e9\u30a4\u30f3\u3067\u500b\u5225\u306b\u7de8\u96c6\u3067\u304d\u307e\u3059\u3002\u30d7\u30e9\u30b0\u30a4\u30f3\u306b\u3088\u308b1\u67a0\u3060\u3051\u306e\u7f6e\u63db\u306f\u672a\u5bfe\u5fdc\u3067\u3059\u3002",
    "music": "\u97f3\u697d",
    "noMusic": "\u97f3\u697d\u306a\u3057",
    "bpmManual": "BPM\u3092\u624b\u52d5\u5165\u529b",
    "bpm": "BPM",
    "estimate": "\u97f3\u697d\u306eBPM\u3092\u63a8\u5b9a",
    "estimated": "\u63a8\u5b9aBPM",
    "uncertain": "BPM\u3092\u78ba\u5b9f\u306b\u63a8\u5b9a\u3067\u304d\u307e\u305b\u3093\u3002\u624b\u52d5\u3067\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    "duration": "\u52d5\u753b\u306e\u9577\u3055",
    "durationNote": "\u521d\u671f\u5024\u306f60fps\u306714.217\u79d2\u3002\u97f3\u697d\u306f\u3053\u306e\u9577\u3055\u3092\u6e80\u305f\u3059\u5fc5\u8981\u304c\u3042\u308a\u307e\u3059\u3002",
    "name": "\u4e0b\u66f8\u304d\u540d",
    "create": "\u4e0b\u66f8\u304d\u3092\u4f5c\u6210",
    "busy": "\u51e6\u7406\u4e2d\u2026",
    "missing": "21\u67a0\u3059\u3079\u3066\u306b\u30e1\u30c7\u30a3\u30a2\u3092\u6307\u5b9a\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    "bpmMissing": "\u97f3\u697d\u3092\u9078\u3076\u304bBPM\u3092\u624b\u52d5\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    "saved": "\u4fdd\u5b58\u3057\u307e\u3057\u305f\u3002\u5b9f\u969b\u306e\u518d\u751f\u3068\u66f8\u304d\u51fa\u3057\u3092\u5225\u9014\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    "readback": "21\u67a0\u3092\u4fdd\u5b58\u3057\u518d\u8aad\u8fbc\u3057\u307e\u3057\u305f\u3002\u518d\u751f\u3068\u66f8\u304d\u51fa\u3057\u306f\u5225\u9014\u78ba\u8a8d\u304c\u5fc5\u8981\u3067\u3059\u3002",
    "readbackMismatch": "\u4fdd\u5b58\u3057\u307e\u3057\u305f\u304c\u67a0\u306e\u5024\u3092\u691c\u8a3c\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f\u3002\u518d\u5b9f\u884c\u524d\u306b\u4e0b\u66f8\u304d\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    "failed": "\u64cd\u4f5c\u3092\u5b8c\u4e86\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f\u3002",
    "unknown": "\u4fdd\u5b58\u7d50\u679c\u304c\u4e0d\u660e\u3067\u3059\u3002\u518d\u5b9f\u884c\u524d\u306b\u4e0b\u66f8\u304d\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    "openSaved": "\u4fdd\u5b58\u3057\u305f\u4e0b\u66f8\u304d\u3092\u958b\u304f",
    "musicSource": "\u51fa\u5178",
    "musicCredit": "\u52d5\u753b\u306e\u5171\u6709\u6642\u306b\u3053\u306e\u30af\u30ec\u30b8\u30c3\u30c8\u3092\u8a18\u8f09\u3057\u3066\u304f\u3060\u3055\u3044\u300239.650\u201353.867\u79d2\u3092\u629c\u7c8b\u3001\u97f3\u91cf \u22123.090 dB\u3001\u901f\u5ea6\u5909\u66f4\u306a\u3057\u3002"
  },
  "pt": {
    "title": "Photo Grid Reveal",
    "description": "Uma grelha 3\u00d77 preenche-se em ordem e muda de preto e branco para cor. Atribua uma foto ou v\u00eddeo a cada c\u00e9lula.",
    "noProject": "Abra primeiro um projeto.",
    "load": "Carregar media do projeto",
    "changed": "O projeto ou rascunho mudou. Recarregue os media.",
    "createMode": "Novo rascunho",
    "slot": "C\u00e9lula",
    "media": "Foto ou v\u00eddeo",
    "choose": "Escolher media",
    "noMedia": "N\u00e3o h\u00e1 fotos nem v\u00eddeos neste projeto.",
    "assigned": "C\u00e9lulas atribu\u00eddas",
    "fill": "Atribuir as 21 pela ordem da lista",
    "fillHint": "Quando h\u00e1 21 fotos, t\u00eam prioridade. Para reutilizar media, escolha-o explicitamente em cada c\u00e9lula.",
    "referenceMix": "Atribuir combina\u00e7\u00e3o da refer\u00eancia",
    "motionMissing": "Estas c\u00e9lulas animadas da refer\u00eancia cont\u00eam fotos: ",
    "focusX": "Foco horizontal",
    "focusY": "Foco vertical",
    "editLimits": "As 21 c\u00e9lulas s\u00e3o edit\u00e1veis na timeline do Selects. O plugin ainda n\u00e3o permite substituir uma s\u00f3 c\u00e9lula.",
    "music": "M\u00fasica",
    "noMusic": "Sem m\u00fasica",
    "bpmManual": "Introduzir BPM manualmente",
    "bpm": "BPM",
    "estimate": "Estimar BPM da m\u00fasica",
    "estimated": "BPM estimados",
    "uncertain": "N\u00e3o foi poss\u00edvel estimar os BPM com confian\u00e7a. Introduza-os manualmente.",
    "duration": "Dura\u00e7\u00e3o do v\u00eddeo",
    "durationNote": "Predefini\u00e7\u00e3o: 14,217 segundos a 60 fps. A m\u00fasica tem de cobrir esta dura\u00e7\u00e3o.",
    "name": "Nome do rascunho",
    "create": "Criar rascunho",
    "busy": "A processar\u2026",
    "missing": "Atribua media a exatamente 21 c\u00e9lulas.",
    "bpmMissing": "Selecione m\u00fasica ou introduza BPM manualmente.",
    "saved": "Guardado. Verifique reprodu\u00e7\u00e3o e exporta\u00e7\u00e3o separadamente.",
    "readback": "As 21 c\u00e9lulas foram guardadas e relidas. Verifique reprodu\u00e7\u00e3o e exporta\u00e7\u00e3o separadamente.",
    "readbackMismatch": "Guardado, mas os valores n\u00e3o foram verificados. Inspecione o rascunho antes de repetir.",
    "failed": "N\u00e3o foi poss\u00edvel concluir a a\u00e7\u00e3o.",
    "unknown": "Resultado da grava\u00e7\u00e3o desconhecido. Inspecione o rascunho antes de repetir.",
    "openSaved": "Abrir rascunho guardado",
    "musicSource": "Fonte",
    "musicCredit": "Mantenha este cr\u00e9dito nos v\u00eddeos partilhados. Excerto 39,650\u201353,867 s; ganho \u22123,090 dB; sem altera\u00e7\u00e3o de tempo."
  },
  "tr": {
    "title": "Photo Grid Reveal",
    "description": "3\u00d77 \u0131zgara s\u0131rayla dolar, sonra t\u00fcm kutular siyah beyazdan renge ge\u00e7er. Her kutuya foto\u011fraf veya video atay\u0131n.",
    "noProject": "\u00d6nce bir proje a\u00e7\u0131n.",
    "load": "Proje medyas\u0131n\u0131 y\u00fckle",
    "changed": "Proje veya taslak de\u011fi\u015fti. Medyay\u0131 yeniden y\u00fckleyin.",
    "createMode": "Yeni taslak",
    "slot": "Kutu",
    "media": "Foto\u011fraf veya video",
    "choose": "Medya se\u00e7",
    "noMedia": "Bu projede foto\u011fraf veya video yok.",
    "assigned": "Atanan kutular",
    "fill": "21 kutuyu liste s\u0131ras\u0131yla ata",
    "fillHint": "21 foto\u011fraf varsa \u00f6nceliklidir. Yeniden kullan\u0131m i\u00e7in medyay\u0131 her kutuda a\u00e7\u0131k\u00e7a se\u00e7in.",
    "referenceMix": "Referans kar\u0131\u015f\u0131m\u0131n\u0131 ata",
    "motionMissing": "Referansta hareketli olan bu kutularda foto\u011fraf var: ",
    "focusX": "Yatay odak",
    "focusY": "Dikey odak",
    "editLimits": "21 kutu Selects zaman \u00e7izelgesinde d\u00fczenlenebilir. Eklenti hen\u00fcz tek kutu de\u011fi\u015ftirmeyi desteklemiyor.",
    "music": "M\u00fczik",
    "noMusic": "M\u00fczik yok",
    "bpmManual": "BPM de\u011ferini elle gir",
    "bpm": "BPM",
    "estimate": "M\u00fczik BPM de\u011ferini tahmin et",
    "estimated": "Tahmini BPM",
    "uncertain": "BPM g\u00fcvenilir \u015fekilde tahmin edilemedi. Elle girin.",
    "duration": "Video uzunlu\u011fu",
    "durationNote": "Varsay\u0131lan: 60 fps ile 14,217 saniye. M\u00fczik bu uzunlu\u011fu kar\u015f\u0131lamal\u0131d\u0131r.",
    "name": "Taslak ad\u0131",
    "create": "Taslak olu\u015ftur",
    "busy": "\u0130\u015fleniyor\u2026",
    "missing": "Tam olarak 21 kutuya medya atay\u0131n.",
    "bpmMissing": "M\u00fczik se\u00e7in veya BPM de\u011ferini elle girin.",
    "saved": "Kaydedildi. Oynatma ve d\u0131\u015fa aktarmay\u0131 ayr\u0131ca kontrol edin.",
    "readback": "21 kutu kaydedildi ve yeniden okundu. Oynatma ve d\u0131\u015fa aktarmay\u0131 ayr\u0131ca kontrol edin.",
    "readbackMismatch": "Kaydedildi, ancak kutu de\u011ferleri do\u011frulanmad\u0131. Tekrarlamadan \u00f6nce tasla\u011f\u0131 inceleyin.",
    "failed": "\u0130\u015flem tamamlanamad\u0131.",
    "unknown": "Kay\u0131t sonucu bilinmiyor. Tekrarlamadan \u00f6nce tasla\u011f\u0131 inceleyin.",
    "openSaved": "Kaydedilen tasla\u011f\u0131 a\u00e7",
    "musicSource": "Kaynak",
    "musicCredit": "Payla\u015f\u0131lan videolarda bu bilgiyi koruyun. 39,650\u201353,867 s kesit; kazan\u00e7 \u22123,090 dB; tempo de\u011fi\u015fmedi."
  },
  "zh": {
    "title": "Photo Grid Reveal",
    "description": "3\u5217\u00d77\u884c\u4f9d\u6b21\u663e\u793a\uff0c\u968f\u540e\u6240\u6709\u683c\u5b50\u4ece\u9ed1\u767d\u5207\u6362\u5230\u5f69\u8272\u3002\u4e3a\u6bcf\u4e2a\u683c\u5b50\u6307\u5b9a\u7167\u7247\u6216\u89c6\u9891\u3002",
    "noProject": "\u8bf7\u5148\u6253\u5f00\u9879\u76ee\u3002",
    "load": "\u52a0\u8f7d\u9879\u76ee\u5a92\u4f53",
    "changed": "\u9879\u76ee\u6216\u8349\u7a3f\u5df2\u66f4\u6539\u3002\u8bf7\u91cd\u65b0\u52a0\u8f7d\u5a92\u4f53\u3002",
    "createMode": "\u65b0\u5efa\u8349\u7a3f",
    "slot": "\u683c\u5b50",
    "media": "\u7167\u7247\u6216\u89c6\u9891",
    "choose": "\u9009\u62e9\u5a92\u4f53",
    "noMedia": "\u6b64\u9879\u76ee\u6ca1\u6709\u7167\u7247\u6216\u89c6\u9891\u3002",
    "assigned": "\u5df2\u6307\u5b9a\u683c\u5b50",
    "fill": "\u6309\u5217\u8868\u987a\u5e8f\u6307\u5b9a\u5168\u90e821\u683c",
    "fillHint": "\u670921\u5f20\u7167\u7247\u65f6\u4f18\u5148\u4f7f\u7528\u7167\u7247\u3002\u91cd\u590d\u4f7f\u7528\u5a92\u4f53\u65f6\uff0c\u8bf7\u5728\u5404\u683c\u4e2d\u660e\u786e\u9009\u62e9\u3002",
    "referenceMix": "\u6307\u5b9a\u53c2\u8003\u6df7\u5408\u5e03\u5c40",
    "motionMissing": "\u53c2\u8003\u89c6\u9891\u4e2d\u4ee5\u4e0b\u683c\u5b50\u6709\u8fd0\u52a8\uff0c\u76ee\u524d\u5374\u662f\u7167\u7247\uff1a",
    "focusX": "\u6c34\u5e73\u7126\u70b9",
    "focusY": "\u5782\u76f4\u7126\u70b9",
    "editLimits": "21\u4e2a\u683c\u5b50\u90fd\u53ef\u5728Selects\u65f6\u95f4\u7ebf\u4e0a\u72ec\u7acb\u7f16\u8f91\u3002\u63d2\u4ef6\u6682\u4e0d\u652f\u6301\u5355\u683c\u66ff\u6362\u3002",
    "music": "\u97f3\u4e50",
    "noMusic": "\u65e0\u97f3\u4e50",
    "bpmManual": "\u624b\u52a8\u8f93\u5165BPM",
    "bpm": "BPM",
    "estimate": "\u4f30\u8ba1\u97f3\u4e50BPM",
    "estimated": "\u4f30\u8ba1BPM",
    "uncertain": "\u65e0\u6cd5\u53ef\u9760\u5730\u4f30\u8ba1BPM\u3002\u8bf7\u624b\u52a8\u8f93\u5165\u3002",
    "duration": "\u89c6\u9891\u957f\u5ea6",
    "durationNote": "\u9ed8\u8ba460fps\u300114.217\u79d2\u3002\u97f3\u4e50\u987b\u8986\u76d6\u6574\u4e2a\u65f6\u957f\u3002",
    "name": "\u8349\u7a3f\u540d\u79f0",
    "create": "\u521b\u5efa\u8349\u7a3f",
    "busy": "\u5904\u7406\u4e2d\u2026",
    "missing": "\u8bf7\u4e3a\u5168\u90e821\u4e2a\u683c\u5b50\u6307\u5b9a\u5a92\u4f53\u3002",
    "bpmMissing": "\u8bf7\u9009\u62e9\u97f3\u4e50\u6216\u624b\u52a8\u8f93\u5165BPM\u3002",
    "saved": "\u5df2\u4fdd\u5b58\u3002\u8bf7\u5206\u522b\u68c0\u67e5\u5b9e\u9645\u64ad\u653e\u548c\u5bfc\u51fa\u3002",
    "readback": "\u5df2\u4fdd\u5b58\u5e76\u91cd\u65b0\u8bfb\u53d6\u5168\u90e821\u683c\u3002\u64ad\u653e\u548c\u5bfc\u51fa\u4ecd\u9700\u5355\u72ec\u9a8c\u8bc1\u3002",
    "readbackMismatch": "\u5df2\u4fdd\u5b58\uff0c\u4f46\u672a\u80fd\u9a8c\u8bc1\u683c\u5b50\u6570\u636e\u3002\u91cd\u8bd5\u524d\u8bf7\u68c0\u67e5\u8349\u7a3f\u3002",
    "failed": "\u65e0\u6cd5\u5b8c\u6210\u64cd\u4f5c\u3002",
    "unknown": "\u4fdd\u5b58\u7ed3\u679c\u672a\u77e5\u3002\u91cd\u8bd5\u524d\u8bf7\u68c0\u67e5\u8349\u7a3f\u3002",
    "openSaved": "\u6253\u5f00\u5df2\u4fdd\u5b58\u8349\u7a3f",
    "musicSource": "\u6765\u6e90",
    "musicCredit": "\u5206\u4eab\u89c6\u9891\u65f6\u8bf7\u4fdd\u7559\u6b64\u7f72\u540d\u3002\u622a\u53d639.650\u201353.867\u79d2\uff0c\u589e\u76ca\u22123.090 dB\uff0c\u672a\u6539\u53d8\u901f\u5ea6\u3002"
  }
};

// The bundled track, imported into the Project once; `durationFrames` is the
// length it must cover.
async function prepareBundledMusic(sdk, t, { projectId, durationFrames, isCurrent, onImportStarted }) {
  // The installed asset through the host FileSystem (no shell), the same on macOS and Windows.
  let musicPath = null;
  try {
    const { plugin } = await hostRoots(sdk, 'photo-gallery-no2', 'SKILL.md');
    const path = hostJoin(plugin, 'assets', 'music.mp3');
    if (hostNeed('FileSystem', 'existsSync').existsSync(path)) musicPath = path;
  } catch { musicPath = null; }
  if (!musicPath) throw new Error('Bundled music could not be located. Reinstall Photo Grid Reveal.');
  if (!isCurrent()) throw new Error(t.changed);
  onImportStarted();
  const response = await sdk.runScript({ summary: 'Prepare bundled Photo Grid Reveal music', allowCommit: true,
    script: buildScript({ operation: 'importBundledMusic', projectId, path: musicPath, durationFrames }) });
  if (response.result?.status === 'notSaved') throw Object.assign(new Error(response.result.message), { safeNotSaved: true });
  if (response.isError || response.result?.status !== 'musicReady') throw new Error(response.result?.message || response.output || t.unknown);
  return response.result.music;
}

async function prepareVisuals(sdk, t, media, frames, projectId, onImportStarted, isCurrent) {
  const videos = [...new Map(media.filter(item => item.kind === 'video').map(item => [item.resourceId, item])).values()];
  if (videos.some(item => !Number.isSafeInteger(item.durationFrames) || item.durationFrames < 1)) {
    throw new Error('A selected video has no verified duration.');
  }
  const shortVideos = videos.filter(item => item.durationFrames < frames);
  const groups = [{ sources: shortVideos, key: 'videos' }];
  const requestPaths = [];
  for (const group of groups) {
    if (!group.sources.length) continue;
    if (group.sources.some(item => !item.path)) throw new Error('Selected Project media has no readable file path.');
    if (!isCurrent()) throw new Error(t.changed);
    const request = { [group.key]: group.sources.map(item => ({ path: item.path })), durationFrames: frames };
    preparing.say?.('Extending short videos…');
    let converted;
    try { converted = await holdVideos(request, (await hostRoots(sdk, 'photo-gallery-no2', 'SKILL.md')).data); }
    catch (error) { throw new Error(String(error?.message || error) || 'Media conversion failed.'); }
    const output = converted[group.key];
    if (converted.status !== 'converted' || output?.length !== group.sources.length) {
      throw new Error(converted.message || 'Media conversion failed.');
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

function scriptFailure(t, response, phase, draftId) {
  const detail = response.result?.message || response.output || t.unknown;
  return new Error(phase + (draftId ? ' [' + draftId + ']' : '') + ': ' + String(detail).slice(0, 1200));
}

// Builds the Draft once its inputs are settled (21 tiles, music, BPM), shared by
// the Panel and a template run. `isCurrent` says the run still belongs to its
// Project; `onDispatched` marks the first step that may save; `onDraft` gets the
// new Draft. `libraryId` is a template run's library. A context change before
// anything is created throws with `contextChanged`.
async function buildGalleryDraft(sdk, t, { input, isCurrent, onDispatched, onDraft, libraryId = null }) {
  const projectId = input.projectId;
  input.media = await prepareVisuals(sdk, t, input.media, input.durationFrames, projectId, onDispatched, isCurrent);
  if (!isCurrent()) throw Object.assign(new Error(t.changed), { contextChanged: true });
  input.media = (await galleryNativeResources(projectId, input.media, libraryId)).selected.map(({ nativeResource, ...item }) => item);
  const preflight = await sdk.runScript({ script: buildScript({ ...input, operation: 'preflight' }),
    summary: 'Check Photo Gallery media and timing', allowCommit: false });
  if (preflight.isError || preflight.result?.status !== 'ready') throw Object.assign(
    new Error(preflight.result?.message || preflight.output || t.failed), { safeNotSaved: true });
  const plan = preflight.result.plan;
  if (!isCurrent()) throw Object.assign(new Error(t.changed), { safeNotSaved: true });
  onDispatched();
  const base = await sdk.runScript({ script: buildScript({ ...input, operation: 'createBase' }),
    summary: 'Create Photo Gallery Draft', allowCommit: true });
  if (base.isError || base.result?.status !== 'baseCreated' || !base.result.draftId) throw scriptFailure(t, base, 'Create Photo Gallery Draft');
  const draftId = base.result.draftId;
  onDraft(draftId);
  await galleryNativeSetFps(projectId, draftId, libraryId);
  const fill = await sdk.runScript({ script: buildScript({ operation: 'fillBase', projectId,
    draftId, durationFrames: plan.durationFrames }), summary: 'Set Photo Gallery duration', allowCommit: true });
  if (fill.isError || fill.result?.status !== 'baseFilled') throw scriptFailure(t, fill, 'Set Photo Gallery duration', draftId);
  await galleryNativePlace(projectId, draftId, input.media, plan, libraryId);
  // Each panel script has a fixed 30-second deadline. Cold video analysis
  // and effect compilation must not accumulate across all 21 tiles.
  for (const tile of plan.tiles.filter(item => item.kind === 'video')) {
    const videos = await sdk.runScript({ script: buildScript({ ...input, operation: 'placeVideosExisting', draftId,
      slotKeys: [tile.slotKey] }),
      summary: 'Place Gallery video tiles', allowCommit: true });
    if (videos.isError || videos.result?.status !== 'videosPlaced') throw scriptFailure(t, videos, 'Place Gallery video tiles', draftId);
  }
  for (let start = 0; start < plan.tiles.length; start += 3) {
    const styled = await sdk.runScript({ script: buildScript({ ...input, operation: 'styleExisting', draftId,
      slotKeys: plan.tiles.slice(start, start + 3).map(tile => tile.slotKey),
      placeMusic: start + 3 >= plan.tiles.length }),
      summary: 'Style Photo Gallery tiles', allowCommit: true });
    if (styled.isError || styled.result?.status !== 'styled') throw scriptFailure(t, styled, 'Style Photo Gallery tiles', draftId);
  }
  let verified = false, readReturned = false;
  try {
    const read = await sdk.runScript({ script: buildScript({ ...input, operation: 'verifyCreated', draftId }),
      summary: 'Read saved Photo Gallery Draft', allowCommit: false });
    readReturned = true;
    verified = !read.isError && read.result?.status === 'verified' && read.result.tileCount === 21;
  } catch { /* The mutating call already returned a saved Draft ID. */ }
  return { draftId, verified, readReturned };
}

// A template run gets its own component, so it never touches the Panel's state.
export default function Panel(props) {
  return props.context?.template ? <GalleryTemplateRun {...props}/> : <GalleryPanel {...props}/>;
}

function GalleryPanel({ sdk, context, ui }) {
  const t = STRINGS[context.language] || STRINGS.en;
  const [inventory, setInventory] = React.useState(null);
  const [loadedKey, setLoadedKey] = React.useState('');
  const [slots, setSlots] = React.useState(emptySlots);
  const [selectedSlot, setSelectedSlot] = React.useState('0');
  const [musicChoice, setMusicChoice] = React.useState('bundled');
  const [manualEnabled, setManualEnabled] = React.useState(true);
  const [manualBpm, setManualBpm] = React.useState(113);
  const [estimated, setEstimated] = React.useState(null);
  const [durationFrames, setDurationFrames] = React.useState(853);
  const [name, setName] = React.useState('Photo Grid Reveal');
  const [busy, setBusy] = React.useState(false);
  const [unknown, setUnknown] = React.useState(false);
  const [status, setStatus] = React.useState(null);
  const [savedTarget, setSavedTarget] = React.useState(null);
  const running = React.useRef(false);
  const current = React.useRef({ projectId: context.projectId, sequenceId: context.sequenceId });
  React.useEffect(() => {
    const say = text => setStatus({ tone: 'muted', text });
    preparing.say = say;
    return () => { if (preparing.say === say) preparing.say = null; };
  }, []);
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
    // The host opens this new Draft during Create. Retain its frozen inputs
    // and target so completion or a partial-save warning stays actionable.
    if (running.current && inventory?.projectId === context.projectId) {
      setLoadedKey(key);
      return;
    }
    setInventory(null); setLoadedKey(''); setSlots(emptySlots()); setMusicChoice('bundled');
    setManualEnabled(true); setManualBpm(113);
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
      setSlots(emptySlots()); setName('Photo Grid Reveal'); setDurationFrames(853);
      setMusicChoice('bundled'); setManualEnabled(true); setManualBpm(113); setEstimated(null);
      setStatus(null);
    } catch (error) { setStatus({ tone: 'error', text: t.failed + ' ' + String(error?.message || error) }); }
    finally { running.current = false; setBusy(false); }
  }

  async function estimateMusic(audio) {
    if (!audio?.path) throw new Error(t.uncertain);
    if (estimated?.resourceId === audio.resourceId) return estimated.bpm;
    const value = await tempoOfFile(audio.path, (await hostRoots(sdk, 'photo-gallery-no2', 'SKILL.md')).data);
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
    const isCurrent = () => sameContext(projectId, sequenceId) && requestedKey === key;
    try {
      const audio = musicChoice === 'bundled' ? await prepareBundledMusic(sdk, t, { projectId,
        durationFrames: input.durationFrames, isCurrent, onImportStarted: () => { dispatched = true; } }) : selectedMusic;
      input.music = audio ? { resourceId: audio.resourceId, path: audio.path, durationFrames: audio.durationFrames, startFrame: 0 } : null;
      Object.assign(input, await resolveBpm(audio));
      if (!isCurrent()) { setStatus({ tone: 'error', text: t.changed }); return; }
      const built = await buildGalleryDraft(sdk, t, { input, isCurrent,
        onDispatched: () => { dispatched = true; }, onDraft: draftId => setSavedTarget({ projectId, draftId }) });
      // Selects may open the just-created Draft while its readback runs. That
      // expected sequence change must not turn a verified save into an error.
      if (built.verified) {
        setStatus({ tone: 'success', text: t.readback });
      } else if (built.readReturned) {
        setUnknown(true); setStatus({ tone: 'error', text: t.readbackMismatch });
      } else { setUnknown(true); setStatus({ tone: 'error', text: t.unknown }); }
    } catch (error) {
      if (error?.contextChanged) setStatus({ tone: 'error', text: t.changed });
      else if (dispatched && !error?.safeNotSaved) {
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
        { value: 'bundled', label: 'Unexplored \u00b7 TAD MILLER (CC BY 4.0)' },
        { value: 'none', label: t.noMusic },
        ...inventory.audio.map(item => ({ value: item.resourceId, label: item.name })),
      ]} disabled={busy}/>
      {musicChoice === 'bundled' && <small>Unexplored (long ver.) — <a href="https://www.youtube.com/c/Tadon" target="_blank" rel="noreferrer">TAD MILLER</a> · <a href="https://opengameart.org/content/unexplored-long-ver-orchestral-music" target="_blank" rel="noreferrer">{t.musicSource}</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. {t.musicCredit}</small>}
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
    {savedTarget && <ui.Button variant="secondary" onClick={openSaved} disabled={busy}>{t.openSaved}</ui.Button>}
  </ui.Stack>;
}

// --- Template run ------------------------------------------------------------
// A built-in app can run this Panel as a template: the person picks 15 photos
// (input `photos`) and 6 videos (input `clips`) in the app, and the app mounts the
// Panel out of sight with `context.template`. The videos go to the tiles that move
// in the reference (4, 6, 11, 17, 19, 21) and the photos fill the rest in order.
// Everything else is the Panel's default — its name, 14.217 s at 113 BPM, centred
// focus — with the bundled track unless the `music` option says none. It never
// opens the Draft and ends with one `sdk.finishTemplate`.
const TEMPLATE_NAME = 'Photo Grid Reveal', TEMPLATE_DURATION_FRAMES = 853, TEMPLATE_BPM = 113;
const TEMPLATE_FAILED = 'Photo Grid Reveal could not make the Draft; try again.';
const TEMPLATE_PARTIAL = 'Photo Grid Reveal stopped part way, so the new Draft may be incomplete; check it in this Project before trying again.';
const TEMPLATE_UNCERTAIN = 'Photo Grid Reveal could not confirm whether anything was saved; check this Project before trying again.';
function templateIssue(message) { return Object.assign(new Error(message), { publicMessage: message, safeNotSaved: true }); }

// The library the run works in: the one the app handed over, else (an older app)
// the open Project's page or the tab on screen, read once as the run starts.
function templateLibrary(app, projectId, template) {
  if (template?.libraryId) return template.libraryId;
  const match = String(app?.location?.pathname || '').match(/libraries\/([^/]+)\/projects\/([^/]+)/);
  if (match && match[2] === projectId) return match[1];
  return app?.__DI__?.SequenceState?.getOnScreenTab?.()?.libraryId || null;
}

// The app hands over its own Resource ids; the Panel works from the inspected
// media rows, so each pick is joined to its row by its file, the same file the
// native placement later checks the Project's Resource against.
async function templateTiles(sdk, app, projectId, libraryId, inputs) {
  const photos = Array.isArray(inputs?.photos) ? inputs.photos : [];
  const clips = Array.isArray(inputs?.clips) ? inputs.clips : [];
  if (photos.length !== 15 || photos.some(x => x?.kind !== 'image' || !x.resourceId)) throw templateIssue('Pick exactly 15 photos, then try again.');
  if (clips.length !== 6 || clips.some(x => x?.kind !== 'video' || !x.resourceId)) throw templateIssue('Pick exactly 6 videos, then try again.');
  const di = app?.__DI__;
  if (typeof di?.ProjectRepository?.findById !== 'function' || typeof di?.ResourceRepository?.findById !== 'function') {
    throw templateIssue('This version of Selects cannot place photos for Photo Grid Reveal; update Selects, then try again.');
  }
  const project = libraryId ? await di.ProjectRepository.findById(libraryId, projectId) : null;
  if (!project) throw templateIssue('Could not find this Project; open it, then try again.');
  const members = new Set(project.getResources() || []);
  const inspected = await sdk.runScript({ script: buildScript({ operation: 'inspect', projectId }), summary: 'Inspect Photo Gallery project', allowCommit: false });
  if (inspected.isError || inspected.result?.status !== 'inspected' || !Array.isArray(inspected.result.media)) throw new Error(inspected.result?.message || inspected.output || 'Could not read the Project media.');
  const rowFor = async pick => {
    const label = pick.name || (pick.kind === 'video' ? 'A picked video' : 'A picked photo');
    const resource = members.has(pick.resourceId) ? await di.ResourceRepository.findById(libraryId, pick.resourceId) : null;
    const path = resource?.getMedia()?.path;
    const rows = path ? inspected.result.media.filter(row => row.path === path && row.kind === pick.kind) : [];
    if (rows.length !== 1) throw templateIssue(label + ' is missing from this Project or matches more than one file.');
    return rows[0];
  };
  const photoRows = [], clipRows = [];
  for (const pick of photos) photoRows.push(await rowFor(pick));
  for (const pick of clips) clipRows.push(await rowFor(pick));
  let p = 0, c = 0;
  const media = SLOT_KEYS.map((_, i) => REFERENCE_VIDEO_SLOTS.has(i + 1) ? clipRows[c++] : photoRows[p++]);
  const native = await galleryNativeResources(projectId, media, libraryId);
  return native.selected.map(({ nativeResource, ...item }) => ({ ...item, focusX: 0.5, focusY: 0.5 }));
}

// One plain sentence for the person, from a failure before anything was saved.
function templateMessage(error) {
  if (error?.publicMessage) return error.publicMessage;
  const said = String(error?.message || '');
  if (/no verified (image )?dimensions|no unique Project Resource/.test(said)) return 'A picked file is not ready yet; wait for it to finish importing, then try again.';
  if (/no verified duration/.test(said)) return 'A picked video is not ready yet; wait for it to finish importing, then try again.';
  if (/^(Could not download .+|The download of .+ did not match its pinned checksum|Could not prepare Python for .+)\.$/.test(said)) return said;
  if (/does not expose native Image placement/.test(said)) return 'This version of Selects cannot place photos for Photo Grid Reveal; update Selects, then try again.';
  return TEMPLATE_FAILED;
}

// Nobody sees this frame, so it shows one status line. It starts once per run id
// and reports once, unless a newer run replaced it; a save that began is reported
// as a possibly incomplete Draft and never retried.
function GalleryTemplateRun({ sdk, context }) {
  const t = STRINGS[context.language] || STRINGS.en;
  const runId = context.template?.runId;
  const [status, setStatus] = React.useState('Making your Draft…');
  const started = React.useRef(null), alive = React.useRef(true), latest = React.useRef(context);
  latest.current = context;
  React.useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  React.useEffect(() => {
    if (!runId || started.current === runId) return;
    started.current = runId;
    const live = () => alive.current && latest.current.template?.runId === runId;
    let ended = false;
    const finish = result => { if (ended) return; ended = true; if (!live()) return; try { sdk.finishTemplate(result); } catch {} };
    const say = text => { if (live()) setStatus(text); };
    preparing.say = say;
    const projectId = context.projectId, template = context.template;
    let dispatched = false, draftId = null;
    (async () => {
      try {
        if (!projectId) throw templateIssue('Open a Project, then try again.');
        const app = window.parent, libraryId = templateLibrary(app, projectId, template);
        say('Finding your photos and videos…');
        const media = await templateTiles(sdk, app, projectId, libraryId, template?.inputs);
        if (!live()) throw templateIssue('The template run ended before the Draft was made.');
        const input = { operation: 'create', projectId, name: TEMPLATE_NAME, durationFrames: TEMPLATE_DURATION_FRAMES,
          media, music: null, manualBpm: TEMPLATE_BPM };
        if (template?.options?.music !== 'none') {
          say('Adding the music…');
          const audio = await prepareBundledMusic(sdk, t, { projectId, durationFrames: input.durationFrames,
            isCurrent: live, onImportStarted: () => { dispatched = true; } });
          input.music = { resourceId: audio.resourceId, path: audio.path, durationFrames: audio.durationFrames, startFrame: 0 };
        }
        say('Building the gallery…');
        const built = await buildGalleryDraft(sdk, t, { input, isCurrent: live, libraryId,
          onDispatched: () => { dispatched = true; }, onDraft: id => { draftId = id; } });
        if (!built.verified) console.warn('[photo-gallery-no2] the saved Draft was not read back:', built.draftId);
        say('Done.');
        finish({ sequenceId: built.draftId });
      } catch (error) {
        console.warn('[photo-gallery-no2] template run failed:', error?.message || String(error), { draftId, dispatched });
        say('Stopped.');
        finish({ error: draftId ? TEMPLATE_PARTIAL : dispatched && !error?.safeNotSaved ? TEMPLATE_UNCERTAIN : templateMessage(error) });
      } finally {
        finish({ error: TEMPLATE_FAILED });
      }
    })();
  }, [runId]);
  return <p role="status" style={{ margin: 0, fontSize: 12, color: 'var(--panel-muted-fg)' }}>{status}</p>;
}
