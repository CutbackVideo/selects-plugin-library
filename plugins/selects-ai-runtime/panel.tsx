// @name AI Test Lab
// @icon eye
import React, { useEffect, useRef, useState } from 'react';

const STRINGS = {
  en: {
    title: 'AI Test Lab', faces: 'Find faces', matte: 'Remove background', source: 'Source video', imageSource: 'Video or photo', chooseSource: 'Choose a source video', chooseImageSource: 'Choose a video or photo', unavailable: 'Saved source unavailable', duration: 'Source duration',
    facesIntro: 'Choose a source to find faces.', matteIntro: 'Separate the person, then open the result as editable clips.', openProject: 'Open a project first.',
    run: 'Run task', cancel: 'Cancel job', open: 'Open in editor', background: 'Background image', chooseBackground: 'Choose a background image',
    details: 'Details', reload: 'Refresh media list', refresh: 'Refresh job', recover: 'Recover same request', workflow: 'Workflow', preparing: 'preparing',
    storage: 'Recovery storage is unavailable. Keep the recovery details before closing this panel.', savedInvalid: 'Saved recovery data is not valid for this project.',
    missing: 'Saved source is no longer available. Saved results remain readable; choose an available source for a new task.', noRequest: 'No request to recover for this project.', invalidSource: 'Choose a source and positive video duration.', failed: 'AI request failed.',
    files: 'Add videos or images with this Project’s Add button. The list updates automatically.', diagram: 'Face coordinates, not the source image.', time: 'Source time', confidence: 'Confidence', noFaces: 'No faces in this sample',
    faceCount: (samples, faces) => `${samples} samples · ${faces} faces`, matteCount: frames => `${frames} frames processed`,
    addBackground: 'Add an image to this Project to use as the background.', invalidTiming: 'The prepared mask metadata is invalid.',
    draftStorage: 'Draft recovery storage is unavailable. Draft creation is blocked until recovery details can be saved.', draftUnknown: 'The Draft may already be saved. Click Open in editor to inspect its outcome before proceeding.',
    missingDraft: 'No saved Draft is visible yet. Inspect again; a missing acknowledgment does not establish that creation failed.', multipleDrafts: 'Multiple matching Drafts need manual inspection.',
    retention: 'The editor combines the original source with saved masks. Removing Draft clips keeps the source and masks available.', states: { queued: 'queued', running: 'running', canceling: 'canceling', succeeded: 'succeeded', failed: 'failed', canceled: 'canceled', interrupted: 'interrupted' },
  },
  ko: {
    title: 'AI \ud14c\uc2a4\ud2b8 \ub7a9', faces: '\uc5bc\uad74 \ucc3e\uae30', matte: '\ubc30\uacbd \uc81c\uac70', source: '\uc6d0\ubcf8 \uc601\uc0c1', imageSource: '\uc601\uc0c1 \ub610\ub294 \uc0ac\uc9c4', chooseImageSource: '\uc601\uc0c1\uc774\ub098 \uc0ac\uc9c4\uc744 \uc120\ud0dd\ud558\uc138\uc694', chooseSource: '\uc6d0\ubcf8 \uc601\uc0c1\uc744 \uc120\ud0dd\ud558\uc138\uc694', unavailable: '\uc800\uc7a5\ub41c \uc6d0\ubcf8 \uc5c6\uc74c', duration: '\ucc98\ub9ac\ud560 \uae38\uc774',
    facesIntro: '\uc6d0\ubcf8\uc744 \uace8\ub77c \uc5bc\uad74\uc744 \ucc3e\uc544\ubcf4\uc138\uc694.', matteIntro: '\uc778\ubb3c\uc744 \ubd84\ub9ac\ud55c \ub4a4 \ud3b8\uc9d1\uae30\uc5d0\uc11c \uacb0\uacfc\ub97c \ud655\uc778\ud558\uc138\uc694.', openProject: '\uba3c\uc800 \ud504\ub85c\uc81d\ud2b8\ub97c \uc5ec\uc138\uc694.',
    run: '\uc2e4\ud589', cancel: '\uc791\uc5c5 \ucde8\uc18c', open: '\ud3b8\uc9d1\uae30\uc5d0\uc11c \uc5f4\uae30', background: '\ubc30\uacbd \uc774\ubbf8\uc9c0', chooseBackground: '\ubc30\uacbd \uc774\ubbf8\uc9c0\ub97c \uc120\ud0dd\ud558\uc138\uc694',
    details: '\uc790\uc138\ud788', reload: '\ubbf8\ub514\uc5b4 \ubaa9\ub85d \uc0c8\ub85c\uace0\uce68', refresh: '\uc791\uc5c5 \uc0c1\ud0dc \uc0c8\ub85c\uace0\uce68', recover: '\uac19\uc740 \uc694\uccad \ubcf5\uad6c', workflow: '\uc791\uc5c5 ID', preparing: '\uc900\ube44 \uc911',
    storage: '\ubcf5\uad6c \uc815\ubcf4\ub97c \uc800\uc7a5\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4. \ud328\ub110\uc744 \ub2eb\uae30 \uc804\uc5d0 \uc790\uc138\ud788\uc5d0\uc11c \uc815\ubcf4\ub97c \ubcf4\uad00\ud558\uc138\uc694.', savedInvalid: '\uc800\uc7a5\ub41c \ubcf5\uad6c \uc815\ubcf4\uac00 \uc774 \ud504\ub85c\uc81d\ud2b8\uc640 \ub9de\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.',
    missing: '\uc800\uc7a5\ub41c \uc6d0\ubcf8\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. \uc644\ub8cc\ub41c \uacb0\uacfc\ub294 \ubcfc \uc218 \uc788\uc2b5\ub2c8\ub2e4. \uc0c8 \uc791\uc5c5\uc5d0\ub294 \ub2e4\ub978 \uc6d0\ubcf8\uc744 \uc120\ud0dd\ud558\uc138\uc694.', noRequest: '\uc774 \ud504\ub85c\uc81d\ud2b8\uc5d0\uc11c \ubcf5\uad6c\ud560 \uc694\uccad\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.', invalidSource: '\uc6d0\ubcf8 \uc601\uc0c1\uacfc 0\ubcf4\ub2e4 \ud070 \ucc98\ub9ac \uae38\uc774\ub97c \uc120\ud0dd\ud558\uc138\uc694.', failed: 'AI \uc694\uccad\uc774 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.',
    files: '\ud504\ub85c\uc81d\ud2b8\uc758 \ucd94\uac00 \ubc84\ud2bc\uc73c\ub85c \uc601\uc0c1\uc774\ub098 \uc774\ubbf8\uc9c0\ub97c \ub123\uc73c\uc138\uc694. \ubaa9\ub85d\uc774 \uc790\ub3d9\uc73c\ub85c \uac31\uc2e0\ub429\ub2c8\ub2e4.', diagram: '\uc6d0\ubcf8 \uc774\ubbf8\uc9c0\uac00 \uc544\ub2cc \uc5bc\uad74 \uc88c\ud45c \ub3c4\uc2dd\uc785\ub2c8\ub2e4.', time: '\uc6d0\ubcf8 \uc2dc\uac01', confidence: '\uac80\ucd9c \uc2e0\ub8b0\ub3c4', noFaces: '\uc774 \uc0d8\ud50c\uc5d0\ub294 \uac80\ucd9c\ub41c \uc5bc\uad74\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.',
    faceCount: (samples, faces) => `${samples}\uac1c \uc0d8\ud50c · \uc5bc\uad74 \uac80\ucd9c ${faces}\uac1c`, matteCount: frames => `${frames}\uac1c \ud504\ub808\uc784 \ucc98\ub9ac \uc644\ub8cc`,
    addBackground: '\ud504\ub85c\uc81d\ud2b8\uc5d0 \ubc30\uacbd\uc73c\ub85c \uc4f8 \uc774\ubbf8\uc9c0\ub97c \ucd94\uac00\ud558\uc138\uc694.', invalidTiming: '\uc900\ube44\ub41c \ub9c8\uc2a4\ud06c \uc815\ubcf4\uac00 \uc62c\ubc14\ub974\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.',
    draftStorage: '\ud3b8\uc9d1 \ubcf5\uad6c \uc815\ubcf4\ub97c \uc800\uc7a5\ud560 \uc218 \uc5c6\uc5b4 \ud3b8\uc9d1 \uc0dd\uc131\uc744 \uc911\ub2e8\ud588\uc2b5\ub2c8\ub2e4.', draftUnknown: '\ud3b8\uc9d1\uc774 \uc774\ubbf8 \uc800\uc7a5\ub418\uc5c8\uc744 \uc218 \uc788\uc2b5\ub2c8\ub2e4. \ud3b8\uc9d1\uae30\uc5d0\uc11c \uc5f4\uae30\ub97c \ub20c\ub7ec \uc800\uc7a5 \uacb0\uacfc\ub97c \ud655\uc778\ud558\uc138\uc694.',
    missingDraft: '\uc800\uc7a5\ub41c \ud3b8\uc9d1\uc774 \uc544\uc9c1 \ubcf4\uc774\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \ud655\uc778\ud558\uc138\uc694. \uc751\ub2f5\uc774 \uc5c6\ub2e4\ub294 \uc774\uc720\ub85c \uc0dd\uc131 \uc2e4\ud328\ub97c \ub2e8\uc815\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.', multipleDrafts: '\uac19\uc740 \uc774\ub984\uc758 \ud3b8\uc9d1\uc774 \uc5ec\ub7ec \uac1c \uc788\uc5b4 \uc9c1\uc811 \ud655\uc778\uc774 \ud544\uc694\ud569\ub2c8\ub2e4.',
    retention: '\ud3b8\uc9d1\uae30\ub294 \uc6d0\ubcf8\uacfc \uc800\uc7a5\ub41c \ub9c8\uc2a4\ud06c\ub97c \ud569\uc131\ud569\ub2c8\ub2e4. \ud074\ub9bd\uc744 \uc0ad\uc81c\ud574\ub3c4 \uc6d0\ubcf8\uacfc \ub9c8\uc2a4\ud06c\ub294 \uc720\uc9c0\ub429\ub2c8\ub2e4.', states: { queued: '\ub300\uae30 \uc911', running: '\uc2e4\ud589 \uc911', canceling: '\ucde8\uc18c \uc911', succeeded: '\uc644\ub8cc', failed: '\uc2e4\ud328', canceled: '\ucde8\uc18c\ub428', interrupted: '\uc911\ub2e8\ub428' },
  },
};

// Effect frames are relative to the source point at which this effect is authored.
// The host keeps that clock continuous through trimming, splitting and retiming.
const MASK_EFFECT_TSX = `const React = require('react');
const {AbsoluteFill,useCurrentFrame,useVideoConfig} = require('remotion');
export default function PersonMask({Source,data}) {
  const frame=useCurrentFrame(), {fps}=useVideoConfig();
  let mask;
  if(data.maskUrl) mask={url:data.maskUrl};
  else {
  const seconds=data.sourceStartSeconds+frame/fps;
  if(seconds<data.sourceStartSeconds || seconds>=data.sourceEndSeconds) return null;
  const frames=data.frames;
  let low=0,high=frames.length;
  while(low<high) {
    const middle=(low+high)>>>1;
    if(frames[middle].sourceTimeSeconds<=seconds+1e-7) low=middle+1;
    else high=middle;
  }
  mask=frames[Math.max(0,low-1)];
  }
  if(!mask) return null;
  return <AbsoluteFill style={{maskImage:'url('+JSON.stringify(mask.url)+')',
    maskMode:'luminance',maskSize:'100% 100%',maskRepeat:'no-repeat'}}><Source/></AbsoluteFill>;
}`;

const terminal = status => ['succeeded', 'failed', 'canceled'].includes(status);
const savedInputIsValid = (input, projectId) => input?.runtimeId === 'selects-ai-runtime' &&
  input.projectId === projectId && typeof input.requestKey === 'string' && input.requestKey &&
  typeof input.resourceId === 'string' && input.resourceId && !/^r\d+$/.test(input.resourceId) &&
  ['faces.detect', 'person.matte'].includes(input.task) &&
  (input.sourceRange === undefined ? input.options?.sampleEverySeconds === undefined && input.options?.outputMode !== 'foreground-video' : (input.sourceRange?.startSeconds === 0 &&
    Number.isFinite(input.sourceRange?.endSeconds) && input.sourceRange.endSeconds > 0)) &&
  (input.options?.outputMode == null || ['foreground-video', 'alpha-frames'].includes(input.options.outputMode)) &&
  (input.options?.alphaEncoding == null || ['grayscale-png-8bit', 'grayscale-avif-8bit'].includes(input.options.alphaEncoding));

const recoveryKey = (projectId, task) => `selects-ai-runtime:lab:${projectId}:${task}`;
function readSaved(projectId, task) {
  const stored = localStorage.getItem(recoveryKey(projectId, task));
  if (stored !== null) return JSON.parse(stored);
  // Read the previous single-task record without deleting or rewriting it.
  // An explicit action publishes to the matching task's new key only.
  const legacy = JSON.parse(localStorage.getItem(`selects-ai-runtime:lab:${projectId}`) || 'null');
  return legacy?.input?.task === task ? legacy : null;
}

// Public SDK consumer; both task panes stay mounted so switching modes keeps jobs.
export default function AiRuntimeLab({ sdk, context, ui: U }) {
  const [mode, setMode] = useState('faces.detect');
  const S = STRINGS[context.language?.toLowerCase().startsWith('ko') ? 'ko' : 'en'];
  useEffect(() => { setMode('faces.detect'); }, [context.projectId]);
  return <U.Section title={S.title}><U.Stack gap={8}>
    <U.Tabs value={mode} onChange={setMode} tabs={[{ value: 'faces.detect', label: S.faces, content: null }, { value: 'person.matte', label: S.matte, content: null }]} />
    {['faces.detect', 'person.matte'].map(task => <div key={task} data-task={task} hidden={mode !== task}>
      <TaskPane sdk={sdk} context={context} U={U} task={task} active={mode === task} />
    </div>)}
  </U.Stack></U.Section>;
}

function TaskPane({ sdk, context, U, task, active }) {
  const projectId = context.projectId;
  const S = STRINGS[context.language?.toLowerCase().startsWith('ko') ? 'ko' : 'en'];
  const [resources, setResources] = useState([]);
  const [imageSupported, setImageSupported] = useState(false);
  const [resourceId, setResourceId] = useState(null);
  const [backgrounds, setBackgrounds] = useState([]);
  const [backgroundId, setBackgroundId] = useState(null);
  const [draftAttempt, setDraftAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seconds, setSeconds] = useState(2);
  const [job, setJob] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState('');
  const [sourceNotice, setSourceNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [recoverable, setRecoverable] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const scope = useRef(null);
  const request = useRef(null);
  const busyRef = useRef(false);
  const selection = useRef({ source: null, background: null });
  const inventorySerial = useRef(0);
  const visible = useRef(active); visible.current = active;
  const current = token => scope.current === token;

  async function run(script, allowCommit = false) {
    const response = await sdk.runScript({ script, summary: 'Test AI runtime', allowCommit });
    if (response.isError || response.result == null) {
      let report;
      try { report = JSON.parse(response.output); } catch {}
      const failure = new Error(report?.message || report?.error || response.output || S.failed);
      failure.code = report?.code;
      throw failure;
    }
    return response.result;
  }

  async function loadInventory(token) {
    if (!current(token) || !token.projectId) return;
    const serial = ++inventorySerial.current; setLoading(true);
    try {
      const [rows, supportsImages] = await Promise.all([sdk.call('listProjectResources', token.projectId),
        run(`return (selects.ai as unknown as {imageSourceSupported?:boolean}).imageSourceSupported===true;`)]);
      if (!current(token) || serial !== inventorySerial.current) return;
      const sources = rows.filter(row => (row.type === 'Video' || (supportsImages && row.type === 'Image')) && typeof row.resourceId === 'string');
      setImageSupported(supportsImages === true);
      const images = rows.filter(row => row.type === 'Image' && typeof row.resourceId === 'string');
      const source = selection.current.source ? sources.find(row => row.resourceId === selection.current.source) : sources[0];
      if (source) selection.current.source = source.resourceId;
      setResources(sources); setResourceId(source?.resourceId ?? null);
      setSourceNotice(selection.current.source && !source ? S.missing : '');
      setBackgrounds(images);
      const background = selection.current.background ? images.find(row => row.resourceId === selection.current.background) : images[0];
      if (background) selection.current.background = background.resourceId;
      setBackgroundId(background?.resourceId ?? null);
      if (!request.current && source?.durationSeconds > 0) setSeconds(value => Math.min(value, source.durationSeconds));
    } catch (cause) { if (current(token) && serial === inventorySerial.current) setError(cause.message); }
    finally { if (current(token) && serial === inventorySerial.current) setLoading(false); }
  }

  useEffect(() => {
    const token = { projectId, task };
    scope.current = token;
    selection.current = { source: null, background: null }; inventorySerial.current++;
    setResources([]); setResourceId(null); setImageSupported(false); setBackgrounds([]); setBackgroundId(null); setLoading(Boolean(projectId));
    setDraftAttempt(null);
    setJob(null); setResult(null); setError(''); setStorageError(''); setSourceNotice('');
    setSeconds(2);
    setBusy(false); busyRef.current = false; setRecoverable(false); request.current = null;
    if (projectId) {
      try {
        const saved = readSaved(projectId, task);
        if (saved?.version === 1 && savedInputIsValid(saved.input, projectId) && saved.input.task === task) {
          request.current = saved.input;
          selection.current.source = saved.input.resourceId;
          setSeconds(saved.input.sourceRange?.endSeconds ?? 2);
          setResourceId(saved.input.resourceId);
          if (saved.draftAttempt && saved.draftAttempt.workflowId === saved.workflowId && typeof saved.draftAttempt.name === 'string' &&
              typeof saved.draftAttempt.backgroundId === 'string' && ['unknown', 'saved'].includes(saved.draftAttempt.status)) {
            setDraftAttempt(saved.draftAttempt); setBackgroundId(saved.draftAttempt.backgroundId);
            selection.current.background = saved.draftAttempt.backgroundId;
          }
          if (typeof saved.workflowId === 'string' && saved.workflowId) setJob({ workflowId: saved.workflowId, status: 'queued' });
          else setRecoverable(true);
        } else if (saved) setStorageError(S.savedInvalid);
      } catch { setStorageError(S.storage); }
      loadInventory(token);
    }
    const unsubscribe = projectId && sdk.on?.('resourcesChanged', event => {
      if (event.projectId === projectId) loadInventory(token);
    });
    return () => { unsubscribe?.(); if (current(token)) scope.current = null; };
  }, [projectId, task]);

  useEffect(() => {
    if (!job?.workflowId || !projectId) return;
    const token = scope.current;
    const workflowId = job.workflowId;
    const requestKey = request.current?.requestKey;
    let alive = true, timer, failures = 0;
    const active = () => alive && current(token) && request.current?.requestKey === requestKey;
    const poll = async () => {
      try {
        const value = await run(`return await selects.ai.job(${JSON.stringify(workflowId)}, ${JSON.stringify(projectId)}).status();`);
        if (!active()) return;
        failures = 0; setJob(value); setError('');
        if (value.status === 'succeeded') {
          // Read the owned artifact inside run_script, then return a bounded
          // projection; full video manifests can exceed the inline result cap.
          const value = await run(`const job=selects.ai.job(${JSON.stringify(workflowId)}, ${JSON.stringify(projectId)});
            const r=await job.result(); const file=r.files.detections ?? r.files.manifest;
            const raw=await selects.ai.readJSON(file, ${JSON.stringify(projectId)});
            if(!raw || typeof raw!=='object') throw new Error('Invalid AI result document.');
            let data;
            if(r.task==='faces.detect') {
              const d=raw as {frameSize:unknown;samples:Array<{index:number;sourceTimeSeconds:number;faces:unknown[]}>};
              if(!Array.isArray(d.samples)) throw new Error('Invalid face result samples.');
              data={frameSize:d.frameSize,sampleCount:d.samples.length,faceCount:d.samples.reduce((n,f)=>n+f.faces.length,0),
                samples:d.samples.slice(0,3).map(f=>({index:f.index,sourceTimeSeconds:f.sourceTimeSeconds,faces:f.faces.slice(0,10)}))};
            } else {
              const d=raw as {frameSize:unknown;frames:unknown[];foregroundVideo?:unknown};
              if(!Array.isArray(d.frames)) throw new Error('Invalid matte result frames.');
              data={frameSize:d.frameSize,frameCount:d.frames.length,frames:d.frames.slice(0,3),foregroundVideo:d.foregroundVideo};
            }
            return {task:r.task,metrics:r.metrics,diagnostics:r.diagnostics,manifest:r.files.manifest,data};`);
          if (active()) setResult(value);
        } else if (!terminal(value.status)) timer = setTimeout(poll, 1000);
      } catch (cause) {
        if (!active()) return;
        setError(cause.message);
        if (cause.code === 'AI_JOB_NOT_FOUND') { setJob(null); setRecoverable(Boolean(request.current)); }
        else if (++failures < 3) timer = setTimeout(poll, failures * 1000);
      }
    };
    poll();
    return () => { alive = false; clearTimeout(timer); };
  }, [job?.workflowId, projectId, refresh]);

  function save(input, workflowId, token) {
    const storageKey = recoveryKey(input.projectId, input.task);
    try {
      const old = readSaved(input.projectId, input.task);
      const same = old?.input?.requestKey === input.requestKey;
      // Only a fresh request may replace the record. A late acknowledgment
      // from a detached panel must not roll back a newer request's identity.
      if (workflowId && !same) return;
      localStorage.setItem(storageKey, JSON.stringify({ version: 1, input, workflowId, ...(same && old.draftAttempt ? { draftAttempt: old.draftAttempt } : {}) }));
    }
    catch { if (current(token)) setStorageError(S.storage); }
  }

  async function submit(recover = false) {
    const token = scope.current;
    if (!token || token.projectId !== projectId || busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(''); setResult(null);
    if (!recover) {
      request.current = null; setJob(null); setDraftAttempt(null); setRecoverable(false);
    }
    try {
      // Older AI hosts have no encoding advertisement and retain PNG. Never
      // renegotiate a saved request: its idempotency key owns the exact payload.
      const alphaEncoding = !recover && task === 'person.matte' ? await run(`
        const ai=selects.ai as unknown as {supportedMatteEncodings?:readonly string[]};
        return ai.supportedMatteEncodings?.includes('grayscale-avif-8bit')?'grayscale-avif-8bit':'grayscale-png-8bit';`) : null;
      if (!current(token)) return;
      const input = recover ? request.current : {
        runtimeId: 'selects-ai-runtime', requestKey: `lab:${crypto.randomUUID()}`,
        projectId, resourceId, task, ...(resources.find(row => row.resourceId === resourceId)?.type === 'Image' ? {} : { sourceRange: { startSeconds: 0, endSeconds: seconds } }),
        ...(task === 'person.matte' ? { options: { outputMode: 'alpha-frames',
          ...(alphaEncoding === 'grayscale-avif-8bit' ? { alphaEncoding } : {}) } } : {}),
      };
      if (!input || input.projectId !== projectId) throw new Error(S.noRequest);
      if (!recover && (!resourceId || (input.sourceRange && (!Number.isFinite(seconds) || seconds <= 0)))) throw new Error(S.invalidSource);
      request.current = input; save(input, undefined, token); setRecoverable(true); setJob(null);
      // Obtain only the submission acknowledgment. A later status transport
      // failure must not discard an already known workflow identity.
      const value = await run(`const job=await selects.ai.submit(${JSON.stringify(input)}); return {workflowId:job.workflowId};`, true);
      // Preserve an A-project acknowledgment in A's storage after a switch,
      // without replacing B's visible job or error state.
      save(input, value.workflowId, token);
      if (current(token)) { setJob({ workflowId: value.workflowId, status: 'queued' }); setRecoverable(false); }
    } catch (cause) { if (current(token)) setError(cause.message); }
    finally { if (current(token)) { busyRef.current = false; setBusy(false); } }
  }

  async function cancel() {
    const token = scope.current;
    const workflowId = job?.workflowId;
    if (!token || token.projectId !== projectId || !workflowId || busyRef.current) return;
    busyRef.current = true; setBusy(true); setError('');
    try {
      const value = await run(`return await selects.ai.job(${JSON.stringify(workflowId)}, ${JSON.stringify(projectId)}).cancel();`, true);
      if (current(token)) { setJob(value); setRefresh(value => value + 1); }
    } catch (cause) { if (current(token)) setError(cause.message); }
    finally { if (current(token)) { busyRef.current = false; setBusy(false); } }
  }

  function saveDraftAttempt(input, attempt, token) {
    try {
      const storageKey = recoveryKey(input.projectId, input.task);
      const old = readSaved(input.projectId, input.task);
      if (old?.input?.requestKey !== input.requestKey || old.workflowId !== attempt.workflowId)
        throw new Error('The original job recovery record is unavailable.');
      localStorage.setItem(storageKey, JSON.stringify({ ...old, draftAttempt: attempt }));
      return true;
    } catch {
      if (current(token)) setStorageError(S.draftStorage);
      return false;
    }
  }

  async function openInEditor() {
    const token = scope.current, input = request.current;
    if (!token || token.projectId !== projectId || !input || input.task !== task || (!draftAttempt && !result?.manifest) || busyRef.current) return;
    busyRef.current = true; setBusy(true); setError('');
    let attempt = draftAttempt;
    try {
      let draftId = attempt?.status === 'saved' ? attempt.draftId : null;
      if (attempt?.status === 'unknown') {
        // A lost commit acknowledgment is recovered by observation only.
        // No mask preparation or new Draft starts until the saved outcome is known.
        const footage = await sdk.call('readFootage', projectId);
        if (!current(token)) return;
        const matches = footage.drafts.filter(row => row.name === attempt.name);
        if (matches.length !== 1) throw new Error(matches.length ? S.multipleDrafts : S.missingDraft);
        draftId = matches[0].sequenceId;
      } else if (!draftId) {
        if (!backgroundId || !resources.some(row => row.resourceId === input.resourceId)) throw new Error(S.invalidSource);
        // Prepare durable image files before recording a Draft attempt. Return only
        // small metadata; a long mask's complete URL list stays inside run_script.
        const prepared = await run(`
          const r=await selects.ai.job(${JSON.stringify(job.workflowId)}, ${JSON.stringify(projectId)}).result();
          if(!r.files.manifest) throw new Error('This job has no matte manifest.');
          const m=await selects.ai.prepareMatte(r.files.manifest,${JSON.stringify(projectId)});
          return m.sourceKind==='image'?{sourceKind:m.sourceKind,sourceResourceId:m.sourceResourceId,frameSize:m.frameSize,alphaEncoding:m.alphaEncoding,maskUrl:m.maskUrl}:
            {sourceResourceId:m.sourceResourceId,sourceRange:m.sourceRange,frameSize:m.frameSize,alphaEncoding:m.alphaEncoding,frameCount:m.frames.length};`, true);
        if (!current(token)) return;
        if ((prepared.sourceKind === 'image') !== (input.sourceRange === undefined) || prepared.sourceResourceId !== input.resourceId || !['grayscale-png-8bit', 'grayscale-avif-8bit'].includes(prepared.alphaEncoding) ||
            (prepared.sourceKind==='image' ? typeof prepared.maskUrl!=='string' : (!Number.isSafeInteger(prepared.frameCount) || prepared.frameCount < 1 ||
            !Number.isFinite(prepared.sourceRange?.startSeconds) || prepared.sourceRange.startSeconds < 0 ||
            !Number.isFinite(prepared.sourceRange?.endSeconds) || prepared.sourceRange.endSeconds <= prepared.sourceRange.startSeconds))) throw new Error(S.invalidTiming);
        attempt = { workflowId: job.workflowId, name: `AI Runtime layered · ${job.workflowId}`, backgroundId, status: 'unknown' };
        if (!saveDraftAttempt(input, attempt, token)) return;
        setDraftAttempt(attempt);
        const value = await run(`const p=selects.project(${JSON.stringify(projectId)});
          const name=${JSON.stringify(attempt.name)};
          const matches=(await p.readFootage()).drafts.filter(d=>d.name===name);
          if(matches.length>1) throw new Error('Multiple matching Drafts need manual inspection.');
          if(matches.length===1) return {draftId:matches[0].sequenceId,recovered:true};
          const r=await selects.ai.job(${JSON.stringify(job.workflowId)},${JSON.stringify(projectId)}).result();
          if(!r.files.manifest) throw new Error('This job has no matte manifest.');
          const matte=await selects.ai.prepareMatte(r.files.manifest,${JSON.stringify(projectId)});
          if(matte.sourceResourceId!==${JSON.stringify(input.resourceId)}) throw new Error('The mask belongs to another source.');
          const d=await p.createDraft({name});
          if(matte.sourceKind==='image') await d.insertGap({seconds:5});
          else await d.insertResource({resourceId:matte.sourceResourceId,sourceRange:matte.sourceRange});
          const m=await d.meta();
          if(m.durationFrames<=0) throw new Error('The source window produced an empty Draft.');
          await d.overlayResource({resource:p.resource(${JSON.stringify(backgroundId)}),over:await d.rangeAtFrames(0,m.durationFrames)});
          const before=new Set((await d.clips({trackScope:'all'})).map(c=>c.clipId));
          await d.overlayResource({resource:p.resource(matte.sourceResourceId),over:await d.rangeAtFrames(0,m.durationFrames),...(matte.sourceKind==='image'?{}:{sourceStartSeconds:matte.sourceRange.startSeconds})});
          const added=(await d.clips({trackScope:'all'})).filter(c=>!before.has(c.clipId)&&c.trackKind==='video');
          if(added.length!==1) throw new Error('The source overlay did not produce exactly one video clip.');
          await d.addVideoEffect({clip:added[0],label:'Person mask',tsxCode:${JSON.stringify(MASK_EFFECT_TSX)},parameters:matte.sourceKind==='image'?{maskUrl:matte.maskUrl}:{
            sourceStartSeconds:matte.sourceRange.startSeconds,sourceEndSeconds:matte.sourceRange.endSeconds,
            frames:matte.frames.map(f=>({sourceTimeSeconds:f.sourceTimeSeconds,url:f.url}))}});
          const c=await d.commitAll('Layer saved person masks over a background while preserving original Main audio');
          if(!c.createdDraftId) throw new Error('The created Draft acknowledgment has no identity.');
          return {draftId:c.createdDraftId};`, true);
        draftId = value.draftId;
      }
      if (!draftId) throw new Error(S.missingDraft);
      const saved = { ...attempt, status: 'saved', draftId };
      saveDraftAttempt(input, saved, token);
      if (!current(token)) return;
      setDraftAttempt(saved);
      if (visible.current) await run(`return await selects.editor.openDraft(${JSON.stringify(draftId)});`);
    } catch (cause) {
      if (current(token)) setError(attempt?.status === 'unknown' ? `${cause.message} ${S.draftUnknown}` : cause.message);
    } finally { if (current(token)) { busyRef.current = false; setBusy(false); } }
  }

  const sameProject = scope.current?.projectId === projectId;
  const visibleJob = sameProject ? job : null;
  const pending = visibleJob && !terminal(visibleJob.status);
  const selected = resources.find(row => row.resourceId === resourceId);
  const selectResource = id => {
    selection.current.source = id; setResourceId(id); setSourceNotice('');
    const duration = resources.find(row => row.resourceId === id)?.durationSeconds;
    if (duration > 0) setSeconds(value => Math.min(value, duration));
  };
  const diagramSize = result?.data?.frameSize;
  const showDiagram = sameProject && result?.task === 'faces.detect' && Number.isFinite(diagramSize?.width) && Number.isFinite(diagramSize?.height) && diagramSize.width > 0 && diagramSize.height > 0;
  const figure = (sample, index) => {
    const faces = (sample?.faces ?? []).slice(0, 10).filter(face => face?.box && [face.box.xmin, face.box.ymin, face.box.xmax, face.box.ymax, face.score].every(Number.isFinite) && face.box.xmax > face.box.xmin && face.box.ymax > face.box.ymin && face.box.xmin >= 0 && face.box.ymin >= 0 && face.box.xmax <= diagramSize.width && face.box.ymax <= diagramSize.height && face.score >= 0 && face.score <= 1);
    return <figure key={index} style={{ margin: 0 }}>
      <figcaption>{S.time}: {Number(sample.sourceTimeSeconds).toFixed(3)} s · {S.confidence}: {faces.length ? faces.map(face => `${Math.round(face.score * 100)}%`).join(', ') : S.noFaces}</figcaption>
      <svg role="img" aria-label={`${S.time} ${sample.sourceTimeSeconds} s`} viewBox={`0 0 ${diagramSize.width} ${diagramSize.height}`} style={{ display: 'block', width: '100%', maxHeight: 180 }}>
        <rect x="0" y="0" width={diagramSize.width} height={diagramSize.height} fill="none" stroke="currentColor" vectorEffect="non-scaling-stroke" />
        {faces.map((face, i) => <rect key={i} x={face.box.xmin} y={face.box.ymin} width={face.box.xmax - face.box.xmin} height={face.box.ymax - face.box.ymin} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />)}
      </svg>
    </figure>;
  };
  return <U.Stack gap={8}>
    <U.Message>{task === 'faces.detect' ? S.facesIntro : S.matteIntro}</U.Message>
    {!projectId && <U.Message>{S.openProject}</U.Message>}
    <U.Select label={imageSupported ? S.imageSource : S.source} value={sameProject ? resourceId : null} placeholder={sourceNotice ? S.unavailable : imageSupported ? S.chooseImageSource : S.chooseSource} onChange={selectResource} options={(sameProject ? resources : []).map(row => ({ value: row.resourceId, label: row.name }))} disabled={loading || busy || Boolean(pending)} />
    {sourceNotice && sameProject && <U.Message>{sourceNotice}</U.Message>}
    {selected?.type !== 'Image' && <U.NumberField label={S.duration} value={seconds} onChange={setSeconds} min={0.01} max={selected?.durationSeconds ?? 10} step={0.1} unit="s" disabled={busy || Boolean(pending)} />}
    <U.Actions>
      {pending && <U.Button variant="secondary" disabled={busy} onClick={cancel}>{S.cancel}</U.Button>}
      <U.Button busy={busy} disabled={!sameProject || !projectId || !resourceId || loading || Boolean(pending) || recoverable || draftAttempt?.status === 'unknown' || (selected?.type !== 'Image' && (!Number.isFinite(seconds) || seconds <= 0))} onClick={() => submit()}>{S.run}</U.Button>
    </U.Actions>
    {visibleJob && <U.Progress value={visibleJob.progress} label={S.states[visibleJob.status] ?? visibleJob.status} />}
    {visibleJob?.lastErrorMessage && <U.Message tone="error">{visibleJob.lastErrorMessage}</U.Message>}
    {error && <U.Message tone="error">{error}</U.Message>}
    {storageError && <U.Message tone="error">{storageError}</U.Message>}
    {recoverable && request.current && !pending && <U.Button variant="secondary" disabled={busy} onClick={() => submit(true)}>{S.recover}</U.Button>}
    {result && sameProject && <U.Message tone="success">{result.task === 'faces.detect' ? S.faceCount(result.data.sampleCount, result.data.faceCount) : S.matteCount(result.data.frameCount)}</U.Message>}
    {showDiagram && result.data.samples?.length > 0 && <U.Stack gap={8}><U.Message>{S.diagram}</U.Message>{figure(result.data.samples[0], 0)}</U.Stack>}
    {sameProject && task === 'person.matte' && (result?.manifest || draftAttempt) && <U.Stack gap={8}>
      <U.Select label={S.background} value={backgroundId} placeholder={S.chooseBackground} onChange={id => { selection.current.background = id; setBackgroundId(id); }} options={backgrounds.map(row => ({ value: row.resourceId, label: row.name }))} disabled={busy || Boolean(draftAttempt)} />
      {backgrounds.length === 0 && !draftAttempt && <U.Message>{S.addBackground}</U.Message>}
      <U.Button variant="secondary" busy={busy} disabled={!draftAttempt && (Boolean(pending) || !backgroundId || !resources.some(row => row.resourceId === request.current?.resourceId))} onClick={openInEditor}>{S.open}</U.Button>
    </U.Stack>}
    <details><summary>{S.details}</summary><U.Stack gap={8}>
      <U.Message>{S.files}</U.Message>
      <U.Button variant="secondary" disabled={!sameProject || !projectId || loading} onClick={() => loadInventory(scope.current)}>{S.reload}</U.Button>
      {visibleJob && <U.Message>{S.workflow}: {visibleJob.workflowId}</U.Message>}
      {visibleJob && <U.Button variant="secondary" disabled={busy} onClick={() => setRefresh(value => value + 1)}>{S.refresh}</U.Button>}
      {showDiagram && (result.data.samples ?? []).slice(1, 3).map((sample, index) => figure(sample, index + 1))}
      <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify({ input: request.current, job: visibleJob, result, draftAttempt }, null, 2)}</pre>
      {task === 'person.matte' && <U.Message>{S.retention}</U.Message>}
    </U.Stack></details>
  </U.Stack>;
}
