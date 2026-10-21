---
schemaVersion: 1
id: HISTORY-IMPLEMENTATION
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 共享历史投影

`src/core/game-history.ts` 的 `createGameHistory(GameState)` 读取已验证引擎状态，不重算合法性或捕获。第 k 步（0 ≤ k < moves.length）的来源恰为 undoStack[k]；最后一步来自 GameState 本身。每帧提供棋盘、下一手、提子数、连续停手、阶段、原事件与最后一手标记。数组只包含当前有效路径；redoStack 不在回看范围。棋盘引用为只读，避免每次拖动克隆整局历史。

`src/components/GameTimeline.tsx` 是受控原生 range 加精确步进按钮。`useGameHistory` 单独保存 `{game,index}` 光标；GameState 对象改变便同步回到最新，不等待 effect，也不更新游戏对象或保存适配器。只读历史不能调用落子或管理动作。旧 T08 createFullGameReview 继续导出，为同一共享函数的兼容适配。

教师变化树的游标独立于路径末端；退回时不截断原路径，因此仍可前进，显式新增变化只添加节点。题目预设回应期间禁用历史导航和进入自由试下，避免取消一半回应后留下错误轮次；原有退回/重置/离开取消机制保留。

CSS 沿用项目绿色与文字状态，原生 range 保留浏览器默认触屏和键盘行为，至少44px可操作高度，不用新实验CSS或拖动库。不增加依赖；无动画、不上传。

## 本次实际查阅

- MDN: [input type=range](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/range)，2026-10-21。用于原生范围、步长与可访问命名；另提供按钮弥补拖动的精确定位。
- React: [input](https://react.dev/reference/react-dom/components/input)，2026-10-21。受控 value 与同步 onChange；实时输入实际由浏览器拖动测试确认。
- 本机 modern-web-guidance 的 slider 与 accessibility 指导，原文记录在 checks/web-guidance.txt；未因查询而升级项目依赖。

这是界面回看功能；没有实现自动死活、棋力分析或新增赛规。
