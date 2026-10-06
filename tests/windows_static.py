"""Shared static checks for the Windows tests of plugins with no shell in their runtime path."""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# POSIX shell syntax and tools that fail in cmd.exe, or need a runtime Selects does not bundle.
FORBIDDEN = [
    "runShell", "run_shell", "mkdir -p", "printf", "$HOME", "$SELECTS_USER", "rm -f", "| base64",
    "shasum", "command -v", "export PATH", 'cat "', "2>/dev/null", "/Applications/", "/usr/bin/",
    "osascript", "/opt/homebrew",
]
RUNTIME_EXT = (".tsx", ".ts", ".js", ".mjs", ".cjs")


def plugin_dir(plugin_id):
    return os.path.join(ROOT, "plugins", plugin_id)


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def runtime_files(plugin_id):
    """Shipped code the app runs: files[] entries with a code extension, outside tests/ and tools/."""
    manifest = json.loads(read(os.path.join(plugin_dir(plugin_id), "plugin.json")))
    names = ["panel.tsx"] + list(manifest.get("files", []))
    return sorted({n for n in names if n.endswith(RUNTIME_EXT) and not n.startswith(("tests/", "tools/", "dev/"))})


def check_no_posix_shell(case, plugin_id):
    files = runtime_files(plugin_id)
    case.assertIn("panel.tsx", files)
    for name in files:
        text = read(os.path.join(plugin_dir(plugin_id), name))
        for needle in FORBIDDEN:
            case.assertNotIn(needle, text, f"{plugin_id}/{name}: {needle}")
        case.assertIsNone(re.search(r"\b(node|python3?)\s+[\"'$]", text), f"{plugin_id}/{name}: node/python spawn")


def check_manifest_and_docs(case, plugin_id):
    manifest = json.loads(read(os.path.join(plugin_dir(plugin_id), "plugin.json")))
    case.assertIn("Windows x64", manifest["compatibility"]["platforms"])
    for doc in ("INSTALL.md", "README.md", "SKILL.md"):
        path = os.path.join(plugin_dir(plugin_id), doc)
        if not os.path.exists(path):
            continue
        text = read(path).lower()
        for needle in ("brew ", "homebrew", "nvm "):
            case.assertNotIn(needle, text, f"{plugin_id}/{doc}: {needle}")
