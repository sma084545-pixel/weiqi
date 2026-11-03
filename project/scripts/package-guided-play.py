"""Seal the real verified Guided Play increment plus all previous source/materials."""
from pathlib import Path
import argparse,json,hashlib,zipfile,os,shutil
p=argparse.ArgumentParser();p.add_argument('--base',required=True);p.add_argument('--output',required=True);p.add_argument('--commit',required=True);p.add_argument('--runtime-commit',required=True);a=p.parse_args()
r=Path(__file__).resolve().parents[1];o=Path(a.output).resolve();base=Path(a.base).resolve();sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(base)=='019375d7ede76d107a5d535f12bf84d84ad9c1c759923e88edad83bdd8f76bf7'
assert json.loads((r/'package.json').read_text())['version']=='0.26.2'
e=r/'docs/guided-play/checks';read=lambda n:json.loads((e/n).read_text())
for name in ['preservation.json','browser-local.json','real-katago-local.json','browser-public.json','real-katago-public.json','cache-upgrade.json','local-capacity.json']:assert read(name)['status']=='passed',name
assert '594 passed (594)' in (e/'full-check.log').read_text();assert '53 passed (53)' in (e/'guided-unit.log').read_text()
for name in ['browser-local.json','real-katago-local.json','browser-public.json','real-katago-public.json']:assert read(name).get('programVersion')==json.loads((r/'package.json').read_text())['version'],('stale evidence',name)
reg=(e/'browser-regression.log').read_text();assert '176 passed' in reg and '22 passed' in reg
version=json.loads((r/'dist/version.json').read_text());assert version['programVersion']=='0.26.2' and version['katagoAnalysisConfigured'] and version['katagoExtremeConfigured'] and version['onlineServerConfigured']
identity={'schemaVersion':1,'id':'GUIDED-PLAY-RELEASE','revision':1,'rulesetId':'GO-CLUB-AREA-1','taskId':'GUIDED_PLAY','baseVersion':'0.25.2-pages.1','baseArchiveSha256':sha(base),'resultVersion':'0.26.2-pages.1','programVersion':'0.26.2','status':'complete-with-documented-limits','githubCommit':a.commit,'runtimeCommit':a.runtime_commit}
excluded={'node_modules','.git','__pycache__','delivery','font-cache','runtime-data','.pnpm-store','.playwright-cli','.auth'};self_files={'RELEASE_MANIFEST.json','release-manifest.json','SHA256SUMS.txt'}
def files():
    out=[]
    for folder,dirs,names in os.walk(r):
        dirs[:]=[d for d in dirs if d not in excluded and not d.startswith('lo-') and not(Path(folder)==r and d=='output')]
        for n in names:
            if n in {'.DS_Store','tsconfig.tsbuildinfo','.env'} or n.startswith('.env.') or n.endswith(('.pem','.key','.p12','.bin','.bin.gz')):continue
            path=Path(folder)/n
            if path.is_file():out.append(path)
    return sorted(out)
with zipfile.ZipFile(base) as z:previous={n[8:]:hashlib.sha256(z.read(n)).hexdigest() for n in z.namelist() if n.startswith('go-club/') and not n.endswith('/')}
changes=[]
for path in files():
    rel=str(path.relative_to(r))
    if rel.startswith(('dist/','dist-engine/','dist-server/','dist-analysis/')) or rel in self_files or rel=='docs/guided-play/CHANGED_FILES.json':continue
    h=sha(path)
    if previous.get(rel)!=h:changes.append({'path':rel,'change':'added' if rel not in previous else 'modified','baseSha256':previous.get(rel),'sha256':h})
(r/'docs/guided-play/CHANGED_FILES.json').write_text(json.dumps({**identity,'id':'GUIDED-PLAY-CHANGES','files':changes},ensure_ascii=False,indent=2)+'\n')
entries=[{'path':str(x.relative_to(r)),'bytes':x.stat().st_size,'sha256':sha(x)} for x in files() if str(x.relative_to(r)) not in self_files]
manifest={**identity,'siteUrl':'https://sma084545-pixel.github.io/weiqi/','guidedPlayRoute':'#/play/guided','formalPuzzles':30,'endgames':6,'advancedScenes':37,'microLessonPrimarySlides':25,'protectedFiles':read('preservation.json')['verifiedProtectedFiles'],'files':entries,'excludedFromSelfHash':sorted(self_files),'fileCount':len(entries)+3,'humanReviewed':None}
for n in ['RELEASE_MANIFEST.json','release-manifest.json']:(r/n).write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(r/'SHA256SUMS.txt').write_text(''.join(x['sha256']+'  '+x['path']+'\n' for x in entries)+''.join(sha(r/n)+'  '+n+'\n' for n in ['RELEASE_MANIFEST.json','release-manifest.json']))
o.mkdir(parents=True,exist_ok=True);full=o/'go-club-0.26.2-pages.1-full.zip';app=o/'go-club-0.26.2-pages.1-app.zip';assert not full.exists() and not app.exists(),'Never overwrite sealed archives'
with zipfile.ZipFile(full,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for x in files():z.write(x,'go-club/'+str(x.relative_to(r)))
with zipfile.ZipFile(full) as z:assert z.testzip() is None and len(z.namelist())==manifest['fileCount'] and not any('/node_modules/' in n or '/runtime-data/' in n for n in z.namelist())
app_files=[]
for folder in ['dist','dist-server']:
    app_files.extend(x for x in (r/folder).rglob('*') if x.is_file())
app_files.append(r/'启动联机对弈.command')
for folder in ['docs/guided-play','docs/ai-play','docs/extreme-ai','analysis-engine/licenses']:
    app_files.extend(x for x in (r/folder).rglob('*') if x.is_file() and x.suffix in {'.md','.txt'} and '/checks/' not in str(x) and '/rejected-' not in str(x))
app_entries=[{'path':str(x.relative_to(r)),'bytes':x.stat().st_size,'sha256':sha(x)} for x in sorted(app_files)]
readme='# 围棋社0.26.2 · 辅助下棋\n\n解压后有兼容Node22/24/26即可运行 node dist-server/server.mjs ，打开 http://127.0.0.1:4190/#/play/guided 。不需要node_modules；macOS也可双击启动联机对弈.command。\n\n正式网站：https://sma084545-pixel.github.io/weiqi/#/play/guided 。默认本地教学机器人；可选真实KataGo需要联网。完整原对弈和课程继续保留。先保存或备份再通过更新按钮升级，勿清站点数据。使用与边界见docs/guided-play/。\n'
app_entries.append({'path':'README.md','bytes':len(readme.encode()),'sha256':hashlib.sha256(readme.encode()).hexdigest()})
with zipfile.ZipFile(app,'w',zipfile.ZIP_DEFLATED) as z:
    for x in sorted(app_files):z.write(x,'go-club-app/'+str(x.relative_to(r)))
    z.writestr('go-club-app/README.md',readme);z.writestr('go-club-app/APP_MANIFEST.json',json.dumps({**identity,'id':'GUIDED-PLAY-APP','files':app_entries},ensure_ascii=False,indent=2)+'\n')
with zipfile.ZipFile(app) as z:assert z.testzip() is None and len(z.namelist())==len(set(z.namelist()))
result={**identity,'archives':[{'path':x.name,'bytes':x.stat().st_size,'sha256':sha(x)} for x in [full,app]],'fullFileCount':manifest['fileCount']}
(o/'PACKAGE_INFO.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');(o/'SHA256SUMS.txt').write_text(''.join(x['sha256']+'  '+x['path']+'\n' for x in result['archives']))
for rel,name in [('handoff/GUIDED_PLAY.md','GUIDED_PLAY_HANDOFF.md'),('docs/guided-play/ACCEPTANCE.md','ACCEPTANCE.md'),('docs/guided-play/USER_GUIDE.md','USER_GUIDE.md'),('docs/guided-play/KNOWN_ISSUES.md','KNOWN_ISSUES.md'),('docs/guided-play/CHANGED_FILES.json','CHANGE_MANIFEST.json')]:shutil.copy2(r/rel,o/name)
print(json.dumps(result,ensure_ascii=False))
