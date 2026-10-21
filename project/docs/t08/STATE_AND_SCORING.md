---
schemaVersion: 1
id: DOC-T08-STATE-SCORING
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 状态、终局确认与计分

`FullGameMatch` 只在UI层增加开局设置、悔棋申请、计分草稿和中文消息；棋盘、轮次、动作、提子、重复历史、阶段、贴目、上一手与结果都以T01 `GameState` 为唯一事实。

状态路径为 `setup → playing → scoring → finished`。两停只进入 `scoring`。死子草稿为坐标集合，`toggleDeadGroup` 必须先调用 `getGroup` 并一次切换整块；空点返回 `NOT_A_STONE`，原状态不变。`scorePreview` 对原棋盘副本计算，`basis=preview`。它可以列空区边界结果，但不会猜死子，预览中的 winner 只显示为差值预览。

确认固定黑方后白方。第一次确认只更新UI草稿，不改GameState；第二次确认把预览计算出的完整中立点清单、整块死子集合和 `[B,W]` 一并交给 `confirmScore`。引擎再次核对全部中立点和死子完整块，再写入 `agreement`、`result.reason=area` 和确认事件。最终原board仍含预览标记为死的棋子；计分只在副本移除。

`resumeDisputedPlay` 只可从scoring调用。它追加resume事件、phase回到playing、连续停手清零并清除草稿；board、toPlay、历史布局和上一手保持。它不把计分预览的移除当实际提子。

悔棋须两方确认后调用一次 `undo`。撤回第二次停手会恢复第一停之后的playing状态；撤回最终确认会回到scoring；撤回认输会恢复playing。引擎快照同时恢复轮次、提子、停手、结果、历史和上一手。拒绝悔棋沿用同一GameState。

面积明细为黑/白活子数、黑/白围空坐标、中立点坐标、贴目、总分、差值及胜方或和棋。captures只显示信息，不进入公式。认输结果没有score字段。
