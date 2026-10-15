#!/usr/bin/env python3
"""Check tracked and new source files before publication."""
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
RULES = {
    'non-English Korean text': re.compile(r'[\u1100-\u11ff\u3130-\u318f\ua960-\ua97f\uac00-\ud7ff]'),
    'personal filesystem path': re.compile(r'/(?:Users|home)/[A-Za-z0-9]|/var/folders/[A-Za-z0-9]'),
    'private key': re.compile(r'-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----'),
    'access token': re.compile(r'(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[A-Z0-9]{16})'),
    'credential assignment': re.compile(r'(?i)(?:api[_-]?key|password|secret|access[_-]?token)\s*[:=]\s*[\"\x27][A-Za-z0-9_+/=-]{16,}'),
}
BLOCKED = {'.local', '.env', '.venv', 'venv', 'node_modules', '__pycache__'}


def is_audio(name, data):
    if name.endswith('.m4a'):
        return len(data) >= 12 and data[4:8] == b'ftyp'
    if name.endswith('.wav'):
        return len(data) >= 12 and data[:4] == b'RIFF' and data[8:12] == b'WAVE'
    return data[:3] == b'ID3' or (len(data) >= 2 and data[0] == 0xFF and data[1] & 0xE0 == 0xE0)


def inspect(name, data):
    # Only canonical, bounded gallery assets are permitted as public binaries:
    # the plugin's own, or one variant's (`preview-<id>.mp4`, `poster-<id>.webp`).
    slug = r'[a-z0-9]+(?:-[a-z0-9]+)*'
    if re.fullmatch(rf'plugins/{slug}/(?:preview(?:-{slug})?\.mp4|poster(?:-{slug})?\.webp)', name):
        if name.endswith('.mp4'):
            valid = 12 <= len(data) <= 8 * 1024 * 1024 and data[4:8] == b'ftyp'
        else:
            valid = 12 <= len(data) <= 512 * 1024 and data[:4] == b'RIFF' and data[8:12] == b'WEBP'
        return [] if valid else ['Invalid or oversized preview asset']
    # Audio a plugin ships (music, sound effects) is allowed when the file
    # really is audio and stays a reasonable size for the Git history.
    if re.fullmatch(r'plugins/[a-z0-9]+(?:-[a-z0-9]+)*/.+\.(?:m4a|wav|mp3)', name) and not BLOCKED & set(Path(name).parts):
        return [] if is_audio(name, data) and len(data) <= 20 * 1024 * 1024 else ['Invalid or oversized audio asset']
    # Customer pack images are source assets, bounded and scoped to the pack's assets directory.
    if re.fullmatch(r'plugins/shortform-clips/template-packs/[a-z0-9]+(?:-[a-z0-9]+)*/assets/[a-zA-Z0-9_/-]+\.(?:png|jpe?g|webp)', name) and not BLOCKED & set(Path(name).parts):
        valid = (name.endswith('.png') and len(data) > 24 and data.startswith(b'\x89PNG\r\n\x1a\n') or
                 name.endswith(('.jpg', '.jpeg')) and len(data) > 3 and data.startswith(b'\xff\xd8\xff') or
                 name.endswith('.webp') and len(data) > 12 and data[:4] == b'RIFF' and data[8:12] == b'WEBP')
        return [] if valid and len(data) <= 4 * 1024 * 1024 else ['Invalid or oversized template pack image']
    findings = []
    path = Path(name)
    if any(part in BLOCKED for part in path.parts) or path.suffix in {'.onnx', '.mp4', '.webm', '.pyc', '.pem', '.key'}:
        findings.append('local or generated file')
    try:
        text = data.decode('utf-8')
    except UnicodeDecodeError:
        return findings + ['binary file requires review']
    # Panel titles are localized metadata read literally by Selects (Unicode
    # escapes in these comments would appear verbatim in the Apps list).
    language_text = text
    if re.fullmatch(r'plugins/[a-z0-9]+(?:-[a-z0-9]+)*/panel\.tsx', name):
        lines = text.splitlines(keepends=True)
        language_text = ''.join(
            '\n' if i < 24 and re.fullmatch(r'[ \t]*//[ \t]*@name:[a-z]{2}[ \t]+[^\r\n]+\r?\n?', line) else line
            for i, line in enumerate(lines)
        )
    findings.extend(label for label, pattern in RULES.items()
                    if pattern.search(language_text if label == 'non-English Korean text' else text))
    return findings


def main():
    names = subprocess.check_output(['git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], cwd=ROOT).decode().split('\0')
    failures = []
    for name in sorted(set(filter(None, names))):
        path = ROOT / name
        if path.is_symlink():
            failures.append((name, ['symlink']))
        elif path.is_file():
            problems = inspect(name, path.read_bytes())
            if problems:
                failures.append((name, problems))
    for name, problems in failures:
        print(f'{name}: {", ".join(problems)}')
    if failures:
        raise SystemExit(1)
    print('Public source checks passed.')


if __name__ == '__main__':
    main()
