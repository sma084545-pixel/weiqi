# T14 本机草稿模型

正式导出继续使用 schemaVersion=1 的 `Puzzle` 或 `ContentBundle`，没有修改共享 schema。编辑中的不完整状态保存在独立的 `DraftWorkspace`：

- 顶层：`schemaVersion:1`、`id:LOCAL-T14-WORKSPACE`、`revision`、`rulesetId:GO-CLUB-AREA-1`、`kind:TeacherDraftWorkspace`、`entries`。
- 草稿条目：本机 `entryId`、列表 `title`、`learningGoal`、嵌入的 `puzzle`、`lifecycle`、`origin`、数字输入草稿、解答核查自报和可选人类复核自报。
- 生命周期：`draft | published | deleted`。删除是可恢复的软删除。
- `origin` 区分空白、TEMPLATE、正式只读来源和本机派生副本，并保存源 ID/revision。

`numberAnswerText` 允许编辑阶段保留真正的空白。只有零或正整数字符串才同步到 `Puzzle.answer.value`；发布检查同时读取该草稿字段，避免 schema 所需的占位 `0` 被当成作者答案。

存储键为 `go-club:teacher-drafts:v1`。读取拒绝未知主版本、规则 ID 或缺少恢复身份的条目，并保留原始浏览器记录；不会用空工作区覆盖坏数据。正式导出不包含编辑器元数据，学习目标同步写入 `conditions.assumptions` 的“学习目标：”条目。
