#!/usr/bin/env python3
"""Check what a Clip highlights template must ship for the app's gallery.

A plugin is a template when its manifest says `"collection": "visual-highlights"`
or its panel's header says `// @collection visual-highlights`. Each one needs:
the tag in both places, a name and summary, a thumbnail (`preview.poster`) and a
demo video (`preview.video`), `prepare` (what to have ready) and `usesCredits`.
The demo should be about three seconds; a longer one is reported, not refused,
until the existing demos are re-cut.
"""
import json
from pathlib import Path
import re
import struct
import sys

ROOT = Path(__file__).resolve().parents[1]
COLLECTION = 'visual-highlights'
# The app reads the header from the panel's first 24 lines.
HEADER = re.compile(r'^[ \t]*//[ \t]*@collection[ \t]+([a-z0-9-]+)[ \t]*$')
HEADER_LINES = 24
MAX_PREPARE = 4
MAX_LINE = 120
DEMO_SECONDS = 3.0
DEMO_SLACK = 1.0


def panel_collection(panel):
    if not panel.is_file():
        return None
    for line in panel.read_text(encoding='utf-8').split('\n')[:HEADER_LINES]:
        match = HEADER.match(line)
        if match:
            return match.group(1)
    return None


def mp4_seconds(data):
    """The movie's length from its `mvhd` box, or None when it cannot be read."""
    def boxes(start, end):
        at = start
        while at + 8 <= end:
            size, kind = struct.unpack('>I4s', data[at:at + 8])
            header = 8
            if size == 1 and at + 16 <= end:
                size = struct.unpack('>Q', data[at + 8:at + 16])[0]
                header = 16
            elif size == 0:
                size = end - at
            if size < header or at + size > end:
                return
            yield kind, at + header, at + size
            at += size

    for kind, body, end in boxes(0, len(data)):
        if kind != b'moov':
            continue
        for inner, start, _ in boxes(body, end):
            if inner != b'mvhd':
                continue
            version = data[start]
            if version == 1:
                scale, duration = struct.unpack('>IQ', data[start + 20:start + 32])
            else:
                scale, duration = struct.unpack('>II', data[start + 12:start + 20])
            return duration / scale if scale else None
    return None


def check_plugin(folder):
    """(errors, warnings) for one plugin folder, or None when it is not a template."""
    manifest = json.loads((folder / 'plugin.json').read_text(encoding='utf-8'))
    tagged = manifest.get('collection') == COLLECTION
    header = panel_collection(folder / 'panel.tsx')
    if not tagged and header != COLLECTION:
        return None
    errors, warnings = [], []
    if not tagged:
        errors.append('panel.tsx says @collection visual-highlights but plugin.json has no "collection": "visual-highlights"')
    if header != COLLECTION:
        errors.append('plugin.json is in visual-highlights but panel.tsx has no "// @collection visual-highlights" in its first 24 lines')
    for field in ('name', 'summary'):
        if not isinstance(manifest.get(field), str) or not manifest[field].strip():
            errors.append(f'missing {field}')
    preview = manifest.get('preview') if isinstance(manifest.get('preview'), dict) else {}
    poster, video = preview.get('poster'), preview.get('video')
    if poster != 'poster.webp' or not (folder / 'poster.webp').is_file():
        errors.append('missing thumbnail: preview.poster must be "poster.webp" and the file must exist')
    if video != 'preview.mp4' or not (folder / 'preview.mp4').is_file():
        errors.append('missing demo: preview.video must be "preview.mp4" and the file must exist')
    else:
        seconds = mp4_seconds((folder / 'preview.mp4').read_bytes())
        if seconds is None:
            warnings.append('demo length could not be read')
        elif abs(seconds - DEMO_SECONDS) > DEMO_SLACK:
            warnings.append(f'demo is {seconds:.1f} s; it should be about {DEMO_SECONDS:.0f} s')
    for field in ('width', 'height'):
        if not (isinstance(preview.get(field), int) and preview[field] > 0):
            errors.append(f'preview.{field} must be a positive integer (the gallery tile takes its shape from it)')
    prepare = manifest.get('prepare')
    if not (isinstance(prepare, list) and 1 <= len(prepare) <= MAX_PREPARE
            and all(isinstance(line, str) and line.strip() and len(line.strip()) <= MAX_LINE for line in prepare)):
        errors.append(f'prepare must list 1-{MAX_PREPARE} lines of at most {MAX_LINE} characters (the setup page\'s "What you need")')
    if not isinstance(manifest.get('usesCredits'), bool):
        errors.append('usesCredits must be true or false')
    return errors, warnings


def main():
    failed = False
    count = 0
    for manifest in sorted((ROOT / 'plugins').glob('*/plugin.json')):
        result = check_plugin(manifest.parent)
        if result is None:
            continue
        count += 1
        errors, warnings = result
        name = manifest.parent.name
        for message in errors:
            print(f'{name}: {message}')
            failed = True
        for message in warnings:
            print(f'warning: {name}: {message}')
    if failed:
        sys.exit(1)
    print(f'Clip highlights template checks passed ({count} templates).')


if __name__ == '__main__':
    main()
