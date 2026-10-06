export type ShotKind = "stock-video" | "person";
export type Framing = "wide" | "medium" | "close";
export type Orientation = "portrait" | "landscape";

export interface ShotCondition {
  id: string;
  text: string;
  hard?: boolean;
}

export interface ShotRequest {
  schema: "shot-request/1";
  id: string;
  kind: ShotKind;
  query: string;
  alternateQueries: string[];
  framing?: Framing;
  mustShow?: string;
  person?: { name: string; context: string };
  conditions: ShotCondition[];
  minUsableSeconds: number;
  target: { width: number; height: number; allowCrop: true };
  prefer: { orientation: Orientation };
  avoidSources: string[];
  contextText?: string;
}

export interface StockVideoFile {
  url: string;
  width: number;
  height: number;
}

export interface StockVideo {
  width: number;
  height: number;
  duration: number;
  previewUrl: string;
  originalUrl: string;
  authorName: string;
  authorUrl: string;
  serviceName: string;
  files?: readonly StockVideoFile[];
}

export interface SourceIdentity {
  key: string;
  provider: string;
  nativeId: string | null;
  pageUrl: string | null;
  license: string;
  licenseUrl: string | null;
}

export interface SearchAttempt {
  query: string;
  orientation: Orientation;
  page: number;
  role: "framed" | "plain" | "alternate";
  round: number;
  status: "ok" | "empty" | "error" | "cached";
  outcome: "ok" | "empty" | "error";
  n: number;
  error?: string;
}

export type SkipCode = "duration_limit" | "too_short" | "low_resolution" | "no_rendition" | "avoided" | "taken" | "duplicate" | "probe_error" | "decode_error" | "size_limit";

export interface PoolCandidate {
  source: SourceIdentity;
  video: StockVideo;
  orientation: Orientation;
  foundBy: { query: string; orientation: Orientation; role: SearchAttempt["role"]; rank: number; round: number };
  skip?: { code: SkipCode; reason: string };
}

export interface Evidence {
  sourceKey: string;
  kind: "video" | "image";
  status: "ready" | "skipped" | "error";
  code?: string;
  reason?: string;
  durationSeconds: number | null;
  timestamps: number[];
  sheets: string[];
  sheetChars: number[];
  rendition?: StockVideoFile;
  fingerprint?: string | null;
  elapsedMs?: number;
}

export type ConditionStatus = "matched" | "mismatched" | "uncertain";
export type Verdict = "fit" | "unfit" | "unverified";
export type Preference = "excellent" | "usable" | "weak";

export interface ConditionJudgment {
  condition_id: string;
  status: ConditionStatus;
  reason: string;
  evidence_timestamps_sec: number[];
}

export interface Prediction {
  candidate_id: string;
  status: Verdict;
  preference: Preference | null;
  conditions: ConditionJudgment[];
  reason: string;
  proposed_interval: { start_sec: number; end_sec: number } | null;
  evidence_scope: "sampled_prediction";
  cx?: number | null;
}

export interface ExecutionStatus {
  status: "ok" | "error" | "skipped";
  code: string;
  reason: string;
}

export interface JudgeRecord {
  shotId: string;
  sourceKey: string;
  execution: ExecutionStatus;
  prediction: Prediction | null;
  call?: { batch: string; provider: string; model: string; cacheHit: boolean; latencyMs: number };
}

export type ShotStatus = "found" | "weak_only" | "unverified" | "no_match" | "error";

export interface ShotPick {
  kind: "video" | "photo";
  provider: string;
  sourceKey: string;
  fileUrl: string;
  pageUrl?: string;
  author: string;
  authorUrl?: string;
  license: string;
  licenseUrl?: string;
  attribution: string;
  durationSeconds: number | null;
  interval: [number, number] | null;
  judgedInterval?: [number, number] | null;
  cx: number;
  cxSource: "judge" | "estimate" | "default";
  fit: "fit" | "unjudged";
  notJudged?: string;
  preference: Preference | null;
  why: string;
  localPath: string;
  width?: number;
  height?: number;
}

export type RetryCode = "search_error" | "evidence_error" | "commons_error" | "judge_error" | "budget";

export interface ShotResult {
  schema: "shot-result/1";
  id: string;
  kind: ShotKind;
  requestSha: string;
  status: ShotStatus;
  pick?: ShotPick;
  candidates: number;
  judged: number;
  judge: { provider: string; model: string; callIds: string[] };
  attempts: { query: string; orientation: string; status: string; n: number }[];
  fallback?: string;
  retry?: { code: RetryCode; reason: string };
  warnings: string[];
}
