# Runtime dependencies

This package does not bundle third-party binaries.

- yt-dlp (https://github.com/yt-dlp/yt-dlp): downloaded by the panel from the
  project's official GitHub releases the first time a video link is used. Its
  own license applies.
- FFmpeg (https://ffmpeg.org): the copy that ships with Selects is used.

Browser sign-in data used to retry a download stays on the user's computer and
is never part of this package.
