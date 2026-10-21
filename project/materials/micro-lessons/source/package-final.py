from pathlib import Path
import json,hashlib,zipfile
ROOT=Path(__file__).resolve().parents[1];BASE=ROOT.parents[1]
# Material-only incremental delivery. Exclude input project replicas and obsolete prep files.
files=[]
for folder in ['assets','source','qa']:
 for p in (ROOT/folder).rglob('*'):
  if not p.is_file() or '__pycache__' in p.parts:continue
  if folder=='source' and p.name in ['build-template.mjs','check-inputs.py','verify-template.py','package-preparation.py','layout-template.presentation.json','grid-geometry.json','template-speaker-notes.md']:continue
  if folder=='qa' and ('pdf-preparation' in p.parts or 'template' in p.name or 'layout-template' in p.name or p.name in ['dependency-check.json','preparation-files.json','template-QA.md']):continue
  files.append(p)
files += [ROOT/'README.md',ROOT/'sources.md']
files += sorted(p for p in (ROOT/'output').glob('*_r1.*') if p.suffix in ['.pptx','.pdf'])
files += [BASE/'handoff/T22.md']
items=[{'path':str(p.relative_to(BASE)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(set(files))]
manifest=ROOT/'FILE_MANIFEST.json';manifest.write_text(json.dumps({'schemaVersion':1,'id':'T22-FILE-MANIFEST','revision':1,'rulesetId':'GO-CLUB-AREA-1','baseVersion':'0.15.1','resultVersion':'0.15.1-t22.1','freezeId':'GO-CLUB-FREEZE-B-20260919-01','scope':'material-only incremental package; does not include the old full project','manifestSelfExcluded':True,'files':items},ensure_ascii=False,indent=2));files.append(manifest)
zipout=ROOT/'output/T22_materials_increment_0.15.1-t22.1.zip'
with zipfile.ZipFile(zipout,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for p in sorted(set(files)):z.write(p,str(p.relative_to(BASE)))
with zipfile.ZipFile(zipout) as z:
 assert z.testzip() is None
 assert all(n.startswith('materials/micro-lessons/') or n=='handoff/T22.md' for n in z.namelist())
 for f in items:assert hashlib.sha256(z.read(f['path'])).hexdigest()==f['sha256']
print(json.dumps({'status':'passed','entries':len(set(files)),'bytes':zipout.stat().st_size,'sha256':hashlib.sha256(zipout.read_bytes()).hexdigest(),'zip':str(zipout)}))
