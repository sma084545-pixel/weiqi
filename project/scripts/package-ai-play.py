"""Seal either an explicitly pending deployment packet or a fully verified AI release."""
from pathlib import Path
import argparse,hashlib,json,os,zipfile,shutil
R=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--base',required=True);p.add_argument('--output',required=True);p.add_argument('--stage',action='store_true');a=p.parse_args();B=Path(a.base).resolve();O=Path(a.output).resolve()
assert R!=O and R not in O.parents
assert json.loads((R/'package.json').read_text())['version']=='0.24.2'
log=(R/'docs/ai-play/checks/check-final.log').read_text();assert '532 passed (532)' in log and 'error TS' not in log and 'ELIFECYCLE' not in log,'Full check must pass before packaging'
for name in ['browser-journey.json','native-real-browser.json','upgrade-offline.json','preservation.json']:
    assert json.loads((R/'docs/ai-play/checks'/name).read_text())['status']=='passed',name
docker=json.loads((R/'docs/ai-play/checks/docker-real-5ed6920/ai-real-http.json').read_text());assert len(docker['checks'])>=14 and all(x['status']=='passed' for x in docker['checks'])
if not a.stage:
    public=json.loads((R/'docs/ai-play/checks/public-real-browser.json').read_text());assert public['status']=='passed'
    local=json.loads((R/'docs/ai-play/checks/public-local-real-browser.json').read_text());assert local['status']=='passed'
    ready=json.loads((R/'docs/ai-play/checks/public-ready.json').read_text());assert ready.get('appVersion') in ['0.24.1','0.24.2'] and ready['apiVersion']==2 and ready['ready']
    assert json.loads((R/'docs/ai-play/checks/public-publication.json').read_text())['status']=='passed'
V='0.24.2-pages.1';status='awaiting-render-deployment-and-public-e2e' if a.stage else 'complete-digital-scope-with-documented-limits';stem='go-club-0.24.2-predeploy' if a.stage else 'go-club-'+V
O.mkdir(parents=True,exist_ok=True);full=O/(stem+'-full.zip');app=O/(stem+'-app.zip');assert not full.exists() and not app.exists(),'Never overwrite a sealed packet'
identity={'schemaVersion':1,'id':'AI-PLAY-RELEASE','revision':1,'rulesetId':'GO-CLUB-AREA-1','taskId':'AI_PLAY','baseVersion':'0.23.0-pages.1','resultVersion':V,'programVersion':'0.24.2','status':status}
exclude_dirs={'node_modules','.git','__pycache__','delivery','font-cache','runtime-data','.pnpm-store','.playwright-cli','.auth'};self_files={'RELEASE_MANIFEST.json','release-manifest.json','SHA256SUMS.txt'}
def files(root):
    result=[]
    for folder,dirs,names in os.walk(root):
        dirs[:]=[d for d in dirs if d not in exclude_dirs and not d.startswith('lo-')]
        for n in names:
            if n in {'.DS_Store','tsconfig.tsbuildinfo','.env'} or n.startswith('.env.') or n.endswith(('.pem','.key','.p12')):continue
            path=Path(folder)/n
            if path.is_file():result.append(path)
    return sorted(result)
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
scope=('src/','server/','tests/','scripts/','schemas/','content/','deploy/','docs/','handoff/','.github/')
important={'README.md','CHANGELOG.md','SOURCES.md','package.json','pnpm-lock.yaml','playwright.ai-analysis.config.ts'}
previous={str(x.relative_to(B)):sha(x) for x in files(B)}
changes=[]
for x in files(R):
    name=str(x.relative_to(R))
    if name=='docs/ai-play/CHANGED_FILES.json' or not (name.startswith(scope) or name in important):continue
    h=sha(x)
    if previous.get(name)!=h:changes.append({'path':name,'change':'added' if name not in previous else 'modified','baseSha256':previous.get(name),'sha256':h})
(R/'docs/ai-play/CHANGED_FILES.json').write_text(json.dumps({**identity,'id':'AI-PLAY-CHANGES','kind':'ChangeManifest','files':changes},ensure_ascii=False,indent=2)+'\n')
entries=[{'path':str(x.relative_to(R)),'bytes':x.stat().st_size,'sha256':sha(x)} for x in files(R) if str(x.relative_to(R)) not in self_files]
manifest={**identity,'kind':'ProjectRelease','siteUrl':'https://sma084545-pixel.github.io/weiqi/','aiRoute':'#/play/ai','formalPuzzles':30,'terminalFixtures':6,'advancedScenes':37,'microLessonPrimarySlides':25,'fileCount':len(entries)+3,'excludedFromSelfHash':sorted(self_files),'files':entries,'humanReviewed':None}
for n in ['RELEASE_MANIFEST.json','release-manifest.json']:(R/n).write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(R/'SHA256SUMS.txt').write_text(''.join(x['sha256']+'  '+x['path']+'\n' for x in entries)+''.join(sha(R/n)+'  '+n+'\n' for n in ['RELEASE_MANIFEST.json','release-manifest.json']))
with zipfile.ZipFile(full,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for x in files(R):z.write(x,'go-club/'+str(x.relative_to(R)))
with zipfile.ZipFile(full) as z:
    assert z.testzip() is None and len(z.namelist())==manifest['fileCount']
    assert not any('/node_modules/' in n or '/runtime-data/' in n or '/.playwright-cli/' in n for n in z.namelist())
app_files=[]
for folder in ['dist','dist-server']:
    app_files += [(x,str(x.relative_to(R))) for x in sorted((R/folder).rglob('*')) if x.is_file()]
app_files.append((R/'启动联机对弈.command','启动联机对弈.command'))
for folder in ['docs/ai-play','docs/katago','docs/online','docs/t24/third-party','docs/online/third-party','analysis-engine/licenses']:
    app_files += [(x,str(x.relative_to(R))) for x in sorted((R/folder).rglob('*')) if x.is_file() and ('/checks/' not in str(x) and '/third-party/' in str(x) or x.suffix in ['.md','.txt'] and '/checks/' not in str(x))]
notice='这是部署前阶段包，等待已有Render服务更新与正式跨域验收。' if a.stage else '正式网站与已有Render AI服务已按验收记录接通。'
readme=f'''# 围棋社 AI 对弈 · 0.24.2\n\n{notice}\n\n原网站：https://sma084545-pixel.github.io/weiqi/#/play/ai 。三档相对难度，5/9/13/19路、悔棋/重做、滑动回看、独立保存与赛后KataGo复盘。新着法需联网，死子清单仍需人工核对；难度不对应段级位。\n\n本地已有Node22.22.2+或24.15+等兼容版本时，从解压目录运行 `node dist-server/server.mjs`，打开 http://127.0.0.1:4190/#/play/ai 。macOS也可双击启动联机对弈.command。Ctrl+C停止。不需安装node_modules，远端引擎不依赖个人电脑常开。\n\n更新先导出本机备份，再在相同来源应用新版本，不清站点数据。续玩JSON包含难度和对局；SGF主线只作棋谱交接。完整源码/材料/后台Docker在full.zip；使用、限制和回滚见docs/ai-play/。无新付费资源、无公开排名、不上传学习记录或反馈。\n'''
app_files=[(path,name) for name,path in sorted({name:path for path,name in app_files}.items())]
app_entries=[{'path':n,'bytes':x.stat().st_size,'sha256':sha(x)} for x,n in app_files]
app_entries.append({'path':'README.md','bytes':len(readme.encode()),'sha256':hashlib.sha256(readme.encode()).hexdigest()})
with zipfile.ZipFile(app,'w',zipfile.ZIP_DEFLATED) as z:
    for x,n in app_files:z.write(x,'go-club-app/'+n)
    z.writestr('go-club-app/README.md',readme);z.writestr('go-club-app/APP_MANIFEST.json',json.dumps({**identity,'id':'AI-PLAY-APP','files':app_entries},ensure_ascii=False,indent=2)+'\n')
with zipfile.ZipFile(app) as z:assert z.testzip() is None and len(z.namelist())==len(set(z.namelist()))
result={**identity,'id':'AI-PLAY-PACKAGE-INFO','archives':[{'path':x.name,'sha256':sha(x),'bytes':x.stat().st_size} for x in [full,app]],'fullFileCount':manifest['fileCount']}
(O/'PACKAGE_INFO.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');(O/'SHA256SUMS.txt').write_text(''.join(x['sha256']+'  '+x['path']+'\n' for x in result['archives']))
for rel,name in [('handoff/AI_PLAY.md','AI_PLAY_交接.md'),('docs/ai-play/USAGE.md','AI对弈_使用说明.md'),('docs/ai-play/ACCEPTANCE.md','AI对弈_验收报告.md'),('docs/ai-play/CHANGED_FILES.json','CHANGE_MANIFEST.json')]:shutil.copy2(R/rel,O/name)
print(json.dumps(result,ensure_ascii=False))
