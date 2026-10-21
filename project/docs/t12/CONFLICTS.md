---
schemaVersion: 1
id: DOC-T12-CONFLICTS
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# T12 冲突与解决记录

未发现 GO-CLUB-AREA-1、schemaVersion 1、坐标、正式题 ID/revision 或 T10 unknown/discussion 语义冲突。

T09 的 DISC 题是开放文字回答，没有 A/B 坐标字段。T12 依据每题题干和 `sampleConsiderations` 建立展示候选，并用当前 T01 对两项动作逐一重放；没有写回正式题、提升 revision 或把候选变成唯一答案。CON-003 与 CON-001 只用于两种经验证的临时合作流程，明确局部任务边界。

新增本机 `PeerDiscussionRecord` 是产品存储适配结构，不扩展 T00 正式内容 schema，不写回 ContentBundle。它仍带 schemaVersion、稳定 ID、revision、rulesetId 和精确题目引用；T16 如需统一迁移，应显式兼容该键，不能静默覆写未知版本。

T03 教师 45 分钟安排随 T12 实际活动更新为 5/10/10/15/5；回归测试改为核对五段合计 45 分钟，避免依赖旧任务文案。首次专项浏览器运行使用未重建的旧 dist，下载仍含压缩范围写法；重建生产包后同一测试通过。没有修改正式内容来迎合测试。
