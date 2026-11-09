---
taskId: BOARD_STARS
baseVersion: REVIEW_BRANCHES 0.27.1-pages.1
resultVersion: 0.27.2-pages.1
rulesetId: GO-CLUB-AREA-1
schemaVersion: 1
status: implementation-tested-publication-pending
---

# 全局棋盘星位

基线完整归档SHA-256为1a9d48034e1ebf6000c7e52fb448052155d97a8aae8af0f27def305c43368328。从独立副本继续，sources和原归档保持只读。新工作主线位于work/board-stars-20261109/mainline/go-club。

## 修改文件

新增src/core/board-star-points.ts，修改共用Board.tsx/Board.css及动态棋盘图graphics.ts；package.json、core/version.ts与CHANGELOG同步0.27.2。新增星位UI/导出验收脚本、docs/star-points及本交接；精确清单在封包生成的CHANGED_FILES和CHANGE_MANIFEST中。

星位覆盖所有实际Board实例，包括教学、题目、编辑、对弈、复盘与悬浮/PiP；图导出采用同一坐标。5路中央、9/13路五点、19路九点。底纹不接收点击，不成为棋子或答案，不改变规则、回调、题库revision或存档。

## 实际检查

`pnpm install --frozen-lockfile --prod=false`、`pnpm check`、`pnpm build:pages`、`pnpm test:browser`；专项使用Playwright CLI运行scripts/star-points-browser.cjs；`node --import tsx scripts/check-star-points-exports.ts`；四份PDF实际渲染与助手逐图检查。复盘/辅助85项测试、辅助完整与禁网流程检查。各记录和实际失败说明见docs/star-points/ACCEPTANCE.md。后续正式发布、原网站和归档验收必须补录，未完成前不把本交接标题当作完整交付。

## 失败与未测

本机端口权限导致的首轮失败与脚本label匹配错误均留证；不将其计为规则缺陷。原生Safari/Firefox、实体设备、屏幕阅读器、打印制造与真人教学未测。免费服务原有限制保留；本次不增加或升级Render服务。

## 迁移及下一步

无需数据/schema迁移。保存后应用离线更新，不清站点数据。旧棋谱、反馈、教师草稿与题目全部沿用。下一任务只从最终0.27.2归档及本交接继续，避免用旧封存副本覆盖新主线。
