# 辅助下棋验收 · 0.26.0（公开发布验证前）

基线0.25.2-pages.1；GO-CLUB-AREA-1；schemaVersion1。以下均为实际开发检查，不是教师审核或真实课堂效果。正式公开网站验证完成后更新本页。

|项目|状态|证据|
|---|---|---|
|分级提示、局部事实、状态与保存|通过|新增51项测试，`checks/guided-unit.log`；独立预期`tests/guided-play/fixtures/observations.json`|
|现有完整检查、构建与内容校验|通过|592项单元测试，37进阶场景、851正式内容检查及引擎容量检查；`checks/full-check.log`|
|现有浏览器回归|通过|176项主流程与22项联机/悬浮流程；`checks/browser-regression.log`|
|首次入口→提示→对弈→确认→报告→重试→返回原局|通过|真实Chrome156，`checks/browser-local.json`|
|360/768/1280、触屏模拟、键盘、减少动画|通过|`checks/browser-local.json`及截图；360px默认9路棋盘scrollWidth=clientWidth=252，13路局部滚动|
|断网刷新、提示、本地对手及再次保存恢复|通过|真实`BrowserContext.setOffline(true)`；`checks/browser-local.json`，不是仅检查缓存源码|
|局部教学原生性能|通过|9/13路各60手；`checks/local-capacity.json`，限本机CPU，不保证低端设备时延|
|规则、Board、正式内容、材料与依赖保持|通过|1,744个受保护文件逐字节比较；`checks/preservation.json`|
|既有Render真实KataGo对手|通过|本机4190→真实服务，KataGo1.18.1/b6，24访问，实际引擎耗时2429ms；`checks/real-katago-local.json`|
|原网站正式发布|待线上验证|最终更新此行，不以本地构建代替|
|实体手机、Safari/Firefox、屏幕阅读器、长期负载|未测|没有把Chrome触屏模拟称作实机验证|
|教师与真实学员教学验证|未测|无伪造反馈、经历、CAS工时或学习成效|

初始完整检查暴露干净源码缺少先构建规则包，以及旧依赖审计版本白名单未包含0.26：分别调整check命令顺序与补充白名单，完整重跑通过。依赖/锁与规则包源未改。首轮浏览器脚本使用过严的select标签匹配，调整测试选择器后实跑通过；没有据此宣称产品缺陷。

旧回归脚本写到两个历史T24及四个联机工具截图路径；当前截图已另存`checks/legacy-regression/`，历史截图从封存基线恢复，证据隔离见`checks/legacy-evidence-isolation.json`。旧文档/材料未被新结果静默覆盖。

实际命令：`corepack pnpm check`、`corepack pnpm test:guided`、`corepack pnpm test:browser`、`corepack pnpm build:analysis`、最后`corepack pnpm build:pages`；`node --import tsx scripts/verify-guided-play.ts`；`python3 scripts/verify-guided-preservation.py --base <0.25.2完整归档>`。真实浏览器脚本用Playwright CLI运行`scripts/guided-play-browser.cjs`与`scripts/guided-play-real-katago.cjs`。安装依赖不变；实际Node v22.23.3，Chrome156.0.8078.80。

已知边界见`KNOWN_ISSUES.md`。没有通用死活、棋力等级、全盘最佳着或教学成效的证明。

远程验证初次用了4216预览端口，浏览器跨域失败。后续实测原服务仅允许4190和正式Origin，4216预检403，二者预检204；改在已授权的4190验证后真实落子通过。没有扩大CORS或改动服务。失败记录与`checks/existing-cors-boundary.json`保留。
