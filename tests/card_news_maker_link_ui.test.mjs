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
function harness({ legacy = false, sdk: extra = {}, job, templatePack, disk: existingDisk, layouts = [layout], language = 'en', compositeAlpha = 255, dialogs = { pickDirectoryPath: async () => '/photos' } } = {}) {
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
  const files = { pathToLocalURL: async (path) => 'local://' + encodeURIComponent(path), join: path.posix.join, homedir: () => '/memory', exists: async () => true, mkdir: async () => {}, stat: async (p) => ({ isDirectory: p === '/photos', size: 10000 }), readdir: async (p) => p === '/photos' ? ['b.png', 'a.png'] : [...disk.keys()].filter((n) => path.posix.dirname(n) === p).map((n) => path.posix.basename(n)), readFile: async (p) => disk.get(p) || new Uint8Array([1, 2, 3]), writeFile: async (p, data) => { disk.set(p, data); }, compareAndReplace: async (p, expected, text) => { const current=disk.has(p)?new TextDecoder().decode(disk.get(p)):null; if(current!==expected)return false;disk.set(p,new TextEncoder().encode(text));return true; }, rm: async (p) => { disk.delete(p); }, removeFile: async ({ filePath }) => { disk.delete(filePath); }, getOrCreateTmpDirPath: async () => '/tmp', downloadFile: async (_, p) => { disk.set(p, new TextEncoder().encode('<meta property="og:type" content="article"><meta property="og:title" content="Article"><article><p>' + 'Verified article facts. '.repeat(40) + '</p></article>')); } };
  const sdk = { runScript: async () => ({ result: [] }), aiProviders: async () => ({ chatgpt: 'connected', selects: 'connected' }), ...extra };
  const ui = new Proxy({}, { get: (_, k) => String(k) });
  const context = { projectId: 'p', language, templatePack };
  const canvas = () => ({ getContext: () => ({ measureText: () => ({ width: 1 }), fillRect() {}, drawImage() {}, fillText() {}, save() {}, beginPath() {}, rect() {}, clip() {}, restore() {}, getImageData: () => ({ data: [0, 0, 0, compositeAlpha] }) }), toDataURL: () => 'data:image/jpeg;base64,YQ==', toBlob: (fn, mime) => fn(new Blob([new Uint8Array([1, 2, 3])], { type: mime })) });
  const bindings = loadPanelModule(source, { names: ['ProjectPanel', 'TemplateEditor', 'CardEditor', 'CardSupport', 'makeStore', 'installLinkedTemplate', 'BUILTIN_TEMPLATES'], React, overrides: { hostSdk: { files, dialogs }, hostUseSdk() {}, useAppUpdateGuard() {} }, globals: { URL, crypto, Blob, Image: class { naturalWidth = 1920; naturalHeight = 1080; src = ''; async decode() {} }, window: {}, document: { createElement: canvas }, createImageBitmap: async () => ({ width: 1920, height: 1080, close() {} }) } });
  function render() { hooks = mainHooks; at = 0; tree = bindings.ProjectPanel({ sdk, ui, context }); return tree; }
  function renderEditor() { const node = nodes(render()).find(n => n.type === bindings.TemplateEditor); if (!node) return null; hooks = editorHooks; at = 0; return bindings.TemplateEditor(node.props); }
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
    assert.equal(h.find('Toggle', 'Add my own photos (optional)').props.value, false);
    assert.equal(h.find('FileDrop', undefined), undefined);
    const tree = nodes(h.render());
    assert.equal(tree.filter((n) => n.type === 'TextField' && n.props.label === 'Extra instructions (optional)').length, 1);
    assert.equal(tree.filter((n) => n.type === 'Button' && n.props.children.includes('Generate')).length, 1);
    assert.ok(h.find('TemplateChoice', 'Template').props.options.some((o) => o.value === 'layout-team'));
    h.find('Toggle', 'Add my own photos (optional)').props.onChange(true);
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
    h.find('Toggle', 'Add my own photos (optional)').props.onChange(true);
    const drop = nodes(h.render()).find((n) => n.type === 'FileDrop');
    await drop.props.onChange({ path: '/photos' });
    await h.find('Button', 'Generate').props.onClick(); await h.settle();
    assert.equal(request.provider, 'chatgpt'); assert.match(request.prompt, /Focus on commuters/); assert.match(request.prompt, /Verified article facts/);
    assert.deepEqual(plain(request.images), [{ dataUrl: 'data:image/jpeg;base64,YQ==', name: 'photos.jpg' }]);
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
    if (summary === 'Add exported card images to the project') return { result: { added: 1 } };
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

test('export composite and transparent photo fallback use native URLs without reading image bytes', async () => {
  const urls = [];
  const job = { id: 'native-export', projectId: 'p', templateId: 'report-en', draftId: 'draft', folder: { done: true },
    plan: { article: { title: 'News', images: [] }, cards: [{ role: 'cover', headline: 'Text', picture: { kind: 'file', path: '/photos/source.jpg' } }], caption: '', hashtags: '' },
    pictures: [{ kind: 'file', path: '/photos/source.jpg', w: 1920, h: 1080, resourceId: 'r1', resourceName: 'source.jpg' }] };
  const h = harness({ job, compositeAlpha: 0, sdk: { runScript: async ({ summary }) => {
    if (summary === 'List project videos') return { result: [] };
    if (summary === 'Read the card ranges') return { result: { fps: 24, cards: [['Card 01', 0, 72]] } };
    if (summary === 'Add exported card images to the project') return { result: { added: 1 } };
    return { result: {} };
  } } });
  const read = h.files.readFile;
  h.files.readFile = path => { assert.doesNotMatch(path, /\.(png|jpe?g|webp)$/i); return read(path); };
  h.files.pathToLocalURL = async path => { urls.push(path); return 'local://' + encodeURIComponent(path); };
  try {
    await h.settle(); h.find('Select', 'Saved').props.onChange(job.id); await h.settle();
    await h.find('Button', 'Export card images').props.onClick(); await h.settle();
    assert.ok(urls.some(path => path.endsWith('/source-01.png')));
    assert.ok(urls.includes('/photos/source.jpg'));
    assert.ok([...h.disk.keys()].some(path => path.endsWith('/card-01.png')));
    assert.ok(![...h.disk.keys()].some(path => path.endsWith('/source-01.png')));
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
    if (summary === 'Add exported card images to the project') return { result: { added: 1 } };
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


test('Chosun editor hides the unused ending and safely displays body for a stale end selection',async()=>{
  const raw=JSON.parse(fs.readFileSync(new URL('../plugins/card-news-maker/template-packs/chosun-basic/template.json',import.meta.url)));
  const h=harness({layouts:[raw]});try{
    await h.settleEditor();const state=h.component('TemplateEditor').props.state;
    const before=JSON.stringify(h.component('TemplateEditor').props.templates);
    assert.deepEqual(plain(h.editorFind('Select','Preview').props.options).map(o=>o.value),['cover','body']);
    assert.equal(nodes(h.renderEditor()).some(n=>n.type==='TemplateSettingsSection'&&n.props.title==='Last card'),false);
    assert.equal(h.editorFind('TextField','Last card'),undefined);
    state.setRole('end');await h.settleEditor();
    assert.equal(h.editorFind('Select','Preview').props.value,'body');
    assert.equal(h.editorFind('NumberField','Top').props.value,943);
    const preview=nodes(h.renderEditor()).find(n=>typeof n.type==='function'&&n.type.name==='CardPreview');
    assert.equal(preview.props.card.role,'body');assert.equal(h.editorFind('Button','Save').props.disabled,true);
    assert.equal(JSON.stringify(h.component('TemplateEditor').props.templates),before);
    h.editorFind('Select','Preview').props.onChange('cover');await h.settleEditor();
    assert.equal(h.editorFind('NumberField','Top').props.value,942);
  }finally{h.close()}
});

test('Chosun ending restriction survives Import and rename, while old installed designs remain untouched',async()=>{
  const raw=JSON.parse(fs.readFileSync(new URL('../plugins/card-news-maker/template-packs/chosun-basic/template.json',import.meta.url)));
  const h=harness({layouts:[]});try{
    const old={...h.bindings.CardSupport.fromLayout(raw),id:'told-chosun-copy',name:'Custom newsroom name'};delete old.end.editable;delete old.importedLayoutId;
    const path=root+'/templates/'+old.id+'.json',bytes=new TextEncoder().encode(JSON.stringify(old));h.disk.set(path,bytes);
    await h.settleEditor();assert.equal(h.editorFind('Select','Preview').props.options.length,2);assert.equal(h.disk.get(path),bytes);
    h.disk.set('/chosun.json',new TextEncoder().encode(JSON.stringify(raw)));h.editorFind('TemplateToolbar').props.onImport();
    await h.editorFind('FileDrop').props.onChange({path:'/chosun.json'});await h.settleEditor();
    const copy=h.component('TemplateEditor').props.templates.find(t=>t.id!==old.id);
    assert.equal(copy.importedLayoutId,undefined);assert.equal(copy.end.editable,false);assert.equal(copy.end.kind,'none');
    assert.equal(h.editorFind('Select','Preview').props.options.length,2);
    h.editorFind('TextField','Name').props.onChange('Renamed copy');await h.editorFind('Button','Save').props.onClick();await h.settleEditor();
    assert.equal(h.editorFind('Select','Preview').props.options.length,2);assert.equal(h.disk.get(path),bytes);
  }finally{h.close()}
});

test('ordinary templates with no ending can still enable and preview a CTA',async()=>{
  const h=harness();try{
    await h.settleEditor();assert.equal(h.component('TemplateEditor').props.state.edit.end.kind,'none');
    assert.deepEqual(plain(h.editorFind('Select','Preview').props.options).map(o=>o.value),['cover','body','end']);
    assert.ok(h.editorFind('TextField','Last card'));
    const ending=nodes(h.renderEditor()).find(n=>n.type==='TemplateSettingsSection'&&n.props.title==='Last card');assert.ok(ending);
    const select=nodes(ending).find(n=>n.type==='Select');select.props.onChange('cta');await h.settleEditor();
    h.editorFind('Select','Preview').props.onChange('end');await h.settleEditor();
    assert.equal(h.editorFind('Select','Preview').props.value,'end');
    assert.equal(h.component('TemplateEditor').props.state.edit.end.kind,'cta');
  }finally{h.close()}
});


const chosunV1=JSON.parse(fs.readFileSync(new URL('./fixtures/card-news-chosun-v1.json',import.meta.url)));
const chosunV2=()=>JSON.parse(fs.readFileSync(new URL('../plugins/card-news-maker/template-packs/chosun-basic/template.json',import.meta.url)));
test('the same pack link upgrades an untouched legacy Chosun item in place and leaves source and job snapshots intact',async()=>{
  const job={id:'old-set',projectId:'p',templateId:'layout-chosun-basic',templateSnapshot:chosunV1.installed};
  const h=harness({layouts:[chosunV1.raw],job,templatePack:{requestId:'upgrade-legacy',url:packUrl},sdk:{finishTemplatePackInstall(){}}});
  try{
    const oldPath=root+'/layout-templates/chosun-basic.json',old=h.disk.get(oldPath),jobPath=root+'/jobs/old-set.json',snapshot=h.disk.get(jobPath);
    h.files.downloadFile=async(_,to)=>h.disk.set(to,new TextEncoder().encode(JSON.stringify(chosunV2())));
    await h.settleEditor();const editor=h.component('TemplateEditor').props;
    assert.equal(editor.templates.length,1);assert.equal(editor.templates[0].id,'layout-chosun-basic');assert.equal(editor.templates[0].version,2);
    assert.equal(editor.templates[0].look.body.textSlots.length,3);assert.equal(editor.templates[0].headline.size,70.75);assert.equal(editor.templates[0].body.tracking,-.0425);assert.equal(editor.templates[0].body.weight,400);assert.equal(editor.templates[0].headline.weight,700);assert.equal(editor.state.selId,'layout-chosun-basic');
    assert.equal(h.find('TemplateChoice','Template').props.value,'layout-chosun-basic');
    assert.equal(h.disk.get(oldPath),old);assert.equal(h.disk.get(jobPath),snapshot);
    const backups=await h.bindings.makeStore().list('template-backups');assert.equal(backups.length,1);assert.equal(backups[0].version,1);
    h.context.templatePack={requestId:'upgrade-repeat',url:packUrl};await h.settleEditor();
    assert.equal(h.component('TemplateEditor').props.templates.length,1);assert.equal((await h.bindings.makeStore().list('template-backups')).length,1);
  }finally{h.close()}
});

test('actual published v1 installed records and unmodified imported copies retain their IDs when upgraded',async()=>{
  for(const imported of [false,true]){
    const h=harness({layouts:[]});try{
      const old=structuredClone(chosunV1.installed);if(imported){old.id='timported-v1';delete old.importedLayoutId}
      const store=h.bindings.makeStore();await store.put('templates',old.id,old);
      h.files.downloadFile=async(_,to)=>h.disk.set(to,new TextEncoder().encode(JSON.stringify(chosunV2())));
      const updated=await h.bindings.installLinkedTemplate(store,packUrl,[old]);
      assert.equal(updated.id,old.id);assert.equal(updated.version,2);assert.equal(updated.look.body.textSlots.length,3);
      assert.equal((await store.list('templates')).length,1);assert.equal((await store.list('template-backups'))[0].version,1);
    }finally{h.close()}
  }
});

test('edited Chosun designs are never overwritten or duplicated and display the keep-edits notice',async()=>{
  const changes=[t=>t.name='My design',t=>t.headline.size=55,t=>t.body.weight=400,t=>t.look.textSlots[0].left=150,t=>t.wordmark.logo.top=1100,t=>t.prompt.body='My instructions',t=>t.end.kind='cta'];
  for(const change of changes){
    const h=harness({layouts:[],templatePack:{requestId:'edited',url:packUrl},sdk:{finishTemplatePackInstall(){}}});try{
      const old=structuredClone(chosunV1.installed);change(old);const path=root+'/templates/'+old.id+'.json';const bytes=new TextEncoder().encode(JSON.stringify(old));h.disk.set(path,bytes);
      h.files.downloadFile=async(_,to)=>h.disk.set(to,new TextEncoder().encode(JSON.stringify(chosunV2())));
      await h.settleEditor();assert.equal(h.disk.get(path),bytes);assert.equal(h.component('TemplateEditor').props.templates.length,1);
      assert.equal((await h.bindings.makeStore().list('template-backups')).length,0);
      assert.ok(h.find('Message','Your edited design was kept. It was not replaced with the new default template.'));
    }finally{h.close()}
  }
});

test('an edit saved by another window during the download is preserved and backup failure stops an upgrade',async()=>{
  for(const failBackup of [false,true]){
    const h=harness({layouts:[]});try{
      const old=structuredClone(chosunV1.installed),store=h.bindings.makeStore();await store.put('templates',old.id,old);
      const path=root+'/templates/'+old.id+'.json',original=h.disk.get(path);let edited;
      h.files.downloadFile=async(_,to)=>{h.disk.set(to,new TextEncoder().encode(JSON.stringify(chosunV2())));if(!failBackup){edited=new TextEncoder().encode(JSON.stringify({...old,name:'Saved in another window'}));h.disk.set(path,edited)}};
      if(failBackup){const put=store.put;store.put=async(kind,...args)=>{if(kind==='template-backups')throw Error('Backup unavailable');return put(kind,...args)};await assert.rejects(h.bindings.installLinkedTemplate(store,packUrl,[old]),/Backup unavailable/);assert.equal(h.disk.get(path),original)}
      else{let kept=false;const result=await h.bindings.installLinkedTemplate(store,packUrl,[old],()=>kept=true);assert.equal(result.version,1);assert.equal(kept,true);assert.equal(h.disk.get(path),edited)}
    }finally{h.close()}
  }
});

test('an older pack never downgrades an installed v2 design',async()=>{
  const h=harness({layouts:[]});try{
    const current={...h.bindings.CardSupport.fromLayout(chosunV2()),id:'pack-chosun-basic'},store=h.bindings.makeStore();await store.put('templates',current.id,current);
    const path=root+'/templates/'+current.id+'.json',bytes=h.disk.get(path);h.files.downloadFile=async(_,to)=>h.disk.set(to,new TextEncoder().encode(JSON.stringify(chosunV1.raw)));
    assert.equal(await h.bindings.installLinkedTemplate(store,packUrl,[current]),current);assert.equal(h.disk.get(path),bytes);assert.equal((await store.list('template-backups')).length,0);
  }finally{h.close()}
});


test('atomic update failure keeps the old file readable and never enters the partial write queue',async()=>{
  const h=harness({layouts:[]});try{
    const old=structuredClone(chosunV1.installed),store=h.bindings.makeStore();await store.put('templates',old.id,old);
    const path=root+'/templates/'+old.id+'.json',original=h.disk.get(path);let targetWrites=0;
    h.files.downloadFile=async(_,to)=>h.disk.set(to,new TextEncoder().encode(JSON.stringify(chosunV2())));
    const write=h.files.writeFile;h.files.writeFile=async(p,data)=>{if(p===path){targetWrites++;h.disk.set(p,new TextEncoder().encode('{partial'));throw Error('Partial write')}return write(p,data)};
    h.files.compareAndReplace=async()=>{throw Error('Atomic update unavailable')};
    await assert.rejects(h.bindings.installLinkedTemplate(store,packUrl,[old]),/Atomic update unavailable/);
    assert.equal(targetWrites,0);assert.equal(h.disk.get(path),original);assert.equal((await store.list('templates'))[0].version,1);
    assert.equal((await store.list('template-backups')).length,1);
  }finally{h.close()}
});

test('a rename saved during backup is preserved by the final atomic comparison',async()=>{
  const h=harness({layouts:[]});try{
    const old=structuredClone(chosunV1.installed),store=h.bindings.makeStore();await store.put('templates',old.id,old);
    const path=root+'/templates/'+old.id+'.json';let edited;
    h.files.downloadFile=async(_,to)=>h.disk.set(to,new TextEncoder().encode(JSON.stringify(chosunV2())));
    const write=h.files.writeFile;h.files.writeFile=async(p,data)=>{if(p.includes('/template-backups/')){edited=new TextEncoder().encode(JSON.stringify({...old,name:'Concurrent rename'}));h.disk.set(path,edited)}return write(p,data)};
    let kept=false;const result=await h.bindings.installLinkedTemplate(store,packUrl,[old],()=>kept=true);
    assert.equal(result.version,1);assert.equal(kept,true);assert.equal(h.disk.get(path),edited);assert.equal((await store.list('templates'))[0].name,'Concurrent rename');
  }finally{h.close()}
});

test('template editing is unavailable while a linked pack download is running',async()=>{
  let release;const gate=new Promise(resolve=>release=resolve);
  const h=harness({layouts:[chosunV1.raw],templatePack:{requestId:'pending-upgrade',url:packUrl},sdk:{finishTemplatePackInstall(){}}});
  try{
    h.files.downloadFile=async(_,to)=>{await gate;h.disk.set(to,new TextEncoder().encode(JSON.stringify(chosunV2())))};
    await h.settle();assert.equal(h.component('TemplateEditor'),undefined);
    release();await h.settleEditor();assert.equal(h.component('TemplateEditor').props.templates[0].version,2);
  }finally{release();h.close()}
});


test('an existing managed pack is updated ahead of a separate customized legacy copy',async()=>{
  const h=harness({layouts:[]});try{
    const managed=structuredClone(chosunV1.installed),custom={...structuredClone(managed),id:'layout-chosun-basic',name:'My separate design'};
    const store=h.bindings.makeStore();await store.put('templates',managed.id,managed);await store.put('templates',custom.id,custom);
    const path=root+'/templates/'+custom.id+'.json',bytes=h.disk.get(path);h.files.downloadFile=async(_,to)=>h.disk.set(to,new TextEncoder().encode(JSON.stringify(chosunV2())));
    const updated=await h.bindings.installLinkedTemplate(store,packUrl,[custom,managed]);assert.equal(updated.id,managed.id);assert.equal(updated.version,2);assert.equal(h.disk.get(path),bytes);
  }finally{h.close()}
});

test('generation and photo inputs use Korean UI labels while English labels stay unchanged',async()=>{
  for(const language of ['en','ko']){
    const ko=language==='ko',h=harness({language});try{
      await h.settle();assert.ok(h.find('TextField',ko?'\uae30\uc0ac \ub9c1\ud06c':'Article link'));
      const own=ko?'\ub0b4 \uc0ac\uc9c4 \ucd94\uac00 (\uc120\ud0dd)':'Add my own photos (optional)';assert.equal(h.find('Toggle',own).props.value,false);
      assert.ok(h.find('Button',ko?'\uce74\ub4dc \uc0dd\uc131':'Generate'));
      h.find('Toggle',own).props.onChange(true);h.render();
      const drop=nodes(h.render()).find(n=>n.type==='FileDrop');assert.equal(drop.props.labels.choose,ko?'\uc0ac\uc9c4 \ucd94\uac00':'Add a photo');
      assert.ok(h.find('Button',ko?'\uc0ac\uc9c4 \ud3f4\ub354 \ucd94\uac00':'Add a folder of photos'));
      h.find('Toggle',own).props.onChange(false);h.render();
      h.find('TextField',ko?'\uae30\uc0ac \ub9c1\ud06c':'Article link').props.onChange('https://example.test/article');
      h.files.downloadFile=async(_,to)=>h.disk.set(to,new TextEncoder().encode('<article>Short</article>'));
      await h.find('Button',ko?'\uce74\ub4dc \uc0dd\uc131':'Generate').props.onClick();await h.settle();
      assert.ok(h.find('TextField',ko?'\uae30\uc0ac \ubcf8\ubb38':'Article text'));
    }finally{h.close()}
  }
});

test('first manual export cancellation leaves work untouched and never builds, renders or imports',async()=>{
  const job={id:'cancel-export',projectId:'p',templateId:'layout-team',plan:{cards:[{role:'cover',headline:'Cover'}]}};let picks=0,writes=0;
  const h=harness({job,dialogs:{pickDirectoryPath:async()=>{picks++;return null}},sdk:{runScript:async({summary})=>{if(summary!=='List project videos')writes++;return{result:[]}}}});
  try{await h.settle();h.find('Select','Saved').props.onChange(job.id);await h.settle();const before=h.disk.get(root+'/jobs/'+job.id+'.json');await h.find('Button','Export card images').props.onClick();await h.settle();assert.equal(picks,1);assert.equal(writes,0);assert.equal(h.disk.get(root+'/jobs/'+job.id+'.json'),before);assert.ok(![...h.disk.keys()].some(p=>p.endsWith('/card-01.png')))}finally{h.close()}
});

test('manual export uses the chosen folder, verifies saved image resources and shows the actual output location',async()=>{
  let picks=0,imports=0;const paths=[];const job={id:'visible-export',projectId:'p',templateId:'layout-team',draftId:'existing',plan:{cards:[{role:'cover',headline:'Cover'},{role:'body',body:'Body'}],caption:'Caption',hashtags:'#tag'}};
  const h=harness({job,dialogs:{pickDirectoryPath:async()=>{picks++;return '/chosen/cards'}},sdk:{runScript:async({summary,script,allowCommit})=>{
    if(summary==='Read the card ranges')return{result:{fps:24,cards:[['Card 01',0,72],['Card 02',72,144]]}};
    if(summary==='Add exported card images to the project'){
      assert.equal(allowCommit,true);const rows=[];
      const result=await new (Object.getPrototypeOf(async()=>{}).constructor)('selects',script)({project:id=>{assert.equal(id,'p');return{importFiles:async({paths:files})=>{imports++;assert.equal(files.length,2);for(const p of files){assert.ok(h.disk.has(p));assert.match(p,/^\/chosen\/cards\/visible-export-.*\/card-0[12]\.png$/);paths.push(p)}rows.push(...files.map((_,i)=>({resourceId:'png-'+i})));return{addedResourceIds:rows.map(r=>r.resourceId)}},resources:async()=>rows}}});return{result};
    }return{result:[]};
  }}});
  try{await h.settle();h.find('Select','Saved').props.onChange(job.id);await h.settle();assert.equal(imports,0);await h.find('Button','Export card images').props.onClick();await h.settle();const saved=(await h.bindings.makeStore().list('jobs')).find(j=>j.id===job.id);assert.equal(saved.saveTo,'/chosen/cards');assert.equal(saved.done,true);assert.equal(saved.export.files.length,2);assert.ok(h.disk.has(saved.export.dir+'/caption.txt'));assert.equal(imports,1);assert.equal(picks,1);assert.ok(nodes(h.render()).some(n=>n.type==='Message'&&n.props.children.includes(saved.export.dir)));assert.ok(h.find('Button','Open folder'));assert.ok(nodes(h.render()).some(n=>n.type==='Message'&&n.props.children.some(v=>typeof v==='string'&&v.includes('Added the card images to the project'))));await h.find('Button','Export card images').props.onClick();await h.settle();assert.equal(picks,1);assert.equal(imports,2)}finally{h.close()}
});

test('partial rendering, caption writes and project imports retain saved files without a success message',async()=>{
  for(const failure of ['render','caption','partial-import','missing-inventory','import-throw']){
    let renders=0,imports=0;const job={id:'partial-'+failure,projectId:'p',templateId:'layout-team',draftId:'existing',saveTo:'/chosen',plan:{cards:[{role:'cover',headline:'Cover'},{role:'body',body:'Body'}],caption:'Caption'}};
    const h=harness({job,dialogs:{pickDirectoryPath:async()=>{throw Error('Existing selected folder must be reused')}},sdk:{runScript:async({summary,script})=>{
      if(summary==='Read the card ranges')return{result:{fps:24,cards:[['Card 01',0,72],['Card 02',72,144]]}};
      if(summary==='Export card composite'&&++renders===2&&failure==='render')return{isError:true,output:'Still render failed'};
      if(summary==='Add exported card images to the project'){
        imports++;if(failure==='import-throw')throw Error('Project import unavailable');
        const result=await new (Object.getPrototypeOf(async()=>{}).constructor)('selects',script)({project:()=>({importFiles:async()=>({addedResourceIds:failure==='partial-import'?['one']:['one','two']}),resources:async()=>failure==='missing-inventory'?[]:[{resourceId:'one'},{resourceId:'two'}]})});return{result};
      }return{result:[]};
    }}});
    try{if(failure==='caption'){const write=h.files.writeFile;h.files.writeFile=async(p,v)=>{if(p.endsWith('/caption.txt'))throw Error('Caption write failed');return write(p,v)}}await h.settle();h.find('Select','Saved').props.onChange(job.id);await h.settle();await h.find('Button','Export card images').props.onClick();await h.settle();const saved=(await h.bindings.makeStore().list('jobs')).find(j=>j.id===job.id);assert.equal(saved.done,false);assert.equal(saved.export.files.length,failure==='render'?1:2);assert.ok(saved.export.files.every(p=>h.disk.has(p)));assert.equal(imports,['render','caption'].includes(failure)?0:1);assert.ok(h.find('Button','Open folder'));const messages=nodes(h.render()).filter(n=>n.type==='Message');assert.ok(messages.some(n=>n.props.tone==='error'));assert.ok(!messages.some(n=>n.props.children.some(v=>typeof v==='string'&&v.startsWith('Saved '))))}finally{h.close()}
  }
});

test('live timeline overflow blocks export before replacing a completed receipt or writing files', async () => {
  const previous = { dir: '/chosen/completed', files: ['/chosen/completed/card-01.png'] };
  const job = { id: 'live-overflow', projectId: 'p', templateId: 'layout-team', draftId: 'existing', saveTo: '/chosen', export: previous, done: true, plan: { cards: [{role:'body',body:'Saved safe body'}], caption: 'Caption' } };
  let renders = 0;
  const h = harness({job,sdk:{runScript:async({summary})=>{
    if(summary==='Read the card ranges')return{result:{fps:24,cards:[['Card 01',0,72,{role:'body',body:'One\nTwo\nThree\nFour',fontFamily:'Test',bodySize:54,bodyWeight:400,tracking:0,textSlots:JSON.stringify([{left:105,top:943,width:880,height:82},{left:105,top:1025,width:880,height:82},{left:105,top:1107,width:880,height:82}])},true]]}};
    if(summary==='Export card composite')renders++;
    return {result:[]};
  }}});
  try {
    await h.settle();h.find('Select','Saved').props.onChange(job.id);await h.settle();
    const beforePaths=[...h.disk.keys()].filter(p=>p.startsWith('/chosen/'));
    const beforeJob=h.disk.get(root+'/jobs/'+job.id+'.json');
    await h.find('Button','Export card images').props.onClick();await h.settle();
    const saved=(await h.bindings.makeStore().list('jobs')).find(j=>j.id===job.id);
    assert.deepEqual(plain(saved.export),previous);assert.equal(renders,0);
    assert.equal(saved.done,true);assert.equal(h.disk.get(root+'/jobs/'+job.id+'.json'),beforeJob);
    assert.deepEqual([...h.disk.keys()].filter(p=>p.startsWith('/chosen/')),beforePaths);
    assert.ok(nodes(h.render()).some(n=>n.type==='Message'&&n.props.tone==='error'&&n.props.children.some(v=>String(v).includes('text area'))));
  } finally { h.close(); }
});

test('article photos prepare before editing, mix with optional local photos and are reused after save/reopen', async () => {
  const downloads = [], requests = [];
  const h = harness({ sdk: { askAI: async input => { requests.push(input); return { text: JSON.stringify({ cards: [{ headline: 'Cover facts', image: { source: 'photo', photoIndex: 1 } }, { body: 'Body facts', image: { source: 'photo', photoIndex: 0 } }] }) }; } } });
  h.files.downloadFile = async (url, p) => { downloads.push(url); h.disk.set(p, new TextEncoder().encode(url.endsWith('/article') ? '<meta property="og:type" content="article"><article><p>' + 'Verified article facts. '.repeat(40) + '</p><img src="/one.jpg"><img data-src="/two.png"></article>' : 'x'.repeat(2000))); };
  const read = h.files.readFile;
  h.files.readFile = p => { assert.doesNotMatch(p, /article-\d+\.(png|jpg)$/); return read(p); };
  try {
    await h.settle(); h.find('TextField', 'Article link').props.onChange('https://example.test/article');
    h.find('Toggle', 'Add my own photos (optional)').props.onChange(true);
    await nodes(h.render()).find(n => n.type === 'FileDrop').props.onChange({ path: '/photos/local.jpg' });
    await h.find('Button', 'Generate').props.onClick(); await h.settle();
    assert.equal(requests.length, 1); assert.match(requests[0].prompt, /photoIndex/);
    const editors = nodes(h.render()).filter(n => n.type === h.bindings.CardEditor);
    assert.equal(editors[0].props.card.picture.kind, 'article'); assert.ok(editors[0].props.card.picture.path.endsWith('article-1.jpg'));
    assert.equal(editors[1].props.card.picture.path, '/photos/local.jpg');
    assert.equal(editors[0].props.plan.photoChoices.length, 3);
    assert.equal(downloads.length, 2);
    await editors[0].props.onArticle(1); await h.settle(); assert.equal(downloads.length, 3);
    h.find('Button', 'Add card slot').props.onClick(); await h.settle();
    let cards = nodes(h.render()).filter(n => n.type === h.bindings.CardEditor).map(n => n.props.card);
    const snapshot = cards.map(({ id, role, headline, body }) => ({ id, role, headline, body }));
    assert.equal(cards.length, 3); assert.equal(cards[2].role, 'body');
    const beforePaths = cards.map(c => c.picture.path);
    nodes(h.render()).find(n => n.type === h.bindings.CardEditor).props.onMove(1); await h.settle();
    cards = nodes(h.render()).filter(n => n.type === h.bindings.CardEditor).map(n => n.props.card);
    assert.deepEqual(cards.map(({ id, role, headline, body }) => ({ id, role, headline, body })), snapshot);
    assert.equal(cards[0].picture.path, beforePaths[1]); assert.equal(cards[1].picture.path, beforePaths[0]);
    const jobs = await h.bindings.makeStore().list('jobs'), job = jobs.find(j => j.plan);
    assert.equal(job.timings.aiCalls, 1); assert.equal(job.timings.repairs, 0); assert.ok(job.timings.editableMs >= 0);
    h.find('Button', 'Start over').props.onClick(); await h.settle(); h.find('Select', 'Saved').props.onChange(job.id); await h.settle();
    assert.deepEqual(nodes(h.render()).filter(n => n.type === h.bindings.CardEditor).map(n => n.props.card), cards);
    assert.equal(downloads.length, 3);
  } finally { h.close(); }
});

test('an unavailable article original falls back to its published URL and a failed photo keeps editable text', async () => {
  const urls = [];
  const h = harness({ sdk: { askAI: async () => ({ text: '{"cards":[{"headline":"Cover","image":{"source":"photo","photoIndex":0}},{"body":"Body","image":{"source":"photo","photoIndex":1}}]}' }) } });
  h.files.stat = async p => ({ isDirectory: false, size: h.disk.get(p)?.length || 0 });
  h.files.downloadFile = async (url, p) => {
    urls.push(url);
    if (url.endsWith('/article')) h.disk.set(p, new TextEncoder().encode('<meta property="og:type" content="article"><article><p>'+'Verified facts. '.repeat(40)+'</p><img src="https://www.chosun.com/resizer/v2/ABCDEF.jpg?width=616"><img src="https://example.test/broken.jpg"></article>'));
    else if (url.includes('/resizer/')) h.disk.set(p, new Uint8Array(2000));
    else throw Error('HTTP 404');
  };
  try {
    await h.settle(); h.find('TextField', 'Article link').props.onChange('https://example.test/article');
    await h.find('Button', 'Generate').props.onClick(); await h.settle();
    assert.ok(urls.includes('https://cloudfront-ap-northeast-1.images.arcpublishing.com/chosun/ABCDEF.jpg'));
    assert.ok(urls.includes('https://www.chosun.com/resizer/v2/ABCDEF.jpg?width=616'));
    const editor=h.component('CardEditor');assert.equal(editor.props.plan.article.images[1].unavailable,true);
    assert.equal(editor.props.plan.cards[1].body,'Body');assert.equal(editor.props.plan.cards[1].picture.kind,'none');
    const before=plain(editor.props.card);
    await editor.props.onArticle(1);await h.settle();assert.deepEqual(plain(h.component('CardEditor').props.card),before);
    assert.equal(h.find('Button','Add card slot').props.disabled,false);
  }finally{h.close()}
});

test('provided article previews feed planning; export downloads only selected originals and reuses them', async () => {
  const downloads=[],requests=[];
  const h=harness({sdk:{askAI:async input=>{requests.push(input);return({text:'{"cards":[{"headline":"Cover","image":{"source":"photo","photoIndex":0}},{"body":"Body","image":{"source":"photo","photoIndex":0}}]}'})},runScript:async({summary})=>{
    if(summary==='List project videos')return{result:[]};
    if(summary==='Add a card picture')return{result:{id:'resource',name:'original.jpg'}};
    if(summary==='Check for an existing draft')return{result:null};
    if(summary.startsWith('Build '))return{result:{draftId:'draft',fps:24,bounds:[[0,72],[72,144]]}};
    if(summary==='Read the card ranges')return{result:{fps:24,cards:[['Card 01',0,72],['Card 02',72,144]]}};
    if(summary==='Add exported card images to the project')return{result:{added:2}};
    return{result:{}};
  }}});
  const fusion={content_elements:[{type:'text',content:'Verified facts. '.repeat(40)},...['one','two'].map(name=>({type:'image',url:'https://example.test/'+name+'-original.jpg',resizedUrls:{article_lg:'https://example.test/'+name+'-preview.jpg'},caption:'Caption '+name}))]};
  h.files.downloadFile=async(url,p)=>{downloads.push(url);h.disk.set(p,new TextEncoder().encode(url.endsWith('/article')?'Fusion.globalContent='+JSON.stringify(fusion)+';Fusion.x=1;':'x'.repeat(2000)))};
  try{
    await h.settle();h.find('TextField','Article link').props.onChange('https://example.test/article');await h.find('Button','Generate').props.onClick();await h.settle();
    assert.ok(downloads.includes('https://example.test/one-preview.jpg'));assert.ok(downloads.includes('https://example.test/two-preview.jpg'));
    assert.ok(!downloads.some(url=>url.includes('-original.jpg')));
    assert.equal(requests.length,1);assert.equal(requests[0].images?.length,1);assert.ok(requests[0].images[0].dataUrl.startsWith('data:image/jpeg'));
    assert.ok(h.component('CardEditor').props.plan.photoChoices.every(photo=>photo.path));
    assert.equal(h.component('CardEditor').props.plan.photoChoices[0].caption,'Caption one');
    await h.find('Button','Export card images').props.onClick();await h.settle();
    assert.equal(downloads.filter(url=>url==='https://example.test/one-original.jpg').length,1);assert.ok(!downloads.includes('https://example.test/two-original.jpg'));
    const job=(await h.bindings.makeStore().list('jobs')).find(job=>job.plan);assert.equal(job.done,true);assert.match(job.pictures[0].path,/-original.jpg$/);assert.doesNotMatch(job.plan.cards[0].picture.path,/-original.jpg$/);
    await h.find('Button','Export card images').props.onClick();await h.settle();assert.equal(downloads.filter(url=>url==='https://example.test/one-original.jpg').length,1);
  }finally{h.close()}
});

test('the existing 20-photo planning budget does not discard remaining selectable article candidates', async () => {
  const h=harness({sdk:{askAI:async()=>({text:'{"cards":[{"headline":"Cover","image":{"source":"photo","photoIndex":0}}]}'})}});
  const fusion={content_elements:[{type:'text',content:'Verified facts. '.repeat(40)},...Array.from({length:21},(_,i)=>({type:'image',url:'https://example.test/'+i+'.jpg'}))]};
  h.files.downloadFile=async(url,p)=>h.disk.set(p,new TextEncoder().encode(url.endsWith('/article')?'Fusion.globalContent='+JSON.stringify(fusion)+';Fusion.x=1;':'x'.repeat(2000)));
  try{await h.settle();h.find('TextField','Article link').props.onChange('https://example.test/article');await h.find('Button','Generate').props.onClick();await h.settle();const editor=h.component('CardEditor');assert.equal(editor.props.plan.article.images.length,21);assert.equal(editor.props.plan.photoChoices.length,20);await editor.props.onArticle(20);await h.settle();assert.equal(h.component('CardEditor').props.card.picture.index,20);assert.ok(h.component('CardEditor').props.card.picture.path)}finally{h.close()}
});
