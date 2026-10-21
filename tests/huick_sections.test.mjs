import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire, stripTypeScriptTypes } from 'node:module';
import { panelSource } from './windows_host.mjs';

const modulesRoot = process.env.AI_PANEL_TEST_MODULES;
const options = { skip: !modulesRoot && 'Set AI_PANEL_TEST_MODULES to node_modules that include jsdom' };

function loadHuickSections() {
  const { JSDOM } = createRequire(path.join(path.resolve(modulesRoot), '..', 'package.json'))('jsdom');
  const source = panelSource('huick-cardnews');
  const start = source.indexOf('const PAGE_BOLD =');
  const body = source.slice(start, source.indexOf('// The shape of a generated picture', start));
  const { window } = new JSDOM('');
  const context = vm.createContext({ DOMParser: window.DOMParser, URL });
  vm.runInContext(stripTypeScriptTypes(body) + '\nthis.huickSections = huickSections;', context);
  return context.huickSections;
}

const plain = (value) => JSON.parse(JSON.stringify(value));
const banner = (id) => `<div class="stb-image-box"><img src="https://img2.stibee.com/21525_3050548_${id}.png" width="472"></div>`;
const box = (html) => `<div class="stb-text-box">${html}</div>`;

// Shaped like a Huick Inside issue: the parts sit under banner images whose words are only in the
// picture, a perspective's heading is set in two bold pieces, and the sign-off follows the quote.
const ISSUE = `<html><head><meta property="og:title" content="Huick Inside"></head><body>
<div><span>VOL.36\uff5c 2026.7.27</span></div>
${box('<div>\uc6f9\uc5d0\uc11c \ud3b8\ud558\uac8c \ubcf4\uc138\uc694!</div>')}
${box('<div><b>Teen social media ban</b></div><div>Hello, readers. Today we look at a new rule.</div>')}
${banner('1761543246124776109')}
${box('<div>For readers who scroll too long</div>')}
${banner('1761198220477702378')}
${banner('1761198392753401346')}
${box('<div><b>Infinite scroll:</b> a feed that never ends.</div>')}
${banner('1761198497870108739')}
${box('<div><b>The plan</b></div><div>The government plans to bar sign-ups under 14 and limit feeds for teens up to 19.</div>')}
${banner('1761535954023650804')}
${box('<div><span class="stb-bold">Civics</span><span class="stb-bold"> textbook view - why protect children?</span> Children are still learning to judge risk.<br>So the state steps in.</div>')}
${box('<div><b>Culture textbook view - who designs the feed?</b></div><div>Platforms keep users watching longer.</div>')}
${box('<div><b>Politics textbook view - whose voice?</b></div><div>Teens should be heard before the rule is set.</div>')}
${banner('1761198611410599597')}
${box('<div>Would you choose protection or freedom?</div>')}
${banner('1761543206084290467')}
${box('<div>"The best interests of the child come first."</div><div>- UN Convention on the Rights of the Child</div>')}
${box('<div>Reporter sign-off and the newsletter footer.</div>')}
</body></html>`;

test('a Huick Inside issue is split at its banners, with the asked-for parts ticked', options, () => {
  const out = plain(loadHuickSections()(ISSUE, 'https://www.hankookilbo.com/newsletter/huickinside/x'));
  assert.equal(out.huick, true);
  // Every issue has the same page title, so the issue number in its header names it.
  assert.equal(out.vol, '36');
  const byPart = (part) => out.sections.filter((s) => s.part === part);
  assert.deepEqual(byPart('step1').map((s) => s.text), ['The plan\nThe government plans to bar sign-ups under 14 and limit feeds for teens up to 19.']);
  const views = byPart('step2');
  assert.equal(views.length, 3);
  // The heading is the bold run that opens the box, joined from both pieces.
  assert.match(views[0].title, /Civics textbook view - why protect children\?$/);
  assert.equal(views[0].text, 'Civics textbook view - why protect children? Children are still learning to judge risk.\nSo the state steps in.');
  // Under the closing banner only the first box is the quote.
  assert.equal(byPart('quote')[0].text, '"The best interests of the child come first."\n- UN Convention on the Rights of the Child');
  assert.deepEqual(out.sections.filter((s) => s.pick).map((s) => s.part), ['step1', 'step2', 'step2', 'step2', 'quote']);
  assert.deepEqual(out.sections.filter((s) => !s.pick).map((s) => s.part), ['head', 'intro', 'kipedia', 'step3']);
  // The mail header line is not part of the issue.
  assert.doesNotMatch(byPart('head')[0].text, /\uc6f9\uc5d0\uc11c/);
});

test('a page without the banners is not taken for an issue', options, () => {
  const out = plain(loadHuickSections()('<html><body><article><p>Plain article</p></article></body></html>', 'https://example.com/'));
  assert.equal(out.huick, false);
  assert.deepEqual(out.sections, []);
});
