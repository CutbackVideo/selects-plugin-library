// @name Mini Vlog
// @collection visual-highlights
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
    noFootage: "No videos or photos in this Project yet. Add clips or photos; this updates automatically.",
    betterPicks: { one: "{count} clip not analysed; analysed clips give better picks", other: "{count} clips not analysed; analysed clips give better picks" },
    unusable: { one: "{count} clip can't be used yet", other: "{count} clips can't be used yet" },
    unusableWait: { one: "{count} clip can't be used yet (no length or file not found). This updates automatically.", other: "{count} clips can't be used yet (no length or file not found). This updates automatically." },
    unusableRefresh: { one: "{count} clip can't be used yet (no length or file not found). Press Refresh to check again.", other: "{count} clips can't be used yet (no length or file not found). Press Refresh to check again." },
    noFootageRefresh: "No videos or photos in this Project yet. Add clips or photos, then press Refresh.",
    checkingClipsN: "Checking clips {done}/{count}",
    cancel: "Cancel",
    stopping: "Stopping…",
    cancelled: "Build cancelled. Nothing was saved.",
    quickUnavailable: "This Selects can't check clips without analysis, so their shots are evenly spaced. A newer Selects picks better shots.",
    turnOnPhotos: "Turn on Use photos in Advanced to build from this Project's photos.",
    noClipsSelected: "No clips selected. Choose clips in Advanced.",
    gap: " ",
    ready: "Ready: {summary}",
    clips: { one: "{count} clip", other: "{count} clips" },
    clipsSelected: { one: "{selected} of {count} clip selected", other: "{selected} of {count} clips selected" },
    photos: { one: "{count} photo", other: "{count} photos" },
    photosSelected: { one: "{selected} of {count} photo selected", other: "{selected} of {count} photos selected" },
    aboutSeconds: "about {seconds} s",
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
    newerSelects: "This part of Mini Vlog needs a newer version of Selects. Update Selects, then open this panel again.",
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
    anotherVersion: "Try other shots",
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
    noFootage: "In diesem Projekt gibt es noch keine Videos oder Fotos. Füge Clips oder Fotos hinzu; die Anzeige aktualisiert sich automatisch.",
    betterPicks: { one: "{count} Clip nicht analysiert; analysierte Clips ergeben bessere Einstellungen", other: "{count} Clips nicht analysiert; analysierte Clips ergeben bessere Einstellungen" },
    unusable: { one: "{count} Clip noch nicht verwendbar", other: "{count} Clips noch nicht verwendbar" },
    unusableWait: { one: "{count} Clip ist noch nicht verwendbar (keine Länge oder Datei nicht gefunden). Das aktualisiert sich automatisch.", other: "{count} Clips sind noch nicht verwendbar (keine Länge oder Datei nicht gefunden). Das aktualisiert sich automatisch." },
    unusableRefresh: { one: "{count} Clip ist noch nicht verwendbar (keine Länge oder Datei nicht gefunden). Klicke auf „Aktualisieren“, um erneut zu prüfen.", other: "{count} Clips sind noch nicht verwendbar (keine Länge oder Datei nicht gefunden). Klicke auf „Aktualisieren“, um erneut zu prüfen." },
    noFootageRefresh: "In diesem Projekt gibt es noch keine Videos oder Fotos. Füge Clips oder Fotos hinzu und klicke dann auf „Aktualisieren“.",
    checkingClipsN: "Clips werden geprüft {done}/{count}",
    cancel: "Abbrechen",
    stopping: "Wird angehalten…",
    cancelled: "Erstellen abgebrochen. Es wurde nichts gespeichert.",
    quickUnavailable: "Diese Selects-Version kann Clips ohne Analyse nicht prüfen, daher sind ihre Einstellungen gleichmäßig verteilt. Eine neuere Selects-Version wählt bessere Einstellungen.",
    turnOnPhotos: "Aktiviere „Fotos verwenden“ unter „Erweitert“, um aus den Fotos dieses Projekts zu erstellen.",
    noClipsSelected: "Keine Clips ausgewählt. Wähle Clips unter „Erweitert“.",
    gap: " ",
    ready: "Bereit: {summary}",
    clips: { one: "{count} Clip", other: "{count} Clips" },
    clipsSelected: { one: "{selected} von {count} Clip ausgewählt", other: "{selected} von {count} Clips ausgewählt" },
    photos: { one: "{count} Foto", other: "{count} Fotos" },
    photosSelected: { one: "{selected} von {count} Foto ausgewählt", other: "{selected} von {count} Fotos ausgewählt" },
    aboutSeconds: "ca. {seconds} s",
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
    newerSelects: "Dieser Teil von Mini Vlog braucht eine neuere Version von Selects. Aktualisiere Selects und öffne dieses Panel dann erneut.",
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
    anotherVersion: "Andere Aufnahmen probieren",
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
    noFootage: "Este proyecto aún no tiene vídeos ni fotos. Añade clips o fotos; se actualizará automáticamente.",
    betterPicks: { one: "{count} clip sin analizar; los clips analizados dan mejores planos", many: "{count} de clips sin analizar; los clips analizados dan mejores planos", other: "{count} clips sin analizar; los clips analizados dan mejores planos" },
    unusable: { one: "{count} clip aún no se puede usar", many: "{count} de clips aún no se pueden usar", other: "{count} clips aún no se pueden usar" },
    unusableWait: { one: "{count} clip aún no se puede usar (sin duración o archivo no encontrado). Esto se actualiza solo.", many: "{count} de clips aún no se pueden usar (sin duración o archivo no encontrado). Esto se actualiza solo.", other: "{count} clips aún no se pueden usar (sin duración o archivo no encontrado). Esto se actualiza solo." },
    unusableRefresh: { one: "{count} clip aún no se puede usar (sin duración o archivo no encontrado). Pulsa «Actualizar» para volver a comprobarlo.", many: "{count} de clips aún no se pueden usar (sin duración o archivo no encontrado). Pulsa «Actualizar» para volver a comprobarlos.", other: "{count} clips aún no se pueden usar (sin duración o archivo no encontrado). Pulsa «Actualizar» para volver a comprobarlos." },
    noFootageRefresh: "Este proyecto aún no tiene vídeos ni fotos. Añade clips o fotos y pulsa «Actualizar».",
    checkingClipsN: "Comprobando clips {done}/{count}",
    cancel: "Cancelar",
    stopping: "Deteniendo…",
    cancelled: "Creación cancelada. No se guardó nada.",
    quickUnavailable: "Esta versión de Selects no puede revisar clips sin analizar, así que sus planos se reparten de forma uniforme. Una versión más reciente de Selects elige mejores planos.",
    turnOnPhotos: "Activa «Usar fotos» en «Avanzado» para crear con las fotos de este proyecto.",
    noClipsSelected: "No hay clips seleccionados. Elige clips en «Avanzado».",
    gap: " ",
    ready: "Listo: {summary}",
    clips: { one: "{count} clip", many: "{count} de clips", other: "{count} clips" },
    clipsSelected: { one: "{selected} de {count} clip seleccionado", many: "{selected} de {count} de clips seleccionados", other: "{selected} de {count} clips seleccionados" },
    photos: { one: "{count} foto", many: "{count} de fotos", other: "{count} fotos" },
    photosSelected: { one: "{selected} de {count} foto seleccionada", many: "{selected} de {count} de fotos seleccionadas", other: "{selected} de {count} fotos seleccionadas" },
    aboutSeconds: "unos {seconds} s",
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
    newerSelects: "Esta parte de Mini Vlog necesita una versión más reciente de Selects. Actualiza Selects y vuelve a abrir este panel.",
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
    anotherVersion: "Probar otros planos",
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
    noFootage: "Ce projet ne contient pas encore de vidéo ni de photo. Ajoutez des clips ou des photos ; l'affichage se met à jour automatiquement.",
    betterPicks: { one: "{count} clip non analysé ; les clips analysés donnent de meilleurs plans", many: "{count} de clips non analysés ; les clips analysés donnent de meilleurs plans", other: "{count} clips non analysés ; les clips analysés donnent de meilleurs plans" },
    unusable: { one: "{count} clip pas encore utilisable", many: "{count} de clips pas encore utilisables", other: "{count} clips pas encore utilisables" },
    unusableWait: { one: "{count} clip n'est pas encore utilisable (pas de durée ou fichier introuvable). Ceci se met à jour automatiquement.", many: "{count} de clips ne sont pas encore utilisables (pas de durée ou fichier introuvable). Ceci se met à jour automatiquement.", other: "{count} clips ne sont pas encore utilisables (pas de durée ou fichier introuvable). Ceci se met à jour automatiquement." },
    unusableRefresh: { one: "{count} clip n'est pas encore utilisable (pas de durée ou fichier introuvable). Appuyez sur « Actualiser » pour vérifier à nouveau.", many: "{count} de clips ne sont pas encore utilisables (pas de durée ou fichier introuvable). Appuyez sur « Actualiser » pour vérifier à nouveau.", other: "{count} clips ne sont pas encore utilisables (pas de durée ou fichier introuvable). Appuyez sur « Actualiser » pour vérifier à nouveau." },
    noFootageRefresh: "Ce projet ne contient pas encore de vidéo ni de photo. Ajoutez des clips ou des photos, puis appuyez sur « Actualiser ».",
    checkingClipsN: "Vérification des clips {done}/{count}",
    cancel: "Annuler",
    stopping: "Arrêt en cours…",
    cancelled: "Création annulée. Rien n'a été enregistré.",
    quickUnavailable: "Cette version de Selects ne peut pas vérifier les clips non analysés : leurs plans sont donc répartis régulièrement. Une version plus récente de Selects choisit de meilleurs plans.",
    turnOnPhotos: "Activez « Utiliser les photos » dans « Avancé » pour créer à partir des photos de ce projet.",
    noClipsSelected: "Aucun clip sélectionné. Choisissez des clips dans « Avancé ».",
    gap: " ",
    ready: "Prêt : {summary}",
    clips: { one: "{count} clip", many: "{count} de clips", other: "{count} clips" },
    clipsSelected: { one: "{selected} sur {count} clip sélectionné", many: "{selected} sur {count} de clips sélectionnés", other: "{selected} sur {count} clips sélectionnés" },
    photos: { one: "{count} photo", many: "{count} de photos", other: "{count} photos" },
    photosSelected: { one: "{selected} sur {count} photo sélectionnée", many: "{selected} sur {count} de photos sélectionnées", other: "{selected} sur {count} photos sélectionnées" },
    aboutSeconds: "environ {seconds} s",
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
    newerSelects: "Cette partie de Mini Vlog nécessite une version plus récente de Selects. Mettez Selects à jour, puis rouvrez ce panneau.",
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
    anotherVersion: "Essayer d'autres plans",
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
    noFootage: "In questo progetto non ci sono ancora video né foto. Aggiungi clip o foto; si aggiorna automaticamente.",
    betterPicks: { one: "{count} clip non analizzata; le clip analizzate danno inquadrature migliori", many: "{count} di clip non analizzate; le clip analizzate danno inquadrature migliori", other: "{count} clip non analizzate; le clip analizzate danno inquadrature migliori" },
    unusable: { one: "{count} clip non ancora utilizzabile", many: "{count} di clip non ancora utilizzabili", other: "{count} clip non ancora utilizzabili" },
    unusableWait: { one: "{count} clip non è ancora utilizzabile (senza durata o file non trovato). Si aggiorna automaticamente.", many: "{count} di clip non sono ancora utilizzabili (senza durata o file non trovato). Si aggiorna automaticamente.", other: "{count} clip non sono ancora utilizzabili (senza durata o file non trovato). Si aggiorna automaticamente." },
    unusableRefresh: { one: "{count} clip non è ancora utilizzabile (senza durata o file non trovato). Premi «Aggiorna» per controllare di nuovo.", many: "{count} di clip non sono ancora utilizzabili (senza durata o file non trovato). Premi «Aggiorna» per controllare di nuovo.", other: "{count} clip non sono ancora utilizzabili (senza durata o file non trovato). Premi «Aggiorna» per controllare di nuovo." },
    noFootageRefresh: "In questo progetto non ci sono ancora video né foto. Aggiungi clip o foto, poi premi «Aggiorna».",
    checkingClipsN: "Controllo delle clip {done}/{count}",
    cancel: "Annulla",
    stopping: "Interruzione in corso…",
    cancelled: "Creazione annullata. Non è stato salvato nulla.",
    quickUnavailable: "Questa versione di Selects non può controllare le clip non analizzate, quindi le loro inquadrature sono distribuite in modo uniforme. Una versione più recente di Selects sceglie inquadrature migliori.",
    turnOnPhotos: "Attiva «Usa foto» in «Avanzate» per creare dalle foto di questo progetto.",
    noClipsSelected: "Nessuna clip selezionata. Scegli le clip in «Avanzate».",
    gap: " ",
    ready: "Pronto: {summary}",
    clips: { one: "{count} clip", many: "{count} di clip", other: "{count} clip" },
    clipsSelected: { one: "{selected} di {count} clip selezionata", many: "{selected} di {count} clip selezionate", other: "{selected} di {count} clip selezionate" },
    photos: { one: "{count} foto", many: "{count} di foto", other: "{count} foto" },
    photosSelected: { one: "{selected} di {count} foto selezionata", many: "{selected} di {count} foto selezionate", other: "{selected} di {count} foto selezionate" },
    aboutSeconds: "circa {seconds} s",
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
    newerSelects: "Questa parte di Mini Vlog richiede una versione più recente di Selects. Aggiorna Selects, poi riapri questo pannello.",
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
    anotherVersion: "Prova altre inquadrature",
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
    noFootage: "このプロジェクトには、動画も写真もまだありません。クリップか写真を追加してください。自動で更新されます。",
    betterPicks: { other: "未解析のクリップ {count} 本（解析済みのクリップのほうが良いショットを選べます）" },
    unusable: { other: "まだ使えないクリップ {count} 本" },
    unusableWait: { other: "{count} 本のクリップはまだ使えません（長さがないか、ファイルが見つかりません）。自動で更新されます。" },
    unusableRefresh: { other: "{count} 本のクリップはまだ使えません（長さがないか、ファイルが見つかりません）。もう一度確認するには「更新」を押してください。" },
    noFootageRefresh: "このプロジェクトには、動画も写真もまだありません。クリップか写真を追加してから、「更新」を押してください。",
    checkingClipsN: "クリップを確認中 {done}/{count}",
    cancel: "キャンセル",
    stopping: "停止しています…",
    cancelled: "作成をキャンセルしました。何も保存されていません。",
    quickUnavailable: "この Selects では未解析のクリップを確認できないため、ショットを均等に選びました。新しい Selects ではより良いショットを選べます。",
    turnOnPhotos: "このプロジェクトの写真から作成するには、「詳細設定」で「写真を使う」をオンにしてください。",
    noClipsSelected: "クリップが選択されていません。「詳細設定」でクリップを選んでください。",
    gap: "",
    ready: "準備完了: {summary}",
    clips: { other: "クリップ {count} 本" },
    clipsSelected: { other: "クリップ {count} 本中 {selected} 本を選択" },
    photos: { other: "写真 {count} 枚" },
    photosSelected: { other: "写真 {count} 枚中 {selected} 枚を選択" },
    aboutSeconds: "約 {seconds} 秒",
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
    newerSelects: "Mini Vlog のこの機能には新しいバージョンの Selects が必要です。Selects をアップデートしてから、このパネルを開き直してください。",
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
    anotherVersion: "別のショットで作成",
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
    noFootage: "\uc774 \ud504\ub85c\uc81d\ud2b8\uc5d0\ub294 \uc544\uc9c1 \uc601\uc0c1\uc774\ub098 \uc0ac\uc9c4\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. \ud074\ub9bd\uc774\ub098 \uc0ac\uc9c4\uc744 \ucd94\uac00\ud558\uc138\uc694. \uc790\ub3d9\uc73c\ub85c \uc5c5\ub370\uc774\ud2b8\ub429\ub2c8\ub2e4.",
    betterPicks: { other: "\ubd84\uc11d\ub418\uc9c0 \uc54a\uc740 \ud074\ub9bd {count}\uac1c (\ubd84\uc11d\ub41c \ud074\ub9bd\uc5d0\uc11c \ub354 \uc88b\uc740 \uc0f7\uc744 \uace0\ub985\ub2c8\ub2e4)" },
    unusable: { other: "\uc544\uc9c1 \uc4f8 \uc218 \uc5c6\ub294 \ud074\ub9bd {count}\uac1c" },
    unusableWait: { other: "\ud074\ub9bd {count}\uac1c\ub97c \uc544\uc9c1 \uc4f8 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4(\uae38\uc774\uac00 \uc5c6\uac70\ub098 \ud30c\uc77c\uc744 \ucc3e\uc744 \uc218 \uc5c6\uc74c). \uc790\ub3d9\uc73c\ub85c \uc5c5\ub370\uc774\ud2b8\ub429\ub2c8\ub2e4." },
    unusableRefresh: { other: "\ud074\ub9bd {count}\uac1c\ub97c \uc544\uc9c1 \uc4f8 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4(\uae38\uc774\uac00 \uc5c6\uac70\ub098 \ud30c\uc77c\uc744 \ucc3e\uc744 \uc218 \uc5c6\uc74c). \ub2e4\uc2dc \ud655\uc778\ud558\ub824\uba74 ‘\uc0c8\ub85c\uace0\uce68’\uc744 \ub204\ub974\uc138\uc694." },
    noFootageRefresh: "\uc774 \ud504\ub85c\uc81d\ud2b8\uc5d0\ub294 \uc544\uc9c1 \uc601\uc0c1\uc774\ub098 \uc0ac\uc9c4\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. \ud074\ub9bd\uc774\ub098 \uc0ac\uc9c4\uc744 \ucd94\uac00\ud55c \ub4a4 ‘\uc0c8\ub85c\uace0\uce68’\uc744 \ub204\ub974\uc138\uc694.",
    checkingClipsN: "\ud074\ub9bd \ud655\uc778 \uc911 {done}/{count}",
    cancel: "\ucde8\uc18c",
    stopping: "\uc911\uc9c0\ud558\ub294 \uc911…",
    cancelled: "\ub9cc\ub4e4\uae30\ub97c \ucde8\uc18c\ud588\uc2b5\ub2c8\ub2e4. \uc544\ubb34\uac83\ub3c4 \uc800\uc7a5\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4.",
    quickUnavailable: "\uc774 Selects \ubc84\uc804\uc740 \ubd84\uc11d\ub418\uc9c0 \uc54a\uc740 \ud074\ub9bd\uc744 \ud655\uc778\ud560 \uc218 \uc5c6\uc5b4 \uc0f7\uc744 \uace0\ub974\uac8c \ub098\ub220 \uace8\ub790\uc2b5\ub2c8\ub2e4. \uc0c8 Selects \ubc84\uc804\uc5d0\uc11c\ub294 \ub354 \uc88b\uc740 \uc0f7\uc744 \uace0\ub985\ub2c8\ub2e4.",
    turnOnPhotos: "\uc774 \ud504\ub85c\uc81d\ud2b8\uc758 \uc0ac\uc9c4\uc73c\ub85c \ub9cc\ub4e4\ub824\uba74 ‘\uace0\uae09’\uc5d0\uc11c ‘\uc0ac\uc9c4 \uc0ac\uc6a9’\uc744 \ucf1c\uc138\uc694.",
    noClipsSelected: "\uc120\ud0dd\ud55c \ud074\ub9bd\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. ‘\uace0\uae09’\uc5d0\uc11c \ud074\ub9bd\uc744 \uc120\ud0dd\ud558\uc138\uc694.",
    gap: " ",
    ready: "\uc900\ube44 \uc644\ub8cc: {summary}",
    clips: { other: "\ud074\ub9bd {count}\uac1c" },
    clipsSelected: { other: "\ud074\ub9bd {count}\uac1c \uc911 {selected}\uac1c \uc120\ud0dd" },
    photos: { other: "\uc0ac\uc9c4 {count}\uc7a5" },
    photosSelected: { other: "\uc0ac\uc9c4 {count}\uc7a5 \uc911 {selected}\uc7a5 \uc120\ud0dd" },
    aboutSeconds: "\uc57d {seconds}\ucd08",
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
    newerSelects: "Mini Vlog\uc758 \uc774 \uae30\ub2a5\uc744 \uc4f0\ub824\uba74 \ub354 \uc0c8\ub85c\uc6b4 \ubc84\uc804\uc758 Selects\uac00 \ud544\uc694\ud569\ub2c8\ub2e4. Selects\ub97c \uc5c5\ub370\uc774\ud2b8\ud55c \ub4a4 \uc774 \ud328\ub110\uc744 \ub2e4\uc2dc \uc5ec\uc138\uc694.",
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
    anotherVersion: "\ub2e4\ub978 \uc0f7\uc73c\ub85c \ub9cc\ub4e4\uae30",
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
    noFootage: "Este projeto ainda não tem vídeos nem fotos. Adicione clipes ou fotos; a lista é atualizada automaticamente.",
    betterPicks: { one: "{count} clipe não analisado; clipes analisados rendem planos melhores", many: "{count} de clipes não analisados; clipes analisados rendem planos melhores", other: "{count} clipes não analisados; clipes analisados rendem planos melhores" },
    unusable: { one: "{count} clipe ainda não pode ser usado", many: "{count} de clipes ainda não podem ser usados", other: "{count} clipes ainda não podem ser usados" },
    unusableWait: { one: "{count} clipe ainda não pode ser usado (sem duração ou arquivo não encontrado). Isto se atualiza sozinho.", many: "{count} de clipes ainda não podem ser usados (sem duração ou arquivo não encontrado). Isto se atualiza sozinho.", other: "{count} clipes ainda não podem ser usados (sem duração ou arquivo não encontrado). Isto se atualiza sozinho." },
    unusableRefresh: { one: "{count} clipe ainda não pode ser usado (sem duração ou arquivo não encontrado). Pressione “Atualizar” para verificar de novo.", many: "{count} de clipes ainda não podem ser usados (sem duração ou arquivo não encontrado). Pressione “Atualizar” para verificar de novo.", other: "{count} clipes ainda não podem ser usados (sem duração ou arquivo não encontrado). Pressione “Atualizar” para verificar de novo." },
    noFootageRefresh: "Este projeto ainda não tem vídeos nem fotos. Adicione clipes ou fotos e pressione “Atualizar”.",
    checkingClipsN: "Verificando clipes {done}/{count}",
    cancel: "Cancelar",
    stopping: "Parando…",
    cancelled: "Criação cancelada. Nada foi salvo.",
    quickUnavailable: "Esta versão do Selects não consegue verificar clipes não analisados, então os planos deles são distribuídos por igual. Uma versão mais nova do Selects escolhe planos melhores.",
    turnOnPhotos: "Ative “Usar fotos” em “Avançado” para criar com as fotos deste projeto.",
    noClipsSelected: "Nenhum clipe selecionado. Escolha clipes em “Avançado”.",
    gap: " ",
    ready: "Pronto: {summary}",
    clips: { one: "{count} clipe", many: "{count} de clipes", other: "{count} clipes" },
    clipsSelected: { one: "{selected} de {count} clipe selecionado", many: "{selected} de {count} de clipes selecionados", other: "{selected} de {count} clipes selecionados" },
    photos: { one: "{count} foto", many: "{count} de fotos", other: "{count} fotos" },
    photosSelected: { one: "{selected} de {count} foto selecionada", many: "{selected} de {count} de fotos selecionadas", other: "{selected} de {count} fotos selecionadas" },
    aboutSeconds: "cerca de {seconds} s",
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
    newerSelects: "Esta parte do Mini Vlog precisa de uma versão mais nova do Selects. Atualize o Selects e abra este painel de novo.",
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
    anotherVersion: "Testar outros planos",
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
    noFootage: "Bu projede henüz video veya fotoğraf yok. Klip ya da fotoğraf ekleyin; burası otomatik olarak güncellenir.",
    betterPicks: { one: "{count} klip analiz edilmedi; analiz edilmiş klipler daha iyi çekimler verir", other: "{count} klip analiz edilmedi; analiz edilmiş klipler daha iyi çekimler verir" },
    unusable: { one: "{count} klip henüz kullanılamıyor", other: "{count} klip henüz kullanılamıyor" },
    unusableWait: { one: "{count} klip henüz kullanılamıyor (süre yok veya dosya bulunamadı). Bu otomatik olarak güncellenir.", other: "{count} klip henüz kullanılamıyor (süre yok veya dosya bulunamadı). Bu otomatik olarak güncellenir." },
    unusableRefresh: { one: "{count} klip henüz kullanılamıyor (süre yok veya dosya bulunamadı). Yeniden kontrol etmek için “Yenile”ye basın.", other: "{count} klip henüz kullanılamıyor (süre yok veya dosya bulunamadı). Yeniden kontrol etmek için “Yenile”ye basın." },
    noFootageRefresh: "Bu projede henüz video veya fotoğraf yok. Klip ya da fotoğraf ekleyin, ardından “Yenile”ye basın.",
    checkingClipsN: "Klipler kontrol ediliyor {done}/{count}",
    cancel: "İptal",
    stopping: "Durduruluyor…",
    cancelled: "Oluşturma iptal edildi. Hiçbir şey kaydedilmedi.",
    quickUnavailable: "Bu Selects sürümü analiz edilmemiş klipleri kontrol edemiyor, bu yüzden çekimler eşit aralıklarla seçildi. Daha yeni bir Selects sürümü daha iyi çekimler seçer.",
    turnOnPhotos: "Bu projenin fotoğraflarından oluşturmak için “Gelişmiş” bölümünde “Fotoğrafları kullan” seçeneğini açın.",
    noClipsSelected: "Klip seçilmedi. “Gelişmiş” bölümünden klip seçin.",
    gap: " ",
    ready: "Hazır: {summary}",
    clips: { one: "{count} klip", other: "{count} klip" },
    clipsSelected: { one: "{count} klipten {selected} tanesi seçili", other: "{count} klipten {selected} tanesi seçili" },
    photos: { one: "{count} fotoğraf", other: "{count} fotoğraf" },
    photosSelected: { one: "{count} fotoğraftan {selected} tanesi seçili", other: "{count} fotoğraftan {selected} tanesi seçili" },
    aboutSeconds: "yaklaşık {seconds} sn",
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
    newerSelects: "Mini Vlog'un bu bölümü Selects'in daha yeni bir sürümünü gerektiriyor. Selects'i güncelleyin, ardından bu paneli yeniden açın.",
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
    anotherVersion: "Başka çekimler dene",
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
    noFootage: "此项目中还没有视频或照片。请添加片段或照片；这里会自动更新。",
    betterPicks: { other: "{count} 个片段未分析（已分析的片段能选出更好的镜头）" },
    unusable: { other: "{count} 个片段暂时无法使用" },
    unusableWait: { other: "{count} 个片段暂时无法使用（没有时长或找不到文件）。这里会自动更新。" },
    unusableRefresh: { other: "{count} 个片段暂时无法使用（没有时长或找不到文件）。请点击“刷新”重新检查。" },
    noFootageRefresh: "此项目中还没有视频或照片。请添加片段或照片，然后点击“刷新”。",
    checkingClipsN: "正在检查片段 {done}/{count}",
    cancel: "取消",
    stopping: "正在停止…",
    cancelled: "已取消创建，未保存任何内容。",
    quickUnavailable: "此版本的 Selects 无法检查未分析的片段，因此均匀选取了镜头。较新版本的 Selects 能选出更好的镜头。",
    turnOnPhotos: "请在“高级”中开启“使用照片”，即可用此项目的照片制作。",
    noClipsSelected: "未选择片段。请在“高级”中选择片段。",
    gap: "",
    ready: "已就绪：{summary}",
    clips: { other: "{count} 个片段" },
    clipsSelected: { other: "已选 {selected}/{count} 个片段" },
    photos: { other: "{count} 张照片" },
    photosSelected: { other: "已选 {selected}/{count} 张照片" },
    aboutSeconds: "约 {seconds} 秒",
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
    newerSelects: "Mini Vlog 的这项功能需要更新版本的 Selects。请更新 Selects，然后重新打开此面板。",
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
    anotherVersion: "换一组镜头",
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
// A host service this Selects build lacks (av-host 'host-missing') says the one "needs a newer Selects" message.
function sayError(lang: Lang, e: any): string {
  if (typeof e?.say === "function") return e.say(lang);
  if (e?.code === "host-missing") return t(lang, "newerSelects");
  return String(e?.message || e);
}
// A title field's text cut to its limit, counted like the counter next to it (fieldLen: Hangul counts 2).
function fieldClip(text: string, max: number) {
  let out = "", n = 0;
  for (const ch of text) { const w = fieldLen(ch); if (n + w > max) break; out += ch; n += w; }
  return out;
}

const PLUGIN_ID = "mini-vlog";
const PLUGIN_VERSION = "0.1.0-alpha.7";
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
// Fallback track for a manifest without the preferred cue; the preferred cue (Buant Hook) replaces it once the manifest has it.
const DEFAULT_CUE = "weekend-indie-pop";
const PREFERRED_CUE = "buant-hook";
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
// Clips that cannot be used yet (still importing) or an empty Project are re-read with the same 10 s poll, at most
// WAIT_POLL_MAX times in a row (about five minutes; a clip whose file was moved never becomes usable); then polling
// stops until Refresh or a changed inventory (coming back to the panel still reads it once).
const WAIT_POLL_MAX = 30;
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

// mv-local:start
// Clips without analysis (build without analysis), plain JS: the headless driver (dev/driveAdapter.mjs) loads this
// block next to planner.js and the mv-hook block, so the panel and the driver turn quick local scores (the kit's
// quick-score block below) into the same planner candidates.
// - Role: a clip without analysis has no scene search, so nothing says whether a window shows a drink, a street or a
//   park. Every window gets MV_LOCAL_ROLE, a role outside MV_ROLES: the allocator ranks it in its "any real hit" tier
//   (after preferred-role hits, before fillers) at each use count. A slot's own-role scene hit on an analysed clip used
//   as often still comes first, an unused clip without analysis still beats any reuse (fresh first), and the photo
//   share and the hard rules are untouched.
// - Windows: the kit's qsCandidates(scores, 'montage', MV_LOCAL_WINDOW, MV_LOCAL_MAX, MV_LOCAL_APART): MV_LOCAL_WINDOW-
//   second windows (long enough for a 2-beat Groove hold) starting at least 0.5 s in, free of black, fade or flash
//   frames and scene cuts while any clean window fits, sharp and well exposed first, moving windows ranked higher
//   (Mini Vlog is a montage). Every window becomes { rid, role: MV_LOCAL_ROLE, t (window centre), score,
//   sourceDuration }; the allocator centres a shot on t, so a shot up to MV_LOCAL_WINDOW long stays inside its window.
//   A clip the check could not decode (no host ffmpeg, an error, the budget spent: `fallback`) gets mvLocalWindows
//   (one a second, the first window starting at 0.5 s, as search.js gives the template run) at the bottom of the range.
// - One scale (mvScoreRange): the 0-1 local score s maps linearly onto the 10th..90th percentile [lo, hi] of this
//   run's scene-search scores (role hits, not motion hits): score = lo + s * (hi - lo). A range narrower than 0.05 is
//   widened to 0.05 around its middle; without any scene hit (no analysed clip) it is MV_LOCAL_RANGE, the
//   neighbourhood scene-search scores sit in (0.26-0.32 on the reference footage), so the allocator's fixed steps
//   (0.15 per role rank, 0.2 per recent repeat, 0.05 jitter, 0.1 motion bonus) weigh the same as with analysed clips.
//   Scene-search scores are never changed: a Project with every clip analysed plans exactly as before.
// - Beat punch: the motion query cannot run on these clips, so their windows' own motion, ranked 0..1 across the
//   build's decoded windows, gives the same motion bonus (MV_MOTION_BONUS x rank) as mvMotionBonus, and windows ranked
//   MV_LOCAL_MOTION_TAG or higher carry the `motion` tag; the planner's motion opener then can open on a moving window
//   of a clip without analysis too. Fallback windows have no motion. Without Beat punch nothing carries motion.
// - Opener: Mini Vlog opens on movement (Hook B, spec 15.2), so local windows are picked with the kit's 'montage' role
//   (moving windows ranked higher) rather than 'steady', on purpose: with Beat punch the planner's motion opener then
//   finds a moving local window. README "Clips without analysis" says the same.
const MV_LOCAL_ROLE = 'local';
const MV_LOCAL_WINDOW = 1.4;
const MV_LOCAL_MAX = 24;
const MV_LOCAL_APART = 0.5;
const MV_LOCAL_FALLBACK_MAX = 24;
const MV_LOCAL_RANGE = { lo: 0.25, hi: 0.35 };
// Beat punch: the motion rank from which a local window is tagged `motion` (see mvLocalCandidates).
const MV_LOCAL_MOTION_TAG = 0.5;
// Quick checks at a time, and the time all of a build's checks share (clips not started by then get mvLocalWindows).
const MV_LOCAL_CONCURRENCY = 3;
const MV_LOCAL_BUDGET_MS = 20000;
// Evenly spaced window centres for a clip of `dur` seconds: one a second from 0.5 s + MV_LOCAL_WINDOW / 2 (so the first
// MV_LOCAL_WINDOW-second window starts at 0.5 s, past a fade-in or a black first frame), each half a second clear of the
// end, at most MV_LOCAL_FALLBACK_MAX spread over the clip; a clip too short for one gets its middle. scripts/search.js
// has a copy (localWindows) for the template run; tests/no-analysis.test.cjs keeps them identical.
function mvLocalWindows(dur) {
  const first = 0.5 + MV_LOCAL_WINDOW / 2;
  const n = Math.floor(dur - 0.5 - first + 1e-9) + 1;
  if (n < 1) return dur > 0 ? [Math.round(dur / 2 * 1000) / 1000] : [];
  const at = k => Math.round((first + k) * 1000) / 1000;
  if (n <= MV_LOCAL_FALLBACK_MAX) return Array.from({ length: n }, (_, k) => at(k));
  return Array.from({ length: MV_LOCAL_FALLBACK_MAX }, (_, k) => at(Math.round(k * (n - 1) / (MV_LOCAL_FALLBACK_MAX - 1))));
}
// The scale local scores share with scene search (see above), from a build's candidate list.
function mvScoreRange(list) {
  const s = (list || []).filter(c => c && c.role !== MV_MOTION_ROLE && c.role !== MV_LOCAL_ROLE && typeof c.score === 'number' && isFinite(c.score))
    .map(c => c.score).sort((a, b) => a - b);
  if (!s.length) return { lo: MV_LOCAL_RANGE.lo, hi: MV_LOCAL_RANGE.hi };
  const at = q => s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))];
  let lo = at(0.1), hi = at(0.9);
  if (hi - lo < 0.05) { const mid = (lo + hi) / 2; lo = mid - 0.025; hi = mid + 0.025; }
  return { lo, hi };
}
// Planner candidates of clips without analysis. results: [{ rid, duration, scores: a quickScore result or null }].
function mvLocalCandidates(results, range, punch) {
  const lo = range.lo, hi = range.hi, out = [], decoded = [];
  for (const r of results || []) {
    if (!r || typeof r.rid !== 'string' || !(r.duration > 0)) continue;
    const sc = r.scores;
    const picks = sc && !sc.fallback && Array.isArray(sc.windows) && sc.windows.length ? qsCandidates(sc, 'montage', MV_LOCAL_WINDOW, MV_LOCAL_MAX, MV_LOCAL_APART) : [];
    if (!picks.length) {
      for (const t of mvLocalWindows(r.duration)) out.push({ rid: r.rid, role: MV_LOCAL_ROLE, t, score: lo, sourceDuration: r.duration });
      continue;
    }
    for (const c of picks) {
      const cand = { rid: r.rid, role: MV_LOCAL_ROLE, t: c.t, score: lo + Math.max(0, Math.min(1, c.score)) * (hi - lo), sourceDuration: r.duration };
      out.push(cand);
      if (punch && typeof c.motion === 'number' && isFinite(c.motion)) decoded.push([cand, c.motion]);
    }
  }
  const sorted = decoded.map(d => d[1]).sort((a, b) => a - b);
  for (const [cand, m] of decoded) {
    // Rank 0..1: the share of decoded windows moving less than this one.
    const rank = sorted.length < 2 ? 0 : sorted.filter(x => x < m).length / (sorted.length - 1);
    // The bonus orders every window by motion; only the upper half is tagged `motion`, so the planner's motion opener
    // (any c.motion > 0) picks a window that clearly moves, not the least moving one of a still clip.
    if (rank > 0) cand.score += MV_MOTION_BONUS * rank;
    if (rank >= MV_LOCAL_MOTION_TAG) cand.motion = rank;
  }
  return out;
}
// A build's candidates: the scene-search list unchanged, plus the local candidates on its scale. Without local results
// it returns `list` itself (no copy), so an all-analysed build plans exactly as before at no cost.
function mvWithLocal(list, results, punch) {
  if (!results || !results.length) return list;
  return list.concat(mvLocalCandidates(results, mvScoreRange(list), punch));
}
// mv-local:end

// The kit's quick local shot score (selects-app-kit tools/panel/quick-score.js), pasted verbatim: change it in the kit.
// quick-score:start
// Quick local shot score for clips Selects has not analysed (no scene search). Plain JS and self-contained: it reaches
// the host through the public SDK files and media namespaces, or through
// `opts.io` (tests, other hosts), so it can be pasted into any style-app panel and kept as one kit file
// (tools/panel/quick-score.ts). No shell, no node: the host's bundled ffmpeg decodes a small grey preview
// (QS_FPS frames a second, QS_W x QS_H pixels) of the part of the clip the planner could use into a temporary file in
// the data folder, which is read back and removed. Paths are joined by the host; generated names are ASCII.
//
// API
//   quickScore(resource, { windows, budgetMs, signal, onProgress, dataDir, io, fps })
//       resource: { rid, path, durationSeconds, mtimeMs? }. windows: optional [{ start, end }] to score; without them the
//       clip is scored in QS_BIN-second bins from QS_HEAD on (at most QS_SPAN seconds). Returns
//       { rid, windows: [{ start, end, motion, sharp, luma, clipped, flags }], sceneCuts: [seconds], ms, fallback,
//         cached, duration }
//       flags: { black, fade, flash, blur, dark, bright, cut } (booleans). motion = mean absolute frame difference
//       (0-1), sharp = mean absolute Laplacian (0-1), luma = mean luma (0-1), clipped = share of pixels near black or
//       white. When ffmpeg is missing or fails (or the budget runs out) it never throws for that: it returns evenly
//       spaced, unflagged windows from QS_HEAD on with `fallback: true`, so a build still goes ahead. It throws only
//       when `signal` aborts.
//   quickScoreAll(resources, { concurrency, budgetMs, signal, onProgress, ... }) -> Map rid -> result. Bounded
//       concurrency; onProgress({ done, total, rid }) after each clip; the budget is shared (clips not started in time get
//       the fallback).
//   pickWindowsLocal(scores, role, durationNeeded) -> [{ start, end, score, motion, flags }] best first, every window
//       starting at or after QS_HEAD and ending inside the clip. role: 'steady' (opening, credit, ending: steadier,
//       well-exposed), 'montage' (varied motion; moving windows rank higher), 'still' (the lowest motion). Windows with
//       black, fade or flash frames, or a scene cut inside, are left out while any other window fits; blur, dark and
//       bright windows rank lower. score is 0-1 (comparable across clips and roles).
//   qsCandidates(scores, role, durationNeeded, max) -> planner candidates [{ t, score, motion }] (t = window centre).
// Cache: one JSON per clip in <dataDir>/quick-score/, keyed by the resource id, the file's modification time and
// QS_VERSION, so a rebuild does not decode the same clip twice.
var QS_VERSION = 2;
// One decode pass at the settings Selfie Aesthetic Edit measured (sae-host saeMotionArgs: fps 8, gray rawvideo,
// 0.25-0.65 s for 120 s of source) gives every per-frame figure below.
var QS_FPS = 8;
var QS_W = 64, QS_H = 36;
// Windows start at least this far into the clip: stock clips often fade in from black over their first frames.
var QS_HEAD = 0.5;
// Scores are kept per bin of this many seconds; pickWindowsLocal joins bins into a window of any length.
var QS_BIN = 0.5;
// At most this many seconds of a clip are decoded (from QS_HEAD); a longer clip is scored over its first QS_SPAN.
var QS_SPAN = 120;
var QS_BUDGET_MS = 30000;
// Frame thresholds (luma 0-1).
var QS_BLACK = 0.07, QS_DARK = 0.16, QS_CLIP_LO = 16 / 255, QS_CLIP_HI = 240 / 255, QS_BRIGHT_SHARE = 0.45;
var QS_FLASH_JUMP = 0.25, QS_CUT_DIFF = 0.12, QS_CUT_RATIO = 4;

function qsTag(x) { return Object.prototype.toString.call(x); }
function qsBytes(v) {
  if (qsTag(v) === "[object ArrayBuffer]") return new Uint8Array(v);
  if (v && typeof v.byteLength === "number" && v.buffer && qsTag(v.buffer) === "[object ArrayBuffer]") return new Uint8Array(v.buffer, v.byteOffset || 0, v.byteLength);
  if (v && typeof v === "object" && typeof v.length === "number") return Uint8Array.from(v);
  return null;
}
// The host's services for this module: runFFmpeg(args, signal), readBytes(path), remove(path), join(...parts),
// mkdir(dir), mtimeMs(path), readText(path), writeText(path, text). Members the host lacks are null.
function qsHostIO() {
  var rt = hostSdk?.media, fs = hostSdk?.files;
  var fn = function (o, m) { return !!o && typeof o[m] === "function"; };
  return {
    runFFmpeg: fn(rt, "runFFmpeg") ? function (args, signal) { return rt.runFFmpeg(args, true, signal); } : null,
    readBytes: fn(fs, "readFile") ? async function (p) { return qsBytes(await fs.readFile(p)); } : null,
    remove: fs ? async function (p) {
      var tries = ["removeFile"];
      for (var i = 0; i < tries.length; i++) {
        if (!fn(fs, tries[i])) continue;
        try { await (tries[i] === "removeFile" ? fs.removeFile({ filePath: p }) : fs[tries[i]](p)); return; } catch (e) { /* the next one */ }
      }
    } : null,
    join: fn(fs, "join") ? function () { return String(fs.join.apply(fs, arguments)); } : null,
    mkdir: fn(fs, "mkdir") ? async function (d) { (await fs.mkdir(d, { recursive: true })); } : null,
    mtimeMs: fn(fs, "stat") ? async function (p) { var s = (await fs.stat(p)); return s && Number(s.mtimeMs || (s.mtime && +new Date(s.mtime)) || 0); } : null,
    readText: fn(fs, "readFile") ? async function (p) { var v = await fs.readFile(p, "utf8"); return typeof v === "string" ? v : new TextDecoder().decode(qsBytes(v)); } : null,
    writeText: fn(fs, "writeFile") ? async function (p, t) { await fs.writeFile(p, t); } : null,
  };
}

// Pure: per-frame statistics of QS_W x QS_H grey frames packed in `bytes`.
function qsFrameStats(bytes, w, h) {
  var size = w * h, n = Math.floor(bytes.length / size), out = [];
  for (var f = 0; f < n; f++) {
    var o = f * size, sum = 0, lo = 0, hi = 0, lap = 0, diff = 0;
    for (var i = 0; i < size; i++) {
      var v = bytes[o + i];
      sum += v;
      if (v <= QS_CLIP_LO * 255) lo++; else if (v >= QS_CLIP_HI * 255) hi++;
      if (f > 0) diff += Math.abs(v - bytes[o - size + i]);
    }
    for (var y = 1; y < h - 1; y++) {
      for (var x = 1; x < w - 1; x++) {
        var k = o + y * w + x;
        lap += Math.abs(4 * bytes[k] - bytes[k - 1] - bytes[k + 1] - bytes[k - w] - bytes[k + w]);
      }
    }
    out.push({ luma: sum / size / 255, lo: lo / size, hi: hi / size, sharp: lap / ((w - 2) * (h - 2)) / 1020,
      diff: f > 0 ? diff / size / 255 : 0 });
  }
  return out;
}

// Pure: scene changes (seconds from `offset`): a frame difference at least QS_CUT_DIFF and QS_CUT_RATIO times the
// median difference of the frames around it.
function qsSceneCuts(stats, fps, offset) {
  var cuts = [];
  for (var i = 1; i < stats.length; i++) {
    var near = [];
    for (var j = Math.max(1, i - 6); j <= Math.min(stats.length - 1, i + 6); j++) if (j !== i) near.push(stats[j].diff);
    near.sort(function (a, b) { return a - b; });
    var med = near.length ? near[Math.floor(near.length / 2)] : 0;
    var d = stats[i].diff;
    var flash = i + 1 < stats.length && stats[i].luma - stats[i - 1].luma > QS_FLASH_JUMP && stats[i].luma - stats[i + 1].luma > QS_FLASH_JUMP;
    if (!flash && d >= QS_CUT_DIFF && d >= QS_CUT_RATIO * Math.max(med, 0.002)) cuts.push(offset + i / fps);
  }
  return cuts;
}

// Pure: scores of `windows` ([{ start, end }], seconds in the clip) from frame stats decoded from `offset` at `fps`.
function qsWindowScores(stats, fps, offset, windows, sceneCuts) {
  var sharpAll = stats.map(function (s) { return s.sharp; }).sort(function (a, b) { return a - b; });
  var sharpMed = sharpAll.length ? sharpAll[Math.floor(sharpAll.length / 2)] : 0;
  var out = [];
  for (var w = 0; w < windows.length; w++) {
    var a = windows[w].start, b = windows[w].end;
    var i0 = Math.max(0, Math.round((a - offset) * fps)), i1 = Math.min(stats.length, Math.round((b - offset) * fps));
    if (i1 <= i0) { out.push({ start: a, end: b, motion: 0, sharp: 0, luma: 0, clipped: 0, flags: { black: false, fade: false, flash: false, blur: false, dark: false, bright: false, cut: false }, empty: true }); continue; }
    var motion = 0, sharp = 0, luma = 0, clipped = 0, black = 0, flash = false, lmin = 1, lmax = 0, dark = 0, bright = 0, nd = 0;
    for (var i = i0; i < i1; i++) {
      var s = stats[i];
      if (i > i0) { motion += s.diff; nd++; }
      sharp += s.sharp; luma += s.luma; clipped += s.lo + s.hi;
      if (s.luma < QS_BLACK) black++;
      if (s.luma < QS_DARK) dark++;
      if (s.hi > QS_BRIGHT_SHARE) bright++;
      lmin = Math.min(lmin, s.luma); lmax = Math.max(lmax, s.luma);
      var p = stats[i - 1], q = stats[i + 1];
      if (p && q && s.luma - p.luma > QS_FLASH_JUMP && s.luma - q.luma > QS_FLASH_JUMP) flash = true;
    }
    var n = i1 - i0;
    motion = nd ? motion / nd : 0; sharp /= n; luma /= n; clipped /= n;
    // A fade: luma rises or falls steadily (at least 80 % of the steps one way) by at least 0.04 and 15 %. A pan or a
    // person walking keeps the mean luma about level; a fade's tail (70 to 100 % brightness) still counts.
    var up = 0, down = 0;
    for (var k = i0 + 1; k < i1; k++) { var dl = stats[k].luma - stats[k - 1].luma; if (dl > 0.003) up++; else if (dl < -0.003) down++; }
    var steps = Math.max(1, i1 - i0 - 1);
    var fade = steps >= 2 && Math.max(up, down) >= 0.8 * steps && lmax - lmin > 0.04 && lmax > 1.15 * Math.max(lmin, 0.01);
    // A cut in [a, b): informational per bin; pickWindowsLocal checks cuts against each whole window.
    var cut = (sceneCuts || []).some(function (t) { return t >= a - 1e-6 && t < b - 1e-6; });
    out.push({ start: a, end: b, motion: motion, sharp: sharp, luma: luma, clipped: clipped,
      flags: { black: black / n > 0.3, fade: fade, flash: flash, blur: sharpMed > 0 ? sharp < 0.45 * sharpMed && sharp < 0.02 : sharp < 0.01,
        dark: dark / n > 0.5, bright: bright / n > 0.5, cut: cut } });
  }
  return out;
}

// QS_BIN-second bins from QS_HEAD to the end of the scored span.
function qsBins(duration, head, span) {
  var end = Math.min(duration, head + span), bins = [];
  for (var t = head; t + QS_BIN <= end + 1e-6; t += QS_BIN) bins.push({ start: Math.round(t * 1000) / 1000, end: Math.round((t + QS_BIN) * 1000) / 1000 });
  return bins;
}
function qsFallback(resource, ms, windows) {
  var dur = Number(resource.durationSeconds) || 0;
  var ws = (windows && windows.length ? windows : qsBins(dur, Math.min(QS_HEAD, Math.max(0, dur - QS_BIN)), QS_SPAN)).map(function (x) {
    return { start: x.start, end: x.end, motion: 0, sharp: 0, luma: 0.5, clipped: 0, flags: { black: false, fade: false, flash: false, blur: false, dark: false, bright: false, cut: false } };
  });
  return { rid: resource.rid, windows: ws, sceneCuts: [], ms: ms || 0, fallback: true, cached: false, duration: dur };
}
function qsAbortError() { var e = new Error("cancelled"); e.name = "AbortError"; return e; }

async function quickScore(resource, opts) {
  opts = opts || {};
  var t0 = Date.now(), io = opts.io || qsHostIO(), signal = opts.signal, fps = opts.fps || QS_FPS;
  var dur = Number(resource.durationSeconds) || 0;
  var deadline = t0 + (opts.budgetMs == null ? QS_BUDGET_MS : opts.budgetMs);
  if (signal && signal.aborted) throw qsAbortError();
  var dataDir = opts.dataDir || null;
  if (!(dur > 0) || !resource.path || !io.runFFmpeg || !io.readBytes || !io.join || !dataDir) return qsFallback(resource, Date.now() - t0, opts.windows);
  // The decoded span: the given windows, else QS_HEAD .. QS_HEAD + QS_SPAN.
  var ws = opts.windows && opts.windows.length ? opts.windows : null;
  var a = ws ? Math.max(0, Math.min.apply(null, ws.map(function (x) { return x.start; }))) : Math.min(QS_HEAD, Math.max(0, dur - QS_BIN));
  var b = ws ? Math.min(dur, Math.max.apply(null, ws.map(function (x) { return x.end; }))) : Math.min(dur, a + QS_SPAN);
  var dir = io.join(dataDir, "quick-score");
  var safe = String(resource.rid).replace(/[^A-Za-z0-9_-]/g, "_");
  var mtime = 0;
  try { mtime = io.mtimeMs ? Math.round((await io.mtimeMs(resource.path)) || 0) : 0; } catch (e) { mtime = 0; }
  // mtime is 0 when the host lacks FileSystem.stat, so the duration also keys the cache (a file replaced at the same
  // path with different media is not served stale scores; Mini Vlog review).
  var durKey = Number(resource.durationSeconds || 0).toFixed(3);
  var key = [QS_VERSION, fps, QS_W, QS_H, mtime, durKey, a.toFixed(3), b.toFixed(3)].join("-");
  var cacheFile = io.join(dir, safe + ".json");
  if (io.readText && !ws) {
    try {
      var c = JSON.parse(await io.readText(cacheFile));
      if (c && c.key === key && c.result) return Object.assign({}, c.result, { cached: true, ms: Date.now() - t0 });
    } catch (e) { /* no cache yet */ }
  }
  if (Date.now() > deadline) return qsFallback(resource, Date.now() - t0, opts.windows);
  try { if (io.mkdir) await io.mkdir(dir); } catch (e) { /* the decode below reports it */ }
  var tmp = io.join(dir, safe + "-" + Date.now() + "-" + Math.floor(Math.random() * 1e6) + ".gray");
  var controller = typeof AbortController === "undefined" ? null : new AbortController();
  var relay = function () { if (controller) controller.abort(); };
  var timer = controller ? setTimeout(relay, Math.max(1000, deadline - Date.now())) : null;
  if (signal) signal.addEventListener("abort", relay);
  try {
    await io.runFFmpeg(["-hide_banner", "-loglevel", "error", "-nostdin", "-y", "-ss", a.toFixed(3), "-t", (b - a).toFixed(3), "-i", resource.path,
      "-an", "-vf", "fps=" + fps + ",scale=" + QS_W + ":" + QS_H + ",setsar=1,format=gray", "-f", "rawvideo", tmp], controller ? controller.signal : undefined);
    var bytes = await io.readBytes(tmp);
    if (!bytes || bytes.length < QS_W * QS_H) throw new Error("no frames");
    var stats = qsFrameStats(bytes, QS_W, QS_H);
    var cuts = qsSceneCuts(stats, fps, a);
    var windows = qsWindowScores(stats, fps, a, ws || qsBins(dur, a, b - a), cuts);
    var result = { rid: resource.rid, windows: windows, sceneCuts: cuts, ms: Date.now() - t0, fallback: false, cached: false, duration: dur };
    if (io.writeText && !ws) { try { await io.writeText(cacheFile, JSON.stringify({ key: key, result: result })); } catch (e) { /* no cache, no harm */ } }
    return result;
  } catch (e) {
    if (signal && signal.aborted) throw qsAbortError();
    return qsFallback(resource, Date.now() - t0, opts.windows);
  } finally {
    if (timer) clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", relay);
    if (io.remove) { try { await io.remove(tmp); } catch (e) { /* left behind */ } }
  }
}

async function quickScoreAll(resources, opts) {
  opts = opts || {};
  var results = new Map(), total = resources.length, done = 0, next = 0;
  var conc = Math.max(1, Math.min(opts.concurrency || 3, total || 1));
  var t0 = Date.now(), budget = opts.budgetMs == null ? QS_BUDGET_MS : opts.budgetMs;
  async function worker() {
    while (next < total) {
      var r = resources[next++];
      if (opts.signal && opts.signal.aborted) throw qsAbortError();
      var left = budget - (Date.now() - t0);
      var res = left > 0 ? await quickScore(r, Object.assign({}, opts, { budgetMs: left, onProgress: null })) : qsFallback(r, 0, null);
      results.set(r.rid, res);
      done++;
      if (opts.onProgress) { try { opts.onProgress({ done: done, total: total, rid: r.rid }); } catch (e) { /* the UI only */ } }
    }
  }
  var workers = [];
  for (var i = 0; i < conc; i++) workers.push(worker());
  await Promise.all(workers);
  return results;
}

// Pure: windows of `durationNeeded` seconds for `role`, best first (see the API above).
function pickWindowsLocal(scores, role, durationNeeded) {
  if (!scores || !scores.windows || !scores.windows.length) return [];
  var bins = scores.windows.filter(function (w) { return !w.empty; });
  var need = Math.max(QS_BIN, Number(durationNeeded) || QS_BIN), dur = Number(scores.duration) || 0;
  var sharpMax = Math.max.apply(null, bins.map(function (w) { return w.sharp; }).concat([1e-6]));
  var motions = bins.map(function (w) { return w.motion; }).sort(function (a, b) { return a - b; });
  var mRef = Math.max(0.01, motions[Math.floor(motions.length * 0.9)] || 0);
  var out = [], strict = [];
  for (var i = 0; i < bins.length; i++) {
    var start = bins[i].start;
    if (start < QS_HEAD - 1e-6 && dur >= need + QS_HEAD) continue;
    var j = i, end = start, group = [];
    while (j < bins.length && end - start < need - 1e-6) { if (group.length && Math.abs(bins[j].start - end) > 1e-3) break; group.push(bins[j]); end = bins[j].end; j++; }
    if (end - start < need - 1e-6) {
      // The last bins may be shorter than the window: accept when the clip itself reaches the end.
      if (dur && start + need <= dur + 1e-6 && group.length) end = start + need; else continue;
    }
    if (dur && start + need > dur + 1e-6) continue;
    var m = 0, sh = 0, lu = 0, bad = false, soft = 0;
    for (var g = 0; g < group.length; g++) {
      var x = group[g];
      m += x.motion; sh += x.sharp; lu += x.luma;
      if (x.flags.black || x.flags.fade || x.flags.flash) bad = true;
      if (x.flags.blur) soft += 0.3; if (x.flags.dark) soft += 0.2; if (x.flags.bright) soft += 0.2;
    }
    // A scene cut inside the window (not at its edges) would show two shots in one.
    var edge = 1 / QS_FPS, wend = start + need;
    if ((scores.sceneCuts || []).some(function (t) { return t > start + edge && t < wend - edge; })) bad = true;
    m /= group.length; sh /= group.length; lu /= group.length; soft /= group.length;
    var mr = Math.min(1, m / mRef);
    var moveTerm = role === "still" ? 1 - mr : role === "steady" ? 1 - Math.abs(mr - 0.35) : 0.4 + 0.6 * mr;
    var expose = Math.max(0, 1 - Math.abs(lu - 0.45) * 2);
    var score = Math.max(0, Math.min(1, 0.35 * (sh / sharpMax) + 0.3 * expose + 0.35 * moveTerm - soft));
    var cand = { start: start, end: start + need, score: Math.round(score * 1000) / 1000, motion: m, flags: { bad: bad, soft: soft > 0 } };
    (bad ? out : strict).push(cand);
  }
  var by = function (x, y) { return y.score - x.score || x.start - y.start; };
  strict.sort(by); out.sort(by);
  // Flagged windows only when nothing clean fits.
  return strict.length ? strict : out;
}

// Planner candidates (window centres) of a scored clip for `role`: at most `max`, at least `apart` seconds apart.
function qsCandidates(scores, role, durationNeeded, max, apart) {
  var picks = pickWindowsLocal(scores, role, durationNeeded), out = [];
  var gap = apart == null ? Math.max(1, durationNeeded) : apart;
  for (var i = 0; i < picks.length && out.length < (max || 6); i++) {
    var c = (picks[i].start + picks[i].end) / 2;
    if (out.some(function (o) { return Math.abs(o.t - c) < gap; })) continue;
    out.push({ t: Math.round(c * 1000) / 1000, score: picks[i].score, motion: picks[i].motion });
  }
  return out;
}
// quick-score:end

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
// The Korean system faces of a role on macOS and Windows (and Noto where installed), in that order.
var MV_KO_STACKS = { serif: '"AppleMyungjo", "Batang", "Noto Serif KR"', sans: '"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR"' };
function mvHasHangul(text) { return MV_HANGUL_RE.test(String(text || "")); }
// Hangul ink in em where the text is drawn (mvWideInk). The Korean face differs by OS: Apple SD Gothic Neo and
// AppleMyungjo on macOS, Malgun Gothic and Batang on Windows. The layout was tuned on macOS with these figures (about
// 0.86 em above the baseline and 0.12 em below it), so macOS always uses them as they are, and so do node and tests.
var MV_WIDE_UP = 0.86, MV_WIDE_DOWN = 0.12;
var MV_WIDE_SAMPLE = "\ud55c\uae00\ubdf0\ud790\uc77c\uc0c1";
// The sample's ink in the macOS face of each family at the weight it is drawn in (CoreText: Apple SD Gothic Neo
// Regular 0.804 / 0.071, Bold 0.812 / 0.080, AppleMyungjo 0.831 / 0.105). Elsewhere the measured ink moves the macOS
// figures by its difference from these: up = 0.86 + (measured - ref.up), down = 0.12 + (measured - ref.down).
var MV_WIDE_REF = {
  "MV Instrument Serif Italic": { up: 0.831, down: 0.105, weight: "" },
  "MV DM Serif Display": { up: 0.831, down: 0.105, weight: "" },
  "MV Rounded Bold": { up: 0.812, down: 0.080, weight: "bold " },
  "MV DM Mono": { up: 0.804, down: 0.071, weight: "" },
};
var MV_WIDE_CACHE = {};
var MV_WIDE_APPLE = null;
// True on macOS, or where an Apple Korean face is installed (it is first among the Korean faces of every stack, so it
// is the face that draws Hangul): the text then looks as it did when the macOS figures were taken. An installed face is
// told apart by width: a sample in '"<face>", <generic>' measures differently from the bare generic.
function mvAppleKorean(ctx) {
  if (MV_WIDE_APPLE !== null) return MV_WIDE_APPLE;
  var apple = false;
  try {
    var nav = typeof navigator !== "undefined" ? navigator : null;
    var plat = nav ? String((nav.userAgentData && nav.userAgentData.platform) || nav.platform || "") + " " + String(nav.userAgent || "") : "";
    apple = /mac/i.test(plat) && !/iphone|ipad|ipod/i.test(plat);
    var probe = "mmmwwwlli " + MV_WIDE_SAMPLE;
    var faces = ["Apple SD Gothic Neo", "AppleMyungjo"], generics = ["monospace", "serif", "sans-serif"];
    for (var f = 0; !apple && f < faces.length; f++) {
      for (var g = 0; !apple && g < generics.length; g++) {
        ctx.font = "100px " + generics[g];
        var bare = ctx.measureText(probe).width;
        ctx.font = '100px "' + faces[f] + '", ' + generics[g];
        var w = ctx.measureText(probe).width;
        if (typeof bare === "number" && typeof w === "number" && Math.abs(w - bare) > 0.5) apple = true;
      }
    }
  } catch (e) { /* not known to be Apple */ }
  MV_WIDE_APPLE = apple;
  return apple;
}
// A family's Hangul ink { up, down } in em, once per family: the macOS figures on macOS (mvAppleKorean), else those
// figures moved by the difference between canvas measureText(...).actualBoundingBoxAscent / Descent of the sample at
// 100 px in the family's stack (so the system Korean face that really draws it) and the macOS face's reference
// (MV_WIDE_REF), clamped; the macOS figures when there is no canvas or the measurement looks wrong.
function mvWideInk(family) {
  if (MV_WIDE_CACHE[family]) return MV_WIDE_CACHE[family];
  var ink = { up: MV_WIDE_UP, down: MV_WIDE_DOWN, measured: false };
  try {
    var doc = typeof document !== "undefined" ? document : null;
    var ctx = doc && doc.createElement ? doc.createElement("canvas").getContext("2d") : null;
    var ref = MV_WIDE_REF[family] || MV_WIDE_REF["MV DM Mono"];
    if (ctx && !mvAppleKorean(ctx)) {
      ctx.font = ref.weight + "100px " + mvFontStack(family);
      var r = ctx.measureText(MV_WIDE_SAMPLE);
      var mu = r.actualBoundingBoxAscent / 100, md = r.actualBoundingBoxDescent / 100;
      if (mu > 0.5 && mu < 1.3 && md > -0.1 && md < 0.5) {
        var up = Math.min(1.1, Math.max(0.7, MV_WIDE_UP + (mu - ref.up)));
        var down = Math.min(0.35, Math.max(0, MV_WIDE_DOWN + (md - ref.down)));
        ink = { up: Math.round(up * 1e4) / 1e4, down: Math.round(down * 1e4) / 1e4, measured: true };
      }
    }
  } catch (e) { /* the macOS figures */ }
  MV_WIDE_CACHE[family] = ink;
  return ink;
}
// The Hangul ink a metrics object carries (mvFace adds the measured one), else the macOS figures.
function mvWideOf(m) {
  return { up: m && typeof m.wideUp === "number" ? m.wideUp : MV_WIDE_UP, down: m && typeof m.wideDown === "number" ? m.wideDown : MV_WIDE_DOWN };
}
// Where a star or year centres on a line: the x-height band of Latin text, the middle of the ink of wide text.
function mvBand(text, m) {
  var w = mvWideOf(m);
  return MV_WIDE_RE.test(text) ? (w.up - w.down) / 2 : m.xHeight / m.unitsPerEm / 2;
}
// A text item's font stack: the bundled face, the Latin fallbacks, then the family's Korean faces (macOS, Windows,
// Noto) before the generic one.
function mvFontStack(family) {
  var serif = (MV_KO_FACES[family] || "Apple SD Gothic Neo") === "AppleMyungjo";
  return '"' + family + '", "Helvetica Neue", Arial, ' + (serif ? MV_KO_STACKS.serif + ", serif" : MV_KO_STACKS.sans + ", sans-serif");
}
var MV_MINI_WIDTH = (0.155 * 1920) / 1080; // "mini" advance width at size 100, fraction of height

function mvFace(data, preset, role) {
  var face = MV_FACES[preset][role];
  var fonts = data && Array.isArray(data.fonts) ? data.fonts : [];
  var m = null;
  for (var i = 0; i < fonts.length; i++) if (fonts[i] && fonts[i].family === face.family && fonts[i].metrics) m = fonts[i].metrics;
  // The family's Hangul ink as measured here (mvWideInk) travels with its metrics to mvInk and mvBand.
  var wide = mvWideInk(face.family);
  m = Object.assign({}, m || MV_FALLBACK_METRICS, wide.measured ? { wideUp: wide.up, wideDown: wide.down } : {});
  return { family: face.family, style: face.style, weight: face.weight, tracking: face.tracking || 0, stroke: face.stroke || 0, shade: typeof face.shade === "number" ? face.shade : 1, m: m };
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
  if (wide) { var w = mvWideOf(m); up = Math.max(up, w.up * m.unitsPerEm); down = Math.max(down, w.down * m.unitsPerEm); }
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

// The host I/O block below is Archive Vlog's av-host block (plugins/archive-vlog/panel.tsx), pasted verbatim: no shell,
// no node; the canonical SDK's file and FFmpeg / FFprobe operations (argv arrays), every member
// checked first (kit windows.md). tests/panel.test.cjs and tests/test_windows_mini_vlog.py compare it with a recorded
// hash, not with the sibling plugin. Errors with code 'host-missing' say STRINGS `newerSelects` (sayError).
// av-host:start
// Local files and media tools use the public async SDK. Paths remain host-native.
let hostSdk = null;
function hostUseSdk(sdk) { hostSdk = panelLocalClient(sdk); }
function hostError(code, message, member = "") { return Object.assign(new Error(message), { code, member }); }
// A host service when it has every named method, else null.
function hostApi(name, ...methods) {
  const s = name === "FileSystem" ? hostSdk?.files : name === "Runtime" ? hostSdk?.media : null;
  return s && methods.every((m) => typeof s[m] === "function") ? s : null;
}
// A host service that must have `method`; throws a 'host-missing' error when this build lacks it.
function hostNeed(name, method) {
  const s = hostApi(name, method);
  if (!s) throw hostError("host-missing", "Update Selects to use this plugin: missing SDK " + name + "." + method, name + "." + method);
  return s;
}
// The host initializes the environment before mounting the panel.
function hostIsWindows() { return /^win/i.test(String(hostSdk?.environment?.platform || "")); }
// Joins path parts with the host's join (the OS separator), or by hand with the OS separator.
function hostJoin(...parts) {
  const fs = hostApi("FileSystem", "join");
  if (fs) { try { return String(fs.join(...parts)); } catch { /* join by hand */ } }
  const sep = hostIsWindows() ? "\\" : "/";
  return parts.filter((x) => x !== "").map((x, i) => (i === 0 ? x.replace(/[\\/]+$/, "") : x.replace(/^[\\/]+|[\\/]+$/g, ""))).join(sep);
}
// A Buffer, ArrayBuffer or typed array as bytes (a Buffer may be a view into a larger pool). The value comes from the
// host window (window.parent), another JavaScript realm, so `instanceof ArrayBuffer` is false for it: the checks use
// the internal [[Class]] tag and array-likeness instead.
function hostBytes(v) {
  const tag = (x) => Object.prototype.toString.call(x);
  if (tag(v) === "[object ArrayBuffer]") return new Uint8Array(v);
  if (v && typeof v.byteLength === "number" && v.buffer && tag(v.buffer) === "[object ArrayBuffer]") {
    return new Uint8Array(v.buffer, v.byteOffset || 0, v.byteLength);
  }
  if (v && typeof v === "object" && typeof v.length === "number") return Uint8Array.from(v);
  throw hostError("read-failed", "the file could not be read");
}
// A file's bytes (FileSystem.readFile without an encoding).
async function hostReadBytes(path) {
  const v = await hostNeed("FileSystem", "readFile").readFile(path);
  if (typeof v === "string") throw hostError("read-failed", "the file came back as text");
  return hostBytes(v);
}
// A text file (some host builds return text directly, others bytes).
async function hostReadText(path) {
  const v = await hostNeed("FileSystem", "readFile").readFile(path);
  return typeof v === "string" ? v : new TextDecoder().decode(hostBytes(v));
}
// Cleanup is best effort; all disk operations cross the async SDK bridge.
async function hostRemove(path) {
  try { await hostNeed("FileSystem", "removeFile").removeFile({ filePath: path }); } catch { /* leftover temporary file */ }
}
async function hostRoots(sdk, id, marker) {
  hostUseSdk(sdk);
  const fs = hostNeed("FileSystem", "exists");
  const plugin = fs.join(fs.homedir(), ".selects", "skills", id);
  if (!await fs.exists(fs.join(plugin, marker))) throw hostError("not-found", "the plugin folder could not be found");
  let data = fs.join(fs.homedir(), ".selects", "plugin-data", id);
  try { await fs.mkdir(data, { recursive: true }); } catch { data = null; }
  return { plugin, data };
}
// Mono 32-bit float samples of an audio file at `rate`, at most `maxSeconds`, decoded by the host's ffmpeg into a
// temporary file in `dataDir` and read back (the file is removed). null when this host has no ffmpeg or no data folder;
// throws when ffmpeg fails or `signal` (optional) aborts it.
async function hostDecodePcm(path, dataDir, rate, maxSeconds, signal, timeoutMs = 120000) {
  const rt = hostApi("Runtime", "runFFmpeg");
  if (!rt || !dataDir || !hostApi("FileSystem", "readFile")) return null;
  const tmp = hostJoin(dataDir, "pcm-" + Date.now() + "-" + Math.floor(Math.random() * 1e6) + ".f32");
  const controller = typeof AbortController === "undefined" ? null : new AbortController();
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  const relay = () => { if (controller) controller.abort(); };
  if (signal) { if (signal.aborted) relay(); else signal.addEventListener("abort", relay); }
  try {
    await rt.runFFmpeg(["-nostdin", "-v", "error", "-y", "-t", String(maxSeconds), "-i", path, "-ac", "1", "-ar", String(rate), "-f", "f32le", tmp], true, controller ? controller.signal : undefined);
    const bytes = await hostReadBytes(tmp);
    // A copy, so the samples sit on a 4-byte boundary.
    const samples = new Float32Array(bytes.slice(0, Math.floor(bytes.byteLength / 4) * 4).buffer);
    if (!samples.length) throw hostError("decode-failed", "ffmpeg returned no audio");
    return samples;
  } finally {
    if (timer) clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", relay);
    await hostRemove(tmp);
  }
}
// An audio or video file's length in seconds from the host's ffprobe, or null.
async function hostProbeSeconds(path) {
  try {
    const rt = hostApi("Runtime", "runFFprobe");
    if (!rt) return null;
    const r = await rt.runFFprobe(["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path], true);
    const v = parseFloat(String(r?.stdout || "").trim());
    return v > 0 ? v : null;
  } catch { return null; }
}
// av-host:end
// The source of the own-music beat worker: Archive Vlog's av-beat-worker block, pasted verbatim (the kit's
// beat-detect.cjs, read from the install folder, runs unmodified inside it).
// av-beat-worker:start
// The source of the Web Worker that runs beat-detect.cjs, read from the install folder and used unmodified (one source
// for the CLI, the tests and the panel). The file runs inside a function with its own `module`, `exports` and an inert
// `require`: require.main is undefined, so its CLI branch never runs. The worker answers one { samples, rate } message
// with { ok: analyze(samples, rate) } or { error }. Plain JS, so tests run the same source in node:vm.
function avBeatWorkerSource(beatDetectText) {
  return '"use strict";\nvar avBeat = (function () {\n  var module = { exports: {} };\n  var require = function () { return {}; };\n'
    + '  (function (module, exports, require) {\n' + beatDetectText + '\n  })(module, module.exports, require);\n  return module.exports;\n})();\n'
    + 'onmessage = function (e) {\n  try { postMessage({ ok: avBeat.analyze(e.data.samples, e.data.rate) }); }\n'
    + '  catch (err) { postMessage({ error: String((err && err.message) || err) }); }\n};\n';
}
// av-beat-worker:end
// Reads a text file under `root`; `rel` is a "/"-separated path inside it, joined with the host's separator.
async function readText(root: string, rel: string) { return hostReadText(hostJoin(root, ...rel.split("/"))); }
// The install folder and the data folder (<home>/.selects/plugin-data/mini-vlog) for locateRoots, through the host's
// FileSystem (no shell). The install folder is av-host's (the home folder joined with .selects, skills and the id),
// else SELECTS_USER_SKILLS_ROOT from the host's environment joined with the id, when it holds planner.js. The data
// folder is created when the host can (a host without mkdir still gets its path: temporary files then fail on
// their own and fall back). A host without the FileSystem members says the one "needs a newer Selects" message;
// no install folder gives { plugin: "", data: "" } (locateRoots then says `foldersNotFound`).
async function mvFolders(sdk: any): Promise<{ plugin: string; data: string }> {
  hostUseSdk(sdk);
  if (!hostApi("FileSystem", "join", "homedir", "exists")) throw uiError((l) => t(l, "newerSelects"));
  try { const roots = await hostRoots(sdk, PLUGIN_ID, "planner.js"); return { plugin: roots.plugin, data: roots.data || "" }; }
  catch { return { plugin: "", data: "" }; }
}
// Your own music: at most this much of the track is analysed (and used), mono at this rate (beat-detect's rate, so the
// panel's result equals the CLI's on the same samples: dev/beat-parity.cjs).
const OWN_MAX_SECONDS = 240;
const OWN_RATE = 22050;
// beat-detect's analysis of the samples in a Web Worker (avBeatWorkerSource), never on the panel's thread: the panel
// CSP allows blob: workers. A host that refuses the worker rejects the analysis, and the panel falls back to fixed
// timing. `signal` aborts it (worker.terminate()); so does `timeoutMs` (BEAT_TIMEOUT_MS): a worker that never answers
// rejects with code "beat-timeout" (fixed timing then). Archive Vlog's analyseBeat, unchanged.
const BEAT_TIMEOUT_MS = 60000;
function analyseBeat(source: string, samples: Float32Array, signal: AbortSignal | null, timeoutMs: number = BEAT_TIMEOUT_MS): Promise<any> {
  return new Promise((resolve, reject) => {
    let worker: Worker | null = null, url: string | null = null, done = false;
    let timer: any = null;
    const finish = (fn: () => void) => {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      try { worker?.terminate(); } catch { /* gone */ }
      if (url) { try { URL.revokeObjectURL(url); } catch { /* gone */ } }
      signal?.removeEventListener("abort", onAbort);
      fn();
    };
    const onAbort = () => finish(() => reject(new Error("cancelled")));
    if (signal?.aborted) { reject(new Error("cancelled")); return; }
    signal?.addEventListener("abort", onAbort);
    try {
      url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
      worker = new Worker(url);
    } catch (e: any) { finish(() => reject(new Error("the beat detector could not start: " + String(e?.message || e)))); return; }
    worker.onmessage = (e: MessageEvent) => finish(() => (e.data && e.data.error ? reject(new Error(e.data.error)) : resolve(e.data && e.data.ok)));
    worker.onerror = (e: any) => { try { e?.preventDefault?.(); } catch { /* nothing */ } finish(() => reject(new Error("the beat detector stopped: " + String(e?.message || "worker error")))); };
    timer = setTimeout(() => finish(() => { const err: any = new Error("the beat detection took too long"); err.code = "beat-timeout"; reject(err); }), timeoutMs);
    worker.postMessage({ samples, rate: OWN_RATE });
  });
}
// Whether this host can run your own music's beat detection and the section preview: the host's ffmpeg, file reads
// and blob Web Workers (own music only).
function mvMusicTools() {
  const ffmpeg = !!hostApi("Runtime", "runFFmpeg") && !!hostApi("FileSystem", "readFile");
  return { ffmpeg, worker: ffmpeg && typeof Worker !== "undefined" && typeof Blob !== "undefined" && typeof URL !== "undefined" && typeof URL.createObjectURL === "function" };
}
// The config goes in as JSON.parse of a string so its type is `any`: an inlined literal widens `type` to string
// (rejected by EditableParameterDefinition[]) and narrows a null option to `never` inside its `if`.
function fill(script: string, cfg: unknown) { return script.replace("__CONFIG__", () => "JSON.parse(" + JSON.stringify(JSON.stringify(cfg)) + ")"); }
// Thrown when the Project changed while a build was running; its results are dropped silently.
const STALE = new Error("The Project changed during the build.");
// Thrown when the person pressed Cancel during the quick local check; nothing was saved yet.
const CANCELLED = new Error("The build was cancelled.");
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
// Footage counts from inventory.js's skipped counts (build without analysis): usable clips without analysis
// (`notAnalysed`: their shots come from the quick local check) and clips that cannot be used yet (`unanalysed`: no
// length or no source file, e.g. still importing). Analysis never blocks a build.
function mvFootageCounts(skipped: any) {
  const s = skipped || {};
  return { notAnalysed: s.notAnalysed || 0, unusable: s.unanalysed || 0 };
}
// The short facts for the end of the Ready line ("" for a count of 0): a small note that analysed clips give better
// picks, and the clips that cannot be used yet.
function mvFootageNotes(lang: Lang, c: any) {
  return [c.notAnalysed ? t(lang, "betterPicks", { count: c.notAnalysed }) : "", c.unusable ? t(lang, "unusable", { count: c.unusable }) : ""];
}
// The plugin's data folder (<home>/.selects/plugin-data/<id>) through the host's FileSystem (paths joined by the host,
// so Windows works), created when missing; the quick local check caches its scores there. null when this host lacks
// the members: the check then gives evenly spaced windows and the panel says a newer Selects checks clips better.
async function mvHostDataDir(id: string): Promise<string | null> {
  try {
    const fs = hostSdk?.files;
    if (!fs || typeof fs.join !== "function" || typeof fs.homedir !== "function") return null;
    const dir = String(fs.join(fs.homedir(), ".selects", "plugin-data", id));
    if (typeof fs.mkdir === "function") (await fs.mkdir(dir, { recursive: true }));
    return dir;
  } catch { return null; }
}
// Whether this host can run the quick local check at all (qsHostIO: the host's ffmpeg and file reads).
function mvQuickCheckAvailable(dataDir: string | null) {
  const io: any = qsHostIO();
  return !!(dataDir && io.runFFmpeg && io.readBytes && io.join);
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

// The install folder (scripts, cues, fonts) and the data folder for temporary audio, created when missing. Shared by
// the panel and a template run.
async function locateRoots(sdk: any) {
  const { plugin, data } = await mvFolders(sdk);
  if (!plugin || !data) throw uiError((l) => t(l, "foldersNotFound"));
  return { plugin, data };
}

// A template run (Clip highlights hands the footage over in `context.template`) builds out of sight; anything else is
// the panel.
function Panel(props: any) {
  hostUseSdk(props.sdk);
  return props?.context?.template ? <TemplateRun sdk={props.sdk} context={props.context} /> : <MiniVlogPanel {...props} />;
}

function MiniVlogPanel({ sdk, context, ui }: any) {
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
  // The quick local check of clips without analysis is running: the Build button's slot shows Cancel, which aborts it.
  const [checking, setChecking] = React.useState(false);
  const localAbortRef = React.useRef<AbortController | null>(null);
  const [tools, setTools] = React.useState({ ffmpeg: true, worker: true });
  // The running own-music analysis: a Project switch or unmount cancels it (abort: the ffmpeg decode and the worker),
  // and the request id drops a late result. While it runs the panel is busy, so no other track can be chosen.
  const ownJobRef = React.useRef<{ id: number; abort: AbortController | null }>({ id: 0, abort: null });
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
  // Consecutive reads still waiting for unusable clips (or any footage), and whether that reached WAIT_POLL_MAX.
  const waitReadsRef = React.useRef(0);
  const [waitStalled, setWaitStalled] = React.useState(false);

  // Reads the Project's footage inventory. Never writes state for a stale Project, and never runs during a build.
  // Resolves to "failed" only when a read ran and failed with a non-busy error (the case worth one quick retry).
  async function loadInventory(pid: string | null = projectRef.current, alive: () => boolean = () => true): Promise<"ok" | "busy" | "failed" | "skipped"> {
    const script = inventoryJsRef.current;
    // One read per Project at a time; a read for another Project never blocks this one.
    if (!pid || !script || busyRef.current || invLoadingRef.current === pid) return "skipped";
    const live = () => mountedRef.current && alive() && projectRef.current === pid;
    invLoadingRef.current = pid; setInvLoading(true);
    try {
      const inv = await readInventoryPages(run, script, { projectId: pid, only: null, known: photoSizesRef.current, measureMs: INVENTORY_MEASURE_MS }, fill, live);
      // A build that started meanwhile keeps the clip set it began with; the next refresh picks this up.
      if (!live() || busyRef.current) return "skipped";
      inv.resources = inv.resources || [];
      inv.photos = inv.photos || [];
      for (const ph of inv.photos) if (ph.width > 0 && ph.height > 0) photoSizesRef.current[ph.rid] = { width: ph.width, height: ph.height };
      const sk = inv.skipped || {};
      // A clip that finishes analysis moves from the quick local check to the scene search, so `analysed` is part of it.
      const sig = inv.resources.map((r: any) => r.rid + (r.analysed === false ? "~" : "")).sort().join(",") + "|" + [sk.unanalysed, sk.notAnalysed].map((x) => String(x ?? "")).join(",");
      // A changed clip set drops the cached shot candidates so a build never uses stale ones.
      const sameSet = invSigRef.current === sig;
      if (invSigRef.current !== sig) { if (invSigRef.current !== null) setCandidates(null); invSigRef.current = sig; }
      if (inv.incomplete) { incompleteReadsRef.current++; if (incompleteReadsRef.current >= INCOMPLETE_POLL_MAX) setIncompleteStalled(true); }
      else { incompleteReadsRef.current = 0; setIncompleteStalled(false); }
      const waiting = mvFootageCounts(inv.skipped).unusable > 0 || (inv.resources.length === 0 && !inv.photos.length);
      if (waiting && sameSet && waitReadsRef.current > 0) { waitReadsRef.current++; if (waitReadsRef.current >= WAIT_POLL_MAX) setWaitStalled(true); }
      else { waitReadsRef.current = waiting ? 1 : 0; setWaitStalled(false); }
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
  const refreshInventory = () => { incompleteReadsRef.current = 0; setIncompleteStalled(false); waitReadsRef.current = 0; setWaitStalled(false); loadInventory(); };

  // Mount and Project switch: reset per-Project state, resolve folders, read bundled assets, inventory the Project.
  React.useEffect(() => {
    // Drop everything tied to the previous Project so a build never mixes Projects.
    setCandidates(null); setResult(null); setStatus(null); setInventory(null); setInvError(null); setInvLoading(false);
    setOnly(null); setOnlyPhotos(null);
    invSigRef.current = null; photoSizesRef.current = {}; incompleteReadsRef.current = 0; setIncompleteStalled(false); waitReadsRef.current = 0; setWaitStalled(false);
    busyRef.current = false; setBusy(false); setStep(""); setProgress(null); progressRef.current = null;
    if (!projectId) return;
    let alive = true;
    (async () => {
      try {
        const { plugin, data } = await locateRoots(sdk);
        if (!alive) return;
        setRoots({ plugin, data });
        // The host's ffmpeg (and a blob Web Worker for own music) is only needed for previews and own music; bundled
        // cues work without them. No shell: the host's services are checked directly (mvMusicTools).
        setTools(mvMusicTools());
        const read = (rel: string) => readText(plugin, rel);
        const [manifest, presets, inventoryJs, searchJs, ensureJs, assembleJs, decorateJs, titleTsx, softTsx, motionTsx, punchTsx, beatDetect] = await Promise.all([
          read("assets/cues/manifest.json"), read("assets/fonts/presets.json"), read("scripts/inventory.js"), read("scripts/search.js"),
          read("scripts/ensure-audio.js"), read("scripts/assemble.js"), read("scripts/decorate.js"), read("assets/title-lockup.tsx"), read("assets/soft-look.tsx"),
          read("assets/photo-motion.tsx"), read("assets/beat-punch.tsx"), read("beat-detect.cjs")]);
        if (!alive) return;
        setAssets({ manifest: JSON.parse(manifest), presets: JSON.parse(presets), scripts: { inventoryJs, searchJs, ensureJs, assembleJs, decorateJs }, titleTsx, softTsx, motionTsx, punchTsx,
          beatWorker: avBeatWorkerSource(beatDetect) });
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
    // Project switch or unmount stops a preview, including one still being prepared, and a quick local check.
    return () => { alive = false; stopPreview(); localAbortRef.current?.abort(); cancelOwnMusic(); };
  }, [projectId]);

  // Clips that cannot be used yet (no length or no file: usually still importing), or no clips at all yet: re-read the
  // inventory every 10 s until they are ready. Analysis is not waited for: clips without it are usable right away.
  // The effect re-arms on each new inventory, and stops on unmount, Project switch and while busy.
  // A Project with only photos has nothing to wait for, so it does not poll (each read measures new photos).
  // A partial read (`incomplete`: the Project was still loading) polls too, until the clip sizes are all known.
  // Each kind of waiting stops after its cap (INCOMPLETE_POLL_MAX, WAIT_POLL_MAX reads in a row).
  const invFootage = mvFootageCounts(inventory?.skipped);
  const needsPoll = !!inventory && ((!!inventory.incomplete && !incompleteStalled) || ((invFootage.unusable > 0 || (inventory.resources.length === 0 && !inventory.photos?.length)) && !waitStalled));
  React.useEffect(() => {
    if (!projectId || !needsPoll || busy) return;
    const pid = projectId;
    const t = setInterval(() => { loadInventory(pid); }, 10000);
    return () => clearInterval(t);
  }, [projectId, needsPoll, busy]);
  // Coming back to the panel (tab shown or window focused) re-reads the inventory and, like Refresh, restarts the
  // capped polling (both read counters).
  React.useEffect(() => {
    if (!projectId) return;
    const pid = projectId;
    const again = () => { incompleteReadsRef.current = 0; setIncompleteStalled(false); waitReadsRef.current = 0; setWaitStalled(false); loadInventory(pid); };
    const onVisible = () => { if (document.visibilityState === "visible") again(); };
    const onFocus = () => { again(); };
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

  // Stops a running own-music analysis (Archive Vlog's cancelOwnMusic).
  function cancelOwnMusic() {
    const job = ownJobRef.current;
    job.id++;
    if (job.abort) { job.abort.abort(); job.abort = null; }
  }
  // Your own music: the host's ffmpeg decodes the first OWN_MAX_SECONDS to mono f32le at OWN_RATE in the data folder
  // (hostDecodePcm: ASCII temporary name, removed afterwards), and the kit's beat-detect.cjs, unmodified, analyses the
  // samples in a blob Web Worker (analyseBeat, BEAT_TIMEOUT_MS). Any failure falls back to fixed timing.
  async function detectOwnMusic(file: { path: string; name: string }) {
    if (busyRef.current || !roots || !assets) return;
    cancelOwnMusic();
    const job = ownJobRef.current, id = job.id, pid = projectRef.current, abort = new AbortController();
    job.abort = abort;
    const live = () => mountedRef.current && ownJobRef.current.id === id && projectRef.current === pid;
    busyRef.current = true;
    setOwnMusic(file); setOwnGrid(null); setBusy(true); setStep("listening");
    let samples: Float32Array | null = null;
    try {
      samples = await hostDecodePcm(file.path, roots.data, OWN_RATE, OWN_MAX_SECONDS, abort.signal);
      if (!samples) throw hostError("host-missing", "this Selects build cannot decode audio", "Runtime.runFFmpeg");
      if (!live()) return;
      const g = await analyseBeat(assets.beatWorker, samples, abort.signal);
      if (!live()) return;
      if (!g || typeof g !== "object") throw uiError((l) => t(l, "beatFailed"));
      setOwnGrid(g);
      // What was found is shown under the file (ownBeatLine), next to where the music was chosen.
      setStatus(null);
    } catch (e: any) {
      if (!live()) return;
      // Without a grid the cuts use fixed timing, but the track's real length still bounds the section.
      let duration: number | null = samples && samples.length ? Math.round((samples.length / OWN_RATE) * 1000) / 1000 : null;
      if (!duration) { const v = await hostProbeSeconds(file.path); if (v) duration = Math.min(v, OWN_MAX_SECONDS); }
      if (!live()) return;
      setOwnGrid({ accepted: false, grid: "none", failed: true, durationSeconds: duration, peaks: [] });
      setStatus(duration
        ? { tone: "info", say: (l: Lang) => t(l, "musicApprox", { detail: sayError(l, e) }) }
        : { tone: "error", say: (l: Lang) => t(l, "musicUnreadable", { detail: sayError(l, e) }) });
    } finally {
      // The decoded samples (about 21 MB at most) are dropped with this call. Only the current job clears busy and the
      // step: a cancelled one (Project switch, which resets them itself) must not end a build that started since.
      samples = null;
      if (ownJobRef.current.id === id) {
        ownJobRef.current.abort = null;
        busyRef.current = false; if (mountedRef.current) { setBusy(false); setStep(""); }
      }
    }
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
      const file = ownMusic ? ownMusic.path : hostJoin(roots.plugin, "assets", "cues", cue.file);
      // The whole section, cut by the host's ffmpeg (argv, no shell) into an mp3 in the data folder (ASCII name), read
      // back as bytes and removed at once, so the data folder never collects previews.
      const dur = videoSeconds, out = hostJoin(roots.data, "preview-" + token + "-" + Date.now() + ".mp3");
      const rt = hostNeed("Runtime", "runFFmpeg");
      let bytes: Uint8Array = new Uint8Array(0);
      try {
        await rt.runFFmpeg(["-nostdin", "-v", "error", "-y", "-ss", start.toFixed(2), "-t", dur.toFixed(2), "-i", file, "-ac", "1", "-ar", "22050", "-b:a", "48k",
          "-af", "afade=t=out:st=" + Math.max(0, dur - 0.4).toFixed(2) + ":d=0.4", "-f", "mp3", out], true);
        if (!live()) return;
        bytes = await hostReadBytes(out);
      } catch (e: any) {
        if (e?.code === "host-missing") throw e;
        throw e?.message ? e : uiError((l) => t(l, "previewNotCut"));
      } finally { void hostRemove(out); }
      if (!live()) return;
      if (bytes.byteLength < 150) throw uiError((l) => t(l, "noAudio"));
      let url: string;
      if (typeof Blob !== "undefined" && typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
        // A copy: the bytes may be a view into the host's buffer (another realm).
        url = URL.createObjectURL(new Blob([bytes.slice()], { type: "audio/mpeg" }));
        previewUrlRef.current = url;
      } else {
        let bin = "";
        for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
        url = "data:audio/mpeg;base64," + btoa(bin);
      }
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

  // `onProgress(done)`: videos searched so far (the build turns it into the step's share).
  async function findCandidates(rids: string[], pid: string, check: () => void, queries: Record<string, string>, onProgress: (done: number) => void) {
    const list: any[] = []; const failed: string[] = [];
    // SEARCH_BATCH clips per call keeps each scene search under runScript's fixed 30 s deadline.
    // pageSize stays 4: hits are scene-level, so 8 adds almost no new times; the planner fills gaps with filler candidates.
    for (let i = 0; i < rids.length; i += SEARCH_BATCH) {
      // Only videos are searched (photos join without a search), so the count is in videos.
      onProgress(i);
      // Only analysed clips are passed (checkAnalysis: false skips search.js's own resources() read).
      const r = await run("Search shots", fill(assets.scripts.searchJs, { projectId: pid, rids: rids.slice(i, i + SEARCH_BATCH), queries, pageSize: 4, checkAnalysis: false }), false, { wanted: () => projectRef.current === pid });
      check();
      list.push(...r.candidates); failed.push(...r.failed);
    }
    onProgress(rids.length);
    return { list, failed };
  }

  // The quick local check of clips without analysis (the kit's quickScoreAll, host ffmpeg, no shell):
  // MV_LOCAL_CONCURRENCY clips at a time within a shared MV_LOCAL_BUDGET_MS, cached by the kit in the data folder per
  // clip and file time. The progress line says "Checking clips N/M"; Cancel (in the Build button's slot) and a Project
  // switch abort it. A clip it cannot decode (no host ffmpeg, an error, the budget spent) gets evenly spaced windows
  // (mvLocalCandidates), so the build goes ahead; the next Build checks such a clip again. Throws only CANCELLED or
  // STALE. `unavailable`: this host lacks the members the check needs (the result then says a newer Selects picks
  // better). `controller` is the build's: Cancel aborts it, which also stops the scene search running alongside.
  // `onProgress(done)`: how many clips the check has finished.
  async function checkLocalClips(clips: any[], pid: string, controller: AbortController, onProgress: (done: number) => void): Promise<{ results: any[]; unavailable: boolean }> {
    if (!clips.length) return { results: [], unavailable: false };
    const dataDir = (await mvHostDataDir(PLUGIN_ID));
    const unavailable = !mvQuickCheckAvailable(dataDir);
    localAbortRef.current = controller;
    setChecking(true);
    const total = clips.length, started = Date.now();
    const say = onProgress;
    say(0);
    try {
      const scored: Map<string, any> = await quickScoreAll(clips.map((r: any) => ({ rid: r.rid, path: r.path, durationSeconds: r.duration })), {
        concurrency: MV_LOCAL_CONCURRENCY, budgetMs: MV_LOCAL_BUDGET_MS, dataDir, signal: controller.signal,
        onProgress: (p: any) => { if (projectRef.current !== pid) controller.abort(); else say(p.done); } });
      const results = clips.map((r: any) => ({ rid: r.rid, duration: r.duration, scores: scored.get(r.rid) || null }));
      const all = results.map((r: any) => r.scores).filter(Boolean);
      console.info("[mini-vlog] quick check", { clips: total, ms: Date.now() - started, decoded: all.filter((x: any) => !x.fallback && !x.cached).length,
        cached: all.filter((x: any) => x.cached).length, fallback: all.filter((x: any) => x.fallback).length, unavailable });
      return { results, unavailable };
    } catch (e) {
      if (projectRef.current !== pid) throw STALE;
      if (controller.signal.aborted) throw CANCELLED;
      throw e;
    } finally {
      if (localAbortRef.current === controller) localAbortRef.current = null;
      if (mountedRef.current) setChecking(false);
    }
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
    // The gate for the seed this build uses (Build: seed; Try other shots: seed + 1).
    const gate = nextSeed === seed ? blockReason : anotherBlock;
    if (gate) { setStatus({ tone: "error", say: gate }); return; }
    const pid = projectId;
    const check = () => { if (projectRef.current !== pid) throw STALE; };
    // Every input as it is at Build. The build and a later "Finish title and look" read only this.
    const frozen = Object.freeze({
      pid, seed: nextSeed, preset, presetLabel: chosen.label, fields: { ...titleFields },
      music: musicKind, cueId, musicPath: musicKind === "own" ? ownMusic!.path : musicKind === "cue" ? hostJoin(roots.plugin, "assets", "cues", cue.file) : null,
      sectionStart: musicStart, pace, length, requested, clipSound, soft, punch: beatPunch, hook: hook && musicKind === "cue", bpm: gridded ? grid.bpm : null, usePhotos, only, onlyPhotos,
      draftName: "Mini Vlog " + chosen.label + " " + stamp(new Date()),
      // A bundled cue's length (manifest): ensure-audio.js may then match the cue by file name and length.
      musicDuration: musicKind === "cue" && typeof cue?.duration === "number" ? cue.duration : null,
    });
    busyRef.current = true;
    stopPreview();
    setBusy(true); setStatus(null); setResult(null);
    advance("shots", 0);
    try {
      // The scene search is cached per Project, clip selection and query set (the motion query runs only with Beat punch).
      const key = pid + "|" + JSON.stringify(only) + (frozen.punch ? "|motion" : "");
      const chosenVideos: any[] = inventory.resources.filter((r: any) => !only || only.includes(r.rid));
      // Analysed clips get the scene search; clips without analysis the quick local check (build without analysis).
      const rids: string[] = chosenVideos.filter((r: any) => r.analysed !== false).map((r: any) => r.rid);
      const localClips: any[] = chosenVideos.filter((r: any) => r.analysed === false);
      const dur: Record<string, number> = Object.fromEntries(inventory.resources.map((r: any) => [r.rid, r.duration]));
      const cached = candidates && candidates.key === key ? candidates : null;
      // A build from photos alone has no videos to check; the step says so instead of a bare 0%.
      const shotsDetail: Say | undefined = chosenVideos.length ? undefined : (l) => t(l, "photosOnly");
      if (shotsDetail) advance("shots", 0, shotsDetail);
      let found = cached;
      // The quick local check's results are kept with the scene search; a clip it could not decode (fallback windows)
      // is checked again by the next Build, the others are reused.
      const localKept: any[] = cached ? cached.local.results.filter((r: any) => r.scores && !r.scores.fallback) : [];
      const localTodo: any[] = localClips.filter((r: any) => !localKept.some((k: any) => k.rid === r.rid));
      if (!cached || cached.failed.length || localTodo.length) {
        // Search everything the first time; afterwards retry only the clips whose search failed.
        const todo: string[] = cached ? cached.failed : rids;
        // The scene search and the quick local check run side by side. The step's share counts both (searched videos
        // plus checked clips over their sum) and never goes back; the detail names the part that moved last.
        const share = { scene: 0, local: 0, at: 0 };
        let stopping = false;
        const shareOf = (detail: Say) => {
          if (stopping) return;
          const n = todo.length + localTodo.length;
          share.at = Math.max(share.at, n ? (share.scene + share.local) / n : 0);
          advance("shots", share.at, detail);
        };
        const controller = new AbortController();
        const sceneCheck = () => { check(); if (controller.signal.aborted) throw CANCELLED; };
        const sceneRun = findCandidates(todo, pid, sceneCheck, mvSearchQueries(MV_QUERIES, frozen.punch),
          (done) => { share.scene = done; if (todo.length) shareOf((l) => t(l, "videosChecked", { done, count: todo.length })); })
          // A failed search stops the local check too, so nothing keeps running after the build ends.
          .catch((e) => { controller.abort(); throw e; });
        const localRun = checkLocalClips(localTodo, pid, controller,
          (done) => { share.local = done; shareOf((l) => t(l, "checkingClipsN", { done, count: localTodo.length })); });
        let fresh: any, checked: any;
        try {
          [fresh, checked] = await Promise.all([sceneRun, localRun]);
          check();
        } catch (e) {
          // Cancel or a failure in either part: stop both and wait until both have settled (a search batch in flight
          // ends at its next check), so busy never drops while work is still running. The step says it is stopping.
          controller.abort();
          stopping = true;
          advance("shots", share.at, (l) => t(l, "stopping"));
          await Promise.allSettled([sceneRun, localRun]);
          throw e;
        }
        const retried = new Set(todo);
        const scene = [...(cached ? cached.scene.filter((c: any) => !retried.has(c.rid)) : []), ...fresh.list.map((c: any) => ({ ...c, sourceDuration: dur[c.rid] || 0 }))];
        // `list` is what the planner gets: the scene hits unchanged plus the local candidates on their scale (mvWithLocal).
        const results = localClips.map((r: any) => localKept.find((k: any) => k.rid === r.rid) || checked.results.find((k: any) => k.rid === r.rid)).filter(Boolean);
        const local = { results, unavailable: localTodo.length ? checked.unavailable : !!cached?.local?.unavailable };
        found = { key, failed: fresh.failed, scene, local, list: mvWithLocal(scene, local.results, frozen.punch) };
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
        : await run("Add music to the project", fill(assets.scripts.ensureJs, { projectId: pid, path: frozen.musicPath, duration: frozen.musicDuration }), true);
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
      const res = { sequenceId: a.sequenceId, videoEnd: a.totalFrames, fps: a.fps, decorated: false, frozen, plan, notes: a.notes || [], link: null, shortened, unchecked: found.failed.length,
        quickUnavailable: !!found.local?.unavailable };
      setResult(res);
      await decorate(res, check);
    } catch (e: any) {
      if (e === CANCELLED && projectRef.current === pid) setStatus({ tone: "muted", say: (l: Lang) => t(l, "cancelled") });
      else if (e !== STALE && projectRef.current === pid) setStatus({ tone: "error", say: stopAt(e) });
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
  // seed, so each button is gated with the seed it builds with: Build uses `seed`, Try other shots `seed + 1`.
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

  // Clips that cannot be used yet, as a sentence for the lines that have nothing else to say.
  // After the wait cap (waitStalled) nothing re-reads by itself any more, so the sentence asks for Refresh instead.
  const unusableText = !invFootage.unusable ? "" : waitStalled ? t(L, "unusableRefresh", { count: invFootage.unusable }) : t(L, "unusableWait", { count: invFootage.unusable });
  const clipCount = [
    allRids.length ? (only ? t(L, "clipsSelected", { selected: selectedRids.length, count: allRids.length }) : t(L, "clips", { count: allRids.length })) : "",
    usePhotos && allPhotoRids.length ? (onlyPhotos ? t(L, "photosSelected", { selected: selectedPhotoRids.length, count: allPhotoRids.length }) : t(L, "photos", { count: allPhotoRids.length })) : "",
  ].filter(Boolean).join(" · ");
  const plannedSeconds = readyPlan && readyPlan.ok ? planSeconds(readyPlan) : videoSeconds;
  const readiness = !inventory ? (invError ? (invError.busy ? invError.say(L) : t(L, "invFailed")) : t(L, "checkingClipsNow"))
    : inventory.incomplete && incompleteStalled ? t(L, "invPartial")
    : inventory.resources.length === 0 && !allPhotoRids.length && inventory.incomplete ? t(L, "stillReading")
    : inventory.resources.length === 0 && !allPhotoRids.length ? (unusableText || (waitStalled ? t(L, "noFootageRefresh") : t(L, "noFootage")))
    : inventory.resources.length === 0 && !usePhotos ? [unusableText, t(L, "turnOnPhotos")].filter(Boolean).join(t(L, "gap"))
    : selectedRids.length === 0 && usedPhotoCount === 0 ? t(L, "noClipsSelected")
    : t(L, "ready", { summary: [clipCount, t(L, "aboutSeconds", { seconds: Math.round(plannedSeconds) }), ...mvFootageNotes(L, invFootage)].filter(Boolean).join(" · ") });
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
  const canOwnMusic = tools.ffmpeg && tools.worker;
  const cues: any[] = assets?.manifest.cues || [];
  const referenceCues = cues.filter((c) => c.group !== "alternative");
  const alternativeCues = cues.filter((c) => c.group === "alternative");
  const chooseTrack = (v: string) => { if (busyRef.current) return; setCueId(v); if (v !== "own") { cancelOwnMusic(); setOwnMusic(null); setOwnGrid(null); } };
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
        {!canOwnMusic ? <ui.Message tone="muted">{t(L, "newerSelects")}</ui.Message> : null}
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
            <div style={{ maxHeight: 220, overflowY: "auto", scrollbarGutter: "stable", marginTop: 4, borderRadius: "var(--panel-radius, 6px)", border: "1px solid var(--panel-border, rgba(128, 128, 128, 0.35))" }}>
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
      {result?.quickUnavailable ? <ui.Message tone="muted">{t(L, "quickUnavailable")}</ui.Message> : null}
      {blockReason && !busy ? <ui.Message tone="muted">{blockReason(L)}</ui.Message> : null}
      <ui.Message tone="muted">{t(L, "createsDraft")}</ui.Message>
      <ui.Actions>
        {result && !result.decorated ? <ui.Button onClick={finishTitle} disabled={busy}>{t(L, "finishTitle")}</ui.Button> : null}
        {result ? <ui.Button onClick={buildAnother} disabled={busy || !canBuildAnother}>{t(L, "anotherVersion")}</ui.Button> : null}
        {/* While the quick local check runs, the same slot is its Cancel button (no layout jump). */}
        {checking ? <ui.Button variant="primary" onClick={() => localAbortRef.current?.abort()}>{t(L, "cancel")}</ui.Button>
          : <ui.Button variant="primary" busy={busy} busyLabel={stepText || t(L, "building")} onClick={() => build(seed)} disabled={busy || !canBuild}>{t(L, "build")}</ui.Button>}
      </ui.Actions>
    </ui.Stack>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Template runs. Clip highlights asks the person for the footage and a few choices, mounts this panel out of sight and
// hands them over in `context.template`. The run builds a new Draft at once from only those files, as Build does with
// every other setting at the panel's default, never opens it, and ends by calling `sdk.finishTemplate` exactly once.
// ---------------------------------------------------------------------------
type TemplateOutcome = { sequenceId: string } | { error: string };
// The panel's first Build uses seed 1 ("Try other shots" counts up from there).
const TEMPLATE_SEED = 1;
// Files per alias call: a photo gets its own scratch Draft, which keeps each call well inside runScript's 30 s.
const TEMPLATE_ALIAS_BATCH = 6;
// An error whose message is written for the person; anything else a run throws becomes a plain "stopped" sentence.
function templateIssue(message: string) { const e: any = new Error(message); e.forPerson = true; return e; }
// Error text for the hidden frame's log (an Error logged as an object shows as {}).
function errorText(e: any) { return String(e?.message || e); }

// One panel script; a lost session is resent (never a committing call), and a read that comes back empty is read
// again up to twice: an alias checkpoint ack can answer a pending read with undefined right after a script mints new
// short ids, which a template run does for every handed file just before its inventory read.
const EMPTY_READ = /Cannot read properties of (undefined|null)|is not iterable/;
async function runTemplateStep(sdk: any, summary: string, script: string, allowCommit = false) {
  for (let attempt = 0; ; attempt++) {
    let r = await sdk.runScript({ summary, script, allowCommit });
    if (r.isError && !allowCommit && /No valid session ID/.test(r.output || "")) { await new Promise((d) => setTimeout(d, 1500)); r = await sdk.runScript({ summary, script, allowCommit }); }
    if (!r.isError && r.result != null) return r.result as any;
    const text = String(r.output || "Selects could not complete this step.");
    if (allowCommit || attempt >= 2 || !(EMPTY_READ.test(text) || (r.result == null && !r.isError))) throw new Error(text);
    console.warn("[mini-vlog] " + summary + " came back empty, reading again:", text);
    await new Promise((d) => setTimeout(d, 1500));
  }
}

// Handed files carry the app's own Resource ids, but resources() and a Draft's clips report the Project's short
// aliases (r0, r1, ...), which inventory.js filters on and assemble.js / decorate.js match clips by. So each handed
// file is placed once on an unsaved scratch Draft, whose new clip reports the file's alias; a photo gets a Draft of its
// own, whose frame size is the photo's. Nothing is committed. A file that cannot be placed is left out.
const TEMPLATE_ALIAS_JS = `const cfg = __CONFIG__;
const p = selects.project(cfg.projectId);
const resolved = [];
let shared = null;
for (const h of cfg.files) {
  try {
    const photo = h.kind === 'image';
    const d = photo || !shared ? await p.createDraft({ name: 'Mini Vlog id check' }) : shared;
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

// The handed videos and photos, each once, in the order they were picked.
function templateFootage(context: any) {
  const seen = new Set<string>();
  const files: Array<{ rid: string; kind: string }> = [];
  for (const input of context?.template?.inputs?.footage ?? []) {
    if (!input || (input.kind !== "video" && input.kind !== "image") || !input.resourceId || seen.has(input.resourceId)) continue;
    seen.add(input.resourceId);
    files.push({ rid: String(input.resourceId), kind: input.kind });
  }
  return files;
}

// The whole template build. Returns the new Draft; throws templateIssue(...) for the person, or STALE when a newer run
// (or the frame closing) replaced this one. `say` names the current step for the status line.
async function runMiniVlogTemplate(sdk: any, context: any, check: () => void, say: (step: string, detail?: string) => void): Promise<{ sequenceId: string }> {
  // The UI language when the run starts: its messages and the Inspector labels written into the Draft use it.
  const bl = uiLang(context);
  const pid: string | null = context?.projectId ?? null;
  if (!pid) throw templateIssue(t(bl, "openProject"));
  const files = templateFootage(context);
  if (!files.length) throw templateIssue("Choose videos or photos for the footage, then try again.");
  const run = (summary: string, script: string, allowCommit = false) => runTemplateStep(sdk, summary, script, allowCommit);
  const options = context?.template?.options || {};

  say("Reading the chosen files");
  const roots = await locateRoots(sdk);
  check();
  const read = (rel: string) => readText(roots.plugin, rel);
  const [manifestText, presetsText, inventoryJs, searchJs, ensureJs, assembleJs, decorateJs, titleTsx, softTsx, motionTsx, punchTsx] = await Promise.all([
    read("assets/cues/manifest.json"), read("assets/fonts/presets.json"), read("scripts/inventory.js"), read("scripts/search.js"),
    read("scripts/ensure-audio.js"), read("scripts/assemble.js"), read("scripts/decorate.js"), read("assets/title-lockup.tsx"), read("assets/soft-look.tsx"),
    read("assets/photo-motion.tsx"), read("assets/beat-punch.tsx")]);
  check();
  const manifest = JSON.parse(manifestText), presets = JSON.parse(presetsText);
  // The track, length and title style chosen on the app's page; an unknown or missing one gets the panel's default.
  const cues: any[] = manifest.cues || [];
  const cue = cues.find((c) => c.id === options.track) || cues.find((c) => c.id === PREFERRED_CUE) || cues.find((c) => c.id === DEFAULT_CUE);
  if (!cue) throw templateIssue("Mini Vlog's music is missing; reinstall the plugin and try again.");
  const length: "short" | "standard" | "long" = options.length === "short" || options.length === "long" ? options.length : DEFAULT_LENGTH;
  const chosen = presets.presets.find((x: any) => x.id === options.title) || presets.presets.find((x: any) => x.id === DEFAULT_PRESET);
  if (!chosen) throw templateIssue("Mini Vlog's title styles are missing; reinstall the plugin and try again.");

  // Handed ids to the Project's aliases; the files the first pass skipped get one more.
  const resolved: Array<{ rid: string; alias: string; size: { width: number; height: number } | null }> = [];
  const resolveFiles = async (list: Array<{ rid: string; kind: string }>) => {
    for (let i = 0; i < list.length; i += TEMPLATE_ALIAS_BATCH) {
      const r = await run("Find the chosen files", fill(TEMPLATE_ALIAS_JS, { projectId: pid, files: list.slice(i, i + TEMPLATE_ALIAS_BATCH) }));
      check();
      resolved.push(...(r.resolved || []));
    }
  };
  await resolveFiles(files);
  const unresolved = files.filter((f) => !resolved.some((r) => r.rid === f.rid));
  if (unresolved.length) await resolveFiles(unresolved);
  const aliases = [...new Set(resolved.map((r) => r.alias))];
  const known: Record<string, { width: number; height: number }> = {};
  for (const r of resolved) if (r.size) known[r.alias] = r.size;
  if (!aliases.length) throw templateIssue("None of the chosen files could be found in this Project. Choose them again, then try again.");
  // The panel's inventory limited to the handed files: analysed videos with their length and frame size, and photos.
  const inventory = await run("Read footage", fill(inventoryJs, { projectId: pid, only: aliases, known, measureMs: INVENTORY_MEASURE_MS }));
  check();
  inventory.resources = inventory.resources || [];
  inventory.photos = inventory.photos || [];
  const sizes: Record<string, { width: number; height: number }> = { ...known };
  for (const ph of inventory.photos) if (ph.width > 0 && ph.height > 0) sizes[ph.rid] = { width: ph.width, height: ph.height };
  const unanalysed = inventory.skipped?.unanalysed || 0;

  // Music, length and pace as the panel works them out for a bundled track at its defaults (Quick pace, Beat punch
  // and Start at the hook on).
  const pace = DEFAULT_PACE, punch = DEFAULT_PUNCH;
  const grid: any = { bpm: cue.bpm, accepted: true, approxBpm: null, firstBeat: cue.firstBeat, usableEnd: cue.usableEnd, beatEnergy: cue.beatEnergy || [], peaks: cue.peaks || [], onsets: cue.onsets || NO_ONSETS, onsetThresholds: cue.onsetThresholds, hookBars: cue.hookBars || null };
  const gridded = mvGridUsable({ bpm: grid.bpm, accepted: grid.accepted });
  const approxTempo = mvApproxTempo({ gridded, approxBpm: grid.approxBpm });
  const tempo = gridded ? grid.bpm : approxTempo;
  const guard: any = tempo ? mvBeatsPerShot(pace, tempo) : { beats: null, overridden: false };
  const shotSeconds = mvShotSeconds({ bpm: grid.bpm, beatsPerShot: guard.beats, pace, gridded, approxBpm: approxTempo });
  const requested = MV_LENGTHS[length];
  const fitted = mvFitShots({ requested, sectionStart: tempo ? grid.firstBeat : 0, usableEnd: grid.usableEnd, shotSeconds });
  const videoSeconds = fitted ? fitted * shotSeconds : requested * shotSeconds;
  const snap = (value: number) => mvSnapSection({ value, firstBeat: grid.firstBeat, bpm: tempo, usableEnd: grid.usableEnd, videoSeconds, gridAccepted: !!tempo });
  const hookAt = DEFAULT_HOOK && gridded ? mvHookSection({ hookBars: grid.hookBars, firstBeat: grid.firstBeat, bpm: grid.bpm, usableEnd: grid.usableEnd, videoSeconds, barPhaseBeats: cue.barPhaseBeats }) : null;
  const section = !gridded ? snap(0) : hookAt ?? mvDefaultSection({ firstBeat: grid.firstBeat, bpm: grid.bpm, beatEnergy: grid.beatEnergy, usableEnd: grid.usableEnd, videoSeconds }) ?? snap(grid.firstBeat);
  const musicStart = snap(section ?? 0);
  if (musicStart == null || !fitted) throw templateIssue(t(bl, "fail.music-too-short"));
  const snapCuts = { onsets: grid.onsets, onsetThresholds: grid.onsetThresholds, lowConfidence: !gridded };

  // Scene search over the handed videos (with the motion query, as Beat punch is on). Nobody can press Build again, so
  // videos whose search failed get one more try.
  say("Choosing shots");
  const rids: string[] = inventory.resources.map((r: any) => r.rid);
  const dur: Record<string, number> = Object.fromEntries(inventory.resources.map((r: any) => [r.rid, r.duration]));
  const search = async (todo: string[]) => {
    const list: any[] = []; const failed: string[] = [];
    for (let i = 0; i < todo.length; i += SEARCH_BATCH) {
      say("Choosing shots", i + "/" + todo.length + (todo.length === 1 ? " video" : " videos"));
      const r = await run("Search shots", fill(searchJs, { projectId: pid, rids: todo.slice(i, i + SEARCH_BATCH), queries: mvSearchQueries(MV_QUERIES, punch), pageSize: 4 }));
      check();
      list.push(...r.candidates); failed.push(...r.failed);
    }
    return { list, failed };
  };
  let found = await search(rids);
  if (found.failed.length) {
    const retried = new Set(found.failed);
    const again = await search(found.failed);
    found = { list: [...found.list.filter((c: any) => !retried.has(c.rid)), ...again.list], failed: again.failed };
  }
  if (found.failed.length) console.info("[mini-vlog] template run: scene search failed for", found.failed.join(", "));
  const candidates = found.list.map((c: any) => ({ ...c, sourceDuration: dur[c.rid] || 0 }));
  const photoCands = photoCandsOf(inventory, null, true);
  const plan: any = mvPlanBuild({ candidates: mvMotionBonus(candidates).concat(photoCands), bpm: grid.bpm, accepted: grid.accepted, approxBpm: grid.approxBpm, fps: 30, pace, requested, sectionStart: musicStart, usableEnd: grid.usableEnd, ...snapCuts, seed: String(TEMPLATE_SEED) });
  if (!plan.ok) {
    const waiting = unanalysed ? " " + unanalysed + (unanalysed === 1 ? " video is" : " videos are") + " not analyzed yet, so it could not be used." : "";
    throw templateIssue((MV_FAIL[plan.reason] ? t(bl, "fail." + plan.reason) : t(bl, "noPlan")) + waiting);
  }

  // Commit 1: the music, then the clips on a new Draft.
  say("Adding music");
  const music = await run("Add music to the project", fill(ensureJs, { projectId: pid, path: roots.plugin + "/assets/cues/" + cue.file }), true);
  check();
  say("Making the Draft");
  const crops = Object.fromEntries([...inventory.resources, ...inventory.photos.filter((r: any) => r.width > 0 && r.height > 0)]
    .map((r: any) => [r.rid, { width: r.width, height: r.height }]));
  const draftName = "Mini Vlog " + chosen.label + " " + stamp(new Date());
  const clipSound = "ambient";
  // Never resent: the reply may be lost after the Draft was saved.
  const a = await run("Assemble the Mini Vlog", fill(assembleJs, {
    projectId: pid, draftName, picks: plan.picks, boundaries: plan.schedule.cuts, crops,
    music: music ? { resourceId: music.resourceId, sectionStart: musicStart } : null, clipSound, ambientDb: AMBIENT_DB }), true);
  check();
  if (!a.sequenceId || !(a.totalFrames > 0)) throw templateIssue("The Draft \"" + draftName + "\" may have been saved without its title. Open it from the Drafts list, or try again.");

  // Commit 2: the title lockup, Soft look, photo motion and Beat punch, as the panel's Finish step adds them.
  say("Adding title and look");
  const fonts = await Promise.all(presetFonts(chosen, presets).map(async (x: any) => {
    const { file, ...face } = x;
    return { ...face, metrics: presets.metrics[x.family] || null, b64: (await readText(roots.plugin, "assets/fonts/" + file)).replace(/\s+/g, "") };
  }));
  check();
  const flat: Record<string, string> = {};
  for (const fl of chosen.fields) { const v = fl.initial ?? ""; flat[fl.key] = String(v === "@year" ? mvCurrentYear() : v).slice(0, fl.max); }
  const bpm = gridded ? grid.bpm : null;
  const parameters = { preset: chosen.id, ...flat, fields: { ...flat }, primary: chosen.colors.primary, secondary: chosen.colors.secondary, ...TITLE_LOOK, fonts,
    provenance: { plugin: PLUGIN_ID, version: PLUGIN_VERSION, preset: chosen.id, cue: cue.id, sectionStart: musicStart, pace, length,
      seed: TEMPLATE_SEED, clipSound, punch, hook: DEFAULT_HOOK, groove: plan.groove || null, picks: plan.picks } };
  const editableParameters = [
    ...chosen.fields.map((fl: any) => ({ key: fl.key, label: tOr(bl, "field." + chosen.id + "." + fl.key, fl.label), type: "text", defaultValue: flat[fl.key] })),
    { key: "primary", label: t(bl, "param.mainColor"), type: "color", defaultValue: chosen.colors.primary },
    { key: "secondary", label: t(bl, "param.secondColor"), type: "color", defaultValue: chosen.colors.secondary },
    { key: "shadow", label: t(bl, "param.shadow"), type: "number", defaultValue: TITLE_LOOK.shadow, min: 0, max: 1, step: 0.05 },
    { key: "size", label: t(bl, "param.size"), type: "number", defaultValue: TITLE_LOOK.size, min: 60, max: 160, step: 5 },
    { key: "x", label: t(bl, "param.x"), type: "number", defaultValue: TITLE_LOOK.x, min: 20, max: 80, step: 1 },
    { key: "y", label: t(bl, "param.y"), type: "number", defaultValue: TITLE_LOOK.y, min: 20, max: 80, step: 1 },
    { key: "sparkles", label: chosen.id === "mini-vlog" ? t(bl, "param.sparkles") : t(bl, "param.stars"), type: "boolean", defaultValue: TITLE_LOOK.sparkles },
  ];
  const motionOptions = MOTION_OPTIONS.map((o) => ({ label: tOr(bl, "motion." + o.value, o.label), value: o.value }));
  const labels = { motion: t(bl, "param.motion"), motionStrength: t(bl, "param.motionStrength"), punch: t(bl, "param.punch"), softness: t(bl, "param.softness") };
  const photoRids = [...new Set(plan.picks.filter((k: any) => k && k.kind === "photo").map((k: any) => k.rid as string))];
  const moves: any[] = mvPhotoMotions(plan.picks, String(TEMPLATE_SEED), sizes);
  const byRid: Record<string, any> = {};
  plan.picks.forEach((k: any, i: number) => {
    if (!moves[i]) return;
    const sz = sizes[k.rid];
    const cover = sz ? Math.max(MV_W / sz.width, MV_H / sz.height) / Math.min(MV_W / sz.width, MV_H / sz.height) : 1;
    byRid[k.rid] = { ...moves[i], cover };
  });
  const punchCfg = punch ? { tsx: punchTsx, strength: PUNCH_STRENGTH, push: PUNCH_PUSH, beatFrames: bpm ? 60 / bpm * a.fps : 0,
    punchFrames: mvPunchFrames({ bpm, fps: a.fps, sectionStart: musicStart, videoEnd: a.totalFrames }), picks: plan.picks } : null;
  const finish = () => run("Add title and look", fill(decorateJs, { sequenceId: a.sequenceId, mute: false, videoEnd: a.totalFrames, title: { tsx: titleTsx, parameters, editableParameters },
    soft: { tsx: softTsx, strength: SOFT_STRENGTH }, photos: photoRids, motion: { tsx: motionTsx, strength: MOTION_STRENGTH, options: motionOptions, byRid }, photoEffects: true, punch: punchCfg, labels }), true);
  // decorate.js skips what an earlier attempt added, so a failed attempt is tried once more.
  try {
    await finish();
  } catch (e) {
    console.warn("[mini-vlog] Add title and look failed, trying again:", errorText(e));
    check();
    try { await finish(); } catch (e2) {
      console.warn("[mini-vlog] Add title and look failed again:", errorText(e2));
      throw templateIssue("The Draft was made, but its title and look could not be added; try again.");
    }
  }
  check();
  // Nobody sees this frame, so the Draft is not opened: the app takes the person to it.
  return { sequenceId: a.sequenceId };
}

// What the app mounts out of sight for a template run: one status line. It starts once per runId and ends the run
// exactly once, unless a newer run (or the frame closing) replaced it; then it reports nothing.
function TemplateRun({ sdk, context }: any) {
  const [status, setStatus] = React.useState("Starting");
  const begun = React.useRef<string | null>(null);
  const alive = React.useRef(true);
  // The latest context, so a run reports only while it is still the current one.
  const latest = React.useRef<any>(context);
  latest.current = context;
  const runId: string | null = context?.template?.runId ?? null;
  React.useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  React.useEffect(() => {
    if (runId == null || begun.current === runId) return;
    begun.current = runId;
    const snapshot = context;
    const live = () => alive.current && latest.current?.template?.runId === runId;
    const check = () => { if (!live()) throw STALE; };
    let ended = false, step = "starting";
    const say = (text: string, detail?: string) => { step = text; if (live()) setStatus(text + (detail ? " (" + detail + ")" : "")); };
    const end = (outcome: TemplateOutcome | null) => {
      if (ended) return;
      ended = true;
      if (!outcome || !live()) return;
      setStatus("sequenceId" in outcome ? "Done" : outcome.error);
      try { sdk.finishTemplate(outcome); } catch (e) { console.warn("[mini-vlog] finishTemplate failed:", errorText(e)); }
    };
    (async () => {
      try {
        end(await runMiniVlogTemplate(sdk, snapshot, check, say));
      } catch (e: any) {
        if (e === STALE) { end(null); return; }
        console.warn("[mini-vlog] template run failed while " + step + ":", errorText(e), e);
        end({ error: e?.forPerson ? String(e.message) : "Mini Vlog stopped while " + step.charAt(0).toLowerCase() + step.slice(1) + "; try again." });
      } finally {
        end({ error: "Mini Vlog stopped before the Draft was ready; try again." });
      }
    })();
  }, [runId]);
  return <div role="status" style={{ fontSize: 11, color: "var(--panel-muted-fg)" }}>{status}</div>;
}

// Page before measuring photos; preserve the total measurement budget and aggregate the original inventory shape.
async function readInventoryPages(run, script, config, fill, wanted = () => true) {
  let result, total, measureMs = config.measureMs ?? 8000, probeMs = config.probeMs ?? 4000, probeMax = config.probeMax ?? 200;
  for (let offset = 0; ; offset += 32) {
    if (!wanted()) throw new Error('Project changed while loading media.');
    const batch = await run('Read footage', attempt => fill(script, { ...config, page: { offset, size: 32 }, measureMs: attempt ? 0 : measureMs, probeMs, probeMax }), false, { wanted });
    const page = batch.page;
    if (!page || (total !== undefined && total !== page.total)) throw new Error('Project media changed while loading. Try again.');
    total = page.total;
    measureMs = Math.max(0, measureMs - page.elapsedMs);
    probeMs = Math.max(0, probeMs - page.elapsedMs);
    probeMax = Math.max(0, probeMax - (page.probeCount || 0));
    delete batch.page;
    if (offset === 0) result = batch;
    else {
      result.resources.push(...batch.resources); result.photos.push(...batch.photos);
      for (const key of ['skipped', 'counts', 'captureDates']) for (const [name, value] of Object.entries(batch[key] || {})) {
        result[key][name] = typeof value === 'boolean' ? result[key][name] && value : result[key][name] + value;
      }
      if (batch.months) result.months = result.months.map((n, i) => n + batch.months[i]);
      if ('incomplete' in batch) result.incomplete = result.incomplete || batch.incomplete;
    }
    if (offset + 32 >= total) return result;
  }
}

// local-sdk:start
/** Pure host-platform path operations; no filesystem or renderer globals. */
function panelLocalPaths(platform: string) {
  const windows = platform === "win32";
  const slash = (path: string) => {
    if (typeof path !== "string")
      throw new TypeError("A path must be a string.");
    return windows ? path.replace(/\\/g, "/") : path;
  };
  const rootOf = (path: string) => {
    if (windows) {
      const unc = path.match(/^\/\/[^/]+\/[^/]+\/?/);
      if (unc) return unc[0].replace(/\/?$/, "/");
      const drive = path.match(/^[a-z]:\/?/i);
      if (drive) return drive[0];
    }
    return path.startsWith("/") ? "/" : "";
  };
  const native = (value: string) =>
    windows ? value.replace(/\//g, "\\") : value;
  const normalize = (value: string) => {
    const path = slash(value),
      root = rootOf(path),
      absolute = root.endsWith("/");
    const segments: string[] = [];
    for (const segment of path
      .slice(Math.min(root.length, path.length))
      .split("/")) {
      if (!segment || segment === ".") continue;
      if (segment === ".." && segments.length && segments.at(-1) !== "..")
        segments.pop();
      else if (segment !== ".." || !absolute) segments.push(segment);
    }
    let result = root + segments.join("/");
    if (!result || (windows && /^[a-z]:$/i.test(result))) result += ".";
    if (path.endsWith("/") && !result.endsWith("/")) result += "/";
    return native(result);
  };
  const basename = (value: string, extension?: string) => {
    const path = slash(value).replace(/\/+$/, "");
    const withoutDrive = windows ? path.replace(/^[a-z]:/i, "") : path;
    const name = withoutDrive.slice(withoutDrive.lastIndexOf("/") + 1);
    return extension && name.endsWith(extension)
      ? name.slice(0, -extension.length)
      : name;
  };
  return {
    normalize,
    join: (...paths: string[]) => {
      const parts = paths.map(slash).filter(Boolean);
      let joined = parts.join("/");
      if (windows && !/^\/\/[^/]/.test(parts[0] || ""))
        joined = joined.replace(/^\/{2,}/, "/");
      return normalize(joined);
    },
    dirname(value: string) {
      const path = slash(value),
        root = rootOf(path);
      const end = path.replace(/\/+$/, "").lastIndexOf("/");
      if (end < root.length) return value.slice(0, root.length) || ".";
      return value.slice(0, end);
    },
    basename,
    extname(value: string) {
      const name = basename(value),
        dot = name.lastIndexOf(".");
      return dot <= 0 || name === ".." ? "" : name.slice(dot);
    },
    isAbsolute: (value: string) => rootOf(slash(value)).endsWith("/"),
  };
}


/** Plugin-private composition of canonical SDK methods, not a public SDK surface. */
async function createPanelLocalClient(sdk: any) {
  const run = async (method: string, args: unknown[], write = false) => {
    // method names below are fixed implementation constants; values always use JSON encoding.
    // Direct arguments keep object literals contextually typed by the SDK signature.
    const response = await sdk.runScript({
      summary: "Use local media workspace",
      allowCommit: write,
      script: "return await selects." + method + "(" + JSON.stringify(args).slice(1, -1) + ");",
    });
    if (response.isError) throw new Error(response.output || "Local SDK operation failed.");
    // A clipped report has no result. Every read returning data rejects that case below.
    return response.result;
  };
  const environment = await run("files.environment", []);
  if (!environment || typeof environment.platform !== "string" || !environment.homedir)
    throw new Error("Update Selects to use this plugin's local media workspace.");
  const paths = panelLocalPaths(environment.platform);
  const CHUNK_BYTES = 48 * 1024;
  const readRange = async (path: string, offset: number, length: number) => {
    const parts: Uint8Array[] = [];
    let total = 0;
    while (total < length) {
      const result = await run("files.readRange", [{ path, offset: offset + total, length: Math.min(CHUNK_BYTES, length - total) }]);
      if (!result || typeof result.base64 !== "string" || !Number.isInteger(result.bytesRead)) throw new Error("The file read returned an incomplete result.");
      const bytes = Uint8Array.from(atob(result.base64), (character) => character.charCodeAt(0));
      if (bytes.length !== result.bytesRead) throw new Error("The file read returned invalid bytes.");
      parts.push(bytes); total += bytes.length;
      if (bytes.length < Math.min(CHUNK_BYTES, length - (total - bytes.length))) break;
    }
    const output = new Uint8Array(total);
    let position = 0;
    for (const bytes of parts) { output.set(bytes, position); position += bytes.length; }
    return output;
  };
  const files = {
    ...paths,
    homedir: () => environment.homedir,
    getOrCreateTmpDirPath: async () => environment.tempDirectory,
    exists: (path: string) => run("files.exists", [path]),
    stat: (path: string) => run("files.stat", [path]),
    readdir: (path: string) => run("files.readdir", [path]),
    readRange,
    async readFile(path: string, encoding?: string) {
      const stat = await run("files.stat", [path]);
      if (!stat || !Number.isSafeInteger(stat.size) || stat.size < 0) throw new Error("The file is unavailable.");
      const bytes = await readRange(path, 0, stat.size);
      if (bytes.length !== stat.size) throw new Error("The file changed while it was being read.");
      if (encoding !== undefined && encoding !== "utf8") throw new Error("Only utf8 text encoding is supported.");
      return encoding === "utf8" ? new TextDecoder().decode(bytes) : bytes;
    },
    async writeFile(path: string, data: string | Uint8Array, options?: string | { encoding?: string; flag?: "w" | "a" | "wx" }) {
      const encoding = typeof options === "string" ? options : options?.encoding;
      const flag = typeof options === "object" ? options.flag : undefined;
      if (flag !== undefined && !["w", "a", "wx"].includes(flag)) throw new Error("Unsupported file write flag.");
      if (encoding !== undefined && encoding !== "utf8") throw new Error("Only utf8 text encoding is supported.");
      const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
      if ((flag === "a" || flag === "wx") && bytes.length > CHUNK_BYTES) throw new Error("Atomic append and exclusive creation are limited to 48 KiB.");
      // Each complete replacement has its own sibling file. Other panels cannot
      // overwrite one of its chunks before the final atomic rename publishes it.
      const replacement = flag !== "a" && flag !== "wx";
      const destination = replacement ? path + ".tmp-" + crypto.randomUUID() : path;
      let published = false;
      try {
        for (let offset = 0; offset < bytes.length || offset === 0; offset += CHUNK_BYTES) {
          const chunk = bytes.subarray(offset, offset + CHUNK_BYTES);
          let binary = "";
          for (const byte of chunk) binary += String.fromCharCode(byte);
          const mode = offset === 0 ? (flag === "a" ? "append" : "exclusive") : undefined;
          const result = await run("files.writeChunk", [{ path: destination, offset, base64: btoa(binary), ...(mode ? { mode } : {}) }], true);
          if (result?.bytesWritten !== chunk.length) throw new Error("The file write returned an incomplete result. Check the file before retrying.");
        }
        if (replacement) await run("files.rename", [destination, path], true);
        published = true;
      } finally {
        if (replacement && !published) await run("files.remove", [destination, { force: true }], true).catch(() => {});
      }
    },
    async compareAndReplace(path: string, expectedText: string | null, text: string) {
      const encode = (value: string) => {
        const bytes = new TextEncoder().encode(value);
        if (bytes.length > CHUNK_BYTES) throw new Error("Atomic file values are limited to 48 KiB.");
        let binary = "";
        for (const byte of bytes) binary += String.fromCharCode(byte);
        return btoa(binary);
      };
      const result = await run("files.compareAndReplace", [{path, expectedBase64: expectedText === null ? null : encode(expectedText), base64: encode(text)}], true);
      if (typeof result?.replaced !== "boolean") throw new Error("The atomic file update returned an incomplete result. Read the file before retrying.");
      return result.replaced;
    },
    mkdir: (path: string, options?: { recursive?: boolean }) => run("files.mkdir", [path, options ?? {}], true),
    rm: (path: string, options?: { recursive?: boolean; force?: boolean }) => run("files.remove", [path, options ?? {}], true),
    removeFile: ({ filePath }: { filePath: string }) => run("files.remove", [filePath, { force: true }], true),
    rename: (from: string, to: string) => run("files.rename", [from, to], true),
    copyFile: (from: string, to: string) => run("files.copy", [from, to], true),
    downloadFile: (url: string, path: string) => run("files.download", [url, path], true),
    pathToLocalURL: (path: string) => run("files.localUrl", [path]),
    localURLToPath: (url: string) => run("files.pathFromLocalUrl", [url]),
  };
  const activeJobs = new Set<string>();
  let disposed = false;
  const cancel = async (jobId: string) => {
    const response = await sdk.runScript({ summary: "Cancel local media processing", allowCommit: true, script: "await selects.media.job(" + JSON.stringify(jobId) + ").cancel();" });
    if (response.isError) throw new Error(response.output || "Media cancellation failed.");
  };
  const process = async (executable: "FFmpeg" | "FFprobe", args: string[], _withoutLog?: boolean, signal?: AbortSignal, onStdout?: (text: string) => void, onStderr?: (text: string) => void) => {
    if (disposed || signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const started = await run("media.start" + executable, [{ args }], true);
    if (!started?.jobId) throw new Error("The media process did not return a job id.");
    const jobId = started.jobId;
    activeJobs.add(jobId);
    let cancellation: Promise<void> | null = null;
    const abort = () => { cancellation ??= cancel(jobId); void cancellation.catch(() => {}); };
    signal?.addEventListener("abort", abort, { once: true });
    if (disposed || signal?.aborted) abort();
    let cursor = 0, stdout = "", stderr = "";
    try {
      while (true) {
        if (cancellation) await cancellation;
        const status = await sdk.call("getLocalMediaJobStatus", jobId, { cursor });
        if (!status || !Array.isArray(status.events)) throw new Error("Media status is unavailable.");
        if (status.truncated) throw new Error("Media output was truncated; no incomplete result was accepted.");
        for (const event of status.events) {
          if (event.stream === "stdout") { stdout += event.text; onStdout?.(event.text); }
          else { stderr += event.text; onStderr?.(event.text); }
        }
        cursor = status.nextCursor;
        if (status.state !== "running" && status.events.length === 0) {
          if (status.state === "cancelled" || signal?.aborted) throw new DOMException("Aborted", "AbortError");
          if (status.state === "failed") throw new Error(status.error || stderr || "Media processing failed.");
          return { stdout, stderr };
        }
        if (status.state === "running") await new Promise((resolve) => setTimeout(resolve, 150));
      }
    } catch (error) {
      await cancel(jobId).catch(() => {});
      throw error;
    } finally {
      signal?.removeEventListener("abort", abort);
      activeJobs.delete(jobId);
    }
  };
  return {
    files,
    environment,
    media: {
      runFFmpeg: (args: string[], quiet?: boolean, signal?: AbortSignal, stdout?: (text: string) => void, stderr?: (text: string) => void) => process("FFmpeg", args, quiet, signal, stdout, stderr),
      runFFprobe: (args: string[], quiet?: boolean, signal?: AbortSignal) => process("FFprobe", args, quiet, signal),
    },
    dialogs: {
      pickFilePath: (filters?: Array<{ name: string; extensions: string[] }>) => run("editor.pickFile", [{ filters }]),
      pickDirectoryPath: () => run("editor.pickDirectory", []),
      pickSavePath: (defaultPath: string) => run("editor.pickSavePath", [{ defaultPath }]),
    },
    dispose() { disposed = true; for (const jobId of activeJobs) void cancel(jobId).catch(() => {}); },
  };
}

const panelLocalClients = new WeakMap<object, any>();
function panelLocalClient(sdk: any): any {
  const client = panelLocalClients.get(sdk);
  if (!client) throw new Error("Local SDK has not initialized.");
  return client;
}
function withPanelLocalClient(Component: any) {
  return function LocalSdkPanel(props: any) {
    const [state, setState] = React.useState<any>(null);
    React.useEffect(() => {
      let active = true;
      let client: any;
      createPanelLocalClient(props.sdk).then(value => {
        client = {...props.sdk, ...value};
        if (!active) { value.dispose(); return; }
        panelLocalClients.set(props.sdk, client);
        setState({sdk: props.sdk});
      }).catch(error => { if (active) setState({error: String(error?.message || error)}); });
      return () => {
        active = false;
        if (client) {
          if (panelLocalClients.get(props.sdk) === client) panelLocalClients.delete(props.sdk);
          client.dispose();
        }
      };
    }, [props.sdk]);
    if (state?.error) return React.createElement("div", {role: "alert"}, state.error);
    if (state?.sdk !== props.sdk) return React.createElement("div", {role: "status"}, "Connecting to Selects…");
    return React.createElement(Component, props);
  };
}

export default withPanelLocalClient(Panel);
// local-sdk:end
