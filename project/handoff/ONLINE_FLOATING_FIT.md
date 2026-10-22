---
schemaVersion: 1
id: HANDOFF-ONLINE-FLOATING-FIT
revision: 2
rulesetId: GO-CLUB-AREA-1
---

taskId: ONLINE_FLOATING_FIT
baseVersion: ONLINE_FLOATING_PLAY 0.21.2-pages.1
resultVersion: 0.21.3-pages.1
programVersion: 0.21.3
rulesetId: GO-CLUB-AREA-1
schemaVersion: 1
status: complete

## 输入与边界

唯一底本为已验证0.21.2完整ZIP，SHA-256 fdc6420583189b49249fa17ffc17bc77e76444337c6f2fe7a7d22ba3bc194807，隔离解压。不修改sources/、旧封存包或旧交接。用户明确要求整盘可见，覆盖此前小窗最小32px而滚动的选择；大棋盘原有几何保持。

## 修改文件

src/features/online-game/{BoardDisplayTools.tsx,OnlineTools.css}；package.json/src/core/version.ts；tests/browser/{online-tools.spec.ts,t16.spec.ts}；本轮docs/floating-fit、说明/发布工具与handoff。完整清单docs/floating-fit/changed-files.json。仅两种小窗用compact-board按宽/高同时约束方形布局；仍显示完整N²按钮、N条线，真实棋子/坐标不变。主Board、引擎、服务器代码、协议、schema、正式内容和锁文件不变。1042份受保护文件一致。

## 实际命令与检查

- corepack pnpm install --frozen-lockfile --offline：现有缓存安装，无依赖升级。
- corepack pnpm check：399项49文件、851内容检查及既有构建/引擎/离线检查。
- corepack pnpm test:pages：11项。
- corepack pnpm build:pages：公开构建。
- ONLINE_EVIDENCE_ROOT=docs/floating-fit/checks/browser/regression ONLINE_TOOLS_EVIDENCE_ROOT=docs/floating-fit/checks/browser corepack pnpm test:online-browser：22项全部通过；四种盘面每个交点矩形在小窗和可用区域内，短横屏、旋转、触屏/键盘四角、提子、自杀、悔棋、终局/历史只读，真实PiP19路等。
- python3 scripts/verify-floating-fit-preservation.py --restore-generated
- python3 scripts/run-floating-fit-browser.py scripts/local-floating-fit.js docs/floating-fit/checks/local-preview.json：真实http://127.0.0.1:4190，Chrome155，361交点无滚动，触屏角点与伙伴同步，三种窗口含短横屏通过。旧本机房间文件另作备份，不进Git或归档；用户预览服务留在4190。
- python3 scripts/run-floating-fit-browser.py scripts/online-floating-fit-public.js docs/floating-fit/checks/public-journey.json：最终公网原网址证据。
- python3 scripts/package-floating-fit.py
- python3 scripts/verify-floating-fit-archive.py --release <0.21.3-pages.1目录> --extract <不存在的新目录>
- ONLINE_SMOKE_URL=<新解压软件的本机地址> ONLINE_SMOKE_OUT=<ZIP目录> node scripts/smoke-floating-fit-app.mjs

最终归档CRC、全部内部哈希、全新目录锁定安装/单元/构建、无node_modules软件实测结果见ZIP同目录ARCHIVE_CHECK.json、bare-app.json、原始日志与SHA256SUMS；公开HTTPS逐文件与GitHub资源哈希见PUBLIC_HASHES.json、PUBLICATION_PROOF.json。源包含源码/构建、全部内容与可编辑材料/成品、工具与交接，不含私有房间文件或安装依赖。

## 失败与未测

初次受限环境不允许TCP监听，10个服务测试无法运行，获工具权限后完整通过。首次短横屏13/19路2项几何失败，行标签固有高度撑长网格，已用明确方形高度、可收缩行与相应字号修正；最终22项通过。原始日志和pre-fix截图保留，不放宽边界检查。没有自动审核拒绝或待用户授权的问题。

本轮未重复不受影响的全站176项静态浏览器；不将上版结果计为本轮。真实手机/异地两网络、原生Safari/Firefox、屏幕阅读器、真人教学/实印未测。免费服务器仍为临时房间/聊天；公网后台0.21.0协议1兼容，不要求重启，也不冒称已部署0.21.3后台。

## 迁移与下一步

无规则/schema/题目revision/存储迁移，不触及内容冻结清单。已有网页先保存，再应用更新；不清站点数据。继续从LATEST.json所指本版本ZIP或仓库project/，读本交接、docs/floating-fit/{USAGE,ACCEPTANCE,KNOWN_ISSUES}.md。旧版0.21.2归档完整保留。完成通知在最终回复发送。

## 最终公网实测

原GitHub网址实际显示0.21.3，Chrome155.0.8059.86，9组流程通过、0页面异常。360px触屏模拟19路全部361交点和四角落子同时可见，无滚动；740×360短横屏、768/1280宽变化保持完整；主盘和对方同步、连点去重、历史只读、PiP、聊天/刷新/禁网恢复、30题入口通过。实际健康接口仍是0.21.0/roomChat=1，无需重启Render。截图和完整报告在docs/floating-fit/checks/public-*。

本机4190同样实际0.21.3，旧文件先备份后沿用；该持久化文件和进程信息只在工作区的work/local-online-state/，不在归档或Git。最终下载包单独新目录解压复验，不以正在运行的源码目录替代。
