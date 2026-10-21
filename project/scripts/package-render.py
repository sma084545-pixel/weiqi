#!/usr/bin/env python3
"""Package the optional online extension; never include room credentials or live data."""
from pathlib import Path
import os,json,hashlib,zipfile,shutil
R=Path(__file__).resolve().parents[1];V='0.20.3-pages.1';DEST=R.parents[2]/'release'/V;DEST.mkdir(parents=True,exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def files():
 result=[]
 for folder,dirs,names in os.walk(R):
  dirs[:]=[x for x in dirs if x not in {'node_modules','.git','__pycache__','delivery','font-cache','runtime-data','.pnpm-store','.playwright-cli','.auth'} and not x.startswith('lo-')]
  rel=str(Path(folder).relative_to(R))
  if rel in {'output/playwright/report','output/playwright/results','output/playwright/free-webkit-results','output/playwright/history-webkit-results','output/playwright/online-results','output/playwright/online-webkit-results'}:dirs[:]=[];continue
  for n in names:
   if n in {'.DS_Store','tsconfig.tsbuildinfo','.env'} or n.startswith('.env.'):continue
   result.append(Path(folder)/n)
 return sorted(result)
assert json.loads((R/'docs/render/checks/public-journey.json').read_text())['status']=='passed'
old=json.loads((R/'docs/render/BASE-MANIFEST.json').read_text());prev={x['path']:x['sha256'] for x in old['files']};excluded={'RELEASE_MANIFEST.json','release-manifest.json','SHA256SUMS.txt'};self_change='docs/render/changed-files.json'
changed=[{'path':str(p.relative_to(R)),'kind':'added' if str(p.relative_to(R)) not in prev else 'modified','sha256':sha(p)} for p in files() if str(p.relative_to(R)) not in excluded|{self_change} and prev.get(str(p.relative_to(R)))!=sha(p)]
changed.append({'path':self_change,'kind':'generated-manifest','selfHashExcluded':True})
(R/self_change).write_text(json.dumps({'schemaVersion':1,'id':'RENDER-CHANGE-MANIFEST','revision':1,'rulesetId':'GO-CLUB-AREA-1','baseVersion':'0.20.2-pages.1','resultVersion':V,'files':changed,'removed':[x for x in prev if not (R/x).exists()]},ensure_ascii=False,indent=2)+'\n')
entries=[{'path':str(p.relative_to(R)),'bytes':p.stat().st_size,'sha256':sha(p)} for p in files() if str(p.relative_to(R)) not in excluded]
m={'schemaVersion':1,'id':'RENDER-RELEASE-MANIFEST','revision':1,'rulesetId':'GO-CLUB-AREA-1','taskId':'RENDER_DEPLOY','baseVersion':'GITHUB_PAGES_SYNC 0.20.2-pages.1','resultVersion':V,'programVersion':'0.20.3','status':'complete','freezeId':'GO-CLUB-FREEZE-B-20260919-01','puzzleCount':30,'terminalCount':6,'uniquePrimaryMicroSlides':25,'fileCount':len(entries)+3,'excludedFromSelfHash':sorted(excluded),'files':entries}
for n in ['RELEASE_MANIFEST.json','release-manifest.json']:(R/n).write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
(R/'SHA256SUMS.txt').write_text(''.join(f"{x['sha256']}  {x['path']}\n" for x in entries)+''.join(f'{sha(R/n)}  {n}\n' for n in ['RELEASE_MANIFEST.json','release-manifest.json']))
full=DEST/f'go-club-{V}-full.zip'
with zipfile.ZipFile(full,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in files():z.write(p,'go-club/'+str(p.relative_to(R)))
with zipfile.ZipFile(full) as z:assert z.testzip() is None;assert len(z.namelist())==m['fileCount']
readme='''---
schemaVersion: 1
id: RENDER-APP-README
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 围棋社 · 0.20.3

网站继续用 https://sma084545-pixel.github.io/weiqi/ 。原网址联机页已接入 https://weiqi-rooms.onrender.com，选择“联机对弈”，一人创建、另一人输入房间码；无需账号。首次唤醒可能约一分钟，稍候重连。免费临时房间可能在休眠、重启或更新后清空，请保存本机副本或导出。详见docs/render/DEPLOYMENT.md。

本软件包已构建，含dist和dist-server；Node22.22.2起的22.x、24.15起的24.x或26+时，从解压目录运行：

    node dist-server/server.mjs

macOS可打开“启动联机对弈.command”。终端保持运行，Ctrl+C停止。默认0.0.0.0:4190，本机用http://127.0.0.1:4190/；同网伙伴尝试终端显示的局域网地址，127.0.0.1不能发给另一台设备。Node版本可直接同源建房，两人各执一色、轮流落子；双方停手并确认死子后自动面积计分。无通用死活裁判。

无需安装node_modules。私人棋局在runtime-data，不要公开；本机进度/草稿/反馈不上传。更新前保存和备份，保持原来源，应用后准备离线；房间同步需要服务连接。

完整可编辑教学材料、源码、测试与交接在full.zip及GitHub仓库project/。原网址旧缓存用户先保存再点“保存已提交内容并应用”，不要清站点数据。原GitHub Pages到Render的公网WSS已由两个独立浏览器会话验证；这不是两台实体设备或真人课堂测试。实际证据和限制见docs/render/ACCEPTANCE.md。
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
appm={'schemaVersion':1,'id':'RENDER-APP-MANIFEST','revision':1,'rulesetId':'GO-CLUB-AREA-1','resultVersion':V,'programVersion':'0.20.3','files':[{'path':name,'sha256':sha(p),'bytes':p.stat().st_size} for p,name in app_files]+[{'path':'README.md','sha256':hashlib.sha256(readme.encode()).hexdigest(),'bytes':len(readme.encode())}]}
for name in ['ONLINE_SETUP.md','ACCEPTANCE.md']:
 app_files.append((R/'docs/github-pages'/name,'docs/github-pages/'+name))
for name in ['DEPLOYMENT.md','ACCEPTANCE.md','KNOWN_ISSUES.md']:
 app_files.append((R/'docs/render'/name,'docs/render/'+name))
appm['files']=[{'path':name,'sha256':sha(p),'bytes':p.stat().st_size} for p,name in app_files]+[{'path':'README.md','sha256':hashlib.sha256(readme.encode()).hexdigest(),'bytes':len(readme.encode())}]
app=DEST/f'go-club-{V}-app.zip'
with zipfile.ZipFile(app,'w',zipfile.ZIP_DEFLATED) as z:
 for p,name in app_files:z.write(p,'go-club-app/'+name)
 z.writestr('go-club-app/README.md',readme);z.writestr('go-club-app/APP_MANIFEST.json',json.dumps(appm,ensure_ascii=False,indent=2)+'\n')
with zipfile.ZipFile(app) as z:assert z.testzip() is None
(DEST/'SHA256SUMS.txt').write_text(''.join(f'{sha(p)}  {p.name}\n' for p in [full,app]))
info={'schemaVersion':1,'id':'RENDER-PACKAGE-INFO','revision':1,'rulesetId':'GO-CLUB-AREA-1','resultVersion':V,'programVersion':'0.20.3','baseVersion':'GITHUB_PAGES_SYNC 0.20.2-pages.1','status':'complete','archives':[{'path':p.name,'sha256':sha(p),'bytes':p.stat().st_size} for p in [full,app]],'fullFileCount':m['fileCount']}
(DEST/'PACKAGE_INFO.json').write_text(json.dumps(info,ensure_ascii=False,indent=2)+'\n')
for src,name in [('handoff/RENDER_DEPLOY.md','RENDER_DEPLOY_HANDOFF.md'),('docs/render/ACCEPTANCE.md','RENDER_DEPLOY_ACCEPTANCE.md'),('docs/render/DEPLOYMENT.md','RENDER_DEPLOY_GUIDE.md'),('docs/render/changed-files.json','CHANGE_MANIFEST.json')]:shutil.copy2(R/src,DEST/name)
print(json.dumps(info,ensure_ascii=False))
