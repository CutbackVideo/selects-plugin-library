#!/usr/bin/env python3
"""Local lifecycle bridge for native OpenAI realtime transcription.
Reads the locally saved key or OPENAI_API_KEY. Never returns its value.
The microphone starts only on 'start'; 'check' is local-only.
"""
import fcntl, json, os, pathlib, re, shlex, signal, subprocess, sys, time, uuid
HERE = pathlib.Path(__file__).resolve().parent
CONFIG = HERE / 'openai-runtime.json'
PIDF = HERE / 'stream.pid'
STATE = HERE / 'openai-state.json'
LOCK = HERE / 'bridge.lock'
KEYFILE = HERE / 'api-key'
LANGS = {'ko','en','ja'}

def key():
    try:
        saved = KEYFILE.read_text().strip()
        if saved: return saved
    except OSError: pass
    value = os.environ.get('OPENAI_API_KEY', '')
    if value: return value
    for filename in ('.zshrc','.zprofile'):
        try: lines = (pathlib.Path.home()/filename).read_text().splitlines()
        except OSError: continue
        for line in lines:
            if re.match(r'^\s*(?:export\s+)?OPENAI_API_KEY\s*=', line):
                try: tokens = shlex.split(line.split('=',1)[1], comments=True)
                except ValueError: continue
                if tokens and tokens[0].startswith('sk-') and '$' not in tokens[0] and '`' not in tokens[0]: return tokens[0]
    return ''

def binary():
    try:
        p = pathlib.Path(json.loads(CONFIG.read_text())['binary'])
        return str(p) if p.is_file() and os.access(p,os.X_OK) else None
    except (OSError, ValueError, KeyError): return None

def pid_alive():
    try:
        pid = int(PIDF.read_text().strip()); os.kill(pid,0)
        args = subprocess.run(['/bin/ps','-p',str(pid),'-o','stat=,args='],capture_output=True,text=True,timeout=2).stdout
        # Don't signal a reused unrelated PID. The whisper check is for migration only.
        if args.lstrip().startswith('Z') or not any(x in args for x in ('openai-transcriber','whisper-stream')): return None
        return pid
    except (OSError,ValueError,subprocess.SubprocessError): return None

def read_state():
    try: return json.loads(STATE.read_text())
    except (OSError,ValueError): return {}

def write_state(obj):
    temp=STATE.with_suffix('.tmp')
    temp.write_text(json.dumps(obj,ensure_ascii=False));os.chmod(temp,0o600);temp.replace(STATE)

def stop():
    pid=pid_alive()
    if pid:
        try: os.killpg(pid,signal.SIGTERM)
        except ProcessLookupError: pass
        for _ in range(30):
            if not pid_alive(): break
            time.sleep(.1)
        else:
            try: os.killpg(pid,signal.SIGKILL)
            except ProcessLookupError: pass
    try: PIDF.unlink()
    except FileNotFoundError: pass
    write_state({'phase':'stopped','heard':'','error':'','provider':'openai','model':'gpt-live-transcribe'})

def start(lang):
    if lang not in LANGS: return {'ok':False,'error':'\uc9c0\uc6d0\ud558\uc9c0 \uc54a\ub294 \uc5b8\uc5b4\uc785\ub2c8\ub2e4.'}
    exe=binary();secret=key()
    if not exe: return {'ok':False,'error':'OpenAI \uc74c\uc131 \uc778\uc2dd \uc2e4\ud589 \ud30c\uc77c\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.'}
    if not secret: return {'ok':False,'error':'\ub85c\uceec OPENAI_API_KEY\ub97c \ucc3e\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.'}
    stop()
    token=uuid.uuid4().hex
    write_state({'phase':'starting','session':token,'heard':'','error':''})
    env=os.environ.copy(); env['OPENAI_API_KEY']=secret
    # Credentials are inherited, not command-line arguments or a plugin settings value.
    with open(HERE/'openai-worker.err','wb') as err:
        proc=subprocess.Popen([exe,str(STATE),lang,token,'live'],stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=err,cwd=str(HERE),env=env,start_new_session=True,close_fds=True)
    PIDF.write_text(str(proc.pid));os.chmod(PIDF,0o600)
    deadline=time.monotonic()+15
    while time.monotonic()<deadline:
        state=read_state()
        if state.get('session')==token and state.get('phase')=='listening': return {'ok':True,'phase':'listening','provider':'openai','model':'gpt-live-transcribe'}
        if proc.poll() is not None or state.get('phase')=='error':
            error=state.get('error') or '\uc74c\uc131 \uc778\uc2dd \uc2dc\uc791\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4. \ub9c8\uc774\ud06c \uad8c\ud55c\uc744 \ud655\uc778\ud558\uc138\uc694.'
            stop();return {'ok':False,'error':error.replace(secret,'[redacted]')[:400]}
        time.sleep(.15)
    # A system microphone permission dialog can still be awaiting the user.
    return {'ok':True,'phase':'starting','provider':'openai','model':'gpt-live-transcribe'}

def read():
    state=read_state();running=pid_alive() is not None and state.get('phase') not in ('error','stopped')
    error=state.get('error','')
    if not running and not error and state.get('phase') not in ('stopped',None): error='\uc74c\uc131 \uc778\uc2dd\uc774 \uc885\ub8cc\ub418\uc5c8\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \uc2dc\uc791\ud558\uc138\uc694.'
    secret=key()
    if secret: error=error.replace(secret,'[redacted]')
    return {'running':running,'phase':state.get('phase','idle'),'heard':state.get('heard','') if running else '', 'error':error[:400],'provider':'openai','model':'gpt-live-transcribe'}

if __name__=='__main__':
    os.chdir(HERE)
    cmd=sys.argv[1] if len(sys.argv)>1 else 'check'
    with open(LOCK,'a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX)
        if cmd=='start': result=start(sys.argv[2] if len(sys.argv)>2 else 'ko')
        elif cmd=='stop': stop(); result={'ok':True}
        elif cmd=='read': result=read()
        elif cmd=='prepare-key':
            fd = os.open(KEYFILE, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
            os.fchmod(fd, 0o600); os.close(fd)
            result={'ok':True}
        elif cmd=='delete-key':
            KEYFILE.unlink(missing_ok=True)
            result={'ok':True}

        else: result={'binary':bool(binary()),'model':bool(key()),'provider':'openai','modelName':'gpt-live-transcribe'}
    print(json.dumps(result,ensure_ascii=False))
