// @name Photo Gallery 21
// @icon image
// Build a native, editable 3×7 photo/video gallery in the current Selects project.
import React from 'react';
/*__SHARED_SCRIPT_BUILDER__*/

const SLOT_KEYS = Array.from({ length: 21 }, (_, i) => `tile-${String(i + 1).padStart(2, '0')}`);
const emptySlots = () => SLOT_KEYS.map(() => ({ resourceId: '', focusX: 0.5, focusY: 0.5 }));
const shellQuote = value => "'" + String(value).replace(/'/g, "'\"'\"'") + "'";
const STRINGS = {
  ko: {
    title: '\ud3ec\ud1a0 \uac24\ub7ec\ub9ac 21\uce78', description: '3\uc5f4 × 7\ud589\uc774 \ucc28\ub840\ub85c \ucc44\uc6cc\uc9c0\uace0 \uc804\uccb4\uac00 \ud751\ubc31\uc5d0\uc11c \uceec\ub7ec\ub85c \ubc14\ub01d\ub2c8\ub2e4. \uc0c8 \ud3b8\uc9d1\ubcf8\uc758 21\uce78\uc5d0 \uc0ac\uc9c4\uacfc \uc601\uc0c1\uc744 \uac01\uac01 \uc9c0\uc815\ud569\ub2c8\ub2e4.',
    noProject: '\uba3c\uc800 \ud504\ub85c\uc81d\ud2b8\ub97c \uc5ec\uc138\uc694.', load: '\ud504\ub85c\uc81d\ud2b8 \ubbf8\ub514\uc5b4 \ubd88\ub7ec\uc624\uae30', changed: '\ud504\ub85c\uc81d\ud2b8 \ub610\ub294 \ud3b8\uc9d1\ubcf8\uc774 \ubc14\ub00c\uc5c8\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \ubd88\ub7ec\uc624\uc138\uc694.',
    createMode: '\uc0c8 \ud3b8\uc9d1\ubcf8',
    slot: '\uce78', media: '\uc0ac\uc9c4 \ub610\ub294 \uc601\uc0c1', choose: '\ubbf8\ub514\uc5b4 \uc120\ud0dd', noMedia: '\ud504\ub85c\uc81d\ud2b8\uc5d0 \uc0ac\uc9c4 \ub610\ub294 \uc601\uc0c1\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.',
    assigned: '\uc9c0\uc815\ud55c \uce78', fill: '21\uac1c\ub97c \ubaa9\ub85d \uc21c\uc11c\ub85c \uc9c0\uc815', fillHint: '\uc0ac\uc9c4 21\uac1c\uac00 \uc788\uc73c\uba74 \uc0ac\uc9c4\uc744 \uc6b0\uc120\ud569\ub2c8\ub2e4. \uac19\uc740 \ubbf8\ub514\uc5b4\ub97c \uc5ec\ub7ec \uce78\uc5d0 \uc4f0\ub824\uba74 \uac01 \uce78\uc5d0\uc11c \uc9c1\uc811 \uace0\ub974\uc138\uc694.',
    focusX: '\uac00\ub85c \ucd08\uc810', focusY: '\uc138\ub85c \ucd08\uc810',
    editLimits: "\ud604\uc7ac SDK\uc5d0\uc11c\ub294 \uc0dd\uc131\ub41c 21\uce78\uc744 \ud50c\ub7ec\uadf8\uc778\uc73c\ub85c \uc548\uc804\ud558\uac8c \uc218\uc815\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4. \uac01 \uc601\uc0c1 \ud074\ub9bd\uc740 Selects \ud0c0\uc784\ub77c\uc778\uc5d0\uc11c \uc9c1\uc811 \ud3b8\uc9d1\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.",
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
    focusX: 'Horizontal focus', focusY: 'Vertical focus',
    editLimits: 'The current SDK cannot safely automate updates to the created 21 tiles. Each video clip can be edited directly in the Selects timeline',
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
  const autoFillMedia = photos.length === 21 ? photos : inventory?.media?.length === 21 ? inventory.media : null;
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
      if (!sameContext(projectId, sequenceId) || requestedKey !== key) { setStatus({ tone: 'error', text: t.changed }); return; }
      setInventory(response.result); setLoadedKey(requestedKey);
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
    const photos = [...new Map(media.filter(item => item.kind === 'image').map(item => [item.resourceId, item])).values()];
    const videos = [...new Map(media.filter(item => item.kind === 'video').map(item => [item.resourceId, item])).values()];
    if (videos.some(item => !Number.isSafeInteger(item.durationFrames) || item.durationFrames < 1)) {
      throw new Error('A selected video has no verified duration.');
    }
    const shortVideos = videos.filter(item => item.durationFrames < frames);
    const groups = [{ sources: photos, key: 'images', script: 'still_video.py',
      summary: 'Convert selected photos into independent silent video clips' },
    { sources: shortVideos, key: 'videos', script: 'hold_video.py',
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

  async function prepareBase(frames, projectId, onImportStarted, isCurrent) {
    if (!isCurrent()) throw new Error(t.changed);
    if (!Number.isSafeInteger(frames) || frames < 1 || frames > 36000) throw new Error('Invalid output length.');
    const command = 'printf %s ' + shellQuote(JSON.stringify({ durationFrames: frames })) +
      ' | python3 "$SELECTS_USER_SKILLS_ROOT/photo-gallery-no2/black_base.py"';
    const shell = await sdk.runShell({ command, summary: 'Prepare editable gallery black Main video',
      timeoutMs: 300000, maxOutputBytes: 8192 });
    let result;
    try { result = JSON.parse(shell.stdout); } catch { throw new Error(shell.stderr || 'Black Main video conversion failed.'); }
    if (shell.isError || shell.exitCode !== 0 || result.status !== 'converted' || result.fps !== 60 ||
        result.durationFrames !== frames || typeof result.outputPath !== 'string') {
      throw new Error(result.message || shell.stderr || 'Black Main video conversion failed.');
    }
    if (!isCurrent()) throw new Error(t.changed);
    onImportStarted();
    const imported = await sdk.runScript({ script: buildScript({ operation: 'importBase', projectId,
      path: result.outputPath, durationFrames: frames }),
      summary: 'Import full-length black Main video', allowCommit: true });
    if (imported.isError || !imported.result || imported.result.status === 'outcomeUnknown') throw new Error(t.unknown);
    if (imported.result.status === 'notSaved') {
      throw Object.assign(new Error(imported.result.message || 'Black Main video could not be imported.'), { safeNotSaved: true });
    }
    if (imported.result.status !== 'prepared' || !imported.result.baseResourceId) {
      throw new Error('Black Main video import could not be verified.');
    }
    return { resourceId: imported.result.baseResourceId, path: imported.result.path };
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
    } catch (error) { setStatus({ tone: 'error', text: String(error?.message || error) }); return; }
    running.current = true; setBusy(true); setStatus(null);
    let dispatched = false;
    try {
      Object.assign(input, await resolveBpm(selectedMusic));
      if (!sameContext(projectId, sequenceId) || requestedKey !== key) { setStatus({ tone: 'error', text: t.changed }); return; }
      input.media = await prepareVisuals(input.media, input.durationFrames, projectId,
        () => { dispatched = true; }, () => sameContext(projectId, sequenceId) && requestedKey === key);
      if (!sameContext(projectId, sequenceId) || requestedKey !== key) { setStatus({ tone: 'error', text: t.changed }); return; }
      const preparedBase = await prepareBase(input.durationFrames, projectId,
        () => { dispatched = true; }, () => sameContext(projectId, sequenceId) && requestedKey === key);
      input.baseResourceId = preparedBase.resourceId;
      input.basePath = preparedBase.path;
      if (!sameContext(projectId, sequenceId) || requestedKey !== key) { setStatus({ tone: 'error', text: t.changed }); return; }
      const script = buildScript(input);
      dispatched = true;
      const response = await sdk.runScript({ script, summary: 'Create Photo Gallery Draft', allowCommit: true });
      if (response.isError || !response.result || response.result.status === 'outcomeUnknown') {
        setUnknown(true); setStatus({ tone: 'error', text: t.unknown }); return;
      }
      if (response.result.status === 'notSaved') { setStatus({ tone: 'error', text: response.result.message || t.failed }); return; }
      if (response.result.status !== 'saved' || !response.result.draftId) {
        setUnknown(true); setStatus({ tone: 'error', text: t.unknown }); return;
      }
      setSavedTarget({ projectId, draftId: response.result.draftId });
      let verified = false;
      let readReturned = false;
      try {
        const readInput = { ...input, operation: 'verifyCreated', draftId: response.result.draftId };
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
      {autoFillMedia && <small>{t.fillHint}</small>}
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
