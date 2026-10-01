// plugins/torn-paper-love/tests/i18n.test.cjs (run: node plugins/torn-paper-love/tests/i18n.test.cjs). Copied from selects-app-kit
// tools/i18n/i18n.test.template.cjs; dev/i18n-check.cjs is the kit's tools/i18n/i18n-check.cjs, copied unchanged.
// A key-completeness test, not a translation service: the authoring agent writes the translations.
const path = require('node:path'), fs = require('node:fs'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const { checkPanelFile, LANGS } = require(path.join(root, 'dev', 'i18n-check.cjs'));

const r = checkPanelFile(path.join(root, 'panel.tsx'), { pluginJson: path.join(root, 'plugin.json') });
assert.deepEqual(r.errors, [], '\n' + r.report);
assert.deepEqual(Object.keys(r.strings).sort(), [...LANGS].sort());

// The panel embeds the kit runtime (uiLang, t, tOr, fieldLen) and reads the language on every render.
const panel = fs.readFileSync(path.join(root, 'panel.tsx'), 'utf8');
for (const phrase of ['function uiLang(', 'function t(lang', 'new Intl.PluralRules(lang)', 'function fieldLen(']) assert.ok(panel.includes(phrase), phrase);
assert.ok(/uiLang\(context\)/.test(panel), 'the component calls uiLang(context)');

// App-specific UI assertions go against STRINGS.en and key usage, not literal JSX text (it moved into STRINGS):
// const en = r.strings.en;
// assert.equal(en.anotherVersion, 'Create another version');
// assert.ok(panel.includes('t(L, "anotherVersion")'));
console.log('i18n ok: ' + r.summary + (r.warnings.length ? '\n' + r.warnings.map((w) => '  warn: ' + w).join('\n') : ''));
