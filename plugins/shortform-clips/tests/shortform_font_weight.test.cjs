'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const modules = process.env.SBS_PANEL_TEST_MODULES;

test('template weight controls reach saved templates, previews and generated graphics', { skip: !modules }, async t => {
  const dep = createRequire(path.resolve(modules, '../package.json'));
  const esbuild = dep('esbuild'), React = dep('react');
  const render = dep('react-dom/server').renderToStaticMarkup;
  const source = fs.readFileSync(path.join(__dirname, '../panel.tsx'), 'utf8');
  const mod = { exports: {} };
  const exports = 'TemplateAppearanceSection,TemplateCaptionsSection,updateTemplateField,cleanTemplate,radioFrameParams,radioCaptionParams,makeTemplateRepository,STRINGS,LandscapeGraphic,LANDSCAPE_GRAPHIC_TSX,SCRIPT_BUILD';
  new Function('require', 'module', 'exports', esbuild.transformSync(source + '\nexport {' + exports + '};', { loader: 'tsx', format: 'cjs' }).code)(dep, mod, mod.exports);
  const api = mod.exports;
  const template = {
    schemaVersion: 1, id: 'weight-test', version: 1, names: { en: 'Weight test', ko: 'Weight test' },
    layout: { windowTop: 400, windowBottom: 1300, sourceTop: 0, sourceBottom: 1080, offsetX: 0, headlineCenter: 200, logoCenter: 1700 },
    background: { dim: 0, mode: 'color', color: '#000000', style: '#000000', image: '', imageName: '' },
    border: { on: false, color: '#000000' },
    headline: { font: 'JTBCGothic', fontWeight: 900, size1: 80, size2: 80, color1: '#FFFFFF', color2: '#FFFFFF', box2: '', box2On: false, italic: false, shadow: false },
    logo: { mode: 'none', image: '', imageName: '', width: 200 },
    captions: { on: true, mode: 'box', font: 'JTBCGothic', fontWeight: 600, fontSize: 60, color: '#FFFFFF', boxColor: '#000000', lineMax: 20, barHeight: 200, bottom: 1400 },
    editing: { removeFillers: false, removeSilences: false },
    prompt: Object.fromEntries(['role', 'format', 'good', 'bad', 'lengthGuide', 'countGuide', 'rules', 'headline'].map(key => [key, ''])),
    detect: { keywords: [], exclude: [], host: '' },
  };
  const landscape = { version: 1, title: 'Title', source: '', videoX: 0, videoY: 100, videoWidth: 800, headerX: 0, headerY: 0, headerWidth: 800, headerHeight: 100, sourceSize: 20, captionX: 0, captionY: 560, captionWidth: 800, captionHeight: 100, speakerX: 0, speakerY: 660, speakerHeight: 40, speakerSize: 20, speakers: [] };
  const graphic = code => {
    const loaded = { exports: {} };
    new Function('require', 'module', 'exports', esbuild.transformSync(code, { loader: 'tsx', format: 'cjs' }).code)(dep, loaded, loaded.exports);
    return loaded.exports.default;
  };
  const embedded = name => JSON.parse(api.SCRIPT_BUILD.match(new RegExp('const ' + name + ': string = (".*");'))[1]);
  const Frame = graphic(embedded('FRAME_TSX')), Caption = graphic(embedded('CAPTION_TSX'));
  const Landscape = graphic(api.LANDSCAPE_GRAPHIC_TSX);

  for (const wide of [false, true]) await t.test(wide ? 'landscape' : 'portrait', async () => {
    let edit = structuredClone({ ...template, ...(wide ? { landscape } : {}) });
    const fields = [];
    const ui = new Proxy({}, { get: (_, key) => key === 'FontWeightField'
      ? props => { fields.push(props); return null; }
      : props => React.createElement('div', null, props.children) });
    const draft = { edit, saving: false, set: (key, value) => { edit = api.updateTemplateField(edit, key, value); } };
    const props = { ui, S: api.STRINGS.en, lang: 'en', draft, profile: { Preview: () => null } };
    render(React.createElement(api.TemplateAppearanceSection, props));
    render(React.createElement(api.TemplateCaptionsSection, props));
    assert.equal(fields.length, 2);
    assert.deepEqual(fields.map(f => [f.family, f.value]), [['JTBCGothic', 900], ['JTBCGothic', 600]]);
    fields[0].onChange(800); fields[1].onChange(300);
    assert.equal(template.headline.fontWeight, 900, 'original template stays intact');
    const rows = new Map();
    const store = { list: async kind => [...rows].filter(([key]) => key.startsWith(kind + '/')).map(([, value]) => value), get: async (kind, id) => rows.get(kind + '/' + id) ?? null, put: async (kind, id, value) => rows.set(kind + '/' + id, structuredClone(value)) };
    const repo = api.makeTemplateRepository(store);
    await repo.put('templates', edit.id, api.cleanTemplate(edit));
    const reopened = api.makeTemplateRepository(store);
    const summary = (await reopened.listTemplates()).templates[0];
    const saved = await reopened.resolveTemplate(summary);
    const frame = api.radioFrameParams(saved, 'Title', ''), caption = api.radioCaptionParams(saved);
    assert.equal(frame.headlineFontWeight, 800); assert.equal(caption.fontWeight, 300);
    assert.match(render(React.createElement(wide ? Landscape : Frame, { data: { ...frame, designElement: 'headline1' } })), /font-weight:800/);
    assert.match(render(React.createElement(wide ? Landscape : Caption, { data: { ...caption, designElement: 'caption', text: 'Caption' } })), /font-weight:300/);
    if (wide) assert.equal(render(React.createElement(api.LandscapeGraphic, { data: frame })), render(React.createElement(Landscape, { data: frame })));
  });
  assert.equal(api.LANDSCAPE_GRAPHIC_TSX, fs.readFileSync(path.join(__dirname, '../landscape/graphic.tsx'), 'utf8'));
});
