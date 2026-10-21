from pathlib import Path
import subprocess,os,json,datetime
r=Path.cwd();out=r/'docs/freeze-b/evidence';env=os.environ.copy();env['PATH']='/Users/maxiao/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:'+env['PATH'];env['TMPDIR']='/tmp';env['COREPACK_ENABLE_NETWORK']='0';env['CI']='true'
cmds=[['node','scripts/generate-types.mjs','--check'],['./node_modules/.bin/vitest','run','--reporter=dot'],['node','--import','tsx','scripts/validate-content.ts'],['node','--import','tsx','content/tools/validate.mjs'],['node','content/tools/test-grade.mjs'],['node','scripts/verify-merge-a.mjs'],['./node_modules/.bin/tsc','--noEmit','--pretty','false'],['./node_modules/.bin/vite','build'],['./node_modules/.bin/vite','build','--config','vite.engine.config.ts'],['./node_modules/.bin/tsc','-p','tsconfig.engine.json','--pretty','false'],['node','scripts/finish-engine-build.mjs'],['node','scripts/engine-smoke.mjs'],['./node_modules/.bin/tsc','-p','tsconfig.engine-smoke.json','--pretty','false'],['node','scripts/engine-capacity.mjs']]
results=[]
for i,cmd in enumerate(cmds,1):
 log=out/f'check-{i:02}.log'; start=datetime.datetime.now().astimezone().isoformat()
 with log.open('w') as f:p=subprocess.run(cmd,env=env,stdout=f,stderr=subprocess.STDOUT)
 results.append({'command':' '.join(cmd),'startedAt':start,'exitCode':p.returncode,'status':'passed' if p.returncode==0 else 'failed','log':str(log.relative_to(r))})
 print(results[-1],flush=True)
 (out/'checks.json').write_text(json.dumps({'taskId':'FREEZE_B','date':'2026-09-19','dependencyMode':'T15 existing locked dependencies, no installation','commands':results},indent=2)+'\n')
 if p.returncode:print(log.read_text()[-5000:],flush=True);raise SystemExit(p.returncode)
