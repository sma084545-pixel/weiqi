#!/usr/bin/env python3
"""Package the verified current extension; all private room/chat runtime data excluded."""
from pathlib import Path
import os,json,hashlib,zipfile,shutil
R=Path(__file__).resolve().parents[1];version=json.loads((R/'package.json').read_text())['version'];V=version+'-pages.1';DEST=R.parents[2]/'release'/V;DEST.mkdir(parents=True,exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
public=json.loads((R/'docs/floating-play/checks/public-journey.json').read_text());complete=public['status']=='passed';assert public['resultVersion']==V;status='complete' if complete else 'stage-backend-chat-awaiting-manual-deploy'
def files():
 result=[]
 for folder,dirs,names in os.walk(R):
  dirs[:]=[x for x in dirs if x not in {'node_modules','.git','__pycache__','delivery','font-cache','runtime-data','.pnpm-store','.playwright-cli','.auth'} and not x.startswith('lo-')]
  rel=str(Path(folder).relative_to(R))
  if rel in {'output/playwright/report','output/playwright/results','output/playwright/free-webkit-results','output/playwright/history-webkit-results','output/playwright/online-results','output/playwright/online-webkit-results'}:dirs[:]=[];continue
  for n in names:
   if n in {'.DS_Store','tsconfig.tsbuildinfo','.env'} or n.startswith('.env.') or n.endswith(('.pem','.p12','.key')):continue
   result.append(Path(folder)/n)
 return sorted(result)
old=json.loads((R/'docs/floating-play/BASE-MANIFEST.json').read_text());prev={x['path']:x['sha256'] for x in old['files']};excluded={'RELEASE_MANIFEST.json','release-manifest.json','SHA256SUMS.txt'};self_change='docs/floating-play/changed-files.json'
changed=[{'path':str(p.relative_to(R)),'kind':'added' if str(p.relative_to(R)) not in prev else 'modified','sha256':sha(p)} for p in files() if str(p.relative_to(R)) not in excluded|{self_change} and prev.get(str(p.relative_to(R)))!=sha(p)]
changed.append({'path':'启动联机对弈.command','kind':'executable-metadata','sha256':sha(R/'启动联机对弈.command'),'mode':'0755'})
changed.append({'path':self_change,'kind':'generated-manifest','selfHashExcluded':True})
(R/self_change).write_text(json.dumps({'schemaVersion':1,'id':'FLOATING-PLAY-CHANGE-MANIFEST','revision':1,'rulesetId':'GO-CLUB-AREA-1','baseVersion':'0.21.1-pages.1','resultVersion':V,'files':changed,'removed':[x for x in prev if not (R/x).exists()]},ensure_ascii=False,indent=2)+'\n')
entries=[{'path':str(p.relative_to(R)),'bytes':p.stat().st_size,'sha256':sha(p)} for p in files() if str(p.relative_to(R)) not in excluded]
m={'schemaVersion':1,'id':'FLOATING-PLAY-RELEASE-MANIFEST','revision':1,'rulesetId':'GO-CLUB-AREA-1','taskId':'ONLINE_FLOATING_PLAY','baseVersion':'ONLINE_PLAY_TOOLS 0.21.1-pages.1','resultVersion':V,'programVersion':version,'status':status,'freezeId':'GO-CLUB-FREEZE-B-20260919-01','puzzleCount':30,'terminalCount':6,'uniquePrimaryMicroSlides':25,'fileCount':len(entries)+3,'excludedFromSelfHash':sorted(excluded),'files':entries}
for n in ['RELEASE_MANIFEST.json','release-manifest.json']:(R/n).write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
(R/'SHA256SUMS.txt').write_text(''.join(f"{x['sha256']}  {x['path']}\n" for x in entries)+''.join(f'{sha(R/n)}  {n}\n' for n in ['RELEASE_MANIFEST.json','release-manifest.json']))
full=DEST/f'go-club-{V}-full.zip'
with zipfile.ZipFile(full,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in files():z.write(p,'go-club/'+str(p.relative_to(R)))
with zipfile.ZipFile(full) as z:assert z.testzip() is None;assert len(z.namelist())==m['fileCount'];assert not any('/node_modules/' in n or '/runtime-data/' in n for n in z.namelist())
readme=f'''# 围棋社 · {version}\n\n原网站 https://sma084545-pixel.github.io/weiqi/ ，联机入口 #/play/online。悬浮小棋盘现在可直接操作，保留独立画中画、棋盘最大化/系统全屏、房间聊天。\n\n本包状态：{status}。实际公网验收见docs/floating-play/ACCEPTANCE.md。聊天需要Render后端具备roomChat=1；旧后端仍能下棋并如实提示待更新。\n\n已构建，无需安装node_modules。使用兼容Node22.22.2起22系/24.15起24系/26+，在目录运行：\n\n    node dist-server/server.mjs\n\n也可打开“启动联机对弈.command”。浏览器打开http://127.0.0.1:4190/，终端Ctrl+C停止。局域网伙伴使用终端显示的本机网络地址，127.0.0.1不能用于异地；公网使用原GitHub网站和既有Render服务。\n\n新旧窗口均显示同一对局；悬浮、放大及独立PiP均可按本人轮次落子或在终局时标记死子，历史回看只读。停两手后仍需双方确认死子清单，程序才按面积规则算分，不自动猜任意局面死活。\n\n房间与聊天都是临时数据，服务休眠/重启/更新可能清空，先保存本机副本或导出棋局。聊天最多最近50条，重启清空，不进入棋谱。无账号，无默认本机学习进度/草稿/反馈上传。关闭独立PiP不离开房间。不支持独立PiP时回退页内小棋盘。\n\n完整源码、30题/6终局、所有可编辑材料/PDF/PPTX和验证在full.zip与GitHub仓库project/。备份与更新不要清除浏览器站点数据；先保存当前工作，再应用更新。详见附带文档。\n'''
app_files=[]
for folder in ['dist','dist-server']:
 for p in sorted((R/folder).rglob('*')):
  if p.is_file():app_files.append((p,str(p.relative_to(R))))
app_files.append((R/'启动联机对弈.command','启动联机对弈.command'))
for folder in ['docs/online','docs/online-tools','docs/floating-play']:
 for p in sorted((R/folder).glob('*.md')):app_files.append((p,str(p.relative_to(R))))
for folder,prefix in [('docs/t24/third-party','licenses/legacy/'),('docs/online/third-party','licenses/online/')]:
 for p in sorted((R/folder).rglob('*')):
  if p.is_file() and p.name not in {'README.md','licenses.json'}:app_files.append((p,prefix+str(p.relative_to(R/folder))))
appm={'schemaVersion':1,'id':'FLOATING-PLAY-APP-MANIFEST','revision':1,'rulesetId':'GO-CLUB-AREA-1','resultVersion':V,'programVersion':version,'status':status,'files':[{'path':name,'sha256':sha(p),'bytes':p.stat().st_size} for p,name in app_files]+[{'path':'README.md','sha256':hashlib.sha256(readme.encode()).hexdigest(),'bytes':len(readme.encode())}]}
app=DEST/f'go-club-{V}-app.zip'
with zipfile.ZipFile(app,'w',zipfile.ZIP_DEFLATED) as z:
 for p,name in app_files:z.write(p,'go-club-app/'+name)
 z.writestr('go-club-app/README.md',readme);z.writestr('go-club-app/APP_MANIFEST.json',json.dumps(appm,ensure_ascii=False,indent=2)+'\n')
with zipfile.ZipFile(app) as z:assert z.testzip() is None
(DEST/'SHA256SUMS.txt').write_text(''.join(f'{sha(p)}  {p.name}\n' for p in [full,app]))
info={'schemaVersion':1,'id':'FLOATING-PLAY-PACKAGE-INFO','revision':1,'rulesetId':'GO-CLUB-AREA-1','resultVersion':V,'programVersion':version,'baseVersion':'ONLINE_PLAY_TOOLS 0.21.1-pages.1','status':status,'archives':[{'path':p.name,'sha256':sha(p),'bytes':p.stat().st_size} for p in [full,app]],'fullFileCount':m['fileCount']}
(DEST/'PACKAGE_INFO.json').write_text(json.dumps(info,ensure_ascii=False,indent=2)+'\n')
for src,name in [('handoff/ONLINE_FLOATING_PLAY.md','ONLINE_FLOATING_PLAY_HANDOFF.md'),('docs/floating-play/ACCEPTANCE.md','FLOATING_PLAY_ACCEPTANCE.md'),('docs/floating-play/USAGE.md','FLOATING_PLAY_GUIDE.md'),('docs/floating-play/changed-files.json','CHANGE_MANIFEST.json')]:shutil.copy2(R/src,DEST/name)
print(json.dumps(info,ensure_ascii=False))
