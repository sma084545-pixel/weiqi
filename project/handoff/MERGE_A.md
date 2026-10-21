---
schemaVersion: 1
id: HANDOFF-MERGE-A
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# MERGE_A 交接：T08 主线加入 T09 正式内容

- taskId: MERGE_A
- baseVersion: 0.9.0（T08）
- contentInputVersion: 0.2.0-t09.1（T09）
- resultVersion: 0.9.1
- rulesetId: GO-CLUB-AREA-1
- schemaVersion: 1
- 完成状态: 合并 A 完成，无规则/schema/内容阻断项；T10 未开始

## 输入与边界

唯一主版本是 T08 0.9.0 完整 ZIP，SHA-256 `cf4441626c76271e822a8a650e7238779d1802bb4b7e60a26b250255261cad2f`。内容输入是 T09 0.2.0-t09.1 增量 ZIP，SHA-256 `d1b2d176756e39de044c0cf8b68a0a93872824417f03ce5ae2d3c23090ed5a3a`。两个归档分别解压到隔离目录，外部交接、包内 `handoff/T09.md`、`content/validation-report.md`、FILE_MANIFEST、input-manifest 和 `content/validation/` 实际证据均已读取。

只导入 T09 清单内的 `content/**` 与 `handoff/T09.md`，共 201 个文件。没有用 T09 旧 T01 完整工程覆盖主线，也没有导入其 `src/`、schema、依赖、锁文件、根 README/CHANGELOG 或旧 package。详细文件分类见 `docs/merge-a/MERGE_LIST.md`，每个文件的大小和 SHA-256 见 `content/t09/FILE_MANIFEST.json`。

## 内容结果

- 30 道正式题：LIB/CAP/CON/LIFE/AREA/DISC 各 5 道；正式自动池 25、讨论池 5、隔离池 0。
- 6 个终局：END-001–005 保持教学假设与空确认者，END-006 保持争议状态且无预期最终分。
- 36 个同 ID/revision SVG、18 页 A4 题卡、36 页答案册、36 页可编辑 PPT/备注。
- 全部正式内容为 revision=1、schemaVersion=1、GO-CLUB-AREA-1；`humanReviewed=null`。

## 冲突及解决

T09 安全应用器因 T08 规则库产物不再等于旧 T01 构建哈希而拒绝，且明确没有写入。schema 与锁文件指纹完全相同；按清单选择性复制后，用 T08 原规则库重跑 T09 全部内容和适配器检查，证明现有接口兼容。没有修改规则、schema、坐标或正式 ID。完整事实和日志见 `docs/merge-a/CONFLICTS.md` 与 `output/validation/MERGE_A/`。

## 修改文件

- T09 导入：`content/puzzles`、`content/endgames`、`content/artwork`、`content/print`、`content/t09`、`content/tools`、`content/validation`、`content/validation-report.md`、`content/quarantine/README.md`、`handoff/T09.md`。
- 主线集成：`package.json`、`dist-engine/package.json`、README、CHANGELOG、SOURCES、PROJECT_CONTRACT、INTERFACES、requirements matrix。
- 新增：`scripts/verify-merge-a.mjs`、`scripts/package-merge-a.py`、`docs/merge-a/*`、`output/validation/MERGE_A/*`、本交接和新 `release-manifest.json`。
- T08 的 `src/`、`tests/`、`schemas/`、`pnpm-lock.yaml` 与规则库代码保持原字节。

## 实际测试

- `node --import tsx content/tools/validate.mjs`：851 项通过；134 手记录重放；2179 个状态转移；30 题 + 6 终局。
- `node content/tools/test-grade.mjs`：21 项通过，含合法未覆盖 `unknown`、多解、开放讨论和无效输入状态不变。
- `python3 content/tools/validate_exports.py`：28,243 项通过；36 SVG、54 PDF 页、36 PPT 页及备注。
- `pnpm check`：26 个测试文件、264 项测试通过；schema、基础内容正负例、T09、TypeScript/Vite 构建、独立 ESM/声明和容量检查通过。
- `pnpm test:browser`：Chromium 66 项通过。沙箱首次禁止绑定端口，允许本地测试服务器后同一命令通过。
- `node scripts/verify-merge-a.mjs`：201 个 T09 文件、数量、ID/revision、发布池、终局边界和哈希通过。
- 候选完整 ZIP 重新解压后再次执行 `pnpm check` 与 `verify:merge-a`，结果同样通过。

完整命令状态与日志见 `output/validation/MERGE_A/command-report.json` 和同目录日志。

## 失败与未测

阻断失败：无。纯离线全新安装因本机 pnpm 缓存缺少锁定的 `react-dom@19.2.8` tarball 失败；没有改锁文件，测试使用 T08 已安装且与同一锁文件匹配的依赖树。Safari、Firefox、实体手机/平板/投影、VoiceOver/TalkBack/JAWS、人类围棋教师复核、真实打印、课堂使用、学生反馈、原生 Office、学校条件、CAS 工时和实施效果未测或没有产生。

## 迁移要求与下一步

后续只使用 0.9.1 完整归档作为唯一主版本，并先读本交接、`handoff/T08.md`、`handoff/T09.md`、`content/validation-report.md` 与 `docs/merge-a/`。T10 若接入互动页面，入口使用 `content/t09/bundle.json`，教学补充使用 `pedagogy.json`；判题必须保留合法未覆盖着法返回 `unknown`、DISC 不判唯一最佳手、END-006 不显示虚构最终分的边界。

题干、答案、棋形、条件、引用或核查证据变化必须递增对应 revision，并同步 JSON、bundle、SVG、答案、PPT 和清单。不得把未知过去补成劫史，不得修改 GO-CLUB-AREA-1 含义而沿用原 rulesetId。T10 尚未开始。
