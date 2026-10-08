// @name ComfyUI
// @name:de ComfyUI
// @name:en ComfyUI
// @name:es ComfyUI
// @name:fr ComfyUI
// @name:it ComfyUI
// @name:ja ComfyUI
// @name:ko ComfyUI
// @name:pt ComfyUI
// @name:tr ComfyUI
// @name:zh ComfyUI
// @icon comfyui
// Select a workflow, edit its inputs, and save execution results to the project.
import React from 'react';

const COPY = {
  "en": {
    "run": "Run",
    "project": "Open a project.",
    "queued": "Queued\u2026",
    "running": "Running\u2026",
    "added": "Saved to project",
    "resume": "Recover results",
    "connection_failed": "Could not connect. Refresh the connection.",
    "generation_disabled": "Execution disabled.",
    "submission_unknown": "Submission is uncertain. Check Comfy job history before another run.",
    "comfyError": "Comfy request failed"
  },
  "ko": {
    "run": "\uc2e4\ud589",
    "project": "\ud504\ub85c\uc81d\ud2b8\ub97c \uc5f4\uc5b4 \uc8fc\uc138\uc694.",
    "queued": "\ub300\uae30 \uc911\u2026",
    "running": "\uc2e4\ud589 \uc911\u2026",
    "added": "\ud504\ub85c\uc81d\ud2b8\uc5d0 \uc800\uc7a5\ub428",
    "resume": "\uacb0\uacfc \uc774\uc5b4\ubc1b\uae30",
    "connection_failed": "\uc5f0\uacb0\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4. \uc5f0\uacb0\uc744 \uc0c8\ub85c\uace0\uce68\ud574 \uc8fc\uc138\uc694.",
    "generation_disabled": "\uc2e4\ud589 \ube44\ud65c\uc131 \uc0c1\ud0dc\uc785\ub2c8\ub2e4.",
    "submission_unknown": "\uc2e4\ud589 \uc811\uc218 \uc5ec\ubd80\uac00 \ubd88\ud655\uc2e4\ud569\ub2c8\ub2e4. Comfy \uc2e4\ud589 \uae30\ub85d\uc744 \ud655\uc778\ud574 \uc8fc\uc138\uc694.",
    "comfyError": "Comfy \uc694\uccad \uc2e4\ud328"
  },
  "de": {
    "run": "Ausf\u00fchren",
    "project": "\u00d6ffnen Sie ein Projekt.",
    "queued": "In Warteschlange\u2026",
    "running": "Wird ausgef\u00fchrt\u2026",
    "added": "Im Projekt gespeichert",
    "resume": "Ergebnisse wiederherstellen",
    "connection_failed": "Verbindung fehlgeschlagen. Aktualisieren Sie sie.",
    "generation_disabled": "Ausf\u00fchrung deaktiviert.",
    "submission_unknown": "\u00dcbermittlung unklar. Pr\u00fcfen Sie den Comfy-Verlauf vor einem neuen Lauf.",
    "comfyError": "Comfy-Anfrage fehlgeschlagen"
  },
  "es": {
    "run": "Ejecutar",
    "project": "Abre un proyecto.",
    "queued": "En cola\u2026",
    "running": "Ejecutando\u2026",
    "added": "Guardado en el proyecto",
    "resume": "Recuperar resultados",
    "connection_failed": "No se pudo conectar. Actualiza la conexi\u00f3n.",
    "generation_disabled": "Ejecuci\u00f3n desactivada.",
    "submission_unknown": "Env\u00edo incierto. Revisa el historial Comfy antes de ejecutar de nuevo.",
    "comfyError": "Solicitud Comfy fallida"
  },
  "fr": {
    "run": "Ex\u00e9cuter",
    "project": "Ouvrez un projet.",
    "queued": "En attente\u2026",
    "running": "Ex\u00e9cution\u2026",
    "added": "Enregistr\u00e9 dans le projet",
    "resume": "R\u00e9cup\u00e9rer les r\u00e9sultats",
    "connection_failed": "Connexion impossible. Actualisez la connexion.",
    "generation_disabled": "Ex\u00e9cution d\u00e9sactiv\u00e9e.",
    "submission_unknown": "Envoi incertain. V\u00e9rifiez l\u2019historique Comfy avant de relancer.",
    "comfyError": "\u00c9chec de la requ\u00eate Comfy"
  },
  "it": {
    "run": "Esegui",
    "project": "Apri un progetto.",
    "queued": "In coda\u2026",
    "running": "Esecuzione\u2026",
    "added": "Salvato nel progetto",
    "resume": "Recupera risultati",
    "connection_failed": "Connessione non riuscita. Aggiornala.",
    "generation_disabled": "Esecuzione disattivata.",
    "submission_unknown": "Invio incerto. Controlla la cronologia Comfy prima di riprovare.",
    "comfyError": "Richiesta Comfy non riuscita"
  },
  "ja": {
    "run": "\u5b9f\u884c",
    "project": "\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u3092\u958b\u3044\u3066\u304f\u3060\u3055\u3044\u3002",
    "queued": "\u5f85\u6a5f\u4e2d\u2026",
    "running": "\u5b9f\u884c\u4e2d\u2026",
    "added": "\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u306b\u4fdd\u5b58\u6e08\u307f",
    "resume": "\u7d50\u679c\u3092\u5fa9\u5143",
    "connection_failed": "\u63a5\u7d9a\u3067\u304d\u307e\u305b\u3093\u3002\u63a5\u7d9a\u3092\u66f4\u65b0\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    "generation_disabled": "\u5b9f\u884c\u304c\u7121\u52b9\u3067\u3059\u3002",
    "submission_unknown": "\u53d7\u4ed8\u72b6\u6cc1\u304c\u4e0d\u660e\u3067\u3059\u3002\u518d\u5b9f\u884c\u524d\u306bComfy\u306e\u5c65\u6b74\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    "comfyError": "Comfy\u30ea\u30af\u30a8\u30b9\u30c8\u5931\u6557"
  },
  "pt": {
    "run": "Executar",
    "project": "Abra um projeto.",
    "queued": "Em fila\u2026",
    "running": "A executar\u2026",
    "added": "Guardado no projeto",
    "resume": "Recuperar resultados",
    "connection_failed": "N\u00e3o foi poss\u00edvel ligar. Atualize a liga\u00e7\u00e3o.",
    "generation_disabled": "Execu\u00e7\u00e3o desativada.",
    "submission_unknown": "Envio incerto. Consulte o hist\u00f3rico Comfy antes de executar de novo.",
    "comfyError": "Pedido Comfy falhou"
  },
  "tr": {
    "run": "\u00c7al\u0131\u015ft\u0131r",
    "project": "Bir proje a\u00e7\u0131n.",
    "queued": "S\u0131rada\u2026",
    "running": "\u00c7al\u0131\u015f\u0131yor\u2026",
    "added": "Projeye kaydedildi",
    "resume": "Sonu\u00e7lar\u0131 kurtar",
    "connection_failed": "Ba\u011flan\u0131lamad\u0131. Ba\u011flant\u0131y\u0131 yenileyin.",
    "generation_disabled": "\u00c7al\u0131\u015ft\u0131rma kapal\u0131.",
    "submission_unknown": "G\u00f6nderim belirsiz. Yeni \u00e7al\u0131\u015ft\u0131rmadan \u00f6nce Comfy ge\u00e7mi\u015fini kontrol edin.",
    "comfyError": "Comfy iste\u011fi ba\u015far\u0131s\u0131z"
  },
  "zh": {
    "run": "\u8fd0\u884c",
    "project": "\u8bf7\u6253\u5f00\u9879\u76ee\u3002",
    "queued": "\u6b63\u5728\u6392\u961f\u2026",
    "running": "\u6b63\u5728\u8fd0\u884c\u2026",
    "added": "\u5df2\u4fdd\u5b58\u5230\u9879\u76ee",
    "resume": "\u6062\u590d\u7ed3\u679c",
    "connection_failed": "\u65e0\u6cd5\u8fde\u63a5\u3002\u8bf7\u5237\u65b0\u8fde\u63a5\u3002",
    "generation_disabled": "\u8fd0\u884c\u5df2\u7981\u7528\u3002",
    "submission_unknown": "\u63d0\u4ea4\u72b6\u6001\u4e0d\u786e\u5b9a\u3002\u518d\u6b21\u8fd0\u884c\u524d\u8bf7\u68c0\u67e5Comfy\u8bb0\u5f55\u3002",
    "comfyError": "Comfy\u8bf7\u6c42\u5931\u8d25"
  }
};
const PANEL_COPY = {
  en: {
    editor: 'Open editor', newWorkflow: 'New workflow', createWorkflow: 'Create workflow', returnToEditor: 'Return to editor', workflowTitle: 'Workflow', selection: 'Select', editing: 'Editing in ComfyUI', emptyWorkflows: 'No workflows yet', editorUnavailable: 'Update Selects to open the workflow editor.',
    editor_not_installed: 'The workflow editor is not installed.',
    editor_download_failed: 'Could not download the workflow editor.',
    editor_checksum_failed: 'The workflow editor download could not be verified.',
    editor_extract_failed: 'Could not prepare the workflow editor.',
    results: 'Results', emptyResults: 'No results yet',
    chooseWorkflow: 'Choose a workflow',
    refresh: 'Retry', held: 'Run disabled', loading: 'Loading workflows\u2026',
    not_connected: 'The execution server is not connected.',
    invalid_key: 'The execution server could not authenticate.',
    destination: 'Saved to project',
  },
  ko: {
    editor: '\ud3b8\uc9d1\uae30 \uc5f4\uae30', newWorkflow: '\uc0c8 \uc6cc\ud06c\ud50c\ub85c\uc6b0', createWorkflow: '\uc6cc\ud06c\ud50c\ub85c\uc6b0 \ub9cc\ub4e4\uae30', returnToEditor: '\ud3b8\uc9d1\uae30\ub85c \ub3cc\uc544\uac00\uae30', workflowTitle: '\uc6cc\ud06c\ud50c\ub85c\uc6b0', selection: '\uc120\ud0dd', editing: 'ComfyUI\uc5d0\uc11c \ud3b8\uc9d1 \uc911', emptyWorkflows: '\uc544\uc9c1 \uc6cc\ud06c\ud50c\ub85c\uc6b0\uac00 \uc5c6\uc5b4\uc694.', editorUnavailable: '\ud3b8\uc9d1\uae30\ub97c \uc5f4\ub824\uba74 Selects\ub97c \uc5c5\ub370\uc774\ud2b8\ud574 \uc8fc\uc138\uc694.',
    results: '\uacb0\uacfc', emptyResults: '\uc544\uc9c1 \uacb0\uacfc \uc5c6\uc74c',
    chooseWorkflow: '\uc6cc\ud06c\ud50c\ub85c\uc6b0 \uc120\ud0dd',
    refresh: '\ub2e4\uc2dc \uc2dc\ub3c4', held: '\uc2e4\ud589 \ube44\ud65c\uc131', loading: '\uc6cc\ud06c\ud50c\ub85c\uc6b0 \ubd88\ub7ec\uc624\ub294 \uc911\u2026',
    not_connected: '\uc2e4\ud589 \uc11c\ubc84\uac00 \uc5f0\uacb0\ub418\uc9c0 \uc54a\uc558\uc5b4\uc694.',
    invalid_key: '\uc2e4\ud589 \uc11c\ubc84 \uc778\uc99d\uc744 \ud655\uc778\ud574 \uc8fc\uc138\uc694.',
    destination: '\ud504\ub85c\uc81d\ud2b8\uc5d0 \uc800\uc7a5',
  },
};

const READS = new Set(['status', 'list', 'load', 'jobs', 'job']);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
export default function Panel({ sdk, context, ui }) {
  const T = { ...(COPY[context.language] ?? COPY.en), ...PANEL_COPY.en, ...PANEL_COPY[context.language] };
  const scope = { projectId: context.projectId };
  const scopeKey = JSON.stringify(scope);
  const current = React.useRef({ scopeKey, epoch: 0, account: null, mounted: true });
  if (current.current.scopeKey !== scopeKey) current.current = { scopeKey, epoch: current.current.epoch + 1, account: null, mounted: true };
  const [connection, setConnection] = React.useState(null);
  const [connectionError, setConnectionError] = React.useState('');
  const [workflows, setWorkflows] = React.useState([]);
  const [selected, setSelected] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [pending, setPending] = React.useState(null);
  const [status, setStatus] = React.useState('');
  const [failed, setFailed] = React.useState(false);
  const [completed, setCompleted] = React.useState([]);
  const [loaded, setLoaded] = React.useState(null);
  const ready = loaded === current.current;
  const actionLock = React.useRef(null);
  const actionVersion = React.useRef(0);
  const refreshing = React.useRef(null);
  async function command(action, input = {}, captured = current.current) {
    const result = await sdk.runScript({ summary: 'ComfyUI ' + action, allowCommit: !READS.has(action),
      script: 'return await selects.comfy.execute(' + JSON.stringify({ action, scope, ...input }) + ');' });
    if (!current.current.mounted || current.current !== captured) throw new Error('comfy_context_changed');
    if (result.isError) {
      const output = String(result.output || '');
      const code = ['generation_disabled','unsupported_node','unsupported_model','revision_conflict','owned_asset_required','submission_unknown','comfy_update_required','comfy_not_configured','comfy_auth_required','comfy_context_changed','comfy_account_changed'].find(code => output.includes(code));
      throw new Error(code || 'connection_failed');
    }
    return result.result;
  }
  function reset() {
    setLoaded(null); setWorkflows([]); setSelected(null); setPending(null); setCompleted([]); setConnection(null); setStatus(''); setBusy(false); actionLock.current = null;
  }
  function account(next, captured) {
    if (captured.account && captured.account !== next.accountSession) {
      current.current = { ...captured, epoch: captured.epoch + 1, account: next.accountSession };
      reset();
      return false;
    }
    captured.account = next.accountSession;
    return true;
  }
  function readError(error, captured) {
    if (current.current !== captured || !captured.mounted) return;
    if (['comfy_auth_required', 'comfy_context_changed', 'comfy_account_changed'].includes(error.message)) {
      current.current = { ...captured, epoch: captured.epoch + 1, account: null };
      reset();
    }
    setConnectionError(T[error.message] || T.connection_failed);
  }
  async function refresh(captured = current.current) {
    const version = actionVersion.current;
    if (refreshing.current?.captured === captured && refreshing.current.version === version) return refreshing.current.promise;
    const read = { captured, version };
    read.promise = (async () => {
      const identity = command('status', {}, captured).then(next => {
        if (!account(next, captured)) {
          const owner = current.current;
          void refresh(owner).catch(error => readError(error, owner));
          throw new Error('comfy_context_changed');
        }
        return next;
      });
      const [next, result, jobs] = await Promise.all([identity, command('list', {}, captured), command('jobs', {}, captured)]);
      if (version !== actionVersion.current) return;
      setConnection(next); setWorkflows(result.workflows); setSelected(result.workflow);
      setPending(jobs.items.find(job => !['failed', 'canceled'].includes(job.state) && (job.state !== 'succeeded' || !job.delivered)) || null);
      setCompleted(jobs.items.filter(job => job.state === 'succeeded' && job.delivered).flatMap(job => job.outputs || []));
      setLoaded(captured); setConnectionError('');
    })();
    refreshing.current = read;
    try { return await read.promise; }
    finally { if (refreshing.current === read) refreshing.current = null; }
  }
  React.useEffect(() => {
    const captured = current.current;
    captured.mounted = true;
    reset(); setConnectionError('');
    if (scope.projectId) refresh(captured).catch(error => readError(error, captured));
    const timer = setInterval(() => {
      if (!scope.projectId) return;
      const owner = current.current;
      const read = actionLock.current ? command('status', {}, owner).then(next => {
        if (!account(next, owner)) {
          const nextOwner = current.current;
          return refresh(nextOwner).catch(error => readError(error, nextOwner));
        }
      }) : refresh(owner);
      read.catch(error => readError(error, owner));
    }, 2000);
    return () => { clearInterval(timer); current.current.mounted = false; };
  }, [scopeKey]);
  async function action(callback) {
    if (actionLock.current) return;
    const captured = current.current;
    const token = {};
    actionLock.current = token; actionVersion.current++; setBusy(true); setFailed(false); setStatus('');
    try { await callback(captured); }
    catch (error) { if (current.current === captured && captured.mounted) { setFailed(true); setStatus(T[error.message] || T.comfyError); } }
    finally { if (current.current === captured && actionLock.current === token) { actionLock.current = null; setBusy(false); } }
  }
  async function openEditor(newWorkflow, captured) {
    await command('openEditor', { newWorkflow }, captured);
    await refresh(captured);
  }
  async function deliver(job, captured) {
    const result = await command('deliver', { id: job.id }, captured);
    setStatus(T.added + ' (' + result.resourceIds.length + ')');
    await refresh(captured);
  }
  async function follow(job, captured) {
    while (current.current === captured && captured.mounted) {
      setPending(job);
      if (job.state === 'succeeded') { await deliver(job, captured); return; }
      if (['failed', 'canceled', 'submission_unknown'].includes(job.state)) throw new Error(job.error || job.state);
      await sleep(1500);
      job = await command('job', { id: job.id }, captured);
    }
  }
  async function run(captured) {
    const job = await command('run', { id: selected.id, operationId: crypto.randomUUID() }, captured);
    await follow(job, captured);
  }
  return <>
    {connectionError && <ui.Section title="ComfyUI" actions={<ui.Button variant="ghost" disabled={busy || !scope.projectId} onClick={() => action(refresh)}>{T.refresh}</ui.Button>}>
      <ui.Message tone="error">{connectionError}</ui.Message>
    </ui.Section>}
    <ui.Section title={T.workflowTitle} actions={ready && workflows.length > 0 && <ui.IconButton icon="plus" label={T.newWorkflow} disabled={busy || !!pending || !!connection?.editorOpen} onClick={() => action(captured => openEditor(true, captured))} />}>
      {scope.projectId && !ready && !connectionError && <ui.Progress label={T.loading} />}
      {ready && (workflows.length > 0 ? <ui.Stack>
        <ui.Select label={T.selection} value={selected?.id || null} disabled={busy || !!pending || !!connection?.editorOpen} placeholder={T.chooseWorkflow}
          options={workflows.map(item => ({ value: item.id, label: item.name }))}
          onChange={id => action(async captured => { setSelected(await command('select', { id }, captured)); })} />
        {selected && <>
          <ui.Actions><ui.Button variant="secondary" disabled={busy || !!pending} onClick={() => action(captured => openEditor(false, captured))}>{T.editor}</ui.Button></ui.Actions>
          {connection?.editorOpen && <ui.Message>{T.editing}</ui.Message>}
          <ui.Actions><ui.Button variant="primary" busy={busy && !!pending} disabled={busy || !!pending || !!connection?.editorOpen || !connection?.generationEnabled || !selected.document?.workflow} onClick={() => action(run)}>{T.run}</ui.Button></ui.Actions>
        </>}
      </ui.Stack> : <ui.Stack>
        <ui.Message>{T.emptyWorkflows}</ui.Message>
        <ui.Actions><ui.Button variant="primary" disabled={busy || !connection || !!pending} onClick={() => action(captured => openEditor(!connection?.editorOpen, captured))}>{connection?.editorOpen ? T.returnToEditor : T.createWorkflow}</ui.Button></ui.Actions>
      </ui.Stack>)}
      {!scope.projectId && <ui.Message>{T.project}</ui.Message>}
      {status && <ui.Message tone={failed ? 'error' : 'success'}>{status}</ui.Message>}
    </ui.Section>
    {ready && (pending || completed.length > 0) && <ui.Section title={T.results}>
      {pending && <ui.Stack><ui.Progress value={pending.progress} label={T[pending.state] || T.running} />
        <ui.Actions><ui.Button variant="secondary" disabled={busy} onClick={() => action(captured => follow(pending, captured))}>{T.resume}</ui.Button></ui.Actions></ui.Stack>}
      {completed.map(output => <div key={output.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ flexShrink: 0 }}><ui.Icon name="file" size={14} /></span><span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{output.name}</span></div>)}
    </ui.Section>}
  </>;
}
