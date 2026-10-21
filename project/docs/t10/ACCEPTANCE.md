---
schemaVersion: 1
id: DOC-T10-ACCEPTANCE
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# T10 验收记录

| 验收项 | 状态 | 证据 |
|---|---|---|
| 30 题、六类别、文字难度筛选 | 通过 | `catalog.test.ts`；Chromium 目录测试与 1280 截图 |
| 六种答案模型分别交互 | 通过 | `grading.test.ts`；Chromium number / point-set / move-tree / region / reason / open-text 流程 |
| 多解、不同防守、作者反驳 | 通过 | CON-002 两个 success；CAP-001 作者回应；LIFE 多步树由内容校验重放 |
| 未覆盖合法手不判错 | 通过 | CAP-001 明示未知向量；页面可进入自由试下 |
| 非法着不换手、不改输入 | 通过 | `grading.test.ts` 占点向量与 Board 占用点禁用/可读说明 |
| 提示分层、隐藏重试 | 通过 | 浏览器打开第一层后隐藏重试，旧答案与提示正文清除 |
| 回退、重置、下一题、返回列表 | 通过 | 浏览器题内回退、重置、列表与连续换题 |
| 异步取消与 reduced-motion | 通过 | 普通 500ms 快速换题取消；reduced-motion 立即完成 |
| 本机记录与 revision 隔离 | 通过 | `progress.test.ts`；刷新后 exact id@revision 完成标记 |
| 坏内容恢复 | 通过 | `catalog.test.ts` 区分 malformed / unverified / unsupported / development；页面恢复卡 |
| 360/768/1280、触屏与键盘 | 通过 | T10 Playwright 真触屏上下文、Board 键盘选点、无页面水平溢出、关键截图 |
| Safari / Firefox / 专用辅助技术 / 实体设备 | 未测 | 当前只运行锁定 Chromium；见 ACCESSIBILITY_QA |
| 人类围棋教师复核与课堂效果 | 未测 | T09 `humanReviewed=null` 保持原样；未生成实施数据 |

自动检查证明的是明示题库与交互范围，不证明通用死活裁判、全盘最佳手或教学成效。
