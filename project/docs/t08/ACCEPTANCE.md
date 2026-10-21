---
schemaVersion: 1
id: DOC-T08-ACCEPTANCE
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# T08 验收表

| 验收项 | 状态 | 证据 |
|---|---|---|
| 9/13/19路、默认9路0贴目 | 通过 | model 12项；browser setup与361交点 |
| 自由让子、验证后白先 | 通过 | setup Position与browser白方状态 |
| 设置与进行中分开、赛中锁贴目 | 通过 | data-view；model SETTINGS_LOCKED |
| 开局至双停、死子、双方确认、结果 | 通过 | T08完整browser流程及最终截图 |
| 修改死子取消旧确认 | 通过 | model与browser按钮重置 |
| 争议恢复原盘/轮次/历史 | 通过 | model board引用/layouts；browser继续一手 |
| 面积明细、贴目/和棋、提子不加分 | 通过 | DEV-END-T08-001、双子和棋、ScoreDetails |
| 认输不编造面积分 | 通过 | result联合类型与browser无score表 |
| 双方确认撤回终局前手后继续 | 通过 | 撤回第二停、3项历史、继续第4项 |
| 只读复盘不改当前对局 | 通过 | revision不变、显式返回后才可继续 |
| 保存完整可重放对局 | 通过 | verified store、伪造提子负例、刷新读取 |
| 360/768/1280、19路滚动、投影/灰度/reduced-motion | 通过（自动/数字视觉） | T08 Playwright 12项与5张截图 |
| Safari/Firefox、实体设备、专用辅助技术 | 未测 | 本次未运行这些浏览器、硬件和读屏器 |
| 真人教师审核与实际课堂使用 | 未测 | humanReviewed为空，无实施数据 |

最终失败项：无。固定规则路径与本次Chromium环境通过，不把结果扩张为通用死活判断、策略质量或实际教学成效证明。
