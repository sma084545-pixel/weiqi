---
schemaVersion: 1
id: ONLINE-ACCEPTANCE
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 联机功能验收 · 2026-10-21

唯一底本HISTORY_SLIDER 0.19.0-history.1完整归档，SHA256 d13f97ec0e85b74187b26d363546556e33349895364c935ef2dd08efe2bd915f。结果0.20.0-online.1 / 程序0.20.0。用户确认“还没有，先完成可部署版本”；没有公开发布。

| 要求 | 状态 | 实际证据 |
|---|---|---|
| 创建/加入、两个独立座位、5/9/13/19与开局贴目 | 通过 | tests/online/server.test.ts严格协议与服务测试；tests/browser/online.spec.ts两个隔离会话真实WebSocket；大厅/完整房间错误恢复 |
| 本人执色、轮次、提子、自杀/非法不换手 | 通过 | 角上先黑(1,0)、白(0,0)、黑(0,1)只提白1；白在(0,0)自杀拒绝；非本人/过时状态/重复包拒绝或幂等；实际点集由独立预期写入 |
| 停手、死子清单、双方确认与争议恢复 | 通过 | 双停后只预览；改单取消旧票；B/W分别确认；两孤子5路明确标B为死子后白25，原盘B保留；争议恢复原盘/轮次/重复历史/停手数 |
| 悔棋与历史滑动条 | 通过 | 各自只确认本席；拒绝保留、同意恢复被提白子；新分支没有旧手；光标独立、旧盘只读、远端新着回当前 |
| 认输和断线恢复 | 通过 | 认输不编造数子分；页面刷新保留席位；Chromium实际禁网/恢复、断线返回大厅再恢复；无网络超时判负；Node服务重启重放测试 |
| 服务器写入失败/损坏私有文件/Origin/第三人 | 通过 | 真实HTTP/WebSocket单元；故意写失败不提交；损坏文件留存；跨源403、私有路径404、第三人/假凭据拒绝；公开快照与私有文件不包含原凭据 |
| 完整本机教学、离线与兼容 | 通过 | pnpm check：47文件382项，内容851项，合并/冻结、TypeScript/Vite、服务打包、引擎库/容量；pnpm test:browser：176本机+9联机=185项；Chromium禁网在既有完整suite实际执行 |
| 正式题、规则/schema、全部材料和共享Board | 通过 | scripts/verify-online-preservation.py：1061个基准文件逐SHA不变；正式30题/6终局revision1，原201文件冻结；依赖只新增ws及类型，独立精确散列验证 |
| 360/768/1280、键盘/触屏模拟、减少动画 | 通过（Chromium） | 三尺寸真实页面交互，19路局部滚动、页面不横向溢出；交点背景/边框/内距断言防止容器样式覆盖；模型逐张查看最终截图 |
| 新ZIP与干净解压 | 分项证据 | ZIP旁ARCHIVE_CHECK.json分别记录CRC、文件散列、目录/数量、无依赖/私有数据等；未执行的运行检查不列通过 |
| 新版WebKit在线 | 通过（8项） | WebKit26.5实际双会话、双方确认、回看及三尺寸；排除setOffline工具限制的一条，不能代表原生Safari或WebKit禁网通过 |
| Firefox/原生Safari、真实双设备/跨网/TLS | 未测 | 公网没有部署，真实设备/辅助技术和课堂未测 |
| 当前软件更新 | 通过 | 原端口4190启动新版服务；实际内置浏览器通过“保存已提交内容并应用”更新，显示服务已连接和创建/加入大厅；不清除本机数据，见preview.json/current-preview.png |
| 新归档干净安装/构建/真实服务复查 | 通过 | 新解压目录安装锁文件、build、schema、内容851、联机8单元/9浏览器通过；独立app.zip无node_modules实际运行并用两个浏览器完成开局/同步/刷新/本机保存/1:1和棋/JSON导出 |

## 实际命令与环境

源工作目录：work/online-play-20261021/mainline/go-club（所有命令明确在该目录）。Node24.19.0、pnpm11.25.0；package.json保留原支持范围/pnpm11.19.0。Chromium151.0.7922.34，Playwright1.62.1。

- pnpm install --frozen-lockfile（基线安装）与pnpm add --save-exact ws@8.22.0 / pnpm add -D --save-exact @types/ws@8.18.2：依赖及锁文件实际落盘；原直接依赖未变。
- pnpm check → checks/full-check.log；通过。包含8项真实服务单元和374项原检查；另pnpm test:online初轮8项见unit-initial.log。
- pnpm build → checks/build-final.log；通过。生产前端/离线清单/打包server.mjs均生成。
- pnpm test:browser → checks/browser-all.log；176本机流程+9真实联机均通过。包含最终断线返回大厅修正、三尺寸样式断言，截图在output/playwright/online/。
- python3 scripts/verify-online-preservation.py → checks/preservation.json；1061文件通过。
- ONLINE_EVIDENCE_ROOT=output/playwright/online-webkit pnpm exec playwright test --config=playwright.online-webkit.config.ts --workers=1 → checks/browser-webkit.log，WebKit在线8项通过。
- 干净归档安装/构建/schema/内容/8单元/9浏览器日志为checks/clean-*.log；node scripts/smoke-online-app.mjs连接独立解压app服务，7组完整流程通过，见bare-app.log/.json和结果截图。
- 依赖差异checks/dependency-lock.diff、DEPENDENCY_CHANGE.json、原包/锁文件provenance/；MERGE_A校验保留T09旧指纹并显式验证本次授权新增依赖，不改变正式内容。

原检查输出中的T24/历史截图恢复基准原字节，本次全程新证据单独存checks/journey/（73项），避免用新结果覆盖历史记录。初轮按钮CSS视觉问题修复后重新构建并跑全部185项；完整检查最初被旧锁指纹拒绝，失败日志full-check-initial-lock-conflict.log保留，最小兼容修正后完整复验通过。生产包约1MB未压缩仍有体积提示，没有声称性能提升。

## 干净运行复现与剩余未测

从full.zip解压到新目录，在该目录依次执行pnpm install --frozen-lockfile、pnpm build、pnpm schema:check、pnpm validate:t09、pnpm test:online、pnpm test:online-browser；本次已实际执行。另从app.zip解压到不含node_modules的目录，执行node dist-server/server.mjs，用两个独立浏览器完成开局到确认计分；本次已实际执行。审批服务曾因用量限制未完成预览进程检查，重置时间后恢复，以上待补运行检查均已补齐，没有绕过审批。真正双设备跨网、HTTPS/公网和原生Safari/Firefox仍未测。WebKit8项只测在线；其禁网工具限制沿用。最终重新封装后的CRC/SHA、解压和运行结果，以归档旁ARCHIVE_CHECK.json为最终证据。

本次是可部署功能交付，运行验收限于上述真实执行范围；没有实际学生数据、真人教师审核、实体打印制造或CAS认可结论。
