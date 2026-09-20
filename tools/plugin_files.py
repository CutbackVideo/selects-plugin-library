#!/usr/bin/env python3
"""Check or download a plugin's files at one Git commit. Never executes plugins."""
import argparse
import json
from pathlib import Path, PurePosixPath
import re
import shutil
import tempfile
import urllib.parse
import urllib.request

REPOSITORY = 'CutbackVideo/selects-plugin-library'
ROOT = Path(__file__).resolve().parents[1]
MAX_FILE = 32 * 1024 * 1024
MAX_TOTAL = 256 * 1024 * 1024
BLOCKED = {'.local', '.git', '.env', '__pycache__', 'node_modules', '.venv', 'venv'}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def plugin_id(value):
    require(isinstance(value, str) and re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', value)
            and len(value) <= 63, 'Invalid plugin ID')
    return value


def relative_file(value):
    require(isinstance(value, str) and value, 'Empty package path')
    path = PurePosixPath(value)
    require(bool(path.parts) and not path.is_absolute() and path.as_posix() == value
            and not any(p in ('.', '..') or p in BLOCKED for p in path.parts)
            and not any(c in value for c in ('\\', '\x00', ':')), 'Unsafe package path: ' + value)
    return value


def validate_manifest(manifest):
    require(manifest.get('schemaVersion') == 1, 'Unsupported manifest schema')
    plugin_id(manifest.get('id'))
    require(isinstance(manifest.get('version'), str) and re.fullmatch(
        r'(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?',
        manifest['version']), 'Invalid version')
    files = manifest.get('files')
    require(isinstance(files, list) and 0 < len(files) <= 1000 and all(isinstance(f, str) for f in files), 'Missing files list')
    require(len(set(files)) == len(files) and 'plugin.json' not in files, 'Duplicate or reserved file')
    for name in files:
        relative_file(name)
    for key in ('entrypoint', 'installation'):
        require(manifest.get(key) in files, 'Entrypoint/install guide must be included')
    preview = manifest.get('preview')
    if preview is not None:
        require(isinstance(preview, dict), 'Invalid preview metadata')
        require(preview.get('video') == 'preview.mp4' and preview.get('poster') == 'poster.webp',
                'Preview paths must use canonical filenames')
        require(all(type(preview.get(key)) is int and 0 < preview[key] <= 4096
                    for key in ('width', 'height')), 'Invalid preview dimensions')
        require(not any(name in files for name in ('preview.mp4', 'poster.webp')),
                'Gallery previews must not be installation files')
    return files + ['plugin.json']


def check(pid, root=ROOT):
    directory = Path(root).resolve() / 'plugins' / plugin_id(pid)
    manifest = json.loads((directory / 'plugin.json').read_text())
    require(manifest['id'] == pid, 'Folder and plugin ID differ')
    names = validate_manifest(manifest)
    if manifest.get('preview') is not None:
        names += ['preview.mp4', 'poster.webp']
    total = 0
    for name in names:
        path = directory / name
        require(path.is_file() and not path.is_symlink(), 'Not a regular file: ' + name)
        require(all(not p.is_symlink() for p in path.parents), 'Symlinked plugin path')
        size = path.stat().st_size
        require(size <= MAX_FILE, 'File too large: ' + name)
        total += size
    require(total <= MAX_TOTAL, 'Plugin too large; install runtimes/models separately')
    return {'id': pid, 'version': manifest['version'], 'files': len(names)}


def fetch(url, limit):
    # No credentials, cookies, netrc or GitHub CLI authentication.
    request = urllib.request.Request(url, headers={'User-Agent': 'selects-plugin-library'})
    with urllib.request.urlopen(request, timeout=30) as response:
        require(response.geturl().startswith('https://'), 'Insecure redirect')
        data = response.read(limit + 1)
    require(len(data) <= limit, 'File exceeds download limit')
    return data


def resolve_commit(ref):
    if re.fullmatch(r'[0-9a-fA-F]{40}', ref):
        return ref.lower()
    url = f'https://api.github.com/repos/{REPOSITORY}/commits/{urllib.parse.quote(ref, safe="")}'
    commit = json.loads(fetch(url, 2 * 1024 * 1024)).get('sha')
    require(isinstance(commit, str) and re.fullmatch(r'[0-9a-f]{40}', commit), 'Invalid commit')
    return commit


def download(pid, destination, ref='main'):
    plugin_id(pid)
    destination = Path(destination).absolute()
    require(not destination.exists() and not destination.is_symlink(), 'Destination already exists; use a fresh folder')
    commit = resolve_commit(ref)
    base = f'https://raw.githubusercontent.com/{REPOSITORY}/{commit}/plugins/{pid}/'
    manifest_bytes = fetch(base + 'plugin.json', 65536)
    manifest = json.loads(manifest_bytes)
    require(manifest.get('id') == pid, 'Requested plugin differs from manifest')
    names = validate_manifest(manifest)
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.plugin-stage-', dir=destination.parent) as temporary:
        stage = Path(temporary)
        total = 0
        for name in names:
            data = manifest_bytes if name == 'plugin.json' else fetch(
                base + urllib.parse.quote(name, safe='/'), MAX_FILE)
            total += len(data)
            require(total <= MAX_TOTAL, 'Plugin exceeds download limit')
            target = stage / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
        # Reserve the destination exclusively, including when another process
        # installed there while these files were downloading.
        destination.mkdir()
        try:
            for child in stage.iterdir():
                shutil.move(str(child), destination / child.name)
        except BaseException:
            shutil.rmtree(destination)
            raise
    return {'id': pid, 'version': manifest['version'], 'commit': commit,
            'files': len(names), 'destination': str(destination), 'installed': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    verify = commands.add_parser('check')
    verify.add_argument('id', nargs='?')
    dl = commands.add_parser('download')
    dl.add_argument('id')
    dl.add_argument('--destination', type=Path, required=True)
    dl.add_argument('--ref', default='main', help='Branch, tag or full commit SHA')
    args = parser.parse_args()
    if args.command == 'download':
        result = download(args.id, args.destination, args.ref)
    else:
        ids = [args.id] if args.id else sorted(p.parent.name for p in (ROOT / 'plugins').glob('*/plugin.json'))
        result = [check(pid) for pid in ids]
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
