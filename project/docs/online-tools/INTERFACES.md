---
schemaVersion: 1
id: ONLINE-TOOLS-INTERFACES
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 可选房间聊天与窗口接口

协议主版本仍为1；共同内容schemaVersion=1与GO-CLUB-AREA-1保持。源类型src/features/online-game/protocol.ts。

hello新增可选`capabilities:{roomChat:1}`；旧客户端忽略新增字段，服务端仅向已enable-chat的连接发送chat-state/chat-error。客户端仅在能力存在时启用聊天。健康检查也声明capabilities，不用于判断死活或改变棋局。

ClientMessage新增`enable-chat`与`chat-send{text}`，均含protocolVersion=1与唯一requestId；不得声明昵称、执色、房间或棋局。服务端从已认证匿名座位取得作者，第三方、跨房间、未知字段拒绝。500个UTF-16代码单元以内，trim非空，允许换行，拒绝控制字符。每座位3秒最多3条；每房间保留最近50条与每座位最近64个请求ID用于去重。普通WebSocket每秒40消息上限保持。

RoomChatSnapshot为独立传输对象：schemaVersion、稳定id=ONLINE-CHAT-{code}、revision、rulesetId、kind=OnlineRoomChat、code、messages。每条有id、递增sequence、服务器绑定color、nickname、text、ISO sentAt。chat-state可带仅发给发送者的requestId作为确认；chat-error含稳定code与独立中文说明。客户端检查身份、长度、序号与房间匹配，错误只暂停聊天，不擅改棋盘。聊天不增加PublicRoom.revision、GameState.moves/history/captures；不参与超级劫、撤回或计分。

聊天为RoomHub进程内临时映射，不写RoomRepository，也不成为新的本机存储事实源；重启后重建空聊天。断线不自动重发，发送失败保留输入，提示先核对重连记录；正常确认才清除对应输入，用户已编辑的新文字保留。

BoardDisplayTools接收renderBoard、timeline、chat、status、turnActions。所有视图复用同一受控Board和OnlineClient.act，不自行计算规则。悬浮图只读，放大和独立PiP依然受本人轮次、连接、请求锁、终局/悔棋与历史只读限制。主Board仅将受控焦点检查改用ownerDocument.activeElement，以支持同源PiP文档；没有改类型或坐标。拖动通过独立标题把手的pointer capture与方向键，窗口/面板改变时夹到视口；Esc、关闭和路由卸载清理相应视图。

Document PiP和系统FullScreen是渐进增强，实际调用必须由按钮手势触发。打开失败有页内浮图/最大化替代；没有以mock对象冒充系统PiP验收。React portal保持同一状态，样式仅复制已有本地CSS，不请求外部CDN。独立小窗关闭不关闭WebSocket；组件离开时关闭小窗。最大化使用原生dialog焦点限制和返回焦点。
