"""Static Windows checks for timeline-shorts-builder: no shell in the runtime path, Windows x64
declared, and thumbnail bytes from the host realm (window.parent) are accepted without instanceof."""
import os
import shutil
import subprocess
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from windows_static import check_manifest_and_docs, check_no_posix_shell, plugin_dir, read

PLUGIN = "timeline-shorts-builder"


def to_blob(source):
    start = source.index("async function toBlob(")
    return source[start: source.index("\n}\n", start) + 2]


class TimelineShortsBuilderWindowsTest(unittest.TestCase):
    def test_no_posix_shell_at_runtime(self):
        check_no_posix_shell(self, PLUGIN)

    def test_manifest_and_docs(self):
        check_manifest_and_docs(self, PLUGIN)

    def test_to_blob_does_not_use_instanceof(self):
        code = [l for l in to_blob(read(os.path.join(plugin_dir(PLUGIN), "panel.tsx"))).split("\n")
                if not l.lstrip().startswith("//")]
        self.assertNotIn("instanceof", "\n".join(code))

    @unittest.skipUnless(shutil.which("node"), "node not installed")
    def test_to_blob_with_bytes_from_another_realm(self):
        fn = to_blob(read(os.path.join(plugin_dir(PLUGIN), "panel.tsx")))
        fn = fn.replace("(value:any,fs:any):Promise<Blob>", "(value,fs)").replace("(value as any)", "(value)")
        script = (
            "const vm=require('vm');" + fn +
            "const o=vm.runInNewContext('({u8:new Uint8Array([1,2,3]),ab:new Uint8Array([4,5]).buffer})');"
            "Promise.all([toBlob(o.u8),toBlob(o.ab)]).then(bs=>Promise.all(bs.map(b=>b.arrayBuffer())))"
            ".then(r=>console.log(JSON.stringify(r.map(x=>Array.from(new Uint8Array(x))))));"
        )
        out = subprocess.run(["node", "-e", script], capture_output=True, text=True, check=True).stdout
        self.assertEqual(out.strip(), "[[1,2,3],[4,5]]")


if __name__ == "__main__":
    unittest.main()
