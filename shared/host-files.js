// Local files and media tools use the public async SDK. Paths remain host-native.
let hostSdk = null;
function hostUseSdk(sdk) { hostSdk = panelLocalClient(sdk); }
function hostError(code, message, member = "") { return Object.assign(new Error(message), { code, member }); }
// A host service when it has every named method, else null.
function hostApi(name, ...methods) {
  const s = name === "FileSystem" ? hostSdk?.files : name === "Runtime" ? hostSdk?.media : null;
  return s && methods.every((m) => typeof s[m] === "function") ? s : null;
}
// A host service that must have `method`; throws a 'host-missing' error when this build lacks it.
function hostNeed(name, method) {
  const s = hostApi(name, method);
  if (!s) throw hostError("host-missing", "Update Selects to use this plugin: missing SDK " + name + "." + method, name + "." + method);
  return s;
}
// The host initializes the environment before mounting the panel.
function hostIsWindows() { return /^win/i.test(String(hostSdk?.environment?.platform || "")); }
// Joins path parts with the host's join (the OS separator), or by hand with the OS separator.
function hostJoin(...parts) {
  const fs = hostApi("FileSystem", "join");
  if (fs) { try { return String(fs.join(...parts)); } catch { /* join by hand */ } }
  const sep = hostIsWindows() ? "\\" : "/";
  return parts.filter((x) => x !== "").map((x, i) => (i === 0 ? x.replace(/[\\/]+$/, "") : x.replace(/^[\\/]+|[\\/]+$/g, ""))).join(sep);
}
// A Buffer, ArrayBuffer or typed array as bytes (a Buffer may be a view into a larger pool). The value comes from the
// host window (window.parent), another JavaScript realm, so `instanceof ArrayBuffer` is false for it: the checks use
// the internal [[Class]] tag and array-likeness instead.
function hostBytes(v) {
  const tag = (x) => Object.prototype.toString.call(x);
  if (tag(v) === "[object ArrayBuffer]") return new Uint8Array(v);
  if (v && typeof v.byteLength === "number" && v.buffer && tag(v.buffer) === "[object ArrayBuffer]") {
    return new Uint8Array(v.buffer, v.byteOffset || 0, v.byteLength);
  }
  if (v && typeof v === "object" && typeof v.length === "number") return Uint8Array.from(v);
  throw hostError("read-failed", "the file could not be read");
}
// A file's bytes (FileSystem.readFile without an encoding).
async function hostReadBytes(path) {
  const v = await hostNeed("FileSystem", "readFile").readFile(path);
  if (typeof v === "string") throw hostError("read-failed", "the file came back as text");
  return hostBytes(v);
}
// A text file (some host builds return text directly, others bytes).
async function hostReadText(path) {
  const v = await hostNeed("FileSystem", "readFile").readFile(path);
  return typeof v === "string" ? v : new TextDecoder().decode(hostBytes(v));
}
// Cleanup is best effort; all disk operations cross the async SDK bridge.
async function hostRemove(path) {
  try { await hostNeed("FileSystem", "removeFile").removeFile({ filePath: path }); } catch { /* leftover temporary file */ }
}
async function hostRoots(sdk, id, marker) {
  hostUseSdk(sdk);
  const fs = hostNeed("FileSystem", "exists");
  const plugin = fs.join(fs.homedir(), ".selects", "skills", id);
  if (!await fs.exists(fs.join(plugin, marker))) throw hostError("not-found", "the plugin folder could not be found");
  let data = fs.join(fs.homedir(), ".selects", "plugin-data", id);
  try { await fs.mkdir(data, { recursive: true }); } catch { data = null; }
  return { plugin, data };
}
