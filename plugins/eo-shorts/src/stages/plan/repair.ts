import type { BundleScene } from "./bundle.ts";

export const REPAIR_HEADING = "## Lint repair (this request replaces the output instruction above)";

export type RepairItem = { scene: BundleScene; text: string; errors: string[] };

export function repairPrompt(request: string, film: string, direction: string, items: RepairItem[]): string {
  const ids = items.map((i) => i.scene.id);
  const parts = [
    request.replace(/\s+$/, ""),
    "",
    REPAIR_HEADING,
    "",
    "Your answer to the request above was read, split into one eo-plan/0 plan per scene and checked by the unchanged original lint. " +
      (items.length === 1 ? "One scene failed" : items.length + " scenes failed") +
      ": " + ids.join(", ") + ". Rewrite only " + (items.length === 1 ? "this scene" : "these scenes") +
      " so that each plan passes lint, keeping its id, startWord and endWord and its role in the film. Keep everything that lint does not name; change what the errors name, following the original schema and guide.",
    "",
    "The whole-film direction you wrote: " + direction,
    "",
  ];
  for (const it of items) {
    parts.push(
      "### " + it.scene.id + " (words " + it.scene.startWord + "-" + (it.scene.endWord - 1) + ": " + JSON.stringify(it.text) + ")",
      "",
      "Your scene:",
      "",
      JSON.stringify({ id: it.scene.id, startWord: it.scene.startWord, endWord: it.scene.endWord, type: it.scene.type, plan: it.scene.plan }),
      "",
      "Lint errors:",
      ...it.errors.map((e) => "- " + e),
      "",
    );
  }
  parts.push(
    "Return one JSON object, with no Markdown fences or other commentary, holding exactly " + (items.length === 1 ? "this scene" : "these scenes") + ":",
    "",
    JSON.stringify({ schema: "eo-film-plan/1", film, scenes: items.map((i) => ({ id: i.scene.id, startWord: i.scene.startWord, endWord: i.scene.endWord, type: "...", plan: {} })) }),
    "",
    "Each `plan` is the complete corrected eo-plan/0 design of that scene (it omits schema, sceneId, film, durationFrames and words, as before).",
    "",
  );
  return parts.join("\n");
}
