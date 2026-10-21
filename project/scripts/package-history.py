#!/usr/bin/env python3
from pathlib import Path
import os,json,hashlib,zipfile,shutil
R=Path(__file__).resolve().parents[1];V='0.19.0-history.1';DEST=R.parents[2]/'release'/V;DEST.mkdir(parents=True,exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def files():
 result=[]
 for folder,dirs,names in os.walk(R):
  dirs[:]=[x for x in dirs if x not in {'node_modules','.git','__pycache__','delivery','font-cache'} and not x.startswith('lo-')]
  rel=Path(folder).relative_to(R)
  if str(rel) in {'output/playwright/report','output/playwright/results','output/playwright/free-webkit-results','output/playwright/history-webkit-results'}:dirs[:]=[];continue
  for n in names:
   if n not in {'.DS_Store','tsconfig.tsbuildinfo'}:result.append(Path(folder)/n)
 return sorted(result)
old=json.loads((R/'docs/history/provenance/FREE_PLAY-RELEASE_MANIFEST.json').read_text());prev={x['path']:x['sha256'] for x in old['files']};excluded={'RELEASE_MANIFEST.json','release-manifest.json','SHA256SUMS.txt'}
change_self='docs/history/changed-files.json'
changed=[{'path':str(p.relative_to(R)),'kind':'added' if str(p.relative_to(R)) not in prev else 'modified','sha256':sha(p)} for p in files() if str(p.relative_to(R)) not in excluded|{change_self} and prev.get(str(p.relative_to(R)))!=sha(p)]
changed.append({'path':change_self,'kind':'generated-manifest','selfHashExcluded':True})
(R/'docs/history/changed-files.json').write_text(json.dumps({'schemaVersion':1,'id':'HISTORY-CHANGE-MANIFEST','revision':1,'rulesetId':'GO-CLUB-AREA-1','baseVersion':'0.18.0-freeplay.1','resultVersion':V,'files':changed,'removed':[x for x in prev if not (R/x).exists()]},ensure_ascii=False,indent=2)+'\n')
entries=[{'path':str(p.relative_to(R)),'bytes':p.stat().st_size,'sha256':sha(p)} for p in files() if str(p.relative_to(R)) not in excluded]
m={'schemaVersion':1,'id':'HISTORY-RELEASE-MANIFEST','revision':1,'rulesetId':'GO-CLUB-AREA-1','taskId':'HISTORY_SLIDER','baseVersion':'FREE_PLAY 0.18.0-freeplay.1','resultVersion':V,'programVersion':'0.19.0','freezeId':'GO-CLUB-FREEZE-B-20260919-01','puzzleCount':30,'terminalCount':6,'uniquePrimaryMicroSlides':25,'fileCount':len(entries)+3,'excludedFromSelfHash':sorted(excluded),'files':entries}
for name in ['RELEASE_MANIFEST.json','release-manifest.json']:(R/name).write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
(R/'SHA256SUMS.txt').write_text(''.join(f"{x['sha256']}  {x['path']}\n" for x in entries)+''.join(f'{sha(R/n)}  {n}\n' for n in ['RELEASE_MANIFEST.json','release-manifest.json']))
full=DEST/f'go-club-{V}-full.zip'
with zipfile.ZipFile(full,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in files():z.write(p,'go-club/'+str(p.relative_to(R)))
with zipfile.ZipFile(full) as z:assert z.testzip() is None;assert len(z.namelist())==m['fileCount']
app=DEST/f'go-club-{V}-app.zip';site=sorted(p for p in (R/'dist').rglob('*') if p.is_file())
readme='''---
schemaVersion: 1
id: HISTORY-APP-README
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 围棋社软件 · 棋局回退与滑动条 · 0.19.0

本包是已构建的软件和题库，不含源码、纸卡或PPT；完整材料请用full.zip。

先解压。在有Python3的电脑上，打开此文件夹的终端，执行：

    python3 -m http.server 4190 --bind 127.0.0.1 --directory site

然后浏览器打开 http://127.0.0.1:4190/#/play/free 。终端保持运行；Ctrl+C结束服务。如4190已被占用，先关闭旧服务或选另一端口（本机记录按主机/端口分开）。不要直接双击HTML代替本地服务。

所有连续落子的棋盘下方均有棋局滑动条与回退到上一步，可拖动实时回看、精确前后切换，再返回当前继续。回看不改变真实对局；真正悔棋仍使用原有按钮，双人对弈由双方确认。

棋盘可选5/9/13/19路。黑白轮流落子；双方停手并确认死子后自动计分判胜。新旧完整对弈入口共享同一盘；本机记录不上传。旧版本先备份，保持原主机/端口以沿用记录，再准备新版本离线资源。

离线前先到“教师视图→离线与本机数据”等已可离线。直接file://没有同等能力。没有Python3时，可使用full.zip中Node/pnpm源项目按README启动。
'''
appm={'schemaVersion':1,'id':'HISTORY-APP-MANIFEST','revision':1,'rulesetId':'GO-CLUB-AREA-1','resultVersion':V,'programVersion':'0.19.0','files':[{'path':'site/'+str(p.relative_to(R/'dist')),'sha256':sha(p),'bytes':p.stat().st_size} for p in site]}
with zipfile.ZipFile(app,'w',zipfile.ZIP_DEFLATED) as z:
 for p in site:z.write(p,'go-club-app/site/'+str(p.relative_to(R/'dist')))
 z.writestr('go-club-app/README.md',readme)
 for p in sorted((R/'docs/t24/third-party').rglob('*')):
  if p.is_file() and p.name not in {'README.md','licenses.json'}:
   rel='licenses/'+str(p.relative_to(R/'docs/t24/third-party'))
   z.write(p,'go-club-app/'+rel);appm['files'].append({'path':rel,'sha256':sha(p),'bytes':p.stat().st_size})
 z.writestr('go-club-app/APP_MANIFEST.json',json.dumps(appm,ensure_ascii=False,indent=2)+'\n')
with zipfile.ZipFile(app) as z:assert z.testzip() is None
(DEST/'SHA256SUMS.txt').write_text(''.join(f'{sha(p)}  {p.name}\n' for p in [full,app]))
info={'schemaVersion':1,'id':'HISTORY-PACKAGE-INFO','revision':1,'rulesetId':'GO-CLUB-AREA-1','resultVersion':V,'programVersion':'0.19.0','baseVersion':'FREE_PLAY 0.18.0-freeplay.1','archives':[{'path':p.name,'sha256':sha(p),'bytes':p.stat().st_size} for p in [full,app]],'fullFileCount':m['fileCount']}
(DEST/'PACKAGE_INFO.json').write_text(json.dumps(info,ensure_ascii=False,indent=2)+'\n')
for src,name in [('handoff/HISTORY_SLIDER.md','HISTORY_SLIDER_交接.md'),('docs/history/USAGE.md','棋局回退与滑动条_使用说明.md'),('docs/history/ACCEPTANCE.md','HISTORY_SLIDER_验收报告.md'),('docs/history/changed-files.json','CHANGE_MANIFEST.json')]:shutil.copy2(R/src,DEST/name)
print(json.dumps(info,ensure_ascii=False))
