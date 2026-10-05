// @name Comfy Cloud
// @name:de Comfy Cloud
// @name:en Comfy Cloud
// @name:es Comfy Cloud
// @name:fr Comfy Cloud
// @name:it Comfy Cloud
// @name:ja Comfy Cloud
// @name:ko Comfy Cloud
// @name:pt Comfy Cloud
// @name:tr Comfy Cloud
// @name:zh Comfy Cloud
// @icon comfyui
import React from 'react';

const COPY = {
  "en": {
    "connected": "Connected",
    "disconnected": "Disconnected",
    "connect": "Connect",
    "connecting": "Connecting\u2026",
    "refresh": "Refresh connection",
    "changeKey": "Change API key",
    "changeWorkflow": "Change workflow",
    "custom": "Pasted workflow",
    "nodes": "nodes",
    "choose": "Choose file",
    "drop": "Drop a workflow JSON file",
    "clear": "Remove",
    "guide": "JSON exported from Comfy in API format",
    "sample": "Load example",
    "sampleName": "Z-Image Turbo example",
    "prompt": "Prompt",
    "width": "Width",
    "height": "Height",
    "seed": "Seed",
    "image": "Input image",
    "jsonPlaceholder": "Paste API-format JSON",
    "save": "Save workflow",
    "run": "Run",
    "held": "Execution disabled",
    "paid": "Uses Comfy credits",
    "destination": "Results are saved to your project automatically.",
    "project": "Open a project.",
    "loading": "Loading\u2026",
    "uploading": "Uploading image\u2026",
    "submitting": "Starting\u2026",
    "queued": "Queued\u2026",
    "running": "Running\u2026",
    "downloading": "Downloading results\u2026",
    "importing": "Saving results\u2026",
    "added": "Saved to project",
    "retry": "Retry saving",
    "resume": "Recover results",
    "invalidJson": "Check the JSON format.",
    "invalid_workflow": "Use JSON exported from Comfy in API format.",
    "runtime": "Node.js 22+ and the plugin files are required.",
    "connection_failed": "Could not connect. Refresh the connection.",
    "invalid_key": "Check your Comfy API key.",
    "not_connected": "Connect your Comfy account first.",
    "generation_disabled": "Execution disabled.",
    "invalid_image": "Choose a PNG, JPEG or WebP image under 100 MB.",
    "import_failed": "Could not save all results. Retry saving.",
    "interrupted": "Connection interrupted. Recover results to continue.",
    "submission_unknown": "Submission is uncertain. Check Comfy job history before another run.",
    "updateApp": "Update Selects to choose input images.",
    "comfyError": "Comfy request failed",
    "invalidWorkflow": "Use JSON exported from Comfy in API format.",
    "disconnect": "Disconnect",
    "dismiss": "Dismiss failed run"
  },
  "ko": {
    "connected": "\uc5f0\uacb0\ub428",
    "disconnected": "\ubbf8\uc5f0\uacb0",
    "connect": "\uc5f0\uacb0",
    "connecting": "\uc5f0\uacb0 \uc911\u2026",
    "refresh": "\uc5f0\uacb0 \uc0c8\ub85c\uace0\uce68",
    "changeKey": "API key \ubcc0\uacbd",
    "changeWorkflow": "Workflow \ubcc0\uacbd",
    "custom": "\uc9c1\uc811 \uc785\ub825\ud55c workflow",
    "nodes": "\ub178\ub4dc",
    "choose": "\ud30c\uc77c \uc120\ud0dd",
    "drop": "Workflow JSON \ud30c\uc77c\uc744 \ub193\uc73c\uc138\uc694",
    "clear": "\uc81c\uac70",
    "guide": "Comfy\uc5d0\uc11c \ub0b4\ubcf4\ub0b8 API \ud615\uc2dd JSON",
    "sample": "\uc608\uc81c \ubd88\ub7ec\uc624\uae30",
    "sampleName": "Z-Image Turbo \uc608\uc81c",
    "prompt": "Prompt",
    "width": "\ub108\ube44",
    "height": "\ub192\uc774",
    "seed": "Seed",
    "image": "\uc785\ub825 \uc774\ubbf8\uc9c0",
    "jsonPlaceholder": "API \ud615\uc2dd JSON \ubd99\uc5ec\ub123\uae30",
    "save": "Workflow \uc800\uc7a5",
    "run": "\uc2e4\ud589",
    "held": "\uc2e4\ud589 \ube44\ud65c\uc131",
    "paid": "Comfy \ud06c\ub808\ub527 \uc0ac\uc6a9",
    "destination": "\uacb0\uacfc\ub294 \ud504\ub85c\uc81d\ud2b8\uc5d0 \uc790\ub3d9 \uc800\uc7a5\ub429\ub2c8\ub2e4.",
    "project": "\ud504\ub85c\uc81d\ud2b8\ub97c \uc5f4\uc5b4 \uc8fc\uc138\uc694.",
    "loading": "\ubd88\ub7ec\uc624\ub294 \uc911\u2026",
    "uploading": "\uc774\ubbf8\uc9c0 \uc5c5\ub85c\ub4dc \uc911\u2026",
    "submitting": "\uc2e4\ud589 \uc900\ube44 \uc911\u2026",
    "queued": "\ub300\uae30 \uc911\u2026",
    "running": "\uc2e4\ud589 \uc911\u2026",
    "downloading": "\uacb0\uacfc \ub2e4\uc6b4\ub85c\ub4dc \uc911\u2026",
    "importing": "\uacb0\uacfc \uc800\uc7a5 \uc911\u2026",
    "added": "\ud504\ub85c\uc81d\ud2b8\uc5d0 \uc800\uc7a5\ub428",
    "retry": "\uc800\uc7a5 \uc7ac\uc2dc\ub3c4",
    "resume": "\uacb0\uacfc \uc774\uc5b4\ubc1b\uae30",
    "invalidJson": "JSON \ud615\uc2dd\uc744 \ud655\uc778\ud574 \uc8fc\uc138\uc694.",
    "invalid_workflow": "Comfy\uc5d0\uc11c API \ud615\uc2dd\uc73c\ub85c \ub0b4\ubcf4\ub0b8 JSON\uc744 \uc0ac\uc6a9\ud574 \uc8fc\uc138\uc694.",
    "runtime": "Node.js 22 \uc774\uc0c1\uacfc \ud50c\ub7ec\uadf8\uc778 \ud30c\uc77c\uc774 \ud544\uc694\ud569\ub2c8\ub2e4.",
    "connection_failed": "\uc5f0\uacb0\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4. \uc5f0\uacb0\uc744 \uc0c8\ub85c\uace0\uce68\ud574 \uc8fc\uc138\uc694.",
    "invalid_key": "Comfy API key\ub97c \ud655\uc778\ud574 \uc8fc\uc138\uc694.",
    "not_connected": "Comfy \uacc4\uc815\uc744 \uba3c\uc800 \uc5f0\uacb0\ud574 \uc8fc\uc138\uc694.",
    "generation_disabled": "\uc2e4\ud589 \ube44\ud65c\uc131 \uc0c1\ud0dc\uc785\ub2c8\ub2e4.",
    "invalid_image": "100 MB \uc774\ud558\uc758 PNG, JPEG, WebP \uc774\ubbf8\uc9c0\ub97c \uc120\ud0dd\ud574 \uc8fc\uc138\uc694.",
    "import_failed": "\uacb0\uacfc\ub97c \uc800\uc7a5\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. \uc800\uc7a5\uc744 \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.",
    "interrupted": "\uc5f0\uacb0\uc774 \uc911\ub2e8\ub410\uc2b5\ub2c8\ub2e4. \uacb0\uacfc \uc774\uc5b4\ubc1b\uae30\ub85c \uacc4\uc18d\ud574 \uc8fc\uc138\uc694.",
    "submission_unknown": "\uc2e4\ud589 \uc811\uc218 \uc5ec\ubd80\uac00 \ubd88\ud655\uc2e4\ud569\ub2c8\ub2e4. Comfy \uc2e4\ud589 \uae30\ub85d\uc744 \ud655\uc778\ud574 \uc8fc\uc138\uc694.",
    "updateApp": "\uc785\ub825 \uc774\ubbf8\uc9c0\ub97c \uc120\ud0dd\ud558\ub824\uba74 Selects\ub97c \uc5c5\ub370\uc774\ud2b8\ud574 \uc8fc\uc138\uc694.",
    "comfyError": "Comfy \uc694\uccad \uc2e4\ud328",
    "invalidWorkflow": "Comfy\uc5d0\uc11c API \ud615\uc2dd\uc73c\ub85c \ub0b4\ubcf4\ub0b8 JSON\uc744 \uc0ac\uc6a9\ud574 \uc8fc\uc138\uc694.",
    "disconnect": "\uc5f0\uacb0 \ud574\uc81c",
    "dismiss": "\uc2e4\ud328\ud55c \uc2e4\ud589 \ub2eb\uae30"
  },
  "de": {
    "connected": "Verbunden",
    "disconnected": "Nicht verbunden",
    "connect": "Verbinden",
    "connecting": "Verbindung\u2026",
    "refresh": "Verbindung aktualisieren",
    "changeKey": "API-Schl\u00fcssel \u00e4ndern",
    "changeWorkflow": "Workflow wechseln",
    "custom": "Eingef\u00fcgter Workflow",
    "nodes": "Knoten",
    "choose": "Datei w\u00e4hlen",
    "drop": "Workflow-JSON ablegen",
    "clear": "Entfernen",
    "guide": "Aus Comfy im API-Format exportiertes JSON",
    "sample": "Beispiel laden",
    "sampleName": "Z-Image Turbo Beispiel",
    "prompt": "Prompt",
    "width": "Breite",
    "height": "H\u00f6he",
    "seed": "Seed",
    "image": "Eingabebild",
    "jsonPlaceholder": "JSON im API-Format einf\u00fcgen",
    "save": "Workflow speichern",
    "run": "Ausf\u00fchren",
    "held": "Ausf\u00fchrung deaktiviert",
    "paid": "Verbraucht Comfy-Credits",
    "destination": "Ergebnisse werden im Projekt gespeichert.",
    "project": "\u00d6ffnen Sie ein Projekt.",
    "loading": "Laden\u2026",
    "uploading": "Bild wird hochgeladen\u2026",
    "submitting": "Starten\u2026",
    "queued": "In Warteschlange\u2026",
    "running": "Wird ausgef\u00fchrt\u2026",
    "downloading": "Ergebnisse herunterladen\u2026",
    "importing": "Ergebnisse speichern\u2026",
    "added": "Im Projekt gespeichert",
    "retry": "Speichern wiederholen",
    "resume": "Ergebnisse wiederherstellen",
    "invalidJson": "Pr\u00fcfen Sie das JSON-Format.",
    "invalid_workflow": "Verwenden Sie aus Comfy exportiertes API-JSON.",
    "runtime": "Node.js 22+ und Plugin-Dateien erforderlich.",
    "connection_failed": "Verbindung fehlgeschlagen. Aktualisieren Sie sie.",
    "invalid_key": "Pr\u00fcfen Sie Ihren Comfy-API-Schl\u00fcssel.",
    "not_connected": "Verbinden Sie zuerst Ihr Comfy-Konto.",
    "generation_disabled": "Ausf\u00fchrung deaktiviert.",
    "invalid_image": "W\u00e4hlen Sie PNG, JPEG oder WebP unter 100 MB.",
    "import_failed": "Speichern fehlgeschlagen. Versuchen Sie es erneut.",
    "interrupted": "Verbindung unterbrochen. Stellen Sie Ergebnisse wieder her.",
    "submission_unknown": "\u00dcbermittlung unklar. Pr\u00fcfen Sie den Comfy-Verlauf vor einem neuen Lauf.",
    "updateApp": "Aktualisieren Sie Selects f\u00fcr Eingabebilder.",
    "comfyError": "Comfy-Anfrage fehlgeschlagen",
    "invalidWorkflow": "Verwenden Sie aus Comfy exportiertes API-JSON.",
    "disconnect": "Trennen",
    "dismiss": "Fehlgeschlagenen Lauf schlie\u00dfen"
  },
  "es": {
    "connected": "Conectado",
    "disconnected": "Sin conexi\u00f3n",
    "connect": "Conectar",
    "connecting": "Conectando\u2026",
    "refresh": "Actualizar conexi\u00f3n",
    "changeKey": "Cambiar clave API",
    "changeWorkflow": "Cambiar workflow",
    "custom": "Workflow pegado",
    "nodes": "nodos",
    "choose": "Elegir archivo",
    "drop": "Suelta un JSON de workflow",
    "clear": "Quitar",
    "guide": "JSON exportado desde Comfy en formato API",
    "sample": "Cargar ejemplo",
    "sampleName": "Ejemplo Z-Image Turbo",
    "prompt": "Prompt",
    "width": "Ancho",
    "height": "Alto",
    "seed": "Semilla",
    "image": "Imagen de entrada",
    "jsonPlaceholder": "Pega JSON en formato API",
    "save": "Guardar workflow",
    "run": "Ejecutar",
    "held": "Ejecuci\u00f3n desactivada",
    "paid": "Usa cr\u00e9ditos Comfy",
    "destination": "Los resultados se guardan en tu proyecto.",
    "project": "Abre un proyecto.",
    "loading": "Cargando\u2026",
    "uploading": "Subiendo imagen\u2026",
    "submitting": "Iniciando\u2026",
    "queued": "En cola\u2026",
    "running": "Ejecutando\u2026",
    "downloading": "Descargando resultados\u2026",
    "importing": "Guardando resultados\u2026",
    "added": "Guardado en el proyecto",
    "retry": "Reintentar guardado",
    "resume": "Recuperar resultados",
    "invalidJson": "Revisa el formato JSON.",
    "invalid_workflow": "Usa JSON exportado de Comfy en formato API.",
    "runtime": "Se necesita Node.js 22+ y los archivos del plugin.",
    "connection_failed": "No se pudo conectar. Actualiza la conexi\u00f3n.",
    "invalid_key": "Revisa tu clave API de Comfy.",
    "not_connected": "Conecta primero tu cuenta Comfy.",
    "generation_disabled": "Ejecuci\u00f3n desactivada.",
    "invalid_image": "Elige PNG, JPEG o WebP de menos de 100 MB.",
    "import_failed": "No se guardaron todos los resultados. Reintenta.",
    "interrupted": "Conexi\u00f3n interrumpida. Recupera los resultados.",
    "submission_unknown": "Env\u00edo incierto. Revisa el historial Comfy antes de ejecutar de nuevo.",
    "updateApp": "Actualiza Selects para elegir im\u00e1genes.",
    "comfyError": "Solicitud Comfy fallida",
    "invalidWorkflow": "Usa JSON exportado de Comfy en formato API.",
    "disconnect": "Desconectar",
    "dismiss": "Cerrar ejecuci\u00f3n fallida"
  },
  "fr": {
    "connected": "Connect\u00e9",
    "disconnected": "D\u00e9connect\u00e9",
    "connect": "Connecter",
    "connecting": "Connexion\u2026",
    "refresh": "Actualiser la connexion",
    "changeKey": "Changer la cl\u00e9 API",
    "changeWorkflow": "Changer de workflow",
    "custom": "Workflow coll\u00e9",
    "nodes": "n\u0153uds",
    "choose": "Choisir un fichier",
    "drop": "D\u00e9posez un JSON de workflow",
    "clear": "Retirer",
    "guide": "JSON export\u00e9 de Comfy au format API",
    "sample": "Charger un exemple",
    "sampleName": "Exemple Z-Image Turbo",
    "prompt": "Prompt",
    "width": "Largeur",
    "height": "Hauteur",
    "seed": "Graine",
    "image": "Image d\u2019entr\u00e9e",
    "jsonPlaceholder": "Collez le JSON au format API",
    "save": "Enregistrer le workflow",
    "run": "Ex\u00e9cuter",
    "held": "Ex\u00e9cution d\u00e9sactiv\u00e9e",
    "paid": "Utilise des cr\u00e9dits Comfy",
    "destination": "Les r\u00e9sultats sont enregistr\u00e9s dans votre projet.",
    "project": "Ouvrez un projet.",
    "loading": "Chargement\u2026",
    "uploading": "Envoi de l\u2019image\u2026",
    "submitting": "D\u00e9marrage\u2026",
    "queued": "En attente\u2026",
    "running": "Ex\u00e9cution\u2026",
    "downloading": "T\u00e9l\u00e9chargement des r\u00e9sultats\u2026",
    "importing": "Enregistrement\u2026",
    "added": "Enregistr\u00e9 dans le projet",
    "retry": "R\u00e9essayer l\u2019enregistrement",
    "resume": "R\u00e9cup\u00e9rer les r\u00e9sultats",
    "invalidJson": "V\u00e9rifiez le format JSON.",
    "invalid_workflow": "Utilisez le JSON export\u00e9 de Comfy au format API.",
    "runtime": "Node.js 22+ et les fichiers du plugin sont requis.",
    "connection_failed": "Connexion impossible. Actualisez la connexion.",
    "invalid_key": "V\u00e9rifiez votre cl\u00e9 API Comfy.",
    "not_connected": "Connectez d\u2019abord votre compte Comfy.",
    "generation_disabled": "Ex\u00e9cution d\u00e9sactiv\u00e9e.",
    "invalid_image": "Choisissez PNG, JPEG ou WebP de moins de 100 Mo.",
    "import_failed": "\u00c9chec de l\u2019enregistrement. R\u00e9essayez.",
    "interrupted": "Connexion interrompue. R\u00e9cup\u00e9rez les r\u00e9sultats.",
    "submission_unknown": "Envoi incertain. V\u00e9rifiez l\u2019historique Comfy avant de relancer.",
    "updateApp": "Mettez Selects \u00e0 jour pour choisir des images.",
    "comfyError": "\u00c9chec de la requ\u00eate Comfy",
    "invalidWorkflow": "Utilisez le JSON export\u00e9 de Comfy au format API.",
    "disconnect": "D\u00e9connecter",
    "dismiss": "Fermer l\u2019ex\u00e9cution \u00e9chou\u00e9e"
  },
  "it": {
    "connected": "Connesso",
    "disconnected": "Disconnesso",
    "connect": "Connetti",
    "connecting": "Connessione\u2026",
    "refresh": "Aggiorna connessione",
    "changeKey": "Cambia chiave API",
    "changeWorkflow": "Cambia workflow",
    "custom": "Workflow incollato",
    "nodes": "nodi",
    "choose": "Scegli file",
    "drop": "Trascina un JSON workflow",
    "clear": "Rimuovi",
    "guide": "JSON esportato da Comfy in formato API",
    "sample": "Carica esempio",
    "sampleName": "Esempio Z-Image Turbo",
    "prompt": "Prompt",
    "width": "Larghezza",
    "height": "Altezza",
    "seed": "Seed",
    "image": "Immagine di ingresso",
    "jsonPlaceholder": "Incolla JSON in formato API",
    "save": "Salva workflow",
    "run": "Esegui",
    "held": "Esecuzione disattivata",
    "paid": "Usa crediti Comfy",
    "destination": "I risultati vengono salvati nel progetto.",
    "project": "Apri un progetto.",
    "loading": "Caricamento\u2026",
    "uploading": "Caricamento immagine\u2026",
    "submitting": "Avvio\u2026",
    "queued": "In coda\u2026",
    "running": "Esecuzione\u2026",
    "downloading": "Download risultati\u2026",
    "importing": "Salvataggio risultati\u2026",
    "added": "Salvato nel progetto",
    "retry": "Riprova salvataggio",
    "resume": "Recupera risultati",
    "invalidJson": "Controlla il formato JSON.",
    "invalid_workflow": "Usa JSON esportato da Comfy in formato API.",
    "runtime": "Servono Node.js 22+ e i file del plugin.",
    "connection_failed": "Connessione non riuscita. Aggiornala.",
    "invalid_key": "Controlla la chiave API Comfy.",
    "not_connected": "Collega prima il tuo account Comfy.",
    "generation_disabled": "Esecuzione disattivata.",
    "invalid_image": "Scegli PNG, JPEG o WebP sotto 100 MB.",
    "import_failed": "Salvataggio incompleto. Riprova.",
    "interrupted": "Connessione interrotta. Recupera i risultati.",
    "submission_unknown": "Invio incerto. Controlla la cronologia Comfy prima di riprovare.",
    "updateApp": "Aggiorna Selects per scegliere immagini.",
    "comfyError": "Richiesta Comfy non riuscita",
    "invalidWorkflow": "Usa JSON esportato da Comfy in formato API.",
    "disconnect": "Disconnetti",
    "dismiss": "Chiudi esecuzione fallita"
  },
  "ja": {
    "connected": "\u63a5\u7d9a\u6e08\u307f",
    "disconnected": "\u672a\u63a5\u7d9a",
    "connect": "\u63a5\u7d9a",
    "connecting": "\u63a5\u7d9a\u4e2d\u2026",
    "refresh": "\u63a5\u7d9a\u3092\u66f4\u65b0",
    "changeKey": "API\u30ad\u30fc\u3092\u5909\u66f4",
    "changeWorkflow": "Workflow\u3092\u5909\u66f4",
    "custom": "\u8cbc\u308a\u4ed8\u3051\u305fWorkflow",
    "nodes": "\u30ce\u30fc\u30c9",
    "choose": "\u30d5\u30a1\u30a4\u30eb\u3092\u9078\u629e",
    "drop": "Workflow JSON\u3092\u30c9\u30ed\u30c3\u30d7",
    "clear": "\u524a\u9664",
    "guide": "Comfy\u304b\u3089API\u5f62\u5f0f\u3067\u66f8\u304d\u51fa\u3057\u305fJSON",
    "sample": "\u30b5\u30f3\u30d7\u30eb\u3092\u8aad\u307f\u8fbc\u3080",
    "sampleName": "Z-Image Turbo\u30b5\u30f3\u30d7\u30eb",
    "prompt": "\u30d7\u30ed\u30f3\u30d7\u30c8",
    "width": "\u5e45",
    "height": "\u9ad8\u3055",
    "seed": "\u30b7\u30fc\u30c9",
    "image": "\u5165\u529b\u753b\u50cf",
    "jsonPlaceholder": "API\u5f62\u5f0f\u306eJSON\u3092\u8cbc\u308a\u4ed8\u3051",
    "save": "Workflow\u3092\u4fdd\u5b58",
    "run": "\u5b9f\u884c",
    "held": "\u5b9f\u884c\u7121\u52b9",
    "paid": "Comfy\u30af\u30ec\u30b8\u30c3\u30c8\u3092\u4f7f\u7528",
    "destination": "\u7d50\u679c\u306f\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u306b\u81ea\u52d5\u4fdd\u5b58\u3055\u308c\u307e\u3059\u3002",
    "project": "\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u3092\u958b\u3044\u3066\u304f\u3060\u3055\u3044\u3002",
    "loading": "\u8aad\u307f\u8fbc\u307f\u4e2d\u2026",
    "uploading": "\u753b\u50cf\u3092\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9\u4e2d\u2026",
    "submitting": "\u958b\u59cb\u4e2d\u2026",
    "queued": "\u5f85\u6a5f\u4e2d\u2026",
    "running": "\u5b9f\u884c\u4e2d\u2026",
    "downloading": "\u7d50\u679c\u3092\u30c0\u30a6\u30f3\u30ed\u30fc\u30c9\u4e2d\u2026",
    "importing": "\u7d50\u679c\u3092\u4fdd\u5b58\u4e2d\u2026",
    "added": "\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u306b\u4fdd\u5b58\u6e08\u307f",
    "retry": "\u4fdd\u5b58\u3092\u518d\u8a66\u884c",
    "resume": "\u7d50\u679c\u3092\u5fa9\u5143",
    "invalidJson": "JSON\u5f62\u5f0f\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    "invalid_workflow": "Comfy\u304b\u3089API\u5f62\u5f0f\u3067\u66f8\u304d\u51fa\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    "runtime": "Node.js 22\u4ee5\u964d\u3068\u30d7\u30e9\u30b0\u30a4\u30f3\u30d5\u30a1\u30a4\u30eb\u304c\u5fc5\u8981\u3067\u3059\u3002",
    "connection_failed": "\u63a5\u7d9a\u3067\u304d\u307e\u305b\u3093\u3002\u63a5\u7d9a\u3092\u66f4\u65b0\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    "invalid_key": "Comfy\u306eAPI\u30ad\u30fc\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    "not_connected": "\u5148\u306bComfy\u30a2\u30ab\u30a6\u30f3\u30c8\u3092\u63a5\u7d9a\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    "generation_disabled": "\u5b9f\u884c\u304c\u7121\u52b9\u3067\u3059\u3002",
    "invalid_image": "100 MB\u4ee5\u4e0b\u306ePNG\u30fbJPEG\u30fbWebP\u3092\u9078\u3093\u3067\u304f\u3060\u3055\u3044\u3002",
    "import_failed": "\u4fdd\u5b58\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f\u3002\u4fdd\u5b58\u3092\u518d\u8a66\u884c\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    "interrupted": "\u63a5\u7d9a\u304c\u4e2d\u65ad\u3057\u307e\u3057\u305f\u3002\u7d50\u679c\u3092\u5fa9\u5143\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    "submission_unknown": "\u53d7\u4ed8\u72b6\u6cc1\u304c\u4e0d\u660e\u3067\u3059\u3002\u518d\u5b9f\u884c\u524d\u306bComfy\u306e\u5c65\u6b74\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    "updateApp": "\u5165\u529b\u753b\u50cf\u306e\u9078\u629e\u306b\u306fSelects\u3092\u66f4\u65b0\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    "comfyError": "Comfy\u30ea\u30af\u30a8\u30b9\u30c8\u5931\u6557",
    "invalidWorkflow": "Comfy\u304b\u3089API\u5f62\u5f0f\u3067\u66f8\u304d\u51fa\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    "disconnect": "\u63a5\u7d9a\u89e3\u9664",
    "dismiss": "\u5931\u6557\u3057\u305f\u5b9f\u884c\u3092\u9589\u3058\u308b"
  },
  "pt": {
    "connected": "Ligado",
    "disconnected": "Desligado",
    "connect": "Ligar",
    "connecting": "A ligar\u2026",
    "refresh": "Atualizar liga\u00e7\u00e3o",
    "changeKey": "Alterar chave API",
    "changeWorkflow": "Alterar workflow",
    "custom": "Workflow colado",
    "nodes": "n\u00f3s",
    "choose": "Escolher ficheiro",
    "drop": "Largar JSON de workflow",
    "clear": "Remover",
    "guide": "JSON exportado do Comfy em formato API",
    "sample": "Carregar exemplo",
    "sampleName": "Exemplo Z-Image Turbo",
    "prompt": "Prompt",
    "width": "Largura",
    "height": "Altura",
    "seed": "Semente",
    "image": "Imagem de entrada",
    "jsonPlaceholder": "Colar JSON em formato API",
    "save": "Guardar workflow",
    "run": "Executar",
    "held": "Execu\u00e7\u00e3o desativada",
    "paid": "Usa cr\u00e9ditos Comfy",
    "destination": "Os resultados s\u00e3o guardados no projeto.",
    "project": "Abra um projeto.",
    "loading": "A carregar\u2026",
    "uploading": "A enviar imagem\u2026",
    "submitting": "A iniciar\u2026",
    "queued": "Em fila\u2026",
    "running": "A executar\u2026",
    "downloading": "A transferir resultados\u2026",
    "importing": "A guardar resultados\u2026",
    "added": "Guardado no projeto",
    "retry": "Tentar guardar de novo",
    "resume": "Recuperar resultados",
    "invalidJson": "Verifique o formato JSON.",
    "invalid_workflow": "Use JSON exportado do Comfy em formato API.",
    "runtime": "\u00c9 necess\u00e1rio Node.js 22+ e os ficheiros do plugin.",
    "connection_failed": "N\u00e3o foi poss\u00edvel ligar. Atualize a liga\u00e7\u00e3o.",
    "invalid_key": "Verifique a chave API Comfy.",
    "not_connected": "Ligue primeiro a conta Comfy.",
    "generation_disabled": "Execu\u00e7\u00e3o desativada.",
    "invalid_image": "Escolha PNG, JPEG ou WebP com menos de 100 MB.",
    "import_failed": "N\u00e3o foi poss\u00edvel guardar tudo. Tente de novo.",
    "interrupted": "Liga\u00e7\u00e3o interrompida. Recupere os resultados.",
    "submission_unknown": "Envio incerto. Consulte o hist\u00f3rico Comfy antes de executar de novo.",
    "updateApp": "Atualize Selects para escolher imagens.",
    "comfyError": "Pedido Comfy falhou",
    "invalidWorkflow": "Use JSON exportado do Comfy em formato API.",
    "disconnect": "Desligar",
    "dismiss": "Fechar execu\u00e7\u00e3o falhada"
  },
  "tr": {
    "connected": "Ba\u011fland\u0131",
    "disconnected": "Ba\u011fl\u0131 de\u011fil",
    "connect": "Ba\u011flan",
    "connecting": "Ba\u011flan\u0131yor\u2026",
    "refresh": "Ba\u011flant\u0131y\u0131 yenile",
    "changeKey": "API anahtar\u0131n\u0131 de\u011fi\u015ftir",
    "changeWorkflow": "Workflow de\u011fi\u015ftir",
    "custom": "Yap\u0131\u015ft\u0131r\u0131lan workflow",
    "nodes": "d\u00fc\u011f\u00fcm",
    "choose": "Dosya se\u00e7",
    "drop": "Workflow JSON dosyas\u0131n\u0131 b\u0131rak\u0131n",
    "clear": "Kald\u0131r",
    "guide": "Comfy'den API bi\u00e7iminde d\u0131\u015fa aktar\u0131lan JSON",
    "sample": "\u00d6rnek y\u00fckle",
    "sampleName": "Z-Image Turbo \u00f6rne\u011fi",
    "prompt": "\u0130stem",
    "width": "Geni\u015flik",
    "height": "Y\u00fckseklik",
    "seed": "Tohum",
    "image": "Girdi g\u00f6rseli",
    "jsonPlaceholder": "API bi\u00e7imli JSON yap\u0131\u015ft\u0131r\u0131n",
    "save": "Workflow kaydet",
    "run": "\u00c7al\u0131\u015ft\u0131r",
    "held": "\u00c7al\u0131\u015ft\u0131rma kapal\u0131",
    "paid": "Comfy kredisi kullan\u0131r",
    "destination": "Sonu\u00e7lar projeye otomatik kaydedilir.",
    "project": "Bir proje a\u00e7\u0131n.",
    "loading": "Y\u00fckleniyor\u2026",
    "uploading": "G\u00f6rsel y\u00fckleniyor\u2026",
    "submitting": "Ba\u015flat\u0131l\u0131yor\u2026",
    "queued": "S\u0131rada\u2026",
    "running": "\u00c7al\u0131\u015f\u0131yor\u2026",
    "downloading": "Sonu\u00e7lar indiriliyor\u2026",
    "importing": "Sonu\u00e7lar kaydediliyor\u2026",
    "added": "Projeye kaydedildi",
    "retry": "Kaydetmeyi tekrar dene",
    "resume": "Sonu\u00e7lar\u0131 kurtar",
    "invalidJson": "JSON bi\u00e7imini kontrol edin.",
    "invalid_workflow": "Comfy'den API bi\u00e7iminde d\u0131\u015fa aktar\u0131lan JSON kullan\u0131n.",
    "runtime": "Node.js 22+ ve eklenti dosyalar\u0131 gerekli.",
    "connection_failed": "Ba\u011flan\u0131lamad\u0131. Ba\u011flant\u0131y\u0131 yenileyin.",
    "invalid_key": "Comfy API anahtar\u0131n\u0131z\u0131 kontrol edin.",
    "not_connected": "\u00d6nce Comfy hesab\u0131n\u0131z\u0131 ba\u011flay\u0131n.",
    "generation_disabled": "\u00c7al\u0131\u015ft\u0131rma kapal\u0131.",
    "invalid_image": "100 MB alt\u0131 PNG, JPEG veya WebP se\u00e7in.",
    "import_failed": "Sonu\u00e7lar kaydedilemedi. Tekrar deneyin.",
    "interrupted": "Ba\u011flant\u0131 kesildi. Sonu\u00e7lar\u0131 kurtar\u0131n.",
    "submission_unknown": "G\u00f6nderim belirsiz. Yeni \u00e7al\u0131\u015ft\u0131rmadan \u00f6nce Comfy ge\u00e7mi\u015fini kontrol edin.",
    "updateApp": "Girdi g\u00f6rseli se\u00e7mek i\u00e7in Selects'i g\u00fcncelleyin.",
    "comfyError": "Comfy iste\u011fi ba\u015far\u0131s\u0131z",
    "invalidWorkflow": "Comfy'den API bi\u00e7iminde d\u0131\u015fa aktar\u0131lan JSON kullan\u0131n.",
    "disconnect": "Ba\u011flant\u0131y\u0131 kes",
    "dismiss": "Ba\u015far\u0131s\u0131z \u00e7al\u0131\u015ft\u0131rmay\u0131 kapat"
  },
  "zh": {
    "connected": "\u5df2\u8fde\u63a5",
    "disconnected": "\u672a\u8fde\u63a5",
    "connect": "\u8fde\u63a5",
    "connecting": "\u6b63\u5728\u8fde\u63a5\u2026",
    "refresh": "\u5237\u65b0\u8fde\u63a5",
    "changeKey": "\u66f4\u6539API\u5bc6\u94a5",
    "changeWorkflow": "\u66f4\u6362Workflow",
    "custom": "\u7c98\u8d34\u7684Workflow",
    "nodes": "\u8282\u70b9",
    "choose": "\u9009\u62e9\u6587\u4ef6",
    "drop": "\u62d6\u5165Workflow JSON\u6587\u4ef6",
    "clear": "\u79fb\u9664",
    "guide": "\u4eceComfy\u5bfc\u51fa\u7684API\u683c\u5f0fJSON",
    "sample": "\u52a0\u8f7d\u793a\u4f8b",
    "sampleName": "Z-Image Turbo\u793a\u4f8b",
    "prompt": "\u63d0\u793a\u8bcd",
    "width": "\u5bbd\u5ea6",
    "height": "\u9ad8\u5ea6",
    "seed": "\u79cd\u5b50",
    "image": "\u8f93\u5165\u56fe\u7247",
    "jsonPlaceholder": "\u7c98\u8d34API\u683c\u5f0fJSON",
    "save": "\u4fdd\u5b58Workflow",
    "run": "\u8fd0\u884c",
    "held": "\u8fd0\u884c\u5df2\u7981\u7528",
    "paid": "\u4f7f\u7528Comfy\u989d\u5ea6",
    "destination": "\u7ed3\u679c\u5c06\u81ea\u52a8\u4fdd\u5b58\u5230\u9879\u76ee\u3002",
    "project": "\u8bf7\u6253\u5f00\u9879\u76ee\u3002",
    "loading": "\u6b63\u5728\u52a0\u8f7d\u2026",
    "uploading": "\u6b63\u5728\u4e0a\u4f20\u56fe\u7247\u2026",
    "submitting": "\u6b63\u5728\u542f\u52a8\u2026",
    "queued": "\u6b63\u5728\u6392\u961f\u2026",
    "running": "\u6b63\u5728\u8fd0\u884c\u2026",
    "downloading": "\u6b63\u5728\u4e0b\u8f7d\u7ed3\u679c\u2026",
    "importing": "\u6b63\u5728\u4fdd\u5b58\u7ed3\u679c\u2026",
    "added": "\u5df2\u4fdd\u5b58\u5230\u9879\u76ee",
    "retry": "\u91cd\u8bd5\u4fdd\u5b58",
    "resume": "\u6062\u590d\u7ed3\u679c",
    "invalidJson": "\u8bf7\u68c0\u67e5JSON\u683c\u5f0f\u3002",
    "invalid_workflow": "\u8bf7\u4f7f\u7528\u4eceComfy\u5bfc\u51fa\u7684API\u683c\u5f0fJSON\u3002",
    "runtime": "\u9700\u8981Node.js 22\u4ee5\u4e0a\u53ca\u63d2\u4ef6\u6587\u4ef6\u3002",
    "connection_failed": "\u65e0\u6cd5\u8fde\u63a5\u3002\u8bf7\u5237\u65b0\u8fde\u63a5\u3002",
    "invalid_key": "\u8bf7\u68c0\u67e5Comfy API\u5bc6\u94a5\u3002",
    "not_connected": "\u8bf7\u5148\u8fde\u63a5Comfy\u8d26\u6237\u3002",
    "generation_disabled": "\u8fd0\u884c\u5df2\u7981\u7528\u3002",
    "invalid_image": "\u8bf7\u9009\u62e9100 MB\u4ee5\u4e0b\u7684PNG\u3001JPEG\u6216WebP\u56fe\u7247\u3002",
    "import_failed": "\u672a\u80fd\u4fdd\u5b58\u5168\u90e8\u7ed3\u679c\u3002\u8bf7\u91cd\u8bd5\u4fdd\u5b58\u3002",
    "interrupted": "\u8fde\u63a5\u4e2d\u65ad\u3002\u8bf7\u6062\u590d\u7ed3\u679c\u3002",
    "submission_unknown": "\u63d0\u4ea4\u72b6\u6001\u4e0d\u786e\u5b9a\u3002\u518d\u6b21\u8fd0\u884c\u524d\u8bf7\u68c0\u67e5Comfy\u8bb0\u5f55\u3002",
    "updateApp": "\u8bf7\u66f4\u65b0Selects\u4ee5\u9009\u62e9\u8f93\u5165\u56fe\u7247\u3002",
    "comfyError": "Comfy\u8bf7\u6c42\u5931\u8d25",
    "invalidWorkflow": "\u8bf7\u4f7f\u7528\u4eceComfy\u5bfc\u51fa\u7684API\u683c\u5f0fJSON\u3002",
    "disconnect": "\u65ad\u5f00\u8fde\u63a5",
    "dismiss": "\u5173\u95ed\u5931\u8d25\u7684\u8fd0\u884c"
  }
};
const quote = value => "'" + String(value).replaceAll("'", "'\\''") + "'";
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

export default function Panel({ sdk, context, ui }) {
  const T = COPY[context.language] ?? COPY.en;
  const [key, setKey] = React.useState('');
  const [connection, setConnection] = React.useState(null);
  const connectionRef = React.useRef(null);
  const [editingKey, setEditingKey] = React.useState(true);
  const [workflow, setWorkflow] = React.useState('');
  const [name, setName] = React.useState('');
  const [file, setFile] = React.useState(null);
  const [choosing, setChoosing] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [needsLoad, setNeedsLoad] = React.useState(false);
  const [media, setMedia] = React.useState({});
  const [busy, setBusy] = React.useState(false);
  const [phase, setPhase] = React.useState('');
  const [progress, setProgress] = React.useState(undefined);
  const [status, setStatus] = React.useState('');
  const [failed, setFailed] = React.useState(false);
  const [pending, setPending] = React.useState(null);
  const [completed, setCompleted] = React.useState([]);
  const actionLock = React.useRef(false);
  const mounted = React.useRef(true);
  const origin = window.parent.location.origin;
  function inspect(text) {
    if (!text.trim()) return { graph: null, error: '' };
    let graph;
    try { graph = JSON.parse(text); } catch { return { graph: null, error: T.invalidJson }; }
    if (!graph || typeof graph !== 'object' || Array.isArray(graph) || !Object.keys(graph).length ||
        !Object.values(graph).every(node => node && typeof node.class_type === 'string' && node.inputs &&
          typeof node.inputs === 'object' && !Array.isArray(node.inputs))) return { graph: null, error: T.invalidWorkflow };
    return { graph, error: '' };
  }
  const checked = inspect(workflow);
  const graph = checked.graph;
  const connected = connection?.authenticated;
  const allowed = connection?.allowGeneration;
  const errorText = code => T[code] ?? `${T.comfyError} (${code})`;
  function remember(next) {
    connectionRef.current = next; setConnection(next); setEditingKey(!next?.authenticated);
  }
  async function shell(command) {
    const result = await sdk.runShell({ summary: 'Comfy Cloud connection', command, timeoutMs: 15000, maxOutputBytes: 48000 });
    if (result.isError || result.exitCode !== 0 || result.truncated) throw new Error(T.runtime);
    try { return JSON.parse(result.stdout); } catch { throw new Error(T.runtime); }
  }
  function command(action) {
    return 'node "$SELECTS_USER_SKILLS_ROOT/comfy-api-test/scripts/comfy.mjs" ' + action + ' ' + quote(origin);
  }
  async function ensure() {
    const next = await shell(command('connect')); remember(next); return next;
  }
  async function request(path, body, current = connectionRef.current) {
    current ??= await ensure();
    let response;
    try {
      response = await fetch(current.url + path, {
        method: body === undefined ? 'GET' : 'POST', signal: AbortSignal.timeout(15000),
        headers: { Authorization: `Bearer ${current.token}`, 'Content-Type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
      });
    } catch { throw new Error(T.connection_failed); }
    const result = await response.json();
    if (!response.ok) throw new Error(errorText(result.error));
    return result;
  }
  function load(saved, resetMedia = true) {
    setWorkflow(saved.workflow ? JSON.stringify(saved.workflow, null, 2) : '');
    setName(saved.name); setDirty(false); setChoosing(false); setNeedsLoad(!!saved.needsLoad);
    setMedia(previous => resetMedia ? {} : Object.fromEntries(Object.entries(previous).filter(([id]) => saved.workflow?.[id]?.class_type === 'LoadImage')));
  }
  async function refreshPending(current = connectionRef.current) {
    if (!current || !context.projectId) { setPending(null); return; }
    const runs = await request('/runs?projectId=' + encodeURIComponent(context.projectId), undefined, current);
    setPending(runs[0] ?? null);
    if (runs[0]?.error) { setFailed(true); setStatus(errorText(runs[0].error)); }
  }
  React.useEffect(() => {
    mounted.current = true;
    let canceled = false;
    shell(command('peek')).then(async result => {
      if (canceled) return;
      load(result.saved);
      if (result.connection) { remember(result.connection); await refreshPending(result.connection); }
    }).catch(error => { if (!canceled) { setFailed(true); setStatus(error.message); } });
    return () => { canceled = true; mounted.current = false; };
  }, []);
  React.useEffect(() => {
    setMedia({});
    refreshPending().catch(error => { setFailed(true); setStatus(error.message); });
  }, [context.projectId]);
  async function action(callback, nextPhase = '') {
    if (actionLock.current) return;
    actionLock.current = true; setBusy(true); setPhase(nextPhase); setFailed(false); setStatus('');
    try { await callback(); }
    catch (error) { if (mounted.current) { setFailed(true); setStatus(error.message); } }
    finally { actionLock.current = false; if (mounted.current) { setBusy(false); setPhase(''); setProgress(undefined); } }
  }
  async function save(input = { name: name || T.custom, workflow: graph }) {
    if (!input.workflow && !input.path && !input.example) throw new Error(checked.error || T.invalidWorkflow);
    load(await request('/workflow', input), !!input.path || !!input.example);
  }
  async function verify() {
    const current = await ensure();
    const result = await request('/connect', { key }, current);
    remember({ ...current, ...result }); setKey(''); await refreshPending(current);
  }
  async function refresh() {
    const current = await ensure();
    if (needsLoad) load(await request('/workflow', undefined, current));
    await refreshPending(current);
  }
  async function disconnect() {
    await request('/disconnect', {}); remember({ ...connectionRef.current, authenticated: false }); setKey('');
  }
  function edit(nodeId, input, value) {
    const next = structuredClone(graph); next[nodeId].inputs[input] = value;
    setWorkflow(JSON.stringify(next, null, 2)); setDirty(true); setCompleted([]);
  }
  async function importOutput(run) {
    setPhase('importing');
    const prepared = await request('/import-script', { operationId: run.operationId });
    const result = await sdk.runScript({ summary: 'Save Comfy results', allowCommit: true, script: prepared.script });
    if (result.isError || !result.result?.resourceIds?.length) throw new Error(T.import_failed);
    await request('/imported', { operationId: run.operationId });
    setPending(null); setCompleted(prepared.paths.map(path => path.split(/[\\/]/).pop()));
    setStatus(`${T.added} (${result.result.resourceIds.length})`);
  }
  async function follow(run) {
    setPending(run);
    while (mounted.current) {
      const state = await request('/runs/' + run.operationId);
      setPending(state); setPhase(state.phase ?? 'queued');
      setProgress(typeof state.progress === 'number' && Number.isFinite(state.progress) ? state.progress : undefined);
      if (state.paths?.length) { await importOutput(state); return; }
      if (state.error && !state.active) throw new Error(errorText(state.error));
      if (!state.active) throw new Error(T.interrupted);
      await sleep(1000);
    }
  }
  async function run() {
    if (!context.projectId || !graph || !connected) return;
    const images = {};
    for (const [id, items] of Object.entries(media)) {
      const item = items[0];
      if (!item) continue;
      if (!item.path || !/\.(png|jpe?g|webp)$/i.test(item.path) || item.range) throw new Error(T.invalid_image);
      images[id] = item.path;
    }
    await request('/workflow', { name: name || T.custom, workflow: graph }); setDirty(false);
    await follow(await request('/run', { operationId: crypto.randomUUID(), projectId: context.projectId, workflow: graph, images }));
  }
  async function recover() {
    if (pending.paths?.length) { await importOutput(pending); return; }
    await follow(await request('/run', { operationId: pending.operationId, projectId: pending.projectId }));
  }
  async function dismiss() {
    await request('/dismiss', { operationId: pending.operationId }); setPending(null); setStatus('');
  }
  const editingDisabled = busy || !!pending;
  const runBlocked = busy || !!pending || !context.projectId || !graph || !connected || !allowed;
  return <>
    <ui.Section title="Comfy Cloud" actions={<>
      <small>{connected ? T.connected : T.disconnected}</small>
      <ui.IconButton icon="refresh" label={T.refresh} disabled={busy} onClick={() => action(refresh, 'loading')} />
      {!editingKey && <ui.IconButton icon="settings" label={T.changeKey} disabled={busy} onClick={() => setEditingKey(true)} />}
    </>}>
      {editingKey && <>
        <label htmlFor="comfy-api-key">API key</label>
        <input id="comfy-api-key" type="password" autoComplete="off" value={key} disabled={busy} onChange={event => setKey(event.target.value)} />
        <ui.Actions><ui.Button variant="secondary" busy={busy && phase === 'connecting'} busyLabel={T.connecting} disabled={busy || !key} onClick={() => action(verify, 'connecting')}>{T.connect}</ui.Button></ui.Actions>
        {connected && <ui.Actions><ui.Button variant="ghost" disabled={busy} onClick={() => action(disconnect)}>{T.disconnect}</ui.Button></ui.Actions>}
      </>}
      {connection?.testLabel && <ui.Message>{connection.testLabel}</ui.Message>}
    </ui.Section>
    <ui.Section title="Workflow" actions={graph && <ui.IconButton icon="folder" label={T.changeWorkflow} disabled={editingDisabled} onClick={() => setChoosing(!choosing)} />}>
      {needsLoad && <ui.Actions><ui.Button variant="secondary" disabled={busy} onClick={() => action(refresh, 'loading')}>{name || 'Workflow'}</ui.Button></ui.Actions>}
      {graph && <ui.Stack gap={4}><strong>{name || T.custom}</strong><small>{Object.keys(graph).length} {T.nodes}</small></ui.Stack>}
      {(!graph || choosing) && <>
        <ui.FileDrop accept={['json']} value={file} disabled={editingDisabled} labels={{ choose: T.choose, drop: T.drop, clear: T.clear }} onChange={next => { setFile(next); if (next) action(() => save({ path: next.path, name: next.name }), 'loading'); }} onReject={() => { setFailed(true); setStatus(T.invalidWorkflow); }} />
        <ui.Message>{T.guide}</ui.Message>
        <ui.Actions><ui.Button variant="ghost" disabled={editingDisabled} onClick={() => action(() => save({ example: true, name: T.sampleName }), 'loading')}>{T.sample}</ui.Button></ui.Actions>
      </>}
      {graph && Object.entries(graph).map(([id, node]) => <React.Fragment key={id}>
        {node.class_type === 'CLIPTextEncode' && typeof node.inputs.text === 'string' && <ui.TextField label={node._meta?.title && node._meta.title !== node.class_type ? node._meta.title : T.prompt} multiline value={node.inputs.text} disabled={editingDisabled} onChange={value => edit(id, 'text', value)} />}
        {['EmptyLatentImage', 'EmptySD3LatentImage'].includes(node.class_type) && ['width', 'height'].map(field => typeof node.inputs[field] === 'number' && <ui.NumberField key={field} label={T[field]} unit="px" value={node.inputs[field]} min={64} max={4096} step={8} disabled={editingDisabled} onChange={value => edit(id, field, value)} />)}
        {node.class_type === 'KSampler' && Number.isSafeInteger(node.inputs.seed) && <ui.NumberField label={T.seed} value={node.inputs.seed} min={0} max={Number.MAX_SAFE_INTEGER} step={1} disabled={editingDisabled} onChange={value => edit(id, 'seed', value)} />}
        {node.class_type === 'LoadImage' && (ui.version >= 2 ? <ui.MediaSlot label={node._meta?.title && node._meta.title !== node.class_type ? node._meta.title : T.image} accepts={['image']} max={1} value={media[id] ?? []} disabled={editingDisabled} onChange={items => setMedia(value => ({ ...value, [id]: items }))} /> : <ui.Message tone="error">{T.updateApp}</ui.Message>)}
      </React.Fragment>)}
      <details><summary>Workflow JSON</summary><ui.TextField multiline placeholder={T.jsonPlaceholder} value={workflow} disabled={editingDisabled} onChange={value => { setWorkflow(value); setDirty(true); setCompleted([]); }} /></details>
      {dirty && <ui.Actions><ui.Button variant="secondary" disabled={editingDisabled || !graph} onClick={() => action(() => save(), 'loading')}>{T.save}</ui.Button></ui.Actions>}
      {checked.error && <ui.Message tone="error">{checked.error}</ui.Message>}
    </ui.Section>
    <ui.Section title={T.run} actions={!allowed && <small>{T.held}</small>}>
      {!context.projectId && <ui.Message>{T.project}</ui.Message>}
      {busy && !['loading', 'connecting'].includes(phase) && <ui.Progress value={progress} label={T[phase] ?? T.running} />}
      <ui.Actions><ui.Button variant="primary" busy={busy && !['loading', 'connecting'].includes(phase)} busyLabel={T[phase] ?? T.running} disabled={runBlocked} onClick={() => action(run, 'submitting')}>{T.run}</ui.Button></ui.Actions>
      {allowed && <ui.Message>{T.paid}</ui.Message>}
      <small>{T.destination}</small>
      {pending && <ui.Actions><ui.Button variant="secondary" disabled={busy || (!pending.paths?.length && !connected)} onClick={() => action(recover, pending.paths?.length ? 'importing' : 'running')}>{pending.paths?.length ? T.retry : T.resume}</ui.Button></ui.Actions>}
      {pending?.error && !pending.active && !pending.paths?.length && <ui.Actions><ui.Button variant="ghost" disabled={busy} onClick={() => action(dismiss)}>{T.dismiss}</ui.Button></ui.Actions>}
      {status && <ui.Message tone={failed ? 'error' : 'success'}>{status}</ui.Message>}
      {!!completed.length && <ul>{completed.map((filename, index) => <li key={index}>{filename}</li>)}</ul>}
    </ui.Section>
  </>;
}
