---
schemaVersion: 1
id: DOC-EXTREME-AI-DEPLOYMENT
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 免费极致服务部署与回滚

当前实际服务：https://weiqi-katago-extreme.onrender.com ，健康和就绪检查为 /healthz、/readyz。用户按 Free Blueprint 创建，公开就绪接口确认模型为 kata1-tf2-b10c384-s2941M-d5872M、KataGo 1.18.1、API2、内存上限512MB。实际后台版本0.25.0，前端0.25.2；本次前端缓存与发布保护修复不需要重启后台。原两服务保留。

发布顺序必须是全部检查 → pnpm build:pages → 检查 dist/version.json 的三个服务地址与配置一致 → 同步发布。通用 pnpm check 会生成不含公开地址的本地构建，不能在 Pages 构建之后运行并直接上传；新增发布保护会在复制前拒绝漏配。已发布过准备版或0.25.1时，保存后应用0.25.2，不能靠清除站点数据升级。

仅使用 Render Free Web Service，0.1 CPU / 512 MB。用户没有授权付费资源、超额收费或扩容。先确认工作区剩余免费构建/带宽/750 小时共享额度，付费支出限制设为零；超额时暂停，不升级。官方边界：https://render.com/docs/free 。

## 唯一新增服务

仓库 sma084545-pixel/weiqi，分支 main，Blueprint Path 为 project/deploy/katago-extreme.render.yaml。创建预览应只有 weiqi-katago-extreme、plan free、单实例；没有数据库、磁盘或其他服务修改。不要更新原 weiqi-katago 或 weiqi-rooms。Docker 从官方固定地址在构建阶段下载模型，校验 SHA，容器无需持久化磁盘。

实际 HTTPS 地址由 Render 创建后分配。Live 后必须检查 /readyz 的 ready=true、model 为 analysis-engine/extreme-manifest.json 固定的检查点、engineVersion=1.18.1、aiDifficulties 只有 extreme，继而实际调用落子与复盘，不能只检查 HTTP 200。

## 前端与本机软件

将实际 origin 写到 deploy/github-pages.json 的 extremeAnalysisOrigin；不能含路径、密钥或查询串。pnpm build:pages 会集中注入 VITE_KATAGO_EXTREME_API_ORIGIN，并在 version.json 中记录。按原 Pages main/root 流程同步静态产物和 project/ 可构建源码，等待 GitHub Pages 部署成功。原网址仍是 https://sma084545-pixel.github.io/weiqi/#/play/ai 。

原三档使用原分析地址，极致使用新地址。服务端和前端均验证模型身份，不做自动降级。原网站更新后从实际浏览器验证人类落子→AI 回复→撤回/重做→滑动回看→终局后同模型复盘。旧缓存用户先保存，再用应用内更新按钮应用，不能要求清除站点数据。

## 无秘密配置

- PORT：Render 自动提供；HTTP 监听 0.0.0.0。
- PUBLIC_ORIGIN：https://sma084545-pixel.github.io，无 /weiqi/。
- KATAGO_ENGINE_PROFILE：镜像内固定 extreme，选择独立配置和模型。
- KATAGO_MAX_VISITS：服务端上限 64；客户端不可覆盖。
- APP_ROOT、KATAGO_PATH、KATAGO_MODEL、KATAGO_CONFIG：镜像内部固定路径；仅供维护，不开放请求输入。
- VITE_KATAGO_EXTREME_API_ORIGIN：前端公开 HTTPS origin；不是秘密。

## 更新与回滚

先导出当前棋谱和本机备份。模型更换必须同时更新 manifest、固定 URL/SHA、EXTREME_MODEL、许可，并重新做实际免费规格容量和前后端测试；不只修改显示名称。旧原模型的 CC0 不适用于新 kata1 网络，许可全文随镜像保留。

更新时手动 Deploy latest commit，先检查真实引擎就绪与实际落子，再应用前端。失败可回滚本服务到先前健康提交，原两服务不动；必要时暂将 extremeAnalysisOrigin 置空并重建前端，明确提示极致未启用，旧三档继续可用。不得回滚到已知会在免费规格 OOM 的大模型候选。新极致续玩文件在旧版程序中会安全拒绝未知难度，回滚前应导出保存。
