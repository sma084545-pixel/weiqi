---
schemaVersion: 1
id: FREEZE-B-CONSUMER-README
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 给后续材料任务的共同输入

freezeId：`GO-CLUB-FREEZE-B-20260919-01`。主线结果版本 0.15.1，功能基线 T15 0.15.0；正式内容版本仍为 T09 0.2.0-t09.1。以 `handoff/CONTENT_FREEZE.json` 中的逐文件 SHA-256 和逐题 id/revision 为准。

先在解压目录执行 `node scripts/verify-content-freeze.mjs`；没有依赖下载，也不修改文件。读 `handoff/FREEZE_B.md`、`docs/RULES.md`、`docs/CONTENT_SCHEMA.md`、`docs/TERMINOLOGY.md`。冻结清单是交付元数据，不是 Puzzle 或 ContentBundle，不能交给题目导入器。

正式材料只有六类各 5 题（LIB、CAP、CON、LIFE、AREA、DISC）和 END-001–006。JSON 独立文档、`content/t09/bundle.json`、`pedagogy.json`、独立预期、验证报告、阅读版答案、36 张 SVG 必须配套使用。所有正式文档目前 revision=1。T11 对 LIFE 的补充核查见 `docs/t11/LIFE_CONTENT_CHANGE_RECORD.md` 与 `TEACHING_CORRECTNESS_REVIEW.md`。

- LIB/CAP/CON/LIFE/AREA 共 25 题只在已验证目标、答案或覆盖变化内判定；未知合法着不能因为没有收录就判错。
- DISC 五题是讨论参考，没有唯一最佳着或自动文本质量评分。
- END-001–005 是明确的教学假设计分，confirmedBy 为空；不冒称真实双方确认或任意棋块的自然死活证明。
- END-006 是未结束/争议反例，expectedScore=null；不能据染色补出赢家。
- 所有 humanReviewed=null。本次冻结、程序重放和助手目检不是人类围棋教师审核。

T20 成品、可编辑 SVG、生成源、九个 RULE-DEMO Position 和教师说明位于 `materials/rule-cards/`。这些是规则材料，不计入正式 30 题。不要用 T20 旧复现工程覆盖主线。字体、样式与授权边界见 `FONTS_AND_STYLE.md`；T09 已有 PDF/PPT 是输入参考，不是本次新制作的 T21/T22 最终题卡/PPT。

冻结内容包不含 T14 TEMPLATE、T15 TEST、其他开发示例或完整前端。程序开发应取完整主线包。内容包中保留当前核心引擎、schema 和内容校验所需源码/工具；若要重跑计算验证，可在完整主线按验收文档执行。材料任务应读取这些输入，在自己的输出目录制作新文件，不能直接改冻结源文件。

任何正式题面、答案、条件、ID/revision、终局、图示、规则/schema、证据或 T20 冻结素材的修改都会使本 freezeId 失效。应先回主线修订内容，必要时提升 revision，同步 bundle/清单/图示/答案/调用方，重跑相关验证，再产生新 freezeId；T21/T22 最终文件记录所用 freezeId 和题目 revision。不能修改校验值后继续使用旧 freezeId。

本包不启动 T16，也不自动开始第 23–25 步。
