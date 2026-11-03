---
schemaVersion: 1
id: DOC-EXTREME-AI-IMPLEMENTATION
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 极致模式实施说明

基线AI_PLAY 0.24.2-pages.1，开发版0.25.0。旧三档预算8/24/64不变；新增extreme，以独立Transformer强模型执行，上限64访问、30秒搜索。进行中只返回着法，结束后可主动用同一强模型复盘。

2026-11-03核查[官方网络列表](https://katagotraining.org/networks/)，当时“Strongest confidently-rated”是kata1-tf3-b11c768-s11003M-d5973M-7gres。最新上传样本较少，不因“最新”就替代稳定评级模型。模型与SHA固定在analysis-engine/extreme-manifest.json；权重不入Git或普通项目ZIP，镜像构建从官方地址获取并核对。官方Elo只比较该训练池及搜索预算，不是本程序的人类段位或整体对弈强度保证。

复用KataGo1.18.1 Eigen CPU，已真实加载版本17的Transformer模型；不假定GPU。独立Web Service只装强模型，原小模型服务与联机房间服务不变。健康接口报告真实模型和可用难度。小模型服务拒绝极致，强模型服务拒绝旧三档；前端校验固定模型名与版本，缺地址时不允许开始，不自动降级。

VITE_KATAGO_EXTREME_API_ORIGIN集中配置。实际Render地址分配后才写入deploy/github-pages.json的extremeAnalysisOrigin；不预先把猜测地址当上线。服务只允许正式GitHub Origin及本机4190两精确来源，CORS不冒称身份认证。无新账户、数据库、Redis、磁盘或扩容。

原生实测：加载约2.95秒，四尺寸各约30–31秒，在时间上限前完成19–22次访问，进程峰值约1627.8MiB；这不是Linux容器或Render性能。512MiB与1CPU/2GiB的实测由单独CI工作流记录。

付费前不得应用deploy/katago-extreme.render.yaml。候选最低档1CPU/2GB，plan1c-2g（旧称Standard），计算实例公开价25美元/月；按实际时长计费，构建/带宽超额和税另计，未核对账户账单。先验证容器可运行，再请用户授权。Free为0.1CPU/512MB，7美元Starter也只有512MB。来源：[价格](https://render.com/pricing)、[规格](https://render.com/docs/compute-plans)，核查2026-11-03。

检查命令：pnpm check、pnpm build:analysis、pnpm build:pages；真实API脚本scripts/extreme-real-smoke.mjs；容器工作流.github/workflows/katago-extreme-container.yml。极致服务为1活跃+1等待、90秒总期限，AI每IP每分钟4次、复盘2次、全服务6次；产品手动重试。开发脚本对实测限流最多两次等待，不改变产品行为。
