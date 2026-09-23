"""Run with Python 3.9+. Check the packaged helper on the installer's actual OS."""
import base64
import gzip
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

if sys.version_info < (3,9):
    raise SystemExit('Python 3.9 or newer is required.')
if sys.platform not in ('darwin','win32'):
    raise SystemExit('This release supports macOS and Windows.')
source=(Path(__file__).parent/'panel.tsx').read_text(encoding='utf-8')
match=re.search(r'(?:var|const) STORE_PROGRAM = "([A-Za-z0-9+/=]+)";',source)
if not match:
    raise SystemExit('The packaged helper could not be found. Reinstall the plugin files.')
program=gzip.decompress(base64.b64decode(match[1])).decode('utf-8')
root=Path.home()/'.selects/plugin-data/shortform-cloner'
root.mkdir(parents=True,exist_ok=True)
with tempfile.TemporaryDirectory(prefix='setup-check-',dir=root) as scratch:
    helper=Path(scratch)/'helper.py';helper.write_text(program,encoding='utf-8')
    env={**os.environ,'SHORTFORM_CLONER_DATA':str(Path(scratch)/'data'),'PYTHONDONTWRITEBYTECODE':'1','PYTHONIOENCODING':'utf-8'}
    def call(request):
        encoded=base64.b64encode(json.dumps(request,ensure_ascii=False).encode()).decode()
        result=subprocess.run([sys.executable,str(helper),encoded],capture_output=True,text=True,encoding='utf-8',env=env)
        payload=json.loads(result.stdout)
        if result.returncode or not payload.get('ok'):raise RuntimeError(payload.get('error','Helper failed'))
        return payload['result']
    value={'id':'setup-check','name':'Unicode \u65e5\u672c\u8a9e \ud55c\uae00 caf\u00e9'}
    call({'op':'save','kind':'styles','id':value['id'],'revision':0,'value':value})
    assert call({'op':'get','kind':'styles','id':value['id']})['name']==value['name']
    try:
        call({'op':'save','kind':'styles','id':value['id'],'revision':0,'value':value})
        raise RuntimeError('Revision conflict protection failed')
    except RuntimeError as error:
        if 'changed in another window' not in str(error):raise
    environment=call({'op':'environment'})
    missing=[tool for tool,available in environment['tools'].items() if not available]
    if missing:raise SystemExit('Missing tools: '+', '.join(missing)+'. Restart your terminal after installation and run setup again.')
    print('Runtime checks passed: persistence, Unicode, file lock, revision checks and media tools.')
    print('Detected browser profiles:',environment['browserProfiles'])
    print('Cookie decryption and video downloading are checked only when you request a video.')
