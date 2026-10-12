# Install

1. Build Selects with the `music.epidemic.mcp-key.v1` host contract. Panel UI
   version 2 adds native cover tiles and compact search; version 3 adds dragging
   those covers straight from Music to the timeline.
2. Copy `panel.tsx` to `SELECTS_USER_PANELS_ROOT/music/panel.tsx` and the other
   manifest files to `SELECTS_USER_SKILLS_ROOT/music/`.
3. Get your personal MCP API key from
   https://www.epidemicsound.com/account/api-keys.
4. Open Music in Selects Apps, click **Connect Epidemic Sound**, and paste the
   key into the host dialog. Do not put the key in panel code or agent scripts.
5. Search, preview and add an authorized track to an open Draft. Video is
   optional: an empty Draft takes the full song as editable Audio. Later songs
   append after existing Epidemic music without shifting earlier clips.

Selects encrypts the key locally, separately for each Selects account. An older
binary shows an update message. No Developer Portal key, client ID or partner
OAuth setup is required for this personal MCP key flow.

A permitted original download is required for **Add to Draft**. A Creator
account was verified through full MP3 download, editable Audio saving, reload
and WAV export. MP4 export hit a local FFmpeg 9 compatibility error. Windows
still needs live verification.
