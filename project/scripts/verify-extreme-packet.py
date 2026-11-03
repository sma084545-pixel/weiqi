"""Re-extract and verify a sealed packet, then install/check/build in the clean copy."""
from pathlib import Path
import argparse,hashlib,json,zipfile,os,stat,subprocess,time
p=argparse.ArgumentParser();p.add_argument('--archive',required=True);p.add_argument('--base-archive',required=True);p.add_argument('--output',required=True);p.add_argument('--build',action='store_true');a=p.parse_args()
archive=Path(a.archive).resolve();out=Path(a.output).resolve()
assert not out.exists(),'Choose a new verification directory'
out.mkdir(parents=True);started=time.monotonic()
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 assert len(z.namelist())==len(set(z.namelist()))
 for n in z.namelist():
  target=(out/n).resolve();assert target.is_relative_to(out) and n.startswith('go-club/')
 z.extractall(out)
 for info in z.infolist():
  path=out/info.filename;mode=info.external_attr>>16
  if path.is_file() and mode:os.chmod(path,stat.S_IMODE(mode))
r=out/'go-club';m=json.loads((r/'RELEASE_MANIFEST.json').read_text())
assert m['taskId']=='EXTREME_AI' and m['schemaVersion']==1 and m['rulesetId']=='GO-CLUB-AREA-1'
assert not (r/'node_modules').exists() and not (r/'runtime-data').exists()
protected=0
with zipfile.ZipFile(a.base_archive) as base:
 for name in base.namelist():
  if not name.startswith('go-club/') or name.endswith('/'):continue
  rel=name[8:]
  if rel.startswith(('content/','materials/','src/core/rules/','docs/t24/','docs/advanced-courses/')) or rel in {'pnpm-lock.yaml','schemas/content.schema.json','src/components/Board.tsx','src/components/Board.css','src/components/board.types.ts'}:
   path=r/rel;assert path.is_file(),('Missing baseline deliverable',rel)
   assert hashlib.sha256(path.read_bytes()).digest()==hashlib.sha256(base.read(name)).digest(),('Changed protected deliverable',rel)
   protected+=1
assert protected>=1595
for entry in m['files']:
 p=r/entry['path'];assert p.stat().st_size==entry['bytes'];assert hashlib.sha256(p.read_bytes()).hexdigest()==entry['sha256'],entry['path']
puzzles=[json.loads(x.read_text()) for x in (r/'content/puzzles').glob('*.json') if x.stem.startswith(('LIB-','CAP-','CON-','LIFE-','AREA-','DISC-'))]
ends=[json.loads(x.read_text()) for x in (r/'content/endgames').glob('END-*.json')]
assert len(puzzles)==30 and len(ends)==6
assert len({x['id'] for x in puzzles+ends})==36
assert all(x['revision']==1 and x['rulesetId']=='GO-CLUB-AREA-1' for x in puzzles+ends)
for file in ['src/features/ai-game/AiGame.tsx','server/analysis/model-integrity.ts','analysis-engine/extreme-manifest.json','analysis-engine/Dockerfile.extreme','analysis-engine/licenses/EXTREME-MODEL-LICENSE.txt','deploy/katago-extreme.render.yaml','handoff/EXTREME_AI.md','dist/version.json','dist-server/server.mjs','docs/extreme-ai/ACCEPTANCE.md']:
 assert (r/file).is_file(),file
commands=[]
if a.build:
 for name,command in [('install',['corepack','pnpm','install','--frozen-lockfile','--prod=false']),('check',['corepack','pnpm','check']),('analysis-build',['corepack','pnpm','build:analysis']),('pages-build',['corepack','pnpm','build:pages'])]:
  log=out/(name+'.log')
  with log.open('w') as output:result=subprocess.run(command,cwd=r,stdout=output,stderr=subprocess.STDOUT)
  commands.append({'command':command,'exitCode':result.returncode,'log':log.name});assert result.returncode==0,(name,log)
report={'schemaVersion':1,'id':'EXTREME-ARCHIVE-REEXTRACT','revision':1,'rulesetId':'GO-CLUB-AREA-1','status':'passed','packetStatus':m['status'],'archive':archive.name,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'bytes':archive.stat().st_size,'verifiedFiles':len(m['files']),'protectedBaselineFilesVerified':protected,'formalPuzzles':len(puzzles),'endgames':len(ends),'freshBuild':a.build,'commands':commands,'elapsedSeconds':round(time.monotonic()-started,2),'humanReviewed':None}
(out/'ARCHIVE_VERIFY.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False))
