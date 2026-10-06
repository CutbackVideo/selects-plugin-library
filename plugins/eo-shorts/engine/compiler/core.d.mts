import type {ExecutionFont} from './font-faces.mjs';

export type {ExecutionFont};

export type MeasureRequest = {
  text: string;
  font: string;
  family: string;
  style: string;
  weight: number | string;
  size: number;
  spacing: number;
  wordSpacing: number;
  kerning: 'normal' | 'auto' | 'none';
};

export type TextMetrics = {width: number; left: number; right: number; ascent: number; descent: number; xHeight: number};

export type DecodedImage = {w: number; h: number; rgba: ArrayLike<number>};

export type RasterCut = {pieces: {file: string; [k: string]: unknown}[]; [k: string]: unknown};

export interface CompileHost {
  loadFonts(fonts: Record<string, ExecutionFont>): Promise<void> | void;
  measureText(request: MeasureRequest): Promise<TextMetrics> | TextMetrics;
  decodeImage(png: Uint8Array): Promise<DecodedImage> | DecodedImage;
  warn?(text: string): void;
  join?(...parts: string[]): string;
  cutPieces?(assetIds: string[]): Promise<Record<string, RasterCut>>;
}

export type PlanAsset = {id: string; pieces?: unknown[]; [k: string]: unknown};

export type ScenePlan = {
  schema: string;
  sceneId: string;
  film: string;
  durationFrames: number;
  assets?: PlanAsset[];
  [k: string]: unknown;
};

export type FilmStyle = {
  id: string;
  fps: number;
  fpsRational?: string;
  fonts: Record<string, {family: string; style: string; [k: string]: unknown}>;
  type: {figures?: string; [k: string]: unknown};
  [k: string]: unknown;
};

export type Picture = {bytes: Uint8Array; semanticParts?: unknown};

export type CompileInput = {
  plan: ScenePlan;
  style: FilmStyle;
  pictures?: Record<string, Picture>;
  sceneDir?: string;
  footageRoot?: string;
  kerning?: 'normal' | 'auto';
};

export type Execution = {
  sceneId: string;
  durationFrames: number;
  fps: number;
  fpsRational?: string;
  canvas: {width: number; height: number};
  fonts: Record<string, ExecutionFont>;
  layers: {id: string; kind: string; [k: string]: unknown}[];
  assetFiles: Record<string, string>;
  compiler: {schema: string; style: string};
  [k: string]: unknown;
};

export type CompileReport = {sceneId: string; warningScope: string; warnings: string[]; reveals: unknown[]};

export function compile(input: CompileInput, host: CompileHost): Promise<{execution: Execution; report: CompileReport}>;
export function executionText(execution: Execution): string;
export function reportText(report: CompileReport): string;
export function pictureShape(image: DecodedImage): {
  w: number;
  h: number;
  rows: [number, number][];
  levels: {p5: number; p95: number; qs: number[]};
};
export function joinPath(...parts: string[]): string;
