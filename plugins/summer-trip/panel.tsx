// @name Summer Trip
// @collection visual-highlights
// @name:de Sommerreise
// @name:en Summer Trip
// @name:es Viaje de verano
// @name:fr Voyage d'été
// @name:it Viaggio d'estate
// @name:ja サマートリップ
// @name:ko Summer Trip
// @name:pt Viagem de verão
// @name:tr Yaz Gezisi
// @name:zh 夏日旅行
// @icon sparkles
// Builds a beat-synced 16:9 summer trip video (typed title, 2x2 grid build, montage, film-frame ending) as a new,
// editable Draft.
import React from "react";

// STRINGS:BEGIN
const STRINGS = {
  en: {
    openProject: "Open a Project to build a Summer Trip video.",
    refresh: "Refresh",
    refreshing: "Refreshing",
    refreshFailed: "Could not refresh the clip list: {detail}",
    readFailed: "Could not read the clips in this Project: {detail}",
    checkingClipsNow: "Checking clips…",
    checkingClips: "Checking clips",
    listening: "Listening for the beat",
    preparingTools: "Preparing beat detection (first time only)",
    working: "Working",
    noFootage: "No video clips or photos in this Project yet. Add some; this updates automatically.",
    noClipsSelected: "No clips selected. Choose clips in Advanced.",
    gap: " ",
    ready: "Ready: {summary}",
    clips: { one: "{count} clip", other: "{count} clips" },
    clipsSelected: { one: "{selected} of {count} clip", other: "{selected} of {count} clips" },
    photos: { one: "{count} photo", other: "{count} photos" },
    photosSelected: { one: "{selected} of {count} photo", other: "{selected} of {count} photos" },
    aboutSeconds: "about {seconds} s",
    betterWithAnalysis: "Analysed clips give better picks",
    clipsNotReady: { one: "{count} clip not ready yet", other: "{count} clips not ready yet" },
    clipsNotReadyWait: { one: "{count} clip is not ready yet. This updates automatically.", other: "{count} clips are not ready yet. This updates automatically." },
    checkingClipsCount: "Checking clips {done}/{count}",
    fitDistinct: { one: "{count} different clip or photo", other: "{count} different clips and photos" },
    fitShrunk: { one: "{distinct} different clips and photos. Your footage fits {count} montage shot (about {seconds} s)", other: "{distinct} different clips and photos. Your footage fits {count} montage shots (about {seconds} s)" },
    title: "Title",
    line1: "Line 1",
    line1Limit: "Line 1 takes up to {chars} characters and {words} words.",
    season: "Season",
    seasonLimit: "The season takes up to {chars} characters.",
    wideCounts: "Korean, Japanese and Chinese characters count as 2.",
    resetTo: "reset to {season}",
    place: "Place",
    placeOptional: "Optional — leave blank to hide",
    placeLimit: "The place takes up to {chars} characters.",
    placePrefix: "Place prefix",
    placePrefixHint: "Shown before the place, for example \"{example}\"",
    creditName: "Credit name",
    creditNameHint: "Optional — shown as \"{prefix} <name>\"",
    creditPrefix: "Credit prefix",
    creditPrefixHint: "Shown before the credit name, for example \"{example}\"",
    topLabel: "Top label",
    topItalic: "Top label (italic part)",
    style: "Style",
    "preset.summer": "Summer",
    "preset.poster": "Poster",
    "preset.postcard": "Postcard",
    titlePreview: "Title preview",
    music: "Music",
    track: "Track",
    ownMusic: "Your own music",
    noMusic: "No music",
    devPlaceholder: "{title} (development placeholder)",
    installTools: "Install ffmpeg to preview music or use your own track.",
    length: "Length",
    "length.short": "Short",
    "length.standard": "Standard",
    "length.long": "Long",
    sectionHint: "Music section — drag to choose",
    sectionLabel: "Music section",
    musicTooShort: "This music is too short for this length",
    dropAt: "Drop at {seconds} s",
    sectionAt: "Section at {seconds} s",
    dropStartsAt: "Drop · starts at {seconds} s",
    sectionStartsAt: "Section · starts at {seconds} s",
    stopPreview: "Stop preview",
    cancelPreview: "Cancel preview",
    previewSection: "Preview this section",
    noMusicTiming: "No music: the cuts use approximate timing (a fixed 0.5 s beat).",
    fixedTiming: "Approximate timing: the beat of this music could not be found reliably.",
    faintTiming: "Approximate timing on the detected tempo ({bpm} BPM): the tempo was found but the beat is faint, so the cuts may miss it.",
    noDrop: "No drop found: the grid starts after the 2-bar title.",
    advanced: "Advanced",
    clipSound: "Clip sound",
    "sound.off": "Off",
    "sound.ambient": "Ambient",
    "sound.full": "Full",
    summerLook: "Summer look",
    lookStrength: "Look strength",
    soundEffects: "Sound effects",
    endingMuffle: "Ending muffle",
    usePhotos: "Use photos",
    usePhotosOff: "Use photos is off",
    onlySfx: "No music and Clip sound is Off: only the sound effects play.",
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
    stoppedAt: "Stopped at step {step}/{total}, {name}: {detail}",
    build: "Build",
    building: "Building",
    anotherVersion: "Try other shots",
    finishTitle: "Finish title and look",
    draftCreated: "Draft created. Select the title or the labels to edit their text, colours and positions (each graphic keeps its own copy of the labels), a clip to adjust its look, light leak, crop or sound, and the music to change its volume. Rebuilding creates a new Draft and does not keep Adjust edits.",
    draftCreatedAdding: "Draft created; adding title and look…",
    openDraft: "Open the new Draft",
    copyLink: "Copy the link to the new Draft",
    shortened: { one: "Your footage fits {count} montage shot, so this video is about {seconds} s instead of {fullSeconds} s. Add more clips for the full length.", other: "Your footage fits {count} montage shots, so this video is about {seconds} s instead of {fullSeconds} s. Add more clips for the full length." },
    approximateVideo: "This video uses approximate timing.",
    note: "Note: {detail}.",
    unchecked: { one: "Could not search {count} video; it was used without scene search. Build again to retry it.", other: "Could not search {count} videos; they were used without scene search. Build again to retry them." },
    "plan.needDistinct": "Needs at least {count} different clips or photos (found {found}).",
    "plan.needOpener": "Needs one video clip at least {seconds} s long for the opening.",
    "plan.needPlace": "Needs a second clip at least {seconds} s long (or a photo) for the place shot.",
    "plan.needGrid": "Needs at least {count} different clips or photos long enough for the grid panels (found {found}).",
    "plan.tooShort": "Your footage is too short for {count} montage shots.",
    "plan.reuseMoments": "Some shots reuse footage from the same moment of a clip.",
    "plan.photoRun": "More than {count} photos play in a row (not enough video).",
    "plan.reusedPhotos": "Some photos are used twice.",
    "plan.dropTooEarly": "The drop is too close to the start of the track; the title runs over the first two bars.",
    "plan.dropNoFit": "The drop section does not fit this length; moved to the latest start that fits.",
    "plan.sectionMoved": "The section did not fit this length; moved to the latest start that fits.",
    retryUnchecked: { one: "{reason} Could not check {count} clip; press Build to retry it.", other: "{reason} Could not check {count} clips; press Build to retry them." },
    startFailed: "Summer Trip could not start: {detail}. Reinstall the plugin if this persists.",
    foldersNotFound: "the plugin folders could not be found",
    adapterNeeded: "This Selects build needs an updated {name} adapter.",
    stepFailed: "Selects could not complete this step.",
    musicApprox: "Music added; its beat could not be found reliably, so the cuts use approximate timing.",
    musicApproxDetail: "Music added; the cuts use approximate timing ({detail}).",
    musicUnreadable: "Could not read this music file ({detail}). Choose another file or one of the tracks.",
    beatFailed: "beat detection failed",
    previewFailed: "Could not play a preview: {detail}.",
    previewNotCut: "the preview could not be cut",
    noAudio: "no audio came back",
    dropMusic: "Drop a music file, or choose one of the tracks.",
    musicTooShortPick: "This music is too short for this length. Pick a shorter length or another track.",
    musicNotAdded: "The music could not be added to the Project.",
    musicNotRead: "the music could not be read",
    muffleNoCopy: "ending muffle skipped (this track has no muffled copy)",
    muffleSkipped: "ending muffle skipped ({detail})",
    muffleSkippedPlain: "ending muffle skipped",
    muffleNotImported: "ending muffle skipped (the muffled copy could not be imported)",
    sfxSkipped: "sound effects skipped ({detail})",
    sfxNotImported: "sound effects skipped (not imported)",
    draftUnconfirmedFinish: "The Draft \"{name}\" was saved, but Selects did not confirm it ({detail}). It has no title or look yet: press Finish title and look to add them, or build again.",
    draftUnconfirmed: "The Draft \"{name}\" was saved, but Selects did not confirm it ({detail}). It has no title or look yet; open it from the Drafts list, or build again.",
    nothingSaved: "{detail} Nothing was saved; press Build to try again.",
    draftNoId: "The Draft \"{name}\" was saved, but Selects did not report its id, so the title and look could not be added. Open it from the Drafts list, or build again.",
    finishFailed: "The Draft was created, but it could not be finished (title, labels and look): {detail}. Press Finish title and look to try again.",
    openFailed: "The Draft is ready, but it could not be opened: {detail}. Use the link below or open it from the Drafts list.",
    "param.seasonWord": "Season word",
    "param.creditName": "Credit name (empty hides the credit)",
    "param.place": "Place (empty hides the place title)",
    "param.line1Color": "Line 1 color",
    "param.seasonColor": "Season color",
    "param.labelColor": "Label color",
    "param.placeColor": "Place color",
    "param.shadow": "Shadow",
    "param.line1Size": "Line 1 size",
    "param.seasonSize": "Season size",
    "param.labelSize": "Label size",
    "param.placeSize": "Place size",
    "param.line1Y": "Line 1 height (%)",
    "param.seasonY": "Season height (%)",
    "param.topY": "Top label height (%)",
    "param.creditY": "Credit height (%)",
    "param.placeX": "Place across (%)",
    "param.placeY": "Place height (%)",
    "param.grain": "Film grain",
    "param.leak": "Light leak",
    "param.motion": "Motion",
    "param.motionStrength": "Motion strength",
    "param.videoMotion": "Video motion",
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
    openProject: "Öffne ein Projekt, um ein Sommerreise-Video zu erstellen.",
    refresh: "Aktualisieren",
    refreshing: "Wird aktualisiert",
    refreshFailed: "Die Clip-Liste konnte nicht aktualisiert werden: {detail}",
    readFailed: "Die Clips in diesem Projekt konnten nicht gelesen werden: {detail}",
    checkingClipsNow: "Clips werden geprüft …",
    checkingClips: "Clips werden geprüft",
    listening: "Beat wird gesucht",
    preparingTools: "Beat-Erkennung wird vorbereitet (nur beim ersten Mal)",
    working: "In Arbeit",
    noFootage: "In diesem Projekt gibt es noch keine Videoclips oder Fotos. Füge welche hinzu; die Anzeige aktualisiert sich automatisch.",
    noClipsSelected: "Keine Clips ausgewählt. Wähle Clips unter „Erweitert“.",
    gap: " ",
    ready: "Bereit: {summary}",
    clips: { one: "{count} Clip", other: "{count} Clips" },
    clipsSelected: { one: "{selected} von {count} Clip", other: "{selected} von {count} Clips" },
    photos: { one: "{count} Foto", other: "{count} Fotos" },
    photosSelected: { one: "{selected} von {count} Foto", other: "{selected} von {count} Fotos" },
    aboutSeconds: "ca. {seconds} s",
    betterWithAnalysis: "Analysierte Clips ergeben eine bessere Auswahl",
    clipsNotReady: { one: "{count} Clip noch nicht bereit", other: "{count} Clips noch nicht bereit" },
    clipsNotReadyWait: { one: "{count} Clip ist noch nicht bereit. Das aktualisiert sich automatisch.", other: "{count} Clips sind noch nicht bereit. Das aktualisiert sich automatisch." },
    checkingClipsCount: "Clips werden geprüft {done}/{count}",
    fitDistinct: { one: "{count} Clip oder Foto", other: "{count} verschiedene Clips und Fotos" },
    fitShrunk: { one: "{distinct} verschiedene Clips und Fotos. Dein Material reicht für {count} Montage-Einstellung (ca. {seconds} s)", other: "{distinct} verschiedene Clips und Fotos. Dein Material reicht für {count} Montage-Einstellungen (ca. {seconds} s)" },
    title: "Titel",
    line1: "Zeile 1",
    line1Limit: "Zeile 1 erlaubt bis zu {chars} Zeichen und {words} Wörter.",
    season: "Jahreszeit",
    seasonLimit: "Die Jahreszeit erlaubt bis zu {chars} Zeichen.",
    wideCounts: "Koreanische, japanische und chinesische Zeichen zählen als 2.",
    resetTo: "auf {season} zurücksetzen",
    place: "Ort",
    placeOptional: "Optional – leer lassen zum Ausblenden",
    placeLimit: "Der Ort erlaubt bis zu {chars} Zeichen.",
    placePrefix: "Ortspräfix",
    placePrefixHint: "Wird vor dem Ort angezeigt, zum Beispiel „{example}“",
    creditName: "Credit-Name",
    creditNameHint: "Optional – angezeigt als „{prefix} <Name>“",
    creditPrefix: "Credit-Präfix",
    creditPrefixHint: "Wird vor dem Credit-Namen angezeigt, zum Beispiel „{example}“",
    topLabel: "Oberes Label",
    topItalic: "Oberes Label (kursiver Teil)",
    style: "Stil",
    "preset.summer": "Sommer",
    "preset.poster": "Poster",
    "preset.postcard": "Postkarte",
    titlePreview: "Titelvorschau",
    music: "Musik",
    track: "Musikstück",
    ownMusic: "Eigene Musik",
    noMusic: "Keine Musik",
    devPlaceholder: "{title} (Entwicklungsplatzhalter)",
    installTools: "Installiere ffmpeg, um Musik vorzuhören oder eigene Musik zu verwenden.",
    length: "Länge",
    "length.short": "Kurz",
    "length.standard": "Standard",
    "length.long": "Lang",
    sectionHint: "Musikabschnitt – zum Auswählen ziehen",
    sectionLabel: "Musikabschnitt",
    musicTooShort: "Diese Musik ist für diese Länge zu kurz",
    dropAt: "Drop bei {seconds} s",
    sectionAt: "Abschnitt bei {seconds} s",
    dropStartsAt: "Drop · beginnt bei {seconds} s",
    sectionStartsAt: "Abschnitt · beginnt bei {seconds} s",
    stopPreview: "Vorschau stoppen",
    cancelPreview: "Vorschau abbrechen",
    previewSection: "Diesen Abschnitt vorhören",
    noMusicTiming: "Keine Musik: Die Schnitte nutzen ein ungefähres Timing (fester Beat von 0,5 s).",
    fixedTiming: "Ungefähres Timing: Der Beat dieser Musik konnte nicht zuverlässig gefunden werden.",
    faintTiming: "Ungefähres Timing im erkannten Tempo ({bpm} BPM): Das Tempo wurde gefunden, aber der Beat ist schwach, daher können die Schnitte danebenliegen.",
    noDrop: "Kein Drop gefunden: Das Raster beginnt nach den 2 Takten des Titels.",
    advanced: "Erweitert",
    clipSound: "Clip-Ton",
    "sound.off": "Aus",
    "sound.ambient": "Leise",
    "sound.full": "Voll",
    summerLook: "Sommer-Look",
    lookStrength: "Look-Stärke",
    soundEffects: "Soundeffekte",
    endingMuffle: "Gedämpftes Ende",
    usePhotos: "Fotos verwenden",
    usePhotosOff: "„Fotos verwenden“ ist aus",
    onlySfx: "Keine Musik und Clip-Ton ist „Aus“: Nur die Soundeffekte sind zu hören.",
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
    stoppedAt: "Abgebrochen bei Schritt {step}/{total}, {name}: {detail}",
    build: "Erstellen",
    building: "Wird erstellt",
    anotherVersion: "Andere Aufnahmen probieren",
    finishTitle: "Titel und Look fertigstellen",
    draftCreated: "Draft erstellt. Wähle den Titel oder die Labels aus, um Text, Farben und Positionen zu ändern (jede Grafik hat ihre eigene Kopie der Labels), einen Clip, um Look, Light Leak, Ausschnitt oder Ton anzupassen, und die Musik, um ihre Lautstärke zu ändern. Ein erneutes Erstellen legt einen neuen Draft an und übernimmt keine Änderungen aus „Anpassen“.",
    draftCreatedAdding: "Draft erstellt; Titel und Look werden hinzugefügt …",
    openDraft: "Neuen Draft öffnen",
    copyLink: "Link zum neuen Draft kopieren",
    shortened: { one: "Dein Material reicht für {count} Montage-Einstellung, daher ist dieses Video etwa {seconds} s statt {fullSeconds} s lang. Füge für die volle Länge weitere Clips hinzu.", other: "Dein Material reicht für {count} Montage-Einstellungen, daher ist dieses Video etwa {seconds} s statt {fullSeconds} s lang. Füge für die volle Länge weitere Clips hinzu." },
    approximateVideo: "Dieses Video nutzt ein ungefähres Timing.",
    note: "Hinweis: {detail}.",
    unchecked: { one: "{count} Video konnte nicht durchsucht werden und wurde ohne Szenensuche verwendet. Erstelle erneut, um es noch einmal zu versuchen.", other: "{count} Videos konnten nicht durchsucht werden und wurden ohne Szenensuche verwendet. Erstelle erneut, um es noch einmal zu versuchen." },
    "plan.needDistinct": "Mindestens {count} verschiedene Clips oder Fotos nötig ({found} gefunden).",
    "plan.needOpener": "Für den Anfang wird ein Videoclip mit mindestens {seconds} s Länge benötigt.",
    "plan.needPlace": "Für die Orts-Einstellung wird ein zweiter Clip mit mindestens {seconds} s Länge (oder ein Foto) benötigt.",
    "plan.needGrid": "Für die Rasterfelder werden mindestens {count} verschiedene, ausreichend lange Clips oder Fotos benötigt ({found} gefunden).",
    "plan.tooShort": "Dein Material ist für {count} Montage-Einstellungen zu kurz.",
    "plan.reuseMoments": "Einige Einstellungen verwenden Material aus demselben Moment eines Clips.",
    "plan.photoRun": "Mehr als {count} Fotos laufen hintereinander (nicht genug Video).",
    "plan.reusedPhotos": "Einige Fotos werden zweimal verwendet.",
    "plan.dropTooEarly": "Der Drop liegt zu nah am Anfang des Musikstücks; der Titel läuft über die ersten zwei Takte.",
    "plan.dropNoFit": "Der Drop-Abschnitt passt nicht zu dieser Länge; er wurde auf den spätesten passenden Beginn verschoben.",
    "plan.sectionMoved": "Der Abschnitt passte nicht zu dieser Länge; er wurde auf den spätesten passenden Beginn verschoben.",
    retryUnchecked: { one: "{reason} {count} Clip konnte nicht geprüft werden; drücke „Erstellen“, um es erneut zu versuchen.", other: "{reason} {count} Clips konnten nicht geprüft werden; drücke „Erstellen“, um es erneut zu versuchen." },
    startFailed: "Sommerreise konnte nicht gestartet werden: {detail}. Installiere das Plugin neu, falls das Problem bestehen bleibt.",
    foldersNotFound: "die Plugin-Ordner wurden nicht gefunden",
    adapterNeeded: "Diese Selects-Version braucht einen aktualisierten {name}-Adapter.",
    stepFailed: "Selects konnte diesen Schritt nicht abschließen.",
    musicApprox: "Musik hinzugefügt; ihr Beat konnte nicht zuverlässig gefunden werden, daher nutzen die Schnitte ein ungefähres Timing.",
    musicApproxDetail: "Musik hinzugefügt; die Schnitte nutzen ein ungefähres Timing ({detail}).",
    musicUnreadable: "Diese Musikdatei konnte nicht gelesen werden ({detail}). Wähle eine andere Datei oder eines der Musikstücke.",
    beatFailed: "Beat-Erkennung fehlgeschlagen",
    previewFailed: "Die Vorschau konnte nicht abgespielt werden: {detail}.",
    previewNotCut: "die Vorschau konnte nicht geschnitten werden",
    noAudio: "es kam kein Audio zurück",
    dropMusic: "Lege eine Musikdatei ab oder wähle eines der Musikstücke.",
    musicTooShortPick: "Diese Musik ist für diese Länge zu kurz. Wähle eine kürzere Länge oder ein anderes Musikstück.",
    musicNotAdded: "Die Musik konnte nicht zum Projekt hinzugefügt werden.",
    musicNotRead: "die Musik konnte nicht gelesen werden",
    muffleNoCopy: "gedämpftes Ende übersprungen (dieses Musikstück hat keine gedämpfte Fassung)",
    muffleSkipped: "gedämpftes Ende übersprungen ({detail})",
    muffleSkippedPlain: "gedämpftes Ende übersprungen",
    muffleNotImported: "gedämpftes Ende übersprungen (die gedämpfte Fassung konnte nicht importiert werden)",
    sfxSkipped: "Soundeffekte übersprungen ({detail})",
    sfxNotImported: "Soundeffekte übersprungen (nicht importiert)",
    draftUnconfirmedFinish: "Der Draft „{name}“ wurde gespeichert, aber Selects hat ihn nicht bestätigt ({detail}). Er hat noch keinen Titel und Look: Drücke „Titel und Look fertigstellen“, um sie hinzuzufügen, oder erstelle erneut.",
    draftUnconfirmed: "Der Draft „{name}“ wurde gespeichert, aber Selects hat ihn nicht bestätigt ({detail}). Er hat noch keinen Titel und Look; öffne ihn in der Draft-Liste oder erstelle erneut.",
    nothingSaved: "{detail} Es wurde nichts gespeichert; drücke „Erstellen“, um es erneut zu versuchen.",
    draftNoId: "Der Draft „{name}“ wurde gespeichert, aber Selects hat seine ID nicht gemeldet, daher konnten Titel und Look nicht hinzugefügt werden. Öffne ihn in der Draft-Liste oder erstelle erneut.",
    finishFailed: "Der Draft wurde erstellt, konnte aber nicht fertiggestellt werden (Titel, Labels und Look): {detail}. Drücke „Titel und Look fertigstellen“, um es erneut zu versuchen.",
    openFailed: "Der Draft ist fertig, konnte aber nicht geöffnet werden: {detail}. Nutze den Link unten oder öffne ihn in der Draft-Liste.",
    "param.seasonWord": "Jahreszeit-Wort",
    "param.creditName": "Credit-Name (leer blendet den Credit aus)",
    "param.place": "Ort (leer blendet den Ortstitel aus)",
    "param.line1Color": "Farbe Zeile 1",
    "param.seasonColor": "Farbe Jahreszeit",
    "param.labelColor": "Label-Farbe",
    "param.placeColor": "Farbe Ort",
    "param.shadow": "Schatten",
    "param.line1Size": "Größe Zeile 1",
    "param.seasonSize": "Größe Jahreszeit",
    "param.labelSize": "Label-Größe",
    "param.placeSize": "Größe Ort",
    "param.line1Y": "Höhe Zeile 1 (%)",
    "param.seasonY": "Höhe Jahreszeit (%)",
    "param.topY": "Höhe oberes Label (%)",
    "param.creditY": "Höhe Credit (%)",
    "param.placeX": "Ort horizontal (%)",
    "param.placeY": "Höhe Ort (%)",
    "param.grain": "Filmkorn",
    "param.leak": "Light Leak",
    "param.motion": "Bewegung",
    "param.motionStrength": "Bewegungsstärke",
    "param.videoMotion": "Videobewegung",
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
    openProject: "Abre un proyecto para crear un vídeo de Viaje de verano.",
    refresh: "Actualizar",
    refreshing: "Actualizando",
    refreshFailed: "No se pudo actualizar la lista de clips: {detail}",
    readFailed: "No se pudieron leer los clips de este proyecto: {detail}",
    checkingClipsNow: "Comprobando clips…",
    checkingClips: "Comprobando clips",
    listening: "Buscando el ritmo",
    preparingTools: "Preparando la detección del ritmo (solo la primera vez)",
    working: "Trabajando",
    noFootage: "Este proyecto aún no tiene clips de vídeo ni fotos. Añade algunos; se actualizará automáticamente.",
    noClipsSelected: "No hay clips seleccionados. Elige clips en «Avanzado».",
    gap: " ",
    ready: "Listo: {summary}",
    clips: { one: "{count} clip", many: "{count} de clips", other: "{count} clips" },
    clipsSelected: { one: "{selected} de {count} clip", many: "{selected} de {count} de clips", other: "{selected} de {count} clips" },
    photos: { one: "{count} foto", many: "{count} de fotos", other: "{count} fotos" },
    photosSelected: { one: "{selected} de {count} foto", many: "{selected} de {count} de fotos", other: "{selected} de {count} fotos" },
    aboutSeconds: "unos {seconds} s",
    betterWithAnalysis: "Los clips analizados permiten elegir mejores planos",
    clipsNotReady: { one: "{count} clip aún no está listo", many: "{count} de clips aún no están listos", other: "{count} clips aún no están listos" },
    clipsNotReadyWait: { one: "{count} clip aún no está listo. Esto se actualiza solo.", many: "{count} de clips aún no están listos. Esto se actualiza solo.", other: "{count} clips aún no están listos. Esto se actualiza solo." },
    checkingClipsCount: "Comprobando clips {done}/{count}",
    fitDistinct: { one: "{count} clip o foto distinto", many: "{count} de clips y fotos distintos", other: "{count} clips y fotos distintos" },
    fitShrunk: { one: "{distinct} clips y fotos distintos. Tu material da para {count} plano de montaje (unos {seconds} s)", many: "{distinct} clips y fotos distintos. Tu material da para {count} de planos de montaje (unos {seconds} s)", other: "{distinct} clips y fotos distintos. Tu material da para {count} planos de montaje (unos {seconds} s)" },
    title: "Título",
    line1: "Línea 1",
    line1Limit: "La línea 1 admite hasta {chars} caracteres y {words} palabras.",
    season: "Estación",
    seasonLimit: "La estación admite hasta {chars} caracteres.",
    wideCounts: "Los caracteres coreanos, japoneses y chinos cuentan como 2.",
    resetTo: "restablecer a {season}",
    place: "Lugar",
    placeOptional: "Opcional: déjalo en blanco para ocultarlo",
    placeLimit: "El lugar admite hasta {chars} caracteres.",
    placePrefix: "Prefijo del lugar",
    placePrefixHint: "Se muestra antes del lugar, por ejemplo «{example}»",
    creditName: "Nombre del crédito",
    creditNameHint: "Opcional: se muestra como «{prefix} <nombre>»",
    creditPrefix: "Prefijo del crédito",
    creditPrefixHint: "Se muestra antes del nombre del crédito, por ejemplo «{example}»",
    topLabel: "Etiqueta superior",
    topItalic: "Etiqueta superior (parte en cursiva)",
    style: "Estilo",
    "preset.summer": "Verano",
    "preset.poster": "Póster",
    "preset.postcard": "Postal",
    titlePreview: "Vista previa del título",
    music: "Música",
    track: "Pista",
    ownMusic: "Tu propia música",
    noMusic: "Sin música",
    devPlaceholder: "{title} (marcador de desarrollo)",
    installTools: "Instala ffmpeg para escuchar la música o usar tu propia pista.",
    length: "Duración",
    "length.short": "Corta",
    "length.standard": "Estándar",
    "length.long": "Larga",
    sectionHint: "Sección de música: arrastra para elegir",
    sectionLabel: "Sección de música",
    musicTooShort: "Esta música es demasiado corta para esta duración",
    dropAt: "Drop en {seconds} s",
    sectionAt: "Sección en {seconds} s",
    dropStartsAt: "Drop · empieza en {seconds} s",
    sectionStartsAt: "Sección · empieza en {seconds} s",
    stopPreview: "Detener la vista previa",
    cancelPreview: "Cancelar la vista previa",
    previewSection: "Escuchar esta sección",
    noMusicTiming: "Sin música: los cortes usan una sincronía aproximada (un ritmo fijo de 0,5 s).",
    fixedTiming: "Sincronía aproximada: no se pudo encontrar el ritmo de esta música con fiabilidad.",
    faintTiming: "Sincronía aproximada con el tempo detectado ({bpm} BPM): se encontró el tempo, pero el ritmo es débil, así que los cortes pueden no coincidir.",
    noDrop: "No se encontró ningún drop: la cuadrícula empieza después del título de 2 compases.",
    advanced: "Avanzado",
    clipSound: "Sonido de los clips",
    "sound.off": "Apagado",
    "sound.ambient": "Ambiente",
    "sound.full": "Completo",
    summerLook: "Look de verano",
    lookStrength: "Intensidad del look",
    soundEffects: "Efectos de sonido",
    endingMuffle: "Final amortiguado",
    usePhotos: "Usar fotos",
    usePhotosOff: "«Usar fotos» está desactivado",
    onlySfx: "Sin música y con el sonido de los clips en «Apagado»: solo suenan los efectos de sonido.",
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
    stoppedAt: "Se detuvo en el paso {step}/{total}, {name}: {detail}",
    build: "Crear",
    building: "Creando",
    anotherVersion: "Probar otros planos",
    finishTitle: "Terminar título y look",
    draftCreated: "Draft creado. Selecciona el título o las etiquetas para editar su texto, colores y posiciones (cada gráfico guarda su propia copia de las etiquetas), un clip para ajustar su look, fuga de luz, encuadre o sonido, y la música para cambiar su volumen. Volver a crear genera un Draft nuevo y no conserva los cambios hechos en «Ajustar».",
    draftCreatedAdding: "Draft creado; añadiendo título y look…",
    openDraft: "Abrir el nuevo Draft",
    copyLink: "Copiar el enlace al nuevo Draft",
    shortened: { one: "Tu material da para {count} plano de montaje, así que este vídeo dura unos {seconds} s en lugar de {fullSeconds} s. Añade más clips para la duración completa.", many: "Tu material da para {count} de planos de montaje, así que este vídeo dura unos {seconds} s en lugar de {fullSeconds} s. Añade más clips para la duración completa.", other: "Tu material da para {count} planos de montaje, así que este vídeo dura unos {seconds} s en lugar de {fullSeconds} s. Añade más clips para la duración completa." },
    approximateVideo: "Este vídeo usa una sincronía aproximada.",
    note: "Nota: {detail}.",
    unchecked: { one: "No se pudo buscar en {count} vídeo; se usó sin búsqueda de escenas. Vuelve a crear para reintentarlo.", many: "No se pudo buscar en {count} de vídeos; se usaron sin búsqueda de escenas. Vuelve a crear para reintentarlos.", other: "No se pudo buscar en {count} vídeos; se usaron sin búsqueda de escenas. Vuelve a crear para reintentarlos." },
    "plan.needDistinct": "Se necesitan al menos {count} clips o fotos distintos (se encontraron {found}).",
    "plan.needOpener": "Se necesita un clip de vídeo de al menos {seconds} s para la apertura.",
    "plan.needPlace": "Se necesita un segundo clip de al menos {seconds} s (o una foto) para el plano del lugar.",
    "plan.needGrid": "Se necesitan al menos {count} clips o fotos distintos con duración suficiente para los paneles de la cuadrícula (se encontraron {found}).",
    "plan.tooShort": "Tu material es demasiado corto para {count} planos de montaje.",
    "plan.reuseMoments": "Algunos planos reutilizan material del mismo momento de un clip.",
    "plan.photoRun": "Se reproducen más de {count} fotos seguidas (no hay suficiente vídeo).",
    "plan.reusedPhotos": "Algunas fotos se usan dos veces.",
    "plan.dropTooEarly": "El drop está demasiado cerca del inicio de la pista; el título se extiende sobre los dos primeros compases.",
    "plan.dropNoFit": "La sección del drop no cabe en esta duración; se movió al inicio más tardío que cabe.",
    "plan.sectionMoved": "La sección no cabía en esta duración; se movió al inicio más tardío que cabe.",
    retryUnchecked: { one: "{reason} No se pudo comprobar {count} clip; pulsa «Crear» para reintentarlo.", many: "{reason} No se pudieron comprobar {count} de clips; pulsa «Crear» para reintentarlos.", other: "{reason} No se pudieron comprobar {count} clips; pulsa «Crear» para reintentarlos." },
    startFailed: "Viaje de verano no pudo iniciarse: {detail}. Reinstala el plugin si el problema continúa.",
    foldersNotFound: "no se encontraron las carpetas del plugin",
    adapterNeeded: "Esta versión de Selects necesita un adaptador {name} actualizado.",
    stepFailed: "Selects no pudo completar este paso.",
    musicApprox: "Música añadida; no se pudo detectar su ritmo con fiabilidad, así que los cortes usan una sincronía aproximada.",
    musicApproxDetail: "Música añadida; los cortes usan una sincronía aproximada ({detail}).",
    musicUnreadable: "No se pudo leer este archivo de música ({detail}). Elige otro archivo o una de las pistas.",
    beatFailed: "falló la detección del ritmo",
    previewFailed: "No se pudo reproducir la vista previa: {detail}.",
    previewNotCut: "no se pudo recortar la vista previa",
    noAudio: "no se recibió audio",
    dropMusic: "Suelta un archivo de música o elige una de las pistas.",
    musicTooShortPick: "Esta música es demasiado corta para esta duración. Elige una duración más corta u otra pista.",
    musicNotAdded: "No se pudo añadir la música al proyecto.",
    musicNotRead: "no se pudo leer la música",
    muffleNoCopy: "se omitió el final amortiguado (esta pista no tiene una copia amortiguada)",
    muffleSkipped: "se omitió el final amortiguado ({detail})",
    muffleSkippedPlain: "se omitió el final amortiguado",
    muffleNotImported: "se omitió el final amortiguado (no se pudo importar la copia amortiguada)",
    sfxSkipped: "se omitieron los efectos de sonido ({detail})",
    sfxNotImported: "se omitieron los efectos de sonido (no se importaron)",
    draftUnconfirmedFinish: "El Draft «{name}» se guardó, pero Selects no lo confirmó ({detail}). Aún no tiene título ni look: pulsa «Terminar título y look» para añadirlos o vuelve a crear.",
    draftUnconfirmed: "El Draft «{name}» se guardó, pero Selects no lo confirmó ({detail}). Aún no tiene título ni look; ábrelo desde la lista de Drafts o vuelve a crear.",
    nothingSaved: "{detail} No se guardó nada; pulsa «Crear» para volver a intentarlo.",
    draftNoId: "El Draft «{name}» se guardó, pero Selects no informó de su id, así que no se pudieron añadir el título y el look. Ábrelo desde la lista de Drafts o vuelve a crear.",
    finishFailed: "El Draft se creó, pero no se pudo terminar (título, etiquetas y look): {detail}. Pulsa «Terminar título y look» para reintentarlo.",
    openFailed: "El Draft está listo, pero no se pudo abrir: {detail}. Usa el enlace de abajo o ábrelo desde la lista de Drafts.",
    "param.seasonWord": "Palabra de la estación",
    "param.creditName": "Nombre del crédito (vacío oculta el crédito)",
    "param.place": "Lugar (vacío oculta el título del lugar)",
    "param.line1Color": "Color de la línea 1",
    "param.seasonColor": "Color de la estación",
    "param.labelColor": "Color de las etiquetas",
    "param.placeColor": "Color del lugar",
    "param.shadow": "Sombra",
    "param.line1Size": "Tamaño de la línea 1",
    "param.seasonSize": "Tamaño de la estación",
    "param.labelSize": "Tamaño de las etiquetas",
    "param.placeSize": "Tamaño del lugar",
    "param.line1Y": "Altura de la línea 1 (%)",
    "param.seasonY": "Altura de la estación (%)",
    "param.topY": "Altura de la etiqueta superior (%)",
    "param.creditY": "Altura del crédito (%)",
    "param.placeX": "Posición horizontal del lugar (%)",
    "param.placeY": "Altura del lugar (%)",
    "param.grain": "Grano de película",
    "param.leak": "Fuga de luz",
    "param.motion": "Movimiento",
    "param.motionStrength": "Intensidad del movimiento",
    "param.videoMotion": "Movimiento del vídeo",
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
    openProject: "Ouvrez un projet pour créer une vidéo Voyage d'été.",
    refresh: "Actualiser",
    refreshing: "Actualisation",
    refreshFailed: "Impossible d'actualiser la liste des clips : {detail}",
    readFailed: "Impossible de lire les clips de ce projet : {detail}",
    checkingClipsNow: "Vérification des clips…",
    checkingClips: "Vérification des clips",
    listening: "Recherche du rythme",
    preparingTools: "Préparation de la détection du rythme (première fois uniquement)",
    working: "En cours",
    noFootage: "Ce projet ne contient pas encore de clip vidéo ni de photo. Ajoutez-en ; l'affichage se met à jour automatiquement.",
    noClipsSelected: "Aucun clip sélectionné. Choisissez des clips dans « Avancé ».",
    gap: " ",
    ready: "Prêt : {summary}",
    clips: { one: "{count} clip", many: "{count} de clips", other: "{count} clips" },
    clipsSelected: { one: "{selected} sur {count} clip", many: "{selected} sur {count} de clips", other: "{selected} sur {count} clips" },
    photos: { one: "{count} photo", many: "{count} de photos", other: "{count} photos" },
    photosSelected: { one: "{selected} sur {count} photo", many: "{selected} sur {count} de photos", other: "{selected} sur {count} photos" },
    aboutSeconds: "environ {seconds} s",
    betterWithAnalysis: "Les clips analysés permettent un meilleur choix de plans",
    clipsNotReady: { one: "{count} clip pas encore prêt", many: "{count} de clips pas encore prêts", other: "{count} clips pas encore prêts" },
    clipsNotReadyWait: { one: "{count} clip n'est pas encore prêt. Ceci se met à jour automatiquement.", many: "{count} de clips ne sont pas encore prêts. Ceci se met à jour automatiquement.", other: "{count} clips ne sont pas encore prêts. Ceci se met à jour automatiquement." },
    checkingClipsCount: "Vérification des clips {done}/{count}",
    fitDistinct: { one: "{count} clip ou photo distinct", many: "{count} de clips et photos distincts", other: "{count} clips et photos distincts" },
    fitShrunk: { one: "{distinct} clips et photos distincts. Vos images suffisent pour {count} plan de montage (environ {seconds} s)", many: "{distinct} clips et photos distincts. Vos images suffisent pour {count} de plans de montage (environ {seconds} s)", other: "{distinct} clips et photos distincts. Vos images suffisent pour {count} plans de montage (environ {seconds} s)" },
    title: "Titre",
    line1: "Ligne 1",
    line1Limit: "La ligne 1 accepte jusqu'à {chars} caractères et {words} mots.",
    season: "Saison",
    seasonLimit: "La saison accepte jusqu'à {chars} caractères.",
    wideCounts: "Les caractères coréens, japonais et chinois comptent pour 2.",
    resetTo: "rétablir {season}",
    place: "Lieu",
    placeOptional: "Facultatif — laissez vide pour masquer",
    placeLimit: "Le lieu accepte jusqu'à {chars} caractères.",
    placePrefix: "Préfixe du lieu",
    placePrefixHint: "Affiché avant le lieu, par exemple « {example} »",
    creditName: "Nom du crédit",
    creditNameHint: "Facultatif — affiché sous la forme « {prefix} <nom> »",
    creditPrefix: "Préfixe du crédit",
    creditPrefixHint: "Affiché avant le nom du crédit, par exemple « {example} »",
    topLabel: "Libellé du haut",
    topItalic: "Libellé du haut (partie en italique)",
    style: "Style",
    "preset.summer": "Été",
    "preset.poster": "Affiche",
    "preset.postcard": "Carte postale",
    titlePreview: "Aperçu du titre",
    music: "Musique",
    track: "Morceau",
    ownMusic: "Votre propre musique",
    noMusic: "Sans musique",
    devPlaceholder: "{title} (substitut de développement)",
    installTools: "Installez ffmpeg pour écouter la musique ou utiliser votre propre morceau.",
    length: "Durée",
    "length.short": "Courte",
    "length.standard": "Standard",
    "length.long": "Longue",
    sectionHint: "Section musicale : faites glisser pour choisir",
    sectionLabel: "Section musicale",
    musicTooShort: "Cette musique est trop courte pour cette durée",
    dropAt: "Drop à {seconds} s",
    sectionAt: "Section à {seconds} s",
    dropStartsAt: "Drop · commence à {seconds} s",
    sectionStartsAt: "Section · commence à {seconds} s",
    stopPreview: "Arrêter l'aperçu",
    cancelPreview: "Annuler l'aperçu",
    previewSection: "Écouter cette section",
    noMusicTiming: "Sans musique : les coupes suivent un calage approximatif (rythme fixe de 0,5 s).",
    fixedTiming: "Calage approximatif : le rythme de cette musique n'a pas pu être détecté de façon fiable.",
    faintTiming: "Calage approximatif sur le tempo détecté ({bpm} BPM) : le tempo a été trouvé, mais le rythme est peu marqué ; les coupes peuvent donc tomber à côté.",
    noDrop: "Aucun drop trouvé : la grille commence après les 2 mesures du titre.",
    advanced: "Avancé",
    clipSound: "Son des clips",
    "sound.off": "Coupé",
    "sound.ambient": "Ambiance",
    "sound.full": "Plein",
    summerLook: "Look d'été",
    lookStrength: "Intensité du look",
    soundEffects: "Effets sonores",
    endingMuffle: "Fin étouffée",
    usePhotos: "Utiliser les photos",
    usePhotosOff: "« Utiliser les photos » est désactivé",
    onlySfx: "Sans musique et son des clips sur « Coupé » : seuls les effets sonores sont audibles.",
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
    stoppedAt: "Arrêt à l'étape {step}/{total}, {name} : {detail}",
    build: "Créer",
    building: "Création",
    anotherVersion: "Essayer d'autres plans",
    finishTitle: "Terminer le titre et le look",
    draftCreated: "Draft créé. Sélectionnez le titre ou les libellés pour modifier leur texte, leurs couleurs et leurs positions (chaque graphique garde sa propre copie des libellés), un clip pour ajuster son look, sa fuite de lumière, son cadrage ou son son, et la musique pour changer son volume. Une nouvelle création produit un nouveau Draft et ne conserve pas les modifications faites dans « Ajuster ».",
    draftCreatedAdding: "Draft créé ; ajout du titre et du look…",
    openDraft: "Ouvrir le nouveau Draft",
    copyLink: "Copier le lien vers le nouveau Draft",
    shortened: { one: "Vos images suffisent pour {count} plan de montage ; cette vidéo dure donc environ {seconds} s au lieu de {fullSeconds} s. Ajoutez des clips pour obtenir la durée complète.", many: "Vos images suffisent pour {count} de plans de montage ; cette vidéo dure donc environ {seconds} s au lieu de {fullSeconds} s. Ajoutez des clips pour obtenir la durée complète.", other: "Vos images suffisent pour {count} plans de montage ; cette vidéo dure donc environ {seconds} s au lieu de {fullSeconds} s. Ajoutez des clips pour obtenir la durée complète." },
    approximateVideo: "Cette vidéo utilise un calage approximatif.",
    note: "Remarque : {detail}.",
    unchecked: { one: "Impossible d'analyser les scènes de {count} vidéo ; elle a été utilisée sans recherche de scènes. Relancez la création pour réessayer.", many: "Impossible d'analyser les scènes de {count} de vidéos ; elles ont été utilisées sans recherche de scènes. Relancez la création pour réessayer.", other: "Impossible d'analyser les scènes de {count} vidéos ; elles ont été utilisées sans recherche de scènes. Relancez la création pour réessayer." },
    "plan.needDistinct": "Il faut au moins {count} clips ou photos différents ({found} trouvés).",
    "plan.needOpener": "Il faut un clip vidéo d'au moins {seconds} s pour l'ouverture.",
    "plan.needPlace": "Il faut un second clip d'au moins {seconds} s (ou une photo) pour le plan du lieu.",
    "plan.needGrid": "Il faut au moins {count} clips ou photos différents assez longs pour les cases de la grille ({found} trouvés).",
    "plan.tooShort": "Vos images sont trop courtes pour {count} plans de montage.",
    "plan.reuseMoments": "Certains plans réutilisent des images du même moment d'un clip.",
    "plan.photoRun": "Plus de {count} photos s'enchaînent (pas assez de vidéo).",
    "plan.reusedPhotos": "Certaines photos sont utilisées deux fois.",
    "plan.dropTooEarly": "Le drop est trop proche du début du morceau ; le titre déborde sur les deux premières mesures.",
    "plan.dropNoFit": "La section du drop ne convient pas à cette durée ; elle a été déplacée au dernier début possible.",
    "plan.sectionMoved": "La section ne convenait pas à cette durée ; elle a été déplacée au dernier début possible.",
    retryUnchecked: { one: "{reason} {count} clip n'a pas pu être vérifié ; appuyez sur « Créer » pour réessayer.", many: "{reason} {count} de clips n'ont pas pu être vérifiés ; appuyez sur « Créer » pour réessayer.", other: "{reason} {count} clips n'ont pas pu être vérifiés ; appuyez sur « Créer » pour réessayer." },
    startFailed: "Voyage d'été n'a pas pu démarrer : {detail}. Réinstallez le plugin si le problème persiste.",
    foldersNotFound: "les dossiers du plugin sont introuvables",
    adapterNeeded: "Cette version de Selects nécessite un adaptateur {name} à jour.",
    stepFailed: "Selects n'a pas pu terminer cette étape.",
    musicApprox: "Musique ajoutée ; son rythme n'a pas pu être détecté de façon fiable, les coupes suivent donc un calage approximatif.",
    musicApproxDetail: "Musique ajoutée ; les coupes suivent un calage approximatif ({detail}).",
    musicUnreadable: "Impossible de lire ce fichier audio ({detail}). Choisissez un autre fichier ou l'un des morceaux.",
    beatFailed: "la détection du rythme a échoué",
    previewFailed: "Impossible de lire l'aperçu : {detail}.",
    previewNotCut: "l'aperçu n'a pas pu être découpé",
    noAudio: "aucun son n'a été renvoyé",
    dropMusic: "Déposez un fichier audio ou choisissez l'un des morceaux.",
    musicTooShortPick: "Cette musique est trop courte pour cette durée. Choisissez une durée plus courte ou un autre morceau.",
    musicNotAdded: "La musique n'a pas pu être ajoutée au projet.",
    musicNotRead: "la musique n'a pas pu être lue",
    muffleNoCopy: "fin étouffée ignorée (ce morceau n'a pas de version étouffée)",
    muffleSkipped: "fin étouffée ignorée ({detail})",
    muffleSkippedPlain: "fin étouffée ignorée",
    muffleNotImported: "fin étouffée ignorée (la version étouffée n'a pas pu être importée)",
    sfxSkipped: "effets sonores ignorés ({detail})",
    sfxNotImported: "effets sonores ignorés (non importés)",
    draftUnconfirmedFinish: "Le Draft « {name} » a été enregistré, mais Selects ne l'a pas confirmé ({detail}). Il n'a pas encore de titre ni de look : appuyez sur « Terminer le titre et le look » pour les ajouter, ou relancez la création.",
    draftUnconfirmed: "Le Draft « {name} » a été enregistré, mais Selects ne l'a pas confirmé ({detail}). Il n'a pas encore de titre ni de look ; ouvrez-le depuis la liste des Drafts ou relancez la création.",
    nothingSaved: "{detail} Rien n'a été enregistré ; appuyez sur « Créer » pour réessayer.",
    draftNoId: "Le Draft « {name} » a été enregistré, mais Selects n'a pas communiqué son identifiant ; le titre et le look n'ont donc pas pu être ajoutés. Ouvrez-le depuis la liste des Drafts ou relancez la création.",
    finishFailed: "Le Draft a été créé, mais n'a pas pu être finalisé (titre, libellés et look) : {detail}. Appuyez sur « Terminer le titre et le look » pour réessayer.",
    openFailed: "Le Draft est prêt, mais n'a pas pu être ouvert : {detail}. Utilisez le lien ci-dessous ou ouvrez-le depuis la liste des Drafts.",
    "param.seasonWord": "Mot de la saison",
    "param.creditName": "Nom du crédit (vide : crédit masqué)",
    "param.place": "Lieu (vide : titre du lieu masqué)",
    "param.line1Color": "Couleur de la ligne 1",
    "param.seasonColor": "Couleur de la saison",
    "param.labelColor": "Couleur des libellés",
    "param.placeColor": "Couleur du lieu",
    "param.shadow": "Ombre",
    "param.line1Size": "Taille de la ligne 1",
    "param.seasonSize": "Taille de la saison",
    "param.labelSize": "Taille des libellés",
    "param.placeSize": "Taille du lieu",
    "param.line1Y": "Hauteur de la ligne 1 (%)",
    "param.seasonY": "Hauteur de la saison (%)",
    "param.topY": "Hauteur du libellé du haut (%)",
    "param.creditY": "Hauteur du crédit (%)",
    "param.placeX": "Position horizontale du lieu (%)",
    "param.placeY": "Hauteur du lieu (%)",
    "param.grain": "Grain de film",
    "param.leak": "Fuite de lumière",
    "param.motion": "Mouvement",
    "param.motionStrength": "Intensité du mouvement",
    "param.videoMotion": "Mouvement vidéo",
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
    openProject: "Apri un progetto per creare un video Viaggio d'estate.",
    refresh: "Aggiorna",
    refreshing: "Aggiornamento",
    refreshFailed: "Impossibile aggiornare l'elenco delle clip: {detail}",
    readFailed: "Impossibile leggere le clip di questo progetto: {detail}",
    checkingClipsNow: "Controllo delle clip…",
    checkingClips: "Controllo delle clip",
    listening: "Ricerca del ritmo",
    preparingTools: "Preparazione del rilevamento del ritmo (solo la prima volta)",
    working: "In corso",
    noFootage: "In questo progetto non ci sono ancora clip video né foto. Aggiungine qualcuna; si aggiorna automaticamente.",
    noClipsSelected: "Nessuna clip selezionata. Scegli le clip in «Avanzate».",
    gap: " ",
    ready: "Pronto: {summary}",
    clips: { one: "{count} clip", many: "{count} di clip", other: "{count} clip" },
    clipsSelected: { one: "{selected} di {count} clip", many: "{selected} di {count} di clip", other: "{selected} di {count} clip" },
    photos: { one: "{count} foto", many: "{count} di foto", other: "{count} foto" },
    photosSelected: { one: "{selected} di {count} foto", many: "{selected} di {count} di foto", other: "{selected} di {count} foto" },
    aboutSeconds: "circa {seconds} s",
    betterWithAnalysis: "Le clip analizzate permettono di scegliere inquadrature migliori",
    clipsNotReady: { one: "{count} clip non ancora pronta", many: "{count} di clip non ancora pronte", other: "{count} clip non ancora pronte" },
    clipsNotReadyWait: { one: "{count} clip non è ancora pronta. Si aggiorna automaticamente.", many: "{count} di clip non sono ancora pronte. Si aggiorna automaticamente.", other: "{count} clip non sono ancora pronte. Si aggiorna automaticamente." },
    checkingClipsCount: "Controllo delle clip {done}/{count}",
    fitDistinct: { one: "{count} clip o foto distinta", many: "{count} di clip e foto distinte", other: "{count} clip e foto distinte" },
    fitShrunk: { one: "{distinct} clip e foto distinte. Il tuo materiale basta per {count} inquadratura di montaggio (circa {seconds} s)", many: "{distinct} clip e foto distinte. Il tuo materiale basta per {count} di inquadrature di montaggio (circa {seconds} s)", other: "{distinct} clip e foto distinte. Il tuo materiale basta per {count} inquadrature di montaggio (circa {seconds} s)" },
    title: "Titolo",
    line1: "Riga 1",
    line1Limit: "La riga 1 accetta fino a {chars} caratteri e {words} parole.",
    season: "Stagione",
    seasonLimit: "La stagione accetta fino a {chars} caratteri.",
    wideCounts: "I caratteri coreani, giapponesi e cinesi contano come 2.",
    resetTo: "ripristina {season}",
    place: "Luogo",
    placeOptional: "Facoltativo — lascia vuoto per nasconderlo",
    placeLimit: "Il luogo accetta fino a {chars} caratteri.",
    placePrefix: "Prefisso del luogo",
    placePrefixHint: "Mostrato prima del luogo, ad esempio «{example}»",
    creditName: "Nome nei crediti",
    creditNameHint: "Facoltativo — mostrato come «{prefix} <nome>»",
    creditPrefix: "Prefisso dei crediti",
    creditPrefixHint: "Mostrato prima del nome nei crediti, ad esempio «{example}»",
    topLabel: "Etichetta in alto",
    topItalic: "Etichetta in alto (parte in corsivo)",
    style: "Stile",
    "preset.summer": "Estate",
    "preset.poster": "Poster",
    "preset.postcard": "Cartolina",
    titlePreview: "Anteprima del titolo",
    music: "Musica",
    track: "Brano",
    ownMusic: "La tua musica",
    noMusic: "Nessuna musica",
    devPlaceholder: "{title} (segnaposto di sviluppo)",
    installTools: "Installa ffmpeg per ascoltare la musica o usare un tuo brano.",
    length: "Durata",
    "length.short": "Breve",
    "length.standard": "Standard",
    "length.long": "Lunga",
    sectionHint: "Sezione musicale: trascina per scegliere",
    sectionLabel: "Sezione musicale",
    musicTooShort: "Questa musica è troppo corta per questa durata",
    dropAt: "Drop a {seconds} s",
    sectionAt: "Sezione a {seconds} s",
    dropStartsAt: "Drop · inizia a {seconds} s",
    sectionStartsAt: "Sezione · inizia a {seconds} s",
    stopPreview: "Ferma l'anteprima",
    cancelPreview: "Annulla l'anteprima",
    previewSection: "Ascolta questa sezione",
    noMusicTiming: "Nessuna musica: i tagli usano una sincronia approssimativa (ritmo fisso di 0,5 s).",
    fixedTiming: "Sincronia approssimativa: non è stato possibile rilevare in modo affidabile il ritmo di questa musica.",
    faintTiming: "Sincronia approssimativa sul tempo rilevato ({bpm} BPM): il tempo è stato trovato ma il ritmo è debole, quindi i tagli potrebbero non coincidere.",
    noDrop: "Nessun drop trovato: la griglia inizia dopo le 2 battute del titolo.",
    advanced: "Avanzate",
    clipSound: "Audio delle clip",
    "sound.off": "Spento",
    "sound.ambient": "Ambiente",
    "sound.full": "Pieno",
    summerLook: "Look estivo",
    lookStrength: "Intensità del look",
    soundEffects: "Effetti sonori",
    endingMuffle: "Finale attutito",
    usePhotos: "Usa foto",
    usePhotosOff: "«Usa foto» è disattivato",
    onlySfx: "Nessuna musica e audio delle clip su «Spento»: si sentono solo gli effetti sonori.",
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
    stoppedAt: "Interrotto al passaggio {step}/{total}, {name}: {detail}",
    build: "Crea",
    building: "Creazione",
    anotherVersion: "Prova altre inquadrature",
    finishTitle: "Completa titolo e look",
    draftCreated: "Draft creato. Seleziona il titolo o le etichette per modificarne testo, colori e posizioni (ogni grafica ha una propria copia delle etichette), una clip per regolarne look, light leak, ritaglio o audio, e la musica per cambiarne il volume. Creando di nuovo si ottiene un nuovo Draft e le modifiche fatte in «Regola» non vengono mantenute.",
    draftCreatedAdding: "Draft creato; aggiunta di titolo e look…",
    openDraft: "Apri il nuovo Draft",
    copyLink: "Copia il link al nuovo Draft",
    shortened: { one: "Il tuo materiale basta per {count} inquadratura di montaggio, quindi questo video dura circa {seconds} s invece di {fullSeconds} s. Aggiungi altre clip per la durata completa.", many: "Il tuo materiale basta per {count} di inquadrature di montaggio, quindi questo video dura circa {seconds} s invece di {fullSeconds} s. Aggiungi altre clip per la durata completa.", other: "Il tuo materiale basta per {count} inquadrature di montaggio, quindi questo video dura circa {seconds} s invece di {fullSeconds} s. Aggiungi altre clip per la durata completa." },
    approximateVideo: "Questo video usa una sincronia approssimativa.",
    note: "Nota: {detail}.",
    unchecked: { one: "Non è stato possibile cercare le scene in {count} video, che è stato usato senza ricerca delle scene. Crea di nuovo per riprovare.", many: "Non è stato possibile cercare le scene in {count} di video, che sono stati usati senza ricerca delle scene. Crea di nuovo per riprovare.", other: "Non è stato possibile cercare le scene in {count} video, che sono stati usati senza ricerca delle scene. Crea di nuovo per riprovare." },
    "plan.needDistinct": "Servono almeno {count} clip o foto diverse (trovate {found}).",
    "plan.needOpener": "Serve una clip video lunga almeno {seconds} s per l'apertura.",
    "plan.needPlace": "Serve una seconda clip lunga almeno {seconds} s (o una foto) per l'inquadratura del luogo.",
    "plan.needGrid": "Servono almeno {count} clip o foto diverse abbastanza lunghe per i riquadri della griglia (trovate {found}).",
    "plan.tooShort": "Il tuo materiale è troppo corto per {count} inquadrature di montaggio.",
    "plan.reuseMoments": "Alcune inquadrature riutilizzano materiale dello stesso momento di una clip.",
    "plan.photoRun": "Più di {count} foto vengono mostrate di seguito (video insufficiente).",
    "plan.reusedPhotos": "Alcune foto sono usate due volte.",
    "plan.dropTooEarly": "Il drop è troppo vicino all'inizio del brano; il titolo occupa le prime due battute.",
    "plan.dropNoFit": "La sezione del drop non è compatibile con questa durata; è stata spostata all'ultimo inizio possibile.",
    "plan.sectionMoved": "La sezione non era compatibile con questa durata; è stata spostata all'ultimo inizio possibile.",
    retryUnchecked: { one: "{reason} Non è stato possibile controllare {count} clip; premi «Crea» per riprovare.", many: "{reason} Non è stato possibile controllare {count} di clip; premi «Crea» per riprovare.", other: "{reason} Non è stato possibile controllare {count} clip; premi «Crea» per riprovare." },
    startFailed: "Impossibile avviare Viaggio d'estate: {detail}. Reinstalla il plugin se il problema persiste.",
    foldersNotFound: "le cartelle del plugin non sono state trovate",
    adapterNeeded: "Questa versione di Selects richiede un adattatore {name} aggiornato.",
    stepFailed: "Selects non è riuscito a completare questo passaggio.",
    musicApprox: "Musica aggiunta; il suo ritmo non è stato rilevato in modo affidabile, quindi i tagli usano una sincronia approssimativa.",
    musicApproxDetail: "Musica aggiunta; i tagli usano una sincronia approssimativa ({detail}).",
    musicUnreadable: "Impossibile leggere questo file musicale ({detail}). Scegli un altro file o uno dei brani.",
    beatFailed: "rilevamento del ritmo non riuscito",
    previewFailed: "Impossibile riprodurre l'anteprima: {detail}.",
    previewNotCut: "non è stato possibile ritagliare l'anteprima",
    noAudio: "non è stato restituito alcun audio",
    dropMusic: "Trascina qui un file musicale o scegli uno dei brani.",
    musicTooShortPick: "Questa musica è troppo corta per questa durata. Scegli una durata più breve o un altro brano.",
    musicNotAdded: "Non è stato possibile aggiungere la musica al progetto.",
    musicNotRead: "non è stato possibile leggere la musica",
    muffleNoCopy: "finale attutito saltato (questo brano non ha una versione attutita)",
    muffleSkipped: "finale attutito saltato ({detail})",
    muffleSkippedPlain: "finale attutito saltato",
    muffleNotImported: "finale attutito saltato (non è stato possibile importare la versione attutita)",
    sfxSkipped: "effetti sonori saltati ({detail})",
    sfxNotImported: "effetti sonori saltati (non importati)",
    draftUnconfirmedFinish: "Il Draft «{name}» è stato salvato, ma Selects non l'ha confermato ({detail}). Non ha ancora titolo né look: premi «Completa titolo e look» per aggiungerli, o crea di nuovo.",
    draftUnconfirmed: "Il Draft «{name}» è stato salvato, ma Selects non l'ha confermato ({detail}). Non ha ancora titolo né look; aprilo dall'elenco dei Draft o crea di nuovo.",
    nothingSaved: "{detail} Non è stato salvato nulla; premi «Crea» per riprovare.",
    draftNoId: "Il Draft «{name}» è stato salvato, ma Selects non ne ha comunicato l'id, quindi non è stato possibile aggiungere titolo e look. Aprilo dall'elenco dei Draft o crea di nuovo.",
    finishFailed: "Il Draft è stato creato, ma non è stato possibile completarlo (titolo, etichette e look): {detail}. Premi «Completa titolo e look» per riprovare.",
    openFailed: "Il Draft è pronto, ma non è stato possibile aprirlo: {detail}. Usa il link qui sotto o aprilo dall'elenco dei Draft.",
    "param.seasonWord": "Parola della stagione",
    "param.creditName": "Nome nei crediti (vuoto nasconde i crediti)",
    "param.place": "Luogo (vuoto nasconde il titolo del luogo)",
    "param.line1Color": "Colore riga 1",
    "param.seasonColor": "Colore stagione",
    "param.labelColor": "Colore etichette",
    "param.placeColor": "Colore luogo",
    "param.shadow": "Ombra",
    "param.line1Size": "Dimensione riga 1",
    "param.seasonSize": "Dimensione stagione",
    "param.labelSize": "Dimensione etichette",
    "param.placeSize": "Dimensione luogo",
    "param.line1Y": "Altezza riga 1 (%)",
    "param.seasonY": "Altezza stagione (%)",
    "param.topY": "Altezza etichetta in alto (%)",
    "param.creditY": "Altezza crediti (%)",
    "param.placeX": "Posizione orizzontale luogo (%)",
    "param.placeY": "Altezza luogo (%)",
    "param.grain": "Grana della pellicola",
    "param.leak": "Light leak",
    "param.motion": "Movimento",
    "param.motionStrength": "Intensità del movimento",
    "param.videoMotion": "Movimento video",
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
    openProject: "サマートリップの動画を作成するには、プロジェクトを開いてください。",
    refresh: "更新",
    refreshing: "更新中",
    refreshFailed: "クリップ一覧を更新できませんでした: {detail}",
    readFailed: "このプロジェクトのクリップを読み込めませんでした: {detail}",
    checkingClipsNow: "クリップを確認中…",
    checkingClips: "クリップを確認中",
    listening: "ビートを検出中",
    preparingTools: "ビート検出を準備中(初回のみ)",
    working: "処理中",
    noFootage: "このプロジェクトには、まだ動画クリップも写真もありません。追加してください。自動で更新されます。",
    noClipsSelected: "クリップが選択されていません。「詳細設定」でクリップを選んでください。",
    gap: "",
    ready: "準備完了: {summary}",
    clips: { other: "クリップ {count} 本" },
    clipsSelected: { other: "クリップ {count} 本中 {selected} 本を選択" },
    photos: { other: "写真 {count} 枚" },
    photosSelected: { other: "写真 {count} 枚中 {selected} 枚を選択" },
    aboutSeconds: "約 {seconds} 秒",
    betterWithAnalysis: "解析済みのクリップのほうが良いショットを選べます",
    clipsNotReady: { other: "{count} 本のクリップがまだ準備中" },
    clipsNotReadyWait: { other: "{count} 本のクリップがまだ準備中です。自動で更新されます。" },
    checkingClipsCount: "クリップを確認中 {done}/{count}",
    fitDistinct: { other: "異なるクリップ・写真 {count} 点" },
    fitShrunk: { other: "異なるクリップ・写真 {distinct} 点。素材で作れるモンタージュは {count} ショット（約 {seconds} 秒）" },
    title: "タイトル",
    line1: "1 行目",
    line1Limit: "1 行目は {chars} 文字・{words} 語まで入力できます。",
    season: "季節",
    seasonLimit: "季節の単語は {chars} 文字まで入力できます。",
    wideCounts: "日本語・韓国語・中国語の文字は 2 文字として数えます。",
    resetTo: "{season} に戻す",
    place: "場所",
    placeOptional: "任意 — 空欄にすると非表示",
    placeLimit: "場所は {chars} 文字まで入力できます。",
    placePrefix: "場所の前置き",
    placePrefixHint: "場所の前に表示（例:「{example}」）",
    creditName: "クレジット名",
    creditNameHint: "任意 —「{prefix} <名前>」と表示されます",
    creditPrefix: "クレジットの前置き",
    creditPrefixHint: "クレジット名の前に表示（例:「{example}」）",
    topLabel: "上部ラベル",
    topItalic: "上部ラベル（斜体部分）",
    style: "スタイル",
    "preset.summer": "サマー",
    "preset.poster": "ポスター",
    "preset.postcard": "ポストカード",
    titlePreview: "タイトルのプレビュー",
    music: "音楽",
    track: "トラック",
    ownMusic: "自分の音楽",
    noMusic: "音楽なし",
    devPlaceholder: "{title}（開発用の仮トラック）",
    installTools: "音楽のプレビューや自分の曲の使用には、ffmpeg をインストールしてください。",
    length: "長さ",
    "length.short": "短め",
    "length.standard": "標準",
    "length.long": "長め",
    sectionHint: "音楽の区間 — ドラッグして選択",
    sectionLabel: "音楽の区間",
    musicTooShort: "この音楽は、この長さには短すぎます",
    dropAt: "ドロップ（{seconds} 秒）",
    sectionAt: "区間（{seconds} 秒）",
    dropStartsAt: "ドロップ · {seconds} 秒から開始",
    sectionStartsAt: "区間 · {seconds} 秒から開始",
    stopPreview: "プレビューを停止",
    cancelPreview: "プレビューをキャンセル",
    previewSection: "この区間をプレビュー",
    noMusicTiming: "音楽なし: カットはおおよそのタイミング（0.5 秒固定のビート）を使います。",
    fixedTiming: "おおよそのタイミング: この音楽のビートを確実に検出できませんでした。",
    faintTiming: "検出したテンポ（{bpm} BPM）でのおおよそのタイミングです。テンポは見つかりましたがビートが弱いため、カットがずれることがあります。",
    noDrop: "ドロップが見つかりません: 4 分割画面は 2 小節のタイトルの後に始まります。",
    advanced: "詳細設定",
    clipSound: "クリップの音",
    "sound.off": "オフ",
    "sound.ambient": "環境音",
    "sound.full": "フル",
    summerLook: "サマールック",
    lookStrength: "ルックの強さ",
    soundEffects: "効果音",
    endingMuffle: "こもったエンディング",
    usePhotos: "写真を使う",
    usePhotosOff: "「写真を使う」がオフです",
    onlySfx: "音楽なしで、クリップの音が「オフ」です: 効果音だけが再生されます。",
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
    stoppedAt: "ステップ {step}/{total}（{name}）で停止しました: {detail}",
    build: "作成",
    building: "作成中",
    anotherVersion: "別のショットで作成",
    finishTitle: "タイトルとルックを仕上げる",
    draftCreated: "Draft を作成しました。タイトルやラベルを選択するとテキスト・色・位置を（ラベルはグラフィックごとに別々に保持されます）、クリップを選択するとルック・光漏れ・クロップ・音を、音楽を選択すると音量を変更できます。もう一度作成すると新しい Draft になり、「調整」での編集は引き継がれません。",
    draftCreatedAdding: "Draft を作成しました。タイトルとルックを追加中…",
    openDraft: "新しい Draft を開く",
    copyLink: "新しい Draft へのリンクをコピー",
    shortened: { other: "素材で作れるモンタージュが {count} ショットのため、この動画は {fullSeconds} 秒ではなく約 {seconds} 秒になります。フルの長さにするにはクリップを追加してください。" },
    approximateVideo: "この動画はおおよそのタイミングを使っています。",
    note: "メモ: {detail}。",
    unchecked: { other: "{count} 本の動画でシーン検索ができなかったため、シーン検索なしで使用しました。もう一度作成すると再試行します。" },
    "plan.needDistinct": "異なるクリップか写真が少なくとも {count} 点必要です（見つかったのは {found} 点）。",
    "plan.needOpener": "オープニング用に、{seconds} 秒以上の動画クリップが 1 本必要です。",
    "plan.needPlace": "場所のショット用に、{seconds} 秒以上の 2 本目のクリップ（または写真）が必要です。",
    "plan.needGrid": "4 分割画面用に、十分な長さの異なるクリップか写真が少なくとも {count} 点必要です（見つかったのは {found} 点）。",
    "plan.tooShort": "素材が短すぎて、モンタージュ {count} ショットを作れません。",
    "plan.reuseMoments": "一部のショットで、クリップの同じ場面を再利用しています。",
    "plan.photoRun": "写真が {count} 枚を超えて連続します（動画が足りません）。",
    "plan.reusedPhotos": "一部の写真が 2 回使われています。",
    "plan.dropTooEarly": "ドロップがトラックの冒頭に近すぎるため、タイトルが最初の 2 小節にかかります。",
    "plan.dropNoFit": "ドロップの区間がこの長さに収まらないため、収まる最も遅い開始位置に移動しました。",
    "plan.sectionMoved": "区間がこの長さに収まらなかったため、収まる最も遅い開始位置に移動しました。",
    retryUnchecked: { other: "{reason}{count} 本のクリップを確認できませんでした。「作成」を押すと再試行します。" },
    startFailed: "サマートリップを開始できませんでした: {detail}。解決しない場合はプラグインを再インストールしてください。",
    foldersNotFound: "プラグインのフォルダが見つかりませんでした",
    adapterNeeded: "この Selects のビルドには、更新された {name} アダプターが必要です。",
    stepFailed: "Selects はこのステップを完了できませんでした。",
    musicApprox: "音楽を追加しました。ビートを確実に検出できなかったため、カットはおおよそのタイミングを使います。",
    musicApproxDetail: "音楽を追加しました。カットはおおよそのタイミングを使います（{detail}）。",
    musicUnreadable: "この音楽ファイルを読み込めませんでした（{detail}）。別のファイルか、用意されたトラックを選んでください。",
    beatFailed: "ビートの検出に失敗しました",
    previewFailed: "プレビューを再生できませんでした: {detail}。",
    previewNotCut: "プレビューを切り出せませんでした",
    noAudio: "音声が返されませんでした",
    dropMusic: "音楽ファイルをドロップするか、用意されたトラックを選んでください。",
    musicTooShortPick: "この音楽は、この長さには短すぎます。短い長さか別のトラックを選んでください。",
    musicNotAdded: "音楽をプロジェクトに追加できませんでした。",
    musicNotRead: "音楽を読み込めませんでした",
    muffleNoCopy: "こもったエンディングをスキップしました（このトラックにはこもった音源がありません）",
    muffleSkipped: "こもったエンディングをスキップしました（{detail}）",
    muffleSkippedPlain: "こもったエンディングをスキップしました",
    muffleNotImported: "こもったエンディングをスキップしました（こもった音源を取り込めませんでした）",
    sfxSkipped: "効果音をスキップしました（{detail}）",
    sfxNotImported: "効果音をスキップしました（取り込めませんでした）",
    draftUnconfirmedFinish: "Draft「{name}」は保存されましたが、Selects で確認できませんでした（{detail}）。まだタイトルとルックがありません。「タイトルとルックを仕上げる」を押して追加するか、もう一度作成してください。",
    draftUnconfirmed: "Draft「{name}」は保存されましたが、Selects で確認できませんでした（{detail}）。まだタイトルとルックがありません。Draft 一覧から開くか、もう一度作成してください。",
    nothingSaved: "{detail}何も保存されていません。「作成」を押して再試行してください。",
    draftNoId: "Draft「{name}」は保存されましたが、Selects から ID が返されなかったため、タイトルとルックを追加できませんでした。Draft 一覧から開くか、もう一度作成してください。",
    finishFailed: "Draft は作成されましたが、仕上げ（タイトル、ラベル、ルック）ができませんでした: {detail}。「タイトルとルックを仕上げる」を押して再試行してください。",
    openFailed: "Draft の準備はできましたが、開けませんでした: {detail}。下のリンクを使うか、Draft 一覧から開いてください。",
    "param.seasonWord": "季節の単語",
    "param.creditName": "クレジット名（空欄でクレジットを非表示）",
    "param.place": "場所（空欄で場所のタイトルを非表示）",
    "param.line1Color": "1 行目の色",
    "param.seasonColor": "季節の単語の色",
    "param.labelColor": "ラベルの色",
    "param.placeColor": "場所の色",
    "param.shadow": "影",
    "param.line1Size": "1 行目のサイズ",
    "param.seasonSize": "季節の単語のサイズ",
    "param.labelSize": "ラベルのサイズ",
    "param.placeSize": "場所のサイズ",
    "param.line1Y": "1 行目の高さ（%）",
    "param.seasonY": "季節の単語の高さ（%）",
    "param.topY": "上部ラベルの高さ（%）",
    "param.creditY": "クレジットの高さ（%）",
    "param.placeX": "場所の横位置（%）",
    "param.placeY": "場所の高さ（%）",
    "param.grain": "フィルムグレイン",
    "param.leak": "光漏れ",
    "param.motion": "モーション",
    "param.motionStrength": "モーションの強さ",
    "param.videoMotion": "動画のモーション",
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
    openProject: "\uc11c\uba38 \ud2b8\ub9bd \uc601\uc0c1\uc744 \ub9cc\ub4e4\ub824\uba74 \ud504\ub85c\uc81d\ud2b8\ub97c \uc5ec\uc138\uc694.",
    refresh: "\uc0c8\ub85c\uace0\uce68",
    refreshing: "\uc0c8\ub85c\uace0\uce68 \uc911",
    refreshFailed: "\ud074\ub9bd \ubaa9\ub85d\uc744 \uc0c8\ub85c\uace0\uce68\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}",
    readFailed: "\uc774 \ud504\ub85c\uc81d\ud2b8\uc758 \ud074\ub9bd\uc744 \uc77d\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}",
    checkingClipsNow: "\ud074\ub9bd \ud655\uc778 \uc911…",
    checkingClips: "\ud074\ub9bd \ud655\uc778 \uc911",
    listening: "\ube44\ud2b8 \ucc3e\ub294 \uc911",
    preparingTools: "\ube44\ud2b8 \uac10\uc9c0 \uc900\ube44 \uc911(\ucc98\uc74c \ud55c \ubc88\ub9cc)",
    working: "\uc791\uc5c5 \uc911",
    noFootage: "\uc774 \ud504\ub85c\uc81d\ud2b8\uc5d0\ub294 \uc544\uc9c1 \uc601\uc0c1 \ud074\ub9bd\uc774\ub098 \uc0ac\uc9c4\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. \ucd94\uac00\ud558\uc138\uc694. \uc790\ub3d9\uc73c\ub85c \uc5c5\ub370\uc774\ud2b8\ub429\ub2c8\ub2e4.",
    noClipsSelected: "\uc120\ud0dd\ud55c \ud074\ub9bd\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. ‘\uace0\uae09’\uc5d0\uc11c \ud074\ub9bd\uc744 \uc120\ud0dd\ud558\uc138\uc694.",
    gap: " ",
    ready: "\uc900\ube44 \uc644\ub8cc: {summary}",
    clips: { other: "\ud074\ub9bd {count}\uac1c" },
    clipsSelected: { other: "\ud074\ub9bd {count}\uac1c \uc911 {selected}\uac1c \uc120\ud0dd" },
    photos: { other: "\uc0ac\uc9c4 {count}\uc7a5" },
    photosSelected: { other: "\uc0ac\uc9c4 {count}\uc7a5 \uc911 {selected}\uc7a5 \uc120\ud0dd" },
    aboutSeconds: "\uc57d {seconds}\ucd08",
    betterWithAnalysis: "\ubd84\uc11d\ub41c \ud074\ub9bd\uc774 \uc788\uc73c\uba74 \ub354 \uc88b\uc740 \uc0f7\uc744 \uace0\ub985\ub2c8\ub2e4",
    clipsNotReady: { other: "\ud074\ub9bd {count}\uac1c \uc544\uc9c1 \uc900\ube44 \uc911" },
    clipsNotReadyWait: { other: "\ud074\ub9bd {count}\uac1c\uac00 \uc544\uc9c1 \uc900\ube44 \uc911\uc785\ub2c8\ub2e4. \uc790\ub3d9\uc73c\ub85c \uc5c5\ub370\uc774\ud2b8\ub429\ub2c8\ub2e4." },
    checkingClipsCount: "\ud074\ub9bd \ud655\uc778 \uc911 {done}/{count}",
    fitDistinct: { other: "\uc11c\ub85c \ub2e4\ub978 \ud074\ub9bd·\uc0ac\uc9c4 {count}\uac1c" },
    fitShrunk: { other: "\uc11c\ub85c \ub2e4\ub978 \ud074\ub9bd·\uc0ac\uc9c4 {distinct}\uac1c. \uc601\uc0c1\uc73c\ub85c \ucc44\uc6b8 \uc218 \uc788\ub294 \ubabd\ud0c0\uc8fc \uc0f7 {count}\uac1c(\uc57d {seconds}\ucd08)" },
    title: "\ud0c0\uc774\ud2c0",
    line1: "\uccab \uc904",
    line1Limit: "\uccab \uc904\uc740 \ucd5c\ub300 {chars}\uc790, {words}\ub2e8\uc5b4\uae4c\uc9c0 \uc785\ub825\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.",
    season: "\uacc4\uc808",
    seasonLimit: "\uacc4\uc808 \ub2e8\uc5b4\ub294 \ucd5c\ub300 {chars}\uc790\uae4c\uc9c0 \uc785\ub825\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.",
    wideCounts: "\ud55c\uae00, \uc77c\ubcf8\uc5b4, \uc911\uad6d\uc5b4 \ubb38\uc790\ub294 2\uc790\ub85c \uacc4\uc0b0\ub429\ub2c8\ub2e4.",
    resetTo: "{season}(\uc73c)\ub85c \ub418\ub3cc\ub9ac\uae30",
    place: "\uc7a5\uc18c",
    placeOptional: "\uc120\ud0dd \uc0ac\ud56d — \ube44\uc6cc \ub450\uba74 \uc228\uaca8\uc9d1\ub2c8\ub2e4",
    placeLimit: "\uc7a5\uc18c\ub294 \ucd5c\ub300 {chars}\uc790\uae4c\uc9c0 \uc785\ub825\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.",
    placePrefix: "\uc7a5\uc18c \uc55e \ubb38\uad6c",
    placePrefixHint: "\uc7a5\uc18c \uc55e\uc5d0 \ud45c\uc2dc\ub429\ub2c8\ub2e4. \uc608: ‘{example}’",
    creditName: "\ud06c\ub808\ub527 \uc774\ub984",
    creditNameHint: "\uc120\ud0dd \uc0ac\ud56d — ‘{prefix} <\uc774\ub984>’ \ud615\ud0dc\ub85c \ud45c\uc2dc\ub429\ub2c8\ub2e4",
    creditPrefix: "\ud06c\ub808\ub527 \uc55e \ubb38\uad6c",
    creditPrefixHint: "\ud06c\ub808\ub527 \uc774\ub984 \uc55e\uc5d0 \ud45c\uc2dc\ub429\ub2c8\ub2e4. \uc608: ‘{example}’",
    topLabel: "\uc0c1\ub2e8 \ub77c\ubca8",
    topItalic: "\uc0c1\ub2e8 \ub77c\ubca8(\uae30\uc6b8\uc784 \ubd80\ubd84)",
    style: "\uc2a4\ud0c0\uc77c",
    "preset.summer": "\uc5ec\ub984",
    "preset.poster": "\ud3ec\uc2a4\ud130",
    "preset.postcard": "\uc5fd\uc11c",
    titlePreview: "\ud0c0\uc774\ud2c0 \ubbf8\ub9ac\ubcf4\uae30",
    music: "\uc74c\uc545",
    track: "\ud2b8\ub799",
    ownMusic: "\ub0b4 \uc74c\uc545",
    noMusic: "\uc74c\uc545 \uc5c6\uc74c",
    devPlaceholder: "{title} (\uac1c\ubc1c\uc6a9 \uc784\uc2dc \uc74c\uc6d0)",
    installTools: "\uc74c\uc545\uc744 \ubbf8\ub9ac \ub4e3\uac70\ub098 \ub0b4 \uc74c\uc545\uc744 \uc4f0\ub824\uba74 ffmpeg\ub97c \uc124\uce58\ud558\uc138\uc694.",
    length: "\uae38\uc774",
    "length.short": "\uc9e7\uac8c",
    "length.standard": "\ubcf4\ud1b5",
    "length.long": "\uae38\uac8c",
    sectionHint: "\uc74c\uc545 \uad6c\uac04 — \ub4dc\ub798\uadf8\ud574\uc11c \uc120\ud0dd",
    sectionLabel: "\uc74c\uc545 \uad6c\uac04",
    musicTooShort: "\uc774 \uae38\uc774\ub85c \ub9cc\ub4e4\uae30\uc5d0\ub294 \uc74c\uc545\uc774 \ub108\ubb34 \uc9e7\uc2b5\ub2c8\ub2e4",
    dropAt: "{seconds}\ucd08 \uc9c0\uc810 \ub4dc\ub86d",
    sectionAt: "{seconds}\ucd08 \uc9c0\uc810 \uad6c\uac04",
    dropStartsAt: "\ub4dc\ub86d · {seconds}\ucd08\ubd80\ud130 \uc2dc\uc791",
    sectionStartsAt: "\uad6c\uac04 · {seconds}\ucd08\ubd80\ud130 \uc2dc\uc791",
    stopPreview: "\ubbf8\ub9ac\ub4e3\uae30 \uc911\uc9c0",
    cancelPreview: "\ubbf8\ub9ac\ub4e3\uae30 \ucde8\uc18c",
    previewSection: "\uc774 \uad6c\uac04 \ubbf8\ub9ac\ub4e3\uae30",
    noMusicTiming: "\uc74c\uc545 \uc5c6\uc74c: \ucef7\uc740 \ub300\ub7b5\uc801\uc778 \ud0c0\uc774\ubc0d(0.5\ucd08 \uace0\uc815 \ube44\ud2b8)\uc744 \uc0ac\uc6a9\ud569\ub2c8\ub2e4.",
    fixedTiming: "\ub300\ub7b5\uc801\uc778 \ud0c0\uc774\ubc0d: \uc774 \uc74c\uc545\uc758 \ube44\ud2b8\ub97c \ud655\uc2e4\ud558\uac8c \ucc3e\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.",
    faintTiming: "\uac10\uc9c0\ud55c \ud15c\ud3ec({bpm} BPM)\uc5d0 \ub300\ub7b5 \ub9de\ucd98 \ud0c0\uc774\ubc0d\uc785\ub2c8\ub2e4. \ud15c\ud3ec\ub294 \ucc3e\uc558\uc9c0\ub9cc \ube44\ud2b8\uac00 \uc57d\ud574\uc11c \ucef7\uc774 \uc5b4\uae0b\ub0a0 \uc218 \uc788\uc2b5\ub2c8\ub2e4.",
    noDrop: "\ub4dc\ub86d\uc744 \ucc3e\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: 4\ubd84\ud560 \ud654\uba74\uc740 2\ub9c8\ub514 \ud0c0\uc774\ud2c0 \ub4a4\uc5d0 \uc2dc\uc791\ud569\ub2c8\ub2e4.",
    advanced: "\uace0\uae09",
    clipSound: "\ud074\ub9bd \uc18c\ub9ac",
    "sound.off": "\ub054",
    "sound.ambient": "\ubc30\uacbd\uc74c",
    "sound.full": "\uc6d0\uc74c",
    summerLook: "\uc5ec\ub984 \uc0c9\uac10",
    lookStrength: "\uc0c9\uac10 \uac15\ub3c4",
    soundEffects: "\ud6a8\uacfc\uc74c",
    endingMuffle: "\uba39\uba39\ud55c \uc5d4\ub529",
    usePhotos: "\uc0ac\uc9c4 \uc0ac\uc6a9",
    usePhotosOff: "‘\uc0ac\uc9c4 \uc0ac\uc6a9’\uc774 \uaebc\uc838 \uc788\uc74c",
    onlySfx: "\uc74c\uc545\uc774 \uc5c6\uace0 \ud074\ub9bd \uc18c\ub9ac\uac00 ‘\ub054’\uc774\ub77c\uc11c \ud6a8\uacfc\uc74c\ub9cc \uc7ac\uc0dd\ub429\ub2c8\ub2e4.",
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
    stoppedAt: "{step}/{total}\ub2e8\uacc4({name})\uc5d0\uc11c \uc911\ub2e8\ub418\uc5c8\uc2b5\ub2c8\ub2e4: {detail}",
    build: "\ub9cc\ub4e4\uae30",
    building: "\ub9cc\ub4dc\ub294 \uc911",
    anotherVersion: "\ub2e4\ub978 \uc0f7\uc73c\ub85c \ub9cc\ub4e4\uae30",
    finishTitle: "\ud0c0\uc774\ud2c0\uacfc \uc0c9\uac10 \ub9c8\ubb34\ub9ac",
    draftCreated: "Draft\ub97c \ub9cc\ub4e4\uc5c8\uc2b5\ub2c8\ub2e4. \ud0c0\uc774\ud2c0\uc774\ub098 \ub77c\ubca8\uc744 \uc120\ud0dd\ud558\uba74 \uae00\uc790, \uc0c9, \uc704\uce58\ub97c(\uadf8\ub798\ud53d\ub9c8\ub2e4 \ub77c\ubca8\uc744 \ub530\ub85c \uac00\uc9d1\ub2c8\ub2e4), \ud074\ub9bd\uc744 \uc120\ud0dd\ud558\uba74 \uc0c9\uac10, \ube5b \ubc88\uc9d0, \ud06c\ub86d, \uc18c\ub9ac\ub97c, \uc74c\uc545\uc744 \uc120\ud0dd\ud558\uba74 \uc74c\ub7c9\uc744 \ubc14\uafc0 \uc218 \uc788\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \ub9cc\ub4e4\uba74 \uc0c8 Draft\uac00 \uc0dd\uae30\uba70 ‘\uc870\uc815’\uc5d0\uc11c \uc218\uc815\ud55c \ub0b4\uc6a9\uc740 \uc720\uc9c0\ub418\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.",
    draftCreatedAdding: "Draft\ub97c \ub9cc\ub4e4\uc5c8\uc2b5\ub2c8\ub2e4. \ud0c0\uc774\ud2c0\uacfc \uc0c9\uac10\uc744 \ucd94\uac00\ud558\ub294 \uc911…",
    openDraft: "\uc0c8 Draft \uc5f4\uae30",
    copyLink: "\uc0c8 Draft \ub9c1\ud06c \ubcf5\uc0ac",
    shortened: { other: "\uc601\uc0c1\uc73c\ub85c \ucc44\uc6b8 \uc218 \uc788\ub294 \ubabd\ud0c0\uc8fc \uc0f7\uc774 {count}\uac1c\ub77c\uc11c, \uc774 \uc601\uc0c1\uc740 {fullSeconds}\ucd08\uac00 \uc544\ub2c8\ub77c \uc57d {seconds}\ucd08\uc785\ub2c8\ub2e4. \uc804\uccb4 \uae38\uc774\ub85c \ub9cc\ub4e4\ub824\uba74 \ud074\ub9bd\uc744 \ub354 \ucd94\uac00\ud558\uc138\uc694." },
    approximateVideo: "\uc774 \uc601\uc0c1\uc740 \ub300\ub7b5\uc801\uc778 \ud0c0\uc774\ubc0d\uc744 \uc0ac\uc6a9\ud569\ub2c8\ub2e4.",
    note: "\ucc38\uace0: {detail}.",
    unchecked: { other: "\uc601\uc0c1 {count}\uac1c\uc5d0\uc11c \uc7a5\uba74\uc744 \uac80\uc0c9\ud558\uc9c0 \ubabb\ud574 \uc7a5\uba74 \uac80\uc0c9 \uc5c6\uc774 \uc0ac\uc6a9\ud588\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \ub9cc\ub4e4\uba74 \uc7ac\uc2dc\ub3c4\ud569\ub2c8\ub2e4." },
    "plan.needDistinct": "\uc11c\ub85c \ub2e4\ub978 \ud074\ub9bd\uc774\ub098 \uc0ac\uc9c4\uc774 \ucd5c\uc18c {count}\uac1c \ud544\uc694\ud569\ub2c8\ub2e4(\ud604\uc7ac {found}\uac1c).",
    "plan.needOpener": "\uc624\ud504\ub2dd\uc5d0 \uc4f8 {seconds}\ucd08 \uc774\uc0c1\uc758 \uc601\uc0c1 \ud074\ub9bd\uc774 \ud558\ub098 \ud544\uc694\ud569\ub2c8\ub2e4.",
    "plan.needPlace": "\uc7a5\uc18c \uc0f7\uc5d0 \uc4f8 {seconds}\ucd08 \uc774\uc0c1\uc758 \ub450 \ubc88\uc9f8 \ud074\ub9bd(\ub610\ub294 \uc0ac\uc9c4)\uc774 \ud544\uc694\ud569\ub2c8\ub2e4.",
    "plan.needGrid": "4\ubd84\ud560 \ud654\uba74\uc5d0 \uc4f8 \ub9cc\ud07c \uae34 \uc11c\ub85c \ub2e4\ub978 \ud074\ub9bd\uc774\ub098 \uc0ac\uc9c4\uc774 \ucd5c\uc18c {count}\uac1c \ud544\uc694\ud569\ub2c8\ub2e4(\ud604\uc7ac {found}\uac1c).",
    "plan.tooShort": "\uc601\uc0c1\uc774 \ubabd\ud0c0\uc8fc \uc0f7 {count}\uac1c\ub97c \ucc44\uc6b0\uae30\uc5d0\ub294 \ub108\ubb34 \uc9e7\uc2b5\ub2c8\ub2e4.",
    "plan.reuseMoments": "\uc77c\ubd80 \uc0f7\uc774 \ud074\ub9bd\uc758 \uac19\uc740 \uc21c\uac04\uc744 \ub2e4\uc2dc \uc0ac\uc6a9\ud569\ub2c8\ub2e4.",
    "plan.photoRun": "\uc0ac\uc9c4\uc774 {count}\uc7a5 \ub118\uac8c \uc5f0\ub2ec\uc544 \ub098\uc635\ub2c8\ub2e4(\uc601\uc0c1 \ubd80\uc871).",
    "plan.reusedPhotos": "\uc77c\ubd80 \uc0ac\uc9c4\uc774 \ub450 \ubc88 \uc0ac\uc6a9\ub429\ub2c8\ub2e4.",
    "plan.dropTooEarly": "\ub4dc\ub86d\uc774 \ud2b8\ub799 \uc2dc\uc791 \ubd80\ubd84\uc5d0 \ub108\ubb34 \uac00\uae4c\uc6cc\uc11c \ud0c0\uc774\ud2c0\uc774 \ucc98\uc74c \ub450 \ub9c8\ub514\uc5d0 \uac78\uce69\ub2c8\ub2e4.",
    "plan.dropNoFit": "\ub4dc\ub86d \uad6c\uac04\uc774 \uc774 \uae38\uc774\uc5d0 \ub9de\uc9c0 \uc54a\uc544, \ub4e4\uc5b4\uac08 \uc218 \uc788\ub294 \uac00\uc7a5 \ub2a6\uc740 \uc2dc\uc791 \uc9c0\uc810\uc73c\ub85c \uc62e\uacbc\uc2b5\ub2c8\ub2e4.",
    "plan.sectionMoved": "\uad6c\uac04\uc774 \uc774 \uae38\uc774\uc5d0 \ub9de\uc9c0 \uc54a\uc544, \ub4e4\uc5b4\uac08 \uc218 \uc788\ub294 \uac00\uc7a5 \ub2a6\uc740 \uc2dc\uc791 \uc9c0\uc810\uc73c\ub85c \uc62e\uacbc\uc2b5\ub2c8\ub2e4.",
    retryUnchecked: { other: "{reason} \ud074\ub9bd {count}\uac1c\ub97c \ud655\uc778\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. ‘\ub9cc\ub4e4\uae30’\ub97c \ub204\ub974\uba74 \uc7ac\uc2dc\ub3c4\ud569\ub2c8\ub2e4." },
    startFailed: "\uc11c\uba38 \ud2b8\ub9bd\uc744 \uc2dc\uc791\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}. \ubb38\uc81c\uac00 \uacc4\uc18d\ub418\uba74 \ud50c\ub7ec\uadf8\uc778\uc744 \ub2e4\uc2dc \uc124\uce58\ud558\uc138\uc694.",
    foldersNotFound: "\ud50c\ub7ec\uadf8\uc778 \ud3f4\ub354\ub97c \ucc3e\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4",
    adapterNeeded: "\uc774 Selects \ube4c\ub4dc\uc5d0\ub294 \uc5c5\ub370\uc774\ud2b8\ub41c {name} \uc5b4\ub311\ud130\uac00 \ud544\uc694\ud569\ub2c8\ub2e4.",
    stepFailed: "Selects\uac00 \uc774 \ub2e8\uacc4\ub97c \uc644\ub8cc\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.",
    musicApprox: "\uc74c\uc545\uc744 \ucd94\uac00\ud588\uc2b5\ub2c8\ub2e4. \ube44\ud2b8\ub97c \ud655\uc2e4\ud558\uac8c \ucc3e\uc9c0 \ubabb\ud574 \ucef7\uc740 \ub300\ub7b5\uc801\uc778 \ud0c0\uc774\ubc0d\uc744 \uc0ac\uc6a9\ud569\ub2c8\ub2e4.",
    musicApproxDetail: "\uc74c\uc545\uc744 \ucd94\uac00\ud588\uc2b5\ub2c8\ub2e4. \ucef7\uc740 \ub300\ub7b5\uc801\uc778 \ud0c0\uc774\ubc0d\uc744 \uc0ac\uc6a9\ud569\ub2c8\ub2e4({detail}).",
    musicUnreadable: "\uc774 \uc74c\uc545 \ud30c\uc77c\uc744 \uc77d\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4({detail}). \ub2e4\ub978 \ud30c\uc77c\uc774\ub098 \uc81c\uacf5\ub41c \ud2b8\ub799\uc744 \uc120\ud0dd\ud558\uc138\uc694.",
    beatFailed: "\ube44\ud2b8 \uac10\uc9c0\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4",
    previewFailed: "\ubbf8\ub9ac\ub4e3\uae30\ub97c \uc7ac\uc0dd\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}.",
    previewNotCut: "\ubbf8\ub9ac\ub4e3\uae30 \uad6c\uac04\uc744 \uc798\ub77c\ub0b4\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4",
    noAudio: "\uc624\ub514\uc624\uac00 \ub3cc\uc544\uc624\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4",
    dropMusic: "\uc74c\uc545 \ud30c\uc77c\uc744 \ub04c\uc5b4\ub2e4 \ub193\uac70\ub098 \uc81c\uacf5\ub41c \ud2b8\ub799\uc744 \uc120\ud0dd\ud558\uc138\uc694.",
    musicTooShortPick: "\uc774 \uae38\uc774\ub85c \ub9cc\ub4e4\uae30\uc5d0\ub294 \uc74c\uc545\uc774 \ub108\ubb34 \uc9e7\uc2b5\ub2c8\ub2e4. \ub354 \uc9e7\uc740 \uae38\uc774\ub098 \ub2e4\ub978 \ud2b8\ub799\uc744 \uc120\ud0dd\ud558\uc138\uc694.",
    musicNotAdded: "\uc74c\uc545\uc744 \ud504\ub85c\uc81d\ud2b8\uc5d0 \ucd94\uac00\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.",
    musicNotRead: "\uc74c\uc545\uc744 \uc77d\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4",
    muffleNoCopy: "\uba39\uba39\ud55c \uc5d4\ub529\uc744 \uac74\ub108\ub6f0\uc5c8\uc2b5\ub2c8\ub2e4(\uc774 \ud2b8\ub799\uc5d0\ub294 \uba39\uba39\ud55c \ubc84\uc804\uc774 \uc5c6\uc74c)",
    muffleSkipped: "\uba39\uba39\ud55c \uc5d4\ub529\uc744 \uac74\ub108\ub6f0\uc5c8\uc2b5\ub2c8\ub2e4({detail})",
    muffleSkippedPlain: "\uba39\uba39\ud55c \uc5d4\ub529\uc744 \uac74\ub108\ub6f0\uc5c8\uc2b5\ub2c8\ub2e4",
    muffleNotImported: "\uba39\uba39\ud55c \uc5d4\ub529\uc744 \uac74\ub108\ub6f0\uc5c8\uc2b5\ub2c8\ub2e4(\uba39\uba39\ud55c \ubc84\uc804\uc744 \uac00\uc838\uc624\uc9c0 \ubabb\ud568)",
    sfxSkipped: "\ud6a8\uacfc\uc74c\uc744 \uac74\ub108\ub6f0\uc5c8\uc2b5\ub2c8\ub2e4({detail})",
    sfxNotImported: "\ud6a8\uacfc\uc74c\uc744 \uac74\ub108\ub6f0\uc5c8\uc2b5\ub2c8\ub2e4(\uac00\uc838\uc624\uc9c0 \ubabb\ud568)",
    draftUnconfirmedFinish: "Draft “{name}”\uc740(\ub294) \uc800\uc7a5\ub418\uc5c8\uc9c0\ub9cc Selects\uac00 \ud655\uc778\ud558\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4({detail}). \uc544\uc9c1 \ud0c0\uc774\ud2c0\uacfc \uc0c9\uac10\uc774 \uc5c6\uc73c\ub2c8 ‘\ud0c0\uc774\ud2c0\uacfc \uc0c9\uac10 \ub9c8\ubb34\ub9ac’\ub97c \ub20c\ub7ec \ucd94\uac00\ud558\uac70\ub098 \ub2e4\uc2dc \ub9cc\ub4dc\uc138\uc694.",
    draftUnconfirmed: "Draft “{name}”\uc740(\ub294) \uc800\uc7a5\ub418\uc5c8\uc9c0\ub9cc Selects\uac00 \ud655\uc778\ud558\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4({detail}). \uc544\uc9c1 \ud0c0\uc774\ud2c0\uacfc \uc0c9\uac10\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. Draft \ubaa9\ub85d\uc5d0\uc11c \uc5f4\uac70\ub098 \ub2e4\uc2dc \ub9cc\ub4dc\uc138\uc694.",
    nothingSaved: "{detail} \uc800\uc7a5\ub41c \ub0b4\uc6a9\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. ‘\ub9cc\ub4e4\uae30’\ub97c \ub20c\ub7ec \ub2e4\uc2dc \uc2dc\ub3c4\ud558\uc138\uc694.",
    draftNoId: "Draft “{name}”\uc740(\ub294) \uc800\uc7a5\ub418\uc5c8\uc9c0\ub9cc Selects\uac00 ID\ub97c \uc54c\ub824\uc8fc\uc9c0 \uc54a\uc544 \ud0c0\uc774\ud2c0\uacfc \uc0c9\uac10\uc744 \ucd94\uac00\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. Draft \ubaa9\ub85d\uc5d0\uc11c \uc5f4\uac70\ub098 \ub2e4\uc2dc \ub9cc\ub4dc\uc138\uc694.",
    finishFailed: "Draft\ub294 \ub9cc\ub4e4\uc5c8\uc9c0\ub9cc \ub9c8\ubb34\ub9ac(\ud0c0\uc774\ud2c0, \ub77c\ubca8, \uc0c9\uac10)\ub97c \ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}. ‘\ud0c0\uc774\ud2c0\uacfc \uc0c9\uac10 \ub9c8\ubb34\ub9ac’\ub97c \ub20c\ub7ec \ub2e4\uc2dc \uc2dc\ub3c4\ud558\uc138\uc694.",
    openFailed: "Draft\ub294 \uc900\ube44\ub418\uc5c8\uc9c0\ub9cc \uc5f4\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}. \uc544\ub798 \ub9c1\ud06c\ub97c \uc4f0\uac70\ub098 Draft \ubaa9\ub85d\uc5d0\uc11c \uc5ec\uc138\uc694.",
    "param.seasonWord": "\uacc4\uc808 \ub2e8\uc5b4",
    "param.creditName": "\ud06c\ub808\ub527 \uc774\ub984(\ube44\uc6b0\uba74 \ud06c\ub808\ub527 \uc228\uae40)",
    "param.place": "\uc7a5\uc18c(\ube44\uc6b0\uba74 \uc7a5\uc18c \ud0c0\uc774\ud2c0 \uc228\uae40)",
    "param.line1Color": "\uccab \uc904 \uc0c9",
    "param.seasonColor": "\uacc4\uc808 \ub2e8\uc5b4 \uc0c9",
    "param.labelColor": "\ub77c\ubca8 \uc0c9",
    "param.placeColor": "\uc7a5\uc18c \uc0c9",
    "param.shadow": "\uadf8\ub9bc\uc790",
    "param.line1Size": "\uccab \uc904 \ud06c\uae30",
    "param.seasonSize": "\uacc4\uc808 \ub2e8\uc5b4 \ud06c\uae30",
    "param.labelSize": "\ub77c\ubca8 \ud06c\uae30",
    "param.placeSize": "\uc7a5\uc18c \ud06c\uae30",
    "param.line1Y": "\uccab \uc904 \ub192\uc774(%)",
    "param.seasonY": "\uacc4\uc808 \ub2e8\uc5b4 \ub192\uc774(%)",
    "param.topY": "\uc0c1\ub2e8 \ub77c\ubca8 \ub192\uc774(%)",
    "param.creditY": "\ud06c\ub808\ub527 \ub192\uc774(%)",
    "param.placeX": "\uc7a5\uc18c \uac00\ub85c \uc704\uce58(%)",
    "param.placeY": "\uc7a5\uc18c \ub192\uc774(%)",
    "param.grain": "\ud544\ub984 \uadf8\ub808\uc778",
    "param.leak": "\ube5b \ubc88\uc9d0",
    "param.motion": "\ubaa8\uc158",
    "param.motionStrength": "\ubaa8\uc158 \uac15\ub3c4",
    "param.videoMotion": "\uc601\uc0c1 \ubaa8\uc158",
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
    openProject: "Abra um projeto para criar um vídeo de Viagem de verão.",
    refresh: "Atualizar",
    refreshing: "Atualizando",
    refreshFailed: "Não foi possível atualizar a lista de clipes: {detail}",
    readFailed: "Não foi possível ler os clipes deste projeto: {detail}",
    checkingClipsNow: "Verificando clipes…",
    checkingClips: "Verificando clipes",
    listening: "Procurando a batida",
    preparingTools: "Preparando a detecção da batida (só na primeira vez)",
    working: "Trabalhando",
    noFootage: "Este projeto ainda não tem clipes de vídeo nem fotos. Adicione alguns; a lista é atualizada automaticamente.",
    noClipsSelected: "Nenhum clipe selecionado. Escolha clipes em “Avançado”.",
    gap: " ",
    ready: "Pronto: {summary}",
    clips: { one: "{count} clipe", many: "{count} de clipes", other: "{count} clipes" },
    clipsSelected: { one: "{selected} de {count} clipe", many: "{selected} de {count} de clipes", other: "{selected} de {count} clipes" },
    photos: { one: "{count} foto", many: "{count} de fotos", other: "{count} fotos" },
    photosSelected: { one: "{selected} de {count} foto", many: "{selected} de {count} de fotos", other: "{selected} de {count} fotos" },
    aboutSeconds: "cerca de {seconds} s",
    betterWithAnalysis: "Clipes analisados permitem escolher planos melhores",
    clipsNotReady: { one: "{count} clipe ainda não está pronto", many: "{count} de clipes ainda não estão prontos", other: "{count} clipes ainda não estão prontos" },
    clipsNotReadyWait: { one: "{count} clipe ainda não está pronto. Isto se atualiza sozinho.", many: "{count} de clipes ainda não estão prontos. Isto se atualiza sozinho.", other: "{count} clipes ainda não estão prontos. Isto se atualiza sozinho." },
    checkingClipsCount: "Verificando clipes {done}/{count}",
    fitDistinct: { one: "{count} clipe ou foto diferente", many: "{count} de clipes e fotos diferentes", other: "{count} clipes e fotos diferentes" },
    fitShrunk: { one: "{distinct} clipes e fotos diferentes. Seu material rende {count} plano de montagem (cerca de {seconds} s)", many: "{distinct} clipes e fotos diferentes. Seu material rende {count} de planos de montagem (cerca de {seconds} s)", other: "{distinct} clipes e fotos diferentes. Seu material rende {count} planos de montagem (cerca de {seconds} s)" },
    title: "Título",
    line1: "Linha 1",
    line1Limit: "A linha 1 aceita até {chars} caracteres e {words} palavras.",
    season: "Estação",
    seasonLimit: "A estação aceita até {chars} caracteres.",
    wideCounts: "Caracteres coreanos, japoneses e chineses contam como 2.",
    resetTo: "redefinir para {season}",
    place: "Lugar",
    placeOptional: "Opcional: deixe em branco para ocultar",
    placeLimit: "O lugar aceita até {chars} caracteres.",
    placePrefix: "Prefixo do lugar",
    placePrefixHint: "Exibido antes do lugar, por exemplo “{example}”",
    creditName: "Nome do crédito",
    creditNameHint: "Opcional: exibido como “{prefix} <nome>”",
    creditPrefix: "Prefixo do crédito",
    creditPrefixHint: "Exibido antes do nome do crédito, por exemplo “{example}”",
    topLabel: "Rótulo superior",
    topItalic: "Rótulo superior (parte em itálico)",
    style: "Estilo",
    "preset.summer": "Verão",
    "preset.poster": "Pôster",
    "preset.postcard": "Postal",
    titlePreview: "Prévia do título",
    music: "Música",
    track: "Faixa",
    ownMusic: "Sua própria música",
    noMusic: "Sem música",
    devPlaceholder: "{title} (marcador de desenvolvimento)",
    installTools: "Instale o ffmpeg para ouvir a música ou usar sua própria faixa.",
    length: "Duração",
    "length.short": "Curta",
    "length.standard": "Padrão",
    "length.long": "Longa",
    sectionHint: "Trecho da música: arraste para escolher",
    sectionLabel: "Trecho da música",
    musicTooShort: "Esta música é curta demais para esta duração",
    dropAt: "Drop em {seconds} s",
    sectionAt: "Trecho em {seconds} s",
    dropStartsAt: "Drop · começa em {seconds} s",
    sectionStartsAt: "Trecho · começa em {seconds} s",
    stopPreview: "Parar a prévia",
    cancelPreview: "Cancelar a prévia",
    previewSection: "Ouvir este trecho",
    noMusicTiming: "Sem música: os cortes usam uma sincronia aproximada (uma batida fixa de 0,5 s).",
    fixedTiming: "Sincronia aproximada: não foi possível encontrar a batida desta música com segurança.",
    faintTiming: "Sincronia aproximada no andamento detectado ({bpm} BPM): o andamento foi encontrado, mas a batida é fraca, então os cortes podem não coincidir.",
    noDrop: "Nenhum drop encontrado: a grade começa depois do título de 2 compassos.",
    advanced: "Avançado",
    clipSound: "Som dos clipes",
    "sound.off": "Desligado",
    "sound.ambient": "Ambiente",
    "sound.full": "Total",
    summerLook: "Look de verão",
    lookStrength: "Intensidade do look",
    soundEffects: "Efeitos sonoros",
    endingMuffle: "Final abafado",
    usePhotos: "Usar fotos",
    usePhotosOff: "“Usar fotos” está desativado",
    onlySfx: "Sem música e com o som dos clipes em “Desligado”: só os efeitos sonoros tocam.",
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
    stoppedAt: "Parou na etapa {step}/{total}, {name}: {detail}",
    build: "Criar",
    building: "Criando",
    anotherVersion: "Testar outros planos",
    finishTitle: "Concluir título e look",
    draftCreated: "Draft criado. Selecione o título ou os rótulos para editar o texto, as cores e as posições (cada gráfico guarda sua própria cópia dos rótulos), um clipe para ajustar o look, o vazamento de luz, o enquadramento ou o som, e a música para mudar o volume. Criar de novo gera um novo Draft e não mantém as edições feitas em “Ajustar”.",
    draftCreatedAdding: "Draft criado; adicionando título e look…",
    openDraft: "Abrir o novo Draft",
    copyLink: "Copiar o link do novo Draft",
    shortened: { one: "Seu material rende {count} plano de montagem, então este vídeo tem cerca de {seconds} s em vez de {fullSeconds} s. Adicione mais clipes para a duração completa.", many: "Seu material rende {count} de planos de montagem, então este vídeo tem cerca de {seconds} s em vez de {fullSeconds} s. Adicione mais clipes para a duração completa.", other: "Seu material rende {count} planos de montagem, então este vídeo tem cerca de {seconds} s em vez de {fullSeconds} s. Adicione mais clipes para a duração completa." },
    approximateVideo: "Este vídeo usa uma sincronia aproximada.",
    note: "Observação: {detail}.",
    unchecked: { one: "Não foi possível pesquisar {count} vídeo, que foi usado sem a busca de cenas. Crie de novo para tentar outra vez.", many: "Não foi possível pesquisar {count} de vídeos, que foram usados sem a busca de cenas. Crie de novo para tentar outra vez.", other: "Não foi possível pesquisar {count} vídeos, que foram usados sem a busca de cenas. Crie de novo para tentar outra vez." },
    "plan.needDistinct": "São necessários pelo menos {count} clipes ou fotos diferentes (foram encontrados {found}).",
    "plan.needOpener": "É necessário um clipe de vídeo com pelo menos {seconds} s para a abertura.",
    "plan.needPlace": "É necessário um segundo clipe com pelo menos {seconds} s (ou uma foto) para o plano do lugar.",
    "plan.needGrid": "São necessários pelo menos {count} clipes ou fotos diferentes com duração suficiente para os painéis da grade (foram encontrados {found}).",
    "plan.tooShort": "Seu material é curto demais para {count} planos de montagem.",
    "plan.reuseMoments": "Alguns planos reutilizam material do mesmo momento de um clipe.",
    "plan.photoRun": "Mais de {count} fotos aparecem em sequência (não há vídeo suficiente).",
    "plan.reusedPhotos": "Algumas fotos são usadas duas vezes.",
    "plan.dropTooEarly": "O drop está perto demais do início da faixa; o título passa por cima dos dois primeiros compassos.",
    "plan.dropNoFit": "O trecho do drop não cabe nesta duração; ele foi movido para o último início que cabe.",
    "plan.sectionMoved": "O trecho não cabia nesta duração; ele foi movido para o último início que cabe.",
    retryUnchecked: { one: "{reason} Não foi possível verificar {count} clipe; pressione “Criar” para tentar de novo.", many: "{reason} Não foi possível verificar {count} de clipes; pressione “Criar” para tentar de novo.", other: "{reason} Não foi possível verificar {count} clipes; pressione “Criar” para tentar de novo." },
    startFailed: "Não foi possível iniciar o plugin Viagem de verão: {detail}. Reinstale o plugin se o problema continuar.",
    foldersNotFound: "as pastas do plugin não foram encontradas",
    adapterNeeded: "Esta versão do Selects precisa de um adaptador {name} atualizado.",
    stepFailed: "O Selects não conseguiu concluir esta etapa.",
    musicApprox: "Música adicionada; a batida não pôde ser detectada com segurança, então os cortes usam uma sincronia aproximada.",
    musicApproxDetail: "Música adicionada; os cortes usam uma sincronia aproximada ({detail}).",
    musicUnreadable: "Não foi possível ler este arquivo de música ({detail}). Escolha outro arquivo ou uma das faixas.",
    beatFailed: "a detecção da batida falhou",
    previewFailed: "Não foi possível reproduzir a prévia: {detail}.",
    previewNotCut: "não foi possível recortar a prévia",
    noAudio: "nenhum áudio foi retornado",
    dropMusic: "Solte um arquivo de música ou escolha uma das faixas.",
    musicTooShortPick: "Esta música é curta demais para esta duração. Escolha uma duração menor ou outra faixa.",
    musicNotAdded: "Não foi possível adicionar a música ao projeto.",
    musicNotRead: "não foi possível ler a música",
    muffleNoCopy: "final abafado ignorado (esta faixa não tem uma cópia abafada)",
    muffleSkipped: "final abafado ignorado ({detail})",
    muffleSkippedPlain: "final abafado ignorado",
    muffleNotImported: "final abafado ignorado (não foi possível importar a cópia abafada)",
    sfxSkipped: "efeitos sonoros ignorados ({detail})",
    sfxNotImported: "efeitos sonoros ignorados (não importados)",
    draftUnconfirmedFinish: "O Draft “{name}” foi salvo, mas o Selects não o confirmou ({detail}). Ele ainda não tem título nem look: pressione “Concluir título e look” para adicioná-los ou crie de novo.",
    draftUnconfirmed: "O Draft “{name}” foi salvo, mas o Selects não o confirmou ({detail}). Ele ainda não tem título nem look; abra-o pela lista de Drafts ou crie de novo.",
    nothingSaved: "{detail} Nada foi salvo; pressione “Criar” para tentar de novo.",
    draftNoId: "O Draft “{name}” foi salvo, mas o Selects não informou o id dele, então o título e o look não puderam ser adicionados. Abra-o pela lista de Drafts ou crie de novo.",
    finishFailed: "O Draft foi criado, mas não pôde ser concluído (título, rótulos e look): {detail}. Pressione “Concluir título e look” para tentar de novo.",
    openFailed: "O Draft está pronto, mas não pôde ser aberto: {detail}. Use o link abaixo ou abra-o pela lista de Drafts.",
    "param.seasonWord": "Palavra da estação",
    "param.creditName": "Nome do crédito (vazio oculta o crédito)",
    "param.place": "Lugar (vazio oculta o título do lugar)",
    "param.line1Color": "Cor da linha 1",
    "param.seasonColor": "Cor da estação",
    "param.labelColor": "Cor dos rótulos",
    "param.placeColor": "Cor do lugar",
    "param.shadow": "Sombra",
    "param.line1Size": "Tamanho da linha 1",
    "param.seasonSize": "Tamanho da estação",
    "param.labelSize": "Tamanho dos rótulos",
    "param.placeSize": "Tamanho do lugar",
    "param.line1Y": "Altura da linha 1 (%)",
    "param.seasonY": "Altura da estação (%)",
    "param.topY": "Altura do rótulo superior (%)",
    "param.creditY": "Altura do crédito (%)",
    "param.placeX": "Posição horizontal do lugar (%)",
    "param.placeY": "Altura do lugar (%)",
    "param.grain": "Granulação de filme",
    "param.leak": "Vazamento de luz",
    "param.motion": "Movimento",
    "param.motionStrength": "Intensidade do movimento",
    "param.videoMotion": "Movimento do vídeo",
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
    openProject: "Yaz Gezisi videosu oluşturmak için bir proje açın.",
    refresh: "Yenile",
    refreshing: "Yenileniyor",
    refreshFailed: "Klip listesi yenilenemedi: {detail}",
    readFailed: "Bu projedeki klipler okunamadı: {detail}",
    checkingClipsNow: "Klipler kontrol ediliyor…",
    checkingClips: "Klipler kontrol ediliyor",
    listening: "Ritim aranıyor",
    preparingTools: "Ritim algılama hazırlanıyor (yalnızca ilk seferde)",
    working: "Çalışıyor",
    noFootage: "Bu projede henüz video klip veya fotoğraf yok. Biraz ekleyin; burası otomatik olarak güncellenir.",
    noClipsSelected: "Klip seçilmedi. “Gelişmiş” bölümünden klip seçin.",
    gap: " ",
    ready: "Hazır: {summary}",
    clips: { one: "{count} klip", other: "{count} klip" },
    clipsSelected: { one: "{count} klipten {selected}", other: "{count} klipten {selected}" },
    photos: { one: "{count} fotoğraf", other: "{count} fotoğraf" },
    photosSelected: { one: "{count} fotoğraftan {selected}", other: "{count} fotoğraftan {selected}" },
    aboutSeconds: "yaklaşık {seconds} sn",
    betterWithAnalysis: "Analiz edilmiş klipler daha iyi çekim seçimi sağlar",
    clipsNotReady: { one: "{count} klip henüz hazır değil", other: "{count} klip henüz hazır değil" },
    clipsNotReadyWait: { one: "{count} klip henüz hazır değil. Bu otomatik olarak güncellenir.", other: "{count} klip henüz hazır değil. Bu otomatik olarak güncellenir." },
    checkingClipsCount: "Klipler kontrol ediliyor {done}/{count}",
    fitDistinct: { one: "{count} farklı klip veya fotoğraf", other: "{count} farklı klip ve fotoğraf" },
    fitShrunk: { one: "{distinct} farklı klip ve fotoğraf. Görüntüleriniz {count} montaj çekimine yetiyor (yaklaşık {seconds} sn)", other: "{distinct} farklı klip ve fotoğraf. Görüntüleriniz {count} montaj çekimine yetiyor (yaklaşık {seconds} sn)" },
    title: "Başlık",
    line1: "1. satır",
    line1Limit: "1. satır en fazla {chars} karakter ve {words} kelime alır.",
    season: "Mevsim",
    seasonLimit: "Mevsim en fazla {chars} karakter alır.",
    wideCounts: "Korece, Japonca ve Çince karakterler 2 sayılır.",
    resetTo: "{season} olarak sıfırla",
    place: "Yer",
    placeOptional: "İsteğe bağlı — gizlemek için boş bırakın",
    placeLimit: "Yer en fazla {chars} karakter alır.",
    placePrefix: "Yer ön eki",
    placePrefixHint: "Yerden önce gösterilir, örneğin “{example}”",
    creditName: "Künye adı",
    creditNameHint: "İsteğe bağlı — “{prefix} <ad>” olarak gösterilir",
    creditPrefix: "Künye ön eki",
    creditPrefixHint: "Künye adından önce gösterilir, örneğin “{example}”",
    topLabel: "Üst etiket",
    topItalic: "Üst etiket (italik kısım)",
    style: "Stil",
    "preset.summer": "Yaz",
    "preset.poster": "Poster",
    "preset.postcard": "Kartpostal",
    titlePreview: "Başlık önizlemesi",
    music: "Müzik",
    track: "Parça",
    ownMusic: "Kendi müziğiniz",
    noMusic: "Müzik yok",
    devPlaceholder: "{title} (geliştirme yer tutucusu)",
    installTools: "Müziği önizlemek veya kendi parçanızı kullanmak için ffmpeg yükleyin.",
    length: "Uzunluk",
    "length.short": "Kısa",
    "length.standard": "Standart",
    "length.long": "Uzun",
    sectionHint: "Müzik bölümü — seçmek için sürükleyin",
    sectionLabel: "Müzik bölümü",
    musicTooShort: "Bu müzik bu uzunluk için çok kısa",
    dropAt: "{seconds} sn'de drop",
    sectionAt: "{seconds} sn'de bölüm",
    dropStartsAt: "Drop · {seconds} sn'de başlar",
    sectionStartsAt: "Bölüm · {seconds} sn'de başlar",
    stopPreview: "Önizlemeyi durdur",
    cancelPreview: "Önizlemeyi iptal et",
    previewSection: "Bu bölümü önizle",
    noMusicTiming: "Müzik yok: kesmeler yaklaşık zamanlama kullanıyor (sabit 0,5 sn'lik ritim).",
    fixedTiming: "Yaklaşık zamanlama: bu müziğin ritmi güvenilir biçimde bulunamadı.",
    faintTiming: "Algılanan tempoya ({bpm} BPM) göre yaklaşık zamanlama: tempo bulundu ama ritim zayıf, bu yüzden kesmeler ritmi kaçırabilir.",
    noDrop: "Drop bulunamadı: ızgara 2 ölçülük başlıktan sonra başlar.",
    advanced: "Gelişmiş",
    clipSound: "Klip sesi",
    "sound.off": "Kapalı",
    "sound.ambient": "Ortam",
    "sound.full": "Tam",
    summerLook: "Yaz görünümü",
    lookStrength: "Görünüm gücü",
    soundEffects: "Ses efektleri",
    endingMuffle: "Boğuk bitiş",
    usePhotos: "Fotoğrafları kullan",
    usePhotosOff: "“Fotoğrafları kullan” kapalı",
    onlySfx: "Müzik yok ve klip sesi “Kapalı”: yalnızca ses efektleri çalar.",
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
    stoppedAt: "{step}/{total}. adımda durdu, {name}: {detail}",
    build: "Oluştur",
    building: "Oluşturuluyor",
    anotherVersion: "Başka çekimler dene",
    finishTitle: "Başlığı ve görünümü tamamla",
    draftCreated: "Draft oluşturuldu. Metinlerini, renklerini ve konumlarını düzenlemek için başlığı veya etiketleri (her grafik etiketlerin kendi kopyasını tutar), görünümünü, ışık sızıntısını, kırpmasını veya sesini ayarlamak için bir klibi, ses düzeyini değiştirmek için müziği seçin. Yeniden oluşturmak yeni bir Draft üretir ve “Ayarla” sekmesinde yapılan düzenlemeleri korumaz.",
    draftCreatedAdding: "Draft oluşturuldu; başlık ve görünüm ekleniyor…",
    openDraft: "Yeni Draft'ı aç",
    copyLink: "Yeni Draft'ın bağlantısını kopyala",
    shortened: { one: "Görüntüleriniz {count} montaj çekimine yetiyor, bu yüzden bu video {fullSeconds} sn yerine yaklaşık {seconds} sn sürüyor. Tam uzunluk için daha fazla klip ekleyin.", other: "Görüntüleriniz {count} montaj çekimine yetiyor, bu yüzden bu video {fullSeconds} sn yerine yaklaşık {seconds} sn sürüyor. Tam uzunluk için daha fazla klip ekleyin." },
    approximateVideo: "Bu video yaklaşık zamanlama kullanıyor.",
    note: "Not: {detail}.",
    unchecked: { one: "{count} videoda arama yapılamadı; sahne araması olmadan kullanıldı. Yeniden denemek için tekrar oluşturun.", other: "{count} videoda arama yapılamadı; sahne araması olmadan kullanıldılar. Yeniden denemek için tekrar oluşturun." },
    "plan.needDistinct": "En az {count} farklı klip veya fotoğraf gerekiyor ({found} bulundu).",
    "plan.needOpener": "Açılış için en az {seconds} sn uzunluğunda bir video klip gerekiyor.",
    "plan.needPlace": "Yer çekimi için en az {seconds} sn uzunluğunda ikinci bir klip (veya bir fotoğraf) gerekiyor.",
    "plan.needGrid": "Izgara panelleri için yeterince uzun en az {count} farklı klip veya fotoğraf gerekiyor ({found} bulundu).",
    "plan.tooShort": "Görüntüleriniz {count} montaj çekimi için çok kısa.",
    "plan.reuseMoments": "Bazı çekimler bir klibin aynı anından görüntüleri yeniden kullanıyor.",
    "plan.photoRun": "{count} fotoğraftan fazlası art arda oynatılıyor (yeterli video yok).",
    "plan.reusedPhotos": "Bazı fotoğraflar iki kez kullanılıyor.",
    "plan.dropTooEarly": "Drop parçanın başına çok yakın; başlık ilk iki ölçünün üzerine taşıyor.",
    "plan.dropNoFit": "Drop bölümü bu uzunluğa sığmıyor; sığan en geç başlangıca taşındı.",
    "plan.sectionMoved": "Bölüm bu uzunluğa sığmadı; sığan en geç başlangıca taşındı.",
    retryUnchecked: { one: "{reason} {count} klip kontrol edilemedi; yeniden denemek için “Oluştur”a basın.", other: "{reason} {count} klip kontrol edilemedi; yeniden denemek için “Oluştur”a basın." },
    startFailed: "Yaz Gezisi başlatılamadı: {detail}. Sorun sürerse eklentiyi yeniden yükleyin.",
    foldersNotFound: "eklenti klasörleri bulunamadı",
    adapterNeeded: "Bu Selects sürümü güncel bir {name} bağdaştırıcısı gerektiriyor.",
    stepFailed: "Selects bu adımı tamamlayamadı.",
    musicApprox: "Müzik eklendi; ritmi güvenilir biçimde bulunamadığı için kesmeler yaklaşık zamanlama kullanıyor.",
    musicApproxDetail: "Müzik eklendi; kesmeler yaklaşık zamanlama kullanıyor ({detail}).",
    musicUnreadable: "Bu müzik dosyası okunamadı ({detail}). Başka bir dosya veya hazır parçalardan birini seçin.",
    beatFailed: "ritim algılama başarısız oldu",
    previewFailed: "Önizleme oynatılamadı: {detail}.",
    previewNotCut: "önizleme kesilemedi",
    noAudio: "ses geri gelmedi",
    dropMusic: "Bir müzik dosyası bırakın veya hazır parçalardan birini seçin.",
    musicTooShortPick: "Bu müzik bu uzunluk için çok kısa. Daha kısa bir uzunluk veya başka bir parça seçin.",
    musicNotAdded: "Müzik projeye eklenemedi.",
    musicNotRead: "müzik okunamadı",
    muffleNoCopy: "boğuk bitiş atlandı (bu parçanın boğuk kopyası yok)",
    muffleSkipped: "boğuk bitiş atlandı ({detail})",
    muffleSkippedPlain: "boğuk bitiş atlandı",
    muffleNotImported: "boğuk bitiş atlandı (boğuk kopya içe aktarılamadı)",
    sfxSkipped: "ses efektleri atlandı ({detail})",
    sfxNotImported: "ses efektleri atlandı (içe aktarılmadı)",
    draftUnconfirmedFinish: "“{name}” adlı Draft kaydedildi ama Selects bunu onaylamadı ({detail}). Henüz başlığı veya görünümü yok: eklemek için “Başlığı ve görünümü tamamla”ya basın ya da yeniden oluşturun.",
    draftUnconfirmed: "“{name}” adlı Draft kaydedildi ama Selects bunu onaylamadı ({detail}). Henüz başlığı veya görünümü yok; Draft listesinden açın veya yeniden oluşturun.",
    nothingSaved: "{detail} Hiçbir şey kaydedilmedi; yeniden denemek için “Oluştur”a basın.",
    draftNoId: "“{name}” adlı Draft kaydedildi ama Selects kimliğini bildirmedi, bu yüzden başlık ve görünüm eklenemedi. Draft listesinden açın veya yeniden oluşturun.",
    finishFailed: "Draft oluşturuldu ama tamamlanamadı (başlık, etiketler ve görünüm): {detail}. Yeniden denemek için “Başlığı ve görünümü tamamla”ya basın.",
    openFailed: "Draft hazır ama açılamadı: {detail}. Aşağıdaki bağlantıyı kullanın veya Draft listesinden açın.",
    "param.seasonWord": "Mevsim kelimesi",
    "param.creditName": "Künye adı (boşsa künye gizlenir)",
    "param.place": "Yer (boşsa yer başlığı gizlenir)",
    "param.line1Color": "1. satır rengi",
    "param.seasonColor": "Mevsim rengi",
    "param.labelColor": "Etiket rengi",
    "param.placeColor": "Yer rengi",
    "param.shadow": "Gölge",
    "param.line1Size": "1. satır boyutu",
    "param.seasonSize": "Mevsim boyutu",
    "param.labelSize": "Etiket boyutu",
    "param.placeSize": "Yer boyutu",
    "param.line1Y": "1. satır yüksekliği (%)",
    "param.seasonY": "Mevsim yüksekliği (%)",
    "param.topY": "Üst etiket yüksekliği (%)",
    "param.creditY": "Künye yüksekliği (%)",
    "param.placeX": "Yer yatay konumu (%)",
    "param.placeY": "Yer yüksekliği (%)",
    "param.grain": "Film greni",
    "param.leak": "Işık sızıntısı",
    "param.motion": "Hareket",
    "param.motionStrength": "Hareket gücü",
    "param.videoMotion": "Video hareketi",
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
    openProject: "请先打开一个项目，再制作夏日旅行视频。",
    refresh: "刷新",
    refreshing: "正在刷新",
    refreshFailed: "无法刷新片段列表：{detail}",
    readFailed: "无法读取此项目中的片段：{detail}",
    checkingClipsNow: "正在检查片段…",
    checkingClips: "正在检查片段",
    listening: "正在识别节拍",
    preparingTools: "正在准备节拍检测(仅首次)",
    working: "处理中",
    noFootage: "此项目中还没有视频片段或照片。请添加一些；这里会自动更新。",
    noClipsSelected: "未选择片段。请在“高级”中选择片段。",
    gap: "",
    ready: "已就绪：{summary}",
    clips: { other: "{count} 个片段" },
    clipsSelected: { other: "已选 {selected}/{count} 个片段" },
    photos: { other: "{count} 张照片" },
    photosSelected: { other: "已选 {selected}/{count} 张照片" },
    aboutSeconds: "约 {seconds} 秒",
    betterWithAnalysis: "已分析的片段能选出更好的镜头",
    clipsNotReady: { other: "{count} 个片段尚未就绪" },
    clipsNotReadyWait: { other: "有 {count} 个片段尚未就绪。这里会自动更新。" },
    checkingClipsCount: "正在检查片段 {done}/{count}",
    fitDistinct: { other: "{count} 个不同的片段和照片" },
    fitShrunk: { other: "{distinct} 个不同的片段和照片。素材可支持 {count} 个蒙太奇镜头（约 {seconds} 秒）" },
    title: "标题",
    line1: "第一行",
    line1Limit: "第一行最多 {chars} 个字符、{words} 个词。",
    season: "季节",
    seasonLimit: "季节词最多 {chars} 个字符。",
    wideCounts: "中文、日文和韩文字符按 2 个字符计算。",
    resetTo: "重置为 {season}",
    place: "地点",
    placeOptional: "可选 — 留空则隐藏",
    placeLimit: "地点最多 {chars} 个字符。",
    placePrefix: "地点前缀",
    placePrefixHint: "显示在地点前，例如“{example}”",
    creditName: "署名",
    creditNameHint: "可选 — 显示为“{prefix} <名字>”",
    creditPrefix: "署名前缀",
    creditPrefixHint: "显示在署名前，例如“{example}”",
    topLabel: "顶部标签",
    topItalic: "顶部标签（斜体部分）",
    style: "风格",
    "preset.summer": "夏日",
    "preset.poster": "海报",
    "preset.postcard": "明信片",
    titlePreview: "标题预览",
    music: "音乐",
    track: "曲目",
    ownMusic: "自己的音乐",
    noMusic: "无音乐",
    devPlaceholder: "{title}（开发占位曲目）",
    installTools: "请安装 ffmpeg，才能试听音乐或使用自己的曲目。",
    length: "时长",
    "length.short": "短",
    "length.standard": "标准",
    "length.long": "长",
    sectionHint: "音乐片段 — 拖动选择",
    sectionLabel: "音乐片段",
    musicTooShort: "这段音乐太短，不够这个时长",
    dropAt: "高潮在 {seconds} 秒",
    sectionAt: "片段在 {seconds} 秒",
    dropStartsAt: "高潮 · 从 {seconds} 秒开始",
    sectionStartsAt: "片段 · 从 {seconds} 秒开始",
    stopPreview: "停止试听",
    cancelPreview: "取消试听",
    previewSection: "试听这一段",
    noMusicTiming: "无音乐：剪切点按大致时间排布（固定 0.5 秒一拍）。",
    fixedTiming: "大致对齐：无法可靠识别这段音乐的节拍。",
    faintTiming: "按识别到的速度（{bpm} BPM）大致对齐：已找到速度，但节拍较弱，剪切点可能对不上。",
    noDrop: "未找到高潮：四宫格在 2 小节的标题之后开始。",
    advanced: "高级",
    clipSound: "片段原声",
    "sound.off": "关闭",
    "sound.ambient": "环境音",
    "sound.full": "原音量",
    summerLook: "夏日色调",
    lookStrength: "色调强度",
    soundEffects: "音效",
    endingMuffle: "结尾闷音",
    usePhotos: "使用照片",
    usePhotosOff: "“使用照片”已关闭",
    onlySfx: "没有音乐，且片段原声为“关闭”：只播放音效。",
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
    stoppedAt: "在第 {step}/{total} 步（{name}）停止：{detail}",
    build: "生成",
    building: "正在生成",
    anotherVersion: "换一组镜头",
    finishTitle: "完成标题和色调",
    draftCreated: "Draft 已创建。选中标题或标签可编辑文字、颜色和位置（每个图形各自保存一份标签），选中片段可调整色调、漏光、裁剪或声音，选中音乐可更改音量。重新生成会创建新的 Draft，且不会保留在“调整”中所做的修改。",
    draftCreatedAdding: "Draft 已创建；正在添加标题和色调…",
    openDraft: "打开新的 Draft",
    copyLink: "复制新 Draft 的链接",
    shortened: { other: "你的素材可支持 {count} 个蒙太奇镜头，因此这个视频约 {seconds} 秒，而不是 {fullSeconds} 秒。添加更多片段即可达到完整时长。" },
    approximateVideo: "此视频的剪切点为大致对齐。",
    note: "提示：{detail}。",
    unchecked: { other: "有 {count} 个视频无法进行场景搜索，已在未搜索场景的情况下使用。再次生成可重试。" },
    "plan.needDistinct": "至少需要 {count} 个不同的片段或照片（找到 {found} 个）。",
    "plan.needOpener": "开场需要一个至少 {seconds} 秒长的视频片段。",
    "plan.needPlace": "地点镜头需要第二个至少 {seconds} 秒长的片段（或一张照片）。",
    "plan.needGrid": "四宫格至少需要 {count} 个足够长的不同片段或照片（找到 {found} 个）。",
    "plan.tooShort": "你的素材太短，不够 {count} 个蒙太奇镜头。",
    "plan.reuseMoments": "部分镜头重复使用了片段中同一时刻的画面。",
    "plan.photoRun": "超过 {count} 张照片连续播放（视频不足）。",
    "plan.reusedPhotos": "部分照片被使用了两次。",
    "plan.dropTooEarly": "高潮离曲目开头太近；标题会延续到前两个小节。",
    "plan.dropNoFit": "高潮片段放不进这个时长；已移到能放下的最晚起点。",
    "plan.sectionMoved": "该片段放不进这个时长；已移到能放下的最晚起点。",
    retryUnchecked: { other: "{reason}有 {count} 个片段无法检查；点击“生成”重试。" },
    startFailed: "夏日旅行无法启动：{detail}。如果问题持续，请重新安装插件。",
    foldersNotFound: "找不到插件文件夹",
    adapterNeeded: "此版本的 Selects 需要更新的 {name} 适配器。",
    stepFailed: "Selects 无法完成这一步。",
    musicApprox: "音乐已添加；由于无法可靠识别其节拍，剪切点将大致对齐。",
    musicApproxDetail: "音乐已添加；剪切点将大致对齐（{detail}）。",
    musicUnreadable: "无法读取这个音乐文件（{detail}）。请选择其他文件或内置曲目。",
    beatFailed: "节拍识别失败",
    previewFailed: "无法播放试听：{detail}。",
    previewNotCut: "无法截取试听片段",
    noAudio: "没有返回音频",
    dropMusic: "请拖入一个音乐文件，或选择内置曲目。",
    musicTooShortPick: "这段音乐太短，不够这个时长。请选择更短的时长或其他曲目。",
    musicNotAdded: "无法将音乐添加到项目中。",
    musicNotRead: "无法读取音乐",
    muffleNoCopy: "已跳过结尾闷音（此曲目没有闷音版本）",
    muffleSkipped: "已跳过结尾闷音（{detail}）",
    muffleSkippedPlain: "已跳过结尾闷音",
    muffleNotImported: "已跳过结尾闷音（无法导入闷音版本）",
    sfxSkipped: "已跳过音效（{detail}）",
    sfxNotImported: "已跳过音效（未能导入）",
    draftUnconfirmedFinish: "Draft“{name}”已保存，但 Selects 未确认（{detail}）。它还没有标题和色调：点击“完成标题和色调”添加，或重新生成。",
    draftUnconfirmed: "Draft“{name}”已保存，但 Selects 未确认（{detail}）。它还没有标题和色调；请从 Draft 列表中打开它，或重新生成。",
    nothingSaved: "{detail}未保存任何内容；点击“生成”重试。",
    draftNoId: "Draft“{name}”已保存，但 Selects 没有返回它的 ID，因此无法添加标题和色调。请从 Draft 列表中打开它，或重新生成。",
    finishFailed: "Draft 已创建，但未能完成（标题、标签和色调）：{detail}。点击“完成标题和色调”重试。",
    openFailed: "Draft 已就绪，但无法打开：{detail}。请使用下方链接，或从 Draft 列表中打开。",
    "param.seasonWord": "季节词",
    "param.creditName": "署名（留空则隐藏署名）",
    "param.place": "地点（留空则隐藏地点标题）",
    "param.line1Color": "第一行颜色",
    "param.seasonColor": "季节词颜色",
    "param.labelColor": "标签颜色",
    "param.placeColor": "地点颜色",
    "param.shadow": "阴影",
    "param.line1Size": "第一行大小",
    "param.seasonSize": "季节词大小",
    "param.labelSize": "标签大小",
    "param.placeSize": "地点大小",
    "param.line1Y": "第一行高度（%）",
    "param.seasonY": "季节词高度（%）",
    "param.topY": "顶部标签高度（%）",
    "param.creditY": "署名高度（%）",
    "param.placeX": "地点水平位置（%）",
    "param.placeY": "地点高度（%）",
    "param.grain": "胶片颗粒",
    "param.leak": "漏光",
    "param.motion": "运动",
    "param.motionStrength": "运动强度",
    "param.videoMotion": "视频运动",
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

// Errors whose text follows the UI language: `say(lang)` renders it; the message stays English.
function uiError(say: (lang: Lang) => string) { const e: any = new Error(say("en")); e.say = say; return e; }
function sayError(lang: Lang, e: any): string { return e && typeof e.say === "function" ? e.say(lang) : String(e?.message || e); }
// Planner text (disabledReason, notes, section notes) in the UI language. The planner writes English (it is shared with
// the headless driver and its output is regression-checked), so the sentences it can write map to "plan.<id>" keys
// (stPlanText, st-panel block); anything else shows as written.
function sayPlan(lang: Lang, text: string): string {
  const m = stPlanText(text);
  return m ? t(lang, "plan." + m.id, m.vars) : String(text || "");
}
// Own music whose tempo was found but whose beat is faint (beat-detect.cjs grid 'approximate').
function faintText(lang: Lang, music: any): string {
  return t(lang, "faintTiming", { bpm: Math.round(music.bpm) }) + (music.noDrop ? t(lang, "gap") + t(lang, "noDrop") : "");
}
// Adjust labels for stDecorateConfig in the UI language at Build (they do not follow a later language switch).
function inspectorLabels(lang: Lang) {
  return {
    graphic: {
      line1: t(lang, "line1"), season: t(lang, "param.seasonWord"), topMain: t(lang, "topLabel"), topItalic: t(lang, "topItalic"),
      creditPrefix: t(lang, "creditPrefix"), creditName: t(lang, "param.creditName"), placePrefix: t(lang, "placePrefix"), place: t(lang, "param.place"),
      line1Color: t(lang, "param.line1Color"), seasonColor: t(lang, "param.seasonColor"), labelColor: t(lang, "param.labelColor"), placeColor: t(lang, "param.placeColor"),
      shadow: t(lang, "param.shadow"), line1Size: t(lang, "param.line1Size"), seasonSize: t(lang, "param.seasonSize"), labelSize: t(lang, "param.labelSize"),
      placeSize: t(lang, "param.placeSize"), line1Y: t(lang, "param.line1Y"), seasonY: t(lang, "param.seasonY"), topY: t(lang, "param.topY"),
      creditY: t(lang, "param.creditY"), placeX: t(lang, "param.placeX"), placeY: t(lang, "param.placeY"),
    },
    effect: { look: t(lang, "summerLook"), grain: t(lang, "param.grain"), leak: t(lang, "param.leak"), motion: t(lang, "param.motion"),
      motionStrength: t(lang, "param.motionStrength"), videoMotion: t(lang, "param.videoMotion") },
    motion: Object.fromEntries(ST_MOTION_OPTIONS.map((o) => [o.value, tOr(lang, "motion." + o.value, o.label)])),
  };
}
// Hangul in the title preview: no case change, tracking or squeeze, and the Korean system face of the role last in the
// stack (as assets/title-graphic.tsx does).
const HANGUL_RE = /[\u1100-\u11ff\u3130-\u318f\ua960-\ua97f\uac00-\ud7a3\ud7b0-\ud7ff]/;
const WIDE_PREVIEW_RE = /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]/;

const PLUGIN_ID = "summer-trip";
const SKILLS_DIR = "$SELECTS_USER_SKILLS_ROOT/" + PLUGIN_ID;
const DATA_DIR = "$HOME/.selects/plugin-data/" + PLUGIN_ID;

// st-planner:start
// Summer Trip planner. A plain script: panel.tsx embeds it verbatim and the tests load it in node:vm.
// Structure (beats from the section start, spec section 2.1 / 15): an 8-beat title over one opener shot, a 2x2 grid
// build on 8th notes from the drop (beat 8), the place shot revealed under the grid and held to beat 14, a montage of
// N shots (2 beats each, one pair of 3-beat holds), and an 8-beat film-frame ending of three shots (leak pulses at
// +2 and +5.5, a warm end flare at +7).
// Every frame comes from one expression, F(b) = round((b * 60 / bpm + delta) * fps) with F(0) = 0 (stFrameSchedule).

const ST_W = 1920;
const ST_H = 1080;
const ST_TITLE_BEATS = 8;
const ST_DROP_BEAT = 8;
const ST_TITLE_FIRST_WORD = 0.5; // the first title word (the picture starts clean)
const ST_TITLE_SEASON_BEAT = 5;  // the first part of the season word; complete one beat later, with the labels
const ST_GRID_STATES = [8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5];
// Grid overlay clips A-D: one quadrant each, in contract order.
const ST_GRID = [
  { quad: 'TL', a: 8, b: 10 },
  { quad: 'TR', a: 8.5, b: 10.5 },
  { quad: 'BR', a: 9, b: 11 },
  { quad: 'BL', a: 9.5, b: 11.5 },
];
const ST_OPENER_END = 9.5;      // the opener stays on Main under the first quadrants; the place shot starts here
const ST_PLACE_TITLE = 12;
const ST_MONTAGE_START = 14;
const ST_ENDING_BEATS = 8;
const ST_ENDING_SHOTS = [0, 2, 4]; // ending shot starts relative to the ending start
const ST_LEAK_HALF = 0.25;       // light leak spans the ending cut +/- this many beats
const ST_PULSES = [2, 5.5, 7];   // leak pulses relative to the ending start; the last is the warm end flare
const ST_FADE_BEATS = 0.5;       // picture and music fade over the last half beat
const ST_LENGTHS = { short: 6, standard: 8, long: 12 };
const ST_MIN_MONTAGE = 4;
const ST_MAX_MONTAGE = 12;
const ST_MIN_DISTINCT = 6;       // opener, place and grid A-D are six different resources
const ST_FIXED_BPM = 120;        // no grid: a fixed 0.5 s beat
const ST_OCTAVE_TARGET = 120;
const ST_OCTAVE_MIN = 70;
const ST_SECTION_END_MARGIN = 0.5; // start + total + this <= cue duration
const ST_SEASONS = ['WINTER', 'WINTER', 'SPRING', 'SPRING', 'SPRING', 'SUMMER', 'SUMMER', 'SUMMER', 'AUTUMN', 'AUTUMN', 'AUTUMN', 'WINTER'];
const ST_DEFAULT_SEASON = 'SUMMER';

// Footage.
const ST_MONTAGE_ROLES = ['beach', 'town', 'water', 'street', 'food', 'landmark', 'people', 'detail'];
const ST_QUERIES = {
  opener: 'a wide view of the sea, coast or beach on a sunny day',
  grid: 'a colourful summer travel scene: beach, boats, streets or cafes',
  place: 'a wide view of a coastal town, harbour or landmark',
  beach: 'people on a sunny beach with umbrellas',
  town: 'colourful houses in a coastal town',
  water: 'boats or water in a harbour or the sea',
  street: 'a narrow sunny street or alley',
  food: 'an ice cream, drink or food on a summer day',
  landmark: 'a church, landmark or viewpoint',
  people: 'people walking or relaxing on holiday',
  detail: 'a summer detail close up',
  ending: 'golden sunset light over the sea or a town',
};
// Signal queries (search.js runs them next to the roles; their hits are never shots). 'avoid' finds extreme moments
// (night, city lights, an intense sunset) that break a daylight montage; 'motion' finds human-scale movement.
const ST_SIGNAL_QUERIES = {
  avoid: 'a dark night scene, city lights at night, or an intense orange sunset',
  motion: 'people walking, a street with movement, or travelling along a road or coast',
};
// A signal hit counts for candidates within this many seconds of it on the same clip (a shot is centred on its
// candidate, so this stands for a two-beat window plus a little).
const ST_SIGNAL_REACH = 1;
// An avoid hit is strong when it scores at least ST_AVOID_MIN and more than every day-role hit (every role but
// 'ending') within reach on that clip; a clip whose best avoid hit beats its best day-role hit is avoided throughout.
// Live scores sit within about 0.1-0.56 and a sunset query also scores well on sunny beaches, so strength is judged
// against the clip's own day hits, not by a fixed threshold alone.
const ST_AVOID_MIN = 0.25;
// Opener, place, grid and montage slots rank an avoided candidate as if its clip had been used once more, and after
// every non-avoided candidate of the same use count whatever its role (fresh day moments first, so night and sunset
// clips wait for the ending, where warm sunset light is wanted), and take this off its value. It stays usable when
// nothing else fits, so every guarantee holds.
const ST_AVOID_PENALTY = 0.1;
// Motion: a tie-break bonus of up to ST_MOTION_BONUS (score scale ~0.1-0.56, seeded spread 0.05) for candidates near
// a motion hit, scaled by that hit's score over the run's best motion hit.
const ST_MOTION_BONUS = 0.03;
// Which candidate roles may fill a slot role, best first (the role's neighbours).
const ST_ROLE_FALLBACK = {
  opener: ['opener', 'place', 'beach', 'water', 'ending'],
  place: ['place', 'town', 'landmark', 'opener', 'water'],
  grid: ['grid', 'beach', 'town', 'street', 'food', 'water', 'people', 'detail', 'landmark'],
  beach: ['beach', 'opener', 'water', 'people'],
  town: ['town', 'place', 'street', 'landmark'],
  water: ['water', 'beach', 'opener', 'place'],
  street: ['street', 'town', 'people', 'detail'],
  food: ['food', 'detail', 'people'],
  landmark: ['landmark', 'place', 'town'],
  people: ['people', 'beach', 'street'],
  detail: ['detail', 'food', 'street'],
  ending: ['ending', 'opener', 'water', 'beach', 'place'],
};
// Scene-search hits collapse onto a few distinct times per clip, so every searched source also gets evenly spaced
// 'filler' candidates (at most ST_FILLER_MAX per source, so long sources stay cheap). They rank below real hits of a
// source with the same use count.
const ST_FILLER_STEP = 0.5;
const ST_FILLER_EDGE = 0.25;
const ST_FILLER_SCORE = -2;
const ST_FILLER_MAX = 48;
// Seeded spread for the opener, place and grid picks: live scene-search scores of the good hits for a role sit within
// about 0.1 of each other (0.2-0.56 overall), so another version can swap between them without taking weak hits.
const ST_FIXED_JITTER = 0.12;
const ST_FIXED_ROLE_PENALTY = 0.04;
// A video window ends at least this far before the end of its source.
const ST_SOURCE_TAIL = 0.15;
// Windows taken from one source keep at least this gap (unless the last-resort overlap pass needs them).
const ST_WINDOW_GAP = 0.5;
// Photos have no scene search and hold at most 5 s (from 0). About ST_PHOTO_SHARE of the montage + ending slots are
// photo slots; at most ST_PHOTO_RUN_MAX photos play in a row on Main while anything else fits.
const ST_PHOTO_HOLD_MAX = 5;
const ST_PHOTO_RUN_MAX = 2;
const ST_PHOTO_SHARE = 1 / 3;
// Clips without Selects analysis have no scene search: a quick local score (the panel's quick-score block, the host's
// ffmpeg on a small grey decode) or, without it, evenly spaced windows stand in for search hits (stLocalCandidates).
// Their windows never start in the first ST_LOCAL_MIN_START s (a candidate's minStart; black frames and fades sit there).
const ST_LOCAL_MIN_START = 0.5;
// Normalisation onto the scene-search scale: a quick-score quality q in [0, 1] scores ST_LOCAL_SCORE_MIN +
// q * (ST_LOCAL_SCORE_MAX - ST_LOCAL_SCORE_MIN), i.e. 0.10-0.30. Live scene-search hits sit within about 0.2-0.56 and a
// clip's good hits for a role around 0.35-0.56, so the best local window ties a middling semantic hit and never a strong
// one, even with the fixed slots' seeded spread (ST_FIXED_JITTER); local candidates stay far above fillers (-2), so
// fresh-first still prefers an unused unanalysed clip over a used analysed one. Windows without any score (no ffmpeg,
// the budget ran out, a failed decode) score ST_LOCAL_FALLBACK_SCORE, below every scored local window.
const ST_LOCAL_SCORE_MIN = 0.1;
const ST_LOCAL_SCORE_MAX = 0.3;
const ST_LOCAL_FALLBACK_SCORE = 0.05;
// Candidate roles for local windows and the seconds each needs (the slot lengths at 120 BPM: opener 9.5 beats, place
// 4.5, a grid panel 2, a montage shot 2-3, an ending shot 2-4). 'montage' is in no ST_ROLE_FALLBACK list, so in a
// montage slot a local window ranks after every role-matching scene-search hit of the same use count and before
// fillers. ST_LOCAL_PICK_ROLE maps each to the quick-score picker's role: opener, place, grid panels and the ending want
// steady, well-exposed windows ('steady'); the montage wants movement ('montage').
const ST_LOCAL_ROLES = { opener: 4.75, place: 2.25, grid: 1, montage: 1.5, ending: 2 };
const ST_LOCAL_PICK_ROLE = { opener: 'steady', place: 'steady', grid: 'steady', montage: 'montage', ending: 'steady' };
const ST_LOCAL_PER_ROLE = 4;
const ST_LOCAL_APART = 1;
const ST_LOCAL_FALLBACK_COUNT = 6;

// ---------------------------------------------------------------------------------------------------------------
// Beat schedule

// Montage shot lengths in beats: 2 each, except 1-based shots ceil(N/2)+1 and ceil(N/2)+2, which hold 3 beats.
function stMontageBeats(n) {
  if (!(Number.isInteger(n) && n >= 2)) throw Error('stMontageBeats needs an integer N >= 2');
  const h = Math.ceil(n / 2) + 1;
  const out = [];
  for (let i = 1; i <= n; i++) out.push(i === h || i === h + 1 ? 3 : 2);
  return out;
}

function stTotalBeats(n) { return ST_MONTAGE_START + 2 * n + 2 + ST_ENDING_BEATS; }
function stTotalSeconds(bpm, n) { return stTotalBeats(n) * 60 / bpm; }

// The whole event schedule in beats (internal contract "Beat schedule").
function stSchedule(opts) {
  const n = opts && opts.montageShots;
  const montageBeats = stMontageBeats(n);
  const M = montageBeats.reduce((a, b) => a + b, 0);
  const E = ST_MONTAGE_START + M;
  const mainBeats = [0, ST_OPENER_END, ST_MONTAGE_START];
  let at = ST_MONTAGE_START;
  for (let i = 0; i < n - 1; i++) { at += montageBeats[i]; mainBeats.push(at); }
  for (const k of ST_ENDING_SHOTS) mainBeats.push(E + k);
  mainBeats.push(E + ST_ENDING_BEATS);
  return {
    montageShots: n,
    montageBeats,
    mainBeats,
    grid: ST_GRID.map(g => ({ quad: g.quad, a: g.a, b: g.b })),
    gridStates: ST_GRID_STATES.slice(),
    title: [0, ST_TITLE_BEATS],
    labels: [[ST_TITLE_SEASON_BEAT + 1, ST_TITLE_BEATS], [ST_PLACE_TITLE, E]],
    place: [ST_PLACE_TITLE, ST_MONTAGE_START],
    endingStart: E,
    end: E + ST_ENDING_BEATS,
    fadeStart: E + ST_ENDING_BEATS - ST_FADE_BEATS,
    leak: { a: E - ST_LEAK_HALF, b: E + ST_LEAK_HALF },
    pulses: ST_PULSES.map(p => E + p),
    anchors: [ST_DROP_BEAT, ST_MONTAGE_START, E],
  };
}

// Where the music's beats land on the timeline. Selects snaps the music's source start (sectionStart) to a timeline
// frame, so the music plays offset by delta = sectionStart - round(sectionStart * fps) / fps (at most half a frame).
function stMusicOffset(sectionStart, fps) {
  return typeof sectionStart === 'number' && isFinite(sectionStart) && fps > 0 ? sectionStart - Math.round(sectionStart * fps) / fps : 0;
}

// The one frame schedule (spec 15.3). snaps: { [anchorBeat]: seconds from the section start } (own music only). A
// snapped anchor moves every event defined at that beat; the light leak is defined around the ending cut, so it
// moves with a snapped ending start. Durations are always differences of F, never multiplied frame counts.
function stFrameSchedule(opts) {
  const s = opts.schedule, bpm = opts.bpm, fps = opts.fps;
  const delta = typeof opts.delta === 'number' && isFinite(opts.delta) ? opts.delta : 0;
  if (!s || !(bpm > 0) || !(fps > 0)) throw Error('stFrameSchedule needs schedule, bpm and fps');
  const snaps = {};
  for (const key of Object.keys(opts.snaps || {})) {
    const v = opts.snaps[key];
    if (v == null) continue;
    const b = Number(key);
    if (s.anchors.indexOf(b) < 0) throw Error('stFrameSchedule: beat ' + key + ' is not an anchor and may not snap');
    if (typeof v !== 'number' || !isFinite(v)) throw Error('stFrameSchedule: snap for beat ' + key + ' is not a number');
    snaps[b] = v;
  }
  const gridSec = b => b * 60 / bpm;
  const secOf = b => (Object.prototype.hasOwnProperty.call(snaps, b) ? snaps[b] : gridSec(b));
  const frameOfSec = x => Math.round((x + delta) * fps);
  const F = b => (b === 0 ? 0 : frameOfSec(secOf(b)));
  const E = s.endingStart;
  const cuts = {};
  s.mainBeats.concat(s.gridStates).forEach(b => { cuts[b] = true; });
  const report = Object.keys(cuts).map(Number).sort((a, b) => a - b).map(b => {
    const frame = F(b), planned = b === 0 ? 0 : secOf(b);
    return {
      beat: b,
      gridSeconds: gridSec(b) + delta,
      plannedSeconds: planned + delta,
      frame,
      quantErrorSeconds: frame / fps - (planned + delta),
      snapped: Object.prototype.hasOwnProperty.call(snaps, b),
    };
  });
  return {
    fps,
    bpm,
    delta,
    snaps,
    mainFrames: s.mainBeats.map(F),
    grid: s.grid.map(g => ({ quad: g.quad, a: g.a, b: g.b, aFrame: F(g.a), bFrame: F(g.b) })),
    gridStateFrames: s.gridStates.map(F),
    titleFrames: s.title.map(F),
    labelsFrames: s.labels.map(span => span.map(F)),
    placeFrames: s.place.map(F),
    endingFrame: F(E),
    endFrame: F(s.end),
    fadeStartFrame: F(s.fadeStart),
    // The leak is defined around the ending cut: a snapped ending start carries it along.
    leakFrames: [s.leak.a, s.leak.b].map(b => (Object.prototype.hasOwnProperty.call(snaps, E) ? frameOfSec(snaps[E] + (b - E) * 60 / bpm) : F(b))),
    pulseFrames: s.pulses.map(F),
    report,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Title

function stChars(text) { return Array.from(String(text == null ? '' : text)); }

// Title typing schedule (spec 4.2 / 15.8), in beats from the section start. The title starts on a clean picture (the
// reference's first word lands half a beat in): line 1 up to 4 words, one word per beat on the off-beats (0.5, 1.5,
// 2.5, 3.5); 5 or more: one per 8th note from 0.5 (words past the 7th share the last slot at 3.5). Season: the first
// ceil(len/2) letters at 5 when it has at least 4 letters (else the whole word at 5), complete at 6. Labels at 6
// (reference at 120 BPM: that 0.46, one 1.6, trip 2.74, in 3.86, SUM 5.06, SUMMER 6.14 beats). The drop stays at 8.
// titleHits (a bundled cue's measured beats: 4 word hits + 2 season hits, sorted, finite, in [0, 8)) replace the
// word and season times when line 1 has at most 4 words.
function stTitleSchedule(line1, season, titleHits) {
  const words = String(line1 == null ? '' : line1).trim().split(/\s+/).filter(Boolean);
  const len = stChars(String(season == null ? '' : season).trim()).length;
  const hitsOk = Array.isArray(titleHits) && titleHits.length === 6 &&
    titleHits.every((h, i) => typeof h === 'number' && isFinite(h) && h >= 0 && h < ST_TITLE_BEATS && (i === 0 || h > titleHits[i - 1]));
  const useHits = hitsOk && words.length <= 4;
  let wordBeats;
  if (useHits) wordBeats = words.map((_, i) => titleHits[i]);
  else if (words.length <= 4) wordBeats = words.map((_, i) => ST_TITLE_FIRST_WORD + i);
  else wordBeats = words.map((_, i) => ST_TITLE_FIRST_WORD + Math.min(i, 6) * 0.5);
  return {
    words,
    wordBeats,
    seasonPartBeat: useHits ? titleHits[4] : ST_TITLE_SEASON_BEAT,
    seasonPartLength: len >= 4 ? Math.ceil(len / 2) : len,
    seasonFullBeat: useHits ? titleHits[5] : ST_TITLE_SEASON_BEAT + 1,
    // Labels never come before the full season word (a cue's second season hit can fall after beat 5).
    labelsBeat: useHits ? Math.max(5, titleHits[5]) : ST_TITLE_SEASON_BEAT + 1,
    source: useHits ? 'hits' : words.length <= 4 ? 'beats' : 'eighths',
  };
}

// Title times in seconds from the title graphic's start (frame 0), frame-aligned with the same F as every cut.
function stTitleTimes(title, bpm, delta, fps) {
  const d = typeof delta === 'number' && isFinite(delta) ? delta : 0;
  const t = b => (b === 0 ? 0 : Math.round((b * 60 / bpm + d) * fps)) / fps;
  return {
    wordTimes: title.wordBeats.map(t),
    seasonPartTime: t(title.seasonPartBeat),
    seasonPartLength: title.seasonPartLength,
    seasonFullTime: t(title.seasonFullBeat),
    labelsTime: t(title.labelsBeat),
  };
}

// Season word from capture months (numbers 1-12, or ISO-like date strings "YYYY-MM..."). The most common month
// decides; a tie between months, or no known month, gives SUMMER.
function stSeasonFor(months) {
  const counts = Array(12).fill(0);
  for (const m of Array.isArray(months) ? months : []) {
    let k = null;
    if (typeof m === 'number' && Number.isInteger(m) && m >= 1 && m <= 12) k = m;
    else if (typeof m === 'string') {
      const r = /^\s*\d{4}-(\d{2})/.exec(m);
      if (r && Number(r[1]) >= 1 && Number(r[1]) <= 12) k = Number(r[1]);
    }
    if (k !== null) counts[k - 1]++;
  }
  const top = Math.max.apply(null, counts);
  if (!(top > 0)) return ST_DEFAULT_SEASON;
  const best = [];
  counts.forEach((c, i) => { if (c === top) best.push(i); });
  return best.length === 1 ? ST_SEASONS[best[0]] : ST_DEFAULT_SEASON;
}

// ---------------------------------------------------------------------------------------------------------------
// Music: tempo octave and sections

// The tempo used for cutting: bpm/2, bpm or 2*bpm, whichever is closest to 120 in log scale (ties keep bpm). Below 70
// after that, or no tempo: null (fixed timing).
function stOctave(bpm) {
  if (typeof bpm !== 'number' || !isFinite(bpm) || !(bpm > 0)) return null;
  let best = bpm;
  for (const c of [bpm / 2, bpm * 2]) {
    if (Math.abs(Math.log(c / ST_OCTAVE_TARGET)) < Math.abs(Math.log(best / ST_OCTAVE_TARGET)) - 1e-12) best = c;
  }
  return best < ST_OCTAVE_MIN ? null : best;
}

// The drop section's start in seconds for a cue, or null. cue: { bpm, firstBeat (s), dropSeconds? | dropBeat? (beats
// from firstBeat) }. The drop section starts 8 beats before the drop.
function stDropStart(cue) {
  if (!cue || !(cue.bpm > 0)) return null;
  const beat = 60 / cue.bpm, first = typeof cue.firstBeat === 'number' && isFinite(cue.firstBeat) ? cue.firstBeat : 0;
  if (typeof cue.dropSeconds === 'number' && isFinite(cue.dropSeconds)) return cue.dropSeconds - ST_DROP_BEAT * beat;
  if (typeof cue.dropBeat === 'number' && isFinite(cue.dropBeat)) return first + (cue.dropBeat - ST_DROP_BEAT) * beat;
  return null;
}

// Usable length of a cue: its duration, but never past the last onset + 0.5 s (usableEnd) when that is known, so a
// section never ends in the silent tail of a file.
function stCueDuration(cue) {
  const hasDur = typeof cue.duration === 'number' && isFinite(cue.duration);
  const hasEnd = typeof cue.usableEnd === 'number' && isFinite(cue.usableEnd);
  if (hasDur && hasEnd) return Math.min(cue.duration, cue.usableEnd + ST_SECTION_END_MARGIN);
  if (hasDur) return cue.duration;
  if (hasEnd) return cue.usableEnd + ST_SECTION_END_MARGIN;
  return 0;
}

// Latest start that fits N montage shots: start + total + 0.5 s <= duration.
function stLatestStart(cue, n) { return stCueDuration(cue) - ST_SECTION_END_MARGIN - stTotalSeconds(cue.bpm, n); }

// Bar grid the slider snaps to: through the drop section when the cue has one, else from the first beat.
function stSectionBase(cue) {
  const drop = stDropStart(cue);
  const bar = 4 * 60 / cue.bpm;
  const base = drop !== null ? drop : (typeof cue.firstBeat === 'number' && isFinite(cue.firstBeat) ? cue.firstBeat : 0);
  // The earliest non-negative start on that bar grid.
  return base - Math.floor(base / bar + 1e-9) * bar;
}

// Snaps a slider value to the bar grid within [0, latest start]. Returns { start, kind: 'drop' | 'section', moved }
// or null when nothing fits. `moved` is true when the value had to move past the end of the cue.
function stClampSection(opts) {
  const cue = opts.cue, n = opts.montageShots;
  if (!cue || !(cue.bpm > 0)) return null;
  const bar = 4 * 60 / cue.bpm, base = stSectionBase(cue), latest = stLatestStart(cue, n);
  const maxK = Math.floor((latest - base) / bar + 1e-9);
  if (maxK < 0) return null;
  const value = typeof opts.value === 'number' && isFinite(opts.value) ? opts.value : base;
  const want = Math.round((value - base) / bar);
  const k = Math.max(0, Math.min(maxK, want));
  const start = base + k * bar, drop = stDropStart(cue);
  return { start, kind: drop !== null && Math.abs(start - drop) < 1e-6 ? 'drop' : 'section', moved: want > maxK };
}

// Default section for a cue and N montage shots (spec 15.5): the drop section (dropBeat - 8) when it fits, else the
// latest fitting start (note says so). Without a drop: the highest-energy bar-aligned window (cue.beatEnergy, one
// value per beat from firstBeat), else the first beat. Returns { start, kind, clamped, note } or null.
function stDefaultSection(cue, n) {
  if (!cue || !(cue.bpm > 0)) return null;
  const beat = 60 / cue.bpm, latest = stLatestStart(cue, n);
  const drop = stDropStart(cue);
  if (drop !== null && drop >= -1e-6 && drop <= latest + 1e-6) return { start: Math.max(0, drop), kind: 'drop', clamped: false, note: null };
  if (drop !== null) {
    const c = stClampSection({ cue, montageShots: n, value: drop });
    if (!c) return null;
    // A drop within the first 8 beats of the file: its section would start before the file, so the earliest bar
    // start is used and the title runs over the track's first two bars instead of the build-up.
    const note = drop < -1e-6 ? 'The drop is too close to the start of the track; the title runs over the first two bars'
      : 'The drop section does not fit this length; moved to the latest start that fits';
    return { start: c.start, kind: c.kind, clamped: true, note };
  }
  const first = typeof cue.firstBeat === 'number' && isFinite(cue.firstBeat) ? cue.firstBeat : 0;
  let start = null;
  if (Array.isArray(cue.beatEnergy) && cue.beatEnergy.length) {
    const span = stTotalBeats(n);
    let best = null;
    for (let k = 0; ; k++) {
      const s = first + k * 4 * beat;
      if (s > latest + 1e-6) break;
      const slice = cue.beatEnergy.slice(k * 4, k * 4 + span);
      if (slice.length < span) break;
      const mean = slice.reduce((a, b) => a + b, 0) / span;
      if (!best || mean > best.mean + 1e-9) best = { s, mean };
    }
    if (best) start = best.s;
  }
  if (start === null) start = first;
  const c = stClampSection({ cue, montageShots: n, value: start });
  return c ? { start: c.start, kind: c.kind, clamped: c.moved, note: null } : null;
}

// ---------------------------------------------------------------------------------------------------------------
// Onset snapping for anchors (own music only; bundled cues never snap). The pick rule is City Weekend Vlog's
// conservative snap: an anchor stays on the grid when a qualifying onset of any band lies within one frame of it;
// otherwise the candidate must reach ST_SNAP_MIN_RATIO of its band threshold, candidates rank by ratio - cost *
// |offset| / window, and a low-band candidate must also beat the grid position's own onset by ST_SNAP_LOW_MARGIN.
const ST_SNAP_WINDOW_BEATS = 0.10;
const ST_SNAP_WINDOW_MAX = 0.070;
const ST_SNAP_MIN_STRENGTH = 2;
const ST_SNAP_MIN_RATIO = 1.5;
const ST_SNAP_DISTANCE_COST = 0.5;
const ST_SNAP_LOW_MARGIN = 0.25;
const ST_SNAP_MIN_FRAMES = 4;
const ST_SNAP_MIN_SHARE = 0.75;
const ST_SNAP_LOW_CONFIDENCE_WINDOW = 0.120;

// schedule: stSchedule output. onsets: [[seconds in the music source, 'l' | 'm' | 'h', strength], ...].
// opts: { bpm, fps, sectionStart, delta?, thresholds?: { l, m, h }, lowConfidence?, bundled? }.
// Returns { snaps: { [anchorBeat]: seconds from the section start }, log }.
function stSnapAnchors(schedule, onsets, opts) {
  const log = [];
  if (opts.bundled) return { snaps: {}, log: schedule.anchors.map(b => ({ beat: b, reason: 'bundled cue (never snaps)' })) };
  const fps = opts.fps, beat = 60 / opts.bpm, low = !!opts.lowConfidence;
  const delta = typeof opts.delta === 'number' && isFinite(opts.delta) ? opts.delta : stMusicOffset(opts.sectionStart, fps);
  const frameOf = x => (x === 0 ? 0 : Math.round((x + delta) * fps));
  const reach = low ? ST_SNAP_LOW_CONFIDENCE_WINDOW : Math.min(ST_SNAP_WINDOW_BEATS * beat, ST_SNAP_WINDOW_MAX);
  const bands = low ? ['l'] : ['l', 'm', 'h'];
  const thr = band => Math.max(ST_SNAP_MIN_STRENGTH, (opts.thresholds && opts.thresholds[band]) || 0);
  const shift = typeof opts.sectionStart === 'number' && isFinite(opts.sectionStart) ? opts.sectionStart : 0;
  const list = (onsets || []).filter(o => o && isFinite(o[0]) && isFinite(o[2]) && o[2] >= thr(o[1]))
    .map(o => ({ x: o[0] - shift, band: o[1], strength: o[2], ratio: o[2] / thr(o[1]) }));
  const pick = g => {
    const near = list.filter(o => Math.abs(o.x - g) <= reach + 1e-9).map(o => ({ ...o, d: Math.abs(o.x - g) }));
    const onGrid = near.filter(o => o.d <= 1 / fps + 1e-9).sort((p, q) => p.d - q.d || p.x - q.x);
    if (onGrid.length) return { none: 'on grid (' + onGrid[0].band + ' onset within a frame)' };
    const usable = near.filter(o => bands.indexOf(o.band) >= 0);
    if (!usable.length) return { none: 'no onset' };
    let best = null, why = 'weak onset';
    for (const o of usable) {
      if (o.ratio < ST_SNAP_MIN_RATIO - 1e-9) continue;
      if (o.band === 'l') {
        const own = near.reduce((m, q) => (q.d < o.d - 1e-9 && q.ratio > m ? q.ratio : m), 1);
        if (o.ratio < own + ST_SNAP_LOW_MARGIN - 1e-9) { why = 'low onset not above the grid'; continue; }
      }
      const score = o.ratio - ST_SNAP_DISTANCE_COST * o.d / reach;
      if (!best || score > best.score + 1e-9 || (Math.abs(score - best.score) <= 1e-9 && (o.d < best.d - 1e-9 || (Math.abs(o.d - best.d) <= 1e-9 && o.x < best.x)))) best = { ...o, score };
    }
    return best || { none: why };
  };
  // Neighbouring events: every other beat in the schedule; a snap may not squeeze the span to either neighbour.
  const events = {};
  schedule.mainBeats.concat(schedule.gridStates, schedule.title, schedule.place, schedule.pulses, [schedule.fadeStart])
    .concat(schedule.labels[0], schedule.labels[1]).forEach(b => { events[b] = true; });
  const beats = Object.keys(events).map(Number).sort((a, b) => a - b);
  const snaps = {};
  const sec = b => b * 60 / opts.bpm;
  for (const b of schedule.anchors) {
    const g = sec(b);
    const o = pick(g);
    if (o.none) { log.push({ beat: b, grid: g, seconds: g, shiftMs: 0, reason: o.none }); continue; }
    const prev = beats.filter(x => x < b).pop(), next = beats.filter(x => x > b)[0];
    let bad = null;
    for (const [p, q, px, qx] of [[prev, b, prev === undefined ? 0 : sec(prev), o.x], [b, next, o.x, next === undefined ? 0 : sec(next)]]) {
      if (p === undefined || q === undefined) continue;
      const frames = frameOf(qx) - frameOf(px), gridFrames = frameOf(sec(q)) - frameOf(sec(p));
      if (frames < Math.min(ST_SNAP_MIN_FRAMES, gridFrames)) bad = 'min-frames';
      else if (qx - px < ST_SNAP_MIN_SHARE * (sec(q) - sec(p)) - 1e-9) bad = 'min-share';
    }
    const entry = { beat: b, grid: g, onset: o.x, band: o.band, strength: o.strength, ratio: Math.round(o.ratio * 100) / 100 };
    if (bad) { log.push({ ...entry, seconds: g, shiftMs: 0, reason: 'reverted: ' + bad }); continue; }
    snaps[b] = o.x;
    log.push({ ...entry, seconds: o.x, shiftMs: Math.round((o.x - g) * 1e4) / 10, reason: 'onset' });
  }
  return { snaps, log, window: reach };
}

// ---------------------------------------------------------------------------------------------------------------
// Shot allocation

function stHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}
// stHash with a murmur3 finaliser: FNV-1a alone maps strings that differ only in their last characters (rids
// "r0", "r1", …) to nearly the same value, which made the seeded fixed-slot spread a no-op.
function stMixHash(str) {
  let h = Math.round(stHash(str) * 4294967296) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// Filler candidates on each video source in the candidates: every ST_FILLER_STEP s from ST_FILLER_EDGE to
// duration - ST_FILLER_EDGE, or ST_FILLER_MAX evenly spaced times when that grid would be longer. Sorted by rid, time.
// A source whose candidates carry a minStart (clips without analysis) passes the largest one on to its fillers.
function stFillers(candidates) {
  const dur = {}, min = {};
  for (const c of candidates) {
    if (!c || c.kind === 'photo' || typeof c.rid !== 'string') continue;
    if (typeof c.sourceDuration !== 'number' || !isFinite(c.sourceDuration) || !(c.sourceDuration > 0)) continue;
    dur[c.rid] = Math.max(dur[c.rid] || 0, c.sourceDuration);
    if (typeof c.minStart === 'number' && isFinite(c.minStart) && c.minStart > 0) min[c.rid] = Math.max(min[c.rid] || 0, c.minStart);
  }
  const out = [];
  for (const rid of Object.keys(dur).sort()) {
    const d = dur[rid], span = d - 2 * ST_FILLER_EDGE;
    if (span < -1e-9) continue;
    const count = Math.floor(span / ST_FILLER_STEP + 1e-9) + 1;
    const filler = t => (min[rid] ? { rid, role: 'filler', t, score: ST_FILLER_SCORE, sourceDuration: d, minStart: min[rid] } : { rid, role: 'filler', t, score: ST_FILLER_SCORE, sourceDuration: d });
    if (count <= ST_FILLER_MAX) {
      for (let k = 0; k < count; k++) out.push(filler(ST_FILLER_EDGE + k * ST_FILLER_STEP));
    } else {
      for (let k = 0; k < ST_FILLER_MAX; k++) out.push(filler(ST_FILLER_EDGE + k * span / (ST_FILLER_MAX - 1)));
    }
  }
  return out;
}

// Frame-aligned source window of `frames` frames centred on t: the start is a whole frame at fps, at least minStart
// (seconds, default 0) into the source, and the window ends at least ST_SOURCE_TAIL before the end of the source.
// Returns { start, end } in seconds or null when it cannot fit.
function stWindow(t, frames, fps, sourceDuration, minStart) {
  const maxStart = Math.floor((sourceDuration - ST_SOURCE_TAIL) * fps - frames + 1e-6);
  const minS = typeof minStart === 'number' && isFinite(minStart) && minStart > 0 ? Math.ceil(minStart * fps - 1e-6) : 0;
  if (maxStart < minS) return null;
  const want = Math.round((t - frames / fps / 2) * fps);
  const s = Math.max(minS, Math.min(maxStart, want));
  return { start: s / fps, end: (s + frames) / fps };
}

// ---------------------------------------------------------------------------------------------------------------
// Clips without analysis: local candidates

// Evenly spaced low-score candidates for a clip without analysis and without a usable quick score (no host ffmpeg,
// the budget ran out, a failed decode): ST_LOCAL_FALLBACK_COUNT centres per role, every window starting at
// ST_LOCAL_MIN_START or later. resource: { rid, duration }.
function stFallbackCandidates(resource) {
  const out = [], d = resource && Number(resource.duration);
  if (!resource || typeof resource.rid !== 'string' || !(d > 0)) return out;
  for (const role of Object.keys(ST_LOCAL_ROLES)) {
    const need = ST_LOCAL_ROLES[role], a = ST_LOCAL_MIN_START + need / 2, b = d - ST_SOURCE_TAIL - need / 2;
    // Too short for this role's length: one centred candidate (stWindow decides whether a slot fits).
    const n = b < a ? 1 : ST_LOCAL_FALLBACK_COUNT;
    for (let k = 0; k < n; k++) {
      const t = b < a ? Math.max(ST_LOCAL_MIN_START, d / 2) : a + (b - a) * (k + 0.5) / n;
      out.push({ rid: resource.rid, role, t: Math.round(t * 1000) / 1000, score: ST_LOCAL_FALLBACK_SCORE, sourceDuration: d, minStart: ST_LOCAL_MIN_START, local: 'fallback' });
    }
  }
  return out;
}

// Planner candidates for one clip without analysis from its quick score and the quick-score block's window picker:
// scores = quickScore's result ({ windows, sceneCuts, ms, fallback, duration }), pick = pickWindowsLocal(scores,
// 'steady' | 'montage' | 'still', seconds) -> [{ start, end, score (0-1), flags: { bad } }] best first. Each role asks
// the picker for its ST_LOCAL_PICK_ROLE with its ST_LOCAL_ROLES seconds and keeps up to ST_LOCAL_PER_ROLE windows at
// least max(ST_LOCAL_APART, the role's seconds) apart (as the block's qsCandidates spaces them), as { rid, role, t: window centre, score, sourceDuration, minStart, local: 'score' }:
// score = ST_LOCAL_SCORE_MIN + q * (ST_LOCAL_SCORE_MAX - ST_LOCAL_SCORE_MIN), q the picker's score (clamped to 0-1),
// halved for a window the picker flags as bad (it returns those only when nothing clean fits). The picker's answer is
// read tolerantly (start/end or t; score, value or quality). A fallback score (scores.fallback: evenly spaced unscored
// windows), a missing picker or no usable pick gives stFallbackCandidates. resource: { rid, duration }.
function stLocalCandidates(resource, scores, pick) {
  const finite = v => typeof v === 'number' && isFinite(v);
  const d = resource && Number(resource.duration);
  if (!resource || typeof resource.rid !== 'string' || !(d > 0)) return [];
  if (!scores || scores.fallback || !Array.isArray(scores.windows) || !scores.windows.length || typeof pick !== 'function') return stFallbackCandidates(resource);
  const out = [];
  for (const role of Object.keys(ST_LOCAL_ROLES)) {
    const need = ST_LOCAL_ROLES[role];
    let list = null;
    try { list = pick(scores, ST_LOCAL_PICK_ROLE[role] || role, need); } catch (e) { list = null; }
    const kept = [];
    for (const w of Array.isArray(list) ? list : []) {
      if (kept.length >= ST_LOCAL_PER_ROLE) break;
      if (!w || typeof w !== 'object') continue;
      const start = finite(w.start) ? w.start : finite(w.t) ? w.t - need / 2 : null;
      if (start === null) continue;
      const end = finite(w.end) && w.end > start ? w.end : start + need;
      const t = Math.round((start + end) / 2 * 1000) / 1000;
      if (kept.some(x => Math.abs(x - t) < Math.max(ST_LOCAL_APART, need) - 1e-9)) continue;
      const v = finite(w.score) ? w.score : finite(w.value) ? w.value : finite(w.quality) ? w.quality : 0;
      const q = Math.max(0, Math.min(1, v)) * (w.flags && w.flags.bad ? 0.5 : 1);
      kept.push(t);
      out.push({ rid: resource.rid, role, t, score: ST_LOCAL_SCORE_MIN + q * (ST_LOCAL_SCORE_MAX - ST_LOCAL_SCORE_MIN), sourceDuration: d, minStart: ST_LOCAL_MIN_START, local: 'score' });
    }
  }
  return out.length ? out : stFallbackCandidates(resource);
}

// slots: [{ index, track: 'main' | 'grid', section: 'opener' | 'place' | 'grid' | 'montage' | 'ending', role, frames,
// seconds, quad? }] in allocation order (opener, place, grid A-D, montage, ending). opts: { candidates (hits +
// fillers + photos), slots, fps, seed, photoShare?, allowOverlap? }.
// Fresh-first: every slot takes the least-used resource that fits; the tier (preferred role, any real hit, filler)
// only ranks candidates with equal use counts, then a seeded value (score + hash). Hard rules: opener, place and grid
// A-D are six different resources; Main never shows the same resource twice in a row. Photos: photo slots (about a
// third of the montage + ending slots, evenly spread) take an unused photo first; elsewhere a photo is used only when
// no video fits. At most ST_PHOTO_RUN_MAX photos play in a row on Main unless nothing else fits (photoRunRelaxed).
function stAllocate(opts) {
  const fps = opts.fps, seed = String(opts.seed == null ? '' : opts.seed);
  const finite = v => typeof v === 'number' && isFinite(v);
  const isSignal = c => Object.prototype.hasOwnProperty.call(ST_SIGNAL_QUERIES, c.role);
  const pool = opts.candidates.filter(c => c && c.kind !== 'photo' && typeof c.rid === 'string' && !isSignal(c) && finite(c.t) && finite(c.score) && finite(c.sourceDuration) && c.sourceDuration > 0);
  const signals = stSignals(opts.candidates, pool);
  const photoSeen = {};
  const photos = opts.candidates.filter(c => c && c.kind === 'photo' && typeof c.rid === 'string' && !photoSeen[c.rid] && (photoSeen[c.rid] = true))
    .sort((a, b) => (a.rid < b.rid ? -1 : a.rid > b.rid ? 1 : 0));
  // Per-candidate seeded values, computed once (hashing per slot is slow on long sources).
  const valueOf = new Map();
  for (const c of pool) valueOf.set(c, c.score + stMixHash(seed + ':' + c.rid + ':' + c.t.toFixed(2)) * 0.05);
  // The opener, place and grid slots are picked first, so without extra variety every version shows the same opening.
  // They rank by a larger seeded value: another version picks among the good hits of the role (live finding).
  const fixedValueOf = new Map();
  for (const c of pool) fixedValueOf.set(c, c.score + stMixHash(seed + ':fixed:' + c.rid) * ST_FIXED_JITTER);
  const photoValue = {};
  for (const p of photos) photoValue[p.rid] = stMixHash(seed + ':photo:' + p.rid);

  const uses = {}, windows = {}, picks = [];
  const fixedRids = [];     // opener, place and grid resources: all different
  let prevMain = null, photoRun = 0;
  let missing = 0, fillerShots = 0, photoShots = 0, photoRunRelaxed = false, overlapShots = 0, reusedPhotos = 0;
  let failed = null;

  // Photo slots over montage + ending.
  const flow = opts.slots.filter(sl => sl.section === 'montage' || sl.section === 'ending');
  const holdable = flow.filter(sl => sl.seconds <= ST_PHOTO_HOLD_MAX + 1e-9);
  const share = opts.photoShare == null ? ST_PHOTO_SHARE : opts.photoShare;
  const target = Math.min(photos.length, holdable.length, Math.round(flow.length * share));
  const photoSlots = {};
  const phase = stHash(seed + ':photo-slots');
  for (let k = 0; k < target; k++) photoSlots[holdable[Math.floor((k + phase) * holdable.length / target)].index] = true;

  function bestVideo(slot, excluded, tierOf, overlap) {
    let best = null;
    const fixedSlot = slot.section === 'opener' || slot.section === 'place' || slot.section === 'grid';
    const values = fixedSlot ? fixedValueOf : valueOf;
    for (const c of pool) {
      if (excluded[c.rid]) continue;
      const rawTier = tierOf(c);
      if (rawTier < 0) continue;
      // Fixed slots: the role order is a small score penalty instead of a strict tier, so the seed can pick among good hits.
      const tier = fixedSlot ? 0 : rawTier;
      const w = stWindow(c.t, slot.frames, fps, c.sourceDuration, c.minStart);
      if (!w) continue;
      if (!overlap && (windows[c.rid] || []).some(([a, b]) => w.start < b + ST_WINDOW_GAP - 1e-9 && w.end > a - ST_WINDOW_GAP + 1e-9)) continue;
      // Signals: an avoided moment counts one use more (not in the ending); a moving one gets a small tie-break bonus.
      const avoided = slot.section !== 'ending' && signals.avoided.has(c);
      const use = (uses[c.rid] || 0) + (avoided ? 1 : 0);
      const value = values.get(c) - (fixedSlot ? ST_FIXED_ROLE_PENALTY * rawTier : 0) - (avoided ? ST_AVOID_PENALTY : 0) + (signals.motion.get(c) || 0);
      const av = avoided ? 1 : 0;
      const better = !best || use < best.use || (use === best.use && (av < best.av || (av === best.av && (tier < best.tier || (tier === best.tier &&
        (value > best.value + 1e-12 || (Math.abs(value - best.value) <= 1e-12 && (c.rid < best.c.rid || (c.rid === best.c.rid && c.t < best.c.t)))))))));
      if (better) best = { c, use, av, tier, value, start: w.start, end: w.end };
    }
    return best;
  }
  function bestPhoto(slot, excluded, unusedOnly) {
    if (slot.seconds > ST_PHOTO_HOLD_MAX + 1e-9) return null;
    let best = null;
    for (const p of photos) {
      if (excluded[p.rid]) continue;
      const use = uses[p.rid] || 0;
      if (unusedOnly && use > 0) continue;
      const value = photoValue[p.rid];
      if (!best || use < best.use || (use === best.use && value > best.value + 1e-12)) best = { c: p, use, value, photo: true };
    }
    return best;
  }

  for (const slot of opts.slots) {
    const fixed = slot.section === 'opener' || slot.section === 'place' || slot.section === 'grid';
    const excluded = {};
    if (fixed) for (const r of fixedRids) excluded[r] = true;
    if (slot.track === 'main' && prevMain !== null) excluded[prevMain] = true;
    const roles = ST_ROLE_FALLBACK[slot.role] || [slot.role];
    const k = roles.length;
    const real = c => (c.role === 'filler' ? -1 : roles.indexOf(c.role) >= 0 ? roles.indexOf(c.role) : k);
    const realOrFiller = c => (c.role === 'filler' ? k + 1 : roles.indexOf(c.role) >= 0 ? roles.indexOf(c.role) : k);
    const onlyFiller = c => (c.role === 'filler' ? 0 : -1);
    const inFlow = slot.section === 'montage' || slot.section === 'ending';
    const runFull = inFlow && photoRun >= ST_PHOTO_RUN_MAX;
    const video = overlap => bestVideo(slot, excluded, realOrFiller, overlap);
    let best = null;
    const tries = [];
    if (slot.section === 'opener') {
      // A video first (real hits, then fillers); a photo only if nothing else fits.
      tries.push(() => bestVideo(slot, excluded, real, false), () => bestVideo(slot, excluded, onlyFiller, false), () => bestPhoto(slot, excluded, true));
    } else if (fixed) {
      tries.push(() => bestVideo(slot, excluded, real, false), () => bestPhoto(slot, excluded, true), () => bestVideo(slot, excluded, onlyFiller, false));
    } else if (photoSlots[slot.index]) {
      if (!runFull) tries.push(() => bestPhoto(slot, excluded, true));
      tries.push(() => video(false));
      if (!runFull) tries.push(() => bestPhoto(slot, excluded, false));
    } else {
      tries.push(() => video(false));
      if (!runFull) tries.push(() => bestPhoto(slot, excluded, false));
    }
    if (inFlow && opts.allowOverlap) tries.push(() => { const b = video(true); return b ? { ...b, overlap: true } : null; });
    if (runFull) tries.push(() => { const b = bestPhoto(slot, excluded, false); return b ? { ...b, runRelaxed: true } : null; });
    for (const t of tries) { best = t(); if (best) break; }
    if (!best) {
      missing++;
      if (!failed) failed = slot;
      picks.push(null);
      if (slot.track === 'main') { prevMain = null; photoRun = 0; }
      continue;
    }
    const rid = best.c.rid;
    uses[rid] = (uses[rid] || 0) + 1;
    if (fixed) fixedRids.push(rid);
    if (slot.track === 'main') prevMain = rid;
    if (best.runRelaxed) photoRunRelaxed = true;
    const base = { slot: slot.index, track: slot.track, section: slot.section, role: slot.role, rid };
    if (slot.quad) base.quad = slot.quad;
    if (best.photo) {
      if (best.use > 0) reusedPhotos++;
      if (inFlow) { photoShots++; photoRun++; }
      picks.push({ ...base, kind: 'photo', startSeconds: 0, holdSeconds: slot.seconds });
      continue;
    }
    if (inFlow) photoRun = 0;
    if (best.overlap) overlapShots++;
    (windows[rid] = windows[rid] || []).push([best.start, best.end]);
    if (best.c.role === 'filler') fillerShots++;
    picks.push({ ...base, kind: 'video', startSeconds: best.start, endSeconds: best.end });
  }
  return { picks, filled: picks.filter(Boolean).length, missing, failed, fillerShots, photoShots, photoRunRelaxed, overlapShots, reusedPhotos, photoSlots: Object.keys(photoSlots).map(Number) };
}

// Signal lookups for the allocation pool: { avoided: Set of pool candidates near a strong avoid hit (or on an
// avoid-dominated clip), motion: Map candidate -> bonus }. Without signal hits both are empty and nothing changes.
function stSignals(candidates, pool) {
  const finite = v => typeof v === 'number' && isFinite(v);
  const avoid = {}, motion = {}, day = {};
  let motionMax = 0;
  for (const c of candidates) {
    if (!c || c.kind === 'photo' || typeof c.rid !== 'string' || !finite(c.t) || !finite(c.score)) continue;
    if (c.role === 'avoid') (avoid[c.rid] = avoid[c.rid] || []).push(c);
    else if (c.role === 'motion') { (motion[c.rid] = motion[c.rid] || []).push(c); if (c.score > motionMax) motionMax = c.score; }
    else if (c.role !== 'ending' && c.role !== 'filler' && Object.prototype.hasOwnProperty.call(ST_QUERIES, c.role)) (day[c.rid] = day[c.rid] || []).push(c);
  }
  const best = list => (list || []).reduce((m, c) => Math.max(m, c.score), 0);
  const strong = {}, wholeClip = {};
  for (const rid of Object.keys(avoid)) {
    const dayHits = day[rid] || [];
    if (best(avoid[rid]) >= ST_AVOID_MIN && best(avoid[rid]) > best(dayHits)) wholeClip[rid] = true;
    strong[rid] = avoid[rid].filter(h => h.score >= ST_AVOID_MIN &&
      h.score > best(dayHits.filter(d => Math.abs(d.t - h.t) <= ST_SIGNAL_REACH + 1e-9)));
  }
  const avoided = new Set(), bonus = new Map();
  for (const c of pool) {
    if (wholeClip[c.rid] || (strong[c.rid] || []).some(h => Math.abs(h.t - c.t) <= ST_SIGNAL_REACH + 1e-9)) avoided.add(c);
    if (motionMax > 0 && motion[c.rid]) {
      const near = motion[c.rid].filter(h => Math.abs(h.t - c.t) <= ST_SIGNAL_REACH + 1e-9);
      if (near.length) bonus.set(c, ST_MOTION_BONUS * Math.max(0, best(near)) / motionMax);
    }
  }
  return { avoided, motion: bonus };
}

// Slots for N montage shots at fps, from the frame schedule (seconds are F differences / fps).
function stSlots(schedule, frames, fps) {
  const n = schedule.montageShots, mf = frames.mainFrames, out = [];
  const span = (a, b) => ({ frames: b - a, seconds: (b - a) / fps });
  let index = 0;
  out.push({ index: index++, track: 'main', section: 'opener', role: 'opener', ...span(mf[0], mf[1]) });
  out.push({ index: index++, track: 'main', section: 'place', role: 'place', ...span(mf[1], mf[2]) });
  frames.grid.forEach(g => out.push({ index: index++, track: 'grid', section: 'grid', role: 'grid', quad: g.quad, ...span(g.aFrame, g.bFrame) }));
  for (let i = 0; i < n; i++) out.push({ index: index++, track: 'main', section: 'montage', role: ST_MONTAGE_ROLES[i % ST_MONTAGE_ROLES.length], ...span(mf[2 + i], mf[3 + i]) });
  for (let i = 0; i < ST_ENDING_SHOTS.length; i++) out.push({ index: index++, track: 'main', section: 'ending', role: 'ending', ...span(mf[2 + n + i], mf[3 + n + i]) });
  return out;
}

// Seconds for a reason string, rounded up to 0.1 s ("5.9").
function stFmtSeconds(x) { return (Math.ceil(x * 10 - 1e-6) / 10).toFixed(1); }

// Plans a build (spec 5, 15.4). opts: {
//   candidates: search hits [{ rid, role, t, score, sourceDuration }] (local candidates of clips without analysis add
//   minStart: their windows start no earlier) + photos [{ rid, kind: 'photo' }],
//   bpm, fps (the Draft's real fps when known), montageShots (requested N), seed,
//   sectionStart? (music seconds at beat 0; gives delta), delta? (overrides), photoShare?, sizes? ({ rid: { width,
//   height } } for photo motions),
//   snaps? ({ anchorBeat: seconds }, filtered to each attempt's anchors) or onsets?/onsetThresholds?/lowConfidence?
//   (stSnapAnchors per attempt), bundled? (bundled cue: never snaps) }.
// N shrinks by 2 (never below 4) until every slot fills without overlapping windows; failing that, N = 4 may reuse
// overlapping windows. Returns { ok, disabledReason, requestedShots, montageShots, shrunk, distinct, schedule, frames,
// snapLog, picks: { main, grid }, motions, endingMotion, notes, fillerShots, photoShots, ... }.
function stPlanBuild(opts) {
  const fps = opts.fps, bpm = opts.bpm;
  if (!(bpm > 0) || !(fps > 0)) throw Error('stPlanBuild needs bpm and fps');
  const requested = Math.min(ST_MAX_MONTAGE, Math.max(ST_MIN_MONTAGE, Math.round(opts.montageShots || ST_LENGTHS.standard)));
  const delta = typeof opts.delta === 'number' && isFinite(opts.delta) ? opts.delta : stMusicOffset(opts.sectionStart, fps);
  const candidates = opts.candidates.filter(Boolean);
  const all = candidates.concat(stFillers(candidates));
  const beatSec = 60 / bpm;
  const notes = [];
  const fail = (reason, extra) => ({ ok: false, disabledReason: reason, requestedShots: requested, montageShots: 0, shrunk: false, distinct: extra.distinct, schedule: null, frames: null, snapLog: [], picks: { main: [], grid: [] }, motions: {}, endingMotion: {}, notes });

  const framesFor = n => {
    const schedule = stSchedule({ montageShots: n });
    let snaps = {}, snapLog = [];
    if (opts.snaps && !opts.bundled) {
      for (const b of schedule.anchors) if (opts.snaps[b] != null) snaps[b] = opts.snaps[b];
    } else if (opts.onsets && opts.onsets.length) {
      const r = stSnapAnchors(schedule, opts.onsets, { bpm, fps, sectionStart: opts.sectionStart, delta, thresholds: opts.onsetThresholds, lowConfidence: opts.lowConfidence, bundled: opts.bundled });
      snaps = r.snaps; snapLog = r.log;
    }
    return { schedule, frames: stFrameSchedule({ schedule, bpm, delta, fps, snaps }), snapLog };
  };

  // Shortage checks that do not depend on N (spec 15.4).
  const first = framesFor(ST_MIN_MONTAGE);
  const slots0 = stSlots(first.schedule, first.frames, fps);
  const gridSeconds = Math.max.apply(null, slots0.filter(s => s.section === 'grid').map(s => s.seconds));
  const minFrames = Math.max.apply(null, slots0.filter(s => s.section === 'grid').map(s => s.frames));
  const eligible = {};
  for (const c of candidates) {
    if (c.kind === 'photo') { if (typeof c.rid === 'string' && gridSeconds <= ST_PHOTO_HOLD_MAX + 1e-9) eligible[c.rid] = true; continue; }
    if (typeof c.rid === 'string' && typeof c.sourceDuration === 'number' && isFinite(c.sourceDuration) && stWindow(0, minFrames, fps, c.sourceDuration, c.minStart)) eligible[c.rid] = true;
  }
  const distinct = Object.keys(eligible).length;
  if (distinct < ST_MIN_DISTINCT) return fail('Needs at least ' + ST_MIN_DISTINCT + ' different clips or photos (found ' + distinct + ')', { distinct });
  const fixedSlots = slots0.filter(s => s.section === 'opener' || s.section === 'place' || s.section === 'grid');
  const fixedAlloc = stAllocate({ candidates: all, slots: fixedSlots, fps, seed: opts.seed, photoShare: opts.photoShare });
  if (fixedAlloc.missing) {
    const f = fixedAlloc.failed;
    if (f.section === 'opener') return fail('Needs one video clip at least ' + stFmtSeconds(f.seconds + ST_SOURCE_TAIL) + ' s long for the opening', { distinct });
    if (f.section === 'place') return fail('Needs a second clip at least ' + stFmtSeconds(f.seconds + ST_SOURCE_TAIL) + ' s long (or a photo) for the place shot', { distinct });
    return fail('Needs at least ' + ST_MIN_DISTINCT + ' different clips or photos long enough for the grid panels (found ' + distinct + ')', { distinct });
  }

  let result = null;
  const attempt = (n, allowOverlap) => {
    const f = n === ST_MIN_MONTAGE ? first : framesFor(n);
    const slots = stSlots(f.schedule, f.frames, fps);
    const alloc = stAllocate({ candidates: all, slots, fps, seed: opts.seed, photoShare: opts.photoShare, allowOverlap });
    return alloc.missing ? null : { n, f, slots, alloc };
  };
  for (let n = requested; n >= ST_MIN_MONTAGE && !result; n -= 2) result = attempt(n, false);
  if (!result) {
    result = attempt(ST_MIN_MONTAGE, true);
    if (result) notes.push('Some shots reuse footage from the same moment of a clip');
  }
  if (!result) return fail('Your footage is too short for ' + ST_MIN_MONTAGE + ' montage shots', { distinct });

  const { n, f, alloc } = result;
  const main = [], grid = [];
  for (const p of alloc.picks) {
    const item = { rid: p.rid, kind: p.kind, startSeconds: p.startSeconds, role: p.section === 'montage' ? 'montage' : p.section, slotRole: p.role };
    if (p.kind === 'video') item.endSeconds = p.endSeconds; else item.holdSeconds = p.holdSeconds;
    if (p.track === 'grid') { item.quad = p.quad; grid.push(item); } else main.push(item);
  }
  const shrunk = n < requested;
  const seconds = f.frames.endFrame / fps;
  if (shrunk) notes.push('Your footage fits ' + n + ' montage shots (about ' + Math.round(seconds) + ' s)');
  if (alloc.photoRunRelaxed) notes.push('More than ' + ST_PHOTO_RUN_MAX + ' photos play in a row (not enough video)');
  if (alloc.reusedPhotos) notes.push('Some photos are used twice');
  const pm = stPhotoMotions(main, opts.seed, opts.sizes);
  const plan = {
    ok: true,
    disabledReason: null,
    requestedShots: requested,
    montageShots: n,
    shrunk,
    distinct,
    seconds,
    schedule: f.schedule,
    frames: f.frames,
    snapLog: f.snapLog,
    picks: { main, grid },
    motions: pm.motions,
    endingMotion: pm.endingMotion,
    notes,
    fillerShots: alloc.fillerShots,
    photoShots: alloc.photoShots,
    photoRunRelaxed: alloc.photoRunRelaxed,
    overlapShots: alloc.overlapShots,
    reusedPhotos: alloc.reusedPhotos,
  };
  return plan;
}

// ---------------------------------------------------------------------------------------------------------------
// Photo motions (copied from City Weekend Vlog): deterministic per seed; never the same family (push-in, pull-out,
// drift, tilt, push-drift) twice in a row; drift, tilt and push-drift directions alternate. Drift follows the room the
// 16:9 canvas's cover crop leaves: a photo narrower than 16:9 (portrait, square, 4:3, 3:2) is cropped top and bottom
// and drifts vertically; 16:9 and wider drift horizontally; an unknown size counts as 16:9. One sequence runs over the Main
// photos from the montage on, split into `motions` (montage photos, keyed by Main index) and `endingMotion` (ending
// photos, keyed by ending index 0-2; the film-frame effect performs them). Opener and place photos stay still.
const ST_PHOTO_MOTIONS = ['push-in', 'pull-out', 'drift-left', 'drift-right', 'drift-up', 'drift-down', 'tilt', 'push-drift'];
const ST_MOTION_FAMILIES = ['push-in', 'pull-out', 'drift', 'tilt', 'push-drift'];
function stPhotoMotions(main, seed, sizes) {
  const motions = {}, endingMotion = {};
  let lastFamily = null, driftSign = { x: 1, y: 1 }, tiltSign = 1, pushDriftSign = 1, k = 0;
  const endingFrom = main.length - ST_ENDING_SHOTS.length;
  main.forEach((pick, i) => {
    if (!pick || pick.kind !== 'photo' || (pick.role !== 'montage' && pick.role !== 'ending')) return;
    const size = sizes && sizes[pick.rid];
    // Narrower than the canvas: the cover crop leaves room above and below, so the drift runs along y.
    const tall = !!(size && size.width > 0 && size.height > 0 && size.width / size.height < ST_W / ST_H - 1e-6);
    const families = ST_MOTION_FAMILIES.filter(f => f !== lastFamily)
      .map(f => ({ f, v: stHash(seed + ':motion:' + k + ':' + f) }))
      .sort((a, b) => b.v - a.v || (a.f < b.f ? -1 : 1));
    const family = families[0].f;
    let motion = family, direction = 1;
    if (family === 'drift') {
      const axis = tall ? 'y' : 'x';
      direction = driftSign[axis]; driftSign[axis] = -direction;
      motion = axis === 'x' ? (direction > 0 ? 'drift-right' : 'drift-left') : (direction > 0 ? 'drift-down' : 'drift-up');
    } else if (family === 'tilt') { direction = tiltSign; tiltSign = -tiltSign; }
    else if (family === 'push-drift') { direction = pushDriftSign; pushDriftSign = -pushDriftSign; }
    const entry = { motion, direction, axis: tall ? 'y' : 'x' };
    if (i >= endingFrom) endingMotion[i - endingFrom] = entry; else motions[i] = entry;
    lastFamily = family; k++;
  });
  return { motions, endingMotion };
}

// ---------------------------------------------------------------------------------------------------------------
// Build progress (copied from City Weekend Vlog): steps with each step's share of the bar in percent. The panel names
// each step in the UI language (STRINGS "step.<id>").
const ST_BUILD_STEPS = [
  { id: 'shots', weight: 40 },
  { id: 'music', weight: 10 },
  { id: 'draft', weight: 25 },
  { id: 'look', weight: 20 },
  { id: 'open', weight: 5 },
];

// Progress for a step that is `fraction` done. Floors the percent so 100% only shows at the very end.
function stProgress(stepId, fraction) {
  const i = ST_BUILD_STEPS.findIndex(s => s.id === stepId);
  if (i < 0) throw new Error('unknown build step ' + stepId);
  const total = ST_BUILD_STEPS.reduce((a, s) => a + s.weight, 0);
  const before = ST_BUILD_STEPS.slice(0, i).reduce((a, s) => a + s.weight, 0);
  const f = Math.min(1, Math.max(0, Number(fraction) || 0));
  const value = (before + ST_BUILD_STEPS[i].weight * f) / total;
  const percent = Math.floor(value * 100 + 1e-9);
  return { id: stepId, value, percent, current: i };
}
// st-planner:end

// st-graphics:start
// Summer Trip graphics: parameter builders and Adjust (editable parameter) definitions for the two Motion Graphics.
// A plain script: panel.tsx embeds it verbatim (like planner.js) and the tests load it in node:vm. Callers that inline
// these objects into a run_script config should cast them `as any`: inline JSON literals widen string unions.
// Parameters are flat top-level keys because the Inspector edits one top-level key per definition.
const ST_TITLE_GRAPHIC_LABEL = 'Summer Trip title';
const ST_LABELS_GRAPHIC_LABEL = 'Summer Trip labels';
// Layout of the labels differs between the two graphics, as in the reference: during the title the labels sit lower
// (top 12.6%, credit 89.9%, credit uppercase "BY NAME"); from the place title on they sit near the edges (8.6% / 93.0%)
// and the credit keeps the typed case ("By Name"). Sizes are px of a 1080-high frame, positions % of the frame.
const ST_TITLE_LAYOUT = { labelSize: 41, creditSize: 36, labelTracking: -0.04, creditTracking: -0.04, topY: 12.6, creditY: 89.9, creditUppercase: true, marginPct: 6, stackGap: 36 };
const ST_LABELS_LAYOUT = {
  labelSize: 39, creditSize: 37, labelTracking: -0.06, creditTracking: -0.1, topY: 8.6, creditY: 93.0, creditUppercase: false, marginPct: 6,
  placeSize: 220, placeX: 72.5, placeY: 38.9, prefixScale: 0.43, prefixDrop: 0.38, placeCapRatio: 0.75,
};
const ST_ROLE_KEYS_TITLE = ['line1', 'season', 'label', 'labelItalic'];
const ST_ROLE_KEYS_LABELS = ['label', 'labelItalic', 'place', 'placePrefix'];

function stPreset(presets, presetId) {
  const list = (presets && presets.presets) || [];
  return list.find(p => p.id === presetId) || list[0] || null;
}
// Faces for the given roles ({ family, koFamily, case, tracking, scaleX, fillWidth }) and the files they need. koFamily is
// the macOS Korean system face of the role (presets.json: AppleMyungjo for serif faces, Apple SD Gothic Neo otherwise),
// last in the font stack before the generic family.
function stFacesFor(presets, preset, roleKeys) {
  const faces = {}, files = [];
  for (const key of roleKeys) {
    const role = preset.roles[key];
    const font = presets.fonts[role.file];
    const face = { family: font.family, case: role.case || 'none', tracking: role.tracking || 0, scaleX: role.scaleX || 1 };
    if (font.koFamily) face.koFamily = font.koFamily;
    if (role.fillWidth) face.fillWidth = role.fillWidth;
    faces[key] = face;
    if (!files.includes(role.file)) files.push(role.file);
  }
  return { faces, files };
}
// `fontsB64`: { [file]: base64 text } for at least the files of the chosen preset (presets.json `fonts` list).
function stFontParams(presets, files, fontsB64) {
  const out = {};
  for (const file of files) {
    const b64 = fontsB64 && fontsB64[file];
    if (typeof b64 === 'string' && b64) out[presets.fonts[file].family] = b64.replace(/\s+/g, '');
  }
  return out;
}
const stClean = v => (typeof v === 'string' ? v : '');

// Title over [0, drop): times are seconds from the graphic's start.
function stTitleParameters(o) {
  const presets = o.presets, preset = stPreset(presets, o.presetId);
  const { faces, files } = stFacesFor(presets, preset, ST_ROLE_KEYS_TITLE);
  return {
    preset: preset.id,
    line1: stClean(o.line1), season: stClean(o.season),
    wordTimes: (o.wordTimes || []).slice(), seasonPartTime: o.seasonPartTime, seasonFullTime: o.seasonFullTime,
    seasonPartLength: o.seasonPartLength, labelsTime: o.labelsTime,
    topMain: stClean(o.topMain), topItalic: stClean(o.topItalic), creditPrefix: stClean(o.creditPrefix), creditName: stClean(o.creditName),
    creditUppercase: ST_TITLE_LAYOUT.creditUppercase,
    line1Color: preset.colors.line1, seasonColor: preset.colors.season, labelColor: preset.colors.labels, shadow: preset.shadow,
    line1Size: preset.title.line1Size, seasonSize: preset.title.seasonSize, labelSize: ST_TITLE_LAYOUT.labelSize, creditSize: ST_TITLE_LAYOUT.creditSize,
    labelTracking: ST_TITLE_LAYOUT.labelTracking, creditTracking: ST_TITLE_LAYOUT.creditTracking,
    line1Y: preset.title.line1Y, seasonY: preset.title.seasonY, topY: ST_TITLE_LAYOUT.topY, creditY: ST_TITLE_LAYOUT.creditY,
    marginPct: ST_TITLE_LAYOUT.marginPct, stackGap: ST_TITLE_LAYOUT.stackGap,
    faces, fonts: stFontParams(presets, files, o.fontsB64),
  };
}
// Labels over [place title, ending): `placeSeconds` from the graphic's start (2 beats).
function stLabelsParameters(o) {
  const presets = o.presets, preset = stPreset(presets, o.presetId);
  const { faces, files } = stFacesFor(presets, preset, ST_ROLE_KEYS_LABELS);
  const L = ST_LABELS_LAYOUT;
  return {
    preset: preset.id,
    topMain: stClean(o.topMain), topItalic: stClean(o.topItalic), creditPrefix: stClean(o.creditPrefix), creditName: stClean(o.creditName),
    creditUppercase: L.creditUppercase,
    placePrefix: stClean(o.placePrefix), place: stClean(o.place), placeSeconds: o.placeSeconds,
    labelColor: preset.colors.labels, placeColor: preset.colors.place, shadow: preset.shadow,
    labelSize: L.labelSize, creditSize: L.creditSize, labelTracking: L.labelTracking, creditTracking: L.creditTracking, placeSize: L.placeSize,
    topY: L.topY, creditY: L.creditY, placeX: L.placeX, placeY: L.placeY,
    prefixScale: L.prefixScale, prefixDrop: L.prefixDrop, placeCapRatio: L.placeCapRatio, marginPct: L.marginPct,
    faces, fonts: stFontParams(presets, files, o.fontsB64),
  };
}
// Files (presets.json `fonts` keys) a build embeds for a preset: only the chosen preset's fonts.
function stPresetFontFiles(presets, presetId) {
  const preset = stPreset(presets, presetId);
  return preset ? preset.fonts.slice() : [];
}

// Adjust definitions (defaultValue filled from the parameters by stEditable).
const ST_TITLE_EDITABLE = [
  { key: 'line1', label: 'Line 1', type: 'text' },
  { key: 'season', label: 'Season word', type: 'text' },
  { key: 'topMain', label: 'Top label', type: 'text' },
  { key: 'topItalic', label: 'Top label (italic part)', type: 'text' },
  { key: 'creditPrefix', label: 'Credit prefix', type: 'text' },
  { key: 'creditName', label: 'Credit name (empty hides the credit)', type: 'text' },
  { key: 'line1Color', label: 'Line 1 color', type: 'color' },
  { key: 'seasonColor', label: 'Season color', type: 'color' },
  { key: 'labelColor', label: 'Label color', type: 'color' },
  { key: 'shadow', label: 'Shadow', type: 'number', min: 0, max: 1, step: 0.05 },
  { key: 'line1Size', label: 'Line 1 size', type: 'number', min: 40, max: 200, step: 1 },
  { key: 'seasonSize', label: 'Season size', type: 'number', min: 80, max: 700, step: 2 },
  { key: 'labelSize', label: 'Label size', type: 'number', min: 20, max: 80, step: 1 },
  { key: 'line1Y', label: 'Line 1 height (%)', type: 'number', min: 5, max: 95, step: 0.5 },
  { key: 'seasonY', label: 'Season height (%)', type: 'number', min: 5, max: 95, step: 0.5 },
  { key: 'topY', label: 'Top label height (%)', type: 'number', min: 2, max: 50, step: 0.5 },
  { key: 'creditY', label: 'Credit height (%)', type: 'number', min: 50, max: 98, step: 0.5 },
];
const ST_LABELS_EDITABLE = [
  { key: 'placePrefix', label: 'Place prefix', type: 'text' },
  { key: 'place', label: 'Place (empty hides the place title)', type: 'text' },
  { key: 'topMain', label: 'Top label', type: 'text' },
  { key: 'topItalic', label: 'Top label (italic part)', type: 'text' },
  { key: 'creditPrefix', label: 'Credit prefix', type: 'text' },
  { key: 'creditName', label: 'Credit name (empty hides the credit)', type: 'text' },
  { key: 'placeColor', label: 'Place color', type: 'color' },
  { key: 'labelColor', label: 'Label color', type: 'color' },
  { key: 'shadow', label: 'Shadow', type: 'number', min: 0, max: 1, step: 0.05 },
  { key: 'placeSize', label: 'Place size', type: 'number', min: 80, max: 400, step: 2 },
  { key: 'labelSize', label: 'Label size', type: 'number', min: 20, max: 80, step: 1 },
  { key: 'placeX', label: 'Place across (%)', type: 'number', min: 10, max: 90, step: 0.5 },
  { key: 'placeY', label: 'Place height (%)', type: 'number', min: 5, max: 95, step: 0.5 },
  { key: 'topY', label: 'Top label height (%)', type: 'number', min: 2, max: 50, step: 0.5 },
  { key: 'creditY', label: 'Credit height (%)', type: 'number', min: 50, max: 98, step: 0.5 },
];
// Definitions with defaultValue = the parameter's current value. `labels` ({ [key]: label }, optional): the Adjust labels in
// the UI language at Build; a key without one keeps the English label.
function stEditable(defs, params, labels) {
  return defs.map(d => Object.assign({}, d, labels && typeof labels[d.key] === 'string' && labels[d.key] ? { label: labels[d.key] } : {}, { defaultValue: params[d.key] }));
}
// st-graphics:end

// st-muffle:start
// Cutoff: the similarity reference keeps 0.30 % of its energy above 3 kHz over the ending, from 2.56 % before it (x 0.117,
// -9.3 dB). The spec's starting point (1.2 kHz, 2-pole) kept 0.5 % of the dry share (-23 dB), far darker.
// Share of the energy above 3 kHz, the filter run on each bundled -11 LUFS dry cue, over the dry's own share
// (dev/measure-muffle.cjs; mean of the four cues; dry shares surf 3.43 %, tropical 2.50 %, cinematic 1.63 %, disco 4.44 %):
//   lowpass=f=1200:p=2  -23.3 dB      lowpass=f=1200:p=1  -12.2 dB      lowpass=f=1600:p=1  -10.0 dB
//   lowpass=f=2500:p=2  -11.3 dB      lowpass=f=2700:p=2  -10.2 dB      lowpass=f=3000:p=2   -8.8 dB
//   lowpass=f=2800:p=2   -9.7 dB (surf / tropical / cinematic / disco -9.2 / -10.5 / -9.7 / -9.5)  <- chosen: in the
//   1/8-1/10 band, 2-pole like the starting point. The shipped 96k -muffled.mp3 files keep 0.44 / 0.24 / 0.19 / 0.53 %
//   (-8.9 / -10.2 / -9.4 / -9.2 dB against the dry).
// The -1 dB keeps the wet a touch under the dry it replaces at the ending cut.
const ST_MUFFLE_FILTER = 'lowpass=f=2800:p=2,volume=-1dB';
const ST_MUFFLE_BITRATE = '96k';
// 8 hex digits of the filter's FNV-1a hash: part of the own-music muffled copy's cached file name, so a filter change
// bakes a new copy instead of reusing one made with the old filter.
const ST_MUFFLE_TAG = (() => {
  let h = 0x811c9dc5;
  for (const ch of ST_MUFFLE_FILTER) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
  return h.toString(16).padStart(8, '0');
})();

// POSIX shell single-quoting: the whole value in '...', each ' closed, escaped and reopened ('\'').
function sq(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

// The ffmpeg command line that bakes the muffled copy of inPath into outPath. The output codec follows outPath's
// extension: .wav -> 16-bit PCM (no encoder delay, so it lines up sample for sample with any dry source; the choice
// for own music, whose dry resource is the user's file), anything else -> MP3 at ST_MUFFLE_BITRATE (the bundled cues,
// whose dry file is an MP3 from the same PCM and so carries the same encoder delay). 44.1 kHz stereo, metadata
// dropped, the output overwritten.
function stMuffleCommand(inPath, outPath) {
  const wav = /\.wav$/i.test(String(outPath));
  return ['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', sq(inPath), '-af', sq(ST_MUFFLE_FILTER), '-ar', '44100', '-ac', '2',
    ...(wav ? ['-c:a', 'pcm_s16le'] : ['-c:a', 'libmp3lame', '-b:a', ST_MUFFLE_BITRATE]), '-map_metadata', '-1', sq(outPath)].join(' ');
}
// st-muffle:end

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
var QS_VERSION = 1;
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
  var key = [QS_VERSION, fps, QS_W, QS_H, mtime, a.toFixed(3), b.toFixed(3)].join("-");
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

// st-panel:start
// Panel helpers without React: the panel test loads this block in node:vm next to the planner, graphics and muffle
// blocks, builds the run_script configs from fixtures and measures their payload.
const ST_AMBIENT_DB = -18;
// Intro level line (assemble.js introDuckDb): in a drop section the dry music under the title sits this far below the
// body, dips before the drop and comes back to full level just after it. Ordinary sections, own music without a drop,
// fixed timing and No music get none (stAssembleConfig sends 0).
const ST_INTRO_DUCK_DB = -7;
// Live probe P1: an overlaid video brings no separate audio clip and takes setClipAudio -60 dB, so grid panels are
// lowered in assemble ('volume'), never routed.
const ST_GRID_SOUND = 'volume';
// Live probe P2: an effect's useCurrentFrame() is 0 at the clip's first timeline frame whatever its source start.
const ST_TIME_ORIGIN = 'clip';
const ST_FILM_WINDOW = { w: 0.87, h: 0.84, radius: 0.02, feather: 0.012 };
const ST_LOOK_DEFAULT = 0.45;
// Video motion on montage video clips: 1 = a 1.00 -> 1.04 push-in across the clip.
const ST_VIDEO_MOTION_STRENGTH = 1;
const ST_LINE1_DEFAULT = 'that one trip in';
const ST_TOP_ITALIC_DEFAULT = 'VLOG';
const ST_CREDIT_PREFIX = 'By';
const ST_PLACE_PREFIX = 'in';
// Clips per scene-search call (12 roles + 2 signal queries each, 4 in flight, pages of ST_SEARCH_PAGE hits); search.js
// stops starting new searches after 22 s, and clips it could not search are retried by the next Build.
const ST_SEARCH_BATCH = 3;
const ST_SEARCH_PAGE = 6;
// Every scene search: the shot roles and the signal queries (planner ST_SIGNAL_QUERIES).
const ST_SEARCH_QUERIES = Object.assign({}, ST_QUERIES, ST_SIGNAL_QUERIES);
// Planning rate before this Project has produced a Draft; assemble.js lays every frame at the Draft's real rate.
const ST_GUESS_FPS = 30;
const ST_MOTION_OPTIONS = [
  { label: 'Push in', value: 'push-in' }, { label: 'Pull out', value: 'pull-out' },
  { label: 'Drift left', value: 'drift-left' }, { label: 'Drift right', value: 'drift-right' },
  { label: 'Drift up', value: 'drift-up' }, { label: 'Drift down', value: 'drift-down' },
  { label: 'Tilt', value: 'tilt' }, { label: 'Push and drift', value: 'push-drift' },
];

// inventory.js reports capture months as 12 counts (January first); stSeasonFor takes a list of month numbers.
function stMonthList(counts) {
  const out = [];
  (Array.isArray(counts) ? counts : []).forEach((c, i) => { for (let k = 0; k < (Number(c) || 0) && k < 10000; k++) out.push(i + 1); });
  return out;
}
function stInferSeason(inventory) { return stSeasonFor(stMonthList(inventory && inventory.months)); }

// Cover factor of a clip on the 16:9 canvas (fill / fit); 1 when the size is unknown.
function stCoverFor(size) {
  if (!(size && size.width > 0 && size.height > 0)) return 1;
  const fit = Math.min(ST_W / size.width, ST_H / size.height), fill = Math.max(ST_W / size.width, ST_H / size.height);
  return fill / fit;
}

// Own music as a cue for the section maths, from beat-detect.cjs's analysis (drop picked 'largest'). The drop carries
// its own grid (the tempo octave and a re-anchored first beat). A grid is usable when it is accepted, or when
// beat-detect.cjs calls it 'approximate' (tempo and first beat tight but the beat faint: the cuts follow that grid with
// low-confidence snapping; the drop, found on the same grid, still places the drop section). Null when the grid is not
// usable ('none', no analysis, or a tempo out of range: fixed timing).
function stOwnCue(g) {
  if (!g || !(g.accepted || g.grid === 'approximate') || !(g.bpm > 0) || !(g.durationSeconds > 0)) return null;
  const d = g.drop && g.drop.bpm > 0 && isFinite(g.drop.dropSeconds) ? g.drop : null;
  const bpm = d ? d.bpm : stOctave(g.bpm);
  if (!bpm) return null;
  const sameGrid = Math.abs(bpm - g.bpm) < 0.01;
  return {
    bpm,
    firstBeat: d && isFinite(d.firstBeat) ? d.firstBeat : g.firstBeat,
    dropSeconds: d ? d.dropSeconds : null,
    duration: g.durationSeconds,
    // Per-beat energy is only valid on the grid it was measured on.
    beatEnergy: sameGrid ? g.beatEnergy : null,
  };
}

// The timing source of a build. choice: a cue id, 'own' or 'none'; cue: its manifest entry; own: the own-music
// analysis ({ accepted: false, durationSeconds, peaks: [] } when only the length is known).
//   cue   — a bundled cue: its grid, never snapped;
//   own   — own music with an accepted grid (onset-snapped anchors), or with an approximate one (faint: true,
//           approximate: true): the detected tempo and first beat, bar-snapped sections, low-band snapping as for fixed;
//   fixed — own music without a usable grid: a fixed 0.5 s beat, low-band snapping, "approximate timing";
//   none  — No music: a fixed 0.5 s beat; missing: own music chosen but not read yet.
function stMusicFor(o) {
  const cue = o.cue, own = o.own;
  const cueBpm = cue ? stOctave(cue.bpm) : null;
  if (o.choice !== 'own' && o.choice !== 'none' && cue && cueBpm) {
    // The cue build already reports the octave near 120 BPM; stOctave keeps the section maths on the grid we cut to.
    const c = Object.assign({}, cue, { bpm: cueBpm });
    return { kind: 'cue', bpm: cueBpm, cue: c, duration: cue.duration, peaks: cue.peaks || [], titleHits: cue.titleHits || null,
      noDrop: stDropStart(c) === null, approximate: false };
  }
  if (o.choice === 'own') {
    if (!own || !(own.durationSeconds > 0)) return { kind: 'none', bpm: ST_FIXED_BPM, cue: null, duration: 0, peaks: [], missing: true, approximate: true };
    const oc = stOwnCue(own);
    const onsets = Array.isArray(own.onsets) ? own.onsets : [];
    const faint = !own.accepted;
    if (oc) return { kind: 'own', bpm: oc.bpm, cue: oc, duration: oc.duration, peaks: own.peaks || [], onsets, onsetThresholds: own.onsetThresholds,
      noDrop: oc.dropSeconds === null, faint, approximate: faint };
    return { kind: 'fixed', bpm: ST_FIXED_BPM, cue: { bpm: ST_FIXED_BPM, firstBeat: 0, duration: own.durationSeconds }, duration: own.durationSeconds,
      peaks: own.peaks || [], onsets, onsetThresholds: own.onsetThresholds, approximate: true };
  }
  return { kind: 'none', bpm: ST_FIXED_BPM, cue: null, duration: 0, peaks: [], approximate: true };
}

// Snaps a section start for N montage shots: bars (drop-aligned) for a cue or own music with a grid, 0.1 s steps for
// fixed timing. Returns { start, kind: 'drop' | 'section', moved } or null when nothing fits.
function stSnapSection(music, n, value) {
  if (music.kind === 'cue' || music.kind === 'own') return stClampSection({ cue: music.cue, montageShots: n, value });
  if (music.kind === 'fixed') {
    const latest = music.duration - ST_SECTION_END_MARGIN - stTotalSeconds(ST_FIXED_BPM, n);
    if (latest < -1e-9) return null;
    const v = typeof value === 'number' && isFinite(value) ? value : 0;
    const top = Math.floor(latest * 10 + 1e-6) / 10;
    return { start: Math.max(0, Math.min(top, Math.round(v * 10) / 10)), kind: 'section', moved: v > top + 1e-9 };
  }
  return { start: 0, kind: 'section', moved: false };
}
// Default section: the drop section (dropBeat - 8) for a cue or own music, clamped when it does not fit; fixed
// timing starts at 0.
function stDefaultStart(music, n) {
  if (music.kind === 'cue' || music.kind === 'own') return stDefaultSection(music.cue, n);
  const s = stSnapSection(music, n, 0);
  return s ? { start: s.start, kind: s.kind, clamped: false, note: null } : null;
}

// Candidates for videos without search results. An analysed video: one pseudo candidate (before a scene search the
// planner fills every window from fillers, so the readiness line can show the distinct-resource count, the fitted N
// and the reason Build is disabled; an estimate: a searched plan ranks real hits first, which can change the picks but
// not what fits). A video without analysis (hasAnalysis false): the planner's evenly spaced local candidates, every
// window starting ST_LOCAL_MIN_START s in (stFallbackCandidates). The Clip highlights template run uses this for the
// clips search.js skipped, so its unanalysed clips are usable without a quick score.
function stPseudoCandidates(resources) {
  const out = [];
  for (const r of (resources || []).filter(r => r && r.duration > 0)) {
    if (r.hasAnalysis === false) out.push(...stFallbackCandidates({ rid: r.rid, duration: r.duration }));
    else out.push({ rid: r.rid, role: 'filler', t: r.duration / 2, score: ST_FILLER_SCORE, sourceDuration: r.duration });
  }
  return out;
}

// Quick local score for the videos without analysis (quick-score block, kit tools/panel/quick-score.js): at most
// ST_QUICK_CONCURRENCY decodes at a time, all of them within ST_QUICK_BUDGET_MS (clips not scored by then get the
// evenly spaced fallback and are scored again by the next Build), cancelled with the build's AbortSignal.
const ST_QUICK_CONCURRENCY = 3;
const ST_QUICK_BUDGET_MS = 20000;
// quickScore's resources for inventory videos. Resource ids are per-Project aliases (r0, r1, ...) and the block caches
// one file per id in <dataDir>/quick-score/, so the id it sees is qualified with the Project (ASCII; the block keys the
// cache on that id, the file's modification time (statSync; 0 when the host has none) and the decoded span, which ends
// at the clip's length for clips up to 2 minutes, so a missing modification time falls back to id + length).
function stQuickId(projectId, rid) { return String(projectId || 'project').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 40) + '_' + rid; }
function stQuickResources(projectId, resources) {
  return (resources || []).filter(r => r && r.duration > 0).map(r => ({ rid: stQuickId(projectId, r.rid), path: r.path || null, durationSeconds: r.duration }));
}
// Planner candidates from quickScoreAll's results (Map quick id -> scores) through the block's pickWindowsLocal
// (`pick`). Returns { list, scored: [rid], rough: [rid] }: rough clips got the fallback (no ffmpeg, a failed decode,
// the budget ran out, or no result) and are retried by the next Build.
function stQuickCandidates(projectId, resources, results, pick) {
  const list = [], scored = [], rough = [];
  for (const r of (resources || []).filter(r => r && r.duration > 0)) {
    const sc = results && typeof results.get === 'function' ? results.get(stQuickId(projectId, r.rid)) : null;
    const c = stLocalCandidates({ rid: r.rid, duration: r.duration }, sc || null, pick);
    list.push(...c);
    if (c.length && c[0].local === 'score') scored.push(r.rid); else rough.push(r.rid);
  }
  return { list, scored, rough };
}

// stPlanBuild options for the current music and section.
function stPlanOptions(o) {
  const m = o.music;
  const opts = { candidates: o.candidates, bpm: m.bpm, fps: o.fps, montageShots: o.montageShots, seed: String(o.seed), sizes: o.sizes || {} };
  const more = {};
  if (m.kind !== 'none') more['sectionStart'] = o.section || 0;
  if (m.kind === 'cue') more['bundled'] = true;
  else if ((m.kind === 'own' || m.kind === 'fixed') && m.onsets && m.onsets.length) {
    more['onsets'] = m.onsets; more['onsetThresholds'] = m.onsetThresholds; more['lowConfidence'] = m.kind === 'fixed' || !!m.faint;
  }
  return Object.assign(opts, more);
}

// The planner's English sentences (disabledReason, notes, section notes; the panel's own section note last) as
// { id, vars } for the panel's "plan.<id>" keys; null for anything else.
const ST_PLAN_TEXT = [
  [/^Needs at least (\d+) different clips or photos \(found (\d+)\)$/, 'needDistinct', ['count', 'found']],
  [/^Needs one video clip at least ([\d.]+) s long for the opening$/, 'needOpener', ['seconds']],
  [/^Needs a second clip at least ([\d.]+) s long \(or a photo\) for the place shot$/, 'needPlace', ['seconds']],
  [/^Needs at least (\d+) different clips or photos long enough for the grid panels \(found (\d+)\)$/, 'needGrid', ['count', 'found']],
  [/^Your footage is too short for (\d+) montage shots$/, 'tooShort', ['count']],
  [/^Some shots reuse footage from the same moment of a clip$/, 'reuseMoments', []],
  [/^More than (\d+) photos play in a row \(not enough video\)$/, 'photoRun', ['count']],
  [/^Some photos are used twice$/, 'reusedPhotos', []],
  [/^The drop is too close to the start of the track; the title runs over the first two bars$/, 'dropTooEarly', []],
  [/^The drop section does not fit this length; moved to the latest start that fits$/, 'dropNoFit', []],
  [/^The section did not fit this length; moved to the latest start that fits$/, 'sectionMoved', []],
];
function stPlanText(text) {
  for (const [re, id, names] of ST_PLAN_TEXT) {
    const m = re.exec(String(text == null ? '' : text));
    if (m) { const vars = {}; names.forEach((n, i) => { vars[n] = Number(m[i + 1]); }); return { id, vars }; }
  }
  return null;
}

// Sound effect files: decoded from sfx/<file>.b64 into `dir` under their stable names (shutter-N.wav, whoosh-1.wav);
// ensure-audio.js imports each once per Project (plugin-owned files match Audio resources by path, then by file name).
function stSfxFiles(manifest, dir) {
  return Object.keys(manifest || {}).sort().map(key => ({ key, b64: 'sfx/' + manifest[key].file + '.b64', path: dir + '/' + manifest[key].file, seconds: manifest[key].duration }));
}
// File name of the muffled copy of the user's own music: <base>-muffled-<ST_MUFFLE_TAG>-<first 8 hex of the file's
// sha256>.wav. The name is the cache key (the data folder keeps one bake per file content and filter) and what
// ensure-audio.js dedupes on; ST_MUFFLE_TAG hashes the filter, so a filter change bakes and imports a new copy.
function stOwnMuffledName(fileName, hash8) {
  const base = String(fileName || 'music').split(/[\\/]/).pop().replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9._-]+/g, '-') || 'music';
  return base + '-muffled-' + ST_MUFFLE_TAG + '-' + hash8 + '.wav';
}
// assemble.js `sfx` from the imported ids: 1-4 shutter takes (with each take's file length) and the whoosh.
function stSfxConfig(manifest, ids) {
  const keys = Object.keys(manifest || {}).sort();
  const shutters = keys.filter(k => /^shutter/.test(k) && ids[k]);
  const whoosh = keys.find(k => /^whoosh/.test(k) && ids[k]) || null;
  if (!shutters.length && !whoosh) return null;
  return { shutter: shutters.map(k => ids[k]), shutterSeconds: shutters.map(k => manifest[k].duration),
    whoosh: whoosh ? ids[whoosh] : null, whooshSeconds: whoosh ? manifest[whoosh].duration : 0 };
}

// Draft name: "Summer Trip <place or season> HH:MM:SS" (seconds keep two builds in the same minute apart).
function stDraftName(place, season, date) {
  const d = date instanceof Date ? date : new Date();
  const two = n => String(n).padStart(2, '0');
  const what = String(place || '').trim() || String(season || '').trim() || ST_DEFAULT_SEASON;
  return 'Summer Trip ' + what + ' ' + two(d.getHours()) + ':' + two(d.getMinutes()) + ':' + two(d.getSeconds());
}

// Title text limits (README): line 1 up to 32 characters and 6 words, season up to 10, place up to 18 characters. Wide
// characters (Hangul, kana, CJK, fullwidth) count as 2 (kit i18n policy), so a Korean line holds about half as many.
const ST_LIMITS = { line1: { chars: 32, words: 6 }, season: { chars: 10, words: 0 }, place: { chars: 18, words: 0 } };
const ST_WIDE_RE = /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]/;
function stFieldLen(text) {
  let n = 0;
  for (const ch of String(text == null ? '' : text)) n += ST_WIDE_RE.test(ch) ? 2 : 1;
  return n;
}
// True when `text` holds a wide character (the limit hint then says they count as 2).
function stHasWide(text) { return ST_WIDE_RE.test(String(text == null ? '' : text)); }
// Cuts `value` to at most `maxChars` columns (stFieldLen) and, when maxWords > 0, before its (maxWords + 1)th word.
function stLimitText(value, maxChars, maxWords) {
  let v = String(value == null ? '' : value);
  if (maxWords > 0) {
    const re = /\S+/g;
    let m, n = 0;
    while ((m = re.exec(v))) { n++; if (n > maxWords) { v = v.slice(0, m.index).replace(/\s+$/, ''); break; } }
  }
  if (stFieldLen(v) <= maxChars) return v;
  let out = '', n = 0;
  for (const ch of v) {
    const w = ST_WIDE_RE.test(ch) ? 2 : 1;
    if (n + w > maxChars) break;
    out += ch; n += w;
  }
  return out;
}
// True when `value` sits at one of its limits (the panel then shows the limit under the field).
function stAtLimit(value, maxChars, maxWords) {
  const v = String(value == null ? '' : value);
  return stFieldLen(v) >= maxChars - (stHasWide(v) ? 1 : 0) || (maxWords > 0 && v.trim().split(/\s+/).filter(Boolean).length >= maxWords);
}

// A bundled cue's title hits (measured beats in its drop section) apply only when the section is the drop section;
// any other section types the title on the plain beat grid.
function stTitleHitsFor(music, sectionKind) {
  return music && music.kind === 'cue' && sectionKind === 'drop' && Array.isArray(music.titleHits) ? music.titleHits : null;
}

// What assemble.js would have returned for a Draft it saved without reporting back (a lost session after the commit),
// rebuilt from its config at the Draft's real rate: the same frame schedule (planner stFrameSchedule, leak as
// { a, b }), Main windows from the same slide-back rule, grid panels at their planned frames. decorate.js finds the
// clips by start frame, so no clip ids are needed. Frame sizes assemble measured on its scratch Draft are not known
// here; those clips are treated as 16:9 by decorate.js.
function stRecoverAssembly(cfg, fps, sequenceId) {
  const delta = cfg.music ? stMusicOffset(cfg.music.sectionStart, fps) : (cfg.beats.delta || 0);
  const pf = stFrameSchedule({ schedule: cfg.schedule, bpm: cfg.beats.bpm, delta, fps, snaps: cfg.beats.snaps || {} });
  const frames = Object.assign({}, pf, { leakFrames: { a: pf.leakFrames[0], b: pf.leakFrames[1] } });
  const tail = 0.15;
  const placed = cfg.picks.main.map((pick, i) => {
    const a = frames.mainFrames[i], b = frames.mainFrames[i + 1], want = b - a;
    let k = 0;
    if (pick.kind !== 'photo') {
      k = Math.round(Math.max(0, Number(pick.startSeconds) || 0) * fps);
      if (pick.duration > 0) {
        const last = Math.floor(pick.duration * fps) - Math.ceil(tail * fps) - want;
        if (k > last) k = Math.max(0, last);
      }
    }
    return { index: i, clipId: null, rid: pick.rid, kind: pick.kind, role: pick.role || null, a, b, sourceStart: k / fps };
  });
  const gridPlaced = (cfg.picks.grid || []).map((pick, j) => {
    const g = frames.grid.find(x => x.quad === pick.quad) || frames.grid[j];
    const ss = pick.kind === 'photo' ? 0 : Math.round(Math.max(0, Number(pick.startSeconds) || 0) * fps) / fps;
    return { quad: g.quad, clipId: null, rid: pick.rid, kind: pick.kind, a: g.aFrame, b: g.bFrame, sourceStart: ss };
  });
  const sizes = Object.assign({}, cfg.sizes || {});
  const unknown = cfg.picks.main.concat(cfg.picks.grid || []).filter(p => !(sizes[p.rid] && sizes[p.rid].width > 0 && sizes[p.rid].height > 0)).length;
  return { sequenceId, fps, frames, placed, gridPlaced, sizes, music: null, recovered: true,
    notes: unknown ? ['the size of ' + unknown + (unknown === 1 ? ' clip is' : ' clips are') + ' unknown, so ' + (unknown === 1 ? 'it' : 'they') + ' may be framed incorrectly (bars, or a misplaced film frame or grid mask)'] : [] };
}

// assemble.js config (contracts.md). `frames.snaps` from the plan, never the raw onset snaps; every video pick carries
// its source duration so assemble.js can slide a window back at the Draft's real rate. `sectionKind` is the section
// slider's kind at Build ('drop' | 'section'): only a drop section gets the intro level line.
function stAssembleConfig(o) {
  const plan = o.plan, f = plan.frames, durations = o.durations || {};
  const main = plan.picks.main.map(p => {
    const x = { rid: p.rid, kind: p.kind, startSeconds: p.startSeconds, role: p.role };
    return p.kind === 'video' && durations[p.rid] > 0 ? Object.assign(x, { duration: durations[p.rid] }) : x;
  });
  const grid = plan.picks.grid.map(p => ({ rid: p.rid, kind: p.kind, startSeconds: p.startSeconds, quad: p.quad }));
  return {
    projectId: o.projectId, draftName: o.draftName, fps: o.fps || null, W: ST_W, H: ST_H,
    beats: { bpm: f.bpm, delta: f.delta, snaps: f.snaps || {} },
    schedule: plan.schedule,
    picks: { main, grid },
    sizes: o.sizes || {},
    music: o.music || null,
    crossfadeFrames: null,
    clipSound: o.clipSound, ambientDb: ST_AMBIENT_DB,
    gridSound: ST_GRID_SOUND,
    sfx: o.sfx || null,
    introDuckDb: o.music && o.sectionKind === 'drop' ? ST_INTRO_DUCK_DB : 0,
  };
}

// decorate.js config (contracts.md) from assemble's result `a`: every frame and title time at the Draft's real rate.
// `inputs`: the title and look choices as they were at Build (creditPrefix / placePrefix default to "By" / "in"; lookOn
// false turns the grade off). `inputs.labels` (optional): Adjust labels in the UI language at Build, { graphic: { [key]:
// label }, effect: { look, grain, leak, motion, motionStrength, videoMotion }, motion: { [option value]: label } };
// anything missing stays English.
function stDecorateConfig(o) {
  const a = o.a, plan = o.plan, i = o.inputs, fps = a.fps, fr = a.frames;
  const bpm = plan.frames.bpm;
  const times = stTitleTimes(stTitleSchedule(i.line1, i.season, i.titleHits || null), bpm, fr.delta, fps);
  const creditPrefix = i.creditPrefix != null ? String(i.creditPrefix).trim() : ST_CREDIT_PREFIX;
  const placePrefix = i.placePrefix != null ? String(i.placePrefix).trim() : ST_PLACE_PREFIX;
  const common = { presets: o.presets, presetId: i.presetId, fontsB64: o.fontsB64, topMain: i.topMain, topItalic: i.topItalic, creditPrefix, creditName: i.creditName };
  const title = stTitleParameters(Object.assign({}, common, { line1: i.line1, season: i.season, wordTimes: times.wordTimes, seasonPartTime: times.seasonPartTime,
    seasonFullTime: times.seasonFullTime, seasonPartLength: times.seasonPartLength, labelsTime: times.labelsTime }));
  const span = fr.labelsFrames[fr.labelsFrames.length - 1];
  const labels = stLabelsParameters(Object.assign({}, common, { placePrefix, place: String(i.place || '').trim(), placeSeconds: (fr.placeFrames[1] - span[0]) / fps }));
  const sizes = a.sizes || {};
  const lb = i.labels || {};
  const motionOptions = lb.motion ? ST_MOTION_OPTIONS.map(m => ({ label: lb.motion[m.value] || m.label, value: m.value })) : ST_MOTION_OPTIONS;
  const byClipIndex = {};
  for (const k of Object.keys(plan.motions || {})) {
    const pick = plan.picks.main[Number(k)];
    byClipIndex[k] = Object.assign({}, plan.motions[k], { cover: stCoverFor(pick && sizes[pick.rid]) });
  }
  const photos = [];
  plan.picks.main.concat(plan.picks.grid).forEach(p => { if (p && p.kind === 'photo' && photos.indexOf(p.rid) < 0) photos.push(p.rid); });
  return {
    sequenceId: a.sequenceId, fps, frames: fr, placed: a.placed, gridPlaced: a.gridPlaced, sizes,
    mute: i.clipSound === 'off',
    gridSound: ST_GRID_SOUND,
    title: { tsx: o.tsx.title, parameters: title, editableParameters: stEditable(ST_TITLE_EDITABLE, title, lb.graphic) },
    labels: { tsx: o.tsx.labels, parameters: labels, editableParameters: stEditable(ST_LABELS_EDITABLE, labels, lb.graphic) },
    // Summer look off: gradeOff, strength 0 (decorate.js keeps a strength-0 look on the last montage clip for its leak).
    look: i.lookOn === false ? { tsx: o.tsx.look, strength: 0, leakStrength: 1, gradeOff: true } : { tsx: o.tsx.look, strength: i.lookStrength, leakStrength: 1 },
    gridPanel: { tsx: o.tsx.gridPanel },
    filmFrame: { tsx: o.tsx.filmFrame, window: ST_FILM_WINDOW, leakStrength: 1, timeOrigin: ST_TIME_ORIGIN },
    motion: { tsx: o.tsx.motion, strength: 1, options: motionOptions, byClipIndex },
    // Montage video clips: a slow push-in (Video motion, editable in Adjust).
    videoMotion: o.tsx.videoMotion ? { tsx: o.tsx.videoMotion, strength: ST_VIDEO_MOTION_STRENGTH } : null,
    endingMotion: plan.endingMotion || {},
    photos,
    ...(lb.effect ? { adjustLabels: lb.effect } : {}),
  };
}
// st-panel:end

// The data folder for the quick-score cache through the host's FileSystem (join + homedir: the OS separator, no shell;
// created when missing), else `fallback` (the folder locateRoots reported). Every __DI__ member is checked first.
function hostDataDir(fallback: string | null): string | null {
  try {
    const fs = (window.parent as any)?.__DI__?.FileSystem;
    if (fs && typeof fs.join === "function" && typeof fs.homedir === "function") {
      const dir = String(fs.join(fs.homedir(), ".selects", "plugin-data", PLUGIN_ID));
      if (typeof fs.mkdirSync === "function") fs.mkdirSync(dir, { recursive: true });
      return dir;
    }
  } catch { /* the fallback below */ }
  return fallback;
}
// Double quotes let $HOME and $SELECTS_USER_SKILLS_ROOT expand: use only for those constants. User paths go through
// sq() (the muffle block above), single-quoted.
function dq(value: string) { return '"' + String(value).replace(/(["\\`])/g, "\\$1") + '"'; }
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
// Apps started from Finder get a bare PATH, so shell steps also look in Homebrew.
const TOOL_PATH = 'export PATH="$PATH:/opt/homebrew/bin:/usr/local/bin"; ';
// Own music's beat detection runs beat-detect.cjs on Node.js. Selects puts no Node on the shell's PATH and a stock
// Mac has none, so runtime.sh fetches a pinned copy into ~/.selects/plugin-data/_runtime the first time (shared by
// every plugin) and prints its path. Later calls in this session reuse it.
let nodePath: string | null = null;
async function ensureNode(sdk: any): Promise<string> {
  if (nodePath) return nodePath;
  const r = await sdk.runShell({ summary: "Prepare Node.js (first run only)", command: TOOL_PATH + "sh " + dq(SKILLS_DIR + "/runtime.sh") + " node", timeoutMs: 290000, maxOutputBytes: 8000 });
  const found = String(r?.stdout || "").trim().split("\n").filter(Boolean).pop() || "";
  if (r?.isError || r?.exitCode !== 0 || !found.startsWith("/")) throw new Error(String(r?.stderr || "").trim().split("\n").pop() || "Could not prepare Node.js.");
  return (nodePath = found);
}
// Thrown when the Project changed while a build was running; its results are dropped silently.
const STALE = new Error("The Project changed during the build.");

// The photo rids a build uses: the selected photos (all when `onlyPhotos` is null), none while Use photos is off.
function selectedPhotoRidsOf(inventory: any, onlyPhotos: string[] | null, usePhotos: boolean): string[] {
  if (!usePhotos || !inventory) return [];
  return (inventory.photos || []).map((r: any) => r.rid as string).filter((rid: string) => !onlyPhotos || onlyPhotos.includes(rid));
}
function photoCandsOf(inventory: any, onlyPhotos: string[] | null, usePhotos: boolean) {
  return selectedPhotoRidsOf(inventory, onlyPhotos, usePhotos).map((rid) => ({ rid, kind: "photo" }));
}
// Known frame sizes of the Project's clips and photos (unknown ones are measured by assemble.js).
function sizesOf(inventory: any) {
  const out: Record<string, { width: number; height: number }> = {};
  for (const r of [...(inventory?.resources || []), ...(inventory?.photos || [])]) if (r.width > 0 && r.height > 0) out[r.rid] = { width: r.width, height: r.height };
  return out;
}
// A short orientation hint for the clip list (a "shape.<id>" key); nothing when the frame size is unknown.
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
const WAVE_HEIGHT = 56;

// Music section slider: waveform on a canvas with a draggable, bar-snapped window over the chosen section.
// While `audio` plays, a playhead follows its currentTime inside the window, redrawn on every animation frame.
// Footage facts for the readiness line, from inventory.js's counts. Nothing waits for Selects analysis: every imported
// video is usable (videos without analysis get local candidates). without: usable videos without analysis (a small
// note that analysed clips pick better); notReady: videos that cannot be used yet (no length or no file path yet, or
// analysed without a length); analysing: videos being analysed now (the panel re-reads the inventory until they are
// done, so a finished clip switches to scene search).
function stFootageCounts(inventory: any) {
  const s = inventory?.skipped || {};
  const without = s.withoutAnalysis != null ? Number(s.withoutAnalysis) || 0 : (inventory?.resources || []).filter((r: any) => r && r.hasAnalysis === false).length;
  return { without, notReady: (Number(s.unanalysed) || 0) + (Number(s.missing) || 0), analysing: Number(s.analysing) || 0 };
}
// The short facts at the end of the Ready line ("" for nothing to say).
function stFootageNotes(lang: Lang, c: any) {
  return [c.notReady ? t(lang, "clipsNotReady", { count: c.notReady }) : "", c.without ? t(lang, "betterWithAnalysis") : ""];
}

function SectionSlider({ peaks, total, section, videoSeconds, barSeconds, snap, onChange, disabled, audio, drop, lang }: {
  peaks: number[]; total: number; section: number | null; videoSeconds: number; barSeconds: number;
  snap: (v: number) => number | null; onChange: (v: number | null) => void; disabled: boolean; audio: HTMLAudioElement | null; drop: boolean; lang: Lang;
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
        aria-valuetext={section == null ? t(lang, "musicTooShort") : (drop ? t(lang, "dropAt", { seconds: Math.round(section * 10) / 10 }) : t(lang, "sectionAt", { seconds: Math.round(section * 10) / 10 }))} aria-disabled={disabled || undefined}
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

// Title preview: the finished title (all words, the full season word, top label and credit) laid out like
// assets/title-graphic.tsx on a 1920x1080 stage, scaled into a box of fixed height. The fonts are the preset's "ST ..."
// families, registered as normal/400 like the graphic registers them.
const PREVIEW_HEIGHT = 104;
// Font stack: the preset face, Latin fallbacks, then the role's Korean system face (presets.json koFamily).
function previewStack(family: string | undefined, ko: string | undefined) {
  const k = ko || "Apple SD Gothic Neo";
  return (family ? '"' + family + '", ' : "") + '"Helvetica Neue", Arial, "' + k + '", ' + (k === "AppleMyungjo" ? "serif" : "sans-serif");
}
function previewFaceFor(face: any, text: string) { return HANGUL_RE.test(text) ? { ...face, upper: false, lower: false, tracking: 0, scaleX: 1 } : face; }
let previewCtx: CanvasRenderingContext2D | null | false = null;
function previewFace(presets: any, preset: any, role: string, tracking?: number) {
  const r = (preset && preset.roles && preset.roles[role]) || {};
  const font = (presets && presets.fonts && presets.fonts[r.file]) || {};
  return {
    css: previewStack(font.family, font.koFamily),
    upper: r.case === "upper", lower: r.case === "lower",
    tracking: typeof tracking === "number" ? tracking : (r.tracking || 0), scaleX: r.scaleX > 0 ? r.scaleX : 1, fillWidth: r.fillWidth > 0 ? r.fillWidth : 0,
  };
}
function previewCased(text: string, face: any) { return face.upper ? text.toUpperCase() : face.lower ? text.toLowerCase() : text; }
function previewMeasure(text: string, face: any, px: number) {
  if (!text) return 0;
  if (previewCtx === null) { try { previewCtx = document.createElement("canvas").getContext("2d") || false; } catch { previewCtx = false; } }
  const n = [...text].length;
  // Before a canvas can measure: wide characters (Hangul, kana, CJK) 1 em, everything else 0.6 em.
  let w = 0;
  for (const ch of text) w += (WIDE_PREVIEW_RE.test(ch) ? 1 : 0.6) * px;
  if (previewCtx) { previewCtx.font = px + "px " + face.css; w = previewCtx.measureText(text).width; }
  return (w + face.tracking * px * n) * face.scaleX;
}
function previewCap(face: any) {
  if (!previewCtx) return 0.72;
  previewCtx.font = "100px " + face.css;
  const m = previewCtx.measureText("H");
  return m.actualBoundingBoxAscent > 0 ? m.actualBoundingBoxAscent / 100 : 0.72;
}
function previewFit(target: number, measured: number, box: number) { return measured > box ? (target * box) / measured : target; }

function TitlePreview({ presets, presetId, line1, season, topMain, topItalic, creditPrefix, creditName, fontsTick, lang }: {
  presets: any; presetId: string; line1: string; season: string; topMain: string; topItalic: string; creditPrefix: string; creditName: string; fontsTick: number; lang: Lang;
}) {
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
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
  const preset = stPreset(presets, presetId);
  const W = 1920, H = 1080, L = ST_TITLE_LAYOUT;
  const k = width > 0 ? Math.min(width / W, PREVIEW_HEIGHT / H) : PREVIEW_HEIGHT / H;
  const layout = React.useMemo(() => {
    if (!preset) return null;
    const topText = topMain + topItalic, creditText = creditPrefix + creditName;
    const fLine1 = previewFaceFor(previewFace(presets, preset, "line1"), line1), fSeason = previewFaceFor(previewFace(presets, preset, "season"), season);
    const fTop = previewFaceFor(previewFace(presets, preset, "label", L.labelTracking), topText), fTopI = previewFaceFor(previewFace(presets, preset, "labelItalic", L.labelTracking), topText);
    const fCredit = previewFaceFor(previewFace(presets, preset, "label", L.creditTracking), creditText), fCreditI = previewFaceFor(previewFace(presets, preset, "labelItalic", L.creditTracking), creditText);
    const box = W * (1 - 2 * L.marginPct / 100);
    const words = String(line1 || "").trim().split(/\s+/).filter(Boolean).join(" ");
    const l1 = previewCased(words, fLine1), s = previewCased(String(season || "").trim(), fSeason);
    const seasonBox = fSeason.fillWidth > 0 ? W * fSeason.fillWidth : box;
    const line1Px = previewFit(preset.title.line1Size, previewMeasure(l1, fLine1, preset.title.line1Size), box);
    let seasonPx = previewFit(preset.title.seasonSize, previewMeasure(s, fSeason, preset.title.seasonSize), seasonBox);
    const cap = previewCap(fSeason);
    // A Hangul season word is held to the Latin cap height (as assets/title-graphic.tsx does).
    if (HANGUL_RE.test(s) && previewCtx) {
      previewCtx.font = "100px " + fSeason.css;
      const m = previewCtx.measureText("\ud55c"), ink = (m.actualBoundingBoxAscent || 0) + (m.actualBoundingBoxDescent || 0);
      seasonPx *= ink > 0 ? Math.min(1, (cap * 100) / ink) : 0.8;
    } else if (HANGUL_RE.test(s)) seasonPx *= 0.8;
    if (fSeason.fillWidth > 0) seasonPx = Math.min(seasonPx, (0.55 * H) / cap);
    const seasonY = preset.title.seasonY;
    const line1Y = fSeason.fillWidth > 0 ? seasonY - ((seasonPx * cap) / 2 + L.stackGap + line1Px * 0.5) / H * 100 : preset.title.line1Y;
    const up = (s: string) => (HANGUL_RE.test(creditText) ? s : s.toUpperCase());
    const credit = { prefix: up(String(creditPrefix || "").trim()), name: up(String(creditName || "").trim()) };
    const topPx = previewFit(L.labelSize, previewMeasure(topMain + (topItalic ? " " : ""), fTop, L.labelSize) + previewMeasure(topItalic, fTopI, L.labelSize), box);
    const creditPx = previewFit(L.creditSize, previewMeasure(credit.prefix ? credit.prefix + " " : "", fCredit, L.creditSize) + previewMeasure(credit.name, fCreditI, L.creditSize), box);
    return { fLine1, fSeason, fTop, fTopI, fCredit, fCreditI, l1, s, line1Px, seasonPx, seasonY, line1Y, credit, topPx, creditPx };
  }, [presets, presetId, line1, season, topMain, topItalic, creditPrefix, creditName, fontsTick]);
  const shadowA = preset ? Math.max(0, Math.min(1, preset.shadow)) : 0;
  const shadow = shadowA > 0 ? "0 2px 22px rgba(0,0,0," + shadowA + ")" : "none";
  const lineBox = (y: number) => ({ position: "absolute", left: 0, right: 0, top: y + "%", height: 0, display: "flex", justifyContent: "center", alignItems: "center" }) as any;
  const text = (px: number, face: any, color: string, scale = true) => ({ fontFamily: face.css, fontSize: px, lineHeight: 1, letterSpacing: face.tracking + "em", color, whiteSpace: "pre", wordBreak: "keep-all",
    textShadow: shadow, transform: scale && face.scaleX !== 1 ? "scaleX(" + face.scaleX + ")" : undefined, fontStyle: "normal", fontWeight: 400 }) as any;
  return (
    <div ref={wrapRef} aria-label={t(lang, "titlePreview")} style={{ position: "relative", height: PREVIEW_HEIGHT, overflow: "hidden", borderRadius: 8, background: "#10181d" }}>
      {preset && layout ? (
        <div style={{ position: "absolute", width: W, height: H, left: Math.max(0, (width - W * k) / 2), top: (PREVIEW_HEIGHT - H * k) / 2, transform: "scale(" + k + ")", transformOrigin: "0 0",
          background: "linear-gradient(180deg, #6fa9c9 0%, #9cc6d6 45%, #d9b98a 70%, #b48a5c 100%)" }}>
          {layout.l1 ? <div style={lineBox(layout.line1Y)}><div style={text(layout.line1Px, layout.fLine1, preset.colors.line1)}>{layout.l1}</div></div> : null}
          {layout.s ? <div style={lineBox(layout.seasonY)}><div style={text(layout.seasonPx, layout.fSeason, preset.colors.season)}>{layout.s}</div></div> : null}
          {topMain || topItalic ? (
            <div style={lineBox(L.topY)}><div style={text(layout.topPx, layout.fTop, preset.colors.labels, false)}>
              {topMain}{topItalic ? " " : ""}<span style={{ fontFamily: layout.fTopI.css }}>{topItalic}</span></div></div>
          ) : null}
          {layout.credit.name ? (
            <div style={lineBox(L.creditY)}><div style={text(layout.creditPx, layout.fCredit, preset.colors.labels, false)}>
              {layout.credit.prefix ? layout.credit.prefix + " " : ""}<span style={{ fontFamily: layout.fCreditI.css }}>{layout.credit.name}</span></div></div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// The install folder (scripts, cues, fonts) and the data folder for temporary audio, created when missing. Shared by
// the panel and a template run.
async function locateRoots(sdk: any) {
  const where = await sdk.runShell({ summary: "Locate plugin folders", command: "mkdir -p " + dq(DATA_DIR) + " && printf '%s\\n%s' " + dq(SKILLS_DIR) + " " + dq(DATA_DIR), timeoutMs: 10000 });
  const [plugin, data] = String(where?.stdout || "").split("\n").map((x: string) => x.trim());
  if (!plugin || !data) throw uiError((l) => t(l, "foldersNotFound"));
  return { plugin, data };
}

// A template run (Clip highlights hands the footage over in `context.template`) builds out of sight; anything else is
// the panel.
export default function Panel(props: any) {
  return props?.context?.template ? <TemplateRun sdk={props.sdk} context={props.context} /> : <SummerTripPanel {...props} />;
}

function SummerTripPanel({ sdk, context, ui }: any) {
  // UI language, read on every render: Selects can switch languages while the panel is open.
  const L = uiLang(context);
  const projectId = context?.projectId ?? null;
  const projectRef = React.useRef(projectId);
  projectRef.current = projectId;
  const [roots, setRoots] = React.useState<{ plugin: string; data: string } | null>(null);
  const [assets, setAssets] = React.useState<any>(null);
  const [inventory, setInventory] = React.useState<any>(null);
  const [candidates, setCandidates] = React.useState<any>(null);
  // Title fields. The season follows the Project's capture months until edited (seasonEdit), and the top label
  // follows the season until edited (topMainEdit); null means "follow".
  const [line1, setLine1] = React.useState(ST_LINE1_DEFAULT);
  const [seasonEdit, setSeasonEdit] = React.useState<string | null>(null);
  const [place, setPlace] = React.useState("");
  const [creditName, setCreditName] = React.useState("");
  const [creditPrefix, setCreditPrefix] = React.useState(ST_CREDIT_PREFIX);
  const [placePrefix, setPlacePrefix] = React.useState(ST_PLACE_PREFIX);
  const [topMainEdit, setTopMainEdit] = React.useState<string | null>(null);
  const [topItalic, setTopItalic] = React.useState(ST_TOP_ITALIC_DEFAULT);
  const [preset, setPreset] = React.useState("summer");
  // Track: a cue id, "own" or "none" ("" until the manifest has loaded).
  const [cueId, setCueId] = React.useState("");
  const [ownMusic, setOwnMusic] = React.useState<{ path: string; name: string } | null>(null);
  const [ownGrid, setOwnGrid] = React.useState<any>(null);
  const [length, setLength] = React.useState<"short" | "standard" | "long">("standard");
  // Clip sound: the clips' own sound is off (muted), ambient (-18 dB under the music) or full (0 dB).
  const [clipSound, setClipSound] = React.useState<"off" | "ambient" | "full">("ambient");
  const [lookStrength, setLookStrength] = React.useState(ST_LOOK_DEFAULT);
  const [lookOn, setLookOn] = React.useState(true);
  const [sfxOn, setSfxOn] = React.useState(false);
  const [muffleOn, setMuffleOn] = React.useState(true);
  const [only, setOnly] = React.useState<string[] | null>(null);
  // Photos: on by default. `onlyPhotos` is the photo selection (null = all); `only` stays the video selection, so
  // choosing photos never invalidates the scene search.
  const [usePhotos, setUsePhotos] = React.useState(true);
  const [onlyPhotos, setOnlyPhotos] = React.useState<string[] | null>(null);
  const [section, setSection] = React.useState<number | null>(0);
  const [sectionNote, setSectionNote] = React.useState<string | null>(null);
  const [seed, setSeed] = React.useState(1);
  const [busy, setBusy] = React.useState(false);
  // Single-flight guard: state updates are async, so a ref blocks a second click in the same tick.
  const busyRef = React.useRef(false);
  const [step, setStep] = React.useState("");
  const [tools, setTools] = React.useState({ ffmpeg: true });
  const [fontsTick, setFontsTick] = React.useState(0);
  const fontCache = React.useRef<Record<string, Promise<string>>>({});
  const registered = React.useRef<Set<string>>(new Set());
  // The real Draft rate per Project, learnt from the last assemble; plans use it from then on.
  const fpsRef = React.useRef<Record<string, number>>({});
  // Build progress (bar + step list). `step` stays for the one-call spinner (own-music beat detection).
  const [progress, setProgress] = React.useState<any>(null);
  const progressRef = React.useRef<any>(null);
  // `detail` renders in the language of the moment (the bar follows a language switch mid-build).
  const advance = (id: string, fraction: number, detail?: (lang: Lang) => string) => {
    const p: any = { ...stProgress(id, fraction), detail };
    // Never backwards within a run.
    if (progressRef.current && p.value < progressRef.current.value) return;
    progressRef.current = p; setProgress(p);
  };
  // Status text renders in the current UI language: `say(lang)`.
  const [status, setStatus] = React.useState<{ tone: string; say: (lang: Lang) => string } | null>(null);
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
    if (r.isError || r.result == null) throw (r.output ? new Error(r.output) : uiError((l) => t(l, "stepFailed")));
    return r.result as any;
  };
  const shell = async (summary: string, command: string, timeoutMs = 60000) => {
    const r = await sdk.runShell({ summary, command, timeoutMs, maxOutputBytes: 48000 });
    if (r?.isError || (r?.exitCode != null && r.exitCode !== 0)) throw new Error(String(r?.stderr || "").trim() || summary + " failed");
    return String(r?.stdout || "");
  };
  const fontB64 = (plugin: string, file: string) => {
    if (!fontCache.current[file]) {
      fontCache.current[file] = readText(plugin, "assets/fonts/" + file)
        .then((t) => t.replace(/\s+/g, ""))
        .catch((e) => { delete fontCache.current[file]; throw e; });
    }
    return fontCache.current[file];
  };
  // Registers one "ST ..." family for the preview. Every family is a single face: normal/400 whatever presets.json
  // says (its style/weight are informational), exactly as the graphics declare them.
  async function registerFamily(plugin: string, family: string, file: string) {
    if (registered.current.has(family) || typeof FontFace === "undefined") return;
    const face = new FontFace(family, "url(data:font/woff2;base64," + (await fontB64(plugin, file)) + ")", { style: "normal", weight: "400" });
    await face.load();
    (document as any).fonts.add(face);
    registered.current.add(family);
  }
  const stopAt = (e: any) => {
    const at = progressRef.current;
    return (lang: Lang) => at
      ? t(lang, "stoppedAt", { step: at.current + 1, total: ST_BUILD_STEPS.length, name: t(lang, "step." + ST_BUILD_STEPS[at.current].id), detail: sayError(lang, e) })
      : sayError(lang, e);
  };
  const progressText = (lang: Lang, p: any) => {
    const vars = { step: p.current + 1, total: ST_BUILD_STEPS.length, name: t(lang, "step." + ST_BUILD_STEPS[p.current].id), percent: p.percent };
    return p.detail ? t(lang, "progressDetail", { ...vars, detail: p.detail(lang) }) : t(lang, "progress", vars);
  };
  const endRun = (pid: string) => {
    if (projectRef.current !== pid) return;
    busyRef.current = false; setBusy(false); setStep(""); setProgress(null); progressRef.current = null;
  };

  // The build's quick-score cancel switch: aborted on a Project switch and on unmount.
  const buildAbortRef = React.useRef<AbortController | null>(null);
  // Inventory bookkeeping: the inventory script, the last clip set seen, photo sizes measured earlier and a load in flight.
  const inventoryJsRef = React.useRef<string | null>(null);
  const invSigRef = React.useRef<string | null>(null);
  const photoSizesRef = React.useRef<Record<string, { width: number; height: number }>>({});
  const invLoadingRef = React.useRef<string | null>(null);
  const mountedRef = React.useRef(true);
  // The error of the last inventory read (rendered with sayError, so a translatable one follows the UI language).
  const [invError, setInvError] = React.useState<any>(null);
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
      // Each clip with its analysis state: a clip that finishes analysing drops its local candidates for scene search.
      const sig = inv.resources.map((r: any) => r.rid + (r.hasAnalysis === false ? "-" : "+")).sort().join(",") + "|" + [sk.unanalysed, sk.withoutAnalysis, sk.missing].map((x) => String(x ?? "")).join(",");
      // A changed clip set drops the cached scene search so a build never uses stale candidates.
      if (invSigRef.current !== sig) { if (invSigRef.current !== null) setCandidates(null); invSigRef.current = sig; }
      setInventory(inv); setInvError(null);
    } catch (e: any) {
      if (live()) setInvError(e || new Error("unknown error"));
    } finally {
      if (invLoadingRef.current === pid) invLoadingRef.current = null;
      if (mountedRef.current && projectRef.current === pid) setInvLoading(false);
    }
  }
  React.useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; if (buildAbortRef.current) buildAbortRef.current.abort(); }; }, []);

  // Mount and Project switch: reset per-Project state, resolve folders, read bundled assets, inventory the Project.
  React.useEffect(() => {
    // Drop everything tied to the previous Project so a build never mixes Projects (a running quick score stops).
    if (buildAbortRef.current) { buildAbortRef.current.abort(); buildAbortRef.current = null; }
    setCandidates(null); setResult(null); setStatus(null); setInventory(null); setInvError(null); setInvLoading(false);
    setOnly(null); setOnlyPhotos(null); setSeasonEdit(null); setTopMainEdit(null);
    invSigRef.current = null; photoSizesRef.current = {};
    busyRef.current = false; setBusy(false); setStep(""); setProgress(null); progressRef.current = null;
    if (!projectId) return;
    let alive = true;
    (async () => {
      try {
        const { plugin, data } = await locateRoots(sdk);
        if (!alive) return;
        setRoots({ plugin, data });
        // ffmpeg is only needed for previews and own music (own music also fetches Node.js on first use); bundled cues work without it.
        let have = "";
        try {
          const probe = await sdk.runShell({ summary: "Check music tools", command: TOOL_PATH + "command -v ffmpeg >/dev/null && echo ffmpeg", timeoutMs: 10000 });
          have = String(probe?.stdout || "");
        } catch { have = ""; }
        if (!alive) return;
        setTools({ ffmpeg: have.includes("ffmpeg") });
        const read = (rel: string) => readText(plugin, rel);
        const [manifest, presets, sfxManifest, inventoryJs, searchJs, ensureJs, assembleJs, decorateJs, titleTsx, labelsTsx, lookTsx, gridTsx, filmTsx, motionTsx, videoMotionTsx] = await Promise.all([
          read("assets/cues/manifest.json"), read("assets/fonts/presets.json"), read("sfx/manifest.json"), read("scripts/inventory.js"), read("scripts/search.js"),
          read("scripts/ensure-audio.js"), read("scripts/assemble.js"), read("scripts/decorate.js"), read("assets/title-graphic.tsx"), read("assets/labels-graphic.tsx"),
          read("assets/summer-look.tsx"), read("assets/grid-panel.tsx"), read("assets/film-frame.tsx"), read("assets/photo-motion.tsx"), read("assets/video-motion.tsx")]);
        // Development placeholder cues (dev-manifest.json, never shipped) only when the bundled manifest has none.
        let dev: any = null;
        try { dev = JSON.parse(await read("assets/cues/dev-manifest.json")); } catch { dev = null; }
        if (!alive) return;
        const bundled = (JSON.parse(manifest).cues || []).filter((c: any) => c && c.accepted !== false);
        const devCues = bundled.length || !dev ? [] : (dev.cues || []).filter((c: any) => c && c.accepted !== false).map((c: any) => ({ ...c, dev: true }));
        const cues = [...bundled, ...devCues];
        setAssets({ cues, presets: JSON.parse(presets), sfx: JSON.parse(sfxManifest),
          scripts: { inventoryJs, searchJs, ensureJs, assembleJs, decorateJs },
          tsx: { title: titleTsx, labels: labelsTsx, look: lookTsx, gridPanel: gridTsx, filmFrame: filmTsx, motion: motionTsx, videoMotion: videoMotionTsx } });
        setCueId((cur) => (cur && (cur === "own" || cur === "none" || cues.some((c: any) => c.id === cur)) ? cur : cues.length ? cues[0].id : "none"));
        inventoryJsRef.current = inventoryJs;
        setStep("checkingClips");
        await loadInventory(projectId, () => alive);
      } catch (e: any) {
        if (alive) setStatus({ tone: "error", say: (l) => t(l, "startFailed", { detail: sayError(l, e) }) });
      } finally { if (alive) setStep(""); }
    })();
    // Project switch or unmount stops a preview, including one still being prepared.
    return () => { alive = false; stopPreview(); };
  }, [projectId]);

  // Clips not ready yet (still importing: no length or file path), clips being analysed (a finished one switches to scene
  // search) or no footage at all: re-read the inventory every 10 s. Clips without analysis are already usable, so they
  // never make the panel wait. Coming back to the panel or Refresh also re-reads it. The effect re-arms on each new
  // inventory, and stops on unmount, Project switch and while busy. A Project with only photos has nothing to wait for,
  // so it does not poll (each read measures new photos).
  const foot = stFootageCounts(inventory);
  const needsPoll = !!inventory && (foot.notReady > 0 || foot.analysing > 0 || (inventory.resources.length === 0 && !inventory.photos?.length));
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

  // Preview fonts: every family of the chosen preset, registered once; the preview re-measures when one lands.
  React.useEffect(() => {
    if (!assets || !roots) return;
    const presets = assets.presets;
    const p = stPreset(presets, preset);
    for (const file of p ? p.fonts : []) {
      const family = presets.fonts[file]?.family;
      if (!family || registered.current.has(family)) continue;
      // A font that fails to load only makes the preview fall back; the build reads the files again.
      registerFamily(roots.plugin, family, file).then(() => { if (mountedRef.current) setFontsTick((n) => n + 1); }).catch(() => null);
    }
  }, [assets, roots, preset]);

  // Title texts. The inferred season comes from the whole Project's capture months (SUMMER when unknown or tied).
  const inferredSeason = stInferSeason(inventory);
  const season = seasonEdit ?? inferredSeason;
  const topMain = topMainEdit ?? season;

  // Music and timing.
  const cues: any[] = assets?.cues || [];
  const cue = cues.find((c: any) => c.id === cueId) || null;
  const choice = ownMusic || cueId === "own" ? "own" : cueId === "none" || !cue ? "none" : cueId;
  const music: any = stMusicFor({ choice, cue, own: ownGrid });
  const requested = ST_LENGTHS[length];
  const videoSeconds = stTotalSeconds(music.bpm, requested);
  const snapInfo = (value: number) => stSnapSection(music, requested, value);
  const snap = (value: number) => { const s = snapInfo(value); return s ? s.start : null; };
  const sectionInfo: any = music.kind === "none" ? null : section == null ? null : snapInfo(section);
  const start = music.kind === "none" ? 0 : sectionInfo ? sectionInfo.start : null;
  const musicKey = choice + "|" + (ownMusic?.path || "") + "|" + (ownGrid ? ownGrid.durationSeconds + ":" + ownGrid.bpm : "");
  // A new track (or its analysis) moves the section to its default: the drop section when it fits.
  React.useEffect(() => {
    const d: any = stDefaultStart(music, requested);
    setSection(d ? d.start : null);
    setSectionNote(d && d.note ? d.note : null);
  }, [assets, musicKey]);
  // A new length keeps the chosen start and only re-clamps it (spec 15.5); the note says when it had to move. A
  // section that fitted nothing before gets the track's default.
  const lengthRef = React.useRef(length);
  React.useEffect(() => {
    if (lengthRef.current === length) return;
    lengthRef.current = length;
    const c: any = section == null ? stDefaultStart(music, requested) : stSnapSection(music, requested, section);
    setSection(c ? c.start : null);
    setSectionNote(c && (c.moved || c.note) ? c.note || "The section did not fit this length; moved to the latest start that fits" : null);
  }, [length]);
  // A new track, section or length makes a running preview stale, so it stops.
  React.useEffect(() => { stopPreview(); }, [cueId, ownMusic?.path, section, length]);

  async function detectOwnMusic(file: { path: string; name: string }) {
    if (busyRef.current || !roots) return;
    busyRef.current = true;
    setOwnMusic(file); setOwnGrid(null); setBusy(true); setStep("listening");
    try {
      // The decoded PCM (up to ~32 MB) is only needed by beat-detect.cjs, so it is removed afterwards, keeping the exit
      // status. The result goes to a file (a long track's onsets come close to the 48 KB shell output cap); stdout says
      // ok. 'largest' reports the largest loudness step as the drop (own music, spec 7.3).
      if (!nodePath) setStep("preparing");
      const node = await ensureNode(sdk);
      setStep("listening");
      const pcm = roots.data + "/own-music.f32";
      const cmd = TOOL_PATH + "ffmpeg -nostdin -v error -y -t 360 -i " + sq(file.path) + " -ac 1 -ar 22050 -f f32le " + sq(pcm) + " && " + sq(node) + " " + sq(roots.plugin + "/beat-detect.cjs") + " " + sq(pcm) + " 22050 " + sq(roots.data + "/own-music.json") + " largest"
        + "; s=$?; rm -f " + sq(pcm) + "; exit $s";
      const r = await sdk.runShell({ summary: "Find the beat of " + file.name, command: cmd, timeoutMs: 120000, maxOutputBytes: 48000 });
      const done = JSON.parse(String(r.stdout || "").trim().split("\n").pop() || "{}");
      if (r.isError || r.exitCode !== 0 || done.error || !done.ok) throw (done.error || r.stderr ? new Error(done.error || r.stderr) : uiError((l) => t(l, "beatFailed")));
      const g = JSON.parse(await readText(roots.data, "own-music.json"));
      setOwnGrid(g);
      const m: any = stMusicFor({ choice: "own", cue: null, own: g });
      setStatus(m.kind === "fixed" ? { tone: "info", say: (l) => t(l, "musicApprox") }
        : m.faint ? { tone: "info", say: (l) => faintText(l, m) }
        : m.noDrop ? { tone: "info", say: (l) => t(l, "noDrop") } : null);
    } catch (e: any) {
      // Without a grid the cuts use fixed timing, but the track's real length still bounds the section.
      let duration: number | null = null;
      try {
        const pr = await sdk.runShell({ summary: "Read the length of " + file.name, command: TOOL_PATH + "ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 " + sq(file.path), timeoutMs: 20000 });
        const v = parseFloat(String(pr?.stdout || "").trim());
        if (!pr?.isError && v > 0) duration = Math.min(v, 360);
      } catch { duration = null; }
      setOwnGrid(duration ? { accepted: false, durationSeconds: duration, peaks: [] } : null);
      setStatus(duration
        ? { tone: "info", say: (l) => t(l, "musicApproxDetail", { detail: sayError(l, e) }) }
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
    if ((!ownMusic && !cue) || !roots || start == null) return;
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
      if (r?.isError || (r?.exitCode != null && r.exitCode !== 0)) throw (r?.stderr ? new Error(r.stderr) : uiError((l) => t(l, "previewNotCut")));
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

  // Scene search over analysed clips. ST_SEARCH_BATCH clips per call keeps each call inside run_script's fixed 30 s
  // deadline; `onDone(n)` after each call.
  async function findCandidates(rids: string[], pid: string, check: () => void, onDone: (n: number) => void) {
    const list: any[] = []; const failed: string[] = [];
    for (let i = 0; i < rids.length; i += ST_SEARCH_BATCH) {
      const batch = rids.slice(i, i + ST_SEARCH_BATCH);
      const r = await run("Search travel shots", fill(assets.scripts.searchJs, { projectId: pid, rids: batch, queries: ST_SEARCH_QUERIES, pageSize: ST_SEARCH_PAGE }));
      check();
      list.push(...r.candidates); failed.push(...r.failed);
      onDone(batch.length);
    }
    return { list, failed };
  }

  // Local candidates for clips without analysis: the quick-score block (host ffmpeg through __DI__.Runtime.runFFmpeg
  // with an argument array, no shell; its cache in <data>/quick-score/) at ST_QUICK_CONCURRENCY at a time within
  // ST_QUICK_BUDGET_MS, then stQuickCandidates. `onDone()` after each clip. Throws only when `signal` aborts.
  async function scoreLocal(res: any[], pid: string, signal: AbortSignal | undefined, onDone: () => void) {
    if (!res.length) return { list: [] as any[], scored: [] as string[], rough: [] as string[] };
    const results = await quickScoreAll(stQuickResources(pid, res), { concurrency: ST_QUICK_CONCURRENCY, budgetMs: ST_QUICK_BUDGET_MS, signal,
      dataDir: hostDataDir(roots ? roots.data : null), onProgress: () => onDone() });
    return stQuickCandidates(pid, res, results, pickWindowsLocal);
  }

  // The muffled copy of the user's own music: baked once as .wav into the data folder (the file name, from the music's
  // hash, is the cache key), then imported once per Project by ensure-audio.js (matched by path or file name; the
  // user's own music itself matches by path only). A partial bake is
  // written under a temporary name and renamed, so a failed run never leaves a truncated copy behind.
  async function bakeOwnMuffle(path: string, name: string, check: () => void) {
    const hash = (await shell("Read your music", TOOL_PATH + "shasum -a 256 < " + sq(path) + " | cut -c1-8", 60000)).trim();
    check();
    if (!/^[0-9a-f]{8}$/.test(hash)) throw uiError((l) => t(l, "musicNotRead"));
    const out = roots!.data + "/" + stOwnMuffledName(name, hash), part = out + ".part.wav";
    await shell("Muffle the ending of your music", TOOL_PATH + "[ -s " + sq(out) + " ] || { " + stMuffleCommand(path, part) + " && mv -f " + sq(part) + " " + sq(out) + "; }; rm -f " + sq(part) + "; test -s " + sq(out), 180000);
    check();
    return out;
  }

  // Sound effect wavs decoded from the bundled base64 into the data folder (skipped when already there).
  async function decodeSfx(check: () => void) {
    const dir = roots!.data + "/sfx";
    const files = stSfxFiles(assets.sfx, dir);
    const cmd = TOOL_PATH + "mkdir -p " + sq(dir) + " && " + files.map((f: any) => {
      const src = sq(roots!.plugin + "/" + f.b64), out = sq(f.path);
      return "{ [ -s " + out + " ] || base64 -d < " + src + " > " + out + " 2>/dev/null || base64 -D < " + src + " > " + out + "; } && test -s " + out;
    }).join(" && ");
    await shell("Prepare sound effects", cmd, 30000);
    check();
    return files;
  }

  async function build(nextSeed: number) {
    if (busyRef.current || !assets || !inventory || !roots) return;
    if (music.missing) { setStatus({ tone: "error", say: (l) => t(l, "dropMusic") }); return; }
    if (music.kind !== "none" && start == null) { setStatus({ tone: "error", say: (l) => t(l, "musicTooShortPick") }); return; }
    const pid = projectId;
    const check = () => { if (projectRef.current !== pid) throw STALE; };
    // The title and look inputs as they are at Build (Adjust labels in the UI language of this moment); a later "Finish
    // title and look" retry reuses them.
    const inputs = { labels: inspectorLabels(L), presetId: preset, line1, season, topMain, topItalic, creditPrefix, creditName, placePrefix, place, lookOn, lookStrength, clipSound,
      titleHits: stTitleHitsFor(music, sectionInfo ? sectionInfo.kind : null) };
    const musicAt = { music, start: start ?? 0, sectionKind: sectionInfo ? sectionInfo.kind : null, muffle: muffleOn && music.kind !== "none", sfx: sfxOn, ownPath: ownMusic?.path || null, ownName: ownMusic?.name || null };
    busyRef.current = true;
    stopPreview();
    setBusy(true); setStatus(null); setResult(null);
    progressRef.current = null;
    advance("shots", 0);
    try {
      const key = pid + "|" + JSON.stringify(only);
      const chosen: any[] = inventory.resources.filter((r: any) => !only || only.includes(r.rid));
      const rids: string[] = chosen.map((r: any) => r.rid);
      const dur: Record<string, number> = Object.fromEntries(inventory.resources.map((r: any) => [r.rid, r.duration]));
      const cached = candidates && candidates.key === key ? candidates : null;
      let found = cached;
      if (!cached || cached.failed.length || (cached.rough || []).length) {
        // Analysed clips: scene search. Clips without analysis: the quick local score. Both run at once, counted together
        // ("Checking clips N/M"). The first time covers every clip; afterwards only the clips whose search failed or
        // that got the evenly spaced fallback (no ffmpeg, the budget ran out) are tried again.
        const todo: string[] = cached ? cached.failed : chosen.filter((r: any) => r.hasAnalysis !== false).map((r: any) => r.rid);
        const todoLocal: any[] = chosen.filter((r: any) => r.hasAnalysis === false && (!cached || (cached.rough || []).includes(r.rid)));
        const total = todo.length + todoLocal.length;
        let done = 0;
        const tick = (n: number) => { done += n; const d = done; advance("shots", 0.9 * d / Math.max(1, total), (l) => t(l, "checkingClipsCount", { done: d, count: total })); };
        tick(0);
        // Cancelled by a Project switch or unmount (the quick score's ffmpeg runs stop); a failed search stops it too.
        const abort = typeof AbortController === "undefined" ? null : new AbortController();
        buildAbortRef.current = abort;
        let fresh: any, local: any;
        try {
          [fresh, local] = await Promise.all([findCandidates(todo, pid, check, tick), scoreLocal(todoLocal, pid, abort ? abort.signal : undefined, () => tick(1))]);
        } catch (e: any) {
          if (abort) abort.abort();
          check();
          throw e;
        } finally { if (buildAbortRef.current === abort) buildAbortRef.current = null; }
        check();
        const retried = new Set([...todo, ...todoLocal.map((r: any) => r.rid)]);
        found = { key, failed: fresh.failed, rough: local.rough,
          list: [...(cached ? cached.list.filter((c: any) => !retried.has(c.rid)) : []), ...fresh.list.map((c: any) => ({ ...c, sourceDuration: dur[c.rid] || 0 })), ...local.list] };
        setCandidates(found);
      }
      // Clips whose search failed still take part through their filler windows.
      const searched = new Set(found.list.map((c: any) => c.rid));
      const unsearched = stPseudoCandidates(inventory.resources.filter((r: any) => rids.includes(r.rid) && !searched.has(r.rid)));
      const sizes = sizesOf(inventory);
      // Plan at the Project's known Draft rate (a guess before its first Draft); assemble.js lays the windows and every
      // event at the real rate, and decorate uses assemble's frames.
      const planFps = fpsRef.current[pid!] || ST_GUESS_FPS;
      const plan: any = stPlanBuild(stPlanOptions({ music: musicAt.music, section: musicAt.start, candidates: found.list.concat(unsearched, photoCandsOf(inventory, onlyPhotos, usePhotos)),
        fps: planFps, montageShots: requested, seed: nextSeed, sizes }));
      if (!plan.ok) {
        const reason = plan.disabledReason, failed = found.failed.length;
        throw uiError((l) => (failed ? t(l, "retryUnchecked", { reason: sayPlan(l, reason), count: failed }) : sayPlan(l, reason)));
      }
      advance("shots", 1);

      // Music: the dry track, its muffled copy for the ending (bundled, or baked from own music), sound effects.
      advance("music", 0);
      // Notes made here render in the UI language (closures); script notes stay English.
      const notes: (string | ((lang: Lang) => string))[] = [];
      const m: any = musicAt.music;
      const files: { key: string; path: string; matchByName?: boolean }[] = [];
      if (m.kind !== "none") {
        const dry = m.kind === "cue" ? roots.plugin + "/assets/cues/" + m.cue.file : musicAt.ownPath!;
        // The user's own file matches an existing resource by path only; bundled and baked files also by name.
        files.push(m.kind === "cue" ? { key: "dry", path: dry } : { key: "dry", path: dry, matchByName: false });
        if (musicAt.muffle) {
          if (m.kind === "cue") { if (m.cue.muffledFile) files.push({ key: "wet", path: roots.plugin + "/assets/cues/" + m.cue.muffledFile }); else notes.push((l) => t(l, "muffleNoCopy")); }
          else {
            try { files.push({ key: "wet", path: await bakeOwnMuffle(dry, musicAt.ownName || "music", check) }); }
            catch (e: any) { if (e === STALE) throw e; notes.push((l) => t(l, "muffleSkipped", { detail: sayError(l, e) })); }
          }
        }
      }
      advance("music", 0.4);
      let sfxFiles: any[] = [];
      if (musicAt.sfx) {
        try { sfxFiles = await decodeSfx(check); files.push(...sfxFiles.map((f: any) => ({ key: f.key, path: f.path }))); }
        catch (e: any) { if (e === STALE) throw e; notes.push((l) => t(l, "sfxSkipped", { detail: sayError(l, e) })); }
      }
      advance("music", 0.6);
      const audio = files.length ? await run("Add music to the project", fill(assets.scripts.ensureJs, { projectId: pid, files }), true) : { ids: {}, missing: [] };
      check();
      if (m.kind !== "none" && !audio.ids.dry) throw uiError((l) => t(l, "musicNotAdded"));
      if (files.some((f) => f.key === "wet") && !audio.ids.wet) notes.push((l) => t(l, "muffleNotImported"));
      const sfx = musicAt.sfx ? stSfxConfig(assets.sfx, audio.ids) : null;
      if (musicAt.sfx && sfxFiles.length && !sfx) notes.push((l) => t(l, "sfxNotImported"));
      advance("music", 1);

      advance("draft", 0);
      const draftName = stDraftName(inputs.place, inputs.season, new Date());
      const cfg = stAssembleConfig({ projectId: pid, draftName, fps: planFps, plan, sizes, durations: dur,
        music: m.kind === "none" ? null : { resourceId: audio.ids.dry, sectionStart: musicAt.start, wetResourceId: musicAt.muffle && audio.ids.wet ? audio.ids.wet : null },
        clipSound: inputs.clipSound, sfx, sectionKind: musicAt.sectionKind });
      // The Project's Drafts before assemble: if its reply is lost, the new Draft is the one id that was not there.
      let draftsBefore: string[] | null = null;
      try {
        const lb = await run("List Drafts", "const r = await selects.project(" + JSON.stringify(pid) + ").readFootage();\n"
          + "return { ids: (r.drafts || []).map(d => d.sequenceId) };");
        draftsBefore = Array.isArray(lb?.ids) ? lb.ids : null;
      } catch (e: any) { if (e === STALE) throw e; draftsBefore = null; }
      check();
      let a: any;
      try { a = await run("Assemble Summer Trip", fill(assets.scripts.assembleJs, cfg), true); }
      catch (e: any) {
        check();
        // Never resend a committing call: look for the Draft first, by comparing the Draft ids with the list above.
        let newIds: string[] = [], foundFps = 0;
        try {
          const f = await run("Check for the new Draft", "const r = await selects.project(" + JSON.stringify(pid) + ").readFootage();\n"
            + "const before = " + JSON.stringify(draftsBefore) + ";\n"
            + "const name = " + JSON.stringify(draftName) + ";\n"
            + "const found = (r.drafts || []).filter(d => (!before || before.indexOf(d.sequenceId) < 0) && d.name === name).map(d => d.sequenceId);\n"
            + "let fps = null;\n"
            + "if (found.length === 1) { try { fps = (await selects.draft(found[0]).meta()).fps; } catch (x) { fps = null; } }\n"
            + "return { found, fps };");
          newIds = Array.isArray(f?.found) ? f.found : [];
          foundFps = f?.fps > 0 ? f.fps : 0;
        } catch { newIds = []; }
        check();
        if (newIds.length === 1 && foundFps > 0) {
          // Saved but unconfirmed: rebuild assemble's result from its config so Finish title and look can add the rest.
          fpsRef.current[pid!] = foundFps;
          const ra: any = stRecoverAssembly(cfg, foundFps, newIds[0]);
          setResult({ sequenceId: newIds[0], decorated: false, a: ra, plan, inputs, seed: nextSeed, notes: [...notes, ...ra.notes], link: null,
            shortened: plan.shrunk ? { shots: plan.montageShots, seconds: ra.frames.endFrame / foundFps, fullSeconds: stTotalSeconds(m.bpm, requested) } : null,
            unchecked: found.failed.length, approximate: m.approximate, recovered: true });
          setStatus({ tone: "error", say: (l) => t(l, "draftUnconfirmedFinish", { name: draftName, detail: sayError(l, e) }) });
          return;
        }
        // "Never resend a committing call": a lost reply with no new Draft says Nothing was saved (nothingSaved).
        const saved = newIds.length > 0;
        throw uiError((l) => (saved ? t(l, "draftUnconfirmed", { name: draftName, detail: sayError(l, e) }) : t(l, "nothingSaved", { detail: sayError(l, e) })));
      }
      check();
      if (!a.sequenceId) throw uiError((l) => t(l, "draftNoId", { name: draftName }));
      if (a.fps > 0) fpsRef.current[pid!] = a.fps;
      advance("draft", 1);
      const allNotes = [...notes, ...(a.notes || [])];
      if (a.music && a.music.muffle === "skipped") allNotes.push((l: Lang) => t(l, "muffleSkippedPlain"));
      const shortened = plan.shrunk ? { shots: plan.montageShots, seconds: a.frames.endFrame / a.fps, fullSeconds: stTotalSeconds(m.bpm, requested) } : null;
      const res = { sequenceId: a.sequenceId, decorated: false, a, plan, inputs, seed: nextSeed, notes: allNotes, link: null, shortened, unchecked: found.failed.length, approximate: m.approximate };
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
    const check = () => { if (projectRef.current !== pid) throw STALE; };
    busyRef.current = true; stopPreview(); setBusy(true); setStatus(null);
    progressRef.current = null;
    try { await decorate(result, check); }
    catch (e: any) { if (e !== STALE && projectRef.current === pid) setStatus({ tone: "error", say: stopAt(e) }); }
    finally { endRun(pid); }
  }

  // Commit 2 (clip sound Off, title, labels, look, grid masks, film frame, photo motion), then open the Draft.
  // decorate.js skips what an earlier attempt already added, so a retry runs only this step.
  async function decorate(res: any, check: () => void) {
    advance("look", 0);
    try {
      const presets = assets.presets;
      const files = stPresetFontFiles(presets, res.inputs.presetId);
      const fontsB64: Record<string, string> = {};
      for (const f of files) fontsB64[f] = await fontB64(roots!.plugin, f);
      check();
      advance("look", 0.2);
      const cfg = stDecorateConfig({ a: res.a, plan: res.plan, inputs: res.inputs, presets, fontsB64, tsx: assets.tsx });
      await run("Add title and look", fill(assets.scripts.decorateJs, cfg), true);
    } catch (e: any) {
      if (e === STALE) throw e;
      throw uiError((l) => t(l, "finishFailed", { detail: sayError(l, e) }));
    }
    check();
    // The title is saved from here on, so a failed open must not offer the retry.
    setResult((r: any) => (r && r.sequenceId === res.sequenceId ? { ...r, decorated: true } : r));
    advance("open", 0);
    try {
      const o = await run("Open the new Draft", "const id = " + JSON.stringify(res.sequenceId) + ";\n"
        + "let link = null, openError = null;\n"
        + "try { link = (await selects.editor.linkToDraftFrame(id, 0)).deepLinkUrl; } catch (e) { link = null; }\n"
        + "try { await selects.editor.openDraft(id); } catch (e) { openError = String((e && e.message) || e); }\n"
        + "return { link, openError };");
      check();
      setResult((r: any) => (r && r.sequenceId === res.sequenceId ? { ...r, link: o.link || null } : r));
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

  // Readiness plan: the searched candidates once a build has searched this selection, otherwise one filler window set
  // per clip. It gives the distinct-resource count, the fitted montage length and the reason Build is disabled.
  const candKey = projectId + "|" + JSON.stringify(only);
  const readyPlan: any = React.useMemo<any>(() => {
    if (!inventory || (music.kind !== "none" && start == null) || music.missing) return null;
    const vids = inventory.resources.filter((r: any) => !only || only.includes(r.rid));
    const searched = candidates && candidates.key === candKey ? candidates.list : [];
    const seen = new Set(searched.map((c: any) => c.rid));
    const cands = searched.concat(stPseudoCandidates(vids.filter((r: any) => !seen.has(r.rid))), photoCandsOf(inventory, onlyPhotos, usePhotos));
    try {
      return stPlanBuild(stPlanOptions({ music, section: start ?? 0, candidates: cands, fps: fpsRef.current[projectId] || ST_GUESS_FPS, montageShots: requested, seed, sizes: sizesOf(inventory) }));
    } catch (e: any) { return { ok: false, disabledReason: String(e?.message || e) }; }
  }, [inventory, candidates, candKey, only, onlyPhotos, usePhotos, musicKey, start, requested, seed, projectId]);
  const clipCount = [
    allRids.length ? (only ? t(L, "clipsSelected", { selected: selectedRids.length, count: allRids.length }) : t(L, "clips", { count: allRids.length })) : "",
    usePhotos && allPhotoRids.length ? (onlyPhotos ? t(L, "photosSelected", { selected: selectedPhotoRids.length, count: allPhotoRids.length }) : t(L, "photos", { count: allPhotoRids.length })) : "",
  ].filter(Boolean).join(" · ");
  const readiness = !inventory ? (invError ? t(L, "readFailed", { detail: sayError(L, invError) }) : t(L, "checkingClipsNow"))
    : inventory.resources.length === 0 && !allPhotoRids.length ? (foot.notReady ? t(L, "clipsNotReadyWait", { count: foot.notReady }) : t(L, "noFootage"))
    : selectedRids.length === 0 && usedPhotoCount === 0 ? t(L, "noClipsSelected")
    : t(L, "ready", { summary: [clipCount || t(L, "clips", { count: 0 }), t(L, "aboutSeconds", { seconds: Math.round(readyPlan && readyPlan.ok ? readyPlan.seconds : videoSeconds) }),
      ...stFootageNotes(L, foot)].filter(Boolean).join(" · ") });
  const fitLine = readyPlan && readyPlan.ok ? (readyPlan.shrunk
    ? t(L, "fitShrunk", { distinct: readyPlan.distinct, count: readyPlan.montageShots, seconds: Math.round(readyPlan.seconds) })
    : t(L, "fitDistinct", { count: readyPlan.distinct })) : null;
  const blocked = !inventory ? null : music.missing ? t(L, "dropMusic")
    : music.kind !== "none" && start == null ? t(L, "musicTooShortPick")
    : readyPlan && !readyPlan.ok ? sayPlan(L, readyPlan.disabledReason) : null;
  const canBuild = !!inventory && !!assets && !!readyPlan && !!readyPlan.ok && !blocked;
  const timingNote = music.kind === "none" ? t(L, "noMusicTiming")
    : music.kind === "fixed" ? t(L, "fixedTiming")
    : music.kind === "own" && music.faint ? faintText(L, music)
    : music.kind === "own" && music.noDrop ? t(L, "noDrop") : null;
  const presetsData = assets?.presets || null;
  const cueOptions = [
    ...cues.map((c: any) => ({ label: c.dev ? t(L, "devPlaceholder", { title: c.title }) : c.title, value: c.id as string })),
    ...(tools.ffmpeg ? [{ label: t(L, "ownMusic"), value: "own" }] : []),
    { label: t(L, "noMusic"), value: "none" },
  ];
  const canOwnMusic = tools.ffmpeg;
  const silent = music.kind === "none" && clipSound === "off";
  const isDrop = !!(sectionInfo && sectionInfo.kind === "drop");
  const stepText = step === "checkingClips" ? t(L, "checkingClips") : step === "preparing" ? t(L, "preparingTools") : step === "listening" ? t(L, "listening") : "";
  // A field's limit hint; with wide characters typed it adds that they count as 2.
  const limitHint = (text: string, value: string) => text + (stHasWide(value) ? t(L, "gap") + t(L, "wideCounts") : "");

  if (!projectId) return <ui.Message tone="error">{t(L, "openProject")}</ui.Message>;

  return (
    <ui.Stack gap={16}>
      <ui.Row gap={8} align="center">
        <ui.Message tone={!inventory && invError ? "error" : "muted"}>{readiness}</ui.Message>
        <ui.Button variant="ghost" busy={invLoading} busyLabel={t(L, "refreshing")} disabled={busy || !assets} onClick={() => loadInventory()}>{t(L, "refresh")}</ui.Button>
      </ui.Row>
      {fitLine ? <ui.Message tone="muted">{fitLine}</ui.Message> : null}
      {inventory && invError ? <ui.Message tone="error">{t(L, "refreshFailed", { detail: sayError(L, invError) })}</ui.Message> : null}
      <ui.Section title={t(L, "title")}>
        <ui.TextField label={t(L, "line1")} value={line1} onChange={(v: string) => setLine1(stLimitText(v, ST_LIMITS.line1.chars, ST_LIMITS.line1.words))} disabled={busy} />
        {stAtLimit(line1, ST_LIMITS.line1.chars, ST_LIMITS.line1.words) ? <small style={{ color: "var(--panel-muted-fg)", wordBreak: "keep-all" }}>{limitHint(t(L, "line1Limit", { chars: ST_LIMITS.line1.chars, words: ST_LIMITS.line1.words }), line1)}</small> : null}
        <ui.TextField label={t(L, "season")} value={season} onChange={(v: string) => setSeasonEdit(stLimitText(v, ST_LIMITS.season.chars, 0))} disabled={busy} />
        {stAtLimit(season, ST_LIMITS.season.chars, 0) ? <small style={{ color: "var(--panel-muted-fg)", wordBreak: "keep-all" }}>{limitHint(t(L, "seasonLimit", { chars: ST_LIMITS.season.chars }), season)}</small> : null}
        {seasonEdit !== null && seasonEdit !== inferredSeason ? (
          <button type="button" onClick={() => setSeasonEdit(null)} disabled={busy}
            style={{ alignSelf: "flex-start", background: "none", border: "none", padding: 0, color: "var(--panel-accent, #f6c343)", cursor: busy ? "default" : "pointer", fontSize: 12, textDecoration: "underline" }}>
            {t(L, "resetTo", { season: inferredSeason })}
          </button>
        ) : null}
        <ui.TextField label={t(L, "place")} value={place} onChange={(v: string) => setPlace(stLimitText(v, ST_LIMITS.place.chars, 0))} placeholder={t(L, "placeOptional")} disabled={busy} />
        {stAtLimit(place, ST_LIMITS.place.chars, 0) ? <small style={{ color: "var(--panel-muted-fg)", wordBreak: "keep-all" }}>{limitHint(t(L, "placeLimit", { chars: ST_LIMITS.place.chars }), place)}</small> : null}
        <ui.TextField label={t(L, "placePrefix")} value={placePrefix} onChange={setPlacePrefix} placeholder={t(L, "placePrefixHint", { example: ST_PLACE_PREFIX })} disabled={busy} />
        <ui.TextField label={t(L, "creditName")} value={creditName} onChange={setCreditName} placeholder={t(L, "creditNameHint", { prefix: creditPrefix.trim() || ST_CREDIT_PREFIX })} disabled={busy} />
        <ui.TextField label={t(L, "creditPrefix")} value={creditPrefix} onChange={setCreditPrefix} placeholder={t(L, "creditPrefixHint", { example: ST_CREDIT_PREFIX })} disabled={busy} />
        <ui.TextField label={t(L, "topLabel")} value={topMain} onChange={(v: string) => setTopMainEdit(v)} disabled={busy} />
        <ui.TextField label={t(L, "topItalic")} value={topItalic} onChange={setTopItalic} disabled={busy} />
        <ui.Segmented label={t(L, "style")} value={preset} onChange={setPreset} disabled={busy}
          options={[{ label: t(L, "preset.summer"), value: "summer" }, { label: t(L, "preset.poster"), value: "poster" }, { label: t(L, "preset.postcard"), value: "postcard" }]} />
        {presetsData ? <TitlePreview presets={presetsData} presetId={preset} line1={line1} season={season} topMain={topMain} topItalic={topItalic} creditPrefix={creditPrefix} creditName={creditName} fontsTick={fontsTick} lang={L} /> : null}
      </ui.Section>
      <ui.Section title={t(L, "music")}>
        <ui.Select label={t(L, "track")} value={ownMusic ? "own" : cueId || null} disabled={busy}
          onChange={(v: string) => { setCueId(v); if (v !== "own") { setOwnMusic(null); setOwnGrid(null); } }} options={cueOptions} />
        {(ownMusic || cueId === "own") && canOwnMusic ? <ui.FileDrop accept={["audio"]} value={ownMusic} disabled={busy}
          onChange={(f: any) => { if (f) detectOwnMusic(f); else { setOwnMusic(null); setOwnGrid(null); } }} /> : null}
        {!canOwnMusic ? <ui.Message tone="muted">{t(L, "installTools")}</ui.Message> : null}
        <ui.Segmented label={t(L, "length")} value={length} onChange={setLength} disabled={busy}
          options={[{ label: t(L, "length.short"), value: "short" }, { label: t(L, "length.standard"), value: "standard" }, { label: t(L, "length.long"), value: "long" }]} />
        {music.kind !== "none" && (ownMusic || cue) ? (
          // Esc on the slider or the preview button (the key bubbles up here) stops the preview.
          <div onKeyDown={(e) => { if (e.key === "Escape" && playState !== "idle") { e.preventDefault(); stopPreview(); } }}>
            <SectionSlider peaks={music.peaks || []} total={Math.max(1, music.duration || 1)} section={start} videoSeconds={videoSeconds}
              barSeconds={music.kind === "fixed" ? 0.5 : (4 * 60) / music.bpm} snap={snap} onChange={(v) => { setSection(v); setSectionNote(null); }} disabled={busy} audio={playingAudio} drop={isDrop} lang={L} />
            <ui.Row gap={8} align="center">
              {/* The kit has no stop icon; "pause" marks stop, and the label says what it does. */}
              <ui.IconButton icon={playState === "playing" ? "pause" : playState === "loading" ? "loading" : "play"}
                label={playState === "playing" ? t(L, "stopPreview") : playState === "loading" ? t(L, "cancelPreview") : t(L, "previewSection")}
                onClick={preview} disabled={busy || !tools.ffmpeg || (playState === "idle" && start == null)} />
              <span>{start == null ? t(L, "musicTooShort") : isDrop ? t(L, "dropStartsAt", { seconds: Math.round(start * 10) / 10 }) : t(L, "sectionStartsAt", { seconds: Math.round(start * 10) / 10 })}</span>
            </ui.Row>
            {sectionNote ? <ui.Message tone="muted">{sayPlan(L, sectionNote)}</ui.Message> : null}
          </div>
        ) : null}
        {timingNote ? <ui.Message tone="muted">{timingNote}</ui.Message> : null}
      </ui.Section>
      <ui.Section title={t(L, "advanced")}>
        <ui.Segmented label={t(L, "clipSound")} value={clipSound} onChange={setClipSound} disabled={busy}
          options={[{ label: t(L, "sound.off"), value: "off" }, { label: t(L, "sound.ambient"), value: "ambient" }, { label: t(L, "sound.full"), value: "full" }]} />
        <ui.Toggle label={t(L, "summerLook")} value={lookOn} onChange={setLookOn} disabled={busy} />
        <ui.Slider label={t(L, "lookStrength")} value={lookStrength} onChange={setLookStrength} min={0} max={1} step={0.05} disabled={busy || !lookOn} />
        <ui.Toggle label={t(L, "soundEffects")} value={sfxOn} onChange={setSfxOn} disabled={busy} />
        {music.kind !== "none" ? <ui.Toggle label={t(L, "endingMuffle")} value={muffleOn} onChange={setMuffleOn} disabled={busy} /> : null}
        <ui.Toggle label={t(L, "usePhotos")} value={usePhotos} onChange={setUsePhotos} disabled={busy} />
        {silent ? <ui.Message tone="muted">{sfxOn ? t(L, "onlySfx") : t(L, "silentVideo")}</ui.Message> : null}
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
      {progress ? <ui.Progress value={progress.value} label={progressText(L, progress)} steps={ST_BUILD_STEPS.map((s: any) => t(L, "step." + s.id))} current={progress.current} />
        : busy ? <ui.Progress label={stepText || t(L, "working")} /> : null}
      {status ? <ui.Message tone={status.tone === "error" ? "error" : "muted"}>{status.say(L)}</ui.Message> : null}
      {blocked && !busy ? <ui.Message tone="muted">{blocked}</ui.Message> : null}
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
      {result?.approximate ? <ui.Message tone="muted">{t(L, "approximateVideo")}</ui.Message> : null}
      {result?.notes?.length ? <ui.Message tone="muted">{t(L, "note", { detail: result.notes.map((n: any) => (typeof n === "function" ? n(L) : n)).join("; ") })}</ui.Message> : null}
      {result?.plan?.notes?.filter((n: string) => !/^Your footage fits/.test(n)).length ? (
        <ui.Message tone="muted">{result.plan.notes.filter((n: string) => !/^Your footage fits/.test(n)).map((n: string) => sayPlan(L, n)).join(t(L, "gap"))}</ui.Message>
      ) : null}
      {result?.unchecked ? <ui.Message tone="muted">{t(L, "unchecked", { count: result.unchecked })}</ui.Message> : null}
      <ui.Actions>
        {result && !result.decorated ? <ui.Button onClick={finishTitle} disabled={busy}>{t(L, "finishTitle")}</ui.Button> : null}
        {result ? <ui.Button onClick={buildAnother} disabled={busy}>{t(L, "anotherVersion")}</ui.Button> : null}
        <ui.Button variant="primary" busy={busy} busyLabel={stepText || t(L, "building")} onClick={() => build(seed)} disabled={busy || !canBuild}>{t(L, "build")}</ui.Button>
      </ui.Actions>
    </ui.Stack>
  );
}

// ---------------------------------------------------------------------------
// Template runs. Clip highlights asks the person for the footage, a track and a length, mounts this panel out of sight
// and hands them over in `context.template`. The run builds a new Draft at once from only those files, as Build does
// with every other setting at the panel's default, never opens it, and ends by calling `sdk.finishTemplate` exactly once.
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
    console.warn("[summer-trip] " + summary + " came back empty, reading again:", text);
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
    const d = photo || !shared ? await p.createDraft({ name: 'Summer Trip id check' }) : shared;
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
async function runSummerTripTemplate(sdk: any, context: any, check: () => void, say: (step: string, detail?: string) => void): Promise<{ sequenceId: string }> {
  const pid: string | null = context?.projectId ?? null;
  // The UI language when the run starts: its messages and the Adjust labels written into the Draft use it.
  const bl = uiLang(context);
  if (!pid) throw templateIssue(t(bl, "openProject"));
  const files = templateFootage(context);
  if (!files.length) throw templateIssue("Choose videos or photos for the footage, then try again.");
  const run = (summary: string, script: string, allowCommit = false) => runTemplateStep(sdk, summary, script, allowCommit);
  const options = context?.template?.options || {};

  say("Reading the chosen files");
  const roots = await locateRoots(sdk);
  check();
  const read = (rel: string) => readText(roots.plugin, rel);
  const [manifest, presetsText, inventoryJs, searchJs, ensureJs, assembleJs, decorateJs, titleTsx, labelsTsx, lookTsx, gridTsx, filmTsx, motionTsx, videoMotionTsx] = await Promise.all([
    read("assets/cues/manifest.json"), read("assets/fonts/presets.json"), read("scripts/inventory.js"), read("scripts/search.js"),
    read("scripts/ensure-audio.js"), read("scripts/assemble.js"), read("scripts/decorate.js"), read("assets/title-graphic.tsx"), read("assets/labels-graphic.tsx"),
    read("assets/summer-look.tsx"), read("assets/grid-panel.tsx"), read("assets/film-frame.tsx"), read("assets/photo-motion.tsx"), read("assets/video-motion.tsx")]);
  check();
  const presets = JSON.parse(presetsText);
  const tsx = { title: titleTsx, labels: labelsTsx, look: lookTsx, gridPanel: gridTsx, filmFrame: filmTsx, motion: motionTsx, videoMotion: videoMotionTsx };
  // The track and length chosen on the app's page; an unknown or missing one gets the panel's default (its first track).
  const cues: any[] = (JSON.parse(manifest).cues || []).filter((c: any) => c && c.accepted !== false);
  const cue = cues.find((c) => c.id === options.track) || cues[0];
  if (!cue) throw templateIssue("Summer Trip's music is missing; reinstall the plugin and try again.");
  const length: "short" | "standard" | "long" = options.length === "short" || options.length === "long" ? options.length : "standard";
  const requested = ST_LENGTHS[length];
  const music: any = stMusicFor({ choice: cue.id, cue, own: null });
  const d: any = stDefaultStart(music, requested);
  const sectionInfo: any = d ? stSnapSection(music, requested, d.start) : null;
  if (!sectionInfo) throw templateIssue("This track is too short for this length. Pick a shorter length or another track.");

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
  // Its capture months still cover the whole Project, as the panel's season does.
  const inventory = await run("Read footage", fill(inventoryJs, { projectId: pid, only: aliases, known }));
  check();
  inventory.resources = inventory.resources || [];
  inventory.photos = inventory.photos || [];
  const unanalysed = inventory.skipped?.unanalysed || 0;

  // Scene search over the handed videos. Nobody can press Build again, so videos whose search failed get one more try,
  // and any still unsearched take part through their filler windows, as in the panel.
  say("Choosing shots");
  const rids: string[] = inventory.resources.map((r: any) => r.rid);
  const dur: Record<string, number> = Object.fromEntries(inventory.resources.map((r: any) => [r.rid, r.duration]));
  const search = async (todo: string[]) => {
    const list: any[] = []; const failed: string[] = [];
    for (let i = 0; i < todo.length; i += ST_SEARCH_BATCH) {
      say("Choosing shots", i + "/" + todo.length + (todo.length === 1 ? " video" : " videos"));
      const r = await run("Search travel shots", fill(searchJs, { projectId: pid, rids: todo.slice(i, i + ST_SEARCH_BATCH), queries: ST_SEARCH_QUERIES, pageSize: ST_SEARCH_PAGE }));
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
  if (found.failed.length) console.info("[summer-trip] template run: scene search failed for", found.failed.join(", "));
  const list = found.list.map((c: any) => ({ ...c, sourceDuration: dur[c.rid] || 0 }));
  const searched = new Set(list.map((c: any) => c.rid));
  const unsearched = stPseudoCandidates(inventory.resources.filter((r: any) => !searched.has(r.rid)));
  const sizes = { ...known, ...sizesOf(inventory) };
  const plan: any = stPlanBuild(stPlanOptions({ music, section: sectionInfo.start, candidates: list.concat(unsearched, photoCandsOf(inventory, null, true)),
    fps: ST_GUESS_FPS, montageShots: requested, seed: TEMPLATE_SEED, sizes }));
  if (!plan.ok) {
    const waiting = unanalysed ? " " + unanalysed + (unanalysed === 1 ? " video is" : " videos are") + " not analyzed yet, so it could not be used." : "";
    throw templateIssue(sayPlan(bl, plan.disabledReason) + waiting);
  }

  // Commit 1: the music and its muffled ending copy, then the clips on a new Draft.
  say("Adding music");
  const audioFiles: { key: string; path: string }[] = [{ key: "dry", path: roots.plugin + "/assets/cues/" + music.cue.file }];
  if (music.cue.muffledFile) audioFiles.push({ key: "wet", path: roots.plugin + "/assets/cues/" + music.cue.muffledFile });
  const audio = await run("Add music to the project", fill(ensureJs, { projectId: pid, files: audioFiles }), true);
  check();
  if (!audio?.ids?.dry) throw templateIssue("The music could not be added to the Project; try again.");
  say("Making the Draft");
  const season = stInferSeason(inventory);
  const inputs = { labels: inspectorLabels(bl), presetId: "summer", line1: ST_LINE1_DEFAULT, season, topMain: season, topItalic: ST_TOP_ITALIC_DEFAULT, creditPrefix: ST_CREDIT_PREFIX, creditName: "",
    placePrefix: ST_PLACE_PREFIX, place: "", lookOn: true, lookStrength: ST_LOOK_DEFAULT, clipSound: "ambient", titleHits: stTitleHitsFor(music, sectionInfo.kind) };
  const draftName = stDraftName(inputs.place, inputs.season, new Date());
  const cfg = stAssembleConfig({ projectId: pid, draftName, fps: ST_GUESS_FPS, plan, sizes, durations: dur,
    music: { resourceId: audio.ids.dry, sectionStart: sectionInfo.start, wetResourceId: audio.ids.wet || null },
    clipSound: inputs.clipSound, sfx: null, sectionKind: sectionInfo.kind });
  // Never resent: the reply may be lost after the Draft was saved.
  const a = await run("Assemble the Summer Trip", fill(assembleJs, cfg), true);
  check();
  if (!a.sequenceId) throw templateIssue("The Draft \"" + draftName + "\" may have been saved without its title. Open it from the Drafts list, or try again.");

  // Commit 2: title, labels, look, grid masks, film frame and photo motion, as the panel's Finish step adds them.
  say("Adding title and look");
  const fontsB64: Record<string, string> = {};
  for (const f of stPresetFontFiles(presets, inputs.presetId)) fontsB64[f] = (await readText(roots.plugin, "assets/fonts/" + f)).replace(/\s+/g, "");
  check();
  const finish = () => run("Add title and look", fill(decorateJs, stDecorateConfig({ a, plan, inputs, presets, fontsB64, tsx })), true);
  // decorate.js skips what an earlier attempt added, so a failed attempt is tried once more.
  try {
    await finish();
  } catch (e) {
    console.warn("[summer-trip] Add title and look failed, trying again:", errorText(e));
    check();
    try { await finish(); } catch (e2) {
      console.warn("[summer-trip] Add title and look failed again:", errorText(e2));
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
      try { sdk.finishTemplate(outcome); } catch (e) { console.warn("[summer-trip] finishTemplate failed:", errorText(e)); }
    };
    (async () => {
      try {
        end(await runSummerTripTemplate(sdk, snapshot, check, say));
      } catch (e: any) {
        if (e === STALE) { end(null); return; }
        console.warn("[summer-trip] template run failed while " + step + ":", errorText(e), e);
        end({ error: e?.forPerson ? String(e.message) : "Summer Trip stopped while " + step.charAt(0).toLowerCase() + step.slice(1) + "; try again." });
      } finally {
        end({ error: "Summer Trip stopped before the Draft was ready; try again." });
      }
    })();
  }, [runId]);
  return <div role="status" style={{ fontSize: 11, color: "var(--panel-muted-fg)" }}>{status}</div>;
}
