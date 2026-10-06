import type { CreditEntry } from "../../broll/credits.ts";
import { licenseGate } from "../../broll/commons.ts";
import type { SoundCredit } from "../sound/soundReport.ts";

export type JobCredit = {
  kind: "stock-video" | "photo" | "music" | "sfx";
  text: string;
  license: string;
  url: string | null;
  shotIds?: string[];
  provider?: string;
};

export type MediaShot = { id: string; sceneId?: string; source?: string; sourceKey?: string | null; status?: string };
export type MediaScene = { sceneId: string; stock?: Record<string, unknown>; stills?: Record<string, unknown> };

export function jobCredits(media: CreditEntry[], sound: SoundCredit[]): JobCredit[] {
  const out: JobCredit[] = [];
  for (const e of media) out.push({ kind: e.kind, text: e.text, license: e.license, url: e.pageUrl ?? e.fileUrl ?? null, shotIds: [e.shotId], provider: e.provider });
  for (const c of sound) out.push({ kind: c.kind, text: c.text, license: c.license, url: c.url });
  return out;
}

export function creditsText(credits: JobCredit[]): string {
  return credits.map((c) => c.text + (c.url ? " — " + c.url : "")).join("\n");
}

export function usedShots(scenes: MediaScene[]): { id: string; kind: "stock-video" | "photo" }[] {
  const out: { id: string; kind: "stock-video" | "photo" }[] = [];
  const k = (key: string) => /^shot-(\d+)$/.exec(key)?.[1];
  for (const s of scenes) {
    for (const key of Object.keys(s.stock ?? {})) if (k(key) != null) out.push({ id: s.sceneId + "-" + k(key), kind: "stock-video" });
    for (const key of Object.keys(s.stills ?? {})) if (k(key) != null) out.push({ id: s.sceneId + "-" + k(key), kind: "photo" });
  }
  return out;
}

export function photoLicenseAllowed(label: string | null | undefined): boolean {
  const s = String(label ?? "").trim();
  if (!s) return false;
  const code = s.toLowerCase().replace(/\s+/g, "-");
  return licenseGate({ License: { value: code } }).ok || licenseGate({ LicenseShortName: { value: s } }).ok;
}

export type CreditsCheck = { ok: boolean; problems: string[]; assets: number; credited: number; lines: number };

export function checkCredits(i: {
  scenes: MediaScene[];
  shots: MediaShot[];
  media: CreditEntry[];
  sound: SoundCredit[];
  music: boolean;
  sfx: number;
}): CreditsCheck {
  const problems: string[] = [];
  const keyOf = new Map(i.shots.map((s) => [s.id, s.sourceKey ?? null]));
  const byShot = new Map(i.media.map((e) => [e.shotId, e]));
  const byKey = new Map<string, CreditEntry>();
  for (const e of i.media) {
    const k = keyOf.get(e.shotId);
    if (k) byKey.set(k, e);
  }
  const used = usedShots(i.scenes);
  let credited = 0;
  for (const u of used) {
    const k = keyOf.get(u.id) ?? null;
    const e = byShot.get(u.id) ?? (k ? byKey.get(k) : undefined);
    if (!e) {
      problems.push("no credit for " + (u.kind === "photo" ? "the photo of " : "the stock clip of ") + u.id + (k ? " (" + k + ")" : ""));
      continue;
    }
    const why: string[] = [];
    if (!e.license?.trim()) why.push("no licence");
    if (!e.text?.trim()) why.push("no attribution text");
    if (u.kind === "photo") {
      if (!photoLicenseAllowed(e.license)) why.push("licence " + JSON.stringify(e.license) + " is not CC0, public domain or CC BY");
      if (!/wikimedia commons/i.test(e.text ?? "")) why.push("the line does not name Wikimedia Commons");
    }
    if (why.length) problems.push(u.id + ": " + why.join(", "));
    else credited += 1;
  }
  let assets = used.length;
  const soundLine = (kind: "music" | "sfx") => i.sound.find((c) => c.kind === kind && c.text?.trim() && c.license?.trim());
  if (i.music) {
    assets += 1;
    if (soundLine("music")) credited += 1;
    else problems.push("no credit line with a licence for the music");
  }
  if (i.sfx > 0) {
    assets += 1;
    if (soundLine("sfx")) credited += 1;
    else problems.push("no credit line with a licence for the sound effects");
  }
  return { ok: problems.length === 0, problems, assets, credited, lines: i.media.length + i.sound.length };
}
