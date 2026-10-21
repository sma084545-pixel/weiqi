#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path
import json,re
R=Path(__file__).resolve().parents[1];D=R/'docs/merge-c'
load=lambda p:json.loads((R/p).read_text(encoding='utf-8'))
audit=load('docs/merge-c/checks/material-audit.json')
cards=load('materials/challenge-cards/CARD_INDEX.json')['items']
lessons=load('materials/micro-lessons/source/lessons.json')['lessons']
routeText=(R/'src/features/learning-hub/registry.ts').read_text()
routes=dict(re.findall(r"export const (\w+)='(#/[^']+)'",routeText))
slides=[]
for k,l in enumerate(lessons,1):
    for n,s in enumerate(l['slides'],1):
        slides.append(dict(id=s['id'],revision=s['revision'],title=s['title'],lessonId=l['id'],topic=l['topic'],combinedPage=(k-1)*5+n,individualPage=n,individualPptx=f'materials/micro-lessons/output/T22_MicroLesson_0{k}_r1.pptx',individualPdf=f'materials/micro-lessons/output/T22_MicroLesson_0{k}_r1.pdf',diagramKeys=[x['key'] for x in s['diagrams']]))
cat=dict(schemaVersion=1,id='MERGE-C-RESOURCE-CATALOG',revision=1,rulesetId='GO-CLUB-AREA-1',resultVersion='0.17.0-merge-c.1',programVersion='0.17.0',freezeId='GO-CLUB-FREEZE-B-20260919-01',pdfs=audit['pdfs'],decks=audit['decks'],cards=cards,slides=slides,routes=routes)
(D/'RESOURCE_CATALOG.json').write_text(json.dumps(cat,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
md=['---','schemaVersion: 1','id: MERGE-C-RESOURCE-CATALOG','revision: 1','rulesetId: GO-CLUB-AREA-1','---','','# T23 真实资源目录','','合并交付版本 **0.17.0-merge-c.1**；程序版本为 **T17 0.17.0**。冻结 ID：GO-CLUB-FREEZE-B-20260919-01。正式 30 题与 6 终局均 revision 1。页码从 1 开始；此目录不代表课堂实施或人类教师审核。','','材料位于完整工程的 materials/，没有自动加入应用离线缓存；请打开本地 PDF/PPTX。程序入口为已安装应用的 hash 路由，先按根 README 启动程序，再使用对应入口。相对文件链接以 docs/merge-c 为基准，复制时保持工程结构。','','## 五类材料','','| 任务 | 材料版本 | 内容 |','|---|---|---|','| T18 | 0.2.0-plus-t18.1 | 450mm 演示棋盘、A4 拼接、棋子与标记、装配说明 |','| T19 | 0.2.0-t19.1 | 9/13 路双人棋盘、透明覆盖、纸棋子、携带与归还页 |','| T20 | 0.2.0-t20.1 | 规则卡、计分卡、自由路线与吃子小游戏规则 |','| T21 | 0.15.1-t21.1 | 30 张双面卡、33 页答案册、60 个 SVG |','| T22 | 0.15.1-t22.1 | 五套各 5 页微课及合并 25 页、讲稿、5 页教师摘要 |','','## 实际 PDF 与页数','','| 文件 | 页数 | 页面尺寸 mm |','|---|---:|---|']
for p in audit['pdfs']:
    sizes='; '.join(f'{x[0]} × {x[1]}' for x in sorted(set(tuple(z) for z in p['pageSizesMm'])))
    md.append(f"| [{p['path']}](../../{p['path']}) | {p['pages']} | {sizes} |")
md+=['','## 挑战卡与答案册对应','','[正面](../../materials/challenge-cards/output/T21_challenge_cards_front_A4.pdf) / [背面](../../materials/challenge-cards/output/T21_challenge_cards_back_A4.pdf) / [教师答案册](../../materials/challenge-cards/output/T21_teacher_answer_book.pdf)。答案册前 3 页为说明与索引，题目从第 4 页开始。A4 纵向长边翻；先用 [2 页套准文件](../../materials/challenge-cards/output/T21_duplex_test_page1.pdf) 实体试印。程序进入 `#/challenges` 后按 ID 选择，没有另造单题深链。','','| ID | revision | 正面页/位置 | 背面页/位置 | 答案册页 |','|---|---:|---|---|---:|']
for c in cards:md.append(f"| {c['id']} | {c['revision']} | {c['frontPdfPage']}/{c['frontPosition']} | {c['backPdfPage']}/{c['backPosition']} | {c['teacherPage']} |")
md+=['','## 课件页码对应','','合并 [PPTX](../../materials/micro-lessons/output/T22_All_25_r1.pptx) / [PDF](../../materials/micro-lessons/output/T22_All_25_r1.pdf)；[25 页讲稿](../../materials/micro-lessons/source/speaker-notes.md)；[教师摘要 PDF](../../materials/micro-lessons/output/T22_Teacher_Summary_5pages_r1.pdf)。每课摘要页与独立套编号相同。所有幻灯片 revision 1。','','| 合并页 | 独立套/页 | 幻灯片 ID 与标题 | 棋形 key |','|---:|---|---|---|']
for s in slides:md.append(f"| {s['combinedPage']} | [{s['lessonId']}](../../{s['individualPptx']}) / {s['individualPage']} | {s['id']}：{s['title']} | {', '.join(s['diagramKeys']) or '无棋盘'} |")
md+=['','## 已安装程序入口','','| 常量 | 路由 |','|---|---|']
for k,v in routes.items():md.append(f'| {k} | `{v}` |')
md+=['','六阶段 `#/route/STAGE-01` 至 `#/route/STAGE-06` 可自由访问。END-001–006 在 `#/learn/territory` 内按编号切换；END-006 是未完/争议反例，不给伪最终赢家。','','## 编辑源与使用边界','','T18/T19/T20 保留生成器与 SVG；T21 保留 source、frozen-input 与 CARD_INDEX；T22 保留 source、assets、FILE_MANIFEST 及 QA。微课的文字、网格、棋子与标记为原生可编辑对象。PPTX 未嵌入中文字体，打开前安装包内 Noto Sans SC，或更换字体后复核。PDF 已嵌入字体。','','实体印刷、双面套准、真实 PowerPoint/Google Slides 交互、现场投影、真人排练、课堂使用和人类教师审核仍未测。本目录为 T23 提供输入，不表示已完成 T23/T24。']
(D/'RESOURCE_CATALOG.md').write_text('\n'.join(md)+'\n',encoding='utf-8')
print(f'Catalog: {len(audit["pdfs"])} PDFs, {len(cards)} cards, {len(slides)} slides, {len(routes)} routes')
