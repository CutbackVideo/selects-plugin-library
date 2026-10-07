import type { StageContext, StageImpl } from "./runner.ts";
import type { Capabilities } from "../host/gates.ts";
import { readJsonIfExists } from "../host/fs.ts";
import { createMediaStage, type MediaStageOptions } from "../stages/media.ts";
import { generateJobImages, type JobImagesOptions } from "../images/jobImages.ts";

export type MediaGates = {
  stockSearch: boolean;
  pictures: boolean;
  why: string[];
};

export async function mediaGates(ctx: Pick<StageContext, "host" | "job" | "path">): Promise<MediaGates> {
  const pre = await readJsonIfExists<{ capabilities?: Partial<Capabilities> } | null>(ctx.host.fs, ctx.path("source/preflight.json"), null).catch(() => null);
  const caps = pre?.capabilities ?? null;
  const why: string[] = [];
  let stockSearch = true;
  let pictures = true;
  if (caps?.stockSearch === false) (stockSearch = false), why.push("this Selects has no stock search");
  if (caps?.mediaGeneration?.pluginFiles === false || caps?.mediaGeneration?.present === false) (pictures = false), why.push("this Selects cannot generate pictures for plug-ins");
  return { stockSearch, pictures, why };
}

export function createGatedMediaStage(base: MediaStageOptions = {}): StageImpl {
  const plain = createMediaStage(base);
  return {
    id: "media",
    alwaysRerun: plain.alwaysRerun,
    inputSha: plain.inputSha,
    async run(ctx) {
      const g = await mediaGates(ctx);
      if (g.why.length) ctx.warn("Media: " + g.why.join("; ") + ".");
      const images = base.images ?? generateJobImages;
      const stage = createMediaStage({
        ...base,
        ...(g.stockSearch ? {} : { search: () => null }),
        ...(g.pictures ? {} : { images: (o: JobImagesOptions) => images({ ...o, mg: null, host: { ...o.host, generation: null } }) }),
      });
      return stage.run(ctx);
    },
  };
}
