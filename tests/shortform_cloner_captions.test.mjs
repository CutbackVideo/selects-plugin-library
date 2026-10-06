// Selects Clips: captions are divided at natural breaks.
// The rules live in the Draft-building script inside the panel; this runs them on a short two-speaker
// conversation and on edge cases.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';

const panel = fs.readFileSync(new URL('../plugins/shortform-cloner/panel.tsx', import.meta.url), 'utf8');
const build = JSON.parse(panel.match(/^const SCRIPT_BUILD: string = (".*");$/m)[1]);
const rules = build.slice(build.indexOf('// ---- Captions: one caption per thought ----'), build.indexOf('// Resource ids are Project-scoped aliases'));
const box = {};
vm.runInNewContext(stripTypeScriptTypes(rules) + '\nglobalThis.makeCues = makeCues;', box);
const makeCues = (...args) => JSON.parse(JSON.stringify(box.makeCues(...args)));

// Words as the Draft gives them: [text, startFrame, endFrame, sourceStartFrame, speakerId, utteranceId].
// `pauses` maps a word to the silence after it, in frames.
function talk(turns, pauses = {}) {
  const words = [];
  let f = 0;
  turns.forEach(([speaker, sentence], u) => {
    for (const w of sentence.split(' ')) {
      const a = f;
      f += 6 + w.length;
      words.push([w, a, f, a, speaker, 'u' + u]);
      f += 2 + (pauses[w] || 0);
    }
  });
  return words;
}
const MAX = 17;
const shownText = cues => cues.map(c => c[2].replace(/\n/g, ' '));

test('a caption ends with the sentence, and a reply is its own caption', () => {
  const words = talk([
    [1, '\ub9e4\ub144 \uc2dc\uc0c1\uc2dd \uc2dc\uc98c\uc774 \ub418\uba74 \ubaa8\ub4e0 \uc2dc\uc120\uc774 \uadf8\ub9ac\ub85c \ud5a5\ud558\uc796\uc544\uc694.'],
    [2, '\ub9de\uc544, \uadf8\ub807\uc8e0.'],
    [1, '\uadf8\ub9ac\uace0 \uc9c0\uae08 \uc640\uc11c \uc5b4\ub5a4 \ub098\ub77c\uac00 \uadf8 \uc0c1\uc744 \ub300\uccb4\ud560 \ub2e4\ub978 \uc0c1\uc744 \ub9cc\ub4e4\uae30\uac00 \uc27d\uc9c0 \uc54a\uc796\uc544\uc694.'],
  ], {'\uadf8\ub9ac\uace0': 30});
  const flat = shownText(makeCues(words, 30, MAX, words.at(-1)[2], []));
  const i = flat.findIndex(t => t.endsWith('\ud5a5\ud558\uc796\uc544\uc694'));
  assert.ok(i >= 0, flat.join(' | '));
  assert.equal(flat[i + 1], '\ub9de\uc544, \uadf8\ub807\uc8e0');
  assert.ok(flat[i + 2].startsWith('\uadf8\ub9ac\uace0'), flat[i + 2]);
});

test('the last word of a question is not left on its own', () => {
  const words = talk([[1, '\uadf8\ub7ec\uba74 \uc5b4\ub5bb\uac8c \ud574\uc57c \uc774\uac78 \uc0b0\uc5c5\uc73c\ub85c \uc804\ud658\uc2dc\ud0a4\uace0 \uc5b4\ub5bb\uac8c \ud574\uc57c \uc774 \uc0b0\uc5c5\uc758 \uc8fc\ub3c4\uad8c\uc744 \uc6b0\ub9ac\ub098\ub77c\uac00 \uacc4\uc18d \uac00\uc9c0\uace0 \uac08 \uc218 \uc788\uc744\uae4c?']]);
  const cues = makeCues(words, 30, MAX, words.at(-1)[2], []);
  const lines = cues.flatMap(c => c[2].split('\n'));
  assert.ok(!lines.includes('\uc788\uc744\uae4c?'), lines.join(' | '));
  assert.ok(lines.some(l => l.endsWith('\uac08 \uc218 \uc788\uc744\uae4c?')), lines.join(' | '));
  assert.ok(!lines.some(l => l.endsWith('\uc5b4\ub5bb\uac8c')), lines.join(' | '));
});

test('lines fit the template, captions keep their order, every word is shown once', () => {
  const words = talk([
    [1, '\uc9c0\uae08\uc740 \uadf8 \ud68c\uc0ac\uc758 \uc624\ub108\ub4e4\uc774 \ubbf8\ud305\uc744 \ud558\ub7ec \ud55c\uad6d\uc5d0 \uc635\ub2c8\ub2e4.'],
    [2, '\uc608.'],
    [1, '\uadf8\ub798\uc11c \uc0ac\uc2e4 \ucc98\uc74c\uc5d0\ub294 \ubc18\ub300\uac00 \uc788\uc5c8\uc74c\uc5d0\ub3c4 \ubd88\uad6c\ud558\uace0 \uc77c\ubd80\ub7ec, \uc77c\ubd80\ub7ec\ub780 \ub9d0\uc740 \uc880 \uadf8\ub807\uc9c0\ub9cc \uc54c\uba74\uc11c \ud55c \uac70\uc608\uc694.'],
    [1, '\uad6d\ub0b4\ub294 4\ucc9c\ub9cc \uc6d0, \ud574\uc678\ub294 \ucd5c\uc18c\ud55c \ud55c \uc721, \uce60\uc5b5\uc774 \ub4e4\uc5b4\uc694.'],
  ], {'\uc635\ub2c8\ub2e4.': 40});
  const cues = makeCues(words, 30, MAX, words.at(-1)[2] + 30, []);
  for (const [a, e, text] of cues) {
    assert.ok(e > a);
    assert.ok(text.split('\n').length <= 2, text);
    for (const line of text.split('\n')) assert.ok(line.length <= MAX, line);
  }
  cues.forEach((c, k) => k && assert.ok(c[0] >= cues[k - 1][1]));
  assert.equal(shownText(cues).join(' '), words.map(w => w[0].replace(/\./g, '')).join(' '));
  assert.ok(!cues.some(c => /\uc721,$/.test(c[2].split('\n')[0]) || /\uc721,$/.test(c[2])), shownText(cues).join(' | '));
});

test('English: sentences stay apart and lines do not end on a function word', () => {
  const words = talk([[null, 'So the first thing we noticed was that the customers who came back, were not the ones we expected.'], [null, 'They were small teams, and they used it every single day.']]);
  const cues = makeCues(words, 30, 26, words.at(-1)[2], []).map(c => c[2]);
  assert.ok(!cues.some(t => /expected\s+They/.test(t.replace(/\n/g, ' '))), cues.join(' | '));
  assert.ok(!cues.some(t => t.split('\n').some(l => /\b(the|a|to|of|and|we|they)$/i.test(l))), cues.join(' | '));
});

test('edge cases', () => {
  assert.deepEqual(makeCues([], 30, MAX, 0, []), []);
  assert.deepEqual(makeCues([['\uc548\ub155\ud558\uc138\uc694.', 0, 20, 0], ['\ubc18\uac11\uc2b5\ub2c8\ub2e4.', 22, 50, 22]], 30, MAX, 60, []).map(c => c[2]), ['\uc548\ub155\ud558\uc138\uc694', '\ubc18\uac11\uc2b5\ub2c8\ub2e4']);
  assert.equal(makeCues([['\ud328\ub178\uba54\ub17c\uc774', 0, 20, 0, 1, 'a'], ['\uc88b\uc544\uc694.', 22, 50, 22, 1, 'a']], 30, MAX, 60, [{from: '\ud328\ub178\uba54\ub17c', to: 'Fanomenon'}])[0][2], 'Fanomenon\uc774 \uc88b\uc544\uc694');
  // 600 words with no punctuation and no speakers must still divide, quickly.
  const long = talk([[null, Array.from({length: 600}, (_, k) => ['\uadf8\ub798\uc11c', '\uc6b0\ub9ac\uac00', '\uc0dd\uac01\ud55c', '\uac83\uc740', '\uc774\uac8c', '\uc815\ub9d0', '\uac00\ub2a5\ud55c\uc9c0', '\ud655\uc778\ud558\ub294', '\uc77c\uc774\uc5c8\uace0'][k % 9]).join(' ')]]);
  const started = Date.now();
  const cues = makeCues(long, 30, MAX, long.at(-1)[2], []);
  assert.ok(Date.now() - started < 3000);
  assert.ok(cues.length > 50 && cues.every(c => c[2].split('\n').every(l => l.length <= MAX)));
});
