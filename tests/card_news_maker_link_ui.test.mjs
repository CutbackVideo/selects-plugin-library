import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadPanelModule, disposePanelModule } from './panel_module_fixture.mjs';
const source = fs.readFileSync(new URL('../plugins/card-news-maker/panel.tsx', import.meta.url), 'utf8');
const plain = (v) => JSON.parse(JSON.stringify(v));
const layout = { kind: 'layout', id: 'team', name: 'Team design', version: 1, language: 'ko', size: { width: 1080, height: 1350 }, shade: null, font: { family: 'Test', weight: 700, size: 72, tracking: -.04, color: '#FFFFFF', lineHeight: 88 }, lines: [{ left: 125, top: 942, width: 830, align: 'center' }, { left: 125, top: 1058, width: 830, align: 'center' }], logo: null };
const work = { id: 'legacy', name: 'Saved photo work', articleUrl: 'https://example.test/news', createdAt: '2026-10-30', updatedAt: '2026-10-30', requirements: 'Saved instructions', format: 'jpeg', template: layout, cards: [{ lines: ['One', 'Two'], crop: { zoom: 1.6, x: -.25, y: .4 }, photo: { path: '/photos/a.png', name: 'a.png', width: 1920, height: 1080 } }] };
const root = '/memory/.selects/plugin-data/card-news-maker';
function nodes(tree) { const out = [], seen = new Set(); function visit(v) { if (!v || typeof v !== 'object' || seen.has(v)) return; seen.add(v); if ('type' in v && 'props' in v) out.push(v); if (v.type === 'TemplateTransferDialog' && !v.props.open) return; for (const x of Object.values(v)) visit(x); } visit(tree); return out; }
function harness({ legacy = false, sdk: extra = {}, job, templatePack, disk: existingDisk, layouts = [layout], language = 'en' } = {}) {
  const disk = existingDisk || new Map(layouts.map(l => [root + '/layout-templates/' + l.id + '.json', new TextEncoder().encode(JSON.stringify(l))]));
  if (legacy) disk.set(root + '/photo-works/legacy.json', new TextEncoder().encode(JSON.stringify(work)));
  if (job) disk.set(root + '/jobs/' + job.id + '.json', new TextEncoder().encode(JSON.stringify(job)));
  const mainHooks = [], editorHooks = [], effects = []; let hooks = mainHooks, at = 0, tree;
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }), Fragment: 'Fragment',
    useState(initial) { const slots = hooks, i = at++; slots[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [slots[i].value, (v) => { slots[i].value = typeof v === 'function' ? v(slots[i].value) : v; }]; },
    useRef(initial) { const i = at++; return hooks[i] ??= { current: initial }; },
    useMemo(fn, deps) { const i = at++; if (!hooks[i] || !same(hooks[i].deps, deps)) hooks[i] = { deps, value: fn() }; return hooks[i].value; },
    useCallback(fn, deps) { return React.useMemo(() => fn, deps); },
    useEffect(fn, deps) { const slots = hooks, i = at++; if (!slots[i] || !same(slots[i].deps, deps)) { const old = slots[i]; slots[i] = { deps, cleanup: old?.cleanup }; effects.push(() => { old?.cleanup?.(); slots[i].cleanup = fn(); }); } },
  };
  const files = { join: path.posix.join, homedir: () => '/memory', exists: async () => true, mkdir: async () => {}, stat: async (p) => ({ isDirectory: p === '/photos', size: 10000 }), readdir: async (p) => p === '/photos' ? ['b.png', 'a.png'] : [...disk.keys()].filter((n) => path.posix.dirname(n) === p).map((n) => path.posix.basename(n)), readFile: async (p) => disk.get(p) || new Uint8Array([1, 2, 3]), writeFile: async (p, data) => { disk.set(p, data); }, rm: async (p) => { disk.delete(p); }, removeFile: async ({ filePath }) => { disk.delete(filePath); }, getOrCreateTmpDirPath: async () => '/tmp', downloadFile: async (_, p) => { disk.set(p, new TextEncoder().encode('<meta property="og:type" content="article"><meta property="og:title" content="Article"><article><p>' + 'Verified article facts. '.repeat(40) + '</p></article>')); } };
  const sdk = { runScript: async () => ({ result: [] }), aiProviders: async () => ({ chatgpt: 'connected', selects: 'connected' }), ...extra };
  const ui = new Proxy({}, { get: (_, k) => String(k) });
  const context = { projectId: 'p', language, templatePack };
  const canvas = () => ({ getContext: () => ({ measureText: () => ({ width: 1 }), fillRect() {}, drawImage() {}, fillText() {}, getImageData: () => ({ data: [0, 0, 0, 255] }) }), toDataURL: () => 'data:image/jpeg;base64,YQ==', toBlob: (fn, mime) => fn(new Blob([new Uint8Array([1, 2, 3])], { type: mime })) });
  const bindings = loadPanelModule(source, { names: ['ProjectPanel', 'TemplateEditor', 'CardEditor', 'CardSupport', 'makeStore', 'installLinkedTemplate', 'BUILTIN_TEMPLATES'], React, overrides: { hostSdk: { files, dialogs: { pickDirectoryPath: async () => '/photos' } }, hostUseSdk() {}, useAppUpdateGuard() {} }, globals: { Blob, window: {}, document: { createElement: canvas }, createImageBitmap: async () => ({ width: 1920, height: 1080, close() {} }) } });
  function render() { hooks = mainHooks; at = 0; tree = bindings.ProjectPanel({ sdk, ui, context }); return tree; }
  function renderEditor() { const node = nodes(render()).find(n => n.type === bindings.TemplateEditor); hooks = editorHooks; at = 0; return bindings.TemplateEditor(node.props); }
  return {
    bindings, disk, files, sdk, context, render, tree: () => tree,
    renderEditor,
    editorFind(type, label) { return nodes(renderEditor()).find(n => n.type === type && (label === undefined || n.props.label === label || n.props.children?.includes(label))); },
    async settleEditor() { for (let i = 0; i < 6; i++) { renderEditor(); effects.splice(0).forEach(fn => fn()); await new Promise(r => setImmediate(r)); } return renderEditor(); },
    async settle() { for (let i = 0; i < 6; i++) { render(); effects.splice(0).forEach((fn) => fn()); await new Promise((r) => setImmediate(r)); } return render(); },
    find(type, label) { return nodes(render()).find((n) => n.type === type && (n.props.label === label || n.props.children?.includes(label))); },
    component(type) { return nodes(render()).find((n) => n.type === bindings[type]); },
    unmount() { [...mainHooks,...editorHooks].forEach((h) => h?.cleanup?.()); },
    close() { disposePanelModule(bindings); },
  };
}

test('new article form has optional photos OFF and one shared template, instructions and Generate', async () => {
  const h = harness();
  try {
    await h.settle();
    assert.equal(h.find('Toggle', 'Use my own images').props.value, false);
    assert.equal(h.find('FileDrop', undefined), undefined);
    const tree = nodes(h.render());
    assert.equal(tree.filter((n) => n.type === 'TextField' && n.props.label === 'Extra instructions (optional)').length, 1);
    assert.equal(tree.filter((n) => n.type === 'Button' && n.props.children.includes('Generate')).length, 1);
    assert.ok(h.find('TemplateChoice', 'Template').props.options.some((o) => o.value === 'layout-team'));
    h.find('Toggle', 'Use my own images').props.onChange(true);
    assert.ok(nodes(h.render()).some((n) => n.type === 'FileDrop'));
    assert.equal(nodes(h.render()).filter((n) => n.type === 'TemplateChoice' && n.props.label === 'Template').length, 1);
  } finally { h.close(); }
});

test('legacy photo cards use the same CardEditor as article cards and saves never rewrite the source snapshot', async () => {
  const h = harness({ legacy: true, layouts: [layout, {...layout,id:'other',name:'Other saved design'}] });
  try {
    const before = h.disk.get(root + '/photo-works/legacy.json'); await h.settle();
    h.find('Select', 'Saved').props.onChange('photo-p-legacy'); await h.settle();
    const editor = h.component('CardEditor'); assert.equal(editor.props.t.id, 'layout-team');
    assert.equal(editor.props.card.headline, 'One\nTwo'); assert.equal(editor.props.card.crop.zoom, 1.6);
    assert.equal(h.find('Select', 'Format').props.value, 'jpeg');
    editor.props.onChange({ ...editor.props.card, headline: 'Edited\nText' }); h.render(); h.unmount();
    const saved = await h.bindings.makeStore().list('jobs');
    assert.equal(saved.find((j) => j.id === 'photo-p-legacy').plan.cards[0].headline, 'Edited\nText');
    assert.equal(h.disk.get(root + '/photo-works/legacy.json'), before);
    h.find('TemplateChoice', 'Template').props.onChange('layout-other');
    assert.equal(h.component('CardEditor').type, editor.type);
    assert.equal(h.component('CardEditor').props.t.id, 'layout-other');
    assert.equal(h.component('CardEditor').props.card.headline, 'Edited\nText');
  } finally { h.close(); }
});

test('all designs use the same TemplateEditor and share Look/Brand/AI state', async () => {
  const h = harness({ layouts: [layout, {...layout,id:'other',name:'Other saved design'}] });
  try {
    await h.settle();
    const editor = h.component('TemplateEditor');
    assert.ok(editor.props.templates.some((t) => t.id === 'layout-team'));
    editor.props.state.setSelId('layout-team');
    const team = h.component('TemplateEditor');
    assert.equal(team.type, editor.type); assert.equal(team.props.state.selId, 'layout-team');
    assert.equal(team.props.layoutLibrary, undefined);
    assert.ok(team.props.templates.find((t) => t.id === 'layout-team').look.textSlots);
    team.props.state.setSelId('layout-other'); assert.equal(h.component('TemplateEditor').type, team.type);
  } finally { h.close(); }
});

test('own photos and requirements reach the one generation contract and return common file-picture cards', async () => {
  let request;
  const h = harness({ sdk: { askAI: async (input) => { request = input; return { text: '{"cards":[{"headline":"Cover","image":{"source":"generate"}},{"body":"Body","image":{"source":"generate"}}]}' }; } } });
  try {
    await h.settle();
    h.find('TextField', 'Article link').props.onChange('https://example.test/news');
    h.find('TextField', 'Extra instructions (optional)').props.onChange('Focus on commuters');
    h.find('TemplateChoice', 'Template').props.onChange('layout-team');
    h.find('Toggle', 'Use my own images').props.onChange(true);
    const drop = nodes(h.render()).find((n) => n.type === 'FileDrop');
    await drop.props.onChange({ path: '/photos' });
    await h.find('Button', 'Generate').props.onClick(); await h.settle();
    assert.equal(request.provider, 'chatgpt'); assert.match(request.prompt, /Focus on commuters/); assert.match(request.prompt, /Verified article facts/);
    const editors = nodes(h.render()).filter((n) => n.type === h.bindings.CardEditor);
    assert.equal(editors.length, 2); assert.deepEqual(editors.map((n) => n.props.card.picture.path), ['/photos/a.png', '/photos/b.png']);
    assert.ok(editors.every((n) => n.props.t.id === 'layout-team'));
  } finally { h.close(); }
});

test('provider 503 keeps source inputs and never falls back to managed credits', async () => {
  const calls = [];
  const h = harness({ sdk: { askAI: async (input) => { calls.push(input.provider); throw Error('HTTP 503'); } } });
  try {
    await h.settle(); h.find('TextField', 'Article link').props.onChange('https://example.test/news');
    h.find('TextField', 'Extra instructions (optional)').props.onChange('Keep these instructions');
    await h.find('Button', 'Generate').props.onClick(); await h.settle();
    assert.deepEqual(calls, ['chatgpt']);
    assert.equal(h.find('TextField', 'Article link').props.value, 'https://example.test/news');
    assert.equal(h.find('TextField', 'Extra instructions (optional)').props.value, 'Keep these instructions');
    assert.ok(nodes(h.render()).some((n) => n.type === 'Message' && n.props.children.some((v) => typeof v === 'string' && v.includes('503'))));
  } finally { h.close(); }
});

test('failed still export retains the common Draft receipt, and retry does not build a second Draft', async () => {
  let builds = 0, renders = 0;
  const job = { id: 'j', projectId: 'p', templateId: 'report-en', plan: { article: { title: 'News', images: [] }, cards: [{ role: 'cover', headline: 'Text', picture: { kind: 'none' } }], caption: 'Caption', hashtags: '#tag' } };
  const h = harness({ job, sdk: { runScript: async ({ summary }) => {
    if (summary === 'List project videos') return { result: [] };
    if (summary === 'Check for an existing draft') return { result: null };
    if (summary.startsWith('Build ')) return { result: { draftId: 'd' + (++builds), fps: 24, bounds: [[0, 72]] } };
    if (summary === 'Read the card ranges') return { result: { fps: 24, cards: [['Card 01', 0, 72]] } };
    if (summary === 'Export card composite') return ++renders === 1 ? { isError: true, output: 'render failed' } : { result: {} };
    return { result: { folderId: 'f', moved: 0, skipped: 0 } };
  } } });
  try {
    await h.settle(); h.find('Select', 'Saved').props.onChange('j'); await h.settle();
    await h.find('Button', 'Export card images').props.onClick(); await h.settle();
    const saved = await h.bindings.makeStore().list('jobs'); assert.equal(saved.find((j) => j.id === 'j').draftId, 'd1');
    await h.find('Button', 'Export card images').props.onClick(); await h.settle();
    assert.equal(builds, 1); assert.equal(renders, 2);
    assert.ok([...h.disk.keys()].some((p) => p.endsWith('/card-01.png')));
  } finally { h.close(); }
});


test('article fallback belongs to its URL and is cleared by Start over before a new article is generated', async () => {
  const prompts = [], downloads = [];
  const h = harness({ sdk: { askAI: async ({ prompt }) => { prompts.push(prompt); return { text: '{"cards":[{"headline":"Cover","image":{"source":"none"}}]}' }; } } });
  try {
    h.files.downloadFile = async (url, p) => { downloads.push(url); if (url.endsWith('/a')) throw Error('HTTP 403'); h.disk.set(p, new TextEncoder().encode('<meta property="og:type" content="article"><article><p>' + 'FRESH_B_FACT '.repeat(40) + '</p></article>')); };
    await h.settle(); h.find('TextField', 'Article link').props.onChange('https://example.test/a');
    await h.find('Button', 'Generate').props.onClick(); await h.settle();
    h.find('TextField', 'Article text').props.onChange('ONLY_OLD_ARTICLE_FACT '.repeat(40));
    await h.find('Button', 'Generate').props.onClick(); await h.settle();
    assert.match(prompts[0], /ONLY_OLD_ARTICLE_FACT/);
    h.find('Button', 'Start over').props.onClick();
    assert.equal(h.find('TextField', 'Article text'), undefined);
    h.find('TextField', 'Article link').props.onChange('https://example.test/b');
    await h.find('Button', 'Generate').props.onClick(); await h.settle();
    assert.ok(downloads.includes('https://example.test/b'));
    assert.match(prompts[1], /FRESH_B_FACT/); assert.doesNotMatch(prompts[1], /ONLY_OLD_ARTICLE_FACT/);
  } finally { h.close(); }
});

test('fixed-box overflow blocks export before any Draft or render can be created', async () => {
  let writes = 0;
  const h = harness({ legacy: true, sdk: { runScript: async ({ summary }) => { if (summary !== 'List project videos') writes++; return { result: [] }; } } });
  try {
    await h.settle(); h.find('Select', 'Saved').props.onChange('photo-p-legacy'); await h.settle();
    const e = h.component('CardEditor'); e.props.onChange({ ...e.props.card, headline: 'One\nTwo\nThree' });
    await h.find('Button', 'Export card images').props.onClick(); await h.settle();
    assert.equal(writes, 0);
    assert.ok(nodes(h.render()).some((n) => n.type === 'Message' && n.props.children.some((v) => typeof v === 'string' && v.includes('only 2 text lines'))));
  } finally { h.close(); }
});


test('Start over and Saved reopen the newest edited work without requiring a remount', async () => {
  const h = harness({ legacy: true });
  try {
    await h.settle(); h.find('Select', 'Saved').props.onChange('photo-p-legacy'); await h.settle();
    const e = h.component('CardEditor'); e.props.onChange({ ...e.props.card, headline: 'Newest edit' }); await h.settle();
    h.find('Button', 'Start over').props.onClick(); await h.settle();
    h.find('Select', 'Saved').props.onChange('photo-p-legacy'); await h.settle();
    assert.equal(h.component('CardEditor').props.card.headline, 'Newest edit');
  } finally { h.close(); }
});

test('an older background Saved read cannot replace a newer edit in cache or on disk', async () => {
  const job = { id: 'j', projectId: 'p', templateId: 'report-en', plan: { article: { title: 'News', images: [] }, cards: [{ role: 'cover', headline: 'Old text', picture: { kind: 'none' } }], caption: 'Caption', hashtags: '#tag' } };
  const h = harness({ job, sdk: { runScript: async ({ summary }) => {
    if (summary === 'List project videos') return { result: [] };
    if (summary === 'Check for an existing draft') return { result: null };
    if (summary.startsWith('Build ')) return { result: { draftId: 'd', fps: 24, bounds: [[0, 72]] } };
    if (summary === 'Read the card ranges') return { result: { fps: 24, cards: [['Card 01', 0, 72]] } };
    return { result: { folderId: 'f' } };
  } } });
  let release;
  try {
    await h.settle(); h.find('Select', 'Saved').props.onChange('j'); await h.settle();
    const gate = new Promise((r) => { release = r; });
    const original = h.files.readdir; let gated = false;
    h.files.readdir = async (p) => { if (p.endsWith('/photo-works')) { gated = true; await gate; } return original(p); };
    await h.find('Button', 'Export card images').props.onClick(); await h.settle(); assert.equal(gated, true);
    const editor = h.component('CardEditor'); editor.props.onChange({ ...editor.props.card, headline: 'Newest edit' }); await h.settle();
    release(); await h.settle();
    h.find('Button', 'Start over').props.onClick(); await h.settle();
    h.find('Select', 'Saved').props.onChange('j'); await h.settle();
    assert.equal(h.component('CardEditor').props.card.headline, 'Newest edit');
    assert.equal(JSON.parse(new TextDecoder().decode(h.disk.get(root + '/jobs/j.json'))).plan.cards[0].headline, 'Newest edit');
  } finally { release?.(); h.close(); }
});

test('progress spins only during a live request, including 503 and Saved restore', async () => {
  let reject;
  const gate = new Promise((_, r) => { reject = r; });
  const h = harness({ sdk: { askAI: () => gate } });
  try {
    await h.settle();
    assert.equal(h.find('Progress'), undefined);
    h.find('TextField', 'Article link').props.onChange('https://example.test/news');
    const request = h.find('Button', 'Generate').props.onClick(); await h.settle();
    assert.equal(h.find('Progress').props.current, 0);
    assert.equal(h.find('Progress').props.busy, true);
    reject(Error('HTTP 503')); await request; await h.settle();
    assert.equal(h.find('Progress').props.busy, false);
    const [job] = await h.bindings.makeStore().list('jobs');
    h.find('Select', 'Saved').props.onChange(job.id); await h.settle();
    assert.equal(h.find('Progress').props.current, 0);
    assert.equal(h.find('Progress').props.busy, false);
  } finally { h.close(); }
});

test('template creation is an unsaved draft; cancel writes nothing and Save persists the shared editor fields', async () => {
  const h = harness();
  try {
    await h.settleEditor(); const before = [...h.disk.keys()];
    h.editorFind('TemplateToolbar').props.onCreate();
    h.editorFind('TextField', 'Name').props.onChange('My news');
    h.editorFind('Button', 'New template').props.onClick(); await h.settleEditor();
    assert.match(h.editorFind('TemplateToolbar').props.value, /^t/);
    assert.deepEqual([...h.disk.keys()], before);
    h.editorFind('Button', 'Cancel').props.onClick(); await h.settleEditor();
    assert.deepEqual([...h.disk.keys()], before);
    h.editorFind('TemplateToolbar').props.onCreate();
    h.editorFind('TextField', 'Name').props.onChange('Saved design');
    h.editorFind('Button', 'New template').props.onClick(); await h.settleEditor();
    const id = h.editorFind('TemplateToolbar').props.value;
    await h.editorFind('Button', 'Save').props.onClick(); await h.settleEditor();
    const saved = JSON.parse(new TextDecoder().decode(h.disk.get(`${root}/templates/${id}.json`)));
    assert.equal(saved.name, 'Saved design'); assert.equal(saved.look.size, undefined);
    assert.ok(saved.prompt.rules); assert.equal(h.editorFind('Button', 'Save').props.disabled, true);
  } finally { h.close(); }
});

test('template dirty switch waits for an explicit discard and imported files cannot overwrite the original', async () => {
  const h = harness({ layouts: [layout, {...layout,id:'other',name:'Other saved design'}] });
  try {
    await h.settleEditor();
    h.editorFind('TextField', 'Name').props.onChange('Uncommitted rename');
    h.editorFind('TemplateToolbar').props.onChange('layout-other');
    assert.equal(h.editorFind('TemplateToolbar').props.value, 'layout-team');
    h.editorFind('Button', 'Discard and switch').props.onClick(); await h.settleEditor();
    assert.equal(h.editorFind('TemplateToolbar').props.value, 'layout-other');
    const original = h.disk.get(root + '/layout-templates/team.json');
    h.editorFind('TemplateToolbar').props.onImport();
    await h.editorFind('FileDrop').props.onChange({path:root+'/layout-templates/team.json'}); await h.settleEditor();
    const id = h.editorFind('TemplateToolbar').props.value;
    assert.notEqual(id, 'layout-team');
    assert.equal(h.disk.get(root+'/layout-templates/team.json'), original);
    const saved = JSON.parse(new TextDecoder().decode(h.disk.get(`${root}/templates/${id}.json`)));
    assert.equal(saved.look.textSlots[0].top, 942); assert.equal(saved.headline.tracking, -.04);
  } finally { h.close(); }
});

const packUrl = 'https://github.com/CutbackVideo/selects-plugin-library/tree/' + 'a'.repeat(40) + '/plugins/card-news-maker/template-packs/chosun-basic';
test('catalog pack link imports once, selects Templates and never generates or exports', async () => {
  const finished = [], calls = [];
  const h = harness({ templatePack: { requestId: 'install-1', url: packUrl }, sdk: { finishTemplatePackInstall: id => finished.push(id), askAI: () => calls.push('AI'), runScript: async input => { if (input.allowCommit) calls.push('write'); return { result: [] }; } } });
  try {
    h.files.downloadFile = async (url, to) => { calls.push(url); h.disk.set(to, new TextEncoder().encode(JSON.stringify({ ...layout, id: 'incoming' }))); };
    await h.settle();
    assert.deepEqual(finished, ['install-1']);
    assert.deepEqual(calls, ['https://raw.githubusercontent.com/CutbackVideo/selects-plugin-library/' + 'a'.repeat(40) + '/plugins/card-news-maker/template-packs/chosun-basic/template.json']);
    assert.equal(h.find('Tabs').props.value, 'templates');
    assert.equal(h.find('Tabs').props.tabs[1].content.props.state.selId, 'pack-chosun-basic');
    assert.equal((await h.bindings.makeStore().list('templates')).length, 1);
    await h.settle(); assert.deepEqual(finished, ['install-1']);
  } finally { h.close(); }
});
test('repeated catalog install preserves the existing local edited template', async () => {
  const h = harness();
  try {
    h.files.downloadFile = async (_, to) => h.disk.set(to, new TextEncoder().encode(JSON.stringify(layout)));
    await h.settle();
    const store = h.bindings.makeStore();
    const existing = h.bindings.CardSupport.fromLayout(layout); existing.headline.size = 55;
    const before = JSON.stringify(existing);
    await store.put('templates', existing.id, existing);
    const result = await h.bindings.installLinkedTemplate(store, packUrl, [existing]);
    assert.equal(JSON.stringify(result), before);
    assert.equal(JSON.stringify((await store.list('templates'))[0]), before);
  } finally { h.close(); }
});
test('catalog import rejects unpinned or unrelated URLs before downloading', async () => {
  const h = harness(); let downloads = 0;
  try {
    h.files.downloadFile = async () => downloads++;
    for (const url of [packUrl.replace('a'.repeat(40), 'main'), packUrl + '/../../other', packUrl.replace('github.com', 'evil.test')]) {
      await assert.rejects(h.bindings.installLinkedTemplate(h.bindings.makeStore(), url, []), /official/);
    }
    assert.equal(downloads, 0);
  } finally { h.close(); }
});
test('catalog download failure is acknowledged and exposes an explicit retry without losing the request', async () => {
  const finished = []; const h = harness({ templatePack: { requestId: 'retry-1', url: packUrl }, sdk: { finishTemplatePackInstall: id => finished.push(id) } });
  try {
    h.files.downloadFile = async () => { throw Error('Download unavailable'); };
    await h.settle();
    assert.deepEqual(finished, ['retry-1']);
    assert(h.find('Button', 'Retry template import'));
    h.context.templatePack = undefined;
    h.files.downloadFile = async (_, to) => h.disk.set(to, new TextEncoder().encode(JSON.stringify({ ...layout, id: 'retry-template' })));
    await h.find('Button', 'Retry template import').props.onClick(); await h.settle();
    assert.equal(h.find('Button', 'Retry template import'), undefined);
    assert.equal(h.find('Tabs').props.value, 'templates');
    assert.deepEqual(finished, ['retry-1', 'retry-1']);
  } finally { h.close(); }
});
test('catalog import waits for unsaved template edits before selecting the linked template', async () => {
  const finished = []; let downloads = 0;
  const h = harness({ sdk: { finishTemplatePackInstall: id => finished.push(id) } });
  try {
    await h.settleEditor();
    h.editorFind('TextField', 'Name').props.onChange('My unfinished name'); await h.settleEditor();
    h.files.downloadFile = async (_, to) => { downloads++; h.disk.set(to, new TextEncoder().encode(JSON.stringify(layout))); };
    h.context.templatePack = { requestId: 'dirty-1', url: packUrl };
    await h.settle();
    assert.equal(downloads, 0); assert.deepEqual(finished, []);
    h.editorFind('Button', 'Cancel').props.onClick(); await h.settle();
    assert.equal(downloads, 1); assert.deepEqual(finished, ['dirty-1']);
    assert.equal(h.find('Tabs').props.value, 'templates');
  } finally { h.close(); }
});


test('new work and template toolbar list only saved or imported designs, without a built-in preview flash', async () => {
  const h = harness();
  try {
    assert.equal(!!h.find('TemplateChoice', 'Template'), false);
    await h.settleEditor();
    assert.deepEqual(plain(h.find('TemplateChoice', 'Template').props.options.map(o => o.value)), ['layout-team']);
    assert.deepEqual(plain(h.editorFind('TemplateToolbar').props.options.map(o => o.value)), ['layout-team']);
  } finally { h.close(); }
});

test('empty library can create and save a neutral design without exposing a built-in seed', async () => {
  const h = harness({ layouts: [] });
  try {
    await h.settleEditor();
    assert.equal(!!h.find('TemplateChoice', 'Template'), false);
    assert.equal(h.find('Button', 'Generate').props.disabled, true);
    assert.equal(h.editorFind('TemplateToolbar').props.options.length, 0);
    assert.equal(h.editorFind('TemplateToolbar').props.actionsDisabled, false);
    assert.equal(h.editorFind('TemplateToolbar').props.exportDisabled, true);
    h.editorFind('TemplateToolbar').props.onCreate();
    h.editorFind('TextField', 'Name').props.onChange('My first design');
    h.editorFind('Button', 'New template').props.onClick(); await h.settleEditor();
    const pending = h.component('TemplateEditor').props.state.pending;
    assert.equal(pending.label.style, 'none'); assert.equal(pending.label.text, '');
    assert.equal(pending.wordmark.text, ''); assert.equal(pending.wordmark.logo, null);
    assert.doesNotMatch(JSON.stringify(pending), /TODAY|REPORT|report-|essay-|tips-/i);
    await h.editorFind('Button', 'Save').props.onClick(); await h.settleEditor();
    assert.equal(h.find('Button', 'Generate').props.disabled, false);
    assert.equal(h.find('TemplateChoice', 'Template').props.options.length, 1);
    const saved = h.component('TemplateEditor').props.templates[0];
    assert.deepEqual(plain(saved.descriptions), {});
    assert.equal(saved.label.text, '');
  } finally { h.close(); }
});

test('pack selection is restored on a fresh mount and project switch without replacing saved designs', async () => {
  const h = harness({ templatePack: { requestId: 'persist-pack', url: packUrl }, sdk: { finishTemplatePackInstall() {} } });
  let reopened;
  try {
    h.files.downloadFile = async (_, to) => h.disk.set(to, new TextEncoder().encode(JSON.stringify({...layout, id:'chosun-basic', name:'Chosun Ilbo Basic (feed)'})));
    await h.settle();
    const templateBytes = h.disk.get(root + '/templates/pack-chosun-basic.json');
    reopened = harness({ disk: h.disk });
    reopened.context.projectId = 'next-project';
    await reopened.settleEditor();
    assert.equal(reopened.find('TemplateChoice', 'Template').props.value, 'pack-chosun-basic');
    assert.equal(reopened.editorFind('TemplateToolbar').props.value, 'pack-chosun-basic');
    assert.equal(reopened.disk.get(root + '/templates/pack-chosun-basic.json'), templateBytes);
    assert.deepEqual(plain(reopened.find('TemplateChoice', 'Template').props.options.map(o => o.value)), ['layout-team','pack-chosun-basic']);
  } finally { reopened?.close(); h.close(); }
});


test('empty library can import a design, and a saved legacy-ID edit remains owned and unchanged', async () => {
  const h = harness({layouts:[]});
  try {
    await h.settleEditor();
    h.disk.set('/incoming.json',new TextEncoder().encode(JSON.stringify(layout)));
    h.editorFind('TemplateToolbar').props.onImport();
    await h.editorFind('FileDrop').props.onChange({path:'/incoming.json'}); await h.settleEditor();
    assert.equal(h.find('TemplateChoice','Template').props.options.length,1);
    const file=root+'/templates/report-ko.json';
    const data=new TextEncoder().encode(JSON.stringify({id:'report-ko',name:'My saved design',headline:{size:55}}));
    h.disk.set(file,data);
    await h.component('TemplateEditor').props.onChanged(); await h.settleEditor();
    const saved=h.component('TemplateEditor').props.templates.find(t=>t.id==='report-ko');
    assert.equal(saved.name,'My saved design');assert.equal(saved.headline.size,55);
    assert.equal(saved.builtIn,false);assert.equal(h.disk.get(file),data);
    assert.equal(h.find('TemplateChoice','Template').props.options.length,2);
  } finally { h.close(); }
});

test('one template editor switches cover/body placement and saves body edits without changing its cover',async()=>{
  const raw=JSON.parse(fs.readFileSync(new URL('../plugins/card-news-maker/template-packs/chosun-basic/template.json',import.meta.url)));
  const h=harness({layouts:[raw]});
  try{
    await h.settleEditor();
    assert.equal(h.editorFind('NumberField','Left').props.value,125);
    h.editorFind('Select','Preview').props.onChange('body');await h.settleEditor();
    assert.equal(h.editorFind('NumberField','Left').props.value,105);
    h.editorFind('NumberField','Left').props.onChange(110);
    h.editorFind('NumberField','Shade top').props.onChange(820);
    await h.settleEditor();await h.editorFind('Button','Save').props.onClick();await h.settleEditor();
    const saved=h.component('TemplateEditor').props.templates[0];
    assert.equal(saved.look.body.textSlots[0].left,110);assert.equal(saved.look.body.gradient.top,820);
    assert.equal(saved.look.textSlots[0].left,125);assert.equal(saved.look.gradient.top,830);assert.equal(saved.look.body.logo,null);
    h.editorFind('Select','Preview').props.onChange('cover');await h.settleEditor();
    assert.equal(h.editorFind('NumberField','Left').props.value,125);
    assert.equal(h.editorFind('NumberField','Shade top').props.value,830);
    assert.equal(h.editorFind('TemplateToolbar').props.options.length,1);
  }finally{h.close()}
});

test('editing one legacy role copies inherited placement without changing the other role',async()=>{
  const h=harness();try{
    await h.settleEditor();h.editorFind('NumberField','Left').props.onChange(150);await h.settleEditor();
    const edit=h.component('TemplateEditor').props.state.edit;
    assert.equal(edit.look.cover.textSlots[0].left,150);assert.equal(edit.look.textSlots[0].left,125);
    h.editorFind('Select','Preview').props.onChange('body');await h.settleEditor();
    assert.equal(h.editorFind('NumberField','Left').props.value,125);
  }finally{h.close()}
});


test('Last card font uses its existing body role without modifying cover placement',async()=>{
  const h=harness();try{
    await h.settleEditor();h.editorFind('Select','Preview').props.onChange('end');await h.settleEditor();
    h.editorFind('FontField','Font').props.onChange('End font');await h.settleEditor();
    const edit=h.component('TemplateEditor').props.state.edit;
    assert.equal(edit.look.body.font,'End font');assert.equal(edit.look.cover.font,undefined);assert.equal(edit.look.font,'Test');
  }finally{h.close()}
});

test('a v2 install link preserves a saved v1 design, while Import creates a new combined design',async()=>{
  const raw=JSON.parse(fs.readFileSync(new URL('../plugins/card-news-maker/template-packs/chosun-basic/template.json',import.meta.url)));
  const oldRaw=structuredClone(raw);oldRaw.version=1;delete oldRaw.body;
  const h=harness({layouts:[],templatePack:{requestId:'v2-existing-v1',url:packUrl},sdk:{finishTemplatePackInstall(){}}});
  try{
    const old={...h.bindings.CardSupport.fromLayout(oldRaw),id:'pack-chosun-basic'};
    const p=root+'/templates/'+old.id+'.json',bytes=new TextEncoder().encode(JSON.stringify(old));h.disk.set(p,bytes);
    h.files.downloadFile=async(_,to)=>h.disk.set(to,new TextEncoder().encode(JSON.stringify(raw)));
    await h.settleEditor();assert.equal(h.component('TemplateEditor').props.templates.length,1);
    assert.equal(h.component('TemplateEditor').props.templates[0].version,1);assert.equal(h.disk.get(p),bytes);
    h.disk.set('/v2.json',new TextEncoder().encode(JSON.stringify(raw)));h.editorFind('TemplateToolbar').props.onImport();
    await h.editorFind('FileDrop').props.onChange({path:'/v2.json'});await h.settleEditor();
    const state=h.component('TemplateEditor').props;assert.equal(state.templates.length,2);
    const added=state.templates.find(t=>t.id!==old.id);assert.equal(added.version,2);assert.equal(added.look.body.textSlots.length,3);
    assert.equal(state.state.selId,added.id);assert.equal(h.disk.get(p),bytes);
  }finally{h.close()}
});


test('Chosun pack and imported copies use UI locale names while custom names survive save and reinstall',async()=>{
  const raw=JSON.parse(fs.readFileSync(new URL('../plugins/card-news-maker/template-packs/chosun-basic/template.json',import.meta.url)));
  for(const [language,expected] of [['ko','\uc870\uc120\uc77c\ubcf4 \uae30\ubcf8 (\ud53c\ub4dc)'],['en','Chosun Ilbo Basic (feed)']]){
    const h=harness({language,layouts:[],templatePack:{requestId:'localized-'+language,url:packUrl},sdk:{finishTemplatePackInstall(){}}});
    try{
      h.files.downloadFile=async(_,to)=>h.disk.set(to,new TextEncoder().encode(JSON.stringify(raw)));
      await h.settleEditor();
      const choice=()=>nodes(h.render()).find(n=>n.type==='TemplateChoice');
      assert.ok(choice().props.options.every(o=>o.label.startsWith(expected+' · ')));
      h.disk.set('/localized.json',new TextEncoder().encode(JSON.stringify(raw)));
      h.editorFind('TemplateToolbar').props.onImport();await h.editorFind('FileDrop').props.onChange({path:'/localized.json'});await h.settleEditor();
      const state=h.component('TemplateEditor').props;
      assert.equal(state.templates.length,2);assert.ok(choice().props.options.every(o=>o.label.startsWith(expected+' · ')));
      state.state.setSub('general');await h.settleEditor();
      const field=language==='ko'?'\uc774\ub984':'Name';assert.equal(h.editorFind('TextField',field).props.value,expected);
      h.editorFind('TextField',field).props.onChange('My newsroom design');await h.settleEditor();
      await h.editorFind('Button',language==='ko'?'\uc800\uc7a5':'Save').props.onClick();await h.settleEditor();
      assert.equal(h.editorFind('TextField',field).props.value,'My newsroom design');
      const saved=h.component('TemplateEditor').props.templates.find(t=>t.name==='My newsroom design');
      assert.ok(saved);const before=h.disk.get(root+'/templates/'+saved.id+'.json');
      const installed={...state.templates.find(t=>t.id==='pack-chosun-basic'),name:'My installed design'};
      await h.bindings.makeStore().put('templates',installed.id,installed);
      assert.equal(await h.bindings.installLinkedTemplate(h.bindings.makeStore(),packUrl,[installed,saved]),installed);
      assert.equal(h.disk.get(root+'/templates/'+saved.id+'.json'),before);
      h.context.language=language==='ko'?'en':'ko';await h.settleEditor();
      const after=h.component('TemplateEditor').props.templates.find(t=>t.id===saved.id);
      assert.equal(after.name,'My newsroom design');assert.ok(choice().props.options.some(o=>o.label.startsWith('My newsroom design · ')));
    }finally{h.close()}
  }
});

test('layout locale names reject malformed values and keep old single names unchanged',()=>{
  const h=harness();try{
    assert.equal(h.bindings.CardSupport.fromLayout(layout).name,'Team design');
    for(const names of [null,[],{ko:12},{ko:''},{ko:' '}])assert.throws(()=>h.bindings.CardSupport.templateFromFile({...layout,names}),/names must map/);
  }finally{h.close()}
});
