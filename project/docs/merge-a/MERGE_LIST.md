---
schemaVersion: 1
id: DOC-MERGE-A-LIST
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 合并 A 清单

## 输入

| 角色 | 版本 | SHA-256 |
|---|---|---|
| 唯一主版本 `go-club-T08-0.9.0-full.zip` | T08 0.9.0 | `cf4441626c76271e822a8a650e7238779d1802bb4b7e60a26b250255261cad2f` |
| 内容增量 `T09_完整内容增量包_0.2.0-t09.1.zip` | T09 0.2.0-t09.1 | `d1b2d176756e39de044c0cf8b68a0a93872824417f03ce5ae2d3c23090ed5a3a` |

两个输入均先在隔离目录解压，并通过 ZIP CRC、路径安全和清单哈希检查。合并目标版本为 0.9.1；rulesetId 仍为 `GO-CLUB-AREA-1`，schemaVersion 仍为 1。

## 从 T09 原样导入

T09 的 `content/t09/FILE_MANIFEST.json` 列出 200 个文件；连同清单自身共导入 201 个文件，全部逐项核对大小与 SHA-256：

| 路径 | 数量 | 内容 |
|---|---:|---|
| `content/puzzles/` | 30 | LIB/CAP/CON/LIFE/AREA/DISC 各 5 题，ID `*-001`–`*-005` |
| `content/endgames/` | 6 | `END-001`–`END-006` |
| `content/artwork/` | 36 | 与 30 题和 6 终局同 ID/revision 的 SVG |
| `content/print/` | 4 | A4 题卡 PDF、答案册 PDF/Markdown、可编辑 PPTX |
| `content/tools/` | 9 | 内容构建、判题、导出、验证、打包与安全增量工具 |
| `content/t09/` | 9 | bundle、教学补充、独立预期、发布池、来源、输入指纹、说明与两份清单 |
| `content/validation/` | 104 | 实际日志、JSON 报告和最终渲染证据 |
| `content/validation-report.md` | 1 | T09 逐题验证总报告 |
| `content/quarantine/README.md` | 1 | 待核查池边界；当前池为空 |
| `handoff/T09.md` | 1 | T09 正式交接 |

30 道正式题和 6 个终局均为 revision=1、schemaVersion=1、GO-CLUB-AREA-1。正式目录中没有 DEV、DEMO、TEMPLATE 或 TEST ID。现有 `content/examples`、`content/t04`、`content/t05` 继续分别作为开发样例和模块演示，不计入 30 题。

## 主线为完成合并新增或更新

- 将项目版本从 0.9.0 更新为 0.9.1，并为 `pnpm check` 加入 T09 内容重放、判题适配器和合并完整性检查。
- 新增 `scripts/verify-merge-a.mjs` 与 `scripts/package-merge-a.py`。
- 更新 README、CHANGELOG、PROJECT_CONTRACT、INTERFACES、requirements matrix 与 SOURCES 的当前版本和 T09 状态。
- 新增 `docs/merge-a/`、`handoff/MERGE_A.md` 和 `output/validation/MERGE_A/`。
- `dist-engine/package.json` 只随项目版本标为 0.9.1；规则库代码恢复为 T08 原归档字节。

## 明确没有导入

没有从 T09 旧工程导入或覆盖 `src/`、`schemas/`、`tests/`、共享依赖、`pnpm-lock.yaml`、根 README、根 CHANGELOG、T09 的旧 `package.json` 或旧完整工程。没有读取其旧 T01 复现 ZIP 作为主版本，也没有开始 T10。

逐文件哈希以 `content/t09/FILE_MANIFEST.json` 和根 `release-manifest.json` 为准；基线保护证据见 `output/validation/MERGE_A/base-preservation.json`。
