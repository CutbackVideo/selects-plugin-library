"""Static Windows checks for timeline-shorts-builder: no shell in the runtime path, Windows x64
declared, and thumbnail bytes from the host realm (window.parent) are accepted without instanceof."""
import json
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


    def test_clip_model_calls_are_feature_detected(self):
        panel = "\n".join(l for l in read(os.path.join(plugin_dir(PLUGIN), "panel.tsx")).split("\n")
                          if not l.lstrip().startswith("//"))
        # Selects 2.0.53x removed Clip.getStartTime() and changed getThumbnail's input; only the helpers touch them.
        self.assertEqual(panel.count(".getStartTime("), 1, "getStartTime only inside clipStart")
        self.assertEqual(panel.count(".getThumbnail("), 2, "getThumbnail only inside clipThumbnail")
        self.assertNotIn(".getDuration(", panel, "durations come from the SDK clip rows")
        self.assertIn("start:clipStart(c)", panel)
        self.assertIn("()=>clipThumbnail(p.c,lib,frame,fps,", panel)

    @unittest.skipUnless(shutil.which("node"), "node not installed")
    def test_clip_helpers_with_old_and_new_clip_models(self):
        panel = read(os.path.join(plugin_dir(PLUGIN), "panel.tsx"))
        helpers = "\n".join(l for l in panel.split("\n") if l.startswith(("const legacyClip=", "const jsonSafe=", "const clipStart=", "const clipThumbnail=")))
        helpers = (helpers.replace("(c:any)", "(c)").replace("(v:any)", "(v)")
                   .replace("(c:any,libraryId:string,frame:number,fps:number,camera:any)", "(c,libraryId,frame,fps,camera)"))
        script = r"""
const vm = require('node:vm');
const ctx = vm.createContext({});
vm.runInContext(process.argv[1] + '\nglobalThis.api = { clipStart, clipThumbnail };', ctx);
const calls = [];
const legacy = { getStartTime: () => 48, getThumbnail: (i) => (calls.push(i), 'old') };
const current = { getSourceStartTick: () => 1411200n, getThumbnail: (i) => (calls.push(i), 'new') };
const bare = { getThumbnail: (i) => (calls.push(i), 'bare') };
console.log(JSON.stringify({
  starts: [ctx.api.clipStart(legacy), ctx.api.clipStart(current), ctx.api.clipStart(bare)],
  thumbs: [ctx.api.clipThumbnail(legacy, 'L', 12, 30, 1), ctx.api.clipThumbnail(current, 'L', 12, 30, 1), ctx.api.clipThumbnail(bare, 'L', 5, 24, undefined)],
  calls,
}));
"""
        r = subprocess.run(["node", "-e", script, helpers], capture_output=True, text=True, timeout=30)
        self.assertEqual(r.returncode, 0, r.stderr)
        out = json.loads(r.stdout)
        self.assertEqual(out["starts"], [48, "1411200", None])
        self.assertEqual(out["thumbs"], ["old", "new", "bare"])
        self.assertEqual(out["calls"], [
            {"libraryId": "L", "frame": 12, "fps": 30, "quality": "low", "immediate": False},
            {"libraryId": "L", "presentationFrame": 12, "assignedVideoIndex": 1, "quality": "low", "immediate": False},
            {"libraryId": "L", "presentationFrame": 5, "quality": "low", "immediate": False},
        ])

if __name__ == "__main__":
    unittest.main()
