---
schemaVersion: 1
id: DOC-T05-RULE-TRACE
revision: 2
rulesetId: GO-CLUB-AREA-1
---

# T05 规则与实现追踪

| 要求 | 实现 | 验证 |
|---|---|---|
| 先选候选、预测后播放 | `CaptureLab.tsx` | `capture-lab.test.tsx`、浏览器 T05 1/4 |
| 落子→查对方气→移除→查己方气 | `frames.ts` 只读取 `Trial.event` | `frames.test.ts`、固定向量 |
| 中间帧不写历史、播放锁盘 | 受控 `activeFrame` 与 Board `disabled` | 单元/浏览器锁盘、撤回检查 |
| 暂停、上/下步、直接完成、取消 | `StepPlayer.tsx` 单定时器及 effect cleanup | `step-player.test.tsx`、浏览器暂停/换题/离开 |
| 非法动作具体且不变状态 | `RULE_ERROR_ZH` + 纯 `tryMove` | DEMO-CAP-006、T05 单元/浏览器 |
| 多块、未提、先提后有气、自杀 | `DEMO-CAP-001`–`006` | `demos.test.ts`、`EXPECTED_RESULTS.md` |
| “不会提子”是有效输入 | `evaluateCapturePrediction` | evaluation/组件/浏览器测试 |
| 完整撤回重试 | 第四步一次提交后调用 T01 `undo` | 浏览器主流程 |
| 可用后续与诚实状态 | Board 练习与 T07 吃子小游戏均可用 | 注册测试、页面链接测试、T07 浏览器回归 |

页面没有棋块遍历、提子、数气、自杀或超级劫算法。临时落子帧从引擎 `event.before` 加 `event.placed` 构造；受影响棋块只读 `groupsBefore`；移除与终态只用 `event.after/captured/libertiesAfter`。若事件缺少落子点，帧生成器拒绝创建提子演示。
