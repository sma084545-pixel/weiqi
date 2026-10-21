#!/usr/bin/env python3
"""Build both FREEZE_B archives and validate them after clean extraction."""
from pathlib import Path
import hashlib, json, os, shutil, subprocess, sys, tempfile, zipfile

ROOT=Path(__file__).resolve().parents[2]
OUT=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else ROOT.parents[3]/'deliverables/FREEZE_B_0.15.1'
OUT.mkdir(parents=True,exist_ok=True)
NODE=shutil.which('node')
if not NODE: raise SystemExit('node not found in PATH')
PY=sys.executable

def run(cmd,cwd,log=None):
    p=subprocess.run(cmd,cwd=cwd,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
    if log: Path(log).write_text(p.stdout)
    if p.returncode: raise RuntimeError(f'{cmd} failed ({p.returncode})\n{p.stdout[-4000:]}')
    return p.stdout
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def add(z,p,arc):
    info=zipfile.ZipInfo(arc,(2026,9,19,12,0,0));info.compress_type=zipfile.ZIP_DEFLATED
    info.external_attr=(0o755 if os.access(p,os.X_OK) else 0o644)<<16
    z.writestr(info,p.read_bytes())
def write_zip(path,prefix,entries):
    with zipfile.ZipFile(path,'w',compresslevel=9) as z:
        for rel in sorted(entries): add(z,ROOT/rel,f'{prefix}/{rel}')
def zip_check(path):
    with zipfile.ZipFile(path) as z:
        bad=z.testzip(); names=z.namelist()
        if bad:raise RuntimeError(f'CRC failed: {bad}')
        if len(names)!=len(set(names)):raise RuntimeError('duplicate ZIP member')
        if any(Path(n).is_absolute() or '..' in Path(n).parts for n in names):raise RuntimeError('unsafe ZIP member')
        return len(names)

run([PY,'scripts/freeze-b/generate-manifests.py'],ROOT)
run([NODE,'scripts/verify-content-freeze.mjs'],ROOT)
release=json.loads((ROOT/'release-manifest.json').read_text())
freeze=json.loads((ROOT/'handoff/CONTENT_FREEZE.json').read_text())
full_entries=[x['path'] for x in release['files']]+['release-manifest.json']
content_entries=[x['path'] for x in freeze['files']]+[
    'handoff/CONTENT_FREEZE.json','docs/freeze-b/CHANGED_FILES.json','release-manifest.json']
full=OUT/'go-club-FREEZE-B-0.15.1-full.zip'
content=OUT/'go-club-FREEZE-B-content-20260919-01.zip'
write_zip(full,'go-club',full_entries)
write_zip(content,'go-club-content-freeze-b',content_entries)

integrity={'taskId':'FREEZE_B','resultVersion':'0.15.1','freezeId':freeze['freezeId'],
           'rulesetId':'GO-CLUB-AREA-1','schemaVersion':1,'archives':[],'freshExtractionChecks':[]}
for archive,prefix in [(full,'go-club'),(content,'go-club-content-freeze-b')]:
    count=zip_check(archive)
    integrity['archives'].append({'file':archive.name,'sha256':sha(archive),'bytes':archive.stat().st_size,
                                  'members':count,'crc':'passed','nodeModulesIncluded':False})
    temp=Path(tempfile.mkdtemp(prefix='freeze-b-archive-'))
    with zipfile.ZipFile(archive) as z:z.extractall(temp)
    extracted=temp/prefix
    log=OUT/(archive.stem+'-verify.log')
    result=run([NODE,'scripts/verify-content-freeze.mjs'],extracted,log)
    integrity['freshExtractionChecks'].append({'archive':archive.name,'command':'node scripts/verify-content-freeze.mjs',
                                              'status':'passed','log':log.name,'lastLine':result.strip().splitlines()[-1]})
    if archive==full:
        deps=(ROOT/'node_modules').resolve();(extracted/'node_modules').symlink_to(deps,target_is_directory=True)
        commands=[
          [NODE,'scripts/generate-types.mjs','--check'],
          [NODE,'--import','tsx','scripts/validate-content.ts'],
          [NODE,'--import','tsx','content/tools/validate.mjs'],
          [NODE,'content/tools/test-grade.mjs'],
          [str(extracted/'node_modules/.bin/vitest'),'run','--reporter=dot'],
          [str(extracted/'node_modules/.bin/tsc'),'--noEmit','--pretty','false'],
          [str(extracted/'node_modules/.bin/vite'),'build'],
        ]
        combined=[]
        for cmd in commands: combined.append('$ '+' '.join(cmd)+'\n'+run(cmd,extracted))
        freshlog=OUT/'go-club-FREEZE-B-0.15.1-full-fresh-check.log';freshlog.write_text('\n'.join(combined))
        integrity['freshExtractionChecks'].append({'archive':archive.name,
          'commands':['node scripts/generate-types.mjs --check','node --import tsx scripts/validate-content.ts',
                      'node --import tsx content/tools/validate.mjs','node content/tools/test-grade.mjs',
                      'vitest run --reporter=dot','tsc --noEmit --pretty false','vite build'],
          'dependencyMode':'reused unchanged T15 locked dependencies through a temporary symlink; not included in archive',
          'status':'passed','log':freshlog.name})

(OUT/'archive-integrity.json').write_text(json.dumps(integrity,ensure_ascii=False,indent=2)+'\n')
(OUT/'SHA256SUMS.txt').write_text(''.join(f'{x["sha256"]}  {x["file"]}\n' for x in integrity['archives']))
shutil.copy2(ROOT/'handoff/FREEZE_B.md',OUT/'FREEZE_B.md')
shutil.copy2(ROOT/'handoff/CONTENT_FREEZE.json',OUT/'CONTENT_FREEZE.json')
shutil.copy2(ROOT/'docs/freeze-b/CHANGED_FILES.json',OUT/'CHANGED_FILES.json')
print(json.dumps(integrity,ensure_ascii=False,indent=2))
