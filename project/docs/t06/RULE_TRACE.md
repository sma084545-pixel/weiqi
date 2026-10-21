---
schemaVersion: 1
id: DOC-T06-RULE-TRACE
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# T06 要求、实现与测试追踪

| 要求 | 唯一实现位置 | 证据 |
|---|---|---|
| 放黑/放白/擦除/棋块/气/目标/数字/清空/尺寸 | `model.ts`、`diagnostics.ts`、受控 Board | `tests/t06/model.test.ts`、浏览器 T06 |
| 摆棋不自动提子，非法示意保留 | `applyPointTool` 不调用规则着法；`diagnoseSetup` 只读诊断 | model/machine/browser 无气块案例 |
| 进入规则前验证并明示未知历史 | `enterRules` → T01 `validateSetup/startGame` | machine 测试、固定 transition fixture、浏览器历史布局=1 |
| 规则轮换、提子、超级劫、停手 | T01 `tryMove/applyPass/resumePlay` | T01 回归 + T06 machine/browser |
| 两种撤回分离、redo 截断 | `SetupEditor` 与 `GameState` 两套栈；`returnToSetup` 一次提交 | model/machine/browser |
| 尺寸裁切不静默 | `resizeLoss` + 确认面板 + 可撤回 `resizeSetup` | 9→5 固定 fixture 与浏览器 |
| Position 导出可校验 | `positionFromSnapshot/positionJson` | `tests/t06/storage.test.ts` |
| 标记完整回读 | 既有 ContentBundle + MarkerDocument | storage 单元及浏览器下载/本机保存 |
| 键盘、触屏、三视口、投影/灰度/reduced-motion | T02 Board + T06 响应式样式 | 10 项 T06 Playwright 和截图 |

规则追踪边界：T06 不重写棋块遍历或落子算法。非法示意能保留只说明编辑器允许摆设；能进入规则模式只说明 `validateSetup` 接受该起点，不证明起点以前存在真实合法棋谱。
