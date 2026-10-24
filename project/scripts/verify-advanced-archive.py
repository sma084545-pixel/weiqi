# -*- coding: utf-8 -*-
"""Fresh extraction integrity + actual clean install/build/test. Does not edit sealed source."""
from pathlib import Path
import argparse,hashlib,json,os,subprocess,time,zipfile
p=argparse.ArgumentParser();p.add_argument('--archive',required=True);p.add_argument('--destination',required=True);p.add_argument('--report',required=True);args=p.parse_args()
archive=Path(args.archive).resolve();dest=Path(args.destination).resolve();assert not dest.exists(),'Refuse to overwrite another verification';dest.mkdir(parents=True)
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 for n in z.namelist():assert not n.startswith('/') and '..' not in Path(n).parts
 z.extractall(dest)
R=dest/'go-club';manifest=json.loads((R/'RELEASE_MANIFEST.json').read_text());errors=[]
for entry in manifest['files']:
 f=R/entry['path']
 assert f.is_file(),entry['path'];assert f.stat().st_size==entry['bytes'],entry['path'];assert hashlib.sha256(f.read_bytes()).hexdigest()==entry['sha256'],entry['path']
assert len(list(R.rglob('*')))>manifest['fileCount'];assert not (R/'node_modules').exists()
b=json.loads((R/'content/advanced-courses/bundle.json').read_text());assert len(b['lessons'])==6 and len(b['scenes'])==37
assert len(json.loads((R/'content/t09/bundle.json').read_text())['items'])==36
commands=['pnpm install --frozen-lockfile --prod=false','pnpm check','pnpm build:analysis','pnpm build:pages']
results=[]
for i,command in enumerate(commands):
 start=time.monotonic();log=dest/f'command-{i}.log'
 with log.open('w') as output:r=subprocess.run(command.split(),cwd=R,stdout=output,stderr=subprocess.STDOUT,env=os.environ)
 results.append({'command':command,'exitCode':r.returncode,'elapsedSeconds':round(time.monotonic()-start,2),'log':str(log)})
 if r.returncode:errors.append(command);break
report={'schemaVersion':1,'id':'ADVANCED-ARCHIVE-CHECK','revision':1,'rulesetId':'GO-CLUB-AREA-1','taskId':'ADVANCED_COURSES','baseVersion':'0.22.0-pages.1','resultVersion':'0.23.0-pages.1','status':'failed' if errors else 'passed','archive':str(archive),'archiveSha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'crc':'passed','fileHashes':'passed','fileCount':manifest['fileCount'],'formalPuzzles':30,'terminalFixtures':6,'advancedLessons':6,'advancedScenes':37,'freshDirectory':str(R),'commands':results,'failures':errors}
Path(args.report).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False));raise SystemExit(bool(errors))
