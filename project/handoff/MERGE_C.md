---
taskId: MERGE_C
baseVersion: T17 0.17.0
resultVersion: 0.17.0-merge-c.1
programVersion: 0.17.0
rulesetId: GO-CLUB-AREA-1
schemaVersion: 1
id: HANDOFF-MERGE-C
revision: 1
status: complete
---

# 合并点 C 交接

以 T17 0.17.0 的完整工程为底，选择性接入 T18–T22 材料，保留全部程序与冻结题库。没有开始 T23/T24，没有公开发布。

## 实际输入

| 任务 | 版本 | 处理 |
|---|---|---|
| T17 | 0.17.0 | 唯一程序基准 |
| T18 | 0.2.0-plus-t18.1 | 71 文件复用，2 文件保留较新的主线记录 |
| T19 | 0.2.0-t19.1 | 111 文件新增 |
| T20 | 0.2.0-t20.1 | 78 文件完全一致复用 |
| T21 | 0.15.1-t21.1 | 138 文件新增；另补齐载荷清单别名和校验和 |
| T22 | 0.15.1-t22.1 | 211 文件新增 |

输入路径、实际 SHA-256 和 CRC 见 docs/merge-c/input-inventory.json。按五个 materials 子树和各 handoff 合并；611 个输入文件共新增 460、复用 149、保留主线 2。T17 原 1087 个文件全部一致。

## 修改文件与冲突

导入目录：materials/demo-board、materials/pair-boards、materials/rule-cards、materials/challenge-cards、materials/micro-lessons；对应 handoff/T18.md–T22.md。逐文件处理见 docs/merge-c/merge-manifest.json；新增合并文件见 docs/merge-c/CHANGED_FILES.md 与 MERGE_C_RELEASE_MANIFEST.json。

补充 README_MERGE_C.md、本交接、合并审计/目录脚本、资源目录、验证日志及渲染。没有修改 src/、schemas/、package.json、锁文件或正式题文件。

冲突具体文件与最小修复见 docs/merge-c/CONFLICTS.md：保留 T18 较新日志/清单；T20 不重复覆盖；T21 补齐包外清单引用；T22 冻结引擎只留在材料复现目录，对同一演示另用主线引擎复验。

## 实际检查

所有实际命令及日志在 docs/merge-c/checks/commands.json、mainline-extra-commands.json 和交付目录的 ARCHIVE_RECHECK.json。43 个单元测试文件 358 测试；851 内容检查；201 冻结文件检查；Chromium 导航/播放器/围地页面 25 测试。T18 47、T19 44、T20 9+59、T22 冻结/主线各 47 项；T21 重建 103 项比较；材料综合审计 959 项。58 PDF 共 216 页均渲染，6 PPTX 共 50 页及备注核对；视觉检查的实际范围见 VISUAL_REVIEW.md。资源目录 91 个文件链接存在。

最终完整归档不含 node_modules；重新解压后按完整载荷清单校验、核对数量及关键文件、重新构建与校验。最终 ZIP 的 SHA-256/CRC、实际复验结果与日志在同级 SHA256SUMS.txt、ARCHIVE_RECHECK.json、archive-recheck-logs/，为避免归档自引用不将最终 ZIP 哈希写进 ZIP 内。

## 失败与未测

最初 T22 系统 Python 缺 lxml 已通过现有配套解释器解决，原失败日志保留；无未解决阻断。没有在新机器从零安装依赖；没有真实 PowerPoint/Google Slides、实体打印/装配、投影或课堂实施复验。人类教师审查状态不改变，未编造成效。既有大包警告未改。详见 ACCEPTANCE.md。

## 迁移与下一任务

没有规则/schema/题目 revision 迁移。正式冻结 ID 为 GO-CLUB-FREEZE-B-20260919-01，30 题与 6 终局均 revision 1。T23 以本完整归档及 handoff/CONTENT_FREEZE.json 为输入，并使用 docs/merge-c/RESOURCE_CATALOG.md/JSON：它包含实际纸面文件页码、卡片/答案映射、课件页码及已安装程序路由。不要按材料包中的旧程序建立替代主线。主线程序的版本字段为 0.17.0，材料合并交付字段为 0.17.0-merge-c.1。课件字体/现场验证限制沿用原材料说明。材料没有自动添加到应用离线缓存，需单独提前保存 PDF/PPTX。
