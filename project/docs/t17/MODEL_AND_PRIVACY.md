---
schemaVersion: 1
id: DOC-T17-MODEL-PRIVACY
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# T17 数据、版本和证据边界

新增模型独立位于 `schemas/t17-evidence.schema.json`，共同 `schemas/content.schema.json` 字节未改。T17Workspace 与 T17EvidenceReport 都带 schemaVersion=1、稳定 id、revision 和 rulesetId；它们由 T17 校验器处理，不伪装为共同 ContentDocument。Feedback 和 Puzzle 直接引用共同定义，数据坐标与题目编号不变。

| 记录 | 字段与语义 |
|---|---|
| ActivityRecord | id、date、title、developmentOnly；活动存在是使用者输入，不证明实施 |
| FeedbackEntry | 活动编号、问题类型、可选 resourceRef、共同 Feedback；activityRef 指向精确活动 revision |
| Feedback | difficulty 可空；preferredActivities 为一个已知选项或空集合；comment、consentToUse；evidenceType=participant-submission；测试由 developmentOnly 明示 |
| ImprovementRecord | 问题、证据 ID/说明、原资源 ID/revision、修改与日期、验证方法、实施日期、实施后观察、下一步、state、revisionLink |
| CASProcessRecord | 关联活动、日期、本人设计/修改、同伴贡献、AI 协助、参考、实施、手动 actualMinutes、反思 |
| revisionLink | beforeRef/afterRef 和本机前后 Puzzle 快照；导出报告的快照为 null，版本引用保留 |

`validateEvidence` 先 AJV 结构校验，再核查唯一 ID、真实日期、活动引用/版本、测试标志一致、已知偏好和实施约束。未实施不得有实施后观察；已实施必须填写有效实施日期。人类复核字段不会由本模块填入。未知主版本和错误字段返回可理解信息；原数据不删除。

## 共用持久化

唯一键 `go-club:evidence:v1` 通过 T16 共用 IndexedDB 保存，namespace=evidence；数据库与存储主版本仍为 1。workspace revision 每次修改递增；改单条日志时其 revision 也递增。活动编号固定；一次答复 token 只用于避免同次重复提交，不是成员 ID 或设备指纹。

新增 `commitLocalValues` 是 T16 的事务扩展。它等待既有写入，再提交一组值；同步 put 异常或异步 abort 都回滚整笔。只有完成后才更新内存镜像。T17 与 T14 草稿同时提交，不能形成“日志说已修改，草稿其实没存”的状态。

T16 备份格式仍为 LocalBackup 主版本 1，新增 namespace 属于兼容扩展。0.17.0 可恢复 0.16.0 备份，旧备份没有反馈时维持空态；0.16.0 不识别 evidence，会拒绝新分区备份，不能拿旧程序降级覆盖。反馈报告 JSON 是审核副本，不作为完整恢复文件；恢复使用教师页的完整备份。

## 资源修订与冻结

`stageResourceRevision` 复用 T14 的 copyAsNew/createRevision/saveEntry，不自行创建第二套题目模型。正式题生成新的 LOCAL id，再由 r1 到 r2，保留原 resourceRef；已有本机资源在同 ID 新 revision，拒绝从落后版本覆盖更高版本。新稿 validation 重置且 lifecycle=draft；日志默认仍未实施。相同日志不能重复生成版本。

FREEZE_B 的 201 个正式内容/规则/schema 文件、30 题和 6 终局 revision 均未改；无需使材料支线重新冻结。若后续将本机修改正式发布进主线，必须按既有冻结流程同步 ID/revision、证据、清单和纸卡/PPT，不能把本模块的草稿创建当正式内容替换。

## 导出与隐私

教师本机汇总显示所有实际答复，报告仅包含同意导出的答复。报告分母只用实际导出条数，教师页分母则用当前活动全部答复数，二者范围必须保持明确。模板与固定测试由 developmentOnly 隔离，默认不出现在报告。

预览可删减活动简名、答复 comment、改进的所有自由文字和 CAS 分类文字；版本快照全文只在本机/备份，不进入分享报告。Markdown 转义输入文字及引用，React 文本渲染和 PDF textContent 不执行输入 HTML、脚本或外链。

导出字段 reviewedFreeText=true 表示经过本程序的审核步骤，不能证明某个人已认真人工审查，也不是 humanReviewed。所有记录都是本机使用者输入，程序不认证身份、出勤、贡献或真实性。允许人工反思，禁止从生成时长推导工时或从三条答复推导学习成效。

完整备份保留未删减原文，分享前应改用审核报告。逐条删除更新统计，改进日志中的已删证据引用保留并标为缺失；独立 evidence 清除不会删除教师草稿或题库。
