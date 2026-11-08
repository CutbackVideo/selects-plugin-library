// @name Chart Maker
// @icon chart
// Paste cells from Excel/Sheets or load a CSV, style a bar, line, pie or donut
// chart with a live, playable preview, then add it to a Draft as an editable
// graphic clip (full screen or over the video, with or without a background),
// or update a chart that is already in the Draft.
import React from "react";

const STRINGS: any = {
  en: {
    tabs: { data: "Data", ai: "AI design", design: "Design", text: "Text", motion: "Motion", place: "Place" },
    refs: "Reference images",
    refsHint: "Up to 4 images: a brand guide, a screenshot, a chart you like.",
    refLoading: "Preparing image…",
    refFailed: "Couldn't read that image. Try a PNG or JPG under 10 MB.",
    refType: "Choose an image file (PNG, JPG, WebP or GIF).",
    refMax: "You can add up to 4 reference images.",
    removeRef: "Remove image",
    instructions: "Instructions",
    instructionsPlaceholder: "e.g. Match the brand colors, use a bold modern font, rounded bars, animate one by one.",
    aiApply: "Design with AI",
    aiWorking: "Designing…",
    aiCredits: "May use credits.",
    aiNeedInput: "Add a reference image or write some instructions first.",
    aiNoChanges: "The AI didn't suggest any changes. Try more specific instructions.",
    aiFailed: "The AI design didn't come back in a usable form. Try again.",
    aiApplied: (summary: string, n: number) => `${summary || "Design updated."} (${n} setting${n === 1 ? "" : "s"} changed — preview above.)`,
    aiUndo: "Undo AI changes",
    aiStop: "Stop",
    aiStopped: "Stopped. The AI request can't be cancelled once sent, so it may still finish and use credits, but its reply will be ignored.",
    aiServiceDown: (detail: string) => `Selects couldn't assign an AI model on credits right now (${detail}). Try again in a moment, or use the model selected in your chat instead.`,
    aiRetry: "Try again",
    aiUseChatModel: "Use my chat model",
    modeLabel: "Chart",
    modeNew: "New",
    modeEdit: "Edit existing",
    add: "Add chart",
    adding: "Adding…",
    update: "Update chart",
    updating: "Updating…",
    addCopy: "Add as new",
    play: "Play animation",
    startOver: "Start over",
    startOverTitle: "Start a new chart?",
    startOverMsg: "This clears the data and title and resets the design, text and animation settings.",
    clearData: "Clear",
    animOff: "Animate",
    pickChart: "Chart to edit",
    noCharts: "No Chart Maker charts in this draft yet.",
    refresh: "Refresh list",
    loading: "Reading file…",
    loadingChart: "Loading chart…",
    needDraft: "Open a draft first, or choose New draft in Place.",
    solidOverVideo: "The solid background will hide the video under the chart.",
    seeThrough: "Turn background off",
    noBackground: "no background",
    editing: (name: string, at: string) => `Editing “${name}” at ${at}. Press Update chart to apply.`,
    summaryNew: (where: string, secs: number, area: string) => `${where} · ${secs} s · ${area}`,
    addedTo: (name: string) => `Added to “${name}”.`,
    createdDraft: (name: string) => `Created draft “${name}”.`,
    updated: "Chart updated.",
    noData: "Paste some numbers first.",
    fileTooBig: "That file is over 1 MB. Trim it to the rows you want to chart.",
    fileType: "Choose a .csv, .tsv or .txt file. For .xlsx, copy the cells and paste them.",
    fileFailed: "Couldn't read that file.",
    parsed: (c: number, s: number) => `${c} ${c === 1 ? "row" : "rows"} · ${s} series`,
    chartType: "Chart type",
    types: { bar: "Bar", hbar: "Horizontal bar", line: "Line", pie: "Pie", donut: "Donut" },
    data: "Data",
    fileTypes: "Upload a .csv, .tsv or .txt file (comma, tab or semicolon separated, up to 1 MB). For Excel (.xlsx), Numbers or Google Sheets, copy the cells and paste them below.",
    dropLabel: "Drop a .csv, .tsv or .txt file",
    paste: "Paste from Excel, Sheets or CSV",
    pastePlaceholder: "Month\tSubscribers\nJan\t1200\nFeb\t1850",
    colors: "Colors",
    background: "Background color",
    colorEach: "Color each bar",
    layout: "Layout",
    chartWidth: "Chart width",
    showGrid: "Gridlines",
    showBaseline: "Baseline",
    axes: "Axes",
    axisLines: "X and Y axis lines",
    axisMarks: "Axis marks and scale",
    axisColor: "Axis & grid color",
    barWidth: "Bar width",
    cornerRadius: "Corner radius",
    lineWidth: "Line width",
    showPoints: "Points",
    fillArea: "Fill under line",
    donutHole: "Hole size",
    reset: "Reset design",
    title: "Title",
    titleText: "Title",
    showTitle: "Show title",
    font: "Font",
    size: "Size",
    weight: "Weight",
    color: "Color",
    weights: { "400": "Regular", "500": "Medium", "600": "Semibold", "700": "Bold", "900": "Black" },
    values: "Values",
    showValues: "Show values",
    prefix: "Prefix (e.g. $)",
    suffix: "Suffix (e.g. k, %)",
    decimals: "Decimals",
    auto: "Auto",
    thousands: "Thousands separator",
    pieValues: "Slice values",
    pieModes: { percent: "%", value: "Value", both: "Both" },
    labels: "Labels",
    showLabels: "Show labels",
    showLegend: "Show legend",
    motion: "Animation",
    animate: "Animate in",
    animStyle: "Style",
    animStyles: { draw: "Draw", cascade: "One by one", bounce: "Bounce", fade: "Fade up" },
    animStyleHints: {
      draw: "Lines draw left to right, bars grow together, pies sweep around.",
      cascade: "Bars, points and slices appear one after another.",
      bounce: "One after another, each overshooting slightly before it settles.",
      fade: "The finished chart fades in while rising slightly.",
    },
    animSeconds: "Length",
    where: "Where",
    places: { playhead: "Over video", start: "Start", end: "End", new: "New draft" },
    placeHints: {
      playhead: "Sits on top of the video from the playhead, for the duration below.",
      start: "Pushes the draft back to make room at the start.",
      end: "Adds after everything else in the draft.",
      new: "Makes a new draft with only this chart.",
    },
    canvas: "Canvas",
    duration: "Duration",
    editPlaceNote: "Where and duration apply to new charts. To change an existing chart's length, trim it on the timeline.",
    onScreen: "On screen",
    screenPos: "Position",
    areas: {
      full: "Full screen", center: "Centered", left: "Left half", right: "Right half", top: "Top half", bottom: "Bottom half",
      topLeft: "Top left", topRight: "Top right", bottomLeft: "Bottom left", bottomRight: "Bottom right",
    },
    bgOn: "Background",
    bgOnHint: "Added as its own clip under the chart. Turn it off to show the chart straight over the video.",
    bgStyle: "Style",
    bgStyles: { solid: "Full frame", card: "Card" },
    bgStyleHints: {
      solid: "Fills the whole frame behind the chart.",
      card: "A panel behind the chart only; the video shows around it.",
    },
    bgRadius: "Card corners",
    textOutline: "Text outline",
    textOutlineHint: "A thin dark edge on the text for busy video.",
    language: "Language",
    langAuto: "Same as Selects",
    langEn: "English",
    langKo: "\ud55c\uad6d\uc5b4",
    source: "Source",
    sourceText: "Source text",
    sourcePlaceholder: "e.g. Source: Statistics Korea, 2026",
    sourceHint: "Shown in small type under the chart. Leave empty to hide it.",
    align: "Align",
    aligns: { left: "Left", center: "Center", right: "Right" },
    cutWarn: (rows: number, from: string, to: string, series: string[]) => {
      const parts: string[] = [];
      if (rows > 0) parts.push(`${rows} ${rows === 1 ? "row" : "rows"} (${from === to ? from : from + " to " + to})`);
      if (series.length) parts.push(`${series.length} series (${series.join(", ")})`);
      return `A chart fits up to 60 rows and 6 series, so this was left out: ${parts.join(" and ")}. To chart it, paste fewer rows or columns.`;
    },
    styles: "Saved styles",
    stylesHint: "A style keeps the colors, fonts, sizes, background and animation. The data, title and position stay as they are.",
    stylePick: "Style",
    stylePlaceholder: "Choose a style",
    noStyles: "No saved styles yet. Set up a look, then save it here.",
    styleName: "Style name",
    styleNamePlaceholder: "e.g. Northwind brand",
    styleSave: "Save style",
    styleSaved: (n: string) => `Saved “${n}”.`,
    styleApplied: (n: string) => `Applied “${n}”.`,
    styleUndo: "Undo",
    styleDelete: "Delete",
    styleDeleteTitle: (n: string) => `Delete “${n}”?`,
    styleDeleteMsg: "Charts already in your drafts keep their look.",
    styleReplaceTitle: (n: string) => `Replace “${n}”?`,
    styleReplaceMsg: "A saved style already has this name. Replace it with the current look?",
    styleReplace: "Replace",
    styleSaveFailed: "Couldn't save the style. Try again.",
    highlight: "Highlight",
    highlightNone: "None",
    highlightColor: "Highlight color",
    dimColor: "Color of the rest",
    highlightHint: "One bar or slice stands out in the highlight color; the rest take the second color.",
    highlightHintMulti: "The highlighted group keeps its colors; the rest fade toward the background.",
    msgEmpty: "Paste data or load a CSV to make a chart",
    msgNoNumbers: "No numbers found",
    msgPie: "Pie charts need positive numbers",
  },
  ko: {
    tabs: { data: "\ub370\uc774\ud130", ai: "AI \ub514\uc790\uc778", design: "\ub514\uc790\uc778", text: "\ud14d\uc2a4\ud2b8", motion: "\ubaa8\uc158", place: "\ubc30\uce58" },
    refs: "\ucc38\uace0 \uc774\ubbf8\uc9c0",
    refsHint: "\ucd5c\ub300 4\uc7a5: \ube0c\ub79c\ub4dc \uac00\uc774\ub4dc, \uc2a4\ud06c\ub9b0\uc0f7, \ub9c8\uc74c\uc5d0 \ub4dc\ub294 \ucc28\ud2b8 \ub4f1.",
    refLoading: "\uc774\ubbf8\uc9c0 \uc900\ube44 \uc911…",
    refFailed: "\uc774\ubbf8\uc9c0\ub97c \uc77d\uc9c0 \ubabb\ud588\uc5b4\uc694. 10MB \uc774\ud558\uc758 PNG\ub098 JPG\ub85c \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.",
    refType: "\uc774\ubbf8\uc9c0 \ud30c\uc77c(PNG, JPG, WebP, GIF)\uc744 \uc120\ud0dd\ud574 \uc8fc\uc138\uc694.",
    refMax: "\ucc38\uace0 \uc774\ubbf8\uc9c0\ub294 \ucd5c\ub300 4\uc7a5\uae4c\uc9c0 \ucd94\uac00\ud560 \uc218 \uc788\uc5b4\uc694.",
    removeRef: "\uc774\ubbf8\uc9c0 \uc0ad\uc81c",
    instructions: "\uc694\uccad \uc0ac\ud56d",
    instructionsPlaceholder: "\uc608: \ube0c\ub79c\ub4dc \uc0c9\uc0c1\uc5d0 \ub9de\ucd94\uace0, \uad75\uc740 \ubaa8\ub358 \ud3f0\ud2b8, \ub465\uadfc \ub9c9\ub300, \ud558\ub098\uc529 \ub098\ud0c0\ub098\ub294 \uc560\ub2c8\uba54\uc774\uc158.",
    aiApply: "AI\ub85c \ub514\uc790\uc778",
    aiWorking: "\ub514\uc790\uc778 \uc911…",
    aiCredits: "\ud06c\ub808\ub527\uc774 \uc0ac\uc6a9\ub420 \uc218 \uc788\uc5b4\uc694.",
    aiNeedInput: "\uba3c\uc800 \ucc38\uace0 \uc774\ubbf8\uc9c0\ub97c \ucd94\uac00\ud558\uac70\ub098 \uc694\uccad \uc0ac\ud56d\uc744 \uc785\ub825\ud574 \uc8fc\uc138\uc694.",
    aiNoChanges: "AI\uac00 \ubc14\uafc0 \uc810\uc744 \uc81c\uc548\ud558\uc9c0 \uc54a\uc558\uc5b4\uc694. \uc694\uccad \uc0ac\ud56d\uc744 \ub354 \uad6c\uccb4\uc801\uc73c\ub85c \uc801\uc5b4 \uc8fc\uc138\uc694.",
    aiFailed: "AI \ub514\uc790\uc778 \uacb0\uacfc\ub97c \uc0ac\uc6a9\ud560 \uc218 \uc5c6\ub294 \ud615\ud0dc\ub85c \ubc1b\uc558\uc5b4\uc694. \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.",
    aiApplied: (summary: string, n: number) => `${summary || "\ub514\uc790\uc778\uc744 \ubc14\uafe8\uc5b4\uc694."} (\uc124\uc815 ${n}\uac1c \ubcc0\uacbd — \uc704 \ubbf8\ub9ac\ubcf4\uae30\uc5d0\uc11c \ud655\uc778\ud558\uc138\uc694.)`,
    aiUndo: "AI \ubcc0\uacbd \ucde8\uc18c",
    aiStop: "\uc911\uc9c0",
    aiStopped: "\uc911\uc9c0\ud588\uc5b4\uc694. \uc774\ubbf8 \ubcf4\ub0b8 AI \uc694\uccad\uc740 \ucde8\uc18c\ud560 \uc218 \uc5c6\uc5b4 \ub05d\uae4c\uc9c0 \uc2e4\ud589\ub418\uace0 \ud06c\ub808\ub527\uc774 \uc4f0\uc77c \uc218 \uc788\uc9c0\ub9cc, \uadf8 \uacb0\uacfc\ub294 \uc801\uc6a9\ud558\uc9c0 \uc54a\uc544\uc694.",
    aiServiceDown: (detail: string) => `\uc9c0\uae08\uc740 Selects\uac00 \ud06c\ub808\ub527\uc6a9 AI \ubaa8\ub378\uc744 \ubc30\uc815\ud558\uc9c0 \ubabb\ud588\uc5b4\uc694 (${detail}). \uc7a0\uc2dc \ud6c4 \ub2e4\uc2dc \uc2dc\ub3c4\ud558\uac70\ub098, \ucc44\ud305\uc5d0\uc11c \uc120\ud0dd\ud55c \ubaa8\ub378\uc744 \ub300\uc2e0 \uc0ac\uc6a9\ud558\uc138\uc694.`,
    aiRetry: "\ub2e4\uc2dc \uc2dc\ub3c4",
    aiUseChatModel: "\ucc44\ud305 \ubaa8\ub378 \uc0ac\uc6a9",
    modeLabel: "\ucc28\ud2b8",
    modeNew: "\uc0c8 \ucc28\ud2b8",
    modeEdit: "\uae30\uc874 \ucc28\ud2b8 \ud3b8\uc9d1",
    add: "\ucc28\ud2b8 \ucd94\uac00",
    adding: "\ucd94\uac00 \uc911…",
    update: "\ucc28\ud2b8 \uc5c5\ub370\uc774\ud2b8",
    updating: "\uc5c5\ub370\uc774\ud2b8 \uc911…",
    addCopy: "\uc0c8 \ucc28\ud2b8\ub85c \ucd94\uac00",
    play: "\uc560\ub2c8\uba54\uc774\uc158 \uc7ac\uc0dd",
    startOver: "\uc0c8\ub85c \uc2dc\uc791",
    startOverTitle: "\uc0c8 \ucc28\ud2b8\ub97c \uc2dc\uc791\ud560\uae4c\uc694?",
    startOverMsg: "\ub370\uc774\ud130\uc640 \uc81c\ubaa9\uc744 \uc9c0\uc6b0\uace0 \ub514\uc790\uc778, \ud14d\uc2a4\ud2b8, \uc560\ub2c8\uba54\uc774\uc158 \uc124\uc815\uc744 \ucd08\uae30\ud654\ud574\uc694.",
    clearData: "\uc9c0\uc6b0\uae30",
    animOff: "\uc560\ub2c8\uba54\uc774\uc158 \ucf1c\uae30",
    pickChart: "\ud3b8\uc9d1\ud560 \ucc28\ud2b8",
    noCharts: "\uc774 \ub4dc\ub798\ud504\ud2b8\uc5d0\ub294 \uc544\uc9c1 Chart Maker \ucc28\ud2b8\uac00 \uc5c6\uc5b4\uc694.",
    refresh: "\ubaa9\ub85d \uc0c8\ub85c\uace0\uce68",
    loading: "\ud30c\uc77c \uc77d\ub294 \uc911…",
    loadingChart: "\ucc28\ud2b8 \ubd88\ub7ec\uc624\ub294 \uc911…",
    needDraft: "\uba3c\uc800 \ub4dc\ub798\ud504\ud2b8\ub97c \uc5f4\uac70\ub098, \ubc30\uce58 \ud0ed\uc5d0\uc11c '\uc0c8 \ub4dc\ub798\ud504\ud2b8'\ub97c \uc120\ud0dd\ud558\uc138\uc694.",
    solidOverVideo: "\uaf49 \ucc2c \ubc30\uacbd\uc774 \ucc28\ud2b8 \uc544\ub798 \uc601\uc0c1\uc744 \uac00\ub824\uc694.",
    seeThrough: "\ubc30\uacbd \ub044\uae30",
    noBackground: "\ubc30\uacbd \uc5c6\uc74c",
    editing: (name: string, at: string) => `${at}\uc758 “${name}” \ud3b8\uc9d1 \uc911. '\ucc28\ud2b8 \uc5c5\ub370\uc774\ud2b8'\ub97c \ub20c\ub7ec \uc801\uc6a9\ud558\uc138\uc694.`,
    summaryNew: (where: string, secs: number, area: string) => `${where} · ${secs}\ucd08 · ${area}`,
    addedTo: (name: string) => `“${name}”\uc5d0 \ucd94\uac00\ud588\uc5b4\uc694.`,
    createdDraft: (name: string) => `“${name}” \ub4dc\ub798\ud504\ud2b8\ub97c \ub9cc\ub4e4\uc5c8\uc5b4\uc694.`,
    updated: "\ucc28\ud2b8\ub97c \uc5c5\ub370\uc774\ud2b8\ud588\uc5b4\uc694.",
    noData: "\uba3c\uc800 \uc22b\uc790 \ub370\uc774\ud130\ub97c \ubd99\uc5ec \ub123\uc5b4 \uc8fc\uc138\uc694.",
    fileTooBig: "\ud30c\uc77c\uc774 1MB\ub97c \ub118\uc5b4\uc694. \ucc28\ud2b8\uc5d0 \uc4f8 \ud589\ub9cc \ub0a8\uaca8 \uc8fc\uc138\uc694.",
    fileType: ".csv, .tsv, .txt \ud30c\uc77c\uc744 \uc120\ud0dd\ud558\uc138\uc694. .xlsx\ub294 \uc140\uc744 \ubcf5\uc0ac\ud574\uc11c \ubd99\uc5ec \ub123\uc5b4 \uc8fc\uc138\uc694.",
    fileFailed: "\ud30c\uc77c\uc744 \uc77d\uc9c0 \ubabb\ud588\uc5b4\uc694.",
    parsed: (c: number, s: number) => `${c}\ud589 · \uacc4\uc5f4 ${s}\uac1c`,
    chartType: "\ucc28\ud2b8 \uc885\ub958",
    types: { bar: "\ub9c9\ub300", hbar: "\uac00\ub85c \ub9c9\ub300", line: "\uaebe\uc740\uc120", pie: "\uc6d0\ud615", donut: "\ub3c4\ub11b" },
    data: "\ub370\uc774\ud130",
    fileTypes: ".csv, .tsv, .txt \ud30c\uc77c\uc744 \uc62c\ub9b4 \uc218 \uc788\uc5b4\uc694 (\uc27c\ud45c·\ud0ed·\uc138\ubbf8\ucf5c\ub860 \uad6c\ubd84, \ucd5c\ub300 1MB). \uc5d1\uc140(.xlsx), Numbers, \uad6c\uae00 \uc2dc\ud2b8\ub294 \uc140\uc744 \ubcf5\uc0ac\ud574\uc11c \uc544\ub798\uc5d0 \ubd99\uc5ec \ub123\uc73c\uc138\uc694.",
    dropLabel: ".csv, .tsv, .txt \ud30c\uc77c\uc744 \ub193\uc73c\uc138\uc694",
    paste: "\uc5d1\uc140, \uc2dc\ud2b8 \ub610\ub294 CSV\uc5d0\uc11c \ubd99\uc5ec \ub123\uae30",
    pastePlaceholder: "\uc6d4\t\uad6c\ub3c5\uc790\n1\uc6d4\t1200\n2\uc6d4\t1850",
    colors: "\uc0c9\uc0c1",
    background: "\ubc30\uacbd\uc0c9",
    colorEach: "\ub9c9\ub300\ub9c8\ub2e4 \ub2e4\ub978 \uc0c9",
    layout: "\ub808\uc774\uc544\uc6c3",
    chartWidth: "\ucc28\ud2b8 \ub108\ube44",
    showGrid: "\uaca9\uc790\uc120",
    showBaseline: "\uae30\uc900\uc120",
    axes: "\ucd95",
    axisLines: "X\ucd95·Y\ucd95 \uc120",
    axisMarks: "\ucd95 \ub208\uae08\uacfc \uc218\uce58",
    axisColor: "\ucd95·\uaca9\uc790 \uc0c9",
    barWidth: "\ub9c9\ub300 \ub108\ube44",
    cornerRadius: "\ubaa8\uc11c\ub9ac \ub465\uae00\uae30",
    lineWidth: "\uc120 \ub450\uaed8",
    showPoints: "\uc810 \ud45c\uc2dc",
    fillArea: "\uc120 \uc544\ub798 \ucc44\uc6b0\uae30",
    donutHole: "\uad6c\uba4d \ud06c\uae30",
    reset: "\ub514\uc790\uc778 \ucd08\uae30\ud654",
    title: "\uc81c\ubaa9",
    titleText: "\uc81c\ubaa9",
    showTitle: "\uc81c\ubaa9 \ud45c\uc2dc",
    font: "\uae00\uaf34",
    size: "\ud06c\uae30",
    weight: "\uad75\uae30",
    color: "\uc0c9",
    weights: { "400": "\ubcf4\ud1b5", "500": "\uc911\uac04", "600": "\uc138\ubbf8\ubcfc\ub4dc", "700": "\ubcfc\ub4dc", "900": "\ube14\ub799" },
    values: "\uc218\uce58",
    showValues: "\uc218\uce58 \ud45c\uc2dc",
    prefix: "\uc55e\uc5d0 \ubd99\uc77c \uae00\uc790 (\uc608: ₩)",
    suffix: "\ub4a4\uc5d0 \ubd99\uc77c \uae00\uc790 (\uc608: \ub9cc, %)",
    decimals: "\uc18c\uc218\uc810",
    auto: "\uc790\ub3d9",
    thousands: "\ucc9c \ub2e8\uc704 \uc27c\ud45c",
    pieValues: "\uc870\uac01 \uc218\uce58",
    pieModes: { percent: "%", value: "\uac12", both: "\ub458 \ub2e4" },
    labels: "\ub77c\ubca8",
    showLabels: "\ub77c\ubca8 \ud45c\uc2dc",
    showLegend: "\ubc94\ub840 \ud45c\uc2dc",
    motion: "\uc560\ub2c8\uba54\uc774\uc158",
    animate: "\ub4f1\uc7a5 \uc560\ub2c8\uba54\uc774\uc158",
    animStyle: "\uc2a4\ud0c0\uc77c",
    animStyles: { draw: "\uadf8\ub9ac\uae30", cascade: "\ud558\ub098\uc529", bounce: "\ubc14\uc6b4\uc2a4", fade: "\ud398\uc774\ub4dc \uc5c5" },
    animStyleHints: {
      draw: "\uc120\uc740 \uc67c\ucabd\uc5d0\uc11c \uc624\ub978\ucabd\uc73c\ub85c \uadf8\ub824\uc9c0\uace0, \ub9c9\ub300\ub294 \ud568\uaed8 \uc790\ub77c\uba70, \uc6d0\ud615\uc740 \ud55c \ubc14\ud034 \ub3cc\uba70 \ucc44\uc6cc\uc838\uc694.",
      cascade: "\ub9c9\ub300, \uc810, \uc870\uac01\uc774 \ud558\ub098\uc529 \ucc28\ub840\ub85c \ub098\ud0c0\ub098\uc694.",
      bounce: "\ud558\ub098\uc529 \ub098\ud0c0\ub098\uba70 \uc0b4\uc9dd \ud280\uc5c8\ub2e4\uac00 \uc790\ub9ac\ub97c \uc7a1\uc544\uc694.",
      fade: "\uc644\uc131\ub41c \ucc28\ud2b8\uac00 \uc0b4\uc9dd \ub5a0\uc624\ub974\uba70 \uc11c\uc11c\ud788 \ub098\ud0c0\ub098\uc694.",
    },
    animSeconds: "\uae38\uc774",
    where: "\uc704\uce58",
    places: { playhead: "\uc601\uc0c1 \uc704", start: "\ub9e8 \uc55e", end: "\ub9e8 \ub4a4", new: "\uc0c8 \ub4dc\ub798\ud504\ud2b8" },
    placeHints: {
      playhead: "\uc7ac\uc0dd \ud5e4\ub4dc\ubd80\ud130 \uc544\ub798 \uae38\uc774\ub9cc\ud07c \uc601\uc0c1 \uc704\uc5d0 \uc62c\ub77c\uac00\uc694.",
      start: "\ub4dc\ub798\ud504\ud2b8\ub97c \ub4a4\ub85c \ubc00\uace0 \ub9e8 \uc55e\uc5d0 \ub123\uc5b4\uc694.",
      end: "\ub4dc\ub798\ud504\ud2b8\uc758 \ub9e8 \ub4a4\uc5d0 \ucd94\uac00\ud574\uc694.",
      new: "\uc774 \ucc28\ud2b8\ub9cc \ub2f4\uae34 \uc0c8 \ub4dc\ub798\ud504\ud2b8\ub97c \ub9cc\ub4e4\uc5b4\uc694.",
    },
    canvas: "\ud654\uba74 \ube44\uc728",
    duration: "\uae38\uc774",
    editPlaceNote: "\uc704\uce58\uc640 \uae38\uc774\ub294 \uc0c8 \ucc28\ud2b8\uc5d0\ub9cc \uc801\uc6a9\ub3fc\uc694. \uae30\uc874 \ucc28\ud2b8 \uae38\uc774\ub294 \ud0c0\uc784\ub77c\uc778\uc5d0\uc11c \ud074\ub9bd\uc744 \uc798\ub77c \uc870\uc815\ud558\uc138\uc694.",
    onScreen: "\ud654\uba74 \ubc30\uce58",
    screenPos: "\uc704\uce58",
    areas: {
      full: "\uc804\uccb4 \ud654\uba74", center: "\uac00\uc6b4\ub370", left: "\uc67c\ucabd \uc808\ubc18", right: "\uc624\ub978\ucabd \uc808\ubc18", top: "\uc704\ucabd \uc808\ubc18", bottom: "\uc544\ub798\ucabd \uc808\ubc18",
      topLeft: "\uc67c\ucabd \uc704", topRight: "\uc624\ub978\ucabd \uc704", bottomLeft: "\uc67c\ucabd \uc544\ub798", bottomRight: "\uc624\ub978\ucabd \uc544\ub798",
    },
    bgOn: "\ubc30\uacbd",
    bgOnHint: "\ucc28\ud2b8 \uc544\ub798\uc5d0 \ubcc4\ub3c4 \ud074\ub9bd\uc73c\ub85c \ucd94\uac00\ub3fc\uc694. \ub044\uba74 \ucc28\ud2b8\uac00 \uc601\uc0c1 \uc704\uc5d0 \ubc14\ub85c \uc62c\ub77c\uac00\uc694.",
    bgStyle: "\uc2a4\ud0c0\uc77c",
    bgStyles: { solid: "\uc804\uccb4 \ud654\uba74", card: "\uce74\ub4dc" },
    bgStyleHints: {
      solid: "\ucc28\ud2b8 \ub4a4 \ud654\uba74 \uc804\uccb4\ub97c \ucc44\uc6cc\uc694.",
      card: "\ucc28\ud2b8 \uc601\uc5ed \ub4a4\uc5d0\ub9cc \ud328\ub110\uc744 \uae54\uace0, \uc8fc\ubcc0\uc73c\ub85c \uc601\uc0c1\uc774 \ubcf4\uc5ec\uc694.",
    },
    bgRadius: "\uce74\ub4dc \ubaa8\uc11c\ub9ac",
    textOutline: "\ud14d\uc2a4\ud2b8 \uc678\uacfd\uc120",
    textOutlineHint: "\ubcf5\uc7a1\ud55c \uc601\uc0c1 \uc704\uc5d0\uc11c\ub3c4 \uc798 \ubcf4\uc774\ub3c4\ub85d \uae00\uc790\uc5d0 \uc587\uc740 \uc5b4\ub450\uc6b4 \ud14c\ub450\ub9ac\ub97c \ub123\uc5b4\uc694.",
    language: "\uc5b8\uc5b4",
    langAuto: "Selects\uc640 \uac19\uac8c",
    langEn: "English",
    langKo: "\ud55c\uad6d\uc5b4",
    source: "\ucd9c\ucc98",
    sourceText: "\ucd9c\ucc98 \ubb38\uad6c",
    sourcePlaceholder: "\uc608: \ucd9c\ucc98: \ud1b5\uacc4\uccad, 2026",
    sourceHint: "\ucc28\ud2b8 \uc544\ub798\uc5d0 \uc791\uc740 \uae00\uc528\ub85c \ud45c\uc2dc\ub3fc\uc694. \ube44\uc6cc \ub450\uba74 \uc228\uaca8\uc838\uc694.",
    align: "\uc815\ub82c",
    aligns: { left: "\uc67c\ucabd", center: "\uac00\uc6b4\ub370", right: "\uc624\ub978\ucabd" },
    cutWarn: (rows: number, from: string, to: string, series: string[]) => {
      const parts: string[] = [];
      if (rows > 0) parts.push(`${rows}\ud589 (${from === to ? from : from + "~" + to})`);
      if (series.length) parts.push(`\uacc4\uc5f4 ${series.length}\uac1c (${series.join(", ")})`);
      return `\ucc28\ud2b8\uc5d0\ub294 \ucd5c\ub300 60\ud589, \uacc4\uc5f4 6\uac1c\uae4c\uc9c0 \ub4e4\uc5b4\uac00\uc11c ${parts.join(", ")}\uc774(\uac00) \ube60\uc84c\uc5b4\uc694. \ube60\uc9c4 \ubd80\ubd84\uae4c\uc9c0 \ub123\uc73c\ub824\uba74 \ud589\uc774\ub098 \uc5f4\uc744 \uc904\uc5ec\uc11c \ubd99\uc5ec \ub123\uc5b4 \uc8fc\uc138\uc694.`;
    },
    styles: "\uc800\uc7a5\ud55c \uc2a4\ud0c0\uc77c",
    stylesHint: "\uc2a4\ud0c0\uc77c\uc5d0\ub294 \uc0c9\uc0c1, \uae00\uaf34, \ud06c\uae30, \ubc30\uacbd, \uc560\ub2c8\uba54\uc774\uc158\uc774 \uc800\uc7a5\ub3fc\uc694. \ub370\uc774\ud130, \uc81c\ubaa9, \uc704\uce58\ub294 \uadf8\ub300\ub85c\uc608\uc694.",
    stylePick: "\uc2a4\ud0c0\uc77c",
    stylePlaceholder: "\uc2a4\ud0c0\uc77c \uc120\ud0dd",
    noStyles: "\uc544\uc9c1 \uc800\uc7a5\ud55c \uc2a4\ud0c0\uc77c\uc774 \uc5c6\uc5b4\uc694. \ub514\uc790\uc778\uc744 \ub9de\ucd98 \ub4a4 \uc5ec\uae30\uc11c \uc800\uc7a5\ud558\uc138\uc694.",
    styleName: "\uc2a4\ud0c0\uc77c \uc774\ub984",
    styleNamePlaceholder: "\uc608: \uc6b0\ub9ac \ube0c\ub79c\ub4dc",
    styleSave: "\uc2a4\ud0c0\uc77c \uc800\uc7a5",
    styleSaved: (n: string) => `“${n}” \uc2a4\ud0c0\uc77c\uc744 \uc800\uc7a5\ud588\uc5b4\uc694.`,
    styleApplied: (n: string) => `“${n}” \uc2a4\ud0c0\uc77c\uc744 \uc801\uc6a9\ud588\uc5b4\uc694.`,
    styleUndo: "\ub418\ub3cc\ub9ac\uae30",
    styleDelete: "\uc0ad\uc81c",
    styleDeleteTitle: (n: string) => `“${n}” \uc2a4\ud0c0\uc77c\uc744 \uc0ad\uc81c\ud560\uae4c\uc694?`,
    styleDeleteMsg: "\ub4dc\ub798\ud504\ud2b8\uc5d0 \uc774\ubbf8 \ub123\uc740 \ucc28\ud2b8\ub294 \uadf8\ub300\ub85c\uc608\uc694.",
    styleReplaceTitle: (n: string) => `“${n}” \uc2a4\ud0c0\uc77c\uc744 \ubc14\uafc0\uae4c\uc694?`,
    styleReplaceMsg: "\uac19\uc740 \uc774\ub984\uc758 \uc2a4\ud0c0\uc77c\uc774 \uc788\uc5b4\uc694. \uc9c0\uae08 \ub514\uc790\uc778\uc73c\ub85c \ubc14\uafc0\uae4c\uc694?",
    styleReplace: "\ubc14\uafb8\uae30",
    styleSaveFailed: "\uc2a4\ud0c0\uc77c\uc744 \uc800\uc7a5\ud558\uc9c0 \ubabb\ud588\uc5b4\uc694. \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.",
    highlight: "\uac15\uc870",
    highlightNone: "\uc5c6\uc74c",
    highlightColor: "\uac15\uc870 \uc0c9\uc0c1",
    dimColor: "\ub098\uba38\uc9c0 \uc0c9\uc0c1",
    highlightHint: "\ub9c9\ub300\ub098 \uc870\uac01 \ud558\ub098\ub9cc \uac15\uc870 \uc0c9\uc0c1\uc73c\ub85c \ub208\uc5d0 \ub744\uac8c \ud558\uace0, \ub098\uba38\uc9c0\ub294 \ub450 \ubc88\uc9f8 \uc0c9\uc0c1\uc73c\ub85c \uce60\ud574\uc694.",
    highlightHintMulti: "\uac15\uc870\ud55c \uadf8\ub8f9\uc740 \uc6d0\ub798 \uc0c9\uc744 \uc720\uc9c0\ud558\uace0, \ub098\uba38\uc9c0\ub294 \ubc30\uacbd\uc0c9 \ucabd\uc73c\ub85c \ud750\ub824\uc838\uc694.",
    msgEmpty: "\ub370\uc774\ud130\ub97c \ubd99\uc5ec \ub123\uac70\ub098 CSV\ub97c \ubd88\ub7ec\uc624\uba74 \ucc28\ud2b8\uac00 \ub9cc\ub4e4\uc5b4\uc838\uc694",
    msgNoNumbers: "\uc22b\uc790\ub97c \ucc3e\uc9c0 \ubabb\ud588\uc5b4\uc694",
    msgPie: "\uc6d0\ud615 \ucc28\ud2b8\uc5d0\ub294 \uc591\uc218\uac00 \ud544\uc694\ud574\uc694",
  },
};

const DEFAULT_COLORS = ["#FFFFFF", "#7C9CFF", "#FF8A65", "#4DD0A1", "#FFD54F", "#BA68C8"];

const DEFAULTS: Record<string, any> = {
  data: "Month\tSubscribers\nJan\t1200\nFeb\t1850\nMar\t2400\nApr\t3100",
  chartType: "bar",
  title: "Monthly subscribers",
  showTitle: true,
  fontFamily: "",
  titleSize: 7,
  titleWeight: "700",
  showValues: true,
  valueSize: 4.5,
  valuePrefix: "",
  valueSuffix: "",
  decimals: "auto",
  thousands: true,
  pieValues: "percent",
  showLabels: true,
  labelSize: 4,
  showLegend: true,
  background: "#111214",
  bgOn: true,        // a separate background clip under the chart
  bgStyle: "solid",  // solid: full frame; card: behind the chart's area only
  bgRadius: 3,
  textOutline: false,
  source: "",
  sourceAlign: "left",
  sourceSize: 2.6,
  linkId: "",        // pairs a chart clip with its background clip
  area: "full",
  titleColor: "#FFFFFF",
  valueColor: "#FFFFFF",
  labelColor: "#FFFFFF",
  axisColor: "#FFFFFF",
  color1: DEFAULT_COLORS[0],
  color2: DEFAULT_COLORS[1],
  color3: DEFAULT_COLORS[2],
  color4: DEFAULT_COLORS[3],
  color5: DEFAULT_COLORS[4],
  color6: DEFAULT_COLORS[5],
  colorEach: false,
  highlight: "",          // the label of the one bar or slice to stand out; "" for none
  highlightColor: "#FFD54F",
  dimColor: "#5C616B",    // the rest, when one is highlighted (single series and pies)
  showGrid: false,
  showBaseline: true,
  axisLines: false,
  axisMarks: false,
  barWidth: 55,
  cornerRadius: 0,
  lineWidth: 6,
  showPoints: true,
  fillArea: false,
  donutHole: 55,
  chartWidth: 70,
  animate: false,
  animStyle: "draw",
  animSeconds: 1.5,
};

// Design-only keys: what "Reset design" restores (data, title and placement stay).
const DESIGN_KEYS = [
  "background", "titleColor", "valueColor", "labelColor", "axisColor", "color1", "color2", "color3", "color4", "color5", "color6",
  "colorEach", "showGrid", "showBaseline", "barWidth", "cornerRadius", "lineWidth", "showPoints", "fillArea", "donutHole", "chartWidth",
  "highlight", "highlightColor", "dimColor",
];

// What a saved style keeps: the look, not the data, title, source text or position.
const STYLE_KEYS = [
  "background", "titleColor", "valueColor", "labelColor", "axisColor", "color1", "color2", "color3", "color4", "color5", "color6",
  "colorEach", "highlightColor", "dimColor", "showGrid", "showBaseline", "axisLines", "axisMarks", "barWidth", "cornerRadius",
  "lineWidth", "showPoints", "fillArea", "donutHole", "chartWidth", "fontFamily", "showTitle", "titleSize", "titleWeight",
  "showValues", "valueSize", "thousands", "decimals", "pieValues", "showLabels", "labelSize", "showLegend",
  "bgOn", "bgStyle", "bgRadius", "textOutline", "sourceAlign", "sourceSize", "animate", "animStyle", "animSeconds",
];
const STYLES_KEY = "styles.v1";

// Shared chart renderer. Its source is embedded into the graphic clip, so it
// must stay self-contained (no imports, no outer variables). Every size the
// user sets is a maximum: text and bars shrink, rotate, spread out or thin out
// so nothing overlaps, whatever the data.
function chartKit() {
  var DEF = ["#FFFFFF", "#7C9CFF", "#FF8A65", "#4DD0A1", "#FFD54F", "#BA68C8"];
  function num(s: any): number {
    var t = String(s == null ? "" : s).trim();
    if (!t) return NaN;
    var neg = false;
    if (/^\(.*\)$/.test(t)) { neg = true; t = t.slice(1, -1); }
    t = t.replace(/[\s$€£¥₩%]/g, "");
    var mult = 1;
    var m = t.match(/^(-?[\d.,]+)([kKmMbB])$/);
    if (m) { t = m[1]; var k = m[2].toLowerCase(); mult = k === "k" ? 1e3 : k === "m" ? 1e6 : 1e9; }
    if (t.indexOf(",") >= 0 && t.indexOf(".") >= 0) {
      if (t.lastIndexOf(",") > t.lastIndexOf(".")) t = t.replace(/\./g, "").replace(",", ".");
      else t = t.replace(/,/g, "");
    } else if (t.indexOf(",") >= 0) {
      if (/^-?\d{1,3}(,\d{3})+$/.test(t)) t = t.replace(/,/g, "");
      else t = t.replace(",", ".");
    }
    if (!/^-?(\d+\.?\d*|\.\d+)$/.test(t)) return NaN;
    var v = parseFloat(t) * mult;
    return neg ? -v : v;
  }
  function pair(s: any): any {
    var m = String(s).trim().match(/^(.*?\S)\s*(?:[:=]\s*|\s+)(\S+)$/);
    if (!m) return null;
    var v = num(m[2]);
    if (!isFinite(v) || isFinite(num(m[1]))) return null;
    return { label: m[1].replace(/[:=]$/, "").trim(), value: v };
  }
  function rowsOf(text: string, delim: string): string[][] {
    var rows: string[][] = [], row: string[] = [], cell = "", q = false, i, c;
    for (i = 0; i < text.length; i++) {
      c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"' && cell.trim() === "") { q = true; cell = ""; }
      else if (c === delim) { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); rows.push(row); row = []; cell = "";
      } else cell += c;
    }
    row.push(cell); rows.push(row);
    return rows
      .map(function (r) { return r.map(function (x) { return x.trim(); }); })
      .filter(function (r) { return r.some(function (x) { return x !== ""; }); });
  }
  function pickDelim(text: string): string {
    var head = text.split(/\r?\n/).filter(function (l) { return l.trim() !== ""; }).slice(0, 5).join("\n");
    if (head.indexOf("\t") >= 0) return "\t";
    var semi = (head.match(/;/g) || []).length;
    var comma = (head.match(/,/g) || []).length;
    if (semi > 0 && semi >= comma) return ";";
    if (comma > 0 && head.replace(/"[^"]*"/g, "").replace(/\d,\d/g, "").indexOf(",") >= 0) return ",";
    return "\u0000";
  }
  function parse(text: any): any {
    text = String(text || "").replace(/^﻿/, "");
    var empty = { labels: [], series: [], error: "" };
    if (!text.trim()) return empty;
    if (text.indexOf("\t") < 0) {
      var toks = text.split(/\s*(?:,\s+|;|\r?\n)\s*/).filter(function (x: string) { return x.trim() !== ""; });
      var pairs = toks.map(pair);
      if (toks.length > 0 && pairs.every(function (x: any) { return x; })) {
        return {
          labels: pairs.map(function (x: any) { return x.label; }),
          series: [{ name: "Value", values: pairs.map(function (x: any) { return x.value; }) }], error: "",
        };
      }
    }
    var rows = rowsOf(text, pickDelim(text));
    if (!rows.length) return empty;
    var ncol = 0;
    rows.forEach(function (r) { ncol = Math.max(ncol, r.length); });
    if (ncol < 2) {
      var ps = rows.map(function (r) { return pair(r[0]); }).filter(function (x) { return x; });
      if (!ps.length) return { labels: [], series: [], error: "No numbers found" };
      return {
        labels: ps.map(function (x) { return x.label; }),
        series: [{ name: "Value", values: ps.map(function (x) { return x.value; }) }], error: "",
      };
    }
    var head = rows[0];
    var hasHeader = head.slice(1).some(function (x) { return x !== "" && isNaN(num(x)); });
    var body = hasHeader ? rows.slice(1) : rows;
    var allNum = body.length > 0 && body.every(function (r) {
      return r.every(function (x) { return x === "" || !isNaN(num(x)); });
    });
    if (hasHeader && allNum && isNaN(num(head[0])) && ncol > body.length + 1) {
      var tCut = { rows: Math.max(0, head.length - 60), from: String(head[60] || ""), to: String(head[head.length - 1] || ""),
        series: body.slice(6).map(function (_r, i) { return "Series " + (i + 7); }) };
      return {
        labels: head.slice(0, 60),
        series: body.slice(0, 6).map(function (r, i) {
          return { name: "Series " + (i + 1), values: head.slice(0, 60).map(function (_x, k) { return num(r[k]); }) };
        }), error: "", cut: tCut,
      };
    }
    // A chart takes up to 60 rows and 6 series; what is left out is reported, not hidden.
    var cut = { rows: Math.max(0, body.length - 60), from: String((body[60] || [])[0] || ""), to: String((body[body.length - 1] || [])[0] || ""), series: [] as string[] };
    body = body.slice(0, 60);
    var series: any[] = [];
    for (var c = 1; c < ncol; c++) {
      var vals = body.map(function (r) { return num(r[c]); });
      if (vals.some(function (v) { return isFinite(v); })) {
        var sName = hasHeader && head[c] ? head[c] : "Series " + c;
        if (series.length < 6) series.push({ name: sName, values: vals });
        else cut.series.push(sName);
      }
    }
    if (!series.length) return { labels: [], series: [], error: "No numbers found" };
    return { labels: body.map(function (r) { return r[0] || ""; }), series: series, error: "", cut: cut };
  }
  function esc(s: any): string {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function nv(v: any, d: number): number { v = Number(v); return isFinite(v) ? v : d; }
  function bv(v: any, d: boolean): boolean { return typeof v === "boolean" ? v : d; }
  function col(v: any, d: string): string { return /^#[0-9a-fA-F]{3,8}$/.test(String(v || "")) ? String(v) : d; }
  function f1(x: number): string { return (Math.round(x * 10) / 10).toString(); }
  function niceStep(raw: number): number {
    if (!(raw > 0)) return 1;
    var e = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var f = raw / e;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e;
  }
  function arc(cx: number, cy: number, r: number, h: number, a0: number, a1: number): string {
    var large = a1 - a0 > Math.PI ? 1 : 0;
    function pt(rr: number, a: number) { return f1(cx + rr * Math.cos(a)) + " " + f1(cy + rr * Math.sin(a)); }
    if (h > 0) {
      return "M" + pt(r, a0) + " A" + f1(r) + " " + f1(r) + " 0 " + large + " 1 " + pt(r, a1) +
        " L" + pt(h, a1) + " A" + f1(h) + " " + f1(h) + " 0 " + large + " 0 " + pt(h, a0) + " Z";
    }
    return "M" + f1(cx) + " " + f1(cy) + " L" + pt(r, a0) + " A" + f1(r) + " " + f1(r) + " 0 " + large + " 1 " + pt(r, a1) + " Z";
  }
  function clamp01(x: number): number { return Math.max(0, Math.min(1, x)); }
  function easeOutCubic(x: number): number { return 1 - Math.pow(1 - x, 3); }
  function easeInOutCubic(x: number): number { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function easeOutBack(x: number): number { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
  // Width estimate when the host cannot measure text.
  function estimate(s: string, size: number, weight: any): number {
    var w = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (c === " ") w += 0.28;
      else if (/[0-9]/.test(c)) w += 0.58;
      else if (/[.,:;'!|ilIjtf]/.test(c)) w += 0.3;
      else if (/[mwMW]/.test(c)) w += 0.86;
      else if (/[A-Z]/.test(c)) w += 0.68;
      else w += 0.54;
    }
    return w * size * (Number(weight) >= 600 ? 1.08 : 1);
  }
  // Draws the chart into a W x H box. env: { uFull, H (frame height), bgMode }.
  function chartBody(d: any, W: number, H: number, p: any, measure: any, env: any): string {
    d = d || {};
    var P = p == null ? 1 : clamp01(p);
    // Animation styles: draw (everything grows together), cascade (one item
    // after another), bounce (one after another with overshoot), fade (the
    // finished chart fades and rises in).
    var animStyle = String(d.animStyle || "draw");
    function itemP(i: number, n: number): number {
      if (P >= 1 || animStyle === "fade") return 1;
      if (animStyle === "draw") return easeOutCubic(P);
      var win = animStyle === "bounce" ? 0.55 : 0.45;
      var st = n > 1 ? (1 - win) / (n - 1) : 0;
      var lp = clamp01((P - i * st) / win);
      return animStyle === "bounce" ? easeOutBack(lp) : easeOutCubic(lp);
    }
    // Lines finish drawing at 80% of the time; the last stretch lets the
    // numbers at the final points count up instead of popping in.
    var HEAD_END = 0.8;
    function headP(): number {
      if (P >= 1 || animStyle === "fade") return 1;
      var q = Math.min(1, P / HEAD_END);
      if (animStyle === "cascade") return q;
      if (animStyle === "bounce") return easeOutCubic(q);
      return 0.5 - Math.cos(Math.PI * q) / 2;
    }
    // When (0..1 of the animation) the drawing head reaches fraction h of the line.
    function reachP(h: number): number {
      if (animStyle === "fade") return 0;
      var hq = clamp01(h), q: number;
      if (animStyle === "cascade") q = hq;
      else if (animStyle === "bounce") q = 1 - Math.cbrt(1 - hq);
      else q = Math.acos(1 - 2 * hq) / Math.PI;
      return HEAD_END * q;
    }
    var fadeA = animStyle === "fade" && P < 1 ? easeOutCubic(P) : 1;
    var t = parse(d.data);
    var u = Math.min(W, H) / 100;
    // Text keeps a readable size even when the chart sits in a small box.
    var ut = Math.max(u, env.uFull * 0.7);
    var floorT = ut * 2.2; // smallest text a viewer can read in a video
    var bgMode = String(env.bgMode || "solid");
    var type = String(d.chartType || "bar");
    var bg = col(d.background, "#111214");
    var tc = col(d.titleColor, "#FFFFFF"), vc = col(d.valueColor, "#FFFFFF");
    var lc = col(d.labelColor, "#FFFFFF"), ac = col(d.axisColor, "#FFFFFF");
    var pal = [d.color1, d.color2, d.color3, d.color4, d.color5, d.color6].map(function (c: any, i: number) { return col(c, DEF[i]); });
    var fam = String(d.fontFamily || "").replace(/["'<>;&]/g, "").trim();
    var font = (fam ? "'" + fam + "', " : "") + "Inter, 'Helvetica Neue', Helvetica, Arial, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";
    function mw(s: any, size: number, weight: any): number {
      s = String(s);
      if (!s) return 0;
      if (typeof measure === "function") {
        var m = measure(s, size, weight || 400, font);
        if (m > 0) return m;
      }
      return estimate(s, size, weight || 400);
    }
    function txt(x: number, y: number, s: any, size: number, fill: string, o: any): string {
      var a = '<text x="' + f1(x) + '" y="' + f1(y) + '" font-size="' + f1(size) + '" fill="' + fill +
        '" text-anchor="' + (o.anchor || "middle") + '" font-weight="' + esc(o.weight || 400) + '"';
      if (o.maxW > 0 && mw(s, size, o.weight) > o.maxW) a += ' textLength="' + f1(o.maxW) + '" lengthAdjust="spacingAndGlyphs"';
      if (o.rot) a += ' transform="rotate(' + o.rot + " " + f1(x) + " " + f1(y) + ')"';
      if (o.opacity != null) a += ' opacity="' + o.opacity + '"';
      // Optional outline for text over busy video: a vector stroke under the fill, so it stays sharp.
      if (bv(d.textOutline, false)) a += ' stroke="rgba(0,0,0,0.65)" stroke-width="' + f1(Math.max(1, size * 0.1)) + '" stroke-linejoin="round" paint-order="stroke"';
      return a + ">" + esc(s) + "</text>";
    }
    function rect(x: number, y: number, w: number, h: number, r: number, fill: string): string {
      return '<rect x="' + f1(x) + '" y="' + f1(y) + '" width="' + f1(Math.max(0, w)) + '" height="' + f1(Math.max(0, h)) +
        '" rx="' + f1(Math.max(0, Math.min(r, w / 2, h / 2))) + '" fill="' + fill + '"/>';
    }
    function line(x1: number, y1: number, x2: number, y2: number, stroke: string, w: number, op: any): string {
      return '<line x1="' + f1(x1) + '" y1="' + f1(y1) + '" x2="' + f1(x2) + '" y2="' + f1(y2) + '" stroke="' + stroke +
        '" stroke-width="' + f1(w) + '"' + (op != null ? ' stroke-opacity="' + op + '"' : "") + "/>";
    }
    var o: string[] = [];
    function finish(): string {
      var body = o.join("");
      if (fadeA < 1) body = '<g opacity="' + fadeA.toFixed(3) + '" transform="translate(0 ' + f1((1 - fadeA) * u * 4) + ')">' + body + "</g>";
      return body;
    }
    // The solid background is drawn by svg() across the whole frame; a card sits behind this box only.
    if (bgMode === "card") o.push('<rect width="' + f1(W) + '" height="' + f1(H) + '" rx="' + f1(u * Math.max(0, nv(d.bgRadius, 3))) + '" fill="' + bg + '"/>');
    // No data yet: an empty frame with a quiet hint, no leftover title.
    if (!t.series.length || !t.labels.length) {
      o.push(txt(W / 2, H / 2, t.error ? (d.msgNoNumbers || t.error) : (d.msgEmpty || "Paste data or load a CSV to make a chart"), 3 * ut, lc, { weight: 500, opacity: 0.45, maxW: W * 0.9 }));
      return finish();
    }
    var pad = H * 0.07, side = W * 0.04, top = pad;
    if (bv(d.showTitle, true) && String(d.title || "").trim()) {
      var tw8 = d.titleWeight || 700, ts = Math.max(0.5, nv(d.titleSize, 7)) * ut, tmax = W - side * 2;
      var tw0 = mw(d.title, ts, tw8);
      if (tw0 > tmax) ts = Math.max(ut * 2.5, ts * tmax / tw0);
      o.push(txt(W / 2, top + ts * 0.8, d.title, ts, tc, { weight: tw8, maxW: tmax }));
      top += ts * 1.25 + u * 2;
    }
    var vs = Math.max(0.5, nv(d.valueSize, 4.5)) * ut, ls = Math.max(0.5, nv(d.labelSize, 4)) * ut;
    var showV = bv(d.showValues, true), showL = bv(d.showLabels, true), grid = bv(d.showGrid, false);
    var ns = t.series.length, nc = t.labels.length;
    if (!ns || !nc) {
      o.push(txt(W / 2, (top + H) / 2, t.error || "Paste data to make a chart", 4 * ut, lc, { weight: 500, opacity: 0.6 }));
      return finish();
    }
    var dec: any = d.decimals;
    if (dec === "auto" || dec == null || dec === "") {
      dec = 0;
      t.series.forEach(function (s: any) {
        s.values.forEach(function (v: number) {
          if (isFinite(v) && Math.abs(v % 1) > 1e-9) {
            var str = String(Math.abs(v)), i = str.indexOf(".");
            dec = Math.max(dec, Math.min(2, i < 0 ? 0 : str.length - i - 1));
          }
        });
      });
    } else dec = Math.max(0, Math.min(4, Math.round(nv(dec, 0))));
    var thou = bv(d.thousands, true), pre = String(d.valuePrefix || ""), suf = String(d.valueSuffix || "");
    function fmtN(v: number, dd: number): string {
      var s = Math.abs(v).toFixed(dd), parts = s.split(".");
      if (thou) parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      return (v < 0 ? "-" : "") + pre + parts.join(".") + suf;
    }
    function fmt(v: number): string { return fmtN(v, dec); }
    var cw = Math.max(20, Math.min(100, nv(d.chartWidth, 70))) / 100;
    // In a half-screen or corner box the side margins shrink, so the chart uses its box.
    if (env.boxed) cw = 1 - (1 - cw) * 0.35;
    var L0 = W * (1 - cw) / 2, R0 = W - L0, B = H - pad;
    // Source line: a small line under the chart; the chart shrinks to make room.
    var srcText = String(d.source || "").trim();
    if (srcText) {
      var ss = Math.max(floorT * 0.8, Math.max(0.5, nv(d.sourceSize, 2.6)) * ut);
      var sAlign = String(d.sourceAlign || "left");
      var sx = sAlign === "right" ? R0 : sAlign === "center" ? W / 2 : L0;
      var sAnchor = sAlign === "right" ? "end" : sAlign === "center" ? "middle" : "start";
      o.push(txt(sx, H - pad * 0.5, srcText, ss, lc, { anchor: sAnchor, weight: 400, opacity: 0.75, maxW: W - side * 2 }));
      B -= ss * 1.3;
    }
    var gw = Math.max(1, u * 0.15), bw0 = Math.max(1, u * 0.3);
    var barPct = Math.max(5, Math.min(100, nv(d.barWidth, 55))) / 100;
    var radius = Math.max(0, nv(d.cornerRadius, 0)) * u;
    var showBase = bv(d.showBaseline, true);
    function hexRgb(h: string): number[] {
      var s = h.replace("#", "");
      if (s.length <= 4) s = s.split("").map(function (c) { return c + c; }).join("");
      return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
    }
    // Colour for the i-th bar or slice: past the sixth, the palette repeats
    // mixed toward the background so neighbours stay distinct.
    function pc(i: number): string {
      var base = pal[i % 6], round = Math.floor(i / 6);
      if (!round) return base;
      var a = hexRgb(base), b = hexRgb(bg), k = Math.min(0.7, 0.38 * round);
      return "rgb(" + a.map(function (x, j) { return Math.round(x + (b[j] - x) * k); }).join(",") + ")";
    }
    // Highlight: one bar or slice, picked by its label, stands out; the rest
    // take the second colour (one series, pies) or fade toward the background.
    var hlLabel = String(d.highlight || "").trim(), hlIdx = -1;
    if (hlLabel === "__none__") hlLabel = ""; // the menus' "None" item (a select item cannot use "")
    if (hlLabel && type !== "line") for (var hi = 0; hi < nc; hi++) if (String(t.labels[hi]).trim() === hlLabel) { hlIdx = hi; break; }
    var hlC = col(d.highlightColor, "#FFD54F"), dimC = col(d.dimColor, "#5C616B");
    function fade(c: string): string {
      if (!/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(c) || !/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(bg)) return c;
      var a = hexRgb(c), b = hexRgb(bg);
      return "rgb(" + a.map(function (x, j) { return Math.round(x + (b[j] - x) * 0.6); }).join(",") + ")";
    }
    function colorOf(si: number, ci: number): string {
      if (hlIdx >= 0) return ns > 1 ? (ci === hlIdx ? pal[si % 6] : fade(pal[si % 6])) : (ci === hlIdx ? hlC : dimC);
      return ns > 1 ? pal[si % 6] : bv(d.colorEach, false) ? pc(ci) : pal[0];
    }
    function sliceColor(i: number): string { return hlIdx >= 0 ? (i === hlIdx ? hlC : dimC) : pc(i); }

    // ---- Pie and donut -------------------------------------------------
    if (type === "pie" || type === "donut") {
      var vals = t.series[0].values.map(function (v: number) { return isFinite(v) && v > 0 ? v : 0; });
      var total = vals.reduce(function (a: number, b: number) { return a + b; }, 0);
      if (!(total > 0)) {
        o.push(txt(W / 2, (top + H) / 2, d.msgPie || "Pie charts need positive numbers", 4 * ut, lc, { weight: 500, opacity: 0.6 }));
        return finish();
      }
      if (ns > 1) {
        var sub = Math.max(floorT, ls * 0.9);
        o.push(txt(W / 2, top + sub * 0.7, t.series[0].name, sub, lc, { weight: 500, opacity: 0.8, maxW: W - side * 2 }));
        top += sub * 1.6;
      }
      var T = top + u, ph = B - T, pw = R0 - L0;
      var cols = 1, rows = nc, lsz = ls;
      if (showL) {
        lsz = Math.min(ls, ph / (nc * 1.7));
        if (lsz < floorT && nc > 1) { cols = 2; rows = Math.ceil(nc / 2); lsz = Math.min(ls, ph / (rows * 1.7)); }
        if (lsz < floorT && nc > 2) { cols = 3; rows = Math.ceil(nc / 3); lsz = Math.min(ls, ph / (rows * 1.7)); }
      }
      var sq = lsz * 0.85, labMax = 0;
      t.labels.forEach(function (l: string) { labMax = Math.max(labMax, mw(l, lsz, 500)); });
      var colGap = u * 3, itemExtra = sq + u * 1.2;
      var legW = showL ? cols * (labMax + itemExtra) + (cols - 1) * colGap : 0;
      var legCap = pw * 0.55;
      var labFit = labMax;
      if (legW > legCap) {
        labFit = Math.max(u * 4, (legCap - (cols - 1) * colGap) / cols - itemExtra);
        if (labMax > 0) { var sc = Math.max(floorT / lsz, labFit / labMax); if (sc < 1) { lsz *= sc; sq = lsz * 0.85; itemExtra = sq + u * 1.2; } }
        legW = legCap;
      }
      var gapP = showL ? u * 5 : 0;
      var r = Math.min(ph / 2, (pw - legW - gapP) / 2) * 0.96;
      var blockW = 2 * r + gapP + legW, x0 = (W - blockW) / 2;
      var cx = x0 + r, cy = T + ph / 2;
      var hole = type === "donut" ? r * Math.max(10, Math.min(90, nv(d.donutHole, 55))) / 100 : 0;
      var a = -Math.PI / 2, mode = String(d.pieValues || "percent");
      var vsz = Math.min(vs, hole > 0 ? (r - hole) * 0.42 : r * 0.17);
      var swept = animStyle === "draw" && P < 1 ? Math.PI * 2 * easeInOutCubic(P) : Math.PI * 2;
      var radial = animStyle === "cascade" || animStyle === "bounce";
      for (var i = 0; i < nc; i++) {
        var full = vals[i] / total * Math.PI * 2;
        if (full <= 0) continue;
        var a0 = a, rel0 = a0 + Math.PI / 2;
        a += full;
        var sw = Math.min(full, swept - rel0);
        var rk = radial ? itemP(i, nc) : 1;
        if (sw <= 0 || rk <= 0) continue;
        o.push('<path d="' + arc(cx, cy, r * rk, hole * rk, a0, a0 + Math.min(sw, Math.PI * 2 - 1e-4)) + '" fill="' + sliceColor(i) + '" stroke="' + (bgMode === "none" ? "rgba(0,0,0,0.35)" : bg) + '" stroke-width="' + f1(bw0) + '"/>');
        var labOp = radial ? clamp01((rk - 0.6) / 0.4) : clamp01((swept - (rel0 + full / 2)) / (full / 2 + 0.25));
        if (showV && labOp > 0 && vsz >= floorT * 0.9) {
          var mid = a0 + full / 2, rr = hole > 0 ? (r + hole) / 2 : r * 0.64;
          var cnt = animStyle === "fade" ? fadeA : labOp >= 1 ? 1 : easeOutCubic(labOp);
          var pctF = Math.round(vals[i] / total * 1000) / 10;
          var pct = cnt >= 1 ? pctF : Math.round(pctF * cnt * 10) / 10;
          var lbl = mode === "value" ? fmt(vals[i] * cnt) : mode === "both" ? fmt(vals[i] * cnt) + " · " + pct + "%" : pct + "%";
          var lblFull = mode === "value" ? fmt(vals[i]) : mode === "both" ? fmt(vals[i]) + " · " + pctF + "%" : pctF + "%";
          var room = Math.min(full, Math.PI) * rr * 0.9;
          if (mw(lblFull, vsz, 700) <= room && (full * rr) >= vsz * 1.2) {
            o.push(txt(cx + rr * Math.cos(mid), cy + rr * Math.sin(mid) + vsz * 0.35, lbl, vsz, vc, { weight: 700, opacity: labOp < 1 ? labOp.toFixed(3) : null }));
          }
        }
      }
      if (showL) {
        var rowH = lsz * 1.7, lx0 = x0 + 2 * r + gapP, colW = (legW - (cols - 1) * colGap) / cols;
        var ly0 = cy - (rows * rowH) / 2 + rowH / 2;
        for (var j = 0; j < nc; j++) {
          var cc = Math.floor(j / rows), rw = j % rows;
          var lx = lx0 + cc * (colW + colGap), yy = ly0 + rw * rowH, s2 = lsz * 0.85;
          o.push(rect(lx, yy - s2 / 2, s2, s2, s2 * 0.2, sliceColor(j)));
          o.push(txt(lx + s2 + u * 1.2, yy + lsz * 0.35, t.labels[j], lsz, lc, { anchor: "start", weight: 500, maxW: colW - s2 - u * 1.2 }));
        }
      }
      return finish();
    }

    // ---- Series legend (wraps onto more rows when it is too wide) ------
    if (ns > 1 && bv(d.showLegend, true)) {
      var lgs = ls, lmax = W - side * 2, lgap = u * 3;
      var itemW = function (s: string) { return lgs * 0.8 + u * 0.8 + mw(s, lgs, 500); };
      var widest = 0;
      t.series.forEach(function (s: any) { widest = Math.max(widest, itemW(s.name)); });
      if (widest > lmax) lgs = Math.max(floorT, lgs * lmax / widest);
      var lrows: any[] = [], cur: any[] = [], curW = 0;
      t.series.forEach(function (s: any, k: number) {
        var w = Math.min(itemW(s.name), lmax);
        if (cur.length && curW + lgap + w > lmax) { lrows.push({ items: cur, w: curW }); cur = []; curW = 0; }
        curW += (cur.length ? lgap : 0) + w;
        cur.push({ name: s.name, k: k, w: w });
      });
      if (cur.length) lrows.push({ items: cur, w: curW });
      lrows.forEach(function (row: any, ri: number) {
        var x = W / 2 - row.w / 2, y = top + lgs * (1 + ri * 1.6), sq2 = lgs * 0.8;
        row.items.forEach(function (it: any) {
          o.push(rect(x, y - sq2 * 0.85, sq2, sq2, sq2 * 0.2, pal[it.k % 6]));
          o.push(txt(x + sq2 + u * 0.8, y, it.name, lgs, lc, { anchor: "start", weight: 500, maxW: it.w - sq2 - u * 0.8 }));
          x += it.w + lgap;
        });
      });
      top += lgs * 1.6 * lrows.length + u;
    }

    var all: number[] = [];
    t.series.forEach(function (s: any) { s.values.forEach(function (v: number) { if (isFinite(v)) all.push(v); }); });
    var lo0 = Math.min(0, Math.min.apply(null, all)), hi0 = Math.max(0, Math.max.apply(null, all));
    if (hi0 === lo0) hi0 = lo0 + 1;
    var maxValW = 0;
    all.forEach(function (v) { maxValW = Math.max(maxValW, mw(fmt(v), vs, 700)); });
    function scale(useGrid: boolean): any {
      if (!useGrid) return { lo: lo0, hi: hi0, ticks: [], tdec: 0 };
      var st = niceStep((hi0 - lo0) / 4);
      var lo = Math.floor(lo0 / st + 1e-9) * st, hi = Math.ceil(hi0 / st - 1e-9) * st;
      if (hi === lo) hi = lo + st;
      var tdec = st % 1 ? Math.min(2, String(st).split(".")[1].length) : 0;
      var ticks: number[] = [];
      for (var tv = lo; tv <= hi + st / 2; tv += st) ticks.push(tv);
      return { lo: lo, hi: hi, ticks: ticks, tdec: tdec };
    }
    // Pick how values are shown in a slot: flat, rotated, with bars spread
    // apart for room, or hidden when nothing legible fits.
    function chooseValues(slotUser: number, slotWide: number, allowRotate: boolean): any {
      var c: any[] = [];
      var mv = Math.max(1, maxValW);
      c.push({ mode: "flat", wide: false, size: vs * Math.min(1, slotUser * 0.96 / mv) });
      if (slotWide > slotUser * 1.05) c.push({ mode: "flat", wide: true, size: vs * Math.min(1, slotWide * 0.96 / mv) });
      if (allowRotate) {
        c.push({ mode: "rot", wide: false, size: Math.min(vs, slotUser * 0.8) });
        if (slotWide > slotUser * 1.05) c.push({ mode: "rot", wide: true, size: Math.min(vs, slotWide * 0.8) });
      }
      for (var i = 0; i < c.length; i++) if (c[i].size >= Math.max(floorT, vs * 0.7)) return c[i];
      var best = c[0];
      c.forEach(function (x) { if (x.size > best.size) best = x; });
      return best.size >= floorT ? best : { mode: "none", wide: false, size: 0 };
    }

    // ---- Horizontal bars -------------------------------------------------
    function hbars(useGrid: boolean): any {
      var out: string[] = [];
      var sc = scale(useGrid), tks = Math.max(floorT, ls * 0.85);
      var T2 = top + u, B2 = B - (sc.ticks.length ? tks * 1.8 : 0);
      var band = (B2 - T2) / nc;
      var lsz = Math.min(ls, band * 0.8), step = 1;
      if (lsz < floorT) { step = Math.ceil(floorT / (band * 0.8)); lsz = floorT; }
      var labW = 0, labCap = (R0 - L0) * 0.32;
      if (showL) {
        var lm = 0;
        t.labels.forEach(function (l: string) { lm = Math.max(lm, mw(l, lsz, 500)); });
        if (lm > labCap) { var s2 = lsz * labCap / lm; if (s2 >= floorT) lsz = s2; lm = labCap; }
        labW = lm + u * 1.5;
      }
      var gh = band * barPct;
      // Values sit beside each bar, so only the bar's thickness limits their size.
      var vm: any = { mode: "none", wide: false, size: 0 };
      if (showV) {
        var s1 = Math.min(vs, gh / ns * 0.92), s2 = Math.min(vs, band * 0.92 / ns * 0.92);
        if (s1 >= Math.max(floorT, vs * 0.7) || (s1 >= floorT && s2 <= s1)) vm = { mode: "flat", wide: false, size: s1 };
        else if (s2 >= floorT) vm = { mode: "flat", wide: true, size: s2 };
      }
      var valW = vm.mode === "none" ? 0 : maxValW * vm.size / vs + u;
      var L2 = L0 + labW + (sc.lo < 0 ? valW + u * 1.5 : 0), R2 = R0 - valW;
      // Category labels end before the room kept for negative values, so a
      // value left of a negative bar never lands on them.
      var labR = L0 + labW;
      var X = function (v: number) { return L2 + (v - sc.lo) / (sc.hi - sc.lo) * (R2 - L2); };
      if (sc.ticks.length) {
        var tw2 = 0;
        sc.ticks.forEach(function (v: number) { tw2 = Math.max(tw2, mw(fmtN(v, sc.tdec), tks, 400)); });
        var tstep = Math.max(1, Math.ceil((tw2 * 1.3) / ((R2 - L2) / Math.max(1, sc.ticks.length - 1))));
        sc.ticks.forEach(function (v: number, i: number) {
          out.push(line(X(v), T2, X(v), B2, ac, gw, 0.25));
          if (i % tstep === 0) out.push(txt(X(v), B2 + tks * 1.3, fmtN(v, sc.tdec), tks, lc, { opacity: 0.75 }));
        });
      }
      var groupH = vm.wide ? band * 0.92 : gh, slotH = groupH / ns;
      var barH = Math.max(1, gh / ns - (ns > 1 ? (gh / ns) * 0.12 : 0));
      for (var ci = 0; ci < nc; ci++) {
        if (showL && ci % step === 0) out.push(txt(labR - u * 1.2, T2 + band * (ci + 0.5) + lsz * 0.35, t.labels[ci], lsz, lc, { anchor: "end", weight: 500, maxW: labW - u * 1.5 }));
        for (var si = 0; si < ns; si++) {
          var v = t.series[si].values[ci];
          if (!isFinite(v)) continue;
          var yc = T2 + band * ci + (band - groupH) / 2 + slotH * (si + 0.5);
          var kb = itemP(ci, nc), vk = animStyle === "fade" ? fadeA : Math.min(1, kb);
          if (kb <= 0) continue;
          var x0b = X(0), x1b = X(v * kb);
          out.push(rect(Math.min(x0b, x1b), yc - barH / 2, Math.abs(x1b - x0b), barH, radius, colorOf(si, ci)));
          if (vm.mode !== "none") out.push(txt(v >= 0 ? x1b + u * 0.8 : x1b - u * 0.8, yc + vm.size * 0.35, fmt(v * vk), vm.size, vc, { anchor: v >= 0 ? "start" : "end", weight: 700, opacity: vk < 1 ? clamp01(vk / 0.3).toFixed(3) : null }));
        }
      }
      if (showBase) out.push(line(X(0), T2, X(0), B2, ac, bw0, null));
      return { parts: out, hidden: showV && vm.mode === "none" };
    }

    // ---- Vertical bars and lines ------------------------------------------
    function columns(useGrid: boolean): any {
      var out: string[] = [];
      var isLine = type === "line";
      // Axes: lines along the left and bottom edges; marks: ticks with the
      // value scale on the y axis and a tick under each category.
      var axisLines = bv(d.axisLines, false), axisMarks = bv(d.axisMarks, false);
      var sc = scale(useGrid || axisMarks), tks = Math.max(floorT, ls * 0.85);
      var L = L0, R = R0;
      if (sc.ticks.length) {
        var gl = 0;
        sc.ticks.forEach(function (v: number) { gl = Math.max(gl, mw(fmtN(v, sc.tdec), tks, 400)); });
        L += gl + u * 1.5;
      }
      var lw = Math.max(1, nv(d.lineWidth, 6)) * env.H / 1080;
      // Line values: every point when there is room, otherwise one label at
      // the end of each line.
      var lineMode = "none", lineSize = 0;
      if (isLine && showV) {
        var band0 = (R - L) / nc;
        var sAll = vs * Math.min(1, band0 * 0.92 / Math.max(1, maxValW));
        if (ns * nc <= 24 && sAll >= Math.max(floorT, vs * 0.6)) { lineMode = "all"; lineSize = sAll; }
        else {
          lineMode = "end"; lineSize = Math.max(floorT, Math.min(vs, (B - top) / (ns * 1.3) * 0.8));
          var endW = 0;
          t.series.forEach(function (s: any) {
            for (var i = s.values.length - 1; i >= 0; i--) if (isFinite(s.values[i])) { endW = Math.max(endW, mw(fmt(s.values[i]), lineSize, 700)); break; }
          });
          R -= endW + lw * 2 + u * 1.5;
        }
      }
      var pw = R - L, band = pw / nc;
      // Category labels: as they are, smaller, tilted, or every other one.
      var lab: any = { mode: "none", size: ls, h: 0, step: 1, maxW: 0 };
      if (showL) {
        var lmax = 0;
        t.labels.forEach(function (l: string) { lmax = Math.max(lmax, mw(l, ls, 500)); });
        var fitS = lmax > 0 ? ls * Math.min(1, band * 0.92 / lmax) : ls;
        if (fitS >= Math.max(floorT, ls * 0.6)) lab = { mode: "flat", size: fitS, h: fitS * 1.8, step: 1, maxW: band * 0.96 };
        else {
          var rs = Math.max(floorT, Math.min(ls, band * 0.62));
          var step = Math.max(1, Math.ceil((rs * 1.15) / (band * 0.71)));
          var diag = Math.min(lmax * rs / ls, (H * 0.22 - rs) / 0.71);
          lab = { mode: "rot", size: rs, h: diag * 0.71 + rs * 1.4, step: step, maxW: diag };
        }
      }
      var B3 = B - lab.h;
      var gW = band * barPct;
      var vm: any = { mode: "none", wide: false, size: 0 };
      var head = u * 2;
      if (!isLine && showV) {
        vm = chooseValues(gW / ns, band * 0.92 / ns, true);
        if (vm.mode === "rot") {
          var len = maxValW * vm.size / vs, cap = (B3 - top) * 0.3;
          if (len > cap) { vm.size *= cap / len; len = cap; }
          if (vm.size < floorT) vm = { mode: "none", wide: false, size: 0 };
          else head = len + u * 1.5;
        } else if (vm.mode === "flat") head = vm.size * 1.5;
      }
      if (isLine && lineMode === "all") head = lineSize * 1.5 + lw * 2;
      if (isLine && lineMode === "end") head = Math.max(u * 2, lineSize * 0.7);
      var T3 = top + head, ph = B3 - T3;
      var Y = function (v: number) { return B3 - (v - sc.lo) / (sc.hi - sc.lo) * ph; };
      if (sc.ticks.length) {
        var tstep = Math.max(1, Math.ceil((tks * 1.4) / (ph / Math.max(1, sc.ticks.length - 1))));
        var mark = u * 0.9;
        sc.ticks.forEach(function (v: number, i: number) {
          if (useGrid) out.push(line(L, Y(v), R, Y(v), ac, gw, 0.25));
          if (axisMarks) out.push(line(L - mark, Y(v), L, Y(v), ac, bw0, null));
          if (i % tstep === 0) out.push(txt(L - u - (axisMarks ? mark : 0), Y(v) + tks * 0.3, fmtN(v, sc.tdec), tks, lc, { anchor: "end", opacity: 0.75 }));
        });
      }
      if (axisLines) {
        out.push(line(L, T3 - u, L, B3, ac, bw0, null));
        out.push(line(L, B3, R, B3, ac, bw0, null));
      }
      if (axisMarks) {
        for (var mi = 0; mi < nc; mi++) out.push(line(L + band * (mi + 0.5), B3, L + band * (mi + 0.5), B3 + u * 0.9, ac, bw0, null));
      }
      if (showL) {
        for (var li = 0; li < nc; li += lab.step) {
          var lx = L + band * (li + 0.5);
          if (lab.mode === "flat") out.push(txt(lx, B3 + lab.size * 1.35 + (axisMarks ? u * 0.6 : 0), t.labels[li], lab.size, lc, { weight: 500, maxW: lab.maxW }));
          else out.push(txt(lx + lab.size * 0.3, B3 + lab.size * 0.9, t.labels[li], lab.size, lc, { anchor: "end", weight: 500, maxW: lab.maxW, rot: -45 }));
        }
      }
      if (isLine) {
        var hp = headP();
        var reveal = L + band * 0.5 + (pw - band) * hp; // the drawing head runs from the first point to the last
        var clipped = hp < 1;
        var cid = "cmclip" + Math.round(hp * 10000);
        if (clipped) out.push('<defs><clipPath id="' + cid + '"><rect x="0" y="0" width="' + f1(reveal + lw) + '" height="' + H + '"/></clipPath></defs>');
        if (showBase) out.push(line(L, Y(0), R, Y(0), ac, bw0, null));
        var pr = Math.min(lw * 1.5, band * 0.3);
        // Points and their numbers start when the head reaches them; the
        // number counts up from zero and rises into place.
        var x0p = L + band * 0.5, spanX = Math.max(1e-6, pw - band);
        var pointT = function (x: number, win: number): number {
          if (P >= 1) return 1;
          if (animStyle === "fade") return fadeA;
          return clamp01((P - reachP((x - x0p) / spanX)) / win);
        };
        var colLabels: any[] = [];
        var endLabels: any[] = [];
        t.series.forEach(function (s: any, k: number) {
          var path = "", first: any = null, last: any = null, pen = false, pts: any[] = [];
          s.values.forEach(function (v: number, i: number) {
            if (!isFinite(v)) { pen = false; return; }
            var px = L + band * (i + 0.5), py = Y(v);
            path += (pen ? " L" : " M") + f1(px) + " " + f1(py);
            if (first == null) first = px;
            last = px; pen = true;
            pts.push({ x: px, y: py, v: v, i: i });
          });
          out.push(clipped ? '<g clip-path="url(#' + cid + ')">' : "<g>");
          if (bv(d.fillArea, false) && first != null) {
            var area = path.replace(/ M/g, " L").replace(/^ L/, "M") + " L" + f1(last) + " " + f1(Y(0)) + " L" + f1(first) + " " + f1(Y(0)) + " Z";
            out.push('<path d="' + area + '" fill="' + pal[k % 6] + '" fill-opacity="0.18"/>');
          }
          out.push('<path d="' + path.trim() + '" fill="none" stroke="' + pal[k % 6] + '" stroke-width="' + f1(lw) + '" stroke-linejoin="round" stroke-linecap="round"/>');
          out.push("</g>");
          pts.forEach(function (pt: any) {
            var dt = pointT(pt.x, 0.12);
            if (dt > 0 && bv(d.showPoints, true)) {
              var ds = animStyle === "bounce" ? easeOutBack(dt) : easeOutCubic(dt);
              out.push('<circle cx="' + f1(pt.x) + '" cy="' + f1(pt.y) + '" r="' + f1(pr * ds) + '" fill="' + pal[k % 6] + '"/>');
            }
            var lt = pointT(pt.x, 0.22);
            if (lineMode === "all" && lt > 0) {
              if (!colLabels[pt.i]) colLabels[pt.i] = [];
              colLabels[pt.i].push({ x: pt.x, y: pt.v >= 0 ? pt.y - lw * 2 - lineSize * 0.3 : pt.y + lw * 2 + lineSize, v: pt.v, k: k, a: lt });
            }
          });
          // The end number rides the tip of the line while it draws, counting
          // along, and comes to rest beside the last point.
          if (lineMode === "end" && pts.length) {
            var hx = Math.min(reveal, pts[pts.length - 1].x);
            if (hx >= pts[0].x) {
              var hy = pts[0].y, hv = pts[0].v;
              for (var q = 1; q < pts.length; q++) {
                if (hx <= pts[q].x) {
                  var f = (hx - pts[q - 1].x) / Math.max(1e-6, pts[q].x - pts[q - 1].x);
                  hy = pts[q - 1].y + (pts[q].y - pts[q - 1].y) * f;
                  hv = pts[q - 1].v + (pts[q].v - pts[q - 1].v) * f;
                  break;
                }
                hy = pts[q].y; hv = pts[q].v;
              }
              endLabels.push({ x: hx + lw * 2 + u, y: hy + lineSize * 0.35, v: hv, k: k, a: clipped ? clamp01((hx - pts[0].x) / (band * 0.5)) : 1 });
            }
          }
        });
        var spread = function (list: any[], gap: number, minY: number) {
          list.sort(function (a: any, b: any) { return a.y - b.y; });
          for (var i = 0; i < list.length; i++) {
            if (i === 0) list[i].y = Math.max(list[i].y, minY);
            else if (list[i].y - list[i - 1].y < gap) list[i].y = list[i - 1].y + gap;
          }
        };
        if (lineMode === "all") {
          colLabels.forEach(function (list: any[]) {
            if (!list) return;
            spread(list, lineSize * 1.1, top + lineSize);
            list.forEach(function (lb: any) {
              var c = lb.a >= 1 ? 1 : (animStyle === "bounce" ? easeOutBack(lb.a) : easeOutCubic(lb.a));
              var rise = (1 - Math.min(1, c)) * lineSize * 0.8;
              out.push(txt(lb.x, lb.y + rise, fmt(lb.v * Math.min(1, c)), lineSize, ns > 1 ? pal[lb.k % 6] : vc,
                { weight: 700, maxW: band * 0.98, opacity: lb.a < 1 ? Math.min(1, lb.a * 3).toFixed(3) : null }));
            });
          });
        }
        if (lineMode === "end") {
          spread(endLabels, lineSize * 1.15, top + lineSize);
          endLabels.forEach(function (lb: any) {
            out.push(txt(lb.x, lb.y, fmt(lb.v), lineSize, ns > 1 ? pal[lb.k % 6] : vc, { anchor: "start", weight: 700, opacity: lb.a < 1 ? lb.a.toFixed(3) : null }));
          });
        }
        return { parts: out, hidden: false };
      }
      var groupW = vm.wide ? band * 0.92 : gW, slotW = groupW / ns;
      var barW = Math.max(1, gW / ns - (ns > 1 ? (gW / ns) * 0.12 : 0));
      for (var c2 = 0; c2 < nc; c2++) {
        for (var s3 = 0; s3 < ns; s3++) {
          var v3 = t.series[s3].values[c2];
          if (!isFinite(v3)) continue;
          var xc = L + band * c2 + (band - groupW) / 2 + slotW * (s3 + 0.5);
          var k3 = itemP(c2, nc), vk3 = animStyle === "fade" ? fadeA : Math.min(1, k3);
          if (k3 <= 0) continue;
          var vop = vk3 < 1 ? clamp01(vk3 / 0.3).toFixed(3) : null;
          var y0 = Y(0), y1 = Y(v3 * k3);
          out.push(rect(xc - barW / 2, Math.min(y0, y1), barW, Math.abs(y1 - y0), radius, colorOf(s3, c2)));
          if (vm.mode === "flat") out.push(txt(xc, v3 >= 0 ? y1 - vm.size * 0.45 : y1 + vm.size * 1.1, fmt(v3 * vk3), vm.size, vc, { weight: 700, maxW: slotW * 0.98, opacity: vop }));
          else if (vm.mode === "rot") {
            var up = v3 >= 0;
            out.push(txt(xc + vm.size * 0.35, up ? y1 - u * 0.8 : y1 + u * 0.8, fmt(v3 * vk3), vm.size, vc, { anchor: up ? "start" : "end", weight: 700, rot: -90, opacity: vop }));
          }
        }
      }
      if (showBase) out.push(line(L, Y(0), R, Y(0), ac, bw0, null));
      return { parts: out, hidden: showV && vm.mode === "none" };
    }

    var draw = type === "hbar" ? hbars : columns;
    var res = draw(grid);
    // Values could not fit legibly: show gridlines instead so the chart still reads.
    if (res.hidden && !grid) res = draw(true);
    res.parts.forEach(function (x: string) { o.push(x); });
    return finish();
  }
  // Where the chart sits in the frame.
  function areaBox(area: string, W: number, H: number): any {
    var m = Math.min(W, H) * 0.04;
    if (area === "left") return { x: m, y: m, w: W / 2 - m * 1.5, h: H - m * 2 };
    if (area === "right") return { x: W / 2 + m * 0.5, y: m, w: W / 2 - m * 1.5, h: H - m * 2 };
    if (area === "top") return { x: m, y: m, w: W - m * 2, h: H / 2 - m * 1.5 };
    if (area === "bottom") return { x: m, y: H / 2 + m * 0.5, w: W - m * 2, h: H / 2 - m * 1.5 };
    if (area === "center") return { x: W * 0.12, y: H * 0.1, w: W * 0.76, h: H * 0.8 };
    if (area === "topLeft") return { x: m, y: m, w: W * 0.46, h: H * 0.48 };
    if (area === "topRight") return { x: W * 0.54 - m, y: m, w: W * 0.46, h: H * 0.48 };
    if (area === "bottomLeft") return { x: m, y: H * 0.52 - m, w: W * 0.46, h: H * 0.48 };
    if (area === "bottomRight") return { x: W * 0.54 - m, y: H * 0.52 - m, w: W * 0.46, h: H * 0.48 };
    return { x: 0, y: 0, w: W, h: H };
  }
  function svg(d: any, W: number, H: number, p: any, measure: any): string {
    d = d || {};
    var bgMode = String(d.bgMode || "solid");
    var b = areaBox(String(d.area || "full"), W, H);
    var bg = col(d.background, "#111214");
    var fam = String(d.fontFamily || "").replace(/["'<>;&]/g, "").trim();
    var font = (fam ? "'" + fam + "', " : "") + "Inter, 'Helvetica Neue', Helvetica, Arial, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";
    var inner = chartBody(d, b.w, b.h, p, measure, { uFull: Math.min(W, H) / 100, H: H, bgMode: bgMode, boxed: String(d.area || "full") !== "full" });
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + " " + H + '" width="100%" height="100%" style="display:block;font-family:' + esc(font) + '">' +
      (bgMode === "solid" ? '<rect width="' + W + '" height="' + H + '" fill="' + bg + '"/>' : "") +
      '<svg x="' + f1(b.x) + '" y="' + f1(b.y) + '" width="' + f1(b.w) + '" height="' + f1(b.h) + '" viewBox="0 0 ' + f1(b.w) + " " + f1(b.h) + '" overflow="visible">' +
      inner + "</svg></svg>";
  }
  return { parse: parse, svg: svg, areaBox: areaBox };
}

// Measures text with a canvas so the renderer can fit it exactly. Returns 0
// where there is no canvas; the renderer then estimates.
function makeMeasure() {
  var ctx: any = null;
  return function (text: string, size: number, weight: any, family: string): number {
    try {
      if (!ctx) {
        var doc: any = (globalThis as any).document;
        if (!doc) return 0;
        ctx = doc.createElement("canvas").getContext("2d");
        if (!ctx) return 0;
      }
      ctx.font = String(weight) + " " + size + "px " + family;
      return ctx.measureText(text).width;
    } catch (err) {
      return 0;
    }
  };
}

function graphicTsx() {
  return [
    'import React from "react";',
    'import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";',
    "const chartKit = " + chartKit.toString() + ";",
    "const makeMeasure = " + makeMeasure.toString() + ";",
    "const kit = chartKit();",
    "const measure = makeMeasure();",
    "export default function ChartGraphic({ data }) {",
    "  const frame = useCurrentFrame();",
    "  const { width, height, fps } = useVideoConfig();",
    "  const secs = Number(data.animSeconds) > 0 ? Number(data.animSeconds) : 1;",
    "  const p = data.animate ? Math.min(1, Math.max(0, frame / (fps * secs))) : 1;",
    "  const html = kit.svg(data, width, height, p, measure);",
    "  return (",
    "    <AbsoluteFill>",
    '      <div style={{ width: "100%", height: "100%" }} dangerouslySetInnerHTML={{ __html: html }} />',
    "    </AbsoluteFill>",
    "  );",
    "}",
  ].join("\n");
}

const WEIGHT_OPTS = [
  { label: "Regular", value: "400" }, { label: "Medium", value: "500" }, { label: "Semibold", value: "600" },
  { label: "Bold", value: "700" }, { label: "Black", value: "900" },
];

// What the Inspector shows for a placed chart clip.
// A select item cannot have an empty value, so "no highlight" uses this one;
// the renderer reads it the same as "".
const HIGHLIGHT_NONE = "__none__";
const INSPECTOR_DEFS: any[] = [
  { key: "data", label: "Data (paste table)", type: "text", defaultValue: DEFAULTS.data },
  { key: "chartType", label: "Chart type", type: "select", defaultValue: "bar", options: [
    { label: "Bar", value: "bar" }, { label: "Horizontal bar", value: "hbar" }, { label: "Line", value: "line" },
    { label: "Pie", value: "pie" }, { label: "Donut", value: "donut" }] },
  { key: "title", label: "Title", type: "text", defaultValue: DEFAULTS.title },
  { key: "showTitle", label: "Show title", type: "boolean", defaultValue: true },
  { key: "fontFamily", label: "Font", type: "text", defaultValue: "" },
  { key: "titleSize", label: "Title size", type: "number", defaultValue: 7, min: 1, max: 20, step: 0.5 },
  { key: "titleWeight", label: "Title weight", type: "select", defaultValue: "700", options: WEIGHT_OPTS },
  { key: "titleColor", label: "Title color", type: "color", defaultValue: "#FFFFFF" },
  { key: "area", label: "Screen position", type: "select", defaultValue: "full", options: [
    { label: "Full screen", value: "full" }, { label: "Centered", value: "center" }, { label: "Left half", value: "left" },
    { label: "Right half", value: "right" }, { label: "Top half", value: "top" }, { label: "Bottom half", value: "bottom" },
    { label: "Top left", value: "topLeft" }, { label: "Top right", value: "topRight" },
    { label: "Bottom left", value: "bottomLeft" }, { label: "Bottom right", value: "bottomRight" }] },
  { key: "textOutline", label: "Text outline", type: "boolean", defaultValue: false },
  { key: "source", label: "Source (\ucd9c\ucc98)", type: "text", defaultValue: "" },
  { key: "sourceAlign", label: "Source align", type: "select", defaultValue: "left", options: [
    { label: "Left", value: "left" }, { label: "Center", value: "center" }, { label: "Right", value: "right" }] },
  { key: "sourceSize", label: "Source size", type: "number", defaultValue: 2.6, min: 1, max: 8, step: 0.1 },
  { key: "color1", label: "Color 1", type: "color", defaultValue: DEFAULT_COLORS[0] },
  { key: "color2", label: "Color 2", type: "color", defaultValue: DEFAULT_COLORS[1] },
  { key: "color3", label: "Color 3", type: "color", defaultValue: DEFAULT_COLORS[2] },
  { key: "color4", label: "Color 4", type: "color", defaultValue: DEFAULT_COLORS[3] },
  { key: "color5", label: "Color 5", type: "color", defaultValue: DEFAULT_COLORS[4] },
  { key: "color6", label: "Color 6", type: "color", defaultValue: DEFAULT_COLORS[5] },
  { key: "colorEach", label: "Color each bar", type: "boolean", defaultValue: false },
  { key: "highlight", label: "Highlight", type: "select", defaultValue: HIGHLIGHT_NONE, options: [] },
  { key: "highlightColor", label: "Highlight color", type: "color", defaultValue: "#FFD54F" },
  { key: "dimColor", label: "Color of the rest", type: "color", defaultValue: "#5C616B" },
  { key: "showValues", label: "Show values", type: "boolean", defaultValue: true },
  { key: "valueSize", label: "Value size", type: "number", defaultValue: 4.5, min: 1, max: 15, step: 0.5 },
  { key: "valueColor", label: "Value color", type: "color", defaultValue: "#FFFFFF" },
  { key: "valuePrefix", label: "Value prefix", type: "text", defaultValue: "" },
  { key: "valueSuffix", label: "Value suffix", type: "text", defaultValue: "" },
  { key: "decimals", label: "Decimals", type: "select", defaultValue: "auto", options: [
    { label: "Auto", value: "auto" }, { label: "0", value: "0" }, { label: "1", value: "1" }, { label: "2", value: "2" }] },
  { key: "thousands", label: "Thousands separator", type: "boolean", defaultValue: true },
  { key: "pieValues", label: "Slice values", type: "select", defaultValue: "percent", options: [
    { label: "Percent", value: "percent" }, { label: "Value", value: "value" }, { label: "Both", value: "both" }] },
  { key: "showLabels", label: "Show labels", type: "boolean", defaultValue: true },
  { key: "labelSize", label: "Label size", type: "number", defaultValue: 4, min: 1, max: 15, step: 0.5 },
  { key: "labelColor", label: "Label color", type: "color", defaultValue: "#FFFFFF" },
  { key: "showLegend", label: "Show legend", type: "boolean", defaultValue: true },
  { key: "showGrid", label: "Gridlines", type: "boolean", defaultValue: false },
  { key: "showBaseline", label: "Baseline", type: "boolean", defaultValue: true },
  { key: "axisLines", label: "X and Y axis lines", type: "boolean", defaultValue: false },
  { key: "axisMarks", label: "Axis marks and scale", type: "boolean", defaultValue: false },
  { key: "axisColor", label: "Axis & grid color", type: "color", defaultValue: "#FFFFFF" },
  { key: "barWidth", label: "Bar width (%)", type: "number", defaultValue: 55, min: 5, max: 100, step: 1 },
  { key: "cornerRadius", label: "Corner radius", type: "number", defaultValue: 0, min: 0, max: 10, step: 0.5 },
  { key: "lineWidth", label: "Line width", type: "number", defaultValue: 6, min: 1, max: 30, step: 1 },
  { key: "showPoints", label: "Points", type: "boolean", defaultValue: true },
  { key: "fillArea", label: "Fill under line", type: "boolean", defaultValue: false },
  { key: "donutHole", label: "Donut hole (%)", type: "number", defaultValue: 55, min: 10, max: 90, step: 1 },
  { key: "chartWidth", label: "Chart width (%)", type: "number", defaultValue: 70, min: 20, max: 100, step: 1 },
  { key: "animate", label: "Animate in", type: "boolean", defaultValue: false },
  { key: "animStyle", label: "Animation style", type: "select", defaultValue: "draw", options: [
    { label: "Draw", value: "draw" }, { label: "One by one", value: "cascade" }, { label: "Bounce", value: "bounce" }, { label: "Fade up", value: "fade" }] },
  { key: "animSeconds", label: "Animation length (s)", type: "number", defaultValue: 1.5, min: 0.1, max: 10, step: 0.1 },
];

// The background is its own clip under the chart, so it can be switched off,
// recoloured or deleted without touching the chart.
const BG_TSX = [
  'import React from "react";',
  'import { AbsoluteFill, useVideoConfig } from "remotion";',
  "function areaBox(area, W, H) {",
  "  const m = Math.min(W, H) * 0.04;",
  '  if (area === "left") return { x: m, y: m, w: W / 2 - m * 1.5, h: H - m * 2 };',
  '  if (area === "right") return { x: W / 2 + m * 0.5, y: m, w: W / 2 - m * 1.5, h: H - m * 2 };',
  '  if (area === "top") return { x: m, y: m, w: W - m * 2, h: H / 2 - m * 1.5 };',
  '  if (area === "bottom") return { x: m, y: H / 2 + m * 0.5, w: W - m * 2, h: H / 2 - m * 1.5 };',
  '  if (area === "center") return { x: W * 0.12, y: H * 0.1, w: W * 0.76, h: H * 0.8 };',
  '  if (area === "topLeft") return { x: m, y: m, w: W * 0.46, h: H * 0.48 };',
  '  if (area === "topRight") return { x: W * 0.54 - m, y: m, w: W * 0.46, h: H * 0.48 };',
  '  if (area === "bottomLeft") return { x: m, y: H * 0.52 - m, w: W * 0.46, h: H * 0.48 };',
  '  if (area === "bottomRight") return { x: W * 0.54 - m, y: H * 0.52 - m, w: W * 0.46, h: H * 0.48 };',
  "  return { x: 0, y: 0, w: W, h: H };",
  "}",
  "export default function ChartBackground({ data }) {",
  "  const { width, height } = useVideoConfig();",
  '  const color = /^#[0-9a-fA-F]{3,8}$/.test(String(data.color || "")) ? String(data.color) : "#111214";',
  '  if (data.style !== "card") return <AbsoluteFill style={{ backgroundColor: color }} />;',
  '  const b = areaBox(String(data.area || "full"), width, height);',
  "  const r = (Math.min(b.w, b.h) / 100) * Math.max(0, Number(data.radius) || 0);",
  "  return (",
  "    <AbsoluteFill>",
  '      <div style={{ position: "absolute", left: b.x, top: b.y, width: b.w, height: b.h, borderRadius: r, backgroundColor: color }} />',
  "    </AbsoluteFill>",
  "  );",
  "}",
].join("\n");

const BG_DEFS: any[] = [
  { key: "style", label: "Background style", type: "select", defaultValue: "solid", options: [
    { label: "Full frame", value: "solid" }, { label: "Card", value: "card" }] },
  { key: "color", label: "Background color", type: "color", defaultValue: "#111214" },
  { key: "area", label: "Card position", type: "select", defaultValue: "full", options: [
    { label: "Full screen", value: "full" }, { label: "Centered", value: "center" }, { label: "Left half", value: "left" },
    { label: "Right half", value: "right" }, { label: "Top half", value: "top" }, { label: "Bottom half", value: "bottom" },
    { label: "Top left", value: "topLeft" }, { label: "Top right", value: "topRight" },
    { label: "Bottom left", value: "bottomLeft" }, { label: "Bottom right", value: "bottomRight" }] },
  { key: "radius", label: "Card corners", type: "number", defaultValue: 3, min: 0, max: 10, step: 0.5 },
];

function newLinkId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

const CANVASES: Record<string, { width: number; height: number }> = {
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
};

const STORAGE_KEY = "state.v1";
const MAX_FILE = 1024 * 1024;

function b64ToText(chunks: string[]) {
  let total = 0;
  const parts = chunks.map((c) => {
    const bin = atob(c);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    total += arr.length;
    return arr;
  });
  const all = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { all.set(p, off); off += p.length; }
  return new TextDecoder("utf-8").decode(all).replace(/^﻿/, "");
}

function fmtTime(frames: number, fps: number) {
  const s = Math.max(0, Math.round(frames / (fps || 30)));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

// ---- AI design ---------------------------------------------------------------
// Fonts the AI may pick; families that ship with macOS or Windows.
const AI_FONTS = [
  "Helvetica Neue", "Avenir Next", "Futura", "Gill Sans", "Optima", "Arial", "Arial Black", "Verdana", "Trebuchet MS",
  "Georgia", "Times New Roman", "Baskerville", "Didot", "Palatino", "American Typewriter", "Rockwell", "Copperplate",
  "Impact", "Menlo", "Courier New", "Marker Felt", "Chalkboard SE",
];
// Korean fonts the AI may pick, offered only when installed on this computer.
// Apple SD Gothic Neo ships with macOS and Malgun Gothic with Windows.
const AI_FONTS_KO = [
  "Apple SD Gothic Neo", "AppleMyungjo", "Malgun Gothic", "Pretendard", "Noto Sans KR", "Noto Serif KR",
  "Nanum Gothic", "Nanum Myeongjo", "NanumSquare", "Spoqa Han Sans Neo", "SUIT", "Gmarket Sans", "IBM Plex Sans KR",
];
// True when a font is installed: text set in it measures differently from the fallbacks.
function fontInstalled(name: string): boolean {
  try {
    const doc: any = (globalThis as any).document;
    const ctx = doc && doc.createElement("canvas").getContext("2d");
    if (!ctx) return false;
    const sample = "\uAC00\uB098\uB2E4\uD55C\uAE00 mmmWWWiii 0123";
    return ["monospace", "serif"].some((base) => {
      ctx.font = `48px ${base}`;
      const w0 = ctx.measureText(sample).width;
      ctx.font = `48px '${name.replace(/'/g, "")}', ${base}`;
      return ctx.measureText(sample).width !== w0;
    });
  } catch {
    return false;
  }
}
let koFontsCache: string[] | null = null;
function installedKoreanFonts(): string[] {
  if (!koFontsCache) koFontsCache = AI_FONTS_KO.filter(fontInstalled);
  return koFontsCache;
}
const HAS_HANGUL = /[\u3131-\u318E\uAC00-\uD7A3]/;
const AI_COLOR_KEYS = ["background", "titleColor", "valueColor", "labelColor", "axisColor", "color1", "color2", "color3", "color4", "color5", "color6", "highlightColor", "dimColor"];
const AI_SPEC: Record<string, any> = {
  chartType: { oneOf: ["bar", "hbar", "line", "pie", "donut"] },
  title: { text: 80 },
  fontFamily: { text: 60 },
  titleSize: { range: [1, 20] }, valueSize: { range: [1, 15] }, labelSize: { range: [1, 15] },
  titleWeight: { oneOf: ["400", "500", "600", "700", "900"] },
  bgOn: { bool: true }, bgStyle: { oneOf: ["solid", "card"] }, bgRadius: { range: [0, 10] }, textOutline: { bool: true },
  area: { oneOf: ["full", "center", "left", "right", "top", "bottom", "topLeft", "topRight", "bottomLeft", "bottomRight"] },
  colorEach: { bool: true }, showGrid: { bool: true }, showBaseline: { bool: true }, showValues: { bool: true },
  showLabels: { bool: true }, showLegend: { bool: true }, showPoints: { bool: true }, fillArea: { bool: true },
  thousands: { bool: true }, showTitle: { bool: true }, animate: { bool: true },
  axisLines: { bool: true }, axisMarks: { bool: true },
  sourceAlign: { oneOf: ["left", "center", "right"] }, sourceSize: { range: [1, 8] },
  barWidth: { range: [5, 100] }, cornerRadius: { range: [0, 10] }, lineWidth: { range: [1, 30] },
  donutHole: { range: [10, 90] }, chartWidth: { range: [20, 100] },
  valuePrefix: { text: 6 }, valueSuffix: { text: 8 },
  decimals: { oneOf: ["auto", "0", "1", "2"] }, pieValues: { oneOf: ["percent", "value", "both"] },
  animStyle: { oneOf: ["draw", "cascade", "bounce", "fade"] }, animSeconds: { range: [0.3, 5] },
  highlight: { label: true },
};
for (const k of AI_COLOR_KEYS) AI_SPEC[k] = { color: true };

// Keep only changes that are valid settings with valid values.
function sanitizeAiChanges(raw: any, current: Record<string, any>, labels: string[] = [], fonts: string[] = AI_FONTS): Record<string, any> {
  const out: Record<string, any> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const key of Object.keys(raw)) {
    const spec = AI_SPEC[key];
    let v = raw[key];
    if (!spec) continue;
    if (spec.oneOf) { v = String(v); if (!spec.oneOf.includes(v)) continue; }
    else if (spec.range) { v = Number(v); if (!isFinite(v)) continue; v = Math.max(spec.range[0], Math.min(spec.range[1], Math.round(v * 10) / 10)); }
    else if (spec.bool) { if (typeof v !== "boolean") continue; }
    else if (spec.text) { if (typeof v !== "string") continue; v = v.slice(0, spec.text); }
    else if (spec.label) { v = String(v ?? "").trim(); if (v && !labels.some((l) => String(l).trim() === v)) continue; }
    else if (spec.color) {
      v = String(v).trim();
      if (!/^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?([0-9a-fA-F]{2})?$/.test(v)) continue;
      if (v[0] !== "#") v = "#" + v;
      if (v.length === 4) v = "#" + v.slice(1).split("").map((c: string) => c + c).join("");
      v = v.toUpperCase();
    }
    if (key === "fontFamily" && v && !fonts.includes(v)) continue;
    if (current[key] === v) continue;
    out[key] = v;
  }
  return out;
}

function extractJson(text: string): any {
  const t = String(text || "");
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : t;
  const a = body.indexOf("{"), b = body.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(body.slice(a, b + 1)); } catch { return null; }
}

// The live preview. It plays the animation by itself (so the rest of the
// panel does not redraw every frame) whenever playToken changes.
function ChartPreview({ kit, measure, params, dims, playToken }: any) {
  const [p, setP] = React.useState<number | null>(null);
  const raf = React.useRef(0);
  const secsRef = React.useRef(1);
  secsRef.current = Math.max(0.1, Number(params.animSeconds) || 1);
  React.useEffect(() => {
    if (!playToken) return;
    const secs = secsRef.current;
    let t0 = 0;
    const step = (now: number) => {
      if (!t0) t0 = now;
      const v = Math.min(1, (now - t0) / (secs * 1000));
      if (v < 1) { setP(v); raf.current = requestAnimationFrame(step); }
      else setP(null);
    };
    setP(0);
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [playToken]);
  const html = React.useMemo(
    () => kit.svg(params, dims.width, dims.height, p == null ? 1 : p, measure),
    [params, dims.width, dims.height, p],
  );
  const seeThrough = String(params.bgMode || "solid") !== "solid";
  return (
    <div
      style={{
        width: "100%",
        maxWidth: Math.round((300 * dims.width) / dims.height),
        margin: "0 auto",
        aspectRatio: `${dims.width} / ${dims.height}`,
        borderRadius: "var(--panel-radius)",
        overflow: "hidden",
        background: seeThrough ? "repeating-conic-gradient(var(--panel-border) 0% 25%, transparent 0% 50%) 0 0 / 14px 14px" : undefined,
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default function Panel({ sdk, context, ui }: any) {
  const [uiLang, setUiLang] = React.useState<string>("auto"); // auto | en | ko
  const appLang = String(context.language || "en").slice(0, 2).toLowerCase();
  const S: any = STRINGS[uiLang === "auto" ? appLang : uiLang] ?? STRINGS.en;
  const kit: any = React.useMemo(() => chartKit(), []);
  const measure = React.useMemo(() => makeMeasure(), []);
  const [params, setParams] = React.useState<Record<string, any>>(DEFAULTS);
  const [mode, setMode] = React.useState<string>("new");
  const stash = React.useRef<Record<string, any> | null>(null); // the new chart's settings while editing another
  const [tab, setTab] = React.useState<string>("data");
  const [duration, setDuration] = React.useState(5);
  const [placement, setPlacement] = React.useState<string>(context.sequenceId ? "start" : "new");
  const [canvas, setCanvas] = React.useState("16:9");
  const [restored, setRestored] = React.useState(false);
  const [draft, setDraft] = React.useState<any>(null);
  const [charts, setCharts] = React.useState<any[]>([]);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<any>(null);
  const [file, setFile] = React.useState<any>(null);
  const [playToken, setPlayToken] = React.useState(0);
  const [refs, setRefs] = React.useState<Array<{ name: string; dataUrl: string }>>([]);
  const [aiPrompt, setAiPrompt] = React.useState("");
  const [aiPrev, setAiPrev] = React.useState<Record<string, any> | null>(null);
  const [aiStatus, setAiStatus] = React.useState<any>(null);
  const [aiOffline, setAiOffline] = React.useState(false);
  const [styles, setStyles] = React.useState<Array<{ name: string; params: Record<string, any> }>>([]);
  const [styleName, setStyleName] = React.useState("");
  const [stylePick, setStylePick] = React.useState<string | null>(null);
  const [stylePrev, setStylePrev] = React.useState<Record<string, any> | null>(null);
  const [styleStatus, setStyleStatus] = React.useState<any>(null);
  const aiRun = React.useRef(0); // bumps on each run and on Stop; a reply from an older run is ignored // the Selects-credits model could not be assigned

  const set = (key: string) => (value: any) => setParams((prev) => ({ ...prev, [key]: value }));
  const play = () => setPlayToken((t) => t + 1);
  // Changing how the chart animates replays the preview so the change is visible.
  const setAnim = (key: string) => (value: any) => {
    setParams((prev) => ({ ...prev, [key]: value }));
    if (key !== "animate" || value) play();
  };

  // Restore the last new-chart settings.
  React.useEffect(() => {
    let alive = true;
    sdk.storage.getItem(STORAGE_KEY).then((raw: string | null) => {
      if (!alive) return;
      if (raw) {
        try {
          const saved = JSON.parse(raw);
          if (saved && saved.params) {
            const restoredParams: any = { ...DEFAULTS, ...saved.params };
            // Settings saved before the background became a separate switch.
            if (saved.params.bgOn === undefined && saved.params.bgMode) {
              restoredParams.bgOn = saved.params.bgMode !== "none";
              restoredParams.bgStyle = saved.params.bgMode === "card" ? "card" : "solid";
            }
            setParams(restoredParams);
          }
          if (saved && Number(saved.duration) > 0) setDuration(Number(saved.duration));
          if (saved && CANVASES[saved.canvas]) setCanvas(saved.canvas);
          if (saved && saved.placement && context.sequenceId) setPlacement(saved.placement);
          if (saved && typeof saved.aiPrompt === "string") setAiPrompt(saved.aiPrompt);
          if (saved && (saved.uiLang === "en" || saved.uiLang === "ko" || saved.uiLang === "auto")) setUiLang(saved.uiLang);
        } catch {}
      }
      setRestored(true);
    }).catch(() => setRestored(true));
    return () => { alive = false; };
  }, []);

  React.useEffect(() => {
    if (!restored) return;
    const newParams = mode === "new" ? params : stash.current;
    if (!newParams) return;
    const h = setTimeout(() => {
      sdk.storage.setItem(STORAGE_KEY, JSON.stringify({ params: newParams, duration, canvas, placement, aiPrompt, uiLang })).catch(() => {});
    }, 400);
    return () => clearTimeout(h);
  }, [params, duration, canvas, placement, restored, mode, aiPrompt, uiLang]);

  // Saved styles live in the app's storage on this computer.
  React.useEffect(() => {
    sdk.storage.getItem(STYLES_KEY).then((raw: string | null) => {
      try {
        const list = raw ? JSON.parse(raw) : [];
        if (Array.isArray(list)) setStyles(list.filter((x: any) => x && typeof x.name === "string" && x.params && typeof x.params === "object"));
      } catch {}
    }).catch(() => {});
  }, []);

  async function writeStyles(next: Array<{ name: string; params: Record<string, any> }>): Promise<boolean> {
    try {
      await sdk.storage.setItem(STYLES_KEY, JSON.stringify(next));
      setStyles(next);
      return true;
    } catch {
      setStyleStatus({ tone: "error", text: S.styleSaveFailed });
      return false;
    }
  }

  async function saveStyle() {
    const name = styleName.trim();
    if (!name) return;
    const exists = styles.some((x) => x.name === name);
    if (exists && sdk.confirm) {
      try {
        const ok = await sdk.confirm({ title: S.styleReplaceTitle(name), message: S.styleReplaceMsg, confirmLabel: S.styleReplace });
        if (!ok) return;
      } catch { return; }
    }
    const look: Record<string, any> = {};
    for (const k of STYLE_KEYS) if (params[k] !== undefined) look[k] = params[k];
    const next = exists ? styles.map((x) => (x.name === name ? { name, params: look } : x)) : [...styles, { name, params: look }];
    if (await writeStyles(next)) {
      setStylePick(name);
      setStyleName("");
      setStyleStatus({ tone: "success", text: S.styleSaved(name) });
    }
  }

  function applyStyle(name: string) {
    const st = styles.find((x) => x.name === name);
    if (!st) return;
    setStylePick(name);
    setStylePrev(params);
    const look: Record<string, any> = {};
    for (const k of STYLE_KEYS) if (st.params[k] !== undefined) look[k] = st.params[k];
    setParams((prev) => ({ ...prev, ...look }));
    setStyleStatus({ tone: "success", text: S.styleApplied(name) });
    if (look.animate) play();
  }

  function undoStyle() {
    if (!stylePrev) return;
    const prevLook: Record<string, any> = {};
    for (const k of STYLE_KEYS) prevLook[k] = stylePrev[k];
    setParams((prev) => ({ ...prev, ...prevLook }));
    setStylePrev(null);
    setStyleStatus(null);
  }

  async function deleteStyle() {
    const name = stylePick;
    if (!name) return;
    if (sdk.confirm) {
      try {
        const ok = await sdk.confirm({ title: S.styleDeleteTitle(name), message: S.styleDeleteMsg, confirmLabel: S.styleDelete, destructive: true });
        if (!ok) return;
      } catch { return; }
    }
    if (await writeStyles(styles.filter((x) => x.name !== name))) {
      setStylePick(null);
      setStylePrev(null);
      setStyleStatus(null);
    }
  }

  async function refreshDraft(): Promise<any> {
    const seq = context.sequenceId;
    if (!seq) { setDraft(null); setCharts([]); return null; }
    try {
      const r = await sdk.runScript({
        summary: "Read draft charts",
        allowCommit: false,
        script: `
const d = selects.draft(${JSON.stringify(seq)});
const m = await d.meta();
const gs = await d.motionGraphics();
let playhead = null;
try { const st = await selects.editor.state(); if (st.playhead && st.playhead.sequenceId === ${JSON.stringify(seq)}) playhead = st.playhead.resolvedFrame; } catch (e) {}
return {
  name: m.name || "Untitled draft", width: m.frameSize.width, height: m.frameSize.height,
  durationFrames: m.durationFrames, fps: m.fps, playhead,
  charts: gs.filter(g => g.name.indexOf("Chart · ") === 0)
    .map(g => ({ id: g.clip.clipId, name: g.name, start: g.clip.startFrame, end: g.clip.endFrame })),
};`,
      });
      if (r.isError || !r.result) { setDraft(null); setCharts([]); return null; }
      const res: any = r.result;
      setDraft(res);
      setCharts(res.charts || []);
      return res;
    } catch {
      setDraft(null); setCharts([]);
      return null;
    }
  }

  function enterNew() {
    if (mode === "edit" && stash.current) setParams(stash.current);
    stash.current = null;
    setMode("new");
    setEditingId(null);
    setStatus(null);
  }

  async function enterEdit(preferId?: number) {
    if (mode === "new") stash.current = params;
    setMode("edit");
    setStatus(null);
    setBusy("load");
    try {
      const info = await refreshDraft();
      const list: any[] = (info && info.charts) || [];
      if (!list.length) { setEditingId(null); return; }
      const under = info.playhead != null ? list.find((c) => info.playhead >= c.start && info.playhead < c.end) : null;
      const pick = (preferId != null && list.find((c) => c.id === preferId)) || under || list[0];
      await loadChart(pick.id, true);
    } finally {
      setBusy(null);
    }
  }

  async function loadChart(id: number, quiet?: boolean) {
    if (!context.sequenceId) return;
    if (!quiet) setBusy("load");
    setStatus(null);
    try {
      const r = await sdk.runScript({
        summary: "Load chart settings",
        allowCommit: false,
        script: `
const d = selects.draft(${JSON.stringify(context.sequenceId)});
const g = (await d.motionGraphics()).find(x => x.clip.clipId === ${Number(id)});
if (!g) throw new Error("That chart is no longer in the draft.");
const p = await d.motionGraphicProgram(g.clip);
const link = p && p.parameters ? (p.parameters as any).linkId : "";
let bg = null;
if (link) {
  for (const x of await d.motionGraphics()) {
    if (x.name.indexOf("Chart background") !== 0) continue;
    const q = await d.motionGraphicProgram(x.clip);
    if (q && q.parameters && (q.parameters as any).linkId === link) { bg = q.parameters; break; }
  }
}
return { parameters: p ? p.parameters : null, bg };`,
      });
      if (r.isError || !r.result) { setStatus({ tone: "error", text: r.output }); return; }
      const res: any = r.result;
      if (res.parameters) {
        const loaded: any = { ...DEFAULTS, ...res.parameters };
        if (res.bg) {
          // Its background clip decides the background settings.
          loaded.bgOn = true;
          loaded.bgStyle = res.bg.style === "card" ? "card" : "solid";
          loaded.background = res.bg.color || loaded.background;
          loaded.bgRadius = Number(res.bg.radius ?? loaded.bgRadius);
        } else if (res.parameters.linkId) {
          loaded.bgOn = false;
        } else {
          // A chart from before backgrounds were separate clips.
          const legacy = String(res.parameters.bgMode || "solid");
          loaded.bgOn = legacy !== "none";
          loaded.bgStyle = legacy === "card" ? "card" : "solid";
        }
        setParams(loaded);
      }
      setEditingId(id);
    } catch (e: any) {
      setStatus({ tone: "error", text: String(e?.message || e) });
    } finally {
      if (!quiet) setBusy(null);
    }
  }

  React.useEffect(() => {
    if (mode === "edit") enterNew();
    if (context.sequenceId && placement === "new") setPlacement("start");
    if (!context.sequenceId) setPlacement("new");
    refreshDraft();
  }, [context.sequenceId]);

  const parsed: any = React.useMemo(() => kit.parse(params.data), [params.data]);
  const useDraftCanvas = (mode === "edit" || placement !== "new") && draft;
  const dims = useDraftCanvas ? { width: draft.width, height: draft.height } : CANVASES[canvas];
  const hasData = parsed.series.length > 0 && parsed.labels.length > 0;
  const type = params.chartType;
  const isPie = type === "pie" || type === "donut";
  const colorNames: string[] = isPie || (params.colorEach && parsed.series.length <= 1)
    ? parsed.labels.slice(0, 6)
    : parsed.series.map((s: any) => s.name).slice(0, 6);
  const colorCount = Math.max(1, Math.min(6, colorNames.length));
  const isBusy = busy != null;
  // Highlight works on bars and slices; its menu lists this chart's labels.
  const canHighlight = type !== "line" && parsed.labels.length > 1;
  const highlightNames: string[] = Array.from(new Set(parsed.labels.map((l: any) => String(l).trim()).filter(Boolean))) as string[];
  const highlightOn = canHighlight && highlightNames.includes(String(params.highlight || "").trim());
  const editingChart = charts.find((c) => c.id === editingId);

  // Inspector controls for a placed chart: only the colour slots this chart
  // actually uses, each named after the series, bars or slices it colours.
  function inspectorDefs() {
    const series: any[] = parsed.series || [];
    const labels: string[] = parsed.labels || [];
    const short = (s: string) => (s.length > 28 ? s.slice(0, 27) + "…" : s);
    let names: string[];
    if (isPie || (series.length <= 1 && params.colorEach)) {
      const slots = Math.max(1, Math.min(6, labels.length));
      names = Array.from({ length: slots }, (_, i) => labels.filter((_l, k) => k % 6 === i).join(", "));
    } else if (series.length > 1) {
      names = series.slice(0, 6).map((s) => String(s.name));
    } else {
      const n = String(series[0]?.name || "");
      names = [n && n !== "Value" && !/^Series \d+$/.test(n) ? n : type === "line" ? "Line" : "Bar"];
    }
    const colorDefs = names.map((name, i) => ({
      key: "color" + (i + 1), label: short(name || `Color ${i + 1}`) + " color", type: "color", defaultValue: DEFAULT_COLORS[i],
    }));
    const out: any[] = [];
    const canHighlight = type !== "line" && labels.length > 1;
    for (const def of INSPECTOR_DEFS) {
      if (/^color[1-6]$/.test(def.key)) { if (def.key === "color1") out.push(...colorDefs); continue; }
      if (def.key === "highlight") {
        if (!canHighlight) continue;
        // Options are this chart's labels; a label kept from older data stays selectable.
        const names = Array.from(new Set(labels.map((l) => String(l).trim()).filter(Boolean)));
        const cur = String(params.highlight || "").trim();
        if (cur && cur !== HIGHLIGHT_NONE && !names.includes(cur)) names.push(cur);
        out.push({ ...def, options: [{ label: "None", value: HIGHLIGHT_NONE }, ...names.map((l) => ({ label: short(l), value: l }))] });
        continue;
      }
      if ((def.key === "highlightColor" || def.key === "dimColor") && !canHighlight) continue;
      out.push(def);
    }
    return out;
  }

  async function loadFile(f: any) {
    setFile(f);
    if (!f) return;
    setBusy("file"); setStatus(null);
    try {
      const chunks: string[] = [];
      let offset = 0;
      for (;;) {
        const r = await sdk.runScript({
          summary: "Read chart data file",
          allowCommit: false,
          script: `
const path = ${JSON.stringify(f.path)};
const st = await selects.files.stat(path);
if (!st || st.isDirectory) throw new Error("not_found");
if (st.size > ${MAX_FILE}) return { tooBig: true };
const out = []; let off = ${offset}; let done = false;
for (let i = 0; i < 3; i++) {
  if (off >= st.size) { done = true; break; }
  const c = await selects.files.readRange({ path, offset: off, length: 49152 });
  if (c.bytesRead <= 0) { done = true; break; }
  out.push(c.base64); off += c.bytesRead;
}
if (off >= st.size) done = true;
return { chunks: out, next: off, done };`,
        });
        if (r.isError || !r.result) throw new Error(r.output || "read_failed");
        const res: any = r.result;
        if (res.tooBig) { setStatus({ tone: "error", text: S.fileTooBig }); return; }
        chunks.push(...res.chunks);
        offset = res.next;
        if (res.done) break;
      }
      const text = b64ToText(chunks);
      setParams((prev) => ({ ...prev, data: text.trim() }));
    } catch {
      setStatus({ tone: "error", text: S.fileFailed });
    } finally {
      setBusy(null);
    }
  }

  // The chart clip is always see-through; the background is its own clip.
  function chartParams(linkId: string) {
    return { ...params, highlight: String(params.highlight || "").trim() || HIGHLIGHT_NONE, bgMode: "none", linkId };
  }
  function bgParams(linkId: string) {
    return {
      style: params.bgStyle === "card" ? "card" : "solid",
      color: params.background,
      area: params.area || "full",
      radius: Number(params.bgRadius ?? 3),
      linkId,
    };
  }
  function bgLabel() {
    const t = String(params.title || "").trim();
    return "Chart background · " + (t || "Chart");
  }

  function chartLabel() {
    const t = String(params.title || "").trim();
    return "Chart · " + (t || S.types[type] || "Chart");
  }

  async function addChart() {
    if (!hasData) { setStatus({ tone: "error", text: S.noData }); return; }
    const seq = context.sequenceId;
    if (placement !== "new" && !seq) { setStatus({ tone: "error", text: S.needDraft }); return; }
    setBusy("add"); setStatus(null);
    const linkId = newLinkId();
    try {
      const script = `
const MODE: string = ${JSON.stringify(placement)};
const SEQ: string = ${JSON.stringify(seq || "")};
const PROJECT: string = ${JSON.stringify(context.projectId || "")};
const DUR: number = ${JSON.stringify(Math.max(0.2, Number(duration) || 5))};
const CANVAS = ${JSON.stringify(CANVASES[canvas])};
const BG_ON: boolean = ${JSON.stringify(!!params.bgOn)};
const opts = {
  label: ${JSON.stringify(chartLabel())},
  tsxCode: ${JSON.stringify(graphicTsx())},
  parameters: ${JSON.stringify(chartParams(linkId))} as any,
  editableParameters: ${JSON.stringify(inspectorDefs())} as any,
  timeIndependent: ${JSON.stringify(!params.animate)},
};
const bgOpts = {
  label: ${JSON.stringify(bgLabel())},
  tsxCode: ${JSON.stringify(BG_TSX)},
  parameters: ${JSON.stringify(bgParams(linkId))} as any,
  editableParameters: ${JSON.stringify(BG_DEFS)} as any,
  timeIndependent: true,
};
let d: any;
let name: string;
if (MODE === "new") {
  name = ${JSON.stringify(String(params.title || "").trim() || "Chart")};
  d = await selects.project(PROJECT).createDraft({ name });
  await d.setFrameSize(CANVAS);
} else {
  d = selects.draft(SEQ);
  name = (await d.meta()).name || "Untitled draft";
}
const meta = await d.meta();
let range: number[] | null = null;
if (MODE === "start" && meta.durationFrames > 0) {
  const gap = await d.insertGap({ at: { before: await d.rangeAtFrames(0, 1) }, seconds: DUR });
  range = [0, gap.deltaFrames];
} else if (MODE === "playhead") {
  const st = await selects.editor.state();
  if (!st.playhead || st.playhead.sequenceId !== SEQ) throw new Error("Show this draft in the editor so the playhead can be read.");
  const f = st.playhead.resolvedFrame;
  const end = Math.min(meta.durationFrames, f + Math.round(DUR * meta.fps));
  if (end - f < 1) throw new Error("The playhead is at the end of the draft. Move it back or choose End.");
  range = [f, end];
}
// A clip added over the same stretch lands on a new layer above, so the
// background goes in first and the chart sits on top of it.
let r: any;
if (range) {
  if (BG_ON) await d.addMotionGraphic({ ...bgOpts, within: await d.rangeAtFrames(range[0], range[1]) });
  r = await d.addMotionGraphic({ ...opts, within: await d.rangeAtFrames(range[0], range[1]) });
} else if (BG_ON) {
  const b = await d.addMotionGraphic({ ...bgOpts, durationSeconds: DUR });
  r = await d.addMotionGraphic({ ...opts, within: await d.rangeAtFrames(b.startFrame, b.endFrame) });
} else {
  r = await d.addMotionGraphic({ ...opts, durationSeconds: DUR });
}
const c = await d.commitAll("Add chart");
const id = c.createdDraftId || SEQ;
try { if (MODE === "new") await selects.editor.openDraft(id); } catch (e) {}
try { if (MODE !== "new") await selects.editor.seekDraftFrame({ projectId: PROJECT, draftSequenceId: id, resolvedFrame: r.startFrame }); } catch (e) {}
return { sequenceId: id, name, startFrame: r.startFrame };`;
      const r = await sdk.runScript({ summary: "Add chart to draft", allowCommit: true, script });
      if (r.isError) { setStatus({ tone: "error", text: r.output }); return; }
      const res: any = r.result || {};
      setStatus({ tone: "success", text: placement === "new" ? S.createdDraft(res.name || "Chart") : S.addedTo(res.name || "draft") });
      refreshDraft();
    } catch (e: any) {
      setStatus({ tone: "error", text: String(e?.message || e) });
    } finally {
      setBusy(null);
    }
  }

  async function updateChart() {
    if (editingId == null || !context.sequenceId) return;
    if (!hasData) { setStatus({ tone: "error", text: S.noData }); return; }
    setBusy("update"); setStatus(null);
    const linkId = String(params.linkId || "") || newLinkId();
    try {
      const r = await sdk.runScript({
        summary: "Update chart",
        allowCommit: true,
        script: `
const d: any = selects.draft(${JSON.stringify(context.sequenceId)});
const ID: number = ${editingId};
const OLD_LINK: string = ${JSON.stringify(String(params.linkId || ""))};
const LINK: string = ${JSON.stringify(linkId)};
const BG_ON: boolean = ${JSON.stringify(!!params.bgOn)};
const chart = {
  tsxCode: ${JSON.stringify(graphicTsx())},
  parameters: ${JSON.stringify(chartParams(linkId))} as any,
  editableParameters: ${JSON.stringify(inspectorDefs())} as any,
};
const bgOpts = {
  label: ${JSON.stringify(bgLabel())},
  tsxCode: ${JSON.stringify(BG_TSX)},
  parameters: ${JSON.stringify(bgParams(linkId))} as any,
  editableParameters: ${JSON.stringify(BG_DEFS)} as any,
  timeIndependent: true,
};
const findChart = async () => (await d.motionGraphics()).find(x => x.clip.clipId === chartId);
let chartId = ID;
let g = await findChart();
if (!g) throw new Error("That chart is no longer in the draft. Refresh the list.");
const range = [g.clip.startFrame, g.clip.endFrame];
let bg: any = null;
if (OLD_LINK) {
  for (const x of await d.motionGraphics()) {
    if (x.name.indexOf("Chart background") !== 0) continue;
    const q = await d.motionGraphicProgram(x.clip);
    if (q && q.parameters && (q.parameters as any).linkId === OLD_LINK) { bg = x; break; }
  }
}
if (BG_ON && bg) {
  await d.setMotionGraphicProgram({ clip: bg.clip, tsxCode: bgOpts.tsxCode, parameters: bgOpts.parameters, editableParameters: bgOpts.editableParameters });
  g = await findChart();
  await d.setMotionGraphicProgram({ clip: g!.clip, ...chart });
} else if (BG_ON) {
  // Background goes in first (it lands above the chart for now), then the chart
  // is placed again on top with the same settings.
  await d.addMotionGraphic({ ...bgOpts, within: await d.rangeAtFrames(range[0], range[1]) });
  g = await findChart();
  const keepTimeIndependent = ${JSON.stringify(!params.animate)};
  await d.removeClips(g!.clip);
  const nr = await d.addMotionGraphic({ label: g!.name, ...chart, within: await d.rangeAtFrames(range[0], range[1]), timeIndependent: keepTimeIndependent });
  chartId = nr.clipId;
} else {
  if (bg) await d.removeClips(bg.clip);
  g = await findChart();
  await d.setMotionGraphicProgram({ clip: g!.clip, ...chart });
}
await d.commitAll("Update chart");
try { await selects.editor.seekDraftFrame({ projectId: ${JSON.stringify(context.projectId || "")}, draftSequenceId: ${JSON.stringify(context.sequenceId)}, resolvedFrame: range[0] }); } catch (e) {}
return { chartId };`,
      });
      if (r.isError) { setStatus({ tone: "error", text: r.output }); return; }
      const res: any = r.result || {};
      setParams((prev) => ({ ...prev, linkId }));
      if (res.chartId != null) setEditingId(res.chartId);
      setStatus({ tone: "success", text: S.updated });
      refreshDraft();
    } catch (e: any) {
      setStatus({ tone: "error", text: String(e?.message || e) });
    } finally {
      setBusy(null);
    }
  }

  // Read a local file as base64, a few chunks per script call.
  async function readFileBase64(path: string, maxBytes: number): Promise<string> {
    const parts: string[] = [];
    let offset = 0;
    for (;;) {
      const r = await sdk.runScript({
        summary: "Read file",
        allowCommit: false,
        script: `
const path = ${JSON.stringify(path)};
const st = await selects.files.stat(path);
if (!st || st.isDirectory) throw new Error("not_found");
if (st.size > ${maxBytes}) throw new Error("too_big");
const out = []; let off = ${offset};
for (let i = 0; i < 3 && off < st.size; i++) {
  const c = await selects.files.readRange({ path, offset: off, length: 49152 });
  if (c.bytesRead <= 0) break;
  out.push(c.base64); off += c.bytesRead;
}
return { chunks: out, next: off, done: off >= st.size };`,
      });
      if (r.isError || !r.result) throw new Error(r.output || "read_failed");
      const res: any = r.result;
      parts.push(...res.chunks);
      offset = res.next;
      if (res.done || !res.chunks.length) break;
    }
    // Every chunk but the last is a multiple of 3 bytes, so the base64 joins cleanly.
    return parts.join("");
  }

  // Shrink a reference image to at most 1024 px wide (bundled FFmpeg), then load it.
  async function addRef(f: any) {
    if (!f) return;
    if (refs.length >= 4) { setAiStatus({ tone: "error", text: S.refMax }); return; }
    setBusy("ref"); setAiStatus(null);
    try {
      const prep = await sdk.runScript({
        summary: "Prepare reference image",
        allowCommit: true,
        script: `
const SRC = ${JSON.stringify(f.path)};
const env = await selects.files.environment();
const BS = String.fromCharCode(92);
const sep = env.platform === "win32" ? BS : "/";
const dir = env.tempDirectory;
const out = (dir.endsWith("/") || dir.endsWith(BS) ? dir : dir + sep) + "chartmaker-ref-" + Date.now() + ".jpg";
let ok = false;
try {
  const job = selects.media.job((await selects.media.startFFmpeg({ args: ["-y", "-i", SRC, "-vf", "scale='min(1024,iw)':-2", "-frames:v", "1", "-q:v", "4", out] })).jobId);
  for (let i = 0; i < 5000; i++) { const s = await job.status(); if (s.state !== "running") { ok = s.state === "succeeded"; break; } }
} catch (e) {}
if (ok) { const st = await selects.files.stat(out); ok = !!st && st.size > 0; }
return { path: ok ? out : SRC, converted: ok };`,
      });
      if (prep.isError || !prep.result) throw new Error(prep.output || "prepare_failed");
      const pr: any = prep.result;
      const ext = String(f.name || "").toLowerCase().split(".").pop() || "";
      const mime = pr.converted ? "image/jpeg"
        : ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "gif" ? "image/gif" : "image/jpeg";
      const b64 = await readFileBase64(pr.path, pr.converted ? 4_000_000 : 1_100_000);
      if (pr.converted) {
        sdk.runScript({ summary: "Remove temporary image", allowCommit: true, script: `await selects.files.remove(${JSON.stringify(pr.path)}, { force: true }); return true;` }).catch(() => {});
      }
      if (!b64 || b64.length > 1_400_000) throw new Error("too_big");
      setRefs((prev) => [...prev, { name: f.name, dataUrl: `data:${mime};base64,${b64}` }].slice(0, 4));
    } catch {
      setAiStatus({ tone: "error", text: S.refFailed });
    } finally {
      setBusy(null);
    }
  }

  async function designWithAI(useChatModel?: boolean) {
    if (!refs.length && !aiPrompt.trim()) { setAiStatus({ tone: "error", text: S.aiNeedInput }); return; }
    setBusy("ai"); setAiStatus(null); setAiOffline(false);
    const run = ++aiRun.current;
    const stale = () => run !== aiRun.current;
    const before = params;
    try {
      const current: Record<string, any> = {};
      for (const k of Object.keys(AI_SPEC)) current[k] = before[k];
      // Charts with Korean text may also use the Korean fonts installed here.
      const koText = HAS_HANGUL.test([before.title, before.source, ...parsed.labels, ...parsed.series.map((x: any) => x.name)].join(" "));
      const koFonts = installedKoreanFonts();
      const fonts = [...AI_FONTS, ...koFonts];
      const prompt = [
        "You are styling a data chart that will appear in a video.",
        "Reply with a single JSON object only: no prose, no code fences. Do not use any tools and do not change anything in the project.",
        "",
        `Chart: ${before.chartType}; categories: ${parsed.labels.slice(0, 20).join(", ") || "(none yet)"}; series: ${parsed.series.map((x: any) => x.name).join(", ") || "(none yet)"}.`,
        `Frame: ${dims.width}x${dims.height}. ${placement === "playhead" ? "It will sit on top of existing video." : ""}`,
        "",
        "Current settings:",
        JSON.stringify(current),
        "",
        "Settings you may change (key: allowed values):",
        "- chartType: bar | hbar | line | pie | donut (only when the instructions ask for another kind of chart)",
        "- title: text (only when the instructions ask)",
        `- fontFamily: one of ${fonts.join(", ")}; or "" for the default sans-serif`,
        koFonts.length
          ? `  The Korean fonts (${koFonts.join(", ")}) also cover Korean text.${koText ? " This chart has Korean text: pick one of those Korean fonts, or one from the list closest to the reference that still reads clearly." : ""}`
          : "",
        "- titleSize 1-20, valueSize 1-15, labelSize 1-15 (percent of the frame's shorter side); titleWeight: \"400\" | \"500\" | \"600\" | \"700\" | \"900\"",
        "- colors as hex #RRGGBB (or #RRGGBBAA for transparency): background, titleColor, valueColor, labelColor, axisColor, color1..color6 (series, bar or slice colors in order)",
        "- bgOn: true/false (a background behind the chart); bgStyle: solid (whole frame) | card (behind the chart only); bgRadius 0-10 (card corners); textOutline: true/false (thin dark edge on text, for busy video)",
        "- area: full | center | left | right | top | bottom | topLeft | topRight | bottomLeft | bottomRight",
        "- true/false: colorEach, showGrid, showBaseline, showValues, showLabels, showLegend, showPoints, fillArea, thousands, showTitle, animate",
        "- barWidth 5-100, cornerRadius 0-10, lineWidth 1-30, donutHole 10-90, chartWidth 20-100",
        "- valuePrefix, valueSuffix: short text; decimals: auto | 0 | 1 | 2; pieValues: percent | value | both",
        "- highlight: one category name exactly as listed above, to make that one bar or slice stand out (or \"\" for none). With one series or a pie, it takes highlightColor and every other bar or slice takes dimColor. With several series, the other groups fade. Use it when a reference colors one bar or slice differently, or the instructions ask to emphasise one item.",
        "- animStyle: draw | cascade | bounce | fade; animSeconds 0.3-5",
        "",
        refs.length
          ? `The ${refs.length} attached image(s) are design references. Match their color palette, typography feel, contrast and mood; take colors from the images.`
          : "",
        `Instructions from the editor: ${aiPrompt.trim() || "(none; take the style from the references)"}`,
        "",
        "Keep all text clearly readable against the background. Change only what serves the references and instructions.",
        'Return exactly: {"changes": { only the keys you change }, "summary": "one short sentence describing the new look"}',
      ].join("\n");
      // Bill Selects credits when the account is connected, unless the editor
      // explicitly chose their chat model after a failure.
      let provider: any = undefined;
      if (!useChatModel && sdk.aiProviders) {
        try { const st = await sdk.aiProviders(); if (st && st.selects === "connected") provider = "selects"; } catch {}
      }
      const request = {
        prompt,
        images: refs.map((x) => ({ dataUrl: x.dataUrl, name: x.name })),
        timeoutMs: 240_000,
        ...(provider ? { provider } : {}),
      };
      const transient = (e: any) => /\b5\d\d\b|unavailable|timed? ?out|temporar/i.test(String(e?.message || e));
      let r: any;
      try {
        r = await sdk.askAI(request);
      } catch (e1: any) {
        if (stale()) return;
        if (!transient(e1)) throw e1;
        await new Promise((ok) => setTimeout(ok, 2000)); // one quiet retry for a passing server error
        if (stale()) return;
        try {
          r = await sdk.askAI(request);
        } catch (e2: any) {
          if (stale()) return;
          if (provider && transient(e2)) {
            setAiOffline(true);
            setAiStatus({ tone: "error", text: S.aiServiceDown(String(e2?.message || e2)) });
            return;
          }
          throw e2;
        }
      }
      if (stale()) return;
      const json = extractJson(r && r.text);
      if (!json) { setAiStatus({ tone: "error", text: S.aiFailed }); return; }
      const changes = sanitizeAiChanges(json.changes || json, before, parsed.labels, fonts);
      const n = Object.keys(changes).length;
      if (!n) { setAiStatus({ tone: "muted", text: S.aiNoChanges }); return; }
      setAiPrev(before);
      setParams((prev) => ({ ...prev, ...changes }));
      setAiStatus({ tone: "success", text: S.aiApplied(String(json.summary || "").slice(0, 200), n) });
      if ((changes.animate ?? before.animate)) play();
    } catch (e: any) {
      if (stale()) return;
      if (sdk.handleDesktopRequired && sdk.handleDesktopRequired(e)) return;
      setAiStatus({ tone: "error", text: String(e?.message || e) });
    } finally {
      if (!stale()) setBusy(null);
    }
  }

  function stopAI() {
    aiRun.current++;
    setBusy(null);
    setAiStatus({ tone: "muted", text: S.aiStopped });
  }

  function undoAI() {
    if (!aiPrev) return;
    setParams((prev) => ({ ...aiPrev, data: prev.data }));
    setAiPrev(null);
    setAiStatus(null);
  }

  // A blank new chart: no data, no title, default look.
  async function startOver() {
    if (sdk.confirm) {
      try {
        const ok = await sdk.confirm({ title: S.startOverTitle, message: S.startOverMsg, confirmLabel: S.startOver });
        if (!ok) return;
      } catch {}
    }
    setParams({ ...DEFAULTS, data: "", title: "" });
    setFile(null);
    setStatus(null);
    setTab("data");
  }

  function resetDesign() {
    setParams((prev) => {
      const next = { ...prev };
      for (const k of DESIGN_KEYS) next[k] = DEFAULTS[k];
      return next;
    });
  }

  const opts = (obj: any) => Object.entries(obj).map(([value, label]) => ({ value, label: label as string }));
  const fps = draft?.fps || 30;
  const solidOverVideo = mode === "new" && placement === "playhead" && params.bgOn && params.bgStyle !== "card";
  const previewParams = React.useMemo(
    () => ({ ...params, bgMode: params.bgOn ? (params.bgStyle === "card" ? "card" : "solid") : "none",
      msgEmpty: S.msgEmpty, msgNoNumbers: S.msgNoNumbers, msgPie: S.msgPie }),
    [params, S],
  );

  // ---- Always visible: preview, play, and the one action -------------------
  const header = (
    <ui.Stack gap={8}>
      <ChartPreview kit={kit} measure={measure} params={previewParams} dims={dims} playToken={playToken} />
      <ui.Row align="center">
        {params.animate ? (
          <ui.Button variant="ghost" icon="play" onClick={play}>{S.play}</ui.Button>
        ) : (
          <ui.Button variant="ghost" icon="play" onClick={() => setAnim("animate")(true)}>{S.animOff}</ui.Button>
        )}
        {mode === "new" && (
          <ui.Button variant="ghost" icon="refresh" onClick={startOver} disabled={isBusy}>{S.startOver}</ui.Button>
        )}
      </ui.Row>
      <ui.Segmented
        label={S.modeLabel}
        value={mode}
        onChange={(v: string) => (v === "edit" ? enterEdit() : enterNew())}
        options={[{ value: "new", label: S.modeNew }, { value: "edit", label: S.modeEdit }]}
        disabled={isBusy || !context.sequenceId}
      />
      {mode === "edit" && (
        charts.length ? (
          <ui.Row align="center">
            <div style={{ flex: 1, minWidth: 0 }}>
              <ui.Select
                label={S.pickChart}
                value={editingId != null ? String(editingId) : null}
                onChange={(v: string) => loadChart(Number(v))}
                options={charts.map((c) => ({ value: String(c.id), label: `${c.name.replace(/^Chart · /, "")} · ${fmtTime(c.start, fps)}` }))}
                disabled={isBusy}
              />
            </div>
            <ui.IconButton icon="refresh" label={S.refresh} onClick={() => enterEdit(editingId ?? undefined)} disabled={isBusy} />
          </ui.Row>
        ) : (
          busy === "load" ? <ui.Progress label={S.loadingChart} /> : <ui.Message>{S.noCharts}</ui.Message>
        )
      )}
      <ui.Actions>
        {mode === "edit" && editingId != null && (
          <ui.Button variant="secondary" onClick={addChart} busy={busy === "add"} busyLabel={S.adding} disabled={isBusy || !hasData}>{S.addCopy}</ui.Button>
        )}
        {mode === "edit" ? (
          <ui.Button variant="primary" onClick={updateChart} busy={busy === "update"} busyLabel={S.updating} disabled={isBusy || editingId == null || !hasData}>{S.update}</ui.Button>
        ) : (
          <ui.Button variant="primary" onClick={addChart} busy={busy === "add"} busyLabel={S.adding}
            disabled={isBusy || !hasData || (placement !== "new" && !context.sequenceId)}>{S.add}</ui.Button>
        )}
      </ui.Actions>
      {mode === "edit" && editingChart && <ui.Message>{S.editing(editingChart.name.replace(/^Chart · /, ""), fmtTime(editingChart.start, fps))}</ui.Message>}
      {mode === "new" && <ui.Message>{S.summaryNew(S.places[placement], Number(duration) || 5, S.areas[params.area] || S.areas.full) + (params.bgOn ? "" : " · " + S.noBackground)}</ui.Message>}
      {solidOverVideo && (
        <ui.Row align="center">
          <ui.Message>{S.solidOverVideo}</ui.Message>
          <ui.Button variant="ghost" onClick={() => set("bgOn")(false)}>{S.seeThrough}</ui.Button>
        </ui.Row>
      )}
      {placement !== "new" && !context.sequenceId && mode === "new" && <ui.Message tone="error">{S.needDraft}</ui.Message>}
      {status && <ui.Message tone={status.tone}>{status.text}</ui.Message>}
    </ui.Stack>
  );

  // ---- Tabs ------------------------------------------------------------------
  const dataTab = (
    <>
      <ui.Section title={S.chartType}>
        <ui.Select label={S.chartType} value={type} onChange={set("chartType")} options={opts(S.types)} />
      </ui.Section>
      <ui.Section title={S.data}>
        <ui.Message>{S.fileTypes}</ui.Message>
        <ui.FileDrop
          accept={["csv", "tsv", "txt"]}
          labels={{ drop: S.dropLabel }}
          value={file}
          onChange={loadFile}
          onReject={(reason: string) => setStatus({ tone: "error", text: reason === "type" ? S.fileType : S.fileFailed })}
          disabled={isBusy}
        />
        {busy === "file" && <ui.Progress label={S.loading} />}
        <ui.TextField
          label={S.paste}
          labelAction={params.data ? (
            <ui.Button variant="ghost" onClick={() => { set("data")(""); setFile(null); }} disabled={isBusy}>{S.clearData}</ui.Button>
          ) : undefined}
          multiline
          value={params.data}
          onChange={set("data")}
          placeholder={S.pastePlaceholder}
        />
        {hasData
          ? <ui.Message>{S.parsed(parsed.labels.length, parsed.series.length)}</ui.Message>
          : <ui.Message tone="error">{parsed.error || S.noData}</ui.Message>}
        {hasData && parsed.cut && (parsed.cut.rows > 0 || parsed.cut.series.length > 0) && (
          <ui.Message tone="error">{S.cutWarn(parsed.cut.rows, parsed.cut.from, parsed.cut.to, parsed.cut.series)}</ui.Message>
        )}
      </ui.Section>
    </>
  );

  const aiTab = (
    <>
      <ui.Section title={S.refs}>
        <ui.Message>{S.refsHint}</ui.Message>
        {refs.length > 0 && (
          <ui.Grid minItemWidth={96}>
            {refs.map((ref, i) => (
              <div key={i} style={{ position: "relative", minWidth: 0 }}>
                <img src={ref.dataUrl} alt={ref.name} style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: "var(--panel-radius)", display: "block" }} />
                <div style={{ position: "absolute", top: 4, right: 4 }}>
                  <ui.IconButton icon="close" label={S.removeRef} onClick={() => setRefs((prev) => prev.filter((_, k) => k !== i))} disabled={isBusy} />
                </div>
              </div>
            ))}
          </ui.Grid>
        )}
        {refs.length < 4 && (
          <ui.FileDrop
            accept={["image"]}
            value={null}
            onChange={addRef}
            onReject={(reason: string) => setAiStatus({ tone: "error", text: reason === "type" ? S.refType : S.refFailed })}
            disabled={isBusy}
          />
        )}
        {busy === "ref" && <ui.Progress label={S.refLoading} />}
      </ui.Section>
      <ui.Section title={S.instructions}>
        <ui.TextField multiline value={aiPrompt} onChange={setAiPrompt} placeholder={S.instructionsPlaceholder} disabled={busy === "ai"} />
        <ui.Actions>
          {aiPrev && <ui.Button variant="ghost" onClick={undoAI} disabled={isBusy}>{S.aiUndo}</ui.Button>}
          <ui.Button variant="secondary" icon="sparkles" onClick={() => designWithAI()} busy={busy === "ai"} busyLabel={S.aiWorking}
            disabled={isBusy || (!refs.length && !aiPrompt.trim())}>{S.aiApply}</ui.Button>
        </ui.Actions>
        <ui.Message>{S.aiCredits}</ui.Message>
        {busy === "ai" && (
          <>
            <ui.Progress label={S.aiWorking} />
            <ui.Actions>
              <ui.Button variant="secondary" icon="close" onClick={stopAI}>{S.aiStop}</ui.Button>
            </ui.Actions>
          </>
        )}
        {aiStatus && <ui.Message tone={aiStatus.tone}>{aiStatus.text}</ui.Message>}
        {aiOffline && !isBusy && (
          <ui.Actions>
            <ui.Button variant="ghost" onClick={() => designWithAI(true)}>{S.aiUseChatModel}</ui.Button>
            <ui.Button variant="secondary" onClick={() => designWithAI()}>{S.aiRetry}</ui.Button>
          </ui.Actions>
        )}
      </ui.Section>
    </>
  );

  const designTab = (
    <>
      <ui.Section title={S.styles}>
        {styles.length ? (
          <ui.Row align="center">
            <div style={{ flex: 1, minWidth: 0 }}>
              <ui.Select label={S.stylePick} value={stylePick && styles.some((x) => x.name === stylePick) ? stylePick : null}
                placeholder={S.stylePlaceholder} onChange={applyStyle}
                options={styles.map((x) => ({ value: x.name, label: x.name }))} disabled={isBusy} />
            </div>
            {stylePick && styles.some((x) => x.name === stylePick) && (
              <ui.IconButton icon="trash" label={S.styleDelete} onClick={deleteStyle} disabled={isBusy} />
            )}
          </ui.Row>
        ) : (
          <ui.Message>{S.noStyles}</ui.Message>
        )}
        <ui.TextField label={S.styleName} value={styleName} onChange={setStyleName} placeholder={S.styleNamePlaceholder} disabled={isBusy} />
        <ui.Actions>
          {stylePrev && <ui.Button variant="ghost" onClick={undoStyle} disabled={isBusy}>{S.styleUndo}</ui.Button>}
          <ui.Button variant="secondary" onClick={saveStyle} disabled={isBusy || !styleName.trim()}>{S.styleSave}</ui.Button>
        </ui.Actions>
        <ui.Message>{S.stylesHint}</ui.Message>
        {styleStatus && <ui.Message tone={styleStatus.tone}>{styleStatus.text}</ui.Message>}
      </ui.Section>
      <ui.Section title={S.colors}>
        {params.bgOn && <ui.ColorField label={S.background} value={params.background} onChange={set("background")} />}
        {!(highlightOn && (isPie || parsed.series.length <= 1)) && Array.from({ length: colorCount }, (_, i) => (
          <ui.ColorField key={i} label={colorNames[i] || `${i + 1}`} value={params["color" + (i + 1)]} onChange={set("color" + (i + 1))} />
        ))}
        {!isPie && parsed.series.length <= 1 && !highlightOn && (
          <ui.Toggle label={S.colorEach} value={!!params.colorEach} onChange={set("colorEach")} />
        )}
        {canHighlight && (
          <>
            <ui.Select label={S.highlight} value={highlightOn ? String(params.highlight).trim() : HIGHLIGHT_NONE}
              onChange={(v: string) => set("highlight")(v === HIGHLIGHT_NONE ? "" : v)}
              options={[{ value: HIGHLIGHT_NONE, label: S.highlightNone }, ...highlightNames.map((l) => ({ value: l, label: l }))]} />
            {highlightOn && (isPie || parsed.series.length <= 1) && (
              <>
                <ui.ColorField label={S.highlightColor} value={params.highlightColor} onChange={set("highlightColor")} />
                <ui.ColorField label={S.dimColor} value={params.dimColor} onChange={set("dimColor")} />
              </>
            )}
            {highlightOn && <ui.Message>{isPie || parsed.series.length <= 1 ? S.highlightHint : S.highlightHintMulti}</ui.Message>}
          </>
        )}
        {!isPie && <ui.ColorField label={S.axisColor} value={params.axisColor} onChange={set("axisColor")} />}
      </ui.Section>
      <ui.Section title={S.layout}>
        <ui.Slider label={S.chartWidth} unit="%" min={20} max={100} step={1} value={params.chartWidth} onChange={set("chartWidth")} />
        {!isPie && <ui.Toggle label={S.showGrid} value={!!params.showGrid} onChange={set("showGrid")} />}
        {!isPie && <ui.Toggle label={S.showBaseline} value={!!params.showBaseline} onChange={set("showBaseline")} />}
        {(type === "line" || type === "bar") && (
          <>
            <ui.Toggle label={S.axisLines} value={!!params.axisLines} onChange={set("axisLines")} />
            <ui.Toggle label={S.axisMarks} value={!!params.axisMarks} onChange={set("axisMarks")} />
          </>
        )}
        {(type === "bar" || type === "hbar") && (
          <>
            <ui.Slider label={S.barWidth} unit="%" min={5} max={100} step={1} value={params.barWidth} onChange={set("barWidth")} />
            <ui.Slider label={S.cornerRadius} min={0} max={10} step={0.5} value={params.cornerRadius} onChange={set("cornerRadius")} />
          </>
        )}
        {type === "line" && (
          <>
            <ui.Slider label={S.lineWidth} min={1} max={30} step={1} value={params.lineWidth} onChange={set("lineWidth")} />
            <ui.Toggle label={S.showPoints} value={!!params.showPoints} onChange={set("showPoints")} />
            <ui.Toggle label={S.fillArea} value={!!params.fillArea} onChange={set("fillArea")} />
          </>
        )}
        {type === "donut" && (
          <ui.Slider label={S.donutHole} unit="%" min={10} max={90} step={1} value={params.donutHole} onChange={set("donutHole")} />
        )}
        <ui.Actions>
          <ui.Button variant="ghost" onClick={resetDesign} disabled={isBusy}>{S.reset}</ui.Button>
        </ui.Actions>
      </ui.Section>
    </>
  );

  const textTab = (
    <>
      <ui.Section title={S.title}>
        <ui.TextField label={S.titleText} value={params.title} onChange={set("title")} />
        <ui.Toggle label={S.showTitle} value={!!params.showTitle} onChange={set("showTitle")} />
        <ui.FontField label={S.font} value={params.fontFamily} onChange={set("fontFamily")} />
        <ui.Slider label={S.size} min={1} max={20} step={0.5} value={params.titleSize} onChange={set("titleSize")} />
        <ui.Select label={S.weight} value={String(params.titleWeight)} onChange={set("titleWeight")} options={opts(S.weights)} />
        <ui.ColorField label={S.color} value={params.titleColor} onChange={set("titleColor")} />
      </ui.Section>
      <ui.Section title={S.values}>
        <ui.Toggle label={S.showValues} value={!!params.showValues} onChange={set("showValues")} />
        <ui.Slider label={S.size} min={1} max={15} step={0.5} value={params.valueSize} onChange={set("valueSize")} />
        <ui.ColorField label={S.color} value={params.valueColor} onChange={set("valueColor")} />
        {isPie && <ui.Segmented label={S.pieValues} value={params.pieValues} onChange={set("pieValues")} options={opts(S.pieModes)} />}
        <ui.TextField label={S.prefix} value={params.valuePrefix} onChange={set("valuePrefix")} />
        <ui.TextField label={S.suffix} value={params.valueSuffix} onChange={set("valueSuffix")} />
        <ui.Select label={S.decimals} value={String(params.decimals)} onChange={set("decimals")}
          options={[{ value: "auto", label: S.auto }, { value: "0", label: "0" }, { value: "1", label: "1" }, { value: "2", label: "2" }]} />
        <ui.Toggle label={S.thousands} value={!!params.thousands} onChange={set("thousands")} />
      </ui.Section>
      <ui.Section title={S.source}>
        <ui.TextField label={S.sourceText} value={params.source || ""} onChange={set("source")} placeholder={S.sourcePlaceholder} />
        <ui.Message>{S.sourceHint}</ui.Message>
        {String(params.source || "").trim() && (
          <>
            <ui.Segmented label={S.align} value={params.sourceAlign || "left"} onChange={set("sourceAlign")} options={opts(S.aligns)} />
            <ui.Slider label={S.size} min={1} max={8} step={0.1} value={Number(params.sourceSize ?? 2.6)} onChange={set("sourceSize")} />
          </>
        )}
      </ui.Section>
      <ui.Section title={S.labels}>
        <ui.Toggle label={S.showLabels} value={!!params.showLabels} onChange={set("showLabels")} />
        <ui.Slider label={S.size} min={1} max={15} step={0.5} value={params.labelSize} onChange={set("labelSize")} />
        <ui.ColorField label={S.color} value={params.labelColor} onChange={set("labelColor")} />
        {!isPie && parsed.series.length > 1 && (
          <ui.Toggle label={S.showLegend} value={!!params.showLegend} onChange={set("showLegend")} />
        )}
      </ui.Section>
    </>
  );

  const motionTab = (
    <ui.Section title={S.motion}>
      <ui.Toggle label={S.animate} value={!!params.animate} onChange={setAnim("animate")} />
      {params.animate && (
        <>
          <ui.Select label={S.animStyle} value={String(params.animStyle || "draw")} onChange={setAnim("animStyle")} options={opts(S.animStyles)} />
          <ui.Message>{S.animStyleHints[params.animStyle || "draw"]}</ui.Message>
          <ui.Slider label={S.animSeconds} unit="s" min={0.3} max={5} step={0.1} value={params.animSeconds} onChange={setAnim("animSeconds")} />
          <ui.Actions>
            <ui.Button variant="secondary" icon="play" onClick={play}>{S.play}</ui.Button>
          </ui.Actions>
        </>
      )}
    </ui.Section>
  );

  const placeTab = (
    <>
      <ui.Section title={S.where}>
        {mode === "edit" ? (
          <ui.Message>{S.editPlaceNote}</ui.Message>
        ) : (
          <>
            <ui.Segmented label={S.where} value={placement} onChange={setPlacement} options={opts(S.places)} disabled={isBusy} />
            <ui.Message>{S.placeHints[placement]}</ui.Message>
            {placement === "new" && (
              <ui.Segmented label={S.canvas} value={canvas} onChange={setCanvas}
                options={Object.keys(CANVASES).map((k) => ({ value: k, label: k }))} disabled={isBusy} />
            )}
            <ui.NumberField label={S.duration} unit="s" min={0.2} max={600} step={0.5} value={duration} onChange={setDuration} disabled={isBusy} />
          </>
        )}
      </ui.Section>
      <ui.Section title={S.onScreen}>
        <ui.Select label={S.screenPos} value={params.area || "full"} onChange={set("area")} options={opts(S.areas)} />
        <ui.Toggle label={S.bgOn} value={!!params.bgOn} onChange={set("bgOn")} />
        <ui.Message>{S.bgOnHint}</ui.Message>
        {params.bgOn && (
          <>
            <ui.Segmented label={S.bgStyle} value={params.bgStyle === "card" ? "card" : "solid"} onChange={set("bgStyle")} options={opts(S.bgStyles)} />
            <ui.Message>{S.bgStyleHints[params.bgStyle === "card" ? "card" : "solid"]}</ui.Message>
            <ui.ColorField label={S.background} value={params.background} onChange={set("background")} />
            {params.bgStyle === "card" && (
              <ui.Slider label={S.bgRadius} min={0} max={10} step={0.5} value={Number(params.bgRadius ?? 3)} onChange={set("bgRadius")} />
            )}
          </>
        )}
        <ui.Toggle label={S.textOutline} value={!!params.textOutline} onChange={set("textOutline")} />
        <ui.Message>{S.textOutlineHint}</ui.Message>
      </ui.Section>
    </>
  );

  const mark = (v: string, label: string) => (uiLang === v ? "✓ " : "   ") + label;
  const langMenu = ui.version >= 4 ? (
    <ui.Menu
      label={S.language}
      icon="translate"
      items={[
        { heading: S.language },
        { label: mark("auto", S.langAuto), onSelect: () => setUiLang("auto") },
        { label: mark("en", S.langEn), onSelect: () => setUiLang("en") },
        { label: mark("ko", S.langKo), onSelect: () => setUiLang("ko") },
      ]}
    />
  ) : undefined;

  const tabs = [
    { value: "data", label: S.tabs.data, content: dataTab },
    { value: "ai", label: S.tabs.ai, content: aiTab },
    { value: "design", label: S.tabs.design, content: designTab },
    { value: "text", label: S.tabs.text, content: textTab },
    { value: "motion", label: S.tabs.motion, content: motionTab },
    { value: "place", label: S.tabs.place, content: placeTab },
  ];

  return (
    <div>
      {header}
      <div style={{ height: 12 }} />
      <ui.Tabs value={tab} onChange={setTab} tabs={tabs} variant={ui.version >= 4 ? "strip" : undefined} actions={langMenu} />
      {ui.version < 4 && (
        <ui.Select label={S.language} value={uiLang} onChange={setUiLang}
          options={[{ value: "auto", label: S.langAuto }, { value: "en", label: S.langEn }, { value: "ko", label: S.langKo }]} />
      )}
    </div>
  );
}
