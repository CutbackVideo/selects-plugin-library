#!/usr/bin/env python3
"""Build or download one Selects plugin. Python stdlib only; never executes plugins."""
import argparse
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import tempfile
import urllib.request
import zipfile

REPOSITORY = 'CutbackVideo/selects-plugin-library'
ROOT = Path(__file__).resolve().parents[1]
MAX_ARCHIVE = 100 * 1024 * 1024
MAX_EXPANDED = 256 * 1024 * 1024
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
    require(not path.is_absolute() and path.as_posix() == value
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
    require(isinstance(files, list) and files and all(isinstance(f, str) for f in files), 'Missing files list')
    require(len(set(files)) == len(files) and 'plugin.json' not in files, 'Duplicate or reserved file')
    for name in files:
        relative_file(name)
    for key in ('entrypoint', 'installation'):
        require(manifest.get(key) in files, 'Entrypoint/install guide must be included')
    return files + ['plugin.json']


def record_for(manifest, archive):
    pid, version = manifest['id'], manifest['version']
    tag = f'{pid}/v{version}'
    return {'schemaVersion': 1, 'id': pid, 'version': version,
            'status': manifest.get('status', 'experimental'), 'tag': tag,
            'url': f'https://github.com/{REPOSITORY}/releases/download/{tag}/{pid}-{version}.zip',
            'bytes': len(archive), 'sha256': hashlib.sha256(archive).hexdigest()}


def pack(pid, root=ROOT):
    plugin_id(pid)
    root = Path(root).resolve()
    directory = root / 'plugins' / pid
    manifest = json.loads((directory / 'plugin.json').read_text())
    require(manifest['id'] == pid, 'Folder and plugin ID differ')
    names = validate_manifest(manifest)
    buffer = io.BytesIO()
    total = 0
    with zipfile.ZipFile(buffer, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        for name in sorted(names):
            path = directory / name
            require(path.is_file() and not path.is_symlink(), 'Not a regular file: ' + name)
            require(all(not p.is_symlink() for p in path.parents if p != root), 'Symlinked package path')
            require(path.resolve().is_relative_to(directory.resolve()), 'Path escapes plugin folder')
            data = path.read_bytes()
            total += len(data)
            require(total <= MAX_EXPANDED, 'Package too large; keep runtimes/models outside it')
            info = zipfile.ZipInfo(f'{pid}/{name}', date_time=(2020, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = (stat.S_IFREG | 0o644) << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, data)
    data = buffer.getvalue()
    require(len(data) <= MAX_ARCHIVE, 'Archive too large')
    record = record_for(manifest, data)
    output = root / '.dist'
    output.mkdir(exist_ok=True)
    prefix = output / f'{pid}-{manifest["version"]}'
    Path(str(prefix) + '.zip').write_bytes(data)
    Path(str(prefix) + '.record.json').write_text(json.dumps(record, indent=2) + '\n')
    return record


def fetch(url, limit):
    # No credentials, cookies, netrc or GitHub CLI authentication are used.
    with urllib.request.urlopen(url, timeout=60) as response:
        require(response.geturl().startswith('https://'), 'Download redirected away from HTTPS')
        data = response.read(limit + 1)
    require(len(data) <= limit, 'Download exceeds expected size')
    return data


def unpack(data, record, destination):
    """Verify everything before writing; retain an existing installation untouched."""
    pid = plugin_id(record.get('id'))
    require(record.get('schemaVersion') == 1, 'Unsupported record schema')
    require(len(data) == record.get('bytes') and len(data) <= MAX_ARCHIVE, 'Archive size mismatch')
    require(hashlib.sha256(data).hexdigest() == record.get('sha256'), 'Archive checksum mismatch')
    destination = Path(destination).absolute()
    require(not destination.exists() and not destination.is_symlink(), 'Destination already exists; choose a new staging directory')
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        entries = archive.infolist()
        require(len(entries) <= 10000, 'Too many package files')
        require(sum(e.file_size for e in entries) <= MAX_EXPANDED, 'Expanded archive too large')
        names = []
        for entry in entries:
            relative_file(entry.filename)
            require(entry.filename.startswith(pid + '/'), 'Unexpected plugin in archive')
            require(not entry.is_dir(), 'Archive must list files only')
            mode = entry.external_attr >> 16
            require(stat.S_IFMT(mode) in (0, stat.S_IFREG), 'Archive contains a non-regular file')
            names.append(entry.filename[len(pid) + 1:])
        require(len(names) == len(set(names)), 'Duplicate archive member')
        manifest = json.loads(archive.read(f'{pid}/plugin.json'))
        require(manifest['id'] == pid and manifest['version'] == record.get('version'), 'Archive identity mismatch')
        require(set(validate_manifest(manifest)) == set(names), 'Archive file list differs from manifest')
        destination.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix='.plugin-stage-', dir=destination.parent) as temporary:
            stage = Path(temporary) / pid
            stage.mkdir()
            for name in names:
                target = stage / name
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(archive.read(f'{pid}/{name}'))
            # mkdir is exclusive, including when another process installed during verification.
            destination.mkdir()
            try:
                for child in stage.iterdir():
                    shutil.move(str(child), destination / child.name)
            except BaseException:
                shutil.rmtree(destination)
                raise
    return {'id': pid, 'version': record['version'], 'files': len(names),
            'sha256': record['sha256'], 'destination': str(destination), 'installed': False}


def download(pid, destination, record_path=None):
    plugin_id(pid)
    if record_path:
        record = json.loads(Path(record_path).read_text())
    else:
        url = f'https://raw.githubusercontent.com/{REPOSITORY}/main/catalog/{pid}.json'
        record = json.loads(fetch(url, 65536))
    require(record.get('id') == pid, 'Requested plugin differs from record')
    require(isinstance(record.get('bytes'), int) and 0 < record['bytes'] <= MAX_ARCHIVE, 'Invalid archive size')
    version = record.get('version')
    require(isinstance(version, str) and '/' not in version and '\\' not in version, 'Invalid record version')
    expected = f'https://github.com/{REPOSITORY}/releases/download/{pid}/v{version}/{pid}-{version}.zip'
    require(record.get('url') == expected, 'Record URL is outside the expected plugin release')
    return unpack(fetch(expected, record['bytes']), record, destination)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    commands.add_parser('pack').add_argument('id')
    dl = commands.add_parser('download')
    dl.add_argument('id')
    dl.add_argument('--destination', type=Path, required=True)
    dl.add_argument('--record', type=Path)
    args = parser.parse_args()
    result = pack(args.id) if args.command == 'pack' else download(args.id, args.destination, args.record)
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
