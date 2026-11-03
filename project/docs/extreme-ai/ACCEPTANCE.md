---
schemaVersion: 1
id: DOC-EXTREME-AI-ACCEPTANCE
revision: 2
rulesetId: GO-CLUB-AREA-1
status: complete-with-documented-limits
---

# 极致模式验收与边界

2026-11-03，基线 AI_PLAY 0.24.2-pages.1，最终前端0.25.2。用户仅授权免费资源。实际服务由用户按Free Blueprint创建，原网站已完成真实KataGo落子与复盘；原两服务保留。完成结论来自正式浏览器与实际HTTP，不把准备包或仅健康200当全链路证明。

| 检查 | 结果 | 实际证据 |
|---|---|---|
| 原三档预算及新难度、存档兼容、取消旧结果、错模型拒绝、文件 SHA/内部名 | 通过 | pnpm test:ai，55 项；checks/ai-unit-final.log |
| 完整检查及内容 | 通过 | pnpm check，541 单测；37 场景；851 内容校验、30 题/6 终局；checks/check-final.log |
| 生产和分析构建 | 通过 | pnpm build:pages、pnpm build:analysis；checks/build-*-final.log |
| 现有浏览器路线、键盘/触摸、断网与回退 | 通过 | pnpm test:browser，176 + 22 项；checks/browser-regression-free.log |
| 实际 tf2 本机 HTTP | 通过 | scripts/extreme-real-smoke.mjs；checks/tf2-native-real-http.json，10 项（包含实测限流恢复） |
| 桌面真实模型对弈及同模型复盘 | 通过 | Chrome 156.0.8078.80；checks/tf2-browser-desktop.json：执黑、真实白回复、撤回/重做、刷新暂停、历史只读、导出、认输、赛后真实复盘 |
| 360 触摸/键盘、取消中途计算；768/1280 布局 | 通过 | checks/tf2-browser-mobile.json、截图；桌面浏览器模拟，不冒称实体手机 |
| 未启用新服务、旧三档及不降级 | 通过 | checks/tf2-browser-unconfigured.json；极致不可开始，旧三档可选，零假冒请求 |
| Linux 真 Docker，严格免费规格 | 通过 | GitHub Actions 41559023753，运行提交 a4cb05b6f9b14bc05bb53744c2c972dc505f41c8；checks/docker-free/ |
| 核心与内容不变 | 通过 | checks/preservation.json：1595 个受保护文件无差异，含 Board、规则、正式内容/材料、原教学证据及锁文件 |
| 实际 Render 公开服务 | 通过；后台私有日志/账单未查 | 用户创建https://weiqi-katago-extreme.onrender.com；公开接口真实模型、512MB上限、0.15 CPU quota；不冒称已读取后台 |
| 原 GitHub 网站调用新 Render 模型 | 通过 | checks/public-real-browser.json：真实落子、撤回/重做、刷新暂停、历史只读、导出、认输、同模型真实复盘，控制台错误0 |
| 正式触屏/键盘、768/1280布局与取消 | 通过 | checks/public-real-mobile.json；Chrome触屏模拟，不冒称实机 |
| 原三档及本机4190 | 通过 | checks/all-clients-real.json：原三档真实b6模型和原8/24/64预算；本机4190实际调用新Render模型 |
| 旧缓存更新及棋谱保留 | 通过 | checks/public-upgrade-before/after/recovery.json：0.25.0→0.25.1→0.25.2，旧棋谱2手保留，AI暂停，不清站点数据 |
| 发布配置保护 | 通过 | checks/publication-guard.json：故意漏配的通用构建在复制前被拒绝；正确Pages构建地址与集中配置一致 |
| Safari/Firefox/实体 iPhone、长期满载、多人容量与人类段位 | 未测 | 不据少量样本推断 |

## 免费规格真实容量

固定模型 kata1-tf2-b10c384-s2941M-d5872M，10,545,753 参数，38,245,507 字节，SHA-256 8015d49bdf45854c94e5f9e22b2b70e8738d3e56a6edca730e5b82509998a5b5。KataGo 1.18.1 / Eigen CPU，便携构建，无宿主机专用指令，无 GPU，64 访问上限和 30 秒搜索上限；常驻单进程，1 活跃 + 1 等待。

Docker 严格 --memory=512m --memory-swap=512m --cpus=0.1。实际 cgroup 峰值 160,473,088 字节（153.04 MiB）；oom/oom_kill 均为 0。引擎握手初始化 4598 ms。此数值不包含 Render 休眠后的平台唤醒等待，不是已部署实例指标。

| 独立构造样本 | 实际 HTTP 耗时 | 完成访问 |
|---|---:|---:|
| 5 路，白方只能停手 | 17.59 秒 | 64 |
| 9 路空盘，黑先 | 32.39 秒 | 13 |
| 13 路两黑让子，白先 | 32.40 秒 | 13 |
| 19 路实际落子/停手/撤回后新分支 | 32.00 秒 | 11 |

人工确认 5 路黑 25/白 0 后，真实同模型复盘返回 5 ms；这是已搜索局面的暖缓存，不能用于承诺首次复盘速度。桌面另用不同实际局面验证了同模型赛后复盘。最终健康状态 ready=true、active=0、queued=0；容器 healthy，未 OOM。

官方该模型在训练池评级高于原 b6c96，但本程序低搜索预算没有系统棋力标定；不保证任何局面都更强，不换算人类段位，不把估计目差当最终计分。免费服务会休眠，且 750 小时/月、构建与带宽额度为工作区共享；不保活、不升级、不启用超额付费。

## 失败、拒绝与测试纠正

- 70.4M 最大候选在 512 MB 实测 OOM；28.5M tf3 在严格免费 CPU 的 9 路实测超过 90 秒。均已弃用，证据独立保留在 rejected-paid-candidate/ 与 rejected-free-tf3/。当前部署配置只用已通过的 tf2。
- 第一轮全浏览器出现一次旧离线滑动条焦点失败，未改相关应用代码；独立 3 次及完整重跑通过。最终本轮又完整通过 176 + 22，不隐去初次波动。
- 浏览器脚本曾在 about:blank 中推导地址错误，另一次与真实 HTTP 批量测试重叠触发限流等待。修正测试起点、串行运行后通过，未将其作为程序规则修复。
- 全页截图曾因保留滚动/焦点产生浮动页头拼接，测试现先回顶部再截图；未改应用布局。全部当前 tf2 截图已另存。
- 早期模型声明错套旧 g170 CC0，已更正为新网络 MIT 式许可并随源码/镜像保留版权，旧模型声明保持原样。

## 正式 Render 实测

实际服务URL见上，后台应用0.25.0/API2、前端0.25.2；缓存和发布保护修复无需升级后台套餐。health读取到cgroup512MB、CPU quota0.15，与严格CI的0.1CPU分开记录，不把公开配额视为已核对账户套餐/账单。初轮四尺寸后峰值155,586,560字节；最终健康与最高值以checks/public-ready.json为准。

checks/public-real-http.json的9项均通过。5路被迫停手19.55秒/64访问；9路31.20秒/11访问；13路30.51秒/10访问；19路31.58秒/9访问。已确认5路终局的暖缓存复盘0.44秒，不用作首次速度保证。正式桌面另一实际局面的AI回复31.68秒、赛后复盘31.26秒；模型身份与黑方视角均核对。仅为这些样本，不推断无限并发或固定时延。

首次就绪访问曾60秒无响应超时，后一次84.46秒返回成功；引擎报告内部初始化约4.4秒，平台唤醒和网络等待未单独拆分。客户端超时保留棋局，用户手动重试，不用自动请求保活或无限重试。服务器1活跃+1等待及限流保持。

0.25.1一度被随后pnpm check中的通用构建覆盖，导致服务地址遗漏；真实浏览器测试发现并阻止完成。已修复为“全部检查→build:pages→配置核对→同步”的顺序，发布保护负例通过，0.25.2实际网页的三个服务地址和静态校验全部正确；旧棋谱升级保留。初次恢复测试早于Pages完成，重跑于built后通过。旧三档一次检查存在响应监听异步记录竞态，测试改为等待实际response body后通过，应用逻辑未改。

完整ZIP重新解压、全部1595受保护文件和安装/检查/构建验证、公开Release资产校验单独保存，不把程序测试当实体制造、真人教学或段位标定。剩余限制为上述Free休眠/限流、无系统棋力基准及未测浏览器/实机；没有已知未解决的规则、数据或核心流程阻断项。
