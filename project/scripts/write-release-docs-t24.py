from pathlib import Path
import json,hashlib,re,shutil
R=Path(__file__).resolve().parents[1];D=R/'docs/t24';D.mkdir(exist_ok=True)
# One-time authoring script retained for provenance; creates dated documents in the original T23 copy.
V='0.17.1-t24.1';P='0.17.1';RULE='GO-CLUB-AREA-1'
def doc(path,id,title,body,rev=1):
    p=R/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(f'---\nschemaVersion: 1\nid: {id}\nrevision: {rev}\nrulesetId: {RULE}\n---\n\n# {title}\n\n'+body.strip()+'\n')
base=Path('/Users/maxiao/.codex/.chatgpt-projects/g-p-6a9bf14616b08191a5fcd62fa51553c8/work/t23-20261009/mainline/go-club/materials/facilitator-kit/delivery/go-club-T23-0.17.0-plus-t23.1-full.zip')
(D/'input-manifest.json').write_text(json.dumps(dict(schemaVersion=1,id='T24-INPUT-MANIFEST',revision=1,rulesetId=RULE,baseVersion='T23 0.17.0-plus-t23.1',programBaseVersion='0.17.0',resultVersion=V,programVersion=P,baseArchive=str(base),baseSha256=hashlib.sha256(base.read_bytes()).hexdigest(),freezeId='GO-CLUB-FREEZE-B-20260919-01',concurrency='isolated T24 copy; no concurrent writers launched; sources read only',prerequisiteHandoffs=[f'handoff/T{i:02}.md' for i in range(24)]+['handoff/MERGE_A.md','handoff/MERGE_C.md','handoff/CONTENT_FREEZE.json']),ensure_ascii=False,indent=2)+'\n')
doc('docs/t24/README.md','T24-RELEASE-README',f'整套工具包 {V}',f'''
本次唯一主版本：T23 0.17.0-plus-t23.1；程序从 0.17.0 修复为 {P}，工具包版本 {V}。GO-CLUB-AREA-1 / schemaVersion=1 / Freeze B 均保留。正式 30 题与 6 终局均 revision 1。

先读[教师快速开始](TEACHER_QUICK_START.md)，再读[更新与备份](UPDATE_AND_BACKUP.md)。[验收矩阵](acceptance-matrix.md)、[测试报告](test-report.md)、[限制](known-issues.md)、[变更](changes.md)给出证据与适用范围。完整逐文件清单和校验值在工程根 RELEASE_MANIFEST.json / SHA256SUMS.txt；所有历史 handoff 仅说明当时版本，最新状态以 handoff/T24.md 为准。

材料首选 materials/challenge-cards（30 双面卡与答案册）、materials/micro-lessons（25 主讲页）、materials/facilitator-kit（20 页主持手册与一页活动）。content/print/T09_教学演示_r1.pptx 是 36 页内容参考课件，不替代 T22 的五套微课，也不重复计为主讲页。T19 13 路 A4 覆片及其 4 页合并包已从生成源修正为 revision 2；其他材料来源版本见总清单。

这是本地交付，无公开部署、账号或默认上传。数字验收不等于真人教师复核、实际活动、CAS 学校认定或实物试验。
''')
doc('docs/t24/TEACHER_QUICK_START.md','T24-TEACHER-QUICK-START','教师快速开始','''
1. 解压完整 ZIP，先打开 materials/facilitator-kit/output/T23_facilitator_manual.pdf 第 2–4 页；选择第 5–10 页中的一次 45 分钟活动。人数未知时按手册公式配棋盘，两人一盘；活动时间可按现场调整。
2. 程序启动见根 README。用本机 HTTP 服务打开，先进入“教师视图 → 离线与本机数据”，等“已可离线”，再关闭网络并刷新演练。首次安装仍需取得依赖；已附生产构建无需重新构建。避免在共享设备输入姓名或联系方式。
3. 零基础成员从“我第一次接触围棋”进入气实验室；有经验成员可直接对弈或挑战题。路线是建议，不是参与门槛。只有教师设备时投影并让同伴轮流解释，实体棋盘替代个人设备。
4. 一次练习可依次使用气预测、提子步骤、自由摆棋、吃子小游戏。小游戏首提即胜，与完整围棋不同。完整 9 路默认 0 贴目，是教学选择；两停后由双方确认死子与中立点，有争议恢复原盘对弈。
5. 挑战题的未知合法手不自动判错。死活结论只在题目给定条件下成立；两个受保护独立真眼是基础活形，没有两眼不自动等于死亡。讨论参考不是唯一观点。
6. 收尾可跳过反馈，也可由不同成员连续填写空表。教师只汇总实际记录；0 条数据没有评价。导出前查看并删减自由文本，记录本人、同伴、AI 和参考资料的贡献。保存和备份只在本机进行。

无屏替代：手册第 13 页替代表；气环代高亮、纸卡背代提示、实体分步提子代动画；T23_03_prepare_close.pdf 是准备/收尾一页清单，T23_04_voluntary_feedback.pdf 是空反馈表。规则卡用 materials/rule-cards/output/，棋盘用 materials/pair-boards/output/boards/；100% 实际尺寸打印，先校准，再批量。磁吸、耐用性与双面套准仍待实物试验。

实际程序入口（先启动应用，再拼接 hash）：

| 用途 | 入口 |
|---|---|
| 学习与自选路线 | #/home、#/route |
| 数气/提子 | #/learn/liberties、#/learn/captures |
| 摆棋/双人吃子/完整棋 | #/board/experiment、#/play/partner、#/play/full-game |
| 挑战/死活/合作/围地 | #/challenges、#/learn/life、#/challenges/together、#/learn/territory |
| 出题/文件交换/离线 | #/teacher/editor、#/teacher/file-exchange、#/teacher/offline-data |
| 可跳过反馈/教师记录 | #/feedback、#/teacher/evidence |
''')
doc('docs/t24/UPDATE_AND_BACKUP.md','T24-UPDATE-RECOVERY','更新、备份与恢复','''
更新前在“离线与本机数据”导出完整备份，并导出正在创作的重要 Puzzle JSON / SGF。保持使用相同浏览器、相同主机和端口；换端口属于另一浏览器来源，不会自动带入旧本机数据。不可把旧的材料支线全量工程覆盖程序主线。

程序 0.17.0 → 0.17.1 保持数据库版本 1、storageSchemaVersion=1、所有记录键、规则和内容版本。只修复教师编辑会话延迟保存：每次已提交到界面的编辑立即交给公共存储，显式保存同时记录当前编辑会话。IndexedDB 异步写入沿用已有同步恢复日志；正常刷新与快速离开已复验。存储故障时应看页面提示并导出，不声称能防止浏览器清理、断电或磁盘损坏。

服务工作线程缓存名称随程序版本更新；旧标签页显示更新提示时先保存，再应用，避免在对弈/编辑中强制刷新。点击“准备或重新核对离线资源”，确认实际缓存成功后演练禁网刷新。HTTPS 或 localhost 才具备支持条件；直接双击 file:// 不提供同等能力。PDF/PPTX 没有自动加入应用缓存，请事先把材料文件留在本机。

恢复：选择完整备份，先看格式检查，再明确确认替换。未知主版本、坏 JSON、重复键等拒绝时不覆盖；不要通过手工改版本字段跳过检查。草稿可单项导出交由文件交换安全预览；正式题库不因清学习进度而被删除。选择性清除的范围以界面列项为准，删除前备份。多人共用的记录是本设备记录，不是实名个人测评。

常见故障：未显示已可离线时保持联网并重新准备；首次未缓存且彻底离线不能加载完整应用，可能是浏览器自己的错误页，已有不完整缓存才可显示项目恢复说明。配额/隐私限制时保留当前页面并导出，换正常浏览器窗口后恢复。更新失败保留原数据与备份，不能无提示删除。新电脑先打开本机 HTTP 服务，再导入备份，不能自动跨设备同步。

教师备用：T23 手册第 13 页无屏替换、第 14–15 页规则争议与断网处理；同时留好规则卡和题卡 PDF。
''')
doc('docs/t24/known-issues.md','T24-KNOWN-ISSUES','已知限制与验证边界','''
目前两项实际交付缺陷已修复：T14 编辑会话快速离开/刷新丢失；T19 13 路 A4 覆片错误写成 9 路。修复与复验见 changes.md、test-report.md。

| 级别 | 项目 | 状态与恢复/边界 |
|---|---|---|
| 限制 | 浏览器覆盖 | Chromium 151.0.7922.34 完整自动化；WebKit 26.5 在线完整路线及资源服务停止控制实验。Firefox 1538 构建因宿主插件/图形启动失败未运行；原生 Safari、Firefox、Edge、真人辅助技术未测。 |
| 限制 | WebKit 禁网自动化 | context.setOffline 后刷新触发工具内部错误；与 Playwright 官方 issue 42775 症状相符。停资源服务已作为独立缓存控制检查，不能称为物理断网或原生 Safari 禁网通过。 |
| 限制 | 实体与人类 | 实际打印缩放、双面套准、裁切、磁吸、耐用性、手机/平板/投影实机、课堂与真人教师审核均未做；数字几何/逐页检查不替代它们。 |
| 限制 | 存储耐久性 | 正常刷新、快速保存、旧记录迁移、坏备份、模拟写入/配额失败已测；实际磁盘满、隐私模式、浏览器自动清理和突然断电未测。请手动备份。 |
| 限制 | 首次离线 | 没有缓存且没有网络时无法首次加载完整应用；file:// 不支持 Service Worker。材料 PDF/PPTX 需单独在本机保留。 |
| 轻微 | 构建体积 | Vite 提示主包约 971 KB，当前离线缓存与操作测试通过；没有为减小包而改动共享依赖或功能。 |
| 边界 | 棋力与效果 | 不实现任意死活裁判、策略 AI、胜率、官方段位与账号。结论有条件，未知不判错，无真实课堂成效或 CAS 认定。 |

没有未解决的已知阻断或重要功能缺陷。该结论仅覆盖本报告列明的数字验收；未测项未计为通过。
''')
# Material subset repair documentation, leaving original T19 handoff as provenance.
p=R/'materials/pair-boards/README.md';s=p.read_text().replace('revision: 1','revision: 2',1).replace('结果版本为 `0.2.0-t19.1`','结果版本为 `0.2.1-t19.2`（T24 最小修复；其他文件沿用 T19 原版本）');s+='\nT24 修复：13 路 A4 覆片的对位说明从误写 9×9 改为 13×13，重新生成对应 SVG/PDF 和 4 页合并包；两份成品 revision 2，未改格距或棋形。原交接/旧 QA 是历史记录，当前逐页与44项几何复验见 docs/t24/checks。\n';p.write_text(s)
p=R/'materials/pair-boards/CHANGELOG.md';s=p.read_text().replace('revision: 1','revision: 2',1).replace('## 0.2.0-t19.1','## 0.2.1-t19.2 - 2026-10-09\n\n- T24 修正13路A4透明覆片误写9路的对位说明；从生成源重新输出SVG/PDF与4页合并包。\n- 对应覆片与合并包revision提升为2；尺寸/棋子/正式题库不变。\n- 当前44项几何检查及T24全页渲染已复核；旧QA图片仅是旧版检查记录。\n\n## 0.2.0-t19.1');p.write_text(s)
# Sources actually consulted for T24 implementation and diagnostic scope.
p=R/'SOURCES.md';s=p.read_text();s+='''\n\n## T24 核查来源 · 2026-10-09\n\n- [MDN IndexedDB transaction](https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase/transaction)：区分发起写入与事务完成，沿用统一写入恢复日志；没有使用非标准 readwriteflush。\n- [MDN pagehide](https://developer.mozilla.org/en-US/docs/Web/API/Window/pagehide_event)：离开事件不能作为可靠保存的唯一途径，本次选择立即保存编辑状态。\n- [Playwright Service Workers](https://playwright.dev/docs/service-workers)：自动化支持范围；WebKit控制实验与Chromium禁网分别报告。\n- [Playwright issue 42775](https://github.com/microsoft/playwright/issues/42775)：setOffline+WebKit reload内部错误的同症状公开复现；这里只作为工具缺陷推断，非本项目原生Safari失败证明。\n- modern-web-guidance 2026_05_16-c5e78707：执行真实搜索，结果低匹配并提示指南版本较旧；没有据此改变围棋规则或引入依赖。\n\nT24未复制BGA插图/题目，也未引入新第三方素材。BGA原先的概念/教学来源边界继续适用。第三方运行依赖许可证另随 docs/t24/third-party/ 保留；Noto Sans SC 的 OFL 在微课 assets/fonts/。系统字体只在已有PDF内嵌，不在本包分发系统字体文件。\n''';p.write_text(s)
