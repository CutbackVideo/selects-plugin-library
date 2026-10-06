// Speaker face tracking with YuNet in the plugin's own Python environment (macOS: system python3).
import { dataRoot, envRoot, fs, J, q, shell, type Sdk } from "./host";
import FACE_TRACK from "./face_track.py";

const MODEL_URL =
  "https://media.githubusercontent.com/media/opencv/opencv_zoo/f12e12798e8314f7c074a6656816c048dcc95b7a/models/face_detection_yunet/face_detection_yunet_2023mar.onnx";
const MODEL_SHA = "8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4";

export type Face = { cx: number; eyes: number; h: number; w: number; top: number };
export type FaceShot = { start: number; end: number; face: Face | null };
export type SourceFaces = { W: number; H: number; shots: FaceShot[] };

export async function ensureFaceRuntime(sdk: Sdk, progress: (s: string) => void): Promise<{ python: string; model: string }> {
  const env = envRoot();
  const model = fs().join(dataRoot(), "models", "face_detection_yunet_2023mar.onnx");
  const py = fs().join(env, "bin", "python");
  const ok = await shell(sdk, "Check speaker framing", "[ -x " + q(py) + " ] && " + q(py) + " -c 'import cv2; cv2.FaceDetectorYN' 2>/dev/null && echo ENV; [ -f " + q(model) + " ] && echo MODEL; true", 30000);
  if (!/ENV/.test(ok)) {
    progress("Setting up speaker framing (one time, about a minute)…");
    await shell(
      sdk,
      "Install speaker framing",
      "set -e; /usr/bin/python3 -m venv " + q(env) + " && " + q(fs().join(env, "bin", "pip")) + " install -q --disable-pip-version-check --only-binary=:all: numpy 'opencv-python-headless>=4.8'",
      300000
    );
  }
  if (!/MODEL/.test(ok)) {
    const dir = fs().join(dataRoot(), "models");
    await shell(
      sdk,
      "Download the face model",
      "set -e; mkdir -p " + q(dir) + " && curl -sfL --max-time 120 -o " + q(model + ".part") + " " + q(MODEL_URL) +
        ' && [ "$(shasum -a 256 ' + q(model + ".part") + " | cut -d' ' -f1)\" = " + MODEL_SHA + " ] && mv " + q(model + ".part") + " " + q(model),
      150000
    );
  }
  return { python: py, model };
}

export type FaceJob = { id: string; path: string; start: number; end: number };

// Faces per job id (one job per source clip range, in source seconds).
export async function trackFaces(sdk: Sdk, rt: { python: string; model: string }, dir: string, jobs: FaceJob[]): Promise<Record<string, SourceFaces>> {
  const out: Record<string, SourceFaces> = {};
  if (!jobs.length) return out;
  (await fs().mkdir(dir, { recursive: true }));
  const jobsPath = fs().join(dir, "face-jobs.json");
  const outPath = fs().join(dir, "faces.json");
  await fs().writeFile(jobsPath, J(jobs));
  await shell(sdk, "Find the speaker in each shot", q(rt.python) + " -c " + q(FACE_TRACK) + " --model " + q(rt.model) + " --jobs " + q(jobsPath) + " --out " + q(outPath), 300000);
  const res = JSON.parse(String(await fs().readFile(outPath, "utf8")));
  for (const j of res.jobs || []) if (!j.error) out[String(j.id)] = { W: j.width, H: j.height, shots: j.shots };
  return out;
}
