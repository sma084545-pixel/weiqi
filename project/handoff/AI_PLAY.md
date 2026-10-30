---
taskId: AI_PLAY
baseVersion: ADVANCED_COURSES 0.23.0-pages.1
resultVersion: 0.24.0-pages.1
rulesetId: GO-CLUB-AREA-1
schemaVersion: 1
status: implementation-verified-awaiting-public-deployment
---

# AI 对弈增量交接

主线：`work/ai-play-20261030/mainline/go-club`。以已核对SHA的0.23.0完整归档解压，不从旧T01或材料支线覆盖。sources只读未动。当前唯一完成主版本仍由work/release/LATEST.json指向0.23.0；正式部署与新归档复查后才提升LATEST。

## 修改文件

新增src/features/ai-game/{AiGame.tsx,AiGame.css,model.ts,storage.ts,client.ts,useAiOpponent.ts}，src/core/analysis/ai-contract.ts，server/analysis/ai.ts，schemas/ai-session.schema.json，tests/ai-game/及固定开发fixture；真实HTTP/浏览器/缓存升级脚本，docs/ai-play/。

最小调整server/analysis/{position,http,engine}.ts（独立ai-move用途、限定搜索、统一排队取消、就绪能力与appVersion），src/core/analysis/contract.ts（增量错误/健康字段），LearningHub/registry/导航响应式、FullGame暴露现有确认对话框与入口，BoardDisplayTools增加可选AI文字上下文。T15 SGF的AP版本由过时硬编码0.15.0改为公共APP_VERSION。程序版本0.24.0；未改规则算法、坐标、内容schema1、正式题/终局/进阶题、依赖或锁文件。

公共存储新增键go-club:full-game:ai:v1，namespace games；AiGameSession版本1持有options、完整GameState及待确认清单。原真人/引导对局、学习进度键与revision策略不变，无强制迁移。源码新扩展schema独立，不改T00生成类型。JSON导入仍要合法重放，不能相信外部赢家/提子数/历史。

## 实际检查

- Node22.23.3、pnpm11.19.0；`pnpm install --frozen-lockfile --prod=false`；`pnpm check`529单测及内容/冻结/类型/构建/容量校验；`pnpm build:analysis`、`pnpm build:pages`。
- `pnpm test:browser`176+22回归；`KATAGO_UI_EVIDENCE_ROOT=docs/ai-play/checks pnpm exec playwright test --config playwright.ai-analysis.config.ts --workers=1`8条原复盘UI回归。
- `pnpm test:ai`43项；`node scripts/ai-real-smoke.mjs`真实引擎HTTP14项；CLI运行scripts/ai-browser-journey.cjs（7组真实浏览器流程，明确传输替身）及scripts/ai-real-browser.cjs（3段真实KataGo浏览器对弈/复盘）。`scripts/ai-upgrade-browser.cjs`实际0.23→0.24同源Service Worker升级和禁网刷新通过，原真人/草稿/标记与新AI备份相互独立。结果、请求身份、截图和时间记录在docs/ai-play/checks及output/playwright/ai-*。
- GitHub真实Docker验证工作流支持feat/ai-play，单容器0.1CPU/512MB；GitHub Actions 41102368132在5ed6920通过真实复盘7项和新AI14项，容器资源与日志保留于checks/docker-real-5ed6920。最终发布提交的增量验证另记。正式Render和原Pages链路待部署、实测。schema/程序版本独立于KataGo1.18.1。
- 初次T24旧测试存在未等待异步活动保存；补充状态等待后完整流程通过。初次AI小屏横向溢出已修复复验；不隐藏原失败日志。

## 失败、未测和迁移要求

目前没有已知阻断本机AI用途的规则错误；正式发布仍受Render后台保存权限拒绝所阻，需账户持有人对现有weiqi-katago更新main最新提交，保持Free且不动weiqi-rooms。之后必须实测/readyz apiVersion2以及原网站实际AI落子和赛后分析，不能只看health200。未授权付费、未绕过浏览器权限；无新账号/数据库/模型上传。

旧缓存用“保存已提交内容并应用”，不清站点数据。暂停/刷新后AI不自动重发；需要用户继续。除网络服务新接口以外，无强制数据迁移；卸载AI模块时先导出其独立续玩JSON。

已知限制和未测（真机浏览器、人类棋力校准、多人负载）见docs/ai-play/KNOWN_ISSUES.md；没有声称CAS认可、认知收益、真实教学效果或人类教师审核。归档与正式发布证据完成后补充到本交接；不要提前把阶段版称为部署完成。
