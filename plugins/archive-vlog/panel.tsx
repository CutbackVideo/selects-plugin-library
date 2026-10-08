// @name Archive Vlog
// @collection visual-highlights
// @name:de Archive Vlog
// @name:en Archive Vlog
// @name:es Archive Vlog
// @name:fr Archive Vlog
// @name:it Archive Vlog
// @name:ja Archive Vlog
// @name:ko Archive Vlog
// @name:pt Archive Vlog
// @name:tr Archive Vlog
// @name:zh Archive Vlog
// @icon sparkles
// Builds a 16:9 cinematic city or travel vlog as a new, editable Draft: a letterbox-open first shot with a decoding
// title, an "archived by" credit shot, a montage cut on the music's beat and a held last shot that fades to black.
import React from "react";

// STRINGS:BEGIN
const STRINGS = {
  en: {
    openProject: "Open a Project to build an Archive Vlog.",
    startFailed: "Archive Vlog could not start: {detail}. Reinstall the plugin if this persists.",
    foldersNotFound: "the plugin folders could not be found",
    hostTooOld: "Archive Vlog needs a newer version of Selects. Update Selects, then open this panel again.",
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
    noFootage: "No video clips in this Project yet. Add video clips; this updates automatically.",
    noClipsSelected: "No clips selected. Choose clips in Advanced.",
    gap: " ",
    ready: "Ready: {summary}",
    clips: { one: "{count} clip", other: "{count} clips" },
    clipsSelected: { one: "{selected} of {count} clip selected", other: "{selected} of {count} clips selected" },
    stillAdding: { one: "{count} video clip is still being added to the Project. This updates automatically.", other: "{count} video clips are still being added to the Project. This updates automatically." },
    localNote: { one: "{count} clip is not analysed in Selects, so its shots come from a quick check. Analysed clips give better picks.", other: "{count} clips are not analysed in Selects, so their shots come from a quick check. Analysed clips give better picks." },
    photos: { one: "{count} photo", other: "{count} photos" },
    photosSelected: { one: "{selected} of {count} photo selected", other: "{selected} of {count} photos selected" },
    style: "Style",
    titlePreview: "Title preview",
    previewUnavailable: "Preview unavailable; the title is still added to the Draft.",
    replayDecode: "Replay the title animation",
    decodeFitted: "The opening shot is short for this title at this tempo, so the title decodes faster to stay readable before the cut.",
    loading: "Loading…",
    "preset.cinematic": "Cinematic",
    "preset.a-day-out": "A Day Out",
    "preset.golden-hour": "Golden Hour",
    fieldCount: "{label} ({used}/{max})",
    creditShot: "Credit shot",
    creditName: "Name on the credit",
    creditPreview: "Credit preview",
    creditSample: "{name} is sample text: type your name, or clear it to leave the credit out.",
    creditCleared: "No name: the credit shot plays without a credit.",
    music: "Music",
    track: "Track",
    ownMusic: "Your own music",
    noMusic: "No music",
    ownMusicHint: { one: "Only the first {count} minute of your track is analysed and used.", other: "Only the first {count} minutes of your track are analysed and used." },
    bpm: "{bpm} bpm",
    sectionHint: "Music section — drag to choose",
    sectionLabel: "Music section",
    musicTooShort: "This track is too short for this length",
    startsAt: "Starts at {seconds} s",
    stopPreview: "Stop preview",
    cancelPreview: "Cancel preview",
    previewSection: "Preview this section",
    readingMusic: "Reading the music…",
    musicLengthUnknown: "The length of this music is unknown",
    beatFound: "Beat found: {bpm} bpm. Cuts follow the beat.",
    faintTempo: "Tempo found ({bpm} bpm) but the beat is faint, so cuts follow a {bpm} bpm grid approximately.",
    outsideTempo: "Its tempo ({bpm} bpm) is outside 70–160 bpm, so cuts use approximate timing.",
    noBeat: "No steady beat found, so cuts use approximate timing.",
    length: "Length",
    "length.short": "Short",
    "length.standard": "Standard",
    "length.long": "Long",
    pace: "Pace",
    "pace.cinematic": "Cinematic",
    "pace.quick": "Quick",
    fitPartial: { one: "{length}: {fitted} of {count} montage shot fit this track ({seconds} s)", other: "{length}: {fitted} of {count} montage shots fit this track ({seconds} s)" },
    fitFull: { one: "{length}: {count} montage shot ({seconds} s)", other: "{length}: {count} montage shots ({seconds} s)" },
    footageFits: { one: "Your footage fits {fitted} of {count} montage shot ({seconds} s)", other: "Your footage fits {fitted} of {count} montage shots ({seconds} s)" },
    montageBeats: { one: "Montage shots hold {count} beat ({seconds} s).", other: "Montage shots hold {count} beats ({seconds} s)." },
    noMusicTiming: "No music: cuts follow a steady {bpm} bpm beat.",
    faintTempoTiming: "Tempo found ({bpm} bpm) but the beat is faint: cuts follow a {bpm} bpm grid approximately.",
    outsideTempoTiming: "Tempo outside 70–160 bpm ({bpm} bpm): cuts follow a steady {fixed} bpm beat.",
    noBeatTiming: "No steady beat found: cuts follow a steady {bpm} bpm beat.",
    fastTempo: "Above 110 bpm every shot holds twice as many beats, so shots last about as long as on a slower track.",
    advanced: "Advanced",
    clipSound: "Clip sound",
    "sound.off": "Off",
    "sound.ambient": "Ambient",
    "sound.full": "Full",
    cinematicLook: "Cinematic look",
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
    localChecked: { one: "Checking clips {done}/{count}", other: "Checking clips {done}/{count}" },
    stoppedAt: "Stopped at step {step}/{total}, {name}: {detail}",
    "fail.too-few": "Your footage fills only {filled} of the {total} shots even the shortest version needs.",
    "fail.music-too-short": "This track is too short for even the shortest version from this section. Move the section earlier or choose a longer track.",
    "fail.music-too-short-seconds": "This track is too short from this section: even the shortest version needs {needed} s of music and only {available} s are left. Move the section earlier or choose a longer track.",
    "fail.no-video": "Archive Vlog needs at least 2 video clips: the opening, credit and last shots are always video, so photos alone are not enough. Add video clips or select more clips.",
    "fail.one-video": "Archive Vlog needs at least 2 video clips: one for the opening and one for the credit shot. Add another video clip or select more clips.",
    "fail.opening-too-short": "No video clip is long enough for the opening shot: it needs a clip of at least {needed} s, and the longest is {longest} s. Add a longer clip or choose faster music.",
    "fail.ending-too-short": "No video clip is long enough for the last shot: it needs a clip of at least {needed} s, and the longest is {longest} s. Add a longer clip.",
    noPlan: "No plan fits this footage.",
    addFootage: "Add more varied footage or select more clips.",
    addFootagePhotos: "Add more varied footage or photos, or select more clips.",
    retryUnchecked: { one: "Could not check {count} video; press Build to retry it.", other: "Could not check {count} videos; press Build to retry them." },
    typeTitle: "Type a title to build.",
    dropMusic: "Drop a music file, or choose one of the tracks.",
    musicLengthUnread: "The length of your music could not be read. Choose another file or one of the tracks.",
    musicApprox: "Music added; cuts use approximate timing ({detail}).",
    musicUnreadable: "Could not read this music file ({detail}). Choose another file or one of the tracks.",
    beatFailed: "beat detection failed",
    beatTimeout: "beat detection took too long",
    previewFailed: "Could not play a preview: {detail}.",
    noAudio: "no audio came back",
    draftNoId: "The Draft \"{name}\" may have been saved, but Selects did not report its id. Open it from the Drafts list, or build again.",
    draftEmpty: "The Draft \"{name}\" has no clips. Build again.",
    finishFailed: "The Draft was created, but its title, look and clip sound are not applied yet: {detail}. Press Finish title and look to try again.",
    openFailed: "The Draft is ready, but it could not be opened: {detail}. Use the link below or open it from the Drafts list.",
    draftCreated: "Draft created. Select the title or the credit to edit their words, colours, size or decode speed, a clip to adjust its crop, look or motion, and the music to change its volume. Rebuilding creates a new Draft and does not keep Inspector edits.",
    draftCreatedAdding: "Draft created; adding title and look…",
    draftNotFinished: "Draft created, but its title, look and clip sound are not applied yet.",
    openDraft: "Open the new Draft",
    copyLink: "Copy the link to the new Draft",
    shortened: { one: "Your footage fits {fitted} of {count} montage shot, so this video is about {seconds} s. Add more clips or photos for the full length.", other: "Your footage fits {fitted} of {count} montage shots, so this video is about {seconds} s. Add more clips or photos for the full length." },
    note: "Note: {detail}.",
    draftRecovered: "Selects did not confirm the new Draft, so it was found by its name in the Drafts list.",
    unchecked: { one: "Could not check {count} video; it was skipped. Build again to retry it.", other: "Could not check {count} videos; they were skipped. Build again to retry them." },
    createsDraft: "Creates a new 16:9 Draft",
    finishTitle: "Finish title and look",
    anotherVersion: "Try other shots",
    build: "Build",
    building: "Building",
    "param.motion": "Motion",
    "param.motionStrength": "Motion strength",
    "param.reveal": "Reveal",
    "param.letterbox": "Letterbox reveal",
    "param.look": "Look strength",
    "param.warmth": "Warmth",
    "param.fade": "Fade out",
    "param.kicker": "Top line",
    "param.title": "Title",
    "param.tagline": "Bottom line",
    "param.titleColor": "Title colour",
    "param.textColor": "Text colour",
    "param.size": "Size",
    "param.font": "Font",
    "param.speed": "Decode speed",
    "param.shadow": "Shadow",
    "param.scrim": "Backdrop",
    "param.prefix": "Credit prefix",
    "param.name": "Name",
    "motion.push-in": "Push in",
    "motion.pull-out": "Pull out",
    "motion.drift-left": "Drift left",
    "motion.drift-right": "Drift right",
    "motion.drift-up": "Drift up",
    "motion.drift-down": "Drift down",
    "motion.tilt": "Tilt",
    "motion.push-drift": "Push and drift",
    "tpl.files": "Reading the chosen files",
    "tpl.stepDetail": "{name} ({detail})",
    "tpl.done": "Done",
    "tpl.noFootage": "Choose videos or photos for the footage, then try again.",
    "tpl.noMusic": "Archive Vlog's music is missing. Reinstall the plugin and try again.",
    "tpl.noStyles": "Archive Vlog's title styles are missing. Reinstall the plugin and try again.",
    "tpl.notFound": "None of the chosen files could be found in this Project. Choose them again, then try again.",
    "tpl.notFoundDetail": "Selects said: {detail}",
    "tpl.notLocal": "These clips' original files aren't on this computer. Import them here or download the originals, then try again.",
    "tpl.notAnalysed": { one: "{count} video is still being added to the Project, so it could not be used.", other: "{count} videos are still being added to the Project, so they could not be used." },
    "tpl.noTitle": "The Draft \"{name}\" may have been saved without its title. Open it from the Drafts list, or try again.",
    "tpl.finishFailed": "The Draft was made, but its title and look could not be added. Try again.",
    "tpl.stoppedAt": "Archive Vlog stopped at this step: {step}. Try again.",
    "tpl.stopped": "Archive Vlog stopped before the Draft was ready. Try again.",
  },
  de: {
    openProject: "Öffne ein Projekt, um ein Archive Vlog zu erstellen.",
    startFailed: "Archive Vlog konnte nicht starten: {detail}. Installiere das Plugin neu, falls das weiterhin passiert.",
    foldersNotFound: "die Plugin-Ordner wurden nicht gefunden",
    hostTooOld: "Archive Vlog braucht eine neuere Version von Selects. Aktualisiere Selects und öffne dieses Panel dann erneut.",
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
    noFootage: "In diesem Projekt gibt es noch keine Videoclips. Füge Videoclips hinzu; die Anzeige aktualisiert sich automatisch.",
    noClipsSelected: "Keine Clips ausgewählt. Wähle Clips unter „Erweitert“.",
    gap: " ",
    ready: "Bereit: {summary}",
    clips: { one: "{count} Clip", other: "{count} Clips" },
    clipsSelected: { one: "{selected} von {count} Clip ausgewählt", other: "{selected} von {count} Clips ausgewählt" },
    stillAdding: { one: "{count} Videoclip wird noch zum Projekt hinzugefügt. Das aktualisiert sich automatisch.", other: "{count} Videoclips werden noch zum Projekt hinzugefügt. Das aktualisiert sich automatisch." },
    localNote: { one: "{count} Clip ist in Selects nicht analysiert, daher stammen seine Einstellungen aus einer schnellen Prüfung. Analysierte Clips ergeben eine bessere Auswahl.", other: "{count} Clips sind in Selects nicht analysiert, daher stammen ihre Einstellungen aus einer schnellen Prüfung. Analysierte Clips ergeben eine bessere Auswahl." },
    photos: { one: "{count} Foto", other: "{count} Fotos" },
    photosSelected: { one: "{selected} von {count} Foto ausgewählt", other: "{selected} von {count} Fotos ausgewählt" },
    style: "Stil",
    titlePreview: "Titelvorschau",
    previewUnavailable: "Vorschau nicht verfügbar; der Titel wird trotzdem zum Draft hinzugefügt.",
    replayDecode: "Titelanimation erneut abspielen",
    decodeFitted: "Die erste Einstellung ist für diesen Titel bei diesem Tempo kurz, daher entschlüsselt sich der Titel schneller, damit er vor dem Schnitt lesbar ist.",
    loading: "Wird geladen…",
    "preset.cinematic": "Cinematic",
    "preset.a-day-out": "A Day Out",
    "preset.golden-hour": "Golden Hour",
    fieldCount: "{label} ({used}/{max})",
    creditShot: "Credit-Einstellung",
    creditName: "Name im Credit",
    creditPreview: "Credit-Vorschau",
    creditSample: "{name} ist Beispieltext: Gib deinen Namen ein oder lösche ihn, um den Credit wegzulassen.",
    creditCleared: "Kein Name: Die Credit-Einstellung läuft ohne Credit.",
    music: "Musik",
    track: "Musikstück",
    ownMusic: "Eigene Musik",
    noMusic: "Keine Musik",
    ownMusicHint: { one: "Nur die erste {count} Minute deines Musikstücks wird analysiert und verwendet.", other: "Nur die ersten {count} Minuten deines Musikstücks werden analysiert und verwendet." },
    bpm: "{bpm} BPM",
    sectionHint: "Musikabschnitt – zum Auswählen ziehen",
    sectionLabel: "Musikabschnitt",
    musicTooShort: "Dieses Musikstück ist für diese Länge zu kurz",
    startsAt: "Beginnt bei {seconds} s",
    stopPreview: "Vorschau stoppen",
    cancelPreview: "Vorschau abbrechen",
    previewSection: "Diesen Abschnitt vorhören",
    readingMusic: "Musik wird gelesen …",
    musicLengthUnknown: "Die Länge dieser Musik ist unbekannt",
    beatFound: "Beat gefunden: {bpm} BPM. Die Schnitte folgen dem Beat.",
    faintTempo: "Tempo gefunden ({bpm} BPM), aber der Beat ist schwach, daher folgen die Schnitte ungefähr einem {bpm}-BPM-Raster.",
    outsideTempo: "Das Tempo ({bpm} BPM) liegt außerhalb von 70–160 BPM, daher haben die Schnitte ein ungefähres Timing.",
    noBeat: "Kein gleichmäßiger Beat gefunden, daher haben die Schnitte ein ungefähres Timing.",
    length: "Länge",
    "length.short": "Kurz",
    "length.standard": "Standard",
    "length.long": "Lang",
    pace: "Rhythmus",
    "pace.cinematic": "Cinematic",
    "pace.quick": "Schnell",
    fitPartial: { one: "{length}: {fitted} von {count} Montage-Einstellung passt zu diesem Musikstück ({seconds} s)", other: "{length}: {fitted} von {count} Montage-Einstellungen passen zu diesem Musikstück ({seconds} s)" },
    fitFull: { one: "{length}: {count} Montage-Einstellung ({seconds} s)", other: "{length}: {count} Montage-Einstellungen ({seconds} s)" },
    footageFits: { one: "Dein Material reicht für {fitted} von {count} Montage-Einstellung ({seconds} s)", other: "Dein Material reicht für {fitted} von {count} Montage-Einstellungen ({seconds} s)" },
    montageBeats: { one: "Montage-Einstellungen dauern {count} Beat ({seconds} s).", other: "Montage-Einstellungen dauern {count} Beats ({seconds} s)." },
    noMusicTiming: "Keine Musik: Die Schnitte folgen einem gleichmäßigen Beat mit {bpm} BPM.",
    faintTempoTiming: "Tempo gefunden ({bpm} BPM), aber der Beat ist schwach: Die Schnitte folgen ungefähr einem {bpm}-BPM-Raster.",
    outsideTempoTiming: "Tempo außerhalb von 70–160 BPM ({bpm} BPM): Die Schnitte folgen einem gleichmäßigen Beat mit {fixed} BPM.",
    noBeatTiming: "Kein gleichmäßiger Beat gefunden: Die Schnitte folgen einem festen Beat mit {bpm} BPM.",
    fastTempo: "Über 110 BPM dauert jede Einstellung doppelt so viele Beats, sodass die Einstellungen etwa so lang sind wie bei einem langsameren Musikstück.",
    advanced: "Erweitert",
    clipSound: "Clip-Ton",
    "sound.off": "Aus",
    "sound.ambient": "Leise",
    "sound.full": "Voll",
    cinematicLook: "Filmischer Look",
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
    localChecked: { one: "Clips werden geprüft: {done}/{count}", other: "Clips werden geprüft: {done}/{count}" },
    stoppedAt: "Abgebrochen bei Schritt {step}/{total}, {name}: {detail}",
    "fail.too-few": "Dein Material füllt nur {filled} der {total} Einstellungen, die selbst die kürzeste Version braucht.",
    "fail.music-too-short": "Dieses Musikstück ist ab diesem Abschnitt selbst für die kürzeste Version zu kurz. Verschiebe den Abschnitt nach vorn oder wähle ein längeres Musikstück.",
    "fail.music-too-short-seconds": "Dieses Musikstück ist ab diesem Abschnitt zu kurz: Selbst die kürzeste Version braucht {needed} s Musik, und es bleiben nur {available} s. Verschiebe den Abschnitt nach vorn oder wähle ein längeres Musikstück.",
    "fail.no-video": "Archive Vlog braucht mindestens 2 Videoclips: Die erste Einstellung, die Credit-Einstellung und die letzte Einstellung sind immer Videos, Fotos allein reichen also nicht. Füge Videoclips hinzu oder wähle mehr Clips aus.",
    "fail.one-video": "Archive Vlog braucht mindestens 2 Videoclips: einen für den Anfang und einen für die Credit-Einstellung. Füge einen weiteren Videoclip hinzu oder wähle mehr Clips aus.",
    "fail.opening-too-short": "Kein Videoclip ist lang genug für die erste Einstellung: Sie braucht einen Clip von mindestens {needed} s, und der längste hat {longest} s. Füge einen längeren Clip hinzu oder wähle schnellere Musik.",
    "fail.ending-too-short": "Kein Videoclip ist lang genug für die letzte Einstellung: Sie braucht einen Clip von mindestens {needed} s, und der längste hat {longest} s. Füge einen längeren Clip hinzu.",
    noPlan: "Für dieses Material passt kein Plan.",
    addFootage: "Füge abwechslungsreicheres Material hinzu oder wähle mehr Clips aus.",
    addFootagePhotos: "Füge abwechslungsreicheres Material oder Fotos hinzu oder wähle mehr Clips aus.",
    retryUnchecked: { one: "{count} Video konnte nicht geprüft werden; drücke „Erstellen“, um es erneut zu versuchen.", other: "{count} Videos konnten nicht geprüft werden; drücke „Erstellen“, um sie erneut zu versuchen." },
    typeTitle: "Gib einen Titel ein, um zu erstellen.",
    dropMusic: "Lege eine Musikdatei ab oder wähle eines der Musikstücke.",
    musicLengthUnread: "Die Länge deiner Musik konnte nicht gelesen werden. Wähle eine andere Datei oder eines der Musikstücke.",
    musicApprox: "Musik hinzugefügt; die Schnitte haben ein ungefähres Timing ({detail}).",
    musicUnreadable: "Diese Musikdatei konnte nicht gelesen werden ({detail}). Wähle eine andere Datei oder eines der Musikstücke.",
    beatFailed: "Beat-Erkennung fehlgeschlagen",
    beatTimeout: "Beat-Erkennung hat zu lange gedauert",
    previewFailed: "Die Vorschau konnte nicht abgespielt werden: {detail}.",
    noAudio: "es kam kein Audio zurück",
    draftNoId: "Der Draft „{name}“ wurde möglicherweise gespeichert, aber Selects hat seine ID nicht gemeldet. Öffne ihn aus der Draft-Liste oder erstelle ihn erneut.",
    draftEmpty: "Der Draft „{name}“ enthält keine Clips. Erstelle ihn erneut.",
    finishFailed: "Der Draft wurde erstellt, aber Titel, Look und Clip-Ton sind noch nicht angewendet: {detail}. Klicke auf „Titel und Look fertigstellen“, um es erneut zu versuchen.",
    openFailed: "Der Draft ist fertig, konnte aber nicht geöffnet werden: {detail}. Nutze den Link unten oder öffne ihn in der Draft-Liste.",
    draftCreated: "Draft erstellt. Wähle den Titel oder den Credit, um Wörter, Farben, Größe oder Entschlüsselungstempo zu bearbeiten, einen Clip, um Zuschnitt, Look oder Bewegung anzupassen, und die Musik, um ihre Lautstärke zu ändern. Ein neuer Build erstellt einen neuen Draft und übernimmt keine Änderungen aus dem Inspektor.",
    draftCreatedAdding: "Draft erstellt; Titel und Look werden hinzugefügt …",
    draftNotFinished: "Draft erstellt, aber Titel, Look und Clip-Ton sind noch nicht angewendet.",
    openDraft: "Neuen Draft öffnen",
    copyLink: "Link zum neuen Draft kopieren",
    shortened: { one: "Dein Material reicht für {fitted} von {count} Montage-Einstellung, daher ist dieses Video etwa {seconds} s lang. Füge mehr Clips oder Fotos für die volle Länge hinzu.", other: "Dein Material reicht für {fitted} von {count} Montage-Einstellungen, daher ist dieses Video etwa {seconds} s lang. Füge mehr Clips oder Fotos für die volle Länge hinzu." },
    note: "Hinweis: {detail}.",
    draftRecovered: "Selects hat den neuen Draft nicht bestätigt, daher wurde er über seinen Namen in der Draft-Liste gefunden.",
    unchecked: { one: "{count} Video konnte nicht geprüft werden und wurde übersprungen. Erstelle erneut, um es nochmals zu versuchen.", other: "{count} Videos konnten nicht geprüft werden und wurden übersprungen. Erstelle erneut, um sie nochmals zu versuchen." },
    createsDraft: "Erstellt einen neuen 16:9-Draft",
    finishTitle: "Titel und Look fertigstellen",
    anotherVersion: "Andere Aufnahmen probieren",
    build: "Erstellen",
    building: "Wird erstellt",
    "param.motion": "Bewegung",
    "param.motionStrength": "Bewegungsstärke",
    "param.reveal": "Öffnungsdauer",
    "param.letterbox": "Letterbox-Öffnung",
    "param.look": "Look-Stärke",
    "param.warmth": "Wärme",
    "param.fade": "Abblenden",
    "param.kicker": "Obere Zeile",
    "param.title": "Titel",
    "param.tagline": "Untere Zeile",
    "param.titleColor": "Titelfarbe",
    "param.textColor": "Textfarbe",
    "param.size": "Größe",
    "param.font": "Schrift",
    "param.speed": "Entschlüsselungstempo",
    "param.shadow": "Schatten",
    "param.scrim": "Hintergrund abdunkeln",
    "param.prefix": "Credit-Präfix",
    "param.name": "Name",
    "motion.push-in": "Heranzoomen",
    "motion.pull-out": "Herauszoomen",
    "motion.drift-left": "Nach links gleiten",
    "motion.drift-right": "Nach rechts gleiten",
    "motion.drift-up": "Nach oben gleiten",
    "motion.drift-down": "Nach unten gleiten",
    "motion.tilt": "Neigen",
    "motion.push-drift": "Zoomen und gleiten",
    "tpl.files": "Ausgewählte Dateien lesen",
    "tpl.stepDetail": "{name} ({detail})",
    "tpl.done": "Fertig",
    "tpl.noFootage": "Wähle Videos oder Fotos als Material aus und versuche es dann erneut.",
    "tpl.noMusic": "Die Musik von Archive Vlog fehlt. Installiere das Plugin neu und versuche es erneut.",
    "tpl.noStyles": "Die Titelstile von Archive Vlog fehlen. Installiere das Plugin neu und versuche es erneut.",
    "tpl.notFound": "Keine der ausgewählten Dateien wurde in diesem Projekt gefunden. Wähle sie erneut aus und versuche es dann noch einmal.",
    "tpl.notFoundDetail": "Selects meldet: {detail}",
    "tpl.notLocal": "Die Originaldateien dieser Clips sind nicht auf diesem Computer. Importiere sie hier oder lade die Originale herunter und versuche es dann noch einmal.",
    "tpl.notAnalysed": { one: "{count} Video wird noch zum Projekt hinzugefügt und konnte daher nicht verwendet werden.", other: "{count} Videos werden noch zum Projekt hinzugefügt und konnten daher nicht verwendet werden." },
    "tpl.noTitle": "Der Draft „{name}“ wurde möglicherweise ohne Titel gespeichert. Öffne ihn aus der Draft-Liste oder versuche es erneut.",
    "tpl.finishFailed": "Der Draft wurde erstellt, aber Titel und Look konnten nicht hinzugefügt werden. Versuche es erneut.",
    "tpl.stoppedAt": "Archive Vlog wurde bei diesem Schritt abgebrochen: {step}. Versuche es erneut.",
    "tpl.stopped": "Archive Vlog wurde abgebrochen, bevor der Draft fertig war. Versuche es erneut.",
  },
  es: {
    openProject: "Abre un proyecto para crear un Archive Vlog.",
    startFailed: "Archive Vlog no pudo iniciarse: {detail}. Reinstala el plugin si el problema continúa.",
    foldersNotFound: "no se encontraron las carpetas del plugin",
    hostTooOld: "Archive Vlog necesita una versión más reciente de Selects. Actualiza Selects y vuelve a abrir este panel.",
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
    noFootage: "Este proyecto aún no tiene clips de vídeo. Añade clips de vídeo; se actualizará automáticamente.",
    noClipsSelected: "No hay clips seleccionados. Elige clips en «Avanzado».",
    gap: " ",
    ready: "Listo: {summary}",
    clips: { one: "{count} clip", many: "{count} de clips", other: "{count} clips" },
    clipsSelected: { one: "{selected} de {count} clip seleccionado", many: "{selected} de {count} de clips seleccionados", other: "{selected} de {count} clips seleccionados" },
    stillAdding: { one: "{count} clip de vídeo aún se está añadiendo al proyecto. Esto se actualiza automáticamente.", many: "{count} de clips de vídeo aún se están añadiendo al proyecto. Esto se actualiza automáticamente.", other: "{count} clips de vídeo aún se están añadiendo al proyecto. Esto se actualiza automáticamente." },
    localNote: { one: "{count} clip no está analizado en Selects, así que sus planos salen de una revisión rápida. Los clips analizados dan mejores tomas.", many: "{count} de clips no están analizados en Selects, así que sus planos salen de una revisión rápida. Los clips analizados dan mejores tomas.", other: "{count} clips no están analizados en Selects, así que sus planos salen de una revisión rápida. Los clips analizados dan mejores tomas." },
    photos: { one: "{count} foto", many: "{count} de fotos", other: "{count} fotos" },
    photosSelected: { one: "{selected} de {count} foto seleccionada", many: "{selected} de {count} de fotos seleccionadas", other: "{selected} de {count} fotos seleccionadas" },
    style: "Estilo",
    titlePreview: "Vista previa del título",
    previewUnavailable: "Vista previa no disponible; el título se añadirá igualmente al Draft.",
    replayDecode: "Repetir la animación del título",
    decodeFitted: "El plano de apertura es corto para este título con este tempo, así que el título se descifra más rápido para que se pueda leer antes del corte.",
    loading: "Cargando…",
    "preset.cinematic": "Cinematic",
    "preset.a-day-out": "A Day Out",
    "preset.golden-hour": "Golden Hour",
    fieldCount: "{label} ({used}/{max})",
    creditShot: "Plano de crédito",
    creditName: "Nombre en el crédito",
    creditPreview: "Vista previa del crédito",
    creditSample: "{name} es un texto de ejemplo: escribe tu nombre o bórralo para quitar el crédito.",
    creditCleared: "Sin nombre: el plano de crédito se reproduce sin crédito.",
    music: "Música",
    track: "Pista",
    ownMusic: "Tu propia música",
    noMusic: "Sin música",
    ownMusicHint: { one: "Solo se analiza y usa el primer {count} minuto de tu pista.", many: "Solo se analizan y usan los primeros {count} de minutos de tu pista.", other: "Solo se analizan y usan los primeros {count} minutos de tu pista." },
    bpm: "{bpm} BPM",
    sectionHint: "Sección de música: arrastra para elegir",
    sectionLabel: "Sección de música",
    musicTooShort: "Esta pista es demasiado corta para esta duración",
    startsAt: "Empieza en {seconds} s",
    stopPreview: "Detener la vista previa",
    cancelPreview: "Cancelar la vista previa",
    previewSection: "Escuchar esta sección",
    readingMusic: "Leyendo la música…",
    musicLengthUnknown: "Se desconoce la duración de esta música",
    beatFound: "Ritmo encontrado: {bpm} BPM. Los cortes siguen el ritmo.",
    faintTempo: "Se encontró el tempo ({bpm} BPM), pero el ritmo es débil, así que los cortes siguen aproximadamente una cuadrícula de {bpm} BPM.",
    outsideTempo: "Su tempo ({bpm} BPM) está fuera del rango 70–160 BPM, así que los cortes usan una sincronía aproximada.",
    noBeat: "No se encontró un ritmo estable, así que los cortes usan una sincronía aproximada.",
    length: "Duración",
    "length.short": "Corta",
    "length.standard": "Estándar",
    "length.long": "Larga",
    pace: "Cadencia",
    "pace.cinematic": "Cinematic",
    "pace.quick": "Rápida",
    fitPartial: { one: "{length}: {fitted} de {count} plano de montaje caben en esta pista ({seconds} s)", many: "{length}: {fitted} de {count} de planos de montaje caben en esta pista ({seconds} s)", other: "{length}: {fitted} de {count} planos de montaje caben en esta pista ({seconds} s)" },
    fitFull: { one: "{length}: {count} plano de montaje ({seconds} s)", many: "{length}: {count} de planos de montaje ({seconds} s)", other: "{length}: {count} planos de montaje ({seconds} s)" },
    footageFits: { one: "Tu material alcanza para {fitted} de {count} plano de montaje ({seconds} s)", many: "Tu material alcanza para {fitted} de {count} de planos de montaje ({seconds} s)", other: "Tu material alcanza para {fitted} de {count} planos de montaje ({seconds} s)" },
    montageBeats: { one: "Los planos de montaje duran {count} pulso ({seconds} s).", many: "Los planos de montaje duran {count} de pulsos ({seconds} s).", other: "Los planos de montaje duran {count} pulsos ({seconds} s)." },
    noMusicTiming: "Sin música: los cortes siguen un ritmo constante de {bpm} BPM.",
    faintTempoTiming: "Se encontró el tempo ({bpm} BPM), pero el ritmo es débil: los cortes siguen aproximadamente una cuadrícula de {bpm} BPM.",
    outsideTempoTiming: "Tempo fuera del rango 70–160 BPM ({bpm} BPM): los cortes siguen un ritmo constante de {fixed} BPM.",
    noBeatTiming: "No se encontró un ritmo estable: los cortes siguen un ritmo fijo de {bpm} BPM.",
    fastTempo: "Por encima de 110 BPM cada plano dura el doble de pulsos, así que los planos duran más o menos lo mismo que con una pista más lenta.",
    advanced: "Avanzado",
    clipSound: "Sonido de los clips",
    "sound.off": "Apagado",
    "sound.ambient": "Ambiente",
    "sound.full": "Completo",
    cinematicLook: "Look cinematográfico",
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
    localChecked: { one: "Comprobando clips: {done}/{count}", many: "Comprobando clips: {done}/{count}", other: "Comprobando clips: {done}/{count}" },
    stoppedAt: "Se detuvo en el paso {step}/{total}, {name}: {detail}",
    "fail.too-few": "Tu material solo llena {filled} de los {total} planos que necesita incluso la versión más corta.",
    "fail.music-too-short": "Esta pista es demasiado corta incluso para la versión más corta desde esta sección. Mueve la sección hacia el principio o elige una pista más larga.",
    "fail.music-too-short-seconds": "Esta pista es demasiado corta desde esta sección: incluso la versión más corta necesita {needed} s de música y solo quedan {available} s. Mueve la sección hacia el principio o elige una pista más larga.",
    "fail.no-video": "Archive Vlog necesita al menos 2 clips de vídeo: los planos de apertura, de crédito y final siempre son vídeo, así que las fotos solas no bastan. Añade clips de vídeo o selecciona más clips.",
    "fail.one-video": "Archive Vlog necesita al menos 2 clips de vídeo: uno para la apertura y otro para el plano de crédito. Añade otro clip de vídeo o selecciona más clips.",
    "fail.opening-too-short": "Ningún clip de vídeo es lo bastante largo para el plano de apertura: necesita un clip de al menos {needed} s y el más largo dura {longest} s. Añade un clip más largo o elige una música más rápida.",
    "fail.ending-too-short": "Ningún clip de vídeo es lo bastante largo para el plano final: necesita un clip de al menos {needed} s y el más largo dura {longest} s. Añade un clip más largo.",
    noPlan: "Ningún plan encaja con este material.",
    addFootage: "Añade material más variado o selecciona más clips.",
    addFootagePhotos: "Añade material más variado o fotos, o selecciona más clips.",
    retryUnchecked: { one: "No se pudo comprobar {count} vídeo; pulsa «Crear» para reintentarlo.", many: "No se pudieron comprobar {count} de vídeos; pulsa «Crear» para reintentarlos.", other: "No se pudieron comprobar {count} vídeos; pulsa «Crear» para reintentarlos." },
    typeTitle: "Escribe un título para crear.",
    dropMusic: "Suelta un archivo de música o elige una de las pistas.",
    musicLengthUnread: "No se pudo leer la duración de tu música. Elige otro archivo o una de las pistas.",
    musicApprox: "Música añadida; los cortes usan una sincronía aproximada ({detail}).",
    musicUnreadable: "No se pudo leer este archivo de música ({detail}). Elige otro archivo o una de las pistas.",
    beatFailed: "falló la detección del ritmo",
    beatTimeout: "la detección del ritmo tardó demasiado",
    previewFailed: "No se pudo reproducir la vista previa: {detail}.",
    noAudio: "no se recibió audio",
    draftNoId: "Es posible que el Draft «{name}» se haya guardado, pero Selects no informó de su ID. Ábrelo desde la lista de Drafts o vuelve a crearlo.",
    draftEmpty: "El Draft «{name}» no tiene clips. Vuelve a crearlo.",
    finishFailed: "El Draft se creó, pero aún no se aplicaron el título, el look ni el sonido de los clips: {detail}. Pulsa «Terminar título y look» para intentarlo de nuevo.",
    openFailed: "El Draft está listo, pero no se pudo abrir: {detail}. Usa el enlace de abajo o ábrelo desde la lista de Drafts.",
    draftCreated: "Draft creado. Selecciona el título o el crédito para editar sus palabras, colores, tamaño o velocidad de descifrado; un clip para ajustar su encuadre, look o movimiento; y la música para cambiar su volumen. Volver a crear genera un nuevo Draft y no conserva los cambios del Inspector.",
    draftCreatedAdding: "Draft creado; añadiendo título y look…",
    draftNotFinished: "Draft creado, pero aún no se aplicaron el título, el look ni el sonido de los clips.",
    openDraft: "Abrir el nuevo Draft",
    copyLink: "Copiar el enlace al nuevo Draft",
    shortened: { one: "Tu material alcanza para {fitted} de {count} plano de montaje, así que este vídeo dura unos {seconds} s. Añade más clips o fotos para la duración completa.", many: "Tu material alcanza para {fitted} de {count} de planos de montaje, así que este vídeo dura unos {seconds} s. Añade más clips o fotos para la duración completa.", other: "Tu material alcanza para {fitted} de {count} planos de montaje, así que este vídeo dura unos {seconds} s. Añade más clips o fotos para la duración completa." },
    note: "Nota: {detail}.",
    draftRecovered: "Selects no confirmó el nuevo Draft, así que se encontró por su nombre en la lista de Drafts.",
    unchecked: { one: "No se pudo comprobar {count} vídeo; se omitió. Vuelve a crear para reintentarlo.", many: "No se pudieron comprobar {count} de vídeos; se omitieron. Vuelve a crear para reintentarlos.", other: "No se pudieron comprobar {count} vídeos; se omitieron. Vuelve a crear para reintentarlos." },
    createsDraft: "Crea un nuevo Draft 16:9",
    finishTitle: "Terminar título y look",
    anotherVersion: "Probar otros planos",
    build: "Crear",
    building: "Creando",
    "param.motion": "Movimiento",
    "param.motionStrength": "Intensidad del movimiento",
    "param.reveal": "Duración de la apertura",
    "param.letterbox": "Apertura letterbox",
    "param.look": "Intensidad del look",
    "param.warmth": "Calidez",
    "param.fade": "Fundido de salida",
    "param.kicker": "Línea superior",
    "param.title": "Título",
    "param.tagline": "Línea inferior",
    "param.titleColor": "Color del título",
    "param.textColor": "Color del texto",
    "param.size": "Tamaño",
    "param.font": "Fuente",
    "param.speed": "Velocidad de descifrado",
    "param.shadow": "Sombra",
    "param.scrim": "Oscurecer fondo",
    "param.prefix": "Prefijo del crédito",
    "param.name": "Nombre",
    "motion.push-in": "Acercar",
    "motion.pull-out": "Alejar",
    "motion.drift-left": "Deslizar a la izquierda",
    "motion.drift-right": "Deslizar a la derecha",
    "motion.drift-up": "Deslizar hacia arriba",
    "motion.drift-down": "Deslizar hacia abajo",
    "motion.tilt": "Inclinar",
    "motion.push-drift": "Acercar y deslizar",
    "tpl.files": "Leyendo los archivos elegidos",
    "tpl.stepDetail": "{name} ({detail})",
    "tpl.done": "Listo",
    "tpl.noFootage": "Elige vídeos o fotos como material y vuelve a intentarlo.",
    "tpl.noMusic": "Falta la música de Archive Vlog. Reinstala el plugin y vuelve a intentarlo.",
    "tpl.noStyles": "Faltan los estilos de título de Archive Vlog. Reinstala el plugin y vuelve a intentarlo.",
    "tpl.notFound": "No se encontró ninguno de los archivos elegidos en este proyecto. Vuelve a elegirlos e inténtalo de nuevo.",
    "tpl.notFoundDetail": "Selects indica: {detail}",
    "tpl.notLocal": "Los archivos originales de estos clips no están en este ordenador. Impórtalos aquí o descarga los originales e inténtalo de nuevo.",
    "tpl.notAnalysed": { one: "{count} vídeo aún se está añadiendo al proyecto, así que no se pudo usar.", many: "{count} de vídeos aún se están añadiendo al proyecto, así que no se pudieron usar.", other: "{count} vídeos aún se están añadiendo al proyecto, así que no se pudieron usar." },
    "tpl.noTitle": "Es posible que el Draft «{name}» se haya guardado sin su título. Ábrelo desde la lista de Drafts o vuelve a intentarlo.",
    "tpl.finishFailed": "El Draft se creó, pero no se pudieron añadir el título y el look. Vuelve a intentarlo.",
    "tpl.stoppedAt": "Archive Vlog se detuvo en este paso: {step}. Vuelve a intentarlo.",
    "tpl.stopped": "Archive Vlog se detuvo antes de que el Draft estuviera listo. Vuelve a intentarlo.",
  },
  fr: {
    openProject: "Ouvrez un projet pour créer un Archive Vlog.",
    startFailed: "Archive Vlog n'a pas pu démarrer : {detail}. Réinstallez le plugin si le problème persiste.",
    foldersNotFound: "les dossiers du plugin sont introuvables",
    hostTooOld: "Archive Vlog nécessite une version plus récente de Selects. Mettez Selects à jour, puis rouvrez ce panneau.",
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
    noFootage: "Ce projet ne contient pas encore de clip vidéo. Ajoutez des clips vidéo ; l'affichage se met à jour automatiquement.",
    noClipsSelected: "Aucun clip sélectionné. Choisissez des clips dans « Avancé ».",
    gap: " ",
    ready: "Prêt : {summary}",
    clips: { one: "{count} clip", many: "{count} de clips", other: "{count} clips" },
    clipsSelected: { one: "{selected} sur {count} clip sélectionné", many: "{selected} sur {count} de clips sélectionnés", other: "{selected} sur {count} clips sélectionnés" },
    stillAdding: { one: "{count} clip vidéo est encore en cours d'ajout au projet. L'affichage se met à jour automatiquement.", many: "{count} de clips vidéo sont encore en cours d'ajout au projet. L'affichage se met à jour automatiquement.", other: "{count} clips vidéo sont encore en cours d'ajout au projet. L'affichage se met à jour automatiquement." },
    localNote: { one: "{count} clip n'est pas analysé dans Selects : ses plans viennent d'une vérification rapide. Les clips analysés donnent de meilleurs choix.", many: "{count} de clips ne sont pas analysés dans Selects : leurs plans viennent d'une vérification rapide. Les clips analysés donnent de meilleurs choix.", other: "{count} clips ne sont pas analysés dans Selects : leurs plans viennent d'une vérification rapide. Les clips analysés donnent de meilleurs choix." },
    photos: { one: "{count} photo", many: "{count} de photos", other: "{count} photos" },
    photosSelected: { one: "{selected} sur {count} photo sélectionnée", many: "{selected} sur {count} de photos sélectionnées", other: "{selected} sur {count} photos sélectionnées" },
    style: "Style",
    titlePreview: "Aperçu du titre",
    previewUnavailable: "Aperçu indisponible ; le titre sera tout de même ajouté au Draft.",
    replayDecode: "Rejouer l'animation du titre",
    decodeFitted: "Le plan d'ouverture est court pour ce titre à ce tempo : le titre se déchiffre donc plus vite pour rester lisible avant la coupe.",
    loading: "Chargement…",
    "preset.cinematic": "Cinematic",
    "preset.a-day-out": "A Day Out",
    "preset.golden-hour": "Golden Hour",
    fieldCount: "{label} ({used}/{max})",
    creditShot: "Plan du crédit",
    creditName: "Nom du crédit",
    creditPreview: "Aperçu du crédit",
    creditSample: "{name} est un texte d'exemple : saisissez votre nom, ou effacez-le pour retirer le crédit.",
    creditCleared: "Aucun nom : le plan du crédit s'affiche sans crédit.",
    music: "Musique",
    track: "Morceau",
    ownMusic: "Votre propre musique",
    noMusic: "Sans musique",
    ownMusicHint: { one: "Seule la première {count} minute de votre morceau est analysée et utilisée.", many: "Seules les {count} de premières minutes de votre morceau sont analysées et utilisées.", other: "Seules les {count} premières minutes de votre morceau sont analysées et utilisées." },
    bpm: "{bpm} BPM",
    sectionHint: "Section musicale : faites glisser pour choisir",
    sectionLabel: "Section musicale",
    musicTooShort: "Ce morceau est trop court pour cette durée",
    startsAt: "Commence à {seconds} s",
    stopPreview: "Arrêter l'aperçu",
    cancelPreview: "Annuler l'aperçu",
    previewSection: "Écouter cette section",
    readingMusic: "Lecture de la musique…",
    musicLengthUnknown: "La durée de cette musique est inconnue",
    beatFound: "Rythme trouvé : {bpm} BPM. Les coupes suivent le rythme.",
    faintTempo: "Tempo trouvé ({bpm} BPM), mais le rythme est peu marqué : les coupes suivent donc approximativement une grille à {bpm} BPM.",
    outsideTempo: "Son tempo ({bpm} BPM) est hors de la plage 70–160 BPM : les coupes utilisent donc un calage approximatif.",
    noBeat: "Aucun rythme régulier trouvé : les coupes utilisent donc un calage approximatif.",
    length: "Durée",
    "length.short": "Courte",
    "length.standard": "Standard",
    "length.long": "Longue",
    pace: "Cadence",
    "pace.cinematic": "Cinematic",
    "pace.quick": "Rapide",
    fitPartial: { one: "{length} : {fitted} sur {count} plan de montage tiennent dans ce morceau ({seconds} s)", many: "{length} : {fitted} sur {count} de plans de montage tiennent dans ce morceau ({seconds} s)", other: "{length} : {fitted} sur {count} plans de montage tiennent dans ce morceau ({seconds} s)" },
    fitFull: { one: "{length} : {count} plan de montage ({seconds} s)", many: "{length} : {count} de plans de montage ({seconds} s)", other: "{length} : {count} plans de montage ({seconds} s)" },
    footageFits: { one: "Vos images suffisent pour {fitted} sur {count} plan de montage ({seconds} s)", many: "Vos images suffisent pour {fitted} sur {count} de plans de montage ({seconds} s)", other: "Vos images suffisent pour {fitted} sur {count} plans de montage ({seconds} s)" },
    montageBeats: { one: "Les plans de montage durent {count} temps ({seconds} s).", many: "Les plans de montage durent {count} de temps ({seconds} s).", other: "Les plans de montage durent {count} temps ({seconds} s)." },
    noMusicTiming: "Sans musique : les coupes suivent une pulsation régulière à {bpm} BPM.",
    faintTempoTiming: "Tempo trouvé ({bpm} BPM), mais le rythme est peu marqué : les coupes suivent approximativement une grille à {bpm} BPM.",
    outsideTempoTiming: "Tempo hors de la plage 70–160 BPM ({bpm} BPM) : les coupes suivent une pulsation régulière à {fixed} BPM.",
    noBeatTiming: "Aucun rythme régulier trouvé : les coupes suivent une pulsation fixe à {bpm} BPM.",
    fastTempo: "Au-delà de 110 BPM, chaque plan dure deux fois plus de temps : les plans durent donc à peu près autant que sur un morceau plus lent.",
    advanced: "Avancé",
    clipSound: "Son des clips",
    "sound.off": "Coupé",
    "sound.ambient": "Ambiance",
    "sound.full": "Plein",
    cinematicLook: "Look cinéma",
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
    localChecked: { one: "Vérification des clips : {done}/{count}", many: "Vérification des clips : {done}/{count}", other: "Vérification des clips : {done}/{count}" },
    stoppedAt: "Arrêt à l'étape {step}/{total}, {name} : {detail}",
    "fail.too-few": "Vos images ne remplissent que {filled} des {total} plans nécessaires même à la version la plus courte.",
    "fail.music-too-short": "À partir de cette section, ce morceau est trop court, même pour la version la plus courte. Avancez la section ou choisissez un morceau plus long.",
    "fail.music-too-short-seconds": "Ce morceau est trop court à partir de cette section : même la version la plus courte nécessite {needed} s de musique et il n'en reste que {available} s. Avancez la section ou choisissez un morceau plus long.",
    "fail.no-video": "Archive Vlog nécessite au moins 2 clips vidéo : les plans d'ouverture, du crédit et de fin sont toujours des vidéos, les photos seules ne suffisent donc pas. Ajoutez des clips vidéo ou sélectionnez plus de clips.",
    "fail.one-video": "Archive Vlog nécessite au moins 2 clips vidéo : un pour l'ouverture et un pour le plan du crédit. Ajoutez un autre clip vidéo ou sélectionnez plus de clips.",
    "fail.opening-too-short": "Aucun clip vidéo n'est assez long pour le plan d'ouverture : il faut un clip d'au moins {needed} s, et le plus long dure {longest} s. Ajoutez un clip plus long ou choisissez une musique plus rapide.",
    "fail.ending-too-short": "Aucun clip vidéo n'est assez long pour le dernier plan : il faut un clip d'au moins {needed} s, et le plus long dure {longest} s. Ajoutez un clip plus long.",
    noPlan: "Aucun plan ne convient à ces images.",
    addFootage: "Ajoutez des images plus variées ou sélectionnez plus de clips.",
    addFootagePhotos: "Ajoutez des images plus variées ou des photos, ou sélectionnez plus de clips.",
    retryUnchecked: { one: "{count} vidéo n'a pas pu être vérifiée ; appuyez sur « Créer » pour réessayer.", many: "{count} de vidéos n'ont pas pu être vérifiées ; appuyez sur « Créer » pour réessayer.", other: "{count} vidéos n'ont pas pu être vérifiées ; appuyez sur « Créer » pour réessayer." },
    typeTitle: "Saisissez un titre pour créer.",
    dropMusic: "Déposez un fichier audio ou choisissez l'un des morceaux.",
    musicLengthUnread: "La durée de votre musique n'a pas pu être lue. Choisissez un autre fichier ou l'un des morceaux.",
    musicApprox: "Musique ajoutée ; les coupes utilisent un calage approximatif ({detail}).",
    musicUnreadable: "Impossible de lire ce fichier audio ({detail}). Choisissez un autre fichier ou l'un des morceaux.",
    beatFailed: "la détection du rythme a échoué",
    beatTimeout: "la détection du rythme a pris trop de temps",
    previewFailed: "Impossible de lire l'aperçu : {detail}.",
    noAudio: "aucun son n'a été renvoyé",
    draftNoId: "Le Draft « {name} » a peut-être été enregistré, mais Selects n'a pas indiqué son identifiant. Ouvrez-le depuis la liste des Drafts ou relancez la création.",
    draftEmpty: "Le Draft « {name} » ne contient aucun clip. Relancez la création.",
    finishFailed: "Le Draft a été créé, mais le titre, le look et le son des clips ne sont pas encore appliqués : {detail}. Appuyez sur « Terminer le titre et le look » pour réessayer.",
    openFailed: "Le Draft est prêt, mais n'a pas pu être ouvert : {detail}. Utilisez le lien ci-dessous ou ouvrez-le depuis la liste des Drafts.",
    draftCreated: "Draft créé. Sélectionnez le titre ou le crédit pour modifier leurs mots, leurs couleurs, leur taille ou leur vitesse de déchiffrage, un clip pour ajuster son cadrage, son look ou son mouvement, et la musique pour changer son volume. Recréer génère un nouveau Draft et ne conserve pas les modifications de l'Inspecteur.",
    draftCreatedAdding: "Draft créé ; ajout du titre et du look…",
    draftNotFinished: "Draft créé, mais le titre, le look et le son des clips ne sont pas encore appliqués.",
    openDraft: "Ouvrir le nouveau Draft",
    copyLink: "Copier le lien vers le nouveau Draft",
    shortened: { one: "Vos images suffisent pour {fitted} sur {count} plan de montage : cette vidéo dure donc environ {seconds} s. Ajoutez des clips ou des photos pour la durée complète.", many: "Vos images suffisent pour {fitted} sur {count} de plans de montage : cette vidéo dure donc environ {seconds} s. Ajoutez des clips ou des photos pour la durée complète.", other: "Vos images suffisent pour {fitted} sur {count} plans de montage : cette vidéo dure donc environ {seconds} s. Ajoutez des clips ou des photos pour la durée complète." },
    note: "Remarque : {detail}.",
    draftRecovered: "Selects n'a pas confirmé le nouveau Draft ; il a été retrouvé par son nom dans la liste des Drafts.",
    unchecked: { one: "{count} vidéo n'a pas pu être vérifiée et a été ignorée. Relancez la création pour réessayer.", many: "{count} de vidéos n'ont pas pu être vérifiées et ont été ignorées. Relancez la création pour réessayer.", other: "{count} vidéos n'ont pas pu être vérifiées et ont été ignorées. Relancez la création pour réessayer." },
    createsDraft: "Crée un nouveau Draft 16:9",
    finishTitle: "Terminer le titre et le look",
    anotherVersion: "Essayer d'autres plans",
    build: "Créer",
    building: "Création",
    "param.motion": "Mouvement",
    "param.motionStrength": "Intensité du mouvement",
    "param.reveal": "Durée d'ouverture",
    "param.letterbox": "Ouverture letterbox",
    "param.look": "Intensité du look",
    "param.warmth": "Chaleur",
    "param.fade": "Fondu de sortie",
    "param.kicker": "Ligne du haut",
    "param.title": "Titre",
    "param.tagline": "Ligne du bas",
    "param.titleColor": "Couleur du titre",
    "param.textColor": "Couleur du texte",
    "param.size": "Taille",
    "param.font": "Police",
    "param.speed": "Vitesse de déchiffrage",
    "param.shadow": "Ombre",
    "param.scrim": "Fond assombri",
    "param.prefix": "Préfixe du crédit",
    "param.name": "Nom",
    "motion.push-in": "Zoom avant",
    "motion.pull-out": "Zoom arrière",
    "motion.drift-left": "Glisser vers la gauche",
    "motion.drift-right": "Glisser vers la droite",
    "motion.drift-up": "Glisser vers le haut",
    "motion.drift-down": "Glisser vers le bas",
    "motion.tilt": "Incliner",
    "motion.push-drift": "Zoom et glissement",
    "tpl.files": "Lecture des fichiers choisis",
    "tpl.stepDetail": "{name} ({detail})",
    "tpl.done": "Terminé",
    "tpl.noFootage": "Choisissez des vidéos ou des photos comme images, puis réessayez.",
    "tpl.noMusic": "La musique d'Archive Vlog est introuvable. Réinstallez le plugin, puis réessayez.",
    "tpl.noStyles": "Les styles de titre d'Archive Vlog sont introuvables. Réinstallez le plugin, puis réessayez.",
    "tpl.notFound": "Aucun des fichiers choisis n'a été trouvé dans ce projet. Choisissez-les à nouveau, puis réessayez.",
    "tpl.notFoundDetail": "Selects indique : {detail}",
    "tpl.notLocal": "Les fichiers originaux de ces clips ne sont pas sur cet ordinateur. Importez-les ici ou téléchargez les originaux, puis réessayez.",
    "tpl.notAnalysed": { one: "{count} vidéo est encore en cours d'ajout au projet et n'a donc pas pu être utilisée.", many: "{count} de vidéos sont encore en cours d'ajout au projet et n'ont donc pas pu être utilisées.", other: "{count} vidéos sont encore en cours d'ajout au projet et n'ont donc pas pu être utilisées." },
    "tpl.noTitle": "Le Draft « {name} » a peut-être été enregistré sans son titre. Ouvrez-le depuis la liste des Drafts ou réessayez.",
    "tpl.finishFailed": "Le Draft a été créé, mais le titre et le look n'ont pas pu être ajoutés. Réessayez.",
    "tpl.stoppedAt": "Archive Vlog s'est arrêté à cette étape : {step}. Réessayez.",
    "tpl.stopped": "Archive Vlog s'est arrêté avant que le Draft soit prêt. Réessayez.",
  },
  it: {
    openProject: "Apri un progetto per creare un Archive Vlog.",
    startFailed: "Archive Vlog non è riuscito ad avviarsi: {detail}. Reinstalla il plugin se il problema persiste.",
    foldersNotFound: "le cartelle del plugin non sono state trovate",
    hostTooOld: "Archive Vlog richiede una versione più recente di Selects. Aggiorna Selects, poi riapri questo pannello.",
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
    noFootage: "In questo progetto non ci sono ancora clip video. Aggiungi clip video; si aggiorna automaticamente.",
    noClipsSelected: "Nessuna clip selezionata. Scegli le clip in «Avanzate».",
    gap: " ",
    ready: "Pronto: {summary}",
    clips: { one: "{count} clip", many: "{count} di clip", other: "{count} clip" },
    clipsSelected: { one: "{selected} di {count} clip selezionata", many: "{selected} di {count} clip selezionate", other: "{selected} di {count} clip selezionate" },
    stillAdding: { one: "{count} clip video è ancora in fase di aggiunta al progetto. Si aggiorna automaticamente.", many: "{count} di clip video sono ancora in fase di aggiunta al progetto. Si aggiorna automaticamente.", other: "{count} clip video sono ancora in fase di aggiunta al progetto. Si aggiorna automaticamente." },
    localNote: { one: "{count} clip non è analizzata in Selects, quindi le sue inquadrature vengono da un controllo rapido. Le clip analizzate danno scelte migliori.", many: "{count} di clip non sono analizzate in Selects, quindi le loro inquadrature vengono da un controllo rapido. Le clip analizzate danno scelte migliori.", other: "{count} clip non sono analizzate in Selects, quindi le loro inquadrature vengono da un controllo rapido. Le clip analizzate danno scelte migliori." },
    photos: { one: "{count} foto", many: "{count} di foto", other: "{count} foto" },
    photosSelected: { one: "{selected} di {count} foto selezionata", many: "{selected} di {count} foto selezionate", other: "{selected} di {count} foto selezionate" },
    style: "Stile",
    titlePreview: "Anteprima del titolo",
    previewUnavailable: "Anteprima non disponibile; il titolo verrà comunque aggiunto al Draft.",
    replayDecode: "Riproduci di nuovo l'animazione del titolo",
    decodeFitted: "L'inquadratura d'apertura è corta per questo titolo a questo tempo, quindi il titolo si decifra più in fretta per restare leggibile prima del taglio.",
    loading: "Caricamento…",
    "preset.cinematic": "Cinematic",
    "preset.a-day-out": "A Day Out",
    "preset.golden-hour": "Golden Hour",
    fieldCount: "{label} ({used}/{max})",
    creditShot: "Inquadratura del credito",
    creditName: "Nome nel credito",
    creditPreview: "Anteprima del credito",
    creditSample: "{name} è un testo di esempio: scrivi il tuo nome o cancellalo per togliere il credito.",
    creditCleared: "Nessun nome: l'inquadratura del credito viene riprodotta senza credito.",
    music: "Musica",
    track: "Brano",
    ownMusic: "La tua musica",
    noMusic: "Nessuna musica",
    ownMusicHint: { one: "Viene analizzato e usato solo il primo {count} minuto del tuo brano.", many: "Vengono analizzati e usati solo i primi {count} di minuti del tuo brano.", other: "Vengono analizzati e usati solo i primi {count} minuti del tuo brano." },
    bpm: "{bpm} BPM",
    sectionHint: "Sezione musicale: trascina per scegliere",
    sectionLabel: "Sezione musicale",
    musicTooShort: "Questo brano è troppo corto per questa durata",
    startsAt: "Inizia a {seconds} s",
    stopPreview: "Ferma l'anteprima",
    cancelPreview: "Annulla l'anteprima",
    previewSection: "Ascolta questa sezione",
    readingMusic: "Lettura della musica…",
    musicLengthUnknown: "La durata di questa musica è sconosciuta",
    beatFound: "Ritmo trovato: {bpm} BPM. I tagli seguono il ritmo.",
    faintTempo: "Tempo trovato ({bpm} BPM) ma il ritmo è debole, quindi i tagli seguono approssimativamente una griglia a {bpm} BPM.",
    outsideTempo: "Il suo tempo ({bpm} BPM) è fuori dall'intervallo 70–160 BPM, quindi i tagli usano una sincronia approssimativa.",
    noBeat: "Nessun ritmo regolare trovato, quindi i tagli usano una sincronia approssimativa.",
    length: "Durata",
    "length.short": "Breve",
    "length.standard": "Standard",
    "length.long": "Lunga",
    pace: "Cadenza",
    "pace.cinematic": "Cinematic",
    "pace.quick": "Veloce",
    fitPartial: { one: "{length}: {fitted} di {count} inquadratura di montaggio entrano in questo brano ({seconds} s)", many: "{length}: {fitted} di {count} di inquadrature di montaggio entrano in questo brano ({seconds} s)", other: "{length}: {fitted} di {count} inquadrature di montaggio entrano in questo brano ({seconds} s)" },
    fitFull: { one: "{length}: {count} inquadratura di montaggio ({seconds} s)", many: "{length}: {count} di inquadrature di montaggio ({seconds} s)", other: "{length}: {count} inquadrature di montaggio ({seconds} s)" },
    footageFits: { one: "Il tuo materiale basta per {fitted} di {count} inquadratura di montaggio ({seconds} s)", many: "Il tuo materiale basta per {fitted} di {count} di inquadrature di montaggio ({seconds} s)", other: "Il tuo materiale basta per {fitted} di {count} inquadrature di montaggio ({seconds} s)" },
    montageBeats: { one: "Le inquadrature di montaggio durano {count} battito ({seconds} s).", many: "Le inquadrature di montaggio durano {count} di battiti ({seconds} s).", other: "Le inquadrature di montaggio durano {count} battiti ({seconds} s)." },
    noMusicTiming: "Nessuna musica: i tagli seguono un ritmo costante a {bpm} BPM.",
    faintTempoTiming: "Tempo trovato ({bpm} BPM) ma il ritmo è debole: i tagli seguono approssimativamente una griglia a {bpm} BPM.",
    outsideTempoTiming: "Tempo fuori dall'intervallo 70–160 BPM ({bpm} BPM): i tagli seguono un ritmo costante a {fixed} BPM.",
    noBeatTiming: "Nessun ritmo regolare trovato: i tagli seguono un ritmo fisso a {bpm} BPM.",
    fastTempo: "Sopra i 110 BPM ogni inquadratura dura il doppio dei battiti, quindi le inquadrature durano circa quanto su un brano più lento.",
    advanced: "Avanzate",
    clipSound: "Audio delle clip",
    "sound.off": "Spento",
    "sound.ambient": "Ambiente",
    "sound.full": "Pieno",
    cinematicLook: "Look cinematografico",
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
    localChecked: { one: "Controllo delle clip: {done}/{count}", many: "Controllo delle clip: {done}/{count}", other: "Controllo delle clip: {done}/{count}" },
    stoppedAt: "Interrotto al passaggio {step}/{total}, {name}: {detail}",
    "fail.too-few": "Il tuo materiale riempie solo {filled} delle {total} inquadrature che servono anche alla versione più corta.",
    "fail.music-too-short": "Questo brano è troppo corto anche per la versione più corta a partire da questa sezione. Sposta la sezione verso l'inizio o scegli un brano più lungo.",
    "fail.music-too-short-seconds": "Questo brano è troppo corto a partire da questa sezione: anche la versione più corta richiede {needed} s di musica e ne restano solo {available} s. Sposta la sezione verso l'inizio o scegli un brano più lungo.",
    "fail.no-video": "Archive Vlog richiede almeno 2 clip video: l'inquadratura d'apertura, quella del credito e l'ultima sono sempre video, quindi le sole foto non bastano. Aggiungi clip video o seleziona più clip.",
    "fail.one-video": "Archive Vlog richiede almeno 2 clip video: una per l'apertura e una per l'inquadratura del credito. Aggiungi un'altra clip video o seleziona più clip.",
    "fail.opening-too-short": "Nessuna clip video è abbastanza lunga per l'inquadratura d'apertura: serve una clip di almeno {needed} s e la più lunga dura {longest} s. Aggiungi una clip più lunga o scegli una musica più veloce.",
    "fail.ending-too-short": "Nessuna clip video è abbastanza lunga per l'ultima inquadratura: serve una clip di almeno {needed} s e la più lunga dura {longest} s. Aggiungi una clip più lunga.",
    noPlan: "Nessun piano si adatta a questo materiale.",
    addFootage: "Aggiungi materiale più vario o seleziona più clip.",
    addFootagePhotos: "Aggiungi materiale più vario o foto, oppure seleziona più clip.",
    retryUnchecked: { one: "Non è stato possibile controllare {count} video; premi «Crea» per riprovare.", many: "Non è stato possibile controllare {count} di video; premi «Crea» per riprovare.", other: "Non è stato possibile controllare {count} video; premi «Crea» per riprovare." },
    typeTitle: "Scrivi un titolo per creare.",
    dropMusic: "Trascina qui un file musicale o scegli uno dei brani.",
    musicLengthUnread: "Non è stato possibile leggere la durata della tua musica. Scegli un altro file o uno dei brani.",
    musicApprox: "Musica aggiunta; i tagli usano una sincronia approssimativa ({detail}).",
    musicUnreadable: "Impossibile leggere questo file musicale ({detail}). Scegli un altro file o uno dei brani.",
    beatFailed: "rilevamento del ritmo non riuscito",
    beatTimeout: "il rilevamento del ritmo ha richiesto troppo tempo",
    previewFailed: "Impossibile riprodurre l'anteprima: {detail}.",
    noAudio: "non è stato restituito alcun audio",
    draftNoId: "Il Draft «{name}» potrebbe essere stato salvato, ma Selects non ne ha comunicato l'ID. Aprilo dall'elenco dei Draft o crealo di nuovo.",
    draftEmpty: "Il Draft «{name}» non contiene clip. Crealo di nuovo.",
    finishFailed: "Il Draft è stato creato, ma titolo, look e audio delle clip non sono ancora applicati: {detail}. Premi «Completa titolo e look» per riprovare.",
    openFailed: "Il Draft è pronto, ma non è stato possibile aprirlo: {detail}. Usa il link qui sotto o aprilo dall'elenco dei Draft.",
    draftCreated: "Draft creato. Seleziona il titolo o il credito per modificarne parole, colori, dimensione o velocità di decifrazione, una clip per regolarne inquadratura, look o movimento, e la musica per cambiarne il volume. Ricreare genera un nuovo Draft e non mantiene le modifiche dell'Inspector.",
    draftCreatedAdding: "Draft creato; aggiunta di titolo e look…",
    draftNotFinished: "Draft creato, ma titolo, look e audio delle clip non sono ancora applicati.",
    openDraft: "Apri il nuovo Draft",
    copyLink: "Copia il link al nuovo Draft",
    shortened: { one: "Il tuo materiale basta per {fitted} di {count} inquadratura di montaggio, quindi questo video dura circa {seconds} s. Aggiungi altre clip o foto per la durata completa.", many: "Il tuo materiale basta per {fitted} di {count} di inquadrature di montaggio, quindi questo video dura circa {seconds} s. Aggiungi altre clip o foto per la durata completa.", other: "Il tuo materiale basta per {fitted} di {count} inquadrature di montaggio, quindi questo video dura circa {seconds} s. Aggiungi altre clip o foto per la durata completa." },
    note: "Nota: {detail}.",
    draftRecovered: "Selects non ha confermato il nuovo Draft, quindi è stato trovato per nome nell'elenco dei Draft.",
    unchecked: { one: "Non è stato possibile controllare {count} video, che è stato saltato. Crea di nuovo per riprovare.", many: "Non è stato possibile controllare {count} di video, che sono stati saltati. Crea di nuovo per riprovare.", other: "Non è stato possibile controllare {count} video, che sono stati saltati. Crea di nuovo per riprovare." },
    createsDraft: "Crea un nuovo Draft 16:9",
    finishTitle: "Completa titolo e look",
    anotherVersion: "Prova altre inquadrature",
    build: "Crea",
    building: "Creazione",
    "param.motion": "Movimento",
    "param.motionStrength": "Intensità del movimento",
    "param.reveal": "Durata dell'apertura",
    "param.letterbox": "Apertura letterbox",
    "param.look": "Intensità del look",
    "param.warmth": "Calore",
    "param.fade": "Dissolvenza in uscita",
    "param.kicker": "Riga superiore",
    "param.title": "Titolo",
    "param.tagline": "Riga inferiore",
    "param.titleColor": "Colore del titolo",
    "param.textColor": "Colore del testo",
    "param.size": "Dimensione",
    "param.font": "Carattere",
    "param.speed": "Velocità di decifrazione",
    "param.shadow": "Ombra",
    "param.scrim": "Scurisci sfondo",
    "param.prefix": "Prefisso del credito",
    "param.name": "Nome",
    "motion.push-in": "Zoom avanti",
    "motion.pull-out": "Zoom indietro",
    "motion.drift-left": "Scorri a sinistra",
    "motion.drift-right": "Scorri a destra",
    "motion.drift-up": "Scorri in alto",
    "motion.drift-down": "Scorri in basso",
    "motion.tilt": "Inclina",
    "motion.push-drift": "Zoom e scorrimento",
    "tpl.files": "Lettura dei file scelti",
    "tpl.stepDetail": "{name} ({detail})",
    "tpl.done": "Fatto",
    "tpl.noFootage": "Scegli video o foto come materiale, poi riprova.",
    "tpl.noMusic": "Manca la musica di Archive Vlog. Reinstalla il plugin e riprova.",
    "tpl.noStyles": "Mancano gli stili del titolo di Archive Vlog. Reinstalla il plugin e riprova.",
    "tpl.notFound": "Nessuno dei file scelti è stato trovato in questo progetto. Sceglili di nuovo, poi riprova.",
    "tpl.notFoundDetail": "Selects segnala: {detail}",
    "tpl.notLocal": "I file originali di queste clip non sono su questo computer. Importale qui o scarica gli originali, poi riprova.",
    "tpl.notAnalysed": { one: "{count} video è ancora in fase di aggiunta al progetto, quindi non è stato possibile usarlo.", many: "{count} di video sono ancora in fase di aggiunta al progetto, quindi non è stato possibile usarli.", other: "{count} video sono ancora in fase di aggiunta al progetto, quindi non è stato possibile usarli." },
    "tpl.noTitle": "Il Draft «{name}» potrebbe essere stato salvato senza titolo. Aprilo dall'elenco dei Draft o riprova.",
    "tpl.finishFailed": "Il Draft è stato creato, ma non è stato possibile aggiungere titolo e look. Riprova.",
    "tpl.stoppedAt": "Archive Vlog si è fermato a questo passaggio: {step}. Riprova.",
    "tpl.stopped": "Archive Vlog si è fermato prima che il Draft fosse pronto. Riprova.",
  },
  ja: {
    openProject: "Archive Vlog を作成するには、プロジェクトを開いてください。",
    startFailed: "Archive Vlog を起動できませんでした: {detail}。問題が続く場合はプラグインを再インストールしてください。",
    foldersNotFound: "プラグインのフォルダが見つかりませんでした",
    hostTooOld: "Archive Vlog には新しいバージョンの Selects が必要です。Selects をアップデートしてから、このパネルを開き直してください。",
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
    noFootage: "このプロジェクトには、まだ動画クリップがありません。動画クリップを追加してください。自動で更新されます。",
    noClipsSelected: "クリップが選択されていません。「詳細設定」でクリップを選んでください。",
    gap: "",
    ready: "準備完了: {summary}",
    clips: { other: "クリップ {count} 本" },
    clipsSelected: { other: "クリップ {count} 本中 {selected} 本を選択" },
    stillAdding: { other: "{count} 本の動画クリップをプロジェクトに追加中です。自動で更新されます。" },
    localNote: { other: "{count} 本のクリップは Selects で解析されていないため、簡易チェックでショットを選びます。解析済みのクリップのほうが良いショットを選べます。" },
    photos: { other: "写真 {count} 枚" },
    photosSelected: { other: "写真 {count} 枚中 {selected} 枚を選択" },
    style: "スタイル",
    titlePreview: "タイトルのプレビュー",
    previewUnavailable: "プレビューを表示できません。タイトルは Draft に追加されます。",
    replayDecode: "タイトルのアニメーションをもう一度再生",
    decodeFitted: "このテンポではオープニングショットがこのタイトルには短いため、カットの前に読めるようタイトルのデコードを速めます。",
    loading: "読み込み中…",
    "preset.cinematic": "Cinematic",
    "preset.a-day-out": "A Day Out",
    "preset.golden-hour": "Golden Hour",
    fieldCount: "{label}（{used}/{max}）",
    creditShot: "クレジットショット",
    creditName: "クレジットの名前",
    creditPreview: "クレジットのプレビュー",
    creditSample: "{name} はサンプルテキストです。名前を入力するか、クレジットを入れない場合は消してください。",
    creditCleared: "名前なし: クレジットショットはクレジットなしで再生されます。",
    music: "音楽",
    track: "トラック",
    ownMusic: "自分の音楽",
    noMusic: "音楽なし",
    ownMusicHint: { other: "トラックの最初の {count} 分だけを解析して使います。" },
    bpm: "{bpm} BPM",
    sectionHint: "音楽の区間 — ドラッグして選択",
    sectionLabel: "音楽の区間",
    musicTooShort: "このトラックはこの長さには短すぎます",
    startsAt: "{seconds} 秒から開始",
    stopPreview: "プレビューを停止",
    cancelPreview: "プレビューをキャンセル",
    previewSection: "この区間をプレビュー",
    readingMusic: "音楽を読み込み中…",
    musicLengthUnknown: "この音楽の長さがわかりません",
    beatFound: "ビートを検出: {bpm} BPM。カットはビートに合わせます。",
    faintTempo: "テンポ（{bpm} BPM）は見つかりましたがビートが弱いため、カットは {bpm} BPM のグリッドにおおよそ合わせます。",
    outsideTempo: "テンポ（{bpm} BPM）が 70〜160 BPM の範囲外のため、カットはおおよそのタイミングになります。",
    noBeat: "安定したビートが見つからないため、カットはおおよそのタイミングになります。",
    length: "長さ",
    "length.short": "短め",
    "length.standard": "標準",
    "length.long": "長め",
    pace: "ペース",
    "pace.cinematic": "Cinematic",
    "pace.quick": "クイック",
    fitPartial: { other: "{length}: このトラックに収まるのはモンタージュ {count} ショット中 {fitted} ショット（{seconds} 秒）" },
    fitFull: { other: "{length}: モンタージュ {count} ショット（{seconds} 秒）" },
    footageFits: { other: "素材で作れるのはモンタージュ {count} ショット中 {fitted} ショット（{seconds} 秒）" },
    montageBeats: { other: "モンタージュの各ショットは {count} ビート続きます（{seconds} 秒）。" },
    noMusicTiming: "音楽なし: カットは一定の {bpm} BPM のビートに合わせます。",
    faintTempoTiming: "テンポ（{bpm} BPM）は見つかりましたがビートが弱いため、カットは {bpm} BPM のグリッドにおおよそ合わせます。",
    outsideTempoTiming: "テンポが 70〜160 BPM の範囲外です（{bpm} BPM）: カットは一定の {fixed} BPM のビートに合わせます。",
    noBeatTiming: "安定したビートが見つかりません: カットは固定の {bpm} BPM のビートに合わせます。",
    fastTempo: "110 BPM を超えると各ショットのビート数が 2 倍になるため、ショットの長さはゆっくりしたトラックとほぼ同じになります。",
    advanced: "詳細設定",
    clipSound: "クリップの音",
    "sound.off": "オフ",
    "sound.ambient": "環境音",
    "sound.full": "フル",
    cinematicLook: "シネマティックルック",
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
    localChecked: { other: "クリップを確認中 {done}/{count}" },
    stoppedAt: "ステップ {step}/{total}（{name}）で停止しました: {detail}",
    "fail.too-few": "最も短いバージョンでも {total} ショット必要ですが、素材で埋められるのは {filled} ショットだけです。",
    "fail.music-too-short": "このトラックは、この区間からでは最も短いバージョンにも足りません。区間を前に移動するか、もっと長いトラックを選んでください。",
    "fail.music-too-short-seconds": "この区間からではトラックが短すぎます。最も短いバージョンでも音楽が {needed} 秒必要ですが、残りは {available} 秒です。区間を前に移動するか、もっと長いトラックを選んでください。",
    "fail.no-video": "Archive Vlog には動画クリップが 2 本以上必要です。オープニング、クレジット、最後のショットは常に動画なので、写真だけでは作れません。動画クリップを追加するか、クリップをもっと選択してください。",
    "fail.one-video": "Archive Vlog には動画クリップが 2 本以上必要です。1 本はオープニング、もう 1 本はクレジットショットに使います。動画クリップをもう 1 本追加するか、クリップをもっと選択してください。",
    "fail.opening-too-short": "オープニングショットに使える長さの動画クリップがありません。{needed} 秒以上のクリップが必要ですが、最も長いものは {longest} 秒です。もっと長いクリップを追加するか、テンポの速い音楽を選んでください。",
    "fail.ending-too-short": "最後のショットに使える長さの動画クリップがありません。{needed} 秒以上のクリップが必要ですが、最も長いものは {longest} 秒です。もっと長いクリップを追加してください。",
    noPlan: "この素材に合うプランがありません。",
    addFootage: "変化のある素材を追加するか、クリップをもっと選択してください。",
    addFootagePhotos: "変化のある素材や写真を追加するか、クリップをもっと選択してください。",
    retryUnchecked: { other: "{count} 本の動画を確認できませんでした。「作成」を押すと再試行します。" },
    typeTitle: "作成するにはタイトルを入力してください。",
    dropMusic: "音楽ファイルをドロップするか、用意されたトラックを選んでください。",
    musicLengthUnread: "音楽の長さを読み取れませんでした。別のファイルか、用意されたトラックを選んでください。",
    musicApprox: "音楽を追加しました。カットはおおよそのタイミングになります（{detail}）。",
    musicUnreadable: "この音楽ファイルを読み込めませんでした（{detail}）。別のファイルか、用意されたトラックを選んでください。",
    beatFailed: "ビートの検出に失敗しました",
    beatTimeout: "ビートの検出に時間がかかりすぎました",
    previewFailed: "プレビューを再生できませんでした: {detail}。",
    noAudio: "音声が返されませんでした",
    draftNoId: "Draft「{name}」は保存された可能性がありますが、Selects から ID が返されませんでした。Draft の一覧から開くか、もう一度作成してください。",
    draftEmpty: "Draft「{name}」にクリップがありません。もう一度作成してください。",
    finishFailed: "Draft は作成されましたが、タイトル・ルック・クリップの音はまだ適用されていません: {detail}。「タイトルとルックを仕上げる」を押して再試行してください。",
    openFailed: "Draft の準備はできましたが、開けませんでした: {detail}。下のリンクを使うか、Draft 一覧から開いてください。",
    draftCreated: "Draft を作成しました。タイトルやクレジットを選ぶと文字・色・サイズ・デコード速度を、クリップを選ぶと切り抜き・ルック・モーションを、音楽を選ぶと音量を変更できます。作り直すと新しい Draft が作成され、インスペクタでの編集は引き継がれません。",
    draftCreatedAdding: "Draft を作成しました。タイトルとルックを追加中…",
    draftNotFinished: "Draft は作成されましたが、タイトル・ルック・クリップの音はまだ適用されていません。",
    openDraft: "新しい Draft を開く",
    copyLink: "新しい Draft へのリンクをコピー",
    shortened: { other: "素材で作れるのはモンタージュ {count} ショット中 {fitted} ショットのため、この動画は約 {seconds} 秒です。フルの長さにするにはクリップか写真を追加してください。" },
    note: "メモ: {detail}。",
    draftRecovered: "Selects から新しい Draft の確認が返らなかったため、Draft の一覧から名前で見つけました。",
    unchecked: { other: "{count} 本の動画を確認できなかったため、スキップしました。もう一度作成すると再試行します。" },
    createsDraft: "16:9 の新しい Draft を作成します",
    finishTitle: "タイトルとルックを仕上げる",
    anotherVersion: "別のショットで作成",
    build: "作成",
    building: "作成中",
    "param.motion": "モーション",
    "param.motionStrength": "モーションの強さ",
    "param.reveal": "開く時間",
    "param.letterbox": "レターボックスで開く",
    "param.look": "ルックの強さ",
    "param.warmth": "暖かさ",
    "param.fade": "フェードアウト",
    "param.kicker": "上段テキスト",
    "param.title": "タイトル",
    "param.tagline": "下段テキスト",
    "param.titleColor": "タイトルの色",
    "param.textColor": "文字の色",
    "param.size": "サイズ",
    "param.font": "フォント",
    "param.speed": "デコード速度",
    "param.shadow": "影",
    "param.scrim": "背景を暗く",
    "param.prefix": "クレジットの前置き",
    "param.name": "名前",
    "motion.push-in": "ズームイン",
    "motion.pull-out": "ズームアウト",
    "motion.drift-left": "左へスライド",
    "motion.drift-right": "右へスライド",
    "motion.drift-up": "上へスライド",
    "motion.drift-down": "下へスライド",
    "motion.tilt": "傾ける",
    "motion.push-drift": "ズームしてスライド",
    "tpl.files": "選んだファイルを読み込み",
    "tpl.stepDetail": "{name}（{detail}）",
    "tpl.done": "完了",
    "tpl.noFootage": "素材にする動画または写真を選んでから、もう一度お試しください。",
    "tpl.noMusic": "Archive Vlog の音楽が見つかりません。プラグインを再インストールしてから、もう一度お試しください。",
    "tpl.noStyles": "Archive Vlog のタイトルスタイルが見つかりません。プラグインを再インストールしてから、もう一度お試しください。",
    "tpl.notFound": "選んだファイルがこのプロジェクトに見つかりませんでした。選び直してから、もう一度お試しください。",
    "tpl.notFoundDetail": "Selects からの理由: {detail}",
    "tpl.notLocal": "これらのクリップの元ファイルはこのコンピュータにありません。ここで読み込むか元ファイルをダウンロードしてから、もう一度お試しください。",
    "tpl.notAnalysed": { other: "{count} 本の動画はまだプロジェクトに追加中のため、使用できませんでした。" },
    "tpl.noTitle": "Draft「{name}」はタイトルなしで保存された可能性があります。Draft の一覧から開くか、もう一度お試しください。",
    "tpl.finishFailed": "Draft は作成されましたが、タイトルとルックを追加できませんでした。もう一度お試しください。",
    "tpl.stoppedAt": "Archive Vlog は次のステップで停止しました: {step}。もう一度お試しください。",
    "tpl.stopped": "Draft の準備ができる前に Archive Vlog が停止しました。もう一度お試しください。",
  },
  ko: {
    openProject: "Archive Vlog\ub97c \ub9cc\ub4e4\ub824\uba74 \ud504\ub85c\uc81d\ud2b8\ub97c \uc5ec\uc138\uc694.",
    startFailed: "Archive Vlog\ub97c \uc2dc\uc791\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}. \uacc4\uc18d\ub418\uba74 \ud50c\ub7ec\uadf8\uc778\uc744 \ub2e4\uc2dc \uc124\uce58\ud558\uc138\uc694.",
    foldersNotFound: "\ud50c\ub7ec\uadf8\uc778 \ud3f4\ub354\ub97c \ucc3e\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4",
    hostTooOld: "Archive Vlog\ub97c \uc4f0\ub824\uba74 \ub354 \uc0c8\ub85c\uc6b4 \ubc84\uc804\uc758 Selects\uac00 \ud544\uc694\ud569\ub2c8\ub2e4. Selects\ub97c \uc5c5\ub370\uc774\ud2b8\ud55c \ub4a4 \uc774 \ud328\ub110\uc744 \ub2e4\uc2dc \uc5ec\uc138\uc694.",
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
    noFootage: "\uc774 \ud504\ub85c\uc81d\ud2b8\uc5d0\ub294 \uc544\uc9c1 \uc601\uc0c1 \ud074\ub9bd\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. \uc601\uc0c1 \ud074\ub9bd\uc744 \ucd94\uac00\ud558\uc138\uc694. \uc790\ub3d9\uc73c\ub85c \uc5c5\ub370\uc774\ud2b8\ub429\ub2c8\ub2e4.",
    noClipsSelected: "\uc120\ud0dd\ud55c \ud074\ub9bd\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. ‘\uace0\uae09’\uc5d0\uc11c \ud074\ub9bd\uc744 \uc120\ud0dd\ud558\uc138\uc694.",
    gap: " ",
    ready: "\uc900\ube44 \uc644\ub8cc: {summary}",
    clips: { other: "\ud074\ub9bd {count}\uac1c" },
    clipsSelected: { other: "\ud074\ub9bd {count}\uac1c \uc911 {selected}\uac1c \uc120\ud0dd" },
    stillAdding: { other: "\uc601\uc0c1 \ud074\ub9bd {count}\uac1c\ub97c \ud504\ub85c\uc81d\ud2b8\uc5d0 \ucd94\uac00\ud558\ub294 \uc911\uc785\ub2c8\ub2e4. \uc790\ub3d9\uc73c\ub85c \uc5c5\ub370\uc774\ud2b8\ub429\ub2c8\ub2e4." },
    localNote: { other: "\ud074\ub9bd {count}\uac1c\ub294 Selects\uc5d0\uc11c \ubd84\uc11d\ub418\uc9c0 \uc54a\uc544 \ube60\ub978 \ud655\uc778\uc73c\ub85c \uc0f7\uc744 \uace0\ub985\ub2c8\ub2e4. \ubd84\uc11d\ub41c \ud074\ub9bd\uc774\uba74 \ub354 \uc88b\uc740 \uc0f7\uc744 \uace0\ub97c \uc218 \uc788\uc2b5\ub2c8\ub2e4." },
    photos: { other: "\uc0ac\uc9c4 {count}\uc7a5" },
    photosSelected: { other: "\uc0ac\uc9c4 {count}\uc7a5 \uc911 {selected}\uc7a5 \uc120\ud0dd" },
    style: "\uc2a4\ud0c0\uc77c",
    titlePreview: "\ud0c0\uc774\ud2c0 \ubbf8\ub9ac\ubcf4\uae30",
    previewUnavailable: "\ubbf8\ub9ac\ubcf4\uae30\ub97c \ud45c\uc2dc\ud560 \uc218 \uc5c6\uc9c0\ub9cc \ud0c0\uc774\ud2c0\uc740 Draft\uc5d0 \ucd94\uac00\ub429\ub2c8\ub2e4.",
    replayDecode: "\ud0c0\uc774\ud2c0 \uc560\ub2c8\uba54\uc774\uc158 \ub2e4\uc2dc \ubcf4\uae30",
    decodeFitted: "\uc774 \ud15c\ud3ec\uc5d0\uc11c\ub294 \uc624\ud504\ub2dd \uc0f7\uc774 \uc774 \ud0c0\uc774\ud2c0\uc5d0 \ube44\ud574 \uc9e7\uc544\uc11c, \ucef7 \uc804\uc5d0 \uc77d\uc744 \uc218 \uc788\ub3c4\ub85d \ud0c0\uc774\ud2c0\uc774 \ub354 \ube60\ub974\uac8c \ub514\ucf54\ub529\ub429\ub2c8\ub2e4.",
    loading: "\ubd88\ub7ec\uc624\ub294 \uc911…",
    "preset.cinematic": "Cinematic",
    "preset.a-day-out": "A Day Out",
    "preset.golden-hour": "Golden Hour",
    fieldCount: "{label} ({used}/{max})",
    creditShot: "\ud06c\ub808\ub527 \uc0f7",
    creditName: "\ud06c\ub808\ub527 \uc774\ub984",
    creditPreview: "\ud06c\ub808\ub527 \ubbf8\ub9ac\ubcf4\uae30",
    creditSample: "{name}\uc740(\ub294) \uc608\uc2dc \ud14d\uc2a4\ud2b8\uc785\ub2c8\ub2e4. \uc774\ub984\uc744 \uc785\ub825\ud558\uac70\ub098, \ud06c\ub808\ub527\uc744 \ube7c\ub824\uba74 \uc9c0\uc6b0\uc138\uc694.",
    creditCleared: "\uc774\ub984 \uc5c6\uc74c: \ud06c\ub808\ub527 \uc0f7\uc774 \ud06c\ub808\ub527 \uc5c6\uc774 \uc7ac\uc0dd\ub429\ub2c8\ub2e4.",
    music: "\uc74c\uc545",
    track: "\ud2b8\ub799",
    ownMusic: "\ub0b4 \uc74c\uc545",
    noMusic: "\uc74c\uc545 \uc5c6\uc74c",
    ownMusicHint: { other: "\ud2b8\ub799\uc758 \ucc98\uc74c {count}\ubd84\ub9cc \ubd84\uc11d\ud574 \uc0ac\uc6a9\ud569\ub2c8\ub2e4." },
    bpm: "{bpm} BPM",
    sectionHint: "\uc74c\uc545 \uad6c\uac04 — \ub4dc\ub798\uadf8\ud574\uc11c \uc120\ud0dd",
    sectionLabel: "\uc74c\uc545 \uad6c\uac04",
    musicTooShort: "\uc774 \ud2b8\ub799\uc740 \uc774 \uae38\uc774\uc5d0 \ube44\ud574 \ub108\ubb34 \uc9e7\uc2b5\ub2c8\ub2e4",
    startsAt: "{seconds}\ucd08\ubd80\ud130 \uc2dc\uc791",
    stopPreview: "\ubbf8\ub9ac\ub4e3\uae30 \uc911\uc9c0",
    cancelPreview: "\ubbf8\ub9ac\ub4e3\uae30 \ucde8\uc18c",
    previewSection: "\uc774 \uad6c\uac04 \ubbf8\ub9ac\ub4e3\uae30",
    readingMusic: "\uc74c\uc545 \uc77d\ub294 \uc911…",
    musicLengthUnknown: "\uc774 \uc74c\uc545\uc758 \uae38\uc774\ub97c \uc54c \uc218 \uc5c6\uc2b5\ub2c8\ub2e4",
    beatFound: "\ube44\ud2b8 \ucc3e\uc74c: {bpm} BPM. \ucef7\uc774 \ube44\ud2b8\uc5d0 \ub9de\ucdb0\uc9d1\ub2c8\ub2e4.",
    faintTempo: "\ud15c\ud3ec({bpm} BPM)\ub294 \ucc3e\uc558\uc9c0\ub9cc \ube44\ud2b8\uac00 \uc57d\ud574\uc11c \ucef7\uc774 {bpm} BPM \uadf8\ub9ac\ub4dc\uc5d0 \ub300\ub7b5 \ub9de\ucdb0\uc9d1\ub2c8\ub2e4.",
    outsideTempo: "\ud15c\ud3ec({bpm} BPM)\uac00 70~160 BPM \ubc94\uc704\ub97c \ubc97\uc5b4\ub098\uc11c \ucef7\uc774 \ub300\ub7b5\uc801\uc778 \ud0c0\uc774\ubc0d\uc744 \uc501\ub2c8\ub2e4.",
    noBeat: "\uc77c\uc815\ud55c \ube44\ud2b8\ub97c \ucc3e\uc9c0 \ubabb\ud574\uc11c \ucef7\uc774 \ub300\ub7b5\uc801\uc778 \ud0c0\uc774\ubc0d\uc744 \uc501\ub2c8\ub2e4.",
    length: "\uae38\uc774",
    "length.short": "\uc9e7\uac8c",
    "length.standard": "\ubcf4\ud1b5",
    "length.long": "\uae38\uac8c",
    pace: "\ucef7 \uc18d\ub3c4",
    "pace.cinematic": "Cinematic",
    "pace.quick": "\ube60\ub974\uac8c",
    fitPartial: { other: "{length}: \uc774 \ud2b8\ub799\uc5d0 \ubabd\ud0c0\uc8fc \uc0f7 {count}\uac1c \uc911 {fitted}\uac1c\uac00 \ub4e4\uc5b4\uac11\ub2c8\ub2e4 ({seconds}\ucd08)" },
    fitFull: { other: "{length}: \ubabd\ud0c0\uc8fc \uc0f7 {count}\uac1c ({seconds}\ucd08)" },
    footageFits: { other: "\uc601\uc0c1\uc73c\ub85c \ubabd\ud0c0\uc8fc \uc0f7 {count}\uac1c \uc911 {fitted}\uac1c\ub97c \ub9cc\ub4e4 \uc218 \uc788\uc2b5\ub2c8\ub2e4 ({seconds}\ucd08)" },
    montageBeats: { other: "\ubabd\ud0c0\uc8fc \uc0f7 \ud558\ub098\uac00 {count}\ube44\ud2b8 \ub3d9\uc548 \uc774\uc5b4\uc9d1\ub2c8\ub2e4 ({seconds}\ucd08)." },
    noMusicTiming: "\uc74c\uc545 \uc5c6\uc74c: \ucef7\uc774 \uc77c\uc815\ud55c {bpm} BPM \ube44\ud2b8\ub97c \ub530\ub985\ub2c8\ub2e4.",
    faintTempoTiming: "\ud15c\ud3ec({bpm} BPM)\ub294 \ucc3e\uc558\uc9c0\ub9cc \ube44\ud2b8\uac00 \uc57d\ud569\ub2c8\ub2e4: \ucef7\uc774 {bpm} BPM \uadf8\ub9ac\ub4dc\uc5d0 \ub300\ub7b5 \ub9de\ucdb0\uc9d1\ub2c8\ub2e4.",
    outsideTempoTiming: "\ud15c\ud3ec\uac00 70~160 BPM \ubc94\uc704\ub97c \ubc97\uc5b4\ub0ac\uc2b5\ub2c8\ub2e4({bpm} BPM): \ucef7\uc774 \uc77c\uc815\ud55c {fixed} BPM \ube44\ud2b8\ub97c \ub530\ub985\ub2c8\ub2e4.",
    noBeatTiming: "\uc77c\uc815\ud55c \ube44\ud2b8\ub97c \ucc3e\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: \ucef7\uc774 \uace0\uc815\ub41c {bpm} BPM \ube44\ud2b8\ub97c \ub530\ub985\ub2c8\ub2e4.",
    fastTempo: "110 BPM\uc744 \ub118\uc73c\uba74 \uc0f7\ub9c8\ub2e4 \ube44\ud2b8\ub97c \ub450 \ubc30\ub85c \uc368\uc11c, \uc0f7 \uae38\uc774\uac00 \ub290\ub9b0 \ud2b8\ub799\uacfc \ube44\uc2b7\ud558\uac8c \uc720\uc9c0\ub429\ub2c8\ub2e4.",
    advanced: "\uace0\uae09",
    clipSound: "\ud074\ub9bd \uc18c\ub9ac",
    "sound.off": "\ub054",
    "sound.ambient": "\ubc30\uacbd\uc74c",
    "sound.full": "\uc6d0\uc74c",
    cinematicLook: "\uc2dc\ub124\ub9c8\ud2f1 \uc0c9\uac10",
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
    localChecked: { other: "\ud074\ub9bd \ud655\uc778 \uc911 {done}/{count}" },
    stoppedAt: "{step}/{total}\ub2e8\uacc4({name})\uc5d0\uc11c \uc911\ub2e8\ub418\uc5c8\uc2b5\ub2c8\ub2e4: {detail}",
    "fail.too-few": "\uac00\uc7a5 \uc9e7\uc740 \ubc84\uc804\uc5d0\ub3c4 \uc0f7 {total}\uac1c\uac00 \ud544\uc694\ud55c\ub370, \uc601\uc0c1\uc73c\ub85c\ub294 {filled}\uac1c\ub9cc \ucc44\uc6b8 \uc218 \uc788\uc2b5\ub2c8\ub2e4.",
    "fail.music-too-short": "\uc774 \ud2b8\ub799\uc740 \uc774 \uad6c\uac04\ubd80\ud130 \uac00\uc7a5 \uc9e7\uc740 \ubc84\uc804\uc744 \ub9cc\ub4e4\uae30\uc5d0\ub3c4 \ub108\ubb34 \uc9e7\uc2b5\ub2c8\ub2e4. \uad6c\uac04\uc744 \uc55e\uc73c\ub85c \uc62e\uae30\uac70\ub098 \ub354 \uae34 \ud2b8\ub799\uc744 \uc120\ud0dd\ud558\uc138\uc694.",
    "fail.music-too-short-seconds": "\uc774 \uad6c\uac04\ubd80\ud130\ub294 \ud2b8\ub799\uc774 \ub108\ubb34 \uc9e7\uc2b5\ub2c8\ub2e4. \uac00\uc7a5 \uc9e7\uc740 \ubc84\uc804\uc5d0\ub3c4 \uc74c\uc545\uc774 {needed}\ucd08 \ud544\uc694\ud55c\ub370 {available}\ucd08\ub9cc \ub0a8\uc558\uc2b5\ub2c8\ub2e4. \uad6c\uac04\uc744 \uc55e\uc73c\ub85c \uc62e\uae30\uac70\ub098 \ub354 \uae34 \ud2b8\ub799\uc744 \uc120\ud0dd\ud558\uc138\uc694.",
    "fail.no-video": "Archive Vlog\uc5d0\ub294 \uc601\uc0c1 \ud074\ub9bd\uc774 2\uac1c \uc774\uc0c1 \ud544\uc694\ud569\ub2c8\ub2e4. \uc624\ud504\ub2dd, \ud06c\ub808\ub527, \ub9c8\uc9c0\ub9c9 \uc0f7\uc740 \ud56d\uc0c1 \uc601\uc0c1\uc774\ub77c \uc0ac\uc9c4\ub9cc\uc73c\ub85c\ub294 \ub9cc\ub4e4 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4. \uc601\uc0c1 \ud074\ub9bd\uc744 \ucd94\uac00\ud558\uac70\ub098 \ud074\ub9bd\uc744 \ub354 \uc120\ud0dd\ud558\uc138\uc694.",
    "fail.one-video": "Archive Vlog\uc5d0\ub294 \uc601\uc0c1 \ud074\ub9bd\uc774 2\uac1c \uc774\uc0c1 \ud544\uc694\ud569\ub2c8\ub2e4. \ud558\ub098\ub294 \uc624\ud504\ub2dd, \ud558\ub098\ub294 \ud06c\ub808\ub527 \uc0f7\uc5d0 \uc501\ub2c8\ub2e4. \uc601\uc0c1 \ud074\ub9bd\uc744 \ud558\ub098 \ub354 \ucd94\uac00\ud558\uac70\ub098 \ud074\ub9bd\uc744 \ub354 \uc120\ud0dd\ud558\uc138\uc694.",
    "fail.opening-too-short": "\uc624\ud504\ub2dd \uc0f7\uc5d0 \uc4f8 \ub9cc\ud07c \uae34 \uc601\uc0c1 \ud074\ub9bd\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. \ucd5c\uc18c {needed}\ucd08 \uae38\uc774\uc758 \ud074\ub9bd\uc774 \ud544\uc694\ud55c\ub370 \uac00\uc7a5 \uae34 \ud074\ub9bd\uc774 {longest}\ucd08\uc785\ub2c8\ub2e4. \ub354 \uae34 \ud074\ub9bd\uc744 \ucd94\uac00\ud558\uac70\ub098 \ub354 \ube60\ub978 \uc74c\uc545\uc744 \uc120\ud0dd\ud558\uc138\uc694.",
    "fail.ending-too-short": "\ub9c8\uc9c0\ub9c9 \uc0f7\uc5d0 \uc4f8 \ub9cc\ud07c \uae34 \uc601\uc0c1 \ud074\ub9bd\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. \ucd5c\uc18c {needed}\ucd08 \uae38\uc774\uc758 \ud074\ub9bd\uc774 \ud544\uc694\ud55c\ub370 \uac00\uc7a5 \uae34 \ud074\ub9bd\uc774 {longest}\ucd08\uc785\ub2c8\ub2e4. \ub354 \uae34 \ud074\ub9bd\uc744 \ucd94\uac00\ud558\uc138\uc694.",
    noPlan: "\uc774 \uc601\uc0c1\uc5d0 \ub9de\ub294 \uad6c\uc131\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.",
    addFootage: "\ub354 \ub2e4\uc591\ud55c \uc601\uc0c1\uc744 \ucd94\uac00\ud558\uac70\ub098 \ud074\ub9bd\uc744 \ub354 \uc120\ud0dd\ud558\uc138\uc694.",
    addFootagePhotos: "\ub354 \ub2e4\uc591\ud55c \uc601\uc0c1\uc774\ub098 \uc0ac\uc9c4\uc744 \ucd94\uac00\ud558\uac70\ub098 \ud074\ub9bd\uc744 \ub354 \uc120\ud0dd\ud558\uc138\uc694.",
    retryUnchecked: { other: "\ub3d9\uc601\uc0c1 {count}\uac1c\ub97c \ud655\uc778\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. ‘\ub9cc\ub4e4\uae30’\ub97c \ub204\ub974\uba74 \uc7ac\uc2dc\ub3c4\ud569\ub2c8\ub2e4." },
    typeTitle: "\ub9cc\ub4e4\ub824\uba74 \ud0c0\uc774\ud2c0\uc744 \uc785\ub825\ud558\uc138\uc694.",
    dropMusic: "\uc74c\uc545 \ud30c\uc77c\uc744 \ub04c\uc5b4\ub2e4 \ub193\uac70\ub098 \uc81c\uacf5\ub41c \ud2b8\ub799\uc744 \uc120\ud0dd\ud558\uc138\uc694.",
    musicLengthUnread: "\uc74c\uc545\uc758 \uae38\uc774\ub97c \uc77d\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. \ub2e4\ub978 \ud30c\uc77c\uc774\ub098 \uc81c\uacf5\ub41c \ud2b8\ub799\uc744 \uc120\ud0dd\ud558\uc138\uc694.",
    musicApprox: "\uc74c\uc545\uc744 \ucd94\uac00\ud588\uc2b5\ub2c8\ub2e4. \ucef7\uc740 \ub300\ub7b5\uc801\uc778 \ud0c0\uc774\ubc0d\uc744 \uc501\ub2c8\ub2e4 ({detail}).",
    musicUnreadable: "\uc774 \uc74c\uc545 \ud30c\uc77c\uc744 \uc77d\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4({detail}). \ub2e4\ub978 \ud30c\uc77c\uc774\ub098 \uc81c\uacf5\ub41c \ud2b8\ub799\uc744 \uc120\ud0dd\ud558\uc138\uc694.",
    beatFailed: "\ube44\ud2b8 \uac10\uc9c0\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4",
    beatTimeout: "\ube44\ud2b8 \uac10\uc9c0\uc5d0 \uc2dc\uac04\uc774 \ub108\ubb34 \uc624\ub798 \uac78\ub838\uc2b5\ub2c8\ub2e4",
    previewFailed: "\ubbf8\ub9ac\ub4e3\uae30\ub97c \uc7ac\uc0dd\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}.",
    noAudio: "\uc624\ub514\uc624\uac00 \ub3cc\uc544\uc624\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4",
    draftNoId: "Draft ‘{name}’\uc774(\uac00) \uc800\uc7a5\ub418\uc5c8\uc744 \uc218 \uc788\uc9c0\ub9cc Selects\uac00 ID\ub97c \uc54c\ub824 \uc8fc\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4. Draft \ubaa9\ub85d\uc5d0\uc11c \uc5f4\uac70\ub098 \ub2e4\uc2dc \ub9cc\ub4dc\uc138\uc694.",
    draftEmpty: "Draft ‘{name}’\uc5d0 \ud074\ub9bd\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \ub9cc\ub4dc\uc138\uc694.",
    finishFailed: "Draft\ub294 \ub9cc\ub4e4\uc5c8\uc9c0\ub9cc \ud0c0\uc774\ud2c0, \uc0c9\uac10, \ud074\ub9bd \uc18c\ub9ac\uac00 \uc544\uc9c1 \uc801\uc6a9\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4: {detail}. ‘\ud0c0\uc774\ud2c0\uacfc \uc0c9\uac10 \ub9c8\ubb34\ub9ac’\ub97c \ub20c\ub7ec \ub2e4\uc2dc \uc2dc\ub3c4\ud558\uc138\uc694.",
    openFailed: "Draft\ub294 \uc900\ube44\ub418\uc5c8\uc9c0\ub9cc \uc5f4\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: {detail}. \uc544\ub798 \ub9c1\ud06c\ub97c \uc4f0\uac70\ub098 Draft \ubaa9\ub85d\uc5d0\uc11c \uc5ec\uc138\uc694.",
    draftCreated: "Draft\ub97c \ub9cc\ub4e4\uc5c8\uc2b5\ub2c8\ub2e4. \ud0c0\uc774\ud2c0\uc774\ub098 \ud06c\ub808\ub527\uc744 \uc120\ud0dd\ud558\uba74 \uae00\uc790, \uc0c9, \ud06c\uae30, \ub514\ucf54\ub529 \uc18d\ub3c4\ub97c, \ud074\ub9bd\uc744 \uc120\ud0dd\ud558\uba74 \ud06c\ub86d, \uc0c9\uac10, \ubaa8\uc158\uc744, \uc74c\uc545\uc744 \uc120\ud0dd\ud558\uba74 \ubcfc\ub968\uc744 \ubc14\uafc0 \uc218 \uc788\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \ub9cc\ub4e4\uba74 \uc0c8 Draft\uac00 \uc0dd\uae30\uace0 \uc778\uc2a4\ud399\ud130\uc5d0\uc11c \ud55c \ud3b8\uc9d1\uc740 \uc720\uc9c0\ub418\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.",
    draftCreatedAdding: "Draft\ub97c \ub9cc\ub4e4\uc5c8\uc2b5\ub2c8\ub2e4. \ud0c0\uc774\ud2c0\uacfc \uc0c9\uac10\uc744 \ucd94\uac00\ud558\ub294 \uc911…",
    draftNotFinished: "Draft\ub294 \ub9cc\ub4e4\uc5c8\uc9c0\ub9cc \ud0c0\uc774\ud2c0, \uc0c9\uac10, \ud074\ub9bd \uc18c\ub9ac\uac00 \uc544\uc9c1 \uc801\uc6a9\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4.",
    openDraft: "\uc0c8 Draft \uc5f4\uae30",
    copyLink: "\uc0c8 Draft \ub9c1\ud06c \ubcf5\uc0ac",
    shortened: { other: "\uc601\uc0c1\uc73c\ub85c \ubabd\ud0c0\uc8fc \uc0f7 {count}\uac1c \uc911 {fitted}\uac1c\ub9cc \ub9cc\ub4e4 \uc218 \uc788\uc5b4 \uc774 \ub3d9\uc601\uc0c1\uc740 \uc57d {seconds}\ucd08\uc785\ub2c8\ub2e4. \uc804\uccb4 \uae38\uc774\ub85c \ub9cc\ub4e4\ub824\uba74 \ud074\ub9bd\uc774\ub098 \uc0ac\uc9c4\uc744 \ub354 \ucd94\uac00\ud558\uc138\uc694." },
    note: "\ucc38\uace0: {detail}.",
    draftRecovered: "Selects\uac00 \uc0c8 Draft\ub97c \ud655\uc778\ud574 \uc8fc\uc9c0 \uc54a\uc544 Draft \ubaa9\ub85d\uc5d0\uc11c \uc774\ub984\uc73c\ub85c \ucc3e\uc558\uc2b5\ub2c8\ub2e4.",
    unchecked: { other: "\ub3d9\uc601\uc0c1 {count}\uac1c\ub97c \ud655\uc778\ud558\uc9c0 \ubabb\ud574 \uac74\ub108\ub6f0\uc5c8\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \ub9cc\ub4e4\uba74 \uc7ac\uc2dc\ub3c4\ud569\ub2c8\ub2e4." },
    createsDraft: "\uc0c8 16:9 Draft\ub97c \ub9cc\ub4ed\ub2c8\ub2e4",
    finishTitle: "\ud0c0\uc774\ud2c0\uacfc \uc0c9\uac10 \ub9c8\ubb34\ub9ac",
    anotherVersion: "\ub2e4\ub978 \uc0f7\uc73c\ub85c \ub9cc\ub4e4\uae30",
    build: "\ub9cc\ub4e4\uae30",
    building: "\ub9cc\ub4dc\ub294 \uc911",
    "param.motion": "\ubaa8\uc158",
    "param.motionStrength": "\ubaa8\uc158 \uac15\ub3c4",
    "param.reveal": "\uc5f4\ub9bc \uc2dc\uac04",
    "param.letterbox": "\ub808\ud130\ubc15\uc2a4 \uc5f4\ub9bc",
    "param.look": "\uc0c9\uac10 \uac15\ub3c4",
    "param.warmth": "\ub530\ub73b\ud568",
    "param.fade": "\ud398\uc774\ub4dc\uc544\uc6c3",
    "param.kicker": "\uc0c1\ub2e8 \ubb38\uad6c",
    "param.title": "\ud0c0\uc774\ud2c0",
    "param.tagline": "\ud558\ub2e8 \ubb38\uad6c",
    "param.titleColor": "\ud0c0\uc774\ud2c0 \uc0c9",
    "param.textColor": "\uae00\uc790 \uc0c9",
    "param.size": "\ud06c\uae30",
    "param.font": "\ud3f0\ud2b8",
    "param.speed": "\ub514\ucf54\ub529 \uc18d\ub3c4",
    "param.shadow": "\uadf8\ub9bc\uc790",
    "param.scrim": "\ubc30\uacbd \uc5b4\ub461\uac8c",
    "param.prefix": "\ud06c\ub808\ub527 \uc55e \ubb38\uad6c",
    "param.name": "\uc774\ub984",
    "motion.push-in": "\uc90c \uc778",
    "motion.pull-out": "\uc90c \uc544\uc6c3",
    "motion.drift-left": "\uc67c\ucabd\uc73c\ub85c \uc774\ub3d9",
    "motion.drift-right": "\uc624\ub978\ucabd\uc73c\ub85c \uc774\ub3d9",
    "motion.drift-up": "\uc704\ub85c \uc774\ub3d9",
    "motion.drift-down": "\uc544\ub798\ub85c \uc774\ub3d9",
    "motion.tilt": "\uae30\uc6b8\uc774\uae30",
    "motion.push-drift": "\uc90c \uc778\ud558\uba70 \uc774\ub3d9",
    "tpl.files": "\uc120\ud0dd\ud55c \ud30c\uc77c \uc77d\uae30",
    "tpl.stepDetail": "{name} ({detail})",
    "tpl.done": "\uc644\ub8cc",
    "tpl.noFootage": "\uc601\uc0c1\uc73c\ub85c \uc4f8 \ub3d9\uc601\uc0c1\uc774\ub098 \uc0ac\uc9c4\uc744 \uc120\ud0dd\ud55c \ub4a4 \ub2e4\uc2dc \uc2dc\ub3c4\ud558\uc138\uc694.",
    "tpl.noMusic": "Archive Vlog\uc758 \uc74c\uc545\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. \ud50c\ub7ec\uadf8\uc778\uc744 \ub2e4\uc2dc \uc124\uce58\ud55c \ub4a4 \ub2e4\uc2dc \uc2dc\ub3c4\ud558\uc138\uc694.",
    "tpl.noStyles": "Archive Vlog\uc758 \ud0c0\uc774\ud2c0 \uc2a4\ud0c0\uc77c\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. \ud50c\ub7ec\uadf8\uc778\uc744 \ub2e4\uc2dc \uc124\uce58\ud55c \ub4a4 \ub2e4\uc2dc \uc2dc\ub3c4\ud558\uc138\uc694.",
    "tpl.notFound": "\uc120\ud0dd\ud55c \ud30c\uc77c\uc744 \uc774 \ud504\ub85c\uc81d\ud2b8\uc5d0\uc11c \ud558\ub098\ub3c4 \ucc3e\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \uc120\ud0dd\ud55c \ub4a4 \ub2e4\uc2dc \uc2dc\ub3c4\ud558\uc138\uc694.",
    "tpl.notFoundDetail": "Selects \uba54\uc2dc\uc9c0: {detail}",
    "tpl.notLocal": "\uc774 \ud074\ub9bd\ub4e4\uc758 \uc6d0\ubcf8 \ud30c\uc77c\uc774 \uc774 \ucef4\ud4e8\ud130\uc5d0 \uc5c6\uc2b5\ub2c8\ub2e4. \uc5ec\uae30\uc11c \uac00\uc838\uc624\uac70\ub098 \uc6d0\ubcf8\uc744 \ub0b4\ub824\ubc1b\uc740 \ub4a4 \ub2e4\uc2dc \uc2dc\ub3c4\ud558\uc138\uc694.",
    "tpl.notAnalysed": { other: "\ub3d9\uc601\uc0c1 {count}\uac1c\uac00 \uc544\uc9c1 \ud504\ub85c\uc81d\ud2b8\uc5d0 \ucd94\uac00\ub418\ub294 \uc911\uc774\ub77c \uc0ac\uc6a9\ud560 \uc218 \uc5c6\uc5c8\uc2b5\ub2c8\ub2e4." },
    "tpl.noTitle": "Draft ‘{name}’\uc774(\uac00) \ud0c0\uc774\ud2c0 \uc5c6\uc774 \uc800\uc7a5\ub418\uc5c8\uc744 \uc218 \uc788\uc2b5\ub2c8\ub2e4. Draft \ubaa9\ub85d\uc5d0\uc11c \uc5f4\uac70\ub098 \ub2e4\uc2dc \uc2dc\ub3c4\ud558\uc138\uc694.",
    "tpl.finishFailed": "Draft\ub294 \ub9cc\ub4e4\uc5b4\uc84c\uc9c0\ub9cc \ud0c0\uc774\ud2c0\uacfc \uc0c9\uac10\uc744 \ucd94\uac00\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \uc2dc\ub3c4\ud558\uc138\uc694.",
    "tpl.stoppedAt": "Archive Vlog\uac00 \uc774 \ub2e8\uacc4\uc5d0\uc11c \uc911\ub2e8\ub418\uc5c8\uc2b5\ub2c8\ub2e4: {step}. \ub2e4\uc2dc \uc2dc\ub3c4\ud558\uc138\uc694.",
    "tpl.stopped": "Draft\uac00 \uc900\ube44\ub418\uae30 \uc804\uc5d0 Archive Vlog\uac00 \uc911\ub2e8\ub418\uc5c8\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \uc2dc\ub3c4\ud558\uc138\uc694.",
  },
  pt: {
    openProject: "Abra um projeto para criar um Archive Vlog.",
    startFailed: "O Archive Vlog não conseguiu iniciar: {detail}. Reinstale o plugin se o problema continuar.",
    foldersNotFound: "as pastas do plugin não foram encontradas",
    hostTooOld: "O Archive Vlog precisa de uma versão mais recente do Selects. Atualize o Selects e abra este painel de novo.",
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
    noFootage: "Este projeto ainda não tem clipes de vídeo. Adicione clipes de vídeo; a lista é atualizada automaticamente.",
    noClipsSelected: "Nenhum clipe selecionado. Escolha clipes em “Avançado”.",
    gap: " ",
    ready: "Pronto: {summary}",
    clips: { one: "{count} clipe", many: "{count} de clipes", other: "{count} clipes" },
    clipsSelected: { one: "{selected} de {count} clipe selecionado", many: "{selected} de {count} de clipes selecionados", other: "{selected} de {count} clipes selecionados" },
    stillAdding: { one: "{count} clipe de vídeo ainda está sendo adicionado ao projeto. Isto se atualiza automaticamente.", many: "{count} de clipes de vídeo ainda estão sendo adicionados ao projeto. Isto se atualiza automaticamente.", other: "{count} clipes de vídeo ainda estão sendo adicionados ao projeto. Isto se atualiza automaticamente." },
    localNote: { one: "{count} clipe não foi analisado no Selects, então os planos dele vêm de uma verificação rápida. Clipes analisados rendem escolhas melhores.", many: "{count} de clipes não foram analisados no Selects, então os planos deles vêm de uma verificação rápida. Clipes analisados rendem escolhas melhores.", other: "{count} clipes não foram analisados no Selects, então os planos deles vêm de uma verificação rápida. Clipes analisados rendem escolhas melhores." },
    photos: { one: "{count} foto", many: "{count} de fotos", other: "{count} fotos" },
    photosSelected: { one: "{selected} de {count} foto selecionada", many: "{selected} de {count} de fotos selecionadas", other: "{selected} de {count} fotos selecionadas" },
    style: "Estilo",
    titlePreview: "Prévia do título",
    previewUnavailable: "Prévia indisponível; o título ainda será adicionado ao Draft.",
    replayDecode: "Repetir a animação do título",
    decodeFitted: "O plano de abertura é curto para este título neste andamento, então o título se decifra mais rápido para ficar legível antes do corte.",
    loading: "Carregando…",
    "preset.cinematic": "Cinematic",
    "preset.a-day-out": "A Day Out",
    "preset.golden-hour": "Golden Hour",
    fieldCount: "{label} ({used}/{max})",
    creditShot: "Plano do crédito",
    creditName: "Nome no crédito",
    creditPreview: "Prévia do crédito",
    creditSample: "{name} é um texto de exemplo: digite seu nome ou apague-o para deixar o crédito de fora.",
    creditCleared: "Sem nome: o plano do crédito é exibido sem crédito.",
    music: "Música",
    track: "Faixa",
    ownMusic: "Sua própria música",
    noMusic: "Sem música",
    ownMusicHint: { one: "Só o primeiro {count} minuto da sua faixa é analisado e usado.", many: "Só os primeiros {count} de minutos da sua faixa são analisados e usados.", other: "Só os primeiros {count} minutos da sua faixa são analisados e usados." },
    bpm: "{bpm} BPM",
    sectionHint: "Trecho da música: arraste para escolher",
    sectionLabel: "Trecho da música",
    musicTooShort: "Esta faixa é curta demais para esta duração",
    startsAt: "Começa em {seconds} s",
    stopPreview: "Parar a prévia",
    cancelPreview: "Cancelar a prévia",
    previewSection: "Ouvir este trecho",
    readingMusic: "Lendo a música…",
    musicLengthUnknown: "A duração desta música é desconhecida",
    beatFound: "Batida encontrada: {bpm} BPM. Os cortes seguem a batida.",
    faintTempo: "Andamento encontrado ({bpm} BPM), mas a batida é fraca, então os cortes seguem aproximadamente uma grade de {bpm} BPM.",
    outsideTempo: "O andamento ({bpm} BPM) está fora da faixa de 70–160 BPM, então os cortes usam uma sincronia aproximada.",
    noBeat: "Nenhuma batida regular encontrada, então os cortes usam uma sincronia aproximada.",
    length: "Duração",
    "length.short": "Curta",
    "length.standard": "Padrão",
    "length.long": "Longa",
    pace: "Cadência",
    "pace.cinematic": "Cinematic",
    "pace.quick": "Rápida",
    fitPartial: { one: "{length}: {fitted} de {count} plano de montagem cabem nesta faixa ({seconds} s)", many: "{length}: {fitted} de {count} de planos de montagem cabem nesta faixa ({seconds} s)", other: "{length}: {fitted} de {count} planos de montagem cabem nesta faixa ({seconds} s)" },
    fitFull: { one: "{length}: {count} plano de montagem ({seconds} s)", many: "{length}: {count} de planos de montagem ({seconds} s)", other: "{length}: {count} planos de montagem ({seconds} s)" },
    footageFits: { one: "Seu material dá para {fitted} de {count} plano de montagem ({seconds} s)", many: "Seu material dá para {fitted} de {count} de planos de montagem ({seconds} s)", other: "Seu material dá para {fitted} de {count} planos de montagem ({seconds} s)" },
    montageBeats: { one: "Os planos de montagem duram {count} batida ({seconds} s).", many: "Os planos de montagem duram {count} de batidas ({seconds} s).", other: "Os planos de montagem duram {count} batidas ({seconds} s)." },
    noMusicTiming: "Sem música: os cortes seguem uma batida constante de {bpm} BPM.",
    faintTempoTiming: "Andamento encontrado ({bpm} BPM), mas a batida é fraca: os cortes seguem aproximadamente uma grade de {bpm} BPM.",
    outsideTempoTiming: "Andamento fora da faixa de 70–160 BPM ({bpm} BPM): os cortes seguem uma batida constante de {fixed} BPM.",
    noBeatTiming: "Nenhuma batida regular encontrada: os cortes seguem uma batida fixa de {bpm} BPM.",
    fastTempo: "Acima de 110 BPM cada plano dura o dobro de batidas, então os planos duram mais ou menos o mesmo que numa faixa mais lenta.",
    advanced: "Avançado",
    clipSound: "Som dos clipes",
    "sound.off": "Desligado",
    "sound.ambient": "Ambiente",
    "sound.full": "Total",
    cinematicLook: "Look cinematográfico",
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
    localChecked: { one: "Verificando clipes: {done}/{count}", many: "Verificando clipes: {done}/{count}", other: "Verificando clipes: {done}/{count}" },
    stoppedAt: "Parou na etapa {step}/{total}, {name}: {detail}",
    "fail.too-few": "Seu material preenche só {filled} dos {total} planos de que até a versão mais curta precisa.",
    "fail.music-too-short": "Esta faixa é curta demais até para a versão mais curta a partir deste trecho. Mova o trecho para mais perto do início ou escolha uma faixa mais longa.",
    "fail.music-too-short-seconds": "Esta faixa é curta demais a partir deste trecho: até a versão mais curta precisa de {needed} s de música e só restam {available} s. Mova o trecho para mais perto do início ou escolha uma faixa mais longa.",
    "fail.no-video": "O Archive Vlog precisa de pelo menos 2 clipes de vídeo: os planos de abertura, do crédito e final são sempre vídeo, então só fotos não bastam. Adicione clipes de vídeo ou selecione mais clipes.",
    "fail.one-video": "O Archive Vlog precisa de pelo menos 2 clipes de vídeo: um para a abertura e outro para o plano do crédito. Adicione outro clipe de vídeo ou selecione mais clipes.",
    "fail.opening-too-short": "Nenhum clipe de vídeo é longo o bastante para o plano de abertura: ele precisa de um clipe de pelo menos {needed} s, e o mais longo tem {longest} s. Adicione um clipe mais longo ou escolha uma música mais rápida.",
    "fail.ending-too-short": "Nenhum clipe de vídeo é longo o bastante para o plano final: ele precisa de um clipe de pelo menos {needed} s, e o mais longo tem {longest} s. Adicione um clipe mais longo.",
    noPlan: "Nenhum plano se encaixa neste material.",
    addFootage: "Adicione material mais variado ou selecione mais clipes.",
    addFootagePhotos: "Adicione material mais variado ou fotos, ou selecione mais clipes.",
    retryUnchecked: { one: "Não foi possível verificar {count} vídeo; pressione “Criar” para tentar de novo.", many: "Não foi possível verificar {count} de vídeos; pressione “Criar” para tentar de novo.", other: "Não foi possível verificar {count} vídeos; pressione “Criar” para tentar de novo." },
    typeTitle: "Digite um título para criar.",
    dropMusic: "Solte um arquivo de música ou escolha uma das faixas.",
    musicLengthUnread: "Não foi possível ler a duração da sua música. Escolha outro arquivo ou uma das faixas.",
    musicApprox: "Música adicionada; os cortes usam uma sincronia aproximada ({detail}).",
    musicUnreadable: "Não foi possível ler este arquivo de música ({detail}). Escolha outro arquivo ou uma das faixas.",
    beatFailed: "a detecção da batida falhou",
    beatTimeout: "a detecção da batida demorou demais",
    previewFailed: "Não foi possível reproduzir a prévia: {detail}.",
    noAudio: "nenhum áudio foi retornado",
    draftNoId: "O Draft “{name}” pode ter sido salvo, mas o Selects não informou o ID dele. Abra-o na lista de Drafts ou crie de novo.",
    draftEmpty: "O Draft “{name}” não tem clipes. Crie de novo.",
    finishFailed: "O Draft foi criado, mas o título, o look e o som dos clipes ainda não foram aplicados: {detail}. Pressione “Concluir título e look” para tentar de novo.",
    openFailed: "O Draft está pronto, mas não pôde ser aberto: {detail}. Use o link abaixo ou abra-o pela lista de Drafts.",
    draftCreated: "Draft criado. Selecione o título ou o crédito para editar as palavras, as cores, o tamanho ou a velocidade de decifração; um clipe para ajustar o enquadramento, o look ou o movimento; e a música para mudar o volume. Criar de novo gera um novo Draft e não mantém as edições do Inspetor.",
    draftCreatedAdding: "Draft criado; adicionando título e look…",
    draftNotFinished: "Draft criado, mas o título, o look e o som dos clipes ainda não foram aplicados.",
    openDraft: "Abrir o novo Draft",
    copyLink: "Copiar o link do novo Draft",
    shortened: { one: "Seu material dá para {fitted} de {count} plano de montagem, então este vídeo tem cerca de {seconds} s. Adicione mais clipes ou fotos para a duração completa.", many: "Seu material dá para {fitted} de {count} de planos de montagem, então este vídeo tem cerca de {seconds} s. Adicione mais clipes ou fotos para a duração completa.", other: "Seu material dá para {fitted} de {count} planos de montagem, então este vídeo tem cerca de {seconds} s. Adicione mais clipes ou fotos para a duração completa." },
    note: "Observação: {detail}.",
    draftRecovered: "O Selects não confirmou o novo Draft, então ele foi encontrado pelo nome na lista de Drafts.",
    unchecked: { one: "Não foi possível verificar {count} vídeo; ele foi ignorado. Crie de novo para tentar outra vez.", many: "Não foi possível verificar {count} de vídeos; eles foram ignorados. Crie de novo para tentar outra vez.", other: "Não foi possível verificar {count} vídeos; eles foram ignorados. Crie de novo para tentar outra vez." },
    createsDraft: "Cria um novo Draft 16:9",
    finishTitle: "Concluir título e look",
    anotherVersion: "Testar outros planos",
    build: "Criar",
    building: "Criando",
    "param.motion": "Movimento",
    "param.motionStrength": "Intensidade do movimento",
    "param.reveal": "Duração da abertura",
    "param.letterbox": "Abertura letterbox",
    "param.look": "Intensidade do look",
    "param.warmth": "Calor",
    "param.fade": "Fade de saída",
    "param.kicker": "Linha superior",
    "param.title": "Título",
    "param.tagline": "Linha inferior",
    "param.titleColor": "Cor do título",
    "param.textColor": "Cor do texto",
    "param.size": "Tamanho",
    "param.font": "Fonte",
    "param.speed": "Velocidade de decifração",
    "param.shadow": "Sombra",
    "param.scrim": "Escurecer fundo",
    "param.prefix": "Prefixo do crédito",
    "param.name": "Nome",
    "motion.push-in": "Aproximar",
    "motion.pull-out": "Afastar",
    "motion.drift-left": "Deslizar para a esquerda",
    "motion.drift-right": "Deslizar para a direita",
    "motion.drift-up": "Deslizar para cima",
    "motion.drift-down": "Deslizar para baixo",
    "motion.tilt": "Inclinar",
    "motion.push-drift": "Aproximar e deslizar",
    "tpl.files": "Lendo os arquivos escolhidos",
    "tpl.stepDetail": "{name} ({detail})",
    "tpl.done": "Pronto",
    "tpl.noFootage": "Escolha vídeos ou fotos como material e tente de novo.",
    "tpl.noMusic": "A música do Archive Vlog está faltando. Reinstale o plugin e tente de novo.",
    "tpl.noStyles": "Os estilos de título do Archive Vlog estão faltando. Reinstale o plugin e tente de novo.",
    "tpl.notFound": "Nenhum dos arquivos escolhidos foi encontrado neste projeto. Escolha-os de novo e tente outra vez.",
    "tpl.notFoundDetail": "O Selects informou: {detail}",
    "tpl.notLocal": "Os arquivos originais destes clipes não estão neste computador. Importe-os aqui ou baixe os originais e tente de novo.",
    "tpl.notAnalysed": { one: "{count} vídeo ainda está sendo adicionado ao projeto, então não pôde ser usado.", many: "{count} de vídeos ainda estão sendo adicionados ao projeto, então não puderam ser usados.", other: "{count} vídeos ainda estão sendo adicionados ao projeto, então não puderam ser usados." },
    "tpl.noTitle": "O Draft “{name}” pode ter sido salvo sem o título. Abra-o na lista de Drafts ou tente de novo.",
    "tpl.finishFailed": "O Draft foi criado, mas não foi possível adicionar o título e o look. Tente de novo.",
    "tpl.stoppedAt": "O Archive Vlog parou nesta etapa: {step}. Tente de novo.",
    "tpl.stopped": "O Archive Vlog parou antes de o Draft ficar pronto. Tente de novo.",
  },
  tr: {
    openProject: "Archive Vlog oluşturmak için bir proje açın.",
    startFailed: "Archive Vlog başlatılamadı: {detail}. Sorun sürerse eklentiyi yeniden yükleyin.",
    foldersNotFound: "eklenti klasörleri bulunamadı",
    hostTooOld: "Archive Vlog, Selects'in daha yeni bir sürümünü gerektiriyor. Selects'i güncelleyin, ardından bu paneli yeniden açın.",
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
    noFootage: "Bu projede henüz video klip yok. Video klipleri ekleyin; burası otomatik olarak güncellenir.",
    noClipsSelected: "Klip seçilmedi. “Gelişmiş” bölümünden klip seçin.",
    gap: " ",
    ready: "Hazır: {summary}",
    clips: { one: "{count} klip", other: "{count} klip" },
    clipsSelected: { one: "{count} klipten {selected} tanesi seçili", other: "{count} klipten {selected} tanesi seçili" },
    stillAdding: { one: "{count} video klip hâlâ projeye ekleniyor. Bu otomatik olarak güncellenir.", other: "{count} video klip hâlâ projeye ekleniyor. Bu otomatik olarak güncellenir." },
    localNote: { one: "{count} klip Selects'te analiz edilmedi, bu yüzden çekimleri hızlı bir kontrolle seçiliyor. Analiz edilmiş klipler daha iyi seçimler sağlar.", other: "{count} klip Selects'te analiz edilmedi, bu yüzden çekimleri hızlı bir kontrolle seçiliyor. Analiz edilmiş klipler daha iyi seçimler sağlar." },
    photos: { one: "{count} fotoğraf", other: "{count} fotoğraf" },
    photosSelected: { one: "{count} fotoğraftan {selected} tanesi seçili", other: "{count} fotoğraftan {selected} tanesi seçili" },
    style: "Stil",
    titlePreview: "Başlık önizlemesi",
    previewUnavailable: "Önizleme kullanılamıyor; başlık yine de Draft'a eklenir.",
    replayDecode: "Başlık animasyonunu yeniden oynat",
    decodeFitted: "Bu tempoda açılış çekimi bu başlık için kısa; bu yüzden başlık, kesmeden önce okunabilsin diye daha hızlı çözülür.",
    loading: "Yükleniyor…",
    "preset.cinematic": "Cinematic",
    "preset.a-day-out": "A Day Out",
    "preset.golden-hour": "Golden Hour",
    fieldCount: "{label} ({used}/{max})",
    creditShot: "Jenerik çekimi",
    creditName: "Jenerikteki ad",
    creditPreview: "Jenerik önizlemesi",
    creditSample: "{name} örnek metindir: adınızı yazın veya jeneriği çıkarmak için silin.",
    creditCleared: "Ad yok: jenerik çekimi jeneriksiz oynatılır.",
    music: "Müzik",
    track: "Parça",
    ownMusic: "Kendi müziğiniz",
    noMusic: "Müzik yok",
    ownMusicHint: { one: "Parçanızın yalnızca ilk {count} dakikası analiz edilir ve kullanılır.", other: "Parçanızın yalnızca ilk {count} dakikası analiz edilir ve kullanılır." },
    bpm: "{bpm} BPM",
    sectionHint: "Müzik bölümü — seçmek için sürükleyin",
    sectionLabel: "Müzik bölümü",
    musicTooShort: "Bu parça bu uzunluk için çok kısa",
    startsAt: "{seconds} sn'de başlar",
    stopPreview: "Önizlemeyi durdur",
    cancelPreview: "Önizlemeyi iptal et",
    previewSection: "Bu bölümü önizle",
    readingMusic: "Müzik okunuyor…",
    musicLengthUnknown: "Bu müziğin uzunluğu bilinmiyor",
    beatFound: "Ritim bulundu: {bpm} BPM. Kesmeler ritmi izler.",
    faintTempo: "Tempo bulundu ({bpm} BPM) ama ritim zayıf, bu yüzden kesmeler yaklaşık olarak {bpm} BPM'lik bir ızgarayı izler.",
    outsideTempo: "Temposu ({bpm} BPM) 70–160 BPM aralığının dışında, bu yüzden kesmeler yaklaşık zamanlama kullanır.",
    noBeat: "Düzenli bir ritim bulunamadı, bu yüzden kesmeler yaklaşık zamanlama kullanır.",
    length: "Uzunluk",
    "length.short": "Kısa",
    "length.standard": "Standart",
    "length.long": "Uzun",
    pace: "Kurgu hızı",
    "pace.cinematic": "Cinematic",
    "pace.quick": "Hızlı",
    fitPartial: { one: "{length}: {count} montaj çekiminden {fitted} tanesi bu parçaya sığıyor ({seconds} sn)", other: "{length}: {count} montaj çekiminden {fitted} tanesi bu parçaya sığıyor ({seconds} sn)" },
    fitFull: { one: "{length}: {count} montaj çekimi ({seconds} sn)", other: "{length}: {count} montaj çekimi ({seconds} sn)" },
    footageFits: { one: "Görüntüleriniz {count} montaj çekiminden {fitted} tanesine yetiyor ({seconds} sn)", other: "Görüntüleriniz {count} montaj çekiminden {fitted} tanesine yetiyor ({seconds} sn)" },
    montageBeats: { one: "Montaj çekimleri {count} vuruş sürer ({seconds} sn).", other: "Montaj çekimleri {count} vuruş sürer ({seconds} sn)." },
    noMusicTiming: "Müzik yok: kesmeler sabit {bpm} BPM'lik bir ritmi izler.",
    faintTempoTiming: "Tempo bulundu ({bpm} BPM) ama ritim zayıf: kesmeler yaklaşık olarak {bpm} BPM'lik bir ızgarayı izler.",
    outsideTempoTiming: "Tempo 70–160 BPM aralığının dışında ({bpm} BPM): kesmeler sabit {fixed} BPM'lik bir ritmi izler.",
    noBeatTiming: "Düzenli bir ritim bulunamadı: kesmeler sabit {bpm} BPM'lik bir ritmi izler.",
    fastTempo: "110 BPM'in üzerinde her çekim iki kat vuruş sürer; böylece çekimler daha yavaş bir parçadakiyle aşağı yukarı aynı uzunlukta olur.",
    advanced: "Gelişmiş",
    clipSound: "Klip sesi",
    "sound.off": "Kapalı",
    "sound.ambient": "Ortam",
    "sound.full": "Tam",
    cinematicLook: "Sinematik görünüm",
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
    localChecked: { one: "Klipler kontrol ediliyor: {done}/{count}", other: "Klipler kontrol ediliyor: {done}/{count}" },
    stoppedAt: "{step}/{total}. adımda durdu, {name}: {detail}",
    "fail.too-few": "Görüntüleriniz, en kısa sürümün bile ihtiyaç duyduğu {total} çekimin yalnızca {filled} tanesini dolduruyor.",
    "fail.music-too-short": "Bu parça, bu bölümden itibaren en kısa sürüm için bile çok kısa. Bölümü daha başa taşıyın veya daha uzun bir parça seçin.",
    "fail.music-too-short-seconds": "Bu parça bu bölümden itibaren çok kısa: en kısa sürüm bile {needed} sn müzik gerektiriyor ve yalnızca {available} sn kaldı. Bölümü daha başa taşıyın veya daha uzun bir parça seçin.",
    "fail.no-video": "Archive Vlog en az 2 video klip gerektirir: açılış, jenerik ve son çekimler her zaman videodur, bu yüzden yalnızca fotoğraflar yetmez. Video klipler ekleyin veya daha fazla klip seçin.",
    "fail.one-video": "Archive Vlog en az 2 video klip gerektirir: biri açılış, biri jenerik çekimi için. Bir video klip daha ekleyin veya daha fazla klip seçin.",
    "fail.opening-too-short": "Hiçbir video klip açılış çekimi için yeterince uzun değil: en az {needed} sn'lik bir klip gerekiyor, en uzunu {longest} sn. Daha uzun bir klip ekleyin veya daha hızlı bir müzik seçin.",
    "fail.ending-too-short": "Hiçbir video klip son çekim için yeterince uzun değil: en az {needed} sn'lik bir klip gerekiyor, en uzunu {longest} sn. Daha uzun bir klip ekleyin.",
    noPlan: "Bu görüntülere uyan bir plan yok.",
    addFootage: "Daha çeşitli görüntüler ekleyin veya daha fazla klip seçin.",
    addFootagePhotos: "Daha çeşitli görüntüler veya fotoğraflar ekleyin ya da daha fazla klip seçin.",
    retryUnchecked: { one: "{count} video kontrol edilemedi; yeniden denemek için “Oluştur”a basın.", other: "{count} video kontrol edilemedi; yeniden denemek için “Oluştur”a basın." },
    typeTitle: "Oluşturmak için bir başlık yazın.",
    dropMusic: "Bir müzik dosyası bırakın veya hazır parçalardan birini seçin.",
    musicLengthUnread: "Müziğinizin uzunluğu okunamadı. Başka bir dosya veya hazır parçalardan birini seçin.",
    musicApprox: "Müzik eklendi; kesmeler yaklaşık zamanlama kullanır ({detail}).",
    musicUnreadable: "Bu müzik dosyası okunamadı ({detail}). Başka bir dosya veya hazır parçalardan birini seçin.",
    beatFailed: "ritim algılama başarısız oldu",
    beatTimeout: "ritim algılama çok uzun sürdü",
    previewFailed: "Önizleme oynatılamadı: {detail}.",
    noAudio: "ses geri gelmedi",
    draftNoId: "“{name}” Draft'ı kaydedilmiş olabilir ama Selects kimliğini bildirmedi. Draft listesinden açın veya yeniden oluşturun.",
    draftEmpty: "“{name}” Draft'ında hiç klip yok. Yeniden oluşturun.",
    finishFailed: "Draft oluşturuldu ama başlık, görünüm ve klip sesi henüz uygulanmadı: {detail}. Yeniden denemek için “Başlığı ve görünümü tamamla”ya basın.",
    openFailed: "Draft hazır ama açılamadı: {detail}. Aşağıdaki bağlantıyı kullanın veya Draft listesinden açın.",
    draftCreated: "Draft oluşturuldu. Kelimelerini, renklerini, boyutunu veya çözülme hızını düzenlemek için başlığı ya da jeneriği; kırpmasını, görünümünü veya hareketini ayarlamak için bir klibi; ses seviyesini değiştirmek için müziği seçin. Yeniden oluşturmak yeni bir Draft oluşturur ve Denetçi düzenlemelerini korumaz.",
    draftCreatedAdding: "Draft oluşturuldu; başlık ve görünüm ekleniyor…",
    draftNotFinished: "Draft oluşturuldu ama başlık, görünüm ve klip sesi henüz uygulanmadı.",
    openDraft: "Yeni Draft'ı aç",
    copyLink: "Yeni Draft'ın bağlantısını kopyala",
    shortened: { one: "Görüntüleriniz {count} montaj çekiminden {fitted} tanesine yetiyor, bu yüzden bu video yaklaşık {seconds} sn. Tam uzunluk için daha fazla klip veya fotoğraf ekleyin.", other: "Görüntüleriniz {count} montaj çekiminden {fitted} tanesine yetiyor, bu yüzden bu video yaklaşık {seconds} sn. Tam uzunluk için daha fazla klip veya fotoğraf ekleyin." },
    note: "Not: {detail}.",
    draftRecovered: "Selects yeni Draft'ı onaylamadı, bu yüzden Draft listesinde adıyla bulundu.",
    unchecked: { one: "{count} video kontrol edilemedi ve atlandı. Yeniden denemek için tekrar oluşturun.", other: "{count} video kontrol edilemedi ve atlandı. Yeniden denemek için tekrar oluşturun." },
    createsDraft: "Yeni bir 16:9 Draft oluşturur",
    finishTitle: "Başlığı ve görünümü tamamla",
    anotherVersion: "Başka çekimler dene",
    build: "Oluştur",
    building: "Oluşturuluyor",
    "param.motion": "Hareket",
    "param.motionStrength": "Hareket gücü",
    "param.reveal": "Açılma süresi",
    "param.letterbox": "Letterbox açılışı",
    "param.look": "Görünüm gücü",
    "param.warmth": "Sıcaklık",
    "param.fade": "Kararma",
    "param.kicker": "Üst satır",
    "param.title": "Başlık",
    "param.tagline": "Alt satır",
    "param.titleColor": "Başlık rengi",
    "param.textColor": "Metin rengi",
    "param.size": "Boyut",
    "param.font": "Yazı tipi",
    "param.speed": "Çözülme hızı",
    "param.shadow": "Gölge",
    "param.scrim": "Arka planı karart",
    "param.prefix": "Jenerik ön eki",
    "param.name": "Ad",
    "motion.push-in": "Yakınlaş",
    "motion.pull-out": "Uzaklaş",
    "motion.drift-left": "Sola kay",
    "motion.drift-right": "Sağa kay",
    "motion.drift-up": "Yukarı kay",
    "motion.drift-down": "Aşağı kay",
    "motion.tilt": "Eğ",
    "motion.push-drift": "Yakınlaş ve kay",
    "tpl.files": "Seçilen dosyalar okunuyor",
    "tpl.stepDetail": "{name} ({detail})",
    "tpl.done": "Tamamlandı",
    "tpl.noFootage": "Görüntü olarak video veya fotoğraf seçin, ardından yeniden deneyin.",
    "tpl.noMusic": "Archive Vlog'un müziği eksik. Eklentiyi yeniden yükleyip tekrar deneyin.",
    "tpl.noStyles": "Archive Vlog'un başlık stilleri eksik. Eklentiyi yeniden yükleyip tekrar deneyin.",
    "tpl.notFound": "Seçilen dosyaların hiçbiri bu projede bulunamadı. Onları yeniden seçip tekrar deneyin.",
    "tpl.notFoundDetail": "Selects şunu bildirdi: {detail}",
    "tpl.notLocal": "Bu kliplerin orijinal dosyaları bu bilgisayarda değil. Onları buraya aktarın veya orijinalleri indirin, sonra tekrar deneyin.",
    "tpl.notAnalysed": { one: "{count} video hâlâ projeye ekleniyor, bu yüzden kullanılamadı.", other: "{count} video hâlâ projeye ekleniyor, bu yüzden kullanılamadı." },
    "tpl.noTitle": "“{name}” Draft'ı başlığı olmadan kaydedilmiş olabilir. Draft listesinden açın veya yeniden deneyin.",
    "tpl.finishFailed": "Draft oluşturuldu ancak başlık ve görünüm eklenemedi. Yeniden deneyin.",
    "tpl.stoppedAt": "Archive Vlog şu adımda durdu: {step}. Yeniden deneyin.",
    "tpl.stopped": "Archive Vlog, Draft hazır olmadan durdu. Yeniden deneyin.",
  },
  zh: {
    openProject: "请先打开一个项目，再制作 Archive Vlog。",
    startFailed: "Archive Vlog 无法启动：{detail}。如果问题持续，请重新安装插件。",
    foldersNotFound: "找不到插件文件夹",
    hostTooOld: "Archive Vlog 需要更新版本的 Selects。请更新 Selects，然后重新打开此面板。",
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
    noFootage: "此项目中还没有视频片段。请添加视频片段；这里会自动更新。",
    noClipsSelected: "未选择片段。请在“高级”中选择片段。",
    gap: "",
    ready: "已就绪：{summary}",
    clips: { other: "{count} 个片段" },
    clipsSelected: { other: "已选 {selected}/{count} 个片段" },
    stillAdding: { other: "仍有 {count} 个视频片段正在添加到项目中。完成后会自动更新。" },
    localNote: { other: "有 {count} 个片段未在 Selects 中分析，因此通过快速检查挑选镜头。已分析的片段能挑出更好的镜头。" },
    photos: { other: "{count} 张照片" },
    photosSelected: { other: "已选 {selected}/{count} 张照片" },
    style: "风格",
    titlePreview: "标题预览",
    previewUnavailable: "无法显示预览；标题仍会添加到 Draft。",
    replayDecode: "重播标题动画",
    decodeFitted: "在此速度下，开场镜头对这个标题来说较短，因此标题会更快解码，以便在剪切前看清。",
    loading: "加载中…",
    "preset.cinematic": "Cinematic",
    "preset.a-day-out": "A Day Out",
    "preset.golden-hour": "Golden Hour",
    fieldCount: "{label}（{used}/{max}）",
    creditShot: "署名镜头",
    creditName: "署名中的名字",
    creditPreview: "署名预览",
    creditSample: "{name} 是示例文字：输入你的名字，或清空以去掉署名。",
    creditCleared: "没有名字：署名镜头将不显示署名。",
    music: "音乐",
    track: "曲目",
    ownMusic: "自己的音乐",
    noMusic: "无音乐",
    ownMusicHint: { other: "只分析并使用曲目的前 {count} 分钟。" },
    bpm: "{bpm} BPM",
    sectionHint: "音乐片段 — 拖动选择",
    sectionLabel: "音乐片段",
    musicTooShort: "此曲目对这个时长来说太短",
    startsAt: "从 {seconds} 秒开始",
    stopPreview: "停止试听",
    cancelPreview: "取消试听",
    previewSection: "试听这一段",
    readingMusic: "正在读取音乐…",
    musicLengthUnknown: "无法得知这段音乐的时长",
    beatFound: "已找到节拍：{bpm} BPM。剪切点跟随节拍。",
    faintTempo: "已找到速度（{bpm} BPM），但节拍较弱，因此剪切点大致跟随 {bpm} BPM 的网格。",
    outsideTempo: "其速度（{bpm} BPM）超出 70–160 BPM 范围，因此剪切点使用大致的时间。",
    noBeat: "未找到稳定的节拍，因此剪切点使用大致的时间。",
    length: "时长",
    "length.short": "短",
    "length.standard": "标准",
    "length.long": "长",
    pace: "剪辑节奏",
    "pace.cinematic": "Cinematic",
    "pace.quick": "快速",
    fitPartial: { other: "{length}：此曲目可容纳 {count} 个蒙太奇镜头中的 {fitted} 个（{seconds} 秒）" },
    fitFull: { other: "{length}：{count} 个蒙太奇镜头（{seconds} 秒）" },
    footageFits: { other: "你的素材够用 {count} 个蒙太奇镜头中的 {fitted} 个（{seconds} 秒）" },
    montageBeats: { other: "每个蒙太奇镜头持续 {count} 拍（{seconds} 秒）。" },
    noMusicTiming: "无音乐：剪切点跟随稳定的 {bpm} BPM 节拍。",
    faintTempoTiming: "已找到速度（{bpm} BPM），但节拍较弱：剪切点大致跟随 {bpm} BPM 的网格。",
    outsideTempoTiming: "速度超出 70–160 BPM 范围（{bpm} BPM）：剪切点跟随稳定的 {fixed} BPM 节拍。",
    noBeatTiming: "未找到稳定的节拍：剪切点跟随固定的 {bpm} BPM 节拍。",
    fastTempo: "超过 110 BPM 时，每个镜头持续的拍数加倍，因此镜头时长与较慢的曲目大致相同。",
    advanced: "高级",
    clipSound: "片段原声",
    "sound.off": "关闭",
    "sound.ambient": "环境音",
    "sound.full": "原音量",
    cinematicLook: "电影感色调",
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
    localChecked: { other: "正在检查片段 {done}/{count}" },
    stoppedAt: "在第 {step}/{total} 步（{name}）停止：{detail}",
    "fail.too-few": "即使最短的版本也需要 {total} 个镜头，你的素材只能填满 {filled} 个。",
    "fail.music-too-short": "从这一段开始，此曲目连最短的版本都不够。请把片段往前移，或选择更长的曲目。",
    "fail.music-too-short-seconds": "从这一段开始，此曲目太短：即使最短的版本也需要 {needed} 秒音乐，只剩下 {available} 秒。请把片段往前移，或选择更长的曲目。",
    "fail.no-video": "Archive Vlog 至少需要 2 个视频片段：开场、署名和最后一个镜头始终是视频，仅有照片不够。请添加视频片段，或选择更多片段。",
    "fail.one-video": "Archive Vlog 至少需要 2 个视频片段：一个用于开场，一个用于署名镜头。请再添加一个视频片段，或选择更多片段。",
    "fail.opening-too-short": "没有足够长的视频片段可用作开场镜头：需要至少 {needed} 秒的片段，而最长的只有 {longest} 秒。请添加更长的片段，或选择更快的音乐。",
    "fail.ending-too-short": "没有足够长的视频片段可用作最后一个镜头：需要至少 {needed} 秒的片段，而最长的只有 {longest} 秒。请添加更长的片段。",
    noPlan: "没有适合这些素材的方案。",
    addFootage: "请添加更多样的素材，或选择更多片段。",
    addFootagePhotos: "请添加更多样的素材或照片，或选择更多片段。",
    retryUnchecked: { other: "有 {count} 个视频无法检查；点击“生成”重试。" },
    typeTitle: "请输入标题后再生成。",
    dropMusic: "请拖入一个音乐文件，或选择内置曲目。",
    musicLengthUnread: "无法读取你的音乐时长。请选择其他文件或内置曲目。",
    musicApprox: "已添加音乐；剪切点使用大致的时间（{detail}）。",
    musicUnreadable: "无法读取这个音乐文件（{detail}）。请选择其他文件或内置曲目。",
    beatFailed: "节拍识别失败",
    beatTimeout: "节拍识别耗时过长",
    previewFailed: "无法播放试听：{detail}。",
    noAudio: "没有返回音频",
    draftNoId: "Draft“{name}”可能已保存，但 Selects 没有返回它的 ID。请从 Draft 列表中打开，或重新生成。",
    draftEmpty: "Draft“{name}”中没有片段。请重新生成。",
    finishFailed: "Draft 已创建，但标题、色调和片段原声尚未应用：{detail}。点击“完成标题和色调”重试。",
    openFailed: "Draft 已就绪，但无法打开：{detail}。请使用下方链接，或从 Draft 列表中打开。",
    draftCreated: "Draft 已创建。选中标题或署名可编辑文字、颜色、大小或解码速度；选中片段可调整裁切、色调或运动；选中音乐可调整其音量。重新生成会创建新的 Draft，不会保留在检查器中的编辑。",
    draftCreatedAdding: "Draft 已创建；正在添加标题和色调…",
    draftNotFinished: "Draft 已创建，但标题、色调和片段原声尚未应用。",
    openDraft: "打开新的 Draft",
    copyLink: "复制新 Draft 的链接",
    shortened: { other: "你的素材只够 {count} 个蒙太奇镜头中的 {fitted} 个，所以这个视频约 {seconds} 秒。添加更多片段或照片即可达到完整时长。" },
    note: "提示：{detail}。",
    draftRecovered: "Selects 没有确认新的 Draft，因此已在 Draft 列表中按名称找到它。",
    unchecked: { other: "有 {count} 个视频无法检查，已跳过。重新生成即可重试。" },
    createsDraft: "创建一个新的 16:9 Draft",
    finishTitle: "完成标题和色调",
    anotherVersion: "换一组镜头",
    build: "生成",
    building: "正在生成",
    "param.motion": "运动",
    "param.motionStrength": "运动强度",
    "param.reveal": "展开时长",
    "param.letterbox": "遮幅展开",
    "param.look": "色调强度",
    "param.warmth": "暖度",
    "param.fade": "淡出",
    "param.kicker": "上方文字",
    "param.title": "标题",
    "param.tagline": "下方文字",
    "param.titleColor": "标题颜色",
    "param.textColor": "文字颜色",
    "param.size": "大小",
    "param.font": "字体",
    "param.speed": "解码速度",
    "param.shadow": "阴影",
    "param.scrim": "背景压暗",
    "param.prefix": "署名前缀",
    "param.name": "名字",
    "motion.push-in": "推近",
    "motion.pull-out": "拉远",
    "motion.drift-left": "向左平移",
    "motion.drift-right": "向右平移",
    "motion.drift-up": "向上平移",
    "motion.drift-down": "向下平移",
    "motion.tilt": "倾斜",
    "motion.push-drift": "推近并平移",
    "tpl.files": "读取所选文件",
    "tpl.stepDetail": "{name}（{detail}）",
    "tpl.done": "完成",
    "tpl.noFootage": "请选择用作素材的视频或照片，然后重试。",
    "tpl.noMusic": "缺少 Archive Vlog 的音乐。请重新安装插件后重试。",
    "tpl.noStyles": "缺少 Archive Vlog 的标题样式。请重新安装插件后重试。",
    "tpl.notFound": "在此项目中找不到所选的任何文件。请重新选择后重试。",
    "tpl.notFoundDetail": "Selects 提示：{detail}",
    "tpl.notLocal": "这些片段的原始文件不在这台电脑上。请在这里导入，或下载原始文件，然后再试一次。",
    "tpl.notAnalysed": { other: "有 {count} 个视频仍在添加到项目中，因此无法使用。" },
    "tpl.noTitle": "Draft“{name}”可能已在没有标题的情况下保存。请从 Draft 列表中打开，或重试。",
    "tpl.finishFailed": "Draft 已创建，但无法添加标题和色调。请重试。",
    "tpl.stoppedAt": "Archive Vlog 在此步骤停止：{step}。请重试。",
    "tpl.stopped": "Archive Vlog 在 Draft 准备好之前停止了。请重试。",
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
function sayError(lang: Lang, e: any): string {
  if (typeof e?.say === "function") return e.say(lang);
  // Host errors (av-host block) by their code.
  if (e?.code === "not-found") return t(lang, "foldersNotFound");
  if (e?.code === "beat-timeout") return t(lang, "beatTimeout");
  return String(e?.message || e);
}
// A status message for an error: a missing host member says only that Selects needs an update; anything else goes into
// `wrap` as its detail.
function errorSay(e: any, wrap: (lang: Lang, detail: string) => string): Say {
  return e?.code === "host-missing" ? (l) => t(l, "hostTooOld") : (l) => wrap(l, sayError(l, e));
}
// A text field's value cut to its limit, counted like the counter next to it (fieldLen: Hangul counts 2).
function fieldClip(text: string, max: number) {
  let out = "", n = 0;
  for (const ch of text) { const w = fieldLen(ch); if (n + w > max) break; out += ch; n += w; }
  return out;
}

const PLUGIN_ID = "archive-vlog";
const PLUGIN_VERSION = "0.1.0-alpha.5";
// The credit name's limit (fieldLen units, Hangul counts 2).
const CREDIT_NAME_MAX = 24;
// Music without onsets (No music, or a track that could not be analysed): the cuts stay on the grid.
const NO_ONSETS: any[] = [];
// A busy app (renderer near 100 % CPU) can take most of run_script's 30 s deadline before a script even starts.
// Read-only calls ask for READ_TIMEOUT_SECONDS (hosts that do not take the option keep their own deadline) and retry a
// host-busy or deadline failure after each BUSY_BACKOFF_MS pause, one attempt at a time. Commit calls do neither: a
// commit is never resent.
const READ_TIMEOUT_SECONDS = 90;
const BUSY_BACKOFF_MS = [5000, 15000];
// Photo measuring inside the inventory call; a retry after a busy failure skips it (assemble measures unsized photos).
const INVENTORY_MEASURE_MS = 4000;
// A Project still loading (right after an app restart) can fail the first inventory read outright. That first read
// is tried once more after INVENTORY_RETRY_MS (read-only; a busy failure already waited through its backoff).
const INVENTORY_RETRY_MS = 2000;
// A partial inventory (`incomplete`: some clip sizes unknown) holds Build, since a clip without a size is placed
// uncropped. It is re-read with the 10 s poll, at most INCOMPLETE_POLL_MAX times in a row (about a minute); then
// polling stops until Refresh starts the cycle again.
const INCOMPLETE_POLL_MAX = 6;
// Clips still being added (no length or no source file yet) are re-read with the 10 s poll at most this many times in a
// row (about 5 minutes): a clip whose file never resolves (offline media) must not poll forever. Refresh and coming back
// to the panel still re-read.
const WAITING_POLL_MAX = 30;
// A lost assemble reply is recovered by reading at most this many of the Project's most recent Drafts.
const DRAFT_LOOKUP_MAX = 50;
// Your own music: at most this much of the track is analysed (and used), mono at this rate (beat-detect's rate, and
// the CLI's ffmpeg command), which keeps the worker near 150 MB and a few seconds.
const OWN_MAX_SECONDS = 240;
const OWN_RATE = 22050;
// The section preview fades out over its last PREVIEW_FADE seconds, then stops.
const PREVIEW_FADE = 0.4;

// av-planner:start
// Archive Vlog planner. A plain script: panel.tsx embeds it verbatim and the tests load it in node:vm.
// One hard cut per slot on the music's beat grid, in a fixed template (spec 3): an opening shot (6 beats), a credit
// shot (2 beats, so the montage starts on beat 8, a downbeat), a montage of N shots of M beats each, and a held final
// shot (F beats). Pace Cinematic: M = 2 up to 110 bpm, 4 above; Quick: M = 1 up to 110 bpm, 2 above, with twice the
// shots, so a Length keeps its duration. F = 4 up to 110 bpm, 8 above. The montage is always whole bars (N x M a
// multiple of 4) and shrinks by whole bars when the footage or the music is short, down to AV_MIN_MONTAGE shots; the
// intro and the final shot stay.
// Without a usable grid (tempo outside 70-160 bpm, own music not accepted, or No music) the same template runs on a
// fixed beat: an approximate tempo's (avApproxTempo) when own music has one, else 60 / AV_FALLBACK_BPM s.
// Montage shots per Length at Pace Cinematic (Quick doubles them, avMontageShots).
const AV_LENGTHS = { short: 8, standard: 16, long: 24 };
// The intro in beats: opening + credit = 8, so the montage starts on a downbeat.
const AV_INTRO_BEATS = { opening: 6, credit: 2 };
const AV_TEMPO_MIN = 70;
const AV_TEMPO_MAX = 160;
// The beat without a grid (and without an approximate tempo): 60 / 72 s, the default cue's tempo.
const AV_FALLBACK_BPM = 72;
// Up to this tempo montage shots are 2 beats (Quick 1) and the final shot 4 beats; above it 4 (Quick 2) and 8.
const AV_SLOW_MAX_BPM = 110;
// The shortest montage, in shots, at both paces (kit default): 4 x M beats is whole bars for every M (1, 2 or 4).
const AV_MIN_MONTAGE = 4;
// Slot roles: the intro's two, the montage cycle, the final shot (spec 8). The panel holds the search queries. The cycle
// alternates shot scales: a wide or establishing role (architecture, water, skyline) never follows another one, across
// the wrap too (skyline -> crowd), so the montage never plays two wide views in a row by role.
const AV_MONTAGE_ROLES = ['crowd', 'architecture', 'ride', 'water', 'food', 'transit', 'skyline'];
const AV_WIDE_ROLES = ['opening', 'architecture', 'water', 'skyline'];
const AV_ROLES = ['opening', 'portrait'].concat(AV_MONTAGE_ROLES, ['ending']);
// Which other candidate roles may fill a slot role, best first (the slot's own role always ranks first).
const AV_ROLE_FALLBACK = {
  opening: ['crowd', 'ride', 'skyline'],
  portrait: ['crowd', 'food'],
  crowd: ['ride', 'opening'],
  transit: ['ride', 'crowd'],
  water: ['skyline', 'architecture'],
  architecture: ['skyline', 'opening'],
  ride: ['crowd', 'transit'],
  food: ['crowd'],
  skyline: ['water', 'architecture'],
  ending: ['skyline', 'transit', 'crowd'],
};
// Clips Selects has not analysed have no scene-search roles. The panel scores them locally (its quick-score block) and
// hands in windows of two kinds: steady (steadier, well exposed: the opening, credit and final shots) and montage
// (varied motion). A window of the kind that fits a slot ranks with that slot's own role (rank 0, by score) in the
// preferred tier, so analysed and unanalysed clips compete on score (the panel puts both on one scale); the other kind
// joins the any-role tier.
const AV_LOCAL_ROLES = { steady: 'local-steady', montage: 'local-montage' };
// The reference's opening shot lasts this long; its animation timings scale down for a shorter one (avOpeningTiming).
const AV_OPENING_REF_SECONDS = 5.60;
// Scene-search hits collapse onto a few distinct times per clip, so every searched source also gets evenly spaced
// 'filler' candidates. They score below any real hit and are only used by the last tier, after photos.
const AV_FILLER_STEP = 0.5;
const AV_FILLER_EDGE = 0.25;
const AV_FILLER_SCORE = -2;
// At most this many filler windows per source (a 24 s source has 48). A longer source gets 48 windows spread evenly over
// the same 0.5 s grid, first and last kept, so an hour-long clip does not flood the pool (and the panel's thread).
const AV_FILLER_MAX = 48;
// A video window ends at least this far before the end of its source. The plan's frames are at 30 fps; at the Draft's
// real rate (and music offset) a shot can be up to 1/30 + 1/fps s longer (about 0.075 s at 23.976), and Selects caps a
// source at its whole frames (up to one more frame shorter than its duration), so assemble.js may slide a window this
// far back to keep it inside its source.
const AV_SOURCE_TAIL = 0.15;
// A video window also starts at least this far into its source when the source is long enough: stock clips often
// fade in from black over their first frames (the Istanbul gallery's skyline clip is black for 0.4 s), and scene
// search hits at t = 0 would otherwise open a shot on black. Shorter sources may still start at 0.
const AV_SOURCE_HEAD = 0.5;
// Photos (Image resources) have no scene search. Each one fills at most one slot of any length up to the 5 s an
// image source lasts, less AV_SOURCE_TAIL (a slot grows by up to 1/30 + 1/fps s at the Draft's real rate, as for
// videos), so 4.85 s. About AV_PHOTO_SHARE of the slots that may hold a photo (the montage), evenly spread from a seeded
// offset, are photo slots where an unused photo comes first. Elsewhere photos rank after every real video hit and
// before fillers. Never more than AV_PHOTO_RUN_MAX photos play in a row (a hard rule) unless the pool has no video at
// all (avAllocate alone: avPlanBuild never plans without videos).
const AV_PHOTO_HOLD_MAX = 5;
const AV_PHOTO_RUN_MAX = 2;
const AV_PHOTO_SHARE = 1 / 3;
// Ranking a video window (avAllocate): score - AV_ROLE_STEP per role rank - AV_REPEAT_STEP per recent use of its source +
// a seeded jitter of up to AV_JITTER. The panel's motion bonus (av-hook AV_MOTION_BONUS, 0.2) plus the jitter stays below
// one role step, so a moving moment never outranks a better role match; a repeat costs more than one role step.
const AV_ROLE_STEP = 0.3;
const AV_REPEAT_STEP = 0.4;
const AV_JITTER = 0.05;
// A reused clip's new window should show another composition: at least this far (centre to centre) from each earlier
// window of the clip, or in the other half of the clip (avAllocate prefers such windows when it reuses a source).
const AV_REUSE_APART = 4;

// A beat grid is used only for a tempo in [AV_TEMPO_MIN, AV_TEMPO_MAX] whose detection was accepted (bundled cues
// always are).
function avGridUsable(opts) {
  const bpm = opts && opts.bpm;
  return !!(opts && opts.accepted) && typeof bpm === 'number' && isFinite(bpm) && bpm >= AV_TEMPO_MIN && bpm <= AV_TEMPO_MAX;
}

// The approximate tempo fixed timing runs on, or null. beat-detect.cjs reports an own track's grid as 'approximate' when
// it is tight (median residual <= 10 ms) and holds across the track but too few beats carry an onset to accept it. Its
// tempo (opts.approxBpm), in [AV_TEMPO_MIN, AV_TEMPO_MAX] and only without a usable grid (opts.gridded), sets the beat
// the template runs on, so the cuts do not drift against the music. Everything else stays gridless: cuts snap only to
// bass onsets (avSnapCuts lowConfidence).
function avApproxTempo(opts) {
  const bpm = opts && opts.approxBpm;
  return !(opts && opts.gridded) && typeof bpm === 'number' && isFinite(bpm) && bpm >= AV_TEMPO_MIN && bpm <= AV_TEMPO_MAX ? bpm : null;
}

// The tempo the template runs on. opts: { bpm, accepted, approxBpm? }. Returns { gridded (avGridUsable), approxBpm
// (avApproxTempo, null on a grid), tempo: the grid's bpm, else the approximate tempo, else AV_FALLBACK_BPM, and
// beatSeconds: 60 / tempo }.
function avTempo(opts) {
  const gridded = avGridUsable({ bpm: opts && opts.bpm, accepted: opts && opts.accepted });
  const approxBpm = avApproxTempo({ gridded, approxBpm: opts && opts.approxBpm });
  const tempo = gridded ? opts.bpm : approxBpm || AV_FALLBACK_BPM;
  return { gridded, approxBpm, tempo, beatSeconds: 60 / tempo };
}

// Beats per montage shot for a pace ('quick', else Cinematic) at a tempo (avTempo's).
function avMontageBeats(pace, bpm) {
  const slow = !(bpm > AV_SLOW_MAX_BPM);
  return pace === 'quick' ? (slow ? 1 : 2) : (slow ? 2 : 4);
}

// Beats of the final shot at a tempo.
function avFinalBeats(bpm) {
  return bpm > AV_SLOW_MAX_BPM ? 8 : 4;
}

// Montage shots a Length asks for: AV_LENGTHS (Standard when unknown), doubled for Quick.
function avMontageShots(length, pace) {
  const n = AV_LENGTHS[length] || AV_LENGTHS.standard;
  return pace === 'quick' ? 2 * n : n;
}

// The montage lengths (shots) a plan may try, longest first. opts: { requested, pace, bpm (avTempo's tempo) }. The
// steps keep the montage whole bars and the shot count stable across tempos: Cinematic shrinks by 2 shots, Quick by 4,
// both down to AV_MIN_MONTAGE (4) shots (Cinematic 16: 16, 14, ..., 4; Quick 32: 32, 28, ..., 4). A non-finite request
// counts as Standard; a request under 4 shots gives [4].
function avMontageLadder(opts) {
  const step = opts.pace === 'quick' ? 4 : 2, least = AV_MIN_MONTAGE;
  const asked = typeof opts.requested === 'number' && isFinite(opts.requested) ? opts.requested : avMontageShots('standard', opts.pace);
  const out = [];
  for (let n = Math.floor(asked / step) * step; n >= least; n -= step) out.push(n);
  if (out[out.length - 1] !== least) out.push(least);
  return out;
}

// The slot template. opts: { bpm (avTempo's tempo), pace, montageShots }. Returns { beatsList (beats per slot: 6, 2,
// M x N, F), roles, parts ('opening' | 'credit' | 'montage' | 'final' per slot), videoOnly (per slot: the opening,
// credit and final shots never take a photo), montageBeats: M, finalBeats: F, montageShots: N, montageStart: 8 (the
// montage's first beat), totalBeats }. Throws when the montage would not be whole bars.
function avTemplate(opts) {
  const m = avMontageBeats(opts.pace, opts.bpm), f = avFinalBeats(opts.bpm), n = opts.montageShots;
  if (!(n >= 1) || Math.floor(n) !== n || (n * m) % 4 !== 0) throw Error('avTemplate: the montage must be whole bars');
  const beatsList = [AV_INTRO_BEATS.opening, AV_INTRO_BEATS.credit], roles = ['opening', 'portrait'], parts = ['opening', 'credit'];
  for (let k = 0; k < n; k++) { beatsList.push(m); roles.push(AV_MONTAGE_ROLES[k % AV_MONTAGE_ROLES.length]); parts.push('montage'); }
  beatsList.push(f); roles.push('ending'); parts.push('final');
  const montageStart = AV_INTRO_BEATS.opening + AV_INTRO_BEATS.credit;
  return { beatsList, roles, parts, videoOnly: parts.map(p => p !== 'montage'), montageBeats: m, finalBeats: f, montageShots: n, montageStart,
    totalBeats: montageStart + n * m + f };
}

// Seconds of a video with N montage shots: opts { bpm (avTempo's tempo), pace, montageShots }.
function avVideoSeconds(opts) {
  return avTemplate(opts).totalBeats * 60 / opts.bpm;
}

// Music capacity: the longest montage (avMontageLadder) whose whole video fits between sectionStart and usableEnd, in
// montage shots (the 3 bookend shots are not counted), else 0 (not even AV_MIN_MONTAGE shots fit). opts: { requested, pace, bpm (avTempo's tempo), sectionStart?, usableEnd? (Infinity / omitted without
// music) }.
function avFitShots(opts) {
  const start = typeof opts.sectionStart === 'number' && isFinite(opts.sectionStart) ? opts.sectionStart : 0;
  const end = opts.usableEnd == null ? Infinity : opts.usableEnd;
  for (const n of avMontageLadder(opts)) {
    if (start + avVideoSeconds({ bpm: opts.bpm, pace: opts.pace, montageShots: n }) <= end + 1e-6) return n;
  }
  return 0;
}

// The opening animation's timings (spec 4) in seconds from the clip start: the reference's, scaled by
// k = min(1, openingSeconds / AV_OPENING_REF_SECONDS), so a faster cue compresses the animation instead of lengthening
// the intro. Letterbox reveal from revealStart to revealEnd (fully open at 2.35 s in the reference), kicker and tagline
// at textIn, decode from decodeStart, letterSeconds per title letter (9 letters end at 2.90 + 9 x 0.115 = 3.935 s, the
// reference's ~3.94 s). cutSeconds is the opening shot's length (the cut the title holds until, unscaled): the title
// fits its decode before it with a readable hold (decode-title.tsx avTiming).
function avOpeningTiming(openingSeconds) {
  const cutSeconds = Math.max(0, Number(openingSeconds) || 0);
  const k = Math.min(1, cutSeconds / AV_OPENING_REF_SECONDS);
  return { k, revealStart: 0.22 * k, revealEnd: 2.35 * k, textIn: 2.40 * k, decodeStart: 2.90 * k, letterSeconds: 0.115 * k, cutSeconds };
}

// Where the music's beats land on the timeline. Selects snaps the music's source start (sectionStart) to a timeline
// frame, so the music plays offset by delta = sectionStart - round(sectionStart * fps) / fps (at most half a frame);
// beat b of the section plays at b * 60 / bpm + delta. Without music there is no offset.
function avMusicOffset(sectionStart, fps) {
  return typeof sectionStart === 'number' && isFinite(sectionStart) && fps > 0 ? sectionStart - Math.round(sectionStart * fps) / fps : 0;
}

// Onset-snapped cuts. The cuts stay on the grid; a cut moves onto a clearly strong music onset near it, and only when
// nothing already marks the grid position. Only a cut that starts a slot of at least one beat is snappable: with
// opts.beatsList a cut starting a slot under one beat stays on the grid (every template slot is >= 1 beat, so every
// inner cut qualifies, as without beatsList).
// Conservative rules (from CWV v2.6): a cut stays on the grid when a qualifying onset of any band lies within one frame
// of it; otherwise the candidate must reach AV_SNAP_MIN_RATIO of its band threshold, candidates rank by
// ratio - AV_SNAP_DISTANCE_COST * |offset| / window, and a low-band candidate must also beat the grid position's own
// onset (the strongest qualifying onset nearer the grid, else the band threshold, ratio 1) by AV_SNAP_LOW_MARGIN.
const AV_SNAP_WINDOW_BEATS = 0.10;          // search window: +/- this share of a beat ...
const AV_SNAP_WINDOW_MAX = 0.070;           // ... capped at this many seconds
const AV_SNAP_MIN_STRENGTH = 2;             // an onset's strength (over its band median) must reach max(this, band threshold)
const AV_SNAP_MIN_RATIO = 1.5;              // a snap target's strength over that threshold
const AV_SNAP_DISTANCE_COST = 0.5;          // score = ratio - this * |offset| / window: an onset at the window edge loses 0.5
const AV_SNAP_LOW_MARGIN = 0.25;            // a low-band target's ratio over the grid position's own onset ratio
const AV_SNAP_MIN_FRAMES = 4;               // no snap may leave a shot shorter than this (or than its grid length, if shorter)
const AV_SNAP_MIN_SHARE = 0.75;             // ... or shorter than this share of its grid length
// Music whose beat was not found reliably (fixed shot lengths): only bass onsets, within a fixed window.
const AV_SNAP_LOW_CONFIDENCE_WINDOW = 0.120;

// boundaries: the grid's cut times in seconds from the section start ([0, end of slot 0, ..., end of the last slot]).
// onsets: [[seconds in the music source, band 'l' | 'm' | 'h', strength], ...].
// opts: { bpm (null without a grid), fps, sectionStart (the music second at the section start; onsets are shifted by
// it), thresholds?: { l, m, h }, lowConfidence?: true for fixed timing (forced when bpm is not a number), beatsList?:
// slot lengths in beats }. The min-frames / min-share rule below keeps a short slot next to a snapped cut. Returns
// { cuts: seconds like boundaries, frames: the cuts at opts.fps with the music offset (same expression as avSchedule
// and assemble.js), log: one entry per inner cut, window }. A snapped cut sits exactly on its onset, so rounding it to
// a frame at any rate never puts it more than half a frame before the onset.
function avSnapCuts(boundaries, onsets, opts) {
  const fps = opts.fps, low = !!opts.lowConfidence || !(opts.bpm > 0);
  const offset = avMusicOffset(opts.sectionStart, fps);
  const frameOf = x => (x === 0 ? 0 : Math.round((x + offset) * fps));
  const reach = low ? AV_SNAP_LOW_CONFIDENCE_WINDOW : Math.min(AV_SNAP_WINDOW_BEATS * 60 / opts.bpm, AV_SNAP_WINDOW_MAX);
  const bands = low ? ['l'] : ['l', 'm', 'h'];
  const thr = band => Math.max(AV_SNAP_MIN_STRENGTH, (opts.thresholds && opts.thresholds[band]) || 0);
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
      if (o.ratio < AV_SNAP_MIN_RATIO - 1e-9) continue;
      if (o.band === 'l') {
        // The grid position's own onset: the strongest qualifying onset nearer the grid (ratio 1 = the threshold when
        // there is none, since a weaker one would not be listed).
        const own = near.reduce((m, q) => (q.d < o.d - 1e-9 && q.ratio > m ? q.ratio : m), 1);
        if (o.ratio < own + AV_SNAP_LOW_MARGIN - 1e-9) { why = 'low onset not above the grid'; continue; }
      }
      const score = o.ratio - AV_SNAP_DISTANCE_COST * o.d / reach;
      if (!best || score > best.score + 1e-9 || (Math.abs(score - best.score) <= 1e-9 && (o.d < best.d - 1e-9 || (Math.abs(o.d - best.d) <= 1e-9 && o.x < best.x)))) best = { ...o, score };
    }
    return best || { none: why };
  };
  // The first shot in [a, b] that a snap would make too short, or null.
  const tooShort = (next, a, b) => {
    for (let k = Math.max(0, a); k <= Math.min(n - 1, b); k++) {
      const frames = frameOf(next[k + 1]) - frameOf(next[k]), grid = frameOf(boundaries[k + 1]) - frameOf(boundaries[k]);
      if (frames < Math.min(AV_SNAP_MIN_FRAMES, grid)) return { slot: k, reason: 'min-frames' };
      if (next[k + 1] - next[k] < AV_SNAP_MIN_SHARE * (boundaries[k + 1] - boundaries[k]) - 1e-9) return { slot: k, reason: 'min-share' };
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

// opts: { bpm (null without a usable grid), fps, beatsList: per-slot lengths in beats (avTemplate's; without a grid
// shotSeconds is the seconds per beat), roles?, parts? (per slot, avTemplate's), shotSeconds? (needed when bpm is
// null), sectionStart?: seconds into the music (omit without music), onsets?, onsetThresholds?, lowConfidence?
// (avSnapCuts; used only with a sectionStart), cuts?: cut seconds decided earlier (a schedule's `cuts`, reused as they
// are, e.g. to rebuild at the Draft's real fps) }. Without beatsList, `shots` slots of `beatsPerShot` beats each (or
// shotSeconds each without a grid). Slots carry their role (opts.roles, else the montage cycle), their grid beat span
// (startBeat, endBeat; null without a grid) and frames, with beatsList also `beats` (the slot's length in beats) and
// with parts `part`; `offset` is the music offset every boundary is shifted by; `cuts` are the boundaries in seconds
// from the section start (the grid, or the snapped cuts) and `snapLog` explains each inner cut. With beatsList the
// result also carries `beatsList`.
function avSchedule(opts) {
  const list = Array.isArray(opts.beatsList) ? opts.beatsList : null;
  const fps = opts.fps, n = list ? list.length : opts.shots, gridded = opts.bpm > 0;
  if (!(fps > 0) || !(n >= 1)) throw Error('avSchedule needs fps and shots');
  if (list && !list.every(b => typeof b === 'number' && b > 0 && isFinite(b))) throw Error('avSchedule: beatsList needs positive beat lengths');
  const roles = Array.isArray(opts.roles) ? opts.roles : null, parts = Array.isArray(opts.parts) ? opts.parts : null;
  if ((roles && roles.length !== n) || (parts && parts.length !== n)) throw Error('avSchedule: roles and parts need one entry per slot');
  const bps = gridded ? (list ? 1 : opts.beatsPerShot) : null;
  if (gridded && !(bps > 0)) throw Error('avSchedule needs beatsPerShot');
  const shotSeconds = gridded ? bps * 60 / opts.bpm : opts.shotSeconds;
  if (!(shotSeconds > 0)) throw Error('avSchedule needs bpm or shotSeconds');
  // Slot k starts `at[k]` units (beats, or fixed shots / beats without a grid) in; sums of whole beats are exact.
  const at = [0];
  for (let k = 0; k < n; k++) at.push(at[k] + (list ? list[k] : 1));
  // Every boundary is an absolute position (k shots in), shifted by the music offset and snapped once to a frame;
  // durations never accumulate rounding. The video always starts at frame 0. assemble.js uses the same expression.
  const offset = avMusicOffset(opts.sectionStart, fps);
  const frameOf = x => (x === 0 ? 0 : Math.round((x + offset) * fps));
  const grid = [];
  for (let k = 0; k <= n; k++) grid.push(gridded ? at[k] * bps * (60 / opts.bpm) : at[k] * shotSeconds);
  let cuts = grid, snapLog = [];
  if (Array.isArray(opts.cuts)) {
    if (opts.cuts.length !== grid.length) throw Error('avSchedule: cuts do not match the slots');
    cuts = opts.cuts.slice();
  } else if (opts.onsets && opts.onsets.length && typeof opts.sectionStart === 'number' && isFinite(opts.sectionStart)) {
    const snapped = avSnapCuts(grid, opts.onsets,
      { bpm: gridded ? opts.bpm : null, fps, sectionStart: opts.sectionStart, thresholds: opts.onsetThresholds, lowConfidence: opts.lowConfidence || !gridded, beatsList: list || undefined });
    cuts = snapped.cuts; snapLog = snapped.log;
  }
  const slots = [];
  for (let i = 0; i < n; i++) {
    slots.push({
      index: i,
      role: roles ? roles[i] : AV_MONTAGE_ROLES[i % AV_MONTAGE_ROLES.length],
      startBeat: gridded ? at[i] * bps : null,
      endBeat: gridded ? at[i + 1] * bps : null,
      startFrame: frameOf(cuts[i]),
      endFrame: frameOf(cuts[i + 1]),
      ...(list ? { beats: list[i] } : {}),
      ...(parts ? { part: parts[i] } : {}),
    });
  }
  return { offset, cuts, snapLog, slots, totalFrames: slots[n - 1].endFrame, gridded, ...(list ? { beatsList: list.slice() } : {}) };
}

// Music section start: snapped to whole bars from firstBeat on an accepted grid (to 0.1 s otherwise), clamped so a
// video of videoSeconds fits before usableEnd; null when it cannot fit.
function avSnapSection(opts) {
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
function avDefaultSection(opts) {
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

// Default music section of a bundled cue (spec 7): the manifest's introStart, a bar start about 8 beats before the
// drums arrive, so the opening and credit play over the soft intro and the montage starts with the groove; used when
// the video of videoSeconds fits from there before usableEnd. Otherwise (no introStart, own music, a video too long)
// avDefaultSection's most energetic window, or null when nothing fits. opts: { introStart?, firstBeat, bpm, usableEnd,
// videoSeconds, beatEnergy?, downbeatHigh? }.
function avIntroSection(opts) {
  const at = opts.introStart;
  if (typeof at === 'number' && isFinite(at) && at >= 0 && at + opts.videoSeconds <= opts.usableEnd + 1e-6) return at;
  if (!(opts.bpm > 0)) return null;
  return avDefaultSection({ ...opts, beatEnergy: Array.isArray(opts.beatEnergy) ? opts.beatEnergy : [] });
}

function avHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}

// Filler candidates every AV_FILLER_STEP seconds on each source that appears in the candidates, sorted by rid then time;
// at most AV_FILLER_MAX per source (an even subset of that grid, keeping both edge windows).
function avFillers(candidates) {
  const dur = {};
  for (const c of candidates) {
    if (!c || typeof c.sourceDuration !== 'number' || !isFinite(c.sourceDuration) || !(c.sourceDuration > 0)) continue;
    dur[c.rid] = Math.max(dur[c.rid] || 0, c.sourceDuration);
  }
  const out = [];
  for (const rid of Object.keys(dur).sort()) {
    // Grid points AV_FILLER_EDGE + k * AV_FILLER_STEP with k = 0 .. count - 1 that stay AV_FILLER_EDGE from the end.
    const count = Math.max(0, Math.floor((dur[rid] - 2 * AV_FILLER_EDGE + 1e-9) / AV_FILLER_STEP) + 1);
    const take = Math.min(count, AV_FILLER_MAX);
    let last = -1;
    for (let i = 0; i < take; i++) {
      const k = take === count ? i : Math.round(i * (count - 1) / (take - 1));
      if (k === last) continue;
      last = k;
      out.push({ rid, role: 'filler', t: AV_FILLER_EDGE + k * AV_FILLER_STEP, score: AV_FILLER_SCORE, sourceDuration: dur[rid] });
    }
  }
  return out;
}

// Strict allocation. opts: { candidates, slots: [{ index, role, seconds, videoOnly?, part? }], seed, gapSeconds = 0.5,
// photoShare = AV_PHOTO_SHARE, spread = true, motionOpener = true, finalEarly = true, sizes? (rid -> { width, height },
// an unknown size counts as landscape) }. A videoOnly slot (the opening, credit and final shots) never takes a photo, and the photo share counts only the other slots (the montage). Two hard rules, never
// relaxed: the previous slot's source is never used again for the next slot, and at most AV_PHOTO_RUN_MAX photos play
// in a row (unless the pool has no video candidate). A slot nothing fits under them stays null (counted in `missing`);
// avPlanBuild then tries a shorter montage.
// Motion opener: a video candidate with `motion` > 0 (tagged by the panel's motion bonus) marks a moving moment. The
// first slot (the opening shot) takes the best such window that fits it whole (the usual role rank, score and jitter; a
// role outside the slot's roles ranks after them), ahead of the normal tiers; a tagged clip shorter than the slot plus
// AV_SOURCE_TAIL cannot. If the opener is not videoOnly it is also left out of the photo slots, so the photo share
// moves to the others. Without tagged candidates, with none that fits, or with motionOpener: false the allocation is
// exactly as without this rule.
// Soft preferences, never a reason to leave a slot empty: the opening shot takes a landscape window over a portrait one
// of the same or a worse role rank; with spread, a montage slot (part 'montage', or not videoOnly) takes the opening's
// and the credit's sources only when no other source fits at any use count, and a reused source first offers windows
// AV_REUSE_APART s from its earlier ones (or in the source's other half), then any window.
function avAllocate(opts) {
  const gap = opts.gapSeconds == null ? 0.5 : opts.gapSeconds;
  const finite = v => typeof v === 'number' && isFinite(v);
  const candidates = opts.candidates.filter(c => c && c.kind !== 'photo' && finite(c.t) && finite(c.score) && finite(c.sourceDuration));
  // One photo candidate per rid, in rid order so the result never depends on input order.
  const photoSeen = {};
  const photos = opts.candidates.filter(c => c && c.kind === 'photo' && typeof c.rid === 'string' && !photoSeen[c.rid] && (photoSeen[c.rid] = true))
    .sort((a, b) => (a.rid < b.rid ? -1 : a.rid > b.rid ? 1 : 0));
  const used = {}, uses = {}, recent = [], photoUsed = {};
  // Variety first (default): a slot takes an unused resource whenever one fits before reusing any, and reuse goes to
  // the least-used resource. spread: false ranks by role and score only (the fallback avPlanBuild tries before it
  // shrinks, since spending every fresh clip first can strand a length that a reuse-tolerant order fills).
  const spread = opts.spread !== false;
  const pool = candidates.filter(c => c.sourceDuration > 0);
  // Each candidate's seeded tie-break jitter, hashed once per call rather than per slot, tier and use count.
  const jitter = pool.map(c => avHash(opts.seed + ':' + c.rid + ':' + c.t.toFixed(2)) * AV_JITTER);
  // Photo-only pools (no usable video) may play any number of photos in a row.
  const runLimited = pool.length > 0;
  let missing = 0, fillerShots = 0, photoShots = 0;
  // Source sizes (opts.sizes: rid -> { width, height }); an unknown size counts as landscape.
  const sizes = opts.sizes || {};
  const landscape = c => { const z = sizes[c.rid]; return !(z && z.width > 0 && z.height > 0 && z.height >= z.width); };
  // The motion opener (see above). Nothing is used yet, so this is the pick the first slot's loop turn would make with
  // the motion rank.
  const first = opts.slots[0];
  // A slot's rank of a candidate by role: its place in the slot's roles, 0 for a local window of the slot's kind
  // (AV_LOCAL_ROLES), else -1.
  const localRole = slot => AV_LOCAL_ROLES[(slot.part ? slot.part === 'montage' : !slot.videoOnly) ? 'montage' : 'steady'];
  const roleRank = (slot, roles, c) => (c.role === localRole(slot) ? 0 : roles.indexOf(c.role));
  const opener = first && opts.motionOpener !== false && pool.some(c => c.motion > 0) ? searchVideo(first, c => {
    if (!(c.motion > 0) || c.role === 'filler') return -1;
    const roles = [first.role].concat(AV_ROLE_FALLBACK[first.role] || []), r = roleRank(first, roles, c);
    return r >= 0 ? r : roles.length;
  }, null, null) : null;
  // Photo slots: round(share x slots) of the slots a photo can hold (not the motion opener's), capped by the photos
  // available, spaced evenly from a seeded phase. With no photos there are none, and every slot goes to video.
  const photoSlots = {};
  const phase = avHash(opts.seed + ':photo-slots');
  const holdable = opts.slots.filter(sl => !sl.videoOnly && sl.seconds + AV_SOURCE_TAIL <= AV_PHOTO_HOLD_MAX + 1e-9 && !(opener && sl === first));
  const share = opts.photoShare == null ? AV_PHOTO_SHARE : opts.photoShare;
  const target = Math.min(photos.length, holdable.length, Math.round(opts.slots.filter(sl => !sl.videoOnly).length * share));
  for (let k = 0; k < target; k++) photoSlots[holdable[Math.floor((k + phase) * holdable.length / target)].index] = true;
  // Best fitting video candidate for a slot. rankOf returns the candidate's rank in this tier, or -1 to skip it.
  // `exclude` lists the neighbouring shots' sources, which may not be used; `level`, when not null, keeps only sources
  // used exactly that many times.
  function searchVideo(slot, rankOf, exclude, level, accept) {
    let best = null;
    for (let i = 0; i < pool.length; i++) {
      const c = pool[i];
      if (exclude && exclude.indexOf(c.rid) >= 0) continue;
      if (level != null && (uses[c.rid] || 0) !== level) continue;
      const rank = rankOf(c);
      if (rank < 0 || c.sourceDuration < slot.seconds + AV_SOURCE_TAIL) continue;
      const head = c.sourceDuration >= slot.seconds + AV_SOURCE_TAIL + AV_SOURCE_HEAD ? AV_SOURCE_HEAD : 0;
      const start = Math.max(head, Math.min(c.sourceDuration - AV_SOURCE_TAIL - slot.seconds, c.t - slot.seconds / 2));
      const end = start + slot.seconds;
      if ((used[c.rid] || []).some(([a, b]) => start < b + gap && end > a - gap)) continue;
      const repeats = recent.filter(r => r === c.rid).length;
      if (accept && !accept(c, start, end)) continue;
      const value = c.score - rank * AV_ROLE_STEP - repeats * AV_REPEAT_STEP + jitter[i];
      const better = !best || value > best.value + 1e-12 ||
        (Math.abs(value - best.value) <= 1e-12 && (c.rid < best.c.rid || (c.rid === best.c.rid && c.t < best.c.t)));
      if (better) best = { value, c, start, end, rank };
    }
    // The opening shot prefers a landscape source (less of it is cropped away, and its letterbox opens on more of the
    // picture): a portrait pick gives way to the best landscape window of the same or a better role rank, if any.
    if (best && slot === first && !landscape(best.c)) {
      const rankAt = best.rank;
      const wide = searchVideo(slot, c => (landscape(c) && rankOf(c) >= 0 && rankOf(c) <= rankAt ? rankOf(c) : -1), exclude, level, accept);
      if (wide) return wide;
    }
    return best;
  }
  // A reused window far enough from the clip's earlier windows (AV_REUSE_APART, or the clip's other half).
  function apart(c, start, end) {
    const mid = (start + end) / 2, half = c.sourceDuration / 2;
    return (used[c.rid] || []).every(([a, b]) => Math.abs(mid - (a + b) / 2) >= AV_REUSE_APART - 1e-9 || (mid < half) !== ((a + b) / 2 < half));
  }
  // An unused photo for the slot, chosen by a seeded hash so another seed picks other photos. A photo is never a
  // neighbour's source, since each photo is used once.
  function searchPhoto(slot) {
    if (slot.videoOnly || slot.seconds + AV_SOURCE_TAIL > AV_PHOTO_HOLD_MAX + 1e-9) return null;
    let best = null;
    for (const c of photos) {
      if (photoUsed[c.rid]) continue;
      const value = avHash(opts.seed + ':photo:' + c.rid);
      if (!best || value > best.value + 1e-12) best = { value, c, photo: true };
    }
    return best;
  }
  // Fill order: the timeline, except that a video-only last slot (the held final shot) is filled right after the
  // first (unless finalEarly: false), so the montage cannot spend every window long enough for it. Each slot excludes
  // the sources of its already filled neighbours on both sides.
  const n = opts.slots.length, order = opts.slots.map((sl, i) => i);
  const early = opts.finalEarly !== false && n > 2 && !!opts.slots[n - 1].videoOnly;
  if (early) { order.pop(); order.splice(1, 0, n - 1); }
  const picks = Array(n).fill(null);
  // Photos in a row right before position i (picks after it are not filled yet, except a video-only last slot).
  const runBefore = i => { let k = 0; while (i - 1 - k >= 0 && picks[i - 1 - k] && picks[i - 1 - k].kind === 'photo') k++; return k; };
  for (const pos of order) {
    const slot = opts.slots[pos];
    const roles = [slot.role].concat(AV_ROLE_FALLBACK[slot.role] || []);
    const exclude = [pos - 1, pos + 1].filter(i => picks[i]).map(i => picks[i].rid);
    const photo = () => searchPhoto(slot);
    const preferred = (level, accept) => () => searchVideo(slot, c => roleRank(slot, roles, c), exclude, level, accept);
    const anyReal = (level, accept) => () => searchVideo(slot, c => (c.role === 'filler' ? -1 : 0), exclude, level, accept);
    const filler = (level, accept) => () => searchVideo(slot, c => (c.role === 'filler' ? 0 : -1), exclude, level, accept);
    // Reuse preferences (spread only, sources already used): a montage shot leaves the opening's and the credit's
    // sources alone while another source fits, and a reused source shows a window apart from its earlier ones.
    const montage = slot.part ? slot.part === 'montage' : !slot.videoOnly;
    const bookends = montage ? [0, 1].filter(i => i !== pos && picks[i] && picks[i].kind !== 'photo').map(i => picks[i].rid) : [];
    const notBookend = c => bookends.indexOf(c.rid) < 0;
    // Tiers, best first. A photo slot puts an unused photo first. With spread (the default) the video tiers run once
    // per use count, fewest first: preferred-role hits (and local windows of the slot's kind), any-role hits, then fillers of sources used that often, so
    // role and score only rank sources used equally often and an unused clip (even by a filler) beats any reuse.
    // Outside photo slots a photo is then the last resort, which keeps the photo share. Without spread the CWV order
    // applies: preferred, any-role, photo, filler. After AV_PHOTO_RUN_MAX photos in a row the photo tier is skipped.
    const runFull = runLimited && runBefore(pos) >= AV_PHOTO_RUN_MAX;
    const tiers = photoSlots[slot.index] ? [photo] : [];
    if (spread) {
      const levels = Array.from(new Set(pool.map(c => uses[c.rid] || 0))).sort((x, y) => Number(x) - Number(y));
      // Per use count (fewest first): windows apart from the source's earlier ones, then any. The bookends' sources join
      // only once no other source fits at any count (unused sources always come first: they are never bookends).
      const byLevel = accept => level => (level > 0 ? [preferred(level, (c, a, z) => accept(c) && apart(c, a, z)), anyReal(level, (c, a, z) => accept(c) && apart(c, a, z)),
        filler(level, (c, a, z) => accept(c) && apart(c, a, z))] : []).concat([preferred(level, accept), anyReal(level, accept), filler(level, accept)]);
      if (bookends.length) for (const level of levels) tiers.push(...byLevel(notBookend)(level));
      for (const level of levels) tiers.push(...byLevel(() => true)(level));
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
    if (!best) { missing++; continue; }
    // Recent sources (a repeat penalty) follow the timeline, so the out-of-order final shot does not count.
    if (!(early && pos === n - 1)) { recent.push(best.c.rid); if (recent.length > 3) recent.shift(); }
    if (best.photo) {
      photoUsed[best.c.rid] = true;
      photoShots++;
      picks[pos] = { slot: slot.index, rid: best.c.rid, kind: 'photo', holdSeconds: slot.seconds };
      continue;
    }
    (used[best.c.rid] = used[best.c.rid] || []).push([best.start, best.end]);
    uses[best.c.rid] = (uses[best.c.rid] || 0) + 1;
    if (best.c.role === 'filler') fillerShots++;
    // sourceDuration lets assemble.js keep the window inside its source at the Draft's real rate.
    picks[pos] = { slot: slot.index, rid: best.c.rid, kind: 'video', startSeconds: best.start, endSeconds: best.end, sourceDuration: best.c.sourceDuration };
  }
  return { picks, missing, filled: picks.filter(Boolean).length, fillerShots, photoShots };
}

// The whole plan. opts: { candidates (video hits and { rid, kind: 'photo' }), bpm (null without music), accepted,
// approxBpm? (avApproxTempo), fps, pace: 'cinematic' (default) | 'quick', requested (montage shots, avMontageShots),
// sectionStart?, usableEnd? (Infinity / omitted without music), onsets?, onsetThresholds?, lowConfidence?, seed,
// photoShare?, motionOpener?, sizes? (avAllocate) }. There is no credit option: Credit off only drops the credit graphic, the
// 2-beat credit shot stays, so the plan never depends on it.
// Eligibility (spec 3): the opening, credit and final shots (the 3 bookends) are video only; photos only fill montage
// shots. Every shot count here is montage shots: `shots`, `requested`, `musicShots` and `usableShots` exclude the 3
// bookends (`slots` = shots + 3 counts them).
// Preflight, before any allocation, in this order. Each failure is { ok: false, reason, usableShots: 0, usableSlots: 0,
// notes: [], ...vars } with the vars the panel's message needs:
// - 'no-video': no usable video at all (photos alone cannot fill the bookends).
// - 'one-video': a single video source. The opening and credit shots are adjacent video-only shots and the previous
//   shot's source is never used again, so they need 2 distinct videos (photos cannot help).
// - 'opening-too-short': no video source is long enough for the opening shot (6 beats) at this tempo. vars:
//   neededSeconds (the source length the shot needs: its length at opts.fps + AV_SOURCE_TAIL, as avAllocate checks
//   it), shotSeconds (the shot's length), longestSeconds (the longest video source).
// - 'ending-too-short': the same for the final shot (4 beats, 8 above 110 bpm).
// - 'music-too-short': the music section cannot hold the intro, AV_MIN_MONTAGE montage shots and the final shot.
//   vars: neededSeconds (that video's length), availableSeconds (usableEnd - sectionStart).
// The bookend lengths come from the longest montage the music fits (the shortest one when nothing fits), on the plan
// rate opts.fps.
// Then the music caps the montage (avFitShots), and the plan tries that montage and shrinks it down the ladder
// (avMontageLadder: whole bars, AV_MIN_MONTAGE shots at least) until the strict allocation fills every slot; the
// bookends are never dropped. Every attempt allocates from scratch with filler candidates added (see `attempts` below).
// When even the shortest plan cannot be filled: 'too-few', with usableShots (montage slots the shortest plan filled)
// and usableSlots (all slots it filled).
// A plan returns { ok: true, schedule (its slots carry role, part and beats), picks, shots: montage shots, requested:
// the montage asked for (the ladder's top), musicShots: the montage the music fits (avFitShots), slots: all slots,
// fittedByMusic, pace, montageBeats, finalBeats, tempo, beatSeconds, gridded, approxBpm (the approximate tempo the
// fixed timing used, else null), fillerShots, photoShots, attempt, notes ([], kept for the panel) }.
function avPlanBuild(opts) {
  const pace = opts.pace === 'quick' ? 'quick' : 'cinematic';
  // The tempo the template follows: the grid's, else an approximate one, else AV_FALLBACK_BPM (fixed timing).
  const { gridded, approxBpm, tempo, beatSeconds } = avTempo(opts);
  const ladder = avMontageLadder({ requested: opts.requested, pace, bpm: tempo });
  const requested = ladder[0], least = ladder[ladder.length - 1];
  const top = avFitShots({ requested, pace, bpm: tempo, sectionStart: opts.sectionStart, usableEnd: opts.usableEnd });
  const fail = (reason, vars = {}) => ({ ok: false, reason, usableShots: 0, usableSlots: 0, notes: [], ...vars });
  // Distinct sources the allocator can use: valid videos (as avAllocate filters them) and photos.
  const finite = v => typeof v === 'number' && isFinite(v);
  const videos = {};
  let hasPhotos = false;
  for (const c of opts.candidates) {
    if (!c || typeof c.rid !== 'string') continue;
    if (c.kind === 'photo') hasPhotos = true;
    else if (finite(c.t) && finite(c.score) && finite(c.sourceDuration) && c.sourceDuration > 0) videos[c.rid] = Math.max(videos[c.rid] || 0, c.sourceDuration);
  }
  const videoRids = Object.keys(videos);
  if (!videoRids.length) return fail('no-video');
  if (videoRids.length < 2) return fail('one-video');
  const snapOpts = { sectionStart: opts.sectionStart, onsets: opts.onsets, onsetThresholds: opts.onsetThresholds, lowConfidence: opts.lowConfidence };
  const scheduleOf = tpl => avSchedule({ bpm: gridded ? opts.bpm : null, fps: opts.fps, beatsList: tpl.beatsList, roles: tpl.roles, parts: tpl.parts, shotSeconds: beatSeconds, ...snapOpts });
  // Bookend preflight: a video source must hold the opening and the final shot whole (avAllocate's own test).
  {
    const sch = scheduleOf(avTemplate({ bpm: tempo, pace, montageShots: top || least }));
    const longest = Math.max(...videoRids.map(r => videos[r]));
    const check = (reason, slot) => {
      const shotSeconds = (slot.endFrame - slot.startFrame) / opts.fps;
      return longest < shotSeconds + AV_SOURCE_TAIL ? fail(reason, { neededSeconds: shotSeconds + AV_SOURCE_TAIL, shotSeconds, longestSeconds: longest }) : null;
    };
    const bad = check('opening-too-short', sch.slots[0]) || check('ending-too-short', sch.slots[sch.slots.length - 1]);
    if (bad) return bad;
  }
  if (top === 0) {
    const start = finite(opts.sectionStart) ? opts.sectionStart : 0;
    return fail('music-too-short', { neededSeconds: avVideoSeconds({ bpm: tempo, pace, montageShots: least }), availableSeconds: Math.max(0, opts.usableEnd - start) });
  }
  const notes = [];
  const candidates = opts.candidates.concat(avFillers(opts.candidates));
  // Share attempts per length. The greedy allocator spends a scarce video window after every photo outside the photo
  // slots, which can strand photos behind the run limit although the length is fillable (P P a P P b P P). So before a
  // length is given up it is retried with every slot a photo slot (photos first, a video only after two photos), which
  // spends video windows only where the run limit needs them.
  const shares = [opts.photoShare == null ? AV_PHOTO_SHARE : opts.photoShare];
  if (hasPhotos && shares[0] !== 1) shares.push(1);
  // Variety first; spending every fresh clip early can also strand a fillable length (a s s s ... where a s a s ...
  // fits), so a length is only given up after the role-and-score order (spread: false) fails too.
  // Filling the final shot early keeps a long window for it, but it can break the strict alternation a pool of few
  // sources needs (with two sources, a b a b ... decides the last slot's source), so each order is also tried with the
  // slots filled in timeline order ('-in-order').
  // Each attempt's name ('spread', 'spread-in-order', 'spread-share1', ..., 'role-first', 'role-first-share1', ..., each
  // with '-no-opener' when the motion opener's retry built it) is returned as `attempt`, so the panel and logs can tell
  // when a fallback built the plan.
  const attempts = [true, false].flatMap(spread => shares.flatMap((photoShare, i) => [true, false].map(finalEarly =>
    ({ spread, photoShare, finalEarly, name: (spread ? 'spread' : 'role-first') + (i ? '-share1' : '') + (finalEarly ? '' : '-in-order') }))));
  let usableShots = 0, usableSlots = 0;
  // Whether avAllocate's motion opener can apply (some video candidate carries motion).
  const motionTagged = opts.motionOpener !== false && candidates.some(c => c && c.kind !== 'photo' && c.motion > 0);
  // The shortest plan's fill, for the failure report.
  const tally = (alloc, tpl) => {
    usableSlots = Math.max(usableSlots, alloc.filled);
    usableShots = Math.max(usableShots, alloc.picks.filter((p, i) => p && tpl.parts[i] === 'montage').length);
  };
  for (const n of ladder) {
    if (n > top) continue;
    const tpl = avTemplate({ bpm: tempo, pace, montageShots: n });
    const schedule = scheduleOf(tpl);
    const slots = schedule.slots.map((s, i) => ({ index: s.index, role: s.role, part: tpl.parts[i], seconds: (s.endFrame - s.startFrame) / opts.fps, videoOnly: tpl.videoOnly[i] }));
    for (const attempt of attempts) {
      let alloc = avAllocate({ candidates, slots, seed: opts.seed, photoShare: attempt.photoShare, spread: attempt.spread, finalEarly: attempt.finalEarly, motionOpener: opts.motionOpener, sizes: opts.sizes });
      let name = attempt.name;
      // The motion opener never costs length: an attempt it leaves short is retried without it (named
      // '<attempt>-no-opener') before the next attempt or a shorter montage. Untagged pools never retry.
      if (alloc.missing > 0 && motionTagged) {
        if (n === least) tally(alloc, tpl);
        alloc = avAllocate({ candidates, slots, seed: opts.seed, photoShare: attempt.photoShare, spread: attempt.spread, finalEarly: attempt.finalEarly, motionOpener: false, sizes: opts.sizes });
        name = attempt.name + '-no-opener';
      }
      if (alloc.missing === 0) {
        return { ok: true, schedule, picks: alloc.picks, shots: n, requested, musicShots: top, slots: slots.length, fittedByMusic: top < requested, pace,
          montageBeats: tpl.montageBeats, finalBeats: tpl.finalBeats, tempo, beatSeconds, gridded, approxBpm,
          fillerShots: alloc.fillerShots, photoShots: alloc.photoShots, attempt: name, notes };
      }
      if (n === least) tally(alloc, tpl);
    }
  }
  return { ok: false, reason: 'too-few', usableShots, usableSlots, notes };
}

// Photo motions, in pick order: every photo pick gets one; videos and empty picks get null.
// Deterministic per seed; never the same motion twice in a row, never the same family (drift, tilt, ...) twice in a row;
// drift, tilt and push-drift directions alternate. Drift follows the photo: vertical for portrait, horizontal otherwise.
// Each entry is { motion, direction: 1 | -1, axis: 'x' | 'y' } for assets/photo-motion.tsx.
// `sizes` maps rid -> { width, height }; an unknown size counts as landscape.
const AV_PHOTO_MOTIONS = ['push-in', 'pull-out', 'drift-left', 'drift-right', 'drift-up', 'drift-down', 'tilt', 'push-drift'];
const AV_MOTION_FAMILIES = ['push-in', 'pull-out', 'drift', 'tilt', 'push-drift'];
function avPhotoMotions(picks, seed, sizes) {
  const out = [];
  let lastFamily = null, driftSign = { x: 1, y: 1 }, tiltSign = 1, pushDriftSign = 1, k = 0;
  for (const pick of picks) {
    if (!pick || pick.kind !== 'photo') { out.push(null); continue; }
    const size = sizes && sizes[pick.rid];
    const portrait = !!(size && size.height > size.width);
    const families = AV_MOTION_FAMILIES.filter(f => f !== lastFamily)
      .map(f => ({ f, v: avHash(seed + ':motion:' + k + ':' + f) }))
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
const AV_BUILD_STEPS = [
  { id: 'shots', weight: 40 },
  { id: 'music', weight: 10 },
  { id: 'draft', weight: 25 },
  { id: 'look', weight: 20 },
  { id: 'open', weight: 5 },
];

// Progress for a step that is `fraction` done. Floors the percent so 100% only shows at the very end.
function avProgress(stepId, fraction) {
  const i = AV_BUILD_STEPS.findIndex(s => s.id === stepId);
  if (i < 0) throw new Error('unknown build step ' + stepId);
  const total = AV_BUILD_STEPS.reduce((a, s) => a + s.weight, 0);
  const before = AV_BUILD_STEPS.slice(0, i).reduce((a, s) => a + s.weight, 0);
  const f = Math.min(1, Math.max(0, Number(fraction) || 0));
  const value = (before + AV_BUILD_STEPS[i].weight * f) / total;
  const percent = Math.floor(value * 100 + 1e-9);
  return { id: stepId, value, percent, current: i };
}
// av-planner:end

// av-hook:start
// Shot helpers outside the planner, plain JS: the headless driver (dev/driveAdapter.mjs) and tests/panel.test.cjs load
// this block next to planner.js, so the panel and the driver compute the same motion bonus and video motions.
// Motion bonus (spec 8): the scene search also runs the motion query (AV_QUERIES.motion), whose hits are not shot
// candidates. Each hit's score is min-max normalised over the run's motion hits (0 for the weakest, 1 for the
// strongest; 0 for all when they are equal), and a role candidate gains AV_MOTION_BONUS times the best normalised motion
// hit on the same clip within AV_MOTION_REACH seconds of its centre (the allocator centres a shot on its candidate, so
// this stands in for the shot's window +/- 0.5 s). The bonus is a tie-break: at most 0.2, below the allocator's 0.3
// step between roles (planner AV_ROLE_STEP) minus its 0.05 seeded jitter, so it never changes the role order, only which
// of two similar moments (or clips) of the same role comes first. It is added before the planner's seeded tie-break, so a build stays deterministic. A
// candidate with a bonus also carries `motion` (its normalised motion, > 0): the planner opens the video on the best
// such window (avAllocate's motion opener). A clip whose only hits are motion hits keeps a stub row (rid and
// sourceDuration, no time or score): the planner skips it as a candidate but still makes the clip's filler windows.
const AV_MOTION_ROLE = 'motion';
const AV_MOTION_BONUS = 0.2;
const AV_MOTION_REACH = 0.75;
function avMotionBonus(list) {
  const finite = v => typeof v === 'number' && isFinite(v);
  const hits = {}, rest = [], stubs = {};
  let min = Infinity, max = -Infinity;
  for (const c of list) {
    if (!c || c.role !== AV_MOTION_ROLE) { rest.push(c); continue; }
    if (!stubs[c.rid]) stubs[c.rid] = { rid: c.rid, role: AV_MOTION_ROLE, sourceDuration: c.sourceDuration };
    if (!finite(c.t) || !finite(c.score)) continue;
    (hits[c.rid] = hits[c.rid] || []).push(c);
    min = Math.min(min, c.score); max = Math.max(max, c.score);
  }
  const seen = {};
  for (const c of rest) if (c) seen[c.rid] = true;
  const kept = Object.keys(stubs).filter(rid => !seen[rid]).map(rid => stubs[rid]);
  if (!(max > min)) return avLocalScale(rest.concat(kept));
  return avLocalScale(rest.map(c => {
    const near = c && hits[c.rid];
    if (!near || !finite(c.t) || !finite(c.score)) return c;
    let motion = 0;
    for (const h of near) if (Math.abs(h.t - c.t) <= AV_MOTION_REACH + 1e-9) motion = Math.max(motion, (h.score - min) / (max - min));
    return motion > 0 ? { ...c, score: c.score + AV_MOTION_BONUS * motion, motion } : c;
  }).concat(kept));
}
// Clips without analysis: windows scored locally (avLocalCandidates in the panel and the driver; scripts/search.js's
// evenly spaced windows in a template run) carry the planner's AV_LOCAL_ROLES and a 0-1 score of their own. One scale
// for a mixed Project: their scores are mapped min-max onto the range of this build's scene-search hits (after the
// motion bonus), so the best local window ties the best hit and the weakest the weakest, and the planner (which ranks a
// local window of the slot's kind like the slot's own role) mixes both kinds by score. Equal local scores sit in the
// middle of that range. Without hits the local scores stay as they are; without local windows the list is unchanged.
function avLocalScale(list) {
  const finite = v => typeof v === 'number' && isFinite(v);
  const isLocal = c => !!c && (c.role === AV_LOCAL_ROLES.steady || c.role === AV_LOCAL_ROLES.montage);
  const scored = c => !!c && finite(c.t) && finite(c.score);
  const local = list.filter(c => isLocal(c) && scored(c));
  const hits = list.filter(c => scored(c) && !isLocal(c) && c.role !== 'filler' && c.role !== AV_MOTION_ROLE);
  if (!local.length || !hits.length) return list;
  const lo = Math.min(...hits.map(c => c.score)), hi = Math.max(...hits.map(c => c.score));
  const lmin = Math.min(...local.map(c => c.score)), lmax = Math.max(...local.map(c => c.score));
  return list.map(c => (isLocal(c) && scored(c)
    ? { ...c, score: lmax > lmin ? lo + (c.score - lmin) / (lmax - lmin) * (hi - lo) : (lo + hi) / 2 } : c));
}
// Planner candidates of clips without analysis from their quick local scores (the quick-score block's quickScore
// results; qsCandidates picks the windows). opts: { durations (rid -> seconds; else the result's own), steadySeconds (the
// longest bookend shot: the opening or the final), montageSeconds (a montage shot) }. Per clip, at most AV_LOCAL_MAX
// windows of each kind (AV_LOCAL_ROLES: steady, montage) with their 0-1 scores (avLocalScale rescales them) and the
// clip's length. A window whose mean frame difference reaches AV_LOCAL_MOVING is moving: it carries `motion` (its
// difference over the largest one, > 0) for the planner's motion opener. A clip with no window that fits keeps a stub
// row (rid and sourceDuration), so the planner still gives it filler windows.
const AV_LOCAL_MAX = 10;
const AV_LOCAL_MOVING = 0.01;
function avLocalCandidates(results, opts) {
  const rows = [];
  let top = 0;
  for (const s of results) {
    if (!s || typeof s.rid !== 'string') continue;
    const dur = (opts.durations && opts.durations[s.rid]) || s.duration;
    if (!(typeof dur === 'number' && dur > 0)) continue;
    let n = 0;
    for (const kind of ['steady', 'montage']) {
      for (const c of qsCandidates(s, kind, kind === 'steady' ? opts.steadySeconds : opts.montageSeconds, AV_LOCAL_MAX)) {
        rows.push({ rid: s.rid, role: AV_LOCAL_ROLES[kind], t: c.t, score: c.score, sourceDuration: dur, raw: c.motion || 0 });
        top = Math.max(top, c.motion || 0);
        n++;
      }
    }
    if (!n) rows.push({ rid: s.rid, role: AV_LOCAL_ROLES.montage, sourceDuration: dur, raw: 0 });
  }
  return rows.map(({ raw, ...c }) => (raw >= AV_LOCAL_MOVING && top > 0 ? { ...c, motion: raw / top } : c));
}
// The window lengths local windows are picked for, from the tempo the template runs on (planner avTempo's tempo) and
// the pace: steady = the longer of the opening (6 beats) and the final shot, montage = one montage shot.
function avLocalSeconds(bpm, pace) {
  const beat = 60 / bpm;
  return { steadySeconds: Math.max(AV_INTRO_BEATS.opening, avFinalBeats(bpm)) * beat, montageSeconds: avMontageBeats(pace, bpm) * beat };
}
// A build's video candidates for the planner: the scene-search hits (with sourceDuration) and, for the clips without
// analysis, the windows of their quick local scores (`local`: quickScore results), with the motion bonus and the shared
// score scale applied (avMotionBonus). opts: { bpm (avTempo's tempo), pace, durations (rid -> seconds) }.
function avShotCandidates(hits, local, opts) {
  const own = local && local.length ? avLocalCandidates(local, { durations: opts.durations, ...avLocalSeconds(opts.bpm, opts.pace) }) : [];
  return avMotionBonus(hits.concat(own));
}
// Local scoring in a build: clips scored at once, and the time all of them may take (clips not started by then get
// evenly spaced windows; the quick-score block's quickScoreAll).
const AV_LOCAL_CONCURRENCY = 3;
const AV_LOCAL_BUDGET_MS = 25000;
// Shot motion (build contract): every video clip but the opening (index 0, which has the letterbox reveal) gets one
// gentle move from two families, 'push-in' and 'drift', seeded like avPhotoMotions. A clip never takes the family of
// the clip before it (a photo's family from photoMoves, avPhotoMotions' result for the same picks: push-in -> 'push-in',
// drift-* -> 'drift', others their own name); when both families are free, avHash(seed + ':shot:' + k + ':' + family)
// picks (higher wins, k = video motions so far). Drifts alternate right and left (axis x: the 16:9 video has no crop
// to drift into vertically). Returns { "<main clip index>": { motion, direction, axis } } for decorate.js
// (cfg.motion.video.byIndex).
function avVideoMotions(picks, seed, photoMoves) {
  const family = m => (m === 'push-in' ? 'push-in' : /^drift-/.test(m) ? 'drift' : m);
  const out = {};
  let prev = null, k = 0, drift = 1;
  picks.forEach((pick, i) => {
    if (!pick || pick.kind === 'photo') { const pm = photoMoves && photoMoves[i]; prev = pm ? family(pm.motion) : null; return; }
    if (i === 0) { prev = null; return; }
    const order = ['push-in', 'drift'].map(f => ({ f, v: avHash(seed + ':shot:' + k + ':' + f) })).sort((a, b) => b.v - a.v || (a.f < b.f ? -1 : 1)).map(x => x.f);
    const f = order.find(x => x !== prev) || order[0];
    if (f === 'drift') { out[String(i)] = { motion: drift > 0 ? 'drift-right' : 'drift-left', direction: drift, axis: 'x' }; drift = -drift; }
    else out[String(i)] = { motion: 'push-in', direction: 1, axis: 'x' };
    prev = f; k++;
  });
  return out;
}
// av-hook:end

// av-build:start
// Build constants and config builders, plain JS: the panel, its template run, tests/panel.test.cjs and the headless
// driver (dev/driveAdapter.mjs) load this block next to planner.js and the av-hook block, so all of them hand
// scripts/assemble.js and scripts/decorate.js the same configs (the build contract).
// The Draft's canvas. assemble.js sets the same size; the preview and the photo cover scale use it.
const AV_W = 1920, AV_H = 1080;
// One scene-search query per shot role (planner AV_ROLES), plus the motion query (av-hook avMotionBonus).
const AV_QUERIES = {
  opening: "wide city street with traffic and people walking",
  portrait: "a person sitting outside, relaxed portrait",
  crowd: "crowd of people walking on a busy street",
  transit: "tram, train or bus passing by",
  water: "ferry or boat on the water, harbour",
  architecture: "historic building facade, landmark architecture",
  ride: "cyclist or person walking, street level",
  food: "street food stall or market",
  skyline: "city skyline or golden hour light",
  ending: "golden hour street or train station, sunset",
  motion: "people walking, vehicles passing or the camera moving",
};
// Clips per scene-search call: eleven queries each, so two clips (22 searches) stay inside run_script's 30 s deadline
// (search.js stops starting new searches after 22 s and reports the rest as failed, retried by the next Build).
const SEARCH_BATCH = 2;
// Ambient clip sound: the clips' own sound sits this far under the music, which stays at 0 dB.
const AMBIENT_DB = -18;
const DEFAULT_CUE = "marimba-motif";
const DEFAULT_PRESET = "cinematic";
const DEFAULT_LENGTH = "standard";
const DEFAULT_PACE = "cinematic";
const DEFAULT_CLIP_SOUND = "ambient";
// Cinematic look strength when a preset names none (presets.json look.strength: 0.3 / 0.3 / 0.45); its highlight
// warmth is the preset's look.warmth, else 1.
const LOOK_STRENGTH = 0.3;
// Photo motion and the video clips' gentle shot motion.
const MOTION_STRENGTH = 0.5;
const VIDEO_MOTION_STRENGTH = 0.8;
// The last clip fades to black over this long, and the music fades out with it.
const FADE_SECONDS = 1.0;
const MUSIC_FADE_OUT = 1.0;
// The title's and the credit's Adjust defaults (the decode block's own defaults); the panel preview draws with them.
const TITLE_LOOK = { font: "anton", size: 100, speed: 100, shadow: 0.3, scrim: 0.4 };
const CREDIT_LOOK = { size: 100, shadow: 0.3 };
// The title's main-font choices in Adjust (bundled faces, by name).
const TITLE_FONT_OPTIONS = [{ label: "Anton", value: "anton" }, { label: "Oswald", value: "oswald" }];
// The Motion choices of a photo clip in the Inspector. The labels are English for dev/driveAdapter.mjs; a Build writes
// STRINGS `motion.<value>` in the UI language.
const MOTION_OPTIONS = [
  { label: "Push in", value: "push-in" }, { label: "Pull out", value: "pull-out" },
  { label: "Drift left", value: "drift-left" }, { label: "Drift right", value: "drift-right" },
  { label: "Drift up", value: "drift-up" }, { label: "Drift down", value: "drift-down" },
  { label: "Tilt", value: "tilt" }, { label: "Push and drift", value: "push-drift" },
];
// Inspector (Adjust) labels, English (decorate.js's defaults). A Build passes them in the UI language as adjustLabels
// (STRINGS `param.<key>`), frozen at the Build click.
const AV_ADJUST_LABELS = {
  motion: "Motion", motionStrength: "Motion strength", reveal: "Reveal", letterbox: "Letterbox reveal", look: "Look strength",
  warmth: "Warmth", fade: "Fade out", kicker: "Top line", title: "Title", tagline: "Bottom line", titleColor: "Title colour",
  textColor: "Text colour", size: "Size", font: "Font", speed: "Decode speed", shadow: "Shadow", scrim: "Backdrop", prefix: "Credit prefix", name: "Name",
};
// Why a plan cannot be built (planner avPlanBuild reasons). English for dev/driveAdapter.mjs; the panel says STRINGS
// `fail.<reason>` in the UI language (`noPlan` for a reason not listed here).
const AV_FAIL = {
  "too-few": "Your footage cannot fill even the shortest version",
  "music-too-short": "This track is too short for even the shortest version from this section",
  "no-video": "Archive Vlog needs at least 2 video clips: the opening, credit and last shots are always video",
  "one-video": "Archive Vlog needs at least 2 video clips: one for the opening and one for the credit shot",
  "opening-too-short": "No video clip is long enough for the opening shot",
  "ending-too-short": "No video clip is long enough for the last shot",
};

// The credit's face (presets.json role "condensed").
const CREDIT_FAMILY = "AV Oswald Bold";
// A preset's look strength (presets.json look.strength), else LOOK_STRENGTH.
function avLookStrength(p) { return p && p.look && typeof p.look.strength === 'number' ? p.look.strength : LOOK_STRENGTH; }
// A preset of presets.json by id (the default one when unknown).
function avPreset(presets, id) {
  const list = (presets && presets.presets) || [];
  return list.find(p => p.id === id) || list.find(p => p.id === DEFAULT_PRESET) || list[0] || null;
}
// The preset's fonts, one per family, with the advance metrics the layouts measure with (and, given `b64` as file name
// -> WOFF2 data, the font data a graphic embeds).
function avPresetFonts(presets, preset, b64) {
  const seen = {};
  return ((preset && preset.fonts) || []).filter(f => !seen[f.family] && (seen[f.family] = true)).map(f => {
    const face = { role: f.role, family: f.family, style: f.style, weight: f.weight, metrics: (presets.metrics || {})[f.family] || null };
    return b64 ? Object.assign(face, { b64: b64[f.file] || "" }) : face;
  });
}
// The opening shot's length in seconds at the Draft's real fps: the plan's cut seconds (grid or snapped) placed at
// `fps` with the music offset, as assemble.js places them.
function avOpeningSeconds(plan, fps, sectionStart) {
  const s = avSchedule({ bpm: plan.gridded ? plan.tempo : null, fps, beatsList: plan.schedule.beatsList, shotSeconds: plan.beatSeconds,
    sectionStart: typeof sectionStart === 'number' ? sectionStart : undefined, cuts: plan.schedule.cuts });
  return (s.slots[0].endFrame - s.slots[0].startFrame) / fps;
}
// Frame sizes by rid ({ width, height }) from an inventory: its videos and the photos it has measured. Photo sizes not
// measured yet stay out (assemble.js measures those itself). The planner's sizes (the landscape opening) and assemble's crops.
function avSizesOf(inventory) {
  const sized = ((inventory && inventory.resources) || []).concat(((inventory && inventory.photos) || []).filter(r => r.width > 0 && r.height > 0));
  // Object({}): an untyped map (the panel type-checks this block).
  const out = Object({});
  for (const r of sized) out[r.rid] = { width: r.width, height: r.height };
  return out;
}
// The fraction of a source's height the 16:9 canvas shows once assemble.js cover-crops it, to 4 decimals: 1 for a
// source as wide as 16:9 or wider (cropped at the sides only) and for an unknown size; 4:3 0.75, 9:16 0.3164. The
// letterbox reveal remaps its band with it (letterbox-reveal.tsx `visible`).
function avVisibleFraction(size) {
  if (!size || !(size.width > 0) || !(size.height > 0)) return 1;
  return Math.round(Math.min(1, (size.width / size.height) / (AV_W / AV_H)) * 1e4) / 1e4;
}
// assemble.js cfg. o: { projectId, draftName, plan, inventory (resources and photos with their sizes), music
// ({ resourceId } from ensure-audio.js, or null), sectionStart, clipSound }.
function avAssembleConfig(o) {
  const crops = avSizesOf(o.inventory);
  return { projectId: o.projectId, draftName: o.draftName, picks: o.plan.picks, boundaries: o.plan.schedule.cuts, crops, clipSound: o.clipSound,
    ambientDb: AMBIENT_DB, music: o.music ? { resourceId: o.music.resourceId, sectionStart: o.sectionStart == null ? 0 : o.sectionStart } : null,
    musicFadeOut: MUSIC_FADE_OUT };
}
// decorate.js cfg. o: { sequenceId, videoEnd, fps (assemble's), plan, presets (presets.json), tsx: { title, credit,
// letterbox, look, fade, motion }, fonts: { file: WOFF2 data }, sizes: { rid: { width, height } }, openingSize (the opening
// pick's { width, height }, or null), provenance, frozen }.
// frozen (the inputs at the Build click): { seed, preset, fields: { kicker, title, tagline }, credit: { on, prefix?, name },
// clipSound, look: { on, strength }, sectionStart (null without music), labels (adjustLabels, English without), motionOptions }.
function avDecorateConfig(o) {
  const f = o.frozen, plan = o.plan, p = avPreset(o.presets, f.preset);
  if (!p) throw Error('presets.json has no preset ' + f.preset);
  const L = Object.assign({}, AV_ADJUST_LABELS, f.labels || {});
  const fonts = avPresetFonts(o.presets, p, o.fonts);
  const timing = avOpeningTiming(avOpeningSeconds(plan, o.fps, f.sectionStart));
  const text = k => String((f.fields && f.fields[k]) || '');
  const fields = { kicker: text('kicker'), title: text('title'), tagline: text('tagline') };
  const title = {
    tsx: o.tsx.title,
    parameters: Object.assign({ preset: p.id }, fields, { fields: Object.assign({}, fields), titleColor: p.colors.title, textColor: p.colors.text,
      taglineTracking: p.taglineTracking, font: TITLE_LOOK.font, size: TITLE_LOOK.size, speed: TITLE_LOOK.speed, shadow: TITLE_LOOK.shadow, scrim: TITLE_LOOK.scrim, timing, fonts, provenance: Object.assign({}, o.provenance || {}, { picks: plan.picks }) }),
    editableParameters: [
      { key: 'kicker', label: L.kicker, type: 'text', defaultValue: fields.kicker },
      { key: 'title', label: L.title, type: 'text', defaultValue: fields.title },
      { key: 'tagline', label: L.tagline, type: 'text', defaultValue: fields.tagline },
      { key: 'titleColor', label: L.titleColor, type: 'color', defaultValue: p.colors.title },
      { key: 'textColor', label: L.textColor, type: 'color', defaultValue: p.colors.text },
      { key: 'size', label: L.size, type: 'number', defaultValue: TITLE_LOOK.size, min: 60, max: 160, step: 5 },
      { key: 'font', label: L.font, type: 'select', defaultValue: TITLE_LOOK.font, options: TITLE_FONT_OPTIONS },
      { key: 'speed', label: L.speed, type: 'number', defaultValue: TITLE_LOOK.speed, min: 25, max: 400, step: 5 },
      { key: 'shadow', label: L.shadow, type: 'number', defaultValue: TITLE_LOOK.shadow, min: 0, max: 1, step: 0.05 },
      { key: 'scrim', label: L.scrim, type: 'number', defaultValue: TITLE_LOOK.scrim, min: 0, max: 1, step: 0.05 },
    ],
  };
  const name = String((f.credit && f.credit.name) || '');
  // The prefix typed in the panel, else the preset's ("ARCHIVED BY", "LOCATION |").
  const prefix = f.credit && typeof f.credit.prefix === 'string' ? f.credit.prefix : (p.credit && p.credit.prefix) || '';
  const credit = f.credit && f.credit.on ? {
    tsx: o.tsx.credit,
    parameters: { prefix, name, color: p.colors.text, size: CREDIT_LOOK.size, shadow: CREDIT_LOOK.shadow, fonts: fonts.filter(x => x.family === CREDIT_FAMILY) },
    editableParameters: [
      { key: 'prefix', label: L.prefix, type: 'text', defaultValue: prefix },
      { key: 'name', label: L.name, type: 'text', defaultValue: name },
    ],
  } : null;
  const letterbox = { tsx: o.tsx.letterbox, parameters: { revealStart: timing.revealStart, revealEnd: timing.revealEnd,
    revealSeconds: timing.revealEnd - timing.revealStart, enabled: true, visible: avVisibleFraction(o.openingSize) } };
  // The look's strength is the one frozen at Build (the panel's slider, else the preset's); its warmth the preset's.
  const look = f.look && f.look.on ? { tsx: o.tsx.look, strength: typeof f.look.strength === 'number' ? f.look.strength : avLookStrength(p),
    warmth: (p.look && typeof p.look.warmth === 'number') ? p.look.warmth : 1 } : null;
  const fade = { tsx: o.tsx.fade, fadeSeconds: FADE_SECONDS };
  // Photos in this Draft and a planned motion for each of them; a gentle move for every video clip but the opening.
  const sizes = o.sizes || {};
  const moves = avPhotoMotions(plan.picks, String(f.seed), sizes);
  const byRid = {}, photos = [];
  plan.picks.forEach((k, i) => {
    if (!k || k.kind !== 'photo') return;
    if (photos.indexOf(k.rid) < 0) photos.push(k.rid);
    if (!moves[i]) return;
    const sz = sizes[k.rid];
    // The clip's cover-crop scale, so the motion's drift stays inside the photo.
    const cover = sz ? Math.max(AV_W / sz.width, AV_H / sz.height) / Math.min(AV_W / sz.width, AV_H / sz.height) : 1;
    byRid[k.rid] = Object.assign({}, moves[i], { cover });
  });
  const byIndex = avVideoMotions(plan.picks, String(f.seed), moves);
  return { sequenceId: o.sequenceId, videoEnd: o.videoEnd, mute: f.clipSound === 'off', photos, photoEffects: true, title, credit, letterbox, look, fade,
    motion: { tsx: o.tsx.motion, strength: MOTION_STRENGTH, options: f.motionOptions || MOTION_OPTIONS, byRid, video: { strength: VIDEO_MOTION_STRENGTH, byIndex } },
    adjustLabels: L };
}
// av-build:end

// The decode title's layout and decode state (assets/decode-title.tsx, embedded verbatim; tests/panel.test.cjs checks
// it), in a scope of its own so its helpers never meet the planner's. The preview draws the same lockup as the Draft.
const AV_TITLE: any = (function () {
// av-decode:start
// Pure layout and decode state, shared with the panel preview (which evaluates this block as plain JS).
// Text is measured with the per-font advance tables from presets.json (`metrics`), passed in `data.fonts[i].metrics`,
// so the layout is identical in Node, the panel and the render. Lengths are canvas pixels; sizes are relative to the
// canvas height (reference: 1920x1080, "CINEMATIC" flat cap height 150 px, kicker cap 22 px, tagline cap 19 px).
// The title is laid out once with its final text: each letter keeps its final box while decoding, so nothing shifts.
var AV_TITLE_FACES = {
  // Anton drawn at 0.84 width matches the reference's ultra-condensed face (width, stem and bowl proportions).
  anton: { family: "AV Anton", weight: 400, condense: 0.84 },
  oswald: { family: "AV Oswald Bold", weight: 700, condense: 0.9 },
};
var AV_KICKER_FACE = { family: "AV Inter Medium", weight: 500 };
var AV_TAGLINE_FACE = { family: "AV Inter", weight: 400 };
// Style defaults per preset (the same values as presets.json `colors` / `taglineTracking` / `taglineSize`).
var AV_TITLE_PRESETS = {
  cinematic: { titleColor: "#FCE070", textColor: "#FFFFFF", taglineTracking: 0.5, taglineSize: 100 },
  "a-day-out": { titleColor: "#FFFFFF", textColor: "#FFFFFF", taglineTracking: 0.12, taglineSize: 80 },
  "golden-hour": { titleColor: "#F6E3C2", textColor: "#FFFFFF", taglineTracking: 0.5, taglineSize: 100 },
};
// Default timing in seconds from the clip start (the reference at k = 1; decorate passes the planner's scaled values,
// planner avOpeningTiming, with cutSeconds: the opening shot's length).
var AV_TIMING = { textIn: 2.4, decodeStart: 2.9, letterSeconds: 0.115 };
// Decode fit (avTiming): the title holds fully decoded for at least max(AV_HOLD_MIN, AV_HOLD_SHARE x cutSeconds) before
// the cut; a letter takes at least AV_LETTER_MIN s unless even starting at textIn cannot fit that.
var AV_HOLD_MIN = 0.8, AV_HOLD_SHARE = 0.25, AV_LETTER_MIN = 0.03;
// Graphemes per field, the presets' `max` (presets.json, the same for every preset). Adjust edits bypass the panel's
// counter, so the graphic cuts longer text itself.
var AV_FIELD_MAX = { kicker: 24, title: 16, tagline: 48 };
var AV_TITLE_CAP = 150 / 1080, AV_KICKER_CAP = 22 / 1080, AV_TAGLINE_CAP = 19 / 1080;
var AV_GAP_KICKER = 21 / 150, AV_GAP_TAGLINE = 22 / 150; // ink gaps, fractions of the title's cap height
var AV_FIT = 0.8; // max lockup width, fraction of canvas width
var AV_TITLE_FLOOR = 0.5, AV_SMALL_FLOOR = 0.6, AV_TRACK_FLOOR = 0.15;
var AV_GHOST_OPACITY = 0.5;
// Used only when a family's metrics are missing: a generic 0.56 em advance.
var AV_FALLBACK_METRICS = { unitsPerEm: 1000, xHeight: 500, capHeight: 700, ascent: 720, descent: -220, advances: {} };
// Korean text: no uppercase, no tracking, no condense. A wide character (Hangul, kana, CJK, fullwidth) has no advance
// in the bundled metrics: it is drawn in the system Korean face ("Apple SD Gothic Neo" on macOS, "Malgun Gothic" on
// Windows), whose metrics differ, so the render and the panel measure it with a canvas (avKoMeasure) and pass
// `data.koInk` ({ up, down } em) and `data.koAdvances` ({ char: em }). Without them (Node) a wide character counts as
// 1 em and its ink as 0.86 em above the baseline and 0.12 em below (tuned on Apple SD Gothic Neo).
var AV_HANGUL_RE = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/;
var AV_WIDE_RE = /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]/;
var AV_WIDE_UP = 0.86, AV_WIDE_DOWN = 0.12;
// Latin fallbacks per bundled family (macOS and Windows), then both Korean system faces before the generic family.
var AV_LATIN_FALLBACKS = {
  "AV Anton": 'Impact, "Arial Narrow"',
  "AV Oswald Bold": '"Arial Narrow", Impact',
  "AV Inter Medium": '"Segoe UI", "Helvetica Neue", Arial',
  "AV Inter": '"Segoe UI", "Helvetica Neue", Arial',
};
function avFontStack(family) {
  return '"' + family + '", ' + (AV_LATIN_FALLBACKS[family] || "Arial") + ', "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
}
function avHasHangul(text) { return AV_HANGUL_RE.test(String(text || "")); }
// Decode glyph pools: capitals, lower case, digits and common Hangul syllables (code points, no literal Hangul).
var AV_POOL_UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
var AV_POOL_LOWER = "abcdefghijklmnopqrstuvwxyz".split("");
var AV_POOL_DIGIT = "0123456789".split("");
var AV_POOL_HANGUL = [0xAC00, 0xB098, 0xB2E4, 0xB77C, 0xB9C8, 0xBC14, 0xC0AC, 0xC544, 0xC790, 0xCC28, 0xCE74, 0xD0C0, 0xD30C, 0xD558,
  0xC11C, 0xC6B8, 0xC5EC, 0xD589, 0xC77C, 0xC0C1, 0xAE30, 0xB85D, 0xC2DC, 0xAC04, 0xBE5B, 0xB8E8, 0xC624, 0xB298, 0xC6B0, 0xB9AC, 0xB3C4,
  0xB78C, 0xAF43, 0xAE38, 0xBC24, 0xBCC4, 0xB178, 0xC744, 0xC601, 0xD654, 0xC21C, 0xAC10, 0xC815, 0xC5B5, 0xCD94, 0xD55C, 0xAD6D, 0xBD80,
  0xC0B0, 0xC81C, 0xC8FC, 0xAC70, 0xD48D, 0xACBD].map(function (c) { return String.fromCharCode(c); });

// Letters and numbers of any script (Unicode property escapes where the engine has them; else cased letters and wide
// glyphs).
var AV_LETTER_RE = (function () { try { return new RegExp("[\\p{L}\\p{N}]", "u"); } catch (e) { return null; } })();
function avIsLetter(ch) {
  return AV_LETTER_RE ? AV_LETTER_RE.test(ch) : ch.toUpperCase() !== ch.toLowerCase() || AV_WIDE_RE.test(ch) || /[0-9]/.test(ch);
}
// Grapheme clusters (Intl.Segmenter when the engine has it, else code points), so a letter with a combining mark or a
// surrogate pair is one decode position and counts once against AV_FIELD_MAX. Precomposed Latin, Hangul syllables and
// digits split the same either way; a combining sequence or an emoji sequence may count differently on an engine
// without Intl.Segmenter.
var AV_SEGMENTER = (function () {
  // Object(Intl): untyped, so the block type-checks against libs without Intl.Segmenter.
  try { var I = typeof Intl !== "undefined" ? Object(Intl) : null; return I && I.Segmenter ? new I.Segmenter(undefined, { granularity: "grapheme" }) : null; } catch (e) { return null; }
})();
function avGraphemes(text) {
  text = String(text || "");
  if (!AV_SEGMENTER) return Array.from(text);
  var out = [], it = AV_SEGMENTER.segment(text)[Symbol.iterator](), step = it.next();
  while (!step.done) { out.push(step.value.segment); step = it.next(); }
  return out;
}
// A grapheme's class, from its first code point: which pool its ghost glyphs come from. Each position flips through its
// own script's pool, so a mixed Latin / Hangul title keeps Latin ghosts on Latin letters. "space" and "fixed"
// (punctuation, symbols) take no decode time; "other" (a letter of another script) takes a step and ghosts as itself.
function avCharClass(ch) {
  var c = Array.from(String(ch || " "))[0];
  if (/\s/.test(c)) return "space";
  if (AV_HANGUL_RE.test(c)) return "hangul";
  if (/[0-9]/.test(c)) return "digit";
  if (/[A-Z\u00c0-\u00d6\u00d8-\u00de\u0100-\u024f]/.test(c) && c !== c.toLowerCase()) return "upper";
  if (/[a-z\u00df-\u00f6\u00f8-\u00ff\u0100-\u024f]/.test(c)) return "lower";
  return avIsLetter(c) ? "other" : "fixed";
}
// Classes that take a decode step.
function avLockable(cls) { return cls !== "space" && cls !== "fixed"; }
function avPool(cls, ch) {
  return cls === "hangul" ? AV_POOL_HANGUL : cls === "digit" ? AV_POOL_DIGIT : cls === "upper" ? AV_POOL_UPPER : cls === "lower" ? AV_POOL_LOWER : [ch];
}
// Integer hash of (letter index, frame): the same ghost in the panel preview, the Draft preview and the export.
function avHash(a, b) {
  var h = (Math.imul(a + 1, 374761393) + Math.imul(b + 7, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}
// The ghost glyph letter `index` shows at `frame`: never its own final character when the pool has another.
function avGhostChar(ch, index, frame) {
  var pool = avPool(avCharClass(ch), ch);
  var at = avHash(index, frame) % pool.length;
  if (pool[at] === ch && pool.length > 1) at = (at + 1) % pool.length;
  return pool[at];
}

// Wide-glyph metrics from `data`: measured values when valid, else the constants above.
function avKoWide(data) {
  var ink = data && data.koInk, adv = data && data.koAdvances;
  var ok = ink && typeof ink.up === "number" && typeof ink.down === "number" && ink.up > 0.3 && ink.up < 1.5 && ink.down >= 0 && ink.down < 0.6;
  return { up: ok ? ink.up : AV_WIDE_UP, down: ok ? ink.down : AV_WIDE_DOWN, adv: adv && typeof adv === "object" ? adv : null };
}
function avKoAdvance(kw, ch) {
  var a = kw && kw.adv ? kw.adv[ch] : undefined;
  return typeof a === "number" && isFinite(a) && a > 0.2 && a < 2 ? a : 1;
}
// Measures the wide glyphs on a 2D canvas with the exact stack and weight the title draws them with (call it once the
// fonts are loaded): { koInk, koAdvances } to merge into `data`, or null in Node or when the text has no wide glyph.
// Ink comes from a Hangul sample; advances from each wide character of the kicker, title, tagline and (for a title
// with Hangul) the decode pool. Hangul syllables share one advance across the weights of the Korean system faces, so
// the kicker and tagline use the same table.
function avKoMeasure(data) {
  data = data || {};
  var f = avTitleFields(data), text = f.kicker + f.title + f.tagline;
  if (!AV_WIDE_RE.test(text) || typeof document === "undefined" || !document.createElement) return null;
  var ctx = null;
  try { ctx = document.createElement("canvas").getContext("2d"); } catch (e) { ctx = null; }
  if (!ctx || typeof ctx.measureText !== "function") return null;
  var face = AV_TITLE_FACES[data.font] || AV_TITLE_FACES.anton, px = 100;
  ctx.font = "700 " + px + "px " + avFontStack(face.family);
  // Built in one literal at the end (the panel type-checks this block: no keys added later). Object({}) is an
  // untyped map for the per-character advances.
  var s = ctx.measureText("\ud55c\uae00");
  var ink = s && s.actualBoundingBoxAscent > 0 && s.actualBoundingBoxDescent >= 0 ? { up: s.actualBoundingBoxAscent / px, down: s.actualBoundingBoxDescent / px } : null;
  var adv = Object({}), chars = Array.from(text).concat(avHasHangul(f.title) ? AV_POOL_HANGUL : []);
  for (var i = 0; i < chars.length; i++) {
    if (AV_WIDE_RE.test(chars[i]) && !(chars[i] in adv)) adv[chars[i]] = ctx.measureText(chars[i]).width / px;
  }
  return ink ? { koAdvances: adv, koInk: ink } : { koAdvances: adv };
}

function avMetrics(data, family) {
  var fonts = data && Array.isArray(data.fonts) ? data.fonts : [];
  for (var i = 0; i < fonts.length; i++) if (fonts[i] && fonts[i].family === family && fonts[i].metrics) return fonts[i].metrics;
  return AV_FALLBACK_METRICS;
}
// `kw` (avKoWide) supplies measured wide advances; Latin always comes from the metrics (or the 0.56 em fallback).
function avAdvance(m, ch, kw) {
  var a = m.advances[ch];
  return typeof a === "number" ? a : (AV_WIDE_RE.test(ch) ? avKoAdvance(kw, ch) : 0.56) * m.unitsPerEm;
}
// Advance width of `text` at `px` (kerning ignored), plus `tracking` em between letters (CSS letter-spacing also
// follows the last letter, but that space is never visible).
function avTextWidth(text, m, px, tracking, kw) {
  var units = 0, chars = Array.from(text);
  for (var i = 0; i < chars.length; i++) units += avAdvance(m, chars[i], kw);
  return (units * px) / m.unitsPerEm + (tracking || 0) * px * Math.max(0, chars.length - 1);
}
// Ink extents above / below the baseline in em.
function avInk(text, m, kw) {
  var up = m.xHeight, down = 0;
  if (/[A-Z0-9bdfhklt\u00c0-\u00de\u00df!?'"&%$#@/\\|(){}[\]]/.test(text)) up = Math.max(up, m.capHeight);
  if (/[gjpqy,;()[\]{}|]/.test(text)) down = -m.descent;
  if (AV_WIDE_RE.test(text)) { up = Math.max(up, kw.up * m.unitsPerEm); down = Math.max(down, kw.down * m.unitsPerEm); }
  return { up: up / m.unitsPerEm, down: down / m.unitsPerEm };
}
// Latin is set in capitals; text with Hangul keeps its case.
function avCase(text) { return avHasHangul(text) ? text : text.toUpperCase(); }

// The three text fields, each cut to AV_FIELD_MAX graphemes (after the case change, which can lengthen a word).
function avTitleFields(data) {
  var raw = data.fields || {};
  // Adjust edits land on flat keys (data.title, ...), so a flat string wins over data.fields.
  var pick = function (k) {
    var v = typeof data[k] === "string" ? data[k] : raw[k];
    var g = avGraphemes(avCase(typeof v === "string" ? v.replace(/\s+/g, " ").trim() : ""));
    return g.slice(0, AV_FIELD_MAX[k]).join("").trim();
  };
  return { kicker: pick("kicker"), title: pick("title"), tagline: pick("tagline") };
}
function avNum(v, d, lo, hi) { return typeof v === "number" && isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; }

// A one-line text item (kicker, tagline): x = left edge, y = baseline; `tracking` em (0 with Hangul).
function avLine(part, text, face, m, size, tracking, color, kw) {
  var tr = avHasHangul(text) ? 0 : tracking;
  return { part: part, text: text, family: face.family, weight: face.weight, stack: avFontStack(face.family), size: size, tracking: tr, color: color,
    w: avTextWidth(text, m, size, tr, kw), ink: avInk(text, m, kw), x: 0, y: 0 };
}

// The lockup at canvas size: { title: { letters, size, y, ... } | null, kicker, tagline, box, steps }.
function avTitleLayout(data, width, height) {
  data = data || {};
  var W = width > 0 ? width : 1920, H = height > 0 ? height : 1080;
  var preset = AV_TITLE_PRESETS[data.preset] || AV_TITLE_PRESETS.cinematic;
  var fields = avTitleFields(data);
  var S = avNum(data.size, 100, 60, 160) / 100;
  var titleColor = typeof data.titleColor === "string" && data.titleColor ? data.titleColor : preset.titleColor;
  var textColor = typeof data.textColor === "string" && data.textColor ? data.textColor : preset.textColor;
  var face = AV_TITLE_FACES[data.font] || AV_TITLE_FACES.anton;
  var mt = avMetrics(data, face.family), mk = avMetrics(data, AV_KICKER_FACE.family), mg = avMetrics(data, AV_TAGLINE_FACE.family);
  var fitW = AV_FIT * W, kw = avKoWide(data);
  // Title: sized by the face's cap height, condensed (Latin only), shrunk to the fit width down to a floor.
  var title = null;
  if (fields.title) {
    var ko = avHasHangul(fields.title), cx = ko ? 1 : face.condense;
    var F0 = (AV_TITLE_CAP * H * S) / (mt.capHeight / mt.unitsPerEm);
    // One letter box per grapheme, advanced by its first code point (a combining mark adds no width).
    var chars = avGraphemes(fields.title), units = 0;
    for (var u = 0; u < chars.length; u++) units += avAdvance(mt, Array.from(chars[u])[0], kw);
    var w0 = ((units * F0) / mt.unitsPerEm) * cx;
    var F = F0 * Math.max(AV_TITLE_FLOOR, Math.min(1, fitW / w0));
    var pen = 0, step = 0, letters = [];
    for (var i = 0; i < chars.length; i++) {
      var ch = chars[i], cls = avCharClass(ch), w = (avAdvance(mt, Array.from(ch)[0], kw) * F * cx) / mt.unitsPerEm;
      // step: the letter's decode step (-1 for a space or punctuation); at: the step from which it is drawn (a
      // punctuation mark is drawn solid once every letter before it has locked).
      var lock = avLockable(cls);
      letters.push({ ch: ch, cls: cls, x: pen, w: w, step: lock ? step : -1, at: step });
      if (lock) step++;
      pen += w;
    }
    title = { part: "title", text: fields.title, family: face.family, weight: face.weight, stack: avFontStack(face.family), size: F, condense: cx,
      color: titleColor, w: pen, ink: avInk(fields.title, mt, kw), x: 0, y: 0, letters: letters, steps: step,
      // Hangul is drawn in the system Korean face, whose regular weight looks light next to Anton.
      koWeight: 700 };
  }
  var capPx = title ? (title.size * mt.capHeight) / mt.unitsPerEm : AV_TITLE_CAP * H * S;
  var kicker = fields.kicker ? avLine("kicker", fields.kicker, AV_KICKER_FACE, mk, (AV_KICKER_CAP * H * S) / (mk.capHeight / mk.unitsPerEm), 0, textColor, kw) : null;
  var tagline = null;
  if (fields.tagline) {
    var Fg = ((AV_TAGLINE_CAP * H * S) / (mg.capHeight / mg.unitsPerEm)) * (preset.taglineSize / 100);
    tagline = avLine("tagline", fields.tagline, AV_TAGLINE_FACE, mg, Fg, avNum(data.taglineTracking, preset.taglineTracking, 0, 1), textColor, kw);
    // Too wide: less tracking first (down to a floor), then a smaller size.
    if (tagline.w > fitW && tagline.tracking > AV_TRACK_FLOOR) {
      var n = Array.from(tagline.text).length - 1, plain = avTextWidth(tagline.text, mg, Fg, 0, kw);
      var tr = n > 0 ? Math.max(AV_TRACK_FLOOR, (fitW - plain) / (n * Fg)) : 0;
      tagline = avLine("tagline", fields.tagline, AV_TAGLINE_FACE, mg, Fg, Math.min(tagline.tracking, tr), textColor, kw);
    }
    if (tagline.w > fitW) tagline = avLine("tagline", fields.tagline, AV_TAGLINE_FACE, mg, Fg * Math.max(AV_SMALL_FLOOR, fitW / tagline.w), tagline.tracking, textColor, kw);
  }
  if (kicker && kicker.w > fitW) kicker = avLine("kicker", fields.kicker, AV_KICKER_FACE, mk, kicker.size * Math.max(AV_SMALL_FLOOR, fitW / kicker.w), 0, textColor, kw);
  // Stack top to bottom (ink to ink), each line centred on x = 0; the title baseline is y = 0.
  var top = title ? -title.ink.up * title.size : 0, bottom = title ? title.ink.down * title.size : 0;
  if (title) title.x = -title.w / 2;
  if (kicker) {
    kicker.x = -kicker.w / 2;
    kicker.y = title ? top - AV_GAP_KICKER * capPx - kicker.ink.down * kicker.size : 0;
  }
  if (tagline) {
    tagline.x = -tagline.w / 2;
    tagline.y = title || kicker ? (title ? bottom : kicker.y + kicker.ink.down * kicker.size) + AV_GAP_TAGLINE * capPx + tagline.ink.up * tagline.size : 0;
  }
  var parts = [kicker, title, tagline].filter(Boolean);
  if (!parts.length) return { title: null, kicker: null, tagline: null, box: null, steps: 0 };
  var box = [Infinity, Infinity, -Infinity, -Infinity];
  parts.forEach(function (p) {
    box = [Math.min(box[0], p.x), Math.min(box[1], p.y - p.ink.up * p.size), Math.max(box[2], p.x + p.w), Math.max(box[3], p.y + p.ink.down * p.size)];
  });
  // Never wider than the fit width (a long title past its floor): scale everything, then centre the ink box.
  var k = Math.min(1, fitW / (box[2] - box[0]));
  var ax = (avNum(data.x, 50, 20, 80) / 100) * W, ay = (avNum(data.y, 48, 20, 80) / 100) * H;
  var bx = (box[0] + box[2]) / 2, by = (box[1] + box[3]) / 2;
  var tx = function (v) { return ax + (v - bx) * k; }, ty = function (v) { return ay + (v - by) * k; };
  var place = function (p) {
    if (!p) return null;
    var o = Object.assign({}, p, { x: tx(p.x), y: ty(p.y), size: p.size * k, w: p.w * k });
    o.box = [o.x, o.y - p.ink.up * o.size, o.x + o.w, o.y + p.ink.down * o.size];
    if (p.letters) o.letters = p.letters.map(function (l) { return Object.assign({}, l, { x: o.x + l.x * k, w: l.w * k }); });
    return o;
  };
  return { title: place(title), kicker: place(kicker), tagline: place(tagline), box: [tx(box[0]), ty(box[1]), tx(box[2]), ty(box[3])], steps: title ? title.steps : 0, metrics: mt };
}

// Timing in seconds for a title of `steps` decode steps (its lockable graphemes; spaces and punctuation take none) at
// `fps` (default 30): { textIn, decodeStart, letterSeconds, cutSeconds, minHold, fit }. data.timing is the planner's
// avOpeningTiming ({ revealStart?, revealEnd?, k?, textIn, decodeStart, letterSeconds, cutSeconds? }; the reveal keys
// are accepted so the object can be passed whole). `speed` (%, clamped to 25-400) scales the letter rate:
// base = letterSeconds x 100 / speed.
// Fit, when cutSeconds (the opening shot's length) is given and the title has steps: the last letter must lock by
// end = cutSeconds - minHold - 2 / fps, minHold = max(AV_HOLD_MIN, AV_HOLD_SHARE x cutSeconds) (the 2 frames cover the
// frame rounding of decodeStart and of the last lock, so the hold is >= minHold in whole frames).
//   1. letterSeconds = min(base, max(AV_LETTER_MIN, (end - decodeStart) / steps)): never slower than asked, faster
//      when the decode would run into the hold ('letters').
//   2. Still past end at AV_LETTER_MIN per letter: the decode starts earlier, decodeStart = max(textIn, end - steps x
//      AV_LETTER_MIN) ('early').
//   3. Still past end (decodeStart = textIn): letterSeconds = max(0, (end - textIn) / steps), several letters per frame;
//      0 (textIn already past end) draws the title whole at textIn ('squeezed').
// fit is 'none' when nothing changed. Without cutSeconds (older Drafts) the timing is as before: decodeStart and base.
function avTiming(data, steps, fps) {
  var t = (data && data.timing) || {};
  var f = fps > 0 ? fps : 30, n = steps > 0 ? steps : 0;
  var textIn = avNum(t.textIn, AV_TIMING.textIn, 0, 600);
  var decodeStart = Math.max(textIn, avNum(t.decodeStart, AV_TIMING.decodeStart, 0, 600));
  var ls = avNum(t.letterSeconds, AV_TIMING.letterSeconds, 0.005, 5) * (100 / avNum(data && data.speed, 100, 25, 400));
  var cut = avNum(t.cutSeconds, 0, 0, 600), minHold = cut > 0 ? Math.max(AV_HOLD_MIN, AV_HOLD_SHARE * cut) : 0, fit = "none";
  if (cut > 0 && n > 0) {
    var end = cut - minHold - 2 / f;
    var fitLs = Math.min(ls, Math.max(AV_LETTER_MIN, (end - decodeStart) / n));
    if (fitLs < ls) { ls = fitLs; fit = "letters"; }
    if (decodeStart + n * ls > end + 1e-9) { decodeStart = Math.max(textIn, end - n * ls); fit = "early"; }
    if (decodeStart + n * ls > end + 1e-9) { ls = Math.max(0, (end - decodeStart) / n); fit = "squeezed"; }
  }
  return { textIn: textIn, decodeStart: decodeStart, letterSeconds: ls, cutSeconds: cut, minHold: minHold, fit: fit };
}

// What to draw at `frame` (timeline frame = clip frame): { textOpacity, glyphs: [{ ch, x (left), y (baseline), size,
// condense, opacity, ghost, family, weight, stack, color }], decoded }. Before textIn: nothing. From textIn: kicker and
// tagline (fading in over 3 frames). From decodeStart (avTiming, fitted before the cut): letter k (k-th lockable
// grapheme) shows a ghost glyph during [decodeStart + k * letterSeconds, decodeStart + (k + 1) * letterSeconds), then
// is drawn solid; letters after it are empty. Spaces are never drawn; punctuation takes no time and is drawn solid
// once every letter before it has locked.
function avDecodeFrame(layout, data, frame, fps) {
  var t = layout && layout.title, f = fps > 0 ? fps : 30;
  var tm = avTiming(data || {}, t ? t.steps : 0, f);
  var inF = Math.round(tm.textIn * f), decF = Math.round(tm.decodeStart * f), lsF = tm.letterSeconds * f;
  var out = { textOpacity: 0, glyphs: [], decoded: 0 };
  if (!layout || !layout.box || frame < inF) return out;
  out.textOpacity = Math.min(1, (frame - inF + 1) / 3);
  if (!t || frame < decF) return out;
  // The step showing a ghost (>= steps: all locked); a zero letter time locks everything at decodeStart.
  var now = lsF > 0 ? Math.floor((frame - decF) / lsF + 1e-9) : t.steps;
  var m = layout.metrics || AV_FALLBACK_METRICS, kw = avKoWide(data);
  for (var i = 0; i < t.letters.length; i++) {
    var l = t.letters[i];
    if (l.cls === "space") continue;
    if (l.step < 0 ? l.at > now : l.step > now) continue;
    var ghost = l.step >= 0 && l.step === now, ch = ghost ? avGhostChar(l.ch, i, frame) : l.ch;
    // A ghost glyph is centred in the final letter's box (its own advance may differ).
    var gw = ghost ? (avAdvance(m, Array.from(ch)[0], kw) * t.size * t.condense) / m.unitsPerEm : l.w;
    var ko = AV_HANGUL_RE.test(ch);
    out.glyphs.push({ ch: ch, x: l.x + (l.w - gw) / 2, y: t.y, size: t.size, condense: t.condense, opacity: ghost ? AV_GHOST_OPACITY : 1, ghost: ghost,
      family: t.family, weight: ko ? t.koWeight : t.weight, stack: t.stack, color: t.color });
  }
  out.decoded = Math.min(t.steps, now);
  return out;
}

// Backdrop ("scrim"): a soft black ellipse behind the lockup, so the white kicker and tagline stay readable over a
// bright opening shot (the reference's dark opening isolates the whole lockup). data.scrim 0-1 is its peak opacity
// (default AV_SCRIM_DEFAULT; 0 draws nothing). It is centred on the lockup's ink box with generous margins, fully dark
// out to AV_SCRIM_CORE of its radii and feathered to 0 at the edge (smoothstep), and fades in from textIn over
// AV_SCRIM_FADE s, then stays while the title is up. It never changes the text layout.
var AV_SCRIM_DEFAULT = 0.4, AV_SCRIM_FADE = 0.3, AV_SCRIM_CORE = 0.5, AV_SCRIM_STOPS = 8;
// Radii: the box's half sizes x AV_SCRIM_GROW (the box corners land at radius sqrt(2) / GROW = 0.75, still about half
// the peak), plus a margin in canvas heights.
var AV_SCRIM_GROW = Math.SQRT2 / 0.75, AV_SCRIM_PAD_X = 0.04, AV_SCRIM_PAD_Y = 0.08;
// The backdrop at `frame`: { cx, cy, rx, ry, opacity, stops: [{ offset, alpha }] } in canvas pixels (alpha 0-1 of the
// peak, drawn as a radial gradient on the ellipse), or null when there is nothing to draw (scrim 0, no lockup, before
// textIn). `height` is the canvas height.
function avScrim(layout, data, frame, fps, height) {
  var peak = avNum(data && data.scrim, AV_SCRIM_DEFAULT, 0, 1), f = fps > 0 ? fps : 30, H = height > 0 ? height : 1080;
  if (!layout || !layout.box || peak <= 0) return null;
  var tm = avTiming(data || {}, layout.title ? layout.title.steps : 0, f), inF = Math.round(tm.textIn * f);
  if (frame < inF) return null;
  // The same frame rounding as the text (avDecodeFrame), ramped over the fade with a smoothstep.
  var u = Math.min(1, (frame - inF + 1) / Math.max(1, AV_SCRIM_FADE * f)), ramp = u * u * (3 - 2 * u);
  var b = layout.box, stops = [];
  for (var i = 0; i <= AV_SCRIM_STOPS; i++) {
    var r = AV_SCRIM_CORE + ((1 - AV_SCRIM_CORE) * i) / AV_SCRIM_STOPS, v = (r - AV_SCRIM_CORE) / (1 - AV_SCRIM_CORE);
    stops.push({ offset: r, alpha: 1 - v * v * (3 - 2 * v) });
  }
  return { cx: (b[0] + b[2]) / 2, cy: (b[1] + b[3]) / 2, rx: ((b[2] - b[0]) / 2) * AV_SCRIM_GROW + AV_SCRIM_PAD_X * H,
    ry: ((b[3] - b[1]) / 2) * AV_SCRIM_GROW + AV_SCRIM_PAD_Y * H, opacity: peak * ramp, stops: [{ offset: 0, alpha: 1 }].concat(stops) };
}
// The backdrop's darkening at canvas point (x, y): the fraction of the light it takes away (0-1), exactly as the
// gradient draws it (piecewise linear between the stops). For tests and measurements.
function avScrimAt(scrim, x, y) {
  if (!scrim) return 0;
  var dx = (x - scrim.cx) / scrim.rx, dy = (y - scrim.cy) / scrim.ry, r = Math.sqrt(dx * dx + dy * dy), s = scrim.stops;
  if (r >= 1) return 0;
  for (var i = 1; i < s.length; i++) {
    if (r <= s[i].offset) return scrim.opacity * (s[i - 1].alpha + ((r - s[i - 1].offset) / (s[i].offset - s[i - 1].offset)) * (s[i].alpha - s[i - 1].alpha));
  }
  return 0;
}
// av-decode:end
  return { avTitleLayout, avDecodeFrame, avKoMeasure, avTiming, avFontStack, AV_TITLE_FACES, avScrim };
})();
// The credit's layout (assets/archived-credit.tsx, embedded verbatim).
const AV_CREDIT: any = (function () {
// av-credit:start
// Pure layout, shared with the panel preview (which evaluates this block as plain JS). Measured with the per-font
// advance table from presets.json passed in `data.fonts[i].metrics`. Reference (1920x1080): Oswald Bold-like caps,
// cap height 25 px, centred on the frame.
var AVC_FACE = { family: "AV Oswald Bold", weight: 700 };
var AVC_CAP = 25 / 1080;
var AVC_FIT = 0.8; // max width, fraction of canvas width
var AVC_DEFAULTS = { prefix: "ARCHIVED BY", name: "YOURNAME", color: "#FFFFFF" };
var AVC_FALLBACK_METRICS = { unitsPerEm: 1000, xHeight: 500, capHeight: 700, ascent: 720, descent: -220, advances: {} };
// Korean names: no uppercase or tracking, both Korean system faces in the stack. Wide characters are drawn in the
// system Korean face ("Apple SD Gothic Neo" / "Malgun Gothic"), so the render and the panel measure them with a canvas
// (avcKoMeasure) and pass `data.koInk` ({ up, down } em) and `data.koAdvances` ({ char: em }). Without them (Node) a
// wide character counts as 1 em, its ink 0.86 em up and 0.12 em down (tuned on Apple SD Gothic Neo).
var AVC_HANGUL_RE = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/;
var AVC_WIDE_RE = /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]/;
var AVC_WIDE_UP = 0.86, AVC_WIDE_DOWN = 0.12;
function avcFontStack(family) {
  return '"' + family + '", "Arial Narrow", Impact, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
}
function avcKoWide(data) {
  var ink = data.koInk, adv = data.koAdvances;
  var ok = ink && typeof ink.up === "number" && typeof ink.down === "number" && ink.up > 0.3 && ink.up < 1.5 && ink.down >= 0 && ink.down < 0.6;
  return { up: ok ? ink.up : AVC_WIDE_UP, down: ok ? ink.down : AVC_WIDE_DOWN, adv: adv && typeof adv === "object" ? adv : null };
}
function avcKoAdvance(kw, ch) {
  var a = kw.adv ? kw.adv[ch] : undefined;
  return typeof a === "number" && isFinite(a) && a > 0.2 && a < 2 ? a : 1;
}
// The credit's text as drawn, or "" when empty: Latin in capitals even next to Hangul (Hangul has no case, so it stays
// as typed), e.g. "ARCHIVED BY KIM <Korean name>".
function avcFullText(data) {
  var text = [avcText(data, "prefix"), avcText(data, "name")].filter(Boolean).join(" ");
  return text.toUpperCase();
}
// Measures the wide glyphs on a 2D canvas with the exact stack and weight the credit draws them with (call it once
// the fonts are loaded): { koInk, koAdvances } to merge into `data`, or null in Node or without a wide glyph.
function avcKoMeasure(data) {
  data = data || {};
  var text = avcFullText(data);
  if (!AVC_WIDE_RE.test(text) || typeof document === "undefined" || !document.createElement) return null;
  var ctx = null;
  try { ctx = document.createElement("canvas").getContext("2d"); } catch (e) { ctx = null; }
  if (!ctx || typeof ctx.measureText !== "function") return null;
  var px = 100;
  ctx.font = (AVC_HANGUL_RE.test(text) ? 700 : AVC_FACE.weight) + " " + px + "px " + avcFontStack(AVC_FACE.family);
  // Built in one literal at the end (the panel type-checks this block: no keys added later). Object({}) is an
  // untyped map for the per-character advances.
  var s = ctx.measureText("\ud55c\uae00");
  var ink = s && s.actualBoundingBoxAscent > 0 && s.actualBoundingBoxDescent >= 0 ? { up: s.actualBoundingBoxAscent / px, down: s.actualBoundingBoxDescent / px } : null;
  var adv = Object({}), chars = Array.from(text);
  for (var i = 0; i < chars.length; i++) {
    if (AVC_WIDE_RE.test(chars[i]) && !(chars[i] in adv)) adv[chars[i]] = ctx.measureText(chars[i]).width / px;
  }
  return ink ? { koAdvances: adv, koInk: ink } : { koAdvances: adv };
}
function avcNum(v, d, lo, hi) { return typeof v === "number" && isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; }
// Each of prefix and name is cut to AVC_MAX width units (a wide character counts 2), as the panel's fields count
// them: Adjust edits never pass the panel's limit.
var AVC_MAX = 24;
function avcClip(text) {
  var out = "", n = 0, chars = Array.from(String(text));
  for (var i = 0; i < chars.length; i++) {
    var w = AVC_WIDE_RE.test(chars[i]) ? 2 : 1;
    if (n + w > AVC_MAX) break;
    out += chars[i]; n += w;
  }
  return out;
}
function avcText(data, key) {
  var v = typeof data[key] === "string" ? data[key] : AVC_DEFAULTS[key];
  return avcClip(String(v).replace(/\s+/g, " ").trim()).trim();
}

// { text, x (left), y (baseline), size, w, color, family, weight, stack, box } or null when there is no text.
function avCreditLayout(data, width, height) {
  data = data || {};
  var W = width > 0 ? width : 1920, H = height > 0 ? height : 1080;
  var text = avcFullText(data);
  if (!text) return null;
  var ko = AVC_HANGUL_RE.test(text), kw = avcKoWide(data);
  var m = null, fonts = Array.isArray(data.fonts) ? data.fonts : [];
  for (var i = 0; i < fonts.length; i++) if (fonts[i] && fonts[i].family === AVC_FACE.family && fonts[i].metrics) m = fonts[i].metrics;
  m = m || AVC_FALLBACK_METRICS;
  var size = (AVC_CAP * H * (avcNum(data.size, 100, 60, 200) / 100)) / (m.capHeight / m.unitsPerEm);
  var units = 0, chars = Array.from(text);
  for (var j = 0; j < chars.length; j++) {
    var a = m.advances[chars[j]];
    units += typeof a === "number" ? a : (AVC_WIDE_RE.test(chars[j]) ? avcKoAdvance(kw, chars[j]) : 0.56) * m.unitsPerEm;
  }
  var w = (units * size) / m.unitsPerEm;
  // Shrink a long name to the fit width.
  if (w > AVC_FIT * W) { size *= (AVC_FIT * W) / w; w = AVC_FIT * W; }
  var up = Math.max(m.capHeight / m.unitsPerEm, AVC_WIDE_RE.test(text) ? kw.up : 0);
  var down = Math.max(/[gjpqy,;()[\]{}|]/.test(text) ? -m.descent / m.unitsPerEm : 0, AVC_WIDE_RE.test(text) ? kw.down : 0);
  // The ink box is centred on (x %, y %) of the canvas.
  var cx = (avcNum(data.x, 50, 10, 90) / 100) * W, cy = (avcNum(data.y, 50, 10, 90) / 100) * H;
  var x = cx - w / 2, y = cy + ((up - down) / 2) * size;
  return { text: text, x: x, y: y, size: size, w: w, hangul: ko, color: typeof data.color === "string" && data.color ? data.color : AVC_DEFAULTS.color,
    family: AVC_FACE.family, weight: ko ? 700 : AVC_FACE.weight, stack: avcFontStack(AVC_FACE.family), box: [x, y - up * size, x + w, y + down * size] };
}
// av-credit:end
  return { avCreditLayout, avcKoMeasure };
})();
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

// Joins a path under the install folder.
const pjoin = hostJoin;
const readBytes = hostReadBytes;
async function readText(root: string, ...rel: string[]) { return hostReadText(hostJoin(root, ...rel)); }
const locateRoots = (sdk: any) => hostRoots(sdk, PLUGIN_ID, "planner.js");

// ---- Your own music --------------------------------------------------------------------------------------------
// Mono samples at OWN_RATE, at most OWN_MAX_SECONDS: the host's ffmpeg when it has one (hostDecodePcm); without it, or
// when it fails, the panel decodes the file's bytes with WebAudio (whatever Chromium decodes: mp3, m4a/aac, wav, flac,
// ogg) and averages the channels, as ffmpeg's mono downmix does.
async function decodeOwnMusic(path: string, dataDir: string | null, signal: AbortSignal): Promise<Float32Array> {
  let first: any = null;
  try { const s = await hostDecodePcm(path, dataDir, OWN_RATE, OWN_MAX_SECONDS, signal); if (s) return s; } catch (e) { first = e; }
  if (signal.aborted) throw new Error("cancelled");
  try {
    const Ctx: any = (window as any).OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    if (!Ctx) throw new Error("this panel cannot decode audio");
    const bytes = await readBytes(path);
    if (signal.aborted) throw new Error("cancelled");
    const ctx = new Ctx(1, 1, OWN_RATE);
    const buf: AudioBuffer = await ctx.decodeAudioData(bytes.slice().buffer);
    if (signal.aborted) throw new Error("cancelled");
    const n = Math.min(buf.length, Math.round(OWN_MAX_SECONDS * buf.sampleRate));
    const out = new Float32Array(n);
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const ch = buf.getChannelData(c);
      for (let i = 0; i < n; i++) out[i] += ch[i] / buf.numberOfChannels;
    }
    if (!out.length) throw new Error("no audio");
    return out;
  } catch (e) { throw signal.aborted ? new Error("cancelled") : first || e; }
}
// beat-detect's analysis of the samples in a Web Worker (avBeatWorkerSource), never on the panel's thread: the panel
// CSP allows blob: workers (cutback-client panelSandbox.ts: worker-src * data: blob:). A host that refuses the worker
// rejects the analysis, and the panel falls back to fixed timing. `signal` aborts it (worker.terminate()); so does
// `timeoutMs` (BEAT_TIMEOUT_MS): a worker that never answers rejects with code "beat-timeout" (fixed timing then).
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
// A browser-playable type for a music file, by its extension ("" lets the browser sniff).
function audioType(path: string) {
  const ext = (String(path).split(/[\\/]/).pop() || "").split(".").pop()!.toLowerCase();
  return ({ mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac", wav: "audio/wav", flac: "audio/flac", ogg: "audio/ogg", opus: "audio/ogg" } as any)[ext] || "";
}

// ---- Panel helpers ---------------------------------------------------------------------------------------------
// The config goes in as JSON.parse of a string so its type is `any`: an inlined literal widens `type` to string
// (rejected by EditableParameterDefinition[]) and narrows a null option to `never` inside its `if`.
function fill(script: string, cfg: unknown) { return script.replace("__CONFIG__", () => "JSON.parse(" + JSON.stringify(JSON.stringify(cfg)) + ")"); }
// Thrown when the Project changed while a build was running; its results are dropped silently.
const STALE = new Error("The Project changed during the build.");
// A read-only call that still failed with a host-busy / deadline error after its retries.
const isBusyError = (text: string) => /deadline|did not finish|hostWaitMs|before the script started/i.test(text);
class BusyError extends Error {
  say: Say;
  constructor() { super("Selects is busy and didn't answer in time."); this.say = (l) => t(l, "busy"); }
}
// Everything a build reads from the install folder, once.
async function loadAssets(plugin: string) {
  const read = (...rel: string[]) => readText(plugin, ...rel);
  const [manifest, presets, inventoryJs, searchJs, ensureJs, assembleJs, decorateJs, title, credit, letterbox, look, fade, motion, beatDetect] = await Promise.all([
    read("assets", "cues", "manifest.json"), read("assets", "fonts", "presets.json"), read("scripts", "inventory.js"), read("scripts", "search.js"),
    read("scripts", "ensure-audio.js"), read("scripts", "assemble.js"), read("scripts", "decorate.js"), read("assets", "decode-title.tsx"),
    read("assets", "archived-credit.tsx"), read("assets", "letterbox-reveal.tsx"), read("assets", "cinematic-look.tsx"), read("assets", "fade-out.tsx"),
    read("assets", "photo-motion.tsx"), read("beat-detect.cjs")]);
  return { manifest: JSON.parse(manifest), presets: JSON.parse(presets), scripts: { inventoryJs, searchJs, ensureJs, assembleJs, decorateJs },
    tsx: { title, credit, letterbox, look, fade, motion }, beatWorker: avBeatWorkerSource(beatDetect) };
}
// Every font file the presets use (four small files).
function fontFiles(presets: any): string[] {
  return [...new Set<string>((presets?.presets || []).flatMap((p: any) => (p.fonts || []).map((f: any) => f.file as string)))];
}
// A bundled cue's grid (manifest), the one a build and the section slider use. A cue with a reference edit
// (referenceBpm, referenceStart: the team's reference timeline cuts on that grid from there, without onset snapping)
// runs on that grid: its bars from referenceStart, which is the default section, and no snapping. Its beatEnergy is
// indexed on the measured grid, so it is left out (a section that does not fit falls back to the first bar).
function cueGrid(cue: any) {
  const ref = cue.referenceBpm > 0 && typeof cue.referenceStart === "number", bpm = ref ? cue.referenceBpm : cue.bpm, bar = 240 / bpm;
  return { bpm, accepted: true, approxBpm: null, firstBeat: ref ? cue.referenceStart - Math.floor(cue.referenceStart / bar) * bar : cue.firstBeat, usableEnd: cue.usableEnd,
    introStart: ref ? cue.referenceStart : cue.introStart, beatEnergy: ref ? [] : cue.beatEnergy || [],
    downbeatHigh: cue.downbeatConfidence === "high", peaks: cue.peaks || [], onsets: ref ? NO_ONSETS : cue.onsets || NO_ONSETS, onsetThresholds: cue.onsetThresholds };
}
const NO_MUSIC_GRID = { none: true, bpm: null, accepted: false, approxBpm: null, firstBeat: 0, usableEnd: null, beatEnergy: [], peaks: [], onsets: NO_ONSETS, onsetThresholds: undefined };
// The music side of a build: the tempo the template runs on (avTempo), the montage the music fits, the video's length
// and the section snapping and default. Pure; the panel works it out on every render, a template run once.
function musicFit(grid: any, length: string, pace: string) {
  const tm = avTempo({ bpm: grid.bpm, accepted: grid.accepted, approxBpm: grid.approxBpm });
  // A beat (grid or approximate) the section snaps to in whole bars; otherwise to 0.1 s.
  const timed = tm.gridded || !!tm.approxBpm;
  const requested = avMontageShots(length, pace);
  const top = avMontageLadder({ requested, pace, bpm: tm.tempo })[0];
  const fitted = avFitShots({ requested, pace, bpm: tm.tempo, sectionStart: timed ? grid.firstBeat : 0, usableEnd: grid.usableEnd });
  const seconds = (n: number) => avVideoSeconds({ bpm: tm.tempo, pace, montageShots: n });
  const videoSeconds = seconds(fitted || top);
  const snap = (value: number): number | null => (grid.none ? 0
    : avSnapSection({ value, firstBeat: grid.firstBeat, bpm: tm.tempo, usableEnd: grid.usableEnd, videoSeconds, gridAccepted: timed }));
  // The section a new track starts on: a bundled cue's soft intro (introStart), else the most energetic window.
  const defaultSection = (): number | null => (grid.none ? 0 : !tm.gridded ? snap(0)
    : avIntroSection({ introStart: grid.introStart, firstBeat: grid.firstBeat, bpm: grid.bpm, usableEnd: grid.usableEnd, videoSeconds, beatEnergy: grid.beatEnergy, downbeatHigh: grid.downbeatHigh }) ?? snap(grid.firstBeat));
  return { ...tm, timed, requested, top, fitted, seconds, videoSeconds, snap, defaultSection };
}
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
// The Draft's name: "Archive Vlog", the title as typed (or the preset's name) and the time. English, like every Draft name.
function draftNameOf(title: string, presetLabel: string, d: Date) {
  return "Archive Vlog " + (String(title || "").replace(/\s+/g, " ").trim() || presetLabel) + " " + stamp(d);
}
// The Inspector labels and Motion choices in a language (frozen at Build).
function adjustLabelsFor(lang: Lang) {
  // i18n-used: param.*
  return Object.fromEntries(Object.keys(AV_ADJUST_LABELS).map((k) => [k, t(lang, "param." + k)]));
}
function motionOptionsFor(lang: Lang) {
  return MOTION_OPTIONS.map((o) => ({ label: tOr(lang, "motion." + o.value, o.label), value: o.value }));
}
// Field labels of the title (the same words as their Adjust labels).
function fieldLabel(lang: Lang, key: string) {
  return key === "kicker" ? t(lang, "param.kicker") : key === "tagline" ? t(lang, "param.tagline") : t(lang, "param.title");
}
// Resolves a --panel-* colour for canvas drawing; falls back when the token is missing or not a colour.
function themeColor(el: Element, ctx: CanvasRenderingContext2D, name: string, fallback: string) {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  if (!v) return fallback;
  ctx.fillStyle = "#010203";
  ctx.fillStyle = v;
  return ctx.fillStyle === "#010203" ? fallback : v;
}
// Readiness facts about clips without Selects' analysis (inventory.js). Nothing here blocks a build: `waiting` = videos
// that cannot be used yet (still being added: no length or no file yet), `local` = selected videos without analysis (their
// shots come from the quick local check; the readiness note says analysed clips give better picks), `analysing` =
// videos Selects is analysing now (the inventory is re-read until they finish, so the next build uses their analysis).
function avFootageFacts(inventory: any, selected: string[]) {
  const sk = (inventory && inventory.skipped) || {};
  const res: any[] = (inventory && inventory.resources) || [];
  return { waiting: sk.unanalysed || 0, local: res.filter((r: any) => r.analysed === false && selected.includes(r.rid)).length, analysing: sk.analysing || 0 };
}

const WAVE_HEIGHT = 56;
// Music section slider: waveform on a canvas with a draggable, snapped window over the chosen section.
// While `audio` plays, a playhead follows its currentTime (seconds into the track) inside the window.
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
  // The latest draw, so the animation loop always paints with the current props. `playAt` is seconds into the track.
  const drawRef = React.useRef<(playAt: number | null) => void>(() => {});
  drawRef.current = (playAt: number | null) => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap || width <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    // The backing store in whole device pixels, so fractional scaling (125 %, 150 %) stays sharp.
    const cw = Math.round(width * dpr), chh = Math.round(WAVE_HEIGHT * dpr);
    if (canvas.width !== cw) canvas.width = cw;
    if (canvas.height !== chh) canvas.height = chh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(cw / width, 0, 0, chh / WAVE_HEIGHT, 0, 0);
    ctx.clearRect(0, 0, width, WAVE_HEIGHT);
    const accent = themeColor(wrap, ctx, "--panel-fg", "#f6c343");
    const muted = themeColor(wrap, ctx, "--panel-muted-fg", "#8a8a8a");
    const mid = WAVE_HEIGHT / 2;
    const x0 = section == null ? -1 : (section / total) * width;
    const x1 = section == null ? -1 : Math.min(width, ((section + videoSeconds) / total) * width);
    const inside = (x: number) => x >= x0 && x <= x1;
    // Selected window: translucent fill under the bars.
    if (section != null) {
      ctx.globalAlpha = 0.14; ctx.fillStyle = accent;
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
        const px = Math.min(x0 + w - 1, Math.max(x0 + 1, (Math.min(playAt, section + videoSeconds) / total) * width));
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
    const at = timeAt(e.clientX);
    const s = section ?? 0;
    // Grabbing the window keeps the grab point; anywhere else centres the window there.
    const offset = section != null && at >= s && at <= s + videoSeconds ? at - s : videoSeconds / 2;
    dragRef.current = { offset };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
    setDragging(true);
    onChange(snap(at - offset));
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    onChange(snap(timeAt(e.clientX) - dragRef.current.offset));
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    if (e.type === "pointerup") onChange(snap(timeAt(e.clientX) - dragRef.current.offset));
    dragRef.current = null; setDragging(false);
    try { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* already released */ }
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
          boxShadow: focused ? "0 0 0 2px var(--panel-fg, #f6c343)" : "inset 0 0 0 1px var(--panel-border, rgba(128, 128, 128, 0.35))", opacity: disabled ? 0.6 : 1 }}>
        <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: WAVE_HEIGHT, pointerEvents: "none" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--panel-muted-fg)", fontVariantNumeric: "tabular-nums", marginTop: 2 }}>
        <span>0:00</span><span>{fmtTime(total)}</span>
      </div>
    </div>
  );
}

// Title preview geometry: a fixed-height box over the middle band of the frame, where the lockup sits (centred at
// 50 / 48 %, at most 80 % of the width), so the box never changes height while typing or switching presets.
const PREVIEW_HEIGHT = 112;
const PREVIEW_VIEW = [0.08 * AV_W, 0.26 * AV_H, 0.84 * AV_W, 0.44 * AV_H].join(" ");
// The credit strip: the middle band around the credit line.
const CREDIT_HEIGHT = 30;
const CREDIT_VIEW = [0.08 * AV_W, 0.44 * AV_H, 0.84 * AV_W, 0.12 * AV_H].join(" ");
const PREVIEW_BG = "linear-gradient(135deg, #2f3236, #15171a)";
// The type sample on a Style tile (letters, not words: never translated).
const TILE_SAMPLE = "Aa";

// The decode lockup as the Draft draws it at `state` (avDecodeFrame), in canvas pixels, over its backdrop (`scrim`:
// decode-title avScrim at the same frame, or null).
function LockupSvg({ layout, state, shadow, scrim }: { layout: any; state: any; shadow: number; scrim?: any }) {
  const line = (p: any) => (p ? (
    <text x={p.x} y={p.y} fill={p.color} fontSize={p.size} fontFamily={p.stack} fontWeight={p.weight} opacity={state.textOpacity}
      style={{ whiteSpace: "pre", fontKerning: "none", fontVariantLigatures: "none", letterSpacing: p.tracking * p.size } as any}>{p.text}</text>
  ) : null);
  return (
    <svg width="100%" height={PREVIEW_HEIGHT} viewBox={PREVIEW_VIEW} preserveAspectRatio="xMidYMid meet"
      style={{ display: "block", filter: shadow > 0 ? "drop-shadow(0 1px 3px rgba(0, 0, 0, " + shadow + "))" : undefined }}>
      {scrim && scrim.opacity > 0 ? (
        <>
          <defs>
            <radialGradient id="av-preview-scrim" cx="0.5" cy="0.5" r="0.5">
              {scrim.stops.map((s: any, i: number) => <stop key={i} offset={s.offset} stopColor="#000000" stopOpacity={s.alpha} />)}
            </radialGradient>
          </defs>
          <ellipse cx={scrim.cx} cy={scrim.cy} rx={scrim.rx} ry={scrim.ry} fill="url(#av-preview-scrim)" opacity={scrim.opacity} />
        </>
      ) : null}
      {line(layout.kicker)}
      {state.glyphs.map((g: any, i: number) => (
        <text key={i} transform={"translate(" + g.x + " " + g.y + ") scale(" + g.condense + " 1)"} x={0} y={0} fill={g.color} opacity={g.opacity}
          fontSize={g.size} fontFamily={g.stack} fontWeight={g.weight} style={{ whiteSpace: "pre", fontKerning: "none", fontVariantLigatures: "none" } as any}>{g.ch}</text>
      ))}
      {line(layout.tagline)}
    </svg>
  );
}

// A template run (Clip highlights hands the footage over in `context.template`) builds out of sight; anything else is
// the panel.
function Panel(props: any) {
  hostUseSdk(props.sdk);
  return props?.context?.template ? <TemplateRun sdk={props.sdk} context={props.context} /> : <ArchiveVlogPanel {...props} />;
}

function ArchiveVlogPanel({ sdk, context, ui }: any) {
  // The UI language, read on every render: Selects can switch languages while the panel is open.
  const L = uiLang(context);
  const projectId = context?.projectId ?? null;
  const projectRef = React.useRef(projectId);
  projectRef.current = projectId;
  const [roots, setRoots] = React.useState<{ plugin: string; data: string | null } | null>(null);
  const [assets, setAssets] = React.useState<any>(null);
  const [inventory, setInventory] = React.useState<any>(null);
  const [candidates, setCandidates] = React.useState<any>(null);
  const [preset, setPreset] = React.useState(DEFAULT_PRESET);
  // The title text the user typed ({ fieldKey: text }); a field not in here shows the preset's initial text. Switching
  // presets keeps what was typed and only drops edits equal to the old preset's text (choosePreset).
  const [fieldEdits, setFieldEdits] = React.useState<Record<string, string>>({});
  // The credit shot ("<prefix> <name>"): on by default. The prefix and the name start as the preset's sample text
  // (null); a name cleared by the user leaves the credit out, so "YOURNAME" is never published by accident.
  const [creditOn, setCreditOn] = React.useState(true);
  const [creditPrefix, setCreditPrefix] = React.useState<string | null>(null);
  const [creditName, setCreditName] = React.useState<string | null>(null);
  // cueId: a manifest cue id, "own" (your own music) or "none" (No music).
  const [cueId, setCueId] = React.useState(DEFAULT_CUE);
  const [ownMusic, setOwnMusic] = React.useState<{ path: string; name: string } | null>(null);
  const [ownGrid, setOwnGrid] = React.useState<any>(null);
  // Your own music being decoded and analysed (Build waits); the job id drops a result that a newer track, a Project
  // switch or closing the panel made stale, and its AbortController stops ffmpeg and the worker.
  const [listening, setListening] = React.useState(false);
  const ownJobRef = React.useRef<{ id: number; abort: AbortController | null }>({ id: 0, abort: null });
  const [length, setLength] = React.useState<"short" | "standard" | "long">(DEFAULT_LENGTH);
  const [pace, setPace] = React.useState<"cinematic" | "quick">(DEFAULT_PACE);
  // Clip sound: the clips' own sound is off (muted), ambient (-18 dB under the music) or full (0 dB).
  const [clipSound, setClipSound] = React.useState<"off" | "ambient" | "full">(DEFAULT_CLIP_SOUND);
  // Cinematic look on every clip; its strength follows the preset until the user moves the slider.
  const [look, setLook] = React.useState(true);
  const [lookStrength, setLookStrength] = React.useState<number | null>(null);
  const [only, setOnly] = React.useState<string[] | null>(null);
  // Photos: on by default. `onlyPhotos` is the photo selection (null = all); `only` stays the video selection, so
  // choosing photos never invalidates the scene search.
  const [usePhotos, setUsePhotos] = React.useState(true);
  const [onlyPhotos, setOnlyPhotos] = React.useState<string[] | null>(null);
  const [section, setSection] = React.useState<number | null>(0);
  // Whether the user moved the section: until then a new length or pace moves it to the track's default start.
  const sectionTouchedRef = React.useRef(false);
  const [seed, setSeed] = React.useState(1);
  const [busy, setBusy] = React.useState(false);
  // Single-flight guard: state updates are async, so a ref blocks a second click in the same tick.
  const busyRef = React.useRef(false);
  // The one-call spinner's text: "checkingClips" (a STRINGS key) or "".
  const [step, setStep] = React.useState("");
  const fontCache = React.useRef<Record<string, Promise<string>>>({});
  const registered = React.useRef<Set<string>>(new Set());
  // Bumped when a bundled font has loaded, so the preview measures again with it.
  const [fontsReady, setFontsReady] = React.useState(0);
  // Build progress (bar + step list). `step` stays for the one-call spinner (the first clip check).
  const [progress, setProgress] = React.useState<any>(null);
  const progressRef = React.useRef<any>(null);
  // `detail` is a message in the UI language (e.g. how many videos were checked).
  const advance = (id: string, fraction: number, detail?: Say) => { const p = { ...avProgress(id, fraction), detail }; progressRef.current = p; setProgress(p); };
  const [status, setStatus] = React.useState<{ tone: string; say: Say } | null>(null);
  const [result, setResult] = React.useState<any>(null);
  // The title preview's replay: the frame shown while the decode replays, null for the finished lockup.
  const [replayFrame, setReplayFrame] = React.useState<number | null>(null);
  const replayRef = React.useRef(0);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const previewTokenRef = React.useRef(0);
  const previewUrlRef = React.useRef<string | null>(null);
  const previewTimerRef = React.useRef<any>(null);
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
      fontCache.current[file] = readText(plugin, "assets", "fonts", file)
        .then((x) => x.replace(/\s+/g, ""))
        .catch((e) => { delete fontCache.current[file]; throw e; });
    }
    return fontCache.current[file];
  };
  // Every bundled font as file name -> WOFF2 data (the title embeds all four, the credit one).
  const allFonts = async (plugin: string, presets: any) => Object.fromEntries(await Promise.all(fontFiles(presets).map(async (f) => [f, await fontB64(plugin, f)])));
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
    return (l) => (at ? t(l, "stoppedAt", { step: at.current + 1, total: AV_BUILD_STEPS.length, name: t(l, "step." + at.id), detail: sayError(l, e) }) : sayError(l, e));
  };
  // Each build or Finish run takes a new epoch, and a Project switch bumps it too: a run that was superseded (the
  // Project changed, even back to the same one, while it ran) fails its next check and never clears the busy state or
  // the progress of the run that replaced it.
  const runEpochRef = React.useRef(0);
  // The quick local check in flight (scoreLocal), cancelled by a newer build, a Project switch or closing the panel.
  const localAbortRef = React.useRef<AbortController | null>(null);
  const runLive = (pid: string, epoch: number) => projectRef.current === pid && runEpochRef.current === epoch;
  const endRun = (pid: string, epoch: number) => {
    if (!runLive(pid, epoch)) return;
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
  // Consecutive reads with clips still being added, and whether that count reached WAITING_POLL_MAX (polling stopped).
  const waitingReadsRef = React.useRef(0);
  const [waitingStalled, setWaitingStalled] = React.useState(false);

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
      // The clip set and which clips have analysis: a changed set, or a clip whose analysis finished, drops the cached
      // shot candidates so the next build searches (or checks) them again.
      const sig = inv.resources.map((r: any) => r.rid + (r.analysed === false ? "~" : "")).sort().join(",");
      if (invSigRef.current !== sig) { if (invSigRef.current !== null) setCandidates(null); invSigRef.current = sig; }
      if (inv.incomplete) { incompleteReadsRef.current++; if (incompleteReadsRef.current >= INCOMPLETE_POLL_MAX) setIncompleteStalled(true); }
      else { incompleteReadsRef.current = 0; setIncompleteStalled(false); }
      if ((inv.skipped?.unanalysed || 0) > 0) { waitingReadsRef.current++; if (waitingReadsRef.current >= WAITING_POLL_MAX) setWaitingStalled(true); }
      else { waitingReadsRef.current = 0; setWaitingStalled(false); }
      setInventory(inv); setInvError(null);
      return "ok";
    } catch (e: any) {
      if (!(e instanceof BusyError)) console.warn("Archive Vlog: reading the Project's clips failed", e);
      if (live()) setInvError(e instanceof BusyError ? { busy: true, say: e.say } : { say: (l: Lang) => sayError(l, e) });
      return e instanceof BusyError ? "busy" : "failed";
    } finally {
      if (invLoadingRef.current === pid) invLoadingRef.current = null;
      if (mountedRef.current && projectRef.current === pid) setInvLoading(false);
    }
  }
  React.useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; replayRef.current++; }; }, []);
  // Refresh: a manual read that also restarts the incomplete-read cycle.
  const refreshInventory = () => { incompleteReadsRef.current = 0; setIncompleteStalled(false); waitingReadsRef.current = 0; setWaitingStalled(false); loadInventory(); };

  // Mount and Project switch: reset per-Project state, resolve folders, read bundled assets, inventory the Project.
  React.useEffect(() => {
    // Drop everything tied to the previous Project so a build never mixes Projects.
    setCandidates(null); setResult(null); setStatus(null); setInventory(null); setInvError(null); setInvLoading(false);
    setOnly(null); setOnlyPhotos(null);
    invSigRef.current = null; photoSizesRef.current = {}; incompleteReadsRef.current = 0; setIncompleteStalled(false); waitingReadsRef.current = 0; setWaitingStalled(false);
    runEpochRef.current++;
    busyRef.current = false; setBusy(false); setStep(""); setProgress(null); progressRef.current = null;
    if (!projectId) return;
    let alive = true;
    (async () => {
      try {
        const found = await locateRoots(sdk);
        if (!alive) return;
        setRoots(found);
        const loaded = await loadAssets(found.plugin);
        if (!alive) return;
        setAssets(loaded);
        inventoryJsRef.current = loaded.scripts.inventoryJs;
        setStep("checkingClips");
        // The first read right after the app starts can fail while the Project is still loading: one retry.
        if (await loadInventory(projectId, () => alive) === "failed" && alive) {
          await new Promise((d) => setTimeout(d, INVENTORY_RETRY_MS));
          if (alive && projectRef.current === projectId) { setInvError(null); await loadInventory(projectId, () => alive); }
        }
      } catch (e: any) {
        if (alive) setStatus({ tone: "error", say: errorSay(e, (l, detail) => t(l, "startFailed", { detail })) });
      } finally { if (alive) setStep(""); }
    })();
    // Project switch or unmount stops a preview, including one still being prepared, and an own-music analysis (its
    // track is dropped: the next Project starts without it).
    return () => {
      alive = false; stopPreview(); localAbortRef.current?.abort();
      if (cancelOwnMusic() && mountedRef.current) { setOwnMusic(null); setOwnGrid(null); }
    };
  }, [projectId]);

  // Re-read the inventory every 10 s while something is still on its way: clips being added (no length or file yet),
  // clips Selects is analysing (a later build uses their analysis), no clips at all yet, or a partial read (`incomplete`:
  // the Project was still loading) until the clip sizes are all known. Nothing waits on it: a build uses what is there.
  // The effect re-arms on each new inventory, and stops on unmount, Project switch and while busy. A Project with only
  // photos has nothing to wait for, so it does not poll (each read measures new photos).
  const invFacts = avFootageFacts(inventory, inventory ? inventory.resources.map((r: any) => r.rid) : []);
  const needsPoll = !!inventory && ((!!inventory.incomplete && !incompleteStalled) || invFacts.analysing > 0 || (invFacts.waiting > 0 && !waitingStalled)
    || (inventory.resources.length === 0 && !inventory.photos?.length));
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

  // Fonts for the tiles and the live preview: every preset's fonts (four small files).
  React.useEffect(() => {
    if (!assets || !roots) return;
    const seen = new Set<string>();
    for (const p of assets.presets.presets) for (const f of p.fonts) {
      if (seen.has(f.family)) continue;
      seen.add(f.family);
      // A font that fails to load only makes the preview fall back; the build reads the files again.
      registerFace(roots.plugin, f).then(() => { if (mountedRef.current) setFontsReady((n) => n + 1); }).catch(() => null);
    }
  }, [assets, roots]);

  // ---- Music, length and pace ----
  const musicKind: "cue" | "own" | "none" = cueId === "none" ? "none" : cueId === "own" ? "own" : "cue";
  const cue = musicKind === "cue" ? assets?.manifest.cues.find((c: any) => c.id === cueId) || null : null;
  const ownDuration = ownGrid && ownGrid.durationSeconds > 0 ? ownGrid.durationSeconds : null;
  // The music's grid. bpm is null without a beat (No music, or own music whose beat was not found); usableEnd is null
  // without music (no cap). onsets / onsetThresholds are the music's band onsets in music seconds (manifest or the
  // beat detector); the planner snaps the cuts to them. Own music without a reliable beat keeps its onsets: its cuts
  // snap to bass onsets only. approxBpm: own music whose grid the detector reports as 'approximate' (tight, but too
  // few beats carry an onset): its tempo and first beat time the template (planner avApproxTempo); bpm stays null.
  const ownApprox = musicKind === "own" && ownGrid && !ownGrid.accepted && ownGrid.grid === "approximate" && ownGrid.bpm > 0;
  function musicGridFor(): any {
    if (musicKind === "none") return NO_MUSIC_GRID;
    if (musicKind === "own") {
      const end = ownDuration ? ownDuration - 0.5 : 0;
      return ownGrid && ownGrid.accepted
        ? { bpm: ownGrid.bpm, accepted: true, approxBpm: null, firstBeat: ownGrid.firstBeat, usableEnd: end, beatEnergy: ownGrid.beatEnergy || [], peaks: ownGrid.peaks || [], onsets: ownGrid.onsets || NO_ONSETS, onsetThresholds: ownGrid.onsetThresholds }
        : { bpm: null, accepted: false, approxBpm: ownApprox ? ownGrid.bpm : null, firstBeat: ownApprox ? ownGrid.firstBeat : 0, usableEnd: end, beatEnergy: [], peaks: ownGrid?.peaks || [], onsets: ownGrid?.onsets || NO_ONSETS, onsetThresholds: ownGrid?.onsetThresholds };
    }
    return cue ? cueGrid(cue) : { bpm: null, accepted: false, approxBpm: null, firstBeat: 0, usableEnd: 0, beatEnergy: [], peaks: [], onsets: NO_ONSETS, onsetThresholds: undefined };
  }
  function musicFitFor() { return musicFit(musicGridFor(), length, pace); }
  const grid = musicGridFor();
  const fit = musicFitFor();
  const { gridded, tempo, fitted, videoSeconds, snap } = fit;
  const approxTempo = fit.approxBpm;
  // The section start the build uses; with music, every cut shifts with its frame-snapped start (planner avMusicOffset).
  const start = musicKind === "none" ? 0 : snap(section ?? 0);
  const musicStart = musicKind === "none" ? null : start;
  // Onset snapping for every plan; without a reliable beat only bass onsets count, in a wider window.
  const snapCuts = { onsets: grid.onsets, onsetThresholds: grid.onsetThresholds, lowConfidence: !gridded };
  const planSeconds = (p: any) => fit.seconds(p.shots);

  // A new track (or its grid) starts on its default section: a bundled cue's soft intro, else the most energetic
  // window that fits. `assets` is a dependency so the default also applies once the manifest has loaded.
  React.useEffect(() => {
    if (musicKind === "none") return;
    sectionTouchedRef.current = false;
    setSection(fit.defaultSection());
  }, [assets, cueId, ownMusic?.path, ownGrid]);
  // A new length or pace moves an untouched section to the default for the new length, and only re-clamps one the
  // user chose.
  React.useEffect(() => {
    if (musicKind === "none") return;
    if (!sectionTouchedRef.current) setSection(fit.defaultSection());
    else setSection((s) => snap(s ?? 0));
  }, [length, pace]);
  const moveSection = (v: number | null) => { sectionTouchedRef.current = true; setSection(v); };
  // A new track, section, length or pace makes a running preview stale, so it stops.
  React.useEffect(() => { stopPreview(); }, [cueId, ownMusic?.path, section, length, pace]);

  // ---- Style: preset, title fields, credit ----
  const presetList: any[] = assets?.presets.presets || [];
  const chosen = presetList.find((x) => x.id === preset) || null;
  // A field's text: the user's edit, else the preset's initial text.
  const fieldText = (fl: any) => fieldEdits[fl.key] ?? fl.initial ?? "";
  const setField = (fl: any, value: string) => {
    const v = fieldClip(String(value), fl.max);
    setFieldEdits((all) => ({ ...all, [fl.key]: v }));
  };
  // A new preset: typed text stays; a field still showing the old preset's text takes the new preset's. The same for
  // the credit prefix and name.
  const choosePreset = (id: string) => {
    if (busyRef.current || id === preset) return;
    const old = chosen, next = presetList.find((x) => x.id === id);
    if (old && next) {
      setFieldEdits((all) => {
        const out: Record<string, string> = {};
        for (const fl of next.fields) {
          const v = all[fl.key], was = old.fields.find((o: any) => o.key === fl.key);
          if (v != null && v !== (was?.initial ?? "")) out[fl.key] = fieldClip(v, fl.max);
        }
        return out;
      });
      setCreditPrefix((v) => (v != null && v !== (old.credit?.prefix || "") ? v : null));
      setCreditName((v) => (v != null && v !== (old.credit?.name || "") ? v : null));
    }
    setPreset(id);
  };
  const titleFields: Record<string, string> = chosen ? Object.fromEntries(chosen.fields.map((fl: any) => [fl.key, fieldText(fl)])) : {};
  const titleText = String(titleFields.title || "").trim();
  const samplePrefix = chosen?.credit?.prefix || "", sampleName = chosen?.credit?.name || "";
  const prefixText = creditPrefix ?? samplePrefix;
  const nameText = creditName ?? sampleName;
  // The credit is built when Credit shot is on and the name is not empty.
  const creditUsed = creditOn && !!nameText.trim();
  const presetStrength = avLookStrength(chosen);
  const strength = lookStrength ?? presetStrength;
  // The preview's opening timing: the 6-beat opening at the current tempo (the Draft's comes from its real frames).
  const openingSeconds = 6 * (60 / tempo);
  // The lockup and credit data as the Draft gets them (fonts by family with their metrics; no font data needed here).
  const previewData = React.useMemo(() => {
    if (!chosen || !assets) return null;
    const base: any = { preset: chosen.id, ...titleFields, titleColor: chosen.colors.title, textColor: chosen.colors.text, taglineTracking: chosen.taglineTracking,
      size: TITLE_LOOK.size, speed: TITLE_LOOK.speed, font: TITLE_LOOK.font, scrim: TITLE_LOOK.scrim, timing: avOpeningTiming(openingSeconds),
      fonts: avPresetFonts(assets.presets, chosen, null) };
    // Wide glyphs (Hangul) are measured in the system Korean face once the fonts are in; the same data feeds the
    // layout and the decode state.
    let ko: any = null;
    try { ko = AV_TITLE.avKoMeasure(base); } catch { ko = null; }
    return ko ? Object.assign({}, base, ko) : base;
  }, [chosen, assets, JSON.stringify(titleFields), openingSeconds, fontsReady]);
  // The lockup at canvas size, or null when the layout throws (the box then says the preview is unavailable).
  const previewLayout: any = React.useMemo(() => {
    if (!previewData) return null;
    try { return AV_TITLE.avTitleLayout(previewData, AV_W, AV_H); } catch { return null; }
  }, [previewData]);
  const previewState: any = React.useMemo(() => {
    if (!previewLayout || !previewData) return null;
    try { return AV_TITLE.avDecodeFrame(previewLayout, previewData, replayFrame == null ? 1e9 : replayFrame, 30); } catch { return null; }
  }, [previewLayout, previewData, replayFrame]);
  // The title backdrop at the same frame (decode-title avScrim), drawn under the preview lockup.
  const previewScrim: any = React.useMemo(() => {
    if (!previewLayout || !previewData) return null;
    try { return AV_TITLE.avScrim(previewLayout, previewData, replayFrame == null ? 1e9 : replayFrame, 30, AV_H); } catch { return null; }
  }, [previewLayout, previewData, replayFrame]);
  // How the decode fits the opening shot at the current tempo (decode-title avTiming): anything but 'none' means a
  // long title decodes faster (or starts earlier) so it still holds, readable, before the cut.
  const previewFit: string = React.useMemo(() => {
    if (!previewLayout || !previewData) return "none";
    try { return AV_TITLE.avTiming(previewData, previewLayout.steps || 0, 30).fit || "none"; } catch { return "none"; }
  }, [previewLayout, previewData]);
  const creditLayout: any = React.useMemo(() => {
    if (!chosen || !assets || !creditUsed) return null;
    const base: any = { prefix: prefixText, name: nameText, color: chosen.colors.text, size: CREDIT_LOOK.size,
      fonts: avPresetFonts(assets.presets, chosen, null).filter((x: any) => x.family === CREDIT_FAMILY) };
    try {
      const ko = AV_CREDIT.avcKoMeasure(base);
      return AV_CREDIT.avCreditLayout(ko ? Object.assign({}, base, ko) : base, AV_W, AV_H);
    } catch { return null; }
  }, [chosen, assets, creditUsed, prefixText, nameText, fontsReady]);
  // Replays the decode from just before the kicker appears, at 30 fps, then shows the finished lockup again.
  function replayTitle() {
    if (!previewLayout || !previewData) return;
    const token = ++replayRef.current, fps = 30;
    const tm = AV_TITLE.avTiming(previewData, previewLayout.steps || 0, fps);
    const from = Math.max(0, Math.round(tm.textIn * fps) - 6);
    const end = Math.round(tm.decodeStart * fps) + Math.ceil((previewLayout.steps || 0) * tm.letterSeconds * fps) + 2;
    const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
    const tick = () => {
      if (replayRef.current !== token || !mountedRef.current) return;
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      const frame = from + Math.floor(((now - t0) / 1000) * fps);
      if (frame > end) { setReplayFrame(null); return; }
      setReplayFrame(frame);
      requestAnimationFrame(tick);
    };
    tick();
  }
  // A new preset or title text shows the finished lockup (any replay stops).
  React.useEffect(() => { replayRef.current++; setReplayFrame(null); }, [preset, JSON.stringify(titleFields)]);
  // The credit field limits (fieldLen units).
  const prefixMax = CREDIT_NAME_MAX, nameMax = CREDIT_NAME_MAX;

  // Stops a running own-music analysis; true when one was running.
  function cancelOwnMusic() {
    const job = ownJobRef.current, running = !!job.abort;
    job.id++;
    if (job.abort) { job.abort.abort(); job.abort = null; }
    if (mountedRef.current) setListening(false);
    return running;
  }
  async function detectOwnMusic(file: { path: string; name: string }) {
    if (busyRef.current || !roots || !assets) return;
    cancelOwnMusic();
    const job = ownJobRef.current, id = job.id, pid = projectRef.current, abort = new AbortController();
    job.abort = abort;
    const live = () => mountedRef.current && ownJobRef.current.id === id && projectRef.current === pid;
    stopPreview();
    setOwnMusic(file); setOwnGrid(null); setListening(true); setStatus(null);
    let samples: Float32Array | null = null;
    try {
      samples = await decodeOwnMusic(file.path, roots.data, abort.signal);
      if (!live()) return;
      const g = await analyseBeat(assets.beatWorker, samples, abort.signal);
      if (!live()) return;
      if (!g || typeof g !== "object") throw uiError((l) => t(l, "beatFailed"));
      setOwnGrid(g);
    } catch (e: any) {
      if (!live()) return;
      // Any failure falls back to fixed timing (no grid); the track's real length still bounds the section.
      let duration: number | null = samples && samples.length ? Math.round((samples.length / OWN_RATE) * 1000) / 1000 : null;
      if (!duration) { const v = await hostProbeSeconds(file.path); if (v) duration = Math.min(v, OWN_MAX_SECONDS); }
      if (!live()) return;
      setOwnGrid({ accepted: false, grid: "none", failed: true, durationSeconds: duration, peaks: [] });
      setStatus(duration
        ? { tone: "info", say: errorSay(e, (l, detail) => t(l, "musicApprox", { detail })) }
        : { tone: "error", say: errorSay(e, (l, detail) => t(l, "musicUnreadable", { detail })) });
    } finally {
      // The decoded samples (up to about 21 MB) are dropped with this call.
      samples = null;
      if (ownJobRef.current.id === id) { ownJobRef.current.abort = null; if (mountedRef.current) setListening(false); }
    }
  }

  // Section preview: "idle" -> "loading" (reading the file) -> "playing". The whole track plays from a blob: URL of its
  // bytes, seeked to the section start; it fades out over the section's last PREVIEW_FADE seconds and stops at its end.
  // Every start or stop bumps the token, so a late result from a cancelled preparation is dropped.
  function stopPreview() {
    previewTokenRef.current++;
    if (previewTimerRef.current) { clearInterval(previewTimerRef.current); previewTimerRef.current = null; }
    const a = audioRef.current;
    audioRef.current = null;
    if (a) { a.onended = null; a.pause(); }
    if (previewUrlRef.current) { try { URL.revokeObjectURL(previewUrlRef.current); } catch { /* gone */ } previewUrlRef.current = null; }
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
      const file = musicKind === "own" ? ownMusic!.path : pjoin(roots.plugin, "assets", "cues", cue.file);
      const bytes = await readBytes(file);
      if (!live()) return;
      if (!bytes.byteLength) throw uiError((l) => t(l, "noAudio"));
      const url = URL.createObjectURL(new Blob([bytes as any], { type: audioType(file) }));
      previewUrlRef.current = url;
      const audio = new Audio(url);
      audio.preload = "auto";
      audioRef.current = audio;
      // Seek once the length is known, then play.
      await new Promise<void>((ok, fail) => {
        audio.onloadedmetadata = () => ok();
        audio.onerror = () => fail(uiError((l) => t(l, "noAudio")));
      });
      if (!live() || audioRef.current !== audio) return;
      const from = start, end = start + videoSeconds;
      audio.currentTime = from;
      audio.volume = 1;
      audio.onended = () => { if (audioRef.current === audio) stopPreview(); };
      await audio.play();
      if (!live() || audioRef.current !== audio) { audio.pause(); return; }
      // The fade and the stop at the section's end.
      previewTimerRef.current = setInterval(() => {
        if (audioRef.current !== audio) return;
        const at = audio.currentTime;
        if (at >= end) { stopPreview(); return; }
        audio.volume = Math.max(0, Math.min(1, (end - at) / PREVIEW_FADE));
      }, 40);
      setPlayState("playing"); setPlayingAudio(audio);
    } catch (e: any) {
      if (!live()) return;
      stopPreview();
      setStatus({ tone: "error", say: errorSay(e, (l, detail) => t(l, "previewFailed", { detail })) });
    }
  }

  // Scene search over the analysed videos. `onDone(n)` reports how many of them were searched so far.
  async function findCandidates(rids: string[], pid: string, check: () => void, onDone: (done: number) => void) {
    const list: any[] = []; const failed: string[] = [];
    // SEARCH_BATCH clips per call keeps each scene search under runScript's fixed 30 s deadline.
    // pageSize stays 4: hits are scene-level, so 8 adds almost no new times; the planner fills gaps with filler candidates.
    for (let i = 0; i < rids.length; i += SEARCH_BATCH) {
      onDone(i);
      const r = await run("Search shots", fill(assets.scripts.searchJs, { projectId: pid, rids: rids.slice(i, i + SEARCH_BATCH), queries: AV_QUERIES, pageSize: 4, analysedOnly: true }), false, { wanted: () => projectRef.current === pid });
      check();
      list.push(...r.candidates); failed.push(...r.failed);
    }
    onDone(rids.length);
    return { list, failed };
  }

  // The quick local check of the videos Selects has not analysed (quick-score block): the host's ffmpeg decodes a small
  // grey preview of each and scores its windows, AV_LOCAL_CONCURRENCY at a time within AV_LOCAL_BUDGET_MS, cached in the
  // data folder per clip and file time. Without ffmpeg or a data folder (an older Selects) every clip gets evenly spaced
  // windows from 0.5 s on, and the build still runs. A newer build, a Project switch or closing the panel cancels it.
  async function scoreLocal(res: any[], onDone: (done: number) => void) {
    if (!res.length) return [];
    localAbortRef.current?.abort();
    const ac = new AbortController();
    localAbortRef.current = ac;
    try {
      const scores = await quickScoreAll(res.map((r: any) => ({ rid: r.rid, path: r.path, durationSeconds: r.duration })),
        { dataDir: roots?.data || null, concurrency: AV_LOCAL_CONCURRENCY, budgetMs: AV_LOCAL_BUDGET_MS, signal: ac.signal, onProgress: (p: any) => onDone(p.done) });
      return res.map((r: any) => scores.get(r.rid)).filter(Boolean);
    } finally { if (localAbortRef.current === ac) localAbortRef.current = null; }
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
    const pid = projectId, epoch = ++runEpochRef.current;
    const check = () => { if (!runLive(pid, epoch)) throw STALE; };
    // Every input as it is at Build. The build and a later "Finish title and look" read only this; the Inspector labels
    // are written in the UI language of this moment and do not follow a later switch.
    const frozen = Object.freeze({
      pid, seed: nextSeed, preset, fields: { kicker: titleFields.kicker || "", title: titleFields.title || "", tagline: titleFields.tagline || "" },
      credit: { on: creditUsed, prefix: prefixText.trim(), name: nameText.trim() }, clipSound, look: { on: look, strength }, usePhotos, only, onlyPhotos,
      music: musicKind, cueId, musicPath: musicKind === "own" ? ownMusic!.path : musicKind === "cue" ? pjoin(roots.plugin, "assets", "cues", cue.file) : null,
      // A bundled cue's length (manifest): ensure-audio.js takes a same-named Project file for the cue only at this length.
      musicDuration: musicKind === "cue" && typeof cue?.duration === "number" ? cue.duration : null,
      sectionStart: musicStart, pace, length, requested: fit.requested,
      labels: adjustLabelsFor(L), motionOptions: motionOptionsFor(L),
      draftName: draftNameOf(titleFields.title, chosen.label, new Date()),
    });
    busyRef.current = true;
    stopPreview();
    setBusy(true); setStatus(null); setResult(null);
    advance("shots", 0);
    try {
      // The shot candidates are cached per Project and clip selection: the scene search of the analysed videos and the
      // quick local check of the others (`local`, their quickScore results), run side by side.
      const key = pid + "|" + JSON.stringify(only);
      const chosenRes: any[] = inventory.resources.filter((r: any) => !only || only.includes(r.rid));
      const rids: string[] = chosenRes.filter((r: any) => r.analysed !== false).map((r: any) => r.rid);
      const localRes: any[] = chosenRes.filter((r: any) => r.analysed === false);
      const dur: Record<string, number> = Object.fromEntries(inventory.resources.map((r: any) => [r.rid, r.duration]));
      const cached = candidates && candidates.key === key ? candidates : null;
      let found = cached;
      if (!cached || cached.failed.length) {
        // Search everything the first time; afterwards retry only the clips whose search failed. The local check runs
        // once per selection (its results never fail: a clip it cannot decode gets evenly spaced windows).
        const todo: string[] = cached ? cached.failed : rids;
        const toScore = cached ? [] : localRes;
        // Progress counts what each part counts: analysed videos searched, unanalysed videos checked.
        const counts = { searched: 0, scored: 0 };
        const tick = () => {
          const { searched, scored } = counts, all = todo.length + toScore.length;
          advance("shots", all ? (searched + scored) / all : 0, (l) => [todo.length ? t(l, "videosChecked", { done: searched, count: todo.length }) : "",
            toScore.length ? t(l, "localChecked", { done: scored, count: toScore.length }) : ""].filter(Boolean).join(" · "));
        };
        tick();
        const [fresh, local] = await Promise.all([
          findCandidates(todo, pid, check, (n) => { counts.searched = n; tick(); }),
          scoreLocal(toScore, (n) => { counts.scored = n; tick(); }),
        ]).catch((e) => { localAbortRef.current?.abort(); throw e; });
        check();
        const retried = new Set(todo);
        found = { key, failed: fresh.failed, local: cached ? cached.local : local,
          list: [...(cached ? cached.list.filter((c: any) => !retried.has(c.rid)) : []), ...fresh.list.map((c: any) => ({ ...c, sourceDuration: dur[c.rid] || 0 }))] };
        setCandidates(found);
      }
      advance("shots", 1);
      // Photos join as candidates without a search; with Use photos off there are none.
      const photoCands = photoCandsOf(inventory, onlyPhotos, usePhotos);
      // Plan at 30 fps for allocation; assembly places the same cut seconds at the Draft's real rate. Motion hits
      // become a tie-break bonus on the role candidates, and local windows join on the hits' scale (avShotCandidates).
      const sizes = avSizesOf(inventory);
      const shots = avShotCandidates(found.list, found.local, { bpm: tempo, pace, durations: dur });
      const plan: any = avPlanBuild({ candidates: shots.concat(photoCands), bpm: grid.bpm, accepted: grid.accepted, approxBpm: grid.approxBpm, fps: 30,
        pace, requested: fit.requested, sectionStart: musicStart, usableEnd: grid.usableEnd, ...snapCuts, seed: String(nextSeed), sizes });
      if (!plan.ok) {
        const failed = found.failed.length;
        // Whole sentences joined with `gap` (no space after a full stop in ja and zh).
        throw uiError((l) => [failText(l, plan.reason, plan),
          plan.reason === "too-few" ? (usePhotos ? t(l, "addFootagePhotos") : t(l, "addFootage")) : "",
          failed ? t(l, "retryUnchecked", { count: failed }) : ""].filter(Boolean).join(t(l, "gap")));
      }
      advance("music", 0);
      const music = frozen.musicPath == null ? null
        : await run("Add music to the project", fill(assets.scripts.ensureJs, { projectId: pid, path: frozen.musicPath, duration: frozen.musicDuration }), true);
      check();
      advance("music", 1);
      advance("draft", 0);
      let a: any = null, lost: any = null;
      try {
        a = await run("Assemble Archive Vlog", fill(assets.scripts.assembleJs, avAssembleConfig({ projectId: pid, draftName: frozen.draftName, plan, inventory,
          music, sectionStart: frozen.sectionStart, clipSound: frozen.clipSound })), true);
      } catch (e) { lost = e; }
      check();
      if (!a || !a.sequenceId) {
        // Never resend the commit: the reply may have been lost after the Draft was saved. Look for it by its name.
        let saved: any = null;
        try { saved = await findDraftByName(pid, frozen.draftName); } catch { saved = null; }
        check();
        if (!saved) throw lost || uiError((l) => t(l, "draftNoId", { name: frozen.draftName }));
        a = { ...saved, notes: a?.notes || [], recovered: true };
      }
      if (!(a.totalFrames > 0)) throw uiError((l) => t(l, "draftEmpty", { name: frozen.draftName }));
      // The planner drops montage shots when the footage cannot fill all the music fits (plan.musicShots); tell the user
      // the real length at the Draft fps.
      const shortened = plan.shots < plan.musicShots ? { shots: plan.shots, of: plan.musicShots, seconds: a.totalFrames / a.fps } : null;
      advance("draft", 1);
      // The opening's frame size, as it was at Build (a later "Finish title and look" may meet another inventory).
      const res = { sequenceId: a.sequenceId, videoEnd: a.totalFrames, fps: a.fps, decorated: false, frozen, plan, notes: a.notes || [], link: null, shortened,
        unchecked: found.failed.length, openingSize: sizes[plan.picks[0]?.rid] || null, recovered: !!a.recovered };
      setResult(res);
      await decorate(res, check);
    } catch (e: any) {
      if (e !== STALE && runLive(pid, epoch)) setStatus({ tone: "error", say: stopAt(e) });
    } finally { endRun(pid, epoch); }
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
    const epoch = ++runEpochRef.current;
    const check = () => { if (!runLive(pid, epoch)) throw STALE; };
    busyRef.current = true; stopPreview(); setBusy(true); setStatus(null);
    try { await decorate(result, check); }
    catch (e: any) { if (e !== STALE && runLive(pid, epoch)) setStatus({ tone: "error", say: stopAt(e) }); }
    finally { endRun(pid, epoch); }
  }

  // Commit 2 (mute when Clip sound is Off, the decode title, the credit, the letterbox reveal, photo and shot motion,
  // the fade out and the Cinematic look), then open the Draft. decorate.js skips what an earlier attempt already
  // added, so a retry is safe.
  async function decorate(res: any, check: () => void) {
    advance("look", 0);
    const f = res.frozen;
    try {
      const fonts = await allFonts(roots!.plugin, assets.presets);
      check();
      const cfg = avDecorateConfig({ sequenceId: res.sequenceId, videoEnd: res.videoEnd, fps: res.fps, plan: res.plan, presets: assets.presets, tsx: assets.tsx, fonts,
        sizes: { ...photoSizesRef.current }, openingSize: res.openingSize || null, frozen: f,
        provenance: { plugin: PLUGIN_ID, version: PLUGIN_VERSION, preset: f.preset, cue: f.music === "cue" ? f.cueId : f.music, sectionStart: f.sectionStart,
          pace: f.pace, length: f.length, seed: f.seed, clipSound: f.clipSound, look: f.look.on, credit: f.credit.on } });
      await run("Add title and look", fill(assets.scripts.decorateJs, cfg), true);
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
  const candKey = projectId + "|" + JSON.stringify(only);
  const readyPlans: any = React.useMemo(() => {
    if (!inventory || !fitted) return { build: null, another: null };
    const searched = candidates && candidates.key === candKey ? candidates : null;
    if (!searched && selectedRids.length) return { build: null, another: null };
    const dur: Record<string, number> = Object.fromEntries(inventory.resources.map((r: any) => [r.rid, r.duration]));
    const scored = avShotCandidates(searched ? searched.list : [], searched ? searched.local : null, { bpm: tempo, pace, durations: dur });
    const planAt = (s: number) => {
      const p: any = avPlanBuild({ candidates: scored.concat(photoCandsOf(inventory, onlyPhotos, usePhotos)), bpm: grid.bpm, accepted: grid.accepted, approxBpm: grid.approxBpm, fps: 30,
        pace, requested: fit.requested, sectionStart: musicStart, usableEnd: grid.usableEnd, ...snapCuts, seed: String(s), sizes: avSizesOf(inventory) });
      // A search with failed clips is retried by Build, so its shortfall does not block Build yet.
      return { ...p, retryable: !!(searched && searched.failed.length) };
    };
    return { build: planAt(seed), another: planAt(seed + 1) };
  }, [candidates, candKey, inventory, onlyPhotos, usePhotos, grid.bpm, grid.accepted, grid.approxBpm, grid.usableEnd, grid.onsets, pace, tempo, fit.requested, musicStart, seed, fitted, selectedRids.length]);
  const readyPlan: any = readyPlans.build;
  // Why a build with this readiness plan cannot run (null when it can), as a message in the UI language.
  const baseBlock: Say | null = !inventory || !assets ? null
    : inventory.incomplete ? (l) => t(l, "sizesLoading")
    : !titleText ? (l) => t(l, "typeTitle")
    : listening ? (l) => t(l, "listening")
    : musicKind === "own" && !ownMusic ? (l) => t(l, "dropMusic")
    : musicKind === "own" && !ownDuration ? (l) => t(l, "musicLengthUnread")
    : musicKind !== "none" && (!fitted || start == null) ? (l) => t(l, "fail.music-too-short")
    // The opening, credit and final shots are video only (planner preflight), so photos never make up for a video.
    : selectedRids.length === 0 ? (l) => t(l, "fail.no-video")
    : selectedRids.length === 1 ? (l) => t(l, "fail.one-video")
    : null;
  const blockFor = (plan: any): Say | null => baseBlock || (plan && !plan.ok && !plan.retryable ? (l) => failText(l, plan.reason, plan) : null);
  const blockReason = blockFor(readyPlan);
  const anotherBlock = blockFor(readyPlans.another);
  const ready = !!inventory && !!assets && !!roots;
  const canBuild = ready && !blockReason;
  const canBuildAnother = ready && !anotherBlock;

  const facts = avFootageFacts(inventory, selectedRids);
  const clipCount = [
    allRids.length ? (only ? t(L, "clipsSelected", { selected: selectedRids.length, count: allRids.length }) : t(L, "clips", { count: allRids.length })) : "",
    usePhotos && allPhotoRids.length ? (onlyPhotos ? t(L, "photosSelected", { selected: selectedPhotoRids.length, count: allPhotoRids.length }) : t(L, "photos", { count: allPhotoRids.length })) : "",
  ].filter(Boolean).join(" · ");
  const readiness = !inventory ? (invError ? (invError.busy ? invError.say(L) : t(L, "invFailed")) : t(L, "checkingClipsNow"))
    : inventory.incomplete && incompleteStalled ? t(L, "invPartial")
    : inventory.resources.length === 0 && !allPhotoRids.length && inventory.incomplete ? t(L, "stillReading")
    : inventory.resources.length === 0 ? (facts.waiting ? t(L, "stillAdding", { count: facts.waiting }) : t(L, "noFootage"))
    : selectedRids.length === 0 && usedPhotoCount === 0 ? t(L, "noClipsSelected")
    : t(L, "ready", { summary: clipCount });
  // A small note, never a gate: clips without analysis get their shots from the quick local check.
  const localNote = facts.local > 0 ? t(L, "localNote", { count: facts.local }) : null;
  // Requested vs fitted montage shots, then the footage's own fit once it is known. Seconds with one decimal.
  const tenths = (s: number) => Math.round(s * 10) / 10;
  const lengthName = length === "short" ? t(L, "length.short") : length === "long" ? t(L, "length.long") : t(L, "length.standard");
  // Your own music before a file is chosen and analysed has no length yet: no fit line (and no failure text).
  const fitLine = !assets || (musicKind === "own" && (!ownMusic || !ownGrid)) ? null
    : musicKind !== "none" && !fitted ? t(L, "fail.music-too-short")
    : fitted < fit.top ? t(L, "fitPartial", { length: lengthName, fitted, count: fit.top, seconds: tenths(videoSeconds) })
    : t(L, "fitFull", { length: lengthName, count: fit.top, seconds: tenths(videoSeconds) });
  const footageLine = readyPlan && readyPlan.ok && readyPlan.shots < readyPlan.musicShots
    ? t(L, "footageFits", { fitted: readyPlan.shots, count: readyPlan.musicShots, seconds: tenths(planSeconds(readyPlan)) }) : null;
  // How long a montage shot lasts, and the fixed beat without a grid.
  const montageBeats = avMontageBeats(pace, tempo);
  const hundredths = (s: number) => Math.round(s * 100) / 100;
  const shotNote = t(L, "montageBeats", { count: montageBeats, seconds: hundredths(montageBeats * 60 / tempo) });
  // A tempo that was found (an accepted grid, or own music's approximate one) but is outside 70-160 bpm, else null. Used
  // only where no grid or approximate tempo applies, so it is always out of range there.
  const outsideBpm: number | null = grid.accepted ? grid.bpm : ownApprox ? ownGrid.bpm : null;
  // Above 110 bpm the template doubles its beats per shot (planner avMontageBeats), so shots keep their length.
  const fastNote = tempo > 110 ? t(L, "fastTempo") : "";
  const paceNote = !assets ? null
    : gridded ? [shotNote, fastNote].filter(Boolean).join(t(L, "gap"))
    : musicKind === "none" ? [t(L, "noMusicTiming", { bpm: Math.round(tempo) }), shotNote].join(t(L, "gap"))
    : musicKind === "own" && !ownGrid ? null
    : approxTempo ? [t(L, "faintTempoTiming", { bpm: Math.round(approxTempo) }), shotNote, fastNote].filter(Boolean).join(t(L, "gap"))
    : outsideBpm ? [t(L, "outsideTempoTiming", { bpm: Math.round(outsideBpm), fixed: Math.round(tempo) }), shotNote].join(t(L, "gap"))
    : [t(L, "noBeatTiming", { bpm: Math.round(tempo) }), shotNote].join(t(L, "gap"));
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
  // Your own music needs the panel to read files (FileSystem.readFile); every host this app supports has it.
  const canOwnMusic = !!hostApi("FileSystem", "readFile");
  const cues: any[] = assets?.manifest.cues || [];
  const chooseTrack = (v: string) => {
    if (busyRef.current) return;
    setCueId(v);
    if (v !== "own") { cancelOwnMusic(); setOwnMusic(null); setOwnGrid(null); }
  };
  // One row of the track list: a radio-style button that truncates its name and keeps the tempo visible.
  const trackRow = (value: string, label: string, meta: string) => {
    const on = cueId === value;
    return (
      <button key={value} type="button" role="radio" aria-checked={on} disabled={busy} onClick={() => chooseTrack(value)}
        style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", maxWidth: "none", minWidth: 0, height: "auto", padding: "5px 8px", border: "none",
          borderRadius: "var(--panel-radius, 6px)", cursor: busy ? "default" : "pointer", color: "inherit", font: "inherit", fontWeight: on ? 600 : 400, textAlign: "left",
          background: on ? "color-mix(in srgb, var(--panel-fg, #ffffff) 10%, transparent)" : "transparent",
          boxShadow: on ? "inset 0 0 0 1px var(--panel-fg, #ffffff)" : "none", opacity: busy ? 0.6 : 1 }}>
        <span style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        {meta ? <span style={{ flexShrink: 0, fontSize: 11, color: "var(--panel-muted-fg)", fontVariantNumeric: "tabular-nums" }}>{meta}</span> : null}
      </button>
    );
  };
  const bpmOf = (c: any) => t(L, "bpm", { bpm: Math.round(c.referenceBpm || c.bpm) });
  const progressLabel = progress ? (progress.detail
    ? t(L, "progressDetail", { step: progress.current + 1, total: AV_BUILD_STEPS.length, name: t(L, "step." + progress.id), detail: progress.detail(L), percent: progress.percent })
    : t(L, "progress", { step: progress.current + 1, total: AV_BUILD_STEPS.length, name: t(L, "step." + progress.id), percent: progress.percent })) : "";
  const stepText = step === "checkingClips" ? t(L, "checkingClips") : "";
  const displayFace = (p: any) => (p.fonts.find((x: any) => x.role === "display") || p.fonts[0]) as any;

  if (!projectId) return <ui.Message tone="error">{t(L, "openProject")}</ui.Message>;

  return (
    // Korean wraps between words (keep-all); other languages keep their own line breaking.
    <div style={{ wordBreak: L === "ko" ? "keep-all" : undefined }}>
    <ui.Stack gap={16}>
      {inventory && invError ? <ui.Message tone="error">{invError.busy ? invError.say(L) : t(L, "refreshFailed", { detail: invError.say(L) })}</ui.Message> : null}
      <ui.Section title={t(L, "style")}>
        {/* Style tiles: a sample of the preset's title (its face and colour) and the name, both inside one bordered box. */}
        <div role="group" aria-label={t(L, "style")} style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
          {presetList.map((p) => {
            const on = p.id === preset, face = displayFace(p);
            return (
              <button key={p.id} type="button" aria-pressed={on} disabled={busy} onClick={() => choosePreset(p.id)}
                style={{ flex: "1 1 0", minWidth: 0, width: "auto", maxWidth: "none", height: "auto", maxHeight: "none", boxSizing: "border-box", padding: "8px 6px",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6, borderRadius: 8, cursor: busy ? "default" : "pointer", color: "inherit",
                  font: "inherit", fontWeight: 400, background: on ? "color-mix(in srgb, var(--panel-fg, #ffffff) 8%, transparent)" : "transparent",
                  border: on ? "2px solid var(--panel-fg, #ffffff)" : "1px solid var(--panel-border, rgba(128, 128, 128, 0.45))", opacity: busy ? 0.6 : 1 }}>
                <span aria-hidden="true" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", maxWidth: 72, height: 26, borderRadius: 4,
                  background: PREVIEW_BG, color: p.colors.title, fontFamily: AV_TITLE.avFontStack(face.family), fontWeight: face.weight, fontSize: 16, letterSpacing: 0.5,
                  lineHeight: 1 }}>{TILE_SAMPLE}</span>
                {/* The preset names are English in every language (lang="en"): at the docked width (~180 px, three tiles) a
                    long one ("Cinematic") breaks with a hyphen over at most 2 lines inside the box. */}
                <span lang="en" style={{ fontSize: 12, lineHeight: 1.2, textAlign: "center", overflowWrap: "anywhere", hyphens: "auto", display: "-webkit-box",
                  WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", maxWidth: "100%" } as any}>{tOr(L, "preset." + p.id, p.label)}</span>
              </button>
            );
          })}
        </div>
        {/* i18n-used: preset.* */}
        {/* Live preview: the Draft's own layout and decode code, fully decoded, over the middle of a 16:9 frame, in a box of fixed height. */}
        <div style={{ position: "relative" }}>
          <div role="img" aria-label={t(L, "titlePreview")} style={{ height: PREVIEW_HEIGHT, borderRadius: 8, overflow: "hidden", background: PREVIEW_BG,
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            {assets && previewLayout && previewState ? <LockupSvg layout={previewLayout} state={previewState} shadow={TITLE_LOOK.shadow} scrim={previewScrim} />
              : <small style={{ color: "#d8d2cc" }}>{assets ? t(L, "previewUnavailable") : t(L, "loading")}</small>}
          </div>
          {assets && previewLayout?.title ? (
            <div style={{ position: "absolute", right: 4, bottom: 4 }}>
              <ui.IconButton icon="play" label={t(L, "replayDecode")} onClick={replayTitle} disabled={busy} />
            </div>
          ) : null}
        </div>
        {assets && previewFit !== "none" ? <ui.Message tone="muted">{t(L, "decodeFitted")}</ui.Message> : null}
        {chosen ? chosen.fields.map((fl: any) => (
          <ui.TextField key={preset + ":" + fl.key} label={t(L, "fieldCount", { label: fieldLabel(L, fl.key), used: fieldLen(fieldText(fl)), max: fl.max })}
            value={fieldText(fl)} placeholder={fl.initial || undefined} disabled={busy} onChange={(v: string) => setField(fl, v)} />
        )) : null}
        <ui.Toggle label={t(L, "creditShot")} value={creditOn} onChange={setCreditOn} disabled={busy} />
        {creditOn ? (
          <>
            <ui.TextField label={t(L, "fieldCount", { label: t(L, "param.prefix"), used: fieldLen(prefixText), max: prefixMax })} value={prefixText} placeholder={samplePrefix || undefined}
              disabled={busy} onChange={(v: string) => setCreditPrefix(fieldClip(String(v), prefixMax))} />
            <ui.TextField label={t(L, "fieldCount", { label: t(L, "creditName"), used: fieldLen(nameText), max: nameMax })} value={nameText} placeholder={sampleName || undefined}
              disabled={busy} onChange={(v: string) => setCreditName(fieldClip(String(v), nameMax))} />
            {creditName == null && sampleName ? <ui.Message tone="muted">{t(L, "creditSample", { name: sampleName })}</ui.Message> : null}
            {!creditUsed ? <ui.Message tone="muted">{t(L, "creditCleared")}</ui.Message> : null}
            <div role="img" aria-label={t(L, "creditPreview")} style={{ height: CREDIT_HEIGHT, borderRadius: 6, overflow: "hidden", background: PREVIEW_BG }}>
              {creditLayout ? (
                <svg width="100%" height={CREDIT_HEIGHT} viewBox={CREDIT_VIEW} preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
                  <text x={creditLayout.x} y={creditLayout.y} fill={creditLayout.color} fontSize={creditLayout.size} fontFamily={creditLayout.stack} fontWeight={creditLayout.weight}
                    style={{ whiteSpace: "pre", fontKerning: "none", fontVariantLigatures: "none" } as any}>{creditLayout.text}</text>
                </svg>
              ) : null}
            </div>
          </>
        ) : null}
      </ui.Section>
      <ui.Section title={t(L, "music")}>
        <div role="radiogroup" aria-label={t(L, "track")} style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          {cues.map((c) => trackRow(c.id, c.label, bpmOf(c)))}
          {canOwnMusic ? trackRow("own", t(L, "ownMusic"), "") : null}
          {trackRow("none", t(L, "noMusic"), "")}
        </div>
        {musicKind === "own" && canOwnMusic ? <ui.FileDrop accept={["audio"]} value={ownMusic} disabled={busy}
          onChange={(f: any) => { if (f) detectOwnMusic(f); else { cancelOwnMusic(); setOwnMusic(null); setOwnGrid(null); } }} /> : null}
        {musicKind === "own" && canOwnMusic ? <ui.Message tone="muted">{t(L, "ownMusicHint", { count: OWN_MAX_SECONDS / 60 })}</ui.Message> : null}
        {listening ? <ui.Progress label={t(L, "listening")} /> : null}
        {ownBeatLine ? <ui.Message tone="muted">{ownBeatLine}</ui.Message> : null}
        {musicKind !== "none" ? (ownMusic || cue ? (
          // Esc on the slider or the preview button (the key bubbles up here) stops the preview.
          <div onKeyDown={(e) => { if (e.key === "Escape" && playState !== "idle") { e.preventDefault(); stopPreview(); } }}>
            <SectionSlider lang={L} peaks={peaks} total={total} section={start} videoSeconds={videoSeconds} barSeconds={fit.timed ? (4 * 60) / tempo : 1}
              snap={snap} onChange={moveSection} disabled={busy} audio={playingAudio} />
            <ui.Row gap={8} align="center">
              {/* The kit has no stop icon; "pause" marks stop, and the label says what it does. */}
              <ui.IconButton icon={playState === "playing" ? "pause" : playState === "loading" ? "loading" : "play"}
                label={playState === "playing" ? t(L, "stopPreview") : playState === "loading" ? t(L, "cancelPreview") : t(L, "previewSection")}
                onClick={preview} disabled={busy || (playState === "idle" && start == null)} />
              <span>{musicKind === "own" && !ownDuration ? (listening ? t(L, "readingMusic") : t(L, "musicLengthUnknown"))
                : start == null ? t(L, "musicTooShort") : t(L, "startsAt", { seconds: tenths(start) })}</span>
            </ui.Row>
          </div>
        ) : null) : null}
      </ui.Section>
      <ui.Section title={t(L, "length")}>
        <ui.Segmented label={t(L, "length")} value={length} onChange={(v: any) => setLength(v)} disabled={busy}
          options={[{ label: t(L, "length.short"), value: "short" }, { label: t(L, "length.standard"), value: "standard" }, { label: t(L, "length.long"), value: "long" }]} />
        <ui.Segmented label={t(L, "pace")} value={pace} onChange={(v: any) => setPace(v)} disabled={busy}
          options={[{ label: t(L, "pace.cinematic"), value: "cinematic" }, { label: t(L, "pace.quick"), value: "quick" }]} />
        {fitLine ? <ui.Message tone="muted">{fitLine}</ui.Message> : null}
        {footageLine ? <ui.Message tone="muted">{footageLine}</ui.Message> : null}
        {paceNote ? <ui.Message tone="muted">{paceNote}</ui.Message> : null}
        <ui.Row gap={8} align="center">
          <ui.Message tone={!inventory && invError ? "error" : "muted"}>{readiness}</ui.Message>
          <ui.Button variant="ghost" busy={invLoading} busyLabel={t(L, "refreshing")} disabled={busy || !assets} onClick={refreshInventory}>{t(L, "refresh")}</ui.Button>
        </ui.Row>
        {localNote ? <ui.Message tone="muted">{localNote}</ui.Message> : null}
        {!inventory && invError && !invError.busy ? <ui.Message tone="muted">{t(L, "details", { detail: invError.say(L) })}</ui.Message> : null}
      </ui.Section>
      <ui.Section title={t(L, "advanced")}>
        <ui.Segmented label={t(L, "clipSound")} value={clipSound} onChange={(v: any) => setClipSound(v)} disabled={busy}
          options={[{ label: t(L, "sound.off"), value: "off" }, { label: t(L, "sound.ambient"), value: "ambient" }, { label: t(L, "sound.full"), value: "full" }]} />
        <ui.Toggle label={t(L, "cinematicLook")} value={look} onChange={setLook} disabled={busy} />
        {look ? <ui.Slider label={t(L, "param.look")} value={strength} min={0} max={1} step={0.05} onChange={(v: number) => setLookStrength(v)} disabled={busy} /> : null}
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
            {/* One row per clip: the name truncates, duration and shape stay visible; long lists scroll inside (a thin,
                stable scrollbar, so Windows' wide classic bars do not squeeze the rows). */}
            <div style={{ maxHeight: 220, overflowY: "auto", scrollbarGutter: "stable", scrollbarWidth: "thin", marginTop: 4, borderRadius: "var(--panel-radius, 6px)",
              border: "1px solid var(--panel-border, rgba(128, 128, 128, 0.35))" } as any}>
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
      {progress ? <ui.Progress value={progress.value} label={progressLabel} steps={AV_BUILD_STEPS.map((s) => t(L, "step." + s.id))} current={progress.current} />
        : busy ? <ui.Progress label={stepText || t(L, "working")} /> : null}
      {status ? <ui.Message tone={status.tone === "error" ? "error" : "muted"}>{status.say(L)}</ui.Message> : null}
      {result && result.decorated ? <ui.Message tone="success">{t(L, "draftCreated")}</ui.Message>
        : result && busy ? <ui.Message tone="muted">{t(L, "draftCreatedAdding")}</ui.Message>
        : result ? <ui.Message tone="muted">{t(L, "draftNotFinished")}</ui.Message> : null}
      {result?.link ? (
        <ui.Row gap={8} align="center">
          <a href={result.link} target="_blank" rel="noreferrer">{t(L, "openDraft")}</a>
          <ui.IconButton icon="copy" label={t(L, "copyLink")} onClick={() => { navigator.clipboard?.writeText(result.link).catch(() => null); }} />
        </ui.Row>
      ) : null}
      {result?.shortened ? (
        <ui.Message tone="muted">{t(L, "shortened", { fitted: result.shortened.shots, count: result.shortened.of, seconds: tenths(result.shortened.seconds) })}</ui.Message>
      ) : null}
      {result?.notes?.length ? <ui.Message tone="muted">{t(L, "note", { detail: result.notes.join("; ") })}</ui.Message> : null}
      {result?.recovered ? <ui.Message tone="muted">{t(L, "draftRecovered")}</ui.Message> : null}
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

// A plan failure in the UI language (`noPlan` for a reason AV_FAIL does not list). `plan` is the failure with the
// reason's numbers (planner avPlanBuild): a length the clips or the music must reach rounds up, one they have rounds
// down, so the sentence never understates the gap.
function failText(lang: Lang, reason: string, plan: any = {}) {
  const up = (v: any) => Math.ceil((Number(v) || 0) * 10 - 1e-6) / 10, down = (v: any) => Math.floor((Number(v) || 0) * 10 + 1e-6) / 10;
  if (reason === "opening-too-short") return t(lang, "fail.opening-too-short", { needed: up(plan?.neededSeconds), longest: down(plan?.longestSeconds) });
  if (reason === "ending-too-short") return t(lang, "fail.ending-too-short", { needed: up(plan?.neededSeconds), longest: down(plan?.longestSeconds) });
  if (reason === "too-few") return t(lang, "fail.too-few", { filled: Number(plan?.usableSlots) || 0, total: AV_MIN_MONTAGE + 3 });
  if (reason === "music-too-short") {
    return typeof plan?.neededSeconds === "number" && typeof plan?.availableSeconds === "number"
      ? t(lang, "fail.music-too-short-seconds", { needed: up(plan.neededSeconds), available: down(plan.availableSeconds) })
      : t(lang, "fail.music-too-short");
  }
  if (reason === "no-video") return t(lang, "fail.no-video");
  if (reason === "one-video") return t(lang, "fail.one-video");
  return t(lang, "noPlan");
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
    console.warn("[archive-vlog] " + summary + " came back empty, reading again:", text);
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
// Why a handed file could not be placed (the host's own message), so the run can say it instead of a bare "not found".
const failed = [];
let shared = null;
for (const h of cfg.files) {
  try {
    const photo = h.kind === 'image';
    const d = photo || !shared ? await p.createDraft({ name: 'Archive Vlog id check' }) : shared;
    if (!photo) shared = d;
    const before = new Set((await d.clips({ trackScope: 'main' })).map(c => c.clipId));
    try { await d.insertResource({ resourceId: h.rid, sourceRange: { startSeconds: 0, endSeconds: 0.5 } }); }
    catch (e) { await d.insertResource({ resourceId: h.rid }); }
    const clip = (await d.clips({ trackScope: 'main' })).find(c => c.resourceId !== null && !before.has(c.clipId));
    if (!clip) { failed.push({ rid: h.rid, error: 'inserted, but no clip appeared' }); continue; }
    let size = null;
    if (photo) {
      const fs = (await d.meta()).frameSize;
      if (fs && fs.width > 0 && fs.height > 0) size = { width: fs.width, height: fs.height };
    }
    resolved.push({ rid: h.rid, alias: clip.resourceId, size });
  } catch (e) { failed.push({ rid: h.rid, error: String((e && e.message) || e).slice(0, 300) }); }
}
return { resolved, failed };`;

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

// A template run's step (its status line and the "stopped at" message): "files" (reading the chosen files) or a build
// step of AV_BUILD_STEPS (STRINGS `step.<id>`).
function templateStepName(lang: Lang, step: string) { return step === "files" ? t(lang, "tpl.files") : t(lang, "step." + step); }

// The whole template build. Returns the new Draft; throws templateIssue(...) for the person, or STALE when a newer run
// (or the frame closing) replaced this one. `say` names the current step (templateStepName) for the status line.
async function runArchiveVlogTemplate(sdk: any, context: any, check: () => void, say: (step: string, detail?: string) => void): Promise<{ sequenceId: string }> {
  // The UI language when the run starts: its messages and the Inspector labels written into the Draft use it.
  const bl = uiLang(context);
  const pid: string | null = context?.projectId ?? null;
  if (!pid) throw templateIssue(t(bl, "openProject"));
  const files = templateFootage(context);
  if (!files.length) throw templateIssue(t(bl, "tpl.noFootage"));
  const run = (summary: string, script: string, allowCommit = false) => runTemplateStep(sdk, summary, script, allowCommit);
  const options = context?.template?.options || {};

  say("files");
  const roots = await locateRoots(sdk);
  check();
  const assets = await loadAssets(roots.plugin);
  check();
  // The track, length and style chosen on the app's page; an unknown or missing one gets the panel's default.
  const cues: any[] = assets.manifest.cues || [];
  const cue = cues.find((c) => c.id === options.track) || cues.find((c) => c.id === DEFAULT_CUE) || cues[0];
  if (!cue) throw templateIssue(t(bl, "tpl.noMusic"));
  const length: "short" | "standard" | "long" = options.length === "short" || options.length === "long" ? options.length : DEFAULT_LENGTH;
  const chosen = avPreset(assets.presets, options.title);
  if (!chosen) throw templateIssue(t(bl, "tpl.noStyles"));

  // Handed ids to the Project's aliases; the files the first pass skipped get one more.
  const resolved: Array<{ rid: string; alias: string; size: { width: number; height: number } | null }> = [];
  // The host's reason per file that could not be placed (the last attempt's), for the message below.
  const failures = new Map<string, string>();
  const resolveFiles = async (list: Array<{ rid: string; kind: string }>) => {
    for (let i = 0; i < list.length; i += TEMPLATE_ALIAS_BATCH) {
      const r = await run("Find the chosen files", fill(TEMPLATE_ALIAS_JS, { projectId: pid, files: list.slice(i, i + TEMPLATE_ALIAS_BATCH) }));
      check();
      resolved.push(...(r.resolved || []));
      for (const f of r.failed || []) if (f && f.rid) failures.set(String(f.rid), String(f.error || ""));
    }
  };
  await resolveFiles(files);
  const unresolved = files.filter((f) => !resolved.some((r) => r.rid === f.rid));
  if (unresolved.length) await resolveFiles(unresolved);
  const aliases = [...new Set(resolved.map((r) => r.alias))];
  const known: Record<string, { width: number; height: number }> = {};
  for (const r of resolved) if (r.size) known[r.alias] = r.size;
  if (failures.size) console.warn("[archive-vlog] chosen files that could not be placed:", JSON.stringify([...failures].map(([rid, error]) => ({ rid, error }))));
  if (!aliases.length) {
    // The host's own reason (the most common one), so a failure that is not "missing from this Project" can be told
    // apart (e.g. a source timeline the host cannot load). English detail after a translated sentence, as elsewhere.
    const counts = new Map<string, number>();
    for (const e of failures.values()) if (e) counts.set(e, (counts.get(e) || 0) + 1);
    const reason = [...counts].sort((x, y) => y[1] - x[1])[0]?.[0] || "";
    // The host cannot load a clip's local source timeline: the clips' originals are not on this computer (e.g. a
    // Project synced or shared from another computer; confirmed on Windows Staging 2.0.536). One clear sentence; the
    // host's own reason stays in the log above. A retry or a re-pick does not help, importing here does.
    const notLocal = /analyzed sequence not found|placement_source_unavailable|no local source timeline/i.test(reason);
    if (notLocal) throw templateIssue(t(bl, "tpl.notLocal"));
    throw templateIssue(reason ? [t(bl, "tpl.notFound"), t(bl, "tpl.notFoundDetail", { detail: reason })].join(t(bl, "gap")) : t(bl, "tpl.notFound"));
  }
  // The panel's inventory limited to the handed files: analysed videos with their length and frame size, and photos.
  const inventory = await run("Read footage", fill(assets.scripts.inventoryJs, { projectId: pid, only: aliases, known, measureMs: INVENTORY_MEASURE_MS }));
  check();
  inventory.resources = inventory.resources || [];
  inventory.photos = inventory.photos || [];
  const sizes: Record<string, { width: number; height: number }> = { ...known };
  for (const ph of inventory.photos) if (ph.width > 0 && ph.height > 0) sizes[ph.rid] = { width: ph.width, height: ph.height };
  const unanalysed = inventory.skipped?.unanalysed || 0;

  // Music, length and pace as the panel works them out for a bundled track at its defaults (Cinematic pace, the
  // cue's soft-intro section).
  const pace = DEFAULT_PACE;
  const grid = cueGrid(cue);
  const fit = musicFit(grid, length, pace);
  const musicStart = fit.snap(fit.defaultSection() ?? 0);
  if (musicStart == null || !fit.fitted) throw templateIssue(t(bl, "fail.music-too-short"));

  // Scene search over the handed videos (with the motion query). Nobody can press Build again, so videos whose search
  // failed get one more try.
  say("shots");
  const rids: string[] = inventory.resources.map((r: any) => r.rid);
  const dur: Record<string, number> = Object.fromEntries(inventory.resources.map((r: any) => [r.rid, r.duration]));
  const search = async (todo: string[]) => {
    const list: any[] = []; const failed: string[] = [];
    for (let i = 0; i < todo.length; i += SEARCH_BATCH) {
      say("shots", t(bl, "videosChecked", { done: i, count: todo.length }));
      const r = await run("Search shots", fill(assets.scripts.searchJs, { projectId: pid, rids: todo.slice(i, i + SEARCH_BATCH), queries: AV_QUERIES, pageSize: 4 }));
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
  if (found.failed.length) console.info("[archive-vlog] template run: scene search failed for", found.failed.join(", "));
  const candidates = found.list.map((c: any) => ({ ...c, sourceDuration: dur[c.rid] || 0 }));
  const frames = { ...sizes, ...avSizesOf(inventory) };
  const plan: any = avPlanBuild({ candidates: avMotionBonus(candidates).concat(photoCandsOf(inventory, null, true)), bpm: grid.bpm, accepted: grid.accepted, approxBpm: grid.approxBpm,
    fps: 30, pace, requested: fit.requested, sectionStart: musicStart, usableEnd: grid.usableEnd, onsets: grid.onsets, onsetThresholds: grid.onsetThresholds, lowConfidence: !fit.gridded,
    seed: String(TEMPLATE_SEED), sizes: frames });
  if (!plan.ok) {
    // Whole sentences joined with `gap` (no space after a full stop in ja and zh).
    throw templateIssue([failText(bl, plan.reason, plan), unanalysed ? t(bl, "tpl.notAnalysed", { count: unanalysed }) : ""].filter(Boolean).join(t(bl, "gap")));
  }

  // Commit 1: the music, then the clips on a new Draft.
  say("music");
  const music = await run("Add music to the project", fill(assets.scripts.ensureJs, { projectId: pid, path: pjoin(roots.plugin, "assets", "cues", cue.file),
    duration: typeof cue.duration === "number" ? cue.duration : null }), true);
  check();
  say("draft");
  const fields: Record<string, string> = {};
  for (const fl of chosen.fields) fields[fl.key] = fieldClip(String(fl.initial ?? ""), fl.max);
  const draftName = draftNameOf(fields.title, chosen.label, new Date());
  const clipSound = DEFAULT_CLIP_SOUND;
  // Never resent: the reply may be lost after the Draft was saved.
  const a = await run("Assemble the Archive Vlog", fill(assets.scripts.assembleJs, avAssembleConfig({ projectId: pid, draftName, plan, inventory, music, sectionStart: musicStart, clipSound })), true);
  check();
  if (!a.sequenceId || !(a.totalFrames > 0)) throw templateIssue(t(bl, "tpl.noTitle", { name: draftName }));

  // Commit 2: the title, credit, letterbox reveal, motion, fade and look, as the panel's Finish step adds them.
  say("look");
  const fonts = Object.fromEntries(await Promise.all(fontFiles(assets.presets).map(async (f) => [f, (await readText(roots.plugin, "assets", "fonts", f)).replace(/\s+/g, "")])));
  check();
  // No credit: nobody can type a name in a template run, and the preset's sample name ("YOURNAME") is never published.
  const frozen = { seed: TEMPLATE_SEED, preset: chosen.id, fields, credit: { on: false, name: "" }, clipSound,
    look: { on: true, strength: avLookStrength(chosen) }, sectionStart: musicStart, labels: adjustLabelsFor(bl), motionOptions: motionOptionsFor(bl) };
  const cfg = avDecorateConfig({ sequenceId: a.sequenceId, videoEnd: a.totalFrames, fps: a.fps, plan, presets: assets.presets, tsx: assets.tsx, fonts, sizes,
    openingSize: frames[plan.picks[0]?.rid] || null, frozen,
    provenance: { plugin: PLUGIN_ID, version: PLUGIN_VERSION, preset: chosen.id, cue: cue.id, sectionStart: musicStart, pace, length, seed: TEMPLATE_SEED, clipSound,
      look: true, credit: false } });
  const finish = () => run("Add title and look", fill(assets.scripts.decorateJs, cfg), true);
  // decorate.js skips what an earlier attempt added, so a failed attempt is tried once more.
  try {
    await finish();
  } catch (e) {
    console.warn("[archive-vlog] Add title and look failed, trying again:", errorText(e));
    check();
    try { await finish(); } catch (e2) {
      console.warn("[archive-vlog] Add title and look failed again:", errorText(e2));
      throw templateIssue(t(bl, "tpl.finishFailed"));
    }
  }
  check();
  // Nobody sees this frame, so the Draft is not opened: the app takes the person to it.
  return { sequenceId: a.sequenceId };
}

// What the app mounts out of sight for a template run: one status line. It starts once per runId and ends the run
// exactly once, unless a newer run (or the frame closing) replaced it; then it reports nothing.
function TemplateRun({ sdk, context }: any) {
  const [runStatus, setRunStatus] = React.useState(() => t(uiLang(context), "working"));
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
    const snapshot = context, bl = uiLang(context);
    const live = () => alive.current && latest.current?.template?.runId === runId;
    const check = () => { if (!live()) throw STALE; };
    let ended = false, step: string | null = null;
    const say = (id: string, detail?: string) => {
      step = id;
      if (live()) setRunStatus(detail ? t(bl, "tpl.stepDetail", { name: templateStepName(bl, id), detail }) : templateStepName(bl, id));
    };
    const end = (outcome: TemplateOutcome | null) => {
      if (ended) return;
      ended = true;
      if (!outcome || !live()) return;
      setRunStatus("sequenceId" in outcome ? t(bl, "tpl.done") : outcome.error);
      try { sdk.finishTemplate(outcome); } catch (e) { console.warn("[archive-vlog] finishTemplate failed:", errorText(e)); }
    };
    (async () => {
      try {
        end(await runArchiveVlogTemplate(sdk, snapshot, check, say));
      } catch (e: any) {
        if (e === STALE) { end(null); return; }
        console.warn("[archive-vlog] template run failed at " + (step || "the start") + ":", errorText(e), e);
        end({ error: e?.forPerson ? String(e.message) : step ? t(bl, "tpl.stoppedAt", { step: templateStepName(bl, step) }) : t(bl, "tpl.stopped") });
      } finally {
        end({ error: t(bl, "tpl.stopped") });
      }
    })();
  }, [runId]);
  return <div role="status" style={{ fontSize: 11, color: "var(--panel-muted-fg)" }}>{runStatus}</div>;
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
