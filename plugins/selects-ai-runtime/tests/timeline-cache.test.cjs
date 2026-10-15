'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { tmpdir } = require('node:os');
const { probeVideo } = require('../lib/video.cjs');
const { timelineKey, readTimeline, writeTimeline, MAX_ENTRIES } = require('../lib/timeline-cache.cjs');

// A stand-in ffprobe: stream headers for the first call, a 30 fps frame timeline for -show_frames, and one
// log line per full timeline pass so a test can count them.
const FAKE_FFPROBE = `#!/bin/sh
case "$*" in
  *-show_frames*)
    echo frames >> "$FAKE_PROBE_LOG"
    printf '{"frames":['
    i=0
    while [ $i -lt 90 ]; do
      [ $i -gt 0 ] && printf ','
      printf '{"best_effort_timestamp":%d}' $((i * 512))
      i=$((i + 1))
    done
    printf ']}'
    ;;
  *)
    printf '{"streams":[{"width":64,"height":36,"avg_frame_rate":"30/1","time_base":"1/15360","duration":"3.0","start_time":"0"}],"format":{"duration":"3.0"}}'
    ;;
esac
`;

async function setup() {
  const directory = await fs.mkdtemp(path.join(tmpdir(), 'timeline-cache-'));
  const ffprobe = path.join(directory, 'ffprobe');
  await fs.writeFile(ffprobe, FAKE_FFPROBE, { mode: 0o755 });
  const source = path.join(directory, 'source.mp4');
  await fs.writeFile(source, 'not decoded by the fake probe');
  const cache = path.join(directory, 'timelines');
  await fs.mkdir(cache);
  const log = path.join(directory, 'probe.log');
  process.env.FAKE_PROBE_LOG = log;
  const passes = async () => (await fs.readFile(log, 'utf8').catch(() => '')).split('\n').filter(Boolean).length;
  const request = { contractVersion: 1, task: 'faces.detect', input: { source: { path: source }, sourceRange: { startSeconds: 1, endSeconds: 2 } } };
  return { directory, ffprobe, source, cache, passes, request };
}

const skip = process.platform === 'win32' ? 'the stand-in ffprobe is a POSIX shell script' : false;

test('a second job on the same file reuses the frame timeline', { skip }, async () => {
  const { directory, ffprobe, cache, passes, request } = await setup();
  try {
    const config = { tools: { ffprobe }, timelineCache: cache };
    const signal = new AbortController().signal;
    const first = await probeVideo(config, request, signal);
    const second = await probeVideo(config, request, signal);
    assert.equal(await passes(), 1);
    assert.equal(first.timelineCached, false);
    assert.equal(second.timelineCached, true);
    assert.deepEqual(second.frameTimes, first.frameTimes);
    assert.equal(second.sourceFrameCount, first.sourceFrameCount);
    assert.deepEqual(second.sourceRange, first.sourceRange);
    assert.equal(first.frameTimes.length, 30);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('a changed file, a malformed entry or no cache directory means a fresh timeline', { skip }, async () => {
  const { directory, ffprobe, source, cache, passes, request } = await setup();
  try {
    const signal = new AbortController().signal;
    await probeVideo({ tools: { ffprobe }, timelineCache: cache }, request, signal);
    await fs.appendFile(source, ' edited');
    const edited = await probeVideo({ tools: { ffprobe }, timelineCache: cache }, request, signal);
    assert.equal(edited.timelineCached, false);
    assert.equal(await passes(), 2);

    const key = timelineKey(source, await fs.stat(source), ffprobe);
    await fs.writeFile(path.join(cache, `${key}.json`), '{"version":1,"key":"' + key + '","rawPts":[0,"x"]}');
    const repaired = await probeVideo({ tools: { ffprobe }, timelineCache: cache }, request, signal);
    assert.equal(repaired.timelineCached, false);
    assert.equal(await passes(), 3);

    await probeVideo({ tools: { ffprobe } }, request, signal);
    await probeVideo({ tools: { ffprobe }, timelineCache: path.join(directory, 'missing') }, request, signal);
    assert.equal(await passes(), 5);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('the cache keeps only the most recent entries and ignores links', async () => {
  const directory = await fs.mkdtemp(path.join(tmpdir(), 'timeline-cache-'));
  try {
    const cache = path.join(directory, 'timelines');
    await fs.mkdir(cache);
    for (let i = 0; i < MAX_ENTRIES + 5; i++) {
      assert.equal(await writeTimeline(cache, timelineKey(`/source-${i}.mp4`, { size: i, mtimeMs: i }, 'ffprobe'), [0, 512, 1024]), true);
    }
    const names = (await fs.readdir(cache)).filter(name => name.endsWith('.json'));
    assert.ok(names.length <= MAX_ENTRIES, `${names.length} entries kept`);
    const newest = timelineKey(`/source-${MAX_ENTRIES + 4}.mp4`, { size: MAX_ENTRIES + 4, mtimeMs: MAX_ENTRIES + 4 }, 'ffprobe');
    assert.deepEqual(await readTimeline(cache, newest), [0, 512, 1024]);

    if (process.platform !== 'win32') {
      const linked = path.join(directory, 'linked');
      await fs.symlink(cache, linked);
      assert.equal(await readTimeline(linked, newest), null);
      assert.equal(await writeTimeline(linked, newest, [0]), false);
    }
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
