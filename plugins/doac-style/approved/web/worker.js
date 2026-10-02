// DOAC Style caption engine in a Web Worker (Windows). The panel concatenates
// pil.js, engine.js and this file into one blob and posts:
//   { cmd: 'catalogue' | 'check' | 'compile', wasm, files, fonts, job, only }
// and gets back { result } or { error: { pyType, pyMessage, message } }; a compile
// also posts { progress } after each frame and each scene. 'check' lays out and
// validates every scene without drawing one (engine.js checkJob).
//
// Fonts: the approved plans name macOS font files. On Windows the same family
// is read from the system Fonts folder when it is there (the panel sends it as
// 'windows:<file name>'); Helvetica and Helvetica Neue, which Windows does not
// have, use the bundled Arimo (metric-compatible, SIL OFL), as does any system
// font that is missing (Arial Narrow ships with Office only).
'use strict';

const DOAC_SYSTEM = '/System/Library/Fonts/';
const DOAC_SUPPLEMENTAL = DOAC_SYSTEM + 'Supplemental/';
const DOAC_FONT_MAP = {
  [DOAC_SYSTEM + 'HelveticaNeue.ttc#0']: [null, 'Regular'],
  [DOAC_SYSTEM + 'HelveticaNeue.ttc#1']: [null, 'Bold'],
  [DOAC_SYSTEM + 'HelveticaNeue.ttc#9']: [null, 'Bold'],
  [DOAC_SYSTEM + 'HelveticaNeue.ttc#10']: [null, 'Medium'],
  [DOAC_SYSTEM + 'Helvetica.ttc#0']: [null, 'Regular'],
  [DOAC_SYSTEM + 'Helvetica.ttc#1']: [null, 'Bold'],
  [DOAC_SUPPLEMENTAL + 'Arial.ttf#0']: ['arial.ttf', 'Regular'],
  [DOAC_SUPPLEMENTAL + 'Arial Bold.ttf#0']: ['arialbd.ttf', 'Bold'],
  [DOAC_SUPPLEMENTAL + 'Arial Bold Italic.ttf#0']: ['arialbi.ttf', 'Bold'],
  [DOAC_SUPPLEMENTAL + 'Arial Black.ttf#0']: ['ariblk.ttf', 'Bold'],
  [DOAC_SUPPLEMENTAL + 'Arial Narrow Bold.ttf#0']: ['arialnb.ttf', 'Bold'],
  [DOAC_SUPPLEMENTAL + 'Georgia Bold.ttf#0']: ['georgiab.ttf', 'Bold'],
  [DOAC_SUPPLEMENTAL + 'Times New Roman.ttf#0']: ['times.ttf', 'Regular'],
};
// Windows Fonts folder file names the panel reads (lower case).
const DOAC_WINDOWS_FONTS = [...new Set(Object.values(DOAC_FONT_MAP).map(v => v[0]).filter(Boolean))];

// fonts: { 'windows:arialbd.ttf': bytes, 'arimo:Bold': bytes, 'permanent-marker': bytes }
// useSystem: false draws every face from the bundled fonts (the parity test does).
function doacFontSource(fonts, { useSystem = true } = {}) {
  return (path, index) => {
    if (String(path).endsWith('PermanentMarker-Regular.ttf')) return { bytes: fonts['permanent-marker'], index: 0 };
    const [system, arimo] = DOAC_FONT_MAP[path + '#' + index] || [null, 'Regular'];
    const own = useSystem && system && fonts['windows:' + system];
    return { bytes: own || fonts['arimo:' + arimo], index: 0 };
  };
}

function doacEngine({ wasm, files, fonts, useSystem = true }) {
  const pil = createPil(wasm);
  return createDoacEngine({ pil, files, fontSource: doacFontSource(fonts, { useSystem }) });
}

if (typeof self !== 'undefined' && typeof self.postMessage === 'function' && typeof module === 'undefined') {
  self.onmessage = async ({ data }) => {
    try {
      const engine = doacEngine(data);
      if (data.cmd === 'catalogue') { self.postMessage({ result: engine.catalogue() }); return; }
      if (data.cmd === 'check') { self.postMessage({ result: engine.checkJob(data.job) }); return; }
      const result = await engine.compileJob(data.job, { only: data.only == null ? null : data.only, onProgress: p => { self.postMessage({ progress: p }); } });
      const transfer = result.scenes.map(s => s.preview.buffer);
      self.postMessage({ result }, transfer);
    } catch (e) {
      self.postMessage({ error: { pyType: e && e.pyType || (e && e.name) || 'Error', pyMessage: e && e.pyMessage != null ? e.pyMessage : null, message: String(e && e.message || e) } });
    }
  };
}
if (typeof module !== 'undefined') module.exports = { doacFontSource, doacEngine, DOAC_WINDOWS_FONTS, DOAC_FONT_MAP };
