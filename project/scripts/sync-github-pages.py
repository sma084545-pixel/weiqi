#!/usr/bin/env python3
"""Publish verified static build and buildable source to an isolated existing Pages clone."""
from pathlib import Path
import argparse,json,hashlib,shutil,os
p=argparse.ArgumentParser();p.add_argument('--repo',required=True);args=p.parse_args()
R=Path(__file__).resolve().parents[1];repo=Path(args.repo).resolve();version=json.loads((R/'package.json').read_text())['version'];V=version+'-pages.1'
assert (repo/'.git').is_dir();assert json.loads((R/'dist/version.json').read_text())['programVersion']==version
sha=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
previous=json.loads((repo/'PUBLICATION.json').read_text()) if (repo/'PUBLICATION.json').exists() else {};revision=previous.get('revision',0)+1
site=[]
for path in sorted((R/'dist').rglob('*')):
 if path.is_file():
  rel=str(path.relative_to(R/'dist'));target=repo/rel;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(path,target);site.append({'path':rel,'bytes':path.stat().st_size,'sha256':sha(path)})
(repo/'.nojekyll').write_text('\n');source=repo/'project';source.mkdir(exist_ok=True);entries=[]
exclude_dirs={'node_modules','.git','__pycache__','delivery','font-cache','runtime-data','.pnpm-store','.playwright-cli','.auth'};exclude_root={'dist','dist-engine','dist-server','output'};exclude_files={'.DS_Store','tsconfig.tsbuildinfo','RELEASE_MANIFEST.json','release-manifest.json','SHA256SUMS.txt','.env'}
for folder,dirs,names in os.walk(R):
 relative=Path(folder).relative_to(R);dirs[:]=[name for name in dirs if name not in exclude_dirs and not name.startswith('lo-') and not (relative==Path('.') and name in exclude_root)]
 for name in sorted(names):
  if name in exclude_files or name.startswith('.env.') or name.endswith(('.pem','.p12','.key')):continue
  path=Path(folder)/name;rel=path.relative_to(R);target=source/rel;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(path,target);entries.append({'path':str(rel),'bytes':path.stat().st_size,'sha256':sha(path)})
(source/'SOURCE_INFO.json').write_text(json.dumps({'schemaVersion':1,'id':'GITHUB-CURRENT-SOURCE','revision':revision,'rulesetId':'GO-CLUB-AREA-1','resultVersion':V,'programVersion':version,'sourceBuild':'pnpm install --frozen-lockfile && pnpm build','note':'Buildable source and materials; installed dependencies, private data and generated root build/output excluded. Full release archive includes production builds and all evidence.','files':entries},ensure_ascii=False,indent=2)+'\n')
manifest={'schemaVersion':1,'id':'GITHUB-PAGES-PUBLICATION','revision':revision,'rulesetId':'GO-CLUB-AREA-1','resultVersion':V,'programVersion':version,'siteUrl':'https://sma084545-pixel.github.io/weiqi/','sourceDirectory':'project/','formalPuzzles':30,'terminalFixtures':6,'microLessonPrimarySlides':25,'onlineServerConfigured':False,'onlineStatus':'Room server not deployed; setup explanation and same-screen play available.','files':site,'sourceManifestSha256':sha(source/'SOURCE_INFO.json')}
(repo/'PUBLICATION.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');(repo/'SHA256SUMS.txt').write_text(''.join(f"{x['sha256']}  {x['path']}\n" for x in site)+f"{sha(repo/'PUBLICATION.json')}  PUBLICATION.json\n"+f"{sha(source/'SOURCE_INFO.json')}  project/SOURCE_INFO.json\n")
(repo/'README.md').write_text(f'''# 围棋社 · 最新版 {version}

**原网址：[打开学习工具](https://sma084545-pixel.github.io/weiqi/)**

同步此前尚未上线的教学、反馈、完整自由双人对弈、5/9/13/19路选择、回退和棋局滑动条。包含30道正式题、6个终局、可编辑课件、教具与主持材料；GO-CLUB-AREA-1、schemaVersion1及正式revision保持。

- [学习入口](https://sma084545-pixel.github.io/weiqi/#/home)
- [自由双人对弈](https://sma084545-pixel.github.io/weiqi/#/play/free)
- [题目挑战](https://sma084545-pixel.github.io/weiqi/#/challenges)
- [教师工具](https://sma084545-pixel.github.io/weiqi/#/teacher)
- [联机状态](https://sma084545-pixel.github.io/weiqi/#/play/online)

旧缓存用户先保存，再点“保存已提交内容并应用”。页脚和[version.json](https://sma084545-pixel.github.io/weiqi/version.json)可核对{version}；不要清除站点数据来升级。本机进度/草稿/反馈留在浏览器，不默认上传。

## 联机边界

GitHub Pages只提供静态网页，不运行房间服务器。联机代码和可部署Node服务已提供，未接入公网后台时网站明确显示“联机服务未接入”。不能把前端发布称为两个异地设备已可同步。将来可保留同一网址接入实际HTTPS后台，见[接入说明](ONLINE_SETUP.md)。本次不购买托管或创建账户。

## 当前源码和工具包

[project/](project/)保存当前可构建源码、题库、材料和交接。从该目录执行：

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

Node版本要求见package.json；默认本机/局域网服务端口4190，Ctrl+C停止。私有runtime-data/凭据/已安装依赖不在仓库。

[完整工具包、轻量软件与校验值](https://github.com/sma084545-pixel/weiqi/releases/tag/v{V})包含生产构建、全部可编辑材料、PDF/PPTX、交接和验证。历史source/0.16.0分卷只作溯源，不作为当前主线。

当前静态清单PUBLICATION.json、SHA256SUMS.txt；源码清单project/SOURCE_INFO.json。验收见project/docs/github-pages/。自动化、实体制造与真人教学验证分别记录；不声称提高智商、治疗压力、改善学业或保证CAS认可。第三方许可证随docs和字体目录保留。
''')
(repo/'source/README.md').write_text('# 历史源码0.16.0\n\n仅保留旧分卷用于追踪。最新源码在../project/，完整包见仓库Release，不要用旧分卷覆盖当前主线。\n')
(repo/'.gitignore').write_text('project/node_modules/\nproject/dist/\nproject/dist-server/\nproject/dist-engine/\nproject/runtime-data/\nproject/.env\nproject/.env.*\n.DS_Store\n')
assert sum(x['bytes'] for x in entries)+sum(x['bytes'] for x in site)<1024**3;assert max(x['bytes'] for x in entries)<100*1024**2
print(json.dumps({'version':version,'staticFiles':len(site),'sourceFiles':len(entries),'sourceMiB':round(sum(x['bytes'] for x in entries)/1024**2,1),'onlineServerConfigured':False},ensure_ascii=False))
