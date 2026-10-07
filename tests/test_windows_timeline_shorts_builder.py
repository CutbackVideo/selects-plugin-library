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


    def test_clip_reads_use_sdk_data_instead_of_host_models(self):
        panel = read(os.path.join(plugin_dir(PLUGIN), "panel.tsx"))
        self.assertNotIn("__DI__", panel)
        self.assertNotIn(".getThumbnail(", panel)
        self.assertNotIn(".getStartTime(", panel)
        self.assertIn("sdk.call('getDraftMediaSnapshot'", panel)
        self.assertIn("sdk.call('getDraftClipThumbnail'", panel)
        # Build and repair share the Project guard; no removed host() accessor remains.
        self.assertNotIn("host(pid)", panel)
        self.assertIn("assertProject(pid)", panel)

    def test_empty_host_thumbnail_falls_back_to_the_bundled_ffmpeg(self):
        panel = read(os.path.join(plugin_dir(PLUGIN), "panel.tsx"))
        request = panel[panel.index("let raw=await readStep('Thumbnail request'"):]
        request = request[: request.index("if(!raw)throw new Error('The thumbnail response was empty.');")]
        self.assertIn("if(!raw&&stampRow?.stamp?.path)raw=await readStep('Thumbnail from file',()=>ffmpegThumbnail(fs,root,stampRow.stamp.path,clipSourceSeconds(p.c,frame,fps)));", request)
        fallback = panel[panel.index("async function ffmpegThumbnail("):]
        fallback = fallback[: fallback.index("\nasync function digest(")]
        self.assertIn("rt.runFFmpeg(['-nostdin','-v','error','-y',...(still?[]:['-ss',seconds.toFixed(3)]),'-i',file,", fallback)
        self.assertIn("new Uint8Array(await fs.readFile(out))", fallback)
        self.assertNotIn("runShell", fallback)

    @unittest.skipUnless(shutil.which("node"), "node not installed")
    def test_source_seconds_from_the_probed_clip_model(self):
        panel = read(os.path.join(plugin_dir(PLUGIN), "panel.tsx"))
        fn = next(l for l in panel.split("\n") if l.startswith("function clipSourceSeconds("))
        fn = fn.replace("(c:any,frame:number,fps:number)", "(c,frame,fps)")
        # Values probed on Windows Staging 2.0.536: 23.976 fps, 29429400 ticks per frame (705600000 per second).
        script = r"""
const vm = require('node:vm');
const ctx = vm.createContext({});
vm.runInContext(process.argv[1] + '\nglobalThis.f = clipSourceSeconds;', ctx);
const clip = (seconds, speed) => ({ sourceStartSeconds: seconds, playbackSpeed: speed });
const fps = 24000 / 1001;
console.log(JSON.stringify([ctx.f(clip(0, 1), 0, fps), ctx.f(clip(0, 1), 899, fps), ctx.f(clip(1, 2), 24, fps), ctx.f(clip(0, 1), 48, 24)]));
"""
        r = subprocess.run(["node", "-e", script, fn], capture_output=True, text=True, timeout=30)
        self.assertEqual(r.returncode, 0, r.stderr)
        out = json.loads(r.stdout)
        self.assertAlmostEqual(out[0], 0)
        self.assertAlmostEqual(out[1], 899 * 1001 / 24000, places=6)
        self.assertAlmostEqual(out[2], 1 + 24 * 1001 / 24000 * 2, places=6)
        self.assertAlmostEqual(out[3], 2)

    def test_create_falls_back_when_duplicate_draft_needs_retake_snapshots(self):
        panel = read(os.path.join(plugin_dir(PLUGIN), "panel.tsx"))
        build = panel[panel.index("async function build(){"):]
        build = build[: build.index("\n return <div")]
        # The first attempt keeps duplicateDraft; only that host error switches to the public copy path.
        first, fallback = build.index("result=await create('duplicate')"), build.index("result=await create('insert')")
        self.assertLess(first, fallback)
        self.assertIn("if(!/unsupported_host_capability|retake\\.contentSnapshots/.test(String(e?.message??e)))throw e;", build)
        script = build[build.index("const create=(copy:'duplicate'|'insert')=>run(`"): build.index("`,'Create uncropped Draft',true);")]
        self.assertIn("const useDuplicate:boolean=${copy==='duplicate'};", script, "a boolean, not a literal comparison the script checker rejects")
        self.assertIn("d=await p.createDraft({name:draftName})", script)
        self.assertIn("await d.insert({source:await s.rangeAtFrames(0,total),tracks:'all'})", script)
        # Copied clips get new ids, so native sizes are matched by kind, resource and frames.
        self.assertIn("const source=match(c);", script)
        self.assertIn("x.trackKind===c.trackKind&&x.resourceId===c.resourceId&&x.startFrame===c.startFrame&&x.endFrame===c.endFrame", script)
        self.assertNotIn("sourceClips.find(x=>x.clipId===c.clipId);", script)

if __name__ == "__main__":
    unittest.main()
