---
schemaVersion: 1
id: DOC-EXTREME-AI-IMPLEMENTATION
revision: 2
rulesetId: GO-CLUB-AREA-1
---

# 极致模式实施说明

基线 AI_PLAY 0.24.2-pages.1，开发版 0.25.0。旧三档预算 8/24/64 不变；新增极致（extreme），用独立的较强模型执行，上限 64 次访问、30 秒搜索。进行中只返回着法，结束后可主动用同一模型复盘。四档不对应人类段级位。

## 免费资源边界与模型

2026-11-03 用户明确选择“只用免费资源，改选能运行的较小强模型”。有效 Blueprint 仅含一个新 Free Web Service，0.1 CPU / 512 MB；不含磁盘、数据库、付费选项或自动扩容。不会更改原来的 weiqi-katago 与 weiqi-rooms。

原候选为官方有把握评级最强的 70.4M 参数模型，但实际 512 MB 容器出现 OOM，故已放弃。旧结果仅保留在 rejected-paid-candidate/，不能作为当前免费方案通过证据。随后 28.5M 的 tf3 候选能运行但免费 CPU 的 9 路搜索超过 90 秒，也放弃；证据在 rejected-free-tf3/。

当前候选为官方 kata1-tf2-b10c384-s2941M-d5872M，10,545,753 参数。固定来源、SHA-256、文件大小、内部名称见 analysis-engine/extreme-manifest.json。权重不进入 Git 或普通项目归档，构建时下载并验证；运行时流式复核 SHA 后才启动。新模型使用 MIT 式 KataGo Neural Network License，版权/许可全文保留，不能套用原 g170 模型的 CC0。

官方训练池内该紧凑模型评级高于原 b6c96，但不同搜索预算下的评级不能换算本程序人类段位，也不保证每个局面都比旧档更强。这里选的是免费资源中经过实际容量核查的较强候选，不声称是全网最大或最强模型。

## 引擎、状态与兼容

复用 KataGo 1.18.1 Eigen CPU，不假定 GPU。1.18.2 的改动仅针对 CUDA 提速，官方建议其他后端继续 1.18.1。一个服务一个常驻模型和搜索进程，stdout/stderr 分离读取。模型部分检查点共享内部架构名，所以不能仅用内部名称辨认文件；新服务同时校验外部固定检查点与实际文件 SHA。

健康接口报告真实模型和可用难度。原服务拒绝极致，新服务拒绝旧三档；前端检查固定模型名与版本，未配置服务地址时禁止开始极致，不自动降级。VITE_KATAGO_EXTREME_API_ORIGIN 是集中配置，实际 Render 地址分配后才填写 deploy/github-pages.json 的 extremeAnalysisOrigin，不能用猜测地址冒充上线。

极致为 1 活跃 + 1 等待，90 秒总期限，AI 每 IP 每分钟 4 次、复盘 2 次、全服务 6 次。上限 30 秒搜索不含冷启动或排队，实际可能少于 64 访问。产品仅手动重试。验证脚本遇实测 429 最多等待两次，这不是产品自动轮询。免费服务会休眠；多个免费服务共享工作区 750 小时/月及构建、带宽额度，不用保活请求绕过休眠，也不启用超额付费。

规则、Board、正式题库/材料及 revision、依赖与锁文件保持。原存储键和 schemaVersion 1 保留，AI difficulty 枚举兼容追加 extreme。旧三档记录直接读取；回滚旧程序前导出极致续玩文件，旧程序安全拒绝未知难度而不降级。

## 检查与发布

pnpm check、pnpm test:ai、pnpm build:analysis、pnpm build:pages。scripts/extreme-real-smoke.mjs 验证真实 5/9/13/19 路、初始摆子、停手、悔棋分支、人工确认后同模型复盘、模型身份及 CORS。浏览器脚本验证实际落子、回退/重做、刷新与滑动回看、触屏/键盘及旧结果取消。

.github/workflows/katago-extreme-container.yml 在 Linux Docker 实际限制 --memory=512m --memory-swap=512m --cpus=0.1，不把本机大内存运行当免费实例证据。容量和真实 HTTP 结果完成后记录至 ACCEPTANCE.md。还需实际 Render Free 部署及原 GitHub 网站联调；未完成前不更新 LATEST 或称任务完成。
