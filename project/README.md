---
schemaVersion: 1
id: DOC-README
revision: 24
rulesetId: GO-CLUB-AREA-1
---

# 围棋社工具包 · 原网址同步 · 0.20.2-pages.1

新增**联机对弈**：两人打开同一个可访问的网站，一人创建房间，另一人输入房间码；无需注册或真实姓名。棋盘5/9/13/19路、默认9路与0贴目，双方各执一色。服务端用原规则引擎验证落子和提子，支持停手、认输、双方悔棋、断线恢复、终局双方确认后自动面积计分，以及每人独立的棋局滑动条。

当前程序0.20.2，唯一基线ONLINE_PLAY 0.20.0-online.1；GitHub Pages同步交接见handoff/GITHUB_PAGES_SYNC.md。正式30题/6终局、材料、规则、schema和本机存储保持；新增可选Node房间服务。学习进度、草稿、反馈不上传；只有主动联机时发送昵称、棋局、操作与连接状态。尚未公开部署网站。

正式网站仍为 https://sma084545-pixel.github.io/weiqi/ 。页脚显示版本号，version.json可核对生产版本。GitHub Pages提供最新静态教学与同屏功能；联机房间服务尚未接入时明确提示，不能仅靠静态托管同步两台设备。管理员接入方法见docs/github-pages/ONLINE_SETUP.md。旧版先保存当前工作，再应用更新，不清除本机记录。

## 启动

已附生产构建和打包的服务；有Node时可直接启动，不需要node_modules：

```sh
node dist-server/server.mjs
```

macOS可双击“启动联机对弈.command”。默认监听0.0.0.0:4190，浏览器打开http://127.0.0.1:4190/#/play/online。终端显示可供同网伙伴尝试的局域网地址；localhost只能供本机使用。跨地点需要自行部署到双方能访问的服务器，见[启动与部署](docs/online/DEPLOYMENT.md)。本交付没有购买、外发或自动发布。

源码安装、构建和启动：

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

纯本机教学开发用pnpm dev；它是静态前端服务，不提供联机接口。修改后端可pnpm dev:online，修改前端后需重建。只有主机需要Node；参与者仅用浏览器。同屏对弈仍在#/play/free；既有离线教学可单独从dist启动静态服务。

## 使用与验证

先读[联机使用说明](docs/online/USAGE.md)、[协议与存储](docs/online/PROTOCOL.md)、[验收记录](docs/online/ACCEPTANCE.md)、[已知限制](docs/online/KNOWN_ISSUES.md)和[本次交接](handoff/ONLINE_PLAY.md)。当前逐文件版本以RELEASE_MANIFEST.json与work/release/LATEST.json为准；下方T24记录为历史来源，不代表本次程序版本。

```sh
pnpm check
pnpm test:browser
pnpm test:online
pnpm test:online-browser
python3 scripts/verify-online-preservation.py
```

check覆盖47文件382个单元检查与现有完整内容/构建/离线/引擎验证。test:browser先跑静态本机界面，再启动真正Node服务跑双浏览器联机，不能用静态预览冒充WebSocket检查。Node和pnpm要求沿用package.json，锁文件记录仅新增ws与其类型。浏览器、断网、归档复查等实际范围见验收报告。

保持原来源/端口可沿用本机记录。更新前备份、保存当前工作后应用新版本，再准备离线缓存。房间数据独立保存在服务器runtime-data/，不混入下载包；备份/更新需停止房间服务后复制私有文件。首次准备完成的本机教学可离线，联机房间需要服务连接。file://不具备同等运行能力。

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
