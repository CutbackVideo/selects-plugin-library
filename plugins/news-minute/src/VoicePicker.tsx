// The narration voice field: the chosen voice's name, opening to a searchable list (the server adds
// ElevenLabs library voices to selects.narration.voices) with gender · age and a preview for each voice.
import React, { useEffect, useRef, useState } from "react";
import type { PanelSdk } from "./pipeline/host.ts";
import { run } from "./pipeline/host.ts";
import { voicesScript } from "./pipeline/scripts.ts";
import { appendVoices, normalizeVoicePage, voiceTags, type Voice } from "./pipeline/voices.ts";

type Props = {
  sdk: PanelSdk;
  T: (k: string, v?: Record<string, string | number>) => string;
  voiceId: string;
  voiceName?: string;
  disabled?: boolean;
  onPick: (voice: Voice) => void;
};

const SEARCH_DELAY_MS = 300;
const muted = { color: "var(--panel-muted-fg, #888)", fontSize: 12 } as const;
// The host stretches every <button> to the panel's width; these keep the picker's own layout.
const bare = { maxWidth: "none", height: "auto", margin: 0, border: "none", background: "none", color: "inherit", font: "inherit", textAlign: "left" } as const;
const field = { ...bare, display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 8px", border: "1px solid var(--panel-border, #3334)", borderRadius: 6 } as const;
const row = { display: "flex", alignItems: "center", gap: 4, borderRadius: 4 } as const;
// Panels are narrow: a name takes up to two lines, with gender · age on the line below.
const pick = { ...bare, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1, flex: 1, minWidth: 0, padding: "5px 6px" } as const;
const twoLines = { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "keep-all", overflowWrap: "anywhere" } as const;
const play = { ...bare, flex: "none", width: 28, padding: 0, textAlign: "center", cursor: "pointer" } as const;
const oneLine = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } as const;
const SECONDARY = { "data-variant": "secondary" } as const;

export function VoicePicker({ sdk, T, voiceId, voiceName, disabled, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [voices, setVoices] = useState<Voice[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "failed">("idle");
  const [known, setKnown] = useState<Voice[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const request = useRef(0);
  const firstPageOf = useRef<string | null>(null);
  const wanted = useRef<string | null>(null);
  const box = useRef<HTMLDivElement | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const blobs = useRef(new Map<string, string>());

  // One page; a newer search makes an older reply moot.
  const load = async (q: string, after: string | null) => {
    const id = ++request.current;
    setState("loading");
    try {
      const page = normalizeVoicePage(await run(sdk, voicesScript(q, after)));
      if (id !== request.current) return;
      if (!after) firstPageOf.current = q;
      setVoices((shown) => (after ? appendVoices(shown, page.items) : page.items));
      setKnown((all) => appendVoices(all, page.items));
      setCursor(page.nextCursor);
      setState("idle");
    } catch {
      if (id === request.current) setState("failed");
    }
  };

  // The first page names the current voice even while the list is closed.
  useEffect(() => { void load("", null); }, [sdk]);
  useEffect(() => {
    if (!open) return;
    // Back to the list already shown (e.g. a search cleared): drop any reply still on its way.
    if (firstPageOf.current === query && state !== "failed") { request.current++; setState("idle"); return; }
    const timer = setTimeout(() => void load(query, null), query ? SEARCH_DELAY_MS : 0);
    return () => clearTimeout(timer);
  }, [open, query]);

  useEffect(() => {
    if (!open) return;
    const outside = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);

  const stop = () => { wanted.current = null; audio.current?.pause(); setPlaying(null); };
  useEffect(() => { if (!open) stop(); }, [open]);
  useEffect(() => () => {
    audio.current?.pause();
    for (const url of blobs.current.values()) URL.revokeObjectURL(url);
  }, []);

  // The panel may play only blob: media, so the preview file is fetched first.
  const preview = async (voice: Voice) => {
    if (playing === voice.voiceId) { stop(); return; }
    stop();
    setPreviewError(false);
    if (!voice.previewUrl) return;
    setPlaying(voice.voiceId);
    wanted.current = voice.voiceId;
    try {
      let url = blobs.current.get(voice.voiceId);
      if (!url) {
        const res = await fetch(voice.previewUrl);
        if (!res.ok) throw new Error(String(res.status));
        url = URL.createObjectURL(await res.blob());
        blobs.current.set(voice.voiceId, url);
      }
      if (wanted.current !== voice.voiceId) return;
      const el = audio.current ?? (audio.current = new Audio());
      el.onended = () => setPlaying((p) => (p === voice.voiceId ? null : p));
      el.src = url;
      await el.play();
    } catch {
      setPlaying((p) => (p === voice.voiceId ? null : p));
      setPreviewError(true);
    }
  };

  const tags = (voice: Voice) => {
    const { gender, age, note } = voiceTags(voice.description);
    const label = [gender && T("gender_" + gender), age && T("age_" + age)].filter(Boolean).join(" \u00b7 ");
    return { label, note };
  };
  const current = known.find((v) => v.voiceId === voiceId);
  const name = current?.name ?? voiceName ?? voiceId;
  const currentTags = current ? tags(current).label : "";

  return (
    <div ref={box} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <button {...SECONDARY} style={field} disabled={disabled} aria-expanded={open} title={name} onClick={() => setOpen((o) => !o)}>
        <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <span style={oneLine}>{name}</span>
          {currentTags ? <span style={muted}>{currentTags}</span> : null}
        </span>
        <span style={{ ...muted, flex: "none" }}>{open ? "\u25b4" : "\u25be"}</span>
      </button>
      {open && !disabled ? (
        <div style={{ border: "1px solid var(--panel-border, #3334)", borderRadius: 6, padding: 6, display: "flex", flexDirection: "column", gap: 4 }}>
          <input autoFocus style={{ width: "100%", boxSizing: "border-box", padding: 6, font: "inherit" }} placeholder={T("voiceSearch")} value={query} onChange={(e) => setQuery(e.target.value)} />
          <div role="listbox" style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
            {voices.map((v) => {
              const { label, note } = tags(v);
              const on = v.voiceId === voiceId;
              return (
                <div key={v.voiceId} style={{ ...row, background: on ? "var(--panel-border, #3334)" : "none" }}>
                  <button {...SECONDARY} role="option" aria-selected={on} style={pick} title={note ? v.name + "\n" + note : v.name} onClick={() => { onPick(v); setOpen(false); }}>
                    <span style={twoLines}>{v.name}</span>
                    {label ? <span style={muted}>{label}</span> : null}
                  </button>
                  {v.previewUrl ? (
                    <button {...SECONDARY} style={play} aria-label={playing === v.voiceId ? T("voiceStop") : T("voicePreview", { name: v.name })} onClick={() => void preview(v)}>
                      {playing === v.voiceId ? "\u25a0" : "\u25b6"}
                    </button>
                  ) : <span style={{ width: 28, flex: "none" }} />}
                </div>
              );
            })}
            {state === "idle" && !voices.length ? <span style={muted}>{T("voiceNone")}</span> : null}
            {state === "loading" ? <span style={muted}>{T("voiceLoading")}</span> : null}
            {state === "failed" ? (
              <span style={muted}>{T("voiceLoadFailed")}{" "}
                <button {...SECONDARY} style={{ ...bare, width: "auto", padding: 0, textDecoration: "underline", cursor: "pointer" }} onClick={() => void load(query, voices.length ? cursor : null)}>{T("voiceRetry")}</button>
              </span>
            ) : null}
            {state === "idle" && cursor ? <button {...SECONDARY} onClick={() => void load(query, cursor)}>{T("voiceMore")}</button> : null}
          </div>
          {previewError ? <span style={muted}>{T("voicePreviewFailed")}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
