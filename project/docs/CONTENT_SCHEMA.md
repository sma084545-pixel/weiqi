---
schemaVersion: 1
id: DOC-CONTENT-SCHEMA
revision: 5
rulesetId: GO-CLUB-AREA-1
---

# 内容模型 · schemaVersion 1

标准 JSON Schema draft-07：schemas/content.schema.json，根oneOf为独立内容文档，$defs可复用。机器入口src/core/validation.ts；TypeScript类型由此schema生成，不另维护一套字段。scripts/build-schema.py是可复现schema生成源；修改它后重新生成JSON与类型。

## 身份、版本与坐标

独立保存/导出的Position、Move文档、GameState、Marker文档、Setup文档、Lesson、Puzzle、TerminalFixture、Feedback、ContentBundle均必须带schemaVersion=1、稳定id、revision≥1、rulesetId=GO-CLUB-AREA-1及kind。嵌套Position也是可独立引用的内容，因此保留身份；Coord、Stone、嵌套Move、Marker、历史快照和答案节点不是独立文档，不重复顶层字段。独立技术清单用各自kind及相同身份字段；Markdown用front matter；软件package/lock、PNG、标准schema本身遵循自身格式，由交接清单记录版本。

row、col为整数，左上(0,0)，row向下、col向右；有效0≤row,col<size。显示列ABCDEFGHJKLMNOPQRST，行size−row。5路(0,0)=A5；9路(0,8)=J9；19路(0,18)=T19；不允许I列。棋子值B/W/null；稀疏Stone={row,col,color:B|W}不能存null，省略点表示空。棋盘矩阵Board=StoneValue[][]须为size×size，null表示空。不得混用字符串坐标、SGF坐标或翻转图像坐标。

## 主要类型

| 类型 | 必填结构及语义 |
|---|---|
| Position | size∈5/9/13/19；stones无重复占点；toPlay=B/W；historyPolicy=fresh-setup或recorded；history字段必须存在。fresh-setup为null；recorded为{layouts:[完整布局编码…]}，含当前有效路径起点及每次落子后布局，最后一个为当前布局。初始历史来源不能靠标记伪造 |
| Move（嵌套） | {type:place,color,at} 或 {type:pass,color} 或 {type:resign,color}。单独保存时包为kind:Move、size、move及身份字段 |
| SetupOperation | {type:setup-set,at,color} 或 {type:setup-erase,at}。独立文档kind:Setup含size、operations；编辑动作绝不进入Move联合类型 |
| GameState | 身份、size、setup:Position、mode、board、toPlay、history、moves、captures:{B,W}、consecutivePasses、phase、komi、lastMove、agreement、result、undoStack、redoStack。setup固定为fresh-setup；当前/撤回/重做快照含完整运行字段。moves内为GameEvent，见INTERFACES |
| Marker | markerId、type、points、label、owner。type=target/liberty/last-move/sequence/annotation/ownership；owner=B/W/neutral/null。独立保存包为kind:Marker、size、marker及身份。目标点必须有棋子；全连通块语义留给规则引擎 |
| Lesson | developmentOnly、stage=1…6、title、objectives、prerequisites、activity、readinessObservations、beginnerRoute、experiencedRoute、contentRefs、sources、validation。前置概念不代表参与权限 |
| Puzzle | developmentOnly、category=LIB/CAP/CON/LIFE/AREA/DISC、difficulty:{level,rationale}、prompt、initialPosition、targetMarkers、firstPlayer、conditions、hints恰好3层、answer、coveredBranches、sources、validation、relatedContent。firstPlayer必须等于initialPosition.toPlay |
| TerminalFixture | developmentOnly、title、position、status=confirmed/teaching-assumption/unsettled、assumptions、agreement、komi、captureCountsForComparison、expectedScore、sources、validation。unsettled必须expectedScore=null；假设须明确，不伪装双方确认 |
| Feedback | developmentOnly、activityRef、recordedAt、difficulty、preferredActivities、comment、consentToUse、evidenceType、responseContext、response。坐标型回答必须给responseContext.size及contentRef（未知引用可null，但尺寸必须明确）。未知时间/难度用null；空表evidenceType=blank-template，不是学生记录。T00示例无任何已提交反馈 |
| ContentBundle | developmentOnly、title、items。只装独立文档，不再嵌套bundle。items中id不可重复；引用id@revision必须在同包解析。独立Lesson/Puzzle引用可待组包时解析 |

## 题型与证据

Answer是带type的联合类型：point-set保存不重复空点集合；number保存数值；region-labels保存at+owner(B/W/neutral/unknown)；reason-choice保存选项ID及接受集合；open-text保存criteria、sampleConsiderations、automaticVerdict=false；move-tree保存rootNodeId、nodes、uncoveredPolicy=unknown、uniquenessClaim、uniquenessEvidence。非对弈题不需要落子。
Response独立区分point-set/number/region-labels/reason-choice/open-text/move，用于反馈或后续判题接口。reason-choice用optionIds；region-labels不执行落子；开放文本永不当代码或HTML运行。DISC必须open-text，不把作者偏好作为唯一答案。

TreeNode包含nodeId、move、children、outcome、terminalStatus、evidence、explanation。根move=null，其他节点为一个Move；children按节点ID引用。树中不能出现循环、重复ID、孤儿或悬空引用。coveredBranches为从根开始的已核查路径ID数组；空数组表示没有分支核查记录。未覆盖的合法着必须unknown，不是failure。claim唯一解必须给证据，但字段存在本身不证明充分性。
terminalStatus允许verified-alive、verified-dead、unsettled、unknown或null；前两者至少须提供证据条目，具体内容是否足以证明须另做解答核查。conditions.boundary固定full-board，external与assumptions说明外部条件；viewport仅描述可选裁切，完整initialPosition始终保留。优先避开劫、双活和外部征子依赖。

validation有六个相互独立且必填的字段，可为null：structure、moveLegality、solutionChecked、externalReferenceChecked、modelChecked、humanReviewed。前五项Check含status、method、checkedAt、evidence；status为passed/failed/partial/not-applicable。humanReviewed若非null，必须有reviewer、reviewerRole=human、checkedAt、scope、evidence。没有真实人类复核就保持null，不让模型检查自动填写教师字段。

开发示例中的validation全部null，实际本次结构测试保存在output/validation/content-report.json，避免把自动测试报告写作内容作者的审题证据。数气与面积表有独立推导，但未做人类/教师审核。T09正式发布池须独立检查全部适用验证层，不得由结构接受结果自动发布。

T04 的 `content/t04/liberty-demos.json` 是一个 developmentOnly ContentBundle，包含 8 份完整 Puzzle（`DEMO-LIB-001`–`008`）。它们继续使用现有 point-set Answer、Position 和 validation 结构，没有修改 schemaVersion；`structure` 和 `solutionChecked` 有自动/手算证据，`humanReviewed` 保持 null。演示编号与正式 `LIB-001`–`005` 分开。

T05 的 `content/t05/capture-demos.json` 是另一个 developmentOnly ContentBundle，包含 6 份完整 Puzzle（`DEMO-CAP-001`–`006`）。Puzzle 的 reason-choice 记录教学结论，精确被提点集、最终气和非法对照保存在独立 fixture 并由 T01 重放；这避免把初始盘上的已占点错误写进只允许空点的 point-set Answer。没有新增 schema 字段，`humanReviewed` 保持 null，编号不占正式 `CAP-001`–`005`。

T06 不新增正式内容或题号。自由实验棋盘的单独导出是既有 Position：`historyPolicy=fresh-setup`、`history=null`，表示只知道当前新起点。Position 的封闭 schema 没有 marker 字段，因此完整实验保存使用既有 ContentBundle，内含一份 Position 和若干单点 MarkerDocument；目标为 `target`，数字为 `sequence` 且标签为“数字 N”。共同校验器先验证结构，T06 回读器再限制恰好一份 Position、相同尺寸和 1–99 数字格式。规则模式仍须 `validateSetup/startGame`，结构通过不能替代规则起点验证。

## 两层校验边界

1. JSON Schema封闭对象校验：必填、类型、枚举、常量、绝对坐标上限、动作联合、额外字段拒绝；JSON格式失败返回JSON_PARSE。
2. validateContent跨字段校验：相对于实际size的坐标范围、重复占点、矩阵大小、history编码长度/当前末项、先手与目标、答案点、变化树引用/覆盖、终局算术一致性、bundle引用。错误均给JSON Pointer字段路径。完整规范校验必须两层都跑；单独第三方Ajv检查并不能检测不同颜色重复占同一点。

返回ok仅说明level=structural。**T00不验证零气块、不重放着法、不证明答案正确、不核实人类身份或历史来源。** 例如被白子堵死的角上黑子仍可作为结构有效的摆棋文档；T01现已通过validateSetup决定能否切入规则模式，通过restoreGame重放GameState；结构校验器自身的职责保持不变。
needsRulesReplay=true表示含GameState或recorded Position；false只表示无记录历史要重放，**不表示局面已合法**。全部Position用于规则模式前仍须validateSetup；导入GameState一律restoreGame重放核对，不信任其缓存、提子数、结果或undoStack。T00首页不读取导入文件为对局。

## 开发示例与修改方法

content/examples/valid有每种独立类型及bundle共10份；全部带DEV-*身份或developmentOnly。invalid有四份独立负例；expected-errors.json记录预先写定的错误码/字段，非运行时自己推导“正确答案”。生成脚本build-examples.py仅维护T00开发样例，不生成正式题库。

```sh
python3 scripts/build-schema.py
pnpm schema:types
pnpm schema:check
pnpm validate:content
pnpm test
```

变更顺序：先记录规则/结构原因→更新schema生成源→生成JSON与类型→修改校验和调用方→明确旧数据迁移→跑有效与负例→更新交接和revision。1之外主版本拒绝且原文保留；禁止无依据的自动迁移。普通内容导入默认上限2MB；T01对完整GameState的serializeGame/restoreGame及createVerifiedGameStore使用64,000,000字节上限，schema结构不变，不保证本机存储有同等配额。解析只用JSON.parse，文本由React转义；来源URL只接受https文本元数据，不自动抓取或执行，当前无导入UI。
