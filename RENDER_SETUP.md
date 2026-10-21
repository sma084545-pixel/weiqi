---
schemaVersion: 1
id: RENDER-ONLINE-DEPLOYMENT-HANDOFF
revision: 1
rulesetId: GO-CLUB-AREA-1
baseVersion: 0.20.2-pages.1
status: configuration-ready-cloud-deployment-pending
---

# 接通原网址的联机服务

原网址保持 https://sma084545-pixel.github.io/weiqi/ 。目前房间后台尚未创建或验证，网页仍如实显示“服务未接入”；本文件和 render.yaml 只是已校验的部署配置，不代表异地对弈已经上线。

[在 Render 中查看并部署此配置](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fsma084545-pixel%2Fweiqi)

## 用户需要完成的一步

打开上面的 Render 部署入口。它会读取本仓库根的 render.yaml，展示待创建的 weiqi-rooms 服务。核对为一个 Free Web Service、Singapore、根目录 project，不附加磁盘、数据库或付费计划；确认后由你完成部署。若已存在同用途服务，先使用现有服务，不重复创建。若页面要求购买或添加付款方式，先停止，不必为本配置购买服务。

等待服务显示 Live，将 Render 实际给出的 https://…onrender.com 地址发回当前对话（只是公开服务地址，不要发密码或令牌）。助手即可继续提升程序补丁版本、设置公开的 VITE_ONLINE_SERVER_URL、构建并更新原 GitHub Pages 网站，再从原网址的两个独立浏览器会话实际验证建房、加入和同步。

浏览器当前仍以保存的权限策略拒绝助手读取 dashboard.render.com，所以创建服务必须先由用户在已登录页面操作。没有通过其他浏览器、底层调试、Render API 或凭据读取绕过访问限制。

## 配置已经包含

- 仓库 sma084545-pixel/weiqi，分支 main，源码根目录 project；仓库根是 GitHub Pages 成品，不能误作 Node 源码根。
- Node 22.23.3；项目锁定 pnpm 11.19.0，通过 Corepack 使用。
- 构建：corepack pnpm install --frozen-lockfile --prod=false && corepack pnpm build
- 启动：node dist-server/server.mjs
- 健康检查：/api/online/health；PORT 自动读取 Render 提供值，监听 0.0.0.0。
- PUBLIC_ORIGIN=https://sma084545-pixel.github.io；PUBLIC_APP_URL=https://sma084545-pixel.github.io/weiqi/#/play/online。邀请链接保留原网址与路径，Origin 不放宽为任意来源。
- 单实例、关闭自动部署，避免后续普通提交打断现有房间。更新后台时先让双方保存当前棋局。
- GO_CLUB_DATA_FILE=/tmp/go-club/rooms.json，仅保存房间所需数据，学习进度、教师草稿、成员反馈不上传到后台。

## 免费服务边界

Render 官方说明：免费服务无入站流量 15 分钟后休眠，唤醒约需一分钟；休眠、重启、重部署都会丢失临时文件。这个免费配置没有持久磁盘，房间属于临时房间，不能保证重启后续局。请使用棋局“保存本机副本/导出”，后台重启后可重新开房；本机学习资料和反馈仍在原浏览器。工作区免费额度、现有计费/用量设置以你的 Render 页面为准，当前未读取或修改这些设置。

## 验证状态

通过：以 0.20.2-pages.1 完整归档独立解压，干净锁文件安装；8 项 Node HTTP/WebSocket 服务测试、8 项前端接入配置测试；生产构建；Render 官方 JSON Schema 结构校验和 Free/单实例/来源/路径等精确断言。官方通用 format 校验未启用，已知 HTTPS 地址另作精确核对。

未执行：Render 云端构建、实际 HTTPS 服务健康、公开 WSS 连接、原网站两浏览器建房同步、物理双设备异地网络、休眠后行为。不能把本地测试通过等同于云端部署通过。

## 后续完成条件

取得真实后台地址后，确保 PUBLIC_ORIGIN 和 PUBLIC_APP_URL 仍为上述原网址；前端使用实际后台 HTTPS 源构建。程序版本与离线清单同步提升，原用户保存后应用更新，无需清除站点数据；Render 后台手动部署同一版本。用两个独立浏览器会话从原 GitHub Pages 路径验证角色/轮次、提子与非法动作、双方悔棋、重新连接、停手和双方终局确认。然后生成最新归档、SHA-256 和最终交接，更新 LATEST；现阶段不把“已准备配置”标为完成部署。

## 来源

访问日期 2026-10-21：

- https://render.com/docs/deploy-to-render
- https://render.com/docs/blueprint-spec
- https://render.com/schema/render.yaml.json
- https://render.com/docs/node-version
- https://render.com/docs/deploys
- https://render.com/docs/websocket
- https://render.com/docs/free
