---
schemaVersion: 1
id: DOC-T07-STATE-UNDO
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 状态、胜负与双方悔棋

`CaptureMatch` 包含T01 `GameState`、开局设置、是否开始、伙伴A所执颜色、当前悔棋申请、获胜事件和显示消息。规则事实只存在于 `GameState`；界面座位和确认不会改写其棋盘、轮次或历史。

状态流程如下：

1. `createCaptureMatch` 建立空盘 `capture-first` 状态，默认9路、黑先、贴目0，但等待共同确认。
2. `configureMatch` 只在未开始且无着法时更改5/9路或气辅助。更改尺寸建立对应的新空盘。
3. `beginRound` 让当前盘开始接收着法。
4. `playAt` 委托T01 `tryMove`；失败返回错误，原对象不变。若事件有捕获，T01同时把 phase设为finished、reason设为first-capture。
5. `passTurn` 委托T01 `applyPass`；第二次连续停手使capture-first对局以two-passes和无赢家结束。
6. `restartRound` 建立全新的初始布局，可交换伙伴颜色，不带入上局moves、captures、undo/redo或result。

悔棋分三步：`requestUndo`只创建申请；`confirmUndo(B)`只记黑方同意；`confirmUndo(W)`才调用一次T01 `undo`。顺序错误返回稳定流程错误。`refuseUndo`关闭申请并复用同一GameState引用，因此盘面、轮次、revision和历史都保持不变。它是同屏操作约定，不提供账号、签名或身份认证。

获胜状态也保留T01 undoStack，因此同意撤回获胜手会同时恢复被提棋、执色、提子数、结果、phase、位置历史和上一手。T07不提供绕开双方确认的直接悔棋按钮。
