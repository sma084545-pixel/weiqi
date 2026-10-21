#!/usr/bin/env python3
from pathlib import Path
import os,sys,json,subprocess,shutil,argparse
p=argparse.ArgumentParser();p.add_argument('script');p.add_argument('out');args=p.parse_args();root=Path(__file__).resolve().parents[1]
env=dict(os.environ);env['PATH']=str(Path(shutil.which('node')).resolve().parent)+os.pathsep+env['PATH'];wrapper=Path.home()/'.codex/skills/playwright/scripts/playwright_cli.sh'
r=subprocess.run([str(wrapper),'--session','weiqi-render','run-code',(root/args.script).read_text()],cwd=root,env=env,capture_output=True,text=True)
out=root/args.out;out.parent.mkdir(parents=True,exist_ok=True);out.with_suffix('.log').write_text(r.stdout+r.stderr)
if r.returncode or '### Error' in r.stdout:print(r.stdout+r.stderr);sys.exit(r.returncode or 1)
if '### Result\n' not in r.stdout:print(r.stdout+r.stderr);sys.exit('Missing browser result')
data=json.loads(r.stdout.split('### Result\n',1)[1].split('\n### ',1)[0].strip())
if data.get('exportPath'):
 assert data['exportPath']=='docs/render/checks/QA-online-export.json'
 raw=(root/data['exportPath']).read_text();record=json.loads(raw)
 assert record['kind']=='GameState' and record['schemaVersion']==1 and record['rulesetId']=='GO-CLUB-AREA-1'
 score=record['result']['score'];assert score['blackTotal']==1 and score['whiteTotal']==1 and score['winner']=='draw'
 assert 'token' not in raw.lower()
 data['exportValidation']={'status':'passed','blackTotal':1,'whiteTotal':1,'winner':'draw','seatCredentialsPresent':False,'purpose':'TEST data from isolated QA room, not member feedback'}
out.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');print(json.dumps(data,ensure_ascii=False))
