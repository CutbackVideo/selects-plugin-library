// Shortform-owned update policy. The host only executes this already-installed script.
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const REPO = 'CutbackVideo/selects-plugin-library';
const ID = 'shortform-clips';
const ALLOWED = new Set(['README.md', 'INSTALL.md', 'panel.tsx', 'update.cjs']);
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
const json = async (url, fetchImpl) => JSON.parse((await bytes(url, fetchImpl)).toString('utf8'));
const raw = (sha, file) => `https://raw.githubusercontent.com/${REPO}/${sha}/plugins/${ID}/${file}`;
const blob = buffer => crypto.createHash('sha1').update(`blob ${buffer.length}\0`).update(buffer).digest('hex');
async function packageAt(sha, fetchImpl) {
  if (!SHA.test(sha)) throw new Error('Invalid release identity.');
  const manifestBytes = await bytes(raw(sha, 'plugin.json'), fetchImpl);
  const manifest = JSON.parse(manifestBytes);
  // Older releases cannot keep the opt-in update protocol alive. Do not offer them.
  if (manifest.updates?.protocol !== 1) return null;
  if (manifest.id !== ID || !Array.isArray(manifest.files) || manifest.files.length !== ALLOWED.size ||
      new Set(manifest.files).size !== manifest.files.length || manifest.files.some(f => !ALLOWED.has(f)))
    throw new Error('This release needs a newer Shortform updater.');
  const tree = await json(`https://api.github.com/repos/${REPO}/git/trees/${sha}?recursive=1`, fetchImpl);
  if (tree.truncated || !Array.isArray(tree.tree)) throw new Error('Incomplete release file list.');
  const hashes = new Map(tree.tree.filter(e => e.type === 'blob').map(e => [e.path, e.sha]));
  const files = [...manifest.files, 'plugin.json'];
  for (const file of files) if (!SHA.test(hashes.get(`plugins/${ID}/${file}`) || '')) throw new Error(`Missing release file: ${file}`);
  if (blob(manifestBytes) !== hashes.get(`plugins/${ID}/plugin.json`)) throw new Error('Release manifest verification failed.');
  return {files, hashes, manifestBytes};
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
function destination(root, file) {
  return path.join(root, file === 'panel.tsx' ? 'panels' : 'skills', ID, file);
}
async function run(mode, release, deps = {}) {
  const root = deps.root || path.join(os.homedir(), '.selects');
  const fetchImpl = deps.fetchImpl || fetch;
  const receipt = destination(root, '.source-commit');
  await safe(root, receipt);
  const installed = (await fs.readFile(receipt, 'utf8').catch(e => {if (e.code === 'ENOENT') return '';throw e;})).trim();
  if (mode === 'check') {
    if (!SHA.test(installed)) return null;
    const head = await json(`https://api.github.com/repos/${REPO}/commits/main`, fetchImpl);
    if (head.sha === installed) return null;
    const pkg = await packageAt(head.sha, fetchImpl);
    if (!pkg) return null;
    let changed = false;
    for (const file of pkg.files) {
      const target = destination(root, file); await safe(root, target);
      const data = await fs.readFile(target).catch(e => {if (e.code === 'ENOENT') return null;throw e;});
      if (!data || blob(data) !== pkg.hashes.get(`plugins/${ID}/${file}`)) changed = true;
    }
    return changed ? {id:head.sha,version:head.sha.slice(0,7),description:'Update Shortform Clips. Saved templates and clips are kept.'} : null;
  }
  if (mode !== 'apply') throw new Error('Unsupported update operation.');
  if (!SHA.test(installed)) throw new Error('No official installation receipt.');
  const pkg = await packageAt(release, fetchImpl);
  if (!pkg) throw new Error('This release does not support app updates.');
  const base = path.join(root, '.updates', ID);
  await safe(root, base); await fs.mkdir(base, {recursive:true});
  const lock = path.join(base, 'install.lock');
  const handle = await fs.open(lock, 'wx').catch(e => {if(e.code==='EEXIST')throw new Error('Another Shortform update is running, or a previous update was interrupted.');throw e;});
  let stage;
  try {
    stage = await fs.mkdtemp(path.join(base, 'release-'));
    const entries = [];
    // Download and verify everything before touching the installed app.
    for (const file of pkg.files) {
      const data = file === 'plugin.json' ? pkg.manifestBytes : await bytes(raw(release, file), fetchImpl);
      if (blob(data) !== pkg.hashes.get(`plugins/${ID}/${file}`)) throw new Error(`Update verification failed: ${file}`);
      const target = destination(root, file); await safe(root, target);
      const previous = await fs.readFile(target).catch(e => {if(e.code==='ENOENT')return null;throw e;});
      entries.push({file,target,data,previous});
    }
    // Receipt last: a failed update never advertises successful installation.
    entries.push({file:'.source-commit',target:receipt,data:Buffer.from(release),previous:Buffer.from(installed)});
    for (const e of entries) {
      await fs.writeFile(path.join(stage,e.file+'.next'),e.data);
      if(e.previous !== null)await fs.writeFile(path.join(stage,e.file+'.backup'),e.previous);
    }
    await fs.writeFile(path.join(stage,'recovery.json'),JSON.stringify(entries.map(e=>({file:e.file,target:e.target,existed:e.previous!==null}))));
    const placed=[];
    try {
      for(const e of entries){
        await safe(root,e.target);await fs.mkdir(path.dirname(e.target),{recursive:true});
        await fs.rename(path.join(stage,e.file+'.next'),e.target);placed.push(e);
        await deps.afterPlace?.(e.file);
      }
    }catch(error){
      const failures=[];
      for(const e of placed.reverse())try{
        if(e.previous===null)await fs.rm(e.target,{force:true});
        else await fs.rename(path.join(stage,e.file+'.backup'),e.target);
      }catch{failures.push(e.file);}
      if(failures.length)throw new Error(`Update failed; recovery is required for ${failures.join(', ')}. Backup: ${stage}`);
      throw error;
    }
    return {updated:true,version:release,backup:stage};
  }finally{await handle.close();await fs.rm(lock,{force:true});}
}
module.exports = {run,blob};
if(require.main === module)run(process.argv[2],process.argv[3]).then(result=>console.log(JSON.stringify(result))).catch(error=>{console.error(error.message);process.exitCode=1;});
