from pathlib import Path
import json,hashlib,zipfile,shutil
R=Path(__file__).resolve().parents[1];project=R.parents[1];out=project.parents[1]/'output/pdf/T20_0.2.0-t20.1';out.mkdir(parents=True,exist_ok=True)
meta={'schemaVersion':1,'id':'T20-FILE-MANIFEST','revision':1,'rulesetId':'GO-CLUB-AREA-1','baseVersion':'0.2.0','resultVersion':'0.2.0-t20.1'}
# Remove only superseded QA contact sheets created during this task.
for n in ['contact-1.png','contact-2.png']:
 p=R/'validation'/n
 if p.exists():p.unlink()
files=sorted(p for p in R.rglob('*') if p.is_file() and p.name!='FILE_MANIFEST.json')+[project/'handoff/T20.md']
manifest={**meta,'scope':'Only materials/rule-cards and handoff/T20.md. No baseline files modified.','files':[{ 'path':str(p.relative_to(project)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size} for p in files]}
(R/'FILE_MANIFEST.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
files.append(R/'FILE_MANIFEST.json')
archives=[]
for name,paths in [('T20-0.2.0-t20.1-MATERIALS.zip',files),('go-club-0.2.0-plus-T20-REPRODUCTION.zip',sorted(p for p in project.rglob('*') if p.is_file()))]:
 path=out/name
 with zipfile.ZipFile(path,'w',zipfile.ZIP_DEFLATED) as z:
  for p in paths:z.write(p,'go-club/'+str(p.relative_to(project)))
 with zipfile.ZipFile(path) as z:
  assert z.testzip() is None
  for p in paths:assert z.read('go-club/'+str(p.relative_to(project)))==p.read_bytes()
 archives.append({'file':name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'files':len(paths),'crc':'PASS','byteVerification':'PASS'})
for n in ['all-independent-cards.pdf','PRINT-A4-landscape-short-edge.pdf','PRINT-A4-portrait-long-edge-mini.pdf']:
 shutil.copyfile(R/'pdf'/n,out/n)
shutil.copyfile(R/'PRINT-AND-TEACHER.md',out/'START-HERE.md')
shutil.copyfile(R/'validation/ACCEPTANCE.md',out/'ACCEPTANCE.md')
shutil.copyfile(project/'handoff/T20.md',out/'T20-handoff.md')
(out/'PACKAGE-CHECKS.json').write_text(json.dumps({**meta,'id':'T20-PACKAGE-CHECKS','archives':archives},indent=2)+'\n')
(out/'SHA256SUMS.txt').write_text('# schemaVersion=1 id=T20-SHA256 revision=1 rulesetId=GO-CLUB-AREA-1\n'+''.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}\n' for p in sorted(out.iterdir()) if p.is_file() and p.name!='SHA256SUMS.txt'))
print(out.resolve());print(json.dumps(archives,indent=2))
