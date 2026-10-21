---
schemaVersion: 1
id: DOC-T16-ACCEPTANCE
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# T16 验收记录

版本：0.16.0；基线：FREEZE_B 0.15.1；日期：2026-09-21。

| 验收项 | 状态 | 证据 |
|---|---|---|
| 统一课程进度、作答、对局、草稿、讨论、交接与设置 | 通过 | `src/core/unified-persistence.ts`；346 项 Vitest；T03/T08/T10/T12/T14 浏览器刷新回归 |
| 旧 localStorage 一次迁移，失败不删原记录 | 通过 | `tests/t16/storage.test.ts`；T16 Chromium legacy migration |
| 正式题库与必要资源缓存后才显示可离线 | 通过 | `public/sw.js`、`dist/offline-assets.json`；实际 `context.setOffline(true)` 后刷新并打开 30 题 |
| 未缓存首次离线诚实提示 | 通过 | T16 Chromium 删除缓存并禁网，显示 `offline.html` 恢复说明 |
| 对局、教师编辑中内容刷新恢复 | 通过 | T16 full-game 测试；`scripts/verify-t16-refresh.mjs` |
| 完整备份、损坏拒绝、原子恢复 ID/revision | 通过 | T16 Chromium 成功恢复与损坏不覆盖；T16 单元格式负例 |
| 选择性清进度不删草稿/题库 | 通过 | T16 Chromium selective clear |
| 写入失败和空间错误可恢复 | 通过 | Chromium 禁用 IndexedDB 并模拟 QuotaExceededError；页面保持可用 |
| 360/768/1280 | 通过 | `output/playwright/t16/*.png`，无页面横向溢出，人工目检无遮挡 |
| 冻结内容未改 | 通过 | `verify-t16-freeze-preservation.mjs`：201 文件 SHA-256、30 题、6 终局 |
| 新版本不强制刷新，应用前等待写入 | 通过（代码/组件） | `src/core/offline.ts` 的 waiting worker 与 `flushPersistence()`；未做两个真实发布版本之间的现场替换 |
| Safari、Firefox、实体设备、VoiceOver/TalkBack/JAWS | 未测 | 当前实际浏览器为 Playwright Chromium 151 |
| 隐私模式实机与真实磁盘配额耗尽 | 未测 | 自动化只模拟 API 不可用和 QuotaExceededError |

全量命令日志位于 `output/validation/T16/`。Vite 报告单一 JavaScript chunk 大于 500 kB；不影响正确性或离线缓存，但属于后续性能优化点。FREEZE_B 整包校验器会因 T16 合法修改 package/README/source 而失败，因此本任务使用只锁正式内容、规则与 schema 的 T16 保留校验器；原冻结清单没有被改写。
