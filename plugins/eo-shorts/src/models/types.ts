export type Provider = "app" | "openai" | "anthropic" | "gemini";
export const PROVIDERS: readonly Provider[] = ["app", "openai", "anthropic", "gemini"];
export type ExternalProvider = Exclude<Provider, "app">;

export type Effort = "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
export const EFFORTS: readonly Effort[] = ["minimal", "low", "medium", "high", "xhigh", "max"];

export interface RoleConfig {
  kind?: "text";
  provider: Provider;
  model?: string;
  effort?: Effort;
  timeoutMs: number;
  timeoutRetries?: number;
  reask?: number;
  maxImagesPerCall?: number;
  background?: boolean;
  stream?: boolean;
  structured?: boolean;
  maxOutputTokens?: number;
  fallback?: Provider[];
}

export interface MediaRoleConfig {
  kind: "media";
  provider: "app";
  model: string;
  label?: string;
  input?: Record<string, unknown>;
}

export interface ProviderSettings {
  model?: string;
  baseUrl?: string;
  effort?: Effort;
  maxOutputTokens?: number;
  probe?: boolean;
}

export interface AppProviderSettings {
  label?: string;
}

export interface ModelsConfig {
  schema: "eo-models/1";
  roles: Record<string, RoleConfig | MediaRoleConfig>;
  providers: {
    app?: AppProviderSettings;
    openai?: ProviderSettings;
    anthropic?: ProviderSettings;
    gemini?: ProviderSettings;
  };
}

export interface CallConfig {
  role: string;
  provider: Provider;
  model?: string;
  effort?: Effort;
  timeoutMs: number;
  timeoutRetries: number;
  reask: number;
  maxImages: number;
  background: boolean;
  stream: boolean;
  structured: boolean;
  maxOutputTokens?: number;
  baseUrl?: string;
  probe: boolean;
  label?: string;
}

export type ImageMime = "image/jpeg" | "image/png" | "image/webp" | "image/gif";
export const IMAGE_MIMES: readonly ImageMime[] = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export interface ModelImage {
  mime: ImageMime;
  base64: string;
  name?: string;
}

export type JsonSchema = Record<string, unknown>;

export interface RequestIdInfo {
  jobId: string;
  role: string;
  provider: Provider;
  requestId: string;
}

export interface ModelCall {
  role: string;
  jobId: string;
  system?: string;
  prompt: string;
  images?: ModelImage[];
  json?: true;
  schema?: JsonSchema;
  schemaName?: string;
  schemaInPrompt?: boolean;
  validate?: (value: unknown) => string[] | null | undefined;
  cache?: boolean;
  cacheScope?: string;
  signal?: AbortSignal;
  resumeRequestId?: string;
  onRequestId?: (info: RequestIdInfo) => void | Promise<void>;
}

export interface Usage {
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
}

export interface ModelResult {
  role: string;
  text: string;
  json: unknown;
  provider: Provider;
  model: string;
  effort?: string;
  requestId?: string;
  usage?: Usage;
  latencyMs: number;
  attempt: number;
  cacheHit: boolean;
  reasked: boolean;
  fallbackFrom: Provider[];
  servedModel?: string;
}

export interface AdapterRequest {
  system?: string;
  prompt: string;
  images: ModelImage[];
  schema?: JsonSchema;
  schemaName?: string;
  signal?: AbortSignal;
  onRequestId?: (requestId: string) => void | Promise<void>;
}

export interface AdapterResult {
  text: string;
  model: string;
  effort?: string;
  requestId?: string;
  usage?: Usage;
  servedModel?: string;
  stopReason?: string;
}

export type Availability = { ok: true } | { ok: false; reason: string };

export interface AvailabilityContext {
  lastResort?: boolean;
}

export interface ModelAdapter {
  provider: Provider;
  caps: { maxImages: number; selectableModel: boolean; background: boolean };
  available(cfg: CallConfig, ctx?: AvailabilityContext): Promise<Availability>;
  call(req: AdapterRequest, cfg: CallConfig): Promise<AdapterResult>;
  poll?(requestId: string, cfg: CallConfig, req: AdapterRequest): Promise<AdapterResult>;
  markUnavailable(reason: string): void;
  modelLabel(cfg: CallConfig): string;
}
