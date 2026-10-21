---
schemaVersion: 1
id: DOC-T12-RECORD-SCHEMA
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# T12 本机讨论记录结构

`PeerDiscussionRecord` 是 T12 的本机产品记录，不是正式 Puzzle，也不写回 T09 bundle。顶层含 `schemaVersion=1`、稳定本机 id、`revision=1`、`rulesetId`、`kind`、本机时间、精确 `contentRef{id,revision}`、活动种类、候选动作、匿名角色和讨论字段。

候选动作仅为 `{type:"place",at:{row,col}}` 或 `{type:"pass"}`；坐标继续采用左上角 0-based。`choice.kind` 为 A、B 或 self。`discussion.partnerHadTurn` 只记录参与者是否自行勾选，程序不把它转成评价或已证实合作。

集合 `PeerDiscussionCollection` 带同样顶层身份字段与最多 200 条记录；写入前验证类型、文本上限、动作、唯一记录 ID 和主版本。格式错误或未知版本会失败关闭，保留存储端原始字节。记录不含真实姓名、能力分数、公开排行或上传地址。

当前接口在 `src/features/cooperative/model.ts`：`inspectDraft`、`createRecord`、`addRecord`、`deleteRecord`、`createDiscussionStore`、`collectionJson`。T16 扩展离线或迁移时必须继续使用公共 `StoragePort`，并按显式主版本迁移。
