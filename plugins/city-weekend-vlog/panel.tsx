// @name City Weekend Vlog
// @name:de Städte-Wochenend-Vlog
// @name:en City Weekend Vlog
// @name:es Vlog de fin de semana en la ciudad
// @name:fr Vlog week-end en ville
// @name:it Vlog weekend in città
// @name:ja シティ週末 Vlog
// @name:ko City Weekend Vlog
// @name:pt Vlog de fim de semana na cidade
// @name:tr Şehirde Hafta Sonu Vlogu
// @name:zh 城市周末 Vlog
// @icon sparkles
// Builds a beat-synced 9:16 city weekend vlog with a font-switching title as a new, editable Draft.
import React from "react";

// Panel text in the 10 languages of plugin.json `localized`, read with t(). Korean is written as \u escapes.
// STRINGS:BEGIN
const STRINGS = {
  en: {
    openProject: "Open a Project to build a City Weekend Vlog.",
    refresh: "Refresh",
    refreshing: "Refreshing",
    refreshFailed: "Could not refresh the clip list: {detail}",
    readFailed: "Could not read the clips in this Project: {detail}",
    checkingClipsNow: "Checking clips…",
    checkingClips: "Checking clips",
    listening: "Listening for the beat",
    working: "Working",
    noFootage: "No analysed video or photos in this Project yet. Add video clips and analyse them, or add photos; this updates automatically.",
    turnOnPhotos: "Turn on Use photos in Advanced to build from this Project's photos.",
    noClipsSelected: "No clips selected. Choose clips in Advanced.",
    onlyPhotos: { one: "Only {count} photo and no analysed video: this style needs at least {needed} shots. Add photos or video clips.", other: "Only {count} photos and no analysed video: this style needs at least {needed} shots. Add photos or video clips." },
    gap: " ",
    ready: "Ready: {summary}",
    clips: { one: "{count} clip", other: "{count} clips" },
    clipsSelected: { one: "{selected} of {count} clip selected", other: "{selected} of {count} clips selected" },
    photos: { one: "{count} photo", other: "{count} photos" },
    photosSelected: { one: "{selected} of {count} photo selected", other: "{selected} of {count} photos selected" },
    fitsShots: { one: "footage fits {count} montage shot", other: "footage fits {count} montage shots" },
    aboutSeconds: "about {seconds} s",
    notAnalysed: { one: "{count} clip not analysed yet", other: "{count} clips not analysed yet" },
    analysing: { one: "{count} clip is being analysed. This updates automatically when it finishes.", other: "{count} clips are being analysed. This updates automatically when they finish." },
    notAnalysedAnalyse: { one: "{count} clip is not analysed yet. Analyse it in Selects to use it here.", other: "{count} clips are not analysed yet. Analyse them in Selects to use them here." },
    notAnalysedMaybe: { one: "{count} clip is not analysed yet. If Selects is analysing it, this updates automatically.", other: "{count} clips are not analysed yet. If Selects is analysing them, this updates automatically." },
    analysisFailed: { one: "{count} clip could not be analysed.", other: "{count} clips could not be analysed." },
    noteAnalysing: { one: "{count} clip being analysed", other: "{count} clips being analysed" },
    noteFailed: { one: "{count} clip could not be analysed", other: "{count} clips could not be analysed" },
    title: "Title",
    firstLine: "First line",
    connector: "Connector",
    place: "Place",
    titlePreview: "Title preview",
    fontStyle: "Font style",
    "preset.classic": "Classic",
    "preset.romantic": "Romantic",
    "preset.retro-diner": "Retro Diner",
    "preset.travel-journal": "Travel Journal",
    "preset.editorial": "Editorial",
    music: "Music",
    track: "Track",
    ownMusic: "Your own music",
    noMusic: "No music",
    faintTiming: "Approximate timing on the detected tempo ({bpm} BPM): the tempo was found but the beat is faint, so the cuts may miss it.",
    installTools: "Install ffmpeg and Node.js 18+ to preview music or use your own track.",
    sectionHint: "Music section — drag to choose",
    sectionLabel: "Music section",
    musicTooShort: "This music is too short for this length",
    startsAt: "Starts at {seconds} s",
    stopPreview: "Stop preview",
    cancelPreview: "Cancel preview",
    previewSection: "Preview this section",
    readingMusic: "Reading the music…",
    musicLengthUnknown: "The length of this music is unknown",
    advanced: "Advanced",
    length: "Length",
    "length.short": "Short",
    "length.standard": "Standard",
    "length.long": "Long",
    clipSound: "Clip sound",
    "sound.off": "Off",
    "sound.ambient": "Ambient",
    "sound.full": "Full",
    warmLook: "Warm look",
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
    clipsChecked: { one: "{done}/{count} clip checked", other: "{done}/{count} clips checked" },
    stoppedAt: "Stopped at step {step}/{total}, {name}: {detail}",
    build: "Build",
    building: "Building",
    anotherVersion: "Create another version",
    finishTitle: "Finish title and look",
    draftCreated: "Draft created. Select the title to edit its text or font, a clip to adjust its crop, warmth or sound level, and the music to change its volume. Moving cuts inside the title will not move the title; rebuilding creates a new Draft and does not keep Inspector edits.",
    draftCreatedAdding: "Draft created; adding title and look…",
    openDraft: "Open the new Draft",
    copyLink: "Copy the link to the new Draft",
    shortened: { one: "Your footage fits {count} montage shot, so this video is about {seconds} s instead of {fullSeconds} s. Add more clips for the full length.", other: "Your footage fits {count} montage shots, so this video is about {seconds} s instead of {fullSeconds} s. Add more clips for the full length." },
    note: "Note: {detail}.",
    unchecked: { one: "Could not check {count} clip; it was skipped. Build again to retry it.", other: "Could not check {count} clips; they were skipped. Build again to retry them." },
    adjacentRepeats: { one: "{count} cut joins two shots from the same clip because there wasn't enough other footage, so it may not read as a cut. Add more clips or photos to avoid this.", other: "{count} cuts join two shots from the same clip because there wasn't enough other footage, so they may not read as cuts. Add more clips or photos to avoid this." },
    startFailed: "City Weekend Vlog could not start: {detail}. Reinstall the plugin if this persists.",
    foldersNotFound: "the plugin folders could not be found",
    adapterNeeded: "This Selects build needs an updated {name} adapter.",
    stepFailed: "Selects could not complete this step.",
    musicFixedRhythm: "Music added; cuts use the original rhythm because its beat could not be found reliably.",
    musicFixedRhythmDetail: "Music added; cuts use the original rhythm ({detail}).",
    musicUnreadable: "Could not read this music file ({detail}). Choose another file or one of the tracks.",
    beatFailed: "beat detection failed",
    previewFailed: "Could not play a preview: {detail}.",
    previewNotCut: "the preview could not be cut",
    noAudio: "no audio came back",
    dropMusic: "Drop a music file, or choose one of the tracks.",
    musicLengthUnread: "The length of your music could not be read. Choose another file or one of the tracks.",
    sectionTooShort: "This music section is too short for the video. Move the section earlier or pick a shorter length.",
    foundShots: { one: "Found {count} usable shot; this style needs at least {needed}.", other: "Found {count} usable shots; this style needs at least {needed}." },
    foundShotsPhotos: { one: "Found {count} usable shot (photos: {photos}); this style needs at least {needed}.", other: "Found {count} usable shots (photos: {photos}); this style needs at least {needed}." },
    addFootage: "Add more varied footage or select more clips.",
    addFootagePhotos: "Add more varied footage or photos, or select more clips.",
    retryUnchecked: { one: "Could not check {count} clip; press Build to retry it.", other: "Could not check {count} clips; press Build to retry them." },
    draftNoId: "The Draft \"{name}\" was saved, but Selects did not report its id, so the title and look could not be added. Open it from the Drafts list, or build again.",
    finishFailed: "The Draft was created, but it could not be finished (clip sound, title and look): {detail}. Press Finish title and look to try again.",
    openFailed: "The Draft is ready, but it could not be opened: {detail}. Use the link below or open it from the Drafts list.",
    "param.font": "Main font (optional)",
    "param.color": "Title color",
    "param.shadow": "Shadow",
    "param.size": "Size",
    "param.tilt": "Tilt",
    "param.height": "Height (%)",
    "param.motion": "Motion",
    "param.motionStrength": "Motion strength",
    "param.warmth": "Warmth",
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
    openProject: "Öffne ein Projekt, um ein City Weekend Vlog zu erstellen.",
    refresh: "Aktualisieren",
    refreshing: "Wird aktualisiert",
    refreshFailed: "Die Clip-Liste konnte nicht aktualisiert werden: {detail}",
    readFailed: "Die Clips in diesem Projekt konnten nicht gelesen werden: {detail}",
    checkingClipsNow: "Clips werden geprüft …",
    checkingClips: "Clips werden geprüft",
    listening: "Beat wird gesucht",
    working: "In Arbeit",
    noFootage: "In diesem Projekt gibt es noch keine analysierten Videos oder Fotos. Füge Videoclips hinzu und analysiere sie, oder füge Fotos hinzu; die Anzeige aktualisiert sich automatisch.",
    turnOnPhotos: "Aktiviere „Fotos verwenden“ unter „Erweitert“, um aus den Fotos dieses Projekts zu erstellen.",
    noClipsSelected: "Keine Clips ausgewählt. Wähle Clips unter „Erweitert“.",
    onlyPhotos: { one: "Nur {count} Foto und kein analysiertes Video: Dieser Stil braucht mindestens {needed} Einstellungen. Füge Fotos oder Videoclips hinzu.", other: "Nur {count} Fotos und kein analysiertes Video: Dieser Stil braucht mindestens {needed} Einstellungen. Füge Fotos oder Videoclips hinzu." },
    gap: " ",
    ready: "Bereit: {summary}",
    clips: { one: "{count} Clip", other: "{count} Clips" },
    clipsSelected: { one: "{selected} von {count} Clip ausgewählt", other: "{selected} von {count} Clips ausgewählt" },
    photos: { one: "{count} Foto", other: "{count} Fotos" },
    photosSelected: { one: "{selected} von {count} Foto ausgewählt", other: "{selected} von {count} Fotos ausgewählt" },
    fitsShots: { one: "Material reicht für {count} Montage-Einstellung", other: "Material reicht für {count} Montage-Einstellungen" },
    aboutSeconds: "ca. {seconds} s",
    notAnalysed: { one: "{count} Clip noch nicht analysiert", other: "{count} Clips noch nicht analysiert" },
    analysing: { one: "{count} Clip wird analysiert. Das aktualisiert sich automatisch, sobald er fertig ist.", other: "{count} Clips werden analysiert. Das aktualisiert sich automatisch, sobald sie fertig sind." },
    notAnalysedAnalyse: { one: "{count} Clip ist noch nicht analysiert. Analysiere ihn in Selects, um ihn hier zu verwenden.", other: "{count} Clips sind noch nicht analysiert. Analysiere sie in Selects, um sie hier zu verwenden." },
    notAnalysedMaybe: { one: "{count} Clip ist noch nicht analysiert. Falls Selects ihn gerade analysiert, aktualisiert sich das automatisch.", other: "{count} Clips sind noch nicht analysiert. Falls Selects sie gerade analysiert, aktualisiert sich das automatisch." },
    analysisFailed: { one: "{count} Clip konnte nicht analysiert werden.", other: "{count} Clips konnten nicht analysiert werden." },
    noteAnalysing: { one: "{count} Clip wird analysiert", other: "{count} Clips werden analysiert" },
    noteFailed: { one: "{count} Clip nicht analysierbar", other: "{count} Clips nicht analysierbar" },
    title: "Titel",
    firstLine: "Erste Zeile",
    connector: "Verbindungswort",
    place: "Ort",
    titlePreview: "Titelvorschau",
    fontStyle: "Schriftstil",
    "preset.classic": "Klassisch",
    "preset.romantic": "Romantisch",
    "preset.retro-diner": "Retro-Diner",
    "preset.travel-journal": "Reisetagebuch",
    "preset.editorial": "Editorial",
    music: "Musik",
    track: "Musikstück",
    ownMusic: "Eigene Musik",
    noMusic: "Keine Musik",
    faintTiming: "Ungefähres Timing im erkannten Tempo ({bpm} BPM): Das Tempo wurde gefunden, aber der Beat ist schwach, daher können die Schnitte danebenliegen.",
    installTools: "Installiere ffmpeg und Node.js 18+, um Musik vorzuhören oder eigene Musik zu verwenden.",
    sectionHint: "Musikabschnitt – zum Auswählen ziehen",
    sectionLabel: "Musikabschnitt",
    musicTooShort: "Diese Musik ist für diese Länge zu kurz",
    startsAt: "Beginnt bei {seconds} s",
    stopPreview: "Vorschau stoppen",
    cancelPreview: "Vorschau abbrechen",
    previewSection: "Diesen Abschnitt vorhören",
    readingMusic: "Musik wird gelesen …",
    musicLengthUnknown: "Die Länge dieser Musik ist unbekannt",
    advanced: "Erweitert",
    length: "Länge",
    "length.short": "Kurz",
    "length.standard": "Standard",
    "length.long": "Lang",
    clipSound: "Clip-Ton",
    "sound.off": "Aus",
    "sound.ambient": "Leise",
    "sound.full": "Voll",
    warmLook: "Warmer Look",
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
    clipsChecked: { one: "{done}/{count} Clip geprüft", other: "{done}/{count} Clips geprüft" },
    stoppedAt: "Abgebrochen bei Schritt {step}/{total}, {name}: {detail}",
    build: "Erstellen",
    building: "Wird erstellt",
    anotherVersion: "Weitere Version erstellen",
    finishTitle: "Titel und Look fertigstellen",
    draftCreated: "Draft erstellt. Wähle den Titel aus, um Text oder Schrift zu ändern, einen Clip, um Ausschnitt, Wärme oder Lautstärke anzupassen, und die Musik, um ihre Lautstärke zu ändern. Wenn du Schnitte im Titelbereich verschiebst, wandert der Titel nicht mit; ein erneutes Erstellen legt einen neuen Draft an und übernimmt keine Änderungen aus dem Inspektor.",
    draftCreatedAdding: "Draft erstellt; Titel und Look werden hinzugefügt …",
    openDraft: "Neuen Draft öffnen",
    copyLink: "Link zum neuen Draft kopieren",
    shortened: { one: "Dein Material reicht für {count} Montage-Einstellung, daher ist dieses Video etwa {seconds} s statt {fullSeconds} s lang. Füge für die volle Länge weitere Clips hinzu.", other: "Dein Material reicht für {count} Montage-Einstellungen, daher ist dieses Video etwa {seconds} s statt {fullSeconds} s lang. Füge für die volle Länge weitere Clips hinzu." },
    note: "Hinweis: {detail}.",
    unchecked: { one: "{count} Clip konnte nicht geprüft werden und wurde übersprungen. Erstelle erneut, um es noch einmal zu versuchen.", other: "{count} Clips konnten nicht geprüft werden und wurden übersprungen. Erstelle erneut, um es noch einmal zu versuchen." },
    adjacentRepeats: { one: "{count} Schnitt verbindet zwei Einstellungen aus demselben Clip, weil nicht genug anderes Material vorhanden war; er wirkt möglicherweise nicht wie ein Schnitt. Füge weitere Clips oder Fotos hinzu, um das zu vermeiden.", other: "{count} Schnitte verbinden zwei Einstellungen aus demselben Clip, weil nicht genug anderes Material vorhanden war; sie wirken möglicherweise nicht wie Schnitte. Füge weitere Clips oder Fotos hinzu, um das zu vermeiden." },
    startFailed: "City Weekend Vlog konnte nicht gestartet werden: {detail}. Installiere das Plugin neu, falls das Problem bestehen bleibt.",
    foldersNotFound: "die Plugin-Ordner wurden nicht gefunden",
    adapterNeeded: "Diese Selects-Version braucht einen aktualisierten {name}-Adapter.",
    stepFailed: "Selects konnte diesen Schritt nicht abschließen.",
    musicFixedRhythm: "Musik hinzugefügt; die Schnitte folgen dem Originalrhythmus, weil der Beat nicht zuverlässig gefunden wurde.",
    musicFixedRhythmDetail: "Musik hinzugefügt; die Schnitte folgen dem Originalrhythmus ({detail}).",
    musicUnreadable: "Diese Musikdatei konnte nicht gelesen werden ({detail}). Wähle eine andere Datei oder eines der Musikstücke.",
    beatFailed: "Beat-Erkennung fehlgeschlagen",
    previewFailed: "Die Vorschau konnte nicht abgespielt werden: {detail}.",
    previewNotCut: "die Vorschau konnte nicht geschnitten werden",
    noAudio: "es kam kein Audio zurück",
    dropMusic: "Lege eine Musikdatei ab oder wähle eines der Musikstücke.",
    musicLengthUnread: "Die Länge deiner Musik konnte nicht gelesen werden. Wähle eine andere Datei oder eines der Musikstücke.",
    sectionTooShort: "Dieser Musikabschnitt ist für das Video zu kurz. Verschiebe den Abschnitt nach vorn oder wähle eine kürzere Länge.",
    foundShots: { one: "{count} brauchbare Einstellung gefunden; dieser Stil braucht mindestens {needed}.", other: "{count} brauchbare Einstellungen gefunden; dieser Stil braucht mindestens {needed}." },
    foundShotsPhotos: { one: "{count} brauchbare Einstellung gefunden (davon Fotos: {photos}); dieser Stil braucht mindestens {needed}.", other: "{count} brauchbare Einstellungen gefunden (davon Fotos: {photos}); dieser Stil braucht mindestens {needed}." },
    addFootage: "Füge abwechslungsreicheres Material hinzu oder wähle mehr Clips aus.",
    addFootagePhotos: "Füge abwechslungsreicheres Material oder Fotos hinzu oder wähle mehr Clips aus.",
    retryUnchecked: { one: "{count} Clip konnte nicht geprüft werden; drücke „Erstellen“, um es erneut zu versuchen.", other: "{count} Clips konnten nicht geprüft werden; drücke „Erstellen“, um es erneut zu versuchen." },
    draftNoId: "Der Draft „{name}“ wurde gespeichert, aber Selects hat seine ID nicht gemeldet, daher konnten Titel und Look nicht hinzugefügt werden. Öffne ihn in der Draft-Liste oder erstelle erneut.",
    finishFailed: "Der Draft wurde erstellt, konnte aber nicht fertiggestellt werden (Clip-Ton, Titel und Look): {detail}. Drücke „Titel und Look fertigstellen“, um es erneut zu versuchen.",
    openFailed: "Der Draft ist fertig, konnte aber nicht geöffnet werden: {detail}. Nutze den Link unten oder öffne ihn in der Draft-Liste.",
    "param.font": "Hauptschrift (optional)",
    "param.color": "Titelfarbe",
    "param.shadow": "Schatten",
    "param.size": "Größe",
    "param.tilt": "Neigung",
    "param.height": "Höhe (%)",
    "param.motion": "Bewegung",
    "param.motionStrength": "Bewegungsstärke",
    "param.warmth": "Wärme",
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
    openProject: "Abre un proyecto para crear un City Weekend Vlog.",
    refresh: "Actualizar",
    refreshing: "Actualizando",
    refreshFailed: "No se pudo actualizar la lista de clips: {detail}",
    readFailed: "No se pudieron leer los clips de este proyecto: {detail}",
    checkingClipsNow: "Comprobando clips…",
    checkingClips: "Comprobando clips",
    listening: "Buscando el ritmo",
    working: "Trabajando",
    noFootage: "Este proyecto aún no tiene vídeos analizados ni fotos. Añade clips de vídeo y analízalos, o añade fotos; se actualizará automáticamente.",
    turnOnPhotos: "Activa «Usar fotos» en «Avanzado» para crear con las fotos de este proyecto.",
    noClipsSelected: "No hay clips seleccionados. Elige clips en «Avanzado».",
    onlyPhotos: { one: "Solo {count} foto y ningún vídeo analizado: este estilo necesita al menos {needed} planos. Añade fotos o clips de vídeo.", many: "Solo {count} de fotos y ningún vídeo analizado: este estilo necesita al menos {needed} planos. Añade fotos o clips de vídeo.", other: "Solo {count} fotos y ningún vídeo analizado: este estilo necesita al menos {needed} planos. Añade fotos o clips de vídeo." },
    gap: " ",
    ready: "Listo: {summary}",
    clips: { one: "{count} clip", many: "{count} de clips", other: "{count} clips" },
    clipsSelected: { one: "{selected} de {count} clip seleccionado", many: "{selected} de {count} de clips seleccionados", other: "{selected} de {count} clips seleccionados" },
    photos: { one: "{count} foto", many: "{count} de fotos", other: "{count} fotos" },
    photosSelected: { one: "{selected} de {count} foto seleccionada", many: "{selected} de {count} de fotos seleccionadas", other: "{selected} de {count} fotos seleccionadas" },
    fitsShots: { one: "el material da para {count} plano de montaje", many: "el material da para {count} de planos de montaje", other: "el material da para {count} planos de montaje" },
    aboutSeconds: "unos {seconds} s",
    notAnalysed: { one: "{count} clip sin analizar", many: "{count} de clips sin analizar", other: "{count} clips sin analizar" },
    analysing: { one: "Se está analizando {count} clip. Esto se actualiza solo cuando termine.", many: "Se están analizando {count} de clips. Esto se actualiza solo cuando terminen.", other: "Se están analizando {count} clips. Esto se actualiza solo cuando terminen." },
    notAnalysedAnalyse: { one: "{count} clip aún no está analizado. Analízalo en Selects para usarlo aquí.", many: "{count} de clips aún no están analizados. Analízalos en Selects para usarlos aquí.", other: "{count} clips aún no están analizados. Analízalos en Selects para usarlos aquí." },
    notAnalysedMaybe: { one: "{count} clip aún no está analizado. Si Selects lo está analizando, esto se actualiza solo.", many: "{count} de clips aún no están analizados. Si Selects los está analizando, esto se actualiza solo.", other: "{count} clips aún no están analizados. Si Selects los está analizando, esto se actualiza solo." },
    analysisFailed: { one: "No se pudo analizar {count} clip.", many: "No se pudieron analizar {count} de clips.", other: "No se pudieron analizar {count} clips." },
    noteAnalysing: { one: "{count} clip en análisis", many: "{count} de clips en análisis", other: "{count} clips en análisis" },
    noteFailed: { one: "{count} clip sin poder analizarse", many: "{count} de clips sin poder analizarse", other: "{count} clips sin poder analizarse" },
    title: "Título",
    firstLine: "Primera línea",
    connector: "Conector",
    place: "Lugar",
    titlePreview: "Vista previa del título",
    fontStyle: "Estilo de fuente",
    "preset.classic": "Clásico",
    "preset.romantic": "Romántico",
    "preset.retro-diner": "Diner retro",
    "preset.travel-journal": "Diario de viaje",
    "preset.editorial": "Editorial",
    music: "Música",
    track: "Pista",
    ownMusic: "Tu propia música",
    noMusic: "Sin música",
    faintTiming: "Sincronía aproximada con el tempo detectado ({bpm} BPM): se encontró el tempo, pero el ritmo es débil, así que los cortes pueden no coincidir.",
    installTools: "Instala ffmpeg y Node.js 18+ para escuchar la música o usar tu propia pista.",
    sectionHint: "Sección de música: arrastra para elegir",
    sectionLabel: "Sección de música",
    musicTooShort: "Esta música es demasiado corta para esta duración",
    startsAt: "Empieza en {seconds} s",
    stopPreview: "Detener la vista previa",
    cancelPreview: "Cancelar la vista previa",
    previewSection: "Escuchar esta sección",
    readingMusic: "Leyendo la música…",
    musicLengthUnknown: "Se desconoce la duración de esta música",
    advanced: "Avanzado",
    length: "Duración",
    "length.short": "Corta",
    "length.standard": "Estándar",
    "length.long": "Larga",
    clipSound: "Sonido de los clips",
    "sound.off": "Apagado",
    "sound.ambient": "Ambiente",
    "sound.full": "Completo",
    warmLook: "Look cálido",
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
    clipsChecked: { one: "{done}/{count} clip comprobado", many: "{done}/{count} de clips comprobados", other: "{done}/{count} clips comprobados" },
    stoppedAt: "Se detuvo en el paso {step}/{total}, {name}: {detail}",
    build: "Crear",
    building: "Creando",
    anotherVersion: "Crear otra versión",
    finishTitle: "Terminar título y look",
    draftCreated: "Draft creado. Selecciona el título para editar su texto o fuente, un clip para ajustar su encuadre, calidez o nivel de sonido, y la música para cambiar su volumen. Si mueves cortes dentro del título, el título no se moverá; volver a crear genera un Draft nuevo y no conserva los cambios del Inspector.",
    draftCreatedAdding: "Draft creado; añadiendo título y look…",
    openDraft: "Abrir el nuevo Draft",
    copyLink: "Copiar el enlace al nuevo Draft",
    shortened: { one: "Tu material da para {count} plano de montaje, así que este vídeo dura unos {seconds} s en lugar de {fullSeconds} s. Añade más clips para la duración completa.", many: "Tu material da para {count} de planos de montaje, así que este vídeo dura unos {seconds} s en lugar de {fullSeconds} s. Añade más clips para la duración completa.", other: "Tu material da para {count} planos de montaje, así que este vídeo dura unos {seconds} s en lugar de {fullSeconds} s. Añade más clips para la duración completa." },
    note: "Nota: {detail}.",
    unchecked: { one: "No se pudo comprobar {count} clip y se omitió. Vuelve a crear para reintentarlo.", many: "No se pudieron comprobar {count} de clips y se omitieron. Vuelve a crear para reintentarlo.", other: "No se pudieron comprobar {count} clips y se omitieron. Vuelve a crear para reintentarlo." },
    adjacentRepeats: { one: "{count} corte une dos planos del mismo clip porque no había suficiente material distinto, así que puede no percibirse como un corte. Añade más clips o fotos para evitarlo.", many: "{count} de cortes unen dos planos del mismo clip porque no había suficiente material distinto, así que pueden no percibirse como cortes. Añade más clips o fotos para evitarlo.", other: "{count} cortes unen dos planos del mismo clip porque no había suficiente material distinto, así que pueden no percibirse como cortes. Añade más clips o fotos para evitarlo." },
    startFailed: "City Weekend Vlog no pudo iniciarse: {detail}. Reinstala el plugin si el problema continúa.",
    foldersNotFound: "no se encontraron las carpetas del plugin",
    adapterNeeded: "Esta versión de Selects necesita un adaptador {name} actualizado.",
    stepFailed: "Selects no pudo completar este paso.",
    musicFixedRhythm: "Música añadida; los cortes usan el ritmo original porque no se pudo detectar su ritmo con fiabilidad.",
    musicFixedRhythmDetail: "Música añadida; los cortes usan el ritmo original ({detail}).",
    musicUnreadable: "No se pudo leer este archivo de música ({detail}). Elige otro archivo o una de las pistas.",
    beatFailed: "falló la detección del ritmo",
    previewFailed: "No se pudo reproducir la vista previa: {detail}.",
    previewNotCut: "no se pudo recortar la vista previa",
    noAudio: "no se recibió audio",
    dropMusic: "Suelta un archivo de música o elige una de las pistas.",
    musicLengthUnread: "No se pudo leer la duración de tu música. Elige otro archivo o una de las pistas.",
    sectionTooShort: "Esta sección de música es demasiado corta para el vídeo. Mueve la sección hacia el principio o elige una duración más corta.",
    foundShots: { one: "Se encontró {count} plano utilizable; este estilo necesita al menos {needed}.", many: "Se encontraron {count} de planos utilizables; este estilo necesita al menos {needed}.", other: "Se encontraron {count} planos utilizables; este estilo necesita al menos {needed}." },
    foundShotsPhotos: { one: "Se encontró {count} plano utilizable (fotos: {photos}); este estilo necesita al menos {needed}.", many: "Se encontraron {count} de planos utilizables (fotos: {photos}); este estilo necesita al menos {needed}.", other: "Se encontraron {count} planos utilizables (fotos: {photos}); este estilo necesita al menos {needed}." },
    addFootage: "Añade material más variado o selecciona más clips.",
    addFootagePhotos: "Añade material más variado o fotos, o selecciona más clips.",
    retryUnchecked: { one: "No se pudo comprobar {count} clip; pulsa «Crear» para reintentarlo.", many: "No se pudieron comprobar {count} de clips; pulsa «Crear» para reintentarlo.", other: "No se pudieron comprobar {count} clips; pulsa «Crear» para reintentarlo." },
    draftNoId: "El Draft «{name}» se guardó, pero Selects no informó de su id, así que no se pudieron añadir el título y el look. Ábrelo desde la lista de Drafts o vuelve a crear.",
    finishFailed: "El Draft se creó, pero no se pudo terminar (sonido de los clips, título y look): {detail}. Pulsa «Terminar título y look» para reintentarlo.",
    openFailed: "El Draft está listo, pero no se pudo abrir: {detail}. Usa el enlace de abajo o ábrelo desde la lista de Drafts.",
    "param.font": "Fuente principal (opcional)",
    "param.color": "Color del título",
    "param.shadow": "Sombra",
    "param.size": "Tamaño",
    "param.tilt": "Inclinación",
    "param.height": "Altura (%)",
    "param.motion": "Movimiento",
    "param.motionStrength": "Intensidad del movimiento",
    "param.warmth": "Calidez",
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
    openProject: "Ouvrez un projet pour créer un City Weekend Vlog.",
    refresh: "Actualiser",
    refreshing: "Actualisation",
    refreshFailed: "Impossible d'actualiser la liste des clips : {detail}",
    readFailed: "Impossible de lire les clips de ce projet : {detail}",
    checkingClipsNow: "Vérification des clips…",
    checkingClips: "Vérification des clips",
    listening: "Recherche du rythme",
    working: "En cours",
    noFootage: "Ce projet ne contient pas encore de vidéo analysée ni de photo. Ajoutez des clips vidéo et analysez-les, ou ajoutez des photos ; l'affichage se met à jour automatiquement.",
    turnOnPhotos: "Activez « Utiliser les photos » dans « Avancé » pour créer à partir des photos de ce projet.",
    noClipsSelected: "Aucun clip sélectionné. Choisissez des clips dans « Avancé ».",
    onlyPhotos: { one: "Seulement {count} photo et aucune vidéo analysée : ce style demande au moins {needed} plans. Ajoutez des photos ou des clips vidéo.", many: "Seulement {count} de photos et aucune vidéo analysée : ce style demande au moins {needed} plans. Ajoutez des photos ou des clips vidéo.", other: "Seulement {count} photos et aucune vidéo analysée : ce style demande au moins {needed} plans. Ajoutez des photos ou des clips vidéo." },
    gap: " ",
    ready: "Prêt : {summary}",
    clips: { one: "{count} clip", many: "{count} de clips", other: "{count} clips" },
    clipsSelected: { one: "{selected} sur {count} clip sélectionné", many: "{selected} sur {count} de clips sélectionnés", other: "{selected} sur {count} clips sélectionnés" },
    photos: { one: "{count} photo", many: "{count} de photos", other: "{count} photos" },
    photosSelected: { one: "{selected} sur {count} photo sélectionnée", many: "{selected} sur {count} de photos sélectionnées", other: "{selected} sur {count} photos sélectionnées" },
    fitsShots: { one: "les images suffisent pour {count} plan de montage", many: "les images suffisent pour {count} de plans de montage", other: "les images suffisent pour {count} plans de montage" },
    aboutSeconds: "environ {seconds} s",
    notAnalysed: { one: "{count} clip pas encore analysé", many: "{count} de clips pas encore analysés", other: "{count} clips pas encore analysés" },
    analysing: { one: "{count} clip est en cours d'analyse. Ceci se met à jour automatiquement à la fin.", many: "{count} de clips sont en cours d'analyse. Ceci se met à jour automatiquement à la fin.", other: "{count} clips sont en cours d'analyse. Ceci se met à jour automatiquement à la fin." },
    notAnalysedAnalyse: { one: "{count} clip n'est pas encore analysé. Analysez-le dans Selects pour l'utiliser ici.", many: "{count} de clips ne sont pas encore analysés. Analysez-les dans Selects pour les utiliser ici.", other: "{count} clips ne sont pas encore analysés. Analysez-les dans Selects pour les utiliser ici." },
    notAnalysedMaybe: { one: "{count} clip n'est pas encore analysé. Si Selects l'analyse, ceci se met à jour automatiquement.", many: "{count} de clips ne sont pas encore analysés. Si Selects les analyse, ceci se met à jour automatiquement.", other: "{count} clips ne sont pas encore analysés. Si Selects les analyse, ceci se met à jour automatiquement." },
    analysisFailed: { one: "{count} clip n'a pas pu être analysé.", many: "{count} de clips n'ont pas pu être analysés.", other: "{count} clips n'ont pas pu être analysés." },
    noteAnalysing: { one: "{count} clip en cours d'analyse", many: "{count} de clips en cours d'analyse", other: "{count} clips en cours d'analyse" },
    noteFailed: { one: "{count} clip non analysable", many: "{count} de clips non analysables", other: "{count} clips non analysables" },
    title: "Titre",
    firstLine: "Première ligne",
    connector: "Mot de liaison",
    place: "Lieu",
    titlePreview: "Aperçu du titre",
    fontStyle: "Style de police",
    "preset.classic": "Classique",
    "preset.romantic": "Romantique",
    "preset.retro-diner": "Diner rétro",
    "preset.travel-journal": "Carnet de voyage",
    "preset.editorial": "Éditorial",
    music: "Musique",
    track: "Morceau",
    ownMusic: "Votre propre musique",
    noMusic: "Sans musique",
    faintTiming: "Calage approximatif sur le tempo détecté ({bpm} BPM) : le tempo a été trouvé, mais le rythme est peu marqué ; les coupes peuvent donc tomber à côté.",
    installTools: "Installez ffmpeg et Node.js 18+ pour écouter la musique ou utiliser votre propre morceau.",
    sectionHint: "Section musicale : faites glisser pour choisir",
    sectionLabel: "Section musicale",
    musicTooShort: "Cette musique est trop courte pour cette durée",
    startsAt: "Commence à {seconds} s",
    stopPreview: "Arrêter l'aperçu",
    cancelPreview: "Annuler l'aperçu",
    previewSection: "Écouter cette section",
    readingMusic: "Lecture de la musique…",
    musicLengthUnknown: "La durée de cette musique est inconnue",
    advanced: "Avancé",
    length: "Durée",
    "length.short": "Courte",
    "length.standard": "Standard",
    "length.long": "Longue",
    clipSound: "Son des clips",
    "sound.off": "Coupé",
    "sound.ambient": "Ambiance",
    "sound.full": "Plein",
    warmLook: "Look chaleureux",
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
    clipsChecked: { one: "{done}/{count} clip vérifié", many: "{done}/{count} clips vérifiés", other: "{done}/{count} clips vérifiés" },
    stoppedAt: "Arrêt à l'étape {step}/{total}, {name} : {detail}",
    build: "Créer",
    building: "Création",
    anotherVersion: "Créer une autre version",
    finishTitle: "Terminer le titre et le look",
    draftCreated: "Draft créé. Sélectionnez le titre pour modifier son texte ou sa police, un clip pour ajuster son cadrage, sa chaleur ou son niveau sonore, et la musique pour changer son volume. Déplacer des coupes dans le titre ne déplace pas le titre ; une nouvelle création produit un nouveau Draft et ne conserve pas les modifications de l'Inspecteur.",
    draftCreatedAdding: "Draft créé ; ajout du titre et du look…",
    openDraft: "Ouvrir le nouveau Draft",
    copyLink: "Copier le lien vers le nouveau Draft",
    shortened: { one: "Vos images suffisent pour {count} plan de montage ; cette vidéo dure donc environ {seconds} s au lieu de {fullSeconds} s. Ajoutez des clips pour obtenir la durée complète.", many: "Vos images suffisent pour {count} de plans de montage ; cette vidéo dure donc environ {seconds} s au lieu de {fullSeconds} s. Ajoutez des clips pour obtenir la durée complète.", other: "Vos images suffisent pour {count} plans de montage ; cette vidéo dure donc environ {seconds} s au lieu de {fullSeconds} s. Ajoutez des clips pour obtenir la durée complète." },
    note: "Remarque : {detail}.",
    unchecked: { one: "{count} clip n'a pas pu être vérifié et a été ignoré. Relancez la création pour réessayer.", many: "{count} de clips n'ont pas pu être vérifiés et ont été ignorés. Relancez la création pour réessayer.", other: "{count} clips n'ont pas pu être vérifiés et ont été ignorés. Relancez la création pour réessayer." },
    adjacentRepeats: { one: "{count} coupe relie deux plans du même clip faute d'autres images ; elle peut ne pas se voir comme une coupe. Ajoutez des clips ou des photos pour l'éviter.", many: "{count} de coupes relient deux plans du même clip faute d'autres images ; elles peuvent ne pas se voir comme des coupes. Ajoutez des clips ou des photos pour l'éviter.", other: "{count} coupes relient deux plans du même clip faute d'autres images ; elles peuvent ne pas se voir comme des coupes. Ajoutez des clips ou des photos pour l'éviter." },
    startFailed: "City Weekend Vlog n'a pas pu démarrer : {detail}. Réinstallez le plugin si le problème persiste.",
    foldersNotFound: "les dossiers du plugin sont introuvables",
    adapterNeeded: "Cette version de Selects nécessite un adaptateur {name} à jour.",
    stepFailed: "Selects n'a pas pu terminer cette étape.",
    musicFixedRhythm: "Musique ajoutée ; les coupes suivent le rythme d'origine, car son rythme n'a pas pu être détecté de façon fiable.",
    musicFixedRhythmDetail: "Musique ajoutée ; les coupes suivent le rythme d'origine ({detail}).",
    musicUnreadable: "Impossible de lire ce fichier audio ({detail}). Choisissez un autre fichier ou l'un des morceaux.",
    beatFailed: "la détection du rythme a échoué",
    previewFailed: "Impossible de lire l'aperçu : {detail}.",
    previewNotCut: "l'aperçu n'a pas pu être découpé",
    noAudio: "aucun son n'a été renvoyé",
    dropMusic: "Déposez un fichier audio ou choisissez l'un des morceaux.",
    musicLengthUnread: "La durée de votre musique n'a pas pu être lue. Choisissez un autre fichier ou l'un des morceaux.",
    sectionTooShort: "Cette section musicale est trop courte pour la vidéo. Déplacez-la plus tôt ou choisissez une durée plus courte.",
    foundShots: { one: "{count} plan utilisable trouvé ; ce style en demande au moins {needed}.", many: "{count} de plans utilisables trouvés ; ce style en demande au moins {needed}.", other: "{count} plans utilisables trouvés ; ce style en demande au moins {needed}." },
    foundShotsPhotos: { one: "{count} plan utilisable trouvé (dont photos : {photos}) ; ce style en demande au moins {needed}.", many: "{count} de plans utilisables trouvés (dont photos : {photos}) ; ce style en demande au moins {needed}.", other: "{count} plans utilisables trouvés (dont photos : {photos}) ; ce style en demande au moins {needed}." },
    addFootage: "Ajoutez des images plus variées ou sélectionnez plus de clips.",
    addFootagePhotos: "Ajoutez des images plus variées ou des photos, ou sélectionnez plus de clips.",
    retryUnchecked: { one: "{count} clip n'a pas pu être vérifié ; appuyez sur « Créer » pour réessayer.", many: "{count} de clips n'ont pas pu être vérifiés ; appuyez sur « Créer » pour réessayer.", other: "{count} clips n'ont pas pu être vérifiés ; appuyez sur « Créer » pour réessayer." },
    draftNoId: "Le Draft « {name} » a été enregistré, mais Selects n'a pas communiqué son identifiant ; le titre et le look n'ont donc pas pu être ajoutés. Ouvrez-le depuis la liste des Drafts ou relancez la création.",
    finishFailed: "Le Draft a été créé, mais n'a pas pu être finalisé (son des clips, titre et look) : {detail}. Appuyez sur « Terminer le titre et le look » pour réessayer.",
    openFailed: "Le Draft est prêt, mais n'a pas pu être ouvert : {detail}. Utilisez le lien ci-dessous ou ouvrez-le depuis la liste des Drafts.",
    "param.font": "Police principale (facultatif)",
    "param.color": "Couleur du titre",
    "param.shadow": "Ombre",
    "param.size": "Taille",
    "param.tilt": "Inclinaison",
    "param.height": "Hauteur (%)",
    "param.motion": "Mouvement",
    "param.motionStrength": "Intensité du mouvement",
    "param.warmth": "Chaleur",
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
    openProject: "Apri un progetto per creare un City Weekend Vlog.",
    refresh: "Aggiorna",
    refreshing: "Aggiornamento",
    refreshFailed: "Impossibile aggiornare l'elenco delle clip: {detail}",
    readFailed: "Impossibile leggere le clip di questo progetto: {detail}",
    checkingClipsNow: "Controllo delle clip…",
    checkingClips: "Controllo delle clip",
    listening: "Ricerca del ritmo",
    working: "In corso",
    noFootage: "In questo progetto non ci sono ancora video analizzati né foto. Aggiungi clip video e analizzale, oppure aggiungi foto; si aggiorna automaticamente.",
    turnOnPhotos: "Attiva «Usa foto» in «Avanzate» per creare dalle foto di questo progetto.",
    noClipsSelected: "Nessuna clip selezionata. Scegli le clip in «Avanzate».",
    onlyPhotos: { one: "Solo {count} foto e nessun video analizzato: questo stile richiede almeno {needed} inquadrature. Aggiungi foto o clip video.", many: "Solo {count} di foto e nessun video analizzato: questo stile richiede almeno {needed} inquadrature. Aggiungi foto o clip video.", other: "Solo {count} foto e nessun video analizzato: questo stile richiede almeno {needed} inquadrature. Aggiungi foto o clip video." },
    gap: " ",
    ready: "Pronto: {summary}",
    clips: { one: "{count} clip", many: "{count} di clip", other: "{count} clip" },
    clipsSelected: { one: "{selected} di {count} clip selezionata", many: "{selected} di {count} clip selezionate", other: "{selected} di {count} clip selezionate" },
    photos: { one: "{count} foto", many: "{count} di foto", other: "{count} foto" },
    photosSelected: { one: "{selected} di {count} foto selezionata", many: "{selected} di {count} foto selezionate", other: "{selected} di {count} foto selezionate" },
    fitsShots: { one: "il materiale basta per {count} inquadratura di montaggio", many: "il materiale basta per {count} di inquadrature di montaggio", other: "il materiale basta per {count} inquadrature di montaggio" },
    aboutSeconds: "circa {seconds} s",
    notAnalysed: { one: "{count} clip non ancora analizzata", many: "{count} di clip non ancora analizzate", other: "{count} clip non ancora analizzate" },
    analysing: { one: "{count} clip è in fase di analisi. Si aggiorna automaticamente al termine.", many: "{count} di clip sono in fase di analisi. Si aggiorna automaticamente al termine.", other: "{count} clip sono in fase di analisi. Si aggiorna automaticamente al termine." },
    notAnalysedAnalyse: { one: "{count} clip non è ancora analizzata. Analizzala in Selects per usarla qui.", many: "{count} di clip non sono ancora analizzate. Analizzale in Selects per usarle qui.", other: "{count} clip non sono ancora analizzate. Analizzale in Selects per usarle qui." },
    notAnalysedMaybe: { one: "{count} clip non è ancora analizzata. Se Selects la sta analizzando, si aggiorna automaticamente.", many: "{count} di clip non sono ancora analizzate. Se Selects le sta analizzando, si aggiorna automaticamente.", other: "{count} clip non sono ancora analizzate. Se Selects le sta analizzando, si aggiorna automaticamente." },
    analysisFailed: { one: "Non è stato possibile analizzare {count} clip.", many: "Non è stato possibile analizzare {count} di clip.", other: "Non è stato possibile analizzare {count} clip." },
    noteAnalysing: { one: "{count} clip in analisi", many: "{count} di clip in analisi", other: "{count} clip in analisi" },
    noteFailed: { one: "{count} clip non analizzabile", many: "{count} di clip non analizzabili", other: "{count} clip non analizzabili" },
    title: "Titolo",
    firstLine: "Prima riga",
    connector: "Connettivo",
    place: "Luogo",
    titlePreview: "Anteprima del titolo",
    fontStyle: "Stile del carattere",
    "preset.classic": "Classico",
    "preset.romantic": "Romantico",
    "preset.retro-diner": "Diner rétro",
    "preset.travel-journal": "Diario di viaggio",
    "preset.editorial": "Editoriale",
    music: "Musica",
    track: "Brano",
    ownMusic: "La tua musica",
    noMusic: "Nessuna musica",
    faintTiming: "Sincronia approssimativa sul tempo rilevato ({bpm} BPM): il tempo è stato trovato ma il ritmo è debole, quindi i tagli potrebbero non coincidere.",
    installTools: "Installa ffmpeg e Node.js 18+ per ascoltare la musica o usare un tuo brano.",
    sectionHint: "Sezione musicale: trascina per scegliere",
    sectionLabel: "Sezione musicale",
    musicTooShort: "Questa musica è troppo corta per questa durata",
    startsAt: "Inizia a {seconds} s",
    stopPreview: "Ferma l'anteprima",
    cancelPreview: "Annulla l'anteprima",
    previewSection: "Ascolta questa sezione",
    readingMusic: "Lettura della musica…",
    musicLengthUnknown: "La durata di questa musica è sconosciuta",
    advanced: "Avanzate",
    length: "Durata",
    "length.short": "Breve",
    "length.standard": "Standard",
    "length.long": "Lunga",
    clipSound: "Audio delle clip",
    "sound.off": "Spento",
    "sound.ambient": "Ambiente",
    "sound.full": "Pieno",
    warmLook: "Look caldo",
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
    clipsChecked: { one: "{done}/{count} clip controllata", many: "{done}/{count} clip controllate", other: "{done}/{count} clip controllate" },
    stoppedAt: "Interrotto al passaggio {step}/{total}, {name}: {detail}",
    build: "Crea",
    building: "Creazione",
    anotherVersion: "Crea un'altra versione",
    finishTitle: "Completa titolo e look",
    draftCreated: "Draft creato. Seleziona il titolo per modificarne testo o carattere, una clip per regolarne ritaglio, calore o livello audio, e la musica per cambiarne il volume. Spostare i tagli all'interno del titolo non sposta il titolo; creando di nuovo si ottiene un nuovo Draft e le modifiche fatte nell'Inspector non vengono mantenute.",
    draftCreatedAdding: "Draft creato; aggiunta di titolo e look…",
    openDraft: "Apri il nuovo Draft",
    copyLink: "Copia il link al nuovo Draft",
    shortened: { one: "Il tuo materiale basta per {count} inquadratura di montaggio, quindi questo video dura circa {seconds} s invece di {fullSeconds} s. Aggiungi altre clip per la durata completa.", many: "Il tuo materiale basta per {count} di inquadrature di montaggio, quindi questo video dura circa {seconds} s invece di {fullSeconds} s. Aggiungi altre clip per la durata completa.", other: "Il tuo materiale basta per {count} inquadrature di montaggio, quindi questo video dura circa {seconds} s invece di {fullSeconds} s. Aggiungi altre clip per la durata completa." },
    note: "Nota: {detail}.",
    unchecked: { one: "Non è stato possibile controllare {count} clip, che è stata saltata. Crea di nuovo per riprovare.", many: "Non è stato possibile controllare {count} di clip, che sono state saltate. Crea di nuovo per riprovare.", other: "Non è stato possibile controllare {count} clip, che sono state saltate. Crea di nuovo per riprovare." },
    adjacentRepeats: { one: "{count} taglio unisce due inquadrature della stessa clip perché non c'era abbastanza altro materiale, quindi potrebbe non sembrare un taglio. Aggiungi altre clip o foto per evitarlo.", many: "{count} di tagli uniscono due inquadrature della stessa clip perché non c'era abbastanza altro materiale, quindi potrebbero non sembrare tagli. Aggiungi altre clip o foto per evitarlo.", other: "{count} tagli uniscono due inquadrature della stessa clip perché non c'era abbastanza altro materiale, quindi potrebbero non sembrare tagli. Aggiungi altre clip o foto per evitarlo." },
    startFailed: "Impossibile avviare City Weekend Vlog: {detail}. Reinstalla il plugin se il problema persiste.",
    foldersNotFound: "le cartelle del plugin non sono state trovate",
    adapterNeeded: "Questa versione di Selects richiede un adattatore {name} aggiornato.",
    stepFailed: "Selects non è riuscito a completare questo passaggio.",
    musicFixedRhythm: "Musica aggiunta; i tagli seguono il ritmo originale perché il suo ritmo non è stato rilevato in modo affidabile.",
    musicFixedRhythmDetail: "Musica aggiunta; i tagli seguono il ritmo originale ({detail}).",
    musicUnreadable: "Impossibile leggere questo file musicale ({detail}). Scegli un altro file o uno dei brani.",
    beatFailed: "rilevamento del ritmo non riuscito",
    previewFailed: "Impossibile riprodurre l'anteprima: {detail}.",
    previewNotCut: "non è stato possibile ritagliare l'anteprima",
    noAudio: "non è stato restituito alcun audio",
    dropMusic: "Trascina qui un file musicale o scegli uno dei brani.",
    musicLengthUnread: "Non è stato possibile leggere la durata della tua musica. Scegli un altro file o uno dei brani.",
    sectionTooShort: "Questa sezione musicale è troppo corta per il video. Sposta la sezione più indietro o scegli una durata più breve.",
    foundShots: { one: "Trovata {count} inquadratura utilizzabile; questo stile ne richiede almeno {needed}.", many: "Trovate {count} di inquadrature utilizzabili; questo stile ne richiede almeno {needed}.", other: "Trovate {count} inquadrature utilizzabili; questo stile ne richiede almeno {needed}." },
    foundShotsPhotos: { one: "Trovata {count} inquadratura utilizzabile (di cui {photos} foto); questo stile ne richiede almeno {needed}.", many: "Trovate {count} di inquadrature utilizzabili (di cui {photos} foto); questo stile ne richiede almeno {needed}.", other: "Trovate {count} inquadrature utilizzabili (di cui {photos} foto); questo stile ne richiede almeno {needed}." },
    addFootage: "Aggiungi materiale più vario o seleziona più clip.",
    addFootagePhotos: "Aggiungi materiale più vario o foto, oppure seleziona più clip.",
    retryUnchecked: { one: "Non è stato possibile controllare {count} clip; premi «Crea» per riprovare.", many: "Non è stato possibile controllare {count} di clip; premi «Crea» per riprovare.", other: "Non è stato possibile controllare {count} clip; premi «Crea» per riprovare." },
    draftNoId: "Il Draft «{name}» è stato salvato, ma Selects non ne ha comunicato l'id, quindi non è stato possibile aggiungere titolo e look. Aprilo dall'elenco dei Draft o crea di nuovo.",
    finishFailed: "Il Draft è stato creato, ma non è stato possibile completarlo (audio delle clip, titolo e look): {detail}. Premi «Completa titolo e look» per riprovare.",
    openFailed: "Il Draft è pronto, ma non è stato possibile aprirlo: {detail}. Usa il link qui sotto o aprilo dall'elenco dei Draft.",
    "param.font": "Carattere principale (facoltativo)",
    "param.color": "Colore del titolo",
    "param.shadow": "Ombra",
    "param.size": "Dimensione",
    "param.tilt": "Inclinazione",
    "param.height": "Altezza (%)",
    "param.motion": "Movimento",
    "param.motionStrength": "Intensità del movimento",
    "param.warmth": "Calore",
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
    openProject: "City Weekend Vlog を作成するには、プロジェクトを開いてください。",
    refresh: "更新",
    refreshing: "更新中",
    refreshFailed: "クリップ一覧を更新できませんでした: {detail}",
    readFailed: "このプロジェクトのクリップを読み込めませんでした: {detail}",
    checkingClipsNow: "クリップを確認中…",
    checkingClips: "クリップを確認中",
    listening: "ビートを検出中",
    working: "処理中",
    noFootage: "このプロジェクトには、解析済みの動画も写真もまだありません。動画クリップを追加して解析するか、写真を追加してください。自動で更新されます。",
    turnOnPhotos: "このプロジェクトの写真から作成するには、「詳細設定」で「写真を使う」をオンにしてください。",
    noClipsSelected: "クリップが選択されていません。「詳細設定」でクリップを選んでください。",
    onlyPhotos: { other: "写真が {count} 枚だけで、解析済みの動画がありません。このスタイルには少なくとも {needed} ショットが必要です。写真か動画クリップを追加してください。" },
    gap: "",
    ready: "準備完了: {summary}",
    clips: { other: "クリップ {count} 本" },
    clipsSelected: { other: "クリップ {count} 本中 {selected} 本を選択" },
    photos: { other: "写真 {count} 枚" },
    photosSelected: { other: "写真 {count} 枚中 {selected} 枚を選択" },
    fitsShots: { other: "素材で作れるモンタージュは {count} ショット" },
    aboutSeconds: "約 {seconds} 秒",
    notAnalysed: { other: "未解析のクリップ {count} 本" },
    analysing: { other: "{count} 本のクリップを解析中です。終わると自動で更新されます。" },
    notAnalysedAnalyse: { other: "{count} 本のクリップがまだ解析されていません。ここで使うには Selects で解析してください。" },
    notAnalysedMaybe: { other: "{count} 本のクリップがまだ解析されていません。Selects が解析中なら、自動で更新されます。" },
    analysisFailed: { other: "{count} 本のクリップを解析できませんでした。" },
    noteAnalysing: { other: "解析中のクリップ {count} 本" },
    noteFailed: { other: "解析できなかったクリップ {count} 本" },
    title: "タイトル",
    firstLine: "1 行目",
    connector: "つなぎの言葉",
    place: "場所",
    titlePreview: "タイトルのプレビュー",
    fontStyle: "フォントスタイル",
    "preset.classic": "クラシック",
    "preset.romantic": "ロマンチック",
    "preset.retro-diner": "レトロダイナー",
    "preset.travel-journal": "トラベルジャーナル",
    "preset.editorial": "エディトリアル",
    music: "音楽",
    track: "トラック",
    ownMusic: "自分の音楽",
    noMusic: "音楽なし",
    faintTiming: "検出したテンポ（{bpm} BPM）でのおおよそのタイミングです。テンポは見つかりましたがビートが弱いため、カットがずれることがあります。",
    installTools: "音楽のプレビューや自分の曲の使用には、ffmpeg と Node.js 18 以降をインストールしてください。",
    sectionHint: "音楽の区間 — ドラッグして選択",
    sectionLabel: "音楽の区間",
    musicTooShort: "この音楽は、この長さには短すぎます",
    startsAt: "{seconds} 秒から開始",
    stopPreview: "プレビューを停止",
    cancelPreview: "プレビューをキャンセル",
    previewSection: "この区間をプレビュー",
    readingMusic: "音楽を読み込み中…",
    musicLengthUnknown: "この音楽の長さがわかりません",
    advanced: "詳細設定",
    length: "長さ",
    "length.short": "短め",
    "length.standard": "標準",
    "length.long": "長め",
    clipSound: "クリップの音",
    "sound.off": "オフ",
    "sound.ambient": "環境音",
    "sound.full": "フル",
    warmLook: "暖色ルック",
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
    clipsChecked: { other: "{done}/{count} 本のクリップを確認済み" },
    stoppedAt: "ステップ {step}/{total}（{name}）で停止しました: {detail}",
    build: "作成",
    building: "作成中",
    anotherVersion: "別のバージョンを作成",
    finishTitle: "タイトルとルックを仕上げる",
    draftCreated: "Draft を作成しました。タイトルを選択するとテキストやフォントを、クリップを選択するとクロップ・暖かさ・音量を、音楽を選択すると音量を変更できます。タイトル内のカットを動かしてもタイトルは動きません。もう一度作成すると新しい Draft になり、インスペクタでの編集は引き継がれません。",
    draftCreatedAdding: "Draft を作成しました。タイトルとルックを追加中…",
    openDraft: "新しい Draft を開く",
    copyLink: "新しい Draft へのリンクをコピー",
    shortened: { other: "素材で作れるモンタージュが {count} ショットのため、この動画は {fullSeconds} 秒ではなく約 {seconds} 秒になります。フルの長さにするにはクリップを追加してください。" },
    note: "メモ: {detail}。",
    unchecked: { other: "{count} 本のクリップを確認できなかったため、スキップしました。もう一度作成すると再試行します。" },
    adjacentRepeats: { other: "ほかの素材が足りなかったため、{count} か所のカットが同じクリップの 2 つのショットをつないでいます。カットに見えないことがあります。避けるにはクリップか写真を追加してください。" },
    startFailed: "City Weekend Vlog を開始できませんでした: {detail}。解決しない場合はプラグインを再インストールしてください。",
    foldersNotFound: "プラグインのフォルダが見つかりませんでした",
    adapterNeeded: "この Selects のビルドには、更新された {name} アダプターが必要です。",
    stepFailed: "Selects はこのステップを完了できませんでした。",
    musicFixedRhythm: "音楽を追加しました。ビートを確実に検出できなかったため、カットは元のリズムを使います。",
    musicFixedRhythmDetail: "音楽を追加しました。カットは元のリズムを使います（{detail}）。",
    musicUnreadable: "この音楽ファイルを読み込めませんでした（{detail}）。別のファイルか、用意されたトラックを選んでください。",
    beatFailed: "ビートの検出に失敗しました",
    previewFailed: "プレビューを再生できませんでした: {detail}。",
    previewNotCut: "プレビューを切り出せませんでした",
    noAudio: "音声が返されませんでした",
    dropMusic: "音楽ファイルをドロップするか、用意されたトラックを選んでください。",
    musicLengthUnread: "音楽の長さを読み取れませんでした。別のファイルか、用意されたトラックを選んでください。",
    sectionTooShort: "この音楽の区間は動画には短すぎます。区間を前に動かすか、短い長さを選んでください。",
    foundShots: { other: "使えるショットは {count} 個でした。このスタイルには少なくとも {needed} 個必要です。" },
    foundShotsPhotos: { other: "使えるショットは {count} 個（うち写真 {photos} 枚）でした。このスタイルには少なくとも {needed} 個必要です。" },
    addFootage: "変化のある素材を追加するか、クリップをもっと選択してください。",
    addFootagePhotos: "変化のある素材や写真を追加するか、クリップをもっと選択してください。",
    retryUnchecked: { other: "{count} 本のクリップを確認できませんでした。「作成」を押すと再試行します。" },
    draftNoId: "Draft「{name}」は保存されましたが、Selects から ID が返されなかったため、タイトルとルックを追加できませんでした。Draft 一覧から開くか、もう一度作成してください。",
    finishFailed: "Draft は作成されましたが、仕上げ（クリップの音、タイトル、ルック）ができませんでした: {detail}。「タイトルとルックを仕上げる」を押して再試行してください。",
    openFailed: "Draft の準備はできましたが、開けませんでした: {detail}。下のリンクを使うか、Draft 一覧から開いてください。",
    "param.font": "メインフォント（任意）",
    "param.color": "タイトルの色",
    "param.shadow": "影",
    "param.size": "サイズ",
    "param.tilt": "傾き",
    "param.height": "高さ（%）",
    "param.motion": "モーション",
    "param.motionStrength": "モーションの強さ",
    "param.warmth": "暖かさ",
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
    openProject: "City Weekend Vlog\ub97c \ub9cc\ub4e4\ub824\uba74 \ud504\ub85c\uc81d\ud2b8\ub97c \uc5ec\uc138\uc694.",
    refresh: "\uc0c8\ub85c\uace0\uce68",
    refreshing: "\uc0c8\ub85c\uace0\uce68 \uc911",
    refreshFailed: "\ud074\ub9bd \ubaa9\ub85d\uc744 \uc0c8\ub85c\uace0\uce68\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}",
    readFailed: "\uc774 \ud504\ub85c\uc81d\ud2b8\uc758 \ud074\ub9bd\uc744 \uc77d\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}",
    checkingClipsNow: "\ud074\ub9bd \ud655\uc778 \uc911…",
    checkingClips: "\ud074\ub9bd \ud655\uc778 \uc911",
    listening: "\ube44\ud2b8 \ucc3e\ub294 \uc911",
    working: "\uc791\uc5c5 \uc911",
    noFootage: "\uc774 \ud504\ub85c\uc81d\ud2b8\uc5d0\ub294 \uc544\uc9c1 \ubd84\uc11d\ub41c \uc601\uc0c1\uc774\ub098 \uc0ac\uc9c4\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. \uc601\uc0c1 \ud074\ub9bd\uc744 \ucd94\uac00\ud574 \ubd84\uc11d\ud558\uac70\ub098 \uc0ac\uc9c4\uc744 \ucd94\uac00\ud558\uc138\uc694. \uc790\ub3d9\uc73c\ub85c \uc5c5\ub370\uc774\ud2b8\ub429\ub2c8\ub2e4.",
    turnOnPhotos: "\uc774 \ud504\ub85c\uc81d\ud2b8\uc758 \uc0ac\uc9c4\uc73c\ub85c \ub9cc\ub4e4\ub824\uba74 ‘\uace0\uae09’\uc5d0\uc11c ‘\uc0ac\uc9c4 \uc0ac\uc6a9’\uc744 \ucf1c\uc138\uc694.",
    noClipsSelected: "\uc120\ud0dd\ud55c \ud074\ub9bd\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. ‘\uace0\uae09’\uc5d0\uc11c \ud074\ub9bd\uc744 \uc120\ud0dd\ud558\uc138\uc694.",
    onlyPhotos: { other: "\uc0ac\uc9c4 {count}\uc7a5\ub9cc \uc788\uace0 \ubd84\uc11d\ub41c \uc601\uc0c1\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. \uc774 \uc2a4\ud0c0\uc77c\uc5d0\ub294 \uc0f7\uc774 \ucd5c\uc18c {needed}\uac1c \ud544\uc694\ud569\ub2c8\ub2e4. \uc0ac\uc9c4\uc774\ub098 \uc601\uc0c1 \ud074\ub9bd\uc744 \ucd94\uac00\ud558\uc138\uc694." },
    gap: " ",
    ready: "\uc900\ube44 \uc644\ub8cc: {summary}",
    clips: { other: "\ud074\ub9bd {count}\uac1c" },
    clipsSelected: { other: "\ud074\ub9bd {count}\uac1c \uc911 {selected}\uac1c \uc120\ud0dd" },
    photos: { other: "\uc0ac\uc9c4 {count}\uc7a5" },
    photosSelected: { other: "\uc0ac\uc9c4 {count}\uc7a5 \uc911 {selected}\uc7a5 \uc120\ud0dd" },
    fitsShots: { other: "\uc601\uc0c1\uc73c\ub85c \ucc44\uc6b8 \uc218 \uc788\ub294 \ubabd\ud0c0\uc8fc \uc0f7 {count}\uac1c" },
    aboutSeconds: "\uc57d {seconds}\ucd08",
    notAnalysed: { other: "\uc544\uc9c1 \ubd84\uc11d\ub418\uc9c0 \uc54a\uc740 \ud074\ub9bd {count}\uac1c" },
    analysing: { other: "\ud074\ub9bd {count}\uac1c\ub97c \ubd84\uc11d\ud558\uace0 \uc788\uc2b5\ub2c8\ub2e4. \ubd84\uc11d\uc774 \ub05d\ub098\uba74 \uc790\ub3d9\uc73c\ub85c \uc5c5\ub370\uc774\ud2b8\ub429\ub2c8\ub2e4." },
    notAnalysedAnalyse: { other: "\ud074\ub9bd {count}\uac1c\uac00 \uc544\uc9c1 \ubd84\uc11d\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4. \uc5ec\uae30\uc11c \uc4f0\ub824\uba74 Selects\uc5d0\uc11c \ubd84\uc11d\ud558\uc138\uc694." },
    notAnalysedMaybe: { other: "\ud074\ub9bd {count}\uac1c\uac00 \uc544\uc9c1 \ubd84\uc11d\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4. Selects\uc5d0\uc11c \ubd84\uc11d \uc911\uc774\ub77c\uba74 \uc790\ub3d9\uc73c\ub85c \uc5c5\ub370\uc774\ud2b8\ub429\ub2c8\ub2e4." },
    analysisFailed: { other: "\ud074\ub9bd {count}\uac1c\ub97c \ubd84\uc11d\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4." },
    noteAnalysing: { other: "\ubd84\uc11d \uc911\uc778 \ud074\ub9bd {count}\uac1c" },
    noteFailed: { other: "\ubd84\uc11d\ud558\uc9c0 \ubabb\ud55c \ud074\ub9bd {count}\uac1c" },
    title: "\ud0c0\uc774\ud2c0",
    firstLine: "\uccab \uc904",
    connector: "\uc5f0\uacb0\uc5b4",
    place: "\uc7a5\uc18c",
    titlePreview: "\ud0c0\uc774\ud2c0 \ubbf8\ub9ac\ubcf4\uae30",
    fontStyle: "\ud3f0\ud2b8 \uc2a4\ud0c0\uc77c",
    "preset.classic": "\ud074\ub798\uc2dd",
    "preset.romantic": "\ub85c\ub9e8\ud2f1",
    "preset.retro-diner": "\ub808\ud2b8\ub85c \ub2e4\uc774\ub108",
    "preset.travel-journal": "\uc5ec\ud589 \uc77c\uae30",
    "preset.editorial": "\uc5d0\ub514\ud1a0\ub9ac\uc5bc",
    music: "\uc74c\uc545",
    track: "\ud2b8\ub799",
    ownMusic: "\ub0b4 \uc74c\uc545",
    noMusic: "\uc74c\uc545 \uc5c6\uc74c",
    faintTiming: "\uac10\uc9c0\ud55c \ud15c\ud3ec({bpm} BPM)\uc5d0 \ub300\ub7b5 \ub9de\ucd98 \ud0c0\uc774\ubc0d\uc785\ub2c8\ub2e4. \ud15c\ud3ec\ub294 \ucc3e\uc558\uc9c0\ub9cc \ube44\ud2b8\uac00 \uc57d\ud574\uc11c \ucef7\uc774 \uc5b4\uae0b\ub0a0 \uc218 \uc788\uc2b5\ub2c8\ub2e4.",
    installTools: "\uc74c\uc545\uc744 \ubbf8\ub9ac \ub4e3\uac70\ub098 \ub0b4 \uc74c\uc545\uc744 \uc4f0\ub824\uba74 ffmpeg\uc640 Node.js 18 \uc774\uc0c1\uc744 \uc124\uce58\ud558\uc138\uc694.",
    sectionHint: "\uc74c\uc545 \uad6c\uac04 — \ub4dc\ub798\uadf8\ud574\uc11c \uc120\ud0dd",
    sectionLabel: "\uc74c\uc545 \uad6c\uac04",
    musicTooShort: "\uc774 \uae38\uc774\ub85c \ub9cc\ub4e4\uae30\uc5d0\ub294 \uc74c\uc545\uc774 \ub108\ubb34 \uc9e7\uc2b5\ub2c8\ub2e4",
    startsAt: "{seconds}\ucd08\ubd80\ud130 \uc2dc\uc791",
    stopPreview: "\ubbf8\ub9ac\ub4e3\uae30 \uc911\uc9c0",
    cancelPreview: "\ubbf8\ub9ac\ub4e3\uae30 \ucde8\uc18c",
    previewSection: "\uc774 \uad6c\uac04 \ubbf8\ub9ac\ub4e3\uae30",
    readingMusic: "\uc74c\uc545 \uc77d\ub294 \uc911…",
    musicLengthUnknown: "\uc774 \uc74c\uc545\uc758 \uae38\uc774\ub97c \uc54c \uc218 \uc5c6\uc2b5\ub2c8\ub2e4",
    advanced: "\uace0\uae09",
    length: "\uae38\uc774",
    "length.short": "\uc9e7\uac8c",
    "length.standard": "\ubcf4\ud1b5",
    "length.long": "\uae38\uac8c",
    clipSound: "\ud074\ub9bd \uc18c\ub9ac",
    "sound.off": "\ub054",
    "sound.ambient": "\ubc30\uacbd\uc74c",
    "sound.full": "\uc6d0\uc74c",
    warmLook: "\ub530\ub73b\ud55c \uc0c9\uac10",
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
    clipsChecked: { other: "\ud074\ub9bd {done}/{count}\uac1c \ud655\uc778" },
    stoppedAt: "{step}/{total}\ub2e8\uacc4({name})\uc5d0\uc11c \uc911\ub2e8\ub418\uc5c8\uc2b5\ub2c8\ub2e4: {detail}",
    build: "\ub9cc\ub4e4\uae30",
    building: "\ub9cc\ub4dc\ub294 \uc911",
    anotherVersion: "\ub2e4\ub978 \ubc84\uc804 \ub9cc\ub4e4\uae30",
    finishTitle: "\ud0c0\uc774\ud2c0\uacfc \uc0c9\uac10 \ub9c8\ubb34\ub9ac",
    draftCreated: "Draft\ub97c \ub9cc\ub4e4\uc5c8\uc2b5\ub2c8\ub2e4. \ud0c0\uc774\ud2c0\uc744 \uc120\ud0dd\ud558\uba74 \uae00\uc790\uc640 \ud3f0\ud2b8\ub97c, \ud074\ub9bd\uc744 \uc120\ud0dd\ud558\uba74 \ud06c\ub86d·\ub530\ub73b\ud568·\uc18c\ub9ac \ud06c\uae30\ub97c, \uc74c\uc545\uc744 \uc120\ud0dd\ud558\uba74 \uc74c\ub7c9\uc744 \ubc14\uafc0 \uc218 \uc788\uc2b5\ub2c8\ub2e4. \ud0c0\uc774\ud2c0 \uad6c\uac04 \uc548\uc5d0\uc11c \ucef7\uc744 \uc62e\uaca8\ub3c4 \ud0c0\uc774\ud2c0\uc740 \ub530\ub77c \uc6c0\uc9c1\uc774\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \ub9cc\ub4e4\uba74 \uc0c8 Draft\uac00 \uc0dd\uae30\uba70 \uc778\uc2a4\ud399\ud130\uc5d0\uc11c \uc218\uc815\ud55c \ub0b4\uc6a9\uc740 \uc720\uc9c0\ub418\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.",
    draftCreatedAdding: "Draft\ub97c \ub9cc\ub4e4\uc5c8\uc2b5\ub2c8\ub2e4. \ud0c0\uc774\ud2c0\uacfc \uc0c9\uac10\uc744 \ucd94\uac00\ud558\ub294 \uc911…",
    openDraft: "\uc0c8 Draft \uc5f4\uae30",
    copyLink: "\uc0c8 Draft \ub9c1\ud06c \ubcf5\uc0ac",
    shortened: { other: "\uc601\uc0c1\uc73c\ub85c \ucc44\uc6b8 \uc218 \uc788\ub294 \ubabd\ud0c0\uc8fc \uc0f7\uc774 {count}\uac1c\ub77c\uc11c, \uc774 \uc601\uc0c1\uc740 {fullSeconds}\ucd08\uac00 \uc544\ub2c8\ub77c \uc57d {seconds}\ucd08\uc785\ub2c8\ub2e4. \uc804\uccb4 \uae38\uc774\ub85c \ub9cc\ub4e4\ub824\uba74 \ud074\ub9bd\uc744 \ub354 \ucd94\uac00\ud558\uc138\uc694." },
    note: "\ucc38\uace0: {detail}.",
    unchecked: { other: "\ud074\ub9bd {count}\uac1c\ub97c \ud655\uc778\ud558\uc9c0 \ubabb\ud574 \uac74\ub108\ub6f0\uc5c8\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \ub9cc\ub4e4\uba74 \uc7ac\uc2dc\ub3c4\ud569\ub2c8\ub2e4." },
    adjacentRepeats: { other: "\ub2e4\ub978 \uc601\uc0c1\uc774 \ubd80\uc871\ud574\uc11c \ucef7 {count}\uacf3\uc774 \uac19\uc740 \ud074\ub9bd\uc758 \ub450 \uc0f7\uc744 \uc774\uc5b4 \ubd99\uc600\uc2b5\ub2c8\ub2e4. \ucef7\uc73c\ub85c \ubcf4\uc774\uc9c0 \uc54a\uc744 \uc218 \uc788\uc2b5\ub2c8\ub2e4. \ud074\ub9bd\uc774\ub098 \uc0ac\uc9c4\uc744 \ub354 \ucd94\uac00\ud558\uba74 \ud53c\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4." },
    startFailed: "City Weekend Vlog\ub97c \uc2dc\uc791\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}. \ubb38\uc81c\uac00 \uacc4\uc18d\ub418\uba74 \ud50c\ub7ec\uadf8\uc778\uc744 \ub2e4\uc2dc \uc124\uce58\ud558\uc138\uc694.",
    foldersNotFound: "\ud50c\ub7ec\uadf8\uc778 \ud3f4\ub354\ub97c \ucc3e\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4",
    adapterNeeded: "\uc774 Selects \ube4c\ub4dc\uc5d0\ub294 \uc5c5\ub370\uc774\ud2b8\ub41c {name} \uc5b4\ub311\ud130\uac00 \ud544\uc694\ud569\ub2c8\ub2e4.",
    stepFailed: "Selects\uac00 \uc774 \ub2e8\uacc4\ub97c \uc644\ub8cc\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.",
    musicFixedRhythm: "\uc74c\uc545\uc744 \ucd94\uac00\ud588\uc2b5\ub2c8\ub2e4. \ube44\ud2b8\ub97c \ud655\uc2e4\ud558\uac8c \ucc3e\uc9c0 \ubabb\ud574 \ucef7\uc740 \uc6d0\ub798 \ub9ac\ub4ec\uc744 \uc0ac\uc6a9\ud569\ub2c8\ub2e4.",
    musicFixedRhythmDetail: "\uc74c\uc545\uc744 \ucd94\uac00\ud588\uc2b5\ub2c8\ub2e4. \ucef7\uc740 \uc6d0\ub798 \ub9ac\ub4ec\uc744 \uc0ac\uc6a9\ud569\ub2c8\ub2e4({detail}).",
    musicUnreadable: "\uc774 \uc74c\uc545 \ud30c\uc77c\uc744 \uc77d\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4({detail}). \ub2e4\ub978 \ud30c\uc77c\uc774\ub098 \uc81c\uacf5\ub41c \ud2b8\ub799\uc744 \uc120\ud0dd\ud558\uc138\uc694.",
    beatFailed: "\ube44\ud2b8 \uac10\uc9c0\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4",
    previewFailed: "\ubbf8\ub9ac\ub4e3\uae30\ub97c \uc7ac\uc0dd\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}.",
    previewNotCut: "\ubbf8\ub9ac\ub4e3\uae30 \uad6c\uac04\uc744 \uc798\ub77c\ub0b4\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4",
    noAudio: "\uc624\ub514\uc624\uac00 \ub3cc\uc544\uc624\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4",
    dropMusic: "\uc74c\uc545 \ud30c\uc77c\uc744 \ub04c\uc5b4\ub2e4 \ub193\uac70\ub098 \uc81c\uacf5\ub41c \ud2b8\ub799\uc744 \uc120\ud0dd\ud558\uc138\uc694.",
    musicLengthUnread: "\uc74c\uc545\uc758 \uae38\uc774\ub97c \uc77d\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. \ub2e4\ub978 \ud30c\uc77c\uc774\ub098 \uc81c\uacf5\ub41c \ud2b8\ub799\uc744 \uc120\ud0dd\ud558\uc138\uc694.",
    sectionTooShort: "\uc774 \uc74c\uc545 \uad6c\uac04\uc740 \uc601\uc0c1\uc5d0 \ube44\ud574 \ub108\ubb34 \uc9e7\uc2b5\ub2c8\ub2e4. \uad6c\uac04\uc744 \uc55e\ucabd\uc73c\ub85c \uc62e\uae30\uac70\ub098 \ub354 \uc9e7\uc740 \uae38\uc774\ub97c \uc120\ud0dd\ud558\uc138\uc694.",
    foundShots: { other: "\uc4f8 \uc218 \uc788\ub294 \uc0f7\uc744 {count}\uac1c \ucc3e\uc558\uc2b5\ub2c8\ub2e4. \uc774 \uc2a4\ud0c0\uc77c\uc5d0\ub294 \ucd5c\uc18c {needed}\uac1c\uac00 \ud544\uc694\ud569\ub2c8\ub2e4." },
    foundShotsPhotos: { other: "\uc4f8 \uc218 \uc788\ub294 \uc0f7\uc744 {count}\uac1c(\uadf8\uc911 \uc0ac\uc9c4 {photos}\uc7a5) \ucc3e\uc558\uc2b5\ub2c8\ub2e4. \uc774 \uc2a4\ud0c0\uc77c\uc5d0\ub294 \ucd5c\uc18c {needed}\uac1c\uac00 \ud544\uc694\ud569\ub2c8\ub2e4." },
    addFootage: "\ub354 \ub2e4\uc591\ud55c \uc601\uc0c1\uc744 \ucd94\uac00\ud558\uac70\ub098 \ud074\ub9bd\uc744 \ub354 \uc120\ud0dd\ud558\uc138\uc694.",
    addFootagePhotos: "\ub354 \ub2e4\uc591\ud55c \uc601\uc0c1\uc774\ub098 \uc0ac\uc9c4\uc744 \ucd94\uac00\ud558\uac70\ub098 \ud074\ub9bd\uc744 \ub354 \uc120\ud0dd\ud558\uc138\uc694.",
    retryUnchecked: { other: "\ud074\ub9bd {count}\uac1c\ub97c \ud655\uc778\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. ‘\ub9cc\ub4e4\uae30’\ub97c \ub204\ub974\uba74 \uc7ac\uc2dc\ub3c4\ud569\ub2c8\ub2e4." },
    draftNoId: "Draft “{name}”\uc740(\ub294) \uc800\uc7a5\ub418\uc5c8\uc9c0\ub9cc Selects\uac00 ID\ub97c \uc54c\ub824\uc8fc\uc9c0 \uc54a\uc544 \ud0c0\uc774\ud2c0\uacfc \uc0c9\uac10\uc744 \ucd94\uac00\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. Draft \ubaa9\ub85d\uc5d0\uc11c \uc5f4\uac70\ub098 \ub2e4\uc2dc \ub9cc\ub4dc\uc138\uc694.",
    finishFailed: "Draft\ub294 \ub9cc\ub4e4\uc5c8\uc9c0\ub9cc \ub9c8\ubb34\ub9ac(\ud074\ub9bd \uc18c\ub9ac, \ud0c0\uc774\ud2c0, \uc0c9\uac10)\ub97c \ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}. ‘\ud0c0\uc774\ud2c0\uacfc \uc0c9\uac10 \ub9c8\ubb34\ub9ac’\ub97c \ub20c\ub7ec \ub2e4\uc2dc \uc2dc\ub3c4\ud558\uc138\uc694.",
    openFailed: "Draft\ub294 \uc900\ube44\ub418\uc5c8\uc9c0\ub9cc \uc5f4\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}. \uc544\ub798 \ub9c1\ud06c\ub97c \uc4f0\uac70\ub098 Draft \ubaa9\ub85d\uc5d0\uc11c \uc5ec\uc138\uc694.",
    "param.font": "\uba54\uc778 \ud3f0\ud2b8(\uc120\ud0dd)",
    "param.color": "\ud0c0\uc774\ud2c0 \uc0c9",
    "param.shadow": "\uadf8\ub9bc\uc790",
    "param.size": "\ud06c\uae30",
    "param.tilt": "\uae30\uc6b8\uae30",
    "param.height": "\ub192\uc774(%)",
    "param.motion": "\ubaa8\uc158",
    "param.motionStrength": "\ubaa8\uc158 \uac15\ub3c4",
    "param.warmth": "\ub530\ub73b\ud568",
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
    openProject: "Abra um projeto para criar um City Weekend Vlog.",
    refresh: "Atualizar",
    refreshing: "Atualizando",
    refreshFailed: "Não foi possível atualizar a lista de clipes: {detail}",
    readFailed: "Não foi possível ler os clipes deste projeto: {detail}",
    checkingClipsNow: "Verificando clipes…",
    checkingClips: "Verificando clipes",
    listening: "Procurando a batida",
    working: "Trabalhando",
    noFootage: "Este projeto ainda não tem vídeos analisados nem fotos. Adicione clipes de vídeo e analise-os, ou adicione fotos; a lista é atualizada automaticamente.",
    turnOnPhotos: "Ative “Usar fotos” em “Avançado” para criar com as fotos deste projeto.",
    noClipsSelected: "Nenhum clipe selecionado. Escolha clipes em “Avançado”.",
    onlyPhotos: { one: "Apenas {count} foto e nenhum vídeo analisado: este estilo precisa de pelo menos {needed} planos. Adicione fotos ou clipes de vídeo.", many: "Apenas {count} de fotos e nenhum vídeo analisado: este estilo precisa de pelo menos {needed} planos. Adicione fotos ou clipes de vídeo.", other: "Apenas {count} fotos e nenhum vídeo analisado: este estilo precisa de pelo menos {needed} planos. Adicione fotos ou clipes de vídeo." },
    gap: " ",
    ready: "Pronto: {summary}",
    clips: { one: "{count} clipe", many: "{count} de clipes", other: "{count} clipes" },
    clipsSelected: { one: "{selected} de {count} clipe selecionado", many: "{selected} de {count} de clipes selecionados", other: "{selected} de {count} clipes selecionados" },
    photos: { one: "{count} foto", many: "{count} de fotos", other: "{count} fotos" },
    photosSelected: { one: "{selected} de {count} foto selecionada", many: "{selected} de {count} de fotos selecionadas", other: "{selected} de {count} fotos selecionadas" },
    fitsShots: { one: "o material rende {count} plano de montagem", many: "o material rende {count} de planos de montagem", other: "o material rende {count} planos de montagem" },
    aboutSeconds: "cerca de {seconds} s",
    notAnalysed: { one: "{count} clipe ainda não analisado", many: "{count} de clipes ainda não analisados", other: "{count} clipes ainda não analisados" },
    analysing: { one: "{count} clipe está sendo analisado. Isto se atualiza sozinho quando terminar.", many: "{count} de clipes estão sendo analisados. Isto se atualiza sozinho quando terminarem.", other: "{count} clipes estão sendo analisados. Isto se atualiza sozinho quando terminarem." },
    notAnalysedAnalyse: { one: "{count} clipe ainda não foi analisado. Analise-o no Selects para usá-lo aqui.", many: "{count} de clipes ainda não foram analisados. Analise-os no Selects para usá-los aqui.", other: "{count} clipes ainda não foram analisados. Analise-os no Selects para usá-los aqui." },
    notAnalysedMaybe: { one: "{count} clipe ainda não foi analisado. Se o Selects estiver analisando, isto se atualiza sozinho.", many: "{count} de clipes ainda não foram analisados. Se o Selects estiver analisando, isto se atualiza sozinho.", other: "{count} clipes ainda não foram analisados. Se o Selects estiver analisando, isto se atualiza sozinho." },
    analysisFailed: { one: "Não foi possível analisar {count} clipe.", many: "Não foi possível analisar {count} de clipes.", other: "Não foi possível analisar {count} clipes." },
    noteAnalysing: { one: "{count} clipe em análise", many: "{count} de clipes em análise", other: "{count} clipes em análise" },
    noteFailed: { one: "{count} clipe não pôde ser analisado", many: "{count} de clipes não puderam ser analisados", other: "{count} clipes não puderam ser analisados" },
    title: "Título",
    firstLine: "Primeira linha",
    connector: "Conector",
    place: "Lugar",
    titlePreview: "Prévia do título",
    fontStyle: "Estilo de fonte",
    "preset.classic": "Clássico",
    "preset.romantic": "Romântico",
    "preset.retro-diner": "Diner retrô",
    "preset.travel-journal": "Diário de viagem",
    "preset.editorial": "Editorial",
    music: "Música",
    track: "Faixa",
    ownMusic: "Sua própria música",
    noMusic: "Sem música",
    faintTiming: "Sincronia aproximada no andamento detectado ({bpm} BPM): o andamento foi encontrado, mas a batida é fraca, então os cortes podem não coincidir.",
    installTools: "Instale o ffmpeg e o Node.js 18+ para ouvir a música ou usar sua própria faixa.",
    sectionHint: "Trecho da música: arraste para escolher",
    sectionLabel: "Trecho da música",
    musicTooShort: "Esta música é curta demais para esta duração",
    startsAt: "Começa em {seconds} s",
    stopPreview: "Parar a prévia",
    cancelPreview: "Cancelar a prévia",
    previewSection: "Ouvir este trecho",
    readingMusic: "Lendo a música…",
    musicLengthUnknown: "A duração desta música é desconhecida",
    advanced: "Avançado",
    length: "Duração",
    "length.short": "Curta",
    "length.standard": "Padrão",
    "length.long": "Longa",
    clipSound: "Som dos clipes",
    "sound.off": "Desligado",
    "sound.ambient": "Ambiente",
    "sound.full": "Total",
    warmLook: "Look quente",
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
    clipsChecked: { one: "{done}/{count} clipe verificado", many: "{done}/{count} de clipes verificados", other: "{done}/{count} clipes verificados" },
    stoppedAt: "Parou na etapa {step}/{total}, {name}: {detail}",
    build: "Criar",
    building: "Criando",
    anotherVersion: "Criar outra versão",
    finishTitle: "Concluir título e look",
    draftCreated: "Draft criado. Selecione o título para editar o texto ou a fonte, um clipe para ajustar o enquadramento, o calor ou o nível de som, e a música para mudar o volume. Mover cortes dentro do título não move o título; criar de novo gera um novo Draft e não mantém as edições feitas no Inspetor.",
    draftCreatedAdding: "Draft criado; adicionando título e look…",
    openDraft: "Abrir o novo Draft",
    copyLink: "Copiar o link do novo Draft",
    shortened: { one: "Seu material rende {count} plano de montagem, então este vídeo tem cerca de {seconds} s em vez de {fullSeconds} s. Adicione mais clipes para a duração completa.", many: "Seu material rende {count} de planos de montagem, então este vídeo tem cerca de {seconds} s em vez de {fullSeconds} s. Adicione mais clipes para a duração completa.", other: "Seu material rende {count} planos de montagem, então este vídeo tem cerca de {seconds} s em vez de {fullSeconds} s. Adicione mais clipes para a duração completa." },
    note: "Observação: {detail}.",
    unchecked: { one: "Não foi possível verificar {count} clipe, que foi ignorado. Crie de novo para tentar outra vez.", many: "Não foi possível verificar {count} de clipes, que foram ignorados. Crie de novo para tentar outra vez.", other: "Não foi possível verificar {count} clipes, que foram ignorados. Crie de novo para tentar outra vez." },
    adjacentRepeats: { one: "{count} corte une dois planos do mesmo clipe porque não havia material diferente suficiente, então pode não parecer um corte. Adicione mais clipes ou fotos para evitar isso.", many: "{count} de cortes unem dois planos do mesmo clipe porque não havia material diferente suficiente, então podem não parecer cortes. Adicione mais clipes ou fotos para evitar isso.", other: "{count} cortes unem dois planos do mesmo clipe porque não havia material diferente suficiente, então podem não parecer cortes. Adicione mais clipes ou fotos para evitar isso." },
    startFailed: "Não foi possível iniciar o City Weekend Vlog: {detail}. Reinstale o plugin se o problema continuar.",
    foldersNotFound: "as pastas do plugin não foram encontradas",
    adapterNeeded: "Esta versão do Selects precisa de um adaptador {name} atualizado.",
    stepFailed: "O Selects não conseguiu concluir esta etapa.",
    musicFixedRhythm: "Música adicionada; os cortes usam o ritmo original porque a batida não pôde ser detectada com segurança.",
    musicFixedRhythmDetail: "Música adicionada; os cortes usam o ritmo original ({detail}).",
    musicUnreadable: "Não foi possível ler este arquivo de música ({detail}). Escolha outro arquivo ou uma das faixas.",
    beatFailed: "a detecção da batida falhou",
    previewFailed: "Não foi possível reproduzir a prévia: {detail}.",
    previewNotCut: "não foi possível recortar a prévia",
    noAudio: "nenhum áudio foi retornado",
    dropMusic: "Solte um arquivo de música ou escolha uma das faixas.",
    musicLengthUnread: "Não foi possível ler a duração da sua música. Escolha outro arquivo ou uma das faixas.",
    sectionTooShort: "Este trecho da música é curto demais para o vídeo. Mova o trecho para mais cedo ou escolha uma duração menor.",
    foundShots: { one: "Foi encontrado {count} plano utilizável; este estilo precisa de pelo menos {needed}.", many: "Foram encontrados {count} de planos utilizáveis; este estilo precisa de pelo menos {needed}.", other: "Foram encontrados {count} planos utilizáveis; este estilo precisa de pelo menos {needed}." },
    foundShotsPhotos: { one: "Foi encontrado {count} plano utilizável (fotos: {photos}); este estilo precisa de pelo menos {needed}.", many: "Foram encontrados {count} de planos utilizáveis (fotos: {photos}); este estilo precisa de pelo menos {needed}.", other: "Foram encontrados {count} planos utilizáveis (fotos: {photos}); este estilo precisa de pelo menos {needed}." },
    addFootage: "Adicione material mais variado ou selecione mais clipes.",
    addFootagePhotos: "Adicione material mais variado ou fotos, ou selecione mais clipes.",
    retryUnchecked: { one: "Não foi possível verificar {count} clipe; pressione “Criar” para tentar de novo.", many: "Não foi possível verificar {count} de clipes; pressione “Criar” para tentar de novo.", other: "Não foi possível verificar {count} clipes; pressione “Criar” para tentar de novo." },
    draftNoId: "O Draft “{name}” foi salvo, mas o Selects não informou o id dele, então o título e o look não puderam ser adicionados. Abra-o pela lista de Drafts ou crie de novo.",
    finishFailed: "O Draft foi criado, mas não pôde ser concluído (som dos clipes, título e look): {detail}. Pressione “Concluir título e look” para tentar de novo.",
    openFailed: "O Draft está pronto, mas não pôde ser aberto: {detail}. Use o link abaixo ou abra-o pela lista de Drafts.",
    "param.font": "Fonte principal (opcional)",
    "param.color": "Cor do título",
    "param.shadow": "Sombra",
    "param.size": "Tamanho",
    "param.tilt": "Inclinação",
    "param.height": "Altura (%)",
    "param.motion": "Movimento",
    "param.motionStrength": "Intensidade do movimento",
    "param.warmth": "Calor",
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
    openProject: "City Weekend Vlog oluşturmak için bir proje açın.",
    refresh: "Yenile",
    refreshing: "Yenileniyor",
    refreshFailed: "Klip listesi yenilenemedi: {detail}",
    readFailed: "Bu projedeki klipler okunamadı: {detail}",
    checkingClipsNow: "Klipler kontrol ediliyor…",
    checkingClips: "Klipler kontrol ediliyor",
    listening: "Ritim aranıyor",
    working: "Çalışıyor",
    noFootage: "Bu projede henüz analiz edilmiş video veya fotoğraf yok. Video klipleri ekleyip analiz edin ya da fotoğraf ekleyin; burası otomatik olarak güncellenir.",
    turnOnPhotos: "Bu projenin fotoğraflarından oluşturmak için “Gelişmiş” bölümünde “Fotoğrafları kullan” seçeneğini açın.",
    noClipsSelected: "Klip seçilmedi. “Gelişmiş” bölümünden klip seçin.",
    onlyPhotos: { one: "Yalnızca {count} fotoğraf var ve analiz edilmiş video yok: bu stil için en az {needed} çekim gerekir. Fotoğraf veya video klibi ekleyin.", other: "Yalnızca {count} fotoğraf var ve analiz edilmiş video yok: bu stil için en az {needed} çekim gerekir. Fotoğraf veya video klibi ekleyin." },
    gap: " ",
    ready: "Hazır: {summary}",
    clips: { one: "{count} klip", other: "{count} klip" },
    clipsSelected: { one: "{count} klipten {selected} tanesi seçili", other: "{count} klipten {selected} tanesi seçili" },
    photos: { one: "{count} fotoğraf", other: "{count} fotoğraf" },
    photosSelected: { one: "{count} fotoğraftan {selected} tanesi seçili", other: "{count} fotoğraftan {selected} tanesi seçili" },
    fitsShots: { one: "görüntüler {count} montaj çekimine yetiyor", other: "görüntüler {count} montaj çekimine yetiyor" },
    aboutSeconds: "yaklaşık {seconds} sn",
    notAnalysed: { one: "{count} klip henüz analiz edilmedi", other: "{count} klip henüz analiz edilmedi" },
    analysing: { one: "{count} klip analiz ediliyor. Bitince bu otomatik olarak güncellenir.", other: "{count} klip analiz ediliyor. Bitince bu otomatik olarak güncellenir." },
    notAnalysedAnalyse: { one: "{count} klip henüz analiz edilmedi. Burada kullanmak için Selects'te analiz edin.", other: "{count} klip henüz analiz edilmedi. Burada kullanmak için Selects'te analiz edin." },
    notAnalysedMaybe: { one: "{count} klip henüz analiz edilmedi. Selects analiz ediyorsa bu otomatik olarak güncellenir.", other: "{count} klip henüz analiz edilmedi. Selects analiz ediyorsa bu otomatik olarak güncellenir." },
    analysisFailed: { one: "{count} klip analiz edilemedi.", other: "{count} klip analiz edilemedi." },
    noteAnalysing: { one: "{count} klip analiz ediliyor", other: "{count} klip analiz ediliyor" },
    noteFailed: { one: "{count} klip analiz edilemedi", other: "{count} klip analiz edilemedi" },
    title: "Başlık",
    firstLine: "İlk satır",
    connector: "Bağlaç",
    place: "Yer",
    titlePreview: "Başlık önizlemesi",
    fontStyle: "Yazı tipi stili",
    "preset.classic": "Klasik",
    "preset.romantic": "Romantik",
    "preset.retro-diner": "Retro Diner",
    "preset.travel-journal": "Seyahat Günlüğü",
    "preset.editorial": "Editoryal",
    music: "Müzik",
    track: "Parça",
    ownMusic: "Kendi müziğiniz",
    noMusic: "Müzik yok",
    faintTiming: "Algılanan tempoya ({bpm} BPM) göre yaklaşık zamanlama: tempo bulundu ama ritim zayıf, bu yüzden kesmeler ritmi kaçırabilir.",
    installTools: "Müziği önizlemek veya kendi parçanızı kullanmak için ffmpeg ve Node.js 18+ yükleyin.",
    sectionHint: "Müzik bölümü — seçmek için sürükleyin",
    sectionLabel: "Müzik bölümü",
    musicTooShort: "Bu müzik bu uzunluk için çok kısa",
    startsAt: "{seconds} sn'de başlar",
    stopPreview: "Önizlemeyi durdur",
    cancelPreview: "Önizlemeyi iptal et",
    previewSection: "Bu bölümü önizle",
    readingMusic: "Müzik okunuyor…",
    musicLengthUnknown: "Bu müziğin uzunluğu bilinmiyor",
    advanced: "Gelişmiş",
    length: "Uzunluk",
    "length.short": "Kısa",
    "length.standard": "Standart",
    "length.long": "Uzun",
    clipSound: "Klip sesi",
    "sound.off": "Kapalı",
    "sound.ambient": "Ortam",
    "sound.full": "Tam",
    warmLook: "Sıcak görünüm",
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
    clipsChecked: { one: "{done}/{count} klip kontrol edildi", other: "{done}/{count} klip kontrol edildi" },
    stoppedAt: "{step}/{total}. adımda durdu, {name}: {detail}",
    build: "Oluştur",
    building: "Oluşturuluyor",
    anotherVersion: "Başka bir sürüm oluştur",
    finishTitle: "Başlığı ve görünümü tamamla",
    draftCreated: "Draft oluşturuldu. Metnini veya yazı tipini düzenlemek için başlığı, kırpmasını, sıcaklığını veya ses düzeyini ayarlamak için bir klibi, ses düzeyini değiştirmek için müziği seçin. Başlığın içindeki kesmeleri taşımak başlığı taşımaz; yeniden oluşturmak yeni bir Draft üretir ve Denetçi'de yapılan düzenlemeleri korumaz.",
    draftCreatedAdding: "Draft oluşturuldu; başlık ve görünüm ekleniyor…",
    openDraft: "Yeni Draft'ı aç",
    copyLink: "Yeni Draft'ın bağlantısını kopyala",
    shortened: { one: "Görüntüleriniz {count} montaj çekimine yetiyor, bu yüzden bu video {fullSeconds} sn yerine yaklaşık {seconds} sn sürüyor. Tam uzunluk için daha fazla klip ekleyin.", other: "Görüntüleriniz {count} montaj çekimine yetiyor, bu yüzden bu video {fullSeconds} sn yerine yaklaşık {seconds} sn sürüyor. Tam uzunluk için daha fazla klip ekleyin." },
    note: "Not: {detail}.",
    unchecked: { one: "{count} klip kontrol edilemedi ve atlandı. Yeniden denemek için tekrar oluşturun.", other: "{count} klip kontrol edilemedi ve atlandı. Yeniden denemek için tekrar oluşturun." },
    adjacentRepeats: { one: "Yeterli başka görüntü olmadığı için {count} kesme aynı klipten iki çekimi birleştiriyor; kesme gibi görünmeyebilir. Bunu önlemek için daha fazla klip veya fotoğraf ekleyin.", other: "Yeterli başka görüntü olmadığı için {count} kesme aynı klipten iki çekimi birleştiriyor; kesme gibi görünmeyebilirler. Bunu önlemek için daha fazla klip veya fotoğraf ekleyin." },
    startFailed: "City Weekend Vlog başlatılamadı: {detail}. Sorun sürerse eklentiyi yeniden yükleyin.",
    foldersNotFound: "eklenti klasörleri bulunamadı",
    adapterNeeded: "Bu Selects sürümü güncel bir {name} bağdaştırıcısı gerektiriyor.",
    stepFailed: "Selects bu adımı tamamlayamadı.",
    musicFixedRhythm: "Müzik eklendi; ritmi güvenilir biçimde bulunamadığı için kesmeler özgün ritmi kullanıyor.",
    musicFixedRhythmDetail: "Müzik eklendi; kesmeler özgün ritmi kullanıyor ({detail}).",
    musicUnreadable: "Bu müzik dosyası okunamadı ({detail}). Başka bir dosya veya hazır parçalardan birini seçin.",
    beatFailed: "ritim algılama başarısız oldu",
    previewFailed: "Önizleme oynatılamadı: {detail}.",
    previewNotCut: "önizleme kesilemedi",
    noAudio: "ses geri gelmedi",
    dropMusic: "Bir müzik dosyası bırakın veya hazır parçalardan birini seçin.",
    musicLengthUnread: "Müziğinizin uzunluğu okunamadı. Başka bir dosya veya hazır parçalardan birini seçin.",
    sectionTooShort: "Bu müzik bölümü video için çok kısa. Bölümü daha öne alın veya daha kısa bir uzunluk seçin.",
    foundShots: { one: "Kullanılabilir {count} çekim bulundu; bu stil için en az {needed} gerekir.", other: "Kullanılabilir {count} çekim bulundu; bu stil için en az {needed} gerekir." },
    foundShotsPhotos: { one: "Kullanılabilir {count} çekim bulundu ({photos} tanesi fotoğraf); bu stil için en az {needed} gerekir.", other: "Kullanılabilir {count} çekim bulundu ({photos} tanesi fotoğraf); bu stil için en az {needed} gerekir." },
    addFootage: "Daha çeşitli görüntüler ekleyin veya daha fazla klip seçin.",
    addFootagePhotos: "Daha çeşitli görüntüler veya fotoğraflar ekleyin ya da daha fazla klip seçin.",
    retryUnchecked: { one: "{count} klip kontrol edilemedi; yeniden denemek için “Oluştur”a basın.", other: "{count} klip kontrol edilemedi; yeniden denemek için “Oluştur”a basın." },
    draftNoId: "“{name}” adlı Draft kaydedildi ama Selects kimliğini bildirmedi, bu yüzden başlık ve görünüm eklenemedi. Draft listesinden açın veya yeniden oluşturun.",
    finishFailed: "Draft oluşturuldu ama tamamlanamadı (klip sesi, başlık ve görünüm): {detail}. Yeniden denemek için “Başlığı ve görünümü tamamla”ya basın.",
    openFailed: "Draft hazır ama açılamadı: {detail}. Aşağıdaki bağlantıyı kullanın veya Draft listesinden açın.",
    "param.font": "Ana yazı tipi (isteğe bağlı)",
    "param.color": "Başlık rengi",
    "param.shadow": "Gölge",
    "param.size": "Boyut",
    "param.tilt": "Eğim",
    "param.height": "Yükseklik (%)",
    "param.motion": "Hareket",
    "param.motionStrength": "Hareket gücü",
    "param.warmth": "Sıcaklık",
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
    openProject: "请先打开一个项目，再制作 City Weekend Vlog。",
    refresh: "刷新",
    refreshing: "正在刷新",
    refreshFailed: "无法刷新片段列表：{detail}",
    readFailed: "无法读取此项目中的片段：{detail}",
    checkingClipsNow: "正在检查片段…",
    checkingClips: "正在检查片段",
    listening: "正在识别节拍",
    working: "处理中",
    noFootage: "此项目中还没有已分析的视频或照片。请添加视频片段并进行分析，或添加照片；这里会自动更新。",
    turnOnPhotos: "请在“高级”中开启“使用照片”，即可用此项目的照片制作。",
    noClipsSelected: "未选择片段。请在“高级”中选择片段。",
    onlyPhotos: { other: "只有 {count} 张照片，没有已分析的视频：此风格至少需要 {needed} 个镜头。请添加照片或视频片段。" },
    gap: "",
    ready: "已就绪：{summary}",
    clips: { other: "{count} 个片段" },
    clipsSelected: { other: "已选 {selected}/{count} 个片段" },
    photos: { other: "{count} 张照片" },
    photosSelected: { other: "已选 {selected}/{count} 张照片" },
    fitsShots: { other: "素材可支持 {count} 个蒙太奇镜头" },
    aboutSeconds: "约 {seconds} 秒",
    notAnalysed: { other: "{count} 个片段尚未分析" },
    analysing: { other: "正在分析 {count} 个片段。分析完成后会自动更新。" },
    notAnalysedAnalyse: { other: "有 {count} 个片段尚未分析。请在 Selects 中分析后再在这里使用。" },
    notAnalysedMaybe: { other: "有 {count} 个片段尚未分析。如果 Selects 正在分析，这里会自动更新。" },
    analysisFailed: { other: "有 {count} 个片段无法分析。" },
    noteAnalysing: { other: "{count} 个片段分析中" },
    noteFailed: { other: "{count} 个片段无法分析" },
    title: "标题",
    firstLine: "第一行",
    connector: "连接词",
    place: "地点",
    titlePreview: "标题预览",
    fontStyle: "字体风格",
    "preset.classic": "经典",
    "preset.romantic": "浪漫",
    "preset.retro-diner": "复古餐厅",
    "preset.travel-journal": "旅行手账",
    "preset.editorial": "杂志风",
    music: "音乐",
    track: "曲目",
    ownMusic: "自己的音乐",
    noMusic: "无音乐",
    faintTiming: "按识别到的速度（{bpm} BPM）大致对齐：已找到速度，但节拍较弱，剪切点可能对不上。",
    installTools: "请安装 ffmpeg 和 Node.js 18+，才能试听音乐或使用自己的曲目。",
    sectionHint: "音乐片段 — 拖动选择",
    sectionLabel: "音乐片段",
    musicTooShort: "这段音乐太短，不够这个时长",
    startsAt: "从 {seconds} 秒开始",
    stopPreview: "停止试听",
    cancelPreview: "取消试听",
    previewSection: "试听这一段",
    readingMusic: "正在读取音乐…",
    musicLengthUnknown: "无法得知这段音乐的时长",
    advanced: "高级",
    length: "时长",
    "length.short": "短",
    "length.standard": "标准",
    "length.long": "长",
    clipSound: "片段原声",
    "sound.off": "关闭",
    "sound.ambient": "环境音",
    "sound.full": "原音量",
    warmLook: "暖色调",
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
    clipsChecked: { other: "已检查 {done}/{count} 个片段" },
    stoppedAt: "在第 {step}/{total} 步（{name}）停止：{detail}",
    build: "生成",
    building: "正在生成",
    anotherVersion: "再生成一个版本",
    finishTitle: "完成标题和色调",
    draftCreated: "Draft 已创建。选中标题可编辑文字或字体，选中片段可调整裁剪、暖度或音量，选中音乐可更改音量。在标题范围内移动剪切点不会移动标题；重新生成会创建新的 Draft，且不会保留在检查器中所做的修改。",
    draftCreatedAdding: "Draft 已创建；正在添加标题和色调…",
    openDraft: "打开新的 Draft",
    copyLink: "复制新 Draft 的链接",
    shortened: { other: "你的素材可支持 {count} 个蒙太奇镜头，因此这个视频约 {seconds} 秒，而不是 {fullSeconds} 秒。添加更多片段即可达到完整时长。" },
    note: "提示：{detail}。",
    unchecked: { other: "有 {count} 个片段无法检查，已跳过。再次生成可重试。" },
    adjacentRepeats: { other: "由于其他素材不足，有 {count} 处剪切连接的是同一片段的两个镜头，看起来可能不像剪切。添加更多片段或照片可避免这种情况。" },
    startFailed: "City Weekend Vlog 无法启动：{detail}。如果问题持续，请重新安装插件。",
    foldersNotFound: "找不到插件文件夹",
    adapterNeeded: "此版本的 Selects 需要更新的 {name} 适配器。",
    stepFailed: "Selects 无法完成这一步。",
    musicFixedRhythm: "音乐已添加；由于无法可靠识别其节拍，剪切将使用原始节奏。",
    musicFixedRhythmDetail: "音乐已添加；剪切将使用原始节奏（{detail}）。",
    musicUnreadable: "无法读取这个音乐文件（{detail}）。请选择其他文件或内置曲目。",
    beatFailed: "节拍识别失败",
    previewFailed: "无法播放试听：{detail}。",
    previewNotCut: "无法截取试听片段",
    noAudio: "没有返回音频",
    dropMusic: "请拖入一个音乐文件，或选择内置曲目。",
    musicLengthUnread: "无法读取你的音乐时长。请选择其他文件或内置曲目。",
    sectionTooShort: "这段音乐对视频来说太短。请把片段往前移，或选择更短的时长。",
    foundShots: { other: "找到 {count} 个可用镜头；此风格至少需要 {needed} 个。" },
    foundShotsPhotos: { other: "找到 {count} 个可用镜头（其中 {photos} 个是照片）；此风格至少需要 {needed} 个。" },
    addFootage: "请添加更多样的素材，或选择更多片段。",
    addFootagePhotos: "请添加更多样的素材或照片，或选择更多片段。",
    retryUnchecked: { other: "有 {count} 个片段无法检查；点击“生成”重试。" },
    draftNoId: "Draft“{name}”已保存，但 Selects 没有返回它的 ID，因此无法添加标题和色调。请从 Draft 列表中打开它，或重新生成。",
    finishFailed: "Draft 已创建，但未能完成（片段原声、标题和色调）：{detail}。点击“完成标题和色调”重试。",
    openFailed: "Draft 已就绪，但无法打开：{detail}。请使用下方链接，或从 Draft 列表中打开。",
    "param.font": "主字体（可选）",
    "param.color": "标题颜色",
    "param.shadow": "阴影",
    "param.size": "大小",
    "param.tilt": "倾斜",
    "param.height": "高度（%）",
    "param.motion": "运动",
    "param.motionStrength": "运动强度",
    "param.warmth": "暖度",
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
// An error whose text follows the UI language; `message` keeps the English text.
function uiError(say: Say) { const e: any = new Error(say("en")); e.say = say; return e; }
function sayError(lang: Lang, e: any): string { return typeof e?.say === "function" ? e.say(lang) : String(e?.message || e); }
const HANGUL_RE = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/;

const PLUGIN_ID = "city-weekend-vlog";
const SKILLS_DIR = "$SELECTS_USER_SKILLS_ROOT/" + PLUGIN_ID;
const DATA_DIR = "$HOME/.selects/plugin-data/" + PLUGIN_ID;
const CWV_QUERIES = {
  street: "busy city street with cars, taxis or people walking",
  architecture: "building facade architecture",
  landmark: "famous landmark or skyline",
  park: "green park, trees and lawn",
  detail: "close-up street detail, sign or storefront",
  wide: "wide open view of sky, lawn or skyline",
};
// Photo clips get the photo motion and the warm look. MP4 export renders both (checked on exported frames); only
// Draft.captureFrames fails on an image clip with an effect, and the panel never captures frames.
const PHOTO_EFFECTS = true;
// The Motion choices of a photo clip in the Inspector. These labels are the English defaults (headless build tools
// read this constant); a build writes STRINGS `motion.<value>` in the UI language.
const MOTION_OPTIONS = [
  { label: "Push in", value: "push-in" }, { label: "Pull out", value: "pull-out" },
  { label: "Drift left", value: "drift-left" }, { label: "Drift right", value: "drift-right" },
  { label: "Drift up", value: "drift-up" }, { label: "Drift down", value: "drift-down" },
  { label: "Tilt", value: "tilt" }, { label: "Push and drift", value: "push-drift" },
];
// Ambient clip sound: the clips' own sound sits this far under the music, which stays at 0 dB.
const AMBIENT_DB = -18;
// Music without onsets (No music, or a track that could not be analysed): the cuts stay on the grid.
const NO_ONSETS: any[] = [];
// Default in-video phrases (the weekday, "A day", "in") stay English in every UI language.
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// cwv-planner:start
// City Weekend Vlog planner. A plain script: panel.tsx embeds it verbatim and the tests load it in node:vm.
// Title: 8 beats (two bars), cut on 8th notes. Opening 1.5 + 1.5 + 1 beats (line 1, connector, place), then a fast
// run of landmark shots and a 1-beat wide hold. The run starts with a burst whose grain depends on the music:
// 'sixteenth' (four 0.25-beat shots) when the cue has a clear 16th-note pulse, 'eighth' (two 0.5-beat shots) otherwise,
// then four 0.5-beat shots. Both variants last 8 beats, so the montage always starts on a downbeat.
const CWV_TITLE_BEATS = [1.5, 1.5, 1, 0.25, 0.25, 0.25, 0.25, 0.5, 0.5, 0.5, 0.5, 1];
const CWV_TITLE_ROLES = ['street', 'architecture', 'street', 'landmark', 'landmark', 'landmark', 'landmark', 'landmark', 'landmark', 'landmark', 'landmark', 'wide'];
// Font state of the switching line from each title slot on; null before the place line exists. One A->B->C->D cycle
// over the burst, one over the 8th run, and the hold stays on A.
const CWV_FONT_STATES = [null, null, 'A', 'B', 'C', 'D', 'A', 'B', 'C', 'D', 'A', 'A'];
// The 'eighth' variant: the burst is two 0.5-beat shots (10 title slots). Its two shots switch to B and C; the 8th
// run keeps its B->C->D->A cycle, so the hold is on A in both variants.
const CWV_TITLE_BEATS_EIGHTH = [1.5, 1.5, 1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1];
const CWV_TITLE_ROLES_EIGHTH = ['street', 'architecture', 'street', 'landmark', 'landmark', 'landmark', 'landmark', 'landmark', 'landmark', 'wide'];
const CWV_FONT_STATES_EIGHTH = [null, null, 'A', 'B', 'C', 'B', 'C', 'D', 'A', 'A'];
// A cue supports the 16th burst when the median onset strength on its 16th offbeats (.25 and .75 of a beat) reaches
// this share of the median on-beat strength (manifest `sixteenthRatio`, measured by beat-detect.cjs).
const CWV_SIXTEENTH_MIN_RATIO = 0.35;
const CWV_MONTAGE_ROLES = ['architecture', 'park', 'street', 'detail'];
const CWV_MONTAGE_BEATS = 2;
const CWV_TITLE_TOTAL_BEATS = 8;
const CWV_LENGTHS = { short: 4, standard: 7, long: 12 };
const CWV_MIN_MONTAGE = 4;
const CWV_MAX_MONTAGE = 12;
// Fewest shots a build needs with the 16th burst (12 title + 4 montage); the 8th burst needs cwvMinWindows('eighth').
const CWV_MIN_WINDOWS = CWV_TITLE_BEATS.length + CWV_MIN_MONTAGE;
const CWV_LINE1_OFFSET_BEATS = 0.25;
const CWV_REFERENCE_BPM = 99.2;
// Scene-search hits collapse onto a few distinct times per clip, so every searched source also gets evenly spaced
// 'filler' candidates. They score below any real hit and are only used by the last tier, after photos.
const CWV_FILLER_STEP = 0.5;
const CWV_FILLER_EDGE = 0.25;
const CWV_FILLER_SCORE = -2;
// A video window ends at least this far before the end of its source: the Draft's real frame rate and the music
// offset can lengthen a shot by a frame after planning.
const CWV_SOURCE_TAIL = 0.05;
// Photos (Image resources) have no scene search. Each one fills at most one slot of any length up to the 5 s an
// image source lasts. About CWV_PHOTO_SHARE of the slots, evenly spread from a seeded offset (title included), are
// photo slots where an unused photo comes first. Elsewhere photos rank after every real video hit and before
// fillers, except in the title burst, where they rank right after the preferred roles. At most CWV_PHOTO_RUN_MAX
// photos play in a row while anything else fits.
const CWV_PHOTO_HOLD_MAX = 5;
const CWV_PHOTO_RUN_MAX = 2;
const CWV_PHOTO_SHARE = 1 / 3;

function cwvVideoBeats(montageShots) { return CWV_TITLE_TOTAL_BEATS + CWV_MONTAGE_BEATS * montageShots; }
function cwvVideoSeconds(bpm, montageShots) { return cwvVideoBeats(montageShots) * 60 / bpm; }

// The burst for a cue's 16th-onset ratio; an unknown ratio (no reliable grid) gets the calmer 'eighth'.
function cwvBurstFor(ratio) { return typeof ratio === 'number' && ratio >= CWV_SIXTEENTH_MIN_RATIO ? 'sixteenth' : 'eighth'; }
function cwvTitle(burst) {
  return burst === 'eighth' ? { beats: CWV_TITLE_BEATS_EIGHTH, roles: CWV_TITLE_ROLES_EIGHTH, fonts: CWV_FONT_STATES_EIGHTH }
    : { beats: CWV_TITLE_BEATS, roles: CWV_TITLE_ROLES, fonts: CWV_FONT_STATES };
}
function cwvMinWindows(burst) { return cwvTitle(burst).beats.length + CWV_MIN_MONTAGE; }

// Where the music's beats land on the timeline. Selects snaps the music's source start (sectionStart) to a timeline
// frame, so the music plays offset by delta = sectionStart - round(sectionStart * fps) / fps (at most half a frame);
// beat b of the section plays at b * 60 / bpm + delta. Without music there is no offset.
function cwvMusicOffset(sectionStart, fps) {
  return typeof sectionStart === 'number' && isFinite(sectionStart) && fps > 0 ? sectionStart - Math.round(sectionStart * fps) / fps : 0;
}

// Onset-anchored cuts (spec section 2). The cuts stay on the rhythm template's grid; a snappable cut moves onto a
// clearly strong music onset near it, and only when nothing already marks the grid position. Snappable: the first cut
// of the title burst (its anchor) and every cut that starts a slot of at least one beat (the title's opening cuts, the
// hold, the title -> montage cut and every montage cut). The burst's later cuts, and the cut that ends it, keep the
// template spacing from the anchor; the half-beat run after the burst and every other cut stay on the grid, so the
// first half-beat shot absorbs the anchor's shift.
// v2.6 (conservative snap; live Brooklyn Boom Bap cuts snapped 32-47 ms onto low-band onsets at 1.04-1.5 of their
// threshold and landed off the audible accent): a cut stays on the grid when a qualifying onset of any band lies within
// one frame of it; otherwise the candidate must reach CWV_SNAP_MIN_RATIO of its band threshold, candidates rank by
// ratio - CWV_SNAP_DISTANCE_COST * |offset| / window, and a low-band candidate must also beat the grid position's own
// onset (the strongest qualifying onset nearer the grid, else the band threshold, ratio 1) by CWV_SNAP_LOW_MARGIN.
const CWV_SNAP_WINDOW_BEATS = 0.10;          // search window: +/- this share of a beat ...
const CWV_SNAP_WINDOW_MAX = 0.070;           // ... capped at this many seconds
const CWV_SNAP_MIN_STRENGTH = 2;             // an onset's strength (over its band median) must reach max(this, band threshold)
const CWV_SNAP_MIN_RATIO = 1.5;              // a snap target's strength over that threshold (the bundled cues' far onsets reach 1.28)
const CWV_SNAP_DISTANCE_COST = 0.5;          // score = ratio - this * |offset| / window: an onset at the window edge loses 0.5
const CWV_SNAP_LOW_MARGIN = 0.25;            // a low-band target's ratio over the grid position's own onset ratio
const CWV_SNAP_MIN_FRAMES = 4;               // no snap may leave a shot shorter than this (or than its template, if shorter)
const CWV_SNAP_MIN_SHARE = 0.75;             // ... or shorter than this share of its template length
// Music whose beat was not found reliably (fixed shot lengths): only bass onsets, within a fixed window.
const CWV_SNAP_LOW_CONFIDENCE_WINDOW = 0.120;

// boundaries: the grid's cut times in seconds from the section start ([0, end of slot 0, ..., end of the last slot]).
// template: { beats: [each slot's length in beats], burstFrom, burstTo } where slots burstFrom..burstTo-1 are the
// title burst. onsets: [[seconds in the music source, band 'l' | 'm' | 'h', strength], ...].
// opts: { bpm, fps, sectionStart (the music second at the section start; onsets are shifted by it), thresholds?:
// { l, m, h }, lowConfidence?: true for fixed timing }. Returns { cuts: seconds like boundaries, frames: the cuts at
// opts.fps with the music offset (same expression as cwvSchedule and assemble.js), log: one entry per inner cut }.
// A snapped cut sits exactly on its onset, so rounding it to a frame at any rate never puts it more than half a frame
// before the onset. Frame counts for the minimum shot, and the one-frame "already on an onset" test, use opts.fps.
function cwvSnapCuts(boundaries, template, onsets, opts) {
  const fps = opts.fps, beat = 60 / opts.bpm, low = !!opts.lowConfidence;
  const offset = cwvMusicOffset(opts.sectionStart, fps);
  const frameOf = x => (x === 0 ? 0 : Math.round((x + offset) * fps));
  const reach = low ? CWV_SNAP_LOW_CONFIDENCE_WINDOW : Math.min(CWV_SNAP_WINDOW_BEATS * beat, CWV_SNAP_WINDOW_MAX);
  const bands = low ? ['l'] : ['l', 'm', 'h'];
  const thr = band => Math.max(CWV_SNAP_MIN_STRENGTH, (opts.thresholds && opts.thresholds[band]) || 0);
  const shift = typeof opts.sectionStart === 'number' && isFinite(opts.sectionStart) ? opts.sectionStart : 0;
  const list = (onsets || []).filter(o => o && isFinite(o[0]) && isFinite(o[2]) && o[2] >= thr(o[1]))
    .map(o => ({ x: o[0] - shift, band: o[1], strength: o[2], ratio: o[2] / thr(o[1]) }));
  const n = boundaries.length - 1, beats = template.beats || [];
  const from = template.burstFrom, to = template.burstTo;
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
      if (o.ratio < CWV_SNAP_MIN_RATIO - 1e-9) continue;
      if (o.band === 'l') {
        // The grid position's own onset: the strongest qualifying onset nearer the grid (ratio 1 = the threshold when
        // there is none, since a weaker one would not be listed).
        const own = near.reduce((m, q) => (q.d < o.d - 1e-9 && q.ratio > m ? q.ratio : m), 1);
        if (o.ratio < own + CWV_SNAP_LOW_MARGIN - 1e-9) { why = 'low onset not above the grid'; continue; }
      }
      const score = o.ratio - CWV_SNAP_DISTANCE_COST * o.d / reach;
      if (!best || score > best.score + 1e-9 || (Math.abs(score - best.score) <= 1e-9 && (o.d < best.d - 1e-9 || (Math.abs(o.d - best.d) <= 1e-9 && o.x < best.x)))) best = { ...o, score };
    }
    return best || { none: why };
  };
  // The first shot in [a, b) that a snap would make too short, or null.
  const tooShort = (next, a, b) => {
    for (let k = Math.max(0, a); k <= Math.min(n - 1, b); k++) {
      const frames = frameOf(next[k + 1]) - frameOf(next[k]), grid = frameOf(boundaries[k + 1]) - frameOf(boundaries[k]);
      if (frames < Math.min(CWV_SNAP_MIN_FRAMES, grid)) return { slot: k, reason: 'min-frames' };
      if (next[k + 1] - next[k] < CWV_SNAP_MIN_SHARE * (boundaries[k + 1] - boundaries[k]) - 1e-9) return { slot: k, reason: 'min-share' };
    }
    return null;
  };
  for (let i = 1; i < n; i++) {
    const g = boundaries[i];
    const anchor = i === from, chained = i > from && i <= to;
    if (chained) {
      // Template spacing from the anchor, but only when the anchor's snap changed its frame: a sub-frame move leaves the
      // burst on the grid, so it cannot shift a later burst cut by a frame on its own.
      const relaid = frameOf(cuts[from]) !== frameOf(boundaries[from]);
      cuts[i] = relaid ? cuts[from] + (g - boundaries[from]) : g;
      log.push({ index: i, kind: 'burst', grid: g, seconds: cuts[i], shiftMs: Math.round((cuts[i] - g) * 1e4) / 10, reason: relaid ? 'from anchor' : 'grid (anchor frame unchanged)' });
      continue;
    }
    if (!anchor && !(beats[i] >= 1)) { log.push({ index: i, kind: 'grid', grid: g, seconds: g, shiftMs: 0, reason: 'grid' }); continue; }
    const kind = anchor ? 'anchor' : 'beat';
    const o = pick(g);
    if (o.none) { log.push({ index: i, kind, grid: g, seconds: g, shiftMs: 0, reason: o.none }); continue; }
    const next = cuts.slice();
    next[i] = o.x;
    if (anchor && frameOf(o.x) !== frameOf(g)) for (let k = from + 1; k <= to; k++) next[k] = o.x + (boundaries[k] - g);
    const bad = tooShort(next, i - 1, anchor ? to : i);
    const entry = { index: i, kind, grid: g, onset: o.x, band: o.band, strength: o.strength, ratio: Math.round(o.ratio * 100) / 100 };
    if (bad) { log.push({ ...entry, seconds: g, shiftMs: 0, reason: 'reverted: slot ' + bad.slot + ' ' + bad.reason }); continue; }
    cuts[i] = o.x;
    log.push({ ...entry, seconds: o.x, shiftMs: Math.round((o.x - g) * 1e4) / 10, reason: 'onset' });
  }
  return { cuts, frames: cuts.map(frameOf), log, window: reach };
}

// opts: { bpm, fps, montageShots, burst?: 'sixteenth' | 'eighth' (default 'sixteenth'), sectionStart?: seconds into
// the music (omit without music), onsets?, onsetThresholds?, lowConfidence? (cwvSnapCuts; used only with a
// sectionStart), cuts?: cut seconds decided earlier (a schedule's `cuts`, reused as they are) }. Slots carry their
// grid beat span (startBeat, endBeat) and frames; `titleSlots` is the number of title slots; `offset` is the music
// offset every boundary is shifted by; `cuts` are the boundaries in seconds from the section start (the grid, or the
// snapped cuts) and `snapLog` explains each snappable cut.
function cwvSchedule(opts) {
  const bpm = opts.bpm, fps = opts.fps, n = opts.montageShots;
  if (!(bpm > 0) || !(fps > 0) || !(n >= 0)) throw Error('cwvSchedule needs bpm, fps and montageShots');
  const burst = opts.burst === 'eighth' ? 'eighth' : 'sixteenth';
  const title = cwvTitle(burst), T = title.beats.length;
  // Every boundary is an absolute beat position, shifted by the music offset and snapped once to a frame; durations
  // never accumulate rounding. The video always starts at frame 0. assemble.js places cuts with the same expression.
  const offset = cwvMusicOffset(opts.sectionStart, fps);
  const frameAt = beats => (beats === 0 ? 0 : Math.round((beats * (60 / bpm) + offset) * fps));
  const frameOfSeconds = x => (x === 0 ? 0 : Math.round((x + offset) * fps));
  const beats = title.beats.concat(Array(n).fill(CWV_MONTAGE_BEATS));
  const grid = [0];
  beats.reduce((at, b) => { grid.push((at + b) * (60 / bpm)); return at + b; }, 0);
  // The burst: the sub-beat shots from the first landmark slot on (four 16ths or two 8ths).
  const burstFrom = 3, burstTo = burstFrom + (burst === 'eighth' ? 2 : 4);
  let cuts = grid, snapLog = [];
  if (Array.isArray(opts.cuts)) {
    if (opts.cuts.length !== grid.length) throw Error('cwvSchedule: cuts do not match the slots');
    cuts = opts.cuts.slice();
  } else if (opts.onsets && opts.onsets.length && typeof opts.sectionStart === 'number' && isFinite(opts.sectionStart)) {
    const snapped = cwvSnapCuts(grid, { beats, burstFrom, burstTo }, opts.onsets,
      { bpm, fps, sectionStart: opts.sectionStart, thresholds: opts.onsetThresholds, lowConfidence: opts.lowConfidence });
    cuts = snapped.cuts; snapLog = snapped.log;
  }
  const slots = [];
  let at = 0;
  beats.forEach((b, i) => {
    const inTitle = i < T;
    slots.push({
      index: i,
      role: inTitle ? title.roles[i] : CWV_MONTAGE_ROLES[(i - T) % CWV_MONTAGE_ROLES.length],
      section: inTitle ? (i < 3 ? 'opening' : i < T - 1 ? 'burst' : 'hold') : 'montage',
      startBeat: at,
      endBeat: at + b,
      startFrame: frameOfSeconds(cuts[i]),
      endFrame: frameOfSeconds(cuts[i + 1]),
    });
    at += b;
  });
  const fontSwitches = [];
  title.fonts.forEach((state, i) => {
    const last = fontSwitches.length ? fontSwitches[fontSwitches.length - 1].state : null;
    if (state && state !== last) fontSwitches.push({ frame: slots[i].startFrame, state });
  });
  return {
    burst,
    titleSlots: T,
    offset,
    cuts,
    snapLog,
    slots,
    totalFrames: slots[slots.length - 1].endFrame,
    title: {
      line1Frame: frameAt(CWV_LINE1_OFFSET_BEATS),
      connectorFrame: slots[1].startFrame,
      placeFrame: slots[2].startFrame,
      fontSwitches,
      endFrame: slots[T - 1].endFrame,
    },
  };
}

function cwvFitMontage(opts) {
  for (let n = Math.min(opts.requested, CWV_MAX_MONTAGE); n >= CWV_MIN_MONTAGE; n--) {
    if (opts.sectionStart + cwvVideoSeconds(opts.bpm, n) <= opts.usableEnd + 1e-6) return n;
  }
  return 0;
}

function cwvSnapSection(opts) {
  const latest = opts.usableEnd - opts.videoSeconds;
  if (latest < -1e-6) return null;
  if (!opts.gridAccepted) return Math.max(0, Math.min(Math.floor(latest * 10) / 10, Math.round(opts.value * 10) / 10));
  const bar = 4 * 60 / opts.bpm;
  const maxK = Math.floor((latest - opts.firstBeat) / bar + 1e-9);
  if (maxK < 0) return null;
  const k = Math.max(0, Math.min(maxK, Math.round((opts.value - opts.firstBeat) / bar)));
  return opts.firstBeat + k * bar;
}

function cwvDefaultSection(opts) {
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

function cwvHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}

// Filler candidates every CWV_FILLER_STEP seconds on each source that appears in the candidates, sorted by rid then time.
function cwvFillers(candidates) {
  const dur = {};
  for (const c of candidates) {
    if (!c || typeof c.sourceDuration !== 'number' || !isFinite(c.sourceDuration) || !(c.sourceDuration > 0)) continue;
    dur[c.rid] = Math.max(dur[c.rid] || 0, c.sourceDuration);
  }
  const out = [];
  for (const rid of Object.keys(dur).sort()) {
    for (let k = 0; ; k++) {
      const t = CWV_FILLER_EDGE + k * CWV_FILLER_STEP;
      if (t > dur[rid] - CWV_FILLER_EDGE + 1e-9) break;
      out.push({ rid, role: 'filler', t, score: CWV_FILLER_SCORE, sourceDuration: dur[rid] });
    }
  }
  return out;
}

// Which candidate roles may fill a slot role, best first.
const CWV_ROLE_FALLBACK = {
  street: ['street', 'detail', 'architecture'],
  architecture: ['architecture', 'landmark', 'street'],
  landmark: ['landmark', 'architecture', 'park', 'wide'],
  wide: ['wide', 'park', 'landmark'],
  park: ['park', 'wide', 'detail'],
  detail: ['detail', 'street', 'architecture'],
};

function cwvAllocate(opts) {
  const gap = opts.gapSeconds == null ? 0.5 : opts.gapSeconds;
  const finite = v => typeof v === 'number' && isFinite(v);
  const candidates = opts.candidates.filter(c => c && c.kind !== 'photo' && finite(c.t) && finite(c.score) && finite(c.sourceDuration));
  // One photo candidate per rid, in rid order so the result never depends on input order.
  const photoSeen = {};
  const photos = opts.candidates.filter(c => c && c.kind === 'photo' && typeof c.rid === 'string' && !photoSeen[c.rid] && (photoSeen[c.rid] = true))
    .sort((a, b) => (a.rid < b.rid ? -1 : a.rid > b.rid ? 1 : 0));
  const used = {}, recent = [], picks = [], photoUsed = {};
  const pool = candidates.filter(c => c.sourceDuration > 0);
  let missing = 0, fillerShots = 0, photoShots = 0, photoRun = 0, photoRunRelaxed = false, adjacentRepeats = 0, prevRid = null;
  // Photo slots: round(share x slots) of the slots a photo can hold, capped by the photos available, spaced evenly.
  // opts.photoShare overrides CWV_PHOTO_SHARE (0 turns photo slots off).
  const photoSlots = {};
  const holdable = opts.slots.filter(sl => sl.seconds <= CWV_PHOTO_HOLD_MAX + 1e-9);
  const share = opts.photoShare == null ? CWV_PHOTO_SHARE : opts.photoShare;
  const target = Math.min(photos.length, holdable.length, Math.round(opts.slots.length * share));
  const phase = cwvHash(opts.seed + ':photo-slots');
  for (let k = 0; k < target; k++) photoSlots[holdable[Math.floor((k + phase) * holdable.length / target)].index] = true;
  // Best fitting video candidate for a slot. rankOf returns the candidate's rank in this tier, or -1 to skip it.
  // `exclude` is a rid that may not be used (the previous shot's source).
  function searchVideo(slot, rankOf, exclude) {
    let best = null;
    for (const c of pool) {
      if (c.rid === exclude) continue;
      const rank = rankOf(c);
      if (rank < 0 || c.sourceDuration < slot.seconds + CWV_SOURCE_TAIL) continue;
      const start = Math.max(0, Math.min(c.sourceDuration - CWV_SOURCE_TAIL - slot.seconds, c.t - slot.seconds / 2));
      const end = start + slot.seconds;
      if ((used[c.rid] || []).some(([a, b]) => start < b + gap && end > a - gap)) continue;
      const repeats = recent.filter(r => r === c.rid).length;
      const value = c.score - rank * 0.15 - repeats * 0.2 + cwvHash(opts.seed + ':' + c.rid + ':' + c.t.toFixed(2)) * 0.05;
      const better = !best || value > best.value + 1e-12 ||
        (Math.abs(value - best.value) <= 1e-12 && (c.rid < best.c.rid || (c.rid === best.c.rid && c.t < best.c.t)));
      if (better) best = { value, c, start, end };
    }
    return best;
  }
  // An unused photo for the slot, chosen by a seeded hash so another seed picks other photos.
  function searchPhoto(slot) {
    if (slot.seconds > CWV_PHOTO_HOLD_MAX + 1e-9) return null;
    let best = null;
    for (const c of photos) {
      if (photoUsed[c.rid]) continue;
      const value = cwvHash(opts.seed + ':photo:' + c.rid);
      if (!best || value > best.value + 1e-12) best = { value, c, photo: true };
    }
    return best;
  }
  for (const slot of opts.slots) {
    const roles = CWV_ROLE_FALLBACK[slot.role] || [slot.role];
    const photo = () => searchPhoto(slot);
    const runFull = photoRun >= CWV_PHOTO_RUN_MAX;
    const choose = exclude => {
      const preferred = () => searchVideo(slot, c => roles.indexOf(c.role), exclude);
      const anyReal = () => searchVideo(slot, c => (c.role === 'filler' ? -1 : 0), exclude);
      const filler = () => searchVideo(slot, c => (c.role === 'filler' ? 0 : -1), exclude);
      // Tiers, best first: preferred-role hits, any-role hits, photos, fillers. A photo slot puts photos first; the
      // title burst lifts them above the any-role tier. After CWV_PHOTO_RUN_MAX photos in a row, a photo is only the
      // last resort.
      const tiers = photoSlots[slot.index] ? [photo, preferred, anyReal, filler]
        : slot.section === 'burst' ? [preferred, photo, anyReal, filler] : [preferred, anyReal, photo, filler];
      for (const tier of tiers) {
        if (runFull && tier === photo) continue;
        const b = tier();
        if (b) return b;
      }
      const b = runFull ? photo() : null;
      return b ? { ...b, runRelaxed: true } : null;
    };
    // Two shots from the same source in a row often do not read as a cut, so the previous shot's source is only
    // used again when nothing else fits (counted in adjacentRepeats).
    let best = choose(prevRid);
    if (!best && prevRid !== null && (best = choose(null))) adjacentRepeats++;
    if (best && best.runRelaxed) photoRunRelaxed = true;
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
    if (best.c.role === 'filler') fillerShots++;
    picks.push({ slot: slot.index, rid: best.c.rid, kind: 'video', startSeconds: best.start, endSeconds: best.end });
  }
  return { picks, filled: picks.filter(Boolean).length, missing, fillerShots, photoShots, photoRunRelaxed, adjacentRepeats };
}

// Tries the requested montage length first, then shrinks toward CWV_MIN_MONTAGE. Every attempt allocates from scratch.
// opts.burst picks the title variant and opts.sectionStart shifts the cuts with the music (see cwvSchedule);
// opts.onsets, opts.onsetThresholds and opts.lowConfidence snap the cuts to the music's onsets (cwvSnapCuts), so the
// slot lengths the shots are chosen for are the snapped ones; opts.photoShare overrides CWV_PHOTO_SHARE.
// Filler candidates are added to every attempt.
// Photo candidates ({ rid, kind: 'photo' }) join every attempt, so a Project with only photos builds too.
function cwvPlanBuild(opts) {
  const top = Math.min(CWV_MAX_MONTAGE, Math.max(CWV_MIN_MONTAGE, opts.montageShots));
  const candidates = opts.candidates.concat(cwvFillers(opts.candidates));
  const burst = opts.burst === 'eighth' ? 'eighth' : 'sixteenth', needed = cwvMinWindows(burst);
  let best = { filled: 0, photoShots: 0 };
  for (let n = top; n >= CWV_MIN_MONTAGE; n--) {
    const schedule = cwvSchedule({ bpm: opts.bpm, fps: opts.fps, montageShots: n, burst, sectionStart: opts.sectionStart,
      onsets: opts.onsets, onsetThresholds: opts.onsetThresholds, lowConfidence: opts.lowConfidence });
    const slots = schedule.slots.map(s => ({ index: s.index, role: s.role, section: s.section, seconds: (s.endFrame - s.startFrame) / opts.fps }));
    const alloc = cwvAllocate({ candidates, slots, seed: opts.seed, photoShare: opts.photoShare });
    if (alloc.missing === 0) {
      const plan = { ok: true, schedule, burst, titleSlots: schedule.titleSlots, picks: alloc.picks, montageShots: n, usableShots: alloc.picks.length, needed, fillerShots: alloc.fillerShots, photoShots: alloc.photoShots };
      if (alloc.photoRunRelaxed) plan.photoRunRelaxed = true;
      if (alloc.adjacentRepeats) plan.adjacentRepeats = alloc.adjacentRepeats;
      return plan;
    }
    // The shortest attempt fills fewer than `needed` slots, so usableShots < needed.
    if (n === CWV_MIN_MONTAGE) best = alloc;
  }
  return { ok: false, burst, usableShots: best.filled, needed, photoShots: best.photoShots };
}

// Photo motions for montage photos, in pick order. Title photos (the first `titleSlots` slots, default the 16th-burst
// title's 12) stay still (null).
// Deterministic per seed; never the same motion twice in a row, never the same family (drift, tilt, ...) twice in a row;
// drift, tilt and push-drift directions alternate. Drift follows the photo: vertical for portrait, horizontal otherwise.
// Each entry is { motion, direction: 1 | -1, axis: 'x' | 'y' } for assets/photo-motion.tsx.
// `sizes` maps rid -> { width, height }; an unknown size counts as landscape.
const CWV_PHOTO_MOTIONS = ['push-in', 'pull-out', 'drift-left', 'drift-right', 'drift-up', 'drift-down', 'tilt', 'push-drift'];
const CWV_MOTION_FAMILIES = ['push-in', 'pull-out', 'drift', 'tilt', 'push-drift'];
function cwvPhotoMotions(picks, seed, sizes, titleSlots) {
  const T = titleSlots == null ? CWV_TITLE_BEATS.length : titleSlots;
  const out = [];
  let lastFamily = null, driftSign = { x: 1, y: 1 }, tiltSign = 1, pushDriftSign = 1, k = 0;
  for (const pick of picks) {
    if (!pick || pick.kind !== 'photo' || !(pick.slot >= T)) { out.push(null); continue; }
    const size = sizes && sizes[pick.rid];
    const portrait = !!(size && size.height > size.width);
    const families = CWV_MOTION_FAMILIES.filter(f => f !== lastFamily)
      .map(f => ({ f, v: cwvHash(seed + ':motion:' + k + ':' + f) }))
      .sort((a, b) => b.v - a.v || (a.f < b.f ? -1 : 1));
    const family = families[0].f;
    let motion = family, direction = 1;
    if (family === 'drift') {
      const axis = portrait ? 'y' : 'x';
      direction = driftSign[axis]; driftSign[axis] = -direction;
      motion = axis === 'x' ? (direction > 0 ? 'drift-right' : 'drift-left') : (direction > 0 ? 'drift-down' : 'drift-up');
    } else if (family === 'tilt') { direction = tiltSign; tiltSign = -tiltSign; }
    else if (family === 'push-drift') { direction = pushDriftSign; pushDriftSign = -pushDriftSign; }
    // axis: the drift direction of push-drift (and of the drift motions), along the side the 9:16 crop has room on.
    out.push({ motion, direction, axis: portrait ? 'y' : 'x' });
    lastFamily = family; k++;
  }
  return out;
}

// Build steps shown in the panel's progress bar, with each step's share of the bar in percent. The panel names them
// in the UI language (STRINGS `step.<id>`).
const CWV_BUILD_STEPS = [
  { id: 'shots', weight: 40 },
  { id: 'music', weight: 10 },
  { id: 'draft', weight: 25 },
  { id: 'look', weight: 20 },
  { id: 'open', weight: 5 },
];

// Progress for a step that is `fraction` done. Floors the percent so 100% only shows at the very end. The panel
// builds the label from `id`, `current` and `percent` in the UI language.
function cwvProgress(stepId, fraction) {
  const i = CWV_BUILD_STEPS.findIndex(s => s.id === stepId);
  if (i < 0) throw new Error('unknown build step ' + stepId);
  const total = CWV_BUILD_STEPS.reduce((a, s) => a + s.weight, 0);
  const before = CWV_BUILD_STEPS.slice(0, i).reduce((a, s) => a + s.weight, 0);
  const f = Math.min(1, Math.max(0, Number(fraction) || 0));
  const value = (before + CWV_BUILD_STEPS[i].weight * f) / total;
  const percent = Math.floor(value * 100 + 1e-9);
  return { id: stepId, value, percent, current: i };
}
// cwv-planner:end

// cwv-own-grid:start
// Own music's timing grid from beat-detect.cjs's analysis (own-music.json; { accepted: false, durationSeconds, peaks: [] }
// when only the length is known). The detector searches 70-180 BPM, so that is the tempo range a detected grid may have.
//   accepted grid       - its tempo and first beat, the section snapped to its bars, the 16th burst when the music has
//                         a 16th pulse;
//   'approximate' grid  - beat-detect.cjs found the tempo and first beat (tight residuals, consistent over the track)
//                         but the beat is faint: the same tempo, first beat and bar-snapped section, but the calmer 8th
//                         burst and low-confidence (bass only) cut snapping, and the panel says so (faint: true,
//                         STRINGS `faintTiming`);
//   'none' / no analysis - fixed timing at the 99.2 BPM reference from 0, the section in 0.1 s steps.
// noOnsets: the shared empty onset list for music without onsets.
const CWV_OWN_MIN_BPM = 70, CWV_OWN_MAX_BPM = 180;
function cwvOwnGrid(own, duration, noOnsets) {
  const faint = !!own && !own.accepted && own.grid === 'approximate' && own.bpm >= CWV_OWN_MIN_BPM && own.bpm <= CWV_OWN_MAX_BPM && own.durationSeconds > 0;
  if (own && (own.accepted || faint)) {
    return { bpm: own.bpm, firstBeat: own.firstBeat, usableEnd: own.durationSeconds - 0.5, beatEnergy: own.beatEnergy, peaks: own.peaks, accepted: !faint, faint,
      sixteenthRatio: own.sixteenthRatio, onsets: own.onsets || noOnsets, onsetThresholds: own.onsetThresholds };
  }
  return { bpm: CWV_REFERENCE_BPM, firstBeat: 0, usableEnd: duration ? duration - 0.5 : 0, beatEnergy: [], peaks: (own && own.peaks) || [], accepted: false, faint: false,
    sixteenthRatio: null, onsets: (own && own.onsets) || noOnsets, onsetThresholds: own ? own.onsetThresholds : undefined };
}
// cwv-own-grid:end

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
function suggestPlace(projectName: string) {
  const name = String(projectName || "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  // Latin or Hangul names of 2 to 31 columns (Hangul counts as 2).
  if (!/^[A-Za-z\uac00-\ud7a3][A-Za-z\uac00-\ud7a3 .']*$/.test(name) || fieldLen(name) < 2 || fieldLen(name) > 31) return "";
  if (/\b(project|untitled|test|draft|copy|export|final|edit|vlog)\b/i.test(name)) return "";
  // The same generic words in Korean (project, untitled, test, draft, copy, export, final, edit, vlog).
  if (/\ud504\ub85c\uc81d\ud2b8|\ubb34\uc81c|\uc81c\ubaa9\u0020\uc5c6\uc74c|\ud14c\uc2a4\ud2b8|\ucd08\uc548|\ubcf5\uc0ac\ubcf8|\ub0b4\ubcf4\ub0b4\uae30|\ucd5c\uc885|\ud3b8\uc9d1|\ube0c\uc774\ub85c\uadf8/.test(name)) return "";
  return name;
}
function suggestDay(dates: (string | null)[]) {
  const counts: Record<number, number> = {};
  for (const d of dates) { if (!d) continue; const t = new Date(d); if (!isNaN(t.getTime())) counts[t.getDay()] = (counts[t.getDay()] || 0) + 1; }
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1] || Number(a[0]) - Number(b[0]))[0];
  return best ? WEEKDAYS[Number(best[0])] : "A day";
}
// Thrown when the Project changed while a build was running; its results are dropped silently.
const STALE = new Error("The Project changed during the build.");
const STATE_KEYS = ["A", "B", "C", "D"];
// A state's font stack: its bundled face, the Latin fallbacks, then the Korean system face of its role (presets.json
// `koFamily`: AppleMyungjo for serif faces, Apple SD Gothic Neo for the rest) before the generic family.
const FALLBACK_LATIN = '"Snell Roundhand", "Brush Script MT"';
const KO_FALLBACK = "Apple SD Gothic Neo";
function fontStack(s: any) { return '"' + s.family + '", ' + FALLBACK_LATIN + ', "' + (s.koFamily || KO_FALLBACK) + '", cursive'; }
// Text with Hangul is never uppercased or tracked, and breaks between words only.
function faceStyle(s: any, text = "") {
  return { fontFamily: fontStack(s), fontStyle: s.style, fontWeight: s.weight, textTransform: s.case === "upper" && !HANGUL_RE.test(text) ? "uppercase" : "none",
    letterSpacing: 0, wordBreak: "keep-all" } as any;
}
// Preview font size: shrink long lines so they stay inside the preview box. Wide characters (Hangul) count as 2.
function previewSize(text: string, base: number, scale: number) { return Math.min(base, (base * 11) / Math.max(11, fieldLen(text))) * (scale || 1); }
// Title preview line slots, sized for the largest state scale so the box never changes height while fonts cycle.
const PREVIEW_BIG = 34, PREVIEW_SMALL = 15, PREVIEW_MAX_SCALE_FLOOR = 1.15;

// The photo rids a build uses: the selected photos (all when `onlyPhotos` is null), none while Use photos is off.
function selectedPhotoRidsOf(inventory: any, onlyPhotos: string[] | null, usePhotos: boolean): string[] {
  if (!usePhotos || !inventory) return [];
  return (inventory.photos || []).map((r: any) => r.rid as string).filter((rid: string) => !onlyPhotos || onlyPhotos.includes(rid));
}
function photoCandsOf(inventory: any, onlyPhotos: string[] | null, usePhotos: boolean) {
  return selectedPhotoRidsOf(inventory, onlyPhotos, usePhotos).map((rid) => ({ rid, kind: "photo" }));
}
// A short orientation hint for the clip list; nothing when the frame size is unknown.
function shapeHint(lang: Lang, width: number | null, height: number | null) {
  if (!(width! > 0) || !(height! > 0)) return "";
  const r = width! / height!;
  return r < 0.9 ? t(lang, "shape.tall") : r > 1.1 ? t(lang, "shape.wide") : t(lang, "shape.square");
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
const WAVE_HEIGHT = 56;

// Music section slider: waveform on a canvas with a draggable, bar-snapped window over the chosen section.
// While `audio` plays, a playhead follows its currentTime inside the window, redrawn on every animation frame.
// Videos without analysis, from inventory.js's skipped counts: being analysed now, not analysed yet (never started; the
// panel does not start analysis), or failed. known is false when the workflow read failed: pending clips then may or
// may not be queued, so their wording is neutral and the panel keeps polling.
function cwvAnalysisCounts(skipped: any) {
  const s = skipped || {}, total = s.unanalysed || 0;
  if (s.analysing == null) return { total, analysing: 0, notAnalysed: total, failed: 0, known: false };
  return { total, analysing: s.analysing || 0, notAnalysed: s.notAnalysed || 0, failed: s.failed || 0, known: s.statusKnown !== false };
}
// The sentences for the readiness line in the UI language ("" when every video is analysed).
function cwvAnalysisText(lang: Lang, c: any) {
  return [
    c.analysing ? t(lang, "analysing", { count: c.analysing }) : "",
    c.notAnalysed ? (c.known ? t(lang, "notAnalysedAnalyse", { count: c.notAnalysed }) : t(lang, "notAnalysedMaybe", { count: c.notAnalysed })) : "",
    c.failed ? t(lang, "analysisFailed", { count: c.failed }) : "",
  ].filter(Boolean).join(t(lang, "gap"));
}
// The short facts for the end of the Ready line ("" for a count of 0).
function cwvAnalysisNotes(lang: Lang, c: any) {
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
  // The UI language, read on every render: the app can switch languages while the panel is open.
  const L = uiLang(context);
  const langRef = React.useRef(L);
  langRef.current = L;
  const projectId = context?.projectId ?? null;
  const projectRef = React.useRef(projectId);
  projectRef.current = projectId;
  const [roots, setRoots] = React.useState<{ plugin: string; data: string } | null>(null);
  const [assets, setAssets] = React.useState<any>(null);
  const [inventory, setInventory] = React.useState<any>(null);
  const [candidates, setCandidates] = React.useState<any>(null);
  const [line1, setLine1] = React.useState("");
  const [connector, setConnector] = React.useState("in");
  const [place, setPlace] = React.useState("");
  const [cueId, setCueId] = React.useState("sunny-soul-strut");
  const [ownMusic, setOwnMusic] = React.useState<{ path: string; name: string } | null>(null);
  const [ownGrid, setOwnGrid] = React.useState<any>(null);
  const [preset, setPreset] = React.useState("classic");
  const [length, setLength] = React.useState<"short" | "standard" | "long">("standard");
  // Clip sound: the clips' own sound is off (muted), ambient (-18 dB under the music) or full (0 dB).
  const [clipSound, setClipSound] = React.useState<"off" | "ambient" | "full">("ambient");
  const [warm, setWarm] = React.useState(true);
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
  // What the one-call spinner shows: "checking" (clips) or "listening" (own music's beat).
  const [step, setStep] = React.useState<"" | "checking" | "listening">("");
  const [tools, setTools] = React.useState({ ffmpeg: true, node: true });
  const [tick, setTick] = React.useState(0);
  const fontCache = React.useRef<Record<string, Promise<string>>>({});
  const registered = React.useRef<Set<string>>(new Set());
  // Build progress (bar + step list). `step` stays for the one-call spinner (own-music beat detection).
  const [progress, setProgress] = React.useState<any>(null);
  const progressRef = React.useRef<any>(null);
  const advance = (id: string, fraction: number, detail?: Say) => { const p = { ...cwvProgress(id, fraction), detail }; progressRef.current = p; setProgress(p); };
  const [status, setStatus] = React.useState<{ tone: string; say: Say } | null>(null);
  const [result, setResult] = React.useState<any>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const previewTokenRef = React.useRef(0);
  const previewUrlRef = React.useRef<string | null>(null);
  const [playState, setPlayState] = React.useState<"idle" | "loading" | "playing">("idle");
  const [playingAudio, setPlayingAudio] = React.useState<HTMLAudioElement | null>(null);

  const run = async (summary: string, script: string, allowCommit = false) => {
    let r = await sdk.runScript({ summary, script, allowCommit });
    // Only a lost session is resent, and never a committing call: its commit may already have landed.
    if (r.isError && !allowCommit && /No valid session ID/.test(r.output || "")) { await new Promise((d) => setTimeout(d, 1500)); r = await sdk.runScript({ summary, script, allowCommit }); }
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
  // Registers a preset state's bundled font in this panel's document for the preview and tiles.
  async function registerFace(plugin: string, s: any) {
    const key = s.family + "|" + s.style + "|" + s.weight;
    if (registered.current.has(key) || typeof FontFace === "undefined") return;
    const face = new FontFace(s.family, "url(data:font/woff2;base64," + (await fontB64(plugin, s.file)) + ")", { style: s.style, weight: String(s.weight) });
    await face.load();
    (document as any).fonts.add(face);
    registered.current.add(key);
  }
  // Where a build stopped and why; script and SDK details stay in English after the translated prefix.
  const stopAt = (e: any): Say => {
    const at = progressRef.current;
    return (l) => (at ? t(l, "stoppedAt", { step: at.current + 1, total: CWV_BUILD_STEPS.length, name: t(l, "step." + at.id), detail: sayError(l, e) }) : sayError(l, e));
  };
  const endRun = (pid: string) => {
    if (projectRef.current !== pid) return;
    busyRef.current = false; setBusy(false); setStep(""); setProgress(null); progressRef.current = null;
  };

  // Inventory bookkeeping: the inventory script, the last clip set seen, the title values we suggested, and a load in flight.
  const inventoryJsRef = React.useRef<string | null>(null);
  const invSigRef = React.useRef<string | null>(null);
  // Photo sizes measured by earlier inventory reads, passed back so a refresh does not measure them again.
  const photoSizesRef = React.useRef<Record<string, { width: number; height: number }>>({});
  const autoRef = React.useRef<{ pid: string | null; line1: string; place: string }>({ pid: null, line1: "", place: "" });
  const invLoadingRef = React.useRef<string | null>(null);
  const mountedRef = React.useRef(true);
  const [invError, setInvError] = React.useState<{ say: Say } | null>(null);
  const [invLoading, setInvLoading] = React.useState(false);

  // Reads the Project's footage inventory. Never writes state for a stale Project, and never runs during a build.
  async function loadInventory(pid: string | null = projectRef.current, alive: () => boolean = () => true) {
    const script = inventoryJsRef.current;
    // One read per Project at a time; a read for another Project never blocks this one.
    if (!pid || !script || busyRef.current || invLoadingRef.current === pid) return;
    const live = () => mountedRef.current && alive() && projectRef.current === pid;
    invLoadingRef.current = pid; setInvLoading(true);
    try {
      const inv = await run("Read footage", fill(script, { projectId: pid, only: null, known: photoSizesRef.current }));
      // A build that started meanwhile keeps the clip set it began with; the next refresh picks this up.
      if (!live() || busyRef.current) return;
      inv.photos = inv.photos || [];
      for (const ph of inv.photos) if (ph.width > 0 && ph.height > 0) photoSizesRef.current[ph.rid] = { width: ph.width, height: ph.height };
      const sk = inv.skipped || {};
      const sig = inv.resources.map((r: any) => r.rid).sort().join(",") + "|" + [sk.unanalysed, sk.analysing, sk.notAnalysed, sk.failed, sk.statusKnown].map((x) => String(x ?? "")).join(",");
      // A changed clip set drops the cached scene search so a build never uses stale candidates.
      if (invSigRef.current !== sig) { if (invSigRef.current !== null) setCandidates(null); invSigRef.current = sig; }
      setInventory(inv); setInvError(null);
      // Prefill the title on the first load for this Project; later only replace values the user has not edited.
      const day = suggestDay([...inv.resources, ...inv.photos].map((r: any) => r.recordedAt));
      const auto = autoRef.current;
      if (auto.pid !== pid) {
        const where = suggestPlace(context?.projectName);
        autoRef.current = { pid, line1: day, place: where };
        setLine1(day); setPlace(where);
      } else if (auto.line1 !== day) {
        const prev = auto.line1;
        autoRef.current = { ...auto, line1: day };
        setLine1((cur) => (cur === prev ? day : cur));
      }
    } catch (e: any) {
      if (live()) setInvError({ say: (l) => sayError(l, e) });
    } finally {
      if (invLoadingRef.current === pid) invLoadingRef.current = null;
      if (mountedRef.current && projectRef.current === pid) setInvLoading(false);
    }
  }
  React.useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // Mount and Project switch: reset per-Project state, resolve folders, read bundled assets, inventory the Project.
  React.useEffect(() => {
    // Drop everything tied to the previous Project so a build never mixes Projects.
    setCandidates(null); setResult(null); setStatus(null); setInventory(null); setInvError(null); setInvLoading(false);
    setOnly(null); setOnlyPhotos(null);
    invSigRef.current = null; photoSizesRef.current = {};
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
        const [manifest, presets, inventoryJs, searchJs, ensureJs, assembleJs, decorateJs, titleTsx, warmTsx, motionTsx] = await Promise.all([
          read("assets/cues/manifest.json"), read("assets/fonts/presets.json"), read("scripts/inventory.js"), read("scripts/search.js"),
          read("scripts/ensure-audio.js"), read("scripts/assemble.js"), read("scripts/decorate.js"), read("assets/title-graphic.tsx"), read("assets/warm-look.tsx"),
          read("assets/photo-motion.tsx")]);
        if (!alive) return;
        setAssets({ manifest: JSON.parse(manifest), presets: JSON.parse(presets), scripts: { inventoryJs, searchJs, ensureJs, assembleJs, decorateJs }, titleTsx, warmTsx, motionTsx });
        inventoryJsRef.current = inventoryJs;
        setStep("checking");
        await loadInventory(projectId, () => alive);
      } catch (e: any) {
        if (alive) setStatus({ tone: "error", say: (l) => t(l, "startFailed", { detail: sayError(l, e) }) });
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
  const invAnalysis = cwvAnalysisCounts(inventory?.skipped);
  const needsPoll = !!inventory && (invAnalysis.analysing > 0 || (!invAnalysis.known && invAnalysis.total > 0) || (inventory.resources.length === 0 && !inventory.photos?.length && invAnalysis.total === 0));
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

  // Fonts for the tiles (every preset's state A) and the live preview (all states of the chosen preset).
  React.useEffect(() => {
    if (!assets || !roots) return;
    const chosen = assets.presets.presets.find((x: any) => x.id === preset);
    const wanted = [...assets.presets.presets.map((x: any) => x.states.A), ...(chosen ? STATE_KEYS.map((k) => chosen.states[k]) : [])];
    // A font that fails to load only makes the preview fall back; the build reads the files again.
    wanted.forEach((s: any) => { registerFace(roots.plugin, s).catch(() => null); });
  }, [assets, roots, preset]);
  React.useEffect(() => { const t = setInterval(() => setTick((n) => n + 1), 600); return () => clearInterval(t); }, []);

  const cue = assets?.manifest.cues.find((c: any) => c.id === cueId) || null;
  const ownDuration = ownGrid && ownGrid.durationSeconds > 0 ? ownGrid.durationSeconds : null;
  // onsets / onsetThresholds: the music's qualifying band onsets in music seconds (manifest or beat-detect.cjs); the
  // planner snaps the cuts to them (cwvSnapCuts). Own music without a reliable beat keeps its onsets: its fixed-timing
  // (or approximate-grid) cuts snap to bass onsets only. Own music's grid: cwvOwnGrid.
  const grid = ownMusic ? cwvOwnGrid(ownGrid, ownDuration, NO_ONSETS)
    : cue ? { bpm: cue.bpm, firstBeat: cue.firstBeat, usableEnd: cue.usableEnd, beatEnergy: cue.beatEnergy, peaks: cue.peaks, accepted: true, sixteenthRatio: cue.sixteenthRatio, onsets: cue.onsets || NO_ONSETS, onsetThresholds: cue.onsetThresholds }
    : { bpm: CWV_REFERENCE_BPM, firstBeat: 0, usableEnd: 600, beatEnergy: [], peaks: [], accepted: false, sixteenthRatio: null, onsets: NO_ONSETS, onsetThresholds: undefined };
  // The title burst: 16th-note shots only when the music has a clear 16th pulse; fixed timing, an approximate grid
  // (faint beat) and No music use 8ths.
  const burst = grid.accepted ? cwvBurstFor(grid.sixteenthRatio) : "eighth";
  const minShots = cwvMinWindows(burst);
  const requested = CWV_LENGTHS[length];
  const videoSeconds = cwvVideoSeconds(grid.bpm, requested);
  // The section snaps to the bars of an accepted grid and of an approximate one (own music's detected tempo and first
  // beat); fixed timing moves it in 0.1 s steps.
  const onBars = grid.accepted || !!grid.faint;
  const snap = (value: number) => cwvSnapSection({ value, firstBeat: grid.firstBeat, bpm: grid.bpm, usableEnd: grid.usableEnd, videoSeconds, gridAccepted: onBars });
  // The section start the build uses; with music, every cut shifts with its frame-snapped start (planner cwvMusicOffset).
  // The readiness plan uses the same value, so "footage fits N" matches what Build produces.
  const start = onBars ? snap(section || 0) : (section || 0);
  const musicStart = cueId === "none" ? null : (start ?? 0);
  // Onset snapping for every plan; without a reliable beat only bass onsets count, in a wider window.
  const snapCuts = { onsets: grid.onsets, onsetThresholds: grid.onsetThresholds, lowConfidence: !grid.accepted };

  // A new track (or its grid) defaults the section to the most energetic window.
  // `assets` is a dependency so the default also applies once the manifest has loaded.
  React.useEffect(() => {
    if (!onBars) { setSection(snap(0)); return; }
    setSection(cwvDefaultSection({ firstBeat: grid.firstBeat, bpm: grid.bpm, beatEnergy: grid.beatEnergy, usableEnd: grid.usableEnd, videoSeconds }) ?? grid.firstBeat);
  }, [assets, cueId, ownMusic?.path, ownGrid]);
  // A new length keeps the chosen start and only re-clamps it (spec section 5).
  React.useEffect(() => { setSection((s) => snap(s ?? 0)); }, [length]);
  // A new track, section or length makes a running preview stale, so it stops.
  React.useEffect(() => { stopPreview(); }, [cueId, ownMusic?.path, section, length]);

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
      const og = cwvOwnGrid(g, null, NO_ONSETS);
      const bpm = Math.round(og.bpm);
      setStatus(g.accepted ? null : og.faint ? { tone: "info", say: (l) => t(l, "faintTiming", { bpm }) }
        : { tone: "info", say: (l) => t(l, "musicFixedRhythm") });
    } catch (e: any) {
      // Without a grid the cuts use fixed timing, but the track's real length still bounds the section.
      let duration: number | null = null;
      try {
        const pr = await sdk.runShell({ summary: "Read the length of " + file.name, command: TOOL_PATH + "ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 " + sq(file.path), timeoutMs: 20000 });
        const v = parseFloat(String(pr?.stdout || "").trim());
        if (!pr?.isError && v > 0) duration = Math.min(v, 360);
      } catch { duration = null; }
      setOwnGrid({ accepted: false, durationSeconds: duration, peaks: [] });
      setStatus(duration
        ? { tone: "info", say: (l) => t(l, "musicFixedRhythmDetail", { detail: sayError(l, e) }) }
        : { tone: "error", say: (l) => t(l, "musicUnreadable", { detail: sayError(l, e) }) });
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
    if ((!ownMusic && !cue) || !roots || section == null) return;
    stopPreview();
    const token = previewTokenRef.current;
    const live = () => previewTokenRef.current === token && mountedRef.current;
    setPlayState("loading");
    try {
      const file = ownMusic ? ownMusic.path : roots.plugin + "/assets/cues/" + cue.file;
      // The whole section, written to a file (stdout is too small for ~23 s) and read back as base64 text.
      // Earlier previews are removed first and the mp3 once encoded, so the data folder never collects them.
      const dur = videoSeconds, base = roots.data + "/preview-" + token;
      const cmd = TOOL_PATH + "rm -f " + sq(roots.data) + "/preview-*.mp3 " + sq(roots.data) + "/preview-*.b64; "
        + "ffmpeg -nostdin -v error -y -ss " + section.toFixed(2) + " -t " + dur.toFixed(2) + " -i " + sq(file)
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
      setStatus({ tone: "error", say: (l) => t(l, "previewFailed", { detail: sayError(l, e) }) });
    }
  }

  async function findCandidates(rids: string[], pid: string, check: () => void) {
    const list: any[] = []; const failed: string[] = [];
    // Four clips per call keeps each scene search under runScript's fixed 30 s deadline (~10 s measured).
    // pageSize stays 4: hits are scene-level, so 8 adds almost no new times; the planner fills gaps with filler candidates.
    for (let i = 0; i < rids.length; i += 4) {
      advance("shots", i / rids.length, (l) => t(l, "clipsChecked", { done: i, count: rids.length }));
      const r = await run("Search city shots", fill(assets.scripts.searchJs, { projectId: pid, rids: rids.slice(i, i + 4), queries: CWV_QUERIES, pageSize: 4 }));
      check();
      list.push(...r.candidates); failed.push(...r.failed);
    }
    return { list, failed };
  }

  async function build(nextSeed: number) {
    if (busyRef.current || !assets || !inventory || !roots) return;
    if (cueId === "own" && !ownMusic) { setStatus({ tone: "error", say: (l) => t(l, "dropMusic") }); return; }
    if (ownMusic && !ownDuration) { setStatus({ tone: "error", say: (l) => t(l, "musicLengthUnread") }); return; }
    const pid = projectId;
    const check = () => { if (projectRef.current !== pid) throw STALE; };
    // The title and look inputs as they are at Build; a later "Finish title and look" retry reuses them.
    const look = { line1, connector, place, preset, warm, clipSound, cue: ownMusic ? "own" : cueId };
    busyRef.current = true;
    stopPreview();
    setBusy(true); setStatus(null); setResult(null);
    advance("shots", 0);
    try {
      const key = pid + "|" + JSON.stringify(only);
      const rids: string[] = inventory.resources.filter((r: any) => !only || only.includes(r.rid)).map((r: any) => r.rid);
      const dur: Record<string, number> = Object.fromEntries(inventory.resources.map((r: any) => [r.rid, r.duration]));
      const cached = candidates && candidates.key === key ? candidates : null;
      let found = cached;
      if (!cached || cached.failed.length) {
        // Search everything the first time; afterwards retry only the clips whose search failed.
        const todo: string[] = cached ? cached.failed : rids;
        const fresh = await findCandidates(todo, pid, check);
        const retried = new Set(todo);
        found = { key, failed: fresh.failed,
          list: [...(cached ? cached.list.filter((c: any) => !retried.has(c.rid)) : []), ...fresh.list.map((c: any) => ({ ...c, sourceDuration: dur[c.rid] || 0 }))] };
        setCandidates(found);
      }
      advance("shots", 1);
      // Photos join as candidates without a search: each can fill one slot.
      const photoCands = photoCandsOf(inventory, onlyPhotos, usePhotos);
      const fitted = cwvFitMontage({ bpm: grid.bpm, sectionStart: start ?? 0, usableEnd: grid.usableEnd, requested });
      if (!fitted) throw uiError((l) => t(l, "sectionTooShort"));
      // Plan at 30 fps for allocation, with the cuts snapped to the music's onsets; assembly places the same cut seconds
      // at the Draft's real rate.
      const plan = cwvPlanBuild({ candidates: found.list.concat(photoCands), bpm: grid.bpm, fps: 30, montageShots: fitted, seed: String(nextSeed), burst, sectionStart: musicStart, ...snapCuts });
      if (!plan.ok) {
        const unchecked = found.failed.length, withPhotos = photoCands.length > 0, orPhotos = usePhotos;
        throw uiError((l) => [
          withPhotos ? t(l, "foundShotsPhotos", { count: plan.usableShots, photos: plan.photoShots, needed: plan.needed }) : t(l, "foundShots", { count: plan.usableShots, needed: plan.needed }),
          orPhotos ? t(l, "addFootagePhotos") : t(l, "addFootage"),
          unchecked ? t(l, "retryUnchecked", { count: unchecked }) : "",
        ].filter(Boolean).join(t(l, "gap")));
      }
      advance("music", 0);
      const music = cueId === "none" ? null
        : await run("Add music to the project", fill(assets.scripts.ensureJs, { projectId: pid, path: ownMusic ? ownMusic.path : roots.plugin + "/assets/cues/" + cue.file }), true);
      check();
      // Cut seconds from the section start: the grid, or the onset-snapped cuts (planner cwvSchedule `cuts`).
      const boundaries: number[] = plan.schedule.cuts;
      advance("music", 1);
      advance("draft", 0);
      // Photo sizes the inventory has not measured yet stay out; assemble.js measures those itself.
      const crops = Object.fromEntries([...inventory.resources, ...(inventory.photos || []).filter((r: any) => r.width > 0 && r.height > 0)]
        .map((r: any) => [r.rid, { width: r.width, height: r.height }]));
      const name = "City Weekend Vlog " + new Date().toISOString().slice(0, 16).replace("T", " ");
      const a = await run("Assemble City Weekend Vlog", fill(assets.scripts.assembleJs, {
        projectId: pid, draftName: name, picks: plan.picks, boundaries, crops,
        music: music ? { resourceId: music.resourceId, sectionStart: start ?? 0 } : null, clipSound, ambientDb: AMBIENT_DB }), true);
      check();
      if (!a.sequenceId) throw uiError((l) => t(l, "draftNoId", { name }));
      // The title events at the Draft's rate from the same cut seconds, so each font switch stays on its cut.
      const sched = cwvSchedule({ bpm: grid.bpm, fps: a.fps, montageShots: plan.montageShots, burst, sectionStart: musicStart, cuts: boundaries });
      // The planner drops montage shots when the footage cannot fill them; tell the user the real length at the Draft fps.
      const shortened = plan.montageShots < fitted ? { shots: plan.montageShots, seconds: sched.totalFrames / a.fps,
        fullSeconds: cwvSchedule({ bpm: grid.bpm, fps: a.fps, montageShots: fitted, burst, sectionStart: musicStart }).totalFrames / a.fps } : null;
      advance("draft", 1);
      setResult({ sequenceId: a.sequenceId, decorated: false, sched, plan, seed: nextSeed, mute: clipSound === "off", look, notes: a.notes || [], link: null, shortened, unchecked: found.failed.length });
      await decorate(a.sequenceId, sched, plan, nextSeed, clipSound === "off", look, check);
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
    const check = () => { if (projectRef.current !== pid) throw STALE; };
    busyRef.current = true; stopPreview(); setBusy(true); setStatus(null);
    try { await decorate(result.sequenceId, result.sched, result.plan, result.seed, result.mute !== false, result.look, check); }
    catch (e: any) { if (e !== STALE && projectRef.current === pid) setStatus({ tone: "error", say: stopAt(e) }); }
    finally { endRun(pid); }
  }

  // Commit 2 (mute the clips' own sound when Clip sound is Off, title and warm look), then open the Draft.
  // decorate.js skips what an earlier attempt already added.
  async function decorate(sequenceId: string, sched: any, plan: any, usedSeed: number, mute: boolean, look: any, check: () => void) {
    advance("look", 0);
    const { line1, connector, place, preset, warm, clipSound } = look;
    // Inspector labels are written into the Draft in the UI language at build time; they do not follow a later switch.
    const bl = langRef.current;
    try {
      const p = assets.presets.presets.find((x: any) => x.id === preset);
      const files = [...new Set(STATE_KEYS.map((k) => p.states[k].file))];
      const fonts = await Promise.all(files.map(async (f) => {
        const s = Object.values(p.states).find((x: any) => x.file === f) as any;
        return { family: s.family, style: s.style, weight: s.weight, b64: await fontB64(roots!.plugin, f) };
      }));
      const parameters = { line1, connector, place, fontFamily: "", ink: "#F6ECB8", shadow: p.shadow, size: 150, rotation: -7, position: 46,
        events: sched.title, states: p.states, fonts, provenance: { plugin: PLUGIN_ID, version: "0.1.0-alpha.1", preset, cue: look.cue, seed: usedSeed, clipSound, picks: plan.picks } };
      const editableParameters = [
        { key: "line1", label: t(bl, "firstLine"), type: "text", defaultValue: line1 },
        { key: "connector", label: t(bl, "connector"), type: "text", defaultValue: connector },
        { key: "place", label: t(bl, "place"), type: "text", defaultValue: place },
        { key: "fontFamily", label: t(bl, "param.font"), type: "text", defaultValue: "" },
        { key: "ink", label: t(bl, "param.color"), type: "color", defaultValue: "#F6ECB8" },
        { key: "shadow", label: t(bl, "param.shadow"), type: "number", defaultValue: p.shadow, min: 0, max: 1, step: 0.05 },
        { key: "size", label: t(bl, "param.size"), type: "number", defaultValue: 150, min: 60, max: 240, step: 2 },
        { key: "rotation", label: t(bl, "param.tilt"), type: "number", defaultValue: -7, min: -20, max: 20, step: 1 },
        { key: "position", label: t(bl, "param.height"), type: "number", defaultValue: 46, min: 20, max: 80, step: 1 },
      ];
      const motionOptions = MOTION_OPTIONS.map((o) => ({ label: tOr(bl, "motion." + o.value, o.label), value: o.value }));
      const labels = { motion: t(bl, "param.motion"), motionStrength: t(bl, "param.motionStrength"), warmth: t(bl, "param.warmth") };
      // Photos in this Draft and a planned motion for each montage photo (title photos stay still).
      const photoRids = [...new Set(plan.picks.filter((k: any) => k && k.kind === "photo").map((k: any) => k.rid as string))];
      const sizes: Record<string, { width: number; height: number }> = { ...photoSizesRef.current };
      const moves = cwvPhotoMotions(plan.picks, String(usedSeed), sizes, sched.titleSlots);
      const byRid: Record<string, any> = {};
      plan.picks.forEach((k: any, i: number) => {
        if (!moves[i]) return;
        const sz = sizes[k.rid];
        // The clip's cover-crop scale, so the motion's drift stays inside the photo.
        const cover = sz ? Math.max(1080 / sz.width, 1920 / sz.height) / Math.min(1080 / sz.width, 1920 / sz.height) : 1;
        byRid[k.rid] = { ...moves[i], cover };
      });
      await run("Add title and look", fill(assets.scripts.decorateJs, { sequenceId, mute, titleEnd: sched.title.endFrame, title: { tsx: assets.titleTsx, parameters, editableParameters }, warm: warm ? { tsx: assets.warmTsx, strength: 0.35 } : null,
        photos: photoRids, motion: { tsx: assets.motionTsx, strength: 1, options: motionOptions, byRid }, photoEffects: PHOTO_EFFECTS, labels }), true);
    } catch (e: any) {
      if (e === STALE) throw e;
      throw uiError((l) => t(l, "finishFailed", { detail: sayError(l, e) }));
    }
    check();
    // The title is saved from here on, so a failed open must not offer the retry.
    setResult((r: any) => ({ ...r, decorated: true }));
    advance("open", 0);
    try {
      const o = await run("Open the new Draft", "const id = " + JSON.stringify(sequenceId) + ";\n"
        + "let link = null, openError = null;\n"
        + "try { link = (await selects.editor.linkToDraftFrame(id, 0)).deepLinkUrl; } catch (e) { link = null; }\n"
        + "try { await selects.editor.openDraft(id); } catch (e) { openError = String((e && e.message) || e); }\n"
        + "return { link, openError };");
      check();
      setResult((r: any) => ({ ...r, link: o.link || null }));
      if (o.openError) throw new Error(o.openError);
      advance("open", 1);
    } catch (e: any) {
      if (e === STALE) throw e;
      setStatus({ tone: "error", say: (l) => t(l, "openFailed", { detail: sayError(l, e) }) });
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
  // Photos only: every shot is a photo, so a build needs as many photos as the title and the shortest montage have slots.
  const canBuild = !!inventory && (selectedRids.length > 0 || usedPhotoCount >= minShots);
  // Once a build has searched the current selection, the footage's montage capacity is known: plan it for the readiness line.
  const candKey = projectId + "|" + JSON.stringify(only);
  const fitsShots = React.useMemo(() => {
    if (!candidates || candidates.key !== candKey || !(grid.bpm > 0)) {
      // With no video selected there is nothing to search: the photos alone decide the fit.
      if (!inventory || selectedRids.length || !(grid.bpm > 0)) return null;
      const p = cwvPlanBuild({ candidates: photoCandsOf(inventory, onlyPhotos, usePhotos), bpm: grid.bpm, fps: 30, montageShots: requested, seed: String(seed), burst, sectionStart: musicStart, ...snapCuts });
      return p.ok ? p.montageShots : null;
    }
    const p = cwvPlanBuild({ candidates: candidates.list.concat(photoCandsOf(inventory, onlyPhotos, usePhotos)), bpm: grid.bpm, fps: 30, montageShots: requested, seed: String(seed), burst, sectionStart: musicStart, ...snapCuts });
    return p.ok ? p.montageShots : null;
  }, [candidates, candKey, grid.bpm, requested, seed, inventory, onlyPhotos, usePhotos, burst, musicStart, grid.onsets, grid.accepted]);
  // The readiness line. Whole sentences are joined with STRINGS `gap` (a space; nothing in Japanese and Chinese) and
  // the facts of the Ready line with " · ".
  const analysisText = cwvAnalysisText(L, invAnalysis);
  const readyFacts = !inventory ? "" : [
    allRids.length ? (only ? t(L, "clipsSelected", { selected: selectedRids.length, count: allRids.length }) : t(L, "clips", { count: allRids.length })) : "",
    usePhotos && allPhotoRids.length ? (onlyPhotos ? t(L, "photosSelected", { selected: selectedPhotoRids.length, count: allPhotoRids.length }) : t(L, "photos", { count: allPhotoRids.length })) : "",
    fitsShots != null && fitsShots < requested ? t(L, "fitsShots", { count: fitsShots }) : "",
    t(L, "aboutSeconds", { seconds: Math.round(fitsShots != null && fitsShots < requested ? cwvVideoSeconds(grid.bpm, fitsShots) : videoSeconds) }),
    ...cwvAnalysisNotes(L, invAnalysis),
  ].filter(Boolean).join(" · ");
  const readiness = !inventory ? (invError ? t(L, "readFailed", { detail: invError.say(L) }) : t(L, "checkingClipsNow"))
    : inventory.resources.length === 0 && !allPhotoRids.length ? (analysisText || t(L, "noFootage"))
    : inventory.resources.length === 0 && !usePhotos ? [analysisText, t(L, "turnOnPhotos")].filter(Boolean).join(t(L, "gap"))
    : selectedRids.length === 0 && usedPhotoCount === 0 ? t(L, "noClipsSelected")
    : !canBuild ? [t(L, "onlyPhotos", { count: usedPhotoCount, needed: minShots }), analysisText].filter(Boolean).join(t(L, "gap"))
    : t(L, "ready", { summary: readyFacts });
  const stepText = step === "checking" ? t(L, "checkingClips") : step === "listening" ? t(L, "listening") : "";
  const progressLabel = !progress ? "" : progress.detail
    ? t(L, "progressDetail", { step: progress.current + 1, total: CWV_BUILD_STEPS.length, name: t(L, "step." + progress.id), detail: progress.detail(L), percent: progress.percent })
    : t(L, "progress", { step: progress.current + 1, total: CWV_BUILD_STEPS.length, name: t(L, "step." + progress.id), percent: progress.percent });
  const peaks: number[] = grid.peaks || [];
  const total = ownMusic ? (ownDuration || 1) : (cue ? cue.duration : 1);
  const silent = cueId === "none" && !ownMusic && clipSound === "off";
  const canOwnMusic = tools.ffmpeg && tools.node;
  const presetList: any[] = assets?.presets.presets || [];
  const chosen = presetList.find((x) => x.id === preset) || null;
  const swapKey = STATE_KEYS[tick % STATE_KEYS.length];
  const placeText = place.trim();
  // Fixed preview geometry: the largest state scale across all presets (never below PREVIEW_MAX_SCALE_FLOOR).
  const maxScale = presetList.reduce((m, p) => Math.max(m, ...STATE_KEYS.map((k) => Number(p.states?.[k]?.scale) || 1)), PREVIEW_MAX_SCALE_FLOOR);
  const bigSlot = Math.ceil(PREVIEW_BIG * maxScale * 1.3), smallSlot = Math.ceil(PREVIEW_SMALL * maxScale * 1.3);
  // Three slots plus gaps, and room for the -7 degree tilt.
  const previewBox = bigSlot * 2 + smallSlot + 4 + 40;
  const slotStyle = (h: number) => ({ height: h, maxWidth: "100%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "visible" }) as any;

  if (!projectId) return <ui.Message tone="error">{t(L, "openProject")}</ui.Message>;

  return (
    <ui.Stack gap={16}>
      <ui.Row gap={8} align="center">
        <ui.Message tone={!inventory && invError ? "error" : "muted"}>{readiness}</ui.Message>
        <ui.Button variant="ghost" busy={invLoading} busyLabel={t(L, "refreshing")} disabled={busy || !assets} onClick={() => loadInventory()}>{t(L, "refresh")}</ui.Button>
      </ui.Row>
      {inventory && invError ? <ui.Message tone="error">{t(L, "refreshFailed", { detail: invError.say(L) })}</ui.Message> : null}
      <ui.Section title={t(L, "title")}>
        <ui.TextField label={t(L, "firstLine")} value={line1} onChange={setLine1} />
        <ui.TextField label={t(L, "connector")} value={connector} onChange={setConnector} />
        <ui.TextField label={t(L, "place")} value={place} onChange={setPlace} />
        {chosen ? (
          // Live preview: the swapping line (place, or line 1 when place is empty) cycles the preset's A/B/C/D states.
          // Every line sits in a fixed-height slot sized for the largest scale of any preset, so the box keeps one height
          // while the fonts cycle and when the preset changes; long text shrinks via previewSize and never wraps.
          <div aria-label={t(L, "titlePreview")} style={{ background: "#26231f", borderRadius: 8, height: previewBox, boxSizing: "border-box", padding: "0 12px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ transform: "rotate(-7deg)", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, width: "100%", minWidth: 0, color: "#F6ECB8", lineHeight: 1, textAlign: "center", whiteSpace: "nowrap", textShadow: "0 2px 8px rgba(0,0,0," + chosen.shadow + ")" }}>
              <div style={{ ...slotStyle(bigSlot), ...faceStyle(chosen.states[placeText ? "A" : swapKey], line1), fontSize: previewSize(line1, PREVIEW_BIG, chosen.states[placeText ? "A" : swapKey].scale) }}>{line1 || "\u00a0"}</div>
              {placeText ? <div style={{ ...slotStyle(smallSlot), ...faceStyle(chosen.states.A, connector), fontSize: PREVIEW_SMALL * chosen.states.A.scale }}>{connector}</div> : null}
              {placeText ? <div style={{ ...slotStyle(bigSlot), ...faceStyle(chosen.states[swapKey], placeText), fontSize: previewSize(placeText, PREVIEW_BIG, chosen.states[swapKey].scale) }}>{placeText}</div> : null}
            </div>
          </div>
        ) : null}
      </ui.Section>
      <ui.Section title={t(L, "fontStyle")}>
        <div role="group" aria-label={t(L, "fontStyle")} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {presetList.map((p) => {
            const on = p.id === preset;
            return (
              <button key={p.id} type="button" aria-pressed={on} disabled={busy} onClick={() => setPreset(p.id)}
                style={{ flex: "1 1 96px", minWidth: 0, minHeight: 52, padding: "8px 6px", borderRadius: 8, cursor: busy ? "default" : "pointer", color: "inherit",
                  background: on ? "color-mix(in srgb, var(--panel-accent, #f6c343) 16%, transparent)" : "transparent", border: on ? "2px solid var(--panel-accent, #f6c343)" : "1px solid var(--panel-border, rgba(128, 128, 128, 0.45))",
                  ...faceStyle(p.states.A, tOr(L, "preset." + p.id, p.label)), textTransform: "none", fontSize: 20 * (p.states.A.scale || 1), lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {tOr(L, "preset." + p.id, p.label)}
              </button>
            );
          })}
        </div>
      </ui.Section>
      <ui.Section title={t(L, "music")}>
        <ui.Select label={t(L, "track")} value={ownMusic ? "own" : cueId} onChange={(v: string) => { setCueId(v); if (v !== "own") { setOwnMusic(null); setOwnGrid(null); } }}
          options={[...(assets?.manifest.cues || []).map((c: any) => ({ label: c.label, value: c.id })), ...(canOwnMusic ? [{ label: t(L, "ownMusic"), value: "own" }] : []), { label: t(L, "noMusic"), value: "none" }]} />
        {(ownMusic || cueId === "own") && canOwnMusic ? <ui.FileDrop accept={["audio"]} value={ownMusic} disabled={busy}
          onChange={(f: any) => { if (f) detectOwnMusic(f); else { setOwnMusic(null); setOwnGrid(null); } }} /> : null}
        {ownMusic && grid.faint ? <ui.Message tone="muted">{t(L, "faintTiming", { bpm: Math.round(grid.bpm) })}</ui.Message> : null}
        {!canOwnMusic ? <ui.Message tone="muted">{t(L, "installTools")}</ui.Message> : null}
        {ownMusic || cue ? (
          // Esc on the slider or the preview button (the key bubbles up here) stops the preview.
          <div onKeyDown={(e) => { if (e.key === "Escape" && playState !== "idle") { e.preventDefault(); stopPreview(); } }}>
            <SectionSlider lang={L} peaks={peaks} total={total} section={section} videoSeconds={videoSeconds} barSeconds={(4 * 60) / grid.bpm}
              snap={snap} onChange={setSection} disabled={busy} audio={playingAudio} />
            <ui.Row gap={8} align="center">
              {/* The kit has no stop icon; "pause" marks stop, and the label says what it does. */}
              <ui.IconButton icon={playState === "playing" ? "pause" : playState === "loading" ? "loading" : "play"}
                label={playState === "playing" ? t(L, "stopPreview") : playState === "loading" ? t(L, "cancelPreview") : t(L, "previewSection")}
                onClick={preview} disabled={busy || !tools.ffmpeg || (playState === "idle" && section == null)} />
              <span>{ownMusic && !ownDuration ? (busy ? t(L, "readingMusic") : t(L, "musicLengthUnknown"))
                : section == null ? t(L, "musicTooShort") : t(L, "startsAt", { seconds: Math.round(section * 10) / 10 })}</span>
            </ui.Row>
          </div>
        ) : null}
      </ui.Section>
      <ui.Section title={t(L, "advanced")}>
        <ui.Segmented label={t(L, "length")} value={length} onChange={setLength}
          options={[{ label: t(L, "length.short"), value: "short" }, { label: t(L, "length.standard"), value: "standard" }, { label: t(L, "length.long"), value: "long" }]} />
        <ui.Segmented label={t(L, "clipSound")} value={clipSound} onChange={setClipSound}
          options={[{ label: t(L, "sound.off"), value: "off" }, { label: t(L, "sound.ambient"), value: "ambient" }, { label: t(L, "sound.full"), value: "full" }]} />
        <ui.Toggle label={t(L, "warmLook")} value={warm} onChange={setWarm} />
        <ui.Toggle label={t(L, "usePhotos")} value={usePhotos} onChange={setUsePhotos} />
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
                const hint = shapeHint(L, r.width, r.height);
                const meta = fmtTime(r.duration) + (hint ? " · " + hint : "");
                return (
                  <label key={r.rid} title={r.name + " · " + meta}
                    style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, padding: "4px 6px", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>
                    <input type="checkbox" checked={on} disabled={busy} onChange={(e) => toggleClip(r.rid, e.currentTarget.checked)} style={{ flexShrink: 0, margin: 0 }} />
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
      {progress ? <ui.Progress value={progress.value} label={progressLabel} steps={CWV_BUILD_STEPS.map((s) => t(L, "step." + s.id))} current={progress.current} />
        : busy ? <ui.Progress label={stepText || t(L, "working")} /> : null}
      {status ? <ui.Message tone={status.tone === "error" ? "error" : "muted"}>{status.say(L)}</ui.Message> : null}
      {result && result.decorated ? (
        <ui.Message tone="success">
          {t(L, "draftCreated")}
        </ui.Message>
      ) : result && busy ? <ui.Message tone="muted">{t(L, "draftCreatedAdding")}</ui.Message> : null}
      {result?.link ? (
        <ui.Row gap={8} align="center">
          <a href={result.link} target="_blank" rel="noreferrer">{t(L, "openDraft")}</a>
          <ui.IconButton icon="copy" label={t(L, "copyLink")} onClick={() => { navigator.clipboard?.writeText(result.link).catch(() => null); }} />
        </ui.Row>
      ) : null}
      {result?.shortened ? (
        <ui.Message tone="muted">
          {t(L, "shortened", { count: result.shortened.shots, seconds: Math.round(result.shortened.seconds), fullSeconds: Math.round(result.shortened.fullSeconds) })}
        </ui.Message>
      ) : null}
      {result?.notes?.length ? <ui.Message tone="muted">{t(L, "note", { detail: result.notes.join("; ") })}</ui.Message> : null}
      {result?.unchecked ? <ui.Message tone="muted">{t(L, "unchecked", { count: result.unchecked })}</ui.Message> : null}
      {result?.plan?.adjacentRepeats ? (
        <ui.Message tone="muted">
          {t(L, "adjacentRepeats", { count: result.plan.adjacentRepeats })}
        </ui.Message>
      ) : null}
      <ui.Actions>
        {result && !result.decorated ? <ui.Button onClick={finishTitle} disabled={busy}>{t(L, "finishTitle")}</ui.Button> : null}
        {result ? <ui.Button onClick={buildAnother} disabled={busy}>{t(L, "anotherVersion")}</ui.Button> : null}
        <ui.Button variant="primary" busy={busy} busyLabel={stepText || t(L, "building")} onClick={() => build(seed)} disabled={busy || !canBuild}>{t(L, "build")}</ui.Button>
      </ui.Actions>
    </ui.Stack>
  );
}
