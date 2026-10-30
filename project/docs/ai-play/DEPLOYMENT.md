---
schemaVersion: 1
id: DOC-AI-PLAY-DEPLOYMENT
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 接入与部署

沿用 GitHub Pages 前端和已有 `weiqi-katago` Render Docker Web Service。房间服务 `weiqi-rooms` 的接口/协议和数据不改变，无需因 AI 增量重建房间。没有新增数据库、磁盘、付费实例或自动扩容。

- 页面：`#/play/ai`；集中地址：`deploy/github-pages.json.analysisOrigin`，发布构建注入 `VITE_KATAGO_API_ORIGIN`。
- 服务： https://weiqi-katago.onrender.com ，就绪 `/readyz`、存活 `/healthz`。新版本返回 `apiVersion:2` 及 `features:[review,ai-move]`；健康200不是完成对弈的证明。
- 新增 `POST /api/ai-move`，沿用 exact Origin `https://sma084545-pixel.github.io` ，以及本机软件两个固定Origin `http://127.0.0.1:4190` / `http://localhost:4190`，和 Content-Type 预检，无凭据/用户账号。请求带 schemaVersion1、唯一positionId、真实setup/events/komi、aiColor、difficulty。服务端重放合法历史并复查轮次；返回匹配的requestId/positionId、唯一合法place/pass、引擎与搜索诊断。进行中的对弈接口不返回胜率、目差或候选分析。
- 原 `/api/analyze` 保留“完整对局结束后”门槛；没有通过伪造认输来请求普通进行中局面。
- 3档最大搜索8/24/64，受 `KATAGO_MAX_VISITS` 上限限制。最大15秒搜索；引擎单实例单工作进程，1计算+2等待，90秒总期限。客户端100秒超时；180毫秒可取消启用，避免StrictMode重复。
- 每IP每分钟AI12次、赛后分析6次，全服务18次；客户端表最多512键。256KB请求、1600有效事件；超限、排队满、超时、引擎退出各有明确错误。取消和历史变化会终止/清理对应计算；无自动无限重试。

## 固定引擎与模型

KataGo1.18.1、Eigen CPU、6块96通道小模型 `g170-b6c96-s175395328-d26788732`，SHA-256 `f57fddf4672364d385d6ab177364ab819810d1123e229cb2649c4f337a2160b1`。来源/引擎源码摘要/许可证见 `analysis-engine/engine-manifest.json` 与 `analysis-engine/licenses/`，模型不提交普通Git。沿用既有Docker和线程/缓存，不假定GPU，不用本机常开供访客使用。

轻松档是在实际搜索过、相对首候选目差损失不超过2目的非停手候选中按搜索量平方根加权；标准与挑战用首合法候选。难度尚未按人类棋力校准，小网络/少搜索的棋力与估计都有局限。

## 环境变量（仅名称与用途）

`PORT` Render监听端口；`PUBLIC_ORIGIN` 正式网页来源（另固定允许两个本机软件Origin）；`KATAGO_MAX_VISITS` 1–64总预算上限；`KATAGO_PATH`、`KATAGO_MODEL`、`KATAGO_CONFIG` 本机/镜像内固定引擎文件；`VITE_KATAGO_API_ORIGIN` 前端集中公开服务地址。沿用原服务默认值，无新秘密。不得把平台凭据放进网页。

## 更新与回滚

先执行 `corepack pnpm install --frozen-lockfile --prod=false`、`corepack pnpm check`、`corepack pnpm build:analysis`、`corepack pnpm build:pages`。Docker定义 `analysis-engine/Dockerfile`，Render Blueprint路径 `project/deploy/katago.render.yaml` 仅管理已有KataGo服务。更新该服务到核对的main提交，保持Free与现有环境变量，不更改房间服务。不要在没有预算授权时启用付费超额、升级实例或新增服务。`/readyz`应具备ai-move，再从原网站实际走一手和赛后复盘。

本机真实HTTP：构建引擎库后，启动分析服务，运行 `KATAGO_TEST_ORIGIN=http://127.0.0.1:4219 KATAGO_TEST_PAGE_ORIGIN=http://127.0.0.1:4215 node scripts/ai-real-smoke.mjs`。容器验证由仓库 `.github/workflows/katago-container.yml` 在0.1CPU/512MB限制下执行旧复盘与新AI真实引擎脚本。原软件服务 `node dist-server/server.mjs` 在4190提供带远端AI地址的构建。

回滚：先导出当前棋谱/完整本机备份；在Render对同一服务部署已记录的旧提交，在GitHub恢复对应静态构建。旧后端只有review接口时AI页面显示需更新，不能声称还能对弈。不清浏览器记录。更换模型须修改固定manifest/校验脚本并重建镜像及回归，不开放客户端任意模型/路径或搜索配置。

## 费用与性能边界

本任务沿用现有免费服务，无新增付费资源。免费实例有休眠、共享时间与构建/带宽额度；账户剩余额度须由账户持有人核对，不推断账单。普通CPU仅有限并发，冷启动/忙时可能手动等待重试；实测配置、耗时和内存见验收报告，不能由少量样本保证每步秒回或多人实时服务。

官方核对： [KataGo v1.18.1 Analysis Engine](https://github.com/lightvector/KataGo/blob/v1.18.1/docs/Analysis_Engine.md)、[Render免费限制](https://render.com/docs/free)、[部署](https://render.com/docs/deploys)、[实例](https://render.com/docs/compute-plans)，访问2026-10-30。旧模型/引擎与完整Docker来源保留原许可证说明。

本机软件的127.0.0.1:4190与localhost:4190已加入服务端两个精确CORS白名单，仍不允许任意github.io、其他端口或任意局域网IP。这样正式网站与默认本机软件都能调用同一Render引擎，不伪造Origin或使用账户代理。该增量需要最新0.24.1后端；c6a80ac只支持正式网站，不能据此宣称本机也已接通。
