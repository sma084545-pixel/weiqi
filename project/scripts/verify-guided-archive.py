"""Fresh extraction: CRC, every payload digest, all inherited content, clean install/check/build."""
from pathlib import Path
import argparse,hashlib,json,os,stat,subprocess,time,zipfile
p=argparse.ArgumentParser();p.add_argument('--archive',required=True);p.add_argument('--base',required=True);p.add_argument('--output',required=True);a=p.parse_args()
archive=Path(a.archive).resolve();o=Path(a.output).resolve();assert not o.exists();o.mkdir(parents=True);started=time.monotonic()
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None and len(z.namelist())==len(set(z.namelist()))
    for n in z.namelist():assert (o/n).resolve().is_relative_to(o) and n.startswith('go-club/')
    z.extractall(o)
    for i in z.infolist():
        path=o/i.filename;mode=i.external_attr>>16
        if path.is_file() and mode:os.chmod(path,stat.S_IMODE(mode))
r=o/'go-club';m=json.loads((r/'RELEASE_MANIFEST.json').read_text());assert m['taskId']=='GUIDED_PLAY' and m['schemaVersion']==1
assert not (r/'node_modules').exists() and not (r/'runtime-data').exists()
for entry in m['files']:
    path=r/entry['path'];assert path.stat().st_size==entry['bytes'] and hashlib.sha256(path.read_bytes()).hexdigest()==entry['sha256'],entry['path']
for path in ['src/features/guided-play/GuidedPlay.tsx','schemas/guided-session.schema.json','handoff/GUIDED_PLAY.md','dist/version.json','dist-server/server.mjs','materials/facilitator-kit','content/t09/bundle.json']:assert (r/path).exists(),path
assert len(list((r/'content/puzzles').glob('*.json')))==30 and len(list((r/'content/endgames').glob('END-*.json')))==6
commands=[]
for name,command in [('preservation',['python3','scripts/verify-guided-preservation.py','--base',str(Path(a.base).resolve())]),('install',['corepack','pnpm','install','--frozen-lockfile','--prod=false']),('check',['corepack','pnpm','check']),('analysis-build',['corepack','pnpm','build:analysis']),('pages-build',['corepack','pnpm','build:pages'])]:
    log=o/(name+'.log')
    with log.open('w') as output:result=subprocess.run(command,cwd=r,stdout=output,stderr=subprocess.STDOUT)
    commands.append({'command':command,'exitCode':result.returncode,'log':log.name});assert result.returncode==0,(name,log)
report={'schemaVersion':1,'id':'GUIDED-FRESH-ARCHIVE-VERIFY','revision':1,'rulesetId':'GO-CLUB-AREA-1','status':'passed','archive':archive.name,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'verifiedPayloadFiles':len(m['files']),'formalPuzzles':30,'endgames':6,'commands':commands,'elapsedSeconds':round(time.monotonic()-started,2),'humanReviewed':None}
(o/'ARCHIVE_VERIFY.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False))
