#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path
import argparse,hashlib,json,os,subprocess,time,zipfile
p=argparse.ArgumentParser();p.add_argument('archive');p.add_argument('directory');p.add_argument('--full',action='store_true');a=p.parse_args()
source=Path(a.archive).resolve();dest=Path(a.directory).resolve();assert not dest.exists(),'Use a fresh extraction directory';dest.mkdir(parents=True)
def digest(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
 return h.hexdigest()
with zipfile.ZipFile(source) as z:
 assert z.testzip() is None
 for item in z.infolist():assert not Path(item.filename).is_absolute() and '..' not in Path(item.filename).parts
 z.extractall(dest)
 for item in z.infolist():
  mode=(item.external_attr>>16)&0o777
  if mode and not item.is_dir():(dest/item.filename).chmod(mode)
R=dest/'go-club';m=json.loads((R/'RELEASE_MANIFEST.json').read_text());assert m['programVersion']=='0.22.0' and m['rulesetId']=='GO-CLUB-AREA-1'
assert not (R/'node_modules').exists()
for row in m['files']:assert digest(R/row['path'])==row['sha256'],row['path']
assert len(list((R/'content/puzzles').glob('*.json')))==30 and len(list((R/'content/endgames').glob('*.json')))==6
for name in ['dist/index.html','dist-server/server.mjs','dist-analysis/analysis.mjs','analysis-engine/Dockerfile','analysis-engine/engine-manifest.json','handoff/KATAGO_REVIEW.md']:assert (R/name).is_file(),name
commands=[['pnpm','install','--frozen-lockfile','--prod=false']]
commands+=([['pnpm','check'],['pnpm','build:analysis']] if a.full else [['pnpm','build:pages'],['pnpm','build:analysis'],['pnpm','validate:t09'],['pnpm','test:analysis']])
records=[]
for index,cmd in enumerate(commands):
 start=time.time();log=dest/('command-'+str(index)+'.log')
 with log.open('wb') as out:result=subprocess.run(cmd,cwd=R,env=os.environ,stdout=out,stderr=subprocess.STDOUT)
 records.append({'command':' '.join(cmd),'exitCode':result.returncode,'elapsedSeconds':round(time.time()-start,2),'log':str(log)})
 if result.returncode:break
success=len(records)==len(commands) and all(row['exitCode']==0 for row in records)
report={'schemaVersion':1,'id':'KATAGO-ARCHIVE-CHECK','revision':1,'rulesetId':'GO-CLUB-AREA-1','resultVersion':m['resultVersion'],'status':'passed' if success else 'failed','archive':str(source),'archiveSha256':digest(source),'archiveBytes':source.stat().st_size,'crc':'passed','manifestFileHashes':'passed','fileCount':m['fileCount'],'formalPuzzles':30,'terminalFixtures':6,'freshExtract':str(R),'commands':records,'humanReviewed':None}
(dest/'ARCHIVE_CHECK.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False));assert success
