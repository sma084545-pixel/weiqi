---
schemaVersion: 1
id: DOC-T06-EXPORT-STORAGE
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# T06 导出、回读与共同模型兼容

共同 schemaVersion=1 的 Position 是封闭对象，字段中没有 Marker。T06 没有单方面扩展 Position；它提供两种用途明确的输出：

| 输出 | 内容 | 能否保留标记 |
|---|---|---|
| `positionJson(editor)` | 单份 Position，`fresh-setup`、`history=null` | 否；用于规则起点或下游 Position 消费者 |
| `bundleJson(editor)` | 一份 Position + 每个标记一份 MarkerDocument 的 ContentBundle | 是；用于 T06 完整回读 |

数字标记使用既有 Marker `type=sequence`，标签为“数字 N”；回读只接受 1–99 的严格格式。目标标记使用 `type=target`。全部独立文档带 schemaVersion、稳定本机 ID、revision 和 rulesetId，坐标仍为左上 0-based。

`restoreExperiment` 先调用共同 `parseContent/validateContent`，然后要求恰好一份 Position、相同尺寸的单点 target/sequence Marker。重复占点、未知棋子、越界、未知 schema 主版本、额外字段和错误标记格式都会以字段路径拒绝。回读不执行 HTML、脚本或外链，也不把 Position 当成已知棋谱。

设备保存 ID 是 `LOCAL-T06-WORKSPACE`，沿用 `go-club:v1:*` 公共内容存储键。写入前先做共同结构校验；失败不覆盖旧值。T16 可在保持 StoragePort 与失败语义的前提下增强离线和迁移，T15 才负责通用批量导入/SGF。
