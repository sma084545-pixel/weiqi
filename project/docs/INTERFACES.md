---
schemaVersion: 1
id: DOC-INTERFACES
revision: 18
rulesetId: GO-CLUB-AREA-1
---

# 共享接口 · 核心 API 基线 0.7.0 · 项目 0.15.0

可编译类型入口：src/core/rules/contract.ts；内容类型入口：src/core/content.generated.d.ts。T01已实现唯一规则入口src/core/rules/index.ts，同时导出各纯函数及rulesEngine对象；ESM成品为dist-engine/go-club-rules.mjs。后续页面必须依赖同一个RulesEngine适配器。T00已有coordinates、validation、persistence和最小Board。

## 输入不变量与结果

BoardMatrix=readonly (readonly (B|W|null)[])[]，完整size×size，size只允许5/9/13/19。坐标左上(0,0)，row向下、col向右；显示列ABCDEFGHJKLMNOPQRST、行size−row。所有集合输出按row再col升序排列，无重复，保证渲染、序列化、测试一致。调用者交付经结构及规则校验的状态；未知外部对象必须先validateContent，再按用途validateSetup或restoreGame。

Result<T>={ok:true,value:T}|{ok:false,error:{code,at?,field?}}；错误码稳定，中文显示从errors.zh.ts独立取得，不从英文异常猜原因。纯计算无副作用，成功事件返回递归冻结的新状态，失败不返回半更新状态；setKomi同值时返回原引用。不得直接改状态字段。Group={color,stones}；Trial={nextState,event}；event含before/after完整盘面、placed或null、captured坐标、libertiesBefore/After。对place，两组气分别指原落点正交相邻的己方块气之并集，以及最终新子块的气；pass/resign的两组气均空。捕获事件由引擎给，界面不得另算。T01每个event另附groupsBefore/groupsAfter：前后全部棋块，含color、stones、liberties和isAtari；它们在兼容类型中可选，但本引擎始终提供。GroupStatus=Group & {liberties:Coord[],isAtari:boolean}，isAtari仅指恰好一气。

## 签名与精确语义

| 接口 | 参数→返回 | 行为 |
|---|---|---|
| getAtariGroups | (board)→Result<GroupStatus[]> | 只列一气棋块，每块含全部棋子及唯一气；不推断能否最终存活 |
| getGroup | (board,at)→Result<Group\|null> | 越界报错；空点为null；返回同色正交最大块 |
| getLiberties | (board,at)→Result<Coord[]> | 越界报错；空点为空数组；与getGroup共享同一块遍历，对该块全部邻空去重排序 |
| tryMove | (state,{type:place,color,at})→Result<Trial> | 执行R2完整顺序；只返回候选，不修改state或自动提交；候选含正确undo/redo历史 |
| applyPass | (state,color)→Result<Trial> | playing且轮次正确；不做超级劫检查，保留历史，完整对弈两停进scoring；小游戏两停无胜者结束 |
| resign | (state,color)→Result<Trial> | playing且轮次正确；对方胜，记resign，保留棋盘/轮次/提子数/布局历史 |
| undo / redo | (state)→Result<GameState> | 恢复完整快照，包含历史、动作路径、计数、phase与lastMove，不只是还原一颗子 |
| validateSetup | (position)→Result<SetupValidation> | 检查尺寸、重复占点、坐标/值、toPlay、所有块有气。fresh-setup输出position、rootLayout及UNKNOWN_PAST_HISTORY提示；recorded不能以此丢弃历史 |
| startGame | (position,{mode,komi,gameId})→Result<GameState> | 只从fresh-setup经验证建新根；recorded起点返回HISTORY_REQUIRED，须restoreGame或用户明示另建起点。gameId为新稳定ID；revision=1；计数/栈归零；full-game使用有限komi，capture-first须0 |
| resumePlay | (state,requestedBy)→Result<GameState> | 仅full-game且scoring；保留棋盘、toPlay、history、lastMove；passes归零，清除agreement/result，追加resume事件 |
| confirmScore | (state,agreement)→Result<GameState> | 仅full-game且scoring；双方确认同一完整死子块与中立点；计算副本后finished，原board不变；追加confirm-score事件 |
| scoreArea | ({board,komi,agreement,basis,assumptions,confirmation?})→Result<AreaScore> | 无副作用；移除deadStones后按R5划区；不加提子数。confirmed还须匹配且可重放的confirmation对局处于两停后的scoring或已area结束；否则降为preview。teaching-assumption须非空假设；preview永远标预览 |
| setKomi | (state,komi)→Result<GameState> | 开局已锁值；不同值KOMI_LOCKED，同值原样返回，不新建事件 |
| serializeGame | (state)→Result<string> | 验证来源状态，输出完整schema v1 JSON（含撤回/重做）；大于64,000,000 UTF-8字节返回EXPORT_TOO_LARGE |
| restoreGame | (serialized:unknown)→Result<GameState> | 结构校验→合法fresh setup→按moves的GameEvent重放→比对所有缓存及撤回/重做路径；不信任输入赢家和提子数，冲突IMPORT_MISMATCH |

ScoreAgreement={deadStones,neutralPoints,confirmedBy}；deadStones为原盘真实棋子完整块集合，不能只标半块或空点。neutralPoints按移除死子后的完整空区核对；不能任意强改归属。confirmedBy=[]是草稿，[B]/[W]尚未双方确认；确认操作需两者。标记变动须先清空已确认方。ScoreRequest没有captures参数，因此提子不能二次加分。
AreaScore含blackStones、whiteStones、blackTerritory、whiteTerritory、neutralPoints、komi、blackTotal、whiteTotal、difference、winner(B/W/draw)、basis。即使preview返回数值及按假設算出的winner字段，调用方也只可标“预览差值”，不可发布最终胜负。confirmed要求完整对弈状态可重放、连续停手2、原盘/贴目匹配且双方标记同意；如已经area结束，还须标记与已存agreement一致。它仍不证明人类真的点击过，也不是自动死活判定；未终局示例expectedScore=null。computeArea是内部算法，调用方仅用公开scoreArea/confirmScore。

## 历史生成、提交、撤回与序列化

Position的fresh-setup存history=null，意思是尚未创建合法对局历史；startGame通过验证后用rootLayout建立GameState.history.layouts=[rootLayout]。recorded Position的layouts包含其明确已知教学/对局起点和每次落子后布局，不包含pass重复项，末项等于当前盘面。完整布局键由layoutKey生成：`${N}|${逐行N²个.BW}`；不含toPlay、phase等。对起点以前的未知历史不作断言。

GameState.setup是固定起点；mode、size、komi开局锁定。moves是当前路径全部GameEvent：place/pass/resign三个对弈动作，以及resume/confirm-score两个管理事件；管理事件不是Move，动画与棋谱落子编号必须过滤它们。setup操作永不混入此数组。captures.B计黑方提走的白子数，captures.W相反。phase=playing/scoring/finished；lastMove只记最后一个place/pass/resign，管理事件不改它。

初始moves=[]、captures={B:0,W:0}、consecutivePasses=0、phase=playing、lastMove=null、agreement=null、result=null、undoStack=[]、redoStack=[]。每次成功事件把当前GameSnapshot压到undoStack，清空redoStack，生成下一快照。GameSnapshot包含size、board、toPlay、history、moves、captures、consecutivePasses、phase、komi、lastMove、agreement、result，不递归包含栈，避免无限嵌套。
undo取undoStack末项为current，并把原current压到redoStack；redo取redoStack末项为current并把原current压到undoStack。保持原有setup/mode/id；未来布局只在redo快照里，不参与当前超级劫。成功创建新分支才清redo，拒绝不清。每次提交、撤回、重做保存新内容版本时revision递增；它是审计版本，不属于须回退的棋局变量。

JSON使用数组保存布局列表与快照，不序列化Set/Map/函数。完整字符串比较，不使用未防碰撞哈希。布局列表不够证明着法历史，restoreGame必须用起点+events核查；可从合法事件重新生成stack并比对输入。revision不用于证明历史。size/komi缓存与起点配置冲突拒绝，不“修好”后假称原文件可信。

试下示意流程：保存base=当前不可变state引用→tryMove(base,move)→展示event→提交前确认当前仍为base，否则丢弃候选重算/STALE_TRIAL→设置nextState。试下不调用persistence.save；无效结果只显示中文说明。撤销预览只丢弃候选；撤回对局才调用undo。未来复杂控制器可用明确状态token，但不可把只有棋盘layoutKey当完整并发token，因为pass也会改变轮次。

## Board受控组件

T02已实现完整 `BoardProps`，定义见 `src/core/rules/contract.ts`，并从 `src/components/board.types.ts` 重导出。必填项为 `size、board、label、selected、onSelect`；可选项为 `mode、disabled、onPlay、focusPoint、onFocusChange、markers、unavailablePoints、showCoordinates、displayMode、zoom、resetViewKey`。精确类型、默认值和示例见 `docs/t02/BOARD_USAGE.md`。

`mode=readonly/select/play/mark`。Board只报告意图：select/mark调用onSelect；play只在空且未禁用的点调用onPlay；readonly不调用。它不自行落子、轮换、求气、提子、计分、读写存储或推断合法性。play控制器仍须调用本页 `tryMove`，动画使用返回event，提交使用nextState。selected和可选focusPoint均由父级控制；组件只保留未受控的键盘漫游位置。

`BoardMarker={markerId,kind,at,label?,number?,owner?}`；kind 为 ownership/candidate/liberty/group/target/last-move/sequence。T04 兼容新增的 `group` 仅以双线轮廓显示整块选择，不改变棋盘、合法性或内容 Marker schema。标记只是视图模型，内容 Marker 须由功能控制器转换。超界标记忽略并显示可读提示；区域标记不调用 scoreArea。叠放顺序、灰度表达和安全渲染见使用文档。

全盘grid含size²原生button交点，SVG线层严格为size条横线和size条竖线。焦点单入口，方向键在真实边界停止，Home/End到当前行首/尾；Enter/Space走原生按钮激活。每点读出显示坐标、黑/白/空、只读/可选/可落/占用/不可用及标记。小屏标准每点下限32px，投影40px；大棋盘由board-viewport局部滚动，zoom夹在0.75–1.5，resetViewKey复位滚动。悬停预览只在hover+fine设备出现，触屏只依赖轻触；reduce时取消过渡。

## 校验与存储入口

validateContent(unknown)→ValidationResult；parseContent(string,{maxBytes?})默认先检查2,000,000字节上限、JSON.parse再校验。成功为{ok:true,value,level:structural,needsRulesReplay}，失败为{ok:false,issues:[{code,path,message}]}。它不调用规则引擎、不修改validation审核字段。错误如SCHEMA_VERSION、COORD_BOUNDS、DUPLICATE_POINT见实际负例；稳定规则错误与结构错误分别管理。
createContentStore(StoragePort,{maxBytes?})返回save(document)、load(id)、remove(id)。StoragePort=getItem/setItem/removeItem；key为go-club:v1:${id}。save先校验并确认同一配置的读取上限（默认2MB）再单次写入；load先解析再返回document及needsRulesReplay，不执行脚本或获取URL。错误返回STORAGE_UNAVAILABLE，损坏文件不自动删。browserContentStore 从 T16 安装的统一浏览器端口读取；单元环境未初始化时才使用兼容回退。

createVerifiedGameStore(StoragePort)提供save(GameState)、load(id)、remove(id)，复用上述同一存储服务和key，配置64,000,000字节，并在写入前、读出后通过restoreGame重放。普通内容服务仍只做结构校验且默认2MB。64MB是本引擎解析处理上限，不是浏览器可用配额承诺；配额错误保留旧记录并返回STORAGE_UNAVAILABLE。T16 的浏览器端口先更新内存镜像与单一写入恢复日志，再异步提交 IndexedDB；日志在成功后清除，刷新时只重放未提交项。

## T16 统一本机存储与离线接口

T17 的公共兼容扩展：`commitLocalValues(values: Record<string,string>): Promise<void>` 先等待既有写入，再在一个 IndexedDB readwrite 事务提交多条记录；失败时显式 abort，内存镜像只在事务完成后更新。用于同时提交 `go-club:evidence:v1` 和 `go-club:teacher-drafts:v1`。不在页面另建数据库或事实源。新增 `LocalNamespace='evidence'` 与 `CLEAR_GROUPS.evidence`，旧键和数据库主版本 1 不变；旧版程序不能导入含新分区的备份，必须使用 0.17.0 或更高版本。

`initializeBrowserPersistence()` 在 React 启动前打开 `go-club-local` IndexedDB 主版本 1。`browserStoragePort()` 继续满足既有同步 StoragePort，因此 T03、T06、T08、T10、T12、T14、T15 不各写一套数据库逻辑。命名空间为 progress、attempts、games、drafts、settings、exchange、discussions、positions、evidence、other；记录同时保存 storage schemaVersion、contentId/contentRevision 与 updatedAt。

首次初始化把旧 `go-club:*` localStorage 记录和迁移标记放在同一事务，事务完成后才删除旧键；失败保留原键。`exportLocalBackup()` 在等待未完成写入后生成 `LocalBackup` 主版本 1；`validateLocalBackup()` 拒绝未知主版本、外部键、重复键、超限记录；`restoreLocalBackup()` 在一个事务内清空并恢复，失败回滚。`clearLocalGroup(group)` 只清对应命名空间，不触及应用内正式题库。

`initializeOfflineSupport()` 只在安全上下文注册 `public/sw.js`；localhost 可用于本机准备，公开部署应使用 HTTPS。`prepareOffline()` 读取构建生成的 `offline-assets.json`，由 Service Worker 逐项获取并在全部成功后写入 ready 状态。`applyWaitingUpdate()` 先 `flushPersistence()`，再要求等待中的 worker 接管；没有等待版本时不刷新。`file://`、未缓存首次断网和缓存失败均返回明确状态，不写假成功。

## T17 内容与反馈接口

独立 `schemas/t17-evidence.schema.json` 引用共同 schema 的 Feedback 和 Puzzle 定义，不扩展封闭的 ContentDocument 联合。`EvidenceWorkspace` 的 kind 为 T17Workspace；审核报告为 T17EvidenceReport。所有独立记录带 schemaVersion=1、id、revision、rulesetId；资源与活动引用精确指定版本。`validateEvidence(unknown)` 返回 `{ok:true,value}` 或 `{ok:false,message}`，核查结构、日期、引用、测试标志、选项与实施/观察约束，错误指出字段。损坏数据停止写入并保留原数据。

`makeFeedback(activity,token,difficulty,preferred,comment,consent,issue?,resourceRef?)` 包装共同 Feedback；`addFeedback` 按本份 token 派生 ID 去重，不识别人。`summarize(entries)` 返回 total、difficulty、preferred、missingComment；各项分母均为总答复数，缺失单列。`stageResourceRevision(workspace,item,drafts)` 返回待提交 workspace/drafts/entry；通过 T14 copyAsNew/createRevision，正式题生成新 LOCAL id，本机资源递增 revision，保留前后快照、清空旧验证、保持未发布。

`reviewedReport(workspace,includeTests=false)` 返回独立副本，默认排除开发例和未 consentToUse 的答复，移除题目全文快照，只留 beforeRef/afterRef。页面删减副本自由文本后用 `reportMarkdown` 或 JSON 下载；`printReport` 只使用 textContent 创建 A4 报告窗口。导出不上传；完整 T16 备份保留原文及快照。详细约束见 docs/t17/MODEL_AND_PRIVACY.md。

## 重放审计及兼容扩展（0.1.0 → 0.2.0）

restoreGame接受JSON字符串或对象，先JSON标准化并检查大小/结构。按setup和首个undo快照的komi建立根；所有快照komi必须相同。当前undoStack长度须等于moves长度，每个undo快照须等于重放该事件前的完整状态；重放后逐字段比较当前快照。redoStack从末项向前核查：每项恰好延伸一个事件且共享当前事件前缀，再重放并比较。任一缓存/路径冲突拒绝并给JSON Pointer字段；不默默修正。有效引擎输出递归冻结并以WeakSet缓存“已重放”状态；外部对象永不凭标记跳过核查。

revision是安全正整数，成功动作/撤回/重做递增，但不用于证明真实历史或参与者。文件完全自洽地改写全部合法棋谱或根配置，无法仅凭本机JSON发现其原作者；本引擎验证规则一致性，不提供签名、身份或学校活动真实性证明。schemaVersion=1和rulesetId不变；schema及生成类型字节未改，T00的合法空局示例仍可恢复。

最小扩展：ScoreRequest增加可选confirmation，修正只有确认标签却缺少终局状态证据的契约缺口；旧调用可以继续运行，但缺证据的confirmed请求降为preview。新增GroupStatus/getAtariGroups、事件可选组明细、setKomi/serializeGame和经过重放的存储包装。错误新增INVALID_BOARD、INVALID_ARGUMENT、EXPORT_TOO_LARGE，中文见errors.zh.ts。已有T00首页/Board未调用规则函数，无UI调用方需要迁移；未来计分调用方必须传confirmation或调用confirmScore。

底层测试入口src/core/rules/placement.ts的evaluatePlacement({board,toPlay,history},place)返回Result<{board,layout,event}>，是tryMove使用的同一落子核。它只核查布局历史编码/末项/唯一性，不证明上下文来自真实着法，不能代替restoreGame。显式注入长历史的开发测试只用此入口；它不作为对局启动器导出到公共index。

## T03模块注册与学习进度

T03视图接口位于`src/features/learning-hub/types.ts`。`ModuleRegistration={id,route,label,requiredContentIds,availability,returnRoute,trackVisit}`；id和route必须唯一，route采用静态托管可用的`#/${string}`。`createModuleRegistry(definitions,contentIds)`返回`resolve(route)`和`getById(id)`。解析结果显式区分`not-found`、`not-installed`、`missing-content`，失败均含可用fallbackRoute；首页只把成功解析的模块渲染为启动链接。

T04 已按注册表接入 `liberty-lab` / `#/learn/liberties`，启动依赖为 `DEMO-LIB-001`–`008`；T05 已接入 `capture-lab` / `#/learn/captures`，启动依赖为 `DEMO-CAP-001`–`006`；T06 已接入 `experiment-board` / `#/board/experiment`；T07 已接入 `capture-game` / `#/play/partner`；T08已接入`full-game` / `#/play/full-game`。T06–T08不依赖正式题目。任一必需内容缺失即返回对应阶段的missing-content恢复。T09–T15继续按同一流程接入：模块代码和必需内容齐全后才把availability设为available。requiredContentIds是启动依赖，不是完成条件；returnRoute不能指向planned模块。

## T08 完整对弈控制与存档

`src/features/full-game/model.ts`定义`FullGameSetup`、`FullGameMatch`及纯控制函数。setup只允许9/13/19，空盘toPlay=B，自由让子全为黑子且toPlay=W；`startFullGame`先validateSetup再startGame(full-game)。`playAt/passTurn/resignGame/resumeDisputedPlay/confirmUndo`分别委托公开规则接口。`toggleDeadGroup`只用getGroup切换完整块；`scorePreview`只返回preview；`confirmScoreFor`按B后W组装引擎返回的完整中立点清单，再调用confirmScore。页面不得把UI scoring草稿写成棋盘或布局历史。

`createFullGameReview(GameState)`返回根局面及每个GameEvent后的只读帧；它不提供落子提交。`createFullGameStore(StoragePort)`固定保存T08 GameState并复用createVerifiedGameStore；`fullGameJson`提供T15可读取的schema v1 JSON。T08没有SGF编码接口，T15必须从经过restoreGame的GameState转换，不信任外部缓存。

## T09 内容与判题边界

合并 A 的统一内容入口是 `content/t09/bundle.json`，其中只包含共同 schema 的 30 个 `Puzzle` 与 6 个 `TerminalFixture`。教学补充位于 `content/t09/pedagogy.json`，不作为 `ContentDocument` 导入。正式题与终局的独立 JSON 必须和 bundle 中相同 ID/revision 的对象完全一致。

`content/tools/grade.mjs` 是 T10 可复用的纯内容判题适配器：只对已核查且已覆盖的答案作结论；合法但变化树未覆盖的着法返回 `unknown`，DISC 返回 `discussion`，无效输入返回 `invalid` 且不改变内容或对局状态。所有着法合法性仍委托 `dist-engine/go-club-rules.mjs`，不得在页面复制规则。

## T07 同屏吃子小游戏控制接口

`src/features/capture-game/model.ts` 是页面与规则引擎之间的纯控制层。`createCaptureMatch` 建立默认9路、黑先、贴目0的 `capture-first` 状态；`configureMatch` 只在开局前改变5/9路与显示气选择；`beginRound` 记录双方已共同确认。`playAt` 和 `passTurn` 分别只委托 `tryMove`、`applyPass`，失败返回稳定错误且不替换原状态；T01 在首次提子同一状态转移内写入 `first-capture` 结果。

悔棋使用 `requestUndo → confirmUndo(B) → confirmUndo(W)`。前两步只记录同屏确认，不改 GameState；第二次确认后调用一次 T01 `undo`。`refuseUndo` 只关闭申请，`restartRound` 建立新的空盘和单一初始布局，并可交换伙伴A/B所执颜色。伙伴标识是界面座位约定，不是账号或身份认证。

`createMoveReview(game,5)` 从 `moves`、`undoStack` 和当前盘面恢复最后最多5个“该手之后”快照；播放只改变显示索引。`winningExplanation` 读取 T01 `TransitionEvent.groupsBefore/placed/captured`，不重新推算胜负或捕获。显示气使用共享 `getGroup/getLiberties`，并按坐标去重为 Board 标记。

`createLearningProgressStore(StoragePort)`沿用同一公共存储端口，固定键`go-club:learning-progress:v1`。`LearningProgress`带schemaVersion=1、稳定id、revision、rulesetId，只含visitedModuleIds、stageMarks和recentModuleId。load在刷新后的新实例恢复记录；损坏/未知版本不删除原值；save/clear返回结构化结果。clear只删此键，不匹配或遍历`go-club:v1:*`内容键。

浏览器页面没有账户、网络上传、排名、解锁或强制通关。T16 已在保留上述端口和失败不覆写语义下统一迁移；字段或主版本变化仍需要明示迁移。完整调用与接入示例见`docs/t03/MODULE_REGISTRY.md`、`PROGRESS_STORAGE.md`和`docs/t16/STORAGE_AND_MIGRATION.md`。

## T04 气实验室控制器

`LibertyLab` 只把 Board 的选点意图转给 T01：棋子点调用 `rulesEngine.getGroup(board, at)` 取得整块，答案调用 `rulesEngine.getLiberties(board, at)` 取得去重气集合。页面不得从 DOM、标记或相邻格自行重算。`Board` 仍不持有答案或修改盘面。

`evaluateLibertySet(expected, selected)` 返回 `{correct,missing,extra,duplicates}`，按 `(row,col)` 集合比较且不接受重复提交；`evaluateLibertyCount(expected, raw)` 区分 `EMPTY_PREDICTION`、`NEGATIVE_PREDICTION`、`NON_INTEGER_PREDICTION`，有效预测返回原因说明。二者是活动评测，不是对弈规则接口，也不判断棋力。

`LibertyDemo={id,title,puzzle,phases}` 是对既有 schema v1 Puzzle 的只读运行适配。正式保存来源仍是 `content/t04/liberty-demos.json` 的 ContentBundle；运行时递归冻结。普通演示 phase 从 `initialPosition` 建盘；008 的 after phase 明示只增加连接黑子并保持观察性质，不产生 Move 或历史。页面换演示、换 phase、重试或重置会丢弃临时回答。

封题语义：`revealed=false` 时不创建 liberty 标记、答案数量、答案坐标、教师说明或带答案的可访问标签；只有自由观察主动显示或有效评测提交后才设为 true。无效数字输入不揭示。

## T05 提子实验室控制器

`CaptureLab` 调用 `startGame(fresh-setup)` 建立当前演示，再以 `tryMove(base, place)` 获取只读 `Trial`。候选合法并不提交；学生须提交目标点集或明确 `explicitNone=true`。`evaluateCapturePrediction` 只比较预测与 `trial.event.captured`，不决定合法性。

`createCaptureFrames(trial,color,size)` 固定产生四帧：临时落子、读取 `groupsBefore` 检查相邻对方气、使用 `event.after/captured` 显示移除、使用 `event.after/libertiesAfter` 显示最终己方气。临时帧不进入 moves/history。`StepPlayer` 是受控组件，父级提供 step/playing；它每次最多建立一个定时器，并在暂停、换帧、卸载或路由离开时清除。第四帧通过幂等回调一次提交 `trial.nextState`；减少动画把 step 设为末帧。

演示期间 Board `disabled=true`，不能接受第二手。撤回使用公开 `undo` 恢复完整动画前状态；重置或换题重新从相同 Position 建立 fresh history。规则错误直接映射 `RULE_ERROR_ZH`；非法试下不改 state。吃子小游戏现为 available，提子实验室的后续链接直接进入其稳定地址；互动棋盘练习继续可用。

## T06 自由实验棋盘

`SetupSnapshot={size,board,toPlay,markers}`；`SetupEditor={current,undoStack,redoStack,revision}`。`applyPointTool`、`clearSetup`、`setSetupTurn`、`resizeSetup`、`undoEdit`、`redoEdit` 都返回新编辑器；成功新编辑压入完整摆棋快照并清 redo。摆棋工具只编辑值和标记，不调用合法落子或自动提子。`resizeLoss(snapshot,size)` 在提交前给出裁切棋子/标记数。

`diagnoseSetup(snapshot)` 调用 T01 `validateSetup`；无气块定位再调用 `getGroup`，不另写气算法。`enterRules(editor,{toPlay,komi,practiceMode,confirmedFreshStart})` 只有在明示确认、有限贴目和 setup 合法时才建立规则模式。它先生成 `historyPolicy=fresh-setup,history=null` 的 Position，再调用 `startGame`，因此 GameState 布局历史只有明确根布局。`rulePlace/rulePass/ruleUndo/ruleRedo/ruleResume` 分别委托 T01。`returnToSetup` 把当前规则盘面写成 source editor 的一次可撤回编辑，不保留或伪称旧 moves/history 仍适用于后续编辑。

`positionJson` 导出共同 Position；`bundleJson` 生成 Position 加独立 MarkerDocument 的 ContentBundle。`restoreExperiment` 必须先通过共同校验器，再要求恰好一份 Position、同尺寸单点 target/sequence 标记和严格“数字 N”标签。因为 schemaVersion=1 的 Position 是封闭模型且无 marker 字段，单独 Position 不承诺保留标记；完整往返使用 ContentBundle。设备保存继续使用 `browserContentStore` 与 ID `LOCAL-T06-WORKSPACE`。

## T10 互动判题接口

`createCatalog(bundle,teaching)` 返回 `CatalogItem[]`，逐题区分 available、development、unverified、unsupported、malformed。`inspectPuzzle` 不把结构存在等同于已发布；只有 structure、moveLegality、solutionChecked 全部 passed 的 schema v1 正式题可打开。题目目录的统一运行入口是 `PUZZLE_CATALOG`。

`gradeStaticAnswer(Puzzle,Response)` 分派 number、point-set、region-labels、reason-choice、open-text。它只比较内容答案结构；open-text 固定返回 discussion。`initialPuzzleState`、`gradeTreeMove`、`applyAuthoredReply` 直接委托 T01；`GradeResult.verdict` 为 success、failure、illegal、unknown、discussion、invalid、continue。落子树未覆盖的合法手固定 unknown；调用方不得改成 failure。

`createPuzzleProgressStore(StoragePort)` 使用 `go-club:puzzle-progress:v1`。记录顶层带 schemaVersion=1、稳定 id、revision、rulesetId；尝试键为 `${id}@${revision}`，只保存次数、提示层级、最后 verdict 和本机完成标记。未知和非法不会自动成为完成；题目 revision 改变时旧完成记录不匹配。读取失败或未知主版本不删除外部原文，写入失败不覆写旧值。

## T11 眼与基础死活专题接口

`LIFE_REFERENCES` 固定暴露 LIFE-001–005 的 exact `id + revision`；`LIFE_SCENARIOS` 只描述教学候选点、轮次、预期合法性与解释。`runLifeScenario` 从题目 Position 明确建立 `fresh-setup`，再调用 T01 `startGame/tryMove`；页面不自行判断自杀或提子。`createOuterLibertyFrames` 生成只读演示 Position，并逐帧调用 `getLiberties`，不进入真实对局历史。

`PuzzleRunner({initialSelectedId?})` 是向后兼容扩展：未提供时行为与 T10 相同；提供有效 LIFE ID 时按现有目录与判题器打开该题。T11 不复制 hints、answer tree、terminal evidence 或 progress；无效/未发布内容仍由 T10 的 fail-closed 检查处理。

## T12 同伴合作挑战接口

`activityPuzzle(kind,discId)` 与 `activityCandidates(kind,discId)` 从 T09/T10 当前已发布目录取得 DISC-001–005、CON-003 或 CON-001；展示候选的 place/pass 动作先由 `checkCandidate` 建 fresh setup 并委托 T01 `tryMove/applyPass`。成功只表示当前明确起点合法，不是战略评分；正式 DISC 仍按 T10 `discussion` 语义运行。

`DiscussionDraft` 保存屏幕上匿名角色、目标、理由、可能回应、复述和共同修订；`swapRoles` 只交换匿名角色，保留全部回答。`inspectDraft` 只报告字段是否填写以及参与者是否自行勾选同伴机会，不能证明观点质量或真实合作。

`createDiscussionStore(StoragePort)` 固定键 `go-club:peer-discussions:v1`，提供 `load/save/removeRecord`。集合和记录带 schemaVersion=1、稳定本机 ID、revision、rulesetId、精确 `contentRef{id,revision}`；最多 200 条且 ID 唯一。损坏、未知版本或写入失败不删除或覆写旧值。T16 扩展迁移时须保留这一失败不覆盖语义。

## T13 围地与终局练习接口

END_FIXTURES 从 content/t09/bundle.json 只读取得 END-001–END-006。terminalDecision(fixture,decision) 先检查 authored status：teaching-assumption 只接受教学试算，unsettled 只接受继续对弈或先处理争议；它不计算死活或赢家。

verifiedFixtureScore(fixture,komi?) 对非争议 fixture 委托公开 scoreArea，使用原 board、agreement、assumptions 和 basis=teaching-assumption；争议 fixture 返回 null。regionEvidence 只把移除题面明确死子后的空点按正交相邻分组，并列出接触的棋色和真实棋盘边；区域 owner 必须从 scoreArea 的点集合读取，不得由页面边界代码生成另一套计分。

PointLabels 是当前交互状态，不进入正式 ContentBundle。labelPoint 支持单点或整连通区；commitLabels/undoLabels 保存只属于当前题的编辑快照。gradeRegions 返回 correct/missing/mixed/wrong 与逐区边界说明。切题、重试和切路由必须清空临时标签，不能写回 END fixture。

贴目试算不存储：仅以新 komi 重新调用 verifiedFixtureScore。正式 fixture、对局存档和 T08 状态均不改变。提子对比字段只作显示，ScoreRequest 仍没有 captures 参数。


## T14 教师编辑接口

`src/features/teacher-editor/model.ts` 暴露 `blankDraft`、`draftFromPuzzle`、`copyAsNew`、`createRevision`、`changeAnswerType`、`setStone`、`toggleTarget`、`treeStateAt`、`addTreeMove`、`checkDraft`、`applyCheckResults`、`publishDraft`、`saveEntry`、`setDeleted`、`exportPuzzle` 和 `exportBundle`。变化树状态只由 T01 `startGame/tryMove/applyPass` 从 fresh setup 重放，调用失败返回结构化结果且不改输入。

`createDraftStore(StoragePort)` 使用 `go-club:teacher-drafts:v1` 保存 `DraftWorkspace`；未知主版本和破损记录返回恢复说明且不覆盖原值。`publishedDraftItems(StoragePort)` 只暴露明确发布且非 development 的本机题。T10 合并目录时同 ID 只采用本机最高 revision。正式导出继续通过共享 `validateContent` 校验；没有新增 schema 主版本。

## T15 文件交换接口

`previewJsonImport(text, filename, limits)` 先执行字节、深度、文档数、共同 schema 与跨字段校验，再对 GameState 和 Puzzle 变化树调用 T01 重放。返回 `JsonImportPreview`，不写存储。`commitJsonImport(preview, resolutions, library)` 仅接受无错误预览和每个冲突的显式 `skip/replace/keep-copy`；返回新的不可变 `ExchangeLibrary`。界面把 GameState 称为 GameRecord，但序列化 kind 不变。

`previewSgf` 解析 SGF Collection/GameTree/Sequence/Node/Property；`listSgfLines` 只列根到叶路线；`materializeSgfLine` 把明确选择的路线从根 setup 用 T01 重放为 GameState。`serializeSgfTree` 保留树和属性；`serializeGameToSgf` 只表达 SGF 子集并返回教学/终局字段损失警告。缺失或冲突 `RU` 需要调用方显式同意，非根 setup/PL 不得继续冒称完整棋谱。

`diagramSource` 把 Position、Puzzle 或 GameState 投影为图形源；`svgForDiagram`、`pngForSvg`、`pdfForDiagram` 和 `batchDiagramZip` 共用 `DiagramOptions`。题面/答案预设、坐标、目标、最后一手、顺序、裁切和打印宽度由调用方控制；批量清单记录稳定 ID/revision。`createExchangeStore(StoragePort)` 使用 `go-club:file-exchange:v1`，未知版本和损坏记录失败不覆盖。


## ONLINE_PLAY 联机接口 v1

稳定模块online-play / #/play/online；注册项兼容增加requiresNetwork?:boolean，缺省false。APP_VERSION来自src/core/version.ts，原导出位置继续可用。src/features/online-game/protocol.ts定义独立传输类型、严格意图校验和引擎重放，详见docs/online/PROTOCOL.md；不改共同内容schema或rulesEngine接口。

server/rooms.ts的RoomHub维护单进程顺序事务，RoomRepository.load/save异步原子保存紧凑事件路径。createOnlineServer提供同源HTTP/WebSocket服务，可注入保存失败测试。客户端OnlineClient接收校验后的PublicRoom并重放为只读GameState，只有本人席位可以提交动作；输入颜色不受信任。公开state中无座位凭据。

棋局回看只改本页光标；本机GameState导出用serializeGame，不导出私有会话。真正悔棋由各自执色确认，终局按T08清单双方确认，争议恢复完整历史；所有盘面计算委托既有引擎。详见ONLINE_PLAY交接及server.test.ts的独立预期。


## GitHub Pages发布兼容

onlineConnectionConfig(pageAddress,serverOrigin?)返回{endpoint,message}，纯函数、不发请求。Pages且未配置服务器时endpoint=null并提供恢复说明；配置HTTPS公网房间源后使用该源/api/online/ws，HTTPS前端拒绝不安全HTTP后台/凭据/查询参数/路径。OnlineGame只在endpoint存在时建立原OnlineClient，其他状态和引擎接口不变。PUBLIC_ORIGIN仍校验前端源；新增PUBLIC_APP_URL只决定邀请页面的完整URL，支持/weiqi子路径。version.json带共同顶层身份和实际程序版本，不表示已部署后台。


## ONLINE_PLAY_TOOLS 兼容扩展

聊天能力协商、独立瞬时消息类型和窗口受控展示接口见[详细约定](online-tools/INTERFACES.md)。protocolVersion=1/内容schemaVersion=1保持；不混入GameState或面积计分。
