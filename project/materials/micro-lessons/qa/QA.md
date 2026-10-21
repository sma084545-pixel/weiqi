---
schemaVersion: 1
id: T22-QA
revision: 1
rulesetId: GO-CLUB-AREA-1
freezeId: GO-CLUB-FREEZE-B-20260919-01
---

# T22材料验收记录

检查日期2026-10-05。以下为工具检查和模型逐页视觉检查，不是人类教师审核。最终没有阻断数字材料用途的未解决错误。

|检查|结果|证据|
|---|---|---|
|冻结点B实际存在，两档归档冻结一致|通过|freeze-lock-check.json，558条记录/474个独特路径均匹配|
|正式来源ID/revision、同版规则与图形|通过|assets/source-index.json、source/rendered-board-manifest.json|
|有限规则/答案复核|通过|content-checks.json：47项，使用原版冻结引擎|
|5×5主讲页、25合并页，无附加封面|通过|delivery-checks.json，六份finalizer报告|
|50页结构、原生对象、坐标、字号、备注|通过|delivery-checks.json；主文24pt或更大，标题33pt|
|六个PPTX在演示查看器实际导入|通过|viewer-open-and-pdf.log，LibreOffice Impress headless|
|6份课件PDF+5页摘要共55页渲染/解码|通过|pdf-checks.json、pdf-render/、delivery-checks.json|
|25页主讲与5页摘要逐页查看|通过|下表及page-by-page.json，最终PDF逐页全尺寸查看|
|题面先于答案、无虚构记录/效果/测得时长|通过|逐页内容与备注，所有时间为预计|
|灰度数字可辨性|通过|25页灰度渲染；2/9/23页查看气环、目标、黑白与眼形，非实体打印|
|PPT字体随包/PDF字体嵌入|通过|assets/fonts/OFL.txt；PDF字体部件检查，PPT安装说明见README|
|实体打印、教室投影、真人排练|未测|需现场设备与成员，步骤见README|
|PowerPoint/Google Slides原生交互与人类教师审核|未测|未拥有这些查看器/审核过程；不冒称通过|

独立PDF与合并对应页：23对像素完全一致，2对仅有少量字形边缘抗锯齿差异。原生几何、文字和备注一致。逐对容差和实测指标见delivery-checks.json。

## 25页最终检查

每页检查文字溢出/遮挡、棋子位置、真实边界、标记、投影字号、题面/答案次序与完整备注；以下各项均通过。坐标不是凭视觉猜测，另外逐个解包比较原生形状中心与源坐标。

|页|套/角色|页面|逐页观察|渲染证据|
|---|---|---|---|---|
|1|T22-ML-01 / 引入问题|这颗黑子有几口气？|LIB-001原题面未揭答案；E5交叉点准确|qa/pdf-render/T22_All_25_r1/page-01.png|
|2|T22-ML-01 / 直观示例|沿线相邻的空点才是气|LIB-001四气环与目标三角可区分|qa/pdf-render/T22_All_25_r1/page-02.png|
|3|T22-ML-01 / 关键对比|靠得近，连成一块了吗？|T20 CONNECT三子两块，斜邻不实连|qa/pdf-render/T22_All_25_r1/page-03.png|
|4|T22-ML-01 / 成员尝试|同一个空点，算几次？|LIB-004题面7气答案仅在备注|qa/pdf-render/T22_All_25_r1/page-04.png|
|5|T22-ML-01 / 转入对弈|两个人，轮流摆与找|明确摆棋与对弈可选择|qa/pdf-render/T22_All_25_r1/page-05.png|
|6|T22-ML-02 / 引入问题|黑先，这一手能提白吗？|CAP-001题面黑先，答案未提前印出|qa/pdf-render/T22_All_25_r1/page-06.png|
|7|T22-ML-02 / 直观示例|一气叫打吃，无气就提走|CAP-001成功分支，白C3消失，黑D3数字1|qa/pdf-render/T22_All_25_r1/page-07.png|
|8|T22-ML-02 / 关键对比|没有外气，就一定不能下吗？|T20 LEGAL先提两白再获得气，A5准确|qa/pdf-render/T22_All_25_r1/page-08.png|
|9|T22-ML-02 / 成员尝试|这一手会移走几颗？|CAP-002上边是真实边界，目标B5/C5|qa/pdf-render/T22_All_25_r1/page-09.png|
|10|T22-ML-02 / 转入对弈|开始一轮吃子小游戏|吃子小游戏首提即胜，双停无胜者|qa/pdf-render/T22_All_25_r1/page-10.png|
|11|T22-ML-03 / 引入问题|提得多，就一定赢了吗？|AREA-005给定比较账本非棋谱，明示活子/贴目假设|qa/pdf-render/T22_All_25_r1/page-11.png|
|12|T22-ML-03 / 直观示例|双停后，一起确认再计分|双停确认、争议继续、面积公式，提子不额外加分|qa/pdf-render/T22_All_25_r1/page-12.png|
|13|T22-ML-03 / 关键对比|白方能立即回提吗？|T20简单劫完整前后图；PSK完整边界在备注|qa/pdf-render/T22_All_25_r1/page-13.png|
|14|T22-ML-03 / 成员尝试|活子、围空、中立，怎样数？|END-002全活/0贴目教学算例，无学生画面答案|qa/pdf-render/T22_All_25_r1/page-14.png|
|15|T22-ML-03 / 转入对弈|完整9×9，从空盘开始|完整9×9及小游戏目标区分、双停争议|qa/pdf-render/T22_All_25_r1/page-15.png|
|16|T22-ML-04 / 引入问题|黑先，一手把两块接起来|CON-001目标两块，先问候选点|qa/pdf-render/T22_All_25_r1/page-16.png|
|17|T22-ML-04 / 直观示例|接上以后，作为整块看气|CON-001黑C3派生，三子实连|qa/pdf-render/T22_All_25_r1/page-17.png|
|18|T22-ML-04 / 关键对比|接上，还是被占住连接点？|CON-001失败分支黑C2白C3；最后手数字2|qa/pdf-render/T22_All_25_r1/page-18.png|
|19|T22-ML-04 / 成员尝试|斜邻的两子，怎样接上？|CON-002题面，C4/B3两种答案仅在备注|qa/pdf-render/T22_All_25_r1/page-19.png|
|20|T22-ML-04 / 转入对弈|落子前，先听伙伴的回应|9×9伙伴提出阻断点，允许实下回应|qa/pdf-render/T22_All_25_r1/page-20.png|
|21|T22-ML-05 / 引入问题|被黑棋围住，就一定是眼吗？|LIFE-002三个目标黑块，白先不预印答案|qa/pdf-render/T22_All_25_r1/page-21.png|
|22|T22-ML-05 / 直观示例|假眼：眼壁会先被提走|LIFE-002白C3提3目标；黑C2保留|qa/pdf-render/T22_All_25_r1/page-22.png|
|23|T22-ML-05 / 关键对比|两个空点，还是两个独立真眼？|LIFE-001独立真眼与LIFE-005相连空间；说明双活|qa/pdf-render/T22_All_25_r1/page-23.png|
|24|T22-ML-05 / 成员尝试|黑先，怎样做出两个独立眼？|LIFE-003黑先限定A5/B5/C5；答案留备注|qa/pdf-render/T22_All_25_r1/page-24.png|
|25|T22-ML-05 / 转入对弈|先解释眼形，再回到对弈|复摆与9×9衔接、13×13可选，不绝对判死|qa/pdf-render/T22_All_25_r1/page-25.png|

## 5页教师摘要

|页|主题|结果与证据|
|---|---|---|
|1|落子、连接与气|通过；pdf-render/T22_Teacher_Summary_5pages_r1/page-1.png|
|2|提子和打吃|通过；pdf-render/T22_Teacher_Summary_5pages_r1/page-2.png|
|3|完成第一盘9×9|通过；pdf-render/T22_Teacher_Summary_5pages_r1/page-3.png|
|4|连接与切断|通过；pdf-render/T22_Teacher_Summary_5pages_r1/page-4.png|
|5|眼和简单死活|通过；pdf-render/T22_Teacher_Summary_5pages_r1/page-5.png|

## 实际执行与修复

实际执行prepare-assets.py、verify-content.mjs、build-lessons.mjs、build-teacher-summary.py、LibreOffice导出、render-pdfs.py、verify-delivery.py；源Python编译与rebuild.sh语法检查通过。author-lessons.py实跑生成内容与最终lessons.json逐项相同。最终脚本与详细命令见handoff/T22.md。rebuild.sh整套从空目录重建未另行重复执行；其调用的各制作/验证步骤已实际执行，脚本语法已测。
早期长句换行、坐标标签留白及一张不完整PNG已修正。PNG改为逐页从渲染器完整输出后验证解码，再保存；最终55页均可完整解码。最终没有文字遮挡或坐标错误。fontPolicy校验只证明字体声明，实际中文显示另经LibreOffice与逐页渲染检查。

## 未测步骤与边界

PPTX不嵌入字体，先安装包内字体再试改文字、棋子并进入演示者备注。PowerPoint/Google Slides应在实际设备重新逐页看换行与备注；当前通过的是LibreOffice无界面实际打开和渲染。
A4横向打印一页气环、一页眼形，适合可打印区域，不裁切；摘要A4竖向100%。用投影从教室后排看文字/棋形，再让真人按5–7分钟试讲调整。上述实体尺寸、阅读、现场投影和排练未执行。
规则核查只针对列明的局面和分支；不是通用死活判定。上游humanReviewed为null。未记录学生反馈、CAS工时、实施成效或活动照片。