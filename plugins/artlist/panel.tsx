// @name Artlist
// @name:en Artlist
// @name:ko Artlist
// @icon audio
// Connect a personal Artlist account and add editable Audio clips.
import React from 'react';

const COPY = {
  en: {
    disconnect: 'Disconnect', account: 'Account', play: 'Play',
    placeholder: 'Track, artist or mood', browse: 'Browse music',
    hints: 'Search by track, artist or mood.', connecting: 'Connecting…',
    searching: 'Searching…', previewFailed: 'Could not play this track. Try another track.', emptyHint: 'Try another track, artist or mood.',
    pause: 'Pause', position: 'Playback position', adding: 'Downloading and adding music…',
    search: 'Search', clear: 'Clear search', query: 'Music search', more: 'Load more', empty: 'No tracks found.',
    preview: 'Preview', add: 'Add to Draft', addAgain: 'Add again', added: 'Added to Draft', draft: 'Open a Draft to add music.', loading: 'Loading music\u2026', failed: 'Could not load music. Try again.',
    artlist_import_uncertain: 'Check project files before trying the import again.',
    kindLabel: 'Type', openTrack: 'Open in Artlist', connect: 'Connect Artlist', connected: 'Artlist connected', connectHint: 'Sign in on Artlist, then open your profile menu to finish connecting.', connectHintAuto: 'Sign in on Artlist to finish connecting.',
    cancelLibrary: 'Cancel', closeLibrary: 'Close save controls', savingLibrary: 'Saving…', creatingBoard: 'Creating…', boardSaved: 'Saved to Artboard.',
    previousPage: 'Previous', nextPage: 'Next', pageLabel: 'Page', moreBoards: 'More Artboards', saveManage: 'Save', favoriteLabel: 'Favorite', unfavoriteLabel: 'Unfavorite', addToBoard: 'Add to Artboard', removeFromBoard: 'Remove from this Artboard', newBoard: 'New Artboard', newBoardMenu: 'New Artboard…', boardName: 'Artboard name', createBoard: 'Create', artlist_library_edit_uncertain: 'The change could not be verified. Refresh your library before trying again.', artlist_ambiguous_artboard: 'Artboards have identical names. Rename them in Artlist before selecting one.', artlist_artboard_unavailable: 'This Artboard is no longer available. Refresh your library.',
    library: 'Browse', favorites: 'Favorites', downloads: 'Downloads', artboards: 'Artboards', catalog: 'Search', refreshLibrary: 'Refresh', chooseArtboard: 'Choose an Artboard', emptyLibrary: 'No saved tracks here yet', emptyLibraryHint: 'Save tracks in Artlist, then refresh this list.', emptyBoards: 'No Artboards yet', libraryLimit: 'Showing the first 50 tracks.', artlist_library_unavailable: 'Could not load your Artlist library. Try again.', cancelDownloadLabel: 'Cancel download', refresh: 'Refresh account and plan', license: 'View license', licenseHint: 'Your Artlist plan determines how downloaded music can be used.',
    append: 'Add at end', appended: 'Added at end',
    music: 'Music', sfx: 'Sound effects', cancel: 'Cancel login',
    downloadHint: 'Free accounts can preview music. A music subscription is required to add originals.',
    artlist_subscription_required: 'Your Artlist music subscription is required for original downloads.',
    artlist_download_failed: 'Could not download this track. Try again.',
    artlist_download_too_large: 'This file exceeds the 128 MB download limit.',
    artlist_download_timeout: 'The download timed out. Check your connection and try again.',
    artlist_download_canceled: 'Download canceled.',
    artlist_track_unavailable: 'Search again to reload this track.',
    artlist_preview_unavailable: 'Could not play this Artlist preview. Try again.',
    artlist_update_required: 'Update Selects to connect Artlist.', artlist_sign_in_required: 'Sign in to Selects first.',
    artlist_reconnect_required: 'Reconnect your Artlist account.', artlist_account_changed: 'Your account changed. Try again.',
    artlist_setup_required: 'Artlist connection is not available in this build yet.',
    artlist_connection_failed: 'Could not connect to Artlist. Try again.',
    artlist_connection_canceled: 'Artlist login was canceled.', artlist_request_failed: 'Could not complete the Artlist request. Try again.',
    artlist_catalog_unavailable: 'Artlist catalog search is unavailable for this connection.',
    artlist_secure_storage_unavailable: 'Secure account storage is unavailable on this computer.',
    artlist_storage_failed: 'Could not save your Artlist connection.', artlist_invalid_url: 'This Artlist link is invalid.',
  },
  ko: {
    disconnect: '\uc5f0\uacb0 \ud574\uc81c', account: '\uacc4\uc815', play: '\uc7ac\uc0dd',
    placeholder: '\uace1, \uc544\ud2f0\uc2a4\ud2b8, \ubd84\uc704\uae30\ub85c \uac80\uc0c9', browse: '\uc74c\uc545 \ub458\ub7ec\ubcf4\uae30',
    hints: '\uace1, \uc544\ud2f0\uc2a4\ud2b8, \ubd84\uc704\uae30\ub85c \uc6d0\ud558\ub294 \uc74c\uc545\uc744 \ucc3e\uc544\ubcf4\uc138\uc694.', connecting: '\uc5f0\uacb0 \uc911…',
    searching: '\uac80\uc0c9 \uc911…', previewFailed: '\uc774 \uace1\uc744 \uc7ac\uc0dd\ud558\uc9c0 \ubabb\ud588\uc5b4\uc694. \ub2e4\ub978 \uace1\uc744 \uc120\ud0dd\ud574 \uc8fc\uc138\uc694.', emptyHint: '\ub2e4\ub978 \uace1, \uc544\ud2f0\uc2a4\ud2b8 \ub610\ub294 \ubd84\uc704\uae30\ub85c \uac80\uc0c9\ud574 \ubcf4\uc138\uc694.',
    pause: '\uc77c\uc2dc \uc815\uc9c0', position: '\uc7ac\uc0dd \uc704\uce58', adding: '\uc74c\uc545\uc744 \ub2e4\uc6b4\ub85c\ub4dc\ud558\uace0 \ucd94\uac00\ud558\ub294 \uc911…',
    search: '\uac80\uc0c9', clear: '\uac80\uc0c9\uc5b4 \uc9c0\uc6b0\uae30', query: '\uc74c\uc545 \uac80\uc0c9', more: '\ub354 \ubcf4\uae30', empty: '\uac80\uc0c9\ub41c \uace1\uc774 \uc5c6\uc5b4\uc694.',
    preview: '\ubbf8\ub9ac\ub4e3\uae30', add: 'Draft\uc5d0 \ucd94\uac00', addAgain: '\ub2e4\uc2dc \ucd94\uac00', added: 'Draft\uc5d0 \ucd94\uac00\ub428', draft: '\uc74c\uc545\uc744 \ucd94\uac00\ud558\ub824\uba74 Draft\ub97c \uc5f4\uc5b4 \uc8fc\uc138\uc694.', loading: '\uc74c\uc545 \ubd88\ub7ec\uc624\ub294 \uc911\u2026', failed: '\uc74c\uc545\uc744 \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc5b4\uc694. \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.',
    artlist_import_uncertain: '\ub2e4\uc2dc \uac00\uc838\uc624\uae30 \uc804\uc5d0 \ud504\ub85c\uc81d\ud2b8 \ud30c\uc77c\uc744 \ud655\uc778\ud574 \uc8fc\uc138\uc694.',
    kindLabel: '\uc885\ub958', openTrack: 'Artlist\uc5d0\uc11c \uc5f4\uae30', connect: 'Artlist \uc5f0\uacb0', connected: 'Artlist \uc5f0\uacb0\ub428', connectHint: 'Artlist\uc5d0\uc11c \ub85c\uadf8\uc778\ud55c \ub4a4 \uc624\ub978\ucabd \ud504\ub85c\ud544 \uba54\ub274\ub97c \uc5f4\uc5b4 \uc5f0\uacb0\uc744 \uc644\ub8cc\ud558\uc138\uc694.', connectHintAuto: 'Artlist\uc5d0 \ub85c\uadf8\uc778\ud558\uba74 \uc5f0\uacb0\uc774 \uc644\ub8cc\ub3fc\uc694.',
    cancelLibrary: '\ucde8\uc18c', closeLibrary: '\uc800\uc7a5 \uad00\ub9ac \ub2eb\uae30', savingLibrary: '\uc800\uc7a5 \uc911…', creatingBoard: '\ub9cc\ub4dc\ub294 \uc911…', boardSaved: '\ubcf4\uad00\ud568\uc5d0 \uc800\uc7a5\ud588\uc5b4\uc694.',
    previousPage: '\uc774\uc804', nextPage: '\ub2e4\uc74c', pageLabel: '\ud398\uc774\uc9c0', moreBoards: '\ubcf4\uad00\ud568 \ub354 \ubcf4\uae30', saveManage: '\uc800\uc7a5 \uad00\ub9ac', favoriteLabel: '\ucc1c\ud558\uae30', unfavoriteLabel: '\ucc1c \ud574\uc81c', addToBoard: '\ubcf4\uad00\ud568\uc5d0 \ub123\uae30', removeFromBoard: '\uc774 \ubcf4\uad00\ud568\uc5d0\uc11c \ube7c\uae30', newBoard: '\uc0c8 \ubcf4\uad00\ud568', newBoardMenu: '\uc0c8 \ubcf4\uad00\ud568…', boardName: '\ubcf4\uad00\ud568 \uc774\ub984', createBoard: '\ub9cc\ub4e4\uae30', artlist_library_edit_uncertain: '\ubcc0\uacbd \uacb0\uacfc\ub97c \ud655\uc778\ud558\uc9c0 \ubabb\ud588\uc5b4\uc694. \ubcf4\uad00\ud568\uc744 \uc0c8\ub85c\uace0\uce68\ud55c \ub4a4 \ud655\uc778\ud574 \uc8fc\uc138\uc694.', artlist_ambiguous_artboard: '\uc774\ub984\uc774 \uac19\uc740 \ubcf4\uad00\ud568\uc774 \uc788\uc5b4\uc694. Artlist\uc5d0\uc11c \uc774\ub984\uc744 \uad6c\ubd84\ud574 \uc8fc\uc138\uc694.', artlist_artboard_unavailable: '\uc774 \ubcf4\uad00\ud568\uc744 \ucc3e\uc9c0 \ubabb\ud588\uc5b4\uc694. \ubaa9\ub85d\uc744 \uc0c8\ub85c\uace0\uce68\ud574 \uc8fc\uc138\uc694.',
    library: '\ubaa9\ub85d', favorites: '\ucc1c', downloads: '\ub2e4\uc6b4\ub85c\ub4dc', artboards: '\ubcf4\uad00\ud568', catalog: '\uac80\uc0c9', refreshLibrary: '\uc0c8\ub85c\uace0\uce68', chooseArtboard: '\ubcf4\uad00\ud568 \uc120\ud0dd', emptyLibrary: '\uc544\uc9c1 \uc800\uc7a5\ub41c \uace1\uc774 \uc5c6\uc5b4\uc694', emptyLibraryHint: 'Artlist\uc5d0\uc11c \uace1\uc744 \uc800\uc7a5\ud55c \ub4a4 \uc0c8\ub85c\uace0\uce68\ud574 \uc8fc\uc138\uc694.', emptyBoards: '\uc544\uc9c1 \ubcf4\uad00\ud568\uc774 \uc5c6\uc5b4\uc694', libraryLimit: '\ucc98\uc74c 50\uace1\uc744 \ud45c\uc2dc\ud558\uace0 \uc788\uc5b4\uc694.', artlist_library_unavailable: 'Artlist \ubcf4\uad00\ud568\uc744 \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc5b4\uc694. \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.', cancelDownloadLabel: '\ub2e4\uc6b4\ub85c\ub4dc \ucde8\uc18c', refresh: '\uacc4\uc815·\uad6c\ub3c5 \uc0c8\ub85c\uace0\uce68', license: '\ub77c\uc774\uc120\uc2a4 \ubcf4\uae30', licenseHint: '\ub2e4\uc6b4\ub85c\ub4dc\ud55c \uc74c\uc545\uc758 \uc0ac\uc6a9 \ubc94\uc704\ub294 \ub0b4 Artlist \ud50c\ub79c\uc744 \ub530\ub985\ub2c8\ub2e4.',
    append: '\ub05d\uc5d0 \ucd94\uac00', appended: '\ub05d\uc5d0 \ucd94\uac00\ub428',
    music: '\uc74c\uc545', sfx: '\ud6a8\uacfc\uc74c', cancel: '\ub85c\uadf8\uc778 \ucde8\uc18c',
    downloadHint: 'Free \uacc4\uc815\uc740 \ubbf8\ub9ac\ub4e3\uae30\ub97c \ud560 \uc218 \uc788\uc5b4\uc694. \uc6d0\uace1\uc744 \ucd94\uac00\ud558\ub824\uba74 \uc74c\uc545 \uad6c\ub3c5\uc774 \ud544\uc694\ud574\uc694.',
    artlist_subscription_required: '\uc6d0\uace1\uc744 \ucd94\uac00\ud558\ub824\uba74 Artlist \uc74c\uc545 \uad6c\ub3c5\uc774 \ud544\uc694\ud574\uc694.',
    artlist_download_failed: '\uace1\uc744 \ub2e4\uc6b4\ub85c\ub4dc\ud558\uc9c0 \ubabb\ud588\uc5b4\uc694. \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.',
    artlist_download_too_large: '\uc774 \ud30c\uc77c\uc740 \ub2e4\uc6b4\ub85c\ub4dc \uc81c\ud55c\uc778 128MB\ub97c \ucd08\uacfc\ud574\uc694.',
    artlist_download_timeout: '\ub2e4\uc6b4\ub85c\ub4dc \uc2dc\uac04\uc774 \ucd08\uacfc\ub410\uc5b4\uc694. \uc5f0\uacb0\uc744 \ud655\uc778\ud558\uace0 \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.',
    artlist_download_canceled: '\ub2e4\uc6b4\ub85c\ub4dc\ub97c \ucde8\uc18c\ud588\uc5b4\uc694.',
    artlist_track_unavailable: '\ub2e4\uc2dc \uac80\uc0c9\ud574 \uace1\uc744 \ubd88\ub7ec\uc640 \uc8fc\uc138\uc694.',
    artlist_preview_unavailable: 'Artlist \ubbf8\ub9ac\ub4e3\uae30\ub97c \uc7ac\uc0dd\ud558\uc9c0 \ubabb\ud588\uc5b4\uc694. \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.',
    artlist_update_required: 'Artlist\ub97c \uc5f0\uacb0\ud558\ub824\uba74 Selects\ub97c \uc5c5\ub370\uc774\ud2b8\ud574 \uc8fc\uc138\uc694.', artlist_sign_in_required: 'Selects\uc5d0 \uba3c\uc800 \ub85c\uadf8\uc778\ud574 \uc8fc\uc138\uc694.',
    artlist_reconnect_required: 'Artlist \uacc4\uc815\uc744 \ub2e4\uc2dc \uc5f0\uacb0\ud574 \uc8fc\uc138\uc694.', artlist_account_changed: '\uacc4\uc815\uc774 \ubc14\ub00c\uc5c8\uc5b4\uc694. \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.',
    artlist_setup_required: '\uc774 \ubc84\uc804\uc5d0\uc11c\ub294 \uc544\uc9c1 Artlist\uc5d0 \uc5f0\uacb0\ud560 \uc218 \uc5c6\uc5b4\uc694.',
    artlist_connection_failed: 'Artlist\uc5d0 \uc5f0\uacb0\ud558\uc9c0 \ubabb\ud588\uc5b4\uc694. \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.',
    artlist_connection_canceled: 'Artlist \ub85c\uadf8\uc778\uc774 \ucde8\uc18c\ub410\uc5b4\uc694.', artlist_request_failed: 'Artlist \uc791\uc5c5\uc744 \uc644\ub8cc\ud558\uc9c0 \ubabb\ud588\uc5b4\uc694. \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.',
    artlist_catalog_unavailable: '\uc774 \uc5f0\uacb0\uc5d0\uc11c\ub294 Artlist \uc74c\uc545 \uac80\uc0c9\uc744 \uc0ac\uc6a9\ud560 \uc218 \uc5c6\uc5b4\uc694.',
    artlist_secure_storage_unavailable: '\uc774 \ucef4\ud4e8\ud130\uc5d0\uc11c \uc548\uc804\ud55c \uacc4\uc815 \uc800\uc7a5\uc18c\ub97c \uc0ac\uc6a9\ud560 \uc218 \uc5c6\uc5b4\uc694.',
    artlist_storage_failed: 'Artlist \uc5f0\uacb0\uc744 \uc800\uc7a5\ud558\uc9c0 \ubabb\ud588\uc5b4\uc694.', artlist_invalid_url: 'Artlist \ub9c1\ud06c\uac00 \uc62c\ubc14\ub974\uc9c0 \uc54a\uc544\uc694.',
  },
};
const ERROR_CODES = Object.keys(COPY.en).filter(key => key.startsWith('artlist_'));
const BROWSE_QUERY = 'background music';

// @operation-start
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
  const musicDirectory = directory.match(/^(.*[\\/]Music[\\/])(?:mcp|artlist|epidemic)[\\/]/i)?.[1] || directory;
  return `
    const p = selects.project(${JSON.stringify(projectId)});
    const flatten = rows => rows.flatMap(row => row.type === 'dir' ? flatten(row.children) : [row]);
    const overview = await p.sourceFiles();
    const pages = 'fileTree' in overview ? [overview] : await Promise.all(overview.folders.map(folder => p.sourceFiles({ folder: folder.name })));
    const files = pages.flatMap(page => {
      if (!('fileTree' in page)) throw new Error('artlist_import_uncertain');
      return flatten(page.fileTree);
    });
    const existing = files.find(row => row.path === ${JSON.stringify(file)});
    const id = existing?.resourceId || (await p.importFiles({ paths: [${JSON.stringify(file)}] })).addedResourceIds[0];
    if (!id) throw new Error('artlist_import_uncertain');
    const source = (await p.resources()).find(row => row.resourceId === id);
    if (!Number.isFinite(source?.durationSeconds) || source.durationSeconds <= 0) throw new Error('artlist_import_uncertain');
    return { resourceId: id, durationSeconds: source.durationSeconds,
      musicResourceIds: files.filter(row => row.path?.startsWith(${JSON.stringify(musicDirectory)})).map(row => row.resourceId).concat(id) };
  `;
}
export function addMusicScript(projectId, sequenceId, resourceId, seconds, musicResourceIds) {
  return `
    const p = selects.project(${JSON.stringify(projectId)});
    const d = selects.draft(${JSON.stringify(sequenceId)});
    const clips = await d.clips({ trackScope: 'all' });
    const id = ${JSON.stringify(resourceId)};
    const music = clips.filter(clip => ${JSON.stringify(musicResourceIds)}.includes(clip.resourceId));
    const start = music.reduce((value, clip) => Math.max(value, clip.endFrame), 0);
    const resources = await p.resources();
    const picture = clips.filter(clip => (clip.trackKind === 'main' || clip.trackKind === 'video') && resources.some(resource => resource.resourceId === clip.resourceId && resource.type !== 'Audio'));
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
    const existingClipIds = new Set((await d.clips({ trackScope: 'all' })).map(clip => clip.clipId));
    const placed = await d.overlayResource({ resource: p.resource(id), over: await d.rangeAtFrames(0, duration) });
    if (!placed.inserted) throw new Error('artlist_import_uncertain');
    if (start > 0) await d.moveOverlayClip({ clip: (await d.clips({ trackScope: 'all' })).find(clip => clip.resourceId === id && clip.trackKind === 'audio' && !existingClipIds.has(clip.clipId)), startFrame: start });
    if (held) await d.moveOverlayClip({ clip: (await d.clips({ trackScope: 'all' })).find(clip => clip.clipId === held.clipId), startFrame: held.start });
    await d.commitAll('Add music');
    return { resourceId: id, inserted: placed.inserted };
  `;
}
// @operation-end

const STYLES = `
  .music-panel { height: calc(100dvh - var(--panel-gap)); display: flex; flex-direction: column; gap: 8px; min-width: 0; }
  .music-connect { width: 100%; max-width: var(--panel-field-max); margin: 0 auto; padding-top: 12px; display: flex; flex-direction: column; gap: 12px; }
  .music-connect p { margin: 0; text-align: center; text-wrap: balance; }
  .music-tabs { display: flex; align-items: center; gap: 4px; min-width: 0; flex-shrink: 0; }
  .music-navigation { flex: 1; min-width: 0; border: 0; margin: 0; padding: 0; }
  /* Docked, four tabs don't fit: they keep their words and the strip scrolls, as the app's own panel tabs do. */
  .music-navigation [role=tablist] { justify-content: flex-start; overflow-x: auto; scrollbar-width: none; }
  .music-navigation [role=tablist]::-webkit-scrollbar { display: none; }
  .music-navigation [role=tab] { flex: 1 0 auto; padding: 0 8px; overflow: visible; }
  .music-account { display: flex; flex-direction: column; gap: 4px; padding-bottom: 8px; border-bottom: 1px solid var(--panel-border); flex-shrink: 0; }
  .music-account small { display: block; }
  .music-account small:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .music-controls { display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; min-width: 0; }
  .music-search { display: flex; align-items: end; gap: 8px; }
  .music-search > :first-child { flex: 1; min-width: 0; }
  .music-picker { display: flex; align-items: center; gap: 8px; }
  .music-picker > :first-child { flex: 1; min-width: 0; }
  .music-notes { display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; }
  .music-notes small { display: block; }
  .music-body { flex: 1; min-height: 0; overflow-y: auto; margin: 0 calc(-1 * var(--panel-pad-right)) 0 calc(-1 * var(--panel-pad-left)); padding: 0 var(--panel-pad-right) 16px var(--panel-pad-left); container-type: inline-size; }
  .music-heading { display: flex; align-items: center; gap: 8px; min-height: 24px; margin-bottom: 4px; }
  .music-heading-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; font-weight: 500; color: var(--panel-muted-fg); }
  .music-rows { list-style: none; margin: 0 -4px 0 -6px; padding: 0; display: flex; flex-direction: column; }
  .music-row { display: flex; align-items: center; gap: 4px; border-radius: 8px; transition: background-color .15s; }
  .music-row:hover, .music-row:focus-within { background: color-mix(in srgb, var(--panel-accent) 50%, transparent); }
  .music-row[data-active=true] { background: var(--panel-accent); }
  .music-row-open { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; padding: 6px 4px 6px 6px; cursor: pointer; }
  .music-cover-wrap { position: relative; flex-shrink: 0; width: 36px; height: 36px; margin-right: 4px; border-radius: 2px; overflow: hidden; }
  .music-cover-wrap > button { width: 36px; height: 36px; }
  .music-cover { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .music-cover-empty { position: absolute; inset: 0; display: grid; place-items: center; background: var(--panel-muted); color: var(--panel-muted-fg); }
  .music-play-mark { position: absolute; inset: 0; display: grid; place-items: center; color: var(--panel-fg); background: color-mix(in srgb, var(--panel-muted) 70%, transparent); opacity: 0; transition: opacity .15s; pointer-events: none; }
  .music-row:hover .music-play-mark, .music-row:focus-within .music-play-mark, .music-row[data-active=true] .music-play-mark, .music-play-mark[data-busy=true] { opacity: 1; }
  .music-play-mark svg { fill: currentColor; }
  .music-play-mark[data-busy=true] svg { fill: none; animation: music-spin 1s linear infinite; }
  @keyframes music-spin { to { transform: rotate(360deg); } }
  .music-row-text { flex: 1; min-width: 0; }
  .music-title, .music-artist { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .music-title { font-size: 13px; color: var(--panel-fg); }
  .music-artist { margin-top: 2px; font-size: 11px; color: var(--panel-muted-fg); }
  .music-row-meta { flex-shrink: 0; text-align: right; font-size: 11px; color: var(--panel-muted-fg); font-variant-numeric: tabular-nums; }
  .music-row-meta span { display: block; }
  .music-row-actions { flex-shrink: 0; display: flex; align-items: center; gap: 2px; padding-right: 2px; }
  .music-row-extra { display: none; }
  .music-row:hover .music-row-extra, .music-row:focus-within .music-row-extra, .music-row[data-active=true] .music-row-extra, .music-row[data-menu=true] .music-row-extra { display: flex; }
  .music-row:hover .music-row-meta, .music-row:focus-within .music-row-meta, .music-row[data-active=true] .music-row-meta, .music-row[data-menu=true] .music-row-meta { display: none; }
  .music-empty { padding: 40px 0; text-align: center; }
  .music-empty p { margin: 4px 0 0; }
  .music-pager { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 8px; }
  .music-editor { flex-shrink: 0; max-height: 36dvh; overflow-y: auto; border-top: 1px solid var(--panel-border); margin: 0 calc(-1 * var(--panel-pad-right)) 0 calc(-1 * var(--panel-pad-left)); padding: 8px var(--panel-pad-right) 0 var(--panel-pad-left); }
  .music-player { flex-shrink: 0; border-top: 1px solid var(--panel-border); margin: 0 calc(-1 * var(--panel-pad-right)) 0 calc(-1 * var(--panel-pad-left)); padding: 12px var(--panel-pad-right) 0 var(--panel-pad-left); }
  .music-seek { display: block; width: 100%; height: 16px; margin: 0; padding: 0; border: 0; background: none; accent-color: var(--panel-key); }
  .music-player-line { display: flex; align-items: baseline; gap: 8px; margin-top: 8px; font-size: 12px; }
  .music-player-time { flex-shrink: 0; color: var(--panel-muted-fg); font-variant-numeric: tabular-nums; }
  .music-player-title { flex: 1; min-width: 0; margin: 0; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--panel-fg); }
  .music-player-title span { color: var(--panel-muted-fg); }
  .music-player-title b { font-weight: 500; }
  .music-transport { display: flex; align-items: center; justify-content: space-between; margin-top: 4px; }
  .music-transport-spacer { width: 28px; height: 28px; flex-shrink: 0; }
  .music-transport .lucide-play, .music-transport .lucide-pause { fill: currentColor; }
  @container (max-width: 259px) { .music-bpm { display: none; } }
  @container (max-width: 199px) { .music-row-meta { display: none !important; } }
  @media (prefers-reduced-motion: reduce) { .music-play-mark[data-busy=true] svg { animation: none; } }
`;
function MusicCover({ url, ui }) {
  const [failed, setFailed] = React.useState(null);
  return url && failed !== url
    ? <img className="music-cover" src={url} alt="" loading="lazy" draggable={false} onError={() => setFailed(url)} />
    : <span className="music-cover-empty"><ui.Icon name="audio" size={14} /></span>;
}
function clock(seconds) {
  return Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0');
}
// The mark over a row's cover: play, or pause while it plays, on hover or while
// it is the one in the player; the spinner while its preview loads. Nothing while
// the track is being added: "+" shows that wait, once.
function PlayMark({ busy, adding, active, playing, ui }) {
  if (adding) return null;
  return <span className="music-play-mark" data-busy={busy || undefined}>
    <ui.Icon name={busy ? 'loading' : active && playing ? 'pause' : 'play'} size={16} />
  </span>;
}

// The one player, ruled off at the foot of the panel: the seek bar, "Title - Artist"
// between the time played and the length, then play/pause with Add at the end.
// Raw AAC duration is estimated by the browser; Artlist supplies the track length.
function MusicPreview({ row, durationSeconds, media, playing, onPlaying, onAdd, busy, adding, added, T, ui, onError }) {
  const fail = React.useRef(onError);
  fail.current = onError;
  const [time, setTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const shownDuration = Math.max(duration, time);
  React.useEffect(() => {
    setTime(0); setDuration(durationSeconds || 0);
    return startMusicPreview(media.current, row.previewUrl, () => fail.current());
  }, [row.previewUrl, durationSeconds]);
  const artists = row.mainArtists.join(', ');
  return <div className="music-player">
    <audio ref={media} preload="metadata" onPlay={() => onPlaying(true)} onPause={() => onPlaying(false)}
      onTimeUpdate={event => setTime(event.currentTarget.currentTime)}
      onDurationChange={event => setDuration(durationSeconds || (Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0))}
      onError={() => fail.current()} />
    <input className="music-seek" type="range" aria-label={T.position} aria-valuetext={clock(time)} min={0} max={shownDuration || 1} step={0.1} value={time} disabled={!duration}
      onChange={event => { media.current.currentTime = Number(event.target.value); setTime(Number(event.target.value)); }} />
    <div className="music-player-line">
      <span className="music-player-time">{clock(time)}</span>
      <p className="music-player-title" title={artists ? row.title + ' - ' + artists : row.title}>{artists ? <><span>{row.title} - </span><b>{artists}</b></> : <b>{row.title}</b>}</p>
      <span className="music-player-time">{durationSeconds ? '≈ ' : ''}{clock(shownDuration)}</span>
    </div>
    <div className="music-transport">
      <span className="music-transport-spacer" aria-hidden="true" />
      <ui.IconButton icon={playing ? 'pause' : 'play'} label={playing ? T.pause : T.play} onClick={() => {
        if (media.current.paused) media.current.play().catch(() => fail.current());
        else media.current.pause();
      }} />
      <ui.IconButton icon={adding ? 'loading' : 'plus'} label={adding ? T.adding : added ? T.addAgain : T.add} disabled={busy} onClick={onAdd} />
    </div>
  </div>;
}

export default function Panel({ sdk, context, ui }) {
  const [kind, setKind] = React.useState('music');
  const [view, setView] = React.useState('search');
  const [artboards, setArtboards] = React.useState([]);
  const [boardId, setBoardId] = React.useState('');
  const [pageNumber, setPageNumber] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(false);
  const [boardsPage, setBoardsPage] = React.useState(1);
  const [moreBoards, setMoreBoards] = React.useState(false);
  const [editTrack, setEditTrack] = React.useState(null);
  const [targetBoard, setTargetBoard] = React.useState('');
  const [newBoardName, setNewBoardName] = React.useState('');
  const [showCreate, setShowCreate] = React.useState(false);
  // The track a row's Save menu is open on, with what the menu needs loaded.
  const [menuTrack, setMenuTrack] = React.useState(null);
  const [menuOpen, setMenuOpen] = React.useState(null);
  // The track a New Artboard from its menu adds to the board once made.
  const [boardFor, setBoardFor] = React.useState(null);
  const [preferencesReady, setPreferencesReady] = React.useState(false);
  const T = { ...COPY.en, ...(COPY[context.language] || {}) };
  if (kind === 'sfx') { T.add = T.append; T.added = T.appended; }
  const key = JSON.stringify([context.projectId, context.sequenceId, kind, view, boardId, pageNumber]);
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
  const busy = pending !== null || dragAdding !== null || !!connection?.connecting;
  const adding = pending?.kind === 'add' ? pending.trackId : dragAdding?.trackId;
  const cancellable = pending?.requestId || dragAdding?.requestId;
  const [canceling, setCanceling] = React.useState(false);
  const media = React.useRef(null);
  const lock = React.useRef(false);
  const account = React.useRef(null);
  React.useEffect(() => {
    let mounted = true;
    Promise.resolve().then(() => sdk.storage?.getItem('artlist.preferences')).then(value => {
      if (!mounted || !value) return;
      const saved = JSON.parse(value);
      if (['music', 'sfx'].includes(saved.kind)) setKind(saved.kind);
    }).catch(() => {}).finally(() => { if (mounted) setPreferencesReady(true); });
    return () => { mounted = false; };
  }, [sdk]);
  React.useEffect(() => {
    if (preferencesReady) Promise.resolve().then(() => sdk.storage?.setItem('artlist.preferences', JSON.stringify({kind}))).catch(() => {});
  }, [sdk, preferencesReady, kind]);
  function check(captured) {
    if (!captured.mounted || scope.current !== captured) throw new Error('artlist_account_changed');
  }
  async function script(text, write, captured = scope.current) {
    const result = await sdk.runScript({ summary: 'Artlist', script: text, allowCommit: write });
    check(captured);
    if (result.isError || result.result == null) {
      const output = String(result.output);
      if (/Property 'artlist' does not exist/.test(output)) throw new Error('artlist_update_required');
      throw new Error(ERROR_CODES.find(code => output.includes(code)) || 'failed');
    }
    return result.result;
  }
  async function status(captured = scope.current) {
    const next = await script(`return await selects.artlist.status();`, false, captured);
    captured.connecting = !!next.connecting;
    if (!next.connected || (account.current && account.current !== next.accountSession)) {
      setRows([]); setAudio(null); setPlaying(false); setCursor(null); setSearchedTerm(''); setAdded([]); setDragAdding(null); setMessage(''); setArtboards([]); setBoardId(''); setPageNumber(1); setHasMore(false); setBoardsPage(1); setMoreBoards(false); setEditTrack(null); setTargetBoard(''); setNewBoardName(''); setShowCreate(false);
    }
    account.current = next.accountSession;
    setConnection(next);
    if (next.error) { setFailed(true); setMessage(T[next.error] || T.failed); }
    return next;
  }
  React.useEffect(() => {
    if (!preferencesReady) return;
    const captured = scope.current;
    captured.mounted = true;
    setAudio(null); setPlaying(false); setPending(null); setAdded([]); setDragAdding(null); lock.current = false; setMessage('');
    status(captured).catch(error => { if (scope.current === captured && captured.mounted) { setFailed(true); setMessage(T[error.message] || T.failed); } });
    const timer = setInterval(() => {
      if (!lock.current && captured.connecting) status(captured).catch(() => {});
    }, 1000);
    return () => { captured.mounted = false; clearInterval(timer); };
  }, [key, preferencesReady]);
  React.useEffect(() => {
    if (!sdk.on) return;
    try {
      return sdk.on('musicImportChanged', event => {
        if (event.provider !== 'artlist') return;
        if (event.projectId !== context.projectId || event.sequenceId !== (context.sequenceId ?? null) || event.accountSession !== account.current) return;
        setDragAdding(previous => event.loading ? {trackId: event.trackId, requestId: event.requestId} : previous?.trackId === event.trackId ? null : previous);
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
      if (/^artlist_(sign_in_required|account_changed|reconnect_required)$/.test(error.message)) { account.current = null; setConnection({connected: false, connecting: false, accountSession: ''}); setRows([]); setAudio(null); setCursor(null); }
      setFailed(error.message !== 'artlist_download_canceled'); setMessage(T[error.message] || T.failed);
    } }
    finally { if (scope.current === captured && captured.mounted) { lock.current = false; setPending(null); } }
  }
  async function load(after, captured, query = term) {
    const previousAccount = account.current;
    const identity = await status(captured);
    if (after && identity.accountSession !== previousAccount) throw new Error('artlist_account_changed');
    if (!identity.connected) throw new Error('artlist_reconnect_required');
    if (view !== 'search') {
      if (!identity.library) throw new Error('artlist_update_required');
      if (view === 'artboards' && !boardId) {
        await loadBoards(captured); setSearchedTerm('artboards'); return;
      }
      const collectionId = view === 'artboards' ? boardId : view;
      const query = identity.libraryPages
        ? `return await selects.artlist.collectionPage(${JSON.stringify(collectionId)}, ${JSON.stringify(kind)}, ${pageNumber});`
        : `return await selects.artlist.collectionTracks(${JSON.stringify(collectionId)}, ${JSON.stringify(kind)});`;
      const result = await script(query, false, captured);
      setRows(result.tracks); setHasMore(!!result.hasMore); setCursor(null); setSearchedTerm(collectionId); return;
    }
    const result = await script(`return await selects.artlist.search(${JSON.stringify(query)}, ${JSON.stringify(kind)});`, false, captured);
    setRows(previous => after ? [...previous, ...result.tracks] : result.tracks);
    setCursor(result.cursor ?? null);
    setSearchedTerm(query);
  }
  React.useEffect(() => {
    if (preferencesReady && connection?.connected && !busy && !rows.length && !searchedTerm && !message) {
      action(captured => load(null, captured, BROWSE_QUERY), 'browse');
    }
  }, [connection?.connected, connection?.accountSession, busy, rows.length, searchedTerm, message, key, preferencesReady]);
  function preview(row) {
    if (audio?.id === row.id && media.current) {
      if (media.current.paused) media.current.play().catch(() => { setFailed(true); setMessage(T.previewFailed); });
      else media.current.pause();
      return;
    }
    action(async captured => {
      const previousAccount = account.current;
      const identity = await status(captured);
      if (!identity.connected || identity.accountSession !== previousAccount) throw new Error('artlist_account_changed');
      const source = await script(`return await selects.artlist.preview(${JSON.stringify(row.id)});`, false, captured);
      setPlaying(false); setAudio({ ...row, previewUrl: source.url });
    }, 'preview', row.id);
  }
  function add(row) {
    action(async captured => {
      const previousAccount = account.current;
      const identity = await status(captured);
      if (!identity.connected || identity.accountSession !== previousAccount) throw new Error('artlist_account_changed');
      const requestId = identity.downloadControls ? crypto.randomUUID() : null;
      if (requestId) setPending({kind: 'add', trackId: row.id, requestId});
      const saved = await script(`return await selects.artlist.download(${JSON.stringify(row.id)}, ${JSON.stringify(account.current)}${requestId ? ', ' + JSON.stringify(requestId) : ''});`, true, captured);
      setPending({kind: 'add', trackId: row.id});
      if (saved.previewOnly) throw new Error('artlist_subscription_required');
      if (saved.accountSession !== account.current) throw new Error('artlist_account_changed');
      try {
        const imported = await script(importMusicScript(context.projectId, saved.path), true, captured);
        await script(addMusicScript(context.projectId, context.sequenceId, imported.resourceId, imported.durationSeconds, imported.musicResourceIds), true, captured);
      }
      catch (error) { if (error.message === 'failed') throw new Error('artlist_import_uncertain'); throw error; }
      setAdded(previous => previous.includes(row.id) ? previous : previous.concat(row.id));
    }, 'add', row.id);
  }
  async function cancelDownload() {
    if (!cancellable || canceling) return;
    const captured = scope.current;
    setCanceling(true);
    try {
      const result = await script(`return await selects.artlist.cancelDownload(${JSON.stringify(cancellable)}, ${JSON.stringify(account.current)});`, true, captured);
      if (result.canceled) { setFailed(false); setMessage(T.artlist_download_canceled); }
    } catch (error) {
      if (captured === scope.current && captured.mounted) { setFailed(true); setMessage(T[error.message] || T.failed); }
    } finally { if (captured === scope.current && captured.mounted) setCanceling(false); }
  }
  async function loadBoards(captured, append = false) {
    const page = append ? boardsPage + 1 : 1;
    const query = connection?.libraryPages
      ? `return await selects.artlist.artboardsPage(${page});`
      : 'return await selects.artlist.artboards();';
    const result = await script(query, false, captured);
    setArtboards(previous => append ? [...new Map(previous.concat(result.artboards).map(board => [board.id, board])).values()] : result.artboards);
    setBoardsPage(page); setMoreBoards(!!result.hasMore);
  }
  function changePage(page) {
    setPageNumber(page); setRows([]); setAudio(null); setEditTrack(null); setSearchedTerm(''); setMessage(''); setHasMore(false);
  }
  function editFavorite(track = editTrack) {
    action(async captured => {
      const result = await script(`return await selects.artlist.setFavorite(${JSON.stringify(track.id)}, ${!track.favorited}, ${JSON.stringify(account.current)});`, true, captured);
      const mark = previous => previous?.id === track.id ? {...previous, favorited: result.favorite} : previous;
      setEditTrack(mark); setMenuTrack(mark);
      setRows(previous => previous.map(row => row.id === track.id ? {...row, favorited: result.favorite} : row));
      if (view === 'favorites') { if (!result.favorite && audio?.id === track.id) setAudio(null); await load(null, captured); }
    }, 'favorite', track.id);
  }
  function editBoard(included, track = editTrack, id = included ? targetBoard : boardId) {
    action(async captured => {
      await script(`return await selects.artlist.setArtboardTrack(${JSON.stringify(id)}, ${JSON.stringify(track.id)}, ${included}, ${JSON.stringify(account.current)});`, true, captured);
      if (view === 'artboards' && boardId === id) { if (!included && audio?.id === track.id) setAudio(null); await load(null, captured); if (!included) setEditTrack(null); }
      if (included) setMessage(T.boardSaved);
    }, included ? 'board-add' : 'board-remove', track.id);
  }
  function createBoard() {
    action(async captured => {
      const result = await script(`return await selects.artlist.createArtboard(${JSON.stringify(newBoardName.trim())}, ${JSON.stringify(account.current)});`, true, captured);
      setArtboards(previous => [result.artboard, ...previous.filter(board => board.id !== result.artboard.id)]);
      setTargetBoard(result.artboard.id); setShowCreate(false); setNewBoardName('');
      if (boardFor) {
        await script(`return await selects.artlist.setArtboardTrack(${JSON.stringify(result.artboard.id)}, ${JSON.stringify(boardFor.id)}, true, ${JSON.stringify(account.current)});`, true, captured);
        setBoardFor(null); setMessage(T.boardSaved);
      }
      if (view === 'artboards' && !boardId) { setBoardId(result.artboard.id); setRows([]); setPageNumber(1); setSearchedTerm(''); }
    }, 'board-create');
  }
  // What a row's Save menu needs, loaded as it opens: whether the track is a
  // favorite (a search row may not say) and the person's Artboards. The menu
  // shows those rows disabled until they come.
  async function loadTrackMenu(row) {
    const captured = scope.current;
    setMenuTrack({ ...row, loading: true });
    try {
      let selected = row;
      if (typeof row.favorited !== 'boolean') {
        const result = await script(`return await selects.artlist.search(${JSON.stringify(row.title)}, ${JSON.stringify(kind)});`, false, captured);
        selected = result.tracks.find(track => track.id === row.id) || row;
      }
      if (!artboards.length) await loadBoards(captured);
      setMenuTrack(previous => previous?.id === row.id ? { ...selected, loading: false } : previous);
    } catch (error) {
      if (scope.current !== captured || !captured.mounted) return;
      setMenuTrack(previous => previous?.id === row.id ? { ...row, loading: false } : previous);
      setFailed(true); setMessage(T[error.message] || T.failed);
    }
  }
  function trackMenu(row) {
    const known = menuTrack?.id === row.id ? menuTrack : row;
    const loading = menuTrack?.id === row.id && menuTrack.loading;
    const boards = artboards.filter(board => !(view === 'artboards' && board.id === boardId));
    return [
      { label: known.favorited ? T.unfavoriteLabel : T.favoriteLabel, disabled: typeof known.favorited !== 'boolean', onSelect: () => editFavorite(known) },
      { label: T.openTrack, onSelect: () => action(captured => script(`return await selects.artlist.openTrack(${JSON.stringify(row.url)});`, true, captured), 'open', row.id) },
      ...(view === 'artboards' && boardId ? [{ label: T.removeFromBoard, onSelect: () => editBoard(false, row, boardId) }] : []),
      { separator: true },
      { heading: T.addToBoard },
      ...(loading && !boards.length ? [{ label: T.loading, disabled: true, onSelect() {} }] : boards.map(board => ({ label: board.name, onSelect: () => editBoard(true, row, board.id) }))),
      ...(moreBoards ? [{ label: T.moreBoards, onSelect: () => action(captured => loadBoards(captured, true), 'board-more') }] : []),
      { separator: true },
      { label: T.newBoardMenu, onSelect: () => { setManage(false); setEditTrack(null); setBoardFor(row); setShowCreate(true); } },
    ];
  }
  function changeLibrary(value) {
    if (!connection?.library && value !== 'search') { setFailed(true); setMessage(T.artlist_update_required); return; }
    setView(value); setBoardId(''); setPageNumber(1); setHasMore(false); setEditTrack(null); setShowCreate(false); setRows([]); setAudio(null); setCursor(null); setSearchedTerm(''); setMessage(''); setTerm('');
  }
  function search(query = term) {
    if (!query.trim()) return;
    setTerm(query);
    action(captured => load(null, captured, query), 'search');
  }
  // Space plays and pauses the preview while focus is in the panel, ahead of a
  // focused button's own click; a text field keeps its Space.
  React.useEffect(() => {
    if (!audio) return;
    const onKey = event => {
      if (event.code !== 'Space' || event.repeat || event.isComposing) return;
      if (event.target.closest?.('input:not([type=range]), textarea, select, [contenteditable]')) return;
      event.preventDefault();
      const element = media.current;
      if (!element) return;
      if (element.paused) element.play().catch(() => { setFailed(true); setMessage(T.previewFailed); });
      else element.pause();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [audio?.id]);
  const heading = view === 'search'
    ? searchedTerm === BROWSE_QUERY ? T.browse : searchedTerm
    : view === 'artboards' ? artboards.find(board => board.id === boardId)?.name || T.artboards : T[view];
  const canAdd = !busy && !!context.projectId && !!context.sequenceId;
  function track(row) {
    const active = audio?.id === row.id;
    const artists = row.mainArtists.join(', ');
    return <li key={row.id} className="music-row" data-active={active} data-menu={menuOpen === row.id || undefined}>
      {/* The whole row previews; only the cover drags, as the timeline's own drop. */}
      <div className="music-row-open" onClick={event => { if (!event.target.closest('button') && !busy) preview(row); }}>
        <span className="music-cover-wrap" aria-busy={adding === row.id || undefined}>
          {ui.version >= 2 && ui.MediaTile ? <ui.MediaTile label={(adding === row.id ? T.adding : active && playing ? T.pause : T.preview) + ': ' + row.title}
            disabled={busy} onClick={() => preview(row)}
            dragData={ui.version >= 3 && context.projectId && account.current ? {
              type: 'application/x-selects-artlist-music',
              data: JSON.stringify({ provider: 'artlist', trackId: row.id, accountSession: account.current }),
            } : undefined}>
            <MusicCover url={row.coverArtUrl} ui={ui} />
            <PlayMark busy={pending?.kind === 'preview' && pending.trackId === row.id} adding={adding === row.id} active={active} playing={playing} ui={ui} />
          </ui.MediaTile> : <ui.IconButton icon={active && playing ? 'pause' : 'play'} label={T.preview + ': ' + row.title} disabled={busy} onClick={() => preview(row)} />}
        </span>
        <span className="music-row-text">
          <span className="music-title" title={row.title}>{row.title}</span>
          <span className="music-artist" title={artists}>{artists}</span>
        </span>
        <span className="music-row-meta">
          <span>{clock(row.length)}</span>
          {row.bpm > 0 && <span className="music-bpm">{row.bpm} BPM</span>}
        </span>
      </div>
      <div className="music-row-actions">
        <span className="music-row-extra">
          {connection.libraryEdit && ui.Menu ? <ui.Menu label={T.saveManage + ': ' + row.title} disabled={busy} items={trackMenu(row)}
            onOpenChange={open => { if (open) { setMenuOpen(row.id); loadTrackMenu(row); } else setMenuOpen(previous => previous === row.id ? null : previous); }} />
          : connection.libraryEdit ? <ui.IconButton icon={pending?.kind === 'library' && pending.trackId === row.id ? 'loading' : 'more'} label={T.saveManage + ': ' + row.title} disabled={busy} onClick={() => action(async captured => {
            setManage(false);setEditTrack(row);setTargetBoard(boardId || '');
            let selected = row;
            if (typeof row.favorited !== 'boolean') {
              const result = await script(`return await selects.artlist.search(${JSON.stringify(row.title)}, ${JSON.stringify(kind)});`, false, captured);
              selected = result.tracks.find(track => track.id === row.id);
              if (!selected || typeof selected.favorited !== 'boolean') throw new Error('artlist_library_unavailable');
            }
            setEditTrack(selected);if (!artboards.length) await loadBoards(captured);
          }, 'library', row.id)} />
          : <ui.IconButton icon="external-link" label={T.openTrack + ': ' + row.title} disabled={busy} onClick={() => action(captured => script(`return await selects.artlist.openTrack(${JSON.stringify(row.url)});`, true, captured), 'open', row.id)} />}
        </span>
        <ui.IconButton icon={adding === row.id ? 'loading' : 'plus'} label={(adding === row.id ? T.adding : added.includes(row.id) ? T.addAgain : T.add) + ': ' + row.title} disabled={!canAdd} onClick={() => add(row)} />
      </div>
    </li>;
  }
  const libraryTabs = [{value:'search',label:T.catalog},{value:'favorites',label:T.favorites},{value:'downloads',label:T.downloads},{value:'artboards',label:T.artboards}].map(tab => ({...tab, content: null}));
  const refreshAccount = () => action(async captured => { await script('return await selects.artlist.connect();', true, captured); await status(captured); }, 'connect');
  const openLicense = () => action(captured => script('return await selects.artlist.openTrack("https://artlist.io/help-center/privacy-terms/artlist-license/");', true, captured), 'open');
  const disconnect = () => action(async captured => {
    await script('return await selects.artlist.disconnect();', true, captured);
    setRows([]); setAudio(null); setCursor(null); setManage(false); await status(captured);
  }, 'disconnect');
  return <div className="music-panel">
    <style>{STYLES}</style>
    {!connection && (message ? <ui.Message tone="error">{message}</ui.Message> : <ui.Progress label={T.loading} />)}
    {connection && !connection.connected && <div className="music-connect">
      <p>{connection.autoIdentity ? T.connectHintAuto : T.connectHint}</p>
      <ui.Button variant="primary" busy={pending?.kind === 'connect' || !!connection.connecting} busyLabel={T.connecting} disabled={busy} onClick={() => action(async captured => { await script('return await selects.artlist.connect();', true, captured); await status(captured); }, 'connect')}>{T.connect}</ui.Button>
      {connection.connecting && <ui.Button variant="ghost" onClick={() => action(async captured => { await script('return await selects.artlist.disconnect();', true, captured); await status(captured); }, 'disconnect')}>{T.cancel}</ui.Button>}
      {message && <ui.Message tone={failed ? 'error' : 'success'}>{message}</ui.Message>}
    </div>}
    {connection?.connected && <>
      {ui.Menu ? <ui.Tabs variant="strip" value={view} onChange={value => { if (!busy) changeLibrary(value); }} tabs={libraryTabs}
        actions={<ui.Menu label={T.account} disabled={busy} items={[
          { heading: (connection.email || T.connected) + (connection.plan ? ' · ' + connection.plan : '') },
          { label: T.refresh, onSelect: refreshAccount },
          { label: T.license, onSelect: openLicense },
          { separator: true },
          { label: T.disconnect, onSelect: disconnect },
        ]} />} />
      : <><div className="music-tabs">
        <fieldset className="music-navigation" disabled={busy} aria-label={T.library}>
          <ui.Tabs value={view} onChange={value => { if (!busy) changeLibrary(value); }}
            tabs={libraryTabs} />
        </fieldset>
        <ui.IconButton icon={manage ? 'close' : 'more'} label={T.account} disabled={busy} onClick={() => {setManage(value => !value);setEditTrack(null);setShowCreate(false);}} />
      </div>
      {manage && <div className="music-account">
        <small title={connection.email || T.connected}>{connection.email || T.connected}{connection.plan ? ' · ' + connection.plan : ''}</small>
        <ui.Button variant="ghost" disabled={busy} onClick={refreshAccount}>{T.refresh}</ui.Button>
        <ui.Button variant="ghost" disabled={busy} onClick={openLicense}>{T.license}</ui.Button>
        <small>{T.licenseHint}</small>
        <ui.Button variant="ghost" disabled={busy} onClick={disconnect}>{T.disconnect}</ui.Button>
      </div>}
      </>}
      <div className="music-controls">
        {view === 'search' && <div className="music-search" onKeyDown={event => {
          if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.target.tagName === 'INPUT') { event.preventDefault(); search(); }
        }}>
          {ui.version >= 2 && ui.SearchInput ? <ui.SearchInput label={T.query} placeholder={T.placeholder} value={term}
            disabled={busy} busy={pending?.kind === 'search'} clearLabel={T.clear} searchLabel={pending?.kind === 'search' ? T.searching : T.search}
            onChange={setTerm} onSearch={() => search()} /> : <>
            <ui.TextField label={T.query} placeholder={T.placeholder} value={term} disabled={busy} onChange={setTerm} />
            <ui.IconButton icon={pending?.kind === 'search' ? 'loading' : 'search'} label={pending?.kind === 'search' ? T.searching : T.search} disabled={busy || !term.trim()} onClick={() => search()} />
          </>}
        </div>}
        {view === 'artboards' && <div className="music-picker">
          {artboards.length > 0 && <ui.Select key={boardId} label={T.artboards} placeholder={T.chooseArtboard} value={boardId || null} disabled={busy}
            options={artboards.map(board => ({value:board.id,label:board.name}))} onChange={value => {setBoardId(value);setPageNumber(1);setHasMore(false);setEditTrack(null);setRows([]);setAudio(null);setSearchedTerm('');setMessage('');}} />}
          {connection.libraryEdit && <ui.Button variant="ghost" disabled={busy} onClick={() => {setManage(false);setShowCreate(value => !value);}}>{T.newBoard}</ui.Button>}
        </div>}
        {view === 'artboards' && moreBoards && <ui.Button variant="ghost" busy={pending?.kind === 'board-more'} busyLabel={T.loading} disabled={busy} onClick={() => action(captured => loadBoards(captured, true), 'board-more')}>{T.moreBoards}</ui.Button>}
        {(() => {
          const Kind = ui.Segmented || ui.Select;
          return <Kind label={T.kindLabel} value={kind} options={[{value:'music',label:T.music},{value:'sfx',label:T.sfx}]} disabled={busy}
            onChange={value => {setKind(value);setPageNumber(1);setHasMore(false);setEditTrack(null);setTerm('');setRows([]);setAudio(null);setSearchedTerm('');setMessage('');}} />;
        })()}
      </div>
      {(!context.sequenceId || connection.previewOnly || cancellable || message) && <div className="music-notes">
        {!context.sequenceId && <small>{T.draft}</small>}
        {connection.previewOnly && <small>{T.downloadHint}</small>}
        {cancellable && <ui.Button variant="ghost" disabled={canceling} onClick={cancelDownload}>{T.cancelDownloadLabel}</ui.Button>}
        {message && <ui.Message tone={failed ? 'error' : 'success'}>{message}</ui.Message>}
      </div>}
      <div className="music-body">
        {(rows.length > 0 || view !== 'search') && <div className="music-heading">
          <span className="music-heading-label">{rows.length > 0 || view !== 'artboards' || boardId ? heading : ''}</span>
          {view !== 'search' && <ui.IconButton icon="refresh" label={T.refreshLibrary} disabled={busy} onClick={() => action(async captured => {
            if (view === 'artboards' && boardId) await loadBoards(captured);
            await load(null, captured);
          }, 'library')} />}
        </div>}
        {busy && !rows.length && <ui.Progress label={T.loading} />}
        {!rows.length && !busy && !message && <div className="music-empty">
          <small>{view !== 'search' ? view === 'artboards' && !boardId ? artboards.length ? T.chooseArtboard : T.emptyBoards : T.emptyLibrary : searchedTerm ? T.empty : T.browse}</small>
          <p>{view !== 'search' ? T.emptyLibraryHint : searchedTerm ? T.emptyHint : T.hints}</p>
        </div>}
        {rows.length > 0 && <ul className="music-rows">{rows.map(track)}</ul>}
        {view !== 'search' && (pageNumber > 1 || hasMore) && <div className="music-pager">
          <ui.Button variant="ghost" disabled={busy || pageNumber === 1} onClick={() => changePage(pageNumber - 1)}>{T.previousPage}</ui.Button>
          <small>{T.pageLabel} {pageNumber}</small>
          <ui.Button variant="ghost" disabled={busy || !hasMore} onClick={() => changePage(pageNumber + 1)}>{T.nextPage}</ui.Button>
        </div>}
        {view !== 'search' && !connection.libraryPages && rows.length === 50 && <small>{T.libraryLimit}</small>}
        {cursor && <ui.Button variant="ghost" busy={pending?.kind === 'more'} busyLabel={T.loading} disabled={busy} onClick={() => action(captured => load(cursor, captured, searchedTerm), 'more')}>{T.more}</ui.Button>}
      </div>
      {(showCreate || editTrack && connection.libraryEdit && !ui.Menu) && <div key={showCreate ? 'create' : editTrack?.id} className="music-editor">
        {editTrack && !showCreate && connection.libraryEdit && <ui.Section title={editTrack.title} actions={<ui.IconButton icon="close" label={T.closeLibrary} disabled={busy} onClick={() => setEditTrack(null)} />}>
          <ui.Row><ui.Button variant="ghost" busy={pending?.kind === 'favorite'} busyLabel={T.savingLibrary} disabled={busy || typeof editTrack.favorited !== 'boolean'} onClick={editFavorite}>{editTrack.favorited ? T.unfavoriteLabel : T.favoriteLabel}</ui.Button><ui.Button variant="ghost" disabled={busy} onClick={() => action(captured => script(`return await selects.artlist.openTrack(${JSON.stringify(editTrack.url)});`, true, captured), 'open', editTrack.id)}>{T.openTrack}</ui.Button></ui.Row>
          {artboards.length > 0 && <ui.Select key={targetBoard} label={T.artboards} placeholder={T.chooseArtboard} value={targetBoard || null} options={artboards.map(board => ({value:board.id,label:board.name}))} disabled={busy} onChange={setTargetBoard} />}
          {moreBoards && view !== 'artboards' && <ui.Button variant="ghost" busy={pending?.kind === 'board-more'} busyLabel={T.loading} disabled={busy} onClick={() => action(captured => loadBoards(captured, true), 'board-more')}>{T.moreBoards}</ui.Button>}
          <ui.Row><ui.Button variant="ghost" busy={pending?.kind === 'board-add'} busyLabel={T.savingLibrary} disabled={busy || !targetBoard} onClick={() => editBoard(true)}>{T.addToBoard}</ui.Button>
            {view === 'artboards' && boardId && <ui.Button variant="ghost" busy={pending?.kind === 'board-remove'} busyLabel={T.savingLibrary} disabled={busy} onClick={() => editBoard(false)}>{T.removeFromBoard}</ui.Button>}</ui.Row>
          {view !== 'artboards' && <ui.Row><ui.Button variant="ghost" disabled={busy} onClick={() => {setManage(false);setShowCreate(value => !value);}}>{T.newBoard}</ui.Button></ui.Row>}
        </ui.Section>}
        {showCreate && <ui.Section title={T.newBoard} actions={<ui.IconButton icon="close" label={T.cancelLibrary + ': ' + T.newBoard} disabled={busy} onClick={() => { setShowCreate(false); setBoardFor(null); }} />}>
          <ui.TextField label={T.boardName} value={newBoardName} disabled={busy} onChange={setNewBoardName} />
          <ui.Actions><ui.Button variant="ghost" disabled={busy} onClick={() => { setShowCreate(false); setBoardFor(null); }}>{T.cancelLibrary}</ui.Button><ui.Button busy={pending?.kind === 'board-create'} busyLabel={T.creatingBoard} disabled={busy || !newBoardName.trim() || newBoardName.trim().length > 80} onClick={createBoard}>{T.createBoard}</ui.Button></ui.Actions>
        </ui.Section>}
      </div>}
      {audio && <MusicPreview row={audio} durationSeconds={audio.length} media={media} playing={playing} onPlaying={setPlaying}
        onAdd={() => add(audio)} busy={!canAdd} adding={adding === audio.id} added={added.includes(audio.id)} T={T} ui={ui}
        onError={() => { setFailed(true); setMessage(T.previewFailed); }} />}
    </>}
  </div>;
}
