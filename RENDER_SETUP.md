---
schemaVersion: 1
id: RENDER-PUBLIC-DEPLOYMENT
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 原网站联机部署与维护

原入口 https://sma084545-pixel.github.io/weiqi/#/play/online；房间服务 https://weiqi-rooms.onrender.com；公共 WSS 路径 /api/online/ws。无需注册账号或真实姓名，一人创建房间并发出房间码，另一人从原入口加入。

2026-10-21 实测服务健康和 WSS 握手，programVersion=0.20.2、protocolVersion=1、GO-CLUB-AREA-1，邀请链接返回原 /weiqi/ 路径；无关来源连接返回403。前端0.20.3仅增加公开接入配置与临时保存提示，后端规则和消息模型未变，可以与已运行0.20.2服务配合。云端实际构建提交、账户计费及地区未从后台读取：浏览器站点权限仍阻止助手访问 dashboard.render.com，不声称已检查这些设置。

## 构建与原网址发布

源码 deploy/github-pages.json 只含公开配置，不含秘密。运行 corepack pnpm install --frozen-lockfile，再 corepack pnpm build:pages；脚本读取配置并设置 VITE_ONLINE_SERVER_URL、VITE_ONLINE_SITE_ORIGIN、VITE_ONLINE_EPHEMERAL_ROOMS。只有配置中的网站来源使用 Render，本地软件继续连自己的 Node 服务。普通 pnpm build 仍为无公网注入的本地构建；请勿手工改已生成 JS 或只更换版本号。公网配置会进入前端，不能放 API 密钥。

scripts/sync-github-pages.py 将公开构建放现有仓库根、源码和材料放 project/，保留旧哈希资源供旧页面完成保存后更新。渲染配置同步保存在根 render.yaml 和工程 deploy/render.yaml。规则、schema、正式题、材料与锁文件保持基线。更新说明见 ONLINE_SETUP.md，实际验收见 ACCEPTANCE.md；不由路由存在推断联机成功。

## Render 配置

单个 Node Web Service；源码根 project；构建 corepack pnpm install --frozen-lockfile --prod=false && corepack pnpm build；启动 node dist-server/server.mjs；健康检查 /api/online/health。NODE_VERSION=22.23.3，HOST=0.0.0.0，PORT由Render提供；PUBLIC_ORIGIN=https://sma084545-pixel.github.io（不带路径），PUBLIC_APP_URL=https://sma084545-pixel.github.io/weiqi/#/play/online。服务器私有文件 GO_CLUB_DATA_FILE=/tmp/go-club/rooms.json 不在静态目录，不能公开或提交Git。所有共享数据只由一个服务进程处理，不启多实例。

自动部署在已交付 Blueprint 中关闭。以后修改服务器时，让双方先保存本机副本/导出，再由维护者在Render手动部署；不要在下棋中途更新实例。当前上线后台0.20.2与前端0.20.3协议兼容，不为仅接入前端强制重启正在运行的后台。没有修改计费、添加数据库或付费磁盘。

## 临时房间与故障恢复

按免费实例部署：无入站流量15分钟后可能休眠，唤醒约一分钟；休眠、重启、重新部署会丢失临时文件。不要把本地原子写盘测试当作Render持久化证明。界面明确提醒临时房间、保存本机副本及JSON导出；房间失效后重新建房，本地已保存棋局不随房间清空。页面短暂掉网且服务房间仍在时，保留当前标签页并联网重连，可用本会话座位恢复；关闭浏览器会话可能失去匿名座位。没有账号或跨设备身份恢复。

首次连接未就绪：等待实例唤醒后点“重新连接”。网络离线：本机课程和同屏对弈可用，房间不能断网同步。原网站仍显示旧版：先保存正在编辑/对弈的内容，等待“新版本已准备好”，点击“保存已提交内容并应用”；页脚应为0.20.3，不清站点数据。服务不可用或房间丢失：导出本页保留的棋局，返回大厅重开，也可先使用同屏对弈。

若希望长期跨重启保留房间，需另行明确选择持久存储方案；本次没有购买。实际双实体设备、独立网络和长时间运维仍需现场检验。

来源（2026-10-21访问）：https://render.com/docs/free 、https://render.com/docs/websocket 、https://render.com/docs/blueprint-spec 、https://vite.dev/guide/env-and-mode 。
