#!/usr/bin/env python3
"""Publish verified static build and buildable source to an isolated existing Pages clone."""
from pathlib import Path
import argparse,json,hashlib,shutil,os
p=argparse.ArgumentParser();p.add_argument('--repo',required=True);args=p.parse_args()
R=Path(__file__).resolve().parents[1];repo=Path(args.repo).resolve();version=json.loads((R/'package.json').read_text())['version'];V=version+'-pages.1'
assert (repo/'.git').is_dir();assert json.loads((R/'dist/version.json').read_text())['programVersion']==version
sha=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
public_version=json.loads((R/'dist/version.json').read_text());configured=public_version.get('onlineServerConfigured',False);server_origin=public_version.get('onlineServerOrigin');ephemeral=public_version.get('onlineRoomsEphemeral',False)
previous=json.loads((repo/'PUBLICATION.json').read_text()) if (repo/'PUBLICATION.json').exists() else {};revision=previous.get('revision',0)+1
site=[]
for path in sorted((R/'dist').rglob('*')):
 if path.is_file():
  rel=str(path.relative_to(R/'dist'));target=repo/rel;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(path,target);site.append({'path':rel,'bytes':path.stat().st_size,'sha256':sha(path)})
shutil.copy2(R/'deploy/render.yaml',repo/'render.yaml');shutil.copy2(R/'docs/online-tools/DEPLOYMENT.md',repo/'RENDER_SETUP.md')
(repo/'.nojekyll').write_text('\n');source=repo/'project';source.mkdir(exist_ok=True);entries=[]
exclude_dirs={'node_modules','.git','__pycache__','delivery','font-cache','runtime-data','.pnpm-store','.playwright-cli','.auth'};exclude_root={'dist','dist-engine','dist-server','output'};exclude_files={'.DS_Store','tsconfig.tsbuildinfo','RELEASE_MANIFEST.json','release-manifest.json','SHA256SUMS.txt','.env'}
for folder,dirs,names in os.walk(R):
 relative=Path(folder).relative_to(R);dirs[:]=[name for name in dirs if name not in exclude_dirs and not name.startswith('lo-') and not (relative==Path('.') and name in exclude_root)]
 for name in sorted(names):
  if name in exclude_files or name.startswith('.env.') or name.endswith(('.pem','.p12','.key')):continue
  path=Path(folder)/name;rel=path.relative_to(R);target=source/rel;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(path,target);entries.append({'path':str(rel),'bytes':path.stat().st_size,'sha256':sha(path)})
(source/'SOURCE_INFO.json').write_text(json.dumps({'schemaVersion':1,'id':'GITHUB-CURRENT-SOURCE','revision':revision,'rulesetId':'GO-CLUB-AREA-1','resultVersion':V,'programVersion':version,'sourceBuild':'pnpm install --frozen-lockfile && pnpm build','note':'Buildable source and materials; installed dependencies, private data and generated root build/output excluded. Full release archive includes production builds and all evidence.','files':entries},ensure_ascii=False,indent=2)+'\n')
manifest={'schemaVersion':1,'id':'GITHUB-PAGES-PUBLICATION','revision':revision,'rulesetId':'GO-CLUB-AREA-1','resultVersion':V,'programVersion':version,'siteUrl':'https://sma084545-pixel.github.io/weiqi/','sourceDirectory':'project/','formalPuzzles':30,'terminalFixtures':6,'microLessonPrimarySlides':25,'onlineServerConfigured':configured,'onlineServerOrigin':server_origin,'onlineRoomsEphemeral':ephemeral,'onlineStatus':'Public room server configured; capability-negotiated chat; current verification in docs/floating-fit.' if configured else 'Room server not configured.','files':site,'sourceManifestSha256':sha(source/'SOURCE_INFO.json')}
(repo/'PUBLICATION.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');(repo/'SHA256SUMS.txt').write_text(''.join(f"{x['sha256']}  {x['path']}\n" for x in site)+f"{sha(repo/'PUBLICATION.json')}  PUBLICATION.json\n"+f"{sha(source/'SOURCE_INFO.json')}  project/SOURCE_INFO.json\n")
(repo/'README.md').write_text(f'''# 围棋社 · 最新版 {version}

**原网址：[打开学习工具](https://sma084545-pixel.github.io/weiqi/)**

悬浮小棋盘现在完整显示整盘，可直接按本人轮次落子或标记死子；保留独立画中画、最大化/系统全屏与房间聊天，保留完整教学、自由双人对弈、5/9/13/19路、回退和棋局滑动条。包含30道正式题、6个终局、可编辑课件、教具与主持材料；GO-CLUB-AREA-1、schemaVersion1及正式revision保持。

- [学习入口](https://sma084545-pixel.github.io/weiqi/#/home)
- [自由双人对弈](https://sma084545-pixel.github.io/weiqi/#/play/free)
- [题目挑战](https://sma084545-pixel.github.io/weiqi/#/challenges)
- [教师工具](https://sma084545-pixel.github.io/weiqi/#/teacher)
- [联机状态](https://sma084545-pixel.github.io/weiqi/#/play/online)

旧缓存用户先保存，再点“保存已提交内容并应用”。页脚和[version.json](https://sma084545-pixel.github.io/weiqi/version.json)可核对{version}；不要清除站点数据来升级。本机进度/草稿/反馈留在浏览器，不默认上传。

## 联机边界

原网址的[联机双人对弈](https://sma084545-pixel.github.io/weiqi/#/play/online)通过独立HTTPS房间服务器{server_origin}同步。无需账号或真实姓名；一人建房，另一人输入房间码。免费部署房间是临时数据，休眠、重启或更新后可能重新开房；对局中可保存本机副本/导出。首次唤醒可能约一分钟，稍候重连。GitHub Pages继续提供静态网页，房间服务另在Render运行；本机进度/草稿/反馈不上传。实际验证及边界见[接入说明](ONLINE_SETUP.md)。

## 当前源码和工具包

[project/](project/)保存当前可构建源码、题库、材料和交接。从该目录执行：

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm start
# 发布到现有GitHub网站时使用：pnpm build:pages
```

Node版本要求见package.json；默认本机/局域网服务端口4190，Ctrl+C停止。私有runtime-data/凭据/已安装依赖不在仓库。

[完整工具包、轻量软件与校验值](https://github.com/sma084545-pixel/weiqi/releases/tag/v{V})包含生产构建、全部可编辑材料、PDF/PPTX、交接和验证。历史source/0.16.0分卷只作溯源，不作为当前主线。

当前静态清单PUBLICATION.json、SHA256SUMS.txt；源码清单project/SOURCE_INFO.json。本次验收见project/docs/floating-fit/。自动化、实体制造与真人教学验证分别记录；不声称提高智商、治疗压力、改善学业或保证CAS认可。第三方许可证随docs和字体目录保留。
''')
(repo/'source/README.md').write_text('# 历史源码0.16.0\n\n仅保留旧分卷用于追踪。最新源码在../project/，完整包见仓库Release，不要用旧分卷覆盖当前主线。\n')
(repo/'.gitignore').write_text('project/node_modules/\nproject/dist/\nproject/dist-server/\nproject/dist-engine/\nproject/runtime-data/\nproject/.env\nproject/.env.*\n.DS_Store\n')
assert sum(x['bytes'] for x in entries)+sum(x['bytes'] for x in site)<1024**3;assert max(x['bytes'] for x in entries)<100*1024**2
print(json.dumps({'version':version,'staticFiles':len(site),'sourceFiles':len(entries),'sourceMiB':round(sum(x['bytes'] for x in entries)/1024**2,1),'onlineServerConfigured':configured,'serverOrigin':server_origin},ensure_ascii=False))
