// @name Thank You Recap
// @name:de Thank You Rückblick
// @name:en Thank You Recap
// @name:es Resumen Thank You
// @name:fr Rétrospective Thank You
// @name:it Recap Thank You
// @name:ja Thank You リキャップ
// @name:ko Thank You Recap
// @name:pt Retrospectiva Thank You
// @name:tr Thank You Özeti
// @name:zh Thank You 年度回顾
// @collection visual-highlights
// @icon video
// Builds a "Thank you <year>" recap Draft on the template's fixed 16:9 timeline:
// a rapid montage cut on every hit of the opening bass roll, one held hero shot
// under a small "THANK YOU" and a flickering year, a second montage while the trumpet's
// held note plays and the frame closes to a line, then beat-cut footage to the end.
// The source sound is muted and the template's own music plays underneath.
// Every cut stays an editable clip; the titles are one editable Motion Graphic.
import React, { useEffect, useRef, useState } from "react";

const STRINGS = {
  en: {
    title: "Thank You Recap",
    noProject: "Open a project to use this template.",
    loading: "Reading project media…",
    videos: "Videos",
    videosHint: "Checked videos fill the montage in this order.",
    noVideos: "This project has no videos yet.",
    hero: "Hero shot",
    heroHint: (s: string) => `Held for ${s}s under the title, so it needs a video at least that long. Calm, wide shots work best.`,
    heroAuto: "Let AI choose",
    year: "Year",
    create: "Create Draft",
    creating: "Creating…",
    needVideos: "Choose at least three videos.",
    needHero: (s: string) => `None of the checked videos is ${s}s or longer, so there is no hero shot.`,
    steps: ["Choose hero shot", "Cut montage", "Music and titles", "Open Draft"],
    aiFallback: "AI pick unavailable; used the longest video as the hero shot.",
    done: (n: number, s: string) => `Created a Draft with ${n} cuts (${s}s).`,
    failed: "Could not create the Draft.",
  },
  ko: {
    title: "Thank You Recap",
    noProject: "\uc774 \ud15c\ud50c\ub9bf\uc744 \uc4f0\ub824\uba74 \ud504\ub85c\uc81d\ud2b8\ub97c \uc5ec\uc138\uc694.",
    loading: "\ud504\ub85c\uc81d\ud2b8 \ubbf8\ub514\uc5b4\ub97c \uc77d\ub294 \uc911\u2026",
    videos: "\uc601\uc0c1",
    videosHint: "\uc120\ud0dd\ud55c \uc601\uc0c1\uc774 \uc774 \uc21c\uc11c\ub300\ub85c \ubabd\ud0c0\uc8fc\ub97c \ucc44\uc6c1\ub2c8\ub2e4.",
    noVideos: "\uc774 \ud504\ub85c\uc81d\ud2b8\uc5d0 \uc544\uc9c1 \uc601\uc0c1\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.",
    hero: "\uba54\uc778 \uc0f7",
    heroHint: (s: string) => `\ud0c0\uc774\ud2c0 \uc544\ub798\uc5d0\uc11c ${s}\ucd08 \ub3d9\uc548 \uc720\uc9c0\ub418\ubbc0\ub85c \uadf8\ubcf4\ub2e4 \uae34 \uc601\uc0c1\uc774 \ud544\uc694\ud569\ub2c8\ub2e4. \ucc28\ubd84\ud55c \uc640\uc774\ub4dc \uc0f7\uc774 \uac00\uc7a5 \uc798 \uc5b4\uc6b8\ub9bd\ub2c8\ub2e4.`,
    heroAuto: "AI\uac00 \uace0\ub974\uae30",
    year: "\uc5f0\ub3c4",
    create: "Draft \ub9cc\ub4e4\uae30",
    creating: "\ub9cc\ub4dc\ub294 \uc911\u2026",
    needVideos: "\uc601\uc0c1\uc744 \uc138 \uac1c \uc774\uc0c1 \uace0\ub974\uc138\uc694.",
    needHero: (s: string) => `\uc120\ud0dd\ud55c \uc601\uc0c1 \uc911 ${s}\ucd08 \uc774\uc0c1\uc778 \uc601\uc0c1\uc774 \uc5c6\uc5b4 \uba54\uc778 \uc0f7\uc744 \ub123\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.`,
    steps: ["\uba54\uc778 \uc0f7 \uace0\ub974\uae30", "\ubabd\ud0c0\uc8fc \uc790\ub974\uae30", "\uc74c\uc545\uacfc \ud0c0\uc774\ud2c0", "Draft \uc5f4\uae30"],
    aiFallback: "AI \uc120\ud0dd\uc744 \uc4f8 \uc218 \uc5c6\uc5b4 \uac00\uc7a5 \uae34 \uc601\uc0c1\uc744 \uba54\uc778 \uc0f7\uc73c\ub85c \uc37c\uc2b5\ub2c8\ub2e4.",
    done: (n: number, s: string) => `\ucef7 ${n}\uac1c(${s}\ucd08)\ub85c Draft\ub97c \ub9cc\ub4e4\uc5c8\uc2b5\ub2c8\ub2e4.`,
    failed: "Draft\ub97c \ub9cc\ub4e4\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.",
  },
  ja: {
    title: "Thank You リキャップ",
    noProject: "このテンプレートを使うにはプロジェクトを開いてください。",
    loading: "プロジェクトのメディアを読み込み中…",
    videos: "動画",
    videosHint: "チェックした動画がこの順番でモンタージュを埋めます。",
    noVideos: "このプロジェクトにはまだ動画がありません。",
    hero: "メインショット",
    heroHint: (s: string) => `タイトルの下で${s}秒間表示されるため、それ以上の長さの動画が必要です。落ち着いたワイドショットが最適です。`,
    heroAuto: "AIに選ばせる",
    year: "年",
    create: "ドラフトを作成",
    creating: "作成中…",
    needVideos: "動画を3本以上選んでください。",
    needHero: (s: string) => `チェックした動画に${s}秒以上のものがないため、メインショットを入れられません。`,
    steps: ["メインショットを選ぶ", "モンタージュをカット", "音楽とタイトル", "ドラフトを開く"],
    aiFallback: "AI選択を使えなかったため、最も長い動画をメインショットにしました。",
    done: (n: number, s: string) => `${n}カット（${s}秒）のドラフトを作成しました。`,
    failed: "ドラフトを作成できませんでした。",
  },
  zh: {
    title: "Thank You 年度回顾",
    noProject: "请打开一个项目以使用此模板。",
    loading: "正在读取项目媒体…",
    videos: "视频",
    videosHint: "勾选的视频按此顺序填充蒙太奇。",
    noVideos: "此项目中还没有视频。",
    hero: "主镜头",
    heroHint: (s: string) => `在标题下停留 ${s} 秒，因此需要至少这么长的视频。安静的广角镜头效果最好。`,
    heroAuto: "让 AI 选择",
    year: "年份",
    create: "创建草稿",
    creating: "正在创建…",
    needVideos: "请至少选择三个视频。",
    needHero: (s: string) => `勾选的视频中没有 ${s} 秒或更长的视频，无法放入主镜头。`,
    steps: ["选择主镜头", "剪辑蒙太奇", "音乐和标题", "打开草稿"],
    aiFallback: "无法使用 AI 选择，已将最长的视频用作主镜头。",
    done: (n: number, s: string) => `已创建包含 ${n} 个剪辑（${s} 秒）的草稿。`,
    failed: "无法创建草稿。",
  },
  de: {
    title: "Thank You Rückblick",
    noProject: "Öffne ein Projekt, um diese Vorlage zu verwenden.",
    loading: "Projektmedien werden gelesen…",
    videos: "Videos",
    videosHint: "Ausgewählte Videos füllen die Montage in dieser Reihenfolge.",
    noVideos: "Dieses Projekt enthält noch keine Videos.",
    hero: "Hauptaufnahme",
    heroHint: (s: string) => `Sie steht ${s} s unter dem Titel und braucht daher ein mindestens so langes Video. Ruhige Totalen wirken am besten.`,
    heroAuto: "KI wählen lassen",
    year: "Jahr",
    create: "Entwurf erstellen",
    creating: "Wird erstellt…",
    needVideos: "Wähle mindestens drei Videos aus.",
    needHero: (s: string) => `Keines der ausgewählten Videos ist ${s} s oder länger, daher gibt es keine Hauptaufnahme.`,
    steps: ["Hauptaufnahme wählen", "Montage schneiden", "Musik und Titel", "Entwurf öffnen"],
    aiFallback: "KI-Auswahl nicht verfügbar; das längste Video wurde als Hauptaufnahme verwendet.",
    done: (n: number, s: string) => `Entwurf mit ${n} Schnitten (${s} s) erstellt.`,
    failed: "Der Entwurf konnte nicht erstellt werden.",
  },
  es: {
    title: "Resumen Thank You",
    noProject: "Abre un proyecto para usar esta plantilla.",
    loading: "Leyendo los medios del proyecto…",
    videos: "Vídeos",
    videosHint: "Los vídeos marcados llenan el montaje en este orden.",
    noVideos: "Este proyecto aún no tiene vídeos.",
    hero: "Plano principal",
    heroHint: (s: string) => `Se mantiene ${s} s bajo el título, así que necesita un vídeo al menos así de largo. Los planos generales tranquilos funcionan mejor.`,
    heroAuto: "Que elija la IA",
    year: "Año",
    create: "Crear borrador",
    creating: "Creando…",
    needVideos: "Elige al menos tres vídeos.",
    needHero: (s: string) => `Ninguno de los vídeos marcados dura ${s} s o más, así que no hay plano principal.`,
    steps: ["Elegir plano principal", "Cortar montaje", "Música y títulos", "Abrir borrador"],
    aiFallback: "La selección con IA no está disponible; se usó el vídeo más largo como plano principal.",
    done: (n: number, s: string) => `Borrador creado con ${n} cortes (${s} s).`,
    failed: "No se pudo crear el borrador.",
  },
  fr: {
    title: "Rétrospective Thank You",
    noProject: "Ouvrez un projet pour utiliser ce modèle.",
    loading: "Lecture des médias du projet…",
    videos: "Vidéos",
    videosHint: "Les vidéos cochées remplissent le montage dans cet ordre.",
    noVideos: "Ce projet ne contient pas encore de vidéos.",
    hero: "Plan principal",
    heroHint: (s: string) => `Il reste ${s} s sous le titre ; il faut donc une vidéo au moins aussi longue. Les plans larges et calmes fonctionnent le mieux.`,
    heroAuto: "Laisser l'IA choisir",
    year: "Année",
    create: "Créer un brouillon",
    creating: "Création…",
    needVideos: "Choisissez au moins trois vidéos.",
    needHero: (s: string) => `Aucune des vidéos cochées ne dure ${s} s ou plus : pas de plan principal possible.`,
    steps: ["Choisir le plan principal", "Couper le montage", "Musique et titres", "Ouvrir le brouillon"],
    aiFallback: "Sélection par IA indisponible ; la vidéo la plus longue sert de plan principal.",
    done: (n: number, s: string) => `Brouillon créé avec ${n} plans (${s} s).`,
    failed: "Impossible de créer le brouillon.",
  },
  it: {
    title: "Recap Thank You",
    noProject: "Apri un progetto per usare questo modello.",
    loading: "Lettura dei media del progetto…",
    videos: "Video",
    videosHint: "I video selezionati riempiono il montaggio in quest'ordine.",
    noVideos: "Questo progetto non ha ancora video.",
    hero: "Inquadratura principale",
    heroHint: (s: string) => `Resta ${s} s sotto il titolo, quindi serve un video almeno così lungo. Le inquadrature ampie e tranquille funzionano meglio.`,
    heroAuto: "Lascia scegliere all'IA",
    year: "Anno",
    create: "Crea bozza",
    creating: "Creazione…",
    needVideos: "Scegli almeno tre video.",
    needHero: (s: string) => `Nessuno dei video selezionati dura ${s} s o più, quindi manca l'inquadratura principale.`,
    steps: ["Scegli l'inquadratura principale", "Taglia il montaggio", "Musica e titoli", "Apri bozza"],
    aiFallback: "Selezione IA non disponibile; è stato usato il video più lungo come inquadratura principale.",
    done: (n: number, s: string) => `Bozza creata con ${n} tagli (${s} s).`,
    failed: "Impossibile creare la bozza.",
  },
  pt: {
    title: "Retrospectiva Thank You",
    noProject: "Abra um projeto para usar este modelo.",
    loading: "Lendo a mídia do projeto…",
    videos: "Vídeos",
    videosHint: "Os vídeos marcados preenchem a montagem nesta ordem.",
    noVideos: "Este projeto ainda não tem vídeos.",
    hero: "Plano principal",
    heroHint: (s: string) => `Fica ${s} s sob o título, então precisa de um vídeo pelo menos desse tamanho. Planos abertos e calmos funcionam melhor.`,
    heroAuto: "Deixar a IA escolher",
    year: "Ano",
    create: "Criar rascunho",
    creating: "Criando…",
    needVideos: "Escolha pelo menos três vídeos.",
    needHero: (s: string) => `Nenhum dos vídeos marcados tem ${s} s ou mais, então não há plano principal.`,
    steps: ["Escolher plano principal", "Cortar montagem", "Música e títulos", "Abrir rascunho"],
    aiFallback: "Seleção por IA indisponível; o vídeo mais longo foi usado como plano principal.",
    done: (n: number, s: string) => `Rascunho criado com ${n} cortes (${s} s).`,
    failed: "Não foi possível criar o rascunho.",
  },
  tr: {
    title: "Thank You Özeti",
    noProject: "Bu şablonu kullanmak için bir proje açın.",
    loading: "Proje medyası okunuyor…",
    videos: "Videolar",
    videosHint: "İşaretlenen videolar montajı bu sırayla doldurur.",
    noVideos: "Bu projede henüz video yok.",
    hero: "Ana çekim",
    heroHint: (s: string) => `Başlığın altında ${s} sn kalır, bu yüzden en az bu uzunlukta bir video gerekir. Sakin, geniş çekimler en iyi sonucu verir.`,
    heroAuto: "Yapay zekâ seçsin",
    year: "Yıl",
    create: "Taslak oluştur",
    creating: "Oluşturuluyor…",
    needVideos: "En az üç video seçin.",
    needHero: (s: string) => `İşaretlenen videoların hiçbiri ${s} sn veya daha uzun değil, bu yüzden ana çekim eklenemiyor.`,
    steps: ["Ana çekimi seç", "Montajı kes", "Müzik ve başlıklar", "Taslağı aç"],
    aiFallback: "Yapay zekâ seçimi kullanılamadı; en uzun video ana çekim olarak kullanıldı.",
    done: (n: number, s: string) => `${n} kesimli (${s} sn) bir taslak oluşturuldu.`,
    failed: "Taslak oluşturulamadı.",
  },
};

type Media = {
  id: string;
  name: string;
  type: string;
  seconds: number;
  path: string | null;
  width: number | null;
  height: number | null;
};

// Cut points (seconds) measured on the template music. The opening montage
// cuts on each of the 15 bass-roll hits; the hero shot holds through the
// murmur and the trumpet phrase; while the trumpet holds its last note the
// frame closes over a montage cut on the eighth-note pulse (0.222s), and it
// reopens on the first note of the solo piano after a short breath. Piano
// cuts fall on its notes (snapped to the pulse), then on quarter notes of the
// 134.5 BPM groove, with the salsa entry at 23.024.
const ROLL = [0, 0.15, 0.289, 0.444, 0.604, 0.748, 0.893, 1.053, 1.202, 1.397, 1.581, 1.791, 1.985, 2.2, 2.39];
const HERO = 2.584;
const HOLD = 8.55;
const CLOSING = [8.792, 9.014, 9.236, 9.458, 9.68, 9.902, 10.124, 10.346, 10.568, 10.79, 11.012, 11.234, 11.456, 11.678];
const PIANO_START = 11.9;
const PIANO = [12.347, 12.797, 13.017, 13.458, 13.905, 14.126, 14.344, 14.567];
const GROOVE = [14.89, 15.253, 15.697, 16.141, 16.585, 17.029, 17.473, 17.917, 18.361, 18.805, 19.249, 19.693, 20.137, 20.581, 21.025, 21.469, 21.913, 22.357, 23.024, 23.466, 23.908, 24.35, 24.792, 25.234];
const END = 25.883;
const STARTS = [...ROLL, HERO, HOLD, ...CLOSING, PIANO_START, ...PIANO, ...GROOVE];
// The year appears with the trumpet; BEAT is the groove's quarter note.
const YEAR_AT = 5.3;
const BEAT = 0.444;
const HERO_SECONDS = HOLD - HERO;
const FRAME = { width: 1920, height: 1080 };
const PLUGIN_ID = "thank-you-recap";
// Installed with the plugin beneath SELECTS_USER_SKILLS_ROOT/thank-you-recap/.
const MUSIC_FILE = "assets/music.mp3";

// Titles over the hero shot and the closing montage. Times are seconds from
// the graphic's first frame. The year cycles through six faces (embedded as
// digit-only subsets, so every machine renders the same) every eighth note,
// and every sixteenth once the frame starts closing; the bars close the frame
// to a line by closeEnd.
const TITLES_TSX = `
import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";

const stack = (family, fallback) => {
  const f = typeof family === "string" ? family.trim() : "";
  return f === "" ? fallback : '"' + f + '", ' + fallback;
};

export default function Graphic({ data }) {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const [handle] = useState(() => delayRender("Loading year faces"));
  useEffect(() => {
    Promise.all(
      (data.fonts || []).map((f) =>
        new FontFace(f.family, "url(" + f.src + ")").load().then((face) => document.fonts.add(face))
      )
    ).finally(() => continueRender(handle));
  }, []);
  const t = frame / fps;
  const faces = data.fonts || [];
  const showYear = t >= data.yearAt;
  const heroSteps = Math.floor((Math.min(t, data.closeAt) - data.yearAt) / data.heroSwitch);
  const closeSteps = t > data.closeAt ? Math.floor((t - data.closeAt) / data.closeSwitch) + 1 : 0;
  const face = faces.length ? faces[(heroSteps + closeSteps) % faces.length] : null;
  const p = Math.min(1, Math.max(0, (t - data.closeAt) / (data.closeEnd - data.closeAt)));
  const open = t < data.closeAt ? 1 : 1 - p * p;
  const bar = ((1 - open) * height) / 2;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: bar, background: "#000" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: bar, background: "#000" }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        {showYear && face && (
          <div
            style={{
              position: "absolute",
              color: data.yearColor,
              fontSize: height * 0.16 * face.scale,
              fontFamily: '"' + face.family + '", "Arial Black", sans-serif',
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            {data.year}
          </div>
        )}
        <div
          style={{
            position: "absolute",
            color: "#fff",
            fontSize: height * 0.028,
            letterSpacing: "0.12em",
            fontFamily: stack(data.captionFont, '"Times New Roman", Georgia, serif'),
            textShadow: "0 1px 4px rgba(0,0,0,0.5)",
          }}
        >
          {data.caption}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
`;
// Year faces, in the template's order: distressed, soft serif, chunky, hand,
// script, round. SIL OFL fonts (Rubik Dirt, Fraunces, Titan One, Caveat,
// Great Vibes, Fredoka); scale evens out their visual size.
const YEAR_FACE_SCALE = { RecapGrunge: 1, RecapSerif: 1, RecapChunky: 1, RecapHand: 1.35, RecapScript: 1.45, RecapRound: 1 };
const YEAR_FONTS_FILE = "assets/year-fonts.json";

const shq = (v: string) => `'${v.replace(/'/g, `'\\''`)}'`;

// One frame from the middle of each candidate, side by side, as a data URL.
async function contactSheet(sdk, videos: Media[]): Promise<string> {
  const inputs = videos.map((v) => `-ss ${(v.seconds / 2).toFixed(2)} -i ${shq(v.path!)}`);
  const cells = videos.map(
    (_, i) => `[${i}:v]scale=320:180:force_original_aspect_ratio=decrease,pad=320:180:(ow-iw)/2:(oh-ih)/2,trim=end_frame=1,setsar=1[c${i}]`
  );
  const graph =
    videos.length === 1
      ? `${cells[0].replace(/\[c0\]$/, "[out]")}`
      : `${cells.join(";")};${videos.map((_, i) => `[c${i}]`).join("")}hstack=${videos.length}[out]`;
  // Shell output is capped (48KB) and each call gets its own temp dir, so the
  // sheet goes to this plugin's data folder and is read back in chunks.
  const dataDir = `"$HOME/.selects/plugin-data/${PLUGIN_ID}"`;
  const file = `"$HOME/.selects/plugin-data/${PLUGIN_ID}/hero.jpg"`;
  const made = await sdk.runShell({
    summary: "Build hero candidates sheet",
    command: `mkdir -p ${dataDir} && ffmpeg -v error -y ${inputs.join(" ")} -filter_complex "${graph}" -map "[out]" -frames:v 1 -q:v 7 ${file} && base64 < ${file} | tr -d '\\n' | wc -c`,
    timeoutMs: 60000,
  });
  if (made.isError || made.exitCode !== 0) throw new Error(made.stderr || made.output);
  const total = Number(made.stdout.trim());
  const CHUNK = 45000;
  let b64 = "";
  for (let at = 0; at < total; at += CHUNK) {
    const part = await sdk.runShell({
      summary: "Read hero candidates sheet",
      command: `base64 < ${file} | tr -d '\\n' | cut -c ${at + 1}-${Math.min(at + CHUNK, total)}`,
      maxOutputBytes: 48 * 1024,
    });
    if (part.isError || part.exitCode !== 0) throw new Error(part.stderr || part.output);
    b64 += part.stdout.trim();
  }
  if (b64.length !== total) throw new Error(`hero sheet read ${b64.length}/${total}`);
  return `data:image/jpeg;base64,${b64}`;
}

async function aiHero(sdk, videos: Media[]): Promise<Media | null> {
  const image = await contactSheet(sdk, videos);
  const prompt = [
    `The image shows ${videos.length} frames side by side, left to right numbered from 0: ${videos.map((v) => v.name).join(", ")}.`,
    `For a year-recap video, one of them is held for about ${HERO_SECONDS.toFixed(1)} seconds under a "THANK YOU" title.`,
    `Pick the best hero shot: calm and cinematic, a wide or scenic view, ideally a person seen in the scene, sharp and well exposed, with room for a centered title.`,
    `Reply with JSON only, like {"hero":2}.`,
  ].join(" ");
  const answer = await sdk.askAI({ prompt, images: [{ dataUrl: image, name: "Hero candidates" }], timeoutMs: 120000 });
  const json = answer.text.match(/\{[\s\S]*\}/);
  if (!json) return null;
  const i = JSON.parse(json[0]).hero;
  return Number.isInteger(i) && videos[i] ? videos[i] : null;
}

// The project's videos: names, lengths, file paths and frame sizes.
function mediaScript(projectId: string) {
  return `const project = selects.project(${JSON.stringify(projectId)});
const files = {};
const walk = (nodes) => { for (const n of nodes ?? []) { if (n.resourceId) files[n.resourceId] = n; walk(n.children); } };
// Past 200 files sourceFiles() returns per-folder counts; read each folder then.
const tree = await project.sourceFiles();
if ("fileTree" in tree) walk(tree.fileTree);
else for (const f of tree.folders) { const sub = await project.sourceFiles({ folder: f.name }); if ("fileTree" in sub) walk(sub.fileTree); }
return (await project.resources())
  .filter(r => r.type === "Video")
  .map(r => ({ id: r.resourceId, name: r.name, type: r.type, seconds: r.durationSeconds ?? 0,
    path: files[r.resourceId]?.path ?? null,
    width: files[r.resourceId]?.frameSize?.width ?? null, height: files[r.resourceId]?.frameSize?.height ?? null }));`;
}

// Cuts the montage around `hero`, then adds the music and titles. Resolves the
// new Draft; throws with what went wrong. `onStep` follows `steps` 1 and 2.
async function buildRecap(
  sdk,
  { projectId, chosen, hero, year, name, onStep = (_: number) => {} }:
    { projectId: string; chosen: Media[]; hero: Media; year: string; name: string; onStep?: (step: number) => void }
) {
  // 2. Montage: every slot but the hero takes the next video in turn, and
  //    each reuse of a video moves to a later moment in it.
  onStep(1);
  const pool = chosen.filter((v) => v.id !== hero!.id).length >= 2 ? chosen.filter((v) => v.id !== hero!.id) : chosen;
  const heroIndex = ROLL.length;
  const uses = new Map<string, number>();
  const slots = STARTS.map((_, i) => {
    if (i === heroIndex) return { id: hero!.id, seconds: hero!.seconds, hero: true, use: 0, of: 1 };
    const k = i < heroIndex ? i : i - 1;
    const v = pool[k % pool.length];
    const use = uses.get(v.id) ?? 0;
    uses.set(v.id, use + 1);
    return { id: v.id, seconds: v.seconds, hero: false, use, of: 0 };
  });
  for (const s of slots) if (!s.hero) s.of = uses.get(s.id)!;
  const plan = { projectId, slots, starts: STARTS, end: END, frame: FRAME, name };
  const built = await sdk.runScript({
    summary: "Cut recap montage",
    allowCommit: true,
    script: `
const plan = ${JSON.stringify(plan)};
const project = selects.project(plan.projectId);
const draft = await project.createDraft({ name: plan.name });
const fps = (await draft.meta()).fps;
const edges = [...plan.starts, plan.end].map((s) => Math.round(s * fps));
for (let i = 0; i < plan.slots.length; i++) {
  const slot = plan.slots[i];
  const len = Math.max(1, edges[i + 1] - edges[i]) / fps;
  const room = Math.max(0, slot.seconds - len - 0.1);
  // The hero plays from the middle of its take; montage moments spread evenly.
  const start = slot.hero ? room / 2 : Math.min(room, 0.05 + ((slot.use + 0.5) / slot.of) * room);
  await draft.insertResource({ resourceId: slot.id, sourceRange: { startSeconds: start, endSeconds: start + len } });
}
// Set after the clips: the first insert would otherwise size the canvas to its source.
await draft.setFrameSize(plan.frame);
const saved = await draft.commitAll("Cut recap montage");
const main = await draft.clips({ trackScope: "main" });
return { draftId: saved.createdDraftId, cuts: main.length, endFrame: main.reduce((a, c) => Math.max(a, c.endFrame), 0), fps, edges };`,
  });
  const made = built.result as { draftId?: string; cuts: number; endFrame: number; fps: number; edges: number[] } | undefined;
  if (built.isError || !made?.draftId) throw new Error(built.output);

  // 3. Music and titles. The track ships in this plugin's asset folder and
  //    is imported into the Project once; importing is a Project edit, so
  //    it runs in its own call before the Draft edit.
  onStep(2);
  const root = await sdk.runShell({ summary: "Locate template music", command: 'printf %s "${SELECTS_USER_SKILLS_ROOT:-$HOME/.selects/skills}"' });
  if (root.isError || !root.stdout) throw new Error(root.stderr || root.output);
  // Import a copy named by its checksum, so a plugin update that changes the
  // music never reuses the older track already imported into a Project.
  const staged = await sdk.runShell({
    summary: "Stage template music",
    command: `src=${shq(`${root.stdout.trim()}/${PLUGIN_ID}/${MUSIC_FILE}`)}; dir="$HOME/.selects/plugin-data/${PLUGIN_ID}"; sum=$(cksum < "$src" | cut -d' ' -f1); dst="$dir/music-$sum.mp3"; mkdir -p "$dir" && { [ -f "$dst" ] || cp "$src" "$dst"; } && printf %s "$dst"`,
  });
  if (staged.isError || staged.exitCode !== 0 || !staged.stdout.trim()) throw new Error(staged.stderr || staged.output);
  const musicPath = staged.stdout.trim();
  // Shell output is capped at 48KB, so the faces file is read in slices.
  const facesFile = shq(`${root.stdout.trim()}/${PLUGIN_ID}/${YEAR_FONTS_FILE}`);
  const facesSize = await sdk.runShell({ summary: "Measure year faces", command: `wc -c < ${facesFile}` });
  if (facesSize.isError || facesSize.exitCode !== 0) throw new Error(facesSize.stderr || facesSize.output);
  const facesTotal = Number(facesSize.stdout.trim());
  let facesJson = "";
  for (let at = 0; at < facesTotal; at += 45000) {
    const part = await sdk.runShell({
      summary: "Read year faces",
      command: `tail -c +${at + 1} ${facesFile} | head -c 45000`,
      maxOutputBytes: 48 * 1024,
    });
    if (part.isError || part.exitCode !== 0) throw new Error(part.stderr || part.output);
    facesJson += part.stdout;
  }
  if (facesJson.length !== facesTotal) throw new Error(`year faces read ${facesJson.length}/${facesTotal}`);
  const yearFonts = JSON.parse(facesJson) as { family: string; src: string }[];
  const imported = await sdk.runScript({
    summary: "Add template music",
    allowCommit: true,
    script: `
const project = selects.project(${JSON.stringify(projectId)});
const musicPath = ${JSON.stringify(musicPath)};
const files = {};
const walk = (nodes) => { for (const n of nodes ?? []) { if (n.path) files[n.path] = n.resourceId; walk(n.children); } };
const tree = await project.sourceFiles();
if ("fileTree" in tree) walk(tree.fileTree);
const existing = files[musicPath];
if (existing) return existing;
const added = (await project.importFiles({ paths: [musicPath] })).addedResourceIds[0];
if (!added) throw new Error("Template music could not be imported: " + musicPath);
return added;`,
  });
  const musicId = imported.result as string | undefined;
  if (imported.isError || !musicId) throw new Error(imported.output);
  const heroFrame = made.edges[ROLL.length];
  const titlesEnd = made.edges[ROLL.length + 2 + CLOSING.length];
  const at = (s: number) => (Math.round(s * made.fps) - heroFrame) / made.fps;
  const titles = {
    caption: "THANK YOU",
    year: year.trim() || String(new Date().getFullYear()),
    yearColor: "#F7C600",
    captionFont: "",
    fonts: yearFonts.map((f) => ({ ...f, scale: YEAR_FACE_SCALE[f.family] ?? 1 })),
    yearAt: at(YEAR_AT),
    heroSwitch: BEAT / 2,
    closeSwitch: BEAT / 4,
    closeAt: at(HOLD),
    closeEnd: at(PIANO_START),
  };
  const editable = [
    { key: "caption", label: "Caption", type: "text", defaultValue: titles.caption },
    { key: "year", label: "Year", type: "text", defaultValue: titles.year },
    { key: "yearColor", label: "Year color", type: "color", defaultValue: titles.yearColor },
    { key: "captionFont", label: "Caption font", type: "text", defaultValue: "" },
  ];
  const finish = await sdk.runScript({
    summary: "Add recap music and titles",
    allowCommit: true,
    script: `
const draft = selects.draft(${JSON.stringify(made.draftId)});
const whole = await draft.rangeAtFrames(0, ${made.endFrame});
await draft.setAudioTracks({ target: whole, audioSourceIndexes: [] });
await draft.overlayResource({ resource: selects.project(${JSON.stringify(projectId)}).resource(${JSON.stringify(musicId)}), over: whole });
await draft.addMotionGraphic({
  label: "Thank you titles",
  tsxCode: ${JSON.stringify(TITLES_TSX)},
  parameters: ${JSON.stringify(titles)},
  editableParameters: ${JSON.stringify(editable)},
  within: await draft.rangeAtFrames(${heroFrame}, ${titlesEnd}),
});
await draft.commitAll("Add recap music and titles");
return true;`,
  });
  if (finish.isError) throw new Error(finish.output);
  return made;
}

const TEMPLATE_FAILED = "Thank You Recap couldn't make the timeline. Try again.";

// A Clip highlights run (`context.template`): the hero and clips picked in the
// app (no AI pick), this year, built out of sight and reported once.
function TemplateRun({ sdk, context }) {
  const runId = context.template?.runId;
  const [status, setStatus] = useState("Making your recap…");
  const started = useRef<string | null>(null), alive = useRef(true), latest = useRef(context);
  latest.current = context;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (!runId || started.current === runId) return;
    started.current = runId;
    const live = () => alive.current && latest.current.template?.runId === runId;
    let ended = false;
    const finish = (result) => { if (ended) return; ended = true; if (!live()) return; try { sdk.finishTemplate(result); } catch {} };
    (async () => {
      const t = STRINGS[context.language] ?? STRINGS.en;
      const template = context.template, projectId = context.projectId;
      if (!projectId) throw new Error("Open a project, then try again.");
      const heroPick = (template.inputs?.hero ?? []).find((x) => x?.resourceId);
      const clipPicks = (template.inputs?.clips ?? []).filter((x) => x?.resourceId && x.resourceId !== heroPick?.resourceId);
      if (!heroPick || clipPicks.length < 2) throw new Error("Pick a hero video and at least two other videos, then try again.");
      const r = await sdk.runScript({ summary: "Read project media", script: mediaScript(projectId) });
      if (r.isError || !Array.isArray(r.result)) throw new Error("Couldn't read this project's videos. Try again.");
      const byId = new Map((r.result as Media[]).map((v) => [v.id, v]));
      const hero = byId.get(heroPick.resourceId);
      if (!hero) throw new Error(`Couldn't find ${heroPick.name || "the hero video"} in this project. Try again.`);
      if (hero.seconds < HERO_SECONDS + 0.1) throw new Error(`Pick a hero video at least ${(HERO_SECONDS + 0.1).toFixed(1)} seconds long.`);
      const clips = clipPicks.map((x) => byId.get(x.resourceId));
      const missing = clipPicks.find((x, i) => !clips[i]);
      if (missing) throw new Error(`Couldn't find ${missing.name || "a picked video"} in this project. Try again.`);
      if (!live()) return;
      setStatus("Cutting your clips to the music…");
      const made = await buildRecap(sdk, {
        projectId, chosen: [hero, ...(clips as Media[])], hero, year: String(new Date().getFullYear()), name: t.title,
      });
      finish({ sequenceId: made.draftId });
    })().catch((e) => {
      console.warn("[thank-you-recap] template run failed:", e);
      const said = String(e?.message ?? "");
      finish({ error: said && said.length <= 160 && !/[\n{]/.test(said) ? said : TEMPLATE_FAILED });
    });
  }, [runId]);
  return <small>{status}</small>;
}

export default function Panel(props) {
  return props.context?.template ? <TemplateRun {...props} /> : <RecapPanel {...props} />;
}

function RecapPanel({ sdk, context, ui }) {
  const t = STRINGS[context.language] ?? STRINGS.en;
  const projectId: string | null = context.projectId;
  const [media, setMedia] = useState<Media[] | null>(null);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [heroChoice, setHeroChoice] = useState<string>("auto");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(-1);
  const [status, setStatus] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  // Keep polling quiet while a Draft is being built.
  const busyRef = useRef(false);
  busyRef.current = busy;

  useEffect(() => {
    setMedia(null);
    setStatus(null);
    if (!projectId) return;
    let live = true;
    let signature = "";
    let first = true;

    async function load() {
      const r = await sdk.runScript({
        summary: "Read project media",
        script: mediaScript(projectId),
      });
      if (!live) return;
      if (r.isError || !Array.isArray(r.result)) {
        setStatus({ tone: "error", text: r.output });
        setMedia((m) => m ?? []);
        return false;
      }
      setStatus(null);
      const videos = r.result as Media[];
      setMedia(videos);
      // Later loads keep the user's choices and check videos that were just added.
      setPicked((prev) => Object.fromEntries(videos.map((v) => [v.id, first || !(v.id in prev) ? true : prev[v.id]])));
      first = false;
      return true;
    }

    // Re-read everything only when the resource list changed, so videos added
    // or removed after the panel opened show up by themselves.
    async function check() {
      if (!live || busyRef.current || document.visibilityState !== "visible") return;
      try {
        const rows = await sdk.call("listProjectResources", projectId);
        const next = (rows ?? []).map((r) => `${r.resourceId}:${r.type}:${r.status}`).sort().join("|");
        if (next !== signature && (await load())) signature = next;
      } catch (e) {
        if (live && first) setStatus({ tone: "error", text: String(e) });
      }
    }

    check();
    const timer = setInterval(check, 3000);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      live = false;
      clearInterval(timer);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [projectId]);

  if (!projectId) return <ui.Message>{t.noProject}</ui.Message>;
  if (media == null) return <ui.Progress label={t.loading} />;

  const videos = media;
  const chosen = videos.filter((v) => picked[v.id]);
  // The hero is held uncut, so it needs a little more than the hold.
  const heroable = chosen.filter((v) => v.seconds >= HERO_SECONDS + 0.1);
  const heroSeconds = HERO_SECONDS.toFixed(1);

  async function create() {
    if (chosen.length < 3) {
      setStatus({ tone: "error", text: t.needVideos });
      return;
    }
    if (heroable.length === 0) {
      setStatus({ tone: "error", text: t.needHero(heroSeconds) });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      // 1. Hero shot: the user's pick, else the AI's, else the longest video.
      setStep(0);
      let hero = heroable.find((v) => v.id === heroChoice) ?? null;
      let aiNote = "";
      if (!hero) {
        try {
          hero = heroable.length === 1 ? heroable[0] : await aiHero(sdk, heroable);
          if (!hero) aiNote = `${t.aiFallback} (unreadable AI answer)`;
        } catch (e) {
          aiNote = `${t.aiFallback} (${String(e?.message ?? e).slice(0, 200)})`;
        }
        hero = hero ?? [...heroable].sort((a, b) => b.seconds - a.seconds)[0];
      }

      const made = await buildRecap(sdk, { projectId, chosen, hero, year, name: t.title, onStep: setStep });

      // 4. Bring the new Draft forward.
      setStep(3);
      await sdk.runScript({
        summary: "Open recap Draft",
        script: `return await selects.editor.openDraft(${JSON.stringify(made.draftId)});`,
      });
      setStatus({
        tone: "success",
        text: t.done(made.cuts, (made.endFrame / made.fps).toFixed(1)) + (aiNote ? ` ${aiNote}` : ""),
      });
    } catch (e) {
      setStatus({ tone: "error", text: `${t.failed} ${String(e)}` });
    } finally {
      setBusy(false);
      setStep(-1);
    }
  }

  const heroOptions = [
    { value: "auto", label: t.heroAuto },
    ...heroable.map((v) => ({ value: v.id, label: v.name })),
  ];

  return (
    <ui.Stack gap={16}>
      <ui.Section title={t.videos}>
        {videos.length === 0 ? (
          <ui.Message>{t.noVideos}</ui.Message>
        ) : (
          <ui.Stack gap={4}>
            <small>{t.videosHint}</small>
            {videos.map((v) => (
              <ui.Toggle
                key={v.id}
                label={v.name}
                value={!!picked[v.id]}
                disabled={busy}
                onChange={(on) => setPicked((p) => ({ ...p, [v.id]: on }))}
              />
            ))}
          </ui.Stack>
        )}
      </ui.Section>
      <ui.Section title={t.title}>
        <ui.Stack gap={8}>
          <ui.Select
            label={t.hero}
            value={heroOptions.some((o) => o.value === heroChoice) ? heroChoice : "auto"}
            options={heroOptions}
            disabled={busy}
            onChange={setHeroChoice}
          />
          <small>{t.heroHint(heroSeconds)}</small>
          <ui.TextField label={t.year} value={year} disabled={busy} onChange={setYear} />
        </ui.Stack>
      </ui.Section>
      {busy && <ui.Progress steps={t.steps} current={step} />}
      <ui.Actions>
        <ui.Button variant="primary" busy={busy} busyLabel={t.creating} disabled={videos.length === 0} onClick={create}>
          {t.create}
        </ui.Button>
      </ui.Actions>
      {status && <ui.Message tone={status.tone}>{status.text}</ui.Message>}
    </ui.Stack>
  );
}
