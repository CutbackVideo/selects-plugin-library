// plugins/archive-vlog/tests/scripts-types.test.cjs
// Type-checks every scripts/*.js the way Selects run_script does before it runs one: the script body is TypeScript-checked,
// so e.g. adding a property to an object literal after the fact ("Property 'x' does not exist on type ...") is rejected
// on Staging even though plain Node runs it. Each script is wrapped in an async function (run_script bodies use top-level
// await and return) with __CONFIG__ typed any. `selects` comes from the Selects SDK typings when AV_SDK_TYPES (or the
// usual local Staging install) has them, else it is declared any.
// tsc: AV_TSC (a tsc command), else a locally resolvable typescript, else `npx -y -p typescript@5 tsc` (needs network).
// Without any of them the test is skipped locally, but fails under CI (CI=true), which runs it through npx.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), cp = require('node:child_process');
const dir = path.resolve(__dirname, '..', 'scripts');
const scripts = fs.readdirSync(dir).filter(n => n.endsWith('.js')).sort();

function findTsc() {
  if (process.env.AV_TSC) return process.env.AV_TSC;
  for (const base of [process.cwd(), __dirname]) {
    try { return JSON.stringify(process.execPath) + ' ' + JSON.stringify(require.resolve('typescript/bin/tsc', { paths: [base] })); } catch (e) { /* next */ }
  }
  try { cp.execSync('npx -y -p typescript@5 tsc -v', { stdio: 'ignore', timeout: 180000 }); return 'npx -y -p typescript@5 tsc'; } catch (e) { return null; }
}

const tsc = findTsc();
if (!tsc && process.env.CI) { console.error('scripts-types: TypeScript is required in CI (npx -y -p typescript@5 tsc failed)'); process.exit(1); }
if (!tsc) { console.log(JSON.stringify({ scriptsTypes: 'skipped (no TypeScript available)' })); process.exit(0); }

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'av-types-'));
const sdk = [process.env.AV_SDK_TYPES, path.join(os.homedir(), '.selects-staging', 'resources', 'sdk')]
  .find(p => p && fs.existsSync(path.join(p, 'core.d.ts')));
const files = [];
if (sdk) for (const n of fs.readdirSync(sdk).filter(n => n.endsWith('.d.ts'))) { fs.copyFileSync(path.join(sdk, n), path.join(tmp, n)); files.push(n); }
fs.writeFileSync(path.join(tmp, 'av-globals.d.ts'), 'declare const __CONFIG__: any;\n' + (sdk ? '' : 'declare const selects: any;\n'));
files.push('av-globals.d.ts');
// Line numbers in diagnostics are shifted back by the wrapper's header lines.
const HEAD = 2;
for (const n of scripts) {
  const ts = n.replace(/\.js$/, '.ts');
  fs.writeFileSync(path.join(tmp, ts), `export {};\nasync function __avRun(): Promise<unknown> {\n${fs.readFileSync(path.join(dir, n), 'utf8')}\n}\n`);
  files.push(ts);
}
let out = '';
try {
  out = cp.execSync(`${tsc} --noEmit --target es2022 --lib es2022 --skipLibCheck --pretty false ${files.join(' ')}`, { cwd: tmp, encoding: 'utf8', timeout: 180000 });
} catch (e) {
  out = String(e.stdout || '') + String(e.stderr || '');
  const lines = out.split('\n').filter(Boolean).map(l => l.replace(/^(\S+)\.ts\((\d+),(\d+)\)/, (m, f, ln, col) => `scripts/${f}.js(${Number(ln) - HEAD},${col})`));
  console.error(lines.join('\n'));
  fs.rmSync(tmp, { recursive: true, force: true });
  console.error('scripts-types: TypeScript check failed' + (sdk ? ' (with the Selects SDK typings)' : ''));
  process.exit(1);
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(JSON.stringify({ scriptsTypes: 'ok', scripts: scripts.length, sdkTypings: !!sdk }));
