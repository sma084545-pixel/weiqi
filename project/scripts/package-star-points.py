"""Package the tested star-point increment without changing an earlier sealed release."""
from pathlib import Path
import argparse,hashlib,json,os,shutil,zipfile
p=argparse.ArgumentParser();p.add_argument('--base',required=True);p.add_argument('--output',required=True);p.add_argument('--commit',required=True);a=p.parse_args()
r=Path(__file__).resolve().parents[1];o=Path(a.output).resolve();base=Path(a.base).resolve();sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(base)=='1a9d48034e1ebf6000c7e52fb448052155d97a8aae8af0f27def305c43368328'
version=json.loads((r/'package.json').read_text())['version'];assert version=='0.27.2'
checks=r/'docs/star-points/checks';read=lambda p:json.loads(p.read_text())
for name in ['preservation.json','browser-local.json','browser-public.json','exports.json','pdf-render.json']:assert read(checks/name)['status']=='passed',name
for name in ['browser-local.json','browser-public.json']:assert read(checks/name)['programVersion']==version,name
assert '626 passed (626)' in (checks/'full-check.log').read_text()
reg=(checks/'browser-regression.log').read_text();assert '176 passed' in reg and '22 passed' in reg
public=read(r/'dist/version.json');assert public['programVersion']==version and all(public[x] for x in ['katagoAnalysisConfigured','katagoExtremeConfigured','onlineServerConfigured'])
identity={'schemaVersion':1,'id':'BOARD-STARS-RELEASE','revision':1,'rulesetId':'GO-CLUB-AREA-1','taskId':'BOARD_STARS','baseVersion':'0.27.1-pages.1','baseArchiveSha256':sha(base),'resultVersion':version+'-pages.1','programVersion':version,'status':'complete-with-documented-limits','githubCommit':a.commit}
excluded={'node_modules','.git','__pycache__','delivery','font-cache','runtime-data','.pnpm-store','.playwright-cli','.auth'};self_files={'RELEASE_MANIFEST.json','release-manifest.json','SHA256SUMS.txt'}
def files():
    result=[]
    for folder,dirs,names in os.walk(r):
        dirs[:]=[d for d in dirs if d not in excluded and not d.startswith('lo-') and not(Path(folder)==r and d=='output')]
        for n in names:
            if n in {'.DS_Store','tsconfig.tsbuildinfo','.env'} or n.startswith('.env.') or n.endswith(('.pem','.key','.p12','.bin','.bin.gz')):continue
            path=Path(folder)/n
            if path.is_file():result.append(path)
    return sorted(result)
with zipfile.ZipFile(base) as z:previous={n[8:]:hashlib.sha256(z.read(n)).hexdigest() for n in z.namelist() if n.startswith('go-club/') and not n.endswith('/')}
changed=[]
for path in files():
    rel=str(path.relative_to(r))
    if rel in self_files or rel.startswith(('dist/','dist-engine/','dist-server/','dist-analysis/')) or rel=='docs/star-points/CHANGED_FILES.json':continue
    h=sha(path)
    if previous.get(rel)!=h:changed.append({'path':rel,'change':'added' if rel not in previous else 'modified','baseSha256':previous.get(rel),'sha256':h})
(r/'docs/star-points/CHANGED_FILES.json').write_text(json.dumps({**identity,'id':'BOARD-STARS-CHANGES','files':changed},ensure_ascii=False,indent=2)+'\n')
entries=[{'path':str(x.relative_to(r)),'bytes':x.stat().st_size,'sha256':sha(x)} for x in files() if str(x.relative_to(r)) not in self_files]
manifest={**identity,'siteUrl':'https://sma084545-pixel.github.io/weiqi/','formalPuzzles':30,'endgames':6,'advancedScenes':37,'microLessonPrimarySlides':25,'boardStarPoints':{'5':1,'9':5,'13':5,'19':9},'protectedFiles':read(checks/'preservation.json')['verifiedProtectedFiles'],'files':entries,'excludedFromSelfHash':sorted(self_files),'fileCount':len(entries)+3,'humanReviewed':None}
for n in ['RELEASE_MANIFEST.json','release-manifest.json']:(r/n).write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(r/'SHA256SUMS.txt').write_text(''.join(x['sha256']+'  '+x['path']+'\n' for x in entries)+''.join(sha(r/n)+'  '+n+'\n' for n in ['RELEASE_MANIFEST.json','release-manifest.json']))
o.mkdir(parents=True,exist_ok=True);full=o/f'go-club-{version}-pages.1-full.zip';app=o/f'go-club-{version}-pages.1-app.zip';assert not full.exists() and not app.exists(),'Never overwrite sealed archives'
with zipfile.ZipFile(full,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for x in files():z.write(x,'go-club/'+str(x.relative_to(r)))
with zipfile.ZipFile(full) as z:assert z.testzip() is None and len(z.namelist())==manifest['fileCount']
app_files=[x for f in ['dist','dist-server'] for x in (r/f).rglob('*') if x.is_file()]+[r/'启动联机对弈.command']
app_files+=[x for f in ['docs/star-points','docs/game-review','docs/guided-play','docs/ai-play','docs/extreme-ai','analysis-engine/licenses'] for x in (r/f).rglob('*') if x.is_file() and x.suffix in {'.md','.txt'} and '/checks/' not in str(x) and '/rejected-' not in str(x)]
readme='# 围棋社0.27.2 · 所有棋盘显示星位\n\n解压后运行 node dist-server/server.mjs ，打开 http://127.0.0.1:4190/ 。需兼容Node，无需node_modules。macOS可使用启动联机对弈.command。\n\n正式网站：https://sma084545-pixel.github.io/weiqi/ 。先保存，再应用网页更新；无需清站点数据。19路九星、9/13路五点、5路中央定位点。星位不影响落子或存档。详细说明见docs/star-points/。\n'
app_entries=[{'path':str(x.relative_to(r)),'bytes':x.stat().st_size,'sha256':sha(x)} for x in sorted(app_files)]+[{'path':'README.md','bytes':len(readme.encode()),'sha256':hashlib.sha256(readme.encode()).hexdigest()}]
with zipfile.ZipFile(app,'w',zipfile.ZIP_DEFLATED) as z:
    for x in sorted(app_files):z.write(x,'go-club-app/'+str(x.relative_to(r)))
    z.writestr('go-club-app/README.md',readme);z.writestr('go-club-app/APP_MANIFEST.json',json.dumps({**identity,'id':'BOARD-STARS-APP','files':app_entries},ensure_ascii=False,indent=2)+'\n')
with zipfile.ZipFile(app) as z:assert z.testzip() is None
result={**identity,'archives':[{'path':x.name,'bytes':x.stat().st_size,'sha256':sha(x)} for x in [full,app]],'fullFileCount':manifest['fileCount']}
(o/'PACKAGE_INFO.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');(o/'SHA256SUMS.txt').write_text(''.join(x['sha256']+'  '+x['path']+'\n' for x in result['archives']))
for rel,name in [('handoff/BOARD_STARS.md','BOARD_STARS_HANDOFF.md'),('docs/star-points/ACCEPTANCE.md','ACCEPTANCE.md'),('docs/star-points/IMPLEMENTATION.md','IMPLEMENTATION.md'),('docs/star-points/CHANGED_FILES.json','CHANGE_MANIFEST.json')]:shutil.copy2(r/rel,o/name)
print(json.dumps(result,ensure_ascii=False))
