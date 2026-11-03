---
schemaVersion: 1
id: DOC-EXTREME-AI-ACCEPTANCE
revision: 1
rulesetId: GO-CLUB-AREA-1
status: awaiting-free-render-creation-and-public-e2e
---

# 极致模式验收与边界

2026-11-03，基线 AI_PLAY 0.24.2-pages.1，当前 0.25.0 部署准备版。用户仅授权免费资源。未创建付费服务，不更新已完成版本 LATEST，不把部署准备称为正式链路完成。

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
| 实际 Render Free 创建/后台日志 | 未测，需账户操作 | 浏览器已保存站点权限拒绝后台访问；不能绕过，不曾创建付费资源 |
| 原 GitHub 网站调用新 Render 模型 | 未测，阻断完整完成 | 尚无实际新服务 URL，集中配置保持 null，不能冒充上线 |
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

## 尚需完成

将已验证 Free Blueprint 同步 main 后，用户在 Render 创建唯一新 Free 服务并提供实际 URL。随后更新集中前端地址、发布原 Pages、从正式网址做真实对弈/撤回/复盘联调；记录实际 Render 性能和健康，封存新完整归档、重新解压检查、校验，再更新 LATEST 和发完成通知。
