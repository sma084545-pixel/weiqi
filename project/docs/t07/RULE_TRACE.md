---
schemaVersion: 1
id: DOC-T07-RULE-TRACE
revision: 2
rulesetId: GO-CLUB-AREA-1
---

# T07 要求、实现与验证追踪

| 要求 | 唯一实现位置 | 证据 |
|---|---|---|
| 默认9路、可选5路、当前执色、玩法首屏可见 | `CaptureGame.tsx`、`model.ts` | T07浏览器开局与三视口 |
| 首次提子即时结束，非法不换手 | T01 `capture-first` + `playAt` | 固定向量、model、浏览器黑/白胜 |
| 一手多子、两停无胜者 | T01 event/result | 两子固定向量、model、浏览器 |
| 双方依次确认悔棋；拒绝不变 | `requestUndo/confirmUndo/refuseUndo` | model与原生dialog浏览器流程 |
| 撤回获胜手恢复完整状态 | 只调用T01 `undo` | model、浏览器盘面/phase/move-count |
| 交换颜色重开无上局历史 | `restartRound` | history长度、空盘与浏览器伙伴换色 |
| 保留盘面并回看最多5手 | `review.ts` + T05 `StepPlayer` | model与浏览器5帧 |
| 最后一气解释来自引擎事件 | `winningExplanation` | 固定两子案例、目标标记和坐标文字 |
| 气辅助无重复且共同设置可见 | T01 `getGroup/getLiberties` + Board标记 | model逻辑、浏览器开局/灰度终局 |
| 键盘、触屏、边角、快速连点 | T02 Board + 同步moveGate | T07 Playwright专项 |
| T08接入后使用稳定可用链接 | `showFullGameHelp` + FULL_GAME_ROUTE | T07浏览器链接回归 |

T07没有棋块遍历、提子、自杀、超级劫或计分算法。页面只提交意图并消费T01状态与事件；胜负出现后Board立即只读。
