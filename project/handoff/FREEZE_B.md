---
schemaVersion: 1
id: HANDOFF-FREEZE-B
revision: 1
rulesetId: GO-CLUB-AREA-1
taskId: FREEZE_B
baseVersion: T15 0.15.0
resultVersion: 0.15.1
freezeId: GO-CLUB-FREEZE-B-20260919-01
status: complete-file-lock
date: 2026-09-19
---

# 固定 B：共同内容版本

以 T15 0.15.0 完整归档为唯一主线，仅合入 T20 0.2.0-t20.1 材料和交接。结果为 0.15.1；玩法功能仍是 T15，不开始 T16 或第23–25步。本冻结是文件、版本和证据范围的锁定，不是人类围棋专家审核。

## 输入

- T15：`go-club-T15-0.15.0-full.zip`，SHA-256 `f3933d22a57533ce0efbbdb17e7de29b232e90de153512005b18674042409da9`。
- T20 材料：`T20-0.2.0-t20.1-MATERIALS.zip`，SHA-256 `67723509c9aee7f6524032e8807a95a2431e43434f06e35c9440ad01d9dae1e2`。
- T20 复现包仅对照材料，SHA-256 `2c12065aa2a6ecac47886192a02b1f659c9d49979e9d2617b88c66e03507ac14`；未导入旧程序。
- 实际读取 T15/T20 交接、T09 清单/验证报告/独立预期/实际结果、T11 LIFE 变更与教学核对、T13/T15 验收。

## 冻结集合

权威文件 `handoff/CONTENT_FREEZE.json` 逐项列明30题、6终局的 id/revision、规则/schema、JSON和图示SHA-256、验证范围及材料文件清单。LIB/CAP/CON/LIFE/AREA/DISC 各5题，全部revision1；END-001–006 全部revision1。T11未更改LIFE正式内容，无须提升revision。

正式题库、bundle、阅读答案、图示、规则、schema、核心引擎、依赖锁定值均保持兼容。T14 TEMPLATE/T15 TEST、T04/T05 DEMO/T08 DEV不进正式集合；T20九个RULE-DEMO单独归入规则卡。DISC只供开放讨论，END-006保持未完成反例。所有humanReviewed=null。

## 修改文件

新增 `materials/rule-cards/**`、`handoff/T20.md`、本文件、`handoff/CONTENT_FREEZE.json`、`docs/freeze-b/**`、`scripts/freeze-b/**`、`scripts/verify-content-freeze.mjs`。更新根README/CHANGELOG、package版本及冻结校验脚本入口、发布清单；构建/测试产生的输出按实记录。完整逐文件变化见 `docs/freeze-b/CHANGED_FILES.json`。

没有修改正式题面/答案/终局/图示或共享规则/schema/依赖；旧T20 src/schemas/锁文件未合入。具体冲突与解决见 `docs/freeze-b/CONFLICTS.md`。

## 实际测试及人工检查

全部命令/退出码/日志见 `docs/freeze-b/evidence/checks.json` 与 `docs/freeze-b/ACCEPTANCE.md`。主要结果：341单元测试；120 Chromium检查；851内容检查、134记录手、2179规则转移；T09判题20+1；36SVG/54PDF页/36PPT页及备注共28243导出断言；T20当前引擎9项、印刷几何59项、9个Position schema；70PDF页新渲染并由助手查看逐页联系表，T20第3/5页灰度放大查看。没有称为人类教师复核。

两归档由打包器重新解压后核对SHA-256、题目/终局数量和关键文件；完整包在新解压目录再次运行构建与内容校验。最终实际结果与两归档SHA-256位于交付目录 `archive-integrity.json`、`SHA256SUMS.txt`。此记录保存在归档外，避免把归档自身哈希写入内部造成循环。

## 失败与未测

包管理器自动安装检查和首次本机端口权限导致的失败尝试已保存并解决；必需范围无剩余阻断。没有执行干净联网安装、Safari/Firefox、专用读屏器、原生Office/Keynote、实体打印/设备、人类围棋教师或课堂审核。Vite包体积与既有React act提示保留为非阻断限制。详见验收表。

## 下一步迁移要求

程序主线后续只使用0.15.1完整包；材料支线只读取冻结内容包、此交接与CONTENT_FREEZE.json。T21/T22需记录freezeId与每道题的revision，沿用坐标和原答案；不得把T20旧复现包或T14/T15示例写回主线。

任何正式题/终局/规则/schema/图示/证据或被冻结T20素材变化，都使当前freezeId失效。先在主线修订并同步bundle/清单/图示/阅读版/调用方、必要时提升revision，重核后生成新freezeId，再重做受影响材料。不能覆盖旧冻结文件或静默重算旧清单冒充同一版本。

字体与样式引用在 `docs/freeze-b/FONTS_AND_STYLE.md`；不再分发系统字体文件。冻结内容包包含T20既有PDF成品、可编辑SVG和生成源，不是新制作的T21/T22成品。
