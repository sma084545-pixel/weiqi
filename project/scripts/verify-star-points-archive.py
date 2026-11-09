"""Re-extract final archives, verify every payload, then build from clean source."""
from pathlib import Path
import argparse,hashlib,json,os,subprocess,time,zipfile
p=argparse.ArgumentParser();p.add_argument('--release',required=True);p.add_argument('--destination',required=True);a=p.parse_args()
release=Path(a.release).resolve();dest=Path(a.destination).resolve();assert not dest.exists(),'Use an empty verification destination'
dest.mkdir(parents=True);info=json.loads((release/'PACKAGE_INFO.json').read_text());assert info['programVersion']=='0.27.2'
sha=lambda b:hashlib.sha256(b).hexdigest();archives=[]
for index,entry in enumerate(info['archives']):
    path=release/entry['path'];assert path.stat().st_size==entry['bytes'];assert sha(path.read_bytes())==entry['sha256']
    target=dest/('source' if index==0 else 'app');target.mkdir()
    with zipfile.ZipFile(path) as z:
        assert z.testzip() is None and not any('/node_modules/' in n or '/runtime-data/' in n for n in z.namelist())
        z.extractall(target)
        for item in z.infolist():
            f=target/item.filename;mode=item.external_attr>>16
            if f.is_file() and mode:f.chmod(mode&0o777)
    folder=target/('go-club' if index==0 else 'go-club-app');manifest=json.loads((folder/('RELEASE_MANIFEST.json' if index==0 else 'APP_MANIFEST.json')).read_text())
    assert manifest['programVersion']=='0.27.2'
    for item in manifest['files']:
        f=folder/item['path'];assert f.is_file() and f.stat().st_size==item['bytes'] and sha(f.read_bytes())==item['sha256'],item['path']
    archives.append({'path':entry['path'],'sha256':entry['sha256'],'verifiedPayloadFiles':len(manifest['files']),'crc':'passed'})
source=dest/'source/go-club';puzzles=list((source/'content/puzzles').glob('*.json'));endgames=list((source/'content/endgames').glob('END-*.json'));scenes=json.loads((source/'content/advanced-courses/bundle.json').read_text())['scenes'];assert (len(puzzles),len(endgames),len(scenes))==(30,6,37)
assert json.loads((source/'package.json').read_text())['version']=='0.27.2'
out=release/'verification';out.mkdir(exist_ok=True);commands=[];env=dict(os.environ);env['PATH']='/Users/maxiao/.local/share/node-v22.23.3-darwin-arm64/bin:'+env['PATH'];start=time.monotonic()
for name,args in [('install',['corepack','pnpm','install','--frozen-lockfile','--prod=false']),('engine-build',['corepack','pnpm','build:engine']),('content',['corepack','pnpm','validate:content']),('advanced',['corepack','pnpm','validate:advanced']),('pages-build',['corepack','pnpm','build:pages'])]:
    log=out/(name+'.log')
    with log.open('w') as f:result=subprocess.run(args,cwd=source,env=env,stdout=f,stderr=subprocess.STDOUT)
    commands.append({'command':args,'exitCode':result.returncode,'log':str(log.relative_to(release))});assert result.returncode==0,log
report={'schemaVersion':1,'id':'BOARD-STARS-ARCHIVE-VERIFY','revision':1,'rulesetId':'GO-CLUB-AREA-1','status':'passed','programVersion':'0.27.2','archives':archives,'formalPuzzles':30,'endgames':6,'advancedScenes':37,'commands':commands,'elapsedSeconds':round(time.monotonic()-start,2),'note':'Fresh source install/build; all archive payload hashes. Prior current-version browser and unit evidence kept separately. No physical manufacturing or teaching claim.'}
(out/'ARCHIVE_VERIFY.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False))
