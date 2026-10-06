import React, { useEffect, useState } from "react";
import type { PanelSdk } from "../host/types.ts";
import type { Job } from "../jobs/store.ts";
import type { Kit } from "./kit.ts";
import { makeHost } from "../host/di.ts";
import { readBytes } from "../host/fs.ts";
import { lit, readScript } from "../host/runScript.ts";
import { errorMessage } from "../host/util.ts";
import { loadCard, statusIcon } from "../stages/diagnostics/card.ts";
import { cardDisplay, cardIsCurrent, cardView, type CardView } from "./cardView.ts";
import { t } from "./messages.ts";

const muted = { color: "var(--panel-muted-fg)" };
const small = { fontSize: 11, ...muted };

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
    document.body.appendChild(area);
    area.select();
    try {
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      area.remove();
    }
  }
}

async function sheetUrls(sdk: PanelSdk, dir: string, rels: string[]): Promise<string[]> {
  const fs = makeHost(sdk).fs;
  const out: string[] = [];
  for (const rel of rels) {
    const bytes = await readBytes(fs, fs.join(dir, ...rel.split("/")));
    out.push(URL.createObjectURL(new Blob([bytes as BlobPart], { type: "image/jpeg" })));
  }
  return out;
}

export function DiagnosticsCard({ kit, sdk, job, dir }: { kit: Kit; sdk: PanelSdk; job: Job | null; dir: string | null }) {
  const [view, setView] = useState<CardView | null>(null);
  const [creditsText, setCreditsText] = useState("");
  const [note, setNote] = useState("");
  const [shown, setShown] = useState<string | null>(null);
  const [frames, setFrames] = useState<string[] | null>(null);
  const finished = job?.stages.diagnostics?.finishedAt ?? null;
  const current = cardIsCurrent(job);
  useEffect(() => {
    let alive = true;
    setNote("");
    setShown(null);
    setFrames(null);
    if (!dir) {
      setView(null);
      return;
    }
    void loadCard(makeHost(sdk).fs, dir)
      .then((m) => {
        if (!alive) return;
        setView(cardView(m));
        setCreditsText(m?.creditsText ?? "");
      })
      .catch(() => alive && setView(null));
    return () => {
      alive = false;
    };
  }, [dir, finished, current, job?.stages.diagnostics?.status]);
  useEffect(() => () => frames?.forEach((u) => URL.revokeObjectURL(u)), [frames]);
  if (!view || !job) return null;

  const openDraft = async () => {
    try {
      await readScript(sdk, "Open the EO short", "return await selects.editor.openDraft(" + lit(job.draftId) + ");", { allowUndefined: true, backoffMs: [] });
    } catch (e) {
      setNote(t("card.openFailed", { error: errorMessage(e) }));
    }
  };
  const copy = async (text: string, done: "card.creditsCopied" | "card.pathCopied") => {
    const ok = await copyText(text);
    setNote(ok ? t(done) : t("card.copyFailed"));
    if (!ok) setShown(text);
  };
  const toggleFrames = async () => {
    if (frames) {
      setFrames(null);
      return;
    }
    try {
      setFrames(await sheetUrls(sdk, dir!, view.sheets));
    } catch (e) {
      setNote(t("card.framesFailed", { error: errorMessage(e) }));
    }
  };

  const display = cardDisplay(view, job);
  const mp4 = display.mp4;
  const verdict = (
    <kit.Stack gap={8}>
      <kit.Row gap={8} align="start">
        <kit.Icon name={view.tone === "success" ? "check" : view.tone === "error" ? "error" : "info"} size={14} />
        <span style={{ flex: 1 }}>
          <kit.Message tone={view.tone}>{view.headline}</kit.Message>
        </span>
      </kit.Row>
      {view.groups.map((g) => (
        <kit.Stack key={g.title} gap={4}>
          <span style={{ ...small, textTransform: "uppercase", letterSpacing: 0.4 }}>{g.title}</span>
          {g.rows.map((r) => (
            <div key={r.id}>
              <kit.Row gap={8} align="start">
                <kit.Icon name={statusIcon(r.status)} size={14} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  {r.name}
                  <span style={muted}> {"—"} {r.text}</span>
                </span>
              </kit.Row>
              {r.detail ? (
                <div style={{ paddingLeft: 22 }}>
                  <kit.Message tone={r.status === "fail" && r.acceptance ? "error" : "muted"}>{r.detail}</kit.Message>
                </div>
              ) : null}
            </div>
          ))}
        </kit.Stack>
      ))}
    </kit.Stack>
  );

  return (
    <kit.Section title={t("section.checks")}>
      <kit.Stack gap={8}>
        {display.note ? <kit.Message tone="muted">{display.note}</kit.Message> : null}
        {display.current ? verdict : <div style={{ opacity: 0.55 }}>{verdict}</div>}
        {mp4 ? <span style={{ ...small, wordBreak: "break-all", userSelect: "text" }}>{mp4}</span> : null}
        <kit.Actions>
          {job.draftId ? (
            <kit.Button variant="secondary" onClick={() => void openDraft()}>
              {t("card.openDraft")}
            </kit.Button>
          ) : null}
          {mp4 ? (
            <kit.Button variant="ghost" onClick={() => void copy(mp4, "card.pathCopied")}>
              {t("card.copyPath")}
            </kit.Button>
          ) : null}
          {display.copyCredits ? (
            <kit.Button variant="ghost" onClick={() => void copy(creditsText, "card.creditsCopied")}>
              {t("card.copyCredits")}
            </kit.Button>
          ) : null}
          {display.frames ? (
            <kit.Button variant="ghost" onClick={() => void toggleFrames()}>
              {frames ? t("card.hideFrames") : t("card.showFrames")}
            </kit.Button>
          ) : null}
        </kit.Actions>
        {note ? <kit.Message tone="muted">{note}</kit.Message> : null}
        {shown ? <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", userSelect: "text", ...small }}>{shown}</pre> : null}
        {frames && display.frames ? frames.map((u, i) => <img key={u} src={u} alt={t("card.frameSheet", { n: i + 1 })} style={{ width: "100%", borderRadius: 4 }} />) : null}
      </kit.Stack>
    </kit.Section>
  );
}
