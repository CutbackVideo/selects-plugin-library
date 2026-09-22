// @name Tetris
// @icon sparkles
// Tetris, single player or head-to-head with a friend in another copy of Selects.
// A menu holds your past records and starts a game at the difficulty you pick;
// nothing runs until you press Start. Multiplayer goes over a public MQTT relay:
// both panels join a shared room code, mirror each other's board, and every line
// you clear sends garbage rows across. A small helper process (started only when
// you press Connect) holds the relay connection; the panel talks to it through
// files in a temp folder. It reads and writes nothing in your project.

import React from "react";

const COLS = 10;
const ROWS = 20;
const CELL = 24; // internal canvas units; the canvas scales to the panel width
const MINI = 9; // internal units for the opponent's board

const COLORS: Record<string, string> = {
  I: "#4cc9f0",
  J: "#4361ee",
  L: "#f8961e",
  O: "#f9c74f",
  S: "#43aa8b",
  T: "#b5179e",
  Z: "#ef476f",
  G: "#8d99ae", // garbage sent by the opponent
};

// Game Boy shell and LCD palette for the title screen. The menu is drawn as
// pixels on a canvas at a handheld's own resolution and scaled up, so it keeps
// the dot-matrix look instead of borrowing the app's chrome.
const GB = {
  shell: "#d8d4cc",
  shellEdge: "#b3aea4",
  shellShade: "#c5c0b7",
  bezel: "#55565a",
  bezelEdge: "#3c3d41",
  bezelText: "#9a9aa2",
  lcd0: "#9bbc0f", // lightest
  lcd1: "#8bac0f",
  lcd2: "#306230",
  lcd3: "#0f380f", // darkest
  button: "#8e2751",
  buttonEdge: "#671b3a",
  pill: "#84838c",
  word: "#3a3a6b",
  led: "#c0392b",
};

// Canvas is 200x250 internal units, scaled up with pixel snapping.
const GBW = 200;
const GBH = 250;
const LCD = { x: 30, y: 34, w: 140, h: 126 };
const MODE_BOX = { x: LCD.x + 13, y: LCD.y + 42, w: 114, h: 54 };
const MODE_ROW_H = 12;
const HIT = {
  dpadUp: { x: 36, y: 188, w: 16, h: 16 },
  dpadDown: { x: 36, y: 220, w: 16, h: 16 },
  aButton: { cx: 162, cy: 196, r: 12 },
  start: { x: 116, y: 226, w: 44, h: 11 },
};

const SHAPES: Record<string, number[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
};

const TYPES = Object.keys(SHAPES);
const LINE_SCORE = [0, 100, 300, 500, 800];
const ATTACK = [0, 0, 1, 2, 4]; // garbage rows sent per simultaneous clear

type DifficultyId = "chill" | "normal" | "fast" | "insane";

type Difficulty = {
  id: DifficultyId;
  label: string;
  startLevel: number;
  speed: number; // multiplier on the fall interval — lower is faster
  linesPerLevel: number;
};

const DIFFICULTIES: Record<DifficultyId, Difficulty> = {
  chill: { id: "chill", label: "Chill", startLevel: 1, speed: 1.4, linesPerLevel: 12 },
  normal: { id: "normal", label: "Normal", startLevel: 1, speed: 1, linesPerLevel: 10 },
  fast: { id: "fast", label: "Fast", startLevel: 5, speed: 0.8, linesPerLevel: 8 },
  insane: { id: "insane", label: "Insane", startLevel: 9, speed: 0.62, linesPerLevel: 6 },
};
const DIFFICULTY_IDS: DifficultyId[] = ["chill", "normal", "fast", "insane"];

const HIGH_KEY = "selects-tetris-high-score"; // kept from the first version
const RECORDS_KEY = "selects-tetris-records";
const ROOM_KEY = "selects-tetris-room";
const PREFS_KEY = "selects-tetris-prefs";
const MAX_RECORDS = 30;
const TICK_MS = 350;
const BROKERS: Record<string, { host: string; port: number }> = {
  emqx: { host: "broker.emqx.io", port: 1883 },
  hivemq: { host: "broker.hivemq.com", port: 1883 },
  mosquitto: { host: "test.mosquitto.org", port: 1883 },
};

type Piece = { type: string; m: number[][]; x: number; y: number };

type Game = {
  board: (string | null)[][];
  bag: string[];
  cur: Piece | null;
  next: string | null;
  score: number;
  lines: number;
  level: number;
  over: boolean;
  paused: boolean;
  dropAcc: number;
  match: string;
  sent: number; // cumulative garbage rows sent this match
  difficulty: DifficultyId;
  startedAt: number;
};

type GameRecord = {
  at: number;
  difficulty: DifficultyId;
  score: number;
  lines: number;
  level: number;
  versus: boolean;
  outcome: "topped out" | "won" | "lost";
};

type Opponent = {
  id: string;
  name: string;
  match: string;
  score: number;
  lines: number;
  level: number;
  board: string;
  over: boolean;
  sent: number;
  seen: number;
};

type Net = {
  connected: boolean;
  busy: boolean;
  room: string;
  dir: string;
  topic: string;
  playerId: string;
  name: string;
  offset: number;
  outQueue: string[];
  lastDaemon: number;
  opp: Opponent | null;
  applied: number; // garbage rows from the opponent already dropped in
  pending: number; // waiting to drop in at the next lock
};

// ---------------------------------------------------------------- game rules

function emptyBoard(): (string | null)[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function rotateCW(m: number[][]): number[][] {
  const n = m.length;
  const r = m.map((row) => row.slice());
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) r[j][n - 1 - i] = m[i][j];
  return r;
}

function refillBag(g: Game) {
  const bag = TYPES.slice();
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = bag[i];
    bag[i] = bag[j];
    bag[j] = t;
  }
  g.bag = g.bag.concat(bag);
}

function takeType(g: Game): string {
  if (g.bag.length === 0) refillBag(g);
  return g.bag.shift() as string;
}

function collides(board: (string | null)[][], m: number[][], px: number, py: number): boolean {
  for (let r = 0; r < m.length; r++) {
    for (let c = 0; c < m[r].length; c++) {
      if (!m[r][c]) continue;
      const x = px + c;
      const y = py + r;
      if (x < 0 || x >= COLS || y >= ROWS) return true;
      if (y >= 0 && board[y][x]) return true;
    }
  }
  return false;
}

function spawn(g: Game) {
  const type = g.next ?? takeType(g);
  g.next = takeType(g);
  const m = SHAPES[type];
  const piece: Piece = {
    type,
    m,
    x: Math.floor((COLS - m.length) / 2),
    y: type === "I" ? -1 : 0,
  };
  g.cur = piece;
  if (collides(g.board, piece.m, piece.x, piece.y)) g.over = true;
}

function newMatchId(): string {
  return Math.random().toString(36).slice(2, 8);
}

function createGame(difficulty: DifficultyId): Game {
  const d = DIFFICULTIES[difficulty] || DIFFICULTIES.normal;
  const g: Game = {
    board: emptyBoard(),
    bag: [],
    cur: null,
    next: null,
    score: 0,
    lines: 0,
    level: d.startLevel,
    over: false,
    paused: false,
    dropAcc: 0,
    match: newMatchId(),
    sent: 0,
    difficulty: d.id,
    startedAt: Date.now(),
  };
  spawn(g);
  return g;
}

function addGarbage(g: Game, rows: number) {
  for (let i = 0; i < rows; i++) {
    const top = g.board.shift();
    if (top && top.some((cell) => cell)) g.over = true;
    const hole = Math.floor(Math.random() * COLS);
    const row: (string | null)[] = Array(COLS).fill("G");
    row[hole] = null;
    g.board.push(row);
  }
}

function levelFor(g: Game): number {
  const d = DIFFICULTIES[g.difficulty] || DIFFICULTIES.normal;
  return d.startLevel + Math.floor(g.lines / d.linesPerLevel);
}

function dropInterval(g: Game): number {
  const d = DIFFICULTIES[g.difficulty] || DIFFICULTIES.normal;
  return Math.max(60, (800 - (g.level - 1) * 70) * d.speed);
}

function encodeBoard(g: Game): string {
  const cells: string[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) cells.push(g.board[r][c] ?? ".");
  }
  const p = g.cur;
  if (p && !g.over) {
    for (let r = 0; r < p.m.length; r++) {
      for (let c = 0; c < p.m[r].length; c++) {
        if (!p.m[r][c]) continue;
        const y = p.y + r;
        const x = p.x + c;
        if (y >= 0 && y < ROWS && x >= 0 && x < COLS) cells[y * COLS + x] = p.type;
      }
    }
  }
  return cells.join("");
}

// --------------------------------------------------------------- pixel screen

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radii: [number, number, number, number],
) {
  const [tl, tr, br, bl] = radii;
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  ctx.lineTo(x + bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
}

function pixelText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
  align: CanvasTextAlign = "left",
  spacing = 0,
) {
  ctx.save();
  ctx.font = "bold " + size + "px ui-monospace, Menlo, Consolas, monospace";
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  try {
    (ctx as any).letterSpacing = spacing + "px";
  } catch {
    /* older engines simply draw without the extra tracking */
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

// ------------------------------------------------------------------- records

function loadRecords(): GameRecord[] {
  try {
    const raw = window.localStorage.getItem(RECORDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as GameRecord[]).slice(0, MAX_RECORDS) : [];
  } catch {
    return [];
  }
}

function saveRecords(records: GameRecord[]) {
  try {
    window.localStorage.setItem(RECORDS_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
  } catch {
    /* storage unavailable — records just will not persist */
  }
}

function bestFor(records: GameRecord[], id: DifficultyId): GameRecord | null {
  let best: GameRecord | null = null;
  for (const r of records) {
    if (r.difficulty !== id) continue;
    if (!best || r.score > best.score) best = r;
  }
  return best;
}

function shortDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

// -------------------------------------------------------------------- sound

// Every effect is synthesised with the Web Audio API, so the package carries
// no audio files. The context is created on the first sound after a click,
// which is what browsers require.
type Sound =
  | "move"
  | "rotate"
  | "lock"
  | "drop"
  | "clear"
  | "tetris"
  | "garbage"
  | "level"
  | "start"
  | "over"
  | "win";

type Voice = { freq: number; dur: number; type: OscillatorType; gain?: number; at?: number; to?: number };

const VOICES: Record<Sound, Voice[]> = {
  move: [{ freq: 220, dur: 0.04, type: "square", gain: 0.05 }],
  rotate: [{ freq: 330, dur: 0.05, type: "square", gain: 0.05 }],
  lock: [{ freq: 150, dur: 0.07, type: "triangle", gain: 0.09 }],
  drop: [{ freq: 200, dur: 0.12, type: "sawtooth", gain: 0.09, to: 70 }],
  clear: [
    { freq: 523, dur: 0.08, type: "sine", gain: 0.11 },
    { freq: 659, dur: 0.08, type: "sine", gain: 0.11, at: 0.07 },
    { freq: 784, dur: 0.12, type: "sine", gain: 0.11, at: 0.14 },
  ],
  tetris: [
    { freq: 523, dur: 0.09, type: "square", gain: 0.11 },
    { freq: 659, dur: 0.09, type: "square", gain: 0.11, at: 0.08 },
    { freq: 784, dur: 0.09, type: "square", gain: 0.11, at: 0.16 },
    { freq: 1046, dur: 0.22, type: "square", gain: 0.12, at: 0.24 },
  ],
  garbage: [{ freq: 110, dur: 0.18, type: "sawtooth", gain: 0.1, to: 80 }],
  level: [
    { freq: 660, dur: 0.09, type: "triangle", gain: 0.1 },
    { freq: 880, dur: 0.16, type: "triangle", gain: 0.1, at: 0.09 },
  ],
  start: [
    { freq: 523, dur: 0.09, type: "triangle", gain: 0.1 },
    { freq: 784, dur: 0.16, type: "triangle", gain: 0.1, at: 0.09 },
  ],
  over: [{ freq: 440, dur: 0.7, type: "sawtooth", gain: 0.12, to: 90 }],
  win: [
    { freq: 659, dur: 0.1, type: "square", gain: 0.11 },
    { freq: 784, dur: 0.1, type: "square", gain: 0.11, at: 0.1 },
    { freq: 1046, dur: 0.28, type: "square", gain: 0.12, at: 0.2 },
  ],
};

class SoundKit {
  ctx: AudioContext | null = null;
  enabled = true;
  volume = 0.7;
  fail = false;

  resume() {
    if (this.fail) return null;
    try {
      if (!this.ctx) {
        const Ctor: any = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!Ctor) {
          this.fail = true;
          return null;
        }
        this.ctx = new Ctor();
      }
      if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
      return this.ctx;
    } catch {
      this.fail = true;
      return null;
    }
  }

  play(name: Sound) {
    if (!this.enabled) return;
    const ctx = this.resume();
    if (!ctx) return;
    const voices = VOICES[name];
    if (!voices) return;
    const now = ctx.currentTime;
    for (const v of voices) {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const at = now + (v.at ?? 0);
        osc.type = v.type;
        osc.frequency.setValueAtTime(v.freq, at);
        if (v.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, v.to), at + v.dur);
        const peak = Math.max(0.0001, (v.gain ?? 0.08) * this.volume);
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(peak, at + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + v.dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(at);
        osc.stop(at + v.dur + 0.02);
      } catch {
        /* a single missed blip is not worth interrupting the game */
      }
    }
  }
}
// ------------------------------------------------------------- relay helpers

// Python helper that holds the MQTT connection. Written to the room's temp
// folder on Connect. It double-forks so it survives the shell call that starts
// it, and exits on its own when the panel stops touching "alive".
const RELAY_PY = `
import os, sys, socket, struct, time, json, select

NL = chr(10)
DIR = sys.argv[1]
HOST = sys.argv[2]
PORT = int(sys.argv[3])
TOPIC = sys.argv[4]
CID = sys.argv[5]
IN = os.path.join(DIR, "in.jsonl")
OUT = os.path.join(DIR, "out.jsonl")
ALIVE = os.path.join(DIR, "alive")
STOP = os.path.join(DIR, "stop")

def note(obj):
    try:
        with open(IN, "a") as f:
            f.write(json.dumps(obj) + NL)
    except Exception:
        pass

def enc_len(n):
    out = b""
    while True:
        d = n % 128
        n = n // 128
        if n:
            d = d | 0x80
        out = out + bytes([d])
        if not n:
            return out

def enc_str(s):
    b = s.encode("utf-8")
    return struct.pack("!H", len(b)) + b

class Conn:
    def __init__(self, host, port, cid):
        self.s = socket.create_connection((host, port), timeout=10)
        self.s.settimeout(6)
        body = enc_str("MQTT") + bytes([4, 0x02]) + struct.pack("!H", 60) + enc_str(cid)
        self.s.sendall(bytes([0x10]) + enc_len(len(body)) + body)
        t, p = self.read()
        if t != 0x20 or len(p) < 2 or p[1] != 0:
            raise IOError("relay refused the connection")
    def getn(self, n):
        out = b""
        while len(out) < n:
            c = self.s.recv(n - len(out))
            if not c:
                raise IOError("relay closed the connection")
            out = out + c
        return out
    def read(self):
        h = self.getn(1)[0]
        mult = 1
        ln = 0
        while True:
            b = self.getn(1)[0]
            ln = ln + (b & 127) * mult
            if not (b & 0x80):
                break
            mult = mult * 128
        body = self.getn(ln) if ln else b""
        return h & 0xF0, body
    def subscribe(self, topic):
        vh = struct.pack("!H", 1) + enc_str(topic) + bytes([0])
        self.s.sendall(bytes([0x82]) + enc_len(len(vh)) + vh)
        t, p = self.read()
        if t != 0x90:
            raise IOError("could not join the room")
    def publish(self, topic, payload):
        body = enc_str(topic) + payload.encode("utf-8")
        self.s.sendall(bytes([0x30]) + enc_len(len(body)) + body)
    def ping(self):
        self.s.sendall(bytes([0xC0, 0x00]))

def daemonize():
    if os.fork() > 0:
        os._exit(0)
    os.setsid()
    if os.fork() > 0:
        os._exit(0)
    fd = os.open(os.devnull, os.O_RDWR)
    os.dup2(fd, 0)
    os.dup2(fd, 1)
    os.dup2(fd, 2)

def finished():
    if os.path.exists(STOP):
        return True
    try:
        return (time.time() - os.path.getmtime(ALIVE)) > 20
    except Exception:
        return True

def main():
    daemonize()
    off = 0
    conn = None
    last_ping = time.time()
    last_hb = 0.0
    tries = 0
    while True:
        if finished():
            break
        if conn is None:
            try:
                conn = Conn(HOST, PORT, CID)
                conn.subscribe(TOPIC)
                note({"t": "_up"})
                tries = 0
            except Exception as e:
                conn = None
                tries = tries + 1
                note({"t": "_err", "msg": str(e)[:140]})
                if tries > 15:
                    break
                time.sleep(2)
                continue
        try:
            ready = select.select([conn.s], [], [], 0.05)[0]
            if ready:
                t, p = conn.read()
                if t == 0x30 and len(p) >= 2:
                    tl = struct.unpack("!H", p[:2])[0]
                    msg = p[2 + tl:].decode("utf-8", "replace").replace(NL, " ")
                    with open(IN, "a") as f:
                        f.write(msg + NL)
            size = os.path.getsize(OUT) if os.path.exists(OUT) else 0
            if size > off:
                with open(OUT, "rb") as f:
                    f.seek(off)
                    chunk = f.read(size - off)
                text = chunk.decode("utf-8", "replace")
                idx = text.rfind(NL)
                if idx >= 0:
                    for line in text[:idx].split(NL):
                        line = line.strip()
                        if line:
                            conn.publish(TOPIC, line)
                    off = off + len(text[:idx + 1].encode("utf-8"))
            now = time.time()
            if now - last_ping > 25:
                conn.ping()
                last_ping = now
            if now - last_hb > 2:
                note({"t": "_hb"})
                last_hb = now
            if os.path.exists(IN) and os.path.getsize(IN) > 2000000:
                open(IN, "w").close()
        except Exception as e:
            note({"t": "_down", "msg": str(e)[:140]})
            try:
                conn.s.close()
            except Exception:
                pass
            conn = None
            time.sleep(1)
    try:
        if conn is not None:
            conn.s.close()
    except Exception:
        pass

main()
`;

function b64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function cleanRoom(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 24);
}

function makeRoom(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}


// -------------------------------------------------------------------- panel

export default function Panel({ sdk, ui }: any) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const nextRef = React.useRef<HTMLCanvasElement | null>(null);
  const oppRef = React.useRef<HTMLCanvasElement | null>(null);
  const menuRef = React.useRef<HTMLCanvasElement | null>(null);
  const gameRef = React.useRef<Game | null>(null); // no game exists until Start
  const recordedRef = React.useRef(false);
  const soundRef = React.useRef<SoundKit>(new SoundKit());
  const netRef = React.useRef<Net>({
    connected: false,
    busy: false,
    room: "",
    dir: "",
    topic: "",
    playerId: Math.random().toString(36).slice(2, 10),
    name: "Player",
    offset: 0,
    outQueue: [],
    lastDaemon: 0,
    opp: null,
    applied: 0,
    pending: 0,
  });

  const [phase, setPhase] = React.useState<"menu" | "playing">("menu");
  const [difficulty, setDifficulty] = React.useState<DifficultyId>("normal");
  const [stats, setStats] = React.useState({ score: 0, lines: 0, level: 1, over: false, paused: false });
  const [records, setRecords] = React.useState<GameRecord[]>([]);
  const [soundOn, setSoundOn] = React.useState(true);
  const [volume, setVolume] = React.useState(70);
  const [room, setRoom] = React.useState("");
  const [name, setName] = React.useState("Player");
  const [broker, setBroker] = React.useState("emqx");
  const [conn, setConn] = React.useState<"off" | "starting" | "on">("off");
  const [status, setStatus] = React.useState<{ tone: "muted" | "error" | "success"; text: string } | null>(null);
  const [oppView, setOppView] = React.useState<{
    name: string;
    score: number;
    lines: number;
    over: boolean;
  } | null>(null);
  const [pendingRows, setPendingRows] = React.useState(0);
  const [result, setResult] = React.useState<string | null>(null);
  const [clock, setClock] = React.useState(0); // drives the "waiting" state while connected

  React.useEffect(() => {
    netRef.current.name = name || "Player";
  }, [name]);

  React.useEffect(() => {
    soundRef.current.enabled = soundOn;
    soundRef.current.volume = volume / 100;
  }, [soundOn, volume]);

  const play = React.useCallback((sound: Sound) => {
    soundRef.current.play(sound);
  }, []);

  // Load saved preferences and records once.
  React.useEffect(() => {
    setRecords(loadRecords());
    try {
      const savedRoom = window.localStorage.getItem(ROOM_KEY);
      if (savedRoom) setRoom(savedRoom);
      const raw = window.localStorage.getItem(PREFS_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p && typeof p === "object") {
          if (DIFFICULTIES[p.difficulty as DifficultyId]) setDifficulty(p.difficulty);
          if (typeof p.soundOn === "boolean") setSoundOn(p.soundOn);
          if (typeof p.volume === "number") setVolume(Math.min(100, Math.max(0, p.volume)));
          if (typeof p.name === "string" && p.name) setName(p.name.slice(0, 24));
        }
      }
    } catch {
      /* storage unavailable — defaults are fine */
    }
  }, []);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify({ difficulty, soundOn, volume, name }));
    } catch {
      /* ignore */
    }
  }, [difficulty, soundOn, volume, name]);

  React.useEffect(() => {
    if (conn !== "on") return;
    const id = window.setInterval(() => setClock((c) => c + 1), 1000);
    return () => window.clearInterval(id);
  }, [conn]);

  const addRecord = React.useCallback((entry: GameRecord) => {
    setRecords((prev) => {
      const next = [entry, ...prev].slice(0, MAX_RECORDS);
      saveRecords(next);
      return next;
    });
  }, []);

  const sync = React.useCallback(() => {
    const g = gameRef.current;
    if (!g) return;
    setStats({ score: g.score, lines: g.lines, level: g.level, over: g.over, paused: g.paused });
    setPendingRows(netRef.current.pending);
    if (g.over && !recordedRef.current) {
      recordedRef.current = true;
      const opp = netRef.current.opp;
      const versus = netRef.current.connected && !!opp && Date.now() - opp.seen < 8000;
      const lost = versus && opp && !opp.over;
      addRecord({
        at: Date.now(),
        difficulty: g.difficulty,
        score: g.score,
        lines: g.lines,
        level: g.level,
        versus: !!versus,
        outcome: lost ? "lost" : "topped out",
      });
      if (lost && opp) setResult("Topped out — " + opp.name + " wins this one.");
      play("over");
    }
  }, [addRecord, play]);

  const send = React.useCallback((obj: any) => {
    const net = netRef.current;
    if (!net.connected) return;
    net.outQueue.push(JSON.stringify({ ...obj, id: net.playerId }));
    if (net.outQueue.length > 40) net.outQueue.splice(0, net.outQueue.length - 40);
  }, []);

  const sendState = React.useCallback(() => {
    const g = gameRef.current;
    if (!g) return; // in the menu there is no board to mirror
    send({
      t: "state",
      name: netRef.current.name || "Player",
      match: g.match,
      score: g.score,
      lines: g.lines,
      level: g.level,
      sent: g.sent,
      over: g.over,
      board: encodeBoard(g),
    });
  }, [send]);

  // ------------------------------------------------------------ game actions

  const ghostY = React.useCallback((g: Game): number => {
    const p = g.cur;
    if (!p) return 0;
    let y = p.y;
    while (!collides(g.board, p.m, p.x, y + 1)) y++;
    return y;
  }, []);

  const lockPiece = React.useCallback(
    (g: Game) => {
      const p = g.cur;
      if (!p) return;
      let aboveTop = false;
      for (let r = 0; r < p.m.length; r++) {
        for (let c = 0; c < p.m[r].length; c++) {
          if (!p.m[r][c]) continue;
          const y = p.y + r;
          const x = p.x + c;
          if (y < 0) aboveTop = true;
          else g.board[y][x] = p.type;
        }
      }
      const kept = g.board.filter((row) => row.some((cell) => !cell));
      const cleared = ROWS - kept.length;
      const net = netRef.current;
      if (cleared > 0) {
        const fresh = Array.from({ length: cleared }, () => Array(COLS).fill(null));
        g.board = (fresh as (string | null)[][]).concat(kept);
        g.lines += cleared;
        g.score += LINE_SCORE[cleared] * g.level;
        const before = g.level;
        g.level = levelFor(g);
        play(cleared >= 4 ? "tetris" : "clear");
        if (g.level > before) play("level");
        const attack = ATTACK[cleared] || 0;
        if (net.connected && attack > 0) {
          // Your own clears cancel incoming rows first, then the rest goes over.
          const cancelled = Math.min(net.pending, attack);
          net.pending -= cancelled;
          const outgoing = attack - cancelled;
          if (outgoing > 0) g.sent += outgoing;
        }
      } else {
        play("lock");
      }
      if (aboveTop) {
        g.over = true;
        g.cur = null;
        return;
      }
      if (net.pending > 0) {
        addGarbage(g, net.pending);
        net.pending = 0;
        play("garbage");
      }
      if (g.over) {
        g.cur = null;
        return;
      }
      spawn(g);
    },
    [play],
  );

  const move = React.useCallback(
    (dx: number) => {
      const g = gameRef.current;
      if (!g || g.over || g.paused || !g.cur) return;
      if (!collides(g.board, g.cur.m, g.cur.x + dx, g.cur.y)) {
        g.cur.x += dx;
        play("move");
      }
    },
    [play],
  );

  const rotate = React.useCallback(() => {
    const g = gameRef.current;
    if (!g || g.over || g.paused || !g.cur) return;
    const m2 = rotateCW(g.cur.m);
    for (const dx of [0, -1, 1, -2, 2]) {
      if (!collides(g.board, m2, g.cur.x + dx, g.cur.y)) {
        g.cur.m = m2;
        g.cur.x += dx;
        play("rotate");
        return;
      }
    }
  }, [play]);

  const softDrop = React.useCallback(
    (byPlayer: boolean) => {
      const g = gameRef.current;
      if (!g || g.over || g.paused || !g.cur) return;
      if (!collides(g.board, g.cur.m, g.cur.x, g.cur.y + 1)) {
        g.cur.y += 1;
        if (byPlayer) g.score += 1;
      } else {
        lockPiece(g);
      }
      g.dropAcc = 0;
      sync();
    },
    [lockPiece, sync],
  );

  const hardDrop = React.useCallback(() => {
    const g = gameRef.current;
    if (!g || g.over || g.paused || !g.cur) return;
    while (!collides(g.board, g.cur.m, g.cur.x, g.cur.y + 1)) {
      g.cur.y += 1;
      g.score += 2;
    }
    play("drop");
    lockPiece(g);
    g.dropAcc = 0;
    sync();
  }, [lockPiece, sync, play]);

  const togglePause = React.useCallback(() => {
    const g = gameRef.current;
    if (!g || g.over) return;
    g.paused = !g.paused;
    sync();
  }, [sync]);

  const startGame = React.useCallback(
    (id: DifficultyId) => {
      const net = netRef.current;
      gameRef.current = createGame(id);
      recordedRef.current = false;
      net.pending = 0;
      net.applied = net.opp ? net.opp.sent : 0;
      setResult(null);
      setPendingRows(0);
      setPhase("playing");
      soundRef.current.resume(); // this runs inside the click, which is what audio needs
      play("start");
      sync();
      sendState();
    },
    [play, sync, sendState],
  );

  const quitToMenu = React.useCallback(() => {
    gameRef.current = null;
    recordedRef.current = false;
    netRef.current.pending = 0;
    setPendingRows(0);
    setPhase("menu");
    setStats({ score: 0, lines: 0, level: 1, over: false, paused: false });
  }, []);

  const clearRecords = React.useCallback(() => {
    setRecords([]);
    saveRecords([]);
    try {
      window.localStorage.removeItem(HIGH_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const recordWin = React.useCallback(() => {
    const g = gameRef.current;
    if (!g || recordedRef.current) return;
    recordedRef.current = true; // the match is decided; the later top-out is not a new record
    addRecord({
      at: Date.now(),
      difficulty: g.difficulty,
      score: g.score,
      lines: g.lines,
      level: g.level,
      versus: true,
      outcome: "won",
    });
  }, [addRecord]);

  // Draws the handheld title screen: shell, dot-matrix LCD, mode list, buttons.
  const drawMenu = React.useCallback(() => {
    const canvas = menuRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const t = Date.now();
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, GBW, GBH);

    // --- shell ---------------------------------------------------------------
    roundRectPath(ctx, 0, 0, GBW, GBH, [10, 10, 34, 10]);
    ctx.fillStyle = GB.shell;
    ctx.fill();
    ctx.strokeStyle = GB.shellEdge;
    ctx.lineWidth = 2;
    ctx.stroke();
    roundRectPath(ctx, 5, 5, GBW - 10, 166, [7, 7, 7, 7]);
    ctx.fillStyle = GB.shellShade;
    ctx.fill();

    // --- screen bezel --------------------------------------------------------
    roundRectPath(ctx, 12, 14, GBW - 24, 152, [8, 8, 20, 8]);
    ctx.fillStyle = GB.bezel;
    ctx.fill();
    ctx.strokeStyle = GB.bezelEdge;
    ctx.lineWidth = 1;
    ctx.stroke();
    pixelText(ctx, "8-BIT DOT MATRIX", GBW / 2, 27, 6, GB.bezelText, "center", 1);
    ctx.beginPath();
    ctx.arc(21, 97, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = GB.led;
    ctx.fill();

    // --- LCD -----------------------------------------------------------------
    ctx.fillStyle = GB.lcd0;
    ctx.fillRect(LCD.x, LCD.y, LCD.w, LCD.h);
    ctx.fillStyle = GB.lcd1;
    for (let gx = 0; gx < LCD.w; gx += 4) ctx.fillRect(LCD.x + gx, LCD.y, 1, LCD.h);
    for (let gy = 0; gy < LCD.h; gy += 4) ctx.fillRect(LCD.x, LCD.y + gy, LCD.w, 1);

    ctx.save();
    ctx.beginPath();
    ctx.rect(LCD.x, LCD.y, LCD.w, LCD.h);
    ctx.clip();

    // decorative pieces drifting down the margins
    const deco = [
      { type: "T", col: 0, speed: 26, seed: 0 },
      { type: "L", col: 1, speed: 34, seed: 70 },
      { type: "S", col: 2, speed: 22, seed: 130 },
      { type: "I", col: 3, speed: 30, seed: 40 },
    ];
    for (const d of deco) {
      const m = SHAPES[d.type];
      const x = d.col < 2 ? LCD.x + 3 + d.col * 9 : LCD.x + LCD.w - 21 + (d.col - 2) * 9;
      const y = ((t / 1000) * d.speed + d.seed) % (LCD.h + 24) - 24 + LCD.y;
      ctx.fillStyle = GB.lcd1;
      for (let r = 0; r < m.length; r++) {
        for (let c = 0; c < m[r].length; c++) {
          if (m[r][c]) ctx.fillRect(Math.round(x + c * 4), Math.round(y + r * 4), 3, 3);
        }
      }
    }

    // title
    pixelText(ctx, "TETRIS", LCD.x + LCD.w / 2 + 1, LCD.y + 25, 21, GB.lcd2, "center", 2);
    pixelText(ctx, "TETRIS", LCD.x + LCD.w / 2, LCD.y + 24, 21, GB.lcd3, "center", 2);
    ctx.fillStyle = GB.lcd3;
    ctx.fillRect(LCD.x + 22, LCD.y + 29, LCD.w - 44, 1);
    pixelText(ctx, "SELECTS EDITION", LCD.x + LCD.w / 2, LCD.y + 37, 6, GB.lcd2, "center", 1);

    // mode list
    ctx.strokeStyle = GB.lcd3;
    ctx.lineWidth = 1;
    ctx.strokeRect(MODE_BOX.x + 0.5, MODE_BOX.y + 0.5, MODE_BOX.w, MODE_BOX.h);
    ctx.strokeRect(MODE_BOX.x + 2.5, MODE_BOX.y + 2.5, MODE_BOX.w - 4, MODE_BOX.h - 4);
    DIFFICULTY_IDS.forEach((id, i) => {
      const rowY = MODE_BOX.y + 4 + i * MODE_ROW_H;
      const selected = id === difficulty;
      if (selected) {
        ctx.fillStyle = GB.lcd3;
        ctx.fillRect(MODE_BOX.x + 4, rowY, MODE_BOX.w - 8, MODE_ROW_H - 2);
      }
      const label = DIFFICULTIES[id].label.toUpperCase();
      pixelText(ctx, label, MODE_BOX.x + 16, rowY + 8, 8, selected ? GB.lcd0 : GB.lcd3, "left", 1);
      const best = bestFor(records, id);
      pixelText(
        ctx,
        best ? String(best.score) : "---",
        MODE_BOX.x + MODE_BOX.w - 8,
        rowY + 8,
        7,
        selected ? GB.lcd0 : GB.lcd2,
        "right",
        0,
      );
      if (selected) {
        ctx.fillStyle = GB.lcd0;
        ctx.beginPath();
        ctx.moveTo(MODE_BOX.x + 7, rowY + 2);
        ctx.lineTo(MODE_BOX.x + 12, rowY + 5);
        ctx.lineTo(MODE_BOX.x + 7, rowY + 8);
        ctx.closePath();
        ctx.fill();
      }
    });

    // footer: last result and a blinking prompt
    const last = records[0];
    pixelText(
      ctx,
      last ? "LAST " + last.score + (last.versus ? " " + last.outcome.toUpperCase() : "") : "NO GAMES YET",
      LCD.x + LCD.w / 2,
      MODE_BOX.y + MODE_BOX.h + 12,
      6,
      GB.lcd2,
      "center",
      1,
    );
    if (Math.floor(t / 450) % 2 === 0) {
      pixelText(ctx, "PRESS START", LCD.x + LCD.w / 2, LCD.y + LCD.h - 5, 9, GB.lcd3, "center", 1);
    }
    ctx.restore();

    // --- wordmark ------------------------------------------------------------
    ctx.save();
    ctx.font = "italic bold 12px ui-monospace, Menlo, Consolas, monospace";
    ctx.fillStyle = GB.word;
    ctx.textAlign = "center";
    ctx.fillText("POCKET BLOCKS", GBW / 2, 182);
    ctx.restore();

    // --- d-pad ---------------------------------------------------------------
    const dp = { cx: 44, cy: 212, arm: 16, thick: 16 };
    ctx.fillStyle = GB.bezelEdge;
    ctx.fillRect(dp.cx - dp.thick / 2, dp.cy - dp.arm - dp.thick / 2, dp.thick, dp.arm * 2 + dp.thick);
    ctx.fillRect(dp.cx - dp.arm - dp.thick / 2, dp.cy - dp.thick / 2, dp.arm * 2 + dp.thick, dp.thick);
    ctx.fillStyle = GB.bezel;
    ctx.beginPath();
    ctx.arc(dp.cx, dp.cy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = GB.shellShade;
    // up / down arrow marks
    ctx.beginPath();
    ctx.moveTo(dp.cx, dp.cy - dp.arm - 2);
    ctx.lineTo(dp.cx - 3, dp.cy - dp.arm + 3);
    ctx.lineTo(dp.cx + 3, dp.cy - dp.arm + 3);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(dp.cx, dp.cy + dp.arm + 2);
    ctx.lineTo(dp.cx - 3, dp.cy + dp.arm - 3);
    ctx.lineTo(dp.cx + 3, dp.cy + dp.arm - 3);
    ctx.fill();

    // --- A / B buttons -------------------------------------------------------
    const round = (cx: number, cy: number, r: number, fill: string, edge: string) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = edge;
      ctx.lineWidth = 1;
      ctx.stroke();
    };
    round(HIT.aButton.cx, HIT.aButton.cy, HIT.aButton.r, GB.button, GB.buttonEdge);
    round(134, 210, 12, GB.button, GB.buttonEdge);
    pixelText(ctx, "A", HIT.aButton.cx + 16, HIT.aButton.cy + 14, 7, GB.word, "center", 0);
    pixelText(ctx, "B", 150, 224, 7, GB.word, "center", 0);

    // --- select / start ------------------------------------------------------
    const pill = (x: number, y: number, w: number, h: number, label: string) => {
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(-0.25);
      roundRectPath(ctx, -w / 2, -h / 2, w, h, [h / 2, h / 2, h / 2, h / 2]);
      ctx.fillStyle = GB.pill;
      ctx.fill();
      ctx.restore();
      pixelText(ctx, label, x + w / 2, y + h + 8, 6, GB.word, "center", 1);
    };
    pill(62, 226, 40, 10, "SELECT");
    pill(HIT.start.x, HIT.start.y, HIT.start.w, HIT.start.h, "START");
  }, [difficulty, records]);

  // ------------------------------------------------------------------ render

  const draw = React.useCallback(() => {
    const canvas = canvasRef.current;
    const g = gameRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = COLS * CELL;
    const h = ROWS * CELL;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(127,127,127,0.12)";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(127,127,127,0.16)";
    ctx.lineWidth = 1;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL + 0.5, 0);
      ctx.lineTo(c * CELL + 0.5, h);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL + 0.5);
      ctx.lineTo(w, r * CELL + 0.5);
      ctx.stroke();
    }

    const block = (x: number, y: number, color: string) => {
      if (y < 0) return;
      ctx.fillStyle = color;
      ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, 4);
    };

    if (g) {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const cell = g.board[r][c];
          if (cell) block(c, r, COLORS[cell] || COLORS.G);
        }
      }

      const p = g.cur;
      if (p && !g.over) {
        const gy = ghostY(g);
        ctx.strokeStyle = COLORS[p.type];
        ctx.globalAlpha = 0.35;
        for (let r = 0; r < p.m.length; r++) {
          for (let c = 0; c < p.m[r].length; c++) {
            if (!p.m[r][c]) continue;
            const y = gy + r;
            if (y < 0) continue;
            ctx.strokeRect((p.x + c) * CELL + 2, y * CELL + 2, CELL - 4, CELL - 4);
          }
        }
        ctx.globalAlpha = 1;
        for (let r = 0; r < p.m.length; r++) {
          for (let c = 0; c < p.m[r].length; c++) {
            if (p.m[r][c]) block(p.x + c, p.y + r, COLORS[p.type]);
          }
        }
      }
    }

    const nc = nextRef.current;
    if (nc) {
      const nctx = nc.getContext("2d");
      if (nctx) {
        const size = 4 * CELL;
        nctx.clearRect(0, 0, size, size);
        nctx.fillStyle = "rgba(127,127,127,0.12)";
        nctx.fillRect(0, 0, size, size);
        const t = g ? g.next : null;
        if (t) {
          const m = SHAPES[t];
          const off = (4 - m.length) / 2;
          for (let r = 0; r < m.length; r++) {
            for (let c = 0; c < m[r].length; c++) {
              if (!m[r][c]) continue;
              nctx.fillStyle = COLORS[t];
              nctx.fillRect((off + c) * CELL + 1, (off + r) * CELL + 1, CELL - 2, CELL - 2);
            }
          }
        }
      }
    }

    const oc = oppRef.current;
    if (oc) {
      const octx = oc.getContext("2d");
      if (octx) {
        const ow = COLS * MINI;
        const oh = ROWS * MINI;
        octx.clearRect(0, 0, ow, oh);
        octx.fillStyle = "rgba(127,127,127,0.12)";
        octx.fillRect(0, 0, ow, oh);
        const opp = netRef.current.opp;
        if (opp && opp.board.length === ROWS * COLS) {
          for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
              const ch = opp.board[r * COLS + c];
              if (ch === ".") continue;
              octx.fillStyle = COLORS[ch] || COLORS.G;
              octx.fillRect(c * MINI, r * MINI, MINI - 1, MINI - 1);
            }
          }
        }
      }
    }
  }, [ghostY]);

  // --------------------------------------------------------------- game loop

  React.useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const g = gameRef.current;
      const dt = now - last;
      last = now;
      if (g && !g.over && !g.paused) {
        g.dropAcc += dt;
        if (g.dropAcc >= dropInterval(g)) {
          g.dropAcc = 0;
          if (g.cur && !collides(g.board, g.cur.m, g.cur.x, g.cur.y + 1)) {
            g.cur.y += 1;
          } else {
            lockPiece(g);
            sync();
          }
        }
      }
      if (g) draw();
      else drawMenu();
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, [draw, drawMenu, sync, lockPiece]);

  // ---------------------------------------------------------------- keyboard

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      const codes = ["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", "Space", "KeyP", "KeyR", "Escape", "Enter"];
      if (!codes.includes(event.code)) return;
      if (phase !== "playing") {
        // On the title screen the d-pad picks a mode and Start begins the game.
        const menuCodes = ["ArrowUp", "ArrowDown", "Space", "Enter", "KeyR"];
        if (!menuCodes.includes(event.code)) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.code === "ArrowUp" || event.code === "ArrowDown") {
          const i = DIFFICULTY_IDS.indexOf(difficulty);
          const next = event.code === "ArrowUp" ? i - 1 : i + 1;
          const wrapped = (next + DIFFICULTY_IDS.length) % DIFFICULTY_IDS.length;
          setDifficulty(DIFFICULTY_IDS[wrapped]);
          play("move");
          return;
        }
        startGame(difficulty);
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (event.code === "ArrowLeft") move(-1);
      else if (event.code === "ArrowRight") move(1);
      else if (event.code === "ArrowDown") softDrop(true);
      else if (event.code === "ArrowUp") rotate();
      else if (event.code === "Space") hardDrop();
      else if (event.code === "KeyP") togglePause();
      else if (event.code === "KeyR") startGame(gameRef.current?.difficulty ?? difficulty);
      else if (event.code === "Escape") quitToMenu();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [phase, difficulty, move, rotate, softDrop, hardDrop, togglePause, startGame, quitToMenu, play]);
  // ----------------------------------------------------------- relay traffic

  const handleMessage = React.useCallback(
    (msg: any) => {
      const net = netRef.current;
      if (!msg || typeof msg !== "object") return;
      if (msg.t === "_hb") {
        net.lastDaemon = Date.now();
        return;
      }
      if (msg.t === "_up") {
        net.lastDaemon = Date.now();
        setStatus({ tone: "success", text: "In room " + net.room + ". Waiting for your friend…" });
        return;
      }
      if (msg.t === "_err" || msg.t === "_down") {
        setStatus({ tone: "error", text: "Relay problem: " + (msg.msg || "connection lost") + " — retrying." });
        return;
      }
      if (msg.id === net.playerId) return; // our own message, echoed back by the relay
      if (msg.t === "bye") {
        if (net.opp && net.opp.id === msg.id) {
          net.opp = null;
          setOppView(null);
          setStatus({ tone: "muted", text: "Your friend left the room." });
        }
        return;
      }
      if (msg.t === "hello") {
        sendState();
        return;
      }
      if (msg.t !== "state") return;

      const prev = net.opp;
      const fresh: Opponent = {
        id: String(msg.id),
        name: String(msg.name || "Friend").slice(0, 24),
        match: String(msg.match || ""),
        score: Number(msg.score) || 0,
        lines: Number(msg.lines) || 0,
        level: Number(msg.level) || 1,
        board: typeof msg.board === "string" ? msg.board : "",
        over: !!msg.over,
        sent: Number(msg.sent) || 0,
        seen: Date.now(),
      };
      if (!prev || prev.id !== fresh.id || prev.match !== fresh.match) {
        net.applied = 0; // new opponent, or they started a new match
        net.pending = 0;
      }
      net.opp = fresh;

      const owed = fresh.sent - net.applied;
      if (owed > 0) {
        const g = gameRef.current;
        net.applied = fresh.sent;
        if (g && !g.over) {
          net.pending += owed;
          setPendingRows(net.pending);
        }
      }

      setOppView({ name: fresh.name, score: fresh.score, lines: fresh.lines, over: fresh.over });

      const g = gameRef.current;
      if (fresh.over && g && !g.over) {
        setResult(fresh.name + " topped out — you win!");
        recordWin();
        play("win");
      }
      else if (!prev) setStatus({ tone: "success", text: fresh.name + " joined the room." });
    },
    [sendState],
  );

  const tick = React.useCallback(async () => {
    const net = netRef.current;
    if (!net.connected || net.busy) return;
    net.busy = true;
    try {
      const out = net.outQueue.splice(0, net.outQueue.length);
      const payload = out.length ? b64(out.join("\n") + "\n") : "";
      const parts = [
        "cd " + JSON.stringify(net.dir) + " 2>/dev/null || exit 9",
        payload ? "printf %s '" + payload + "' | base64 -d >> out.jsonl" : "",
        "touch alive",
        'echo "SIZE $(wc -c < in.jsonl 2>/dev/null || echo 0)"',
        "tail -c +" + (net.offset + 1) + " in.jsonl 2>/dev/null",
      ].filter(Boolean);
      const r = await sdk.runShell({
        summary: "tetris relay tick",
        command: parts.join("\n"),
        timeoutMs: 8000,
        maxOutputBytes: 48000,
      });
      const text = String(r?.stdout ?? r?.output ?? "");
      const brk = text.indexOf("\n");
      const head = brk >= 0 ? text.slice(0, brk) : text;
      const body = brk >= 0 ? text.slice(brk + 1) : "";
      const sizeMatch = head.match(/SIZE\s+(\d+)/);
      const size = sizeMatch ? Number(sizeMatch[1]) : -1;
      if (size >= 0 && size < net.offset) {
        net.offset = 0; // the helper rotated its log
      } else if (body) {
        const lines = body.split("\n");
        const complete = lines.slice(0, -1); // the trailing piece may be partial
        let consumed = 0;
        for (const line of complete) {
          consumed += new TextEncoder().encode(line + "\n").length;
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            handleMessage(JSON.parse(trimmed));
          } catch {
            /* ignore a malformed line from the public relay */
          }
        }
        net.offset += consumed;
      }
      if (net.lastDaemon && Date.now() - net.lastDaemon > 9000) {
        setStatus({ tone: "error", text: "Lost the relay helper — press Connect again." });
      }
      sendState();
    } catch (err: any) {
      setStatus({ tone: "error", text: "Relay error: " + (err?.message || String(err)) });
    } finally {
      netRef.current.busy = false;
    }
  }, [sdk, handleMessage, sendState]);

  React.useEffect(() => {
    if (conn !== "on") return;
    const id = window.setInterval(() => {
      void tick();
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [conn, tick]);

  const connect = React.useCallback(async () => {
    const net = netRef.current;
    const clean = cleanRoom(room);
    if (clean.length < 3) {
      setStatus({ tone: "error", text: "Room code needs at least 3 letters or digits." });
      return;
    }
    setConn("starting");
    setStatus({ tone: "muted", text: "Starting the relay helper…" });
    const dir = "/tmp/selects-tetris/" + clean;
    const topic = "selects/tetris/v1/" + clean;
    const b = BROKERS[broker] || BROKERS.emqx;
    const cid = "selects-tetris-" + net.playerId;
    try {
      const cmd = [
        "command -v python3 >/dev/null 2>&1 || { echo NOPYTHON; exit 3; }",
        "mkdir -p " + JSON.stringify(dir),
        "cd " + JSON.stringify(dir),
        "touch stop alive in.jsonl out.jsonl",
        "sleep 0.8",
        "rm -f stop in.jsonl out.jsonl",
        "touch in.jsonl out.jsonl alive",
        "printf %s '" + b64(RELAY_PY) + "' | base64 -d > relay.py",
        "python3 relay.py " + JSON.stringify(dir) + " " + b.host + " " + b.port + " " + topic + " " + cid,
        "echo STARTED",
      ].join("\n");
      const r = await sdk.runShell({ summary: "start tetris relay", command: cmd, timeoutMs: 30000 });
      const out = String(r?.stdout ?? r?.output ?? "");
      if (out.includes("NOPYTHON")) {
        setConn("off");
        setStatus({ tone: "error", text: "python3 was not found on this machine — multiplayer needs it." });
        return;
      }
      if (r?.isError || !out.includes("STARTED")) {
        setConn("off");
        setStatus({
          tone: "error",
          text: "Could not start the relay helper: " + (r?.stderr || out || "unknown error"),
        });
        return;
      }
      net.room = clean;
      net.dir = dir;
      net.topic = topic;
      net.offset = 0;
      net.outQueue = [];
      net.opp = null;
      net.applied = 0;
      net.pending = 0;
      net.lastDaemon = Date.now();
      net.connected = true;
      setRoom(clean);
      try {
        window.localStorage.setItem(ROOM_KEY, clean);
      } catch {
        /* ignore */
      }
      setConn("on");
      setStatus({ tone: "muted", text: "Joining room " + clean + "…" });
      send({ t: "hello", name: netRef.current.name });
      sendState();
    } catch (err: any) {
      setConn("off");
      netRef.current.connected = false;
      setStatus({ tone: "error", text: "Connect failed: " + (err?.message || String(err)) });
    }
  }, [sdk, room, broker, send, sendState]);

  const disconnect = React.useCallback(async () => {
    const net = netRef.current;
    const dir = net.dir;
    const bye = b64(JSON.stringify({ t: "bye", id: net.playerId }) + "\n");
    net.connected = false;
    net.opp = null;
    setConn("off");
    setOppView(null);
    setStatus({ tone: "muted", text: "Left the room." });
    if (!dir) return;
    try {
      await sdk.runShell({
        summary: "stop tetris relay",
        command: [
          "cd " + JSON.stringify(dir) + " 2>/dev/null || exit 0",
          "printf %s '" + bye + "' | base64 -d >> out.jsonl",
          "sleep 0.5",
          "touch stop",
        ].join("\n"),
        timeoutMs: 15000,
      });
    } catch {
      /* the helper also exits on its own once "alive" goes stale */
    }
  }, [sdk]);

  React.useEffect(() => {
    return () => {
      const net = netRef.current;
      if (net.connected && net.dir) {
        net.connected = false;
        try {
          void sdk.runShell({
            summary: "stop tetris relay",
            command: "touch " + JSON.stringify(net.dir + "/stop"),
            timeoutMs: 10000,
          });
        } catch {
          /* ignore */
        }
      }
    };
  }, [sdk]);

  // Clicks on the drawn handheld: the d-pad picks a mode, A/Start begin play,
  // and the mode rows on the screen are clickable too.
  const onHandheldClick = React.useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = menuRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * GBW;
      const y = ((event.clientY - rect.top) / rect.height) * GBH;
      const inBox = (b: { x: number; y: number; w: number; h: number }) =>
        x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
      const step = (delta: number) => {
        const i = DIFFICULTY_IDS.indexOf(difficulty);
        setDifficulty(DIFFICULTY_IDS[(i + delta + DIFFICULTY_IDS.length) % DIFFICULTY_IDS.length]);
        play("move");
      };
      if (inBox(HIT.dpadUp)) return step(-1);
      if (inBox(HIT.dpadDown)) return step(1);
      const dx = x - HIT.aButton.cx;
      const dy = y - HIT.aButton.cy;
      if (dx * dx + dy * dy <= HIT.aButton.r * HIT.aButton.r) return startGame(difficulty);
      if (inBox(HIT.start)) return startGame(difficulty);
      if (x >= MODE_BOX.x && x <= MODE_BOX.x + MODE_BOX.w) {
        const row = Math.floor((y - (MODE_BOX.y + 4)) / MODE_ROW_H);
        if (row >= 0 && row < DIFFICULTY_IDS.length) {
          const picked = DIFFICULTY_IDS[row];
          if (picked === difficulty) return startGame(difficulty);
          setDifficulty(picked);
          play("move");
        }
      }
    },
    [difficulty, startGame, play],
  );

  // --------------------------------------------------------------------- ui

  const opp = netRef.current.opp;
  const oppQuiet = conn === "on" && (!opp || Date.now() - opp.seen > 5000);
  const currentBest = bestFor(records, difficulty);
  const recent = records.slice(0, 5);
  const d = DIFFICULTIES[difficulty];

  const multiplayerSection = (
    <ui.Section title="Play a friend">
      <ui.Stack gap={8}>
        <ui.TextField label="Your name" value={name} onChange={setName} placeholder="Player" />
        <ui.TextField
          label="Room code"
          value={room}
          onChange={(v: string) => setRoom(cleanRoom(v))}
          placeholder="abc123"
          disabled={conn !== "off"}
        />
        <ui.Row gap={4}>
          <ui.Button variant="ghost" disabled={conn !== "off"} onClick={() => setRoom(makeRoom())}>
            New code
          </ui.Button>
          <ui.Button
            variant="ghost"
            disabled={!room}
            onClick={() => {
              try {
                void navigator.clipboard.writeText(room);
                setStatus({ tone: "muted", text: "Room code copied — send it to your friend." });
              } catch {
                setStatus({ tone: "muted", text: "Copy the code from the field above." });
              }
            }}
          >
            Copy code
          </ui.Button>
        </ui.Row>
        <ui.Select
          label="Relay"
          value={broker}
          onChange={setBroker}
          disabled={conn !== "off"}
          options={[
            { value: "emqx", label: "EMQX (default)" },
            { value: "hivemq", label: "HiveMQ" },
            { value: "mosquitto", label: "Mosquitto" },
          ]}
        />
        <ui.Actions>
          {conn === "off" ? (
            <ui.Button variant="secondary" onClick={() => void connect()}>
              Connect
            </ui.Button>
          ) : (
            <ui.Button
              variant="secondary"
              busy={conn === "starting"}
              busyLabel="Connecting…"
              onClick={() => void disconnect()}
            >
              Disconnect
            </ui.Button>
          )}
        </ui.Actions>
        {status && <ui.Message tone={status.tone}>{status.text}</ui.Message>}
        <small>
          The same code on both machines connects you. Clearing 2, 3 or 4 lines sends 1, 2 or 4 garbage rows
          across, and your own clears cancel incoming rows first. The room is a public relay topic, so use a
          random code.
        </small>
      </ui.Stack>
    </ui.Section>
  );

  const opponentBlock = conn === "on" && (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
      <canvas
        ref={oppRef}
        width={COLS * MINI}
        height={ROWS * MINI}
        style={{
          width: "100%",
          maxWidth: 110,
          height: "auto",
          display: "block",
          borderRadius: "var(--panel-radius)",
          border: "1px solid var(--panel-border)",
          opacity: oppQuiet ? 0.4 : 1,
        }}
      />
      <div style={{ minWidth: 90, flex: "1 1 90px" }}>
        {oppView ? (
          <table>
            <tbody>
              <tr>
                <td>{oppView.name}</td>
                <td>{oppView.over ? "out" : oppQuiet ? "idle" : "playing"}</td>
              </tr>
              <tr>
                <td>Score</td>
                <td>{oppView.score}</td>
              </tr>
              <tr>
                <td>Lines</td>
                <td>{oppView.lines}</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <p>Waiting for your friend to join room {room}…</p>
        )}
      </div>
    </div>
  );

  if (phase === "menu") {
    return (
      <ui.Stack gap={16}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <canvas
            ref={menuRef}
            width={GBW}
            height={GBH}
            onClick={onHandheldClick}
            aria-label="Title screen: pick a mode with the d-pad, press Start"
            style={{
              width: "100%",
              maxWidth: 260,
              height: "auto",
              display: "block",
              cursor: "pointer",
              imageRendering: "pixelated",
            }}
          />
        </div>

        <ui.Section title="Mode">
          <ui.Stack gap={8}>
            <p>
              {d.label}: starts at level {d.startLevel},{" "}
              {d.speed > 1 ? "gentler" : d.speed === 1 ? "standard" : "faster"} fall speed, level up every{" "}
              {d.linesPerLevel} lines.
              {currentBest ? " Your best here: " + currentBest.score + "." : " No games yet on this setting."}
            </p>
            <p>Pick a mode on the screen or with ↑ ↓, then press Start (or Space).</p>
            <ui.Actions>
              <ui.Button variant="primary" onClick={() => startGame(difficulty)}>
                Start game
              </ui.Button>
            </ui.Actions>
            {result && <ui.Message tone="success">{result}</ui.Message>}
            {conn === "on" && opponentBlock}
          </ui.Stack>
        </ui.Section>

        <ui.Section title="Records">
          <ui.Stack gap={8}>
            <h3>Best score</h3>
            <table>
              <tbody>
                {DIFFICULTY_IDS.map((id) => {
                  const best = bestFor(records, id);
                  return (
                    <tr key={id}>
                      <td>{DIFFICULTIES[id].label}</td>
                      <td>{best ? best.score : "—"}</td>
                      <td>{best ? best.lines + " lines" : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <h3>Last games</h3>
            {recent.length === 0 ? (
              <p>No games played yet.</p>
            ) : (
              <table>
                <tbody>
                  {recent.map((r, i) => (
                    <tr key={r.at + "-" + i}>
                      <td>
                        {shortDate(r.at)} · {DIFFICULTIES[r.difficulty]?.label ?? r.difficulty}
                      </td>
                      <td>{r.score}</td>
                      <td>{r.versus ? r.outcome : r.lines + " lines"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {records.length > 0 && (
              <ui.Actions>
                <ui.Button variant="danger" onClick={clearRecords}>
                  Clear records
                </ui.Button>
              </ui.Actions>
            )}
          </ui.Stack>
        </ui.Section>

        <ui.Section title="Sound">
          <ui.Stack gap={8}>
            <ui.Toggle label="Sound effects" value={soundOn} onChange={setSoundOn} />
            <ui.Slider
              label="Volume"
              value={volume}
              onChange={(v: number) => {
                setVolume(v);
                soundRef.current.volume = v / 100;
                soundRef.current.enabled = soundOn;
                soundRef.current.play("rotate"); // audible preview of the new level
              }}
              min={0}
              max={100}
              step={5}
              unit="%"
              disabled={!soundOn}
            />
          </ui.Stack>
        </ui.Section>

        {multiplayerSection}
      </ui.Stack>
    );
  }

  return (
    <ui.Stack gap={16}>
      <ui.Section title={"Tetris — " + d.label}>
        <ui.Stack gap={8}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
            <canvas
              ref={canvasRef}
              width={COLS * CELL}
              height={ROWS * CELL}
              style={{
                width: "100%",
                maxWidth: 200,
                height: "auto",
                display: "block",
                borderRadius: "var(--panel-radius)",
                border: "1px solid var(--panel-border)",
              }}
            />
            <div style={{ minWidth: 76, flex: "1 1 76px" }}>
              <small>Next</small>
              <canvas
                ref={nextRef}
                width={4 * CELL}
                height={4 * CELL}
                style={{
                  width: "100%",
                  maxWidth: 76,
                  height: "auto",
                  display: "block",
                  borderRadius: "var(--panel-radius)",
                  border: "1px solid var(--panel-border)",
                }}
              />
              <table>
                <tbody>
                  <tr>
                    <td>Score</td>
                    <td>{stats.score}</td>
                  </tr>
                  <tr>
                    <td>Lines</td>
                    <td>{stats.lines}</td>
                  </tr>
                  <tr>
                    <td>Level</td>
                    <td>{stats.level}</td>
                  </tr>
                  <tr>
                    <td>Best</td>
                    <td>{currentBest ? currentBest.score : "—"}</td>
                  </tr>
                </tbody>
              </table>
              {conn === "on" && pendingRows > 0 && (
                <small style={{ color: "var(--panel-danger)" }}>Incoming: {pendingRows} row(s)</small>
              )}
            </div>
          </div>

          {result && <ui.Message tone="success">{result}</ui.Message>}
          {stats.over && !result && <ui.Message tone="error">Game over — restart or go back.</ui.Message>}
          {!stats.over && stats.paused && <ui.Message>Paused.</ui.Message>}

          <ui.Row gap={4}>
            <ui.Button variant="ghost" onClick={() => move(-1)}>
              ←
            </ui.Button>
            <ui.Button variant="ghost" onClick={rotate}>
              ↻
            </ui.Button>
            <ui.Button variant="ghost" onClick={() => move(1)}>
              →
            </ui.Button>
            <ui.Button variant="ghost" onClick={() => softDrop(true)}>
              ↓
            </ui.Button>
            <ui.Button variant="ghost" onClick={hardDrop}>
              Drop
            </ui.Button>
          </ui.Row>

          <ui.Actions>
            <ui.Button variant="ghost" onClick={quitToMenu}>
              Main menu
            </ui.Button>
            <ui.Button variant="secondary" disabled={stats.over} onClick={togglePause}>
              {stats.paused ? "Resume" : "Pause"}
            </ui.Button>
            <ui.Button variant="primary" onClick={() => startGame(gameRef.current?.difficulty ?? difficulty)}>
              Restart game
            </ui.Button>
          </ui.Actions>

          {conn === "on" && opponentBlock}

          <small>
            Keys: ← → move, ↑ rotate, ↓ soft drop, Space hard drop, P pause, R restart, Esc main menu.
          </small>
        </ui.Stack>
      </ui.Section>
    </ui.Stack>
  );
}
