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
    "refresh": "Refresh connection",
    "nodes": "nodes",
    "choose": "Choose file",
    "clear": "Remove",
    "guide": "JSON exported from Comfy in API format",
    "jsonPlaceholder": "Paste API-format JSON",
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
    "refresh": "\uc5f0\uacb0 \uc0c8\ub85c\uace0\uce68",
    "nodes": "\ub178\ub4dc",
    "choose": "\ud30c\uc77c \uc120\ud0dd",
    "clear": "\uc81c\uac70",
    "guide": "Comfy\uc5d0\uc11c \ub0b4\ubcf4\ub0b8 API \ud615\uc2dd JSON",
    "jsonPlaceholder": "API \ud615\uc2dd JSON \ubd99\uc5ec\ub123\uae30",
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
    "refresh": "Verbindung aktualisieren",
    "nodes": "Knoten",
    "choose": "Datei w\u00e4hlen",
    "clear": "Entfernen",
    "guide": "Aus Comfy im API-Format exportiertes JSON",
    "jsonPlaceholder": "JSON im API-Format einf\u00fcgen",
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
    "refresh": "Actualizar conexi\u00f3n",
    "nodes": "nodos",
    "choose": "Elegir archivo",
    "clear": "Quitar",
    "guide": "JSON exportado desde Comfy en formato API",
    "jsonPlaceholder": "Pega JSON en formato API",
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
    "refresh": "Actualiser la connexion",
    "nodes": "n\u0153uds",
    "choose": "Choisir un fichier",
    "clear": "Retirer",
    "guide": "JSON export\u00e9 de Comfy au format API",
    "jsonPlaceholder": "Collez le JSON au format API",
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
    "refresh": "Aggiorna connessione",
    "nodes": "nodi",
    "choose": "Scegli file",
    "clear": "Rimuovi",
    "guide": "JSON esportato da Comfy in formato API",
    "jsonPlaceholder": "Incolla JSON in formato API",
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
    "refresh": "\u63a5\u7d9a\u3092\u66f4\u65b0",
    "nodes": "\u30ce\u30fc\u30c9",
    "choose": "\u30d5\u30a1\u30a4\u30eb\u3092\u9078\u629e",
    "clear": "\u524a\u9664",
    "guide": "Comfy\u304b\u3089API\u5f62\u5f0f\u3067\u66f8\u304d\u51fa\u3057\u305fJSON",
    "jsonPlaceholder": "API\u5f62\u5f0f\u306eJSON\u3092\u8cbc\u308a\u4ed8\u3051",
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
    "refresh": "Atualizar liga\u00e7\u00e3o",
    "nodes": "n\u00f3s",
    "choose": "Escolher ficheiro",
    "clear": "Remover",
    "guide": "JSON exportado do Comfy em formato API",
    "jsonPlaceholder": "Colar JSON em formato API",
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
    "refresh": "Ba\u011flant\u0131y\u0131 yenile",
    "nodes": "d\u00fc\u011f\u00fcm",
    "choose": "Dosya se\u00e7",
    "clear": "Kald\u0131r",
    "guide": "Comfy'den API bi\u00e7iminde d\u0131\u015fa aktar\u0131lan JSON",
    "jsonPlaceholder": "API bi\u00e7imli JSON yap\u0131\u015ft\u0131r\u0131n",
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
    "refresh": "\u5237\u65b0\u8fde\u63a5",
    "nodes": "\u8282\u70b9",
    "choose": "\u9009\u62e9\u6587\u4ef6",
    "clear": "\u79fb\u9664",
    "guide": "\u4eceComfy\u5bfc\u51fa\u7684API\u683c\u5f0fJSON",
    "jsonPlaceholder": "\u7c98\u8d34API\u683c\u5f0fJSON",
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
    editor: 'Edit', newWorkflow: 'New Workflow', emptyWorkflows: 'No saved workflows', editorUnavailable: 'Update Selects to open the workflow editor.',
    editor_not_installed: 'The workflow editor is not installed.',
    editor_download_failed: 'Could not download the workflow editor.',
    editor_checksum_failed: 'The workflow editor download could not be verified.',
    editor_extract_failed: 'Could not prepare the workflow editor.',
    inputs: 'Inputs', results: 'Results', emptyResults: 'No results yet',
    importWorkflow: 'Load workflow', savedWorkflows: 'Saved workflows', chooseWorkflow: 'Choose a workflow', json: 'JSON', apply: 'Apply', saved: 'Saved',
    refresh: 'Retry', held: 'Run disabled',
    not_connected: 'The execution server is not connected.',
    invalid_key: 'The execution server could not authenticate.',
    destination: 'Saved to project',
  },
  ko: {
    editor: '\ud3b8\uc9d1', newWorkflow: '\uc0c8 Workflow', emptyWorkflows: '\uc800\uc7a5\ub41c Workflow\uac00 \uc5c6\uc5b4\uc694.', editorUnavailable: '\ud3b8\uc9d1\uae30\ub97c \uc5f4\ub824\uba74 Selects\ub97c \uc5c5\ub370\uc774\ud2b8\ud574 \uc8fc\uc138\uc694.',
    inputs: '\uc785\ub825', results: '\uacb0\uacfc', emptyResults: '\uc544\uc9c1 \uacb0\uacfc \uc5c6\uc74c',
    importWorkflow: '\ubd88\ub7ec\uc624\uae30', savedWorkflows: '\uc800\uc7a5\ub41c Workflow', chooseWorkflow: 'Workflow \uc120\ud0dd', json: 'JSON', apply: '\uc801\uc6a9', saved: '\uc800\uc7a5\ub428',
    refresh: '\ub2e4\uc2dc \uc2dc\ub3c4', held: '\uc2e4\ud589 \ube44\ud65c\uc131',
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
  if (current.current.scopeKey !== scopeKey) current.current = { ...current.current, scopeKey, epoch: current.current.epoch + 1 };
  const [connection, setConnection] = React.useState(null);
  const [connectionError, setConnectionError] = React.useState('');
  const [workflows, setWorkflows] = React.useState([]);
  const [selected, setSelected] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [choosing, setChoosing] = React.useState(false);
  const [text, setText] = React.useState('');
  const [file, setFile] = React.useState(null);
  const [pending, setPending] = React.useState(null);
  const [status, setStatus] = React.useState('');
  const [failed, setFailed] = React.useState(false);
  const [completed, setCompleted] = React.useState([]);
  const actionLock = React.useRef(false);
  async function command(action, input = {}, captured = current.current) {
    const result = await sdk.runScript({ summary: 'ComfyUI ' + action, allowCommit: !READS.has(action),
      script: 'return await selects.comfy.execute(' + JSON.stringify({ action, scope, ...input }) + ');' });
    if (!current.current.mounted || current.current !== captured) throw new Error('comfy_context_changed');
    if (result.isError) {
      const output = String(result.output || '');
      const code = ['generation_disabled','unsupported_node','unsupported_model','revision_conflict','owned_asset_required','submission_unknown','comfy_update_required','comfy_not_configured','comfy_auth_required'].find(code => output.includes(code));
      throw new Error(code || 'connection_failed');
    }
    return result.result;
  }
  async function refresh(captured = current.current) {
    const next = await command('status', {}, captured);
    if (captured.account && captured.account !== next.accountSession) {
      current.current = { ...captured, epoch: captured.epoch + 1, account: next.accountSession };
      setWorkflows([]); setSelected(null); setPending(null); setCompleted([]); setStatus(''); setText(''); setBusy(false); actionLock.current = false;
      return refresh(current.current);
    }
    captured.account = next.accountSession;
    setConnection(next);
    const result = await command('list', {}, captured);
    setWorkflows(result.workflows); setSelected(result.workflow);
    const jobs = await command('jobs', {}, captured);
    setPending(jobs.items.find(job => !['failed', 'canceled'].includes(job.state) && (job.state !== 'succeeded' || !job.delivered)) || null);
    setCompleted(jobs.items.filter(job => job.state === 'succeeded' && job.delivered).flatMap(job => job.outputs || []));
    setConnectionError('');
  }
  React.useEffect(() => {
    const captured = current.current;
    captured.mounted = true;
    setWorkflows([]); setSelected(null); setPending(null); setCompleted([]); setConnection(null); setConnectionError(''); setStatus('');
    if (scope.projectId) refresh(captured).catch(error => { if (current.current === captured) setConnectionError(T[error.message] || T.connection_failed); });
    const timer = setInterval(() => {
      if (!scope.projectId) return;
      command('status').then(next => {
        if (current.current.account !== next.accountSession) return refresh();
        setConnection(next);
        if (!actionLock.current) return refresh();
      }).catch(error => {
        current.current = { ...current.current, epoch: current.current.epoch + 1, account: null };
        setConnection(null); setSelected(null); setWorkflows([]); setPending(null); setCompleted([]); setText(''); setFile(null); setBusy(false); actionLock.current = false;
        setConnectionError(T[error.message] || T.connection_failed);
      });
    }, 2000);
    return () => { clearInterval(timer); captured.mounted = false; };
  }, [scopeKey]);
  async function action(callback) {
    if (actionLock.current) return;
    const captured = current.current;
    actionLock.current = true; setBusy(true); setFailed(false); setStatus('');
    try { await callback(captured); }
    catch (error) { if (current.current === captured && captured.mounted) { setFailed(true); setStatus(T[error.message] || T.comfyError); } }
    finally { if (current.current === captured) { actionLock.current = false; setBusy(false); } }
  }
  async function openEditor(newWorkflow, captured) {
    await command('openEditor', { newWorkflow }, captured);
    await refresh(captured);
  }
  async function save(captured) {
    if (file) await command('loadFile', { path: file.path, name: file.name.replace(/\.json$/i, '') }, captured);
    else {
      let input;
      try { input = JSON.parse(text); } catch { throw new Error('invalidJson'); }
      const document = Array.isArray(input.nodes) ? { editorWorkflow: input, workflow: null } : { workflow: input };
      await command('save', { name: 'Workflow', document }, captured);
    }
    setChoosing(false); setText(''); setFile(null); await refresh(captured);
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
    <ui.Section title="Workflow">
      {workflows.length > 0 ? <ui.Select label={T.savedWorkflows} value={selected?.id || ''} disabled={busy || !!pending} placeholder={T.chooseWorkflow}
        options={workflows.map(item => ({ value: item.id, label: item.name }))}
        onChange={id => action(async captured => { setSelected(await command('select', { id }, captured)); })} /> : scope.projectId && <ui.Message>{T.emptyWorkflows}</ui.Message>}
      {selected && <small>{selected.nodeCount} {T.nodes}</small>}
      <ui.Actions>
        {selected && <ui.Button variant="secondary" disabled={busy || !!pending} onClick={() => action(captured => openEditor(false, captured))}>{T.editor}</ui.Button>}
        <ui.Button variant="secondary" disabled={busy || !connection || !scope.projectId || !!pending} onClick={() => action(captured => openEditor(true, captured))}>{T.newWorkflow}</ui.Button>
        <ui.Button variant="ghost" disabled={busy || !connection || !!pending} onClick={() => setChoosing(!choosing)}>{T.importWorkflow}</ui.Button>
        {selected && <ui.Button variant="primary" busy={busy && !!pending} disabled={busy || !!pending || !connection?.generationEnabled || !selected.document?.workflow} onClick={() => action(run)}>{T.run}</ui.Button>}
      </ui.Actions>
      {choosing && <ui.Stack>
        <ui.FileDrop accept={['json']} value={file} disabled={busy} labels={{ choose: T.choose, drop: T.guide, clear: T.clear }} onChange={setFile} />
        <ui.TextField label={T.json} multiline placeholder={T.jsonPlaceholder} value={text} disabled={busy} onChange={setText} />
        <ui.Actions><ui.Button variant="secondary" disabled={busy || (!file && !text.trim())} onClick={() => action(save)}>{T.apply}</ui.Button></ui.Actions>
      </ui.Stack>}
      {!scope.projectId && <ui.Message>{T.project}</ui.Message>}
      {status && <ui.Message tone={failed ? 'error' : 'success'}>{status}</ui.Message>}
    </ui.Section>
    {(pending || completed.length > 0) && <ui.Section title={T.results}>
      {pending && <ui.Stack><ui.Progress value={pending.progress} label={T[pending.state] || T.running} />
        <ui.Actions><ui.Button variant="secondary" disabled={busy} onClick={() => action(captured => follow(pending, captured))}>{T.resume}</ui.Button></ui.Actions></ui.Stack>}
      {completed.map(output => <div key={output.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ui.Icon name="file" size={14} /><span>{output.name}</span></div>)}
    </ui.Section>}
  </>;
}
