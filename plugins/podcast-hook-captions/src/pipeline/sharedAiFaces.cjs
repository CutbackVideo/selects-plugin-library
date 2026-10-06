// Pure public-SDK transport and recovery rules; no model, native module, or shell.
const json = JSON.stringify;
const PAGE_SAMPLES=16;
const terminal = status => ['succeeded', 'failed', 'canceled'].includes(status);
function assertInput(input) {
  if (input?.runtimeId !== 'selects-ai-runtime' || input.task !== 'faces.detect' ||
      typeof input.projectId !== 'string' || !input.projectId ||
      typeof input.resourceId !== 'string' || !input.resourceId || /^r\d+$/.test(input.resourceId) ||
      typeof input.requestKey !== 'string' || !input.requestKey ||
      !Number.isFinite(input.sourceRange?.startSeconds) || input.sourceRange.startSeconds < 0 ||
      !Number.isFinite(input.sourceRange?.endSeconds) || input.sourceRange.endSeconds <= input.sourceRange.startSeconds ||
      !(input.options?.sampleEverySeconds > 0) || input.options.scoreThreshold !== 0.8 || input.options.provider !== 'cpu')
    throw new Error('Invalid saved face request. Choose a current Project Resource.');
  return input;
}
function faceInput(projectId, resourceId, plan, fps, requestKey) {
  return assertInput({runtimeId: 'selects-ai-runtime', projectId, resourceId, requestKey,
    task: 'faces.detect', sourceRange: {startSeconds: Math.floor((plan.f0 / fps) * 1e12) / 1e12, endSeconds: Math.floor((plan.f1 / fps) * 1e12) / 1e12},
    options: {sampleEverySeconds: plan.step / fps, scoreThreshold: 0.8, provider: 'cpu'}});
}
function sameInput(a, b) {
  return json({...a, requestKey: ''}) === json({...b, requestKey: ''});
}
async function deterministicRequestKey(generation,input,scope) {
  if(typeof scope!=="string"||!scope)throw new Error("A persistent face pass scope is required.");
  const text=json({generation,scope,input:{...input,requestKey:''}});
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
  return 'podcast-faces-'+Array.from(new Uint8Array(hash),value=>value.toString(16).padStart(2,'0')).join('');
}
function assertRetryMetadata(record) {
  if(record.retryAttempt===undefined&&record.retryOf===undefined)return record;
  if(!Number.isSafeInteger(record.retryAttempt)||record.retryAttempt<1||record.retryAttempt>255||
      typeof record.retryOf!=='string'||!record.retryOf)throw new Error('Invalid saved face retry identity.');
  return record;
}
function latestFaceRecords(records) {
  const latest=new Map();
  for(const record of records){
    assertRetryMetadata(record);
    const key=json({...record.input,requestKey:''}),old=latest.get(key);
    if(!old||(record.retryAttempt??0)>(old.retryAttempt??0))latest.set(key,record);
  }
  return [...latest.values()];
}
async function faceRequestRecord(records,input,generation,scope,retryTerminal=false) {
  const latest=latestFaceRecords(records).find(record=>sameInput(record.input,input));
  // A Rebuild can retry a previously observed terminal failure once. Unknown,
  // running and successful requests always retain their key/workflow identity.
  if(latest&&(!retryTerminal||!['failed','canceled'].includes(latest.status)))return latest;
  if(!latest)return {input:{...input,requestKey:await deterministicRequestKey(generation,input,scope)}};
  const retryAttempt=(latest.retryAttempt??0)+1,retryOf=latest.input.requestKey;
  assertRetryMetadata({retryAttempt,retryOf});
  const requestKey=await deterministicRequestKey(generation,input,JSON.stringify({scope,retryAttempt,retryOf}));
  return {input:{...input,requestKey},retryAttempt,retryOf};
}
function submitScript(input) { return `const job = await selects.ai.submit(${json(assertInput(input))}); return {workflowId: job.workflowId};`; }
function statusScript(record) { return `return await selects.ai.job(${json(record.workflowId)}, ${json(record.input.projectId)}).status();`; }
function cancelScript(record) { return `return await selects.ai.job(${json(record.workflowId)}, ${json(record.input.projectId)}).cancel();`; }
function resultScript(record, offset = 0) {
  // readJSON is unknown in the real SDK. Validate before projecting a bounded page.
  return `const r = await selects.ai.job(${json(record.workflowId)}, ${json(record.input.projectId)}).result();
const raw = await selects.ai.readJSON(r.files.detections, ${json(record.input.projectId)});
const d = raw as {contractVersion?:number;task?:string;frameSize?:{width:number;height:number};coordinateSpace?:string;boxFormat?:string;landmarkOrder?:string[];parameters?:unknown;samples?:Array<{index:number;sourceTimeSeconds:number;faces:unknown[]}>};
if (d.contractVersion !== 1 || d.task !== "faces.detect" || d.coordinateSpace !== "display-pixels" || d.boxFormat !== "xyxy" || !d.frameSize || !Array.isArray(d.samples) || d.samples.length > 20000) throw new Error("Unsupported face result contract.");
const page = d.samples.slice(${offset}, ${offset + PAGE_SAMPLES});
if (page.some(s => !Array.isArray(s.faces) || s.faces.length > 32)) throw new Error("Face result page exceeds the consumer limit.");
return {contractVersion:d.contractVersion,task:d.task,frameSize:d.frameSize,coordinateSpace:d.coordinateSpace,boxFormat:d.boxFormat,landmarkOrder:d.landmarkOrder,parameters:d.parameters,total:d.samples.length,samples:page};`;
}
function checkPage(page, input, info) {
  if (page?.contractVersion !== 1 || page.task !== 'faces.detect' || page.coordinateSpace !== 'display-pixels' || page.boxFormat !== 'xyxy' ||
      page.frameSize?.width !== info.W || page.frameSize?.height !== info.H || !Array.isArray(page.samples) ||
      json(page.landmarkOrder) !== json(['rightEye','leftEye','nose','rightMouth','leftMouth']) ||
      json(page.parameters?.sourceRange) !== json(input.sourceRange) || page.parameters?.scoreThreshold !== 0.8 ||
      page.parameters?.sampleEverySeconds !== input.options.sampleEverySeconds || !Number.isSafeInteger(page.total) || page.total < 1 || page.total > 20000)
    throw new Error('Face result does not match this source, interval, or sampling contract.');
  return page;
}
function adaptSamples(samples, input, info, plan) {
  let previous = -Infinity;
  if (samples.length !== plan.count) throw new Error("Face sampling count differs from the color/cut frame grid.");
  return samples.map((sample, sampleNumber) => {
    const t = sample.sourceTimeSeconds;
    if (!Number.isFinite(t) || t < input.sourceRange.startSeconds - 1e-6 || t >= input.sourceRange.endSeconds + 1e-6 || t <= previous || !Array.isArray(sample.faces))
      throw new Error('Face samples need ordered source timestamps inside the requested interval.');
    const expected = (plan.f0 + sampleNumber * plan.step) / info.fps;
    if (Math.abs(t - expected) > 0.51 / info.fps) throw new Error("Source timestamp cadence differs from the legacy color/cut frame grid. Variable-rate alignment is not supported in this version.");
    previous = t;
    const scaleX = plan.w / info.W, scaleY = plan.h / info.H;
    const faces = sample.faces.map(row => {
      const b = row.box, points = row.landmarks;
      if (!b || ![b.xmin,b.ymin,b.xmax,b.ymax,row.score].every(Number.isFinite) || b.xmin < 0 || b.ymin < 0 || b.xmax > info.W || b.ymax > info.H || b.xmax <= b.xmin || b.ymax <= b.ymin || row.score < 0 || row.score > 1 || !Array.isArray(points) || points.length !== 5 || points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y)))
        throw new Error('Invalid face geometry or confidence.');
      return {box:[b.xmin*scaleX,b.ymin*scaleY,(b.xmax-b.xmin)*scaleX,(b.ymax-b.ymin)*scaleY],
        score:row.score,landmarks:points.map(p => [p.x*scaleX,p.y*scaleY])};
    });
    // Preserve actual source time for grid validation, never the interval-local index.
    return {f:t*info.fps, sourceTimeSeconds:t, faces};
  });
}
function assertConstantFrameClock(sourcePts, timeBase, fps) {
  const [numerator,denominator]=String(timeBase).split('/').map(Number);
  if(!Number.isSafeInteger(numerator)||!Number.isSafeInteger(denominator)||numerator<=0||denominator<=0||!Number.isFinite(fps)||fps<=0||sourcePts.length<2)
    throw new Error('A verifiable constant source frame clock is required.');
  const origin=sourcePts[0],ticksPerFrame=denominator/(numerator*fps),frameTicks=Math.round(ticksPerFrame);
  if(!Number.isFinite(ticksPerFrame)||frameTicks<1||!Number.isSafeInteger(origin))throw new Error('Invalid source frame clock.');
  const floatTolerance=8*Number.EPSILON*Math.max(1,Math.abs(ticksPerFrame));
  if(!Number.isSafeInteger(frameTicks)||Math.abs(ticksPerFrame-frameTicks)>floatTolerance)
    throw new Error('Quantized source frame clock is not supported: each frame must occupy an integer number of source time-base ticks.');
  for(let i=0;i<sourcePts.length;i++){
    const value=sourcePts[i],expected=i*frameTicks;
    if(!Number.isSafeInteger(value)||(i&&value<=sourcePts[i-1])||value-origin!==expected)
      throw new Error('Variable-rate source cannot be paired with legacy frame-ordinal color/cut sampling.');
  }
  return true;
}
function rawResources(core, projectId, draftId) {
  if (core?.owner?.projectId !== projectId || (draftId && core.sequenceJson?.id !== draftId)) throw new Error('The Draft belongs to another Project.');
  const clips = new Map();
  const visit = rows => { for (const row of rows || []) {
    const id = row.mediaReferences?.defaultMedia?.id;
    if (Number.isSafeInteger(row.id) && typeof id === 'string') clips.set(row.id, id);
    if (Array.isArray(row.children)) visit(row.children);
  }};
  for (const track of core.sequenceJson?.tracks?.children || []) if (track.kind === 'Main') visit(track.children);
  return clips;
}
function assertAttached(signal) {
  if(signal?.aborted){const e=new Error('Face observation detached; recover the saved pass.');e.code='AI_OBSERVATION_DETACHED';throw e;}
}
async function runRecord(record, api) {
  assertInput(record.input);
  assertAttached(api.signal);
  await api.save(record); // stable request precedes the first possible side effect
  assertAttached(api.signal);
  if (!record.workflowId) {
    const ack = await api.run(submitScript(record.input), true);
    assertAttached(api.signal);
    if (typeof ack?.workflowId !== 'string' || !ack.workflowId) throw new Error('Face submission acknowledgement is missing. Recover the same request.');
    record.workflowId = ack.workflowId;
    await api.save(record); // ACK loss is recovered by replaying the same key
  }
  let cancelSent = false;
  while (true) {
    assertAttached(api.signal);
    await api.refresh?.(record);
    if (record.cancelRequested && !cancelSent) { await api.run(cancelScript(record), true); assertAttached(api.signal); cancelSent = true; }
    const status = await api.run(statusScript(record), false);
    assertAttached(api.signal);
    if (status?.workflowId !== record.workflowId || status.projectId !== record.input.projectId || !['queued','running','canceling','succeeded','failed','canceled'].includes(status.status)) throw new Error('Face job scope mismatch.');
    record.status = status.status; await api.save(record); api.progress?.(status);
    if (terminal(status.status)) {
      if (status.status !== 'succeeded') { const e = new Error('Face job ' + status.status + ': ' + (status.lastErrorMessage || 'Start a new face pass to retry.')); e.code = 'AI_JOB_' + status.status.toUpperCase(); throw e; }
      return status;
    }
    await api.sleep(750);
  }
}
async function readSamples(record, api, info) {
  assertAttached(api.signal);
  const first = checkPage(await api.run(resultScript(record), false), record.input, info);
  assertAttached(api.signal);
  await api.refresh?.(record);
  const samples = first.samples.slice();
  for (let offset = PAGE_SAMPLES; offset < first.total; offset += PAGE_SAMPLES) {
    assertAttached(api.signal);
    const page = checkPage(await api.run(resultScript(record, offset), false), record.input, info);
    assertAttached(api.signal);
    await api.refresh?.(record);
    if (page.total !== first.total) throw new Error('Face result changed during observation.');
    samples.push(...page.samples);
  }
  if (samples.length !== first.total) throw new Error('Face result is incomplete.');
  return samples;
}
module.exports = {PAGE_SAMPLES,terminal,assertInput,assertConstantFrameClock,faceInput,sameInput,deterministicRequestKey,assertRetryMetadata,latestFaceRecords,faceRequestRecord,submitScript,statusScript,cancelScript,resultScript,checkPage,adaptSamples,rawResources,runRecord,readSamples};
