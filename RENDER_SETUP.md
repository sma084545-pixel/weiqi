---
schemaVersion: 1
id: ONLINE-TOOLS-DEPLOYMENT
revision: 3
rulesetId: GO-CLUB-AREA-1
---

# 更新原网站与房间服务器

当前0.21.3修正悬浮/独立小窗整盘显示；基线0.21.2-pages.1。仅前端更新，原Render0.21.0兼容，无需重新部署。实际证据与新说明在docs/floating-fit/，以下保留历史部署过程。

当前0.21.2仅更新悬浮小棋盘交互，无需重新部署Render。主线底本0.21.1-pages.1，现有0.21.0后台兼容；用原网站等待更新后核对页脚0.21.2即可。新说明与实际验证在docs/floating-play/。以下保留0.21.1首次窗口/聊天部署过程，不能将历史待部署说明当成当前状态。

唯一主线基线RENDER_DEPLOY 0.20.3-pages.1，新程序0.21.1（结果版本0.21.1-pages.1）。GitHub仓库sma084545-pixel/weiqi，静态网站仍为https://sma084545-pixel.github.io/weiqi/；源码目录project/；房间地址https://weiqi-rooms.onrender.com。

网站构建：`corepack pnpm install --frozen-lockfile`、`corepack pnpm build:pages`。普通`pnpm build`保持本地同源房间；公开配置仅在原GitHub来源启用Render。私有房间文件和凭据不进入Git、ZIP或静态目录。

Render配置沿用原Free单实例、Node22.23.3、根project、构建`corepack pnpm install --frozen-lockfile --prod=false && corepack pnpm build`，启动`node dist-server/server.mjs`，健康路径`/api/online/health`。原PUBLIC_ORIGIN与PUBLIC_APP_URL保持；无需数据库、聊天第三方服务或额外密钥。

现有Blueprint关闭自动部署。新聊天功能需要部署新后端：双方先保存本机副本或导出当前对局，再由用户打开已有weiqi-rooms服务，点击Manual Deploy → Deploy latest commit。重新部署可能清空免费服务临时房间和聊天；部署后重新开房。本轮没有更改付费方案、地区或访问用户凭据。

本轮助手不能访问Render后台（已保存的浏览器站点权限阻止dashboard.render.com，前次授权修改后仍被工具拒绝）。因此不绕过此限制访问后台API或密钥；已准备好完整代码、构建和部署配置后，请用户操作一次手动部署。真正部署完成以公开健康检查programVersion=0.21.1、capabilities.roomChat=1和原网站两个独立会话实测为准，不能仅以代码推送认定聊天上线。

新服务器继续使用protocolVersion=1，并在hello声明可选roomChat=1。新客户端入座后发送enable-chat才订阅聊天，旧客户端不会收到未知聊天消息。新页面连旧后端可正常下棋并诚实提示聊天待更新。无规则/schema/存储主版本迁移；不修改正式题库与冻结材料。

本地：构建后`node dist-server/server.mjs`，打开终端给出的本机/同网地址。软件包自带dist和独立服务文件，有兼容Node即可启动；不依赖node_modules运行。本机/同网地址不能自动变为异地公网地址。


兼容说明：0.21.1网页与带roomChat=1的0.21.0后台可配合，合法落子、聊天、恢复与计分行为相同。0.21.1后台源码另改进非法报文错误通道；若公网仍为0.21.0，该防御性提示改进留待下次计划手动部署，不冒称已在云端运行。是否达到本轮用户功能，以原网站实际双人收发和棋盘窗口测试为准。


2026-10-22用户完成手动部署后，公开健康检查确认programVersion=0.21.0、capabilities.roomChat=1，已从原GitHub网址真实验证双方收发、放大模式聊天、刷新及断网重连。最终网页0.21.1沿用协议1与该后台；不要求为静态显示与错误提示收尾再次重启正在使用的房间。
