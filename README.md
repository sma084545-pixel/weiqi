# 围棋社 · 最新版 0.22.0

**原网址：[打开学习工具](https://sma084545-pixel.github.io/weiqi/)**

自由双人对弈结束后，可手动调用Render上的真实KataGo，分析任一复盘局面并查看数字推荐、候选变化、黑方胜率和预计目差。保留悬浮小棋盘、画中画、最大化、聊天、完整教学、5/9/13/19路、回退和棋局滑动条。包含30道正式题、6个终局、可编辑课件、教具与主持材料；GO-CLUB-AREA-1、schemaVersion1及正式revision保持。

- [学习入口](https://sma084545-pixel.github.io/weiqi/#/home)
- [自由双人对弈](https://sma084545-pixel.github.io/weiqi/#/play/free)
- [题目挑战](https://sma084545-pixel.github.io/weiqi/#/challenges)
- [教师工具](https://sma084545-pixel.github.io/weiqi/#/teacher)
- [联机状态](https://sma084545-pixel.github.io/weiqi/#/play/online)

旧缓存用户先保存，再点“保存已提交内容并应用”。页脚和[version.json](https://sma084545-pixel.github.io/weiqi/version.json)可核对0.22.0；不要清除站点数据来升级。本机进度/草稿/反馈留在浏览器，不默认上传。

## 联机边界

原网址的[联机双人对弈](https://sma084545-pixel.github.io/weiqi/#/play/online)通过独立HTTPS房间服务器https://weiqi-rooms.onrender.com同步。无需账号或真实姓名；一人建房，另一人输入房间码。免费部署房间是临时数据，休眠、重启或更新后可能重新开房；对局中可保存本机副本/导出。首次唤醒可能约一分钟，稍候重连。GitHub Pages继续提供静态网页，房间服务另在Render运行；本机进度/草稿/反馈不上传。实际验证及边界见[接入说明](ONLINE_SETUP.md)。

## KataGo 终局后复盘

在自由双人对弈结束（认输或双方确认计分）后，使用棋局滑动条选择局面，点击“分析当前复盘局面”。进行中不提供引擎建议。真实Eigen CPU引擎在独立Render服务运行；小模型与少量搜索仅作复盘参考，不改变人工确认的终局结果。首次休眠唤醒可能较慢，按需重试；不自动持续请求。

[部署、模型、限制和回滚](project/docs/katago/DEPLOYMENT.md) · [本次实测](project/docs/katago/ACCEPTANCE.md)。本机进度和反馈不发送，只在主动分析时发送该局起点、着法和贴目。

## 当前源码和工具包

[project/](project/)保存当前可构建源码、题库、材料和交接。从该目录执行：

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm start
# 发布到现有GitHub网站时使用：pnpm build:pages
```

Node版本要求见package.json；默认本机/局域网服务端口4190，Ctrl+C停止。私有runtime-data/凭据/已安装依赖不在仓库。

[完整工具包、轻量软件与校验值](https://github.com/sma084545-pixel/weiqi/releases/tag/v0.22.0-pages.1)包含生产构建、全部可编辑材料、PDF/PPTX、交接和验证。历史source/0.16.0分卷只作溯源，不作为当前主线。

当前静态清单PUBLICATION.json、SHA256SUMS.txt；源码清单project/SOURCE_INFO.json。本次验收见project/docs/katago/，先前悬浮棋盘验收在project/docs/floating-fit/。自动化、实体制造与真人教学验证分别记录；不声称提高智商、治疗压力、改善学业或保证CAS认可。第三方许可证随docs和字体目录保留。
