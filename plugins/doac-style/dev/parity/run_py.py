"""Run the Python DOAC compiler (approved/compile-captions.py) on a job and dump
what compare.js checks.

    python run_py.py <work dir> <job dir> <mac|bundled|winsim> [catalogue]

The font modes match run_js.js: `bundled` maps every face to the bundled fonts
the way approved/web/worker.js does without system fonts; `winsim` keeps
Arial, Arial Black, Georgia and Times (as on Windows) and maps Helvetica,
Helvetica Neue and Arial Narrow to Arimo. Needs Pillow, NumPy and SciPy.
Writes <job dir>/py/{result.json,frames.bin}."""
import sys, os, json, base64, io, importlib.util, traceback, contextlib
from PIL import Image, ImageFont

work, jobdir, mode = sys.argv[1:4]
approved = os.path.join(work, 'approved')
orig_truetype = ImageFont.truetype
SYS = '/System/Library/Fonts/'
SUP = SYS + 'Supplemental/'
A = lambda n: os.path.join(work, 'fonts', 'Arimo-%s.ttf' % n)
# (path, index) -> (Windows system file or None, Arimo weight); see approved/web/worker.js
MAP = {
    (SYS + 'HelveticaNeue.ttc', 0): (None, 'Regular'), (SYS + 'HelveticaNeue.ttc', 1): (None, 'Bold'),
    (SYS + 'HelveticaNeue.ttc', 9): (None, 'Bold'), (SYS + 'HelveticaNeue.ttc', 10): (None, 'Medium'),
    (SYS + 'Helvetica.ttc', 0): (None, 'Regular'), (SYS + 'Helvetica.ttc', 1): (None, 'Bold'),
    (SUP + 'Arial.ttf', 0): (True, 'Regular'), (SUP + 'Arial Bold.ttf', 0): (True, 'Bold'), (SUP + 'Arial Bold Italic.ttf', 0): (True, 'Bold'),
    (SUP + 'Arial Black.ttf', 0): (True, 'Bold'), (SUP + 'Arial Narrow Bold.ttf', 0): (None, 'Bold'),
    (SUP + 'Georgia Bold.ttf', 0): (True, 'Bold'), (SUP + 'Times New Roman.ttf', 0): (True, 'Regular'),
}


def truetype(font=None, size=10, index=0, encoding='', layout_engine=None):
    key = (str(font), index)
    if mode != 'mac' and not str(font).endswith('PermanentMarker-Regular.ttf'):
        system, weight = MAP.get(key, (None, 'Regular'))
        if not (mode == 'winsim' and system):
            # Unmapped faces are only touched by the legacy import-time build(), never drawn.
            return orig_truetype(A(weight), size, index=0, encoding=encoding, layout_engine=layout_engine)
    return orig_truetype(font, size, index=index, encoding=encoding, layout_engine=layout_engine)


ImageFont.truetype = truetype
sys.path.insert(0, approved)
spec = importlib.util.spec_from_file_location('compile_captions', os.path.join(approved, 'compile-captions.py'))
cc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cc)
out = os.path.join(jobdir, 'py')
os.makedirs(out, exist_ok=True)
frames = io.BytesIO()
try:
    with contextlib.redirect_stdout(io.StringIO()):
        cc.compile_job(os.path.join(jobdir, 'job.json'))
    man = json.load(open(os.path.join(jobdir, 'compiled', 'manifest.json')))
    scenes = []
    for s in man['scenes']:
        p = json.load(open(s['payload']))
        atlas = Image.open(io.BytesIO(base64.b64decode(p['atlas'].split(',', 1)[1]))).convert('RGBA')
        for i in range(s['uniqueFrames']):
            c, r = i % p['cols'], i // p['cols']
            frames.write(atlas.crop((c * p['w'], r * p['h'], (c + 1) * p['w'], (r + 1) * p['h'])).tobytes())
        scenes.append(dict(index=s['index'], start=s['start'], end=s['end'], template=s['template'], text=s['text'], uniqueFrames=s['uniqueFrames'],
                           frameMap=p['frameMap'], fps=p['fps'], x=p['x'], y=p['y'], w=p['w'], h=p['h'], cols=p['cols'], rows=p['rows'], size=p['size']))
    result = dict(scenes=scenes, records=man['records'], placement=man['placement'], words=man['words'], frames=man['frames'], fps=man['fps'])
except Exception as e:
    result = dict(error=dict(type=type(e).__name__, message=str(e)), trace=traceback.format_exc()[-1500:])
json.dump(result, open(os.path.join(out, 'result.json'), 'w'), indent=1)
open(os.path.join(out, 'frames.bin'), 'wb').write(frames.getvalue())
if 'catalogue' in sys.argv[4:]:
    json.dump(cc.catalogue(), open(os.path.join(out, 'catalogue.json'), 'w'))
print(jobdir, 'error' if 'error' in result else 'ok', result.get('error', ''))
