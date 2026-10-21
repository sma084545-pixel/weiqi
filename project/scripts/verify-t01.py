"""Run and retain reproducible T01 command evidence; never inspect a blocked browser."""
from pathlib import Path
import subprocess,json,datetime,os,time,signal,sys
root=Path(__file__).resolve().parents[1]
out=root/'output/validation/T01';out.mkdir(parents=True,exist_ok=True)
results=[]
def run(command,log):
 start=datetime.datetime.now(datetime.timezone.utc).isoformat()
 with (out/log).open('w') as f:
  process=subprocess.run(command,cwd=root,stdout=f,stderr=subprocess.STDOUT,env={**os.environ,'CI':'true'})
 results.append(dict(command=command,checkedAt=start,exitCode=process.returncode,log='output/validation/T01/'+log))
 print(json.dumps(results[-1]),flush=True)
 if process.returncode:raise RuntimeError('Command failed; see '+log)
try:
 run(['pnpm','check'],'check.log')
 run(['sh','scripts/clean-verify.sh'],'clean-install.log')
 # Readiness is a process startup check only, not HTTP inspection or browser QA.
 with (out/'dev-start.log').open('w') as f:
  proc=subprocess.Popen(['pnpm','dev','--port','5175'],cwd=root,stdout=f,stderr=subprocess.STDOUT,start_new_session=True)
  ready=False
  try:
   for i in range(100):
    time.sleep(.1)
    if 'ready in' in (out/'dev-start.log').read_text():ready=True;break
    if proc.poll() is not None:break
  finally:
   if proc.poll() is None:os.killpg(proc.pid,signal.SIGTERM)
   proc.wait(timeout=10)
 results.append(dict(command=['pnpm','dev','--port','5175'],checkedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),status='passed' if ready else 'failed',evidence='Vite ready; process deliberately stopped after readiness; no browser or HTTP test',log='output/validation/T01/dev-start.log'))
 if not ready:raise RuntimeError('Dev startup did not become ready')
finally:
 report=dict(schemaVersion=1,id='REPORT-T01-COMMANDS',revision=1,rulesetId='GO-CLUB-AREA-1',kind='DeveloperValidationReport',taskId='T01',version='0.2.0',humanReviewed=None,commands=results)
 (out/'command-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
