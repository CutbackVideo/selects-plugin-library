import type { Host, HostFs, HostRuntime, PanelSdk } from "./types.ts";

export const FS_METHODS = [
  "join",
  "dirname",
  "basename",
  "homedir",
  "existsSync",
  "mkdirSync",
  "readdirSync",
  "statSync",
  "renameSync",
  "unlinkSync",
  "rmSync",
  "readFile",
  "writeFile",
] as const;
export const RUNTIME_METHODS = ["runFFmpeg", "runFFprobe"] as const;

export class HostMissingError extends Error {
  member: string;
  constructor(member: string, message?: string) {
    super(message ?? "This Selects version does not provide " + member + ". Update Selects.");
    this.name = "HostMissingError";
    this.member = member;
  }
}

export function hostDI(): Record<string, any> | null {
  try {
    const w = (globalThis as { window?: { parent?: Record<string, any> } }).window;
    return (w?.parent && w.parent["__DI__"]) || null;
  } catch {
    return null;
  }
}

export function hostApi<T = any>(name: string, methods: readonly string[], di: Record<string, any> | null = hostDI()): T | null {
  const s = di?.[name];
  return s && methods.every((m) => typeof s[m] === "function") ? (s as T) : null;
}

export function missingMethods(name: string, methods: readonly string[], di: Record<string, any> | null = hostDI()): string[] {
  const s = di?.[name];
  if (!s) return methods.map((m) => name + "." + m);
  return methods.filter((m) => typeof s[m] !== "function").map((m) => name + "." + m);
}

export function hostPlatform(di: Record<string, any> | null = hostDI()): string {
  try {
    return String(di?.Runtime?.getPlatform?.() || "");
  } catch {
    return "";
  }
}

export function hostVersion(di: Record<string, any> | null = hostDI()): string {
  try {
    return String(di?.Runtime?.getHostingVersion?.() || "");
  } catch {
    return "";
  }
}

export function makeHost(sdk: PanelSdk, di: Record<string, any> | null = hostDI()): Host {
  const missing = missingMethods("FileSystem", FS_METHODS, di);
  if (missing.length) throw new HostMissingError(missing.join(", "));
  const fs = di!.FileSystem as HostFs;
  const runtime = hostApi<HostRuntime>("Runtime", RUNTIME_METHODS, di);
  return { sdk, fs, runtime, di, now: () => Date.now() };
}
