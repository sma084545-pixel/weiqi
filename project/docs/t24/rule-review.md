---
schemaVersion: 1
id: T24-RULE-REVIEW
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 规则一致性审查

规则、schema、201个冻结内容文件均与Freeze B逐字节一致；规则引擎未修改。沿用唯一Board、getGroup/getLiberties/tryMove/scoreArea与统一IndexedDB存储适配器，页面不重新推算合法性或死活。规则来源为用户GO-CLUB-AREA-1约定，BGA不同赛规仅比较。

| 规则点 | 实际代码与回归证据 |
|---|---|
| 正交连接、中心/边/角4/3/2气、斜邻、共享气去重 | src/core/rules/topology.ts；tests/t01/rules.test.ts、properties.test.ts，T04八布局独立点集 |
| 先提敌块再查己方气、多块同时提、自杀、失败不变 | placement.ts、engine.ts；固定rules-vectors.json、rules.test.ts；T05/T07浏览器边界 |
| positional superko、完整编码、初始布局、较早重复 | coordinates.ts layoutKey、placement.ts；空盘到简单劫端到端及显式长历史向量；后者不冒称实际长循环棋谱 |
| pass例外、undo/redo路径、分支截断、认输 | engine.ts；rules.test.ts、import.test.ts、history回归 |
| 摆棋非法保留、新起点未知过去 | validateSetup；tests/t06、browser/t06、T24连续路线新历史数量1 |
| 双停确认、死子预览、修改取消确认、争议原盘恢复 | confirmScore/resumePlay、full-game；tests/t08、browser/t08、T24实际双停/标死/恢复/确认和棋 |
| 面积活子+围空+贴目，中立/全空，无提子再次加分 | scoring.ts；独立手算tests/t01/scoring.test.ts、tests/t13；T09六终局及T20手算回归 |
| 未知合法分支不判错，多解/反驳/开放讨论 | puzzle-runner + content/tools/grade.mjs；tests/t10、T24未知合法手试下返回 |
| 真/假眼、两个空点与独立眼、先手与证据边界 | tests/t11/model.test.ts、life-lab.test.tsx、browser/t11；T09有限变化重放；没有通用死活推断 |
| 纸卡/课件/手册一致 | 617项跨介质检查；T20规则文本与示例检查、T21冻结84项、T22源图/变化/原生备注、T23六次45分钟 |

术语按TERMINOLOGY/RULES/CONTENT_SCHEMA解释：气是连通块相邻空点去重集；停手不加分且不清历史；提子累计是信息；贴目开局确定默认0；劫教学从简单劫开始但正式约定为位置超级劫；终局须双方确认或认输。对进行中/争议棋只给预览。两真眼是特定结构依据，没有两眼不自动死亡。所有正式humanReviewed保持空，助手审阅不能替代真人教师。
