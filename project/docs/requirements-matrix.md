---
schemaVersion: 1
id: DOC-REQUIREMENTS-MATRIX
revision: 20
rulesetId: GO-CLUB-AREA-1
---

# T00–T24责任与验收矩阵

任务名称和范围来自实际1.1.0任务包，路径/哈希见input-manifest.json。状态是本次实际状态；后续目录是责任约定，不代表已创建功能。T00–T23 已实际集成；T24最新数字验收见docs/t24/acceptance-matrix.md。历史验收与当前复验区分；实物与真人审核未测。所有任务更新 handoff/任务ID.md。

| ID | 正式模块名称 | 所有范围覆盖项 | 责任模块 | 验收位置 | 当前状态 |
|---|---|---|---|---|---|
| T00 | 课程蓝图、统一规范与项目基础 | beginner pathway 与混合水平分流；统一术语与课程目标；统一规则、数据模型、接口和版本交接；可运行工程基础 | docs、schemas、src/core/*契约、src/components/Board、src/features/home | docs/ACCEPTANCE.md、tests、output/validation；后续实屏补证见T02 | T24现版数字回归通过；Chromium150项与WebKit在线完整路线；实机/辅助技术/真人教学未测 |
| T01 | 围棋规则引擎与状态历史 | 棋块与去重气计算；提子、自杀禁着、位置超级劫；撤回重做与完整历史恢复；停手、终局状态、认输；面积计分纯函数及规则测试 | src/core/rules | 原prompts/T01_rules_engine.md中验收条款；handoff/T01.md；tests/t01、docs/t01/ACCEPTANCE.md、RULE_TRACE.md | T24现版数字回归通过；Chromium150项与WebKit在线完整路线；实机/辅助技术/真人教学未测 |
| T02 | 通用互动棋盘与可访问操作 | 5/9/13/19 路统一棋盘；气环、目标、顺序和最后一手标记；触屏、键盘、投影及小屏操作 | src/components/Board、src/features/home | handoff/T02.md；tests/board.test.tsx、tests/browser/t02.spec.ts；docs/t02/ACCEPTANCE.md | T24现版数字回归通过；Chromium150项与WebKit在线完整路线；实机/辅助技术/真人教学未测 |
| T03 | 学习入口与自选学习路线 | 新手入口与自选学习路径；模块导航、返回和可用状态；低压力学习进度与教师入口 | src/features/learning-hub | handoff/T03.md；tests/t03；tests/browser/t03.spec.ts；docs/t03/ACCEPTANCE.md | T24现版数字回归通过；Chromium150项与WebKit在线完整路线；实机/辅助技术/真人教学未测 |
| T04 | 找气、数气与先预测后验证 | 点击棋块并显示全部气；圈气集合评测；预测气数后揭示；数气误区对比演示 | src/features/liberty-lab、content/t04 | handoff/T04.md；tests/t04；tests/browser/t04.spec.ts；docs/t04/ACCEPTANCE.md | T24现版数字回归通过；Chromium150项与WebKit在线完整路线；实机/辅助技术/真人教学未测 |
| T05 | 提子过程动画与因果反馈 | 先预测被提棋子再验证；落子—检查—提子分步动画；合法提子与自杀禁着对比；动画撤回、重置与取消 | src/features/capture-lab、content/t05 | handoff/T05.md；tests/t05；tests/browser/t05.spec.ts；docs/t05/ACCEPTANCE.md | T24现版数字回归通过；Chromium150项与WebKit在线完整路线；实机/辅助技术/真人教学未测 |
| T06 | 自由摆棋与规则模式切换 | 自由放黑白、擦除、标记、尺寸切换；摆棋验证与按规则试下切换；临时局面保存及导出 | src/features/experiment-board | handoff/T06.md；tests/t06；tests/browser/t06.spec.ts；docs/t06/ACCEPTANCE.md | T24现版数字回归通过；Chromium150项与WebKit在线完整路线；实机/辅助技术/真人教学未测 |
| T07 | 同屏双人吃子小游戏 | 同屏吃子小游戏与首提即时胜负；双方同意悔棋、交换颜色重开；终局最后五手引擎快照回看并接入T08 | src/features/capture-game；learning-hub注册/入口 | handoff/T07.md；docs/t07/ACCEPTANCE.md；tests/t07；tests/browser/t07.spec.ts | T24现版数字回归通过；Chromium150项与WebKit在线完整路线；实机/辅助技术/真人教学未测 |
| T08 | 完整小棋盘对弈与终局确认 | 完整9/13/19路对弈和自由让子；停手、死子双方确认、争议恢复；可解释面积计分、逐项回看与重放存档 | src/features/full-game | handoff/T08.md；docs/t08/ACCEPTANCE.md；tests/t08；tests/browser/t08.spec.ts | T24现版数字回归通过；Chromium150项与WebKit在线完整路线；实机/辅助技术/真人教学未测 |
| T09 | 30 张挑战题与 6 个终局示例 | 30 题六类别共享题库；6 个完整终局教学示例；答案、反驳、三层提示与解答证据；题目 ID、来源、验证状态和矢量棋形 | content/puzzles、content/endgames、content/t09、content/tools | handoff/T09.md、handoff/MERGE_A.md、content/validation-report.md、content/validation、docs/merge-a/VALIDATION.md | T24现版数字回归通过；Chromium150项与WebKit在线完整路线；实机/辅助技术/真人教学未测 |
| T10 | 互动判题、分层提示与未知分支处理 | 多题型互动练习与类别筛选；三层提示、错误反驳和多解支持；未知分支、自由试下、重试与换题 | src/features/puzzle-runner；learning-hub 注册/入口 | handoff/T10.md；docs/t10/ACCEPTANCE.md；tests/t10；tests/browser/t10.spec.ts | T24现版数字回归通过；Chromium150项与WebKit在线完整路线；实机/辅助技术/真人教学未测 |
| T11 | 眼、假眼与基础死活演示 | 真眼、假眼、独立眼的对照教学；先手做眼与关键点防守；死活证据边界及具体变化演示 | src/features/life-lab；复用 src/features/puzzle-runner | handoff/T11.md；docs/t11/ACCEPTANCE.md；tests/t11；tests/browser/t11.spec.ts | T24现版数字回归通过；Chromium150项与WebKit在线完整路线；实机/辅助技术/真人教学未测 |
| T12 | 开放判断题与同伴合作挑战 | A/B 取舍、对手回应和开放解释；双人角色轮换与合作小游戏；开放讨论记录与线下活动说明 | src/features/cooperative | handoff/T12.md；docs/t12/ACCEPTANCE.md；tests/t12；tests/browser/t12.spec.ts | T24现版数字回归通过；Chromium150项与WebKit在线完整路线；实机/辅助技术/真人教学未测 |
| T13 | 围地、终局辨认与数子练习 | 终局/未终局与争议辨认；黑白围空和中立区域互动标记；面积分解、贴目试算及提子数量对比 | src/features/territory | handoff/T13.md；docs/t13/ACCEPTANCE.md；tests/t13；tests/browser/t13.spec.ts | T24现版数字回归通过；Chromium150项与WebKit在线完整路线；实机/辅助技术/真人教学未测 |
| T14 | 教师出题与答案变化编辑器 | 教师摆题、题干、提示、目标编辑；多分支答案与合法性校验；学生预览、草稿、复制、修订与发布记录 | src/features/teacher-editor | handoff/T14.md；docs/t14/ACCEPTANCE.md；tests/t14；tests/browser/t14.spec.ts | T24现版数字回归通过；Chromium150项与WebKit在线完整路线；实机/辅助技术/真人教学未测 |
| T15 | JSON、SGF 与棋盘图导入导出 | JSON 内容备份与版本/冲突处理；SGF 对局、停手、摆子和变化交换；SVG/PNG/PDF 棋形导出与批量清单 | src/features/file-exchange | handoff/T15.md；docs/t15/ACCEPTANCE.md；tests/t15；tests/browser/t15.spec.ts | T24现版数字回归通过；Chromium150项与WebKit在线完整路线；实机/辅助技术/真人教学未测 |
| T16 | 离线运行、本机保存与版本迁移 | 离线资源缓存与准备检查；本机进度、棋局、草稿持久化；安全迁移、备份恢复、选择性清除 | src/core/unified-persistence.ts、src/core/offline.ts、public/sw.js、src/features/offline-data | handoff/T16.md；docs/t16/ACCEPTANCE.md；tests/t16；tests/browser/t16.spec.ts；实际禁网记录 | T24现版数字回归通过；Chromium150项与WebKit在线完整路线；实机/辅助技术/真人教学未测 |
| T17 | 成员反馈与 CAS 迭代证据记录 | 可跳过三项匿名反馈；活动编号与连续填写；实际汇总/缺失/分母；T14版本迭代与 CAS 手动证据；审核导出/删除/开发例隔离 | src/features/evidence；统一持久化 evidence 分区；schemas/t17-evidence.schema.json | handoff/T17.md；docs/t17/ACCEPTANCE.md；tests/t17；tests/browser/t17.spec.ts；output/validation/T17 | T24现版数字回归通过；Chromium150项与WebKit在线完整路线；实机/辅助技术/真人教学未测 |
| T18 | 磁性演示棋盘与可操作标记设计 | 大号磁性/非磁性演示棋盘；气环、目标、数字等实体标记；实际尺寸图纸、拼接打印、材料与装配 | materials/demo-board | handoff/T18.md；材料清单、PDF/SVG、verification-report与逐页证据 | T24材料文件/源/尺寸/逐页与引用复验通过；实际打印制造/真人教学未测 |
| T19 | 双人练习棋盘与便携棋具 | 9×9 与 13×13 便携可打印棋盘；纸棋子、覆片、收纳与套数计算；实际棋子直径适配和打印校准 | materials/pair-boards | 原prompts/T19_pair_boards.md中验收条款；handoff/T19.md；尺寸渲染与逐页证据 | T24材料文件/源/尺寸/逐页与引用复验通过；实际打印制造/真人教学未测 |
| T20 | 双面规则卡与自选学习路线卡 | 双面基础规则与规则补充卡；吃子小游戏、面积计分例卡；可自主勾选的 beginner pathway 卡 | materials/rule-cards | 原prompts/T20_rules_pathway_cards.md中验收条款；handoff/T20.md；尺寸渲染与逐页证据 | T24材料文件/源/尺寸/逐页与引用复验通过；实际打印制造/真人教学未测 |
| T21 | 30 张纸质挑战卡与教师答案册 | 30 张双面挑战卡与难度标记；教师答案册及同版本同步；任务站、合作解题等线下玩法 | materials/challenge-cards | 原prompts/T21_printable_challenges.md中验收条款；handoff/T21.md；尺寸渲染与逐页证据 | T24材料文件/源/尺寸/逐页与引用复验通过；实际打印制造/真人教学未测 |
| T22 | 5 套可编辑微课 PPT 与讲解备注 | 5 套短微课与 25 张主讲幻灯片；逐页讲稿、提问、误区回应和转场备注；独立/合并可编辑 PPTX 与 PDF | materials/micro-lessons | 原prompts/T22_micro_lessons.md中验收条款；handoff/T22.md；尺寸渲染与逐页证据 | T24材料文件/源/尺寸/逐页与引用复验通过；实际打印制造/真人教学未测 |
| T23 | 活动流程、同伴教学与教师手册 | 6 次 45 分钟活动流程；混合水平分流与同伴教学方法；无屏替代、常见情况处理及反馈空表 | materials/facilitator-kit | 原prompts/T23_facilitator_kit.md中验收条款；handoff/T23.md；尺寸渲染与逐页证据 | T24材料文件/源/尺寸/逐页与引用复验通过；实际打印制造/真人教学未测 |
| T24 | 整套集成、规则一致性审查与交付 | 全模块集成与真实用户流程验证；规则、题库、纸卡、PPT 跨版本一致性；完整源文件/成品打包、验收报告和交付通知 | tests/integration、整套发布归档 | handoff/T24.md；docs/t24；tests/browser/t24*.spec.ts；release归档 | 数字检查通过；最终归档再验收记录见T24交接 |

## T00共享要求逐项追踪

| 编号 | 要求 | 唯一责任/当前文件 | 验收与证据 | 状态边界 |
|---|---|---|---|---|
| S01 | 非学术定位、默认假设、自由参与、不编造证据 | PROJECT_CONTRACT、CURRICULUM、src/config.ts | 文档逐条检查记录见ACCEPTANCE | 文档已制作；无真人审核 |
| S02 | 6阶段目标/前置/动手/观察/分流 | CURRICULUM；T03 learning-hub | 6行STAGE-01–06、document-contract和T03导航测试 | T03入口已实施；T23实体活动手册数字交付通过，实物未测 |
| S03 | 四尺寸、正交块、去重气、真边界 | RULES R1；coordinates；Board契约 | tests/t01/rules、properties及原坐标/组件测试 | 四尺寸与气计算及Chromium三尺寸实屏通过；实机未测 |
| S04 | 提子顺序、自杀禁着、失败无状态变化 | RULES R2、INTERFACES、rules/contract.ts | tests/fixtures/rules-vectors、tests/t01/rules及properties | 固定向量、拒绝不变与性质测试通过 |
| S05 | 位置超级劫、初始布局、停手例外 | RULES R3、历史模型 | tests/t01/rules：空盘劫端到端、显式较早历史向量 | 测试通过；注入史不称完整长循环对局 |
| S06 | 两停确认、争议恢复、预览死子、撤回/重做 | RULES R4/R7、GameState/contract、full-game | tests/t01/rules、scoring、import；tests/t08与browser | 引擎及T08完整终局流程通过 |
| S07 | 面积、默认0贴目、提子不重复加分、中立 | RULES R5、TerminalFixture | tests/area-example、validation SCORE_ARITHMETIC；DEV-END-001 | tests/t01/scoring固定手算及预览/确认测试通过；无通用死活判断 |
| S08 | 首提胜/两停无胜者；setup重建历史 | RULES R6、Move/Setup schema、T06 状态机、T07 capture-game | tests/t01/rules、tests/t06/machine.test.ts、tests/t07、浏览器 T06/T07 | 引擎、T06 fresh 起点与 T07 小游戏流程通过 |
| S09 | 两独立真眼与死活证据边界 | RULES R8、Puzzle.validation/Answer、T09 LIFE 内容、T11 life-lab | 缺证据已核查标签负例；T09 LIFE 有限目标与变化由当前引擎重放；T11 真/假眼、先手和 evidence 浏览器测试 | T11 已实施；无通用死活判定，人类复核未测 |
| S10 | 坐标、B/W/null、身份、版本、ID | schema、CONTENT_SCHEMA、coordinates | 越界/占点/未知值/未知版本/引用测试 | 已实测基础层 |
| S11 | Position/Move/GameState/Marker/Lesson/Puzzle/TerminalFixture/Feedback/Bundle | schemas/content.schema.json、生成类型 | 10个有效文档、4负例、schema漂移检查 | 结构实测；不等于规则/解答/人类审核 |
| S12 | 非对弈点集/归属/理由/开放文字 | Answer/Response、CONTENT_SCHEMA、T10 puzzle-runner | 多题型结构测试；DISC强制开放量规；T10 六种回答回归 | T10 已提供判题/讨论页面；未知合法输入不判错 |
| S13 | 共享纯函数API、受控Board、试下与提交分离、稳定错误 | INTERFACES、contract、errors.zh.ts、Board | 编译、组件测试、tests/t01及ESM直接导入测试 | 单引擎已实施；T04–T08均通过公开接口调用，不复制规则 |
| S14 | 单一持久化、版本迁移、安全导入 | unified-persistence、offline、validation、PROJECT_CONTRACT | 旧记录迁移、刷新恢复、备份 round-trip、拒绝不写、损坏/配额错误及实际断网测试 | IndexedDB 与离线缓存已实施；跨浏览器和真实配额耗尽未测 |
| S15 | 静态工程、锁文件、启动/构建/测试、无远程核心 | package.json、pnpm-lock.yaml、README | 干净安装/build/test日志 | 以ACCEPTANCE实测为准 |
| S16 | 360/768/1280、键盘、焦点、减少动画、可读坐标 | styles、Board、learning-hub及各功能页 | tests/browser/t00、t02–t08；Playwright截图 | 当前Chromium三尺寸与T02/T04–T08交互通过；真实设备和专用辅助技术未测 |
| S17 | 来源/变更/版本交接/完整归档/通知 | SOURCES、CHANGELOG、handoff、release-manifest | 文件清单、ZIP完整性与哈希 | 见交付记录 |

## 2026-10-21 自由双人对弈扩展

FREE_PLAY：主页伙伴卡/顶部“双人对弈”/教师入口→#/play/free；FullGameSize兼容扩展5/9/13/19；同一Board和规则引擎；轮次/提子/禁着/自动最终胜负；旧入口、存储和复盘保留。验收位置tests/free-play/model.test.ts、tests/browser/free-play.spec.ts、docs/free-play/checks及handoff/FREE_PLAY.md。自动算分以双方确认死子为前提，不新增通用死活判定。原T00–T24证据作为基线，当前功能结果以FREE_PLAY最新交接为准。


## 追加：HISTORY_SLIDER（0.19.0-history.1）

| 责任模块 | 新增要求 | 验收位置 |
|---|---|---|
| T02/T07/T08/T10/T14及T06试下 | 所有连续落子棋盘有统一上一步及实时滑动条，回看不改历史；保持原悔棋约定 | docs/history/ACCEPTANCE.md；tests/history；tests/browser/history.spec.ts |


## 用户追加：联机双人对弈（0.20.0-online.1）

| 要求 | 实际入口/责任 | 验证 |
|---|---|---|
| 创建/加入、匿名双席、可选尺寸、按规则轮流 | #/play/online；online-game；server/rooms.ts复用T01/T08 | tests/online/server.test.ts、tests/browser/online.spec.ts；docs/online/ACCEPTANCE.md |
| 同步提子/停手/认输/双方终局/悔棋 | 同一原规则与模型；服务器串行保存再广播 | 双会话捕获/自杀/非法/终局/争议/恢复测试 |
| 历史滑动条、刷新/断线恢复、保存导出 | 共享GameTimeline；OnlineClient；T01 serializeGame | 双会话只读光标/新着回当前/恢复和导出检查 |
| 既有离线和内容不回退 | requiresNetwork区分；原本机持久化、冻结内容保留 | pnpm check；完整本机浏览器；preservation.json |
| 实际运行交付、部署边界 | dist+dist-server、启动器、完整ZIP/轻量APP | 归档CRC/SHA与干净解压实测；公网/TLS/真实双设备未测 |


## 用户追加：GitHub原网址同步

| 要求 | 责任与验收 |
|---|---|
| 原网址访问全部最新静态功能 | https://sma084545-pixel.github.io/weiqi/；dist→发布仓库根；docs/github-pages与GITHUB_PAGES_SYNC交接 |
| 同步实际源码和可部署包 | 仓库project/；版本化完整ZIP/APP、SHA与发布清单 |
| 缓存更新和版本可核对 | APP_VERSION0.20.1、页脚、version.json、旧缓存保存后更新检查 |
| Pages不冒充联机后台 | hosting.ts、8边界单元、上线页面恢复入口、外接HTTPS配置说明 |
| 原规则/内容/本机记录 | 完整check与浏览器回归；规则/schema/题库/材料/锁文件保留验证 |
