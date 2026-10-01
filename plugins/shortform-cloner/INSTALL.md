# Installation

Ask your Selects agent to install this plugin from its public Plugin Library folder link. The agent downloads the files listed in `plugin.json` and follows the platform steps below. Required tools are Python 3.9+, yt-dlp, ffmpeg and ffprobe, plus Deno or Node.js 22+ so yt-dlp can download from YouTube. No npm dependencies or AI provider keys are required.

## macOS

Run `bash setup.command` from this folder. Missing tools are installed using an existing Homebrew installation. Deno is installed only when no Deno or Node.js 22+ is found. If Homebrew is absent and tools are missing, setup stops with instructions to install Homebrew from https://brew.sh. If tools already exist, Homebrew is unnecessary.

## Windows

Open PowerShell in this folder and run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\setup.ps1
```

The execution-policy option applies to this process only; setup does not change the computer's policy. Missing dependencies are installed through WinGet using Python.Python.3.12, yt-dlp.yt-dlp and Gyan.FFmpeg, and DenoLand.Deno when no Deno or Node.js 22+ is found. If WinGet is absent, install Microsoft App Installer and rerun setup. Restart Selects after installing tools so it sees the updated PATH. OS installer permissions may still require user action.

Both setup scripts run `verify_runtime.py` before installing the panel. It checks helper execution, Unicode storage, file locking, revision protection and media tools on the actual OS, without reading cookie values or downloading a video. They copy the panel to `SELECTS_USER_PANELS_ROOT/shortform-cloner/panel.tsx`, defaulting to `.selects/panels/shortform-cloner/panel.tsx` beneath the current user's home directory, and back up any previous version. Manual copying of panel.tsx is also supported when prerequisites are already installed.

Open Selects > Plugin > Selects Clips. Sign in to an account with plugin/generated-media authoring access; the plugin checks account support before analysis. No application patch or developer session is required. The panel displays missing tools and unsupported host capabilities. Use the normal Selects shell/media permissions and AI account; generation and analysis may use credits.

## Automatic browser login reuse

No personal activation file, exported cookies file or additional plugin consent dialog is required. After a requested public download fails, yt-dlp tries discovered Chrome, Edge, Brave, Chromium, Vivaldi and Firefox profiles. The OS still controls access to login data. If a browser profile is locked or cannot be decrypted, another profile is tried within a bounded time budget; otherwise a clear failure is returned. A logged-in browser does not guarantee that every site permits downloading.

Open video in browser opens the link in your system browser. Complete sign-in or site verification yourself, then return and retry. No Selects browser service is required.

Keep yt-dlp current when sites change. For YouTube, the plugin passes the Deno or Node.js 22+ it finds to yt-dlp, including installs from version managers such as fnm, nvm or Volta, and lets yt-dlp fetch its challenge solver from the yt-dlp GitHub project when the installed yt-dlp does not bundle it. When a download fails, the panel shows the reason yt-dlp reported. Updating the panel preserves local styles, jobs and source files. No author-specific data is shipped.

Windows code and runtime checks are included, but Windows Selects UI and full animation generation have not yet been tested end to end. This release remains experimental.
