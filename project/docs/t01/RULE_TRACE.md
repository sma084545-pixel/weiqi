---
schemaVersion: 1
id: DOC-T01-RULE-TRACE
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# GO-CLUB-AREA-1 → 代码 → 验证

固定预期先写在tests/fixtures/rules-vectors.json和EXPECTED_RESULTS.md，再编写引擎。测试不是由被测函数自产答案。下表函数名可直接检索；完整运行命令及结果见ACCEPTANCE.md。

| 用户条款 / RULES | 代码位置与责任 | 固定预期 / 实际测试 |
|---|---|---|
| R1 四尺寸、交叉点、正交块 | internal.ts的checkBoard、neighbors、groupAt；topology.ts的getGroup | rules.test.ts中心/边/角4/3/2、斜邻分离、四尺寸真实边界；properties.test.ts独立union-find对照 |
| R1 气去重、合并、打吃 | groupAt、allGroups；getLiberties/getAtariGroups；placement.ts事件气并集 | shared-liberty L形7气；merge前7后8气；一气白块唯一气；前后棋块事件核对 |
| R2 轮次→坐标→占点→暂放→同时提敌→己块有气→重复 | placement.ts的evaluatePlacement；engine.ts的tryMove提交候选 | rules.test.ts NOT_YOUR_TURN/OUT_OF_BOUNDS/OCCUPIED；single/two-stone/same-group-twice/simultaneous向量；先提两白后合法及真自杀 |
| R2 拒绝完全不变、试下未提交 | engine.ts的attempt/stateInput/push；返回冻结候选 | 原始JSON逐字不变、外部对象不被freeze、旧redo不清；两个候选互不提交；properties每次尝试比较输入 |
| R3 positional superko含初始布局、只比棋子 | coordinates.ts的layoutKey；evaluatePlacement对完整编码逐项相等检查 | 从空盘8手建立劫、立即回提拒绝、E2打吃劫材/D1回应/合法回提；显式较早历史与首项重复测试 |
| R3 不使用弱哈希，长重复也检查 | 完整N\|逐行N²个.BW字符串；输入历史完整格式与唯一性检查 | detector向量把候选置于早于最近两项的位置；不冒充实际长循环棋谱；伪造GameState历史不能经restoreGame通过 |
| R3/R4 pass例外，不清历史 | engine.ts的applyPass；resumePlay | 劫后两停仍保留同一历史，恢复后回提仍SUPERKO；pass无重复条目 |
| R4 两停进确认，不自动杀棋 | applyPass将full-game置scoring；result/agreement保持null | 两停后原白块/棋盘/提子数全保留，继续place拒绝；未确认只能preview |
| R4 死子注释、双方一致、中立完整、争议恢复 | confirmScore、resumePlay；scoring.ts的checkedAgreement/computeArea | 原C3白不从历史board删除；完整双方确认；缺中立点拒绝；undo/redo确认和resume恢复所有字段 |
| R4 认输、结束禁着 | resign、playable | 认输保留轮次/盘面/提子/停手/历史，记录对方胜；之后place拒绝；可undo |
| R5 空区边界面积、默认0贴目、提子不重复加分 | computeArea；startGame；setKomi | 独立mixed 10:10/5中立；空盘25中立；教学移除后25:0.5；实际提1子后的黑25不是26 |
| R5 未终局仅预览，不自动死活 | scoreArea检查confirmation可重放状态、phase/两停/原盘/贴目/已终局标记 | 无确认状态、playing、错误盘面/贴目、标签单独存在均preview；有scoring+双方同标记才能confirmed |
| R5 开局固定komi | 冻结state；setKomi；restoreGame全快照komi比对 | 改值KOMI_LOCKED；直接赋值失败；篡改当前/根undo贴目拒绝；小游戏非0贴目拒绝 |
| R6 首提胜/两停无胜者 | tryMove capture-first分支、applyPass | 首提result.reason=first-capture；两停reason=two-passes/winner=null，不进入area；新局可重开 |
| R6 摆棋与合法起点分开 | validateSetup/startGame，复用validateContent及groupAt | 越界、重复、X/null稀疏棋子、无气、缺先手/坏尺寸拒绝；fresh明确UNKNOWN_PAST_HISTORY；recorded不默默丢史 |
| R7 完整undo/redo与分支 | snapshot、push、undo、redo | 全字段快照比较，revision单独递增；undo原分支布局不影响新落子；成功才清redo；当前/未来重放 |
| R7 序列化与恢复、拒绝伪造 | restoreGame逐事件及全部undo/redo快照比对；serializeGame | import.test.ts的缓存/赢家/历史/轮次/动作/起点/撤回/重做负例、schema1旧例、四尺寸重放 |
| R8 不实现通用死活/策略AI | 仅接受明确标记做面积计算；无存活分析接口 | 代码审阅；计分假设标明非死活证明，确认标记非人类身份证据 |
| 共享坐标/存储/结构兼容 | coordinates、content.generated、validation/persistence；game-store包装 | 原75项回归；schema/types/锁文件字节一致；标准内容2MB、对局64MB；旧记录保留 |

## 性质验证范围

固定种子：每尺寸12张三值盘面，以独立并查集（只扫描右/下同色边）求棋块，分别枚举四邻空点，与运行时BFS核对。每尺寸180次随机尝试走子，检查失败输入不变、剩余每块有气、布局不重复、棋子守恒（当前黑子+白提子=黑已落子，反之亦然）、undo/redo快照一致，定期完整重放。旋转90度的捕获算例核对盘面、提子及计分不变。

240手19路实际合法路径保留238手当前路径与2个redo快照，完整JSON和经过验证的存储往返；另以700轮“两停+恢复”合法管理事件检查64MB拒绝边界和旧记录不被替换。后者是容量压力向量，不是实际社团对局或长劫循环。

## 代码审阅结论与范围

唯一落子核evaluatePlacement被tryMove调用；前后盘面/提子/气事件由此产生。所有管理事件均走同一push，undo/redo不自行推算棋子。存储包装只复用persistence，读取必重放。确认计算使用副本，完整对局历史从不由计分标记覆写。已逐函数检查这些路径并用上述测试交叉验证，属本助手代码审阅，humanReviewed=null。

这些结果支持指定规则与测试范围，不等于穷尽所有棋局的数学证明；不包含真实触屏、浏览器视觉、教师审核、学校活动或CAS认定。
