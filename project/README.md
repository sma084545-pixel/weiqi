---
schemaVersion: 1
id: DOC-README
revision: 33
rulesetId: GO-CLUB-AREA-1
---

# 围棋社工具包 · 0.26.1

新增独立“辅助下棋 / Guided Play”模式：学习路线课程6之后或首页快捷入口，9/13路、分级提示、规则型局部反馈、可离线教学机器人及可选真实KataGo对手、悔棋/回看、本机续玩、教学报告和保留原局的重试。原12课、37场景、30正式题、6终局、四档AI及所有真人对弈继续保留。使用见[辅助下棋说明](docs/guided-play/USER_GUIDE.md)，架构/边界见[实现说明](docs/guided-play/IMPLEMENTATION.md)，本轮状态以[交接](handoff/GUIDED_PLAY.md)与[验收](docs/guided-play/ACCEPTANCE.md)为准。

以下0.25.2与0.24.2内容用于基线溯源；当前版本以本页标题和src/core/version.ts为准。

本轮新增“极致”独立强模型，采用用户选择的Free配置。原网站 https://sma084545-pixel.github.io/weiqi/#/play/ai 已实际接通新Render服务；真实落子、悔棋/重做、滑动回看、刷新续玩和同模型赛后复盘通过，本机4190及原三档也已真引擎验证。前端0.25.2会安全更新旧缓存，保留棋谱；先保存，再点“保存已提交内容并应用”，不清站点数据。tf2较强小模型不对应人类段位，Free每步搜索约半分钟，休眠唤醒可能更久。实际证据见[验收报告](docs/extreme-ai/ACCEPTANCE.md)，使用/部署/回滚见[本轮交接](handoff/EXTREME_AI.md)。以下保留0.24.2基线功能说明。

原网站保持 https://sma084545-pixel.github.io/weiqi/ 。本轮基线 ADVANCED_COURSES 0.23.0-pages.1，新增 `#/play/ai` 真实 KataGo 对弈：轻松/标准/挑战三档相对搜索强度、选择执色、5/9/13/19路、自由让子、停手、悔棋/重做、棋局滑动条、独立保存与棋谱导出。结束后才开放候选变化、胜率与预计目差。三档不对应人类段级位；AI 不自动确认死活，双停后仍须人工核对清单。

[AI 对弈使用说明](docs/ai-play/USAGE.md) · [接口与部署](docs/ai-play/DEPLOYMENT.md) · [验收证据](docs/ai-play/ACCEPTANCE.md) · [本轮交接](handoff/AI_PLAY.md)。前端、房间服务和 AI 服务分开部署；原网站及默认本机4190已与 Render 0.24.2/API2 实测接通；旧后端仅有复盘接口时仍会如实提示需更新，不伪造 AI 落子。

继续保留课程1–12、37个进阶场景、正式30题/6终局和全部材料。GO-CLUB-AREA-1、schemaVersion=1、规则引擎、正式内容/冻结清单与已有学习记录保持。真人双人、联机、聊天、悬浮棋盘、画中画、最大化和赛后复盘不变。新着法需联网；本机保存、浏览与已缓存的基础教学仍可离线。

0.21.3起悬浮小棋盘可按本人轮次直接落子，终局确认时可标记死子。回看保持只读；5/9/13/19路按小窗宽高完整显示，无需滚动。说明见[直接操作](docs/floating-fit/USAGE.md)，交接见[本轮交接](handoff/ONLINE_FLOATING_FIT.md)。该悬浮修复继续沿用；KataGo使用独立分析服务，不能用房间服务替代。

## 本地运行与构建

已构建完整包/软件包含dist和dist-server，有兼容Node即可运行`node dist-server/server.mjs`；默认http://127.0.0.1:4190/。也可打开“启动联机对弈.command”；Ctrl+C停止服务。本机地址不能发给异地伙伴。

源码：从工程目录执行`corepack pnpm install --frozen-lockfile`、`corepack pnpm build`、`corepack pnpm start`；发布原GitHub网站用`corepack pnpm build:pages`。Node22.22.2起的22系、24.15起的24系或26+；锁定pnpm11.19.0与现有依赖。纯前端开发`pnpm dev`不提供房间接口。核心学习与对弈无需账号或AI服务；真实KataGo在选择AI对弈时提供对手着法；胜率/目差分析仍仅在终局后主动调用，学习记录和反馈不上传。

检查：`corepack pnpm check`、`corepack pnpm test:browser`、`corepack pnpm test:online`、`corepack pnpm test:pages`。实际命令、结果及限制在docs/online-tools/checks/和handoff/ONLINE_PLAY_TOOLS.md。本机学习离线与房间联网分别验证；升级先保存备份再应用，不清站点数据。

联机服务器为https://weiqi-rooms.onrender.com，网页与带roomChat=1的后台0.21.0已接通并实测聊天；本次前端为0.24.2；房间服务无须因课程增量重新部署。服务端以共同规则验证双方轮次、提子、超级劫、悔棋与终局清单。预览不等于死活裁判，双方确认后才形成面积分。聊天仅当前房间两位伙伴临时文字，不混入棋谱；正式题库和本机教师草稿、反馈不上传。

---

## T24 继承说明（历史）

以围棋提供放松、社交与主动思考的非学术休闲机会。工具包整合T00–T23程序、30道正式题、6个终局、棋具设计、规则卡、30张双面题卡、25页微课和6次45分钟主持流程。零基础到熟练成员均可自由跳转，进度不构成参与门槛。默认假设是中学生、45分钟、两人一盘，并非已确认的学校情况。

本次工具包 **0.17.1-t24.1**、程序 **0.17.1**；唯一底本T23 **0.17.0-plus-t23.1**。规则GO-CLUB-AREA-1、schemaVersion=1、Freeze B/正式revision1保持。最新状态读[交接](handoff/T24.md)，历史handoff与旧材料全量归档只作追踪，不覆盖本包。

先读[教师快速开始](docs/t24/TEACHER_QUICK_START.md)、[更新备份指南](docs/t24/UPDATE_AND_BACKUP.md)、[验收矩阵](docs/t24/acceptance-matrix.md)、[实际测试](docs/t24/test-report.md)、[限制](docs/t24/known-issues.md)。最新逐文件清单RELEASE_MANIFEST.json、SHA256SUMS.txt；正式题/卡片/课件页码映射docs/t24/release-inventory.json。归档校验值在ZIP同目录。

## 本地启动

标准环境：Node22.22.2+（22系）、24.15+（24系）或26+，pnpm11.19.0。T24实际用Node24.19.0/pnpm11.25.0执行同一锁文件；共享依赖未升级。首次获取依赖需要网络。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

默认http://127.0.0.1:5173/；以终端实际地址为准。无账号、AI API、后台数据库、外部CDN或默认网络上传。已附dist/生产构建，已有Python3时可直接从工程目录运行下行并打开http://127.0.0.1:8080/：

```sh
python3 -m http.server 8080 --bind 127.0.0.1 --directory dist
```

保持相同来源/端口保存本机数据；本地HTTP的localhost或HTTPS才支持Service Worker。直接双击file://没有同等离线能力。教师先检查“已可离线”，再禁网刷新；PDF/PPTX需另外留在本机。

## 构建与验证

```sh
pnpm check
pnpm build
pnpm preview
pnpm exec playwright install chromium
pnpm test:browser
```

check包含生成类型、358单元/组件测试、内容851检查、判题、合并和201冻结文件、TypeScript/Vite生产构建、独立ESM引擎、刷新和容量。test:browser实际150项，包含T24连续路线与快速刷新。构建的主包约971KB提示为已知轻微性能事项。

WebKit可另执行T24_ONLINE_ONLY=1 pnpm exec playwright test tests/browser/t24.spec.ts tests/browser/t24-refresh.spec.ts --browser=webkit --workers=1；这是在线检查。node scripts/check-origin-outage-t24.mjs另验证两内核停止资源服务后的缓存恢复；Chromium完整suite包含禁网刷新。原生Safari/Firefox/设备实机/辅助技术未测。

本次宿主的Node/pnpm路径在docs/t24/test-report.md和实际日志中；换电脑用自己的标准运行时，不复制宿主绝对路径。材料重建使用各materials目录source/tools与各自README，Python所需库按原材料说明；Office/PDF渲染需字体和转换器，调整宿主路径后逐页检查。

## 直接使用材料

- materials/facilitator-kit/output/：20页手册、6份独立一页活动、同伴教学/无屏替代/准备收尾/反馈等空表（DOCX/Markdown/PDF）。
- materials/micro-lessons/output/：五套各5页可编辑PPTX、合并25页和PDF；原生备注保留。
- materials/challenge-cards/output/：30张双面挑战卡与教师答案册；editable/含60个SVG。
- materials/rule-cards/：基础/补充规则、面积手算、吃子小游戏和自选路线；materials/demo-board、pair-boards：可制作的尺寸与材料方案，100%打印先校准。
- content/t09/bundle.json、puzzles/、endgames/、artwork/、tools/：唯一正式题库与验证工具；content/print的36页T09PPT为内容参考，不是额外微课主讲页。

数字流程与纸面均用GO-CLUB-AREA-1：先提敌棋后查己方气，位置超级劫、停手例外、两停人工终局确认、默认0贴目、面积不再加提子数。两个受保护独立真眼是基础活形；没有两眼不自动死亡。未知合法题目分支不判错。

开发DEMOs/TEMPLATE/TEST数据有标签，不计入30题。没有真实成员反馈、活动成效或CAS工时；实际反馈从空表开始。打印制造、真人教师、课堂、学校CAS认定未发生或未测，不能用自动验证代替。程序不公开部署，不发送材料。

本次专项验证：`pnpm test:history`、`pnpm test:history-browser`。完整检查仍为 `pnpm check` 和 `pnpm test:browser`。


## 原网址的公网联机接入（0.20.3）

原网站 https://sma084545-pixel.github.io/weiqi/ 的联机入口 #/play/online 使用 https://weiqi-rooms.onrender.com。部署公开前端用 `corepack pnpm build:pages`，它读取非秘密配置 deploy/github-pages.json；普通 `pnpm build` 不注入公网配置。公开构建只在配置中的网站来源使用 Render，本机软件仍使用自己的 Node 服务；VITE_ 变量不得放密钥。

Render 当前运行 0.20.2、protocolVersion=1，前端 0.20.3 只调整接入与提示，规则、schema、协议兼容。后台自动部署关闭，避免普通提交打断房间；后续维护时先保存棋局再在 Render 手动更新。免费实例临时文件不持久，休眠、重启、重新部署可能需要重新开房，界面已提示保存本机副本/导出。首次唤醒可能约一分钟，稍候重连。无账号、无默认学习数据上传。实际公网验证与剩余限制见 docs/render/ACCEPTANCE.md、handoff/RENDER_DEPLOY.md。


## KataGo 终局后复盘（0.22.0）

在原网站的自由双人对弈结束后，可拖动棋局滑动条并手动分析当前复盘局面。真实Eigen CPU引擎运行于独立Render服务，提供数字候选、后续变化、黑方胜率与预计目差；不改变双方终局确认，也不在进行中提示下一手。

分析后端构建：`pnpm build:analysis`；本机单元/协议检查：`pnpm test:analysis`；独立UI回归：`pnpm test:analysis-browser`。Docker、精确来源/校验值、限额、环境变量、更新和回滚见 [部署说明](docs/katago/DEPLOYMENT.md)，实际验收与限制见 [检查报告](docs/katago/ACCEPTANCE.md)。正式前端地址通过 deploy/github-pages.json 的 analysisOrigin 集中配置，`pnpm build:pages`注入；普通本机对弈不依赖分析服务。公网分析仅允许原GitHub Pages Origin，其他本地/自有网站需运营者配置自己的允许Origin。
