"""Seal an explicitly pending Free deployment packet or a production-verified extreme release."""
from pathlib import Path
import argparse,hashlib,json,os,zipfile,shutil
R=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--base-archive',required=True);p.add_argument('--output',required=True);p.add_argument('--stage',action='store_true');p.add_argument('--stage-revision',type=int,default=1);a=p.parse_args()
assert a.stage_revision>=1
B=Path(a.base_archive).resolve();O=Path(a.output).resolve()
assert R!=O and R not in O.parents
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(B)=='de5a374a0dbf6b1134c5bd16b795b472913e94c17ce142f75548d2c41c5177a0','Use the verified complete0.24.2 baseline'
assert json.loads((R/'package.json').read_text())['version']=='0.25.2'
E=R/'docs/extreme-ai/checks'
read=lambda n:json.loads((E/n).read_text())
log=(E/'check-final.log').read_text()
assert '541 passed (541)' in log and 'ELIFECYCLE' not in log and 'error TS' not in log
for n in ['preservation.json','tf2-native-real-http.json','tf2-browser-desktop.json','tf2-browser-mobile.json','tf2-browser-unconfigured.json']:
 assert read(n)['status']=='passed',n
docker=read('docker-free/extreme-free-real-http.json')
model=json.loads((R/'analysis-engine/extreme-manifest.json').read_text())
assert docker['status']=='passed' and docker['healthAfter']['model']==model['model']['name']
assert docker['healthAfter']['ready'] and docker['healthAfter']['active']==0 and docker['healthAfter']['queued']==0
assert int((E/'docker-free/memory-peak-bytes.txt').read_text())<=512*1024**2
assert 'oom_kill 0' in (E/'docker-free/memory-events.txt').read_text()
limits=read('docker-free/resource-limits.json')
assert limits['Memory']==512*1024**2 and limits['MemorySwap']==512*1024**2 and limits['NanoCpus']==100000000
assert 'plan: free' in (R/'deploy/katago-extreme.render.yaml').read_text()
if not a.stage:
 for n in ['public-real-browser.json','public-real-mobile.json','public-upgrade-recovery.json','all-clients-real.json','public-publication.json']:
  assert read(n)['status']=='passed',n
 ready=read('public-ready.json');assert ready['ready'] and ready['model']==model['model']['name'] and ready['aiDifficulties']==['extreme']
 assert json.loads((R/'dist/version.json').read_text())['katagoExtremeConfigured']
V='0.25.2-pages.1'
packet='0.25.2-predeploy-free.'+str(a.stage_revision) if a.stage else V
identity={'schemaVersion':1,'id':'EXTREME-AI-RELEASE','revision':1,'rulesetId':'GO-CLUB-AREA-1','taskId':'EXTREME_AI','baseVersion':'AI_PLAY 0.24.2-pages.1','baseArchiveSha256':sha(B),'resultVersion':packet,'programVersion':'0.25.2','status':'awaiting-free-render-creation-and-public-e2e' if a.stage else 'complete-with-documented-limits'}
O.mkdir(parents=True,exist_ok=True)
full=O/('go-club-'+packet+'-full.zip');app=O/('go-club-'+packet+'-app.zip')
assert not full.exists() and not app.exists(),'Never overwrite a sealed packet'
excluded={'node_modules','.git','__pycache__','delivery','font-cache','runtime-data','.pnpm-store','.playwright-cli','.auth'}
self_files={'RELEASE_MANIFEST.json','release-manifest.json','SHA256SUMS.txt'}
def files():
 result=[]
 for folder,dirs,names in os.walk(R):
  dirs[:]=[d for d in dirs if d not in excluded and not d.startswith('lo-') and not(Path(folder)==R and d=='output')]
  for n in names:
   if n in {'.DS_Store','tsconfig.tsbuildinfo','.env'} or n.startswith('.env.') or n.endswith(('.pem','.key','.p12','.bin','.bin.gz')):continue
   path=Path(folder)/n
   if path.is_file():result.append(path)
 return sorted(result)
scope=('src/','server/','tests/','scripts/','schemas/','content/','deploy/','docs/extreme-ai/','analysis-engine/','handoff/','.github/')
important={'README.md','CHANGELOG.md','SOURCES.md','package.json','pnpm-lock.yaml','docs/INTERFACES.md'}
changes=[]
with zipfile.ZipFile(B) as z:
 previous={n[8:]:hashlib.sha256(z.read(n)).hexdigest() for n in z.namelist() if n.startswith('go-club/') and not n.endswith('/')}
 for x in files():
  name=str(x.relative_to(R))
  if name=='docs/extreme-ai/CHANGED_FILES.json' or not(name.startswith(scope) or name in important):continue
  h=sha(x)
  if previous.get(name)!=h:changes.append({'path':name,'change':'added' if name not in previous else 'modified','baseSha256':previous.get(name),'sha256':h})
(R/'docs/extreme-ai/CHANGED_FILES.json').write_text(json.dumps({**identity,'id':'EXTREME-AI-CHANGES','files':changes},ensure_ascii=False,indent=2)+'\n')
entries=[{'path':str(x.relative_to(R)),'bytes':x.stat().st_size,'sha256':sha(x)} for x in files() if str(x.relative_to(R)) not in self_files]
manifest={**identity,'siteUrl':'https://sma084545-pixel.github.io/weiqi/','aiRoute':'#/play/ai','model':model['model'],'formalPuzzles':30,'terminalFixtures':6,'advancedScenes':37,'microLessonPrimarySlides':25,'fileCount':len(entries)+3,'excludedFromSelfHash':sorted(self_files),'files':entries,'humanReviewed':None}
for n in ['RELEASE_MANIFEST.json','release-manifest.json']:(R/n).write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(R/'SHA256SUMS.txt').write_text(''.join(x['sha256']+'  '+x['path']+'\n' for x in entries)+''.join(sha(R/n)+'  '+n+'\n' for n in ['RELEASE_MANIFEST.json','release-manifest.json']))
with zipfile.ZipFile(full,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for x in files():z.write(x,'go-club/'+str(x.relative_to(R)))
with zipfile.ZipFile(full) as z:
 assert z.testzip() is None and len(z.namelist())==manifest['fileCount']
 assert not any('/node_modules/' in n or '/runtime-data/' in n or '/.playwright-cli/' in n for n in z.namelist())
app_files=[]
for folder in ['dist','dist-server']:
 app_files += [(x,str(x.relative_to(R))) for x in sorted((R/folder).rglob('*')) if x.is_file()]
app_files.append((R/'启动联机对弈.command','启动联机对弈.command'))
for folder in ['docs/extreme-ai','docs/ai-play','docs/katago','analysis-engine/licenses']:
 app_files += [(x,str(x.relative_to(R))) for x in (R/folder).rglob('*') if x.is_file() and x.suffix in ['.md','.txt'] and '/checks/' not in str(x) and '/rejected-' not in str(x)]
notice='Free部署前阶段包：极致尚未启用，原三档可继续使用。' if a.stage else '极致Free服务与原网站已完成实际联调；详见验收报告。'
readme='# 围棋社 AI 对弈0.25.2\n\n'+notice+'\n\n原网站：https://sma084545-pixel.github.io/weiqi/#/play/ai 。保留轻松/标准/挑战，新增独立强模型极致；不对应人类段位。5/9/13/19路、回退/重做、棋局滑动条、导出和赛后同模型复盘沿用原功能。新着法需联网，终局仍人工确认。\n\n已有兼容Node22/24/26时，解压后执行 node dist-server/server.mjs ，访问 http://127.0.0.1:4190/#/play/ai ，或macOS双击启动联机对弈.command。不需node_modules。Ctrl+C停止本机服务；远程KataGo不依赖个人电脑常开。先备份再更新，不清站点数据。仅免费资源，休眠/额度边界见docs/extreme-ai/。\n'
app_files=sorted({n:x for x,n in app_files}.items())
app_entries=[{'path':n,'bytes':x.stat().st_size,'sha256':sha(x)} for n,x in app_files]
app_entries.append({'path':'README.md','bytes':len(readme.encode()),'sha256':hashlib.sha256(readme.encode()).hexdigest()})
with zipfile.ZipFile(app,'w',zipfile.ZIP_DEFLATED) as z:
 for n,x in app_files:z.write(x,'go-club-app/'+n)
 z.writestr('go-club-app/README.md',readme);z.writestr('go-club-app/APP_MANIFEST.json',json.dumps({**identity,'id':'EXTREME-AI-APP','files':app_entries},ensure_ascii=False,indent=2)+'\n')
with zipfile.ZipFile(app) as z:assert z.testzip() is None and len(z.namelist())==len(set(z.namelist()))
result={**identity,'archives':[{'path':x.name,'sha256':sha(x),'bytes':x.stat().st_size} for x in [full,app]],'fullFileCount':manifest['fileCount']}
(O/'PACKAGE_INFO.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
(O/'SHA256SUMS.txt').write_text(''.join(x['sha256']+'  '+x['path']+'\n' for x in result['archives']))
for rel,name in [('handoff/EXTREME_AI.md','EXTREME_AI_HANDOFF.md'),('docs/extreme-ai/ACCEPTANCE.md','ACCEPTANCE.md'),('docs/extreme-ai/DEPLOYMENT.md','DEPLOYMENT.md'),('docs/extreme-ai/CHANGED_FILES.json','CHANGE_MANIFEST.json')]:shutil.copy2(R/rel,O/name)
print(json.dumps(result,ensure_ascii=False))
