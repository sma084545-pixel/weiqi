---
schemaVersion: 1
id: T24-ACCEPTANCE-MATRIX
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 需求验收与证据分类

全部责任条款原文覆盖项仍在docs/requirements-matrix.md，本表给出最终入口/文件与证据。程序项358单元/组件+150浏览器测试、617跨介质检查均实际运行；材料项分别有源文件、几何、渲染及引用校验。

| 任务 | 范围 | 入口/文件 | 证据 | 数字验收 | 真人/实物 |
|---|---|---|---|---|---|
| T00 | 课程蓝图、统一规范与项目基础 | docs、schemas、src/core/*契约、src/components/Board、src/features/home | handoff/T00.md；tests/document-contract.test.ts、tests/validation.test.ts、tests/browser/t00.spec.ts | 通过（数字） | 未测 |
| T01 | 围棋规则引擎与状态历史 | src/core/rules | handoff/T01.md；tests/t01、tests/browser/t01.spec.ts | 通过（数字） | 未测 |
| T02 | 通用互动棋盘与可访问操作 | src/components/Board、src/features/home | handoff/T02.md；tests/board.test.tsx、tests/browser/t02.spec.ts | 通过（数字） | 未测 |
| T03 | 学习入口与自选学习路线 | src/features/learning-hub | handoff/T03.md；tests/t03、tests/browser/t03.spec.ts | 通过（数字） | 未测 |
| T04 | 找气、数气与先预测后验证 | src/features/liberty-lab、content/t04 | handoff/T04.md；tests/t04、tests/browser/t04.spec.ts | 通过（数字） | 未测 |
| T05 | 提子过程动画与因果反馈 | src/features/capture-lab、content/t05 | handoff/T05.md；tests/t05、tests/browser/t05.spec.ts | 通过（数字） | 未测 |
| T06 | 自由摆棋与规则模式切换 | src/features/experiment-board | handoff/T06.md；tests/t06、tests/browser/t06.spec.ts | 通过（数字） | 未测 |
| T07 | 同屏双人吃子小游戏 | src/features/capture-game；learning-hub注册/入口 | handoff/T07.md；tests/t07、tests/browser/t07.spec.ts | 通过（数字） | 未测 |
| T08 | 完整小棋盘对弈与终局确认 | src/features/full-game | handoff/T08.md；tests/t08、tests/browser/t08.spec.ts | 通过（数字） | 未测 |
| T09 | 30 张挑战题与 6 个终局示例 | content/puzzles、content/endgames、content/t09、content/tools | handoff/T09.md；content/tools/validate.mjs、test-grade.mjs、content/validation/ | 通过（数字） | 未测 |
| T10 | 互动判题、分层提示与未知分支处理 | src/features/puzzle-runner；learning-hub 注册/入口 | handoff/T10.md；tests/t10、tests/browser/t10.spec.ts | 通过（数字） | 未测 |
| T11 | 眼、假眼与基础死活演示 | src/features/life-lab；复用 src/features/puzzle-runner | handoff/T11.md；tests/t11、tests/browser/t11.spec.ts | 通过（数字） | 未测 |
| T12 | 开放判断题与同伴合作挑战 | src/features/cooperative | handoff/T12.md；tests/t12、tests/browser/t12.spec.ts | 通过（数字） | 未测 |
| T13 | 围地、终局辨认与数子练习 | src/features/territory | handoff/T13.md；tests/t13、tests/browser/t13.spec.ts | 通过（数字） | 未测 |
| T14 | 教师出题与答案变化编辑器 | src/features/teacher-editor | handoff/T14.md；tests/t14、tests/browser/t14.spec.ts | 通过（数字） | 未测 |
| T15 | JSON、SGF 与棋盘图导入导出 | src/features/file-exchange | handoff/T15.md；tests/t15、tests/browser/t15.spec.ts | 通过（数字） | 未测 |
| T16 | 离线运行、本机保存与版本迁移 | src/core/unified-persistence.ts、src/core/offline.ts、public/sw.js、src/features/offline-data | handoff/T16.md；tests/t16、tests/browser/t16.spec.ts | 通过（数字） | 未测 |
| T17 | 成员反馈与 CAS 迭代证据记录 | src/features/evidence；统一持久化 evidence 分区；schemas/t17-evidence.schema.json | handoff/T17.md；tests/t17、tests/browser/t17.spec.ts | 通过（数字） | 未测 |
| T18 | 磁性演示棋盘与可操作标记设计 | materials/demo-board | handoff/T18.md；materials/demo-board；T24逐页/材料/引用报告 | 通过（数字） | 未测 |
| T19 | 双人练习棋盘与便携棋具 | materials/pair-boards | handoff/T19.md；materials/pair-boards；T24逐页/材料/引用报告 | 通过（数字） | 未测 |
| T20 | 双面规则卡与自选学习路线卡 | materials/rule-cards | handoff/T20.md；materials/rule-cards；T24逐页/材料/引用报告 | 通过（数字） | 未测 |
| T21 | 30 张纸质挑战卡与教师答案册 | materials/challenge-cards | handoff/T21.md；materials/challenge-cards；T24逐页/材料/引用报告 | 通过（数字） | 未测 |
| T22 | 5 套可编辑微课 PPT 与讲解备注 | materials/micro-lessons | handoff/T22.md；materials/micro-lessons；T24逐页/材料/引用报告 | 通过（数字） | 未测 |
| T23 | 活动流程、同伴教学与教师手册 | materials/facilitator-kit | handoff/T23.md；materials/facilitator-kit；T24逐页/材料/引用报告 | 通过（数字） | 未测 |
| T24 | 整套集成、规则一致性审查与交付 | tests/integration、整套发布归档 | handoff/T24.md；tests/integration、整套发布归档；T24逐页/材料/引用报告 | 通过（数字） | 未测 |

T00证据是schemas与tests/validation/document-contract；T01引擎无独立网页入口；T09内容没有独立学习UI，由T10/T13引用；T18–T23为本地材料文件，无需冒造网页入口。T24归档已从干净目录安装、完整check、真实连续路线和README开发启动通过；最终ZIP完整性/构建/校验另见archive-recheck与ZIP旁ARCHIVE_CHECK.json；不将“文件存在”替代动作验收。

| 共享验收 | 状态 | 实际证据 |
|---|---|---|
| 规则/schema/版本/坐标/冻结 | 通过 | 201逐哈希、rules回归、617跨介质、release-inventory.json |
| 正式30题/6终局/25主讲页 | 通过 | 实际JSON/PDF/SVG/原生PPT与备注映射，开放/未终局边界保留 |
| 首次进入到反馈、出题、导入导出、离线备份完整动作 | 通过 | T24连续17步+既有150浏览器测试 |
| 360/768/1280、触摸模拟、键盘、减少动画 | 通过 | 实际Chromium页面动作和截图，不是设备实机 |
| PDF/PPT/DOCX全页、几何、灰度 | 通过 | 113PDF/459页渲染、315独立栅格全看、材料检查 |
| 无假记录/密钥/默认上传/远程核心 | 通过（所列检查） | 生产首次空态、TEST数据隔离、源代码扫描、连续路线0外部请求 |
| 原生Safari/Firefox/其他浏览器、专用辅助技术 | 未测 | Firefox启动环境失败；WebKit只作明确在线/来源停止控制实验 |
| 教师/学生/课堂/实体打印制造/CAS认定 | 未测 | 不生成实施证据；所有humanReviewed保留空 |
