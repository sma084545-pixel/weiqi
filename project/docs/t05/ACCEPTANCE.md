---
schemaVersion: 1
id: DOC-T05-ACCEPTANCE
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# T05 验收表

| 验收项 | 状态 | 证据 |
|---|---|---|
| 六类案例与 T01 相同 | 通过 | 独立 fixture、`tests/t05/demos.test.ts` |
| 固定四步、暂停/回看/直达 | 通过 | frames/StepPlayer 单元及浏览器测试 |
| 中间帧不写历史、锁住第二手 | 通过 | 事件帧测试、浏览器锁盘、最终一次提交 |
| 快速点击、换题、重置、离开取消 | 通过 | fake timer cleanup；浏览器换题与离开路由 |
| 非法动作不变状态 | 通过 | E1 `SUICIDE` 的 JSON 前后相等及浏览器盘面相等 |
| 同时提多块不重复 | 通过 | DEMO-CAP-003 恰为 4 个唯一坐标 |
| 先提后有气接受、自杀拒绝 | 通过 | DEMO-CAP-005/006 引擎重放 |
| 预测点集与实际比较 | 通过 | exact/missing/extra/explicit-none 单元测试 |
| 键盘、触屏、360/768/1280 | 通过（自动） | Chromium 1.62.1 套件及截图 |
| 灰度、投影、reduced-motion | 通过（自动/视觉） | 最终灰度截图及 DOM 检查 |
| Safari、Firefox、实体设备、专用辅助技术 | 未测 | 本次环境未运行这些浏览器/硬件/读屏器 |
| 真人教师审题和课堂使用 | 未测 | `humanReviewed=null`；没有生成实施记录 |

失败项：无。自动测试证明所列代码路径和本次 Chromium 运行，不证明所有浏览器、所有任意局面或实际课堂效果。

