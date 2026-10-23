---
schemaVersion: 1
id: DOC-KATAGO-DEPLOYMENT
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# KataGo 终局后复盘：部署、更新与恢复

本功能只在“自由双人对弈”结束后提供手动分析。进行中、两停后的终局确认中都不能调用。终局可由双方确认计分或认输形成；拖动原有棋局滑动条选择历史局面，再点“分析当前复盘局面”。推荐、变化、胜率和目差来自真实 KataGo，不替代双方终局确认。

当前实现版本 0.22.0，基线 0.21.3-pages.1。部署完成状态以本目录实际报告和 handoff/KATAGO_REVIEW.md 为准；仅出现本文件不代表 Render 或正式站点已经接通。

## 部署边界

GitHub Pages 继续使用 `https://sma084545-pixel.github.io/weiqi/`。分析使用独立 Render Docker Web Service，既有 `weiqi-rooms` 不修改；不添加数据库、磁盘、Redis或自动扩容。

Render 后台的浏览器权限仍拒绝助手访问，需要账户拥有者完成最后的服务创建。代码、容器检查与无需账户权限的工作由助手完成。不要把默认根 `render.yaml` 当成本分析服务配置：它管理原有房间服务。

已提供准确配置 `project/deploy/katago.render.yaml`（Git 仓库相对路径）。在 Render 的 New → Blueprint 连接 `sma084545-pixel/weiqi` 后，选择实际已交付的分支，在 **Blueprint Path** 填该路径。预览应只新建 **weiqi-katago** 一个 Docker Web Service，Free、Singapore、单实例、健康检查 `/readyz`；不应创建或变更房间服务。确认后创建。服务名称若已占用，以平台实际分配的 HTTPS 地址为准，不能猜地址。

手动 Web Service 等效设置：Root Directory=`project`；Dockerfile=`analysis-engine/Dockerfile`；Docker Context=`.`；Free；Environment `PUBLIC_ORIGIN=https://sma084545-pixel.github.io`、`KATAGO_MAX_VISITS=64`；健康检查 `/readyz`。Docker CMD 启动 HTTP 服务，读取平台 `PORT` 并监听 `0.0.0.0`。

公开计划核查于 2026-10-23：Free 为 0.1 CPU / 512 MB，计算资源 $0/月；15分钟空闲后休眠。所有 Free 服务共享每工作区750运行小时/月。Hobby包含的构建分钟、带宽与超额收费另计，创建前核对剩余额度及工作区支出限制，不开启未经授权的付费选项。$7/月的0.5CPU/512MB计划不能解决内存不足；1CPU/2GB为$25/月，未授权购买。详见 RENDER-OPTIONS.md 和实际测试记录，不能从本机测试承诺云端速度。

## 固定容器与环境变量

`analysis-engine/Dockerfile` 固定 Node 22.23.3、Debian/Node镜像digest、KataGo v1.18.1、Eigen3.4及官方小模型SHA-256。构建时获取模型，运行时不下载；启动一个 Node API 进程和一个常驻 Eigen CPU 引擎，不依赖电脑保持开机。全量源/许可证见 analysis-engine/。模型权重不进入普通 Git 历史。

| 名称 | 用途/默认 |
|---|---|
| PUBLIC_ORIGIN | 唯一允许的浏览器Origin；不带 `/weiqi/` |
| PORT | Render注入的HTTP端口 |
| KATAGO_MAX_VISITS | 1–64；默认64，不接受客户端覆盖 |
| APP_ROOT | 容器固定 `/app`，定位配置和清单 |
| KATAGO_PATH | 服务端固定引擎路径 `/opt/katago/katago` |
| KATAGO_MODEL | 固定已校验模型 `/opt/katago/model.bin.gz` |
| KATAGO_CONFIG | 固定服务端分析配置路径 |
| VITE_KATAGO_API_ORIGIN | 前端构建公开地址；通过 deploy/github-pages.json 的 analysisOrigin 集中注入 |

这些变量不需要密码或API密钥。管理员凭据不能加入前端、仓库或日志。

## 检查与调用契约

- `GET /healthz`：HTTP进程状态、引擎状态、队列；不触发搜索。
- `GET /readyz`：只有版本与模型初始化核对成功才200，否则503。
- `POST /api/analyze`：见 src/core/analysis/contract.ts。请求只包含已结束完整对局的合法起点、有效事件、贴目、复盘索引与局面ID。服务端重新执行规则引擎，不信任客户端棋盘、提子数或胜负。
- 输入上限256KB、1600事件、5/9/13/19路，贴目为[-100,100]的半整数。原软件可设置其他贴目，但分析会明确拒绝而不会四舍五入改局。
- 一次搜索，最多2项等待，单次最多64 visits/15秒搜索，包含等待的90秒硬期限；取消发 terminate，保留槽位直到原请求最终输出。5秒不响应取消则重启引擎。引擎退出让全部待处理请求失败，有限退避重启，不保留无限结果缓存。
- 每客户端约6次/分钟、全局18次/分钟；IP限制仅尽力而为，全局资源上限仍生效。CORS只允许精确Origin，不作为身份认证。无账户系统，也不是防作弊认证。
- HTTP请求头只需 Content-Type，OPTIONS 已处理；浏览器取消/离开/切手会终止请求，旧结果不能覆盖新局面。没有自动持续分析或保活请求。

响应固定 `perspective=B`，根与候选的 winrate/scoreLead 全部是黑方视角；候选和PV由统一落子内核复核，非法续着不显示。GTP列跳I，row0为上方，停手为pass；实际初始摆子用initialStones，不造落子顺序。完整有效着法（含停手）传给KataGo；终局注释/认输不伪装成落子，争议恢复保留原着法历史。以明确规则对象映射 GO-CLUB-AREA-1，不使用名称相似但不同的赛规预设。模型不支持的规则警告按失败处理。

## 验证命令

从工程根目录使用 package.json 指定Node与pnpm：

```sh
pnpm install --frozen-lockfile --prod=false
pnpm check
pnpm test:analysis
pnpm test:analysis-browser
pnpm build:analysis
docker build -f analysis-engine/Dockerfile -t weiqi-katago .
docker run --rm -p 4207:10000 --memory=512m --cpus=0.1 weiqi-katago
# 另一终端；会发送有标识的开发棋局，不含真实成员记录：
node scripts/katago-real-smoke.mjs
```

本机没有Docker守护进程，因此Linux容器检查通过仓库的手动/分支CI实际执行，不能把本机原生引擎检查当作Docker检查。容器CI限制0.1CPU/512MB只是可复现近似，并非Render实测。正式Render仍须从原网站验证跨域分析。

## 发布、更新与回滚

取得真实 Render 地址后，填入 `deploy/github-pages.json` 的 `analysisOrigin`，再执行 `pnpm build:pages`。使用既有 GitHub Pages 同步流程发布 root 静态构建与 project/ 源码；保留既有哈希资源和用户手动应用更新机制。不清除站点数据，不强制刷新进行中棋局。API跨域请求不会被离线缓存；断网时本地对弈/复盘仍可用，分析如实报不可连接。

更新后端：先确认当前分析可结束，再在独立 weiqi-katago 服务部署已验证提交。autoDeploy关闭以便人工选定提交；无需更新或重启 rooms。新镜像自带模型，重启不依赖临时文件。修改模型时同时修改manifest、下载URL/SHA、许可证、API清单参数并重跑四尺寸/规则/视角/内存测试，不在运行请求中下载任意模型。

回滚：Render回滚本分析服务至已验证部署；前端把 analysisOrigin 设回上个验证地址或null后重新构建发布。null会如实关闭分析而保留下棋。若只是临时故障，无需更改棋谱或清空本机记录。GitHub Pages回退用已封存的静态构建，不能从旧全量工程覆盖当前源码。来源、测试与限制随本目录和handoff记录。
