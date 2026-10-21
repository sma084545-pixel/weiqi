---
schemaVersion: 1
id: DOC-T06-STATE-MACHINE
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# T06 模式状态机与历史边界

```text
SetupSession
  ├─ apply/clear/resize/set-turn ──> SetupSession（编辑 undo/redo）
  └─ confirm + validateSetup + startGame(fresh-setup)
                                  └─> RulesSession（对局 undo/redo）
RulesSession
  ├─ tryMove/pass/resume/undo/redo ─> RulesSession
  └─ returnToSetup ────────────────> SetupSession（一次新编辑）
```

`SetupSnapshot` 保存 `size、board、toPlay、markers`；`SetupEditor` 保存当前快照、独立的撤回/重做栈和编辑 revision。摆棋工具不调用提子核，因此可以保留无气块。`diagnoseSetup` 调用唯一 T01 `validateSetup`；只有无气定位时再调用同一引擎的 `getGroup` 标出整块。

`enterRules` 先要求明示确认和有限贴目，再把摆棋转换为 `historyPolicy=fresh-setup` 的 Position。`startGame` 创建 `history.layouts=[rootLayout]`、空 moves、零提子、零停手和独立对局栈。起点以前的布局永不补写。规则模式中的所有行动只交给 T01；T06 不计算轮次、提子、自杀、超级劫或终局状态。

返回摆棋时只复制当前 `board、toPlay` 和原教学标记，作为 `sourceEditor` 的一次 `commitSnapshot`。该操作使规则试下的棋盘可继续编辑，也让摆棋撤回能一次回到试下前。规则引擎的 moves/history 不塞进编辑栈，编辑栈也不塞进 GameState，因此两种撤回不会混淆。

尺寸缩小以左上数据坐标交叠区为保留范围；界面在提交前显示 `resizeLoss` 的棋子/标记数量。尺寸增加不会虚构棋子。任何新编辑由 `commitSnapshot` 清空旧 redo；拒绝、无变化和取消不写栈。
