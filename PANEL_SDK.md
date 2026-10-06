# Panel local capabilities

Panels receive `sdk` from Cutback Client. Local file and media operations use
its public message bridge, including in detached windows. Do not read
`window.parent.__DI__.FileSystem`, `Runtime` media tools, or `CutbackMediaPicker`.

```tsx
const source = await sdk.dialogs.pickFilePath([
  { name: 'Video', extensions: ['mp4', 'mov'] },
]);
if (!source) return;
const directory = sdk.files.join(sdk.files.homedir(), '.selects', 'plugin-data', PLUGIN_ID);
await sdk.files.mkdir(directory, { recursive: true });
const output = sdk.files.join(directory, 'audio.wav');
const controller = new AbortController();
await sdk.media.runFFmpeg(['-nostdin', '-y', '-i', source, '-vn', output], true, controller.signal);
const bytes = await sdk.files.readFile(output);
```

- `sdk.files`: asynchronous disk operations (`exists`, `readFile`, `readRange`,
  `writeFile`, `mkdir`, `readdir`, `stat`, `rename`, `removeFile`, `rm`,
  `copyFile`, `downloadFile`, `pathToLocalURL`, `localURLToPath`,
  `getOrCreateTmpDirPath`). Await every operation, including URL conversion.
- Path helpers (`join`, `dirname`, `basename`, `extname`, `normalize`,
  `isAbsolute`) and `homedir()` are synchronous.
- Reads return `Uint8Array`, or text for `readFile(path, 'utf8')`; writes accept
  text or `Uint8Array`. `stat` returns plain fields or null, not a Node class.
- `sdk.dialogs`: `pickFilePath`, `pickDirectoryPath`, `pickSavePath`; cancellation
  returns null.
- `sdk.media`: bundled `runFFmpeg` and `runFFprobe`, with argument arrays and an
  optional AbortSignal. FFmpeg accepts stdout/stderr callbacks as its fourth
  and fifth arguments. Closing or replacing the panel cancels its media jobs.
- `sdk.environment`: host `platform` and `version`, initialized before mount.

The migration requires the Cutback Client build that introduces these Panel
SDK capabilities. Deploy that client support before publishing these panels.
An older SDK must produce an update message rather than falling back to DI.
Project queries and edits continue to use `sdk.call` and `sdk.runScript`.
Timeline and generation operations without equivalent SDK capabilities still
retain their existing internal service dependencies.
