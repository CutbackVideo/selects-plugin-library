// Shortform-owned update policy. The host only executes this already-installed script.
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const REPO = 'CutbackVideo/selects-plugin-library';
const ID = 'shortform-clips';
const SHA = /^[a-f0-9]{40}$/;
async function bytes(url, fetchImpl) {
  const res = await fetchImpl(url, {signal: AbortSignal.timeout(30_000)});
  if (!res.ok) throw new Error(`Update download failed (${res.status}).`);
  const chunks = []; let size = 0;
  for await (const chunk of res.body) {
    size += chunk.length;
    if (size > 8 * 1024 * 1024) throw new Error('Update file is too large.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
const raw = (sha, file) => `https://raw.githubusercontent.com/${REPO}/${sha}/plugins/${ID}/${file}`;
function version(value) {
  const match = typeof value === 'string' && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(value);
  if (!match) throw new Error('Invalid Shortform release version.');
  const pre = match[4]?.split('.');
  if (pre?.some(p => /^\d+$/.test(p) && p.length > 1 && p[0] === '0')) throw new Error('Invalid Shortform release version.');
  return {core: match.slice(1, 4).map(BigInt), pre};
}
function compareVersions(candidate, installed) {
  const a = version(candidate), b = version(installed);
  const cmp = (x, y) => x > y ? 1 : x < y ? -1 : 0;
  for (let i = 0; i < 3; i++) { const n = cmp(a.core[i], b.core[i]); if (n) return n; }
  if (!a.pre || !b.pre) return a.pre ? -1 : b.pre ? 1 : 0;
  for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i++) {
    if (a.pre[i] === undefined) return -1;
    if (b.pre[i] === undefined) return 1;
    const x = a.pre[i], y = b.pre[i], xn = /^\d+$/.test(x), yn = /^\d+$/.test(y);
    const n = xn && yn ? cmp(BigInt(x), BigInt(y)) : xn !== yn ? (xn ? -1 : 1) : cmp(x, y);
    if (n) return n;
  }
  return 0;
}
function readRelease(entry) {
  if (!entry || !SHA.test(entry.commit)) throw new Error('Invalid catalog release.');
  const manifest = entry.manifest;
  if (!manifest || manifest.id !== ID) throw new Error('Invalid Shortform catalog entry.');
  version(manifest.version);
  if (manifest.updates?.protocol !== 1) return null;
  const files = manifest.files;
  if (!Array.isArray(files) || !files.length || files.length > 256 ||
      new Set(files.map(f => typeof f === 'string' ? f.toLowerCase() : f)).size !== files.length ||
      files.some(f => typeof f !== 'string' || f.length > 240 || f.split('/').some(part =>
        !/^[a-zA-Z0-9_-][a-zA-Z0-9_.-]*$/.test(part) || part.endsWith('.') || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)) ||
        /^(template-packs|plugin-data|plugin\.json)(?:\/|$)/i.test(f)) ||
      !files.includes('panel.tsx') || !files.includes('update.cjs')) throw new Error('Invalid Shortform release file list.');
  return {commit: entry.commit, manifest, files: [...files, 'plugin.json']};
}
async function packageAt(release, fetchImpl) {
  const manifestBytes = await bytes(raw(release.commit, 'plugin.json'), fetchImpl);
  const manifest = JSON.parse(manifestBytes);
  if (manifest.version !== release.version) throw new Error('Release version differs from the published catalog.');
  const pkg = readRelease({commit: release.commit, manifest});
  if (!pkg) throw new Error('This release does not support app updates.');
  return {...pkg, manifestBytes};
}
async function safe(root, target) {
  const relative = path.relative(root, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Update path escaped app storage.');
  let current = root;
  for (const part of ['', ...relative.split(path.sep)]) {
    current = part ? path.join(current, part) : current;
    const stat = await fs.lstat(current).catch(e => {if (e.code === 'ENOENT') return null; throw e;});
    if (stat?.isSymbolicLink()) throw new Error(`Update refuses symbolic links: ${current}`);
  }
}
function destination(roots, file) {
  return path.join(file === 'panel.tsx' ? roots.panels : roots.skills, ID, file);
}
async function run(mode, release, deps = {}) {
  const root = deps.root || path.join(os.homedir(), '.selects');
  const env = deps.env || process.env;
  const roots = {
    skills: deps.root ? path.join(root, 'skills') : env.SELECTS_USER_SKILLS_ROOT || path.join(root, 'skills'),
    panels: deps.root ? path.join(root, 'panels') : env.SELECTS_USER_PANELS_ROOT || path.join(root, 'panels'),
  };
  if (!path.isAbsolute(roots.skills) || !path.isAbsolute(roots.panels)) throw new Error('Installation roots must be absolute paths.');
  const storageRoot = deps.root || path.dirname(roots.skills);
  const safeFile = file => safe(file === 'panel.tsx' ? roots.panels : roots.skills, destination(roots, file));
  const fetchImpl = deps.fetchImpl || fetch;
  if (mode !== 'check' && mode !== 'apply') throw new Error('Unsupported update operation.');
  const context = deps.checkContext;
  if (!context || !('installed' in context) || !('latest' in context)) throw new Error('The host does not support catalog-based update checks.');
  if (!context.latest) {
    if (mode === 'check') return null;
    throw new Error('No published Shortform release is selected.');
  }
  if (!context.installed) throw new Error('Install this app from the library once to enable updates.');
  const receipt = destination(roots, '.source-commit');
  await safeFile('.source-commit');
  const installed = (await fs.readFile(receipt, 'utf8').catch(e => {if (e.code === 'ENOENT') return '';throw e;})).trim();
  if (!SHA.test(installed)) throw new Error('Install this app from the library once to enable updates.');
  const candidate = context.latest;
  if (!SHA.test(candidate.commit) || !SHA.test(context.installed.commit)) throw new Error('Invalid catalog release.');
  await safeFile('plugin.json');
  const installedManifestText = await fs.readFile(destination(roots, 'plugin.json'), 'utf8');
  const installedManifest = JSON.parse(installedManifestText);
  if (installedManifest.id !== ID) throw new Error('Invalid installed Shortform manifest.');
  if (context.installed.commit !== installed || context.installed.version !== installedManifest.version)
    throw new Error('The installed app changed. Check for updates again.');
  const newer = compareVersions(candidate.version, installedManifest.version) > 0;
  if (mode === 'check') return newer ? {id: candidate.commit, version: candidate.version,
    description: 'Update Shortform Clips. Saved templates and clips are kept.'} : null;
  if (release !== candidate.commit) throw new Error('Selected release differs from the published catalog.');
  if (!newer) throw new Error('The published Shortform version is not newer than the installed version.');
  const verified = await packageAt(candidate, fetchImpl);
  const base = path.join(storageRoot, '.updates', ID);
  await safe(storageRoot, base); await fs.mkdir(base, {recursive:true});
  const lock = path.join(base, 'install.lock');
  const handle = await fs.open(lock, 'wx').catch(e => {if(e.code==='EEXIST')throw new Error('Another Shortform update is running, or a previous update was interrupted.');throw e;});
  let stage;
  let recoveryRequired = false;
  try {
    // Another window may have completed an install while files were downloading.
    if ((await fs.readFile(receipt, 'utf8')).trim() !== installed ||
        (await fs.readFile(destination(roots, 'plugin.json'), 'utf8')) !== installedManifestText)
      throw new Error('The installed app changed. Check for updates again.');
    stage = await fs.mkdtemp(path.join(base, 'release-'));
    const entries = [];
    let totalBytes = 0;
    // Download all files at the catalog-selected commit before replacing the installed app.
    for (const file of verified.files) {
      const data = file === 'plugin.json' ? verified.manifestBytes : await bytes(raw(release, file), fetchImpl);
      totalBytes += data.length;
      if (totalBytes > 64 * 1024 * 1024) throw new Error('Update package is too large.');
      const target = destination(roots, file); await safeFile(file);
      const previous = await fs.readFile(target).catch(e => {if(e.code==='ENOENT')return null;throw e;});
      entries.push({file,target,data,previous});
    }
    // Receipt last: a failed update never advertises successful installation.
    entries.push({file:'.source-commit',target:receipt,data:Buffer.from(release),previous:Buffer.from(installed)});
    for (const e of entries) {
      await fs.mkdir(path.dirname(path.join(stage,e.file+'.next')), {recursive:true});
      await fs.writeFile(path.join(stage,e.file+'.next'),e.data);
      if(e.previous !== null)await fs.writeFile(path.join(stage,e.file+'.backup'),e.previous);
    }
    await fs.writeFile(path.join(stage,'recovery.json'),JSON.stringify(entries.map(e=>({file:e.file,target:e.target,existed:e.previous!==null}))));
    const placed=[];
    try {
      for(const e of entries){
        await safeFile(e.file);await fs.mkdir(path.dirname(e.target),{recursive:true});
        await fs.rename(path.join(stage,e.file+'.next'),e.target);placed.push(e);
        await deps.afterPlace?.(e.file);
      }
    }catch(error){
      const failures=[];
      for(const e of placed.reverse())try{
        if(e.previous===null)await fs.rm(e.target,{force:true});
        else await fs.rename(path.join(stage,e.file+'.backup'),e.target);
      }catch{failures.push(e.file);}
      if(failures.length){
        recoveryRequired = true;
        throw new Error(`Update failed; recovery is required for ${failures.join(', ')}. Backup: ${stage}`);
      }
      throw error;
    }
    return {updated:true,version:release,backup:stage};
  }finally{await handle.close();if(!recoveryRequired)await fs.rm(lock,{force:true});}
}
module.exports = {run,compareVersions,readRelease};
if(require.main === module)run(process.argv[2],process.argv[3],{checkContext: JSON.parse(process.argv[4] || 'null')}).then(result=>console.log(JSON.stringify(result))).catch(error=>{console.error(error.message);process.exitCode=1;});
