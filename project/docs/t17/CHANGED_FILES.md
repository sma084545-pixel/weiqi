---
schemaVersion: 1
id: DOC-T17-CHANGED-FILES
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# T17 修改清单

唯一基线是 T16 0.16.0 完整归档；resultVersion=0.17.0。精确逐文件增改与哈希另见 `output/validation/T17/change-manifest.json` 和最终 release-manifest。

| 文件/目录 | 修改用途 |
|---|---|
| src/features/evidence/* | 新成员表、汇总、改进、CAS、审核导出；模型、样式和报告安全文本 |
| schemas/t17-evidence.schema.json | 独立扩展模型，复用共同 Feedback/Puzzle，无主版本变更 |
| src/core/unified-persistence.ts | 0.17.0、evidence 分区、原子多值提交、备份/独立清除 |
| src/features/learning-hub/{registry.ts,LearningHub.tsx,LearningHub.css} | 两入口、教师导航、页脚反馈与 44px 触控目标 |
| src/features/offline-data/OfflineData.tsx | evidence 清除范围、完整备份原文提示 |
| scripts/finalize-offline.mjs、package.json | 0.17.0 缓存与模板、T17 校验/测试脚本，无依赖变更 |
| scripts/validate-t17.ts、scripts/package-t17.py | 结构负例与独立统计验证、完整/站点归档和哈希 |
| content/t17/development/* | 明确 TEST 开发例、预期结果、未知版本负例和阅读报告 |
| tests/t17/*、tests/browser/t17.spec.ts | 单元、统计、版本/隔离、保存/导出/断网/尺寸验收 |
| tests/browser/t16.spec.ts | 未准备缓存测试版本名由 0.16.0 对齐 0.17.0；原语义不变 |
| materials/t17/CAS-evidence-template.md | 空白证据与反思模板，不是已发生经历 |
| README、CHANGELOG、SOURCES、docs/PROJECT_CONTRACT、INTERFACES、requirements-matrix | 当前版本、来源、兼容扩展、责任和迁移同步 |
| docs/t17/*、handoff/T17.md、output/validation/T17/* | 输入、验收、修改、迁移与实际命令证据 |
| output/playwright/t17、output/pdf/T17-*、dist、dist-engine、release-manifest.json | 实际截图、开发报告、静态与规则库重建、归档清单 |

构建和回归还刷新既有 output 下的机器报告及截图，它们属于开发验证产物；原交接与历史失败记录保留。没有用 T09 旧工程覆盖主线，没有更改规则引擎源码、Board、共同 schema、锁文件或冻结的正式题/终局/图示/材料。没有新购服务、公开发布、发送记录或生成真实学生资料。
