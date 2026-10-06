import { ModelError } from "../errors.ts";
import type { Availability, CallConfig, ExternalProvider, ImageMime, ModelImage } from "../types.ts";
import { IMAGE_MIMES } from "../types.ts";

export const UNAVAILABLE_FOR_MS = 10 * 60_000;
export const PROBE_TTL_MS = 10 * 60_000;

export const STRIKES_FOR_DOWN = 2;

export function strikeTracker(now: () => number, windowMs = UNAVAILABLE_FOR_MS, downAfter = STRIKES_FOR_DOWN) {
  let strikes = 0;
  let lastStrike = Number.NEGATIVE_INFINITY;
  let downUntil = 0;
  let reason = "";
  return {
    strike(r: string) {
      const t = now();
      strikes = t - lastStrike < windowMs ? strikes + 1 : 1;
      lastStrike = t;
      reason = r;
      if (strikes >= downAfter) downUntil = t + windowMs;
    },
    clear() {
      strikes = 0;
      lastStrike = Number.NEGATIVE_INFINITY;
      downUntil = 0;
    },
    check(lastResort: boolean): string | null {
      const t = now();
      if (t < downUntil) return reason;
      if (!lastResort && strikes > 0 && t - lastStrike < windowMs) return reason;
      return null;
    },
    state(): "down" | "suspect" | "ok" {
      const t = now();
      if (t < downUntil) return "down";
      return strikes > 0 && t - lastStrike < windowMs ? "suspect" : "ok";
    },
  };
}

export function stickyUnavailable(now: () => number, forMs = UNAVAILABLE_FOR_MS) {
  let until = 0;
  let reason = "";
  return {
    mark(r: string) {
      until = now() + forMs;
      reason = r;
    },
    check(): string | null {
      return now() < until ? reason : null;
    },
  };
}

export interface HttpAvailabilityDeps {
  provider: ExternalProvider;
  now: () => number;
  getKey: () => string | undefined;
  probe: (cfg: CallConfig, key: string) => Promise<void>;
}

export function httpAvailability(deps: HttpAvailabilityDeps) {
  const sticky = stickyUnavailable(deps.now);
  let probed: { at: number; key: string; result: Promise<Availability> } | null = null;
  return {
    markUnavailable: (reason: string) => sticky.mark(reason),
    async available(cfg: CallConfig): Promise<Availability> {
      const held = sticky.check();
      if (held) return { ok: false, reason: held };
      const key = deps.getKey();
      if (!key) return { ok: false, reason: "no " + deps.provider + " key in config/keys.local.json" };
      if (!cfg.model) return { ok: false, reason: "no " + deps.provider + " model in models.json" };
      if (!cfg.probe) return { ok: true };
      if (!probed || probed.key !== key || deps.now() - probed.at > PROBE_TTL_MS) {
        const result = deps.probe(cfg, key).then(
          (): Availability => ({ ok: true }),
          (e: unknown): Availability => {
            const err = e instanceof ModelError ? e : null;
            if (err && (err.kind === "auth" || err.kind === "network" || err.kind === "unavailable")) {
              sticky.mark(err.message);
              return { ok: false, reason: err.message };
            }
            return { ok: true };
          },
        );
        probed = { at: deps.now(), key, result };
      }
      return probed.result;
    },
  };
}

export function checkImages(images: ModelImage[], cfg: CallConfig, limits: { maxImageChars?: number; maxTotalChars?: number } = {}): void {
  if (images.length > cfg.maxImages) {
    throw new ModelError("bad_request", cfg.provider + " takes at most " + cfg.maxImages + " images per call for " + cfg.role + "; " + images.length + " were given (draw a contact sheet)", { provider: cfg.provider });
  }
  let total = 0;
  images.forEach((img, i) => {
    if (!IMAGE_MIMES.includes(img.mime as ImageMime)) {
      throw new ModelError("bad_request", "image " + (i + 1) + " has an unsupported type " + JSON.stringify(img.mime), { provider: cfg.provider });
    }
    if (typeof img.base64 !== "string" || !img.base64 || img.base64.startsWith("data:")) {
      throw new ModelError("bad_request", "image " + (i + 1) + " must be bare base64 (no data: prefix)", { provider: cfg.provider });
    }
    if (limits.maxImageChars && img.base64.length > limits.maxImageChars) {
      throw new ModelError("too_large", "image " + (i + 1) + " is " + img.base64.length + " base64 characters; the limit is " + limits.maxImageChars, { provider: cfg.provider });
    }
    total += img.base64.length;
  });
  if (limits.maxTotalChars && total > limits.maxTotalChars) {
    throw new ModelError("too_large", "the images total " + total + " base64 characters; the limit is " + limits.maxTotalChars, { provider: cfg.provider });
  }
}

export const JSON_ONLY_SYSTEM = "Reply with ONLY one JSON object, no Markdown fences and no text around it.";

export function systemWithJsonRule(system?: string): string {
  return system ? system + "\n\n" + JSON_ONLY_SYSTEM : JSON_ONLY_SYSTEM;
}
