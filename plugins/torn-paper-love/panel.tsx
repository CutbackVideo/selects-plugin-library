// @name Torn Paper Love
// @name:de Torn Paper Love
// @name:en Torn Paper Love
// @name:es Torn Paper Love
// @name:fr Torn Paper Love
// @name:it Torn Paper Love
// @name:ja Torn Paper Love
// @name:ko Torn Paper Love
// @name:pt Torn Paper Love
// @name:tr Torn Paper Love
// @name:zh Torn Paper Love
// @icon sparkles
// @collection visual-highlights
// Builds a 4:3 torn-paper love edit of your photos, cut on the beat, with ransom-note letters, as a new editable Draft.
import React from "react";

const PLUGIN_ID = "torn-paper-love";
const WORD_MAX = 8;

// STRINGS:BEGIN
const STRINGS = {
  en: {
    openProject: "Open a Project to build a Torn Paper Love edit.",
    words: "Words",
    word1: "Word 1",
    word2: "Word 2",
    wordHint: "Up to {max} letters each (wide characters such as Hangul count as 2); the words sit left and right.",
    lettersPreview: "Letters preview: {words}",
    wordsTooLong: "Shorten the words: they don't fit at full size.",
    style: "Style",
    backdrop: "Backdrop",
    "backdrop.night": "Night",
    "backdrop.red": "Red curtain",
    "backdrop.kraft": "Kraft",
    "backdrop.photo": "Photo",
    music: "Music",
    track: "Track",
    ownMusic: "Your own music",
    noMusic: "No music",
    sectionHint: "Music section — drag to choose",
    sectionLabel: "Music section",
    musicTooShort: "This music is too short for this length",
    startsAt: "Starts at {seconds} s",
    stopPreview: "Stop preview",
    cancelPreview: "Cancel preview",
    previewSection: "Preview this section",
    noMusicRhythm: "No music: the cuts keep a steady {seconds} s rhythm.",
    length: "Length",
    "length.short": "Short",
    "length.standard": "Standard",
    "length.long": "Long",
    lengthOption: "{name} {n}",
    pace: "Pace",
    "pace.quick": "Quick",
    "pace.relaxed": "Relaxed",
    refresh: "Refresh",
    refreshing: "Refreshing",
    readFailed: "Could not read the pictures in this Project: {detail}",
    refreshFailed: "Could not refresh the pictures: {detail}",
    checkingPictures: "Checking your pictures",
    checkingPicturesNow: "Checking your pictures…",
    listening: "Listening for the beat",
    listeningNow: "Listening for the beat…",
    dropMusicAbove: "Drop a music file above, or choose one of the tracks.",
    noPictures: "No photos or clips in this Project yet. Add some; this updates automatically.",
    ready: "Ready: {summary}",
    photos: { one: "{count} photo", other: "{count} photos" },
    clips: { one: "{count} clip", other: "{count} clips" },
    shots: { one: "{count} shot", other: "{count} shots" },
    aboutSeconds: "about {seconds} s",
    stillAnalysing: { one: "{count} clip still analysing", other: "{count} clips still analysing" },
    stillImporting: { one: "{count} clip still importing", other: "{count} clips still importing" },
    notAnalysedNote: "Clips Selects hasn't analysed yet are checked quickly on this computer; analysed clips give better picks.",
    notRead: { one: "{count} photo couldn't be read", other: "{count} photos couldn't be read" },
    notReadYet: { one: "{count} photo couldn't be read yet", other: "{count} photos couldn't be read yet" },
    tooShort: { one: "{count} clip is too short", other: "{count} clips are too short" },
    autoUpdate: "{facts}. This updates automatically.",
    "reason.noWords": "Type at least one word.",
    "reason.fewPictures": "Add at least {min} photos or clips.",
    "reason.musicTooShort": "This track needs at least {seconds} s from the section start.",
    fitPictures: { one: "You have {count} picture: {length} uses {n} ({shots} shots, {seconds} s).", other: "You have {count} pictures: {length} uses {n} ({shots} shots, {seconds} s)." },
    fitMusic: "From this start the music fits {n} pictures ({shots} shots, {seconds} s). Move the section earlier for the full {length}.",
    advanced: "Advanced",
    useVideos: "Use videos",
    useVideosOff: "Use videos is off",
    clipSound: "Clip sound",
    "sound.off": "Off",
    "sound.ambient": "Ambient",
    "sound.full": "Full",
    fadedFilm: "Faded film",
    tilt: "Tilt",
    silentVideo: "Silent video: no music and Clip sound is Off.",
    chooseClips: "Choose clips",
    chooseClipsCount: "Choose clips ({selected}/{total})",
    all: "All",
    none: "None",
    photo: "Photo",
    photoNotRead: "Photo · not read",
    "shape.tall": "Tall",
    "shape.wide": "Wide",
    "shape.square": "Square",
    "step.pictures": "Reading your pictures",
    "step.moments": "Finding moments",
    "step.plan": "Planning",
    "step.place": "Placing pictures",
    "step.decorate": "Adding letters and paper",
    progress: "Step {step}/{total} · {name} · {percent}%",
    progressDetail: "Step {step}/{total} · {name} ({detail}) · {percent}%",
    "detail.pictures": { one: "{count} picture", other: "{count} pictures" },
    "detail.clipsChecked": { one: "{done}/{count} clip checked", other: "{done}/{count} clips checked" },
    "detail.checkingClips": { one: "checking {done}/{count} clip", other: "checking {done}/{count} clips" },
    "detail.alreadyFound": "already found",
    "detail.photosOnly": "photos only",
    "detail.addingMusic": "adding the music",
    "detail.openingDraft": "opening the Draft",
    stoppedAt: "Stopped at step {step}/{total}, {name}: {detail}",
    working: "Working",
    build: "Build",
    building: "Building",
    anotherVersion: "Try other shots",
    finishLetters: "Finish letters and look",
    draftCreated: "Draft created. Select the letters to change the words, size or colour; select a picture to adjust its tear, backdrop, Faded film or sound. Building again creates a new Draft and does not keep Inspector edits.",
    draftCreatedAdding: "Draft created; adding letters and paper…",
    openDraft: "Open the new Draft",
    copyLink: "Copy the link to the new Draft",
    note: "Note: {detail}.",
    unchecked: { one: "Could not search {count} clip for moments; a steady part was used. Build again to retry.", other: "Could not search {count} clips for moments; a steady part was used. Build again to retry." },
    anotherVersionHint: "Try other shots: new tears and letters; different photos when you have more than {n}.",
    createsDraft: "Creates a new 4:3 Draft.",
    createsDraftFrom: { one: "Creates a new 4:3 Draft from {n} of your {count} picture.", other: "Creates a new 4:3 Draft from {n} of your {count} pictures." },
    startFailed: "Torn Paper Love could not start: {detail}. Reinstall the plugin if this persists.",
    foldersNotFound: "the plugin folders could not be found",
    adapterNeeded: "This Selects build needs an updated {name} adapter.",
    stepFailed: "Selects could not complete this step.",
    musicFaint: "Music added; its beat is faint, so cuts follow its tempo ({bpm} BPM) without locking to every beat.",
    musicFixedRhythm: "Music added; cuts use a steady {seconds} s rhythm because its beat could not be found reliably.",
    musicFixedRhythmDetail: "Music added; cuts use a steady {seconds} s rhythm ({detail}).",
    musicUnreadable: "Could not read this music file ({detail}). Choose another file or one of the tracks.",
    beatFailed: "beat detection failed",
    previewFailed: "Could not play a preview: {detail}.",
    previewNotCut: "the preview could not be cut",
    noAudio: "no audio came back",
    playbackBlocked: "playback was blocked; press play again",
    dropMusic: "Drop a music file, or choose one of the tracks.",
    picturesChanged: "The pictures changed while planning. Press Build again.",
    severalDrafts: "several new Drafts are named \"{name}\"",
    draftNoId: "The Draft \"{name}\" was saved, but Selects did not report its id. Open it from the Drafts list, or build again.",
    draftNoIdWhy: "The Draft \"{name}\" was saved, but Selects did not report its id ({detail}). Open it from the Drafts list, or build again.",
    finishFailed: "The Draft was created, but its letters and paper could not be added: {detail}. Press Finish letters and look to try again.",
    finishFailedRebuild: "The Draft was created, but its letters and paper could not be added: {detail}. Its clips no longer match the plan, so press Build to make a new Draft.",
    openFailed: "The Draft is ready, but it could not be opened: {detail}. Use the link below or open it from the Drafts list.",
    "param.backdropColor": "Backdrop colour",
    "param.edge": "Edge width",
    "param.inset": "Photo size",
    "param.tearSeed": "Tear seed",
    "param.motion": "Photo motion",
    "param.motionStrength": "Motion strength",
    "param.size": "Size",
    "param.y": "Vertical position",
    "param.accent": "Accent colour",
    "param.letterSeed": "Letter seed",
    "param.restyle": "Re-style",
    "motion.off": "Off",
    "motion.push-in": "Push in",
    "motion.pull-out": "Pull out",
    "motion.drift": "Drift",
  },
  de: {
    openProject: "Öffne ein Projekt, um ein Video im Stil Torn Paper Love zu erstellen.",
    words: "Wörter",
    word1: "Wort 1",
    word2: "Wort 2",
    wordHint: "Bis zu {max} Buchstaben pro Wort (breite Zeichen wie Hangul zählen doppelt); die Wörter stehen links und rechts.",
    lettersPreview: "Buchstabenvorschau: {words}",
    wordsTooLong: "Kürze die Wörter: In voller Größe passen sie nicht.",
    style: "Stil",
    backdrop: "Hintergrund",
    "backdrop.night": "Nacht",
    "backdrop.red": "Roter Vorhang",
    "backdrop.kraft": "Kraftpapier",
    "backdrop.photo": "Foto",
    music: "Musik",
    track: "Musikstück",
    ownMusic: "Eigene Musik",
    noMusic: "Keine Musik",
    sectionHint: "Musikabschnitt – zum Auswählen ziehen",
    sectionLabel: "Musikabschnitt",
    musicTooShort: "Diese Musik ist für diese Länge zu kurz",
    startsAt: "Beginnt bei {seconds} s",
    stopPreview: "Vorschau stoppen",
    cancelPreview: "Vorschau abbrechen",
    previewSection: "Diesen Abschnitt vorhören",
    noMusicRhythm: "Keine Musik: Die Schnitte folgen einem gleichmäßigen Rhythmus von {seconds} s.",
    length: "Länge",
    "length.short": "Kurz",
    "length.standard": "Standard",
    "length.long": "Lang",
    lengthOption: "{name} {n}",
    pace: "Tempo",
    "pace.quick": "Schnell",
    "pace.relaxed": "Ruhig",
    refresh: "Aktualisieren",
    refreshing: "Wird aktualisiert",
    readFailed: "Die Bilder in diesem Projekt konnten nicht gelesen werden: {detail}",
    refreshFailed: "Die Bilder konnten nicht aktualisiert werden: {detail}",
    checkingPictures: "Bilder werden geprüft",
    checkingPicturesNow: "Bilder werden geprüft …",
    listening: "Beat wird gesucht",
    listeningNow: "Beat wird gesucht …",
    dropMusicAbove: "Lege oben eine Musikdatei ab oder wähle eines der Musikstücke.",
    noPictures: "In diesem Projekt gibt es noch keine Fotos oder Clips. F\u00fcge welche hinzu; die Anzeige aktualisiert sich automatisch.",
    ready: "Bereit: {summary}",
    photos: { one: "{count} Foto", other: "{count} Fotos" },
    clips: { one: "{count} Clip", other: "{count} Clips" },
    shots: { one: "{count} Einstellung", other: "{count} Einstellungen" },
    aboutSeconds: "ca. {seconds} s",
    stillAnalysing: { one: "{count} Clip wird noch analysiert", other: "{count} Clips werden noch analysiert" },
    stillImporting: { one: "{count} Clip wird noch importiert", other: "{count} Clips werden noch importiert" },
    notAnalysedNote: "Clips, die Selects noch nicht analysiert hat, werden schnell auf diesem Computer gepr\u00fcft; analysierte Clips ergeben eine bessere Auswahl.",
    notRead: { one: "{count} Foto konnte nicht gelesen werden", other: "{count} Fotos konnten nicht gelesen werden" },
    notReadYet: { one: "{count} Foto konnte noch nicht gelesen werden", other: "{count} Fotos konnten noch nicht gelesen werden" },
    tooShort: { one: "{count} Clip ist zu kurz", other: "{count} Clips sind zu kurz" },
    autoUpdate: "{facts}. Die Anzeige aktualisiert sich automatisch.",
    "reason.noWords": "Gib mindestens ein Wort ein.",
    "reason.fewPictures": "Füge mindestens {min} Fotos oder Clips hinzu.",
    "reason.musicTooShort": "Dieses Musikstück braucht ab dem Abschnittsbeginn mindestens {seconds} s.",
    fitPictures: { one: "Du hast {count} Bild: „{length}“ verwendet {n} ({shots} Einstellungen, {seconds} s).", other: "Du hast {count} Bilder: „{length}“ verwendet {n} ({shots} Einstellungen, {seconds} s)." },
    fitMusic: "Ab diesem Startpunkt reicht die Musik für {n} Bilder ({shots} Einstellungen, {seconds} s). Verschiebe den Abschnitt nach vorn für die volle Länge „{length}“.",
    advanced: "Erweitert",
    useVideos: "Videos verwenden",
    useVideosOff: "„Videos verwenden“ ist aus",
    clipSound: "Clip-Ton",
    "sound.off": "Aus",
    "sound.ambient": "Leise",
    "sound.full": "Voll",
    fadedFilm: "Verblasster Film",
    tilt: "Neigung",
    silentVideo: "Stummes Video: keine Musik und Clip-Ton ist „Aus“.",
    chooseClips: "Clips auswählen",
    chooseClipsCount: "Clips auswählen ({selected}/{total})",
    all: "Alle",
    none: "Keine",
    photo: "Foto",
    photoNotRead: "Foto · nicht gelesen",
    "shape.tall": "Hochformat",
    "shape.wide": "Querformat",
    "shape.square": "Quadrat",
    "step.pictures": "Bilder lesen",
    "step.moments": "Momente finden",
    "step.plan": "Planen",
    "step.place": "Bilder platzieren",
    "step.decorate": "Buchstaben und Papier hinzufügen",
    progress: "Schritt {step}/{total} · {name} · {percent} %",
    progressDetail: "Schritt {step}/{total} · {name} ({detail}) · {percent} %",
    "detail.pictures": { one: "{count} Bild", other: "{count} Bilder" },
    "detail.clipsChecked": { one: "{done}/{count} Clip geprüft", other: "{done}/{count} Clips geprüft" },
    "detail.checkingClips": { one: "{done}/{count} Clip wird gepr\u00fcft", other: "{done}/{count} Clips werden gepr\u00fcft" },
    "detail.alreadyFound": "bereits gefunden",
    "detail.photosOnly": "nur Fotos",
    "detail.addingMusic": "Musik wird hinzugefügt",
    "detail.openingDraft": "Draft wird geöffnet",
    stoppedAt: "Abgebrochen bei Schritt {step}/{total}, {name}: {detail}",
    working: "In Arbeit",
    build: "Erstellen",
    building: "Wird erstellt",
    anotherVersion: "Andere Aufnahmen probieren",
    finishLetters: "Buchstaben und Look fertigstellen",
    draftCreated: "Draft erstellt. Wähle die Buchstaben aus, um Wörter, Größe oder Farbe zu ändern; wähle ein Bild aus, um Riss, Hintergrund, „Verblasster Film“ oder Ton anzupassen. Ein erneutes Erstellen legt einen neuen Draft an und übernimmt keine Änderungen aus dem Inspektor.",
    draftCreatedAdding: "Draft erstellt; Buchstaben und Papier werden hinzugefügt …",
    openDraft: "Neuen Draft öffnen",
    copyLink: "Link zum neuen Draft kopieren",
    note: "Hinweis: {detail}.",
    unchecked: { one: "{count} Clip konnte nicht nach Momenten durchsucht werden; ein ruhiger Abschnitt wurde verwendet. Erstelle erneut, um es noch einmal zu versuchen.", other: "{count} Clips konnten nicht nach Momenten durchsucht werden; jeweils ein ruhiger Abschnitt wurde verwendet. Erstelle erneut, um es noch einmal zu versuchen." },
    anotherVersionHint: "Andere Aufnahmen probieren: neue Risse und Buchstaben; andere Fotos, wenn du mehr als {n} hast.",
    createsDraft: "Erstellt einen neuen 4:3-Draft.",
    createsDraftFrom: { one: "Erstellt einen neuen 4:3-Draft mit {n} von {count} Bild.", other: "Erstellt einen neuen 4:3-Draft mit {n} von {count} Bildern." },
    startFailed: "Torn Paper Love konnte nicht gestartet werden: {detail}. Installiere das Plugin neu, falls das Problem bestehen bleibt.",
    foldersNotFound: "die Plugin-Ordner wurden nicht gefunden",
    adapterNeeded: "Diese Selects-Version braucht einen aktualisierten {name}-Adapter.",
    stepFailed: "Selects konnte diesen Schritt nicht abschließen.",
    musicFaint: "Musik hinzugefügt; der Beat ist schwach, daher folgen die Schnitte dem Tempo ({bpm} BPM), ohne auf jeden Beat zu fallen.",
    musicFixedRhythm: "Musik hinzugefügt; die Schnitte folgen einem gleichmäßigen Rhythmus von {seconds} s, weil der Beat nicht zuverlässig gefunden wurde.",
    musicFixedRhythmDetail: "Musik hinzugefügt; die Schnitte folgen einem gleichmäßigen Rhythmus von {seconds} s ({detail}).",
    musicUnreadable: "Diese Musikdatei konnte nicht gelesen werden ({detail}). Wähle eine andere Datei oder eines der Musikstücke.",
    beatFailed: "Beat-Erkennung fehlgeschlagen",
    previewFailed: "Die Vorschau konnte nicht abgespielt werden: {detail}.",
    previewNotCut: "die Vorschau konnte nicht geschnitten werden",
    noAudio: "es kam kein Audio zurück",
    playbackBlocked: "die Wiedergabe wurde blockiert; drücke erneut auf Play",
    dropMusic: "Lege eine Musikdatei ab oder wähle eines der Musikstücke.",
    picturesChanged: "Die Bilder haben sich während der Planung geändert. Drücke erneut „Erstellen“.",
    severalDrafts: "mehrere neue Drafts heißen „{name}“",
    draftNoId: "Der Draft „{name}“ wurde gespeichert, aber Selects hat seine ID nicht gemeldet. Öffne ihn in der Draft-Liste oder erstelle erneut.",
    draftNoIdWhy: "Der Draft „{name}“ wurde gespeichert, aber Selects hat seine ID nicht gemeldet ({detail}). Öffne ihn in der Draft-Liste oder erstelle erneut.",
    finishFailed: "Der Draft wurde erstellt, aber Buchstaben und Papier konnten nicht hinzugefügt werden: {detail}. Drücke „Buchstaben und Look fertigstellen“, um es erneut zu versuchen.",
    finishFailedRebuild: "Der Draft wurde erstellt, aber Buchstaben und Papier konnten nicht hinzugefügt werden: {detail}. Seine Clips passen nicht mehr zum Plan; drücke daher „Erstellen“, um einen neuen Draft anzulegen.",
    openFailed: "Der Draft ist fertig, konnte aber nicht geöffnet werden: {detail}. Nutze den Link unten oder öffne ihn in der Draft-Liste.",
    "param.backdropColor": "Hintergrundfarbe",
    "param.edge": "Randbreite",
    "param.inset": "Fotogröße",
    "param.tearSeed": "Riss-Variante",
    "param.motion": "Fotobewegung",
    "param.motionStrength": "Bewegungsstärke",
    "param.size": "Größe",
    "param.y": "Vertikale Position",
    "param.accent": "Akzentfarbe",
    "param.letterSeed": "Buchstaben-Variante",
    "param.restyle": "Stilwechsel",
    "motion.off": "Aus",
    "motion.push-in": "Heranzoomen",
    "motion.pull-out": "Herauszoomen",
    "motion.drift": "Gleiten",
  },
  es: {
    openProject: "Abre un proyecto para crear un Torn Paper Love.",
    words: "Palabras",
    word1: "Palabra 1",
    word2: "Palabra 2",
    wordHint: "Hasta {max} letras cada una (los caracteres anchos, como el hangul, cuentan como 2); las palabras van a la izquierda y a la derecha.",
    lettersPreview: "Vista previa de las letras: {words}",
    wordsTooLong: "Acorta las palabras: no caben a tamaño completo.",
    style: "Estilo",
    backdrop: "Fondo",
    "backdrop.night": "Noche",
    "backdrop.red": "Telón rojo",
    "backdrop.kraft": "Kraft",
    "backdrop.photo": "Foto",
    music: "Música",
    track: "Pista",
    ownMusic: "Tu propia música",
    noMusic: "Sin música",
    sectionHint: "Sección de música: arrastra para elegir",
    sectionLabel: "Sección de música",
    musicTooShort: "Esta música es demasiado corta para esta duración",
    startsAt: "Empieza en {seconds} s",
    stopPreview: "Detener la vista previa",
    cancelPreview: "Cancelar la vista previa",
    previewSection: "Escuchar esta sección",
    noMusicRhythm: "Sin música: los cortes mantienen un ritmo constante de {seconds} s.",
    length: "Duración",
    "length.short": "Corta",
    "length.standard": "Estándar",
    "length.long": "Larga",
    lengthOption: "{name} {n}",
    pace: "Cadencia",
    "pace.quick": "Rápida",
    "pace.relaxed": "Tranquila",
    refresh: "Actualizar",
    refreshing: "Actualizando",
    readFailed: "No se pudieron leer las imágenes de este proyecto: {detail}",
    refreshFailed: "No se pudieron actualizar las imágenes: {detail}",
    checkingPictures: "Comprobando tus imágenes",
    checkingPicturesNow: "Comprobando tus imágenes…",
    listening: "Buscando el ritmo",
    listeningNow: "Buscando el ritmo…",
    dropMusicAbove: "Suelta un archivo de música arriba o elige una de las pistas.",
    noPictures: "Este proyecto a\u00fan no tiene fotos ni clips. A\u00f1ade algunos; se actualizar\u00e1 autom\u00e1ticamente.",
    ready: "Listo: {summary}",
    photos: { one: "{count} foto", many: "{count} de fotos", other: "{count} fotos" },
    clips: { one: "{count} clip", many: "{count} de clips", other: "{count} clips" },
    shots: { one: "{count} plano", many: "{count} de planos", other: "{count} planos" },
    aboutSeconds: "unos {seconds} s",
    stillAnalysing: { one: "{count} clip aún se está analizando", many: "{count} de clips aún se están analizando", other: "{count} clips aún se están analizando" },
    stillImporting: { one: "{count} clip a\u00fan se est\u00e1 importando", many: "{count} de clips a\u00fan se est\u00e1n importando", other: "{count} clips a\u00fan se est\u00e1n importando" },
    notAnalysedNote: "Los clips que Selects a\u00fan no ha analizado se revisan r\u00e1pidamente en este ordenador; los clips analizados dan una mejor selecci\u00f3n.",
    notRead: { one: "{count} foto no se pudo leer", many: "{count} de fotos no se pudieron leer", other: "{count} fotos no se pudieron leer" },
    notReadYet: { one: "{count} foto aún no se pudo leer", many: "{count} de fotos aún no se pudieron leer", other: "{count} fotos aún no se pudieron leer" },
    tooShort: { one: "{count} clip es demasiado corto", many: "{count} de clips son demasiado cortos", other: "{count} clips son demasiado cortos" },
    autoUpdate: "{facts}. Se actualizará automáticamente.",
    "reason.noWords": "Escribe al menos una palabra.",
    "reason.fewPictures": "Añade al menos {min} fotos o clips.",
    "reason.musicTooShort": "Esta pista necesita al menos {seconds} s desde el inicio de la sección.",
    fitPictures: { one: "Tienes {count} imagen: «{length}» usa {n} ({shots} planos, {seconds} s).", many: "Tienes {count} de imágenes: «{length}» usa {n} ({shots} planos, {seconds} s).", other: "Tienes {count} imágenes: «{length}» usa {n} ({shots} planos, {seconds} s)." },
    fitMusic: "Desde este inicio, la música da para {n} imágenes ({shots} planos, {seconds} s). Mueve la sección hacia el principio para la duración «{length}» completa.",
    advanced: "Avanzado",
    useVideos: "Usar vídeos",
    useVideosOff: "«Usar vídeos» está desactivado",
    clipSound: "Sonido de los clips",
    "sound.off": "Apagado",
    "sound.ambient": "Ambiente",
    "sound.full": "Completo",
    fadedFilm: "Película desvaída",
    tilt: "Inclinación",
    silentVideo: "Vídeo sin sonido: sin música y con el sonido de los clips en «Apagado».",
    chooseClips: "Elegir clips",
    chooseClipsCount: "Elegir clips ({selected}/{total})",
    all: "Todos",
    none: "Ninguno",
    photo: "Foto",
    photoNotRead: "Foto · sin leer",
    "shape.tall": "Vertical",
    "shape.wide": "Horizontal",
    "shape.square": "Cuadrado",
    "step.pictures": "Leyendo tus imágenes",
    "step.moments": "Buscando momentos",
    "step.plan": "Planificando",
    "step.place": "Colocando las imágenes",
    "step.decorate": "Añadiendo letras y papel",
    progress: "Paso {step}/{total} · {name} · {percent} %",
    progressDetail: "Paso {step}/{total} · {name} ({detail}) · {percent} %",
    "detail.pictures": { one: "{count} imagen", many: "{count} de imágenes", other: "{count} imágenes" },
    "detail.clipsChecked": { one: "{done}/{count} clip comprobado", many: "{done}/{count} de clips comprobados", other: "{done}/{count} clips comprobados" },
    "detail.checkingClips": { one: "revisando {done}/{count} clip", many: "revisando {done}/{count} de clips", other: "revisando {done}/{count} clips" },
    "detail.alreadyFound": "ya encontrados",
    "detail.photosOnly": "solo fotos",
    "detail.addingMusic": "añadiendo la música",
    "detail.openingDraft": "abriendo el Draft",
    stoppedAt: "Se detuvo en el paso {step}/{total}, {name}: {detail}",
    working: "Trabajando",
    build: "Crear",
    building: "Creando",
    anotherVersion: "Probar otros planos",
    finishLetters: "Terminar letras y look",
    draftCreated: "Draft creado. Selecciona las letras para cambiar las palabras, el tamaño o el color; selecciona una imagen para ajustar su rasgado, su fondo, «Película desvaída» o su sonido. Volver a crear genera un Draft nuevo y no conserva los cambios del Inspector.",
    draftCreatedAdding: "Draft creado; añadiendo letras y papel…",
    openDraft: "Abrir el nuevo Draft",
    copyLink: "Copiar el enlace al nuevo Draft",
    note: "Nota: {detail}.",
    unchecked: { one: "No se pudieron buscar momentos en {count} clip; se usó una parte estable. Vuelve a crear para reintentarlo.", many: "No se pudieron buscar momentos en {count} de clips; se usaron partes estables. Vuelve a crear para reintentarlo.", other: "No se pudieron buscar momentos en {count} clips; se usaron partes estables. Vuelve a crear para reintentarlo." },
    anotherVersionHint: "Probar otros planos: nuevos rasgados y letras; fotos distintas si tienes más de {n}.",
    createsDraft: "Crea un nuevo Draft 4:3.",
    createsDraftFrom: { one: "Crea un nuevo Draft 4:3 con {n} de tu {count} imagen.", many: "Crea un nuevo Draft 4:3 con {n} de tus {count} de imágenes.", other: "Crea un nuevo Draft 4:3 con {n} de tus {count} imágenes." },
    startFailed: "Torn Paper Love no pudo iniciarse: {detail}. Reinstala el plugin si el problema continúa.",
    foldersNotFound: "no se encontraron las carpetas del plugin",
    adapterNeeded: "Esta versión de Selects necesita un adaptador {name} actualizado.",
    stepFailed: "Selects no pudo completar este paso.",
    musicFaint: "Música añadida; su ritmo es débil, así que los cortes siguen su tempo ({bpm} BPM) sin ajustarse a cada pulso.",
    musicFixedRhythm: "Música añadida; los cortes usan un ritmo constante de {seconds} s porque no se pudo detectar su ritmo con fiabilidad.",
    musicFixedRhythmDetail: "Música añadida; los cortes usan un ritmo constante de {seconds} s ({detail}).",
    musicUnreadable: "No se pudo leer este archivo de música ({detail}). Elige otro archivo o una de las pistas.",
    beatFailed: "falló la detección del ritmo",
    previewFailed: "No se pudo reproducir la vista previa: {detail}.",
    previewNotCut: "no se pudo recortar la vista previa",
    noAudio: "no se recibió audio",
    playbackBlocked: "se bloqueó la reproducción; vuelve a pulsar reproducir",
    dropMusic: "Suelta un archivo de música o elige una de las pistas.",
    picturesChanged: "Las imágenes cambiaron durante la planificación. Vuelve a pulsar «Crear».",
    severalDrafts: "varios Drafts nuevos se llaman «{name}»",
    draftNoId: "El Draft «{name}» se guardó, pero Selects no informó de su id. Ábrelo desde la lista de Drafts o vuelve a crear.",
    draftNoIdWhy: "El Draft «{name}» se guardó, pero Selects no informó de su id ({detail}). Ábrelo desde la lista de Drafts o vuelve a crear.",
    finishFailed: "El Draft se creó, pero no se pudieron añadir sus letras y el papel: {detail}. Pulsa «Terminar letras y look» para reintentarlo.",
    finishFailedRebuild: "El Draft se creó, pero no se pudieron añadir sus letras y el papel: {detail}. Sus clips ya no coinciden con el plan, así que pulsa «Crear» para hacer un Draft nuevo.",
    openFailed: "El Draft está listo, pero no se pudo abrir: {detail}. Usa el enlace de abajo o ábrelo desde la lista de Drafts.",
    "param.backdropColor": "Color del fondo",
    "param.edge": "Ancho del borde",
    "param.inset": "Tamaño de la foto",
    "param.tearSeed": "Semilla del rasgado",
    "param.motion": "Movimiento de la foto",
    "param.motionStrength": "Intensidad del movimiento",
    "param.size": "Tamaño",
    "param.y": "Posición vertical",
    "param.accent": "Color de acento",
    "param.letterSeed": "Semilla de las letras",
    "param.restyle": "Reestilizar",
    "motion.off": "Apagado",
    "motion.push-in": "Acercar",
    "motion.pull-out": "Alejar",
    "motion.drift": "Deslizar",
  },
  fr: {
    openProject: "Ouvrez un projet pour créer un montage Torn Paper Love.",
    words: "Mots",
    word1: "Mot 1",
    word2: "Mot 2",
    wordHint: "Jusqu'à {max} lettres chacun (les caractères larges comme le hangul comptent pour 2) ; les mots se placent à gauche et à droite.",
    lettersPreview: "Aperçu des lettres : {words}",
    wordsTooLong: "Raccourcissez les mots : ils ne tiennent pas en taille réelle.",
    style: "Style",
    backdrop: "Fond",
    "backdrop.night": "Nuit",
    "backdrop.red": "Rideau rouge",
    "backdrop.kraft": "Kraft",
    "backdrop.photo": "Photo",
    music: "Musique",
    track: "Morceau",
    ownMusic: "Votre propre musique",
    noMusic: "Sans musique",
    sectionHint: "Section musicale : faites glisser pour choisir",
    sectionLabel: "Section musicale",
    musicTooShort: "Cette musique est trop courte pour cette durée",
    startsAt: "Commence à {seconds} s",
    stopPreview: "Arrêter l'aperçu",
    cancelPreview: "Annuler l'aperçu",
    previewSection: "Écouter cette section",
    noMusicRhythm: "Sans musique : les coupes suivent un rythme régulier de {seconds} s.",
    length: "Durée",
    "length.short": "Courte",
    "length.standard": "Standard",
    "length.long": "Longue",
    lengthOption: "{name} {n}",
    pace: "Cadence",
    "pace.quick": "Rapide",
    "pace.relaxed": "Posée",
    refresh: "Actualiser",
    refreshing: "Actualisation",
    readFailed: "Impossible de lire les images de ce projet : {detail}",
    refreshFailed: "Impossible d'actualiser les images : {detail}",
    checkingPictures: "Vérification des images",
    checkingPicturesNow: "Vérification des images…",
    listening: "Recherche du rythme",
    listeningNow: "Recherche du rythme…",
    dropMusicAbove: "Déposez un fichier audio ci-dessus ou choisissez l'un des morceaux.",
    noPictures: "Ce projet ne contient pas encore de photo ni de clip. Ajoutez-en ; l'affichage se met \u00e0 jour automatiquement.",
    ready: "Prêt : {summary}",
    photos: { one: "{count} photo", many: "{count} de photos", other: "{count} photos" },
    clips: { one: "{count} clip", many: "{count} de clips", other: "{count} clips" },
    shots: { one: "{count} plan", many: "{count} de plans", other: "{count} plans" },
    aboutSeconds: "environ {seconds} s",
    stillAnalysing: { one: "{count} clip encore en cours d'analyse", many: "{count} de clips encore en cours d'analyse", other: "{count} clips encore en cours d'analyse" },
    stillImporting: { one: "{count} clip encore en cours d'importation", many: "{count} de clips encore en cours d'importation", other: "{count} clips encore en cours d'importation" },
    notAnalysedNote: "Les clips que Selects n'a pas encore analys\u00e9s sont v\u00e9rifi\u00e9s rapidement sur cet ordinateur ; les clips analys\u00e9s donnent un meilleur choix.",
    notRead: { one: "{count} photo n'a pas pu être lue", many: "{count} de photos n'ont pas pu être lues", other: "{count} photos n'ont pas pu être lues" },
    notReadYet: { one: "{count} photo n'a pas encore pu être lue", many: "{count} de photos n'ont pas encore pu être lues", other: "{count} photos n'ont pas encore pu être lues" },
    tooShort: { one: "{count} clip est trop court", many: "{count} de clips sont trop courts", other: "{count} clips sont trop courts" },
    autoUpdate: "{facts}. L'affichage se met à jour automatiquement.",
    "reason.noWords": "Saisissez au moins un mot.",
    "reason.fewPictures": "Ajoutez au moins {min} photos ou clips.",
    "reason.musicTooShort": "Ce morceau doit durer au moins {seconds} s à partir du début de la section.",
    fitPictures: { one: "Vous avez {count} image : « {length} » en utilise {n} ({shots} plans, {seconds} s).", many: "Vous avez {count} d'images : « {length} » en utilise {n} ({shots} plans, {seconds} s).", other: "Vous avez {count} images : « {length} » en utilise {n} ({shots} plans, {seconds} s)." },
    fitMusic: "À partir de ce début, la musique suffit pour {n} images ({shots} plans, {seconds} s). Déplacez la section plus tôt pour obtenir la durée « {length} » complète.",
    advanced: "Avancé",
    useVideos: "Utiliser les vidéos",
    useVideosOff: "« Utiliser les vidéos » est désactivé",
    clipSound: "Son des clips",
    "sound.off": "Coupé",
    "sound.ambient": "Ambiance",
    "sound.full": "Plein",
    fadedFilm: "Film délavé",
    tilt: "Inclinaison",
    silentVideo: "Vidéo muette : pas de musique et son des clips sur « Coupé ».",
    chooseClips: "Choisir les clips",
    chooseClipsCount: "Choisir les clips ({selected}/{total})",
    all: "Tous",
    none: "Aucun",
    photo: "Photo",
    photoNotRead: "Photo · non lue",
    "shape.tall": "Vertical",
    "shape.wide": "Horizontal",
    "shape.square": "Carré",
    "step.pictures": "Lecture des images",
    "step.moments": "Recherche des moments",
    "step.plan": "Planification",
    "step.place": "Placement des images",
    "step.decorate": "Ajout des lettres et du papier",
    progress: "Étape {step}/{total} · {name} · {percent} %",
    progressDetail: "Étape {step}/{total} · {name} ({detail}) · {percent} %",
    "detail.pictures": { one: "{count} image", many: "{count} d'images", other: "{count} images" },
    "detail.clipsChecked": { one: "{done}/{count} clip vérifié", many: "{done}/{count} clips vérifiés", other: "{done}/{count} clips vérifiés" },
    "detail.checkingClips": { one: "v\u00e9rification de {done}/{count} clip", many: "v\u00e9rification de {done}/{count} clips", other: "v\u00e9rification de {done}/{count} clips" },
    "detail.alreadyFound": "déjà trouvés",
    "detail.photosOnly": "photos uniquement",
    "detail.addingMusic": "ajout de la musique",
    "detail.openingDraft": "ouverture du Draft",
    stoppedAt: "Arrêt à l'étape {step}/{total}, {name} : {detail}",
    working: "En cours",
    build: "Créer",
    building: "Création",
    anotherVersion: "Essayer d'autres plans",
    finishLetters: "Terminer les lettres et le look",
    draftCreated: "Draft créé. Sélectionnez les lettres pour changer les mots, la taille ou la couleur ; sélectionnez une image pour ajuster la déchirure, le fond, « Film délavé » ou le son. Une nouvelle création produit un nouveau Draft et ne conserve pas les modifications de l'Inspecteur.",
    draftCreatedAdding: "Draft créé ; ajout des lettres et du papier…",
    openDraft: "Ouvrir le nouveau Draft",
    copyLink: "Copier le lien vers le nouveau Draft",
    note: "Remarque : {detail}.",
    unchecked: { one: "Impossible de rechercher des moments dans {count} clip ; une partie stable a été utilisée. Relancez la création pour réessayer.", many: "Impossible de rechercher des moments dans {count} de clips ; une partie stable a été utilisée. Relancez la création pour réessayer.", other: "Impossible de rechercher des moments dans {count} clips ; une partie stable a été utilisée. Relancez la création pour réessayer." },
    anotherVersionHint: "Essayer d'autres plans : nouvelles déchirures et lettres ; d'autres photos si vous en avez plus de {n}.",
    createsDraft: "Crée un nouveau Draft 4:3.",
    createsDraftFrom: { one: "Crée un nouveau Draft 4:3 avec {n} de vos {count} image.", many: "Crée un nouveau Draft 4:3 avec {n} de vos {count} d'images.", other: "Crée un nouveau Draft 4:3 avec {n} de vos {count} images." },
    startFailed: "Torn Paper Love n'a pas pu démarrer : {detail}. Réinstallez le plugin si le problème persiste.",
    foldersNotFound: "les dossiers du plugin sont introuvables",
    adapterNeeded: "Cette version de Selects nécessite un adaptateur {name} à jour.",
    stepFailed: "Selects n'a pas pu terminer cette étape.",
    musicFaint: "Musique ajoutée ; son rythme est peu marqué, les coupes suivent donc son tempo ({bpm} BPM) sans se caler sur chaque temps.",
    musicFixedRhythm: "Musique ajoutée ; les coupes suivent un rythme régulier de {seconds} s, car son rythme n'a pas pu être détecté de façon fiable.",
    musicFixedRhythmDetail: "Musique ajoutée ; les coupes suivent un rythme régulier de {seconds} s ({detail}).",
    musicUnreadable: "Impossible de lire ce fichier audio ({detail}). Choisissez un autre fichier ou l'un des morceaux.",
    beatFailed: "la détection du rythme a échoué",
    previewFailed: "Impossible de lire l'aperçu : {detail}.",
    previewNotCut: "l'aperçu n'a pas pu être découpé",
    noAudio: "aucun son n'a été renvoyé",
    playbackBlocked: "la lecture a été bloquée ; appuyez de nouveau sur lecture",
    dropMusic: "Déposez un fichier audio ou choisissez l'un des morceaux.",
    picturesChanged: "Les images ont changé pendant la planification. Appuyez de nouveau sur « Créer ».",
    severalDrafts: "plusieurs nouveaux Drafts s'appellent « {name} »",
    draftNoId: "Le Draft « {name} » a été enregistré, mais Selects n'a pas communiqué son identifiant. Ouvrez-le depuis la liste des Drafts ou relancez la création.",
    draftNoIdWhy: "Le Draft « {name} » a été enregistré, mais Selects n'a pas communiqué son identifiant ({detail}). Ouvrez-le depuis la liste des Drafts ou relancez la création.",
    finishFailed: "Le Draft a été créé, mais ses lettres et son papier n'ont pas pu être ajoutés : {detail}. Appuyez sur « Terminer les lettres et le look » pour réessayer.",
    finishFailedRebuild: "Le Draft a été créé, mais ses lettres et son papier n'ont pas pu être ajoutés : {detail}. Ses clips ne correspondent plus au plan ; appuyez donc sur « Créer » pour produire un nouveau Draft.",
    openFailed: "Le Draft est prêt, mais n'a pas pu être ouvert : {detail}. Utilisez le lien ci-dessous ou ouvrez-le depuis la liste des Drafts.",
    "param.backdropColor": "Couleur du fond",
    "param.edge": "Largeur du bord",
    "param.inset": "Taille de la photo",
    "param.tearSeed": "Variante de déchirure",
    "param.motion": "Mouvement de la photo",
    "param.motionStrength": "Intensité du mouvement",
    "param.size": "Taille",
    "param.y": "Position verticale",
    "param.accent": "Couleur d'accent",
    "param.letterSeed": "Variante des lettres",
    "param.restyle": "Changement de style",
    "motion.off": "Aucun",
    "motion.push-in": "Zoom avant",
    "motion.pull-out": "Zoom arrière",
    "motion.drift": "Glissement",
  },
  it: {
    openProject: "Apri un progetto per creare un montaggio Torn Paper Love.",
    words: "Parole",
    word1: "Parola 1",
    word2: "Parola 2",
    wordHint: "Fino a {max} lettere ciascuna (i caratteri larghi come l'hangul contano 2); le parole stanno a sinistra e a destra.",
    lettersPreview: "Anteprima delle lettere: {words}",
    wordsTooLong: "Accorcia le parole: a grandezza piena non ci stanno.",
    style: "Stile",
    backdrop: "Sfondo",
    "backdrop.night": "Notte",
    "backdrop.red": "Sipario rosso",
    "backdrop.kraft": "Kraft",
    "backdrop.photo": "Foto",
    music: "Musica",
    track: "Brano",
    ownMusic: "La tua musica",
    noMusic: "Nessuna musica",
    sectionHint: "Sezione musicale: trascina per scegliere",
    sectionLabel: "Sezione musicale",
    musicTooShort: "Questa musica è troppo corta per questa durata",
    startsAt: "Inizia a {seconds} s",
    stopPreview: "Ferma l'anteprima",
    cancelPreview: "Annulla l'anteprima",
    previewSection: "Ascolta questa sezione",
    noMusicRhythm: "Nessuna musica: i tagli seguono un ritmo regolare di {seconds} s.",
    length: "Durata",
    "length.short": "Breve",
    "length.standard": "Standard",
    "length.long": "Lunga",
    lengthOption: "{name} {n}",
    pace: "Ritmo",
    "pace.quick": "Veloce",
    "pace.relaxed": "Calmo",
    refresh: "Aggiorna",
    refreshing: "Aggiornamento",
    readFailed: "Impossibile leggere le immagini di questo progetto: {detail}",
    refreshFailed: "Impossibile aggiornare le immagini: {detail}",
    checkingPictures: "Controllo delle immagini",
    checkingPicturesNow: "Controllo delle immagini…",
    listening: "Ricerca del ritmo",
    listeningNow: "Ricerca del ritmo…",
    dropMusicAbove: "Trascina un file musicale qui sopra o scegli uno dei brani.",
    noPictures: "In questo progetto non ci sono ancora foto n\u00e9 clip. Aggiungine qualcuna; si aggiorna automaticamente.",
    ready: "Pronto: {summary}",
    photos: { one: "{count} foto", many: "{count} di foto", other: "{count} foto" },
    clips: { one: "{count} clip", many: "{count} di clip", other: "{count} clip" },
    shots: { one: "{count} inquadratura", many: "{count} di inquadrature", other: "{count} inquadrature" },
    aboutSeconds: "circa {seconds} s",
    stillAnalysing: { one: "{count} clip ancora in analisi", many: "{count} di clip ancora in analisi", other: "{count} clip ancora in analisi" },
    stillImporting: { one: "{count} clip ancora in importazione", many: "{count} di clip ancora in importazione", other: "{count} clip ancora in importazione" },
    notAnalysedNote: "Le clip che Selects non ha ancora analizzato vengono controllate rapidamente su questo computer; le clip analizzate danno scelte migliori.",
    notRead: { one: "{count} foto non leggibile", many: "{count} di foto non leggibili", other: "{count} foto non leggibili" },
    notReadYet: { one: "{count} foto non ancora leggibile", many: "{count} di foto non ancora leggibili", other: "{count} foto non ancora leggibili" },
    tooShort: { one: "{count} clip è troppo corta", many: "{count} di clip sono troppo corte", other: "{count} clip sono troppo corte" },
    autoUpdate: "{facts}. Si aggiorna automaticamente.",
    "reason.noWords": "Scrivi almeno una parola.",
    "reason.fewPictures": "Aggiungi almeno {min} foto o clip.",
    "reason.musicTooShort": "Questo brano deve durare almeno {seconds} s dall'inizio della sezione.",
    fitPictures: { one: "Hai {count} immagine: «{length}» ne usa {n} ({shots} inquadrature, {seconds} s).", many: "Hai {count} di immagini: «{length}» ne usa {n} ({shots} inquadrature, {seconds} s).", other: "Hai {count} immagini: «{length}» ne usa {n} ({shots} inquadrature, {seconds} s)." },
    fitMusic: "Da questo punto la musica basta per {n} immagini ({shots} inquadrature, {seconds} s). Sposta la sezione più indietro per la durata «{length}» completa.",
    advanced: "Avanzate",
    useVideos: "Usa video",
    useVideosOff: "«Usa video» è disattivato",
    clipSound: "Audio delle clip",
    "sound.off": "Spento",
    "sound.ambient": "Ambiente",
    "sound.full": "Pieno",
    fadedFilm: "Pellicola sbiadita",
    tilt: "Inclinazione",
    silentVideo: "Video senza audio: nessuna musica e audio delle clip su «Spento».",
    chooseClips: "Scegli le clip",
    chooseClipsCount: "Scegli le clip ({selected}/{total})",
    all: "Tutte",
    none: "Nessuna",
    photo: "Foto",
    photoNotRead: "Foto · non letta",
    "shape.tall": "Verticale",
    "shape.wide": "Orizzontale",
    "shape.square": "Quadrato",
    "step.pictures": "Lettura delle immagini",
    "step.moments": "Ricerca dei momenti",
    "step.plan": "Pianificazione",
    "step.place": "Posizionamento delle immagini",
    "step.decorate": "Aggiunta di lettere e carta",
    progress: "Passaggio {step}/{total} · {name} · {percent}%",
    progressDetail: "Passaggio {step}/{total} · {name} ({detail}) · {percent}%",
    "detail.pictures": { one: "{count} immagine", many: "{count} di immagini", other: "{count} immagini" },
    "detail.clipsChecked": { one: "{done}/{count} clip controllata", many: "{done}/{count} clip controllate", other: "{done}/{count} clip controllate" },
    "detail.checkingClips": { one: "controllo di {done}/{count} clip", many: "controllo di {done}/{count} clip", other: "controllo di {done}/{count} clip" },
    "detail.alreadyFound": "già trovati",
    "detail.photosOnly": "solo foto",
    "detail.addingMusic": "aggiunta della musica",
    "detail.openingDraft": "apertura del Draft",
    stoppedAt: "Interrotto al passaggio {step}/{total}, {name}: {detail}",
    working: "In corso",
    build: "Crea",
    building: "Creazione",
    anotherVersion: "Prova altre inquadrature",
    finishLetters: "Completa lettere e look",
    draftCreated: "Draft creato. Seleziona le lettere per cambiare parole, dimensione o colore; seleziona un'immagine per regolarne strappo, sfondo, «Pellicola sbiadita» o audio. Creando di nuovo si ottiene un nuovo Draft e le modifiche fatte nell'Inspector non vengono mantenute.",
    draftCreatedAdding: "Draft creato; aggiunta di lettere e carta…",
    openDraft: "Apri il nuovo Draft",
    copyLink: "Copia il link al nuovo Draft",
    note: "Nota: {detail}.",
    unchecked: { one: "Non è stato possibile cercare momenti in {count} clip; è stata usata una parte stabile. Crea di nuovo per riprovare.", many: "Non è stato possibile cercare momenti in {count} di clip; è stata usata una parte stabile. Crea di nuovo per riprovare.", other: "Non è stato possibile cercare momenti in {count} clip; è stata usata una parte stabile. Crea di nuovo per riprovare." },
    anotherVersionHint: "Prova altre inquadrature: nuovi strappi e lettere; foto diverse se ne hai più di {n}.",
    createsDraft: "Crea un nuovo Draft 4:3.",
    createsDraftFrom: { one: "Crea un nuovo Draft 4:3 con {n} della tua {count} immagine.", many: "Crea un nuovo Draft 4:3 con {n} delle tue {count} di immagini.", other: "Crea un nuovo Draft 4:3 con {n} delle tue {count} immagini." },
    startFailed: "Impossibile avviare Torn Paper Love: {detail}. Reinstalla il plugin se il problema persiste.",
    foldersNotFound: "le cartelle del plugin non sono state trovate",
    adapterNeeded: "Questa versione di Selects richiede un adattatore {name} aggiornato.",
    stepFailed: "Selects non è riuscito a completare questo passaggio.",
    musicFaint: "Musica aggiunta; il ritmo è debole, quindi i tagli seguono il tempo ({bpm} BPM) senza agganciarsi a ogni battuta.",
    musicFixedRhythm: "Musica aggiunta; i tagli seguono un ritmo regolare di {seconds} s perché il suo ritmo non è stato rilevato in modo affidabile.",
    musicFixedRhythmDetail: "Musica aggiunta; i tagli seguono un ritmo regolare di {seconds} s ({detail}).",
    musicUnreadable: "Impossibile leggere questo file musicale ({detail}). Scegli un altro file o uno dei brani.",
    beatFailed: "rilevamento del ritmo non riuscito",
    previewFailed: "Impossibile riprodurre l'anteprima: {detail}.",
    previewNotCut: "non è stato possibile ritagliare l'anteprima",
    noAudio: "non è stato restituito alcun audio",
    playbackBlocked: "la riproduzione è stata bloccata; premi di nuovo play",
    dropMusic: "Trascina qui un file musicale o scegli uno dei brani.",
    picturesChanged: "Le immagini sono cambiate durante la pianificazione. Premi di nuovo «Crea».",
    severalDrafts: "diversi nuovi Draft si chiamano «{name}»",
    draftNoId: "Il Draft «{name}» è stato salvato, ma Selects non ne ha comunicato l'id. Aprilo dall'elenco dei Draft o crea di nuovo.",
    draftNoIdWhy: "Il Draft «{name}» è stato salvato, ma Selects non ne ha comunicato l'id ({detail}). Aprilo dall'elenco dei Draft o crea di nuovo.",
    finishFailed: "Il Draft è stato creato, ma non è stato possibile aggiungere lettere e carta: {detail}. Premi «Completa lettere e look» per riprovare.",
    finishFailedRebuild: "Il Draft è stato creato, ma non è stato possibile aggiungere lettere e carta: {detail}. Le sue clip non corrispondono più al piano, quindi premi «Crea» per creare un nuovo Draft.",
    openFailed: "Il Draft è pronto, ma non è stato possibile aprirlo: {detail}. Usa il link qui sotto o aprilo dall'elenco dei Draft.",
    "param.backdropColor": "Colore dello sfondo",
    "param.edge": "Larghezza del bordo",
    "param.inset": "Dimensione della foto",
    "param.tearSeed": "Variante dello strappo",
    "param.motion": "Movimento della foto",
    "param.motionStrength": "Intensità del movimento",
    "param.size": "Dimensione",
    "param.y": "Posizione verticale",
    "param.accent": "Colore d'accento",
    "param.letterSeed": "Variante delle lettere",
    "param.restyle": "Cambio di stile",
    "motion.off": "Nessuno",
    "motion.push-in": "Zoom avanti",
    "motion.pull-out": "Zoom indietro",
    "motion.drift": "Scorrimento",
  },
  ja: {
    openProject: "Torn Paper Love を作成するには、プロジェクトを開いてください。",
    words: "言葉",
    word1: "言葉 1",
    word2: "言葉 2",
    wordHint: "それぞれ {max} 文字まで（かなや漢字などの全角文字は 2 文字として数えます）。言葉は左右に配置されます。",
    lettersPreview: "文字のプレビュー: {words}",
    wordsTooLong: "言葉を短くしてください。フルサイズでは収まりません。",
    style: "スタイル",
    backdrop: "背景",
    "backdrop.night": "夜",
    "backdrop.red": "赤いカーテン",
    "backdrop.kraft": "クラフト紙",
    "backdrop.photo": "写真",
    music: "音楽",
    track: "トラック",
    ownMusic: "自分の音楽",
    noMusic: "音楽なし",
    sectionHint: "音楽の区間 — ドラッグして選択",
    sectionLabel: "音楽の区間",
    musicTooShort: "この音楽は、この長さには短すぎます",
    startsAt: "{seconds} 秒から開始",
    stopPreview: "プレビューを停止",
    cancelPreview: "プレビューをキャンセル",
    previewSection: "この区間をプレビュー",
    noMusicRhythm: "音楽なし: カットは {seconds} 秒の一定のリズムで切り替わります。",
    length: "長さ",
    "length.short": "短め",
    "length.standard": "標準",
    "length.long": "長め",
    lengthOption: "{name} {n}",
    pace: "ペース",
    "pace.quick": "速め",
    "pace.relaxed": "ゆったり",
    refresh: "更新",
    refreshing: "更新中",
    readFailed: "このプロジェクトの素材を読み込めませんでした: {detail}",
    refreshFailed: "素材を更新できませんでした: {detail}",
    checkingPictures: "素材を確認中",
    checkingPicturesNow: "素材を確認中…",
    listening: "ビートを検出中",
    listeningNow: "ビートを検出中…",
    dropMusicAbove: "上に音楽ファイルをドロップするか、用意されたトラックを選んでください。",
    noPictures: "\u3053\u306e\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u306b\u306f\u3001\u307e\u3060\u5199\u771f\u3082\u30af\u30ea\u30c3\u30d7\u3082\u3042\u308a\u307e\u305b\u3093\u3002\u8ffd\u52a0\u3059\u308b\u3068\u81ea\u52d5\u3067\u66f4\u65b0\u3055\u308c\u307e\u3059\u3002",
    ready: "準備完了: {summary}",
    photos: { other: "写真 {count} 枚" },
    clips: { other: "クリップ {count} 本" },
    shots: { other: "{count} ショット" },
    aboutSeconds: "約 {seconds} 秒",
    stillAnalysing: { other: "解析中のクリップ {count} 本" },
    stillImporting: { other: "\u8aad\u307f\u8fbc\u307f\u4e2d\u306e\u30af\u30ea\u30c3\u30d7 {count} \u672c" },
    notAnalysedNote: "Selects \u304c\u307e\u3060\u89e3\u6790\u3057\u3066\u3044\u306a\u3044\u30af\u30ea\u30c3\u30d7\u306f\u3001\u3053\u306e\u30b3\u30f3\u30d4\u30e5\u30fc\u30bf\u3067\u624b\u65e9\u304f\u78ba\u8a8d\u3057\u307e\u3059\u3002\u89e3\u6790\u6e08\u307f\u306e\u30af\u30ea\u30c3\u30d7\u306e\u307b\u3046\u304c\u826f\u3044\u5834\u9762\u3092\u9078\u3079\u307e\u3059\u3002",
    notRead: { other: "読み込めない写真 {count} 枚" },
    notReadYet: { other: "まだ読み込めていない写真 {count} 枚" },
    tooShort: { other: "短すぎるクリップ {count} 本" },
    autoUpdate: "{facts}。自動で更新されます。",
    "reason.noWords": "言葉を 1 つ以上入力してください。",
    "reason.fewPictures": "写真かクリップを {min} 点以上追加してください。",
    "reason.musicTooShort": "このトラックは、区間の開始から少なくとも {seconds} 秒必要です。",
    fitPictures: { other: "素材は {count} 点です。「{length}」では {n} 点を使います（{shots} ショット、{seconds} 秒）。" },
    fitMusic: "この開始位置からだと、音楽に収まる素材は {n} 点です（{shots} ショット、{seconds} 秒）。「{length}」の長さにするには、区間を前に動かしてください。",
    advanced: "詳細設定",
    useVideos: "動画を使う",
    useVideosOff: "「動画を使う」がオフです",
    clipSound: "クリップの音",
    "sound.off": "オフ",
    "sound.ambient": "環境音",
    "sound.full": "フル",
    fadedFilm: "色あせフィルム",
    tilt: "傾き",
    silentVideo: "無音の動画: 音楽なしで、クリップの音が「オフ」です。",
    chooseClips: "クリップを選択",
    chooseClipsCount: "クリップを選択（{selected}/{total}）",
    all: "すべて",
    none: "なし",
    photo: "写真",
    photoNotRead: "写真 · 読み込めません",
    "shape.tall": "縦長",
    "shape.wide": "横長",
    "shape.square": "正方形",
    "step.pictures": "素材を読み込み",
    "step.moments": "見どころを検出",
    "step.plan": "構成を計画",
    "step.place": "素材を配置",
    "step.decorate": "文字と紙を追加",
    progress: "ステップ {step}/{total} · {name} · {percent}%",
    progressDetail: "ステップ {step}/{total} · {name}（{detail}）· {percent}%",
    "detail.pictures": { other: "素材 {count} 点" },
    "detail.clipsChecked": { other: "{done}/{count} 本のクリップを確認済み" },
    "detail.checkingClips": { other: "{done}/{count} \u672c\u306e\u30af\u30ea\u30c3\u30d7\u3092\u78ba\u8a8d\u4e2d" },
    "detail.alreadyFound": "検出済み",
    "detail.photosOnly": "写真のみ",
    "detail.addingMusic": "音楽を追加中",
    "detail.openingDraft": "Draft を開いています",
    stoppedAt: "ステップ {step}/{total}（{name}）で停止しました: {detail}",
    working: "処理中",
    build: "作成",
    building: "作成中",
    anotherVersion: "別のショットで作成",
    finishLetters: "文字とルックを仕上げる",
    draftCreated: "Draft を作成しました。文字を選択すると言葉・サイズ・色を、素材を選択すると破れ目・背景・「色あせフィルム」・音を調整できます。もう一度作成すると新しい Draft になり、インスペクタでの編集は引き継がれません。",
    draftCreatedAdding: "Draft を作成しました。文字と紙を追加中…",
    openDraft: "新しい Draft を開く",
    copyLink: "新しい Draft へのリンクをコピー",
    note: "メモ: {detail}。",
    unchecked: { other: "{count} 本のクリップで見どころを探せなかったため、安定した部分を使いました。もう一度作成すると再試行します。" },
    anotherVersionHint: "別のショットで作成: 破れ目と文字が新しくなり、写真が {n} 枚より多い場合は別の写真を使います。",
    createsDraft: "新しい 4:3 の Draft を作成します。",
    createsDraftFrom: { other: "素材 {count} 点のうち {n} 点から、新しい 4:3 の Draft を作成します。" },
    startFailed: "Torn Paper Love を開始できませんでした: {detail}。解決しない場合はプラグインを再インストールしてください。",
    foldersNotFound: "プラグインのフォルダが見つかりませんでした",
    adapterNeeded: "この Selects のビルドには、更新された {name} アダプターが必要です。",
    stepFailed: "Selects はこのステップを完了できませんでした。",
    musicFaint: "音楽を追加しました。ビートが弱いため、カットはテンポ（{bpm} BPM）に合わせますが、すべてのビートには合わせません。",
    musicFixedRhythm: "音楽を追加しました。ビートを確実に検出できなかったため、カットは {seconds} 秒の一定のリズムを使います。",
    musicFixedRhythmDetail: "音楽を追加しました。カットは {seconds} 秒の一定のリズムを使います（{detail}）。",
    musicUnreadable: "この音楽ファイルを読み込めませんでした（{detail}）。別のファイルか、用意されたトラックを選んでください。",
    beatFailed: "ビートの検出に失敗しました",
    previewFailed: "プレビューを再生できませんでした: {detail}。",
    previewNotCut: "プレビューを切り出せませんでした",
    noAudio: "音声が返されませんでした",
    playbackBlocked: "再生がブロックされたため、もう一度再生を押してください",
    dropMusic: "音楽ファイルをドロップするか、用意されたトラックを選んでください。",
    picturesChanged: "構成中に素材が変わりました。もう一度「作成」を押してください。",
    severalDrafts: "「{name}」という名前の新しい Draft が複数あります",
    draftNoId: "Draft「{name}」は保存されましたが、Selects から ID が返されませんでした。Draft 一覧から開くか、もう一度作成してください。",
    draftNoIdWhy: "Draft「{name}」は保存されましたが、Selects から ID が返されませんでした（{detail}）。Draft 一覧から開くか、もう一度作成してください。",
    finishFailed: "Draft は作成されましたが、文字と紙を追加できませんでした: {detail}。「文字とルックを仕上げる」を押して再試行してください。",
    finishFailedRebuild: "Draft は作成されましたが、文字と紙を追加できませんでした: {detail}。クリップが構成と一致しなくなったため、「作成」を押して新しい Draft を作成してください。",
    openFailed: "Draft の準備はできましたが、開けませんでした: {detail}。下のリンクを使うか、Draft 一覧から開いてください。",
    "param.backdropColor": "背景の色",
    "param.edge": "縁の幅",
    "param.inset": "写真のサイズ",
    "param.tearSeed": "破れ目のシード",
    "param.motion": "写真のモーション",
    "param.motionStrength": "モーションの強さ",
    "param.size": "サイズ",
    "param.y": "縦位置",
    "param.accent": "アクセントカラー",
    "param.letterSeed": "文字のシード",
    "param.restyle": "スタイル切り替え",
    "motion.off": "オフ",
    "motion.push-in": "ズームイン",
    "motion.pull-out": "ズームアウト",
    "motion.drift": "スライド",
  },
  ko: {
    openProject: "Torn Paper Love\ub97c \ub9cc\ub4e4\ub824\uba74 \ud504\ub85c\uc81d\ud2b8\ub97c \uc5ec\uc138\uc694.",
    words: "\ub2e8\uc5b4",
    word1: "\ub2e8\uc5b4 1",
    word2: "\ub2e8\uc5b4 2",
    wordHint: "\ub2e8\uc5b4\ub9c8\ub2e4 \ucd5c\ub300 {max}\uc790\uae4c\uc9c0 \uc4f8 \uc218 \uc788\uc2b5\ub2c8\ub2e4(\ud55c\uae00 \ud55c \uae00\uc790\ub294 2\uc790\ub85c \uc149\ub2c8\ub2e4). \ub450 \ub2e8\uc5b4\ub294 \uc67c\ucabd\uacfc \uc624\ub978\ucabd\uc5d0 \ub193\uc785\ub2c8\ub2e4.",
    lettersPreview: "\uae00\uc790 \ubbf8\ub9ac\ubcf4\uae30: {words}",
    wordsTooLong: "\ub2e8\uc5b4\ub97c \uc904\uc774\uc138\uc694. \uc6d0\ub798 \ud06c\uae30\ub85c\ub294 \ub4e4\uc5b4\uac00\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.",
    style: "\uc2a4\ud0c0\uc77c",
    backdrop: "\ubc30\uacbd",
    "backdrop.night": "\ubc24",
    "backdrop.red": "\ube68\uac04 \ucee4\ud2bc",
    "backdrop.kraft": "\ud06c\ub77c\ud504\ud2b8",
    "backdrop.photo": "\uc0ac\uc9c4",
    music: "\uc74c\uc545",
    track: "\ud2b8\ub799",
    ownMusic: "\ub0b4 \uc74c\uc545",
    noMusic: "\uc74c\uc545 \uc5c6\uc74c",
    sectionHint: "\uc74c\uc545 \uad6c\uac04 — \ub4dc\ub798\uadf8\ud574\uc11c \uc120\ud0dd",
    sectionLabel: "\uc74c\uc545 \uad6c\uac04",
    musicTooShort: "\uc774 \uae38\uc774\ub85c \ub9cc\ub4e4\uae30\uc5d0\ub294 \uc74c\uc545\uc774 \ub108\ubb34 \uc9e7\uc2b5\ub2c8\ub2e4",
    startsAt: "{seconds}\ucd08\ubd80\ud130 \uc2dc\uc791",
    stopPreview: "\ubbf8\ub9ac\ub4e3\uae30 \uc911\uc9c0",
    cancelPreview: "\ubbf8\ub9ac\ub4e3\uae30 \ucde8\uc18c",
    previewSection: "\uc774 \uad6c\uac04 \ubbf8\ub9ac\ub4e3\uae30",
    noMusicRhythm: "\uc74c\uc545 \uc5c6\uc74c: \ucef7\uc740 {seconds}\ucd08 \uac04\uaca9\uc758 \uc77c\uc815\ud55c \ub9ac\ub4ec\uc744 \uc720\uc9c0\ud569\ub2c8\ub2e4.",
    length: "\uae38\uc774",
    "length.short": "\uc9e7\uac8c",
    "length.standard": "\ubcf4\ud1b5",
    "length.long": "\uae38\uac8c",
    lengthOption: "{name} {n}",
    pace: "\uc18d\ub3c4",
    "pace.quick": "\ube60\ub974\uac8c",
    "pace.relaxed": "\ub290\uae0b\ud558\uac8c",
    refresh: "\uc0c8\ub85c\uace0\uce68",
    refreshing: "\uc0c8\ub85c\uace0\uce68 \uc911",
    readFailed: "\uc774 \ud504\ub85c\uc81d\ud2b8\uc758 \uc0ac\uc9c4\uc744 \uc77d\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}",
    refreshFailed: "\uc0ac\uc9c4\uc744 \uc0c8\ub85c\uace0\uce68\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}",
    checkingPictures: "\uc0ac\uc9c4 \ud655\uc778 \uc911",
    checkingPicturesNow: "\uc0ac\uc9c4 \ud655\uc778 \uc911…",
    listening: "\ube44\ud2b8 \ucc3e\ub294 \uc911",
    listeningNow: "\ube44\ud2b8 \ucc3e\ub294 \uc911…",
    dropMusicAbove: "\uc704\uc5d0 \uc74c\uc545 \ud30c\uc77c\uc744 \ub04c\uc5b4\ub2e4 \ub193\uac70\ub098 \uc81c\uacf5\ub41c \ud2b8\ub799\uc744 \uc120\ud0dd\ud558\uc138\uc694.",
    noPictures: "\uc774 \ud504\ub85c\uc81d\ud2b8\uc5d0\ub294 \uc544\uc9c1 \uc0ac\uc9c4\uc774\ub098 \ud074\ub9bd\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. \ucd94\uac00\ud558\uba74 \uc790\ub3d9\uc73c\ub85c \uc5c5\ub370\uc774\ud2b8\ub429\ub2c8\ub2e4.",
    ready: "\uc900\ube44 \uc644\ub8cc: {summary}",
    photos: { other: "\uc0ac\uc9c4 {count}\uc7a5" },
    clips: { other: "\ud074\ub9bd {count}\uac1c" },
    shots: { other: "\uc0f7 {count}\uac1c" },
    aboutSeconds: "\uc57d {seconds}\ucd08",
    stillAnalysing: { other: "\uc544\uc9c1 \ubd84\uc11d \uc911\uc778 \ud074\ub9bd {count}\uac1c" },
    stillImporting: { other: "\uc544\uc9c1 \uac00\uc838\uc624\ub294 \uc911\uc778 \ud074\ub9bd {count}\uac1c" },
    notAnalysedNote: "Selects\uac00 \uc544\uc9c1 \ubd84\uc11d\ud558\uc9c0 \uc54a\uc740 \ud074\ub9bd\uc740 \uc774 \ucef4\ud4e8\ud130\uc5d0\uc11c \ube60\ub974\uac8c \ud655\uc778\ud569\ub2c8\ub2e4. \ubd84\uc11d\ub41c \ud074\ub9bd\uc774 \ub354 \uc88b\uc740 \uc7a5\uba74\uc744 \uace0\ub985\ub2c8\ub2e4.",
    notRead: { other: "\uc77d\uc9c0 \ubabb\ud55c \uc0ac\uc9c4 {count}\uc7a5" },
    notReadYet: { other: "\uc544\uc9c1 \uc77d\uc9c0 \ubabb\ud55c \uc0ac\uc9c4 {count}\uc7a5" },
    tooShort: { other: "\ub108\ubb34 \uc9e7\uc740 \ud074\ub9bd {count}\uac1c" },
    autoUpdate: "{facts}. \uc790\ub3d9\uc73c\ub85c \uc5c5\ub370\uc774\ud2b8\ub429\ub2c8\ub2e4.",
    "reason.noWords": "\ub2e8\uc5b4\ub97c \ud558\ub098 \uc774\uc0c1 \uc785\ub825\ud558\uc138\uc694.",
    "reason.fewPictures": "\uc0ac\uc9c4\uc774\ub098 \ud074\ub9bd\uc744 {min}\uac1c \uc774\uc0c1 \ucd94\uac00\ud558\uc138\uc694.",
    "reason.musicTooShort": "\uc774 \ud2b8\ub799\uc740 \uad6c\uac04 \uc2dc\uc791\ubd80\ud130 \ucd5c\uc18c {seconds}\ucd08\uac00 \ud544\uc694\ud569\ub2c8\ub2e4.",
    fitPictures: { other: "\uc0ac\uc9c4\uc774 {count}\uc7a5 \uc788\uc2b5\ub2c8\ub2e4. ‘{length}’\uc5d0\ub294 {n}\uc7a5\uc744 \uc0ac\uc6a9\ud569\ub2c8\ub2e4(\uc0f7 {shots}\uac1c, {seconds}\ucd08)." },
    fitMusic: "\uc774 \uc2dc\uc791 \uc9c0\uc810\ubd80\ud130\ub294 \uc74c\uc545\uc5d0 \uc0ac\uc9c4 {n}\uc7a5\uc774 \ub4e4\uc5b4\uac11\ub2c8\ub2e4(\uc0f7 {shots}\uac1c, {seconds}\ucd08). ‘{length}’ \uae38\uc774\ub97c \ubaa8\ub450 \ucc44\uc6b0\ub824\uba74 \uad6c\uac04\uc744 \uc55e\ucabd\uc73c\ub85c \uc62e\uae30\uc138\uc694.",
    advanced: "\uace0\uae09",
    useVideos: "\uc601\uc0c1 \uc0ac\uc6a9",
    useVideosOff: "‘\uc601\uc0c1 \uc0ac\uc6a9’\uc774 \uaebc\uc838 \uc788\uc74c",
    clipSound: "\ud074\ub9bd \uc18c\ub9ac",
    "sound.off": "\ub054",
    "sound.ambient": "\ubc30\uacbd\uc74c",
    "sound.full": "\uc6d0\uc74c",
    fadedFilm: "\ubc14\ub79c \ud544\ub984",
    tilt: "\uae30\uc6b8\uae30",
    silentVideo: "\ubb34\uc74c \uc601\uc0c1: \uc74c\uc545\uc774 \uc5c6\uace0 \ud074\ub9bd \uc18c\ub9ac\uac00 ‘\ub054’\uc785\ub2c8\ub2e4.",
    chooseClips: "\ud074\ub9bd \uc120\ud0dd",
    chooseClipsCount: "\ud074\ub9bd \uc120\ud0dd ({selected}/{total})",
    all: "\uc804\uccb4",
    none: "\uc5c6\uc74c",
    photo: "\uc0ac\uc9c4",
    photoNotRead: "\uc0ac\uc9c4 · \uc77d\uc9c0 \ubabb\ud568",
    "shape.tall": "\uc138\ub85c",
    "shape.wide": "\uac00\ub85c",
    "shape.square": "\uc815\uc0ac\uac01\ud615",
    "step.pictures": "\uc0ac\uc9c4 \uc77d\uae30",
    "step.moments": "\uc88b\uc740 \uc21c\uac04 \ucc3e\uae30",
    "step.plan": "\uad6c\uc131 \uacc4\ud68d",
    "step.place": "\uc0ac\uc9c4 \ubc30\uce58",
    "step.decorate": "\uae00\uc790\uc640 \uc885\uc774 \ucd94\uac00",
    progress: "{step}/{total}\ub2e8\uacc4 · {name} · {percent}%",
    progressDetail: "{step}/{total}\ub2e8\uacc4 · {name} ({detail}) · {percent}%",
    "detail.pictures": { other: "\uc0ac\uc9c4 {count}\uc7a5" },
    "detail.clipsChecked": { other: "\ud074\ub9bd {done}/{count}\uac1c \ud655\uc778" },
    "detail.checkingClips": { other: "\ud074\ub9bd {done}/{count}\uac1c \ud655\uc778 \uc911" },
    "detail.alreadyFound": "\uc774\ubbf8 \ucc3e\uc74c",
    "detail.photosOnly": "\uc0ac\uc9c4\ub9cc",
    "detail.addingMusic": "\uc74c\uc545 \ucd94\uac00 \uc911",
    "detail.openingDraft": "Draft \uc5ec\ub294 \uc911",
    stoppedAt: "{step}/{total}\ub2e8\uacc4({name})\uc5d0\uc11c \uc911\ub2e8\ub418\uc5c8\uc2b5\ub2c8\ub2e4: {detail}",
    working: "\uc791\uc5c5 \uc911",
    build: "\ub9cc\ub4e4\uae30",
    building: "\ub9cc\ub4dc\ub294 \uc911",
    anotherVersion: "\ub2e4\ub978 \uc0f7\uc73c\ub85c \ub9cc\ub4e4\uae30",
    finishLetters: "\uae00\uc790\uc640 \uc0c9\uac10 \ub9c8\ubb34\ub9ac",
    draftCreated: "Draft\ub97c \ub9cc\ub4e4\uc5c8\uc2b5\ub2c8\ub2e4. \uae00\uc790\ub97c \uc120\ud0dd\ud558\uba74 \ub2e8\uc5b4·\ud06c\uae30·\uc0c9\uc744, \uc0ac\uc9c4\uc744 \uc120\ud0dd\ud558\uba74 \ucc22\uae34 \uc790\uad6d·\ubc30\uacbd·‘\ubc14\ub79c \ud544\ub984’·\uc18c\ub9ac\ub97c \ubc14\uafc0 \uc218 \uc788\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \ub9cc\ub4e4\uba74 \uc0c8 Draft\uac00 \uc0dd\uae30\uba70 \uc778\uc2a4\ud399\ud130\uc5d0\uc11c \uc218\uc815\ud55c \ub0b4\uc6a9\uc740 \uc720\uc9c0\ub418\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.",
    draftCreatedAdding: "Draft\ub97c \ub9cc\ub4e4\uc5c8\uc2b5\ub2c8\ub2e4. \uae00\uc790\uc640 \uc885\uc774\ub97c \ucd94\uac00\ud558\ub294 \uc911…",
    openDraft: "\uc0c8 Draft \uc5f4\uae30",
    copyLink: "\uc0c8 Draft \ub9c1\ud06c \ubcf5\uc0ac",
    note: "\ucc38\uace0: {detail}.",
    unchecked: { other: "\ud074\ub9bd {count}\uac1c\uc5d0\uc11c \uc88b\uc740 \uc21c\uac04\uc744 \ucc3e\uc9c0 \ubabb\ud574 \uc548\uc815\uc801\uc778 \uad6c\uac04\uc744 \uc0ac\uc6a9\ud588\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \ub9cc\ub4e4\uba74 \uc7ac\uc2dc\ub3c4\ud569\ub2c8\ub2e4." },
    anotherVersionHint: "\ub2e4\ub978 \uc0f7\uc73c\ub85c \ub9cc\ub4e4\uae30: \ucc22\uae34 \uc790\uad6d\uacfc \uae00\uc790\uac00 \uc0c8\ub85c \ubc14\ub00c\uace0, \uc0ac\uc9c4\uc774 {n}\uc7a5\ubcf4\ub2e4 \ub9ce\uc73c\uba74 \ub2e4\ub978 \uc0ac\uc9c4\uc744 \uc501\ub2c8\ub2e4.",
    createsDraft: "\uc0c8 4:3 Draft\ub97c \ub9cc\ub4ed\ub2c8\ub2e4.",
    createsDraftFrom: { other: "\uc0ac\uc9c4 {count}\uc7a5 \uc911 {n}\uc7a5\uc73c\ub85c \uc0c8 4:3 Draft\ub97c \ub9cc\ub4ed\ub2c8\ub2e4." },
    startFailed: "Torn Paper Love\ub97c \uc2dc\uc791\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}. \ubb38\uc81c\uac00 \uacc4\uc18d\ub418\uba74 \ud50c\ub7ec\uadf8\uc778\uc744 \ub2e4\uc2dc \uc124\uce58\ud558\uc138\uc694.",
    foldersNotFound: "\ud50c\ub7ec\uadf8\uc778 \ud3f4\ub354\ub97c \ucc3e\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4",
    adapterNeeded: "\uc774 Selects \ube4c\ub4dc\uc5d0\ub294 \uc5c5\ub370\uc774\ud2b8\ub41c {name} \uc5b4\ub311\ud130\uac00 \ud544\uc694\ud569\ub2c8\ub2e4.",
    stepFailed: "Selects\uac00 \uc774 \ub2e8\uacc4\ub97c \uc644\ub8cc\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.",
    musicFaint: "\uc74c\uc545\uc744 \ucd94\uac00\ud588\uc2b5\ub2c8\ub2e4. \ube44\ud2b8\uac00 \uc57d\ud574\uc11c \ucef7\uc740 \ud15c\ud3ec({bpm} BPM)\ub97c \ub530\ub974\ub418 \ubaa8\ub4e0 \ube44\ud2b8\uc5d0 \ub9de\ucd94\uc9c0\ub294 \uc54a\uc2b5\ub2c8\ub2e4.",
    musicFixedRhythm: "\uc74c\uc545\uc744 \ucd94\uac00\ud588\uc2b5\ub2c8\ub2e4. \ube44\ud2b8\ub97c \ud655\uc2e4\ud558\uac8c \ucc3e\uc9c0 \ubabb\ud574 \ucef7\uc740 {seconds}\ucd08 \uac04\uaca9\uc758 \uc77c\uc815\ud55c \ub9ac\ub4ec\uc744 \uc0ac\uc6a9\ud569\ub2c8\ub2e4.",
    musicFixedRhythmDetail: "\uc74c\uc545\uc744 \ucd94\uac00\ud588\uc2b5\ub2c8\ub2e4. \ucef7\uc740 {seconds}\ucd08 \uac04\uaca9\uc758 \uc77c\uc815\ud55c \ub9ac\ub4ec\uc744 \uc0ac\uc6a9\ud569\ub2c8\ub2e4({detail}).",
    musicUnreadable: "\uc774 \uc74c\uc545 \ud30c\uc77c\uc744 \uc77d\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4({detail}). \ub2e4\ub978 \ud30c\uc77c\uc774\ub098 \uc81c\uacf5\ub41c \ud2b8\ub799\uc744 \uc120\ud0dd\ud558\uc138\uc694.",
    beatFailed: "\ube44\ud2b8 \uac10\uc9c0\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4",
    previewFailed: "\ubbf8\ub9ac\ub4e3\uae30\ub97c \uc7ac\uc0dd\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}.",
    previewNotCut: "\ubbf8\ub9ac\ub4e3\uae30 \uad6c\uac04\uc744 \uc798\ub77c\ub0b4\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4",
    noAudio: "\uc624\ub514\uc624\uac00 \ub3cc\uc544\uc624\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4",
    playbackBlocked: "\uc7ac\uc0dd\uc774 \ucc28\ub2e8\ub418\uc5c8\uc73c\ub2c8 \uc7ac\uc0dd\uc744 \ub2e4\uc2dc \ub204\ub974\uc138\uc694",
    dropMusic: "\uc74c\uc545 \ud30c\uc77c\uc744 \ub04c\uc5b4\ub2e4 \ub193\uac70\ub098 \uc81c\uacf5\ub41c \ud2b8\ub799\uc744 \uc120\ud0dd\ud558\uc138\uc694.",
    picturesChanged: "\uad6c\uc131\ud558\ub294 \ub3d9\uc548 \uc0ac\uc9c4\uc774 \ubc14\ub00c\uc5c8\uc2b5\ub2c8\ub2e4. ‘\ub9cc\ub4e4\uae30’\ub97c \ub2e4\uc2dc \ub204\ub974\uc138\uc694.",
    severalDrafts: "\uc774\ub984\uc774 “{name}”\uc778 \uc0c8 Draft\uac00 \uc5ec\ub7ec \uac1c \uc788\uc2b5\ub2c8\ub2e4",
    draftNoId: "Draft “{name}”\uc740(\ub294) \uc800\uc7a5\ub418\uc5c8\uc9c0\ub9cc Selects\uac00 ID\ub97c \uc54c\ub824\uc8fc\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4. Draft \ubaa9\ub85d\uc5d0\uc11c \uc5f4\uac70\ub098 \ub2e4\uc2dc \ub9cc\ub4dc\uc138\uc694.",
    draftNoIdWhy: "Draft “{name}”\uc740(\ub294) \uc800\uc7a5\ub418\uc5c8\uc9c0\ub9cc Selects\uac00 ID\ub97c \uc54c\ub824\uc8fc\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4({detail}). Draft \ubaa9\ub85d\uc5d0\uc11c \uc5f4\uac70\ub098 \ub2e4\uc2dc \ub9cc\ub4dc\uc138\uc694.",
    finishFailed: "Draft\ub294 \ub9cc\ub4e4\uc5c8\uc9c0\ub9cc \uae00\uc790\uc640 \uc885\uc774\ub97c \ucd94\uac00\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}. ‘\uae00\uc790\uc640 \uc0c9\uac10 \ub9c8\ubb34\ub9ac’\ub97c \ub20c\ub7ec \ub2e4\uc2dc \uc2dc\ub3c4\ud558\uc138\uc694.",
    finishFailedRebuild: "Draft\ub294 \ub9cc\ub4e4\uc5c8\uc9c0\ub9cc \uae00\uc790\uc640 \uc885\uc774\ub97c \ucd94\uac00\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}. \ud074\ub9bd\uc774 \ub354 \uc774\uc0c1 \uad6c\uc131\uacfc \ub9de\uc9c0 \uc54a\uc73c\ub2c8 ‘\ub9cc\ub4e4\uae30’\ub97c \ub20c\ub7ec \uc0c8 Draft\ub97c \ub9cc\ub4dc\uc138\uc694.",
    openFailed: "Draft\ub294 \uc900\ube44\ub418\uc5c8\uc9c0\ub9cc \uc5f4\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}. \uc544\ub798 \ub9c1\ud06c\ub97c \uc4f0\uac70\ub098 Draft \ubaa9\ub85d\uc5d0\uc11c \uc5ec\uc138\uc694.",
    "param.backdropColor": "\ubc30\uacbd \uc0c9",
    "param.edge": "\ud14c\ub450\ub9ac \ub450\uaed8",
    "param.inset": "\uc0ac\uc9c4 \ud06c\uae30",
    "param.tearSeed": "\ucc22\uae40 \uc2dc\ub4dc",
    "param.motion": "\uc0ac\uc9c4 \ubaa8\uc158",
    "param.motionStrength": "\ubaa8\uc158 \uac15\ub3c4",
    "param.size": "\ud06c\uae30",
    "param.y": "\uc138\ub85c \uc704\uce58",
    "param.accent": "\ud3ec\uc778\ud2b8 \uc0c9",
    "param.letterSeed": "\uae00\uc790 \uc2dc\ub4dc",
    "param.restyle": "\uc2a4\ud0c0\uc77c \ubc14\uafb8\uae30",
    "motion.off": "\ub054",
    "motion.push-in": "\uc90c \uc778",
    "motion.pull-out": "\uc90c \uc544\uc6c3",
    "motion.drift": "\uc774\ub3d9",
  },
  pt: {
    openProject: "Abra um projeto para criar um Torn Paper Love.",
    words: "Palavras",
    word1: "Palavra 1",
    word2: "Palavra 2",
    wordHint: "Até {max} letras cada (caracteres largos, como o hangul, contam como 2); as palavras ficam à esquerda e à direita.",
    lettersPreview: "Prévia das letras: {words}",
    wordsTooLong: "Encurte as palavras: elas não cabem no tamanho máximo.",
    style: "Estilo",
    backdrop: "Fundo",
    "backdrop.night": "Noite",
    "backdrop.red": "Cortina vermelha",
    "backdrop.kraft": "Kraft",
    "backdrop.photo": "Foto",
    music: "Música",
    track: "Faixa",
    ownMusic: "Sua própria música",
    noMusic: "Sem música",
    sectionHint: "Trecho da música: arraste para escolher",
    sectionLabel: "Trecho da música",
    musicTooShort: "Esta música é curta demais para esta duração",
    startsAt: "Começa em {seconds} s",
    stopPreview: "Parar a prévia",
    cancelPreview: "Cancelar a prévia",
    previewSection: "Ouvir este trecho",
    noMusicRhythm: "Sem música: os cortes mantêm um ritmo constante de {seconds} s.",
    length: "Duração",
    "length.short": "Curta",
    "length.standard": "Padrão",
    "length.long": "Longa",
    lengthOption: "{name} {n}",
    pace: "Ritmo",
    "pace.quick": "Rápido",
    "pace.relaxed": "Tranquilo",
    refresh: "Atualizar",
    refreshing: "Atualizando",
    readFailed: "Não foi possível ler as imagens deste projeto: {detail}",
    refreshFailed: "Não foi possível atualizar as imagens: {detail}",
    checkingPictures: "Verificando suas imagens",
    checkingPicturesNow: "Verificando suas imagens…",
    listening: "Procurando a batida",
    listeningNow: "Procurando a batida…",
    dropMusicAbove: "Solte um arquivo de música acima ou escolha uma das faixas.",
    noPictures: "Este projeto ainda n\u00e3o tem fotos nem clipes. Adicione alguns; a lista \u00e9 atualizada automaticamente.",
    ready: "Pronto: {summary}",
    photos: { one: "{count} foto", many: "{count} de fotos", other: "{count} fotos" },
    clips: { one: "{count} clipe", many: "{count} de clipes", other: "{count} clipes" },
    shots: { one: "{count} plano", many: "{count} de planos", other: "{count} planos" },
    aboutSeconds: "cerca de {seconds} s",
    stillAnalysing: { one: "{count} clipe ainda em análise", many: "{count} de clipes ainda em análise", other: "{count} clipes ainda em análise" },
    stillImporting: { one: "{count} clipe ainda em importa\u00e7\u00e3o", many: "{count} de clipes ainda em importa\u00e7\u00e3o", other: "{count} clipes ainda em importa\u00e7\u00e3o" },
    notAnalysedNote: "Os clipes que o Selects ainda n\u00e3o analisou s\u00e3o verificados rapidamente neste computador; clipes analisados d\u00e3o escolhas melhores.",
    notRead: { one: "{count} foto não pôde ser lida", many: "{count} de fotos não puderam ser lidas", other: "{count} fotos não puderam ser lidas" },
    notReadYet: { one: "{count} foto ainda não pôde ser lida", many: "{count} de fotos ainda não puderam ser lidas", other: "{count} fotos ainda não puderam ser lidas" },
    tooShort: { one: "{count} clipe é curto demais", many: "{count} de clipes são curtos demais", other: "{count} clipes são curtos demais" },
    autoUpdate: "{facts}. Isso é atualizado automaticamente.",
    "reason.noWords": "Digite pelo menos uma palavra.",
    "reason.fewPictures": "Adicione pelo menos {min} fotos ou clipes.",
    "reason.musicTooShort": "Esta faixa precisa de pelo menos {seconds} s a partir do início do trecho.",
    fitPictures: { one: "Você tem {count} imagem: “{length}” usa {n} ({shots} planos, {seconds} s).", many: "Você tem {count} de imagens: “{length}” usa {n} ({shots} planos, {seconds} s).", other: "Você tem {count} imagens: “{length}” usa {n} ({shots} planos, {seconds} s)." },
    fitMusic: "A partir deste início, a música rende {n} imagens ({shots} planos, {seconds} s). Mova o trecho para mais cedo para ter a duração “{length}” completa.",
    advanced: "Avançado",
    useVideos: "Usar vídeos",
    useVideosOff: "“Usar vídeos” está desativado",
    clipSound: "Som dos clipes",
    "sound.off": "Desligado",
    "sound.ambient": "Ambiente",
    "sound.full": "Total",
    fadedFilm: "Filme desbotado",
    tilt: "Inclinação",
    silentVideo: "Vídeo sem som: sem música e com o som dos clipes em “Desligado”.",
    chooseClips: "Escolher clipes",
    chooseClipsCount: "Escolher clipes ({selected}/{total})",
    all: "Todos",
    none: "Nenhum",
    photo: "Foto",
    photoNotRead: "Foto · não lida",
    "shape.tall": "Vertical",
    "shape.wide": "Horizontal",
    "shape.square": "Quadrado",
    "step.pictures": "Lendo suas imagens",
    "step.moments": "Procurando momentos",
    "step.plan": "Planejando",
    "step.place": "Posicionando as imagens",
    "step.decorate": "Adicionando letras e papel",
    progress: "Etapa {step}/{total} · {name} · {percent}%",
    progressDetail: "Etapa {step}/{total} · {name} ({detail}) · {percent}%",
    "detail.pictures": { one: "{count} imagem", many: "{count} de imagens", other: "{count} imagens" },
    "detail.clipsChecked": { one: "{done}/{count} clipe verificado", many: "{done}/{count} de clipes verificados", other: "{done}/{count} clipes verificados" },
    "detail.checkingClips": { one: "verificando {done}/{count} clipe", many: "verificando {done}/{count} de clipes", other: "verificando {done}/{count} clipes" },
    "detail.alreadyFound": "já encontrados",
    "detail.photosOnly": "só fotos",
    "detail.addingMusic": "adicionando a música",
    "detail.openingDraft": "abrindo o Draft",
    stoppedAt: "Parou na etapa {step}/{total}, {name}: {detail}",
    working: "Trabalhando",
    build: "Criar",
    building: "Criando",
    anotherVersion: "Testar outros planos",
    finishLetters: "Concluir letras e look",
    draftCreated: "Draft criado. Selecione as letras para mudar as palavras, o tamanho ou a cor; selecione uma imagem para ajustar o rasgo, o fundo, o “Filme desbotado” ou o som. Criar de novo gera um novo Draft e não mantém as edições feitas no Inspetor.",
    draftCreatedAdding: "Draft criado; adicionando letras e papel…",
    openDraft: "Abrir o novo Draft",
    copyLink: "Copiar o link do novo Draft",
    note: "Observação: {detail}.",
    unchecked: { one: "Não foi possível procurar momentos em {count} clipe; foi usado um trecho estável. Crie de novo para tentar outra vez.", many: "Não foi possível procurar momentos em {count} de clipes; foram usados trechos estáveis. Crie de novo para tentar outra vez.", other: "Não foi possível procurar momentos em {count} clipes; foram usados trechos estáveis. Crie de novo para tentar outra vez." },
    anotherVersionHint: "Testar outros planos: novos rasgos e letras; fotos diferentes quando você tiver mais de {n}.",
    createsDraft: "Cria um novo Draft 4:3.",
    createsDraftFrom: { one: "Cria um novo Draft 4:3 com {n} da sua {count} imagem.", many: "Cria um novo Draft 4:3 com {n} das suas {count} de imagens.", other: "Cria um novo Draft 4:3 com {n} das suas {count} imagens." },
    startFailed: "Não foi possível iniciar o Torn Paper Love: {detail}. Reinstale o plugin se o problema continuar.",
    foldersNotFound: "as pastas do plugin não foram encontradas",
    adapterNeeded: "Esta versão do Selects precisa de um adaptador {name} atualizado.",
    stepFailed: "O Selects não conseguiu concluir esta etapa.",
    musicFaint: "Música adicionada; a batida é fraca, então os cortes seguem o andamento ({bpm} BPM) sem se prender a cada batida.",
    musicFixedRhythm: "Música adicionada; os cortes usam um ritmo constante de {seconds} s porque a batida não pôde ser detectada com segurança.",
    musicFixedRhythmDetail: "Música adicionada; os cortes usam um ritmo constante de {seconds} s ({detail}).",
    musicUnreadable: "Não foi possível ler este arquivo de música ({detail}). Escolha outro arquivo ou uma das faixas.",
    beatFailed: "a detecção da batida falhou",
    previewFailed: "Não foi possível reproduzir a prévia: {detail}.",
    previewNotCut: "não foi possível recortar a prévia",
    noAudio: "nenhum áudio foi retornado",
    playbackBlocked: "a reprodução foi bloqueada; pressione reproduzir de novo",
    dropMusic: "Solte um arquivo de música ou escolha uma das faixas.",
    picturesChanged: "As imagens mudaram durante o planejamento. Pressione “Criar” de novo.",
    severalDrafts: "vários Drafts novos se chamam “{name}”",
    draftNoId: "O Draft “{name}” foi salvo, mas o Selects não informou o id dele. Abra-o pela lista de Drafts ou crie de novo.",
    draftNoIdWhy: "O Draft “{name}” foi salvo, mas o Selects não informou o id dele ({detail}). Abra-o pela lista de Drafts ou crie de novo.",
    finishFailed: "O Draft foi criado, mas as letras e o papel não puderam ser adicionados: {detail}. Pressione “Concluir letras e look” para tentar de novo.",
    finishFailedRebuild: "O Draft foi criado, mas as letras e o papel não puderam ser adicionados: {detail}. Os clipes dele não correspondem mais ao plano, então pressione “Criar” para fazer um novo Draft.",
    openFailed: "O Draft está pronto, mas não pôde ser aberto: {detail}. Use o link abaixo ou abra-o pela lista de Drafts.",
    "param.backdropColor": "Cor do fundo",
    "param.edge": "Largura da borda",
    "param.inset": "Tamanho da foto",
    "param.tearSeed": "Semente do rasgo",
    "param.motion": "Movimento da foto",
    "param.motionStrength": "Intensidade do movimento",
    "param.size": "Tamanho",
    "param.y": "Posição vertical",
    "param.accent": "Cor de destaque",
    "param.letterSeed": "Semente das letras",
    "param.restyle": "Reestilizar",
    "motion.off": "Desligado",
    "motion.push-in": "Aproximar",
    "motion.pull-out": "Afastar",
    "motion.drift": "Deslizar",
  },
  tr: {
    openProject: "Torn Paper Love oluşturmak için bir proje açın.",
    words: "Kelimeler",
    word1: "Kelime 1",
    word2: "Kelime 2",
    wordHint: "Her biri en fazla {max} harf (Hangul gibi geniş karakterler 2 sayılır); kelimeler solda ve sağda durur.",
    lettersPreview: "Harf önizlemesi: {words}",
    wordsTooLong: "Kelimeleri kısaltın: tam boyutta sığmıyorlar.",
    style: "Stil",
    backdrop: "Arka plan",
    "backdrop.night": "Gece",
    "backdrop.red": "Kırmızı perde",
    "backdrop.kraft": "Kraft",
    "backdrop.photo": "Fotoğraf",
    music: "Müzik",
    track: "Parça",
    ownMusic: "Kendi müziğiniz",
    noMusic: "Müzik yok",
    sectionHint: "Müzik bölümü — seçmek için sürükleyin",
    sectionLabel: "Müzik bölümü",
    musicTooShort: "Bu müzik bu uzunluk için çok kısa",
    startsAt: "{seconds} sn'de başlar",
    stopPreview: "Önizlemeyi durdur",
    cancelPreview: "Önizlemeyi iptal et",
    previewSection: "Bu bölümü önizle",
    noMusicRhythm: "Müzik yok: kesmeler {seconds} sn'lik sabit bir ritmi korur.",
    length: "Uzunluk",
    "length.short": "Kısa",
    "length.standard": "Standart",
    "length.long": "Uzun",
    lengthOption: "{name} {n}",
    pace: "Hız",
    "pace.quick": "Hızlı",
    "pace.relaxed": "Sakin",
    refresh: "Yenile",
    refreshing: "Yenileniyor",
    readFailed: "Bu projedeki görseller okunamadı: {detail}",
    refreshFailed: "Görseller yenilenemedi: {detail}",
    checkingPictures: "Görselleriniz kontrol ediliyor",
    checkingPicturesNow: "Görselleriniz kontrol ediliyor…",
    listening: "Ritim aranıyor",
    listeningNow: "Ritim aranıyor…",
    dropMusicAbove: "Yukarıya bir müzik dosyası bırakın veya hazır parçalardan birini seçin.",
    noPictures: "Bu projede hen\u00fcz foto\u011fraf veya klip yok. Biraz ekleyin; buras\u0131 otomatik olarak g\u00fcncellenir.",
    ready: "Hazır: {summary}",
    photos: { one: "{count} fotoğraf", other: "{count} fotoğraf" },
    clips: { one: "{count} klip", other: "{count} klip" },
    shots: { one: "{count} çekim", other: "{count} çekim" },
    aboutSeconds: "yaklaşık {seconds} sn",
    stillAnalysing: { one: "{count} klip hâlâ analiz ediliyor", other: "{count} klip hâlâ analiz ediliyor" },
    stillImporting: { one: "{count} klip h\u00e2l\u00e2 i\u00e7e aktar\u0131l\u0131yor", other: "{count} klip h\u00e2l\u00e2 i\u00e7e aktar\u0131l\u0131yor" },
    notAnalysedNote: "Selects'in hen\u00fcz analiz etmedi\u011fi klipler bu bilgisayarda h\u0131zl\u0131ca kontrol edilir; analiz edilmi\u015f klipler daha iyi se\u00e7im sa\u011flar.",
    notRead: { one: "{count} fotoğraf okunamadı", other: "{count} fotoğraf okunamadı" },
    notReadYet: { one: "{count} fotoğraf henüz okunamadı", other: "{count} fotoğraf henüz okunamadı" },
    tooShort: { one: "{count} klip çok kısa", other: "{count} klip çok kısa" },
    autoUpdate: "{facts}. Burası otomatik olarak güncellenir.",
    "reason.noWords": "En az bir kelime yazın.",
    "reason.fewPictures": "En az {min} fotoğraf veya klip ekleyin.",
    "reason.musicTooShort": "Bu parça, bölüm başlangıcından itibaren en az {seconds} sn gerektiriyor.",
    fitPictures: { one: "{count} görseliniz var: “{length}” için {n} görsel kullanılır ({shots} çekim, {seconds} sn).", other: "{count} görseliniz var: “{length}” için {n} görsel kullanılır ({shots} çekim, {seconds} sn)." },
    fitMusic: "Bu başlangıçtan itibaren müzik {n} görsele yetiyor ({shots} çekim, {seconds} sn). Tam “{length}” uzunluğu için bölümü daha öne alın.",
    advanced: "Gelişmiş",
    useVideos: "Videoları kullan",
    useVideosOff: "“Videoları kullan” kapalı",
    clipSound: "Klip sesi",
    "sound.off": "Kapalı",
    "sound.ambient": "Ortam",
    "sound.full": "Tam",
    fadedFilm: "Soluk film",
    tilt: "Eğim",
    silentVideo: "Sessiz video: müzik yok ve klip sesi “Kapalı”.",
    chooseClips: "Klip seç",
    chooseClipsCount: "Klip seç ({selected}/{total})",
    all: "Tümü",
    none: "Hiçbiri",
    photo: "Fotoğraf",
    photoNotRead: "Fotoğraf · okunamadı",
    "shape.tall": "Dikey",
    "shape.wide": "Yatay",
    "shape.square": "Kare",
    "step.pictures": "Görseller okunuyor",
    "step.moments": "Anlar aranıyor",
    "step.plan": "Planlanıyor",
    "step.place": "Görseller yerleştiriliyor",
    "step.decorate": "Harfler ve kâğıt ekleniyor",
    progress: "Adım {step}/{total} · {name} · %{percent}",
    progressDetail: "Adım {step}/{total} · {name} ({detail}) · %{percent}",
    "detail.pictures": { one: "{count} görsel", other: "{count} görsel" },
    "detail.clipsChecked": { one: "{done}/{count} klip kontrol edildi", other: "{done}/{count} klip kontrol edildi" },
    "detail.checkingClips": { one: "{done}/{count} klip kontrol ediliyor", other: "{done}/{count} klip kontrol ediliyor" },
    "detail.alreadyFound": "zaten bulundu",
    "detail.photosOnly": "yalnızca fotoğraflar",
    "detail.addingMusic": "müzik ekleniyor",
    "detail.openingDraft": "Draft açılıyor",
    stoppedAt: "{step}/{total}. adımda durdu, {name}: {detail}",
    working: "Çalışıyor",
    build: "Oluştur",
    building: "Oluşturuluyor",
    anotherVersion: "Başka çekimler dene",
    finishLetters: "Harfleri ve görünümü tamamla",
    draftCreated: "Draft oluşturuldu. Kelimeleri, boyutu veya rengi değiştirmek için harfleri; yırtığını, arka planını, “Soluk film” ayarını veya sesini düzenlemek için bir görseli seçin. Yeniden oluşturmak yeni bir Draft üretir ve Denetçi'de yapılan düzenlemeleri korumaz.",
    draftCreatedAdding: "Draft oluşturuldu; harfler ve kâğıt ekleniyor…",
    openDraft: "Yeni Draft'ı aç",
    copyLink: "Yeni Draft'ın bağlantısını kopyala",
    note: "Not: {detail}.",
    unchecked: { one: "{count} klipte an aranamadı; sabit bir bölüm kullanıldı. Yeniden denemek için tekrar oluşturun.", other: "{count} klipte an aranamadı; sabit bölümler kullanıldı. Yeniden denemek için tekrar oluşturun." },
    anotherVersionHint: "Başka çekimler dene: yeni yırtıklar ve harfler; {n} taneden fazla fotoğrafınız varsa farklı fotoğraflar.",
    createsDraft: "Yeni bir 4:3 Draft oluşturur.",
    createsDraftFrom: { one: "{count} görselinizden {n} tanesiyle yeni bir 4:3 Draft oluşturur.", other: "{count} görselinizden {n} tanesiyle yeni bir 4:3 Draft oluşturur." },
    startFailed: "Torn Paper Love başlatılamadı: {detail}. Sorun sürerse eklentiyi yeniden yükleyin.",
    foldersNotFound: "eklenti klasörleri bulunamadı",
    adapterNeeded: "Bu Selects sürümü güncel bir {name} bağdaştırıcısı gerektiriyor.",
    stepFailed: "Selects bu adımı tamamlayamadı.",
    musicFaint: "Müzik eklendi; ritmi zayıf olduğu için kesmeler her vuruşa kilitlenmeden temposunu ({bpm} BPM) izliyor.",
    musicFixedRhythm: "Müzik eklendi; ritmi güvenilir biçimde bulunamadığı için kesmeler {seconds} sn'lik sabit bir ritim kullanıyor.",
    musicFixedRhythmDetail: "Müzik eklendi; kesmeler {seconds} sn'lik sabit bir ritim kullanıyor ({detail}).",
    musicUnreadable: "Bu müzik dosyası okunamadı ({detail}). Başka bir dosya veya hazır parçalardan birini seçin.",
    beatFailed: "ritim algılama başarısız oldu",
    previewFailed: "Önizleme oynatılamadı: {detail}.",
    previewNotCut: "önizleme kesilemedi",
    noAudio: "ses geri gelmedi",
    playbackBlocked: "oynatma engellendi; oynat düğmesine tekrar basın",
    dropMusic: "Bir müzik dosyası bırakın veya hazır parçalardan birini seçin.",
    picturesChanged: "Planlama sırasında görseller değişti. Tekrar “Oluştur”a basın.",
    severalDrafts: "“{name}” adlı birkaç yeni Draft var",
    draftNoId: "“{name}” adlı Draft kaydedildi ama Selects kimliğini bildirmedi. Draft listesinden açın veya yeniden oluşturun.",
    draftNoIdWhy: "“{name}” adlı Draft kaydedildi ama Selects kimliğini bildirmedi ({detail}). Draft listesinden açın veya yeniden oluşturun.",
    finishFailed: "Draft oluşturuldu ama harfleri ve kâğıdı eklenemedi: {detail}. Yeniden denemek için “Harfleri ve görünümü tamamla”ya basın.",
    finishFailedRebuild: "Draft oluşturuldu ama harfleri ve kâğıdı eklenemedi: {detail}. Klipleri artık planla eşleşmiyor; yeni bir Draft yapmak için “Oluştur”a basın.",
    openFailed: "Draft hazır ama açılamadı: {detail}. Aşağıdaki bağlantıyı kullanın veya Draft listesinden açın.",
    "param.backdropColor": "Arka plan rengi",
    "param.edge": "Kenar genişliği",
    "param.inset": "Fotoğraf boyutu",
    "param.tearSeed": "Yırtık tohumu",
    "param.motion": "Fotoğraf hareketi",
    "param.motionStrength": "Hareket gücü",
    "param.size": "Boyut",
    "param.y": "Dikey konum",
    "param.accent": "Vurgu rengi",
    "param.letterSeed": "Harf tohumu",
    "param.restyle": "Yeniden stil",
    "motion.off": "Kapalı",
    "motion.push-in": "Yakınlaş",
    "motion.pull-out": "Uzaklaş",
    "motion.drift": "Kay",
  },
  zh: {
    openProject: "请先打开一个项目，再制作 Torn Paper Love。",
    words: "词语",
    word1: "词语 1",
    word2: "词语 2",
    wordHint: "每个词语最多 {max} 个字符（汉字等全角字符按 2 个计算）；两个词语分别位于左右两侧。",
    lettersPreview: "文字预览：{words}",
    wordsTooLong: "请缩短词语：按完整大小放不下。",
    style: "风格",
    backdrop: "背景",
    "backdrop.night": "夜色",
    "backdrop.red": "红色幕布",
    "backdrop.kraft": "牛皮纸",
    "backdrop.photo": "照片",
    music: "音乐",
    track: "曲目",
    ownMusic: "自己的音乐",
    noMusic: "无音乐",
    sectionHint: "音乐片段 — 拖动选择",
    sectionLabel: "音乐片段",
    musicTooShort: "这段音乐太短，不够这个时长",
    startsAt: "从 {seconds} 秒开始",
    stopPreview: "停止试听",
    cancelPreview: "取消试听",
    previewSection: "试听这一段",
    noMusicRhythm: "无音乐：剪切保持每 {seconds} 秒的固定节奏。",
    length: "时长",
    "length.short": "短",
    "length.standard": "标准",
    "length.long": "长",
    lengthOption: "{name} {n}",
    pace: "节奏",
    "pace.quick": "快",
    "pace.relaxed": "舒缓",
    refresh: "刷新",
    refreshing: "正在刷新",
    readFailed: "无法读取此项目中的素材：{detail}",
    refreshFailed: "无法刷新素材：{detail}",
    checkingPictures: "正在检查素材",
    checkingPicturesNow: "正在检查素材…",
    listening: "正在识别节拍",
    listeningNow: "正在识别节拍…",
    dropMusicAbove: "请在上方拖入一个音乐文件，或选择内置曲目。",
    noPictures: "\u6b64\u9879\u76ee\u4e2d\u8fd8\u6ca1\u6709\u7167\u7247\u6216\u7247\u6bb5\u3002\u8bf7\u6dfb\u52a0\u4e00\u4e9b\uff1b\u8fd9\u91cc\u4f1a\u81ea\u52a8\u66f4\u65b0\u3002",
    ready: "已就绪：{summary}",
    photos: { other: "{count} 张照片" },
    clips: { other: "{count} 个片段" },
    shots: { other: "{count} 个镜头" },
    aboutSeconds: "约 {seconds} 秒",
    stillAnalysing: { other: "{count} 个片段仍在分析" },
    stillImporting: { other: "{count} \u4e2a\u7247\u6bb5\u4ecd\u5728\u5bfc\u5165" },
    notAnalysedNote: "Selects \u5c1a\u672a\u5206\u6790\u7684\u7247\u6bb5\u4f1a\u5728\u8fd9\u53f0\u7535\u8111\u4e0a\u5feb\u901f\u68c0\u67e5\uff1b\u5df2\u5206\u6790\u7684\u7247\u6bb5\u80fd\u9009\u51fa\u66f4\u597d\u7684\u753b\u9762\u3002",
    notRead: { other: "{count} 张照片无法读取" },
    notReadYet: { other: "{count} 张照片暂时无法读取" },
    tooShort: { other: "{count} 个片段太短" },
    autoUpdate: "{facts}。这里会自动更新。",
    "reason.noWords": "请至少输入一个词语。",
    "reason.fewPictures": "请至少添加 {min} 张照片或片段。",
    "reason.musicTooShort": "从片段起点算起，这首曲目至少需要 {seconds} 秒。",
    fitPictures: { other: "你有 {count} 个素材：“{length}”使用其中 {n} 个（{shots} 个镜头，{seconds} 秒）。" },
    fitMusic: "从这个起点开始，音乐可容纳 {n} 个素材（{shots} 个镜头，{seconds} 秒）。请把片段往前移，以达到完整的“{length}”时长。",
    advanced: "高级",
    useVideos: "使用视频",
    useVideosOff: "“使用视频”已关闭",
    clipSound: "片段原声",
    "sound.off": "关闭",
    "sound.ambient": "环境音",
    "sound.full": "原音量",
    fadedFilm: "褪色胶片",
    tilt: "倾斜",
    silentVideo: "无声视频：没有音乐，且片段原声为“关闭”。",
    chooseClips: "选择片段",
    chooseClipsCount: "选择片段（{selected}/{total}）",
    all: "全选",
    none: "全不选",
    photo: "照片",
    photoNotRead: "照片 · 无法读取",
    "shape.tall": "竖版",
    "shape.wide": "横版",
    "shape.square": "方形",
    "step.pictures": "读取素材",
    "step.moments": "寻找精彩瞬间",
    "step.plan": "规划",
    "step.place": "放置素材",
    "step.decorate": "添加文字和纸张",
    progress: "第 {step}/{total} 步 · {name} · {percent}%",
    progressDetail: "第 {step}/{total} 步 · {name}（{detail}）· {percent}%",
    "detail.pictures": { other: "{count} 个素材" },
    "detail.clipsChecked": { other: "已检查 {done}/{count} 个片段" },
    "detail.checkingClips": { other: "\u6b63\u5728\u68c0\u67e5 {done}/{count} \u4e2a\u7247\u6bb5" },
    "detail.alreadyFound": "已找到",
    "detail.photosOnly": "仅照片",
    "detail.addingMusic": "正在添加音乐",
    "detail.openingDraft": "正在打开 Draft",
    stoppedAt: "在第 {step}/{total} 步（{name}）停止：{detail}",
    working: "处理中",
    build: "生成",
    building: "正在生成",
    anotherVersion: "换一组镜头",
    finishLetters: "完成文字和色调",
    draftCreated: "Draft 已创建。选中文字可更改词语、大小或颜色；选中素材可调整撕边、背景、“褪色胶片”或声音。重新生成会创建新的 Draft，且不会保留在检查器中所做的修改。",
    draftCreatedAdding: "Draft 已创建；正在添加文字和纸张…",
    openDraft: "打开新的 Draft",
    copyLink: "复制新 Draft 的链接",
    note: "提示：{detail}。",
    unchecked: { other: "有 {count} 个片段无法搜索精彩瞬间，已改用平稳的部分。再次生成可重试。" },
    anotherVersionHint: "换一组镜头：撕边和文字会重新生成；照片多于 {n} 张时会换用不同的照片。",
    createsDraft: "创建一个新的 4:3 Draft。",
    createsDraftFrom: { other: "从你的 {count} 个素材中选取 {n} 个，创建一个新的 4:3 Draft。" },
    startFailed: "Torn Paper Love 无法启动：{detail}。如果问题持续，请重新安装插件。",
    foldersNotFound: "找不到插件文件夹",
    adapterNeeded: "此版本的 Selects 需要更新的 {name} 适配器。",
    stepFailed: "Selects 无法完成这一步。",
    musicFaint: "音乐已添加；节拍较弱，因此剪切会跟随其速度（{bpm} BPM），但不会对齐每一个节拍。",
    musicFixedRhythm: "音乐已添加；由于无法可靠识别其节拍，剪切将使用每 {seconds} 秒的固定节奏。",
    musicFixedRhythmDetail: "音乐已添加；剪切将使用每 {seconds} 秒的固定节奏（{detail}）。",
    musicUnreadable: "无法读取这个音乐文件（{detail}）。请选择其他文件或内置曲目。",
    beatFailed: "节拍识别失败",
    previewFailed: "无法播放试听：{detail}。",
    previewNotCut: "无法截取试听片段",
    noAudio: "没有返回音频",
    playbackBlocked: "播放被阻止，请再次点击播放",
    dropMusic: "请拖入一个音乐文件，或选择内置曲目。",
    picturesChanged: "规划期间素材发生了变化。请再次点击“生成”。",
    severalDrafts: "有多个新的 Draft 都名为“{name}”",
    draftNoId: "Draft“{name}”已保存，但 Selects 没有返回它的 ID。请从 Draft 列表中打开它，或重新生成。",
    draftNoIdWhy: "Draft“{name}”已保存，但 Selects 没有返回它的 ID（{detail}）。请从 Draft 列表中打开它，或重新生成。",
    finishFailed: "Draft 已创建，但未能添加文字和纸张：{detail}。点击“完成文字和色调”重试。",
    finishFailedRebuild: "Draft 已创建，但未能添加文字和纸张：{detail}。其片段已与规划不一致，请点击“生成”创建新的 Draft。",
    openFailed: "Draft 已就绪，但无法打开：{detail}。请使用下方链接，或从 Draft 列表中打开。",
    "param.backdropColor": "背景颜色",
    "param.edge": "纸边宽度",
    "param.inset": "照片大小",
    "param.tearSeed": "撕边种子",
    "param.motion": "照片运动",
    "param.motionStrength": "运动强度",
    "param.size": "大小",
    "param.y": "垂直位置",
    "param.accent": "强调色",
    "param.letterSeed": "文字种子",
    "param.restyle": "换样式",
    "motion.off": "关闭",
    "motion.push-in": "推近",
    "motion.pull-out": "拉远",
    "motion.drift": "平移",
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
// Text kept in state as a function of the UI language, so it follows a language switch.
type Say = (lang: Lang) => string;
// An error the panel shows in the UI language (English message for logs).
function uiError(say: Say) { return tplSay(say("en"), say); }

// tpl-planner:start
// Torn Paper Love planner. A plain script: panel.tsx embeds it verbatim (between `// tpl-planner:start|end`) and the
// tests load it in node:vm. Pure and deterministic; no module syntax.
//
// The edit: N unique pictures shown twice in the same order (2N slots) on the cue's 8th-note grid. Pass 1 opens with
// two 2-unit shots and cycles [1, 2, 1, 1]; pass 2 is faster (1-unit shots, the last one 2 or 3 so the total is even).

// Canvas (4:3).
const TPL_W = 1440;
const TPL_H = 1080;
// Unique pictures per length (each is shown twice).
const TPL_LENGTHS = { short: 5, standard: 7, long: 10 };
const TPL_MIN_PICTURES = 3;
// The unit is the note value (8th or beat) closest to TPL_UNIT_TARGET seconds, allowed only within TPL_UNIT_RANGE
// (inclusive): 120 BPM cuts on its 0.25 s 8th rather than falling back to the fixed unit.
const TPL_UNIT_TARGET = 0.35;
const TPL_UNIT_RANGE = [0.22, 0.55];
// Fixed unit without a tempo to cut on (No music, own music with no steady beat, tempo out of range).
const TPL_FALLBACK_UNIT = 0.35;
// A video window keeps at least this much source after its longest slot.
const TPL_SOURCE_TAIL = 0.15;
// The Torn photo effect's clock: 'clip' (frame 0 = the clip's first timeline frame) or 'source'. Set by probe P-clock.
const TPL_EFFECT_CLOCK = 'clip';
// Filler candidates for videos without a search hit.
const TPL_FILLER_STEP = 0.5;
const TPL_FILLER_EDGE = 0.25;
const TPL_FILLER_SCORE = -2;
const TPL_FILLER_MAX = 48;

// The grid unit for a tempo: of the 8th (0.5 beat) and the beat, the one closest to TPL_UNIT_TARGET (the 8th up to
// about 128.6 BPM, the beat above). A musical bar is 8 units in both cases. Returns null when neither lies in
// TPL_UNIT_RANGE (below about 54.5 BPM or above about 272.7 BPM). Ties go to the 8th.
function tplUnit(bpm) {
  if (typeof bpm !== 'number' || !isFinite(bpm) || !(bpm > 0)) return null;
  let best = null;
  for (const unitBeats of [0.5, 1]) {
    const unitSec = unitBeats * 60 / bpm;
    if (unitSec < TPL_UNIT_RANGE[0] - 1e-9 || unitSec > TPL_UNIT_RANGE[1] + 1e-9) continue;
    const d = Math.abs(unitSec - TPL_UNIT_TARGET);
    if (!best || d < best.d - 1e-12) best = { unitBeats, unitSec, barUnits: 8, d };
  }
  return best ? { unitBeats: best.unitBeats, unitSec: best.unitSec, barUnits: best.barUnits } : null;
}

// The approximate tempo the cuts follow, or null. beat-detect.cjs reports an own track's grid as 'approximate' when it
// is tight and holds across the track but too few beats carry an onset to accept it ("tempo known, beat faint"). Only
// without an accepted grid, and only when the tempo has a unit (tplUnit): the cuts then run on that unit from the
// detected first beat, but stay gridless (gridded false: low-band-only snapping within +/-120 ms, as the fixed timing).
// opts: { accepted, approxBpm }.
function tplApproxTempo(opts) {
  const bpm = opts && opts.approxBpm;
  return !(opts && opts.accepted) && typeof bpm === 'number' && tplUnit(bpm) ? bpm : null;
}

// The unit the cuts run on: the accepted grid's (tplUnit of bpm), else the approximate tempo's, else null (the fixed
// TPL_FALLBACK_UNIT). opts: { bpm, accepted, approxBpm? }.
function tplCutUnit(opts) {
  if (opts.accepted) return tplUnit(opts.bpm);
  const approx = tplApproxTempo(opts);
  return approx ? tplUnit(approx) : null;
}

// Slot lengths in units for N pictures. Relaxed doubles every entry.
function tplTemplate(N, pace) {
  const f = pace === 'relaxed' ? 2 : 1;
  const cycle = [1, 2, 1, 1];
  const pass1 = [];
  for (let i = 0; i < N; i++) pass1.push(N <= 4 || i < 2 ? 2 : cycle[(i - 2) % cycle.length]);
  const pass2 = [];
  for (let i = 0; i < N - 1; i++) pass2.push(1);
  const base = pass1.reduce((a, b) => a + b, 0) + (N - 1) + 2;
  pass2.push(base % 2 ? 3 : 2);
  const p1 = pass1.map(x => x * f), p2 = pass2.map(x => x * f);
  return { pass1: p1, pass2: p2, total: p1.concat(p2).reduce((a, b) => a + b, 0) };
}

// Where the music's beats land on the timeline. Selects snaps the music's source start (sectionStart) to a timeline
// frame, so the music plays offset by delta = sectionStart - round(sectionStart * fps) / fps (at most half a frame).
// Without music there is no offset.
function tplMusicOffset(sectionStart, fps) {
  return typeof sectionStart === 'number' && isFinite(sectionStart) && fps > 0 ? sectionStart - Math.round(sectionStart * fps) / fps : 0;
}

// Onset snapping (CWV rules and constants, spec 2 and 15.4). Only anchors move: pass-1 boundaries that start a 2-unit
// slot, never boundary 0 or the end. A cut stays on the grid when a qualifying onset of any band lies within one frame;
// otherwise it moves onto the best strong onset within the window (min(0.10 beat, 70 ms); fixed-timing fallback: low
// band only, +/-120 ms), unless that would leave a neighbouring shot too short.
const TPL_SNAP_WINDOW_BEATS = 0.10;
const TPL_SNAP_WINDOW_MAX = 0.070;
const TPL_SNAP_MIN_STRENGTH = 2;
const TPL_SNAP_MIN_RATIO = 1.5;
const TPL_SNAP_DISTANCE_COST = 0.5;
const TPL_SNAP_LOW_MARGIN = 0.25;
const TPL_SNAP_MIN_FRAMES = 4;
const TPL_SNAP_MIN_SHARE = 0.75;
const TPL_SNAP_LOW_CONFIDENCE_WINDOW = 0.120;

// boundaries: grid seconds from the section start ([0, ..., end]). anchors: boundary indices that may snap.
// onsets: [[music-source seconds, 'l' | 'm' | 'h', strength], ...]. opts: { bpm, fps, sectionStart, thresholds?,
// lowConfidence? }. Returns { cuts (seconds like boundaries), log: one entry per moved cut, reasons: per anchor }.
function tplSnapCuts(boundaries, anchors, onsets, opts) {
  const fps = opts.fps, low = !!opts.lowConfidence;
  const beat = opts.bpm > 0 ? 60 / opts.bpm : Infinity;
  const offset = tplMusicOffset(opts.sectionStart, fps);
  const frameOf = x => (x === 0 ? 0 : Math.round((x + offset) * fps));
  const reach = low ? TPL_SNAP_LOW_CONFIDENCE_WINDOW : Math.min(TPL_SNAP_WINDOW_BEATS * beat, TPL_SNAP_WINDOW_MAX);
  const bands = low ? ['l'] : ['l', 'm', 'h'];
  const thr = band => Math.max(TPL_SNAP_MIN_STRENGTH, (opts.thresholds && opts.thresholds[band]) || 0);
  const shift = typeof opts.sectionStart === 'number' && isFinite(opts.sectionStart) ? opts.sectionStart : 0;
  const list = (onsets || []).filter(o => o && isFinite(o[0]) && isFinite(o[2]) && o[2] >= thr(o[1]))
    .map(o => ({ x: o[0] - shift, band: o[1], strength: o[2], ratio: o[2] / thr(o[1]) }));
  const n = boundaries.length - 1;
  const cuts = boundaries.slice(), log = [], reasons = [];
  const pick = g => {
    const near = list.filter(o => Math.abs(o.x - g) <= reach + 1e-9).map(o => Object.assign({}, o, { d: Math.abs(o.x - g) }));
    if (near.some(o => o.d <= 1 / fps + 1e-9)) return { none: 'on grid' };
    const usable = near.filter(o => bands.indexOf(o.band) >= 0);
    if (!usable.length) return { none: 'no onset' };
    let best = null, why = 'weak onset';
    for (const o of usable) {
      if (o.ratio < TPL_SNAP_MIN_RATIO - 1e-9) continue;
      if (o.band === 'l') {
        const own = near.reduce((m, q) => (q.d < o.d - 1e-9 && q.ratio > m ? q.ratio : m), 1);
        if (o.ratio < own + TPL_SNAP_LOW_MARGIN - 1e-9) { why = 'low onset not above the grid'; continue; }
      }
      const score = o.ratio - TPL_SNAP_DISTANCE_COST * o.d / reach;
      if (!best || score > best.score + 1e-9 || (Math.abs(score - best.score) <= 1e-9 && (o.d < best.d - 1e-9 || (Math.abs(o.d - best.d) <= 1e-9 && o.x < best.x)))) best = Object.assign({}, o, { score });
    }
    return best || { none: why };
  };
  const tooShort = (next, a, b) => {
    for (let k = Math.max(0, a); k <= Math.min(n - 1, b); k++) {
      const frames = frameOf(next[k + 1]) - frameOf(next[k]), grid = frameOf(boundaries[k + 1]) - frameOf(boundaries[k]);
      if (frames < Math.min(TPL_SNAP_MIN_FRAMES, grid)) return 'slot ' + k + ' min-frames';
      if (next[k + 1] - next[k] < TPL_SNAP_MIN_SHARE * (boundaries[k + 1] - boundaries[k]) - 1e-9) return 'slot ' + k + ' min-share';
    }
    return null;
  };
  const order = anchors.filter(i => i > 0 && i < n).sort((a, b) => a - b);
  for (const i of order) {
    const g = boundaries[i];
    const o = pick(g);
    if (o.none) { reasons.push({ index: i, reason: o.none }); continue; }
    const next = cuts.slice();
    next[i] = o.x;
    const bad = tooShort(next, i - 1, i);
    if (bad) { reasons.push({ index: i, reason: 'reverted: ' + bad }); continue; }
    cuts[i] = o.x;
    reasons.push({ index: i, reason: 'onset' });
    log.push({ index: i, from: g, to: o.x, band: o.band, offsetMs: Math.round((o.x - g) * 1e4) / 10, strength: o.strength, ratio: Math.round(o.ratio * 100) / 100 });
  }
  return { cuts, log, reasons };
}

// The cut plan. opts: { bpm | null, accepted, approxBpm? (tplApproxTempo), fps, N, pace, sectionStart (music seconds,
// null without music), onsets?, onsetThresholds?, lowConfidence? }. targets are continuous seconds from the section start (2N + 1
// boundaries incl. 0 and the end); frames[k] = k === 0 ? 0 : round((targets[k] + offset) * fps), from absolute
// positions only (never accumulated). units = each boundary's absolute unit position.
function tplSchedule(opts) {
  const fps = opts.fps, N = opts.N;
  if (!(fps > 0) || !(N >= 1)) throw Error('tplSchedule needs fps and N');
  const unit = tplCutUnit(opts);
  // gridded = an accepted beat grid; an approximate tempo only sets the unit.
  const gridded = !!unit && !!opts.accepted;
  const unitSec = unit ? unit.unitSec : TPL_FALLBACK_UNIT;
  const factor = opts.pace === 'relaxed' ? 2 : 1;
  const tpl = tplTemplate(N, opts.pace);
  const lengths = tpl.pass1.concat(tpl.pass2);
  const units = [0];
  lengths.forEach(l => units.push(units[units.length - 1] + l));
  const grid = units.map(u => u * unitSec);
  const offset = tplMusicOffset(opts.sectionStart, fps);
  let targets = grid, snapLog = [];
  const hasSection = typeof opts.sectionStart === 'number' && isFinite(opts.sectionStart);
  if (opts.onsets && opts.onsets.length && hasSection) {
    // Anchors: pass-1 boundaries that start a 2-unit slot (base units), excluding boundary 0.
    const anchors = [];
    for (let i = 1; i < N; i++) if (tpl.pass1[i] === 2 * factor) anchors.push(i);
    const snapped = tplSnapCuts(grid, anchors, opts.onsets, { bpm: opts.bpm, fps, sectionStart: opts.sectionStart,
      thresholds: opts.onsetThresholds, lowConfidence: !gridded || !!opts.lowConfidence });
    targets = snapped.cuts; snapLog = snapped.log;
  }
  const frames = targets.map((t, k) => (k === 0 ? 0 : Math.round((t + offset) * fps)));
  const slots = lengths.map((l, i) => ({
    index: i,
    pass: i < N ? 1 : 2,
    pos: i < N ? i : i - N,
    units: l,
    startFrame: frames[i],
    endFrame: frames[i + 1],
  }));
  return {
    gridded, unitSec, offset, fps, N, pace: factor === 2 ? 'relaxed' : 'quick', tickUnits: factor,
    units, targets, frames, snapLog, slots,
    totalFrames: frames[frames.length - 1],
    lettersStartFrame: frames[1],
  };
}

// Largest N <= requested that the pictures and the music allow. usableEnd = Infinity (or omitted) without music.
// opts.approxBpm as tplSchedule.
function tplFitN(opts) {
  const unit = tplCutUnit(opts);
  const unitSec = unit ? unit.unitSec : TPL_FALLBACK_UNIT;
  const start = typeof opts.sectionStart === 'number' && isFinite(opts.sectionStart) ? opts.sectionStart : 0;
  const end = typeof opts.usableEnd === 'number' && !isNaN(opts.usableEnd) ? opts.usableEnd : Infinity;
  const requested = Math.floor(opts.requested), available = Math.max(0, Math.floor(opts.available || 0));
  const cap = Math.min(requested, available);
  for (let N = cap; N >= TPL_MIN_PICTURES; N--) {
    if (start + tplTemplate(N, opts.pace).total * unitSec <= end + 1e-6) {
      return { N, reason: N === requested ? null : N === cap ? 'pictures' : 'music' };
    }
  }
  return { N: 0, reason: cap < TPL_MIN_PICTURES ? 'pictures' : 'music' };
}

// Parsed recording time, or null.
function tplTimeOf(p) {
  if (!p || typeof p.recordedAt !== 'string' || !p.recordedAt) return null;
  const t = Date.parse(p.recordedAt);
  return isFinite(t) ? t : null;
}

// Recording date ascending; missing dates after dated ones in input (Project) order; ties by resource id.
function tplOrder(pictures) {
  return (pictures || []).map((p, i) => ({ p, i, t: tplTimeOf(p) })).sort((a, b) => {
    if (a.t !== null && b.t !== null) {
      if (a.t !== b.t) return a.t - b.t;
      const ra = String(a.p.rid), rb = String(b.p.rid);
      return ra < rb ? -1 : ra > rb ? 1 : a.i - b.i;
    }
    if (a.t !== null) return -1;
    if (b.t !== null) return 1;
    return a.i - b.i;
  }).map(x => x.p);
}

function tplHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}

// A uniform [0, 1) value for a key: FNV-1a (tplHash) followed by the murmur3 finaliser. FNV-1a alone barely moves its
// high bits for a change in the last character, so keys that differ only in a trailing index would be correlated.
function tplRandom(str) {
  let h = Math.floor(tplHash(str) * 4294967296);
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// Seed for a picture's tear/tilt: the same identity and version give the same seed (both passes share it).
function tplSeedFor(identity, versionSeed) {
  return Math.floor(tplHash(String(identity) + ':' + String(versionSeed)) * 4294967296) >>> 0;
}

// A picture's identity: the resource id for photos, resource id + source start for videos.
function tplIdentity(p) {
  return p.kind === 'video' ? p.rid + '@' + Number(p.startSeconds || 0).toFixed(3) : String(p.rid);
}

// n of the ordered list, one per equal stratum, chosen with the seed. All of it when it has n or fewer.
function tplStrata(list, n, seed, tag) {
  if (list.length <= n) return list.slice();
  const out = [];
  for (let k = 0; k < n; k++) {
    const lo = Math.floor(k * list.length / n), hi = Math.floor((k + 1) * list.length / n);
    const at = lo + Math.min(hi - lo - 1, Math.floor(tplRandom(String(seed) + ':' + tag + ':' + k) * (hi - lo)));
    out.push(list[at]);
  }
  return out;
}

// Picks: photos first, videos only when photos run short and useVideos. Among more candidates of a kind than needed,
// one per equal date stratum (seeded). Returned in tplOrder. pictures: [{ rid, kind: 'photo' | 'video', name, width,
// height, recordedAt, startSeconds (videos, chosen by the caller) }]; a resource counts once.
function tplPick(opts) {
  const N = Math.max(0, Math.floor(opts.N || 0));
  const seen = {}, photos = [], videos = [];
  for (const p of opts.pictures || []) {
    if (!p || typeof p.rid !== 'string' || seen[p.rid]) continue;
    seen[p.rid] = true;
    if (p.kind === 'photo') photos.push(p); else if (p.kind === 'video') videos.push(p);
  }
  const chosenPhotos = tplStrata(tplOrder(photos), N, opts.seed, 'photo');
  const rest = N - chosenPhotos.length;
  const chosenVideos = rest > 0 && opts.useVideos ? tplStrata(tplOrder(videos), rest, opts.seed, 'video') : [];
  const picks = tplOrder(chosenPhotos.concat(chosenVideos)).map(p => {
    const k = { rid: p.rid, kind: p.kind, name: p.name, width: p.width, height: p.height, recordedAt: p.recordedAt };
    if (p.kind === 'video') k.startSeconds = Number(p.startSeconds) || 0;
    k.identity = tplIdentity(k);
    return k;
  });
  return { picks, photoCount: chosenPhotos.length, videoCount: chosenVideos.length };
}

// A video's source window start: a whole frame at the real fps, slid back so the longest slot plus the tail fits.
// null when the clip is too short.
function tplVideoWindow(opts) {
  const fps = opts.fps, D = opts.duration, need = opts.maxSlotFrames / fps + TPL_SOURCE_TAIL;
  if (!(fps > 0) || typeof D !== 'number' || !isFinite(D) || !(opts.maxSlotFrames > 0)) return null;
  const hit = typeof opts.hitStart === 'number' && isFinite(opts.hitStart) ? Math.max(0, opts.hitStart) : 0;
  let f = Math.floor(hit * fps + 1e-6);
  const latest = Math.floor((D - need) * fps + 1e-6);
  if (latest < 0) return null;
  if (f > latest) f = latest;
  return { startSeconds: f / fps };
}

// The 2N placements: pass 2 repeats pass 1's picks in the same order. Throws on adjacent repeats.
function tplSlots(schedule, picks) {
  const N = schedule.N != null ? schedule.N : schedule.slots.length / 2;
  if (!picks || picks.length !== N) throw Error('tplSlots needs ' + N + ' picks');
  const out = schedule.slots.map(s => {
    const p = picks[s.pos];
    return { index: s.index, pass: s.pass, pos: s.pos, rid: p.rid, kind: p.kind, identity: p.identity || tplIdentity(p),
      startSeconds: p.kind === 'video' ? Number(p.startSeconds) || 0 : 0, startFrame: s.startFrame, endFrame: s.endFrame };
  });
  for (let i = 1; i < out.length; i++) if (out[i].rid === out[i - 1].rid) throw Error('tplSlots: adjacent slots ' + (i - 1) + ' and ' + i + ' share a resource');
  return out;
}

// Transitions per slot (entry / exit), over 2N slots. Every other cut is a hard cut ('none'); the reference has no
// paper-strip tear, so pass 2 cuts straight through.
function tplTransitions(N) {
  const out = [];
  for (let i = 0; i < 2 * N; i++) out.push({ index: i, entry: 'none', exit: 'none' });
  const set = (i, key, v) => { if (i >= 0 && i < out.length) out[i][key] = v; };
  set(0, 'entry', 'slide');
  set(1, 'entry', 'paper-flash');
  set(1, 'exit', 'glow-out');
  if (N - 1 > 1) set(N - 1, 'entry', 'glow-in');
  set(2 * N - 1, 'entry', 'paper-flash-short');
  return out;
}

// Transition phases in 30 fps frames. 'paper-flash' follows the reference frame for frame (white card, overexposed,
// normal, two full-white frames). 'paper-flash-short' (the last shot) only flares the torn paper edge over an
// overexposed photo: it never whites out the card or the frame.
const TPL_PHASES = {
  'paper-flash': [['white', 1], ['over', 2], ['normal', 1], ['full', 2]],
  'paper-flash-short': [['flare', 3]],
  'glow-in': [['glow', 2]],
  'glow-out': [['glow', 2]],
};
// The slide intro in fractions of its slot: black until `black`, ease-in slide until `land`, then hold.
const TPL_SLIDE = { black: 0.28, land: 0.76 };

// Phases at fps: cumulative boundaries b_k = round(B_k * fps / 30), then strictly increasing (each phase >= 1 frame).
// 'slide' returns fractions of the slot (fraction: true); 'none' returns [].
function tplPhaseFrames(kind, fps) {
  if (kind === 'none') return [];
  if (kind === 'slide') return [{ name: 'black', start: 0, end: TPL_SLIDE.black, fraction: true }, { name: 'slide', start: TPL_SLIDE.black, end: TPL_SLIDE.land, fraction: true }];
  const table = TPL_PHASES[kind];
  if (!table) throw Error('unknown transition ' + kind);
  const out = [];
  let B = 0, prev = 0;
  for (const [name, n] of table) {
    B += n;
    const b = Math.max(prev + 1, Math.round(B * fps / 30));
    out.push({ name, start: prev, end: b });
    prev = b;
  }
  return out;
}

// Re-style ticks for the letters: every unit boundary after lettersStartFrame (every doubled unit in Relaxed),
// relative to it, before the end. A tick on a slot boundary uses the cut's frame.
function tplLetterTicks(schedule) {
  const s = schedule, units = s.units, step = s.tickUnits || 1, last = units[units.length - 1];
  const start = s.lettersStartFrame, span = s.totalFrames - start;
  const out = [];
  for (let u = units[1] + step; u < last - 1e-9; u += step) {
    const k = units.indexOf(u);
    const f = k >= 0 ? s.frames[k] : Math.round((u * s.unitSec + s.offset) * s.fps);
    const rel = f - start;
    if (rel > 0 && rel < span && (!out.length || rel > out[out.length - 1])) out.push(rel);
  }
  return out;
}

// Native cover transform and the visible canvas rectangle. Selects conforms a clip to fit the canvas; scaling it by
// cover = fill / fit makes it cover the canvas (as CWV assemble). vis = the canvas window in % of the clip's own box.
// Portrait sources anchor the crop at 40 % from the top (the point 40 % down the photo stays 40 % down the canvas);
// others centre. shift = the clip translation in canvas pixels that the assembler applies for that anchor (positive y =
// down; 0 when centred).
function tplVisRect(srcW, srcH, W, H) {
  W = W || TPL_W; H = H || TPL_H;
  const full = { cover: 1, vis: { x: 0, y: 0, w: 100, h: 100 }, shift: { x: 0, y: 0 } };
  if (!(typeof srcW === 'number' && srcW > 0 && isFinite(srcW) && typeof srcH === 'number' && srcH > 0 && isFinite(srcH))) return full;
  const fit = Math.min(W / srcW, H / srcH), fill = Math.max(W / srcW, H / srcH);
  const cover = fill / fit;
  if (cover <= 1.001) return full;
  const bw = srcW * fill, bh = srcH * fill;
  const w = W / bw * 100, h = H / bh * 100;
  const ay = srcH > srcW ? 0.4 : 0.5;
  return {
    cover,
    vis: { x: (100 - w) / 2, y: ay * (100 - h), w, h },
    shift: { x: 0, y: (0.5 - ay) * (bh - H) },
  };
}

// Bar length in detected beats: 8 units (4 beats for the 8th unit, 8 for a double-time beat unit); 4 without a unit.
function tplBarBeats(bpm) {
  const u = tplUnit(bpm);
  return u ? u.barUnits * u.unitBeats : 4;
}

// Section slider snap (CWV) with the musical bar = 8 units.
function tplSnapSection(opts) {
  const latest = opts.usableEnd - opts.videoSeconds;
  if (latest < -1e-6) return null;
  if (!opts.gridAccepted) return Math.max(0, Math.min(Math.floor(latest * 10) / 10, Math.round(opts.value * 10) / 10));
  const bar = tplBarBeats(opts.bpm) * 60 / opts.bpm;
  const maxK = Math.floor((latest - opts.firstBeat) / bar + 1e-9);
  if (maxK < 0) return null;
  const k = Math.max(0, Math.min(maxK, Math.round((opts.value - opts.firstBeat) / bar)));
  return opts.firstBeat + k * bar;
}

// Default section (CWV): the bar start whose window has the highest mean beat energy.
function tplDefaultSection(opts) {
  const beat = 60 / opts.bpm, barBeats = tplBarBeats(opts.bpm), span = Math.round(opts.videoSeconds / beat);
  let best = null;
  for (let k = 0; ; k++) {
    const start = opts.firstBeat + k * barBeats * beat;
    if (start + opts.videoSeconds > opts.usableEnd + 1e-6) break;
    const slice = opts.beatEnergy.slice(k * barBeats, k * barBeats + span);
    if (slice.length < span) break;
    const mean = slice.reduce((a, b) => a + b, 0) / span;
    if (!best || mean > best.mean + 1e-9) best = { start, mean };
  }
  return best ? best.start : null;
}

// Filler candidates every TPL_FILLER_STEP seconds on each source, at most TPL_FILLER_MAX per source, by rid then time.
function tplFillers(candidates) {
  const dur = {};
  for (const c of candidates || []) {
    if (!c || typeof c.sourceDuration !== 'number' || !isFinite(c.sourceDuration) || !(c.sourceDuration > 0)) continue;
    dur[c.rid] = Math.max(dur[c.rid] || 0, c.sourceDuration);
  }
  const out = [];
  for (const rid of Object.keys(dur).sort()) {
    for (let k = 0; k < TPL_FILLER_MAX; k++) {
      const t = TPL_FILLER_EDGE + k * TPL_FILLER_STEP;
      if (t > dur[rid] - TPL_FILLER_EDGE + 1e-9) break;
      out.push({ rid, role: 'filler', t, score: TPL_FILLER_SCORE, sourceDuration: dur[rid] });
    }
  }
  return out;
}

// Build steps shown in the panel's progress bar, with each step's share of the bar in percent. The panel names them
// in its UI language (STRINGS `step.<id>`).
const TPL_BUILD_STEPS = [
  { id: 'pictures', weight: 15 },
  { id: 'moments', weight: 25 },
  { id: 'plan', weight: 10 },
  { id: 'place', weight: 30 },
  { id: 'decorate', weight: 20 },
];

// Progress for a step that is `fraction` done. Floors the percent so 100% only shows at the very end. `detail` (text or
// a function of the UI language) is passed through for the panel's label; empty means none.
function tplProgress(stepId, fraction, detail) {
  const i = TPL_BUILD_STEPS.findIndex(s => s.id === stepId);
  if (i < 0) throw new Error('unknown build step ' + stepId);
  const total = TPL_BUILD_STEPS.reduce((a, s) => a + s.weight, 0);
  const before = TPL_BUILD_STEPS.slice(0, i).reduce((a, s) => a + s.weight, 0);
  const f = Math.min(1, Math.max(0, Number(fraction) || 0));
  const value = (before + TPL_BUILD_STEPS[i].weight * f) / total;
  const percent = Math.floor(value * 100 + 1e-9);
  return { id: TPL_BUILD_STEPS[i].id, value, percent, current: i, detail: detail || null };
}
// tpl-planner:end

// tpl-config:start
const TPL_AMBIENT_DB = -18;
// Timeline rate used to plan before the Draft exists (display, video windows); decorate re-times at the real rate.
const TPL_PLAN_FPS = 30;
const TPL_BACKDROPS = { night: 'Night', red: 'Red curtain', kraft: 'Kraft', photo: 'Photo' };
const TPL_BACKDROP_COLORS = { night: '#151113', red: '#4a0f12', kraft: '#6b5a45', photo: '#151113' };
const TPL_LENGTH_LABELS = { short: 'Short', standard: 'Standard', long: 'Long' };
const TPL_TORN_NAME = 'Torn photo';
const TPL_LETTERS_NAME = 'Ransom letters';
const TPL_INSET = 92; // Photo size in % (the effect also reads 0.92); stored in the editable's units
const TPL_EDGE = 1.4;
const TPL_TILT_MAX = 1.5;
const TPL_MOTION_STRENGTH = 0.5;
const TPL_LETTER_SIZE = 6.0;
const TPL_LETTER_Y = 50;
const TPL_ACCENT = '#d0201a';
// Faded film strength by default (the muted flash-photo tone of the reference).
const TPL_LOOK = 0.6;
const TPL_MUSIC_FADE = 0.12;

function tplPad2(n) { return (n < 10 ? '0' : '') + n; }

// "Torn Paper Love <Backdrop> <Length> <yyyy-mm-dd hh:mm:ss>" in local time; the seconds tell apart two versions
// built within the same minute.
function tplDraftName(backdrop, length, now) {
  const t = new Date(now == null ? Date.now() : now);
  const stamp = t.getFullYear() + '-' + tplPad2(t.getMonth() + 1) + '-' + tplPad2(t.getDate()) + ' ' + tplPad2(t.getHours()) + ':' + tplPad2(t.getMinutes()) + ':' + tplPad2(t.getSeconds());
  return 'Torn Paper Love ' + (TPL_BACKDROPS[backdrop] || TPL_BACKDROPS.night) + ' ' + (TPL_LENGTH_LABELS[length] || TPL_LENGTH_LABELS.standard) + ' ' + stamp;
}

// Options with the frozen defaults filled in.
function tplOptions(o) {
  o = o || {};
  const pick = (v, list, d) => (list.indexOf(v) >= 0 ? v : d);
  const words = Array.isArray(o.words) ? o.words : ['MY', 'LOVE'];
  const look = typeof o.look === 'number' && isFinite(o.look) ? Math.max(0, Math.min(1, o.look)) : o.look === false ? 0 : TPL_LOOK;
  return {
    words: [String(words[0] == null ? '' : words[0]), String(words[1] == null ? '' : words[1])],
    backdrop: pick(o.backdrop, Object.keys(TPL_BACKDROPS), 'night'),
    length: pick(o.length, Object.keys(TPL_LENGTHS), 'standard'),
    pace: pick(o.pace, ['quick', 'relaxed'], 'quick'),
    clipSound: pick(o.clipSound, ['off', 'ambient', 'full'], 'ambient'),
    look,
    tilt: !!o.tilt,
    useVideos: o.useVideos !== false,
    only: Array.isArray(o.only) ? o.only.map(String) : null,
    seed: o.seed == null ? 1 : o.seed,
    section: typeof o.section === 'number' && isFinite(o.section) ? o.section : 'default',
  };
}

// The music grid of a manifest cue (bundled cues are accepted by construction), or the fixed grid without music.
// approxBpm: own music whose beat is faint (beat-detect.cjs grid 'approximate'); the cuts follow its tempo
// (planner tplApproxTempo), everything else treats the grid as not accepted.
function tplGrid(cue) {
  if (!cue) return { bpm: null, accepted: false, approxBpm: null, firstBeat: 0, usableEnd: null, beatEnergy: [], onsets: [], onsetThresholds: null };
  return { bpm: cue.bpm, accepted: cue.accepted !== false, approxBpm: typeof cue.approxBpm === 'number' ? cue.approxBpm : null, firstBeat: cue.firstBeat || 0,
    usableEnd: cue.usableEnd, beatEnergy: cue.beatEnergy || [], onsets: cue.onsets || [], onsetThresholds: cue.onsetThresholds || null };
}

function tplUnitSec(grid) {
  const u = tplCutUnit(grid);
  return u ? u.unitSec : TPL_FALLBACK_UNIT;
}

// The tempo the section snaps to (whole bars from the first beat): the accepted grid's, else an approximate tempo
// (tplApproxTempo), else null (0.1 s steps).
function tplSectionTempo(grid) {
  return grid.accepted ? grid.bpm : tplApproxTempo(grid);
}

// The section start (music seconds) for a video of `videoSeconds`: 'default' = the highest-energy bar window, a number
// snaps to a bar (clamped to the last bar that fits). null without music.
function tplSectionStart(grid, section, videoSeconds) {
  if (grid.bpm == null) return null;
  if (section === 'default') {
    const d = tplDefaultSection({ bpm: grid.bpm, firstBeat: grid.firstBeat, usableEnd: grid.usableEnd, beatEnergy: grid.beatEnergy, videoSeconds });
    if (d != null) return d;
  }
  const v = typeof section === 'number' ? section : grid.firstBeat;
  const tempo = tplSectionTempo(grid);
  const snapped = tplSnapSection({ value: v, firstBeat: grid.firstBeat, bpm: tempo == null ? grid.bpm : tempo, usableEnd: grid.usableEnd, videoSeconds, gridAccepted: tempo != null });
  return snapped == null ? grid.firstBeat : snapped;
}

// Everything the build needs, planned at TPL_PLAN_FPS. input: { projectId, inv: { photos, resources } (inventory.js),
// found: { best: { [rid]: seconds | null } } (search.js), cue: manifest cue | null (No music), options (tplOptions),
// now (draft name time) }. Returns { ok: false, reason, code, vars } when it can't be built: reason in English (errors,
// the headless driver), code + vars for the panel's translated text (STRINGS `reason.<code>`).
function tplPlanState(input) {
  const options = tplOptions(input.options);
  const fail = (code, reason, vars) => ({ ok: false, reason, code, vars: vars || {}, options });
  if (!options.words.some(w => w.trim())) return fail('noWords', 'Type at least one word');
  const inv = input.inv || {};
  const best = (input.found && input.found.best) || {};
  const grid = tplGrid(input.cue || null);
  const unitSec = tplUnitSec(grid);
  const wanted = r => !options.only || options.only.indexOf(r.rid) >= 0;
  const photosAll = (inv.photos || []).filter(wanted);
  const photos = photosAll.filter(p => p.width > 0 && p.height > 0);
  const videosAll = options.useVideos ? (inv.resources || []).filter(r => wanted(r) && r.duration > 0) : [];
  const requested = TPL_LENGTHS[options.length];
  const usableEnd = grid.usableEnd == null ? Infinity : grid.usableEnd;

  // N, the section and the eligible videos depend on each other (a video must hold its longest slot + the tail, the
  // longest slot depends on N, N on how many pictures are eligible): iterate to a fixed point; it only shrinks.
  let videos = videosAll, N = 0, fitReason = null, sectionStart = null, schedule = null;
  for (let round = 0; round < 8; round++) {
    const available = photos.length + videos.length;
    const tentative = Math.min(requested, available);
    if (tentative < TPL_MIN_PICTURES) return fail('fewPictures', 'Add at least 3 photos or clips', { min: TPL_MIN_PICTURES });
    sectionStart = tplSectionStart(grid, options.section, tplTemplate(tentative, options.pace).total * unitSec);
    const fit = tplFitN({ requested, available, sectionStart: sectionStart == null ? 0 : sectionStart, usableEnd, bpm: grid.bpm, accepted: grid.accepted, approxBpm: grid.approxBpm,
      pace: options.pace });
    if (!fit.N) {
      if (fit.reason === 'pictures') return fail('fewPictures', 'Add at least 3 photos or clips', { min: TPL_MIN_PICTURES });
      const need = tplTemplate(TPL_MIN_PICTURES, options.pace).total * unitSec;
      return fail('musicTooShort', 'This track needs at least ' + need.toFixed(1) + ' s from the section start', { seconds: Math.round(need * 10) / 10 });
    }
    N = fit.N; fitReason = fit.reason;
    schedule = tplSchedule({ bpm: grid.bpm, accepted: grid.accepted, approxBpm: grid.approxBpm, fps: TPL_PLAN_FPS, N, pace: options.pace, sectionStart,
      onsets: grid.onsets, onsetThresholds: grid.onsetThresholds || undefined, lowConfidence: false });
    const longest = schedule.slots.reduce((m, x) => Math.max(m, x.endFrame - x.startFrame), 0);
    const next = videos.filter(v => tplVideoWindow({ duration: v.duration, hitStart: 0, maxSlotFrames: longest, fps: TPL_PLAN_FPS }) != null);
    if (next.length === videos.length) break;
    videos = next;
  }

  // Provisional video starts (the search hit, else a seeded filler on the 0.5 s grid); picking doesn't depend on them.
  const startOf = v => {
    const hit = best[v.rid];
    if (typeof hit === 'number' && isFinite(hit)) return hit;
    const fillers = tplFillers([{ rid: v.rid, sourceDuration: v.duration }]);
    if (!fillers.length) return 0;
    return fillers[Math.min(fillers.length - 1, Math.floor(tplRandom(String(options.seed) + ':filler:' + v.rid) * fillers.length))].t;
  };
  const pool = photos.map(p => ({ rid: p.rid, kind: 'photo', name: p.name, width: p.width, height: p.height, recordedAt: p.recordedAt || null, order: p.order }))
    .concat(videos.map(v => ({ rid: v.rid, kind: 'video', name: v.name, width: v.width, height: v.height, recordedAt: v.recordedAt || null, order: v.order, startSeconds: startOf(v) })))
    .map((p, i) => ({ p, i })).sort((a, b) => (typeof a.p.order === 'number' && typeof b.p.order === 'number' ? a.p.order - b.p.order : 0) || a.i - b.i).map(x => x.p);
  const picked = tplPick({ pictures: pool, N, seed: options.seed, useVideos: options.useVideos });
  // Final video windows: a whole frame, slid back so the longer of the picture's two slots + the tail fits. Identity
  // (and so the tear seed) uses the final start.
  const duration = {};
  for (const v of videos) duration[v.rid] = v.duration;
  const picks = picked.picks.map((p, pos) => {
    const k = { rid: p.rid, kind: p.kind, name: p.name, width: p.width, height: p.height, recordedAt: p.recordedAt || null };
    if (p.kind === 'video') {
      const longest = Math.max(schedule.slots[pos].endFrame - schedule.slots[pos].startFrame, schedule.slots[N + pos].endFrame - schedule.slots[N + pos].startFrame);
      const w = tplVideoWindow({ duration: duration[p.rid], hitStart: p.startSeconds, maxSlotFrames: longest, fps: TPL_PLAN_FPS });
      if (!w) throw Error('tplPlanState: no window for ' + p.rid);
      k.startSeconds = w.startSeconds;
    }
    k.identity = tplIdentity(k);
    return k;
  });
  const slots = tplSlots(schedule, picks);
  const sizes = {};
  for (const p of picks) if (p.width > 0 && p.height > 0) sizes[p.rid] = { width: p.width, height: p.height };
  return {
    ok: true,
    projectId: input.projectId == null ? null : input.projectId,
    options,
    cue: input.cue ? { id: input.cue.id, label: input.cue.label || input.cue.id, file: input.cue.file || null, bpm: input.cue.bpm } : null,
    requested, N, fitReason,
    picks, photoCount: picked.photoCount, videoCount: picked.videoCount,
    order: picks.map(p => p.identity),
    excluded: { unmeasuredPhotos: photosAll.length - photos.length, shortVideos: videosAll.length - videos.length },
    gridded: schedule.gridded, unitSec: schedule.unitSec,
    sectionStart: sectionStart == null ? 0 : sectionStart,
    musicStart: sectionStart,
    schedule, targets: schedule.targets, slots,
    transitions: tplTransitions(N),
    seconds: schedule.targets[schedule.targets.length - 1],
    sizes,
    draftName: tplDraftName(options.backdrop, options.length, input.now),
  };
}

// Clips Selects hasn't analysed (inventory `analysed: false`) can't use scene search. The panel scores them on the
// user's computer instead (the kit's quick score: quickScoreAll + pickWindowsLocal(scores, 'still', need)) and starts
// each one on its stillest clean window: TPL holds near-still shots. Starts are never before TPL_QUICK_EDGE (fade-ins,
// black first frames) when the clip is long enough.
const TPL_QUICK_EDGE = 0.5;
// Clips scored at once, and the time for all of a build's clips (clips not started in time keep their fallback start).
const TPL_QUICK_PARALLEL = 3;
const TPL_QUICK_BUDGET_MS = 20000;

// The start used when a clip can't be scored (no host ffmpeg, a failure, the budget ran out): one of the planner's
// 0.5 s filler-grid windows that starts at or after TPL_QUICK_EDGE and holds `need` seconds, chosen with the seed (so
// "Try other shots" varies it like the filler of an analysed clip without a hit). A clip too short for the edge starts
// as late as it can (tplVideoWindow slides it back to fit).
function tplQuickFallback(rid, duration, need, seed) {
  const starts = tplFillers([{ rid: String(rid), sourceDuration: duration }]).map(c => c.t)
    .filter(t => t >= TPL_QUICK_EDGE - 1e-9 && t + need <= duration + 1e-9);
  if (!starts.length) return Math.max(0, Math.round(Math.min(TPL_QUICK_EDGE, duration - need) * 1000) / 1000);
  return starts[Math.min(starts.length - 1, Math.floor(tplRandom(String(seed) + ':quick:' + rid) * starts.length))];
}

// The picked videos Selects hasn't analysed, in pick order: [{ rid, path, duration, need, fallback }]. need =
// the longer of the picture's two slots plus TPL_SOURCE_TAIL, in seconds. state: a tplPlanState result (picking never
// depends on video starts, so a provisional plan names them); inv: the inventory (inventory.js).
function tplQuickTargets(state, inv) {
  if (!state || !state.ok) return [];
  const byRid = {};
  for (const r of (inv && inv.resources) || []) byRid[r.rid] = r;
  const N = state.N, slots = state.schedule.slots, out = [];
  state.picks.forEach((p, pos) => {
    const r = byRid[p.rid];
    if (p.kind !== 'video' || !r || r.analysed !== false) return;
    const frames = Math.max(slots[pos].endFrame - slots[pos].startFrame, slots[N + pos].endFrame - slots[N + pos].startFrame);
    const need = Math.round((frames / TPL_PLAN_FPS + TPL_SOURCE_TAIL) * 1000) / 1000;
    out.push({ rid: p.rid, path: r.path || null, duration: r.duration, need, fallback: tplQuickFallback(p.rid, r.duration, need, state.options.seed) });
  });
  return out;
}

// The cover transform of a sized picture: portrait sources anchor the crop 40 % from the top, others centre.
function tplCover(size) {
  if (!size) return null;
  return { cover: tplVisRect(size.width, size.height, TPL_W, TPL_H).cover, anchorY: size.height > size.width ? 0.4 : 0.5 };
}

// scripts/assemble.js cfg. music = ensure-audio's { resourceId } or null (No music).
function tplAssembleConfig(state, music) {
  const vis = {};
  for (const p of state.picks) if (state.sizes[p.rid]) vis[p.rid] = tplCover(state.sizes[p.rid]);
  return {
    projectId: state.projectId,
    draftName: state.draftName,
    slots: state.slots.map(x => ({ rid: x.rid, kind: x.kind, startSeconds: x.kind === 'video' ? x.startSeconds : 0 })),
    targets: state.targets.slice(),
    music: music && state.cue && state.musicStart != null ? { resourceId: music.resourceId, sectionStart: state.musicStart } : null,
    clipSound: state.options.clipSound,
    ambientDb: TPL_AMBIENT_DB,
    vis,
    W: TPL_W, H: TPL_H,
  };
}

// The planned boundaries at a real rate, as assemble.js aims them: round((target + offset) * fps), never re-snapped
// (snapping depends on fps; the Draft was built from the planned targets).
function tplPlannedFrames(state, fps) {
  const off = tplMusicOffset(state.musicStart, fps);
  return state.targets.map((t, k) => (k === 0 ? 0 : Math.round((t + off) * fps)));
}

// A schedule-shaped timing at the Draft's real rate. `frames` (assemble's read-back boundaries) win over the planned
// ones when they differ; the grid units stay the plan's.
function tplTimingAt(state, fps, frames) {
  const planned = tplPlannedFrames(state, fps);
  const f = Array.isArray(frames) ? frames.slice() : planned;
  if (f.length !== planned.length) throw Error('tplTimingAt: the Draft has ' + (f.length - 1) + ' clips (frames), the plan ' + (planned.length - 1));
  const sc = state.schedule;
  const slots = sc.slots.map((x, i) => ({ index: x.index, pass: x.pass, pos: x.pos, units: x.units, startFrame: f[i], endFrame: f[i + 1] }));
  return {
    fps, offset: tplMusicOffset(state.musicStart, fps), gridded: sc.gridded, unitSec: sc.unitSec, N: sc.N, pace: sc.pace, tickUnits: sc.tickUnits,
    units: sc.units.slice(), targets: state.targets.slice(), frames: f, slots,
    totalFrames: f[f.length - 1], lettersStartFrame: f[1],
    planned, framesMatch: planned.every((x, k) => x === f[k]),
  };
}

// A transition's phases in frames at fps; 'slide' (fractions of the slot, drawn by the effect) and 'none' have none.
function tplPhasesFor(kind, fps) {
  if (!kind || kind === 'none' || kind === 'slide') return [];
  return tplPhaseFrames(kind, fps).map(p => ({ name: p.name, start: p.start, end: p.end }));
}

// An Inspector label: the panel's translation (labels, keyed 'torn.<key>', 'letters.<key>', 'motion.<value>', in the
// UI language at the Build click) or the English default (the headless driver passes none).
function tplLabel(labels, key, en) {
  return labels && typeof labels[key] === 'string' && labels[key] ? labels[key] : en;
}

function tplTornEditable(state, labels) {
  const o = state.options;
  const l = (key, en) => tplLabel(labels, key, en);
  return [
    { key: 'look', label: l('torn.look', 'Faded film'), type: 'number', defaultValue: o.look, min: 0, max: 1, step: 0.05 },
    { key: 'backdropColor', label: l('torn.backdropColor', 'Backdrop colour'), type: 'color', defaultValue: TPL_BACKDROP_COLORS[o.backdrop] },
    { key: 'edge', label: l('torn.edge', 'Edge width'), type: 'number', defaultValue: TPL_EDGE, min: 0.5, max: 3, step: 0.1 },
    { key: 'inset', label: l('torn.inset', 'Photo size'), type: 'number', defaultValue: TPL_INSET, min: 70, max: 95, step: 1 },
    { key: 'tilt', label: l('torn.tilt', 'Tilt'), type: 'number', defaultValue: 0, min: -5, max: 5, step: 0.5 },
    { key: 'seed', label: l('torn.seed', 'Tear seed'), type: 'number', defaultValue: 0, min: 0, max: 9999, step: 1 },
    { key: 'motion', label: l('torn.motion', 'Photo motion'), type: 'select', defaultValue: 'off', options: [
      { label: l('motion.off', 'Off'), value: 'off' }, { label: l('motion.push-in', 'Push in'), value: 'push-in' },
      { label: l('motion.pull-out', 'Pull out'), value: 'pull-out' }, { label: l('motion.drift', 'Drift'), value: 'drift' }] },
    { key: 'motionStrength', label: l('torn.motionStrength', 'Motion strength'), type: 'number', defaultValue: TPL_MOTION_STRENGTH, min: 0, max: 1, step: 0.05 },
  ];
}

function tplLettersEditable(state, labels) {
  const o = state.options;
  const seed = typeof o.seed === 'number' && isFinite(o.seed) ? o.seed : 0;
  const l = (key, en) => tplLabel(labels, key, en);
  return [
    { key: 'word1', label: l('letters.word1', 'Word 1'), type: 'text', defaultValue: o.words[0] },
    { key: 'word2', label: l('letters.word2', 'Word 2'), type: 'text', defaultValue: o.words[1] },
    { key: 'size', label: l('letters.size', 'Size'), type: 'number', defaultValue: TPL_LETTER_SIZE, min: 4.5, max: 10, step: 0.1 },
    { key: 'y', label: l('letters.y', 'Vertical position'), type: 'number', defaultValue: TPL_LETTER_Y, min: 30, max: 70, step: 1 },
    { key: 'accent', label: l('letters.accent', 'Accent colour'), type: 'color', defaultValue: TPL_ACCENT },
    { key: 'seed', label: l('letters.seed', 'Letter seed'), type: 'number', defaultValue: Math.max(0, Math.min(999999, Math.round(seed))), min: 0, max: 999999, step: 1 },
    { key: 'restyle', label: l('letters.restyle', 'Re-style'), type: 'boolean', defaultValue: true },
  ];
}

// scripts/decorate.js cfg. assembled = assemble.js's result ({ sequenceId, fps, frames }); assets = { tornTsx,
// lettersTsx, looks (assets/fonts/looks.json), fonts: { family: dataUrl }, labels? (tplLabel) }.
function tplDecorateConfig(state, assembled, assets) {
  const o = state.options, fps = assembled.fps;
  const timing = tplTimingAt(state, fps, assembled.frames);
  const clips = state.slots.map((x, i) => {
    const t = state.transitions[i];
    const seed = tplSeedFor(x.identity, o.seed) % 10000; // small enough for an Inspector field
    const size = state.sizes[x.rid];
    const tilt = o.tilt ? Math.round((tplRandom(seed + ':tilt') * 2 - 1) * TPL_TILT_MAX * 100) / 100 : 0;
    return {
      rid: x.rid,
      sourceStartSeconds: x.kind === 'video' ? x.startSeconds : 0,
      data: {
        seed, vis: tplVisRect(size ? size.width : null, size ? size.height : null, TPL_W, TPL_H).vis,
        inset: TPL_INSET, edge: TPL_EDGE, backdrop: o.backdrop, backdropColor: TPL_BACKDROP_COLORS[o.backdrop], allowPhotoBackdrop: true,
        look: o.look, tilt,
        entry: t.entry, exit: t.exit, phases: { entry: tplPhasesFor(t.entry, fps), exit: tplPhasesFor(t.exit, fps) },
        clock: TPL_EFFECT_CLOCK, motion: 'off', motionStrength: TPL_MOTION_STRENGTH,
      },
    };
  });
  const looks = assets.looks || {};
  return {
    sequenceId: assembled.sequenceId,
    mute: o.clipSound === 'off',
    photos: state.picks.filter(p => p.kind === 'photo').map(p => p.rid),
    torn: { tsx: assets.tornTsx, editable: tplTornEditable(state, assets.labels), clips },
    letters: {
      tsx: assets.lettersTsx,
      parameters: {
        word1: o.words[0], word2: o.words[1], size: TPL_LETTER_SIZE, y: TPL_LETTER_Y, accent: TPL_ACCENT, seed: o.seed, restyle: true,
        ticks: tplLetterTicks(timing),
        looks: looks.looks || [], advance: looks.advance || {}, faces: looks.faces || {}, fonts: assets.fonts || {},
      },
      editable: tplLettersEditable(state, assets.labels),
      startFrame: timing.lettersStartFrame,
      endFrame: timing.totalFrames,
    },
    timing: { fps, framesMatch: timing.framesMatch, planned: timing.planned },
  };
}

// Readback expectations (kit tools/drive/readback.mjs). cuts = every Main clip's end frame as planned at the real
// rate (what assemble.js aims at). Photos keep 0 dB under Ambient (only videos are lowered), so the per-clip level
// check applies to all-video builds only.
function tplExpected(state, assembled, music) {
  const fps = assembled.fps;
  const frames = tplPlannedFrames(state, fps);
  const o = state.options;
  const exp = {
    frameSize: { width: TPL_W, height: TPL_H }, fps,
    cuts: frames.slice(1), noAdjacent: true,
    graphics: [{ name: TPL_LETTERS_NAME, count: 1, startFrame: frames[1], endFrame: frames[frames.length - 1] }],
    effects: [{ name: TPL_TORN_NAME, perMainClip: 1 }],
    music: state.cue && state.musicStart != null ? Object.assign(music && music.resourceId ? { resourceId: music.resourceId } : {}, { db: 0, fadeOutSeconds: TPL_MUSIC_FADE }) : { none: true },
  };
  if (o.clipSound === 'off') exp.clipSound = { mode: 'off' };
  else if (state.picks.every(p => p.kind === 'video')) exp.clipSound = { mode: 'level', db: o.clipSound === 'ambient' ? TPL_AMBIENT_DB : 0 };
  return exp;
}
// tpl-config:end

// tpl-letters:start
// Pure helpers (no DOM, no React); the tests and the panel preview run this block as is.
var TPL_MAX_LETTERS = 8;
var TPL_CAP_RATIO = 0.7; // cap height / font size used to turn the glyph height into a font size
// Chip padding, fraction of the glyph height: the chips are cut close around the glyph, and each chip draws its own
// horizontal and vertical padding, so chips differ slightly in width and height.
var TPL_PAD_MIN = 0.03, TPL_PAD_MAX = 0.07;
var TPL_ROT_MAX = 3; // degrees
var TPL_JITTER_MAX = 0.06; // baseline jitter, fraction of the glyph height
var TPL_GAP = 0.02; // space between chips, fraction of the glyph height
var TPL_LEFT = 0.05, TPL_RIGHT = 0.94, TPL_BAND = 0.32, TPL_MIN_GLYPH = 0.045;
var TPL_FALLBACK_EM = 0.75, TPL_WIDE_EM = 1.0, TPL_SPACE_EM = 0.3, TPL_DEFAULT_EM = 0.6;
var TPL_HEART = { ch: "\u2665", em: 0.9 };
var TPL_ACCENT_BASE = "#d0201a";
var TPL_SUPPORTED = /^[A-Za-z0-9.,!?&'\-]$/;

// Seeded random stream from a seed and salts (FNV-1a hash into mulberry32).
function tplRng() {
  var s = Array.prototype.join.call(arguments, "|");
  var h = 2166136261;
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  var a = h >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Trimmed word -> at most 8 graphemes; inner whitespace runs become one " " gap.
function tplGraphemes(text) {
  if (typeof text !== "string") return [];
  var t = text.trim().replace(/\s+/g, " ");
  if (!t) return [];
  var out = [];
  if (typeof Intl !== "undefined" && Intl && typeof Intl.Segmenter === "function") {
    var it = new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(t);
    for (var seg of it) { out.push(seg.segment); if (out.length >= TPL_MAX_LETTERS) break; }
  } else {
    out = Array.from(t).slice(0, TPL_MAX_LETTERS);
  }
  return out;
}

function tplSupported(ch) {
  return ch === TPL_HEART.ch || (typeof ch === "string" && TPL_SUPPORTED.test(ch));
}

function tplKind(ch) {
  if (ch === " ") return "space";
  if (ch === TPL_HEART.ch) return "heart";
  return tplSupported(ch) ? "glyph" : "fallback";
}

// The character a look shows for a typed letter.
function tplCased(ch, look) {
  if (!look || look.case === "any") return ch;
  return look.case === "lower" ? ch.toLowerCase() : ch.toUpperCase();
}

// Advance table lookup (per 1000 em) -> em; null when the face lacks the character.
function tplFaceEm(advance, face, ch) {
  var t = advance && advance[face];
  if (!t) return null;
  var v = t[ch];
  return typeof v === "number" && isFinite(v) && v > 0 ? v / 1000 : null;
}

// Width in em of a letter: the widest of the given faces (all faces of the table when
// null), upper and lower case both counted so the slot fits every look of the letter.
function tplLetterEm(ch, faces, advance) {
  var kind = tplKind(ch);
  if (kind === "space") return TPL_SPACE_EM;
  if (kind === "heart") return TPL_HEART.em;
  if (kind === "fallback") {
    var cp = ch.codePointAt(0) || 0;
    return cp >= 0x1100 ? TPL_WIDE_EM : TPL_FALLBACK_EM;
  }
  var list = faces || Object.keys(advance || {});
  var best = 0;
  for (var i = 0; i < list.length; i++) {
    var cs = [ch.toUpperCase(), ch.toLowerCase()];
    for (var j = 0; j < cs.length; j++) {
      var e = tplFaceEm(advance, list[i], cs[j]);
      if (e != null && e > best) best = e;
    }
  }
  return best > 0 ? best : TPL_DEFAULT_EM;
}

// A look in the accent colour (fg or bg is the base red).
function tplIsAccent(look) {
  var f = look && typeof look.fg === "string" ? look.fg.toLowerCase() : "", b = look && typeof look.bg === "string" ? look.bg.toLowerCase() : "";
  return f === TPL_ACCENT_BASE || b === TPL_ACCENT_BASE;
}
// A look's sampling weight: look.weight (>= 0), 1 when missing.
function tplWeight(look) {
  var w = look && look.weight;
  return typeof w === "number" && isFinite(w) ? Math.max(0, w) : 1;
}

// Per letter a seeded set of 2-4 distinct look ids, drawn by look weight (weighted sampling
// without replacement; weight 0 = never). The first id is the letter's look at tick 0 and
// differs from its neighbour's when possible; at most one lower-case look per letter; a look
// whose face lacks the (cased) glyph is not offered. Accent (red) looks are offered to one
// seeded letter only, which always gets exactly one of them, so at most one red letter is
// ever visible and it comes and goes as that letter re-styles. Gaps and unsupported
// characters get [] (no chip / fallback chip).
function tplAssignLooks(letters, seed, looks, advance) {
  var out = [];
  var prevFirst = null;
  var styled = [];
  for (var q = 0; q < letters.length; q++) { var kq = tplKind(letters[q]); if (kq === "glyph" || kq === "heart") styled.push(q); }
  var accentAt = styled.length ? styled[Math.floor(tplRng(seed, "accent")() * styled.length)] : -1;
  for (var i = 0; i < letters.length; i++) {
    var ch = letters[i];
    var kind = tplKind(ch);
    if (kind === "space" || kind === "fallback") { out.push([]); continue; }
    var cands = [], accents = [];
    for (var k = 0; k < (looks || []).length; k++) {
      var lk = looks[k];
      if (!lk || typeof lk.id !== "string" || !(tplWeight(lk) > 0)) continue;
      if (kind === "glyph" && advance && advance[lk.face] && tplFaceEm(advance, lk.face, tplCased(ch, lk)) == null) continue;
      if (tplIsAccent(lk)) accents.push(lk); else cands.push(lk);
    }
    var rnd = tplRng(seed, "looks", i);
    // Weighted order: key = u^(1/w), highest first (Efraimidis-Spirakis).
    var keyed = cands.map(function (l) { return { l: l, key: Math.pow(rnd(), 1 / tplWeight(l)) }; });
    keyed.sort(function (x, y) { return y.key - x.key; });
    cands = keyed.map(function (x) { return x.l; });
    var want = 2 + Math.floor(rnd() * 3);
    var set = [], lower = false;
    if (i === accentAt && accents.length) {
      var pick = accents[Math.floor(rnd() * accents.length)];
      // The accent look is always kept: a lower-case accent takes the letter's one lower-case slot.
      if (pick.case === "lower") cands = cands.filter(function (l) { return l.case !== "lower"; });
      cands.splice(Math.floor(rnd() * Math.min(cands.length + 1, want)), 0, pick);
    }
    for (var c = 0; c < cands.length && set.length < want; c++) {
      if (cands[c].case === "lower") { if (lower) continue; lower = true; }
      set.push(cands[c].id);
    }
    if (prevFirst != null && set.length > 1 && set[0] === prevFirst) { var t0 = set[0]; set[0] = set[1]; set[1] = t0; }
    if (prevFirst != null && set[0] === prevFirst) {
      // Only one look chosen so far: try any other candidate for the opening look.
      for (var d = 0; d < cands.length; d++) if (cands[d].id !== prevFirst && set.indexOf(cands[d].id) < 0) { set[0] = cands[d].id; break; }
    }
    out.push(set);
    prevFirst = set.length ? set[0] : prevFirst;
  }
  return out;
}

// Look ids of every letter at a tick. Each tick a seeded ~40 % of the letters that have
// more than one look switch to another of their looks; at least one letter keeps its look.
function tplLooksAt(tick, seed, assigned) {
  var n = assigned.length;
  var idx = [];
  var eligible = [], styled = 0;
  for (var i = 0; i < n; i++) {
    idx.push(0);
    if (assigned[i].length > 0) styled++;
    if (assigned[i].length > 1) eligible.push(i);
  }
  var T = Math.max(0, Math.floor(tick || 0));
  var ne = eligible.length;
  for (var t = 1; t <= T && ne > 0; t++) {
    var rnd = tplRng(seed, "tick", t);
    var k;
    if (ne >= 2) k = Math.min(ne - 1, Math.max(1, Math.round(0.4 * ne)));
    else k = n > 1 && rnd() < 0.4 ? 1 : 0;
    var order = eligible.slice();
    for (var s = order.length - 1; s > 0; s--) { var r = Math.floor(rnd() * (s + 1)); var tmp = order[s]; order[s] = order[r]; order[r] = tmp; }
    for (var j = 0; j < k; j++) {
      var li = order[j], len = assigned[li].length;
      var step = Math.floor(tplRng(seed, "swap", t, li)() * (len - 1));
      idx[li] = step >= idx[li] ? step + 1 : step;
    }
  }
  var out = [];
  for (var q = 0; q < n; q++) out.push(assigned[q].length ? assigned[q][idx[q]] : null);
  return out;
}

function tplLookAt(letterIndex, tickIndex, seed, assigned) {
  return tplLooksAt(tickIndex, seed, assigned)[letterIndex];
}

// Re-style index at a frame of the graphic: the number of ticks <= frame (ticks are
// relative to the graphic's frame 0); always 0 when re-style is off.
function tplTickIndex(frame, ticks, restyle) {
  if (restyle === false || !Array.isArray(ticks)) return 0;
  var c = 0;
  for (var i = 0; i < ticks.length; i++) if (typeof ticks[i] === "number" && isFinite(ticks[i]) && ticks[i] <= frame) c++;
  return c;
}

// A look with the base red (#d0201a) replaced by the accent colour.
function tplApplyAccent(look, accent) {
  var ok = typeof accent === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(accent);
  var out = {};
  for (var key in look) out[key] = look[key];
  if (!ok) return out;
  if (typeof out.fg === "string" && out.fg.toLowerCase() === TPL_ACCENT_BASE) out.fg = accent;
  if (typeof out.bg === "string" && out.bg.toLowerCase() === TPL_ACCENT_BASE) out.bg = accent;
  return out;
}

// Chip layout in px of a W x H frame. words: two words (strings or grapheme arrays);
// size: cap height in % of H; y: vertical centre in % of H; advance: the looks.json
// advance table (widest face per letter) or a function (ch, word, i, flatIndex) -> em.
// Word 1 starts at 5 % W, word 2 ends at 94 % W; each word grows inward up to 32 % W, then
// the whole word shrinks down to 4.5 % H. A word that still does not fit is shrunk further
// to stay in its band and the result says fits:false. Slots (x, w) use the widest look and
// the maximum padding, so they do not depend on the seed; pad (vertical), padX, rot and
// jitter are seeded per chip.
// Returns { fits, chips: [{ x, y, w, h, rot, jitter, pad, padX, glyph, fontPx, em, ch, kind, word, index }] }.
function tplLayout(words, size, y, advance, W, H, seed) {
  W = W || 1440; H = H || 1080;
  var g0 = (size / 100) * H;
  var cy = (y / 100) * H;
  var band = TPL_BAND * W;
  var chips = [], fits = true, flat = 0;
  for (var wi = 0; wi < 2; wi++) {
    var src = words && words[wi];
    var gs = typeof src === "string" ? tplGraphemes(src) : Array.isArray(src) ? src.slice(0, TPL_MAX_LETTERS) : [];
    if (!gs.length) continue;
    var ems = [];
    var unit = 0; // word width divided by the glyph height
    for (var i = 0; i < gs.length; i++) {
      var ch = gs[i], kind = tplKind(ch);
      var em = kind === "glyph" && typeof advance === "function" ? advance(ch, wi, i, flat + i) : tplLetterEm(ch, null, typeof advance === "function" ? null : advance);
      if (!(em > 0)) em = TPL_DEFAULT_EM;
      ems.push(em);
      unit += em / TPL_CAP_RATIO + 2 * TPL_PAD_MAX + (i > 0 ? TPL_GAP : 0);
    }
    var g = g0;
    if (g * unit > band) {
      g = band / unit;
      if (g < TPL_MIN_GLYPH * H - 1e-9) fits = false;
    }
    var fontPx = g / TPL_CAP_RATIO;
    var x = wi === 0 ? TPL_LEFT * W : TPL_RIGHT * W - g * unit;
    for (var j = 0; j < gs.length; j++) {
      var rnd = tplRng(seed, "chip", flat + j);
      var pad = (TPL_PAD_MIN + rnd() * (TPL_PAD_MAX - TPL_PAD_MIN)) * g;
      var rot = (rnd() * 2 - 1) * TPL_ROT_MAX;
      var jitter = (rnd() * 2 - 1) * TPL_JITTER_MAX * g;
      var padX = (TPL_PAD_MIN + rnd() * (TPL_PAD_MAX - TPL_PAD_MIN)) * g;
      var w = ems[j] * fontPx + 2 * TPL_PAD_MAX * g;
      var h = g + 2 * pad;
      chips.push({ x: x, y: cy - h / 2, w: w, h: h, rot: rot, jitter: jitter, pad: pad, padX: padX, glyph: g, fontPx: fontPx, em: ems[j], ch: gs[j], kind: tplKind(gs[j]), word: wi, index: flat + j });
      x += w + TPL_GAP * g;
    }
    flat += gs.length;
  }
  return { fits: fits, chips: chips };
}
// tpl-letters:end

// tpl-panel-logic:start
// Build orchestration shared by Build and "Finish letters and look". Plain JS: the tests run this block in node:vm
// after planner.js, build-config.js and the letters helpers. Every host call comes in through `d`:
//   d = { run(summary, script, allowCommit) -> result (throws on failure), check() (throws TPL_STALE when the Project
//         changed), advance(stepId, fraction, detail), scripts: { inventoryJs, searchJs, ensureJs, assembleJs,
//         decorateJs }, readAssets() -> { tornTsx, lettersTsx, looks, fonts }, onSearch?, onAssembled?, onDecorated?,
//         signal? (AbortSignal: stops the quick score), quickScoreAll? / quickDataDir? (the quick score and its data
//         folder; default: the kit block's quickScoreAll and tplQuickDataDir() when the panel defines them) }
// Configs come only from tplPlanState / tplAssembleConfig / tplDecorateConfig, so the headless driver
// (dev/driveAdapter.mjs) and the panel build identical Drafts.
const TPL_STALE = new Error('The Project changed during the build.');
// Four videos per scene-search call keeps a call inside run_script's 30 s deadline.
const TPL_SEARCH_BATCH = 4;
// Tempo stand-in for own music without a detected tempo: the cuts use the fixed 0.35 s unit, the section snaps to 0.1 s.
const TPL_OWN_NOMINAL_BPM = 85.6;

function tplDeepFreeze(v) {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) {
    Object.freeze(v);
    for (const k of Object.keys(v)) tplDeepFreeze(v[k]);
  }
  return v;
}

// Everything a build uses, copied and frozen at the click: later panel edits never reach a running build.
function tplFreezeBuild(inputs) { return tplDeepFreeze(JSON.parse(JSON.stringify(inputs))); }

// Throws TPL_STALE once the panel's Project is no longer the frozen one. Called after every await.
function tplStaleCheck(projectRef, pid) {
  return function () { if (projectRef.current !== pid) throw TPL_STALE; };
}

// Single flight. The ref is checked and taken synchronously, before any await, so a double click (or a click before
// React re-renders the disabled button) is ignored. Only the run holding the ref releases it: a Project switch clears
// the ref, and a stale run finishing later must not release a newer run's hold.
async function tplExclusive(busyRef, fn) {
  if (busyRef.current) return { skipped: true };
  const token = {};
  busyRef.current = token;
  try { return await fn(token); } finally { if (busyRef.current === token) busyRef.current = null; }
}

// Script config in as JSON.parse of a string, so run_script's type check sees `any` (an inlined literal widens
// `type: "text"` to string, which EditableParameterDefinition[] rejects).
function tplFill(script, cfg) { return script.replace('__CONFIG__', () => 'JSON.parse(' + JSON.stringify(JSON.stringify(cfg)) + ')'); }

// Wide characters (Hangul, kana, CJK, fullwidth) count as 2 toward a word's limit: the ranges of the runtime's WIDE_RE.
const TPL_WIDE = /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]/;

// A word as typed: leading space dropped, whitespace runs collapsed, at most 8 letters (graphemes; a wide one counts 2).
function tplClampWord(text) {
  const s = String(text == null ? '' : text).replace(/^\s+/, '').replace(/\s+/g, ' ');
  const parts = typeof Intl !== 'undefined' && Intl && typeof Intl.Segmenter === 'function'
    ? Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s), x => x.segment) : Array.from(s);
  const out = [];
  let n = 0;
  for (const p of parts) {
    n += TPL_WIDE.test(p) ? 2 : 1;
    if (n > TPL_MAX_LETTERS) break;
    out.push(p);
  }
  return out.join('');
}

// Progress only moves forward.
function tplForward(prev, next) { return prev && next.value < prev.value - 1e-9 ? prev : next; }

// Read-only scripts (never committing).
function tplDraftsScript(projectId, name) {
  return 'const f = await selects.project(' + JSON.stringify(projectId) + ').readFootage();\n'
    + 'return { ids: (f.drafts || []).filter(d => d.name === ' + JSON.stringify(name) + ').map(d => d.sequenceId) };';
}
function tplReadbackScript(sequenceId) {
  return 'const d = selects.draft(' + JSON.stringify(sequenceId) + ');\n'
    + 'const fps = (await d.meta()).fps;\n'
    + 'const rows = (await d.clips({ trackScope: "main" })).filter(c => c.resourceId !== null);\n'
    + 'const frames = rows.length ? [rows[0].startFrame, ...rows.map(c => c.endFrame)] : [0];\n'
    + 'return { sequenceId: ' + JSON.stringify(sequenceId) + ', fps, frames, totalFrames: frames[frames.length - 1], placed: rows.length, notes: ["Selects did not confirm the save; the Draft was found by its name"] };';
}
// ensure-audio.js without the import: the music resource already imported from `path`, or { resourceId: null }. The
// same normalised match as ensure-audio.js (NFC, "\\" as "/", case-folded; a same-named file of the same length).
function tplFindAudioScript(projectId, path, duration) {
  return 'const cfg = ' + JSON.stringify({ projectId: projectId, path: path, duration: duration }) + ';\n'
    + 'const p = selects.project(cfg.projectId);\n'
    + 'const norm = s => String(s || "").normalize("NFC").replace(/\\\\/g, "/").toLowerCase();\n'
    + 'const base = s => norm(s).split("/").pop();\n'
    + 'const paths = {};\n'
    + 'const walk = nodes => { for (const n of nodes || []) { if (n.type === "dir") walk(n.children); else if (n.resourceId && n.path) paths[n.resourceId] = n.path; } };\n'
    + 'const files = await p.sourceFiles();\n'
    + 'if ("fileTree" in files) walk(files.fileTree);\n'
    + 'else for (const f of files.folders || []) { const d = await p.sourceFiles({ folder: f.name }); if ("fileTree" in d) walk(d.fileTree); }\n'
    + 'const audio = (await p.resources()).filter(r => r.type === "Audio");\n'
    + 'const want = norm(cfg.path), wantName = base(cfg.path);\n'
    + 'const sameLength = r => typeof cfg.duration === "number" && typeof r.durationSeconds === "number" && Math.abs(r.durationSeconds - cfg.duration) <= 0.5;\n'
    + 'const existing = audio.find(r => norm(paths[r.resourceId]) === want)\n'
    + '  || audio.find(r => ((paths[r.resourceId] && base(paths[r.resourceId]) === wantName) || norm(r.name) === wantName) && sameLength(r));\n'
    + 'return { resourceId: existing ? existing.resourceId : null, imported: false };';
}
function tplOpenScript(sequenceId) {
  return 'const id = ' + JSON.stringify(sequenceId) + ';\n'
    + 'let link = null, openError = null;\n'
    + 'try { link = (await selects.editor.linkToDraftFrame(id, 0)).deepLinkUrl; } catch (e) { link = null; }\n'
    + 'try { await selects.editor.openDraft(id); } catch (e) { openError = String((e && e.message) || e); }\n'
    + 'return { link, openError };';
}

function tplMessage(e) { return String((e && e.message) || e); }
// An error with English text (tests, logs) and say(lang) for the panel's UI language.
function tplSay(message, say) { const e = Error(message); e.say = say; return e; }
// An error's text in the UI language: its say(lang), else its message (SDK and script details stay English).
function tplSayOf(lang, e) { return e && typeof e.say === 'function' ? e.say(lang) : tplMessage(e); }

// A committing call is sent once. When it fails (possibly after its commit landed), `recover` looks, read-only, for
// what the commit would have made; found -> use it, else the original error (with the recovery's own error appended
// when it failed too, e.g. "several new Drafts ..."). Never resent.
async function tplCommit(d, summary, script, recover) {
  try { return await d.run(summary, script, true); }
  catch (e) {
    if (e === TPL_STALE) throw e;
    d.check();
    let got = null, why = null;
    try { got = await recover(); } catch (r) { if (r === TPL_STALE) throw r; got = null; why = r; }
    d.check();
    if (got) return got;
    if (why) throw tplSay(tplMessage(e) + ' (' + tplMessage(why) + ')', (l) => tplSayOf(l, e) + ' (' + tplSayOf(l, why) + ')');
    throw e;
  }
}

// The build from frozen inputs f = { projectId, inventory: { photos, resources }, found: { best, failed } | null
// (this Project's cached scene search), cue (manifest cue, own-music grid or null), musicPath, options, now, clock }.
// Steps: pictures (the frozen snapshot) -> moments (scene search for the picked videos only, when photos don't cover
// N) -> plan (tplPlanState + ensure-audio) -> place (assemble, commit 1) -> decorate (commit 2) + open.
async function tplRunBuild(f, d) {
  const pid = f.projectId, notes = [];
  const base = { projectId: pid, inv: f.inventory, cue: f.cue, options: f.options, now: f.now };
  const cachedBest = f.found && f.found.best ? f.found.best : {};
  const cachedFailed = f.found && Array.isArray(f.found.failed) ? f.found.failed : [];
  d.advance('pictures', 0);
  // Picking never depends on video start times, so a plan with the cached hits already names the pictures.
  const pre = tplPlanState(Object.assign({}, base, { found: { best: cachedBest } }));
  if (!pre.ok) throw tplSay(pre.reason, (l) => t(l, "reason." + pre.code, pre.vars));
  d.advance('pictures', 1, (l) => t(l, "detail.pictures", { count: pre.picks.length }));

  const best = Object.assign({}, cachedBest);
  const picked = pre.picks.filter(p => p.kind === 'video').map(p => p.rid);
  // Scene search needs Selects' analysis: analysed clips are searched (as before), the others get the quick score.
  const quickTargets = tplQuickTargets(pre, f.inventory);
  const quickRids = quickTargets.map(x => x.rid);
  const todo = picked.filter(rid => quickRids.indexOf(rid) < 0 && (!(rid in best) || cachedFailed.indexOf(rid) >= 0));
  // The moments bar: the searches first, then the quick score, each by its share of the clips.
  const share = todo.length / Math.max(1, todo.length + quickTargets.length);
  let failed = [];
  for (let i = 0; i < todo.length; i += TPL_SEARCH_BATCH) {
    d.advance('moments', share * i / todo.length, (l) => t(l, "detail.clipsChecked", { done: i, count: todo.length }));
    const batch = todo.slice(i, i + TPL_SEARCH_BATCH);
    const r = await d.run('Find moments', tplFill(d.scripts.searchJs, { projectId: pid, rids: batch, pageSize: 4, parallel: 4 }), false);
    d.check();
    for (const rid of batch) best[rid] = r && r.best && typeof r.best[rid] === 'number' && isFinite(r.best[rid]) ? r.best[rid] : null;
    failed = failed.concat((r && r.failed) || []);
  }
  // Only scene-search results are kept for later builds: a clip analysed meanwhile is searched next time.
  if (todo.length && d.onSearch) d.onSearch({ best, failed: cachedFailed.filter(rid => todo.indexOf(rid) < 0).concat(failed) });
  const quick = await tplQuickMoments(pid, quickTargets, d, (done, count) => {
    if (count) d.advance('moments', share + (1 - share) * done / count, (l) => t(l, "detail.checkingClips", { done, count }));
  });
  d.check();
  d.advance('moments', 1, todo.length || quickTargets.length ? null : picked.length ? (l) => t(l, "detail.alreadyFound") : (l) => t(l, "detail.photosOnly"));

  d.advance('plan', 0);
  const state = tplPlanState(Object.assign({}, base, { found: { best: Object.assign({}, best, quick.starts) } }));
  if (!state.ok) throw tplSay(state.reason, (l) => t(l, "reason." + state.code, state.vars));
  if (state.picks.map(p => p.rid).join('|') !== pre.picks.map(p => p.rid).join('|')) throw tplSay('The pictures changed while planning. Press Build again.', (l) => t(l, "picturesChanged"));
  const unchecked = failed.filter(rid => picked.indexOf(rid) >= 0).length;
  let music = null;
  if (state.cue && state.musicStart != null && f.musicPath) {
    d.advance('plan', 0.5, (l) => t(l, "detail.addingMusic"));
    // The track's length lets ensure-audio match the cue by file name when the host spells its path differently.
    const duration = f.cue && typeof f.cue.duration === 'number' && f.cue.duration > 0 ? f.cue.duration : undefined;
    music = await tplCommit(d, 'Add music to the project', tplFill(d.scripts.ensureJs, { projectId: pid, path: f.musicPath, duration }), async () => {
      const r = await d.run('Look for the music', tplFindAudioScript(pid, f.musicPath, duration), false);
      return r && r.resourceId ? r : null;
    });
    d.check();
  }
  d.advance('plan', 1);

  d.advance('place', 0);
  const named = async () => {
    const r = await d.run('Check Drafts', tplDraftsScript(pid, state.draftName), false);
    return r && Array.isArray(r.ids) ? r.ids : [];
  };
  // The Drafts already named like this one, so a lost reply can tell the new Draft apart.
  let before = null;
  try { before = await named(); } catch (e) { if (e === TPL_STALE) throw e; before = null; }
  d.check();
  // The one Draft named like this build that was not there before, read back; null when there is none.
  const findNew = async () => {
    const after = await named();
    d.check();
    const fresh = before ? after.filter(id => before.indexOf(id) < 0) : after;
    if (fresh.length > 1) throw tplSay('several new Drafts are named "' + state.draftName + '"', (l) => t(l, "severalDrafts", { name: state.draftName }));
    if (fresh.length !== 1) return null;
    return await d.run('Read the new Draft', tplReadbackScript(fresh[0]), false);
  };
  let assembled = await tplCommit(d, 'Placing pictures', tplFill(d.scripts.assembleJs, tplAssembleConfig(state, music)), findNew);
  d.check();
  if (!assembled || !assembled.sequenceId) {
    // The commit returned but without the new Draft's id: the same read-only recovery as a lost reply; never resent.
    let got = null, why = null;
    try { got = await findNew(); } catch (r) { if (r === TPL_STALE) throw r; why = r; }
    d.check();
    if (!got || !got.sequenceId) {
      const name = state.draftName;
      throw tplSay('The Draft "' + name + '" was saved, but Selects did not report its id' + (why ? ' (' + tplMessage(why) + ')' : '') + '. Open it from the Drafts list, or build again.',
        (l) => (why ? t(l, "draftNoIdWhy", { name, detail: tplSayOf(l, why) }) : t(l, "draftNoId", { name })));
    }
    assembled = got;
  }
  if (assembled.notes && assembled.notes.length) notes.push.apply(notes, assembled.notes);
  if (d.onAssembled) d.onAssembled(state, assembled);
  d.advance('place', 1);
  const done = await tplFinish(state, assembled, d);
  return { state, assembled, notes, unchecked, quick: quick.stats, link: done.link, openError: done.openError };
}

// Starts for the picked clips Selects hasn't analysed (tplQuickTargets): each clip's stillest clean window from the
// kit's quick score (pickWindowsLocal role 'still'), else its seeded fallback start (tplQuickFallback) when the host has
// no ffmpeg, a clip fails or the shared budget runs out; the build never fails because of the score. Mixed Projects:
// TPL never ranks clips against each other by score (the picks come from date strata, photos first), so the score only
// chooses a window inside each clip; analysed clips keep their scene-search hit. Throws TPL_STALE when the Project
// changed and `d.signal` stopped it. progress(done, count) after each clip.
// The kit caches by resource id, and a Project's ids (r0, r1, ...) repeat across Projects, so the id it sees is
// qualified with the Project id.
async function tplQuickMoments(pid, targets, d, progress) {
  const starts = {}, how = {};
  for (const x of targets) { starts[x.rid] = x.fallback; how[x.rid] = 'fallback'; }
  const stats = { clips: targets.length, scored: 0, fallback: targets.length, ms: 0 };
  if (!targets.length) return { starts, how, stats };
  const all = typeof d.quickScoreAll === 'function' ? d.quickScoreAll : typeof quickScoreAll === 'function' ? quickScoreAll : null;
  const dataDir = d.quickDataDir !== undefined ? d.quickDataDir : typeof tplQuickDataDir === 'function' ? tplQuickDataDir() : null;
  if (!all) return { starts, how, stats };
  const began = Date.now();
  const key = rid => String(pid) + '_' + rid;
  progress(0, targets.length);
  let results = null;
  try {
    results = await all(targets.map(x => ({ rid: key(x.rid), path: x.path, durationSeconds: x.duration })),
      { concurrency: TPL_QUICK_PARALLEL, budgetMs: TPL_QUICK_BUDGET_MS, signal: d.signal, dataDir, onProgress: p => progress(p.done, p.total) });
  } catch (e) {
    d.check();
    if (d.signal && d.signal.aborted) throw TPL_STALE;
    results = null;
  }
  stats.ms = Date.now() - began;
  for (const x of targets) {
    const r = results && typeof results.get === 'function' ? results.get(key(x.rid)) : null;
    if (!r || r.fallback) continue;
    let ranked = [];
    try { ranked = pickWindowsLocal(r, 'still', x.need); } catch (e) { ranked = []; }
    if (!ranked.length || !(ranked[0].start >= 0)) continue;
    starts[x.rid] = ranked[0].start; how[x.rid] = r.cached ? 'cached' : 'scored';
    stats.scored++; stats.fallback--;
  }
  return { starts, how, stats };
}

// Commit 2 (decorate.js skips what an earlier attempt added, and is a no-op when complete) and opening the Draft.
// "Finish letters and look" calls this again with the frozen state; never automatically.
async function tplFinish(state, assembled, d) {
  d.advance('decorate', 0);
  try {
    const assets = await d.readAssets();
    d.check();
    const r = await d.run('Add letters and paper', tplFill(d.scripts.decorateJs, tplDecorateConfig(state, assembled, assets)), true);
    d.check();
    if (d.onDecorated) d.onDecorated(r);
  } catch (e) {
    if (e === TPL_STALE) throw e;
    // decorate.js refuses a Draft whose Main clips differ from the plan (edited meanwhile): retrying can't fix that.
    const why = tplMessage(e);
    const rebuild = /pictures don't match the \d+ planned/.test(why);
    const advice = rebuild ? 'Its clips no longer match the plan, so press Build to make a new Draft.' : 'Press Finish letters and look to try again.';
    throw tplSay('The Draft was created, but its letters and paper could not be added: ' + why + '. ' + advice,
      (l) => (rebuild ? t(l, "finishFailedRebuild", { detail: tplSayOf(l, e) }) : t(l, "finishFailed", { detail: tplSayOf(l, e) })));
  }
  // A Clip highlights run (d.open === false) leaves the Draft closed: the app announces it.
  if (d.open === false) { d.advance('decorate', 1); return { link: null, openError: null }; }
  d.advance('decorate', 0.8, (l) => t(l, "detail.openingDraft"));
  let link = null, openError = null;
  try {
    const o = await d.run('Open the new Draft', tplOpenScript(assembled.sequenceId), false);
    link = (o && o.link) || null; openError = (o && o.openError) || null;
  } catch (e) { openError = String((e && e.message) || e); }
  d.check();
  d.advance('decorate', 1);
  return { link, openError };
}
// tpl-panel-logic:end

// The kit's quick local shot score (selects-app-kit tools/panel/quick-score.js), pasted verbatim: tests/quick-score.test.cjs
// checks it, and changes go to the kit, never here.
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

// Torn Paper Love's data folder for the quick score's cache (<home>/.selects/plugin-data/torn-paper-love, joined by the
// host's FileSystem; no shell), or null when this Selects build can't name it (the quick score then falls back).
function tplQuickDataDir(): string | null {
  try {
    const fs = hostSdk?.files;
    if (fs && typeof fs.join === "function" && typeof fs.homedir === "function") return String(fs.join(fs.homedir(), ".selects", "plugin-data", PLUGIN_ID));
  } catch { /* no host */ }
  return null;
}

// tpl-host:start
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
// A short audio file cut by the host's ffmpeg, as bytes: `args` are the ffmpeg arguments between the input and the
// output (codec, filters, format), the output goes to an ASCII temporary file in `dataDir` that is read back and removed.
// `seekSeconds`/`seconds` select the span. null when this host has no ffmpeg, no file reads or no data folder; throws
// when ffmpeg fails or `signal` (optional) aborts it.
async function hostCutAudio(path, dataDir, seekSeconds, seconds, args, ext, signal, timeoutMs = 60000) {
  const rt = hostApi("Runtime", "runFFmpeg");
  if (!rt || !dataDir || !hostApi("FileSystem", "readFile")) return null;
  const tmp = hostJoin(dataDir, "cut-" + Date.now() + "-" + Math.floor(Math.random() * 1e6) + "." + ext);
  const controller = typeof AbortController === "undefined" ? null : new AbortController();
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  const relay = () => { if (controller) controller.abort(); };
  if (signal) { if (signal.aborted) relay(); else signal.addEventListener("abort", relay); }
  try {
    await rt.runFFmpeg(["-nostdin", "-v", "error", "-y", "-ss", String(seekSeconds), "-t", String(seconds), "-i", path, ...args, tmp], true, controller ? controller.signal : undefined);
    return await hostReadBytes(tmp);
  } finally {
    if (timer) clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", relay);
    await hostRemove(tmp);
  }
}
// tpl-host:end

// tpl-beat-worker:start
// The source of the Web Worker that runs beat-detect.cjs, read from the install folder and used unmodified (one source
// for the CLI, the tests and the panel). The file runs inside a function with its own `module`, `exports` and an inert
// `require`: require.main is undefined, so its CLI branch never runs. The worker answers one { samples, rate } message
// with { ok: analyze(samples, rate) } or { error }. Plain JS, so tests run the same source in node:vm.
function tplBeatWorkerSource(beatDetectText) {
  return '"use strict";\nvar tplBeat = (function () {\n  var module = { exports: {} };\n  var require = function () { return {}; };\n'
    + '  (function (module, exports, require) {\n' + beatDetectText + '\n  })(module, module.exports, require);\n  return module.exports;\n})();\n'
    + 'onmessage = function (e) {\n  try { postMessage({ ok: tplBeat.analyze(e.data.samples, e.data.rate) }); }\n'
    + '  catch (err) { postMessage({ error: String((err && err.message) || err) }); }\n};\n';
}
// tpl-beat-worker:end

// Reads a text file under the install folder; `rel` uses "/" and is joined part by part with the OS separator.
async function readText(root: string, rel: string) { return hostReadText(hostJoin(root, ...rel.split("/"))); }
// The install folder (it holds planner.js) and the data folder (null when this host cannot make it).
const locateRoots = (sdk: any) => hostRoots(sdk, PLUGIN_ID, "planner.js");
// A host error in the UI language: a service this Selects build lacks, or no install folder.
function hostSay(e: any): Say | null {
  return e?.code === "host-missing" ? (l) => t(l, "adapterNeeded", { name: e.member }) : e?.code === "not-found" ? (l) => t(l, "foldersNotFound") : null;
}
// Own music: mono samples at OWN_RATE (the rate beat-detect's cues were measured at), at most OWN_MAX_SECONDS, decoded by
// the host's ffmpeg (hostDecodePcm) and analysed by the kit's beat-detect.cjs in a Web Worker.
const OWN_RATE = 22050;
const OWN_MAX_SECONDS = 360;
// beat-detect's analysis of the samples in a Web Worker (tplBeatWorkerSource), never on the panel's thread: the panel
// CSP allows blob: workers (worker-src * data: blob:). A host that refuses the worker rejects the analysis, and the panel
// falls back to fixed timing. `signal` aborts it (worker.terminate()); so does `timeoutMs` (BEAT_TIMEOUT_MS).
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
// A short orientation hint for the clip list; nothing when the frame size is unknown.
function shapeHint(lang: Lang, width: number | null, height: number | null) {
  if (!(width! > 0) || !(height! > 0)) return "";
  const r = width! / height!;
  return r < 0.9 ? t(lang, "shape.tall") : r > 1.1 ? t(lang, "shape.wide") : t(lang, "shape.square");
}
// Seconds rounded to 0.1 for display (t formats the number for the language).
function tenths(seconds: number) { return Math.round(seconds * 10) / 10; }
// The progress bar's label: step, its name and an optional detail (text or a function of the language).
function progressLabel(lang: Lang, p: any) {
  const vars = { step: p.current + 1, total: TPL_BUILD_STEPS.length, name: t(lang, "step." + p.id), percent: p.percent };
  const detail = typeof p.detail === "function" ? p.detail(lang) : p.detail;
  return detail ? t(lang, "progressDetail", { ...vars, detail }) : t(lang, "progress", vars);
}
// Why a plan can't be built, in the UI language (tplPlanState's code + vars); a thrown planner error stays English.
function planReason(lang: Lang, plan: any) {
  return plan.code ? t(lang, "reason." + plan.code, plan.vars) : String(plan.reason);
}
// Inspector labels written into the Draft (build-config tplLabel keys), in the UI language at the Build click.
function inspectorLabels(lang: Lang): Record<string, string> {
  return {
    "torn.look": t(lang, "fadedFilm"), "torn.backdropColor": t(lang, "param.backdropColor"), "torn.edge": t(lang, "param.edge"),
    "torn.inset": t(lang, "param.inset"), "torn.tilt": t(lang, "tilt"), "torn.seed": t(lang, "param.tearSeed"), "torn.motion": t(lang, "param.motion"),
    "torn.motionStrength": t(lang, "param.motionStrength"), "motion.off": t(lang, "motion.off"), "motion.push-in": t(lang, "motion.push-in"),
    "motion.pull-out": t(lang, "motion.pull-out"), "motion.drift": t(lang, "motion.drift"),
    "letters.word1": t(lang, "word1"), "letters.word2": t(lang, "word2"), "letters.size": t(lang, "param.size"), "letters.y": t(lang, "param.y"),
    "letters.accent": t(lang, "param.accent"), "letters.seed": t(lang, "param.letterSeed"), "letters.restyle": t(lang, "param.restyle"),
  };
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
      const gh = Math.min(18, WAVE_HEIGHT * 0.4), gw = Math.min(4, Math.max(1, w / 4));
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
    <div style={{ minWidth: 0 }}>
      <small style={{ display: "block", marginBottom: 4 }}>{t(lang, "sectionHint")}</small>
      <div ref={wrapRef} role="slider" tabIndex={disabled ? -1 : 0} aria-label={t(lang, "sectionLabel")}
        aria-valuemin={Number((first ?? 0).toFixed(1))} aria-valuemax={Number((last ?? 0).toFixed(1))} aria-valuenow={Number((section ?? 0).toFixed(1))}
        aria-valuetext={section == null ? t(lang, "musicTooShort") : t(lang, "startsAt", { seconds: tenths(section) })} aria-disabled={disabled || undefined}
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

// Live letters preview: a fixed-height strip of the 1440x1080 frame around the letters, drawn with the graphic's own
// layout (tplLayout), looks (tplAssignLooks) and re-style clock (tplLooksAt), on the chosen backdrop. The strip is
// scaled to the panel width and centred; its height never changes, so fonts loading or looks cycling never move the page.
const PREVIEW_H = 64;
// Height of the frame band shown (px of the 1080-high frame), centred on the letters' vertical position.
const PREVIEW_BAND = 220;
// Re-style ticks shown in the preview wrap around here (tplLooksAt replays every tick up to the index).
const PREVIEW_TICKS = 64;
// Each stack ends with the Korean faces of its role, macOS then Windows then Noto (serif faces: AppleMyungjo, Batang,
// Noto Serif KR; the others: Apple SD Gothic Neo, Malgun Gothic, Noto Sans KR), as the graphic's TPL_FACE_STACK.
const PREVIEW_FACE_STACK: Record<string, string> = {
  didone: 'Didot, "Bodoni 72", "Bodoni MT", Georgia, "AppleMyungjo", "Batang", "Noto Serif KR", serif',
  condensed: '"Arial Narrow", "Helvetica Neue Condensed", Impact, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif',
  serif: 'Georgia, "Times New Roman", "AppleMyungjo", "Batang", "Noto Serif KR", serif',
  slab: 'Rockwell, "Roboto Slab", "Courier New", "AppleMyungjo", "Batang", "Noto Serif KR", serif',
  black: '"Arial Black", "Helvetica Neue", Impact, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif',
  typewriter: '"American Typewriter", "Courier New", Courier, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", monospace',
};
// Letters no TPL face draws (Hangul, kana, CJK, accents) sit on plain chips in this serif stack.
const PREVIEW_FALLBACK_STACK = 'Georgia, "Times New Roman", "Noto Serif", "AppleMyungjo", "Batang", "Noto Serif KR", serif';
// Backdrop swatches for the tiles and the preview (Photo: the photo itself, dimmed and blurred).
function backdropFill(id: string) {
  if (id === "photo") return "linear-gradient(120deg, #2a2320, #4a3b33 45%, #231d1b)";
  if (id === "red") return "repeating-linear-gradient(90deg, #4a0f12 0 14%, #3a0b0e 20%, #4a0f12 26%)";
  return (TPL_BACKDROP_COLORS as any)[id] || TPL_BACKDROP_COLORS.night;
}

// The graphic's paper halo for contour-cut looks: 16 text shadows on a ring of radius r.
function previewHalo(color: string, r: number) {
  const out: string[] = [];
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; out.push((Math.cos(a) * r).toFixed(2) + "px " + (Math.sin(a) * r).toFixed(2) + "px 0 " + color); }
  return out.join(", ");
}

function LettersPreview({ lang, word1, word2, seed, looksFile, backdrop }: {
  lang: Lang; word1: string; word2: string; seed: number; looksFile: any; backdrop: string;
}) {
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = React.useState(0);
  // The preview re-styles its letters about every unit (0.35 s), like the graphic on the music grid. The clock lives
  // here so only the preview re-renders on each tick, not the whole panel.
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => { const t = setInterval(() => setTick((n) => n + 1), 350); return () => clearInterval(t); }, []);
  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    setWidth(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const looks: any[] = (looksFile && looksFile.looks) || [];
  const advance: any = (looksFile && looksFile.advance) || {};
  const faces: any = (looksFile && looksFile.faces) || {};
  const g1: string[] = tplGraphemes(word1), g2: string[] = tplGraphemes(word2);
  const key = g1.join("\u0000") + "\u0001" + g2.join("\u0000");
  const letters = React.useMemo(() => g1.concat(g2), [key]);
  const assigned = React.useMemo(() => tplAssignLooks(letters, seed, looks, advance), [letters, seed, looksFile]);
  const byId = React.useMemo(() => {
    const m: Record<string, any> = {};
    for (const l of looks) if (l && typeof l.id === "string") m[l.id] = tplApplyAccent(l, TPL_ACCENT);
    return m;
  }, [looksFile]);
  const layout = React.useMemo(() => {
    // Slot width = the widest of the letter's own looks, exactly as the graphic lays out.
    const em = (ch: string, wi: number, i: number, flat: number) => {
      const fs = (assigned[flat] || []).map((id: string) => byId[id] && byId[id].face).filter(Boolean);
      return tplLetterEm(ch, fs.length ? fs : null, advance);
    };
    return tplLayout([g1, g2], TPL_LETTER_SIZE, TPL_LETTER_Y, em, TPL_W, TPL_H, seed);
  }, [letters, assigned, byId, seed]);
  const current: (string | null)[] = tplLooksAt(tick % PREVIEW_TICKS, seed, assigned);
  const y0 = (TPL_H * TPL_LETTER_Y) / 100 - PREVIEW_BAND / 2;
  const s = width > 0 ? Math.min(width / TPL_W, PREVIEW_H / PREVIEW_BAND) : 0;
  // The torn photo (inset 92 %, off-white torn edge) as a placeholder behind the letters.
  const inset = (100 - TPL_INSET) / 2, edge = (TPL_EDGE / 100) * TPL_W;
  return (
    <div>
      <div ref={wrapRef} aria-label={t(lang, "lettersPreview", { words: [word1, word2].filter((w) => w.trim()).join(" ") })}
        style={{ position: "relative", width: "100%", minWidth: 0, height: PREVIEW_H, overflow: "hidden", borderRadius: "var(--panel-radius, 6px)", background: backdropFill(backdrop) }}>
        {s > 0 ? (
          <div style={{ position: "absolute", left: (width - TPL_W * s) / 2, top: (PREVIEW_H - PREVIEW_BAND * s) / 2, width: TPL_W, height: PREVIEW_BAND, transform: "scale(" + s + ")", transformOrigin: "0 0" }}>
            <div style={{ position: "absolute", left: (inset / 100) * TPL_W - edge, width: (TPL_INSET / 100) * TPL_W + 2 * edge, top: -40, bottom: -40, background: "#e6e0d4", boxShadow: "0 0 24px rgba(0,0,0,0.5)" }} />
            <div style={{ position: "absolute", left: (inset / 100) * TPL_W, width: (TPL_INSET / 100) * TPL_W, top: -40, bottom: -40,
              background: "linear-gradient(115deg, #7d6a5c, #b89a82 40%, #d9c2a8 55%, #6f5e52)", opacity: 0.9 }} />
            {layout.chips.map((c: any) => {
              if (c.kind === "space") return null;
              const look = current[c.index] ? byId[current[c.index] as string] : null;
              const fallback = c.kind === "fallback" || (!look && c.kind !== "heart");
              const bg = fallback ? "#ffffff" : look ? look.bg : "#ffffff";
              const fg = fallback ? "#111111" : look ? look.fg : TPL_ACCENT;
              const lookEm = fallback || c.kind === "heart" || !look ? c.em : tplLetterEm(c.ch, [look.face], advance);
              const lower = !!look && !fallback && look.case === "lower" && /[a-z]/i.test(c.ch);
              const h = lower ? c.h + 0.25 * c.glyph : c.h;
              const w = Math.min(c.w, lookEm * c.fontPx + 2 * c.padX);
              const contour = !fallback && !!look && look.cut === "contour";
              const shadow = "0 " + (0.03 * c.glyph).toFixed(2) + "px " + (0.08 * c.glyph).toFixed(2) + "px rgba(0,0,0,0.22)";
              const box: any = { position: "absolute", left: c.x + (c.w - w) / 2, top: c.y - y0 + c.jitter - (h - c.h) / 2, width: w, height: h, background: contour ? "transparent" : bg,
                boxShadow: contour ? undefined : shadow, transform: "rotate(" + c.rot.toFixed(2) + "deg)",
                display: "flex", alignItems: "center", justifyContent: "center", overflow: "visible" };
              if (c.kind === "heart" && !fallback) {
                return (
                  <div key={c.index} style={box}>
                    <svg width={c.glyph * 1.05} height={c.glyph * 1.05} viewBox="0 0 32 30" style={{ display: "block" }}>
                      <path d="M16 29 C 6 21, 0 15, 0 8.5 C 0 3.6, 3.8 0, 8.4 0 C 11.6 0, 14.3 1.8, 16 4.6 C 17.7 1.8, 20.4 0, 23.6 0 C 28.2 0, 32 3.6, 32 8.5 C 32 15, 26 21, 16 29 Z" fill={fg} />
                    </svg>
                  </div>
                );
              }
              const family = fallback ? PREVIEW_FALLBACK_STACK : '"' + (faces[look.face] || "TPL " + look.face) + '", ' + (PREVIEW_FACE_STACK[look.face] || "serif");
              const outline = !fallback && look.outline;
              const thin = !fallback && !outline && typeof look.thin === "number" && look.thin > 0 ? look.thin * c.fontPx : 0;
              return (
                <div key={c.index} style={box}>
                  <span style={{ display: "inline-block", fontFamily: family, fontSize: c.fontPx, lineHeight: 1, whiteSpace: "pre", color: outline ? "transparent" : fg,
                    WebkitTextStroke: outline ? Math.max(1, c.fontPx * 0.035).toFixed(2) + "px " + fg : thin ? thin.toFixed(2) + "px " + bg : undefined,
                    textShadow: contour ? previewHalo(bg, c.pad + 0.02 * c.glyph) : undefined, filter: contour ? "drop-shadow(" + shadow + ")" : undefined,
                    transform: "translateY(0.04em)" } as any}>
                    {fallback ? c.ch : tplCased(c.ch, look)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
      {!layout.fits ? <small style={{ display: "block", marginTop: 4, color: "var(--panel-muted-fg)" }}>{t(lang, "wordsTooLong")}</small> : null}
    </div>
  );
}

const TEMPLATE_FAILED = "Torn Paper Love couldn't make the timeline. Try again.";

// The app hands a template its own Resource ids, but every run_script read
// (resources(), clips()) speaks the short ids the script SDK gives out (r0, r1…).
// The app's list (sdk.call) and the script's list are the Project's Resources in
// the same order, so they pair up row by row; names and types are compared so a
// list that changed in between is refused rather than mismatched.
async function scriptResourceIds(sdk, projectId, resourceIds) {
  const app = await sdk.call("listProjectResources", projectId);
  if (!Array.isArray(app)) throw new Error("Could not read the project resources.");
  const indices = [...new Set(resourceIds)].map(id => app.findIndex(r => r.resourceId === id));
  if (indices.includes(-1)) throw new Error("A picked file is missing from this project.");
  const run = await readMediaPages(sdk, { summary: "Match picked files", script: `const rows=await selects.project(${JSON.stringify(projectId)}).resources();return {count:rows.length,rows:${JSON.stringify(indices)}.map(i=>{const r=rows[i];return r?{id:r.resourceId,name:r.name,type:r.type}:null;})};` });
  const result = run.result, rows = result.rows;
  if (result.count !== app.length || rows.length !== indices.length || indices.some((index, i) => app[index].name !== rows[i]?.name || app[index].type !== rows[i]?.type)) throw new Error("Could not match the picked files to this project.");
  return new Map(indices.map((index, i) => [app[index].resourceId, rows[i].id]));
}

// A Clip highlights run (`context.template`): the pictures picked in the app (`only`), the panel's defaults for the
// rest (MY / LOVE, Night, quick pace, ambient clip sound, faded look) with the run's length and music, built by the
// same tplRunBuild as the panel, left closed, reported once. `live` is false once the run is superseded.
async function tplTemplateRun(sdk: any, context: any, live: () => boolean, say: (text: string) => void) {
  const L = uiLang(context);
  const pid = context?.projectId ?? null;
  if (!pid) throw uiError((l) => t(l, "openProject"));
  const picked = [...new Set<string>((context.template?.inputs?.pictures ?? []).map((x: any) => x?.resourceId).filter(Boolean))];
  if (picked.length < TPL_MIN_PICTURES) throw uiError((l) => t(l, "reason.fewPictures", { min: TPL_MIN_PICTURES }));
  const ids = await scriptResourceIds(sdk, pid, picked);
  const only = picked.map((id) => ids.get(id) ?? id);
  const run = async (summary: string, script: string, allowCommit = false) => {
    let r = await sdk.runScript({ summary, script, allowCommit });
    // Only a lost session is resent, and never a committing call: its commit may already have landed.
    if (r.isError && !allowCommit && /No valid session ID/.test(r.output || "")) { await new Promise((d) => setTimeout(d, 1500)); r = await sdk.runScript({ summary, script, allowCommit }); }
    if (r.isError || r.result == null) throw r.output ? new Error(r.output) : uiError((l) => t(l, "stepFailed"));
    return r.result as any;
  };
  const check = () => { if (!live()) throw TPL_STALE; };
  const plugin = await locateRoots(sdk).then((r: any) => r.plugin as string, () => "");
  if (!plugin) throw uiError((l) => t(l, "startFailed", { detail: t(l, "foldersNotFound") }));
  const read = (rel: string) => readText(plugin, rel);
  const [manifestText, looksText, inventoryJs, searchJs, ensureJs, assembleJs, decorateJs, tornTsx, lettersTsx] = await Promise.all([
    read("assets/cues/manifest.json"), read("assets/fonts/looks.json"), read("scripts/inventory.js"), read("scripts/search.js"),
    read("scripts/ensure-audio.js"), read("scripts/assemble.js"), read("scripts/decorate.js"), read("assets/torn-photo.tsx"), read("assets/ransom-letters.tsx")]);
  check();
  const manifest = JSON.parse(manifestText), looks = JSON.parse(looksText);
  say(t(L, "checkingPicturesNow"));
  // Photo sizes are measured a few at a time; read again while each pass measures more.
  const known: Record<string, { width: number; height: number }> = {};
  let inv: any = null;
  for (let pass = 0; pass < 6; pass++) {
    inv = await run("Read your pictures", tplFill(inventoryJs, { projectId: pid, only, known }));
    check();
    const before = Object.keys(known).length;
    for (const ph of inv.photos || []) if (ph.width > 0 && ph.height > 0) known[ph.rid] = { width: ph.width, height: ph.height };
    if (!(inv.counts?.unmeasured > 0) || Object.keys(known).length === before) break;
  }
  if (inv.counts?.unanalysed > 0) throw uiError((l) => t(l, "stillAnalysing", { count: inv.counts.unanalysed }));
  const cue = manifest.cues.find((c: any) => c.id === context.template?.options?.music) || manifest.cues.find((c: any) => c.id === manifest.defaultCue) || manifest.cues[0] || null;
  const fontUrls = async () => {
    const out: Record<string, string> = {};
    for (const face of Object.keys(looks.faces || {})) out[looks.faces[face]] = "data:font/woff2;base64," + (await readText(plugin, "assets/fonts/tpl-" + face + ".woff2.b64")).replace(/\s+/g, "");
    return out;
  };
  const f = tplFreezeBuild({
    projectId: pid,
    inventory: { photos: inv.photos || [], resources: inv.resources || [] },
    found: null,
    cue, musicPath: cue ? hostJoin(plugin, "assets", "cues", cue.file) : null,
    options: tplOptions({ length: context.template?.options?.length, only, seed: 1 }),
    now: Date.now(), clock: TPL_EFFECT_CLOCK,
  });
  const out = await tplRunBuild(f, {
    run, check, open: false, scripts: { inventoryJs, searchJs, ensureJs, assembleJs, decorateJs },
    advance: (id: string) => { if (TPL_BUILD_STEPS.some((x) => x.id === id) && live()) say(t(L, "step." + id) + "…"); },
    readAssets: async () => ({ tornTsx, lettersTsx, looks, fonts: await fontUrls(), labels: inspectorLabels(L) }),
  });
  if (!out?.assembled?.sequenceId) throw new Error(TEMPLATE_FAILED);
  return out.assembled.sequenceId as string;
}

function TemplateRun({ sdk, context }: any) {
  const runId: string | null = context?.template?.runId ?? null;
  const [status, setStatus] = React.useState("Making your torn paper edit…");
  const started = React.useRef<string | null>(null), alive = React.useRef(true), latest = React.useRef(context);
  latest.current = context;
  React.useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  React.useEffect(() => {
    if (!runId || started.current === runId) return;
    started.current = runId;
    const live = () => alive.current && latest.current?.template?.runId === runId;
    let ended = false;
    const finish = (result: any) => { if (ended) return; ended = true; if (!live()) return; try { sdk.finishTemplate(result); } catch (_) {} };
    tplTemplateRun(sdk, context, live, (text) => { if (live()) setStatus(text); })
      .then((sequenceId) => finish({ sequenceId }))
      .catch((e: any) => {
        if (e === TPL_STALE) return;
        console.warn("[torn-paper-love] template run failed:", e);
        const said = tplSayOf(uiLang(latest.current), e);
        finish({ error: said && said.length <= 200 && !/[\n{]/.test(said) ? said : TEMPLATE_FAILED });
      });
  }, [runId]);
  return <small>{status}</small>;
}

function Panel(props: any) {
  hostUseSdk(props.sdk);
  return props?.context?.template ? <TemplateRun sdk={props.sdk} context={props.context} /> : <TornPaperPanel {...props} />;
}

function TornPaperPanel({ sdk, context, ui }: any) {
  // The UI language, read on every render: Selects can switch languages while the panel is open.
  const L = uiLang(context);
  const projectId = context?.projectId ?? null;
  const projectRef = React.useRef(projectId);
  projectRef.current = projectId;
  const [roots, setRoots] = React.useState<{ plugin: string; data: string | null } | null>(null);
  const [assets, setAssets] = React.useState<any>(null);
  const [inventory, setInventory] = React.useState<any>(null);
  // This Project's scene-search results { pid, best: { rid: seconds | null }, failed }; per rid, so a new clip
  // selection keeps them.
  const [found, setFound] = React.useState<any>(null);
  const [word1, setWord1] = React.useState("MY");
  const [word2, setWord2] = React.useState("LOVE");
  const [backdrop, setBackdrop] = React.useState<string>("night");
  // null until the manifest has loaded (then its defaultCue); "own" and "none" are the other tracks.
  const [cueId, setCueId] = React.useState<string | null>(null);
  const [ownMusic, setOwnMusic] = React.useState<{ path: string; name: string } | null>(null);
  const [ownGrid, setOwnGrid] = React.useState<any>(null);
  // "default" = the cue's most energetic bars (tplSectionStart), until the user moves the section.
  const [section, setSection] = React.useState<number | "default">("default");
  const [length, setLength] = React.useState<"short" | "standard" | "long">("standard");
  const [pace, setPace] = React.useState<"quick" | "relaxed">("quick");
  const [useVideos, setUseVideos] = React.useState(true);
  // Clip sound (videos only): off (muted), ambient (-18 dB under the music) or full (0 dB).
  const [clipSound, setClipSound] = React.useState<"off" | "ambient" | "full">("ambient");
  const [faded, setFaded] = React.useState(true);
  const [tilt, setTilt] = React.useState(false);
  const [only, setOnly] = React.useState<string[] | null>(null);
  const [seed, setSeed] = React.useState(1);
  const [busy, setBusy] = React.useState(false);
  // Single-flight guard (tplExclusive): state updates are async, so a ref blocks a second click in the same tick.
  const busyRef = React.useRef<any>(null);
  // The running build's quick score stops on a Project switch or unmount (tplRunBuild's d.signal).
  const buildAbortRef = React.useRef<AbortController | null>(null);
  // Own music's analysis in flight: a new track, a Project switch or unmount aborts it (decode and worker), and a result
  // for an older request is dropped.
  const ownAbortRef = React.useRef<AbortController | null>(null);
  const ownRequestRef = React.useRef(0);
  const [step, setStep] = React.useState<{ say: Say } | null>(null);
  const [tools, setTools] = React.useState({ ffmpeg: true });
  const fontCache = React.useRef<Record<string, Promise<string>>>({});
  const registered = React.useRef<Set<string>>(new Set());
  const [progress, setProgress] = React.useState<any>(null);
  const progressRef = React.useRef<any>(null);
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
  const fontB64 = (plugin: string, face: string) => {
    if (!fontCache.current[face]) {
      fontCache.current[face] = readText(plugin, "assets/fonts/tpl-" + face + ".woff2.b64")
        .then((t) => t.replace(/\s+/g, ""))
        .catch((e) => { delete fontCache.current[face]; throw e; });
    }
    return fontCache.current[face];
  };
  // { family: data URL } for the Ransom letters graphic, as the headless driver builds it.
  async function fontUrls(plugin: string, looksFile: any) {
    const out: Record<string, string> = {};
    for (const face of Object.keys(looksFile.faces || {})) out[looksFile.faces[face]] = "data:font/woff2;base64," + (await fontB64(plugin, face));
    return out;
  }
  // Registers a TPL face in this panel's document for the letters preview.
  async function registerFace(plugin: string, face: string, family: string) {
    if (registered.current.has(family) || typeof FontFace === "undefined") return;
    const f = new FontFace(family, "url(data:font/woff2;base64," + (await fontB64(plugin, face)) + ")");
    await f.load();
    (document as any).fonts.add(f);
    registered.current.add(family);
  }
  const stopAt = (e: any): Say => {
    const at = progressRef.current;
    return (l) => (at ? t(l, "stoppedAt", { step: at.current + 1, total: TPL_BUILD_STEPS.length, name: t(l, "step." + at.id), detail: tplSayOf(l, e) }) : tplSayOf(l, e));
  };

  // Inventory bookkeeping: the inventory script, photo sizes measured so far (this Project), a load in flight.
  const inventoryJsRef = React.useRef<string | null>(null);
  const photoSizesRef = React.useRef<{ pid: string | null; sizes: Record<string, { width: number; height: number }> }>({ pid: null, sizes: {} });
  // Whether the last read measured new photos (the next poll can measure more; unreadable photos stop the polling).
  const measuringRef = React.useRef(false);
  const invLoadingRef = React.useRef<string | null>(null);
  const mountedRef = React.useRef(true);
  const [invError, setInvError] = React.useState<{ say: Say } | null>(null);
  const [invLoading, setInvLoading] = React.useState(false);

  // Reads the Project's pictures. Never writes state for a stale Project, and never runs during a build.
  async function loadInventory(pid: string | null = projectRef.current, alive: () => boolean = () => true) {
    const script = inventoryJsRef.current;
    if (!pid || !script || busyRef.current || invLoadingRef.current === pid) return;
    const live = () => mountedRef.current && alive() && projectRef.current === pid;
    if (photoSizesRef.current.pid !== pid) photoSizesRef.current = { pid, sizes: {} };
    const known = photoSizesRef.current.sizes;
    const before = Object.keys(known).length;
    invLoadingRef.current = pid; setInvLoading(true);
    try {
      const inv = await readInventoryPages((summary, make) => run(summary, make(0)), script, { projectId: pid, only: null, known }, tplFill, live);
      // A build that started meanwhile keeps the pictures it began with; the next refresh picks this up.
      if (!live() || busyRef.current) return;
      inv.photos = inv.photos || [];
      inv.resources = inv.resources || [];
      inv.counts = inv.counts || { unanalysed: 0, missing: 0, unmeasured: 0 };
      for (const ph of inv.photos) if (ph.width > 0 && ph.height > 0) known[ph.rid] = { width: ph.width, height: ph.height };
      measuringRef.current = Object.keys(known).length > before;
      setInventory(inv); setInvError(null);
    } catch (e: any) {
      if (live()) setInvError({ say: (l) => tplSayOf(l, e) });
    } finally {
      if (invLoadingRef.current === pid) invLoadingRef.current = null;
      if (mountedRef.current && projectRef.current === pid) setInvLoading(false);
    }
  }
  React.useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; buildAbortRef.current?.abort(); ownAbortRef.current?.abort(); }; }, []);

  // Mount and Project switch: reset per-Project state, resolve folders, read the bundled files, read the pictures.
  React.useEffect(() => {
    // Drop everything tied to the previous Project so a build never mixes Projects; a running build becomes stale.
    setFound(null); setResult(null); setStatus(null); setInventory(null); setInvError(null); setInvLoading(false); setOnly(null);
    buildAbortRef.current?.abort(); buildAbortRef.current = null;
    ownAbortRef.current?.abort(); ownAbortRef.current = null;
    photoSizesRef.current = { pid: projectId, sizes: {} }; measuringRef.current = false;
    busyRef.current = null; setBusy(false); setStep(null); setProgress(null); progressRef.current = null;
    if (!projectId) return;
    let alive = true;
    (async () => {
      try {
        const { plugin, data } = await locateRoots(sdk);
        if (!alive) return;
        setRoots({ plugin, data });
        // The host's bundled ffmpeg (Runtime.runFFmpeg) and file reads are only needed for previews and own music, both
        // through the data folder; bundled cues work without them.
        setTools({ ffmpeg: !!hostApi("Runtime", "runFFmpeg") && !!hostApi("FileSystem", "readFile") && !!data });
        const read = (rel: string) => readText(plugin, rel);
        const [manifest, looks, inventoryJs, searchJs, ensureJs, assembleJs, decorateJs, tornTsx, lettersTsx] = await Promise.all([
          read("assets/cues/manifest.json"), read("assets/fonts/looks.json"), read("scripts/inventory.js"), read("scripts/search.js"),
          read("scripts/ensure-audio.js"), read("scripts/assemble.js"), read("scripts/decorate.js"), read("assets/torn-photo.tsx"), read("assets/ransom-letters.tsx")]);
        if (!alive) return;
        const m = JSON.parse(manifest);
        setAssets({ manifest: m, looks: JSON.parse(looks), scripts: { inventoryJs, searchJs, ensureJs, assembleJs, decorateJs }, tornTsx, lettersTsx });
        setCueId((c) => c ?? m.defaultCue ?? (m.cues[0] && m.cues[0].id) ?? "none");
        inventoryJsRef.current = inventoryJs;
        setStep({ say: (l) => t(l, "checkingPictures") });
        await loadInventory(projectId, () => alive);
      } catch (e: any) {
        const said = hostSay(e);
        if (alive) setStatus({ tone: "error", say: (l) => t(l, "startFailed", { detail: said ? said(l) : tplSayOf(l, e) }) });
      } finally { if (alive) setStep(null); }
    })();
    // Project switch or unmount stops a preview, including one still being prepared.
    return () => { alive = false; stopPreview(); };
  }, [projectId]);

  // Clips still importing (counts.unanalysed: no duration or source file yet), photos still being measured, or nothing
  // yet: re-read every 10 s until ready. Clips never wait for Selects analysis. The effect re-arms on each new inventory
  // and stops on unmount, Project switch and while busy.
  const needsPoll = !!inventory && (inventory.counts.unanalysed > 0 || (inventory.counts.unmeasured > 0 && measuringRef.current)
    || (inventory.resources.length === 0 && inventory.photos.length === 0));
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

  // The six TPL faces for the preview; a face that fails to load only makes the preview fall back.
  React.useEffect(() => {
    if (!assets || !roots) return;
    const faces = assets.looks.faces || {};
    Object.keys(faces).forEach((face) => { registerFace(roots.plugin, face, faces[face]).catch(() => null); });
  }, [assets, roots]);

  // ---- The plan the Build button would make (the same tplPlanState the build runs).
  const manifest = assets?.manifest || null;
  const track = ownMusic ? "own" : cueId === "own" ? "own" : cueId || manifest?.defaultCue || "none";
  const manifestCue = manifest && track !== "own" && track !== "none" ? manifest.cues.find((c: any) => c.id === track) || null : null;
  const ownDuration = ownGrid && ownGrid.durationSeconds > 0 ? ownGrid.durationSeconds : null;
  // Own music as a cue for tplPlanState: its detected grid; or, when beat-detect.cjs reports the grid as 'approximate'
  // (tempo known, beat faint), cuts on that tempo's unit from its first beat (approxBpm, planner tplApproxTempo) with
  // low-confidence snapping; or (no steady beat) the fixed 0.35 s unit with a stand-in tempo so the music still plays
  // from a 0.1 s-snapped start.
  const ownCue = React.useMemo(() => {
    if (!ownMusic || !ownGrid || !ownDuration) return null;
    const accepted = !!ownGrid.accepted && ownGrid.bpm > 0;
    const approxBpm = tplApproxTempo({ accepted, approxBpm: ownGrid.grid === "approximate" && ownGrid.bpm > 0 ? ownGrid.bpm : null });
    return { id: "own", label: ownMusic.name, file: null, bpm: ownGrid.bpm > 0 ? ownGrid.bpm : TPL_OWN_NOMINAL_BPM, accepted, approxBpm,
      firstBeat: accepted || approxBpm ? ownGrid.firstBeat || 0 : 0, usableEnd: Math.max(0, ownDuration - 0.5), beatEnergy: accepted ? ownGrid.beatEnergy || [] : [],
      onsets: ownGrid.onsets || [], onsetThresholds: ownGrid.onsetThresholds || null, peaks: ownGrid.peaks || [], duration: ownDuration };
  }, [ownMusic, ownGrid, ownDuration]);
  const planCue = track === "own" ? ownCue : manifestCue;
  const ownPending = track === "own" && !ownCue;
  const grid = tplGrid(planCue);
  const unitSec = tplUnitSec(grid);
  const options = React.useMemo(() => ({ words: [word1, word2], backdrop, length, pace, clipSound, look: faded ? TPL_LOOK : 0, tilt, useVideos, only, seed, section }),
    [word1, word2, backdrop, length, pace, clipSound, faded, tilt, useVideos, only, seed, section]);
  const foundBest = found && found.pid === projectId ? found.best : null;
  const plan = React.useMemo(() => {
    if (!inventory || ownPending) return null;
    try { return tplPlanState({ projectId, inv: { photos: inventory.photos, resources: inventory.resources }, found: { best: foundBest || {} }, cue: planCue, options, now: 0 }); }
    catch (e: any) { return { ok: false, reason: String(e?.message || e) }; }
  }, [inventory, foundBest, planCue, options, ownPending, projectId]);
  const requested = TPL_LENGTHS[length];
  const onlyRids = React.useMemo(() => (only ? new Set(only) : null), [only]);
  const photosSel: any[] = inventory ? inventory.photos.filter((p: any) => !onlyRids || onlyRids.has(p.rid)) : [];
  const measured = photosSel.filter((p: any) => p.width > 0 && p.height > 0).length;
  const videosSel: any[] = inventory && useVideos ? inventory.resources.filter((r: any) => !onlyRids || onlyRids.has(r.rid)) : [];
  const shortVideos = plan?.ok ? plan.excluded.shortVideos : 0;
  const clipsOk = Math.max(0, videosSel.length - shortVideos);
  const shownN = plan?.ok ? plan.N : Math.max(TPL_MIN_PICTURES, Math.min(requested, measured + clipsOk));
  const videoSeconds = tplTemplate(shownN, pace).total * unitSec;
  // Bars of the accepted or approximate tempo (tplSectionStart does the same), else 0.1 s steps.
  const sectionTempo = tplSectionTempo(grid);
  const snap = (value: number) => tplSnapSection({ value, firstBeat: grid.firstBeat, bpm: sectionTempo == null ? grid.bpm : sectionTempo, usableEnd: grid.usableEnd, videoSeconds, gridAccepted: sectionTempo != null });
  // The section the build uses (the plan re-clamps a numeric start to the nearest bar that fits).
  const sectionShown: number | null = !planCue ? null : plan?.ok ? plan.musicStart : grid.bpm == null ? null : snap(section === "default" ? (tplSectionStart(grid, "default", videoSeconds) ?? 0) : section);
  const musicPath = !roots ? null : track === "own" ? (ownMusic ? ownMusic.path : null) : manifestCue ? hostJoin(roots.plugin, "assets", "cues", manifestCue.file) : null;

  // A new track starts at its most energetic bars again; Length and Pace keep a chosen start (re-clamped by the plan).
  React.useEffect(() => { setSection("default"); }, [track, ownGrid]);
  // A new track, section, length or pace makes a running preview stale, so it stops.
  React.useEffect(() => { stopPreview(); }, [track, ownMusic?.path, sectionShown, length, pace]);

  async function detectOwnMusic(file: { path: string; name: string }) {
    if (!roots) return;
    await tplExclusive(busyRef, async () => {
      const pid = projectRef.current;
      const request = ++ownRequestRef.current;
      ownAbortRef.current?.abort();
      const abort = typeof AbortController === "undefined" ? null : new AbortController();
      ownAbortRef.current = abort;
      const current = () => projectRef.current === pid && ownRequestRef.current === request && mountedRef.current;
      setOwnMusic(file); setOwnGrid(null); setBusy(true); setStep({ say: (l) => t(l, "listening") });
      let samples: Float32Array | null = null;
      try {
        // The host's ffmpeg decodes the track to mono f32le (a temporary file in the data folder, removed after reading);
        // the kit's beat-detect.cjs (unmodified, from the install folder) analyses it in a Web Worker.
        samples = await hostDecodePcm(file.path, roots.data, OWN_RATE, OWN_MAX_SECONDS, abort ? abort.signal : null);
        if (!samples) throw hostError("host-missing", "this Selects build has no Runtime.runFFmpeg", "Runtime.runFFmpeg");
        if (!current()) return;
        const source = tplBeatWorkerSource(await readText(roots.plugin, "beat-detect.cjs"));
        const g = await analyseBeat(source, samples, abort ? abort.signal : null);
        if (!current()) return;
        if (!g || !(g.durationSeconds > 0)) throw uiError((l) => t(l, "beatFailed"));
        setOwnGrid(g);
        const approx = tplApproxTempo({ accepted: !!g.accepted, approxBpm: g.grid === "approximate" && g.bpm > 0 ? g.bpm : null });
        setStatus(g.accepted ? null
          : approx ? { tone: "info", say: (l) => t(l, "musicFaint", { bpm: Math.round(approx) }) }
          : { tone: "info", say: (l) => t(l, "musicFixedRhythm", { seconds: TPL_FALLBACK_UNIT }) });
      } catch (e: any) {
        if (!current()) return;
        // Without a grid the cuts use fixed timing, but the track's real length still bounds the section: the decoded
        // samples' length, else the host's ffprobe.
        let duration: number | null = samples && samples.length ? samples.length / OWN_RATE : null;
        if (!duration) {
          const v = await hostProbeSeconds(file.path);
          duration = v ? Math.min(v, OWN_MAX_SECONDS) : null;
        }
        if (!current()) return;
        const said = hostSay(e);
        const detail = (l: Lang) => (said ? said(l) : tplSayOf(l, e));
        setOwnGrid({ accepted: false, grid: "none", durationSeconds: duration, peaks: [] });
        setStatus(duration
          ? { tone: "info", say: (l) => t(l, "musicFixedRhythmDetail", { seconds: TPL_FALLBACK_UNIT, detail: detail(l) }) }
          : { tone: "error", say: (l) => t(l, "musicUnreadable", { detail: detail(l) }) });
      } finally {
        samples = null;
        if (ownAbortRef.current === abort) ownAbortRef.current = null;
        if (projectRef.current === pid) { setBusy(false); setStep(null); }
      }
    });
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
    if (!musicPath || !roots || sectionShown == null) return;
    stopPreview();
    const token = previewTokenRef.current;
    const live = () => previewTokenRef.current === token && mountedRef.current;
    setPlayState("loading");
    try {
      // The section cut by the host's ffmpeg (mono mp3 with a short fade-out) into a temporary file in the data folder,
      // read back as bytes and removed.
      const dur = videoSeconds;
      const bytes = await hostCutAudio(musicPath, roots.data, Number(sectionShown.toFixed(3)), Number(dur.toFixed(2)),
        ["-ac", "1", "-ar", "22050", "-b:a", "48k", "-af", "afade=t=out:st=" + Math.max(0, dur - 0.12).toFixed(2) + ":d=0.12", "-f", "mp3"], "mp3", null)
        .catch((e: any) => { throw e?.message ? e : uiError((l) => t(l, "previewNotCut")); });
      if (!live()) return;
      if (!bytes) throw hostError("host-missing", "this Selects build has no Runtime.runFFmpeg", "Runtime.runFFmpeg");
      if (bytes.byteLength < 150) throw uiError((l) => t(l, "noAudio"));
      const url = URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" }));
      previewUrlRef.current = url;
      const audio = new Audio(url);
      audio.onended = () => { if (audioRef.current === audio) stopPreview(); };
      audioRef.current = audio;
      try { await audio.play(); }
      catch (e: any) { throw e && e.name === "NotAllowedError" ? uiError((l) => t(l, "playbackBlocked")) : new Error(String(e?.message || e)); }
      if (!live() || audioRef.current !== audio) { audio.pause(); return; }
      setPlayState("playing"); setPlayingAudio(audio);
    } catch (e: any) {
      if (!live()) return;
      stopPreview();
      const said = hostSay(e);
      setStatus({ tone: "error", say: (l) => t(l, "previewFailed", { detail: said ? said(l) : tplSayOf(l, e) }) });
    }
  }

  // Host calls for tplRunBuild / tplFinish, bound to the frozen Project.
  function hostFor(pid: string, labels: Record<string, string>) {
    return {
      run, check: tplStaleCheck(projectRef, pid), scripts: assets.scripts,
      // Clips Selects hasn't analysed are scored on this computer; the cache goes to the data folder.
      signal: buildAbortRef.current?.signal, quickDataDir: tplQuickDataDir() ?? roots?.data ?? null,
      advance: (id: string, fraction: number, detail?: string) => {
        if (projectRef.current !== pid) return;
        const p = tplForward(progressRef.current, tplProgress(id, fraction, detail));
        progressRef.current = p; setProgress(p);
      },
      readAssets: async () => ({ tornTsx: assets.tornTsx, lettersTsx: assets.lettersTsx, looks: assets.looks, fonts: await fontUrls(roots!.plugin, assets.looks), labels }),
      onSearch: (f: any) => { if (projectRef.current === pid) setFound({ pid, best: f.best, failed: f.failed }); },
      onAssembled: (state: any, a: any) => { if (projectRef.current === pid) setResult({ state, assembled: a, decorated: false, notes: a.notes || [], link: null, unchecked: 0, labels }); },
      onDecorated: () => { if (projectRef.current === pid) setResult((r: any) => (r ? { ...r, decorated: true } : r)); },
    };
  }

  // Build: every input frozen at the click (spec 15.5); Build is disabled while running.
  // Returns false when a guard stops it (nothing changes then), true once the build has started.
  function build(nextSeed: number) {
    if (busyRef.current || !assets || !inventory || !roots || !projectId || !plan?.ok) return false;
    if (ownPending) { setStatus({ tone: "error", say: (l) => t(l, "dropMusic") }); return false; }
    // Inspector labels in the language of this click; "Finish letters and look" reuses them.
    const labels = inspectorLabels(L);
    const inputs = {
      projectId,
      inventory: { photos: inventory.photos, resources: inventory.resources },
      found: found && found.pid === projectId ? { best: found.best, failed: found.failed } : null,
      cue: planCue, musicPath: planCue ? musicPath : null,
      options: { ...options, seed: nextSeed }, now: Date.now(), clock: TPL_EFFECT_CLOCK,
    };
    void tplExclusive(busyRef, async () => {
      const f = tplFreezeBuild(inputs);
      const pid = f.projectId;
      buildAbortRef.current?.abort();
      buildAbortRef.current = typeof AbortController === "undefined" ? null : new AbortController();
      stopPreview();
      setBusy(true); setStatus(null); setResult(null); progressRef.current = null; setProgress(null);
      try {
        const out = await tplRunBuild(f, hostFor(pid, labels));
        if (projectRef.current !== pid) return;
        setResult((r: any) => ({ ...(r || {}), link: out.link, notes: out.notes, unchecked: out.unchecked }));
        if (out.openError) setStatus({ tone: "error", say: (l) => t(l, "openFailed", { detail: out.openError }) });
      } catch (e: any) {
        if (e !== TPL_STALE && projectRef.current === pid) setStatus({ tone: "error", say: stopAt(e) });
      } finally {
        if (projectRef.current === pid) { setBusy(false); setProgress(null); progressRef.current = null; }
      }
    });
    return true;
  }

  // Another version: a new seed (new tears and letter looks, other photos when there are more than N).
  // The previous result stays until build() passes its guards (build clears it when it starts).
  function buildAnother() {
    if (busyRef.current) return;
    const s = seed + 1;
    if (build(s)) setSeed(s);
  }

  // "Finish letters and look": decorate again with the frozen plan of the build (a no-op when already complete).
  function finish() {
    const r0 = result;
    if (busyRef.current || !r0 || !assets || !roots || !projectId || r0.state.projectId !== projectId) return;
    void tplExclusive(busyRef, async () => {
      const pid = projectId;
      stopPreview();
      setBusy(true); setStatus(null); progressRef.current = null; setProgress(null);
      try {
        const out = await tplFinish(r0.state, r0.assembled, hostFor(pid, r0.labels || inspectorLabels(L)));
        if (projectRef.current !== pid) return;
        setResult((r: any) => (r ? { ...r, link: out.link } : r));
        if (out.openError) setStatus({ tone: "error", say: (l) => t(l, "openFailed", { detail: out.openError }) });
      } catch (e: any) {
        if (e !== TPL_STALE && projectRef.current === pid) setStatus({ tone: "error", say: stopAt(e) });
      } finally {
        if (projectRef.current === pid) { setBusy(false); setProgress(null); progressRef.current = null; }
      }
    });
  }

  // Choose clips: `only` holds rids in inventory order (photos, then clips), or null for every picture.
  const photoList: any[] = inventory?.photos || [];
  const clipList: any[] = inventory?.resources || [];
  const allRids: string[] = [...photoList, ...clipList].map((r: any) => r.rid);
  const onlySet = only ? new Set(only) : null;
  const selected = onlySet ? allRids.filter((rid) => onlySet.has(rid)) : allRids;
  const selectedSet = new Set(selected);
  const choose = (next: string[]) => {
    if (busyRef.current) return;
    const keep = new Set(next);
    const ordered = allRids.filter((rid) => keep.has(rid));
    setOnly(ordered.length === allRids.length ? null : ordered);
  };
  const toggle = (rid: string, on: boolean) => choose(on ? [...selected, rid] : selected.filter((x) => x !== rid));

  // Readiness (spec 15.7): eligible photos and clips, shots and seconds for the chosen cue and pace, and what is left out.
  const counts = inventory?.counts || { unanalysed: 0, notAnalysed: 0, unmeasured: 0 };
  const unread = photosSel.length - measured;
  // Facts joined with " · "; each fact is one translated phrase.
  const aside = [
    counts.unanalysed ? t(L, "stillImporting", { count: counts.unanalysed }) : "",
    unread ? (measuringRef.current ? t(L, "notReadYet", { count: unread }) : t(L, "notRead", { count: unread })) : "",
    shortVideos ? t(L, "tooShort", { count: shortVideos }) : "",
  ].filter(Boolean).join(" · ");
  const lengthLabel = t(L, "length." + length);
  const readiness = !inventory ? (invError ? t(L, "readFailed", { detail: invError.say(L) }) : t(L, "checkingPicturesNow"))
    : ownPending ? (busy ? t(L, "listeningNow") : t(L, "dropMusicAbove"))
    : !plan ? t(L, "checkingPicturesNow")
    : plan.ok ? t(L, "ready", { summary: [t(L, "photos", { count: measured }), ...(useVideos ? [t(L, "clips", { count: clipsOk })] : []),
      t(L, "shots", { count: 2 * plan.N }), t(L, "aboutSeconds", { seconds: tenths(plan.seconds) })].join(" · ") })
    : photoList.length + clipList.length === 0 && !counts.unanalysed ? t(L, "noPictures")
    : planReason(L, plan);
  const fitNote = plan?.ok && plan.fitReason === "pictures"
    ? t(L, "fitPictures", { count: measured + (useVideos ? clipsOk : 0), length: lengthLabel, n: plan.N, shots: 2 * plan.N, seconds: tenths(plan.seconds) })
    : plan?.ok && plan.fitReason === "music"
      ? t(L, "fitMusic", { n: plan.N, shots: 2 * plan.N, seconds: tenths(plan.seconds), length: lengthLabel })
      : "";
  const eligible = measured + (useVideos ? clipsOk : 0);
  // Clips Selects hasn't analysed are used right away (checked on this computer); only a small note says analysed
  // clips pick better, when the build may use one.
  const quickNote = useVideos && videosSel.some((r: any) => r.analysed === false);
  const peaks: number[] = planCue ? planCue.peaks || [] : [];
  const total = planCue ? (track === "own" ? ownDuration || 1 : manifestCue?.duration || 1) : 1;
  const silent = track === "none" && clipSound === "off";
  const canOwnMusic = tools.ffmpeg;
  const canBuild = !!assets && !!roots && !!plan?.ok && !ownPending && !busy;
  const cueOptions = [
    ...(manifest?.cues || []).map((c: any) => ({ label: c.label, value: c.id })),
    ...(canOwnMusic ? [{ label: t(L, "ownMusic"), value: "own" }] : []),
    { label: t(L, "noMusic"), value: "none" },
  ];
  const clampWord = (v: string) => tplClampWord(v);

  if (!projectId) return <ui.Message tone="error">{t(L, "openProject")}</ui.Message>;

  // Korean wraps between words (keep-all); Japanese and Chinese keep breaking between characters.
  return (
    <div lang={L} style={L === "ko" ? { wordBreak: "keep-all" } : undefined}>
    <ui.Stack gap={16}>
      <ui.Section title={t(L, "words")}>
        <ui.TextField label={t(L, "word1")} value={word1} onChange={(v: string) => setWord1(clampWord(v))} />
        <ui.TextField label={t(L, "word2")} value={word2} onChange={(v: string) => setWord2(clampWord(v))} />
        <small style={{ display: "block", color: "var(--panel-muted-fg)" }}>{t(L, "wordHint", { max: WORD_MAX })}</small>
        <LettersPreview lang={L} word1={word1} word2={word2} seed={seed} looksFile={assets?.looks || null} backdrop={backdrop} />
      </ui.Section>
      <ui.Section title={t(L, "style")}>
        <div role="group" aria-label={t(L, "backdrop")} style={{ display: "flex", flexWrap: "wrap", gap: 8, minWidth: 0 }}>
          {Object.keys(TPL_BACKDROPS).map((id) => {
            const on = id === backdrop;
            return (
              <button key={id} type="button" aria-pressed={on} disabled={busy} onClick={() => setBackdrop(id)}
                style={{ flex: "1 1 72px", minWidth: 0, padding: 4, borderRadius: 8, cursor: busy ? "default" : "pointer", color: "inherit", background: "transparent",
                  border: on ? "2px solid var(--panel-accent, #f6c343)" : "1px solid var(--panel-border, rgba(128, 128, 128, 0.45))", textAlign: "center" }}>
                <span aria-hidden="true" style={{ display: "block", height: 28, borderRadius: 4, background: backdropFill(id), boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }} />
                <span style={{ display: "block", marginTop: 4, fontSize: 12, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tOr(L, "backdrop." + id, (TPL_BACKDROPS as any)[id])}</span>
              </button>
            );
          })}
        </div>
      </ui.Section>
      <ui.Section title={t(L, "music")}>
        <ui.Select label={t(L, "track")} value={track} disabled={busy}
          onChange={(v: string) => { setCueId(v); if (v !== "own") { setOwnMusic(null); setOwnGrid(null); } }} options={cueOptions} />
        {track === "own" && canOwnMusic ? <ui.FileDrop accept={["audio"]} value={ownMusic} disabled={busy}
          onChange={(f: any) => { if (f) detectOwnMusic(f); else { setOwnMusic(null); setOwnGrid(null); } }} /> : null}
        {!canOwnMusic && roots ? <ui.Message tone="muted">{t(L, "adapterNeeded", { name: "Runtime.runFFmpeg" })}</ui.Message> : null}
        {planCue ? (
          // Esc on the slider or the preview button (the key bubbles up here) stops the preview.
          <div onKeyDown={(e) => { if (e.key === "Escape" && playState !== "idle") { e.preventDefault(); stopPreview(); } }}>
            <SectionSlider lang={L} peaks={peaks} total={total} section={sectionShown} videoSeconds={videoSeconds} barSeconds={sectionTempo != null ? (tplBarBeats(sectionTempo) * 60) / sectionTempo : 1}
              snap={snap} onChange={(v) => { if (v != null) setSection(v); }} disabled={busy} audio={playingAudio} />
            <ui.Row gap={8} align="center">
              {/* The kit has no stop icon; "pause" marks stop, and the label says what it does. */}
              <ui.IconButton icon={playState === "playing" ? "pause" : playState === "loading" ? "loading" : "play"}
                label={playState === "playing" ? t(L, "stopPreview") : playState === "loading" ? t(L, "cancelPreview") : t(L, "previewSection")}
                onClick={preview} disabled={busy || !tools.ffmpeg || (playState === "idle" && sectionShown == null)} />
              <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{sectionShown == null ? t(L, "musicTooShort") : t(L, "startsAt", { seconds: tenths(sectionShown) })}</span>
            </ui.Row>
          </div>
        ) : track === "none" ? <ui.Message tone="muted">{t(L, "noMusicRhythm", { seconds: TPL_FALLBACK_UNIT })}</ui.Message> : null}
      </ui.Section>
      <ui.Section title={t(L, "length")}>
        <ui.Segmented label={t(L, "length")} value={length} onChange={setLength}
          options={(["short", "standard", "long"] as const).map((id) => ({ label: t(L, "lengthOption", { name: t(L, "length." + id), n: TPL_LENGTHS[id] }), value: id }))} />
        <ui.Segmented label={t(L, "pace")} value={pace} onChange={setPace} options={[{ label: t(L, "pace.quick"), value: "quick" }, { label: t(L, "pace.relaxed"), value: "relaxed" }]} />
        <ui.Row gap={8} align="center">
          <ui.Message tone={!inventory && invError ? "error" : "muted"}>{readiness}</ui.Message>
          <ui.Button variant="ghost" busy={invLoading} busyLabel={t(L, "refreshing")} disabled={busy || !assets} onClick={() => loadInventory()}>{t(L, "refresh")}</ui.Button>
        </ui.Row>
        {fitNote ? <ui.Message tone="muted">{fitNote}</ui.Message> : null}
        {aside ? <ui.Message tone="muted">{t(L, "autoUpdate", { facts: aside })}</ui.Message> : null}
        {quickNote ? <small style={{ display: "block", color: "var(--panel-muted-fg)" }}>{t(L, "notAnalysedNote")}</small> : null}
        {inventory && invError ? <ui.Message tone="error">{t(L, "refreshFailed", { detail: invError.say(L) })}</ui.Message> : null}
      </ui.Section>
      <ui.Section title={t(L, "advanced")}>
        <ui.Toggle label={t(L, "useVideos")} value={useVideos} onChange={setUseVideos} />
        <ui.Segmented label={t(L, "clipSound")} value={clipSound} onChange={setClipSound}
          options={[{ label: t(L, "sound.off"), value: "off" }, { label: t(L, "sound.ambient"), value: "ambient" }, { label: t(L, "sound.full"), value: "full" }]} />
        <ui.Toggle label={t(L, "fadedFilm")} value={faded} onChange={setFaded} />
        <ui.Toggle label={t(L, "tilt")} value={tilt} onChange={setTilt} />
        {silent ? <ui.Message tone="muted">{t(L, "silentVideo")}</ui.Message> : null}
        {inventory && allRids.length ? (
          <div role="group" aria-label={t(L, "chooseClips")} style={{ minWidth: 0 }}>
            <ui.Row gap={4} align="center">
              <small style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {t(L, "chooseClipsCount", { selected: selected.length, total: allRids.length })}
              </small>
              <ui.Button variant="ghost" disabled={busy || !only} onClick={() => choose(allRids)}>{t(L, "all")}</ui.Button>
              <ui.Button variant="ghost" disabled={busy || selected.length === 0} onClick={() => choose([])}>{t(L, "none")}</ui.Button>
            </ui.Row>
            {/* One row per picture: the name truncates, the kind and shape stay visible; long lists scroll inside. */}
            <div style={{ maxHeight: 220, overflowY: "auto", scrollbarGutter: "stable", marginTop: 4, borderRadius: "var(--panel-radius, 6px)", border: "1px solid var(--panel-border, rgba(128, 128, 128, 0.35))" }}>
              {[...photoList, ...clipList].map((r: any) => {
                const isPhoto = r.kind === "photo";
                const off = busy || (!isPhoto && !useVideos);
                const on = selectedSet.has(r.rid) && (isPhoto || useVideos);
                const hint = shapeHint(L, r.width, r.height);
                const meta = (isPhoto ? (r.width > 0 ? t(L, "photo") : t(L, "photoNotRead")) : fmtTime(r.duration)) + (hint ? " · " + hint : "");
                return (
                  <label key={r.rid} title={r.name + " · " + meta + (!isPhoto && !useVideos ? " · " + t(L, "useVideosOff") : "")}
                    style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, padding: "4px 6px", cursor: off ? "default" : "pointer", opacity: off ? 0.6 : 1 }}>
                    <input type="checkbox" checked={on} disabled={off} onChange={(e) => toggle(r.rid, e.currentTarget.checked)} style={{ flexShrink: 0, margin: 0 }} />
                    <span style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                    <span style={{ flexShrink: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", fontSize: 11, color: "var(--panel-muted-fg)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{meta}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}
      </ui.Section>
      {progress ? <ui.Progress value={progress.value} label={progressLabel(L, progress)} steps={TPL_BUILD_STEPS.map((s) => t(L, "step." + s.id))} current={progress.current} />
        : busy ? <ui.Progress label={step ? step.say(L) : t(L, "working")} /> : null}
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
      {result?.notes?.length ? <ui.Message tone="muted">{t(L, "note", { detail: result.notes.join("; ") })}</ui.Message> : null}
      {result?.unchecked ? <ui.Message tone="muted">{t(L, "unchecked", { count: result.unchecked })}</ui.Message> : null}
      {result && !busy ? (
        <ui.Message tone="muted">{t(L, "anotherVersionHint", { n: result.state?.N || shownN })}</ui.Message>
      ) : null}
      <small style={{ display: "block", color: "var(--panel-muted-fg)" }}>{plan?.ok && eligible > plan.N ? t(L, "createsDraftFrom", { n: plan.N, count: eligible }) : t(L, "createsDraft")}</small>
      <ui.Actions>
        {result && !result.decorated ? <ui.Button onClick={finish} disabled={busy}>{t(L, "finishLetters")}</ui.Button> : null}
        {result ? <ui.Button onClick={buildAnother} disabled={!canBuild}>{t(L, "anotherVersion")}</ui.Button> : null}
        <ui.Button variant="primary" busy={busy} busyLabel={step ? step.say(L) : t(L, "building")} onClick={() => build(seed)} disabled={!canBuild}>{t(L, "build")}</ui.Button>
      </ui.Actions>
    </ui.Stack>
    </div>
  );
}

// Only read-only media queries use this: keep every row without exceeding run_script's response limit.
async function readMediaPages(sdk, args) {
  let result, total;
  for (let offset = 0; ; offset += 32) {
    const script = `const value=await(async()=>{${args.script}\n})();const array=Array.isArray(value);const data=array?{rows:value}:value;const page={};let total=0;for(const key of Object.keys(data)){const rows=data[key];page[key]=Array.isArray(rows)?rows.slice(${offset},${offset + 32}):rows;if(Array.isArray(rows))total=Math.max(total,rows.length);}return {array,page,total};`;
    const reply = await sdk.runScript({ ...args, script, allowCommit: false });
    if (reply.isError || !reply.result?.page) throw new Error(reply.output || 'Could not read the Project media.');
    const batch = reply.result;
    if (total !== undefined && total !== batch.total) throw new Error('Project media changed while loading. Try again.');
    total = batch.total;
    if (offset === 0) result = batch.page;
    else for (const key of Object.keys(batch.page)) if (Array.isArray(batch.page[key])) result[key].push(...batch.page[key]);
    if (offset + 32 >= total) return { ...reply, result: batch.array ? result.rows : result };
  }
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
    const response = await sdk.runScript({
      summary: "Use local media workspace",
      allowCommit: write,
      script: "return await selects." + method + "(..." + JSON.stringify(args) + ");",
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
