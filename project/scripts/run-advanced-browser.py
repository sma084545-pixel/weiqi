# -*- coding: utf-8 -*-
"""Run the durable CLI browser journey. Requires a running local/official frontend."""
from pathlib import Path
import argparse,json,os,subprocess,sys
p=argparse.ArgumentParser();p.add_argument('--base',default='http://127.0.0.1:4216/');p.add_argument('--out',default='docs/advanced-courses/checks/browser-journey.json');p.add_argument('--session',default='weiqi-advanced');p.add_argument('--offline',action='store_true');args=p.parse_args()
R=Path(__file__).resolve().parents[1]
config=json.loads((R/'docs/advanced-courses/checks/browser-input.json').read_text());config['base']=args.base;config['withOffline']=args.offline
code=(R/'scripts/advanced-browser-journey.js').read_text().replace('__ADVANCED_TEST_DATA__',json.dumps(config,ensure_ascii=False))
wrapper=Path.home()/'.codex/skills/playwright/scripts/playwright_cli.sh'
cli=[str(wrapper)] if wrapper.is_file() else ['npx','--yes','--package','@playwright/cli@0.1.22','playwright-cli']
result=subprocess.run(cli+['-s='+args.session,'run-code',code],cwd=R,capture_output=True,text=True,env=os.environ)
out=R/args.out;out.parent.mkdir(parents=True,exist_ok=True);out.with_suffix('.log').write_text(result.stdout+'\n'+result.stderr)
if result.returncode or '### Error' in result.stdout:
 print((result.stdout+result.stderr)[:3000]);sys.exit(result.returncode or 1)
if '### Result\n' not in result.stdout:sys.exit('Browser returned no durable result; inspect '+str(out.with_suffix('.log')))
report=json.loads(result.stdout.split('### Result\n',1)[1].split('\n### ',1)[0].strip())
out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k not in ['sceneRuns','checks']},ensure_ascii=False));print('sceneRuns',len(report['sceneRuns']),'checks',len(report['checks']))
