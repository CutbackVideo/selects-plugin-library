# Runtime dependencies

This package does not bundle third-party binaries. It uses the installed Selects React panel UI, Python 3 standard library, yt-dlp, FFmpeg and ffprobe, and Deno or Node.js for YouTube downloads. Setup uses Homebrew only if a required program is missing. yt-dlp may fetch its YouTube challenge solver (yt-dlp-ejs) from GitHub when the installed yt-dlp does not include it.

- yt-dlp: https://github.com/yt-dlp/yt-dlp
- FFmpeg: https://ffmpeg.org
- Python: https://www.python.org
- Homebrew: https://brew.sh
- Deno: https://deno.com
- Node.js: https://nodejs.org
- yt-dlp-ejs: https://github.com/yt-dlp/ejs

Their respective licenses apply to separately installed tools. Browser authentication data is runtime user data and is never part of this package.
