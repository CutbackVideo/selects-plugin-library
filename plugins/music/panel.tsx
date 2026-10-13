// @name Music
// @name:en Music
// @name:ko Music
// @icon audio
// Connect a personal Epidemic MCP key and add music as an editable Audio clip.
import React from 'react';

const COPY = {
  en: {
    connect: 'Connect Epidemic Sound', disconnect: 'Disconnect', connected: 'Epidemic Sound connected',
    manage: 'Manage connection', placeholder: 'Track, artist or mood', browse: 'Browse music',
    hints: 'Search by track, artist or mood.', results: 'Search results', shown: 'tracks shown',
    ready: 'Connected', connectTitle: 'Bring your music into Selects', connectHint: 'Connect with a key from your own Epidemic Sound account.',
    connecting: 'Connecting…',
    searching: 'Searching…', previewFailed: 'Could not play this track. Try another track.', emptyHint: 'Try another track, artist or mood.',
    pause: 'Pause', close: 'Close player', position: 'Playback position', adding: 'Downloading and adding music…',
    search: 'Search', clear: 'Clear search', query: 'Music search', more: 'Load more', empty: 'No tracks found.',
    drag: 'Drag a cover onto the timeline to add music.',
    preview: 'Preview', add: 'Add to Draft', added: 'Added to Draft', draft: 'Open a Draft to add music.', loading: 'Loading music\u2026', failed: 'Could not load music. Try again.',
    epidemic_update_required: 'Update Selects to connect Epidemic Sound.', epidemic_sign_in_required: 'Sign in to Selects first.',
    epidemic_reconnect_required: 'Reconnect your Epidemic account.', epidemic_account_changed: 'Your account changed. Try again.',
    epidemic_subscription_required: 'Your Epidemic subscription does not allow this download.', epidemic_connection_canceled: 'Connection canceled. Try again.',
    epidemic_invalid_key: 'Your Epidemic MCP key is invalid or expired. Disconnect and enter a new key.',
    epidemic_retry_later: 'Downloads are temporarily unavailable. Try again later.',
    epidemic_secure_storage_unavailable: 'Secure account storage is unavailable on this computer.',
    epidemic_import_uncertain: 'Check project files before trying the import again.',
  },
  ko: {
    connect: 'Epidemic Sound \uc5f0\uacb0', disconnect: '\uc5f0\uacb0 \ud574\uc81c', connected: 'Epidemic Sound \uc5f0\uacb0\ub428',
    manage: '\uc5f0\uacb0 \uad00\ub9ac', placeholder: '\uace1, \uc544\ud2f0\uc2a4\ud2b8, \ubd84\uc704\uae30\ub85c \uac80\uc0c9', browse: '\uc74c\uc545 \ub458\ub7ec\ubcf4\uae30',
    hints: '\uace1, \uc544\ud2f0\uc2a4\ud2b8, \ubd84\uc704\uae30\ub85c \uc6d0\ud558\ub294 \uc74c\uc545\uc744 \ucc3e\uc544\ubcf4\uc138\uc694.', results: '\uac80\uc0c9 \uacb0\uacfc', shown: '\uace1 \ud45c\uc2dc',
    ready: '\uc5f0\uacb0\ub428', connectTitle: '\ub0b4 \uc74c\uc545\uc744 Selects\uc5d0\uc11c', connectHint: '\ub0b4 Epidemic Sound \uacc4\uc815\uc5d0\uc11c \ubc1c\uae09\ud55c \ud0a4\ub85c \uc5f0\uacb0\ud558\uc138\uc694.',
    connecting: '\uc5f0\uacb0 \uc911…',
    searching: '\uac80\uc0c9 \uc911…', previewFailed: '\uc774 \uace1\uc744 \uc7ac\uc0dd\ud558\uc9c0 \ubabb\ud588\uc5b4\uc694. \ub2e4\ub978 \uace1\uc744 \uc120\ud0dd\ud574 \uc8fc\uc138\uc694.', emptyHint: '\ub2e4\ub978 \uace1, \uc544\ud2f0\uc2a4\ud2b8 \ub610\ub294 \ubd84\uc704\uae30\ub85c \uac80\uc0c9\ud574 \ubcf4\uc138\uc694.',
    pause: '\uc77c\uc2dc \uc815\uc9c0', close: '\ud50c\ub808\uc774\uc5b4 \ub2eb\uae30', position: '\uc7ac\uc0dd \uc704\uce58', adding: '\uc74c\uc545\uc744 \ub2e4\uc6b4\ub85c\ub4dc\ud558\uace0 \ucd94\uac00\ud558\ub294 \uc911…',
    search: '\uac80\uc0c9', clear: '\uac80\uc0c9\uc5b4 \uc9c0\uc6b0\uae30', query: '\uc74c\uc545 \uac80\uc0c9', more: '\ub354 \ubcf4\uae30', empty: '\uac80\uc0c9\ub41c \uace1\uc774 \uc5c6\uc5b4\uc694.',
    drag: '\ucee4\ubc84\ub97c \ud0c0\uc784\ub77c\uc778\uc73c\ub85c \ub4dc\ub798\uadf8\ud574 \uc74c\uc545\uc744 \ucd94\uac00\ud558\uc138\uc694.',
    preview: '\ubbf8\ub9ac\ub4e3\uae30', add: 'Draft\uc5d0 \ucd94\uac00', added: 'Draft\uc5d0 \ucd94\uac00\ub428', draft: '\uc74c\uc545\uc744 \ucd94\uac00\ud558\ub824\uba74 Draft\ub97c \uc5f4\uc5b4 \uc8fc\uc138\uc694.', loading: '\uc74c\uc545 \ubd88\ub7ec\uc624\ub294 \uc911\u2026', failed: '\uc74c\uc545\uc744 \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc5b4\uc694. \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.',
    epidemic_update_required: 'Epidemic\uc744 \uc5f0\uacb0\ud558\ub824\uba74 Selects\ub97c \uc5c5\ub370\uc774\ud2b8\ud574 \uc8fc\uc138\uc694.', epidemic_sign_in_required: 'Selects\uc5d0 \uba3c\uc800 \ub85c\uadf8\uc778\ud574 \uc8fc\uc138\uc694.',
    epidemic_reconnect_required: 'Epidemic \uacc4\uc815\uc744 \ub2e4\uc2dc \uc5f0\uacb0\ud574 \uc8fc\uc138\uc694.', epidemic_account_changed: '\uacc4\uc815\uc774 \ubc14\ub00c\uc5c8\uc5b4\uc694. \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.',
    epidemic_subscription_required: 'Epidemic \uad6c\ub3c5\uc5d0\uc11c \uc774 \uace1\uc744 \ub2e4\uc6b4\ub85c\ub4dc\ud560 \uc218 \uc5c6\uc5b4\uc694.', epidemic_connection_canceled: '\uc5f0\uacb0\uc774 \ucde8\uc18c\ub410\uc5b4\uc694. \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.',
    epidemic_invalid_key: 'Epidemic MCP \ud0a4\uac00 \uc720\ud6a8\ud558\uc9c0 \uc54a\uac70\ub098 \ub9cc\ub8cc\ub410\uc5b4\uc694. \uc5f0\uacb0 \ud574\uc81c \ud6c4 \uc0c8 \ud0a4\ub97c \uc785\ub825\ud574 \uc8fc\uc138\uc694.',
    epidemic_retry_later: '\uc77c\uc2dc\uc801\uc73c\ub85c \ub2e4\uc6b4\ub85c\ub4dc\ud560 \uc218 \uc5c6\uc5b4\uc694. \ub098\uc911\uc5d0 \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.',
    epidemic_secure_storage_unavailable: '\uc774 \ucef4\ud4e8\ud130\uc5d0\uc11c \uc548\uc804\ud55c \uacc4\uc815 \uc800\uc7a5\uc18c\ub97c \uc0ac\uc6a9\ud560 \uc218 \uc5c6\uc5b4\uc694.',
    epidemic_import_uncertain: '\ub2e4\uc2dc \uac00\uc838\uc624\uae30 \uc804\uc5d0 \ud504\ub85c\uc81d\ud2b8 \ud30c\uc77c\uc744 \ud655\uc778\ud574 \uc8fc\uc138\uc694.',
  },
};
const ERROR_CODES = Object.keys(COPY.en).filter(key => key.startsWith('epidemic_'));
const BROWSE_QUERY = 'background music';

// @operation-start
export function musicWaveform(value) {
  if (value?.version !== 2 || value.channels !== 1 || value.bits !== 8 ||
    !Array.isArray(value.data) || !value.data.length || value.data.length > 200_000 ||
    !value.data.every(sample => Number.isInteger(sample) && sample >= -128 && sample <= 127)) return [];
  const count = Math.min(64, value.data.length);
  return Array.from({ length: count }, (_, index) =>
    value.data.slice(Math.floor(index * value.data.length / count), Math.floor((index + 1) * value.data.length / count))
      .reduce((peak, sample) => Math.max(peak, Math.abs(sample)), 0) / 128);
}
export function startMusicPreview(media, url, onError) {
  let stopped = false;
  media.src = url;
  media.play().catch(error => {
    if (!stopped && error.name !== 'NotAllowedError' && error.name !== 'AbortError') onError();
  });
  return () => {
    stopped = true;
    media.pause();
    media.removeAttribute('src');
    media.load();
  };
}
export function importMusicScript(projectId, file) {
  const directory = file.slice(0, Math.max(file.lastIndexOf('/'), file.lastIndexOf('\\')) + 1);
  return `
    const p = selects.project(${JSON.stringify(projectId)});
    const flatten = rows => rows.flatMap(row => row.type === 'dir' ? flatten(row.children) : [row]);
    const overview = await p.sourceFiles();
    const pages = 'fileTree' in overview ? [overview] : await Promise.all(overview.folders.map(folder => p.sourceFiles({ folder: folder.name })));
    const files = pages.flatMap(page => {
      if (!('fileTree' in page)) throw new Error('epidemic_import_uncertain');
      return flatten(page.fileTree);
    });
    const existing = files.find(row => row.path === ${JSON.stringify(file)});
    const id = existing?.resourceId || (await p.importFiles({ paths: [${JSON.stringify(file)}] })).addedResourceIds[0];
    if (!id) throw new Error('epidemic_import_uncertain');
    const source = (await p.resources()).find(row => row.resourceId === id);
    if (!Number.isFinite(source?.durationSeconds) || source.durationSeconds <= 0) throw new Error('epidemic_import_uncertain');
    return { resourceId: id, durationSeconds: source.durationSeconds,
      musicResourceIds: files.filter(row => row.path?.startsWith(${JSON.stringify(directory)})).map(row => row.resourceId).concat(id) };
  `;
}
export function addMusicScript(projectId, sequenceId, resourceId, seconds, musicResourceIds) {
  return `
    const p = selects.project(${JSON.stringify(projectId)});
    const d = selects.draft(${JSON.stringify(sequenceId)});
    const clips = await d.clips({ trackScope: 'all' });
    const id = ${JSON.stringify(resourceId)};
    if (clips.some(clip => clip.resourceId === id)) return { resourceId: id, inserted: 0 };
    const music = clips.filter(clip => ${JSON.stringify(musicResourceIds)}.includes(clip.resourceId));
    const start = music.reduce((value, clip) => Math.max(value, clip.endFrame), 0);
    const resources = await p.resources();
    const picture = clips.filter(clip => clip.trackKind === 'main' && resources.some(resource => resource.resourceId === clip.resourceId && resource.type !== 'Audio'));
    const end = picture.reduce((value, clip) => Math.max(value, clip.endFrame), 0);
    const meta = await d.meta();
    const songFrames = Math.floor(${JSON.stringify(seconds)} * meta.fps);
    const duration = start === 0 && end > 0 ? Math.min(end, songFrames) : songFrames;
    if (duration <= 0) throw new Error('failed');
    let held;
    if (meta.durationFrames === 0) await d.insertGap({ seconds: duration / meta.fps });
    else if (meta.durationFrames < duration) {
      const anchor = clips.find(clip => clip.trackKind === 'audio' || clip.trackKind === 'video');
      if (anchor) {
        // Extend only the working copy; restore the held clip before committing.
        held = { ...(await d.moveOverlayClip({ clip: anchor, startFrame: meta.durationFrames + duration })), start: anchor.startFrame };
      } else {
        const mainEnd = clips.filter(clip => clip.trackKind === 'main').reduce((end, clip) => Math.max(end, clip.endFrame), 0);
        await d.insertGap({ at: mainEnd > 0 ? { after: await d.rangeAtFrames(0, mainEnd) } : undefined, seconds: (duration - mainEnd) / meta.fps });
      }
    }
    const placed = await d.overlayResource({ resource: p.resource(id), over: await d.rangeAtFrames(0, duration) });
    if (!placed.inserted) throw new Error('epidemic_import_uncertain');
    if (start > 0) await d.moveOverlayClip({ clip: (await d.clips({ trackScope: 'all' })).find(clip => clip.resourceId === id && clip.trackKind === 'audio'), startFrame: start });
    if (held) await d.moveOverlayClip({ clip: (await d.clips({ trackScope: 'all' })).find(clip => clip.clipId === held.clipId), startFrame: held.start });
    await d.commitAll('Add music');
    return { resourceId: id, inserted: placed.inserted };
  `;
}
// @operation-end

const STYLES = `
  .music-panel { height: calc(100dvh - var(--panel-gap)); margin: auto; display: flex; flex-direction: column; gap: 12px; min-width: 0; }
  .music-header, .music-player-heading { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .music-header { min-height: 44px; flex-shrink: 0; }
  .music-provider { flex: 1; min-width: 0; font-weight: 600; }
  .music-status { color: var(--panel-muted-fg); display: flex; align-items: center; gap: 4px; font-size: 11px; white-space: nowrap; }
  .music-connect { padding: 20px 0; display: flex; flex-direction: column; gap: 12px; }
  .music-connect h3 { color: var(--panel-fg); font-size: 16px; line-height: 1.35; }
  .music-connect p { margin: 0; }
  .music-settings { display: flex; flex-direction: column; gap: 8px; padding-bottom: 12px; border-bottom: 1px solid var(--panel-border); }
  .music-search { display: flex; align-items: end; gap: 8px; }
  .music-search > :first-child { flex: 1; min-width: 0; }
  .music-body { flex: 1; min-height: 0; overflow-y: auto; padding: 4px; margin: 0 -4px; }
  .music-results-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 4px 0 8px; color: var(--panel-muted-fg); }
  .music-drag-hint { display: block; margin-bottom: 12px; }
  .music-track { min-width: 0; padding-bottom: 12px; }
  .music-track-info { display: flex; align-items: center; gap: 4px; padding-top: 4px; }
  .music-track-info .music-meta { flex-wrap: wrap; gap: 4px; margin-top: 0; }
  .music-track-copy { min-width: 0; flex: 1; }
  .music-cover { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .music-cover-wrap { position: relative; display: grid; }
  .music-cover-loading { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none; border-radius: 2px; background: color-mix(in srgb, var(--background) 45%, transparent); }
  .music-cover-loading svg { animation: music-spin 1s linear infinite; }
  @keyframes music-spin { to { transform: rotate(360deg); } }
  .music-cover-empty { position: absolute; inset: 0; display: grid; place-items: center; background: var(--panel-muted); color: var(--panel-muted-fg); }
  .music-tile-mark { position: absolute; inset: 0; display: grid; place-items: center; opacity: 0; }
  .music-track:hover .music-tile-mark, .music-track:focus-within .music-tile-mark, .music-track[data-active=true] .music-tile-mark { opacity: 1; }
  .music-play-mark { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; background: var(--background); color: var(--panel-fg); }
  .music-cover-thumb { width: 44px; height: 44px; position: relative; flex-shrink: 0; overflow: hidden; border-radius: 2px; }
  .music-card-title { margin-top: 8px; font-weight: 500; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .music-title { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  .music-meta { display: flex; gap: 8px; align-items: center; margin-top: 3px; color: var(--panel-muted-fg); font-size: 11px; font-variant-numeric: tabular-nums; }
  .music-artist { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .music-length { white-space: nowrap; }
  .music-empty { padding: 24px 0; }
  .music-empty h3 { color: var(--panel-fg); font-size: 14px; }
  .music-empty p { margin-top: 4px; }
  .music-player { border-top: 1px solid var(--panel-border); padding-top: 12px; padding-bottom: 4px; flex-shrink: 0; }
  .music-player-info { flex: 1; min-width: 0; }
  .music-waveform { display: block; width: 100%; height: 32px; margin-top: 12px; }
  .music-seek { display: flex; align-items: center; gap: 8px; margin: 8px 0; font-variant-numeric: tabular-nums; }
  .music-seek input { flex: 1; min-width: 0; }
  .music-player-actions { display: flex; justify-content: flex-end; }
  @media (max-width: 240px) { .music-bpm, .music-status span { display: none; } }
`;
function MusicCover({ url, ui }) {
  const [failed, setFailed] = React.useState(null);
  return url && failed !== url
    ? <img className="music-cover" src={url} alt="" loading="lazy" draggable={false} onError={() => setFailed(url)} />
    : <span className="music-cover-empty"><ui.Icon name="audio" /></span>;
}
function clock(seconds) {
  return Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0');
}

function MusicPreview({ row, media, playing, onPlaying, onClose, onAdd, busy, adding, added, T, ui, onError }) {
  const fail = React.useRef(onError);
  fail.current = onError;
  const [time, setTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [waveform, setWaveform] = React.useState([]);
  React.useEffect(() => {
    const controller = new AbortController();
    setWaveform([]);
    if (row.waveformUrl) fetch(row.waveformUrl, { signal: controller.signal })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(value => { if (!controller.signal.aborted) setWaveform(musicWaveform(value)); })
      .catch(() => {});
    return () => controller.abort();
  }, [row.waveformUrl]);
  React.useEffect(() => {
    setTime(0); setDuration(0);
    return startMusicPreview(media.current, row.previewUrl, () => fail.current());
  }, [row.previewUrl]);
  return <div className="music-player">
    <audio ref={media} preload="metadata" onPlay={() => onPlaying(true)} onPause={() => onPlaying(false)}
      onTimeUpdate={event => setTime(event.currentTarget.currentTime)}
      onDurationChange={event => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
      onError={() => fail.current()} />
    <div className="music-player-heading">
      <div className="music-cover-thumb"><MusicCover url={row.coverArtUrl} ui={ui} /></div>
      <ui.IconButton icon={playing ? 'pause' : 'play'} label={playing ? T.pause : T.preview} onClick={() => {
        if (media.current.paused) media.current.play().catch(() => fail.current());
        else media.current.pause();
      }} />
      <div className="music-player-info"><div className="music-title" title={row.title}>{row.title}</div><div className="music-meta"><span className="music-artist">{row.mainArtists.join(', ')}</span></div></div>
      <ui.IconButton icon="close" label={T.close} onClick={onClose} />
    </div>
    {waveform.length > 0 && <svg className="music-waveform" viewBox={'0 0 ' + waveform.length * 4 + ' 40'} preserveAspectRatio="none" aria-hidden="true">{waveform.map((peak, index) => {
      const height = Math.max(2, peak * 40);
      return <rect key={index} x={index * 4} y={(40 - height) / 2} width={2} height={height} rx={1}
        fill={index / waveform.length <= time / (duration || 1) ? 'var(--panel-key)' : 'var(--panel-muted-fg)'} />;
    })}</svg>}
    <div className="music-seek"><small>{clock(time)}</small>
      <input type="range" aria-label={T.position} min={0} max={duration || 1} step={0.1} value={time} disabled={!duration}
        onChange={event => { media.current.currentTime = Number(event.target.value); setTime(Number(event.target.value)); }} />
      <small>{clock(duration)}</small>
    </div>
    <div className="music-player-actions"><ui.Button variant="primary" icon={added ? 'check' : 'plus'} busy={adding} busyLabel={T.adding} disabled={busy || added} onClick={onAdd}>{added ? T.added : T.add}</ui.Button></div>
  </div>;
}

export default function Panel({ sdk, context, ui }) {
  const T = { ...COPY.en, ...(COPY[context.language] || {}) };
  const key = JSON.stringify([context.projectId, context.sequenceId]);
  const scope = React.useRef({ key, mounted: true });
  if (scope.current.key !== key) scope.current = { key, mounted: true };
  const [connection, setConnection] = React.useState(null);
  const [term, setTerm] = React.useState('');
  const [rows, setRows] = React.useState([]);
  const [cursor, setCursor] = React.useState(null);
  const [pending, setPending] = React.useState(null);
  const [message, setMessage] = React.useState('');
  const [failed, setFailed] = React.useState(false);
  const [audio, setAudio] = React.useState(null);
  const [playing, setPlaying] = React.useState(false);
  const [manage, setManage] = React.useState(false);
  const [searchedTerm, setSearchedTerm] = React.useState('');
  const [added, setAdded] = React.useState([]);
  const [dragAdding, setDragAdding] = React.useState(null);
  const busy = pending !== null || dragAdding !== null;
  const adding = pending?.kind === 'add' ? pending.trackId : dragAdding;
  const media = React.useRef(null);
  const lock = React.useRef(false);
  const account = React.useRef(null);
  function check(captured) {
    if (!captured.mounted || scope.current !== captured) throw new Error('epidemic_account_changed');
  }
  async function script(text, write, captured = scope.current) {
    const result = await sdk.runScript({ summary: 'Music', script: text, allowCommit: write });
    check(captured);
    if (result.isError || result.result == null) {
      const output = String(result.output);
      if (/Property '(epidemic|mcp)' does not exist/.test(output)) throw new Error('epidemic_update_required');
      throw new Error(ERROR_CODES.find(code => output.includes(code)) || 'failed');
    }
    return result.result;
  }
  async function status(captured = scope.current) {
    const next = await script('return await selects.epidemic.mcp.status();', false, captured);
    if (!next.connected || (account.current && account.current !== next.accountSession)) {
      setRows([]); setAudio(null); setPlaying(false); setCursor(null); setSearchedTerm(''); setAdded([]); setDragAdding(null); setMessage('');
    }
    account.current = next.accountSession;
    setConnection(next);
    return next;
  }
  React.useEffect(() => {
    const captured = scope.current;
    captured.mounted = true;
    setAudio(null); setPlaying(false); setPending(null); setAdded([]); setDragAdding(null); lock.current = false; setMessage('');
    status(captured).catch(error => { if (scope.current === captured && captured.mounted) { setFailed(true); setMessage(T[error.message] || T.failed); } });
    const timer = setInterval(() => {
      if (!lock.current) status(captured).catch(() => {});
    }, 10_000);
    return () => { captured.mounted = false; clearInterval(timer); };
  }, [key]);
  React.useEffect(() => {
    if (!sdk.on) return;
    try {
      return sdk.on('musicImportChanged', event => {
        if (event.projectId !== context.projectId || event.sequenceId !== (context.sequenceId ?? null) || event.accountSession !== account.current) return;
        setDragAdding(previous => event.loading ? event.trackId : previous === event.trackId ? null : previous);
      });
    } catch {
      // shortcut: older runtimes retain the drop toast, remove when this event is universal.
    }
  }, [sdk, key]);
  async function action(callback, kind = 'preview', trackId = null) {
    if (lock.current) return;
    const captured = scope.current;
    lock.current = true; setPending({ kind, trackId }); setMessage(''); setFailed(false);
    try { await callback(captured); }
    catch (error) { if (scope.current === captured && captured.mounted) {
      if (['epidemic_sign_in_required', 'epidemic_account_changed', 'epidemic_reconnect_required'].includes(error.message)) { setConnection(null); setRows([]); setAudio(null); setCursor(null); }
      setFailed(true); setMessage(T[error.message] || T.failed);
    } }
    finally { if (scope.current === captured && captured.mounted) { lock.current = false; setPending(null); } }
  }
  async function load(after, captured, query = term) {
    const previousAccount = account.current;
    const identity = await status(captured);
    if (after && identity.accountSession !== previousAccount) throw new Error('epidemic_account_changed');
    if (!identity.connected) throw new Error('epidemic_reconnect_required');
    const result = await script(`return await selects.epidemic.mcp.search(${JSON.stringify(query)}, ${JSON.stringify(after || undefined)});`, false, captured);
    setRows(previous => after ? [...previous, ...result.tracks] : result.tracks);
    setCursor(result.cursor);
    setSearchedTerm(query);
  }
  React.useEffect(() => {
    if (connection?.connected && !busy && !rows.length && !searchedTerm && !message) {
      action(captured => load(null, captured, BROWSE_QUERY), 'browse');
    }
  }, [connection?.connected, connection?.accountSession, busy, rows.length, searchedTerm, message, key]);
  function preview(row) {
    if (audio?.id === row.id && media.current) {
      if (media.current.paused) media.current.play().catch(() => { setFailed(true); setMessage(T.previewFailed); });
      else media.current.pause();
      return;
    }
    action(async captured => {
      const previousAccount = account.current;
      const identity = await status(captured);
      if (!identity.connected || identity.accountSession !== previousAccount) throw new Error('epidemic_account_changed');
      setPlaying(false); setAudio(row);
    }, 'preview', row.id);
  }
  function add(row) {
    action(async captured => {
      const previousAccount = account.current;
      const identity = await status(captured);
      if (!identity.connected || identity.accountSession !== previousAccount) throw new Error('epidemic_account_changed');
      const saved = await script(`return await selects.epidemic.mcp.download(${JSON.stringify(row.id)});`, true, captured);
      if (saved.accountSession !== account.current) throw new Error('epidemic_account_changed');
      try {
        const imported = await script(importMusicScript(context.projectId, saved.path), true, captured);
        await script(addMusicScript(context.projectId, context.sequenceId, imported.resourceId, imported.durationSeconds, imported.musicResourceIds), true, captured);
      }
      catch (error) { if (error.message === 'failed') throw new Error('epidemic_import_uncertain'); throw error; }
      setAdded(previous => previous.includes(row.id) ? previous : previous.concat(row.id));
    }, 'add', row.id);
  }
  function search(query = term) {
    if (!query.trim()) return;
    setTerm(query);
    action(captured => load(null, captured, query), 'search');
  }
  return <div className="music-panel">
    <style>{STYLES}</style>
    <div className="music-header">
      <ui.Icon name="audio" /><span className="music-provider">Epidemic Sound</span>
      {connection?.connected && <><span className="music-status" title={T.connected}><ui.Icon name="check" size={12} /><span>{T.ready}</span></span><ui.IconButton icon={manage ? 'close' : 'settings'} label={T.manage} disabled={busy} onClick={() => setManage(value => !value)} /></>}
    </div>
    {manage && connection?.connected && <div className="music-settings"><ui.Row><small style={{ flex: 1 }}>{T.connected}</small><ui.Button variant="ghost" disabled={busy} onClick={() => action(async captured => {
      await script('return await selects.epidemic.mcp.disconnect();', true, captured);
      setRows([]); setAudio(null); setCursor(null); setManage(false); await status(captured);
    }, 'disconnect')}>{T.disconnect}</ui.Button></ui.Row></div>}
    {!connection && !message && <ui.Progress label={T.loading} />}
    {connection && !connection.connected && <div className="music-connect">
      <h3>{T.connectTitle}</h3><p>{T.connectHint}</p>
      <ui.Actions><ui.Button variant="primary" busy={pending?.kind === 'connect'} busyLabel={T.connecting} disabled={busy} onClick={() => action(async captured => { await script('return await selects.epidemic.mcp.connect();', true, captured); await status(captured); }, 'connect')}>{T.connect}</ui.Button></ui.Actions>
    </div>}
    {connection?.connected && <>
      <div className="music-search" onKeyDown={event => {
        if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.target.tagName === 'INPUT') { event.preventDefault(); search(); }
      }}>
        {ui.version >= 2 && ui.SearchInput ? <ui.SearchInput label={T.query} placeholder={T.placeholder} value={term}
          disabled={busy} busy={pending?.kind === 'search'} clearLabel={T.clear} searchLabel={pending?.kind === 'search' ? T.searching : T.search}
          onChange={setTerm} onSearch={() => search()} /> : <>
          <ui.TextField label={T.query} placeholder={T.placeholder} value={term} disabled={busy} onChange={setTerm} />
          <ui.IconButton icon={pending?.kind === 'search' ? 'loading' : 'search'} label={pending?.kind === 'search' ? T.searching : T.search} disabled={busy || !term.trim()} onClick={() => search()} />
        </>}
      </div>
      {!context.sequenceId && <ui.Message>{T.draft}</ui.Message>}
      <div className="music-body">
        {rows.length > 0 && <div className="music-results-heading"><span className="music-title">{searchedTerm === BROWSE_QUERY ? T.browse : searchedTerm}</span><small className="music-length">{rows.length} {T.shown}</small></div>}
        {rows.length > 0 && ui.version >= 3 && context.projectId && <small className="music-drag-hint">{T.drag}</small>}
        {!rows.length && !busy && !message && <div className="music-empty"><h3>{searchedTerm ? T.empty : T.browse}</h3><p>{searchedTerm ? T.emptyHint : T.hints}</p></div>}
        {busy && !rows.length && <ui.Progress label={T.loading} />}
        <ui.Grid minItemWidth={80}>{rows.map(row => <div key={row.id} className="music-track" data-active={audio?.id === row.id}>
          <div className="music-cover-wrap" aria-busy={adding === row.id || undefined}>
          {ui.version >= 2 && ui.MediaTile ? <ui.MediaTile label={(adding === row.id ? T.adding : audio?.id === row.id && playing ? T.pause : T.preview) + ': ' + row.title}
            selected={audio?.id === row.id} disabled={busy} onClick={() => preview(row)}
            dragData={ui.version >= 3 && context.projectId && account.current ? {
              type: 'application/x-selects-epidemic-music',
              data: JSON.stringify({ trackId: row.id, accountSession: account.current }),
            } : undefined}>
            <MusicCover url={row.coverArtUrl} ui={ui} />
            {adding !== row.id && <span className="music-tile-mark"><span className="music-play-mark"><ui.Icon name={pending?.kind === 'preview' && pending.trackId === row.id ? 'loading' : audio?.id === row.id && playing ? 'pause' : 'play'} /></span></span>}
          </ui.MediaTile> : <ui.IconButton icon={audio?.id === row.id && playing ? 'pause' : 'play'} label={T.preview + ': ' + row.title} disabled={busy} onClick={() => preview(row)} />}
          {adding === row.id && <span className="music-cover-loading" role="status" aria-label={T.adding + ': ' + row.title}><span className="music-play-mark"><ui.Icon name="loading" /></span></span>}
          </div>
          <div className="music-card-title" title={row.title}>{row.title}</div>
          <div className="music-meta"><span className="music-artist" title={row.mainArtists.join(', ')}>{row.mainArtists.join(', ')}</span></div>
          <div className="music-track-info">
            <div className="music-track-copy music-meta"><span className="music-length">{clock(row.length)}</span>{row.bpm > 0 && <span className="music-bpm music-length">{row.bpm} BPM</span>}
            </div>
            <ui.IconButton icon={adding === row.id ? 'loading' : added.includes(row.id) ? 'check' : 'plus'} label={(adding === row.id ? T.adding : added.includes(row.id) ? T.added : T.add) + ': ' + row.title} disabled={busy || !context.projectId || !context.sequenceId} onClick={() => add(row)} />
          </div>
        </div>)}</ui.Grid>
        {cursor && <ui.Actions><ui.Button variant="ghost" busy={pending?.kind === 'more'} busyLabel={T.loading} disabled={busy} onClick={() => action(captured => load(cursor, captured, searchedTerm), 'more')}>{T.more}</ui.Button></ui.Actions>}
      </div>
    </>}
    {message && <ui.Message tone={failed ? 'error' : 'success'}>{message}</ui.Message>}
    {audio && <MusicPreview row={audio} media={media} playing={playing} onPlaying={setPlaying} onClose={() => { setAudio(null); setPlaying(false); }}
      onAdd={() => add(audio)} busy={busy || !context.projectId || !context.sequenceId} adding={adding === audio.id} added={added.includes(audio.id)} T={T} ui={ui}
      onError={() => { setFailed(true); setMessage(T.previewFailed); }} />}
  </div>;
}
