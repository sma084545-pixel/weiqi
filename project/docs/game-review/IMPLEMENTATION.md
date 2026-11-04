---
schemaVersion: 1
id: DOC-REVIEW-IMPLEMENTATION
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 复盘分支实现

版本0.27.1；基线GUIDED_PLAY 0.26.2-pages.1。无新依赖、后端部署或付费资源。规则引擎、Board、正式内容、联机协议与KataGo HTTP契约不变。

`game-review/model.ts`从精确历史快照恢复真实前缀，并由原引擎完整重放校验。分支撤除终局事件/显式resume后再次校验；不以摆棋方式伪造历史。新分支清除原局的未来redo，起点前的真实历史保留用于超级劫。

`ReviewActions`用原生dialog维持原页面、滑动条与联机连接；普通AI/辅助对手先暂停。`ReviewWorkspace`复用AiGame或GuidedPlay，传入初始棋局与独立StoragePort。结束/返回/切换分支会卸载并取消对手请求。工作区切换后重新读取分支的最新存档，不把起始快照覆盖已下着法；有对应UI回归。所有写入加分支命名空间，普通存档键与房间操作接口不受影响。只在联机赛后开放复盘和AI续下。

`storage.ts`保存GameReview原谱、当前游标、分支索引，重读时按引擎重放原谱。新键位于`go-club:full-game:review:`；仍用已有IndexedDB/本机备份适配器。原有全局schemaVersion1不变。GuidedPlaySession增加可选historyBranch元数据，允许来自完整合法历史的5/9/13/19路、原始摆子与贴目；普通辅助新局仍默认9/13和0贴目，旧无该字段的记录按原限制验证。分支报告仅统计起点之后的动作，不把祖先棋谱计为本次练习。

`analysis.ts`复用observeMove并核查合法反击，分开局部事实与全局评价。`useWholeGameReview`自动异步遍历、分批让出事件循环，再通过现有/api/analyze对最多4个唯一局面顺序请求；缓存按原谱和执色分离。取消/卸载通过AbortController与代次防止旧结果写入，新错误不自动重试。现有单点KataGoReview组件用于用户自选局面复盘。

官方参考（访问2026-11-04）：[React Effect清理](https://react.dev/reference/react/useEffect)、[KataGo Analysis Engine](https://github.com/lightvector/KataGo/blob/master/docs/Analysis_Engine.md)。实际固定引擎和契约沿用本项目已部署版本；没有因上游文档更新而切换引擎。实现表达与代码为本轮新增。

HTTP传输修正（0.27.1）：客户端只发送原始落子/停手/认输/恢复/计分确认动作，不发送可重算的棋块和气列表。API版本与真实着法顺序不变；既有服务逐项重放。已用285项真实操作和原有服务准备逻辑核对，保留轮次与超级劫历史；没有截断历史。0.27.0为本轮先前公开构建，最终包以0.27.1为准。
