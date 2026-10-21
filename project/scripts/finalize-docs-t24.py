from pathlib import Path
import json,hashlib,re,zipfile,shutil
R=Path(__file__).resolve().parents[1];D=R/'docs/t24';V='0.17.1-t24.1';RULE='GO-CLUB-AREA-1'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def out(path,id,title,body):
 p=R/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(f'---\nschemaVersion: 1\nid: {id}\nrevision: 1\nrulesetId: {RULE}\n---\n\n# {title}\n\n'+body.strip()+'\n')
a=json.loads((D/'checks/cross-media-audit.json').read_text());r=json.loads((D/'checks/render-report.json').read_text())
r['status']='rendered-and-assistant-visually-reviewed';r['visualReview']={'method':'assistant inspection of all 79 numbered contact sheets at 120 dpi; raster-identical copies mapped to representative pages','reviewedSheets':[x['image'] for x in r['sheets']],'recheckedAfterRepair':['sheet-057.jpg'],'humanReviewed':None,'physicalPrintTest':None};(D/'checks/render-report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
out('docs/t24/visual-review.md','T24-VISUAL-REVIEW','逐页排版检查',f'''
实际渲染 {r['pdfCount']} 个 PDF（含从 7 个 PPTX、15 个 DOCX 新转换的副本），共 {r['renderedPages']} 页；{r['uniqueRasterPages']} 种独立页面栅格组成 {len(r['sheets'])} 张联系表。每一页都有源文件 SHA、页码及栅格 SHA；相同栅格共用视觉检查代表，不跳过独立页面。完整记录见 checks/render-report.json。

本助手实际查看 sheet-001 至 sheet-079 的全部独立页，检查缺字、溢出、棋子与交叉点、气环/目标区分、表单空态、页码和阅读尺寸。T19修复后重渲染并再次查看sheet-057，13路覆片及合并包文字正确。T22 25页主讲源全部原生可编辑，逐页备注对应；T23 20页手册、6份一页流程与8份一页支持材料可读。没有以Office文件能打开代替排版检查。

当前材料与原生源文件的数字检查通过。浅色棋盤标记的灰度检查沿用T02截图和材料灰度联系表；对原生PPT文字与替代字体可能产生少量英文换行，不影响棋形或核心中文阅读。实际屏幕阅读器、Word/Keynote/PowerPoint实机、投影距离与纸面试印未做，humanReviewed仍为空。

新生成的T24连续路线截图、768px离线页、360px19路局部滚动与1280px灰度标记已实际查看；没有页面横向挤出或关键文字遮挡。
''')
inventory=dict(schemaVersion=1,id='T24-RESOURCE-INVENTORY',revision=1,rulesetId=RULE,resultVersion=V,programVersion='0.17.1',freezeId=a['freezeId'],formalPuzzleCount=30,terminalCount=6,uniquePrimarySlideCount=25,taskInputs=a['taskInputs'],formalContents=a['formalContents'],pdfs=a['pdfInventory'],pptx=a['pptxInventory'],materialVersions={'T18':'0.2.0-plus-t18.1','T19':'0.2.1-t19.2 (13路A4覆片/派生4页包r2;其余原T19r1)','T20':'0.2.0-t20.1','T21':'0.15.1-t21.1','T22':'0.15.1-t22.1','T23':'0.17.0-plus-t23.1'},humanReviewed=None)
(D/'release-inventory.json').write_text(json.dumps(inventory,ensure_ascii=False,indent=2)+'\n')
rows=[]
for task in a['taskInputs']:
 rows.append(f"| {task['taskId']} | {task['resultVersion']} | [{task['handoff']}](../../{task['handoff']}) |")
out('docs/t24/version-catalog.md','T24-VERSION-CATALOG','版本与跨介质总清单','''本次主线唯一最新版本 **0.17.1-t24.1**，程序 **0.17.1**。以下交接为输入历史版本，不能用其旧全量归档覆盖本工具包。T19最小修复的当前说明优先于旧T19 handoff的标签描述。

| 任务 | 输入版本 | 实际交接 |
|---|---|---|
'''+ '\n'.join(rows)+'''

逐题映射见 release-inventory.json：30正式题、6终局的源JSON、id/revision、棋形SVG、答案册、T21正背/教师页码、实际T22引用和独立验证字段。未引用到某一PPT的题保留空引用清单，不能假造全部题均已主讲。6个终局由T09源码/图示/答案及T13程序使用；END-006仍unsettled、expectedScore=null。T22只有25张唯一主讲页，分册与合册是重复包装；T09的36页参考课件单独列明。

91份原交付PDF共339页；再从可编辑源转换的22份PDF只作QA副本，完整计数113份/459页。不重复把QA副本当新教学材料。根RELEASE_MANIFEST.json记录本包每个源码与成品的字节SHA。旧FILE_MANIFEST、旧QA与交接按来源年代保留，最终包校验以根清单为准。
''')
out('docs/t24/rule-review.md','T24-RULE-REVIEW','规则一致性审查','''
规则、schema、201个冻结内容文件均与Freeze B逐字节一致；规则引擎未修改。沿用唯一Board、getGroup/getLiberties/tryMove/scoreArea与统一IndexedDB存储适配器，页面不重新推算合法性或死活。规则来源为用户GO-CLUB-AREA-1约定，BGA不同赛规仅比较。

| 规则点 | 实际代码与回归证据 |
|---|---|
| 正交连接、中心/边/角4/3/2气、斜邻、共享气去重 | src/core/rules/topology.ts；tests/t01/rules.test.ts、properties.test.ts，T04八布局独立点集 |
| 先提敌块再查己方气、多块同时提、自杀、失败不变 | placement.ts、engine.ts；固定rules-vectors.json、rules.test.ts；T05/T07浏览器边界 |
| positional superko、完整编码、初始布局、较早重复 | coordinates.ts layoutKey、placement.ts；空盘到简单劫端到端及显式长历史向量；后者不冒称实际长循环棋谱 |
| pass例外、undo/redo路径、分支截断、认输 | engine.ts；rules.test.ts、import.test.ts、history回归 |
| 摆棋非法保留、新起点未知过去 | validateSetup；tests/t06、browser/t06、T24连续路线新历史数量1 |
| 双停确认、死子预览、修改取消确认、争议原盘恢复 | confirmScore/resumePlay、full-game；tests/t08、browser/t08、T24实际双停/标死/恢复/确认和棋 |
| 面积活子+围空+贴目，中立/全空，无提子再次加分 | scoring.ts；独立手算tests/t01/scoring.test.ts、tests/t13；T09六终局及T20手算回归 |
| 未知合法分支不判错，多解/反驳/开放讨论 | puzzle-runner + content/tools/grade.mjs；tests/t10、T24未知合法手试下返回 |
| 真/假眼、两个空点与独立眼、先手与证据边界 | tests/t11/model.test.ts、life-lab.test.tsx、browser/t11；T09有限变化重放；没有通用死活推断 |
| 纸卡/课件/手册一致 | 617项跨介质检查；T20规则文本与示例检查、T21冻结84项、T22源图/变化/原生备注、T23六次45分钟 |

术语按TERMINOLOGY/RULES/CONTENT_SCHEMA解释：气是连通块相邻空点去重集；停手不加分且不清历史；提子累计是信息；贴目开局确定默认0；劫教学从简单劫开始但正式约定为位置超级劫；终局须双方确认或认输。对进行中/争议棋只给预览。两真眼是特定结构依据，没有两眼不自动死亡。所有正式humanReviewed保持空，助手审阅不能替代真人教师。
''')
out('docs/t24/test-report.md','T24-TEST-REPORT','实际测试报告','''
检查日期2026-10-09；工具包0.17.1-t24.1/程序0.17.1；隔离工作副本，无真实成员数据。Node24.19.0、pnpm11.25.0执行声明pnpm11.19.0的现有锁文件；依赖与锁文件没有变更。

| 类别 | 实际命令/动作 | 结果 | 证据 |
|---|---|---|---|
| 干净安装 | pnpm install --frozen-lockfile | 通过 | checks/clean-install-online-approved.log（沙箱首次网络失败另存，不冒称成功） |
| 程序/规则完整 | pnpm check（修复后） | 通过，43文件358测试；含构建、引擎独立导入、容量与恢复 | checks/full-check-after-fix.log |
| 内容 | pnpm validate:t09 / test:t09-grader（包含在check） | 通过，851检查/134录入着/2179探索状态；30+6；grader20 | 同上、content/validation/ |
| 冻结 | verify:t16-freeze / verify:merge-a | 通过，201文件字节未变 | 同上 |
| Chromium | pnpm test:browser | 通过，150项，版本151.0.7922.34 | checks/browser-after-fix.log、output/playwright/ |
| 连续路线 | tests/browser/t24.spec.ts | 通过17步，从首次进入至反馈/备份恢复；真实context.setOffline禁网刷新 | checks/journey/chromium/journey.json及截图 |
| WebKit | T24_ONLINE_ONLY=1 pnpm exec playwright test tests/browser/t24.spec.ts tests/browser/t24-refresh.spec.ts --browser=webkit --workers=1 | 通过2项，WebKit26.5；17步在线路线、快速刷新 | checks/browser-webkit-after-fix.log、journey/webkit/ |
| 缓存控制 | node scripts/check-origin-outage-t24.mjs | Chromium/WebKit均通过；先缓存，再停止隔离HTTP服务，刷新草稿、完成数气题，服务关闭后收到0请求 | checks/origin-outage-after-fix.log、origin-outage/results.json |
| 材料回归 | Python scripts/verify-materials-t24.py | 全通过：T18 47、T19 44、T20规则/印刷、T21 84、T22内容/原生与备注 | checks/materials/commands.json及逐任务日志 |
| 跨介质静态 | Python scripts/audit-t24.py | 617通过、0失败；30+6，25主讲页，6活动各45分钟，全部handoff | checks/cross-media-audit.json |
| 页面渲染 | Python scripts/render-t24.py（最后--reuse-office仅复用已新转换Office副本） | 113PDF/459页实际渲染，315独立栅格/79联系表全部助手查看 | checks/render-report.json、visual-review.md |
| 归档再验收 | 解压候选ZIP、干净安装、完整check、Chromium连续路线、逐文件SHA/CRC | 以归档复查记录为准 | checks/archive-recheck/及release外ARCHIVE_CHECK.json |

独立预期来自tests/fixtures、EXPECTED_RESULTS、T09显式点集/变化/终局手算、T19毫米参数；没有由被测引擎自产全部正确答案。T24连续路线明确回答中心单子4气、同屏角上3手首次提胜、黑白角子最终1:1/79中立、END-001已给假设10:15/贴目2.5变10:17.5等。

实际覆盖360/768/1280px、四种完整盘面、四角/边点、键盘/Enter/Space、模拟触摸、不重复回调、19路局部滚动/复位、灰度、减少动画、hash深链接/刷新、坏导入恢复、配额/写入拒绝、更新不强刷、旧revision不复用成绩。截图与浏览器断网区别于静态代码检查。

失败记录保留：T14快速刷新初次失败已复现并修复；T19误标签已修复；WebKit context.setOffline引发工具内部错误（未列通过）；Firefox启动超时/图形插件拒绝（未测）；首次沙箱无网络依赖获取失败后以获准环境重新安装通过。见known-issues.md。资源服务停止是网络来源不可用控制实验，不等于禁用全部网络或物理断开Wi-Fi。

真人教师复核、真实成员/课堂、实际打印制造、设备实机、学校CAS审核：未测/未发生。空表和固定TEST数据不冒充这些证据。归档里不带浏览器用户库、IndexedDB文件或测试生成的实际存储。
''')
# Upgrade the retained responsibility matrix without discarding any requirement columns.
p=R/'docs/requirements-matrix.md';s=p.read_text().replace('revision: 16','revision: 17',1).replace('T00–T17 已继承、合并或完成；其他下游状态仍以各自交接为准。','T00–T23 已实际集成；T24最新数字验收见docs/t24/acceptance-matrix.md。历史验收与当前复验区分；实物与真人审核未测。')
lines=[]
for line in s.splitlines():
 if re.match(r'\| T\d\d \|',line):
  t=line.split('|')[1].strip();cols=line.split('|');i=int(t[1:]);
  if i<=17:cols[-2]=' T24现版数字回归通过；Chromium150项与WebKit在线完整路线；实机/辅助技术/真人教学未测 '
  elif i<=23:cols[-2]=' T24材料文件/源/尺寸/逐页与引用复验通过；实际打印制造/真人教学未测 '
  else:cols[-3]=' handoff/T24.md；docs/t24；tests/browser/t24*.spec.ts；release归档 ';cols[-2]=' 数字检查通过；最终归档再验收记录见T24交接 '
  line='|'.join(cols)
 line=line.replace('T23实体活动手册未实施','T23实体活动手册数字交付通过，实物未测').replace('四尺寸与气计算通过；实屏未测','四尺寸与气计算及Chromium三尺寸实屏通过；实机未测')
 lines.append(line)
p.write_text('\n'.join(lines)+'\n')
rows=[]
for line in lines:
 if re.match(r'\| T\d\d \|',line):
  c=[x.strip() for x in line.split('|')[1:-1]];t=c[0];i=int(t[1:]);location=c[3];ev=f'handoff/{t}.md；tests/t{i:02}、tests/browser/t{i:02}.spec.ts' if i<=17 else f'handoff/{t}.md；{location}；T24逐页/材料/引用报告'
  rows.append(f'| {t} | {c[1]} | {location} | {ev} | 通过（数字） | 未测 |')
out('docs/t24/acceptance-matrix.md','T24-ACCEPTANCE-MATRIX','需求验收与证据分类','''全部责任条款原文覆盖项仍在docs/requirements-matrix.md，本表给出最终入口/文件与证据。程序项358单元/组件+150浏览器测试、617跨介质检查均实际运行；材料项分别有源文件、几何、渲染及引用校验。

| 任务 | 范围 | 入口/文件 | 证据 | 数字验收 | 真人/实物 |
|---|---|---|---|---|---|
'''+ '\n'.join(rows)+'''

T00证据是schemas与tests/validation/document-contract；T01引擎无独立网页入口；T09内容没有独立学习UI，由T10/T13引用；T18–T23为本地材料文件，无需冒造网页入口。T24最终ZIP完整性和从干净目录启动/校验另见archive-recheck；不将“文件存在”替代动作验收。

| 共享验收 | 状态 | 实际证据 |
|---|---|---|
| 规则/schema/版本/坐标/冻结 | 通过 | 201逐哈希、rules回归、617跨介质、release-inventory.json |
| 正式30题/6终局/25主讲页 | 通过 | 实际JSON/PDF/SVG/原生PPT与备注映射，开放/未终局边界保留 |
| 首次进入到反馈、出题、导入导出、离线备份完整动作 | 通过 | T24连续17步+既有150浏览器测试 |
| 360/768/1280、触摸模拟、键盘、减少动画 | 通过 | 实际Chromium页面动作和截图，不是设备实机 |
| PDF/PPT/DOCX全页、几何、灰度 | 通过 | 113PDF/459页渲染、315独立栅格全看、材料检查 |
| 无假记录/密钥/默认上传/远程核心 | 通过（所列检查） | 生产首次空态、TEST数据隔离、源代码扫描、连续路线0外部请求 |
| 原生Safari/Firefox/其他浏览器、专用辅助技术 | 未测 | Firefox启动环境失败；WebKit只作明确在线/来源停止控制实验 |
| 教师/学生/课堂/实体打印制造/CAS认定 | 未测 | 不生成实施证据；所有humanReviewed保留空 |
''')
# Mainline README: one current, actionable entrypoint.
out('README.md','DOC-README',f'围棋社工具包 · T24 · {V}','''
以围棋提供放松、社交与主动思考的非学术休闲机会。工具包整合T00–T23程序、30道正式题、6个终局、棋具设计、规则卡、30张双面题卡、25页微课和6次45分钟主持流程。零基础到熟练成员均可自由跳转，进度不构成参与门槛。默认假设是中学生、45分钟、两人一盘，并非已确认的学校情况。

本次工具包 **0.17.1-t24.1**、程序 **0.17.1**；唯一底本T23 **0.17.0-plus-t23.1**。规则GO-CLUB-AREA-1、schemaVersion=1、Freeze B/正式revision1保持。最新状态读[交接](handoff/T24.md)，历史handoff与旧材料全量归档只作追踪，不覆盖本包。

先读[教师快速开始](docs/t24/TEACHER_QUICK_START.md)、[更新备份指南](docs/t24/UPDATE_AND_BACKUP.md)、[验收矩阵](docs/t24/acceptance-matrix.md)、[实际测试](docs/t24/test-report.md)、[限制](docs/t24/known-issues.md)。最新逐文件清单RELEASE_MANIFEST.json、SHA256SUMS.txt；正式题/卡片/课件页码映射docs/t24/release-inventory.json。归档校验值在ZIP同目录。

## 本地启动

标准环境：Node22.22.2+（22系）、24.15+（24系）或26+，pnpm11.19.0。T24实际用Node24.19.0/pnpm11.25.0执行同一锁文件；共享依赖未升级。首次获取依赖需要网络。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

默认http://127.0.0.1:5173/；以终端实际地址为准。无账号、AI API、后台数据库、外部CDN或默认网络上传。已附dist/生产构建，已有Python3时可直接从工程目录运行下行并打开http://127.0.0.1:8080/：

```sh
python3 -m http.server 8080 --bind 127.0.0.1 --directory dist
```

保持相同来源/端口保存本机数据；本地HTTP的localhost或HTTPS才支持Service Worker。直接双击file://没有同等离线能力。教师先检查“已可离线”，再禁网刷新；PDF/PPTX需另外留在本机。

## 构建与验证

```sh
pnpm check
pnpm build
pnpm preview
pnpm exec playwright install chromium
pnpm test:browser
```

check包含生成类型、358单元/组件测试、内容851检查、判题、合并和201冻结文件、TypeScript/Vite生产构建、独立ESM引擎、刷新和容量。test:browser实际150项，包含T24连续路线与快速刷新。构建的主包约971KB提示为已知轻微性能事项。

WebKit可另执行T24_ONLINE_ONLY=1 pnpm exec playwright test tests/browser/t24.spec.ts tests/browser/t24-refresh.spec.ts --browser=webkit --workers=1；这是在线检查。node scripts/check-origin-outage-t24.mjs另验证两内核停止资源服务后的缓存恢复；Chromium完整suite包含禁网刷新。原生Safari/Firefox/设备实机/辅助技术未测。

本次宿主的Node/pnpm路径在docs/t24/test-report.md和实际日志中；换电脑用自己的标准运行时，不复制宿主绝对路径。材料重建使用各materials目录source/tools与各自README，Python所需库按原材料说明；Office/PDF渲染需字体和转换器，调整宿主路径后逐页检查。

## 直接使用材料

- materials/facilitator-kit/output/：20页手册、6份独立一页活动、同伴教学/无屏替代/准备收尾/反馈等空表（DOCX/Markdown/PDF）。
- materials/micro-lessons/output/：五套各5页可编辑PPTX、合并25页和PDF；原生备注保留。
- materials/challenge-cards/output/：30张双面挑战卡与教师答案册；editable/含60个SVG。
- materials/rule-cards/：基础/补充规则、面积手算、吃子小游戏和自选路线；materials/demo-board、pair-boards：可制作的尺寸与材料方案，100%打印先校准。
- content/t09/bundle.json、puzzles/、endgames/、artwork/、tools/：唯一正式题库与验证工具；content/print的36页T09PPT为内容参考，不是额外微课主讲页。

数字流程与纸面均用GO-CLUB-AREA-1：先提敌棋后查己方气，位置超级劫、停手例外、两停人工终局确认、默认0贴目、面积不再加提子数。两个受保护独立真眼是基础活形；没有两眼不自动死亡。未知合法题目分支不判错。

开发DEMOs/TEMPLATE/TEST数据有标签，不计入30题。没有真实成员反馈、活动成效或CAS工时；实际反馈从空表开始。打印制造、真人教师、课堂、学校CAS认定未发生或未测，不能用自动验证代替。程序不公开部署，不发送材料。
''')
p=R/'README.md';s=p.read_text().replace('revision: 1','revision: 19',1);p.write_text(s)
p=R/'CHANGELOG.md';s=p.read_text().replace('revision: 18','revision: 19',1);insert='''## 0.17.1-t24.1 · T24 · 2026-10-09

以T23 0.17.0-plus-t23.1为唯一底本完成数字整套验收，程序修复到0.17.1。修复教师编辑会话120ms延迟导致快速离开/刷新丢恢复位置；显式保存同时写会话，既有IndexedDB/schema/键保持。T19仅13路A4覆片误标签及派生包从源重建为revision2。未改规则、201冻结内容、正式题ID/revision、共享依赖和锁文件。

358单元/组件、150Chromium、2WebKit在线、两内核来源停止缓存控制、617跨介质及113PDF/459页渲染检查通过。新增最终版本目录、验收矩阵、指南与完整ZIP/逐SHA清单。实物/真人/原生Safari/Firefox等未测；没有公开部署或真实课堂效果声明。旧清单/交接按历史保存，最新以T24为准。

''';s=s.replace('## 0.17.0 · T17',insert+'## 0.17.0 · T17',1);p.write_text(s)
# Retain old release manifest as explicitly historical provenance.
old=R/'release-manifest.json';hist=D/'provenance/T17-release-manifest.json';hist.parent.mkdir(exist_ok=True)
if not hist.exists():shutil.copy2(old,hist)
# Distribute exact runtime dependency licenses, not node_modules.
rootdeps=json.loads((R/'package.json').read_text())['dependencies'];todo=list(rootdeps);seen={};allpackages=[]
for p in (R/'node_modules/.pnpm').glob('*/node_modules/**/package.json'):
 try:
  x=json.loads(p.read_text());allpackages.append((x,p.parent))
 except:pass
while todo:
 name=todo.pop()
 if name in seen:continue
 matches=[(x,p) for x,p in allpackages if x.get('name')==name]
 assert matches,name
 x,p=matches[0];files=[q for q in p.iterdir() if q.is_file() and q.name.lower() in ['license','license.txt','license.md','copying','notice']];assert files,name
 dest=D/'third-party'/f"{name.replace('/','-').replace('@','')}-{x['version']}";dest.mkdir(parents=True,exist_ok=True)
 copied=[]
 for q in files:shutil.copy2(q,dest/q.name);copied.append(str((dest/q.name).relative_to(R)))
 seen[name]=dict(name=name,version=x['version'],license=x.get('license'),repository=x.get('repository'),files=copied)
 todo.extend(x.get('dependencies',{}))
(D/'third-party/licenses.json').write_text(json.dumps(dict(schemaVersion=1,id='T24-DEPENDENCY-LICENSES',revision=1,rulesetId=RULE,packages=list(seen.values())),ensure_ascii=False,indent=2)+'\n')
out('docs/t24/third-party/README.md','T24-THIRD-PARTY','第三方来源与许可','''生产依赖及其传递依赖的原始许可证逐份保留，版本来自锁定安装包，见licenses.json。包内许可证没有改写。开发工具的许可在其下载包中；依赖锁文件用于复现，不把node_modules打入交付。

Noto Sans SC 字体及其OFL位于materials/micro-lessons/assets/fonts/，供可编辑中文材料重建。已有PDF内嵌系统字体子集；本包不附系统字体文件。SVG编辑器可替换字体，但须重新渲染检查。BGA链接用于概念核查，没有复制插图或题目；原创代码、中文解释和坐标图示与通用规则分开记录，详见根SOURCES。未冒称协会授权、学生创作经历或第三方再许可。
''')
