---
schemaVersion: 1
id: HANDOFF-FREE-PLAY
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 自由双人对弈交接

taskId: FREE_PLAY
baseVersion: T24 0.17.1-t24.1
resultVersion: 0.18.0-freeplay.1
programVersion: 0.18.0
rulesetId: GO-CLUB-AREA-1
schemaVersion: 1
status: complete

本次以实际存在的T24完整ZIP/交接为唯一基线，核对SHA f3f1bc2590117828df26b81f3351a7ab95b1ab15f8f8c8bd13d67d23cd634feb及CRC后，在独立工作副本扩展；sources只读，旧T24归档保留。

修改文件：FullGame.tsx/CSS增加自由对弈呈现与醒目的最终结果；full-game/model.ts的FullGameSize扩展到5/9/13/19，运行时拒绝未知尺寸；learning-hub/registry.ts、LearningHub.tsx增加#/play/free与主页/顶部/教师入口。package.json、APP_VERSION与离线测试版本同步0.18.0；新增tests/free-play/model.test.ts、tests/browser/free-play.spec.ts，调整两个受影响的旧首页入口断言；更新README/CHANGELOG/SOURCES/责任矩阵及docs/free-play。完整变更与SHA见根RELEASE_MANIFEST.json和docs/free-play/changed-files.json。

玩法：同屏双人，默认9路/0贴目；5路显著标小棋盘练习。黑白交替，提子、自杀禁着、位置超级劫均复用原引擎，首次提子不结束完整围棋。两停后共同标死子和确认中立点，最后一方确认后自动计分并显示黑胜/白胜/和棋；认输立即出胜方。未知死活不自动猜；有争议恢复原盘。旧#/play/full-game与新入口共用同一盘、同一保存键、同一完整历史，刷新可恢复；悔棋/复盘/JSON导出保留。

实际测试命令与检查：pnpm install --frozen-lockfile；pnpm check（44文件366单元/组件，含8新增，内容851检查、201冻结、构建与引擎容量）；pnpm test:browser（Chromium164通过，含14新增）；pnpm exec playwright test tests/browser/free-play.spec.ts --browser=webkit --grep-invert 'touch on a locally scrolling' --workers=1 --output=output/playwright/free-webkit-results（在线13通过）。实际Chromium禁网刷新19路对局恢复、触摸四角、键盘轮流、360/768/1280、灰度/减少动画及旧完整数字路线均通过。三尺寸和最终计分截图已由助手查看；不是人类教师/真人辅助技术审核。

失败与未测：新结果显示首轮读取错了返回值层级，改为从result.score.winner读取面积胜负，未改公共结果结构；初次浏览器用例试图普通点击明确禁用的占用点而被Playwright阻止，修正为核查其占用描述、强制手势无状态变化，并保持引擎OCCUPIED负例，最终全部通过。首次沙箱构建遇到pnpm安装目录上下文限制，获准一致环境完整重跑通过；原失败日志保留。原生Safari/Firefox、屏幕阅读器及设备实机未测；WebKit离线不列通过，Chromium已实际禁网。没有真人教学、CAS成效、假成员反馈或公开发布。

迁移：无数据/schema/规则或依赖迁移。保持数据库1、存储键和既有GameState格式；APP_VERSION及缓存升0.18.0，更新前导出备份，同一来源/端口可继续旧局。新旧入口共用存档，不互相新建覆盖。844个规则引擎/schema/正式内容/图示/材料/锁文件逐SHA未变，Freeze B保持；FullGameSize只是受控模块的向后兼容扩展。

交付：work/release/0.18.0-freeplay.1下唯一最新完整工程ZIP、轻量软件成品ZIP、SHA256SUMS、ARCHIVE_CHECK和使用说明；完整包含源码、生产构建、所有继承材料和测试证据，不含node_modules。归档重解压后干净安装、构建和14个自由对弈浏览器用例复查，准确结果在ZIP旁CHECK_RESULTS及ARCHIVE_CHECK.json；包内不写自身ZIP哈希，避免循环。当前本机预览http://127.0.0.1:4190/#/play/free仅在本机服务运行期间可用，非公开部署。
