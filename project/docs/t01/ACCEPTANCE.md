---
schemaVersion: 1
id: DOC-T01-ACCEPTANCE
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# T01验收 · 0.2.0 · 2026-09-06

范围：唯一纯规则引擎与状态历史。T00的浏览器策略校验服务阻断继续保留；用户已明确要求实施并继续完成T01，本次不改首页或Board，不宣称完成T02/T08/T16或整套项目。

| 验收项 | 结果 | 可复查证据 |
|---|---|---|
| 中心/边/角4/3/2气，斜邻分开，共享气去重，合并 | 通过 | tests/fixtures/rules-vectors.json；tests/t01/rules.test.ts；EXPECTED_RESULTS.md独立手算 |
| 单子/多子/多块提子、同块多邻接去重、先提后合法、真自杀拒绝 | 通过 | 固定placement向量、捕获事件前后盘面/气/组核对、rules.test.ts |
| 立即回提劫禁着、合法劫材后回提、较长历史检测、初始布局比较 | 通过 | 从空盘端到端ko测试；较早历史的显式detector向量。后者不宣称合法长循环演示 |
| 停手例外、两停确认、争议恢复不清历史 | 通过 | rules.test.ts劫后两停/恢复仍拒绝重复；scoring.test.ts恢复全部变量 |
| 失败操作不修改输入或redo，试下不提交 | 通过 | 每个固定向量和性质测试比较输入；占点/轮次/越界/自杀/劫/结束拒绝；递归冻结输出 |
| 完整undo/redo、未来历史隔离、新分支截断 | 通过 | rules.test.ts、scoring.test.ts、import.test.ts完整快照比较及未来路径重放 |
| 认输后禁着、首提获胜、小游戏两停无胜者 | 通过 | rules.test.ts生命周期与变体断言，不用面积决定首提胜负 |
| 非法摆棋拒绝、未知前史明示、recorded不静默改起点 | 通过 | 9类非法setup、HISTORY_REQUIRED、UNKNOWN_PAST_HISTORY测试 |
| 四种完整棋盘语义一致 | 通过 | 固定四尺寸边界、各尺寸随机性质、四尺寸导入往返 |
| 面积、中立、死子移除副本、贴目、无提子额外加分 | 通过 | mixed手算10:10/5中立；移除假设25:0.5；全空中立；实际提1子后黑25而非26 |
| 确认与预览证据分开，不自动死活 | 通过 | 无状态/错误盘面/错误贴目/playing/不一致终局注释只预览；有效两停+双方同意才确认 |
| 死子完整块与中立点一致，确认可撤回 | 通过 | 部分块/空点/重复/越界/假中立负例；确认、撤回、重做、争议恢复测试 |
| 禁止赛中改贴目 | 通过 | setKomi不同值KOMI_LOCKED、冻结赋值失败、当前/历史贴目篡改拒绝 |
| 伪造导入缓存/赢家/动作/历史/undo/redo拒绝 | 通过 | import.test.ts按字段负例；完整合法setup+GameEvent重放，无外部缓存捷径 |
| 独立预期及必要性质测试 | 通过 | 4尺寸×12张随机盘的独立并查集对照；4尺寸×180次尝试守恒/有气/不变/撤回检查；90度旋转 |
| T00回归、schema/生成类型、开发正负例 | 通过 | 原75项+T01新增104项，共179项；10正例/4预期负例；schema/types及pnpm-lock与基线SHA-256一致 |
| 独立ESM成品可运行及声明可编译 | 通过 | pnpm build:engine、test:engine-build；ESM直接创建/落子/停手/undo/redo/重放，声明消费类型检查 |
| 长对局与容量拒绝保护 | 通过 | 240手19路、撤回2手、12,705,289字节JSON完整往返；2100个合法事件超64MB时拒绝且旧记录不变；capacity-report.json |
| 干净安装、构建、启动 | 通过 | 全新目录按锁安装，完整check退出0；Vite 5175启动ready后主动停止（143为本次SIGTERM，非启动失败）；日志见output/validation/T01 |
| 浏览器360/768/1280实屏、真实触摸/焦点/投影 | 未测（继承T00） | T00两次浏览器访问被管理员策略校验服务拒绝；未绕过，未新增截图。后续按README授权恢复后运行浏览器套件 |
| 人类教师审核、真实学校实施、CAS认可 | 未测 / 不属本次 | humanReviewed保持null；没有虚构反馈、出勤、工时或效果 |

## 实际命令与输出

运行环境Node 24.19.0、pnpm 11.19.0，README记录本机PATH。项目依赖版本及锁文件保持T00原值。本次实际命令包括：

```sh
pnpm install --frozen-lockfile --offline
pnpm test:engine
pnpm check
sh scripts/clean-verify.sh
pnpm dev --port 5175
```

check包含schema:check、全部179项测试、validate:content、首页build、build:engine、test:engine-build和test:engine-capacity。最终命令原文与退出码见output/validation/T01/command-report.json及同目录日志。规则追踪按RULE_TRACE.md定位，不把某个按钮存在当成规则正确的证据。

## 修正过的失败及限制

- 首次新增旧版兼容测试误写game-state.json，实际T00文件为game.json；修正测试路径后通过，无产品数据变化。
- package脚本变化后pnpm的依赖状态检查要求非交互安装；使用CI=true按原锁文件从本机缓存恢复，未增加依赖。
- 最初容量测试在每个成功断言中序列化整局来生成错误文本，导致约数分钟测试开销；改为仅失败时生成诊断后，同一容量检查约2.3秒完成。此耗时为本机一次记录，不是性能保证。
- 本次代码审阅与独立预期推导由本助手进行，不是人类教师审核；不声称穷举正确或提供通用死活判定。
- 完整快照的JSON随对局长度增长；64MB是处理上限，实际本机存储配额另受设备影响。超限拒绝，不静默删历史；T16可在共享模型协商后另做压缩/备份。
- 导入重放证明内部规则一致性，不能证明文件中的对局在现实中发生、是谁操作或原始贴目未被全盘自洽重写。
