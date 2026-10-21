# 围棋社 · 最新版 0.20.2

**原网址：[打开学习工具](https://sma084545-pixel.github.io/weiqi/)**

同步此前尚未上线的教学、反馈、完整自由双人对弈、5/9/13/19路选择、回退和棋局滑动条。包含30道正式题、6个终局、可编辑课件、教具与主持材料；GO-CLUB-AREA-1、schemaVersion1及正式revision保持。

- [学习入口](https://sma084545-pixel.github.io/weiqi/#/home)
- [自由双人对弈](https://sma084545-pixel.github.io/weiqi/#/play/free)
- [题目挑战](https://sma084545-pixel.github.io/weiqi/#/challenges)
- [教师工具](https://sma084545-pixel.github.io/weiqi/#/teacher)
- [联机状态](https://sma084545-pixel.github.io/weiqi/#/play/online)

旧缓存用户先保存，再点“保存已提交内容并应用”。页脚和[version.json](https://sma084545-pixel.github.io/weiqi/version.json)可核对0.20.2；不要清除站点数据来升级。本机进度/草稿/反馈留在浏览器，不默认上传。

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

[完整工具包、轻量软件与校验值](https://github.com/sma084545-pixel/weiqi/releases/tag/v0.20.2-pages.1)包含生产构建、全部可编辑材料、PDF/PPTX、交接和验证。历史source/0.16.0分卷只作溯源，不作为当前主线。

当前静态清单PUBLICATION.json、SHA256SUMS.txt；源码清单project/SOURCE_INFO.json。验收见project/docs/github-pages/。自动化、实体制造与真人教学验证分别记录；不声称提高智商、治疗压力、改善学业或保证CAS认可。第三方许可证随docs和字体目录保留。
