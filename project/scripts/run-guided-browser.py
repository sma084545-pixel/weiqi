"""Run a CLI browser journey and replace its evidence even on failure (no stale pass)."""
from pathlib import Path
import argparse,json,subprocess
p=argparse.ArgumentParser();p.add_argument('--script',required=True);p.add_argument('--report',required=True);p.add_argument('--session',default='weiqi-guided');p.add_argument('--url');a=p.parse_args()
r=Path(__file__).resolve().parents[1];report=r/a.report;report.parent.mkdir(parents=True,exist_ok=True);log=report.with_suffix('.log');cli=Path.home()/'.codex/skills/playwright/scripts/playwright_cli.sh'
if report.exists():report.unlink()
with log.open('w') as output:
    if a.url:
        navigated=subprocess.run([str(cli),f'-s={a.session}','goto',a.url],cwd=r,stdout=output,stderr=subprocess.STDOUT)
        if navigated.returncode:raise SystemExit(navigated.returncode)
    result=subprocess.run([str(cli),f'-s={a.session}','run-code',(r/a.script).read_text()],cwd=r,stdout=output,stderr=subprocess.STDOUT)
raw=log.read_text()
try:
    assert result.returncode==0 and '### Result\n' in raw
    data=json.JSONDecoder().raw_decode(raw.split('### Result\n',1)[1])[0]
except Exception:data={'status':'failed','error':raw[-2500:]}
report.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:data.get(k) for k in ['status','programVersion','error']},ensure_ascii=False))
if data.get('status') not in {'passed','prepared'}:raise SystemExit(1)
