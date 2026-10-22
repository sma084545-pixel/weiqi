---
schemaVersion: 1
id: HANDOFF-ONLINE-PLAY-TOOLS
revision: 1
rulesetId: GO-CLUB-AREA-1
---

taskId: ONLINE_PLAY_TOOLS
baseVersion: RENDER_DEPLOY 0.20.3-pages.1
resultVersion: 0.21.0-pages.1
programVersion: 0.21.0
rulesetId: GO-CLUB-AREA-1
schemaVersion: 1
status: implementation-verified-public-chat-awaiting-server-update

本轮以已封存完整归档的SHA-256 bf1fb90395e4d2b5970647edc944d13d6501795dffbb36d4d54a41dafce7f505 解压的隔离副本为唯一主线；不改sources/或已封存旧归档。

修改文件：src/features/online-game/{BoardDisplayTools.tsx,RoomChat.tsx,OnlineTools.css,OnlineGame.tsx,client.ts,protocol.ts}，server/{rooms.ts,http.ts}，src/components/Board.tsx焦点所属文档，package.json/src/core/version.ts版本，测试/发布脚本与本次说明。完整逐文件清单在docs/online-tools/changed-files.json生成。

本次增加：同局受控显示的页内悬浮只读缩略图、独立Document PiP、窗口最大化/系统全屏、房间文字聊天。聊天能力可选协商；仅已订阅且有座位的连接可读写，历史最多50条内存保存，服务重启清空，不写棋谱、不增加棋局revision。共同规则/schema、正式30题/6终局、材料及锁文件不变；没有新账号/数据库/付费服务。

实际测试命令：corepack pnpm install --frozen-lockfile；corepack pnpm test:online；corepack pnpm build；ONLINE_EVIDENCE_ROOT=docs/online-tools/checks/browser/regression corepack pnpm test:online-browser；corepack pnpm check；corepack pnpm exec playwright test --workers=1；corepack pnpm test:pages。日志在docs/online-tools/checks/。初轮悬浮图测试等待aria-disabled点点击而超时，改为验证禁用并以原始指针点击确认无副作用后重跑；不是通过改组件绕过只读。

本地联机检查包含两个独立浏览器会话、360/768/1280、键盘/触屏模拟、reduced-motion、真实Document PiP API开窗与同伴着法同步、实际Fullscreen、断网输入恢复、旧后台能力降级；具体最终统计见ACCEPTANCE.md。真人教学、实体异地双设备、屏幕阅读器及未执行浏览器不列通过。

失败/未测：公网聊天更新和公网全流程必须在现有Render服务部署新后端之后复验。浏览器权限仍阻止助手访问Render后台，不绕过限制访问API；维护者需在已有服务手动部署最新提交。当前不能把静态Pages发布等同聊天已上线。

迁移：无schema/规则或存储主版本迁移。旧页面先保存当前工作再应用更新；不要清站点数据。聊天为瞬时记录不迁移。Render重启可能清空临时房间，先保存/导出棋局再手动更新；随后重开房间。保持原GitHub网址、PUBLIC_ORIGIN和房间源。
