// @name THE END Credits
// @collection visual-highlights
// @name:de THE END Abspann
// @name:en THE END Credits
// @name:es Créditos THE END
// @name:fr Générique THE END
// @name:it Titoli di coda THE END
// @name:ja THE END エンドロール
// @name:ko THE END Credits
// @name:pt Créditos THE END
// @name:tr THE END Jeneriği
// @name:zh THE END 片尾字幕
// @icon video
// Builds a cinematic "THE END" ending as a new, editable Draft: a typed serif title, a slow credit roll, and your
// shots cut on the music's phrases inside a window (Classic) or full frame.
import React from "react";

// STRINGS:BEGIN
const STRINGS = {
  en: {
    openProject: "Open a Project to build THE END Credits.",
    refresh: "Refresh",
    refreshing: "Refreshing",
    refreshFailed: "Could not refresh the clip list: {detail}",
    readFailed: "Could not read the clips in this Project: {detail}",
    checkingClipsNow: "Checking clips…",
    checkingClips: "Checking clips",
    listening: "Listening for the beat",
    working: "Working",
    noFootage: "No videos or photos in this Project yet. Add video clips or photos; this updates automatically.",
    analysedBetter: "Analysed clips give better picks.",
    stillImporting: { one: "{count} clip is still being imported; this updates automatically.", other: "{count} clips are still being imported; this updates automatically." },
    turnOnPhotos: "Turn on Use photos in Advanced to build from this Project's photos.",
    noClipsSelected: "No clips selected. Choose clips in Advanced.",
    needsShots: { one: "Needs at least {count} usable clip or photo (found {found}).", other: "Needs at least {count} usable clips or photos (found {found})." },
    addFootage: "Add more varied footage or select more clips.",
    addFootagePhotos: "Add more varied footage or photos.",
    addFootagePhotosSelect: "Add more varied footage or photos, or select more clips.",
    retryUnchecked: { one: "Could not check {count} clip; press Build to retry it.", other: "Could not check {count} clips; press Build to retry them." },
    gap: " ",
    listSep: ", ",
    ready: "Ready: {summary}",
    clips: { one: "{count} clip", other: "{count} clips" },
    clipsSelected: { one: "{selected} of {count} clip selected", other: "{selected} of {count} clips selected" },
    photos: { one: "{count} photo", other: "{count} photos" },
    photosSelected: { one: "{selected} of {count} photo selected", other: "{selected} of {count} photos selected" },
    shots: { one: "{count} shot", other: "{count} shots" },
    shotsFitted: { one: "{count} shot (your footage fits {count})", other: "{count} shots (your footage fits {count})" },
    aboutSeconds: "about {seconds} s",
    layout: "Layout",
    "layout.classic": "Classic (window)",
    "layout.full": "Full frame",
    title: "Title",
    credits: "Credits",
    preset: "Preset",
    "preset.filmCrew": "Film crew",
    "preset.personal": "Personal",
    "preset.travel": "Travel",
    creditRows: "Credit rows",
    creditN: "Credit {n}",
    roleN: "Role {n}",
    nameN: "Name {n}",
    rolePlaceholder: "Role (e.g. Director)",
    namePlaceholder: "Name",
    resetPreset: "Reset to preset",
    "list.reorderHandle": "Reorder row {n}: {label}",
    "list.removeRow": "Remove row {n}",
    "list.moved": "{label} moved to position {pos} of {total}",
    "list.addRow": "Add row",
    noRows: "No rows: the roll shows only the title.",
    rowsHint: "Rows with both fields empty are left out. Replace text in [brackets] with your own.",
    placeholdersLeft: { one: "{count} row still has a placeholder.", other: "{count} rows still have placeholders." },
    systemFont: "Some characters use a system font.",
    length: "Length",
    "length.short": "Short",
    "length.standard": "Standard",
    "length.long": "Long",
    music: "Music",
    track: "Track",
    ownMusic: "Your own music",
    noMusic: "No music",
    dropAudio: "Drop an audio file (mp3, wav, m4a…) that is on this computer.",
    needsNewerSelects: "This needs a newer version of Selects.",
    noSteadyBeat: "No steady beat found: shots are {seconds} s.",
    beatApprox: "Beat found (approximate): shots follow it at {seconds} s.",
    sectionHint: "Music section — drag to choose",
    sectionLabel: "Music section",
    musicTooShort: "This music is too short for this length",
    startsAt: "Starts at {seconds} s",
    startsAtSwell: "Starts at {seconds} s · reveal on the swell",
    startsAtLoudest: "Starts at {seconds} s · reveal on the loudest part",
    stopPreview: "Stop preview",
    cancelPreview: "Cancel preview",
    previewWhole: "Preview the music of the whole video",
    readingMusic: "Reading the music…",
    tooShortFor: "This track is too short for {length}.",
    useLength: "Use {length}",
    tooShortNeeds: "This track is too short (needs ≥ {seconds} s).",
    silentVideo: "Silent video: no music and Clip sound is Off.",
    advanced: "Advanced",
    clipSound: "Clip sound",
    "sound.ambient": "Ambient",
    "sound.full": "Full",
    "sound.off": "Off",
    cinematicLook: "Cinematic look",
    usePhotos: "Use photos",
    usePhotosOff: "Use photos is off",
    chooseClips: "Choose clips",
    chooseClipsCount: "Choose clips ({selected}/{total})",
    all: "All",
    none: "None",
    photo: "Photo",
    "shape.tall": "Tall",
    "shape.wide": "Wide",
    "shape.square": "Square",
    preview: "Preview",
    creditsPreview: "Credits preview",
    previewAt: "Preview at",
    secondsUnit: "s",
    firstRow: "First row",
    lastRow: "Last row",
    end: "End",
    noCreditRows: "No credit rows: the roll shows only the title.",
    rowHidden: "Row {from} won't appear in {length}: {names}.",
    rowsHidden: "Rows {from}–{to} won't appear in {length}: {names}.",
    dropRows: { one: "To roll every row off before the end, remove {count} row.", other: "To roll every row off before the end, remove {count} rows." },
    dropRowsOrLong: { one: "To roll every row off before the end, remove {count} row or choose {long}.", other: "To roll every row off before the end, remove {count} rows or choose {long}." },
    tooManyRows: { one: "Too many rows to roll off before the end: remove {count} row.", other: "Too many rows to roll off before the end: remove {count} rows." },
    tooManyRowsOrLong: { one: "Too many rows to roll off before the end: remove {count} row or choose {long}.", other: "Too many rows to roll off before the end: remove {count} rows or choose {long}." },
    creditsEndEarly: "Credits finish before the end: the roll moves on into black.",
    "step.prepare": "Finding shots",
    "step.plan": "Planning the edit",
    "step.music": "Preparing music",
    "step.assemble": "Creating Draft",
    "step.decorate": "Adding credits and look",
    progress: "Step {step}/{total} · {name} · {percent}%",
    progressDetail: "Step {step}/{total} · {name} ({detail}) · {percent}%",
    videosChecked: { one: "{done}/{count} video checked", other: "{done}/{count} videos checked" },
    videosMeasured: { one: "{done}/{count} video measured", other: "{done}/{count} videos measured" },
    clipsChecking: { one: "Checking clip {done}/{count}", other: "Checking clips {done}/{count}" },
    openingDraft: "opening the Draft",
    stoppedAt: "Stopped at step {step}/{total} ({name}): {detail}",
    build: "Build",
    building: "Building",
    anotherVersion: "Try other shots",
    finishTitle: "Finish title and look",
    draftCreated: "Draft created. Select the credits to edit the title, rows, colours or roll speed in Adjust, a shot to move or resize its window, change its fades, motion or the look strength, and the music to change its volume.",
    draftCreatedAdding: "Draft created; adding credits and look…",
    openDraft: "Open the new Draft",
    copyLink: "Copy the link to the new Draft",
    shortened: { one: "Your footage fits {count} shot, so this video is about {seconds} s instead of {fullSeconds} s. Add more clips or photos for the full length.", other: "Your footage fits {count} shots, so this video is about {seconds} s instead of {fullSeconds} s. Add more clips or photos for the full length." },
    note: "Note: {detail}.",
    unchecked: { one: "Could not check {count} video; it was skipped. Build again to retry it.", other: "Could not check {count} videos; they were skipped. Build again to retry them." },
    startFailed: "THE END Credits could not start: {detail}. Reinstall the plugin if this persists.",
    foldersNotFound: "the plugin folders could not be found",
    stepFailed: "Selects could not complete this step.",
    musicUnreadable: "Could not read this music file ({detail}). Choose another file or one of the tracks.",
    beatFailed: "beat detection failed",
    previewFailed: "Could not play a preview: {detail}.",
    dropMusic: "Drop a music file, or choose one of the tracks.",
    trackTooShort: "This track is too short for this Length.",
    musicNotReady: "The music is not ready yet.",
    draftNoId: "The Draft \"{name}\" was saved, but Selects did not report its id, so the credits and look could not be added. Open it from the Drafts list, or build again.",
    finishFailed: "The Draft was created, but it could not be finished (credits, look and shot frames): {detail}. Press Finish title and look to try again.",
    openFailed: "The Draft is ready, but it could not be opened: {detail}. Use the link below or open it from the Drafts list.",
    "param.titleColor": "Title color",
    "param.creditColor": "Credits color",
    "param.rollSpeed": "Roll speed",
    "param.showTitle": "Show title",
    "param.windowX": "Window X (%)",
    "param.windowY": "Window Y (%)",
    "param.windowSize": "Window size (%)",
    "param.fadeIn": "Fade in (s)",
    "param.fadeOut": "Fade out (s)",
    "param.motion": "Motion",
    "param.motionStrength": "Motion strength",
    "param.lookStrength": "Look strength",
    "motion.none": "None",
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
    openProject: "Öffne ein Projekt, um THE END Credits zu erstellen.",
    refresh: "Aktualisieren",
    refreshing: "Wird aktualisiert",
    refreshFailed: "Die Clip-Liste konnte nicht aktualisiert werden: {detail}",
    readFailed: "Die Clips in diesem Projekt konnten nicht gelesen werden: {detail}",
    checkingClipsNow: "Clips werden geprüft …",
    checkingClips: "Clips werden geprüft",
    listening: "Beat wird gesucht",
    working: "In Arbeit",
    noFootage: "In diesem Projekt gibt es noch keine Videos oder Fotos. Füge Videoclips oder Fotos hinzu; die Anzeige aktualisiert sich automatisch.",
    analysedBetter: "Mit analysierten Clips wird die Auswahl der Einstellungen besser.",
    stillImporting: { one: "{count} Clip wird noch importiert; die Anzeige aktualisiert sich automatisch.", other: "{count} Clips werden noch importiert; die Anzeige aktualisiert sich automatisch." },
    turnOnPhotos: "Aktiviere „Fotos verwenden“ unter „Erweitert“, um aus den Fotos dieses Projekts zu erstellen.",
    noClipsSelected: "Keine Clips ausgewählt. Wähle Clips unter „Erweitert“.",
    needsShots: { one: "Braucht mindestens {count} brauchbaren Clip oder Foto ({found} gefunden).", other: "Braucht mindestens {count} brauchbare Clips oder Fotos ({found} gefunden)." },
    addFootage: "Füge abwechslungsreicheres Material hinzu oder wähle mehr Clips aus.",
    addFootagePhotos: "Füge abwechslungsreicheres Material oder Fotos hinzu.",
    addFootagePhotosSelect: "Füge abwechslungsreicheres Material oder Fotos hinzu oder wähle mehr Clips aus.",
    retryUnchecked: { one: "{count} Clip konnte nicht geprüft werden; drücke „Erstellen“, um es erneut zu versuchen.", other: "{count} Clips konnten nicht geprüft werden; drücke „Erstellen“, um es erneut zu versuchen." },
    gap: " ",
    listSep: ", ",
    ready: "Bereit: {summary}",
    clips: { one: "{count} Clip", other: "{count} Clips" },
    clipsSelected: { one: "{selected} von {count} Clip ausgewählt", other: "{selected} von {count} Clips ausgewählt" },
    photos: { one: "{count} Foto", other: "{count} Fotos" },
    photosSelected: { one: "{selected} von {count} Foto ausgewählt", other: "{selected} von {count} Fotos ausgewählt" },
    shots: { one: "{count} Einstellung", other: "{count} Einstellungen" },
    shotsFitted: { one: "{count} Einstellung (dein Material reicht für {count})", other: "{count} Einstellungen (dein Material reicht für {count})" },
    aboutSeconds: "ca. {seconds} s",
    layout: "Layout",
    "layout.classic": "Klassisch (Fenster)",
    "layout.full": "Vollbild",
    title: "Titel",
    credits: "Abspann",
    preset: "Vorlage",
    "preset.filmCrew": "Filmteam",
    "preset.personal": "Persönlich",
    "preset.travel": "Reise",
    creditRows: "Abspannzeilen",
    creditN: "Eintrag {n}",
    roleN: "Rolle {n}",
    nameN: "Name {n}",
    rolePlaceholder: "Rolle (z. B. Regie)",
    namePlaceholder: "Name",
    resetPreset: "Vorlage wiederherstellen",
    "list.reorderHandle": "Zeile {n} verschieben: {label}",
    "list.removeRow": "Zeile {n} entfernen",
    "list.moved": "{label} ist jetzt an Position {pos} von {total}",
    "list.addRow": "Zeile hinzufügen",
    noRows: "Keine Zeilen: Der Abspann zeigt nur den Titel.",
    rowsHint: "Zeilen mit zwei leeren Feldern werden weggelassen. Ersetze Text in [Klammern] durch deinen eigenen.",
    placeholdersLeft: { one: "{count} Zeile enthält noch einen Platzhalter.", other: "{count} Zeilen enthalten noch Platzhalter." },
    systemFont: "Einige Zeichen verwenden eine Systemschrift.",
    length: "Länge",
    "length.short": "Kurz",
    "length.standard": "Standard",
    "length.long": "Lang",
    music: "Musik",
    track: "Musikstück",
    ownMusic: "Eigene Musik",
    noMusic: "Keine Musik",
    dropAudio: "Lege eine Audiodatei (mp3, wav, m4a …) ab, die auf diesem Computer liegt.",
    needsNewerSelects: "Dafür wird eine neuere Version von Selects benötigt.",
    noSteadyBeat: "Kein gleichmäßiger Beat gefunden: Einstellungen dauern {seconds} s.",
    beatApprox: "Beat gefunden (ungefähr): Die Einstellungen folgen ihm alle {seconds} s.",
    sectionHint: "Musikabschnitt – zum Auswählen ziehen",
    sectionLabel: "Musikabschnitt",
    musicTooShort: "Diese Musik ist für diese Länge zu kurz",
    startsAt: "Beginnt bei {seconds} s",
    startsAtSwell: "Beginnt bei {seconds} s · Auftakt auf dem Höhepunkt",
    startsAtLoudest: "Beginnt bei {seconds} s · Auftakt auf dem lautesten Teil",
    stopPreview: "Vorschau stoppen",
    cancelPreview: "Vorschau abbrechen",
    previewWhole: "Musik für das ganze Video vorhören",
    readingMusic: "Musik wird gelesen …",
    tooShortFor: "Dieses Musikstück ist für „{length}“ zu kurz.",
    useLength: "„{length}“ verwenden",
    tooShortNeeds: "Dieses Musikstück ist zu kurz (braucht ≥ {seconds} s).",
    silentVideo: "Stummes Video: keine Musik und Clip-Ton ist „Aus“.",
    advanced: "Erweitert",
    clipSound: "Clip-Ton",
    "sound.ambient": "Leise",
    "sound.full": "Voll",
    "sound.off": "Aus",
    cinematicLook: "Kino-Look",
    usePhotos: "Fotos verwenden",
    usePhotosOff: "„Fotos verwenden“ ist aus",
    chooseClips: "Clips auswählen",
    chooseClipsCount: "Clips auswählen ({selected}/{total})",
    all: "Alle",
    none: "Keine",
    photo: "Foto",
    "shape.tall": "Hochformat",
    "shape.wide": "Querformat",
    "shape.square": "Quadrat",
    preview: "Vorschau",
    creditsPreview: "Abspann-Vorschau",
    previewAt: "Vorschau bei",
    secondsUnit: "s",
    firstRow: "Erste Zeile",
    lastRow: "Letzte Zeile",
    end: "Ende",
    noCreditRows: "Keine Abspannzeilen: Der Abspann zeigt nur den Titel.",
    rowHidden: "Zeile {from} erscheint bei „{length}“ nicht: {names}.",
    rowsHidden: "Zeilen {from}–{to} erscheinen bei „{length}“ nicht: {names}.",
    dropRows: { one: "Damit alle Zeilen vor dem Ende durchlaufen, entferne {count} Zeile.", other: "Damit alle Zeilen vor dem Ende durchlaufen, entferne {count} Zeilen." },
    dropRowsOrLong: { one: "Damit alle Zeilen vor dem Ende durchlaufen, entferne {count} Zeile oder wähle „{long}“.", other: "Damit alle Zeilen vor dem Ende durchlaufen, entferne {count} Zeilen oder wähle „{long}“." },
    tooManyRows: { one: "Zu viele Zeilen, um vor dem Ende durchzulaufen: Entferne {count} Zeile.", other: "Zu viele Zeilen, um vor dem Ende durchzulaufen: Entferne {count} Zeilen." },
    tooManyRowsOrLong: { one: "Zu viele Zeilen, um vor dem Ende durchzulaufen: Entferne {count} Zeile oder wähle „{long}“.", other: "Zu viele Zeilen, um vor dem Ende durchzulaufen: Entferne {count} Zeilen oder wähle „{long}“." },
    creditsEndEarly: "Der Abspann endet vor dem Videoende: Danach läuft er ins Schwarz weiter.",
    "step.prepare": "Einstellungen suchen",
    "step.plan": "Schnitt planen",
    "step.music": "Musik vorbereiten",
    "step.assemble": "Draft erstellen",
    "step.decorate": "Abspann und Look hinzufügen",
    progress: "Schritt {step}/{total} · {name} · {percent} %",
    progressDetail: "Schritt {step}/{total} · {name} ({detail}) · {percent} %",
    videosChecked: { one: "{done}/{count} Video geprüft", other: "{done}/{count} Videos geprüft" },
    videosMeasured: { one: "{done}/{count} Video gemessen", other: "{done}/{count} Videos gemessen" },
    clipsChecking: { one: "Clip wird geprüft {done}/{count}", other: "Clips werden geprüft {done}/{count}" },
    openingDraft: "Draft wird geöffnet",
    stoppedAt: "Abgebrochen bei Schritt {step}/{total} ({name}): {detail}",
    build: "Erstellen",
    building: "Wird erstellt",
    anotherVersion: "Andere Aufnahmen probieren",
    finishTitle: "Titel und Look fertigstellen",
    draftCreated: "Draft erstellt. Wähle den Abspann aus, um unter „Anpassen“ Titel, Zeilen, Farben oder Laufgeschwindigkeit zu ändern, eine Einstellung, um ihr Fenster zu verschieben oder zu skalieren, ihre Blenden, Bewegung oder die Look-Stärke zu ändern, und die Musik, um ihre Lautstärke zu ändern.",
    draftCreatedAdding: "Draft erstellt; Abspann und Look werden hinzugefügt …",
    openDraft: "Neuen Draft öffnen",
    copyLink: "Link zum neuen Draft kopieren",
    shortened: { one: "Dein Material reicht für {count} Einstellung, daher ist dieses Video etwa {seconds} s statt {fullSeconds} s lang. Füge für die volle Länge weitere Clips oder Fotos hinzu.", other: "Dein Material reicht für {count} Einstellungen, daher ist dieses Video etwa {seconds} s statt {fullSeconds} s lang. Füge für die volle Länge weitere Clips oder Fotos hinzu." },
    note: "Hinweis: {detail}.",
    unchecked: { one: "{count} Video konnte nicht geprüft werden und wurde übersprungen. Erstelle erneut, um es noch einmal zu versuchen.", other: "{count} Videos konnten nicht geprüft werden und wurden übersprungen. Erstelle erneut, um es noch einmal zu versuchen." },
    startFailed: "THE END Credits konnte nicht gestartet werden: {detail}. Installiere das Plugin neu, falls das Problem bestehen bleibt.",
    foldersNotFound: "die Plugin-Ordner wurden nicht gefunden",
    stepFailed: "Selects konnte diesen Schritt nicht abschließen.",
    musicUnreadable: "Diese Musikdatei konnte nicht gelesen werden ({detail}). Wähle eine andere Datei oder eines der Musikstücke.",
    beatFailed: "Beat-Erkennung fehlgeschlagen",
    previewFailed: "Die Vorschau konnte nicht abgespielt werden: {detail}.",
    dropMusic: "Lege eine Musikdatei ab oder wähle eines der Musikstücke.",
    trackTooShort: "Dieses Musikstück ist für diese Länge zu kurz.",
    musicNotReady: "Die Musik ist noch nicht bereit.",
    draftNoId: "Der Draft „{name}“ wurde gespeichert, aber Selects hat seine ID nicht gemeldet, daher konnten Abspann und Look nicht hinzugefügt werden. Öffne ihn in der Draft-Liste oder erstelle erneut.",
    finishFailed: "Der Draft wurde erstellt, konnte aber nicht fertiggestellt werden (Abspann, Look und Einstellungsfenster): {detail}. Drücke „Titel und Look fertigstellen“, um es erneut zu versuchen.",
    openFailed: "Der Draft ist fertig, konnte aber nicht geöffnet werden: {detail}. Nutze den Link unten oder öffne ihn in der Draft-Liste.",
    "param.titleColor": "Titelfarbe",
    "param.creditColor": "Abspannfarbe",
    "param.rollSpeed": "Laufgeschwindigkeit",
    "param.showTitle": "Titel anzeigen",
    "param.windowX": "Fenster X (%)",
    "param.windowY": "Fenster Y (%)",
    "param.windowSize": "Fenstergröße (%)",
    "param.fadeIn": "Einblenden (s)",
    "param.fadeOut": "Ausblenden (s)",
    "param.motion": "Bewegung",
    "param.motionStrength": "Bewegungsstärke",
    "param.lookStrength": "Look-Stärke",
    "motion.none": "Keine",
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
    openProject: "Abre un proyecto para crear THE END Credits.",
    refresh: "Actualizar",
    refreshing: "Actualizando",
    refreshFailed: "No se pudo actualizar la lista de clips: {detail}",
    readFailed: "No se pudieron leer los clips de este proyecto: {detail}",
    checkingClipsNow: "Comprobando clips…",
    checkingClips: "Comprobando clips",
    listening: "Buscando el ritmo",
    working: "Trabajando",
    noFootage: "Este proyecto aún no tiene vídeos ni fotos. Añade clips de vídeo o fotos; se actualizará automáticamente.",
    analysedBetter: "Los clips analizados permiten elegir mejores planos.",
    stillImporting: { one: "{count} clip aún se está importando; se actualizará automáticamente.", many: "{count} de clips aún se están importando; se actualizará automáticamente.", other: "{count} clips aún se están importando; se actualizará automáticamente." },
    turnOnPhotos: "Activa «Usar fotos» en «Avanzado» para crear con las fotos de este proyecto.",
    noClipsSelected: "No hay clips seleccionados. Elige clips en «Avanzado».",
    needsShots: { one: "Necesita al menos {count} clip o foto utilizable (encontrados: {found}).", many: "Necesita al menos {count} de clips o fotos utilizables (encontrados: {found}).", other: "Necesita al menos {count} clips o fotos utilizables (encontrados: {found})." },
    addFootage: "Añade material más variado o selecciona más clips.",
    addFootagePhotos: "Añade material más variado o fotos.",
    addFootagePhotosSelect: "Añade material más variado o fotos, o selecciona más clips.",
    retryUnchecked: { one: "No se pudo comprobar {count} clip; pulsa «Crear» para reintentarlo.", many: "No se pudieron comprobar {count} de clips; pulsa «Crear» para reintentarlo.", other: "No se pudieron comprobar {count} clips; pulsa «Crear» para reintentarlo." },
    gap: " ",
    listSep: ", ",
    ready: "Listo: {summary}",
    clips: { one: "{count} clip", many: "{count} de clips", other: "{count} clips" },
    clipsSelected: { one: "{selected} de {count} clip seleccionado", many: "{selected} de {count} de clips seleccionados", other: "{selected} de {count} clips seleccionados" },
    photos: { one: "{count} foto", many: "{count} de fotos", other: "{count} fotos" },
    photosSelected: { one: "{selected} de {count} foto seleccionada", many: "{selected} de {count} de fotos seleccionadas", other: "{selected} de {count} fotos seleccionadas" },
    shots: { one: "{count} plano", many: "{count} de planos", other: "{count} planos" },
    shotsFitted: { one: "{count} plano (tu material da para {count})", many: "{count} de planos (tu material da para {count})", other: "{count} planos (tu material da para {count})" },
    aboutSeconds: "unos {seconds} s",
    layout: "Diseño",
    "layout.classic": "Clásico (ventana)",
    "layout.full": "Pantalla completa",
    title: "Título",
    credits: "Créditos",
    preset: "Plantilla",
    "preset.filmCrew": "Equipo de rodaje",
    "preset.personal": "Personal",
    "preset.travel": "Viaje",
    creditRows: "Filas de créditos",
    creditN: "Crédito {n}",
    roleN: "Función {n}",
    nameN: "Nombre {n}",
    rolePlaceholder: "Función (p. ej., Dirección)",
    namePlaceholder: "Nombre",
    resetPreset: "Restablecer plantilla",
    "list.reorderHandle": "Reordenar la fila {n}: {label}",
    "list.removeRow": "Quitar la fila {n}",
    "list.moved": "{label} se movió a la posición {pos} de {total}",
    "list.addRow": "Añadir fila",
    noRows: "Sin filas: los créditos solo muestran el título.",
    rowsHint: "Las filas con ambos campos vacíos se omiten. Sustituye el texto entre [corchetes] por el tuyo.",
    placeholdersLeft: { one: "{count} fila aún tiene un texto de ejemplo.", many: "{count} de filas aún tienen textos de ejemplo.", other: "{count} filas aún tienen textos de ejemplo." },
    systemFont: "Algunos caracteres usan una fuente del sistema.",
    length: "Duración",
    "length.short": "Corta",
    "length.standard": "Estándar",
    "length.long": "Larga",
    music: "Música",
    track: "Pista",
    ownMusic: "Tu propia música",
    noMusic: "Sin música",
    dropAudio: "Suelta un archivo de audio (mp3, wav, m4a…) que esté en este ordenador.",
    needsNewerSelects: "Esto requiere una versión más reciente de Selects.",
    noSteadyBeat: "No se encontró un ritmo estable: los planos duran {seconds} s.",
    beatApprox: "Ritmo encontrado (aproximado): los planos lo siguen cada {seconds} s.",
    sectionHint: "Sección de música: arrastra para elegir",
    sectionLabel: "Sección de música",
    musicTooShort: "Esta música es demasiado corta para esta duración",
    startsAt: "Empieza en {seconds} s",
    startsAtSwell: "Empieza en {seconds} s · el título aparece en el clímax",
    startsAtLoudest: "Empieza en {seconds} s · el título aparece en la parte más fuerte",
    stopPreview: "Detener la vista previa",
    cancelPreview: "Cancelar la vista previa",
    previewWhole: "Escuchar la música de todo el vídeo",
    readingMusic: "Leyendo la música…",
    tooShortFor: "Esta pista es demasiado corta para «{length}».",
    useLength: "Usar «{length}»",
    tooShortNeeds: "Esta pista es demasiado corta (necesita ≥ {seconds} s).",
    silentVideo: "Vídeo sin sonido: sin música y con el sonido de los clips en «Apagado».",
    advanced: "Avanzado",
    clipSound: "Sonido de los clips",
    "sound.ambient": "Ambiente",
    "sound.full": "Completo",
    "sound.off": "Apagado",
    cinematicLook: "Look cinematográfico",
    usePhotos: "Usar fotos",
    usePhotosOff: "«Usar fotos» está desactivado",
    chooseClips: "Elegir clips",
    chooseClipsCount: "Elegir clips ({selected}/{total})",
    all: "Todos",
    none: "Ninguno",
    photo: "Foto",
    "shape.tall": "Vertical",
    "shape.wide": "Horizontal",
    "shape.square": "Cuadrado",
    preview: "Vista previa",
    creditsPreview: "Vista previa de los créditos",
    previewAt: "Vista previa en",
    secondsUnit: "s",
    firstRow: "Primera fila",
    lastRow: "Última fila",
    end: "Final",
    noCreditRows: "Sin filas de créditos: solo se muestra el título.",
    rowHidden: "La fila {from} no aparecerá en «{length}»: {names}.",
    rowsHidden: "Las filas {from}–{to} no aparecerán en «{length}»: {names}.",
    dropRows: { one: "Para que todas las filas salgan antes del final, quita {count} fila.", many: "Para que todas las filas salgan antes del final, quita {count} de filas.", other: "Para que todas las filas salgan antes del final, quita {count} filas." },
    dropRowsOrLong: { one: "Para que todas las filas salgan antes del final, quita {count} fila o elige «{long}».", many: "Para que todas las filas salgan antes del final, quita {count} de filas o elige «{long}».", other: "Para que todas las filas salgan antes del final, quita {count} filas o elige «{long}»." },
    tooManyRows: { one: "Demasiadas filas para salir antes del final: quita {count} fila.", many: "Demasiadas filas para salir antes del final: quita {count} de filas.", other: "Demasiadas filas para salir antes del final: quita {count} filas." },
    tooManyRowsOrLong: { one: "Demasiadas filas para salir antes del final: quita {count} fila o elige «{long}».", many: "Demasiadas filas para salir antes del final: quita {count} de filas o elige «{long}».", other: "Demasiadas filas para salir antes del final: quita {count} filas o elige «{long}»." },
    creditsEndEarly: "Los créditos terminan antes del final: el desplazamiento continúa sobre negro.",
    "step.prepare": "Buscando planos",
    "step.plan": "Planificando el montaje",
    "step.music": "Preparando la música",
    "step.assemble": "Creando el Draft",
    "step.decorate": "Añadiendo créditos y look",
    progress: "Paso {step}/{total} · {name} · {percent} %",
    progressDetail: "Paso {step}/{total} · {name} ({detail}) · {percent} %",
    videosChecked: { one: "{done}/{count} vídeo comprobado", many: "{done}/{count} de vídeos comprobados", other: "{done}/{count} vídeos comprobados" },
    videosMeasured: { one: "{done}/{count} vídeo medido", many: "{done}/{count} de vídeos medidos", other: "{done}/{count} vídeos medidos" },
    clipsChecking: { one: "Comprobando clip {done}/{count}", many: "Comprobando clips {done}/{count}", other: "Comprobando clips {done}/{count}" },
    openingDraft: "abriendo el Draft",
    stoppedAt: "Se detuvo en el paso {step}/{total} ({name}): {detail}",
    build: "Crear",
    building: "Creando",
    anotherVersion: "Probar otros planos",
    finishTitle: "Terminar título y look",
    draftCreated: "Draft creado. Selecciona los créditos para editar en Ajustar el título, las filas, los colores o la velocidad de desplazamiento; un plano para mover o redimensionar su ventana o cambiar sus fundidos, su movimiento o la intensidad del look; y la música para cambiar su volumen.",
    draftCreatedAdding: "Draft creado; añadiendo créditos y look…",
    openDraft: "Abrir el nuevo Draft",
    copyLink: "Copiar el enlace al nuevo Draft",
    shortened: { one: "Tu material da para {count} plano, así que este vídeo dura unos {seconds} s en lugar de {fullSeconds} s. Añade más clips o fotos para la duración completa.", many: "Tu material da para {count} de planos, así que este vídeo dura unos {seconds} s en lugar de {fullSeconds} s. Añade más clips o fotos para la duración completa.", other: "Tu material da para {count} planos, así que este vídeo dura unos {seconds} s en lugar de {fullSeconds} s. Añade más clips o fotos para la duración completa." },
    note: "Nota: {detail}.",
    unchecked: { one: "No se pudo comprobar {count} vídeo y se omitió. Vuelve a crear para reintentarlo.", many: "No se pudieron comprobar {count} de vídeos y se omitieron. Vuelve a crear para reintentarlo.", other: "No se pudieron comprobar {count} vídeos y se omitieron. Vuelve a crear para reintentarlo." },
    startFailed: "THE END Credits no pudo iniciarse: {detail}. Reinstala el plugin si el problema continúa.",
    foldersNotFound: "no se encontraron las carpetas del plugin",
    stepFailed: "Selects no pudo completar este paso.",
    musicUnreadable: "No se pudo leer este archivo de música ({detail}). Elige otro archivo o una de las pistas.",
    beatFailed: "falló la detección del ritmo",
    previewFailed: "No se pudo reproducir la vista previa: {detail}.",
    dropMusic: "Suelta un archivo de música o elige una de las pistas.",
    trackTooShort: "Esta pista es demasiado corta para esta duración.",
    musicNotReady: "La música aún no está lista.",
    draftNoId: "El Draft «{name}» se guardó, pero Selects no informó de su id, así que no se pudieron añadir los créditos y el look. Ábrelo desde la lista de Drafts o vuelve a crear.",
    finishFailed: "El Draft se creó, pero no se pudo terminar (créditos, look y ventanas de los planos): {detail}. Pulsa «Terminar título y look» para reintentarlo.",
    openFailed: "El Draft está listo, pero no se pudo abrir: {detail}. Usa el enlace de abajo o ábrelo desde la lista de Drafts.",
    "param.titleColor": "Color del título",
    "param.creditColor": "Color de los créditos",
    "param.rollSpeed": "Velocidad de desplazamiento",
    "param.showTitle": "Mostrar título",
    "param.windowX": "Ventana X (%)",
    "param.windowY": "Ventana Y (%)",
    "param.windowSize": "Tamaño de la ventana (%)",
    "param.fadeIn": "Fundido de entrada (s)",
    "param.fadeOut": "Fundido de salida (s)",
    "param.motion": "Movimiento",
    "param.motionStrength": "Intensidad del movimiento",
    "param.lookStrength": "Intensidad del look",
    "motion.none": "Ninguno",
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
    openProject: "Ouvrez un projet pour créer THE END Credits.",
    refresh: "Actualiser",
    refreshing: "Actualisation",
    refreshFailed: "Impossible d'actualiser la liste des clips : {detail}",
    readFailed: "Impossible de lire les clips de ce projet : {detail}",
    checkingClipsNow: "Vérification des clips…",
    checkingClips: "Vérification des clips",
    listening: "Recherche du rythme",
    working: "En cours",
    noFootage: "Ce projet ne contient pas encore de vidéo ni de photo. Ajoutez des clips vidéo ou des photos ; l'affichage se met à jour automatiquement.",
    analysedBetter: "Les clips analysés permettent de choisir de meilleurs plans.",
    stillImporting: { one: "{count} clip est encore en cours d'importation ; l'affichage se met à jour automatiquement.", many: "{count} de clips sont encore en cours d'importation ; l'affichage se met à jour automatiquement.", other: "{count} clips sont encore en cours d'importation ; l'affichage se met à jour automatiquement." },
    turnOnPhotos: "Activez « Utiliser les photos » dans « Avancé » pour créer à partir des photos de ce projet.",
    noClipsSelected: "Aucun clip sélectionné. Choisissez des clips dans « Avancé ».",
    needsShots: { one: "Il faut au moins {count} clip ou photo utilisable (trouvés : {found}).", many: "Il faut au moins {count} de clips ou photos utilisables (trouvés : {found}).", other: "Il faut au moins {count} clips ou photos utilisables (trouvés : {found})." },
    addFootage: "Ajoutez des images plus variées ou sélectionnez plus de clips.",
    addFootagePhotos: "Ajoutez des images plus variées ou des photos.",
    addFootagePhotosSelect: "Ajoutez des images plus variées ou des photos, ou sélectionnez plus de clips.",
    retryUnchecked: { one: "{count} clip n'a pas pu être vérifié ; appuyez sur « Créer » pour réessayer.", many: "{count} de clips n'ont pas pu être vérifiés ; appuyez sur « Créer » pour réessayer.", other: "{count} clips n'ont pas pu être vérifiés ; appuyez sur « Créer » pour réessayer." },
    gap: " ",
    listSep: ", ",
    ready: "Prêt : {summary}",
    clips: { one: "{count} clip", many: "{count} de clips", other: "{count} clips" },
    clipsSelected: { one: "{selected} sur {count} clip sélectionné", many: "{selected} sur {count} de clips sélectionnés", other: "{selected} sur {count} clips sélectionnés" },
    photos: { one: "{count} photo", many: "{count} de photos", other: "{count} photos" },
    photosSelected: { one: "{selected} sur {count} photo sélectionnée", many: "{selected} sur {count} de photos sélectionnées", other: "{selected} sur {count} photos sélectionnées" },
    shots: { one: "{count} plan", many: "{count} de plans", other: "{count} plans" },
    shotsFitted: { one: "{count} plan (vos images suffisent pour {count})", many: "{count} de plans (vos images suffisent pour {count})", other: "{count} plans (vos images suffisent pour {count})" },
    aboutSeconds: "environ {seconds} s",
    layout: "Disposition",
    "layout.classic": "Classique (fenêtre)",
    "layout.full": "Plein cadre",
    title: "Titre",
    credits: "Générique",
    preset: "Préréglage",
    "preset.filmCrew": "Équipe de tournage",
    "preset.personal": "Personnel",
    "preset.travel": "Voyage",
    creditRows: "Lignes du générique",
    creditN: "Crédit {n}",
    roleN: "Rôle {n}",
    nameN: "Nom {n}",
    rolePlaceholder: "Rôle (p. ex. Réalisation)",
    namePlaceholder: "Nom",
    resetPreset: "Rétablir le préréglage",
    "list.reorderHandle": "Déplacer la ligne {n} : {label}",
    "list.removeRow": "Supprimer la ligne {n}",
    "list.moved": "{label} déplacé en position {pos} sur {total}",
    "list.addRow": "Ajouter une ligne",
    noRows: "Aucune ligne : le générique n'affiche que le titre.",
    rowsHint: "Les lignes dont les deux champs sont vides sont ignorées. Remplacez le texte entre [crochets] par le vôtre.",
    placeholdersLeft: { one: "{count} ligne contient encore un texte d'exemple.", many: "{count} de lignes contiennent encore des textes d'exemple.", other: "{count} lignes contiennent encore des textes d'exemple." },
    systemFont: "Certains caractères utilisent une police système.",
    length: "Durée",
    "length.short": "Courte",
    "length.standard": "Standard",
    "length.long": "Longue",
    music: "Musique",
    track: "Morceau",
    ownMusic: "Votre propre musique",
    noMusic: "Sans musique",
    dropAudio: "Déposez un fichier audio (mp3, wav, m4a…) présent sur cet ordinateur.",
    needsNewerSelects: "Cela nécessite une version plus récente de Selects.",
    noSteadyBeat: "Aucun rythme régulier trouvé : les plans durent {seconds} s.",
    beatApprox: "Rythme trouvé (approximatif) : les plans le suivent toutes les {seconds} s.",
    sectionHint: "Section musicale : faites glisser pour choisir",
    sectionLabel: "Section musicale",
    musicTooShort: "Cette musique est trop courte pour cette durée",
    startsAt: "Commence à {seconds} s",
    startsAtSwell: "Commence à {seconds} s · apparition sur le temps fort",
    startsAtLoudest: "Commence à {seconds} s · apparition sur le passage le plus fort",
    stopPreview: "Arrêter l'aperçu",
    cancelPreview: "Annuler l'aperçu",
    previewWhole: "Écouter la musique de toute la vidéo",
    readingMusic: "Lecture de la musique…",
    tooShortFor: "Ce morceau est trop court pour « {length} ».",
    useLength: "Utiliser « {length} »",
    tooShortNeeds: "Ce morceau est trop court (il faut ≥ {seconds} s).",
    silentVideo: "Vidéo muette : pas de musique et son des clips sur « Coupé ».",
    advanced: "Avancé",
    clipSound: "Son des clips",
    "sound.ambient": "Ambiance",
    "sound.full": "Plein",
    "sound.off": "Coupé",
    cinematicLook: "Look cinéma",
    usePhotos: "Utiliser les photos",
    usePhotosOff: "« Utiliser les photos » est désactivé",
    chooseClips: "Choisir les clips",
    chooseClipsCount: "Choisir les clips ({selected}/{total})",
    all: "Tous",
    none: "Aucun",
    photo: "Photo",
    "shape.tall": "Vertical",
    "shape.wide": "Horizontal",
    "shape.square": "Carré",
    preview: "Aperçu",
    creditsPreview: "Aperçu du générique",
    previewAt: "Aperçu à",
    secondsUnit: "s",
    firstRow: "Première ligne",
    lastRow: "Dernière ligne",
    end: "Fin",
    noCreditRows: "Aucune ligne de générique : seul le titre s'affiche.",
    rowHidden: "La ligne {from} n'apparaîtra pas en « {length} » : {names}.",
    rowsHidden: "Les lignes {from}–{to} n'apparaîtront pas en « {length} » : {names}.",
    dropRows: { one: "Pour que toutes les lignes défilent avant la fin, supprimez {count} ligne.", many: "Pour que toutes les lignes défilent avant la fin, supprimez {count} de lignes.", other: "Pour que toutes les lignes défilent avant la fin, supprimez {count} lignes." },
    dropRowsOrLong: { one: "Pour que toutes les lignes défilent avant la fin, supprimez {count} ligne ou choisissez « {long} ».", many: "Pour que toutes les lignes défilent avant la fin, supprimez {count} de lignes ou choisissez « {long} ».", other: "Pour que toutes les lignes défilent avant la fin, supprimez {count} lignes ou choisissez « {long} »." },
    tooManyRows: { one: "Trop de lignes pour défiler avant la fin : supprimez {count} ligne.", many: "Trop de lignes pour défiler avant la fin : supprimez {count} de lignes.", other: "Trop de lignes pour défiler avant la fin : supprimez {count} lignes." },
    tooManyRowsOrLong: { one: "Trop de lignes pour défiler avant la fin : supprimez {count} ligne ou choisissez « {long} ».", many: "Trop de lignes pour défiler avant la fin : supprimez {count} de lignes ou choisissez « {long} ».", other: "Trop de lignes pour défiler avant la fin : supprimez {count} lignes ou choisissez « {long} »." },
    creditsEndEarly: "Le générique se termine avant la fin : le défilement continue sur du noir.",
    "step.prepare": "Recherche des plans",
    "step.plan": "Préparation du montage",
    "step.music": "Préparation de la musique",
    "step.assemble": "Création du Draft",
    "step.decorate": "Ajout du générique et du look",
    progress: "Étape {step}/{total} · {name} · {percent} %",
    progressDetail: "Étape {step}/{total} · {name} ({detail}) · {percent} %",
    videosChecked: { one: "{done}/{count} vidéo vérifiée", many: "{done}/{count} vidéos vérifiées", other: "{done}/{count} vidéos vérifiées" },
    videosMeasured: { one: "{done}/{count} vidéo mesurée", many: "{done}/{count} vidéos mesurées", other: "{done}/{count} vidéos mesurées" },
    clipsChecking: { one: "Vérification du clip {done}/{count}", many: "Vérification des clips {done}/{count}", other: "Vérification des clips {done}/{count}" },
    openingDraft: "ouverture du Draft",
    stoppedAt: "Arrêt à l'étape {step}/{total} ({name}) : {detail}",
    build: "Créer",
    building: "Création",
    anotherVersion: "Essayer d'autres plans",
    finishTitle: "Terminer le titre et le look",
    draftCreated: "Draft créé. Sélectionnez le générique pour modifier dans Ajuster le titre, les lignes, les couleurs ou la vitesse de défilement ; un plan pour déplacer ou redimensionner sa fenêtre, modifier ses fondus, son mouvement ou l'intensité du look ; et la musique pour régler son volume.",
    draftCreatedAdding: "Draft créé ; ajout du générique et du look…",
    openDraft: "Ouvrir le nouveau Draft",
    copyLink: "Copier le lien vers le nouveau Draft",
    shortened: { one: "Vos images suffisent pour {count} plan ; cette vidéo dure donc environ {seconds} s au lieu de {fullSeconds} s. Ajoutez des clips ou des photos pour obtenir la durée complète.", many: "Vos images suffisent pour {count} de plans ; cette vidéo dure donc environ {seconds} s au lieu de {fullSeconds} s. Ajoutez des clips ou des photos pour obtenir la durée complète.", other: "Vos images suffisent pour {count} plans ; cette vidéo dure donc environ {seconds} s au lieu de {fullSeconds} s. Ajoutez des clips ou des photos pour obtenir la durée complète." },
    note: "Remarque : {detail}.",
    unchecked: { one: "{count} vidéo n'a pas pu être vérifiée et a été ignorée. Relancez la création pour réessayer.", many: "{count} de vidéos n'ont pas pu être vérifiées et ont été ignorées. Relancez la création pour réessayer.", other: "{count} vidéos n'ont pas pu être vérifiées et ont été ignorées. Relancez la création pour réessayer." },
    startFailed: "THE END Credits n'a pas pu démarrer : {detail}. Réinstallez le plugin si le problème persiste.",
    foldersNotFound: "les dossiers du plugin sont introuvables",
    stepFailed: "Selects n'a pas pu terminer cette étape.",
    musicUnreadable: "Impossible de lire ce fichier audio ({detail}). Choisissez un autre fichier ou l'un des morceaux.",
    beatFailed: "la détection du rythme a échoué",
    previewFailed: "Impossible de lire l'aperçu : {detail}.",
    dropMusic: "Déposez un fichier audio ou choisissez l'un des morceaux.",
    trackTooShort: "Ce morceau est trop court pour cette durée.",
    musicNotReady: "La musique n'est pas encore prête.",
    draftNoId: "Le Draft « {name} » a été enregistré, mais Selects n'a pas communiqué son identifiant ; le générique et le look n'ont donc pas pu être ajoutés. Ouvrez-le depuis la liste des Drafts ou relancez la création.",
    finishFailed: "Le Draft a été créé, mais n'a pas pu être finalisé (générique, look et fenêtres des plans) : {detail}. Appuyez sur « Terminer le titre et le look » pour réessayer.",
    openFailed: "Le Draft est prêt, mais n'a pas pu être ouvert : {detail}. Utilisez le lien ci-dessous ou ouvrez-le depuis la liste des Drafts.",
    "param.titleColor": "Couleur du titre",
    "param.creditColor": "Couleur du générique",
    "param.rollSpeed": "Vitesse de défilement",
    "param.showTitle": "Afficher le titre",
    "param.windowX": "Fenêtre X (%)",
    "param.windowY": "Fenêtre Y (%)",
    "param.windowSize": "Taille de la fenêtre (%)",
    "param.fadeIn": "Fondu d'entrée (s)",
    "param.fadeOut": "Fondu de sortie (s)",
    "param.motion": "Mouvement",
    "param.motionStrength": "Intensité du mouvement",
    "param.lookStrength": "Intensité du look",
    "motion.none": "Aucun",
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
    openProject: "Apri un progetto per creare THE END Credits.",
    refresh: "Aggiorna",
    refreshing: "Aggiornamento",
    refreshFailed: "Impossibile aggiornare l'elenco delle clip: {detail}",
    readFailed: "Impossibile leggere le clip di questo progetto: {detail}",
    checkingClipsNow: "Controllo delle clip…",
    checkingClips: "Controllo delle clip",
    listening: "Ricerca del ritmo",
    working: "In corso",
    noFootage: "In questo progetto non ci sono ancora video né foto. Aggiungi clip video o foto; si aggiorna automaticamente.",
    analysedBetter: "Con le clip analizzate la scelta delle inquadrature è migliore.",
    stillImporting: { one: "{count} clip è ancora in importazione; si aggiorna automaticamente.", many: "{count} di clip sono ancora in importazione; si aggiorna automaticamente.", other: "{count} clip sono ancora in importazione; si aggiorna automaticamente." },
    turnOnPhotos: "Attiva «Usa foto» in «Avanzate» per creare dalle foto di questo progetto.",
    noClipsSelected: "Nessuna clip selezionata. Scegli le clip in «Avanzate».",
    needsShots: { one: "Serve almeno {count} clip o foto utilizzabile (trovate: {found}).", many: "Servono almeno {count} di clip o foto utilizzabili (trovate: {found}).", other: "Servono almeno {count} clip o foto utilizzabili (trovate: {found})." },
    addFootage: "Aggiungi materiale più vario o seleziona più clip.",
    addFootagePhotos: "Aggiungi materiale più vario o foto.",
    addFootagePhotosSelect: "Aggiungi materiale più vario o foto, oppure seleziona più clip.",
    retryUnchecked: { one: "Non è stato possibile controllare {count} clip; premi «Crea» per riprovare.", many: "Non è stato possibile controllare {count} di clip; premi «Crea» per riprovare.", other: "Non è stato possibile controllare {count} clip; premi «Crea» per riprovare." },
    gap: " ",
    listSep: ", ",
    ready: "Pronto: {summary}",
    clips: { one: "{count} clip", many: "{count} di clip", other: "{count} clip" },
    clipsSelected: { one: "{selected} di {count} clip selezionata", many: "{selected} di {count} clip selezionate", other: "{selected} di {count} clip selezionate" },
    photos: { one: "{count} foto", many: "{count} di foto", other: "{count} foto" },
    photosSelected: { one: "{selected} di {count} foto selezionata", many: "{selected} di {count} foto selezionate", other: "{selected} di {count} foto selezionate" },
    shots: { one: "{count} inquadratura", many: "{count} di inquadrature", other: "{count} inquadrature" },
    shotsFitted: { one: "{count} inquadratura (il tuo materiale basta per {count})", many: "{count} di inquadrature (il tuo materiale basta per {count})", other: "{count} inquadrature (il tuo materiale basta per {count})" },
    aboutSeconds: "circa {seconds} s",
    layout: "Layout",
    "layout.classic": "Classico (finestra)",
    "layout.full": "Schermo intero",
    title: "Titolo",
    credits: "Titoli di coda",
    preset: "Preimpostazione",
    "preset.filmCrew": "Troupe",
    "preset.personal": "Personale",
    "preset.travel": "Viaggio",
    creditRows: "Righe dei titoli di coda",
    creditN: "Voce {n}",
    roleN: "Ruolo {n}",
    nameN: "Nome {n}",
    rolePlaceholder: "Ruolo (es. Regia)",
    namePlaceholder: "Nome",
    resetPreset: "Ripristina preimpostazione",
    "list.reorderHandle": "Riordina la riga {n}: {label}",
    "list.removeRow": "Rimuovi la riga {n}",
    "list.moved": "{label} spostato in posizione {pos} di {total}",
    "list.addRow": "Aggiungi riga",
    noRows: "Nessuna riga: i titoli di coda mostrano solo il titolo.",
    rowsHint: "Le righe con entrambi i campi vuoti vengono omesse. Sostituisci il testo tra [parentesi] con il tuo.",
    placeholdersLeft: { one: "{count} riga contiene ancora un testo segnaposto.", many: "{count} di righe contengono ancora testi segnaposto.", other: "{count} righe contengono ancora testi segnaposto." },
    systemFont: "Alcuni caratteri usano un font di sistema.",
    length: "Durata",
    "length.short": "Breve",
    "length.standard": "Standard",
    "length.long": "Lunga",
    music: "Musica",
    track: "Brano",
    ownMusic: "La tua musica",
    noMusic: "Nessuna musica",
    dropAudio: "Trascina qui un file audio (mp3, wav, m4a…) presente su questo computer.",
    needsNewerSelects: "Serve una versione più recente di Selects.",
    noSteadyBeat: "Nessun ritmo regolare trovato: le inquadrature durano {seconds} s.",
    beatApprox: "Ritmo trovato (approssimativo): le inquadrature lo seguono ogni {seconds} s.",
    sectionHint: "Sezione musicale: trascina per scegliere",
    sectionLabel: "Sezione musicale",
    musicTooShort: "Questa musica è troppo corta per questa durata",
    startsAt: "Inizia a {seconds} s",
    startsAtSwell: "Inizia a {seconds} s · il titolo arriva sul crescendo",
    startsAtLoudest: "Inizia a {seconds} s · il titolo arriva sulla parte più forte",
    stopPreview: "Ferma l'anteprima",
    cancelPreview: "Annulla l'anteprima",
    previewWhole: "Ascolta la musica di tutto il video",
    readingMusic: "Lettura della musica…",
    tooShortFor: "Questo brano è troppo corto per «{length}».",
    useLength: "Usa «{length}»",
    tooShortNeeds: "Questo brano è troppo corto (servono ≥ {seconds} s).",
    silentVideo: "Video senza audio: nessuna musica e audio delle clip su «Spento».",
    advanced: "Avanzate",
    clipSound: "Audio delle clip",
    "sound.ambient": "Ambiente",
    "sound.full": "Pieno",
    "sound.off": "Spento",
    cinematicLook: "Look cinematografico",
    usePhotos: "Usa foto",
    usePhotosOff: "«Usa foto» è disattivato",
    chooseClips: "Scegli le clip",
    chooseClipsCount: "Scegli le clip ({selected}/{total})",
    all: "Tutte",
    none: "Nessuna",
    photo: "Foto",
    "shape.tall": "Verticale",
    "shape.wide": "Orizzontale",
    "shape.square": "Quadrato",
    preview: "Anteprima",
    creditsPreview: "Anteprima dei titoli di coda",
    previewAt: "Anteprima a",
    secondsUnit: "s",
    firstRow: "Prima riga",
    lastRow: "Ultima riga",
    end: "Fine",
    noCreditRows: "Nessuna riga nei titoli di coda: compare solo il titolo.",
    rowHidden: "La riga {from} non comparirà in «{length}»: {names}.",
    rowsHidden: "Le righe {from}–{to} non compariranno in «{length}»: {names}.",
    dropRows: { one: "Per far scorrere via tutte le righe prima della fine, rimuovi {count} riga.", many: "Per far scorrere via tutte le righe prima della fine, rimuovi {count} di righe.", other: "Per far scorrere via tutte le righe prima della fine, rimuovi {count} righe." },
    dropRowsOrLong: { one: "Per far scorrere via tutte le righe prima della fine, rimuovi {count} riga o scegli «{long}».", many: "Per far scorrere via tutte le righe prima della fine, rimuovi {count} di righe o scegli «{long}».", other: "Per far scorrere via tutte le righe prima della fine, rimuovi {count} righe o scegli «{long}»." },
    tooManyRows: { one: "Troppe righe per scorrere via prima della fine: rimuovi {count} riga.", many: "Troppe righe per scorrere via prima della fine: rimuovi {count} di righe.", other: "Troppe righe per scorrere via prima della fine: rimuovi {count} righe." },
    tooManyRowsOrLong: { one: "Troppe righe per scorrere via prima della fine: rimuovi {count} riga o scegli «{long}».", many: "Troppe righe per scorrere via prima della fine: rimuovi {count} di righe o scegli «{long}».", other: "Troppe righe per scorrere via prima della fine: rimuovi {count} righe o scegli «{long}»." },
    creditsEndEarly: "I titoli di coda finiscono prima della fine: lo scorrimento prosegue sul nero.",
    "step.prepare": "Ricerca delle inquadrature",
    "step.plan": "Pianificazione del montaggio",
    "step.music": "Preparazione della musica",
    "step.assemble": "Creazione del Draft",
    "step.decorate": "Aggiunta di titoli di coda e look",
    progress: "Passaggio {step}/{total} · {name} · {percent}%",
    progressDetail: "Passaggio {step}/{total} · {name} ({detail}) · {percent}%",
    videosChecked: { one: "{done}/{count} video controllato", many: "{done}/{count} di video controllati", other: "{done}/{count} video controllati" },
    videosMeasured: { one: "{done}/{count} video misurato", many: "{done}/{count} di video misurati", other: "{done}/{count} video misurati" },
    clipsChecking: { one: "Controllo della clip {done}/{count}", many: "Controllo delle clip {done}/{count}", other: "Controllo delle clip {done}/{count}" },
    openingDraft: "apertura del Draft",
    stoppedAt: "Interrotto al passaggio {step}/{total} ({name}): {detail}",
    build: "Crea",
    building: "Creazione",
    anotherVersion: "Prova altre inquadrature",
    finishTitle: "Completa titolo e look",
    draftCreated: "Draft creato. Seleziona i titoli di coda per modificare in Regola il titolo, le righe, i colori o la velocità di scorrimento; un'inquadratura per spostare o ridimensionare la sua finestra o cambiarne dissolvenze, movimento o intensità del look; e la musica per cambiarne il volume.",
    draftCreatedAdding: "Draft creato; aggiunta di titoli di coda e look…",
    openDraft: "Apri il nuovo Draft",
    copyLink: "Copia il link al nuovo Draft",
    shortened: { one: "Il tuo materiale basta per {count} inquadratura, quindi questo video dura circa {seconds} s invece di {fullSeconds} s. Aggiungi altre clip o foto per la durata completa.", many: "Il tuo materiale basta per {count} di inquadrature, quindi questo video dura circa {seconds} s invece di {fullSeconds} s. Aggiungi altre clip o foto per la durata completa.", other: "Il tuo materiale basta per {count} inquadrature, quindi questo video dura circa {seconds} s invece di {fullSeconds} s. Aggiungi altre clip o foto per la durata completa." },
    note: "Nota: {detail}.",
    unchecked: { one: "Non è stato possibile controllare {count} video, che è stato saltato. Crea di nuovo per riprovare.", many: "Non è stato possibile controllare {count} di video, che sono stati saltati. Crea di nuovo per riprovare.", other: "Non è stato possibile controllare {count} video, che sono stati saltati. Crea di nuovo per riprovare." },
    startFailed: "Impossibile avviare THE END Credits: {detail}. Reinstalla il plugin se il problema persiste.",
    foldersNotFound: "le cartelle del plugin non sono state trovate",
    stepFailed: "Selects non è riuscito a completare questo passaggio.",
    musicUnreadable: "Impossibile leggere questo file musicale ({detail}). Scegli un altro file o uno dei brani.",
    beatFailed: "rilevamento del ritmo non riuscito",
    previewFailed: "Impossibile riprodurre l'anteprima: {detail}.",
    dropMusic: "Trascina qui un file musicale o scegli uno dei brani.",
    trackTooShort: "Questo brano è troppo corto per questa durata.",
    musicNotReady: "La musica non è ancora pronta.",
    draftNoId: "Il Draft «{name}» è stato salvato, ma Selects non ne ha comunicato l'id, quindi non è stato possibile aggiungere titoli di coda e look. Aprilo dall'elenco dei Draft o crea di nuovo.",
    finishFailed: "Il Draft è stato creato, ma non è stato possibile completarlo (titoli di coda, look e finestre delle inquadrature): {detail}. Premi «Completa titolo e look» per riprovare.",
    openFailed: "Il Draft è pronto, ma non è stato possibile aprirlo: {detail}. Usa il link qui sotto o aprilo dall'elenco dei Draft.",
    "param.titleColor": "Colore del titolo",
    "param.creditColor": "Colore dei titoli di coda",
    "param.rollSpeed": "Velocità di scorrimento",
    "param.showTitle": "Mostra titolo",
    "param.windowX": "Finestra X (%)",
    "param.windowY": "Finestra Y (%)",
    "param.windowSize": "Dimensione finestra (%)",
    "param.fadeIn": "Dissolvenza in entrata (s)",
    "param.fadeOut": "Dissolvenza in uscita (s)",
    "param.motion": "Movimento",
    "param.motionStrength": "Intensità del movimento",
    "param.lookStrength": "Intensità del look",
    "motion.none": "Nessuno",
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
    openProject: "THE END Credits を作成するには、プロジェクトを開いてください。",
    refresh: "更新",
    refreshing: "更新中",
    refreshFailed: "クリップ一覧を更新できませんでした: {detail}",
    readFailed: "このプロジェクトのクリップを読み込めませんでした: {detail}",
    checkingClipsNow: "クリップを確認中…",
    checkingClips: "クリップを確認中",
    listening: "ビートを検出中",
    working: "処理中",
    noFootage: "このプロジェクトには、動画も写真もまだありません。動画クリップか写真を追加してください。自動で更新されます。",
    analysedBetter: "解析済みのクリップなら、より良いショットを選べます。",
    stillImporting: { other: "{count} 本のクリップをまだ読み込んでいます。自動で更新されます。" },
    turnOnPhotos: "このプロジェクトの写真から作成するには、「詳細設定」で「写真を使う」をオンにしてください。",
    noClipsSelected: "クリップが選択されていません。「詳細設定」でクリップを選んでください。",
    needsShots: { other: "使えるクリップか写真が少なくとも {count} 個必要です（見つかったのは {found} 個）。" },
    addFootage: "変化のある素材を追加するか、クリップをもっと選択してください。",
    addFootagePhotos: "変化のある素材や写真を追加してください。",
    addFootagePhotosSelect: "変化のある素材や写真を追加するか、クリップをもっと選択してください。",
    retryUnchecked: { other: "{count} 本のクリップを確認できませんでした。「作成」を押すと再試行します。" },
    gap: "",
    listSep: "、",
    ready: "準備完了: {summary}",
    clips: { other: "クリップ {count} 本" },
    clipsSelected: { other: "クリップ {count} 本中 {selected} 本を選択" },
    photos: { other: "写真 {count} 枚" },
    photosSelected: { other: "写真 {count} 枚中 {selected} 枚を選択" },
    shots: { other: "{count} ショット" },
    shotsFitted: { other: "{count} ショット（素材で作れるのは {count} ショット）" },
    aboutSeconds: "約 {seconds} 秒",
    layout: "レイアウト",
    "layout.classic": "クラシック（ウィンドウ）",
    "layout.full": "フルフレーム",
    title: "タイトル",
    credits: "クレジット",
    preset: "プリセット",
    "preset.filmCrew": "映画スタッフ",
    "preset.personal": "パーソナル",
    "preset.travel": "旅行",
    creditRows: "クレジットの行",
    creditN: "クレジット {n}",
    roleN: "役職 {n}",
    nameN: "名前 {n}",
    rolePlaceholder: "役職（例: 監督）",
    namePlaceholder: "名前",
    resetPreset: "プリセットに戻す",
    "list.reorderHandle": "行 {n} を並べ替え：{label}",
    "list.removeRow": "行 {n} を削除",
    "list.moved": "{label} を {total} 件中 {pos} 番目に移動しました",
    "list.addRow": "行を追加",
    noRows: "行がありません。クレジットにはタイトルだけが表示されます。",
    rowsHint: "両方の欄が空の行は省かれます。[角かっこ] 内のテキストは自分の内容に置き換えてください。",
    placeholdersLeft: { other: "{count} 行にまだ仮のテキストが残っています。" },
    systemFont: "一部の文字はシステムフォントで表示されます。",
    length: "長さ",
    "length.short": "短め",
    "length.standard": "標準",
    "length.long": "長め",
    music: "音楽",
    track: "トラック",
    ownMusic: "自分の音楽",
    noMusic: "音楽なし",
    dropAudio: "このコンピュータ上のオーディオファイル（mp3、wav、m4a など）をドロップしてください。",
    needsNewerSelects: "この機能には、より新しいバージョンの Selects が必要です。",
    noSteadyBeat: "一定のビートが見つかりません。ショットは {seconds} 秒ずつです。",
    beatApprox: "ビートを検出しました（おおよそ）。ショットは {seconds} 秒ごとに切り替わります。",
    sectionHint: "音楽の区間 — ドラッグして選択",
    sectionLabel: "音楽の区間",
    musicTooShort: "この音楽は、この長さには短すぎます",
    startsAt: "{seconds} 秒から開始",
    startsAtSwell: "{seconds} 秒から開始 · 盛り上がりでタイトルが登場",
    startsAtLoudest: "{seconds} 秒から開始 · いちばん大きい部分でタイトルが登場",
    stopPreview: "プレビューを停止",
    cancelPreview: "プレビューをキャンセル",
    previewWhole: "動画全体の音楽をプレビュー",
    readingMusic: "音楽を読み込み中…",
    tooShortFor: "このトラックは「{length}」には短すぎます。",
    useLength: "「{length}」にする",
    tooShortNeeds: "このトラックは短すぎます（{seconds} 秒以上必要）。",
    silentVideo: "無音の動画: 音楽なしで、クリップの音が「オフ」です。",
    advanced: "詳細設定",
    clipSound: "クリップの音",
    "sound.ambient": "環境音",
    "sound.full": "フル",
    "sound.off": "オフ",
    cinematicLook: "シネマティックルック",
    usePhotos: "写真を使う",
    usePhotosOff: "「写真を使う」がオフです",
    chooseClips: "クリップを選択",
    chooseClipsCount: "クリップを選択（{selected}/{total}）",
    all: "すべて",
    none: "なし",
    photo: "写真",
    "shape.tall": "縦長",
    "shape.wide": "横長",
    "shape.square": "正方形",
    preview: "プレビュー",
    creditsPreview: "クレジットのプレビュー",
    previewAt: "プレビュー位置",
    secondsUnit: "秒",
    firstRow: "最初の行",
    lastRow: "最後の行",
    end: "終わり",
    noCreditRows: "クレジットの行がありません。タイトルだけが表示されます。",
    rowHidden: "「{length}」では {from} 行目が表示されません: {names}。",
    rowsHidden: "「{length}」では {from}–{to} 行目が表示されません: {names}。",
    dropRows: { other: "すべての行を最後までに流し切るには、{count} 行削除してください。" },
    dropRowsOrLong: { other: "すべての行を最後までに流し切るには、{count} 行削除するか「{long}」を選んでください。" },
    tooManyRows: { other: "行が多すぎて最後までに流し切れません。{count} 行削除してください。" },
    tooManyRowsOrLong: { other: "行が多すぎて最後までに流し切れません。{count} 行削除するか「{long}」を選んでください。" },
    creditsEndEarly: "クレジットは動画の終わりより先に流れ終わり、その後は黒い画面が続きます。",
    "step.prepare": "ショットを探す",
    "step.plan": "編集を計画",
    "step.music": "音楽を準備",
    "step.assemble": "Draft を作成",
    "step.decorate": "クレジットとルックを追加",
    progress: "ステップ {step}/{total} · {name} · {percent}%",
    progressDetail: "ステップ {step}/{total} · {name}（{detail}）· {percent}%",
    videosChecked: { other: "{done}/{count} 本の動画を確認済み" },
    videosMeasured: { other: "{done}/{count} 本の動画を計測済み" },
    clipsChecking: { other: "クリップを確認中 {done}/{count}" },
    openingDraft: "Draft を開いています",
    stoppedAt: "ステップ {step}/{total}（{name}）で停止しました: {detail}",
    build: "作成",
    building: "作成中",
    anotherVersion: "別のショットで作成",
    finishTitle: "タイトルとルックを仕上げる",
    draftCreated: "Draft を作成しました。クレジットを選択すると「調整」でタイトル・行・色・スクロール速度を、ショットを選択するとウィンドウの移動やサイズ、フェード、モーション、ルックの強さを、音楽を選択すると音量を変更できます。",
    draftCreatedAdding: "Draft を作成しました。クレジットとルックを追加中…",
    openDraft: "新しい Draft を開く",
    copyLink: "新しい Draft へのリンクをコピー",
    shortened: { other: "素材で作れるのは {count} ショットのため、この動画は {fullSeconds} 秒ではなく約 {seconds} 秒になります。フルの長さにするにはクリップか写真を追加してください。" },
    note: "メモ: {detail}。",
    unchecked: { other: "{count} 本の動画を確認できなかったため、スキップしました。もう一度作成すると再試行します。" },
    startFailed: "THE END Credits を開始できませんでした: {detail}。解決しない場合はプラグインを再インストールしてください。",
    foldersNotFound: "プラグインのフォルダが見つかりませんでした",
    stepFailed: "Selects はこのステップを完了できませんでした。",
    musicUnreadable: "この音楽ファイルを読み込めませんでした（{detail}）。別のファイルか、用意されたトラックを選んでください。",
    beatFailed: "ビートの検出に失敗しました",
    previewFailed: "プレビューを再生できませんでした: {detail}。",
    dropMusic: "音楽ファイルをドロップするか、用意されたトラックを選んでください。",
    trackTooShort: "このトラックはこの長さには短すぎます。",
    musicNotReady: "音楽の準備がまだできていません。",
    draftNoId: "Draft「{name}」は保存されましたが、Selects から ID が返されなかったため、クレジットとルックを追加できませんでした。Draft 一覧から開くか、もう一度作成してください。",
    finishFailed: "Draft は作成されましたが、仕上げ（クレジット、ルック、ショットのウィンドウ）ができませんでした: {detail}。「タイトルとルックを仕上げる」を押して再試行してください。",
    openFailed: "Draft の準備はできましたが、開けませんでした: {detail}。下のリンクを使うか、Draft 一覧から開いてください。",
    "param.titleColor": "タイトルの色",
    "param.creditColor": "クレジットの色",
    "param.rollSpeed": "スクロール速度",
    "param.showTitle": "タイトルを表示",
    "param.windowX": "ウィンドウ X（%）",
    "param.windowY": "ウィンドウ Y（%）",
    "param.windowSize": "ウィンドウのサイズ（%）",
    "param.fadeIn": "フェードイン（秒）",
    "param.fadeOut": "フェードアウト（秒）",
    "param.motion": "モーション",
    "param.motionStrength": "モーションの強さ",
    "param.lookStrength": "ルックの強さ",
    "motion.none": "なし",
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
    openProject: "THE END Credits\ub97c \ub9cc\ub4e4\ub824\uba74 \ud504\ub85c\uc81d\ud2b8\ub97c \uc5ec\uc138\uc694.",
    refresh: "\uc0c8\ub85c\uace0\uce68",
    refreshing: "\uc0c8\ub85c\uace0\uce68 \uc911",
    refreshFailed: "\ud074\ub9bd \ubaa9\ub85d\uc744 \uc0c8\ub85c\uace0\uce68\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}",
    readFailed: "\uc774 \ud504\ub85c\uc81d\ud2b8\uc758 \ud074\ub9bd\uc744 \uc77d\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}",
    checkingClipsNow: "\ud074\ub9bd \ud655\uc778 \uc911…",
    checkingClips: "\ud074\ub9bd \ud655\uc778 \uc911",
    listening: "\ube44\ud2b8 \ucc3e\ub294 \uc911",
    working: "\uc791\uc5c5 \uc911",
    noFootage: "\uc774 \ud504\ub85c\uc81d\ud2b8\uc5d0\ub294 \uc544\uc9c1 \uc601\uc0c1\uc774\ub098 \uc0ac\uc9c4\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. \uc601\uc0c1 \ud074\ub9bd\uc774\ub098 \uc0ac\uc9c4\uc744 \ucd94\uac00\ud558\uc138\uc694. \uc790\ub3d9\uc73c\ub85c \uc5c5\ub370\uc774\ud2b8\ub429\ub2c8\ub2e4.",
    analysedBetter: "\ubd84\uc11d\ub41c \ud074\ub9bd\uc774\uba74 \ub354 \uc88b\uc740 \uc0f7\uc744 \uace0\ub97c \uc218 \uc788\uc2b5\ub2c8\ub2e4.",
    stillImporting: { other: "\ud074\ub9bd {count}\uac1c\ub97c \uc544\uc9c1 \uac00\uc838\uc624\ub294 \uc911\uc785\ub2c8\ub2e4. \uc790\ub3d9\uc73c\ub85c \uc5c5\ub370\uc774\ud2b8\ub429\ub2c8\ub2e4." },
    turnOnPhotos: "\uc774 \ud504\ub85c\uc81d\ud2b8\uc758 \uc0ac\uc9c4\uc73c\ub85c \ub9cc\ub4e4\ub824\uba74 ‘\uace0\uae09’\uc5d0\uc11c ‘\uc0ac\uc9c4 \uc0ac\uc6a9’\uc744 \ucf1c\uc138\uc694.",
    noClipsSelected: "\uc120\ud0dd\ud55c \ud074\ub9bd\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. ‘\uace0\uae09’\uc5d0\uc11c \ud074\ub9bd\uc744 \uc120\ud0dd\ud558\uc138\uc694.",
    needsShots: { other: "\uc4f8 \uc218 \uc788\ub294 \ud074\ub9bd\uc774\ub098 \uc0ac\uc9c4\uc774 \ucd5c\uc18c {count}\uac1c \ud544\uc694\ud569\ub2c8\ub2e4({found}\uac1c \ucc3e\uc74c)." },
    addFootage: "\ub354 \ub2e4\uc591\ud55c \uc601\uc0c1\uc744 \ucd94\uac00\ud558\uac70\ub098 \ud074\ub9bd\uc744 \ub354 \uc120\ud0dd\ud558\uc138\uc694.",
    addFootagePhotos: "\ub354 \ub2e4\uc591\ud55c \uc601\uc0c1\uc774\ub098 \uc0ac\uc9c4\uc744 \ucd94\uac00\ud558\uc138\uc694.",
    addFootagePhotosSelect: "\ub354 \ub2e4\uc591\ud55c \uc601\uc0c1\uc774\ub098 \uc0ac\uc9c4\uc744 \ucd94\uac00\ud558\uac70\ub098 \ud074\ub9bd\uc744 \ub354 \uc120\ud0dd\ud558\uc138\uc694.",
    retryUnchecked: { other: "\ud074\ub9bd {count}\uac1c\ub97c \ud655\uc778\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. ‘\ub9cc\ub4e4\uae30’\ub97c \ub204\ub974\uba74 \uc7ac\uc2dc\ub3c4\ud569\ub2c8\ub2e4." },
    gap: " ",
    listSep: ", ",
    ready: "\uc900\ube44 \uc644\ub8cc: {summary}",
    clips: { other: "\ud074\ub9bd {count}\uac1c" },
    clipsSelected: { other: "\ud074\ub9bd {count}\uac1c \uc911 {selected}\uac1c \uc120\ud0dd" },
    photos: { other: "\uc0ac\uc9c4 {count}\uc7a5" },
    photosSelected: { other: "\uc0ac\uc9c4 {count}\uc7a5 \uc911 {selected}\uc7a5 \uc120\ud0dd" },
    shots: { other: "\uc0f7 {count}\uac1c" },
    shotsFitted: { other: "\uc0f7 {count}\uac1c(\uc601\uc0c1\uc73c\ub85c \ucc44\uc6b8 \uc218 \uc788\ub294 \ub9cc\ud07c)" },
    aboutSeconds: "\uc57d {seconds}\ucd08",
    layout: "\ub808\uc774\uc544\uc6c3",
    "layout.classic": "\ud074\ub798\uc2dd(\ucc3d)",
    "layout.full": "\ud480 \ud504\ub808\uc784",
    title: "\ud0c0\uc774\ud2c0",
    credits: "\ud06c\ub808\ub527",
    preset: "\ud504\ub9ac\uc14b",
    "preset.filmCrew": "\uc601\ud654 \uc81c\uc791\uc9c4",
    "preset.personal": "\uac1c\uc778",
    "preset.travel": "\uc5ec\ud589",
    creditRows: "\ud06c\ub808\ub527 \uc904",
    creditN: "\ud06c\ub808\ub527 {n}",
    roleN: "\uc5ed\ud560 {n}",
    nameN: "\uc774\ub984 {n}",
    rolePlaceholder: "\uc5ed\ud560(\uc608: \uac10\ub3c5)",
    namePlaceholder: "\uc774\ub984",
    resetPreset: "\ud504\ub9ac\uc14b\uc73c\ub85c \ub418\ub3cc\ub9ac\uae30",
    "list.reorderHandle": "{n}\ubc88\uc9f8 \uc904 \uc21c\uc11c \ubc14\uafb8\uae30: {label}",
    "list.removeRow": "{n}\ubc88\uc9f8 \uc904 \uc0ad\uc81c",
    "list.moved": "{label}: {total}\uac1c \uc911 {pos}\ubc88\uc9f8\ub85c \uc62e\uacbc\uc2b5\ub2c8\ub2e4",
    "list.addRow": "\uc904 \ucd94\uac00",
    noRows: "\uc904\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. \ud06c\ub808\ub527\uc5d0\ub294 \ud0c0\uc774\ud2c0\ub9cc \ub098\uc635\ub2c8\ub2e4.",
    rowsHint: "\ub450 \uce78\uc774 \ubaa8\ub450 \ube44\uc5b4 \uc788\ub294 \uc904\uc740 \ube60\uc9d1\ub2c8\ub2e4. [\ub300\uad04\ud638] \uc548\uc758 \uae00\uc790\ub294 \uc9c1\uc811 \ubc14\uafd4 \uc8fc\uc138\uc694.",
    placeholdersLeft: { other: "{count}\uac1c \uc904\uc5d0 \uc544\uc9c1 \uc608\uc2dc \uae00\uc790\uac00 \ub0a8\uc544 \uc788\uc2b5\ub2c8\ub2e4." },
    systemFont: "\uc77c\ubd80 \uae00\uc790\ub294 \uc2dc\uc2a4\ud15c \ud3f0\ud2b8\ub85c \ud45c\uc2dc\ub429\ub2c8\ub2e4.",
    length: "\uae38\uc774",
    "length.short": "\uc9e7\uac8c",
    "length.standard": "\ubcf4\ud1b5",
    "length.long": "\uae38\uac8c",
    music: "\uc74c\uc545",
    track: "\ud2b8\ub799",
    ownMusic: "\ub0b4 \uc74c\uc545",
    noMusic: "\uc74c\uc545 \uc5c6\uc74c",
    dropAudio: "\uc774 \ucef4\ud4e8\ud130\uc5d0 \uc788\ub294 \uc624\ub514\uc624 \ud30c\uc77c(mp3, wav, m4a \ub4f1)\uc744 \ub04c\uc5b4\ub2e4 \ub193\uc73c\uc138\uc694.",
    needsNewerSelects: "\ub354 \ucd5c\uc2e0 \ubc84\uc804\uc758 Selects\uac00 \ud544\uc694\ud569\ub2c8\ub2e4.",
    noSteadyBeat: "\uc77c\uc815\ud55c \ube44\ud2b8\ub97c \ucc3e\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. \uc0f7\uc740 {seconds}\ucd08\uc529\uc785\ub2c8\ub2e4.",
    beatApprox: "\ube44\ud2b8\ub97c \ucc3e\uc558\uc2b5\ub2c8\ub2e4(\ub300\ub7b5). \uc0f7\uc774 {seconds}\ucd08\ub9c8\ub2e4 \ube44\ud2b8\ub97c \ub530\ub77c\uac11\ub2c8\ub2e4.",
    sectionHint: "\uc74c\uc545 \uad6c\uac04 — \ub4dc\ub798\uadf8\ud574\uc11c \uc120\ud0dd",
    sectionLabel: "\uc74c\uc545 \uad6c\uac04",
    musicTooShort: "\uc774 \uae38\uc774\ub85c \ub9cc\ub4e4\uae30\uc5d0\ub294 \uc74c\uc545\uc774 \ub108\ubb34 \uc9e7\uc2b5\ub2c8\ub2e4",
    startsAt: "{seconds}\ucd08\ubd80\ud130 \uc2dc\uc791",
    startsAtSwell: "{seconds}\ucd08\ubd80\ud130 \uc2dc\uc791 · \uace0\uc870\ub418\ub294 \ubd80\ubd84\uc5d0\uc11c \ub4f1\uc7a5",
    startsAtLoudest: "{seconds}\ucd08\ubd80\ud130 \uc2dc\uc791 · \uac00\uc7a5 \ud070 \ubd80\ubd84\uc5d0\uc11c \ub4f1\uc7a5",
    stopPreview: "\ubbf8\ub9ac\ub4e3\uae30 \uc911\uc9c0",
    cancelPreview: "\ubbf8\ub9ac\ub4e3\uae30 \ucde8\uc18c",
    previewWhole: "\uc601\uc0c1 \uc804\uccb4 \uae38\uc774\uc758 \uc74c\uc545 \ubbf8\ub9ac\ub4e3\uae30",
    readingMusic: "\uc74c\uc545 \uc77d\ub294 \uc911…",
    tooShortFor: "\uc774 \ud2b8\ub799\uc740 \uae38\uc774 ‘{length}’\uc5d0\ub294 \ub108\ubb34 \uc9e7\uc2b5\ub2c8\ub2e4.",
    useLength: "\uae38\uc774 ‘{length}’ \uc120\ud0dd",
    tooShortNeeds: "\uc774 \ud2b8\ub799\uc740 \ub108\ubb34 \uc9e7\uc2b5\ub2c8\ub2e4({seconds}\ucd08 \uc774\uc0c1 \ud544\uc694).",
    silentVideo: "\ubb34\uc74c \uc601\uc0c1: \uc74c\uc545\uc774 \uc5c6\uace0 \ud074\ub9bd \uc18c\ub9ac\uac00 ‘\ub054’\uc785\ub2c8\ub2e4.",
    advanced: "\uace0\uae09",
    clipSound: "\ud074\ub9bd \uc18c\ub9ac",
    "sound.ambient": "\ubc30\uacbd\uc74c",
    "sound.full": "\uc6d0\uc74c",
    "sound.off": "\ub054",
    cinematicLook: "\uc2dc\ub124\ub9c8\ud2f1 \uc0c9\uac10",
    usePhotos: "\uc0ac\uc9c4 \uc0ac\uc6a9",
    usePhotosOff: "‘\uc0ac\uc9c4 \uc0ac\uc6a9’\uc774 \uaebc\uc838 \uc788\uc74c",
    chooseClips: "\ud074\ub9bd \uc120\ud0dd",
    chooseClipsCount: "\ud074\ub9bd \uc120\ud0dd ({selected}/{total})",
    all: "\uc804\uccb4",
    none: "\uc5c6\uc74c",
    photo: "\uc0ac\uc9c4",
    "shape.tall": "\uc138\ub85c",
    "shape.wide": "\uac00\ub85c",
    "shape.square": "\uc815\uc0ac\uac01\ud615",
    preview: "\ubbf8\ub9ac\ubcf4\uae30",
    creditsPreview: "\ud06c\ub808\ub527 \ubbf8\ub9ac\ubcf4\uae30",
    previewAt: "\ubbf8\ub9ac\ubcf4\uae30 \uc704\uce58",
    secondsUnit: "\ucd08",
    firstRow: "\uccab \uc904",
    lastRow: "\ub9c8\uc9c0\ub9c9 \uc904",
    end: "\ub05d",
    noCreditRows: "\ud06c\ub808\ub527 \uc904\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. \ud0c0\uc774\ud2c0\ub9cc \ub098\uc635\ub2c8\ub2e4.",
    rowHidden: "\uae38\uc774 ‘{length}’\uc5d0\uc11c\ub294 {from}\ubc88\uc9f8 \uc904\uc774 \ub098\uc624\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4: {names}.",
    rowsHidden: "\uae38\uc774 ‘{length}’\uc5d0\uc11c\ub294 {from}–{to}\ubc88\uc9f8 \uc904\uc774 \ub098\uc624\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4: {names}.",
    dropRows: { other: "\ub05d\ub098\uae30 \uc804\uc5d0 \ubaa8\ub4e0 \uc904\uc774 \uc62c\ub77c\uac00\uac8c \ud558\ub824\uba74 {count}\uc904\uc744 \uc9c0\uc6b0\uc138\uc694." },
    dropRowsOrLong: { other: "\ub05d\ub098\uae30 \uc804\uc5d0 \ubaa8\ub4e0 \uc904\uc774 \uc62c\ub77c\uac00\uac8c \ud558\ub824\uba74 {count}\uc904\uc744 \uc9c0\uc6b0\uac70\ub098 ‘{long}’\ub97c \uc120\ud0dd\ud558\uc138\uc694." },
    tooManyRows: { other: "\uc904\uc774 \ub108\ubb34 \ub9ce\uc544 \ub05d\ub098\uae30 \uc804\uc5d0 \ub2e4 \uc62c\ub77c\uac00\uc9c0 \ubabb\ud569\ub2c8\ub2e4. {count}\uc904\uc744 \uc9c0\uc6b0\uc138\uc694." },
    tooManyRowsOrLong: { other: "\uc904\uc774 \ub108\ubb34 \ub9ce\uc544 \ub05d\ub098\uae30 \uc804\uc5d0 \ub2e4 \uc62c\ub77c\uac00\uc9c0 \ubabb\ud569\ub2c8\ub2e4. {count}\uc904\uc744 \uc9c0\uc6b0\uac70\ub098 ‘{long}’\ub97c \uc120\ud0dd\ud558\uc138\uc694." },
    creditsEndEarly: "\ud06c\ub808\ub527\uc774 \uc601\uc0c1\ubcf4\ub2e4 \uba3c\uc800 \ub05d\ub098\uace0, \uc774\ud6c4\uc5d0\ub294 \uac80\uc740 \ud654\uba74\ub9cc \uc774\uc5b4\uc9d1\ub2c8\ub2e4.",
    "step.prepare": "\uc0f7 \ucc3e\uae30",
    "step.plan": "\ud3b8\uc9d1 \uacc4\ud68d",
    "step.music": "\uc74c\uc545 \uc900\ube44",
    "step.assemble": "Draft \ub9cc\ub4e4\uae30",
    "step.decorate": "\ud06c\ub808\ub527\uacfc \uc0c9\uac10 \ucd94\uac00",
    progress: "{step}/{total}\ub2e8\uacc4 · {name} · {percent}%",
    progressDetail: "{step}/{total}\ub2e8\uacc4 · {name} ({detail}) · {percent}%",
    videosChecked: { other: "\uc601\uc0c1 {done}/{count}\uac1c \ud655\uc778" },
    videosMeasured: { other: "\uc601\uc0c1 {done}/{count}\uac1c \uce21\uc815" },
    clipsChecking: { other: "\ud074\ub9bd \ud655\uc778 \uc911 {done}/{count}" },
    openingDraft: "Draft \uc5ec\ub294 \uc911",
    stoppedAt: "{step}/{total}\ub2e8\uacc4({name})\uc5d0\uc11c \uc911\ub2e8\ub418\uc5c8\uc2b5\ub2c8\ub2e4: {detail}",
    build: "\ub9cc\ub4e4\uae30",
    building: "\ub9cc\ub4dc\ub294 \uc911",
    anotherVersion: "\ub2e4\ub978 \uc0f7\uc73c\ub85c \ub9cc\ub4e4\uae30",
    finishTitle: "\ud0c0\uc774\ud2c0\uacfc \uc0c9\uac10 \ub9c8\ubb34\ub9ac",
    draftCreated: "Draft\ub97c \ub9cc\ub4e4\uc5c8\uc2b5\ub2c8\ub2e4. \ud06c\ub808\ub527\uc744 \uc120\ud0dd\ud558\uba74 \uc870\uc815 \ud0ed\uc5d0\uc11c \ud0c0\uc774\ud2c0·\uc904·\uc0c9·\uc2a4\ud06c\ub864 \uc18d\ub3c4\ub97c, \uc0f7\uc744 \uc120\ud0dd\ud558\uba74 \ucc3d \uc704\uce58\uc640 \ud06c\uae30·\ud398\uc774\ub4dc·\ubaa8\uc158·\uc0c9\uac10 \uac15\ub3c4\ub97c, \uc74c\uc545\uc744 \uc120\ud0dd\ud558\uba74 \uc74c\ub7c9\uc744 \ubc14\uafc0 \uc218 \uc788\uc2b5\ub2c8\ub2e4.",
    draftCreatedAdding: "Draft\ub97c \ub9cc\ub4e4\uc5c8\uc2b5\ub2c8\ub2e4. \ud06c\ub808\ub527\uacfc \uc0c9\uac10\uc744 \ucd94\uac00\ud558\ub294 \uc911…",
    openDraft: "\uc0c8 Draft \uc5f4\uae30",
    copyLink: "\uc0c8 Draft \ub9c1\ud06c \ubcf5\uc0ac",
    shortened: { other: "\uc601\uc0c1\uc73c\ub85c \ucc44\uc6b8 \uc218 \uc788\ub294 \uc0f7\uc774 {count}\uac1c\ub77c\uc11c, \uc774 \uc601\uc0c1\uc740 {fullSeconds}\ucd08\uac00 \uc544\ub2c8\ub77c \uc57d {seconds}\ucd08\uc785\ub2c8\ub2e4. \uc804\uccb4 \uae38\uc774\ub85c \ub9cc\ub4e4\ub824\uba74 \ud074\ub9bd\uc774\ub098 \uc0ac\uc9c4\uc744 \ub354 \ucd94\uac00\ud558\uc138\uc694." },
    note: "\ucc38\uace0: {detail}.",
    unchecked: { other: "\uc601\uc0c1 {count}\uac1c\ub97c \ud655\uc778\ud558\uc9c0 \ubabb\ud574 \uac74\ub108\ub6f0\uc5c8\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \ub9cc\ub4e4\uba74 \uc7ac\uc2dc\ub3c4\ud569\ub2c8\ub2e4." },
    startFailed: "THE END Credits\ub97c \uc2dc\uc791\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}. \ubb38\uc81c\uac00 \uacc4\uc18d\ub418\uba74 \ud50c\ub7ec\uadf8\uc778\uc744 \ub2e4\uc2dc \uc124\uce58\ud558\uc138\uc694.",
    foldersNotFound: "\ud50c\ub7ec\uadf8\uc778 \ud3f4\ub354\ub97c \ucc3e\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4",
    stepFailed: "Selects\uac00 \uc774 \ub2e8\uacc4\ub97c \uc644\ub8cc\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.",
    musicUnreadable: "\uc774 \uc74c\uc545 \ud30c\uc77c\uc744 \uc77d\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4({detail}). \ub2e4\ub978 \ud30c\uc77c\uc774\ub098 \uc81c\uacf5\ub41c \ud2b8\ub799\uc744 \uc120\ud0dd\ud558\uc138\uc694.",
    beatFailed: "\ube44\ud2b8 \uac10\uc9c0\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4",
    previewFailed: "\ubbf8\ub9ac\ub4e3\uae30\ub97c \uc7ac\uc0dd\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}.",
    dropMusic: "\uc74c\uc545 \ud30c\uc77c\uc744 \ub04c\uc5b4\ub2e4 \ub193\uac70\ub098 \uc81c\uacf5\ub41c \ud2b8\ub799\uc744 \uc120\ud0dd\ud558\uc138\uc694.",
    trackTooShort: "\uc774 \uae38\uc774\ub85c \ub9cc\ub4e4\uae30\uc5d0\ub294 \ud2b8\ub799\uc774 \ub108\ubb34 \uc9e7\uc2b5\ub2c8\ub2e4.",
    musicNotReady: "\uc74c\uc545\uc774 \uc544\uc9c1 \uc900\ube44\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4.",
    draftNoId: "Draft “{name}”\uc740(\ub294) \uc800\uc7a5\ub418\uc5c8\uc9c0\ub9cc Selects\uac00 ID\ub97c \uc54c\ub824\uc8fc\uc9c0 \uc54a\uc544 \ud06c\ub808\ub527\uacfc \uc0c9\uac10\uc744 \ucd94\uac00\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. Draft \ubaa9\ub85d\uc5d0\uc11c \uc5f4\uac70\ub098 \ub2e4\uc2dc \ub9cc\ub4dc\uc138\uc694.",
    finishFailed: "Draft\ub294 \ub9cc\ub4e4\uc5c8\uc9c0\ub9cc \ub9c8\ubb34\ub9ac(\ud06c\ub808\ub527, \uc0c9\uac10, \uc0f7 \ucc3d)\ub97c \ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}. ‘\ud0c0\uc774\ud2c0\uacfc \uc0c9\uac10 \ub9c8\ubb34\ub9ac’\ub97c \ub20c\ub7ec \ub2e4\uc2dc \uc2dc\ub3c4\ud558\uc138\uc694.",
    openFailed: "Draft\ub294 \uc900\ube44\ub418\uc5c8\uc9c0\ub9cc \uc5f4\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}. \uc544\ub798 \ub9c1\ud06c\ub97c \uc4f0\uac70\ub098 Draft \ubaa9\ub85d\uc5d0\uc11c \uc5ec\uc138\uc694.",
    "param.titleColor": "\ud0c0\uc774\ud2c0 \uc0c9",
    "param.creditColor": "\ud06c\ub808\ub527 \uc0c9",
    "param.rollSpeed": "\uc2a4\ud06c\ub864 \uc18d\ub3c4",
    "param.showTitle": "\ud0c0\uc774\ud2c0 \ud45c\uc2dc",
    "param.windowX": "\ucc3d X(%)",
    "param.windowY": "\ucc3d Y(%)",
    "param.windowSize": "\ucc3d \ud06c\uae30(%)",
    "param.fadeIn": "\ud398\uc774\ub4dc \uc778(\ucd08)",
    "param.fadeOut": "\ud398\uc774\ub4dc \uc544\uc6c3(\ucd08)",
    "param.motion": "\ubaa8\uc158",
    "param.motionStrength": "\ubaa8\uc158 \uac15\ub3c4",
    "param.lookStrength": "\uc0c9\uac10 \uac15\ub3c4",
    "motion.none": "\uc5c6\uc74c",
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
    openProject: "Abra um projeto para criar THE END Credits.",
    refresh: "Atualizar",
    refreshing: "Atualizando",
    refreshFailed: "Não foi possível atualizar a lista de clipes: {detail}",
    readFailed: "Não foi possível ler os clipes deste projeto: {detail}",
    checkingClipsNow: "Verificando clipes…",
    checkingClips: "Verificando clipes",
    listening: "Procurando a batida",
    working: "Trabalhando",
    noFootage: "Este projeto ainda não tem vídeos nem fotos. Adicione clipes de vídeo ou fotos; a lista é atualizada automaticamente.",
    analysedBetter: "Clipes analisados permitem escolher planos melhores.",
    stillImporting: { one: "{count} clipe ainda está sendo importado; isto se atualiza sozinho.", many: "{count} de clipes ainda estão sendo importados; isto se atualiza sozinho.", other: "{count} clipes ainda estão sendo importados; isto se atualiza sozinho." },
    turnOnPhotos: "Ative “Usar fotos” em “Avançado” para criar com as fotos deste projeto.",
    noClipsSelected: "Nenhum clipe selecionado. Escolha clipes em “Avançado”.",
    needsShots: { one: "Precisa de pelo menos {count} clipe ou foto utilizável (encontrados: {found}).", many: "Precisa de pelo menos {count} de clipes ou fotos utilizáveis (encontrados: {found}).", other: "Precisa de pelo menos {count} clipes ou fotos utilizáveis (encontrados: {found})." },
    addFootage: "Adicione material mais variado ou selecione mais clipes.",
    addFootagePhotos: "Adicione material mais variado ou fotos.",
    addFootagePhotosSelect: "Adicione material mais variado ou fotos, ou selecione mais clipes.",
    retryUnchecked: { one: "Não foi possível verificar {count} clipe; pressione “Criar” para tentar de novo.", many: "Não foi possível verificar {count} de clipes; pressione “Criar” para tentar de novo.", other: "Não foi possível verificar {count} clipes; pressione “Criar” para tentar de novo." },
    gap: " ",
    listSep: ", ",
    ready: "Pronto: {summary}",
    clips: { one: "{count} clipe", many: "{count} de clipes", other: "{count} clipes" },
    clipsSelected: { one: "{selected} de {count} clipe selecionado", many: "{selected} de {count} de clipes selecionados", other: "{selected} de {count} clipes selecionados" },
    photos: { one: "{count} foto", many: "{count} de fotos", other: "{count} fotos" },
    photosSelected: { one: "{selected} de {count} foto selecionada", many: "{selected} de {count} de fotos selecionadas", other: "{selected} de {count} fotos selecionadas" },
    shots: { one: "{count} plano", many: "{count} de planos", other: "{count} planos" },
    shotsFitted: { one: "{count} plano (seu material rende {count})", many: "{count} de planos (seu material rende {count})", other: "{count} planos (seu material rende {count})" },
    aboutSeconds: "cerca de {seconds} s",
    layout: "Layout",
    "layout.classic": "Clássico (janela)",
    "layout.full": "Tela cheia",
    title: "Título",
    credits: "Créditos",
    preset: "Predefinição",
    "preset.filmCrew": "Equipe de filmagem",
    "preset.personal": "Pessoal",
    "preset.travel": "Viagem",
    creditRows: "Linhas dos créditos",
    creditN: "Crédito {n}",
    roleN: "Função {n}",
    nameN: "Nome {n}",
    rolePlaceholder: "Função (ex.: Direção)",
    namePlaceholder: "Nome",
    resetPreset: "Restaurar predefinição",
    "list.reorderHandle": "Reordenar a linha {n}: {label}",
    "list.removeRow": "Remover a linha {n}",
    "list.moved": "{label} movido para a posição {pos} de {total}",
    "list.addRow": "Adicionar linha",
    noRows: "Sem linhas: os créditos mostram só o título.",
    rowsHint: "Linhas com os dois campos vazios são ignoradas. Substitua o texto entre [colchetes] pelo seu.",
    placeholdersLeft: { one: "{count} linha ainda tem um texto de exemplo.", many: "{count} de linhas ainda têm textos de exemplo.", other: "{count} linhas ainda têm textos de exemplo." },
    systemFont: "Alguns caracteres usam uma fonte do sistema.",
    length: "Duração",
    "length.short": "Curta",
    "length.standard": "Padrão",
    "length.long": "Longa",
    music: "Música",
    track: "Faixa",
    ownMusic: "Sua própria música",
    noMusic: "Sem música",
    dropAudio: "Solte um arquivo de áudio (mp3, wav, m4a…) que esteja neste computador.",
    needsNewerSelects: "Isso requer uma versão mais recente do Selects.",
    noSteadyBeat: "Nenhuma batida constante encontrada: os planos duram {seconds} s.",
    beatApprox: "Batida encontrada (aproximada): os planos a seguem a cada {seconds} s.",
    sectionHint: "Trecho da música: arraste para escolher",
    sectionLabel: "Trecho da música",
    musicTooShort: "Esta música é curta demais para esta duração",
    startsAt: "Começa em {seconds} s",
    startsAtSwell: "Começa em {seconds} s · o título entra no ápice",
    startsAtLoudest: "Começa em {seconds} s · o título entra na parte mais forte",
    stopPreview: "Parar a prévia",
    cancelPreview: "Cancelar a prévia",
    previewWhole: "Ouvir a música do vídeo inteiro",
    readingMusic: "Lendo a música…",
    tooShortFor: "Esta faixa é curta demais para “{length}”.",
    useLength: "Usar “{length}”",
    tooShortNeeds: "Esta faixa é curta demais (precisa de ≥ {seconds} s).",
    silentVideo: "Vídeo sem som: sem música e com o som dos clipes em “Desligado”.",
    advanced: "Avançado",
    clipSound: "Som dos clipes",
    "sound.ambient": "Ambiente",
    "sound.full": "Total",
    "sound.off": "Desligado",
    cinematicLook: "Look cinematográfico",
    usePhotos: "Usar fotos",
    usePhotosOff: "“Usar fotos” está desativado",
    chooseClips: "Escolher clipes",
    chooseClipsCount: "Escolher clipes ({selected}/{total})",
    all: "Todos",
    none: "Nenhum",
    photo: "Foto",
    "shape.tall": "Vertical",
    "shape.wide": "Horizontal",
    "shape.square": "Quadrado",
    preview: "Prévia",
    creditsPreview: "Prévia dos créditos",
    previewAt: "Prévia em",
    secondsUnit: "s",
    firstRow: "Primeira linha",
    lastRow: "Última linha",
    end: "Fim",
    noCreditRows: "Sem linhas de créditos: só o título aparece.",
    rowHidden: "A linha {from} não vai aparecer em “{length}”: {names}.",
    rowsHidden: "As linhas {from}–{to} não vão aparecer em “{length}”: {names}.",
    dropRows: { one: "Para que todas as linhas saiam antes do fim, remova {count} linha.", many: "Para que todas as linhas saiam antes do fim, remova {count} de linhas.", other: "Para que todas as linhas saiam antes do fim, remova {count} linhas." },
    dropRowsOrLong: { one: "Para que todas as linhas saiam antes do fim, remova {count} linha ou escolha “{long}”.", many: "Para que todas as linhas saiam antes do fim, remova {count} de linhas ou escolha “{long}”.", other: "Para que todas as linhas saiam antes do fim, remova {count} linhas ou escolha “{long}”." },
    tooManyRows: { one: "Linhas demais para saírem antes do fim: remova {count} linha.", many: "Linhas demais para saírem antes do fim: remova {count} de linhas.", other: "Linhas demais para saírem antes do fim: remova {count} linhas." },
    tooManyRowsOrLong: { one: "Linhas demais para saírem antes do fim: remova {count} linha ou escolha “{long}”.", many: "Linhas demais para saírem antes do fim: remova {count} de linhas ou escolha “{long}”.", other: "Linhas demais para saírem antes do fim: remova {count} linhas ou escolha “{long}”." },
    creditsEndEarly: "Os créditos terminam antes do fim: a rolagem continua sobre o preto.",
    "step.prepare": "Procurando planos",
    "step.plan": "Planejando a edição",
    "step.music": "Preparando a música",
    "step.assemble": "Criando o Draft",
    "step.decorate": "Adicionando créditos e look",
    progress: "Etapa {step}/{total} · {name} · {percent}%",
    progressDetail: "Etapa {step}/{total} · {name} ({detail}) · {percent}%",
    videosChecked: { one: "{done}/{count} vídeo verificado", many: "{done}/{count} de vídeos verificados", other: "{done}/{count} vídeos verificados" },
    videosMeasured: { one: "{done}/{count} vídeo medido", many: "{done}/{count} de vídeos medidos", other: "{done}/{count} vídeos medidos" },
    clipsChecking: { one: "Verificando clipe {done}/{count}", many: "Verificando clipes {done}/{count}", other: "Verificando clipes {done}/{count}" },
    openingDraft: "abrindo o Draft",
    stoppedAt: "Parou na etapa {step}/{total} ({name}): {detail}",
    build: "Criar",
    building: "Criando",
    anotherVersion: "Testar outros planos",
    finishTitle: "Concluir título e look",
    draftCreated: "Draft criado. Selecione os créditos para editar em Ajustar o título, as linhas, as cores ou a velocidade de rolagem; um plano para mover ou redimensionar a janela dele ou mudar as transições, o movimento ou a intensidade do look; e a música para mudar o volume.",
    draftCreatedAdding: "Draft criado; adicionando créditos e look…",
    openDraft: "Abrir o novo Draft",
    copyLink: "Copiar o link do novo Draft",
    shortened: { one: "Seu material rende {count} plano, então este vídeo tem cerca de {seconds} s em vez de {fullSeconds} s. Adicione mais clipes ou fotos para a duração completa.", many: "Seu material rende {count} de planos, então este vídeo tem cerca de {seconds} s em vez de {fullSeconds} s. Adicione mais clipes ou fotos para a duração completa.", other: "Seu material rende {count} planos, então este vídeo tem cerca de {seconds} s em vez de {fullSeconds} s. Adicione mais clipes ou fotos para a duração completa." },
    note: "Observação: {detail}.",
    unchecked: { one: "Não foi possível verificar {count} vídeo, que foi ignorado. Crie de novo para tentar outra vez.", many: "Não foi possível verificar {count} de vídeos, que foram ignorados. Crie de novo para tentar outra vez.", other: "Não foi possível verificar {count} vídeos, que foram ignorados. Crie de novo para tentar outra vez." },
    startFailed: "Não foi possível iniciar o THE END Credits: {detail}. Reinstale o plugin se o problema continuar.",
    foldersNotFound: "as pastas do plugin não foram encontradas",
    stepFailed: "O Selects não conseguiu concluir esta etapa.",
    musicUnreadable: "Não foi possível ler este arquivo de música ({detail}). Escolha outro arquivo ou uma das faixas.",
    beatFailed: "a detecção da batida falhou",
    previewFailed: "Não foi possível reproduzir a prévia: {detail}.",
    dropMusic: "Solte um arquivo de música ou escolha uma das faixas.",
    trackTooShort: "Esta faixa é curta demais para esta duração.",
    musicNotReady: "A música ainda não está pronta.",
    draftNoId: "O Draft “{name}” foi salvo, mas o Selects não informou o id dele, então os créditos e o look não puderam ser adicionados. Abra-o pela lista de Drafts ou crie de novo.",
    finishFailed: "O Draft foi criado, mas não pôde ser concluído (créditos, look e janelas dos planos): {detail}. Pressione “Concluir título e look” para tentar de novo.",
    openFailed: "O Draft está pronto, mas não pôde ser aberto: {detail}. Use o link abaixo ou abra-o pela lista de Drafts.",
    "param.titleColor": "Cor do título",
    "param.creditColor": "Cor dos créditos",
    "param.rollSpeed": "Velocidade de rolagem",
    "param.showTitle": "Mostrar título",
    "param.windowX": "Janela X (%)",
    "param.windowY": "Janela Y (%)",
    "param.windowSize": "Tamanho da janela (%)",
    "param.fadeIn": "Fade de entrada (s)",
    "param.fadeOut": "Fade de saída (s)",
    "param.motion": "Movimento",
    "param.motionStrength": "Intensidade do movimento",
    "param.lookStrength": "Intensidade do look",
    "motion.none": "Nenhum",
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
    openProject: "THE END Credits oluşturmak için bir proje açın.",
    refresh: "Yenile",
    refreshing: "Yenileniyor",
    refreshFailed: "Klip listesi yenilenemedi: {detail}",
    readFailed: "Bu projedeki klipler okunamadı: {detail}",
    checkingClipsNow: "Klipler kontrol ediliyor…",
    checkingClips: "Klipler kontrol ediliyor",
    listening: "Ritim aranıyor",
    working: "Çalışıyor",
    noFootage: "Bu projede henüz video veya fotoğraf yok. Video klipleri ya da fotoğraf ekleyin; burası otomatik olarak güncellenir.",
    analysedBetter: "Analiz edilmiş kliplerle daha iyi çekimler seçilir.",
    stillImporting: { one: "{count} klip hâlâ içe aktarılıyor; bu otomatik olarak güncellenir.", other: "{count} klip hâlâ içe aktarılıyor; bu otomatik olarak güncellenir." },
    turnOnPhotos: "Bu projenin fotoğraflarından oluşturmak için “Gelişmiş” bölümünde “Fotoğrafları kullan” seçeneğini açın.",
    noClipsSelected: "Klip seçilmedi. “Gelişmiş” bölümünden klip seçin.",
    needsShots: { one: "En az {count} kullanılabilir klip veya fotoğraf gerekir ({found} bulundu).", other: "En az {count} kullanılabilir klip veya fotoğraf gerekir ({found} bulundu)." },
    addFootage: "Daha çeşitli görüntüler ekleyin veya daha fazla klip seçin.",
    addFootagePhotos: "Daha çeşitli görüntüler veya fotoğraflar ekleyin.",
    addFootagePhotosSelect: "Daha çeşitli görüntüler veya fotoğraflar ekleyin ya da daha fazla klip seçin.",
    retryUnchecked: { one: "{count} klip kontrol edilemedi; yeniden denemek için “Oluştur”a basın.", other: "{count} klip kontrol edilemedi; yeniden denemek için “Oluştur”a basın." },
    gap: " ",
    listSep: ", ",
    ready: "Hazır: {summary}",
    clips: { one: "{count} klip", other: "{count} klip" },
    clipsSelected: { one: "{count} klipten {selected} tanesi seçili", other: "{count} klipten {selected} tanesi seçili" },
    photos: { one: "{count} fotoğraf", other: "{count} fotoğraf" },
    photosSelected: { one: "{count} fotoğraftan {selected} tanesi seçili", other: "{count} fotoğraftan {selected} tanesi seçili" },
    shots: { one: "{count} çekim", other: "{count} çekim" },
    shotsFitted: { one: "{count} çekim (görüntüleriniz {count} çekime yetiyor)", other: "{count} çekim (görüntüleriniz {count} çekime yetiyor)" },
    aboutSeconds: "yaklaşık {seconds} sn",
    layout: "Düzen",
    "layout.classic": "Klasik (pencere)",
    "layout.full": "Tam kare",
    title: "Başlık",
    credits: "Jenerik",
    preset: "Hazır ayar",
    "preset.filmCrew": "Film ekibi",
    "preset.personal": "Kişisel",
    "preset.travel": "Seyahat",
    creditRows: "Jenerik satırları",
    creditN: "Jenerik {n}",
    roleN: "Görev {n}",
    nameN: "İsim {n}",
    rolePlaceholder: "Görev (ör. Yönetmen)",
    namePlaceholder: "İsim",
    resetPreset: "Hazır ayara sıfırla",
    "list.reorderHandle": "{n}. satırı taşı: {label}",
    "list.removeRow": "{n}. satırı kaldır",
    "list.moved": "{label}, {total} öğe içinde {pos}. sıraya taşındı",
    "list.addRow": "Satır ekle",
    noRows: "Satır yok: jenerikte yalnızca başlık görünür.",
    rowsHint: "İki alanı da boş olan satırlar atlanır. [Köşeli parantez] içindeki metni kendinizinkiyle değiştirin.",
    placeholdersLeft: { one: "{count} satırda hâlâ örnek metin var.", other: "{count} satırda hâlâ örnek metin var." },
    systemFont: "Bazı karakterler bir sistem yazı tipi kullanıyor.",
    length: "Uzunluk",
    "length.short": "Kısa",
    "length.standard": "Standart",
    "length.long": "Uzun",
    music: "Müzik",
    track: "Parça",
    ownMusic: "Kendi müziğiniz",
    noMusic: "Müzik yok",
    dropAudio: "Bu bilgisayardaki bir ses dosyasını (mp3, wav, m4a…) bırakın.",
    needsNewerSelects: "Bunun için Selects'in daha yeni bir sürümü gerekir.",
    noSteadyBeat: "Düzenli bir ritim bulunamadı: çekimler {seconds} sn sürüyor.",
    beatApprox: "Ritim bulundu (yaklaşık): çekimler her {seconds} sn'de onu takip ediyor.",
    sectionHint: "Müzik bölümü — seçmek için sürükleyin",
    sectionLabel: "Müzik bölümü",
    musicTooShort: "Bu müzik bu uzunluk için çok kısa",
    startsAt: "{seconds} sn'de başlar",
    startsAtSwell: "{seconds} sn'de başlar · başlık doruk noktasında belirir",
    startsAtLoudest: "{seconds} sn'de başlar · başlık en yüksek bölümde belirir",
    stopPreview: "Önizlemeyi durdur",
    cancelPreview: "Önizlemeyi iptal et",
    previewWhole: "Tüm videonun müziğini önizle",
    readingMusic: "Müzik okunuyor…",
    tooShortFor: "Bu parça “{length}” için çok kısa.",
    useLength: "“{length}” kullan",
    tooShortNeeds: "Bu parça çok kısa (≥ {seconds} sn gerekir).",
    silentVideo: "Sessiz video: müzik yok ve klip sesi “Kapalı”.",
    advanced: "Gelişmiş",
    clipSound: "Klip sesi",
    "sound.ambient": "Ortam",
    "sound.full": "Tam",
    "sound.off": "Kapalı",
    cinematicLook: "Sinematik görünüm",
    usePhotos: "Fotoğrafları kullan",
    usePhotosOff: "“Fotoğrafları kullan” kapalı",
    chooseClips: "Klip seç",
    chooseClipsCount: "Klip seç ({selected}/{total})",
    all: "Tümü",
    none: "Hiçbiri",
    photo: "Fotoğraf",
    "shape.tall": "Dikey",
    "shape.wide": "Yatay",
    "shape.square": "Kare",
    preview: "Önizleme",
    creditsPreview: "Jenerik önizlemesi",
    previewAt: "Önizleme anı",
    secondsUnit: "sn",
    firstRow: "İlk satır",
    lastRow: "Son satır",
    end: "Son",
    noCreditRows: "Jenerik satırı yok: yalnızca başlık görünür.",
    rowHidden: "{from}. satır “{length}” uzunluğunda görünmeyecek: {names}.",
    rowsHidden: "{from}–{to}. satırlar “{length}” uzunluğunda görünmeyecek: {names}.",
    dropRows: { one: "Tüm satırların bitişten önce kayıp çıkması için {count} satır kaldırın.", other: "Tüm satırların bitişten önce kayıp çıkması için {count} satır kaldırın." },
    dropRowsOrLong: { one: "Tüm satırların bitişten önce kayıp çıkması için {count} satır kaldırın veya “{long}” seçin.", other: "Tüm satırların bitişten önce kayıp çıkması için {count} satır kaldırın veya “{long}” seçin." },
    tooManyRows: { one: "Bitişten önce kayıp çıkmak için çok fazla satır var: {count} satır kaldırın.", other: "Bitişten önce kayıp çıkmak için çok fazla satır var: {count} satır kaldırın." },
    tooManyRowsOrLong: { one: "Bitişten önce kayıp çıkmak için çok fazla satır var: {count} satır kaldırın veya “{long}” seçin.", other: "Bitişten önce kayıp çıkmak için çok fazla satır var: {count} satır kaldırın veya “{long}” seçin." },
    creditsEndEarly: "Jenerik videodan önce bitiyor: kayma siyah ekran üzerinde sürüyor.",
    "step.prepare": "Çekimler aranıyor",
    "step.plan": "Kurgu planlanıyor",
    "step.music": "Müzik hazırlanıyor",
    "step.assemble": "Draft oluşturuluyor",
    "step.decorate": "Jenerik ve görünüm ekleniyor",
    progress: "Adım {step}/{total} · {name} · %{percent}",
    progressDetail: "Adım {step}/{total} · {name} ({detail}) · %{percent}",
    videosChecked: { one: "{done}/{count} video kontrol edildi", other: "{done}/{count} video kontrol edildi" },
    videosMeasured: { one: "{done}/{count} video ölçüldü", other: "{done}/{count} video ölçüldü" },
    clipsChecking: { one: "Klipler kontrol ediliyor {done}/{count}", other: "Klipler kontrol ediliyor {done}/{count}" },
    openingDraft: "Draft açılıyor",
    stoppedAt: "{step}/{total}. adımda durdu ({name}): {detail}",
    build: "Oluştur",
    building: "Oluşturuluyor",
    anotherVersion: "Başka çekimler dene",
    finishTitle: "Başlığı ve görünümü tamamla",
    draftCreated: "Draft oluşturuldu. Ayarla bölümünde başlığı, satırları, renkleri veya kayma hızını düzenlemek için jeneriği; penceresini taşımak ya da boyutlandırmak, geçişlerini, hareketini veya görünüm yoğunluğunu değiştirmek için bir çekimi; ses düzeyini değiştirmek için müziği seçin.",
    draftCreatedAdding: "Draft oluşturuldu; jenerik ve görünüm ekleniyor…",
    openDraft: "Yeni Draft'ı aç",
    copyLink: "Yeni Draft'ın bağlantısını kopyala",
    shortened: { one: "Görüntüleriniz {count} çekime yetiyor, bu yüzden bu video {fullSeconds} sn yerine yaklaşık {seconds} sn sürüyor. Tam uzunluk için daha fazla klip veya fotoğraf ekleyin.", other: "Görüntüleriniz {count} çekime yetiyor, bu yüzden bu video {fullSeconds} sn yerine yaklaşık {seconds} sn sürüyor. Tam uzunluk için daha fazla klip veya fotoğraf ekleyin." },
    note: "Not: {detail}.",
    unchecked: { one: "{count} video kontrol edilemedi ve atlandı. Yeniden denemek için tekrar oluşturun.", other: "{count} video kontrol edilemedi ve atlandı. Yeniden denemek için tekrar oluşturun." },
    startFailed: "THE END Credits başlatılamadı: {detail}. Sorun sürerse eklentiyi yeniden yükleyin.",
    foldersNotFound: "eklenti klasörleri bulunamadı",
    stepFailed: "Selects bu adımı tamamlayamadı.",
    musicUnreadable: "Bu müzik dosyası okunamadı ({detail}). Başka bir dosya veya hazır parçalardan birini seçin.",
    beatFailed: "ritim algılama başarısız oldu",
    previewFailed: "Önizleme oynatılamadı: {detail}.",
    dropMusic: "Bir müzik dosyası bırakın veya hazır parçalardan birini seçin.",
    trackTooShort: "Bu parça bu uzunluk için çok kısa.",
    musicNotReady: "Müzik henüz hazır değil.",
    draftNoId: "“{name}” adlı Draft kaydedildi ama Selects kimliğini bildirmedi, bu yüzden jenerik ve görünüm eklenemedi. Draft listesinden açın veya yeniden oluşturun.",
    finishFailed: "Draft oluşturuldu ama tamamlanamadı (jenerik, görünüm ve çekim pencereleri): {detail}. Yeniden denemek için “Başlığı ve görünümü tamamla”ya basın.",
    openFailed: "Draft hazır ama açılamadı: {detail}. Aşağıdaki bağlantıyı kullanın veya Draft listesinden açın.",
    "param.titleColor": "Başlık rengi",
    "param.creditColor": "Jenerik rengi",
    "param.rollSpeed": "Kayma hızı",
    "param.showTitle": "Başlığı göster",
    "param.windowX": "Pencere X (%)",
    "param.windowY": "Pencere Y (%)",
    "param.windowSize": "Pencere boyutu (%)",
    "param.fadeIn": "Açılma (sn)",
    "param.fadeOut": "Kararma (sn)",
    "param.motion": "Hareket",
    "param.motionStrength": "Hareket gücü",
    "param.lookStrength": "Görünüm yoğunluğu",
    "motion.none": "Yok",
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
    openProject: "请先打开一个项目，再制作 THE END Credits。",
    refresh: "刷新",
    refreshing: "正在刷新",
    refreshFailed: "无法刷新片段列表：{detail}",
    readFailed: "无法读取此项目中的片段：{detail}",
    checkingClipsNow: "正在检查片段…",
    checkingClips: "正在检查片段",
    listening: "正在识别节拍",
    working: "处理中",
    noFootage: "此项目中还没有视频或照片。请添加视频片段或照片；这里会自动更新。",
    analysedBetter: "已分析的片段能挑出更好的镜头。",
    stillImporting: { other: "还有 {count} 个片段正在导入；这里会自动更新。" },
    turnOnPhotos: "请在“高级”中开启“使用照片”，即可用此项目的照片制作。",
    noClipsSelected: "未选择片段。请在“高级”中选择片段。",
    needsShots: { other: "至少需要 {count} 个可用的片段或照片（找到 {found} 个）。" },
    addFootage: "请添加更多样的素材，或选择更多片段。",
    addFootagePhotos: "请添加更多样的素材或照片。",
    addFootagePhotosSelect: "请添加更多样的素材或照片，或选择更多片段。",
    retryUnchecked: { other: "有 {count} 个片段无法检查；点击“生成”重试。" },
    gap: "",
    listSep: "、",
    ready: "已就绪：{summary}",
    clips: { other: "{count} 个片段" },
    clipsSelected: { other: "已选 {selected}/{count} 个片段" },
    photos: { other: "{count} 张照片" },
    photosSelected: { other: "已选 {selected}/{count} 张照片" },
    shots: { other: "{count} 个镜头" },
    shotsFitted: { other: "{count} 个镜头（素材可支持 {count} 个）" },
    aboutSeconds: "约 {seconds} 秒",
    layout: "版式",
    "layout.classic": "经典（小窗）",
    "layout.full": "全画面",
    title: "标题",
    credits: "字幕",
    preset: "预设",
    "preset.filmCrew": "电影剧组",
    "preset.personal": "个人",
    "preset.travel": "旅行",
    creditRows: "字幕行",
    creditN: "字幕 {n}",
    roleN: "职务 {n}",
    nameN: "姓名 {n}",
    rolePlaceholder: "职务（例如：导演）",
    namePlaceholder: "姓名",
    resetPreset: "恢复预设",
    "list.reorderHandle": "调整第 {n} 行的顺序：{label}",
    "list.removeRow": "删除第 {n} 行",
    "list.moved": "{label} 已移至第 {pos} 位（共 {total} 项）",
    "list.addRow": "添加一行",
    noRows: "没有字幕行：只显示标题。",
    rowsHint: "两栏都为空的行会被忽略。请把 [方括号] 中的文字换成你自己的内容。",
    placeholdersLeft: { other: "还有 {count} 行包含示例文字。" },
    systemFont: "部分字符使用系统字体显示。",
    length: "时长",
    "length.short": "短",
    "length.standard": "标准",
    "length.long": "长",
    music: "音乐",
    track: "曲目",
    ownMusic: "自己的音乐",
    noMusic: "无音乐",
    dropAudio: "请拖入这台电脑上的音频文件（mp3、wav、m4a 等）。",
    needsNewerSelects: "需要更新版本的 Selects。",
    noSteadyBeat: "未找到稳定的节拍：每个镜头 {seconds} 秒。",
    beatApprox: "已识别节拍（近似）：镜头每 {seconds} 秒跟随节拍切换。",
    sectionHint: "音乐片段 — 拖动选择",
    sectionLabel: "音乐片段",
    musicTooShort: "这段音乐太短，不够这个时长",
    startsAt: "从 {seconds} 秒开始",
    startsAtSwell: "从 {seconds} 秒开始 · 标题在高潮处出现",
    startsAtLoudest: "从 {seconds} 秒开始 · 标题在最响的部分出现",
    stopPreview: "停止试听",
    cancelPreview: "取消试听",
    previewWhole: "试听整个视频的音乐",
    readingMusic: "正在读取音乐…",
    tooShortFor: "这首曲目太短，不够“{length}”。",
    useLength: "改用“{length}”",
    tooShortNeeds: "这首曲目太短（至少需要 {seconds} 秒）。",
    silentVideo: "无声视频：没有音乐，且片段原声为“关闭”。",
    advanced: "高级",
    clipSound: "片段原声",
    "sound.ambient": "环境音",
    "sound.full": "原音量",
    "sound.off": "关闭",
    cinematicLook: "电影色调",
    usePhotos: "使用照片",
    usePhotosOff: "“使用照片”已关闭",
    chooseClips: "选择片段",
    chooseClipsCount: "选择片段（{selected}/{total}）",
    all: "全选",
    none: "全不选",
    photo: "照片",
    "shape.tall": "竖版",
    "shape.wide": "横版",
    "shape.square": "方形",
    preview: "预览",
    creditsPreview: "字幕预览",
    previewAt: "预览位置",
    secondsUnit: "秒",
    firstRow: "第一行",
    lastRow: "最后一行",
    end: "结尾",
    noCreditRows: "没有字幕行：只显示标题。",
    rowHidden: "在“{length}”中第 {from} 行不会出现：{names}。",
    rowsHidden: "在“{length}”中第 {from}–{to} 行不会出现：{names}。",
    dropRows: { other: "要让所有行在结尾前滚出画面，请删除 {count} 行。" },
    dropRowsOrLong: { other: "要让所有行在结尾前滚出画面，请删除 {count} 行或选择“{long}”。" },
    tooManyRows: { other: "行数太多，无法在结尾前滚出画面：请删除 {count} 行。" },
    tooManyRowsOrLong: { other: "行数太多，无法在结尾前滚出画面：请删除 {count} 行或选择“{long}”。" },
    creditsEndEarly: "字幕会在视频结束前滚完，之后是黑屏。",
    "step.prepare": "查找镜头",
    "step.plan": "规划剪辑",
    "step.music": "准备音乐",
    "step.assemble": "创建 Draft",
    "step.decorate": "添加字幕和色调",
    progress: "第 {step}/{total} 步 · {name} · {percent}%",
    progressDetail: "第 {step}/{total} 步 · {name}（{detail}）· {percent}%",
    videosChecked: { other: "已检查 {done}/{count} 个视频" },
    videosMeasured: { other: "已测量 {done}/{count} 个视频" },
    clipsChecking: { other: "正在检查片段 {done}/{count}" },
    openingDraft: "正在打开 Draft",
    stoppedAt: "在第 {step}/{total} 步（{name}）停止：{detail}",
    build: "生成",
    building: "正在生成",
    anotherVersion: "换一组镜头",
    finishTitle: "完成标题和色调",
    draftCreated: "Draft 已创建。选中字幕可在“调整”中编辑标题、行、颜色或滚动速度；选中镜头可移动或缩放其小窗，或更改淡入淡出、运动或色调强度；选中音乐可更改音量。",
    draftCreatedAdding: "Draft 已创建；正在添加字幕和色调…",
    openDraft: "打开新的 Draft",
    copyLink: "复制新 Draft 的链接",
    shortened: { other: "你的素材可支持 {count} 个镜头，因此这个视频约 {seconds} 秒，而不是 {fullSeconds} 秒。添加更多片段或照片即可达到完整时长。" },
    note: "提示：{detail}。",
    unchecked: { other: "有 {count} 个视频无法检查，已跳过。再次生成可重试。" },
    startFailed: "THE END Credits 无法启动：{detail}。如果问题持续，请重新安装插件。",
    foldersNotFound: "找不到插件文件夹",
    stepFailed: "Selects 无法完成这一步。",
    musicUnreadable: "无法读取这个音乐文件（{detail}）。请选择其他文件或内置曲目。",
    beatFailed: "节拍识别失败",
    previewFailed: "无法播放试听：{detail}。",
    dropMusic: "请拖入一个音乐文件，或选择内置曲目。",
    trackTooShort: "这首曲目太短，不够这个时长。",
    musicNotReady: "音乐尚未准备好。",
    draftNoId: "Draft“{name}”已保存，但 Selects 没有返回它的 ID，因此无法添加字幕和色调。请从 Draft 列表中打开它，或重新生成。",
    finishFailed: "Draft 已创建，但未能完成（字幕、色调和镜头小窗）：{detail}。点击“完成标题和色调”重试。",
    openFailed: "Draft 已就绪，但无法打开：{detail}。请使用下方链接，或从 Draft 列表中打开。",
    "param.titleColor": "标题颜色",
    "param.creditColor": "字幕颜色",
    "param.rollSpeed": "滚动速度",
    "param.showTitle": "显示标题",
    "param.windowX": "小窗 X（%）",
    "param.windowY": "小窗 Y（%）",
    "param.windowSize": "小窗大小（%）",
    "param.fadeIn": "淡入（秒）",
    "param.fadeOut": "淡出（秒）",
    "param.motion": "运动",
    "param.motionStrength": "运动强度",
    "param.lookStrength": "色调强度",
    "motion.none": "无",
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
function sayError(lang: Lang, e: any): string {
  // A __DI__ member this Selects build lacks (the host block's 'host_tools'): one "needs a newer Selects" message.
  if (String(e?.message) === "host_tools") return t(lang, "needsNewerSelects");
  return typeof e?.say === "function" ? e.say(lang) : String(e?.message || e);
}

const PLUGIN_ID = "the-end-credits";
// Ambient clip sound: the clips' own sound sits this far under the music, which stays at 0 dB.
const AMBIENT_DB = -18;
const LOOK_STRENGTH = 0.5;
const MUSIC_FADE_OUT = 1.5;
const FADES = { inSec: 0.5, outSec: 1.13 };
// The shot window in % of the canvas (Classic), or the whole frame.
const WINDOWS = { classic: { x: 50.73, y: 12.69, w: 42.6 }, full: { x: 0, y: 0, w: 100 } };
const TITLE_COLOR = "#FBE4BB";
const CREDIT_COLOR = "#F0EBDD";
const DEFAULT_TITLE = "THE END";
// The bundled Latin-subset fonts; the graphic registers them from these b64 files, the preview through FontFace.
const TEC_FONTS = [
  { file: "tec-title-serif.woff2.b64", family: "TEC Title Serif", weight: 800, style: "normal" },
  { file: "tec-credits-sans.woff2.b64", family: "TEC Credits Sans", weight: 600, style: "normal" },
];
// Hangul falls back to the system Korean face of each role, macOS then Windows then a Noto install (serif title:
// AppleMyungjo, Batang, Noto Serif KR; sans credits: Apple SD Gothic Neo, Malgun Gothic, Noto Sans KR).
const TITLE_STACK = '"TEC Title Serif", Georgia, "Times New Roman", "AppleMyungjo", "Batang", "Noto Serif KR", serif';
const CREDITS_STACK = '"TEC Credits Sans", "Helvetica Neue", Arial, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
// The title is drawn condensed (scaleX 0.78), except a title holding Hangul: Hangul is never squeezed (the graphic's
// tecTitleScaleX).
const TITLE_SCALE_X = 0.78;
const HANGUL_RE = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/;
function titleScaleX(text: string) { return HANGUL_RE.test(text) ? 1 : TITLE_SCALE_X; }

// tec-planner:start
// THE END Credits planner. A plain script: panel.tsx embeds it verbatim (between the tec-planner markers) and the
// tests load it in node:vm. Spec v1.1 (R1-R7) is normative. Times are seconds on the music clock; assemble converts
// them to frames once at the real Draft fps.
//
// Timeline: [0, L) lead-in (Classic: an empty gap on Main, black under the typed title; Full frame: shot 0 under it), then
// N shots of one phrase P each, the last one extended by the tail T. Total L + N*P + T.
const TEC_LEAD_IN = 5.1;
const TEC_TAIL = 0.5;
const TEC_FIXED_PHRASE = 3.9;
// A phrase is m beats with m in TEC_BEAT_MULTIPLES and m * 60 / bpm inside [TEC_PHRASE_MIN, TEC_PHRASE_MAX].
const TEC_BEAT_MULTIPLES = [2, 4, 8];
const TEC_PHRASE_MIN = 3.4;
const TEC_PHRASE_MAX = 4.4;
const TEC_LENGTHS = { short: 5, standard: 7, long: 10 };
const TEC_LENGTH_ORDER = ['short', 'standard', 'long'];
const TEC_DEFAULT_LENGTH = 'standard';
// Fewest grid shots a build may shrink to (Full frame adds shot 0, so 4 + 1 visible shots there).
const TEC_MIN_SHOTS = 4;
// Music may be used up to this far before the end of the file.
const TEC_MUSIC_END_MARGIN = 0.1;

// Scene search roles (search.js sends the query, candidates come back with the role key).
const TEC_SEARCH_QUERIES = {
  wide: 'wide landscape',
  sunset: 'sunset or golden light',
  water: 'water or ocean',
  street: 'street or road',
  architecture: 'architecture',
  people: 'people walking or silhouettes',
};
const TEC_SEARCH_ROLES = ['wide', 'sunset', 'water', 'street', 'architecture', 'people'];
// The middle shots cycle through these after the opening wide shot; the last shot is the calm 'ending'.
const TEC_MIDDLE_ROLES = ['street', 'water', 'architecture', 'sunset', 'people', 'wide'];
// Which candidate roles may fill a slot role, best first.
const TEC_ROLE_FALLBACK = {
  'opening-wide': ['wide', 'water', 'sunset', 'architecture'],
  wide: ['wide', 'water', 'sunset', 'architecture'],
  ending: ['sunset', 'water', 'wide'],
  sunset: ['sunset', 'water', 'wide'],
  water: ['water', 'sunset', 'wide'],
  street: ['street', 'people', 'architecture'],
  architecture: ['architecture', 'street', 'wide'],
  people: ['people', 'street', 'wide'],
};

// ---------------------------------------------------------------------------------------------------------------
// Tempo and timeline

// { bpm, accepted } -> { P, m, fixed }. Own music whose detection was rejected, or where no multiple fits, gets the
// fixed 3.9 s phrase. The interval is narrower than a factor of 2, so at most one multiple fits.
function tecPhrase(opts) {
  const bpm = opts && opts.bpm;
  if (opts && opts.accepted !== false && typeof bpm === 'number' && isFinite(bpm) && bpm > 0) {
    for (const m of TEC_BEAT_MULTIPLES) {
      const P = m * 60 / bpm;
      if (P >= TEC_PHRASE_MIN - 1e-9 && P <= TEC_PHRASE_MAX + 1e-9) return { P, m, fixed: false };
    }
  }
  return { P: TEC_FIXED_PHRASE, m: null, fixed: true };
}

// beat-detect.cjs's tempo search range (bpm).
const TEC_DETECT_MIN_BPM = 70;
const TEC_DETECT_MAX_BPM = 180;

// Own music: beat-detect.cjs's result -> { P, m, fixed, approximate, firstBeat }. An accepted grid gives tecPhrase on
// its bpm. An 'approximate' grid (tight but sparse hits: the tempo and first beat are a usable guide, the beat may be
// faint) with a bpm in the detector's range gets the same phrase on the detected tempo and first beat, so the shots
// follow the detected beat (approximate: true). Anything else (grid 'none', a failed detection, or no multiple in
// range) gets the fixed 3.9 s phrase with firstBeat 0. hitRate is never read: it can be 1 on noise or one onset.
function tecOwnPhrase(det) {
  const d = det || {};
  const bpm = d.bpm, inRange = typeof bpm === 'number' && bpm >= TEC_DETECT_MIN_BPM && bpm <= TEC_DETECT_MAX_BPM;
  const approximate = d.accepted !== true && d.grid === 'approximate' && inRange;
  const ph = d.accepted === true || approximate ? tecPhrase({ bpm, accepted: true }) : tecPhrase({});
  const fb = typeof d.firstBeat === 'number' && isFinite(d.firstBeat) ? d.firstBeat : 0;
  return { P: ph.P, m: ph.m, fixed: ph.fixed, approximate: approximate && !ph.fixed, firstBeat: ph.fixed ? 0 : fb };
}

function tecVideoSeconds(N, P) { return TEC_LEAD_IN + N * P + TEC_TAIL; }

// The role of grid shot k (1..N) of N.
function tecShotRole(layout, k, N) {
  if (k === N) return 'ending';
  if (k === 1 && layout !== 'full') return 'wide';
  const i = layout === 'full' ? k - 1 : k - 2;
  return TEC_MIDDLE_ROLES[i % TEC_MIDDLE_ROLES.length];
}

// { layout: 'classic' | 'full', N, P } -> { layout, L, T, P, N, total, boundaries, slots }.
// boundaries are seconds from the video start: [0, L, L+P, ..., L+(N-1)P, L+N*P+T] (N + 2 entries).
// slots[0] is [0, L): Classic 'opening' (the lead-in gap; no footage), Full frame shot 0 (role 'opening-wide').
// slots[1..N] are the grid shots; the last one includes the tail.
function tecTimeline(opts) {
  const layout = opts.layout === 'full' ? 'full' : 'classic', N = opts.N, P = opts.P;
  if (!(N >= 1) || !(P > 0)) throw Error('tecTimeline needs N and P');
  const L = TEC_LEAD_IN, T = TEC_TAIL;
  const boundaries = [0, L];
  for (let k = 1; k < N; k++) boundaries.push(L + k * P);
  boundaries.push(L + N * P + T);
  const slots = [];
  for (let i = 0; i <= N; i++) {
    const seconds = boundaries[i + 1] - boundaries[i];
    if (i === 0) slots.push(layout === 'full' ? { index: 0, kind: 'shot', role: 'opening-wide', seconds } : { index: 0, kind: 'opening', role: null, seconds });
    else slots.push({ index: i, kind: 'shot', role: tecShotRole(layout, i, N), seconds });
  }
  return { layout, L, T, P, N, total: boundaries[boundaries.length - 1], boundaries, slots };
}

// Music section (spec R3). The section start s puts a phrase downbeat exactly at L: s = firstBeat + j*P - L, with
// s >= 0 and s + videoSeconds <= usableEnd. opts: { firstBeat, P, L?, videoSeconds, usableEnd, swell?, value?, fixed? }.
// swell: the bundled cue's swell (or the own music's loudest part); the default j is the smallest j whose downbeat
// is at or after it (within 1e-3 phrase: the manifest keeps the swell to the ms, so a swell on the grid can sit a
// fraction of a ms after its downbeat), clamped into the feasible range. value: a slider position (a section start in seconds) snapped
// to the nearest feasible j. Fixed timing (no steady beat): s is continuous in 0.1 s steps, default swell - L.
// Returns { start, j, jMin, jMax, min, max, defaultStart, defaultJ, fixed } or null when no start fits.
function tecSection(opts) {
  const L = opts.L == null ? TEC_LEAD_IN : opts.L, P = opts.P, need = opts.videoSeconds, end = opts.usableEnd;
  const finite = v => typeof v === 'number' && isFinite(v);
  if (!(P > 0) || !finite(need) || !finite(end)) return null;
  if (opts.fixed) {
    const max = Math.floor((end - need) * 10 + 1e-6) / 10;
    if (max < -1e-9) return null;
    const clamp = v => Math.max(0, Math.min(max, Math.round(v * 10) / 10));
    const defaultStart = clamp(finite(opts.swell) ? opts.swell - L : 0);
    const start = finite(opts.value) ? clamp(opts.value) : defaultStart;
    return { start, j: null, jMin: null, jMax: null, min: 0, max, defaultStart, defaultJ: null, fixed: true };
  }
  const fb = finite(opts.firstBeat) ? opts.firstBeat : 0;
  const at = j => fb + j * P - L;
  const jMin = Math.ceil((L - fb) / P - 1e-9);
  const jMax = Math.floor((end - need - fb + L) / P + 1e-9);
  if (jMax < jMin) return null;
  const clampJ = j => Math.max(jMin, Math.min(jMax, j));
  const defaultJ = clampJ(finite(opts.swell) ? Math.ceil((opts.swell - fb) / P - 1e-3) : jMin);
  const j = finite(opts.value) ? clampJ(Math.round((opts.value - fb + L) / P)) : defaultJ;
  return { start: at(j), j, jMin, jMax, min: at(jMin), max: at(jMax), defaultStart: at(defaultJ), defaultJ, fixed: false };
}

// The longest Length whose section fits the music, at or below `requested` (default: any).
// opts: { firstBeat, P, usableEnd, fixed?, requested? } -> { key, N, needSeconds } where key is null when not even
// Short fits; needSeconds is the music duration Short needs (usableEnd + the end margin).
function tecFitLength(opts) {
  const cap = opts.requested && TEC_LENGTHS[opts.requested] ? TEC_LENGTHS[opts.requested] : Infinity;
  const order = TEC_LENGTH_ORDER.slice().reverse();
  for (const key of order) {
    const N = TEC_LENGTHS[key];
    if (N > cap) continue;
    const s = tecSection({ firstBeat: opts.firstBeat, P: opts.P, videoSeconds: tecVideoSeconds(N, opts.P), usableEnd: opts.usableEnd, fixed: opts.fixed });
    if (s) return { key, N, needSeconds: null };
  }
  const shortSeconds = tecVideoSeconds(TEC_LENGTHS.short, opts.P);
  let earliest = 0;
  if (!opts.fixed) {
    const fb = typeof opts.firstBeat === 'number' && isFinite(opts.firstBeat) ? opts.firstBeat : 0;
    earliest = fb + Math.ceil((TEC_LEAD_IN - fb) / opts.P - 1e-9) * opts.P - TEC_LEAD_IN;
  }
  return { key: null, N: null, needSeconds: Math.ceil((earliest + shortSeconds + TEC_MUSIC_END_MARGIN) * 10 - 1e-6) / 10 };
}

// The loudest phrase of own music (the default reveal lands on it), in seconds, or null. grid: the beat-detect.cjs
// result { firstBeat, beatEnergy, peaks, durationSeconds }. With a steady beat (m beats per phrase): the phrase of m
// detector beats with the highest mean beat energy, from firstBeat. Without one (fixed): the P-long window of the
// waveform peaks with the highest mean. Ties keep the earliest.
function tecLoudest(grid, P, m, fixed) {
  const g = grid || {};
  if (!fixed && m && Array.isArray(g.beatEnergy) && g.beatEnergy.length >= m) {
    let best = -1, bestJ = 0;
    for (let j = 0; (j + 1) * m <= g.beatEnergy.length; j++) {
      const slice = g.beatEnergy.slice(j * m, (j + 1) * m);
      const mean = slice.reduce((a, b) => a + b, 0) / m;
      if (mean > best + 1e-9) { best = mean; bestJ = j; }
    }
    return g.firstBeat + bestJ * P;
  }
  const peaks = g.peaks || [], dur = g.durationSeconds;
  if (!peaks.length || !(dur > 0)) return null;
  const bucket = dur / peaks.length, span = Math.max(1, Math.round(P / bucket));
  let best = -1, at = 0;
  for (let i = 0; i + span <= peaks.length; i++) {
    let sum = 0;
    for (let k = i; k < i + span; k++) sum += peaks[k] || 0;
    if (sum > best + 1e-9) { best = sum; at = i; }
  }
  return at * bucket;
}

// ---------------------------------------------------------------------------------------------------------------
// In-shot motion. The reference's footage moves (surf, swaying palms, a car on a road); calm holds read static in the
// small window. The panel (and the headless adapter) measures every analysed clip once with ffmpeg: 4 frames per
// second, squeezed to TEC_MOTION_W x TEC_MOTION_H grey (any aspect: only frame-to-frame change matters), written as raw
// frames to a file, and the mean absolute difference of consecutive frames (0-255) computed here. tecMotionArgs is
// the argv for the host's ffmpeg (Runtime.runFFmpeg on macOS and Windows: an argv array, no shell, no path inside a
// filtergraph), tecMotionCurve the arithmetic, so the panel and the headless driver measure the same way.
const TEC_MOTION_FPS = 4;
const TEC_MOTION_W = 64;
const TEC_MOTION_H = 36;
function tecMotionArgs(file, out) {
  return ['-nostdin', '-v', 'error', '-y', '-an', '-sn', '-dn', '-i', String(file), '-vf',
    'fps=' + TEC_MOTION_FPS + ',scale=' + TEC_MOTION_W + ':' + TEC_MOTION_H + ',setsar=1,format=gray', '-f', 'rawvideo', String(out)];
}
// Allocation bonus for a moving window: TEC_MOTION_WEIGHT x its normalised motion (0-1). Below one role-rank step
// (0.15), so scene relevance still decides between a good and a poor match.
const TEC_MOTION_WEIGHT = 0.1;
// A sample above TEC_MOTION_SPIKE x the window's median is capped there (a flash, an in-clip cut, a bump), so one
// frame never makes a still window look moving.
const TEC_MOTION_SPIKE = 3;
// A window whose raw peak is at least TEC_MOTION_FLASH_MIN and TEC_MOTION_FLASH x its median holds a flash or a cut;
// one whose (capped) mean is above TEC_MOTION_SHAKE is shaky or strobing. Both score -1 (a penalty).
const TEC_MOTION_FLASH = 6;
const TEC_MOTION_FLASH_MIN = 8;
const TEC_MOTION_SHAKE = 30;
// Normalisation is on a log scale between the pool's quartiles (+ this floor): the lower quartile scores 0, the upper
// quartile and above 1 (capped), the median about 0.5.
const TEC_MOTION_LOG_FLOOR = 0.05;
// Still shots (for the gentle move on video): below TEC_MOTION_STILL always; above TEC_MOTION_MOVING never; in between
// when the window sits in the pool's lower third.
const TEC_MOTION_STILL = 0.6;
const TEC_MOTION_MOVING = 3;

// Raw grey frames (TEC_MOTION_W x TEC_MOTION_H bytes each, TEC_MOTION_FPS a second) -> { times, values }: the sample
// at t = k / TEC_MOTION_FPS is the mean absolute difference of frames k - 1 and k. null without two whole frames.
function tecMotionCurve(bytes) {
  const size = TEC_MOTION_W * TEC_MOTION_H;
  const n = bytes && bytes.length >= 2 * size ? Math.floor(bytes.length / size) : 0;
  if (n < 2) return null;
  const times = [], values = [];
  for (let k = 1; k < n; k++) {
    let sum = 0;
    const a = (k - 1) * size, b = k * size;
    for (let i = 0; i < size; i++) sum += Math.abs(bytes[b + i] - bytes[a + i]);
    times.push(k / TEC_MOTION_FPS);
    values.push(Math.round((sum / size) * 10000) / 10000);
  }
  return { times, values };
}

function tecMedian(list) {
  if (!list.length) return null;
  const s = list.slice().sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function tecQuantile(sorted, q) {
  if (!sorted.length) return null;
  const x = q * (sorted.length - 1), i = Math.floor(x), f = x - i;
  return i + 1 < sorted.length ? sorted[i] * (1 - f) + sorted[i + 1] * f : sorted[i];
}

// Motion of a curve inside (start, start + dur] (a sample at t is the difference of the frames at t - 1/4 s and t, so
// the samples in that range compare frames inside the window).
// Returns { mean (spike-capped), median, peak (raw), flash, n } or null when the window holds no sample.
function tecMotionStats(curve, start, dur) {
  if (!curve || !Array.isArray(curve.times) || !Array.isArray(curve.values)) return null;
  const v = [];
  for (let i = 0; i < curve.times.length; i++) if (curve.times[i] > start + 1e-9 && curve.times[i] <= start + dur + 1e-9) v.push(curve.values[i]);
  if (!v.length) return null;
  const median = tecMedian(v), cap = TEC_MOTION_SPIKE * Math.max(median, 0.1);
  const mean = v.reduce((a, x) => a + Math.min(x, cap), 0) / v.length;
  const peak = Math.max(...v);
  return { mean, median, peak, flash: peak >= TEC_MOTION_FLASH_MIN && peak > TEC_MOTION_FLASH * Math.max(median, 0.1), n: v.length };
}
// The spike-capped mean motion of a window, or null when it is unknown.
function tecMotionAt(curve, start, dur) {
  const m = tecMotionStats(curve, start, dur);
  return m ? m.mean : null;
}

// The pool's motion quartiles and lower third over every sample of every curve (rid -> curve), or null.
function tecMotionPool(curves) {
  const all = [];
  for (const c of Object.values(curves || {})) if (c && Array.isArray(c.values)) for (const v of c.values) if (isFinite(v)) all.push(v);
  if (!all.length) return null;
  all.sort((a, b) => a - b);
  return { q25: tecQuantile(all, 0.25), q33: tecQuantile(all, 1 / 3), q75: tecQuantile(all, 0.75), samples: all.length };
}

// A window's motion score for the allocation: -1 for a flash, a cut or shake; else 0 at or below the pool's lower
// quartile rising (log scale) to 1 at its upper quartile, capped there. 0 without data (the current scoring).
function tecMotionScore(stats, pool) {
  if (!stats || !pool) return 0;
  if (stats.flash || stats.mean > TEC_MOTION_SHAKE) return -1;
  const f = TEC_MOTION_LOG_FLOOR, lo = Math.log(pool.q25 + f), hi = Math.log(pool.q75 + f);
  if (!(hi - lo > 1e-9)) return 0;
  return Math.max(0, Math.min(1, (Math.log(stats.mean + f) - lo) / (hi - lo)));
}

// Whether a video window reads still (it gets a gentle move): unknown motion counts as still.
function tecMotionStill(mean, pool) {
  if (typeof mean !== 'number' || !isFinite(mean)) return true;
  if (mean < TEC_MOTION_STILL) return true;
  if (mean > TEC_MOTION_MOVING) return false;
  return !!pool && mean < pool.q33;
}

// ---------------------------------------------------------------------------------------------------------------
// Shot allocation (adapted from the City Weekend Vlog allocator)

// Scene-search hits collapse onto a few distinct times per clip, so every searched source also gets evenly spaced
// 'filler' candidates. They score below any real hit and are only used by the last tiers.
const TEC_FILLER_STEP = 0.5;
const TEC_FILLER_EDGE = 0.25;
const TEC_FILLER_SCORE = -2;
// A video window ends at least this far before the end of its source (the real fps and the music offset can
// lengthen a shot by a frame after planning).
const TEC_SOURCE_TAIL = 0.05;
// Photos: an image source lasts 5 s, so a photo fills one slot of at most that length (never the 5.1 s Full frame
// shot 0). About TEC_PHOTO_SHARE of the shots are photo slots; at most TEC_PHOTO_RUN_MAX photos in a row while
// anything else fits. The first and last shots prefer video (photos rank after fillers there).
const TEC_PHOTO_HOLD_MAX = 5;
const TEC_PHOTO_RUN_MAX = 2;
const TEC_PHOTO_SHARE = 1 / 3;

function tecHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}

// Filler candidates every TEC_FILLER_STEP seconds on each source in the candidates, sorted by rid then time.
function tecFillers(candidates) {
  const dur = {}, head = {};
  for (const c of candidates) {
    if (!c || c.kind === 'photo' || typeof c.sourceDuration !== 'number' || !isFinite(c.sourceDuration) || !(c.sourceDuration > 0)) continue;
    dur[c.rid] = Math.max(dur[c.rid] || 0, c.sourceDuration);
    if (c.minStart > 0) head[c.rid] = Math.max(head[c.rid] || 0, c.minStart);
  }
  const out = [];
  for (const rid of Object.keys(dur).sort()) {
    for (let k = 0; ; k++) {
      const t = TEC_FILLER_EDGE + k * TEC_FILLER_STEP;
      if (t > dur[rid] - TEC_FILLER_EDGE + 1e-9) break;
      // A source of local windows (no analysis) keeps their minStart, so its fillers never start in a fade-in either.
      out.push(head[rid] ? { rid, role: 'filler', t, score: TEC_FILLER_SCORE, sourceDuration: dur[rid], minStart: head[rid] }
        : { rid, role: 'filler', t, score: TEC_FILLER_SCORE, sourceDuration: dur[rid] });
    }
  }
  return out;
}

// opts: { candidates: [{ rid, role, t, score, sourceDuration } | { rid, kind: 'photo' }], slots: [{ index, role,
// seconds, prefersVideo? }], seed, photoShare?, gapSeconds?, motion?: { curves: { rid: curve }, pool } }. Slots are
// the footage slots in timeline order. With motion, a video window's value gains TEC_MOTION_WEIGHT x tecMotionScore
// and its pick records the window's `motion` (tecMotionAt; null when that clip was not measured).
// The same source never plays in two adjacent slots: a slot with no other fitting source stays empty (missing), so
// tecPlanBuild shrinks the Length instead. Windows of one source never overlap (with a gap of gapSeconds).
function tecAllocate(opts) {
  const gap = opts.gapSeconds == null ? 0.5 : opts.gapSeconds;
  const curves = opts.motion && opts.motion.curves ? opts.motion.curves : null, motionPool = opts.motion ? opts.motion.pool || null : null;
  const finite = v => typeof v === 'number' && isFinite(v);
  const pool = opts.candidates.filter(c => c && c.kind !== 'photo' && finite(c.t) && finite(c.score) && finite(c.sourceDuration) && c.sourceDuration > 0);
  const photoSeen = {};
  const photos = opts.candidates.filter(c => c && c.kind === 'photo' && typeof c.rid === 'string' && !photoSeen[c.rid] && (photoSeen[c.rid] = true))
    .sort((a, b) => (a.rid < b.rid ? -1 : a.rid > b.rid ? 1 : 0));
  const used = {}, recent = [], picks = [], photoUsed = {};
  let missing = 0, fillerShots = 0, photoShots = 0, localShots = 0, photoRun = 0, photoRunRelaxed = false, prevRid = null;
  const photoSlots = {};
  const holdable = opts.slots.filter(sl => !sl.prefersVideo && sl.seconds <= TEC_PHOTO_HOLD_MAX + 1e-9);
  const share = opts.photoShare == null ? TEC_PHOTO_SHARE : opts.photoShare;
  const target = Math.min(photos.length, holdable.length, Math.round(opts.slots.length * share));
  const phase = tecHash(opts.seed + ':photo-slots');
  for (let k = 0; k < target; k++) photoSlots[holdable[Math.floor((k + phase) * holdable.length / target)].index] = true;
  function searchVideo(slot, rankOf) {
    let best = null;
    for (const c of pool) {
      if (c.rid === prevRid) continue;
      const rank = rankOf(c);
      const lo = c.minStart > 0 ? c.minStart : 0;
      if (rank < 0 || c.sourceDuration < slot.seconds + TEC_SOURCE_TAIL + lo) continue;
      const start = Math.max(lo, Math.min(c.sourceDuration - TEC_SOURCE_TAIL - slot.seconds, c.t - slot.seconds / 2));
      const end = start + slot.seconds;
      if ((used[c.rid] || []).some(([a, b]) => start < b + gap && end > a - gap)) continue;
      const repeats = recent.filter(r => r === c.rid).length;
      const ms = curves && curves[c.rid] ? tecMotionStats(curves[c.rid], start, slot.seconds) : null;
      const value = c.score - rank * 0.15 - repeats * 0.2 + tecHash(opts.seed + ':' + c.rid + ':' + c.t.toFixed(2)) * 0.05 + TEC_MOTION_WEIGHT * tecMotionScore(ms, motionPool);
      const better = !best || value > best.value + 1e-12 ||
        (Math.abs(value - best.value) <= 1e-12 && (c.rid < best.c.rid || (c.rid === best.c.rid && c.t < best.c.t)));
      if (better) best = { value, c, start, end, motion: ms ? ms.mean : null };
    }
    return best;
  }
  function searchPhoto(slot) {
    if (slot.seconds > TEC_PHOTO_HOLD_MAX + 1e-9) return null;
    let best = null;
    for (const c of photos) {
      if (photoUsed[c.rid] || c.rid === prevRid) continue;
      const value = tecHash(opts.seed + ':photo:' + c.rid);
      if (!best || value > best.value + 1e-12) best = { value, c, photo: true };
    }
    return best;
  }
  for (const slot of opts.slots) {
    const roles = TEC_ROLE_FALLBACK[slot.role] || [slot.role];
    const runFull = photoRun >= TEC_PHOTO_RUN_MAX;
    const preferred = () => searchVideo(slot, c => roles.indexOf(c.role));
    const anyReal = () => searchVideo(slot, c => (c.role === 'filler' ? -1 : 0));
    const filler = () => searchVideo(slot, c => (c.role === 'filler' ? 0 : -1));
    const photo = () => searchPhoto(slot);
    const tiers = photoSlots[slot.index] ? [photo, preferred, anyReal, filler]
      : slot.prefersVideo ? [preferred, anyReal, filler, photo] : [preferred, anyReal, photo, filler];
    let best = null;
    for (const tier of tiers) {
      if (runFull && tier === photo) continue;
      if ((best = tier())) break;
    }
    if (!best && runFull && (best = photo())) { best.runRelaxed = true; photoRunRelaxed = true; }
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
    const pick = { slot: slot.index, rid: best.c.rid, kind: 'video', startSeconds: best.start, endSeconds: best.end };
    if (curves) pick.motion = best.motion == null ? null : Math.round(best.motion * 1000) / 1000;
    if (best.c.local) { pick.local = true; localShots++; }
    picks.push(pick);
  }
  return { picks, filled: picks.filter(Boolean).length, missing, fillerShots, photoShots, localShots, photoRunRelaxed };
}

// Footage slots of a timeline for tecAllocate: Classic skips the opening (lead-in gap) slot. The first and last
// footage slots prefer video.
function tecFootageSlots(timeline) {
  const shots = timeline.slots.filter(s => s.kind === 'shot');
  return shots.map((s, i) => ({ index: s.index, role: s.role, seconds: s.seconds, prefersVideo: i === 0 || i === shots.length - 1 }));
}

// opts: { layout, N (requested grid shots), P, candidates, seed, photoShare?, motion? (rid -> tecMotionCurve curve;
// clips without one score as before) }. Scene-search hits and local windows (clips without analysis) are put on one
// scale first (tecNormaliseCandidates). Tries N first, then shrinks toward TEC_MIN_SHOTS; every attempt allocates
// from scratch with filler candidates added. Returns { ok: true, layout, N, timeline, picks (one per footage slot, in
// order), visibleShots, fillerShots, photoShots, localShots, motionPool (null without motion data), ... }
// or { ok: false, usableShots, needed } (needed = 4 visible shots in Classic, 4 + 1 in Full frame).
function tecPlanBuild(opts) {
  const layout = opts.layout === 'full' ? 'full' : 'classic';
  const top = Math.max(TEC_MIN_SHOTS, opts.N);
  const needed = TEC_MIN_SHOTS + (layout === 'full' ? 1 : 0);
  const scaled = tecNormaliseCandidates(opts.candidates);
  const candidates = scaled.concat(tecFillers(scaled));
  const curves = {};
  for (const rid of Object.keys(opts.motion || {})) if (opts.motion[rid] && Array.isArray(opts.motion[rid].values)) curves[rid] = opts.motion[rid];
  const pool = tecMotionPool(curves);
  const motion = pool ? { curves, pool } : null;
  let last = null;
  for (let n = top; n >= TEC_MIN_SHOTS; n--) {
    const timeline = tecTimeline({ layout, N: n, P: opts.P });
    const alloc = tecAllocate({ candidates, slots: tecFootageSlots(timeline), seed: opts.seed, photoShare: opts.photoShare, motion });
    if (alloc.missing === 0) {
      const plan = { ok: true, layout, N: n, requestedN: opts.N, shrunk: n < opts.N, timeline, picks: alloc.picks, visibleShots: alloc.picks.length,
        needed, fillerShots: alloc.fillerShots, photoShots: alloc.photoShots, localShots: alloc.localShots, motionPool: pool };
      if (alloc.photoRunRelaxed) plan.photoRunRelaxed = true;
      return plan;
    }
    last = alloc;
  }
  return { ok: false, layout, usableShots: last ? last.filled : 0, needed, photoShots: last ? last.photoShots : 0 };
}

// ---------------------------------------------------------------------------------------------------------------
// Clips without analysis. Selects' scene search needs analysis; an unanalysed clip is scored instead by the panel's
// quick-score block (the kit's tools/panel/quick-score.js: host ffmpeg, a small grey preview; motion, sharpness,
// exposure, black / fade / flash flags and scene cuts), and its best windows become candidates here. The opening and
// ending roles (TEC_STEADY_ROLES: the first choice of the opening wide shot and of the ending) take steadier,
// well-exposed windows ('steady'); the middle shots take moving ones ('montage').
const TEC_STEADY_ROLES = [TEC_ROLE_FALLBACK['opening-wide'][0], TEC_ROLE_FALLBACK.ending[0]];
// Local windows start at least this far in (stock clips fade in from black): the kit's QS_HEAD.
const TEC_LOCAL_HEAD = 0.5;
// Candidates per role and clip.
const TEC_LOCAL_PER_ROLE = 4;
// Local scores (0-1) land in this band, the spread scene-search hits have (about 0.30-0.60), so the role rank (0.15 a
// step), repeats (0.2 each) and the motion bonus weigh the same for both kinds. Mixed projects normalise into it too.
const TEC_LOCAL_SCORE_LO = 0.3;
const TEC_LOCAL_SCORE_SPAN = 0.3;
// Evenly spaced fallback windows (no score) sit in the middle of the band.
const TEC_EVEN_SCORE = 0.45;
// Quick-score motion (mean absolute frame difference 0-1 at the kit's 8 fps) in this app's motion-curve units (the
// YAVG of a frame difference, 0-255, at 4 fps): x255, x2 for the doubled frame gap.
const TEC_LOCAL_MOTION_SCALE = 510;

// The quick-score role ('steady' | 'montage') of a search role.
function tecLocalKind(role) { return TEC_STEADY_ROLES.indexOf(role) >= 0 ? 'steady' : 'montage'; }

// Window lengths to ask the quick score for, longest first: the longest slot (Full frame's opening shot, or the last
// shot with the tail), then the last shot, then one phrase. A shorter slot sits inside the window, centred.
function tecLocalSeconds(P) {
  const list = [Math.max(TEC_LEAD_IN, P + TEC_TAIL), P + TEC_TAIL, P];
  return list.filter((s, i) => list.indexOf(s) === i);
}

// Centres of evenly spaced windows of `seconds` from TEC_LOCAL_HEAD to the source's end (at most 4; one centred window
// when the clip is shorter). scripts/search.js uses the same rule for a template run's unanalysed clips.
function tecEvenCentres(duration, seconds) {
  const room = duration - TEC_LOCAL_HEAD - TEC_SOURCE_TAIL;
  if (!(room > 0) || !(seconds > 0)) return [];
  const n = room <= seconds ? 1 : Math.max(1, Math.min(4, Math.floor(room / seconds)));
  if (n === 1) return [TEC_LOCAL_HEAD + room / 2];
  const out = [];
  for (let k = 0; k < n; k++) out.push(TEC_LOCAL_HEAD + seconds / 2 + k * (room - seconds) / (n - 1));
  return out;
}

// byKind: { steady: [{ t, score (0-1) }], montage: [...] } (the quick score's qsCandidates per kind) -> candidates for
// every search role, at most TEC_LOCAL_PER_ROLE each, scored into the band and flagged local with minStart.
function tecLocalCandidates(rid, duration, byKind) {
  const out = [];
  for (const role of TEC_SEARCH_ROLES) {
    const list = (byKind && byKind[tecLocalKind(role)]) || [];
    for (const c of list.slice(0, TEC_LOCAL_PER_ROLE)) {
      if (!c || typeof c.t !== 'number' || !isFinite(c.t)) continue;
      const s = typeof c.score === 'number' && isFinite(c.score) ? Math.max(0, Math.min(1, c.score)) : 0.5;
      out.push({ rid, role, t: c.t, score: TEC_LOCAL_SCORE_LO + TEC_LOCAL_SCORE_SPAN * s, sourceDuration: duration, local: true, minStart: TEC_LOCAL_HEAD });
    }
  }
  return out;
}

// The fallback when a clip could not be scored: evenly spaced windows for every role (flagged even as well as local).
function tecEvenCandidates(rid, duration, seconds) {
  const out = [];
  for (const t of tecEvenCentres(duration, seconds)) {
    for (const role of TEC_SEARCH_ROLES) out.push({ rid, role, t: Math.round(t * 1000) / 1000, score: TEC_EVEN_SCORE, sourceDuration: duration, local: true, minStart: TEC_LOCAL_HEAD, even: true });
  }
  return out;
}

// A scored clip's motion as a tecMotionCurve-style curve (one sample per scored bin, at its end), so the allocation's
// motion bonus and the still-shot move treat it like a measured clip. null for a fallback.
function tecLocalCurve(scores) {
  if (!scores || scores.fallback || !Array.isArray(scores.windows)) return null;
  const times = [], values = [];
  for (const w of scores.windows) {
    if (!w || w.empty || typeof w.end !== 'number' || typeof w.motion !== 'number' || !isFinite(w.end) || !isFinite(w.motion)) continue;
    times.push(w.end); values.push(w.motion * TEC_LOCAL_MOTION_SCALE);
  }
  return times.length ? { times, values } : null;
}

// Candidates for unanalysed clips. resources: inventory entries ({ rid, path, duration }). opts: { P, scoreAll
// (quickScoreAll), candidatesOf (qsCandidates), signal?, onProgress?, budgetMs?, dataDir?, concurrency? }. When
// scoreAll itself throws (anything but a cancel) every clip gets evenly spaced windows and the build goes ahead; a
// cancel (AbortError or an aborted signal) is rethrown. See tecLocalFromScores for the result.
async function tecLocalShots(resources, opts) {
  const started = Date.now();
  let results = null;
  if (resources.length) {
    try {
      results = await opts.scoreAll(resources.map(r => ({ rid: r.rid, path: r.path, durationSeconds: r.duration })),
        { concurrency: opts.concurrency || 3, budgetMs: opts.budgetMs, signal: opts.signal, onProgress: opts.onProgress, dataDir: opts.dataDir });
    } catch (e) {
      if ((opts.signal && opts.signal.aborted) || (e && e.name === 'AbortError')) throw e;
      results = null;
    }
  }
  const out = tecLocalFromScores(resources, results, opts.P, opts.candidatesOf);
  out.ms = Date.now() - started;
  return out;
}

// The synchronous half (the headless driver scores clips itself and calls this): results is a Map rid -> quick-score
// result (or null). A clip whose score is missing or a fallback, or that yields no window, gets evenly spaced windows.
// Returns { list, curves (rid -> motion curve, scored clips only), scored (count), even (rids) }.
function tecLocalFromScores(resources, results, P, candidatesOf) {
  const lens = tecLocalSeconds(P);
  const list = [], curves = {}, even = [];
  let scored = 0;
  for (const r of resources) {
    const res = results && typeof results.get === 'function' ? results.get(r.rid) : null;
    let cands = [];
    if (res && !res.fallback) {
      const byKind = {};
      for (const kind of ['steady', 'montage']) {
        byKind[kind] = [];
        for (const seconds of lens) {
          let got = [];
          try { got = candidatesOf(res, kind, seconds, TEC_LOCAL_PER_ROLE) || []; } catch (e) { got = []; }
          if (got.length) { byKind[kind] = got; break; }
        }
      }
      cands = tecLocalCandidates(r.rid, r.duration, byKind);
      const curve = tecLocalCurve(res);
      if (curve) curves[r.rid] = curve;
    }
    if (cands.length) scored++;
    else { cands = tecEvenCandidates(r.rid, r.duration, lens[0]); even.push(r.rid); }
    for (const c of cands) list.push(c);
  }
  return { list, curves, scored, even };
}

// Mixed projects: scene-search hits and local windows on one scale. When both kinds are present, each kind's scores
// are rank-normalised per role (ties share their mean rank; a lone score sits mid-band) into the TEC_LOCAL_SCORE band,
// so neither kind swamps the other, and the allocation's fresh-first rules decide as before. With one kind the scores
// are kept (an all-analysed project plans exactly as it did). Fillers and photos pass through. Returns a new list.
function tecNormaliseCandidates(candidates) {
  const video = c => !!c && c.kind !== 'photo' && c.role !== 'filler' && typeof c.score === 'number' && isFinite(c.score);
  let local = 0, search = 0;
  for (const c of candidates) if (video(c)) { if (c.local) local++; else search++; }
  if (!local || !search) return candidates.slice();
  const keyOf = c => (c.local ? 'local:' : 'search:') + c.role;
  const groups = {};
  for (const c of candidates) if (video(c)) (groups[keyOf(c)] = groups[keyOf(c)] || []).push(c.score);
  for (const k of Object.keys(groups)) groups[k].sort((a, b) => a - b);
  const rank = (sorted, v) => {
    if (sorted.length < 2) return 0.5;
    let lo = 0;
    while (lo < sorted.length && sorted[lo] < v) lo++;
    let hi = lo;
    while (hi < sorted.length && sorted[hi] === v) hi++;
    return (lo + hi - 1) / 2 / (sorted.length - 1);
  };
  return candidates.map(c => (video(c) ? Object.assign({}, c, { score: TEC_LOCAL_SCORE_LO + TEC_LOCAL_SCORE_SPAN * rank(groups[keyOf(c)], c.score), rawScore: c.score }) : c));
}

// Shot motions, in pick order. Deterministic per seed; never the same motion family twice in a row (one chain over
// photos and videos); drift, tilt and push-drift directions alternate. The shot sits in a 16:9 window and is
// cover-cropped, so a source narrower than 16:9 (portrait, 4:3, 3:2) has room on y and only a wider one on x; an
// unknown size counts as a 3:2 photo / a 16:9 video.
// - Photos: any family (push-in, pull-out, drift, tilt, push-drift); strength 0.6 of CWV's.
// - Videos (opts.videos, default on): a still window (tecMotionStill on the pick's measured `motion`; unknown counts
//   as still) gets a gentle push-in or drift at 0.3 of CWV's; a moving one stays 'none'. No punch or zoom hit.
// Each entry is { motion, direction, axis, strength (x CWV's move), frameStrength (the Shot frame's `strength`
// parameter: the effect scales it by 0.6) }; null for an empty slot, and for every video with opts.videos false.
const TEC_PHOTO_MOTIONS = ['push-in', 'pull-out', 'drift-left', 'drift-right', 'drift-up', 'drift-down', 'tilt', 'push-drift'];
const TEC_MOTION_FAMILIES = ['push-in', 'pull-out', 'drift', 'tilt', 'push-drift'];
const TEC_VIDEO_MOTION_FAMILIES = ['push-in', 'drift'];
const TEC_PHOTO_MOTION_STRENGTH = 0.6;
const TEC_VIDEO_FRAME_STRENGTH = 0.5;
function tecShotMotions(picks, seed, sizes, opts) {
  const videos = !opts || opts.videos !== false, pool = opts && opts.pool ? opts.pool : null;
  const out = [];
  let lastFamily = null, driftSign = { x: 1, y: 1 }, tiltSign = 1, pushDriftSign = 1, k = 0;
  for (const pick of picks) {
    if (!pick || (pick.kind !== 'photo' && !videos)) { out.push(null); continue; }
    const photo = pick.kind === 'photo';
    const size = sizes && sizes[pick.rid];
    const aspect = size && size.width > 0 && size.height > 0 ? size.width / size.height : photo ? 1.5 : 16 / 9;
    const axis = aspect > 16 / 9 + 1e-6 ? 'x' : 'y';
    if (!photo && !tecMotionStill(pick.motion, pool)) {
      out.push({ motion: 'none', direction: 1, axis, strength: TEC_PHOTO_MOTION_STRENGTH * TEC_VIDEO_FRAME_STRENGTH, frameStrength: TEC_VIDEO_FRAME_STRENGTH });
      continue;
    }
    const families = (photo ? TEC_MOTION_FAMILIES : TEC_VIDEO_MOTION_FAMILIES).filter(f => f !== lastFamily)
      .map(f => ({ f, v: tecHash(seed + ':motion:' + k + ':' + f) }))
      .sort((a, b) => b.v - a.v || (a.f < b.f ? -1 : 1));
    const family = families[0].f;
    let motion = family, direction = 1;
    if (family === 'drift') {
      direction = driftSign[axis]; driftSign[axis] = -direction;
      motion = axis === 'x' ? (direction > 0 ? 'drift-right' : 'drift-left') : (direction > 0 ? 'drift-down' : 'drift-up');
    } else if (family === 'tilt') { direction = tiltSign; tiltSign = -tiltSign; }
    else if (family === 'push-drift') { direction = pushDriftSign; pushDriftSign = -pushDriftSign; }
    out.push(photo ? { motion, direction, axis, strength: TEC_PHOTO_MOTION_STRENGTH, frameStrength: 1 }
      : { motion, direction, axis, strength: TEC_PHOTO_MOTION_STRENGTH * TEC_VIDEO_FRAME_STRENGTH, frameStrength: TEC_VIDEO_FRAME_STRENGTH });
    lastFamily = family; k++;
  }
  return out;
}
// Photo motions only (videos null): the photo-only form of tecShotMotions.
function tecPhotoMotions(picks, seed, sizes) { return tecShotMotions(picks, seed, sizes, { videos: false }); }

// ---------------------------------------------------------------------------------------------------------------
// Title typing (spec R5): one slot per grapheme (Array.from), spaces included, no cursor. Glyph i (zero-based)
// appears at startSec + i * slotSec with slotSec = min(0.42, 4.4 / n), so typing completes by 0.47 + 4.4 = 4.87 s.
const TEC_TYPE_START = 0.47;
const TEC_TYPE_SLOT = 0.42;
const TEC_TYPE_BUDGET = 4.4;
function tecTyping(text) {
  const glyphs = Array.from(String(text == null ? '' : text));
  const n = glyphs.length;
  const slotSec = n > 0 ? Math.min(TEC_TYPE_SLOT, TEC_TYPE_BUDGET / n) : TEC_TYPE_SLOT;
  const times = glyphs.map((_, i) => TEC_TYPE_START + i * slotSec);
  return { slots: n, slotSec, startSec: TEC_TYPE_START, glyphs, times, doneSec: TEC_TYPE_START + n * slotSec };
}
// How many glyphs are visible at `sec` (0 before the first one appears).
function tecTypedCount(typing, sec) {
  if (!(sec >= typing.startSec - 1e-9)) return 0;
  return Math.min(typing.slots, Math.floor((sec - typing.startSec) / typing.slotSec + 1e-9) + 1);
}

// ---------------------------------------------------------------------------------------------------------------
// Credits

const TEC_NAME_PLACEHOLDER = '[Name Here]';
const TEC_FILM_CREW_ROLES = ['Director', 'Screenwriter', 'Editor', 'Original Score by', 'Production Designer', 'Costume Designer',
  'Visual Effects Supervisor', 'Sound Designer', 'Makeup Artist', 'Lighting Technician'];
const TEC_PRESETS = {
  filmCrew: { id: 'filmCrew', label: 'Film crew' },
  personal: { id: 'personal', label: 'Personal' },
  travel: { id: 'travel', label: 'Travel' },
};
const TEC_PRESET_ORDER = ['filmCrew', 'personal', 'travel'];
const TEC_DEFAULT_PRESET = 'filmCrew';
const TEC_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// A capture range longer than this many days reads as a month ("September 2026") instead of days.
const TEC_DAY_RANGE_MAX = 10;
const TEC_EN_DASH = '\u2013';
const TEC_MID_DOT = '\u00b7';

// The CWV place heuristic: a short Latin or Hangul Project name (2 to 31 columns, Hangul counts as 2) that does not
// look like a working title.
function tecSuggestPlace(projectName) {
  const name = String(projectName || '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const cols = Array.from(name).reduce((a, ch) => a + (/[\uac00-\ud7a3]/.test(ch) ? 2 : 1), 0);
  if (!/^[A-Za-z\uac00-\ud7a3][A-Za-z\uac00-\ud7a3 .']*$/.test(name) || cols < 2 || cols > 31) return '';
  if (/\b(project|untitled|test|draft|copy|export|final|edit|vlog)\b/i.test(name)) return '';
  // The same generic words in Korean (project, untitled, test, draft, copy, export, final, edit, vlog).
  if (/\ud504\ub85c\uc81d\ud2b8|\ubb34\uc81c|\uc81c\ubaa9\u0020\uc5c6\uc74c|\ud14c\uc2a4\ud2b8|\ucd08\uc548|\ubcf5\uc0ac\ubcf8|\ub0b4\ubcf4\ub0b4\uae30|\ucd5c\uc885|\ud3b8\uc9d1|\ube0c\uc774\ub85c\uadf8/.test(name)) return '';
  return name;
}

// A date string -> { y, m (0-11), d } in the recorded local date. A leading YYYY-MM-DD is read as written (the
// recording's own calendar date, independent of the viewer's time zone); anything else goes through Date.
function tecParseDate(value) {
  if (value == null || value === '') return null;
  const s = String(value);
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) {
    const y = +iso[1], m = +iso[2] - 1, d = +iso[3];
    return m >= 0 && m < 12 && d >= 1 && d <= 31 ? { y, m, d } : null;
  }
  if (typeof Date !== 'function') return null;
  const t = new Date(s);
  return isNaN(t.getTime()) ? null : { y: t.getFullYear(), m: t.getMonth(), d: t.getDate() };
}

// Capture dates -> "Sep 12, 2026", "Sep 12-14, 2026", "Sep 28 - Oct 2, 2026", "September 2026",
// "Sep - Nov 2026" or "Dec 30, 2025 - Jan 2, 2026"; '' without a usable date.
function tecDateRange(dates) {
  const list = (dates || []).map(tecParseDate).filter(Boolean).sort((a, b) => a.y - b.y || a.m - b.m || a.d - b.d);
  if (!list.length) return '';
  const a = list[0], b = list[list.length - 1];
  const short = m => TEC_MONTHS[m].slice(0, 3);
  const dayNo = x => Math.floor(Date.UTC(x.y, x.m, x.d) / 86400000);
  const span = dayNo(b) - dayNo(a);
  if (span === 0) return short(a.m) + ' ' + a.d + ', ' + a.y;
  if (span <= TEC_DAY_RANGE_MAX) {
    if (a.y === b.y && a.m === b.m) return short(a.m) + ' ' + a.d + TEC_EN_DASH + b.d + ', ' + a.y;
    if (a.y === b.y) return short(a.m) + ' ' + a.d + ' ' + TEC_EN_DASH + ' ' + short(b.m) + ' ' + b.d + ', ' + a.y;
    return short(a.m) + ' ' + a.d + ', ' + a.y + ' ' + TEC_EN_DASH + ' ' + short(b.m) + ' ' + b.d + ', ' + b.y;
  }
  if (a.y === b.y && a.m === b.m) return TEC_MONTHS[a.m] + ' ' + a.y;
  if (a.y === b.y) return short(a.m) + ' ' + TEC_EN_DASH + ' ' + short(b.m) + ' ' + a.y;
  return short(a.m) + ' ' + a.y + ' ' + TEC_EN_DASH + ' ' + short(b.m) + ' ' + b.y;
}

// "7 clips . 2 photos", "1 clip", "3 photos"; '' when both are 0.
function tecMomentsText(clips, photos) {
  const parts = [];
  const c = clips > 0 ? Math.floor(clips) : 0, p = photos > 0 ? Math.floor(photos) : 0;
  if (c) parts.push(c + (c === 1 ? ' clip' : ' clips'));
  if (p) parts.push(p + (p === 1 ? ' photo' : ' photos'));
  return parts.join(' ' + TEC_MID_DOT + ' ');
}

// The Music credit: the cue title + " (Selects library)", or the own-music file name without its extension.
function tecMusicCredit(info) {
  const own = String((info && info.ownMusicName) || '').trim();
  if (own) return own.replace(/^.*[\\/]/, '').replace(/\.[A-Za-z0-9]{1,5}$/, '');
  const cue = String((info && info.cueTitle) || '').trim();
  return cue ? cue + ' (Selects library)' : '';
}

// Drops rows whose role and name are both blank; trims both fields. Always returns fresh { role, name } objects.
function tecCleanRows(rows) {
  return (rows || []).filter(Boolean).map(r => ({ role: String(r.role == null ? '' : r.role).trim(), name: String(r.name == null ? '' : r.name).trim() }))
    .filter(r => r.role !== '' || r.name !== '');
}

// Rows still holding a bracketed placeholder such as "[Name Here]" (indices).
function tecPlaceholderRows(rows) {
  const out = [];
  (rows || []).forEach((r, i) => { if (r && /\[[^\]]*\]/.test(String(r.role || '') + ' ' + String(r.name || ''))) out.push(i); });
  return out;
}

// info: { projectName, dates: [recordedAt...], cueTitle, ownMusicName, clips, photos }. Rows with no value are dropped.
function tecPersonalDefaults(info) {
  const i = info || {};
  return tecCleanRows([
    { role: 'A film by', name: '[Your name]' },
    { role: 'Filmed in', name: tecSuggestPlace(i.projectName) },
    { role: 'Filmed on', name: tecDateRange(i.dates) },
    { role: 'Starring', name: '[Names]' },
    { role: 'Music', name: tecMusicCredit(i) },
    { role: 'Moments', name: tecMomentsText(i.clips, i.photos) },
    { role: 'Edited with', name: 'Selects' },
    { role: 'Special thanks', name: '[Names]' },
  ].filter(r => r.name !== ''));
}

function tecTravelDefaults(info) {
  const i = info || {};
  return tecCleanRows([
    { role: 'Directed by', name: '[Your name]' },
    { role: 'Starring', name: '[Names]' },
    { role: 'Memories', name: tecMomentsText(i.clips, i.photos) },
    { role: 'Places', name: tecSuggestPlace(i.projectName) },
    { role: 'Music by', name: tecMusicCredit(i) },
    { role: 'Special Thanks', name: '[Names]' },
    { role: 'Created with', name: 'Selects' },
  ].filter(r => r.name !== ''));
}

// The rows of a preset (a fresh array every call). Unknown ids fall back to the default preset.
function tecPresetRows(presetId, info) {
  if (presetId === 'personal') return tecPersonalDefaults(info);
  if (presetId === 'travel') return tecTravelDefaults(info);
  return TEC_FILM_CREW_ROLES.map(role => ({ role, name: TEC_NAME_PLACEHOLDER }));
}

// Credit roll layout model. All vertical numbers are 1080p pixels (scaled by H / 1080); x and widths are shares of W.
// The title box is fixed at [titleTop, titleTop + titleCap] whatever the title text (the graphic fits the title
// inside it); the first role's top is titleToFirstRole below the box. Each pair: role (roleSize), name (nameSize)
// roleToName below the role's top; the next role pairPitch below. A line wider than the column is fitted down to
// minFit of its size; beyond that it wraps to 2 lines (word boundary, most balanced split) and the pair's pitch
// grows by that line's height (roleLine / nameLine). Line boxes follow the graphic: a line's baseline is its top plus
// ascent x its nominal size, and its box ends descent x its (fitted) size below the baseline.
// The roll speed makes the credits roll completely off the top before the video ends: the bottom of the last line
// (the last name line, or the last role line when the last pair has no name) crosses y = 0 exitLead s before the
// end, and the last exitLead s show no credit text while the window finishes fading. Reference (measured on its clean
// render): a constant roll of about 67 px/s at 1080p to the very end, the last name line's bottom at 2.4 % of H on
// the final frame, so it clears the frame about 0.4 s after the end.
const TEC_CREDIT_METRICS = {
  titleTop: 425, titleCap: 173, titleToFirstRole: 101,
  roleSize: 28, nameSize: 24, roleToName: 43, pairPitch: 123,
  roleLine: 39.2, nameLine: 33.6, minFit: 0.7, maxLines: 2,
  classic: { centerX: 0.223, maxWidth: 0.40 },
  // Full frame: the title lands higher (cap centre 0.28 H in the graphic), so the column starts 207 px higher.
  full: { centerX: 0.78, maxWidth: 0.30, titleShift: -207 },
  ascent: 1.05, descent: 0.35,
  exitLead: 0.3, basePxPerSec: 67, minSpeed: 0.6, maxSpeed: 1.6,
};

// Fits one credit line. measure(text, fontPx, kind) -> width in px at that size. Returns
// { lines: [text...], fontPx, scale, overflow } (overflow: still wider than maxWidth at minFit, e.g. one long word).
function tecFitLine(text, basePx, maxWidth, measure, kind) {
  const M = TEC_CREDIT_METRICS;
  const s = String(text == null ? '' : text);
  if (s === '') return { lines: [], fontPx: basePx, scale: 1, overflow: false };
  const w = measure(s, basePx, kind);
  if (w <= maxWidth + 1e-9) return { lines: [s], fontPx: basePx, scale: 1, overflow: false };
  if (w * M.minFit <= maxWidth + 1e-9) { const scale = maxWidth / w; return { lines: [s], fontPx: basePx * scale, scale, overflow: false }; }
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length < 2) return { lines: [s], fontPx: basePx * M.minFit, scale: M.minFit, overflow: true };
  let best = null;
  for (let k = 1; k < words.length; k++) {
    const a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
    const wide = Math.max(measure(a, basePx, kind), measure(b, basePx, kind));
    if (!best || wide < best.wide - 1e-9) best = { lines: [a, b], wide };
  }
  const scale = Math.max(M.minFit, Math.min(1, maxWidth / best.wide));
  return { lines: best.lines, fontPx: basePx * scale, scale, overflow: best.wide * scale > maxWidth + 1e-9 };
}

// opts: { rows, layout: 'classic' | 'full', H, W? (default H * 16 / 9), measure }. Returns every line's top y at the
// moment the roll starts (revealFrame): { H, W, k, centerX, maxWidth, title: { top, bottom }, rows: [{ index, top,
// bottom, pitch, lastLineBottom, role: { lines, fontPx, scale, overflow, top, lineHeight, lineBottom }, name: {...} }],
// firstRoleTop, lastRoleTop, lastLineBottom (null without rows), rowTops, rowBottoms }. A part's lineBottom is the
// line-box bottom of its last line in the graphic's model (null when the part is empty); a row's lastLineBottom is
// its name's, or its role's without a name.
function tecCreditLayout(opts) {
  const M = TEC_CREDIT_METRICS;
  const H = opts.H > 0 ? opts.H : 1080, W = opts.W > 0 ? opts.W : H * 16 / 9, k = H / 1080;
  const col = opts.layout === 'full' ? M.full : M.classic;
  const maxWidth = col.maxWidth * W;
  const measure = opts.measure;
  if (typeof measure !== 'function') throw Error('tecCreditLayout needs a measure function');
  const shift = (col.titleShift || 0) * k;
  const title = { top: (M.titleTop * k) + shift, bottom: (M.titleTop + M.titleCap) * k + shift };
  const rows = [];
  let y = title.bottom + M.titleToFirstRole * k;
  (opts.rows || []).forEach((r, index) => {
    const role = tecFitLine(r.role, M.roleSize * k, maxWidth, measure, 'role');
    const name = tecFitLine(r.name, M.nameSize * k, maxWidth, measure, 'name');
    const roleExtra = Math.max(0, role.lines.length - 1) * M.roleLine * k;
    const nameExtra = Math.max(0, name.lines.length - 1) * M.nameLine * k;
    role.top = y; role.lineHeight = M.roleLine * k;
    name.top = y + M.roleToName * k + roleExtra; name.lineHeight = M.nameLine * k;
    // The graphic's baselines: role line 0 at y + ascent x roleSize, name line 0 roleToName (+ the role's wrap) below.
    const roleBase = y + M.ascent * M.roleSize * k, nameBase = roleBase + M.roleToName * k + roleExtra;
    role.lineBottom = role.lines.length ? roleBase + (role.lines.length - 1) * role.lineHeight + M.descent * role.fontPx : null;
    name.lineBottom = name.lines.length ? nameBase + (name.lines.length - 1) * name.lineHeight + M.descent * name.fontPx : null;
    const pitch = M.pairPitch * k + roleExtra + nameExtra;
    rows.push({ index, top: y, bottom: name.top + Math.max(1, name.lines.length) * M.nameLine * k, pitch,
      lastLineBottom: name.lineBottom != null ? name.lineBottom : role.lineBottom, role, name });
    y += pitch;
  });
  return {
    H, W, k, layout: opts.layout === 'full' ? 'full' : 'classic', centerX: col.centerX * W, maxWidth, title, rows,
    firstRoleTop: rows.length ? rows[0].top : null,
    lastRoleTop: rows.length ? rows[rows.length - 1].top : null,
    lastLineBottom: rows.length ? rows[rows.length - 1].lastLineBottom : null,
    rowTops: rows.map(r => r.top),
    rowBottoms: rows.map(r => r.lastLineBottom),
  };
}

// Roll speed (spec R5/R7). opts: { endSec, L?, H, lastLineBottom (the last line's box bottom at the roll start;
// null or undefined without rows), rowTops? (every role's top, for hiddenRows), rowBottoms? (every row's last line
// bottom, for removeRows), layout? (ignored) }.
// raw = lastLineBottom / (endSec - exitLead - L): the last line's bottom crosses y = 0 exitLead (0.3 s) before the
// end. Clamped to [0.6, 1.6] x 67 px/s (scaled by H / 1080). Without rows the speed is the reference 67 px/s.
// Returns { pxPerSec, rawPxPerSec, basePxPerSec, minPxPerSec, maxPxPerSec, exitSec (when the last line clears the
// top at pxPerSec; null without rows), clamped: 'high' | 'low' | null, endsEarly (0.6x clears the top earlier than
// the target), exitsLate (even 1.6x can't clear the top before the end target: text is left on screen), hiddenRows
// (indices whose top never rises above H before the end), removeRows (rows to drop so the last line can clear the
// top by the target at <= 1.6x; 0 when it already does) }.
function tecRollSpeed(opts) {
  const M = TEC_CREDIT_METRICS;
  const H = opts.H > 0 ? opts.H : 1080, k = H / 1080, L = opts.L == null ? TEC_LEAD_IN : opts.L;
  const base = M.basePxPerSec * k, lo = base * M.minSpeed, hi = base * M.maxSpeed;
  const span = opts.endSec - L, exitSpan = span - M.exitLead;
  const out = { pxPerSec: base, rawPxPerSec: null, basePxPerSec: base, minPxPerSec: lo, maxPxPerSec: hi, exitSec: null, clamped: null,
    endsEarly: false, exitsLate: false, hiddenRows: [], removeRows: 0 };
  const last = opts.lastLineBottom;
  if (last == null || !isFinite(last) || !(exitSpan > 0)) return out;
  const raw = last / exitSpan;
  out.rawPxPerSec = raw;
  if (raw > hi + 1e-9) { out.pxPerSec = hi; out.clamped = 'high'; out.exitsLate = true; }
  else if (raw < lo - 1e-9) { out.pxPerSec = lo; out.clamped = 'low'; out.endsEarly = true; }
  else out.pxPerSec = raw;
  out.exitSec = L + last / out.pxPerSec;
  const tops = Array.isArray(opts.rowTops) ? opts.rowTops : [];
  tops.forEach((top, i) => { if (top - out.pxPerSec * span >= H - 1e-9) out.hiddenRows.push(i); });
  const bottoms = Array.isArray(opts.rowBottoms) ? opts.rowBottoms : [];
  if (out.exitsLate && bottoms.length) {
    let keep = bottoms.length;
    while (keep > 1 && bottoms[keep - 1] / exitSpan > hi + 1e-9) keep--;
    out.removeRows = bottoms.length - keep;
  }
  return out;
}

// When the title's bottom edge leaves the top of the frame (seconds from the video start).
function tecTitleExitSec(layout, pxPerSec, L) {
  return (L == null ? TEC_LEAD_IN : L) + layout.title.bottom / pxPerSec;
}

// ---------------------------------------------------------------------------------------------------------------
// Build progress: 5 UI steps over 6 operations (Prepare = inventory + search; Plan; Music = ensure-audio;
// Assemble; Decorate). Each step's share of the bar is in percent. The panel names the steps in the UI language.
const TEC_BUILD_STEPS = [
  { id: 'prepare', weight: 35 },
  { id: 'plan', weight: 5 },
  { id: 'music', weight: 10 },
  { id: 'assemble', weight: 30 },
  { id: 'decorate', weight: 20 },
];

// Progress for a step that is `fraction` done. Floors the percent so 100% only shows at the very end.
function tecProgress(stepId, fraction) {
  const i = TEC_BUILD_STEPS.findIndex(s => s.id === stepId);
  if (i < 0) throw new Error('unknown build step ' + stepId);
  const total = TEC_BUILD_STEPS.reduce((a, s) => a + s.weight, 0);
  const before = TEC_BUILD_STEPS.slice(0, i).reduce((a, s) => a + s.weight, 0);
  const f = Math.min(1, Math.max(0, Number(fraction) || 0));
  const value = (before + TEC_BUILD_STEPS[i].weight * f) / total;
  const percent = Math.floor(value * 100 + 1e-9);
  return { id: TEC_BUILD_STEPS[i].id, value, percent, current: i };
}
// tec-planner:end

// quick-score:start
// Quick local shot score for clips Selects has not analysed (no scene search). Plain JS and self-contained: it reaches
// the host only through window.parent.__DI__ (Runtime.runFFmpeg and FileSystem, every member checked first), or through
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
  var di = null;
  try { di = (window.parent && window.parent["__DI__"]) || null; } catch (e) { di = null; }
  var rt = di && di.Runtime, fs = di && di.FileSystem;
  var fn = function (o, m) { return !!o && typeof o[m] === "function"; };
  return {
    runFFmpeg: fn(rt, "runFFmpeg") ? function (args, signal) { return rt.runFFmpeg(args, true, signal); } : null,
    readBytes: fn(fs, "readFile") ? async function (p) { return qsBytes(await fs.readFile(p)); } : null,
    remove: fs ? async function (p) {
      var tries = ["removeFile", "remove", "rm", "unlink", "unlinkSync"];
      for (var i = 0; i < tries.length; i++) {
        if (!fn(fs, tries[i])) continue;
        try { await (tries[i] === "removeFile" ? fs.removeFile({ filePath: p }) : fs[tries[i]](p)); return; } catch (e) { /* the next one */ }
      }
    } : null,
    join: fn(fs, "join") ? function () { return String(fs.join.apply(fs, arguments)); } : null,
    mkdir: fn(fs, "mkdirSync") ? function (d) { fs.mkdirSync(d, { recursive: true }); } : null,
    mtimeMs: fn(fs, "statSync") ? function (p) { var s = fs.statSync(p); return s && Number(s.mtimeMs || (s.mtime && +new Date(s.mtime)) || 0); } : null,
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
  try { mtime = io.mtimeMs ? Math.round(io.mtimeMs(resource.path) || 0) : 0; } catch (e) { mtime = 0; }
  // mtime is 0 when the host lacks FileSystem.statSync, so the duration also keys the cache (a file replaced at the same
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
  try { if (io.mkdir) io.mkdir(dir); } catch (e) { /* the decode below reports it */ }
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

// tec-host:start
// Host I/O through the renderer's own services, the same on macOS and Windows: no host shell, no node, nothing for the
// user to install. Copied from Selfie Aesthetic's sae-host block (dev/host-block.ts; the Archive Vlog av-host pattern)
// and renamed. ffmpeg/ffprobe are the host's bundled binaries (Runtime.runFFmpeg/runFFprobe take an argv array, so
// paths need no quoting and never pass through a console), every path is built by FileSystem.join, and temporary
// files in the data folder get ASCII names. __DI__ (window.parent) is internal host wiring that a newer or older
// Selects may lack, so each member is checked at call time. Plain JS: tests/host.test.cjs runs it in node:vm.
// Error codes (Error.message): 'host_tools' = a needed __DI__ member is missing (err.missing; the panel shows
// "needs a newer Selects"; the bundled tracks still build), 'timeout' = ffmpeg/ffprobe ran past timeoutMs,
// 'media_failed' = ffmpeg/ffprobe failed or wrote nothing usable (err.detail holds the host's message, truncated).
function tecHostDI() {
  let di = null;
  try { di = window.parent && window.parent.__DI__; } catch (e) { di = null; }
  if (!di) { try { di = window.__DI__; } catch (e) { di = null; } }
  const fs = di && di.FileSystem ? di.FileSystem : null;
  const rt = di && di.Runtime ? di.Runtime : null;
  return { fs, rt };
}
// names: ['fs.join', 'rt.runFFmpeg', ...]. Returns { ok, missing }.
function tecHostHas(names) {
  const di = tecHostDI();
  const missing = [];
  for (const name of names || []) {
    const dot = String(name).indexOf('.');
    const svc = di[String(name).slice(0, dot)];
    if (!svc || typeof svc[String(name).slice(dot + 1)] !== 'function') missing.push(String(name));
  }
  return { ok: missing.length === 0, missing };
}
function tecHostNeed(names) {
  const has = tecHostHas(names);
  if (!has.ok) {
    const err = new Error('host_tools');
    err.missing = has.missing;
    throw err;
  }
  return tecHostDI();
}
// A file reader (readFileSync or readFile) is needed too.
function tecHostCanRead() {
  const di = tecHostDI();
  return !!di.fs && (typeof di.fs.readFileSync === 'function' || typeof di.fs.readFile === 'function');
}
function tecHostNeedReader() {
  if (!tecHostCanRead()) {
    const err = new Error('host_tools');
    err.missing = ['fs.readFile'];
    throw err;
  }
}
// Joins path parts with the host's join (the OS separator).
function tecHostJoin(...parts) {
  const { fs } = tecHostNeed(['fs.join']);
  return String(fs.join(...parts.map(String)));
}
// The installed skill folder (the home folder joined with .selects, skills and <id>: the host's
// SELECTS_USER_SKILLS_ROOT), or null when the plugin's `marker` file is not there.
function tecHostSkillsDir(id, marker) {
  const { fs } = tecHostNeed(['fs.join', 'fs.homedir', 'fs.existsSync']);
  const dir = String(fs.join(fs.homedir(), '.selects', 'skills', id));
  try { return fs.existsSync(fs.join(dir, marker)) ? dir : null; } catch (e) { return null; }
}
// The plugin's data folder (<home>/.selects/plugin-data/<id>), created when missing.
function tecHostDataDir(id) {
  const { fs } = tecHostNeed(['fs.join', 'fs.homedir', 'fs.mkdirSync']);
  const dir = String(fs.join(fs.homedir(), '.selects', 'plugin-data', id));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
function tecHostFail(code, cause) {
  const err = new Error(code);
  const msg = cause && (cause.stderr || cause.message) ? String(cause.stderr || cause.message) : String(cause || '');
  err.detail = msg.slice(-600);
  return err;
}
async function tecHostRunTool(member, args, opts) {
  const { rt } = tecHostNeed(['rt.' + member]);
  const timeoutMs = (opts && opts.timeoutMs) || 120000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await rt[member](args.map(String), true, controller.signal);
    return { stdout: String((r && r.stdout) || ''), stderr: String((r && r.stderr) || '') };
  } catch (e) {
    throw tecHostFail(controller.signal.aborted ? 'timeout' : 'media_failed', e);
  } finally {
    clearTimeout(timer);
  }
}
function tecHostFFmpeg(args, opts) { return tecHostRunTool('runFFmpeg', args, opts); }
function tecHostFFprobe(args, opts) { return tecHostRunTool('runFFprobe', args, opts); }
// An audio or video file's length in seconds (ffprobe).
async function tecHostProbeSeconds(file, opts) {
  const r = await tecHostFFprobe(['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', file], opts || { timeoutMs: 30000 });
  let seconds = NaN;
  try { seconds = Number(JSON.parse(r.stdout).format.duration); } catch (e) { seconds = NaN; }
  if (!(seconds > 0)) throw tecHostFail('media_failed', r.stderr || 'no duration');
  return seconds;
}
// Bytes as a fresh, 0-offset Uint8Array, whatever the host returned (a Buffer, Uint8Array or ArrayBuffer from another
// realm, an IPC-serialized { type: 'Buffer', data: [...] } or a plain array). FileSystem results come from
// window.parent, another JS realm: `instanceof ArrayBuffer/Uint8Array` is false for them, so only realm-free checks
// are used (ArrayBuffer.isView and the toString tag read internal slots, Array.isArray works across realms), with an
// array-like fallback for objects a bridge serialised by index.
function tecHostBytes(raw) {
  if (raw == null) return new Uint8Array(0);
  const tag = Object.prototype.toString.call(raw);
  if (ArrayBuffer.isView(raw)) {
    const out = new Uint8Array(raw.byteLength);
    out.set(new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength));
    return out;
  }
  if (tag === '[object ArrayBuffer]' || tag === '[object SharedArrayBuffer]') {
    const out = new Uint8Array(raw.byteLength);
    out.set(new Uint8Array(raw));
    return out;
  }
  if (Array.isArray(raw.data)) return Uint8Array.from(raw.data);
  if (Array.isArray(raw)) return Uint8Array.from(raw);
  if (typeof raw === 'object' && typeof raw.length === 'number' && raw.length >= 0) return Uint8Array.from({ length: raw.length }, (_, i) => Number(raw[i]) & 255);
  return new Uint8Array(0);
}
async function tecHostReadRaw(file) {
  tecHostNeedReader();
  const { fs } = tecHostDI();
  return typeof fs.readFileSync === 'function' ? fs.readFileSync(file) : await fs.readFile(file);
}
async function tecHostReadBytes(file) { return tecHostBytes(await tecHostReadRaw(file)); }
// A text file (some host builds return text directly, others bytes).
async function tecHostReadText(file) {
  const v = await tecHostReadRaw(file);
  return typeof v === 'string' ? v : new TextDecoder().decode(tecHostBytes(v));
}
// Best effort; a leftover file in the data folder is harmless. Host builds differ in which remover they have.
async function tecHostRemove(file) {
  const { fs } = tecHostDI();
  if (!fs || !file) return;
  const tries = [{ name: 'unlinkSync', call: () => fs.unlinkSync(file) }, { name: 'removeFile', call: () => fs.removeFile({ filePath: file }) },
    { name: 'remove', call: () => fs.remove(file) }, { name: 'rmSync', call: () => fs.rmSync(file, { force: true }) }, { name: 'unlink', call: () => fs.unlink(file) }];
  for (const t of tries) {
    if (typeof fs[t.name] !== 'function') continue;
    try { await t.call(); return; } catch (e) { /* the next one */ }
  }
}
function tecHostToken() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
// Runs ffmpeg with argsFor(out) (out = a fresh ASCII-named file in dataDir ending in `ext`), reads the file back and
// removes it. Missing or empty output is media_failed.
async function tecHostFFmpegBytes(argsFor, dataDir, ext, opts) {
  tecHostNeed(['rt.runFFmpeg', 'fs.join']);
  tecHostNeedReader();
  if (!dataDir) { const err = new Error('host_tools'); err.missing = ['fs.mkdirSync']; throw err; }
  const out = tecHostJoin(dataDir, 'tmp-' + tecHostToken() + '.' + ext);
  try {
    await tecHostFFmpeg(argsFor(out), opts);
    let bytes;
    try { bytes = await tecHostReadBytes(out); } catch (e) { throw tecHostFail('media_failed', 'output missing: ' + String((e && e.message) || e)); }
    if (!bytes.byteLength) throw tecHostFail('media_failed', 'empty output');
    return bytes;
  } finally {
    await tecHostRemove(out);
  }
}
// Mono 32-bit float samples at `rate`, the first maxSeconds of `file` (the beat detector's input, as the kit CLI
// decodes it: -ac 1 -ar <rate> -f f32le).
async function tecHostDecodePcm(file, dataDir, rate, maxSeconds) {
  const bytes = await tecHostFFmpegBytes((out) => ['-nostdin', '-v', 'error', '-y', '-t', String(maxSeconds), '-i', file, '-vn', '-ac', '1', '-ar', String(rate), '-f', 'f32le', out],
    dataDir, 'f32', { timeoutMs: 120000 });
  if (bytes.byteLength < 4) throw tecHostFail('media_failed', 'no samples');
  return new Float32Array(bytes.buffer, 0, Math.floor(bytes.byteLength / 4));
}
// A waveform of `count` peaks (0-1) from 8-bit mono at 800 Hz.
async function tecHostPeaks(file, dataDir, count) {
  const bytes = await tecHostFFmpegBytes((out) => ['-nostdin', '-v', 'error', '-y', '-i', file, '-vn', '-ac', '1', '-ar', '800', '-f', 'u8', out], dataDir, 'u8', { timeoutMs: 30000 });
  const n = bytes.length, out = [];
  const per = Math.max(1, Math.floor(n / count));
  for (let b = 0; b < count && b * per < n; b++) {
    let m = 0;
    for (let i = b * per; i < Math.min(n, (b + 1) * per); i++) m = Math.max(m, Math.abs(bytes[i] - 128) / 128);
    out.push(Math.round(m * 1000) / 1000);
  }
  return out;
}
// A blob: URL of `duration` seconds of `file` from `start`, fading out over the last `fadeOut` seconds (mp3; WAV when
// the host ffmpeg has no mp3 encoder). The caller revokes it with URL.revokeObjectURL.
async function tecHostPreviewUrl(file, start, duration, fadeOut, dataDir) {
  const cut = ['-nostdin', '-v', 'error', '-y', '-ss', Number(start || 0).toFixed(3), '-t', Number(duration).toFixed(2), '-i', file, '-vn', '-ac', '1', '-ar', '22050',
    '-af', 'afade=t=out:st=' + Math.max(0, duration - fadeOut).toFixed(2) + ':d=' + fadeOut];
  const tries = [
    { ext: 'mp3', args: ['-c:a', 'libmp3lame', '-b:a', '48k', '-f', 'mp3'], type: 'audio/mpeg' },
    { ext: 'wav', args: ['-c:a', 'pcm_s16le', '-f', 'wav'], type: 'audio/wav' },
  ];
  let lastErr = null;
  for (const t of tries) {
    try {
      const bytes = await tecHostFFmpegBytes((out) => cut.concat(t.args, [out]), dataDir, t.ext, { timeoutMs: 60000 });
      return URL.createObjectURL(new Blob([bytes], { type: t.type }));
    } catch (e) {
      lastErr = e;
      if (e && (e.message === 'host_tools' || e.message === 'timeout')) break;
    }
  }
  throw lastErr || tecHostFail('media_failed', 'preview');
}
// tec-host:end

// tec-beat-worker:start
// Own music is decoded by the host's ffmpeg to mono 32-bit float PCM at TEC_PCM_RATE Hz, the first TEC_PCM_SECONDS
// seconds (the same input as the kit CLI path: ffmpeg -ac 1 -ar 22050 -f f32le). The detector runs in a Web Worker
// built from the kit's beat-detect.cjs, shipped unmodified as kit-beat-detect.cjs and read from the install folder
// (the plugin's own beat-detect.cjs adds dev-only options for dev/build-cues.cjs; without them both give the same
// result, dev/beat-parity.cjs). The shim makes its CLI guard (`require.main === module`) false, and the PCM buffer is
// transferred, not copied. Copied from Selfie Aesthetic's sae-beat-worker block. Plain JS.
const TEC_PCM_RATE = 22050;
const TEC_PCM_SECONDS = 360;
// A worker that has not answered after this long is stopped; the music then uses fixed timing.
const TEC_BEAT_TIMEOUT_MS = 90000;
function tecBeatWorkerSource(fileText) {
  return "const require = { main: null }; const module = { exports: {} }; const exports = module.exports;\n" + String(fileText)
    + "\nself.onmessage = (e) => { try { self.postMessage({ id: e.data.id, ok: true, result: module.exports.analyze(new Float32Array(e.data.buf), e.data.rate) }); } catch (err) { self.postMessage({ id: e.data.id, ok: false, error: String(err && err.message || err) }); } };";
}
// tec-beat-worker:end

// The kit detector's analysis of `samples` in a Web Worker (tecBeatWorkerSource), never on the panel's thread: the
// panel CSP allows blob: workers (Archive Vlog, merged). `signal` aborts it (worker.terminate()); so does the timeout.
// A host that refuses the worker rejects, and the panel falls back to fixed timing. (From Archive Vlog's analyseBeat.)
function analyseBeat(source: string, samples: Float32Array, signal: AbortSignal | null, timeoutMs: number = TEC_BEAT_TIMEOUT_MS): Promise<any> {
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
    worker.onmessage = (e: MessageEvent) => finish(() => (e.data && e.data.ok ? resolve(e.data.result) : reject(new Error(String(e.data?.error || "the beat detector failed")))));
    worker.onerror = (e: any) => { try { e?.preventDefault?.(); } catch { /* nothing */ } finish(() => reject(new Error("the beat detector stopped: " + String(e?.message || "worker error")))); };
    timer = setTimeout(() => finish(() => reject(new Error("the beat detection took too long"))), timeoutMs);
    // A copy of the samples' bytes, transferred to the worker.
    const buf = samples.buffer.slice(samples.byteOffset, samples.byteOffset + samples.byteLength);
    worker.postMessage({ id: 1, buf, rate: TEC_PCM_RATE }, [buf]);
  });
}

// A file under the install folder; `rel` uses "/" and is joined with the host's separator.
async function readText(root: string, rel: string) {
  return tecHostReadText(tecHostJoin(root, ...rel.split("/")));
}
// The config goes in as JSON.parse of a string so its type is `any`: an inlined literal widens `type` to string
// (rejected by EditableParameterDefinition[]) and narrows a null option to `never` inside its `if`.
function fill(script: string, cfg: unknown) { return script.replace("__CONFIG__", () => "JSON.parse(" + JSON.stringify(JSON.stringify(cfg)) + ")"); }
// The quick local score of unanalysed clips during a build: three clips at a time (each ffmpeg decode is itself
// multi-threaded), and clips not started within the budget get evenly spaced windows, so Prepare stays short.
const TEC_QUICK_CONCURRENCY = 3;
const TEC_QUICK_BUDGET_MS = 20000;
// Thrown when the Project changed while a build was running; its results are dropped silently.
const STALE = new Error("The Project changed during the build.");

function photoCandsOf(inventory: any, onlyPhotos: string[] | null, usePhotos: boolean) {
  if (!usePhotos || !inventory) return [];
  return (inventory.photos || []).map((r: any) => r.rid as string).filter((rid: string) => !onlyPhotos || onlyPhotos.includes(rid)).map((rid: string) => ({ rid, kind: "photo" }));
}
// A short orientation hint for the clip list (a `shape.*` key); nothing when the frame size is unknown.
function shapeHint(width: number | null, height: number | null) {
  if (!(width! > 0) || !(height! > 0)) return "";
  const r = width! / height!;
  return r < 0.9 ? "tall" : r > 1.1 ? "wide" : "square";
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
// The bundled fonts are Latin subsets; anything beyond Latin-1, Latin Extended-A and general punctuation falls back.
function hasNonLatin(text: string) { return /[^\u0000-\u017f\u2000-\u206f]/.test(text); }
function clamp01(x: number) { return x < 0 ? 0 : x > 1 ? 1 : x; }
function easeInOut(p: number) { const x = clamp01(p); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }

// Canvas text measurement in the bundled faces (1080p pixels). The planner's credit layout, the roll speed and the
// preview all use it, like the graphic does at render.
let measureCtx: CanvasRenderingContext2D | null | false = null;
function measureWith(font: string, text: string) {
  if (!text) return 0;
  if (measureCtx === null) {
    try { measureCtx = document.createElement("canvas").getContext("2d") || false; } catch { measureCtx = false; }
  }
  // Without a canvas: wide characters (Hangul, kana, CJK) 1.0 em, anything else 0.6 em.
  if (!measureCtx) return Array.from(text).reduce((a, ch) => a + (WIDE_RE.test(ch) ? 1 : 0.6), 0) * (parseFloat(font.split(" ")[1]) || 24);
  measureCtx.font = font;
  return measureCtx.measureText(text).width;
}
const creditFont = (px: number) => "600 " + px + "px " + CREDITS_STACK;
const titleFont = (px: number) => "800 " + px + "px " + TITLE_STACK;
// The title's ink above and below the baseline in em, for centring it on its cap-centre line. Latin: the bundled
// face's cap height (0.71) and no descent. A title holding Hangul is drawn in the system Korean face, whose ink
// differs per OS (Apple SD / AppleMyungjo vs Malgun Gothic / Batang), so it is measured at render time with the
// canvas (actualBoundingBoxAscent / Descent) instead of a constant tuned on one OS; without a canvas, the Latin values.
function titleInk(text: string, px: number) {
  const latin = { up: 0.71, down: 0 };
  if (!HANGUL_RE.test(text) || !(px > 0)) return latin;
  measureWith(titleFont(px), "x");
  if (!measureCtx) return latin;
  measureCtx.font = titleFont(px);
  const m = measureCtx.measureText(text);
  const up = Number(m.actualBoundingBoxAscent) / px, down = Number(m.actualBoundingBoxDescent) / px;
  return up > 0 && isFinite(up) && isFinite(down) ? { up, down: Math.max(0, down) } : latin;
}
function measureCredit(text: string, px: number) { return measureWith(creditFont(px), text); }

// Credit rows in the editor carry a stable id for React keys.
type EditRow = { id: string; role: string; name: string };
// Which preset roles hold a value filled from Project info, by kind. An unedited value follows the Project.
const AUTO_ROLES: Record<string, string[]> = {
  place: ["Filmed in", "Places"], dates: ["Filmed on"], moments: ["Moments", "Memories"], music: ["Music", "Music by"],
};
function autoValues(info: any) {
  return { place: tecSuggestPlace(info.projectName), dates: tecDateRange(info.dates), moments: tecMomentsText(info.clips, info.photos), music: tecMusicCredit(info) } as Record<string, string>;
}

const WAVE_HEIGHT = 56;

// Music section slider: waveform on a canvas with a draggable window over the chosen section, snapped to the
// feasible phrase starts (tecSection). While `audio` plays, a playhead follows its currentTime inside the window.
function SectionSlider({ lang, peaks, total, section, videoSeconds, stepSeconds, snap, onChange, disabled, audio }: {
  lang: Lang; peaks: number[]; total: number; section: number | null; videoSeconds: number; stepSeconds: number;
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

  const peakMax = Math.max(1e-6, ...peaks);
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
    if (section != null) {
      ctx.globalAlpha = 0.18; ctx.fillStyle = accent;
      ctx.fillRect(x0, 0, Math.max(2, x1 - x0), WAVE_HEIGHT);
      ctx.globalAlpha = 1;
    }
    // Mirrored bars, one per ~2.5 CSS px; each bar is the loudest peak it covers (flat until the peaks are read).
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
      if (playAt != null) {
        const px = Math.min(x0 + w - 1, Math.max(x0 + 1, ((section + Math.min(playAt, videoSeconds)) / total) * width));
        ctx.fillStyle = themeColor(wrap, ctx, "--panel-fg", "#ffffff");
        ctx.fillRect(px - 1, 0, 2, WAVE_HEIGHT);
      }
    }
  };
  React.useEffect(() => { if (!audio) drawRef.current(null); }, [width, peaks, peakMax, section, videoSeconds, total, audio]);
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
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = snap(section - stepSeconds);
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") next = snap(section + stepSeconds);
    else if (e.key === "Home") next = first;
    else if (e.key === "End") next = last;
    else return;
    e.preventDefault();
    onChange(next);
  };

  return (
    <div>
      <small style={{ display: "block", marginBottom: 4, wordBreak: "keep-all" }}>{t(lang, "sectionHint")}</small>
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

// Footage notes for the readiness line. Analysis is never required (unanalysed clips are scored locally with the quick
// score), so nothing here blocks a build: `better` is the one small muted note while any usable clip is unanalysed;
// `importing` counts videos that cannot be used yet (no length or source file: still importing). "" when not needed.
function tecFootageNotes(lang: Lang, inv: any) {
  const sk = inv?.skipped || {};
  const unanalysed = (inv?.resources || []).some((r: any) => r.analysed === false);
  return { better: unanalysed ? t(lang, "analysedBetter") : "", importing: sk.unanalysed > 0 ? t(lang, "stillImporting", { count: sk.unanalysed }) : "" };
}

// Layout thumbnails: a tiny schematic of each layout (window + left column, or full frame + right column).
function LayoutIcon({ kind }: { kind: "classic" | "full" }) {
  return (
    <svg viewBox="0 0 32 18" width={48} height={27} aria-hidden="true" style={{ display: "block", flex: "none", width: "100%", maxWidth: 48, height: "auto" }}>
      <rect x={0.5} y={0.5} width={31} height={17} rx={1.5} fill={kind === "full" ? "currentColor" : "none"} fillOpacity={kind === "full" ? 0.25 : 1} stroke="currentColor" strokeOpacity={0.6} />
      {kind === "classic" ? <rect x={16.2} y={2.3} width={13.6} height={7.7} fill="currentColor" fillOpacity={0.55} /> : <rect x={20} y={0.5} width={11.5} height={17} fill="currentColor" fillOpacity={0.35} />}
      {(kind === "classic" ? [4.5, 8, 11, 14] : [4.5, 8, 11, 14]).map((y, i) => (
        <rect key={i} x={kind === "classic" ? (i === 0 ? 3 : 4) : (i === 0 ? 21.5 : 22.5)} y={y} width={i === 0 ? 8 : 6} height={i === 0 ? 2 : 1} fill="currentColor" />
      ))}
    </svg>
  );
}

// The two Layout tiles: one bordered box each, holding the icon and its label. The host's base stylesheet gives every
// plain <button> a fixed row height, a field max-width and side padding (it is meant for the panel's one action), so
// each of those is overridden inline: the box grows with its label, which wraps to two centred lines in long
// languages, and the row stretches both tiles to the taller one.
function LayoutTiles({ lang, layout, busy, onPick, onKeyDown }: {
  lang: Lang; layout: "classic" | "full"; busy: boolean; onPick: (v: "classic" | "full") => void; onKeyDown?: (e: any) => void;
}) {
  return (
    <div role="group" aria-label={t(lang, "layout")} onKeyDown={onKeyDown} style={{ display: "flex", alignItems: "stretch", gap: 8, minWidth: 0 }}>
      {(["classic", "full"] as const).map((value) => {
        const on = layout === value, label = t(lang, "layout." + value);
        return (
          <button key={value} type="button" aria-pressed={on} disabled={busy} onClick={() => onPick(value)}
            style={{ flex: "1 1 0", minWidth: 0, width: "auto", maxWidth: "none", height: "auto", minHeight: 0, maxHeight: "none", boxSizing: "border-box",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", gap: 6,
              padding: "8px 6px", font: "inherit", fontWeight: 600, whiteSpace: "normal", lineHeight: 1.25, textAlign: "center",
              borderRadius: "var(--panel-radius, 6px)", cursor: busy ? "default" : "pointer", color: "inherit",
              background: on ? "color-mix(in srgb, var(--panel-accent, #f6c343) 16%, transparent)" : "transparent",
              border: on ? "2px solid var(--panel-accent, #f6c343)" : "1px solid var(--panel-border, rgba(128, 128, 128, 0.45))" }}>
            <LayoutIcon kind={value} />
            <span style={{ display: "block", width: "100%", fontSize: 12, whiteSpace: "normal", wordBreak: "keep-all", overflowWrap: "anywhere" }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

// tec-reorder:start
// Reorderable list maths (kit panel-ui.md §1). Plain functions, so the tests load them in node.
// The list with the item at `from` moved to `to` (a copy; out-of-range or equal indices return an unchanged copy).
function arrayMove(list: any, from: number, to: number) {
  const c = list.slice();
  if (from === to || from < 0 || to < 0 || from >= c.length || to >= c.length) return c;
  const [x] = c.splice(from, 1);
  c.splice(to, 0, x);
  return c;
}
// Where a dragged row lands: how many other rows' mid-points its centre has passed (arrayMove semantics). `mids` are
// the rows' mid-points when the drag began and `centre` the dragged row's centre now, in the same coordinates.
function reorderTarget(mids: any, from: number, centre: number) {
  let to = 0;
  for (let k = 0; k < mids.length; k++) if (k !== from && centre > mids[k]) to++;
  return Math.max(0, Math.min(to, mids.length - 1));
}
// One keyboard step (dir -1 up, +1 down), kept inside the list.
function reorderStep(at: number, dir: number, count: number) {
  return Math.max(0, Math.min(count - 1, at + dir));
}
// How far row k slides while row `from` (height h) is held over `to`: the rows in between make room for it.
function reorderShift(k: number, from: number, to: number, h: number) {
  if (from < to && k > from && k <= to) return -h;
  if (to < from && k >= to && k < from) return h;
  return 0;
}
// The top of the slot the held row would fill, from the rows' untransformed tops and heights.
function reorderSlotTop(tops: any, heights: any, from: number, to: number) {
  return to <= from ? tops[to] : tops[to] + heights[to] - heights[from];
}
// The drop line (2 px): above the target row when moving up, below it when moving down; null when nothing moves.
function reorderLineY(tops: any, heights: any, from: number, to: number) {
  if (to === from) return null;
  return to < from ? tops[to] : tops[to] + heights[to];
}
// tec-reorder:end

// The element that scrolls the panel: the nearest scrolling ancestor, else the document (the host scrolls the root).
function scrollParent(el: HTMLElement | null): HTMLElement {
  for (let p = el ? el.parentElement : null; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY;
    if ((o === "auto" || o === "scroll") && p.scrollHeight > p.clientHeight) return p;
  }
  return (document.scrollingElement || document.documentElement) as HTMLElement;
}
function prefersReducedMotion() {
  return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const ROW_DIVIDER = "1px solid var(--panel-border, rgba(128, 128, 128, 0.35))";
const VISUALLY_HIDDEN = { position: "absolute", width: 1, height: 1, margin: -1, padding: 0, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 } as any;

// The ≡ grip: three short lines in the current (muted) colour.
function GripIcon() {
  return (
    <svg viewBox="0 0 16 16" width={16} height={16} aria-hidden="true" style={{ display: "block", flex: "none" }}>
      <path d="M3 4.5h10M3 8h10M3 11.5h10" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" fill="none" />
    </svg>
  );
}

// The credit rows (kit panel-ui.md §1): compact rows, each a drag handle, the role and name fields and a × remove,
// reordered by dragging the handle (Pointer Events) or from the keyboard (Alt+arrows, or Space/Enter to grab, arrows
// to move, Space/Enter to drop and Escape to cancel). `onEdit` takes an updater over the list, like the panel's
// editRows; a reorder commits once, with arrayMove, on drop.
function CreditRows({ lang, rows, busy, ui, onEdit, onAdd, onReset, canReset, onKeyDown }: {
  lang: Lang; rows: EditRow[]; busy: boolean; ui: any; onEdit: (fn: (list: EditRow[]) => EditRow[]) => void;
  onAdd: () => void; onReset: () => void; canReset: boolean; onKeyDown?: (e: any) => void;
}) {
  type Drag = { from: number; to: number; dy: number; started: boolean; kbd: boolean };
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const rowEls = React.useRef<Record<string, HTMLDivElement | null>>({});
  const handleEls = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const [drag, setDragState] = React.useState<Drag | null>(null);
  const dragRef = React.useRef<Drag | null>(null);
  const setDrag = (d: Drag | null) => { dragRef.current = d; setDragState(d); };
  // Measured when a drag begins, in list coordinates (offsetTop/offsetHeight ignore the rows' transforms).
  const geo = React.useRef({ tops: [] as number[], heights: [] as number[], mids: [] as number[], y0: 0, y: 0, s0: 0,
    scroller: null as HTMLElement | null, el: null as HTMLElement | null, pointerId: -1, raf: 0, reduced: false, onKey: null as any });
  const focusId = React.useRef<string | null>(null);
  const [said, setSaid] = React.useState("");
  const n = rows.length;
  const labelOf = (r: EditRow, i: number) => r.role.trim() || r.name.trim() || t(lang, "creditN", { n: i + 1 });

  const measure = () => {
    const g = geo.current;
    const els = rows.map((r) => rowEls.current[r.id]);
    g.tops = els.map((el) => (el ? el.offsetTop : 0));
    g.heights = els.map((el) => (el ? el.offsetHeight : 0));
    g.mids = g.tops.map((top, k) => top + g.heights[k] / 2);
    g.reduced = prefersReducedMotion();
  };
  const announce = (r: EditRow, idx: number, pos: number) => setSaid(t(lang, "list.moved", { label: labelOf(r, idx), pos: pos + 1, total: n }));
  const move = (from: number, to: number) => {
    if (to === from) return;
    focusId.current = rows[from].id;
    onEdit((l) => arrayMove(l, from, to));
    announce(rows[from], from, to);
  };
  // Pointer position (and the container's scroll since the drag began) to the held row's offset and target.
  const follow = () => {
    const d = dragRef.current, g = geo.current;
    if (!d || d.kbd) return;
    if (!d.started && Math.abs(g.y - g.y0) < 4) return;
    const last = g.tops.length - 1;
    const scrolled = g.scroller ? g.scroller.scrollTop - g.s0 : 0;
    // The target follows the pointer itself; only the drawn row stays inside the list.
    const moved = g.y - g.y0 + scrolled;
    const dy = Math.max(-g.tops[d.from], Math.min(g.tops[last] + g.heights[last] - g.tops[d.from] - g.heights[d.from], moved));
    const wasStarted = d.started;
    setDrag({ ...d, dy, to: reorderTarget(g.mids, d.from, g.mids[d.from] + moved), started: true });
    if (!wasStarted && !g.raf) g.raf = requestAnimationFrame(autoScroll);
  };
  // Near the top or bottom 32 px of the scroll container, scroll a few px per frame, then follow again.
  const autoScroll = () => {
    const d = dragRef.current, g = geo.current, s = g.scroller;
    if (!d || !d.started || d.kbd || !s) { g.raf = 0; return; }
    const root = s === document.scrollingElement || s === document.documentElement;
    const box = root ? { top: 0, bottom: window.innerHeight } : s.getBoundingClientRect();
    const EDGE = 32;
    const v = g.y < box.top + EDGE ? -Math.min(12, Math.ceil((box.top + EDGE - g.y) / 3)) : g.y > box.bottom - EDGE ? Math.min(12, Math.ceil((g.y - box.bottom + EDGE) / 3)) : 0;
    if (v) { const before = s.scrollTop; s.scrollTop = before + v; if (s.scrollTop !== before) follow(); }
    g.raf = requestAnimationFrame(autoScroll);
  };
  const finish = (commit: boolean) => {
    const d = dragRef.current, g = geo.current;
    if (g.raf) cancelAnimationFrame(g.raf);
    g.raf = 0;
    if (g.el && g.pointerId >= 0) { try { if (g.el.hasPointerCapture(g.pointerId)) g.el.releasePointerCapture(g.pointerId); } catch {} }
    g.el = null; g.pointerId = -1;
    if (g.onKey) { window.removeEventListener("keydown", g.onKey, true); g.onKey = null; }
    setDrag(null);
    if (!d) return;
    if (commit && d.started && d.to !== d.from) move(d.from, d.to);
    else if (d.kbd && d.started) announce(rows[d.from], d.from, d.from);
  };

  // A build starting, or the rows changing underneath (an auto value, Reset), ends a drag without a move.
  React.useEffect(() => { if (dragRef.current) finish(false); }, [busy, n]);
  React.useEffect(() => () => finish(false), []);
  // A committed move re-orders the rows: keep the focus on the moved row's handle.
  React.useLayoutEffect(() => {
    const id = focusId.current;
    if (!id) return;
    focusId.current = null;
    const h = handleEls.current[id];
    if (h && document.activeElement !== h) h.focus();
  }, [rows]);

  const handleProps = (i: number) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (busy || e.button !== 0 || dragRef.current) return;
      const g = geo.current;
      measure();
      g.y0 = g.y = e.clientY; g.scroller = scrollParent(listRef.current); g.s0 = g.scroller.scrollTop;
      g.el = e.currentTarget; g.pointerId = e.pointerId;
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
      // Escape cancels a drag wherever the focus is, and never reaches the app's shortcuts.
      g.onKey = (k: KeyboardEvent) => { if (k.key === "Escape") { k.preventDefault(); k.stopPropagation(); finish(false); } };
      window.addEventListener("keydown", g.onKey, true);
      setDrag({ from: i, to: i, dy: 0, started: false, kbd: false });
    },
    onPointerMove: (e: React.PointerEvent<HTMLButtonElement>) => {
      const d = dragRef.current;
      if (!d || d.kbd || e.pointerId !== geo.current.pointerId) return;
      geo.current.y = e.clientY;
      follow();
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => { const d = dragRef.current; if (d && !d.kbd && e.pointerId === geo.current.pointerId) finish(true); },
    onPointerCancel: () => { const d = dragRef.current; if (d && !d.kbd) finish(false); },
    onLostPointerCapture: () => { const d = dragRef.current; if (d && !d.kbd) finish(false); },
    onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (busy) return;
      const k = e.key, d = dragRef.current;
      const dir = k === "ArrowUp" ? -1 : k === "ArrowDown" ? 1 : 0;
      const grab = k === " " || k === "Spacebar" || k === "Enter";
      const consume = () => { e.preventDefault(); e.stopPropagation(); };
      if (d && d.kbd) {
        if (dir) {
          consume();
          const g = geo.current, to = reorderStep(d.to, dir, n);
          setDrag({ ...d, to, dy: reorderSlotTop(g.tops, g.heights, d.from, to) - g.tops[d.from] });
          announce(rows[d.from], d.from, to);
        } else if (grab) { consume(); finish(true); }
        else if (k === "Escape") { consume(); finish(false); }
        return;
      }
      if (d) { if (k === "Escape") consume(); return; }
      if (dir && e.altKey) { consume(); move(i, reorderStep(i, dir, n)); return; }
      if (grab) { consume(); measure(); setDrag({ from: i, to: i, dy: 0, started: true, kbd: true }); }
    },
    onBlur: () => { const d = dragRef.current; if (d && d.kbd) finish(false); },
  });

  const g = geo.current;
  const held = drag && drag.started ? drag : null;
  const lineY = held ? reorderLineY(g.tops, g.heights, held.from, held.to) : null;
  const field = { flex: "1 1 140px", minWidth: 0, width: "auto", maxWidth: "none", boxSizing: "border-box" } as any;
  const marked = { ...field, boxShadow: "inset 0 0 0 1px var(--panel-accent, #f6c343)" };
  const isPlaceholder = (v: string) => /\[[^\]]*\]/.test(v);
  return (
    <div role="group" aria-label={t(lang, "creditRows")} onKeyDown={onKeyDown} style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <div ref={listRef} role="list" style={{ position: "relative", display: "flex", flexDirection: "column", minWidth: 0, borderTop: n ? ROW_DIVIDER : "none" }}>
        {rows.map((r, i) => {
          const lifted = !!held && held.from === i;
          const shift = held && !lifted && !g.reduced ? reorderShift(i, held.from, held.to, g.heights[held.from]) : 0;
          // Held from the keyboard with reduced motion, the row stays put and the drop line shows where it goes.
          const dy = lifted && !(held!.kbd && g.reduced) ? held!.dy : shift;
          return (
            <div key={r.id} ref={(el) => { rowEls.current[r.id] = el; }} role="listitem" aria-label={t(lang, "creditN", { n: i + 1 })}
              style={{ position: "relative", display: "flex", alignItems: "center", gap: 6, padding: "5px 0", minWidth: 0, boxSizing: "border-box", borderBottom: ROW_DIVIDER,
                transform: dy ? "translateY(" + dy + "px)" : "none", transition: !held || lifted || g.reduced ? "none" : "transform 140ms ease",
                zIndex: lifted ? 2 : "auto", opacity: lifted ? 0.9 : 1, boxShadow: lifted ? "0 4px 14px rgba(0, 0, 0, 0.35)" : "none",
                background: lifted ? "var(--panel-surface, var(--background, rgb(23, 23, 23)))" : "transparent" }}>
              <button type="button" ref={(el) => { handleEls.current[r.id] = el; }} aria-label={t(lang, "list.reorderHandle", { n: i + 1, label: labelOf(r, i) })}
                disabled={busy} {...handleProps(i)}
                style={{ flex: "none", width: 24, minWidth: 24, maxWidth: "none", height: 24, minHeight: 24, padding: 0, margin: 0, border: 0, borderRadius: 4,
                  display: "flex", alignItems: "center", justifyContent: "center", background: lifted ? "var(--panel-accent, rgba(128, 128, 128, 0.25))" : "transparent",
                  color: "var(--panel-muted-fg, rgba(160, 160, 160, 1))", font: "inherit", touchAction: "none", userSelect: "none",
                  cursor: busy ? "default" : lifted ? "grabbing" : "grab" }}>
                <GripIcon />
              </button>
              <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexWrap: "wrap", gap: 6 }}>
                <input type="text" aria-label={t(lang, "roleN", { n: i + 1 })} placeholder={t(lang, "rolePlaceholder")} value={r.role} disabled={busy}
                  style={isPlaceholder(r.role) ? marked : field}
                  onChange={(e) => { const v = e.currentTarget.value; onEdit((l) => l.map((x) => (x.id === r.id ? { ...x, role: v } : x))); }} onKeyDown={(e) => e.stopPropagation()} />
                <input type="text" aria-label={t(lang, "nameN", { n: i + 1 })} placeholder={t(lang, "namePlaceholder")} value={r.name} disabled={busy}
                  style={isPlaceholder(r.name) ? marked : field}
                  onChange={(e) => { const v = e.currentTarget.value; onEdit((l) => l.map((x) => (x.id === r.id ? { ...x, name: v } : x))); }} onKeyDown={(e) => e.stopPropagation()} />
              </div>
              <ui.IconButton icon="close" label={t(lang, "list.removeRow", { n: i + 1 })} disabled={busy || !!drag} onClick={() => onEdit((l) => l.filter((x) => x.id !== r.id))} />
            </div>
          );
        })}
        {lineY != null ? <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: lineY - 1, height: 2, borderRadius: 1, background: "var(--panel-fg, rgba(242, 242, 242, 0.9))", pointerEvents: "none", zIndex: 3 }} /> : null}
      </div>
      <div aria-live="polite" style={VISUALLY_HIDDEN}>{said}</div>
      {!n ? <small style={{ wordBreak: "keep-all" }}>{t(lang, "noRows")}</small> : null}
      <small style={{ wordBreak: "keep-all" }}>{t(lang, "rowsHint")}</small>
      <ui.Row gap={4}>
        <ui.Button variant="ghost" icon="plus" disabled={busy} onClick={onAdd}>{t(lang, "list.addRow")}</ui.Button>
        <ui.Button variant="ghost" disabled={busy || !canReset} onClick={onReset}>{t(lang, "resetPreset")}</ui.Button>
      </ui.Row>
    </div>
  );
}

const PREVIEW_HEIGHT = 124;

// The Preview: a canvas mock of the chosen layout at one moment. Classic: black frame, typed title, credit rows and
// the shot window; Full frame: a footage stand-in, the scrim, the right-side gradient and the right-third column.
// Rows come from the planner's credit layout and scroll at the computed roll speed, as the graphic will.
function CreditsPreview({ lang, layout, title, model, pxPerSec, endSec, time, fontsReady }: {
  lang: Lang; layout: "classic" | "full"; title: string; model: any; pxPerSec: number; endSec: number; time: number; fontsReady: boolean;
}) {
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const layerRef = React.useRef<HTMLCanvasElement | null>(null);
  const [width, setWidth] = React.useState(0);
  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    setWidth(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || !model) return;
    const dpr = window.devicePixelRatio || 1;
    const H = PREVIEW_HEIGHT;
    if (canvas.width !== Math.round(width * dpr)) canvas.width = Math.round(width * dpr);
    if (canvas.height !== Math.round(H * dpr)) canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, H);
    // The 16:9 frame, fitted inside the fixed-height box.
    const fw = Math.min(width, (H * 16) / 9), fh = (fw * 9) / 16, ox = (width - fw) / 2, oy = (H - fh) / 2;
    const s = fh / 1080, W = 1920, L = TEC_LEAD_IN, t = time;
    const end = endSec;
    const fadeOut = clamp01((end - t) / FADES.outSec);
    ctx.save();
    ctx.translate(ox, oy); ctx.scale(s, s);
    ctx.beginPath(); ctx.rect(0, 0, W, 1080); ctx.clip();
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, 1080);
    const footage = (x: number, y: number, w: number, h: number, alpha: number) => {
      if (!(alpha > 0)) return;
      const g = ctx.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, "#35607a"); g.addColorStop(0.55, "#c98a52"); g.addColorStop(1, "#2a2320");
      ctx.globalAlpha = alpha; ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      // A horizon line, so the stand-in reads as a landscape shot.
      ctx.fillStyle = "rgba(20, 16, 14, 0.55)"; ctx.fillRect(x, y + h * 0.66, w, h * 0.34);
      ctx.globalAlpha = 1;
    };
    const full = layout === "full";
    const g = full ? clamp01((t - (L - 0.5)) / 1.0) : 0;
    if (full) {
      footage(0, 0, W, 1080, fadeOut);
      ctx.fillStyle = "rgba(0,0,0," + (0.25 * (1 - g)) + ")"; ctx.fillRect(0, 0, W, 1080);
      if (g > 0) {
        const gr = ctx.createLinearGradient(0.45 * W, 0, W, 0);
        gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0," + 0.7 * g + ")");
        ctx.fillStyle = gr; ctx.fillRect(0.45 * W, 0, 0.55 * W, 1080);
      }
    } else {
      const win = WINDOWS.classic, wx = (win.x / 100) * W, wy = (win.y / 100) * 1080, ww = (win.w / 100) * W, wh = (ww * 9) / 16;
      ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 3; ctx.strokeRect(wx, wy, ww, wh);
      footage(wx, wy, ww, wh, Math.min(clamp01((t - L) / FADES.inSec), fadeOut));
    }
    ctx.restore();

    // Text layer: title and credits, then the column mask (0.35 at the frame edges, 1 inside 14 %-86 %).
    const layer = layerRef.current || (layerRef.current = document.createElement("canvas"));
    const lw = Math.round(fw * dpr), lh = Math.round(fh * dpr);
    if (layer.width !== lw) layer.width = lw;
    if (layer.height !== lh) layer.height = lh;
    const lc = layer.getContext("2d");
    if (!lc) return;
    lc.setTransform(1, 0, 0, 1, 0, 0);
    lc.globalCompositeOperation = "source-over";
    lc.clearRect(0, 0, lw, lh);
    lc.setTransform(dpr * s, 0, 0, dpr * s, 0, 0);
    const scroll = Math.max(0, t - L) * pxPerSec;
    // Title: typed one glyph per slot, fitted to its final string, drawn at scaleX 0.78 (1 with Hangul).
    const sx = titleScaleX(title);
    const typing = tecTyping(title);
    const typed = typing.glyphs.slice(0, tecTypedCount(typing, t)).join("");
    if (title) {
      const colTarget = (0.16 * 1080) / 0.71, bigTarget = (0.2 * 1080) / 0.71;
      const perPx = (measureWith(titleFont(colTarget), title) * sx) / colTarget;
      const fit = (target: number, box: number) => (perPx * target > box ? box / perPx : target);
      const colSize = fit(colTarget, 0.34 * W);
      const endPose = { cx: model.centerX, cy: (model.title.top + model.title.bottom) / 2, size: colSize };
      let pose = endPose;
      if (full) {
        const big = fit(bigTarget, 0.6 * W);
        const p = easeInOut((t - (L - 0.8)) / 0.8);
        const start = { cx: 0.08 * W + (perPx * big) / 2, cy: 540, size: big };
        pose = { cx: start.cx + (endPose.cx - start.cx) * p, cy: start.cy + (endPose.cy - start.cy) * p, size: start.size + (endPose.size - start.size) * p };
      }
      const ink = titleInk(title, pose.size);
      const baseline = pose.cy + ((ink.up - ink.down) * pose.size) / 2 - scroll;
      if (typed && baseline > -pose.size && baseline - pose.size < 1080 + pose.size) {
        lc.save();
        lc.translate(pose.cx, baseline); lc.scale(sx, 1);
        lc.font = titleFont(pose.size);
        lc.textAlign = "left"; lc.textBaseline = "alphabetic";
        if (full) { lc.shadowColor = "rgba(0,0,0,0.55)"; lc.shadowBlur = 0.03 * 1080; lc.shadowOffsetY = 0.012 * 1080; }
        lc.fillStyle = TITLE_COLOR;
        lc.fillText(typed, -measureWith(titleFont(pose.size), title) / 2, 0);
        lc.restore();
      }
    }
    const opacity = full ? g : clamp01((t - 4.0) / 2.0);
    if (opacity > 0) {
      lc.globalAlpha = opacity;
      lc.fillStyle = CREDIT_COLOR; lc.textAlign = "center"; lc.textBaseline = "alphabetic";
      for (const r of model.rows) {
        for (const part of [r.role, r.name]) {
          part.lines.forEach((text: string, k: number) => {
            const top = part.top + k * part.lineHeight - scroll;
            if (top > 1080 || top + part.lineHeight < 0) return;
            lc.font = creditFont(part.fontPx);
            lc.fillText(text, model.centerX, top + 1.05 * part.fontPx);
          });
        }
      }
      lc.globalAlpha = 1;
    }
    lc.setTransform(1, 0, 0, 1, 0, 0);
    lc.globalCompositeOperation = "destination-in";
    const mask = lc.createLinearGradient(0, 0, 0, lh);
    mask.addColorStop(0, "rgba(0,0,0,0.35)"); mask.addColorStop(0.14, "rgba(0,0,0,1)"); mask.addColorStop(0.86, "rgba(0,0,0,1)"); mask.addColorStop(1, "rgba(0,0,0,0.35)");
    lc.fillStyle = mask; lc.fillRect(0, 0, lw, lh);
    lc.globalCompositeOperation = "source-over";
    ctx.drawImage(layer, ox, oy, fw, fh);
  }, [width, layout, title, model, pxPerSec, endSec, time, fontsReady]);
  return (
    <div ref={wrapRef} aria-label={t(lang, "creditsPreview")} style={{ width: "100%", minWidth: 0, height: PREVIEW_HEIGHT }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: PREVIEW_HEIGHT }} />
    </div>
  );
}

// Keys inside the credits editor and the layout buttons must never reach the app's shortcuts (Space plays, Delete
// removes clips). Text inputs only stop propagation, so typing works; on buttons Space still presses the button.
function guardKeys(e: React.KeyboardEvent) {
  const t = e.target as HTMLElement;
  if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) { e.stopPropagation(); return; }
  if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); e.stopPropagation(); return; }
  if (e.key === " " || e.key === "Spacebar") { e.preventDefault(); e.stopPropagation(); if (t && t.tagName === "BUTTON") t.click(); }
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
    console.warn("[the-end-credits] " + summary + " came back empty, reading again:", text);
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
    const d = photo || !shared ? await p.createDraft({ name: 'THE END Credits id check' }) : shared;
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

// The bundled faces in this frame's document, so the roll speed is measured as the graphic renders it. A face that
// fails only makes the measurement fall back, as in the panel.
async function loadCreditFaces(fontsB64: Record<string, string>) {
  if (typeof FontFace === "undefined") return true;
  try {
    for (const f of TEC_FONTS) {
      const face = new FontFace(f.family, "url(data:font/woff2;base64," + fontsB64[f.file] + ")", { style: f.style, weight: String(f.weight) });
      await face.load();
      (document as any).fonts.add(face);
    }
    await (document as any).fonts?.ready;
    return true;
  } catch { return false; }
}

// The whole template build. Returns the new Draft; throws templateIssue(...) for the person, or STALE when a newer run
// (or the frame closing) replaced this one. `say` names the current step for the status line.
async function runEndCreditsTemplate(sdk: any, context: any, check: () => void, say: (step: string, detail?: string) => void): Promise<{ sequenceId: string }> {
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
  const [manifestText, inventoryJs, searchJs, ensureJs, assembleJs, decorateJs, graphicTsx, frameTsx, lookTsx, titleB64, creditsB64] = await Promise.all([
    read("assets/cues/manifest.json"), read("scripts/inventory.js"), read("scripts/search.js"), read("scripts/ensure-audio.js"),
    read("scripts/assemble.js"), read("scripts/decorate.js"), read("assets/credits-graphic.tsx"), read("assets/shot-frame.tsx"),
    read("assets/cinematic-look.tsx"), read("assets/fonts/tec-title-serif.woff2.b64"), read("assets/fonts/tec-credits-sans.woff2.b64")]);
  check();
  const fontsB64: Record<string, string> = { "tec-title-serif.woff2.b64": titleB64.replace(/\s+/g, ""), "tec-credits-sans.woff2.b64": creditsB64.replace(/\s+/g, "") };
  const facesLoaded = await loadCreditFaces(fontsB64);
  check();
  // The track, length and layout chosen on the app's page; an unknown or missing one gets the panel's default.
  const cues: any[] = JSON.parse(manifestText).cues || [];
  const cue = cues.find((c) => c.id === options.track) || cues.find((c) => c.default) || cues[0];
  if (!cue) throw templateIssue("THE END Credits' music is missing; reinstall the plugin and try again.");
  const length = options.length === "short" || options.length === "long" || options.length === "standard" ? options.length : TEC_DEFAULT_LENGTH;
  const layout: "classic" | "full" = options.layout === "full" ? "full" : "classic";
  const requested = TEC_LENGTHS[length];
  // The music's phrase and the default section (the reveal on the swell), as the panel works them out for a bundled track.
  const beats = cue.phraseBeats > 0 ? cue.phraseBeats : 4;
  const P = (beats * 60) / cue.bpm;
  const videoSeconds = tecVideoSeconds(requested, P);
  const sectionInfo = tecSection({ firstBeat: cue.firstBeat, P, L: TEC_LEAD_IN, videoSeconds, usableEnd: cue.usableEnd, swell: cue.swell ?? cue.swellFallback, fixed: false, value: undefined });
  if (!sectionInfo) throw templateIssue(t(bl, "trackTooShort"));

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
  const inv = await run("Read footage", fill(inventoryJs, { projectId: pid, only: aliases, known }));
  check();
  inv.resources = inv.resources || [];
  inv.photos = inv.photos || [];
  const unanalysed = inv.skipped?.unanalysed || 0;

  // Scene search over the handed videos. Nobody can press Build again, so videos whose search failed get one more
  // try. In-shot motion is not measured here (it needs ffmpeg per clip); the allocation scores those clips as the
  // panel does without ffmpeg.
  say("Choosing shots");
  const rids: string[] = inv.resources.map((r: any) => r.rid);
  const dur: Record<string, number> = Object.fromEntries(inv.resources.map((r: any) => [r.rid, r.duration]));
  const search = async (todo: string[]) => {
    const list: any[] = []; const failed: string[] = [];
    for (let i = 0; i < todo.length; i += 4) {
      say("Choosing shots", i + "/" + todo.length + (todo.length === 1 ? " video" : " videos"));
      const r = await run("Search scenic shots", fill(searchJs, { projectId: pid, rids: todo.slice(i, i + 4), queries: TEC_SEARCH_QUERIES, pageSize: 4 }));
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
  if (found.failed.length) console.info("[the-end-credits] template run: scene search failed for", found.failed.join(", "));
  const candidates = found.list.map((c: any) => ({ ...c, sourceDuration: dur[c.rid] || 0 }));
  const plan: any = tecPlanBuild({ layout, N: requested, P, candidates: candidates.concat(photoCandsOf(inv, null, true)), seed: String(TEMPLATE_SEED), motion: {} });
  if (!plan.ok) {
    const waiting = unanalysed ? " " + unanalysed + (unanalysed === 1 ? " video is" : " videos are") + " not analyzed yet, so it could not be used." : "";
    throw templateIssue(t(bl, "needsShots", { count: plan.needed, found: plan.usableShots }) + t(bl, "gap") + t(bl, "addFootage") + waiting);
  }

  // The credit rows of the default preset, filled from the Project, the track and the footage as the panel fills them.
  const rows = tecCleanRows(tecPresetRows(TEC_DEFAULT_PRESET, {
    projectName: context?.projectName || "",
    dates: [...inv.resources, ...inv.photos].map((r: any) => r.recordedAt).filter(Boolean),
    cueTitle: cue.title || "", ownMusicName: "", clips: rids.length, photos: inv.photos.length,
  }));

  // Commit 1: the music, then the shots on a new Draft.
  say("Adding music");
  const musicRes = await run("Add music to the project", fill(ensureJs, { projectId: pid, path: roots.plugin + "/assets/cues/" + cue.file }), true);
  check();
  say("Making the Draft");
  const sizeOf = (rid: string) => [...inv.resources, ...inv.photos].find((r: any) => r.rid === rid) || null;
  const pickedRids = [...new Set(plan.picks.map((k: any) => k.rid as string))] as string[];
  const sources: Record<string, { aspect: number | null }> = {};
  for (const rid of pickedRids) { const r: any = sizeOf(rid); sources[rid] = { aspect: r && r.aspect > 0 ? r.aspect : null }; }
  const clipSound = "ambient";
  const name = "THE END Credits " + new Date().toISOString().slice(0, 16).replace("T", " ");
  // Never resent: the reply may be lost after the Draft was saved.
  const a = await run("Assemble the THE END Credits", fill(assembleJs, {
    projectId: pid, draftName: name, layout, picks: plan.picks, boundaries: plan.timeline.boundaries, L: plan.timeline.L,
    music: musicRes ? { resourceId: musicRes.resourceId, sectionStart: sectionInfo.start } : null,
    clipSound, ambientDb: AMBIENT_DB, musicFadeOut: MUSIC_FADE_OUT, sources }), true);
  check();
  if (!a.sequenceId) throw templateIssue("The Draft \"" + name + "\" may have been saved without its credits. Open it from the Drafts list, or try again.");

  // Commit 2: the credits graphic, the Cinematic look and the Shot frame, as the panel's Finish step adds them.
  say("Adding credits and look");
  const frames: number[] = a.frames;
  const endSec = frames[frames.length - 1] / a.fps, revealSec = frames[1] / a.fps;
  if (!facesLoaded) console.info("[the-end-credits] template run: the bundled fonts did not load, so the roll speed was measured with a fallback face");
  const model = tecCreditLayout({ rows, layout, H: 1080, measure: (text: string, px: number) => measureCredit(text, px) });
  const speed = tecRollSpeed({ endSec, L: revealSec, H: 1080, lastLineBottom: model.lastLineBottom, rowTops: model.rowTops, rowBottoms: model.rowBottoms });
  const sizes: Record<string, { width: number; height: number }> = { ...known };
  for (const r of [...inv.resources, ...inv.photos]) if (r.width > 0 && r.height > 0) sizes[r.rid] = { width: r.width, height: r.height };
  const moves = tecShotMotions(plan.picks, String(TEMPLATE_SEED), sizes, { pool: plan.motionPool });
  const photos: Record<string, any> = {}, byRid: Record<string, any> = {};
  const byShot = moves.map((mv: any) => (mv ? { motion: mv.motion, direction: mv.direction, axis: mv.axis, frameStrength: mv.frameStrength } : null));
  plan.picks.forEach((k: any, i: number) => {
    if (!k || k.kind !== "photo" || !moves[i]) return;
    const mv = moves[i];
    photos[k.rid] = { aspect: sources[k.rid]?.aspect ?? null, motion: mv.motion, direction: mv.direction, axis: mv.axis };
    byRid[k.rid] = { motion: mv.motion, direction: mv.direction, axis: mv.axis };
  });
  const record = { layout, sequenceId: a.sequenceId, fps: a.fps, frames, titleText: DEFAULT_TITLE, rows,
    speedPxPerSec: speed.pxPerSec, window: WINDOWS[layout], look: { on: true, strength: LOOK_STRENGTH }, clipSound,
    photos, sources, fades: FADES, musicFadeOut: MUSIC_FADE_OUT };
  // The credits graphic's data and Adjust fields, as the panel's graphicFor builds them.
  const scalars: Record<string, string> = {};
  const editableRows: any[] = [];
  rows.forEach((r: any, i: number) => {
    scalars["role" + (i + 1)] = r.role; scalars["name" + (i + 1)] = r.name;
    editableRows.push({ key: "role" + (i + 1), label: t(bl, "roleN", { n: i + 1 }), type: "text", defaultValue: r.role }, { key: "name" + (i + 1), label: t(bl, "nameN", { n: i + 1 }), type: "text", defaultValue: r.name });
  });
  const graphic = { tsx: graphicTsx,
    parameters: { layout, fps: a.fps, revealFrame: frames[1], endFrame: frames[frames.length - 1], title: DEFAULT_TITLE, titleColor: TITLE_COLOR, creditColor: CREDIT_COLOR,
      rows, ...scalars, rowCount: rows.length, speedPxPerSec: speed.pxPerSec, speed: 1, showTitle: true,
      fonts: TEC_FONTS.map((f) => ({ family: f.family, b64: fontsB64[f.file], weight: f.weight, style: f.style })) },
    editableParameters: [
      { key: "title", label: t(bl, "title"), type: "text", defaultValue: DEFAULT_TITLE },
      { key: "titleColor", label: t(bl, "param.titleColor"), type: "color", defaultValue: TITLE_COLOR },
      { key: "creditColor", label: t(bl, "param.creditColor"), type: "color", defaultValue: CREDIT_COLOR },
      { key: "speed", label: t(bl, "param.rollSpeed"), type: "number", defaultValue: 1, min: 0.5, max: 2, step: 0.05 },
      { key: "showTitle", label: t(bl, "param.showTitle"), type: "boolean", defaultValue: true },
      ...editableRows,
    ] };
  const finish = () => run("Add credits and look", fill(decorateJs, { ...record, graphic, frame: { tsx: frameTsx },
    look: { tsx: lookTsx, strength: record.look.strength, on: record.look.on }, photoMotion: { byRid, byShot }, labels: {
      windowX: t(bl, "param.windowX"), windowY: t(bl, "param.windowY"), windowSize: t(bl, "param.windowSize"), fadeIn: t(bl, "param.fadeIn"),
      fadeOut: t(bl, "param.fadeOut"), motion: t(bl, "param.motion"), motionStrength: t(bl, "param.motionStrength"), lookStrength: t(bl, "param.lookStrength"),
      motions: Object.fromEntries(["none", ...TEC_PHOTO_MOTIONS].map((v) => [v, t(bl, "motion." + v)])) } }), true);
  // decorate.js never replaces effects already on the Draft, so a failed attempt is tried once more.
  try {
    await finish();
  } catch (e) {
    console.warn("[the-end-credits] Add credits and look failed, trying again:", errorText(e));
    check();
    try { await finish(); } catch (e2) {
      console.warn("[the-end-credits] Add credits and look failed again:", errorText(e2));
      throw templateIssue("The Draft was made, but its credits and look could not be added; try again.");
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
      try { sdk.finishTemplate(outcome); } catch (e) { console.warn("[the-end-credits] finishTemplate failed:", errorText(e)); }
    };
    (async () => {
      try {
        end(await runEndCreditsTemplate(sdk, snapshot, check, say));
      } catch (e: any) {
        if (e === STALE) { end(null); return; }
        console.warn("[the-end-credits] template run failed while " + step + ":", errorText(e), e);
        end({ error: e?.forPerson ? String(e.message) : "THE END Credits stopped while " + step.charAt(0).toLowerCase() + step.slice(1) + "; try again." });
      } finally {
        end({ error: "THE END Credits stopped before the Draft was ready; try again." });
      }
    })();
  }, [runId]);
  return <div role="status" style={{ fontSize: 11, color: "var(--panel-muted-fg)" }}>{status}</div>;
}

// A template run (Clip highlights hands the footage over in `context.template`) builds out of sight; anything else is
// the panel.
export default function Panel(props: any) {
  return props?.context?.template ? <TemplateRun sdk={props.sdk} context={props.context} /> : <EndCreditsPanel {...props} />;
}

// The install folder (scripts, cues, fonts) and the data folder for temporary files, through the host's FileSystem
// (tecHostSkillsDir / tecHostDataDir: join + homedir, no shell). Shared by the panel and a template run (same name and
// result as before). A host without FileSystem.join/homedir/existsSync throws 'host_tools' ("needs a newer Selects");
// data is null when the folder cannot be made (music previews and own music are then off). `sdk` is unused now.
async function locateRoots(_sdk: any): Promise<{ plugin: string; data: string | null }> {
  const plugin = tecHostSkillsDir(PLUGIN_ID, "planner.js");
  if (!plugin) throw uiError((l) => t(l, "foldersNotFound"));
  let data: string | null = null;
  try { data = tecHostDataDir(PLUGIN_ID); } catch { data = null; }
  return { plugin, data };
}

function EndCreditsPanel({ sdk, context, ui }: any) {
  // The UI language, read on every render: the app can switch languages while the panel is open.
  const L = uiLang(context);
  // Inspector labels are written into the Draft in the UI language at build time; they do not follow a later switch.
  const langRef = React.useRef<Lang>(L);
  langRef.current = L;
  const projectId = context?.projectId ?? null;
  const projectRef = React.useRef(projectId);
  projectRef.current = projectId;
  const [roots, setRoots] = React.useState<{ plugin: string; data: string } | null>(null);
  const [assets, setAssets] = React.useState<any>(null);
  const [inventory, setInventory] = React.useState<any>(null);
  const [candidates, setCandidates] = React.useState<any>(null);
  const [layout, setLayout] = React.useState<"classic" | "full">("classic");
  const [title, setTitle] = React.useState(DEFAULT_TITLE);
  const [preset, setPreset] = React.useState(TEC_DEFAULT_PRESET);
  // null while the rows follow the preset; the user's rows once anything is edited.
  const [customRows, setCustomRows] = React.useState<EditRow[] | null>(null);
  const rowIdRef = React.useRef(0);
  const [length, setLength] = React.useState<"short" | "standard" | "long">(TEC_DEFAULT_LENGTH as any);
  // "" until the manifest loads; then the manifest's default cue (its `default: true` flag is the only switch).
  const [cueId, setCueId] = React.useState("");
  const [ownMusic, setOwnMusic] = React.useState<{ path: string; name: string } | null>(null);
  const [ownGrid, setOwnGrid] = React.useState<any>(null);
  // The chosen section start (seconds into the music); null = the default (reveal on the swell / loudest part).
  const [section, setSection] = React.useState<number | null>(null);
  const [cuePeaks, setCuePeaks] = React.useState<Record<string, number[]>>({});
  const [clipSound, setClipSound] = React.useState<"off" | "ambient" | "full">("ambient");
  const [lookOn, setLookOn] = React.useState(true);
  const [usePhotos, setUsePhotos] = React.useState(true);
  const [only, setOnly] = React.useState<string[] | null>(null);
  const [onlyPhotos, setOnlyPhotos] = React.useState<string[] | null>(null);
  const [previewTime, setPreviewTime] = React.useState(6);
  const [fontsReady, setFontsReady] = React.useState(false);
  const fontsFailedRef = React.useRef(false);
  const [seed, setSeed] = React.useState(1);
  const [busy, setBusy] = React.useState(false);
  // Single-flight guard: state updates are async, so a ref blocks a second click in the same tick.
  const busyRef = React.useRef(false);
  // The one-call spinner text (a key: inventory check or own-music beat detection).
  const [step, setStep] = React.useState<"" | "checking" | "listening">("");
  const [tools, setTools] = React.useState({ ffmpeg: true });
  const [progress, setProgress] = React.useState<any>(null);
  const progressRef = React.useRef<any>(null);
  // Progress never goes backwards within a run.
  const advance = (id: string, fraction: number, detail?: Say) => {
    const p = { ...tecProgress(id, fraction), detail: detail || null };
    if (progressRef.current && p.value < progressRef.current.value - 1e-9) return;
    progressRef.current = p; setProgress(p);
  };
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
  const stopAt = (e: any): Say => {
    const at = progressRef.current;
    return (l) => (at ? t(l, "stoppedAt", { step: at.current + 1, total: TEC_BUILD_STEPS.length, name: t(l, "step." + at.id), detail: sayError(l, e) }) : sayError(l, e));
  };
  const endRun = (pid: string) => {
    if (projectRef.current !== pid) return;
    busyRef.current = false; setBusy(false); setStep(""); setProgress(null); progressRef.current = null;
  };

  const inventoryJsRef = React.useRef<string | null>(null);
  const invSigRef = React.useRef<string | null>(null);
  // Photo sizes measured by earlier inventory reads, passed back so a refresh does not measure them again.
  const photoSizesRef = React.useRef<Record<string, { width: number; height: number }>>({});
  // In-shot motion per clip (tecParseMotion curves), measured once per Project + clip; null = could not be measured.
  const motionRef = React.useRef<Record<string, any>>({});
  // The running own-music analysis (decode + worker); aborted on a Project switch or unmount.
  const ownAbortRef = React.useRef<AbortController | null>(null);
  // Cancels a running build's quick score (host ffmpeg) when the Project switches or the panel closes: the same moment
  // the build's results go stale.
  const buildAbortRef = React.useRef<AbortController | null>(null);
  const invLoadingRef = React.useRef<string | null>(null);
  const mountedRef = React.useRef(true);
  const [invError, setInvError] = React.useState<{ say: Say } | null>(null);
  const [invLoading, setInvLoading] = React.useState(false);

  // Keeps a fresh inventory: remembers photo sizes and drops the shot cache when the clip set (or a clip's analysis) changed.
  function applyInventory(inv: any) {
    inv.photos = inv.photos || [];
    for (const ph of inv.photos) if (ph.width > 0 && ph.height > 0) photoSizesRef.current[ph.rid] = { width: ph.width, height: ph.height };
    const sk = inv.skipped || {};
    const sig = inv.resources.map((r: any) => r.rid + (r.analysed === false ? "~" : "")).sort().join(",") + "|" + [sk.unanalysed, sk.notAnalysed].map((x) => String(x ?? "")).join(",");
    if (invSigRef.current !== sig) { if (invSigRef.current !== null) setCandidates(null); invSigRef.current = sig; }
    setInventory(inv); setInvError(null);
    return inv;
  }
  // Reads the Project's footage inventory. Never writes state for a stale Project, and never runs during a build.
  async function loadInventory(pid: string | null = projectRef.current, alive: () => boolean = () => true) {
    const script = inventoryJsRef.current;
    if (!pid || !script || busyRef.current || invLoadingRef.current === pid) return;
    const live = () => mountedRef.current && alive() && projectRef.current === pid;
    invLoadingRef.current = pid; setInvLoading(true);
    try {
      const inv = await run("Read footage", fill(script, { projectId: pid, only: null, known: photoSizesRef.current }));
      // A build that started meanwhile keeps the clip set it began with; the next refresh picks this up.
      if (!live() || busyRef.current) return;
      applyInventory(inv);
    } catch (e: any) {
      if (live()) setInvError({ say: (l) => sayError(l, e) });
    } finally {
      if (invLoadingRef.current === pid) invLoadingRef.current = null;
      if (mountedRef.current && projectRef.current === pid) setInvLoading(false);
    }
  }
  React.useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; buildAbortRef.current?.abort(); ownAbortRef.current?.abort(); }; }, []);

  // Mount and Project switch: reset per-Project state, resolve folders, read bundled assets, inventory the Project.
  React.useEffect(() => {
    setCandidates(null); setResult(null); setStatus(null); setInventory(null); setInvError(null); setInvLoading(false);
    setOnly(null); setOnlyPhotos(null); setCustomRows(null);
    invSigRef.current = null; photoSizesRef.current = {};
    busyRef.current = false; setBusy(false); setStep(""); setProgress(null); progressRef.current = null;
    if (!projectId) return;
    let alive = true;
    (async () => {
      try {
        const { plugin, data } = await locateRoots(sdk);
        if (!alive || projectRef.current !== projectId) return;
        setRoots({ plugin, data });
        // The host's ffmpeg (Runtime.runFFmpeg/runFFprobe) and a data folder are only needed for music previews, the
        // waveform, own music and motion; bundled cues build without them. A Selects build without them gets the
        // "needs a newer Selects" note in the Track section.
        setTools({ ffmpeg: !!data && tecHostCanRead() && tecHostHas(["rt.runFFmpeg", "rt.runFFprobe", "fs.join"]).ok });
        const read = (rel: string) => readText(plugin, rel);
        const [manifest, inventoryJs, searchJs, ensureJs, assembleJs, decorateJs, graphicTsx, frameTsx, lookTsx, titleB64, creditsB64, beatDetect] = await Promise.all([
          read("assets/cues/manifest.json"), read("scripts/inventory.js"), read("scripts/search.js"), read("scripts/ensure-audio.js"),
          read("scripts/assemble.js"), read("scripts/decorate.js"), read("assets/credits-graphic.tsx"), read("assets/shot-frame.tsx"),
          read("assets/cinematic-look.tsx"), read("assets/fonts/tec-title-serif.woff2.b64"), read("assets/fonts/tec-credits-sans.woff2.b64"),
          read("kit-beat-detect.cjs").catch(() => "")]);
        if (!alive || projectRef.current !== projectId) return;
        const parsed = JSON.parse(manifest);
        const fontsB64: Record<string, string> = { "tec-title-serif.woff2.b64": titleB64.replace(/\s+/g, ""), "tec-credits-sans.woff2.b64": creditsB64.replace(/\s+/g, "") };
        setAssets({ manifest: parsed, scripts: { inventoryJs, searchJs, ensureJs, assembleJs, decorateJs }, graphicTsx, frameTsx, lookTsx, fontsB64,
          beatWorker: beatDetect ? tecBeatWorkerSource(beatDetect) : "" });
        const def = (parsed.cues || []).find((c: any) => c.default) || (parsed.cues || [])[0];
        if (def) setCueId((cur) => (cur === "" ? def.id : cur));
        inventoryJsRef.current = inventoryJs;
        setStep("checking");
        await loadInventory(projectId, () => alive);
      } catch (e: any) {
        if (alive) setStatus({ tone: "error", say: (l) => t(l, "startFailed", { detail: sayError(l, e) }) });
      } finally { if (alive) setStep(""); }
    })();
    // Project switch or unmount stops a preview, including one still being prepared.
    return () => { alive = false; stopPreview(); buildAbortRef.current?.abort(); ownAbortRef.current?.abort(); };
  }, [projectId]);

  // Re-read the inventory every 10 s while videos are still importing (they become usable), while Selects analyses
  // some (only the note and the next build's shot source change; nothing waits for it), or while the Project has no
  // footage at all yet. A Project with only photos has nothing to wait for, so it does not poll.
  const invSkipped = inventory?.skipped || {};
  const needsPoll = !!inventory && ((invSkipped.unanalysed || 0) > 0 || (invSkipped.analysing || 0) > 0 || (inventory.resources.length === 0 && !inventory.photos?.length));
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

  // The bundled fonts for the preview and its measurements. A font that fails only makes the preview fall back.
  React.useEffect(() => {
    if (!assets || fontsReady) return;
    let alive = true;
    (async () => {
      try {
        if (typeof FontFace !== "undefined") {
          for (const f of TEC_FONTS) {
            const face = new FontFace(f.family, "url(data:font/woff2;base64," + assets.fontsB64[f.file] + ")", { style: f.style, weight: String(f.weight) });
            await face.load();
            (document as any).fonts.add(face);
          }
        }
        await (document as any).fonts?.ready;
      } catch { fontsFailedRef.current = true; }
      if (alive) setFontsReady(true);
    })();
    return () => { alive = false; };
  }, [assets]);

  // Waveform peaks of a bundled cue (the manifest has none): the host's ffmpeg decodes 8-bit mono at 800 Hz into a
  // temporary file in the data folder, which the panel reads back and removes. Without it the slider draws flat bars.
  const cue = assets?.manifest.cues.find((c: any) => c.id === cueId) || null;
  React.useEffect(() => {
    if (!roots || !cue || !tools.ffmpeg || cuePeaks[cue.id]) return;
    let alive = true;
    const id = cue.id;
    (async () => {
      try {
        const out = await tecHostPeaks(tecHostJoin(roots.plugin, "assets", "cues", cue.file), roots.data, 400);
        if (!alive) return;
        setCuePeaks((p) => ({ ...p, [id]: out }));
      } catch { /* flat bars */ }
    })();
    return () => { alive = false; };
  }, [roots, cue?.id, tools.ffmpeg]);

  // ---- Music: phrase, section bounds and the default reveal ----
  const musicOn = cueId !== "none" && (cueId !== "own" || !!ownMusic);
  const ownDuration = ownGrid && ownGrid.durationSeconds > 0 ? ownGrid.durationSeconds : null;
  const music = React.useMemo(() => {
    if (cueId === "none") return { kind: "none", P: TEC_FIXED_PHRASE, m: null, fixed: true, firstBeat: 0, usableEnd: null, swell: null, total: 1, peaks: [] as number[], ready: true };
    if (cueId === "own") {
      if (!ownMusic || !ownGrid || !ownDuration) return { kind: "own", P: TEC_FIXED_PHRASE, m: null, fixed: true, firstBeat: 0, usableEnd: null, swell: null, total: ownDuration || 1, peaks: ownGrid?.peaks || [], ready: false };
      // An accepted grid, or an approximate one (tight but sparse beat) in the detector's range, gives the phrase on the
      // detected tempo from the detected first beat; anything else the fixed 3.9 s phrase (tecOwnPhrase).
      const ph = tecOwnPhrase(ownGrid);
      const firstBeat = ph.firstBeat;
      return { kind: "own", P: ph.P, m: ph.m, fixed: ph.fixed, approximate: ph.approximate, firstBeat, usableEnd: ownDuration - TEC_MUSIC_END_MARGIN,
        swell: tecLoudest({ ...ownGrid, firstBeat, durationSeconds: ownDuration }, ph.P, ph.m, ph.fixed), total: ownDuration, peaks: ownGrid.peaks || [], ready: true };
    }
    if (!cue) return { kind: "cue", P: TEC_FIXED_PHRASE, m: null, fixed: true, firstBeat: 0, usableEnd: null, swell: null, total: 1, peaks: [] as number[], ready: false };
    const beats = cue.phraseBeats > 0 ? cue.phraseBeats : 4;
    return { kind: "cue", P: (beats * 60) / cue.bpm, m: beats, fixed: false, firstBeat: cue.firstBeat, usableEnd: cue.usableEnd,
      swell: cue.swell ?? cue.swellFallback, total: cue.durationSeconds, peaks: cuePeaks[cue.id] || [], ready: true };
  }, [cueId, cue, ownMusic, ownGrid, ownDuration, cuePeaks]);
  const requested = TEC_LENGTHS[length];
  const videoSeconds = tecVideoSeconds(requested, music.P);
  const sectionOpts = { firstBeat: music.firstBeat, P: music.P, L: TEC_LEAD_IN, videoSeconds, usableEnd: music.usableEnd, swell: music.swell, fixed: music.fixed };
  const sectionInfo = musicOn && music.ready && music.usableEnd != null ? tecSection({ ...sectionOpts, value: section == null ? undefined : section }) : null;
  const snap = (value: number) => { const r = music.ready && music.usableEnd != null ? tecSection({ ...sectionOpts, value }) : null; return r ? r.start : null; };
  const start: number | null = sectionInfo ? sectionInfo.start : null;
  // The section is infeasible at this Length: offer the longest Length that fits, or say how long the track must be.
  const fit = musicOn && music.ready && music.usableEnd != null && !sectionInfo
    ? tecFitLength({ firstBeat: music.firstBeat, P: music.P, usableEnd: music.usableEnd, fixed: music.fixed, requested: length }) : null;
  const tooShort = !!fit;

  // A new track (or its analysis) goes back to the default section; a new length keeps the choice and re-snaps it.
  React.useEffect(() => { setSection(null); }, [cueId, ownMusic?.path, ownGrid]);
  // A new track, section or length makes a running preview stale, so it stops.
  React.useEffect(() => { stopPreview(); }, [cueId, ownMusic?.path, section, length]);

  // ---- Credits: preset rows from Project info, the user's edits, the roll layout and speed ----
  const allRids: string[] = inventory ? inventory.resources.map((r: any) => r.rid) : [];
  const selectedRids = only ? allRids.filter((rid) => only.includes(rid)) : allRids;
  const photoList: any[] = inventory?.photos || [];
  const allPhotoRids: string[] = photoList.map((r: any) => r.rid);
  const selectedPhotoRids = onlyPhotos ? allPhotoRids.filter((rid) => onlyPhotos.includes(rid)) : allPhotoRids;
  const usedPhotoCount = usePhotos ? selectedPhotoRids.length : 0;
  const creditInfo = React.useMemo(() => ({
    projectName: context?.projectName || "",
    dates: inventory ? [...inventory.resources, ...(inventory.photos || [])].map((r: any) => r.recordedAt).filter(Boolean) : [],
    cueTitle: cueId !== "none" && cueId !== "own" && cue ? cue.title : "",
    ownMusicName: cueId === "own" && ownMusic ? ownMusic.name : "",
    clips: selectedRids.length,
    photos: usedPhotoCount,
  }), [context?.projectName, inventory, cueId, cue, ownMusic, selectedRids.length, usedPhotoCount]);
  const presetRows: EditRow[] = React.useMemo(() => tecPresetRows(preset, creditInfo).map((r: any, i: number) => ({ id: "p" + i, role: r.role, name: r.name })), [preset, creditInfo]);
  const rows: EditRow[] = customRows ?? presetRows;
  // Edited rows keep the user's text; a value still equal to what was filled in automatically follows the Project,
  // the music and the clip counts (an emptied value, e.g. the Music credit with No music, removes that row).
  const autoRef = React.useRef<Record<string, string> | null>(null);
  React.useEffect(() => {
    const next = autoValues(creditInfo), prev = autoRef.current;
    autoRef.current = next;
    if (!prev) return;
    setCustomRows((cur) => {
      if (!cur) return cur;
      let changed = false;
      const out: EditRow[] = [];
      for (const r of cur) {
        const kind = Object.keys(AUTO_ROLES).find((k) => AUTO_ROLES[k].includes(r.role) && prev[k] !== "" && r.name === prev[k] && next[k] !== prev[k]);
        if (!kind) { out.push(r); continue; }
        changed = true;
        if (next[kind] !== "") out.push({ ...r, name: next[kind] });
      }
      // A value that was empty (so its row was left out) and now exists comes back at its preset position, unless the
      // user already has a row with that role.
      const fresh = tecPresetRows(preset, creditInfo);
      for (const k of Object.keys(AUTO_ROLES)) {
        if (prev[k] !== "" || next[k] === "") continue;
        const at = fresh.findIndex((r: any) => AUTO_ROLES[k].includes(r.role));
        if (at < 0 || out.some((r) => r.role === fresh[at].role)) continue;
        out.splice(Math.min(at, out.length), 0, { id: "u" + (++rowIdRef.current), role: fresh[at].role, name: next[k] });
        changed = true;
      }
      return changed ? out : cur;
    });
  }, [creditInfo]);
  const editRows = (fn: (list: EditRow[]) => EditRow[]) => { if (!busyRef.current) setCustomRows(fn((customRows ?? presetRows).slice())); };
  const newRowId = () => "u" + (++rowIdRef.current);
  const cleanRows = tecCleanRows(rows);
  const cleanKey = JSON.stringify(cleanRows);
  const creditModel = React.useMemo(() => tecCreditLayout({ rows: cleanRows, layout, H: 1080, measure: (text: string, px: number) => measureCredit(text, px) }), [cleanKey, layout, fontsReady]);
  const roll = tecRollSpeed({ endSec: videoSeconds, L: TEC_LEAD_IN, H: 1080, lastLineBottom: creditModel.lastLineBottom, rowTops: creditModel.rowTops, rowBottoms: creditModel.rowBottoms });
  const placeholders = tecPlaceholderRows(cleanRows).length;
  const nonLatin = hasNonLatin(title + " " + cleanRows.map((r: any) => r.role + " " + r.name).join(" "));
  // Preview scrub points: the credits fully in, the last row entering the frame, and the end: the moment the last line
  // has cleared the top (0.3 s before the video ends), so the preview shows the empty top while the window fades.
  // Rounded up to 0.1 s so the text is gone; with too many rows (exitsLate) it honestly shows the text left over.
  const firstRowSec = layout === "full" ? TEC_LEAD_IN + 0.5 : 6.0;
  const lastRowSec = creditModel.lastRoleTop == null ? firstRowSec
    : Math.min(videoSeconds, Math.max(firstRowSec, TEC_LEAD_IN + (creditModel.lastRoleTop - 0.8 * 1080) / roll.pxPerSec));
  const endScrubSec = Math.min(Math.floor(videoSeconds * 10) / 10, Math.max(0, Math.ceil((videoSeconds - TEC_CREDIT_METRICS.exitLead) * 10 - 1e-6) / 10));
  React.useEffect(() => { setPreviewTime((t) => Math.min(t, Math.round(videoSeconds * 10) / 10)); }, [videoSeconds]);

  // ---- Own music: decode and find the beat ----
  // The host's ffmpeg decodes the track (tecHostDecodePcm, a temporary file in the data folder, removed), and the kit
  // detector runs on it in a Web Worker (analyseBeat). A Project switch or unmount aborts it (ownAbortRef); a stale
  // result is dropped. Any failure falls back to fixed timing with the track's length from ffprobe.
  async function detectOwnMusic(file: { path: string; name: string }) {
    if (busyRef.current || !roots) return;
    const pid = projectRef.current;
    busyRef.current = true;
    setOwnMusic(file); setOwnGrid(null); setBusy(true); setStep("listening");
    ownAbortRef.current?.abort();
    const ac = new AbortController();
    ownAbortRef.current = ac;
    try {
      if (!assets?.beatWorker) throw uiError((l) => t(l, "beatFailed"));
      const samples = await tecHostDecodePcm(file.path, roots.data, TEC_PCM_RATE, TEC_PCM_SECONDS);
      if (projectRef.current !== pid || ac.signal.aborted) return;
      const g = await analyseBeat(assets.beatWorker, samples, ac.signal);
      if (projectRef.current !== pid || ac.signal.aborted) return;
      if (!g || !(g.durationSeconds > 0)) throw uiError((l) => t(l, "beatFailed"));
      setOwnGrid(g);
      setStatus(null);
    } catch (e: any) {
      if (ac.signal.aborted || projectRef.current !== pid) return;
      // Without a grid the shots use the fixed 3.9 s timing, but the track's real length still bounds the section.
      let duration: number | null = null;
      try { duration = Math.min(await tecHostProbeSeconds(file.path, { timeoutMs: 30000 }), TEC_PCM_SECONDS); } catch { duration = null; }
      if (projectRef.current !== pid) return;
      setOwnGrid({ accepted: false, durationSeconds: duration, peaks: [] });
      setStatus(duration ? null : { tone: "error", say: (l) => t(l, "musicUnreadable", { detail: sayError(l, e) }) });
    } finally {
      if (ownAbortRef.current === ac) ownAbortRef.current = null;
      busyRef.current = false; setBusy(false); setStep("");
    }
  }

  // Music preview of the whole video length: "idle" -> "loading" (ffmpeg cut) -> "playing". Every start or stop
  // bumps the token, so a late result from a cancelled preparation is dropped.
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
    if (!musicOn || !roots || start == null) return;
    stopPreview();
    const token = previewTokenRef.current;
    const live = () => previewTokenRef.current === token && mountedRef.current;
    setPlayState("loading");
    try {
      const file = cueId === "own" && ownMusic ? ownMusic.path : tecHostJoin(roots.plugin, "assets", "cues", cue.file);
      // The whole video length from the section start, with the build's 1.5 s fade-out, cut by the host's ffmpeg into
      // a temporary file in the data folder, read back as a blob: URL and removed (tecHostPreviewUrl).
      const url = await tecHostPreviewUrl(file, start, videoSeconds, MUSIC_FADE_OUT, roots.data);
      if (!live()) { try { URL.revokeObjectURL(url); } catch { /* gone */ } return; }
      previewUrlRef.current = url;
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

  // Scene search: four clips per call keeps each call under run_script's 30 s deadline; pageSize 4.
  async function findCandidates(rids: string[], pid: string, check: () => void) {
    const list: any[] = []; const failed: string[] = [];
    for (let i = 0; i < rids.length; i += 4) {
      const done = i;
      advance("prepare", 0.1 + (0.6 * i) / Math.max(1, rids.length), (l) => t(l, "videosChecked", { done, count: rids.length }));
      const r = await run("Search scenic shots", fill(assets.scripts.searchJs, { projectId: pid, rids: rids.slice(i, i + 4), queries: TEC_SEARCH_QUERIES, pageSize: 4 }));
      check();
      list.push(...r.candidates); failed.push(...r.failed);
    }
    return { list, failed };
  }

  // Clips without analysis: the quick local score (the kit block above: host ffmpeg through __DI__, bounded concurrency,
  // cached per clip in the data folder) and the planner's tecLocalShots turn them into candidates and motion curves.
  // "Checking clips N/M" inside Prepare; a Project switch or closing the panel aborts it (buildAbortRef). Any failure
  // short of a cancel falls back to evenly spaced windows, so the build goes ahead.
  async function localShots(resources: any[], P: number, check: () => void, signal: AbortSignal, from: number, to: number) {
    const count = resources.length;
    if (!count) return { list: [], curves: {}, scored: 0, even: [], ms: 0 };
    advance("prepare", from, (l) => t(l, "clipsChecking", { done: 0, count }));
    const out = await tecLocalShots(resources, { P, signal, dataDir: roots?.data || null, concurrency: TEC_QUICK_CONCURRENCY, budgetMs: TEC_QUICK_BUDGET_MS,
      scoreAll: quickScoreAll, candidatesOf: qsCandidates,
      onProgress: (p: any) => { const done = p.done; advance("prepare", from + ((to - from) * done) / count, (l) => t(l, "clipsChecking", { done, count })); } });
    check();
    if (out.even.length) console.info("[the-end-credits] quick score fell back to evenly spaced windows for", out.even.join(", "));
    return out;
  }

  // In-shot motion: the host's ffmpeg once per analysed clip (4 fps, 64x36 grey frames, planner tecMotionArgs) into a
  // temporary file in the data folder, read back, removed and turned into a curve (tecMotionCurve). Cached per
  // Project + clip. Without the host ffmpeg, or when a clip fails, that clip simply has no curve and the allocation
  // scores it as before.
  async function measureMotion(resources: any[], pid: string, check: () => void, from: number) {
    const out: Record<string, any> = {};
    const todo = resources.filter((r: any) => !((pid + "|" + r.rid) in motionRef.current));
    for (let i = 0; i < todo.length; i++) {
      const r = todo[i], key = pid + "|" + r.rid;
      const done = i;
      advance("prepare", from + ((1 - from) * i) / Math.max(1, todo.length), (l) => t(l, "videosMeasured", { done, count: todo.length }));
      if (!tools.ffmpeg || !r.path || !roots) { motionRef.current[key] = null; continue; }
      let curve: any = null;
      try {
        const bytes = await tecHostFFmpegBytes((file: string) => tecMotionArgs(r.path, file), roots.data, "gray", { timeoutMs: 120000 });
        check();
        curve = tecMotionCurve(bytes);
      } catch (e: any) {
        if (e === STALE) throw e;
        curve = null;
      }
      motionRef.current[key] = curve;
    }
    for (const r of resources) { const c = motionRef.current[pid + "|" + r.rid]; if (c) out[r.rid] = c; }
    return out;
  }

  // The Motion Graphic's data and its Adjust fields, from the frozen build record; labels in the build-time language.
  function graphicFor(record: any, bl: Lang) {
    const K = record.rows.length;
    const scalars: Record<string, string> = {};
    const editableRows: any[] = [];
    record.rows.forEach((r: any, i: number) => {
      scalars["role" + (i + 1)] = r.role; scalars["name" + (i + 1)] = r.name;
      editableRows.push({ key: "role" + (i + 1), label: t(bl, "roleN", { n: i + 1 }), type: "text", defaultValue: r.role }, { key: "name" + (i + 1), label: t(bl, "nameN", { n: i + 1 }), type: "text", defaultValue: r.name });
    });
    const fonts = TEC_FONTS.map((f) => ({ family: f.family, b64: assets.fontsB64[f.file], weight: f.weight, style: f.style }));
    const parameters = { layout: record.layout, fps: record.fps, revealFrame: record.frames[1], endFrame: record.frames[record.frames.length - 1],
      title: record.titleText, titleColor: TITLE_COLOR, creditColor: CREDIT_COLOR, rows: record.rows, ...scalars, rowCount: K,
      speedPxPerSec: record.speedPxPerSec, speed: 1, showTitle: true, fonts };
    const editableParameters: any = [
      { key: "title", label: t(bl, "title"), type: "text", defaultValue: record.titleText },
      { key: "titleColor", label: t(bl, "param.titleColor"), type: "color", defaultValue: TITLE_COLOR },
      { key: "creditColor", label: t(bl, "param.creditColor"), type: "color", defaultValue: CREDIT_COLOR },
      { key: "speed", label: t(bl, "param.rollSpeed"), type: "number", defaultValue: 1, min: 0.5, max: 2, step: 0.05 },
      { key: "showTitle", label: t(bl, "param.showTitle"), type: "boolean", defaultValue: true },
      ...editableRows,
    ];
    return { tsx: assets.graphicTsx, parameters, editableParameters };
  }
  // decorate.js's Inspector labels (Shot frame, its Motion choices, Cinematic look); the script falls back to English.
  function inspectorLabels(bl: Lang) {
    return { windowX: t(bl, "param.windowX"), windowY: t(bl, "param.windowY"), windowSize: t(bl, "param.windowSize"), fadeIn: t(bl, "param.fadeIn"),
      fadeOut: t(bl, "param.fadeOut"), motion: t(bl, "param.motion"), motionStrength: t(bl, "param.motionStrength"), lookStrength: t(bl, "param.lookStrength"),
      motions: Object.fromEntries(["none", ...TEC_PHOTO_MOTIONS].map((v) => [v, t(bl, "motion." + v)])) };
  }

  async function build(nextSeed: number) {
    if (busyRef.current || !assets || !inventory || !roots) return;
    if (cueId === "own" && !ownMusic) { setStatus({ tone: "error", say: (l) => t(l, "dropMusic") }); return; }
    if (musicOn && (!music.ready || start == null)) { setStatus({ tone: "error", say: tooShort ? (l) => t(l, "trackTooShort") : (l) => t(l, "musicNotReady") }); return; }
    const pid = projectId;
    const check = () => { if (projectRef.current !== pid) throw STALE; };
    // Every input as it is at Build; "Finish title and look" retries with exactly these.
    const inputs = { layout, title, rows: tecCleanRows(rows), lookOn, clipSound, P: music.P, sectionStart: musicOn ? start : null,
      musicPath: !musicOn ? null : cueId === "own" ? ownMusic!.path : tecHostJoin(roots.plugin, "assets", "cues", cue.file),
      musicSeconds: musicOn && cueId !== "own" && cue?.durationSeconds > 0 ? cue.durationSeconds : null, requested, usePhotos, onlyPhotos, only };
    busyRef.current = true;
    stopPreview();
    setBusy(true); setStatus(null); setResult(null); progressRef.current = null;
    buildAbortRef.current?.abort();
    const abort = new AbortController();
    buildAbortRef.current = abort;
    advance("prepare", 0);
    try {
      // 1. Inventory (fresh), 2. scene search (analysed clips) and the quick local score (the others): Prepare.
      const raw = await run("Read footage", fill(assets.scripts.inventoryJs, { projectId: pid, only: null, known: photoSizesRef.current }));
      check();
      const inv = applyInventory(raw);
      advance("prepare", 0.1);
      const key = pid + "|" + JSON.stringify(inputs.only);
      const chosen: any[] = inv.resources.filter((r: any) => !inputs.only || inputs.only.includes(r.rid));
      const rids: string[] = chosen.filter((r: any) => r.analysed !== false).map((r: any) => r.rid);
      const dur: Record<string, number> = Object.fromEntries(inv.resources.map((r: any) => [r.rid, r.duration]));
      const cached = candidates && candidates.key === key && candidates.sig === invSigRef.current ? candidates : null;
      let found = cached;
      // Unanalysed clips' windows depend on the phrase (a new track): score them again (read back from the quick score's
      // cache in the data folder) without searching the analysed clips again.
      const localStale = !!cached && cached.P !== inputs.P;
      if (!cached || cached.failed.length || localStale) {
        // Search everything the first time; afterwards retry only the clips whose search failed.
        const todo: string[] = cached ? cached.failed : rids;
        const fresh = await findCandidates(todo, pid, check);
        const local = !cached || localStale ? await localShots(chosen.filter((r: any) => r.analysed === false), inputs.P, check, abort.signal, 0.7, 0.85) : null;
        const retried = new Set(todo);
        const kept = cached ? cached.list.filter((c: any) => !retried.has(c.rid) && !(local && c.local)) : [];
        found = { key, sig: invSigRef.current, P: inputs.P, failed: fresh.failed, curves: local ? local.curves : cached.curves,
          list: [...kept, ...(local ? local.list : []), ...fresh.list.map((c: any) => ({ ...c, sourceDuration: dur[c.rid] || 0 }))] };
        setCandidates(found);
      }
      // In-shot motion: measured for the searched clips (cached; silently skipped without ffmpeg), from the quick score
      // for the others.
      const motion = { ...(found.curves || {}), ...(await measureMotion(chosen.filter((r: any) => r.analysed !== false), pid, check, 0.85)) };
      advance("prepare", 1);
      // 3. Plan.
      advance("plan", 0);
      const photoCands = photoCandsOf(inv, inputs.onlyPhotos, inputs.usePhotos);
      const plan: any = tecPlanBuild({ layout: inputs.layout, N: inputs.requested, P: inputs.P, candidates: found.list.concat(photoCands), seed: String(nextSeed), motion });
      if (!plan.ok) {
        const failedCount = found.failed.length, needed = plan.needed, usable = plan.usableShots, withPhotos = inputs.usePhotos;
        throw uiError((l) => [t(l, "needsShots", { count: needed, found: usable }), withPhotos ? t(l, "addFootagePhotosSelect") : t(l, "addFootage"),
          ...(failedCount ? [t(l, "retryUnchecked", { count: failedCount })] : [])].join(t(l, "gap")));
      }
      advance("plan", 1);
      // 4. Music: import the track in its own call (an import and a commit never share a run_script).
      advance("music", 0);
      const musicRes = inputs.musicPath ? await run("Add music to the project", fill(assets.scripts.ensureJs, { projectId: pid, path: inputs.musicPath, ...(inputs.musicSeconds ? { durationSeconds: inputs.musicSeconds } : {}) }), true) : null;
      check();
      advance("music", 1);
      // 5. Assemble: the new Draft, the shots on the phrase grid, clip sound and music. One commit.
      advance("assemble", 0);
      const sizeOf = (rid: string) => [...inv.resources, ...inv.photos].find((r: any) => r.rid === rid) || null;
      const pickedRids = [...new Set(plan.picks.map((k: any) => k.rid as string))] as string[];
      const sources: Record<string, { aspect: number | null }> = {};
      for (const rid of pickedRids) { const r: any = sizeOf(rid); sources[rid] = { aspect: r && r.aspect > 0 ? r.aspect : null }; }
      const name = "THE END Credits " + new Date().toISOString().slice(0, 16).replace("T", " ");
      const a = await run("Assemble THE END Credits", fill(assets.scripts.assembleJs, {
        projectId: pid, draftName: name, layout: inputs.layout, picks: plan.picks, boundaries: plan.timeline.boundaries, L: plan.timeline.L,
        music: musicRes ? { resourceId: musicRes.resourceId, sectionStart: inputs.sectionStart } : null,
        clipSound: inputs.clipSound, ambientDb: AMBIENT_DB, musicFadeOut: MUSIC_FADE_OUT, sources }), true);
      check();
      if (!a.sequenceId) throw uiError((l) => t(l, "draftNoId", { name }));
      advance("assemble", 1);
      // The build record, frozen: the roll speed at the Draft's real rate from the assembled frames.
      const frames: number[] = a.frames;
      const endSec = frames[frames.length - 1] / a.fps, revealSec = frames[1] / a.fps;
      const model = tecCreditLayout({ rows: inputs.rows, layout: inputs.layout, H: 1080, measure: (text: string, px: number) => measureCredit(text, px) });
      const speed = tecRollSpeed({ endSec, L: revealSec, H: 1080, lastLineBottom: model.lastLineBottom, rowTops: model.rowTops, rowBottoms: model.rowBottoms });
      const sizes: Record<string, { width: number; height: number }> = { ...photoSizesRef.current };
      for (const r of inv.resources) if (r.width > 0 && r.height > 0) sizes[r.rid] = { width: r.width, height: r.height };
      // Photos move; still (or unmeasured) video shots get a gentle push-in or drift; moving ones stay as shot.
      const moves = tecShotMotions(plan.picks, String(nextSeed), sizes, { pool: plan.motionPool });
      const photos: Record<string, any> = {}, byRid: Record<string, any> = {};
      const byShot = moves.map((mv: any) => (mv ? { motion: mv.motion, direction: mv.direction, axis: mv.axis, frameStrength: mv.frameStrength } : null));
      plan.picks.forEach((k: any, i: number) => {
        if (!k || k.kind !== "photo" || !moves[i]) return;
        const mv = moves[i];
        photos[k.rid] = { aspect: sources[k.rid]?.aspect ?? null, motion: mv.motion, direction: mv.direction, axis: mv.axis };
        byRid[k.rid] = { motion: mv.motion, direction: mv.direction, axis: mv.axis };
      });
      const record = { layout: inputs.layout, sequenceId: a.sequenceId, fps: a.fps, frames, titleText: inputs.title, rows: inputs.rows,
        speedPxPerSec: speed.pxPerSec, window: WINDOWS[inputs.layout], look: { on: inputs.lookOn, strength: LOOK_STRENGTH }, clipSound: inputs.clipSound,
        photos, sources, fades: FADES, musicFadeOut: MUSIC_FADE_OUT };
      const notes = [...(a.notes || [])];
      if (fontsFailedRef.current) notes.push("the bundled fonts did not load in the panel, so the roll speed was measured with a fallback face");
      const shortened = plan.shrunk ? { shots: plan.visibleShots, seconds: endSec, fullSeconds: tecVideoSeconds(inputs.requested, inputs.P) } : null;
      setResult({ sequenceId: a.sequenceId, decorated: false, record, photoMotion: { byRid, byShot }, seed: nextSeed, notes, link: null, shortened, unchecked: found.failed.length, roll: speed });
      await decorate(record, { byRid, byShot }, check);
    } catch (e: any) {
      if (e !== STALE && e?.name !== "AbortError" && projectRef.current === pid) setStatus({ tone: "error", say: stopAt(e) });
    } finally { if (buildAbortRef.current === abort) buildAbortRef.current = null; endRun(pid); }
  }

  // Another version: same clips and cached shots, a new seed.
  function buildAnother() {
    if (busyRef.current) return;
    setResult(null); setStatus(null);
    const s = seed + 1;
    setSeed(s);
    build(s);
  }

  // Retries only decorate, with the frozen build record (it never replaces effects already on the Draft).
  async function finishTitle() {
    if (busyRef.current || !result || !assets || !roots) return;
    const pid = projectId;
    const check = () => { if (projectRef.current !== pid) throw STALE; };
    busyRef.current = true; stopPreview(); setBusy(true); setStatus(null); progressRef.current = null;
    try { await decorate(result.record, result.photoMotion, check); }
    catch (e: any) { if (e !== STALE && projectRef.current === pid) setStatus({ tone: "error", say: stopAt(e) }); }
    finally { endRun(pid); }
  }

  // Commit 2: mute (Clip sound Off), the credits graphic, the Cinematic look and the Shot frame; then open the Draft.
  async function decorate(record: any, photoMotion: any, check: () => void) {
    advance("decorate", 0);
    const bl = langRef.current;
    try {
      await run("Add credits and look", fill(assets.scripts.decorateJs, { ...record, graphic: graphicFor(record, bl), frame: { tsx: assets.frameTsx },
        look: { tsx: assets.lookTsx, strength: record.look.strength, on: record.look.on }, photoMotion, labels: inspectorLabels(bl) }), true);
    } catch (e: any) {
      if (e === STALE) throw e;
      throw uiError((l) => t(l, "finishFailed", { detail: sayError(l, e) }));
    }
    check();
    setResult((r: any) => ({ ...r, decorated: true }));
    advance("decorate", 0.9, (l) => t(l, "openingDraft"));
    try {
      const o = await run("Open the new Draft", "const id = " + JSON.stringify(record.sequenceId) + ";\n"
        + "let link = null, openError = null;\n"
        + "try { link = (await selects.editor.linkToDraftFrame(id, 0)).deepLinkUrl; } catch (e) { link = null; }\n"
        + "try { await selects.editor.openDraft(id); } catch (e) { openError = String((e && e.message) || e); }\n"
        + "return { link, openError };");
      check();
      setResult((r: any) => ({ ...r, link: o.link || null }));
      if (o.openError) throw new Error(o.openError);
      advance("decorate", 1);
    } catch (e: any) {
      if (e === STALE) throw e;
      setStatus({ tone: "error", say: (l) => t(l, "openFailed", { detail: sayError(l, e) }) });
    }
  }

  // Clip selection ("Choose clips"): `only` holds rids in inventory order, or null for every clip.
  const chooseClips = (next: string[]) => {
    if (busyRef.current) return;
    const keep = new Set(next);
    const ordered = allRids.filter((rid) => keep.has(rid));
    setOnly(ordered.length === allRids.length ? null : ordered);
    // A new selection needs a new scene search.
    setCandidates(null);
  };
  const toggleClip = (rid: string, on: boolean) => chooseClips(on ? [...selectedRids, rid] : selectedRids.filter((x) => x !== rid));
  // Photos are not searched, so choosing them keeps the cached scene search.
  const choosePhotos = (next: string[]) => {
    if (busyRef.current) return;
    const keep = new Set(next);
    const ordered = allPhotoRids.filter((rid) => keep.has(rid));
    setOnlyPhotos(ordered.length === allPhotoRids.length ? null : ordered);
  };
  const togglePhoto = (rid: string, on: boolean) => choosePhotos(on ? [...selectedPhotoRids, rid] : selectedPhotoRids.filter((x) => x !== rid));
  const extra = layout === "full" ? 1 : 0;
  const neededShots = TEC_MIN_SHOTS + extra;
  // Once a build has searched the current selection, the footage's capacity is known: plan it for the readiness line.
  const candKey = projectId + "|" + JSON.stringify(only);
  const fitsPlan: any = React.useMemo((): any => {
    if (!inventory) return null;
    const photoC = photoCandsOf(inventory, onlyPhotos, usePhotos);
    let list: any[] | null = null;
    if (candidates && candidates.key === candKey) list = candidates.list.concat(photoC);
    else if (!selectedRids.length) list = photoC;
    if (!list) return null;
    return tecPlanBuild({ layout, N: requested, P: music.P, candidates: list, seed: String(seed) });
  }, [candidates, candKey, inventory, onlyPhotos, usePhotos, layout, requested, music.P, seed, selectedRids.length]);
  const canBuild = !!inventory && (selectedRids.length > 0 || usedPhotoCount >= neededShots) && (!fitsPlan || fitsPlan.ok)
    && (!musicOn ? cueId !== "own" : music.ready && start != null);
  const footNotes = tecFootageNotes(L, inventory);
  const clipCount = [
    allRids.length ? (only ? t(L, "clipsSelected", { selected: selectedRids.length, count: allRids.length }) : t(L, "clips", { count: allRids.length })) : "",
    usePhotos && allPhotoRids.length ? (onlyPhotos ? t(L, "photosSelected", { selected: selectedPhotoRids.length, count: allPhotoRids.length }) : t(L, "photos", { count: allPhotoRids.length })) : "",
  ].filter(Boolean).join(" · ");
  const shotsFit = fitsPlan && fitsPlan.ok ? fitsPlan.N : requested;
  const sentences = (list: string[]) => list.filter(Boolean).join(t(L, "gap"));
  const readiness = !inventory ? (invError ? t(L, "readFailed", { detail: invError.say(L) }) : t(L, "checkingClipsNow"))
    : inventory.resources.length === 0 && !allPhotoRids.length ? (footNotes.importing || t(L, "noFootage"))
    : inventory.resources.length === 0 && !usePhotos ? sentences([footNotes.importing, t(L, "turnOnPhotos")])
    : selectedRids.length === 0 && usedPhotoCount === 0 ? t(L, "noClipsSelected")
    : fitsPlan && !fitsPlan.ok ? sentences([t(L, "needsShots", { count: fitsPlan.needed, found: fitsPlan.usableShots }), t(L, "addFootagePhotos"), footNotes.importing])
    : sentences([t(L, "ready", { summary: [clipCount, shotsFit < requested ? t(L, "shotsFitted", { count: shotsFit + extra }) : t(L, "shots", { count: shotsFit + extra }),
      t(L, "aboutSeconds", { seconds: Math.round(tecVideoSeconds(shotsFit, music.P)) })].filter(Boolean).join(" · ") }), footNotes.importing]);
  const canOwnMusic = tools.ffmpeg;
  const silent = cueId === "none" && clipSound === "off";
  const hidden = roll.hiddenRows;
  // Too many rows: even at its fastest the roll can't take the last line off the top before the end.
  const dropRows = Math.max(1, roll.removeRows, hidden.length);
  // "choose Long" names the Length option exactly as the Length control shows it.
  const longLabel = t(L, "length.long"), lengthLabel = t(L, "length." + length);
  const dropText = length !== "long" ? t(L, "dropRowsOrLong", { count: dropRows, long: longLabel }) : t(L, "dropRows", { count: dropRows });
  const hiddenNames = hidden.map((i: number) => cleanRows[i].role || cleanRows[i].name).join(t(L, "listSep"));
  const rollNotice = !cleanRows.length ? t(L, "noCreditRows")
    : hidden.length ? sentences([hidden.length > 1 ? t(L, "rowsHidden", { from: hidden[0] + 1, to: hidden[hidden.length - 1] + 1, length: lengthLabel, names: hiddenNames })
      : t(L, "rowHidden", { from: hidden[0] + 1, length: lengthLabel, names: hiddenNames }), dropText])
    : roll.exitsLate ? (length !== "long" ? t(L, "tooManyRowsOrLong", { count: dropRows, long: longLabel }) : t(L, "tooManyRows", { count: dropRows }))
    : roll.endsEarly ? t(L, "creditsEndEarly")
    : null;
  const stepLabel = step === "checking" ? t(L, "checkingClips") : step === "listening" ? t(L, "listening") : "";
  const progressLabel = !progress ? "" : progress.detail
    ? t(L, "progressDetail", { step: progress.current + 1, total: TEC_BUILD_STEPS.length, name: t(L, "step." + progress.id), detail: progress.detail(L), percent: progress.percent })
    : t(L, "progress", { step: progress.current + 1, total: TEC_BUILD_STEPS.length, name: t(L, "step." + progress.id), percent: progress.percent });

  if (!projectId) return <ui.Message tone="error">{t(L, "openProject")}</ui.Message>;

  const lengthOptions = TEC_LENGTH_ORDER.map((k: string) => ({ label: t(L, "length." + k), value: k }));
  const trackOptions = [...(assets?.manifest.cues || []).map((c: any) => ({ label: c.title, value: c.id })),
    ...(canOwnMusic || cueId === "own" ? [{ label: t(L, "ownMusic"), value: "own" }] : []), { label: t(L, "noMusic"), value: "none" }];

  return (
    <ui.Stack gap={16}>
      <ui.Row gap={8} align="center">
        <ui.Message tone={!inventory && invError ? "error" : "muted"}>{readiness}</ui.Message>
        <ui.Button variant="ghost" busy={invLoading} busyLabel={t(L, "refreshing")} disabled={busy || !assets} onClick={() => loadInventory()}>{t(L, "refresh")}</ui.Button>
      </ui.Row>
      {inventory && invError ? <ui.Message tone="error">{t(L, "refreshFailed", { detail: invError.say(L) })}</ui.Message> : null}
      {inventory && footNotes.better ? <ui.Message tone="muted">{footNotes.better}</ui.Message> : null}
      <ui.Section title={t(L, "layout")}>
        <LayoutTiles lang={L} layout={layout} busy={busy} onPick={setLayout} onKeyDown={guardKeys} />
      </ui.Section>
      <ui.Section title={t(L, "preview")}>
        <CreditsPreview lang={L} layout={layout} title={title} model={creditModel} pxPerSec={roll.pxPerSec} endSec={videoSeconds} time={previewTime} fontsReady={fontsReady} />
        <ui.Slider label={t(L, "previewAt")} unit={t(L, "secondsUnit")} min={0} max={Math.round(videoSeconds * 10) / 10} step={0.1} value={previewTime} onChange={setPreviewTime} />
        <ui.Row gap={4}>
          <ui.Button variant="ghost" onClick={() => setPreviewTime(Math.round(firstRowSec * 10) / 10)}>{t(L, "firstRow")}</ui.Button>
          <ui.Button variant="ghost" onClick={() => setPreviewTime(Math.round(lastRowSec * 10) / 10)}>{t(L, "lastRow")}</ui.Button>
          <ui.Button variant="ghost" onClick={() => setPreviewTime(endScrubSec)}>{t(L, "end")}</ui.Button>
        </ui.Row>
        {rollNotice ? <ui.Message tone="muted">{rollNotice}</ui.Message> : null}
      </ui.Section>
      <ui.Section title={t(L, "title")}>
        <ui.TextField label={t(L, "title")} value={title} placeholder={DEFAULT_TITLE} onChange={setTitle} disabled={busy} />
      </ui.Section>
      <ui.Section title={t(L, "credits")}>
        <ui.Select label={t(L, "preset")} value={preset} disabled={busy} onChange={(v: string) => { setPreset(v); setCustomRows(null); }}
          options={TEC_PRESET_ORDER.map((id: string) => ({ label: tOr(L, "preset." + id, (TEC_PRESETS as any)[id].label), value: id }))} />
        <CreditRows lang={L} rows={rows} busy={busy} ui={ui} onEdit={editRows} onKeyDown={guardKeys}
          onAdd={() => editRows((l) => [...l, { id: newRowId(), role: "", name: "" }])} onReset={() => { if (!busyRef.current) setCustomRows(null); }} canReset={!!customRows} />
        {placeholders ? <ui.Message tone="muted">{t(L, "placeholdersLeft", { count: placeholders })}</ui.Message> : null}
        {nonLatin ? <ui.Message tone="muted">{t(L, "systemFont")}</ui.Message> : null}
      </ui.Section>
      <ui.Section title={t(L, "length")}>
        <ui.Segmented label={t(L, "length")} value={length} onChange={setLength} options={lengthOptions} disabled={busy} />
      </ui.Section>
      <ui.Section title={t(L, "music")}>
        <ui.Select label={t(L, "track")} value={cueId} disabled={busy} onChange={(v: string) => { setCueId(v); if (v !== "own") { setOwnMusic(null); setOwnGrid(null); } }} options={trackOptions} />
        {cueId === "own" && canOwnMusic ? <ui.FileDrop accept={["audio"]} value={ownMusic} disabled={busy}
          onReject={() => setStatus({ tone: "error", say: (l) => t(l, "dropAudio") })}
          onChange={(f: any) => { if (f) detectOwnMusic(f); else { setOwnMusic(null); setOwnGrid(null); } }} /> : null}
        {!canOwnMusic ? <ui.Message tone="muted">{t(L, "needsNewerSelects")}</ui.Message> : null}
        {cueId === "own" && ownMusic && ownGrid && music.fixed ? <ui.Message tone="muted">{t(L, "noSteadyBeat", { seconds: TEC_FIXED_PHRASE })}</ui.Message> : null}
        {cueId === "own" && ownMusic && ownGrid && !music.fixed && "approximate" in music && music.approximate ? <ui.Message tone="muted">{t(L, "beatApprox", { seconds: Math.round(music.P * 100) / 100 })}</ui.Message> : null}
        {musicOn && music.ready ? (
          // Esc on the slider or the preview button (the key bubbles up here) stops the preview.
          <div onKeyDown={(e) => { if (e.key === "Escape" && playState !== "idle") { e.preventDefault(); stopPreview(); } }}>
            <SectionSlider lang={L} peaks={music.peaks} total={music.total} section={start} videoSeconds={videoSeconds} stepSeconds={music.fixed ? 0.1 : music.P}
              snap={snap} onChange={(v) => { if (v != null) setSection(v); }} disabled={busy || start == null} audio={playingAudio} />
            <ui.Row gap={8} align="center">
              {/* The kit has no stop icon; "pause" marks stop, and the label says what it does. */}
              <ui.IconButton icon={playState === "playing" ? "pause" : playState === "loading" ? "loading" : "play"}
                label={playState === "playing" ? t(L, "stopPreview") : playState === "loading" ? t(L, "cancelPreview") : t(L, "previewWhole")}
                onClick={preview} disabled={busy || !tools.ffmpeg || (playState === "idle" && start == null)} />
              <span style={{ minWidth: 0 }}>{start == null ? t(L, "musicTooShort")
                : !(sectionInfo && Math.abs(sectionInfo.start - sectionInfo.defaultStart) < 1e-6) ? t(L, "startsAt", { seconds: Math.round(start * 10) / 10 })
                : music.kind === "own" ? t(L, "startsAtLoudest", { seconds: Math.round(start * 10) / 10 }) : t(L, "startsAtSwell", { seconds: Math.round(start * 10) / 10 })}</span>
            </ui.Row>
          </div>
        ) : cueId === "own" && ownMusic && busy ? <ui.Message tone="muted">{t(L, "readingMusic")}</ui.Message> : null}
        {fit && fit.key ? (
          <ui.Row gap={8} align="center">
            <ui.Message tone="muted">{t(L, "tooShortFor", { length: lengthLabel })}</ui.Message>
            <ui.Button variant="secondary" disabled={busy} onClick={() => setLength(fit.key as any)}>{t(L, "useLength", { length: t(L, "length." + fit.key) })}</ui.Button>
          </ui.Row>
        ) : fit ? <ui.Message tone="error">{t(L, "tooShortNeeds", { seconds: fit.needSeconds })}</ui.Message> : null}
        {silent ? <ui.Message tone="muted">{t(L, "silentVideo")}</ui.Message> : null}
      </ui.Section>
      <ui.Section title={t(L, "advanced")}>
        <ui.Segmented label={t(L, "clipSound")} value={clipSound} onChange={setClipSound} disabled={busy}
          options={(["ambient", "full", "off"] as const).map((v) => ({ label: t(L, "sound." + v), value: v }))} />
        <ui.Toggle label={t(L, "cinematicLook")} value={lookOn} onChange={setLookOn} disabled={busy} />
        <ui.Toggle label={t(L, "usePhotos")} value={usePhotos} onChange={setUsePhotos} disabled={busy} />
        {inventory && (allRids.length || allPhotoRids.length) ? (
          <div role="group" aria-label={t(L, "chooseClips")} style={{ minWidth: 0 }}>
            <ui.Row gap={4} align="center">
              <small style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {t(L, "chooseClipsCount", { selected: selectedRids.length + selectedPhotoRids.length, total: allRids.length + allPhotoRids.length })}
              </small>
              <ui.Button variant="ghost" disabled={busy || (!only && !onlyPhotos)} onClick={() => { chooseClips(allRids); choosePhotos(allPhotoRids); }}>{t(L, "all")}</ui.Button>
              <ui.Button variant="ghost" disabled={busy || selectedRids.length + selectedPhotoRids.length === 0} onClick={() => { chooseClips([]); choosePhotos([]); }}>{t(L, "none")}</ui.Button>
            </ui.Row>
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
      {progress ? <ui.Progress value={progress.value} label={progressLabel} steps={TEC_BUILD_STEPS.map((s: any) => t(L, "step." + s.id))} current={progress.current} />
        : busy ? <ui.Progress label={stepLabel || t(L, "working")} /> : null}
      {status ? <ui.Message tone={status.tone === "error" ? "error" : "muted"}>{status.say(L)}</ui.Message> : null}
      {result && result.decorated ? (
        <ui.Message tone="success">{t(L, "draftCreated")}</ui.Message>
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
      <ui.Actions>
        {result && !result.decorated ? <ui.Button onClick={finishTitle} disabled={busy}>{t(L, "finishTitle")}</ui.Button> : null}
        {result ? <ui.Button onClick={buildAnother} disabled={busy}>{t(L, "anotherVersion")}</ui.Button> : null}
        <ui.Button variant="primary" busy={busy} busyLabel={stepLabel || t(L, "building")} onClick={() => build(seed)} disabled={busy || !canBuild}>{t(L, "build")}</ui.Button>
      </ui.Actions>
    </ui.Stack>
  );
}
