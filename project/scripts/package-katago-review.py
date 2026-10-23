#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Package the current verified mainline, without credentials, models or installed modules."""
from pathlib import Path
import argparse,hashlib,json,os,zipfile
p=argparse.ArgumentParser();p.add_argument('--output',required=True);a=p.parse_args()
R=Path(__file__).resolve().parents[1];target=Path(a.output).resolve();target.parent.mkdir(parents=True,exist_ok=True)
version=json.loads((R/'package.json').read_text())['version'];V=version+'-pages.1'
public=json.loads((R/'docs/katago/checks/public-journey.json').read_text());assert public['status']=='passed' and public['resultVersion']==V
assert public['realEngine'] and not public['mockResponses']
excluded={'RELEASE_MANIFEST.json','release-manifest.json','SHA256SUMS.txt'}
def digest(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
 return h.hexdigest()
def files():
 result=[]
 for folder,dirs,names in os.walk(R):
  dirs[:]=[d for d in dirs if d not in {'node_modules','.git','__pycache__','delivery','font-cache','runtime-data','.pnpm-store','.playwright-cli','.auth'} and not d.startswith('lo-')]
  rel=str(Path(folder).relative_to(R))
  if rel.startswith(('output/playwright/report','output/playwright/results','output/playwright/online-results','docs/katago/checks/frontend-results')):dirs[:]=[];continue
  for name in names:
   if name in {'.DS_Store','tsconfig.tsbuildinfo','.env'} or name.startswith('.env.') or name.endswith(('.pem','.p12','.key','.bin','.bin.gz')):continue
   path=Path(folder)/name
   assert not path.is_symlink(),str(path)
   result.append(path)
 return sorted(result)
base=json.loads((R/'docs/katago/BASE-MANIFEST.json').read_text());previous={x['path']:x['sha256'] for x in base['files']}
changed_path=R/'docs/katago/changed-files.json'
changed=[{'path':str(f.relative_to(R)),'kind':'added' if str(f.relative_to(R)) not in previous else 'modified','sha256':digest(f)} for f in files() if str(f.relative_to(R)) not in excluded|{'docs/katago/changed-files.json'} and previous.get(str(f.relative_to(R)))!=digest(f)]
changed_path.write_text(json.dumps({'schemaVersion':1,'id':'KATAGO-CHANGE-MANIFEST','revision':1,'rulesetId':'GO-CLUB-AREA-1','baseVersion':'0.21.3-pages.1','resultVersion':V,'selfHashExcluded':True,'files':changed,'removed':[x for x in previous if not (R/x).exists()]},ensure_ascii=False,indent=2)+'\n')
entries=[{'path':str(f.relative_to(R)),'bytes':f.stat().st_size,'sha256':digest(f)} for f in files() if str(f.relative_to(R)) not in excluded]
manifest={'schemaVersion':1,'id':'KATAGO-RELEASE-MANIFEST','revision':1,'rulesetId':'GO-CLUB-AREA-1','taskId':'KATAGO_REVIEW','baseVersion':'0.21.3-pages.1','resultVersion':V,'programVersion':version,'status':'live-verified','siteUrl':public['actualPublicUrl'],'analysisOrigin':public['actualServiceUrl'],'formalPuzzles':30,'terminalFixtures':6,'uniquePrimaryMicroSlides':25,'fileCount':len(entries)+3,'excludedFromSelfHash':sorted(excluded),'files':entries}
for name in ['RELEASE_MANIFEST.json','release-manifest.json']:(R/name).write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(R/'SHA256SUMS.txt').write_text(''.join(x['sha256']+'  '+x['path']+'\n' for x in entries)+''.join(digest(R/name)+'  '+name+'\n' for name in ['RELEASE_MANIFEST.json','release-manifest.json']))
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for file in files():z.write(file,'go-club/'+str(file.relative_to(R)))
with zipfile.ZipFile(target) as z:
 assert z.testzip() is None
 assert len(z.namelist())==manifest['fileCount']
 assert not any('/node_modules/' in name or '/runtime-data/' in name or '/.env' in name for name in z.namelist())
result={'archive':str(target),'bytes':target.stat().st_size,'sha256':digest(target),'fileCount':manifest['fileCount'],'resultVersion':V,'status':'archive-created-not-yet-clean-extraction-verified'}
target.with_suffix('.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
