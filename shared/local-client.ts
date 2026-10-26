import React from "react";
import {fingerprintTemplateFile} from './file-observation.js';
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
  const SCRIPT_BYTES = 256 * 1024;
  const runSource = async (script: string, write = false) => {
    if (new TextEncoder().encode(script).byteLength > SCRIPT_BYTES) throw new Error("The local file script exceeds the 256 KiB limit.");
    const response = await sdk.runScript({
      summary: "Use local media workspace",
      allowCommit: write,
      script,
    });
    if (response.isError) throw new Error(response.output || "Local SDK operation failed.");
    // A clipped report has no result. Every read returning data rejects that case below.
    return response.result;
  };
  // Direct arguments keep object literals contextually typed by the SDK signature.
  const run = (method: string, args: unknown[], write = false) =>
    runSource("return await selects." + method + "(" + JSON.stringify(args).slice(1, -1) + ");", write);
  const environment = await run("files.environment", []);
  if (!environment || typeof environment.platform !== "string" || !environment.homedir)
    throw new Error("Update Selects to use this plugin's local media workspace.");
  const paths = panelLocalPaths(environment.platform);
  const CHUNK_BYTES = 48 * 1024;
  // Three encoded chunks occupy 192 KiB, below the Panel's default 256 KiB result
  // budget. The same script still awaits each canonical file operation in order.
  const fileBatch = async (method: "readRange" | "writeChunk", inputs: unknown[], lengths: number[]) => {
    let count = Math.min(3, inputs.length), script = "";
    while (count > 0) {
      script = "const rows=[];" + inputs.slice(0, count).map((input, index) => {
        const call = "{const result=await selects.files." + method + "(" + JSON.stringify(input) + ");";
        if (method === "writeChunk")
          return call + "if(result?.bytesWritten!==" + lengths[index] + ")throw Error('The file write returned an incomplete result. Check the file before retrying.');rows.push(result);}";
        return call + "if(!result||typeof result.base64!=='string'||!Number.isSafeInteger(result.bytesRead)||result.bytesRead<0||result.bytesRead>" + lengths[index] + ")throw Error('The file read returned an incomplete result.');rows.push(result);if(result.bytesRead<" + lengths[index] + ")return rows;}";
      }).join("") + "return rows;";
      if (new TextEncoder().encode(script).byteLength <= SCRIPT_BYTES) break;
      count--;
    }
    if (!count) throw new Error("The local file script exceeds the 256 KiB limit.");
    return { count, rows: await runSource(script, method === "writeChunk") };
  };
  const readRange = async (path: string, offset: number, length: number) => {
    const parts: Uint8Array[] = [];
    let total = 0;
    while (total < length) {
      const inputs = Array.from({ length: Math.min(3, Math.ceil((length - total) / CHUNK_BYTES)) }, (_, index) =>
        ({ path, offset: offset + total + index * CHUNK_BYTES, length: Math.min(CHUNK_BYTES, length - total - index * CHUNK_BYTES) }));
      const lengths = inputs.map(input => input.length);
      const { rows, count } = await fileBatch("readRange", inputs, lengths);
      if (!Array.isArray(rows) || rows.length < 1 || rows.length > count) throw new Error("The file read returned an incomplete result.");
      let short = false;
      for (let index = 0; index < rows.length; index++) {
        const result = rows[index];
        if (!result || typeof result.base64 !== "string" || !Number.isSafeInteger(result.bytesRead) || result.bytesRead < 0 || result.bytesRead > lengths[index]) throw new Error("The file read returned an incomplete result.");
        const bytes = Uint8Array.from(atob(result.base64), (character) => character.charCodeAt(0));
        if (bytes.length !== result.bytesRead) throw new Error("The file read returned invalid bytes.");
        short = bytes.length < lengths[index];
        if (short && index !== rows.length - 1) throw new Error("The file read returned invalid bytes.");
        parts.push(bytes); total += bytes.length;
      }
      if (rows.length !== count && !short) throw new Error("The file read returned an incomplete result.");
      if (short) break;
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
    // One script owns every read and its deadline; only the compact digest returns.
    fingerprint: (path: string, options?: { native?: boolean; signal?: AbortSignal; onProgress?: (bytes: number) => void; timeoutMs?: number }) =>
      options?.native ? nativeFingerprint(path, options) : runSource("return await (" + fingerprintTemplateFile.toString() + ")(selects.files," + JSON.stringify(path) + ");"),
    readdir: (path: string) => run("files.readdir", [path]),
    // SDK-shaped requests support the same shared observation in SDK scripts and
    // the panel. Positional reads retain their existing byte/partial-EOF contract.
    readRange: (path: string | {path: string; offset: number; length: number}, offset?: number, length?: number) =>
      typeof path === "string" ? readRange(path, offset!, length!) : run("files.readRange", [path]),
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
        let offset = 0;
        do {
          const inputs = [], lengths = [];
          for (let index = 0; index < (replacement ? 3 : 1) && (offset + index * CHUNK_BYTES < bytes.length || index === 0); index++) {
            const position = offset + index * CHUNK_BYTES, chunk = bytes.subarray(position, position + CHUNK_BYTES);
            let binary = "";
            for (const byte of chunk) binary += String.fromCharCode(byte);
            const mode = position === 0 ? (flag === "a" ? "append" : "exclusive") : undefined;
            inputs.push({ path: destination, offset: position, base64: btoa(binary), ...(mode ? { mode } : {}) });
            lengths.push(chunk.length);
          }
          if (!replacement) {
            const result = await run("files.writeChunk", [inputs[0]], true);
            if (result?.bytesWritten !== lengths[0]) throw new Error("The file write returned an incomplete result. Check the file before retrying.");
          } else {
            const { rows, count } = await fileBatch("writeChunk", inputs, lengths);
            if (!Array.isArray(rows) || rows.length !== count || rows.some((row, index) => row?.bytesWritten !== lengths[index])) throw new Error("The file write returned an incomplete result. Check the file before retrying.");
            lengths.length = count;
          }
          offset += lengths.reduce((sum, size) => sum + size, 0);
        } while (offset < bytes.length);
        if (replacement) await run("files.rename", [destination, path], true);
        published = true;
      } finally {
        if (replacement && !published) await run("files.remove", [destination, { recursive: false, force: true }], true).catch(() => {});
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
    rm: (path: string, options?: { recursive?: boolean; force?: boolean }) => run("files.remove", [path, { recursive: options?.recursive ?? false, force: options?.force ?? false }], true),
    removeFile: ({ filePath }: { filePath: string }) => run("files.remove", [filePath, { recursive: false, force: true }], true),
    rename: (from: string, to: string) => run("files.rename", [from, to], true),
    copyFile: (from: string, to: string) => run("files.copy", [from, to], true),
    downloadFile: (url: string, path: string) => run("files.download", [url, path], true),
    pathToLocalURL: (path: string) => run("files.localUrl", [path]),
    localURLToPath: (url: string) => run("files.pathFromLocalUrl", [url]),
  };
  const activeJobs = new Map<string, () => Promise<void>>();
  let disposed = false;
  const SETTLEMENT_MS = 5000, OUTPUT_BYTES = 4 * 1024 * 1024;
  const mediaIssue = (code: string, message: string, cause?: unknown, uncertain = false) =>
    Object.assign(new Error(message), { code: "LOCAL_MEDIA_" + code, publicMessage: message, terminal: true, cause,
      ...(uncertain ? { preserveTemporaryFiles: true } : {}) });
  const cancel = async (jobId: string) => {
    const response = await sdk.runScript({ summary: "Cancel local media processing", allowCommit: true, script: "await selects.media.job(" + JSON.stringify(jobId) + ").cancel();" });
    if (response.isError) throw new Error(response.output || "Media cancellation failed.");
  };
  const observeMedia = (read: () => Promise<any>, deadline: number): Promise<any> => new Promise((resolve, reject) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) { reject(mediaIssue("STATUS", "The media job response could not be confirmed.")); return; }
    const timer = setTimeout(() => reject(mediaIssue("STATUS", "The media job response could not be confirmed.")), remaining);
    Promise.resolve().then(read).then(
      value => { clearTimeout(timer); resolve(value); },
      cause => { clearTimeout(timer); reject(mediaIssue("STATUS", "The media job response could not be confirmed.", cause)); });
  });
  const validJob = (value: any) => typeof value?.jobId === "string" && !!value.jobId && value.jobId.length <= 1024;
  const process = async (executable: "FFmpeg" | "FFprobe", args: string[], _withoutLog?: boolean, signal?: AbortSignal, onStdout?: (text: string) => void, onStderr?: (text: string) => void) => {
    if (!Array.isArray(args) || args.some(arg => typeof arg !== "string" || arg.includes("\0")) ||
      signal && (typeof signal.aborted !== "boolean" || typeof signal.addEventListener !== "function" || typeof signal.removeEventListener !== "function") ||
      onStdout !== undefined && typeof onStdout !== "function" || onStderr !== undefined && typeof onStderr !== "function")
      throw mediaIssue("INPUT", "The local media arguments or subscriptions are invalid.");
    if (disposed || signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const startSource = "return await selects.media.start" + executable + "(" + JSON.stringify({ args }) + ");";
    if (new TextEncoder().encode(startSource).byteLength > SCRIPT_BYTES) throw mediaIssue("INPUT", "The local media request exceeds its script byte budget.");
    let started: any;
    const starting = runSource(startSource, true);
    try { started = await observeMedia(() => starting, Date.now() + SETTLEMENT_MS); }
    catch (cause) {
      // A late start identity can only stop that original job. Never start again
      // or authorize cleanup from this background cancellation acknowledgement.
      void starting.then(value => validJob(value) ? cancel(value.jobId) : undefined, () => {}).catch(() => {});
      throw mediaIssue("START_UNKNOWN", "The media job start could not be confirmed. Its temporary workspace is retained for inspection.", cause, true);
    }
    if (!validJob(started))
      throw mediaIssue("START_UNKNOWN", "The media job identity could not be confirmed. Its temporary workspace is retained for inspection.", undefined, true);
    const jobId = started.jobId;
    let cancellation: Promise<void> | null = null, cancellationDeadline: number | null = null, settled = false;
    const requestCancel = () => {
      if (!cancellation) {
        cancellationDeadline = Date.now() + SETTLEMENT_MS;
        cancellation = cancel(jobId);
        void cancellation.catch(() => {});
      }
      return cancellation;
    };
    const abort = () => { void requestCancel(); };
    activeJobs.set(jobId, requestCancel);
    signal?.addEventListener("abort", abort, { once: true });
    if (disposed || signal?.aborted) abort();
    let cursor = 0, outputBytes = 0, stdout = "", stderr = "";
    const knownState = (status: any) => ["running", "succeeded", "failed", "cancelled"].includes(status?.state);
    // Read-only observations may time out; a late reply cannot authorize cleanup.
    const statusAt = (deadline: number) => observeMedia(() => sdk.call("getLocalMediaJobStatus", jobId, { cursor }), deadline);
    const settleAfterFailure = async (cause: unknown) => {
      requestCancel();
      const deadline = cancellationDeadline!;
      while (Date.now() < deadline) {
        try {
          const status = await statusAt(deadline);
          if (knownState(status) && status.state !== "running") { settled = true; return; }
        } catch { /* Only independent status reads may recover an unknown reply. */ }
        if (Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, Math.min(50, deadline - Date.now())));
      }
      throw Object.assign(mediaIssue("SETTLEMENT_UNKNOWN", "The media job exit could not be confirmed. Its temporary workspace is retained for inspection.", cause, true), { jobId });
    };
    try {
      while (true) {
        if (cancellationDeadline !== null && Date.now() >= cancellationDeadline)
          throw mediaIssue("STATUS", "The cancelled media job status could not be confirmed.");
        const status = await statusAt(cancellationDeadline ?? Date.now() + SETTLEMENT_MS);
        if (!knownState(status)) throw mediaIssue("STATUS", "The media job returned an unknown status.");
        settled = status.state !== "running";
        if (!Array.isArray(status.events) || status.events.length > 8 || typeof status.truncated !== "boolean" || !Number.isSafeInteger(status.nextCursor) || status.nextCursor < cursor)
          throw mediaIssue("STATUS", "The media job returned an incomplete status.");
        if (status.truncated) throw mediaIssue("OUTPUT", "Media output was truncated; no incomplete result was accepted.");
        let position = cursor;
        for (const event of status.events) {
          if (!event || !["stdout", "stderr"].includes(event.stream) || typeof event.text !== "string" || event.text.length > 4096 || !Number.isSafeInteger(event.cursor) || event.cursor !== position + 1 || event.cursor > status.nextCursor)
            throw mediaIssue("OUTPUT", "The media job returned incomplete output.");
          outputBytes += new TextEncoder().encode(event.text).byteLength;
          if (outputBytes > OUTPUT_BYTES) throw mediaIssue("OUTPUT_LIMIT", "The media output exceeds its 4 MiB byte budget.");
          position = event.cursor;
          if (event.stream === "stdout") { stdout += event.text; onStdout?.(event.text); }
          else { stderr += event.text; onStderr?.(event.text); }
        }
        if (position !== status.nextCursor) throw mediaIssue("OUTPUT", "The media job returned an incomplete output cursor.");
        cursor = status.nextCursor;
        if (settled && status.events.length === 0) {
          if (status.state === "cancelled" || signal?.aborted || disposed) throw new DOMException("Aborted", "AbortError");
          if (status.state === "failed") throw new Error(status.error || stderr || "Media processing failed.");
          return { stdout, stderr };
        }
        if (!settled) await new Promise(resolve => setTimeout(resolve, 150));
      }
    } catch (error) {
      if (!settled) await settleAfterFailure(error);
      throw error;
    } finally {
      signal?.removeEventListener("abort", abort);
      activeJobs.delete(jobId);
    }
  };
  // Opt-in only: raw data demuxing copies every original byte into FFmpeg's hash
  // muxer. No media decoding, source rewrite, shell interpolation or hash cache.
  // Missing capability may use the complete legacy read; execution errors cannot.
  const nativeFingerprint = async (path: string, options: { signal?: AbortSignal; onProgress?: (bytes: number) => void; timeoutMs?: number }) => {
    if (typeof path !== "string" || !paths.isAbsolute(path) || path.includes("\0") ||
        options.onProgress !== undefined && typeof options.onProgress !== "function" ||
        options.timeoutMs !== undefined && (!Number.isFinite(options.timeoutMs) || options.timeoutMs < 1 || options.timeoutMs > 300000))
      throw new Error("The original file observation input is invalid.");
    if (disposed || options.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const capability = await runSource("return typeof selects.media?.startFFmpeg === 'function';");
    if (capability !== true && capability !== false) throw new Error("The local media capability could not be confirmed.");
    if (!capability) return fingerprintTemplateFile(files, path, () => {
      if (disposed || options.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    });
    const before = await files.stat(path);
    if (before === null) return null;
    if (!before || before.isDirectory !== false || !Number.isSafeInteger(before.size) || before.size < 0 || !Number.isFinite(before.mtimeMs) || !Number.isFinite(before.ino))
      throw new Error("The file's size or identity could not be confirmed.");
    const controller = new AbortController(), abort = () => controller.abort();
    options.signal?.addEventListener("abort", abort, {once:true});
    if (options.signal?.aborted) abort();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; abort(); }, options.timeoutMs ?? 120000);
    try {
      const result = await process("FFmpeg", ["-nostdin", "-v", "error", "-protocol_whitelist", "file", "-f", "data", "-i", "file:" + path,
        "-map", "0:0", "-c", "copy", "-f", "hash", "-hash", "sha256", "-"], true, controller.signal);
      if (controller.signal.aborted) throw new DOMException("Aborted", "AbortError");
      const match = /^SHA256=([a-fA-F0-9]{64})\r?\n?$/.exec(result.stdout);
      if (!match) throw new Error("The original file hash returned an incomplete result.");
      const after = await files.stat(path);
      if (controller.signal.aborted) throw new DOMException("Aborted", "AbortError");
      if (!after || after.isDirectory !== false || before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ino !== after.ino)
        throw new Error("The file changed while its contents were read.");
      options.onProgress?.(before.size);
      return {size:before.size,sha256:match[1].toLowerCase()};
    } catch (cause) {
      if (timedOut && cause?.name === "AbortError") throw new Error("Original file verification timed out.");
      throw cause;
    } finally {
      clearTimeout(timer);options.signal?.removeEventListener("abort", abort);
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
    dispose() { disposed = true; for (const requestCancel of activeJobs.values()) void requestCancel().catch(() => {}); },
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
    const reported = React.useRef(new WeakMap<object, Set<string>>());
    const key = JSON.stringify([props.context?.projectId ?? null,
      props.context?.template?.libraryId ?? props.context?.libraryId ?? null,
      props.context?.template?.runId ?? null]);
    React.useEffect(() => {
      let active = true, settled = false;
      let client: any;
      const fail = (timeout: boolean, cause?: unknown) => {
        if (!active || settled) return;
        settled = true; clearTimeout(timer);
        const error = timeout
          ? "Connecting to Selects took too long. Reopen the Project and try again."
          : "Could not connect to Selects. Reopen the Project and try again; update Selects if the problem continues.";
        // Diagnostics stay private; neither the DOM nor finishTemplate receives
        // raw SDK output, paths or an exception stack.
        setState({sdk: props.sdk, key, error, cause});
      };
      // This is a read-only bootstrap observation, not a mutation retry or cancel.
      const timer = setTimeout(() => fail(true), 30000);
      createPanelLocalClient(props.sdk).then(value => {
        client = {...props.sdk, ...value};
        if (!active || settled) { value.dispose(); return; }
        settled = true; clearTimeout(timer);
        panelLocalClients.set(props.sdk, client);
        setState({sdk: props.sdk, key});
      }).catch(error => fail(false, error));
      return () => {
        active = false; clearTimeout(timer);
        if (client) {
          if (panelLocalClients.get(props.sdk) === client) panelLocalClients.delete(props.sdk);
          client.dispose();
        }
      };
    }, [props.sdk, key]);
    React.useEffect(() => {
      if (!props.context?.template || state?.sdk !== props.sdk || state?.key !== key || !state?.error) return;
      if (typeof props.sdk?.finishTemplate !== "function") return;
      const seen = reported.current.get(props.sdk) ?? new Set<string>();
      if (seen.has(key)) return;
      seen.add(key); reported.current.set(props.sdk, seen);
      // A failed connection never mounts the child, so the wrapper must finish
      // a hidden app run itself. Visible standalone panels keep an alert only.
      try { Promise.resolve(props.sdk.finishTemplate({error: state.error})).catch(() => {}); }
      catch { /* Do not replay completion or expose a transport exception. */ }
    }, [props.sdk, key, state, !!props.context?.template]);
    if (state?.sdk !== props.sdk || state?.key !== key) return React.createElement("div", {role: "status"}, "Connecting to Selects…");
    if (state?.error) return React.createElement("div", {role: "alert"}, state.error);
    return React.createElement(Component, props);
  };
}

export {createPanelLocalClient, panelLocalClient, withPanelLocalClient};
