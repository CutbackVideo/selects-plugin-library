// @name 8-Clip Daily Vlog
// @name:de 8-Clip Daily Vlog
// @name:en 8-Clip Daily Vlog
// @name:es Vlog diario de 8 clips
// @name:fr Vlog quotidien en 8 clips
// @name:it Vlog quotidiano in 8 clip
// @name:ja 8クリップ・デイリーVlog
// @name:ko 8-Clip Daily Vlog
// @name:pt Vlog diario de 8 clipes
// @name:tr 8 Klipli Gunluk Vlog
// @name:zh 8 段日常 Vlog
// @collection visual-highlights
// @icon video
// Builds an editable 8-clip daily vlog Draft from a project folder, with title animation, transitions and bundled audio.
import React from "react";

const TEXT = {
  "en": {
    "intro": "Choose the project folder your footage is in, then pick only the opening clip that carries the yellow title. The other seven slots are filled at random from that folder.",
    "folderTitle": "1. Footage folder",
    "folderLabel": "Project folder",
    "refresh": "Refresh folder list",
    "folderHint": "Only folders already in the project are listed. Import new footage in Selects first.",
    "rootFolder": "(files outside any folder)",
    "loadingFolders": "Reading project folders\u2026",
    "loadingVideos": "Reading the folder's videos\u2026",
    "noFolders": "No folder in this project holds video.",
    "noVideos": "No video in this folder.",
    "videosFound": "",
    "videosFoundTail": " usable videos",
    "titleTitle": "2. Yellow title clip",
    "titleLabel": "Opening clip",
    "titleHint": "Only clips of 4.3s or longer can be used here.",
    "restTitle": "3. The other seven",
    "restAuto": "Filled at random from the folder.",
    "reshuffle": "Shuffle again",
    "restManual": "Some slots could not be filled automatically. Choose them yourself \u2014 the same clip may be used more than once.",
    "showManual": "Choose them myself",
    "hideManual": "Collapse",
    "slotEmpty": "Empty",
    "build": "Create vlog Draft",
    "building": "Creating vlog\u2026",
    "noProject": "Open a Selects project first.",
    "made": "Created an editable Draft",
    "needAll": "Fill all eight slots.",
    "needFolder": "Choose the footage folder first.",
    "failed": "Could not create the Draft: ",
    "credit": "Camera sound: theplax \u00b7 CC BY 4.0 (credit required on publication)",
    "slots": [
      "Opening \u00b7 travel",
      "Everyday place",
      "Activity \u00b7 detail",
      "Moving scenery",
      "Walking \u00b7 movement",
      "Small discovery",
      "Rest \u00b7 portrait",
      "Closing close-up"
    ]
  },
  "ko": {
    "intro": "\ud478\ud2f0\uc9c0\uac00 \ub4e4\uc5b4\uc788\ub294 \ud504\ub85c\uc81d\ud2b8 \ud3f4\ub354\ub97c \uace0\ub974\uace0, \ub178\ub780 \uc81c\ubaa9\uc774 \ub728\ub294 \uccab \uad6c\uac04\ub9cc \uc9c0\uc815\ud558\uc138\uc694. \ub098\uba38\uc9c0 7\uce78\uc740 \uadf8 \ud3f4\ub354 \uc548 \uc601\uc0c1\uc5d0\uc11c \ubb34\uc791\uc704\ub85c \ucc44\uc6c1\ub2c8\ub2e4.",
    "folderTitle": "1. \ud478\ud2f0\uc9c0 \ud3f4\ub354",
    "folderLabel": "\ud504\ub85c\uc81d\ud2b8 \ud3f4\ub354",
    "refresh": "\ud3f4\ub354 \ubaa9\ub85d \uc0c8\ub85c\uace0\uce68",
    "folderHint": "\ud504\ub85c\uc81d\ud2b8\uc5d0 \uc774\ubbf8 \ub4e4\uc5b4\uc640 \uc788\ub294 \ud3f4\ub354\ub9cc \ub098\uc635\ub2c8\ub2e4. \uc0c8 \ucd2c\uc601\ubcf8\uc740 Selects\uc5d0\uc11c \uba3c\uc800 \uac00\uc838\uc624\uc138\uc694.",
    "rootFolder": "(\ud3f4\ub354 \uc5c6\ub294 \ud30c\uc77c)",
    "loadingFolders": "\ud504\ub85c\uc81d\ud2b8 \ud3f4\ub354\ub97c \uc77d\ub294 \uc911\u2026",
    "loadingVideos": "\ud3f4\ub354 \uc548 \uc601\uc0c1\uc744 \uc77d\ub294 \uc911\u2026",
    "noFolders": "\uc774 \ud504\ub85c\uc81d\ud2b8\uc5d0 \uc601\uc0c1\uc774 \ub4e0 \ud3f4\ub354\uac00 \uc5c6\uc2b5\ub2c8\ub2e4.",
    "noVideos": "\uc774 \ud3f4\ub354\uc5d0 \uc601\uc0c1\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.",
    "videosFound": "\uc4f8 \uc218 \uc788\ub294 \uc601\uc0c1 ",
    "videosFoundTail": "\uac1c",
    "titleTitle": "2. \ub178\ub780 \uc81c\ubaa9 \uad6c\uac04",
    "titleLabel": "\uccab \ud074\ub9bd",
    "titleHint": "4.3\ucd08 \uc774\uc0c1\uc778 \uc601\uc0c1\ub9cc \uace0\ub97c \uc218 \uc788\uc2b5\ub2c8\ub2e4.",
    "restTitle": "3. \ub098\uba38\uc9c0 7\uce78",
    "restAuto": "\ud3f4\ub354 \uc548 \uc601\uc0c1\uc5d0\uc11c \ubb34\uc791\uc704\ub85c \ucc44\uc6e0\uc2b5\ub2c8\ub2e4.",
    "reshuffle": "\ub2e4\uc2dc \uc11e\uae30",
    "restManual": "\uc790\ub3d9\uc73c\ub85c \ucc44\uc6b0\uc9c0 \ubabb\ud55c \uce78\uc774 \uc788\uc2b5\ub2c8\ub2e4. \uc9c1\uc811 \uace8\ub77c\uc8fc\uc138\uc694. \uac19\uc740 \uc601\uc0c1\uc744 \uc5ec\ub7ec \uce78\uc5d0 \uc368\ub3c4 \ub429\ub2c8\ub2e4.",
    "showManual": "\uc9c1\uc811 \uace0\ub974\uae30",
    "hideManual": "\uc811\uae30",
    "slotEmpty": "\ube44\uc5b4 \uc788\uc74c",
    "build": "\ube0c\uc774\ub85c\uadf8 Draft \ub9cc\ub4e4\uae30",
    "building": "\ube0c\uc774\ub85c\uadf8 \ub9cc\ub4dc\ub294 \uc911\u2026",
    "noProject": "\uba3c\uc800 Selects \ud504\ub85c\uc81d\ud2b8\ub97c \uc5f4\uc5b4\uc8fc\uc138\uc694.",
    "made": "\ud3b8\uc9d1 \uac00\ub2a5\ud55c Draft\ub97c \ub9cc\ub4e4\uc5c8\uc2b5\ub2c8\ub2e4",
    "needAll": "8\uce78\uc744 \ubaa8\ub450 \ucc44\uc6cc\uc8fc\uc138\uc694.",
    "needFolder": "\uba3c\uc800 \ud478\ud2f0\uc9c0 \ud3f4\ub354\ub97c \uace0\ub974\uc138\uc694.",
    "failed": "\uc0dd\uc131\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4: ",
    "credit": "\uce74\uba54\ub77c \ud6a8\uacfc\uc74c: theplax \u00b7 CC BY 4.0 (\uac8c\uc2dc \uc2dc \uc800\uc791\uc790 \ud45c\uc2dc)",
    "slots": [
      "\uc2dc\uc791\u00b7\uc774\ub3d9",
      "\uc7a5\uc18c\u00b7\uc77c\uc0c1",
      "\ud65c\ub3d9\u00b7\ub514\ud14c\uc77c",
      "\uc6c0\uc9c1\uc774\ub294 \ud48d\uacbd",
      "\uc778\ubb3c\uc758 \uc774\ub3d9",
      "\uc9e7\uc740 \ubc1c\uacac",
      "\ud734\uc2dd\u00b7\uc778\ubb3c",
      "\ub9c8\ubb34\ub9ac \uadfc\uc811 \uc0f7"
    ]
  },
  "de": {
    "intro": "Waehle den Projektordner mit deinem Material und dann nur den Eroeffnungsclip mit dem gelben Titel. Die anderen sieben Plaetze werden zufaellig aus diesem Ordner gefuellt.",
    "folderTitle": "1. Materialordner",
    "folderLabel": "Projektordner",
    "refresh": "Ordnerliste aktualisieren",
    "folderHint": "Es werden nur Ordner angezeigt, die bereits im Projekt sind. Importiere neues Material zuerst in Selects.",
    "rootFolder": "(Dateien ausserhalb eines Ordners)",
    "loadingFolders": "Projektordner werden gelesen\u2026",
    "loadingVideos": "Videos des Ordners werden gelesen\u2026",
    "noFolders": "Kein Ordner in diesem Projekt enthaelt Video.",
    "noVideos": "Kein Video in diesem Ordner.",
    "videosFound": "",
    "videosFoundTail": " nutzbare Videos",
    "titleTitle": "2. Clip mit gelbem Titel",
    "titleLabel": "Eroeffnungsclip",
    "titleHint": "Nur Clips ab 4,3 s koennen hier verwendet werden.",
    "restTitle": "3. Die anderen sieben",
    "restAuto": "Zufaellig aus dem Ordner gefuellt.",
    "reshuffle": "Neu mischen",
    "restManual": "Einige Plaetze konnten nicht automatisch gefuellt werden. Waehle sie selbst \u2014 derselbe Clip darf mehrfach vorkommen.",
    "showManual": "Selbst auswaehlen",
    "hideManual": "Einklappen",
    "slotEmpty": "Leer",
    "build": "Vlog-Draft erstellen",
    "building": "Vlog wird erstellt\u2026",
    "noProject": "Oeffne zuerst ein Selects-Projekt.",
    "made": "Bearbeitbaren Draft erstellt",
    "needAll": "Fuelle alle acht Plaetze.",
    "needFolder": "Waehle zuerst den Materialordner.",
    "failed": "Draft konnte nicht erstellt werden: ",
    "credit": "Kamerageraeusch: theplax \u00b7 CC BY 4.0 (Nennung bei Veroeffentlichung erforderlich)",
    "slots": [
      "Auftakt \u00b7 Aufbruch",
      "Alltagsort",
      "Aktivitaet \u00b7 Detail",
      "Bewegte Landschaft",
      "Gehen \u00b7 Bewegung",
      "Kleine Entdeckung",
      "Pause \u00b7 Portraet",
      "Abschluss \u00b7 Nahaufnahme"
    ]
  },
  "es": {
    "intro": "Elige la carpeta del proyecto con tu material y luego solo el clip de apertura que lleva el titulo amarillo. Las otras siete posiciones se rellenan al azar desde esa carpeta.",
    "folderTitle": "1. Carpeta de material",
    "folderLabel": "Carpeta del proyecto",
    "refresh": "Actualizar lista de carpetas",
    "folderHint": "Solo se listan carpetas que ya estan en el proyecto. Importa material nuevo en Selects primero.",
    "rootFolder": "(archivos fuera de cualquier carpeta)",
    "loadingFolders": "Leyendo carpetas del proyecto\u2026",
    "loadingVideos": "Leyendo los videos de la carpeta\u2026",
    "noFolders": "Ninguna carpeta de este proyecto contiene video.",
    "noVideos": "No hay video en esta carpeta.",
    "videosFound": "",
    "videosFoundTail": " videos utilizables",
    "titleTitle": "2. Clip del titulo amarillo",
    "titleLabel": "Clip de apertura",
    "titleHint": "Aqui solo se pueden usar clips de 4,3 s o mas.",
    "restTitle": "3. Los otros siete",
    "restAuto": "Rellenados al azar desde la carpeta.",
    "reshuffle": "Barajar de nuevo",
    "restManual": "Algunas posiciones no se pudieron rellenar automaticamente. Eligelas tu mismo: el mismo clip puede usarse mas de una vez.",
    "showManual": "Elegirlos yo",
    "hideManual": "Contraer",
    "slotEmpty": "Vacio",
    "build": "Crear Draft de vlog",
    "building": "Creando vlog\u2026",
    "noProject": "Abre primero un proyecto de Selects.",
    "made": "Draft editable creado",
    "needAll": "Rellena las ocho posiciones.",
    "needFolder": "Elige primero la carpeta de material.",
    "failed": "No se pudo crear el Draft: ",
    "credit": "Sonido de camara: theplax \u00b7 CC BY 4.0 (credito obligatorio al publicar)",
    "slots": [
      "Inicio \u00b7 viaje",
      "Lugar cotidiano",
      "Actividad \u00b7 detalle",
      "Paisaje en movimiento",
      "Caminar \u00b7 movimiento",
      "Pequeno hallazgo",
      "Descanso \u00b7 retrato",
      "Cierre \u00b7 primer plano"
    ]
  },
  "fr": {
    "intro": "Choisis le dossier du projet contenant tes rushes, puis uniquement le clip d'ouverture portant le titre jaune. Les sept autres emplacements sont remplis au hasard depuis ce dossier.",
    "folderTitle": "1. Dossier de rushes",
    "folderLabel": "Dossier du projet",
    "refresh": "Actualiser la liste des dossiers",
    "folderHint": "Seuls les dossiers deja presents dans le projet sont listes. Importe d'abord les nouveaux rushes dans Selects.",
    "rootFolder": "(fichiers hors dossier)",
    "loadingFolders": "Lecture des dossiers du projet\u2026",
    "loadingVideos": "Lecture des videos du dossier\u2026",
    "noFolders": "Aucun dossier de ce projet ne contient de video.",
    "noVideos": "Aucune video dans ce dossier.",
    "videosFound": "",
    "videosFoundTail": " videos utilisables",
    "titleTitle": "2. Clip du titre jaune",
    "titleLabel": "Clip d'ouverture",
    "titleHint": "Seuls les clips de 4,3 s ou plus peuvent etre utilises ici.",
    "restTitle": "3. Les sept autres",
    "restAuto": "Remplis au hasard depuis le dossier.",
    "reshuffle": "Melanger a nouveau",
    "restManual": "Certains emplacements n'ont pas pu etre remplis automatiquement. Choisis-les toi-meme : le meme clip peut servir plusieurs fois.",
    "showManual": "Les choisir moi-meme",
    "hideManual": "Replier",
    "slotEmpty": "Vide",
    "build": "Creer le Draft du vlog",
    "building": "Creation du vlog\u2026",
    "noProject": "Ouvre d'abord un projet Selects.",
    "made": "Draft modifiable cree",
    "needAll": "Remplis les huit emplacements.",
    "needFolder": "Choisis d'abord le dossier de rushes.",
    "failed": "Impossible de creer le Draft : ",
    "credit": "Son d'appareil photo : theplax \u00b7 CC BY 4.0 (credit obligatoire a la publication)",
    "slots": [
      "Depart \u00b7 voyage",
      "Lieu du quotidien",
      "Activite \u00b7 detail",
      "Paysage en mouvement",
      "Marche \u00b7 mouvement",
      "Petite decouverte",
      "Pause \u00b7 portrait",
      "Cloture \u00b7 gros plan"
    ]
  },
  "it": {
    "intro": "Scegli la cartella del progetto con il tuo materiale, poi solo la clip di apertura con il titolo giallo. Gli altri sette slot vengono riempiti a caso da quella cartella.",
    "folderTitle": "1. Cartella del materiale",
    "folderLabel": "Cartella del progetto",
    "refresh": "Aggiorna elenco cartelle",
    "folderHint": "Sono elencate solo le cartelle gia presenti nel progetto. Importa prima il nuovo materiale in Selects.",
    "rootFolder": "(file fuori da ogni cartella)",
    "loadingFolders": "Lettura delle cartelle del progetto\u2026",
    "loadingVideos": "Lettura dei video della cartella\u2026",
    "noFolders": "Nessuna cartella di questo progetto contiene video.",
    "noVideos": "Nessun video in questa cartella.",
    "videosFound": "",
    "videosFoundTail": " video utilizzabili",
    "titleTitle": "2. Clip del titolo giallo",
    "titleLabel": "Clip di apertura",
    "titleHint": "Qui si possono usare solo clip da 4,3 s in su.",
    "restTitle": "3. Gli altri sette",
    "restAuto": "Riempiti a caso dalla cartella.",
    "reshuffle": "Rimescola",
    "restManual": "Alcuni slot non si sono riempiti automaticamente. Scegliteli tu: la stessa clip puo essere usata piu volte.",
    "showManual": "Li scelgo io",
    "hideManual": "Comprimi",
    "slotEmpty": "Vuoto",
    "build": "Crea Draft del vlog",
    "building": "Creazione del vlog\u2026",
    "noProject": "Apri prima un progetto Selects.",
    "made": "Draft modificabile creato",
    "needAll": "Riempi tutti e otto gli slot.",
    "needFolder": "Scegli prima la cartella del materiale.",
    "failed": "Impossibile creare il Draft: ",
    "credit": "Suono della fotocamera: theplax \u00b7 CC BY 4.0 (credito richiesto alla pubblicazione)",
    "slots": [
      "Partenza \u00b7 viaggio",
      "Luogo quotidiano",
      "Attivita \u00b7 dettaglio",
      "Paesaggio in movimento",
      "Camminata \u00b7 movimento",
      "Piccola scoperta",
      "Pausa \u00b7 ritratto",
      "Chiusura \u00b7 primo piano"
    ]
  },
  "ja": {
    "intro": "\u7d20\u6750\u304c\u5165\u3063\u305f\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u30d5\u30a9\u30eb\u30c0\u30fc\u3092\u9078\u3073\u3001\u9ec4\u8272\u3044\u30bf\u30a4\u30c8\u30eb\u304c\u4e57\u308b\u30aa\u30fc\u30d7\u30cb\u30f3\u30b0\u30af\u30ea\u30c3\u30d7\u3060\u3051\u3092\u6307\u5b9a\u3057\u307e\u3059\u3002\u6b8b\u308a7\u67a0\u306f\u305d\u306e\u30d5\u30a9\u30eb\u30c0\u30fc\u304b\u3089\u30e9\u30f3\u30c0\u30e0\u306b\u57cb\u307e\u308a\u307e\u3059\u3002",
    "folderTitle": "1. \u7d20\u6750\u30d5\u30a9\u30eb\u30c0\u30fc",
    "folderLabel": "\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u30d5\u30a9\u30eb\u30c0\u30fc",
    "refresh": "\u30d5\u30a9\u30eb\u30c0\u30fc\u4e00\u89a7\u3092\u66f4\u65b0",
    "folderHint": "\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u306b\u3059\u3067\u306b\u3042\u308b\u30d5\u30a9\u30eb\u30c0\u30fc\u3060\u3051\u304c\u8868\u793a\u3055\u308c\u307e\u3059\u3002\u65b0\u3057\u3044\u7d20\u6750\u306f\u307e\u305aSelects\u306b\u8aad\u307f\u8fbc\u3093\u3067\u304f\u3060\u3055\u3044\u3002",
    "rootFolder": "\uff08\u30d5\u30a9\u30eb\u30c0\u30fc\u5916\u306e\u30d5\u30a1\u30a4\u30eb\uff09",
    "loadingFolders": "\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u30d5\u30a9\u30eb\u30c0\u30fc\u3092\u8aad\u307f\u8fbc\u307f\u4e2d\u2026",
    "loadingVideos": "\u30d5\u30a9\u30eb\u30c0\u30fc\u5185\u306e\u52d5\u753b\u3092\u8aad\u307f\u8fbc\u307f\u4e2d\u2026",
    "noFolders": "\u3053\u306e\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u306b\u52d5\u753b\u3092\u542b\u3080\u30d5\u30a9\u30eb\u30c0\u30fc\u304c\u3042\u308a\u307e\u305b\u3093\u3002",
    "noVideos": "\u3053\u306e\u30d5\u30a9\u30eb\u30c0\u30fc\u306b\u52d5\u753b\u304c\u3042\u308a\u307e\u305b\u3093\u3002",
    "videosFound": "",
    "videosFoundTail": " \u672c\u306e\u4f7f\u7528\u53ef\u80fd\u306a\u52d5\u753b",
    "titleTitle": "2. \u9ec4\u8272\u3044\u30bf\u30a4\u30c8\u30eb\u306e\u30af\u30ea\u30c3\u30d7",
    "titleLabel": "\u30aa\u30fc\u30d7\u30cb\u30f3\u30b0\u30af\u30ea\u30c3\u30d7",
    "titleHint": "\u3053\u3053\u306b\u306f4.3\u79d2\u4ee5\u4e0a\u306e\u30af\u30ea\u30c3\u30d7\u3060\u3051\u4f7f\u3048\u307e\u3059\u3002",
    "restTitle": "3. \u6b8b\u308a\u306e7\u672c",
    "restAuto": "\u30d5\u30a9\u30eb\u30c0\u30fc\u304b\u3089\u30e9\u30f3\u30c0\u30e0\u306b\u9078\u3070\u308c\u307e\u3059\u3002",
    "reshuffle": "\u3082\u3046\u4e00\u5ea6\u30b7\u30e3\u30c3\u30d5\u30eb",
    "restManual": "\u81ea\u52d5\u3067\u57cb\u307e\u3089\u306a\u304b\u3063\u305f\u67a0\u304c\u3042\u308a\u307e\u3059\u3002\u81ea\u5206\u3067\u9078\u3093\u3067\u304f\u3060\u3055\u3044\u3002\u540c\u3058\u30af\u30ea\u30c3\u30d7\u3092\u8907\u6570\u56de\u4f7f\u3048\u307e\u3059\u3002",
    "showManual": "\u81ea\u5206\u3067\u9078\u3076",
    "hideManual": "\u6298\u308a\u305f\u305f\u3080",
    "slotEmpty": "\u7a7a",
    "build": "Vlog\u306e\u30c9\u30e9\u30d5\u30c8\u3092\u4f5c\u6210",
    "building": "Vlog\u3092\u4f5c\u6210\u4e2d\u2026",
    "noProject": "\u5148\u306bSelects\u306e\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u3092\u958b\u3044\u3066\u304f\u3060\u3055\u3044\u3002",
    "made": "\u7de8\u96c6\u53ef\u80fd\u306a\u30c9\u30e9\u30d5\u30c8\u3092\u4f5c\u6210\u3057\u307e\u3057\u305f",
    "needAll": "8\u67a0\u3059\u3079\u3066\u3092\u57cb\u3081\u3066\u304f\u3060\u3055\u3044\u3002",
    "needFolder": "\u5148\u306b\u7d20\u6750\u30d5\u30a9\u30eb\u30c0\u30fc\u3092\u9078\u3093\u3067\u304f\u3060\u3055\u3044\u3002",
    "failed": "\u30c9\u30e9\u30d5\u30c8\u3092\u4f5c\u6210\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f: ",
    "credit": "\u30ab\u30e1\u30e9\u97f3: theplax \u00b7 CC BY 4.0\uff08\u516c\u958b\u6642\u306f\u30af\u30ec\u30b8\u30c3\u30c8\u5fc5\u9808\uff09",
    "slots": [
      "\u51fa\u767a\u30fb\u79fb\u52d5",
      "\u65e5\u5e38\u306e\u5834\u6240",
      "\u30a2\u30af\u30c6\u30a3\u30d3\u30c6\u30a3\u30fb\u30c7\u30a3\u30c6\u30fc\u30eb",
      "\u52d5\u304f\u98a8\u666f",
      "\u6b69\u304d\u30fb\u52d5\u304d",
      "\u5c0f\u3055\u306a\u767a\u898b",
      "\u4f11\u61a9\u30fb\u4eba\u7269",
      "\u7de0\u3081\u306e\u30af\u30ed\u30fc\u30ba\u30a2\u30c3\u30d7"
    ]
  },
  "pt": {
    "intro": "Escolhe a pasta do projeto com o teu material e depois apenas o clipe de abertura que leva o titulo amarelo. Os outros sete espacos sao preenchidos aleatoriamente a partir dessa pasta.",
    "folderTitle": "1. Pasta de material",
    "folderLabel": "Pasta do projeto",
    "refresh": "Atualizar lista de pastas",
    "folderHint": "So aparecem pastas ja presentes no projeto. Importa primeiro o material novo no Selects.",
    "rootFolder": "(ficheiros fora de qualquer pasta)",
    "loadingFolders": "A ler as pastas do projeto\u2026",
    "loadingVideos": "A ler os videos da pasta\u2026",
    "noFolders": "Nenhuma pasta deste projeto contem video.",
    "noVideos": "Nenhum video nesta pasta.",
    "videosFound": "",
    "videosFoundTail": " videos utilizaveis",
    "titleTitle": "2. Clipe do titulo amarelo",
    "titleLabel": "Clipe de abertura",
    "titleHint": "So podem ser usados aqui clipes de 4,3 s ou mais.",
    "restTitle": "3. Os outros sete",
    "restAuto": "Preenchidos aleatoriamente a partir da pasta.",
    "reshuffle": "Baralhar de novo",
    "restManual": "Alguns espacos nao puderam ser preenchidos automaticamente. Escolhe-os tu: o mesmo clipe pode ser usado mais de uma vez.",
    "showManual": "Escolher eu",
    "hideManual": "Recolher",
    "slotEmpty": "Vazio",
    "build": "Criar Draft do vlog",
    "building": "A criar vlog\u2026",
    "noProject": "Abre primeiro um projeto Selects.",
    "made": "Draft editavel criado",
    "needAll": "Preenche os oito espacos.",
    "needFolder": "Escolhe primeiro a pasta de material.",
    "failed": "Nao foi possivel criar o Draft: ",
    "credit": "Som de camara: theplax \u00b7 CC BY 4.0 (credito obrigatorio na publicacao)",
    "slots": [
      "Inicio \u00b7 viagem",
      "Lugar do dia a dia",
      "Atividade \u00b7 detalhe",
      "Paisagem em movimento",
      "Caminhar \u00b7 movimento",
      "Pequena descoberta",
      "Descanso \u00b7 retrato",
      "Fecho \u00b7 grande plano"
    ]
  },
  "tr": {
    "intro": "Once goruntulerinin bulundugu proje klasorunu, sonra yalnizca sari basligi tasiyan acilis klibini sec. Diger yedi yuva o klasorden rastgele doldurulur.",
    "folderTitle": "1. Goruntu klasoru",
    "folderLabel": "Proje klasoru",
    "refresh": "Klasor listesini yenile",
    "folderHint": "Yalnizca projede zaten bulunan klasorler listelenir. Yeni goruntuleri once Selects'e aktar.",
    "rootFolder": "(herhangi bir klasorde olmayan dosyalar)",
    "loadingFolders": "Proje klasorleri okunuyor\u2026",
    "loadingVideos": "Klasordeki videolar okunuyor\u2026",
    "noFolders": "Bu projede video iceren klasor yok.",
    "noVideos": "Bu klasorde video yok.",
    "videosFound": "",
    "videosFoundTail": " kullanilabilir video",
    "titleTitle": "2. Sari baslik klibi",
    "titleLabel": "Acilis klibi",
    "titleHint": "Burada yalnizca 4,3 sn ve uzeri klipler kullanilabilir.",
    "restTitle": "3. Diger yedi",
    "restAuto": "Klasorden rastgele dolduruldu.",
    "reshuffle": "Yeniden karistir",
    "restManual": "Bazi yuvalar otomatik doldurulamadi. Kendin sec \u2014 ayni klip birden fazla kez kullanilabilir.",
    "showManual": "Kendim secerim",
    "hideManual": "Daralt",
    "slotEmpty": "Bos",
    "build": "Vlog Draft'i olustur",
    "building": "Vlog olusturuluyor\u2026",
    "noProject": "Once bir Selects projesi ac.",
    "made": "Duzenlenebilir Draft olusturuldu",
    "needAll": "Sekiz yuvanin hepsini doldur.",
    "needFolder": "Once goruntu klasorunu sec.",
    "failed": "Draft olusturulamadi: ",
    "credit": "Kamera sesi: theplax \u00b7 CC BY 4.0 (yayinda kredi zorunlu)",
    "slots": [
      "Baslangic \u00b7 yolculuk",
      "Gundelik mekan",
      "Etkinlik \u00b7 detay",
      "Hareketli manzara",
      "Yuruyus \u00b7 hareket",
      "Kucuk kesif",
      "Mola \u00b7 portre",
      "Kapanis \u00b7 yakin plan"
    ]
  },
  "zh": {
    "intro": "\u5148\u9009\u62e9\u5b58\u653e\u7d20\u6750\u7684\u9879\u76ee\u6587\u4ef6\u5939\uff0c\u7136\u540e\u53ea\u6307\u5b9a\u5e26\u9ec4\u8272\u6807\u9898\u7684\u5f00\u573a\u7247\u6bb5\u3002\u5176\u4f59\u4e03\u4e2a\u4f4d\u7f6e\u4f1a\u4ece\u8be5\u6587\u4ef6\u5939\u4e2d\u968f\u673a\u586b\u5145\u3002",
    "folderTitle": "1. \u7d20\u6750\u6587\u4ef6\u5939",
    "folderLabel": "\u9879\u76ee\u6587\u4ef6\u5939",
    "refresh": "\u5237\u65b0\u6587\u4ef6\u5939\u5217\u8868",
    "folderHint": "\u4ec5\u5217\u51fa\u9879\u76ee\u4e2d\u5df2\u6709\u7684\u6587\u4ef6\u5939\u3002\u8bf7\u5148\u5728 Selects \u4e2d\u5bfc\u5165\u65b0\u7d20\u6750\u3002",
    "rootFolder": "\uff08\u4e0d\u5728\u4efb\u4f55\u6587\u4ef6\u5939\u4e2d\u7684\u6587\u4ef6\uff09",
    "loadingFolders": "\u6b63\u5728\u8bfb\u53d6\u9879\u76ee\u6587\u4ef6\u5939\u2026",
    "loadingVideos": "\u6b63\u5728\u8bfb\u53d6\u6587\u4ef6\u5939\u4e2d\u7684\u89c6\u9891\u2026",
    "noFolders": "\u6b64\u9879\u76ee\u4e2d\u6ca1\u6709\u5305\u542b\u89c6\u9891\u7684\u6587\u4ef6\u5939\u3002",
    "noVideos": "\u6b64\u6587\u4ef6\u5939\u4e2d\u6ca1\u6709\u89c6\u9891\u3002",
    "videosFound": "",
    "videosFoundTail": " \u4e2a\u53ef\u7528\u89c6\u9891",
    "titleTitle": "2. \u9ec4\u8272\u6807\u9898\u7247\u6bb5",
    "titleLabel": "\u5f00\u573a\u7247\u6bb5",
    "titleHint": "\u6b64\u5904\u4ec5\u53ef\u4f7f\u7528 4.3 \u79d2\u53ca\u4ee5\u4e0a\u7684\u7247\u6bb5\u3002",
    "restTitle": "3. \u5176\u4f59\u4e03\u4e2a",
    "restAuto": "\u4ece\u6587\u4ef6\u5939\u4e2d\u968f\u673a\u586b\u5145\u3002",
    "reshuffle": "\u91cd\u65b0\u968f\u673a",
    "restManual": "\u90e8\u5206\u4f4d\u7f6e\u65e0\u6cd5\u81ea\u52a8\u586b\u5145\u3002\u8bf7\u81ea\u884c\u9009\u62e9\uff0c\u540c\u4e00\u7247\u6bb5\u53ef\u91cd\u590d\u4f7f\u7528\u3002",
    "showManual": "\u6211\u81ea\u5df1\u9009",
    "hideManual": "\u6536\u8d77",
    "slotEmpty": "\u7a7a",
    "build": "\u521b\u5efa Vlog \u8349\u7a3f",
    "building": "\u6b63\u5728\u521b\u5efa Vlog\u2026",
    "noProject": "\u8bf7\u5148\u6253\u5f00\u4e00\u4e2a Selects \u9879\u76ee\u3002",
    "made": "\u5df2\u521b\u5efa\u53ef\u7f16\u8f91\u8349\u7a3f",
    "needAll": "\u8bf7\u586b\u6ee1\u5168\u90e8\u516b\u4e2a\u4f4d\u7f6e\u3002",
    "needFolder": "\u8bf7\u5148\u9009\u62e9\u7d20\u6750\u6587\u4ef6\u5939\u3002",
    "failed": "\u65e0\u6cd5\u521b\u5efa\u8349\u7a3f\uff1a",
    "credit": "\u76f8\u673a\u97f3\u6548\uff1atheplax \u00b7 CC BY 4.0\uff08\u53d1\u5e03\u65f6\u987b\u7f72\u540d\uff09",
    "slots": [
      "\u5f00\u573a \u00b7 \u51fa\u53d1",
      "\u65e5\u5e38\u573a\u6240",
      "\u6d3b\u52a8 \u00b7 \u7ec6\u8282",
      "\u79fb\u52a8\u7684\u98ce\u666f",
      "\u884c\u8d70 \u00b7 \u52a8\u4f5c",
      "\u5c0f\u53d1\u73b0",
      "\u4f11\u606f \u00b7 \u4eba\u7269",
      "\u6536\u5c3e\u7279\u5199"
    ]
  }
};

// Seconds each pick needs in the reference edit (REFERENCE): the opening, then the seven panel slots (slot 7 closes).
const DURATIONS = [4.3, 1.76, 1.72, 3.24, 1.84, 1.8, 1.8, 2.44];
// ASSETS[0] is the song.
const ASSETS = ["relaxed-urban-bed.wav", "transition-w2.wav", "shutter-s2.wav", "camera-r2.wav", "shutter-c2.wav", "shutter-s6-1.wav", "typing-k3.wav"];
// Each sound's length in seconds (ffprobe), used when its Resource reports none: no overlay may run past it.
const ASSET_SECONDS = {"relaxed-urban-bed.wav": 69.84, "transition-w2.wav": 1.389977, "shutter-s2.wav": 0.516984, "camera-r2.wav": 0.940726, "shutter-c2.wav": 1, "shutter-s6-1.wav": 0.213991, "typing-k3.wav": 2.5};

const OPENING = "import React from 'react';\nimport {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';\n\nconst KNOT_FRAMES = [0, 3, 4, 6, 10, 15, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 115, 120, 124, 128, 129, 132, 135, 138];\nconst D_CENTERS = [-550, -447, -353, -269, -195, -131, -87, -41, -11, 15, 36, 54, 72, 91, 112, 143, 166, 198, 242, 322, 350, 480, 630, 780];\nconst DEFAULT_OFFSETS = [0, 69, 113, 150, 201, 245, 291, 351, 412, 479];\n\nfunction pathAt(x) {\n  const phase = 2 * Math.PI * x / 595;\n  const y = 155.29 + 38.84 * Math.sin(phase) + 6.42 * Math.cos(phase);\n  const slope = (2 * Math.PI / 595) * (38.84 * Math.cos(phase) - 6.42 * Math.sin(phase));\n  return {y, angle: Math.atan(slope) * 180 / Math.PI};\n}\n\nexport default function OpeningTitle({data}) {\n  const frame = useCurrentFrame();\n  const {durationInFrames, width, height} = useVideoConfig();\n  // Typography uses the 1920×1080 reference units; positions already follow the canvas.\n  const scale = Math.min(width / 1920, height / 1080);\n  const text = String(data.text || 'DAILY VLOG');\n  const chars = text.split('');\n  const anchor = interpolate(frame, KNOT_FRAMES, D_CENTERS, {\n    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',\n  });\n  const offsets = text === 'DAILY VLOG'\n    ? DEFAULT_OFFSETS\n    : chars.map((_, i) => i * 54);\n\n  return <AbsoluteFill style={{overflow: 'hidden'}}>\n    {data.fontCss && <style>{String(data.fontCss)}</style>}\n    {chars.map((ch, i) => {\n      if (ch === ' ') return null;\n      const x = anchor + offsets[i];\n      const {y, angle} = pathAt(x);\n      return <div key={i} style={{position: 'absolute', left: x * width / 576,\n        top: y * height / 324, transform: `translate(-50%, -50%) rotate(${angle}deg) scaleX(0.84)`,\n        fontFamily: data.fontFamily || 'Gill Sans, Arial Black, sans-serif',\n        fontSize: (data.fontSize || 255) * scale, fontWeight: 900, lineHeight: 1,\n        color: data.color || '#FEDC5E'}}>{ch}</div>;\n    })}\n  </AbsoluteFill>;\n}\n";

const MIDDLE = "import React from 'react';\nimport {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';\n\n// The source video is 30 fps. This graphic begins on draft frame 136.\n// Each value is the first local frame on which that character is visible.\nconst REVEAL_FRAMES = [7, 9, 10, 18, 19, 21, 22, 29, 30, 31, 32, 34, 35, 35, 36, 38, 40, 48, 49, 51, 51];\n\nexport default function Middle({data}) {\n  const frame = useCurrentFrame();\n  const {width, height} = useVideoConfig();\n  const scale = Math.min(width / 1920, height / 1080);\n  const phrase = String(data.text || 'JUST EVERYDAY MOMENTS');\n  const schedule = phrase === 'JUST EVERYDAY MOMENTS'\n    ? REVEAL_FRAMES\n    : Array.from({length: phrase.length}, (_, i) => 7 + i * 2);\n  const count = schedule.filter(at => frame >= at).length;\n  const visible = phrase.slice(0, count);\n  const fontSize = (data.fontSize || 73) * scale;\n  return <AbsoluteFill style={{overflow: 'hidden'}}>\n    <div style={{\n      position: 'absolute', left: '50%', top: '50%',\n      transform: 'translate(-50%, -50%)', width: 'max-content',\n      fontFamily: data.fontFamily || 'Georgia, serif', fontSize,\n      fontWeight: 700, color: data.color || '#FFFFFF',\n      textShadow: `0 ${2 * scale}px ${6 * scale}px rgba(0,0,0,.25)`, whiteSpace: 'nowrap',\n    }}>\n      <span style={{visibility: 'hidden'}}>{phrase}</span>\n      <div style={{position: 'absolute', left: 0, top: 0, display: 'flex', alignItems: 'center'}}>\n        <span>{visible}</span>\n        {frame < 59 && <span style={{display: 'inline-block', width: 4 * scale, height: fontSize * .88, backgroundColor: '#fff', marginLeft: 2 * scale}} />}\n      </div>\n    </div>\n  </AbsoluteFill>;\n}\n";

const ENDING = "import React from 'react';\nimport {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';\n\n// Source-video frame numbers minus the graphic's placement at draft frame 527.\nconst REVEAL_FRAMES = [3, 5, 6, 13, 14, 15, 21, 22, 23, 24, 25, 26, 26, 27, 28, 30, 31, 38, 39];\n\nexport default function Ending({data}) {\n  const frame = useCurrentFrame();\n  const {durationInFrames, width, height} = useVideoConfig();\n  const scale = Math.min(width / 1920, height / 1080);\n  const phrase = String(data.text || 'THANKS FOR WATCHING');\n  const schedule = phrase === 'THANKS FOR WATCHING'\n    ? REVEAL_FRAMES\n    : Array.from({length: phrase.length}, (_, i) => 3 + i * 2);\n  const count = schedule.filter(at => frame >= at).length;\n  const visible = phrase.slice(0, count);\n  const fontSize = (data.fontSize || 43) * scale;\n  const black = interpolate(frame, [0, 34, durationInFrames], [0, 0, .9], {\n    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',\n  });\n  return <AbsoluteFill style={{backgroundColor: `rgba(0,0,0,${black})`}}>\n    <div style={{\n      position: 'absolute', left: '50%', top: '50%',\n      transform: 'translate(-50%, -50%)', width: 'max-content',\n      fontFamily: data.fontFamily || 'Avenir Next Demi Bold, Avenir Next, sans-serif', fontSize,\n      fontWeight: 700, lineHeight: 1, letterSpacing: (data.letterSpacing ?? 1.2) * scale,\n      color: data.color || '#FFFFFF', whiteSpace: 'nowrap',\n    }}>\n      <span style={{visibility: 'hidden'}}>{phrase}</span>\n      <div style={{position: 'absolute', left: 0, top: 0, display: 'flex', alignItems: 'center'}}>\n        <span>{visible}</span>\n        {frame < 43 && <span style={{display: 'inline-block', width: 3 * scale, height: fontSize * .9, backgroundColor: '#fff', marginLeft: 1 * scale}} />}\n      </div>\n    </div>\n  </AbsoluteFill>;\n}\n";

const SWISH = `import React from 'react'; import {AbsoluteFill} from 'remotion';
export default function Swish({children,presentationDirection,presentationProgress}){const p=Math.max(0,Math.min(1,presentationProgress||0));const exiting=presentationDirection==='exiting';const q=exiting?p:1-p;
return <AbsoluteFill style={{transform:'translateX('+(exiting?-q*8:q*8)+'%) scale('+(1+q*.04)+')',filter:'blur('+(q*8)+'px)',opacity:exiting?1-p:p}}>{children}</AbsoluteFill>;}`;

const FILM_PRISM = `import React from 'react';
import {AbsoluteFill} from 'remotion';

// Each RGBA exposure was traced from the reference's 30 fps transition.
// The small self-contained textures contain only blurred color and opacity,
// never recognizable footage or the TikTok editor screen.
const frames=["data:image/png;base64,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", "data:image/png;base64,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", "data:image/png;base64,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", "data:image/png;base64,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", "data:image/png;base64,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", "data:image/png;base64,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", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJAAAABRCAYAAAA98i+pAAAA4UlEQVR42u3SMQqEMBCG0X/2/hfxhgtbjI2FSlwFsRDeg4BMQmLxVX+nX5IkNVi7eR3M9+fr5J7NfRfergt3PfV2kqSXtf7u8bz/7I3mj51f9vrkf2+e/wRuEBACQkAICAGBgBAQAkJAICAEhIAQEAgIASEgBAQCQkAICAEhIBAQAkJACAgEhIAQEAICASEgBISAQEAICAEhIAQEAkJACAgBgYAQEAJCQCAgBISAEBAICAEhIAQEAkJACAgBISAQEAJCQAgIBISAEBACAgEhIASEgEBACAgBISAEBAJCQLzMDD1eRD6jdktfAAAAAElFTkSuQmCC", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJAAAABRCAYAAAA98i+pAAACKUlEQVR42u3d206DQBRG4T2m7/9A3vhm3d5oA9M5IdHE8q2EAHJqcOWfPQWdkh/vGZnxmCIjMqr1r5/FZr/MiOjst1uv9quvsTtndY3f/CyREXH/mjemzP62P9tn9/mysV/+4Hr1ebJ5ztzewOY8IjLeAv+ZspmOHrNd7+3Xmz+OufkdvJRMPXLh2GwsT5FAryHIb52vlz6PiUCv32SNjiudpq0MmrDdsQS6XiKVgTjRWS4dESXQRRNpJuRqAhVF9HWL6NLYXjrr3fMS6HpyjWQaiZSN80igC8t0VKTmNjWQ+unol427uksCYTWRmjWTBMJKEV56vT8JhKNptNtOIJzptSmicarYlkA4l0oEwimZNGE4BYFAIBAIBAKBAAKBQCAQCAQQCAQCgUAggEAgEAgEAgEEAoFAIBAIBAIIBAKBQCAQQCAQCAQCgQACgUAgEAgE7AX6HkEVOMxt8P+Ai9uDM02YZMJSAuUkdVIiYUWgMpGJSOgKNBsr/GmkOrcO2xooGzVPDgpstREeAt0reUbLJEKzCcvOwKr1gKupOUOviF6RoUwGZMUFBbovpMpMFhJpwpYEKJPmDhcuou/Vct0LaxXUqaiWQL0EyoX6pzUovVS6cAJl1a3XjcehZ2G5mEBSCLv3gVbSJwcPWiGBunLM0kXiSKDmc7CcPCeTPngSKBe65sTBk0AxEYk8mL7OETF+tZU88E40/u57ID0r+MNCEAgEAoGABp9m0Fx4ZZdHZgAAAABJRU5ErkJggg==", "data:image/png;base64,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", "data:image/png;base64,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", "data:image/png;base64,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", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJAAAABRCAYAAAA98i+pAAABBElEQVR42u3SwQ3CMBBFwf1US6H0QhnmEGMcsCIiTkgzF6ywbIz0crveq9VC1s/OzFYt5nP8+3Zidjef7+7VTsyO5+kfaeNcaZVsG5Pazmn9u212Plf/fca+vut9R7XXro93TTvm+4z9+/PzPvO+9bv295nve/Tfk6pLwQ8EhIAQEAJCQCAgBISAEBAICAEhIAQEAkJACAgBgYAQEAJCQAgIBISAEBACAgEhIASEgEBACAgBISAQEAJCQAgIAYGAEBACQkAgIASEgBAQCAgBISAEBAJCQAgIAYGAEBACQkAICASEgBAQAgIBISAEhIBAQAgIASEgEBACQkAICAGBgBAQf+YBH1Yh/6pQAqQAAAAASUVORK5CYII=", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJAAAABRCAYAAAA98i+pAAAARElEQVR42u3BgQAAAADDoPlTX+EAVQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAZtpEAAZ3YEdEAAAAASUVORK5CYII="];
const clamp=x=>Math.max(0,Math.min(1,x));
export default function FilmPrismReference({children,presentationDirection,presentationProgress}){
 const p=clamp(presentationProgress||0);
 const exiting=presentationDirection==='exiting';
 const pictureOpacity=exiting?1-clamp((p-.59)/.055):clamp((p-.59)/.055);
 const layerWeight=exiting?1-clamp((p-.61)/.09):clamp((p-.56)/.09);
 const frame=frames[Math.min(12,Math.max(0,Math.floor(p*12)))];
 return <AbsoluteFill style={{overflow:'hidden'}}>
   <AbsoluteFill style={{opacity:pictureOpacity}}>{children}</AbsoluteFill>
   <AbsoluteFill style={{backgroundImage:'url('+frame+')',backgroundSize:'100% 100%',backgroundRepeat:'no-repeat',opacity:layerWeight}} />
 </AbsoluteFill>;
}
`;

const AMBER_SHUTTER = `import React from 'react';
import {AbsoluteFill} from 'remotion';

const pulse=(p,c,w)=>Math.exp(-Math.pow((p-c)/w,4));
const clamp=x=>Math.max(0,Math.min(1,x));

export default function AmberShutter({children,presentationDirection,presentationProgress}){
  const p=clamp(presentationProgress||0);
  const exiting=presentationDirection==='exiting';
  const pictureOpacity=exiting?1-clamp((p-.45)/.08):clamp((p-.45)/.08);
  const weight=exiting?1-clamp((p-.50)/.12):clamp((p-.42)/.12);
  const layers=[
    {a:.37*pulse(p,.11,.19),background:'radial-gradient(ellipse 64% 77% at 65% 8%,rgba(155,31,18,.79) 0%,rgba(200,49,28,.52) 47%,transparent 100%)'},
    {a:.69*pulse(p,.30,.24),background:'radial-gradient(ellipse 80% 120% at 10% 46%,rgba(255,139,24,.96) 0%,rgba(255,131,22,.78) 47%,rgba(255,150,28,.30) 80%,transparent 100%)'},
    {a:.83*pulse(p,.43,.14),background:'radial-gradient(ellipse 75% 130% at 15% 58%,rgba(255,252,168,.99) 0%,rgba(255,215,67,.88) 45%,rgba(255,150,21,.46) 77%,transparent 100%)'},
    {a:.66*pulse(p,.55,.16),background:'radial-gradient(ellipse 105% 118% at 44% 51%,rgba(255,203,78,.78) 0%,rgba(255,145,24,.63) 63%,rgba(243,83,23,.30) 90%,transparent 100%)'},
    {a:.64*pulse(p,.69,.19),background:'radial-gradient(ellipse 72% 99% at 67% 36%,rgba(255,126,29,.78) 0%,rgba(244,83,25,.58) 54%,transparent 100%),radial-gradient(ellipse 58% 97% at 16% 72%,rgba(255,176,53,.55) 0%,transparent 100%)'},
  ];
  return <AbsoluteFill style={{overflow:'hidden'}}>
    <AbsoluteFill style={{opacity:pictureOpacity}}>{children}</AbsoluteFill>
    {layers.map((layer,i)=><AbsoluteFill key={i} style={{background:layer.background,opacity:clamp(layer.a*weight)}}/>)}
  </AbsoluteFill>;
}`;

const AMBER_REFERENCE = "import React from 'react';\nimport {AbsoluteFill} from 'remotion';\nconst frames=[\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJAAAABRCAYAAAA98i+pAAAARElEQVR42u3BgQAAAADDoPlTX+EAVQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAZtpEAAZ3YEdEAAAAASUVORK5CYII=\", \"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJAAAABRCAYAAAA98i+pAAAKr0lEQVR42u2dW7KjOAyGJWAF2cKsb5beVM37weqHJOe4PZb1SzYE0qGKCkkIIeSz7hb837//kIiQCH2vlG3fVyESuj2esxARCXG2Dz/2KT6XHYu+j8M/n7k//vmaPJ+z0ONRaPp+7b7PlH2ORejnOd23ReT5uSnb53mc6b4+9qH8tfsxf44t/PgZRETPbf7+TT/vPX7jH6/L473y8qTHKiSUhGjL1i8h2kRoo/v21/drRJuIbHTfTtm6Pr+X6M/zys+HlNcb5//znvL6Qthyezxy8Vhutxbts1xs11brfWudiu0pe0171L5f+135IpXt/No/j5WK99Lj+5/b2vnUzu8ly+LYlwdApF340XDUnk+VlRWYyu3WIGgtokCUiuM8X58LkKZsO50JHBSgmyIp0IvIIIheSBiQGi1YWjBpAHFg0NQAyoFIlf3nDKjy3JJyfW5EtJ5VAiEXjTskWASe1uPUgGgKQjQCoByKpEiREpx8lTNCtBjSBx2BEYBoMDjskDYzANCk2EFRFSaFCksVkGr75QBxti2V8zscogWAhwfZQB4JZMFjAcMFLFxAMzulkFcCtYzolD1uhiR6QjZnEkjOZA8tADwIQKgNpHlVFARnatg7c0PyzE5VZg0eAW2gVIDBigRKFUlVGtVSOX5ut66vAOimUM0DJI8FEALP5LRt5sb2PAggrwpD1FcJTfm7U0Vil57dISAtFXg0iUEdNlCP5+U1hBFoLHXWY0SLE6Dys/n7W+N3JkNTlBIpX9aRAN0UaHpVGDcgssCJGMK157OiujSYap5cRAK14j9TBocGz5ad26acU82Ypux1JDzTDdPSkDYed50DAUPqkECz8ZhDokFjqbAoQFIxhmsufBn7ScW5b45zY+O/EQCmtQcg3lkCMWBLsTLKuOJVIRJlrqwt6NgBUDSAKJU/O49Cb4AtpkmiXk8sFAJYnF/MFEtTWJC2VNxk2DQtYObGvjW1x4D6ska4JoG4iDxr0WYE5r1SG26IFkDy9HhhEeO5NdpYUWc1aBZAjSHweO2eVgDRijpzw95Brld0kWgwcgFGV6/n5bGTLMPaI30WQ4XV1BcDA0kACdQCSJwDxro21AGQFGEEtyRaaP+FAVCow5jWoNEAslx3NiSuGGqMC2C4Up5BQESZQa0QlUCSnRs3pOnhACH2DyLpohBp8MxADoyK1AUKUG0k10BiI2TS2g+5Vl6po50/nJxdDoCHgAtIzgCjF6SW6+6NOrNjhIpTYiCpH3LaaKJISDbAP1wCeWJEiJHOgPs6NWI8MxD7idb9MCDqpeKukwEINdQVEhKRynMPWC71lYvrIxfucPknQAp5c19WPRFqhxAYlOVgbZEVQ0NKhMkAsTzm7VVGNBp0tCoWaxd5CqQ9IgnTVr0z6tKzM9JPoNonpwqr/R4BvcqXe2GRkIC38B6BigHp4g0/iPF7ZSczgA2VygrEAny37FVUTzvbS+wo/bCMayQt0puu0IAJ/RHBAagNSu08WPG4wuc70esXTzSbg6UgXhuGOpLD1BkRHjX4emrcTy+Beor4W66sd9pQBOwRUkaUdS/JRTsd+5QAUTBMHwnxRz2iXmA8+5Ni6Fq20F6qtKrChM6/eKHigNTaC5oRak1ePAhUgMT40XJyFYcmGY+4qBY0Aq5RmA5fpgYochHJ9KpFAtB4QZID/4fQ9yzBnM5V//ARI1iAQVdtfOEApaUJ5ExqNmIDyQUgOWIEy2AJU84JQzw02VnNQtn4le45D3G6tHICaSQBu2OUBEKlS3KsHumEQiSgiupSYSuSOAOLkY6ULhEjVRvJ7PxDrLnvUgHDgicFwRHAGSKjanJIHEiAABQfCFOvV5OKwq58inHptYkj9yVOgCKrVPoJIQNBHNdROmJV/wOolEJWFncvCRWVMKnRfKDMA00DpuxQBUqqSJNypmm55u9ZIBGojpFifksChWqi10o7O6RcAQFGjKRjCxrL5mg1LeDCaWClNcoeAD23NwWiVNnW1FoCive9g1IbjOsIN17A3Iql0qSh+qyckwVNObq5MmWYihYpZMx5R2prelRYDtCXAhRiI0XDA0Mdi0URXTcwmRhRVwJIN003J+MP2pTj5R2+uJhefKQKq6mxL0O1tdx8GgBP+XvWUYFEAQul2JA+3Blb0QzjlEkcpF3c6JYtGkAaPKKorhIiTdVp3hwSf0LfW0dFoltSSAwPTYzWty0biIELUgNnq3hbk9Jjh4PqC3HhqfJH1wxpDaCvbNsTK0rki27X3lv3KOeQoASiThuoBU7eY3lTksPSKJqnQSWste5jVPlDU6WtXfloqTFvwBEFqAseCyBNCiESCCnx5IDa4kLq1NRV2ZzSahZlTdthIwdWA0gakmhrSKMvB0SJ+nNsMrI/UDT31SOBmHyR56S0R5kVtYUWz3NnMlVAj0wUeLQYUQmSKAAlp60jozqVWQCtSgczMdQZakSL0itHgO7uVm9lHmT3IJl4xNZoeWXJocKsCHUrUDgUnmhJqzRAkYYx3RuVLi9aq6+yt8sq7QQQGeosBYKM4pBAWhnLemRNdCmFkHnWSKKSO+GhRv9BpLMFdcyRasHTAioZhrUGzeZIvB4CjlcCeSBCItbcWQxWqjQxUhTRxqAC2IQegNBIdTIi0xpAtKe6GqnCvBP40flLDCRmW9JGqN2wgJx111b1IQGVg1GbyAvPoeBEACrdeg9IyPQarw2SigaTiJfljY5b5Q/eR68USkHps57xfmGtAKCAMybJ2aHMG9gb4aZ76p9btdYegCQAT+pNQ7wCoJpbL87urVY/HO8NTTxdw0YAJEFpNKrkNe0Rz3nVzFShWG8btHsrOTpwUXCCADu8LTKMVaSiYGTN9MvAGQGQgF4NMkOUHRAxcK9Sj+SRgQChkig1EqFIuuIXnWRZdoIn0vvQ0wd5tH3TazRHVVgrPaEBdhp4egCK3BtjFEBIEnR0axUBy0mjNlBLneWvr3SyZRk8Rx3tIBG9xXf07skjmxogM0U8wUQBs+ung2eEEW39sVbnUc/de3rvV98qPemZhSuAhzZipiq9I0A990aNNuTskT5o6UlPn0N0jpYHrvWsAE0HtWIZYRdF4UE7mI2yq6ypM16pdFp4IhLoBvYaRPJR7JBWI6LL3qAiDwpAemfS5usvOvkyDbaBiPB+hSNV05FNP715M8/0mqN7Ah0K0I3O3Xyz59bjaMZeBkJFV1Zde90rw6r88zYQH6XC2MihRW+gIsZzIqyw/ZLSxyOBbqAnRU7b56odz6wePZFKxmEzJa5uA73b4mnNi0CGFLzTOwL07qBEc2eoCiMnUH+FBPrbgaFA70LLI1s/AF27ZW9UraEqDClQ+wD0JpJHAsa0p9/25SH6ADS2uSfaEWxUy156x2TqHraHdZvts7QX9lY3XhacM0mgiAfiaWl7xCi3QEJV2EofCRQqjR3VIlgOVmUIOG99v5HlxYE5Hjz7YxRkXgg8EudjAwWBYUePaaQrmgyug/berciSQD23J/jYQIH8EGqA7mEDSWdqQzpDAR8VBjTTRG2gHgk04u6AQv4SVQr2XZarQzS9yHB95QXz3Bmw1xDukUxvD5B1g7SRo25PFea9cUlE2lw+6z5ChQnYysW6eOycn36EET3ihnu9gcJLQvUboQ/6BVIl6S4AAAAASUVORK5CYII=\", \"data:image/png;base64,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\", \"data:image/png;base64,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\", \"data:image/png;base64,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\", \"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJAAAABRCAYAAAA98i+pAAALWUlEQVR42u1dUXLqSAyUjC+219mb7p3W0/sR8p4zNZJamjEx2UcVlYANGGhaLak1Vvzz198CiEBUREQAFREViIjg+fd5+2Pbc1/Il21f9oU+n+/5F9vz9ibA9vFXtuf9D4E8ROQhwENE9o/beAhkf97eBdhP2/bntsdp39/PAXm+Bh6/X0sez+M/v7Y+t+npfevpvXx9r1/ftwjwuc/v2593nbd93I/TbZz2g+Bz6/N+CH49AQS/9pHTtt+v+fkYwedxo3s/H9/HJiIbgI/3f/6Mft1+7gdRfH38GR+fn4WIiOxiX/T0Vwf3r7ho4fl0cGyavD/zWqve8+g5cLr/8384j4fx/6pjSn9OexIcGrywJACp5D5qPEYDgHnHmAHWqh8PZO3FApvKCy97gL7VvzwlWcXbXwmgSRGIWmTF6pevSQDqRWCcApAGX3b0y9eAPVjgeCBecRXy/1eEsFG4YkCFwb4gf6C3YKCrQpgSQLzyGh3H6hA2AgujgUb76rsz0EoRrQvZZ0uCRgNWvYKBLFaJQhgDuB+pgTLZmJKPmQllSmixCtsyDCRFHSRE5qZ3YKBqqutpoAwopACGaJsQqf5s+NKCKK6AURc8z1IGmqmLrErjoxqFkqDN6B4hQviKX7cuAs+tsrKdYBJ5gQbSIGVXAojZrIoR0vKdGc4kiJg62GUh7Ls+FCUZSgmRr5MlhUoo0xcUCqPUPkqAlgJpl3tf2PBTbWkw4SwTyjQpoqvgQTIsstozHW3uDqCZHlWl5yVkG+Q7Q5oVtrQA0uljf1cAZTTbjJapFBb1wrAV1YkyFf0lpZh3BpCQBdCMWFaSlbQAICUq09mQNSv0p3t/PwVAK4ubDMhWp/iZehECe0impjZl5fg/AygTuqIm7IzuQlJwR7WfKgPdXgOhK7vjTRiJqWSvZCAEzKJGO6Na1Z/WcvuFgBGj99OD6gyo7wQXWx2/AkBeayJyLWZ6jVHbJ51V7hcDpvoc3wko9oOerdJnMqrIBzRTlJUrC4mZg41odxTCkAAULrSHrigdVBupkbcHDoiYAmK1MU0DCIutl5bYQxC2QDAOC76rmWgGQFG48r4DkGL8Fdnh5SEMExqoCqpXeZdY837V51MB0wr/+DSAqi43JXy7GZDA0UXM9tVieongJD4/z3TmJSaRsNZFHqYwhGWM3ZKcX+rBBIeRLCEdhTBcND6T8XavHvnRgU5iq9hMK2NpN55hIC3OPDXjg2knDzMCrfRKEa3y2oapTs6R6XdpII+BZo3b6EzuKFwlcZ/HRJgMMavS4WpaXvEKZf1P0wCSF1Sj4TBPe14ZIDEsiK6EsJqZVmVhmNRNlkbSq+tCu6FXKkiPZpaiENZOYGpJRmILj7eZp3rxlOvlIUydX7AuKs1vBAPBYKpIXEeFx6gwJz+4QaxXm+orDMMi/AwkhoH6ENbIlJ8Fld55ROYdLzuhEZgPFY5WODNQM2LyNgBOKwpuC1RKTHn+NBa6nIn2QJDqwlDWBoL5DJ6NAE5WYFugimbT/7BQAUCzBUSrqhpNU/QhDF04a2R2FqX7mtBB+AOkGgNl7JPZvs4ohPUaCMXQFdWDEDAQ/migOoAaoQcw0dfRQZp+Bo4O0vdG6iCRfDFy1EtTwknwR2hPaCC5gIGk00AWaJqsqVqL01Oy+nVRk1gucDJY21cWfLFytPlVlehm1HyaUSNi0vlGPJelh6yGL8s2uCjDqRjusiuaLWPTKwE0OuAsA7UCE7VOuLfuAzsDzXJOwmGj2RDvWXeR3A+FdYR0ZdZ5NQPByXAiBrL+b4OMLWKfvk2ydfdFdhNcGMJWh8BZB2nJzoEXv+HWfVkeMGYyszYARf+Lbp0+20gBvtL+y/i/V4QzdUoUJd27B9ZIXLBEyYgNmMJhc7a3Llwxw38bUUdiO+cZWwbbv/O8UEi+jlW6mAbSThq7Z7vEcFioGZaOlghhZxbRgQY6X87glUE4G4G0B9ysR6rCQNZjM9LB0nRSbWXtBC2vTk/V+MVHDMNcM54Xtk+0DbTUWYTLxIrxUSMYJFiYxRoiBsIVo81Y7FWBIVbboKEaAYsFEGNL3ZJ1JjFeD8m5d8Zhye7DmtY84KQBtV+cUVg1F6YAyIauz+shOcfdqLBp2U1kEMZWMHNlUoVxYSoxTw8nvU/PxkNes2CBtcCCVUS0mOZ4fpk9aI6i5aE5x78ZbFn1FbEj3KzjEo73aRTWRhFAq5ae/YX1CS+kRal4C8CkRc2xGb4ZOI3fzQFRtVIMEkysPvJM+whkhb7LAlMIYnwzwtiIfY5CGN66anifdamRiXkZHwoz8iL8qDeb6mckhBotnpeuzlFtbzAagA1hR3EE27LaepqEYaBMGj+rhzDJ/mzo1TswkFV36qvDcIBzDl3H5Iqsnj9pBKrZDDULIAkKihJ4wNkQhndbpTWibUtMH0Gqnq0F6aDt0YwQJoMm7IyIlsS0CVsv8sCjTqW95Bffb9YM9LSQJZ77efUjsdxbc0DE+o6ydSBJAIj1PUkAIgvkcDTR7TRQtC5ORv/04vkQfoy3AhzrC9fCEALDQFXwgFg5pTKFY3rI9xuwD0ibR+v0yQg8h8E6x4B1Rh17STQwEdh4K07DTGU6cgooMe7NMJDnIf92DcQsPNUG3fY2AMZhGMms233oyYxQrzpToMc6UgxfzFIxDIgodrqTBvKMYH3tpRnAsP7fEqPU2Rn7q1j47OBkxplYf7WSC2BQ9pw7hDBNmsO2JIC2wIOUWdzzqh+OSG1wIGIfpg8Jx+JxyzQ+Wqqf0UL9KJAHrOZ4ftgOt7VdF3qBWPdl1uqxJYDaulLFLQAU2QUioej5pjXhbsyEKsiakRxJhIvMOFPGC33+nETmwvftNBCbzktCw6xaAe2VRvhmmOis5W2QGOMRo9IvjnmuOSu64rvOlaHkymVMnJ8ByurZq9VJgzVx4olcJcz9LWHfpU9UfDcNJEnAyASYrpr6XAEea05uNGLU/2WKmDDaNPoOAPKG36rrSVe/vMxK+le1a6x+nzXq3TP66EvvFzcdsVDmZH1mE/qu5wub6XQzXW227hF5cTQ4JRObup9BdAQgypwYZiSiR3NwvQdqY9fCvkshEYUlZLJ+mcySwSzreCvLZ4591O87OhDBWXdpc4C0DYDUDzFshu87PJ3DfmP2wcQXW9FTTDkBkyuWMMa5Y3BtDvts3TKCW5DGN2OZ4pGtNZxu2W8GnJWiNuodYQJUlXZGNETQg+dfAkBb5+3ut42ANLK1jMKWBOyDn3bO1AyLIFl89Kq/mtRASIDoE0hwJmzRgagNen/iFBhHXib6ZHr7DwJOVOmtLMqgiW48s/wLO+fWs1BzLLYwfE+bMwAZnftM72qqX8Uu2TURMx3+LVjlYyZ8RQL6MBioDQC8ichjAKAtmF+TgZNSJJ7kfUsAsatQgLSFjECkxjYLRNKlvStEdAsY6BhYaL2akDVFi0GtKMM4eAcAIQmcqNvdjFNLtcEKaRrMfDXHVM8CqJHV56MD0/n99uA4BsBmpmhnl6S5DYBQXEpYiotNjcAyGhjcDM80Mw0qhA5i/N/nTMz68ajh2ByZ/1lbDWO/vR0DIZFhoQAkz6XYHK+RGusZzdaCmgOkwxDbo36Y5dT0lvJjhhJxJwB5B67BeoqVJVLagMpBnGrBs7+2wPKQycKy8//NmI44TgVE1iTvhbDUiWz2G4YsxsKRsYEgGN1pBohg1EqwiH2YU1xZDLQ5q9xuROlBSW91aLG5qwbKrv9XDWFRluYB8GoPtOUNss4vwpY6lABMb3QzXQx310BRpzwab2FN+rPn5Jixk0ghIdiIKjqbcWVbPF/ey34DptGCazEbJmZ8Quw5WLNZWLWhm62qZ417Igl353+wRzguXZPdzwAAAABJRU5ErkJggg==\", \"data:image/png;base64,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\", \"data:image/png;base64,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\", \"data:image/png;base64,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\", \"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJAAAABRCAYAAAA98i+pAAAARElEQVR42u3BgQAAAADDoPlTX+EAVQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAZtpEAAZ3YEdEAAAAASUVORK5CYII=\"];\nconst clamp=x=>Math.max(0,Math.min(1,x));\nexport default function AmberReference({children,presentationDirection,presentationProgress}){\nconst p=clamp(presentationProgress||0); const exiting=presentationDirection==='exiting';\nconst picture=exiting?1-clamp((p-0.5000)/.035):clamp((p-0.5000)/.035);\nconst strength=exiting?1-clamp((p-0.5500)/.07):clamp((p-0.4400)/.07);\nconst frame=frames[Math.min(frames.length-1,Math.max(0,Math.floor(p*frames.length)))];\nreturn <AbsoluteFill style={{overflow:'hidden'}}><AbsoluteFill style={{opacity:picture}}>{children}</AbsoluteFill><AbsoluteFill style={{backgroundImage:'url('+frame+')',backgroundSize:'100% 100%',opacity:strength}}/></AbsoluteFill>;\n}\n";
const FILM_GATE = "import React from 'react';\nimport {AbsoluteFill} from 'remotion';\n\nconst clamp = x => Math.max(0, Math.min(1, x));\n// [transition frame, left and right edge of the light gate] in the 576px reference.\nconst gates = [\n  [0, 566, 576], [1, 558, 576], [2, 540, 576], [3, 474, 520],\n  [4, 406, 452], [5, 383, 429], [6, 367, 413], [7, 349, 397],\n  [8, 314, 383], [9, 251, 353], [10, 67, 190], [11, 1, 69],\n  [12, 0, 28], [13, 0, 11], [14, 0, 0],\n];\nfunction edges(t) {\n  const a = Math.min(13, Math.floor(t));\n  const b = a + 1;\n  const mix = clamp(t - a);\n  return [1, 2].map(i => gates[a][i] + (gates[b][i] - gates[a][i]) * mix);\n}\n\nexport default function ReferenceFilmGate({children, presentationDirection, presentationProgress}) {\n  const p = clamp(presentationProgress || 0);\n  const exiting = presentationDirection === 'exiting';\n  const [left, right] = edges(p * 13);\n  const l = left / 576 * 100;\n  const r = right / 576 * 100;\n  return <AbsoluteFill style={{overflow: 'hidden'}}>\n    <AbsoluteFill style={{clipPath: exiting ? `inset(0 ${100-l}% 0 0)` : `inset(0 0 0 ${r}%)`}}>{children}</AbsoluteFill>\n    {exiting && right > left && <AbsoluteFill style={{\n      left: `${l}%`, width: `${r-l}%`,\n      background: 'linear-gradient(90deg,#fff3cc 0%,#fff8db 42%,#fff9dd 74%,#fff0c5 100%)',\n      boxShadow: '-8px 0 15px rgba(255,249,218,.65),8px 0 13px rgba(255,243,192,.55)',\n    }} />}\n  </AbsoluteFill>;\n}\n";
const VERTICAL_SMEAR = "import React from 'react';\nimport {AbsoluteFill} from 'remotion';\n\nconst clamp = x => Math.max(0, Math.min(1, x));\nexport default function ReferenceVerticalExposure({children, presentationDirection, presentationProgress}) {\n  const p = clamp(presentationProgress || 0);\n  const exiting = presentationDirection === 'exiting';\n  const t = Math.round(p * 7);\n  const oldVisible = t <= 4;\n  const newVisible = t >= 5;\n  const blur = t === 0 ? 0 : t <= 6 ? (t >= 4 ? 7 : 5) : 0;\n  const newMask = t === 4 ? 'inset(0 0 48% 0)' : 'none';\n  const band = t <= 1\n    ? {top: 54, height: 46, opacity: .24}\n    : t === 2 ? {top: 0, height: 56, opacity: .76}\n    : t === 3 ? {top: 0, height: 53, opacity: 1}\n    : t === 4 ? {top: 50, height: 50, opacity: .95} : null;\n  return <AbsoluteFill style={{overflow: 'hidden'}}>\n    <AbsoluteFill style={{\n      opacity: exiting ? (oldVisible ? 1 : 0) : (newVisible ? 1 : 0),\n      clipPath: exiting ? (t === 4 ? 'inset(0 0 48% 0)' : 'none') : newMask,\n      filter: `blur(${blur}px)`,\n      transform: blur ? 'scaleY(1.045)' : undefined,\n    }}>{children}</AbsoluteFill>\n    {exiting && oldVisible && t > 0 && <AbsoluteFill style={{\n      opacity: .2, transform: 'translateY(12px) scaleY(1.04)',\n      filter: 'blur(5px)',\n    }}>{children}</AbsoluteFill>}\n    {exiting && band && <AbsoluteFill style={{\n      top: `${band.top}%`, height: `${band.height}%`,\n      background: 'linear-gradient(180deg,#fff4d7,#fff8df 45%,#fff0ca)',\n      opacity: band.opacity, boxShadow: '0 0 18px rgba(255,246,211,.8)',\n    }} />}\n  </AbsoluteFill>;\n}\n";

// Take the shortest clip in the bag that is still long enough for one slot.
// Ties keep the shuffled order, so equal-length clips are still chosen at random.
function takeShortestFitting(bag, need) {
  let best = -1;
  for (let i = 0; i < bag.length; i++) {
    if (bag[i].duration + 0.01 < need) continue;
    if (best < 0 || bag[i].duration < bag[best].duration) best = i;
  }
  if (best < 0) return null;
  return bag.splice(best, 1)[0];
}

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
// The reference edit every build makes: the team's "8-Clip Daily Vlog" timeline (Clip highlights), in 25 fps frames.
// Other Draft rates take round(f * fps / 25). 512 frames (20.48 s) of "Relaxed Urban Bed" from 36.04 s into the song.
const REFERENCE = {
  fps: 25, musicStartSeconds: 36.04,
  // [clip, start, end, split, scale, x, skip]: clip -1 is the opening clip, 0-7 the eight clips in order. A split cuts
  // the shot into two Main clips of the same clip with no transition, the second `skip` frames further into the
  // source (the reference jumps 72 frames there). scale and x are the reference's reframes, on top of the cover scale a
  // narrower clip gets.
  shots: [[-1, 0, 107], [0, 107, 151], [1, 151, 194], [2, 194, 275, 236, 1.1, 0, 72], [3, 275, 321, 0, 1.1], [4, 321, 366],
    [5, 366, 411], [6, 411, 451], [7, 451, 512, 0, 1.1, -6.944444444444444]],
  // [cut frame, label, code, frames before, frames after]
  cuts: [[107, "Reference traced film exposure", "FILM_PRISM", 5, 5], [151, "Reference amber camera exposure", "AMBER_REFERENCE", 3, 5],
    [194, "Reference wide cream film gate", "FILM_GATE", 3, 4], [321, "Reference banded vertical exposure", "VERTICAL_SMEAR", 3, 3],
    [411, "Reference amber camera exposure", "AMBER_REFERENCE", 4, 4], [451, "Reference traced film exposure", "FILM_PRISM", 5, 5]],
  // Title ranges: DAILY VLOG, JUST EVERYDAY MOMENTS, THANKS FOR WATCHING.
  titles: [[0, 107], [116, 194], [451, 512]],
  // [asset, start, end, dB], in this order: placed first-fit, the whoosh at 100 is the one on a second track.
  sounds: [["transition-w2.wav", 0, 34, 0], ["typing-k3.wav", 119, 152, -2], ["transition-w2.wav", 100, 134, 0], ["transition-w2.wav", 183, 217, 0],
    ["camera-r2.wav", 312, 335, 0], ["shutter-s6-1.wav", 366, 371, 0], ["typing-k3.wav", 451, 485, -2]],
  // The music dips under these frames (the dump has no levels; the plugin's ducking, by sound).
  ducks: [[107, -5], [194, -5], [321, -9], [366, -8], [451, -5]],
};

// Each reference shot with its clip: the opening, then `order` (eight clip ids). A missing clip is the opening clip
// again, from a later point in its source (pass 1).
function castReference(titleId, order) {
  return REFERENCE.shots.map(([k, start, end, split = 0, scale = 1, x = 0, skip = 0]) =>
    ({ id: k < 0 ? titleId : order[k] || titleId, pass: k >= 0 && !order[k] ? 1 : 0, start, end, split, scale, x, skip }));
}

// Builds the Draft from the opening clip and eight clips in shot order (castReference). Both the panel and a
// template run use it; resolves to the saved Draft.
async function buildDailyVlog(sdk, { projectId, titleId, order }) {
  // The install folder (<home>/.selects/skills/daily-vlog-8) through the Selects SDK (selects.files): a Selects build
  // that runs panels in an isolated frame gives them no host services, so window.parent is not used for it.
  const roots = await sdk.runScript({ summary: "Find the plugin files", allowCommit: false,
    script: "const e=await selects.files.environment();const s=e.platform==='win32'?'\\\\':'/';const d=[e.homedir,'.selects','skills','daily-vlog-8'].join(s);return (await selects.files.exists(d+s+'assets'))?{plugin:d}:null;" })
    .then(r => (r.isError ? null : r.result), () => null);
  if (!roots) throw new Error("Template assets directory is unavailable.");
  const assetPaths = ASSETS.map(name => hostJoin(roots.plugin, "assets", name));
  const cast = castReference(titleId, order);
  const draftName = "8-Clip Daily Vlog — " + new Date().toLocaleString();
  const script = `
const project=selects.project(${JSON.stringify(projectId)});
const cast=${JSON.stringify(cast)};
const REF=${JSON.stringify(REFERENCE)};
const assetPaths=${JSON.stringify(assetPaths)};
const assetNames=${JSON.stringify(ASSETS)};
// Read once inside this script; never return large font bytes through the SDK.
const openingFontPath=${JSON.stringify(hostJoin(roots.plugin, "assets", "fonts", "chelseamarket", "ChelseaMarket-Regular.ttf.b64"))};
const openingLicensePath=${JSON.stringify(hostJoin(roots.plugin, "assets", "fonts", "chelseamarket", "OFL.txt"))};
// The run_script realm intentionally has no browser atob/btoa globals.
function decodeOpeningBase64(text){
 const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
 if(typeof text!=='string'||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text))throw new Error('The bundled opening font has invalid base64.');
 let decoded='';
 for(let i=0;i<text.length;i+=4){
  const a=alphabet.indexOf(text[i]),b=alphabet.indexOf(text[i+1]),c=text[i+2]==='='?0:alphabet.indexOf(text[i+2]),d=text[i+3]==='='?0:alphabet.indexOf(text[i+3]);
  if((text[i+2]==='='&&(b&15)!==0)||(text[i+3]==='='&&(c&3)!==0))throw new Error('The bundled opening font has noncanonical padding.');
  decoded+=String.fromCharCode((a<<2)|(b>>4));
  if(text[i+2]!=='=')decoded+=String.fromCharCode(((b&15)<<4)|(c>>2));
  if(text[i+3]!=='=')decoded+=String.fromCharCode(((c&3)<<6)|d);
 }
 return decoded;
}
async function readOpeningAsset(path, expectedSize){
 const stat=await selects.files.stat(path);
 if(!stat||stat.isDirectory||stat.size!==expectedSize)throw new Error('The bundled opening font file is unavailable or incomplete.');
 let base64='';
 for(let offset=0;offset<stat.size;offset+=49152){
  const length=Math.min(49152,stat.size-offset),part=await selects.files.readRange({path,offset,length});
  if(!part||part.bytesRead!==length||typeof part.base64!=='string'||decodeOpeningBase64(part.base64).length!==length)throw new Error('The bundled opening font read is incomplete.');
  base64+=part.base64;
 }
 return base64;
}
const openingFontData=decodeOpeningBase64(await readOpeningAsset(openingFontPath,230568));
const openingFontBytes=decodeOpeningBase64(openingFontData);
if(openingFontBytes.length!==172924||!openingFontData.startsWith('AAEAAA'))throw new Error('The bundled opening font is not the expected TrueType file.');
const openingFontLicense=decodeOpeningBase64(await readOpeningAsset(openingLicensePath,4397));
if(!openingFontLicense.includes('SIL OPEN FONT LICENSE Version 1.1'))throw new Error('The bundled opening font license is unavailable.');
const openingFontCss='/*'+openingFontLicense+'*/\\n@font-face{font-family:"Chelsea Market";font-style:normal;font-weight:400;src:url(data:font/ttf;base64,'+openingFontData+') format("truetype");}';
const assetSeconds=${JSON.stringify(ASSET_SECONDS)};
const OPENING=${JSON.stringify(OPENING)};
const MIDDLE=${JSON.stringify(MIDDLE)};
const ENDING=${JSON.stringify(ENDING)};
const CODES={FILM_PRISM:${JSON.stringify(FILM_PRISM)},AMBER_REFERENCE:${JSON.stringify(AMBER_REFERENCE)},FILM_GATE:${JSON.stringify(FILM_GATE)},VERTICAL_SMEAR:${JSON.stringify(VERTICAL_SMEAR)}};
const name=${JSON.stringify(draftName)};
let rows=await project.resources();
const resourceById=new Map(rows.map(x=>[x.resourceId,x]));
for(const shot of cast){const r=resourceById.get(shot.id);if(!r||r.type!=='Video'||!(r.durationSeconds>0.1))throw new Error('A picked clip is not a usable video');}
const RATES=[24000/1001,24,25,30000/1001,30,48,50,60000/1001,60];
// A split may shorten its forward jump, but must have enough unique footage for both pieces.
// Include frame rounding at every supported Draft rate before importing audio or creating a Draft.
for(const [index,shot] of cast.entries()){
 const r=resourceById.get(shot.id);
 const needed=Math.max(...RATES.map(fps=>(Math.round(shot.end*fps/REF.fps)-Math.round(shot.start*fps/REF.fps))/fps))+0.003;
 if(r.durationSeconds+1e-9<needed)throw new Error((index===0?'Opening':'Clip '+index)+' ('+r.name+') needs at least '+(Math.ceil(needed*100)/100).toFixed(2)+' seconds; this video has '+r.durationSeconds.toFixed(2)+' seconds. Pick a longer video for this slot.');
}
let audioByName=new Map(rows.filter(x=>x.type==='Audio').map(x=>[x.name,x.resourceId]));
for(let i=0;i<assetNames.length;i++){if(!audioByName.has(assetNames[i])){const imported=await project.importFiles({paths:[assetPaths[i]]});if(!imported.addedResourceIds[0])throw new Error('Template sound missing: '+assetNames[i]);audioByName.set(assetNames[i],imported.addedResourceIds[0]);}}
let draft;
// Reference frames (25 fps) on the Draft's rate; the rate is read again after each insert (a Draft can adopt its
// first clip's rate). Ducking offsets (at) stay 30000/1001 fps frames.
const rate=async()=>{const reported=(await draft.meta()).fps;const r=RATES.find(x=>Math.abs(x-reported)<0.01)||reported;if(!(r>0))throw new Error('Unsupported draft frame rate: '+reported);return r;};
let dfps;
const F=(f)=>Math.round(f*dfps/REF.fps);
const at=(f)=>Math.round(f*1001/30000*dfps);
const OFFSETS=[0.45,0.15,0.75,0.3,0.6];
let placed=0;
const lay=async(aim=null)=>{
 draft=await project.createDraft({name});dfps=aim||await rate();placed=0;
for(const shot of cast){
  const r=resourceById.get(shot.id);
  const len=(shot.end-shot.start+shot.skip)/REF.fps;
  const available=r.durationSeconds-0.003;
  const visible=(F(shot.end)-F(shot.start))/dfps;
  let start=Math.max(0,Math.min(available-visible,(r.durationSeconds-Math.min(len,available))*OFFSETS[shot.pass%OFFSETS.length]));
  // Reserve the whole shot before its first insert. At a split, reduce only the forward jump;
  // never clamp behind the end of the preceding piece or loop over an already used range.
  for(const [piece,stop] of (shot.split?[shot.split,shot.end]:[shot.end]).entries()){
    if(piece)start=Math.max(start,Math.min(start+shot.skip/REF.fps,available-(F(stop)-placed)/dfps));
    const end=start+(F(stop)-placed)/dfps;
    if(end>available+1e-9||end-start<1/dfps-1e-9)throw new Error('Video '+r.name+' is too short for this slot');
    await draft.insertResource({resourceId:shot.id,sourceRange:{startSeconds:start,endSeconds:end}});
    const actual=await rate();
    // The first insert can adopt a different source rate. Discard this unsaved attempt before effects/commit;
    // aiming its first range at the adopted rate keeps the first cut on the same frame as its transition.
    if(placed===0&&actual!==dfps)return actual;
    dfps=actual;placed=Math.max(0,...(await draft.clips({trackScope:'main'})).map(c=>c.endFrame));start=end;
  }
}
 return null;
};
const adopted=await lay();
if(adopted&&await lay(adopted))throw new Error('The opening clip frame rate changed during the build.');
let main=(await draft.clips({trackScope:'main'})).filter(x=>x.resourceId);
const endFrame=Math.max(...main.map(c=>c.endFrame));
for(const original of main){const current=(await draft.clips({trackScope:'main'})).find(x=>x.clipId===original.clipId);if(current)await draft.setClipAudio({clip:current,volumeDb:-60});}
main=(await draft.clips({trackScope:'main'})).filter(x=>x.resourceId);
const sourceOverview=await project.sourceFiles();
const sourceSizes=new Map();
function collectSizes(nodes){for(const node of nodes){if(node.type==='dir')collectSizes(node.children);else if(node.frameSize)sourceSizes.set(node.resourceId,node.frameSize);}}
if('fileTree' in sourceOverview)collectSizes(sourceOverview.fileTree);
else for(const folder of sourceOverview.folders){const detail=await project.sourceFiles({folder:folder.name});if('fileTree' in detail)collectSizes(detail.fileTree);}
const canvas=(await draft.meta()).frameSize;
const targetAspect=canvas.width/canvas.height;
for(const original of main){const shot=cast.find(s=>original.startFrame<F(s.end))||cast[cast.length-1];const size=sourceSizes.get(original.resourceId);const sourceAspect=size?size.width/size.height:targetAspect;const scale=(sourceAspect<targetAspect?targetAspect/sourceAspect:1)*shot.scale;if(scale>1.001||shot.x){const current=(await draft.clips({trackScope:'main'})).find(x=>x.clipId===original.clipId);if(current)await draft.setClipTransform({clip:current,scale:{x:scale,y:scale},...(shot.x?{position:{x:shot.x,y:0}}:{})});}}
const [t1,t2,t3]=REF.titles;
await draft.addMotionGraphic({label:'DAILY VLOG',tsxCode:OPENING,within:await draft.rangeAtFrames(F(t1[0]),F(t1[1])),parameters:{text:'DAILY VLOG',fontFamily:'"Chelsea Market Pro", "Chelsea Market"',fontCss:openingFontCss,fontSize:255,color:'#FEDC5E'},editableParameters:[{key:'text',label:'Text',type:'text',defaultValue:'DAILY VLOG'},{key:'fontFamily',label:'Font',type:'text',defaultValue:'"Chelsea Market Pro", "Chelsea Market"'},{key:'fontSize',label:'Size',type:'number',defaultValue:255,min:100,max:450,step:2},{key:'color',label:'Color',type:'color',defaultValue:'#FEDC5E'}]});
await draft.addMotionGraphic({label:'JUST EVERYDAY MOMENTS',tsxCode:MIDDLE,within:await draft.rangeAtFrames(F(t2[0]),F(t2[1])),parameters:{text:'JUST EVERYDAY MOMENTS',fontFamily:'Courier New',fontSize:73,color:'#FFFFFF'},editableParameters:[{key:'text',label:'Text',type:'text',defaultValue:'JUST EVERYDAY MOMENTS'},{key:'fontFamily',label:'Font',type:'text',defaultValue:'Courier New'},{key:'fontSize',label:'Size',type:'number',defaultValue:73,min:28,max:120,step:2},{key:'color',label:'Color',type:'color',defaultValue:'#FFFFFF'}]});
await draft.addMotionGraphic({label:'THANKS FOR WATCHING',tsxCode:ENDING,within:await draft.rangeAtFrames(F(t3[0]),Math.min(F(t3[1]),endFrame)),parameters:{text:'THANKS FOR WATCHING',fontFamily:'Courier New',fontSize:60,color:'#FFFFFF',letterSpacing:1.2},editableParameters:[{key:'text',label:'Text',type:'text',defaultValue:'THANKS FOR WATCHING'},{key:'fontFamily',label:'Font',type:'text',defaultValue:'Courier New'},{key:'fontSize',label:'Size',type:'number',defaultValue:60,min:18,max:90,step:1},{key:'color',label:'Color',type:'color',defaultValue:'#FFFFFF'}]});
for(const [frame,label,code,before,after] of REF.cuts){
  const clip=(await draft.clips({trackScope:'main'})).filter(x=>x.resourceId).filter(x=>x.endFrame<=F(frame)).slice(-1)[0];
  await draft.addTransition({after:clip,label:String(label),tsxCode:CODES[String(code)],inOffsetSeconds:F(before)/dfps,outOffsetSeconds:F(after)/dfps});
}
const lengths=new Map((await project.resources()).map(x=>[x.resourceId,x.durationSeconds]));
async function sound(assetName,start,end,level,from=0){const resourceId=audioByName.get(assetName);const seconds=Math.min(lengths.get(resourceId)||Infinity,assetSeconds[assetName]||Infinity)-from;if(seconds<Infinity)end=Math.min(end,start+Math.floor(seconds*dfps+1e-3));if(end<=start)return;await draft.overlayResource({resource:project.resource(resourceId),over:await draft.rangeAtFrames(start,end),...(from?{sourceStartSeconds:from}:{})});const added=(await draft.clips({trackScope:'all'})).filter(x=>x.resourceId===resourceId&&x.startFrame===start).slice(-1)[0];if(added)await draft.setClipAudio({clip:added,volumeDb:level,fadeInSeconds:0,fadeOutSeconds:assetName===assetNames[0]?0:assetName==='typing-k3.wav'?.08:.025});}
await sound(assetNames[0],0,endFrame,0,REF.musicStartSeconds);
const musicId=audioByName.get(assetNames[0]);
const musicClip=(await draft.clips({trackScope:'all'})).find(x=>x.resourceId===musicId&&x.startFrame===0);
if(musicClip){const fps=(await draft.meta()).fps;const keys=[{atSeconds:0,volumeDb:-5},{atSeconds:at(34)/fps,volumeDb:-5},{atSeconds:at(43)/fps,volumeDb:0}];for(const [f,drop] of REF.ducks)for(const [offset,db] of [[at(-7),0],[at(-3),drop],[at(5),drop],[at(11),0]])if(F(f)+offset>at(43)&&F(f)+offset<endFrame)keys.push({atSeconds:(F(f)+offset)/fps,volumeDb:db});keys.push({atSeconds:(endFrame-1)/fps,volumeDb:0});keys.sort((a,b)=>a.atSeconds-b.atSeconds);await draft.setClipAudio({clip:musicClip,volumeKeys:keys});}
for(const [assetName,start,end,level] of REF.sounds)await sound(assetName,F(start),Math.min(F(end),endFrame),level);
const saved=await draft.commitAll('Create editable daily vlog from the reference edit');
return {draftId:saved.createdDraftId,name,frames:endFrame,fps:(await draft.meta()).fps,shots:cast.length,videoClips:main.length,transitions:REF.cuts.length};`;
  const r = await sdk.runScript({ summary: "Build daily vlog Draft", script, allowCommit: true, timeoutSeconds: 120 });
  if (r.isError || !r.result) throw new Error(r.output || "No result was returned.");
  return r.result;
}

// A template run (Clip highlights): the app hands over the opening clip and seven
// to nine more; the first eight fill the reference shots in order (with seven, the
// opening clip returns before the closing shot; a ninth is not used).
const TEMPLATE_FAILED = "8-Clip Daily Vlog could not make the timeline; try again.";
const templateIssue = message => Object.assign(new Error(message), { publicMessage: message });
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
const VIDEO_LENGTHS = (pid, resourceIds = null) => `const selected=${JSON.stringify(resourceIds)};const rows=await selects.project(${JSON.stringify(pid)}).resources();return rows.filter(x=>x.type==='Video'&&(!selected||selected.includes(x.resourceId))).map(x=>({id:x.resourceId,name:x.name,duration:x.durationSeconds||0}));`;

function DailyTemplateRun({ sdk, context }) {
  useAppUpdateGuard(sdk, context?.language, () => !!(true));
  const runId = context.template?.runId;
  const [status, setStatus] = React.useState("Making your daily vlog…");
  const started = React.useRef(null), alive = React.useRef(true), latest = React.useRef(context);
  latest.current = context;
  React.useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  React.useEffect(() => {
    if (!runId || started.current === runId) return;
    started.current = runId;
    const live = () => alive.current && latest.current.template?.runId === runId;
    let ended = false;
    const finish = result => { if (ended) return; ended = true; if (!live()) return; try { sdk.finishTemplate(result); } catch {} };
    const say = text => { if (live()) setStatus(text); };
    const projectId = context.projectId, inputs = context.template?.inputs || {};
    (async () => {
      try {
        if (!projectId) throw templateIssue("Open a project, then try again.");
        const picked = id => (inputs[id] || []).filter(x => x?.kind === "video" && x.resourceId);
        let [opening] = picked("opening"), clips = picked("clips");
        if (!opening) throw templateIssue("Pick an opening clip, then try again.");
        const seen = new Set([opening.resourceId]);
        clips = clips.filter(pick => { if (seen.has(pick.resourceId)) return false; seen.add(pick.resourceId); return true; });
        if (clips.length < 7) throw templateIssue("Pick at least seven more clips, then try again.");
        say("Finding your clips…");
        const ids = await scriptResourceIds(sdk, projectId, [opening, ...clips].map(x => x.resourceId));
        const own = pick => pick && { ...pick, resourceId: ids.get(pick.resourceId) ?? pick.resourceId };
        const r = await readMediaPages(sdk, { summary: "List daily vlog videos", script: VIDEO_LENGTHS(projectId, [...ids.values()]), allowCommit: false });
        if (r.isError || !Array.isArray(r.result)) throw new Error(r.output || "Could not read the project videos.");
        const byId = new Map(r.result.map(v => [v.id, v]));
        opening = own(opening); clips = clips.map(own);
        for (const pick of [opening, ...clips]) if (!byId.has(pick.resourceId)) throw templateIssue((pick.name || "A picked clip") + " is no longer in this project.");
        if (!live()) return;
        say("Cutting your daily vlog…");
        const result = await buildDailyVlog(sdk, {
          projectId,
          titleId: opening.resourceId,
          // With seven clips the shot before the closing one has no clip of its own (the opening clip returns).
          order: clips.length < 8 ? [...clips.slice(0, 6), null, clips[6]].map(x => x && x.resourceId) : clips.slice(0, 8).map(x => x.resourceId),
        });
        finish({ sequenceId: result.draftId });
      } catch (e) {
        console.warn("[daily-vlog-8] template run failed:", e?.message || String(e));
        const said = String(e?.message || "");
        finish({ error: e?.publicMessage || (/too short/.test(said) ? "A picked clip is too short for its slot; pick longer clips, then try again." : said.trim().slice(0, 500) || TEMPLATE_FAILED) });
      } finally { finish({ error: TEMPLATE_FAILED }); }
    })();
  }, [runId]);
  return <p role="status" style={{ margin: 0, fontSize: 12 }}>{status}</p>;
}

function Panel(props) {
  hostUseSdk(props.sdk);
  return props.context.template ? <DailyTemplateRun {...props} /> : <DailyVlogPanel {...props} />;
}

function DailyVlogPanel({ sdk, context, ui }) {
  useAppUpdateGuard(sdk, context?.language, () => !!(busy || loadingFolders || loadingVideos));
  const t = TEXT[context.language] || TEXT.en;
  const [folders, setFolders] = React.useState([]);
  const [folderName, setFolderName] = React.useState(null);
  const [pool, setPool] = React.useState([]);
  const [titleId, setTitleId] = React.useState(null);
  const [picks, setPicks] = React.useState(() => Array.from({ length: 7 }, () => null));
  const [manual, setManual] = React.useState(false);
  const [loadingFolders, setLoadingFolders] = React.useState(false);
  const [loadingVideos, setLoadingVideos] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState("");
  const [error, setError] = React.useState("");

  // Fill only the empty slots. The longest slot is served first and each slot takes
  // the shortest clip that still fits, so a long clip is never spent on a short slot
  // while a longer slot is left with nothing that reaches its length.
  function fillEmpty(current, headId, list) {
    const used = new Set(current.filter(Boolean));
    const bag = list.filter(x => x.id !== headId && !used.has(x.id));
    for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const tmp = bag[i]; bag[i] = bag[j]; bag[j] = tmp; }
    const order = current.map((value, slot) => slot).filter(slot => !current[slot])
      .sort((a, b) => DURATIONS[b + 1] - DURATIONS[a + 1]);
    const out = current.slice();
    for (const slot of order) {
      const got = takeShortestFitting(bag, DURATIONS[slot + 1]);
      out[slot] = got ? got.id : null;
    }
    return out;
  }

  function autofill(list, headId) {
    return fillEmpty(Array.from({ length: 7 }, () => null), headId, list);
  }

  function applyPool(list) {
    setPool(list);
    if (!list.length) {
      setTitleId(null);
      setPicks(Array.from({ length: 7 }, () => null));
      setManual(false);
      setError(t.noVideos);
      return;
    }
    const eligible = list.filter(x => x.duration + 0.01 >= DURATIONS[0]).sort((a, b) => b.duration - a.duration);
    const headId = eligible.length ? eligible[0].id : null;
    setTitleId(headId);
    const filled = autofill(list, headId);
    setPicks(filled);
    setManual(filled.some(x => !x));
  }

  async function loadFolders() {
    if (!context.projectId) return;
    setLoadingFolders(true); setError(""); setStatus("");
    try {
      const script = `
const project=selects.project(${JSON.stringify(context.projectId)});
const rows=await project.resources();
const videoById=new Map(rows.filter(x=>x.type==='Video').map(x=>[x.resourceId,x]));
const overview=await project.sourceFiles();
if('fileTree' in overview){
  const out=[];
  const walk=(nodes,prefix)=>{
    const videos=[];
    for(const node of nodes){
      if(node.type==='dir')walk(node.children,prefix?prefix+'/'+node.name:node.name);
      else if(videoById.has(node.resourceId))videos.push({id:node.resourceId,name:node.name,duration:videoById.get(node.resourceId).durationSeconds||node.durationSeconds||0});
    }
    if(videos.length)out.push({folder:prefix||'(root)',videoCount:videos.length,videos});
  };
  walk(overview.fileTree,'');
  return {folders:out};
}
return {folders:overview.folders.filter(f=>f.videoCount>0).map(f=>({folder:f.name,videoCount:f.videoCount,videos:null}))};`;
      const r = await sdk.runScript({ summary: "List project folders", script });
      if (r.isError || !r.result || !Array.isArray(r.result.folders)) throw new Error(r.output || "Could not list project folders.");
      setFolders(r.result.folders);
      if (!r.result.folders.length) setError(t.noFolders);
    } catch (e) {
      setError(String(e && e.message ? e.message : e));
    } finally {
      setLoadingFolders(false);
    }
  }

  React.useEffect(() => {
    setFolders([]);
    setFolderName(null);
    setPool([]);
    setTitleId(null);
    setPicks(Array.from({ length: 7 }, () => null));
    setManual(false);
    setStatus("");
    setError("");
    if (context.projectId) loadFolders();
  }, [context.projectId]);

  async function selectFolder(name) {
    setFolderName(name);
    setPool([]);
    setTitleId(null);
    setPicks(Array.from({ length: 7 }, () => null));
    setManual(false);
    setError(""); setStatus("");
    const entry = folders.find(f => f.folder === name);
    if (entry && Array.isArray(entry.videos)) { applyPool(entry.videos); return; }
    setLoadingVideos(true);
    try {
      const script = `
const project=selects.project(${JSON.stringify(context.projectId)});
const rows=await project.resources();
const videoById=new Map(rows.filter(x=>x.type==='Video').map(x=>[x.resourceId,x]));
const detail=await project.sourceFiles({folder:${JSON.stringify(name)}});
const tree='fileTree' in detail?detail.fileTree:[];
const videos=[];
const walk=(nodes)=>{for(const node of nodes){if(node.type==='dir')walk(node.children);else if(videoById.has(node.resourceId))videos.push({id:node.resourceId,name:node.name,duration:videoById.get(node.resourceId).durationSeconds||node.durationSeconds||0});}};
walk(tree);
return videos;`;
      const r = await sdk.runScript({ summary: "List folder videos", script });
      if (r.isError || !Array.isArray(r.result)) throw new Error(r.output || "Could not read the folder.");
      applyPool(r.result);
    } catch (e) {
      setError(String(e && e.message ? e.message : e));
    } finally {
      setLoadingVideos(false);
    }
  }

  function changeTitle(id) {
    setTitleId(id);
    setPicks(prev => fillEmpty(prev.map(x => (x === id ? null : x)), id, pool));
    setError("");
  }

  function reshuffle() {
    setPicks(autofill(pool, titleId));
    setError("");
  }

  function changeSlot(index, id) {
    setPicks(prev => prev.map((x, i) => (i === index ? id : x)));
    setError("");
  }

  async function build() {
    if (!context.projectId) { setError(t.noProject); return; }
    if (!folderName) { setError(t.needFolder); return; }
    if (!titleId || picks.some(x => !x)) { setError(t.needAll); return; }
    setBusy(true); setError(""); setStatus("");
    try {
      // The reference has eight clips after the opening: the seven picks (the last one closes) and, before the closing
      // shot, one more clip from the folder.
      const spare = pool.filter(x => x.id !== titleId && !picks.includes(x.id) && x.duration >= 1.6);
      const extra = spare.length ? spare[Math.floor(Math.random() * spare.length)].id : null;
      const result = await buildDailyVlog(sdk, { projectId: context.projectId, titleId, order: [...picks.slice(0, 6), extra, picks[6]] });
      setStatus(t.made + ": " + result.name);
    } catch (e) {
      setError(t.failed + String(e && e.message ? e.message : e));
    } finally {
      setBusy(false);
    }
  }

  if (!context.projectId) return <ui.Message tone="error">{t.noProject}</ui.Message>;
  const nameById = new Map(pool.map(x => [x.id, x.name]));
  const headOptions = pool.filter(x => x.duration + 0.01 >= DURATIONS[0]).map(x => ({ value: x.id, label: x.name + " · " + Math.round(x.duration) + "s" }));
  const folderOptions = folders.map(f => ({ value: f.folder, label: (f.folder === "(root)" ? t.rootFolder : f.folder) + " · " + f.videoCount + t.videosFoundTail }));
  const short = picks.some(x => !x);
  const readyCount = (titleId ? 1 : 0) + picks.filter(Boolean).length;
  return <>

    <ui.Section title={t.folderTitle} actions={<ui.IconButton icon="refresh" label={t.refresh} disabled={loadingFolders || busy} onClick={loadFolders} />}>
      <p>{t.intro}</p>
      <ui.Select label={t.folderLabel} value={folderName} onChange={selectFolder} options={folderOptions} placeholder={t.slotEmpty} disabled={loadingFolders || busy} />
      <p>{t.folderHint}</p>
      {loadingFolders && <ui.Message>{t.loadingFolders}</ui.Message>}
      {loadingVideos && <ui.Message>{t.loadingVideos}</ui.Message>}
      {!loadingFolders && !loadingVideos && pool.length > 0 && <ui.Message tone="success">{t.videosFound}{pool.length}{t.videosFoundTail}</ui.Message>}
    </ui.Section>

    {pool.length > 0 && <ui.Section title={t.titleTitle}>
      <ui.Select label={t.titleLabel} value={titleId} onChange={changeTitle} options={headOptions} placeholder={t.slotEmpty} disabled={busy} />
      <p>{t.titleHint}</p>
    </ui.Section>}

    {pool.length > 0 && <ui.Section title={t.restTitle} actions={<ui.IconButton icon="refresh" label={t.reshuffle} disabled={busy} onClick={reshuffle} />}>
      {short ? <ui.Message tone="error">{t.restManual}</ui.Message> : <ui.Message tone="muted">{t.restAuto}</ui.Message>}
      {(short || manual) && t.slots.slice(1).map((label, i) =>
        <ui.Select key={i}
          label={(i + 2) + ". " + label + " · " + DURATIONS[i + 1].toFixed(1) + "s"}
          value={picks[i]}
          onChange={value => changeSlot(i, value)}
          options={pool.filter(x => x.id !== titleId && x.duration + 0.01 >= DURATIONS[i + 1]).map(x => ({ value: x.id, label: x.name + " · " + Math.round(x.duration) + "s" }))}
          placeholder={t.slotEmpty}
          disabled={busy} />)}
      {!short && !manual && <>
        <ol>{picks.map((id, i) => <li key={i}>{nameById.get(id) || t.slotEmpty}</li>)}</ol>
        <ui.Actions><ui.Button variant="ghost" onClick={() => setManual(true)}>{t.showManual}</ui.Button></ui.Actions>
      </>}
      {!short && manual && <ui.Actions><ui.Button variant="ghost" onClick={() => setManual(false)}>{t.hideManual}</ui.Button></ui.Actions>}
    </ui.Section>}

    <ui.Section title="Create">
      <ui.Actions><ui.Button variant="primary" busy={busy} busyLabel={t.building} disabled={loadingFolders || loadingVideos || !titleId || short} onClick={build}>{t.build}</ui.Button></ui.Actions>
      <p>{readyCount}/8</p>
      {status && <ui.Message>{status}</ui.Message>}
      {error && <ui.Message tone="error">{error}</ui.Message>}
      <p>{t.credit} · freesound.org/people/theplax/sounds/624936/</p>
    </ui.Section>
  </>;
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

// app-update-guard:start
// Shared source, inlined into portable panels by tools/sync_app_update_guards.py.
import * as AppUpdateGuardReact from 'react';

const appUpdateGuardScopes = new WeakMap<object, any>();

/** Each mounted editor contributes a live veto; the host receives one guard per SDK. */
function useAppUpdateGuard(sdk: any, language: string | undefined, readBlocked: (context: any) => boolean) {
  const live = AppUpdateGuardReact.useRef({ language, readBlocked });
  live.current = { language, readBlocked };
  AppUpdateGuardReact.useEffect(() => {
    const api = sdk?.updates;
    if (typeof api?.registerGuard !== 'function') return;
    let group = appUpdateGuardScopes.get(api);
    if (!group) {
      group = { entries: new Set(), dispose: null };
      appUpdateGuardScopes.set(api, group);
    }
    group.entries.add(live);
    if (!group.dispose) {
      group.dispose = api.registerGuard({
        async canUpdate(context: any) {
          for (const entry of group.entries) {
            // A partially initialized editor must not lose state during reload.
            let blocked = true;
            try { blocked = Boolean(entry.current.readBlocked(context)); } catch { /* fail closed */ }
            if (blocked) {
              const korean = String(entry.current.language || '').toLowerCase().startsWith('ko');
              throw new Error(korean
                ? '\uc9c4\ud589 \uc911\uc778 \uc791\uc5c5\uc744 \ub9c8\uce58\uace0 \ubcc0\uacbd\uc0ac\ud56d\uc744 \uc800\uc7a5\ud55c \ub4a4 \uc571\uc744 \uc5c5\ub370\uc774\ud2b8\ud574\uc8fc\uc138\uc694.'
                : 'Finish the current operation and save changes before updating this app.');
            }
          }
        },
      });
    }
    return () => {
      group.entries.delete(live);
      if (!group.entries.size) {
        group.dispose?.();
        appUpdateGuardScopes.delete(api);
      }
    };
  }, [sdk?.updates]);
}
// app-update-guard:end
