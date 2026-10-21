---
taskId: ONLINE_PLAY
baseVersion: HISTORY_SLIDER 0.19.0-history.1
resultVersion: 0.20.0-online.1
programVersion: 0.20.0
rulesetId: GO-CLUB-AREA-1
schemaVersion: 1
status: complete
---

# 联机双人对弈交接

用户明确要求可创建房间的双人联机，并确认无服务器，先完成可部署版本。唯一底本work/release/0.19.0-history.1/go-club-0.19.0-history.1-full.zip，SHA256 d13f97ec0e85b74187b26d363546556e33349895364c935ef2dd08efe2bd915f；隔离解压到work/online-play-20261021/mainline/go-club，不从旧T01/T08或T09全量覆盖，没有修改sources。

## 修改文件

- server/rooms.ts、http.ts、index.ts：匿名两席、私有凭据散列、顺序事务、已有T01/T08规则、先保存后广播、断线/重启恢复、同源静态与WebSocket、私有目录隔离、容量/输入限制。
- src/features/online-game/protocol.ts、client.ts、OnlineGame.tsx/.css：严格意图、紧凑路径重放、受控Board、创建/加入/恢复、独立回看、双方悔棋和终局、本机副本/JSON导出、断线返回大厅。
- learning-hub注册/类型/入口、FullGame导出ScoreDetails及进入联机链接、OfflineData联网模块边界；只在主动联机页连接，不上传本机学习/创作/反馈数据。
- src/core/version.ts集中APP_VERSION，保留constants/unified-persistence原导出；应用0.20.0。package、pnpm-lock新增精确ws8.22.0与@types/ws8.18.2，其余依赖保持。
- vite.server.config.ts打包可运行Node服务，.gitignore排除runtime-data和私有环境；启动联机对弈.command；脚本、单元/浏览器/尺寸验证；旧MERGE_A锁验证显式兼容授权新增依赖。
- README、CHANGELOG、SOURCES、PROJECT_CONTRACT、INTERFACES、requirements-matrix；docs/online的用法/部署/协议/验收/限制/原基准/许可证/真实日志/完整变更清单；当前dist/dist-server/dist-engine和归档清单。

逐文件SHA差异由docs/online/changed-files.json生成；旧handoff、正式规则/schema、题库、全部材料、Board与GameTimeline保持原字节。保护验证1061文件通过。没有正式题revision或冻结清单迁移。

## 实际测试与冲突修复

pnpm check通过47文件382单元项、851内容检查、201冻结、T14/T15/T17、完整生产构建、离线清单、独立引擎和容量；pnpm build最终构建通过；pnpm test:browser的176本机与9双会话联机均通过（Chromium151.0.7922.34），含实际禁网、刷新、服务恢复、双方确认、非法/快速操作、360/768/1280、19路局部滚动及键盘/触屏模拟。测试输入是明确TEST记录，无真实成员数据。模型逐图检查最终三尺寸截图，不是人类审核。

首轮CSS把操作按钮背景带入Board，已收窄作用域，增加三尺寸交点样式断言并复跑。旧MERGE_A锁指纹拒绝新增ws；原T09指纹未改，新增DEPENDENCY_CHANGE的精确前后SHA/旧直接版本/仅两项新增白名单验证，完整检查复验通过。失败日志保留。旧材料与历史检查不重写，新全程证据另放checks/journey。

## 失败、未测和限制

无已知未解决规则/数据/关键流程阻断问题。WebKit在线8项实际通过；WebKit禁网工具限制、原生Safari/Firefox/Edge、真实双设备/辅助技术、跨网HTTPS及公网部署未测。用户未提供服务器，本次不公开发布。单实例100房间/每局2000事件、全离线24小时后建房时清理；座位是会话凭据，不是账户认证。断线不判负；计分须双方确认死子，不自动猜死活。

审批服务曾因用量限制中止一次预览进程检查；重置时间后恢复，未绕过审批。现已从新归档干净解压完成锁文件安装、构建/schema/内容851、8联机单元与9浏览器；另独立app包不含node_modules实际启动，两个浏览器完成7组开局/同步/刷新/本机保存/确认1:1和棋/JSON导出检查。ZIP完整性及最终再解压复查以归档旁ARCHIVE_CHECK.json为最终证据，实际日志均保存。复现命令见ACCEPTANCE.md。

## 迁移与下一步

不改变GO-CLUB-AREA-1/schemaVersion1或原本机数据库；保持原网站来源，先备份/保存后更新并准备离线。本次新房间存储独立runtime-data/rooms.json（不入归档），重放合法setup+事件，损坏时保留原件并拒绝启动；停止服务后备份私有文件。房间会话凭据不在本机完整备份中。公网部署需单Node进程、持久目录、同源HTTPS/WebSocket及PUBLIC_ORIGIN，不能用纯静态托管替代。

下游只使用0.20.0-online.1完整ZIP和本交接，按需补双实体设备与HTTPS演练；不宣称127.0.0.1已供异地成员使用。轻量APP含dist、dist-server、启动器和指南；完整ZIP含源码、正式内容、可编辑材料、测试和交接，不含node_modules、私有数据或凭据。输出路径work/release/0.20.0-online.1/，SHA/manifest可复核。
