---
schemaVersion: 1
id: DOC-PROJECT-CONTRACT
revision: 20
rulesetId: GO-CLUB-AREA-1
---

# 项目共同约定 · 0.20.2

当前产品baseVersion=ONLINE_PLAY 0.20.0-online.1，resultVersion=0.20.2-pages.1，程序0.20.2。T00–T24、自由同屏对弈、历史滑动条和可部署联机服务沿用已验收主线；用户授权同步原GitHub仓库/Pages网址。正式内容、规则、schema、材料、本机数据与依赖锁文件保持。Pages无房间后台时明确说明，不能把静态发布称为异地联机服务已上线。当前交接handoff/GITHUB_PAGES_SYNC.md；下文T17等逐项说明是历史来源。

T00 是产品实现的起点；输入提示词包为 1.1.0，不是产品版本。T00当时的产品 baseVersion 为 none，resultVersion 为 0.1.0，内容主版本 schemaVersion=1，规则 GO-CLUB-AREA-1。输入清单与 SHA-256 见 input-manifest.json。实际读取桌面项目 AGENTS.md、README、起初可用的 START_TO_FINISH.md、manifest.json、T00/T01/T09 正文及全部任务范围；交付前按当前 AGENTS.md 改以 `deliverables/go_cas_gpt_work_execution_v1_1 2/prompts/` 为权威来源，重新读取25份要求及交付边界。24份与初读哈希一致；T18仅增加前置标题文字，其余字节相同。原流程路径交付前已不可访问，不再作为当前入口；T00开始时sources/为空，无旧产品交接或工程。T01取得的实际基线另见t01/input-manifest.json。

## 定位与默认假设

以围棋（Go）提供放松、社交和主动思考的非学术休闲机会，通过教学设计、组织和原创资源降低参与门槛。对象零基础至初级。可调整默认假设：中学生、一次约 45 分钟、两人一盘；设备可能仅教师设备与投影，也可能有手机或平板。人数、学校、标志、预算和实际设备均未知。src/config.ts 保存未确认项为 null；默认设置必须与已确认事实区分。

成员可跳阶段、回看、直接对弈或观察；进度只是建议，无公开排名、强制计时、连续打卡惩罚或胜率价值判断。活动可练习观察、预测、解释、轮流与协商；不声称本项目已证明提高智商、治疗压力或改善学业。反馈只记录真实自愿输入，不编造评价、活动照片、出勤、工时、个人经历、实施效果或 CAS 认可。

## 规范优先级与单一责任

1. 用户本次规则与范围是最高依据。本地历史指南只补充执行顺序与输入识别。
2. docs/RULES.md 是 GO-CLUB-AREA-1 的项目规则正文；术语的简明表达来自 TERMINOLOGY.md。
3. schemas/content.schema.json 是结构事实来源，src/core/validation.ts 负责跨字段约束，生成的 content.generated.d.ts 禁止手改。
4. src/core/rules/contract.ts 与 docs/INTERFACES.md 定义唯一规则接口；T01已在src/core/rules实现它；无自动死活判定。
5. Board 只展示并发出选择或落子意图；页面不得再写规则计算。T02已提供完整尺寸、标记、缩放、投影、键盘和触屏交互，落子仍由父级调用T01引擎。
6. 同一坐标源生成屏幕、纸卡和 PPT；所有下游按内容 id@revision 引用，不复制改写题意后沿用旧 revision。
7. src/core/persistence.ts 保留共用 StoragePort 契约；src/core/unified-persistence.ts 是浏览器单一事实源，统一 IndexedDB、旧 localStorage 一次迁移、写入恢复日志、备份与选择性清除。src/core/offline.ts 与 public/sw.js 负责明确准备的离线资源。核心教学不依赖AI API、账号、后端数据库或远程服务。用户另行授权的可选联机页使用同源Node/WebSocket房间服务，只同步该房间的昵称、棋局、动作和连接状态，不上传学习进度、草稿或反馈。

## 当前范围与扩展边界

已交付 T00：六阶段课程文档、规则与教师说明、机器模型和开发样例、校验器、接口类型、最小首页/Board、坐标工具、存储适配层、目录、构建与测试、来源和版本交接。
已交付T01：纯规则引擎、完整历史/重放、面积计算、固定向量/性质测试及独立ESM成品。
已交付T02：共享受控Board、六类原始标记、四种开发示例、响应式/投影/缩放、键盘/触屏及浏览器验收；T04 兼容新增第七种纯显示 `group` 标记。
已交付 T03：学习入口、六阶段自由路线、模块注册、设备内轻量进度和教师视图。
已交付 T04：气实验室、8 个专用开发演示、固定手算向量、圈气/预测反馈、实体双人延伸和浏览器验收。已交付 T05：提子实验室、6 个开发演示、受控四步播放器、取消/撤回、自杀对照与浏览器验收。已交付 T06：自由实验棋盘、编辑历史、规则起点切换、临时保存及共同 schema 导出。已交付 T07：同屏双人吃子小游戏、共同开局设置、首提即时胜负、两停无胜者、双方确认悔棋、最后五手引擎快照回看与交换颜色重开。已交付T08：完整9/13/19路对弈、自由让子、双停确认、面积计分、争议恢复、复盘与可重放保存。合并 A 已交付 T09 的 30 道正式题、6 个终局、内容图示、阅读版答案及内容生成/验证工具。已交付 T10：正式题目录、六种作答、分层提示、已核查变化、未知分支、自由试下及本机 revision 记录。已交付 T11：真/假眼与两个空点对照、填外气、同局面不同先手核查、LIFE 原题复用及证据边界。已交付 T12：DISC A/B/自选讨论、角色轮换、三种合作流程、匿名本机记录和同 ID 线下说明。已交付 T13：END-001–006 终局辨认、区域标记、边界证据、面积拆解、贴目试算和实体操作卡。已交付 T14：教师出题、草稿/发布状态、T01 变化树验证、T10 学生预览、四个开发模板和 JSON 导出。已交付 T15：JSON/SGF 安全预览与显式冲突、SGF 游戏树保留和规则提示、SVG/PNG/A4 PDF 及批量清单。已交付 T16：统一本机保存、旧记录迁移、离线准备、更新等待、完整备份/恢复和选择性清除。已交付 T17：可跳过反馈、实际汇总、资源版本关联、手动 CAS 过程和审核导出。尚未交付 T19–T24 的程序/材料范围。T18实体演示棋盘作为独立材料分支存在，状态以`handoff/T18.md`为准。

## 版本、身份与迁移

项目用语义版本；0.1.0 是首次基线。schemaVersion 是正整数主版本；对封闭 schema 新增字段也要协调新主版本或明确可兼容的既有扩展，不能静默接收。未知主版本拒绝，不自动降级。revision 是内容记录正整数，每次题干、答案、棋形、条件、引用或核查证据变化都递增；id 不因排序、标题或导出格式变化。复制为独立题需新 id。
规则逻辑变更必须新 rulesetId，不能让旧 GO-CLUB-AREA-1 改义。修改共享约定须同时更新 schema、生成类型、校验器、调用方、固定向量、说明和交接；记录旧→新映射、备份、失败恢复与实际测试。T00 没有旧用户数据，迁移要求为“无迁移”；未来不允许把未知历史补成虚构历史。

正式题命名从实际 T09 提示词继承：LIB/CAP/CON/LIFE/AREA/DISC-001–005，共30题；END-001–006 独立计数。课程阶段固定 STAGE-01–06；正式 Lesson 可用 LESSON-001 起。T04/T05 模块专用演示分别使用 DEMO-LIB-001–008 与 DEMO-CAP-001–006，均为 `developmentOnly=true`，不占正式题号。T00 仅用 DEV-*。

## 交接与来源

后续程序任务须显式取得完整 0.17.0 归档及 `handoff/T17.md`；按依赖再读取 T16、T15、FREEZE_B、T14、T10、MERGE_A 与 T09 交接，不能假设共享对话、环境或文件。只读`sources/`不得修改。规则属于用户约定，一般概念借鉴见SOURCES.md；原创文字、DEV/DEMO示例、代码及代码生成棋盘分开标注。ImageGen只作界面设计参考，不作教学棋形依据。

T10 注册为 `puzzle-runner` / `#/challenges`，启动依赖为 `T09-BUNDLE`。只对 structure、moveLegality、solutionChecked 全部通过的正式 Puzzle 开放；未知合法手保持 unknown，DISC 保持 discussion。本机题目记录使用单独 `go-club:puzzle-progress:v1` 键，不覆盖学习路线或内容存储。

T11 注册为 `life-lab` / `#/learn/life`，启动依赖为 LIFE-001–005。专题通过 id/revision 读取正式内容并嵌入 T10 播放器，不建立第二套答案；同布局更换先手时建立各自明确的 fresh setup 并重新验证。`verified-alive`/`verified-dead` 只按具体题目证据解释，合法未覆盖变化保持 unknown。

T12 注册为 `cooperative-challenge` / `#/challenges/together`，启动依赖为 DISC-001–005、CON-001 和 CON-003。页面只从 T09/T10 目录读取精确内容；A/B 展示映射不写回题库，也不把合法性当战略评分。本机多记录使用独立 `go-club:peer-discussions:v1` 键和公共 StoragePort；不上传、不实名、不排名。


T13 注册为 territory-trainer / #/learn/territory，启动依赖 END-001–006。页面只读 T09 fixture；教学假设与真实确认分开，END-006 不生成分数。空区归属和总分来自 T01 scoreArea；连通分组只用于选择与展示边界。贴目试算和区域答案不写回正式内容或对局存档。

每次交接包括任务/基线/结果版本、完整修改清单、实际测试命令与证据、失败和未测项、已知限制、兼容迁移和下一任务文件。无学校审批或 CAS 认可结论。使用本机成果，不自动购买、公开发布或外发。

## T14 兼容扩展

T14 注册为 `teacher-editor / #/teacher/editor`，依赖 `T14-TEMPLATE-BUNDLE`。正式 Puzzle/ContentBundle 继续使用 schemaVersion=1；不完整编辑态只保存在 `LOCAL-T14-WORKSPACE`。T10 兼容读取明确发布的本机题，同 ID 选本机最高 revision。自动检查与作者解答核查、人类复核分开记录。

## T15 兼容扩展

T15 注册为 `file-exchange / #/teacher/file-exchange`。共同 schema 的 `GameState` 在界面称为 GameRecord，不更改序列化 kind。JSON 导入先校验再显式解决冲突；Puzzle 只进入未发布 T14 草稿。SGF 原始树与明确选择的重放路线分开保存，缺失或不同 `RU` 必须确认。JSON 是教学字段权威格式；SGF 导出列出无法表达的终局与教学元数据。存储键 `go-club:file-exchange:v1`，T16 迁移时保持未知版本失败不覆盖语义。

## T17 反馈与证据边界

成员入口 `member-feedback / #/feedback`、教师入口 `evidence-log / #/teacher/evidence` 都已注册，反馈不是参与门槛。`go-club:evidence:v1` 保存活动、共同 Feedback 的包装记录、改进、手动 CAS 过程；数据库主版本不变。测试活动显式 developmentOnly，默认不导出；共享设备答复数不称独立成员数。真实实施与效果由使用者填写，程序不推断。

T17 通过 T14 建立 LOCAL 资源副本和新 revision，不写冻结正式题。草稿和改进原子提交；导出报告只保留版本引用，题目全文快照留在本机及完整备份中。完整备份包含原文；分享前使用可删减的审核报告。模板、测试和真实记录必须继续保持边界。


## ONLINE_PLAY 可选联网扩展 · 2026-10-21

online-play / #/play/online使用既有T01规则、T08终局与悔棋和共享Board/GameTimeline，服务器是房间事实源。各席凭据限制执色，匿名会话不是实名身份验证。数据传输与私有房间存储是独立schemaVersion1扩展，不修改封闭内容模型。模块optional requiresNetwork供离线清单区分；没有服务时给出恢复/同屏入口，不宣称房间可离线运行。APP_VERSION统一为0.20.0，新增精确锁定ws8.22.0/@types/ws8.18.2，原依赖未升级。协议、部署、容量和未测项见docs/online/。这是用户授权的联网范围扩展，不改变原核心离线教学约定或纸面赛规。


## GITHUB_PAGES_SYNC · 0.20.2-pages.1

主线从ONLINE_PLAY 0.20.0-online.1继承。用户明确要求更新原GitHub仓库/Pages网址。共享规则、内容schema、正式题/终局/材料与依赖锁文件保持；仅修复发布兼容：页脚与version.json提供版本、Pages无服务器时不尝试不存在的房间接口、可通过公开VITE_ONLINE_SERVER_URL接入实际HTTPS后台，服务PUBLIC_APP_URL保留邀请路径/weiqi。原本机Node默认同源行为不变。安装在网站中不等于房间服务器已部署；实际发布结果与未测项读handoff/GITHUB_PAGES_SYNC.md。
