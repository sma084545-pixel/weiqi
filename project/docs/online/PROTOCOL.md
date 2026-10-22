---
schemaVersion: 1
id: ONLINE-PROTOCOL
revision: 2
rulesetId: GO-CLUB-AREA-1
---

# 可选联机服务接口 v1

前置主线0.19.0-history.1。共同内容schemaVersion=1、GO-CLUB-AREA-1、坐标row/col左上0基、B/W/null保持。房间传输类型独立于封闭的内容schema；OnlineGameRecord不能冒充GameState导入，导出仍走T01 serializeGame并由T15重放。

服务端和客户端引用同一src/core/rules、T08纯状态控制器和src/core/version.ts。不计算AI棋力、不重复实现提子/数气/面积。Board继续受控，只发动作意图；颜色从服务器的私有连接座位取得，拒绝客户端自称color或board。

## 传输

同源/api/online/ws，浏览器WebSocket。包带protocolVersion=1、requestId；创建含nickname/size/komi，加入含code，恢复含code/token，动作含version与action。动作允许place、pass、resign、toggle-dead、confirm-score、resume-play、request-undo、confirm-undo、reject-undo。place/toggle-dead包含at{row,col}。sync仅请求当前房间；leave解除当前连接但保留原座位。

服务hello公布程序/规则/可选分享网址；joined只向获准的连接发自己的恢复凭据；state广播PublicRoom；error含稳定code和中文说明，可附原房间；left进入大厅。不存在列出所有房间接口。

PublicRoom带schemaVersion/id/revision/rulesetId/kind/protocolVersion/code/record/scoring/undoRequest/players/message。record只含合法setup、固定komi、有效事件路径、稳定ONLINE-GAME-code身份和revision，不发送平方增长的撤回快照。客户端先validatePublicRoom，再用replayOnlineGame委托T01校验和重放；同一路径只增量追加/撤回，分支不同从根重放，绝不信任外来的提子数和赢家。历史滑动条只读该已验证GameState，回看不向房间发送动作。

## 提交与历史

单进程串行事务；检验房间版本/本人座位/双方连接/轮次/确认状态，再调用同一T01/T08模型。先持久保存成功，才提交和广播。错误、写入失败或过时版本不改变事实；过时客户端收到当前状态后自行重新确认，不重发未知结果的落子。每席记住最近64个成功requestId，重复包只返回当前状态。

GameState的setup/history/moves/captures/phase/toPlay/komi等不变。两停进入确认，标记整块不改历史盘面；黑方、白方各自确认同一清单。清单修改取消旧票，争议resume保持原盘和超级劫历史。悔棋申请阻止交错落子，由黑白各自确认，调用T01完整undo；新分支照旧清redo。网络断线不充当停手、认输或超时。

私有OnlineRoomStore带schemaVersion=1/id=LOCAL-ONLINE-ROOMS/revision/rulesetId/kind和房间集合。恢复时重放合法事件，不接受文件自称的盘面、提子或赢家。确认注释须整块且与阶段相容；损坏/未知版本失败并保留原件。写临时文件、flush、原子rename；文件私有权限600、目录700（宿主权限系统适用时）。备份需停止服务再复制；跨文件/多进程事务不受支持。

## 座位与恢复

房间码使用加密随机8位码，座位凭据32字节加密随机数；服务保存SHA256散列，比较时常数时间核对，公开快照不含凭据/散列。客户端只在当前浏览器sessionStorage保存自己凭据，不建立实名账号或设备指纹。同凭据从新连接恢复时替换旧连接，旧页面暂停操作；不能据此认定现实身份。关闭会话不保证自动找回座位。

服务限制8KiB输入包、每连接每秒40消息、100房间/每局2000事件；WebSocket ping/pong15秒只探测连接，不是强制棋钟。Origin不匹配的升级拒绝；HTTP只读dist，未开放数据文件。运行日志不打印包体或凭据。公网应用需HTTPS和外层限流/监控，见DEPLOYMENT.md；未声称经过渗透或互联网规模负载测试。

## 兼容扩展

模块注册新增optional requiresNetwork:boolean，缺省false；离线可用列表排除true项。online-play / #/play/online需要网络，其他已安装模块沿用原本机存储和离线行为。APP_VERSION统一来自src/core/version.ts；原constants与unified-persistence的导出位置保留。数据库与schema没有迁移。新增依赖仅ws8.22.0与开发类型@types/ws8.18.2，已锁定并保留MIT许可证。


0.21窗口与聊天兼容扩展见[最新使用说明](../online-tools/USAGE.md)及[协议扩展](../online-tools/INTERFACES.md)。旧基础对局约定继续适用；当前公网实际服务版本与程序版本分别记录在../online-tools/ACCEPTANCE.md。
