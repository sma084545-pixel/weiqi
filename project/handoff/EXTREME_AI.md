---
taskId: EXTREME_AI
baseVersion: AI_PLAY 0.24.2-pages.1
resultVersion: 0.25.2-pages.1
rulesetId: GO-CLUB-AREA-1
schemaVersion: 1
status: complete-with-documented-limits
---

# 极致模式增量交接

唯一底本为SHA-256 de5a374a0dbf6b1134c5bd16b795b472913e94c17ce142f75548d2c41c5177a0的0.24.2完整归档。实现位于work/extreme-ai-20261103/mainline/go-club；sources未动。用户已创建Free服务https://weiqi-katago-extreme.onrender.com，原GitHub网站0.25.2已实际完成新模型对弈与赛后复盘、本机4190同步验证。正式完成包与校验在work/release/0.25.2-pages.1。

2026-11-03 用户明确仅授权免费资源。70.4M 原候选在 512 MB 容器 OOM，放弃付费路线，旧研究证据移至 docs/extreme-ai/rejected-paid-candidate/。另28.5M候选在免费规格出现9路TIMEOUT，证据移至docs/extreme-ai/rejected-free-tf3/。当前固定较小模型 kata1-tf2-b10c384-s2941M-d5872M（10.5M 参数）已通过实际 0.1 CPU/512 MB 容器测试，峰值153.04MiB、无OOM，9–19路约32秒。有效 Blueprint plan=free，不得创建付费资源。

已实现第四档、独立服务选择、固定文件SHA和模型身份核验、失败保留原局、同模型赛后复盘。55项AI单测、541项完整单测、851内容检查、176+22项浏览器回归通过；正式网页实际新模型回复/复盘、撤回/重做、刷新暂停、触屏/键盘及原三档逐档真引擎通过。CI 41559023753运行提交a4cb05b；正式0.25.2运行发布提交827958f，之后交接/证据提交不改运行产物。详见docs/extreme-ai/ACCEPTANCE.md与checks/。

修改范围为 src/core/analysis/、src/features/ai-game/、src/features/katago-review/useKataGoReview.ts、server/analysis/、schemas/ai-session.schema.json；新增独立 Docker、模型获取/验证、配置、许可证、Free Blueprint、集中构建配置、测试及验证工具。最终逐文件清单随本轮交付。未改规则内核、Board、正式题库/终局/材料及 revision、依赖和锁文件。

原存储键和schema1保留，difficulty只追加extreme。旧三档读写兼容；回滚旧程序前导出极致记录，不自动降级。原weiqi-katago与weiqi-rooms保持。新URL只写入集中配置；前端最终0.25.2安全升级旧缓存，旧2手棋谱与AI暂停状态实测保留；实际Render后台0.25.0/API2无需升级。0.25.1漏配构建问题已由发布保护修复，后续严格按检查→build:pages→配置验证→同步顺序发布。

实际命令：pnpm check、pnpm test:ai、pnpm build:analysis、pnpm build:pages、pnpm test:browser；真实HTTP scripts/extreme-real-smoke.mjs；实际浏览器scripts/extreme-public-browser.cjs、extreme-public-mobile.cjs、extreme-public-upgrade[-recovery].cjs、extreme-all-clients.cjs；封包/清洁重验scripts/package-extreme.py与verify-extreme-packet.py。逐文件清单docs/extreme-ai/CHANGED_FILES.json，外部完整归档复验与校验随release交付。

失败/未测：原70.4M OOM与28.5M超时均弃用；0.25.1漏配构建已关闭；浏览器测试时序问题与更正均在验收说明保留。没有已知未解决的核心阻断。Free休眠、限流及低搜索量仍有限制；不承诺人类段位。Safari/Firefox、实机、长期满载与教师审核未做。浏览器权限拒绝后台访问，未查Render账户账单或私有日志；结论只据用户创建信息、公开真实HTTP、浏览器和容器证据。更新前备份，保存后应用新版本，不清站点数据；正式题库、材料和锁文件无迁移要求。
