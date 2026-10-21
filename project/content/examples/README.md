---
schemaVersion: 1
id: DOC-DEV-EXAMPLES
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 开发示例，不是正式题库

valid/含十份结构有效文档（含bundle）；invalid/含四份必须拒绝的文件。它们是开发输入，不属于LIB-001等正式题目，也不是学校活动记录。负例期望字段见expected-errors.json。DEV-LIB-001用于四气集合；DEV-END-001用于5路面积算术的明确教学假设。所有人类复核字段为null。

pnpm validate:content同时运行正例与负例并输出output/validation/content-report.json。结构接受不是规则合法、正确解答或人工审核。GameState/recorded历史需T01重放；fresh-setup进入规则模式前也需T01 validateSetup。
