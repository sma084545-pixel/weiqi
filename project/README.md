---
schemaVersion: 1
id: DOC-README
revision: 27
rulesetId: GO-CLUB-AREA-1
---

# 围棋社工具包 · 0.21.2

原网站保持 https://sma084545-pixel.github.io/weiqi/ ，联机入口 #/play/online。新增可拖动悬浮棋盘、独立画中画、最大化/系统全屏及房间双人聊天。使用与兼容边界见[窗口与聊天](docs/online-tools/USAGE.md)，更新服务器见[部署指南](docs/online-tools/DEPLOYMENT.md)。本次主线基线ONLINE_PLAY_TOOLS 0.21.1-pages.1；保留GO-CLUB-AREA-1、schemaVersion1、30题/6终局、课件纸卡和原存储。

0.21.2起悬浮小棋盘可按本人轮次直接落子，终局确认时可标记死子。回看保持只读；13/19路在小窗内滚动。说明见[直接操作](docs/floating-play/USAGE.md)，交接见[本轮交接](handoff/ONLINE_FLOATING_PLAY.md)。这是前端更新，无需为此重启Render。

## 本地运行与构建

已构建完整包/软件包含dist和dist-server，有兼容Node即可运行`node dist-server/server.mjs`；默认http://127.0.0.1:4190/。也可打开“启动联机对弈.command”；Ctrl+C停止服务。本机地址不能发给异地伙伴。

源码：从工程目录执行`corepack pnpm install --frozen-lockfile`、`corepack pnpm build`、`corepack pnpm start`；发布原GitHub网站用`corepack pnpm build:pages`。Node22.22.2起的22系、24.15起的24系或26+；锁定pnpm11.19.0与现有依赖。纯前端开发`pnpm dev`不提供房间接口。无AI API、账号、付费服务或默认学习数据上传。

检查：`corepack pnpm check`、`corepack pnpm test:browser`、`corepack pnpm test:online`、`corepack pnpm test:pages`。实际命令、结果及限制在docs/online-tools/checks/和handoff/ONLINE_PLAY_TOOLS.md。本机学习离线与房间联网分别验证；升级先保存备份再应用，不清站点数据。

联机服务器为https://weiqi-rooms.onrender.com，网页与带roomChat=1的后台0.21.0已接通并实测聊天；程序包为0.21.2。服务端以共同规则验证双方轮次、提子、超级劫、悔棋与终局清单。预览不等于死活裁判，双方确认后才形成面积分。聊天仅当前房间两位伙伴临时文字，不混入棋谱；正式题库和本机教师草稿、反馈不上传。

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
