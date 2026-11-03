#!/usr/bin/env python3
"""Publish verified static build and buildable source to an isolated existing Pages clone."""
from pathlib import Path
import argparse,json,hashlib,shutil,os
p=argparse.ArgumentParser();p.add_argument('--repo',required=True);args=p.parse_args()
R=Path(__file__).resolve().parents[1];repo=Path(args.repo).resolve();version=json.loads((R/'package.json').read_text())['version'];V=version+'-pages.1'
assert (repo/'.git').exists();assert json.loads((R/'dist/version.json').read_text())['programVersion']==version
sha=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
public_version=json.loads((R/'dist/version.json').read_text());configured=public_version.get('onlineServerConfigured',False);server_origin=public_version.get('onlineServerOrigin');ephemeral=public_version.get('onlineRoomsEphemeral',False)
# A later generic check/build must never overwrite a correctly configured Pages build.
# Validate everything before copying even one file into the publication checkout.
hosting=json.loads((R/'deploy/github-pages.json').read_text())
for field,expected in [('onlineServerOrigin',hosting['serverOrigin']),('katagoAnalysisOrigin',hosting.get('analysisOrigin') or ''),('katagoExtremeOrigin',hosting.get('extremeAnalysisOrigin') or '')]:
 assert public_version.get(field)==expected,f'Pages configuration mismatch for {field}; run pnpm build:pages AFTER all checks, then publish.'
assert configured and public_version.get('onlineSiteOrigin')==hosting['siteUrl'].split('/weiqi/')[0]
assert public_version.get('katagoAnalysisConfigured')==bool(hosting.get('analysisOrigin'))
assert public_version.get('katagoExtremeConfigured')==bool(hosting.get('extremeAnalysisOrigin'))
if (R/'src/features/guided-play/GuidedPlay.tsx').exists():
 guided_check=json.loads((R/'docs/guided-play/checks/browser-local.json').read_text())
 assert guided_check.get('status')=='passed' and guided_check.get('programVersion')==version,'Current Guided Play browser journey must pass before publication; stale or failed evidence is rejected.'
 assert '53 passed (53)' in (R/'docs/guided-play/checks/guided-unit.log').read_text()

previous=json.loads((repo/'PUBLICATION.json').read_text()) if (repo/'PUBLICATION.json').exists() else {};revision=previous.get('revision',0)+1
site=[]
for path in sorted((R/'dist').rglob('*')):
 if path.is_file():
  rel=str(path.relative_to(R/'dist'));target=repo/rel;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(path,target);site.append({'path':rel,'bytes':path.stat().st_size,'sha256':sha(path)})
shutil.copy2(R/'deploy/render.yaml',repo/'render.yaml');shutil.copy2(R/'docs/online-tools/DEPLOYMENT.md',repo/'RENDER_SETUP.md')
(repo/'.nojekyll').write_text('\n');source=repo/'project';source.mkdir(exist_ok=True);entries=[]
exclude_dirs={'node_modules','.git','__pycache__','delivery','font-cache','runtime-data','.pnpm-store','.playwright-cli','.auth'};exclude_root={'dist','dist-engine','dist-server','dist-analysis','output'};exclude_files={'.DS_Store','tsconfig.tsbuildinfo','RELEASE_MANIFEST.json','release-manifest.json','SHA256SUMS.txt','SOURCE_INFO.json','.env'}
for folder,dirs,names in os.walk(R):
 relative=Path(folder).relative_to(R);dirs[:]=[name for name in dirs if name not in exclude_dirs and not name.startswith('lo-') and not (relative==Path('.') and name in exclude_root)]
 for name in sorted(names):
  if name in exclude_files or name.startswith('.env.') or name.endswith(('.pem','.p12','.key')):continue
  path=Path(folder)/name;rel=path.relative_to(R);target=source/rel;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(path,target);entries.append({'path':str(rel),'bytes':path.stat().st_size,'sha256':sha(path)})
(source/'SOURCE_INFO.json').write_text(json.dumps({'schemaVersion':1,'id':'GITHUB-CURRENT-SOURCE','revision':revision,'rulesetId':'GO-CLUB-AREA-1','resultVersion':V,'programVersion':version,'sourceBuild':'pnpm install --frozen-lockfile && pnpm build','note':'Buildable source and materials; installed dependencies, private data and generated root build/output excluded. Full release archive includes production builds and all evidence.','files':entries},ensure_ascii=False,indent=2)+'\n')
extreme_configured=public_version.get('katagoExtremeConfigured',False)
manifest={'schemaVersion':1,'id':'GITHUB-PAGES-PUBLICATION','revision':revision,'rulesetId':'GO-CLUB-AREA-1','resultVersion':V,'programVersion':version,'siteUrl':'https://sma084545-pixel.github.io/weiqi/','sourceDirectory':'project/','formalPuzzles':30,'terminalFixtures':6,'microLessonPrimarySlides':25,'routeStages':12,'advancedLessons':6,'advancedScenes':37,'guidedPlayRoute':'#/play/guided','guidedPlayOfflineLocalOpponent':True,'aiPlayRoute':'#/play/ai','aiDifficultyProfiles':['relaxed','standard','challenge','extreme'],'aiExtremeAvailable':extreme_configured,'aiPlayRequiresNetwork':True,'onlineServerConfigured':configured,'onlineServerOrigin':server_origin,'onlineRoomsEphemeral':ephemeral,'katagoAnalysisOrigin':public_version.get('katagoAnalysisOrigin'),'katagoAnalysisConfigured':public_version.get('katagoAnalysisConfigured',False),'katagoExtremeOrigin':public_version.get('katagoExtremeOrigin'),'onlineStatus':'Public room server configured; chat and floating-board verification retained in docs/floating-fit.' if configured else 'Room server not configured.','files':site,'sourceManifestSha256':sha(source/'SOURCE_INFO.json')}
(repo/'PUBLICATION.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');(repo/'SHA256SUMS.txt').write_text(''.join(f"{x['sha256']}  {x['path']}\n" for x in site)+f"{sha(repo/'PUBLICATION.json')}  PUBLICATION.json\n"+f"{sha(source/'SOURCE_INFO.json')}  project/SOURCE_INFO.json\n")
(repo/'README.md').write_text(f'''# 围棋社 · 最新版 {version}

**原网址：[打开学习工具](https://sma084545-pixel.github.io/weiqi/)**

真实KataGo AI对弈保留轻松/标准/挑战，并新增独立强模型“极致”。{'极致已配置免费独立服务，实际部署验收见本轮报告。' if extreme_configured else '极致服务等待启用，当前明确显示不可开始；原三档可继续使用。'}选择执色和5/9/13/19路，正常轮流落子，支持一手/最近回合悔棋、重做、棋局滑动条、本机续玩、JSON/SGF和赛后复盘。四档不对应人类段级位；结束后人工确认死子及面积计分。新着法需联网，不提供真人进行中胜率提示。

学习路线保留12课、37个进阶互动场景和原13路引导实战；课程6之后与首页新增[辅助下棋 / Guided Play](https://sma084545-pixel.github.io/weiqi/#/play/guided)。可选9/13路、逐级提示、局部反馈、本地教学机器人或现有KataGo对手；报告记录实际操作，不作能力评分。原局归档后可从关键局面重试。

自由双人对弈结束后，可手动调用Render上的真实KataGo，分析任一复盘局面并查看数字推荐、候选变化、黑方胜率和预计目差。保留悬浮小棋盘、画中画、最大化、聊天、完整教学、5/9/13/19路、回退和棋局滑动条。包含30道正式题、6个终局、可编辑课件、教具与主持材料；GO-CLUB-AREA-1、schemaVersion1及正式revision保持。

- [学习入口](https://sma084545-pixel.github.io/weiqi/#/home)
- [辅助下棋 · 和AI边下边学](https://sma084545-pixel.github.io/weiqi/#/play/guided)
- [与 AI 下一盘](https://sma084545-pixel.github.io/weiqi/#/play/ai)
- [自由双人对弈](https://sma084545-pixel.github.io/weiqi/#/play/free)
- [题目挑战](https://sma084545-pixel.github.io/weiqi/#/challenges)
- [教师工具](https://sma084545-pixel.github.io/weiqi/#/teacher)
- [联机状态](https://sma084545-pixel.github.io/weiqi/#/play/online)

旧缓存用户先保存，再点“保存已提交内容并应用”。页脚和[version.json](https://sma084545-pixel.github.io/weiqi/version.json)可核对{version}；不要清除站点数据来升级。本机进度/草稿/反馈留在浏览器，不默认上传。

## 联机边界

原网址的[联机双人对弈](https://sma084545-pixel.github.io/weiqi/#/play/online)通过独立HTTPS房间服务器{server_origin}同步。无需账号或真实姓名；一人建房，另一人输入房间码。免费部署房间是临时数据，休眠、重启或更新后可能重新开房；对局中可保存本机副本/导出。首次唤醒可能约一分钟，稍候重连。GitHub Pages继续提供静态网页，房间服务另在Render运行；本机进度/草稿/反馈不上传。实际验证及边界见[接入说明](ONLINE_SETUP.md)。

## AI 对弈与终局后复盘

[极致使用方法](project/docs/extreme-ai/USAGE.md) · [本轮验收与限制](project/docs/extreme-ai/ACCEPTANCE.md) · [免费部署与回滚](project/docs/extreme-ai/DEPLOYMENT.md)。原三档沿用已有Render KataGo服务，极致采用独立Free服务；API版本2与房间服务保持。没有新增付费资源、账号或默认反馈上传。

## KataGo 终局后复盘

在自由双人对弈结束（认输或双方确认计分）后，使用棋局滑动条选择局面，点击“分析当前复盘局面”。进行中不提供引擎建议。真实Eigen CPU引擎在独立Render服务运行；小模型与少量搜索仅作复盘参考，不改变人工确认的终局结果。首次休眠唤醒可能较慢，按需重试；不自动持续请求。

[部署、模型、限制和回滚](project/docs/katago/DEPLOYMENT.md) · [本次实测](project/docs/katago/ACCEPTANCE.md)。本机进度和反馈不发送，只在主动分析时发送该局起点、着法和贴目。

## 当前源码和工具包

[project/](project/)保存当前可构建源码、题库、材料和交接。从该目录执行：

```sh
pnpm install --frozen-lockfile
pnpm build:pages
pnpm start
# 发布到现有GitHub网站时使用：pnpm build:pages
```

Node版本要求见package.json；默认本机/局域网服务端口4190，Ctrl+C停止。私有runtime-data/凭据/已安装依赖不在仓库。

[最新已完成工具包、轻量软件与校验值](https://github.com/sma084545-pixel/weiqi/releases/latest)包含生产构建、全部可编辑材料、PDF/PPTX、交接和验证；本轮状态以project/handoff/GUIDED_PLAY.md及project/docs/guided-play/ACCEPTANCE.md为准，不把源码更新等同于正式全链路完成。历史source/0.16.0分卷只作溯源，不作为当前主线。

当前静态清单PUBLICATION.json、SHA256SUMS.txt；源码清单project/SOURCE_INFO.json。本次课程验收见[课程说明](project/docs/advanced-courses/IMPLEMENTATION.md)、[验收报告](project/docs/advanced-courses/ACCEPTANCE.md)；KataGo验收见project/docs/katago/，先前悬浮棋盘验收在project/docs/floating-fit/。自动化、实体制造与真人教学验证分别记录；不声称提高智商、治疗压力、改善学业或保证CAS认可。第三方许可证随docs和字体目录保留。
''')
(repo/'source/README.md').write_text('# 历史源码0.16.0\n\n仅保留旧分卷用于追踪。最新源码在../project/，完整包见仓库Release，不要用旧分卷覆盖当前主线。\n')
(repo/'.gitignore').write_text('project/node_modules/\nproject/dist/\nproject/dist-server/\nproject/dist-engine/\nproject/dist-analysis/\nproject/runtime-data/\nproject/.env\nproject/.env.*\n.DS_Store\n')
assert sum(x['bytes'] for x in entries)+sum(x['bytes'] for x in site)<1024**3;assert max(x['bytes'] for x in entries)<100*1024**2
print(json.dumps({'version':version,'staticFiles':len(site),'sourceFiles':len(entries),'sourceMiB':round(sum(x['bytes'] for x in entries)/1024**2,1),'onlineServerConfigured':configured,'serverOrigin':server_origin},ensure_ascii=False))
