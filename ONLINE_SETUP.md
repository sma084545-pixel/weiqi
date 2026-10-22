---
schemaVersion: 1
id: GITHUB-PAGES-ONLINE-SETUP
revision: 5
rulesetId: GO-CLUB-AREA-1
---

# 原网址联机与整盘小窗

网站https://sma084545-pixel.github.io/weiqi/ ，联机入口#/play/online，前端0.21.3。后台https://weiqi-rooms.onrender.com，现有0.21.0/协议1/roomChat=1保持兼容，无需为本项重启服务器。

一人建房、一人填8位房间码，各操作自己的执色；默认9路、贴目0，可选5/13/19路。悬浮与独立画中画均完整显示整盘，随小窗宽高适配，直接点击落子；回看时只读。精细操作可放大棋盘。停两手后仍需双方确认死子清单才计算面积胜负，不自动猜任意局面的死活。

旧网页先保存棋局，再点“保存已提交内容并应用”，页脚核对0.21.3；不要清站点数据。只有房间昵称、对弈、聊天与连接状态发往房间服务，本机进度、教师草稿、成员反馈不上传。

免费实例首次唤醒可能约一分钟。房间与最近聊天临时保存，服务休眠/重启/部署可能清空；对弈中保存本机副本或导出。短暂断网不判负，同会话可恢复仍在的房间；离线不能同步对弈。独立PiP浏览器不支持时回退页内悬浮盘。

源码project/；公开构建corepack pnpm build:pages，普通构建pnpm build供本机/局域网同源服务。PRIVATE凭据不进入VITE_公开配置。现有部署的PUBLIC_ORIGIN与PUBLIC_APP_URL不变，自动部署保持关闭。

本轮交接project/handoff/ONLINE_FLOATING_FIT.md；使用、检查与限制project/docs/floating-fit/。归档Release v0.21.3-pages.1。继承材料和规则未改；不把自动检查称为真人教学或实体设备测试。
