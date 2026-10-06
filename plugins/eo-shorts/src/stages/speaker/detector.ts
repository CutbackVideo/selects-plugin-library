import type { HostFs } from "../../host/types.ts";
import { ensureDir, readBytes } from "../../host/fs.ts";
import { loadFaceDetector, type FaceDetector, type RuntimeFiles } from "../../speaker/yunet/runtime.ts";

export function hostRuntimeFiles(fs: HostFs): RuntimeFiles {
  return {
    join: (...p) => fs.join(...p),
    dirname: (p) => fs.dirname(p),
    exists: (p) => fs.existsSync(p),
    readBytes: (p) => readBytes(fs, p),
    downloadFile: (url, dest) => {
      if (typeof fs.downloadFile !== "function") throw new Error("This Selects build cannot download files (FileSystem.downloadFile).");
      return fs.downloadFile(url, dest);
    },
    mkdirp: (p) => void ensureDir(fs, p),
    rename: (a, b) => fs.renameSync(a, b),
    remove: (p) => fs.unlinkSync(p),
  };
}

const loaded = new Map<string, Promise<FaceDetector>>();

export function sharedFaceDetector(fs: HostFs, runtimeDir: string, progress?: (s: string) => void): Promise<FaceDetector> {
  let p = loaded.get(runtimeDir);
  if (!p) {
    p = loadFaceDetector({ files: hostRuntimeFiles(fs), runtimeDir, progress });
    loaded.set(runtimeDir, p);
    p.catch(() => loaded.delete(runtimeDir));
  }
  return p;
}
