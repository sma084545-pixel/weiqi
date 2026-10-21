---
schemaVersion: 1
id: DOC-T11-ACCEPTANCE
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# T11 验收表

| 验收项 | 状态 | 证据 |
|---|---|---|
| 真眼/假眼实际落子和提子合法性 | 通过 | `tests/t11/model.test.ts`、浏览器 T11 第 2 项；T01 `tryMove` |
| 两个空点与两个独立眼结构 | 通过 | LIFE-001/LIFE-005 对照、模型测试和浏览器第 3 项 |
| 同一关键点更换先手后分别合法重放 | 通过 | `key-black`/`key-white` fresh setup、模型测试 |
| 目标棋块、当前轮次、先猜点选验证 | 通过 | T11 页面、组件测试和浏览器第 2/5 项 |
| 逐步填外气并说明条件 | 通过 | 四个 `OuterLibertyFrame`、气集合单测、浏览器第 3 项 |
| LIFE 提示与变化树只复用 T10 | 通过 | `PuzzleRunner initialSelectedId`、浏览器第 4 项 |
| 终点与 evidence 状态相符，未知不判错 | 通过 | 页面证据边界、T10 unknown 回归、教学审查 |
| 不把低深度尝试写成通用证明 | 通过 | 页面明确完整 5×5、有限分支和继续走边界 |
| ID/revision 匹配 | 通过 | LIFE-001–005 全为 revision 1；与 T10 归档逐字节一致 |
| 无“所有无两眼棋都死”表述 | 通过 | 源文件文本扫描和教学正确性审查 |
| 可随时返回自由对弈 | 通过 | 首尾 `#/play/full-game` 链接和浏览器第 1 项 |
| 360/768/1280、触屏、键盘、reduced-motion | 通过 | 7 项 T11 Chromium 回归和 4 张截图 |
| T00–T11 全量回归 | 通过 | `pnpm check` 291 项；`pnpm test:browser` 81 项 |
| Safari/Firefox、实体设备、专用辅助技术 | 未测 | 当前环境只实际运行 Chromium |
| 人类围棋教师审核、真实课堂和反馈 | 未测 | `humanReviewed=null`；没有虚构记录 |

阻断失败：无。已解决的测试断言漂移与执行环境事项见 `docs/t11/CONFLICTS.md`。构建只有客户端包约 758 kB 的性能提示，不影响当前本地静态运行；未来可在保持路由和题库语义的前提下拆包。

