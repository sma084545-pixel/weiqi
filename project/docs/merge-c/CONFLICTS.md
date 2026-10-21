---
schemaVersion: 1
id: MERGE-C-CONFLICTS
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 合并边界与冲突处理

基准为 T17 0.17.0 完整归档。所有输入的实际路径、SHA-256、CRC 与隔离解压位置见 input-inventory.json。只合入五个 materials 子树和对应 handoff；不使用材料包携带的旧工程覆盖主线。

1. T18 `materials/demo-board/qa/commands.log`：T17 比材料包多出基准不可变性、打包及归档消费检查；保留 T17 较完整日志。`artifact-manifest.json` 因对应日志哈希不同一并保留 T17 版本。其余 71 个文件字节一致。
2. T20 的 78 个输入文件与 T17 完全一致，不重复覆盖；继续保留 docs/freeze-b/CONFLICTS.md 的既有修正及证据。
3. T21 handoff 引用根 FILE_MANIFEST.json 和 SHA256SUMS.txt，但上游 source/package_materials.py 明确把外层清单排除出 ZIP。实际包内有 validation/PACKAGE_PAYLOAD_MANIFEST.json，原始载荷哈希已逐文件通过。最小修复：按这个真实载荷清单增加 FILE_MANIFEST.json 别名和 SHA256SUMS.txt；保留原 handoff、原载荷和原清单。新增说明明确它们是 MERGE_C 补齐文件，而非伪称原包已有。
4. T22 自带冻结引擎和主线当前编译引擎的字节哈希不同，材料中的冻结副本保留作复现证据，主线引擎不替换。另增加 scripts/verify-merge-c-t22.mjs，以当前主线引擎重放相同 47 个检查，全部通过。该脚本仅计算并输出，不改材料图示或答案。没有改变规则、坐标、正式题 revision 或 schema。
5. 系统 Python 执行 T22 verify-delivery.py 缺少 lxml，原失败日志保留；改用已存在的配套 Python 运行后通过，没有修改验证器或安装新依赖。临时脚本生成时曾因工作目录重复前缀失败，修正路径后重新执行通过；没有材料损坏。归档复验曾把引擎入口误写为 src/core/rules.ts；实际目录入口是 src/core/rules/index.ts。八项执行命令均通过，修正检查路径后重新从最终 ZIP 解压复验，原报告保留在外层记录。

正式 30 题、6 终局、201 个被冻结内容/规则/schema 文件保持不变。基准逐文件比较 1087/1087 一致（见 checks/baseline-preservation.json）。新增材料和合并文档不使 CONTENT_FREEZE.json 失效。

交付版本为 0.17.0-merge-c.1；程序版本仍为 0.17.0。根 release-manifest.json 是 T17 原始归档的历史清单，不能将它作为本次新增材料清单；本次唯一完整载荷清单为 MERGE_C_RELEASE_MANIFEST.json。
