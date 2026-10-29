#!/usr/bin/env python3
"""Run browser platform evidence against a dependency-installed Selects client checkout."""
import argparse
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--client', type=Path, required=True)
    args = parser.parse_args()
    client = args.client.resolve()
    if not (client / 'vitest.browser.config.ts').is_file():
        parser.error('--client must contain vitest.browser.config.ts')
    # Put the harness beside the client's node_modules so package imports resolve
    # without installing dependencies or modifying either checkout's configuration.
    with tempfile.TemporaryDirectory(prefix='.web-platform-audit-', dir=client) as tmp:
        directory = Path(tmp)
        test = directory / 'web-platforms.browser.test.ts'
        shutil.copyfile(ROOT / 'tests/selects-sdk/web-platforms.browser.test.ts', test)
        config = directory / 'vitest.config.ts'
        config.write_text('''import { mergeConfig, defineConfig } from "vitest/config";
import base from "../vitest.browser.config";
export default mergeConfig({ ...base, test: { ...base.test, include: [] } }, defineConfig({
  resolve: { alias: { "@plugin-library": LIBRARY } },
  server: { fs: { allow: [CLIENT, ROOT] } },
  test: { include: [TEST] }
}));
'''.replace('LIBRARY', json.dumps(str(ROOT / 'plugins')))
            .replace('CLIENT', json.dumps(str(client)))
            .replace('ROOT', json.dumps(str(ROOT)))
            .replace('TEST', json.dumps(str(test))))
        subprocess.run(['yarn', 'vitest', 'run', '--config', str(config)], cwd=client, check=True)


if __name__ == '__main__':
    main()
