---
schemaVersion: 1
id: DOC-CHANGED-FILES
revision: 10
rulesetId: GO-CLUB-AREA-1
---

# 0.9.1 完整项目文件清单

baseVersion=0.9.0；resultVersion=0.9.1；taskId=MERGE_A。

T09 原样导入的 201 个文件及各自 SHA-256 见 `content/t09/FILE_MANIFEST.json`；分类、排除范围和主线集成文件见 `docs/merge-a/MERGE_LIST.md`。0.9.1 完整工程中每个文件的大小与 SHA-256 见根 `release-manifest.json`，交付 ZIP 的 SHA-256 见交付目录 `SHA256SUMS.txt`。

相对 T08 0.9.0：

- 新增正式内容、终局、图示、题卡、答案、可编辑演示稿、内容工具、原始验证证据与 T09 交接。
- 新增合并完整性/打包脚本、合并文档、命令证据和 `handoff/MERGE_A.md`。
- 更新 package/独立引擎包版本和项目 README、CHANGELOG、SOURCES、PROJECT_CONTRACT、INTERFACES、requirements matrix。
- 移除文件：无。
- `src/`、`tests/`、`schemas/`、`pnpm-lock.yaml` 与规则库代码相对 T08 保持字节一致。

这份清单表示当前工程内容，不表示 T10 或后续模块已经实现。
