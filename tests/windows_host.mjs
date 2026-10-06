// Windows checks shared by the panel tests: the host I/O block a panel copies
// from Archive Vlog (`// av-host:start` … `// av-host:end`), a scan for POSIX
// shell syntax in the code a panel runs, and a fake host (window.parent.__DI__)
// built in another JavaScript realm, as the real one is.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const PLUGINS = path.resolve(import.meta.dirname, '../plugins');
const START = '// av-host:start', END = '// av-host:end';

export function panelSource(id) {
  return fs.readFileSync(path.join(PLUGINS, id, 'panel.tsx'), 'utf8');
}

export function hostBlock(source) {
  const s = source.indexOf(START), e = source.indexOf(END);
  if (s < 0 || e < s) return null;
  return source.slice(s, e + END.length);
}

// Archive Vlog's block, which every copy must match byte for byte.
export const REFERENCE_BLOCK = hostBlock(panelSource('archive-vlog'));

// Shell syntax that cmd.exe does not run. The copied host block is left out
// (it is checked against Archive Vlog's byte for byte instead).
export const POSIX = [
  /\bprintf\b/, /\$HOME\b/, /\$\{?SELECTS_USER/, /\bcommand -v\b/, /\bmkdir -p\b/, /\brm -f\b/,
  /\bbase64 /, /\bexport PATH\b/, /\bshasum\b/, /\bcat "/, /\bpwd -P\b/, /\bmv -f\b/, /\|\s*grep\b/,
  /["'`]\s*(?:node|python3?)\s/,
];

// The POSIX patterns found in `source` outside the host block and outside the
// `allowed` substrings (each must be present, so a stale allowance fails too).
export function posixHits(source, allowed = []) {
  let rest = source.replace(hostBlock(source) || '\u0000', '');
  for (const a of allowed) {
    if (!rest.includes(a)) throw Error('allowed text not found: ' + a.slice(0, 60));
    rest = rest.split(a).join('');
  }
  return POSIX.filter(re => re.test(rest)).map(String);
}

// Compiles named top-level functions (and consts) of a panel, together with its
// host block, into a fresh context whose window.parent.__DI__ is `di`.
export function loadPanelFunctions(source, names, globals = {}) {
  if (!globals.__sdk && hostBlock(source)) {
    let di = {};
    try { di = globals.window?.parent?.__DI__ || {}; } catch { /* pure helpers need no host */ }
    globals = { ...globals, ...hostGlobals({ di }), window: {
      ...globals.window, parent: { ...globals.window?.parent, ...hostGlobals({ di }).window.parent },
    } };
  }
  const parts = [hostBlock(source) || ''];
  if (source.includes('// sdk-selected-media:start') && !names.includes('sdkSelectedMedia')) parts.push(topLevel(source, 'sdkSelectedMedia'));
  if (source.includes('// sdk-media-path:start') && !names.includes('sdkMediaByPath')) parts.push(topLevel(source, 'sdkMediaByPath'));
  for (const name of ['generationApi', 'generationNeed']) if (source.includes('function ' + name + '(') && !names.includes(name)) parts.push(topLevel(source, name));
  for (const name of names) parts.push(topLevel(source, name));
  const context = vm.createContext({ console, TextDecoder, TextEncoder, Uint8Array, setTimeout, clearTimeout, ...globals });
  vm.runInContext(parts.join('\n') + '\nthis.__exports={' + [...hostNames(parts[0]), ...names].join(',') + '};', context);
  const exports = context.__exports;
  if (typeof exports.hostUseSdk === 'function') exports.hostUseSdk(globals.__sdk);
  if (typeof exports.bindLocalSdk === 'function') exports.bindLocalSdk(globals.__sdk);
  // Existing scenarios pass a scripting-only SDK; attach the explicitly supplied
  // async bridge fixture when their helper takes an SDK as its first argument.
  for (const name of Object.keys(exports)) {
    if (['hostUseSdk', 'bindLocalSdk'].includes(name)) continue;
    if (!/^(?:async )?function \w+\(sdk\b/.test(String(exports[name]))) continue;
    const helper = exports[name];
    exports[name] = (sdk, ...args) => helper({ ...globals.__sdk, ...sdk }, ...args);
  }
  return exports;
}

function hostNames(block) {
  return [...block.matchAll(/^(?:async )?function ([A-Za-z_$][\w$]*)/gm)].map(m => m[1]);
}

// A top-level `function name` / `async function name` / `const name =` statement:
// the shortest run of whole lines from its start that compiles as a script and
// is followed by a line starting in column 0 (the next top-level statement).
export function topLevel(source, name) {
  const re = new RegExp('^(?:export )?(?:async function ' + name + '\\b|function ' + name + '\\b|const ' + name + '\\s*=)', 'm');
  const m = re.exec(source);
  if (!m) throw Error('not found: ' + name);
  for (let nl = source.indexOf('\n', m.index); nl >= 0; nl = source.indexOf('\n', nl + 1)) {
    const next = source[nl + 1];
    if (next !== undefined && /\s/.test(next)) continue;
    const text = source.slice(m.index, nl).replace(/^export /, '');
    try { new vm.Script(text); return text; } catch { /* not the end yet */ }
  }
  throw Error('unterminated: ' + name);
}

// A fake host in another realm: FileSystem over an in-memory map of files
// (bytes as that realm's Uint8Array), Runtime with the platform and a
// recorder for runFFmpeg/runFFprobe argv.
export function fakeHost({ platform = 'win32', home = 'C:\\Users\\\uD64D\uAE38\uB3D9', files = {}, ffmpeg = () => ({ stdout: '', stderr: '' }) } = {}) {
  const realm = vm.createContext({});
  const RealmBytes = vm.runInContext('Uint8Array', realm);
  const sep = platform === 'win32' ? '\\' : '/';
  const store = new Map(Object.entries(files).map(([k, v]) => [k, typeof v === 'string' ? RealmBytes.from(Buffer.from(v)) : RealmBytes.from(v)]));
  const dirs = new Set();
  const calls = [];
  const FileSystem = {
    join: (...p) => p.filter(x => x !== '').map((x, i) => (i ? x.replace(/^[\\/]+|[\\/]+$/g, '') : x.replace(/[\\/]+$/, ''))).join(sep),
    homedir: () => home,
    existsSync: p => store.has(p) || dirs.has(p) || [...store.keys()].some(k => k.startsWith(p + sep)),
    exists: async p => FileSystem.existsSync(p),
    mkdirSync: p => { dirs.add(p); },
    readFile: async p => { if (!store.has(p)) throw Error('ENOENT ' + p); return store.get(p); },
    writeFile: async (p, data) => { calls.push(['writeFile', p]); store.set(p, RealmBytes.from(typeof data === 'string' ? Buffer.from(data) : data)); },
    removeFile: async ({ filePath }) => { store.delete(filePath); },
  };
  const Runtime = {
    getPlatform: () => platform,
    runFFmpeg: async (args, ...rest) => { calls.push(['runFFmpeg', args]); return ffmpeg(args, store, RealmBytes, ...rest); },
    runFFprobe: async args => { calls.push(['runFFprobe', args]); return { stdout: '', stderr: '' }; },
  };
  return { di: { FileSystem, Runtime }, store, calls, RealmBytes, sep };
}

// window/navigator globals for loadPanelFunctions, with a runShell that fails
// the test when anything reaches the shell.
export function hostGlobals(host, { shell = null } = {}) {
  return {
    __sdk: host.sdk || asyncSdk(host.di),
    window: { parent: { __DI__: new Proxy(host.di, {
      get(target, key) {
        if (['FileSystem', 'Runtime', 'CutbackMediaPicker'].includes(key)) throw Error('Migrated service accessed through DI: ' + key);
        return target[key];
      },
    }) } },
    navigator: { platform: 'Win32', userAgent: 'Windows NT 10.0' },
    shell,
  };
}

// The message every copied panel shows when this Selects build's FileSystem
// lacks what hostRoots needs, before any lookup that would say "Reinstall".
export const NEWER_SELECTS="if(!hostApi('FileSystem','join','homedir','exists'))throw Error('This Selects build cannot read the plugin files. Update Selects, then try again.');";

// Adapts legacy test fixture services to the public asynchronous SDK contract.
// Production panels must never perform this adaptation or access these services.
export function asyncSdk(di = {}) {
  const legacy = di.FileSystem || {}, runtime = di.Runtime || {};
  const files = {};
  for (const name of ['join', 'dirname', 'basename', 'extname', 'normalize', 'isAbsolute', 'homedir']) {
    if (typeof legacy[name] === 'function') files[name] = (...args) => legacy[name](...args);
  }
  const aliases = { exists: 'existsSync', mkdir: 'mkdirSync', stat: 'statSync', rename: 'renameSync', readdir: 'readdirSync', readFile: 'readFileSync', writeFile: 'writeFileSync', rm: 'rmSync' };
  for (const name of ['exists', 'mkdir', 'stat', 'rename', 'readdir', 'readFile', 'readRange', 'writeFile', 'removeFile', 'rm', 'copyFile', 'downloadFile', 'pathToLocalURL', 'getOrCreateTmpDirPath']) {
    const method = typeof legacy[name] === 'function' ? name : aliases[name];
    if (method && typeof legacy[method] === 'function') files[name] = async (...args) => legacy[method](...args);
  }
  if (!files.removeFile) {
    const remove = ['remove', 'rm', 'unlink', 'unlinkSync', 'rmSync'].find(name => typeof legacy[name] === 'function');
    if (remove) files.removeFile = async ({ filePath }) => legacy[remove](filePath);
  }
  const media = {};
  for (const name of ['runFFmpeg', 'runFFprobe']) if (typeof runtime[name] === 'function') media[name] = async (...args) => runtime[name](...args);
  return { files, media, dialogs: di.CutbackMediaPicker || {}, environment: { platform: runtime.getPlatform?.() || 'win32', version: runtime.getHostingVersion?.() || '' } };
}
