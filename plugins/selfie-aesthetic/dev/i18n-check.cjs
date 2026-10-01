#!/usr/bin/env node
// Checks a style-app panel's STRINGS block (between `// STRINGS:BEGIN` and `// STRINGS:END`) and its t()/tOr() calls.
// Plugins copy this file unchanged to plugins/<id>/dev/i18n-check.cjs and run it from tests/i18n.test.cjs.
'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');

const LANGS = ['de', 'en', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'tr', 'zh'];
const CLDR = ['zero', 'one', 'two', 'few', 'many', 'other'];
// The ranges tools/check_public.py rejects.
const HANGUL = /[\u1100-\u11ff\u3130-\u318f\ua960-\ua97f\uac00-\ud7ff]/;
const USAGE = `usage: node i18n-check.cjs <panel.tsx> [--plugin-json <path> | --no-plugin-json] [--json]

Checks: exactly the ${LANGS.length} languages (${LANGS.join(' ')}), identical key sets, matching {placeholders},
plural objects complete for Intl.PluralRules of each language, every t()/tOr() key defined and no key unused,
no literal Hangul in the file, // @name:<lang> headers for every language (ko Latin, <= 40 chars) and
plugin.json localized (default: plugin.json next to the panel, when present). Exit 1 on errors, 2 on usage.
Keys reached only dynamically: t(lang, "prefix." + id) or a comment "// i18n-used: key other.key prefix.*".`;

function extractStrings(src) {
  const begin = src.indexOf('// STRINGS:BEGIN'), end = src.indexOf('// STRINGS:END');
  if (begin < 0 || end < begin) throw new Error('no // STRINGS:BEGIN ... // STRINGS:END block');
  const block = src.slice(src.indexOf('\n', begin) + 1, end);
  const m = block.match(/^\s*(?:export\s+)?const\s+STRINGS\b[^=]*=/);
  if (!m) throw new Error('the STRINGS block must start with `const STRINGS = {`');
  const body = block.slice(m[0].length).trim()
    .replace(/;\s*$/, '').replace(/\s+satisfies\s+[\s\S]+$/, '').replace(/\s+as\s+const\s*$/, '');
  const strings = vm.runInNewContext('(' + body + ')', Object.create(null), { timeout: 1000 });
  const startLine = src.slice(0, begin).split('\n').length, endLine = src.slice(0, end).split('\n').length;
  return { strings, begin, end, startLine, endLine };
}

const placeholders = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
const forms = (v) => (typeof v === 'string' ? [v] : Object.values(v || {}));
const phSet = (v) => [...new Set(forms(v).flatMap(placeholders))].sort();

function checkStrings(strings, errors, warnings) {
  const langs = Object.keys(strings || {});
  const missing = LANGS.filter((l) => !langs.includes(l)), extra = langs.filter((l) => !LANGS.includes(l));
  if (missing.length) errors.push('missing languages: ' + missing.join(' '));
  if (extra.length) errors.push('unexpected languages: ' + extra.join(' '));
  const en = (strings && strings.en) || {};
  const enKeys = Object.keys(en);
  if (!enKeys.length) errors.push('STRINGS.en is empty');
  for (const lang of LANGS.filter((l) => strings && strings[l])) {
    const table = strings[lang], keys = Object.keys(table);
    const lost = enKeys.filter((k) => !(k in table)), more = keys.filter((k) => !(k in en));
    if (lost.length) errors.push(`${lang}: missing keys ${lost.join(', ')}`);
    if (more.length) errors.push(`${lang}: keys not in en ${more.join(', ')}`);
    const cats = new Intl.PluralRules(lang).resolvedOptions().pluralCategories;
    let same = 0;
    for (const key of keys.filter((k) => k in en)) {
      const v = table[key], ref = en[key];
      const plural = v !== null && typeof v === 'object', refPlural = ref !== null && typeof ref === 'object';
      if (typeof v !== 'string' && !plural) { errors.push(`${lang}.${key}: value must be a string or a plural object`); continue; }
      if (plural !== refPlural) { errors.push(`${lang}.${key}: ${plural ? 'plural object' : 'string'} but en has ${refPlural ? 'a plural object' : 'a string'}`); continue; }
      if (plural) {
        const have = Object.keys(v);
        const bad = have.filter((c) => !CLDR.includes(c) || typeof v[c] !== 'string');
        const need = cats.filter((c) => !have.includes(c)), spare = have.filter((c) => CLDR.includes(c) && !cats.includes(c));
        if (bad.length) errors.push(`${lang}.${key}: invalid plural forms ${bad.join(', ')}`);
        if (need.length) errors.push(`${lang}.${key}: missing plural forms ${need.join(', ')} (Intl.PluralRules("${lang}") uses ${cats.join('/')})`);
        if (spare.length) warnings.push(`${lang}.${key}: plural forms ${spare.join(', ')} are never selected for ${lang} by this runtime`);
      }
      const a = phSet(v).join(','), b = phSet(ref).join(',');
      if (a !== b) errors.push(`${lang}.${key}: placeholders {${a}} differ from en {${b}}`);
      if (lang !== 'en' && JSON.stringify(v) === JSON.stringify(ref)) same++;
    }
    if (same) warnings.push(`${lang}: ${same} value(s) identical to en (fine for names; check the rest are translated)`);
  }
  const multi = enKeys.filter((k) => en[k] !== null && typeof en[k] === 'object' && phSet(en[k]).some((p) => p !== 'count'));
  if (multi.length) warnings.push('plural keys with another placeholder: ' + multi.join(', ') + ' (the form follows {count}: keep the noun next to {count}, write a partial count as "(photos: {n})", guard it in panel.test)');
  if (strings && strings.ko && !Object.values(strings.ko).some((v) => forms(v).some((s) => HANGUL.test(s))))
    warnings.push('ko: no value contains Hangul; is the ko table translated?');
}

function checkUsage(src, block, enKeys, errors, warnings) {
  const outside = src.slice(0, block.begin) + '\n'.repeat(block.endLine - block.startLine) + src.slice(block.end);
  const used = new Set(), prefixes = new Set();
  const call = /\b(?:t|tOr)\(\s*(?:[\w$.?]+\s*,\s*)?(["'`])([\w.-]*)(\1|\$\{)(\s*\+)?/g;
  for (const m of outside.matchAll(call)) {
    if (m[3] === '${' || m[4]) prefixes.add(m[2]); else used.add(m[2]);
  }
  for (const m of outside.matchAll(/\/\/\s*i18n-used:([^\n]*)/g)) {
    for (const k of m[1].trim().split(/[\s,]+/).filter(Boolean)) {
      if (k.endsWith('*')) prefixes.add(k.slice(0, -1)); else used.add(k);
    }
  }
  const defined = new Set(enKeys);
  const undef = [...used].filter((k) => !defined.has(k));
  if (undef.length) errors.push('keys used but not in STRINGS.en: ' + undef.join(', '));
  for (const p of prefixes) if (!enKeys.some((k) => k.startsWith(p))) warnings.push(`dynamic prefix "${p}" matches no key (tOr falls back to the JSON label)`);
  const unused = enKeys.filter((k) => !used.has(k) && ![...prefixes].some((p) => k.startsWith(p)));
  if (unused.length) errors.push('keys never used by t()/tOr(): ' + unused.join(', ') + ' (for dynamic keys add "// i18n-used: <key or prefix.*>")');
  return { used: used.size, prefixes: [...prefixes] };
}

function checkHeaders(src, errors) {
  const head = src.split('\n').slice(0, 24);
  const names = {};
  for (const line of head) {
    const m = line.match(/^\/\/ @name:([a-z]{2})\s+(.*)$/);
    if (m) names[m[1]] = m[2].trim();
  }
  if (!head.some((l) => /^\/\/ @name\s+\S/.test(l))) errors.push('no default // @name header in the first 24 lines');
  const missing = LANGS.filter((l) => !names[l]);
  if (missing.length) errors.push('missing // @name:<lang> headers in the first 24 lines: ' + missing.join(' '));
  for (const [lang, name] of Object.entries(names)) {
    if ([...name].length > 40) errors.push(`@name:${lang} is longer than 40 characters`);
  }
  if (names.ko && (HANGUL.test(names.ko) || /\\u[0-9a-fA-F]{4}/.test(names.ko)))
    errors.push('@name:ko must stay Latin: a comment cannot hold \\u escapes and check_public rejects Hangul');
}

function checkPluginJson(json, errors) {
  const loc = json && json.localized;
  if (!loc || typeof loc !== 'object') { errors.push('plugin.json: no localized block'); return; }
  const langs = Object.keys(loc);
  const missing = LANGS.filter((l) => !langs.includes(l)), extra = langs.filter((l) => !LANGS.includes(l));
  if (missing.length) errors.push('plugin.json localized: missing ' + missing.join(' '));
  if (extra.length) errors.push('plugin.json localized: unexpected ' + extra.join(' '));
  for (const l of langs) {
    for (const f of ['name', 'summary']) if (typeof loc[l][f] !== 'string' || !loc[l][f].trim()) errors.push(`plugin.json localized.${l}.${f} is empty`);
  }
}

function checkPanel(src, { pluginJson = null, file = 'panel.tsx' } = {}) {
  const errors = [], warnings = [];
  const lines = src.split('\n');
  const hangul = lines.flatMap((l, i) => (HANGUL.test(l) ? [i + 1] : []));
  if (hangul.length) errors.push('literal Hangul on lines ' + hangul.slice(0, 20).join(', ') + (hangul.length > 20 ? ' ...' : '') + ' (run tools/i18n/escape-ko.mjs; comments must stay Latin)');
  checkHeaders(src, errors);
  let block = null, usage = { used: 0, prefixes: [] };
  try { block = extractStrings(src); } catch (e) { errors.push('STRINGS: ' + e.message); }
  if (block) {
    checkStrings(block.strings, errors, warnings);
    usage = checkUsage(src, block, Object.keys((block.strings && block.strings.en) || {}), errors, warnings);
  }
  if (pluginJson) checkPluginJson(pluginJson, errors);
  const keys = block && block.strings && block.strings.en ? Object.keys(block.strings.en).length : 0;
  const summary = `${keys} keys x ${LANGS.length} languages, ${usage.used} literal uses, ${usage.prefixes.length} dynamic prefixes`;
  const report = [`${file}: ${errors.length ? 'FAIL' : 'ok'} (${summary})`,
    ...errors.map((e) => '  error: ' + e), ...warnings.map((w) => '  warn:  ' + w)].join('\n');
  return { ok: !errors.length, errors, warnings, strings: block ? block.strings : null, summary, report };
}

function checkPanelFile(panelPath, { pluginJson } = {}) {
  const src = fs.readFileSync(panelPath, 'utf8');
  let json = null;
  const jsonPath = pluginJson === undefined ? path.join(path.dirname(panelPath), 'plugin.json') : pluginJson;
  if (jsonPath && fs.existsSync(jsonPath)) json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  else if (jsonPath && pluginJson) throw new Error('no plugin.json at ' + jsonPath);
  return checkPanel(src, { pluginJson: json, file: panelPath });
}

module.exports = { LANGS, HANGUL, extractStrings, checkPanel, checkPanelFile };

if (require.main === module) {
  const args = process.argv.slice(2);
  if (!args.length || args.includes('--help') || args.includes('-h')) { console.log(USAGE); process.exit(args.length ? 0 : 2); }
  const file = args.find((a) => !a.startsWith('-') && args[args.indexOf(a) - 1] !== '--plugin-json');
  const i = args.indexOf('--plugin-json');
  const pluginJson = args.includes('--no-plugin-json') ? null : i >= 0 ? args[i + 1] : undefined;
  if (!file) { console.error(USAGE); process.exit(2); }
  const r = checkPanelFile(file, { pluginJson });
  if (args.includes('--json')) console.log(JSON.stringify({ ok: r.ok, errors: r.errors, warnings: r.warnings, summary: r.summary }, null, 2));
  else console.log(r.report);
  process.exit(r.ok ? 0 : 1);
}
