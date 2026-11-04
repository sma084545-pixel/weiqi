---
schemaVersion: 1
id: DOC-REVIEW-ACCEPTANCE
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 0.27.1 验收

|检查|结果|证据|
|---|---|---|
|第0至最后一步、40手、原棋谱不变|通过|32项新增测试；browser-local.json流程A|
|轮次、初始摆子、提子、劫、自杀、Pass、认输、终局恢复|通过|tests/game-review/model.test.ts，固定独立预期|
|新分支独立保存、悔棋、重新尝试、恢复与返回原游标|通过|model/interaction测试；浏览器A/B|
|联机结束→关键手→落子前→真实AI续下；另一设备、结果与服务器revision不变|通过|browser-local.json流程B|
|全盘基础战术与最多4个真实引擎样本；错误不伪造结果|通过|分析模型与组件测试；浏览器实际/api/analyze响应|
|AI失败、取消、关闭、重复操作、配额写入失败|通过|新增模型和组件边界测试|
|626总单元测试及内容/引擎/构建检查|通过|checks/full-check.log|
|176既有浏览器+22联机/悬浮棋盘回归|通过|checks/browser-regression.log|
|360/768/1280、键盘、触屏模拟、减少动画|通过|browser-local.json与screenshots/|
|正式原网址A/B流程|通过|browser-public.json，0.27.1，真实原站与Render|
|完整包解压、逐文件摘要、干净安装与构建|待归档复查|发布目录verification/ARCHIVE_VERIFY.json|
|原生Safari/Firefox、实体设备、屏幕阅读器、真人课堂|未测|未将模拟或模型判断称为真人审核|

正式题库30题、6终局、37进阶场景及全部可编辑材料，保留性以checks/preservation.json为准。历史截图由旧回归重新写入时，当前截图另存本轮，原历史文件恢复为基线字节，不更新正式内容冻结清单。

本轮浏览器使用Chromium156；本机与原GitHub网址均通过同一个真实Render分析接口。具体请求数、模型、访问次数和耗时保存于报告，不能根据少量样本保证通用性能。最初浏览器失败为测试选择器/折叠列表/嵌入节点作用域，保留原日志并用最终报告区分。

当前最终验证：32项新增、85项受影响组件、170项AI/分析相关测试通过；626总单元测试和198浏览器回归通过。正式网站使用真实API响应，复盘样本2个局面、续下2次AI响应；这只是代表性样本，不是全盘准确率或负载证明。归档完整性必须查阅同SHA的外部复查报告。
