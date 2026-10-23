# KATAGO_REVIEW 交接

- taskId: KATAGO_REVIEW
- baseVersion: ONLINE_FLOATING_FIT 0.21.3-pages.1
- resultVersion: 0.22.0-pages.1
- rulesetId: GO-CLUB-AREA-1
- schemaVersion: 1
- status: complete (live site verified; final archive validation evidence accompanies release)

唯一工作主线：work/katago-20261023/mainline/go-club，继承已封存0.21.3完整包，不改sources/。当前GitHubmain已合入后端源码；正式浏览器和候选干净安装已通过；最终归档复验后更新最新指针。

## 变更文件

- analysis-engine/：固定真实EigenCPU引擎、官方小模型下载与校验、Docker、多种许可证、原生测试。
- server/analysis/、src/core/analysis/contract.ts、vite.analysis.config.ts：共享规则重放/坐标映射、常驻子进程、有界调度、取消、错误恢复、HTTP/CORS/限流/校验与运行资源指标。
- src/features/katago-review/、FullGame.tsx：自由对弈终局后复盘、数字推荐、候选变化、黑方胜率和预计目差、手动/取消/迟到保护。
- deploy/katago.render.yaml、katago.env.example、github-pages.json、build-public-site/finalize-offline：独立Render地址和部署；既有rooms不变。
- package.json仅版本和脚本、src/core/version.ts、.dockerignore/.gitignore、测试和独立浏览器配置、README/CHANGELOG/SOURCES、docs/katago/、本交接；无新共享依赖，原锁不变。
- tests/browser/t16.spec.ts：测试缓存版本改为公共APP_VERSION，无离线业务规则改变。

最终精确变更清单在docs/katago/changed-files.json，归档逐文件SHA在RELEASE_MANIFEST.json。

## 实际验证

实际命令包括pnpm install --frozen-lockfile --prod=false、pnpm check、pnpm test:analysis、pnpm test:pages、pnpm test:online-browser、Playwright新增8项UI/完整基线、pnpm build:analysis、pnpm build:pages。真实LinuxDocker构建与受限容器运行在GitHubActions39921333516及39922017893；原生真实引擎、真实本机网页、Render HTTPS API分别留存。完整结果/失败修正/未测见docs/katago/ACCEPTANCE.md和checks/，不把模拟UI/原生/容器/Render/真人审核混为一项。

Render服务 https://weiqi-katago.onrender.com ，健康 /healthz、就绪 /readyz。部署固定后端源码main创建时HEAD为0e0f291e9ab1bf92eaab3071685a4154dc030009；后台部署日志与账单因访问权限拒绝未读取，用户依明确Free蓝图自行创建。正式网页0.22.0已从原地址完成桌面/触屏真实分析与网络、控制台检查；public-journey.json不是仅健康200。前端功能发布提交62ec2b09920f2ce9277927e4364d54b731a4fd18；随后提交仅补充检查和交付记录，最终源码以Release标签/清单为准。

## 失败、未测与迁移

Docker最初缺少既有pnpm构建许可配置、旧离线测试硬编码版本均已定位修正。早期基线两轮各175/176：一个离线测试硬编码版本、一个键盘测试与既有路由初始焦点竞争；均修正测试，最终176/176通过。新UI8/8、联机22/22、单测429/429、内容851断言均通过；完整候选包新目录安装/检查/构建通过，最终ZIP CRC/逐文件SHA/新目录构建记录另附ARCHIVE_CHECK.json。无正式题/终局/revision/schema/规则迁移。已保存的对局仍走原统一存储和合法重放，没有批量改写本机数据。

需保留service worker手动应用更新流程、旧哈希资源和本机进度；不清站点数据，不强制刷新。Render分析服务与rooms分开，前端只变集中analysisOrigin。后续换模型需固定新SHA/许可证并重跑规则、四尺寸、视角、资源测试；Render保持单实例，新增付费资源仍须预算授权。更新和回滚见docs/katago/DEPLOYMENT.md。

冷启动、长期多人容量、其他实体设备、人类教师/真实课堂未测；当前浏览器权限阻止后台日志/账户费用核对。不存在真人审核或实际社团成效记录。

所有Render真实参数、费用边界、独立来源、实际命令/日志、公开接口和更新/回滚已在docs/katago/DEPLOYMENT.md、ACCEPTANCE.md列出。停止本机4207/4210后原网站仍返回Render真实分析，已验证不依赖个人电脑上的测试进程。无未解决的阻断或重要功能问题；剩余限制不得被后续任务改称已通过。
