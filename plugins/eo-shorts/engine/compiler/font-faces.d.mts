export type FontFile = {path: string; weight: string};

export type ExecutionFont = {
  family: string;
  path?: string;
  files: FontFile[];
  style: string;
  weight: number;
  variable: boolean;
  system: boolean;
  figures?: string;
  opticalSize?: number;
};

export type FeatureDescriptors = {featureSettings?: string; variationSettings?: string};

export function roleFiles(f: Record<string, unknown>): FontFile[];
export function executionFont(f: Record<string, unknown>, figuresDefault?: string): ExecutionFont;
export function featureDescriptors(font: ExecutionFont): FeatureDescriptors;
export function fontFormat(file: string): 'truetype' | 'opentype' | 'woff2';
export function fontMime(format: string): string;
export function fontFaceCss(font: ExecutionFont, file: FontFile, src: string, options?: {format?: string; display?: string}): string;
export function fontFaceDescriptors(font: ExecutionFont, file: FontFile): {style: string; weight: string} & FeatureDescriptors;
export function fileForWeight(font: ExecutionFont, weight: number | string): FontFile;
export function fontLoads(fonts: Record<string, ExecutionFont>): string[];
