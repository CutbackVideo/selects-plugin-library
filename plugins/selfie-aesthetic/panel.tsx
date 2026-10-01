// @name Selfie Aesthetic Edit
// @collection visual-highlights
// @name:de Selfie Aesthetic Edit
// @name:en Selfie Aesthetic Edit
// @name:es Selfie Aesthetic Edit
// @name:fr Selfie Aesthetic Edit
// @name:it Selfie Aesthetic Edit
// @name:ja Selfie Aesthetic Edit
// @name:ko Selfie Aesthetic Edit
// @name:pt Selfie Aesthetic Edit
// @name:tr Selfie Aesthetic Edit
// @name:zh Selfie Aesthetic Edit
// @icon sparkles
// Builds a beat-synced 9:16 selfie edit (close-up stutter holds, whip cuts, a soft glow look) as a new, editable Draft.
// Host I/O goes only through the host block below (FileSystem + the host's bundled ffmpeg), the same on macOS and
// Windows: no shell, no node, nothing for the user to install.
import React from "react";

// Panel text in the 10 languages of plugin.json `localized`, read with t(). Korean is written as \u escapes.
// STRINGS:BEGIN
const STRINGS = {
  en: {
    openProject: "Open a Project to build a Selfie Aesthetic Edit.",
    needsNewerSelects: "This needs a newer version of Selects.",
    needsNewerSelectsMusic: "Your own music and the section preview need a newer version of Selects. The bundled tracks still work.",
    pluginMissing: "Selfie Aesthetic Edit could not find its files. Reinstall the plugin.",
    startFailed: "Selfie Aesthetic Edit could not start: {detail}",
    refresh: "Refresh",
    refreshing: "Refreshing",
    refreshFailed: "Could not refresh the clip list: {detail}",
    readFailed: "Could not read the clips in this Project: {detail}",
    checkingClipsNow: "Checking clips…",
    working: "Working",
    gap: " ",
    noFootage: "No analysed video or photos in this Project yet. Add video clips and analyse them, or add photos; this updates automatically.",
    turnOnPhotos: "Turn on Use photos to build from this Project's photos.",
    noClipsSelected: "No clips selected. Choose clips below.",
    ready: "Ready: {summary}",
    readyClips: { one: "{count} clip", other: "{count} clips" },
    readyCloseUps: { one: "{count} close-up clip", other: "{count} close-up clips" },
    readyPhotos: { one: "{count} photo", other: "{count} photos" },
    aboutSeconds: "about {seconds} s",
    analysing: { one: "{count} clip is being analysed. This updates automatically when it finishes.", other: "{count} clips are being analysed. This updates automatically when they finish." },
    notAnalysedAnalyse: { one: "{count} clip is not analysed yet. Analyse it in Selects to use it here.", other: "{count} clips are not analysed yet. Analyse them in Selects to use them here." },
    notAnalysedMaybe: { one: "{count} clip is not analysed yet. If Selects is analysing it, this updates automatically.", other: "{count} clips are not analysed yet. If Selects is analysing them, this updates automatically." },
    analysisFailed: { one: "{count} clip could not be analysed.", other: "{count} clips could not be analysed." },
    noteAnalysing: { one: "{count} clip being analysed", other: "{count} clips being analysed" },
    noteNotAnalysed: { one: "{count} clip not analysed yet", other: "{count} clips not analysed yet" },
    noteFailed: { one: "{count} clip could not be analysed", other: "{count} clips could not be analysed" },
    noteShort: { one: "{count} clip under 1.2 s skipped", other: "{count} clips under 1.2 s skipped" },
    clips: "Clips",
    "clips.auto": "Auto",
    "clips.choose": "Choose clips",
    chooseClipsCount: "Selected: {selected}/{total}",
    all: "All",
    none: "None",
    photo: "Photo",
    "shape.tall": "Tall",
    "shape.wide": "Wide",
    "shape.square": "Square",
    usePhotosOff: "Use photos is off",
    music: "Music",
    ownMusic: "Your own music",
    noMusic: "No music",
    byAuthor: "by {author}",
    chooseMusicFile: "Choose a music file.",
    musicFileRejected: "This file cannot be used as music. Choose an audio file.",
    listening: "Finding the beat…",
    beatFound: "Beat found: {bpm} BPM.",
    beatApprox: "Approximate beat: {bpm} BPM. The cuts follow it, but the beat is faint.",
    beatNone: "No steady beat found; cuts use a fixed length",
    musicUnreadable: "Could not read this music file ({detail}). Choose another file or one of the tracks.",
    musicTimeout: "Reading this music file took too long. Choose another file or one of the tracks.",
    sectionHint: "Music section — drag to choose",
    sectionLabel: "Music section",
    musicTooShort: "This music is too short for this length",
    startsAt: "Starts at {seconds} s",
    previewSection: "Preview this section",
    stopPreview: "Stop preview",
    cancelPreview: "Cancel preview",
    previewFailed: "Could not play a preview: {detail}.",
    previewTimeout: "The preview took too long to prepare. Try again.",
    look: "Look",
    "look.soft-glow": "Soft glow",
    "look.night-glam": "Night glam",
    "look.clean": "Clean",
    "look.none": "None",
    lookOn: "Look on",
    length: "Length",
    "length.short": "Short",
    "length.standard": "Standard",
    "length.long": "Long",
    barsFit: { one: "{fit} of {count} bar fits", other: "{fit} of {count} bars fit" },
    clipSound: "Clip sound",
    "sound.off": "Off",
    "sound.ambient": "Ambient",
    "sound.full": "Full",
    usePhotos: "Use photos",
    silentVideo: "Silent video: no music and Clip sound is Off.",
    build: "Build",
    building: "Building",
    anotherVersion: "Try other shots",
    finishLook: "Finish look",
    "step.check": "Checking clips",
    "step.search": "Finding close-ups",
    "step.plan": "Planning the edit",
    "step.assemble": "Building the Draft",
    "step.look": "Adding whip and look",
    progress: "Step {step}/{total} · {name} · {percent}%",
    progressDetail: "Step {step}/{total} · {name} ({detail}) · {percent}%",
    videosChecked: { one: "{done}/{count} video checked", other: "{done}/{count} videos checked" },
    videosSearched: { one: "{done}/{count} video searched", other: "{done}/{count} videos searched" },
    videosMeasured: { one: "{done}/{count} video measured", other: "{done}/{count} videos measured" },
    "detail.music": "adding the music",
    "detail.open": "opening the Draft",
    stoppedAt: "Stopped at step {step}/{total}, {name}: {detail}",
    stepFailed: "Selects could not complete this step.",
    noSources: "No usable clips or photos. Add clips or photos, or choose more clips.",
    musicTooShortBuild: "This music is too short for the edit. Choose a shorter Length, an earlier section or another track.",
    draftNoId: "The Draft \"{name}\" was saved, but Selects did not report its id, so the whip and look could not be added. Open it from the Drafts list, or build again.",
    finishFailed: "The Draft was created, but the whip and look could not be added: {detail}. Press Finish look to try again.",
    openFailed: "The Draft is ready, but it could not be opened: {detail}. Open it from the Drafts list.",
    draftCreatedAdding: "Draft created; adding whip and look…",
    resultLine: { one: "Created \"{name}\": {count} shot, about {seconds} s.", other: "Created \"{name}\": {count} shots, about {seconds} s." },
    draftCreated: "Select a clip to change its look, look strength, whip strength or framing in Adjust. Building again creates a new Draft and does not keep Adjust edits.",
    openDraft: "Open the new Draft",
    copyLink: "Copy the link to the new Draft",
    "note.fewFaces": { one: "Only {count} close-up clip found — the edit reuses it", other: "Only {count} close-up clips found — the edit reuses them" },
    "note.noFaces": "No close-up clips found, so the edit uses your other clips and photos",
    "note.shrunk": { one: "Your footage fits {fit} of {count} bar, so the edit is shorter. Add more clips or photos for the full length.", other: "Your footage fits {fit} of {count} bars, so the edit is shorter. Add more clips or photos for the full length." },
    "note.noMusic": "No music: cuts follow a steady 97 BPM rhythm",
    "note.pairReuse": "Very few clips: some moments repeat",
    "note.adjacent": "Very few clips: the same clip plays in neighbouring bars",
    "note.photosEarly": "Too few close-up clips: photos may also fill the second or last bar",
    unsearched: { one: "Could not search {count} video for close-ups; it was used as a regular clip. Build again to retry it.", other: "Could not search {count} videos for close-ups; they were used as regular clips. Build again to retry them." },
    note: "Note: {detail}.",
    "param.look": "Look",
    "param.lookStrength": "Look strength",
    "param.whip": "Whip strength",
    "param.framing": "Framing",
    "framing.tight": "Tight",
    "framing.full": "Full",
  },
  de: {
    openProject: "Öffne ein Projekt, um ein Selfie Aesthetic Edit zu erstellen.",
    needsNewerSelects: "Dafür wird eine neuere Version von Selects benötigt.",
    needsNewerSelectsMusic: "Eigene Musik und die Abschnittsvorschau erfordern eine neuere Version von Selects. Die mitgelieferten Musikstücke funktionieren weiterhin.",
    pluginMissing: "Selfie Aesthetic Edit hat seine Dateien nicht gefunden. Installiere das Plugin neu.",
    startFailed: "Selfie Aesthetic Edit konnte nicht gestartet werden: {detail}",
    refresh: "Aktualisieren",
    refreshing: "Wird aktualisiert",
    refreshFailed: "Die Clip-Liste konnte nicht aktualisiert werden: {detail}",
    readFailed: "Die Clips in diesem Projekt konnten nicht gelesen werden: {detail}",
    checkingClipsNow: "Clips werden geprüft…",
    working: "In Arbeit",
    gap: " ",
    noFootage: "Noch kein analysiertes Video und keine Fotos in diesem Projekt. Füge Videoclips hinzu und analysiere sie, oder füge Fotos hinzu; die Ansicht aktualisiert sich automatisch.",
    turnOnPhotos: "Aktiviere „Fotos verwenden“, um aus den Fotos dieses Projekts zu erstellen.",
    noClipsSelected: "Keine Clips ausgewählt. Wähle unten Clips aus.",
    ready: "Bereit: {summary}",
    readyClips: { one: "{count} Clip", other: "{count} Clips" },
    readyCloseUps: { one: "{count} Close-up-Clip", other: "{count} Close-up-Clips" },
    readyPhotos: { one: "{count} Foto", other: "{count} Fotos" },
    aboutSeconds: "ca. {seconds} s",
    analysing: { one: "{count} Clip wird analysiert. Die Ansicht aktualisiert sich automatisch, sobald er fertig ist.", other: "{count} Clips werden analysiert. Die Ansicht aktualisiert sich automatisch, sobald sie fertig sind." },
    notAnalysedAnalyse: { one: "{count} Clip ist noch nicht analysiert. Analysiere ihn in Selects, um ihn hier zu verwenden.", other: "{count} Clips sind noch nicht analysiert. Analysiere sie in Selects, um sie hier zu verwenden." },
    notAnalysedMaybe: { one: "{count} Clip ist noch nicht analysiert. Falls Selects ihn gerade analysiert, aktualisiert sich die Ansicht automatisch.", other: "{count} Clips sind noch nicht analysiert. Falls Selects sie gerade analysiert, aktualisiert sich die Ansicht automatisch." },
    analysisFailed: { one: "{count} Clip konnte nicht analysiert werden.", other: "{count} Clips konnten nicht analysiert werden." },
    noteAnalysing: { one: "{count} Clip wird analysiert", other: "{count} Clips werden analysiert" },
    noteNotAnalysed: { one: "{count} Clip noch nicht analysiert", other: "{count} Clips noch nicht analysiert" },
    noteFailed: { one: "{count} Clip konnte nicht analysiert werden", other: "{count} Clips konnten nicht analysiert werden" },
    noteShort: { one: "{count} Clip unter 1,2 s übersprungen", other: "{count} Clips unter 1,2 s übersprungen" },
    clips: "Clips",
    "clips.auto": "Auto",
    "clips.choose": "Clips auswählen",
    chooseClipsCount: "Ausgewählt: {selected}/{total}",
    all: "Alle",
    none: "Keine",
    photo: "Foto",
    "shape.tall": "Hochformat",
    "shape.wide": "Querformat",
    "shape.square": "Quadrat",
    usePhotosOff: "„Fotos verwenden“ ist aus",
    music: "Musik",
    ownMusic: "Eigene Musik",
    noMusic: "Keine Musik",
    byAuthor: "von {author}",
    chooseMusicFile: "Wähle eine Musikdatei aus.",
    musicFileRejected: "Diese Datei kann nicht als Musik verwendet werden. Wähle eine Audiodatei aus.",
    listening: "Beat wird gesucht…",
    beatFound: "Beat gefunden: {bpm} BPM.",
    beatApprox: "Ungefährer Beat: {bpm} BPM. Die Schnitte folgen ihm, aber der Beat ist schwach.",
    beatNone: "Kein gleichmäßiger Beat gefunden; die Schnitte haben eine feste Länge",
    musicUnreadable: "Diese Musikdatei konnte nicht gelesen werden ({detail}). Wähle eine andere Datei oder eines der Musikstücke.",
    musicTimeout: "Das Lesen dieser Musikdatei hat zu lange gedauert. Wähle eine andere Datei oder eines der Musikstücke.",
    sectionHint: "Musikabschnitt – zum Auswählen ziehen",
    sectionLabel: "Musikabschnitt",
    musicTooShort: "Diese Musik ist für diese Länge zu kurz",
    startsAt: "Beginnt bei {seconds} s",
    previewSection: "Diesen Abschnitt vorhören",
    stopPreview: "Vorschau stoppen",
    cancelPreview: "Vorschau abbrechen",
    previewFailed: "Die Vorschau konnte nicht abgespielt werden: {detail}.",
    previewTimeout: "Die Vorschau hat zu lange zur Vorbereitung gebraucht. Versuche es erneut.",
    look: "Look",
    "look.soft-glow": "Weiches Leuchten",
    "look.night-glam": "Night Glam",
    "look.clean": "Clean",
    "look.none": "Keiner",
    lookOn: "Look an",
    length: "Länge",
    "length.short": "Kurz",
    "length.standard": "Standard",
    "length.long": "Lang",
    barsFit: { one: "{fit} von {count} Takt passt", other: "{fit} von {count} Takten passen" },
    clipSound: "Clip-Ton",
    "sound.off": "Aus",
    "sound.ambient": "Leise",
    "sound.full": "Voll",
    usePhotos: "Fotos verwenden",
    silentVideo: "Stummes Video: keine Musik und Clip-Ton ist aus.",
    build: "Erstellen",
    building: "Wird erstellt",
    anotherVersion: "Andere Aufnahmen probieren",
    finishLook: "Look abschließen",
    "step.check": "Clips prüfen",
    "step.search": "Close-ups suchen",
    "step.plan": "Schnitt planen",
    "step.assemble": "Draft erstellen",
    "step.look": "Whip und Look hinzufügen",
    progress: "Schritt {step}/{total} · {name} · {percent} %",
    progressDetail: "Schritt {step}/{total} · {name} ({detail}) · {percent} %",
    videosChecked: { one: "{done}/{count} Video geprüft", other: "{done}/{count} Videos geprüft" },
    videosSearched: { one: "{done}/{count} Video durchsucht", other: "{done}/{count} Videos durchsucht" },
    videosMeasured: { one: "{done}/{count} Video gemessen", other: "{done}/{count} Videos gemessen" },
    "detail.music": "Musik wird hinzugefügt",
    "detail.open": "Draft wird geöffnet",
    stoppedAt: "Abgebrochen bei Schritt {step}/{total}, {name}: {detail}",
    stepFailed: "Selects konnte diesen Schritt nicht abschließen.",
    noSources: "Keine verwendbaren Clips oder Fotos. Füge Clips oder Fotos hinzu oder wähle mehr Clips aus.",
    musicTooShortBuild: "Diese Musik ist für den Schnitt zu kurz. Wähle eine kürzere Länge, einen früheren Abschnitt oder ein anderes Musikstück.",
    draftNoId: "Der Draft „{name}“ wurde gespeichert, aber Selects hat seine ID nicht gemeldet, daher konnten Whip und Look nicht hinzugefügt werden. Öffne ihn über die Draft-Liste oder erstelle erneut.",
    finishFailed: "Der Draft wurde erstellt, aber Whip und Look konnten nicht hinzugefügt werden: {detail}. Tippe auf „Look abschließen“, um es erneut zu versuchen.",
    openFailed: "Der Draft ist fertig, konnte aber nicht geöffnet werden: {detail}. Öffne ihn über die Draft-Liste.",
    draftCreatedAdding: "Draft erstellt; Whip und Look werden hinzugefügt…",
    resultLine: { one: "„{name}“ erstellt: {count} Einstellung, ca. {seconds} s.", other: "„{name}“ erstellt: {count} Einstellungen, ca. {seconds} s." },
    draftCreated: "Wähle einen Clip aus, um in „Anpassen“ seinen Look, die Look-Stärke, die Whip-Stärke oder den Bildausschnitt zu ändern. Erneutes Erstellen legt einen neuen Draft an und übernimmt keine Änderungen aus „Anpassen“.",
    openDraft: "Neuen Draft öffnen",
    copyLink: "Link zum neuen Draft kopieren",
    "note.fewFaces": { one: "Nur {count} Close-up-Clip gefunden – der Schnitt verwendet ihn mehrfach", other: "Nur {count} Close-up-Clips gefunden – der Schnitt verwendet sie mehrfach" },
    "note.noFaces": "Keine Close-up-Clips gefunden, daher verwendet der Schnitt deine anderen Clips und Fotos",
    "note.shrunk": { one: "Dein Material füllt {fit} von {count} Takt, daher ist der Schnitt kürzer. Füge mehr Clips oder Fotos für die volle Länge hinzu.", other: "Dein Material füllt {fit} von {count} Takten, daher ist der Schnitt kürzer. Füge mehr Clips oder Fotos für die volle Länge hinzu." },
    "note.noMusic": "Keine Musik: Die Schnitte folgen einem gleichmäßigen Rhythmus mit 97 BPM",
    "note.pairReuse": "Sehr wenige Clips: Manche Momente wiederholen sich",
    "note.adjacent": "Sehr wenige Clips: Derselbe Clip läuft in benachbarten Takten",
    "note.photosEarly": "Zu wenige Close-up-Clips: Fotos können auch den zweiten oder letzten Takt füllen",
    unsearched: { one: "{count} Video konnte nicht nach Close-ups durchsucht werden; es wurde als normaler Clip verwendet. Erstelle erneut, um es noch einmal zu versuchen.", other: "{count} Videos konnten nicht nach Close-ups durchsucht werden; sie wurden als normale Clips verwendet. Erstelle erneut, um es noch einmal zu versuchen." },
    note: "Hinweis: {detail}.",
    "param.look": "Look",
    "param.lookStrength": "Look-Stärke",
    "param.whip": "Whip-Stärke",
    "param.framing": "Bildausschnitt",
    "framing.tight": "Eng",
    "framing.full": "Voll",
  },
  es: {
    openProject: "Abre un proyecto para crear un Selfie Aesthetic Edit.",
    needsNewerSelects: "Esto requiere una versión más reciente de Selects.",
    needsNewerSelectsMusic: "Tu propia música y la vista previa de la sección requieren una versión más reciente de Selects. Las pistas incluidas siguen funcionando.",
    pluginMissing: "Selfie Aesthetic Edit no encontró sus archivos. Reinstala el plugin.",
    startFailed: "Selfie Aesthetic Edit no pudo iniciarse: {detail}",
    refresh: "Actualizar",
    refreshing: "Actualizando",
    refreshFailed: "No se pudo actualizar la lista de clips: {detail}",
    readFailed: "No se pudieron leer los clips de este proyecto: {detail}",
    checkingClipsNow: "Comprobando clips…",
    working: "Trabajando",
    gap: " ",
    noFootage: "Todavía no hay vídeo analizado ni fotos en este proyecto. Añade clips de vídeo y analízalos, o añade fotos; se actualiza automáticamente.",
    turnOnPhotos: "Activa Usar fotos para crear con las fotos de este proyecto.",
    noClipsSelected: "No hay clips seleccionados. Elige clips abajo.",
    ready: "Listo: {summary}",
    readyClips: { one: "{count} clip", many: "{count} de clips", other: "{count} clips" },
    readyCloseUps: { one: "{count} clip de primer plano", many: "{count} de clips de primer plano", other: "{count} clips de primer plano" },
    readyPhotos: { one: "{count} foto", many: "{count} de fotos", other: "{count} fotos" },
    aboutSeconds: "unos {seconds} s",
    analysing: { one: "Se está analizando {count} clip. Se actualiza automáticamente al terminar.", many: "Se están analizando {count} de clips. Se actualiza automáticamente al terminar.", other: "Se están analizando {count} clips. Se actualiza automáticamente al terminar." },
    notAnalysedAnalyse: { one: "{count} clip aún no está analizado. Analízalo en Selects para usarlo aquí.", many: "{count} de clips aún no están analizados. Analízalos en Selects para usarlos aquí.", other: "{count} clips aún no están analizados. Analízalos en Selects para usarlos aquí." },
    notAnalysedMaybe: { one: "{count} clip aún no está analizado. Si Selects lo está analizando, se actualiza automáticamente.", many: "{count} de clips aún no están analizados. Si Selects los está analizando, se actualiza automáticamente.", other: "{count} clips aún no están analizados. Si Selects los está analizando, se actualiza automáticamente." },
    analysisFailed: { one: "No se pudo analizar {count} clip.", many: "No se pudieron analizar {count} de clips.", other: "No se pudieron analizar {count} clips." },
    noteAnalysing: { one: "{count} clip en análisis", many: "{count} de clips en análisis", other: "{count} clips en análisis" },
    noteNotAnalysed: { one: "{count} clip sin analizar", many: "{count} de clips sin analizar", other: "{count} clips sin analizar" },
    noteFailed: { one: "No se pudo analizar {count} clip", many: "No se pudieron analizar {count} de clips", other: "No se pudieron analizar {count} clips" },
    noteShort: { one: "{count} clip de menos de 1,2 s omitido", many: "{count} de clips de menos de 1,2 s omitidos", other: "{count} clips de menos de 1,2 s omitidos" },
    clips: "Clips",
    "clips.auto": "Auto",
    "clips.choose": "Elegir clips",
    chooseClipsCount: "Seleccionados: {selected}/{total}",
    all: "Todos",
    none: "Ninguno",
    photo: "Foto",
    "shape.tall": "Vertical",
    "shape.wide": "Horizontal",
    "shape.square": "Cuadrado",
    usePhotosOff: "Usar fotos está desactivado",
    music: "Música",
    ownMusic: "Tu propia música",
    noMusic: "Sin música",
    byAuthor: "de {author}",
    chooseMusicFile: "Elige un archivo de música.",
    musicFileRejected: "Este archivo no se puede usar como música. Elige un archivo de audio.",
    listening: "Buscando el ritmo…",
    beatFound: "Ritmo encontrado: {bpm} BPM.",
    beatApprox: "Ritmo aproximado: {bpm} BPM. Los cortes lo siguen, pero el ritmo es débil.",
    beatNone: "No se encontró un ritmo estable; los cortes usan una duración fija",
    musicUnreadable: "No se pudo leer este archivo de música ({detail}). Elige otro archivo o una de las pistas.",
    musicTimeout: "Leer este archivo de música tardó demasiado. Elige otro archivo o una de las pistas.",
    sectionHint: "Sección de música: arrastra para elegir",
    sectionLabel: "Sección de música",
    musicTooShort: "Esta música es demasiado corta para esta duración",
    startsAt: "Empieza en {seconds} s",
    previewSection: "Escuchar esta sección",
    stopPreview: "Detener la vista previa",
    cancelPreview: "Cancelar la vista previa",
    previewFailed: "No se pudo reproducir la vista previa: {detail}.",
    previewTimeout: "La vista previa tardó demasiado en prepararse. Inténtalo de nuevo.",
    look: "Look",
    "look.soft-glow": "Brillo suave",
    "look.night-glam": "Glam nocturno",
    "look.clean": "Limpio",
    "look.none": "Ninguno",
    lookOn: "Look activado",
    length: "Duración",
    "length.short": "Corta",
    "length.standard": "Estándar",
    "length.long": "Larga",
    barsFit: { one: "Cabe {fit} de {count} compás", many: "Caben {fit} de {count} de compases", other: "Caben {fit} de {count} compases" },
    clipSound: "Sonido de los clips",
    "sound.off": "Apagado",
    "sound.ambient": "Ambiente",
    "sound.full": "Completo",
    usePhotos: "Usar fotos",
    silentVideo: "Vídeo sin sonido: sin música y con el sonido de los clips apagado.",
    build: "Crear",
    building: "Creando",
    anotherVersion: "Probar otros planos",
    finishLook: "Terminar look",
    "step.check": "Comprobando clips",
    "step.search": "Buscando primeros planos",
    "step.plan": "Planificando la edición",
    "step.assemble": "Creando el Draft",
    "step.look": "Añadiendo whip y look",
    progress: "Paso {step}/{total} · {name} · {percent} %",
    progressDetail: "Paso {step}/{total} · {name} ({detail}) · {percent} %",
    videosChecked: { one: "{done}/{count} vídeo comprobado", many: "{done}/{count} de vídeos comprobados", other: "{done}/{count} vídeos comprobados" },
    videosSearched: { one: "{done}/{count} vídeo explorado", many: "{done}/{count} de vídeos explorados", other: "{done}/{count} vídeos explorados" },
    videosMeasured: { one: "{done}/{count} vídeo medido", many: "{done}/{count} de vídeos medidos", other: "{done}/{count} vídeos medidos" },
    "detail.music": "añadiendo la música",
    "detail.open": "abriendo el Draft",
    stoppedAt: "Se detuvo en el paso {step}/{total}, {name}: {detail}",
    stepFailed: "Selects no pudo completar este paso.",
    noSources: "No hay clips ni fotos utilizables. Añade clips o fotos, o elige más clips.",
    musicTooShortBuild: "Esta música es demasiado corta para la edición. Elige una duración más corta, una sección anterior u otra pista.",
    draftNoId: "El Draft «{name}» se guardó, pero Selects no informó de su id, así que no se pudieron añadir el whip y el look. Ábrelo desde la lista de Drafts o vuelve a crear.",
    finishFailed: "Se creó el Draft, pero no se pudieron añadir el whip y el look: {detail}. Pulsa Terminar look para intentarlo de nuevo.",
    openFailed: "El Draft está listo, pero no se pudo abrir: {detail}. Ábrelo desde la lista de Drafts.",
    draftCreatedAdding: "Draft creado; añadiendo whip y look…",
    resultLine: { one: "Se creó «{name}»: {count} plano, unos {seconds} s.", many: "Se creó «{name}»: {count} de planos, unos {seconds} s.", other: "Se creó «{name}»: {count} planos, unos {seconds} s." },
    draftCreated: "Selecciona un clip para cambiar su look, la intensidad del look, la del whip o el encuadre en Ajustar. Volver a crear genera un nuevo Draft y no conserva los cambios de Ajustar.",
    openDraft: "Abrir el nuevo Draft",
    copyLink: "Copiar el enlace al nuevo Draft",
    "note.fewFaces": { one: "Solo se encontró {count} clip de primer plano: la edición lo reutiliza", many: "Solo se encontraron {count} de clips de primer plano: la edición los reutiliza", other: "Solo se encontraron {count} clips de primer plano: la edición los reutiliza" },
    "note.noFaces": "No se encontraron clips de primer plano, así que la edición usa tus otros clips y fotos",
    "note.shrunk": { one: "Tu material cubre {fit} de {count} compás, así que la edición es más corta. Añade más clips o fotos para la duración completa.", many: "Tu material cubre {fit} de {count} de compases, así que la edición es más corta. Añade más clips o fotos para la duración completa.", other: "Tu material cubre {fit} de {count} compases, así que la edición es más corta. Añade más clips o fotos para la duración completa." },
    "note.noMusic": "Sin música: los cortes siguen un ritmo estable de 97 BPM",
    "note.pairReuse": "Muy pocos clips: algunos momentos se repiten",
    "note.adjacent": "Muy pocos clips: el mismo clip suena en compases contiguos",
    "note.photosEarly": "Muy pocos clips de primer plano: las fotos también pueden ocupar el segundo o el último compás",
    unsearched: { one: "No se pudo buscar primeros planos en {count} vídeo; se usó como clip normal. Vuelve a crear para reintentarlo.", many: "No se pudo buscar primeros planos en {count} de vídeos; se usaron como clips normales. Vuelve a crear para reintentarlo.", other: "No se pudo buscar primeros planos en {count} vídeos; se usaron como clips normales. Vuelve a crear para reintentarlo." },
    note: "Nota: {detail}.",
    "param.look": "Look",
    "param.lookStrength": "Intensidad del look",
    "param.whip": "Intensidad del whip",
    "param.framing": "Encuadre",
    "framing.tight": "Cerrado",
    "framing.full": "Completo",
  },
  fr: {
    openProject: "Ouvrez un projet pour créer un Selfie Aesthetic Edit.",
    needsNewerSelects: "Cela nécessite une version plus récente de Selects.",
    needsNewerSelectsMusic: "Votre propre musique et l'aperçu de la section nécessitent une version plus récente de Selects. Les morceaux inclus fonctionnent toujours.",
    pluginMissing: "Selfie Aesthetic Edit n'a pas trouvé ses fichiers. Réinstallez le plugin.",
    startFailed: "Selfie Aesthetic Edit n'a pas pu démarrer : {detail}",
    refresh: "Actualiser",
    refreshing: "Actualisation",
    refreshFailed: "Impossible d'actualiser la liste des clips : {detail}",
    readFailed: "Impossible de lire les clips de ce projet : {detail}",
    checkingClipsNow: "Vérification des clips…",
    working: "En cours",
    gap: " ",
    noFootage: "Aucune vidéo analysée ni photo dans ce projet pour l'instant. Ajoutez des clips vidéo et analysez-les, ou ajoutez des photos ; la liste se met à jour automatiquement.",
    turnOnPhotos: "Activez Utiliser les photos pour créer à partir des photos de ce projet.",
    noClipsSelected: "Aucun clip sélectionné. Choisissez des clips ci-dessous.",
    ready: "Prêt : {summary}",
    readyClips: { one: "{count} clip", many: "{count} de clips", other: "{count} clips" },
    readyCloseUps: { one: "{count} clip en gros plan", many: "{count} de clips en gros plan", other: "{count} clips en gros plan" },
    readyPhotos: { one: "{count} photo", many: "{count} de photos", other: "{count} photos" },
    aboutSeconds: "environ {seconds} s",
    analysing: { one: "{count} clip est en cours d'analyse. La liste se met à jour automatiquement à la fin.", many: "{count} de clips sont en cours d'analyse. La liste se met à jour automatiquement à la fin.", other: "{count} clips sont en cours d'analyse. La liste se met à jour automatiquement à la fin." },
    notAnalysedAnalyse: { one: "{count} clip n'est pas encore analysé. Analysez-le dans Selects pour l'utiliser ici.", many: "{count} de clips ne sont pas encore analysés. Analysez-les dans Selects pour les utiliser ici.", other: "{count} clips ne sont pas encore analysés. Analysez-les dans Selects pour les utiliser ici." },
    notAnalysedMaybe: { one: "{count} clip n'est pas encore analysé. Si Selects l'analyse, la liste se met à jour automatiquement.", many: "{count} de clips ne sont pas encore analysés. Si Selects les analyse, la liste se met à jour automatiquement.", other: "{count} clips ne sont pas encore analysés. Si Selects les analyse, la liste se met à jour automatiquement." },
    analysisFailed: { one: "{count} clip n'a pas pu être analysé.", many: "{count} de clips n'ont pas pu être analysés.", other: "{count} clips n'ont pas pu être analysés." },
    noteAnalysing: { one: "{count} clip en cours d'analyse", many: "{count} de clips en cours d'analyse", other: "{count} clips en cours d'analyse" },
    noteNotAnalysed: { one: "{count} clip pas encore analysé", many: "{count} de clips pas encore analysés", other: "{count} clips pas encore analysés" },
    noteFailed: { one: "{count} clip n'a pas pu être analysé", many: "{count} de clips n'ont pas pu être analysés", other: "{count} clips n'ont pas pu être analysés" },
    noteShort: { one: "{count} clip de moins de 1,2 s ignoré", many: "{count} de clips de moins de 1,2 s ignorés", other: "{count} clips de moins de 1,2 s ignorés" },
    clips: "Clips",
    "clips.auto": "Auto",
    "clips.choose": "Choisir les clips",
    chooseClipsCount: "Sélection : {selected}/{total}",
    all: "Tous",
    none: "Aucun",
    photo: "Photo",
    "shape.tall": "Vertical",
    "shape.wide": "Horizontal",
    "shape.square": "Carré",
    usePhotosOff: "Utiliser les photos est désactivé",
    music: "Musique",
    ownMusic: "Votre propre musique",
    noMusic: "Sans musique",
    byAuthor: "par {author}",
    chooseMusicFile: "Choisissez un fichier de musique.",
    musicFileRejected: "Ce fichier ne peut pas servir de musique. Choisissez un fichier audio.",
    listening: "Recherche du rythme…",
    beatFound: "Rythme trouvé : {bpm} BPM.",
    beatApprox: "Rythme approximatif : {bpm} BPM. Les coupes le suivent, mais le rythme est faible.",
    beatNone: "Aucun rythme régulier trouvé ; les coupes ont une durée fixe",
    musicUnreadable: "Impossible de lire ce fichier de musique ({detail}). Choisissez un autre fichier ou l'un des morceaux.",
    musicTimeout: "La lecture de ce fichier de musique a pris trop de temps. Choisissez un autre fichier ou l'un des morceaux.",
    sectionHint: "Section musicale : faites glisser pour choisir",
    sectionLabel: "Section musicale",
    musicTooShort: "Cette musique est trop courte pour cette durée",
    startsAt: "Commence à {seconds} s",
    previewSection: "Écouter cette section",
    stopPreview: "Arrêter l'aperçu",
    cancelPreview: "Annuler l'aperçu",
    previewFailed: "Impossible de lire l'aperçu : {detail}.",
    previewTimeout: "La préparation de l'aperçu a pris trop de temps. Réessayez.",
    look: "Look",
    "look.soft-glow": "Éclat doux",
    "look.night-glam": "Glam de nuit",
    "look.clean": "Épuré",
    "look.none": "Aucun",
    lookOn: "Look activé",
    length: "Durée",
    "length.short": "Courte",
    "length.standard": "Standard",
    "length.long": "Longue",
    barsFit: { one: "{fit} sur {count} mesure tient", many: "{fit} sur {count} de mesures tiennent", other: "{fit} sur {count} mesures tiennent" },
    clipSound: "Son des clips",
    "sound.off": "Coupé",
    "sound.ambient": "Ambiance",
    "sound.full": "Plein",
    usePhotos: "Utiliser les photos",
    silentVideo: "Vidéo muette : pas de musique et le son des clips est coupé.",
    build: "Créer",
    building: "Création",
    anotherVersion: "Essayer d'autres plans",
    finishLook: "Finir le look",
    "step.check": "Vérification des clips",
    "step.search": "Recherche des gros plans",
    "step.plan": "Planification du montage",
    "step.assemble": "Création du Draft",
    "step.look": "Ajout du whip et du look",
    progress: "Étape {step}/{total} · {name} · {percent} %",
    progressDetail: "Étape {step}/{total} · {name} ({detail}) · {percent} %",
    videosChecked: { one: "{done}/{count} vidéo vérifiée", many: "{done}/{count} de vidéos vérifiées", other: "{done}/{count} vidéos vérifiées" },
    videosSearched: { one: "{done}/{count} vidéo analysée", many: "{done}/{count} de vidéos analysées", other: "{done}/{count} vidéos analysées" },
    videosMeasured: { one: "{done}/{count} vidéo mesurée", many: "{done}/{count} de vidéos mesurées", other: "{done}/{count} vidéos mesurées" },
    "detail.music": "ajout de la musique",
    "detail.open": "ouverture du Draft",
    stoppedAt: "Arrêt à l'étape {step}/{total}, {name} : {detail}",
    stepFailed: "Selects n'a pas pu terminer cette étape.",
    noSources: "Aucun clip ni photo utilisable. Ajoutez des clips ou des photos, ou choisissez plus de clips.",
    musicTooShortBuild: "Cette musique est trop courte pour le montage. Choisissez une durée plus courte, une section plus tôt ou un autre morceau.",
    draftNoId: "Le Draft « {name} » a été enregistré, mais Selects n'a pas indiqué son identifiant ; le whip et le look n'ont donc pas pu être ajoutés. Ouvrez-le depuis la liste des Drafts ou créez à nouveau.",
    finishFailed: "Le Draft a été créé, mais le whip et le look n'ont pas pu être ajoutés : {detail}. Appuyez sur Finir le look pour réessayer.",
    openFailed: "Le Draft est prêt, mais il n'a pas pu être ouvert : {detail}. Ouvrez-le depuis la liste des Drafts.",
    draftCreatedAdding: "Draft créé ; ajout du whip et du look…",
    resultLine: { one: "« {name} » créé : {count} plan, environ {seconds} s.", many: "« {name} » créé : {count} de plans, environ {seconds} s.", other: "« {name} » créé : {count} plans, environ {seconds} s." },
    draftCreated: "Sélectionnez un clip pour modifier son look, l'intensité du look, celle du whip ou le cadrage dans Ajuster. Créer à nouveau génère un nouveau Draft et ne conserve pas les modifications d'Ajuster.",
    openDraft: "Ouvrir le nouveau Draft",
    copyLink: "Copier le lien vers le nouveau Draft",
    "note.fewFaces": { one: "Seulement {count} clip en gros plan trouvé : le montage le réutilise", many: "Seulement {count} de clips en gros plan trouvés : le montage les réutilise", other: "Seulement {count} clips en gros plan trouvés : le montage les réutilise" },
    "note.noFaces": "Aucun clip en gros plan trouvé : le montage utilise vos autres clips et photos",
    "note.shrunk": { one: "Vos images couvrent {fit} sur {count} mesure, donc le montage est plus court. Ajoutez des clips ou des photos pour la durée complète.", many: "Vos images couvrent {fit} sur {count} de mesures, donc le montage est plus court. Ajoutez des clips ou des photos pour la durée complète.", other: "Vos images couvrent {fit} sur {count} mesures, donc le montage est plus court. Ajoutez des clips ou des photos pour la durée complète." },
    "note.noMusic": "Sans musique : les coupes suivent un rythme régulier de 97 BPM",
    "note.pairReuse": "Très peu de clips : certains moments se répètent",
    "note.adjacent": "Très peu de clips : le même clip passe dans des mesures voisines",
    "note.photosEarly": "Trop peu de clips en gros plan : des photos peuvent aussi remplir la deuxième ou la dernière mesure",
    unsearched: { one: "Impossible de chercher des gros plans dans {count} vidéo ; elle a servi de clip ordinaire. Créez à nouveau pour réessayer.", many: "Impossible de chercher des gros plans dans {count} de vidéos ; elles ont servi de clips ordinaires. Créez à nouveau pour réessayer.", other: "Impossible de chercher des gros plans dans {count} vidéos ; elles ont servi de clips ordinaires. Créez à nouveau pour réessayer." },
    note: "Remarque : {detail}.",
    "param.look": "Look",
    "param.lookStrength": "Intensité du look",
    "param.whip": "Intensité du whip",
    "param.framing": "Cadrage",
    "framing.tight": "Serré",
    "framing.full": "Complet",
  },
  it: {
    openProject: "Apri un progetto per creare un Selfie Aesthetic Edit.",
    needsNewerSelects: "Serve una versione più recente di Selects.",
    needsNewerSelectsMusic: "La tua musica e l'anteprima della sezione richiedono una versione più recente di Selects. I brani inclusi funzionano comunque.",
    pluginMissing: "Selfie Aesthetic Edit non ha trovato i suoi file. Reinstalla il plugin.",
    startFailed: "Selfie Aesthetic Edit non è riuscito ad avviarsi: {detail}",
    refresh: "Aggiorna",
    refreshing: "Aggiornamento",
    refreshFailed: "Impossibile aggiornare l'elenco delle clip: {detail}",
    readFailed: "Impossibile leggere le clip di questo progetto: {detail}",
    checkingClipsNow: "Controllo delle clip…",
    working: "In corso",
    gap: " ",
    noFootage: "Nessun video analizzato né foto in questo progetto per ora. Aggiungi clip video e analizzale, oppure aggiungi foto; si aggiorna automaticamente.",
    turnOnPhotos: "Attiva Usa foto per creare dalle foto di questo progetto.",
    noClipsSelected: "Nessuna clip selezionata. Scegli le clip qui sotto.",
    ready: "Pronto: {summary}",
    readyClips: { one: "{count} clip", many: "{count} di clip", other: "{count} clip" },
    readyCloseUps: { one: "{count} clip in primo piano", many: "{count} di clip in primo piano", other: "{count} clip in primo piano" },
    readyPhotos: { one: "{count} foto", many: "{count} di foto", other: "{count} foto" },
    aboutSeconds: "circa {seconds} s",
    analysing: { one: "{count} clip è in analisi. Si aggiorna automaticamente al termine.", many: "{count} di clip sono in analisi. Si aggiorna automaticamente al termine.", other: "{count} clip sono in analisi. Si aggiorna automaticamente al termine." },
    notAnalysedAnalyse: { one: "{count} clip non è ancora analizzata. Analizzala in Selects per usarla qui.", many: "{count} di clip non sono ancora analizzate. Analizzale in Selects per usarle qui.", other: "{count} clip non sono ancora analizzate. Analizzale in Selects per usarle qui." },
    notAnalysedMaybe: { one: "{count} clip non è ancora analizzata. Se Selects la sta analizzando, si aggiorna automaticamente.", many: "{count} di clip non sono ancora analizzate. Se Selects le sta analizzando, si aggiorna automaticamente.", other: "{count} clip non sono ancora analizzate. Se Selects le sta analizzando, si aggiorna automaticamente." },
    analysisFailed: { one: "{count} clip non è stata analizzata.", many: "{count} di clip non sono state analizzate.", other: "{count} clip non sono state analizzate." },
    noteAnalysing: { one: "{count} clip in analisi", many: "{count} di clip in analisi", other: "{count} clip in analisi" },
    noteNotAnalysed: { one: "{count} clip non ancora analizzata", many: "{count} di clip non ancora analizzate", other: "{count} clip non ancora analizzate" },
    noteFailed: { one: "{count} clip non è stata analizzata", many: "{count} di clip non sono state analizzate", other: "{count} clip non sono state analizzate" },
    noteShort: { one: "{count} clip sotto 1,2 s saltata", many: "{count} di clip sotto 1,2 s saltate", other: "{count} clip sotto 1,2 s saltate" },
    clips: "Clip",
    "clips.auto": "Auto",
    "clips.choose": "Scegli le clip",
    chooseClipsCount: "Selezionate: {selected}/{total}",
    all: "Tutte",
    none: "Nessuna",
    photo: "Foto",
    "shape.tall": "Verticale",
    "shape.wide": "Orizzontale",
    "shape.square": "Quadrato",
    usePhotosOff: "Usa foto è disattivato",
    music: "Musica",
    ownMusic: "La tua musica",
    noMusic: "Nessuna musica",
    byAuthor: "di {author}",
    chooseMusicFile: "Scegli un file musicale.",
    musicFileRejected: "Questo file non può essere usato come musica. Scegli un file audio.",
    listening: "Ricerca del ritmo…",
    beatFound: "Ritmo trovato: {bpm} BPM.",
    beatApprox: "Ritmo approssimativo: {bpm} BPM. I tagli lo seguono, ma il ritmo è debole.",
    beatNone: "Nessun ritmo regolare trovato; i tagli hanno una durata fissa",
    musicUnreadable: "Impossibile leggere questo file musicale ({detail}). Scegli un altro file o uno dei brani.",
    musicTimeout: "La lettura di questo file musicale ha richiesto troppo tempo. Scegli un altro file o uno dei brani.",
    sectionHint: "Sezione musicale: trascina per scegliere",
    sectionLabel: "Sezione musicale",
    musicTooShort: "Questa musica è troppo breve per questa durata",
    startsAt: "Inizia a {seconds} s",
    previewSection: "Ascolta questa sezione",
    stopPreview: "Ferma l'anteprima",
    cancelPreview: "Annulla l'anteprima",
    previewFailed: "Impossibile riprodurre l'anteprima: {detail}.",
    previewTimeout: "La preparazione dell'anteprima ha richiesto troppo tempo. Riprova.",
    look: "Look",
    "look.soft-glow": "Luce soffusa",
    "look.night-glam": "Glam notturno",
    "look.clean": "Pulito",
    "look.none": "Nessuno",
    lookOn: "Look attivo",
    length: "Durata",
    "length.short": "Breve",
    "length.standard": "Standard",
    "length.long": "Lunga",
    barsFit: { one: "{fit} di {count} battuta ci sta", many: "{fit} di {count} di battute ci stanno", other: "{fit} di {count} battute ci stanno" },
    clipSound: "Audio delle clip",
    "sound.off": "Spento",
    "sound.ambient": "Ambiente",
    "sound.full": "Pieno",
    usePhotos: "Usa foto",
    silentVideo: "Video muto: nessuna musica e l'audio delle clip è spento.",
    build: "Crea",
    building: "Creazione",
    anotherVersion: "Prova altre inquadrature",
    finishLook: "Completa il look",
    "step.check": "Controllo delle clip",
    "step.search": "Ricerca dei primi piani",
    "step.plan": "Pianificazione del montaggio",
    "step.assemble": "Creazione del Draft",
    "step.look": "Aggiunta di whip e look",
    progress: "Passaggio {step}/{total} · {name} · {percent}%",
    progressDetail: "Passaggio {step}/{total} · {name} ({detail}) · {percent}%",
    videosChecked: { one: "{done}/{count} video controllato", many: "{done}/{count} di video controllati", other: "{done}/{count} video controllati" },
    videosSearched: { one: "{done}/{count} video esaminato", many: "{done}/{count} di video esaminati", other: "{done}/{count} video esaminati" },
    videosMeasured: { one: "{done}/{count} video misurato", many: "{done}/{count} di video misurati", other: "{done}/{count} video misurati" },
    "detail.music": "aggiunta della musica",
    "detail.open": "apertura del Draft",
    stoppedAt: "Interrotto al passaggio {step}/{total}, {name}: {detail}",
    stepFailed: "Selects non è riuscito a completare questo passaggio.",
    noSources: "Nessuna clip o foto utilizzabile. Aggiungi clip o foto, oppure scegli più clip.",
    musicTooShortBuild: "Questa musica è troppo breve per il montaggio. Scegli una durata più breve, una sezione precedente o un altro brano.",
    draftNoId: "Il Draft «{name}» è stato salvato, ma Selects non ne ha comunicato l'id, quindi whip e look non sono stati aggiunti. Aprilo dall'elenco dei Draft oppure crea di nuovo.",
    finishFailed: "Il Draft è stato creato, ma non è stato possibile aggiungere whip e look: {detail}. Premi Completa il look per riprovare.",
    openFailed: "Il Draft è pronto, ma non è stato possibile aprirlo: {detail}. Aprilo dall'elenco dei Draft.",
    draftCreatedAdding: "Draft creato; aggiunta di whip e look…",
    resultLine: { one: "Creato «{name}»: {count} inquadratura, circa {seconds} s.", many: "Creato «{name}»: {count} di inquadrature, circa {seconds} s.", other: "Creato «{name}»: {count} inquadrature, circa {seconds} s." },
    draftCreated: "Seleziona una clip per cambiarne il look, l'intensità del look, quella del whip o l'inquadratura in Regola. Creare di nuovo genera un nuovo Draft e non conserva le modifiche di Regola.",
    openDraft: "Apri il nuovo Draft",
    copyLink: "Copia il link al nuovo Draft",
    "note.fewFaces": { one: "Trovata solo {count} clip in primo piano: il montaggio la riutilizza", many: "Trovate solo {count} di clip in primo piano: il montaggio le riutilizza", other: "Trovate solo {count} clip in primo piano: il montaggio le riutilizza" },
    "note.noFaces": "Nessuna clip in primo piano trovata, quindi il montaggio usa le tue altre clip e foto",
    "note.shrunk": { one: "Il tuo materiale copre {fit} di {count} battuta, quindi il montaggio è più breve. Aggiungi clip o foto per la durata completa.", many: "Il tuo materiale copre {fit} di {count} di battute, quindi il montaggio è più breve. Aggiungi clip o foto per la durata completa.", other: "Il tuo materiale copre {fit} di {count} battute, quindi il montaggio è più breve. Aggiungi clip o foto per la durata completa." },
    "note.noMusic": "Nessuna musica: i tagli seguono un ritmo regolare di 97 BPM",
    "note.pairReuse": "Pochissime clip: alcuni momenti si ripetono",
    "note.adjacent": "Pochissime clip: la stessa clip compare in battute vicine",
    "note.photosEarly": "Troppo poche clip in primo piano: le foto possono riempire anche la seconda o l'ultima battuta",
    unsearched: { one: "Impossibile cercare primi piani in {count} video; è stato usato come clip normale. Crea di nuovo per riprovare.", many: "Impossibile cercare primi piani in {count} di video; sono stati usati come clip normali. Crea di nuovo per riprovare.", other: "Impossibile cercare primi piani in {count} video; sono stati usati come clip normali. Crea di nuovo per riprovare." },
    note: "Nota: {detail}.",
    "param.look": "Look",
    "param.lookStrength": "Intensità del look",
    "param.whip": "Intensità del whip",
    "param.framing": "Inquadratura",
    "framing.tight": "Stretta",
    "framing.full": "Intera",
  },
  ja: {
    openProject: "Selfie Aesthetic Edit を作成するには、プロジェクトを開いてください。",
    needsNewerSelects: "この機能には、より新しいバージョンの Selects が必要です。",
    needsNewerSelectsMusic: "自分の音楽と区間のプレビューには、より新しいバージョンの Selects が必要です。付属のトラックは引き続き使えます。",
    pluginMissing: "Selfie Aesthetic Edit のファイルが見つかりません。プラグインを再インストールしてください。",
    startFailed: "Selfie Aesthetic Edit を起動できませんでした: {detail}",
    refresh: "更新",
    refreshing: "更新中",
    refreshFailed: "クリップの一覧を更新できませんでした: {detail}",
    readFailed: "このプロジェクトのクリップを読み込めませんでした: {detail}",
    checkingClipsNow: "クリップを確認中…",
    working: "処理中",
    gap: " ",
    noFootage: "このプロジェクトには、解析済みの動画も写真もまだありません。動画クリップを追加して解析するか、写真を追加してください。自動で更新されます。",
    turnOnPhotos: "このプロジェクトの写真から作成するには、「写真を使う」をオンにしてください。",
    noClipsSelected: "クリップが選択されていません。下から選んでください。",
    ready: "準備完了: {summary}",
    readyClips: { other: "クリップ {count} 本" },
    readyCloseUps: { other: "クローズアップのクリップ {count} 本" },
    readyPhotos: { other: "写真 {count} 枚" },
    aboutSeconds: "約 {seconds} 秒",
    analysing: { other: "クリップ {count} 本を解析中です。完了すると自動で更新されます。" },
    notAnalysedAnalyse: { other: "クリップ {count} 本がまだ解析されていません。ここで使うには Selects で解析してください。" },
    notAnalysedMaybe: { other: "クリップ {count} 本がまだ解析されていません。Selects が解析中の場合は、自動で更新されます。" },
    analysisFailed: { other: "クリップ {count} 本を解析できませんでした。" },
    noteAnalysing: { other: "クリップ {count} 本を解析中" },
    noteNotAnalysed: { other: "クリップ {count} 本が未解析" },
    noteFailed: { other: "クリップ {count} 本を解析できませんでした" },
    noteShort: { other: "1.2 秒未満のクリップ {count} 本をスキップ" },
    clips: "クリップ",
    "clips.auto": "自動",
    "clips.choose": "クリップを選択",
    chooseClipsCount: "選択中: {selected}/{total}",
    all: "すべて",
    none: "なし",
    photo: "写真",
    "shape.tall": "縦長",
    "shape.wide": "横長",
    "shape.square": "正方形",
    usePhotosOff: "「写真を使う」はオフです",
    music: "音楽",
    ownMusic: "自分の音楽",
    noMusic: "音楽なし",
    byAuthor: "{author}",
    chooseMusicFile: "音楽ファイルを選んでください。",
    musicFileRejected: "このファイルは音楽として使えません。音声ファイルを選んでください。",
    listening: "ビートを検出中…",
    beatFound: "ビートを検出しました: {bpm} BPM。",
    beatApprox: "おおよそのビート: {bpm} BPM。カットはこれに合わせますが、ビートは弱めです。",
    beatNone: "安定したビートが見つからなかったため、カットは固定の長さになります",
    musicUnreadable: "この音楽ファイルを読み込めませんでした（{detail}）。別のファイルか、用意されたトラックを選んでください。",
    musicTimeout: "この音楽ファイルの読み込みに時間がかかりすぎました。別のファイルか、用意されたトラックを選んでください。",
    sectionHint: "音楽の区間 — ドラッグして選択",
    sectionLabel: "音楽の区間",
    musicTooShort: "この音楽はこの長さには短すぎます",
    startsAt: "{seconds} 秒から開始",
    previewSection: "この区間をプレビュー",
    stopPreview: "プレビューを停止",
    cancelPreview: "プレビューをキャンセル",
    previewFailed: "プレビューを再生できませんでした: {detail}。",
    previewTimeout: "プレビューの準備に時間がかかりすぎました。もう一度お試しください。",
    look: "ルック",
    "look.soft-glow": "ソフトグロウ",
    "look.night-glam": "ナイトグラム",
    "look.clean": "クリーン",
    "look.none": "なし",
    lookOn: "ルックをオン",
    length: "長さ",
    "length.short": "短め",
    "length.standard": "標準",
    "length.long": "長め",
    barsFit: { other: "{count} 小節中 {fit} 小節が収まります" },
    clipSound: "クリップの音",
    "sound.off": "オフ",
    "sound.ambient": "環境音",
    "sound.full": "フル",
    usePhotos: "写真を使う",
    silentVideo: "無音の動画: 音楽なし、クリップの音もオフです。",
    build: "作成",
    building: "作成中",
    anotherVersion: "別のショットで作成",
    finishLook: "ルックを仕上げる",
    "step.check": "クリップを確認",
    "step.search": "クローズアップを検索",
    "step.plan": "編集を計画",
    "step.assemble": "Draft を作成",
    "step.look": "Whip とルックを追加",
    progress: "ステップ {step}/{total} · {name} · {percent}%",
    progressDetail: "ステップ {step}/{total} · {name}（{detail}）· {percent}%",
    videosChecked: { other: "動画 {done}/{count} 本を確認" },
    videosSearched: { other: "動画 {done}/{count} 本を検索" },
    videosMeasured: { other: "動画 {done}/{count} 本を測定" },
    "detail.music": "音楽を追加中",
    "detail.open": "Draft を開いています",
    stoppedAt: "ステップ {step}/{total}（{name}）で停止しました: {detail}",
    stepFailed: "Selects はこのステップを完了できませんでした。",
    noSources: "使えるクリップや写真がありません。クリップか写真を追加するか、クリップをもっと選んでください。",
    musicTooShortBuild: "この音楽は編集には短すぎます。長さを短くするか、前の区間や別のトラックを選んでください。",
    draftNoId: "Draft「{name}」は保存されましたが、Selects から ID が返らなかったため、Whip とルックを追加できませんでした。Draft の一覧から開くか、もう一度作成してください。",
    finishFailed: "Draft は作成されましたが、Whip とルックを追加できませんでした: {detail}。「ルックを仕上げる」を押してやり直してください。",
    openFailed: "Draft の準備はできましたが、開けませんでした: {detail}。Draft の一覧から開いてください。",
    draftCreatedAdding: "Draft を作成しました。Whip とルックを追加中…",
    resultLine: { other: "「{name}」を作成しました: ショット {count} 個、約 {seconds} 秒。" },
    draftCreated: "クリップを選ぶと、調整でルック、ルックの強さ、Whip の強さ、フレーミングを変更できます。もう一度作成すると新しい Draft ができ、調整での編集は引き継がれません。",
    openDraft: "新しい Draft を開く",
    copyLink: "新しい Draft へのリンクをコピー",
    "note.fewFaces": { other: "クローズアップのクリップが {count} 本しか見つからなかったため、編集で繰り返し使います" },
    "note.noFaces": "クローズアップのクリップが見つからなかったため、ほかのクリップや写真を使います",
    "note.shrunk": { other: "素材が {count} 小節中 {fit} 小節分しかないため、編集が短くなります。フルの長さにするには、クリップや写真を追加してください。" },
    "note.noMusic": "音楽なし: カットは 97 BPM の一定のリズムに合わせます",
    "note.pairReuse": "クリップが非常に少ないため、一部の場面が繰り返されます",
    "note.adjacent": "クリップが非常に少ないため、同じクリップが隣り合う小節で再生されます",
    "note.photosEarly": "クローズアップのクリップが少ないため、2 小節目や最後の小節にも写真が入ることがあります",
    unsearched: { other: "動画 {count} 本でクローズアップを検索できなかったため、通常のクリップとして使いました。もう一度作成すると再試行します。" },
    note: "メモ: {detail}。",
    "param.look": "ルック",
    "param.lookStrength": "ルックの強さ",
    "param.whip": "Whip の強さ",
    "param.framing": "フレーミング",
    "framing.tight": "タイト",
    "framing.full": "フル",
  },
  ko: {
    openProject: "Selfie Aesthetic Edit\uc744 \ub9cc\ub4e4\ub824\uba74 \ud504\ub85c\uc81d\ud2b8\ub97c \uc5ec\uc138\uc694.",
    needsNewerSelects: "\ub354 \ucd5c\uc2e0 \ubc84\uc804\uc758 Selects\uac00 \ud544\uc694\ud569\ub2c8\ub2e4.",
    needsNewerSelectsMusic: "\ub0b4 \uc74c\uc545\uacfc \uad6c\uac04 \ubbf8\ub9ac\ub4e3\uae30\ub294 \ub354 \ucd5c\uc2e0 \ubc84\uc804\uc758 Selects\uac00 \ud544\uc694\ud569\ub2c8\ub2e4. \uae30\ubcf8 \uc81c\uacf5 \ud2b8\ub799\uc740 \uacc4\uc18d \uc0ac\uc6a9\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.",
    pluginMissing: "Selfie Aesthetic Edit\uc758 \ud30c\uc77c\uc744 \ucc3e\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. \ud50c\ub7ec\uadf8\uc778\uc744 \ub2e4\uc2dc \uc124\uce58\ud558\uc138\uc694.",
    startFailed: "Selfie Aesthetic Edit\uc744 \uc2dc\uc791\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}",
    refresh: "\uc0c8\ub85c\uace0\uce68",
    refreshing: "\uc0c8\ub85c\uace0\uce68 \uc911",
    refreshFailed: "\ud074\ub9bd \ubaa9\ub85d\uc744 \uc0c8\ub85c\uace0\uce68\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}",
    readFailed: "\uc774 \ud504\ub85c\uc81d\ud2b8\uc758 \ud074\ub9bd\uc744 \uc77d\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}",
    checkingClipsNow: "\ud074\ub9bd \ud655\uc778 \uc911…",
    working: "\uc791\uc5c5 \uc911",
    gap: " ",
    noFootage: "\uc774 \ud504\ub85c\uc81d\ud2b8\uc5d0\ub294 \ubd84\uc11d\ub41c \uc601\uc0c1\uc774\ub098 \uc0ac\uc9c4\uc774 \uc544\uc9c1 \uc5c6\uc2b5\ub2c8\ub2e4. \uc601\uc0c1 \ud074\ub9bd\uc744 \ucd94\uac00\ud574 \ubd84\uc11d\ud558\uac70\ub098 \uc0ac\uc9c4\uc744 \ucd94\uac00\ud558\uc138\uc694. \uc790\ub3d9\uc73c\ub85c \uc5c5\ub370\uc774\ud2b8\ub429\ub2c8\ub2e4.",
    turnOnPhotos: "\uc774 \ud504\ub85c\uc81d\ud2b8\uc758 \uc0ac\uc9c4\uc73c\ub85c \ub9cc\ub4e4\ub824\uba74 ‘\uc0ac\uc9c4 \uc0ac\uc6a9’\uc744 \ucf1c\uc138\uc694.",
    noClipsSelected: "\uc120\ud0dd\ud55c \ud074\ub9bd\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. \uc544\ub798\uc5d0\uc11c \ud074\ub9bd\uc744 \uc120\ud0dd\ud558\uc138\uc694.",
    ready: "\uc900\ube44 \uc644\ub8cc: {summary}",
    readyClips: { other: "\ud074\ub9bd {count}\uac1c" },
    readyCloseUps: { other: "\ud074\ub85c\uc988\uc5c5 \ud074\ub9bd {count}\uac1c" },
    readyPhotos: { other: "\uc0ac\uc9c4 {count}\uc7a5" },
    aboutSeconds: "\uc57d {seconds}\ucd08",
    analysing: { other: "\ud074\ub9bd {count}\uac1c\ub97c \ubd84\uc11d\ud558\uace0 \uc788\uc2b5\ub2c8\ub2e4. \ub05d\ub098\uba74 \uc790\ub3d9\uc73c\ub85c \uc5c5\ub370\uc774\ud2b8\ub429\ub2c8\ub2e4." },
    notAnalysedAnalyse: { other: "\ud074\ub9bd {count}\uac1c\uac00 \uc544\uc9c1 \ubd84\uc11d\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4. \uc5ec\uae30\uc11c \uc4f0\ub824\uba74 Selects\uc5d0\uc11c \ubd84\uc11d\ud558\uc138\uc694." },
    notAnalysedMaybe: { other: "\ud074\ub9bd {count}\uac1c\uac00 \uc544\uc9c1 \ubd84\uc11d\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4. Selects\uac00 \ubd84\uc11d \uc911\uc774\ub77c\uba74 \uc790\ub3d9\uc73c\ub85c \uc5c5\ub370\uc774\ud2b8\ub429\ub2c8\ub2e4." },
    analysisFailed: { other: "\ud074\ub9bd {count}\uac1c\ub97c \ubd84\uc11d\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4." },
    noteAnalysing: { other: "\ud074\ub9bd {count}\uac1c \ubd84\uc11d \uc911" },
    noteNotAnalysed: { other: "\ud074\ub9bd {count}\uac1c \uc544\uc9c1 \ubd84\uc11d \uc548 \ub428" },
    noteFailed: { other: "\ud074\ub9bd {count}\uac1c \ubd84\uc11d \uc2e4\ud328" },
    noteShort: { other: "1.2\ucd08 \ubbf8\ub9cc \ud074\ub9bd {count}\uac1c \uac74\ub108\ub700" },
    clips: "\ud074\ub9bd",
    "clips.auto": "\uc790\ub3d9",
    "clips.choose": "\ud074\ub9bd \uc120\ud0dd",
    chooseClipsCount: "\uc120\ud0dd\ub428: {selected}/{total}",
    all: "\uc804\uccb4",
    none: "\uc5c6\uc74c",
    photo: "\uc0ac\uc9c4",
    "shape.tall": "\uc138\ub85c",
    "shape.wide": "\uac00\ub85c",
    "shape.square": "\uc815\uc0ac\uac01\ud615",
    usePhotosOff: "‘\uc0ac\uc9c4 \uc0ac\uc6a9’\uc774 \uaebc\uc838 \uc788\uc74c",
    music: "\uc74c\uc545",
    ownMusic: "\ub0b4 \uc74c\uc545",
    noMusic: "\uc74c\uc545 \uc5c6\uc74c",
    byAuthor: "{author}",
    chooseMusicFile: "\uc74c\uc545 \ud30c\uc77c\uc744 \uc120\ud0dd\ud558\uc138\uc694.",
    musicFileRejected: "\uc774 \ud30c\uc77c\uc740 \uc74c\uc545\uc73c\ub85c \uc4f8 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4. \uc624\ub514\uc624 \ud30c\uc77c\uc744 \uc120\ud0dd\ud558\uc138\uc694.",
    listening: "\ube44\ud2b8 \ucc3e\ub294 \uc911…",
    beatFound: "\ube44\ud2b8\ub97c \ucc3e\uc558\uc2b5\ub2c8\ub2e4: {bpm} BPM.",
    beatApprox: "\ub300\ub7b5\uc801\uc778 \ube44\ud2b8: {bpm} BPM. \ucef7\uc774 \uc774 \ube44\ud2b8\ub97c \ub530\ub974\uc9c0\ub9cc \ube44\ud2b8\uac00 \uc57d\ud569\ub2c8\ub2e4.",
    beatNone: "\uc77c\uc815\ud55c \ube44\ud2b8\ub97c \ucc3e\uc9c0 \ubabb\ud574 \ucef7\uc744 \uace0\uc815 \uae38\uc774\ub85c \ub9cc\ub4ed\ub2c8\ub2e4",
    musicUnreadable: "\uc774 \uc74c\uc545 \ud30c\uc77c\uc744 \uc77d\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4({detail}). \ub2e4\ub978 \ud30c\uc77c\uc774\ub098 \uc81c\uacf5\ub41c \ud2b8\ub799\uc744 \uc120\ud0dd\ud558\uc138\uc694.",
    musicTimeout: "\uc774 \uc74c\uc545 \ud30c\uc77c\uc744 \uc77d\ub294 \ub370 \ub108\ubb34 \uc624\ub798 \uac78\ub838\uc2b5\ub2c8\ub2e4. \ub2e4\ub978 \ud30c\uc77c\uc774\ub098 \uc81c\uacf5\ub41c \ud2b8\ub799\uc744 \uc120\ud0dd\ud558\uc138\uc694.",
    sectionHint: "\uc74c\uc545 \uad6c\uac04 — \ub4dc\ub798\uadf8\ud574\uc11c \uc120\ud0dd",
    sectionLabel: "\uc74c\uc545 \uad6c\uac04",
    musicTooShort: "\uc774 \uc74c\uc545\uc740 \uc774 \uae38\uc774\uc5d0 \ube44\ud574 \ub108\ubb34 \uc9e7\uc2b5\ub2c8\ub2e4",
    startsAt: "{seconds}\ucd08\ubd80\ud130 \uc2dc\uc791",
    previewSection: "\uc774 \uad6c\uac04 \ubbf8\ub9ac\ub4e3\uae30",
    stopPreview: "\ubbf8\ub9ac\ub4e3\uae30 \uc911\uc9c0",
    cancelPreview: "\ubbf8\ub9ac\ub4e3\uae30 \ucde8\uc18c",
    previewFailed: "\ubbf8\ub9ac\ub4e3\uae30\ub97c \uc7ac\uc0dd\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}.",
    previewTimeout: "\ubbf8\ub9ac\ub4e3\uae30\ub97c \uc900\ube44\ud558\ub294 \ub370 \ub108\ubb34 \uc624\ub798 \uac78\ub838\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \uc2dc\ub3c4\ud558\uc138\uc694.",
    look: "\uc0c9\uac10",
    "look.soft-glow": "\uc18c\ud504\ud2b8 \uae00\ub85c\uc6b0",
    "look.night-glam": "\ub098\uc774\ud2b8 \uae00\ub7a8",
    "look.clean": "\ud074\ub9b0",
    "look.none": "\uc5c6\uc74c",
    lookOn: "\uc0c9\uac10 \ucf1c\uc9d0",
    length: "\uae38\uc774",
    "length.short": "\uc9e7\uac8c",
    "length.standard": "\ubcf4\ud1b5",
    "length.long": "\uae38\uac8c",
    barsFit: { other: "{count}\ub9c8\ub514 \uc911 {fit}\ub9c8\ub514\uac00 \ub4e4\uc5b4\uac11\ub2c8\ub2e4" },
    clipSound: "\ud074\ub9bd \uc18c\ub9ac",
    "sound.off": "\ub054",
    "sound.ambient": "\ubc30\uacbd\uc74c",
    "sound.full": "\uc6d0\uc74c",
    usePhotos: "\uc0ac\uc9c4 \uc0ac\uc6a9",
    silentVideo: "\ubb34\uc74c \uc601\uc0c1: \uc74c\uc545\uc774 \uc5c6\uace0 \ud074\ub9bd \uc18c\ub9ac\ub3c4 \uaebc\uc838 \uc788\uc2b5\ub2c8\ub2e4.",
    build: "\ub9cc\ub4e4\uae30",
    building: "\ub9cc\ub4dc\ub294 \uc911",
    anotherVersion: "\ub2e4\ub978 \uc0f7\uc73c\ub85c \ub9cc\ub4e4\uae30",
    finishLook: "\uc0c9\uac10 \ub9c8\ubb34\ub9ac",
    "step.check": "\ud074\ub9bd \ud655\uc778",
    "step.search": "\ud074\ub85c\uc988\uc5c5 \ucc3e\uae30",
    "step.plan": "\ud3b8\uc9d1 \uacc4\ud68d",
    "step.assemble": "Draft \ub9cc\ub4e4\uae30",
    "step.look": "Whip\uacfc \uc0c9\uac10 \ucd94\uac00",
    progress: "{step}/{total}\ub2e8\uacc4 · {name} · {percent}%",
    progressDetail: "{step}/{total}\ub2e8\uacc4 · {name}({detail}) · {percent}%",
    videosChecked: { other: "\uc601\uc0c1 {done}/{count}\uac1c \ud655\uc778" },
    videosSearched: { other: "\uc601\uc0c1 {done}/{count}\uac1c \uac80\uc0c9" },
    videosMeasured: { other: "\uc601\uc0c1 {done}/{count}\uac1c \uce21\uc815" },
    "detail.music": "\uc74c\uc545 \ucd94\uac00 \uc911",
    "detail.open": "Draft \uc5ec\ub294 \uc911",
    stoppedAt: "{step}/{total}\ub2e8\uacc4({name})\uc5d0\uc11c \uc911\ub2e8\ub418\uc5c8\uc2b5\ub2c8\ub2e4: {detail}",
    stepFailed: "Selects\uac00 \uc774 \ub2e8\uacc4\ub97c \uc644\ub8cc\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.",
    noSources: "\uc4f8 \uc218 \uc788\ub294 \ud074\ub9bd\uc774\ub098 \uc0ac\uc9c4\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. \ud074\ub9bd\uc774\ub098 \uc0ac\uc9c4\uc744 \ucd94\uac00\ud558\uac70\ub098 \ud074\ub9bd\uc744 \ub354 \uc120\ud0dd\ud558\uc138\uc694.",
    musicTooShortBuild: "\uc774 \uc74c\uc545\uc740 \ud3b8\uc9d1\uc5d0 \ube44\ud574 \ub108\ubb34 \uc9e7\uc2b5\ub2c8\ub2e4. \ub354 \uc9e7\uc740 \uae38\uc774, \uc55e\ucabd \uad6c\uac04 \ub610\ub294 \ub2e4\ub978 \ud2b8\ub799\uc744 \uc120\ud0dd\ud558\uc138\uc694.",
    draftNoId: "Draft ‘{name}’\uc774(\uac00) \uc800\uc7a5\ub418\uc5c8\uc9c0\ub9cc Selects\uac00 ID\ub97c \uc54c\ub824\uc8fc\uc9c0 \uc54a\uc544 Whip\uacfc \uc0c9\uac10\uc744 \ucd94\uac00\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. Draft \ubaa9\ub85d\uc5d0\uc11c \uc5f4\uac70\ub098 \ub2e4\uc2dc \ub9cc\ub4dc\uc138\uc694.",
    finishFailed: "Draft\ub294 \ub9cc\ub4e4\uc5b4\uc84c\uc9c0\ub9cc Whip\uacfc \uc0c9\uac10\uc744 \ucd94\uac00\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}. ‘\uc0c9\uac10 \ub9c8\ubb34\ub9ac’\ub97c \ub20c\ub7ec \ub2e4\uc2dc \uc2dc\ub3c4\ud558\uc138\uc694.",
    openFailed: "Draft\ub294 \uc900\ube44\ub418\uc5c8\uc9c0\ub9cc \uc5f4\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}. Draft \ubaa9\ub85d\uc5d0\uc11c \uc5ec\uc138\uc694.",
    draftCreatedAdding: "Draft\ub97c \ub9cc\ub4e4\uc5c8\uc2b5\ub2c8\ub2e4. Whip\uacfc \uc0c9\uac10\uc744 \ucd94\uac00\ud558\ub294 \uc911…",
    resultLine: { other: "‘{name}’\uc744(\ub97c) \ub9cc\ub4e4\uc5c8\uc2b5\ub2c8\ub2e4: \uc0f7 {count}\uac1c, \uc57d {seconds}\ucd08." },
    draftCreated: "\ud074\ub9bd\uc744 \uc120\ud0dd\ud558\uba74 \uc870\uc815\uc5d0\uc11c \uc0c9\uac10, \uc0c9\uac10 \uac15\ub3c4, Whip \uac15\ub3c4, \uad6c\ub3c4\ub97c \ubc14\uafc0 \uc218 \uc788\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \ub9cc\ub4e4\uba74 \uc0c8 Draft\uac00 \uc0dd\uae30\uba70 \uc870\uc815\uc5d0\uc11c \ubc14\uafbc \ub0b4\uc6a9\uc740 \uc720\uc9c0\ub418\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.",
    openDraft: "\uc0c8 Draft \uc5f4\uae30",
    copyLink: "\uc0c8 Draft \ub9c1\ud06c \ubcf5\uc0ac",
    "note.fewFaces": { other: "\ud074\ub85c\uc988\uc5c5 \ud074\ub9bd\uc774 {count}\uac1c\ubfd0\uc774\ub77c \ud3b8\uc9d1\uc5d0\uc11c \ubc18\ubcf5\ud574\uc11c \uc501\ub2c8\ub2e4" },
    "note.noFaces": "\ud074\ub85c\uc988\uc5c5 \ud074\ub9bd\uc744 \ucc3e\uc9c0 \ubabb\ud574 \ub2e4\ub978 \ud074\ub9bd\uacfc \uc0ac\uc9c4\uc73c\ub85c \ud3b8\uc9d1\ud569\ub2c8\ub2e4",
    "note.shrunk": { other: "\uc601\uc0c1\uc774 {count}\ub9c8\ub514 \uc911 {fit}\ub9c8\ub514\ub9cc \ucc44\uc6cc\uc11c \ud3b8\uc9d1\uc774 \ub354 \uc9e7\uc544\uc9d1\ub2c8\ub2e4. \uc804\uccb4 \uae38\uc774\ub85c \ub9cc\ub4e4\ub824\uba74 \ud074\ub9bd\uc774\ub098 \uc0ac\uc9c4\uc744 \ub354 \ucd94\uac00\ud558\uc138\uc694." },
    "note.noMusic": "\uc74c\uc545 \uc5c6\uc74c: \ucef7\uc774 97 BPM\uc758 \uc77c\uc815\ud55c \ub9ac\ub4ec\uc744 \ub530\ub985\ub2c8\ub2e4",
    "note.pairReuse": "\ud074\ub9bd\uc774 \ub9e4\uc6b0 \uc801\uc5b4 \uc77c\ubd80 \uc7a5\uba74\uc774 \ubc18\ubcf5\ub429\ub2c8\ub2e4",
    "note.adjacent": "\ud074\ub9bd\uc774 \ub9e4\uc6b0 \uc801\uc5b4 \uac19\uc740 \ud074\ub9bd\uc774 \uc774\uc6c3\ud55c \ub9c8\ub514\uc5d0\uc11c \uc7ac\uc0dd\ub429\ub2c8\ub2e4",
    "note.photosEarly": "\ud074\ub85c\uc988\uc5c5 \ud074\ub9bd\uc774 \uc801\uc5b4 \ub450 \ubc88\uc9f8 \ub9c8\ub514\ub098 \ub9c8\uc9c0\ub9c9 \ub9c8\ub514\uc5d0\ub3c4 \uc0ac\uc9c4\uc774 \ub4e4\uc5b4\uac08 \uc218 \uc788\uc2b5\ub2c8\ub2e4",
    unsearched: { other: "\uc601\uc0c1 {count}\uac1c\uc5d0\uc11c \ud074\ub85c\uc988\uc5c5\uc744 \ucc3e\uc9c0 \ubabb\ud574 \uc77c\ubc18 \ud074\ub9bd\uc73c\ub85c \uc37c\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \ub9cc\ub4e4\uba74 \uc7ac\uc2dc\ub3c4\ud569\ub2c8\ub2e4." },
    note: "\ucc38\uace0: {detail}.",
    "param.look": "\uc0c9\uac10",
    "param.lookStrength": "\uc0c9\uac10 \uac15\ub3c4",
    "param.whip": "Whip \uac15\ub3c4",
    "param.framing": "\uad6c\ub3c4",
    "framing.tight": "\uac00\uae5d\uac8c",
    "framing.full": "\uc804\uccb4",
  },
  pt: {
    openProject: "Abra um projeto para criar um Selfie Aesthetic Edit.",
    needsNewerSelects: "Isso requer uma versão mais recente do Selects.",
    needsNewerSelectsMusic: "Sua própria música e a prévia da seção exigem uma versão mais recente do Selects. As faixas incluídas continuam funcionando.",
    pluginMissing: "O Selfie Aesthetic Edit não encontrou seus arquivos. Reinstale o plugin.",
    startFailed: "O Selfie Aesthetic Edit não pôde iniciar: {detail}",
    refresh: "Atualizar",
    refreshing: "Atualizando",
    refreshFailed: "Não foi possível atualizar a lista de clipes: {detail}",
    readFailed: "Não foi possível ler os clipes deste projeto: {detail}",
    checkingClipsNow: "Verificando clipes…",
    working: "Trabalhando",
    gap: " ",
    noFootage: "Ainda não há vídeo analisado nem fotos neste projeto. Adicione clipes de vídeo e analise-os, ou adicione fotos; isso é atualizado automaticamente.",
    turnOnPhotos: "Ative Usar fotos para criar a partir das fotos deste projeto.",
    noClipsSelected: "Nenhum clipe selecionado. Escolha clipes abaixo.",
    ready: "Pronto: {summary}",
    readyClips: { one: "{count} clipe", many: "{count} de clipes", other: "{count} clipes" },
    readyCloseUps: { one: "{count} clipe em close", many: "{count} de clipes em close", other: "{count} clipes em close" },
    readyPhotos: { one: "{count} foto", many: "{count} de fotos", other: "{count} fotos" },
    aboutSeconds: "cerca de {seconds} s",
    analysing: { one: "{count} clipe está sendo analisado. Isso é atualizado automaticamente ao terminar.", many: "{count} de clipes estão sendo analisados. Isso é atualizado automaticamente ao terminar.", other: "{count} clipes estão sendo analisados. Isso é atualizado automaticamente ao terminar." },
    notAnalysedAnalyse: { one: "{count} clipe ainda não foi analisado. Analise-o no Selects para usá-lo aqui.", many: "{count} de clipes ainda não foram analisados. Analise-os no Selects para usá-los aqui.", other: "{count} clipes ainda não foram analisados. Analise-os no Selects para usá-los aqui." },
    notAnalysedMaybe: { one: "{count} clipe ainda não foi analisado. Se o Selects estiver analisando, isso é atualizado automaticamente.", many: "{count} de clipes ainda não foram analisados. Se o Selects estiver analisando, isso é atualizado automaticamente.", other: "{count} clipes ainda não foram analisados. Se o Selects estiver analisando, isso é atualizado automaticamente." },
    analysisFailed: { one: "Não foi possível analisar {count} clipe.", many: "Não foi possível analisar {count} de clipes.", other: "Não foi possível analisar {count} clipes." },
    noteAnalysing: { one: "{count} clipe em análise", many: "{count} de clipes em análise", other: "{count} clipes em análise" },
    noteNotAnalysed: { one: "{count} clipe ainda não analisado", many: "{count} de clipes ainda não analisados", other: "{count} clipes ainda não analisados" },
    noteFailed: { one: "Não foi possível analisar {count} clipe", many: "Não foi possível analisar {count} de clipes", other: "Não foi possível analisar {count} clipes" },
    noteShort: { one: "{count} clipe com menos de 1,2 s ignorado", many: "{count} de clipes com menos de 1,2 s ignorados", other: "{count} clipes com menos de 1,2 s ignorados" },
    clips: "Clipes",
    "clips.auto": "Auto",
    "clips.choose": "Escolher clipes",
    chooseClipsCount: "Selecionados: {selected}/{total}",
    all: "Todos",
    none: "Nenhum",
    photo: "Foto",
    "shape.tall": "Vertical",
    "shape.wide": "Horizontal",
    "shape.square": "Quadrado",
    usePhotosOff: "Usar fotos está desativado",
    music: "Música",
    ownMusic: "Sua própria música",
    noMusic: "Sem música",
    byAuthor: "por {author}",
    chooseMusicFile: "Escolha um arquivo de música.",
    musicFileRejected: "Este arquivo não pode ser usado como música. Escolha um arquivo de áudio.",
    listening: "Procurando a batida…",
    beatFound: "Batida encontrada: {bpm} BPM.",
    beatApprox: "Batida aproximada: {bpm} BPM. Os cortes a seguem, mas a batida é fraca.",
    beatNone: "Nenhuma batida estável encontrada; os cortes usam uma duração fixa",
    musicUnreadable: "Não foi possível ler este arquivo de música ({detail}). Escolha outro arquivo ou uma das faixas.",
    musicTimeout: "A leitura deste arquivo de música demorou demais. Escolha outro arquivo ou uma das faixas.",
    sectionHint: "Trecho da música: arraste para escolher",
    sectionLabel: "Trecho da música",
    musicTooShort: "Esta música é curta demais para esta duração",
    startsAt: "Começa em {seconds} s",
    previewSection: "Ouvir este trecho",
    stopPreview: "Parar a prévia",
    cancelPreview: "Cancelar a prévia",
    previewFailed: "Não foi possível reproduzir a prévia: {detail}.",
    previewTimeout: "A prévia demorou demais para ser preparada. Tente novamente.",
    look: "Look",
    "look.soft-glow": "Brilho suave",
    "look.night-glam": "Glam noturno",
    "look.clean": "Limpo",
    "look.none": "Nenhum",
    lookOn: "Look ativado",
    length: "Duração",
    "length.short": "Curta",
    "length.standard": "Padrão",
    "length.long": "Longa",
    barsFit: { one: "Cabe {fit} de {count} compasso", many: "Cabem {fit} de {count} de compassos", other: "Cabem {fit} de {count} compassos" },
    clipSound: "Som dos clipes",
    "sound.off": "Desligado",
    "sound.ambient": "Ambiente",
    "sound.full": "Total",
    usePhotos: "Usar fotos",
    silentVideo: "Vídeo sem som: sem música e com o som dos clipes desligado.",
    build: "Criar",
    building: "Criando",
    anotherVersion: "Testar outros planos",
    finishLook: "Concluir o look",
    "step.check": "Verificando clipes",
    "step.search": "Procurando closes",
    "step.plan": "Planejando a edição",
    "step.assemble": "Criando o Draft",
    "step.look": "Adicionando whip e look",
    progress: "Etapa {step}/{total} · {name} · {percent}%",
    progressDetail: "Etapa {step}/{total} · {name} ({detail}) · {percent}%",
    videosChecked: { one: "{done}/{count} vídeo verificado", many: "{done}/{count} de vídeos verificados", other: "{done}/{count} vídeos verificados" },
    videosSearched: { one: "{done}/{count} vídeo pesquisado", many: "{done}/{count} de vídeos pesquisados", other: "{done}/{count} vídeos pesquisados" },
    videosMeasured: { one: "{done}/{count} vídeo medido", many: "{done}/{count} de vídeos medidos", other: "{done}/{count} vídeos medidos" },
    "detail.music": "adicionando a música",
    "detail.open": "abrindo o Draft",
    stoppedAt: "Parou na etapa {step}/{total}, {name}: {detail}",
    stepFailed: "O Selects não conseguiu concluir esta etapa.",
    noSources: "Nenhum clipe ou foto utilizável. Adicione clipes ou fotos, ou escolha mais clipes.",
    musicTooShortBuild: "Esta música é curta demais para a edição. Escolha uma duração menor, um trecho anterior ou outra faixa.",
    draftNoId: "O Draft “{name}” foi salvo, mas o Selects não informou o id dele, então o whip e o look não puderam ser adicionados. Abra-o na lista de Drafts ou crie novamente.",
    finishFailed: "O Draft foi criado, mas o whip e o look não puderam ser adicionados: {detail}. Pressione Concluir o look para tentar de novo.",
    openFailed: "O Draft está pronto, mas não pôde ser aberto: {detail}. Abra-o na lista de Drafts.",
    draftCreatedAdding: "Draft criado; adicionando whip e look…",
    resultLine: { one: "“{name}” criado: {count} plano, cerca de {seconds} s.", many: "“{name}” criado: {count} de planos, cerca de {seconds} s.", other: "“{name}” criado: {count} planos, cerca de {seconds} s." },
    draftCreated: "Selecione um clipe para alterar o look, a intensidade do look, a do whip ou o enquadramento em Ajustar. Criar novamente gera um novo Draft e não mantém as edições de Ajustar.",
    openDraft: "Abrir o novo Draft",
    copyLink: "Copiar o link do novo Draft",
    "note.fewFaces": { one: "Apenas {count} clipe em close encontrado: a edição o reutiliza", many: "Apenas {count} de clipes em close encontrados: a edição os reutiliza", other: "Apenas {count} clipes em close encontrados: a edição os reutiliza" },
    "note.noFaces": "Nenhum clipe em close encontrado, então a edição usa seus outros clipes e fotos",
    "note.shrunk": { one: "Seu material preenche {fit} de {count} compasso, então a edição é mais curta. Adicione mais clipes ou fotos para a duração completa.", many: "Seu material preenche {fit} de {count} de compassos, então a edição é mais curta. Adicione mais clipes ou fotos para a duração completa.", other: "Seu material preenche {fit} de {count} compassos, então a edição é mais curta. Adicione mais clipes ou fotos para a duração completa." },
    "note.noMusic": "Sem música: os cortes seguem um ritmo estável de 97 BPM",
    "note.pairReuse": "Pouquíssimos clipes: alguns momentos se repetem",
    "note.adjacent": "Pouquíssimos clipes: o mesmo clipe aparece em compassos vizinhos",
    "note.photosEarly": "Poucos clipes em close: as fotos também podem preencher o segundo ou o último compasso",
    unsearched: { one: "Não foi possível procurar closes em {count} vídeo; ele foi usado como clipe comum. Crie novamente para tentar de novo.", many: "Não foi possível procurar closes em {count} de vídeos; eles foram usados como clipes comuns. Crie novamente para tentar de novo.", other: "Não foi possível procurar closes em {count} vídeos; eles foram usados como clipes comuns. Crie novamente para tentar de novo." },
    note: "Observação: {detail}.",
    "param.look": "Look",
    "param.lookStrength": "Intensidade do look",
    "param.whip": "Intensidade do whip",
    "param.framing": "Enquadramento",
    "framing.tight": "Fechado",
    "framing.full": "Completo",
  },
  tr: {
    openProject: "Selfie Aesthetic Edit oluşturmak için bir proje açın.",
    needsNewerSelects: "Bunun için Selects'in daha yeni bir sürümü gerekir.",
    needsNewerSelectsMusic: "Kendi müziğiniz ve bölüm önizlemesi için Selects'in daha yeni bir sürümü gerekir. Hazır parçalar çalışmaya devam eder.",
    pluginMissing: "Selfie Aesthetic Edit dosyalarını bulamadı. Eklentiyi yeniden yükleyin.",
    startFailed: "Selfie Aesthetic Edit başlatılamadı: {detail}",
    refresh: "Yenile",
    refreshing: "Yenileniyor",
    refreshFailed: "Klip listesi yenilenemedi: {detail}",
    readFailed: "Bu projedeki klipler okunamadı: {detail}",
    checkingClipsNow: "Klipler kontrol ediliyor…",
    working: "Çalışıyor",
    gap: " ",
    noFootage: "Bu projede henüz analiz edilmiş video veya fotoğraf yok. Video klipler ekleyip analiz edin ya da fotoğraf ekleyin; otomatik güncellenir.",
    turnOnPhotos: "Bu projenin fotoğraflarından oluşturmak için Fotoğrafları kullan seçeneğini açın.",
    noClipsSelected: "Klip seçilmedi. Aşağıdan klip seçin.",
    ready: "Hazır: {summary}",
    readyClips: { one: "{count} klip", other: "{count} klip" },
    readyCloseUps: { one: "{count} yakın plan klip", other: "{count} yakın plan klip" },
    readyPhotos: { one: "{count} fotoğraf", other: "{count} fotoğraf" },
    aboutSeconds: "yaklaşık {seconds} sn",
    analysing: { one: "{count} klip analiz ediliyor. Bittiğinde otomatik güncellenir.", other: "{count} klip analiz ediliyor. Bittiğinde otomatik güncellenir." },
    notAnalysedAnalyse: { one: "{count} klip henüz analiz edilmedi. Burada kullanmak için Selects'te analiz edin.", other: "{count} klip henüz analiz edilmedi. Burada kullanmak için Selects'te analiz edin." },
    notAnalysedMaybe: { one: "{count} klip henüz analiz edilmedi. Selects analiz ediyorsa otomatik güncellenir.", other: "{count} klip henüz analiz edilmedi. Selects analiz ediyorsa otomatik güncellenir." },
    analysisFailed: { one: "{count} klip analiz edilemedi.", other: "{count} klip analiz edilemedi." },
    noteAnalysing: { one: "{count} klip analiz ediliyor", other: "{count} klip analiz ediliyor" },
    noteNotAnalysed: { one: "{count} klip henüz analiz edilmedi", other: "{count} klip henüz analiz edilmedi" },
    noteFailed: { one: "{count} klip analiz edilemedi", other: "{count} klip analiz edilemedi" },
    noteShort: { one: "1,2 sn'den kısa {count} klip atlandı", other: "1,2 sn'den kısa {count} klip atlandı" },
    clips: "Klipler",
    "clips.auto": "Otomatik",
    "clips.choose": "Klip seç",
    chooseClipsCount: "Seçili: {selected}/{total}",
    all: "Tümü",
    none: "Hiçbiri",
    photo: "Fotoğraf",
    "shape.tall": "Dikey",
    "shape.wide": "Yatay",
    "shape.square": "Kare",
    usePhotosOff: "Fotoğrafları kullan kapalı",
    music: "Müzik",
    ownMusic: "Kendi müziğiniz",
    noMusic: "Müzik yok",
    byAuthor: "{author} tarafından",
    chooseMusicFile: "Bir müzik dosyası seçin.",
    musicFileRejected: "Bu dosya müzik olarak kullanılamaz. Bir ses dosyası seçin.",
    listening: "Ritim aranıyor…",
    beatFound: "Ritim bulundu: {bpm} BPM.",
    beatApprox: "Yaklaşık ritim: {bpm} BPM. Kesmeler bunu izler, ancak ritim belirgin değil.",
    beatNone: "Düzenli ritim bulunamadı; kesmeler sabit uzunluk kullanır",
    musicUnreadable: "Bu müzik dosyası okunamadı ({detail}). Başka bir dosya veya hazır parçalardan birini seçin.",
    musicTimeout: "Bu müzik dosyasını okumak çok uzun sürdü. Başka bir dosya veya hazır parçalardan birini seçin.",
    sectionHint: "Müzik bölümü — seçmek için sürükleyin",
    sectionLabel: "Müzik bölümü",
    musicTooShort: "Bu müzik bu uzunluk için çok kısa",
    startsAt: "{seconds} sn'de başlar",
    previewSection: "Bu bölümü önizle",
    stopPreview: "Önizlemeyi durdur",
    cancelPreview: "Önizlemeyi iptal et",
    previewFailed: "Önizleme oynatılamadı: {detail}.",
    previewTimeout: "Önizlemenin hazırlanması çok uzun sürdü. Tekrar deneyin.",
    look: "Görünüm",
    "look.soft-glow": "Yumuşak parıltı",
    "look.night-glam": "Gece şıklığı",
    "look.clean": "Sade",
    "look.none": "Yok",
    lookOn: "Görünüm açık",
    length: "Uzunluk",
    "length.short": "Kısa",
    "length.standard": "Standart",
    "length.long": "Uzun",
    barsFit: { one: "{count} ölçüden {fit} tanesi sığıyor", other: "{count} ölçüden {fit} tanesi sığıyor" },
    clipSound: "Klip sesi",
    "sound.off": "Kapalı",
    "sound.ambient": "Ortam",
    "sound.full": "Tam",
    usePhotos: "Fotoğrafları kullan",
    silentVideo: "Sessiz video: müzik yok ve Klip sesi kapalı.",
    build: "Oluştur",
    building: "Oluşturuluyor",
    anotherVersion: "Başka çekimler dene",
    finishLook: "Görünümü tamamla",
    "step.check": "Klipler kontrol ediliyor",
    "step.search": "Yakın planlar aranıyor",
    "step.plan": "Kurgu planlanıyor",
    "step.assemble": "Draft oluşturuluyor",
    "step.look": "Whip ve görünüm ekleniyor",
    progress: "Adım {step}/{total} · {name} · %{percent}",
    progressDetail: "Adım {step}/{total} · {name} ({detail}) · %{percent}",
    videosChecked: { one: "{done}/{count} video kontrol edildi", other: "{done}/{count} video kontrol edildi" },
    videosSearched: { one: "{done}/{count} video tarandı", other: "{done}/{count} video tarandı" },
    videosMeasured: { one: "{done}/{count} video ölçüldü", other: "{done}/{count} video ölçüldü" },
    "detail.music": "müzik ekleniyor",
    "detail.open": "Draft açılıyor",
    stoppedAt: "{step}/{total}. adımda durdu, {name}: {detail}",
    stepFailed: "Selects bu adımı tamamlayamadı.",
    noSources: "Kullanılabilir klip veya fotoğraf yok. Klip ya da fotoğraf ekleyin veya daha fazla klip seçin.",
    musicTooShortBuild: "Bu müzik kurgu için çok kısa. Daha kısa bir Uzunluk, daha erken bir bölüm veya başka bir parça seçin.",
    draftNoId: "“{name}” Draft'ı kaydedildi, ancak Selects kimliğini bildirmedi; bu yüzden whip ve görünüm eklenemedi. Draft listesinden açın veya yeniden oluşturun.",
    finishFailed: "Draft oluşturuldu, ancak whip ve görünüm eklenemedi: {detail}. Tekrar denemek için Görünümü tamamla'ya basın.",
    openFailed: "Draft hazır, ancak açılamadı: {detail}. Draft listesinden açın.",
    draftCreatedAdding: "Draft oluşturuldu; whip ve görünüm ekleniyor…",
    resultLine: { one: "“{name}” oluşturuldu: {count} çekim, yaklaşık {seconds} sn.", other: "“{name}” oluşturuldu: {count} çekim, yaklaşık {seconds} sn." },
    draftCreated: "Görünümü, görünüm gücünü, whip gücünü veya kadrajı Ayarla'da değiştirmek için bir klip seçin. Yeniden oluşturmak yeni bir Draft yaratır ve Ayarla'daki düzenlemeleri korumaz.",
    openDraft: "Yeni Draft'ı aç",
    copyLink: "Yeni Draft'ın bağlantısını kopyala",
    "note.fewFaces": { one: "Yalnızca {count} yakın plan klip bulundu — kurgu onu yeniden kullanır", other: "Yalnızca {count} yakın plan klip bulundu — kurgu onları yeniden kullanır" },
    "note.noFaces": "Yakın plan klip bulunamadı; kurgu diğer klip ve fotoğraflarınızı kullanır",
    "note.shrunk": { one: "Görüntüleriniz {count} ölçüden {fit} tanesini dolduruyor, bu yüzden kurgu daha kısa. Tam uzunluk için daha fazla klip veya fotoğraf ekleyin.", other: "Görüntüleriniz {count} ölçüden {fit} tanesini dolduruyor, bu yüzden kurgu daha kısa. Tam uzunluk için daha fazla klip veya fotoğraf ekleyin." },
    "note.noMusic": "Müzik yok: kesmeler sabit 97 BPM ritmi izler",
    "note.pairReuse": "Çok az klip: bazı anlar tekrar ediyor",
    "note.adjacent": "Çok az klip: aynı klip komşu ölçülerde oynuyor",
    "note.photosEarly": "Çok az yakın plan klip: fotoğraflar ikinci veya son ölçüyü de doldurabilir",
    unsearched: { one: "{count} videoda yakın plan aranamadı; normal klip olarak kullanıldı. Yeniden denemek için tekrar oluşturun.", other: "{count} videoda yakın plan aranamadı; normal klip olarak kullanıldı. Yeniden denemek için tekrar oluşturun." },
    note: "Not: {detail}.",
    "param.look": "Görünüm",
    "param.lookStrength": "Görünüm gücü",
    "param.whip": "Whip gücü",
    "param.framing": "Kadraj",
    "framing.tight": "Yakın",
    "framing.full": "Tam",
  },
  zh: {
    openProject: "请先打开一个项目，再制作 Selfie Aesthetic Edit。",
    needsNewerSelects: "需要更新版本的 Selects。",
    needsNewerSelectsMusic: "使用自己的音乐和片段试听需要更新版本的 Selects。内置曲目仍可使用。",
    pluginMissing: "Selfie Aesthetic Edit 找不到自己的文件。请重新安装插件。",
    startFailed: "Selfie Aesthetic Edit 无法启动：{detail}",
    refresh: "刷新",
    refreshing: "正在刷新",
    refreshFailed: "无法刷新片段列表：{detail}",
    readFailed: "无法读取此项目中的片段：{detail}",
    checkingClipsNow: "正在检查片段…",
    working: "处理中",
    gap: " ",
    noFootage: "此项目中还没有已分析的视频或照片。请添加视频片段并分析，或添加照片；列表会自动更新。",
    turnOnPhotos: "打开“使用照片”，即可用此项目的照片来制作。",
    noClipsSelected: "未选择片段。请在下方选择片段。",
    ready: "已就绪：{summary}",
    readyClips: { other: "{count} 个片段" },
    readyCloseUps: { other: "{count} 个特写片段" },
    readyPhotos: { other: "{count} 张照片" },
    aboutSeconds: "约 {seconds} 秒",
    analysing: { other: "{count} 个片段正在分析。完成后会自动更新。" },
    notAnalysedAnalyse: { other: "{count} 个片段尚未分析。请在 Selects 中分析后再在此使用。" },
    notAnalysedMaybe: { other: "{count} 个片段尚未分析。如果 Selects 正在分析，列表会自动更新。" },
    analysisFailed: { other: "{count} 个片段无法分析。" },
    noteAnalysing: { other: "{count} 个片段正在分析" },
    noteNotAnalysed: { other: "{count} 个片段尚未分析" },
    noteFailed: { other: "{count} 个片段无法分析" },
    noteShort: { other: "已跳过 {count} 个短于 1.2 秒的片段" },
    clips: "片段",
    "clips.auto": "自动",
    "clips.choose": "选择片段",
    chooseClipsCount: "已选：{selected}/{total}",
    all: "全选",
    none: "全不选",
    photo: "照片",
    "shape.tall": "竖版",
    "shape.wide": "横版",
    "shape.square": "方形",
    usePhotosOff: "“使用照片”已关闭",
    music: "音乐",
    ownMusic: "自己的音乐",
    noMusic: "无音乐",
    byAuthor: "{author}",
    chooseMusicFile: "请选择一个音乐文件。",
    musicFileRejected: "此文件无法用作音乐。请选择音频文件。",
    listening: "正在识别节拍…",
    beatFound: "已识别节拍：{bpm} BPM。",
    beatApprox: "大致节拍：{bpm} BPM。剪辑会跟随它，但节拍不明显。",
    beatNone: "未找到稳定的节拍；剪辑将使用固定时长",
    musicUnreadable: "无法读取此音乐文件（{detail}）。请选择其他文件或内置曲目。",
    musicTimeout: "读取此音乐文件耗时过长。请选择其他文件或内置曲目。",
    sectionHint: "音乐片段 — 拖动选择",
    sectionLabel: "音乐片段",
    musicTooShort: "这段音乐对于此时长来说太短",
    startsAt: "从 {seconds} 秒开始",
    previewSection: "试听这一段",
    stopPreview: "停止试听",
    cancelPreview: "取消试听",
    previewFailed: "无法播放试听：{detail}。",
    previewTimeout: "试听准备时间过长。请重试。",
    look: "色调",
    "look.soft-glow": "柔光",
    "look.night-glam": "夜色魅影",
    "look.clean": "清爽",
    "look.none": "无",
    lookOn: "色调已开启",
    length: "时长",
    "length.short": "短",
    "length.standard": "标准",
    "length.long": "长",
    barsFit: { other: "{count} 小节中可容纳 {fit} 小节" },
    clipSound: "片段原声",
    "sound.off": "关闭",
    "sound.ambient": "环境音",
    "sound.full": "原音量",
    usePhotos: "使用照片",
    silentVideo: "无声视频：没有音乐，片段原声也已关闭。",
    build: "生成",
    building: "正在生成",
    anotherVersion: "换一组镜头",
    finishLook: "完成色调",
    "step.check": "检查片段",
    "step.search": "查找特写",
    "step.plan": "规划剪辑",
    "step.assemble": "创建 Draft",
    "step.look": "添加 Whip 和色调",
    progress: "第 {step}/{total} 步 · {name} · {percent}%",
    progressDetail: "第 {step}/{total} 步 · {name}（{detail}）· {percent}%",
    videosChecked: { other: "已检查 {done}/{count} 个视频" },
    videosSearched: { other: "已搜索 {done}/{count} 个视频" },
    videosMeasured: { other: "已测量 {done}/{count} 个视频" },
    "detail.music": "正在添加音乐",
    "detail.open": "正在打开 Draft",
    stoppedAt: "在第 {step}/{total} 步（{name}）停止：{detail}",
    stepFailed: "Selects 无法完成这一步。",
    noSources: "没有可用的片段或照片。请添加片段或照片，或选择更多片段。",
    musicTooShortBuild: "这段音乐对于此剪辑来说太短。请选择更短的时长、靠前的片段或其他曲目。",
    draftNoId: "Draft “{name}” 已保存，但 Selects 没有返回它的 ID，因此无法添加 Whip 和色调。请从 Draft 列表中打开它，或重新生成。",
    finishFailed: "Draft 已创建，但无法添加 Whip 和色调：{detail}。请点按“完成色调”重试。",
    openFailed: "Draft 已就绪，但无法打开：{detail}。请从 Draft 列表中打开。",
    draftCreatedAdding: "Draft 已创建；正在添加 Whip 和色调…",
    resultLine: { other: "已生成“{name}”：{count} 个镜头，约 {seconds} 秒。" },
    draftCreated: "选择一个片段，即可在“调整”中更改其色调、色调强度、Whip 强度或构图。再次生成会创建新的 Draft，不会保留“调整”中的修改。",
    openDraft: "打开新的 Draft",
    copyLink: "复制新 Draft 的链接",
    "note.fewFaces": { other: "只找到 {count} 个特写片段，剪辑会重复使用" },
    "note.noFaces": "未找到特写片段，因此剪辑使用你的其他片段和照片",
    "note.shrunk": { other: "你的素材只够 {count} 小节中的 {fit} 小节，因此剪辑会更短。添加更多片段或照片即可达到完整时长。" },
    "note.noMusic": "无音乐：剪辑跟随稳定的 97 BPM 节奏",
    "note.pairReuse": "片段非常少：部分画面会重复",
    "note.adjacent": "片段非常少：同一个片段会在相邻小节中播放",
    "note.photosEarly": "特写片段太少：照片也可能出现在第二小节或最后一个小节",
    unsearched: { other: "无法在 {count} 个视频中查找特写，已将其作为普通片段使用。再次生成可重试。" },
    note: "提示：{detail}。",
    "param.look": "色调",
    "param.lookStrength": "色调强度",
    "param.whip": "Whip 强度",
    "param.framing": "构图",
    "framing.tight": "紧凑",
    "framing.full": "完整",
  },
};
// STRINGS:END

// i18n runtime for style-app panels (selects-app-kit tools/i18n/i18n-runtime.ts). Paste it below the STRINGS block.
const LANGS = ["de", "en", "es", "fr", "it", "ja", "ko", "pt", "tr", "zh"] as const;
type Lang = (typeof LANGS)[number];
type Msg = string | { [category: string]: string };
type Vars = Record<string, string | number>;
const I18N_TABLE = STRINGS as unknown as Record<string, Record<string, Msg>>;

function normLang(raw: unknown): Lang | null {
  const code = String(raw ?? "").toLowerCase().split(/[-_]/)[0];
  return (LANGS as readonly string[]).includes(code) ? (code as Lang) : null;
}
// Call in the component body on every render: the app can switch languages while the panel is open.
function uiLang(context?: { language?: string | null } | null): Lang {
  const nav = typeof navigator === "undefined" ? "" : navigator.language;
  return normLang(context?.language) ?? normLang(nav) ?? "en";
}
// Plural messages pick their form from vars.count; numbers are formatted for the language.
function t(lang: Lang, key: string, vars: Vars = {}): string {
  let msg: Msg | undefined = I18N_TABLE[lang]?.[key] ?? I18N_TABLE.en[key];
  if (msg === undefined) return key;
  if (typeof msg !== "string") {
    const n = Number(vars.count);
    msg = msg[new Intl.PluralRules(lang).select(Number.isFinite(n) ? n : 0)] ?? msg.other ?? "";
  }
  const nf = new Intl.NumberFormat(lang);
  return msg.replace(/\{(\w+)\}/g, (whole: string, name: string) => {
    const v = vars[name];
    return v === undefined ? whole : typeof v === "number" ? nf.format(v) : v;
  });
}
// Optional keys (preset/look labels by id): the English label from the JSON is the fallback.
function tOr(lang: Lang, key: string, fallback: string, vars: Vars = {}): string {
  return I18N_TABLE.en[key] === undefined ? fallback : t(lang, key, vars);
}
// Field limits count Hangul, kana, CJK and fullwidth characters as 2.
const WIDE_RE = /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]/;
function fieldLen(text: string): number {
  let n = 0;
  for (const ch of text) n += WIDE_RE.test(ch) ? 2 : 1;
  return n;
}

// A message that follows the UI language: state keeps the function and every render calls it with the current language.
type Say = (lang: Lang) => string;
// An error whose text follows the UI language; `message` keeps the English text.
function uiError(say: Say) { const e: any = new Error(say("en")); e.say = say; return e; }
function sayError(lang: Lang, e: any): string { return typeof e?.say === "function" ? e.say(lang) : String(e?.message || e); }

const PLUGIN_ID = "selfie-aesthetic";
// Whip implementation sent to decorate.js: 'effect' (one per-clip effect smears each clip's head and tail; default) or
// 'transition' (native 2 + 2-frame transitions plus a look-only effect), kept switchable for the Staging A/B.
const SAE_WHIP_MODE: "effect" | "transition" = "effect";
// Stillness picker weight sent to the planner (planner SAE_STILL_WEIGHT; the reference freezes each hold, ours are
// real-time micro-windows, so holds should come from the stillest moments). 0 = off: no motion is measured and plans
// are exactly as without it. When > 0 and the host can run ffmpeg, the Check step measures each chosen video's
// motion (saeMotionCurve, cached per clip). 0.6 from the Staging A/B (round 2: motion_inside_shots 8.58 -> 6.22).
const SAE_STILL_WEIGHT_PANEL: number = 0.6;
// Scene-search roles and queries (spec "Shot roles, search and allocation"). The planner compares each clip's face
// scores with its best control score to decide what counts as a close-up.
const SAE_QUERIES = {
  selfie: "close-up selfie of a person's face looking at the camera",
  hand: "person touching their face or hair with a hand, close-up",
  expression: "person making a face, pouting or smiling at the camera, close-up",
  glance: "person glancing away and back to the camera, close-up portrait",
  control: "a landscape, street, room, food or object with no person",
};
// Hits per query and clips per search call: five queries x four clips keeps a call inside run_script's 30 s deadline.
const SAE_SEARCH_PAGE_SIZE = 8;
const SAE_SEARCH_BATCH = 4;
// Ambient clip sound sits this far under the music, which stays at 0 dB.
const AMBIENT_DB = -18;
// The look's default strength in the effect (editable per clip in Adjust) for a preset without its own `strength`.
const LOOK_STRENGTH = 0.35;
// Look presets: the effect's look id, its default look strength (the effect's SAE_LOOKS strength), the global whip
// strength it ships with (Clean whips softer) and the tile swatch.
const LOOK_PRESETS = [
  { id: "soft-glow", strength: 0.5, whip: 1, swatch: "radial-gradient(circle at 35% 30%, #fff1e6 0%, #f2b8a8 45%, #a8646e 80%, #4a2a33 100%)" },
  { id: "night-glam", strength: 0.35, whip: 1, swatch: "radial-gradient(circle at 35% 30%, #ffc2e6 0%, #d0479a 45%, #6a1650 80%, #1c0818 100%)" },
  { id: "clean", strength: 0.35, whip: 0.7, swatch: "radial-gradient(circle at 35% 30%, #ffffff 0%, #e8e2dc 45%, #a9a29b 80%, #5d5853 100%)" },
];
// The Look choices of a clip in Adjust. These labels are the English defaults (headless build tools read this
// constant); a build writes STRINGS `look.<value>` in the UI language.
const LOOK_OPTIONS = [
  { label: "Soft glow", value: "soft-glow" }, { label: "Night glam", value: "night-glam" },
  { label: "Clean", value: "clean" }, { label: "None", value: "none" },
];
// The Framing choices of a video clip in Adjust (the effect's data.framing; the planner sets 'tight' on face clips,
// 'full' on others). English defaults; a build writes STRINGS `framing.<value>` in the UI language.
const FRAMING_OPTIONS = [{ label: "Tight", value: "tight" }, { label: "Full", value: "full" }];
// Files the panel reads from the installed plugin folder, as path parts under it.
const ASSET_FILES = {
  manifest: ["assets", "cues", "manifest.json"],
  inventoryJs: ["scripts", "inventory.js"],
  searchJs: ["scripts", "search.js"],
  ensureJs: ["scripts", "ensure-audio.js"],
  assembleJs: ["scripts", "assemble.js"],
  decorateJs: ["scripts", "decorate.js"],
  effectTsx: ["assets", "selfie-whip-look.tsx"],
  transitionTsx: ["assets", "selfie-whip-transition.tsx"],
  beatText: ["beat-detect.cjs"],
};

// planner.js ends with a CommonJS export guarded by `typeof module`; declared here so the panel compiles.
declare const module: any;
// sae-planner:start
// Selfie Aesthetic Edit planner. A plain script: panel.tsx embeds it verbatim (between `// sae-planner:start` and
// `// sae-planner:end`) and the tests load it in node:vm. No require, no imports; module.exports only when it exists.
//
// Rhythm template (spec "Rhythm template"): N bars, one source per bar. Bars 0..N-2 are standard bars of six holds
// [1, .5, .5, .5, .5, 1] beats with moments A B A B A B; the last bar is the finale, seven 1/2-beat holds A B A B A B A.
// The video starts SAE_LEAD before beat 0 of the chosen music section and ends at beat 4(N-1) + 3.5 plus
// SAE_END_TAIL (the last hold absorbs the tail). Holds = 6(N-1) + 7, cuts = holds - 1.
//
// Timing: timeline seconds of edit beat b = SAE_LEAD + b * 60 / editBpm + delta. The music clip starts at timeline
// frame 0 with sourceStart = sectionStart - SAE_LEAD; Selects snaps sourceStart to a whole frame, so the music plays
// offset by delta = sourceStart - round(sourceStart * fps) / fps (at most half a frame; saeMusicOffset). delta is applied once to every boundary, and every boundary
// is rounded to a frame on its own: frame = round(seconds * fps). Durations never accumulate rounding.
const SAE_LEAD = 0.15;
const SAE_END_TAIL = 0.040;
const SAE_STANDARD_BAR = [1, 0.5, 0.5, 0.5, 0.5, 1];
const SAE_STANDARD_MOMENTS = ['A', 'B', 'A', 'B', 'A', 'B'];
const SAE_FINALE_BAR = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
const SAE_FINALE_MOMENTS = ['A', 'B', 'A', 'B', 'A', 'B', 'A'];
const SAE_LENGTHS = { short: 4, standard: 6, long: 8 };
// Fewest bars a build shrinks to: two standard bars + the finale.
const SAE_MIN_BARS = 3;
// Tempo mapping: the cue's beat when it lies in [SAE_EDIT_BPM_MIN, SAE_EDIT_BPM_MAX], half-time when that is still at
// least SAE_EDIT_BPM_MIN, else the beat itself (125-140 BPM: a 1/2 beat of >= 0.21 s keeps a visible hold between the
// 2 + 2-frame whips).
const SAE_EDIT_BPM_MIN = 70;
const SAE_EDIT_BPM_MAX = 125;
// A detected beat is used when its bpm lies in this range (grid 'accepted' or 'approximate'); otherwise, for
// grid 'none' and without music, the edit runs on a fixed SAE_FIXED_BPM grid (1/2 beat = 0.309 s).
const SAE_GRID_BPM_MIN = 60;
const SAE_GRID_BPM_MAX = 250;
const SAE_FIXED_BPM = 97;
// Fixed-tempo own music: bar-change cuts (only those) may move onto a strong low-band onset within this window.
const SAE_SNAP_WINDOW = 0.120;
const SAE_SNAP_MIN_STRENGTH = 2;
const SAE_SNAP_DISTANCE_COST = 0.5;
// No hold may be shorter than this after an onset snap.
const SAE_MIN_HOLD_FRAMES = 3;
// The music's fade-out (bundled cues: 2 s); the edit must end before it starts.
const SAE_FADE_OUT = 2;
// Source windows: a hold window ends at least this far before the end of its source.
const SAE_SOURCE_TAIL = 0.15;
// Head handle: a moment starts at least this many frames into its source (and at least the whip length + 1 frame;
// SAE_WHIP_SECONDS matches the effect's), so the whip transition has source before the incoming clip's srcStart.
const SAE_HEAD_FRAMES = 3;
const SAE_WHIP_SECONDS = 0.067;
// Moments A and B of one bar are at least this far apart in the source, and never overlap (at least the window
// length apart).
const SAE_PAIR_GAP = 0.8;
// Expressive pairs: a moment's role is the pose role whose nearby hit (within SAE_ROLE_NEAR of its window) stands
// furthest above that role's mean hit score in the clip (none without nearby pose-role hits). A pair of two different
// roles (e.g. expression vs glance) gains SAE_PAIR_ROLE_BONUS; A and B at least SAE_PAIR_SEP seconds apart gain
// SAE_PAIR_SEP_BONUS, so visibly different moments beat two hits of one role close together.
// Only pose roles label a moment (a hand is a gesture, not an expression; see SAE_ROLE_TOP).
const SAE_POSE_ROLES = ['selfie', 'expression', 'glance'];
const SAE_PAIR_ROLE_BONUS = 0.06;
const SAE_PAIR_SEP = 1.5;
const SAE_PAIR_SEP_BONUS = 0.04;
// Filler candidate times every SAE_FILLER_STEP seconds per clip (at most SAE_MAX_FILLERS, evenly spaced, so a long
// clip does not blow up the pair search). Fillers score SAE_FILLER_SCORE, below any scene-search hit.
const SAE_FILLER_STEP = 0.5;
const SAE_MAX_FILLERS = 40;
const SAE_FILLER_SCORE = -1;
// Distinct moment pairs kept per clip (a repeated clip uses a different pair).
const SAE_MAX_PAIRS = 8;
// Stillness (the reference freezes every hold; ours are real-time micro-windows, so holds should come from the
// stillest moments). motion: { [rid]: { fps, values } }, values[i] = mean absolute luma difference between motion
// frames i and i + 1, covering source seconds [i / fps, (i + 1) / fps]. A window's motion cost is the mean of the
// values it overlaps over the clip's median (floored at SAE_STILL_FLOOR, capped at SAE_STILL_COST_MAX; 1 when no
// value overlaps). Moment score = hit score - weight * cost; pair score = the sum. With weight > 0 the local minima
// of the window cost (up to SAE_STILL_MINIMA per clip, lowest first) are added as filler candidates. Weight 0
// (the default) leaves every plan exactly as without motion.
const SAE_STILL_WEIGHT = 0;
const SAE_STILL_FLOOR = 0.5;
const SAE_STILL_COST_MAX = 4;
const SAE_STILL_MINIMA = 12;
// Moments within this distance of a moment an earlier pair already uses count as "the same moment" when picking
// further pairs (pairs with fresh moments come first).
const SAE_MOMENT_NEAR = 0.4;
// Face test (spec "Shot roles"): a clip is a face clip when its best face-role hit beats the clip's best control hit
// by more than SAE_FACE_MARGIN (scene-search score units). Tunable: raise it if landscape clips pass as faces, lower
// it if real selfies fail. Default 0.02, to be re-tuned on Staging (Set A vs the daily Project) and recorded in the
// planner tests. A clip without any control hit (the control search failed) is not a face clip; it stays usable.
const SAE_FACE_MARGIN = 0.02;
const SAE_FACE_ROLES = ['selfie', 'hand', 'expression', 'glance'];
// Photos: about SAE_PHOTO_SHARE of the bars, at most SAE_PHOTO_RUN_MAX photo bars in a row, never before bar
// SAE_PHOTO_FIRST_BAR (the opening and the next bar stay video, so the face A/B ping-pong lands first) nor in the
// finale while any video exists. Short edits (<= SAE_PHOTO_SHORT_BARS bars) take at most SAE_PHOTO_SHORT_MAX photo bar,
// and only when there are fewer than SAE_PHOTO_SHORT_FACES face clips (video-rich input plays video pairs).
const SAE_PHOTO_SHARE = 1 / 3;
const SAE_PHOTO_RUN_MAX = 2;
const SAE_PHOTO_FIRST_BAR = 2;
const SAE_PHOTO_SHORT_BARS = 4;
const SAE_PHOTO_SHORT_MAX = 1;
const SAE_PHOTO_SHORT_FACES = 3;
// Face clips are reused (with another A/B pair) up to this many bars each before photos and non-face clips fill in.
const SAE_FACE_MAX_USES = 2;
// Gesture vs face pose (the SDK gives no face position, only per-role scene-search hits). Per clip: the mean of
// its SAE_ROLE_TOP best hits per role; pose = the mean of the selfie and expression tops, gesture = hand top - pose
// (the hand top falls back to the best control hit, else 0, when the hand search found nothing). Per moment: the
// best hit of each role within SAE_ROLE_NEAR seconds of its window; the moment is gesture-dominated when its hand
// hit beats its best selfie / expression hit by more than SAE_GESTURE_MARGIN (or no selfie / expression hit is
// near). Hits are sparse (a few per role per clip), so the clip-level gesture carries most of the signal.
// Key bars (bar 0, the opening, and the finale) choose among equally used clips by key score = pose - hand top
// (+ SAE_KEY_JITTER seeded jitter instead of SAE_CLIP_JITTER), and pick the pair with the best
// score + SAE_KEY_POSE_WEIGHT * pose evidence - SAE_GESTURE_KEY per gesture-dominated moment (- SAE_KEY_STILL_WEIGHT
// * the pair's motion cost when the stillness picker is on). Every pair also loses SAE_GESTURE_MILD per
// gesture-dominated moment.
const SAE_ROLE_TOP = 3;
const SAE_ROLE_NEAR = 0.5;
const SAE_GESTURE_MARGIN = 0;
const SAE_GESTURE_MILD = 0.05;
const SAE_GESTURE_KEY = 0.3;
const SAE_KEY_POSE_WEIGHT = 0.5;
const SAE_KEY_STILL_WEIGHT = 0.1;
const SAE_KEY_JITTER = 0.02;
// Inner bars: the clip order adds SAE_GESTURE_CLIP_MILD * (pose - hand top) to the face score (a mild nudge; the
// clip jitter is SAE_CLIP_JITTER).
const SAE_GESTURE_CLIP_MILD = 0.5;
// Seeded jitter: clip order inside one use-count/tier group, and pair choice among a clip's unused pairs.
const SAE_CLIP_JITTER = 0.1;
const SAE_PAIR_JITTER = 0.05;
// Whip angle magnitude per cut, degrees; the sign alternates cut by cut from a seeded start.
const SAE_ANGLE_MIN = 25;
const SAE_ANGLE_MAX = 35;
// Whip strength per cut (the effect's whipIn / whipOut, 0-1.5, times the global Whip strength), after the reference's
// per-bar depth: bar changes ('spin') full; inner cuts of a standard bar lighter; the "subtle" bars (odd bar indexes
// 1, 3, 5 ... before the finale, only when there are at least SAE_WHIP_SUBTLE_MIN_BARS bars: the reference's bar 2
// is a gaze alternation with barely a smear) faint; the finale's inner cuts still pop. Both sides of a cut share it.
// At 0.35 the whip still dips to ~0.1 relative sharpness on similar A/B holds at 25 fps (eval-whips' primary
// threshold is 0.3; 0.2 still reads ~0.22), so beat verification keeps finding every cut.
const SAE_WHIP_SPIN = 1;
const SAE_WHIP_INNER = 0.6;
const SAE_WHIP_SUBTLE = 0.35;
const SAE_WHIP_FINALE = 0.75;
const SAE_WHIP_SUBTLE_MIN_BARS = 4;

const saeFinite = v => typeof v === 'number' && isFinite(v);

// Seeded hash in [0, 1), memoised per key (the allocation asks for the same keys many times).
const saeHashCache = new Map();
function saeHash(str) {
  const key = String(str);
  const hit = saeHashCache.get(key);
  if (hit !== undefined) return hit;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  // Final avalanche (murmur3 fmix32): FNV alone barely changes for keys that differ only in their last character.
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  const v = (h >>> 0) / 4294967296;
  if (saeHashCache.size > 50000) saeHashCache.clear();
  saeHashCache.set(key, v);
  return v;
}

function saeEditBpm(bpm) {
  if (bpm >= SAE_EDIT_BPM_MIN && bpm <= SAE_EDIT_BPM_MAX) return bpm;
  if (bpm / 2 >= SAE_EDIT_BPM_MIN) return bpm / 2;
  return bpm;
}

// The tempo a cue (manifest entry or own-music analysis) gives the edit. cue null = no music.
// Returns { bpm (the music's beat, or SAE_FIXED_BPM when fixed), editBpm, fixed }.
function saeTempo(cue) {
  const grid = !!cue && saeFinite(cue.bpm) && cue.bpm >= SAE_GRID_BPM_MIN && cue.bpm <= SAE_GRID_BPM_MAX &&
    (cue.grid === 'accepted' || cue.grid === 'approximate');
  if (!grid) return { bpm: SAE_FIXED_BPM, editBpm: SAE_FIXED_BPM, fixed: true };
  return { bpm: cue.bpm, editBpm: saeEditBpm(cue.bpm), fixed: false };
}

// Seconds from beat 0 of the section to the end of the video (the lead is before beat 0).
function saeVideoSeconds(bars, editBpm) { return (4 * (bars - 1) + 3.5) * 60 / editBpm + SAE_END_TAIL; }

// delta: how far the music plays behind the planned grid once Selects snaps the music clip's source start
// (sourceStart = sectionStart - SAE_LEAD) to a frame. 0 without music.
function saeMusicOffset(sourceStart, fps) {
  if (!saeFinite(sourceStart) || !(fps > 0)) return 0;
  return sourceStart - Math.round(sourceStart * fps) / fps;
}

// Holds of an N-bar template in beats: [{ i, bar, moment, beats, startBeat, endBeat }].
function saeTemplate(bars) {
  if (!(bars >= 1) || Math.floor(bars) !== bars) throw Error('saeTemplate needs a whole number of bars');
  const holds = [];
  let at = 0;
  for (let k = 0; k < bars; k++) {
    const finale = k === bars - 1;
    const lengths = finale ? SAE_FINALE_BAR : SAE_STANDARD_BAR, moments = finale ? SAE_FINALE_MOMENTS : SAE_STANDARD_MOMENTS;
    for (let j = 0; j < lengths.length; j++) {
      holds.push({ i: holds.length, bar: k, moment: moments[j], beats: lengths[j], startBeat: at, endBeat: at + lengths[j] });
      at += lengths[j];
    }
  }
  return holds;
}

// opts: { editBpm (or bpm: the music's beat, mapped with saeEditBpm), fps, bars, sectionStart? (music seconds of
// beat 0; omit without music), snap?: true to snap bar-change cuts to low-band onsets (fixed tempo with own music),
// onsets?: [[music seconds, 'l'|'m'|'h', strength]], onsetThresholds?: { l, m, h } }.
// Returns { editBpm, fps, musicSourceStart (sectionStart - lead, or null), offset (delta at this fps), holds (template
// + startFrame, endFrame, frames), cutSecondsRaw (every boundary in timeline seconds WITHOUT the music offset, length
// holds + 1, first 0, last = the video end incl. the 40 ms tail), cutSeconds (raw + offset, first stays 0), cuts (inner
// cut frames), beats (timeline seconds of every whole edit beat, incl. offset), totalFrames, snapLog }.
// Boundary frame k = round(cutSeconds[k] * fps). At another fps: round((cutSecondsRaw[k] + saeMusicOffset(
// musicSourceStart, fps)) * fps) for k > 0 (assemble.js does this at the Draft's real rate).
function saeSchedule(opts) {
  const fps = opts.fps, bars = opts.bars;
  const editBpm = saeFinite(opts.editBpm) ? opts.editBpm : saeEditBpm(opts.bpm);
  if (!(editBpm > 0) || !(fps > 0) || !(bars >= 1)) throw Error('saeSchedule needs a bpm, fps and bars');
  const spb = 60 / editBpm;
  const sourceStart = saeFinite(opts.sectionStart) ? opts.sectionStart - SAE_LEAD : null;
  const offset = saeMusicOffset(sourceStart, fps);
  const tpl = saeTemplate(bars);
  const endBeat = tpl[tpl.length - 1].endBeat;
  const raw = [0].concat(tpl.slice(1).map(h => SAE_LEAD + h.startBeat * spb), [SAE_LEAD + endBeat * spb + SAE_END_TAIL]);
  const withOffset = (x, k) => (k === 0 ? 0 : x + offset);
  const frameOf = x => Math.round(x * fps);
  const snapLog = [];
  if (opts.snap && sourceStart !== null && opts.onsets && opts.onsets.length) {
    const thr = Math.max(SAE_SNAP_MIN_STRENGTH, (opts.onsetThresholds && opts.onsetThresholds.l) || 0);
    // A music onset at source second s sits at raw timeline second s - sourceStart (it plays at that + delta).
    const lows = opts.onsets.filter(o => o && o[1] === 'l' && saeFinite(o[0]) && saeFinite(o[2]) && o[2] >= thr)
      .map(o => ({ x: o[0] - sourceStart, ratio: o[2] / thr }));
    for (let i = 1; i < tpl.length; i++) {
      if (tpl[i].bar === tpl[i - 1].bar) continue; // only bar changes are anchors
      const g = raw[i];
      let best = null;
      for (const o of lows) {
        const d = Math.abs(o.x - g);
        if (d > SAE_SNAP_WINDOW + 1e-9) continue;
        const score = o.ratio - SAE_SNAP_DISTANCE_COST * d / SAE_SNAP_WINDOW;
        if (!best || score > best.score + 1e-9 || (Math.abs(score - best.score) <= 1e-9 && d < best.d)) best = { x: o.x, d, score };
      }
      if (!best) { snapLog.push({ index: i, grid: g, seconds: g, reason: 'no onset' }); continue; }
      const f = frameOf(best.x + offset);
      const before = f - frameOf(withOffset(raw[i - 1], i - 1)), after = frameOf(withOffset(raw[i + 1], i + 1)) - f;
      if (before < SAE_MIN_HOLD_FRAMES || after < SAE_MIN_HOLD_FRAMES) { snapLog.push({ index: i, grid: g, seconds: g, reason: 'reverted: hold too short' }); continue; }
      raw[i] = best.x;
      snapLog.push({ index: i, grid: g, seconds: best.x, shiftMs: Math.round((best.x - g) * 1e4) / 10, reason: 'onset' });
    }
  }
  const cutSeconds = raw.map(withOffset);
  const frames = cutSeconds.map(frameOf);
  const holds = tpl.map((h, k) => ({ ...h, startFrame: frames[k], endFrame: frames[k + 1], frames: frames[k + 1] - frames[k] }));
  const beats = [];
  for (let b = 0; b <= Math.floor(endBeat + 1e-9); b++) beats.push(SAE_LEAD + b * spb + offset);
  return { editBpm, fps, musicSourceStart: sourceStart, offset, holds, cutSecondsRaw: raw, cutSeconds, cuts: frames.slice(1, -1), beats,
    totalFrames: frames[frames.length - 1], snapLog };
}

// Moments (spec "Moments"). opts: { candidates: [{ rid, role, t, score }], durations: { [rid]: seconds },
// badSpans?: { [rid]: [[s, e], ...] }, fps, beatSeconds (window length: the longest hold a moment plays),
// margin? (default SAE_FACE_MARGIN), motion?, stillWeight? (default SAE_STILL_WEIGHT; see SAE_STILL_WEIGHT) }.
// Per clip (every rid in durations, sorted): faceScore = max over face-role hits of (score - best control score), null
// without face or control hits; face = faceScore > margin. Candidate times: every hit time (any score) plus fillers;
// a time t is kept when its window [s, s + beatSeconds] (s = t snapped down to a whole frame, and no earlier than the
// head handle: max(SAE_HEAD_FRAMES, whip frames + 1) frames; earlier times move there) misses every bad span
// and ends at least SAE_SOURCE_TAIL before the end of the source. Pairs: A and B >= max(SAE_PAIR_GAP, window) apart
// (never overlapping), best summed
// score first (scores less the still penalty; ties: farther apart, then earlier), A = the better-scoring moment; up
// to SAE_MAX_PAIRS distinct pairs, pairs whose moments no earlier pair uses first. A clip with no such pair gets one relaxed pair (its two
// farthest-apart times, or one time twice), marked relaxed and scored below every real pair.
// Pair scores also lose SAE_GESTURE_MILD per gesture-dominated moment (see SAE_ROLE_TOP).
// Returns { clips: [{ rid, duration, face, faceScore, control, pose, gesture, handTop, times, pairs: [{ a, b, score,
// gesture, pose, still, relaxed? }] }], faceCount }.
function saeMoments(opts) {
  const fps = opts.fps, win = opts.beatSeconds;
  if (!(fps > 0) || !(win > 0)) throw Error('saeMoments needs fps and beatSeconds');
  const margin = saeFinite(opts.margin) ? opts.margin : SAE_FACE_MARGIN;
  const durations = opts.durations || {}, spansOf = opts.badSpans || {};
  const head = Math.max(SAE_HEAD_FRAMES, Math.round(SAE_WHIP_SECONDS * fps) + 1);
  const still = saeFinite(opts.stillWeight) ? Math.max(0, opts.stillWeight) : SAE_STILL_WEIGHT;
  const motionOf = opts.motion || {};
  const byRid = {};
  for (const c of opts.candidates || []) {
    if (!c || typeof c.rid !== 'string' || !saeFinite(c.t) || !saeFinite(c.score)) continue;
    (byRid[c.rid] = byRid[c.rid] || []).push(c);
  }
  const clips = [];
  for (const rid of Object.keys(durations).sort()) {
    const dur = durations[rid];
    if (!saeFinite(dur) || !(dur > 0)) continue;
    const hits = byRid[rid] || [];
    let control = null, best = null;
    for (const h of hits) if (h.role === 'control' && (control === null || h.score > control)) control = h.score;
    for (const h of hits) if (SAE_FACE_ROLES.indexOf(h.role) >= 0 && (best === null || h.score > best)) best = h.score;
    const faceScore = control === null || best === null ? null : best - control;
    const face = faceScore !== null && faceScore > margin;
    // Role evidence (see SAE_ROLE_TOP): tops per role, clip pose and gesture.
    const byRole = {};
    for (const h of hits) if (SAE_FACE_ROLES.indexOf(h.role) >= 0) (byRole[h.role] = byRole[h.role] || []).push(h.score);
    const top = r => { const v = (byRole[r] || []).slice().sort((x, y) => y - x).slice(0, SAE_ROLE_TOP); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : null; };
    const poseTops = [top('selfie'), top('expression')].filter(v => v !== null);
    const pose = poseTops.length ? poseTops.reduce((x, y) => x + y, 0) / poseTops.length : null;
    const handTop = top('hand') !== null ? top('hand') : control !== null ? control : 0;
    const roleMean = {};
    for (const r of SAE_FACE_ROLES) if (byRole[r]) roleMean[r] = byRole[r].reduce((x, y) => x + y, 0) / byRole[r].length;
    const gesture = pose === null ? null : handTop - pose;
    const spans = (spansOf[rid] || []).filter(s => s && saeFinite(s[0]) && saeFinite(s[1]));
    // Window start for a time, or null when the window is not usable.
    const startOf = t => {
      if (!(t >= 0)) return null;
      const f = Math.max(head, Math.floor(t * fps + 1e-6));
      const s = f / fps, e = s + win;
      if (e > dur - SAE_SOURCE_TAIL + 1e-9) return null;
      if (spans.some(sp => s < sp[1] && e > sp[0])) return null;
      return { f, s };
    };
    // Motion cost of the window starting at s, or null without a still weight / a usable curve.
    const cost = still > 0 ? saeStillCost(motionOf[rid], win) : null;
    const times = new Map(); // frame -> { t, score, hit }
    for (const h of hits) {
      if (h.role === 'control') continue;
      const w = startOf(h.t);
      if (!w) continue;
      const old = times.get(w.f);
      if (!old || h.score > old.score) times.set(w.f, { t: w.s, score: h.score, hit: true });
    }
    if (cost) {
      // A minimum's window starts on the next whole frame (snapping down would pull in the motion sample before it).
      for (const t of cost.minima) {
        const w = startOf(Math.ceil(t * fps - 1e-6) / fps);
        if (w && !times.has(w.f)) times.set(w.f, { t: w.s, score: SAE_FILLER_SCORE, hit: false });
      }
    }
    const fillers = [];
    for (let k = 0; k * SAE_FILLER_STEP <= dur + 1e-9; k++) { const w = startOf(k * SAE_FILLER_STEP); if (w) fillers.push(w); }
    const keep = fillers.length <= SAE_MAX_FILLERS ? fillers
      : Array.from({ length: SAE_MAX_FILLERS }, (_, j) => fillers[Math.round(j * (fillers.length - 1) / (SAE_MAX_FILLERS - 1))]);
    for (const w of keep) if (!times.has(w.f)) times.set(w.f, { t: w.s, score: SAE_FILLER_SCORE, hit: false });
    const list = Array.from(times.values()).sort((p, q) => p.t - q.t);
    if (cost) for (const e of list) { e.cost = cost.at(e.t); e.score = e.score - still * e.cost; }
    // Role evidence near each moment's window: hand vs the best selfie / expression hit.
    for (const e of list) {
      const lo = e.t - SAE_ROLE_NEAR - 1e-9, hi = e.t + win + SAE_ROLE_NEAR + 1e-9, nearBest = {};
      for (const h of hits) if (h.t >= lo && h.t <= hi && (nearBest[h.role] === undefined || h.score > nearBest[h.role])) nearBest[h.role] = h.score;
      const faceNear = Math.max(nearBest.selfie !== undefined ? nearBest.selfie : -Infinity, nearBest.expression !== undefined ? nearBest.expression : -Infinity);
      e.pose = faceNear > -Infinity ? faceNear : 0;
      e.gesture = nearBest.hand !== undefined && (faceNear === -Infinity || nearBest.hand - faceNear > SAE_GESTURE_MARGIN + 1e-12) ? 1 : 0;
      let role = null, lift = -Infinity;
      for (const r of SAE_POSE_ROLES) {
        if (nearBest[r] === undefined) continue;
        const v = nearBest[r] - roleMean[r];
        if (v > lift + 1e-12) { lift = v; role = r; }
      }
      e.role = role;
    }
    // A and B never overlap: at least the window length (and SAE_PAIR_GAP) apart.
    const gap = Math.max(SAE_PAIR_GAP, win);
    const all = [];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const p = list[i], q = list[j];
        if (q.t - p.t < gap - 1e-9) continue;
        const aFirst = p.score >= q.score;
        const gesture = p.gesture + q.gesture;
        const roles = !!p.role && !!q.role && p.role !== q.role;
        const bonus = (roles ? SAE_PAIR_ROLE_BONUS : 0) + (q.t - p.t >= SAE_PAIR_SEP - 1e-9 ? SAE_PAIR_SEP_BONUS : 0);
        all.push({ a: aFirst ? p.t : q.t, b: aFirst ? q.t : p.t, score: p.score + q.score - SAE_GESTURE_MILD * gesture + bonus, sep: q.t - p.t, early: p.t,
          roles: aFirst ? [p.role, q.role] : [q.role, p.role],
          gesture, pose: p.pose + q.pose, still: cost ? p.cost + q.cost : null });
      }
    }
    all.sort((p, q) => q.score - p.score || q.sep - p.sep || p.early - q.early || p.a - q.a);
    const pairs = [], usedTimes = [];
    const near = t => usedTimes.some(u => Math.abs(u - t) < SAE_MOMENT_NEAR - 1e-9);
    for (const p of all) {
      if (pairs.length >= SAE_MAX_PAIRS) break;
      if (near(p.a) || near(p.b)) continue;
      pairs.push(saePairOut(p));
      usedTimes.push(p.a, p.b);
    }
    for (const p of all) {
      if (pairs.length >= SAE_MAX_PAIRS) break;
      if (pairs.some(x => x.a === p.a && x.b === p.b)) continue;
      pairs.push(saePairOut(p));
    }
    if (!pairs.length && list.length) {
      const p = list[0], q = list[list.length - 1];
      pairs.push({ a: p.t, b: q.t, score: p.score + q.score - 100, relaxed: true, gesture: p.gesture + q.gesture, pose: p.pose + q.pose, still: null, roles: [p.role, q.role] });
    }
    clips.push({ rid, duration: dur, face, faceScore, control, pose, gesture, handTop, times: list.length, pairs });
  }
  return { clips, faceCount: clips.filter(c => c.face && c.pairs.length).length };
}

// The pair fields saeMoments returns: { a, b, score, gesture (gesture-dominated moments, 0-2), pose (summed near
// selfie / expression evidence), still (summed motion cost, null without the stillness picker), roles ([A, B] moment
// roles, see SAE_PAIR_ROLE_BONUS) }.
function saePairOut(p) { return { a: p.a, b: p.b, score: p.score, gesture: p.gesture, pose: p.pose, still: p.still, roles: p.roles }; }

// Motion cost per window of `win` seconds for one clip's curve ({ fps, values }; see SAE_STILL_WEIGHT), or null
// when the curve is unusable. Returns { at(s): cost of the window [s, s + win], minima: window starts (seconds) at
// local minima of the cost, lowest first (ties: earlier), at most SAE_STILL_MINIMA }.
function saeStillCost(curve, win) {
  const mfps = curve && curve.fps, vals = curve && curve.values;
  if (!(mfps > 0) || !vals || !(vals.length >= 2)) return null;
  const n = vals.length, v = [];
  for (let i = 0; i < n; i++) { const x = Number(vals[i]); v.push(isFinite(x) && x > 0 ? x : 0); }
  const sorted = v.slice().sort((a, b) => a - b);
  const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  const norm = Math.max(SAE_STILL_FLOOR, median);
  const prefix = [0];
  for (let i = 0; i < n; i++) prefix.push(prefix[i] + v[i]);
  const at = s => {
    const i0 = Math.max(0, Math.floor(s * mfps + 1e-6)), i1 = Math.min(n, Math.ceil((s + win) * mfps - 1e-6));
    if (i1 <= i0) return 1;
    return Math.min(SAE_STILL_COST_MAX, (prefix[i1] - prefix[i0]) / (i1 - i0) / norm);
  };
  const c = [];
  for (let k = 0; k < n; k++) c.push(at(k / mfps));
  const minima = [];
  for (let k = 0; k < n; k++) {
    if ((k === 0 || c[k] < c[k - 1]) && (k === n - 1 || c[k] <= c[k + 1])) minima.push({ k, c: c[k] });
  }
  minima.sort((p, q) => p.c - q.c || p.k - q.k);
  return { at, minima: minima.slice(0, SAE_STILL_MINIMA).map(m => m.k / mfps) };
}

// Bars that hold photos: up to `count` of the bars 0..bars-1, inner bars (SAE_PHOTO_FIRST_BAR..bars-2) first, evenly
// spread from a seeded phase, never more than SAE_PHOTO_RUN_MAX in a row. innerOnly (any video exists): only those
// inner bars, so fewer than `count` bars may come back; otherwise bars 1, 0 and the finale may follow.
function saePhotoBars(bars, count, seed, innerOnly) {
  const out = {};
  if (!(count > 0)) return out;
  const inner = [];
  for (let k = SAE_PHOTO_FIRST_BAR; k < bars - 1; k++) inner.push(k);
  const order = [];
  const phase = saeHash(seed + ':photo-bars');
  const evenly = (pool, n) => {
    const picks = [];
    for (let k = 0; k < n && pool.length; k++) {
      const idx = Math.floor((k + phase) * pool.length / n) % pool.length;
      if (picks.indexOf(pool[idx]) < 0) picks.push(pool[idx]);
    }
    return picks;
  };
  evenly(inner, Math.min(count, inner.length)).forEach(k => order.push(k));
  // Then any remaining inner bar, then bar 0 and the finale, in seeded order.
  const edge = k => k < SAE_PHOTO_FIRST_BAR || k === bars - 1;
  const outer = [];
  for (let k = 0; k < bars; k++) if (edge(k)) outer.push(k);
  inner.concat(innerOnly ? [] : outer)
    .map(k => ({ k, v: saeHash(seed + ':photo-bar:' + k) }))
    .sort((p, q) => (edge(p.k) ? 1 : 0) - (edge(q.k) ? 1 : 0) || p.v - q.v)
    .forEach(x => { if (order.indexOf(x.k) < 0) order.push(x.k); });
  const runOk = (set, k) => {
    let left = 0, right = 0;
    for (let j = k - 1; j >= 0 && set[j]; j--) left++;
    for (let j = k + 1; j < bars && set[j]; j++) right++;
    return left + right + 1 <= SAE_PHOTO_RUN_MAX;
  };
  let n = 0;
  for (const k of order) { if (n >= count) break; if (runOk(out, k)) { out[k] = true; n++; } }
  return out;
}

// Bar allocation (spec "Bar allocation", with the user's GATE-A ruling on few face clips). opts: { clips (saeMoments
// clips), photos: [{ rid }] | [rid], bars, seed, usePhotos (default true), allowAdjacent?, allowPairReuse?
// (relaxations for tiny pools), photoRelax? (0 strict; 1: photos from bar 1 on and no Short cap; 2: also the finale;
// saePlanBuild tries them before shrinking or relaxing adjacency) }.
// Photo bars: round(bars / 3) (capped by the photos; Short edits see SAE_PHOTO_SHORT_BARS), bars
// SAE_PHOTO_FIRST_BAR..bars-2 only while any video exists, at most SAE_PHOTO_RUN_MAX in a row: photos are a default
// style element. Every other bar takes, in this order:
//   1. a face clip used fewer than SAE_FACE_MAX_USES times, least-used first (every face clip once before any face
//      repeat), then by face score plus a seeded jitter;
//   2. an extra (unused) photo, while the run limit allows (same bars as above; Short: within its photo cap);
//   3. a non-face clip, least-used first;
//   4. a face clip beyond SAE_FACE_MAX_USES uses (last resort before shrinking).
// So when face clips are few, the edit reuses them (with a different A/B pair) until one would need a third use or
// adjacency gets in the way, then photos beyond round(bars / 3), then non-face clips. Never the same rid in adjacent
// bars when >= 2 sources exist. A repeated clip takes one of its unused pairs.
// Returns { ok, bars: [{ bar, kind, rid, pair }], uses: { [rid]: n }, photoBars, failedAt? }.
function saeAllocate(opts) {
  const N = opts.bars, seed = String(opts.seed == null ? 1 : opts.seed);
  const usable = (opts.clips || []).filter(c => c && c.pairs && c.pairs.length);
  // Clips with only a relaxed pair (too short for A/B >= SAE_PAIR_GAP) are a last resort: used only when no clip has
  // a real pair, or with allowPairReuse (the tiny-pool fallback).
  const strict = usable.filter(c => c.pairs.some(q => !q.relaxed));
  const vids = strict.length && !opts.allowPairReuse ? strict : usable;
  const seenPhoto = {};
  const pics = opts.usePhotos === false ? [] : (opts.photos || [])
    .map(p => (typeof p === 'string' ? p : p && p.rid))
    .filter(r => typeof r === 'string' && !seenPhoto[r] && (seenPhoto[r] = true)).sort();
  const sources = vids.length + pics.length;
  if (!sources || !(N >= 1)) return { ok: false, bars: [], uses: {}, photoBars: 0, failedAt: 0 };
  const short = N <= SAE_PHOTO_SHORT_BARS;
  const faceVids = vids.filter(c => c.face).length;
  const photoRelax = opts.photoRelax > 0 ? opts.photoRelax : 0;
  const photoMax = short && !photoRelax ? (faceVids < SAE_PHOTO_SHORT_FACES ? SAE_PHOTO_SHORT_MAX : 0) : Infinity;
  const photoCount = Math.min(pics.length, photoMax, Math.round(N * SAE_PHOTO_SHARE));
  const photoBar = saePhotoBars(N, photoCount, seed, vids.length > 0);
  const uses = {}, pairUsed = {}, picks = [];
  let prev = null, photoRun = 0, photoBars = 0, bar = 0;
  const notPrev = rid => rid !== prev || sources < 2 || !!opts.allowAdjacent;
  // While any video exists, photos never hold the first SAE_PHOTO_FIRST_BAR bars nor the finale, and a Short edit
  // stays within its photo cap (allowRun, the tiny-pool fallback, skips these rules).
  // photoRelax 1: from bar 1 on; 2: the finale too. Bar 0 is always a video while any video exists.
  const photoBarOk = () => !vids.length ||
    (bar >= (photoRelax ? 1 : SAE_PHOTO_FIRST_BAR) && (bar !== N - 1 || photoRelax >= 2) && photoBars < photoMax);
  const pickPhoto = allowRun => {
    if (!allowRun && photoRun >= SAE_PHOTO_RUN_MAX) return null;
    if (!allowRun && !photoBarOk()) return null;
    let best = null;
    for (const rid of pics) {
      if (!notPrev(rid)) continue;
      const u = uses[rid] || 0;
      if (u > 0 && !opts.allowPairReuse) continue; // a photo holds one bar (tiny pools: fewest uses first)
      const v = saeHash(seed + ':photo:' + rid);
      if (!best || u < best.u || (u === best.u && v > best.v)) best = { rid, v, u };
    }
    return best && { kind: 'photo', rid: best.rid, pair: null };
  };
  const hasPair = c => opts.allowPairReuse || c.pairs.some((p, i) => !(pairUsed[c.rid] && pairUsed[c.rid][i]));
  // The least-used clip among those `keep` accepts, then by face score plus a seeded jitter (key bars: by key score,
  // pose - hand top, see SAE_ROLE_TOP); its best unused pair (key bars: clean face pose pairs first).
  const pickVideo = (keep, k) => {
    const key = k === 0 || k === N - 1;
    let best = null;
    for (const c of vids) {
      if (!keep(c) || !notPrev(c.rid) || !hasPair(c)) continue;
      const u = uses[c.rid] || 0;
      // Clips without selfie / expression hits keep the plain order (below every clip with a key score).
      const v = key && saeFinite(c.pose)
        ? c.pose - c.handTop + SAE_KEY_JITTER * saeHash(seed + ':key:' + c.rid + ':' + u)
        : (saeFinite(c.faceScore) ? c.faceScore : -1) + SAE_CLIP_JITTER * saeHash(seed + ':clip:' + c.rid + ':' + u) - (key ? 1 : 0) +
          (!key && saeFinite(c.pose) ? SAE_GESTURE_CLIP_MILD * (c.pose - c.handTop) : 0);
      if (!best || u < best.u || (u === best.u && (v > best.v + 1e-12 || (Math.abs(v - best.v) <= 1e-12 && c.rid < best.c.rid)))) best = { c, u, v };
    }
    if (!best) return null;
    const c = best.c, usedSet = pairUsed[c.rid] || {};
    let bp = null;
    c.pairs.forEach((p, i) => {
      const reused = !!usedSet[i];
      if (reused && !opts.allowPairReuse) return;
      const keyed = key ? SAE_KEY_POSE_WEIGHT * (p.pose || 0) - SAE_GESTURE_KEY * (p.gesture || 0) - (saeFinite(p.still) ? SAE_KEY_STILL_WEIGHT * p.still : 0) : 0;
      const v = p.score + keyed + SAE_PAIR_JITTER * saeHash(seed + ':pair:' + c.rid + ':' + i) - (reused ? 1000 : 0);
      if (!bp || v > bp.v + 1e-12) bp = { i, v };
    });
    return { kind: 'video', rid: c.rid, pair: c.pairs[bp.i], pairIndex: bp.i };
  };
  const tiers = [
    k => pickVideo(c => c.face && (uses[c.rid] || 0) < SAE_FACE_MAX_USES, k),
    () => pickPhoto(false),
    k => pickVideo(c => !c.face, k),
    k => pickVideo(c => c.face, k),
  ];
  for (let k = 0; k < N; k++) {
    bar = k;
    let pick = photoBar[k] ? pickPhoto(false) : null;
    for (let t = 0; !pick && t < tiers.length; t++) pick = tiers[t](k);
    if (!pick && (!vids.length || opts.allowAdjacent)) pick = pickPhoto(true);
    if (!pick) return { ok: false, bars: picks, uses, photoBars: picks.filter(x => x.kind === 'photo').length, failedAt: k };
    uses[pick.rid] = (uses[pick.rid] || 0) + 1;
    if (pick.kind === 'video') { (pairUsed[pick.rid] = pairUsed[pick.rid] || {})[pick.pairIndex] = true; photoRun = 0; } else { photoRun++; photoBars++; }
    picks.push({ bar: k, kind: pick.kind, rid: pick.rid, pair: pick.pair });
    prev = pick.rid;
  }
  return { ok: true, bars: picks, uses, photoBars: picks.filter(b => b.kind === 'photo').length };
}

// The whip strength of a cut inside bar `bar` of `bars` (SAE_WHIP_*): a bar change ('spin') SAE_WHIP_SPIN; inside
// the finale SAE_WHIP_FINALE; inside a subtle bar (odd index before the finale, bars >= SAE_WHIP_SUBTLE_MIN_BARS)
// SAE_WHIP_SUBTLE; inside any other standard bar SAE_WHIP_INNER.
function saeWhipStrength(kind, bar, bars) {
  if (kind === 'spin') return SAE_WHIP_SPIN;
  if (bar >= bars - 1) return SAE_WHIP_FINALE;
  if (bars >= SAE_WHIP_SUBTLE_MIN_BARS && bar % 2 === 1) return SAE_WHIP_SUBTLE;
  return SAE_WHIP_INNER;
}

// Whip kinds, angles and strengths for holds in order. A cut at a bar boundary is 'spin', inside a bar 'dir'; the
// first hold has cutIn 'none', the last cutOut 'none'. Cut j (between hold j and j + 1) gets angle sign * (25..35 deg),
// the sign alternating cut by cut from a seeded start, and strength saeWhipStrength (bar count = the last hold's bar
// + 1); both sides of a cut share kind, angle and strength (angleOut / whipOut of hold j = angleIn / whipIn of hold
// j + 1; a 'none' side has strength 0). `angle` repeats angleOut (angleIn on the last hold) for consumers that take
// one angle per clip.
function saeWhipKinds(holds, seed) {
  const s = String(seed == null ? 1 : seed);
  const sign0 = saeHash(s + ':angle-sign') < 0.5 ? 1 : -1;
  const bars = holds.reduce((m, h) => Math.max(m, h.bar + 1), 0);
  const cuts = [];
  for (let j = 0; j + 1 < holds.length; j++) {
    const mag = SAE_ANGLE_MIN + (SAE_ANGLE_MAX - SAE_ANGLE_MIN) * saeHash(s + ':angle:' + j);
    const kind = holds[j + 1].bar !== holds[j].bar ? 'spin' : 'dir';
    cuts.push({ kind, angle: Math.round(sign0 * (j % 2 ? -1 : 1) * mag * 10) / 10, strength: saeWhipStrength(kind, holds[j].bar, bars) });
  }
  return holds.map((h, i) => {
    const cin = i > 0 ? cuts[i - 1] : null, cout = i < cuts.length ? cuts[i] : null;
    return { ...h, cutIn: cin ? cin.kind : 'none', cutOut: cout ? cout.kind : 'none',
      angleIn: cin ? cin.angle : 0, angleOut: cout ? cout.angle : 0, angle: cout ? cout.angle : cin ? cin.angle : 0,
      whipIn: cin ? cin.strength : 0, whipOut: cout ? cout.strength : 0 };
  });
}

// Bar lines of a cue with a usable grid: { first, bar } in music seconds (downbeat.firstBar, else firstBeat; the
// manifest's firstBeat already includes any phaseBeats correction).
function saeBarGrid(cue) {
  const first = cue.downbeat && saeFinite(cue.downbeat.firstBar) ? cue.downbeat.firstBar : cue.firstBeat;
  return { first: saeFinite(first) ? first : 0, bar: 4 * 60 / cue.bpm };
}

// The range of section starts an edit of `bars` bars at editBpm fits in: sectionStart - LEAD >= 0 and the video end
// before the cue's fade-out. Returns { min, max } in music seconds (max < min when nothing fits).
function saeSectionRange(cue, bars, editBpm) {
  const end = (saeFinite(cue.durationSeconds) ? cue.durationSeconds : Infinity) - SAE_FADE_OUT;
  return { min: SAE_LEAD, max: end - saeVideoSeconds(bars, editBpm) };
}

// The default section: cue.defaultSection when the edit fits there, else the latest bar line that fits (cues without
// a usable grid: clamped to the range). null when the music is too short.
function saeDefaultSection(cue, bars, editBpm) {
  if (!cue) return null;
  const r = saeSectionRange(cue, bars, editBpm);
  if (r.max < r.min - 1e-9) return null;
  const def = cue.defaultSection;
  if (saeFinite(def) && def >= r.min - 1e-9 && def <= r.max + 1e-9) return def;
  if (saeTempo(cue).fixed) return Math.max(r.min, Math.min(r.max, saeFinite(def) ? def : r.min));
  const g = saeBarGrid(cue);
  const kMin = Math.ceil((r.min - g.first) / g.bar - 1e-9), kMax = Math.floor((r.max - g.first) / g.bar + 1e-9);
  return kMax >= kMin ? g.first + kMax * g.bar : null;
}

// Snaps a user-chosen section start to the nearest bar line (no usable grid: to a millisecond). With opts
// { bars, editBpm } it also clamps to the starts the edit fits in (null when none); without, only to >= SAE_LEAD.
function saeSnapSection(sec, cue, opts) {
  if (!cue || !saeFinite(sec)) return null;
  const fit = opts && opts.bars >= 1 && opts.editBpm > 0;
  const r = fit ? saeSectionRange(cue, opts.bars, opts.editBpm) : { min: SAE_LEAD, max: Infinity };
  if (r.max < r.min - 1e-9) return null;
  if (saeTempo(cue).fixed) return Math.max(r.min, Math.min(r.max, Math.round(sec * 1000) / 1000));
  const g = saeBarGrid(cue);
  const kMin = Math.ceil((r.min - g.first) / g.bar - 1e-9), kMax = Math.floor((r.max - g.first) / g.bar + 1e-9);
  if (kMax < kMin) return null;
  const k = Math.max(kMin, Math.min(kMax, Math.round((sec - g.first) / g.bar)));
  return g.first + k * g.bar;
}

// The whole plan. opts: { fps, bars (wanted; SAE_LENGTHS), seed (default 1), cue (manifest entry or own-music
// analysis { bpm, firstBeat, grid, downbeat?, durationSeconds, defaultSection?, onsets?, onsetThresholds? }; null = no
// music), sectionStart? (default saeDefaultSection), candidates, durations, badSpans?, photos?, usePhotos? (default
// true), margin?, motion?, stillWeight? (saeMoments: the stillness penalty, off by default) }.
// Tries the wanted bar count (capped so the video ends before the music's fade-out), then fewer (down to SAE_MIN_BARS)
// until the sources fill every bar under the rules; a pool too small even for that builds SAE_MIN_BARS bars with
// adjacency / pair reuse relaxed.
// Returns the plan (contract in plan.md) with ok: true, or { ok: false, notes: ['no-sources' | 'music-too-short'] }.
// Notes: 'few-face' (fewer face clips than bars), 'reused' (a source fills more than one bar), 'shrunk', 'photos-early'
// (photos relaxed into bar 1 / the finale to avoid shrinking), 'fixed-tempo'
// (music without a usable beat), 'no-music', 'adjacent' / 'pair-reuse' (relaxations used).
function saePlanBuild(opts) {
  const fps = opts.fps;
  if (!(fps > 0)) throw Error('saePlanBuild needs fps');
  const wanted = Math.max(SAE_MIN_BARS, Math.floor(opts.bars || SAE_LENGTHS.short));
  const seed = opts.seed == null ? 1 : opts.seed;
  const cue = opts.cue || null;
  const tempo = saeTempo(cue);
  const editBpm = tempo.editBpm, spb = 60 / editBpm;
  // The music caps the bar count: the most bars (<= wanted) whose video ends before the cue's fade-out. Without a
  // user section, the default section of the largest bar count that has one; with one, the largest bar count that
  // still fits after it.
  let sectionStart = null, maxBars = wanted;
  if (cue) {
    maxBars = 0;
    for (let n = wanted; n >= SAE_MIN_BARS && !maxBars; n--) {
      if (saeFinite(opts.sectionStart)) {
        if (saeSectionRange(cue, n, editBpm).max >= opts.sectionStart - 1e-9) { maxBars = n; sectionStart = opts.sectionStart; }
      } else {
        const s = saeDefaultSection(cue, n, editBpm);
        if (s !== null) { maxBars = n; sectionStart = s; }
      }
    }
    if (!maxBars) return { ok: false, notes: ['music-too-short'], fit: { bars: 0, wanted } };
  }
  const snap = !!cue && tempo.fixed && !!(cue.onsets && cue.onsets.length);
  // The longest hold a moment window must cover: hold 0 (the lead + 1 beat + the music offset, at most half a frame)
  // with 2 frames for rounding, plus an onset snap's shift. Then every hold fits in [srcStart, duration - TAIL] and
  // assemble.js never slides a window back.
  const beatSeconds = spb + SAE_LEAD + 2 / fps + (snap ? SAE_SNAP_WINDOW : 0);
  const moments = saeMoments({ candidates: opts.candidates, durations: opts.durations, badSpans: opts.badSpans, fps, beatSeconds, margin: opts.margin,
    motion: opts.motion, stillWeight: opts.stillWeight });
  const base = { clips: moments.clips, photos: opts.photos, seed, usePhotos: opts.usePhotos };
  let alloc = null, bars = 0;
  const relax = [];
  // Per bar count: the strict photo rules first, then photos from bar 1 on (no Short cap), then the finale too, before
  // shrinking; so a pool with one face clip and photos builds f0 P f0 P instead of shrinking or repeating f0
  // (notes 'photos-early').
  for (let n = maxBars; n >= SAE_MIN_BARS && !alloc; n--) {
    for (let pr = 0; pr <= 2 && !alloc; pr++) {
      const a = saeAllocate({ ...base, bars: n, photoRelax: pr });
      if (a.ok) { alloc = a; bars = n; if (pr) relax.push('photos-early'); }
    }
  }
  if (!alloc) {
    for (const r of [{ allowAdjacent: true }, { allowAdjacent: true, allowPairReuse: true }]) {
      const a = saeAllocate({ ...base, bars: SAE_MIN_BARS, photoRelax: 2, ...r });
      if (a.ok) { alloc = a; bars = SAE_MIN_BARS; relax.push('adjacent'); if (r.allowPairReuse) relax.push('pair-reuse'); break; }
    }
  }
  if (!alloc) return { ok: false, notes: ['no-sources'], fit: { bars: 0, wanted }, faceClips: moments.faceCount };
  const sched = saeSchedule({ editBpm, fps, bars, sectionStart: cue ? sectionStart : undefined, snap,
    onsets: cue && cue.onsets, onsetThresholds: cue && cue.onsetThresholds });
  // Framing per hold: photos full (A) / punch (B); face-clip videos 'tight' (a zoom toward the upper middle, where
  // selfie faces sit); other videos 'full'.
  const faceRid = {};
  for (const c of moments.clips) if (c.face) faceRid[c.rid] = true;
  const raw = sched.holds.map(h => {
    const b = alloc.bars[h.bar];
    const photo = b.kind === 'photo';
    return { i: h.i, bar: h.bar, kind: b.kind, rid: b.rid, moment: h.moment,
      srcStart: photo ? 0 : (h.moment === 'A' ? b.pair.a : b.pair.b),
      frames: h.frames, startFrame: h.startFrame, endFrame: h.endFrame,
      framing: photo ? (h.moment === 'A' ? 'full' : 'punch') : faceRid[b.rid] ? 'tight' : 'full' };
  });
  const holds = saeWhipKinds(raw, seed);
  const notes = [];
  // 'few-face': fewer face clips than video bars, so other clips or repeats fill them (the panel's "Only N close-up
  // clips found" note, N = faceClips).
  if (moments.faceCount < alloc.bars.filter(b => b.kind === 'video').length) notes.push('few-face');
  if (Object.keys(alloc.uses).some(r => alloc.uses[r] > 1)) notes.push('reused');
  if (bars < wanted) notes.push('shrunk');
  if (!cue) notes.push('no-music'); else if (tempo.fixed) notes.push('fixed-tempo');
  relax.forEach(r => notes.push(r));
  if (alloc.bars.some((b, k) => k >= SAE_PHOTO_RUN_MAX && alloc.bars.slice(k - SAE_PHOTO_RUN_MAX, k + 1).every(x => x.kind === 'photo'))) notes.push('photo-run');
  return {
    ok: true, fps, bpm: tempo.bpm, editBpm, firstBeat: cue && saeFinite(cue.firstBeat) ? cue.firstBeat : null,
    sectionStart, musicSourceStart: sched.musicSourceStart, lead: SAE_LEAD, offset: sched.offset,
    bars, totalFrames: sched.totalFrames, holds, cuts: sched.cuts, cutSecondsRaw: sched.cutSecondsRaw, cutSeconds: sched.cutSeconds,
    beats: sched.beats, notes, fit: { bars, wanted }, faceClips: moments.faceCount, photoBars: alloc.photoBars, seed,
    snapLog: sched.snapLog,
  };
}

if (typeof module !== 'undefined' && module && module.exports) {
  Object.assign(module.exports, {
    SAE_LEAD, SAE_END_TAIL, SAE_STANDARD_BAR, SAE_FINALE_BAR, SAE_LENGTHS, SAE_MIN_BARS, SAE_FIXED_BPM, SAE_FACE_MARGIN,
    SAE_FACE_ROLES, SAE_FACE_MAX_USES, SAE_SOURCE_TAIL, SAE_HEAD_FRAMES, SAE_PAIR_GAP, SAE_FADE_OUT, SAE_PHOTO_SHARE, SAE_PHOTO_RUN_MAX, SAE_SNAP_WINDOW,
    SAE_MIN_HOLD_FRAMES, SAE_ANGLE_MIN, SAE_ANGLE_MAX, SAE_WHIP_SPIN, SAE_WHIP_INNER, SAE_WHIP_SUBTLE, SAE_WHIP_FINALE, SAE_WHIP_SUBTLE_MIN_BARS, SAE_STILL_WEIGHT, SAE_STILL_FLOOR, SAE_STILL_COST_MAX, SAE_STILL_MINIMA,
    SAE_PAIR_ROLE_BONUS, SAE_PAIR_SEP, SAE_PAIR_SEP_BONUS, SAE_ROLE_TOP, SAE_ROLE_NEAR, SAE_GESTURE_MARGIN, SAE_GESTURE_MILD, SAE_GESTURE_KEY, SAE_KEY_POSE_WEIGHT, SAE_KEY_STILL_WEIGHT, SAE_KEY_JITTER, SAE_GESTURE_CLIP_MILD, SAE_PHOTO_FIRST_BAR, SAE_PHOTO_SHORT_BARS, SAE_PHOTO_SHORT_MAX, SAE_PHOTO_SHORT_FACES,
    saeStillCost, saeHash, saeEditBpm, saeTempo, saeVideoSeconds, saeMusicOffset, saeTemplate, saeSchedule, saeMoments, saePhotoBars,
    saeAllocate, saeWhipStrength, saeWhipKinds, saeBarGrid, saeSectionRange, saeDefaultSection, saeSnapSection, saePlanBuild,
  });
}
// sae-planner:end

// sae-host:start
// Host I/O through the renderer's own services, the same on macOS and Windows: no host shell, no node, no user
// installed tools. ffmpeg/ffprobe are the host's bundled binaries (Runtime.runFFmpeg/runFFprobe take an argv array,
// so paths need no quoting), and every path is built by FileSystem.join. __DI__ is internal host wiring that a newer
// or older Selects may lack, so each member is checked at call time.
// Error codes (Error.message): 'host_tools' = a needed __DI__ member is missing (show "needs a newer Selects";
// bundled cues keep working), 'timeout' = ffmpeg/ffprobe ran past timeoutMs, 'media_failed' = ffmpeg/ffprobe failed
// or produced no usable output (err.detail holds the host's message, truncated).
function saeDI() {
  let di = null;
  try { di = window.parent && window.parent.__DI__; } catch (e) { di = null; }
  if (!di) { try { di = window.__DI__; } catch (e) { di = null; } }
  const fs = di && di.FileSystem ? di.FileSystem : null;
  const rt = di && di.Runtime ? di.Runtime : null;
  return { fs, rt };
}

// names: ['fs.join', 'rt.runFFmpeg', ...]. Returns { ok, missing }.
function saeHas(names) {
  const di = saeDI();
  const missing = [];
  for (const name of names || []) {
    const dot = String(name).indexOf('.');
    const svc = di[String(name).slice(0, dot)];
    if (!svc || typeof svc[String(name).slice(dot + 1)] !== 'function') missing.push(String(name));
  }
  return { ok: missing.length === 0, missing };
}

function saeNeed(names) {
  const has = saeHas(names);
  if (!has.ok) {
    const err = new Error('host_tools');
    err.missing = has.missing;
    throw err;
  }
  return saeDI();
}

function saePlatform() {
  let p = '';
  try { const rt = saeDI().rt; if (rt && typeof rt.getPlatform === 'function') p = String(rt.getPlatform() || ''); } catch (e) { p = ''; }
  if (/^win/i.test(p)) return 'win32';
  if (/darwin|mac/i.test(p)) return 'darwin';
  if (/linux/i.test(p)) return 'linux';
  let ua = '';
  try { ua = String(navigator.userAgent || ''); } catch (e) { ua = ''; }
  if (/Windows NT/i.test(ua)) return 'win32';
  if (/Mac/i.test(ua)) return 'darwin';
  return 'linux';
}

// The installed skill folder (the host's SELECTS_USER_SKILLS_ROOT is the user's .selects/skills), or null when the
// plugin's planner.js is not there.
function saeSkillsDir(id) {
  const { fs } = saeNeed(['fs.join', 'fs.homedir', 'fs.existsSync']);
  const dir = fs.join(fs.homedir(), '.selects', 'skills', id);
  try { return fs.existsSync(fs.join(dir, 'planner.js')) ? dir : null; } catch (e) { return null; }
}

// The plugin's persistent data folder, created when missing.
function saeDataDir(id) {
  const { fs } = saeNeed(['fs.join', 'fs.homedir', 'fs.mkdirSync']);
  const dir = fs.join(fs.homedir(), '.selects', 'plugin-data', id);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function saeFail(code, cause) {
  const err = new Error(code);
  const msg = cause && (cause.stderr || cause.message) ? String(cause.stderr || cause.message) : String(cause || '');
  err.detail = msg.slice(-600);
  return err;
}

async function saeRunTool(member, args, opts) {
  const { rt } = saeNeed(['rt.' + member]);
  const timeoutMs = (opts && opts.timeoutMs) || 120000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await rt[member](args.map(String), true, controller.signal);
    return { stdout: String((r && r.stdout) || ''), stderr: String((r && r.stderr) || '') };
  } catch (e) {
    throw saeFail(controller.signal.aborted ? 'timeout' : 'media_failed', e);
  } finally {
    clearTimeout(timer);
  }
}

function saeFFmpeg(args, opts) { return saeRunTool('runFFmpeg', args, opts); }
function saeFFprobe(args, opts) { return saeRunTool('runFFprobe', args, opts); }

async function saeProbeDuration(file, opts) {
  const r = await saeFFprobe(['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', file], opts || { timeoutMs: 30000 });
  let seconds = NaN;
  try { seconds = Number(JSON.parse(r.stdout).format.duration); } catch (e) { seconds = NaN; }
  if (!(seconds > 0)) throw saeFail('media_failed', r.stderr || 'no duration');
  return seconds;
}

// Bytes as a fresh, 0-offset Uint8Array, whatever the host returned (Buffer from another realm, Uint8Array,
// ArrayBuffer, an IPC-serialized { type: 'Buffer', data: [...] } or a plain array).
function saeBytes(raw) {
  if (raw == null) return new Uint8Array(0);
  if (ArrayBuffer.isView(raw)) {
    const out = new Uint8Array(raw.byteLength);
    out.set(new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength));
    return out;
  }
  if (Object.prototype.toString.call(raw) === '[object ArrayBuffer]') return new Uint8Array(raw.slice(0));
  if (raw && Array.isArray(raw.data)) return Uint8Array.from(raw.data);
  if (Array.isArray(raw)) return Uint8Array.from(raw);
  return new Uint8Array(0);
}

async function saeReadBytes(fs, file) {
  if (typeof fs.readFileSync === 'function') return saeBytes(fs.readFileSync(file));
  return saeBytes(await fs.readFile(file));
}

// An ffmpeg output file: missing or empty (ffmpeg resolved without writing it) is media_failed, not a raw read error.
async function saeReadOutput(fs, file, what) {
  let bytes;
  try {
    bytes = await saeReadBytes(fs, file);
  } catch (e) {
    throw saeFail('media_failed', what + ' missing: ' + String((e && e.message) || e));
  }
  if (!bytes.byteLength) throw saeFail('media_failed', 'empty ' + what);
  return bytes;
}

// Best effort; a leftover file in the data folder is harmless.
async function saeRemove(fs, file) {
  try {
    if (typeof fs.unlinkSync === 'function') return fs.unlinkSync(file);
    if (typeof fs.removeFile === 'function') return await fs.removeFile({ filePath: file });
    if (typeof fs.rmSync === 'function') return fs.rmSync(file, { force: true });
  } catch (e) { /* ignored */ }
}

function saeToken() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function saeNeedReader() {
  const di = saeDI();
  if (!di.fs || (typeof di.fs.readFileSync !== 'function' && typeof di.fs.readFile !== 'function')) {
    const err = new Error('host_tools');
    err.missing = ['fs.readFileSync'];
    throw err;
  }
}

// Mono 22050 Hz float samples of the first maxSeconds of `file` (the beat detector's input).
async function saeDecodePcm(file, dataDir, maxSeconds) {
  const { fs } = saeNeed(['rt.runFFmpeg', 'fs.join']);
  saeNeedReader();
  const out = fs.join(dataDir, 'pcm-' + saeToken() + '.f32');
  try {
    await saeFFmpeg(['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-i', file, '-t', String(maxSeconds || 360),
      '-vn', '-ac', '1', '-ar', '22050', '-f', 'f32le', out], { timeoutMs: 120000 });
    const bytes = await saeReadOutput(fs, out, 'samples');
    if (bytes.byteLength < 4) throw saeFail('media_failed', 'no samples');
    return new Float32Array(bytes.buffer, 0, Math.floor(bytes.byteLength / 4));
  } finally {
    await saeRemove(fs, out);
  }
}

// Motion curve of a video for the stillness picker (planner SAE_STILL_WEIGHT): SAE_MOTION_FPS gray frames per second
// at a fixed SAE_MOTION_W x SAE_MOTION_H (any aspect squeezes to it; only frame-to-frame change matters), the first
// maxSeconds. saeMotionArgs and saeMotionValues are pure, so the headless driver runs the same ffmpeg argv and the
// same arithmetic in node.
const SAE_MOTION_FPS = 8;
const SAE_MOTION_W = 32;
const SAE_MOTION_H = 56;
function saeMotionArgs(file, out, maxSeconds) {
  return ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-i', file, '-t', String(maxSeconds || 120), '-an',
    '-vf', 'fps=' + SAE_MOTION_FPS + ',scale=' + SAE_MOTION_W + ':' + SAE_MOTION_H + ',setsar=1,format=gray', '-f', 'rawvideo', out];
}
// values[i] = mean absolute difference (0-255) between frames i and i + 1, or null when the bytes are not at least two
// whole frames.
function saeMotionValues(bytes) {
  const size = SAE_MOTION_W * SAE_MOTION_H;
  const frames = bytes && bytes.byteLength % size === 0 ? bytes.byteLength / size : 0;
  if (frames < 2) return null;
  const values = new Float32Array(frames - 1);
  for (let i = 0; i < frames - 1; i++) {
    let sum = 0;
    const a = i * size, b = a + size;
    for (let k = 0; k < size; k++) sum += Math.abs(bytes[b + k] - bytes[a + k]);
    values[i] = sum / size;
  }
  return values;
}
// { fps, values } for `file` (opts: { maxSeconds (default 120), timeoutMs (default 90000) }). Errors as above; the
// caller treats any failure as "motion unknown".
async function saeMotionCurve(file, dataDir, opts) {
  const { fs } = saeNeed(['rt.runFFmpeg', 'fs.join']);
  saeNeedReader();
  const o = opts || {};
  const out = fs.join(dataDir, 'motion-' + saeToken() + '.gray');
  try {
    await saeFFmpeg(saeMotionArgs(file, out, o.maxSeconds), { timeoutMs: o.timeoutMs || 90000 });
    const values = saeMotionValues(await saeReadOutput(fs, out, 'frames'));
    if (!values) throw saeFail('media_failed', 'too few frames');
    return { fps: SAE_MOTION_FPS, values };
  } finally {
    await saeRemove(fs, out);
  }
}

// A blob: URL of `duration` seconds from `start` (mp3 128k; WAV when the host ffmpeg has no mp3 encoder).
// The caller revokes it with URL.revokeObjectURL.
async function saePreviewUrl(file, start, duration, dataDir) {
  const { fs } = saeNeed(['rt.runFFmpeg', 'fs.join']);
  saeNeedReader();
  const token = saeToken();
  const cut = ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-ss', Number(start || 0).toFixed(3), '-t',
    Number(duration).toFixed(3), '-i', file, '-vn'];
  const tries = [
    { out: fs.join(dataDir, 'preview-' + token + '.mp3'), args: ['-c:a', 'libmp3lame', '-b:a', '128k', '-f', 'mp3'], type: 'audio/mpeg' },
    { out: fs.join(dataDir, 'preview-' + token + '.wav'), args: ['-ac', '2', '-ar', '44100', '-c:a', 'pcm_s16le', '-f', 'wav'], type: 'audio/wav' },
  ];
  let lastErr = null;
  for (const t of tries) {
    try {
      await saeFFmpeg(cut.concat(t.args, [t.out]), { timeoutMs: 60000 });
      const bytes = await saeReadOutput(fs, t.out, 'preview');
      return URL.createObjectURL(new Blob([bytes], { type: t.type }));
    } catch (e) {
      lastErr = e;
      if (e && (e.message === 'host_tools' || e.message === 'timeout')) break;
    } finally {
      await saeRemove(fs, t.out);
    }
  }
  throw lastErr || saeFail('media_failed', 'preview');
}

function saeLooksWindows(p) {
  return /^[A-Za-z]:([\\/]|$)/.test(p) || p.indexOf('\\') >= 0;
}

// Host paths compared NFC-normalized; when either side looks like a Windows path, also separator-normalized and
// case-folded. POSIX paths stay case-sensitive.
function saeSamePath(a, b) {
  if (a == null || b == null) return false;
  let x = String(a).normalize('NFC'), y = String(b).normalize('NFC');
  if (x === y) return true;
  if (!saeLooksWindows(x) && !saeLooksWindows(y)) return false;
  const fold = (p) => {
    let s = p.replace(/\\/g, '/');
    if (s.length > 1 && !/^[A-Za-z]:\/$/.test(s)) s = s.replace(/\/+$/, '');
    return s.toLowerCase();
  };
  return fold(x) === fold(y);
}

function saeBaseName(p) {
  const parts = String(p == null ? '' : p).split(/[\\/]+/).filter(Boolean);
  return (parts.length ? parts[parts.length - 1] : '').normalize('NFC');
}

// Lets the panel paint (a busy state) before a long synchronous step such as beat detection.
function saeYield() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
// sae-host:end

// Beat detection for "Your own music": the kit's beat-detect.cjs (pure JS) up to its module.exports line, wrapped
// so its helpers stay private. Used on the main thread only when a Web Worker cannot run (see saeBeatWorkerSource).
// sae-beat:start
const saeBeat = (function () {
'use strict';
// Beat grid for Selects style apps (shared kit copy). Spectral-flux onsets, then the tempo and phase whose grid best meets them.
// CLI: node beat-detect.cjs <mono-f32le-file> <sampleRate> [<out.json>]  -> one JSON line on stdout, or, with
// <out.json>, the result written there and {"ok":true} on stdout (the panel's shell output is capped at 48 KB, and a
// long track's onsets can come close). Errors are always {"error": ...} on stdout with exit status 1.
const WIN = 1024, HOP = 256;
// Frame f analyses samples [f*HOP - WIN, f*HOP) (negative indices read as silence, so an onset
// at t = 0 still registers). Its flux measures what entered since frame f-1, i.e. samples
// [f*HOP - HOP, f*HOP); each frame is stamped at the middle of that span so onset times are
// approximately unbiased, +7 ms on clicks (stamping at the window start put every onset ~36 ms early).
const FRAME_LAG = -HOP / 2;
// An onset must rise at least this far above the local flux mean, relative to that mean.
// Measured on picked peaks: white noise 0.05-0.19, a real 99 BPM track 1.15-4.0, clicks 7-11.
const MIN_PROMINENCE = 0.5;
// A beat window below this fraction of the track's median per-beat RMS (-20 dB) is leading silence.
const SILENT_BEAT = 0.1;
// Onsets in the envelope peak about this long after the attack (7 ms on clicks through the flux window). The first
// beat is corrected by it, and the 16th-onset ratio reads the envelope this much after each grid position.
const ONSET_LAG = 0.007;
// 16th-onset ratio window: the envelope maximum within this many seconds of each grid position.
const RATIO_WINDOW = 0.03;
// Grid acceptance (v2.7). A grid line "hits" when an onset lies within HIT_WINDOW of it; its residual is that distance.
// Lines are counted from the first beat up to the last onset (a silent or onset-free outro does not dilute hitRate).
// - Strict: median residual <= RESIDUAL_MAX_MS and hitRate >= HIT_RATE_MIN over at least STRICT_MIN_HITS hits (every
//   bundled cue; the shortest reference clip has 11). Counting lines only up to the last onset would otherwise give
//   a lone onset in noise hitRate 1.
// - Sparse: lo-fi and half-time grooves put a kick or snare on only some beats (a CC0 lo-fi track at 120 BPM: hitRate
//   0.45, but a 4.3 ms median residual over 188 hits, and 97% of its onsets on the beat or the 8th between). A median
//   residual <= SPARSE_RESIDUAL_MS over at least SPARSE_MIN_HITS hits with hitRate >= SPARSE_HIT_RATE is accepted too.
//   Random onsets near a grid have residuals spread over 0-70 ms (median about 35); the hit floor keeps a handful of
//   chance hits (noise has 1, at 0.4-3.6 ms) from passing.
// - Consistency, required by both, over CONSISTENCY_WINDOW-second windows CONSISTENCY_HOP apart:
//   a) residual: a window with at least CONSISTENCY_MIN_HITS hits keeps its median residual <= RESIDUAL_MAX_MS;
//   b) on-grid share: a window with at least ONGRID_MIN_ONSETS onsets keeps the share of its onsets within
//      ONGRID_WINDOW of a beat or half-beat line at >= ONGRID_MIN_RATIO x the track's share. (a) catches a wrong
//      tempo in dense music (hits keep coming, but loose); (b) catches it in sparse music, where the wrong stretch
//      yields misses rather than loose hits and (a) never has enough hits to judge. Hit density per window does not
//      work for (b): the lo-fi track's intro window has 0.44 x its hit rate, as low as the sparse tempo changes.
//   Measured: every positive (bundled cues, reference audio, the lo-fi track, with or without a silent outro) has
//   window residuals <= 13.1 ms and on-grid ratios >= 0.93; cues joined at different tempos 32-40 ms or ratios
//   0.44-0.58; sparse kicks changing tempo ratios 0.30-0.32; a rubato piano 23.5 ms. What it guarantees: a grid that
//   is wrong for at least one whole window (about 30 s of music with onsets) is refused when that window has 12+
//   loose hits (a) or 8+ onsets mostly off the beat and half-beat lines (b). Not caught: a shorter wrong stretch; a
//   track under about 30 s (a single window, so a tempo change inside it); a window with under 8 onsets and under 12
//   hits; and a wrong stretch whose onsets still fall on beat or half-beat lines, such as a half-beat phase slip.
// grid: 'accepted' (either rule and consistent); 'approximate' (consistent, as tight as the sparse rule, median
// residual <= SPARSE_RESIDUAL_MS over >= SPARSE_MIN_HITS hits, but hitRate under SPARSE_HIT_RATE; it still needs
// hitRate >= APPROX_HIT_RATE, about one hit a bar, and hits in at least two CONSISTENCY_HOP-second blocks, so a kick
// every few bars, which fits many tempos, is not a tempo: the tempo and first beat are a usable guide, cuts on them may
// miss the heard beat); else 'none'. A looser median is not called a tempo: a rubato piano measures 19.7 ms and
// looped speech 11.9 ms.
const HIT_WINDOW = 0.07;
const RESIDUAL_MAX_MS = 20;
const HIT_RATE_MIN = 0.7;
const STRICT_MIN_HITS = 8;
const SPARSE_RESIDUAL_MS = 10;
const SPARSE_HIT_RATE = 0.35;
const SPARSE_MIN_HITS = 16;
const APPROX_HIT_RATE = 0.2;
const CONSISTENCY_WINDOW = 30;
const CONSISTENCY_HOP = 15;
const CONSISTENCY_MIN_HITS = 12;
const ONGRID_WINDOW = 0.035;
const ONGRID_MIN_ONSETS = 8;
const ONGRID_MIN_RATIO = 0.7;
const GRID_RANK = { none: 0, approximate: 1, accepted: 2 };
// The half-beat move (offBeatLocked) is taken unless it lowers the grid state: an accepted fit never becomes
// approximate or none, an approximate fit never none.
const takeFlip = (fit, flipped) => GRID_RANK[flipped.grid] >= GRID_RANK[fit.grid];
// Upper median, as residualMedianMs reports it.
const upperMedian = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
const sparseTight = (med, hits) => med != null && med <= SPARSE_RESIDUAL_MS && hits >= SPARSE_MIN_HITS;
// The grid state from evaluate()'s measures: hits ([line time, residual ms]), the counted line count, the onsets
// (seconds) and the grid (firstBeat, period).
function gridState({ hits, beats, onsets, firstBeat, period, durationSeconds }) {
  const med = upperMedian(hits.map(h => h[1]));
  const rate = beats ? hits.length / beats : 0;
  const half = period / 2;
  const onGrid = o => { const d = (((o - firstBeat) % half) + half) % half; return Math.min(d, half - d) < ONGRID_WINDOW; };
  const heard = onsets.filter(o => o >= firstBeat - ONGRID_WINDOW);
  const share = heard.length ? heard.filter(onGrid).length / heard.length : 0;
  let consistent = true;
  for (let w = 0; consistent && (w === 0 || w + CONSISTENCY_HOP < durationSeconds); w += CONSISTENCY_HOP) {
    const r = hits.filter(h => h[0] >= w && h[0] < w + CONSISTENCY_WINDOW).map(h => h[1]);
    if (r.length >= CONSISTENCY_MIN_HITS && upperMedian(r) > RESIDUAL_MAX_MS) consistent = false;
    const o = heard.filter(t => t >= w && t < w + CONSISTENCY_WINDOW);
    if (o.length >= ONGRID_MIN_ONSETS && o.filter(onGrid).length / o.length < ONGRID_MIN_RATIO * share) consistent = false;
  }
  const strict = med != null && med <= RESIDUAL_MAX_MS && rate >= HIT_RATE_MIN && hits.length >= STRICT_MIN_HITS;
  const sparse = sparseTight(med, hits.length) && rate >= SPARSE_HIT_RATE;
  if (consistent && (strict || sparse)) return 'accepted';
  const blocks = new Set(hits.map(h => Math.floor(h[0] / CONSISTENCY_HOP))).size;
  return consistent && sparseTight(med, hits.length) && rate >= APPROX_HIT_RATE && blocks >= 2 ? 'approximate' : 'none';
}

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ar = re[i + k], ai = im[i + k];
        const br = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const bi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ar + br; im[i + k] = ai + bi;
        re[i + k + len / 2] = ar - br; im[i + k + len / 2] = ai - bi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}

// Spectral flux per frame of `hop` samples; the local mean spans +/- 8 default hops (~93 ms) at any hop.
function onsetEnvelope(x, hop = HOP) {
  const frames = Math.floor(x.length / hop) + 1;
  const radius = Math.round(8 * HOP / hop);
  const win = new Float64Array(WIN).map((_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (WIN - 1)));
  const env = new Float64Array(frames);
  let prev = new Float64Array(WIN / 2);
  const re = new Float64Array(WIN), im = new Float64Array(WIN);
  for (let f = 0; f < frames; f++) {
    for (let i = 0, j = f * hop - WIN; i < WIN; i++, j++) { re[i] = (j >= 0 ? x[j] : 0) * win[i]; im[i] = 0; }
    fft(re, im);
    let flux = 0;
    const mag = new Float64Array(WIN / 2);
    for (let k = 0; k < WIN / 2; k++) {
      mag[k] = Math.log1p(10 * Math.hypot(re[k], im[k]));
      if (f > 0) flux += Math.max(0, mag[k] - prev[k]);
    }
    env[f] = flux; prev = mag;
  }
  // Remove the local mean so sustained loud passages do not look like onsets.
  // Normalising by the maximum makes the envelope scale-free, so `strong` keeps the absolute
  // prominence test that separates real onsets from broadband noise fluctuations.
  const out = new Float64Array(frames), strong = new Uint8Array(frames);
  let max = 0;
  for (let f = 0; f < frames; f++) {
    let s = 0, c = 0;
    for (let k = Math.max(0, f - radius); k < Math.min(frames, f + radius); k++) { s += env[k]; c++; }
    const mean = s / c;
    out[f] = Math.max(0, env[f] - mean);
    strong[f] = out[f] > MIN_PROMINENCE * mean ? 1 : 0;
    if (out[f] > max) max = out[f];
  }
  if (max > 0) for (let f = 0; f < frames; f++) out[f] /= max;
  return { env: out, strong };
}

function gridScore(env, fps, t0, period, phase, t1) {
  let s = 0, c = 0;
  for (let t = phase; t < t1; t += period) {
    const i = Math.round((t - t0) * fps);
    if (i < 1 || i >= env.length - 1) continue;
    s += Math.max(env[i - 1], env[i], env[i + 1]); c++;
  }
  return c ? s / c : 0;
}

function bestPhase(env, fps, t0, period, t1, step) {
  let best = { score: -1, phase: 0 };
  for (let phase = 0; phase < period; phase += step) {
    const score = gridScore(env, fps, t0, period, phase, t1);
    if (score > best.score) best = { score, phase };
  }
  return best;
}

const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

// How clearly the music articulates 16th notes: the median onset strength on the 16th offbeats (.25 and .75 of a
// beat) divided by the median on the beats, over [firstBeat, endSeconds). Uses a finer (128-sample) envelope so
// 16ths at up to ~180 BPM stay apart. null when there is no grid or no on-beat onset.
function sixteenthRatio(samples, sampleRate, bpm, firstBeat, endSeconds) {
  if (!(bpm > 0) || !(firstBeat >= 0)) return null;
  const hop = HOP / 2, { env } = onsetEnvelope(samples, hop);
  const rate = sampleRate / hop, t0 = -hop / 2 / sampleRate, q16 = 60 / bpm / 4;
  const end = Math.min(endSeconds == null ? Infinity : endSeconds, samples.length / sampleRate) - 0.05;
  const on = [], off = [];
  for (let q = 0; firstBeat + q * q16 < end; q++) {
    if (q % 4 === 2) continue;
    const t = firstBeat + q * q16;
    if (t < 0.03) continue;
    const c = (t + ONSET_LAG - t0) * rate;
    let m = 0;
    for (let i = Math.max(0, Math.floor(c - RATIO_WINDOW * rate)); i <= Math.min(env.length - 1, Math.ceil(c + RATIO_WINDOW * rate)); i++) m = Math.max(m, env[i]);
    (q % 4 === 0 ? on : off).push(m);
  }
  const a = median(on), b = median(off);
  return a > 0 && b != null ? Math.round(b / a * 1000) / 1000 : null;
}

// Band onsets for cut snapping (the planner's onset snap). Spectral flux of log magnitudes in three bands (low < 150 Hz,
// mid 150-2000 Hz, high > 5 kHz; the bands of the reference-edit analysis), lag-2 difference over a 2.9 ms hop,
// 3-frame smoothing, then peaks that are the maximum within +/- 50 ms. A peak's strength is its flux over the band's
// median flux. It qualifies when the strength reaches the band threshold max(2, 80th percentile of the band's peak
// strengths). Frames are centred on their stamp, which puts the flux peak about 15 ms before the attack (measured on
// synthetic kick, snare and hat hits in every band), so each onset is moved forward by BAND_ONSET_LAG.
const BAND_ONSET_LAG = 0.015;
const ONSET_BANDS = [['l', 20, 150], ['m', 150, 2000], ['h', 5000, Infinity]];
const ONSET_MIN_STRENGTH = 2;
const ONSET_PERCENTILE = 0.8;
function percentile(values, q) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b), x = q * (s.length - 1), i = Math.floor(x);
  return i + 1 < s.length ? s[i] + (s[i + 1] - s[i]) * (x - i) : s[i];
}
// Returns { onsets: [[seconds, band 'l' | 'm' | 'h', strength], ...] sorted by time (qualifying onsets only; time to
// the millisecond, strength to 0.1), thresholds: { l, m, h } (floored to 0.1, so every listed strength reaches its
// band's threshold) }.
// The smoothed flux of each band ([low, mid, high] Float64Arrays), the hop in samples and the frame count; frame i is
// stamped at i * hop / sampleRate, so an onset peaking at frame i is at that time + BAND_ONSET_LAG.
function bandFlux(samples, sampleRate) {
  const scale = Math.max(1, Math.round(sampleRate / 22050));
  const nfft = 1024 * scale, hop = 64 * scale, lag = 2;
  const frames = Math.floor(samples.length / hop) + 1;
  const win = new Float64Array(nfft).map((_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / nfft));
  const bins = ONSET_BANDS.map(([, lo, hi]) => [Math.max(1, Math.ceil(lo * nfft / sampleRate)), Math.min(nfft / 2, Math.ceil(hi * nfft / sampleRate))]);
  const flux = ONSET_BANDS.map(() => new Float64Array(frames));
  // The last `lag` log spectra, kept in a ring so memory stays flat for long tracks.
  const ring = Array.from({ length: lag + 1 }, () => new Float64Array(nfft / 2));
  const re = new Float64Array(nfft), im = new Float64Array(nfft);
  for (let f = 0; f < frames; f++) {
    for (let i = 0, j = f * hop - nfft / 2; i < nfft; i++, j++) { re[i] = (j >= 0 && j < samples.length ? samples[j] : 0) * win[i]; im[i] = 0; }
    fft(re, im);
    const cur = ring[f % (lag + 1)], old = ring[(f + 1) % (lag + 1)];
    for (let k = 0; k < nfft / 2; k++) cur[k] = Math.log1p(100 * Math.hypot(re[k], im[k]));
    if (f < lag) continue;
    bins.forEach(([k0, k1], b) => { let s = 0; for (let k = k0; k < k1; k++) s += Math.max(0, cur[k] - old[k]); flux[b][f] = s; });
  }
  const smooth = flux.map(d => {
    const e = new Float64Array(frames);
    for (let f = 0; f < frames; f++) e[f] = ((f > 0 ? d[f - 1] : 0) + d[f] + (f + 1 < frames ? d[f + 1] : 0)) / 3;
    return e;
  });
  return { flux: smooth, hop, frames };
}

// Returns { onsets: [[seconds, band 'l' | 'm' | 'h', strength], ...] sorted by time (qualifying onsets only; time to
// the millisecond, strength to 0.1), thresholds: { l, m, h } (floored to 0.1, so every listed strength reaches its
// band's threshold) }. `flux` (a bandFlux result) is reused when given.
function bandOnsets(samples, sampleRate, flux) {
  const { flux: smooth, hop, frames } = flux || bandFlux(samples, sampleRate);
  const gap = Math.round(0.05 * sampleRate / hop), onsets = [], thresholds = {};
  ONSET_BANDS.forEach(([band], b) => {
    const e = smooth[b];
    const med = (percentile(Array.from(e), 0.5) || 0) + 1e-9;
    const peaks = [];
    for (let i = 1; i < frames - 1; i++) {
      if (!(e[i] > 0)) continue;
      let top = true;
      for (let q = Math.max(0, i - gap); q <= Math.min(frames - 1, i + gap) && top; q++) if (e[q] > e[i]) top = false;
      if (top) peaks.push([i * hop / sampleRate + BAND_ONSET_LAG, e[i] / med]);
    }
    const thr = Math.floor(Math.max(ONSET_MIN_STRENGTH, percentile(peaks.map(p => p[1]), ONSET_PERCENTILE) || 0) * 10) / 10;
    thresholds[band] = thr;
    for (const [t, s] of peaks) if (s >= thr) onsets.push([Math.round(t * 1000) / 1000, band, Math.round(s * 10) / 10]);
  });
  onsets.sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
  return { onsets, thresholds };
}

// Phase sanity check (v2.6). The broadband fit can lock onto the 8th off-beats when hats or ghost notes on the "and"s
// carry more flux than the beats (Downtown Funk Break: first beat 0.341 s, half a beat late). On the beat the kick
// (low band) should hit, and in 4/4 pop and funk the snare (mid band) marks every other beat (the backbeat, 2 and 4).
// For the fitted phase and the phase half a beat on, over [0, t1): low = the mean low-band flux peak within
// PHASE_WINDOW of each grid line; backbeat = the mean mid-band peak on the stronger of the two alternating beat sets
// (which beat is 1 is unknown). The phase moves only when the other grid wins on both, by PHASE_LOW_MARGIN and
// PHASE_BACKBEAT_MARGIN: a track with its bass on the off-beats (Weekend Indie Pop: low 1.66x on the off-beats, but
// backbeat 1.01x) or the reference edit's music (low 1.28x, backbeat 0.76x) keeps its grid. Measured on the bundled
// cues' fitted grids: Downtown Funk Break low 1.16x / backbeat 1.22x on the other phase; every other cue, the reference
// audio and the two Sinatra references at most 1.03x backbeat when low is above 1.
const PHASE_WINDOW = 0.03;
const PHASE_LOW_MARGIN = 1.05;
const PHASE_BACKBEAT_MARGIN = 1.1;
function phaseEvidence(bf, sampleRate, attack, period, t1) {
  const peak = (e, t) => {
    const c = (t - BAND_ONSET_LAG) * sampleRate / bf.hop, r = PHASE_WINDOW * sampleRate / bf.hop;
    let m = 0;
    for (let i = Math.max(0, Math.floor(c - r)); i <= Math.min(e.length - 1, Math.ceil(c + r)); i++) if (e[i] > m) m = e[i];
    return m;
  };
  let low = 0, n = 0;
  const mid = [0, 0], count = [0, 0];
  for (let t = attack; t < t1 - 0.05; t += period, n++) {
    low += peak(bf.flux[0], t);
    mid[n % 2] += peak(bf.flux[1], t); count[n % 2]++;
  }
  return { beats: n, low: n ? low / n : 0, backbeat: Math.max(count[0] ? mid[0] / count[0] : 0, count[1] ? mid[1] / count[1] : 0) };
}
// true when the grid half a beat on is clearly the beat (phaseEvidence of both, at the attack times).
function offBeatLocked(bf, sampleRate, attack, period, t1) {
  const fit = phaseEvidence(bf, sampleRate, attack, period, t1), alt = phaseEvidence(bf, sampleRate, attack + period / 2, period, t1);
  if (fit.beats < 8 || alt.beats < 8 || !(fit.low > 0) || !(fit.backbeat > 0)) return false;
  return alt.low >= PHASE_LOW_MARGIN * fit.low && alt.backbeat >= PHASE_BACKBEAT_MARGIN * fit.backbeat;
}

// opts.phaseBeats (dev only, default 0): move the grid by this many beats before the first beat is chosen, after the
// phase sanity check (offBeatLocked); no bundled cue needs it since v2.6.
function analyze(samples, sampleRate, opts) {
  const durationSeconds = samples.length / sampleRate;
  const { env, strong } = onsetEnvelope(samples);
  const fps = sampleRate / HOP;
  const t0 = FRAME_LAG / sampleRate;                        // time of frame 0
  const t1 = Math.min(durationSeconds, 60);                 // tempo from the first minute
  let best = { score: -1, bpm: 120, phase: 0 };
  for (let bpm = 70; bpm <= 180; bpm += 0.5) {
    const r = bestPhase(env, fps, t0, 60 / bpm, t1, 0.01);
    if (r.score > best.score) best = { score: r.score, bpm, phase: r.phase };
  }
  for (let bpm = best.bpm - 0.5; bpm <= best.bpm + 0.5; bpm += 0.02) {
    const r = bestPhase(env, fps, t0, 60 / bpm, t1, 0.004);
    if (r.score > best.score) best = { score: r.score, bpm, phase: r.phase };
  }
  // Prefer the octave inside 80-160 BPM when it explains the onsets nearly as well.
  const octave = m => { const r = bestPhase(env, fps, t0, 60 / (best.bpm * m), t1, 0.004); return { score: r.score, bpm: best.bpm * m, phase: r.phase }; };
  if (best.bpm < 80) { const d = octave(2); if (d.score >= 0.9 * best.score) best = d; }
  else if (best.bpm > 160) { const h = octave(0.5); if (h.score >= 0.9 * best.score) best = h; }
  let period = 60 / best.bpm;

  const onsets = [];
  for (let i = 1; i < env.length - 1; i++) if (strong[i] && env[i] > 0.25 && env[i] >= env[i - 1] && env[i] >= env[i + 1]) onsets.push(t0 + i / fps);
  // The +/-1 frame tolerance in gridScore leaves a flat score plateau in both tempo and phase,
  // and the searches keep its lowest value. Fit t = phase + k * period by least squares to the
  // onsets that sit on the grid instead.
  let phase = best.phase;
  const ks = [], ts = [];
  for (const o of onsets) {
    if (o >= t1) break;
    const k = Math.round((o - phase) / period);
    if (Math.abs(o - phase - k * period) < 0.03) { ks.push(k); ts.push(o); }
  }
  if (ks.length >= 8) {
    const n = ks.length, mk = ks.reduce((a, b) => a + b) / n, mt = ts.reduce((a, b) => a + b) / n;
    let sxy = 0, sxx = 0;
    for (let i = 0; i < n; i++) { sxy += (ks[i] - mk) * (ts[i] - mt); sxx += (ks[i] - mk) ** 2; }
    const fit = sxx > 0 ? sxy / sxx : period;
    if (Math.abs(fit - period) < 0.01 * period) { period = fit; phase = mt - fit * mk; }
  }
  // Level, first beat and acceptance of the grid at one phase (fitted phase, before opts.phaseBeats).
  const evaluate = ph => {
    ph = ((ph % period) + period) % period;
    if (ph > period - 0.03) ph = Math.max(0, ph - period);
    // The first beat is the first grid line that is not leading silence. Judge by level, not by
    // onsets: a first beat with a soft attack (a pad swelling in) is audible music with no onset.
    // Each beat window starts 30 ms early so it holds its own attack but not the next one.
    const beatRms = t => {
      const a = Math.max(0, Math.floor((t - 0.03) * sampleRate)), z = Math.min(samples.length, Math.floor((t + period - 0.03) * sampleRate));
      let q = 0;
      for (let i = a; i < z; i++) q += samples[i] * samples[i];
      return Math.sqrt(q / Math.max(1, z - a));
    };
    const levels = [];
    for (let t = ph; t + period <= durationSeconds; t += period) levels.push(beatRms(t));
    levels.sort((a, b) => a - b);
    const quiet = SILENT_BEAT * (levels.length ? levels[Math.floor(levels.length / 2)] : 0);
    let fb = ph;
    while (fb + period < durationSeconds && beatRms(fb) <= quiet) fb += period;
    if (beatRms(fb) <= quiet) fb = ph;
    // Onsets peak ONSET_LAG after the attack, so the grid fitted to them is that much late (measured 6-8 ms on the
    // bundled cues against the rendered audio). Move the first beat back onto the attack.
    fb = Math.max(0, fb - ONSET_LAG);
    const hits = [];
    let beats = 0;
    const lastOnset = onsets.length ? onsets[onsets.length - 1] : 0;
    for (let t = fb; t < durationSeconds && t < lastOnset + HIT_WINDOW; t += period) {
      beats++;
      let near = Infinity;
      for (const o of onsets) { const d = Math.abs(o - t); if (d < near) near = d; }
      if (near < HIT_WINDOW) hits.push([t, near * 1000]);
    }
    const residuals = hits.map(h => h[1]).sort((a, b) => a - b);
    const med = residuals.length ? residuals[Math.floor(residuals.length / 2)] : Infinity;
    const rate = beats ? residuals.length / beats : 0;
    const grid = gridState({ hits, beats, onsets, firstBeat: fb, period, durationSeconds });
    return { firstBeat: fb, residualMedianMs: med, hitRate: rate, accepted: grid === 'accepted', grid };
  };
  // The fitted phase is on the onset-envelope peaks, ONSET_LAG after the attacks that the band flux is stamped at.
  // The half-beat move is refused when it would lower the grid state the fitted phase had (accepted > approximate > none).
  const bf = bandFlux(samples, sampleRate);
  const shift = opts && opts.phaseBeats ? opts.phaseBeats * period : 0;
  let g = evaluate(phase + shift);
  if (offBeatLocked(bf, sampleRate, phase - ONSET_LAG, period, t1)) {
    const flipped = evaluate(phase + period / 2 + shift);
    if (takeFlip(g, flipped)) g = flipped;
  }
  const { firstBeat, residualMedianMs, hitRate, accepted, grid } = g;

  const peaks = [];
  const bucket = Math.max(1, Math.floor(samples.length / 400));
  for (let b = 0; b < 400; b++) {
    let m = 0;
    for (let i = b * bucket; i < Math.min(samples.length, (b + 1) * bucket); i++) m = Math.max(m, Math.abs(samples[i]));
    peaks.push(Math.round(m * 1000) / 1000);
  }
  const bands = bandOnsets(samples, sampleRate, bf);
  const beatEnergy = [];
  for (let t = firstBeat; t + period <= durationSeconds; t += period) {
    let s = 0;
    const a = Math.floor(t * sampleRate), z = Math.floor((t + period) * sampleRate);
    for (let i = a; i < z; i++) s += samples[i] * samples[i];
    beatEnergy.push(Math.round(Math.sqrt(s / Math.max(1, z - a)) * 10000) / 10000);
  }
  return {
    durationSeconds: Math.round(durationSeconds * 1000) / 1000,
    bpm: Math.round(6000 / period) / 100,
    firstBeat: Math.round(firstBeat * 1000) / 1000,
    residualMedianMs: Number.isFinite(residualMedianMs) ? Math.round(residualMedianMs * 10) / 10 : null,
    hitRate: Math.round(hitRate * 1000) / 1000,
    accepted,
    // 'accepted' | 'approximate' | 'none' (gridState); accepted is grid === 'accepted'.
    grid,
    lastOnsetSeconds: onsets.length ? Math.round(onsets[onsets.length - 1] * 100) / 100 : 0,
    sixteenthRatio: sixteenthRatio(samples, sampleRate, 60 / period, firstBeat, durationSeconds),
    peaks,
    beatEnergy,
    // Qualifying band onsets and their thresholds (bandOnsets), also when the grid is not accepted: the fixed-timing
    // cuts then snap to low-band onsets.
    onsets: bands.onsets,
    onsetThresholds: bands.thresholds,
  };
}

return { analyze };
})();
// sae-beat:end

// sae-beat-worker:start
// Own music is decoded to mono 32-bit float PCM at SAE_PCM_RATE Hz, the first SAE_PCM_SECONDS seconds (the same
// format as the kit CLI path: ffmpeg -ac 1 -ar 22050 -f f32le). The detector runs in a Web Worker built from the
// unmodified beat-detect.cjs text read from the plugin folder: the shim makes its CLI guard (`require.main ===
// module`) false, and the PCM buffer is transferred, not copied. When no Worker can run (a CSP refusal shows up as
// the worker's error event), the pasted saeBeat block runs on the main thread on the first SAE_FALLBACK_SECONDS
// only: the kit analyze() is synchronous and cannot be sliced into chunks without forking it, so the shorter input
// bounds how long the panel freezes (the tempo search reads the first minute anyway).
const SAE_PCM_RATE = 22050;
const SAE_PCM_SECONDS = 240;
const SAE_FALLBACK_SECONDS = 60;
// A worker that has not answered after this long is stopped; the music then uses fixed timing.
const SAE_BEAT_TIMEOUT_MS = 90000;
function saeBeatWorkerSource(fileText) {
  return "const require = { main: null }; const module = { exports: {} }; const exports = module.exports;\n" + String(fileText)
    + "\nself.onmessage = (e) => { try { self.postMessage({ id: e.data.id, ok: true, result: module.exports.analyze(new Float32Array(e.data.buf), e.data.rate) }); } catch (err) { self.postMessage({ id: e.data.id, ok: false, error: String(err && err.message || err) }); } };";
}
// sae-beat-worker:end

// sae-panel:start
// Plain-JS panel helpers (tests/panel.test.cjs evaluates this block in node:vm next to the planner).
// A new run (build or "Finish look") on Project `pid`. genRef counts runs: each new run and every Project switch bump
// it, so a run started in Project A stays stale after A -> B -> A even though the Project id matches again. live()
// says whether the run may still write state; check() throws `stale` once it may not.
function saeRunGuard(genRef, projectRef, pid, stale) {
  const gen = ++genRef.current;
  const live = () => genRef.current === gen && projectRef.current === pid;
  return { gen, live, check: () => { if (!live()) throw stale; } };
}
// Build steps shown in the progress bar, with each step's share of the bar in percent. The panel names them in the UI
// language (STRINGS `step.<id>`).
const SAE_BUILD_STEPS = [
  { id: "check", weight: 15 },
  { id: "search", weight: 40 },
  { id: "plan", weight: 5 },
  { id: "assemble", weight: 25 },
  { id: "look", weight: 15 },
];
// Progress for a step that is `fraction` done. Floors the percent so 100% only shows at the very end.
function saeProgress(stepId, fraction) {
  const i = SAE_BUILD_STEPS.findIndex((s) => s.id === stepId);
  if (i < 0) throw new Error("unknown build step " + stepId);
  const total = SAE_BUILD_STEPS.reduce((a, s) => a + s.weight, 0);
  const before = SAE_BUILD_STEPS.slice(0, i).reduce((a, s) => a + s.weight, 0);
  const f = Math.min(1, Math.max(0, Number(fraction) || 0));
  const value = (before + SAE_BUILD_STEPS[i].weight * f) / total;
  return { id: stepId, value, percent: Math.floor(value * 100 + 1e-9), current: i };
}
// Bad-shot spans of one resource from getResourceVisualSpans ({ spans: { [track]: { badShotSpans: [[s, e]] } } },
// source seconds): every track's spans, sorted. Anything malformed is skipped.
function saeSpansOf(payload) {
  const out = [];
  const tracks = payload && payload.spans && typeof payload.spans === "object" ? payload.spans : {};
  for (const k of Object.keys(tracks)) {
    const list = tracks[k] && Array.isArray(tracks[k].badShotSpans) ? tracks[k].badShotSpans : [];
    for (const s of list) {
      if (Array.isArray(s) && typeof s[0] === "number" && typeof s[1] === "number" && isFinite(s[0]) && isFinite(s[1]) && s[1] > s[0]) out.push([s[0], s[1]]);
    }
  }
  return out.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}
// The id sdk.call wants for each inventory video, from listProjectResources rows: the same id when the rows know it,
// else the one Video row with the same name and length (run_script may read back short aliases). Unmatched rids
// are left out.
function saeRealIds(rows, resources) {
  const list = Array.isArray(rows) ? rows : [];
  const known = new Set(list.map((r) => r && r.resourceId));
  const out = {};
  for (const r of resources || []) {
    if (known.has(r.rid)) { out[r.rid] = r.rid; continue; }
    const same = list.filter((x) => x && x.type === "Video" && x.name === r.name && typeof x.durationSeconds === "number" && Math.abs(x.durationSeconds - r.duration) < 0.05);
    if (same.length === 1) out[r.rid] = same[0].resourceId;
  }
  return out;
}
// "Selfie Aesthetic Edit - YYYY-MM-DD HH:MM" in local time (English, ASCII).
function saeDraftName(d) {
  const p = (n) => String(n).padStart(2, "0");
  return "Selfie Aesthetic Edit - " + d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
}
// The hold fields assemble.js and decorate.js read (keeps the run_script payload small).
function saeTrimHolds(holds) {
  return (holds || []).map((h) => ({ i: h.i, bar: h.bar, kind: h.kind, rid: h.rid, moment: h.moment, srcStart: h.srcStart, frames: h.frames,
    cutIn: h.cutIn, cutOut: h.cutOut, angleIn: h.angleIn, angleOut: h.angleOut, angle: h.angle, whipIn: h.whipIn, whipOut: h.whipOut, framing: h.framing }));
}
// Own music as a planner cue, from beat-detect's analysis. `own` marks it for the section default below.
function saeOwnCue(an, fallbackDuration) {
  const a = an || {};
  return { own: true, bpm: a.bpm, firstBeat: typeof a.firstBeat === "number" ? a.firstBeat : 0, grid: a.grid || "none",
    durationSeconds: a.durationSeconds > 0 ? a.durationSeconds : fallbackDuration > 0 ? fallbackDuration : undefined,
    peaks: a.peaks || [], beatEnergy: a.beatEnergy || [], onsets: a.onsets || [], onsetThresholds: a.onsetThresholds };
}
// Own music's default section: the bar line whose window (the edit's length of music) has the highest mean beat
// energy, among the starts the edit fits in. null without a usable grid or energy (the planner's default then
// applies: the earliest start for fixed timing).
function saeLoudestSection(cue, bars, editBpm) {
  if (!cue || saeTempo(cue).fixed || !(cue.beatEnergy && cue.beatEnergy.length)) return null;
  const r = saeSectionRange(cue, bars, editBpm);
  if (r.max < r.min - 1e-9) return null;
  const g = saeBarGrid(cue), period = 60 / cue.bpm;
  const beats = Math.max(1, Math.ceil(saeVideoSeconds(bars, editBpm) / period));
  const kMin = Math.ceil((r.min - g.first) / g.bar - 1e-9), kMax = Math.floor((r.max - g.first) / g.bar + 1e-9);
  let best = null;
  for (let k = kMin; k <= kMax; k++) {
    const start = g.first + k * g.bar;
    const b0 = Math.round((start - cue.firstBeat) / period);
    if (b0 < 0 || b0 + beats > cue.beatEnergy.length) continue;
    let sum = 0;
    for (let b = b0; b < b0 + beats; b++) sum += cue.beatEnergy[b] || 0;
    const mean = sum / beats;
    if (!best || mean > best.mean + 1e-12) best = { start, mean };
  }
  return best ? best.start : null;
}
// Videos without analysis, from inventory.js's skipped counts: being analysed now, not analysed yet (never started;
// the panel does not start analysis), or failed; plus clips under 1.2 s. known is false when the workflow read
// failed: pending clips then may or may not be queued, so their wording is neutral and the panel keeps polling.
function saeAnalysisCounts(skipped) {
  const s = skipped || {}, total = s.unanalysed || 0, short = s.short || 0;
  if (s.analysing == null) return { total, analysing: 0, notAnalysed: total, failed: 0, short, known: false };
  return { total, analysing: s.analysing || 0, notAnalysed: s.notAnalysed || 0, failed: s.failed || 0, short, known: s.statusKnown !== false };
}
// The sentences for the readiness line in the UI language ("" when every video is analysed).
function saeAnalysisText(lang, c) {
  return [
    c.analysing ? t(lang, "analysing", { count: c.analysing }) : "",
    c.notAnalysed ? (c.known ? t(lang, "notAnalysedAnalyse", { count: c.notAnalysed }) : t(lang, "notAnalysedMaybe", { count: c.notAnalysed })) : "",
    c.failed ? t(lang, "analysisFailed", { count: c.failed }) : "",
  ].filter(Boolean).join(t(lang, "gap"));
}
// The short facts at the end of the Ready line ("" for a count of 0).
function saeAnalysisNotes(lang, c) {
  return [c.analysing ? t(lang, "noteAnalysing", { count: c.analysing }) : "", c.notAnalysed ? t(lang, "noteNotAnalysed", { count: c.notAnalysed }) : "",
    c.failed ? t(lang, "noteFailed", { count: c.failed }) : "", c.short ? t(lang, "noteShort", { count: c.short }) : ""];
}
// The plan's notes as sentences in the UI language, in a fixed order.
function saePlanNotes(lang, plan) {
  const notes = (plan && plan.notes) || [];
  const out = [];
  if (notes.indexOf("few-face") >= 0) out.push(plan.faceClips > 0 ? t(lang, "note.fewFaces", { count: plan.faceClips }) : t(lang, "note.noFaces"));
  if (notes.indexOf("photos-early") >= 0) out.push(t(lang, "note.photosEarly"));
  if (notes.indexOf("shrunk") >= 0 && plan.fit) out.push(t(lang, "note.shrunk", { fit: plan.fit.bars, count: plan.fit.wanted }));
  if (notes.indexOf("fixed-tempo") >= 0) out.push(t(lang, "beatNone"));
  if (notes.indexOf("no-music") >= 0) out.push(t(lang, "note.noMusic"));
  if (notes.indexOf("pair-reuse") >= 0) out.push(t(lang, "note.pairReuse"));
  if (notes.indexOf("adjacent") >= 0) out.push(t(lang, "note.adjacent"));
  return out;
}
// sae-panel:end

// Maps a host-block error (Error.message 'host_tools' | 'timeout' | 'media_failed') to a sentence for own music
// ("music") or the section preview ("preview"); anything else keeps its own text as the detail.
function hostErrorSay(e: any, kind: "music" | "preview"): Say {
  const code = String(e?.message || e || "");
  const detail = String(e?.detail || code).trim().split("\n").pop() || code;
  if (code === "host_tools") return (l) => t(l, "needsNewerSelectsMusic");
  if (code === "timeout") {
    if (kind === "music") return (l) => t(l, "musicTimeout");
    return (l) => t(l, "previewTimeout");
  }
  if (kind === "music") return (l) => t(l, "musicUnreadable", { detail });
  return (l) => t(l, "previewFailed", { detail });
}
// Text from the host FileSystem (a Buffer from the host realm, bytes, or already a string).
function decodeText(raw: any): string { return typeof raw === "string" ? raw : new TextDecoder().decode(saeBytes(raw)); }
async function readPluginText(dir: string, parts: string[]): Promise<string> {
  const { fs } = saeDI();
  if (!fs || typeof fs.join !== "function" || (typeof fs.readFileSync !== "function" && typeof fs.readFile !== "function")) {
    const err: any = new Error("host_tools");
    err.missing = ["fs.readFileSync"];
    throw err;
  }
  const file = fs.join(dir, ...parts);
  return decodeText(typeof fs.readFileSync === "function" ? fs.readFileSync(file) : await fs.readFile(file));
}
// The bundled music manifest, build scripts, the effect / transition sources and the beat detector's text.
async function loadAssets(dir: string) {
  const keys = Object.keys(ASSET_FILES) as (keyof typeof ASSET_FILES)[];
  const texts = await Promise.all(keys.map((k) => readPluginText(dir, ASSET_FILES[k])));
  const by: Record<string, string> = {};
  keys.forEach((k, i) => { by[k] = texts[i]; });
  return {
    manifest: JSON.parse(by.manifest),
    scripts: { inventoryJs: by.inventoryJs, searchJs: by.searchJs, ensureJs: by.ensureJs, assembleJs: by.assembleJs, decorateJs: by.decorateJs },
    effectTsx: by.effectTsx, transitionTsx: by.transitionTsx, beatText: by.beatText,
  };
}
// The config goes in as JSON.parse of a string so its type is `any`: an inlined literal widens `type` to string
// (rejected by EditableParameterDefinition[]) and narrows a null option to `never` inside its `if`.
function fill(script: string, cfg: unknown) { return script.replace("__CONFIG__", () => "JSON.parse(" + JSON.stringify(JSON.stringify(cfg)) + ")"); }
// Runs one panel script and returns its value; a failed step throws its report.
async function runStep(sdk: any, summary: string, script: string, allowCommit = false) {
  let r = await sdk.runScript({ summary, script, allowCommit });
  // Only a lost session is resent, and never a committing call: its commit may already have landed.
  if (r.isError && !allowCommit && /No valid session ID/.test(r.output || "")) { await new Promise((d) => setTimeout(d, 1500)); r = await sdk.runScript({ summary, script, allowCommit }); }
  if (r.isError || r.result == null) throw r.output ? new Error(r.output) : uiError((l) => t(l, "stepFailed"));
  return r.result as any;
}
// Thrown when the Project changed (or a newer run started) while a run was going; its results are dropped silently.
const STALE = new Error("The Project changed during the build.");
// A short orientation hint for the clip list; nothing when the frame size is unknown.
function shapeHint(lang: Lang, width: number | null, height: number | null) {
  if (!(width! > 0) || !(height! > 0)) return "";
  const r = width! / height!;
  if (r < 0.9) return t(lang, "shape.tall");
  if (r > 1.1) return t(lang, "shape.wide");
  return t(lang, "shape.square");
}
function fmtTime(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}
// Resolves a --panel-* colour for canvas drawing; falls back when the token is missing or not a colour.
function themeColor(el: Element, ctx: CanvasRenderingContext2D, name: string, fallback: string) {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  if (!v) return fallback;
  ctx.fillStyle = "#010203";
  ctx.fillStyle = v;
  return ctx.fillStyle === "#010203" ? fallback : v;
}
// Bytes as a data: URL (the preview's fallback when a blob: URL does not play).
function bytesToDataUrl(bytes: Uint8Array, type: string) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
  return "data:" + (type || "audio/mpeg") + ";base64," + btoa(bin);
}
const WAVE_HEIGHT = 56;

// Music section slider: waveform on a canvas with a draggable, bar-snapped window over what the Draft plays: from
// `section - lead` (the edit starts `lead` before beat 1) for `windowSeconds`. While `audio` plays, a playhead
// follows its currentTime inside the window, redrawn on every animation frame.
function SectionSlider({ lang, peaks, total, section, lead, windowSeconds, barSeconds, snap, onChange, disabled, audio }: {
  lang: Lang; peaks: number[]; total: number; section: number | null; lead: number; windowSeconds: number; barSeconds: number;
  snap: (v: number) => number | null; onChange: (v: number | null) => void; disabled: boolean; audio: HTMLAudioElement | null;
}) {
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const dragRef = React.useRef<{ offset: number } | null>(null);
  const [width, setWidth] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const [focused, setFocused] = React.useState(false);

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    setWidth(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Bundled peaks can exceed 1.0 slightly, so scale by the loudest bar when it does.
  const peakMax = Math.max(1, ...peaks);
  const winStart = section == null ? null : section - lead;
  // The latest draw, so the animation loop always paints with the current props. `playAt` is seconds into the window.
  const drawRef = React.useRef<(playAt: number | null) => void>(() => {});
  drawRef.current = (playAt: number | null) => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap || width <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    // The backing store in device pixels, rounded (Windows scaling of 125/150 % gives fractional ratios).
    const cw = Math.round(width * dpr), chh = Math.round(WAVE_HEIGHT * dpr);
    if (canvas.width !== cw) canvas.width = cw;
    if (canvas.height !== chh) canvas.height = chh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(cw / width, 0, 0, chh / WAVE_HEIGHT, 0, 0);
    ctx.clearRect(0, 0, width, WAVE_HEIGHT);
    // --panel-accent is a dark neutral in the dark theme, so the selection draws in the text colour.
    const fg = themeColor(wrap, ctx, "--panel-fg", "#f2f2f2");
    const muted = themeColor(wrap, ctx, "--panel-muted-fg", "#8a8a8a");
    const mid = WAVE_HEIGHT / 2;
    const x0 = winStart == null ? -1 : Math.max(0, (winStart / total) * width);
    const x1 = winStart == null ? -1 : Math.min(width, ((winStart + windowSeconds) / total) * width);
    const inside = (x: number) => x >= x0 && x <= x1;
    if (winStart != null) {
      ctx.globalAlpha = 0.14; ctx.fillStyle = fg;
      ctx.fillRect(x0, 0, Math.max(2, x1 - x0), WAVE_HEIGHT);
      ctx.globalAlpha = 1;
    }
    // Mirrored bars, one per ~2.5 CSS px; each bar is the loudest peak it covers.
    const pitch = 2.5, count = Math.max(1, Math.floor(width / pitch)), barW = Math.max(1, pitch * 0.6);
    for (let i = 0; i < count; i++) {
      const x = i * pitch + (pitch - barW) / 2;
      let p = 0;
      if (peaks.length) {
        const a = Math.floor((i / count) * peaks.length), b = Math.max(a + 1, Math.floor(((i + 1) / count) * peaks.length));
        for (let j = a; j < b && j < peaks.length; j++) p = Math.max(p, peaks[j] || 0);
      } else p = 0.15;
      const h = Math.max(1, (p / peakMax) * (mid - 3));
      const on = inside(x + barW / 2);
      ctx.globalAlpha = on ? 0.95 : 0.4; ctx.fillStyle = on ? fg : muted;
      ctx.fillRect(x, mid - h, barW, h * 2);
    }
    ctx.globalAlpha = 1;
    // Window border and two grip handles so it reads as draggable.
    if (winStart != null) {
      const w = Math.max(2, x1 - x0);
      ctx.strokeStyle = fg; ctx.lineWidth = 1.5;
      ctx.strokeRect(x0 + 0.75, 0.75, Math.max(0.5, w - 1.5), WAVE_HEIGHT - 1.5);
      ctx.fillStyle = fg;
      const gh = Math.min(18, WAVE_HEIGHT * 0.4), gw = 4;
      for (const gx of [x0 + 1, x0 + w - 1 - gw]) {
        ctx.beginPath();
        if ((ctx as any).roundRect) (ctx as any).roundRect(gx, mid - gh / 2, gw, gh, 2); else ctx.rect(gx, mid - gh / 2, gw, gh);
        ctx.fill();
      }
      if (playAt != null) {
        const px = Math.min(x0 + w - 1, Math.max(x0 + 1, ((winStart + Math.min(playAt, windowSeconds)) / total) * width));
        ctx.fillRect(px - 1, 0, 2, WAVE_HEIGHT);
      }
    }
  };
  React.useEffect(() => { if (!audio) drawRef.current(null); }, [width, peaks, peakMax, section, windowSeconds, total, audio]);
  // Playback drives the playhead with requestAnimationFrame; the loop ends when playback stops.
  React.useEffect(() => {
    if (!audio) return;
    let frame = 0;
    const step = () => { drawRef.current(audio.currentTime); frame = requestAnimationFrame(step); };
    frame = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(frame); drawRef.current(null); };
  }, [audio]);

  const timeAt = (clientX: number) => {
    const r = wrapRef.current!.getBoundingClientRect();
    return (Math.min(Math.max(0, clientX - r.left), r.width) / Math.max(1, r.width)) * total;
  };
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || e.button !== 0) return;
    const at = timeAt(e.clientX);
    const s = winStart ?? 0;
    // Grabbing the window keeps the grab point; anywhere else centres the window there.
    const offset = winStart != null && at >= s && at <= s + windowSeconds ? at - s : windowSeconds / 2;
    dragRef.current = { offset };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
    setDragging(true);
    onChange(snap(at - offset + lead));
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    onChange(snap(timeAt(e.clientX) - dragRef.current.offset + lead));
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    if (e.type === "pointerup") onChange(snap(timeAt(e.clientX) - dragRef.current.offset + lead));
    dragRef.current = null; setDragging(false);
    try { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* already released */ }
  };
  const first = snap(0), last = snap(total);
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled || section == null) return;
    let next: number | null | undefined;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = snap(section - barSeconds);
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") next = snap(section + barSeconds);
    else if (e.key === "PageDown") next = snap(section - 4 * barSeconds);
    else if (e.key === "PageUp") next = snap(section + 4 * barSeconds);
    else if (e.key === "Home") next = first;
    else if (e.key === "End") next = last;
    else return;
    e.preventDefault();
    onChange(next);
  };

  return (
    <div>
      <small style={{ display: "block", marginBottom: 4 }}>{t(lang, "sectionHint")}</small>
      <div ref={wrapRef} role="slider" tabIndex={disabled ? -1 : 0} aria-label={t(lang, "sectionLabel")}
        aria-valuemin={Number((first ?? 0).toFixed(1))} aria-valuemax={Number((last ?? 0).toFixed(1))} aria-valuenow={Number((section ?? 0).toFixed(1))}
        aria-valuetext={section == null ? t(lang, "musicTooShort") : t(lang, "startsAt", { seconds: Math.round(section * 10) / 10 })} aria-disabled={disabled || undefined}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag} onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ position: "relative", width: "100%", minWidth: 0, height: WAVE_HEIGHT, touchAction: "none", userSelect: "none", outline: "none",
          cursor: disabled ? "default" : dragging ? "grabbing" : "grab", borderRadius: "var(--panel-radius, 6px)",
          boxShadow: focused ? "0 0 0 2px var(--panel-fg, #f2f2f2)" : "inset 0 0 0 1px var(--panel-border, rgba(128, 128, 128, 0.35))", opacity: disabled ? 0.6 : 1 }}>
        <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: WAVE_HEIGHT, pointerEvents: "none" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--panel-muted-fg)", fontVariantNumeric: "tabular-nums", marginTop: 2 }}>
        <span>0:00</span><span>{fmtTime(total)}</span>
      </div>
    </div>
  );
}

// A choice tile: one bordered box holding an optional icon, the label and an optional second line (panel-ui.md §2).
// Plain <button>s get the host's 32 px row height, full width and a primary fill, so every one of those is overridden.
function Tile({ on, disabled, onClick, label, sub, icon, lang }: {
  on: boolean; disabled: boolean; onClick: () => void; label: string; sub?: string; icon?: React.ReactNode; lang: Lang;
}) {
  return (
    <button type="button" aria-pressed={on} disabled={disabled} onClick={onClick}
      style={{ flex: "1 1 72px", minWidth: 0, width: "auto", maxWidth: "none", height: "auto", minHeight: 40, maxHeight: "none", boxSizing: "border-box",
        padding: "8px 6px", margin: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
        borderRadius: "var(--panel-radius, 6px)", border: on ? "2px solid var(--panel-fg, #f2f2f2)" : "2px solid var(--panel-border, rgba(128, 128, 128, 0.45))",
        background: "transparent", color: "inherit", font: "inherit", fontSize: 12, fontWeight: on ? 600 : 400, lineHeight: 1.2, textAlign: "center",
        cursor: disabled ? "default" : "pointer", opacity: disabled && !on ? 0.5 : 1, overflowWrap: "anywhere", wordBreak: lang === "ko" ? "keep-all" : "normal" }}>
      {icon}
      <span style={{ display: "block", maxWidth: "100%" }}>{label}</span>
      {sub ? <span style={{ display: "block", maxWidth: "100%", fontSize: 10, fontWeight: 400, color: "var(--panel-muted-fg)" }}>{sub}</span> : null}
    </button>
  );
}
function tileRow(children: React.ReactNode, label: string) {
  return <div role="group" aria-label={label} style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch", gap: 6, minWidth: 0 }}>{children}</div>;
}
// The look labels by id (explicit keys, so the i18n checker sees each one).
function framingLabel(lang: Lang, id: string) {
  if (id === "tight") return t(lang, "framing.tight");
  return t(lang, "framing.full");
}
function lookLabel(lang: Lang, id: string) {
  if (id === "soft-glow") return t(lang, "look.soft-glow");
  if (id === "night-glam") return t(lang, "look.night-glam");
  if (id === "clean") return t(lang, "look.clean");
  return t(lang, "look.none");
}

// ---------------------------------------------------------------------------
// Build steps shared by the panel's Build and a template run (TemplateRun, below the panel).
// ---------------------------------------------------------------------------
type RunFn = (summary: string, script: string, allowCommit?: boolean) => Promise<any>;
type Advance = (id: string, fraction: number, detail?: Say) => void;

// Bad-shot spans per video (source seconds) through sdk.call; any failure means no spans for that clip. When the
// inventory's id is not one sdk.call knows, `realIds` maps it (a template run passes the handed ids), else
// listProjectResources maps it once (saeRealIds). Spans are cached per `projectId|rid` in `spansCache`.
async function readSpans(sdk: any, pid: string, inv: any, rids: string[], spansCache: Map<string, number[][]>, check: () => void,
  onProgress: (done: number, total: number) => void, realIds: Record<string, string> | null = null) {
  const out: Record<string, number[][]> = {};
  const spansFor = async (id: string) => {
    try { return saeSpansOf(await sdk.call("getResourceVisualSpans", pid, id)); } catch { return null; }
  };
  for (let i = 0; i < rids.length; i++) {
    onProgress(i, rids.length);
    const rid = rids[i], key = pid + "|" + rid;
    const cached = spansCache.get(key);
    if (cached) { out[rid] = cached; continue; }
    let spans = await spansFor(rid);
    check();
    if (spans === null) {
      if (realIds === null) {
        try { realIds = saeRealIds(await sdk.call("listProjectResources", pid), inv.resources); } catch { realIds = {}; }
        check();
      }
      const real = realIds![rid];
      if (real && real !== rid) { spans = await spansFor(real); check(); }
    }
    // Failures stay uncached, so the next Build asks again.
    if (spans) spansCache.set(key, spans);
    out[rid] = spans || [];
  }
  onProgress(rids.length, rids.length);
  return out;
}
// Motion curves per video for the stillness picker (source files from the inventory's `path`), cached per clip.
// A clip whose curve fails stays without one (planned as before) and uncached, so the next Build asks again; a host
// without the tools ends the step.
async function readMotionCurves(pid: string, inv: any, rids: string[], motionCache: Map<string, { fps: number; values: Float32Array }>, check: () => void,
  onProgress: (done: number, total: number) => void) {
  const out: Record<string, { fps: number; values: Float32Array }> = {};
  let dataDir: string;
  try { dataDir = saeDataDir(PLUGIN_ID); } catch { return out; }
  const pathOf: Record<string, string> = {};
  for (const r of inv.resources) if (r.path) pathOf[r.rid] = r.path;
  for (let i = 0; i < rids.length; i++) {
    onProgress(i, rids.length);
    const rid = rids[i], key = pid + "|" + rid;
    const cached = motionCache.get(key);
    if (cached) { out[rid] = cached; continue; }
    if (!pathOf[rid]) continue;
    let stop = false;
    try {
      const curve = await saeMotionCurve(pathOf[rid], dataDir, {});
      motionCache.set(key, curve);
      out[rid] = curve;
    } catch (e: any) { stop = String(e?.message) === "host_tools"; }
    check();
    if (stop) break;
  }
  onProgress(rids.length, rids.length);
  return out;
}
// Scene search for the clips not in the cache yet, SAE_SEARCH_BATCH clips per call. Returns the rids that failed.
// `onProgress(fraction, done, total)` runs before each call.
async function searchCloseUps(run: RunFn, assets: any, pid: string, rids: string[], searchCache: { current: Map<string, any[]> }, check: () => void,
  onProgress: (fraction: number, done: number, total: number) => void) {
  const todo = rids.filter((rid) => !searchCache.current.has(pid + "|" + rid));
  const failed: string[] = [];
  const doneBefore = rids.length - todo.length;
  for (let i = 0; i < todo.length; i += SAE_SEARCH_BATCH) {
    onProgress(todo.length ? i / todo.length : 1, doneBefore + i, rids.length);
    const batch = todo.slice(i, i + SAE_SEARCH_BATCH);
    // A call that fails as a whole (its deadline, say) leaves its clips unsearched: they still build, as regular clips.
    let r: any;
    try { r = await run("Find close-ups", fill(assets.scripts.searchJs, { projectId: pid, rids: batch, queries: SAE_QUERIES, pageSize: SAE_SEARCH_PAGE_SIZE })); }
    catch { r = { candidates: [], failed: batch }; }
    check();
    const bad = new Set<string>(r.failed || []);
    for (const rid of batch) {
      if (bad.has(rid)) { failed.push(rid); continue; }
      searchCache.current.set(pid + "|" + rid, (r.candidates || []).filter((c: any) => c.rid === rid));
    }
  }
  return failed;
}
// From the searched clips to a saved Draft (commit 1): plan the edit, import the music, lay the holds on a new
// 1080x1920 Draft, then freeze commit 2's config. `settings` are the Build's choices as they were at the click (a
// template run passes the panel's defaults); `bl` is the language the Adjust labels are written in.
async function buildDraft(o: {
  run: RunFn; assets: any; pid: string; skillsDir: string; settings: any; nextSeed: number; bl: Lang; inv: any; rids: string[]; photos: string[];
  badSpans: Record<string, number[][]>; motion: Record<string, any>; searchCache: { current: Map<string, any[]> }; check: () => void; advance: Advance;
}) {
  const { run, assets, pid, skillsDir, settings, nextSeed, bl, inv, rids, photos, badSpans, motion, searchCache, check, advance } = o;
  const cues: any[] = assets.manifest.cues || [];
  // Step 3: the plan.
  advance("plan", 0);
  const durations: Record<string, number> = {};
  for (const r of inv.resources) if (rids.includes(r.rid)) durations[r.rid] = r.duration;
  const candidates = rids.flatMap((rid) => searchCache.current.get(pid + "|" + rid) || []);
  const plan = saePlanBuild({ fps: 30, bars: settings.bars, seed: nextSeed, cue: settings.cue, sectionStart: settings.section ?? undefined,
    candidates, durations, badSpans, photos, usePhotos: settings.usePhotos, motion, stillWeight: SAE_STILL_WEIGHT_PANEL });
  if (!plan.ok) {
    if ((plan.notes || []).includes("music-too-short")) throw uiError((l) => t(l, "musicTooShortBuild"));
    throw uiError((l) => t(l, "noSources"));
  }
  advance("plan", 1);
  // Step 4: the music import, then the Draft (commit 1).
  if (settings.cue) advance("assemble", 0, (l) => t(l, "detail.music")); else advance("assemble", 0);
  let music: any = null;
  if (settings.cue) {
    const own = settings.musicId === "own";
    const path = own ? settings.ownFile!.path : saeDI().fs.join(skillsDir, "assets", "cues", cues.find((c) => c.id === settings.musicId).file);
    music = await run("Add music to the project", fill(assets.scripts.ensureJs, { projectId: pid, path, ...(own ? { matchByName: false } : {}) }), true);
    check();
  }
  advance("assemble", 0.15);
  // Photo sizes the inventory has not measured stay out; assemble.js measures those itself.
  const crops: Record<string, { width: number; height: number }> = {};
  for (const r of [...inv.resources, ...inv.photos]) if (r.width > 0 && r.height > 0) crops[r.rid] = { width: r.width, height: r.height };
  const name = saeDraftName(new Date());
  const holds = saeTrimHolds(plan.holds);
  const a = await run("Assemble Selfie Aesthetic Edit", fill(assets.scripts.assembleJs, {
    projectId: pid, draftName: name, holds, cutSecondsRaw: plan.cutSecondsRaw,
    music: music ? { resourceId: music.resourceId, sourceStart: plan.musicSourceStart } : null,
    durations, crops, clipSound: settings.clipSound, ambientDb: AMBIENT_DB }), true);
  check();
  if (!a.sequenceId) throw uiError((l) => t(l, "draftNoId", { name }));
  advance("assemble", 1);
  // Commit 2's config, frozen here so "Finish look" sends the same thing. Adjust labels use the UI language of
  // this click; effect, transition and Draft names stay English.
  const preset = LOOK_PRESETS.find((p) => p.id === settings.lookId) || LOOK_PRESETS[0];
  const deco = {
    sequenceId: a.sequenceId, holds, whipMode: SAE_WHIP_MODE,
    effect: { tsx: assets.effectTsx, look: settings.lookOn ? preset.id : "none", lookStrength: preset.strength ?? LOOK_STRENGTH, whip: preset.whip },
    transitionTsx: assets.transitionTsx, covers: a.covers || [], clipSound: settings.clipSound,
    adjustLabels: { look: t(bl, "param.look"), lookStrength: t(bl, "param.lookStrength"), whip: t(bl, "param.whip"), framing: t(bl, "param.framing") },
    lookOptions: LOOK_OPTIONS.map((o) => ({ label: lookLabel(bl, o.value), value: o.value })),
    framingOptions: FRAMING_OPTIONS.map((o) => ({ label: framingLabel(bl, o.value), value: o.value })),
  };
  const seconds = a.fps > 0 && a.totalFrames > 0 ? a.totalFrames / a.fps : SAE_LEAD + saeVideoSeconds(plan.bars, plan.editBpm);
  return { plan, a, name, holds, deco, seconds };
}
// Commit 2 on a saved Draft: mute the clips when Clip sound is Off, one whip + look effect per clip. decorate.js adds
// only what an earlier attempt did not, so it can run again.
async function addWhipAndLook(run: RunFn, assets: any, deco: any) {
  const dr = await run("Add whip and look", fill(assets.scripts.decorateJs, deco), true);
  return dr;
}

type BeatJob ={ id: number; worker: Worker | null; url: string | null; timer: any };

function SelfieAestheticPanel({ sdk, context, ui }: any) {
  // The UI language, read on every render: the app can switch languages while the panel is open.
  const L = uiLang(context);
  const langRef = React.useRef(L);
  langRef.current = L;
  const projectId = context?.projectId ?? null;
  const projectRef = React.useRef(projectId);
  projectRef.current = projectId;
  const mountedRef = React.useRef(true);
  const [skillsDir, setSkillsDir] = React.useState<string | null>(null);
  const [assets, setAssets] = React.useState<any>(null);
  const [fatal, setFatal] = React.useState<{ say: Say } | null>(null);
  // Own music and the section preview need the host's ffmpeg; bundled cues do not.
  const canOwn = React.useMemo(() => saeHas(["rt.runFFmpeg", "fs.join", "fs.homedir", "fs.mkdirSync"]).ok, []);
  const [inventory, setInventory] = React.useState<any>(null);
  const [invError, setInvError] = React.useState<{ say: Say } | null>(null);
  const [invLoading, setInvLoading] = React.useState(false);
  const [clipMode, setClipMode] = React.useState<"auto" | "choose">("auto");
  // `only` / `onlyPhotos`: the chosen video / photo rids in inventory order, or null for all of them.
  const [only, setOnly] = React.useState<string[] | null>(null);
  const [onlyPhotos, setOnlyPhotos] = React.useState<string[] | null>(null);
  const [usePhotos, setUsePhotos] = React.useState(true);
  // Music: a bundled cue id, "own" or "none".
  const [musicId, setMusicId] = React.useState<string>("");
  const [ownFile, setOwnFile] = React.useState<{ path: string; name: string } | null>(null);
  const [ownCue, setOwnCue] = React.useState<any>(null);
  const [ownState, setOwnState] = React.useState<"idle" | "listening" | "ready" | "failed">("idle");
  const [ownStatus, setOwnStatus] = React.useState<{ tone: string; say: Say } | null>(null);
  const [section, setSection] = React.useState<number | null>(null);
  const [lookId, setLookId] = React.useState("soft-glow");
  const [lookOn, setLookOn] = React.useState(true);
  const [length, setLength] = React.useState<"short" | "standard" | "long">("short");
  // Clip sound: the clips' own sound is off (muted), ambient (-18 dB under the music) or full (0 dB).
  const [clipSound, setClipSound] = React.useState<"off" | "ambient" | "full">("ambient");
  const [seed, setSeed] = React.useState(1);
  const [busy, setBusy] = React.useState(false);
  // Single-flight guard: state updates are async, so a ref blocks a second click in the same tick.
  const busyRef = React.useRef(false);
  // Run generation (saeRunGuard): bumped by every new run and every Project switch.
  const runGenRef = React.useRef(0);
  const [progress, setProgress] = React.useState<any>(null);
  const progressRef = React.useRef<any>(null);
  const [status, setStatus] = React.useState<{ tone: string; say: Say } | null>(null);
  const [result, setResult] = React.useState<any>(null);
  // Scene-search hits and bad-shot spans per `projectId|rid`: a clip's content does not change, so "Try other shots",
  // a new clip choice and a refreshed inventory reuse them; clips whose search failed stay out and are retried.
  const searchCache = React.useRef<Map<string, any[]>>(new Map());
  const spansCache = React.useRef<Map<string, number[][]>>(new Map());
  const motionCache = React.useRef<Map<string, { fps: number; values: Float32Array }>>(new Map());
  const [cacheTick, setCacheTick] = React.useState(0);
  // Photo sizes measured by earlier inventory reads, passed back so a refresh does not measure them again.
  const photoSizesRef = React.useRef<Record<string, { width: number; height: number }>>({});
  const inventoryJsRef = React.useRef<string | null>(null);
  const invLoadingRef = React.useRef<string | null>(null);
  // Section preview.
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const previewTokenRef = React.useRef(0);
  const previewUrlRef = React.useRef<string | null>(null);
  const [playState, setPlayState] = React.useState<"idle" | "loading" | "playing">("idle");
  const [playingAudio, setPlayingAudio] = React.useState<HTMLAudioElement | null>(null);
  // Own-music beat analysis: one job at a time, identified by its id; a newer job or a cancel ignores stale results.
  const beatJobRef = React.useRef<BeatJob>({ id: 0, worker: null, url: null, timer: null });

  const run = (summary: string, script: string, allowCommit = false) => runStep(sdk, summary, script, allowCommit);
  // Progress never goes backwards: a later report below the current value keeps the bar where it is.
  const advance = (id: string, fraction: number, detail?: Say) => {
    const next = saeProgress(id, fraction);
    const prev = progressRef.current;
    const p = prev && prev.value > next.value ? { ...prev, detail } : { ...next, detail };
    progressRef.current = p; setProgress(p);
  };
  // Where a build stopped and why; script and SDK details stay in English after the translated prefix.
  const stopAt = (e: any): Say => {
    const at = progressRef.current;
    if (!at || typeof e?.say === "function") return (l) => sayError(l, e);
    return (l) => t(l, "stoppedAt", { step: at.current + 1, total: SAE_BUILD_STEPS.length, name: t(l, "step." + at.id), detail: sayError(l, e) });
  };
  // Ends a run's busy state, unless a newer run or a Project switch has taken over since it started.
  const endRun = (guard: { live: () => boolean }) => {
    if (!guard.live()) return;
    busyRef.current = false; setBusy(false); setProgress(null); progressRef.current = null;
  };

  React.useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; cancelBeat(); stopPreview(); }; }, []);

  // Mount: find the installed plugin folder and read its files. Without the host FileSystem nothing can load.
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const dir = saeSkillsDir(PLUGIN_ID);
        if (!dir) { if (alive) setFatal({ say: (l) => t(l, "pluginMissing") }); return; }
        const loaded = await loadAssets(dir);
        if (!alive) return;
        inventoryJsRef.current = loaded.scripts.inventoryJs;
        setSkillsDir(dir); setAssets(loaded);
        setMusicId((m) => m || (loaded.manifest.cues?.[0]?.id ?? "none"));
      } catch (e: any) {
        if (!alive) return;
        if (String(e?.message) === "host_tools") setFatal({ say: (l) => t(l, "needsNewerSelects") });
        else setFatal({ say: (l) => t(l, "startFailed", { detail: sayError(l, e) }) });
      }
    })();
    return () => { alive = false; };
  }, []);

  // Reads the Project's footage inventory. Never writes state for a stale Project, and never runs during a build.
  async function loadInventory(pid: string | null = projectRef.current, alive: () => boolean = () => true) {
    const script = inventoryJsRef.current;
    // One read per Project at a time; a read for another Project never blocks this one.
    if (!pid || !script || busyRef.current || invLoadingRef.current === pid) return;
    const live = () => mountedRef.current && alive() && projectRef.current === pid;
    invLoadingRef.current = pid; setInvLoading(true);
    try {
      const inv = await run("Read footage", fill(script, { projectId: pid, only: null, known: photoSizesRef.current, ...(usePhotos ? {} : { measureMs: 0 }) }));
      // A build that started meanwhile keeps the clip set it began with; the next refresh picks this up.
      if (!live() || busyRef.current) return;
      applyInventory(inv);
      setInvError(null);
    } catch (e: any) {
      if (live()) setInvError({ say: (l) => sayError(l, e) });
    } finally {
      if (invLoadingRef.current === pid) invLoadingRef.current = null;
      if (mountedRef.current && projectRef.current === pid) setInvLoading(false);
    }
  }
  function applyInventory(inv: any) {
    inv.photos = inv.photos || [];
    inv.resources = inv.resources || [];
    for (const ph of inv.photos) if (ph.width > 0 && ph.height > 0) photoSizesRef.current[ph.rid] = { width: ph.width, height: ph.height };
    for (const ph of inv.photos) if (!(ph.width > 0) && photoSizesRef.current[ph.rid]) Object.assign(ph, photoSizesRef.current[ph.rid]);
    setInventory(inv);
  }

  // Project switch: drop everything tied to the previous Project so a build never mixes Projects.
  React.useEffect(() => {
    runGenRef.current++;
    setResult(null); setStatus(null); setInventory(null); setInvError(null); setInvLoading(false);
    setOnly(null); setOnlyPhotos(null); setClipMode("auto");
    photoSizesRef.current = {};
    busyRef.current = false; setBusy(false); setProgress(null); progressRef.current = null;
    cancelBeat();
    setOwnFile(null); setOwnCue(null); setOwnState("idle"); setOwnStatus(null);
    return () => { stopPreview(); cancelBeat(); };
  }, [projectId]);
  // The first inventory read for this Project, once the plugin files have loaded.
  React.useEffect(() => {
    if (!projectId || !assets) return;
    let alive = true;
    loadInventory(projectId, () => alive);
    return () => { alive = false; };
  }, [projectId, assets]);

  // Clips being analysed (or no clips at all yet): re-read the inventory every 10 s until they are ready. Clips whose
  // analysis was never started (or failed) do not poll on their own: coming back to the panel or Refresh picks that
  // up. With an unknown status, unanalysed clips poll. Stops on unmount, Project switch and while busy.
  const invAnalysis = saeAnalysisCounts(inventory?.skipped);
  const needsPoll = !!inventory && (invAnalysis.analysing > 0 || (!invAnalysis.known && invAnalysis.total > 0) || (inventory.resources.length === 0 && !inventory.photos?.length && invAnalysis.total === 0));
  React.useEffect(() => {
    if (!projectId || !needsPoll || busy) return;
    const pid = projectId;
    const timer = setInterval(() => { loadInventory(pid); }, 10000);
    return () => clearInterval(timer);
  }, [projectId, needsPoll, busy]);
  // Coming back to the panel (tab shown or window focused) re-reads the inventory.
  React.useEffect(() => {
    if (!projectId) return;
    const pid = projectId;
    const onVisible = () => { if (document.visibilityState === "visible") loadInventory(pid); };
    const onFocus = () => { loadInventory(pid); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => { document.removeEventListener("visibilitychange", onVisible); window.removeEventListener("focus", onFocus); };
  }, [projectId]);

  // ---- music: the planner cue, its tempo and the section ----
  const cues: any[] = assets?.manifest?.cues || [];
  const cueEntry = cues.find((c) => c.id === musicId) || null;
  // Own music before (or without) an analysis uses fixed timing over its known length.
  const ownPlanCue = React.useMemo(() => (ownFile ? (ownCue || saeOwnCue(null, undefined)) : null), [ownFile, ownCue]);
  const cue = musicId === "none" ? null : musicId === "own" ? ownPlanCue : cueEntry;
  const tempo = saeTempo(cue);
  const editBpm = tempo.editBpm;
  const wantedBars = SAE_LENGTHS[length];
  const snap = (v: number) => saeSnapSection(v, cue, { bars: wantedBars, editBpm });
  const defaultSection = () => {
    if (!cue) return null;
    if (cue.own) return saeLoudestSection(cue, wantedBars, editBpm) ?? saeDefaultSection(cue, wantedBars, editBpm);
    return saeDefaultSection(cue, wantedBars, editBpm);
  };
  // A new track (or a finished analysis) defaults the section to its loudest steady window.
  React.useEffect(() => { setSection(defaultSection()); }, [assets, musicId, ownCue, ownFile?.path]);
  // A new length keeps the chosen start and only re-clamps it.
  React.useEffect(() => { setSection((s) => (s == null ? defaultSection() : snap(s) ?? defaultSection())); }, [length]);
  // A new track, section or length makes a running preview stale, so it stops.
  React.useEffect(() => { stopPreview(); }, [musicId, ownFile?.path, section, length]);
  // Leaving own music stops its analysis; coming back to a file whose analysis was stopped starts it again.
  React.useEffect(() => { if (musicId !== "own") cancelBeat(); }, [musicId]);
  React.useEffect(() => {
    if (musicId === "own" && ownFile && !ownCue && ownState === "idle" && !busy && assets) analyseOwn(ownFile);
  }, [musicId, ownFile, ownCue, ownState, busy, assets]);

  // ---- own music: decode with the host ffmpeg, detect the beat off the UI thread ----
  function cancelBeat() {
    const job = beatJobRef.current;
    beatJobRef.current = { id: job.id + 1, worker: null, url: null, timer: null };
    if (job.timer) clearTimeout(job.timer);
    if (job.worker) { try { job.worker.terminate(); } catch { /* already gone */ } }
    if (job.url) { try { URL.revokeObjectURL(job.url); } catch { /* not a blob URL */ } }
    setOwnState((s) => (s === "listening" ? "idle" : s));
  }
  // Runs the detector in a Worker. Rejects with { fallback: true } when the Worker cannot start or load (CSP),
  // with an Error when the analysis itself failed or timed out.
  function beatInWorker(pcm: Float32Array, id: number): Promise<any> {
    return new Promise((resolve, reject) => {
      let url: string | null = null, worker: Worker | null = null, timer: any = null;
      const done = () => {
        if (timer) clearTimeout(timer);
        if (worker) { try { worker.terminate(); } catch { /* gone */ } }
        if (url) { try { URL.revokeObjectURL(url); } catch { /* gone */ } }
        if (beatJobRef.current.id === id) beatJobRef.current = { id, worker: null, url: null, timer: null };
      };
      try {
        url = URL.createObjectURL(new Blob([saeBeatWorkerSource(assets.beatText)], { type: "text/javascript" }));
        worker = new Worker(url);
      } catch (e) {
        done();
        reject({ fallback: true, cause: e });
        return;
      }
      timer = setTimeout(() => { done(); reject(new Error("timeout")); }, SAE_BEAT_TIMEOUT_MS);
      beatJobRef.current = { id, worker, url, timer };
      worker.onmessage = (e: MessageEvent) => {
        if (!e.data || e.data.id !== id) return;
        done();
        if (e.data.ok) resolve(e.data.result); else reject(new Error(String(e.data.error || "beat detection failed")));
      };
      worker.onerror = (ev: any) => { try { ev.preventDefault(); } catch { /* not cancellable */ } done(); reject({ fallback: true, cause: ev }); };
      worker.postMessage({ id, buf: pcm.buffer, rate: SAE_PCM_RATE }, [pcm.buffer]);
    });
  }
  async function analyseOwn(file: { path: string; name: string }) {
    if (busyRef.current) return;
    cancelBeat();
    const id = beatJobRef.current.id;
    const live = () => mountedRef.current && beatJobRef.current.id === id;
    setOwnFile(file); setOwnCue(null); setOwnState("listening"); setOwnStatus(null); setStatus(null);
    let pcm: Float32Array | null = null, head: Float32Array | null = null;
    try {
      const dataDir = saeDataDir(PLUGIN_ID);
      pcm = await saeDecodePcm(file.path, dataDir, SAE_PCM_SECONDS);
      if (!live()) return;
      // The fallback's input is copied before the transfer detaches the decoded buffer; the worker gets a buffer of
      // exactly the samples (the decoded one may carry a few spare bytes).
      head = pcm.slice(0, Math.min(pcm.length, SAE_FALLBACK_SECONDS * SAE_PCM_RATE));
      const exact = pcm.byteOffset === 0 && pcm.byteLength === pcm.buffer.byteLength ? pcm : pcm.slice();
      pcm = null;
      let an: any = null;
      try {
        an = await beatInWorker(exact, id);
      } catch (e: any) {
        if (!e || !e.fallback) throw e;
        if (!live()) return;
        // No Worker here: the main thread analyses the first minute after the busy state has painted.
        await saeYield();
        if (!live()) return;
        an = saeBeat.analyze(head, SAE_PCM_RATE, undefined);
      }
      head = null;
      if (!live()) return;
      const next = saeOwnCue(an, undefined);
      setOwnCue(next); setOwnState("ready");
      const bpm = Math.round(Number(an.bpm) || 0);
      if (saeTempo(next).fixed) setOwnStatus({ tone: "muted", say: (l) => t(l, "beatNone") });
      else if (next.grid === "accepted") setOwnStatus({ tone: "muted", say: (l) => t(l, "beatFound", { bpm }) });
      else setOwnStatus({ tone: "muted", say: (l) => t(l, "beatApprox", { bpm }) });
    } catch (e: any) {
      pcm = null; head = null;
      if (!live()) return;
      // Any failure: fixed timing over the file's length (when ffprobe can read it); Build still works.
      let duration: number | undefined;
      try { duration = await saeProbeDuration(file.path, { timeoutMs: 30000 }); } catch { duration = undefined; }
      if (!live()) return;
      setOwnCue(saeOwnCue(null, duration)); setOwnState("failed");
      const why = hostErrorSay(e, "music");
      setOwnStatus({ tone: "error", say: (l) => [why(l), t(l, "beatNone")].join(t(l, "gap")) });
    } finally {
      if (beatJobRef.current.id === id) beatJobRef.current = { id, worker: null, url: null, timer: null };
    }
  }
  function clearOwn() {
    cancelBeat();
    setOwnFile(null); setOwnCue(null); setOwnState("idle"); setOwnStatus(null);
  }

  // ---- section preview: "idle" -> "loading" (ffmpeg cut) -> "playing" ----
  // Every start or stop bumps the token, so a late result from a cancelled preparation is dropped.
  function stopPreview() {
    previewTokenRef.current++;
    const a = audioRef.current;
    audioRef.current = null;
    if (a) { a.onended = null; a.pause(); }
    if (previewUrlRef.current) { try { URL.revokeObjectURL(previewUrlRef.current); } catch { /* data URL */ } previewUrlRef.current = null; }
    if (mountedRef.current) { setPlayState("idle"); setPlayingAudio(null); }
  }
  async function preview() {
    if (playState !== "idle") { stopPreview(); return; }
    if (!cue || section == null || !skillsDir || !canOwn) return;
    if (musicId === "own" && !ownFile) return;
    stopPreview();
    const token = previewTokenRef.current;
    const live = () => previewTokenRef.current === token && mountedRef.current;
    setPlayState("loading");
    try {
      const dataDir = saeDataDir(PLUGIN_ID);
      const file = musicId === "own" ? ownFile!.path : saeDI().fs.join(skillsDir, "assets", "cues", cueEntry.file);
      // Exactly what the Draft plays: from `lead` before beat 1 of the section to the end of the edit.
      const start = Math.max(0, section - SAE_LEAD), seconds = SAE_LEAD + saeVideoSeconds(wantedBars, editBpm);
      const url = await saePreviewUrl(file, start, seconds, dataDir);
      if (!live()) { try { URL.revokeObjectURL(url); } catch { /* gone */ } return; }
      previewUrlRef.current = url;
      const play = async (src: string) => {
        const audio = new Audio(src);
        audio.onended = () => { if (audioRef.current === audio) stopPreview(); };
        audioRef.current = audio;
        await audio.play();
        return audio;
      };
      let audio: HTMLAudioElement;
      try {
        audio = await play(url);
      } catch (first) {
        // A blob: URL may be refused by the panel's content policy (untested on every host): the same bytes as a
        // data: URL. Reading the blob back can fail for the same reason; then the first error is reported.
        if (!live()) return;
        let dataUrl: string | null = null;
        try {
          const blob = await (await fetch(url)).blob();
          dataUrl = bytesToDataUrl(new Uint8Array(await blob.arrayBuffer()), blob.type);
        } catch { dataUrl = null; }
        try { URL.revokeObjectURL(url); } catch { /* gone */ }
        previewUrlRef.current = null;
        if (!live()) return;
        if (!dataUrl) throw first;
        audio = await play(dataUrl);
      }
      if (!live() || audioRef.current !== audio) { audio.pause(); return; }
      setPlayState("playing"); setPlayingAudio(audio);
    } catch (e: any) {
      if (!live()) return;
      stopPreview();
      const said = String(e?.message || "") === "host_tools" || String(e?.message || "") === "timeout" || String(e?.message || "") === "media_failed" ? hostErrorSay(e, "preview")
        : (l: Lang) => t(l, "previewFailed", { detail: sayError(l, e) });
      setStatus({ tone: "error", say: said });
    }
  }

  // ---- clips and photos ----
  const allRids: string[] = inventory ? inventory.resources.map((r: any) => r.rid) : [];
  const selectedRids = clipMode === "choose" && only ? allRids.filter((rid) => only.includes(rid)) : allRids;
  const photoList: any[] = inventory?.photos || [];
  const allPhotoRids: string[] = photoList.map((r: any) => r.rid);
  const selectedPhotoRids = clipMode === "choose" && onlyPhotos ? allPhotoRids.filter((rid) => onlyPhotos.includes(rid)) : allPhotoRids;
  const usedPhotoRids = usePhotos ? selectedPhotoRids : [];
  const chooseClips = (next: string[]) => {
    if (busyRef.current) return;
    const keep = new Set(next);
    const ordered = allRids.filter((rid) => keep.has(rid));
    setOnly(ordered.length === allRids.length ? null : ordered);
  };
  const toggleClip = (rid: string, on: boolean) => chooseClips(on ? [...selectedRids, rid] : selectedRids.filter((x) => x !== rid));
  const choosePhotos = (next: string[]) => {
    if (busyRef.current) return;
    const keep = new Set(next);
    const ordered = allPhotoRids.filter((rid) => keep.has(rid));
    setOnlyPhotos(ordered.length === allPhotoRids.length ? null : ordered);
  };
  const togglePhoto = (rid: string, on: boolean) => choosePhotos(on ? [...selectedPhotoRids, rid] : selectedPhotoRids.filter((x) => x !== rid));

  // What the footage supports right now: a dry run of the planner with the cached search hits and spans (clips not
  // searched yet still count, through the planner's filler moments). Close-ups are only counted once every chosen
  // video has been searched (by a Build).
  // The dry run follows the section with a short delay, so dragging the waveform does not re-plan on every move.
  const [drySection, setDrySection] = React.useState<number | null>(null);
  React.useEffect(() => { const id = setTimeout(() => setDrySection(section), 250); return () => clearTimeout(id); }, [section]);
  const searchedAll = !!projectId && selectedRids.every((rid) => searchCache.current.has(projectId + "|" + rid));
  const dry = React.useMemo(() => {
    if (!inventory || !projectId || (!selectedRids.length && !usedPhotoRids.length)) return null;
    const durations: Record<string, number> = {}, badSpans: Record<string, number[][]> = {}, motion: Record<string, any> = {};
    const candidates: any[] = [];
    for (const r of inventory.resources) {
      if (!selectedRids.includes(r.rid)) continue;
      durations[r.rid] = r.duration;
      const hits = searchCache.current.get(projectId + "|" + r.rid);
      if (hits) candidates.push(...hits);
      const spans = spansCache.current.get(projectId + "|" + r.rid);
      if (spans) badSpans[r.rid] = spans;
      const curve = motionCache.current.get(projectId + "|" + r.rid);
      if (curve) motion[r.rid] = curve;
    }
    try {
      return saePlanBuild({ fps: 30, bars: wantedBars, seed, cue, sectionStart: drySection ?? undefined, candidates, durations, badSpans, photos: usedPhotoRids, usePhotos,
        motion, stillWeight: SAE_STILL_WEIGHT_PANEL });
    } catch { return null; }
  }, [inventory, projectId, selectedRids.join(","), usedPhotoRids.join(","), usePhotos, cue, drySection, wantedBars, seed, cacheTick]);
  const fitBars = dry && dry.ok ? dry.fit.bars : wantedBars;
  const listening = musicId === "own" && ownState === "listening";
  const canBuild = !!assets && !!inventory && !!dry && dry.ok && !listening && !(musicId === "own" && !ownFile);

  // ---- build ----
  // Bad-shot spans, motion curves and scene search through the shared steps above, with this panel's caches.
  function readBadSpans(pid: string, inv: any, rids: string[], check: () => void, onProgress: (done: number, total: number) => void) {
    return readSpans(sdk, pid, inv, rids, spansCache.current, check, onProgress);
  }
  function readMotion(pid: string, inv: any, rids: string[], check: () => void, onProgress: (done: number, total: number) => void) {
    return readMotionCurves(pid, inv, rids, motionCache.current, check, onProgress);
  }
  async function searchClips(pid: string, rids: string[], check: () => void) {
    const failed = await searchCloseUps(run, assets, pid, rids, searchCache, check, (fraction, done, total) => advance("search", fraction, (l) => t(l, "videosSearched", { done, count: total })));
    setCacheTick((n) => n + 1);
    return failed;
  }

  async function build(nextSeed: number) {
    if (busyRef.current || !assets || !skillsDir || !projectId) return;
    if (musicId === "own" && !ownFile) { setStatus({ tone: "error", say: (l) => t(l, "chooseMusicFile") }); return; }
    if (listening) return;
    const pid = projectId;
    const guard = saeRunGuard(runGenRef, projectRef, pid, STALE);
    const check = guard.check;
    // Everything as it is at the click; a later "Finish look" reuses what this build sent.
    const bl = langRef.current;
    const settings = { cue, musicId, ownFile, section, lookId, lookOn, bars: wantedBars, clipSound, usePhotos, only: clipMode === "choose" ? only : null, onlyPhotos: clipMode === "choose" ? onlyPhotos : null };
    busyRef.current = true;
    stopPreview();
    setBusy(true); setStatus(null); setResult(null);
    progressRef.current = null;
    advance("check", 0);
    try {
      // Step 1: a fresh inventory (clips may have finished analysing) and every chosen video's bad-shot spans.
      const inv = await run("Read footage", fill(assets.scripts.inventoryJs, { projectId: pid, only: null, known: photoSizesRef.current, ...(settings.usePhotos ? {} : { measureMs: 0 }) }));
      check();
      applyInventory(inv);
      const rids: string[] = inv.resources.filter((r: any) => !settings.only || settings.only.includes(r.rid)).map((r: any) => r.rid);
      const photos: string[] = settings.usePhotos ? inv.photos.filter((p: any) => !settings.onlyPhotos || settings.onlyPhotos.includes(p.rid)).map((p: any) => p.rid) : [];
      if (!rids.length && !photos.length) throw uiError((l) => t(l, "noSources"));
      advance("check", 0.2);
      // With the stillness picker on, spans take the step to 60% and motion the rest.
      const stillOn = SAE_STILL_WEIGHT_PANEL > 0 && saeHas(["rt.runFFmpeg", "fs.join", "fs.homedir", "fs.mkdirSync"]).ok;
      const spanShare = stillOn ? 0.4 : 0.8;
      const badSpans = await readBadSpans(pid, inv, rids, check, (done, total) => advance("check", 0.2 + spanShare * (total ? done / total : 1), (l) => t(l, "videosChecked", { done, count: total })));
      check();
      const motion = stillOn ? await readMotion(pid, inv, rids, check, (done, total) => advance("check", 0.6 + 0.4 * (total ? done / total : 1), (l) => t(l, "videosMeasured", { done, count: total }))) : {};
      check();
      advance("check", 1);
      // Step 2: close-ups (cached per clip).
      advance("search", 0);
      const unsearched = await searchClips(pid, rids, check);
      check();
      advance("search", 1, (l) => t(l, "videosSearched", { done: rids.length, count: rids.length }));
      // Steps 3 and 4: the plan, the music and the Draft (commit 1).
      const { plan, a, name, holds, deco, seconds } = await buildDraft({ run, assets, pid, skillsDir, settings, nextSeed, bl, inv, rids, photos, badSpans, motion, searchCache, check, advance });
      check();
      setResult({ name, sequenceId: a.sequenceId, decorated: false, deco, link: null, shots: holds.length, seconds,
        plan: { notes: plan.notes, faceClips: plan.faceClips, fit: plan.fit }, unsearched: unsearched.length, notes: a.notes || [] });
      await decorate(deco, check);
    } catch (e: any) {
      if (e !== STALE && guard.live()) setStatus({ tone: "error", say: stopAt(e) });
    } finally { endRun(guard); }
  }

  // Commit 2 (mute when Clip sound is Off, one whip + look effect per clip), then open the Draft. decorate.js adds
  // only what an earlier attempt did not, so "Finish look" can run it again.
  async function decorate(deco: any, check: () => void) {
    advance("look", 0);
    let dr: any;
    try {
      dr = await addWhipAndLook(run, assets, deco);
    } catch (e: any) {
      if (e === STALE) throw e;
      throw uiError((l) => t(l, "finishFailed", { detail: sayError(l, e) }));
    }
    check();
    // alreadyDone (an earlier attempt's commit landed, nothing left to add) is success too. decorate.js notes are
    // English details like assemble.js's; they replace the previous attempt's so a "Finish look" retry never repeats them.
    setResult((r: any) => (r ? { ...r, decorated: true, decoNotes: (dr && dr.notes) || [] } : r));
    advance("look", 0.8, (l) => t(l, "detail.open"));
    try {
      const o = await run("Open the new Draft", "const id = " + JSON.stringify(deco.sequenceId) + ";\n"
        + "let link = null, openError = null;\n"
        + "try { link = (await selects.editor.linkToDraftFrame(id, 0)).deepLinkUrl; } catch (e) { link = null; }\n"
        + "try { await selects.editor.openDraft(id); } catch (e) { openError = String((e && e.message) || e); }\n"
        + "return { link, openError };");
      check();
      setResult((r: any) => (r ? { ...r, link: o.link || null } : r));
      if (o.openError) throw new Error(o.openError);
    } catch (e: any) {
      if (e === STALE) throw e;
      check();
      setStatus({ tone: "error", say: (l) => t(l, "openFailed", { detail: sayError(l, e) }) });
    }
    advance("look", 1);
  }

  // "Try other shots": the same clips and cached search, a new seed; the previous result goes first.
  function buildAnother() {
    if (busyRef.current) return;
    setResult(null); setStatus(null);
    const s = seed + 1;
    setSeed(s);
    build(s);
  }

  async function finishLook() {
    if (busyRef.current || !result || !assets) return;
    const guard = saeRunGuard(runGenRef, projectRef, projectId, STALE);
    const check = guard.check;
    busyRef.current = true; stopPreview(); setBusy(true); setStatus(null);
    progressRef.current = null;
    try { await decorate(result.deco, check); }
    catch (e: any) { if (e !== STALE && guard.live()) setStatus({ tone: "error", say: stopAt(e) }); }
    finally { endRun(guard); }
  }

  // ---- render ----
  const analysisText = saeAnalysisText(L, invAnalysis);
  const seconds = Math.round(SAE_LEAD + saeVideoSeconds(fitBars, editBpm));
  const readyFacts = !inventory ? "" : [
    selectedRids.length ? (searchedAll && dry && dry.ok ? t(L, "readyCloseUps", { count: dry.faceClips }) : t(L, "readyClips", { count: selectedRids.length })) : "",
    usedPhotoRids.length ? t(L, "readyPhotos", { count: usedPhotoRids.length }) : "",
    t(L, "aboutSeconds", { seconds }),
    ...saeAnalysisNotes(L, invAnalysis),
  ].filter(Boolean).join(" · ");
  const readiness = !inventory ? (invError ? t(L, "readFailed", { detail: invError.say(L) }) : t(L, "checkingClipsNow"))
    : inventory.resources.length === 0 && !allPhotoRids.length ? (analysisText || t(L, "noFootage"))
    : inventory.resources.length === 0 && !usePhotos ? [analysisText, t(L, "turnOnPhotos")].filter(Boolean).join(t(L, "gap"))
    : selectedRids.length === 0 && usedPhotoRids.length === 0 ? t(L, "noClipsSelected")
    : dry && !dry.ok && (dry.notes || []).includes("music-too-short") ? t(L, "musicTooShortBuild")
    : dry && !dry.ok ? [t(L, "noSources"), analysisText].filter(Boolean).join(t(L, "gap"))
    : t(L, "ready", { summary: readyFacts });
  const progressLabel = !progress ? "" : progress.detail
    ? t(L, "progressDetail", { step: progress.current + 1, total: SAE_BUILD_STEPS.length, name: t(L, "step." + progress.id), detail: progress.detail(L), percent: progress.percent })
    : t(L, "progress", { step: progress.current + 1, total: SAE_BUILD_STEPS.length, name: t(L, "step." + progress.id), percent: progress.percent });
  const peaks: number[] = (cue && cue.peaks) || [];
  const total = cue && cue.durationSeconds > 0 ? cue.durationSeconds : 0;
  const silent = musicId === "none" && clipSound === "off";
  const showSlider = !!cue && total > 0 && !(musicId === "own" && (!ownFile || listening));
  const shrunk = dry && dry.ok && dry.fit.bars < dry.fit.wanted;
  const planNotes = result ? saePlanNotes(L, result.plan) : [];
  const scriptNotes: string[] = result ? [...(result.notes || []), ...(result.decoNotes || [])] : [];

  if (!projectId) return <ui.Message tone="error">{t(L, "openProject")}</ui.Message>;
  if (fatal) return <ui.Message tone="error">{fatal.say(L)}</ui.Message>;

  return (
    <div style={{ minWidth: 0, wordBreak: L === "ko" ? "keep-all" : undefined, overflowWrap: "anywhere" }}>
      <ui.Stack gap={16}>
        <ui.Row gap={8} align="center">
          <ui.Message tone={!inventory && invError ? "error" : "muted"}>{readiness}</ui.Message>
          <ui.Button variant="ghost" busy={invLoading} busyLabel={t(L, "refreshing")} disabled={busy || !assets} onClick={() => loadInventory()}>{t(L, "refresh")}</ui.Button>
        </ui.Row>
        {inventory && invError ? <ui.Message tone="error">{t(L, "refreshFailed", { detail: invError.say(L) })}</ui.Message> : null}

        <ui.Section title={t(L, "clips")}>
          <ui.Segmented label={t(L, "clips")} value={clipMode} disabled={busy}
            onChange={(v: "auto" | "choose") => { if (!busyRef.current) setClipMode(v); }}
            options={[{ label: t(L, "clips.auto"), value: "auto" }, { label: t(L, "clips.choose"), value: "choose" }]} />
          {clipMode === "choose" && inventory && (allRids.length || allPhotoRids.length) ? (
            <div role="group" aria-label={t(L, "clips.choose")} style={{ minWidth: 0 }}>
              <ui.Row gap={4} align="center">
                <small style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t(L, "chooseClipsCount", { selected: selectedRids.length + usedPhotoRids.length, total: allRids.length + (usePhotos ? allPhotoRids.length : 0) })}
                </small>
                <ui.Button variant="ghost" disabled={busy || (!only && !onlyPhotos)} onClick={() => { chooseClips(allRids); choosePhotos(allPhotoRids); }}>{t(L, "all")}</ui.Button>
                <ui.Button variant="ghost" disabled={busy || selectedRids.length + selectedPhotoRids.length === 0} onClick={() => { chooseClips([]); choosePhotos([]); }}>{t(L, "none")}</ui.Button>
              </ui.Row>
              {/* One row per clip: the name truncates, duration and shape stay visible; long lists scroll inside. */}
              <div style={{ maxHeight: 220, overflowY: "auto", scrollbarGutter: "stable", marginTop: 4, borderRadius: "var(--panel-radius, 6px)", border: "1px solid var(--panel-border, rgba(128, 128, 128, 0.35))" } as any}>
                {inventory.resources.map((r: any) => {
                  const on = selectedRids.includes(r.rid);
                  const hint = shapeHint(L, r.width, r.height);
                  const meta = fmtTime(r.duration) + (hint ? " · " + hint : "");
                  return (
                    <label key={r.rid} title={r.name + " · " + meta}
                      style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, padding: "4px 6px", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>
                      <input type="checkbox" checked={on} disabled={busy} onChange={(e) => toggleClip(r.rid, e.currentTarget.checked)} style={{ flexShrink: 0, margin: 0, width: "auto", height: "auto" }} />
                      <span style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                      <span style={{ flexShrink: 0, fontSize: 11, color: "var(--panel-muted-fg)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{meta}</span>
                    </label>
                  );
                })}
                {/* Photos follow the clips, marked as photos; they are unavailable while Use photos is off. */}
                {photoList.map((r: any) => {
                  const on = usePhotos && selectedPhotoRids.includes(r.rid);
                  const off = busy || !usePhotos;
                  const hint = shapeHint(L, r.width, r.height);
                  const meta = t(L, "photo") + (hint ? " · " + hint : "");
                  const tip = usePhotos ? r.name + " · " + meta : r.name + " · " + meta + " · " + t(L, "usePhotosOff");
                  return (
                    <label key={r.rid} title={tip}
                      style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, padding: "4px 6px", cursor: off ? "default" : "pointer", opacity: off ? 0.6 : 1 }}>
                      <input type="checkbox" checked={on} disabled={off} onChange={(e) => togglePhoto(r.rid, e.currentTarget.checked)} style={{ flexShrink: 0, margin: 0, width: "auto", height: "auto" }} />
                      <span style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                      <span style={{ flexShrink: 0, fontSize: 11, color: "var(--panel-muted-fg)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{meta}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}
          <ui.Toggle label={t(L, "usePhotos")} value={usePhotos} disabled={busy} onChange={setUsePhotos} />
        </ui.Section>

        <ui.Section title={t(L, "music")}>
          {tileRow(<>
            {cues.map((c: any) => (
              <Tile key={c.id} lang={L} on={musicId === c.id} disabled={busy} onClick={() => setMusicId(c.id)}
                label={c.title} sub={t(L, "byAuthor", { author: c.author })} />
            ))}
            <Tile lang={L} on={musicId === "own"} disabled={busy || !canOwn} onClick={() => setMusicId("own")} label={t(L, "ownMusic")} />
            <Tile lang={L} on={musicId === "none"} disabled={busy} onClick={() => setMusicId("none")} label={t(L, "noMusic")} />
          </>, t(L, "music"))}
          {!canOwn ? <ui.Message tone="muted">{t(L, "needsNewerSelectsMusic")}</ui.Message> : null}
          {musicId === "own" && canOwn ? (
            <ui.FileDrop accept={["audio"]} value={ownFile} disabled={busy}
              onChange={(f: any) => { if (f) analyseOwn(f); else clearOwn(); }}
              onReject={() => setOwnStatus({ tone: "error", say: (l) => t(l, "musicFileRejected") })} />
          ) : null}
          {listening ? <ui.Progress label={t(L, "listening")} /> : null}
          {musicId === "own" && ownStatus ? <ui.Message tone={ownStatus.tone === "error" ? "error" : "muted"}>{ownStatus.say(L)}</ui.Message> : null}
          {showSlider ? (
            // Esc on the slider or the preview button (the key bubbles up here) stops the preview.
            <div onKeyDown={(e) => { if (e.key === "Escape" && playState !== "idle") { e.preventDefault(); stopPreview(); } }}>
              <SectionSlider lang={L} peaks={peaks} total={total} section={section} lead={SAE_LEAD}
                windowSeconds={SAE_LEAD + saeVideoSeconds(wantedBars, editBpm)} barSeconds={tempo.fixed ? (4 * 60) / editBpm : (4 * 60) / cue.bpm}
                snap={snap} onChange={setSection} disabled={busy} audio={playingAudio} />
              <ui.Row gap={8} align="center">
                {/* The kit has no stop icon; "pause" marks stop, and the label says what it does. */}
                <ui.IconButton icon={playState === "playing" ? "pause" : playState === "loading" ? "loading" : "play"}
                  label={playState === "playing" ? t(L, "stopPreview") : playState === "loading" ? t(L, "cancelPreview") : t(L, "previewSection")}
                  onClick={preview} disabled={busy || !canOwn || (playState === "idle" && section == null)} />
                <span style={{ minWidth: 0 }}>{section == null ? t(L, "musicTooShort") : t(L, "startsAt", { seconds: Math.round(section * 10) / 10 })}</span>
              </ui.Row>
            </div>
          ) : null}
        </ui.Section>

        <ui.Section title={t(L, "look")}>
          {tileRow(LOOK_PRESETS.map((p) => (
            <Tile key={p.id} lang={L} on={lookId === p.id} disabled={busy} onClick={() => setLookId(p.id)} label={lookLabel(L, p.id)}
              icon={<span aria-hidden="true" style={{ display: "block", width: 22, height: 22, flexShrink: 0, borderRadius: "50%", background: p.swatch, opacity: lookOn ? 1 : 0.35,
                boxShadow: "inset 0 0 0 1px var(--panel-border, rgba(128, 128, 128, 0.35))" }} />} />
          )), t(L, "look"))}
          <ui.Toggle label={t(L, "lookOn")} value={lookOn} disabled={busy} onChange={setLookOn} />
        </ui.Section>

        <ui.Stack gap={8}>
          <ui.Segmented label={t(L, "length")} value={length} disabled={busy} onChange={setLength}
            options={[{ label: t(L, "length.short"), value: "short" }, { label: t(L, "length.standard"), value: "standard" }, { label: t(L, "length.long"), value: "long" }]} />
          {shrunk ? <ui.Message tone="muted">{t(L, "barsFit", { fit: dry.fit.bars, count: dry.fit.wanted })}</ui.Message> : null}
          <ui.Segmented label={t(L, "clipSound")} value={clipSound} disabled={busy} onChange={setClipSound}
            options={[{ label: t(L, "sound.off"), value: "off" }, { label: t(L, "sound.ambient"), value: "ambient" }, { label: t(L, "sound.full"), value: "full" }]} />
          {silent ? <ui.Message tone="muted">{t(L, "silentVideo")}</ui.Message> : null}
        </ui.Stack>

        {progress ? <ui.Progress value={progress.value} label={progressLabel} steps={SAE_BUILD_STEPS.map((s) => t(L, "step." + s.id))} current={progress.current} />
          : busy ? <ui.Progress label={t(L, "working")} /> : null}
        {status ? <ui.Message tone={status.tone === "error" ? "error" : "muted"}>{status.say(L)}</ui.Message> : null}
        {result && result.decorated ? (
          <ui.Message tone="success">{t(L, "resultLine", { name: result.name, count: result.shots, seconds: Math.round(result.seconds) })}</ui.Message>
        ) : result && busy ? <ui.Message tone="muted">{t(L, "draftCreatedAdding")}</ui.Message> : null}
        {result && result.decorated ? <ui.Message tone="muted">{t(L, "draftCreated")}</ui.Message> : null}
        {result?.link ? (
          <ui.Row gap={8} align="center">
            <a href={result.link} target="_blank" rel="noreferrer">{t(L, "openDraft")}</a>
            <ui.IconButton icon="copy" label={t(L, "copyLink")} onClick={() => { navigator.clipboard?.writeText(result.link).catch(() => null); }} />
          </ui.Row>
        ) : null}
        {planNotes.map((text, i) => <ui.Message key={i} tone="muted">{text}</ui.Message>)}
        {result?.unsearched ? <ui.Message tone="muted">{t(L, "unsearched", { count: result.unsearched })}</ui.Message> : null}
        {scriptNotes.length ? <ui.Message tone="muted">{t(L, "note", { detail: scriptNotes.join("; ") })}</ui.Message> : null}
        <ui.Actions>
          {result && !result.decorated && !busy ? <ui.Button onClick={finishLook} disabled={busy}>{t(L, "finishLook")}</ui.Button> : null}
          {result ? <ui.Button variant="secondary" onClick={buildAnother} disabled={busy || !canBuild}>{t(L, "anotherVersion")}</ui.Button> : null}
          <ui.Button variant="primary" busy={busy} busyLabel={t(L, "building")} onClick={() => build(seed)} disabled={busy || !canBuild}>{t(L, "build")}</ui.Button>
        </ui.Actions>
      </ui.Stack>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Template runs. A built-in app asks the person for the footage and a track, mounts this panel out of sight and hands
// both over in `context.template`. The run builds a new Draft at once from only those files, as Build does with every
// other setting at the panel's default, never opens it, and ends by calling `sdk.finishTemplate` exactly once.
// ---------------------------------------------------------------------------
type TemplateOutcome = { sequenceId: string } | { error: string };
const TEMPLATE_TRACK = "make-funk";
// The panel's first Build uses seed 1 ("Try other shots" counts up from there).
const TEMPLATE_SEED = 1;
// Files per alias call: a photo gets its own scratch Draft, which keeps each call well inside runScript's 30 s.
const TEMPLATE_ALIAS_BATCH = 6;
// Error text for the hidden frame's log (an Error logged as an object shows as {}).
function errorText(e: any) { return String(e?.message || e); }

// Handed files carry the app's own Resource ids. The SDK accepts those as input, but reads back the Project's short
// aliases (r0, r1, ...) from resources() and from a Draft's clips, and assemble.js and decorate.js match the placed
// clips to their holds by that id (crop, clip sound, whip and look). So each handed file is placed once on an unsaved
// scratch Draft, whose new clip reports the file's alias; a photo gets a Draft of its own, whose frame size is the
// photo's, as inventory.js measures it. Nothing is committed. A file that cannot be placed is left out.
const TEMPLATE_ALIAS_JS = `const cfg = __CONFIG__;
const p = selects.project(cfg.projectId);
const resolved = [];
let shared = null;
for (const h of cfg.files) {
  try {
    const photo = h.kind === 'image';
    const d = photo || !shared ? await p.createDraft({ name: 'Selfie Aesthetic Edit id check' }) : shared;
    if (!photo) shared = d;
    const before = new Set((await d.clips({ trackScope: 'main' })).map(c => c.clipId));
    try { await d.insertResource({ resourceId: h.rid, sourceRange: { startSeconds: 0, endSeconds: 0.5 } }); }
    catch (e) { await d.insertResource({ resourceId: h.rid }); }
    const clip = (await d.clips({ trackScope: 'main' })).find(c => c.resourceId !== null && !before.has(c.clipId));
    if (!clip) continue;
    let size = null;
    if (photo) {
      const fs = (await d.meta()).frameSize;
      if (fs && fs.width > 0 && fs.height > 0) size = { width: fs.width, height: fs.height };
    }
    resolved.push({ rid: h.rid, alias: clip.resourceId, size });
  } catch (e) {}
}
return { resolved };`;

// The whole template build. Returns the new Draft; throws a uiError for the person, or STALE when a newer run (or the
// frame closing) replaced this one. `advance` names the current build step for the status line and the error.
async function runSelfieTemplate(sdk: any, context: any, check: () => void, advance: Advance): Promise<{ sequenceId: string }> {
  const pid: string | null = context?.projectId ?? null;
  if (!pid) throw uiError((l) => t(l, "openProject"));
  // Each handed video or photo once, in the order it was picked.
  const seen = new Set<string>();
  const files: Array<{ rid: string; kind: string }> = [];
  for (const input of context?.template?.inputs?.footage ?? []) {
    if (!input || (input.kind !== "video" && input.kind !== "image") || !input.resourceId || seen.has(input.resourceId)) continue;
    seen.add(input.resourceId);
    files.push({ rid: String(input.resourceId), kind: input.kind });
  }
  const run: RunFn = (summary, script, allowCommit = false) => runStep(sdk, summary, script, allowCommit);

  advance("check", 0);
  // The installed plugin folder through the host FileSystem, as the panel finds it (no shell, so Windows works too).
  const skillsDir = saeSkillsDir(PLUGIN_ID);
  if (!skillsDir) throw uiError((l) => t(l, "pluginMissing"));
  let assets: any;
  try { assets = await loadAssets(skillsDir); }
  catch (e: any) { if (String(e?.message) === "host_tools") throw uiError((l) => t(l, "needsNewerSelects")); throw e; }
  check();
  // The track chosen on the app's page; an unknown or missing one gets the panel's default.
  const cues: any[] = assets.manifest.cues || [];
  const cue = cues.find((c) => c.id === context?.template?.options?.track) || cues.find((c) => c.id === TEMPLATE_TRACK) || cues[0];
  if (!cue) throw new Error("no bundled music in assets/cues/manifest.json");

  const resolved: Array<{ rid: string; alias: string; size: { width: number; height: number } | null }> = [];
  const resolveFiles = async (list: Array<{ rid: string; kind: string }>) => {
    for (let i = 0; i < list.length; i += TEMPLATE_ALIAS_BATCH) {
      const r = await run("Find the chosen files", fill(TEMPLATE_ALIAS_JS, { projectId: pid, files: list.slice(i, i + TEMPLATE_ALIAS_BATCH) }));
      check();
      resolved.push(...(r.resolved || []));
    }
  };
  await resolveFiles(files);
  // The alias script skips a file whose placement fails, so the files it skipped get one more pass.
  const unresolved = files.filter((f) => !resolved.some((r) => r.rid === f.rid));
  if (unresolved.length) await resolveFiles(unresolved);
  const aliases = [...new Set(resolved.map((r) => r.alias))];
  const known: Record<string, { width: number; height: number }> = {};
  for (const r of resolved) if (r.size) known[r.alias] = r.size;
  // sdk.call (bad-shot spans) wants the app's ids: each alias maps back to the handed id it came from.
  const realIds: Record<string, string> = {};
  for (const r of resolved) realIds[r.alias] = r.rid;
  // The panel's inventory limited to the handed files: analysed videos with their length, frame size and source file,
  // and photos.
  const inv = aliases.length
    ? await run("Read footage", fill(assets.scripts.inventoryJs, { projectId: pid, only: aliases, known }))
    : { resources: [], photos: [], skipped: { unanalysed: 0, missing: 0 } };
  check();
  inv.resources = inv.resources || [];
  inv.photos = inv.photos || [];
  const rids: string[] = inv.resources.map((r: any) => r.rid);
  const photos: string[] = inv.photos.map((p: any) => p.rid);
  if (!rids.length && !photos.length) throw uiError((l) => t(l, "noSources"));
  advance("check", 0.2);
  // Bad-shot spans and, with the stillness picker on, motion curves, as Build reads them.
  const stillOn = SAE_STILL_WEIGHT_PANEL > 0 && saeHas(["rt.runFFmpeg", "fs.join", "fs.homedir", "fs.mkdirSync"]).ok;
  const spanShare = stillOn ? 0.4 : 0.8;
  const badSpans = await readSpans(sdk, pid, inv, rids, new Map(), check, (done, total) => advance("check", 0.2 + spanShare * (total ? done / total : 1)), realIds);
  check();
  const motion = stillOn ? await readMotionCurves(pid, inv, rids, new Map(), check, (done, total) => advance("check", 0.6 + 0.4 * (total ? done / total : 1))) : {};
  check();
  advance("check", 1);

  // Scene search over the handed videos. Nobody can press Build again, so clips whose search failed get one more try
  // (the cache keeps the ones that worked); any still unsearched build as regular clips, as in the panel.
  advance("search", 0);
  const searchCache = { current: new Map<string, any[]>() };
  const progress = (fraction: number) => advance("search", fraction);
  let failed = await searchCloseUps(run, assets, pid, rids, searchCache, check, progress);
  if (failed.length) failed = await searchCloseUps(run, assets, pid, rids, searchCache, check, progress);
  if (failed.length) console.info("[selfie-aesthetic] template run: scene search failed for", failed.join(", "));
  advance("search", 1);

  // Every other setting at the panel's default: the Short length, Soft glow on, Ambient clip sound, photos on, the
  // track's default section.
  const bars = SAE_LENGTHS.short;
  const section = saeDefaultSection(cue, bars, saeTempo(cue).editBpm);
  const settings = { cue, musicId: cue.id, ownFile: null, section, lookId: "soft-glow", lookOn: true, bars, clipSound: "ambient", usePhotos: true, only: null, onlyPhotos: null };
  const { a, deco } = await buildDraft({ run, assets, pid, skillsDir, settings, nextSeed: TEMPLATE_SEED, bl: uiLang(context), inv, rids, photos, badSpans, motion, searchCache, check, advance });
  check();
  if (a.notes?.length) console.info("[selfie-aesthetic] template run notes:", a.notes.join("; "));

  // Commit 2. decorate.js skips what an earlier attempt added, so a failed attempt is tried once more.
  advance("look", 0);
  try {
    await addWhipAndLook(run, assets, deco);
  } catch (e) {
    console.warn("[selfie-aesthetic] Add whip and look failed, trying again:", errorText(e));
    check();
    await addWhipAndLook(run, assets, deco);
  }
  check();
  advance("look", 1);
  // Nobody sees this frame, so the Draft is not opened: the app takes the person to it.
  return { sequenceId: a.sequenceId };
}

// What the app mounts out of sight for a template run: one status line. It starts once per runId and ends the run
// exactly once, unless a newer run (or the frame closing) replaced it; then it reports nothing.
function TemplateRun({ sdk, context }: any) {
  const L = uiLang(context);
  const [status, setStatus] = React.useState<Say>(() => (l: Lang) => t(l, "working"));
  const started = React.useRef<string | null>(null);
  const alive = React.useRef(true);
  // The latest context, so a run reports only while it is still the current one.
  const latest = React.useRef<any>(context);
  latest.current = context;
  const runId: string | null = context?.template?.runId ?? null;
  React.useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  React.useEffect(() => {
    if (runId == null || started.current === runId) return;
    started.current = runId;
    const snapshot = context;
    const lang = uiLang(snapshot);
    const live = () => alive.current && latest.current?.template?.runId === runId;
    const check = () => { if (!live()) throw STALE; };
    let ended = false, at: any = null;
    const advance = (id: string, fraction: number) => { at = saeProgress(id, fraction); if (live()) setStatus(() => (l: Lang) => t(l, "step." + id)); };
    const end = (outcome: TemplateOutcome | null) => {
      if (ended) return;
      ended = true;
      if (!outcome || !live()) return;
      try { sdk.finishTemplate(outcome); } catch (e) { console.warn("[selfie-aesthetic] finishTemplate failed:", errorText(e)); }
    };
    (async () => {
      try {
        end(await runSelfieTemplate(sdk, snapshot, check, advance));
      } catch (e: any) {
        if (e === STALE) { end(null); return; }
        console.warn("[selfie-aesthetic] template run failed" + (at ? " at " + at.id : "") + ":", errorText(e), e);
        // A message written for the person is said as is; anything else names the step it stopped at.
        const said = typeof e?.say === "function" || !at ? sayError(lang, e)
          : t(lang, "stoppedAt", { step: at.current + 1, total: SAE_BUILD_STEPS.length, name: t(lang, "step." + at.id), detail: sayError(lang, e) });
        end({ error: said });
      } finally {
        end({ error: sayError(lang, uiError((l) => t(l, "stepFailed"))) });
      }
    })();
  }, [runId]);
  return <div role="status" style={{ fontSize: 11, color: "var(--panel-muted-fg)" }}>{status(L)}</div>;
}

export default function Panel(props: any) {
  return props?.context?.template ? <TemplateRun sdk={props.sdk} context={props.context} /> : <SelfieAestheticPanel {...props} />;
}
