# Third-party components

| Component | Where | License |
|---|---|---|
| Literata (variable font, Latin subset) | `fonts/Literata-VF.ttf.gz.b64`, the font file gzip-compressed and base64-encoded | SIL Open Font License 1.1, `fonts/OFL-Literata.txt` |
| fontkit 2.0.4 and the packages it uses (restructure, brotli, unicode-trie, unicode-properties, dfa, tiny-inflate, base64-js, clone, fast-deep-equal, base64-arraybuffer, @swc/helpers, tslib) | Bundled in `engine.js` | MIT, except the brotli decoder by Google and @swc/helpers (Apache-2.0) and tslib (0BSD); full notices in `licenses/engine-notices.md` |
| Upright Piano KW sample set (FreePats) | Used to render `music/momentum.m4a`; the samples themselves are not included | CC0 1.0 |
| YuNet face detector (OpenCV Zoo) | Downloaded on first use, not included | MIT |
| onnxruntime-web 1.30.0 | Downloaded on first use, not included | MIT |

`music/momentum.m4a` is an original composition made for this plugin. Arial is not included; the panel reads the
copy installed with the operating system. Stock B-roll clips are downloaded at run time from the Selects stock
footage search and stay under their providers' licences.
