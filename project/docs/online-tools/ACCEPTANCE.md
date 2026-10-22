---
schemaVersion: 1
id: ONLINE-TOOLS-ACCEPTANCE
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 联机窗口与聊天验收（公网服务器更新前）

基线RENDER_DEPLOY 0.20.3-pages.1；程序0.21.0、结果0.21.0-pages.1。保留共同规则、schema与冻结内容。以下来自实际命令/浏览器，不是教师或真人教学审核。

|检查|状态|证据|
|---|---|---|
|干净锁定安装、类型检查及生产构建|通过|checks/build-pages.log、checks/full-check.log|
|完整单元检查398项/49文件|通过|checks/full-check.log；含13项在线协议/服务/几何检查|
|正式30题、6终局、851项内容核查|通过|checks/full-check.log；检查记录不代表通用死活证明|
|原有静态浏览器流程176项|通过|checks/static-browser.log|
|实际Node服务双上下文在线浏览器16项|通过|checks/browser-final.log；9项旧流程+7项新增|
|5/9/13/19原规则、提子/自杀/终局/悔棋/回看|通过|既有单元与在线端到端回归，未写另一套引擎|
|聊天座位鉴权/隔离、字段拒绝、限速、去重、50条上限、重启清空|通过|checks/server-tests.log、tests/online/server.test.ts|
|HTML文字安全渲染、发消息不增加棋局revision、刷新重连、离线草稿|通过|在线浏览器实测；checks/browser/chat.png|
|悬浮拖动、方向键、夹边、只读及历史同步|通过|在线浏览器实测，原始指针点只读点不改变棋局|
|360/768/1280、手机触屏模拟、键盘、减少动画与放大焦点返回|通过|checks/browser/*-maximized.png|
|Document PiP真实开窗、双方着法同步；Fullscreen真实进入/退出|通过|Chromium实际API调用；checks/browser/native-pip.json|
|旧后台/旧客户端兼容|通过|hello去能力的浏览器检查；未订阅旧客户端不接收聊天；同局仍能下棋|
|Pages配置、保留本地同源回退|通过|checks/pages-tests.log，11项|
|原GitHub网站发布与公网双人窗口/聊天|未测，待服务器更新|公开后台检查仍是0.20.2，无roomChat能力；不能标聊天已上线|
|新归档从干净目录复验|待打包后执行|尚未用旧包冒充本版|
|实体手机/两台实体异地设备/屏幕阅读器/真人教学|未测|本轮无此证据|

初轮新增悬浮测试使用会等待aria-disabled点启用的定位器，导致测试超时；确认只读是正确行为，改为验证aria禁用并用真实指针点击确认无副作用，再跑全套16项通过。失败日志保留browser-tests.log，不删除历史失败。没有通过修改组件开放只读来迎合测试。

构建有继承的前端体积提示，未发现阻断规则或本地关键流程的问题。公网聊天仍需用户在Render部署已提交的新后端；最终统计、提交与归档证据将在完成后补充，不把代码推送等同上线。
