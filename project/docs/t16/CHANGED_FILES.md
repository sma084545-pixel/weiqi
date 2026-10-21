---
schemaVersion: 1
id: DOC-T16-CHANGED-FILES
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# T16 修改清单

- 新增：`src/core/unified-persistence.ts`、`src/core/offline.ts`、`public/sw.js`、`public/offline.html`、`public/app.webmanifest`、`scripts/finalize-offline.mjs`。
- 新增：`src/features/offline-data/`、T16 路由、教师入口、状态与更新提示。
- 接入：T03 进度、T06 临时盘、T08 对局、T10 作答、T12 讨论、T14 草稿/当前编辑会话、T15 交接库与显示设置全部改用公共端口。
- 新增：`tests/t16/storage.test.ts`、`tests/browser/t16.spec.ts`、`scripts/verify-t16-refresh.mjs`、`scripts/verify-t16-freeze-preservation.mjs`。
- 更新：T08 浏览器测试适配 T16 自动恢复；README、CHANGELOG、PROJECT_CONTRACT、INTERFACES、requirements-matrix、SOURCES、package.json 和 Playwright 预览命令。
- 构建产物：`dist/` 追加正式题库副本、备用纸面材料、离线清单和版本化 Service Worker。

未修改：`schemas/`、`docs/RULES.md`、`docs/CONTENT_SCHEMA.md`、正式 30 题、6 终局、图示/印刷内容、T20 冻结材料、T01 规则语义与 `pnpm-lock.yaml`。
