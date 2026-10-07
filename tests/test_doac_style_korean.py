"""DOAC Style draws Korean captions with a Hangul fallback face, not .notdef boxes.

The approved faces (Helvetica Neue, Arial, ...) have no Hangul; approved/textfont.py
draws the characters they lack with Apple SD Gothic Neo. Runs the Python engine in
a subprocess on a copy of approved/ (importing it writes beside the plans). macOS
only (the fallback is a system font); needs Pillow, NumPy and SciPy. Set
DOAC_APPROVED to check another copy of approved/.
"""
import base64
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
APPROVED = Path(os.environ.get('DOAC_APPROVED') or ROOT / 'plugins/doac-style/approved')
FALLBACK = Path('/System/Library/Fonts/AppleSDGothicNeo.ttc')
READY = FALLBACK.exists() and all(importlib.util.find_spec(m) for m in ['PIL', 'numpy', 'scipy'])

# Compile one caption scene and print its settled frame's mask: the Korean words,
# then the same words as unassigned code points (always .notdef).
SCRIPT = r'''
import hashlib, json, sys
from PIL import Image
sys.path.insert(0, sys.argv[1])
import engine
def mask(words, template=None):
    W = [dict(text=w, start=6 + i * 14, end=18 + i * 14) for i, w in enumerate(words)]
    sc = dict(words=[0, len(W) - 1], kind='plain')
    if template: sc.update(kind='emphasis', template=template, slots=[[i, i] for i in range(len(W))])
    plans, records, _ = engine.compile(dict(fps=30, frames=6 + len(W) * 14 + 20, words=W), [sc])
    p = plans[0]
    im = engine.render(p, p['end'] - 1, Image.new('RGB', (540, 960), 'black'), False).convert('L')
    return dict(box=im.getbbox(), pixels=hashlib.sha256(im.tobytes()).hexdigest(), slots=records[0]['slots'])
out = {}
for name, words, template in json.loads(sys.argv[2]):
    try: out[name] = mask(words, template)
    except Exception as e: out[name] = dict(error=type(e).__name__ + ': ' + str(e))
print(json.dumps(out))
'''
TOFU = '\U0010FFFD'
CASES = [
    # "geureoke haeseo nunneun geoya maja"
    ('plain', ['\uadf8\ub807\uac8c', '\ud574\uc11c', '\ub215\ub294', '\uac70\uc57c', '\ub9de\uc544'], None),
    ('plain-tofu', [TOFU * 3, TOFU * 2, TOFU * 2, TOFU * 2, TOFU * 2], None),
    ('mixed', ['\uc624\ub298\uc740', 'AI', '\uc774\uc57c\uae30'], None),
    ('template', ['\uc65c', '\uc774\ub7f0', '\uc77c\uc774', '\uc9c0\uae08', '\uc0dd\uae38\uae4c'], '19'),
    ('template-tofu', [TOFU, TOFU * 2, TOFU * 2, TOFU * 2, TOFU * 3], '19'),
]


@unittest.skipUnless(READY, 'needs macOS Apple SD Gothic Neo, Pillow, NumPy and SciPy')
class DoacStyleKoreanTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with tempfile.TemporaryDirectory() as tmp:
            work = Path(tmp) / 'approved'
            shutil.copytree(APPROVED, work)
            marker = work / 'native/fonts/permanentmarker/PermanentMarker-Regular.ttf'
            marker.write_bytes(base64.b64decode(marker.with_suffix('.ttf.b64').read_text()))
            run = subprocess.run([sys.executable, '-c', SCRIPT, str(work), json.dumps(CASES)], capture_output=True, text=True,
                                 env={**os.environ, 'PYTHONDONTWRITEBYTECODE': '1'}, timeout=600)
        if run.returncode:
            raise AssertionError(run.stderr[-3000:])
        cls.out = json.loads(run.stdout.strip().splitlines()[-1])

    def test_plain_caption_is_not_notdef_boxes(self):
        ko, tofu = self.out['plain'], self.out['plain-tofu']
        self.assertNotIn('error', ko)
        self.assertNotEqual(ko['pixels'], tofu['pixels'], 'Korean drew the same .notdef boxes as unassigned code points')
        self.assertEqual(ko['slots'][0]['text'], '\uadf8\ub807\uac8c \ud574\uc11c \ub215\ub294 \uac70\uc57c \ub9de\uc544')

    def test_layout_measures_the_fallback_face(self):
        # Hangul is wider than .notdef: the centered line and its record grow with it.
        ko, tofu = self.out['plain'], self.out['plain-tofu']
        self.assertGreater(ko['box'][2] - ko['box'][0], tofu['box'][2] - tofu['box'][0])
        self.assertGreater(ko['slots'][0]['w'], tofu['slots'][0]['w'])
        self.assertLess(ko['box'][2] - ko['box'][0], 540)

    def test_mixed_latin_and_hangul(self):
        self.assertNotIn('error', self.out['mixed'])

    def test_template_slots_use_the_fallback(self):
        ko, tofu = self.out['template'], self.out['template-tofu']
        self.assertNotIn('error', ko)
        self.assertNotEqual(ko['pixels'], tofu.get('pixels'))


if __name__ == '__main__':
    unittest.main()
