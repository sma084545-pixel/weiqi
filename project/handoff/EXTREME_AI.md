---
taskId: EXTREME_AI
baseVersion: AI_PLAY 0.24.2-pages.1
resultVersion: 0.25.1-pages.1
rulesetId: GO-CLUB-AREA-1
schemaVersion: 1
status: production-integration-in-progress
---

# 极致模式增量交接

唯一底本为已验证 SHA-256 的 0.24.2 完整归档。实现位于 work/extreme-ai-20261103/mainline/go-club；sources 未动。用户已创建免费服务并提供实际地址 https://weiqi-katago-extreme.onrender.com，公开就绪接口确认指定模型已加载；当前正在正式网站联调，完成前 LATEST 仍为 0.24.2。

2026-11-03 用户明确仅授权免费资源。70.4M 原候选在 512 MB 容器 OOM，放弃付费路线，旧研究证据移至 docs/extreme-ai/rejected-paid-candidate/。另28.5M候选在免费规格出现9路TIMEOUT，证据移至docs/extreme-ai/rejected-free-tf3/。当前固定较小模型 kata1-tf2-b10c384-s2941M-d5872M（10.5M 参数）已通过实际 0.1 CPU/512 MB 容器测试，峰值153.04MiB、无OOM，9–19路约32秒。有效 Blueprint plan=free，不得创建付费资源。

已实现第四档、独立服务选择、固定文件 SHA 和模型身份核验、失败时保留原局、同模型赛后复盘。55项AI单测、541项完整单测、851内容检查、176+22项浏览器回归通过；真实四尺寸、同模型复盘、撤回/重做、刷新暂停、触屏/键盘通过。CI 41559023753，运行提交a4cb05b；详见 docs/extreme-ai/ACCEPTANCE.md。

修改范围为 src/core/analysis/、src/features/ai-game/、src/features/katago-review/useKataGoReview.ts、server/analysis/、schemas/ai-session.schema.json；新增独立 Docker、模型获取/验证、配置、许可证、Free Blueprint、集中构建配置、测试及验证工具。最终逐文件清单随本轮交付。未改规则内核、Board、正式题库/终局/材料及 revision、依赖和锁文件。

原存储键和 schema 1 保留，difficulty 只追加 extreme。旧三档读写兼容；回滚旧版本前导出极致记录，不把未知难度自动降级。原 weiqi-katago、weiqi-rooms 保持；新极致 URL 仅写入集中前端配置。前端从已发布准备版0.25.0提升到0.25.1以触发离线缓存安全更新；实际Render后台0.25.0/API2无需重启或升级套餐。

尚未完成：正式网站完整联调及正式完成归档。部署准备包不作为最终交付。浏览器保存的权限拒绝Render后台访问；服务由用户创建，部署与性能结论只据公开真实HTTP、浏览器和容器证据，不冒称已核查账户账单或后台私有日志。全部通过后才更新LATEST。
