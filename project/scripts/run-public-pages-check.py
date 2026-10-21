#!/usr/bin/env python3
from pathlib import Path
import subprocess,os,json,sys,shutil
root=Path(__file__).resolve().parents[1];env=dict(os.environ);env['PATH']=str(Path(shutil.which('node')).resolve().parent)+os.pathsep+env['PATH']
wrapper=Path.home()/'.codex/skills/playwright/scripts/playwright_cli.sh';code=(root/'scripts/public-pages-journey.js').read_text();r=subprocess.run([str(wrapper),'--session','weiqi-pages','run-code',code],cwd=root,env=env,capture_output=True,text=True);out=root/'docs/github-pages/checks';(out/'public-journey.log').write_text(r.stdout+r.stderr)
if r.returncode or '### Error' in r.stdout:print(r.stdout+r.stderr);sys.exit(r.returncode or 1)
result=r.stdout.split('### Result\n',1)[1].split('\n### ',1)[0].strip();data=json.loads(result);assert data['status']=='passed';(out/'public-journey.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');print(json.dumps(data,ensure_ascii=False))
