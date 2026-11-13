// @name Voice-Following Teleprompter
// @name:en Voice-Following Teleprompter
// @name:ko 음성 자동 프롬프터
// @icon mic
// Paste a script, start talking, and the prompter scrolls to follow your voice.
// A native helper streams microphone PCM to OpenAI gpt-live-transcribe only after Start.
// The local bridge reads the existing OPENAI_API_KEY without exposing it to this panel.
// Recognized text controls scrolling internally, but is never displayed after the status.
import React from "react";

const STRINGS: Record<string, Record<string, string>> = {
  ko: {
    script: "\uc2a4\ud06c\ub9bd\ud2b8",
    placeholder: "\uc5ec\uae30\uc5d0 \uc77d\uc744 \uc2a4\ud06c\ub9bd\ud2b8\ub97c \ubd99\uc5ec\ub123\uc73c\uc138\uc694.",
    display: "\ud654\uba74",
    fontSize: "\uae00\uc790 \ud06c\uae30",
    lineHeight: "\uc904 \uac04\uaca9",
    mirror: "\uc88c\uc6b0 \ubc18\uc804",
    follow: "\ub530\ub77c\uac00\uae30",
    lang: "\ub9d0\ud558\ub294 \uc5b8\uc5b4",
    modeAuto: "\uc74c\uc131 \uc778\uc2dd",
    modePace: "\uc77c\uc815 \uc18d\ub3c4",
    pace: "\uc2a4\ud06c\ub864 \uc18d\ub3c4",
    paceUnit: "\uc790/\ucd08",
    open: "\ud504\ub86c\ud504\ud130 \uc5f4\uae30",
    needScript: "\uba3c\uc800 \uc2a4\ud06c\ub9bd\ud2b8\ub97c \ub123\uc5b4 \uc8fc\uc138\uc694.",
    start: "\uc2dc\uc791",
    stop: "\uba48\ucda4",
    restart: "\ucc98\uc74c\uc73c\ub85c",
    edit: "\uc2a4\ud06c\ub9bd\ud2b8 \ud3b8\uc9d1",
    fullscreen: "\uc804\uccb4 \ud654\uba74",
    exitFullscreen: "\uc804\uccb4 \ud654\uba74 \ub05d\ub0b4\uae30",
    fsFailed: "\uc804\uccb4 \ud654\uba74\uc744 \uc5f4 \uc218 \uc5c6\uc5b4\uc694. \ud328\ub110\uc744 \ucc3d\uc73c\ub85c \ubd84\ub9ac\ud574 \ud06c\uac8c \ub744\uc6cc \uc8fc\uc138\uc694.",
    idle: "\ub300\uae30",
    starting: "\uc74c\uc131 \uc778\uc2dd \uc900\ube44 \uc911…",
    listening: "\ub4e3\ub294 \uc911",
    pacing: "\uc77c\uc815 \uc18d\ub3c4\ub85c \uc2a4\ud06c\ub864 \uc911",
    ready: "\uc74c\uc131 \uc778\uc2dd \uc900\ube44\ub428",
    privacy: "\uc2dc\uc791\ud558\uba74 \ub9c8\uc774\ud06c \uc74c\uc131\uc774 \uc678\ubd80 \uc74c\uc131 \uc778\uc2dd \uc11c\ube44\uc2a4\ub85c \uc804\uc1a1\ub429\ub2c8\ub2e4.",
    checking: "\uc74c\uc131 \uc778\uc2dd \ud655\uc778 \uc911…",
    noBinary: "\uc74c\uc131 \uc778\uc2dd \uc2e4\ud589 \ud30c\uc77c\uc744 \ucc3e\uc9c0 \ubabb\ud588\uc5b4\uc694.",
    noModel: "\ub85c\uceec \uc74c\uc131 \uc778\uc2dd API \ud0a4\ub97c \ucc3e\uc9c0 \ubabb\ud588\uc5b4\uc694.",
    noBridge: "\uc74c\uc131 \uc778\uc2dd \uc5f0\uacb0 \ud30c\uc77c\uc744 \ucc3e\uc9c0 \ubabb\ud588\uc5b4\uc694.",
    failed: "\uc74c\uc131 \uc778\uc2dd\uc774 \uba48\ucdc4\uc5b4\uc694.",
    hint: "\ub2e8\uc5b4\ub97c \ub204\ub974\uba74 \uadf8 \uc704\uce58\ub85c \uc774\ub3d9\ud574\uc694. ↑↓ \ud0a4\ub85c \ud55c \uc904\uc529 \uc62e\uae38 \uc218 \uc788\uc5b4\uc694.",
    done: "\uc2a4\ud06c\ub9bd\ud2b8 \ub05d",
  },
  en: {
    script: "Script",
    placeholder: "Paste the script you will read here.",
    display: "Display",
    fontSize: "Text size",
    lineHeight: "Line spacing",
    mirror: "Mirror",
    follow: "Follow by",
    lang: "Spoken language",
    modeAuto: "Speech",
    modePace: "Fixed pace",
    pace: "Scroll pace",
    paceUnit: "chars/s",
    open: "Open prompter",
    needScript: "Add a script first.",
    start: "Start",
    stop: "Pause",
    restart: "Back to top",
    edit: "Edit script",
    fullscreen: "Full screen",
    exitFullscreen: "Exit full screen",
    fsFailed: "Full screen is unavailable here. Pop the panel out into its own window instead.",
    idle: "Idle",
    starting: "Starting speech recognition…",
    listening: "Listening",
    pacing: "Scrolling at a fixed pace",
    ready: "Speech recognition ready",
    privacy: "Starting sends microphone audio to an external speech recognition service.",
    checking: "Checking speech recognition…",
    noBinary: "The speech recognition helper was not found.",
    noModel: "No local speech recognition API key was found.",
    noBridge: "The speech recognition bridge file was not found.",
    failed: "Speech recognition stopped.",
    hint: "Click a word to jump there. Use ↑↓ to move a line.",
    done: "End of script",
  },
};

const LANGS = [
  { value: "ko-KR", label: "\ud55c\uad6d\uc5b4" },
  { value: "en-US", label: "English" },
  { value: "ja-JP", label: "日本語" },
];

type Word = { text: string; line: number; charStart: number; charEnd: number };

// Letters and digits only, lowercased: what speech recognition and the script share.
function norm(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

function parseScript(text: string) {
  const words: Word[] = [];
  const lines: number[][] = [];
  let chars = "";
  const charToWord: number[] = [];
  text.split(/\r?\n/).forEach((lineText, li) => {
    const idx: number[] = [];
    for (const tok of lineText.split(/\s+/).filter(Boolean)) {
      const n = norm(tok);
      const w: Word = { text: tok, line: li, charStart: chars.length, charEnd: chars.length + n.length };
      for (let k = 0; k < n.length; k++) charToWord.push(words.length);
      chars += n;
      idx.push(words.length);
      words.push(w);
    }
    lines.push(idx);
  });
  // Trigram index of the normalized script.
  const tri = new Map<string, number[]>();
  for (let i = 0; i + 3 <= chars.length; i++) {
    const g = chars.slice(i, i + 3);
    const arr = tri.get(g);
    if (arr) arr.push(i);
    else tri.set(g, [i]);
  }
  return { words, lines, chars, charToWord, tri };
}

type Parsed = ReturnType<typeof parseScript>;

// Find where the tail of what was heard ends in the script, near the current position.
// Each trigram of the heard tail votes for the script position its match implies.
function locate(p: Parsed, heard: string, pos: number): number | null {
  const tail = norm(heard).slice(-18);
  if (tail.length < 4) return null;
  const lo = Math.max(0, pos - 30);
  const hi = Math.min(p.chars.length, pos + 450);
  const votes = new Map<number, number>();
  let grams = 0;
  for (let t = 0; t + 3 <= tail.length; t++) {
    grams++;
    const occ = p.tri.get(tail.slice(t, t + 3));
    if (!occ) continue;
    const seen = new Set<number>();
    for (const o of occ) {
      if (o < lo || o > hi) continue;
      const end = Math.round((o + (tail.length - t)) / 2) * 2; // 2-char buckets
      if (seen.has(end)) continue;
      seen.add(end);
      votes.set(end, (votes.get(end) || 0) + 1);
    }
  }
  let best = -1;
  let bestScore = 0;
  for (const [end, v] of votes) {
    const s = v + (votes.get(end - 2) || 0) * 0.5 + (votes.get(end + 2) || 0) * 0.5;
    const dist = Math.abs(end - pos);
    const score = s - dist / 400;
    if (score > bestScore) {
      bestScore = score;
      best = end;
    }
  }
  if (best < 0) return null;
  const raw = votes.get(best) || 0;
  if (raw < 2 || raw / Math.max(1, grams) < 0.3) return null;
  // Large jumps need stronger evidence than small steps.
  if (best - pos > 120 && raw / grams < 0.55) return null;
  return Math.min(p.chars.length, Math.max(0, best));
}

const BRIDGE_DIR = "/.selects/plugin-data/speech-prompter";

function shQuote(s: string) {
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

export default function Panel({ sdk, context, ui }: any) {
  const t = STRINGS[context?.language] ?? STRINGS.en;

  const [loaded, setLoaded] = React.useState(false);
  const [script, setScript] = React.useState("");
  const [fontSize, setFontSize] = React.useState(64);
  const [lineHeight, setLineHeight] = React.useState(1.4);
  const [mirror, setMirror] = React.useState(false);
  const [lang, setLang] = React.useState(context?.language === "ko" ? "ko-KR" : "en-US");
  const [mode, setMode] = React.useState<"auto" | "pace">("auto");
  const [pace, setPace] = React.useState(6);

  const [view, setView] = React.useState<"edit" | "prompt">("edit");
  // In-window presentation mode instead of the browser Fullscreen API. Selects aborted
  // twice when this prompter went full screen from a popped-out window (2026-11-01).
  const [presentBg, setPresentBg] = React.useState<string | null>(null);
  const [running, setRunning] = React.useState(false);
  const [phase, setPhase] = React.useState<"idle" | "starting" | "listening" | "pacing">("idle");
  const [msg, setMsg] = React.useState<{ tone?: "error"; text: string } | null>(null);
  const [curWord, setCurWord] = React.useState(0);
  const [bridge, setBridge] = React.useState<string | null>(null);
  const [engineState, setEngineState] = React.useState<"checking" | "ready" | "noBinary" | "noModel" | "noBridge">("checking");

  const parsed = React.useMemo(() => parseScript(script), [script]);
  const parsedRef = React.useRef(parsed);
  parsedRef.current = parsed;

  const posRef = React.useRef(0);
  const runningRef = React.useRef(false);
  const sessionRef = React.useRef(0);
  const paceRef = React.useRef(pace);
  paceRef.current = pace;
  const mirrorRef = React.useRef(mirror);
  mirrorRef.current = mirror;
  const bridgeRef = React.useRef<string | null>(null);
  bridgeRef.current = bridge;

  const stageRef = React.useRef<HTMLDivElement | null>(null);
  const scrollerRef = React.useRef<HTMLDivElement | null>(null);
  const wordEls = React.useRef<(HTMLSpanElement | null)[]>([]);
  const scrollY = React.useRef(0);

  const runBridge = React.useCallback(
    async (args: string, summary: string) => {
      const b = bridgeRef.current;
      if (!b) throw new Error(t.noBridge);
      const dir = b.slice(0, b.lastIndexOf("/"));
      const r = await sdk.runShell({ summary, command: `/usr/bin/python3 ${shQuote(b)} ${args}`, cwd: dir, timeoutMs: 20000 });
      if (r.isError || r.exitCode !== 0) throw new Error((r.stderr || r.output || "").slice(-300) || t.failed);
      const line = String(r.stdout ?? r.output ?? "").trim().split("\n").pop() || "{}";
      return JSON.parse(line);
    },
    [sdk, t],
  );

  // ---- Locate the recognition bridge and check it is ready ------------------------
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const env = await sdk.runScript({ summary: "Find home folder", script: "return (await selects.files.environment()).homedir;" });
        if (env.isError || typeof env.result !== "string") throw new Error("env");
        const path = env.result + BRIDGE_DIR + "/bridge.py";
        if (!alive) return;
        setBridge(path);
        bridgeRef.current = path;
        const c = await runBridge("check", "Check speech recognition");
        if (!alive) return;
        setEngineState(!c.binary ? "noBinary" : !c.model ? "noModel" : "ready");
      } catch {
        if (alive) setEngineState("noBridge");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ---- Settings persistence -------------------------------------------------
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!sdk?.storage) return;
        const raw = await sdk.storage.getItem("settings");
        if (!alive || raw === null) return;
        const s = JSON.parse(raw);
        if (typeof s.script === "string") setScript(s.script);
        if (typeof s.fontSize === "number") setFontSize(s.fontSize);
        if (typeof s.lineHeight === "number") setLineHeight(s.lineHeight);
        if (typeof s.mirror === "boolean") setMirror(s.mirror);
        if (typeof s.lang === "string") setLang(s.lang);
        if (s.mode === "auto" || s.mode === "pace") setMode(s.mode);
        if (typeof s.pace === "number") setPace(s.pace);
      } catch {
        /* start with defaults */
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  React.useEffect(() => {
    if (!loaded || !sdk?.storage) return;
    const id = setTimeout(() => {
      sdk.storage
        .setItem("settings", JSON.stringify({ script, fontSize, lineHeight, mirror, lang, mode, pace }))
        .catch(() => {});
    }, 400);
    return () => clearTimeout(id);
  }, [loaded, script, fontSize, lineHeight, mirror, lang, mode, pace]);

  // ---- Position ----------------------------------------------------------------
  const setPos = React.useCallback((p: number) => {
    const P = parsedRef.current;
    const clamped = Math.max(0, Math.min(P.chars.length, p));
    posRef.current = clamped;
    const w = P.charToWord[Math.min(Math.floor(clamped), P.chars.length - 1)] ?? 0;
    setCurWord(clamped >= P.chars.length && P.words.length ? P.words.length : w);
  }, []);

  const jumpToWord = (i: number) => {
    const w = parsed.words[i];
    if (w) setPos(w.charStart);
  };

  const moveLine = (dir: 1 | -1) => {
    const P = parsedRef.current;
    const w = P.words[Math.min(curWord, P.words.length - 1)];
    if (!w) return;
    let li = w.line + dir;
    while (li >= 0 && li < P.lines.length && P.lines[li].length === 0) li += dir;
    if (li < 0) return setPos(0);
    if (li >= P.lines.length) return setPos(P.chars.length);
    jumpToWord(P.lines[li][0]);
  };

  // ---- Smooth scrolling (and fixed-pace advance) -----------------------------------
  React.useEffect(() => {
    if (view !== "prompt") return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (runningRef.current && mode === "pace") setPos(posRef.current + paceRef.current * dt);
      const sc = scrollerRef.current;
      const stage = stageRef.current;
      if (sc && stage) {
        const P = parsedRef.current;
        const wi = Math.min(P.charToWord[Math.min(Math.floor(posRef.current), P.chars.length - 1)] ?? 0, P.words.length - 1);
        const el = wordEls.current[wi];
        if (el) {
          const rel = el.getBoundingClientRect().top - sc.getBoundingClientRect().top;
          const target = Math.max(0, rel - stage.clientHeight * 0.3);
          scrollY.current += (target - scrollY.current) * 0.12;
          if (Math.abs(target - scrollY.current) < 0.5) scrollY.current = target;
          sc.style.transform = `translateY(${-scrollY.current}px)` + (mirrorRef.current ? " scaleX(-1)" : "");
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [view, mode, setPos]);

  // ---- Start / stop -----------------------------------------------------------------
  const stop = React.useCallback(async () => {
    const wasSpeech = runningRef.current && mode === "auto";
    runningRef.current = false;
    sessionRef.current++;
    setRunning(false);
    setPhase("idle");
    if (wasSpeech) {
      try {
        await runBridge("stop", "Stop speech recognition");
      } catch {}
    }
  }, [mode, runBridge]);

  // Stop the recognizer when the panel closes.
  React.useEffect(
    () => () => {
      if (runningRef.current && bridgeRef.current) {
        const b = bridgeRef.current;
        sdk.runShell({ summary: "Stop speech recognition", command: `/usr/bin/python3 ${shQuote(b)} stop`, cwd: b.slice(0, b.lastIndexOf("/")), timeoutMs: 10000 }).catch(() => {});
      }
    },
    [],
  );

  const start = React.useCallback(async () => {
    setMsg(null);
    if (!parsedRef.current.words.length) return setMsg({ text: t.needScript });
    const session = ++sessionRef.current;
    runningRef.current = true;
    setRunning(true);
    if (mode === "pace") {
      setPhase("pacing");
      return;
    }
    if (engineState !== "ready") {
      runningRef.current = false;
      setRunning(false);
      setMsg({ tone: "error", text: t[engineState] || t.failed });
      return;
    }
    setPhase("starting");
    try {
      const r = await runBridge(`start ${lang.slice(0, 2)}`, "Start speech recognition");
      if (!r.ok) throw new Error(r.error || t.failed);
    } catch (e: any) {
      if (session === sessionRef.current) {
        runningRef.current = false;
        setRunning(false);
        setPhase("idle");
        setMsg({ tone: "error", text: `${t.failed} ${e?.message || ""}`.trim() });
      }
      return;
    }
    let lastHeard = "";
    let deadReads = 0;
    while (runningRef.current && session === sessionRef.current) {
      try {
        const r = await runBridge("read", "Read recognized speech");
        if (session !== sessionRef.current) break;
        if (!r.running) {
          if (++deadReads >= 3) {
            runningRef.current = false;
            setRunning(false);
            setPhase("idle");
            setMsg({ tone: "error", text: `${t.failed} ${r.error || ""}`.trim() });
            break;
          }
        } else {
          deadReads = 0;
          setPhase(r.phase === "listening" ? "listening" : "starting");
        }
        if (r.heard && r.heard !== lastHeard) {
          lastHeard = r.heard;
          const next = locate(parsedRef.current, r.heard, Math.floor(posRef.current));
          if (next !== null && next >= posRef.current - 12) setPos(next);
        }
      } catch {
        if (++deadReads >= 3) {
          runningRef.current = false;
          setRunning(false);
          setPhase("idle");
          setMsg({ tone: "error", text: t.failed });
          try { await runBridge("stop", "Stop speech recognition"); } catch {}
          break;
        }
      }
      await new Promise((res) => setTimeout(res, 250));
    }
  }, [mode, engineState, lang, t, runBridge, setPos]);

  const toggle = () => (runningRef.current ? stop() : start());

  // Arrow keys move a line; Space starts/pauses. Keep them from reaching the app's shortcuts.
  React.useEffect(() => {
    if (view !== "prompt") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        moveLine(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        moveLine(-1);
      } else if (e.key === " ") {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const openPrompter = () => {
    if (!parsed.words.length) return setMsg({ text: t.needScript });
    setMsg(null);
    setPresentBg(null);
    scrollY.current = 0;
    wordEls.current = [];
    setPos(0);
    setView("prompt");
  };

  // Fill the panel (docked column or window) with the script. No pop-out: in Selects 2.0.917
  // a panel opened in its own window stays blank (2026-11-01), so widen the column instead.
  const goFullscreen = () => {
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    const transparent = !bodyBg || bodyBg === "transparent" || bodyBg === "rgba(0, 0, 0, 0)";
    setPresentBg(transparent ? (context?.appearance?.mode === "light" ? "#ffffff" : "#000000") : bodyBg);
  };

  React.useEffect(() => {
    if (!presentBg) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPresentBg(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presentBg]);

  // ---- Edit view ----------------------------------------------------------------
  if (view === "edit") {
    return (
      <ui.Stack gap={16}>
        <ui.Section title={t.script}>
          <ui.TextField multiline value={script} onChange={setScript} placeholder={t.placeholder} disabled={!loaded} />
        </ui.Section>
        <ui.Section title={t.display}>
          <ui.Slider label={t.fontSize} unit="px" min={28} max={140} step={2} value={fontSize} onChange={setFontSize} />
          <ui.Slider label={t.lineHeight} min={1.1} max={2.2} step={0.1} value={lineHeight} onChange={setLineHeight} />
          <ui.Toggle label={t.mirror} value={mirror} onChange={setMirror} />
        </ui.Section>
        <ui.Section title={t.follow}>
          <ui.Segmented
            label={t.follow}
            value={mode}
            onChange={setMode}
            options={[
              { value: "auto", label: t.modeAuto },
              { value: "pace", label: t.modePace },
            ]}
          />
          {mode === "auto" ? (
            <>
              <ui.Select label={t.lang} value={lang} onChange={setLang} options={LANGS} />
              <small>{t[engineState]}</small>
            </>
          ) : (
            <ui.Slider label={t.pace} unit={t.paceUnit} min={2} max={14} step={0.5} value={pace} onChange={setPace} />
          )}
          <ui.Actions>
            <ui.Button variant="primary" disabled={!loaded} onClick={openPrompter}>
              {t.open}
            </ui.Button>
          </ui.Actions>
          {msg && <ui.Message tone={msg.tone}>{msg.text.replace(/OPENAI_API_KEY|gpt-live-transcribe|OpenAI/gi, context?.language === "ko" ? "\uc74c\uc131 \uc778\uc2dd" : "Speech recognition")}</ui.Message>}
        </ui.Section>
      </ui.Stack>
    );
  }

  // ---- Prompter view --------------------------------------------------------------
  const finished = curWord >= parsed.words.length;
  const status = phase === "starting" ? t.starting : phase === "listening" ? t.listening : phase === "pacing" ? t.pacing : t.idle;
  return (
    <ui.Stack gap={8}>
      <ui.Row gap={8} align="center">
        <ui.Button variant="primary" busy={phase === "starting"} busyLabel={t.starting} onClick={toggle}>
          {running ? t.stop : t.start}
        </ui.Button>
        <ui.Button variant="secondary" onClick={() => setPos(0)}>
          {t.restart}
        </ui.Button>
        <ui.Button
          variant="ghost"
          onClick={() => {
            stop();
            setView("edit");
          }}
        >
          {t.edit}
        </ui.Button>
        <ui.Button variant="ghost" onClick={goFullscreen}>
          {t.fullscreen}
        </ui.Button>
      </ui.Row>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            flex: "none",
            background: phase === "listening" ? "var(--panel-key)" : "var(--panel-muted-fg)",
          }}
        />
        <small style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {status}
        </small>
      </div>
      {mode === "auto" && <small>{t.privacy}</small>}
      {msg && <ui.Message tone={msg.tone}>{msg.text.replace(/OPENAI_API_KEY|gpt-live-transcribe|OpenAI/gi, context?.language === "ko" ? "\uc74c\uc131 \uc778\uc2dd" : "Speech recognition")}</ui.Message>}
      <div
        ref={stageRef}
        style={
          presentBg
            ? { position: "fixed", inset: 0, zIndex: 1000, background: presentBg, overflow: "hidden" }
            : { position: "relative", height: "calc(100vh - 130px)", minHeight: 260, overflow: "hidden" }
        }
      >
        {presentBg && (
          <div style={{ position: "absolute", top: 8, right: 8, zIndex: 2, display: "flex", gap: 8, opacity: 0.8, background: presentBg, borderRadius: 8, padding: 4 }}>
            <ui.Button variant="secondary" busy={phase === "starting"} busyLabel={t.starting} onClick={toggle}>
              {running ? t.stop : t.start}
            </ui.Button>
            <ui.Button variant="ghost" onClick={() => setPresentBg(null)}>
              {t.exitFullscreen}
            </ui.Button>
          </div>
        )}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "30%",
            borderTop: "2px solid var(--panel-key)",
            opacity: 0.35,
            pointerEvents: "none",
            zIndex: 1,
          }}
        />
        <div
          ref={scrollerRef}
          style={{
            padding: presentBg ? "56px 4% 0" : "0 4%",
            paddingBottom: "80vh",
            fontSize,
            lineHeight,
            fontWeight: 600,
            wordBreak: "keep-all",
            overflowWrap: "break-word",
            willChange: "transform",
          }}
        >
          {parsed.lines.map((idx, li) =>
            idx.length === 0 ? (
              <div key={li} style={{ height: fontSize * lineHeight * 0.6 }} />
            ) : (
              <div key={li}>
                {idx.map((wi) => {
                  const state = wi < curWord ? "read" : wi === curWord ? "now" : "next";
                  return (
                    <React.Fragment key={wi}>
                      <span
                        ref={(el) => {
                          wordEls.current[wi] = el;
                        }}
                        onClick={() => jumpToWord(wi)}
                        style={{
                          cursor: "pointer",
                          color: state === "now" ? "var(--panel-key)" : state === "read" ? "var(--panel-muted-fg)" : "var(--panel-fg)",
                          opacity: state === "read" ? 0.45 : 1,
                          transition: "color 120ms, opacity 200ms",
                        }}
                      >
                        {parsed.words[wi].text}
                      </span>{" "}
                    </React.Fragment>
                  );
                })}
              </div>
            ),
          )}
          {finished && <p style={{ fontSize: Math.max(16, fontSize * 0.4) }}>{t.done}</p>}
        </div>
      </div>
      <small>{t.hint}</small>
    </ui.Stack>
  );
}
