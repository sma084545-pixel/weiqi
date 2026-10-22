from pathlib import Path
import json,zipfile,hashlib,subprocess,os
import argparse
parser=argparse.ArgumentParser();parser.add_argument('--release',required=True);parser.add_argument('--extract',required=True);args=parser.parse_args()
D=Path(args.release).resolve();dest=Path(args.extract).resolve();dest.mkdir(parents=True,exist_ok=False)
info=json.loads((D/'PACKAGE_INFO.json').read_text());checks=[]
for archive in info['archives']:
 p=D/archive['path'];assert hashlib.sha256(p.read_bytes()).hexdigest()==archive['sha256'];z=zipfile.ZipFile(p);assert z.testzip() is None
 assert not any('/node_modules/' in name or '/runtime-data/' in name or '/.env' in name for name in z.namelist())
 target=dest/('full' if archive['path'].endswith('-full.zip') else 'app');target.mkdir();z.extractall(target)
 for item in z.infolist():
  if item.external_attr>>16 & 0o111:os.chmod(target/item.filename,(item.external_attr>>16)&0o777)
 checks.append({'archive':p.name,'sha256':archive['sha256'],'bytes':p.stat().st_size,'CRC':'passed','entries':len(z.namelist()),'noInstalledDependencies':True})
full=dest/'full/go-club';app=dest/'app/go-club-app'
for folder,manifest in [(full,'RELEASE_MANIFEST.json'),(app,'APP_MANIFEST.json')]:
 m=json.loads((folder/manifest).read_text());assert m['programVersion']=='0.21.2'
 for item in m['files']:assert hashlib.sha256((folder/item['path']).read_bytes()).hexdigest()==item['sha256'],item['path']
checks.append({'allInternalManifestHashes':'passed'})
bundle=json.loads((full/'content/t09/bundle.json').read_text());items=bundle.get('items',[]);puzzles=[x for x in items if x.get('kind')=='Puzzle'];terminals=[x for x in items if x.get('kind')=='TerminalFixture'];assert len(puzzles)==30 and len(terminals)==6,(len(puzzles),len(terminals),list(bundle));assert len({x['id'] for x in puzzles})==30;assert all(x['revision']==1 for x in puzzles+terminals)
for rel in ['src/features/online-game/RoomChat.tsx','src/features/online-game/BoardDisplayTools.tsx','server/rooms.ts','handoff/ONLINE_FLOATING_PLAY.md','dist/index.html','dist-server/server.mjs','pnpm-lock.yaml']:assert (full/rel).is_file(),rel
checks.append({'formalPuzzles':30,'terminalFixtures':6,'allFormalRevisions':1,'keyFiles':'passed'})
env=dict(os.environ);env['PATH']='/Users/maxiao/.local/share/node-v22.23.3-darwin-arm64/bin:'+env['PATH']
commands=[]
for label,command in [('clean-install',['corepack','pnpm','install','--frozen-lockfile']),('clean-rules-tests',['corepack','pnpm','test']),('clean-pages-build',['corepack','pnpm','build:pages'])]:
 with (D/(label+'.log')).open('w') as log:result=subprocess.run(command,cwd=full,env=env,stdout=log,stderr=subprocess.STDOUT)
 commands.append({'command':' '.join(command),'cwd':str(full),'exitCode':result.returncode,'log':label+'.log'});assert result.returncode==0,label
assert not (app/'node_modules').exists()
report={'schemaVersion':1,'id':'FLOATING-PLAY-ARCHIVE-CHECK','revision':1,'rulesetId':'GO-CLUB-AREA-1','resultVersion':'0.21.2-pages.1','status':'passed','archives':checks,'commands':commands,'appRoot':str(app),'fullRoot':str(full),'bareApp':'pending next real browser check','humanReviewed':None}
(D/'ARCHIVE_CHECK.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False))
