#!/usr/bin/env python3
from pathlib import Path
import hashlib,json,zipfile,sys,re
R=Path(__file__).resolve().parents[1];W=R.parents[2];V='0.17.1-t24.1';DEST=W/'release'/V;DEST.mkdir(parents=True,exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
# Refresh only the affected branch manifest; its old handoff remains historical.
sub=R/'materials/pair-boards/FILE_MANIFEST.json';j=json.loads(sub.read_text());j.update(revision=2,resultVersion='0.2.1-t19.2',currentRepair='T24: 13路A4覆片/派生包r2;原2026-09-06渲染图仅是历史证据，当前复验docs/t24/checks');
for x in j['files']:
 p=R/x['path'];assert p.exists(),p;x.update(bytes=p.stat().st_size,sha256=sha(p))
sub.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n')
BASE=Path(json.loads((R/'docs/t24/input-manifest.json').read_text())['baseArchive'])
with zipfile.ZipFile(BASE) as z:
 old={n.split('/',1)[1]:hashlib.sha256(z.read(n)).hexdigest() for n in z.namelist() if n.startswith('go-club/') and not n.endswith('/')}
def include(p):
 rel=p.relative_to(R);parts=rel.parts
 if any(x in {'node_modules','.git','__pycache__','delivery','font-cache'} or x.startswith('lo-') for x in parts):return False
 if p.name in {'.DS_Store','tsconfig.tsbuildinfo'}:return False
 if parts[:3] in {('output','playwright','report'),('output','playwright','results'),('output','playwright','t24-webkit')}:return False
 return True
files=sorted(p for p in R.rglob('*') if p.is_file() and include(p))
changes=[dict(path=str(p.relative_to(R)),type='added' if str(p.relative_to(R)) not in old else 'modified',sha256=sha(p)) for p in files if old.get(str(p.relative_to(R)))!=sha(p) and p.name not in {'RELEASE_MANIFEST.json','release-manifest.json','SHA256SUMS.txt'}]
changed=dict(schemaVersion=1,id='T24-CHANGED-FILES',revision=1,rulesetId='GO-CLUB-AREA-1',baseVersion='0.17.0-plus-t23.1',resultVersion=V,files=changes,removed=[x for x in old if not (R/x).exists()],sourceChanges=[x for x in changes if x['path'].startswith('src/')],formalContentChanged=False,dependenciesChanged=False)
(R/'docs/t24/changed-files.json').write_text(json.dumps(changed,ensure_ascii=False,indent=2)+'\n')
files=sorted(p for p in R.rglob('*') if p.is_file() and include(p))
excluded={'RELEASE_MANIFEST.json','release-manifest.json','SHA256SUMS.txt'}
def role(rel):
 if rel.startswith('src/') or rel.startswith('schemas/'):return 'current-source'
 if rel.startswith('dist'):return 'production-build'
 if rel.startswith('content/puzzles/') or rel.startswith('content/endgames/') or rel.startswith('content/t09/'):return 'frozen-formal-content'
 if rel.startswith('docs/t24/checks/') or rel.startswith('output/playwright/'):return 'T24-validation-evidence'
 if rel.startswith('materials/'):return 'material-source-or-product; sub-version in release-inventory'
 if rel.startswith('handoff/T24'):return 'current-handoff'
 if rel.startswith('handoff/') or rel in {'MERGE_C_RELEASE_MANIFEST.json','README_MERGE_C.md'} or '/provenance/' in rel:return 'historical-provenance'
 return 'project-file'
entries=[dict(path=str(p.relative_to(R)),bytes=p.stat().st_size,sha256=sha(p),role=role(str(p.relative_to(R)))) for p in files if str(p.relative_to(R)) not in excluded]
m=dict(schemaVersion=1,id='T24-RELEASE-MANIFEST',revision=1,rulesetId='GO-CLUB-AREA-1',taskId='T24',baseVersion='T23 0.17.0-plus-t23.1',resultVersion=V,programVersion='0.17.1',freezeId='GO-CLUB-FREEZE-B-20260919-01',puzzleCount=30,terminalCount=6,uniquePrimaryMicroSlides=25,excludedFromSelfHash=sorted(excluded),excludedFromArchive=['node_modules','nested delivery archives','Office profiles/font cache','browser profiles/result report working folders','.DS_Store/pycache/build cache'],fileCount=len(entries)+3,files=entries)
for name in ['RELEASE_MANIFEST.json','release-manifest.json']:(R/name).write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
checks=entries+[dict(path=n,sha256=sha(R/n)) for n in ['RELEASE_MANIFEST.json','release-manifest.json']]
(R/'SHA256SUMS.txt').write_text(''.join(f"{x['sha256']}  {x['path']}\n" for x in sorted(checks,key=lambda x:x['path'])))
files=sorted(p for p in R.rglob('*') if p.is_file() and include(p))
archive=DEST/f'go-club-T24-{V}-full.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in files:z.write(p,'go-club/'+str(p.relative_to(R)))
with zipfile.ZipFile(archive) as z:assert z.testzip() is None;assert len(z.namelist())==m['fileCount'];names=set(z.namelist());assert all('node_modules' not in n for n in names)
(DEST/'SHA256SUMS.txt').write_text(f'{sha(archive)}  {archive.name}\n')
for src,name in [('handoff/T24.md','T24_交接.md'),('docs/t24/test-report.md','T24_测试报告.md'),('docs/t24/known-issues.md','T24_已知限制.md'),('docs/t24/acceptance-matrix.md','T24_验收矩阵.md'),('docs/t24/TEACHER_QUICK_START.md','教师快速开始.md')]:
 (DEST/name).write_bytes((R/src).read_bytes())
(DEST/'PACKAGE_INFO.json').write_text(json.dumps(dict(schemaVersion=1,id='T24-PACKAGE-INFO',revision=1,rulesetId='GO-CLUB-AREA-1',resultVersion=V,programVersion='0.17.1',archive=archive.name,sha256=sha(archive),files=len(files),archiveBytes=archive.stat().st_size),ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'archive':str(archive),'sha256':sha(archive),'files':len(files),'bytes':archive.stat().st_size},ensure_ascii=False))
