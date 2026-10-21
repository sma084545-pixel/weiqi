---
schemaVersion: 1
id: DOC-T08-SAVE-REPLAY
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 对局保存与逐手回看契约

公共入口在 `src/features/full-game/storage.ts`：

- `createFullGameStore(StoragePort)` 复用T01 `createVerifiedGameStore`，固定本机ID `LOCAL-T08-FULL-GAME`。
- `save(GameState)` 先 `serializeGame`，再 `restoreGame` 重放成功后才通过公共存储端口写入。
- `load()` 读取schema v1 GameState并再次从setup和全部事件重放；伪造提子数、赢家、历史、快照或贴目会拒绝，不会覆盖当前对局。
- `fullGameJson(GameState)` 导出可供T15继续转换的完整JSON。T08不实现SGF格式或通用文件导入。

存档包含固定setup/mode/komi、当前盘、toPlay、布局历史、全部place/pass/resign/resume/confirm-score事件、captures、连续停手、phase、lastMove、agreement/result与undo/redo快照。赛中不自动保存；用户明确点击才写本机。未完成的UI死子草稿在双方最终确认前不是GameEvent，因此不进入GameState存档；确认后的agreement完整保存。

`createFullGameReview` 从当前有效路径生成根局面加每项规则事件之后的只读帧。浏览索引属于临时UI状态，不序列化，也不改moves/undoStack。若以后支持在旧局面开变化，必须明确生成新分支或新对局，不能复用当前按钮静默覆盖。
