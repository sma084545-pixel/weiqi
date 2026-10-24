# -*- coding: utf-8 -*-
"""Seal the current incremental mainline after actual local AND public verification."""
from pathlib import Path
import argparse,hashlib,json,os,zipfile
R=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--output',required=True);p.add_argument('--base',required=True);args=p.parse_args();out=Path(args.output).resolve();B=Path(args.base).resolve()
assert R not in out.parents and out!=R,'Do not put an archive inside its source'
V='0.23.0-pages.1';assert json.loads((R/'package.json').read_text())['version']=='0.23.0'
for name in ['content-validation.json','production-browser-journey.json','public-browser-journey.json','upgrade-result.json','preservation.json']:
 assert json.loads((R/'docs/advanced-courses/checks'/name).read_text())['status']=='passed',name
out.mkdir(parents=True,exist_ok=True);target=out/f'go-club-{V}-full.zip';assert not target.exists(),'Do not overwrite a sealed release'
exclude_dirs={'node_modules','.git','__pycache__','delivery','font-cache','runtime-data','.pnpm-store','.playwright-cli','.auth'}
exclude_files={'.DS_Store','tsconfig.tsbuildinfo','.env'};self_files={'RELEASE_MANIFEST.json','release-manifest.json','SHA256SUMS.txt'}
def files(root):
 result=[]
 for folder,dirs,names in os.walk(root):
  dirs[:]=[d for d in dirs if d not in exclude_dirs and not d.startswith('lo-')]
  for name in names:
   if name in exclude_files or name.startswith('.env.') or name.endswith(('.pem','.p12','.key')):continue
   path=Path(folder)/name
   if path.is_file():result.append(path)
 return sorted(result)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
identity={'schemaVersion':1,'rulesetId':'GO-CLUB-AREA-1','taskId':'ADVANCED_COURSES','baseVersion':'0.22.0-pages.1','resultVersion':V}
# The detailed source/content/test/doc change list deliberately excludes generated release self-hashes.
source_roots=('src/','tests/','scripts/','schemas/','content/','docs/','handoff/')
old={str(p.relative_to(B)):sha(p) for p in files(B) if str(p.relative_to(B)).startswith(source_roots) or str(p.relative_to(B)) in ['package.json','README.md','SOURCES.md','CHANGELOG.md']}
current={str(p.relative_to(R)):p for p in files(R)}
changes=[]
for name,path in current.items():
 if not(name.startswith(source_roots) or name in ['package.json','README.md','SOURCES.md','CHANGELOG.md','playwright.advanced-regression.config.ts']):continue
 if name=='docs/advanced-courses/CHANGED_FILES.json':continue
 h=sha(path)
 if old.get(name)!=h:changes.append({'path':name,'change':'added' if name not in old else 'modified','baseSha256':old.get(name),'sha256':h})
change_manifest={**identity,'id':'ADVANCED-CHANGE-MANIFEST','revision':1,'kind':'ChangeManifest','files':sorted(changes,key=lambda x:x['path'])}
(R/'docs/advanced-courses/CHANGED_FILES.json').write_text(json.dumps(change_manifest,ensure_ascii=False,indent=2)+'\n')
entries=[{'path':str(p.relative_to(R)),'bytes':p.stat().st_size,'sha256':sha(p)} for p in files(R) if str(p.relative_to(R)) not in self_files]
bundle=json.loads((R/'content/advanced-courses/bundle.json').read_text())
manifest={**identity,'id':'RELEASE-ADVANCED-COURSES','revision':1,'kind':'ProjectRelease','status':'complete-digital-scope-with-documented-limits','programVersion':'0.23.0','siteUrl':'https://sma084545-pixel.github.io/weiqi/','formalPuzzles':30,'terminalFixtures':6,'microLessonPrimarySlides':25,'routeStages':12,'advancedLessons':[{'id':l['id'],'revision':l['revision']} for l in bundle['lessons']],'advancedScenes':[{'id':s['id'],'revision':s['revision']} for s in bundle['scenes']],'fileCount':len(entries)+3,'excludedFromSelfHash':sorted(self_files),'files':entries,'humanReviewed':None}
for name in ['RELEASE_MANIFEST.json','release-manifest.json']:(R/name).write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(R/'SHA256SUMS.txt').write_text(''.join(f"{x['sha256']}  {x['path']}\n" for x in entries)+''.join(sha(R/name)+'  '+name+'\n' for name in ['RELEASE_MANIFEST.json','release-manifest.json']))
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for path in files(R):z.write(path,'go-club/'+str(path.relative_to(R)))
with zipfile.ZipFile(target) as z:
 assert z.testzip() is None
 assert len(z.namelist())==manifest['fileCount']
 for name in z.namelist():assert '/node_modules/' not in name and '/runtime-data/' not in name and '/.playwright-cli/' not in name
result={**identity,'id':'ADVANCED-FULL-ARCHIVE','revision':1,'archive':str(target),'bytes':target.stat().st_size,'sha256':sha(target),'fileCount':manifest['fileCount'],'status':'archive-created-pending-fresh-extraction-check'}
target.with_suffix('.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
