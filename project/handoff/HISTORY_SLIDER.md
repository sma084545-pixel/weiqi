---
taskId: HISTORY_SLIDER
baseVersion: FREE_PLAY 0.18.0-freeplay.1
resultVersion: 0.19.0-history.1
programVersion: 0.19.0
rulesetId: GO-CLUB-AREA-1
schemaVersion: 1
status: complete
---

# 棋局回退与滑动条交接

主线以work/release/LATEST.json确认的0.18.0-freeplay.1完整ZIP为底，SHA256 b62e08507bd9626e32ae46f288356a61ec6aed8d38c8a75b84d8bde0e4919d98，独立解压到work/history-slider-20261021/mainline/go-club；没有改动sources或旧归档。

## 修改文件

- 新增src/core/game-history.ts：直接读取有效路径快照，含盘面/轮次/提子/停手/阶段；不重算合法性。
- 新增src/components/GameTimeline.tsx及.css：共享受控滑动条、回退到上一步、前进、开局与当前；原生键盘/触屏；光标与游戏分开。
- 接入features/full-game（兼容review.ts）、capture-game、experiment-board、puzzle-runner（题内和自由试下）、teacher-editor、home组件验证。旧局面只读，最新结果不套到历史盘。
- src/core/unified-persistence.ts应用版本0.19.0；数据库、存储键和序列化未变。
- package.json版本及专项脚本；tests/history、tests/browser/history.spec.ts；t08按钮名称与t16缓存版本断言同步；playwright.history-webkit.config.ts。
- scripts/package-history.py、verify-history-preservation.py；README/CHANGELOG/SOURCES/requirements-matrix追加；docs/history/使用、实现、验收、限制、原基准manifest、实际日志与证据。
- dist生产构建及dist-engine重建；root RELEASE_MANIFEST.json、release-manifest.json、SHA256SUMS和完整修改清单由打包工具生成。详见docs/history/changed-files.json。

## 实际验证

`pnpm check`（46文件374单元检查、内容校验851项/30题6终局、构建/离线资源/重放与容量），`pnpm test:history`（8项），`pnpm test:browser`（Chromium176项），WebKit专项在线11项，均退出0。`python3 scripts/verify-history-preservation.py`逐SHA保持1032个规则/schema/内容/材料/旧交接及锁文件。

人工视觉检查为模型逐图查看新360/768/1280与19路截图，不冒称真人可用性/教师复核；没有新增纸面材料或改变原材料，因此保留原渲染，不重新生成冻结文件。实际命令、输出、初始向量修正见docs/history/ACCEPTANCE.md与checks/。正式归档CRC/SHA、重新解压、干净安装/构建及专项浏览器复查见ZIP旁ARCHIVE_CHECK.json；最终交付要求该文件status=passed。

## 冲突、失败与未测

无共享接口、坐标、题目ID/revision、规则/schema或依赖冲突。最小兼容扩展为UI历史投影与组件，T08原createFullGameReview继续导出。初始单元向量未提供全空盘中立清单，已修正测试输入并复验，不改引擎。当前无已知未解决阻断/重要缺陷。原生Safari/Firefox/Edge、实机触屏、真人辅助技术和课堂未测；WebKit禁网工具限制未重测为通过。限制详见KNOWN_ISSUES.md。

## 迁移与下一步

不需数据迁移，不改变schemaVersion1或题库冻结；备份后在同一主机/端口更新，保存当前工作后应用新版本并完成离线准备。回看光标不持久化，刷新显示原本保存的当前局。后续开发只使用本结果主线与此handoff；继续复用GameTimeline和createGameHistory，不在页面重建规则或历史。教师编辑答案的节点浏览仍可明确新增分支，不覆盖原分支。

完整最新ZIP、轻量生产软件ZIP、SHA256及PACKAGE_INFO保存在work/release/0.19.0-history.1/；不含node_modules，无公开部署或发送。

归档干净复查首次因46个测试进程并发负载，19路性质检查超过原15秒限时（373项通过，1项超时，无断言失败）。vitest.config.ts将并发固定为4，保留全部断言和用例；后续干净目录复验以ZIP旁ARCHIVE_CHECK.json为准。失败原日志保存在docs/history/checks/clean-check-initial.log。

4进程复查同一19路性质用例在15.5秒结束，仍碰到旧15秒限时。该用例为180次固定种子正确性验证，并非性能验收；仅将此组既有测试预算放宽至60秒，保留全部种子、次数、独立oracle与断言。引擎不变，不以放宽测试预算宣称性能提升。
