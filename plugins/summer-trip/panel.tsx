// @name Summer Trip
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
    working: "Working",
    stillAnalysing: { one: "{count} clip is still being analysed.", other: "{count} clips are still being analysed." },
    autoUpdate: "This updates automatically when they finish.",
    noFootage: "No analysed video or photos in this Project yet. Add video clips and analyse them, or add photos; this updates automatically.",
    noClipsSelected: "No clips selected. Choose clips in Advanced.",
    gap: " ",
    ready: "Ready: {summary}",
    clips: { one: "{count} clip", other: "{count} clips" },
    clipsSelected: { one: "{selected} of {count} clip", other: "{selected} of {count} clips" },
    photos: { one: "{count} photo", other: "{count} photos" },
    photosSelected: { one: "{selected} of {count} photo", other: "{selected} of {count} photos" },
    aboutSeconds: "about {seconds} s",
    stillAnalysingShort: { one: "{count} clip still being analysed", other: "{count} clips still being analysed" },
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
    installTools: "Install ffmpeg and Node.js 18+ to preview music or use your own track.",
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
    videosChecked: { one: "{done}/{count} video checked", other: "{done}/{count} videos checked" },
    stoppedAt: "Stopped at step {step}/{total}, {name}: {detail}",
    build: "Build",
    building: "Building",
    anotherVersion: "Create another version",
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
    openProject: "Open a Project to build a Summer Trip video.",
    refresh: "Refresh",
    refreshing: "Refreshing",
    refreshFailed: "Could not refresh the clip list: {detail}",
    readFailed: "Could not read the clips in this Project: {detail}",
    checkingClipsNow: "Checking clips…",
    checkingClips: "Checking clips",
    listening: "Listening for the beat",
    working: "Working",
    stillAnalysing: { one: "{count} clip is still being analysed.", other: "{count} clips are still being analysed." },
    autoUpdate: "This updates automatically when they finish.",
    noFootage: "No analysed video or photos in this Project yet. Add video clips and analyse them, or add photos; this updates automatically.",
    noClipsSelected: "No clips selected. Choose clips in Advanced.",
    gap: " ",
    ready: "Ready: {summary}",
    clips: { one: "{count} clip", other: "{count} clips" },
    clipsSelected: { one: "{selected} of {count} clip", other: "{selected} of {count} clips" },
    photos: { one: "{count} photo", other: "{count} photos" },
    photosSelected: { one: "{selected} of {count} photo", other: "{selected} of {count} photos" },
    aboutSeconds: "about {seconds} s",
    stillAnalysingShort: { one: "{count} clip still being analysed", other: "{count} clips still being analysed" },
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
    installTools: "Install ffmpeg and Node.js 18+ to preview music or use your own track.",
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
    videosChecked: { one: "{done}/{count} video checked", other: "{done}/{count} videos checked" },
    stoppedAt: "Stopped at step {step}/{total}, {name}: {detail}",
    build: "Build",
    building: "Building",
    anotherVersion: "Create another version",
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
  es: {
    openProject: "Open a Project to build a Summer Trip video.",
    refresh: "Refresh",
    refreshing: "Refreshing",
    refreshFailed: "Could not refresh the clip list: {detail}",
    readFailed: "Could not read the clips in this Project: {detail}",
    checkingClipsNow: "Checking clips…",
    checkingClips: "Checking clips",
    listening: "Listening for the beat",
    working: "Working",
    stillAnalysing: { one: "{count} clip is still being analysed.", other: "{count} clips are still being analysed." },
    autoUpdate: "This updates automatically when they finish.",
    noFootage: "No analysed video or photos in this Project yet. Add video clips and analyse them, or add photos; this updates automatically.",
    noClipsSelected: "No clips selected. Choose clips in Advanced.",
    gap: " ",
    ready: "Ready: {summary}",
    clips: { one: "{count} clip", other: "{count} clips" },
    clipsSelected: { one: "{selected} of {count} clip", other: "{selected} of {count} clips" },
    photos: { one: "{count} photo", other: "{count} photos" },
    photosSelected: { one: "{selected} of {count} photo", other: "{selected} of {count} photos" },
    aboutSeconds: "about {seconds} s",
    stillAnalysingShort: { one: "{count} clip still being analysed", other: "{count} clips still being analysed" },
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
    installTools: "Install ffmpeg and Node.js 18+ to preview music or use your own track.",
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
    videosChecked: { one: "{done}/{count} video checked", other: "{done}/{count} videos checked" },
    stoppedAt: "Stopped at step {step}/{total}, {name}: {detail}",
    build: "Build",
    building: "Building",
    anotherVersion: "Create another version",
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
  fr: {
    openProject: "Open a Project to build a Summer Trip video.",
    refresh: "Refresh",
    refreshing: "Refreshing",
    refreshFailed: "Could not refresh the clip list: {detail}",
    readFailed: "Could not read the clips in this Project: {detail}",
    checkingClipsNow: "Checking clips…",
    checkingClips: "Checking clips",
    listening: "Listening for the beat",
    working: "Working",
    stillAnalysing: { one: "{count} clip is still being analysed.", other: "{count} clips are still being analysed." },
    autoUpdate: "This updates automatically when they finish.",
    noFootage: "No analysed video or photos in this Project yet. Add video clips and analyse them, or add photos; this updates automatically.",
    noClipsSelected: "No clips selected. Choose clips in Advanced.",
    gap: " ",
    ready: "Ready: {summary}",
    clips: { one: "{count} clip", other: "{count} clips" },
    clipsSelected: { one: "{selected} of {count} clip", other: "{selected} of {count} clips" },
    photos: { one: "{count} photo", other: "{count} photos" },
    photosSelected: { one: "{selected} of {count} photo", other: "{selected} of {count} photos" },
    aboutSeconds: "about {seconds} s",
    stillAnalysingShort: { one: "{count} clip still being analysed", other: "{count} clips still being analysed" },
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
    installTools: "Install ffmpeg and Node.js 18+ to preview music or use your own track.",
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
    videosChecked: { one: "{done}/{count} video checked", other: "{done}/{count} videos checked" },
    stoppedAt: "Stopped at step {step}/{total}, {name}: {detail}",
    build: "Build",
    building: "Building",
    anotherVersion: "Create another version",
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
  it: {
    openProject: "Open a Project to build a Summer Trip video.",
    refresh: "Refresh",
    refreshing: "Refreshing",
    refreshFailed: "Could not refresh the clip list: {detail}",
    readFailed: "Could not read the clips in this Project: {detail}",
    checkingClipsNow: "Checking clips…",
    checkingClips: "Checking clips",
    listening: "Listening for the beat",
    working: "Working",
    stillAnalysing: { one: "{count} clip is still being analysed.", other: "{count} clips are still being analysed." },
    autoUpdate: "This updates automatically when they finish.",
    noFootage: "No analysed video or photos in this Project yet. Add video clips and analyse them, or add photos; this updates automatically.",
    noClipsSelected: "No clips selected. Choose clips in Advanced.",
    gap: " ",
    ready: "Ready: {summary}",
    clips: { one: "{count} clip", other: "{count} clips" },
    clipsSelected: { one: "{selected} of {count} clip", other: "{selected} of {count} clips" },
    photos: { one: "{count} photo", other: "{count} photos" },
    photosSelected: { one: "{selected} of {count} photo", other: "{selected} of {count} photos" },
    aboutSeconds: "about {seconds} s",
    stillAnalysingShort: { one: "{count} clip still being analysed", other: "{count} clips still being analysed" },
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
    installTools: "Install ffmpeg and Node.js 18+ to preview music or use your own track.",
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
    videosChecked: { one: "{done}/{count} video checked", other: "{done}/{count} videos checked" },
    stoppedAt: "Stopped at step {step}/{total}, {name}: {detail}",
    build: "Build",
    building: "Building",
    anotherVersion: "Create another version",
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
  ja: {
    openProject: "Open a Project to build a Summer Trip video.",
    refresh: "Refresh",
    refreshing: "Refreshing",
    refreshFailed: "Could not refresh the clip list: {detail}",
    readFailed: "Could not read the clips in this Project: {detail}",
    checkingClipsNow: "Checking clips…",
    checkingClips: "Checking clips",
    listening: "Listening for the beat",
    working: "Working",
    stillAnalysing: { one: "{count} clip is still being analysed.", other: "{count} clips are still being analysed." },
    autoUpdate: "This updates automatically when they finish.",
    noFootage: "No analysed video or photos in this Project yet. Add video clips and analyse them, or add photos; this updates automatically.",
    noClipsSelected: "No clips selected. Choose clips in Advanced.",
    gap: " ",
    ready: "Ready: {summary}",
    clips: { one: "{count} clip", other: "{count} clips" },
    clipsSelected: { one: "{selected} of {count} clip", other: "{selected} of {count} clips" },
    photos: { one: "{count} photo", other: "{count} photos" },
    photosSelected: { one: "{selected} of {count} photo", other: "{selected} of {count} photos" },
    aboutSeconds: "about {seconds} s",
    stillAnalysingShort: { one: "{count} clip still being analysed", other: "{count} clips still being analysed" },
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
    installTools: "Install ffmpeg and Node.js 18+ to preview music or use your own track.",
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
    videosChecked: { one: "{done}/{count} video checked", other: "{done}/{count} videos checked" },
    stoppedAt: "Stopped at step {step}/{total}, {name}: {detail}",
    build: "Build",
    building: "Building",
    anotherVersion: "Create another version",
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
  ko: {
    openProject: "Open a Project to build a Summer Trip video.",
    refresh: "Refresh",
    refreshing: "Refreshing",
    refreshFailed: "Could not refresh the clip list: {detail}",
    readFailed: "Could not read the clips in this Project: {detail}",
    checkingClipsNow: "Checking clips…",
    checkingClips: "Checking clips",
    listening: "Listening for the beat",
    working: "Working",
    stillAnalysing: { one: "{count} clip is still being analysed.", other: "{count} clips are still being analysed." },
    autoUpdate: "This updates automatically when they finish.",
    noFootage: "No analysed video or photos in this Project yet. Add video clips and analyse them, or add photos; this updates automatically.",
    noClipsSelected: "No clips selected. Choose clips in Advanced.",
    gap: " ",
    ready: "Ready: {summary}",
    clips: { one: "{count} clip", other: "{count} clips" },
    clipsSelected: { one: "{selected} of {count} clip", other: "{selected} of {count} clips" },
    photos: { one: "{count} photo", other: "{count} photos" },
    photosSelected: { one: "{selected} of {count} photo", other: "{selected} of {count} photos" },
    aboutSeconds: "about {seconds} s",
    stillAnalysingShort: { one: "{count} clip still being analysed", other: "{count} clips still being analysed" },
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
    installTools: "Install ffmpeg and Node.js 18+ to preview music or use your own track.",
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
    videosChecked: { one: "{done}/{count} video checked", other: "{done}/{count} videos checked" },
    stoppedAt: "Stopped at step {step}/{total}, {name}: {detail}",
    build: "Build",
    building: "Building",
    anotherVersion: "Create another version",
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
  pt: {
    openProject: "Open a Project to build a Summer Trip video.",
    refresh: "Refresh",
    refreshing: "Refreshing",
    refreshFailed: "Could not refresh the clip list: {detail}",
    readFailed: "Could not read the clips in this Project: {detail}",
    checkingClipsNow: "Checking clips…",
    checkingClips: "Checking clips",
    listening: "Listening for the beat",
    working: "Working",
    stillAnalysing: { one: "{count} clip is still being analysed.", other: "{count} clips are still being analysed." },
    autoUpdate: "This updates automatically when they finish.",
    noFootage: "No analysed video or photos in this Project yet. Add video clips and analyse them, or add photos; this updates automatically.",
    noClipsSelected: "No clips selected. Choose clips in Advanced.",
    gap: " ",
    ready: "Ready: {summary}",
    clips: { one: "{count} clip", other: "{count} clips" },
    clipsSelected: { one: "{selected} of {count} clip", other: "{selected} of {count} clips" },
    photos: { one: "{count} photo", other: "{count} photos" },
    photosSelected: { one: "{selected} of {count} photo", other: "{selected} of {count} photos" },
    aboutSeconds: "about {seconds} s",
    stillAnalysingShort: { one: "{count} clip still being analysed", other: "{count} clips still being analysed" },
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
    installTools: "Install ffmpeg and Node.js 18+ to preview music or use your own track.",
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
    videosChecked: { one: "{done}/{count} video checked", other: "{done}/{count} videos checked" },
    stoppedAt: "Stopped at step {step}/{total}, {name}: {detail}",
    build: "Build",
    building: "Building",
    anotherVersion: "Create another version",
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
  tr: {
    openProject: "Open a Project to build a Summer Trip video.",
    refresh: "Refresh",
    refreshing: "Refreshing",
    refreshFailed: "Could not refresh the clip list: {detail}",
    readFailed: "Could not read the clips in this Project: {detail}",
    checkingClipsNow: "Checking clips…",
    checkingClips: "Checking clips",
    listening: "Listening for the beat",
    working: "Working",
    stillAnalysing: { one: "{count} clip is still being analysed.", other: "{count} clips are still being analysed." },
    autoUpdate: "This updates automatically when they finish.",
    noFootage: "No analysed video or photos in this Project yet. Add video clips and analyse them, or add photos; this updates automatically.",
    noClipsSelected: "No clips selected. Choose clips in Advanced.",
    gap: " ",
    ready: "Ready: {summary}",
    clips: { one: "{count} clip", other: "{count} clips" },
    clipsSelected: { one: "{selected} of {count} clip", other: "{selected} of {count} clips" },
    photos: { one: "{count} photo", other: "{count} photos" },
    photosSelected: { one: "{selected} of {count} photo", other: "{selected} of {count} photos" },
    aboutSeconds: "about {seconds} s",
    stillAnalysingShort: { one: "{count} clip still being analysed", other: "{count} clips still being analysed" },
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
    installTools: "Install ffmpeg and Node.js 18+ to preview music or use your own track.",
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
    videosChecked: { one: "{done}/{count} video checked", other: "{done}/{count} videos checked" },
    stoppedAt: "Stopped at step {step}/{total}, {name}: {detail}",
    build: "Build",
    building: "Building",
    anotherVersion: "Create another version",
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
  zh: {
    openProject: "Open a Project to build a Summer Trip video.",
    refresh: "Refresh",
    refreshing: "Refreshing",
    refreshFailed: "Could not refresh the clip list: {detail}",
    readFailed: "Could not read the clips in this Project: {detail}",
    checkingClipsNow: "Checking clips…",
    checkingClips: "Checking clips",
    listening: "Listening for the beat",
    working: "Working",
    stillAnalysing: { one: "{count} clip is still being analysed.", other: "{count} clips are still being analysed." },
    autoUpdate: "This updates automatically when they finish.",
    noFootage: "No analysed video or photos in this Project yet. Add video clips and analyse them, or add photos; this updates automatically.",
    noClipsSelected: "No clips selected. Choose clips in Advanced.",
    gap: " ",
    ready: "Ready: {summary}",
    clips: { one: "{count} clip", other: "{count} clips" },
    clipsSelected: { one: "{selected} of {count} clip", other: "{selected} of {count} clips" },
    photos: { one: "{count} photo", other: "{count} photos" },
    photosSelected: { one: "{selected} of {count} photo", other: "{selected} of {count} photos" },
    aboutSeconds: "about {seconds} s",
    stillAnalysingShort: { one: "{count} clip still being analysed", other: "{count} clips still being analysed" },
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
    installTools: "Install ffmpeg and Node.js 18+ to preview music or use your own track.",
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
    videosChecked: { one: "{done}/{count} video checked", other: "{done}/{count} videos checked" },
    stoppedAt: "Stopped at step {step}/{total}, {name}: {detail}",
    build: "Build",
    building: "Building",
    anotherVersion: "Create another version",
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
function stFillers(candidates) {
  const dur = {};
  for (const c of candidates) {
    if (!c || c.kind === 'photo' || typeof c.rid !== 'string') continue;
    if (typeof c.sourceDuration !== 'number' || !isFinite(c.sourceDuration) || !(c.sourceDuration > 0)) continue;
    dur[c.rid] = Math.max(dur[c.rid] || 0, c.sourceDuration);
  }
  const out = [];
  for (const rid of Object.keys(dur).sort()) {
    const d = dur[rid], span = d - 2 * ST_FILLER_EDGE;
    if (span < -1e-9) continue;
    const count = Math.floor(span / ST_FILLER_STEP + 1e-9) + 1;
    if (count <= ST_FILLER_MAX) {
      for (let k = 0; k < count; k++) out.push({ rid, role: 'filler', t: ST_FILLER_EDGE + k * ST_FILLER_STEP, score: ST_FILLER_SCORE, sourceDuration: d });
    } else {
      for (let k = 0; k < ST_FILLER_MAX; k++) out.push({ rid, role: 'filler', t: ST_FILLER_EDGE + k * span / (ST_FILLER_MAX - 1), score: ST_FILLER_SCORE, sourceDuration: d });
    }
  }
  return out;
}

// Frame-aligned source window of `frames` frames centred on t: the start is a whole frame at fps, the window ends at
// least ST_SOURCE_TAIL before the end of the source. Returns { start, end } in seconds or null when it cannot fit.
function stWindow(t, frames, fps, sourceDuration) {
  const maxStart = Math.floor((sourceDuration - ST_SOURCE_TAIL) * fps - frames + 1e-6);
  if (maxStart < 0) return null;
  const want = Math.round((t - frames / fps / 2) * fps);
  const s = Math.max(0, Math.min(maxStart, want));
  return { start: s / fps, end: (s + frames) / fps };
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
      const w = stWindow(c.t, slot.frames, fps, c.sourceDuration);
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
//   candidates: search hits [{ rid, role, t, score, sourceDuration }] + photos [{ rid, kind: 'photo' }],
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
    if (typeof c.rid === 'string' && typeof c.sourceDuration === 'number' && isFinite(c.sourceDuration) && stWindow(0, minFrames, fps, c.sourceDuration)) eligible[c.rid] = true;
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

// One pseudo candidate per selected video: before a scene search the planner fills every window from fillers, so
// the readiness line can show the distinct-resource count, the fitted N and the reason Build is disabled. An
// estimate: a searched plan ranks real hits first, which can change the picks but not what fits.
function stPseudoCandidates(resources) {
  return (resources || []).filter(r => r && r.duration > 0).map(r => ({ rid: r.rid, role: 'filler', t: r.duration / 2, score: ST_FILLER_SCORE, sourceDuration: r.duration }));
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
// Apps started from Finder get a bare PATH, so shell steps also look in Homebrew and the newest nvm Node.
const TOOL_PATH = 'export PATH="$PATH:/opt/homebrew/bin:/usr/local/bin"; '
  + 'n=$( (ls -d "$HOME"/.nvm/versions/node/*/bin) 2>/dev/null | sort -V | tail -1); [ -n "$n" ] && export PATH="$PATH:$n"; ';
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

export default function Panel({ sdk, context, ui }: any) {
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
  const [tools, setTools] = React.useState({ ffmpeg: true, node: true });
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

  // Inventory bookkeeping: the inventory script, the last clip set seen, photo sizes measured earlier and a load in flight.
  const inventoryJsRef = React.useRef<string | null>(null);
  const invSigRef = React.useRef<string | null>(null);
  const photoSizesRef = React.useRef<Record<string, { width: number; height: number }>>({});
  const invLoadingRef = React.useRef<string | null>(null);
  const mountedRef = React.useRef(true);
  const [invError, setInvError] = React.useState<string | null>(null);
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
      const sig = inv.resources.map((r: any) => r.rid).sort().join(",") + "|" + (inv.skipped?.unanalysed || 0);
      // A changed clip set drops the cached scene search so a build never uses stale candidates.
      if (invSigRef.current !== sig) { if (invSigRef.current !== null) setCandidates(null); invSigRef.current = sig; }
      setInventory(inv); setInvError(null);
    } catch (e: any) {
      if (live()) setInvError(String(e?.message || e));
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
    setOnly(null); setOnlyPhotos(null); setSeasonEdit(null); setTopMainEdit(null);
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

  // Clips still being analysed (or none yet): re-read the inventory every 10 s until they are ready.
  // The effect re-arms on each new inventory, and stops on unmount, Project switch and while busy.
  // A Project with only photos has nothing to wait for, so it does not poll (each read measures new photos).
  const needsPoll = !!inventory && (inventory.skipped?.unanalysed > 0 || (inventory.resources.length === 0 && !inventory.photos?.length));
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
      const pcm = roots.data + "/own-music.f32";
      const cmd = TOOL_PATH + "ffmpeg -nostdin -v error -y -t 360 -i " + sq(file.path) + " -ac 1 -ar 22050 -f f32le " + sq(pcm) + " && node " + sq(roots.plugin + "/beat-detect.cjs") + " " + sq(pcm) + " 22050 " + sq(roots.data + "/own-music.json") + " largest"
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

  async function findCandidates(rids: string[], pid: string, check: () => void) {
    const list: any[] = []; const failed: string[] = [];
    // ST_SEARCH_BATCH clips per call keeps each call inside run_script's fixed 30 s deadline.
    for (let i = 0; i < rids.length; i += ST_SEARCH_BATCH) {
      advance("shots", 0.9 * i / rids.length, (l) => t(l, "videosChecked", { done: i, count: rids.length }));
      const r = await run("Search travel shots", fill(assets.scripts.searchJs, { projectId: pid, rids: rids.slice(i, i + ST_SEARCH_BATCH), queries: ST_SEARCH_QUERIES, pageSize: ST_SEARCH_PAGE }));
      check();
      list.push(...r.candidates); failed.push(...r.failed);
    }
    return { list, failed };
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
  const pending = inventory?.skipped?.unanalysed || 0;
  const clipCount = [
    allRids.length ? (only ? t(L, "clipsSelected", { selected: selectedRids.length, count: allRids.length }) : t(L, "clips", { count: allRids.length })) : "",
    usePhotos && allPhotoRids.length ? (onlyPhotos ? t(L, "photosSelected", { selected: selectedPhotoRids.length, count: allPhotoRids.length }) : t(L, "photos", { count: allPhotoRids.length })) : "",
  ].filter(Boolean).join(" · ");
  const readiness = !inventory ? (invError ? t(L, "readFailed", { detail: invError }) : t(L, "checkingClipsNow"))
    : inventory.resources.length === 0 && !allPhotoRids.length ? (pending > 0
      ? t(L, "stillAnalysing", { count: pending }) + t(L, "gap") + t(L, "autoUpdate")
      : t(L, "noFootage"))
    : selectedRids.length === 0 && usedPhotoCount === 0 ? t(L, "noClipsSelected")
    : t(L, "ready", { summary: [clipCount || t(L, "clips", { count: 0 }), t(L, "aboutSeconds", { seconds: Math.round(readyPlan && readyPlan.ok ? readyPlan.seconds : videoSeconds) }),
      ...(pending > 0 ? [t(L, "stillAnalysingShort", { count: pending })] : [])].join(" · ") });
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
    ...(tools.ffmpeg && tools.node ? [{ label: t(L, "ownMusic"), value: "own" }] : []),
    { label: t(L, "noMusic"), value: "none" },
  ];
  const canOwnMusic = tools.ffmpeg && tools.node;
  const silent = music.kind === "none" && clipSound === "off";
  const isDrop = !!(sectionInfo && sectionInfo.kind === "drop");
  const stepText = step === "checkingClips" ? t(L, "checkingClips") : step === "listening" ? t(L, "listening") : "";
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
      {inventory && invError ? <ui.Message tone="error">{t(L, "refreshFailed", { detail: invError })}</ui.Message> : null}
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
