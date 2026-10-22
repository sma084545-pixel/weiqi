---
schemaVersion: 1
id: HANDOFF-ONLINE-FLOATING-PLAY
revision: 1
rulesetId: GO-CLUB-AREA-1
---

taskId: ONLINE_FLOATING_PLAY
baseVersion: ONLINE_PLAY_TOOLS 0.21.1-pages.1
resultVersion: 0.21.2-pages.1
programVersion: 0.21.2
rulesetId: GO-CLUB-AREA-1
schemaVersion: 1
status: validation-in-progress

本轮要求：悬浮小棋盘可直接点击操作。底本为已验证完整ZIP，SHA-256=011c8240708b29e57964fa1235603fb125eb1ffcafabc70eb8f30e221102d82a；隔离解压，不修改sources/或旧封存包。

## 修改

OnlineGame的mini视图采用与主棋盘相同的受控mode、onPlay/onSelect和服务器请求，按轮次落子/终局注释；BoardDisplayTools加小窗滚动复位、键盘焦点可见跟随；OnlineTools.css去除强制压缩尺寸，保持32px交点、局部滚动和高于导航的层级。独立拖动柄不改变棋盘。版本、现有缓存版本测试、交互测试、本轮说明与发布工具同步。正式规则/schema、内容、旧交接与锁文件保持。

## 实际验证

已执行锁定安装、pnpm check（399项49文件、851内容校验和现有各项检查）、176项静态浏览器回归、11项Pages检查。21项联机检查包括直接双人点击/空格、重复点击、提子、自杀不换手、双方悔棋、死子标记取消确认、终局锁定、历史回看、全部尺寸和360/768/1280触屏/键盘/滚动、PiP/Fullscreen、聊天/重连。当前最终复验、公网发布与归档结果待回填，不能以本中间状态称发布完成。

## 失败与未测

首轮20/21，末尾误将包含最终确认事件的历史长度算作6而非7；按既有契约修正为4落子+2停手+1最终确认为7，未改引擎。原始失败日志和推导保留。视觉检查发现导航栏可能盖住小窗顶，已调整浮窗层级并增加实际命中检查。

实体异地双设备、原生Safari/Firefox、屏幕阅读器与真人教学未测。独立PiP浏览器支持边界、免费临时房间/聊天仍在；公网后台0.21.0协议1兼容前端0.21.2。本轮不要求重新部署Render，无后台/依赖/规则/内容变更，不声称后台已升级0.21.2。

## 迁移和下一步

无规则/schema/存储/题目revision迁移。升级前保存工作，再应用新版本；不清站点数据。继续从本版本完整归档或仓库project/，读docs/floating-play/USAGE.md、ACCEPTANCE.md及本交接。归档和公网发布证据最终放work/release/0.21.2-pages.1/，最新版本由LATEST.json指向。
