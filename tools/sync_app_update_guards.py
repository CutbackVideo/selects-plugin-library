#!/usr/bin/env python3
"""Inline the shared guard into self-contained panels; --check detects drift."""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
START = '// app-update-guard:start'
END = '// app-update-guard:end'


def sync(check=False):
    source = (ROOT / 'shared/app-update-guard.ts').read_text().rstrip()
    snippet = START + '\n' + source + '\n' + END
    policies = json.loads((ROOT / 'shared/app-update-guard-policies.json').read_text())
    stale = []
    targets = [ROOT / 'plugins' / pid / 'panel.tsx' for pid in policies]
    targets += [ROOT / 'plugins/chris-williamson-style/src/panel.template.tsx', ROOT / 'plugins/photo-gallery-no2/panel.template.tsx']
    for panel in targets:
        pid = str(panel.relative_to(ROOT))
        text = panel.read_text()
        if START in text:
            begin, finish = text.index(START), text.index(END) + len(END)
            updated = text[:begin] + snippet + text[finish:]
        else:
            updated = text.rstrip() + '\n\n' + snippet + '\n'
        if updated != text:
            stale.append(pid)
            if not check:
                panel.write_text(updated)
    if check and stale:
        raise SystemExit('Out-of-date shared app guards: ' + ', '.join(stale))
    return len(policies)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    print(f'Checked {sync(args.check)} app guard bundles.')
