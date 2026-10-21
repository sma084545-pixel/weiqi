from pathlib import Path
import json,hashlib
R=Path(__file__).resolve().parents[1];d=json.loads((R/'source/lessons.json').read_text());dc=json.loads((R/'qa/delivery-checks.json').read_text())
comments=['LIB-001原题面未揭答案；E5交叉点准确','LIB-001四气环与目标三角可区分','T20 CONNECT三子两块，斜邻不实连','LIB-004题面7气答案仅在备注','明确摆棋与对弈可选择','CAP-001题面黑先，答案未提前印出','CAP-001成功分支，白C3消失，黑D3数字1','T20 LEGAL先提两白再获得气，A5准确','CAP-002上边是真实边界，目标B5/C5','吃子小游戏首提即胜，双停无胜者','AREA-005给定比较账本非棋谱，明示活子/贴目假设','双停确认、争议继续、面积公式，提子不额外加分','T20简单劫完整前后图；PSK完整边界在备注','END-002全活/0贴目教学算例，无学生画面答案','完整9×9及小游戏目标区分、双停争议','CON-001目标两块，先问候选点','CON-001黑C3派生，三子实连','CON-001失败分支黑C2白C3；最后手数字2','CON-002题面，C4/B3两种答案仅在备注','9×9伙伴提出阻断点，允许实下回应','LIFE-002三个目标黑块，白先不预印答案','LIFE-002白C3提3目标；黑C2保留','LIFE-001独立真眼与LIFE-005相连空间；说明双活','LIFE-003黑先限定A5/B5/C5；答案留备注','复摆与9×9衔接、13×13可选，不绝对判死']
rows=[];g=0
for l in d['lessons']:
 for s in l['slides']:
  g+=1;p=R/f'qa/pdf-render/T22_All_25_r1/page-{g:02}.png';assert p.is_file()
  rows.append({'page':g,'slideId':s['id'],'lesson':l['id'],'role':s['role'],'title':s['title'],'visual':'passed','coordinates':'passed','notes':'passed','primaryTextAtLeast24pt':'passed','questionBeforeAnswer':'passed','evidence':str(p.relative_to(R)),'renderSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'observation':comments[g-1],'reviewer':'model visual inspection; not human teacher review'})
summary=[]
for i in range(1,6):
 p=R/f'qa/pdf-render/T22_Teacher_Summary_5pages_r1/page-{i}.png';summary.append({'page':i,'visual':'passed','observation':'A4单页，5个主讲步骤、目标、用具假设、预计时长、答案与对弈衔接均可读，无溢出','evidence':str(p.relative_to(R)),'renderSha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(R/'qa/page-by-page.json').write_text(json.dumps({'schemaVersion':1,'id':'T22-PAGE-QA','revision':1,'rulesetId':'GO-CLUB-AREA-1','freezeId':d['freezeId'],'date':'2026-10-05','scope':'25 unique final slides and 5 teacher summary pages; individual duplicate pages separately rendered and compared','slides':rows,'teacherSummary':summary,'humanReviewed':False},ensure_ascii=False,indent=2))
exact=sum(p['identical'] for p in dc['individualPdfPageComparisons'])
q=['---\nschemaVersion: 1\nid: T22-QA\nrevision: 1\nrulesetId: GO-CLUB-AREA-1\nfreezeId: GO-CLUB-FREEZE-B-20260919-01\n---\n\n# T22材料验收记录\n',
'检查日期2026-10-05。以下为工具检查和模型逐页视觉检查，不是人类教师审核。最终没有阻断数字材料用途的未解决错误。',
'\n|检查|结果|证据|\n|---|---|---|\n|冻结点B实际存在，两档归档冻结一致|通过|freeze-lock-check.json，558条记录/474个独特路径均匹配|\n|正式来源ID/revision、同版规则与图形|通过|assets/source-index.json、source/rendered-board-manifest.json|\n|有限规则/答案复核|通过|content-checks.json：47项，使用原版冻结引擎|\n|5×5主讲页、25合并页，无附加封面|通过|delivery-checks.json，六份finalizer报告|\n|50页结构、原生对象、坐标、字号、备注|通过|delivery-checks.json；主文24pt或更大，标题33pt|\n|六个PPTX在演示查看器实际导入|通过|viewer-open-and-pdf.log，LibreOffice Impress headless|\n|6份课件PDF+5页摘要共55页渲染/解码|通过|pdf-checks.json、pdf-render/、delivery-checks.json|\n|25页主讲与5页摘要逐页查看|通过|下表及page-by-page.json，最终PDF逐页全尺寸查看|\n|题面先于答案、无虚构记录/效果/测得时长|通过|逐页内容与备注，所有时间为预计|\n|灰度数字可辨性|通过|25页灰度渲染；2/9/23页查看气环、目标、黑白与眼形，非实体打印|\n|PPT字体随包/PDF字体嵌入|通过|assets/fonts/OFL.txt；PDF字体部件检查，PPT安装说明见README|\n|实体打印、教室投影、真人排练|未测|需现场设备与成员，步骤见README|\n|PowerPoint/Google Slides原生交互与人类教师审核|未测|未拥有这些查看器/审核过程；不冒称通过|',
f'\n独立PDF与合并对应页：{exact}对像素完全一致，{25-exact}对仅有少量字形边缘抗锯齿差异。原生几何、文字和备注一致。逐对容差和实测指标见delivery-checks.json。',
'\n## 25页最终检查\n\n每页检查文字溢出/遮挡、棋子位置、真实边界、标记、投影字号、题面/答案次序与完整备注；以下各项均通过。坐标不是凭视觉猜测，另外逐个解包比较原生形状中心与源坐标。\n\n|页|套/角色|页面|逐页观察|渲染证据|\n|---|---|---|---|---|']
for r in rows:q.append(f'|{r["page"]}|{r["lesson"]} / {r["role"]}|{r["title"]}|{r["observation"]}|{r["evidence"]}|')
q+=['\n## 5页教师摘要\n\n|页|主题|结果与证据|\n|---|---|---|']
for i,l in enumerate(d['lessons']):q.append(f'|{i+1}|{l["topic"]}|通过；pdf-render/T22_Teacher_Summary_5pages_r1/page-{i+1}.png|')
q+=['\n## 实际执行与修复\n',
'实际执行prepare-assets.py、verify-content.mjs、build-lessons.mjs、build-teacher-summary.py、LibreOffice导出、render-pdfs.py、verify-delivery.py；源Python编译与rebuild.sh语法检查通过。author-lessons.py实跑生成内容与最终lessons.json逐项相同。最终脚本与详细命令见handoff/T22.md。rebuild.sh整套从空目录重建未另行重复执行；其调用的各制作/验证步骤已实际执行，脚本语法已测。',
'早期长句换行、坐标标签留白及一张不完整PNG已修正。PNG改为逐页从渲染器完整输出后验证解码，再保存；最终55页均可完整解码。最终没有文字遮挡或坐标错误。fontPolicy校验只证明字体声明，实际中文显示另经LibreOffice与逐页渲染检查。',
'\n## 未测步骤与边界\n',
'PPTX不嵌入字体，先安装包内字体再试改文字、棋子并进入演示者备注。PowerPoint/Google Slides应在实际设备重新逐页看换行与备注；当前通过的是LibreOffice无界面实际打开和渲染。',
'A4横向打印一页气环、一页眼形，适合可打印区域，不裁切；摘要A4竖向100%。用投影从教室后排看文字/棋形，再让真人按5–7分钟试讲调整。上述实体尺寸、阅读、现场投影和排练未执行。',
'规则核查只针对列明的局面和分支；不是通用死活判定。上游humanReviewed为null。未记录学生反馈、CAS工时、实施成效或活动照片。']
(R/'qa/QA.md').write_text('\n'.join(q));print('recorded 25 slide and 5 summary visual QA entries')
