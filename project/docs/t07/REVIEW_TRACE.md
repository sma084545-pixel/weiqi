---
schemaVersion: 1
id: DOC-T07-REVIEW
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 最后五手回看与因果说明

`createMoveReview(game, 5)` 从T01已经保存的 `moves`、`undoStack` 与当前board组装“该手之后”的盘面，最多取末5手。它不调用 `tryMove`，不重新生成合法性，也不修改GameState。停手帧保留相同盘面，并说明停手不参加布局重复检查。

回看复用T05受控 `StepPlayer`。T07只扩展标题、说明和播放按钮文字；T05原有默认属性及测试保持兼容。播放器拥有一个可取消定时器，切换路由或卸载会清理回调；上一步、下一步、直接完成和减少动画只改变 `reviewStep`。

获胜解释读取胜负手的T01 `TransitionEvent`：

- `groupsBefore` 确定哪些相邻对方棋块在落子前处于一气；
- `placed` 给出占据最后一口气的落点；
- `captured` 给出被提棋原位置；
- `after` 是终局盘面。

页面用圆环标获胜落点、三角标被提原位置，并用坐标文字说明。动画或说明不决定胜负，也不会把不存在于历史中的中间帧保存成着法。显示气辅助单独调用共享 `getGroup/getLiberties`，仅生成展示标记。
