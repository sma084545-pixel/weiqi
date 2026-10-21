---
schemaVersion: 1
id: DOC-T07-ACCEPTANCE
revision: 2
rulesetId: GO-CLUB-AREA-1
---

# T07 验收表

| 验收项 | 状态 | 证据 |
|---|---|---|
| 黑先提、白先提均立即获胜并锁盘 | 通过 | 独立固定向量、model、Playwright |
| 一手提两子立即判当前方获胜 | 通过 | `T07-BLACK-TWO-STONE-CAPTURE`与5帧浏览器流程 |
| 无效落子不换手、不增着法 | 通过 | OCCUPIED model负例；浏览器占用点只读状态 |
| 连续两停无胜者 | 通过 | model与浏览器result/phase |
| 悔棋双方同意与拒绝 | 通过 | model引用/revision检查；原生dialog浏览器流程 |
| 撤回获胜一手恢复可玩状态 | 通过 | 被提白子恢复、获胜点清空、phase playing、2手 |
| 交换黑白清空上局历史 | 通过 | model初始历史/空盘；浏览器伙伴颜色与0手 |
| 最后最多5手与最后一气说明 | 通过 | `createMoveReview`、T01事件字段、浏览器5帧/文字/标记 |
| 5/9路、气辅助与共享Board | 通过 | 开局设置锁定；81/25交点；共享T01/T02回归 |
| 边角、键盘、触屏、快速连点 | 通过（自动） | Chromium触屏模拟、Enter、同步双点击只产生一手 |
| 360/768/1280无整页横向溢出 | 通过（自动/视觉） | `output/playwright/t07/*-initial.png` |
| 投影、灰度、reduced-motion | 通过（自动/视觉） | `1280-finished-projector-grayscale.png` |
| T08接入后有稳定可用链接 | 通过 | Playwright检查`#/play/full-game` |
| Safari、Firefox、实体设备、专用辅助技术 | 未测 | 本次未运行这些浏览器、硬件和读屏器 |
| 真人教师审核与实际课堂使用 | 未测 | 没有生成实施记录或人员审核结论 |

失败项：无。自动测试覆盖列出的固定规则路径和本次Chromium环境；不证明所有可能棋局的策略质量、所有浏览器或实际教学成效。
