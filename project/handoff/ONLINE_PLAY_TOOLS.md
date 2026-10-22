---
schemaVersion: 1
id: HANDOFF-ONLINE-PLAY-TOOLS
revision: 2
rulesetId: GO-CLUB-AREA-1
---

taskId: ONLINE_PLAY_TOOLS
baseVersion: RENDER_DEPLOY 0.20.3-pages.1
resultVersion: 0.21.1-pages.1
programVersion: 0.21.1
rulesetId: GO-CLUB-AREA-1
schemaVersion: 1
status: complete

以旧完整归档SHA-256 bf1fb90395e4d2b5970647edc944d13d6501795dffbb36d4d54a41dafce7f505 解压的隔离副本为唯一主线，不改sources/和旧封存包。内部0.21.0是发布前的阶段记录，不作为最终最新交付；唯一最终归档0.21.1-pages.1。

## 修改文件

src/features/online-game/{BoardDisplayTools.tsx,RoomChat.tsx,OnlineTools.css,OnlineGame.tsx,client.ts,protocol.ts}；server/{rooms.ts,http.ts}；src/components/Board.tsx仅改受控焦点的ownerDocument；package.json/src/core/version.ts版本；tests/online/、tests/browser/online-tools.spec.ts、测试配置；scripts/的构建/检查/打包/发布工具；本轮docs/online-tools/和维护说明。完整逐文件清单docs/online-tools/changed-files.json。

新增页内可拖动只读缩略图、真正Document PiP、窗口最大化/系统全屏、房间双人文字聊天。所有棋盘复用受控Board和同一OnlineClient；不计算另一套落子/提子/计分。聊天需hello能力协商+已入座后enable-chat，旧客户端不收到陌生消息；不增加棋局revision/历史，不写棋谱/服务器房间文件。最多50条进程内记录，限长500、每座位3秒3条、最近64请求去重。没有新账号、数据库、付费服务或默认本机学习数据上传。

规则/schema、正式30题/6终局、材料、锁定依赖保持；1040份受保护文件一致。测试生成的历史图恢复原字节，当前证据另存；正式内容无迁移或再冻结要求。

## 实际测试命令和人工检查

- corepack pnpm install --frozen-lockfile
- corepack pnpm check：399项/49文件、851内容校验、现有独立引擎/离线/编辑/备份/反馈检查通过。
- corepack pnpm test:online：14项真实HTTP/WS、隔离、重放、聊天限制/去重/上限与重启检查通过。
- corepack pnpm exec playwright test --workers=1：既有176项静态端到端通过。
- ONLINE_EVIDENCE_ROOT=docs/online-tools/checks/browser/regression corepack pnpm test:online-browser：独立Node服务17项通过，含真实PiP和Fullscreen，以及注入拒绝后的明确恢复测试。
- corepack pnpm test:pages：11项通过。
- corepack pnpm build:pages：生产网页与独立Node服务构建通过。
- python3 scripts/verify-online-tools-preservation.py --restore-generated：核心/内容/材料/锁/原交接不变。
- python3 scripts/run-online-tools-browser.py scripts/online-tools-public.js docs/online-tools/checks/public-journey.json：原GitHub网址0.21.1，Chrome155.0.8059.86双独立上下文，真实双向聊天、文字不执行HTML、聊天不改棋局revision、刷新和禁用网络恢复、独立PiP落子、三尺寸最大化均通过，0页面异常。
- scripts/verify-online-tools-archive.py --release <ZIP目录> --extract <全新目录>：验证CRC/SHA/正式数量和关键文件，干净安装/check/build。软件包在无node_modules的新目录实际运行，再用scripts/smoke-online-tools-app.mjs实测双人聊天、对弈、窗口、保存、确认终局和导出。最终证据随ZIP同目录ARCHIVE_CHECK.json、日志和SHA256SUMS交付；不能用旧包检查代替。

视觉检查本地360/768/1280放大页、公开原网址放大页与聊天页截图；手机19路保留局部滚动和准确落点；文字/黑白棋/坐标可读。未制作新的PDF/PPT，不把继承材料称为本轮重新实印/真人试教。

## 失败与未测、兼容边界

历史失败保留并已解决：只读点测试等待启用而超时；旧固定自动化目录达到100房间容量。最终每次使用独立私有测试目录，不删除真实棋局，不放宽生产容量。构建体积提示不阻断。

实际云端后台是用户手动部署的0.21.0（roomChat=1），与0.21.1网页协议兼容，用户所需功能均已公开验证。0.21.1源码另加固非法报文的错误通道/请求ID，只在本地验证，云端该细节仍为0.21.0；这是非阻断防御性提示差异，可在计划维护时手动更新，不冒称后台补丁已部署。

实体双设备/两条异地网络、Safari/Firefox、屏幕阅读器和真人教学未测。独立PiP受浏览器支持限制，有页内浮图替代；聊天和免费房间为临时记录，服务休眠/重启/更新可能清空，先保存棋谱。不制造教学收益、反馈、CAS工时或人类审核。

## 迁移和下一步

无规则/schema/存储主版本迁移。旧页面先保存当前工作，再应用更新，勿清站点数据。聊天不迁移也不进入棋谱。更新Render前双方保存/导出，再由维护者手动部署；保持原PUBLIC_ORIGIN、原GitHub/weiqi地址和单实例配置。

后续从本版本完整ZIP或GitHub project/继续；必读本交接、docs/online-tools/{USAGE,INTERFACES,ACCEPTANCE,KNOWN_ISSUES}.md、共同规则/schema和精确内容冻结清单。发布时记录在work/release/LATEST.json；源项目和构建、完整内容/材料、工具、检查记录均在完整ZIP，不含已安装依赖或私有房间数据。

归档预验完成：完整ZIP/软件ZIP均CRC与内部SHA通过，新目录锁定安装、399单元/851内容与构建通过；无node_modules软件实测双人聊天、窗口、合法轮流、恢复、本机保存、双停确认1:1和棋及无凭据GameState导出通过。最终发布前再次对最终归档复验，报告与校验值位于ZIP同目录。macOS启动脚本恢复可执行位；未声称实际双击GUI或真人教学验证。
