---
schemaVersion: 1
id: DOC-T13-ACCEPTANCE
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# T13 验收表

| 验收项 | 状态 | 证据 |
|---|---|---|
| END-001–006 逐一可运行且 ID/revision 一致 | 通过 | tests/t13/model.test.ts；Chromium T13 第2项 |
| 未完/争议反例不产生伪最终分 | 通过 | END-006 expectedScore=null；模型与浏览器第2项 |
| 单点/整连通空区、三类标签、撤回 | 通过 | 模型区域测试；浏览器第3/8项 |
| 提交后逐区显示边界证据与具体错误 | 通过 | gradeRegions；浏览器第3项 |
| 答案与分数不早于预测 | 通过 | 浏览器第3项；提交前正确标记和表格均不在 DOM |
| 死子→活子→围空→中立→贴目→总分 | 通过 | 浏览器第4项逐步检查 |
| 面积明细与五个 T09 独立手算一致 | 通过 | 五例全部经 T01 scoreArea 重算；25点守恒 |
| 同盘面改变提子账本不改面积 | 通过 | END-001/005 模型和浏览器第6项 |
| 贴目试算只影响白方对应分量且可恢复 | 通过 | 模型与浏览器第5项 |
| 全空盘不全算给某方 | 通过 | 继承 T01 scoreArea 全空盘固定测试；T13 不另写计分 |
| 实体棋盘操作卡与页面一致 | 通过 | materials/t13/territory-counting-card.md 由页面直接下载；浏览器第7项 |
| 360/768/1280、触屏、键盘、reduced-motion | 通过 | Chromium 第8–10项与截图 |
| 全工程、内容、构建与受影响回归 | 通过 | 35 个测试文件、312 项；T09 851 项内容核查、30 题/6 终局；Chromium 全量 100 项；详见 output/validation/T13/command-report.json |
| Safari/Firefox、实体设备、专用辅助技术、真实打印 | 未测 | 当前环境只实际运行 Chromium |
| 人类教师、真实课堂、学生反馈 | 未测 | 没有虚构；T09 humanReviewed=null |

当前阻断失败：无。
