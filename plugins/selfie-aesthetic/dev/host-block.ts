// Source of the panel's host block. panel.tsx carries the text between the markers verbatim
// (tests/host.test.cjs evaluates it as plain JS; the panel test checks the copy is identical).
// sae-host:start
// Shell-agnostic host helpers: sdk.runShell is sh on macOS and cmd.exe on Windows. Every command the panel runs is
// either saeRootProbeCommand() or saeNodeCmd(...); nothing else touches the shell.
function saeRootProbeCommand() {
  return 'echo %SELECTS_USER_SKILLS_ROOT% $SELECTS_USER_SKILLS_ROOT';
}

// cmd.exe expands the first word and leaves "$SELECTS_USER_SKILLS_ROOT" literal; sh does the opposite.
// Returns the expanded root (it may contain spaces), or null when neither shell expanded it.
function saeParseRoot(output) {
  const CMD = '%SELECTS_USER_SKILLS_ROOT%', SH = '$SELECTS_USER_SKILLS_ROOT';
  const lines = String(output == null ? '' : output).split(/\r?\n|\r/).map((s) => s.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    let root = null;
    if (line.endsWith(SH) && !line.startsWith(CMD)) root = line.slice(0, line.length - SH.length);
    else if (line.startsWith(CMD) && !line.endsWith(SH)) root = line.slice(CMD.length);
    else if (line === CMD || line === CMD + ' ' + SH) return null;
    if (root == null) continue;
    root = root.trim().replace(/^"(.*)"$/, '$1');
    if (root.length > 1 && !/^[A-Za-z]:[\\/]$/.test(root)) root = root.replace(/[\\/]+$/, '');
    return root || null;
  }
  return null;
}

function saeSep(root) {
  return /^[A-Za-z]:/.test(String(root)) || String(root).indexOf('\\') >= 0 ? '\\' : '/';
}

// Joins with the root's separator; parts may use either separator ('assets/cues/a.mp3').
function saeJoin(root, ...parts) {
  const sep = saeSep(root);
  let base = String(root);
  if (base.length > 1 && !/^[A-Za-z]:[\\/]$/.test(base)) base = base.replace(/[\\/]+$/, '');
  const segs = [];
  for (const p of parts) for (const s of String(p).split(/[\\/]+/)) if (s) segs.push(s);
  if (!segs.length) return base;
  return (/[\\/]$/.test(base) ? base : base + sep) + segs.join(sep);
}

// `node "<script>" "<job>"`, valid in both cmd.exe and sh. Characters that either shell expands inside double
// quotes are refused, as is a trailing backslash (it would escape the closing quote). User paths belong inside the
// job JSON, never here. The node path is quoted only when it needs it, so a plain `node` keeps cmd.exe /c from
// stripping a leading quote.
function saeNodeCmd(script, job, node = 'node') {
  const check = (v, what) => {
    if (typeof v !== 'string' || !v) throw new Error('saeNodeCmd: ' + what + ' is empty');
    if (/["%$`\r\n]/.test(v)) throw new Error('saeNodeCmd: ' + what + ' contains a character the shell would expand');
    if (/\\$/.test(v)) throw new Error('saeNodeCmd: ' + what + ' ends with a backslash');
    return v;
  };
  const exe = check(node, 'node');
  const head = /^[A-Za-z0-9_.:\/\\-]+$/.test(exe) ? exe : '"' + exe + '"';
  return head + ' "' + check(script, 'script') + '" "' + check(job, 'job') + '"';
}
// sae-host:end
