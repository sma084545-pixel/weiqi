---
schemaVersion: 1
id: HISTORY-ACCEPTANCE
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 棋局回看验收 · 2026-10-21

| 要求 | 状态 | 证据 |
|---|---|---|
| 所有连续落子界面有上一步及滑动条 | 通过 | 自由/完整围棋、吃子小游戏、实验规则试下、题目变化/自由试下、教师变化树、组件落子示例均实际交互；tests/browser/history.spec.ts |
| 实时拖动、触屏及键盘 | 通过（浏览器自动化） | 鼠标按住移动、松开前盘面已更新；触屏点滑轨、Home/End/方向键；360/768/1280；Chromium及WebKit在线 |
| 历史忠实、回看不落子 | 通过 | 手算角上提子前/后B/W盘面、轮次、提子数；强制点击旧盘不新增事件；停手、争议、终局确认均有准确步骤 |
| 真正撤回/重做及分支 | 通过 | 双方同意后撤回获胜手；规则试下撤回/重做/新分支；范围同步，旧redo不混入；教师回退保留后续并可明确新增分支 |
| 换题、重开、回应与保存 | 通过 | 回应期间锁定回看；换题取消旧回应；题内与自由试下互不改写；刷新保存当前局而非旧画面 |
| 原规则、schema、正式题与全部材料 | 通过 | preservation.json 1032文件逐SHA不变；旧handoff和锁文件保持；正式30题/6终局冻结201文件一致 |
| 全量项目及原教学流程 | 通过 | pnpm check：46文件374单元检查；内容851检查；完整构建/规则独立库/容量；Chromium176浏览器检查，含完整学习到教师及断网路线 |
| WebKit兼容 | 通过（在线11项） | checks/browser-webkit.log；WebKit26.5。禁网工具限制沿用，不把Chromium禁网成功冒充WebKit或原生Safari通过 |
| 新归档干净副本与成品 | 外部最终证据 | ZIP旁ARCHIVE_CHECK.json：CRC、完整SHA、新解压、安装/检查/构建/专项浏览器。仅以status=passed为最终通过 |
| 实机/真人辅助技术/真人教学 | 未测 | 不将模拟触屏、可访问命名或测试用数据称为真人/实体设备验证 |

实际命令在新主线目录执行：

- `pnpm install --frozen-lockfile`：锁文件不变，Node24.19.0/pnpm11.25.0运行；项目声明支持的Node范围和pnpm11.19保持。
- `pnpm check` → checks/check.log，退出0；含正式内容校验与生产构建。
- `pnpm test:history` → checks/history-unit.log，8项通过；其中棋形预期为独立手写，未调用被测投影函数生成答案。
- `pnpm test:browser` → checks/browser-all.log，176项通过，Chromium151.0.7922.34。
- `HISTORY_EVIDENCE_ROOT=output/playwright/history-webkit pnpm exec playwright test --config=playwright.history-webkit.config.ts --workers=1` → checks/browser-webkit.log，在线11项通过。
- `python3 scripts/verify-history-preservation.py` → checks/preservation.json，1032文件通过。

新截图在 output/playwright/history/ 与 history-webkit/，检查了三种宽度、19路局部滚动和滑动条文字/按钮；回看显示“只读”，旧局没有当前结果或捕获提示。历史版本截图与T24证据保持基准原样，新全流程记录独立保存在checks/journey/。普通截图中棋盘局部滚动显示的是可见区，完整底层棋盘保持。

初始专项单元向量漏给了全空盘确认必需的25个中立点，正确被引擎拒绝。补齐独立确定的清单后通过；记录在history-unit-initial.log。未为使测试通过修改引擎或规则。构建保留原单包大于500kB提示，不影响本机离线功能。

本次没有未解决的已知阻断或重要缺陷；有限用例通过不构成通用正确性的证明。

归档干净复查首次因46个测试进程并发负载，19路性质检查超过原15秒限时（373项通过，1项超时，无断言失败）。vitest.config.ts将并发固定为4，保留全部断言和用例；后续干净目录复验以ZIP旁ARCHIVE_CHECK.json为准。失败原日志保存在docs/history/checks/clean-check-initial.log。

4进程复查同一19路性质用例在15.5秒结束，仍碰到旧15秒限时。该用例为180次固定种子正确性验证，并非性能验收；仅将此组既有测试预算放宽至60秒，保留全部种子、次数、独立oracle与断言。引擎不变，不以放宽测试预算宣称性能提升。
