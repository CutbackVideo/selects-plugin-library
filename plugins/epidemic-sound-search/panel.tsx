// @name Epidemic Sound search
// @name:de Epidemic Sound-Suche
// @name:en Epidemic Sound search
// @name:es Buscador de Epidemic Sound
// @name:fr Recherche Epidemic Sound
// @name:it Ricerca Epidemic Sound
// @name:ja Epidemic Sound Search
// @name:ko Epidemic Sound Search
// @name:pt Pesquisa Epidemic Sound
// @name:tr Epidemic Sound arama
// @name:zh Epidemic Sound Search
// @icon search
// Search Epidemic Sound from inside the panel with genre/mood/BPM filters,
// audition results here, collect tracks on a download list, then save the
// whole list in ONE assistant run into your library folder and My tracks.
// My tracks is project-agnostic: notes, local playback, and Add to draft.

import React from "react";

// panel-storage:start
// Keep writes ordered even across a panel remount; failed writes remain visible to callers.
const panelStorageClients = new WeakMap();
function panelStorage(sdk) {
  const storage = sdk?.storage;
  if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function" || typeof storage.removeItem !== "function") {
    throw new Error("Update Selects to use this plugin: sdk.storage is required.");
  }
  if (!panelStorageClients.has(storage)) {
    let tail = Promise.resolve();
    const enqueue = (operation) => {
      const pending = tail.then(operation);
      tail = pending.catch(() => {});
      return pending;
    };
    panelStorageClients.set(storage, {
      getItem: (key) => enqueue(() => storage.getItem(key)),
      setItem: (key, value) => enqueue(() => storage.setItem(key, value)),
      removeItem: (key) => enqueue(() => storage.removeItem(key)),
    });
  }
  return panelStorageClients.get(storage);
}
function withStoredPanel(Component, load) {
  return function StoredPanel(props) {
    const [state, setState] = React.useState(null);
    const [attempt, retry] = React.useState(0);
    React.useEffect(() => {
      let current = true;
      setState(null);
      Promise.resolve().then(() => load(panelStorage(props.sdk))).then(
        (saved) => { if (current) setState({sdk: props.sdk, saved}); },
        (error) => { if (current) setState({sdk: props.sdk, error: String(error?.message || error)}); },
      );
      return () => { current = false; };
    }, [props.sdk, attempt]);
    if (state?.error) return React.createElement("div", {role: "alert"}, state.error, React.createElement("button", {onClick: () => retry(n => n + 1)}, "Retry loading saved settings"));
    if (state?.sdk !== props.sdk) return React.createElement("div", {role: "status"}, "Loading saved settings…");
    return React.createElement(Component, {...props, saved: state.saved});
  };
}
// panel-storage:end


type Hit = {
  id: number;
  title: string;
  artist: string;
  bpm: number | null;
  len: number | null;
  slug: string;
  img: string;
  mp3: string;
  wf: string;
  moods: string[];
  kind?: string;
};
type LibEntry = {
  resourceId: string;
  slug: string;
  title: string;
  artist: string;
  len: number | null;
  bpm: number | null;
  file: string;
  path: string;
  folder: string;
  kind: string;
  mp3: string;
  wf?: string;
  img: string;
  addedAt: string;
  note: string;
};
// `count` is undefined when this facet was not in the latest response's top
// list — that means UNKNOWN, not zero. The API only returns the top slice.
type Facet = { key: string; label: string; count?: number };
type LogRow = { name: string; ok: boolean; note: string };
type CardMsg = { tone: "error" | "success" | "muted"; text: string };
type Settings = {
  libraryFolder: string;
  signedIn: boolean | null;
  format: "mp3" | "wav";
  autoKind: "music" | "sfx";
};

const STATE_KEY = "epidemic-sound-search.v4";
const OLD_STATE_KEY = "epidemic-sound-search.v3";
// Older builds kept memos on their own; they are merged into the library.
const NOTES_FILE = "notes.json";
const LIBRARY_FILE = "library.json";
const PAGE_SIZE = 24;
// One assistant run per batch. Bigger batches risk the run timing out.
const MAX_BATCH = 8;

const AUDIO_EXT = /\.(mp3|wav|aif|aiff|m4a|flac|aac|ogg|opus)$/i;
const PARTIAL_EXT = /\.(crdownload|part|download)$/i;

const q = (s: string) => "'" + String(s).replace(/'/g, "'\\''") + "'";

// ---- host commands -------------------------------------------------------
// Every host step exists twice: a POSIX command for macOS (run by the user's
// login shell) and a PowerShell script for Windows. On Windows Selects writes
// each command into a cmd.exe batch file whose PATH holds only System32 and
// whose HOME/USERPROFILE are a throwaway per-call folder. So the Windows side
// never uses HOME, python or bash: it starts Windows PowerShell 5.1 by its
// full path, and PowerShell reads its script from the tail of that same batch
// file. cmd stops at `exit /b` and never parses the tail, so no quoting or %
// escaping applies there. Values are passed base64-encoded (psv) for the same
// reason. Data lives next to SELECTS_USER_SKILLS_ROOT, which does persist.

const IS_WIN = (() => {
  try {
    const n: any = navigator;
    return (
      /^win/i.test(String(n.platform || "")) ||
      /Windows NT/i.test(String(n.userAgent || ""))
    );
  } catch {
    return false;
  }
})();

const SEP = IS_WIN ? "\\" : "/";
const baseName = (p: string) => String(p || "").split(/[\\/]/).pop() || "";
const joinPath = (dir: string, name: string) =>
  String(dir || "").replace(/[\\/]+$/, "") + SEP + name;
// Drop trailing separators, but keep a bare drive root ("C:\") a root.
const trimFolder = (p: string) => {
  const s = String(p || "").trim();
  const t = s.replace(/[\\/]+$/, "");
  if (!t) return s;
  return /^[A-Za-z]:$/.test(t) ? t + "\\" : t;
};

const b64utf8 = (s: string) => btoa(unescape(encodeURIComponent(String(s))));
const psv = (s: string) => "(D '" + b64utf8(s) + "')";

const PS_PRELUDE = [
  "$ErrorActionPreference='Stop'",
  "$ProgressPreference='SilentlyContinue'",
  "$U8=[Text.UTF8Encoding]::new($false)",
  "try{[Console]::OutputEncoding=$U8}catch{}",
  "[void][Reflection.Assembly]::Load('System.Web.Extensions, Version=4.0.0.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35')",
  "$J=[Web.Script.Serialization.JavaScriptSerializer]::new()",
  "$J.MaxJsonLength=[int]::MaxValue",
  "function D($s){$U8.GetString([Convert]::FromBase64String($s))}",
  "function W($s){[Console]::Out.Write([string]$s);[Console]::Out.Flush()}",
  "function G($o,$k){if($o -is [Collections.IDictionary] -and $o.ContainsKey($k)){,$o[$k]}}",
  "function HOMEDIR{$h=[Microsoft.Win32.Registry]::GetValue('HKEY_CURRENT_USER\\Volatile Environment','USERPROFILE',$null);if(-not $h){$h=[Environment]::GetFolderPath('UserProfile')};$h}",
  "$R=$env:SELECTS_USER_SKILLS_ROOT",
  "$DATA=if($R){[IO.Path]::Combine([IO.Path]::GetDirectoryName($R.TrimEnd('\\','/')),'plugin-data','epidemic-sound-search')}else{[IO.Path]::Combine((HOMEDIR),'.selects','plugin-data','epidemic-sound-search')}",
  "$TMPD=$env:TEMP;if(-not $TMPD){$TMPD=[IO.Path]::GetTempPath()};[void][IO.Directory]::CreateDirectory($TMPD)",
  "$CURL=[IO.Path]::Combine($env:SystemRoot,'System32','curl.exe')",
  "function FETCH($u,$s){$f=[IO.Path]::Combine($TMPD,[guid]::NewGuid().ToString('N'));& $CURL -s -L -m $s -o $f $u;if($LASTEXITCODE -ne 0 -or -not [IO.File]::Exists($f)){throw ('download failed (curl '+$LASTEXITCODE+')')};$b=[IO.File]::ReadAllBytes($f);[IO.File]::Delete($f);,$b}",
].join("\n");

const PS_EXE = "%SystemRoot%\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
const winCmd = (body: string) =>
  [
    'set "ES_SELF=%~f0"',
    '"' + PS_EXE + '" -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command ' +
      "\"$t=[IO.File]::ReadAllText($env:ES_SELF);$m='#ES'+'-PS#';" +
      "& ([ScriptBlock]::Create($t.Substring($t.IndexOf($m,[StringComparison]::Ordinal)+$m.Length)))\"",
    "exit /b %ERRORLEVEL%",
    "#ES-PS#",
    PS_PRELUDE,
    body,
  ].join("\r\n");

const MAC_DATA = '"$HOME/.selects/plugin-data/epidemic-sound-search"';
const macData = (name: string) =>
  '"$HOME/.selects/plugin-data/epidemic-sound-search/' + name + '"';
const winData = (name: string) => "[IO.Path]::Combine($DATA,'" + name + "')";

// Audio files AND in-progress partials in Downloads, as mtime|size|path.
const SCAN =
  'find "$HOME/Downloads" -maxdepth 1 -type f ' +
  '\\( -iname "*.mp3" -o -iname "*.wav" -o -iname "*.aif" -o -iname "*.aiff" ' +
  '-o -iname "*.m4a" -o -iname "*.flac" -o -iname "*.aac" -o -iname "*.ogg" ' +
  '-o -iname "*.opus" -o -iname "*.crdownload" -o -iname "*.part" ' +
  '-o -iname "*.download" \\) -exec stat -f "%m|%z|%N" {} \\; 2>/dev/null; true';
const WIN_SCAN = [
  "$p=[Microsoft.Win32.Registry]::GetValue('HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Shell Folders','{374DE290-123F-4565-9164-39C4925E467B}',$null)",
  "if(-not $p){$p=[IO.Path]::Combine((HOMEDIR),'Downloads')}",
  "$rx='\\.(mp3|wav|aif|aiff|m4a|flac|aac|ogg|opus|crdownload|part|download)$'",
  "$ep=[datetime]::new(1970,1,1,0,0,0,[DateTimeKind]::Utc);$sb=[Text.StringBuilder]::new()",
  "if([IO.Directory]::Exists($p)){foreach($f in [IO.Directory]::GetFiles($p)){if($f -match $rx){$i=[IO.FileInfo]::new($f);[void]$sb.Append([string][int64][Math]::Floor(($i.LastWriteTimeUtc-$ep).TotalSeconds)).Append('|').Append([string]$i.Length).Append('|').Append($f).Append(\"`n\")}}}",
  "W $sb.ToString()",
].join("\n");

// The search payload reduced to what the panel shows (same output as REDUCE).
const WIN_REDUCE = [
  "$m=G $d 'meta';$tr=G (G $d 'entities') 'tracks'",
  "$out=[Collections.ArrayList]::new()",
  "foreach($h in (G $m 'hits')){",
  " $t=G $tr ([string](G $h 'trackId'));if(-not $t){continue}",
  " $c=G $t 'creatives';$ma=G $c 'mainArtists';if(-not $ma){$ma=G $c 'composers'}",
  " $nm=@();foreach($a in $ma){if($nm.Count -ge 2){break};$nm+=[string](G $a 'name')}",
  " $st=G (G $t 'stems') 'full';$ca=G $t 'coverArt';$sz=G $ca 'sizes';$base=[string](G $ca 'baseUrl');$xs=[string](G $sz 'XS')",
  " if($base -and $xs){$img=$base+$xs}else{$img=G $t 'cover';if(-not $img){$img=G $t 'imageUrl'};if(-not $img){$img=''}}",
  " $md=@();foreach($x in (G $t 'moods')){if($md.Count -ge 3){break};$md+=[string](G $x 'displayTag')}",
  " $ti=G $t 'title';if($null -eq $ti){$ti=''}",
  " [void]$out.Add(@{id=(G $t 'id');title=$ti;artist=($nm -join ', ');bpm=(G $t 'bpm');len=(G $t 'length');slug=[string](G $t 'publicSlug');img=[string]$img;mp3=[string](G $st 'lqMp3Url');wf=[string](G $st 'waveformUrl');moods=[object[]]$md})",
  " if($out.Count -ge 24){break}",
  "}",
  "function FAC($n,$k){$r=[Collections.ArrayList]::new();$v=G (G $m 'aggregations') $n;if($v -is [array]){$i=0;foreach($x in $v){if($i -ge $k){break};$i++;if($x -isnot [Collections.IDictionary]){continue};$key=[string](G $x 'key');$lab=G $x 'displayKey';if(-not $lab){$lab=$key};$cnt=G $x 'count';if(-not $cnt){$cnt=0};[void]$r.Add(@{key=$key;label=[string]$lab;count=$cnt})}};,$r}",
  "$th=G $m 'totalHits';if(-not $th){$th=0};$tp=G $m 'totalPages';if(-not $tp){$tp=0}",
  "W ($J.Serialize(@{items=$out;totalHits=$th;totalPages=$tp;genres=(FAC 'genres' 30);moods=(FAC 'moods' 30)}))",
].join("\n");

// Waveform peaks reduced to 160 bars (same output as WAVE). PowerShell
// variable names are case-insensitive: $n and $N are the same variable.
const WIN_WAVE = [
  "$d=G $w 'data';if(-not $d){$d=@()};$bits=G $w 'bits';if(-not $bits){$bits=8}",
  "$pk=[double]((1 -shl ([int]$bits-1))-1);if(-not $pk){$pk=127.0}",
  "$BARS=160;$cnt=$d.Count;$pairs=[Math]::Floor($cnt/2);$o=[Collections.ArrayList]::new()",
  "if($pairs -gt 0){$step=[int][Math]::Max(1,[Math]::Floor($pairs/$BARS));for($i=0;$i -lt $pairs;$i+=$step){$a=$i*2;$e=[Math]::Min(($i+$step)*2,$cnt);if($e -le $a){continue};$hi=[double]$d[$a];$lo=$hi;for($k=$a+1;$k -lt $e;$k++){$v=[double]$d[$k];if($v -gt $hi){$hi=$v};if($v -lt $lo){$lo=$v}};[void]$o.Add([Math]::Round([Math]::Max([Math]::Abs($hi),[Math]::Abs($lo))/$pk,3));if($o.Count -ge $BARS){break}}}",
  "W ($J.Serialize($o))",
].join("\n");

// Waveform bars from a saved audio file on disk, for My tracks entries with
// no Epidemic waveform URL. Uses ffmpeg from the user's PATH when present;
// otherwise reads 8/16/24/32-bit PCM or float WAV directly. $f is the file.
const WIN_LOCAL_WAVE = [
  "$BARS=160;$amp=[Collections.ArrayList]::new()",
  "$dirs=@([Environment]::GetEnvironmentVariable('Path','User'),[Environment]::GetEnvironmentVariable('Path','Machine'),$env:Path) -join ';'",
  "$ff=$null;foreach($p in $dirs.Split(';')){if(-not $p){continue};try{$c=[IO.Path]::Combine($p.Trim().Trim([char]34),'ffmpeg.exe');if([IO.File]::Exists($c)){$ff=$c;break}}catch{}}",
  "$done=$false",
  "if($ff){try{$tmp=[IO.Path]::Combine($TMPD,[guid]::NewGuid().ToString('N')+'.pcm');& $ff -v error -y -i $f -ac 1 -ar 2000 -f s16le $tmp 2>$null;if([IO.File]::Exists($tmp)){$pcm=[IO.File]::ReadAllBytes($tmp);[IO.File]::Delete($tmp);$cnt=[Math]::Floor($pcm.Length/2);if($cnt -gt 0){$step=[int][Math]::Max(1,[Math]::Floor($cnt/$BARS));$hop=[int][Math]::Max(1,[Math]::Floor($step/400));for($i=0;$i -lt $cnt;$i+=$step){$mx=0;$e=[Math]::Min($i+$step,$cnt);for($k=$i;$k -lt $e;$k+=$hop){$v=[Math]::Abs([int][BitConverter]::ToInt16($pcm,$k*2));if($v -gt $mx){$mx=$v}};[void]$amp.Add([double]$mx);if($amp.Count -ge $BARS){break}};$done=$true}}}catch{}}",
  "if(-not $done -and $f -match '\\.wav$'){",
  " $fs=[IO.File]::OpenRead($f);$br=[IO.BinaryReader]::new($fs)",
  " try{",
  "  $asc=[Text.Encoding]::ASCII",
  "  if($asc.GetString($br.ReadBytes(4)) -ne 'RIFF'){throw 'not wav'};[void]$br.ReadUInt32();if($asc.GetString($br.ReadBytes(4)) -ne 'WAVE'){throw 'not wav'}",
  "  $fmt=0;$ch=0;$bits=0;$doff=-1;$dlen=0",
  "  while($fs.Position+8 -le $fs.Length){$id=$asc.GetString($br.ReadBytes(4));$sz=[int64]$br.ReadUInt32();$st=$fs.Position",
  "   if($id -eq 'fmt '){$fmt=[int]$br.ReadUInt16();$ch=[int]$br.ReadUInt16();[void]$br.ReadUInt32();[void]$br.ReadUInt32();[void]$br.ReadUInt16();$bits=[int]$br.ReadUInt16();if($fmt -eq 65534 -and $sz -ge 26){[void]$br.ReadUInt16();[void]$br.ReadUInt16();[void]$br.ReadUInt32();$fmt=[int]$br.ReadUInt16()}}",
  "   elseif($id -eq 'data'){$doff=$st;$dlen=[Math]::Min($sz,$fs.Length-$st);break}",
  "   $fs.Position=$st+$sz+($sz%2)}",
  "  $by=[int]($bits/8);$bpf=$by*$ch",
  "  if($doff -lt 0 -or $bpf -le 0 -or ($fmt -ne 1 -and $fmt -ne 3)){throw 'unsupported wav'}",
  "  $frames=[int64][Math]::Floor($dlen/$bpf)",
  "  if($frames -gt 0){for($i=0;$i -lt $BARS;$i++){$a=[int64][Math]::Floor($i*$frames/$BARS);$e=[int64][Math]::Floor(($i+1)*$frames/$BARS);if($e -le $a){$e=$a+1};$hop=[int64][Math]::Max(1,[Math]::Floor(($e-$a)/200));$mx=0.0",
  "   for($k=$a;$k -lt $e;$k+=$hop){$fs.Position=$doff+$k*$bpf;$x=$br.ReadBytes($by);if($x.Length -lt $by){break}",
  "    if($fmt -eq 3 -and $by -eq 4){$v=[double][BitConverter]::ToSingle($x,0)}elseif($by -eq 2){$v=[BitConverter]::ToInt16($x,0)/32768.0}elseif($by -eq 3){$t=[int]$x[0] -bor ([int]$x[1] -shl 8) -bor ([int]$x[2] -shl 16);if($t -ge 8388608){$t-=16777216};$v=$t/8388608.0}elseif($by -eq 4){$v=[BitConverter]::ToInt32($x,0)/2147483648.0}elseif($by -eq 1){$v=([int]$x[0]-128)/128.0}else{throw 'unsupported wav'}",
  "    $v=[Math]::Abs($v);if($v -gt $mx){$mx=$v}}",
  "   [void]$amp.Add($mx)}}",
  " }catch{}finally{$br.Close();$fs.Close()}",
  "}",
  "$top=0.0;foreach($v in $amp){if($v -gt $top){$top=$v}}",
  "$o=[Collections.ArrayList]::new();foreach($v in $amp){if($top -gt 0){[void]$o.Add([Math]::Round($v/$top,3))}else{[void]$o.Add(0)}}",
  "W ($J.Serialize($o))",
].join("\n");

// One builder per host step. Each returns the command for this platform.
const HOST = {
  readData: (name: string) =>
    IS_WIN
      ? winCmd("$f=" + winData(name) + ";if([IO.File]::Exists($f)){W ([IO.File]::ReadAllText($f,$U8))}")
      : "cat " + macData(name) + " 2>/dev/null || true",
  readDataChunk: (name: string, off: number, piece: number) =>
    IS_WIN
      ? winCmd(
          "$f=" + winData(name) + ";if([IO.File]::Exists($f)){$b=[IO.File]::ReadAllBytes($f);$o=" +
            Math.floor(off) +
            ";if($o -lt $b.Length){W ([Convert]::ToBase64String($b,$o,[Math]::Min(" +
            Math.floor(piece) +
            ",$b.Length-$o)))}}",
        )
      : "[ -f " + macData(name) + " ] && tail -c +" + (off + 1) + " " + macData(name) +
        " | head -c " + piece + " | base64 | tr -d '\\n' || true",
  listLibraryFolder: (folder: string) =>
    IS_WIN
      ? winCmd(
          "$l=" + psv(folder) +
            ";if([IO.Directory]::Exists($l)){$o=@();foreach($f in [IO.Directory]::GetFiles($l)){$n=[IO.Path]::GetFileName($f);if($n -cmatch '^ES_.*\\.(mp3|wav)$'){$o+=$n}};W ($o -join \"`n\")}",
        )
      : "cd " + q(folder) + " 2>/dev/null && ls -1 | grep -E '^ES_.*\\.(mp3|wav)$' || true",
  writeSettings: (json: string, folder: string) =>
    IS_WIN
      ? winCmd(
          "[void][IO.Directory]::CreateDirectory($DATA);$l=" + psv(folder) +
            ";if($l){[void][IO.Directory]::CreateDirectory($l)};[IO.File]::WriteAllText(" +
            winData("settings.json") + "," + psv(json) + ",$U8)",
        )
      : "mkdir -p " + MAC_DATA + " && " +
        (folder ? "mkdir -p " + q(folder) + " && " : "") +
        "cat > " + macData("settings.json") + " <<'JSONEOF'\n" + json + "\nJSONEOF",
  chooseFolder: () =>
    IS_WIN
      ? winCmd(
          [
            "[void][Reflection.Assembly]::Load('System.Windows.Forms, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089')",
            "$w=[Windows.Forms.Form]::new();$w.TopMost=$true;$w.ShowInTaskbar=$false",
            "$d=[Windows.Forms.FolderBrowserDialog]::new();$d.Description='Choose your Epidemic Sound library folder';$d.ShowNewFolderButton=$true",
            "if($d.ShowDialog($w) -eq [Windows.Forms.DialogResult]::OK){W $d.SelectedPath}",
            "$w.Dispose()",
          ].join("\n"),
        )
      : "osascript -e 'POSIX path of (choose folder with prompt \"Choose your Epidemic Sound library folder\")'",
  homeDir: () => (IS_WIN ? winCmd("W (HOMEDIR)") : 'printf %s "$HOME"'),
  writeLibraryChunk: (part: string, first: boolean) =>
    IS_WIN
      ? winCmd(
          "[void][IO.Directory]::CreateDirectory($DATA);$t=" + winData("library.json.tmp") + ";" +
            (first ? "[IO.File]::WriteAllBytes($t,[byte[]]@());" : "") +
            "$b=[Convert]::FromBase64String('" + part + "');" +
            "$s=[IO.File]::Open($t,[IO.FileMode]::Append,[IO.FileAccess]::Write);try{$s.Write($b,0,$b.Length)}finally{$s.Close()}",
        )
      : (first
          ? "mkdir -p " + MAC_DATA + " && : > " + macData("library.json.tmp") + " && "
          : "") +
        "printf %s '" + part + "' | base64 -D >> " + macData("library.json.tmp"),
  // Only replace the real file once the copy is complete and valid JSON.
  commitLibrary: () =>
    IS_WIN
      ? winCmd(
          "$t=" + winData("library.json.tmp") + ";$f=" + winData("library.json") +
            ";[void]$J.DeserializeObject([IO.File]::ReadAllText($t,$U8));[IO.File]::Copy($t,$f,$true);[IO.File]::Delete($t)",
        )
      : "python3 -c 'import json,sys; json.load(open(sys.argv[1]))' " +
        macData("library.json.tmp") + " && mv " + macData("library.json.tmp") + " " +
        macData("library.json"),
  reveal: (path: string) =>
    IS_WIN
      ? winCmd(
          "$p=" + psv(path) +
            ";if(-not([IO.File]::Exists($p) -or [IO.Directory]::Exists($p))){throw 'file not found'}" +
            ";$si=[Diagnostics.ProcessStartInfo]::new([IO.Path]::Combine($env:SystemRoot,'explorer.exe'),'/select,\"'+$p+'\"');$si.WorkingDirectory=$env:SystemRoot;$si.UseShellExecute=$false;[void][Diagnostics.Process]::Start($si)",
        )
      : "open -R " + q(path),
  // Keys whose file is gone, one per line.
  missingFiles: (pairs: [string, string][]) =>
    IS_WIN
      ? winCmd(
          "$L=$J.DeserializeObject(" + psv(JSON.stringify(pairs)) +
            ");$o=@();foreach($x in $L){$p=[string]$x[1];if(-not([IO.File]::Exists($p) -or [IO.Directory]::Exists($p))){$o+=[string]$x[0]}};W ($o -join \"`n\")",
        )
      : "while IFS=$'\\t' read -r k p; do [ -e \"$p\" ] || printf '%s\\n' \"$k\"; done <<'LISTEOF'\n" +
        pairs.map(([k, p]) => k + "\t" + p).join("\n") +
        "\nLISTEOF",
  search: (url: string) =>
    IS_WIN
      ? winCmd("$d=$J.DeserializeObject($U8.GetString((FETCH " + psv(url) + " 25)))\n" + WIN_REDUCE)
      : "curl -s -m 25 " + q(url) + " | python3 -c " + q(REDUCE),
  waveform: (url: string) =>
    IS_WIN
      ? winCmd("$w=$J.DeserializeObject($U8.GetString((FETCH " + psv(url) + " 15)))\n" + WIN_WAVE)
      : "curl -s -m 15 " + q(url) + " | python3 -c " + q(WAVE),
  // Peaks from a local file (same output as WAVE). macOS decodes with ffmpeg
  // (Selects ships one as a PATH fallback) and reduces with PCM_WAVE.
  localWaveform: (path: string) =>
    IS_WIN
      ? winCmd("$f=" + psv(path) + "\n" + WIN_LOCAL_WAVE)
      : "ffmpeg -v error -i " + q(path) + " -ac 1 -ar 2000 -f s16le - | python3 -c " + q(PCM_WAVE),
  coverArt: (url: string) =>
    IS_WIN
      ? winCmd("W ([Convert]::ToBase64String((FETCH " + psv(url) + " 15)))")
      : "curl -s -m 15 " + q(url) + " | base64 | tr -d '\\n'",
  scanDownloads: () => (IS_WIN ? winCmd(WIN_SCAN) : SCAN),
  // Moves src into the library folder without overwriting; prints the new path.
  moveIntoLibrary: (src: string, lib: string) =>
    IS_WIN
      ? winCmd(
          [
            "$src=" + psv(src) + ";$lib=" + psv(lib),
            "if(-not [IO.File]::Exists($src)){throw 'file not found'}",
            "[void][IO.Directory]::CreateDirectory($lib)",
            "$base=[IO.Path]::GetFileName($src);$stem=[IO.Path]::GetFileNameWithoutExtension($base);$ext=[IO.Path]::GetExtension($base)",
            "$dest=[IO.Path]::Combine($lib,$base);$i=1",
            "while([IO.File]::Exists($dest) -or [IO.Directory]::Exists($dest)){$dest=[IO.Path]::Combine($lib,$stem+'-'+$i+$ext);$i++}",
            "[IO.File]::Move($src,$dest)",
            "W $dest",
          ].join("\n"),
        )
      : "set -e\nsrc=" + q(src) + "\nlib=" + q(lib) +
        '\n[ -f "$src" ] || { echo "file not found" >&2; exit 3; }' +
        '\nmkdir -p "$lib"\nbase=$(basename "$src")\nstem="${base%.*}"\next="${base##*.}"' +
        '\ndest="$lib/$base"\ni=1\nwhile [ -e "$dest" ]; do dest="$lib/$stem-$i.$ext"; i=$((i+1)); done' +
        '\nmv "$src" "$dest"\nprintf %s "$dest"',
};

// Trims the search payload to what the panel shows, plus the facet lists the
// filter dropdowns are built from, so it stays inside the shell output limit.
const REDUCE = [
  "import sys,json",
  "d=json.load(sys.stdin)",
  'm=d.get("meta") or {}',
  'tr=(d.get("entities") or {}).get("tracks") or {}',
  'order=[str(h.get("trackId")) for h in (m.get("hits") or [])]',
  "out=[]",
  "for k in order:",
  "    t=tr.get(k)",
  "    if not t: continue",
  '    c=t.get("creatives") or {}',
  '    ma=(c.get("mainArtists") or c.get("composers") or [])',
  '    names=", ".join([a.get("name","") for a in ma][:2])',
  '    st=(t.get("stems") or {}).get("full") or {}',
  '    ca=t.get("coverArt") or {}',
  '    sz=ca.get("sizes") or {}',
  '    base=ca.get("baseUrl") or ""',
  '    img=(base+sz.get("XS","")) if base and sz.get("XS") else (t.get("cover") or t.get("imageUrl") or "")',
  '    out.append({"id":t.get("id"),"title":t.get("title",""),"artist":names,',
  '      "bpm":t.get("bpm"),"len":t.get("length"),"slug":t.get("publicSlug",""),',
  '      "img":img,"mp3":st.get("lqMp3Url",""),"wf":st.get("waveformUrl",""),',
  '      "moods":[x.get("displayTag","") for x in (t.get("moods") or [])][:3]})',
  "    if len(out)>=24: break",
  "def facet(name,n):",
  '    v=(m.get("aggregations") or {}).get(name)',
  "    if not isinstance(v,list): return []",
  "    r=[]",
  "    for x in v[:n]:",
  "        if not isinstance(x,dict): continue",
  '        r.append({"key":str(x.get("key")),"label":str(x.get("displayKey") or x.get("key")),"count":x.get("count") or 0})',
  "    return r",
  'print(json.dumps({"items":out,"totalHits":m.get("totalHits") or 0,',
  '  "totalPages":m.get("totalPages") or 0,"genres":facet("genres",30),',
  '  "moods":facet("moods",30)}))',
].join("\n");

// Epidemic ships 8-bit min/max peak pairs; reduce them to normalised bars.
// Peaks from 2 kHz mono 16-bit PCM on stdin, normalised to the loudest bar.
const PCM_WAVE = [
  "import sys,array",
  'a=array.array("h")',
  "b=sys.stdin.buffer.read()",
  "a.frombytes(b[:len(b)//2*2])",
  "n=len(a)",
  "N=160",
  "out=[]",
  "if n:",
  "    step=max(1,n//N)",
  "    for i in range(0,n,step):",
  "        seg=a[i:i+step]",
  "        if not seg: continue",
  "        out.append(max(abs(max(seg)),abs(min(seg))))",
  "        if len(out)>=N: break",
  "m=max(out) if out else 0",
  'print("["+",".join(str(round(v/m,3) if m else 0) for v in out)+"]")',
].join("\n");

const WAVE = [
  "import sys,json",
  "w=json.load(sys.stdin)",
  'd=w.get("data") or []',
  'bits=w.get("bits") or 8',
  "peak=float((1<<(bits-1))-1) or 127.0",
  "N=160",
  "pairs=len(d)//2",
  "out=[]",
  "if pairs:",
  "    step=max(1,pairs//N)",
  "    for i in range(0,pairs,step):",
  "        seg=d[i*2:(i+step)*2]",
  "        if not seg: continue",
  "        out.append(round(max(abs(max(seg)),abs(min(seg)))/peak,3))",
  "        if len(out)>=N: break",
  "print(json.dumps(out))",
].join("\n");


// Only the progress percentage depends on these; completion does not.
// MP3 measured across five real Epidemic downloads (19.5k-35.3k B/s);
// WAV is 48 kHz / 24-bit stereo.
const BYTES_PER_SEC = { mp3: 31000, wav: 288000 };

const LOGIN_URL = "https://www.epidemicsound.com/login/?next=%2Fmusic%2F";

// Facets describe the CURRENT results, so a plain replace made options come
// and go as you filtered — and could even hide a chip that was still applied.
// Keep the union, selected first, so the palette stays stable.
const mergeFacets = (prev: Facet[], next: Facet[], selected: string[]) => {
  const map = new Map<string, Facet>();
  prev.forEach((f) => map.set(f.key, { ...f, count: undefined }));
  next.forEach((f) => map.set(f.key, f));
  selected.forEach((k) => {
    if (!map.has(k)) map.set(k, { key: k, label: k });
  });
  const all = [...map.values()];
  const isSel = (f: Facet) => selected.includes(f.key);
  const n = (f: Facet) => (typeof f.count === "number" ? f.count : -1);
  const byCount = (a: Facet, b: Facet) =>
    n(b) - n(a) || a.label.localeCompare(b.label);
  const picked = all.filter(isSel).sort(byCount);
  const rest = all.filter((f) => !isSel(f)).sort(byCount);
  return picked.concat(rest.slice(0, Math.max(0, 40 - picked.length)));
};

const BPM_PRESETS = [
  { value: "any", label: "Any tempo", min: 0, max: 0 },
  { value: "slow", label: "Slow · under 80", min: 40, max: 80 },
  { value: "medium", label: "Medium · 80–120", min: 80, max: 120 },
  { value: "fast", label: "Fast · 120–160", min: 120, max: 160 },
  { value: "veryfast", label: "Very fast · 160+", min: 160, max: 220 },
];

const presetFor = (min: number, max: number) => {
  const hit = BPM_PRESETS.find((b) => b.min === min && b.max === max);
  if (hit) return hit.value;
  return min || max ? "custom" : "any";
};

// The Select reserves "" for "nothing selected", so the "Any …" row needs a
// real value of its own; it is translated back to "no filter" on change.
const ANY = "__any";

const nf = (n?: number) =>
  typeof n === "number" && n > 0 ? " (" + n.toLocaleString() + ")" : "";

const trackUrl = (slug: string) =>
  "https://www.epidemicsound.com/track/" + slug + "/";

const mmss = (s: number | null) => {
  if (!s && s !== 0) return "";
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return m + ":" + String(r).padStart(2, "0");
};

// Lower-case letters and digits only, for matching a title to a file name.
const norm = (s: string) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

// Epidemic names downloads "ES_<title> - <artist>.<ext>".
const parseFileName = (name: string) => {
  const stem = name.replace(/\.[^.]+$/, "").replace(/-\d+$/, "");
  const m = stem.match(/^ES_(.+?) - (.+)$/);
  if (m) return { title: m[1], artist: m[2] };
  return { title: stem.replace(/^ES_/, ""), artist: "" };
};

// Epidemic Sound DOES show a dialog. The track page's Download button only
// opens "Download music track" (Full track/Segment, Full mix/Stems, and a
// WAV|MP3 file-format select); the download starts on the dialog's own
// Download button. The whole list goes to ONE assistant run, so saving eight
// tracks opens one chat instead of eight. The run reports each file's saved
// path from the browser's own download event, so the panel never has to
// guess which new file in Downloads belongs to which track.
const downloadPrompt = (
  items: { title: string; url: string }[],
  format: "mp3" | "wav",
  preloaded: boolean,
) => {
  const F = format.toUpperCase();
  const other = format === "mp3" ? "WAV" : "MP3";
  // Speed matters more than anything here: every extra snapshot or reply is
  // seconds the user waits. So the run gets finished code to paste into ONE
  // browser_repl call per track, and only falls back to looking at the page
  // when that code throws.
  const code = [
    "return await (async () => {",
    "const urls = URLS_HERE;",
    "const esPage = await openTab(urls[0]);",
    "const out = [];",
    "for (const url of urls) {",
    "  try {",
    "    if (esPage.url() !== url) await esPage.goto(url);",
    "    await esPage.getByRole('button', { name: /^download/i }).first().click();",
    "    const dlg = esPage.getByRole('dialog').filter({ hasText: /download/i }).first();",
    "    await dlg.waitFor();",
    "    if (/\\b" + other + "\\b/.test(await dlg.innerText())) {",
    "      await dlg.getByText(/^" + other + "$/).first().click();",
    "      await esPage.getByText(/^" + F + "$/).last().click();",
    "    }",
    "    const got = esPage.waitForEvent('download', { timeout: 90000 });",
    "    await dlg.getByRole('button', { name: /^download$/i }).last().click();",
    "    const d = await got;",
    "    out.push({ url, path: await d.path() });",
    "  } catch (e) {",
    "    out.push({ url, error: String(e?.message ?? e).slice(0, 200) });",
    "    try { await esPage.keyboard.press('Escape'); } catch {}",
    "  }",
    "}",
    "try { await esPage.close(); } catch {}",
    "return out;",
    "})();",
  ].join("\n");
  return (
    "SPEED IS THE ONLY PRIORITY. Your very first action must be the single " +
    "browser_repl call below. Before it, do NOT load or read any skill, " +
    "guide or docs, do NOT use run_script, run_shell or any project tool, " +
    "and do NOT plan out loud. This is a plain website download, not a " +
    "video edit: ignore any advice about Drafts or the run_script SDK.\n\n" +
    "Download " +
    items.length +
    " Epidemic Sound track(s) in " +
    F +
    " using the Selects browser's signed-in session. No narration, no " +
    "screenshots, no verification beyond what is asked, and keep the " +
    "browser hidden. Close every tab you open before replying" +
    (preloaded ? " (a tab is already on the first track)" : "") +
    ".\n\nTracks, in order:\n" +
    items.map((it, i) => i + 1 + ". \"" + it.title + "\" — " + it.url).join("\n") +
    "\n\nMake ONE browser_repl call with this code, replacing URLS_HERE with a " +
    "JSON array of the track URLs above, in order" +
    (format === "wav" ? " (WAV files are large: at most 2 URLs per call, so split into several calls)" : "") +
    ":\n```js\n" +
    code +
    "\n```\n" +
    "For each URL it opens the Download dialog, leaves Full track / Full mix " +
    "alone, sets the file format to " +
    F +
    ", clicks the dialog's own Download button and returns the saved path, " +
    "or an error for that URL.\n\n" +
    "For any URL that came back with an error, and only those: take ONE " +
    "interactive snapshot, then do the same steps by hand (track Download " +
    "button → in the \"Download music track\" dialog set File format to " +
    F +
    " if it reads " +
    other +
    " → start page.waitForEvent(\"download\") → click the dialog's Download " +
    "button, not Cancel → await the download's path()).\n\n" +
"If a sign-in, signup or free-account dialog appears, stop at once and " +
    "mark that track and every remaining one login-required. Never sign in, " +
    "create an account, buy or subscribe. An error from the code above is " +
    "NOT a failure yet: fall back to doing that track by hand as described. " +
    "Only if the browser tool refuses to run at all (for example \"More " +
    "than one Agent chat runtime is active\") mark the track failed and put " +
    "that exact message in why.\n\n" +
    "Reply with ONLY one line of JSON and no other text, one entry per track, " +
    "n being its number above: " +
    '{"results":[{"n":1,"status":"ok","path":"/absolute/path/to/file"},' +
    '{"n":2,"status":"failed","why":"short reason"},' +
    '{"n":3,"status":"login-required"}]}'
  );
};

// Pull the {"results":[…]} object out of the assistant's reply.
const parseResults = (text: string) => {
  const out = new Map<number, { status: string; path?: string; why?: string }>();
  const m = String(text || "").match(/\{[\s\S]*\}/);
  if (!m) return out;
  try {
    let j: any;
    try {
      j = JSON.parse(m[0]);
    } catch {
      // A Windows path written with single backslashes is not valid JSON.
      j = JSON.parse(m[0].replace(/\\(?!["\\/])/g, "\\\\"));
    }
    (Array.isArray(j?.results) ? j.results : []).forEach((r: any) => {
      const n = Number(r?.n);
      if (!n) return;
      out.set(n, {
        status: String(r?.status || ""),
        path: typeof r?.path === "string" ? r.path : undefined,
        why: typeof r?.why === "string" ? r.why : undefined,
      });
    });
  } catch {
    /* not JSON: the caller falls back to matching files by title */
  }
  return out;
};

// Everything the panel should still be showing when you come back to it.
const loadState = async (storage) => {
    const v4 = await storage.getItem(STATE_KEY);
    if (v4) return JSON.parse(v4) || {};
    const v3 = JSON.parse((await storage.getItem(OLD_STATE_KEY)) || "null") || {};
    // v3's "added" map pointed into whichever project imported a track; it
    // is rebuilt from the project itself now, so it is not carried over.
    delete v3.added;
    delete v3.log;
    return v3;
};

// Cover art is a disposable cache; bound it separately from the user's shortlist.
function savedThumbnails(thumbs) {
  const kept = {};
  let characters = 0;
  for (const [key, value] of Object.entries(thumbs).slice(-60).reverse()) {
    const size = key.length + String(value).length;
    if (characters + size > 512 * 1024) continue;
    kept[key] = value;
    characters += size;
  }
  return kept;
}

// A local file URL the host can stream, or "" when this build has none.
const localUrl = async (path: string) => {
  try {
    const fs = hostSdk.files;
    if (path && typeof fs?.pathToLocalURL === "function") {
      return String((await fs.pathToLocalURL(path)) || "");
    }
  } catch {
    /* no local URL */
  }
  return "";
};

// Waveform bars from a file on disk through the app's bundled ffmpeg (no
// shell, no user ffmpeg or python): 2 kHz mono 16-bit PCM into the app's temp
// folder, reduced like PCM_WAVE. null when this build lacks the services or
// the decode fails, so the caller can fall back to the shell command.
const reducePcmPeaks = (pcm: Int16Array): number[] => {
  const n = pcm.length;
  const out: number[] = [];
  if (n) {
    const step = Math.max(1, Math.floor(n / 160));
    for (let i = 0; i < n && out.length < 160; i += step) {
      let hi = -32768;
      let lo = 32767;
      for (let k = i, e = Math.min(i + step, n); k < e; k++) {
        if (pcm[k] > hi) hi = pcm[k];
        if (pcm[k] < lo) lo = pcm[k];
      }
      out.push(Math.max(Math.abs(hi), Math.abs(lo)));
    }
  }
  const m = out.reduce((a, v) => Math.max(a, v), 0);
  return out.map((v) => (m ? Math.round((v / m) * 1000) / 1000 : 0));
};

const hostLocalPeaks = async (path: string): Promise<number[] | null> => {
  let fs: any;
  let tmp = "";
  try {
    const rt = hostSdk.media;
    fs = hostSdk.files;
    if (
      !path ||
      typeof rt?.runFFmpeg !== "function" ||
      typeof fs?.getOrCreateTmpDirPath !== "function" ||
      typeof fs?.join !== "function" ||
      typeof fs?.readFile !== "function"
    ) {
      return null;
    }
    tmp = fs.join(
      (await fs.getOrCreateTmpDirPath()),
      "ess-wave-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + ".pcm"
    );
    await rt.runFFmpeg(
      ["-v", "error", "-y", "-i", path, "-ac", "1", "-ar", "2000", "-f", "s16le", tmp],
      true
    );
    // Copy first: the host's bytes come from another realm and may be offset.
    const bytes = new Uint8Array(await fs.readFile(tmp));
    const arr = reducePcmPeaks(new Int16Array(bytes.buffer, 0, bytes.length >> 1));
    return arr.length ? arr : null;
  } catch {
    return null;
  } finally {
    if (tmp && typeof fs?.removeFile === "function") {
      await fs.removeFile({ filePath: tmp }).catch(() => {});
    }
  }
};

const Wave = ({
  bars,
  at,
  onSeek,
}: {
  bars: number[];
  at: number;
  onSeek: (f: number) => void;
}) => {
  const ref = React.useRef<any>(null);
  React.useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const w = Math.max(80, c.clientWidth || 240);
    const h = 36;
    if (c.width !== w) c.width = w;
    if (c.height !== h) c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const cs = getComputedStyle(c);
    const played = cs.getPropertyValue("--panel-accent").trim() || "#7aa2f7";
    const rest = cs.getPropertyValue("--panel-muted-fg").trim() || "#8b8b8b";
    ctx.clearRect(0, 0, w, h);
    const n = bars.length || 1;
    const bw = w / n;
    for (let i = 0; i < n; i++) {
      const v = Math.max(0.04, bars[i] || 0);
      const bh = Math.max(1, v * (h - 4));
      ctx.fillStyle = i / n <= at ? played : rest;
      ctx.fillRect(i * bw, (h - bh) / 2, Math.max(1, bw - 1), bh);
    }
  }, [bars, at]);

  const seekFromEvent = (e: any) => {
    const c = ref.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    onSeek((e.clientX - rect.left) / Math.max(1, rect.width));
  };

  return (
    <canvas
      ref={ref}
      style={{ width: "100%", height: 36, cursor: "pointer", display: "block" }}
      onPointerDown={(e: any) => {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        seekFromEvent(e);
      }}
      onPointerMove={(e: any) => {
        if (e.buttons === 1) seekFromEvent(e);
      }}
    />
  );
};

// Selects' signature green, as drawn in the app's plugin list.
const SELECTS_GREEN = "#4BDE80";

const cardStyle = {
  border: "1px solid var(--panel-border)",
  borderRadius: "var(--panel-radius)",
  padding: 8,
  minWidth: 0,
};
const titleStyle = {
  fontWeight: 600,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap" as const,
};
const muted = { color: "var(--panel-muted-fg)" };

function Panel({ sdk, context, ui, saved }) {
  hostUseSdk(sdk);

  // ---- settings (one file, always written whole) ---------------------------
  const [settings, setSettings] = React.useState<Settings>({
    libraryFolder: "",
    signedIn: null,
    format: "mp3",
    autoKind: "music",
  });
  const settingsRef = React.useRef(settings);
  settingsRef.current = settings;
  const [libDraft, setLibDraft] = React.useState("");
  const savedLib = settings.libraryFolder;
  const signedIn = settings.signedIn;

  // ---- browse --------------------------------------------------------------
  const [kind, setKind] = React.useState<string>(saved.kind ?? "music");
  const [term, setTerm] = React.useState<string>(saved.term ?? "");
  const [hits, setHits] = React.useState<Hit[]>(saved.hits ?? []);
  const [page, setPage] = React.useState<number>(saved.page ?? 1);
  const [totalHits, setTotalHits] = React.useState<number>(saved.totalHits ?? 0);
  const [totalPages, setTotalPages] = React.useState<number>(
    saved.totalPages ?? 0,
  );
  const [genreFacets, setGenreFacets] = React.useState<Facet[]>(
    saved.genreFacets ?? [],
  );
  const [moodFacets, setMoodFacets] = React.useState<Facet[]>(
    saved.moodFacets ?? [],
  );
  const [selGenres, setSelGenres] = React.useState<string[]>(
    saved.selGenres ?? [],
  );
  const [selMoods, setSelMoods] = React.useState<string[]>(saved.selMoods ?? []);
  const [vocals, setVocals] = React.useState<string>(saved.vocals ?? "any");
  const [bpmMin, setBpmMin] = React.useState<number>(saved.bpmMin ?? 0);
  const [bpmMax, setBpmMax] = React.useState<number>(saved.bpmMax ?? 0);
  // The download list: tracks picked for the next batch. Kept across
  // searches and panel reloads, so it doubles as a shortlist.
  const [queue, setQueue] = React.useState<Hit[]>(saved.queue ?? []);

  // ---- ui state --------------------------------------------------------------
  const [tab, setTab] = React.useState<string>("browse");
  const [placeAt, setPlaceAt] = React.useState<string>(saved.placeAt ?? "start");
  const [log, setLog] = React.useState<LogRow[]>([]);
  // The result of the last save, kept on screen (and across reloads) until
  // dismissed, so someone who stepped away can see what happened.
  const [lastSave, setLastSave] = React.useState<{
    at: string;
    saved: string[];
    failed: string[];
  } | null>(saved.lastSave ?? null);
  const [playing, setPlaying] = React.useState("");
  const [progress, setProgress] = React.useState(0);
  const [watching, setWatching] = React.useState(false);
  const [busy, setBusy] = React.useState("");
  const [note, setNote] = React.useState("");
  const [err, setErr] = React.useState("");
  const [cardMsg, setCardMsg] = React.useState<Record<string, CardMsg>>({});
  const [thumbs, setThumbs] = React.useState<Record<string, string>>(
    saved.thumbs ?? {},
  );
  const [peaks, setPeaks] = React.useState<Record<string, number[]>>(
    saved.peaks ?? {},
  );
  // d.meta() costs ~9s cold on a long sequence and is free afterwards, so it
  // is fetched in the background and kept out of the click path entirely.
  const [seqInfo, setSeqInfo] = React.useState<
    Record<string, { fps: number; durationFrames: number }>
  >(saved.seqInfo ?? {});
  // Batch download status, per track slug.
  const [batch, setBatch] = React.useState<{
    slugs: string[];
    label: string;
    pct?: number;
  } | null>(null);

  // ---- My tracks -------------------------------------------------------------
  const [library, setLibrary] = React.useState<Record<string, LibEntry>>({});
  const libRef = React.useRef<Record<string, LibEntry>>({});
  const libBroken = React.useRef(false);
  const writeChain = React.useRef<Promise<boolean>>(Promise.resolve(true));
  const [libLoaded, setLibLoaded] = React.useState(false);
  const [noteDraft, setNoteDraft] = React.useState<Record<string, string>>({});
  const [mineFilter, setMineFilter] = React.useState("");
  const [missing, setMissing] = React.useState<Record<string, boolean>>({});
  // library key -> resourceId in the CURRENT project.
  const [inProject, setInProject] = React.useState<Record<string, string>>({});
  const [confirmRemove, setConfirmRemove] = React.useState("");

  const audioRef = React.useRef<any>(null);
  const thumbTried = React.useRef<Set<string>>(new Set());
  const seen = React.useRef<Set<string>>(new Set());
  const sizes = React.useRef<Map<string, number>>(new Map());
  const ticking = React.useRef(false);
  const busyRef = React.useRef("");
  busyRef.current = busy;

  const projectId = context?.projectId ?? null;
  const ready = !!savedLib && !!projectId;

  const flash = (key: string, tone: CardMsg["tone"], text: string) => {
    setCardMsg((m) => ({ ...m, [key]: { tone, text } }));
    if (tone === "success") {
      setTimeout(
        () =>
          setCardMsg((m) => {
            if (m[key]?.text !== text) return m;
            const n = { ...m };
            delete n[key];
            return n;
          }),
        8000,
      );
    }
  };
  const addLog = (row: LogRow) => setLog((l) => [row, ...l].slice(0, 20));

  // Keep the panel exactly as the user left it across tab switches.
  React.useEffect(() => {
    void panelStorage(sdk).setItem(
        STATE_KEY,
        JSON.stringify({
          kind,
          term,
          // Only the first two pages; "Load more" is cheap to repeat.
          hits: hits.slice(0, PAGE_SIZE * 2),
          page: Math.min(page, 2),
          totalHits,
          totalPages,
          genreFacets,
          moodFacets,
          selGenres,
          selMoods,
          vocals,
          bpmMin,
          bpmMax,
          queue,
          lastSave,
          placeAt,
          seqInfo,
          thumbs: savedThumbnails(thumbs),
          peaks: Object.fromEntries(Object.entries(peaks).slice(-30)),
        }),
      ).catch(e => setErr("Could not save panel settings: " + String(e?.message || e)));
  }, [
    kind,
    term,
    hits,
    page,
    totalHits,
    totalPages,
    genreFacets,
    moodFacets,
    selGenres,
    selMoods,
    vocals,
    bpmMin,
    bpmMax,
    queue,
    lastSave,
    placeAt,
    seqInfo,
    log,
    thumbs,
    peaks,
  ]);

  // ---- settings + library load ---------------------------------------------

  React.useEffect(() => {
    let gone = false;
    let folderAtLoad = "";
    (async () => {
      const r = await sdk.runShell({
        summary: "read epidemic sound settings",
        command: HOST.readData("settings.json"),
        timeoutMs: 15000,
      });
      if (gone) return;
      try {
        const cfg = JSON.parse((r.stdout || "").trim() || "{}");
        const next: Settings = {
          libraryFolder: cfg.libraryFolder || "",
          signedIn: typeof cfg.signedIn === "boolean" ? cfg.signedIn : null,
          format: cfg.format === "wav" ? "wav" : "mp3",
          autoKind: cfg.autoKind === "sfx" ? "sfx" : "music",
        };
        setSettings(next);
        setLibDraft(next.libraryFolder);
        folderAtLoad = next.libraryFolder;
      } catch {
        /* not configured yet */
      }
      // Read in pieces: shell output is capped (16-48 KB), and a large My
      // tracks file read in one go came back cut off and failed to load.
      const readWhole = async (file: string) => {
        const bytes: number[] = [];
        const PIECE = 30000;
        for (let off = 0; off < 5000000; off += PIECE) {
          const r = await sdk.runShell({
            summary: "read track library",
            command: HOST.readDataChunk(file, off, PIECE),
            timeoutMs: 15000,
            maxOutputBytes: 49152,
          });
          const b64 = (r.stdout || "").trim();
          if (!b64) break;
          const bin = atob(b64);
          for (let i = 0; i < bin.length; i++) bytes.push(bin.charCodeAt(i));
          if (bin.length < PIECE) break;
        }
        return new TextDecoder().decode(new Uint8Array(bytes));
      };
      const libText = await readWhole(LIBRARY_FILE);
      const notesText = await readWhole(NOTES_FILE);
      if (gone) return;
      try {
        const libRaw = libText;
        const notesRaw = notesText;
        const lib = JSON.parse((libRaw || "").trim() || "{}");
        const old = JSON.parse((notesRaw || "").trim() || "{}");
        const merged: Record<string, LibEntry> = {};
        Object.entries(lib || {}).forEach(([k, v]: any) => {
          merged[k] = v;
        });
        Object.entries(old || {}).forEach(([k, v]: any) => {
          const text = typeof v === "string" ? v : v?.note || "";
          if (!text) return;
          if (merged[k]) merged[k] = { ...merged[k], note: merged[k].note || text };
        });
        // Entries are keyed by the Epidemic slug — stable across projects.
        const rekeyed: Record<string, LibEntry> = {};
        Object.entries(merged).forEach(([k, v]) => {
          if (!v) return;
          rekeyed[v.slug || k] = { ...v, slug: v.slug || "", resourceId: "" };
        });
        libRef.current = rekeyed;
        setLibrary(rekeyed);
      } catch {
        // A file that exists but will not parse must never be overwritten
        // with an empty list, so saving is switched off for this session.
        if (libText.trim()) libBroken.current = true;
      }
      // Recover tracks whose file reached the library folder while My tracks
      // could not be written (older builds hit a size limit doing that).
      if (!libBroken.current && folderAtLoad) {
        try {
          const ls = await sdk.runShell({
            summary: "check library folder",
            command: HOST.listLibraryFolder(folderAtLoad),
            timeoutMs: 15000,
            maxOutputBytes: 49152,
          });
          const known = new Set(
            Object.values(libRef.current).map((e) => (e.file || "").toLowerCase()),
          );
          const found = (ls.stdout || "")
            .split(/\r?\n/)
            .map((x: string) => x.trim())
            .filter((x: string) => x && !known.has(x.toLowerCase()));
          if (found.length && !gone) {
            await updateLibrary((cur) => {
              const nextLib = { ...cur };
              found.forEach((name: string) => {
                const pn = parseFileName(name);
                nextLib[name] = {
                  resourceId: "",
                  slug: "",
                  title: pn.title,
                  artist: pn.artist,
                  len: null,
                  bpm: null,
                  file: name,
                  path: joinPath(folderAtLoad, name),
                  folder: "Music",
                  kind: "music",
                  mp3: "",
                  img: "",
                  addedAt: new Date().toISOString(),
                  note: "",
                };
              });
              return nextLib;
            });
          }
        } catch {
          /* recovery is best effort */
        }
      }
      setLibLoaded(true);
    })();
    // Kill anything a previous version of this panel left playing.
    stopAllPreviews();
    setPlaying("");
    return () => {
      gone = true;
      stopAllPreviews();
    };
  }, []);

  const writeSettings = async (next: Settings) => {
    const clean = trimFolder(next.libraryFolder || "");
    const body = { ...next, libraryFolder: clean };
    const r = await sdk.runShell({
      summary: "save epidemic sound settings",
      command: HOST.writeSettings(JSON.stringify(body), clean),
      timeoutMs: 30000,
    });
    if (!(r.isError || r.exitCode !== 0)) setSettings(body);
    return r;
  };

  const updateSettings = async (patch: Partial<Settings>) => {
    const next = { ...settingsRef.current, ...patch };
    setSettings(next);
    try {
      await writeSettings(next);
    } catch {
      /* the in-memory value still helps this session */
    }
  };

  const markSignedIn = (v: boolean) => updateSettings({ signedIn: v });

  // "~" is not expanded inside quotes, so resolve it here once.
  const expandHome = async (path: string) => {
    if (!/^~(?=$|[\\/])/.test(path)) return path;
    const r = await sdk.runShell({
      summary: "find home folder",
      command: HOST.homeDir(),
      timeoutMs: 20000,
    });
    const home = (r.stdout || "").trim();
    return home && !r.isError && r.exitCode === 0 ? home + path.slice(1) : path;
  };

  const persistFolder = async (folder: string) => {
    const clean = trimFolder(await expandHome(String(folder || "").trim()));
    const r = await writeSettings({ ...settingsRef.current, libraryFolder: clean });
    if (r.isError || r.exitCode !== 0) {
      setErr(r.stderr || r.output || "Could not save the library folder.");
      return;
    }
    setLibDraft(clean);
    setErr("");
    setNote("Library folder saved.");
  };

  const chooseFolder = async () => {
    setBusy("folder");
    setErr("");
    try {
      const r = await sdk.runShell({
        summary: "choose library folder",
        command: HOST.chooseFolder(),
        timeoutMs: 300000,
      });
      const picked = (r.stdout || "").trim();
      if (r.exitCode !== 0 || !picked) return;
      await persistFolder(picked);
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setBusy("");
    }
  };

  // ---- library writes ----------------------------------------------------------
  // Every change goes through here. The ref is updated synchronously and writes
  // run one after another, each writing the LATEST library — so two saves that
  // land together can no longer overwrite each other.

  // The library is written in small base64 pieces. A shell command is capped
  // at about 16 KB, so once My tracks grew past that, writing it in one go
  // failed ("Could not save the note", "My tracks not updated").
  const writeLibraryFile = async () => {
    if (libBroken.current) return false;
    const json = JSON.stringify(libRef.current);
    let b64 = "";
    try {
      b64 = btoa(unescape(encodeURIComponent(json)));
    } catch {
      return false;
    }
    const CHUNK = 8000;
    for (let i = 0; i < b64.length || i === 0; i += CHUNK) {
      const part = b64.slice(i, i + CHUNK);
      const r = await sdk.runShell({
        summary: "save track library",
        command: HOST.writeLibraryChunk(part, i === 0),
        timeoutMs: 30000,
      });
      if (r.isError || r.exitCode !== 0) return false;
      if (b64.length === 0) break;
    }
    // Only replace the real file once the copy is complete and valid JSON.
    const done = await sdk.runShell({
      summary: "save track library",
      command: HOST.commitLibrary(),
      timeoutMs: 30000,
    });
    return !(done.isError || done.exitCode !== 0);
  };

  const updateLibrary = (
    fn: (cur: Record<string, LibEntry>) => Record<string, LibEntry>,
  ) => {
    libRef.current = fn(libRef.current);
    setLibrary(libRef.current);
    const p = writeChain.current.then(writeLibraryFile, writeLibraryFile).catch(
      () => false,
    );
    writeChain.current = p;
    return p;
  };

  const saveNote = async (key: string, text: string) => {
    if (!libRef.current[key]) {
      flash(key, "error", "That track is not in My tracks.");
      return;
    }
    setBusy("note" + key);
    try {
      const ok = await updateLibrary((cur) => ({
        ...cur,
        [key]: { ...cur[key], note: text.trim() },
      }));
      if (!ok) {
        flash(key, "error", "Could not save the note.");
        return;
      }
      flash(key, "success", text.trim() ? "Note saved." : "Note cleared.");
      setNoteDraft((d) => {
        const m = { ...d };
        delete m[key];
        return m;
      });
    } finally {
      setBusy("");
    }
  };

  // Removes the entry only. The audio file stays in the library folder.
  const removeFromLibrary = async (key: string) => {
    setConfirmRemove("");
    if (playing === key) {
      stopAllPreviews();
      setPlaying("");
    }
    const ok = await updateLibrary((cur) => {
      const m = { ...cur };
      delete m[key];
      return m;
    });
    setNote(
      ok
        ? "Removed from My tracks. The file is still in your library folder."
        : "Could not update My tracks.",
    );
  };

  const revealInFinder = async (path: string) => {
    const result = await sdk.runScript({summary: "Reveal saved track", script: "await selects.editor.revealFile(" + JSON.stringify(path) + ");"});
    if (result.isError) setErr(result.output || "Could not find that file on disk.");
  };

  const copyText = async (key: string, text: string) => {
    try {
      const nav: any = (window.parent as any)?.navigator ?? navigator;
      await nav.clipboard.writeText(text);
      flash(key, "success", "Link copied.");
    } catch {
      flash(key, "muted", text);
    }
  };

  // Flag saved tracks whose file is no longer where My tracks says it is.
  React.useEffect(() => {
    if (!libLoaded) return;
    const entries = Object.entries(library).filter(([, e]) => e?.path);
    if (entries.length === 0) {
      setMissing({});
      return;
    }
    let cancelled = false;
    (async () => {
      const r = await sdk.runShell({
        summary: "check saved track files",
        command: HOST.missingFiles(entries.map(([k, e]) => [k, e.path] as [string, string])),
        timeoutMs: 30000,
      });
      if (cancelled || r.isError) return;
      const gone: Record<string, boolean> = {};
      (r.stdout || "")
        .split(/\r?\n/)
        .map((s: string) => s.trim())
        .filter(Boolean)
        .forEach((k: string) => (gone[k] = true));
      setMissing(gone);
    })();
    return () => {
      cancelled = true;
    };
  }, [libLoaded, Object.keys(library).join("|")]);

  // Which saved tracks are already in THIS project. Read from the project, so
  // it stays right for tracks added in other sessions or deleted since.
  const [projectTick, setProjectTick] = React.useState(0);
  React.useEffect(() => {
    if (!projectId || !libLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await sdk.call<any[]>("listProjectResources", projectId);
        if (cancelled || !Array.isArray(res)) return;
        const rows = res.map((r: any) => ({
          id: String(r.resourceId),
          name: String(r.name || "").toLowerCase(),
        }));
        const next: Record<string, string> = {};
        Object.entries(libRef.current).forEach(([k, e]) => {
          const f = (e.file || "").toLowerCase();
          let found = f ? rows.find((r) => r.name === f) : undefined;
          if (!found && e.title) {
            const pre = ("ES_" + e.title + " - ").toLowerCase();
            found = rows.find((r) => r.name.startsWith(pre));
          }
          if (found) next[k] = found.id;
        });
        setInProject(next);
      } catch {
        /* leave the badges as they were */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, libLoaded, library, projectTick]);

  // ---- search --------------------------------------------------------------

  // A query can be described entirely by the filters — no typing required.
  type Query = {
    term?: string;
    kind?: string;
    genres?: string[];
    moods?: string[];
    vocals?: string;
    bpmMin?: number;
    bpmMax?: number;
  };

  const resolve = (o: Query = {}) => ({
    term: o.term !== undefined ? o.term : term,
    kind: o.kind !== undefined ? o.kind : kind,
    genres: o.genres !== undefined ? o.genres : selGenres,
    moods: o.moods !== undefined ? o.moods : selMoods,
    vocals: o.vocals !== undefined ? o.vocals : vocals,
    bpmMin: o.bpmMin !== undefined ? o.bpmMin : bpmMin,
    bpmMax: o.bpmMax !== undefined ? o.bpmMax : bpmMax,
  });

  const buildUrl = (pageNum: number, o: Query = {}) => {
    const c = resolve(o);
    const p: string[] = [];
    const t = (c.term || "").trim();
    // With no term the endpoint browses the whole catalogue.
    if (t) p.push("term=" + encodeURIComponent(t));
    c.genres.forEach((g) => p.push("genres=" + encodeURIComponent(g)));
    c.moods.forEach((m) => p.push("moods=" + encodeURIComponent(m)));
    if (c.vocals === "vocals") p.push("vocals=1");
    if (c.vocals === "instrumental") p.push("vocals=0");
    if (c.bpmMin > 0 || c.bpmMax > 0) {
      p.push("bpm=" + (c.bpmMin || 40) + "-" + (c.bpmMax || 220));
    }
    p.push("limit=" + PAGE_SIZE);
    if (pageNum > 1) p.push("page=" + pageNum);
    return (
      "https://www.epidemicsound.com/json/search/" +
      (c.kind === "sfx" ? "sfx" : "tracks") +
      "/?" +
      p.join("&")
    );
  };

  const fetchPage = async (
    pageNum: number,
    mode: "replace" | "append",
    o: Query = {},
  ) => {
    const r = await sdk.runShell({
      summary: "browse epidemic sound",
      command: HOST.search(buildUrl(pageNum, o)),
      timeoutMs: 45000,
    });
    if (r.isError || r.exitCode !== 0)
      throw new Error(r.stderr || r.output || "Search failed.");
    const data = JSON.parse((r.stdout || "{}").trim() || "{}");
    const applied = resolve(o);
    const items: Hit[] = (data.items || []).map((h: Hit) => ({
      ...h,
      kind: applied.kind,
    }));
    setTotalHits(data.totalHits || 0);
    setTotalPages(data.totalPages || 0);
    if (data.genres?.length) {
      setGenreFacets((prev) => mergeFacets(prev, data.genres, applied.genres));
    }
    if (data.moods?.length) {
      setMoodFacets((prev) => mergeFacets(prev, data.moods, applied.moods));
    }
    setPage(pageNum);
    if (mode === "replace") {
      setHits(items);
      thumbTried.current = new Set();
    } else {
      setHits((old) => {
        const known = new Set(old.map((h) => h.slug));
        return old.concat(items.filter((h) => !known.has(h.slug)));
      });
    }
    return items.length;
  };

  // One entry point for every browse: typing, a filter, or nothing at all.
  const browse = async (o: Query = {}) => {
    setBusy("search");
    setErr("");
    setNote("");
    try {
      const n = await fetchPage(1, "replace", o);
      if (n === 0) {
        const c = resolve(o);
        const picks = c.genres.length + c.moods.length;
        setNote(
          picks > 1
            ? "No track carries all " +
              picks +
              " of those tags at once — filters narrow, they do not add up. Remove one."
            : "Nothing matched. Try clearing a filter.",
        );
      }
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setBusy("");
    }
  };

  const runSearch = () => browse();

  const loadMore = async () => {
    setBusy("more");
    setErr("");
    try {
      const n = await fetchPage(page + 1, "append");
      if (n === 0) setNote("That is the end of the results.");
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setBusy("");
    }
  };

  const shuffle = async () => {
    setBusy("shuffle");
    setErr("");
    setNote("");
    try {
      const span = Math.max(1, Math.min(totalPages || 1, 40));
      let next = page;
      if (span > 1) {
        while (next === page) next = 1 + Math.floor(Math.random() * span);
      }
      await fetchPage(next, "replace");
      setNote("Page " + next + " of " + span + ".");
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setBusy("");
    }
  };

  const applyFacet = (which: "genres" | "moods", key: string) => {
    const next = key ? [key] : [];
    if (which === "genres") setSelGenres(next);
    else setSelMoods(next);
    void browse(which === "genres" ? { genres: next } : { moods: next });
  };

  const applyTempo = (value: string) => {
    const b = BPM_PRESETS.find((x) => x.value === value);
    if (!b) return;
    setBpmMin(b.min);
    setBpmMax(b.max);
    void browse({ bpmMin: b.min, bpmMax: b.max });
  };

  const setKindAndBrowse = (v: string) => {
    setKind(v);
    setSelGenres([]);
    setSelMoods([]);
    setGenreFacets([]);
    setMoodFacets([]);
    void browse({ kind: v, genres: [], moods: [] });
  };

  const setVocalsAndBrowse = (v: string) => {
    setVocals(v);
    void browse({ vocals: v });
  };

  const clearFilters = () => {
    setSelGenres([]);
    setSelMoods([]);
    setVocals("any");
    setBpmMin(0);
    setBpmMax(0);
    void browse({
      genres: [],
      moods: [],
      vocals: "any",
      bpmMin: 0,
      bpmMax: 0,
    });
  };

  // Warm the draft timing in the background.
  React.useEffect(() => {
    const sid = context?.sequenceId;
    if (!sid || seqInfo[sid]) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await sdk.runScript({
          summary: "read draft timing",
          script:
            "const d = selects.draft(" +
            JSON.stringify(sid) +
            ");\nconst m = await d.meta();\nreturn { fps: m.fps, durationFrames: m.durationFrames };",
        });
        const v: any = r?.result;
        if (!cancelled && v?.fps) {
          setSeqInfo((x) => ({
            ...x,
            [sid]: { fps: v.fps, durationFrames: v.durationFrames },
          }));
        }
      } catch {
        /* the placement falls back to reading it inline */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [context?.sequenceId]);

  // Fill the shelves on first open so the filters are real.
  const booted = React.useRef(false);
  React.useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    if (hits.length === 0) void browse();
  }, []);

  const filterCount =
    selGenres.length +
    selMoods.length +
    (vocals === "any" ? 0 : 1) +
    (bpmMin > 0 || bpmMax > 0 ? 1 : 0);

  // ---- preview + artwork ---------------------------------------------------

  // Stops every preview element this panel has ever put in the host document.
  const stopAllPreviews = () => {
    try {
      audioRef.current?.pause();
    } catch {
      /* already stopped */
    }
    audioRef.current = null;
    try {
      const doc = (window.parent as any)?.document;
      if (!doc?.querySelectorAll) return;
      const strays = doc.querySelectorAll(
        'audio[data-es-preview], audio[src*="audiocdn.epidemicsound.com"]',
      );
      strays.forEach((el: any) => {
        try {
          el.pause();
          el.removeAttribute("src");
          el.load?.();
          el.remove();
        } catch {
          /* leave the rest alone */
        }
      });
    } catch {
      /* host document not reachable */
    }
  };

  // Keys whose waveform could not be produced, so the card stops saying
  // "Loading…".
  const [waveFailed, setWaveFailed] = React.useState<Record<string, boolean>>({});

  // Epidemic's waveform URL first; for a saved track without one (or if that
  // fails), build it from the file on disk so My tracks can scrub too.
  const loadWave = async (key: string, wf: string, localPath = "") => {
    if (peaks[key] || (!wf && !localPath)) return;
    setWaveFailed((x) => {
      if (!x[key]) return x;
      const n = { ...x };
      delete n[key];
      return n;
    });
    const tryCmd = async (summary: string, command: string) => {
      try {
        const r = await sdk.runShell({ summary, command, timeoutMs: 30000 });
        const arr = JSON.parse((r.stdout || "[]").trim() || "[]");
        if (Array.isArray(arr) && arr.length) {
          setPeaks((x) => ({ ...x, [key]: arr }));
          return true;
        }
      } catch {
        /* try the next source */
      }
      return false;
    };
    if (wf && (await tryCmd("fetch waveform", HOST.waveform(wf)))) return;
    const local = localPath ? await hostLocalPeaks(localPath) : null;
    if (local) {
      setPeaks((x) => ({ ...x, [key]: local }));
      return;
    }
    if (localPath && (await tryCmd("read waveform from file", HOST.localWaveform(localPath)))) {
      return;
    }
    setWaveFailed((x) => ({ ...x, [key]: true }));
  };

  const seekTo = (fraction: number) => {
    const el = audioRef.current;
    if (!el) return;
    const d = el.duration;
    if (!d || !isFinite(d)) return;
    const f = Math.max(0, Math.min(1, fraction));
    el.currentTime = f * d;
    setProgress(f);
  };

  // Play `src`; if it fails and `fallback` is given, play that instead. My
  // tracks plays the file on disk first and the web preview only as backup.
  const togglePlay = (
    key: string,
    src: string,
    wf: string,
    fallback = "",
    localPath = "",
  ) => {
    try {
      if (playing === key) {
        stopAllPreviews();
        setPlaying("");
        setProgress(0);
        return;
      }
      stopAllPreviews();
      setProgress(0);
      void loadWave(key, wf, localPath);
      // The panel frame's CSP does not admit remote or local media; the
      // parent document does, so the element is built there.
      const doc = (window.parent as any)?.document ?? document;
      const start = (url: string, next: string) => {
        const el = doc.createElement("audio");
        el.setAttribute("data-es-preview", "1");
        el.src = url;
        el.preload = "none";
        el.style.display = "none";
        el.onended = () => {
          setPlaying("");
          setProgress(0);
        };
        el.ontimeupdate = () => {
          const d = el.duration;
          if (d && isFinite(d)) setProgress(el.currentTime / d);
        };
        el.onerror = () => {
          try {
            el.remove();
          } catch {
            /* gone */
          }
          if (next) start(next, "");
          else {
            setPlaying("");
            flash(key, "error", "Could not play this track.");
          }
        };
        (doc.body || doc.documentElement)?.appendChild(el);
        audioRef.current = el;
        const p = el.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      };
      start(src || fallback, src ? fallback : "");
      setPlaying(key);
    } catch (e: any) {
      flash(key, "error", "Preview did not play: " + String(e?.message ?? e));
      setPlaying("");
    }
  };

  const fetchThumb = async (key: string, img: string) => {
    if (!img || thumbTried.current.has(key)) return;
    thumbTried.current.add(key);
    try {
      const r = await sdk.runShell({
        summary: "fetch cover art",
        command: HOST.coverArt(img),
        timeoutMs: 30000,
      });
      const b64 = (r.stdout || "").trim();
      if (!r.isError && b64.length > 64 && b64.length < 400000) {
        setThumbs((t) => ({ ...t, [key]: "data:image/jpeg;base64," + b64 }));
      }
    } catch {
      /* card simply shows no art */
    }
  };

  // ---- browser + sign-in ---------------------------------------------------

  const browserCall = async (method: "tabs" | "open" | "close", args: unknown[] = []) => {
    const result = await sdk.runScript({summary: "Use Selects browser", script: "return await selects.editor.browser." + method + "(..." + JSON.stringify(args) + ");"});
    if (result.isError) throw new Error(result.output || "The Selects browser is unavailable.");
    return result.result;
  };

  const openLogin = async () => {
    setBusy("login"); setErr("");
    try {
      const tabs = await browserCall("tabs") as any[];
      const active = tabs?.find((tab) => tab.active);
      await browserCall("open", [{url:LOGIN_URL,targetId:active?.targetId,visible:true}]);
      setNote("Sign-in page is open in the Selects browser. Sign in with your password (not a Google passkey), then press “I’ve signed in”.");
    } catch (e:any) { setErr("Could not open the sign-in page: " + String(e?.message ?? e)); }
    finally { setBusy(""); }
  };

  const closeEpidemicTabs = async () => {
    try {
      const tabs = await browserCall("tabs") as any[];
      let closed=0;
      for(const tab of tabs || []) {
        let hostname=""; try {hostname=new URL(tab.url).hostname;} catch {continue;}
        if(hostname!=="epidemicsound.com"&&!hostname.endsWith(".epidemicsound.com"))continue;
        try {await browserCall("close",[tab.targetId]);closed++;} catch {/* tab already closed */}
      }
      return closed;
    } catch {return 0;}
  };

  const preloadTrack = async (url:string) => {
    try {
      const tabs=await browserCall("tabs") as any[];
      await browserCall("open",[{url,targetId:tabs?.find((tab)=>tab.active)?.targetId,visible:false}]);
      return true;
    } catch {return false;}
  };

  // ---- downloads -----------------------------------------------------------

  const listDownloads = async () => {
    const r = await sdk.runShell({
      summary: "scan downloads folder",
      command: HOST.scanDownloads(),
      timeoutMs: 30000,
    });
    const out = new Map<string, { mtime: number; size: number }>();
    for (const line of (r.stdout || "").split(/\r?\n/)) {
      const f = line.split("|");
      if (f.length < 3) continue;
      out.set(f.slice(2).join("|"), {
        mtime: Number(f[0]) || 0,
        size: Number(f[1]) || 0,
      });
    }
    return out;
  };

  // Move a finished download into the library folder and add it to My tracks.
  // It does NOT import into the project: Add to draft does that on demand.
  const fileOne = async (
    src: string,
    kindHint: string,
    hit?: Hit,
  ): Promise<{ ok: boolean; key: string; why?: string }> => {
    const base = baseName(src) || src;
    if (!AUDIO_EXT.test(base)) {
      return { ok: false, key: "", why: "not an audio file" };
    }
    const move = await sdk.runShell({
      summary: "move download into library",
      command: HOST.moveIntoLibrary(src, settingsRef.current.libraryFolder),
      timeoutMs: 120000,
    });
    if (move.isError || move.exitCode !== 0) {
      return { ok: false, key: "", why: (move.stderr || "move failed").trim() };
    }
    seen.current.add(src);
    const dest = (move.stdout || "").trim();
    const name = baseName(dest) || base;
    const parsed = parseFileName(name);
    const k = kindHint === "sfx" ? "sfx" : "music";
    const key = hit?.slug || name;
    const ok = await updateLibrary((cur) => ({
      ...cur,
      [key]: {
        resourceId: "",
        slug: hit?.slug || "",
        title: hit?.title || parsed.title,
        artist: hit?.artist || parsed.artist,
        len: hit?.len ?? null,
        bpm: hit?.bpm ?? null,
        file: name,
        path: dest,
        folder: k === "sfx" ? "Sound Effects" : "Music",
        kind: k,
        mp3: hit?.mp3 || "",
        wf: hit?.wf || "",
        img: hit?.img || "",
        addedAt: new Date().toISOString(),
        note: cur[key]?.note || "",
      },
    }));
    return ok
      ? { ok: true, key }
      : { ok: false, key, why: "moved to library, My tracks not updated" };
  };

  // Save a list of tracks with ONE assistant run (one chat), whatever its size.
  const saveTracks = async (items: Hit[]) => {
    if (!ready) {
      setErr(savedLib ? "Open a project first." : "Choose a library folder in Settings first.");
      if (!savedLib) setTab("settings");
      return;
    }
    if (signedIn === false) {
      setErr("Sign in to Epidemic Sound first (Settings).");
      setTab("settings");
      return;
    }
    const todo = items.filter((h) => h.slug && !libRef.current[h.slug]).slice(0, MAX_BATCH);
    if (todo.length === 0) {
      setNote("Those tracks are already in My tracks.");
      return;
    }
    const format = settingsRef.current.format;
    setBusy("batch");
    setLastSave(null);
    setCardMsg({});
    setErr("");
    setNote("");
    todo.forEach((h) => flash(h.slug, "muted", "Waiting for the browser…"));
    const slugs = todo.map((h) => h.slug);
    const expected = todo.reduce(
      (s, h) => s + (h.len || 0) * BYTES_PER_SEC[format],
      0,
    );
    setBatch({ slugs, label: "Starting the browser…" });

    let polling = true;
    const before = await listDownloads().catch(
      () => new Map<string, { mtime: number; size: number }>(),
    );
    // Byte counter for the progress bar only; files are identified from the
    // assistant's report (or by title), never by "newest file wins".
    // Tracks filed early, while the browser run is still going: MP3s land in
    // about a second, so each card turns "Saved" as soon as its file is done
    // instead of waiting for the assistant's final reply.
    const early = new Map<string, boolean>(); // slug -> filed ok
    const lastSize = new Map<string, number>();
    let filing = false;
    const fileArrivals = async (now: Map<string, { mtime: number; size: number }>) => {
      if (filing) return;
      filing = true;
      try {
        for (const [path, info] of now) {
          if (before.has(path) || seen.current.has(path) || PARTIAL_EXT.test(path)) continue;
          const prev = lastSize.get(path);
          lastSize.set(path, info.size);
          if (!info.size || prev !== info.size) continue; // not settled yet
          const base = norm(baseName(path));
          const h = todo.find((x) => !early.has(x.slug) && norm(x.title) && base.includes(norm(x.title)));
          if (!h) continue;
          early.set(h.slug, false);
          const out = await fileOne(path, h.kind || kind, h);
          early.set(h.slug, out.ok);
          if (out.ok) {
            flash(h.slug, "success", "Saved to My tracks.");
            addLog({ name: h.title, ok: true, note: "saved to My tracks" });
          }
        }
      } finally {
        filing = false;
      }
    };
    const poll = (async () => {
      while (polling) {
        await new Promise((res) => setTimeout(res, 1200));
        if (!polling) break;
        try {
          const now = await listDownloads();
          let bytes = 0;
          now.forEach((info, path) => {
            if (!before.has(path)) bytes += info.size;
          });
          await fileArrivals(now);
          const done = [...early.values()].filter(Boolean).length;
          setBatch((b) =>
            b
              ? {
                  ...b,
                  pct: todo.length ? done / todo.length : undefined,
                  label:
                    done > 0
                      ? done + " of " + todo.length + " saved…"
                      : bytes > 0
                        ? "Downloading — " + (bytes / 1048576).toFixed(1) + " MB"
                        : b.label,
                }
              : b,
          );
        } catch {
          /* progress is cosmetic */
        }
      }
    })();

    try {
      await closeEpidemicTabs();
      const preloaded = false;
      setBatch((b) => (b ? { ...b, label: "Clicking Download in the browser…" } : b));
      let reply = "";
      const ask = () =>
        sdk.askAI({
          prompt: downloadPrompt(
            todo.map((h) => ({ title: h.title, url: trackUrl(h.slug) })),
            format,
            preloaded,
          ),
          timeoutMs: Math.min(900000, 120000 + 90000 * todo.length),
        });
      const t0 = Date.now();
      try {
        reply = ((await ask()).text || "").trim();
      } catch (e1: any) {
        // The Selects AI service sometimes fails straight away (for example
        // "errorCodexManagedFailed") before touching the browser. One quick
        // retry clears most of those; a failure after work began is not
        // retried, so nothing is downloaded twice.
        const quick = Date.now() - t0 < 45000 && early.size === 0;
        if (quick) {
          setBatch((b) => (b ? { ...b, label: "The AI service hiccuped — trying once more…" } : b));
          await new Promise((res) => setTimeout(res, 3000));
          try {
            reply = ((await ask()).text || "").trim();
          } catch (e2: any) {
            reply = "";
            setErr(
              "The Selects AI service failed (" +
                String(e2?.message ?? e2) +
                "). This is on the Selects side, not the plugin. Check that a normal Selects chat replies, then try again.",
            );
          }
        } else {
          reply = "";
          setErr("The browser run stopped early: " + String(e1?.message ?? e1));
        }
      }
      polling = false;
      await poll;
      setBatch((b) => (b ? { ...b, pct: 1, label: "Saving to your library…" } : b));

      const results = parseResults(reply);
      const loginHit = [...results.values()].some((x) => x.status === "login-required");

      // Files that appeared during the run, for any track the reply did not
      // give a path for. Matched by title; a lone track may take a lone file.
      const after = await listDownloads();
      const fresh = [...after.entries()]
        .filter(([p]) => !before.has(p) && !seen.current.has(p) && !PARTIAL_EXT.test(p))
        .map(([p]) => p);
      const claimed = new Set<string>();

      let okCount = 0;
      for (let i = 0; i < todo.length; i++) {
        const h = todo[i];
        // Already filed (early, while the run was going): never report the
        // now-moved original as "file not found".
        if (early.get(h.slug) || (early.has(h.slug) && libRef.current[h.slug])) {
          okCount += 1;
          flash(h.slug, "success", "Saved to My tracks.");
          continue;
        }
        const res = results.get(i + 1);
        if (res?.status === "login-required") {
          flash(h.slug, "error", "Epidemic Sound asked for a sign-in.");
          continue;
        }
        let src = res?.status === "ok" && res.path ? res.path : "";
        if (!src) {
          const t = norm(h.title);
          src =
            fresh.find((p) => !claimed.has(p) && t && norm(baseName(p)).includes(t)) ||
            (todo.length === 1 && fresh.length === 1 ? fresh[0] : "");
        }
        if (!src) {
          const said = reply.replace(/\s+/g, " ").trim();
          const why =
            res?.why ||
            (/more than one agent chat runtime/i.test(said)
              ? "too many Selects chats are open, so the browser is locked. Close the chats you are not using and try again"
              : res?.status === "failed"
                ? "download failed"
                : said && results.size === 0
                  ? "the browser run said: “" + said.slice(0, 160) + (said.length > 160 ? "…" : "") + "”"
                  : "no downloaded file appeared");
          flash(h.slug, "error", "Not saved — " + why + ".");
          addLog({ name: h.title, ok: false, note: why });
          continue;
        }
        claimed.add(src);
        const out = await fileOne(src, h.kind || kind, h);
        if (out.ok) {
          okCount += 1;
          flash(h.slug, "success", "Saved to My tracks.");
          addLog({ name: h.title, ok: true, note: "saved to My tracks" });
        } else {
          flash(h.slug, "error", "Not saved — " + (out.why || "unknown error") + ".");
          addLog({ name: h.title, ok: false, note: out.why || "not saved" });
        }
      }

      if (okCount > 0) {
        setQueue((qq) => qq.filter((x) => !libRef.current[x.slug]));
        if (signedIn !== true) await markSignedIn(true);
      }
      if (loginHit && okCount === 0) {
        await markSignedIn(false);
        setErr("Epidemic Sound asked for a sign-in. Sign in from Settings, then try again.");
      }
      setLastSave({
        at: new Date().toISOString(),
        saved: todo.filter((h) => !!libRef.current[h.slug]).map((h) => h.title),
        failed: todo.filter((h) => !libRef.current[h.slug]).map((h) => h.title),
      });
      setNote(
        okCount === todo.length
          ? okCount === 1
            ? "Saved to My tracks."
            : "All " + okCount + " saved to My tracks."
          : okCount + " of " + todo.length + " saved. See the cards for what went wrong.",
      );
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      polling = false;
      void closeEpidemicTabs();
      setBatch(null);
      setBusy("");
    }
  };

  // Make sure one saved track exists as a Resource in the CURRENT project,
  // importing it on demand. Returns the resourceId, or "".
  const ensureInProject = async (key: string): Promise<string> => {
    const known = inProject[key];
    if (known) return known;
    const entry = libRef.current[key];
    if (!entry?.path || !projectId) return "";
    const r = await sdk.runScript({
      summary: "import saved track into this project",
      allowCommit: true,
      script:
        "const p = selects.project(" +
        JSON.stringify(projectId) +
        ");\n" +
        "const want = " +
        JSON.stringify(entry.file) +
        ";\n" +
        "const existing = (await p.resources()).find((x) => x.name === want);\n" +
        "if (existing) return { id: existing.resourceId, reused: true };\n" +
        "const r = await p.importFiles({ paths: " +
        JSON.stringify([entry.path]) +
        " });\n" +
        "const id = (r.addedResourceIds || [])[0];\n" +
        "if (!id) return { id: '', reused: false };\n" +
        "const name = " +
        JSON.stringify(entry.folder || "Music") +
        ";\n" +
        "const { folders } = await p.readFootage();\n" +
        "let fid = (folders || []).find((f) => f.name === name || f.path === name)?.folderId;\n" +
        "if (!fid) fid = (await p.createFolder({ name })).folderId;\n" +
        "await p.moveToFolder({ targetFolderId: fid, resourceIds: [id] });\n" +
        "return { id, reused: false };",
    });
    const rid = String((r?.result as any)?.id ?? "");
    if (rid) setInProject((m) => ({ ...m, [key]: rid }));
    return rid;
  };

  // The visible Draft's playhead has an explicit resolved-frame coordinate.
  const readPlayhead = async (sequenceId:string):Promise<number|null> => {
    try {
      const state:any=await sdk.call("getEditorState"),playhead=state?.playhead;
      return state?.onScreenTab?.kind==="draft"&&playhead?.sequenceId===sequenceId&&Number.isFinite(playhead.resolvedFrame)&&playhead.resolvedFrame>=0?Math.round(playhead.resolvedFrame):null;
    } catch {return null;}
  };

  // Lay a saved track on the open draft as an overlay clip.
  const addToDraft = async (key: string) => {
    const entry = libRef.current[key];
    const title = entry?.title || entry?.file || "music";
    const len = entry?.len ?? null;
    const sequenceId = context?.sequenceId ?? null;
    if (!sequenceId || !projectId) {
      flash(key, "error", "Open a draft first.");
      return;
    }
    if (missing[key]) {
      flash(key, "error", "The file is missing from your library folder.");
      return;
    }
    let at = 0;
    if (placeAt === "playhead") {
      const ph = await readPlayhead(sequenceId);
      if (ph === null) {
        flash(key, "error", "Could not read the playhead — switch Place at to Start.");
        return;
      }
      at = ph;
    }
    setBusy("draft" + key);
    try {
      const resourceId = await ensureInProject(key);
      if (!resourceId) {
        flash(key, "error", "Could not import that track into this project.");
        return;
      }
      const known = seqInfo[sequenceId];
      const head = known
        ? "let fps = " +
          JSON.stringify(known.fps) +
          "; let total = " +
          JSON.stringify(known.durationFrames) +
          ";\n"
        : "const m0 = await d.meta();\nlet fps = m0.fps || 24;\nlet total = m0.durationFrames || 0;\n";
      const script =
        "const p = selects.project(" +
        JSON.stringify(projectId) +
        ");\n" +
        "const d = selects.draft(" +
        JSON.stringify(sequenceId) +
        ");\n" +
        head +
        "const seconds = " +
        JSON.stringify(len || 0) +
        ";\n" +
        "const at = " +
        JSON.stringify(at) +
        ";\n" +
        "const res = p.resource(" +
        JSON.stringify(resourceId) +
        ");\n" +
        "let startUsed = 0;\n" +
        "const place = async () => {\n" +
        "  const want = Math.max(1, Math.round((seconds || 30) * fps));\n" +
        "  const start = Math.max(0, Math.min(at, Math.max(0, total - 1)));\n" +
        "  const end = Math.min(start + want, total);\n" +
        "  if (end <= start) return null;\n" +
        "  const span = await d.rangeAtFrames(start, end);\n" +
        "  startUsed = start;\n" +
        "  return d.overlayResource({ resource: res, over: span });\n" +
        "};\n" +
        "let out = null;\n" +
        "try { out = await place(); } catch (e) {\n" +
        "  const m = await d.meta();\n" +
        "  fps = m.fps || fps; total = m.durationFrames || total;\n" +
        "  out = await place();\n" +
        "}\n" +
        "if (!out) return { inserted: 0, reason: 'The draft is empty or has no room at that point.' };\n" +
        "await d.commitAll(" +
        JSON.stringify("Add " + title + " to draft") +
        ");\n" +
        "const secs = Math.round(startUsed / fps);\n" +
        "const stamp = Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0');\n" +
        "return { inserted: out.inserted, atFrame: out.atFrame, start: startUsed, stamp };";
      const r = await sdk.runScript({
        summary: "place track on draft",
        allowCommit: true,
        script,
      });
      const res = r?.result as any;
      if (r.isError || !res?.inserted) {
        const why = res?.reason || r.output || "Could not place it on the draft.";
        flash(key, "error", why);
        addLog({ name: title, ok: false, note: "could not place on draft" });
        return;
      }
      const stamp = res?.stamp ?? "0:00";
      flash(key, "success", "Placed at " + stamp + " on the open draft.");
      addLog({ name: title, ok: true, note: "placed on the draft at " + stamp });
      setProjectTick((t) => t + 1);
    } catch (e: any) {
      flash(key, "error", String(e?.message ?? e));
    } finally {
      setBusy("");
    }
  };

  // ---- auto-file (watch Downloads) -----------------------------------------

  const startWatch = async () => {
    setBusy("watch");
    try {
      const now = await listDownloads();
      seen.current = new Set(now.keys());
      sizes.current = new Map();
      setWatching(true);
      setNote(
        "Watching Downloads — new audio files go into your library as " +
          (settingsRef.current.autoKind === "sfx" ? "Sound Effects" : "Music") +
          ".",
      );
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setBusy("");
    }
  };

  React.useEffect(() => {
    if (!watching || !ready) return;
    const tick = async () => {
      // A batch save owns Downloads while it runs.
      if (ticking.current || busyRef.current === "batch") return;
      ticking.current = true;
      try {
        const now = await listDownloads();
        for (const [path, info] of now) {
          if (seen.current.has(path) || PARTIAL_EXT.test(path)) continue;
          const last = sizes.current.get(path);
          if (last === undefined || last !== info.size) {
            sizes.current.set(path, info.size);
            continue;
          }
          seen.current.add(path);
          sizes.current.delete(path);
          const out = await fileOne(path, settingsRef.current.autoKind);
          const name = baseName(path) || path;
          addLog({
            name,
            ok: out.ok,
            note: out.ok ? "auto-filed to My tracks" : out.why || "not filed",
          });
        }
      } catch (e: any) {
        setErr(String(e?.message ?? e));
      } finally {
        ticking.current = false;
      }
    };
    const id = setInterval(tick, 4000);
    return () => clearInterval(id);
  }, [watching, ready]);

  // ---- render --------------------------------------------------------------

  const inQueue = (slug: string) => queue.some((x) => x.slug === slug);
  const toggleQueue = (h: Hit) => {
    setQueue((qq) =>
      qq.some((x) => x.slug === h.slug)
        ? qq.filter((x) => x.slug !== h.slug)
        : qq.concat([h]),
    );
  };
  const pending = queue.filter((h) => !library[h.slug]);

  const messages = (
    <>
      {note && <ui.Message>{note}</ui.Message>}
      {err && <ui.Message tone="error">{err}</ui.Message>}
    </>
  );

  const cardMessage = (key: string) =>
    cardMsg[key] ? (
      <ui.Message tone={cardMsg[key].tone}>{cardMsg[key].text}</ui.Message>
    ) : null;

  const pill = (label: string, onClear: () => void) => (
    <ui.Button key={label} variant="secondary" onClick={onClear}>
      {label + "  ✕"}
    </ui.Button>
  );

  const facetOptions = (list: Facet[], anyLabel: string) =>
    [{ value: ANY, label: anyLabel }].concat(
      list.map((f) => ({ value: f.key, label: f.label + nf(f.count) })),
    );

  const tempoOptions = BPM_PRESETS.map((b) => ({
    value: b.value,
    label: b.label,
  })).concat(
    presetFor(bpmMin, bpmMax) === "custom"
      ? [{ value: "custom", label: bpmMin + "–" + bpmMax + " BPM" }]
      : [],
  );

  const placeLabel = placeAt === "playhead" ? "at playhead" : "at start";

  const setupWarning =
    !savedLib || signedIn === false ? (
      <ui.Stack gap={4}>
        <ui.Message tone="error">
          {!savedLib
            ? "Choose a library folder before saving tracks."
            : "Not signed in — Epidemic Sound will not release a file."}
        </ui.Message>
        <ui.Actions>
          <ui.Button variant="secondary" onClick={() => setTab("settings")}>
            Open Settings
          </ui.Button>
        </ui.Actions>
      </ui.Stack>
    ) : null;

  const hhmm = (iso: string) => {
    const d = new Date(iso);
    return isNaN(d.getTime())
      ? ""
      : d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0");
  };

  // Selects green: the app's accent token, so it follows the theme.
  const saveBanner = batch ? (
    <div
      style={{
        border: "1px solid " + SELECTS_GREEN,
        borderRadius: "var(--panel-radius)",
        padding: "8px 10px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div style={{ color: SELECTS_GREEN, fontWeight: 600 }}>
        {"Saving " + batch.slugs.length + (batch.slugs.length === 1 ? " track…" : " tracks…")}
      </div>
      <ui.Progress value={batch.pct} label={batch.label} />
      <small style={muted}>You can keep working; this updates by itself.</small>
    </div>
  ) : lastSave && (lastSave.saved.length > 0 || lastSave.failed.length > 0) ? (
    <div
      style={{
        border: "1px solid " + SELECTS_GREEN,
        background: "rgba(75, 222, 128, 0.12)",
        borderRadius: "var(--panel-radius)",
        padding: "8px 10px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0, color: SELECTS_GREEN, fontWeight: 600 }}>
          {lastSave.saved.length > 0
            ? "✓ " +
              lastSave.saved.length +
              (lastSave.saved.length === 1 ? " track" : " tracks") +
              " saved to My tracks"
            : "Nothing was saved"}
          <small style={{ ...muted, fontWeight: 400 }}>
            {hhmm(lastSave.at) ? " · " + hhmm(lastSave.at) : ""}
          </small>
        </div>
        <ui.IconButton icon="close" label="Dismiss" onClick={() => setLastSave(null)} />
      </div>
      {lastSave.saved.map((t) => (
        <div key={"s" + t} style={{ color: SELECTS_GREEN, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {"• " + t}
        </div>
      ))}
      {lastSave.failed.length > 0 ? (
        <div style={{ color: "var(--panel-danger)" }}>
          {"Not saved: " + lastSave.failed.join(", ") + " — see the card for why."}
        </div>
      ) : null}
      {lastSave.saved.length > 0 ? (
        <ui.Actions>
          <ui.Button variant="ghost" onClick={() => setTab("mine")}>
            Open My tracks
          </ui.Button>
        </ui.Actions>
      ) : null}
    </div>
  ) : null;

  const browseTab = (
    <ui.Stack gap={8}>
      {messages}
      {setupWarning}
      <ui.Section title="Search">
        <ui.Segmented
          label="Looking for"
          value={kind}
          onChange={setKindAndBrowse}
          options={[
            { value: "music", label: "Music" },
            { value: "sfx", label: "Effects" },
          ]}
        />
        {/* Enter in the box runs the search. */}
        <div
          onKeyDown={(e: any) => {
            if (e.key === "Enter" && busy !== "search") {
              e.preventDefault();
              runSearch();
            }
          }}
        >
          <ui.TextField
            label="Search words (optional)"
            value={term}
            onChange={setTerm}
            placeholder="press Enter, or leave empty to browse"
          />
        </div>
        <ui.Actions>
          {(term.trim() || filterCount > 0) && (
            <ui.Button
              variant="ghost"
              disabled={busy === "search"}
              onClick={() => {
                setTerm("");
                clearFilters();
              }}
            >
              Reset
            </ui.Button>
          )}
          <ui.Button
            variant="primary"
            busy={busy === "search"}
            busyLabel="Loading…"
            onClick={runSearch}
          >
            {term.trim() ? "Search" : "Browse"}
          </ui.Button>
        </ui.Actions>
      </ui.Section>

      <ui.Section title="Filters">
        {genreFacets.length === 0 && moodFacets.length === 0 ? (
          <p>Loading genres and moods…</p>
        ) : null}
        <ui.Select
          label="Genre"
          value={selGenres[0] || ANY}
          onChange={(v) => applyFacet("genres", v === ANY ? "" : v)}
          options={facetOptions(genreFacets, "Any genre")}
          disabled={busy === "search"}
        />
        <ui.Select
          label="Mood"
          value={selMoods[0] || ANY}
          onChange={(v) => applyFacet("moods", v === ANY ? "" : v)}
          options={facetOptions(moodFacets, "Any mood")}
          disabled={busy === "search"}
        />
        <ui.Select
          label="Tempo"
          value={presetFor(bpmMin, bpmMax)}
          onChange={applyTempo}
          options={tempoOptions}
          disabled={busy === "search"}
        />
        <ui.Segmented
          label="Vocals"
          value={vocals}
          onChange={setVocalsAndBrowse}
          options={[
            { value: "any", label: "Any" },
            { value: "instrumental", label: "Instr." },
            { value: "vocals", label: "Vocals" },
          ]}
        />
        {filterCount > 0 && (
          <ui.Row gap={4}>
            {selGenres.map((g) =>
              pill(genreFacets.find((f) => f.key === g)?.label ?? g, () =>
                applyFacet("genres", ""),
              ),
            )}
            {selMoods.map((m) =>
              pill(moodFacets.find((f) => f.key === m)?.label ?? m, () =>
                applyFacet("moods", ""),
              ),
            )}
            {vocals !== "any" &&
              pill(vocals === "vocals" ? "Vocals" : "Instrumental", () =>
                setVocalsAndBrowse("any"),
              )}
            {(bpmMin > 0 || bpmMax > 0) &&
              pill(
                BPM_PRESETS.find((b) => b.value === presetFor(bpmMin, bpmMax))
                  ?.label ?? bpmMin + "–" + bpmMax + " BPM",
                () => applyTempo("any"),
              )}
            <ui.Button variant="ghost" onClick={clearFilters}>
              Clear all
            </ui.Button>
          </ui.Row>
        )}
      </ui.Section>

      {(pending.length > 0 || batch || saveBanner) && (
        <ui.Section title={"Download list (" + pending.length + ")"}>
          {saveBanner}
          {batch ? null : pending.length === 0 ? null : (
            <small style={muted}>
              Pick all the tracks you want first, then save them together.
              Each save opens one Selects chat for the whole list (up to{" "}
              {MAX_BATCH} tracks), so fewer, bigger saves mean fewer chats.
            </small>
          )}
          <ui.Stack gap={4}>
            {pending.map((h) => (
              <ui.Row key={h.slug} gap={8} align="center">
                <div style={{ flex: 1, minWidth: 0, ...titleStyle, fontWeight: 400 }}>
                  {h.title}
                  <small style={muted}>{h.artist ? " · " + h.artist : ""}</small>
                </div>
                <ui.IconButton
                  icon="close"
                  label="Take off the list"
                  disabled={busy === "batch"}
                  onClick={() => toggleQueue(h)}
                />
              </ui.Row>
            ))}
          </ui.Stack>
          {pending.length > 0 ? (
          <ui.Actions>
            <ui.Button
              variant="ghost"
              disabled={busy === "batch"}
              onClick={() => setQueue([])}
            >
              Clear list
            </ui.Button>
            <ui.Button
              variant="primary"
              icon="download"
              disabled={!ready || busy !== "" || pending.length === 0}
              busy={busy === "batch"}
              busyLabel="Saving…"
              onClick={() => saveTracks(pending)}
            >
              {"Save " +
                Math.min(pending.length, MAX_BATCH) +
                (pending.length === 1 ? " track" : " tracks") +
                " to My tracks"}
            </ui.Button>
          </ui.Actions>
          ) : null}
        </ui.Section>
      )}

      {hits.length === 0 && filterCount > 0 && busy === "" ? (
        <ui.Section title="No results">
          <ui.Message tone="error">
            Nothing carries all {filterCount} filters at once.
          </ui.Message>
          <ui.Actions>
            <ui.Button variant="secondary" onClick={clearFilters}>
              Clear filters
            </ui.Button>
          </ui.Actions>
        </ui.Section>
      ) : null}

      {hits.length > 0 && (
        <ui.Section
          title={
            "Results (" + hits.length + (totalHits ? " of " + totalHits.toLocaleString() : "") + ")"
          }
        >
          <ui.Grid minItemWidth={240}>
            {hits.map((h) => {
              const isSaved = !!library[h.slug];
              const queued = inQueue(h.slug);
              const running = batch?.slugs.includes(h.slug);
              return (
                <div key={h.slug || String(h.id)} style={cardStyle}>
                  <ui.Row gap={8} align="center">
                    {h.img ? (
                      <img
                        src={thumbs[h.slug] || h.img}
                        alt=""
                        loading="lazy"
                        onError={() => fetchThumb(h.slug, h.img)}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 4,
                          objectFit: "cover",
                          flex: "0 0 auto",
                        }}
                      />
                    ) : null}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={titleStyle}>{h.title}</div>
                      <small style={muted}>
                        {[h.artist, mmss(h.len), h.bpm ? h.bpm + " BPM" : ""]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>
                    </div>
                    {h.mp3 ? (
                      <ui.IconButton
                        icon={playing === h.slug ? "pause" : "play"}
                        label={playing === h.slug ? "Stop preview" : "Preview"}
                        onClick={() => togglePlay(h.slug, h.mp3, h.wf)}
                      />
                    ) : null}
                  </ui.Row>
                  {playing === h.slug ? (
                    peaks[h.slug] ? (
                      <Wave bars={peaks[h.slug]} at={progress} onSeek={seekTo} />
                    ) : (
                      <small style={muted}>
                        {h.wf ? "Loading waveform…" : "No waveform for this track"}
                      </small>
                    )
                  ) : null}
                  {h.moods && h.moods.length > 0 ? (
                    <small style={muted}>{h.moods.join(" · ")}</small>
                  ) : null}
                  {running && batch ? (
                    <ui.Progress label={cardMsg[h.slug]?.text || batch.label} />
                  ) : (
                    cardMessage(h.slug)
                  )}
                  <ui.Actions>
                    {isSaved ? (
                      <>
                        <ui.Button variant="ghost" disabled onClick={() => {}}>
                          ✓ Saved
                        </ui.Button>
                        <ui.Button
                          variant="secondary"
                          disabled={!context?.sequenceId || busy !== ""}
                          busy={busy === "draft" + h.slug}
                          busyLabel="Placing…"
                          onClick={() => addToDraft(h.slug)}
                        >
                          {"Add to draft " + placeLabel}
                        </ui.Button>
                      </>
                    ) : (
                      <>
                        <ui.Button
                          variant={queued ? "ghost" : "secondary"}
                          disabled={busy === "batch"}
                          busy={!!running}
                          busyLabel="Saving…"
                          onClick={() => toggleQueue(h)}
                        >
                          {queued ? "✓ On list — remove" : "+ Add to list"}
                        </ui.Button>
                      </>
                    )}
                  </ui.Actions>
                </div>
              );
            })}
          </ui.Grid>
          <ui.Actions>
            <ui.Button
              variant="ghost"
              icon="refresh"
              disabled={busy !== ""}
              busy={busy === "shuffle"}
              busyLabel="Shuffling…"
              onClick={shuffle}
            >
              Shuffle
            </ui.Button>
            <ui.Button
              variant="secondary"
              busy={busy === "more"}
              busyLabel="Loading…"
              disabled={(totalPages > 0 && page >= totalPages) || busy !== ""}
              onClick={loadMore}
            >
              Load more
            </ui.Button>
          </ui.Actions>
        </ui.Section>
      )}
    </ui.Stack>
  );

  // ---- My tracks -------------------------------------------------------------

  const needle = mineFilter.trim().toLowerCase();
  const when = (e: LibEntry) => Date.parse(e.addedAt || "") || 0;
  const allMine = Object.entries(library).sort(([, a], [, b]) => when(b) - when(a));
  const mine = needle
    ? allMine.filter(([, e]) =>
        [e.title, e.artist, e.note, e.file, e.folder]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
    : allMine;

  const myTracksTab = (
    <ui.Stack gap={8}>
      {messages}
      {allMine.length === 0 ? (
        <ui.Section title="Nothing yet">
          <p>
            Tracks you save appear here, in every project, with a note you can
            write against each one. A track only enters a project when you add
            it to a draft.
          </p>
        </ui.Section>
      ) : (
        <ui.Section
          title={
            (needle ? mine.length + " of " : "") +
            allMine.length +
            " track" +
            (allMine.length === 1 ? "" : "s")
          }
        >
          <ui.TextField
            label="Find"
            value={mineFilter}
            onChange={setMineFilter}
            placeholder="title, artist or note — e.g. market walk"
          />
          <ui.Segmented
            label="Place at"
            value={placeAt}
            onChange={setPlaceAt}
            options={[
              { value: "start", label: "Start" },
              { value: "playhead", label: "Playhead" },
            ]}
          />
          <ui.Stack gap={8}>
            {mine.map(([key, e]) => {
              const url = e.slug ? trackUrl(e.slug) : "";
              const draftVal = noteDraft[key] ?? e.note ?? "";
              return (
                <div key={key} style={cardStyle}>
                  <ui.Row gap={8} align="center">
                    {e.img ? (
                      <img
                        src={thumbs[key] || e.img}
                        alt=""
                        loading="lazy"
                        onError={() => fetchThumb(key, e.img)}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 4,
                          objectFit: "cover",
                          flex: "0 0 auto",
                        }}
                      />
                    ) : null}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={titleStyle}>{e.title || e.file}</div>
                      <small style={muted}>
                        {[
                          e.artist,
                          mmss(e.len),
                          e.bpm ? e.bpm + " BPM" : "",
                          e.folder,
                          inProject[key] ? "✓ in this project" : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>
                    </div>
                    {e.path || e.mp3 ? (
                      <ui.IconButton
                        icon={playing === key ? "pause" : "play"}
                        label={playing === key ? "Stop" : "Play"}
                        onClick={async () =>
                          togglePlay(
                            key,
                            missing[key] ? "" : (await localUrl(e.path)),
                            e.wf || "",
                            e.mp3,
                            missing[key] ? "" : e.path || "",
                          )
                        }
                      />
                    ) : null}
                  </ui.Row>

                  {playing === key ? (
                    peaks[key] ? (
                      <Wave bars={peaks[key]} at={progress} onSeek={seekTo} />
                    ) : (
                      <small style={muted}>
                        {waveFailed[key] || (!e.wf && (!e.path || missing[key]))
                          ? "No waveform for this track"
                          : "Loading waveform…"}
                      </small>
                    )
                  ) : null}

                  {missing[key] ? (
                    <ui.Message tone="error">
                      File missing — it is no longer at {e.path}
                    </ui.Message>
                  ) : null}

                  <ui.Row gap={4} align="center">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <ui.TextField
                        label="Note"
                        value={draftVal}
                        onChange={(v) => {
                          setNoteDraft((d) => ({ ...d, [key]: v }));
                          if (cardMsg[key]) {
                            setCardMsg((m) => {
                              const n = { ...m };
                              delete n[key];
                              return n;
                            });
                          }
                        }}
                        placeholder="e.g. use under the market walk"
                      />
                    </div>
                    <ui.IconButton
                      icon="check"
                      label="Save note"
                      disabled={
                        busy === "note" + key ||
                        noteDraft[key] === undefined ||
                        noteDraft[key] === (e.note || "")
                      }
                      onClick={() => saveNote(key, noteDraft[key] ?? "")}
                    />
                  </ui.Row>

                  {cardMessage(key)}

                  <ui.Actions>
                    <ui.IconButton
                      icon="folder"
                      label={IS_WIN ? "Show in File Explorer" : "Show in Finder"}
                      disabled={!e.path || !!missing[key]}
                      onClick={() => revealInFinder(e.path)}
                    />
                    {url ? (
                      <ui.IconButton
                        icon="link"
                        label="Copy Epidemic Sound link"
                        onClick={() => copyText(key, url)}
                      />
                    ) : null}
                    <ui.Button
                      variant={confirmRemove === key ? "danger" : "ghost"}
                      onClick={() =>
                        confirmRemove === key
                          ? removeFromLibrary(key)
                          : setConfirmRemove(key)
                      }
                    >
                      {confirmRemove === key ? "Confirm remove" : "Remove"}
                    </ui.Button>
                    <ui.Button
                      variant="secondary"
                      disabled={!context?.sequenceId || !!missing[key] || busy !== ""}
                      busy={busy === "draft" + key}
                      busyLabel="Placing…"
                      onClick={() => addToDraft(key)}
                    >
                      {"Add to draft " + placeLabel}
                    </ui.Button>
                  </ui.Actions>
                </div>
              );
            })}
          </ui.Stack>
        </ui.Section>
      )}
    </ui.Stack>
  );

  // ---- Settings --------------------------------------------------------------

  const settingsTab = (
    <ui.Stack gap={8}>
      {messages}
      <ui.Section title="Library folder">
        <ui.TextField
          label="Every track is saved here"
          value={libDraft}
          onChange={setLibDraft}
          placeholder={IS_WIN ? "~\\Music\\Epidemic Sound" : "~/Music/Epidemic Sound"}
        />
        <ui.Actions>
          <ui.Button variant="ghost" busy={busy === "folder"} onClick={chooseFolder}>
            Choose…
          </ui.Button>
          <ui.Button
            variant="secondary"
            disabled={!libDraft || libDraft === savedLib}
            onClick={() => persistFolder(libDraft)}
          >
            Save
          </ui.Button>
        </ui.Actions>
      </ui.Section>

      <ui.Section title="Epidemic Sound account">
        <ui.Message tone={signedIn === false ? "error" : signedIn ? "success" : "muted"}>
          {signedIn === false
            ? "Not signed in — downloads will not start."
            : signedIn
              ? "Signed in."
              : "Not checked yet — it is checked on your first save."}
        </ui.Message>
        <small style={muted}>
          Use your password, not a Google passkey — the passkey prompt can’t
          finish inside the Selects browser.
        </small>
        <ui.Actions>
          <ui.Button variant="ghost" onClick={() => markSignedIn(true)}>
            I’ve signed in
          </ui.Button>
          <ui.Button
            variant="secondary"
            busy={busy === "login"}
            busyLabel="Opening…"
            onClick={openLogin}
          >
            Sign in
          </ui.Button>
        </ui.Actions>
      </ui.Section>

      <ui.Section title="Downloads">
        <ui.Segmented
          label="File format"
          value={settings.format}
          onChange={(v) => updateSettings({ format: v === "wav" ? "wav" : "mp3" })}
          options={[
            { value: "mp3", label: "MP3 · small" },
            { value: "wav", label: "WAV · full quality" },
          ]}
        />
        <small style={muted}>
          MP3 is about 6 MB a track, WAV 40–70 MB. MP3 is fine for rough cuts;
          use WAV for the final mix.
        </small>
      </ui.Section>

      <ui.Section title="Auto-file from Downloads">
        <ui.Toggle
          label="File downloads automatically"
          value={watching}
          disabled={!ready || busy === "watch"}
          onChange={(v) => (v ? startWatch() : setWatching(false))}
        />
        <ui.Segmented
          label="File them as"
          value={settings.autoKind}
          onChange={(v) => updateSettings({ autoKind: v === "sfx" ? "sfx" : "music" })}
          options={[
            { value: "music", label: "Music" },
            { value: "sfx", label: "Sound Effects" },
          ]}
        />
        <small style={muted}>
          For tracks you grab on the Epidemic Sound site yourself. It catches any
          audio that lands in Downloads, so switch it off when downloading
          unrelated files. It turns itself off when the panel reloads.
        </small>
      </ui.Section>

      {log.length > 0 && (
        <ui.Section
          title="Recent activity"
          actions={
            <ui.IconButton icon="trash" label="Clear" onClick={() => setLog([])} />
          }
        >
          <ui.Stack gap={4}>
            {log.slice(0, 12).map((l, i) => (
              <ui.Message key={i} tone={l.ok ? "success" : "error"}>
                {l.name} — {l.note}
              </ui.Message>
            ))}
          </ui.Stack>
        </ui.Section>
      )}
    </ui.Stack>
  );

  return (
    <ui.Tabs
      value={tab}
      onChange={setTab}
      tabs={[
        { value: "browse", label: "Browse", content: browseTab },
        {
          value: "mine",
          label: "My tracks" + (allMine.length ? " (" + allMine.length + ")" : ""),
          content: myTracksTab,
        },
        {
          value: "settings",
          label: "Settings" + (!savedLib || signedIn === false ? " •" : ""),
          content: settingsTab,
        },
      ]}
    />
  );
}

let hostSdk: any = null;
function hostUseSdk(sdk: any) { hostSdk = panelLocalClient(sdk); if (!hostSdk?.files || !hostSdk?.media || !hostSdk?.environment) throw new Error("Update Selects to use this plugin."); }

// local-sdk:start
/** Pure host-platform path operations; no filesystem or renderer globals. */
function panelLocalPaths(platform: string) {
  const windows = platform === "win32";
  const slash = (path: string) => {
    if (typeof path !== "string")
      throw new TypeError("A path must be a string.");
    return windows ? path.replace(/\\/g, "/") : path;
  };
  const rootOf = (path: string) => {
    if (windows) {
      const unc = path.match(/^\/\/[^/]+\/[^/]+\/?/);
      if (unc) return unc[0].replace(/\/?$/, "/");
      const drive = path.match(/^[a-z]:\/?/i);
      if (drive) return drive[0];
    }
    return path.startsWith("/") ? "/" : "";
  };
  const native = (value: string) =>
    windows ? value.replace(/\//g, "\\") : value;
  const normalize = (value: string) => {
    const path = slash(value),
      root = rootOf(path),
      absolute = root.endsWith("/");
    const segments: string[] = [];
    for (const segment of path
      .slice(Math.min(root.length, path.length))
      .split("/")) {
      if (!segment || segment === ".") continue;
      if (segment === ".." && segments.length && segments.at(-1) !== "..")
        segments.pop();
      else if (segment !== ".." || !absolute) segments.push(segment);
    }
    let result = root + segments.join("/");
    if (!result || (windows && /^[a-z]:$/i.test(result))) result += ".";
    if (path.endsWith("/") && !result.endsWith("/")) result += "/";
    return native(result);
  };
  const basename = (value: string, extension?: string) => {
    const path = slash(value).replace(/\/+$/, "");
    const withoutDrive = windows ? path.replace(/^[a-z]:/i, "") : path;
    const name = withoutDrive.slice(withoutDrive.lastIndexOf("/") + 1);
    return extension && name.endsWith(extension)
      ? name.slice(0, -extension.length)
      : name;
  };
  return {
    normalize,
    join: (...paths: string[]) => {
      const parts = paths.map(slash).filter(Boolean);
      let joined = parts.join("/");
      if (windows && !/^\/\/[^/]/.test(parts[0] || ""))
        joined = joined.replace(/^\/{2,}/, "/");
      return normalize(joined);
    },
    dirname(value: string) {
      const path = slash(value),
        root = rootOf(path);
      const end = path.replace(/\/+$/, "").lastIndexOf("/");
      if (end < root.length) return value.slice(0, root.length) || ".";
      return value.slice(0, end);
    },
    basename,
    extname(value: string) {
      const name = basename(value),
        dot = name.lastIndexOf(".");
      return dot <= 0 || name === ".." ? "" : name.slice(dot);
    },
    isAbsolute: (value: string) => rootOf(slash(value)).endsWith("/"),
  };
}


/** Plugin-private composition of canonical SDK methods, not a public SDK surface. */
async function createPanelLocalClient(sdk: any) {
  const run = async (method: string, args: unknown[], write = false) => {
    // method names below are fixed implementation constants; values always use JSON encoding.
    // Direct arguments keep object literals contextually typed by the SDK signature.
    const response = await sdk.runScript({
      summary: "Use local media workspace",
      allowCommit: write,
      script: "return await selects." + method + "(" + JSON.stringify(args).slice(1, -1) + ");",
    });
    if (response.isError) throw new Error(response.output || "Local SDK operation failed.");
    // A clipped report has no result. Every read returning data rejects that case below.
    return response.result;
  };
  const environment = await run("files.environment", []);
  if (!environment || typeof environment.platform !== "string" || !environment.homedir)
    throw new Error("Update Selects to use this plugin's local media workspace.");
  const paths = panelLocalPaths(environment.platform);
  const CHUNK_BYTES = 48 * 1024;
  const readRange = async (path: string, offset: number, length: number) => {
    const parts: Uint8Array[] = [];
    let total = 0;
    while (total < length) {
      const result = await run("files.readRange", [{ path, offset: offset + total, length: Math.min(CHUNK_BYTES, length - total) }]);
      if (!result || typeof result.base64 !== "string" || !Number.isInteger(result.bytesRead)) throw new Error("The file read returned an incomplete result.");
      const bytes = Uint8Array.from(atob(result.base64), (character) => character.charCodeAt(0));
      if (bytes.length !== result.bytesRead) throw new Error("The file read returned invalid bytes.");
      parts.push(bytes); total += bytes.length;
      if (bytes.length < Math.min(CHUNK_BYTES, length - (total - bytes.length))) break;
    }
    const output = new Uint8Array(total);
    let position = 0;
    for (const bytes of parts) { output.set(bytes, position); position += bytes.length; }
    return output;
  };
  const files = {
    ...paths,
    homedir: () => environment.homedir,
    getOrCreateTmpDirPath: async () => environment.tempDirectory,
    exists: (path: string) => run("files.exists", [path]),
    stat: (path: string) => run("files.stat", [path]),
    readdir: (path: string) => run("files.readdir", [path]),
    readRange,
    async readFile(path: string, encoding?: string) {
      const stat = await run("files.stat", [path]);
      if (!stat || !Number.isSafeInteger(stat.size) || stat.size < 0) throw new Error("The file is unavailable.");
      const bytes = await readRange(path, 0, stat.size);
      if (bytes.length !== stat.size) throw new Error("The file changed while it was being read.");
      if (encoding !== undefined && encoding !== "utf8") throw new Error("Only utf8 text encoding is supported.");
      return encoding === "utf8" ? new TextDecoder().decode(bytes) : bytes;
    },
    async writeFile(path: string, data: string | Uint8Array, options?: string | { encoding?: string; flag?: "w" | "a" | "wx" }) {
      const encoding = typeof options === "string" ? options : options?.encoding;
      const flag = typeof options === "object" ? options.flag : undefined;
      if (flag !== undefined && !["w", "a", "wx"].includes(flag)) throw new Error("Unsupported file write flag.");
      if (encoding !== undefined && encoding !== "utf8") throw new Error("Only utf8 text encoding is supported.");
      const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
      if ((flag === "a" || flag === "wx") && bytes.length > CHUNK_BYTES) throw new Error("Atomic append and exclusive creation are limited to 48 KiB.");
      // Each complete replacement has its own sibling file. Other panels cannot
      // overwrite one of its chunks before the final atomic rename publishes it.
      const replacement = flag !== "a" && flag !== "wx";
      const destination = replacement ? path + ".tmp-" + crypto.randomUUID() : path;
      let published = false;
      try {
        for (let offset = 0; offset < bytes.length || offset === 0; offset += CHUNK_BYTES) {
          const chunk = bytes.subarray(offset, offset + CHUNK_BYTES);
          let binary = "";
          for (const byte of chunk) binary += String.fromCharCode(byte);
          const mode = offset === 0 ? (flag === "a" ? "append" : "exclusive") : undefined;
          const result = await run("files.writeChunk", [{ path: destination, offset, base64: btoa(binary), ...(mode ? { mode } : {}) }], true);
          if (result?.bytesWritten !== chunk.length) throw new Error("The file write returned an incomplete result. Check the file before retrying.");
        }
        if (replacement) await run("files.rename", [destination, path], true);
        published = true;
      } finally {
        if (replacement && !published) await run("files.remove", [destination, { force: true }], true).catch(() => {});
      }
    },
    async compareAndReplace(path: string, expectedText: string | null, text: string) {
      const encode = (value: string) => {
        const bytes = new TextEncoder().encode(value);
        if (bytes.length > CHUNK_BYTES) throw new Error("Atomic file values are limited to 48 KiB.");
        let binary = "";
        for (const byte of bytes) binary += String.fromCharCode(byte);
        return btoa(binary);
      };
      const result = await run("files.compareAndReplace", [{path, expectedBase64: expectedText === null ? null : encode(expectedText), base64: encode(text)}], true);
      if (typeof result?.replaced !== "boolean") throw new Error("The atomic file update returned an incomplete result. Read the file before retrying.");
      return result.replaced;
    },
    mkdir: (path: string, options?: { recursive?: boolean }) => run("files.mkdir", [path, options ?? {}], true),
    rm: (path: string, options?: { recursive?: boolean; force?: boolean }) => run("files.remove", [path, options ?? {}], true),
    removeFile: ({ filePath }: { filePath: string }) => run("files.remove", [filePath, { force: true }], true),
    rename: (from: string, to: string) => run("files.rename", [from, to], true),
    copyFile: (from: string, to: string) => run("files.copy", [from, to], true),
    downloadFile: (url: string, path: string) => run("files.download", [url, path], true),
    pathToLocalURL: (path: string) => run("files.localUrl", [path]),
    localURLToPath: (url: string) => run("files.pathFromLocalUrl", [url]),
  };
  const activeJobs = new Set<string>();
  let disposed = false;
  const cancel = async (jobId: string) => {
    const response = await sdk.runScript({ summary: "Cancel local media processing", allowCommit: true, script: "await selects.media.job(" + JSON.stringify(jobId) + ").cancel();" });
    if (response.isError) throw new Error(response.output || "Media cancellation failed.");
  };
  const process = async (executable: "FFmpeg" | "FFprobe", args: string[], _withoutLog?: boolean, signal?: AbortSignal, onStdout?: (text: string) => void, onStderr?: (text: string) => void) => {
    if (disposed || signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const started = await run("media.start" + executable, [{ args }], true);
    if (!started?.jobId) throw new Error("The media process did not return a job id.");
    const jobId = started.jobId;
    activeJobs.add(jobId);
    let cancellation: Promise<void> | null = null;
    const abort = () => { cancellation ??= cancel(jobId); void cancellation.catch(() => {}); };
    signal?.addEventListener("abort", abort, { once: true });
    if (disposed || signal?.aborted) abort();
    let cursor = 0, stdout = "", stderr = "";
    try {
      while (true) {
        if (cancellation) await cancellation;
        const status = await sdk.call("getLocalMediaJobStatus", jobId, { cursor });
        if (!status || !Array.isArray(status.events)) throw new Error("Media status is unavailable.");
        if (status.truncated) throw new Error("Media output was truncated; no incomplete result was accepted.");
        for (const event of status.events) {
          if (event.stream === "stdout") { stdout += event.text; onStdout?.(event.text); }
          else { stderr += event.text; onStderr?.(event.text); }
        }
        cursor = status.nextCursor;
        if (status.state !== "running" && status.events.length === 0) {
          if (status.state === "cancelled" || signal?.aborted) throw new DOMException("Aborted", "AbortError");
          if (status.state === "failed") throw new Error(status.error || stderr || "Media processing failed.");
          return { stdout, stderr };
        }
        if (status.state === "running") await new Promise((resolve) => setTimeout(resolve, 150));
      }
    } catch (error) {
      await cancel(jobId).catch(() => {});
      throw error;
    } finally {
      signal?.removeEventListener("abort", abort);
      activeJobs.delete(jobId);
    }
  };
  return {
    files,
    environment,
    media: {
      runFFmpeg: (args: string[], quiet?: boolean, signal?: AbortSignal, stdout?: (text: string) => void, stderr?: (text: string) => void) => process("FFmpeg", args, quiet, signal, stdout, stderr),
      runFFprobe: (args: string[], quiet?: boolean, signal?: AbortSignal) => process("FFprobe", args, quiet, signal),
    },
    dialogs: {
      pickFilePath: (filters?: Array<{ name: string; extensions: string[] }>) => run("editor.pickFile", [{ filters }]),
      pickDirectoryPath: () => run("editor.pickDirectory", []),
      pickSavePath: (defaultPath: string) => run("editor.pickSavePath", [{ defaultPath }]),
    },
    dispose() { disposed = true; for (const jobId of activeJobs) void cancel(jobId).catch(() => {}); },
  };
}

const panelLocalClients = new WeakMap<object, any>();
function panelLocalClient(sdk: any): any {
  const client = panelLocalClients.get(sdk);
  if (!client) throw new Error("Local SDK has not initialized.");
  return client;
}
function withPanelLocalClient(Component: any) {
  return function LocalSdkPanel(props: any) {
    const [state, setState] = React.useState<any>(null);
    React.useEffect(() => {
      let active = true;
      let client: any;
      createPanelLocalClient(props.sdk).then(value => {
        client = {...props.sdk, ...value};
        if (!active) { value.dispose(); return; }
        panelLocalClients.set(props.sdk, client);
        setState({sdk: props.sdk});
      }).catch(error => { if (active) setState({error: String(error?.message || error)}); });
      return () => {
        active = false;
        if (client) {
          if (panelLocalClients.get(props.sdk) === client) panelLocalClients.delete(props.sdk);
          client.dispose();
        }
      };
    }, [props.sdk]);
    if (state?.error) return React.createElement("div", {role: "alert"}, state.error);
    if (state?.sdk !== props.sdk) return React.createElement("div", {role: "status"}, "Connecting to Selects…");
    return React.createElement(Component, props);
  };
}

export default withPanelLocalClient(withStoredPanel(Panel, loadState));
// local-sdk:end
