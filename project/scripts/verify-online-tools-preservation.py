#!/usr/bin/env python3
from pathlib import Path
import hashlib,json,zipfile,shutil
R=Path(__file__).resolve().parents[1];root=R.parents[3]
base=root/'work/release/0.20.3-pages.1/go-club-0.20.3-pages.1-full.zip'
assert hashlib.sha256(base.read_bytes()).hexdigest()=='bf1fb90395e4d2b5970647edc944d13d6501795dffbb36d4d54a41dafce7f505'
sha=lambda x:hashlib.sha256(x).hexdigest()
restore='--restore-generated' in __import__('sys').argv
protected=[];restored=[];captured=[];violations=[]
with zipfile.ZipFile(base) as z:
 known={name[8:] for name in z.namelist() if name.startswith('go-club/') and not name.endswith('/')}
 for rel in known:
  p=R/rel
  if not p.exists():
   if rel.startswith(('src/core/','schemas/','content/','materials/','handoff/')) or rel=='pnpm-lock.yaml':violations.append('missing '+rel)
   continue
  original=z.read('go-club/'+rel)
  if p.read_bytes()==original:
   if rel.startswith(('src/core/','schemas/','content/','materials/','handoff/')) or rel=='pnpm-lock.yaml':protected.append({'path':rel,'sha256':sha(original)})
   continue
  if rel=='src/core/version.ts':continue
  if rel.startswith('output/'):
   if restore:p.write_bytes(original);restored.append(rel)
  elif rel.startswith(('content/validation','content/t09/validation')) or rel in {'content/validation-report.md'} or (rel.startswith('docs/') and '/checks/' in rel):
   if restore:
    target=R/'docs/online-tools/checks/regression-generated'/rel;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,target);captured.append(str(target.relative_to(R)));p.write_bytes(original);restored.append(rel)
   else:violations.append('generated changed '+rel)
  elif rel.startswith(('src/core/','schemas/','content/','materials/','handoff/')) or rel=='pnpm-lock.yaml':violations.append('changed '+rel)
 if restore:
  for p in (R/'output').rglob('*'):
   if p.is_file() and str(p.relative_to(R)) not in known:p.unlink()
report={'schemaVersion':1,'id':'ONLINE-TOOLS-PRESERVATION','revision':1,'rulesetId':'GO-CLUB-AREA-1','baseVersion':'0.20.3-pages.1','protectedUnchanged':len(protected),'protectedFiles':sorted(protected,key=lambda x:x['path']),'restoredHistoricalGenerated':restored,'newEvidenceCaptured':captured,'violations':violations,'status':'passed' if not violations else 'failed'}
(R/'docs/online-tools/checks/preservation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'status':report['status'],'protectedUnchanged':len(protected),'restored':len(restored),'captured':len(captured),'violations':violations},ensure_ascii=False));assert not violations
