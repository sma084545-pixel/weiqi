#!/usr/bin/env python3
"""Package the optional online extension; never include room credentials or live data."""
from pathlib import Path
import os,json,hashlib,zipfile,shutil
R=Path(__file__).resolve().parents[1];V='0.20.0-online.1';DEST=R.parents[2]/'release'/V;DEST.mkdir(parents=True,exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def files():
 result=[]
 for folder,dirs,names in os.walk(R):
  dirs[:]=[x for x in dirs if x not in {'node_modules','.git','__pycache__','delivery','font-cache','runtime-data','.pnpm-store'} and not x.startswith('lo-')]
  rel=str(Path(folder).relative_to(R))
  if rel in {'output/playwright/report','output/playwright/results','output/playwright/free-webkit-results','output/playwright/history-webkit-results','output/playwright/online-results','output/playwright/online-webkit-results'}:dirs[:]=[];continue
  for n in names:
   if n in {'.DS_Store','tsconfig.tsbuildinfo','.env'} or n.startswith('.env.'):continue
   result.append(Path(folder)/n)
 return sorted(result)
old=json.loads((R/'docs/online/provenance/HISTORY-RELEASE_MANIFEST.json').read_text());prev={x['path']:x['sha256'] for x in old['files']};excluded={'RELEASE_MANIFEST.json','release-manifest.json','SHA256SUMS.txt'};self_change='docs/online/changed-files.json'
changed=[{'path':str(p.relative_to(R)),'kind':'added' if str(p.relative_to(R)) not in prev else 'modified','sha256':sha(p)} for p in files() if str(p.relative_to(R)) not in excluded|{self_change} and prev.get(str(p.relative_to(R)))!=sha(p)]
changed.append({'path':self_change,'kind':'generated-manifest','selfHashExcluded':True})
(R/self_change).write_text(json.dumps({'schemaVersion':1,'id':'ONLINE-CHANGE-MANIFEST','revision':1,'rulesetId':'GO-CLUB-AREA-1','baseVersion':'0.19.0-history.1','resultVersion':V,'files':changed,'removed':[x for x in prev if not (R/x).exists()]},ensure_ascii=False,indent=2)+'\n')
entries=[{'path':str(p.relative_to(R)),'bytes':p.stat().st_size,'sha256':sha(p)} for p in files() if str(p.relative_to(R)) not in excluded]
m={'schemaVersion':1,'id':'ONLINE-RELEASE-MANIFEST','revision':1,'rulesetId':'GO-CLUB-AREA-1','taskId':'ONLINE_PLAY','baseVersion':'HISTORY_SLIDER 0.19.0-history.1','resultVersion':V,'programVersion':'0.20.0','status':'complete','freezeId':'GO-CLUB-FREEZE-B-20260919-01','puzzleCount':30,'terminalCount':6,'uniquePrimaryMicroSlides':25,'fileCount':len(entries)+3,'excludedFromSelfHash':sorted(excluded),'files':entries}
for n in ['RELEASE_MANIFEST.json','release-manifest.json']:(R/n).write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
(R/'SHA256SUMS.txt').write_text(''.join(f"{x['sha256']}  {x['path']}\n" for x in entries)+''.join(f'{sha(R/n)}  {n}\n' for n in ['RELEASE_MANIFEST.json','release-manifest.json']))
full=DEST/f'go-club-{V}-full.zip'
with zipfile.ZipFile(full,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in files():z.write(p,'go-club/'+str(p.relative_to(R)))
with zipfile.ZipFile(full) as z:assert z.testzip() is None;assert len(z.namelist())==m['fileCount']
readme='''---
schemaVersion: 1
id: ONLINE-APP-README
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 围棋社 · 联机版 0.20.0

本包是可运行/可部署软件，包含前端与Node房间服务，不含源码和教学材料；完整工具包见full.zip。

解压，保留dist和dist-server相对位置。有Node22.22.2+或24.15+时，进入本文件夹运行：

    node dist-server/server.mjs

macOS可双击“启动联机对弈.command”。浏览器打开终端显示的地址，进入“联机对弈”：一人创建房间，另一人从同一个网站输入8位码。无需注册，创建者黑、加入者白，5/9/13/19路可选。支持同步落子/提子、双方悔棋、断线恢复、独立棋局滑动条，双方确认死子后自动面积计分。服务器不自动猜死活。

只有服务电脑需要Node；参与者只用浏览器。本包已打包服务，不需要node_modules；已从无依赖目录实际启动并完成双浏览器开局到终局、刷新与导出检查，详见ACCEPTANCE。

默认监听0.0.0.0:4190，终端保持运行，Ctrl+C停止。同网伙伴使用终端的局域网候选地址；127.0.0.1只能本机使用。跨地点需要自有可达服务器与HTTPS/WebSocket代理，本次尚未公网部署。详细步骤见docs/online/DEPLOYMENT.md。

私人房间记录在runtime-data/，不要公开；本机学习进度/草稿/反馈不上传。更新前保存/备份，保持原主机/端口；离线教学先准备资源，联机需持续服务。服务坏文件不删除，先备份再按指南恢复。

实际检查、未测与审批服务限制在docs/online/ACCEPTANCE.md、KNOWN_ISSUES.md；不要直接双击HTML替代Node服务。
'''
app_files=[]
for folder in ['dist','dist-server']:
 for p in sorted((R/folder).rglob('*')):
  if p.is_file():app_files.append((p,str(p.relative_to(R))))
app_files.append((R/'启动联机对弈.command','启动联机对弈.command'))
for name in ['USAGE.md','DEPLOYMENT.md','PROTOCOL.md','KNOWN_ISSUES.md','ACCEPTANCE.md']:
 app_files.append((R/'docs/online'/name,'docs/online/'+name))
for folder,prefix in [('docs/t24/third-party','licenses/legacy/'),('docs/online/third-party','licenses/online/')]:
 for p in sorted((R/folder).rglob('*')):
  if p.is_file() and p.name not in {'README.md','licenses.json'}:app_files.append((p,prefix+str(p.relative_to(R/folder))))
appm={'schemaVersion':1,'id':'ONLINE-APP-MANIFEST','revision':1,'rulesetId':'GO-CLUB-AREA-1','resultVersion':V,'programVersion':'0.20.0','files':[{'path':name,'sha256':sha(p),'bytes':p.stat().st_size} for p,name in app_files]+[{'path':'README.md','sha256':hashlib.sha256(readme.encode()).hexdigest(),'bytes':len(readme.encode())}]}
app=DEST/f'go-club-{V}-app.zip'
with zipfile.ZipFile(app,'w',zipfile.ZIP_DEFLATED) as z:
 for p,name in app_files:z.write(p,'go-club-app/'+name)
 z.writestr('go-club-app/README.md',readme);z.writestr('go-club-app/APP_MANIFEST.json',json.dumps(appm,ensure_ascii=False,indent=2)+'\n')
with zipfile.ZipFile(app) as z:assert z.testzip() is None
(DEST/'SHA256SUMS.txt').write_text(''.join(f'{sha(p)}  {p.name}\n' for p in [full,app]))
info={'schemaVersion':1,'id':'ONLINE-PACKAGE-INFO','revision':1,'rulesetId':'GO-CLUB-AREA-1','resultVersion':V,'programVersion':'0.20.0','baseVersion':'HISTORY_SLIDER 0.19.0-history.1','status':'complete','archives':[{'path':p.name,'sha256':sha(p),'bytes':p.stat().st_size} for p in [full,app]],'fullFileCount':m['fileCount']}
(DEST/'PACKAGE_INFO.json').write_text(json.dumps(info,ensure_ascii=False,indent=2)+'\n')
for src,name in [('handoff/ONLINE_PLAY.md','ONLINE_PLAY_交接.md'),('docs/online/USAGE.md','联机对弈_使用说明.md'),('docs/online/DEPLOYMENT.md','联机对弈_部署指南.md'),('docs/online/ACCEPTANCE.md','ONLINE_PLAY_验收报告.md'),('docs/online/changed-files.json','CHANGE_MANIFEST.json')]:shutil.copy2(R/src,DEST/name)
print(json.dumps(info,ensure_ascii=False))
