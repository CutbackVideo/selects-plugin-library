// @name Mini Vlog
// @name:de Mini-Vlog
// @name:en Mini Vlog
// @name:es Mini vlog
// @name:fr Mini vlog
// @name:it Mini vlog
// @name:ja ミニ Vlog
// @name:ko Mini Vlog
// @name:pt Mini vlog
// @name:tr Mini Vlog
// @name:zh 迷你 Vlog
// @icon sparkles
// Builds a beat-cut 16:9 mini vlog with one static title lockup and a soft look as a new, editable Draft.
import React from "react";

// STRINGS:BEGIN
const STRINGS = {
  en: {
    openProject: "Open a Project to build a Mini Vlog.",
    startFailed: "Mini Vlog could not start: {detail}. Reinstall the plugin if this persists.",
    foldersNotFound: "the plugin folders could not be found",
    adapterNeeded: "This Selects build needs an updated {name} adapter.",
    stepFailed: "Selects could not complete this step.",
    busy: "Selects is busy and didn't answer in time. Wait a moment and press Refresh. If it keeps happening, restart Selects.",
    invFailed: "Couldn't read this Project's clips yet. Press Refresh.",
    invPartial: "Couldn't read all clips yet. Press Refresh.",
    sizesLoading: "Clip sizes are still loading…",
    refreshFailed: "Could not refresh the clip list: {detail}",
    details: "Details: {detail}",
    refresh: "Refresh",
    refreshing: "Refreshing",
    checkingClipsNow: "Checking clips…",
    checkingClips: "Checking clips",
    listening: "Listening for the beat",
    working: "Working",
    stillReading: "Still reading this Project's clips… This updates automatically.",
    noFootage: "No analysed video or photos in this Project yet. Add video clips and analyse them, or add photos; this updates automatically.",
    turnOnPhotos: "Turn on Use photos in Advanced to build from this Project's photos.",
    noClipsSelected: "No clips selected. Choose clips in Advanced.",
    gap: " ",
    ready: "Ready: {summary}",
    clips: { one: "{count} clip", other: "{count} clips" },
    clipsSelected: { one: "{selected} of {count} clip selected", other: "{selected} of {count} clips selected" },
    photos: { one: "{count} photo", other: "{count} photos" },
    photosSelected: { one: "{selected} of {count} photo selected", other: "{selected} of {count} photos selected" },
    aboutSeconds: "about {seconds} s",
    notAnalysed: { one: "{count} clip not analysed yet", other: "{count} clips not analysed yet" },
    analysing: { one: "{count} clip is being analysed. This updates automatically when it finishes.", other: "{count} clips are being analysed. This updates automatically when they finish." },
    notAnalysedAnalyse: { one: "{count} clip is not analysed yet. Analyse it in Selects to use it here.", other: "{count} clips are not analysed yet. Analyse them in Selects to use them here." },
    notAnalysedMaybe: { one: "{count} clip is not analysed yet. If Selects is analysing it, this updates automatically.", other: "{count} clips are not analysed yet. If Selects is analysing them, this updates automatically." },
    analysisFailed: { one: "{count} clip could not be analysed.", other: "{count} clips could not be analysed." },
    noteAnalysing: { one: "{count} clip being analysed", other: "{count} clips being analysed" },
    noteFailed: { one: "{count} clip could not be analysed", other: "{count} clips could not be analysed" },
    title: "Title",
    titleStyle: "Title style",
    titlePreview: "Title preview",
    previewUnavailable: "Preview unavailable; the title is still added to the Draft.",
    loading: "Loading…",
    "preset.mini-vlog": "Mini vlog",
    "preset.day-in-my-life": "A day in my life",
    "preset.small-glimpse": "A small glimpse",
    "field.mini-vlog.big": "Big word",
    "field.mini-vlog.small": "Small word",
    "field.day-in-my-life.year": "Year",
    "field.day-in-my-life.big": "Big words",
    "field.day-in-my-life.tag": "Tag line",
    "field.small-glimpse.top": "Top line",
    "field.small-glimpse.big": "Big word",
    "field.small-glimpse.bottom": "Bottom line",
    fieldCount: "{label} ({used}/{max})",
    music: "Music",
    track: "Track",
    alternatives: "Alternatives",
    ownMusic: "Your own music",
    noMusic: "No music",
    bpm: "{bpm} bpm",
    installTools: "Install ffmpeg and Node.js 18+ to preview music or use your own track.",
    sectionHint: "Music section — drag to choose",
    sectionLabel: "Music section",
    musicTooShort: "This track is too short for this length",
    startsAt: "Starts at {seconds} s",
    stopPreview: "Stop preview",
    cancelPreview: "Cancel preview",
    previewSection: "Preview this section",
    readingMusic: "Reading the music…",
    musicLengthUnknown: "The length of this music is unknown",
    startAtHook: "Start at the hook",
    beatFound: "Beat found: {bpm} bpm. Cuts follow the beat.",
    faintTempo: "Tempo found ({bpm} bpm) but the beat is faint, so cuts follow a {bpm} bpm grid approximately.",
    outsideTempo: "Its tempo ({bpm} bpm) is outside 70–160 bpm, so cuts use approximate timing.",
    noBeat: "No steady beat found, so cuts use approximate timing.",
    length: "Length",
    "length.short": "Short",
    "length.standard": "Standard",
    "length.long": "Long",
    pace: "Pace",
    "pace.quick": "Quick",
    "pace.relaxed": "Relaxed",
    "pace.groove": "Groove",
    fitPartial: { one: "{length}: {fitted} of {count} shot fit this track ({seconds} s)", other: "{length}: {fitted} of {count} shots fit this track ({seconds} s)" },
    fitFull: { one: "{length}: {count} shot ({seconds} s)", other: "{length}: {count} shots ({seconds} s)" },
    footageFits: { one: "Your footage fits {fitted} of {count} shot ({seconds} s)", other: "Your footage fits {fitted} of {count} shots ({seconds} s)" },
    seconds: "{seconds} s",
    grooveTiming: "Groove on a {beat} s beat: {hold}, {beat} and {eighth} s shots",
    quickTwoBeats: "At {bpm} bpm Quick uses 2 beats per shot.",
    relaxedOneBeat: "At {bpm} bpm Relaxed uses 1 beat per shot.",
    grooveOneBeat: "At {bpm} bpm Groove opens phrases with 1 beat.",
    grooveTwoBeats: "At {bpm} bpm Groove uses 2 beats per shot.",
    noMusicTiming: "No music: shots use approximate timing ({timing}).",
    faintTempoTiming: "Tempo found ({bpm} bpm) but the beat is faint: cuts follow a {bpm} bpm grid approximately ({timing}).",
    outsideTempoTiming: "Tempo outside 70–160 bpm ({bpm} bpm): shots use approximate timing ({timing}).",
    noBeatTiming: "No steady beat found: shots use approximate timing ({timing}).",
    advanced: "Advanced",
    clipSound: "Clip sound",
    "sound.off": "Off",
    "sound.ambient": "Ambient",
    "sound.full": "Full",
    softLook: "Soft look",
    beatPunch: "Beat punch",
    usePhotos: "Use photos",
    usePhotosOff: "Use photos is off",
    silentVideo: "Silent video: no music and Clip sound is Off.",
    chooseClips: "Choose clips",
    chooseClipsCount: "Choose clips ({selected}/{total})",
    all: "All",
    none: "None",
    photo: "Photo",
    "shape.tall": "Tall",
    "shape.wide": "Wide",
    "shape.square": "Square",
    "step.shots": "Choosing shots",
    "step.music": "Preparing music",
    "step.draft": "Creating Draft",
    "step.look": "Adding title and look",
    "step.open": "Opening Draft",
    progress: "Step {step}/{total} · {name} · {percent}%",
    progressDetail: "Step {step}/{total} · {name} ({detail}) · {percent}%",
    videosChecked: { one: "{done}/{count} video checked", other: "{done}/{count} videos checked" },
    photosOnly: "photos only",
    stoppedAt: "Stopped at step {step}/{total}, {name}: {detail}",
    "fail.one-resource": "Add at least 2 clips or photos.",
    "fail.too-few": "Your footage fits fewer than 4 shots.",
    "fail.music-too-short": "This track is too short for 4 shots from this section.",
    noPlan: "No plan fits this footage.",
    addFootage: "Add more varied footage or select more clips.",
    addFootagePhotos: "Add more varied footage or photos, or select more clips.",
    retryUnchecked: { one: "Could not check {count} video; press Build to retry it.", other: "Could not check {count} videos; press Build to retry them." },
    typeBigWord: "Type the title's big word to build.",
    dropMusic: "Drop a music file, or choose one of the tracks.",
    musicLengthUnread: "The length of your music could not be read. Choose another file or one of the tracks.",
    musicApprox: "Music added; cuts use approximate timing ({detail}).",
    musicUnreadable: "Could not read this music file ({detail}). Choose another file or one of the tracks.",
    beatFailed: "beat detection failed",
    previewFailed: "Could not play a preview: {detail}.",
    previewNotCut: "the preview could not be cut",
    noAudio: "no audio came back",
    draftNoId: "The Draft \"{name}\" may have been saved, but Selects did not report its id. Open it from the Drafts list, or build again.",
    draftEmpty: "The Draft \"{name}\" has no clips. Build again.",
    finishFailed: "The Draft was created, but its title, look and clip sound are not applied yet: {detail}. Press Finish title and look to try again.",
    openFailed: "The Draft is ready, but it could not be opened: {detail}. Use the link below or open it from the Drafts list.",
    draftCreated: "Draft created. Select the title to edit its words, colors, size or position, a clip to adjust its crop, softness, motion or sound level, and the music to change its volume. Rebuilding creates a new Draft and does not keep Inspector edits.",
    draftCreatedAdding: "Draft created; adding title and look…",
    draftNotFinished: "Draft created, but its title, look and clip sound are not applied yet.",
    openDraft: "Open the new Draft",
    copyLink: "Copy the link to the new Draft",
    shortened: { one: "Your footage fits {fitted} of {count} shot, so this video is about {seconds} s. Add more clips or photos for the full length.", other: "Your footage fits {fitted} of {count} shots, so this video is about {seconds} s. Add more clips or photos for the full length." },
    note: "Note: {detail}.",
    unchecked: { one: "Could not check {count} video; it was skipped. Build again to retry it.", other: "Could not check {count} videos; they were skipped. Build again to retry them." },
    createsDraft: "Creates a new 16:9 Draft",
    finishTitle: "Finish title and look",
    anotherVersion: "Create another version",
    build: "Build",
    building: "Building",
    "param.mainColor": "Main color",
    "param.secondColor": "Second color",
    "param.shadow": "Shadow",
    "param.size": "Size (%)",
    "param.x": "Horizontal position (%)",
    "param.y": "Vertical position (%)",
    "param.sparkles": "Sparkles",
    "param.stars": "Stars",
    "param.motion": "Motion",
    "param.motionStrength": "Motion strength",
    "param.punch": "Punch",
    "param.softness": "Softness",
    "motion.push-in": "Push in",
    "motion.pull-out": "Pull out",
    "motion.drift-left": "Drift left",
    "motion.drift-right": "Drift right",
    "motion.drift-up": "Drift up",
    "motion.drift-down": "Drift down",
    "motion.tilt": "Tilt",
    "motion.push-drift": "Push and drift",
  },
  de: {
    openProject: "Öffne ein Projekt, um ein Mini Vlog zu erstellen.",
    startFailed: "Mini Vlog konnte nicht starten: {detail}. Installiere das Plugin neu, falls das weiterhin passiert.",
    foldersNotFound: "die Plugin-Ordner wurden nicht gefunden",
    adapterNeeded: "Diese Selects-Version braucht einen aktualisierten {name}-Adapter.",
    stepFailed: "Selects konnte diesen Schritt nicht abschließen.",
    busy: "Selects ist ausgelastet und hat nicht rechtzeitig geantwortet. Warte kurz und drücke „Aktualisieren“. Wenn das öfter passiert, starte Selects neu.",
    invFailed: "Die Clips dieses Projekts konnten noch nicht gelesen werden. Klicke auf „Aktualisieren“.",
    invPartial: "Noch nicht alle Clips konnten gelesen werden. Klicke auf „Aktualisieren“.",
    sizesLoading: "Clip-Größen werden noch geladen…",
    refreshFailed: "Die Clip-Liste konnte nicht aktualisiert werden: {detail}",
    details: "Details: {detail}",
    refresh: "Aktualisieren",
    refreshing: "Wird aktualisiert",
    checkingClipsNow: "Clips werden geprüft …",
    checkingClips: "Clips werden geprüft",
    listening: "Beat wird gesucht",
    working: "In Arbeit",
    stillReading: "Die Clips dieses Projekts werden noch gelesen… Das aktualisiert sich automatisch.",
    noFootage: "In diesem Projekt gibt es noch keine analysierten Videos oder Fotos. Füge Videoclips hinzu und analysiere sie, oder füge Fotos hinzu; die Anzeige aktualisiert sich automatisch.",
    turnOnPhotos: "Aktiviere „Fotos verwenden“ unter „Erweitert“, um aus den Fotos dieses Projekts zu erstellen.",
    noClipsSelected: "Keine Clips ausgewählt. Wähle Clips unter „Erweitert“.",
    gap: " ",
    ready: "Bereit: {summary}",
    clips: { one: "{count} Clip", other: "{count} Clips" },
    clipsSelected: { one: "{selected} von {count} Clip ausgewählt", other: "{selected} von {count} Clips ausgewählt" },
    photos: { one: "{count} Foto", other: "{count} Fotos" },
    photosSelected: { one: "{selected} von {count} Foto ausgewählt", other: "{selected} von {count} Fotos ausgewählt" },
    aboutSeconds: "ca. {seconds} s",
    notAnalysed: { one: "{count} Clip noch nicht analysiert", other: "{count} Clips noch nicht analysiert" },
    analysing: { one: "{count} Clip wird analysiert. Das aktualisiert sich automatisch, sobald er fertig ist.", other: "{count} Clips werden analysiert. Das aktualisiert sich automatisch, sobald sie fertig sind." },
    notAnalysedAnalyse: { one: "{count} Clip ist noch nicht analysiert. Analysiere ihn in Selects, um ihn hier zu verwenden.", other: "{count} Clips sind noch nicht analysiert. Analysiere sie in Selects, um sie hier zu verwenden." },
    notAnalysedMaybe: { one: "{count} Clip ist noch nicht analysiert. Falls Selects ihn gerade analysiert, aktualisiert sich das automatisch.", other: "{count} Clips sind noch nicht analysiert. Falls Selects sie gerade analysiert, aktualisiert sich das automatisch." },
    analysisFailed: { one: "{count} Clip konnte nicht analysiert werden.", other: "{count} Clips konnten nicht analysiert werden." },
    noteAnalysing: { one: "{count} Clip wird analysiert", other: "{count} Clips werden analysiert" },
    noteFailed: { one: "{count} Clip nicht analysierbar", other: "{count} Clips nicht analysierbar" },
    title: "Titel",
    titleStyle: "Titelstil",
    titlePreview: "Titelvorschau",
    previewUnavailable: "Vorschau nicht verfügbar; der Titel wird trotzdem zum Draft hinzugefügt.",
    loading: "Wird geladen…",
    "preset.mini-vlog": "Mini Vlog",
    "preset.day-in-my-life": "Ein Tag in meinem Leben",
    "preset.small-glimpse": "Ein kleiner Einblick",
    "field.mini-vlog.big": "Großes Wort",
    "field.mini-vlog.small": "Kleines Wort",
    "field.day-in-my-life.year": "Jahr",
    "field.day-in-my-life.big": "Große Wörter",
    "field.day-in-my-life.tag": "Kurzzeile",
    "field.small-glimpse.top": "Obere Zeile",
    "field.small-glimpse.big": "Großes Wort",
    "field.small-glimpse.bottom": "Untere Zeile",
    fieldCount: "{label} ({used}/{max})",
    music: "Musik",
    track: "Musikstück",
    alternatives: "Alternativen",
    ownMusic: "Eigene Musik",
    noMusic: "Keine Musik",
    bpm: "{bpm} BPM",
    installTools: "Installiere ffmpeg und Node.js 18+, um Musik vorzuhören oder eigene Musik zu verwenden.",
    sectionHint: "Musikabschnitt – zum Auswählen ziehen",
    sectionLabel: "Musikabschnitt",
    musicTooShort: "Dieses Musikstück ist für diese Länge zu kurz",
    startsAt: "Beginnt bei {seconds} s",
    stopPreview: "Vorschau stoppen",
    cancelPreview: "Vorschau abbrechen",
    previewSection: "Diesen Abschnitt vorhören",
    readingMusic: "Musik wird gelesen …",
    musicLengthUnknown: "Die Länge dieser Musik ist unbekannt",
    startAtHook: "Beim Hook beginnen",
    beatFound: "Beat gefunden: {bpm} BPM. Die Schnitte folgen dem Beat.",
    faintTempo: "Tempo gefunden ({bpm} BPM), aber der Beat ist schwach, daher folgen die Schnitte ungefähr einem {bpm}-BPM-Raster.",
    outsideTempo: "Das Tempo ({bpm} BPM) liegt außerhalb von 70–160 BPM, daher haben die Schnitte ein ungefähres Timing.",
    noBeat: "Kein gleichmäßiger Beat gefunden, daher haben die Schnitte ein ungefähres Timing.",
    length: "Länge",
    "length.short": "Kurz",
    "length.standard": "Standard",
    "length.long": "Lang",
    pace: "Rhythmus",
    "pace.quick": "Schnell",
    "pace.relaxed": "Ruhig",
    "pace.groove": "Groove",
    fitPartial: { one: "{length}: {fitted} von {count} Einstellung passt zu diesem Musikstück ({seconds} s)", other: "{length}: {fitted} von {count} Einstellungen passen zu diesem Musikstück ({seconds} s)" },
    fitFull: { one: "{length}: {count} Einstellung ({seconds} s)", other: "{length}: {count} Einstellungen ({seconds} s)" },
    footageFits: { one: "Dein Material reicht für {fitted} von {count} Einstellung ({seconds} s)", other: "Dein Material reicht für {fitted} von {count} Einstellungen ({seconds} s)" },
    seconds: "{seconds} s",
    grooveTiming: "Groove auf einem {beat}-s-Beat: Einstellungen mit {hold}, {beat} und {eighth} s",
    quickTwoBeats: "Bei {bpm} BPM nutzt „Schnell“ 2 Beats pro Einstellung.",
    relaxedOneBeat: "Bei {bpm} BPM nutzt „Ruhig“ 1 Beat pro Einstellung.",
    grooveOneBeat: "Bei {bpm} BPM beginnt „Groove“ Phrasen mit 1 Beat.",
    grooveTwoBeats: "Bei {bpm} BPM nutzt „Groove“ 2 Beats pro Einstellung.",
    noMusicTiming: "Keine Musik: Die Einstellungen haben ein ungefähres Timing ({timing}).",
    faintTempoTiming: "Tempo gefunden ({bpm} BPM), aber der Beat ist schwach: Die Schnitte folgen ungefähr einem {bpm}-BPM-Raster ({timing}).",
    outsideTempoTiming: "Tempo außerhalb von 70–160 BPM ({bpm} BPM): Die Einstellungen haben ein ungefähres Timing ({timing}).",
    noBeatTiming: "Kein gleichmäßiger Beat gefunden: Die Einstellungen haben ein ungefähres Timing ({timing}).",
    advanced: "Erweitert",
    clipSound: "Clip-Ton",
    "sound.off": "Aus",
    "sound.ambient": "Leise",
    "sound.full": "Voll",
    softLook: "Weicher Look",
    beatPunch: "Beat-Punch",
    usePhotos: "Fotos verwenden",
    usePhotosOff: "„Fotos verwenden“ ist aus",
    silentVideo: "Stummes Video: keine Musik und Clip-Ton ist „Aus“.",
    chooseClips: "Clips auswählen",
    chooseClipsCount: "Clips auswählen ({selected}/{total})",
    all: "Alle",
    none: "Keine",
    photo: "Foto",
    "shape.tall": "Hochformat",
    "shape.wide": "Querformat",
    "shape.square": "Quadrat",
    "step.shots": "Einstellungen auswählen",
    "step.music": "Musik vorbereiten",
    "step.draft": "Draft erstellen",
    "step.look": "Titel und Look hinzufügen",
    "step.open": "Draft öffnen",
    progress: "Schritt {step}/{total} · {name} · {percent} %",
    progressDetail: "Schritt {step}/{total} · {name} ({detail}) · {percent} %",
    videosChecked: { one: "{done}/{count} Video geprüft", other: "{done}/{count} Videos geprüft" },
    photosOnly: "nur Fotos",
    stoppedAt: "Abgebrochen bei Schritt {step}/{total}, {name}: {detail}",
    "fail.one-resource": "Füge mindestens 2 Clips oder Fotos hinzu.",
    "fail.too-few": "Dein Material reicht für weniger als 4 Einstellungen.",
    "fail.music-too-short": "Dieses Musikstück ist ab diesem Abschnitt zu kurz für 4 Einstellungen.",
    noPlan: "Für dieses Material passt kein Plan.",
    addFootage: "Füge abwechslungsreicheres Material hinzu oder wähle mehr Clips aus.",
    addFootagePhotos: "Füge abwechslungsreicheres Material oder Fotos hinzu oder wähle mehr Clips aus.",
    retryUnchecked: { one: "{count} Video konnte nicht geprüft werden; drücke „Erstellen“, um es erneut zu versuchen.", other: "{count} Videos konnten nicht geprüft werden; drücke „Erstellen“, um sie erneut zu versuchen." },
    typeBigWord: "Gib das große Wort des Titels ein, um zu erstellen.",
    dropMusic: "Lege eine Musikdatei ab oder wähle eines der Musikstücke.",
    musicLengthUnread: "Die Länge deiner Musik konnte nicht gelesen werden. Wähle eine andere Datei oder eines der Musikstücke.",
    musicApprox: "Musik hinzugefügt; die Schnitte haben ein ungefähres Timing ({detail}).",
    musicUnreadable: "Diese Musikdatei konnte nicht gelesen werden ({detail}). Wähle eine andere Datei oder eines der Musikstücke.",
    beatFailed: "Beat-Erkennung fehlgeschlagen",
    previewFailed: "Die Vorschau konnte nicht abgespielt werden: {detail}.",
    previewNotCut: "die Vorschau konnte nicht geschnitten werden",
    noAudio: "es kam kein Audio zurück",
    draftNoId: "Der Draft „{name}“ wurde möglicherweise gespeichert, aber Selects hat seine ID nicht gemeldet. Öffne ihn aus der Draft-Liste oder erstelle ihn erneut.",
    draftEmpty: "Der Draft „{name}“ enthält keine Clips. Erstelle ihn erneut.",
    finishFailed: "Der Draft wurde erstellt, aber Titel, Look und Clip-Ton sind noch nicht angewendet: {detail}. Klicke auf „Titel und Look fertigstellen“, um es erneut zu versuchen.",
    openFailed: "Der Draft ist fertig, konnte aber nicht geöffnet werden: {detail}. Nutze den Link unten oder öffne ihn in der Draft-Liste.",
    draftCreated: "Draft erstellt. Wähle den Titel, um Wörter, Farben, Größe oder Position zu bearbeiten, einen Clip, um Zuschnitt, Weichheit, Bewegung oder Lautstärke anzupassen, und die Musik, um ihre Lautstärke zu ändern. Ein neuer Build erstellt einen neuen Draft und übernimmt keine Änderungen aus dem Inspektor.",
    draftCreatedAdding: "Draft erstellt; Titel und Look werden hinzugefügt …",
    draftNotFinished: "Draft erstellt, aber Titel, Look und Clip-Ton sind noch nicht angewendet.",
    openDraft: "Neuen Draft öffnen",
    copyLink: "Link zum neuen Draft kopieren",
    shortened: { one: "Dein Material reicht für {fitted} von {count} Einstellung, daher ist dieses Video etwa {seconds} s lang. Füge mehr Clips oder Fotos für die volle Länge hinzu.", other: "Dein Material reicht für {fitted} von {count} Einstellungen, daher ist dieses Video etwa {seconds} s lang. Füge mehr Clips oder Fotos für die volle Länge hinzu." },
    note: "Hinweis: {detail}.",
    unchecked: { one: "{count} Video konnte nicht geprüft werden und wurde übersprungen. Erstelle erneut, um es nochmals zu versuchen.", other: "{count} Videos konnten nicht geprüft werden und wurden übersprungen. Erstelle erneut, um sie nochmals zu versuchen." },
    createsDraft: "Erstellt einen neuen 16:9-Draft",
    finishTitle: "Titel und Look fertigstellen",
    anotherVersion: "Weitere Version erstellen",
    build: "Erstellen",
    building: "Wird erstellt",
    "param.mainColor": "Hauptfarbe",
    "param.secondColor": "Zweitfarbe",
    "param.shadow": "Schatten",
    "param.size": "Größe (%)",
    "param.x": "Horizontale Position (%)",
    "param.y": "Vertikale Position (%)",
    "param.sparkles": "Funkeln",
    "param.stars": "Sterne",
    "param.motion": "Bewegung",
    "param.motionStrength": "Bewegungsstärke",
    "param.punch": "Punch",
    "param.softness": "Weichheit",
    "motion.push-in": "Heranzoomen",
    "motion.pull-out": "Herauszoomen",
    "motion.drift-left": "Nach links gleiten",
    "motion.drift-right": "Nach rechts gleiten",
    "motion.drift-up": "Nach oben gleiten",
    "motion.drift-down": "Nach unten gleiten",
    "motion.tilt": "Neigen",
    "motion.push-drift": "Zoomen und gleiten",
  },
  es: {
    openProject: "Abre un proyecto para crear un Mini Vlog.",
    startFailed: "Mini Vlog no pudo iniciarse: {detail}. Reinstala el plugin si el problema continúa.",
    foldersNotFound: "no se encontraron las carpetas del plugin",
    adapterNeeded: "Esta versión de Selects necesita un adaptador {name} actualizado.",
    stepFailed: "Selects no pudo completar este paso.",
    busy: "Selects está ocupado y no respondió a tiempo. Espera un momento y pulsa «Actualizar». Si sigue pasando, reinicia Selects.",
    invFailed: "Aún no se pudieron leer los clips de este proyecto. Pulsa «Actualizar».",
    invPartial: "Aún no se pudieron leer todos los clips. Pulsa «Actualizar».",
    sizesLoading: "Todavía se están cargando los tamaños de los clips…",
    refreshFailed: "No se pudo actualizar la lista de clips: {detail}",
    details: "Detalles: {detail}",
    refresh: "Actualizar",
    refreshing: "Actualizando",
    checkingClipsNow: "Comprobando clips…",
    checkingClips: "Comprobando clips",
    listening: "Buscando el ritmo",
    working: "Trabajando",
    stillReading: "Todavía se están leyendo los clips de este proyecto… Esto se actualiza automáticamente.",
    noFootage: "Este proyecto aún no tiene vídeos analizados ni fotos. Añade clips de vídeo y analízalos, o añade fotos; se actualizará automáticamente.",
    turnOnPhotos: "Activa «Usar fotos» en «Avanzado» para crear con las fotos de este proyecto.",
    noClipsSelected: "No hay clips seleccionados. Elige clips en «Avanzado».",
    gap: " ",
    ready: "Listo: {summary}",
    clips: { one: "{count} clip", many: "{count} de clips", other: "{count} clips" },
    clipsSelected: { one: "{selected} de {count} clip seleccionado", many: "{selected} de {count} de clips seleccionados", other: "{selected} de {count} clips seleccionados" },
    photos: { one: "{count} foto", many: "{count} de fotos", other: "{count} fotos" },
    photosSelected: { one: "{selected} de {count} foto seleccionada", many: "{selected} de {count} de fotos seleccionadas", other: "{selected} de {count} fotos seleccionadas" },
    aboutSeconds: "unos {seconds} s",
    notAnalysed: { one: "{count} clip sin analizar", many: "{count} de clips sin analizar", other: "{count} clips sin analizar" },
    analysing: { one: "Se está analizando {count} clip. Esto se actualiza solo cuando termine.", many: "Se están analizando {count} de clips. Esto se actualiza solo cuando terminen.", other: "Se están analizando {count} clips. Esto se actualiza solo cuando terminen." },
    notAnalysedAnalyse: { one: "{count} clip aún no está analizado. Analízalo en Selects para usarlo aquí.", many: "{count} de clips aún no están analizados. Analízalos en Selects para usarlos aquí.", other: "{count} clips aún no están analizados. Analízalos en Selects para usarlos aquí." },
    notAnalysedMaybe: { one: "{count} clip aún no está analizado. Si Selects lo está analizando, esto se actualiza solo.", many: "{count} de clips aún no están analizados. Si Selects los está analizando, esto se actualiza solo.", other: "{count} clips aún no están analizados. Si Selects los está analizando, esto se actualiza solo." },
    analysisFailed: { one: "No se pudo analizar {count} clip.", many: "No se pudieron analizar {count} de clips.", other: "No se pudieron analizar {count} clips." },
    noteAnalysing: { one: "{count} clip en análisis", many: "{count} de clips en análisis", other: "{count} clips en análisis" },
    noteFailed: { one: "{count} clip sin poder analizarse", many: "{count} de clips sin poder analizarse", other: "{count} clips sin poder analizarse" },
    title: "Título",
    titleStyle: "Estilo del título",
    titlePreview: "Vista previa del título",
    previewUnavailable: "Vista previa no disponible; el título se añadirá igualmente al Draft.",
    loading: "Cargando…",
    "preset.mini-vlog": "Mini vlog",
    "preset.day-in-my-life": "Un día en mi vida",
    "preset.small-glimpse": "Un pequeño vistazo",
    "field.mini-vlog.big": "Palabra grande",
    "field.mini-vlog.small": "Palabra pequeña",
    "field.day-in-my-life.year": "Año",
    "field.day-in-my-life.big": "Palabras grandes",
    "field.day-in-my-life.tag": "Frase corta",
    "field.small-glimpse.top": "Línea superior",
    "field.small-glimpse.big": "Palabra grande",
    "field.small-glimpse.bottom": "Línea inferior",
    fieldCount: "{label} ({used}/{max})",
    music: "Música",
    track: "Pista",
    alternatives: "Alternativas",
    ownMusic: "Tu propia música",
    noMusic: "Sin música",
    bpm: "{bpm} BPM",
    installTools: "Instala ffmpeg y Node.js 18+ para escuchar la música o usar tu propia pista.",
    sectionHint: "Sección de música: arrastra para elegir",
    sectionLabel: "Sección de música",
    musicTooShort: "Esta pista es demasiado corta para esta duración",
    startsAt: "Empieza en {seconds} s",
    stopPreview: "Detener la vista previa",
    cancelPreview: "Cancelar la vista previa",
    previewSection: "Escuchar esta sección",
    readingMusic: "Leyendo la música…",
    musicLengthUnknown: "Se desconoce la duración de esta música",
    startAtHook: "Empezar en el gancho",
    beatFound: "Ritmo encontrado: {bpm} BPM. Los cortes siguen el ritmo.",
    faintTempo: "Se encontró el tempo ({bpm} BPM), pero el ritmo es débil, así que los cortes siguen aproximadamente una cuadrícula de {bpm} BPM.",
    outsideTempo: "Su tempo ({bpm} BPM) está fuera del rango 70–160 BPM, así que los cortes usan una sincronía aproximada.",
    noBeat: "No se encontró un ritmo estable, así que los cortes usan una sincronía aproximada.",
    length: "Duración",
    "length.short": "Corta",
    "length.standard": "Estándar",
    "length.long": "Larga",
    pace: "Cadencia",
    "pace.quick": "Rápida",
    "pace.relaxed": "Pausada",
    "pace.groove": "Groove",
    fitPartial: { one: "{length}: {fitted} de {count} plano caben en esta pista ({seconds} s)", many: "{length}: {fitted} de {count} de planos caben en esta pista ({seconds} s)", other: "{length}: {fitted} de {count} planos caben en esta pista ({seconds} s)" },
    fitFull: { one: "{length}: {count} plano ({seconds} s)", many: "{length}: {count} de planos ({seconds} s)", other: "{length}: {count} planos ({seconds} s)" },
    footageFits: { one: "Tu material alcanza para {fitted} de {count} plano ({seconds} s)", many: "Tu material alcanza para {fitted} de {count} de planos ({seconds} s)", other: "Tu material alcanza para {fitted} de {count} planos ({seconds} s)" },
    seconds: "{seconds} s",
    grooveTiming: "Groove con un ritmo de {beat} s: planos de {hold}, {beat} y {eighth} s",
    quickTwoBeats: "A {bpm} BPM, «Rápida» usa 2 tiempos por plano.",
    relaxedOneBeat: "A {bpm} BPM, «Pausada» usa 1 tiempo por plano.",
    grooveOneBeat: "A {bpm} BPM, «Groove» abre las frases con 1 tiempo.",
    grooveTwoBeats: "A {bpm} BPM, «Groove» usa 2 tiempos por plano.",
    noMusicTiming: "Sin música: los planos usan una sincronía aproximada ({timing}).",
    faintTempoTiming: "Se encontró el tempo ({bpm} BPM), pero el ritmo es débil: los cortes siguen aproximadamente una cuadrícula de {bpm} BPM ({timing}).",
    outsideTempoTiming: "Tempo fuera del rango 70–160 BPM ({bpm} BPM): los planos usan una sincronía aproximada ({timing}).",
    noBeatTiming: "No se encontró un ritmo estable: los planos usan una sincronía aproximada ({timing}).",
    advanced: "Avanzado",
    clipSound: "Sonido de los clips",
    "sound.off": "Apagado",
    "sound.ambient": "Ambiente",
    "sound.full": "Completo",
    softLook: "Look suave",
    beatPunch: "Golpe al ritmo",
    usePhotos: "Usar fotos",
    usePhotosOff: "«Usar fotos» está desactivado",
    silentVideo: "Vídeo sin sonido: sin música y con el sonido de los clips en «Apagado».",
    chooseClips: "Elegir clips",
    chooseClipsCount: "Elegir clips ({selected}/{total})",
    all: "Todos",
    none: "Ninguno",
    photo: "Foto",
    "shape.tall": "Vertical",
    "shape.wide": "Horizontal",
    "shape.square": "Cuadrado",
    "step.shots": "Eligiendo planos",
    "step.music": "Preparando la música",
    "step.draft": "Creando el Draft",
    "step.look": "Añadiendo título y look",
    "step.open": "Abriendo el Draft",
    progress: "Paso {step}/{total} · {name} · {percent} %",
    progressDetail: "Paso {step}/{total} · {name} ({detail}) · {percent} %",
    videosChecked: { one: "{done}/{count} vídeo revisado", many: "{done}/{count} de vídeos revisados", other: "{done}/{count} vídeos revisados" },
    photosOnly: "solo fotos",
    stoppedAt: "Se detuvo en el paso {step}/{total}, {name}: {detail}",
    "fail.one-resource": "Añade al menos 2 clips o fotos.",
    "fail.too-few": "Tu material alcanza para menos de 4 planos.",
    "fail.music-too-short": "Esta pista es demasiado corta para 4 planos desde esta sección.",
    noPlan: "Ningún plan encaja con este material.",
    addFootage: "Añade material más variado o selecciona más clips.",
    addFootagePhotos: "Añade material más variado o fotos, o selecciona más clips.",
    retryUnchecked: { one: "No se pudo comprobar {count} vídeo; pulsa «Crear» para reintentarlo.", many: "No se pudieron comprobar {count} de vídeos; pulsa «Crear» para reintentarlos.", other: "No se pudieron comprobar {count} vídeos; pulsa «Crear» para reintentarlos." },
    typeBigWord: "Escribe la palabra grande del título para crear.",
    dropMusic: "Suelta un archivo de música o elige una de las pistas.",
    musicLengthUnread: "No se pudo leer la duración de tu música. Elige otro archivo o una de las pistas.",
    musicApprox: "Música añadida; los cortes usan una sincronía aproximada ({detail}).",
    musicUnreadable: "No se pudo leer este archivo de música ({detail}). Elige otro archivo o una de las pistas.",
    beatFailed: "falló la detección del ritmo",
    previewFailed: "No se pudo reproducir la vista previa: {detail}.",
    previewNotCut: "no se pudo recortar la vista previa",
    noAudio: "no se recibió audio",
    draftNoId: "Es posible que el Draft «{name}» se haya guardado, pero Selects no informó de su ID. Ábrelo desde la lista de Drafts o vuelve a crearlo.",
    draftEmpty: "El Draft «{name}» no tiene clips. Vuelve a crearlo.",
    finishFailed: "El Draft se creó, pero aún no se aplicaron el título, el look ni el sonido de los clips: {detail}. Pulsa «Terminar título y look» para intentarlo de nuevo.",
    openFailed: "El Draft está listo, pero no se pudo abrir: {detail}. Usa el enlace de abajo o ábrelo desde la lista de Drafts.",
    draftCreated: "Draft creado. Selecciona el título para editar sus palabras, colores, tamaño o posición; un clip para ajustar su encuadre, suavidad, movimiento o volumen; y la música para cambiar su volumen. Volver a crear genera un nuevo Draft y no conserva los cambios del Inspector.",
    draftCreatedAdding: "Draft creado; añadiendo título y look…",
    draftNotFinished: "Draft creado, pero aún no se aplicaron el título, el look ni el sonido de los clips.",
    openDraft: "Abrir el nuevo Draft",
    copyLink: "Copiar el enlace al nuevo Draft",
    shortened: { one: "Tu material alcanza para {fitted} de {count} plano, así que este vídeo dura unos {seconds} s. Añade más clips o fotos para la duración completa.", many: "Tu material alcanza para {fitted} de {count} de planos, así que este vídeo dura unos {seconds} s. Añade más clips o fotos para la duración completa.", other: "Tu material alcanza para {fitted} de {count} planos, así que este vídeo dura unos {seconds} s. Añade más clips o fotos para la duración completa." },
    note: "Nota: {detail}.",
    unchecked: { one: "No se pudo comprobar {count} vídeo; se omitió. Vuelve a crear para reintentarlo.", many: "No se pudieron comprobar {count} de vídeos; se omitieron. Vuelve a crear para reintentarlos.", other: "No se pudieron comprobar {count} vídeos; se omitieron. Vuelve a crear para reintentarlos." },
    createsDraft: "Crea un nuevo Draft 16:9",
    finishTitle: "Terminar título y look",
    anotherVersion: "Crear otra versión",
    build: "Crear",
    building: "Creando",
    "param.mainColor": "Color principal",
    "param.secondColor": "Color secundario",
    "param.shadow": "Sombra",
    "param.size": "Tamaño (%)",
    "param.x": "Posición horizontal (%)",
    "param.y": "Posición vertical (%)",
    "param.sparkles": "Destellos",
    "param.stars": "Estrellas",
    "param.motion": "Movimiento",
    "param.motionStrength": "Intensidad del movimiento",
    "param.punch": "Golpe",
    "param.softness": "Suavidad",
    "motion.push-in": "Acercar",
    "motion.pull-out": "Alejar",
    "motion.drift-left": "Deslizar a la izquierda",
    "motion.drift-right": "Deslizar a la derecha",
    "motion.drift-up": "Deslizar hacia arriba",
    "motion.drift-down": "Deslizar hacia abajo",
    "motion.tilt": "Inclinar",
    "motion.push-drift": "Acercar y deslizar",
  },
  fr: {
    openProject: "Ouvrez un projet pour créer un Mini Vlog.",
    startFailed: "Mini Vlog n'a pas pu démarrer : {detail}. Réinstallez le plugin si le problème persiste.",
    foldersNotFound: "les dossiers du plugin sont introuvables",
    adapterNeeded: "Cette version de Selects nécessite un adaptateur {name} à jour.",
    stepFailed: "Selects n'a pas pu terminer cette étape.",
    busy: "Selects est occupé et n'a pas répondu à temps. Patientez un instant puis appuyez sur « Actualiser ». Si cela se reproduit, redémarrez Selects.",
    invFailed: "Impossible de lire les clips de ce projet pour l'instant. Appuyez sur « Actualiser ».",
    invPartial: "Impossible de lire tous les clips pour l'instant. Appuyez sur « Actualiser ».",
    sizesLoading: "Les tailles des clips sont en cours de chargement…",
    refreshFailed: "Impossible d'actualiser la liste des clips : {detail}",
    details: "Détails : {detail}",
    refresh: "Actualiser",
    refreshing: "Actualisation",
    checkingClipsNow: "Vérification des clips…",
    checkingClips: "Vérification des clips",
    listening: "Recherche du rythme",
    working: "En cours",
    stillReading: "Lecture des clips de ce projet en cours… La liste se met à jour automatiquement.",
    noFootage: "Ce projet ne contient pas encore de vidéo analysée ni de photo. Ajoutez des clips vidéo et analysez-les, ou ajoutez des photos ; l'affichage se met à jour automatiquement.",
    turnOnPhotos: "Activez « Utiliser les photos » dans « Avancé » pour créer à partir des photos de ce projet.",
    noClipsSelected: "Aucun clip sélectionné. Choisissez des clips dans « Avancé ».",
    gap: " ",
    ready: "Prêt : {summary}",
    clips: { one: "{count} clip", many: "{count} de clips", other: "{count} clips" },
    clipsSelected: { one: "{selected} sur {count} clip sélectionné", many: "{selected} sur {count} de clips sélectionnés", other: "{selected} sur {count} clips sélectionnés" },
    photos: { one: "{count} photo", many: "{count} de photos", other: "{count} photos" },
    photosSelected: { one: "{selected} sur {count} photo sélectionnée", many: "{selected} sur {count} de photos sélectionnées", other: "{selected} sur {count} photos sélectionnées" },
    aboutSeconds: "environ {seconds} s",
    notAnalysed: { one: "{count} clip pas encore analysé", many: "{count} de clips pas encore analysés", other: "{count} clips pas encore analysés" },
    analysing: { one: "{count} clip est en cours d'analyse. Ceci se met à jour automatiquement à la fin.", many: "{count} de clips sont en cours d'analyse. Ceci se met à jour automatiquement à la fin.", other: "{count} clips sont en cours d'analyse. Ceci se met à jour automatiquement à la fin." },
    notAnalysedAnalyse: { one: "{count} clip n'est pas encore analysé. Analysez-le dans Selects pour l'utiliser ici.", many: "{count} de clips ne sont pas encore analysés. Analysez-les dans Selects pour les utiliser ici.", other: "{count} clips ne sont pas encore analysés. Analysez-les dans Selects pour les utiliser ici." },
    notAnalysedMaybe: { one: "{count} clip n'est pas encore analysé. Si Selects l'analyse, ceci se met à jour automatiquement.", many: "{count} de clips ne sont pas encore analysés. Si Selects les analyse, ceci se met à jour automatiquement.", other: "{count} clips ne sont pas encore analysés. Si Selects les analyse, ceci se met à jour automatiquement." },
    analysisFailed: { one: "{count} clip n'a pas pu être analysé.", many: "{count} de clips n'ont pas pu être analysés.", other: "{count} clips n'ont pas pu être analysés." },
    noteAnalysing: { one: "{count} clip en cours d'analyse", many: "{count} de clips en cours d'analyse", other: "{count} clips en cours d'analyse" },
    noteFailed: { one: "{count} clip non analysable", many: "{count} de clips non analysables", other: "{count} clips non analysables" },
    title: "Titre",
    titleStyle: "Style du titre",
    titlePreview: "Aperçu du titre",
    previewUnavailable: "Aperçu indisponible ; le titre sera tout de même ajouté au Draft.",
    loading: "Chargement…",
    "preset.mini-vlog": "Mini vlog",
    "preset.day-in-my-life": "Une journée dans ma vie",
    "preset.small-glimpse": "Un petit aperçu",
    "field.mini-vlog.big": "Grand mot",
    "field.mini-vlog.small": "Petit mot",
    "field.day-in-my-life.year": "Année",
    "field.day-in-my-life.big": "Grands mots",
    "field.day-in-my-life.tag": "Petite phrase",
    "field.small-glimpse.top": "Ligne du haut",
    "field.small-glimpse.big": "Grand mot",
    "field.small-glimpse.bottom": "Ligne du bas",
    fieldCount: "{label} ({used}/{max})",
    music: "Musique",
    track: "Morceau",
    alternatives: "Autres choix",
    ownMusic: "Votre propre musique",
    noMusic: "Sans musique",
    bpm: "{bpm} BPM",
    installTools: "Installez ffmpeg et Node.js 18+ pour écouter la musique ou utiliser votre propre morceau.",
    sectionHint: "Section musicale : faites glisser pour choisir",
    sectionLabel: "Section musicale",
    musicTooShort: "Ce morceau est trop court pour cette durée",
    startsAt: "Commence à {seconds} s",
    stopPreview: "Arrêter l'aperçu",
    cancelPreview: "Annuler l'aperçu",
    previewSection: "Écouter cette section",
    readingMusic: "Lecture de la musique…",
    musicLengthUnknown: "La durée de cette musique est inconnue",
    startAtHook: "Commencer sur l'accroche",
    beatFound: "Rythme trouvé : {bpm} BPM. Les coupes suivent le rythme.",
    faintTempo: "Tempo trouvé ({bpm} BPM), mais le rythme est peu marqué : les coupes suivent donc approximativement une grille à {bpm} BPM.",
    outsideTempo: "Son tempo ({bpm} BPM) est hors de la plage 70–160 BPM : les coupes utilisent donc un calage approximatif.",
    noBeat: "Aucun rythme régulier trouvé : les coupes utilisent donc un calage approximatif.",
    length: "Durée",
    "length.short": "Courte",
    "length.standard": "Standard",
    "length.long": "Longue",
    pace: "Cadence",
    "pace.quick": "Rapide",
    "pace.relaxed": "Posée",
    "pace.groove": "Groove",
    fitPartial: { one: "{length} : {fitted} sur {count} plan tiennent dans ce morceau ({seconds} s)", many: "{length} : {fitted} sur {count} de plans tiennent dans ce morceau ({seconds} s)", other: "{length} : {fitted} sur {count} plans tiennent dans ce morceau ({seconds} s)" },
    fitFull: { one: "{length} : {count} plan ({seconds} s)", many: "{length} : {count} de plans ({seconds} s)", other: "{length} : {count} plans ({seconds} s)" },
    footageFits: { one: "Vos images suffisent pour {fitted} sur {count} plan ({seconds} s)", many: "Vos images suffisent pour {fitted} sur {count} de plans ({seconds} s)", other: "Vos images suffisent pour {fitted} sur {count} plans ({seconds} s)" },
    seconds: "{seconds} s",
    grooveTiming: "Groove sur un temps de {beat} s : plans de {hold}, {beat} et {eighth} s",
    quickTwoBeats: "À {bpm} BPM, « Rapide » utilise 2 temps par plan.",
    relaxedOneBeat: "À {bpm} BPM, « Posée » utilise 1 temps par plan.",
    grooveOneBeat: "À {bpm} BPM, « Groove » ouvre les phrases avec 1 temps.",
    grooveTwoBeats: "À {bpm} BPM, « Groove » utilise 2 temps par plan.",
    noMusicTiming: "Sans musique : les plans utilisent un calage approximatif ({timing}).",
    faintTempoTiming: "Tempo trouvé ({bpm} BPM), mais le rythme est peu marqué : les coupes suivent approximativement une grille à {bpm} BPM ({timing}).",
    outsideTempoTiming: "Tempo hors de la plage 70–160 BPM ({bpm} BPM) : les plans utilisent un calage approximatif ({timing}).",
    noBeatTiming: "Aucun rythme régulier trouvé : les plans utilisent un calage approximatif ({timing}).",
    advanced: "Avancé",
    clipSound: "Son des clips",
    "sound.off": "Coupé",
    "sound.ambient": "Ambiance",
    "sound.full": "Plein",
    softLook: "Look doux",
    beatPunch: "Punch sur le rythme",
    usePhotos: "Utiliser les photos",
    usePhotosOff: "« Utiliser les photos » est désactivé",
    silentVideo: "Vidéo muette : pas de musique et son des clips sur « Coupé ».",
    chooseClips: "Choisir les clips",
    chooseClipsCount: "Choisir les clips ({selected}/{total})",
    all: "Tous",
    none: "Aucun",
    photo: "Photo",
    "shape.tall": "Vertical",
    "shape.wide": "Horizontal",
    "shape.square": "Carré",
    "step.shots": "Choix des plans",
    "step.music": "Préparation de la musique",
    "step.draft": "Création du Draft",
    "step.look": "Ajout du titre et du look",
    "step.open": "Ouverture du Draft",
    progress: "Étape {step}/{total} · {name} · {percent} %",
    progressDetail: "Étape {step}/{total} · {name} ({detail}) · {percent} %",
    videosChecked: { one: "{done}/{count} vidéo vérifiée", many: "{done}/{count} de vidéos vérifiées", other: "{done}/{count} vidéos vérifiées" },
    photosOnly: "photos uniquement",
    stoppedAt: "Arrêt à l'étape {step}/{total}, {name} : {detail}",
    "fail.one-resource": "Ajoutez au moins 2 clips ou photos.",
    "fail.too-few": "Vos images suffisent pour moins de 4 plans.",
    "fail.music-too-short": "Ce morceau est trop court pour 4 plans à partir de cette section.",
    noPlan: "Aucun plan ne convient à ces images.",
    addFootage: "Ajoutez des images plus variées ou sélectionnez plus de clips.",
    addFootagePhotos: "Ajoutez des images plus variées ou des photos, ou sélectionnez plus de clips.",
    retryUnchecked: { one: "{count} vidéo n'a pas pu être vérifiée ; appuyez sur « Créer » pour réessayer.", many: "{count} de vidéos n'ont pas pu être vérifiées ; appuyez sur « Créer » pour réessayer.", other: "{count} vidéos n'ont pas pu être vérifiées ; appuyez sur « Créer » pour réessayer." },
    typeBigWord: "Saisissez le grand mot du titre pour créer.",
    dropMusic: "Déposez un fichier audio ou choisissez l'un des morceaux.",
    musicLengthUnread: "La durée de votre musique n'a pas pu être lue. Choisissez un autre fichier ou l'un des morceaux.",
    musicApprox: "Musique ajoutée ; les coupes utilisent un calage approximatif ({detail}).",
    musicUnreadable: "Impossible de lire ce fichier audio ({detail}). Choisissez un autre fichier ou l'un des morceaux.",
    beatFailed: "la détection du rythme a échoué",
    previewFailed: "Impossible de lire l'aperçu : {detail}.",
    previewNotCut: "l'aperçu n'a pas pu être découpé",
    noAudio: "aucun son n'a été renvoyé",
    draftNoId: "Le Draft « {name} » a peut-être été enregistré, mais Selects n'a pas indiqué son identifiant. Ouvrez-le depuis la liste des Drafts ou relancez la création.",
    draftEmpty: "Le Draft « {name} » ne contient aucun clip. Relancez la création.",
    finishFailed: "Le Draft a été créé, mais le titre, le look et le son des clips ne sont pas encore appliqués : {detail}. Appuyez sur « Terminer le titre et le look » pour réessayer.",
    openFailed: "Le Draft est prêt, mais n'a pas pu être ouvert : {detail}. Utilisez le lien ci-dessous ou ouvrez-le depuis la liste des Drafts.",
    draftCreated: "Draft créé. Sélectionnez le titre pour modifier ses mots, ses couleurs, sa taille ou sa position, un clip pour ajuster son cadrage, sa douceur, son mouvement ou son volume, et la musique pour changer son volume. Recréer génère un nouveau Draft et ne conserve pas les modifications de l'Inspecteur.",
    draftCreatedAdding: "Draft créé ; ajout du titre et du look…",
    draftNotFinished: "Draft créé, mais le titre, le look et le son des clips ne sont pas encore appliqués.",
    openDraft: "Ouvrir le nouveau Draft",
    copyLink: "Copier le lien vers le nouveau Draft",
    shortened: { one: "Vos images suffisent pour {fitted} sur {count} plan : cette vidéo dure donc environ {seconds} s. Ajoutez des clips ou des photos pour la durée complète.", many: "Vos images suffisent pour {fitted} sur {count} de plans : cette vidéo dure donc environ {seconds} s. Ajoutez des clips ou des photos pour la durée complète.", other: "Vos images suffisent pour {fitted} sur {count} plans : cette vidéo dure donc environ {seconds} s. Ajoutez des clips ou des photos pour la durée complète." },
    note: "Remarque : {detail}.",
    unchecked: { one: "{count} vidéo n'a pas pu être vérifiée et a été ignorée. Relancez la création pour réessayer.", many: "{count} de vidéos n'ont pas pu être vérifiées et ont été ignorées. Relancez la création pour réessayer.", other: "{count} vidéos n'ont pas pu être vérifiées et ont été ignorées. Relancez la création pour réessayer." },
    createsDraft: "Crée un nouveau Draft 16:9",
    finishTitle: "Terminer le titre et le look",
    anotherVersion: "Créer une autre version",
    build: "Créer",
    building: "Création",
    "param.mainColor": "Couleur principale",
    "param.secondColor": "Couleur secondaire",
    "param.shadow": "Ombre",
    "param.size": "Taille (%)",
    "param.x": "Position horizontale (%)",
    "param.y": "Position verticale (%)",
    "param.sparkles": "Étincelles",
    "param.stars": "Étoiles",
    "param.motion": "Mouvement",
    "param.motionStrength": "Intensité du mouvement",
    "param.punch": "Punch",
    "param.softness": "Douceur",
    "motion.push-in": "Zoom avant",
    "motion.pull-out": "Zoom arrière",
    "motion.drift-left": "Glisser vers la gauche",
    "motion.drift-right": "Glisser vers la droite",
    "motion.drift-up": "Glisser vers le haut",
    "motion.drift-down": "Glisser vers le bas",
    "motion.tilt": "Incliner",
    "motion.push-drift": "Zoom et glissement",
  },
  it: {
    openProject: "Apri un progetto per creare un Mini Vlog.",
    startFailed: "Mini Vlog non è riuscito ad avviarsi: {detail}. Reinstalla il plugin se il problema persiste.",
    foldersNotFound: "le cartelle del plugin non sono state trovate",
    adapterNeeded: "Questa versione di Selects richiede un adattatore {name} aggiornato.",
    stepFailed: "Selects non è riuscito a completare questo passaggio.",
    busy: "Selects è occupato e non ha risposto in tempo. Attendi un momento e premi «Aggiorna». Se continua a succedere, riavvia Selects.",
    invFailed: "Non è ancora stato possibile leggere le clip di questo progetto. Premi «Aggiorna».",
    invPartial: "Non è ancora stato possibile leggere tutte le clip. Premi «Aggiorna».",
    sizesLoading: "Caricamento delle dimensioni delle clip in corso…",
    refreshFailed: "Impossibile aggiornare l'elenco delle clip: {detail}",
    details: "Dettagli: {detail}",
    refresh: "Aggiorna",
    refreshing: "Aggiornamento",
    checkingClipsNow: "Controllo delle clip…",
    checkingClips: "Controllo delle clip",
    listening: "Ricerca del ritmo",
    working: "In corso",
    stillReading: "Lettura delle clip di questo progetto in corso… Si aggiorna automaticamente.",
    noFootage: "In questo progetto non ci sono ancora video analizzati né foto. Aggiungi clip video e analizzale, oppure aggiungi foto; si aggiorna automaticamente.",
    turnOnPhotos: "Attiva «Usa foto» in «Avanzate» per creare dalle foto di questo progetto.",
    noClipsSelected: "Nessuna clip selezionata. Scegli le clip in «Avanzate».",
    gap: " ",
    ready: "Pronto: {summary}",
    clips: { one: "{count} clip", many: "{count} di clip", other: "{count} clip" },
    clipsSelected: { one: "{selected} di {count} clip selezionata", many: "{selected} di {count} clip selezionate", other: "{selected} di {count} clip selezionate" },
    photos: { one: "{count} foto", many: "{count} di foto", other: "{count} foto" },
    photosSelected: { one: "{selected} di {count} foto selezionata", many: "{selected} di {count} foto selezionate", other: "{selected} di {count} foto selezionate" },
    aboutSeconds: "circa {seconds} s",
    notAnalysed: { one: "{count} clip non ancora analizzata", many: "{count} di clip non ancora analizzate", other: "{count} clip non ancora analizzate" },
    analysing: { one: "{count} clip è in fase di analisi. Si aggiorna automaticamente al termine.", many: "{count} di clip sono in fase di analisi. Si aggiorna automaticamente al termine.", other: "{count} clip sono in fase di analisi. Si aggiorna automaticamente al termine." },
    notAnalysedAnalyse: { one: "{count} clip non è ancora analizzata. Analizzala in Selects per usarla qui.", many: "{count} di clip non sono ancora analizzate. Analizzale in Selects per usarle qui.", other: "{count} clip non sono ancora analizzate. Analizzale in Selects per usarle qui." },
    notAnalysedMaybe: { one: "{count} clip non è ancora analizzata. Se Selects la sta analizzando, si aggiorna automaticamente.", many: "{count} di clip non sono ancora analizzate. Se Selects le sta analizzando, si aggiorna automaticamente.", other: "{count} clip non sono ancora analizzate. Se Selects le sta analizzando, si aggiorna automaticamente." },
    analysisFailed: { one: "Non è stato possibile analizzare {count} clip.", many: "Non è stato possibile analizzare {count} di clip.", other: "Non è stato possibile analizzare {count} clip." },
    noteAnalysing: { one: "{count} clip in analisi", many: "{count} di clip in analisi", other: "{count} clip in analisi" },
    noteFailed: { one: "{count} clip non analizzabile", many: "{count} di clip non analizzabili", other: "{count} clip non analizzabili" },
    title: "Titolo",
    titleStyle: "Stile del titolo",
    titlePreview: "Anteprima del titolo",
    previewUnavailable: "Anteprima non disponibile; il titolo verrà comunque aggiunto al Draft.",
    loading: "Caricamento…",
    "preset.mini-vlog": "Mini vlog",
    "preset.day-in-my-life": "Un giorno della mia vita",
    "preset.small-glimpse": "Un piccolo scorcio",
    "field.mini-vlog.big": "Parola grande",
    "field.mini-vlog.small": "Parola piccola",
    "field.day-in-my-life.year": "Anno",
    "field.day-in-my-life.big": "Parole grandi",
    "field.day-in-my-life.tag": "Frase breve",
    "field.small-glimpse.top": "Riga in alto",
    "field.small-glimpse.big": "Parola grande",
    "field.small-glimpse.bottom": "Riga in basso",
    fieldCount: "{label} ({used}/{max})",
    music: "Musica",
    track: "Brano",
    alternatives: "Alternative",
    ownMusic: "La tua musica",
    noMusic: "Nessuna musica",
    bpm: "{bpm} BPM",
    installTools: "Installa ffmpeg e Node.js 18+ per ascoltare la musica o usare un tuo brano.",
    sectionHint: "Sezione musicale: trascina per scegliere",
    sectionLabel: "Sezione musicale",
    musicTooShort: "Questo brano è troppo corto per questa durata",
    startsAt: "Inizia a {seconds} s",
    stopPreview: "Ferma l'anteprima",
    cancelPreview: "Annulla l'anteprima",
    previewSection: "Ascolta questa sezione",
    readingMusic: "Lettura della musica…",
    musicLengthUnknown: "La durata di questa musica è sconosciuta",
    startAtHook: "Inizia dall'hook",
    beatFound: "Ritmo trovato: {bpm} BPM. I tagli seguono il ritmo.",
    faintTempo: "Tempo trovato ({bpm} BPM) ma il ritmo è debole, quindi i tagli seguono approssimativamente una griglia a {bpm} BPM.",
    outsideTempo: "Il suo tempo ({bpm} BPM) è fuori dall'intervallo 70–160 BPM, quindi i tagli usano una sincronia approssimativa.",
    noBeat: "Nessun ritmo regolare trovato, quindi i tagli usano una sincronia approssimativa.",
    length: "Durata",
    "length.short": "Breve",
    "length.standard": "Standard",
    "length.long": "Lunga",
    pace: "Cadenza",
    "pace.quick": "Veloce",
    "pace.relaxed": "Rilassata",
    "pace.groove": "Groove",
    fitPartial: { one: "{length}: {fitted} di {count} inquadratura entrano in questo brano ({seconds} s)", many: "{length}: {fitted} di {count} di inquadrature entrano in questo brano ({seconds} s)", other: "{length}: {fitted} di {count} inquadrature entrano in questo brano ({seconds} s)" },
    fitFull: { one: "{length}: {count} inquadratura ({seconds} s)", many: "{length}: {count} di inquadrature ({seconds} s)", other: "{length}: {count} inquadrature ({seconds} s)" },
    footageFits: { one: "Il tuo materiale basta per {fitted} di {count} inquadratura ({seconds} s)", many: "Il tuo materiale basta per {fitted} di {count} di inquadrature ({seconds} s)", other: "Il tuo materiale basta per {fitted} di {count} inquadrature ({seconds} s)" },
    seconds: "{seconds} s",
    grooveTiming: "Groove su un battito di {beat} s: inquadrature da {hold}, {beat} e {eighth} s",
    quickTwoBeats: "A {bpm} BPM «Veloce» usa 2 battiti per inquadratura.",
    relaxedOneBeat: "A {bpm} BPM «Rilassata» usa 1 battito per inquadratura.",
    grooveOneBeat: "A {bpm} BPM «Groove» apre le frasi con 1 battito.",
    grooveTwoBeats: "A {bpm} BPM «Groove» usa 2 battiti per inquadratura.",
    noMusicTiming: "Nessuna musica: le inquadrature usano una sincronia approssimativa ({timing}).",
    faintTempoTiming: "Tempo trovato ({bpm} BPM) ma il ritmo è debole: i tagli seguono approssimativamente una griglia a {bpm} BPM ({timing}).",
    outsideTempoTiming: "Tempo fuori dall'intervallo 70–160 BPM ({bpm} BPM): le inquadrature usano una sincronia approssimativa ({timing}).",
    noBeatTiming: "Nessun ritmo regolare trovato: le inquadrature usano una sincronia approssimativa ({timing}).",
    advanced: "Avanzate",
    clipSound: "Audio delle clip",
    "sound.off": "Spento",
    "sound.ambient": "Ambiente",
    "sound.full": "Pieno",
    softLook: "Look morbido",
    beatPunch: "Punch a ritmo",
    usePhotos: "Usa foto",
    usePhotosOff: "«Usa foto» è disattivato",
    silentVideo: "Video senza audio: nessuna musica e audio delle clip su «Spento».",
    chooseClips: "Scegli le clip",
    chooseClipsCount: "Scegli le clip ({selected}/{total})",
    all: "Tutte",
    none: "Nessuna",
    photo: "Foto",
    "shape.tall": "Verticale",
    "shape.wide": "Orizzontale",
    "shape.square": "Quadrato",
    "step.shots": "Scelta delle inquadrature",
    "step.music": "Preparazione della musica",
    "step.draft": "Creazione del Draft",
    "step.look": "Aggiunta di titolo e look",
    "step.open": "Apertura del Draft",
    progress: "Passaggio {step}/{total} · {name} · {percent}%",
    progressDetail: "Passaggio {step}/{total} · {name} ({detail}) · {percent}%",
    videosChecked: { one: "{done}/{count} video controllato", many: "{done}/{count} di video controllati", other: "{done}/{count} video controllati" },
    photosOnly: "solo foto",
    stoppedAt: "Interrotto al passaggio {step}/{total}, {name}: {detail}",
    "fail.one-resource": "Aggiungi almeno 2 clip o foto.",
    "fail.too-few": "Il tuo materiale basta per meno di 4 inquadrature.",
    "fail.music-too-short": "Questo brano è troppo corto per 4 inquadrature a partire da questa sezione.",
    noPlan: "Nessun piano si adatta a questo materiale.",
    addFootage: "Aggiungi materiale più vario o seleziona più clip.",
    addFootagePhotos: "Aggiungi materiale più vario o foto, oppure seleziona più clip.",
    retryUnchecked: { one: "Non è stato possibile controllare {count} video; premi «Crea» per riprovare.", many: "Non è stato possibile controllare {count} di video; premi «Crea» per riprovare.", other: "Non è stato possibile controllare {count} video; premi «Crea» per riprovare." },
    typeBigWord: "Scrivi la parola grande del titolo per creare.",
    dropMusic: "Trascina qui un file musicale o scegli uno dei brani.",
    musicLengthUnread: "Non è stato possibile leggere la durata della tua musica. Scegli un altro file o uno dei brani.",
    musicApprox: "Musica aggiunta; i tagli usano una sincronia approssimativa ({detail}).",
    musicUnreadable: "Impossibile leggere questo file musicale ({detail}). Scegli un altro file o uno dei brani.",
    beatFailed: "rilevamento del ritmo non riuscito",
    previewFailed: "Impossibile riprodurre l'anteprima: {detail}.",
    previewNotCut: "non è stato possibile ritagliare l'anteprima",
    noAudio: "non è stato restituito alcun audio",
    draftNoId: "Il Draft «{name}» potrebbe essere stato salvato, ma Selects non ne ha comunicato l'ID. Aprilo dall'elenco dei Draft o crealo di nuovo.",
    draftEmpty: "Il Draft «{name}» non contiene clip. Crealo di nuovo.",
    finishFailed: "Il Draft è stato creato, ma titolo, look e audio delle clip non sono ancora applicati: {detail}. Premi «Completa titolo e look» per riprovare.",
    openFailed: "Il Draft è pronto, ma non è stato possibile aprirlo: {detail}. Usa il link qui sotto o aprilo dall'elenco dei Draft.",
    draftCreated: "Draft creato. Seleziona il titolo per modificarne parole, colori, dimensione o posizione, una clip per regolarne inquadratura, morbidezza, movimento o volume, e la musica per cambiarne il volume. Ricreare genera un nuovo Draft e non mantiene le modifiche dell'Inspector.",
    draftCreatedAdding: "Draft creato; aggiunta di titolo e look…",
    draftNotFinished: "Draft creato, ma titolo, look e audio delle clip non sono ancora applicati.",
    openDraft: "Apri il nuovo Draft",
    copyLink: "Copia il link al nuovo Draft",
    shortened: { one: "Il tuo materiale basta per {fitted} di {count} inquadratura, quindi questo video dura circa {seconds} s. Aggiungi altre clip o foto per la durata completa.", many: "Il tuo materiale basta per {fitted} di {count} di inquadrature, quindi questo video dura circa {seconds} s. Aggiungi altre clip o foto per la durata completa.", other: "Il tuo materiale basta per {fitted} di {count} inquadrature, quindi questo video dura circa {seconds} s. Aggiungi altre clip o foto per la durata completa." },
    note: "Nota: {detail}.",
    unchecked: { one: "Non è stato possibile controllare {count} video, che è stato saltato. Crea di nuovo per riprovare.", many: "Non è stato possibile controllare {count} di video, che sono stati saltati. Crea di nuovo per riprovare.", other: "Non è stato possibile controllare {count} video, che sono stati saltati. Crea di nuovo per riprovare." },
    createsDraft: "Crea un nuovo Draft 16:9",
    finishTitle: "Completa titolo e look",
    anotherVersion: "Crea un'altra versione",
    build: "Crea",
    building: "Creazione",
    "param.mainColor": "Colore principale",
    "param.secondColor": "Colore secondario",
    "param.shadow": "Ombra",
    "param.size": "Dimensione (%)",
    "param.x": "Posizione orizzontale (%)",
    "param.y": "Posizione verticale (%)",
    "param.sparkles": "Scintille",
    "param.stars": "Stelle",
    "param.motion": "Movimento",
    "param.motionStrength": "Intensità del movimento",
    "param.punch": "Punch",
    "param.softness": "Morbidezza",
    "motion.push-in": "Zoom avanti",
    "motion.pull-out": "Zoom indietro",
    "motion.drift-left": "Scorri a sinistra",
    "motion.drift-right": "Scorri a destra",
    "motion.drift-up": "Scorri in alto",
    "motion.drift-down": "Scorri in basso",
    "motion.tilt": "Inclina",
    "motion.push-drift": "Zoom e scorrimento",
  },
  ja: {
    openProject: "Mini Vlog を作成するには、プロジェクトを開いてください。",
    startFailed: "Mini Vlog を起動できませんでした: {detail}。問題が続く場合はプラグインを再インストールしてください。",
    foldersNotFound: "プラグインのフォルダが見つかりませんでした",
    adapterNeeded: "この Selects のビルドには、更新された {name} アダプターが必要です。",
    stepFailed: "Selects はこのステップを完了できませんでした。",
    busy: "Selects が混み合っていて時間内に応答しませんでした。少し待ってから「更新」を押してください。何度も起きる場合は Selects を再起動してください。",
    invFailed: "このプロジェクトのクリップをまだ読み込めません。「更新」を押してください。",
    invPartial: "まだすべてのクリップを読み込めていません。「更新」を押してください。",
    sizesLoading: "クリップのサイズを読み込み中…",
    refreshFailed: "クリップ一覧を更新できませんでした: {detail}",
    details: "詳細: {detail}",
    refresh: "更新",
    refreshing: "更新中",
    checkingClipsNow: "クリップを確認中…",
    checkingClips: "クリップを確認中",
    listening: "ビートを検出中",
    working: "処理中",
    stillReading: "このプロジェクトのクリップを読み込み中… 自動で更新されます。",
    noFootage: "このプロジェクトには、解析済みの動画も写真もまだありません。動画クリップを追加して解析するか、写真を追加してください。自動で更新されます。",
    turnOnPhotos: "このプロジェクトの写真から作成するには、「詳細設定」で「写真を使う」をオンにしてください。",
    noClipsSelected: "クリップが選択されていません。「詳細設定」でクリップを選んでください。",
    gap: "",
    ready: "準備完了: {summary}",
    clips: { other: "クリップ {count} 本" },
    clipsSelected: { other: "クリップ {count} 本中 {selected} 本を選択" },
    photos: { other: "写真 {count} 枚" },
    photosSelected: { other: "写真 {count} 枚中 {selected} 枚を選択" },
    aboutSeconds: "約 {seconds} 秒",
    notAnalysed: { other: "未解析のクリップ {count} 本" },
    analysing: { other: "{count} 本のクリップを解析中です。終わると自動で更新されます。" },
    notAnalysedAnalyse: { other: "{count} 本のクリップがまだ解析されていません。ここで使うには Selects で解析してください。" },
    notAnalysedMaybe: { other: "{count} 本のクリップがまだ解析されていません。Selects が解析中なら、自動で更新されます。" },
    analysisFailed: { other: "{count} 本のクリップを解析できませんでした。" },
    noteAnalysing: { other: "解析中のクリップ {count} 本" },
    noteFailed: { other: "解析できなかったクリップ {count} 本" },
    title: "タイトル",
    titleStyle: "タイトルのスタイル",
    titlePreview: "タイトルのプレビュー",
    previewUnavailable: "プレビューを表示できません。タイトルは Draft に追加されます。",
    loading: "読み込み中…",
    "preset.mini-vlog": "ミニ Vlog",
    "preset.day-in-my-life": "わたしの一日",
    "preset.small-glimpse": "小さなひとコマ",
    "field.mini-vlog.big": "大きな文字",
    "field.mini-vlog.small": "小さな文字",
    "field.day-in-my-life.year": "年",
    "field.day-in-my-life.big": "大きな文字",
    "field.day-in-my-life.tag": "タグライン",
    "field.small-glimpse.top": "上の行",
    "field.small-glimpse.big": "大きな文字",
    "field.small-glimpse.bottom": "下の行",
    fieldCount: "{label}（{used}/{max}）",
    music: "音楽",
    track: "トラック",
    alternatives: "その他の曲",
    ownMusic: "自分の音楽",
    noMusic: "音楽なし",
    bpm: "{bpm} BPM",
    installTools: "音楽のプレビューや自分の曲の使用には、ffmpeg と Node.js 18 以降をインストールしてください。",
    sectionHint: "音楽の区間 — ドラッグして選択",
    sectionLabel: "音楽の区間",
    musicTooShort: "このトラックはこの長さには短すぎます",
    startsAt: "{seconds} 秒から開始",
    stopPreview: "プレビューを停止",
    cancelPreview: "プレビューをキャンセル",
    previewSection: "この区間をプレビュー",
    readingMusic: "音楽を読み込み中…",
    musicLengthUnknown: "この音楽の長さがわかりません",
    startAtHook: "サビから始める",
    beatFound: "ビートを検出: {bpm} BPM。カットはビートに合わせます。",
    faintTempo: "テンポ（{bpm} BPM）は見つかりましたがビートが弱いため、カットは {bpm} BPM のグリッドにおおよそ合わせます。",
    outsideTempo: "テンポ（{bpm} BPM）が 70〜160 BPM の範囲外のため、カットはおおよそのタイミングになります。",
    noBeat: "安定したビートが見つからないため、カットはおおよそのタイミングになります。",
    length: "長さ",
    "length.short": "短め",
    "length.standard": "標準",
    "length.long": "長め",
    pace: "ペース",
    "pace.quick": "クイック",
    "pace.relaxed": "ゆったり",
    "pace.groove": "グルーヴ",
    fitPartial: { other: "{length}: このトラックに収まるのは {count} ショット中 {fitted} ショット（{seconds} 秒）" },
    fitFull: { other: "{length}: {count} ショット（{seconds} 秒）" },
    footageFits: { other: "素材で作れるのは {count} ショット中 {fitted} ショット（{seconds} 秒）" },
    seconds: "{seconds} 秒",
    grooveTiming: "{beat} 秒のビートでグルーヴ: {hold}・{beat}・{eighth} 秒のショット",
    quickTwoBeats: "{bpm} BPM では「クイック」は 1 ショット 2 ビートになります。",
    relaxedOneBeat: "{bpm} BPM では「ゆったり」は 1 ショット 1 ビートになります。",
    grooveOneBeat: "{bpm} BPM では「グルーヴ」はフレーズを 1 ビートで始めます。",
    grooveTwoBeats: "{bpm} BPM では「グルーヴ」は 1 ショット 2 ビートになります。",
    noMusicTiming: "音楽なし: ショットはおおよそのタイミングになります（{timing}）。",
    faintTempoTiming: "テンポ（{bpm} BPM）は見つかりましたがビートが弱いため、カットは {bpm} BPM のグリッドにおおよそ合わせます（{timing}）。",
    outsideTempoTiming: "テンポが 70〜160 BPM の範囲外です（{bpm} BPM）: ショットはおおよそのタイミングになります（{timing}）。",
    noBeatTiming: "安定したビートが見つかりません: ショットはおおよそのタイミングになります（{timing}）。",
    advanced: "詳細設定",
    clipSound: "クリップの音",
    "sound.off": "オフ",
    "sound.ambient": "環境音",
    "sound.full": "フル",
    softLook: "ソフトルック",
    beatPunch: "ビートパンチ",
    usePhotos: "写真を使う",
    usePhotosOff: "「写真を使う」がオフです",
    silentVideo: "無音の動画: 音楽なしで、クリップの音が「オフ」です。",
    chooseClips: "クリップを選択",
    chooseClipsCount: "クリップを選択（{selected}/{total}）",
    all: "すべて",
    none: "なし",
    photo: "写真",
    "shape.tall": "縦長",
    "shape.wide": "横長",
    "shape.square": "正方形",
    "step.shots": "ショットを選択",
    "step.music": "音楽を準備",
    "step.draft": "Draft を作成",
    "step.look": "タイトルとルックを追加",
    "step.open": "Draft を開く",
    progress: "ステップ {step}/{total} · {name} · {percent}%",
    progressDetail: "ステップ {step}/{total} · {name}（{detail}）· {percent}%",
    videosChecked: { other: "{done}/{count} 本の動画を確認済み" },
    photosOnly: "写真のみ",
    stoppedAt: "ステップ {step}/{total}（{name}）で停止しました: {detail}",
    "fail.one-resource": "クリップか写真を 2 つ以上追加してください。",
    "fail.too-few": "素材で作れるのは 4 ショット未満です。",
    "fail.music-too-short": "このトラックはこの区間から 4 ショットを作るには短すぎます。",
    noPlan: "この素材に合うプランがありません。",
    addFootage: "変化のある素材を追加するか、クリップをもっと選択してください。",
    addFootagePhotos: "変化のある素材や写真を追加するか、クリップをもっと選択してください。",
    retryUnchecked: { other: "{count} 本の動画を確認できませんでした。「作成」を押すと再試行します。" },
    typeBigWord: "作成するには、タイトルの大きな文字を入力してください。",
    dropMusic: "音楽ファイルをドロップするか、用意されたトラックを選んでください。",
    musicLengthUnread: "音楽の長さを読み取れませんでした。別のファイルか、用意されたトラックを選んでください。",
    musicApprox: "音楽を追加しました。カットはおおよそのタイミングになります（{detail}）。",
    musicUnreadable: "この音楽ファイルを読み込めませんでした（{detail}）。別のファイルか、用意されたトラックを選んでください。",
    beatFailed: "ビートの検出に失敗しました",
    previewFailed: "プレビューを再生できませんでした: {detail}。",
    previewNotCut: "プレビューを切り出せませんでした",
    noAudio: "音声が返されませんでした",
    draftNoId: "Draft「{name}」は保存された可能性がありますが、Selects から ID が返されませんでした。Draft の一覧から開くか、もう一度作成してください。",
    draftEmpty: "Draft「{name}」にクリップがありません。もう一度作成してください。",
    finishFailed: "Draft は作成されましたが、タイトル・ルック・クリップの音はまだ適用されていません: {detail}。「タイトルとルックを仕上げる」を押して再試行してください。",
    openFailed: "Draft の準備はできましたが、開けませんでした: {detail}。下のリンクを使うか、Draft 一覧から開いてください。",
    draftCreated: "Draft を作成しました。タイトルを選ぶと文字・色・サイズ・位置を、クリップを選ぶと切り抜き・ソフトさ・モーション・音量を、音楽を選ぶと音量を変更できます。作り直すと新しい Draft が作成され、インスペクタでの編集は引き継がれません。",
    draftCreatedAdding: "Draft を作成しました。タイトルとルックを追加中…",
    draftNotFinished: "Draft は作成されましたが、タイトル・ルック・クリップの音はまだ適用されていません。",
    openDraft: "新しい Draft を開く",
    copyLink: "新しい Draft へのリンクをコピー",
    shortened: { other: "素材で作れるのは {count} ショット中 {fitted} ショットのため、この動画は約 {seconds} 秒です。フルの長さにするにはクリップか写真を追加してください。" },
    note: "メモ: {detail}。",
    unchecked: { other: "{count} 本の動画を確認できなかったため、スキップしました。もう一度作成すると再試行します。" },
    createsDraft: "16:9 の新しい Draft を作成します",
    finishTitle: "タイトルとルックを仕上げる",
    anotherVersion: "別のバージョンを作成",
    build: "作成",
    building: "作成中",
    "param.mainColor": "メインの色",
    "param.secondColor": "サブの色",
    "param.shadow": "影",
    "param.size": "サイズ (%)",
    "param.x": "横位置 (%)",
    "param.y": "縦位置 (%)",
    "param.sparkles": "キラキラ",
    "param.stars": "星",
    "param.motion": "モーション",
    "param.motionStrength": "モーションの強さ",
    "param.punch": "パンチ",
    "param.softness": "ソフトさ",
    "motion.push-in": "ズームイン",
    "motion.pull-out": "ズームアウト",
    "motion.drift-left": "左へスライド",
    "motion.drift-right": "右へスライド",
    "motion.drift-up": "上へスライド",
    "motion.drift-down": "下へスライド",
    "motion.tilt": "傾ける",
    "motion.push-drift": "ズームしてスライド",
  },
  ko: {
    openProject: "Mini Vlog\ub97c \ub9cc\ub4e4\ub824\uba74 \ud504\ub85c\uc81d\ud2b8\ub97c \uc5ec\uc138\uc694.",
    startFailed: "Mini Vlog\ub97c \uc2dc\uc791\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}. \uacc4\uc18d\ub418\uba74 \ud50c\ub7ec\uadf8\uc778\uc744 \ub2e4\uc2dc \uc124\uce58\ud558\uc138\uc694.",
    foldersNotFound: "\ud50c\ub7ec\uadf8\uc778 \ud3f4\ub354\ub97c \ucc3e\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4",
    adapterNeeded: "\uc774 Selects \ube4c\ub4dc\uc5d0\ub294 \uc5c5\ub370\uc774\ud2b8\ub41c {name} \uc5b4\ub311\ud130\uac00 \ud544\uc694\ud569\ub2c8\ub2e4.",
    stepFailed: "Selects\uac00 \uc774 \ub2e8\uacc4\ub97c \uc644\ub8cc\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.",
    busy: "Selects\uac00 \ubc14\ube60\uc11c \uc81c\ub54c \uc751\ub2f5\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. \uc7a0\uc2dc \uae30\ub2e4\ub9b0 \ub4a4 ‘\uc0c8\ub85c\uace0\uce68’\uc744 \ub204\ub974\uc138\uc694. \uacc4\uc18d\ub418\uba74 Selects\ub97c \ub2e4\uc2dc \uc2dc\uc791\ud558\uc138\uc694.",
    invFailed: "\uc774 \ud504\ub85c\uc81d\ud2b8\uc758 \ud074\ub9bd\uc744 \uc544\uc9c1 \uc77d\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. ‘\uc0c8\ub85c\uace0\uce68’\uc744 \ub204\ub974\uc138\uc694.",
    invPartial: "\uc544\uc9c1 \ubaa8\ub4e0 \ud074\ub9bd\uc744 \uc77d\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. ‘\uc0c8\ub85c\uace0\uce68’\uc744 \ub204\ub974\uc138\uc694.",
    sizesLoading: "\ud074\ub9bd \ud06c\uae30\ub97c \ubd88\ub7ec\uc624\ub294 \uc911…",
    refreshFailed: "\ud074\ub9bd \ubaa9\ub85d\uc744 \uc0c8\ub85c\uace0\uce68\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}",
    details: "\uc790\uc138\ud788: {detail}",
    refresh: "\uc0c8\ub85c\uace0\uce68",
    refreshing: "\uc0c8\ub85c\uace0\uce68 \uc911",
    checkingClipsNow: "\ud074\ub9bd \ud655\uc778 \uc911…",
    checkingClips: "\ud074\ub9bd \ud655\uc778 \uc911",
    listening: "\ube44\ud2b8 \ucc3e\ub294 \uc911",
    working: "\uc791\uc5c5 \uc911",
    stillReading: "\uc774 \ud504\ub85c\uc81d\ud2b8\uc758 \ud074\ub9bd\uc744 \uc77d\ub294 \uc911… \uc790\ub3d9\uc73c\ub85c \uc5c5\ub370\uc774\ud2b8\ub429\ub2c8\ub2e4.",
    noFootage: "\uc774 \ud504\ub85c\uc81d\ud2b8\uc5d0\ub294 \uc544\uc9c1 \ubd84\uc11d\ub41c \uc601\uc0c1\uc774\ub098 \uc0ac\uc9c4\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. \uc601\uc0c1 \ud074\ub9bd\uc744 \ucd94\uac00\ud574 \ubd84\uc11d\ud558\uac70\ub098 \uc0ac\uc9c4\uc744 \ucd94\uac00\ud558\uc138\uc694. \uc790\ub3d9\uc73c\ub85c \uc5c5\ub370\uc774\ud2b8\ub429\ub2c8\ub2e4.",
    turnOnPhotos: "\uc774 \ud504\ub85c\uc81d\ud2b8\uc758 \uc0ac\uc9c4\uc73c\ub85c \ub9cc\ub4e4\ub824\uba74 ‘\uace0\uae09’\uc5d0\uc11c ‘\uc0ac\uc9c4 \uc0ac\uc6a9’\uc744 \ucf1c\uc138\uc694.",
    noClipsSelected: "\uc120\ud0dd\ud55c \ud074\ub9bd\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. ‘\uace0\uae09’\uc5d0\uc11c \ud074\ub9bd\uc744 \uc120\ud0dd\ud558\uc138\uc694.",
    gap: " ",
    ready: "\uc900\ube44 \uc644\ub8cc: {summary}",
    clips: { other: "\ud074\ub9bd {count}\uac1c" },
    clipsSelected: { other: "\ud074\ub9bd {count}\uac1c \uc911 {selected}\uac1c \uc120\ud0dd" },
    photos: { other: "\uc0ac\uc9c4 {count}\uc7a5" },
    photosSelected: { other: "\uc0ac\uc9c4 {count}\uc7a5 \uc911 {selected}\uc7a5 \uc120\ud0dd" },
    aboutSeconds: "\uc57d {seconds}\ucd08",
    notAnalysed: { other: "\uc544\uc9c1 \ubd84\uc11d\ub418\uc9c0 \uc54a\uc740 \ud074\ub9bd {count}\uac1c" },
    analysing: { other: "\ud074\ub9bd {count}\uac1c\ub97c \ubd84\uc11d\ud558\uace0 \uc788\uc2b5\ub2c8\ub2e4. \ubd84\uc11d\uc774 \ub05d\ub098\uba74 \uc790\ub3d9\uc73c\ub85c \uc5c5\ub370\uc774\ud2b8\ub429\ub2c8\ub2e4." },
    notAnalysedAnalyse: { other: "\ud074\ub9bd {count}\uac1c\uac00 \uc544\uc9c1 \ubd84\uc11d\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4. \uc5ec\uae30\uc11c \uc4f0\ub824\uba74 Selects\uc5d0\uc11c \ubd84\uc11d\ud558\uc138\uc694." },
    notAnalysedMaybe: { other: "\ud074\ub9bd {count}\uac1c\uac00 \uc544\uc9c1 \ubd84\uc11d\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4. Selects\uc5d0\uc11c \ubd84\uc11d \uc911\uc774\ub77c\uba74 \uc790\ub3d9\uc73c\ub85c \uc5c5\ub370\uc774\ud2b8\ub429\ub2c8\ub2e4." },
    analysisFailed: { other: "\ud074\ub9bd {count}\uac1c\ub97c \ubd84\uc11d\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4." },
    noteAnalysing: { other: "\ubd84\uc11d \uc911\uc778 \ud074\ub9bd {count}\uac1c" },
    noteFailed: { other: "\ubd84\uc11d\ud558\uc9c0 \ubabb\ud55c \ud074\ub9bd {count}\uac1c" },
    title: "\ud0c0\uc774\ud2c0",
    titleStyle: "\ud0c0\uc774\ud2c0 \uc2a4\ud0c0\uc77c",
    titlePreview: "\ud0c0\uc774\ud2c0 \ubbf8\ub9ac\ubcf4\uae30",
    previewUnavailable: "\ubbf8\ub9ac\ubcf4\uae30\ub97c \ud45c\uc2dc\ud560 \uc218 \uc5c6\uc9c0\ub9cc \ud0c0\uc774\ud2c0\uc740 Draft\uc5d0 \ucd94\uac00\ub429\ub2c8\ub2e4.",
    loading: "\ubd88\ub7ec\uc624\ub294 \uc911…",
    "preset.mini-vlog": "\ubbf8\ub2c8 \ube0c\uc774\ub85c\uadf8",
    "preset.day-in-my-life": "\ub098\uc758 \ud558\ub8e8",
    "preset.small-glimpse": "\uc791\uc740 \uc21c\uac04",
    "field.mini-vlog.big": "\ud070 \uae00\uc790",
    "field.mini-vlog.small": "\uc791\uc740 \uae00\uc790",
    "field.day-in-my-life.year": "\uc5f0\ub3c4",
    "field.day-in-my-life.big": "\ud070 \uae00\uc790",
    "field.day-in-my-life.tag": "\ud0dc\uadf8 \ubb38\uad6c",
    "field.small-glimpse.top": "\uc704 \uc904",
    "field.small-glimpse.big": "\ud070 \uae00\uc790",
    "field.small-glimpse.bottom": "\uc544\ub798 \uc904",
    fieldCount: "{label} ({used}/{max})",
    music: "\uc74c\uc545",
    track: "\ud2b8\ub799",
    alternatives: "\ub2e4\ub978 \ud2b8\ub799",
    ownMusic: "\ub0b4 \uc74c\uc545",
    noMusic: "\uc74c\uc545 \uc5c6\uc74c",
    bpm: "{bpm} BPM",
    installTools: "\uc74c\uc545\uc744 \ubbf8\ub9ac \ub4e3\uac70\ub098 \ub0b4 \uc74c\uc545\uc744 \uc4f0\ub824\uba74 ffmpeg\uc640 Node.js 18 \uc774\uc0c1\uc744 \uc124\uce58\ud558\uc138\uc694.",
    sectionHint: "\uc74c\uc545 \uad6c\uac04 — \ub4dc\ub798\uadf8\ud574\uc11c \uc120\ud0dd",
    sectionLabel: "\uc74c\uc545 \uad6c\uac04",
    musicTooShort: "\uc774 \ud2b8\ub799\uc740 \uc774 \uae38\uc774\uc5d0 \ube44\ud574 \ub108\ubb34 \uc9e7\uc2b5\ub2c8\ub2e4",
    startsAt: "{seconds}\ucd08\ubd80\ud130 \uc2dc\uc791",
    stopPreview: "\ubbf8\ub9ac\ub4e3\uae30 \uc911\uc9c0",
    cancelPreview: "\ubbf8\ub9ac\ub4e3\uae30 \ucde8\uc18c",
    previewSection: "\uc774 \uad6c\uac04 \ubbf8\ub9ac\ub4e3\uae30",
    readingMusic: "\uc74c\uc545 \uc77d\ub294 \uc911…",
    musicLengthUnknown: "\uc774 \uc74c\uc545\uc758 \uae38\uc774\ub97c \uc54c \uc218 \uc5c6\uc2b5\ub2c8\ub2e4",
    startAtHook: "\ud558\uc774\ub77c\uc774\ud2b8\ubd80\ud130 \uc2dc\uc791",
    beatFound: "\ube44\ud2b8 \ucc3e\uc74c: {bpm} BPM. \ucef7\uc774 \ube44\ud2b8\uc5d0 \ub9de\ucdb0\uc9d1\ub2c8\ub2e4.",
    faintTempo: "\ud15c\ud3ec({bpm} BPM)\ub294 \ucc3e\uc558\uc9c0\ub9cc \ube44\ud2b8\uac00 \uc57d\ud574\uc11c \ucef7\uc774 {bpm} BPM \uadf8\ub9ac\ub4dc\uc5d0 \ub300\ub7b5 \ub9de\ucdb0\uc9d1\ub2c8\ub2e4.",
    outsideTempo: "\ud15c\ud3ec({bpm} BPM)\uac00 70~160 BPM \ubc94\uc704\ub97c \ubc97\uc5b4\ub098\uc11c \ucef7\uc774 \ub300\ub7b5\uc801\uc778 \ud0c0\uc774\ubc0d\uc744 \uc501\ub2c8\ub2e4.",
    noBeat: "\uc77c\uc815\ud55c \ube44\ud2b8\ub97c \ucc3e\uc9c0 \ubabb\ud574\uc11c \ucef7\uc774 \ub300\ub7b5\uc801\uc778 \ud0c0\uc774\ubc0d\uc744 \uc501\ub2c8\ub2e4.",
    length: "\uae38\uc774",
    "length.short": "\uc9e7\uac8c",
    "length.standard": "\ubcf4\ud1b5",
    "length.long": "\uae38\uac8c",
    pace: "\ucef7 \uc18d\ub3c4",
    "pace.quick": "\ube60\ub974\uac8c",
    "pace.relaxed": "\uc5ec\uc720\ub86d\uac8c",
    "pace.groove": "\uadf8\ub8e8\ube0c",
    fitPartial: { other: "{length}: \uc774 \ud2b8\ub799\uc5d0 {count}\uc0f7 \uc911 {fitted}\uc0f7\uc774 \ub4e4\uc5b4\uac11\ub2c8\ub2e4 ({seconds}\ucd08)" },
    fitFull: { other: "{length}: {count}\uc0f7 ({seconds}\ucd08)" },
    footageFits: { other: "\uc601\uc0c1\uc73c\ub85c {count}\uc0f7 \uc911 {fitted}\uc0f7\uc744 \ub9cc\ub4e4 \uc218 \uc788\uc2b5\ub2c8\ub2e4 ({seconds}\ucd08)" },
    seconds: "{seconds}\ucd08",
    grooveTiming: "{beat}\ucd08 \ube44\ud2b8\uc758 \uadf8\ub8e8\ube0c: {hold}\ucd08, {beat}\ucd08, {eighth}\ucd08 \uc0f7",
    quickTwoBeats: "{bpm} BPM\uc5d0\uc11c\ub294 ‘\ube60\ub974\uac8c’\uac00 \uc0f7\ub2f9 2\ube44\ud2b8\ub97c \uc501\ub2c8\ub2e4.",
    relaxedOneBeat: "{bpm} BPM\uc5d0\uc11c\ub294 ‘\uc5ec\uc720\ub86d\uac8c’\uac00 \uc0f7\ub2f9 1\ube44\ud2b8\ub97c \uc501\ub2c8\ub2e4.",
    grooveOneBeat: "{bpm} BPM\uc5d0\uc11c\ub294 ‘\uadf8\ub8e8\ube0c’\uac00 \ud504\ub808\uc774\uc988\ub97c 1\ube44\ud2b8\ub85c \uc2dc\uc791\ud569\ub2c8\ub2e4.",
    grooveTwoBeats: "{bpm} BPM\uc5d0\uc11c\ub294 ‘\uadf8\ub8e8\ube0c’\uac00 \uc0f7\ub2f9 2\ube44\ud2b8\ub97c \uc501\ub2c8\ub2e4.",
    noMusicTiming: "\uc74c\uc545 \uc5c6\uc74c: \uc0f7\uc774 \ub300\ub7b5\uc801\uc778 \ud0c0\uc774\ubc0d\uc744 \uc501\ub2c8\ub2e4 ({timing}).",
    faintTempoTiming: "\ud15c\ud3ec({bpm} BPM)\ub294 \ucc3e\uc558\uc9c0\ub9cc \ube44\ud2b8\uac00 \uc57d\ud569\ub2c8\ub2e4: \ucef7\uc774 {bpm} BPM \uadf8\ub9ac\ub4dc\uc5d0 \ub300\ub7b5 \ub9de\ucdb0\uc9d1\ub2c8\ub2e4 ({timing}).",
    outsideTempoTiming: "\ud15c\ud3ec\uac00 70~160 BPM \ubc94\uc704\ub97c \ubc97\uc5b4\ub0ac\uc2b5\ub2c8\ub2e4({bpm} BPM): \uc0f7\uc774 \ub300\ub7b5\uc801\uc778 \ud0c0\uc774\ubc0d\uc744 \uc501\ub2c8\ub2e4 ({timing}).",
    noBeatTiming: "\uc77c\uc815\ud55c \ube44\ud2b8\ub97c \ucc3e\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: \uc0f7\uc774 \ub300\ub7b5\uc801\uc778 \ud0c0\uc774\ubc0d\uc744 \uc501\ub2c8\ub2e4 ({timing}).",
    advanced: "\uace0\uae09",
    clipSound: "\ud074\ub9bd \uc18c\ub9ac",
    "sound.off": "\ub054",
    "sound.ambient": "\ubc30\uacbd\uc74c",
    "sound.full": "\uc6d0\uc74c",
    softLook: "\ubd80\ub4dc\ub7ec\uc6b4 \uc0c9\uac10",
    beatPunch: "\ube44\ud2b8 \ud380\uce58",
    usePhotos: "\uc0ac\uc9c4 \uc0ac\uc6a9",
    usePhotosOff: "‘\uc0ac\uc9c4 \uc0ac\uc6a9’\uc774 \uaebc\uc838 \uc788\uc74c",
    silentVideo: "\ubb34\uc74c \uc601\uc0c1: \uc74c\uc545\uc774 \uc5c6\uace0 \ud074\ub9bd \uc18c\ub9ac\uac00 ‘\ub054’\uc785\ub2c8\ub2e4.",
    chooseClips: "\ud074\ub9bd \uc120\ud0dd",
    chooseClipsCount: "\ud074\ub9bd \uc120\ud0dd ({selected}/{total})",
    all: "\uc804\uccb4",
    none: "\uc5c6\uc74c",
    photo: "\uc0ac\uc9c4",
    "shape.tall": "\uc138\ub85c",
    "shape.wide": "\uac00\ub85c",
    "shape.square": "\uc815\uc0ac\uac01\ud615",
    "step.shots": "\uc0f7 \uace0\ub974\uae30",
    "step.music": "\uc74c\uc545 \uc900\ube44",
    "step.draft": "Draft \ub9cc\ub4e4\uae30",
    "step.look": "\ud0c0\uc774\ud2c0\uacfc \uc0c9\uac10 \ucd94\uac00",
    "step.open": "Draft \uc5f4\uae30",
    progress: "{step}/{total}\ub2e8\uacc4 · {name} · {percent}%",
    progressDetail: "{step}/{total}\ub2e8\uacc4 · {name} ({detail}) · {percent}%",
    videosChecked: { other: "\ub3d9\uc601\uc0c1 {done}/{count}\uac1c \ud655\uc778" },
    photosOnly: "\uc0ac\uc9c4\ub9cc",
    stoppedAt: "{step}/{total}\ub2e8\uacc4({name})\uc5d0\uc11c \uc911\ub2e8\ub418\uc5c8\uc2b5\ub2c8\ub2e4: {detail}",
    "fail.one-resource": "\ud074\ub9bd\uc774\ub098 \uc0ac\uc9c4\uc744 2\uac1c \uc774\uc0c1 \ucd94\uac00\ud558\uc138\uc694.",
    "fail.too-few": "\uc601\uc0c1\uc73c\ub85c \ub9cc\ub4e4 \uc218 \uc788\ub294 \uc0f7\uc774 4\uac1c\ubcf4\ub2e4 \uc801\uc2b5\ub2c8\ub2e4.",
    "fail.music-too-short": "\uc774 \ud2b8\ub799\uc740 \uc774 \uad6c\uac04\ubd80\ud130 4\uc0f7\uc744 \ub9cc\ub4e4\uae30\uc5d0 \ub108\ubb34 \uc9e7\uc2b5\ub2c8\ub2e4.",
    noPlan: "\uc774 \uc601\uc0c1\uc5d0 \ub9de\ub294 \uad6c\uc131\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.",
    addFootage: "\ub354 \ub2e4\uc591\ud55c \uc601\uc0c1\uc744 \ucd94\uac00\ud558\uac70\ub098 \ud074\ub9bd\uc744 \ub354 \uc120\ud0dd\ud558\uc138\uc694.",
    addFootagePhotos: "\ub354 \ub2e4\uc591\ud55c \uc601\uc0c1\uc774\ub098 \uc0ac\uc9c4\uc744 \ucd94\uac00\ud558\uac70\ub098 \ud074\ub9bd\uc744 \ub354 \uc120\ud0dd\ud558\uc138\uc694.",
    retryUnchecked: { other: "\ub3d9\uc601\uc0c1 {count}\uac1c\ub97c \ud655\uc778\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. ‘\ub9cc\ub4e4\uae30’\ub97c \ub204\ub974\uba74 \uc7ac\uc2dc\ub3c4\ud569\ub2c8\ub2e4." },
    typeBigWord: "\ub9cc\ub4e4\ub824\uba74 \ud0c0\uc774\ud2c0\uc758 \ud070 \uae00\uc790\ub97c \uc785\ub825\ud558\uc138\uc694.",
    dropMusic: "\uc74c\uc545 \ud30c\uc77c\uc744 \ub04c\uc5b4\ub2e4 \ub193\uac70\ub098 \uc81c\uacf5\ub41c \ud2b8\ub799\uc744 \uc120\ud0dd\ud558\uc138\uc694.",
    musicLengthUnread: "\uc74c\uc545\uc758 \uae38\uc774\ub97c \uc77d\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. \ub2e4\ub978 \ud30c\uc77c\uc774\ub098 \uc81c\uacf5\ub41c \ud2b8\ub799\uc744 \uc120\ud0dd\ud558\uc138\uc694.",
    musicApprox: "\uc74c\uc545\uc744 \ucd94\uac00\ud588\uc2b5\ub2c8\ub2e4. \ucef7\uc740 \ub300\ub7b5\uc801\uc778 \ud0c0\uc774\ubc0d\uc744 \uc501\ub2c8\ub2e4 ({detail}).",
    musicUnreadable: "\uc774 \uc74c\uc545 \ud30c\uc77c\uc744 \uc77d\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4({detail}). \ub2e4\ub978 \ud30c\uc77c\uc774\ub098 \uc81c\uacf5\ub41c \ud2b8\ub799\uc744 \uc120\ud0dd\ud558\uc138\uc694.",
    beatFailed: "\ube44\ud2b8 \uac10\uc9c0\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4",
    previewFailed: "\ubbf8\ub9ac\ub4e3\uae30\ub97c \uc7ac\uc0dd\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}.",
    previewNotCut: "\ubbf8\ub9ac\ub4e3\uae30 \uad6c\uac04\uc744 \uc798\ub77c\ub0b4\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4",
    noAudio: "\uc624\ub514\uc624\uac00 \ub3cc\uc544\uc624\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4",
    draftNoId: "Draft ‘{name}’\uc774(\uac00) \uc800\uc7a5\ub418\uc5c8\uc744 \uc218 \uc788\uc9c0\ub9cc Selects\uac00 ID\ub97c \uc54c\ub824 \uc8fc\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4. Draft \ubaa9\ub85d\uc5d0\uc11c \uc5f4\uac70\ub098 \ub2e4\uc2dc \ub9cc\ub4dc\uc138\uc694.",
    draftEmpty: "Draft ‘{name}’\uc5d0 \ud074\ub9bd\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \ub9cc\ub4dc\uc138\uc694.",
    finishFailed: "Draft\ub294 \ub9cc\ub4e4\uc5c8\uc9c0\ub9cc \ud0c0\uc774\ud2c0, \uc0c9\uac10, \ud074\ub9bd \uc18c\ub9ac\uac00 \uc544\uc9c1 \uc801\uc6a9\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4: {detail}. ‘\ud0c0\uc774\ud2c0\uacfc \uc0c9\uac10 \ub9c8\ubb34\ub9ac’\ub97c \ub20c\ub7ec \ub2e4\uc2dc \uc2dc\ub3c4\ud558\uc138\uc694.",
    openFailed: "Draft\ub294 \uc900\ube44\ub418\uc5c8\uc9c0\ub9cc \uc5f4\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}. \uc544\ub798 \ub9c1\ud06c\ub97c \uc4f0\uac70\ub098 Draft \ubaa9\ub85d\uc5d0\uc11c \uc5ec\uc138\uc694.",
    draftCreated: "Draft\ub97c \ub9cc\ub4e4\uc5c8\uc2b5\ub2c8\ub2e4. \ud0c0\uc774\ud2c0\uc744 \uc120\ud0dd\ud558\uba74 \uae00\uc790, \uc0c9, \ud06c\uae30, \uc704\uce58\ub97c, \ud074\ub9bd\uc744 \uc120\ud0dd\ud558\uba74 \ud06c\ub86d, \ubd80\ub4dc\ub7ec\uc6c0, \ubaa8\uc158, \uc18c\ub9ac \ud06c\uae30\ub97c, \uc74c\uc545\uc744 \uc120\ud0dd\ud558\uba74 \ubcfc\ub968\uc744 \ubc14\uafc0 \uc218 \uc788\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \ub9cc\ub4e4\uba74 \uc0c8 Draft\uac00 \uc0dd\uae30\uace0 \uc778\uc2a4\ud399\ud130\uc5d0\uc11c \ud55c \ud3b8\uc9d1\uc740 \uc720\uc9c0\ub418\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.",
    draftCreatedAdding: "Draft\ub97c \ub9cc\ub4e4\uc5c8\uc2b5\ub2c8\ub2e4. \ud0c0\uc774\ud2c0\uacfc \uc0c9\uac10\uc744 \ucd94\uac00\ud558\ub294 \uc911…",
    draftNotFinished: "Draft\ub294 \ub9cc\ub4e4\uc5c8\uc9c0\ub9cc \ud0c0\uc774\ud2c0, \uc0c9\uac10, \ud074\ub9bd \uc18c\ub9ac\uac00 \uc544\uc9c1 \uc801\uc6a9\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4.",
    openDraft: "\uc0c8 Draft \uc5f4\uae30",
    copyLink: "\uc0c8 Draft \ub9c1\ud06c \ubcf5\uc0ac",
    shortened: { other: "\uc601\uc0c1\uc73c\ub85c {count}\uc0f7 \uc911 {fitted}\uc0f7\ub9cc \ub9cc\ub4e4 \uc218 \uc788\uc5b4 \uc774 \ub3d9\uc601\uc0c1\uc740 \uc57d {seconds}\ucd08\uc785\ub2c8\ub2e4. \uc804\uccb4 \uae38\uc774\ub85c \ub9cc\ub4e4\ub824\uba74 \ud074\ub9bd\uc774\ub098 \uc0ac\uc9c4\uc744 \ub354 \ucd94\uac00\ud558\uc138\uc694." },
    note: "\ucc38\uace0: {detail}.",
    unchecked: { other: "\ub3d9\uc601\uc0c1 {count}\uac1c\ub97c \ud655\uc778\ud558\uc9c0 \ubabb\ud574 \uac74\ub108\ub6f0\uc5c8\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \ub9cc\ub4e4\uba74 \uc7ac\uc2dc\ub3c4\ud569\ub2c8\ub2e4." },
    createsDraft: "\uc0c8 16:9 Draft\ub97c \ub9cc\ub4ed\ub2c8\ub2e4",
    finishTitle: "\ud0c0\uc774\ud2c0\uacfc \uc0c9\uac10 \ub9c8\ubb34\ub9ac",
    anotherVersion: "\ub2e4\ub978 \ubc84\uc804 \ub9cc\ub4e4\uae30",
    build: "\ub9cc\ub4e4\uae30",
    building: "\ub9cc\ub4dc\ub294 \uc911",
    "param.mainColor": "\uc8fc \uc0c9\uc0c1",
    "param.secondColor": "\ubcf4\uc870 \uc0c9\uc0c1",
    "param.shadow": "\uadf8\ub9bc\uc790",
    "param.size": "\ud06c\uae30 (%)",
    "param.x": "\uac00\ub85c \uc704\uce58 (%)",
    "param.y": "\uc138\ub85c \uc704\uce58 (%)",
    "param.sparkles": "\ubc18\uc9dd\uc774",
    "param.stars": "\ubcc4",
    "param.motion": "\ubaa8\uc158",
    "param.motionStrength": "\ubaa8\uc158 \uac15\ub3c4",
    "param.punch": "\ud380\uce58",
    "param.softness": "\ubd80\ub4dc\ub7ec\uc6c0",
    "motion.push-in": "\uc90c \uc778",
    "motion.pull-out": "\uc90c \uc544\uc6c3",
    "motion.drift-left": "\uc67c\ucabd\uc73c\ub85c \uc774\ub3d9",
    "motion.drift-right": "\uc624\ub978\ucabd\uc73c\ub85c \uc774\ub3d9",
    "motion.drift-up": "\uc704\ub85c \uc774\ub3d9",
    "motion.drift-down": "\uc544\ub798\ub85c \uc774\ub3d9",
    "motion.tilt": "\uae30\uc6b8\uc774\uae30",
    "motion.push-drift": "\uc90c \uc778\ud558\uba70 \uc774\ub3d9",
  },
  pt: {
    openProject: "Abra um projeto para criar um Mini Vlog.",
    startFailed: "O Mini Vlog não conseguiu iniciar: {detail}. Reinstale o plugin se o problema continuar.",
    foldersNotFound: "as pastas do plugin não foram encontradas",
    adapterNeeded: "Esta versão do Selects precisa de um adaptador {name} atualizado.",
    stepFailed: "O Selects não conseguiu concluir esta etapa.",
    busy: "O Selects está ocupado e não respondeu a tempo. Aguarde um momento e pressione “Atualizar”. Se continuar acontecendo, reinicie o Selects.",
    invFailed: "Ainda não foi possível ler os clipes deste projeto. Pressione “Atualizar”.",
    invPartial: "Ainda não foi possível ler todos os clipes. Pressione “Atualizar”.",
    sizesLoading: "Os tamanhos dos clipes ainda estão carregando…",
    refreshFailed: "Não foi possível atualizar a lista de clipes: {detail}",
    details: "Detalhes: {detail}",
    refresh: "Atualizar",
    refreshing: "Atualizando",
    checkingClipsNow: "Verificando clipes…",
    checkingClips: "Verificando clipes",
    listening: "Procurando a batida",
    working: "Trabalhando",
    stillReading: "Ainda lendo os clipes deste projeto… Isto se atualiza automaticamente.",
    noFootage: "Este projeto ainda não tem vídeos analisados nem fotos. Adicione clipes de vídeo e analise-os, ou adicione fotos; a lista é atualizada automaticamente.",
    turnOnPhotos: "Ative “Usar fotos” em “Avançado” para criar com as fotos deste projeto.",
    noClipsSelected: "Nenhum clipe selecionado. Escolha clipes em “Avançado”.",
    gap: " ",
    ready: "Pronto: {summary}",
    clips: { one: "{count} clipe", many: "{count} de clipes", other: "{count} clipes" },
    clipsSelected: { one: "{selected} de {count} clipe selecionado", many: "{selected} de {count} de clipes selecionados", other: "{selected} de {count} clipes selecionados" },
    photos: { one: "{count} foto", many: "{count} de fotos", other: "{count} fotos" },
    photosSelected: { one: "{selected} de {count} foto selecionada", many: "{selected} de {count} de fotos selecionadas", other: "{selected} de {count} fotos selecionadas" },
    aboutSeconds: "cerca de {seconds} s",
    notAnalysed: { one: "{count} clipe ainda não analisado", many: "{count} de clipes ainda não analisados", other: "{count} clipes ainda não analisados" },
    analysing: { one: "{count} clipe está sendo analisado. Isto se atualiza sozinho quando terminar.", many: "{count} de clipes estão sendo analisados. Isto se atualiza sozinho quando terminarem.", other: "{count} clipes estão sendo analisados. Isto se atualiza sozinho quando terminarem." },
    notAnalysedAnalyse: { one: "{count} clipe ainda não foi analisado. Analise-o no Selects para usá-lo aqui.", many: "{count} de clipes ainda não foram analisados. Analise-os no Selects para usá-los aqui.", other: "{count} clipes ainda não foram analisados. Analise-os no Selects para usá-los aqui." },
    notAnalysedMaybe: { one: "{count} clipe ainda não foi analisado. Se o Selects estiver analisando, isto se atualiza sozinho.", many: "{count} de clipes ainda não foram analisados. Se o Selects estiver analisando, isto se atualiza sozinho.", other: "{count} clipes ainda não foram analisados. Se o Selects estiver analisando, isto se atualiza sozinho." },
    analysisFailed: { one: "Não foi possível analisar {count} clipe.", many: "Não foi possível analisar {count} de clipes.", other: "Não foi possível analisar {count} clipes." },
    noteAnalysing: { one: "{count} clipe em análise", many: "{count} de clipes em análise", other: "{count} clipes em análise" },
    noteFailed: { one: "{count} clipe não pôde ser analisado", many: "{count} de clipes não puderam ser analisados", other: "{count} clipes não puderam ser analisados" },
    title: "Título",
    titleStyle: "Estilo do título",
    titlePreview: "Prévia do título",
    previewUnavailable: "Prévia indisponível; o título ainda será adicionado ao Draft.",
    loading: "Carregando…",
    "preset.mini-vlog": "Mini vlog",
    "preset.day-in-my-life": "Um dia na minha vida",
    "preset.small-glimpse": "Um pequeno vislumbre",
    "field.mini-vlog.big": "Palavra grande",
    "field.mini-vlog.small": "Palavra pequena",
    "field.day-in-my-life.year": "Ano",
    "field.day-in-my-life.big": "Palavras grandes",
    "field.day-in-my-life.tag": "Frase curta",
    "field.small-glimpse.top": "Linha de cima",
    "field.small-glimpse.big": "Palavra grande",
    "field.small-glimpse.bottom": "Linha de baixo",
    fieldCount: "{label} ({used}/{max})",
    music: "Música",
    track: "Faixa",
    alternatives: "Alternativas",
    ownMusic: "Sua própria música",
    noMusic: "Sem música",
    bpm: "{bpm} BPM",
    installTools: "Instale o ffmpeg e o Node.js 18+ para ouvir a música ou usar sua própria faixa.",
    sectionHint: "Trecho da música: arraste para escolher",
    sectionLabel: "Trecho da música",
    musicTooShort: "Esta faixa é curta demais para esta duração",
    startsAt: "Começa em {seconds} s",
    stopPreview: "Parar a prévia",
    cancelPreview: "Cancelar a prévia",
    previewSection: "Ouvir este trecho",
    readingMusic: "Lendo a música…",
    musicLengthUnknown: "A duração desta música é desconhecida",
    startAtHook: "Começar no gancho",
    beatFound: "Batida encontrada: {bpm} BPM. Os cortes seguem a batida.",
    faintTempo: "Andamento encontrado ({bpm} BPM), mas a batida é fraca, então os cortes seguem aproximadamente uma grade de {bpm} BPM.",
    outsideTempo: "O andamento ({bpm} BPM) está fora da faixa de 70–160 BPM, então os cortes usam uma sincronia aproximada.",
    noBeat: "Nenhuma batida regular encontrada, então os cortes usam uma sincronia aproximada.",
    length: "Duração",
    "length.short": "Curta",
    "length.standard": "Padrão",
    "length.long": "Longa",
    pace: "Cadência",
    "pace.quick": "Rápida",
    "pace.relaxed": "Tranquila",
    "pace.groove": "Groove",
    fitPartial: { one: "{length}: {fitted} de {count} plano cabem nesta faixa ({seconds} s)", many: "{length}: {fitted} de {count} de planos cabem nesta faixa ({seconds} s)", other: "{length}: {fitted} de {count} planos cabem nesta faixa ({seconds} s)" },
    fitFull: { one: "{length}: {count} plano ({seconds} s)", many: "{length}: {count} de planos ({seconds} s)", other: "{length}: {count} planos ({seconds} s)" },
    footageFits: { one: "Seu material dá para {fitted} de {count} plano ({seconds} s)", many: "Seu material dá para {fitted} de {count} de planos ({seconds} s)", other: "Seu material dá para {fitted} de {count} planos ({seconds} s)" },
    seconds: "{seconds} s",
    grooveTiming: "Groove em uma batida de {beat} s: planos de {hold}, {beat} e {eighth} s",
    quickTwoBeats: "A {bpm} BPM, “Rápida” usa 2 batidas por plano.",
    relaxedOneBeat: "A {bpm} BPM, “Tranquila” usa 1 batida por plano.",
    grooveOneBeat: "A {bpm} BPM, “Groove” abre as frases com 1 batida.",
    grooveTwoBeats: "A {bpm} BPM, “Groove” usa 2 batidas por plano.",
    noMusicTiming: "Sem música: os planos usam uma sincronia aproximada ({timing}).",
    faintTempoTiming: "Andamento encontrado ({bpm} BPM), mas a batida é fraca: os cortes seguem aproximadamente uma grade de {bpm} BPM ({timing}).",
    outsideTempoTiming: "Andamento fora da faixa de 70–160 BPM ({bpm} BPM): os planos usam uma sincronia aproximada ({timing}).",
    noBeatTiming: "Nenhuma batida regular encontrada: os planos usam uma sincronia aproximada ({timing}).",
    advanced: "Avançado",
    clipSound: "Som dos clipes",
    "sound.off": "Desligado",
    "sound.ambient": "Ambiente",
    "sound.full": "Total",
    softLook: "Look suave",
    beatPunch: "Punch na batida",
    usePhotos: "Usar fotos",
    usePhotosOff: "“Usar fotos” está desativado",
    silentVideo: "Vídeo sem som: sem música e com o som dos clipes em “Desligado”.",
    chooseClips: "Escolher clipes",
    chooseClipsCount: "Escolher clipes ({selected}/{total})",
    all: "Todos",
    none: "Nenhum",
    photo: "Foto",
    "shape.tall": "Vertical",
    "shape.wide": "Horizontal",
    "shape.square": "Quadrado",
    "step.shots": "Escolhendo planos",
    "step.music": "Preparando a música",
    "step.draft": "Criando o Draft",
    "step.look": "Adicionando título e look",
    "step.open": "Abrindo o Draft",
    progress: "Etapa {step}/{total} · {name} · {percent}%",
    progressDetail: "Etapa {step}/{total} · {name} ({detail}) · {percent}%",
    videosChecked: { one: "{done}/{count} vídeo verificado", many: "{done}/{count} de vídeos verificados", other: "{done}/{count} vídeos verificados" },
    photosOnly: "só fotos",
    stoppedAt: "Parou na etapa {step}/{total}, {name}: {detail}",
    "fail.one-resource": "Adicione pelo menos 2 clipes ou fotos.",
    "fail.too-few": "Seu material dá para menos de 4 planos.",
    "fail.music-too-short": "Esta faixa é curta demais para 4 planos a partir deste trecho.",
    noPlan: "Nenhum plano se encaixa neste material.",
    addFootage: "Adicione material mais variado ou selecione mais clipes.",
    addFootagePhotos: "Adicione material mais variado ou fotos, ou selecione mais clipes.",
    retryUnchecked: { one: "Não foi possível verificar {count} vídeo; pressione “Criar” para tentar de novo.", many: "Não foi possível verificar {count} de vídeos; pressione “Criar” para tentar de novo.", other: "Não foi possível verificar {count} vídeos; pressione “Criar” para tentar de novo." },
    typeBigWord: "Digite a palavra grande do título para criar.",
    dropMusic: "Solte um arquivo de música ou escolha uma das faixas.",
    musicLengthUnread: "Não foi possível ler a duração da sua música. Escolha outro arquivo ou uma das faixas.",
    musicApprox: "Música adicionada; os cortes usam uma sincronia aproximada ({detail}).",
    musicUnreadable: "Não foi possível ler este arquivo de música ({detail}). Escolha outro arquivo ou uma das faixas.",
    beatFailed: "a detecção da batida falhou",
    previewFailed: "Não foi possível reproduzir a prévia: {detail}.",
    previewNotCut: "não foi possível recortar a prévia",
    noAudio: "nenhum áudio foi retornado",
    draftNoId: "O Draft “{name}” pode ter sido salvo, mas o Selects não informou o ID dele. Abra-o na lista de Drafts ou crie de novo.",
    draftEmpty: "O Draft “{name}” não tem clipes. Crie de novo.",
    finishFailed: "O Draft foi criado, mas o título, o look e o som dos clipes ainda não foram aplicados: {detail}. Pressione “Concluir título e look” para tentar de novo.",
    openFailed: "O Draft está pronto, mas não pôde ser aberto: {detail}. Use o link abaixo ou abra-o pela lista de Drafts.",
    draftCreated: "Draft criado. Selecione o título para editar as palavras, as cores, o tamanho ou a posição; um clipe para ajustar o enquadramento, a suavidade, o movimento ou o volume; e a música para mudar o volume. Criar de novo gera um novo Draft e não mantém as edições do Inspetor.",
    draftCreatedAdding: "Draft criado; adicionando título e look…",
    draftNotFinished: "Draft criado, mas o título, o look e o som dos clipes ainda não foram aplicados.",
    openDraft: "Abrir o novo Draft",
    copyLink: "Copiar o link do novo Draft",
    shortened: { one: "Seu material dá para {fitted} de {count} plano, então este vídeo tem cerca de {seconds} s. Adicione mais clipes ou fotos para a duração completa.", many: "Seu material dá para {fitted} de {count} de planos, então este vídeo tem cerca de {seconds} s. Adicione mais clipes ou fotos para a duração completa.", other: "Seu material dá para {fitted} de {count} planos, então este vídeo tem cerca de {seconds} s. Adicione mais clipes ou fotos para a duração completa." },
    note: "Observação: {detail}.",
    unchecked: { one: "Não foi possível verificar {count} vídeo; ele foi ignorado. Crie de novo para tentar outra vez.", many: "Não foi possível verificar {count} de vídeos; eles foram ignorados. Crie de novo para tentar outra vez.", other: "Não foi possível verificar {count} vídeos; eles foram ignorados. Crie de novo para tentar outra vez." },
    createsDraft: "Cria um novo Draft 16:9",
    finishTitle: "Concluir título e look",
    anotherVersion: "Criar outra versão",
    build: "Criar",
    building: "Criando",
    "param.mainColor": "Cor principal",
    "param.secondColor": "Cor secundária",
    "param.shadow": "Sombra",
    "param.size": "Tamanho (%)",
    "param.x": "Posição horizontal (%)",
    "param.y": "Posição vertical (%)",
    "param.sparkles": "Brilhos",
    "param.stars": "Estrelas",
    "param.motion": "Movimento",
    "param.motionStrength": "Intensidade do movimento",
    "param.punch": "Punch",
    "param.softness": "Suavidade",
    "motion.push-in": "Aproximar",
    "motion.pull-out": "Afastar",
    "motion.drift-left": "Deslizar para a esquerda",
    "motion.drift-right": "Deslizar para a direita",
    "motion.drift-up": "Deslizar para cima",
    "motion.drift-down": "Deslizar para baixo",
    "motion.tilt": "Inclinar",
    "motion.push-drift": "Aproximar e deslizar",
  },
  tr: {
    openProject: "Mini Vlog oluşturmak için bir proje açın.",
    startFailed: "Mini Vlog başlatılamadı: {detail}. Sorun sürerse eklentiyi yeniden yükleyin.",
    foldersNotFound: "eklenti klasörleri bulunamadı",
    adapterNeeded: "Bu Selects sürümü güncel bir {name} bağdaştırıcısı gerektiriyor.",
    stepFailed: "Selects bu adımı tamamlayamadı.",
    busy: "Selects meşgul ve zamanında yanıt vermedi. Biraz bekleyip “Yenile”ye basın. Bu tekrarlanırsa Selects'i yeniden başlatın.",
    invFailed: "Bu projenin klipleri henüz okunamadı. “Yenile”ye basın.",
    invPartial: "Kliplerin hepsi henüz okunamadı. “Yenile”ye basın.",
    sizesLoading: "Klip boyutları hâlâ yükleniyor…",
    refreshFailed: "Klip listesi yenilenemedi: {detail}",
    details: "Ayrıntılar: {detail}",
    refresh: "Yenile",
    refreshing: "Yenileniyor",
    checkingClipsNow: "Klipler kontrol ediliyor…",
    checkingClips: "Klipler kontrol ediliyor",
    listening: "Ritim aranıyor",
    working: "Çalışıyor",
    stillReading: "Bu projenin klipleri hâlâ okunuyor… Bu otomatik olarak güncellenir.",
    noFootage: "Bu projede henüz analiz edilmiş video veya fotoğraf yok. Video klipleri ekleyip analiz edin ya da fotoğraf ekleyin; burası otomatik olarak güncellenir.",
    turnOnPhotos: "Bu projenin fotoğraflarından oluşturmak için “Gelişmiş” bölümünde “Fotoğrafları kullan” seçeneğini açın.",
    noClipsSelected: "Klip seçilmedi. “Gelişmiş” bölümünden klip seçin.",
    gap: " ",
    ready: "Hazır: {summary}",
    clips: { one: "{count} klip", other: "{count} klip" },
    clipsSelected: { one: "{count} klipten {selected} tanesi seçili", other: "{count} klipten {selected} tanesi seçili" },
    photos: { one: "{count} fotoğraf", other: "{count} fotoğraf" },
    photosSelected: { one: "{count} fotoğraftan {selected} tanesi seçili", other: "{count} fotoğraftan {selected} tanesi seçili" },
    aboutSeconds: "yaklaşık {seconds} sn",
    notAnalysed: { one: "{count} klip henüz analiz edilmedi", other: "{count} klip henüz analiz edilmedi" },
    analysing: { one: "{count} klip analiz ediliyor. Bitince bu otomatik olarak güncellenir.", other: "{count} klip analiz ediliyor. Bitince bu otomatik olarak güncellenir." },
    notAnalysedAnalyse: { one: "{count} klip henüz analiz edilmedi. Burada kullanmak için Selects'te analiz edin.", other: "{count} klip henüz analiz edilmedi. Burada kullanmak için Selects'te analiz edin." },
    notAnalysedMaybe: { one: "{count} klip henüz analiz edilmedi. Selects analiz ediyorsa bu otomatik olarak güncellenir.", other: "{count} klip henüz analiz edilmedi. Selects analiz ediyorsa bu otomatik olarak güncellenir." },
    analysisFailed: { one: "{count} klip analiz edilemedi.", other: "{count} klip analiz edilemedi." },
    noteAnalysing: { one: "{count} klip analiz ediliyor", other: "{count} klip analiz ediliyor" },
    noteFailed: { one: "{count} klip analiz edilemedi", other: "{count} klip analiz edilemedi" },
    title: "Başlık",
    titleStyle: "Başlık stili",
    titlePreview: "Başlık önizlemesi",
    previewUnavailable: "Önizleme kullanılamıyor; başlık yine de Draft'a eklenir.",
    loading: "Yükleniyor…",
    "preset.mini-vlog": "Mini vlog",
    "preset.day-in-my-life": "Hayatımdan bir gün",
    "preset.small-glimpse": "Küçük bir an",
    "field.mini-vlog.big": "Büyük kelime",
    "field.mini-vlog.small": "Küçük kelime",
    "field.day-in-my-life.year": "Yıl",
    "field.day-in-my-life.big": "Büyük kelimeler",
    "field.day-in-my-life.tag": "Kısa satır",
    "field.small-glimpse.top": "Üst satır",
    "field.small-glimpse.big": "Büyük kelime",
    "field.small-glimpse.bottom": "Alt satır",
    fieldCount: "{label} ({used}/{max})",
    music: "Müzik",
    track: "Parça",
    alternatives: "Alternatifler",
    ownMusic: "Kendi müziğiniz",
    noMusic: "Müzik yok",
    bpm: "{bpm} BPM",
    installTools: "Müziği önizlemek veya kendi parçanızı kullanmak için ffmpeg ve Node.js 18+ yükleyin.",
    sectionHint: "Müzik bölümü — seçmek için sürükleyin",
    sectionLabel: "Müzik bölümü",
    musicTooShort: "Bu parça bu uzunluk için çok kısa",
    startsAt: "{seconds} sn'de başlar",
    stopPreview: "Önizlemeyi durdur",
    cancelPreview: "Önizlemeyi iptal et",
    previewSection: "Bu bölümü önizle",
    readingMusic: "Müzik okunuyor…",
    musicLengthUnknown: "Bu müziğin uzunluğu bilinmiyor",
    startAtHook: "Nakarattan başla",
    beatFound: "Ritim bulundu: {bpm} BPM. Kesmeler ritmi izler.",
    faintTempo: "Tempo bulundu ({bpm} BPM) ama ritim zayıf, bu yüzden kesmeler yaklaşık olarak {bpm} BPM'lik bir ızgarayı izler.",
    outsideTempo: "Temposu ({bpm} BPM) 70–160 BPM aralığının dışında, bu yüzden kesmeler yaklaşık zamanlama kullanır.",
    noBeat: "Düzenli bir ritim bulunamadı, bu yüzden kesmeler yaklaşık zamanlama kullanır.",
    length: "Uzunluk",
    "length.short": "Kısa",
    "length.standard": "Standart",
    "length.long": "Uzun",
    pace: "Kurgu hızı",
    "pace.quick": "Hızlı",
    "pace.relaxed": "Sakin",
    "pace.groove": "Groove",
    fitPartial: { one: "{length}: {count} çekimden {fitted} tanesi bu parçaya sığıyor ({seconds} sn)", other: "{length}: {count} çekimden {fitted} tanesi bu parçaya sığıyor ({seconds} sn)" },
    fitFull: { one: "{length}: {count} çekim ({seconds} sn)", other: "{length}: {count} çekim ({seconds} sn)" },
    footageFits: { one: "Görüntüleriniz {count} çekimden {fitted} tanesine yetiyor ({seconds} sn)", other: "Görüntüleriniz {count} çekimden {fitted} tanesine yetiyor ({seconds} sn)" },
    seconds: "{seconds} sn",
    grooveTiming: "{beat} sn'lik vuruşta Groove: {hold}, {beat} ve {eighth} sn'lik çekimler",
    quickTwoBeats: "{bpm} BPM'de “Hızlı” çekim başına 2 vuruş kullanır.",
    relaxedOneBeat: "{bpm} BPM'de “Sakin” çekim başına 1 vuruş kullanır.",
    grooveOneBeat: "{bpm} BPM'de “Groove” cümleleri 1 vuruşla açar.",
    grooveTwoBeats: "{bpm} BPM'de “Groove” çekim başına 2 vuruş kullanır.",
    noMusicTiming: "Müzik yok: çekimler yaklaşık zamanlama kullanır ({timing}).",
    faintTempoTiming: "Tempo bulundu ({bpm} BPM) ama ritim zayıf: kesmeler yaklaşık olarak {bpm} BPM'lik bir ızgarayı izler ({timing}).",
    outsideTempoTiming: "Tempo 70–160 BPM aralığının dışında ({bpm} BPM): çekimler yaklaşık zamanlama kullanır ({timing}).",
    noBeatTiming: "Düzenli bir ritim bulunamadı: çekimler yaklaşık zamanlama kullanır ({timing}).",
    advanced: "Gelişmiş",
    clipSound: "Klip sesi",
    "sound.off": "Kapalı",
    "sound.ambient": "Ortam",
    "sound.full": "Tam",
    softLook: "Yumuşak görünüm",
    beatPunch: "Ritim vuruşu",
    usePhotos: "Fotoğrafları kullan",
    usePhotosOff: "“Fotoğrafları kullan” kapalı",
    silentVideo: "Sessiz video: müzik yok ve klip sesi “Kapalı”.",
    chooseClips: "Klip seç",
    chooseClipsCount: "Klip seç ({selected}/{total})",
    all: "Tümü",
    none: "Hiçbiri",
    photo: "Fotoğraf",
    "shape.tall": "Dikey",
    "shape.wide": "Yatay",
    "shape.square": "Kare",
    "step.shots": "Çekimler seçiliyor",
    "step.music": "Müzik hazırlanıyor",
    "step.draft": "Draft oluşturuluyor",
    "step.look": "Başlık ve görünüm ekleniyor",
    "step.open": "Draft açılıyor",
    progress: "Adım {step}/{total} · {name} · %{percent}",
    progressDetail: "Adım {step}/{total} · {name} ({detail}) · %{percent}",
    videosChecked: { one: "{done}/{count} video kontrol edildi", other: "{done}/{count} video kontrol edildi" },
    photosOnly: "yalnızca fotoğraflar",
    stoppedAt: "{step}/{total}. adımda durdu, {name}: {detail}",
    "fail.one-resource": "En az 2 klip veya fotoğraf ekleyin.",
    "fail.too-few": "Görüntüleriniz 4 çekimden azına yetiyor.",
    "fail.music-too-short": "Bu parça, bu bölümden itibaren 4 çekim için çok kısa.",
    noPlan: "Bu görüntülere uyan bir plan yok.",
    addFootage: "Daha çeşitli görüntüler ekleyin veya daha fazla klip seçin.",
    addFootagePhotos: "Daha çeşitli görüntüler veya fotoğraflar ekleyin ya da daha fazla klip seçin.",
    retryUnchecked: { one: "{count} video kontrol edilemedi; yeniden denemek için “Oluştur”a basın.", other: "{count} video kontrol edilemedi; yeniden denemek için “Oluştur”a basın." },
    typeBigWord: "Oluşturmak için başlığın büyük kelimesini yazın.",
    dropMusic: "Bir müzik dosyası bırakın veya hazır parçalardan birini seçin.",
    musicLengthUnread: "Müziğinizin uzunluğu okunamadı. Başka bir dosya veya hazır parçalardan birini seçin.",
    musicApprox: "Müzik eklendi; kesmeler yaklaşık zamanlama kullanır ({detail}).",
    musicUnreadable: "Bu müzik dosyası okunamadı ({detail}). Başka bir dosya veya hazır parçalardan birini seçin.",
    beatFailed: "ritim algılama başarısız oldu",
    previewFailed: "Önizleme oynatılamadı: {detail}.",
    previewNotCut: "önizleme kesilemedi",
    noAudio: "ses geri gelmedi",
    draftNoId: "“{name}” Draft'ı kaydedilmiş olabilir ama Selects kimliğini bildirmedi. Draft listesinden açın veya yeniden oluşturun.",
    draftEmpty: "“{name}” Draft'ında hiç klip yok. Yeniden oluşturun.",
    finishFailed: "Draft oluşturuldu ama başlık, görünüm ve klip sesi henüz uygulanmadı: {detail}. Yeniden denemek için “Başlığı ve görünümü tamamla”ya basın.",
    openFailed: "Draft hazır ama açılamadı: {detail}. Aşağıdaki bağlantıyı kullanın veya Draft listesinden açın.",
    draftCreated: "Draft oluşturuldu. Kelimelerini, renklerini, boyutunu veya konumunu düzenlemek için başlığı; kırpmasını, yumuşaklığını, hareketini veya ses düzeyini ayarlamak için bir klibi; ses seviyesini değiştirmek için müziği seçin. Yeniden oluşturmak yeni bir Draft oluşturur ve Denetçi düzenlemelerini korumaz.",
    draftCreatedAdding: "Draft oluşturuldu; başlık ve görünüm ekleniyor…",
    draftNotFinished: "Draft oluşturuldu ama başlık, görünüm ve klip sesi henüz uygulanmadı.",
    openDraft: "Yeni Draft'ı aç",
    copyLink: "Yeni Draft'ın bağlantısını kopyala",
    shortened: { one: "Görüntüleriniz {count} çekimden {fitted} tanesine yetiyor, bu yüzden bu video yaklaşık {seconds} sn. Tam uzunluk için daha fazla klip veya fotoğraf ekleyin.", other: "Görüntüleriniz {count} çekimden {fitted} tanesine yetiyor, bu yüzden bu video yaklaşık {seconds} sn. Tam uzunluk için daha fazla klip veya fotoğraf ekleyin." },
    note: "Not: {detail}.",
    unchecked: { one: "{count} video kontrol edilemedi ve atlandı. Yeniden denemek için tekrar oluşturun.", other: "{count} video kontrol edilemedi ve atlandı. Yeniden denemek için tekrar oluşturun." },
    createsDraft: "Yeni bir 16:9 Draft oluşturur",
    finishTitle: "Başlığı ve görünümü tamamla",
    anotherVersion: "Başka bir sürüm oluştur",
    build: "Oluştur",
    building: "Oluşturuluyor",
    "param.mainColor": "Ana renk",
    "param.secondColor": "İkinci renk",
    "param.shadow": "Gölge",
    "param.size": "Boyut (%)",
    "param.x": "Yatay konum (%)",
    "param.y": "Dikey konum (%)",
    "param.sparkles": "Parıltılar",
    "param.stars": "Yıldızlar",
    "param.motion": "Hareket",
    "param.motionStrength": "Hareket gücü",
    "param.punch": "Vuruş",
    "param.softness": "Yumuşaklık",
    "motion.push-in": "Yakınlaş",
    "motion.pull-out": "Uzaklaş",
    "motion.drift-left": "Sola kay",
    "motion.drift-right": "Sağa kay",
    "motion.drift-up": "Yukarı kay",
    "motion.drift-down": "Aşağı kay",
    "motion.tilt": "Eğ",
    "motion.push-drift": "Yakınlaş ve kay",
  },
  zh: {
    openProject: "请先打开一个项目，再制作 Mini Vlog。",
    startFailed: "Mini Vlog 无法启动：{detail}。如果问题持续，请重新安装插件。",
    foldersNotFound: "找不到插件文件夹",
    adapterNeeded: "此版本的 Selects 需要更新的 {name} 适配器。",
    stepFailed: "Selects 无法完成这一步。",
    busy: "Selects 正忙，未能及时响应。请稍等片刻再点击“刷新”。如果反复出现，请重启 Selects。",
    invFailed: "暂时无法读取此项目的片段。请点击“刷新”。",
    invPartial: "暂时无法读取全部片段。请点击“刷新”。",
    sizesLoading: "仍在加载片段尺寸…",
    refreshFailed: "无法刷新片段列表：{detail}",
    details: "详情：{detail}",
    refresh: "刷新",
    refreshing: "正在刷新",
    checkingClipsNow: "正在检查片段…",
    checkingClips: "正在检查片段",
    listening: "正在识别节拍",
    working: "处理中",
    stillReading: "仍在读取此项目的片段… 完成后会自动更新。",
    noFootage: "此项目中还没有已分析的视频或照片。请添加视频片段并进行分析，或添加照片；这里会自动更新。",
    turnOnPhotos: "请在“高级”中开启“使用照片”，即可用此项目的照片制作。",
    noClipsSelected: "未选择片段。请在“高级”中选择片段。",
    gap: "",
    ready: "已就绪：{summary}",
    clips: { other: "{count} 个片段" },
    clipsSelected: { other: "已选 {selected}/{count} 个片段" },
    photos: { other: "{count} 张照片" },
    photosSelected: { other: "已选 {selected}/{count} 张照片" },
    aboutSeconds: "约 {seconds} 秒",
    notAnalysed: { other: "{count} 个片段尚未分析" },
    analysing: { other: "正在分析 {count} 个片段。分析完成后会自动更新。" },
    notAnalysedAnalyse: { other: "有 {count} 个片段尚未分析。请在 Selects 中分析后再在这里使用。" },
    notAnalysedMaybe: { other: "有 {count} 个片段尚未分析。如果 Selects 正在分析，这里会自动更新。" },
    analysisFailed: { other: "有 {count} 个片段无法分析。" },
    noteAnalysing: { other: "{count} 个片段分析中" },
    noteFailed: { other: "{count} 个片段无法分析" },
    title: "标题",
    titleStyle: "标题样式",
    titlePreview: "标题预览",
    previewUnavailable: "无法显示预览；标题仍会添加到 Draft。",
    loading: "加载中…",
    "preset.mini-vlog": "迷你 Vlog",
    "preset.day-in-my-life": "我的一天",
    "preset.small-glimpse": "小小一瞥",
    "field.mini-vlog.big": "大字",
    "field.mini-vlog.small": "小字",
    "field.day-in-my-life.year": "年份",
    "field.day-in-my-life.big": "大字",
    "field.day-in-my-life.tag": "标语",
    "field.small-glimpse.top": "上行文字",
    "field.small-glimpse.big": "大字",
    "field.small-glimpse.bottom": "下行文字",
    fieldCount: "{label}（{used}/{max}）",
    music: "音乐",
    track: "曲目",
    alternatives: "其他曲目",
    ownMusic: "自己的音乐",
    noMusic: "无音乐",
    bpm: "{bpm} BPM",
    installTools: "请安装 ffmpeg 和 Node.js 18+，才能试听音乐或使用自己的曲目。",
    sectionHint: "音乐片段 — 拖动选择",
    sectionLabel: "音乐片段",
    musicTooShort: "此曲目对这个时长来说太短",
    startsAt: "从 {seconds} 秒开始",
    stopPreview: "停止试听",
    cancelPreview: "取消试听",
    previewSection: "试听这一段",
    readingMusic: "正在读取音乐…",
    musicLengthUnknown: "无法得知这段音乐的时长",
    startAtHook: "从高潮开始",
    beatFound: "已找到节拍：{bpm} BPM。剪切点跟随节拍。",
    faintTempo: "已找到速度（{bpm} BPM），但节拍较弱，因此剪切点大致跟随 {bpm} BPM 的网格。",
    outsideTempo: "其速度（{bpm} BPM）超出 70–160 BPM 范围，因此剪切点使用大致的时间。",
    noBeat: "未找到稳定的节拍，因此剪切点使用大致的时间。",
    length: "时长",
    "length.short": "短",
    "length.standard": "标准",
    "length.long": "长",
    pace: "剪辑节奏",
    "pace.quick": "快速",
    "pace.relaxed": "舒缓",
    "pace.groove": "律动",
    fitPartial: { other: "{length}：此曲目可容纳 {count} 个镜头中的 {fitted} 个（{seconds} 秒）" },
    fitFull: { other: "{length}：{count} 个镜头（{seconds} 秒）" },
    footageFits: { other: "你的素材够用 {count} 个镜头中的 {fitted} 个（{seconds} 秒）" },
    seconds: "{seconds} 秒",
    grooveTiming: "以 {beat} 秒的节拍律动：{hold}、{beat} 和 {eighth} 秒的镜头",
    quickTwoBeats: "在 {bpm} BPM 下，“快速”每个镜头用 2 拍。",
    relaxedOneBeat: "在 {bpm} BPM 下，“舒缓”每个镜头用 1 拍。",
    grooveOneBeat: "在 {bpm} BPM 下，“律动”以 1 拍开始每个乐句。",
    grooveTwoBeats: "在 {bpm} BPM 下，“律动”每个镜头用 2 拍。",
    noMusicTiming: "无音乐：镜头使用大致的时间（{timing}）。",
    faintTempoTiming: "已找到速度（{bpm} BPM），但节拍较弱：剪切点大致跟随 {bpm} BPM 的网格（{timing}）。",
    outsideTempoTiming: "速度超出 70–160 BPM 范围（{bpm} BPM）：镜头使用大致的时间（{timing}）。",
    noBeatTiming: "未找到稳定的节拍：镜头使用大致的时间（{timing}）。",
    advanced: "高级",
    clipSound: "片段原声",
    "sound.off": "关闭",
    "sound.ambient": "环境音",
    "sound.full": "原音量",
    softLook: "柔和色调",
    beatPunch: "节拍冲击",
    usePhotos: "使用照片",
    usePhotosOff: "“使用照片”已关闭",
    silentVideo: "无声视频：没有音乐，且片段原声为“关闭”。",
    chooseClips: "选择片段",
    chooseClipsCount: "选择片段（{selected}/{total}）",
    all: "全选",
    none: "全不选",
    photo: "照片",
    "shape.tall": "竖版",
    "shape.wide": "横版",
    "shape.square": "方形",
    "step.shots": "挑选镜头",
    "step.music": "准备音乐",
    "step.draft": "创建 Draft",
    "step.look": "添加标题和色调",
    "step.open": "打开 Draft",
    progress: "第 {step}/{total} 步 · {name} · {percent}%",
    progressDetail: "第 {step}/{total} 步 · {name}（{detail}）· {percent}%",
    videosChecked: { other: "已检查 {done}/{count} 个视频" },
    photosOnly: "仅照片",
    stoppedAt: "在第 {step}/{total} 步（{name}）停止：{detail}",
    "fail.one-resource": "请至少添加 2 个片段或照片。",
    "fail.too-few": "你的素材不够 4 个镜头。",
    "fail.music-too-short": "从这一段开始，此曲目不够 4 个镜头。",
    noPlan: "没有适合这些素材的方案。",
    addFootage: "请添加更多样的素材，或选择更多片段。",
    addFootagePhotos: "请添加更多样的素材或照片，或选择更多片段。",
    retryUnchecked: { other: "有 {count} 个视频无法检查；点击“生成”重试。" },
    typeBigWord: "请输入标题的大字后再生成。",
    dropMusic: "请拖入一个音乐文件，或选择内置曲目。",
    musicLengthUnread: "无法读取你的音乐时长。请选择其他文件或内置曲目。",
    musicApprox: "已添加音乐；剪切点使用大致的时间（{detail}）。",
    musicUnreadable: "无法读取这个音乐文件（{detail}）。请选择其他文件或内置曲目。",
    beatFailed: "节拍识别失败",
    previewFailed: "无法播放试听：{detail}。",
    previewNotCut: "无法截取试听片段",
    noAudio: "没有返回音频",
    draftNoId: "Draft“{name}”可能已保存，但 Selects 没有返回它的 ID。请从 Draft 列表中打开，或重新生成。",
    draftEmpty: "Draft“{name}”中没有片段。请重新生成。",
    finishFailed: "Draft 已创建，但标题、色调和片段原声尚未应用：{detail}。点击“完成标题和色调”重试。",
    openFailed: "Draft 已就绪，但无法打开：{detail}。请使用下方链接，或从 Draft 列表中打开。",
    draftCreated: "Draft 已创建。选中标题可编辑文字、颜色、大小或位置；选中片段可调整裁切、柔和度、运动或音量；选中音乐可调整其音量。重新生成会创建新的 Draft，不会保留在检查器中的编辑。",
    draftCreatedAdding: "Draft 已创建；正在添加标题和色调…",
    draftNotFinished: "Draft 已创建，但标题、色调和片段原声尚未应用。",
    openDraft: "打开新的 Draft",
    copyLink: "复制新 Draft 的链接",
    shortened: { other: "你的素材只够 {count} 个镜头中的 {fitted} 个，所以这个视频约 {seconds} 秒。添加更多片段或照片即可达到完整时长。" },
    note: "提示：{detail}。",
    unchecked: { other: "有 {count} 个视频无法检查，已跳过。重新生成即可重试。" },
    createsDraft: "创建一个新的 16:9 Draft",
    finishTitle: "完成标题和色调",
    anotherVersion: "再生成一个版本",
    build: "生成",
    building: "正在生成",
    "param.mainColor": "主色",
    "param.secondColor": "辅色",
    "param.shadow": "阴影",
    "param.size": "大小 (%)",
    "param.x": "水平位置 (%)",
    "param.y": "垂直位置 (%)",
    "param.sparkles": "闪光",
    "param.stars": "星星",
    "param.motion": "运动",
    "param.motionStrength": "运动强度",
    "param.punch": "冲击",
    "param.softness": "柔和度",
    "motion.push-in": "推近",
    "motion.pull-out": "拉远",
    "motion.drift-left": "向左平移",
    "motion.drift-right": "向右平移",
    "motion.drift-up": "向上平移",
    "motion.drift-down": "向下平移",
    "motion.tilt": "倾斜",
    "motion.push-drift": "推近并平移",
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
// An error whose text follows the UI language; `message` keeps the English text. SDK and script details stay English.
function uiError(say: Say) { const e: any = new Error(say("en")); e.say = say; return e; }
function sayError(lang: Lang, e: any): string { return typeof e?.say === "function" ? e.say(lang) : String(e?.message || e); }
// A title field's text cut to its limit, counted like the counter next to it (fieldLen: Hangul counts 2).
function fieldClip(text: string, max: number) {
  let out = "", n = 0;
  for (const ch of text) { const w = fieldLen(ch); if (n + w > max) break; out += ch; n += w; }
  return out;
}

const PLUGIN_ID = "mini-vlog";
const PLUGIN_VERSION = "0.1.0-alpha.1";
const SKILLS_DIR = "$SELECTS_USER_SKILLS_ROOT/" + PLUGIN_ID;
const DATA_DIR = "$HOME/.selects/plugin-data/" + PLUGIN_ID;
// The Draft's canvas. assemble.js sets the same size; the preview and the photo cover scale use it.
const MV_W = 1920, MV_H = 1080;
// One scene-search query per shot role (planner MV_ROLES). With Beat punch on, the search also runs the motion query
// (MV_MOTION_QUERY, mvSearchQueries in the mv-hook block).
const MV_QUERIES = {
  drink: "a coffee, matcha or drink in a cup held in hand or on a table",
  street: "a sunny city street with buildings and blue sky",
  food: "a plate of food, dessert or pastry on a table, seen from above",
  park: "green grass or trees in a park on a sunny day",
  book: "an open book or magazine on a lap or table",
  transit: "inside a subway or train, or a train passing by",
  flowers: "flowers, a bouquet or a flower shop close up",
  cafe: "a cozy cafe interior or a window seat with daylight",
};
// Clips per scene-search call: eight queries each (nine with Beat punch), so three clips (24 or 27 searches) stay inside
// run_script's 30 s deadline (search.js stops starting new searches after 22 s and reports the rest as failed, retried
// by the next Build).
const SEARCH_BATCH = 3;
// Ambient clip sound: the clips' own sound sits this far under the music, which stays at 0 dB.
const AMBIENT_DB = -18;
// Default track until the new bedroom-pop cue ships; the preferred cue replaces it once the manifest has it.
const DEFAULT_CUE = "weekend-indie-pop";
const PREFERRED_CUE = "bedroom-pop-108";
// The title preset selected when the panel opens (A small glimpse); Mini vlog and A day in my life stay selectable.
const DEFAULT_PRESET = "small-glimpse";
const DEFAULT_LENGTH = "standard";
const DEFAULT_PACE = "quick";
// Hook B defaults after the A/B (spec 15.4): Beat punch (with the motion query and bonus) and Start at the hook are on.
const DEFAULT_PUNCH = true;
const DEFAULT_HOOK = true;
// Soft look strength, and photo motion at half of CWV's strength (mild).
const SOFT_STRENGTH = 0.35;
const MOTION_STRENGTH = 0.5;
// Beat punch (spec 15.2 b/c): the Adjust "Punch" default (1 = a 1.06 punch) and the push-in amount for a clip without
// a punch (1 = 1.03).
const PUNCH_STRENGTH = 1;
const PUNCH_PUSH = 1;
// The title's Adjust defaults; the panel preview draws with the same values.
const TITLE_LOOK = { shadow: 0.35, size: 100, x: 49, y: 52, sparkles: true };
// The Motion choices of a photo clip in the Inspector. The labels are English for dev/driveAdapter.mjs; a Build writes
// STRINGS `motion.<value>` in the UI language.
const MOTION_OPTIONS = [
  { label: "Push in", value: "push-in" }, { label: "Pull out", value: "pull-out" },
  { label: "Drift left", value: "drift-left" }, { label: "Drift right", value: "drift-right" },
  { label: "Drift up", value: "drift-up" }, { label: "Drift down", value: "drift-down" },
  { label: "Tilt", value: "tilt" }, { label: "Push and drift", value: "push-drift" },
];
// Music without onsets (No music, or a track that could not be analysed): the cuts stay on the grid.
const NO_ONSETS: any[] = [];
// A busy app (renderer near 100 % CPU) can take most of run_script's 30 s deadline before a script even starts.
// Read-only calls ask for READ_TIMEOUT_SECONDS (hosts that do not take the option keep their own deadline) and retry a
// host-busy or deadline failure after each BUSY_BACKOFF_MS pause, one attempt at a time. Commit calls do neither: a
// commit is never resent (spec 14.6).
const READ_TIMEOUT_SECONDS = 90;
const BUSY_BACKOFF_MS = [5000, 15000];
// Photo measuring inside the inventory call; a retry after a busy failure skips it (assemble measures unsized photos).
const INVENTORY_MEASURE_MS = 4000;
// Its message is STRINGS `busy`.
// A Project still loading (right after an app restart) can fail the first inventory read outright. That first read
// is tried once more after INVENTORY_RETRY_MS (read-only; a busy failure already waited through its backoff).
const INVENTORY_RETRY_MS = 2000;
// The readiness line then says STRINGS `invFailed`.
// A partial inventory (`incomplete`: some clip sizes unknown) holds Build, since a clip without a size is placed
// uncropped. It is re-read with the 10 s poll, at most INCOMPLETE_POLL_MAX times in a row (about a minute); then
// polling stops until Refresh starts the cycle again.
const INCOMPLETE_POLL_MAX = 6;
// Their messages are STRINGS `sizesLoading` (next to Build) and `invPartial` (the readiness line).
// A lost assemble reply is recovered by reading at most this many of the Project's most recent Drafts.
const DRAFT_LOOKUP_MAX = 50;

// mv-planner:start
// Mini Vlog planner. A plain script: panel.tsx embeds it verbatim and the tests load it in node:vm.
// One hard cut per shot on the music's beat grid: Quick = 1 beat per shot, Relaxed = 2 (with a tempo guard), Groove =
// a 4-bar phrase rhythm (2, 1, 1, ..., and the phrase's last beat split into two 8ths on a drum fill). Shot roles cycle
// through MV_ROLES; there is no title burst and no montage section (the title spans the whole video).
// Without a usable grid (tempo outside 70-160 bpm, own music not accepted, or No music) shots have a fixed length: the
// beat of an approximate tempo (mvApproxTempo) when own music has one, else MV_FALLBACK_SHOT.
const MV_LENGTHS = { short: 12, standard: 24, long: 36 };
// Fewest shots a build needs; every length is a multiple of it, so the video is whole bars from its first beat.
const MV_MIN_SHOTS = 4;
const MV_TEMPO_MIN = 70;
const MV_TEMPO_MAX = 160;
// Shot length in seconds when there is no grid.
const MV_FALLBACK_SHOT = { quick: 0.55, relaxed: 1.10 };
// Slot roles, in order (a product cycle alternating close and wide shots).
const MV_ROLES = ['drink', 'street', 'food', 'park', 'book', 'transit', 'flowers', 'cafe'];
// Which other candidate roles may fill a slot role, best first (the slot's own role always ranks first).
const MV_ROLE_FALLBACK = {
  drink: ['cafe', 'food'],
  cafe: ['drink', 'book', 'food'],
  food: ['drink', 'cafe'],
  book: ['cafe'],
  street: ['transit', 'park'],
  transit: ['street'],
  park: ['flowers', 'street'],
  flowers: ['park'],
};
// Scene-search hits collapse onto a few distinct times per clip, so every searched source also gets evenly spaced
// 'filler' candidates. They score below any real hit and are only used by the last tier, after photos.
const MV_FILLER_STEP = 0.5;
const MV_FILLER_EDGE = 0.25;
const MV_FILLER_SCORE = -2;
// At most this many filler windows per source (a 24 s source has 48). A longer source gets 48 windows spread evenly over
// the same 0.5 s grid, first and last kept, so an hour-long clip does not flood the pool (and the panel's thread).
const MV_FILLER_MAX = 48;
// A video window ends at least this far before the end of its source. The plan's frames are at 30 fps; at the Draft's
// real rate (and music offset) a shot can be up to 1/30 + 1/fps s longer (about 0.075 s at 23.976), and Selects caps a
// source at its whole frames (up to one more frame shorter than its duration), so assemble.js may slide a window this
// far back to keep it inside its source.
const MV_SOURCE_TAIL = 0.15;
// Photos (Image resources) have no scene search. Each one fills at most one slot of any length up to the 5 s an
// image source lasts. About MV_PHOTO_SHARE of the slots, evenly spread from a seeded offset, are photo slots where an
// unused photo comes first. Elsewhere photos rank after every real video hit and before fillers. Never more than
// MV_PHOTO_RUN_MAX photos play in a row (a hard rule) unless the pool has no video at all.
const MV_PHOTO_HOLD_MAX = 5;
const MV_PHOTO_RUN_MAX = 2;
const MV_PHOTO_SHARE = 1 / 3;
// Groove (spec 15.1). A phrase is 4 bars (16 beats) from the section start; every cut sits on the beat or 8th grid.
// - Holds: the first shot of every phrase holds 2 beats; so does the bar-3 downbeat of a final phrase the video ends
//   in its second half (mvGrooveHolds). Every other shot is 1 beat.
// - Bursts: a split candidate is the last beat of each half-phrase (beat 7 = end of bar 2, beat 15 = phrase end) and
//   the video's final beat (a phrase end even mid-phrase) (mvGrooveCandidates); a split beat plays two 8th shots. At
//   most one burst per half-phrase (2 bars).
// - Which candidates split (mvFillBeats), detection first per class (phrase ends incl. the final beat / bar-2
//   accents): those whose onset density (sum of onset strengths in the beat) reaches MV_GROOVE_FILL_RATIO x the median
//   beat of the span; a class with none detected, or no onset data at all, splits all of its candidates (the bundled
//   cues carry a short drum fill at the end of every 4 bars).
// - 8th shots are video only. A span is whole bars and at least MV_GROOVE_MIN_BEATS (one bar: 2, 1, 1/2, 1/2 = 4
//   shots, MV_MIN_SHOTS). Without a grid the pattern runs
//   on MV_GROOVE_FALLBACK_BEAT-second beats (2 x 0.55, 0.55 ..., 2 x 0.275) with every candidate split.
// - Opener guard: when a 2-beat hold would last longer than MV_GROOVE_OPENER_MAX seconds (below 85.71 bpm) every hold
//   is 1 beat, so no shot outruns Relaxed's cap.
const MV_GROOVE_PHRASE_BEATS = 16;
const MV_GROOVE_FILL_RATIO = 1.5;
const MV_GROOVE_FALLBACK_BEAT = 0.55;
const MV_GROOVE_MIN_BEATS = 4;
const MV_GROOVE_OPENER_MAX = 1.40;
// An onset counts for the beat it sits in, from this many seconds (one frame at 30 fps) before the beat: manifest and
// detector onsets land a hair early (about 1 ms on the bundled cues). A fixed time, not a share of the beat, so a slow
// tempo does not pull an 8th-note pickup into the next beat.
const MV_GROOVE_ONSET_LEAD = 1 / 30;

// A beat grid is used only for a tempo in [MV_TEMPO_MIN, MV_TEMPO_MAX] whose detection was accepted (bundled cues
// always are).
function mvGridUsable(opts) {
  const bpm = opts && opts.bpm;
  return !!(opts && opts.accepted) && typeof bpm === 'number' && isFinite(bpm) && bpm >= MV_TEMPO_MIN && bpm <= MV_TEMPO_MAX;
}

// The approximate tempo fixed timing runs on, or null. beat-detect.cjs reports an own track's grid as 'approximate' when
// it is tight (median residual <= 10 ms) and holds across the track but too few beats carry an onset to accept it. Its
// tempo (opts.approxBpm), in [MV_TEMPO_MIN, MV_TEMPO_MAX] and only without a usable grid (opts.gridded), sets the fixed
// shot length (mvShotSeconds) and Groove's beat, so the cuts do not drift against the music. Everything else stays
// gridless: cuts snap only to bass onsets (mvSnapCuts lowConfidence), Groove splits every candidate, no beat punch.
function mvApproxTempo(opts) {
  const bpm = opts && opts.approxBpm;
  return !(opts && opts.gridded) && typeof bpm === 'number' && isFinite(bpm) && bpm >= MV_TEMPO_MIN && bpm <= MV_TEMPO_MAX ? bpm : null;
}

// Beats per shot for a pace. Quick is 1 beat, but 2 above 150 bpm so shots stay >= 0.40 s; Relaxed is 2 beats, but 1
// below 86 bpm so shots stay <= 1.40 s. `overridden` tells the panel the guard changed the choice. Groove returns
// { beats: 1 (its beat unit), groove: true, opener: the phrase opener's beats (mvGrooveOpener) }, overridden when the
// opener guard makes it 1 beat (below 85.71 bpm). Above 150 bpm its 8ths would be under 0.2 s, so it plays 2 beats per
// shot like Quick (no `groove` key).
function mvBeatsPerShot(pace, bpm) {
  if (pace === 'relaxed') return bpm < 86 ? { beats: 1, overridden: true } : { beats: 2, overridden: false };
  if (pace === 'groove') {
    if (bpm > 150) return { beats: 2, overridden: true };
    const opener = mvGrooveOpener(bpm);
    return { beats: 1, overridden: opener < 2, groove: true, opener };
  }
  return bpm > 150 ? { beats: 2, overridden: true } : { beats: 1, overridden: false };
}

// Seconds per shot: the beats on a grid, else on an approximate tempo (opts.approxBpm from mvApproxTempo, with
// beatsPerShot from mvBeatsPerShot at that tempo), else the fixed fallback for the pace (for Groove: seconds per beat
// unit).
function mvShotSeconds(opts) {
  if (opts.gridded) return opts.beatsPerShot * 60 / opts.bpm;
  if (opts.approxBpm > 0 && opts.beatsPerShot > 0) return opts.beatsPerShot * 60 / opts.approxBpm;
  if (opts.pace === 'groove') return MV_GROOVE_FALLBACK_BEAT;
  return opts.pace === 'relaxed' ? MV_FALLBACK_SHOT.relaxed : MV_FALLBACK_SHOT.quick;
}

// The largest multiple of MV_MIN_SHOTS (<= requested) whose shots fit between sectionStart and usableEnd, else 0.
// usableEnd is Infinity without music.
function mvFitShots(opts) {
  const start = typeof opts.sectionStart === 'number' && isFinite(opts.sectionStart) ? opts.sectionStart : 0;
  const end = opts.usableEnd == null ? Infinity : opts.usableEnd;
  for (let n = Math.floor(opts.requested / MV_MIN_SHOTS) * MV_MIN_SHOTS; n >= MV_MIN_SHOTS; n -= MV_MIN_SHOTS) {
    if (start + n * opts.shotSeconds <= end + 1e-6) return n;
  }
  return 0;
}

// Beats of a Groove phrase's opening shot: 2, or 1 when 2 beats would last longer than MV_GROOVE_OPENER_MAX. Without a
// grid (bpm not a number) the opener is 2 x MV_GROOVE_FALLBACK_BEAT = 1.10 s, so 2.
function mvGrooveOpener(bpm) {
  return bpm > 0 && 2 * 60 / bpm > MV_GROOVE_OPENER_MAX + 1e-9 ? 1 : 2;
}

// Beats of a span of `beats` (whole bars) that may split into two 8ths, ascending: the last beat of every half-phrase
// (beats 7 and 15 of each phrase: the end of bar 2 and the phrase end) inside the span, and the span's final beat (the
// video's end counts as a phrase end when it falls mid-phrase). Each half-phrase holds at most one of them, so there is
// at most one burst per 2 bars.
function mvGrooveCandidates(beats) {
  const half = MV_GROOVE_PHRASE_BEATS / 2, out = [];
  for (let b = half - 1; b < beats; b += half) out.push(b);
  if (beats > 0 && out[out.length - 1] !== beats - 1) out.push(beats - 1);
  return out;
}

// Beats where a Groove span has a 2-beat shot: every phrase start and, when the span ends inside a phrase's second
// half, that half-phrase's start (bar 3 downbeat), so a partial phrase keeps a long hold after its first half.
// None with a 1-beat opener (mvGrooveOpener).
function mvGrooveHolds(beats, opener) {
  if (opener === 1) return [];
  const half = MV_GROOVE_PHRASE_BEATS / 2, out = [];
  for (let p = 0; p < beats; p += MV_GROOVE_PHRASE_BEATS) {
    out.push(p);
    if (p + MV_GROOVE_PHRASE_BEATS > beats && beats - p > half) out.push(p + half);
  }
  return out;
}

// Groove slot lengths in beats for a span of `beats` (whole bars): 2-beat holds at mvGrooveHolds, each beat in
// `splits` (beat indices, from mvGrooveCandidates) as two 8ths, every other beat 1. opener (default 2) as in
// mvGrooveHolds. The lengths sum to `beats`.
function mvGrooveBeats(opts) {
  const beats = opts.beats, list = [];
  const holds = mvGrooveHolds(beats, opts.opener === 1 ? 1 : 2), splits = opts.splits || [];
  for (let b = 0; b < beats;) {
    if (holds.indexOf(b) >= 0 && beats - b >= 2) { list.push(2); b += 2; }
    else if (splits.indexOf(b) >= 0) { list.push(0.5, 0.5); b += 1; }
    else { list.push(1); b += 1; }
  }
  return list;
}

// Shots in a span of `beats` with the pattern (every candidate split) and the given opener (default 2).
function mvGrooveCount(beats, opener) {
  return mvGrooveBeats({ beats, splits: mvGrooveCandidates(beats), opener }).length;
}

// The nominal Groove span for a requested number of shots: the whole-bar span (>= MV_GROOVE_MIN_BEATS) whose pattern
// shot count is nearest the request, the longer one on a tie (2-beat opener: 12 -> 12 beats / 12 shots, 24 -> 24 /
// 25, 36 -> 36 / 38). It depends on the length and the opener only, never on the music section, so the panel can size
// the section before fills are known; detected fills then change the shot count inside the same span (the plan
// reports the actual shots). opener: mvGrooveOpener(bpm), default 2.
function mvGrooveSpan(requested, opener) {
  const want = Math.max(MV_MIN_SHOTS, Math.floor(requested) || 0);
  let beats = MV_GROOVE_MIN_BEATS;
  while (mvGrooveCount(beats, opener) < want) beats += 4;
  const lower = beats - 4;
  if (lower >= MV_GROOVE_MIN_BEATS && want - mvGrooveCount(lower, opener) < mvGrooveCount(beats, opener) - want) beats = lower;
  return { beats, shots: mvGrooveCount(beats, opener) };
}

// Music capacity for Groove (mvFitShots on beat spans): the nominal span, shortened by whole bars until
// sectionStart + beats x beatSeconds <= usableEnd; { beats: 0, shots: 0 } when not even MV_GROOVE_MIN_BEATS fit.
// `shots` is the pattern count for the fitted span; usableEnd is Infinity (or null) without music; opener? as in
// mvGrooveSpan.
function mvGrooveFit(opts) {
  const start = typeof opts.sectionStart === 'number' && isFinite(opts.sectionStart) ? opts.sectionStart : 0;
  const end = opts.usableEnd == null ? Infinity : opts.usableEnd;
  const nominal = mvGrooveSpan(opts.requested, opts.opener);
  for (let beats = nominal.beats; beats >= MV_GROOVE_MIN_BEATS; beats -= 4) {
    if (start + beats * opts.beatSeconds <= end + 1e-6) return { beats, shots: mvGrooveCount(beats, opts.opener), requestedBeats: nominal.beats };
  }
  return { beats: 0, shots: 0, requestedBeats: nominal.beats };
}

// Drum fills of a Groove span. opts: { onsets: [[music seconds, band, strength], ...], sectionStart (music seconds),
// bpm, firstBeat? (re-phases sectionStart onto the beat grid), beats (the span) }. A beat's density is the sum of its
// onsets' strengths (count x strength); a candidate beat (mvGrooveCandidates) carries a fill when its density reaches
// MV_GROOVE_FILL_RATIO x the median beat density of the span. Candidates come in two classes: phrase ends (beat 15 of
// a phrase, and the span's final beat) and bar-2 accents (beat 7 of a phrase, unless it is the final beat). Detection
// first, per class: when a class has a candidate with a fill, just those split; a class without one falls back to all
// of its candidates. No onsets, no bpm or section start or a median of 0 -> every candidate splits. Returns { splits:
// beat indices, candidates, source: 'onsets' (both classes detected) | 'mixed' | 'pattern' (neither), ratios: density
// / median per candidate (empty without data) }. Assumes sectionStart is on the bar grid (mvSnapSection /
// mvDefaultSection), since candidates are counted in beats from it; with firstBeat it is only re-phased to the nearest
// beat, never to a bar. The median is taken over the whole span (not per phrase), which is steadier on short spans.
function mvFillBeats(opts) {
  const n = Math.max(0, Math.floor(opts.beats) || 0), candidates = mvGrooveCandidates(n);
  const fallback = ratios => ({ splits: candidates.slice(), candidates, source: 'pattern', ratios });
  const bpm = opts.bpm, finite = v => typeof v === 'number' && isFinite(v);
  if (!n || !(bpm > 0) || !finite(opts.sectionStart) || !Array.isArray(opts.onsets) || !opts.onsets.length) return fallback([]);
  const beat = 60 / bpm;
  const start = finite(opts.firstBeat) ? opts.firstBeat + Math.round((opts.sectionStart - opts.firstBeat) / beat) * beat : opts.sectionStart;
  const density = Array(n).fill(0);
  for (const o of opts.onsets) {
    if (!o || !finite(o[0]) || !finite(o[2]) || !(o[2] > 0)) continue;
    const k = Math.floor((o[0] - start + MV_GROOVE_ONSET_LEAD) / beat);
    if (k >= 0 && k < n) density[k] += o[2];
  }
  const sorted = density.slice().sort((a, b) => a - b);
  const median = (sorted[(n - 1) >> 1] + sorted[n >> 1]) / 2;
  if (!(median > 0)) return fallback([]);
  const ratios = candidates.map(b => Math.round(density[b] / median * 100) / 100);
  const isEnd = b => b === n - 1 || b % MV_GROOVE_PHRASE_BEATS === MV_GROOVE_PHRASE_BEATS - 1;
  const fill = b => density[b] / median >= MV_GROOVE_FILL_RATIO - 1e-9;
  let detected = 0;
  const pick = list => { const hit = list.filter(fill); if (hit.length) detected++; return hit.length ? hit : list; };
  const ends = pick(candidates.filter(isEnd)), accents = pick(candidates.filter(b => !isEnd(b)));
  const splits = ends.concat(accents).sort((a, b) => a - b);
  // Two classes when the span has accents; a class that is empty counts as detected for 'onsets'.
  const classes = candidates.some(b => !isEnd(b)) ? 2 : 1;
  return { splits, candidates, source: detected === 0 ? 'pattern' : detected === classes ? 'onsets' : 'mixed', ratios };
}

// Where the music's beats land on the timeline. Selects snaps the music's source start (sectionStart) to a timeline
// frame, so the music plays offset by delta = sectionStart - round(sectionStart * fps) / fps (at most half a frame);
// beat b of the section plays at b * 60 / bpm + delta. Without music there is no offset.
function mvMusicOffset(sectionStart, fps) {
  return typeof sectionStart === 'number' && isFinite(sectionStart) && fps > 0 ? sectionStart - Math.round(sectionStart * fps) / fps : 0;
}

// Onset-snapped cuts. The cuts stay on the grid; a cut moves onto a clearly strong music onset near it, and only when
// nothing already marks the grid position. Only a cut that starts a slot of at least one beat is snappable: with
// opts.beatsList (Groove) a cut starting an 8th slot stays on the grid; without it every inner cut qualifies.
// Conservative rules (from CWV v2.6): a cut stays on the grid when a qualifying onset of any band lies within one frame
// of it; otherwise the candidate must reach MV_SNAP_MIN_RATIO of its band threshold, candidates rank by
// ratio - MV_SNAP_DISTANCE_COST * |offset| / window, and a low-band candidate must also beat the grid position's own
// onset (the strongest qualifying onset nearer the grid, else the band threshold, ratio 1) by MV_SNAP_LOW_MARGIN.
const MV_SNAP_WINDOW_BEATS = 0.10;          // search window: +/- this share of a beat ...
const MV_SNAP_WINDOW_MAX = 0.070;           // ... capped at this many seconds
const MV_SNAP_MIN_STRENGTH = 2;             // an onset's strength (over its band median) must reach max(this, band threshold)
const MV_SNAP_MIN_RATIO = 1.5;              // a snap target's strength over that threshold
const MV_SNAP_DISTANCE_COST = 0.5;          // score = ratio - this * |offset| / window: an onset at the window edge loses 0.5
const MV_SNAP_LOW_MARGIN = 0.25;            // a low-band target's ratio over the grid position's own onset ratio
const MV_SNAP_MIN_FRAMES = 4;               // no snap may leave a shot shorter than this (or than its grid length, if shorter)
const MV_SNAP_MIN_SHARE = 0.75;             // ... or shorter than this share of its grid length
// Music whose beat was not found reliably (fixed shot lengths): only bass onsets, within a fixed window.
const MV_SNAP_LOW_CONFIDENCE_WINDOW = 0.120;

// boundaries: the grid's cut times in seconds from the section start ([0, end of slot 0, ..., end of the last slot]).
// onsets: [[seconds in the music source, band 'l' | 'm' | 'h', strength], ...].
// opts: { bpm (null without a grid), fps, sectionStart (the music second at the section start; onsets are shifted by
// it), thresholds?: { l, m, h }, lowConfidence?: true for fixed timing (forced when bpm is not a number), beatsList?:
// slot lengths in beats }. The min-frames / min-share rule below keeps an 8th slot next to a snapped cut. Returns
// { cuts: seconds like boundaries, frames: the cuts at opts.fps with the music offset (same expression as mvSchedule
// and assemble.js), log: one entry per inner cut, window }. A snapped cut sits exactly on its onset, so rounding it to
// a frame at any rate never puts it more than half a frame before the onset.
function mvSnapCuts(boundaries, onsets, opts) {
  const fps = opts.fps, low = !!opts.lowConfidence || !(opts.bpm > 0);
  const offset = mvMusicOffset(opts.sectionStart, fps);
  const frameOf = x => (x === 0 ? 0 : Math.round((x + offset) * fps));
  const reach = low ? MV_SNAP_LOW_CONFIDENCE_WINDOW : Math.min(MV_SNAP_WINDOW_BEATS * 60 / opts.bpm, MV_SNAP_WINDOW_MAX);
  const bands = low ? ['l'] : ['l', 'm', 'h'];
  const thr = band => Math.max(MV_SNAP_MIN_STRENGTH, (opts.thresholds && opts.thresholds[band]) || 0);
  const shift = typeof opts.sectionStart === 'number' && isFinite(opts.sectionStart) ? opts.sectionStart : 0;
  const list = (onsets || []).filter(o => o && isFinite(o[0]) && isFinite(o[2]) && o[2] >= thr(o[1]))
    .map(o => ({ x: o[0] - shift, band: o[1], strength: o[2], ratio: o[2] / thr(o[1]) }));
  const n = boundaries.length - 1;
  const cuts = boundaries.slice(), log = [];
  // The onset a cut at grid time g moves to ({ ...onset, d }), or { none: reason } when it stays on the grid.
  const pick = g => {
    const near = list.filter(o => Math.abs(o.x - g) <= reach + 1e-9).map(o => ({ ...o, d: Math.abs(o.x - g) }));
    const onGrid = near.filter(o => o.d <= 1 / fps + 1e-9).sort((p, q) => p.d - q.d || p.x - q.x);
    if (onGrid.length) return { none: 'on grid (' + onGrid[0].band + ' onset within a frame)' };
    const usable = near.filter(o => bands.indexOf(o.band) >= 0);
    if (!usable.length) return { none: 'no onset' };
    let best = null, why = 'weak onset';
    for (const o of usable) {
      if (o.ratio < MV_SNAP_MIN_RATIO - 1e-9) continue;
      if (o.band === 'l') {
        // The grid position's own onset: the strongest qualifying onset nearer the grid (ratio 1 = the threshold when
        // there is none, since a weaker one would not be listed).
        const own = near.reduce((m, q) => (q.d < o.d - 1e-9 && q.ratio > m ? q.ratio : m), 1);
        if (o.ratio < own + MV_SNAP_LOW_MARGIN - 1e-9) { why = 'low onset not above the grid'; continue; }
      }
      const score = o.ratio - MV_SNAP_DISTANCE_COST * o.d / reach;
      if (!best || score > best.score + 1e-9 || (Math.abs(score - best.score) <= 1e-9 && (o.d < best.d - 1e-9 || (Math.abs(o.d - best.d) <= 1e-9 && o.x < best.x)))) best = { ...o, score };
    }
    return best || { none: why };
  };
  // The first shot in [a, b] that a snap would make too short, or null.
  const tooShort = (next, a, b) => {
    for (let k = Math.max(0, a); k <= Math.min(n - 1, b); k++) {
      const frames = frameOf(next[k + 1]) - frameOf(next[k]), grid = frameOf(boundaries[k + 1]) - frameOf(boundaries[k]);
      if (frames < Math.min(MV_SNAP_MIN_FRAMES, grid)) return { slot: k, reason: 'min-frames' };
      if (next[k + 1] - next[k] < MV_SNAP_MIN_SHARE * (boundaries[k + 1] - boundaries[k]) - 1e-9) return { slot: k, reason: 'min-share' };
    }
    return null;
  };
  for (let i = 1; i < n; i++) {
    const g = boundaries[i];
    if (opts.beatsList && !(opts.beatsList[i] >= 1)) { log.push({ index: i, grid: g, seconds: g, shiftMs: 0, reason: 'eighth: stays on the grid' }); continue; }
    const o = pick(g);
    if (o.none) { log.push({ index: i, grid: g, seconds: g, shiftMs: 0, reason: o.none }); continue; }
    const next = cuts.slice();
    next[i] = o.x;
    const bad = tooShort(next, i - 1, i);
    const entry = { index: i, grid: g, onset: o.x, band: o.band, strength: o.strength, ratio: Math.round(o.ratio * 100) / 100 };
    if (bad) { log.push({ ...entry, seconds: g, shiftMs: 0, reason: 'reverted: slot ' + bad.slot + ' ' + bad.reason }); continue; }
    cuts[i] = o.x;
    log.push({ ...entry, seconds: o.x, shiftMs: Math.round((o.x - g) * 1e4) / 10, reason: 'onset' });
  }
  return { cuts, frames: cuts.map(frameOf), log, window: reach };
}

// opts: { bpm (null without a usable grid), fps, shots, beatsPerShot, shotSeconds? (the fixed shot length, needed
// when bpm is null), sectionStart?: seconds into the music (omit without music), onsets?, onsetThresholds?,
// lowConfidence? (mvSnapCuts; used only with a sectionStart), cuts?: cut seconds decided earlier (a schedule's `cuts`,
// reused as they are, e.g. to rebuild at the Draft's real fps), beatsList?: per-slot lengths in beats (Groove; replaces
// shots and beatsPerShot; without a grid shotSeconds is the seconds per beat) }. Slots carry their grid beat span
// (startBeat, endBeat; null without a grid) and frames, and with beatsList also `beats` (the slot's length in beats);
// `offset` is the music offset every boundary is shifted by; `cuts` are the boundaries in seconds from the section
// start (the grid, or the snapped cuts) and `snapLog` explains each inner cut. With beatsList the result also carries
// `beatsList`.
function mvSchedule(opts) {
  const list = Array.isArray(opts.beatsList) ? opts.beatsList : null;
  const fps = opts.fps, n = list ? list.length : opts.shots, gridded = opts.bpm > 0;
  if (!(fps > 0) || !(n >= 1)) throw Error('mvSchedule needs fps and shots');
  if (list && !list.every(b => typeof b === 'number' && b > 0 && isFinite(b))) throw Error('mvSchedule: beatsList needs positive beat lengths');
  const bps = gridded ? (list ? 1 : opts.beatsPerShot) : null;
  if (gridded && !(bps > 0)) throw Error('mvSchedule needs beatsPerShot');
  const shotSeconds = gridded ? bps * 60 / opts.bpm : opts.shotSeconds;
  if (!(shotSeconds > 0)) throw Error('mvSchedule needs bpm or shotSeconds');
  // Slot k starts `at[k]` units (beats, or fixed shots / beat units without a grid) in; sums of 0.5, 1 and 2 are exact.
  const at = [0];
  for (let k = 0; k < n; k++) at.push(at[k] + (list ? list[k] : 1));
  // Every boundary is an absolute position (k shots in), shifted by the music offset and snapped once to a frame;
  // durations never accumulate rounding. The video always starts at frame 0. assemble.js uses the same expression.
  const offset = mvMusicOffset(opts.sectionStart, fps);
  const frameOf = x => (x === 0 ? 0 : Math.round((x + offset) * fps));
  const grid = [];
  for (let k = 0; k <= n; k++) grid.push(gridded ? at[k] * bps * (60 / opts.bpm) : at[k] * shotSeconds);
  let cuts = grid, snapLog = [];
  if (Array.isArray(opts.cuts)) {
    if (opts.cuts.length !== grid.length) throw Error('mvSchedule: cuts do not match the slots');
    cuts = opts.cuts.slice();
  } else if (opts.onsets && opts.onsets.length && typeof opts.sectionStart === 'number' && isFinite(opts.sectionStart)) {
    const snapped = mvSnapCuts(grid, opts.onsets,
      { bpm: gridded ? opts.bpm : null, fps, sectionStart: opts.sectionStart, thresholds: opts.onsetThresholds, lowConfidence: opts.lowConfidence || !gridded, beatsList: list || undefined });
    cuts = snapped.cuts; snapLog = snapped.log;
  }
  const slots = [];
  for (let i = 0; i < n; i++) {
    slots.push({
      index: i,
      role: MV_ROLES[i % MV_ROLES.length],
      startBeat: gridded ? at[i] * bps : null,
      endBeat: gridded ? at[i + 1] * bps : null,
      startFrame: frameOf(cuts[i]),
      endFrame: frameOf(cuts[i + 1]),
      ...(list ? { beats: list[i] } : {}),
    });
  }
  return { offset, cuts, snapLog, slots, totalFrames: slots[n - 1].endFrame, gridded, ...(list ? { beatsList: list.slice() } : {}) };
}

// Music section start: snapped to whole bars from firstBeat on an accepted grid (to 0.1 s otherwise), clamped so a
// video of videoSeconds fits before usableEnd; null when it cannot fit.
function mvSnapSection(opts) {
  const latest = opts.usableEnd - opts.videoSeconds;
  if (latest < -1e-6) return null;
  if (!opts.gridAccepted) return Math.max(0, Math.min(Math.floor(latest * 10) / 10, Math.round(opts.value * 10) / 10));
  const bar = 4 * 60 / opts.bpm;
  const maxK = Math.floor((latest - opts.firstBeat) / bar + 1e-9);
  if (maxK < 0) return null;
  const k = Math.max(0, Math.min(maxK, Math.round((opts.value - opts.firstBeat) / bar)));
  return opts.firstBeat + k * bar;
}

// Default music section: the most energetic window of videoSeconds starting a whole number of bars after firstBeat
// (earliest on ties), or null when none fits. opts.downbeatHigh only changes what that guarantees, not the maths: with
// a high-confidence downbeat firstBeat is a bar start, so the section starts on a downbeat; otherwise (downbeatHigh
// false) the start is still a beat, with the bar phase best effort.
function mvDefaultSection(opts) {
  const beat = 60 / opts.bpm, span = Math.round(opts.videoSeconds / beat);
  let best = null;
  for (let k = 0; ; k++) {
    const start = opts.firstBeat + k * 4 * beat;
    if (start + opts.videoSeconds > opts.usableEnd + 1e-6) break;
    const slice = opts.beatEnergy.slice(k * 4, k * 4 + span);
    if (slice.length < span) break;
    const mean = slice.reduce((a, b) => a + b, 0) / span;
    if (!best || mean > best.mean + 1e-9) best = { start, mean };
  }
  return best ? best.start : null;
}

// Hook section (spec 15.3, "Start at the hook"): the bar start with the highest hookBars score (manifest; index b =
// the start firstBeat + 4b beats, scored by onset contrast and low-band punch) among the starts whose video of
// videoSeconds fits before usableEnd, earliest on ties; the manifest's hookStart is this pick for 24 beats. null when
// there are no scores (own music, No music), no tempo or nothing fits, so the caller falls back to mvDefaultSection.
// opts: { hookBars, firstBeat, bpm, usableEnd, videoSeconds, barPhaseBeats? }. barPhaseBeats is informational only:
// the manifest's firstBeat already carries the bar phase, so it never shifts the start.
function mvHookSection(opts) {
  const bars = opts.hookBars, bar = 4 * 60 / opts.bpm;
  if (!Array.isArray(bars) || !bars.length || !(opts.bpm > 0)) return null;
  let best = null;
  for (let b = 0; b < bars.length; b++) {
    const start = opts.firstBeat + b * bar, score = bars[b];
    if (typeof score !== 'number' || !isFinite(score) || start + opts.videoSeconds > opts.usableEnd + 1e-6) continue;
    if (!best || score > best.score + 1e-9) best = { start, score };
  }
  return best ? best.start : null;
}

function mvHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}

// Filler candidates every MV_FILLER_STEP seconds on each source that appears in the candidates, sorted by rid then time;
// at most MV_FILLER_MAX per source (an even subset of that grid, keeping both edge windows).
function mvFillers(candidates) {
  const dur = {};
  for (const c of candidates) {
    if (!c || typeof c.sourceDuration !== 'number' || !isFinite(c.sourceDuration) || !(c.sourceDuration > 0)) continue;
    dur[c.rid] = Math.max(dur[c.rid] || 0, c.sourceDuration);
  }
  const out = [];
  for (const rid of Object.keys(dur).sort()) {
    // Grid points MV_FILLER_EDGE + k * MV_FILLER_STEP with k = 0 .. count - 1 that stay MV_FILLER_EDGE from the end.
    const count = Math.max(0, Math.floor((dur[rid] - 2 * MV_FILLER_EDGE + 1e-9) / MV_FILLER_STEP) + 1);
    const take = Math.min(count, MV_FILLER_MAX);
    let last = -1;
    for (let i = 0; i < take; i++) {
      const k = take === count ? i : Math.round(i * (count - 1) / (take - 1));
      if (k === last) continue;
      last = k;
      out.push({ rid, role: 'filler', t: MV_FILLER_EDGE + k * MV_FILLER_STEP, score: MV_FILLER_SCORE, sourceDuration: dur[rid] });
    }
  }
  return out;
}

// Strict allocation. opts: { candidates, slots: [{ index, role, seconds, videoOnly? }], seed, gapSeconds = 0.5,
// photoShare = MV_PHOTO_SHARE, spread = true, motionOpener = true }. A videoOnly slot (a Groove 8th) never takes a
// photo, and the photo share counts only the other slots. Two hard rules, never relaxed: the previous slot's source is never used again for the next slot,
// and at most MV_PHOTO_RUN_MAX photos play in a row (unless the pool has no video candidate). A slot nothing fits under
// them stays null (counted in `missing`); mvPlanBuild then tries a shorter length.
// Motion opener: a video candidate with `motion` > 0 (tagged by the panel's motion bonus, only with Beat punch) marks a
// moving moment. The first slot takes the best such window that fits it (the usual role rank, score and jitter; a role
// outside the slot's roles ranks after them), ahead of a photo slot and the normal tiers, and is then left out of the
// photo slots so the photo share moves to the others. Without tagged candidates (Beat punch off), with none that fits,
// or with motionOpener: false the allocation is exactly as without this rule.
function mvAllocate(opts) {
  const gap = opts.gapSeconds == null ? 0.5 : opts.gapSeconds;
  const finite = v => typeof v === 'number' && isFinite(v);
  const candidates = opts.candidates.filter(c => c && c.kind !== 'photo' && finite(c.t) && finite(c.score) && finite(c.sourceDuration));
  // One photo candidate per rid, in rid order so the result never depends on input order.
  const photoSeen = {};
  const photos = opts.candidates.filter(c => c && c.kind === 'photo' && typeof c.rid === 'string' && !photoSeen[c.rid] && (photoSeen[c.rid] = true))
    .sort((a, b) => (a.rid < b.rid ? -1 : a.rid > b.rid ? 1 : 0));
  const used = {}, uses = {}, recent = [], picks = [], photoUsed = {};
  // Variety first (default): a slot takes an unused resource whenever one fits before reusing any, and reuse goes to
  // the least-used resource. spread: false ranks by role and score only (the fallback mvPlanBuild tries before it
  // shrinks, since spending every fresh clip first can strand a length that a reuse-tolerant order fills).
  const spread = opts.spread !== false;
  const pool = candidates.filter(c => c.sourceDuration > 0);
  // Each candidate's seeded tie-break jitter, hashed once per call rather than per slot, tier and use count.
  const jitter = pool.map(c => mvHash(opts.seed + ':' + c.rid + ':' + c.t.toFixed(2)) * 0.05);
  // Photo-only pools (no usable video) may play any number of photos in a row.
  const runLimited = pool.length > 0;
  let missing = 0, fillerShots = 0, photoShots = 0, photoRun = 0, prevRid = null;
  // The motion opener (see above). Nothing is used yet, so this is the pick the first slot's loop turn would make with
  // the motion rank.
  const first = opts.slots[0];
  const opener = first && opts.motionOpener !== false && pool.some(c => c.motion > 0) ? searchVideo(first, c => {
    if (!(c.motion > 0) || c.role === 'filler') return -1;
    const roles = [first.role].concat(MV_ROLE_FALLBACK[first.role] || []), r = roles.indexOf(c.role);
    return r >= 0 ? r : roles.length;
  }, null, null) : null;
  // Photo slots: round(share x slots) of the slots a photo can hold (not the motion opener's), capped by the photos
  // available, spaced evenly from a seeded phase. With no photos there are none, and every slot goes to video.
  const photoSlots = {};
  const phase = mvHash(opts.seed + ':photo-slots');
  const holdable = opts.slots.filter(sl => !sl.videoOnly && sl.seconds <= MV_PHOTO_HOLD_MAX + 1e-9 && !(opener && sl === first));
  const share = opts.photoShare == null ? MV_PHOTO_SHARE : opts.photoShare;
  const target = Math.min(photos.length, holdable.length, Math.round(opts.slots.filter(sl => !sl.videoOnly).length * share));
  for (let k = 0; k < target; k++) photoSlots[holdable[Math.floor((k + phase) * holdable.length / target)].index] = true;
  // Best fitting video candidate for a slot. rankOf returns the candidate's rank in this tier, or -1 to skip it.
  // `exclude` is the previous shot's source, which may not be used; `level`, when not null, keeps only sources used
  // exactly that many times.
  function searchVideo(slot, rankOf, exclude, level) {
    let best = null;
    for (let i = 0; i < pool.length; i++) {
      const c = pool[i];
      if (c.rid === exclude) continue;
      if (level != null && (uses[c.rid] || 0) !== level) continue;
      const rank = rankOf(c);
      if (rank < 0 || c.sourceDuration < slot.seconds + MV_SOURCE_TAIL) continue;
      const start = Math.max(0, Math.min(c.sourceDuration - MV_SOURCE_TAIL - slot.seconds, c.t - slot.seconds / 2));
      const end = start + slot.seconds;
      if ((used[c.rid] || []).some(([a, b]) => start < b + gap && end > a - gap)) continue;
      const repeats = recent.filter(r => r === c.rid).length;
      const value = c.score - rank * 0.15 - repeats * 0.2 + jitter[i];
      const better = !best || value > best.value + 1e-12 ||
        (Math.abs(value - best.value) <= 1e-12 && (c.rid < best.c.rid || (c.rid === best.c.rid && c.t < best.c.t)));
      if (better) best = { value, c, start, end };
    }
    return best;
  }
  // An unused photo for the slot, chosen by a seeded hash so another seed picks other photos. A photo is never the
  // previous source, since each photo is used once.
  function searchPhoto(slot) {
    if (slot.videoOnly || slot.seconds > MV_PHOTO_HOLD_MAX + 1e-9) return null;
    let best = null;
    for (const c of photos) {
      if (photoUsed[c.rid]) continue;
      const value = mvHash(opts.seed + ':photo:' + c.rid);
      if (!best || value > best.value + 1e-12) best = { value, c, photo: true };
    }
    return best;
  }
  for (const slot of opts.slots) {
    const roles = [slot.role].concat(MV_ROLE_FALLBACK[slot.role] || []);
    const exclude = prevRid;
    const photo = () => searchPhoto(slot);
    const preferred = level => () => searchVideo(slot, c => roles.indexOf(c.role), exclude, level);
    const anyReal = level => () => searchVideo(slot, c => (c.role === 'filler' ? -1 : 0), exclude, level);
    const filler = level => () => searchVideo(slot, c => (c.role === 'filler' ? 0 : -1), exclude, level);
    // Tiers, best first. A photo slot puts an unused photo first. With spread (the default) the video tiers run once
    // per use count, fewest first: preferred-role hits, any-role hits, then fillers of sources used that often, so
    // role and score only rank sources used equally often and an unused clip (even by a filler) beats any reuse.
    // Outside photo slots a photo is then the last resort, which keeps the photo share. Without spread the CWV order
    // applies: preferred, any-role, photo, filler. After MV_PHOTO_RUN_MAX photos in a row the photo tier is skipped.
    const runFull = runLimited && photoRun >= MV_PHOTO_RUN_MAX;
    const tiers = photoSlots[slot.index] ? [photo] : [];
    if (spread) {
      const levels = Array.from(new Set(pool.map(c => uses[c.rid] || 0))).sort((x, y) => Number(x) - Number(y));
      for (const level of levels) tiers.push(preferred(level), anyReal(level), filler(level));
      tiers.push(photo);
    } else {
      tiers.push(preferred(null), anyReal(null), photo, filler(null));
    }
    let best = slot === first ? opener : null;
    if (!best) {
      for (const tier of tiers) {
        if (runFull && tier === photo) continue;
        if ((best = tier())) break;
      }
    }
    if (!best) { missing++; picks.push(null); photoRun = 0; prevRid = null; continue; }
    prevRid = best.c.rid;
    recent.push(best.c.rid);
    if (recent.length > 3) recent.shift();
    if (best.photo) {
      photoUsed[best.c.rid] = true;
      photoShots++; photoRun++;
      picks.push({ slot: slot.index, rid: best.c.rid, kind: 'photo', holdSeconds: slot.seconds });
      continue;
    }
    photoRun = 0;
    (used[best.c.rid] = used[best.c.rid] || []).push([best.start, best.end]);
    uses[best.c.rid] = (uses[best.c.rid] || 0) + 1;
    if (best.c.role === 'filler') fillerShots++;
    // sourceDuration lets assemble.js keep the window inside its source at the Draft's real rate.
    picks.push({ slot: slot.index, rid: best.c.rid, kind: 'video', startSeconds: best.start, endSeconds: best.end, sourceDuration: best.c.sourceDuration });
  }
  return { picks, missing, filled: picks.filter(Boolean).length, fillerShots, photoShots };
}

// The whole plan. opts: { candidates (video hits and { rid, kind: 'photo' }), bpm (null without music), accepted,
// approxBpm? (mvApproxTempo), fps, pace: 'quick' | 'relaxed' | 'groove', requested (shots), sectionStart?, usableEnd? (Infinity / omitted without
// music), onsets?, onsetThresholds?, lowConfidence?, seed, photoShare?, motionOpener? (mvAllocate) }.
// A plan carries approxBpm: the approximate tempo its fixed timing used, else null.
// Order: the music caps the length (mvFitShots), then the plan tries that length and shrinks by MV_MIN_SHOTS down to
// MV_MIN_SHOTS until the strict allocation fills every slot. Every attempt allocates from scratch with filler
// candidates added (see `attempts` below). Failure reasons: 'music-too-short' (not even MV_MIN_SHOTS fit the music), 'one-resource' (fewer
// than 2 distinct sources: the adjacency rule cannot hold), 'too-few' (the footage fills fewer than MV_MIN_SHOTS).
// Groove (unless its tempo guard falls back to 2 beats per shot): the length is a beat span (mvGrooveFit: the nominal
// span for `requested`, capped by the music in whole bars) and shrinks by whole bars down to MV_GROOVE_MIN_BEATS; each
// span's fills come from the section's onsets (mvFillBeats), and `shots` is that span's actual slot count. A pool with
// no usable video gets no 8ths (photos cannot take them). The result then has beatsPerShot null, shotSeconds null and
// groove: { beats, requestedBeats, splits (beats split into 8ths), fillSource, ratios (mvFillBeats), beatSeconds,
// opener }; its slots carry
// `beats`.
function mvPlanBuild(opts) {
  const gridded = mvGridUsable({ bpm: opts.bpm, accepted: opts.accepted });
  // The tempo the shots follow: the grid's, else an approximate one (fixed timing on its beat), else null (0.55 s).
  const approxBpm = mvApproxTempo({ gridded, approxBpm: opts.approxBpm });
  const tempo = gridded ? opts.bpm : approxBpm;
  const guard = tempo ? mvBeatsPerShot(opts.pace, tempo) : { beats: null, overridden: false };
  const grooved = opts.pace === 'groove' && (tempo ? !!guard.groove : true);
  const shotSeconds = grooved ? null : mvShotSeconds({ bpm: opts.bpm, beatsPerShot: guard.beats, pace: opts.pace, gridded, approxBpm });
  const beatSeconds = grooved ? (tempo ? 60 / tempo : MV_GROOVE_FALLBACK_BEAT) : null;
  const opener = grooved && tempo ? mvGrooveOpener(tempo) : 2;
  const asked = typeof opts.requested === 'number' && isFinite(opts.requested) ? opts.requested : MV_LENGTHS.standard;
  const requested = Math.max(MV_MIN_SHOTS, Math.floor(asked / MV_MIN_SHOTS) * MV_MIN_SHOTS);
  const fit = grooved ? mvGrooveFit({ requested, sectionStart: opts.sectionStart, usableEnd: opts.usableEnd, beatSeconds, opener }) : null;
  const top = grooved ? fit.beats : mvFitShots({ requested, sectionStart: opts.sectionStart, usableEnd: opts.usableEnd, shotSeconds });
  if (top === 0) return { ok: false, reason: 'music-too-short', usableShots: 0 };
  // Distinct sources the allocator can use: valid videos (as mvAllocate filters them) and photos.
  const finite = v => typeof v === 'number' && isFinite(v);
  const rids = {};
  let hasPhotos = false, hasVideo = false;
  for (const c of opts.candidates) {
    if (!c || typeof c.rid !== 'string') continue;
    if (c.kind === 'photo') { rids[c.rid] = true; hasPhotos = true; }
    else if (finite(c.t) && finite(c.score) && finite(c.sourceDuration) && c.sourceDuration > 0) { rids[c.rid] = true; hasVideo = true; }
  }
  if (Object.keys(rids).length < 2) return { ok: false, reason: 'one-resource', usableShots: 0 };
  const candidates = opts.candidates.concat(mvFillers(opts.candidates));
  // Share attempts per length. The greedy allocator spends a scarce video window after every photo outside the photo
  // slots, which can strand photos behind the run limit although the length is fillable (P P a P P b P P). So before a
  // length is given up it is retried with every slot a photo slot (photos first, a video only after two photos), which
  // spends video windows only where the run limit needs them.
  const shares = [opts.photoShare == null ? MV_PHOTO_SHARE : opts.photoShare];
  if (hasPhotos && shares[0] !== 1) shares.push(1);
  // Variety first; spending every fresh clip early can also strand a fillable length (a s s s ... where a s a s ...
  // fits), so a length is only given up after the role-and-score order (spread: false) fails too.
  // Each attempt's name ('spread', 'spread-share1', 'role-first', 'role-first-share1', each with '-no-opener' when the
  // motion opener's retry built it) is returned as `attempt`, so the panel and logs can tell when a fallback built the
  // plan.
  const attempts = [true, false].flatMap(spread => shares.map((photoShare, i) =>
    ({ spread, photoShare, name: (spread ? 'spread' : 'role-first') + (i ? '-share1' : '') })));
  let usableShots = 0;
  // Whether mvAllocate's motion opener can apply (some video candidate carries motion).
  const motionTagged = opts.motionOpener !== false && candidates.some(c => c && c.kind !== 'photo' && c.motion > 0);
  // Lengths to try, longest first: shots (Quick / Relaxed) or beat spans (Groove).
  const step = grooved ? 4 : MV_MIN_SHOTS, least = grooved ? MV_GROOVE_MIN_BEATS : MV_MIN_SHOTS;
  for (let n = top; n >= least; n -= step) {
    const snapOpts = { sectionStart: opts.sectionStart, onsets: opts.onsets, onsetThresholds: opts.onsetThresholds, lowConfidence: opts.lowConfidence };
    // Groove fills for this span: none without video (photos cannot take an 8th), the pattern without a grid.
    const fills = !grooved ? null
      : !hasVideo ? { splits: [], source: 'no-video', ratios: [] }
      : gridded ? mvFillBeats({ onsets: opts.onsets, sectionStart: opts.sectionStart, bpm: opts.bpm, beats: n })
      : { splits: mvGrooveCandidates(n), source: 'pattern', ratios: [] };
    const schedule = fills
      ? mvSchedule({ bpm: gridded ? opts.bpm : null, fps: opts.fps, beatsList: mvGrooveBeats({ beats: n, splits: fills.splits, opener }), shotSeconds: beatSeconds, ...snapOpts })
      : mvSchedule({ bpm: gridded ? opts.bpm : null, fps: opts.fps, shots: n, beatsPerShot: guard.beats, shotSeconds, ...snapOpts });
    const slots = schedule.slots.map(s => (fills
      ? { index: s.index, role: s.role, seconds: (s.endFrame - s.startFrame) / opts.fps, videoOnly: (s.beats || 1) < 1 }
      : { index: s.index, role: s.role, seconds: (s.endFrame - s.startFrame) / opts.fps }));
    for (const attempt of attempts) {
      let alloc = mvAllocate({ candidates, slots, seed: opts.seed, photoShare: attempt.photoShare, spread: attempt.spread, motionOpener: opts.motionOpener });
      let name = attempt.name;
      // The motion opener never costs length: an attempt it leaves short is retried without it (named
      // '<attempt>-no-opener') before the next attempt or a shorter length. Untagged pools never retry.
      if (alloc.missing > 0 && motionTagged) {
        if (n === least) usableShots = Math.max(usableShots, alloc.filled);
        alloc = mvAllocate({ candidates, slots, seed: opts.seed, photoShare: attempt.photoShare, spread: attempt.spread, motionOpener: false });
        name = attempt.name + '-no-opener';
      }
      if (alloc.missing === 0) {
        return { ok: true, schedule, picks: alloc.picks, shots: slots.length, requested, fittedByMusic: top < (fit ? fit.requestedBeats : requested),
          beatsPerShot: grooved ? null : guard.beats, overridden: guard.overridden, shotSeconds, approxBpm, fillerShots: alloc.fillerShots, photoShots: alloc.photoShots,
          attempt: name,
          ...(fills && fit ? { groove: { beats: n, requestedBeats: fit.requestedBeats, splits: fills.splits, fillSource: fills.source, ratios: fills.ratios, beatSeconds, opener } } : {}) };
      }
      // The shortest length misses slots with every share, so usableShots < MV_MIN_SHOTS.
      if (n === least) usableShots = Math.max(usableShots, alloc.filled);
    }
  }
  return { ok: false, reason: 'too-few', usableShots };
}

// Photo motions, in pick order: every photo pick gets one (the title covers the whole video and does not restrict
// motion); videos and empty picks get null.
// Deterministic per seed; never the same motion twice in a row, never the same family (drift, tilt, ...) twice in a row;
// drift, tilt and push-drift directions alternate. Drift follows the photo: vertical for portrait, horizontal otherwise.
// Each entry is { motion, direction: 1 | -1, axis: 'x' | 'y' } for assets/photo-motion.tsx.
// `sizes` maps rid -> { width, height }; an unknown size counts as landscape.
const MV_PHOTO_MOTIONS = ['push-in', 'pull-out', 'drift-left', 'drift-right', 'drift-up', 'drift-down', 'tilt', 'push-drift'];
const MV_MOTION_FAMILIES = ['push-in', 'pull-out', 'drift', 'tilt', 'push-drift'];
function mvPhotoMotions(picks, seed, sizes) {
  const out = [];
  let lastFamily = null, driftSign = { x: 1, y: 1 }, tiltSign = 1, pushDriftSign = 1, k = 0;
  for (const pick of picks) {
    if (!pick || pick.kind !== 'photo') { out.push(null); continue; }
    const size = sizes && sizes[pick.rid];
    const portrait = !!(size && size.height > size.width);
    const families = MV_MOTION_FAMILIES.filter(f => f !== lastFamily)
      .map(f => ({ f, v: mvHash(seed + ':motion:' + k + ':' + f) }))
      .sort((a, b) => b.v - a.v || (a.f < b.f ? -1 : 1));
    const family = families[0].f;
    let motion = family, direction = 1;
    if (family === 'drift') {
      const axis = portrait ? 'y' : 'x';
      direction = driftSign[axis]; driftSign[axis] = -direction;
      motion = axis === 'x' ? (direction > 0 ? 'drift-right' : 'drift-left') : (direction > 0 ? 'drift-down' : 'drift-up');
    } else if (family === 'tilt') { direction = tiltSign; tiltSign = -tiltSign; }
    else if (family === 'push-drift') { direction = pushDriftSign; pushDriftSign = -pushDriftSign; }
    // axis: the drift direction of push-drift (and of the drift motions), along the side the 16:9 crop has room on:
    // a portrait photo is cropped top and bottom (y), a landscape or square one drifts sideways (x).
    out.push({ motion, direction, axis: portrait ? 'y' : 'x' });
    lastFamily = family; k++;
  }
  return out;
}

// Build steps shown in the panel's progress bar, with each step's share of the bar in percent. The panel names each
// step in the UI language (STRINGS `step.<id>`).
const MV_BUILD_STEPS = [
  { id: 'shots', weight: 40 },
  { id: 'music', weight: 10 },
  { id: 'draft', weight: 25 },
  { id: 'look', weight: 20 },
  { id: 'open', weight: 5 },
];

// Progress for a step that is `fraction` done. Floors the percent so 100% only shows at the very end.
function mvProgress(stepId, fraction) {
  const i = MV_BUILD_STEPS.findIndex(s => s.id === stepId);
  if (i < 0) throw new Error('unknown build step ' + stepId);
  const total = MV_BUILD_STEPS.reduce((a, s) => a + s.weight, 0);
  const before = MV_BUILD_STEPS.slice(0, i).reduce((a, s) => a + s.weight, 0);
  const f = Math.min(1, Math.max(0, Number(fraction) || 0));
  const value = (before + MV_BUILD_STEPS[i].weight * f) / total;
  const percent = Math.floor(value * 100 + 1e-9);
  return { id: stepId, value, percent, current: i };
}
// mv-planner:end

// mv-hook:start
// Hook B helpers (spec 15.2), plain JS outside the planner block: the headless driver (dev/driveAdapter.mjs) loads
// this block next to planner.js, so the panel and the driver compute the same motion bonus and punch frames.
// Motion bonus (15.2 a), only with Beat punch on (off, the search and the plan are exactly as without it): the search
// adds the motion query (mvSearchQueries), whose hits are not shot candidates. Each hit's score is min-max normalised
// over the run's motion hits (0 for the weakest, 1 for the strongest; 0 for all when they are equal), and a role
// candidate gains MV_MOTION_BONUS times the best normalised motion hit on the same clip within MV_MOTION_REACH seconds of
// its centre (the allocator centres a shot on its candidate, so this stands in for the shot's window +/- 0.5 s). The
// bonus is a tie-break: at most 0.1, below the allocator's 0.15 step between roles minus its 0.05 seeded jitter, so it
// never changes the role order, only which of two similar moments of a clip comes first. It is added before the
// planner's seeded tie-break, so a build stays deterministic. A candidate with a bonus also carries `motion` (its
// normalised motion, > 0): the planner opens the video on the best such window (mvAllocate's motion opener), the one
// place where motion outranks the role order. A clip whose only hits are motion hits keeps a stub row
// (rid and sourceDuration, no time or score): the planner skips it as a candidate but still makes the clip's filler
// windows from it.
const MV_MOTION_ROLE = 'motion';
const MV_MOTION_QUERY = 'hands moving, pouring, walking or the camera moving';
const MV_MOTION_BONUS = 0.1;
const MV_MOTION_REACH = 0.75;
// The scene-search queries for a build: the role queries, plus the motion query with Beat punch on.
function mvSearchQueries(queries, punch) {
  return punch ? { ...queries, [MV_MOTION_ROLE]: MV_MOTION_QUERY } : queries;
}
function mvMotionBonus(list) {
  const finite = v => typeof v === 'number' && isFinite(v);
  const hits = {}, rest = [], stubs = {};
  let min = Infinity, max = -Infinity;
  for (const c of list) {
    if (!c || c.role !== MV_MOTION_ROLE) { rest.push(c); continue; }
    if (!stubs[c.rid]) stubs[c.rid] = { rid: c.rid, role: MV_MOTION_ROLE, sourceDuration: c.sourceDuration };
    if (!finite(c.t) || !finite(c.score)) continue;
    (hits[c.rid] = hits[c.rid] || []).push(c);
    min = Math.min(min, c.score); max = Math.max(max, c.score);
  }
  const seen = {};
  for (const c of rest) if (c) seen[c.rid] = true;
  const kept = Object.keys(stubs).filter(rid => !seen[rid]).map(rid => stubs[rid]);
  if (!(max > min)) return rest.concat(kept);
  return rest.map(c => {
    const near = c && hits[c.rid];
    if (!near || !finite(c.t) || !finite(c.score)) return c;
    let motion = 0;
    for (const h of near) if (Math.abs(h.t - c.t) <= MV_MOTION_REACH + 1e-9) motion = Math.max(motion, (h.score - min) / (max - min));
    return motion > 0 ? { ...c, score: c.score + MV_MOTION_BONUS * motion, motion } : c;
  }).concat(kept);
}
// Punch frames (15.2 b): the Draft frames where a Beat punch starts, the bar downbeats of the section (beats 0, 4, 8 ...
// from the section start, which sits on a bar) at the Draft's real fps with the music offset (mvMusicOffset: the frame
// expression of mvSchedule and assemble.js), before videoEnd. opts: { bpm (null without a grid), fps, sectionStart,
// videoEnd }. [] without a grid: every video clip then gets the push-in only. Groove does not change them: punches
// follow the beat grid, not the cuts.
function mvPunchFrames(opts) {
  const bpm = opts.bpm, fps = opts.fps, end = opts.videoEnd;
  if (!(bpm > 0) || !(fps > 0) || !(end > 0)) return [];
  const beat = 60 / bpm, offset = mvMusicOffset(opts.sectionStart, fps), out = [];
  const total = Math.ceil(end / fps / beat);
  for (let b = 0; b <= total; b += 4) {
    const f = b === 0 ? 0 : Math.round((b * beat + offset) * fps);
    if (f < end) out.push(f);
  }
  return out;
}
// mv-hook:end

// The title layout, embedded verbatim from assets/title-lockup.tsx (tests/panel.test.cjs checks it), so the preview
// places every word, sparkle and star with the same code as the Draft's title.
// mv-lockup:start
// Pure layout, shared with the panel preview (which evaluates this block as plain JS).
// Text is measured with the per-font advance tables from presets.json (`metrics`), passed
// in `data.fonts[i].metrics`, so the layout is identical in Node, the panel and the render.
// All lengths are canvas pixels; sizes are relative to the canvas height.
// Items: text {part, text, font, x (left), y (baseline), size (font px), w (advance width), shade (shadow fraction)},
// sparkle/star {part, x, y (centre), size (full height)}; each carries its ink box [x0, y0, x1, y1].
var MV_FACES = {
  "mini-vlog": {
    // No.17's face: tight tracking and a thin same-colour stroke (em) soften the contrast.
    big: { family: "MV Instrument Serif Italic", style: "italic", weight: 400, tracking: -0.05, stroke: 0.01 },
    // DM Serif Display has one weight, so "vlog" reads lighter through a softer drop shadow (`shade`: a fraction of the
    // title's shadow opacity and blur) and a slightly smaller size (mvLayoutMini).
    small: { family: "MV DM Serif Display", style: "normal", weight: 400, shade: 0.6 },
  },
  "day-in-my-life": {
    big: { family: "MV Rounded Bold", style: "normal", weight: 700 },
    tag: { family: "MV Rounded Bold", style: "normal", weight: 700 },
  },
  "small-glimpse": {
    big: { family: "MV Rounded Bold", style: "normal", weight: 700 },
    mono: { family: "MV DM Mono", style: "normal", weight: 400 },
  },
};
// Used only when a family's metrics are missing: a generic 0.56 em advance.
var MV_FALLBACK_METRICS = { unitsPerEm: 1000, xHeight: 500, capHeight: 700, ascent: 720, descent: -220, dots: { i: [150, 650], j: [150, 650] }, advances: {} };
var MV_FIT = 0.6; // max lockup width, fraction of canvas width
// Korean titles. Text with Hangul is never tracked, a spaceless Hangul word is never hyphenated, and a wide character
// (Hangul, kana, CJK, fullwidth) without an advance in the metrics counts as 1 em (Latin keeps the 0.56 em fallback).
var MV_HANGUL_RE = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/;
var MV_WIDE_RE = /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]/;
// The macOS Korean system face per bundled family (by role: serif faces AppleMyungjo, the rest Apple SD Gothic Neo).
var MV_KO_FACES = { "MV Instrument Serif Italic": "AppleMyungjo", "MV DM Serif Display": "AppleMyungjo", "MV Rounded Bold": "Apple SD Gothic Neo", "MV DM Mono": "Apple SD Gothic Neo" };
function mvHasHangul(text) { return MV_HANGUL_RE.test(String(text || "")); }
// The system Korean faces' ink in em: Hangul reaches about 0.86 em above the baseline and 0.12 em below it.
var MV_WIDE_UP = 0.86, MV_WIDE_DOWN = 0.12;
// Where a star or year centres on a line: the x-height band of Latin text, the middle of the ink of wide text.
function mvBand(text, m) {
  return MV_WIDE_RE.test(text) ? (MV_WIDE_UP - MV_WIDE_DOWN) / 2 : m.xHeight / m.unitsPerEm / 2;
}
// A text item's font stack: the bundled face, the Latin fallbacks, then the family's Korean face before the generic one.
function mvFontStack(family) {
  var ko = MV_KO_FACES[family] || "Apple SD Gothic Neo";
  return '"' + family + '", "Helvetica Neue", Arial, "' + ko + '", ' + (ko === "AppleMyungjo" ? "serif" : "sans-serif");
}
var MV_MINI_WIDTH = (0.155 * 1920) / 1080; // "mini" advance width at size 100, fraction of height

function mvFace(data, preset, role) {
  var face = MV_FACES[preset][role];
  var fonts = data && Array.isArray(data.fonts) ? data.fonts : [];
  var m = null;
  for (var i = 0; i < fonts.length; i++) if (fonts[i] && fonts[i].family === face.family && fonts[i].metrics) m = fonts[i].metrics;
  return { family: face.family, style: face.style, weight: face.weight, tracking: face.tracking || 0, stroke: face.stroke || 0, shade: typeof face.shade === "number" ? face.shade : 1, m: m || MV_FALLBACK_METRICS };
}

function mvAdvance(m, ch) {
  var a = m.advances[ch];
  return typeof a === "number" ? a : (MV_WIDE_RE.test(ch) ? 1 : 0.56) * m.unitsPerEm;
}

// Advance width of `text` at `px` (kerning ignored), plus `tracking` em (optional, default 0) between letters
// (CSS letter-spacing also follows the last letter, but that space is never visible).
function mvTextWidth(text, m, px, tracking = 0) {
  var units = 0;
  for (var i = 0; i < text.length; i++) units += mvAdvance(m, text.charAt(i));
  return (units * px) / m.unitsPerEm + (tracking || 0) * px * Math.max(0, text.length - 1);
}

// Ink extents above / below the baseline in em, from the characters present. Wide characters (Hangul) reach the ascent
// and sit a little below the baseline, so they count like capitals and descenders.
function mvInk(text, m) {
  var up = m.xHeight, down = 0, wide = MV_WIDE_RE.test(text);
  if (/[A-Z0-9bdfhklt\u00c0-\u00de\u00df!?'"&%$#@/\\|(){}[\]]/.test(text)) up = Math.max(up, m.ascent, m.capHeight);
  else if (/[ij]/.test(text)) up = Math.max(up, m.dots.i[1] + 0.07 * m.unitsPerEm);
  if (/[gjpqy,;()[\]{}|]/.test(text)) down = -m.descent;
  if (wide) { up = Math.max(up, MV_WIDE_UP * m.unitsPerEm); down = Math.max(down, MV_WIDE_DOWN * m.unitsPerEm); }
  return { up: up / m.unitsPerEm, down: down / m.unitsPerEm };
}

// Boxes span the advance width (plus half the stroke, which grows outward), not the ink:
// an italic's overhang can reach past box[2]. `tracking` and `stroke` are px for the SVG.
function mvText(part, text, f, x, y, size, color) {
  if (f.tracking && mvHasHangul(text)) f = Object.assign({}, f, { tracking: 0 });
  var w = mvTextWidth(text, f.m, size, f.tracking), ink = mvInk(text, f.m), s = f.stroke * size, h = s / 2;
  return { kind: "text", part: part, text: text, font: { family: f.family, style: f.style, weight: f.weight }, x: x, y: y, size: size, color: color, w: w,
    tracking: f.tracking * size, stroke: s, shade: f.shade, box: [x - h, y - ink.up * size - h, x + w + h, y + ink.down * size + h] };
}

function mvMark(kind, part, x, y, size, color) {
  return { kind: kind, part: part, x: x, y: y, size: size, color: color, box: [x - size / 2, y - size / 2, x + size / 2, y + size / 2] };
}

// [x0, y0, x1, y1] around every item's ink box.
function mvLockupBounds(items) {
  var b = [Infinity, Infinity, -Infinity, -Infinity];
  for (var i = 0; i < items.length; i++) {
    var q = items[i].box;
    b = [Math.min(b[0], q[0]), Math.min(b[1], q[1]), Math.max(b[2], q[2]), Math.max(b[3], q[3])];
  }
  return b;
}

// Split at the space nearest the middle; without a space, at the middle with a hyphen (never in a wide-character word,
// which stays on one line).
function mvSplit(text, hyphen) {
  var mid = text.length / 2, at = -1;
  for (var i = 0; i < text.length; i++) if (text.charAt(i) === " " && (at < 0 || Math.abs(i - mid) < Math.abs(at - mid))) at = i;
  if (at > 0) return [text.slice(0, at).trim(), text.slice(at + 1).trim()];
  if (!hyphen || MV_WIDE_RE.test(text)) return [text];
  var cut = Math.ceil(text.length / 2);
  return [text.slice(0, cut) + "-", text.slice(cut)];
}

// "Mini vlog" (No.17): italic big word, sparkles over up to three i/j, upright small word under it.
function mvLayoutMini(data, fields, H, S, col) {
  var fb = mvFace(data, "mini-vlog", "big"), fs = mvFace(data, "mini-vlog", "small"), mb = fb.m;
  var items = [];
  // Footprint wins over x-height: at size 100 "mini" is 0.155 of a 16:9 canvas's width
  // (No.17 measures ~290-300 px at 1920x1080), expressed relative to the height.
  var Fb = ((MV_MINI_WIDTH * H) / mvTextWidth("mini", mb, 1, fb.tracking)) * S, xh = mb.xHeight / mb.unitsPerEm;
  // The big word's tracking: none on Hangul (the size above still comes from the tracked "mini").
  var tb = mvHasHangul(fields.big) ? 0 : fb.tracking;
  // Sparkled i/j are drawn dotless when the font has the glyph, so the sparkle replaces the dot.
  var chars = fields.big.split(""), marks = [];
  for (var i = 0; i < chars.length && marks.length < (data.sparkles === false ? 0 : 3); i++) {
    var ch = chars[i];
    if (ch !== "i" && ch !== "j") continue;
    marks.push(i);
    var dotless = ch === "i" ? "\u0131" : "\u0237";
    if (typeof mb.advances[dotless] === "number") chars[i] = dotless;
  }
  var bigText = chars.join("");
  var wb = mvTextWidth(bigText, mb, Fb, tb);
  var big = mvText("big", bigText, fb, -wb / 2, 0, Fb, col.primary);
  items.push(big);
  var spark = 0.36 * xh * Fb;
  for (var k = 0; k < marks.length; k++) {
    var letter = fields.big.charAt(marks[k]), stem = mb.stems && mb.stems[letter];
    var dot = mb.dots[letter] || mb.dots.i;
    // Pen position of the letter: advances plus the tracking after each earlier letter.
    var pen = big.x + mvTextWidth(bigText.slice(0, marks[k]), mb, Fb) + tb * Fb * marks[k];
    var px, py;
    if (bigText.charAt(marks[k]) !== letter && stem) {
      // Dotless letter: the sparkle sits on its stem top, its bottom 0.12 x-height above it.
      px = pen + (stem[0] / mb.unitsPerEm) * Fb;
      py = -(stem[1] / mb.unitsPerEm + 0.12 * xh) * Fb - spark / 2;
    } else {
      px = pen + (dot[0] / mb.unitsPerEm) * Fb;
      py = -(dot[1] / mb.unitsPerEm) * Fb;
      // A letter that kept its dot (no dotless glyph) gets the sparkle above the dot.
      if (bigText.charAt(marks[k]) === letter) py = -((dot[1] + (dot[2] || 0.06 * mb.unitsPerEm)) / mb.unitsPerEm) * Fb - 0.03 * Fb - spark / 2;
    }
    items.push(mvMark("sparkle", "sparkle", px, py, spark, col.primary));
  }
  if (data.sparkles !== false && marks.length === 0) {
    // Hangul in the italic preset is slanted by the renderer past its advance box, so its sparkle moves further right.
    items.push(mvMark("sparkle", "sparkle", big.box[2] + (mvHasHangul(bigText) ? 0.2 : 0.04) * Fb, big.box[1] - 0.06 * Fb, spark, col.primary));
  }
  if (fields.small) {
    // "vlog" is 43 % of "mini"'s width in No.17; 41 % (5 % smaller) keeps the one-weight face from reading heavy.
    // Kept as a font-size ratio for other words.
    var ms = fs.m;
    var Fs = (Fb * 0.41 * mvTextWidth("mini", mb, 1, fb.tracking)) / mvTextWidth("vlog", ms, 1);
    var ws = mvTextWidth(fields.small, ms, Fs), inkS = mvInk(fields.small, ms);
    var y2 = big.box[3] + 0.03 * Fb + inkS.up * Fs;
    items.push(mvText("small", fields.small, fs, -ws / 2, y2, Fs, col.secondary));
  }
  return items;
}

// "A day in my life": [star year] big line 1 / big line 2 [two-line tag star], rows right-aligned.
function mvLayoutDay(data, fields, H, S, col) {
  var fb = mvFace(data, "day-in-my-life", "big"), ft = mvFace(data, "day-in-my-life", "tag"), m = fb.m;
  var accents = data.sparkles !== false;
  var Fb = ((0.07 * H) / (m.xHeight / m.unitsPerEm)) * S, Fy = 0.36 * Fb, Ft = 0.28 * Fb;
  var xh = m.xHeight / m.unitsPerEm, cap = m.capHeight / m.unitsPerEm, xhT = ft.m.xHeight / ft.m.unitsPerEm;
  var lines = mvSplit(fields.big, false);
  var l1 = lines.length > 1 ? lines[0] : "", l2 = lines.length > 1 ? lines[1] : lines[0];
  var row1 = [], row2 = [];
  // Row 1: star + year centred on the big line's x-height band, then the first big line.
  var y1 = 0, band1 = y1 - mvBand(l1 || l2, m) * Fb, x = 0;
  if (fields.year) {
    // The star only takes room when it is drawn.
    if (accents) {
      var sy = 0.3 * Fb;
      row1.push(mvMark("star", "star", x + sy / 2, band1, sy, col.secondary));
      x += sy + 0.06 * Fb;
    }
    var year = mvText("year", fields.year, fb, x, band1 + (cap * Fy) / 2, Fy, col.secondary);
    row1.push(year);
    x = year.box[2] + 0.12 * Fb;
  }
  var inkBottom1 = 0;
  if (l1) {
    var b1 = mvText("big1", l1, fb, x, y1, Fb, col.primary);
    row1.push(b1);
    inkBottom1 = b1.box[3];
  }
  // Row 2: tight under row 1 (ink to ink), big line then the tag centred on its x-height band.
  var y2 = inkBottom1 + 0.05 * Fb + mvInk(l2, m).up * Fb;
  if (!l1 && fields.year) y2 = Math.max(y2, y1 + 0.7 * Fb);
  var b2 = mvText("big2", l2, fb, 0, y2, Fb, col.primary);
  row2.push(b2);
  if (fields.tag) {
    var tag = mvSplit(fields.tag, false), band2 = y2 - mvBand(l2, m) * Fb, tx = b2.box[2] + 0.08 * Fb;
    var lead = 1.2 * Ft;
    // Two lines: the block (line 1 x-height top to line 2 baseline) is centred on the band.
    var t1y = tag.length > 1 ? band2 - (lead - xhT * Ft) / 2 : band2 + (xhT * Ft) / 2;
    var t1 = mvText("tag1", tag[0], ft, tx, t1y, Ft, col.secondary);
    row2.push(t1);
    if (tag.length > 1) row2.push(mvText("tag2", tag[1], ft, tx, t1y + lead, Ft, col.secondary));
    if (accents) {
      var st = 0.2 * Fb;
      row2.push(mvMark("star", "star", t1.box[2] + 0.05 * Fb + st / 2, band2, st, col.secondary));
    }
  }
  // Right-align the rows (a lone year row stays left-aligned over the big word).
  var r1 = row1.length ? mvLockupBounds(row1)[2] : 0, r2 = mvLockupBounds(row2)[2], right = Math.max(r1, r2);
  var shift1 = l1 ? right - r1 : mvLockupBounds(row2)[0] - (row1.length ? mvLockupBounds(row1)[0] : 0), shift2 = right - r2;
  return mvShift(row1, shift1, 0).concat(mvShift(row2, shift2, 0));
}

// "A small glimpse": tiny mono top line / big word split in two with a star before line 2 / tiny mono bottom line.
function mvLayoutGlimpse(data, fields, H, S, col) {
  var fb = mvFace(data, "small-glimpse", "big"), fm = mvFace(data, "small-glimpse", "mono"), m = fb.m;
  var Fb = ((0.075 * H) / (m.xHeight / m.unitsPerEm)) * S, Fm = 0.25 * Fb, xh = m.xHeight / m.unitsPerEm;
  var word = fields.big;
  var lines = word.replace(/\s/g, "").length <= 3 ? [word] : mvSplit(word, true);
  var items = [], first = null, last;
  if (lines.length > 1) {
    first = mvText("big1", lines[0], fb, 0, 0, Fb, col.primary);
    items.push(first);
  }
  var up2 = mvInk(lines[lines.length - 1], m).up;
  var y2 = first ? 0.66 * Fb + Math.max(0, (up2 - xh) * Fb) : 0;
  var starD = 0.4 * Fb;
  if (data.sparkles !== false) items.push(mvMark("star", "star", 0.2 * Fb, y2 - mvBand(lines[lines.length - 1], m) * Fb, starD, col.secondary));
  last = mvText("big2", lines[lines.length - 1], fb, 0.5 * Fb, y2, Fb, col.primary);
  items.push(last);
  var topLine = first || last;
  if (fields.top) items.push(mvText("top", fields.top, fm, topLine.x + 0.1 * Fb, topLine.box[1] - 0.22 * Fb, Fm, col.secondary));
  if (fields.bottom) items.push(mvText("bottom", fields.bottom, fm, last.x + 0.75 * last.w, y2 + 0.34 * Fb, Fm, col.secondary));
  return items;
}

function mvShift(items, dx, dy) {
  return items.map(function (it) {
    return Object.assign({}, it, { x: it.x + dx, y: it.y + dy, box: [it.box[0] + dx, it.box[1] + dy, it.box[2] + dx, it.box[3] + dy] });
  });
}

function mvLockupLayout(data, width, height) {
  data = data || {};
  var W = width > 0 ? width : 1920, H = height > 0 ? height : 1080;
  var preset = MV_FACES[data.preset] ? data.preset : "mini-vlog";
  var raw = data.fields || {};
  // Adjust edits land on flat keys (data.big, data.small, ...), so a flat string wins over data.fields.
  var pick = function (k) { var v = typeof data[k] === "string" ? data[k] : raw[k]; return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : ""; };
  var fields = { big: pick("big"), small: pick("small"), tag: pick("tag"), year: pick("year"), top: pick("top"), bottom: pick("bottom") };
  if (!fields.big) return [];
  var num = function (v, d, lo, hi) { return typeof v === "number" && isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
  var S = num(data.size, 100, 60, 160) / 100;
  var col = {
    primary: typeof data.primary === "string" && data.primary ? data.primary : "#F7C8E6",
    secondary: typeof data.secondary === "string" && data.secondary ? data.secondary : "#FFFFFF",
  };
  var items = preset === "day-in-my-life" ? mvLayoutDay(data, fields, H, S, col)
    : preset === "small-glimpse" ? mvLayoutGlimpse(data, fields, H, S, col)
    : mvLayoutMini(data, fields, H, S, col);
  // Shrink the whole lockup to the max width, then centre its ink box on the anchor.
  var b = mvLockupBounds(items);
  var k = Math.min(1, (MV_FIT * W) / (b[2] - b[0]));
  var cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
  var ax = (num(data.x, 49, 20, 80) / 100) * W, ay = (num(data.y, 52, 20, 80) / 100) * H;
  var tx = function (v) { return ax + (v - cx) * k; }, ty = function (v) { return ay + (v - cy) * k; };
  return items.map(function (it) {
    var o = Object.assign({}, it, { x: tx(it.x), y: ty(it.y), size: it.size * k, box: [tx(it.box[0]), ty(it.box[1]), tx(it.box[2]), ty(it.box[3])] });
    if (typeof it.w === "number") { o.w = it.w * k; o.tracking = it.tracking * k; o.stroke = it.stroke * k; }
    return o;
  });
}

// Items grouped by shade in first-appearance order ([{ shade, items }]); marks carry the full shadow (1). Each group
// is drawn as its own SVG with the title's drop shadow scaled by its shade.
function mvShadeLayers(items) {
  var layers = [];
  for (var i = 0; i < items.length; i++) {
    var sh = typeof items[i].shade === "number" ? items[i].shade : 1, at = -1;
    for (var j = 0; j < layers.length; j++) if (layers[j].shade === sh) at = j;
    if (at < 0) { layers.push({ shade: sh, items: [] }); at = layers.length - 1; }
    layers[at].items.push(items[i]);
  }
  return layers;
}

function mvF(v) { return Math.round(v * 100) / 100; }

// Four-point sparkle (concave sides) centred on (cx, cy), `size` tall and wide.
function mvSparklePath(cx, cy, size) {
  var r = size / 2, c = r * 0.14;
  return "M" + mvF(cx) + " " + mvF(cy - r)
    + " Q" + mvF(cx + c) + " " + mvF(cy - c) + " " + mvF(cx + r) + " " + mvF(cy)
    + " Q" + mvF(cx + c) + " " + mvF(cy + c) + " " + mvF(cx) + " " + mvF(cy + r)
    + " Q" + mvF(cx - c) + " " + mvF(cy + c) + " " + mvF(cx - r) + " " + mvF(cy)
    + " Q" + mvF(cx - c) + " " + mvF(cy - c) + " " + mvF(cx) + " " + mvF(cy - r) + " Z";
}

// Five-point star centred on (cx, cy), `size` across the outer points.
function mvStarPath(cx, cy, size) {
  var R = size / 2, r = R * 0.45, d = "";
  for (var i = 0; i < 10; i++) {
    var a = -Math.PI / 2 + (i * Math.PI) / 5, rad = i % 2 ? r : R;
    // Nudge down so the star's visual centre (not its top point) sits on cy.
    d += (i ? " L" : "M") + mvF(cx + rad * Math.cos(a)) + " " + mvF(cy + rad * Math.sin(a) + R * 0.05);
  }
  return d + " Z";
}
// mv-lockup:end

// Why a plan cannot be built (planner mvPlanBuild reasons). English for dev/driveAdapter.mjs; the panel says STRINGS
// `fail.<reason>` in the UI language (`noPlan` for a reason not listed here).
const MV_FAIL: Record<string, string> = {
  "one-resource": "Add at least 2 clips or photos",
  "too-few": "Your footage fits fewer than 4 shots",
  "music-too-short": "This track is too short for 4 shots from this section",
};

// Double quotes let $HOME and $SELECTS_USER_SKILLS_ROOT expand: use only for those constants.
function dq(value: string) { return '"' + String(value).replace(/(["\\`])/g, "\\$1") + '"'; }
// Single quotes pass user paths to the shell literally (no $, backtick or glob expansion).
function sq(value: string) { return "'" + String(value).replace(/'/g, "'\\''") + "'"; }
function service(name: string, method: string) {
  const s = (window.parent as any)?.__DI__?.[name];
  if (!s || typeof s[method] !== "function") throw uiError((l) => t(l, "adapterNeeded", { name }));
  return s;
}
async function readText(root: string, rel: string) {
  const v = await service("FileSystem", "readFile").readFile(root + "/" + rel);
  // Some host builds return text directly; others return bytes.
  return typeof v === "string" ? v : new TextDecoder().decode(new Uint8Array(v));
}
// The config goes in as JSON.parse of a string so its type is `any`: an inlined literal widens `type` to string
// (rejected by EditableParameterDefinition[]) and narrows a null option to `never` inside its `if`.
function fill(script: string, cfg: unknown) { return script.replace("__CONFIG__", () => "JSON.parse(" + JSON.stringify(JSON.stringify(cfg)) + ")"); }
// Apps started from Finder get a bare PATH, so shell steps also look in Homebrew and the newest nvm Node.
const TOOL_PATH = 'export PATH="$PATH:/opt/homebrew/bin:/usr/local/bin"; '
  + 'n=$( (ls -d "$HOME"/.nvm/versions/node/*/bin) 2>/dev/null | sort -V | tail -1); [ -n "$n" ] && export PATH="$PATH:$n"; ';
// Thrown when the Project changed while a build was running; its results are dropped silently.
const STALE = new Error("The Project changed during the build.");
// A read-only call that still failed with a host-busy / deadline error after its retries.
const isBusyError = (text: string) => /deadline|did not finish|hostWaitMs|before the script started/i.test(text);
class BusyError extends Error {
  say: Say;
  constructor() { super("Selects is busy and didn't answer in time."); this.say = (l) => t(l, "busy"); }
}

// A preset's fonts, one per family (a family may serve two roles), with the advance metrics the layout measures with.
function presetFonts(p: any, all: any) {
  const seen = new Set<string>();
  return (p?.fonts || []).filter((x: any) => !seen.has(x.family) && !!seen.add(x.family))
    .map((x: any) => ({ role: x.role, family: x.family, style: x.style, weight: x.weight, file: x.file, metrics: all?.metrics?.[x.family] || null }));
}
// The `@year` token's text: the current year when the panel shows the field (recording dates never set it, since
// imported or stock footage can be years old). dev/driveAdapter.mjs evaluates this same function.
function mvCurrentYear() { return String(new Date().getFullYear()); }
// Preview geometry: a fixed-height box showing the middle of the frame, where the lockup sits (at most 60 % of the
// width, centred at 49 / 52 %), so the box never changes height while typing or switching presets.
const PREVIEW_HEIGHT = 112;
const PREVIEW_VIEW = [0.15 * MV_W, 0.2 * MV_H, 0.7 * MV_W, 0.64 * MV_H].join(" ");

// The photo rids a build uses: the selected photos (all when `onlyPhotos` is null), none while Use photos is off.
function selectedPhotoRidsOf(inventory: any, onlyPhotos: string[] | null, usePhotos: boolean): string[] {
  if (!usePhotos || !inventory) return [];
  return (inventory.photos || []).map((r: any) => r.rid as string).filter((rid: string) => !onlyPhotos || onlyPhotos.includes(rid));
}
// Photo candidates for the planner. With Use photos off there are none: the planner never sees a photo.
function photoCandsOf(inventory: any, onlyPhotos: string[] | null, usePhotos: boolean) {
  return selectedPhotoRidsOf(inventory, onlyPhotos, usePhotos).map((rid) => ({ rid, kind: "photo" }));
}
// A short orientation hint for the clip list (STRINGS `shape.<hint>`); "" when the frame size is unknown.
function shapeHint(width: number | null, height: number | null) {
  if (!(width! > 0) || !(height! > 0)) return "";
  const r = width! / height!;
  return r < 0.9 ? "tall" : r > 1.1 ? "wide" : "square";
}
function fmtTime(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}
// Local date and time for the Draft name, to the second so a lost reply can find exactly this Draft.
function stamp(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
}
// Resolves a --panel-* colour for canvas drawing; falls back when the token is missing or not a colour.
function themeColor(el: Element, ctx: CanvasRenderingContext2D, name: string, fallback: string) {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  if (!v) return fallback;
  ctx.fillStyle = "#010203";
  ctx.fillStyle = v;
  return ctx.fillStyle === "#010203" ? fallback : v;
}
const WAVE_HEIGHT = 56;

// Music section slider: waveform on a canvas with a draggable, snapped window over the chosen section.
// While `audio` plays, a playhead follows its currentTime inside the window, redrawn on every animation frame.
// Videos without analysis, from inventory.js's skipped counts: being analysed now, not analysed yet (never started; the
// panel does not start analysis), or failed. known is false when the workflow read failed: pending clips then may or
// may not be queued, so their wording is neutral and the panel keeps polling.
function mvAnalysisCounts(skipped: any) {
  const s = skipped || {}, total = s.unanalysed || 0;
  if (s.analysing == null) return { total, analysing: 0, notAnalysed: total, failed: 0, known: false };
  return { total, analysing: s.analysing || 0, notAnalysed: s.notAnalysed || 0, failed: s.failed || 0, known: s.statusKnown !== false };
}
// The sentences for the readiness line in the UI language ("" when every video is analysed).
function mvAnalysisText(lang: Lang, c: any) {
  return [
    c.analysing ? t(lang, "analysing", { count: c.analysing }) : "",
    c.notAnalysed ? (c.known ? t(lang, "notAnalysedAnalyse", { count: c.notAnalysed }) : t(lang, "notAnalysedMaybe", { count: c.notAnalysed })) : "",
    c.failed ? t(lang, "analysisFailed", { count: c.failed }) : "",
  ].filter(Boolean).join(t(lang, "gap"));
}
// The short facts for the end of the Ready line ("" for a count of 0).
function mvAnalysisNotes(lang: Lang, c: any) {
  return [c.analysing ? t(lang, "noteAnalysing", { count: c.analysing }) : "", c.notAnalysed ? t(lang, "notAnalysed", { count: c.notAnalysed }) : "",
    c.failed ? t(lang, "noteFailed", { count: c.failed }) : ""];
}

function SectionSlider({ lang, peaks, total, section, videoSeconds, barSeconds, snap, onChange, disabled, audio }: {
  lang: Lang; peaks: number[]; total: number; section: number | null; videoSeconds: number; barSeconds: number;
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
  // The latest draw, so the animation loop always paints with the current props. `playAt` is seconds into the section.
  const drawRef = React.useRef<(playAt: number | null) => void>(() => {});
  drawRef.current = (playAt: number | null) => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap || width <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    const cw = Math.round(width * dpr), chh = Math.round(WAVE_HEIGHT * dpr);
    if (canvas.width !== cw) canvas.width = cw;
    if (canvas.height !== chh) canvas.height = chh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, WAVE_HEIGHT);
    const accent = themeColor(wrap, ctx, "--panel-accent", "#f6c343");
    const muted = themeColor(wrap, ctx, "--panel-muted-fg", "#8a8a8a");
    const mid = WAVE_HEIGHT / 2;
    const x0 = section == null ? -1 : (section / total) * width;
    const x1 = section == null ? -1 : Math.min(width, ((section + videoSeconds) / total) * width);
    const inside = (x: number) => x >= x0 && x <= x1;
    // Selected window: translucent fill under the bars.
    if (section != null) {
      ctx.globalAlpha = 0.18; ctx.fillStyle = accent;
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
      }
      const h = Math.max(1, (p / peakMax) * (mid - 3));
      const on = inside(x + barW / 2);
      ctx.globalAlpha = on ? 1 : 0.4; ctx.fillStyle = on ? accent : muted;
      ctx.fillRect(x, mid - h, barW, h * 2);
    }
    ctx.globalAlpha = 1;
    // Window border and two grip handles so it reads as draggable.
    if (section != null) {
      const w = Math.max(2, x1 - x0);
      ctx.strokeStyle = accent; ctx.lineWidth = 1.5;
      ctx.strokeRect(x0 + 0.75, 0.75, Math.max(0.5, w - 1.5), WAVE_HEIGHT - 1.5);
      ctx.fillStyle = accent;
      const gh = Math.min(18, WAVE_HEIGHT * 0.4), gw = 4;
      for (const gx of [x0 + 1, x0 + w - 1 - gw]) {
        ctx.beginPath();
        if ((ctx as any).roundRect) (ctx as any).roundRect(gx, mid - gh / 2, gw, gh, 2); else ctx.rect(gx, mid - gh / 2, gw, gh);
        ctx.fill();
      }
      // Playhead: a vertical line at the playing position, kept inside the window.
      if (playAt != null) {
        const px = Math.min(x0 + w - 1, Math.max(x0 + 1, ((section + Math.min(playAt, videoSeconds)) / total) * width));
        ctx.fillStyle = themeColor(wrap, ctx, "--panel-fg", "#ffffff");
        ctx.fillRect(px - 1, 0, 2, WAVE_HEIGHT);
      }
    }
  };
  React.useEffect(() => { if (!audio) drawRef.current(null); }, [width, peaks, peakMax, section, videoSeconds, total, audio]);
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
    const t = timeAt(e.clientX);
    const s = section ?? 0;
    // Grabbing the window keeps the grab point; anywhere else centres the window there.
    const offset = section != null && t >= s && t <= s + videoSeconds ? t - s : videoSeconds / 2;
    dragRef.current = { offset };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
    setDragging(true);
    onChange(snap(t - offset));
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    onChange(snap(timeAt(e.clientX) - dragRef.current.offset));
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    if (e.type === "pointerup") onChange(snap(timeAt(e.clientX) - dragRef.current.offset));
    dragRef.current = null; setDragging(false);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* already released */ }
  };
  const first = snap(0), last = snap(total);
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled || section == null) return;
    let next: number | null | undefined;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = snap(section - barSeconds);
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") next = snap(section + barSeconds);
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
          boxShadow: focused ? "0 0 0 2px var(--panel-accent, #f6c343)" : "inset 0 0 0 1px var(--panel-border, rgba(128, 128, 128, 0.35))", opacity: disabled ? 0.6 : 1 }}>
        <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: WAVE_HEIGHT, pointerEvents: "none" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--panel-muted-fg)", fontVariantNumeric: "tabular-nums", marginTop: 2 }}>
        <span>0:00</span><span>{fmtTime(total)}</span>
      </div>
    </div>
  );
}

export default function Panel({ sdk, context, ui }: any) {
  // The UI language, read on every render: Selects can switch languages while the panel is open.
  const L = uiLang(context);
  // The language at Build: Inspector labels written into the Draft use it and do not follow a later switch.
  const langRef = React.useRef(L);
  langRef.current = L;
  const projectId = context?.projectId ?? null;
  const projectRef = React.useRef(projectId);
  projectRef.current = projectId;
  const [roots, setRoots] = React.useState<{ plugin: string; data: string } | null>(null);
  const [assets, setAssets] = React.useState<any>(null);
  const [inventory, setInventory] = React.useState<any>(null);
  const [candidates, setCandidates] = React.useState<any>(null);
  const [preset, setPreset] = React.useState(DEFAULT_PRESET);
  // Title text per preset ({ presetId: { fieldKey: text } }); a field not in here shows its preset's initial text.
  // Switching presets never overwrites another preset's edits.
  const [fieldsBy, setFieldsBy] = React.useState<Record<string, Record<string, string>>>({});
  // cueId: a manifest cue id, "own" (your own music) or "none" (No music).
  const [cueId, setCueId] = React.useState(DEFAULT_CUE);
  const cueDefaultedRef = React.useRef(false);
  const [ownMusic, setOwnMusic] = React.useState<{ path: string; name: string } | null>(null);
  const [ownGrid, setOwnGrid] = React.useState<any>(null);
  const [length, setLength] = React.useState<"short" | "standard" | "long">(DEFAULT_LENGTH);
  const [pace, setPace] = React.useState<"quick" | "relaxed" | "groove">(DEFAULT_PACE);
  // Hook B (spec 15): Beat punch on every video clip, and the music section defaulting to the track's hook window
  // (bundled tracks only). Both on by default, and both stay toggles.
  const [beatPunch, setBeatPunch] = React.useState(DEFAULT_PUNCH);
  const [hook, setHook] = React.useState(DEFAULT_HOOK);
  // Clip sound: the clips' own sound is off (muted), ambient (-18 dB under the music) or full (0 dB).
  const [clipSound, setClipSound] = React.useState<"off" | "ambient" | "full">("ambient");
  const [soft, setSoft] = React.useState(true);
  const [only, setOnly] = React.useState<string[] | null>(null);
  // Photos: on by default. `onlyPhotos` is the photo selection (null = all); `only` stays the video selection, so
  // choosing photos never invalidates the scene search.
  const [usePhotos, setUsePhotos] = React.useState(true);
  const [onlyPhotos, setOnlyPhotos] = React.useState<string[] | null>(null);
  const [section, setSection] = React.useState<number | null>(0);
  const [seed, setSeed] = React.useState(1);
  const [busy, setBusy] = React.useState(false);
  // Single-flight guard: state updates are async, so a ref blocks a second click in the same tick.
  const busyRef = React.useRef(false);
  // The one-call spinner's text: "checkingClips", "listening" (STRINGS keys) or "".
  const [step, setStep] = React.useState("");
  const [tools, setTools] = React.useState({ ffmpeg: true, node: true });
  const fontCache = React.useRef<Record<string, Promise<string>>>({});
  const registered = React.useRef<Set<string>>(new Set());
  // Build progress (bar + step list). `step` stays for the one-call spinner (own-music beat detection).
  const [progress, setProgress] = React.useState<any>(null);
  const progressRef = React.useRef<any>(null);
  // `detail` is a message in the UI language (e.g. how many videos were checked).
  const advance = (id: string, fraction: number, detail?: Say) => { const p = { ...mvProgress(id, fraction), detail }; progressRef.current = p; setProgress(p); };
  const [status, setStatus] = React.useState<{ tone: string; say: Say } | null>(null);
  const [result, setResult] = React.useState<any>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const previewTokenRef = React.useRef(0);
  const previewUrlRef = React.useRef<string | null>(null);
  const [playState, setPlayState] = React.useState<"idle" | "loading" | "playing">("idle");
  const [playingAudio, setPlayingAudio] = React.useState<HTMLAudioElement | null>(null);

  // `script` may depend on the attempt (0 first, then each retry), so a retry can ask for less work.
  // opts.wanted: a read retries only while this is true (the Project did not change, the panel is still open).
  const run = async (summary: string, script: string | ((attempt: number) => string), allowCommit = false, opts: { wanted?: () => boolean } = {}) => {
    const scriptAt = (n: number) => (typeof script === "string" ? script : script(n));
    const send = (attempt: number) => sdk.runScript(allowCommit ? { summary, script: scriptAt(0), allowCommit } : { summary, script: scriptAt(attempt), allowCommit, timeoutSeconds: READ_TIMEOUT_SECONDS });
    let r = await send(0);
    // Only a lost session is resent, and never a committing call: its commit may already have landed.
    if (r.isError && !allowCommit && /No valid session ID/.test(r.output || "")) { await new Promise((d) => setTimeout(d, 1500)); r = await send(0); }
    // A busy app: a read is tried again after 5 s, then 15 s, one attempt at a time.
    let attempt = 0;
    while (r.isError && !allowCommit && isBusyError(String(r.output || "")) && attempt < BUSY_BACKOFF_MS.length) {
      attempt++;
      await new Promise((d) => setTimeout(d, BUSY_BACKOFF_MS[attempt - 1]));
      if (opts.wanted && !opts.wanted()) break;
      r = await send(attempt);
    }
    if (r.isError && !allowCommit && isBusyError(String(r.output || ""))) throw new BusyError();
    if (r.isError || r.result == null) throw r.output ? new Error(r.output) : uiError((l) => t(l, "stepFailed"));
    return r.result as any;
  };
  const fontB64 = (plugin: string, file: string) => {
    if (!fontCache.current[file]) {
      fontCache.current[file] = readText(plugin, "assets/fonts/" + file)
        .then((t) => t.replace(/\s+/g, ""))
        .catch((e) => { delete fontCache.current[file]; throw e; });
    }
    return fontCache.current[file];
  };
  // Registers a bundled font in this panel's document for the preset tiles and the live preview.
  async function registerFace(plugin: string, s: any) {
    const key = s.family + "|" + s.style + "|" + s.weight;
    if (registered.current.has(key) || typeof FontFace === "undefined") return;
    const face = new FontFace(s.family, "url(data:font/woff2;base64," + (await fontB64(plugin, s.file)) + ")", { style: s.style, weight: String(s.weight) });
    await face.load();
    (document as any).fonts.add(face);
    registered.current.add(key);
  }
  const stopAt = (e: any): Say => {
    const at = progressRef.current;
    return (l) => (at ? t(l, "stoppedAt", { step: at.current + 1, total: MV_BUILD_STEPS.length, name: t(l, "step." + at.id), detail: sayError(l, e) }) : sayError(l, e));
  };
  const endRun = (pid: string) => {
    if (projectRef.current !== pid) return;
    busyRef.current = false; setBusy(false); setStep(""); setProgress(null); progressRef.current = null;
  };

  // Inventory bookkeeping: the inventory script, the last clip set seen and a load in flight.
  const inventoryJsRef = React.useRef<string | null>(null);
  const invSigRef = React.useRef<string | null>(null);
  // Photo sizes measured by earlier inventory reads, passed back so a refresh does not measure them again.
  const photoSizesRef = React.useRef<Record<string, { width: number; height: number }>>({});
  const invLoadingRef = React.useRef<string | null>(null);
  const mountedRef = React.useRef(true);
  // The last inventory read's failure (busy: Selects did not answer in time).
  const [invError, setInvError] = React.useState<{ busy?: boolean; say: Say } | null>(null);
  const [invLoading, setInvLoading] = React.useState(false);
  // Consecutive incomplete reads, and whether that count reached INCOMPLETE_POLL_MAX (polling stopped).
  const incompleteReadsRef = React.useRef(0);
  const [incompleteStalled, setIncompleteStalled] = React.useState(false);

  // Reads the Project's footage inventory. Never writes state for a stale Project, and never runs during a build.
  // Resolves to "failed" only when a read ran and failed with a non-busy error (the case worth one quick retry).
  async function loadInventory(pid: string | null = projectRef.current, alive: () => boolean = () => true): Promise<"ok" | "busy" | "failed" | "skipped"> {
    const script = inventoryJsRef.current;
    // One read per Project at a time; a read for another Project never blocks this one.
    if (!pid || !script || busyRef.current || invLoadingRef.current === pid) return "skipped";
    const live = () => mountedRef.current && alive() && projectRef.current === pid;
    invLoadingRef.current = pid; setInvLoading(true);
    try {
      const inv = await run("Read footage", (attempt) => fill(script, { projectId: pid, only: null, known: photoSizesRef.current, measureMs: attempt === 0 ? INVENTORY_MEASURE_MS : 0 }), false, { wanted: live });
      // A build that started meanwhile keeps the clip set it began with; the next refresh picks this up.
      if (!live() || busyRef.current) return "skipped";
      inv.resources = inv.resources || [];
      inv.photos = inv.photos || [];
      for (const ph of inv.photos) if (ph.width > 0 && ph.height > 0) photoSizesRef.current[ph.rid] = { width: ph.width, height: ph.height };
      const sk = inv.skipped || {};
      const sig = inv.resources.map((r: any) => r.rid).sort().join(",") + "|" + [sk.unanalysed, sk.analysing, sk.notAnalysed, sk.failed, sk.statusKnown].map((x) => String(x ?? "")).join(",");
      // A changed clip set drops the cached scene search so a build never uses stale candidates.
      if (invSigRef.current !== sig) { if (invSigRef.current !== null) setCandidates(null); invSigRef.current = sig; }
      if (inv.incomplete) { incompleteReadsRef.current++; if (incompleteReadsRef.current >= INCOMPLETE_POLL_MAX) setIncompleteStalled(true); }
      else { incompleteReadsRef.current = 0; setIncompleteStalled(false); }
      setInventory(inv); setInvError(null);
      return "ok";
    } catch (e: any) {
      if (!(e instanceof BusyError)) console.warn("Mini Vlog: reading the Project's clips failed", e);
      if (live()) setInvError(e instanceof BusyError ? { busy: true, say: e.say } : { say: (l: Lang) => sayError(l, e) });
      return e instanceof BusyError ? "busy" : "failed";
    } finally {
      if (invLoadingRef.current === pid) invLoadingRef.current = null;
      if (mountedRef.current && projectRef.current === pid) setInvLoading(false);
    }
  }
  React.useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  // Refresh: a manual read that also restarts the incomplete-read cycle.
  const refreshInventory = () => { incompleteReadsRef.current = 0; setIncompleteStalled(false); loadInventory(); };

  // Mount and Project switch: reset per-Project state, resolve folders, read bundled assets, inventory the Project.
  React.useEffect(() => {
    // Drop everything tied to the previous Project so a build never mixes Projects.
    setCandidates(null); setResult(null); setStatus(null); setInventory(null); setInvError(null); setInvLoading(false);
    setOnly(null); setOnlyPhotos(null);
    invSigRef.current = null; photoSizesRef.current = {}; incompleteReadsRef.current = 0; setIncompleteStalled(false);
    busyRef.current = false; setBusy(false); setStep(""); setProgress(null); progressRef.current = null;
    if (!projectId) return;
    let alive = true;
    (async () => {
      try {
        const where = await sdk.runShell({ summary: "Locate plugin folders", command: "mkdir -p " + dq(DATA_DIR) + " && printf '%s\\n%s' " + dq(SKILLS_DIR) + " " + dq(DATA_DIR), timeoutMs: 10000 });
        const [plugin, data] = String(where?.stdout || "").split("\n").map((x) => x.trim());
        if (!plugin || !data) throw uiError((l) => t(l, "foldersNotFound"));
        if (!alive) return;
        setRoots({ plugin, data });
        // ffmpeg and node are only needed for previews and own music; bundled cues work without them.
        let have = "";
        try {
          const probe = await sdk.runShell({ summary: "Check music tools", command: TOOL_PATH + "command -v ffmpeg >/dev/null && echo ffmpeg; command -v node >/dev/null && echo node", timeoutMs: 10000 });
          have = String(probe?.stdout || "");
        } catch { have = ""; }
        if (!alive) return;
        setTools({ ffmpeg: have.includes("ffmpeg"), node: have.includes("node") });
        const read = (rel: string) => readText(plugin, rel);
        const [manifest, presets, inventoryJs, searchJs, ensureJs, assembleJs, decorateJs, titleTsx, softTsx, motionTsx, punchTsx] = await Promise.all([
          read("assets/cues/manifest.json"), read("assets/fonts/presets.json"), read("scripts/inventory.js"), read("scripts/search.js"),
          read("scripts/ensure-audio.js"), read("scripts/assemble.js"), read("scripts/decorate.js"), read("assets/title-lockup.tsx"), read("assets/soft-look.tsx"),
          read("assets/photo-motion.tsx"), read("assets/beat-punch.tsx")]);
        if (!alive) return;
        setAssets({ manifest: JSON.parse(manifest), presets: JSON.parse(presets), scripts: { inventoryJs, searchJs, ensureJs, assembleJs, decorateJs }, titleTsx, softTsx, motionTsx, punchTsx });
        inventoryJsRef.current = inventoryJs;
        setStep("checkingClips");
        // The first read right after the app starts can fail while the Project is still loading: one retry.
        if (await loadInventory(projectId, () => alive) === "failed" && alive) {
          await new Promise((d) => setTimeout(d, INVENTORY_RETRY_MS));
          if (alive && projectRef.current === projectId) { setInvError(null); await loadInventory(projectId, () => alive); }
        }
      } catch (e: any) {
        if (alive) setStatus({ tone: "error", say: (l: Lang) => t(l, "startFailed", { detail: sayError(l, e) }) });
      } finally { if (alive) setStep(""); }
    })();
    // Project switch or unmount stops a preview, including one still being prepared.
    return () => { alive = false; stopPreview(); };
  }, [projectId]);

  // Clips being analysed (or no clips at all yet): re-read the inventory every 10 s until they are ready. Clips whose
  // analysis was never started (or failed) do not poll on their own: nothing changes until the user analyses them in
  // Selects, and coming back to the panel or Refresh picks that up. With an unknown status, unanalysed clips poll.
  // The effect re-arms on each new inventory, and stops on unmount, Project switch and while busy.
  // A Project with only photos has nothing to wait for, so it does not poll (each read measures new photos).
  // A partial read (`incomplete`: the Project was still loading) polls too, until the clip sizes are all known.
  const invAnalysis = mvAnalysisCounts(inventory?.skipped);
  const needsPoll = !!inventory && ((!!inventory.incomplete && !incompleteStalled) || invAnalysis.analysing > 0 || (!invAnalysis.known && invAnalysis.total > 0) || (inventory.resources.length === 0 && !inventory.photos?.length && invAnalysis.total === 0));
  React.useEffect(() => {
    if (!projectId || !needsPoll || busy) return;
    const pid = projectId;
    const t = setInterval(() => { loadInventory(pid); }, 10000);
    return () => clearInterval(t);
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

  // Fonts for the tiles and the live preview: every preset's fonts (four small files).
  React.useEffect(() => {
    if (!assets || !roots) return;
    // A font that fails to load only makes the preview fall back; the build reads the files again.
    for (const p of assets.presets.presets) for (const f of p.fonts) registerFace(roots.plugin, f).catch(() => null);
  }, [assets, roots]);
  // The preferred cue becomes the default once, when the manifest has it (a later choice is the user's).
  React.useEffect(() => {
    if (!assets || cueDefaultedRef.current) return;
    cueDefaultedRef.current = true;
    if (assets.manifest.cues.some((c: any) => c.id === PREFERRED_CUE)) setCueId((cur) => (cur === DEFAULT_CUE ? PREFERRED_CUE : cur));
  }, [assets]);

  // ---- Title fields ----
  const presetList: any[] = assets?.presets.presets || [];
  const chosen = presetList.find((x) => x.id === preset) || null;
  // A field's text: the user's edit, else the preset's initial text; the `@year` token becomes the current year.
  const fieldText = (presetId: string, fl: any) => {
    const v = fieldsBy[presetId]?.[fl.key] ?? fl.initial ?? "";
    return v === "@year" ? mvCurrentYear() : v;
  };
  const setField = (fl: any, value: string) => {
    const v = fieldClip(String(value), fl.max);
    setFieldsBy((all) => ({ ...all, [preset]: { ...(all[preset] || {}), [fl.key]: v } }));
  };
  const titleFields: Record<string, string> = chosen ? Object.fromEntries(chosen.fields.map((fl: any) => [fl.key, fieldText(preset, fl)])) : {};
  const bigText = String(titleFields.big || "").trim();
  // The lockup items at canvas size, or null when the layout throws (the box then says the preview is unavailable).
  const previewItems: any[] | null = React.useMemo(() => {
    if (!chosen) return [];
    try {
      return mvLockupLayout({ preset, fields: titleFields, primary: chosen.colors.primary, secondary: chosen.colors.secondary, ...TITLE_LOOK,
        fonts: presetFonts(chosen, assets.presets) }, MV_W, MV_H);
    } catch { return null; }
  }, [chosen, preset, JSON.stringify(titleFields)]);

  // ---- Music, length and pace ----
  const musicKind: "cue" | "own" | "none" = cueId === "none" ? "none" : cueId === "own" ? "own" : "cue";
  const cue = musicKind === "cue" ? assets?.manifest.cues.find((c: any) => c.id === cueId) || null : null;
  const ownDuration = ownGrid && ownGrid.durationSeconds > 0 ? ownGrid.durationSeconds : null;
  // The music's grid. bpm is null without a beat (No music, or own music whose beat was not found); usableEnd is null
  // without music (no cap). onsets / onsetThresholds are the music's band onsets in music seconds (manifest or
  // beat-detect.cjs); the planner snaps the cuts to them. Own music without a reliable beat keeps its onsets: its
  // fixed-length cuts snap to bass onsets only. hookBars (bundled cues only) scores each bar start for Start at the hook.
  // approxBpm: own music whose grid beat-detect.cjs reports as 'approximate' (tight, but too few beats carry an onset):
  // its tempo and first beat time the fixed-length shots (planner mvApproxTempo); bpm stays null, so nothing else
  // treats it as a beat grid.
  const ownApprox = musicKind === "own" && ownGrid && !ownGrid.accepted && ownGrid.grid === "approximate" && ownGrid.bpm > 0;
  const grid: any = musicKind === "none" ? { bpm: null, accepted: false, approxBpm: null, firstBeat: 0, usableEnd: null, beatEnergy: [], peaks: [], onsets: NO_ONSETS, onsetThresholds: undefined, hookBars: null }
    : musicKind === "own" ? (ownGrid && ownGrid.accepted
      ? { bpm: ownGrid.bpm, accepted: true, approxBpm: null, firstBeat: ownGrid.firstBeat, usableEnd: ownDuration ? ownDuration - 0.5 : 0, beatEnergy: ownGrid.beatEnergy || [], peaks: ownGrid.peaks || [], onsets: ownGrid.onsets || NO_ONSETS, onsetThresholds: ownGrid.onsetThresholds, hookBars: null }
      : { bpm: null, accepted: false, approxBpm: ownApprox ? ownGrid.bpm : null, firstBeat: ownApprox ? ownGrid.firstBeat : 0, usableEnd: ownDuration ? ownDuration - 0.5 : 0, beatEnergy: [], peaks: ownGrid?.peaks || [], onsets: ownGrid?.onsets || NO_ONSETS, onsetThresholds: ownGrid?.onsetThresholds, hookBars: null })
    : cue ? { bpm: cue.bpm, accepted: true, approxBpm: null, firstBeat: cue.firstBeat, usableEnd: cue.usableEnd, beatEnergy: cue.beatEnergy || [], peaks: cue.peaks || [], onsets: cue.onsets || NO_ONSETS, onsetThresholds: cue.onsetThresholds, hookBars: cue.hookBars || null }
    : { bpm: null, accepted: false, approxBpm: null, firstBeat: 0, usableEnd: 0, beatEnergy: [], peaks: [], onsets: NO_ONSETS, onsetThresholds: undefined, hookBars: null };
  // A grid only for 70-160 bpm with an accepted detection (spec 14.1); otherwise fixed shot lengths, on the beat of an
  // approximate tempo when there is one (`tempo` is the grid's or that one, null for the 0.55 s fallback).
  const gridded = mvGridUsable({ bpm: grid.bpm, accepted: grid.accepted });
  const approxTempo = mvApproxTempo({ gridded, approxBpm: grid.approxBpm });
  const tempo = gridded ? grid.bpm : approxTempo;
  const guard: any = tempo ? mvBeatsPerShot(pace, tempo) : { beats: null, overridden: false };
  const shotSeconds = mvShotSeconds({ bpm: grid.bpm, beatsPerShot: guard.beats, pace, gridded, approxBpm: approxTempo });
  const requested = MV_LENGTHS[length];
  // Groove (spec 15.1) is decided as mvPlanBuild decides it: unless its tempo guard falls back to 2 beats per shot
  // (above 150 bpm), the length is a beat span of whole bars and shotSeconds is the seconds per beat. Its phrase
  // opener holds 2 beats, or 1 below 86 bpm (and 2 without a grid).
  const grooved = pace === "groove" && (tempo ? !!guard.groove : true);
  const opener = guard.groove ? guard.opener : 2;
  // Music capacity (spec 14.2): the most shots (a multiple of 4) that fit from the earliest start, or for Groove the
  // longest whole-bar span (mvGrooveFit, shots = its pattern count); the section slider then only offers starts where
  // that fits, so the plan's own music fit equals this.
  const grooveFit: any = grooved ? mvGrooveFit({ requested, sectionStart: tempo ? grid.firstBeat : 0, usableEnd: grid.usableEnd, beatSeconds: shotSeconds, opener }) : null;
  const fitted = grooved ? grooveFit.shots : mvFitShots({ requested, sectionStart: tempo ? grid.firstBeat : 0, usableEnd: grid.usableEnd, shotSeconds });
  // What the length asks for (Groove: the nominal span's pattern count, e.g. 25 shots for Standard) and the seconds of
  // the fitted and the asked-for video. Groove's shots vary in length, so its seconds are always beats x beat.
  const wanted = grooved ? mvGrooveSpan(requested, opener).shots : requested;
  const fittedSeconds = grooved ? grooveFit.beats * shotSeconds : fitted * shotSeconds;
  const wantedSeconds = grooved ? grooveFit.requestedBeats * shotSeconds : requested * shotSeconds;
  const videoSeconds = fitted ? fittedSeconds : wantedSeconds;
  // A plan's length in seconds, and whether the footage made it shorter than the music allows (Groove compares beat
  // spans: detected drum fills change its shot count inside the same span).
  const planSeconds = (p: any) => (p.groove ? p.groove.beats * shotSeconds : p.shots * shotSeconds);
  const planShort = (p: any) => (grooved ? !!p.groove && p.groove.beats < grooveFit.beats : p.shots < fitted);
  const snap = (value: number) => (musicKind === "none" ? 0
    : mvSnapSection({ value, firstBeat: grid.firstBeat, bpm: tempo, usableEnd: grid.usableEnd, videoSeconds, gridAccepted: !!tempo }));
  // The section start the build uses; with music, every cut shifts with its frame-snapped start (planner mvMusicOffset).
  const start = musicKind === "none" ? 0 : snap(section ?? 0);
  const musicStart = musicKind === "none" ? null : start;
  // Onset snapping for every plan; without a reliable beat only bass onsets count, in a wider window.
  const snapCuts = { onsets: grid.onsets, onsetThresholds: grid.onsetThresholds, lowConfidence: !gridded };

  // The hook window for the current length and pace (Start at the hook on a bundled track with a grid), else null.
  const hookSection = () => (hook && gridded && musicKind === "cue" ? mvHookSection({ hookBars: grid.hookBars, firstBeat: grid.firstBeat, bpm: grid.bpm, usableEnd: grid.usableEnd, videoSeconds, barPhaseBeats: cue?.barPhaseBeats }) : null);
  // A new track (or its grid) defaults the section to the most energetic window that fits; with Start at the hook,
  // to the track's best-scoring hook window that fits (spec 15.3), falling back to the energy default when the track
  // has no hook scores (your own music). Toggling Start at the hook picks the default again.
  // `assets` is a dependency so the default also applies once the manifest has loaded.
  React.useEffect(() => {
    if (musicKind === "none") return;
    if (!gridded) { setSection(snap(0)); return; }
    const hookAt = hookSection();
    setSection(hookAt ?? mvDefaultSection({ firstBeat: grid.firstBeat, bpm: grid.bpm, beatEnergy: grid.beatEnergy, usableEnd: grid.usableEnd, videoSeconds }) ?? snap(grid.firstBeat));
  }, [assets, cueId, ownMusic?.path, ownGrid, hook]);
  // A new length or pace keeps the chosen start and only re-clamps it.
  // With Start at the hook it moves to the hook window for the new length and pace instead.
  React.useEffect(() => { const hookAt = hookSection(); setSection((s) => hookAt ?? snap(s ?? 0)); }, [length, pace]);
  // A new track, section, length or pace makes a running preview stale, so it stops.
  React.useEffect(() => { stopPreview(); }, [cueId, ownMusic?.path, section, length, pace]);

  async function detectOwnMusic(file: { path: string; name: string }) {
    if (busyRef.current || !roots) return;
    busyRef.current = true;
    setOwnMusic(file); setOwnGrid(null); setBusy(true); setStep("listening");
    try {
      // The decoded PCM (up to ~32 MB) is only needed by beat-detect.cjs, so it is removed afterwards, keeping the exit status.
      // The result goes to a file (a long track's onsets come close to the 48 KB shell output cap); stdout says ok.
      const pcm = roots.data + "/own-music.f32";
      const cmd = TOOL_PATH + "ffmpeg -nostdin -v error -y -t 360 -i " + sq(file.path) + " -ac 1 -ar 22050 -f f32le " + sq(pcm) + " && node " + sq(roots.plugin + "/beat-detect.cjs") + " " + sq(pcm) + " 22050 " + sq(roots.data + "/own-music.json")
        + "; s=$?; rm -f " + sq(pcm) + "; exit $s";
      const r = await sdk.runShell({ summary: "Find the beat of " + file.name, command: cmd, timeoutMs: 120000, maxOutputBytes: 48000 });
      const done = JSON.parse(String(r.stdout || "").trim().split("\n").pop() || "{}");
      if (r.isError || r.exitCode !== 0 || done.error || !done.ok) throw done.error || r.stderr ? new Error(done.error || r.stderr) : uiError((l) => t(l, "beatFailed"));
      const g = JSON.parse(await readText(roots.data, "own-music.json"));
      setOwnGrid(g);
      // What was found is shown under the file (ownBeatLine), next to where the music was chosen.
      setStatus(null);
    } catch (e: any) {
      // Without a grid the cuts use fixed timing, but the track's real length still bounds the section.
      let duration: number | null = null;
      try {
        const pr = await sdk.runShell({ summary: "Read the length of " + file.name, command: TOOL_PATH + "ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 " + sq(file.path), timeoutMs: 20000 });
        const v = parseFloat(String(pr?.stdout || "").trim());
        if (!pr?.isError && v > 0) duration = Math.min(v, 360);
      } catch { duration = null; }
      setOwnGrid({ accepted: false, grid: "none", failed: true, durationSeconds: duration, peaks: [] });
      setStatus(duration
        ? { tone: "info", say: (l: Lang) => t(l, "musicApprox", { detail: sayError(l, e) }) }
        : { tone: "error", say: (l: Lang) => t(l, "musicUnreadable", { detail: sayError(l, e) }) });
    } finally { busyRef.current = false; setBusy(false); setStep(""); }
  }

  // Section preview: "idle" -> "loading" (ffmpeg cut) -> "playing". Every start or stop bumps the token, so a late
  // result from a cancelled preparation is dropped.
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
    if ((!ownMusic && !cue) || !roots || start == null || musicKind === "none") return;
    stopPreview();
    const token = previewTokenRef.current;
    const live = () => previewTokenRef.current === token && mountedRef.current;
    setPlayState("loading");
    try {
      const file = ownMusic ? ownMusic.path : roots.plugin + "/assets/cues/" + cue.file;
      // The whole section, written to a file (stdout is too small for ~20 s) and read back as base64 text.
      // Earlier previews are removed first and the mp3 once encoded, so the data folder never collects them.
      const dur = videoSeconds, base = roots.data + "/preview-" + token;
      const cmd = TOOL_PATH + "rm -f " + sq(roots.data) + "/preview-*.mp3 " + sq(roots.data) + "/preview-*.b64; "
        + "ffmpeg -nostdin -v error -y -ss " + start.toFixed(2) + " -t " + dur.toFixed(2) + " -i " + sq(file)
        + " -ac 1 -ar 22050 -b:a 48k -af \"afade=t=out:st=" + Math.max(0, dur - 0.4).toFixed(2) + ":d=0.4\" -f mp3 " + sq(base + ".mp3")
        + " && base64 < " + sq(base + ".mp3") + " > " + sq(base + ".b64") + " && rm -f " + sq(base + ".mp3");
      const r = await sdk.runShell({ summary: "Preview music section", command: cmd, timeoutMs: 60000 });
      if (!live()) return;
      if (r?.isError || (r?.exitCode != null && r.exitCode !== 0)) throw r?.stderr ? new Error(r.stderr) : uiError((l) => t(l, "previewNotCut"));
      const b64 = (await readText(roots.data, "preview-" + token + ".b64")).replace(/\s+/g, "");
      // Best-effort cleanup of the encoded file; playback does not wait for it.
      void Promise.resolve(sdk.runShell({ summary: "Remove preview file", command: TOOL_PATH + "rm -f " + sq(base + ".b64"), timeoutMs: 10000 })).catch(() => {});
      if (!live()) return;
      if (b64.length < 200) throw uiError((l) => t(l, "noAudio"));
      let url: string;
      if (typeof Blob !== "undefined" && typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
        const bin = atob(b64), bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        url = URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" }));
        previewUrlRef.current = url;
      } else url = "data:audio/mpeg;base64," + b64;
      const audio = new Audio(url);
      audio.onended = () => { if (audioRef.current === audio) stopPreview(); };
      audioRef.current = audio;
      await audio.play();
      if (!live() || audioRef.current !== audio) { audio.pause(); return; }
      setPlayState("playing"); setPlayingAudio(audio);
    } catch (e: any) {
      if (!live()) return;
      stopPreview();
      setStatus({ tone: "error", say: (l: Lang) => t(l, "previewFailed", { detail: sayError(l, e) }) });
    }
  }

  async function findCandidates(rids: string[], pid: string, check: () => void, queries: Record<string, string>) {
    const list: any[] = []; const failed: string[] = [];
    // SEARCH_BATCH clips per call keeps each scene search under runScript's fixed 30 s deadline.
    // pageSize stays 4: hits are scene-level, so 8 adds almost no new times; the planner fills gaps with filler candidates.
    for (let i = 0; i < rids.length; i += SEARCH_BATCH) {
      // Only videos are searched (photos join without a search), so the count is in videos.
      const done = i;
      advance("shots", i / rids.length, (l) => t(l, "videosChecked", { done, count: rids.length }));
      const r = await run("Search shots", fill(assets.scripts.searchJs, { projectId: pid, rids: rids.slice(i, i + SEARCH_BATCH), queries, pageSize: 4 }), false, { wanted: () => projectRef.current === pid });
      check();
      list.push(...r.candidates); failed.push(...r.failed);
    }
    return { list, failed };
  }

  // Looks for the Draft a lost assemble reply may have saved, by its frozen name. Read-only: nothing is committed.
  // Uncommitted Drafts are never saved, so a Draft with this name holds a finished assembly. Only the
  // DRAFT_LOOKUP_MAX most recent Drafts are read, newest first, stopping at the first match, so a Project with many
  // Drafts stays inside the 30 s deadline. This assumes draftIds lists Drafts in creation order (newest last; DraftMeta
  // has no creation time to sort by). If that ever fails the lookup finds nothing and the original error shows: the
  // build is never duplicated.
  async function findDraftByName(pid: string, name: string) {
    const r = await run("Look for the new Draft", "const p = selects.project(" + JSON.stringify(pid) + ");\n"
      + "const name = " + JSON.stringify(name) + ";\n"
      + "const ids = ((await p.meta()).draftIds || []).slice(-" + DRAFT_LOOKUP_MAX + ").reverse();\n"
      + "for (const id of ids) {\n"
      + "  const d = selects.draft(id);\n"
      + "  const m = await d.meta();\n"
      + "  if (m.name !== name) continue;\n"
      + "  const end = (await d.clips({ trackScope: 'main' })).reduce((a, c) => Math.max(a, c.endFrame), 0);\n"
      + "  return { sequenceId: id, fps: m.fps, totalFrames: end };\n"
      + "}\n"
      + "return { sequenceId: null };", false, { wanted: () => projectRef.current === pid });
    return r && r.sequenceId ? r : null;
  }

  async function build(nextSeed: number) {
    if (busyRef.current || !assets || !inventory || inventory.incomplete || !roots || !chosen) return;
    // The gate for the seed this build uses (Build: seed; Create another version: seed + 1).
    const gate = nextSeed === seed ? blockReason : anotherBlock;
    if (gate) { setStatus({ tone: "error", say: gate }); return; }
    const pid = projectId;
    const check = () => { if (projectRef.current !== pid) throw STALE; };
    // Every input as it is at Build. The build and a later "Finish title and look" read only this.
    const frozen = Object.freeze({
      pid, seed: nextSeed, preset, presetLabel: chosen.label, fields: { ...titleFields },
      music: musicKind, cueId, musicPath: musicKind === "own" ? ownMusic!.path : musicKind === "cue" ? roots.plugin + "/assets/cues/" + cue.file : null,
      sectionStart: musicStart, pace, length, requested, clipSound, soft, punch: beatPunch, hook: hook && musicKind === "cue", bpm: gridded ? grid.bpm : null, usePhotos, only, onlyPhotos,
      draftName: "Mini Vlog " + chosen.label + " " + stamp(new Date()),
    });
    busyRef.current = true;
    stopPreview();
    setBusy(true); setStatus(null); setResult(null);
    advance("shots", 0);
    try {
      // The scene search is cached per Project, clip selection and query set (the motion query runs only with Beat punch).
      const key = pid + "|" + JSON.stringify(only) + (frozen.punch ? "|motion" : "");
      const rids: string[] = inventory.resources.filter((r: any) => !only || only.includes(r.rid)).map((r: any) => r.rid);
      const dur: Record<string, number> = Object.fromEntries(inventory.resources.map((r: any) => [r.rid, r.duration]));
      const cached = candidates && candidates.key === key ? candidates : null;
      // A build from photos alone has no videos to search; the step says so instead of a bare 0%.
      const shotsDetail: Say | undefined = rids.length ? undefined : (l) => t(l, "photosOnly");
      if (shotsDetail) advance("shots", 0, shotsDetail);
      let found = cached;
      if (!cached || cached.failed.length) {
        // Search everything the first time; afterwards retry only the clips whose search failed.
        const todo: string[] = cached ? cached.failed : rids;
        const fresh = await findCandidates(todo, pid, check, mvSearchQueries(MV_QUERIES, frozen.punch));
        const retried = new Set(todo);
        found = { key, failed: fresh.failed,
          list: [...(cached ? cached.list.filter((c: any) => !retried.has(c.rid)) : []), ...fresh.list.map((c: any) => ({ ...c, sourceDuration: dur[c.rid] || 0 }))] };
        setCandidates(found);
      }
      advance("shots", 1, shotsDetail);
      // Photos join as candidates without a search; with Use photos off there are none (the planner would otherwise
      // retry with photos first).
      const photoCands = photoCandsOf(inventory, onlyPhotos, usePhotos);
      // Plan at 30 fps for allocation; assembly places the same cut seconds at the Draft's real rate. With Beat punch,
      // motion hits become a tie-break bonus on the role candidates first (mvMotionBonus).
      const plan: any = mvPlanBuild({ candidates: (frozen.punch ? mvMotionBonus(found.list) : found.list).concat(photoCands), bpm: grid.bpm, accepted: grid.accepted, approxBpm: grid.approxBpm, fps: 30, pace, requested, sectionStart: musicStart, usableEnd: grid.usableEnd, ...snapCuts, seed: String(nextSeed) });
      if (!plan.ok) {
        const failed = found.failed.length;
        // Whole sentences joined with `gap` (no space after a full stop in ja and zh).
        throw uiError((l) => [MV_FAIL[plan.reason] ? t(l, "fail." + plan.reason) : t(l, "noPlan"),
          plan.reason === "too-few" ? (usePhotos ? t(l, "addFootagePhotos") : t(l, "addFootage")) : "",
          failed ? t(l, "retryUnchecked", { count: failed }) : ""].filter(Boolean).join(t(l, "gap")));
      }
      advance("music", 0);
      const music = frozen.musicPath == null ? null
        : await run("Add music to the project", fill(assets.scripts.ensureJs, { projectId: pid, path: frozen.musicPath }), true);
      check();
      // Cut seconds from the section start: the grid, or the onset-snapped cuts (planner mvSchedule `cuts`).
      const boundaries: number[] = plan.schedule.cuts;
      advance("music", 1);
      advance("draft", 0);
      // Photo sizes the inventory has not measured yet stay out; assemble.js measures those itself.
      const crops = Object.fromEntries([...inventory.resources, ...(inventory.photos || []).filter((r: any) => r.width > 0 && r.height > 0)]
        .map((r: any) => [r.rid, { width: r.width, height: r.height }]));
      let a: any = null, lost: any = null;
      try {
        a = await run("Assemble Mini Vlog", fill(assets.scripts.assembleJs, {
          projectId: pid, draftName: frozen.draftName, picks: plan.picks, boundaries, crops,
          music: music ? { resourceId: music.resourceId, sectionStart: frozen.sectionStart ?? 0 } : null, clipSound: frozen.clipSound, ambientDb: AMBIENT_DB }), true);
      } catch (e) { lost = e; }
      check();
      if (!a || !a.sequenceId) {
        // Never resend the commit: the reply may have been lost after the Draft was saved. Look for it by its name.
        let saved: any = null;
        try { saved = await findDraftByName(pid, frozen.draftName); } catch { saved = null; }
        check();
        if (!saved) throw lost || uiError((l) => t(l, "draftNoId", { name: frozen.draftName }));
        a = { ...saved, notes: [...(a?.notes || []), "the Draft was found after its reply was lost"] };
      }
      if (!(a.totalFrames > 0)) throw uiError((l) => t(l, "draftEmpty", { name: frozen.draftName }));
      // The planner drops shots when the footage cannot fill them; tell the user the real length at the Draft fps.
      const shortened = planShort(plan) ? { shots: plan.shots, of: fitted, seconds: a.totalFrames / a.fps } : null;
      advance("draft", 1);
      const res = { sequenceId: a.sequenceId, videoEnd: a.totalFrames, fps: a.fps, decorated: false, frozen, plan, notes: a.notes || [], link: null, shortened, unchecked: found.failed.length };
      setResult(res);
      await decorate(res, check);
    } catch (e: any) {
      if (e !== STALE && projectRef.current === pid) setStatus({ tone: "error", say: stopAt(e) });
    } finally { endRun(pid); }
  }

  // Another version: same clips and cached scene search, a new seed. The previous result goes first, then the
  // build shows its steps from the start, like Build.
  function buildAnother() {
    if (busyRef.current) return;
    setResult(null); setStatus(null);
    const s = seed + 1;
    setSeed(s);
    build(s);
  }

  async function finishTitle() {
    if (busyRef.current || !result || !assets || !roots) return;
    const pid = projectId;
    if (result.frozen.pid !== pid) return;
    const check = () => { if (projectRef.current !== pid) throw STALE; };
    busyRef.current = true; stopPreview(); setBusy(true); setStatus(null);
    try { await decorate(result, check); }
    catch (e: any) { if (e !== STALE && projectRef.current === pid) setStatus({ tone: "error", say: stopAt(e) }); }
    finally { endRun(pid); }
  }

  // Commit 2 (mute the clips' own sound when Clip sound is Off, the title lockup, Soft look and photo motion), then
  // open the Draft. decorate.js skips what an earlier attempt already added, so a retry is safe.
  async function decorate(res: any, check: () => void) {
    advance("look", 0);
    const f = res.frozen;
    // Inspector labels are written into the Draft in the UI language at build time; they do not follow a later switch.
    const bl = langRef.current;
    try {
      const p = assets.presets.presets.find((x: any) => x.id === f.preset);
      if (!p) throw new Error("the title preset " + f.preset + " is missing");
      // Only the chosen preset's fonts travel with the title, each with its advance metrics.
      const fonts = await Promise.all(presetFonts(p, assets.presets).map(async (x: any) => {
        const { file, ...face } = x;
        return { ...face, metrics: assets.presets.metrics[x.family] || null, b64: await fontB64(roots!.plugin, file) };
      }));
      check();
      // Text fields are flat Adjust keys (the layout reads data[key] first); `fields` keeps the Build-time text too.
      const flat: Record<string, string> = {};
      for (const fl of p.fields) flat[fl.key] = String(f.fields[fl.key] ?? "");
      const parameters = { preset: f.preset, ...flat, fields: { ...flat }, primary: p.colors.primary, secondary: p.colors.secondary, ...TITLE_LOOK, fonts,
        provenance: { plugin: PLUGIN_ID, version: PLUGIN_VERSION, preset: f.preset, cue: f.music === "cue" ? f.cueId : f.music, sectionStart: f.sectionStart, pace: f.pace, length: f.length,
          seed: f.seed, clipSound: f.clipSound, punch: f.punch, hook: f.hook, groove: res.plan.groove || null, picks: res.plan.picks } };
      const editableParameters = [
        ...p.fields.map((fl: any) => ({ key: fl.key, label: tOr(bl, "field." + p.id + "." + fl.key, fl.label), type: "text", defaultValue: flat[fl.key] })),
        { key: "primary", label: t(bl, "param.mainColor"), type: "color", defaultValue: p.colors.primary },
        { key: "secondary", label: t(bl, "param.secondColor"), type: "color", defaultValue: p.colors.secondary },
        { key: "shadow", label: t(bl, "param.shadow"), type: "number", defaultValue: TITLE_LOOK.shadow, min: 0, max: 1, step: 0.05 },
        { key: "size", label: t(bl, "param.size"), type: "number", defaultValue: TITLE_LOOK.size, min: 60, max: 160, step: 5 },
        { key: "x", label: t(bl, "param.x"), type: "number", defaultValue: TITLE_LOOK.x, min: 20, max: 80, step: 1 },
        { key: "y", label: t(bl, "param.y"), type: "number", defaultValue: TITLE_LOOK.y, min: 20, max: 80, step: 1 },
        { key: "sparkles", label: f.preset === "mini-vlog" ? t(bl, "param.sparkles") : t(bl, "param.stars"), type: "boolean", defaultValue: TITLE_LOOK.sparkles },
      ];
      const motionOptions = MOTION_OPTIONS.map((o) => ({ label: tOr(bl, "motion." + o.value, o.label), value: o.value }));
      const labels = { motion: t(bl, "param.motion"), motionStrength: t(bl, "param.motionStrength"), punch: t(bl, "param.punch"), softness: t(bl, "param.softness") };
      // Photos in this Draft and a planned motion for each of them (the title restricts none).
      const photoRids = [...new Set(res.plan.picks.filter((k: any) => k && k.kind === "photo").map((k: any) => k.rid as string))];
      const sizes: Record<string, { width: number; height: number }> = { ...photoSizesRef.current };
      const moves: any[] = mvPhotoMotions(res.plan.picks, String(f.seed), sizes);
      const byRid: Record<string, any> = {};
      res.plan.picks.forEach((k: any, i: number) => {
        if (!moves[i]) return;
        const sz = sizes[k.rid];
        // The clip's cover-crop scale, so the motion's drift stays inside the photo.
        const cover = sz ? Math.max(MV_W / sz.width, MV_H / sz.height) / Math.min(MV_W / sz.width, MV_H / sz.height) : 1;
        byRid[k.rid] = { ...moves[i], cover };
      });
      // Beat punch (spec 15.2 b/c) on every video clip: punches on the bar downbeats at the Draft's real fps, or the
      // push-in only without a beat grid. decorate.js matches Main clip i to picks[i] and works out each clip's frames.
      const punch = f.punch ? { tsx: assets.punchTsx, strength: PUNCH_STRENGTH, push: PUNCH_PUSH, beatFrames: f.bpm ? 60 / f.bpm * res.fps : 0,
        punchFrames: mvPunchFrames({ bpm: f.bpm, fps: res.fps, sectionStart: f.sectionStart, videoEnd: res.videoEnd }), picks: res.plan.picks } : null;
      await run("Add title and look", fill(assets.scripts.decorateJs, { sequenceId: res.sequenceId, mute: f.clipSound === "off", videoEnd: res.videoEnd, title: { tsx: assets.titleTsx, parameters, editableParameters }, soft: f.soft ? { tsx: assets.softTsx, strength: SOFT_STRENGTH } : null, photos: photoRids, motion: { tsx: assets.motionTsx, strength: MOTION_STRENGTH, options: motionOptions, byRid }, photoEffects: true, punch, labels }), true);
      check();
    } catch (e: any) {
      if (e === STALE) throw e;
      throw uiError((l) => t(l, "finishFailed", { detail: sayError(l, e) }));
    }
    // The title is saved from here on, so a failed open must not offer the retry.
    setResult((r: any) => ({ ...r, decorated: true }));
    advance("open", 0);
    try {
      const openScript = "const id = " + JSON.stringify(res.sequenceId) + ";\n"
        + "let link = null, openError = null;\n"
        + "try { link = (await selects.editor.linkToDraftFrame(id, 0)).deepLinkUrl; } catch (e) { link = null; }\n"
        + "try { await selects.editor.openDraft(id); } catch (e) { openError = String((e && e.message) || e); }\n"
        + "return { link, openError };";
      const o = await run("Open the new Draft", openScript);
      check();
      setResult((r: any) => ({ ...r, link: o.link || null }));
      if (o.openError) throw new Error(o.openError);
      advance("open", 1);
    } catch (e: any) {
      if (e === STALE) throw e;
      setStatus({ tone: "error", say: (l: Lang) => t(l, "openFailed", { detail: sayError(l, e) }) });
    }
  }

  // Clip selection ("Choose clips"): `only` holds rids in inventory order, or null for every clip.
  const allRids: string[] = inventory ? inventory.resources.map((r: any) => r.rid) : [];
  const selectedRids = only ? allRids.filter((rid) => only.includes(rid)) : allRids;
  const chooseClips = (next: string[]) => {
    if (busyRef.current) return;
    const keep = new Set(next);
    const ordered = allRids.filter((rid) => keep.has(rid));
    setOnly(ordered.length === allRids.length ? null : ordered);
    // A new selection needs a new scene search.
    setCandidates(null);
  };
  const toggleClip = (rid: string, on: boolean) => chooseClips(on ? [...selectedRids, rid] : selectedRids.filter((x) => x !== rid));
  // Photo selection: `onlyPhotos` in inventory order, or null for every photo. Photos are not searched, so choosing
  // them keeps the cached scene search.
  const photoList: any[] = inventory?.photos || [];
  const allPhotoRids: string[] = photoList.map((r: any) => r.rid);
  const selectedPhotoRids = onlyPhotos ? allPhotoRids.filter((rid) => onlyPhotos.includes(rid)) : allPhotoRids;
  const choosePhotos = (next: string[]) => {
    if (busyRef.current) return;
    const keep = new Set(next);
    const ordered = allPhotoRids.filter((rid) => keep.has(rid));
    setOnlyPhotos(ordered.length === allPhotoRids.length ? null : ordered);
  };
  const togglePhoto = (rid: string, on: boolean) => choosePhotos(on ? [...selectedPhotoRids, rid] : selectedPhotoRids.filter((x) => x !== rid));
  const usedPhotoCount = usePhotos ? selectedPhotoRids.length : 0;
  // Once a build has searched the current selection (or nothing needs searching: no video selected), plan it for the
  // readiness line, so the fitted shot count and a failure reason show before Build. The allocation depends on the
  // seed, so each button is gated with the seed it builds with: Build uses `seed`, Create another version `seed + 1`.
  const candKey = projectId + "|" + JSON.stringify(only) + (beatPunch ? "|motion" : "");
  const readyPlans: any = React.useMemo(() => {
    if (!inventory || !fitted) return { build: null, another: null };
    const searched = candidates && candidates.key === candKey ? candidates : null;
    if (!searched && selectedRids.length) return { build: null, another: null };
    const list = searched ? searched.list : [];
    const scored = beatPunch ? mvMotionBonus(list) : list;
    const planAt = (s: number) => {
      const p: any = mvPlanBuild({ candidates: scored.concat(photoCandsOf(inventory, onlyPhotos, usePhotos)), bpm: grid.bpm, accepted: grid.accepted, approxBpm: grid.approxBpm, fps: 30, pace, requested, sectionStart: musicStart, usableEnd: grid.usableEnd, ...snapCuts, seed: String(s) });
      // A search with failed clips is retried by Build, so its shortfall does not block Build yet.
      return { ...p, retryable: !!(searched && searched.failed.length) };
    };
    return { build: planAt(seed), another: planAt(seed + 1) };
  }, [candidates, candKey, inventory, onlyPhotos, usePhotos, grid.bpm, grid.accepted, grid.approxBpm, grid.usableEnd, grid.onsets, pace, requested, musicStart, seed, fitted, selectedRids.length, beatPunch]);
  const readyPlan: any = readyPlans.build;
  // Why a build with this readiness plan cannot run (null when it can), as a message in the UI language.
  const baseBlock: Say | null = !inventory || !assets ? null
    : inventory.incomplete ? (l) => t(l, "sizesLoading")
    : !bigText ? (l) => t(l, "typeBigWord")
    : musicKind === "own" && !ownMusic ? (l) => t(l, "dropMusic")
    : musicKind === "own" && !ownDuration ? (l) => t(l, "musicLengthUnread")
    : musicKind !== "none" && (!fitted || start == null) ? (l) => t(l, "fail.music-too-short")
    : selectedRids.length + usedPhotoCount < 2 ? (l) => t(l, "fail.one-resource")
    : null;
  const blockFor = (plan: any): Say | null => baseBlock || (plan && !plan.ok && !plan.retryable
    ? (l) => (MV_FAIL[plan.reason] ? t(l, "fail." + plan.reason) : t(l, "noPlan")) : null);
  const blockReason = blockFor(readyPlan);
  const anotherBlock = blockFor(readyPlans.another);
  const ready = !!inventory && !!assets && !!roots;
  const canBuild = ready && !blockReason;
  const canBuildAnother = ready && !anotherBlock;

  const analysisText = mvAnalysisText(L, invAnalysis);
  const clipCount = [
    allRids.length ? (only ? t(L, "clipsSelected", { selected: selectedRids.length, count: allRids.length }) : t(L, "clips", { count: allRids.length })) : "",
    usePhotos && allPhotoRids.length ? (onlyPhotos ? t(L, "photosSelected", { selected: selectedPhotoRids.length, count: allPhotoRids.length }) : t(L, "photos", { count: allPhotoRids.length })) : "",
  ].filter(Boolean).join(" · ");
  const plannedSeconds = readyPlan && readyPlan.ok ? planSeconds(readyPlan) : videoSeconds;
  const readiness = !inventory ? (invError ? (invError.busy ? invError.say(L) : t(L, "invFailed")) : t(L, "checkingClipsNow"))
    : inventory.incomplete && incompleteStalled ? t(L, "invPartial")
    : inventory.resources.length === 0 && !allPhotoRids.length && inventory.incomplete ? t(L, "stillReading")
    : inventory.resources.length === 0 && !allPhotoRids.length ? (analysisText || t(L, "noFootage"))
    : inventory.resources.length === 0 && !usePhotos ? [analysisText, t(L, "turnOnPhotos")].filter(Boolean).join(t(L, "gap"))
    : selectedRids.length === 0 && usedPhotoCount === 0 ? t(L, "noClipsSelected")
    : t(L, "ready", { summary: [clipCount, t(L, "aboutSeconds", { seconds: Math.round(plannedSeconds) }), ...mvAnalysisNotes(L, invAnalysis)].filter(Boolean).join(" · ") });
  // Requested vs fitted shots (spec 14.2), then the footage's own fit once it is known.
  // Seconds shown with one decimal (formatted for the language by t()).
  const tenths = (s: number) => Math.round(s * 10) / 10;
  const fitLine = !assets ? null
    : musicKind !== "none" && !fitted ? t(L, "fail.music-too-short")
    : (grooved ? grooveFit.beats < grooveFit.requestedBeats : fitted < requested) ? t(L, "fitPartial", { length: t(L, "length." + length), fitted, count: wanted, seconds: tenths(fittedSeconds) })
    : t(L, "fitFull", { length: t(L, "length." + length), count: wanted, seconds: tenths(wantedSeconds) });
  const footageLine = readyPlan && readyPlan.ok && planShort(readyPlan)
    ? t(L, "footageFits", { fitted: readyPlan.shots, count: fitted, seconds: tenths(planSeconds(readyPlan)) }) : null;
  // The tempo guard's override, or fixed timing without a grid (spec 14.1). Groove's guards: below 86 bpm its phrase
  // opener holds 1 beat, above 150 bpm it plays 2 beats per shot.
  // Fixed timing without a grid: the shot length, or for Groove its 0.55 s beat and the 2-beat, 1-beat and 8th shots.
  const hundredths = (s: number) => Math.round(s * 100) / 100;
  const timing = grooved ? t(L, "grooveTiming", { beat: hundredths(shotSeconds), hold: hundredths(2 * shotSeconds), eighth: Math.round(shotSeconds / 2 * 1000) / 1000 })
    : t(L, "seconds", { seconds: hundredths(shotSeconds) });
  // A tempo that was found (an accepted grid, or own music's approximate one) but is outside 70-160 bpm, else null. Used
  // only where no grid or approximate tempo applies, so it is always out of range there.
  const outsideBpm: number | null = grid.accepted ? grid.bpm : ownApprox ? ownGrid.bpm : null;
  const paceNote = !assets ? null
    : guard.overridden ? (pace === "quick" ? t(L, "quickTwoBeats", { bpm: Math.round(tempo) }) : pace === "relaxed" ? t(L, "relaxedOneBeat", { bpm: Math.round(tempo) })
      : guard.groove ? t(L, "grooveOneBeat", { bpm: Math.round(tempo) }) : t(L, "grooveTwoBeats", { bpm: Math.round(tempo) }))
    : !gridded ? (musicKind === "none" ? t(L, "noMusicTiming", { timing })
      : musicKind === "own" && !ownGrid ? null
      : approxTempo ? t(L, "faintTempoTiming", { bpm: Math.round(approxTempo), timing })
      : outsideBpm ? t(L, "outsideTempoTiming", { bpm: Math.round(outsideBpm), timing })
      : t(L, "noBeatTiming", { timing }))
    : null;
  // What the beat detection found in your own music, shown under the file (null while it runs, and after a failed
  // detection, whose reason goes to the status line).
  const ownBeatLine: string | null = musicKind !== "own" || !ownGrid || ownGrid.failed ? null
    : gridded ? t(L, "beatFound", { bpm: Math.round(grid.bpm) })
    : approxTempo ? t(L, "faintTempo", { bpm: Math.round(approxTempo) })
    : outsideBpm ? t(L, "outsideTempo", { bpm: Math.round(outsideBpm) })
    : t(L, "noBeat");
  const peaks: number[] = grid.peaks || [];
  const total = musicKind === "own" ? (ownDuration || 1) : (cue ? cue.duration : 1);
  const silent = musicKind === "none" && clipSound === "off";
  const canOwnMusic = tools.ffmpeg && tools.node;
  const cues: any[] = assets?.manifest.cues || [];
  const referenceCues = cues.filter((c) => c.group !== "alternative");
  const alternativeCues = cues.filter((c) => c.group === "alternative");
  const chooseTrack = (v: string) => { if (busyRef.current) return; setCueId(v); if (v !== "own") { setOwnMusic(null); setOwnGrid(null); } };
  // One row of the track list: a radio-style button that truncates its name and keeps the tempo visible.
  const trackRow = (value: string, label: string, meta: string) => {
    const on = cueId === value;
    return (
      <button key={value} type="button" role="radio" aria-checked={on} disabled={busy} onClick={() => chooseTrack(value)}
        style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", minWidth: 0, padding: "5px 8px", border: "none", borderRadius: "var(--panel-radius, 6px)", cursor: busy ? "default" : "pointer",
          color: "inherit", font: "inherit", textAlign: "left", background: on ? "color-mix(in srgb, var(--panel-accent, #f6c343) 18%, transparent)" : "transparent",
          boxShadow: on ? "inset 0 0 0 1px var(--panel-accent, #f6c343)" : "none", opacity: busy ? 0.6 : 1 }}>
        <span style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        {meta ? <span style={{ flexShrink: 0, fontSize: 11, color: "var(--panel-muted-fg)", fontVariantNumeric: "tabular-nums" }}>{meta}</span> : null}
      </button>
    );
  };
  const bpmOf = (c: any) => t(L, "bpm", { bpm: Math.round(c.bpm) });
  const tileFont = (p: any) => (p.fonts.find((x: any) => x.role === "big") || p.fonts[0]) as any;
  const progressLabel = progress ? (progress.detail
    ? t(L, "progressDetail", { step: progress.current + 1, total: MV_BUILD_STEPS.length, name: t(L, "step." + progress.id), detail: progress.detail(L), percent: progress.percent })
    : t(L, "progress", { step: progress.current + 1, total: MV_BUILD_STEPS.length, name: t(L, "step." + progress.id), percent: progress.percent })) : "";
  const stepText = step === "listening" ? t(L, "listening") : step === "checkingClips" ? t(L, "checkingClips") : "";

  if (!projectId) return <ui.Message tone="error">{t(L, "openProject")}</ui.Message>;

  return (
    // Korean wraps between words (keep-all); other languages keep their own line breaking.
    <div style={{ wordBreak: L === "ko" ? "keep-all" : undefined }}>
    <ui.Stack gap={16}>
      {inventory && invError ? <ui.Message tone="error">{invError.busy ? invError.say(L) : t(L, "refreshFailed", { detail: invError.say(L) })}</ui.Message> : null}
      <ui.Section title={t(L, "title")}>
        <div role="group" aria-label={t(L, "titleStyle")} style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {presetList.map((p) => {
            const on = p.id === preset, face = tileFont(p);
            return (
              <button key={p.id} type="button" aria-pressed={on} disabled={busy} onClick={() => setPreset(p.id)}
                style={{ flex: "1 1 80px", minWidth: 0, minHeight: 44, padding: "6px 6px", borderRadius: 8, cursor: busy ? "default" : "pointer", color: "inherit",
                  background: on ? "color-mix(in srgb, var(--panel-accent, #f6c343) 16%, transparent)" : "transparent", border: on ? "2px solid var(--panel-accent, #f6c343)" : "1px solid var(--panel-border, rgba(128, 128, 128, 0.45))",
                  fontFamily: mvFontStack(face.family), fontStyle: face.style, fontWeight: face.weight, fontSize: 15, lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {tOr(L, "preset." + p.id, p.label)}
              </button>
            );
          })}
        </div>
        {/* Live preview: the same layout code as the Draft's title, over the middle of a 16:9 frame, in a box of fixed height. */}
        <div aria-label={t(L, "titlePreview")} style={{ height: PREVIEW_HEIGHT, borderRadius: 8, overflow: "hidden", background: "linear-gradient(135deg, #3b3531, #1f1c1a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {assets && previewItems ? (
            <div style={{ position: "relative", width: "100%", height: PREVIEW_HEIGHT }}>
              {/* One SVG per shade layer, stacked, so "vlog" gets the lighter shadow like the Draft's title. */}
              {mvShadeLayers(previewItems).map((layer: any, l: number) => (
                <svg key={l} width="100%" height={PREVIEW_HEIGHT} viewBox={PREVIEW_VIEW} preserveAspectRatio="xMidYMid meet"
                  style={{ display: "block", position: "absolute", left: 0, top: 0, filter: "drop-shadow(0 1px " + 3 * layer.shade + "px rgba(0, 0, 0, " + TITLE_LOOK.shadow * layer.shade + "))" }}>
                  {layer.items.map((it: any, i: number) => (it.kind === "text"
                    ? <text key={i} x={it.x} y={it.y} fill={it.color} fontSize={it.size} fontFamily={mvFontStack(it.font.family)} fontStyle={it.font.style} fontWeight={it.font.weight}
                      stroke={it.stroke > 0 ? it.color : undefined} strokeWidth={it.stroke} strokeLinejoin="round"
                      style={{ whiteSpace: "pre", fontKerning: "none", fontVariantLigatures: "none", letterSpacing: it.tracking } as any}>{it.text}</text>
                    : <path key={i} d={it.kind === "sparkle" ? mvSparklePath(it.x, it.y, it.size) : mvStarPath(it.x, it.y, it.size)} fill={it.color} />))}
                </svg>
              ))}
            </div>
          ) : <small style={{ color: "#d8d2cc" }}>{assets ? t(L, "previewUnavailable") : t(L, "loading")}</small>}
        </div>
        {chosen ? chosen.fields.map((fl: any) => (
          <ui.TextField key={preset + ":" + fl.key} label={t(L, "fieldCount", { label: tOr(L, "field." + preset + "." + fl.key, fl.label), used: fieldLen(fieldText(preset, fl)), max: fl.max })} value={fieldText(preset, fl)}
            disabled={busy} onChange={(v: string) => setField(fl, v)} />
        )) : null}
      </ui.Section>
      <ui.Section title={t(L, "music")}>
        <div role="radiogroup" aria-label={t(L, "track")} style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          {referenceCues.map((c) => trackRow(c.id, c.label, bpmOf(c)))}
          {alternativeCues.length ? <small style={{ display: "block", margin: "4px 8px 0", fontSize: 11, color: "var(--panel-muted-fg)" }}>{t(L, "alternatives")}</small> : null}
          {alternativeCues.map((c) => trackRow(c.id, c.label, bpmOf(c)))}
          {canOwnMusic ? trackRow("own", t(L, "ownMusic"), "") : null}
          {trackRow("none", t(L, "noMusic"), "")}
        </div>
        {musicKind === "own" && canOwnMusic ? <ui.FileDrop accept={["audio"]} value={ownMusic} disabled={busy}
          onChange={(f: any) => { if (f) detectOwnMusic(f); else { setOwnMusic(null); setOwnGrid(null); } }} /> : null}
        {ownBeatLine ? <ui.Message tone="muted">{ownBeatLine}</ui.Message> : null}
        {!canOwnMusic ? <ui.Message tone="muted">{t(L, "installTools")}</ui.Message> : null}
        {musicKind !== "none" ? (ownMusic || cue ? (
          // Esc on the slider or the preview button (the key bubbles up here) stops the preview.
          <div onKeyDown={(e) => { if (e.key === "Escape" && playState !== "idle") { e.preventDefault(); stopPreview(); } }}>
            <SectionSlider lang={L} peaks={peaks} total={total} section={start} videoSeconds={videoSeconds} barSeconds={tempo ? (4 * 60) / tempo : 1}
              snap={snap} onChange={setSection} disabled={busy} audio={playingAudio} />
            <ui.Row gap={8} align="center">
              {/* The kit has no stop icon; "pause" marks stop, and the label says what it does. */}
              <ui.IconButton icon={playState === "playing" ? "pause" : playState === "loading" ? "loading" : "play"}
                label={playState === "playing" ? t(L, "stopPreview") : playState === "loading" ? t(L, "cancelPreview") : t(L, "previewSection")}
                onClick={preview} disabled={busy || !tools.ffmpeg || (playState === "idle" && start == null)} />
              <span>{musicKind === "own" && !ownDuration ? (busy ? t(L, "readingMusic") : t(L, "musicLengthUnknown"))
                : start == null ? t(L, "musicTooShort") : t(L, "startsAt", { seconds: tenths(start) })}</span>
            </ui.Row>
            {musicKind === "cue" ? <ui.Toggle label={t(L, "startAtHook")} value={hook} onChange={setHook} disabled={busy} /> : null}
          </div>
        ) : null) : null}
      </ui.Section>
      <ui.Section title={t(L, "length")}>
        <ui.Segmented label={t(L, "length")} value={length} onChange={(v: any) => setLength(v)} disabled={busy}
          options={[{ label: t(L, "length.short"), value: "short" }, { label: t(L, "length.standard"), value: "standard" }, { label: t(L, "length.long"), value: "long" }]} />
        <ui.Segmented label={t(L, "pace")} value={pace} onChange={(v: any) => setPace(v)} disabled={busy}
          options={[{ label: t(L, "pace.quick"), value: "quick" }, { label: t(L, "pace.relaxed"), value: "relaxed" }, { label: t(L, "pace.groove"), value: "groove" }]} />
        {fitLine ? <ui.Message tone="muted">{fitLine}</ui.Message> : null}
        {footageLine ? <ui.Message tone="muted">{footageLine}</ui.Message> : null}
        {paceNote ? <ui.Message tone="muted">{paceNote}</ui.Message> : null}
        <ui.Row gap={8} align="center">
          <ui.Message tone={!inventory && invError ? "error" : "muted"}>{readiness}</ui.Message>
          <ui.Button variant="ghost" busy={invLoading} busyLabel={t(L, "refreshing")} disabled={busy || !assets} onClick={refreshInventory}>{t(L, "refresh")}</ui.Button>
        </ui.Row>
        {!inventory && invError && !invError.busy ? <ui.Message tone="muted">{t(L, "details", { detail: invError.say(L) })}</ui.Message> : null}
      </ui.Section>
      <ui.Section title={t(L, "advanced")}>
        <ui.Segmented label={t(L, "clipSound")} value={clipSound} onChange={(v: any) => setClipSound(v)} disabled={busy}
          options={[{ label: t(L, "sound.off"), value: "off" }, { label: t(L, "sound.ambient"), value: "ambient" }, { label: t(L, "sound.full"), value: "full" }]} />
        <ui.Toggle label={t(L, "softLook")} value={soft} onChange={setSoft} disabled={busy} />
        <ui.Toggle label={t(L, "beatPunch")} value={beatPunch} onChange={setBeatPunch} disabled={busy} />
        <ui.Toggle label={t(L, "usePhotos")} value={usePhotos} onChange={setUsePhotos} disabled={busy} />
        {silent ? <ui.Message tone="muted">{t(L, "silentVideo")}</ui.Message> : null}
        {inventory && (allRids.length || allPhotoRids.length) ? (
          <div role="group" aria-label={t(L, "chooseClips")} style={{ minWidth: 0 }}>
            <ui.Row gap={4} align="center">
              <small style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {t(L, "chooseClipsCount", { selected: selectedRids.length + selectedPhotoRids.length, total: allRids.length + allPhotoRids.length })}
              </small>
              <ui.Button variant="ghost" disabled={busy || (!only && !onlyPhotos)} onClick={() => { chooseClips(allRids); choosePhotos(allPhotoRids); }}>{t(L, "all")}</ui.Button>
              <ui.Button variant="ghost" disabled={busy || selectedRids.length + selectedPhotoRids.length === 0} onClick={() => { chooseClips([]); choosePhotos([]); }}>{t(L, "none")}</ui.Button>
            </ui.Row>
            {/* One row per clip: the name truncates, duration and shape stay visible; long lists scroll inside. */}
            <div style={{ maxHeight: 220, overflowY: "auto", marginTop: 4, borderRadius: "var(--panel-radius, 6px)", border: "1px solid var(--panel-border, rgba(128, 128, 128, 0.35))" }}>
              {inventory.resources.map((r: any) => {
                const on = selectedRids.includes(r.rid);
                const hint = shapeHint(r.width, r.height);
                const meta = fmtTime(r.duration) + (hint ? " · " + t(L, "shape." + hint) : "");
                return (
                  <label key={r.rid} title={r.name + " · " + meta}
                    style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, padding: "4px 6px", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>
                    <input type="checkbox" checked={on} disabled={busy} onChange={(e) => toggleClip(r.rid, e.currentTarget.checked)} style={{ flexShrink: 0, margin: 0 }} />
                    <span style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                    <span style={{ flexShrink: 0, fontSize: 11, color: "var(--panel-muted-fg)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{meta}</span>
                  </label>
                );
              })}
              {/* Photos follow the clips, marked "Photo"; they are unavailable while Use photos is off. */}
              {photoList.map((r: any) => {
                const on = usePhotos && selectedPhotoRids.includes(r.rid);
                const off = busy || !usePhotos;
                const hint = shapeHint(r.width, r.height);
                const meta = t(L, "photo") + (hint ? " · " + t(L, "shape." + hint) : "");
                return (
                  <label key={r.rid} title={r.name + " · " + meta + (usePhotos ? "" : " · " + t(L, "usePhotosOff"))}
                    style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, padding: "4px 6px", cursor: off ? "default" : "pointer", opacity: off ? 0.6 : 1 }}>
                    <input type="checkbox" checked={on} disabled={off} onChange={(e) => togglePhoto(r.rid, e.currentTarget.checked)} style={{ flexShrink: 0, margin: 0 }} />
                    <span style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                    <span style={{ flexShrink: 0, fontSize: 11, color: "var(--panel-muted-fg)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{meta}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}
      </ui.Section>
      {progress ? <ui.Progress value={progress.value} label={progressLabel} steps={MV_BUILD_STEPS.map((s) => t(L, "step." + s.id))} current={progress.current} />
        : busy ? <ui.Progress label={stepText || t(L, "working")} /> : null}
      {status ? <ui.Message tone={status.tone === "error" ? "error" : "muted"}>{status.say(L)}</ui.Message> : null}
      {result && result.decorated ? (
        <ui.Message tone="success">
          {t(L, "draftCreated")}
        </ui.Message>
      ) : result && busy ? <ui.Message tone="muted">{t(L, "draftCreatedAdding")}</ui.Message>
        : result ? <ui.Message tone="muted">{t(L, "draftNotFinished")}</ui.Message> : null}
      {result?.link ? (
        <ui.Row gap={8} align="center">
          <a href={result.link} target="_blank" rel="noreferrer">{t(L, "openDraft")}</a>
          <ui.IconButton icon="copy" label={t(L, "copyLink")} onClick={() => { navigator.clipboard?.writeText(result.link).catch(() => null); }} />
        </ui.Row>
      ) : null}
      {result?.shortened ? (
        <ui.Message tone="muted">
          {t(L, "shortened", { fitted: result.shortened.shots, count: result.shortened.of, seconds: tenths(result.shortened.seconds) })}
        </ui.Message>
      ) : null}
      {result?.notes?.length ? <ui.Message tone="muted">{t(L, "note", { detail: result.notes.join("; ") })}</ui.Message> : null}
      {result?.unchecked ? <ui.Message tone="muted">{t(L, "unchecked", { count: result.unchecked })}</ui.Message> : null}
      {blockReason && !busy ? <ui.Message tone="muted">{blockReason(L)}</ui.Message> : null}
      <ui.Message tone="muted">{t(L, "createsDraft")}</ui.Message>
      <ui.Actions>
        {result && !result.decorated ? <ui.Button onClick={finishTitle} disabled={busy}>{t(L, "finishTitle")}</ui.Button> : null}
        {result ? <ui.Button onClick={buildAnother} disabled={busy || !canBuildAnother}>{t(L, "anotherVersion")}</ui.Button> : null}
        <ui.Button variant="primary" busy={busy} busyLabel={stepText || t(L, "building")} onClick={() => build(seed)} disabled={busy || !canBuild}>{t(L, "build")}</ui.Button>
      </ui.Actions>
    </ui.Stack>
    </div>
  );
}
