# T14 模板与导出约定

`content/t14/templates.json` 是 schemaVersion=1、rulesetId=`GO-CLUB-AREA-1` 的开发 `ContentBundle`，含四个 `developmentOnly:true` 的 TEMPLATE 项。模板答案用于演示字段与交互，`solutionChecked` 仅为 partial，并明确要求发布前重新核查；`humanReviewed` 全为空。

| ID | 用途 | 答案类型 |
|---|---|---|
| TEMPLATE-LIB-001 | 中心单子数气 | number |
| TEMPLATE-CAP-001 | 一步占最后一气 | move-tree |
| TEMPLATE-LIFE-001 | 两个独立眼位 | point-set |
| TEMPLATE-DISC-001 | 计划与回应讨论 | open-text |

导出 Puzzle 时保留题目自身 `schemaVersion/id/revision/rulesetId`。导出 Bundle 时新建 `BUNDLE-{puzzle.id}` 身份，并只含当前题。两者均采用纯 JSON，不含 HTML、脚本或外链执行；T15 才负责完整导入、图片和 SGF。模板不会写入 T09 正式 30 题 bundle。
