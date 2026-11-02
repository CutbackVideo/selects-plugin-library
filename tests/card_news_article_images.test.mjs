import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadPanelModule, disposePanelModule } from './panel_module_fixture.mjs';

const fixtures = JSON.parse(fs.readFileSync(new URL('./fixtures/card-news-article-images.json', import.meta.url), 'utf8'));
const source = fs.readFileSync(new URL('../plugins/card-news-maker/panel.tsx', import.meta.url), 'utf8');
const React = { useRef: value => ({ current: value }), useState: value => [value, () => {}], useEffect() {}, createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) };
const panel = loadPanelModule(source, { names: ['CardSupport'], React, globals: { URL,
  document: { createElement: () => ({ getContext: () => ({ measureText: () => ({ width: 1 }) }) }) },
} });
after(() => disposePanelModule(panel));

function checkArticle(article, fixture) {
  assert.equal(article.body, fixture.body, 'Article facts must appear once, without page chrome or image captions');
  if (fixture.title !== undefined) assert.equal(article.title, fixture.title);
  if (fixture.images !== undefined) {
    const urls = Array.from(article.images || [], image => image.url);
    assert.equal(urls.length, new Set(urls).size, 'One image URL must appear only once');
    assert.deepEqual(urls.sort(), [...fixture.images].sort());
  }
}

for (const fixture of fixtures) {
  test('extractArticle: ' + fixture.name, () => {
    checkArticle(panel.CardSupport.extractArticle(fixture.url, fixture.html), fixture);
  });

  test('readArticle: ' + fixture.name, async () => {
    const downloaded = [], removed = [];
    const files = {
      join: path.posix.join,
      getOrCreateTmpDirPath: async () => '/fixture-tmp',
      downloadFile: async (url, target) => { assert.equal(url, fixture.url); downloaded.push(target); },
      readFile: async target => { assert.equal(target, downloaded[0]); return new TextEncoder().encode(fixture.html); },
      removeFile: async ({ filePath }) => { removed.push(filePath); },
    };
    checkArticle(await panel.CardSupport.readArticle(files, fixture.url), fixture);
    assert.equal(downloaded.length, 1);
    assert.deepEqual(removed, downloaded);
  });
}
