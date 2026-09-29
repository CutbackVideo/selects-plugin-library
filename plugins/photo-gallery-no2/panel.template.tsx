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
