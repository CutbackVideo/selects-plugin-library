import { withPanelLocalClient } from "../../../shared/local-client.ts";
import React, { useEffect, useState } from "react";
import type { PanelSdk } from "./host/types.ts";
import type { Kit } from "./ui/kit.ts";
import { fallbackKit } from "./ui/fallbackKit.tsx";
import { leaseHeldText, leasePollNeeded, panelActions, stageRows, statusIcon, summaryLine, visibleError, type StageRow } from "./ui/stageView.ts";
import * as run from "./ui/controller.ts";
import { t } from "./ui/messages.ts";
import { DiagnosticsCard } from "./ui/DiagnosticsCard.tsx";

type Props = { sdk: PanelSdk; context: { projectId: string | null; sequenceId: string | null; language?: string }; ui?: Kit };

const depsOf = (sdk: PanelSdk): run.Deps => ({ sdk });

const muted = { color: "var(--panel-muted-fg)" };
const small = { fontSize: 11, ...muted };

function StepRow(p: { kit: Kit; r: StageRow; open: boolean; onToggle(): void; showFallbacks: boolean; onToggleFallbacks(): void }) {
  const { kit, r, open, onToggle, showFallbacks, onToggleFallbacks } = p;
  const f = r.failure;
  const detailVisible = !!f && !!f.detail && (f.showDetail || open) && !f.text.startsWith(f.detail);
  return (
    <div style={{ opacity: r.status === "pending" ? 0.55 : 1 }}>
      <kit.Row gap={8} align="start">
        <kit.Icon name={statusIcon(r.status)} size={14} />
        <span style={{ flex: 1, minWidth: 0 }}>
          {r.label}
          {r.note ? <span style={muted}> {"—"} {r.note}</span> : null}
        </span>
        {r.seconds != null ? <span style={muted}>{r.seconds} s</span> : null}
      </kit.Row>
      {f ? (
        <div style={{ paddingLeft: 22 }}>
          <kit.Stack gap={4}>
            <kit.Message tone={r.status === "failed" ? "error" : "muted"}>{f.text}</kit.Message>
            {detailVisible ? <span style={{ ...small, wordBreak: "break-word", userSelect: "text" }}>{f.detail}</span> : null}
            {f.detail && !f.showDetail && !f.text.startsWith(f.detail) ? (
              <span>
                <kit.Button variant="ghost" onClick={onToggle}>
                  {open ? t("action.hideDetails") : t("action.details")}
                </kit.Button>
              </span>
            ) : null}
          </kit.Stack>
        </div>
      ) : null}
      {r.fallbacks.length ? (
        <div style={{ paddingLeft: 22 }}>
          <kit.Stack gap={4}>
            <span>
              <kit.Button variant="ghost" onClick={onToggleFallbacks}>
                {showFallbacks ? t("row.hideFallbacks") : t("row.fallbacks", { count: r.fallbacks.length })}
              </kit.Button>
            </span>
            {showFallbacks ? r.fallbacks.map((f, i) => <span key={i} style={{ ...small, wordBreak: "break-word" }}>{f}</span>) : null}
          </kit.Stack>
        </div>
      ) : null}
    </div>
  );
}

function EoShortsPanel({ sdk, context, ui }: Props) {
  const kit: Kit = ui && typeof ui.Button === "function" ? ui : fallbackKit;
  const [, force] = useState(0);
  const [clock, setClock] = useState(0);
  const [confirmRebuild, setConfirmRebuild] = useState(false);
  const [openRows, setOpenRows] = useState<Record<string, boolean>>({});
  const [showNotes, setShowNotes] = useState(false);
  useEffect(() => run.subscribe(() => force((n) => n + 1)), []);
  const s = run.getState();
  const deps = depsOf(sdk);
  useEffect(() => {
    void run.loadLatest(deps, context.projectId);
  }, [context.projectId]);
  useEffect(() => {
    if (!s.busy) return;
    const id = setInterval(() => setClock((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [s.busy]);
  void clock;
  const pollLease = leasePollNeeded(s, context.projectId);
  useEffect(() => {
    if (!pollLease) return;
    const refresh = () => void run.refreshShown(deps);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const id = setInterval(refresh, run.LEASE_POLL_MS);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pollLease, s.dir]);

  const a = panelActions(s, context);
  const elapsed = s.busy ? Math.round((Date.now() - s.startedAt) / 1000) : 0;
  const rows = a.showJob ? stageRows(s.job, Date.now(), a.interrupted) : [];
  const rowErrors = new Set(rows.map((r) => r.error).filter(Boolean));
  const error = visibleError(s, context.sequenceId);
  const busyLabel = (key: "action.making" | "action.resuming" | "action.rebuilding") => t(key, { seconds: elapsed });

  return (
    <div style={{ padding: 12 }}>
      <kit.Stack gap={16}>
        <kit.Section title={t("panel.title")}>
          <kit.Stack gap={8}>
            <kit.Message tone="muted">{t("panel.intro")}</kit.Message>
            <kit.Segmented
              label={t("panel.style")}
              value={s.film}
              disabled={s.busy}
              onChange={(v: "A" | "B") => run.setFilm(v)}
              options={[
                { value: "A", label: t("panel.filmA") },
                { value: "B", label: t("panel.filmB") },
              ]}
            />
            <kit.Actions>
              {a.cancel ? (
                <kit.Button variant="secondary" busy={a.canceling} busyLabel={t("action.canceling")} onClick={() => run.cancel()}>
                  {t("action.cancel")}
                </kit.Button>
              ) : null}
              {a.resume || (s.busy && s.action === "resume") ? (
                <kit.Button variant="secondary" busy={s.busy && s.action === "resume"} busyLabel={busyLabel("action.resuming")} disabled={!a.resume} onClick={() => void run.resume(deps)}>
                  {t("action.resume")}
                </kit.Button>
              ) : null}
              {a.rebuild || (s.busy && s.action === "rebuild") ? (
                <kit.Button variant="ghost" busy={s.busy && s.action === "rebuild"} busyLabel={busyLabel("action.rebuilding")} disabled={!a.rebuild} onClick={() => setConfirmRebuild(true)}>
                  {t("action.rebuild")}
                </kit.Button>
              ) : null}
              <kit.Button variant="primary" busy={s.busy && s.action === "create"} busyLabel={busyLabel("action.making")} disabled={!a.make} onClick={() => void run.create(deps, context)}>
                {t("action.make")}
              </kit.Button>
            </kit.Actions>
            {confirmRebuild && a.rebuild ? (
              <kit.Stack gap={8}>
                <kit.Message tone="muted">{t("rebuild.explain")}</kit.Message>
                <kit.Actions>
                  <kit.Button
                    variant="primary"
                    onClick={() => {
                      setConfirmRebuild(false);
                      void run.rebuild(deps);
                    }}
                  >
                    {t("action.rebuildConfirm")}
                  </kit.Button>
                  <kit.Button variant="ghost" onClick={() => setConfirmRebuild(false)}>
                    {t("action.rebuildKeep")}
                  </kit.Button>
                </kit.Actions>
              </kit.Stack>
            ) : null}
            <kit.Message tone="muted">{t("panel.credits")}</kit.Message>
            {!context.sequenceId ? <kit.Message tone="muted">{t("panel.openDraft")}</kit.Message> : null}
            {a.unfinishedHere && a.resume ? <kit.Message tone="muted">{t("panel.unfinished")}</kit.Message> : null}
          </kit.Stack>
        </kit.Section>

        {a.showJob ? (
          <kit.Section title={t("section.steps")}>
            <kit.Stack gap={8}>
              <kit.Message tone="muted">{summaryLine(s.job, a.interrupted)}</kit.Message>
              {!s.busy && s.lease === "live" ? <kit.Message tone="muted">{leaseHeldText(s.leaseFreeAt)}</kit.Message> : null}
              {rows.map((r) => (
                <StepRow
                  key={r.id}
                  kit={kit}
                  r={r}
                  open={!!openRows[r.id]}
                  onToggle={() => setOpenRows({ ...openRows, [r.id]: !openRows[r.id] })}
                  showFallbacks={!!openRows[r.id + ":fallbacks"]}
                  onToggleFallbacks={() => setOpenRows({ ...openRows, [r.id + ":fallbacks"]: !openRows[r.id + ":fallbacks"] })}
                />
              ))}
              {s.job!.warnings.length ? (
                <kit.Stack gap={4}>
                  <span>
                    <kit.Button variant="ghost" onClick={() => setShowNotes(!showNotes)}>
                      {t("steps.notes")} ({s.job!.warnings.length})
                    </kit.Button>
                  </span>
                  {showNotes ? s.job!.warnings.map((w, i) => <span key={i} style={{ ...small, wordBreak: "break-word" }}>{w}</span>) : null}
                </kit.Stack>
              ) : null}
            </kit.Stack>
          </kit.Section>
        ) : null}

        {a.showJob ? <DiagnosticsCard kit={kit} sdk={sdk} job={s.job} dir={s.dir} /> : null}

        {s.message ? <kit.Message tone={s.outcome?.status === "done" ? "success" : "muted"}>{s.message}</kit.Message> : null}
        {error && !rowErrors.has(error) ? <kit.Message tone="error">{error}</kit.Message> : null}
      </kit.Stack>
    </div>
  );
}

export default withPanelLocalClient(EoShortsPanel);
