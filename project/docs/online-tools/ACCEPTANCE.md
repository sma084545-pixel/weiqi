---
schemaVersion: 1
id: ONLINE-TOOLS-ACCEPTANCE
revision: 2
rulesetId: GO-CLUB-AREA-1
---

# 联机棋盘窗口与聊天验收

唯一基线RENDER_DEPLOY 0.20.3-pages.1；最终程序0.21.1、结果0.21.1-pages.1。实际公网后台0.21.0、protocolVersion=1、roomChat=1，与当前前端兼容。本轮用户要求的悬浮/独立画中画、最大化和双人聊天均已从原GitHub网址实际执行。规则GO-CLUB-AREA-1、schemaVersion1、正式题revision及冻结材料保持；没有真人教学或实体设备结论。

|检查|状态|证据|
|---|---|---|
|锁定安装、类型检查、生产网站/独立服务构建|通过|checks/build-pages.log、checks/full-check.log|
|完整399项单元/49文件|通过|checks/full-check.log；其中在线协议/服务/几何共14项，另有server-tests.log|
|正式30题+6终局、851项内容检查|通过|checks/full-check.log；不代表通用死活证明|
|既有静态浏览器176项|通过|checks/static-browser.log；本轮0.21.1实跑|
|真正Node服务+独立浏览器在线17项|通过|checks/browser-final.log；旧流程9项+新增8项|
|棋盘控制、超级劫/提子/自杀/终局确认/悔棋/回看|通过|继承并重跑原有引擎和在线回归；所有计算仍由同一引擎|
|聊天作者绑定、房间隔离、限长/限速、请求去重、50条上限、重启清空|通过|tests/online/server.test.ts、checks/server-tests.log|
|聊天文字安全、游戏revision独立、输入法/换行支持、刷新与离线草稿|通过|本地双上下文和原网站真实收发；公开文字不执行HTML|
|悬浮只读缩略图、鼠标拖动、方向键、夹边、回看同步|通过|在线浏览器实测；不变更棋局和同伴的回看位置|
|真实Document PiP开窗、独立小窗落子及对方着法同步|通过|Chromium本地实际API；公开Chrome155.0.8059.86再次实际执行，非mock|
|最大化/真实Fullscreen、拒绝时可见说明、焦点返回|通过|本地真实Fullscreen；另有明确注入拒绝的恢复测试，不冒称第二浏览器支持|
|360/768/1280、触屏模拟、键盘、reduced-motion|通过|本地17流程与截图；原网站三尺寸重复检查|
|旧客户端/旧后台协商兼容|通过|无capability时仍可对弈并提示更新；未订阅的旧客户端不收到新聊天消息|
|Pages配置与本地同源回退11项|通过|checks/pages-tests.log|
|原网站前端0.21.1 + 公网后台0.21.0|通过|checks/public-journey.json、checks/backend-health.json；双向聊天/独立PiP/放大/实际断网恢复，0页面异常|
|更新保留设备学习选择；正式题库仍30道|通过|原网址服务工作线程更新路径；public-journey.json|
|核心/规则/schema/内容/材料/原交接与锁文件保持|通过|checks/preservation.json：1040份受保护文件一致；历史生成图恢复，当前检查另存|
|最终ZIP CRC、内部SHA、干净解压构建/校验、无node_modules软件启动|通过|ZIP同目录ARCHIVE_CHECK.json及实际日志；任一失败不发布完成|
|实体设备/异地两条真实网络、Safari/Firefox、屏幕阅读器/真人教学|未测|本轮仅实际Chromium/Chrome与触屏模拟，不泛化为这些环境已通过|

程序运行代码公开提交44395b3d682ab45ccf073eabf6e5e23beecced78；后续证据/清单提交由GitHub发布元数据记录。网页原址 https://sma084545-pixel.github.io/weiqi/ ，联机 #/play/online，后台 https://weiqi-rooms.onrender.com。云端0.21.0由用户手动部署；0.21.1源码额外的非法协议报文错误通道加固仅在本地包验证，不冒称已部署到云端。这不影响已验证的合法落子、聊天和恢复流程，维护时可选更新。

保留过往失败以便复现：初轮只读缩略图测试使用等待aria-disabled点启用的点击方式超时；改为明确验证禁用并用原始指针确认没有副作用，组件仍只读。多轮测试复用旧自动化数据库累积100房间，触发正常容量限制；改为每轮独立私有临时目录，未删真实数据、未放宽生产限制。最终17项全过。相应历史失败日志仍在checks/。

构建有继承的前端体积提示，未阻断构建。聊天临时记录与免费房间保存边界、浏览器PiP限制见KNOWN_ISSUES.md；不记录公开排名或生成学生评价。

归档已从新目录实际解压并锁定安装/check/build；精确最终CRC/SHA和命令在ZIP同目录ARCHIVE_CHECK.json。轻量包以Chromium151.0.7922.34实际运行，含双人聊天、窗口、对弈、刷新恢复、保存、双停确认与1:1和棋JSON导出。裸软件启动不依赖已安装模块；Python解压与实际桌面双击分开，不将后者列通过。
