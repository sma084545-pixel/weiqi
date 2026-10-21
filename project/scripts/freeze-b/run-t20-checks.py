import tempfile,shutil,subprocess,json,os,hashlib
from pathlib import Path
root=Path.cwd();out=root/'docs/freeze-b/evidence';stage=Path(tempfile.mkdtemp(prefix='freeze-t20-'))/'go-club';stage.mkdir();(stage/'materials').mkdir();shutil.copytree(root/'materials/rule-cards',stage/'materials/rule-cards');(stage/'dist-engine').symlink_to(root/'dist-engine',target_is_directory=True)
cmds=[['/Users/maxiao/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node','materials/rule-cards/source/verify-demos.mjs'],['/Users/maxiao/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3','materials/rule-cards/source/verify-print.py']];results=[]
for i,cmd in enumerate(cmds):
 with (out/f't20-check-{i+1}.log').open('w') as f:p=subprocess.run(cmd,cwd=stage,stdout=f,stderr=subprocess.STDOUT)
 results.append({'command':' '.join(cmd),'exitCode':p.returncode,'status':'passed' if p.returncode==0 else 'failed','isolatedCopy':True})
 if p.returncode:print((out/f't20-check-{i+1}.log').read_text());raise SystemExit(p.returncode)
changes=[]
for folder in ['data','source']:
 for p in (stage/'materials/rule-cards'/folder).glob('*'):
  if p.is_file() and p.read_bytes()!=(root/'materials/rule-cards'/folder/p.name).read_bytes():changes.append(f'{folder}/{p.name}')
for name in ['engine-checks.json','print-checks.json']:shutil.copy2(stage/'materials/rule-cards/validation'/name,out/f't20-{name}')
report={'taskId':'FREEZE_B','mainVersion':'0.15.0','engineSha256':hashlib.sha256((root/'dist-engine/go-club-rules.mjs').read_bytes()).hexdigest(),'commands':results,'regeneratedDataAndSvgDifferences':changes,'legacyReportNote':'The original T20 script hardcodes engineVersion 0.2.0. The actual tested engine is the T15 file hash recorded here. Original files are preserved.'}
(out/'t20-revalidation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2));assert not changes
