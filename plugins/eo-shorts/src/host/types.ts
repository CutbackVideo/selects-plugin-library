export type RunScriptAnswer = { output: string; isError: boolean; result?: unknown };

export type PanelSdk = {
  runScript(input: { script: string; summary: string; allowCommit?: boolean }): Promise<RunScriptAnswer>;
  askAI?(input: { prompt: string; timeoutMs?: number; images?: unknown[]; ephemeral?: boolean }): Promise<{ text: string }>;
  call?<T = unknown>(method: string, ...args: unknown[]): Promise<T>;
  on?(name: string, listener: (event: unknown) => void): () => void;
};

export type HostFs = {
  join(...parts: string[]): string;
  dirname(path: string): string;
  basename(path: string, ext?: string): string;
  homedir(): string;
  existsSync(path: string): boolean;
  mkdirSync(path: string, options?: { recursive?: boolean }): void;
  readdirSync(path: string): string[];
  statSync(path: string): { size?: number; mtimeMs?: number; [k: string]: unknown } | null;
  renameSync(from: string, to: string): void;
  unlinkSync(path: string): void;
  rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void;
  readFile(path: string, options?: unknown): Promise<unknown>;
  writeFile(path: string, data: string | Uint8Array, options?: { flag?: string; encoding?: string }): Promise<void>;
  exists?(path: string): Promise<boolean>;
  copyFile?(from: string, to: string): Promise<void>;
  downloadFile?(url: string, path: string): Promise<void>;
  pathToLocalURL?(path: string): string;
};

export type FfResult = { stdout: string; stderr: string };

export type HostRuntime = {
  runFFmpeg(
    args: string[],
    withoutLog?: boolean,
    signal?: AbortSignal,
    onStdout?: (chunk: string) => void,
    onStderr?: (chunk: string) => void,
  ): Promise<FfResult>;
  runFFprobe(args: string[], withoutLog?: boolean, signal?: AbortSignal): Promise<FfResult>;
  getHostingVersion?(): string;
  getPlatform?(): string;
};

export type Host = {
  sdk: PanelSdk;
  fs: HostFs;
  runtime: HostRuntime | null;
  di?: Record<string, any> | null;
  now(): number;
};
