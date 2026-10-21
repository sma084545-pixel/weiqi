from pathlib import Path
import json
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from xml.sax.saxutils import escape
ROOT=Path(__file__).resolve().parents[1];d=json.loads((ROOT/'source/lessons.json').read_text());pdfmetrics.registerFont(TTFont('NotoSC',str(ROOT/'assets/fonts/NotoSansSC-Regular.ttf')))
c=canvas.Canvas(str(ROOT/'output/T22_Teacher_Summary_5pages_r1.pdf'),pagesize=A4)
c.setTitle('T22 五套微课教师备课摘要');c.setAuthor('Go Club materials T22');c.setSubject('schemaVersion=1; id=T22-TEACHER-SUMMARY; revision=1; rulesetId=GO-CLUB-AREA-1')
W,H=A4;md=['---\nschemaVersion: 1\nid: T22-TEACHER-SUMMARY\nrevision: 1\nrulesetId: GO-CLUB-AREA-1\nbaseVersion: 0.15.1\nresultVersion: 0.15.1-t22.1\nfreezeId: GO-CLUB-FREEZE-B-20260919-01\n---\n\n# 五套微课备课摘要\n']
def para(t,y,size=11.5,leading=17,color='#18231D'):
 s=ParagraphStyle('p',fontName='NotoSC',fontSize=size,leading=leading,textColor=color,wordWrap='CJK')
 p=Paragraph(escape(t).replace('\n','<br/>'),s);_,h=p.wrap(W-76,H);p.drawOn(c,38,y-h);return y-h
for i,l in enumerate(d['lessons']):
 c.setFillColorRGB(.09,.29,.2);c.setFont('NotoSC',12);c.drawString(38,H-40,f'T22  微课 {i+1}   教师备课摘要')
 y=para(l['topic'],H-57,22,29);y=para(l['goal'],y-16,12,18)
 y=para('准备：两人共用棋盘与黑白棋子；可用教师设备投影，或打印PPT的PDF。默认中学生、45分钟活动是可调整假设，不是已确认学校情况。',y-14,10.5,15)
 y=para('讲解预计6分钟：50 / 80 / 80 / 100 / 50秒，含约20 / 20 / 20 / 60 / 10秒停顿或互动。未进行真人排练；练习可继续，不设强制计时。',y-10,10.5,15)
 md.extend([f'\n## {i+1} {l["topic"]}\n\n目标：{l["goal"]}\n\n准备：两人共用棋盘、黑白棋子，教师设备与投影可选；默认中学生、约45分钟是可调整假设。\n\n预计讲解6分钟，未经真人排练；动手可继续。\n'])
 for j,s in enumerate(l['slides']):
  y=para(f'{j+1}. {s["role"]}（预计{s["estimatedSeconds"]}秒）  {s["title"]}',y-13,11.5,17,color='#174B32')
  q=f'提问：{s["notes"]["question"]}\n核对与回应：{s["notes"]["expected"]}'
  y=para(q,y-4,10.5,15)
  md.append(f'\n{j+1}. **{s["role"]}，{s["title"]}**（预计{s["estimatedSeconds"]}秒，互动{s["interactionSeconds"]}秒）\n\n{q}\n\n回应：{s["notes"]["response"]}\n')
 y=para('讲解后：'+l['practice'],y-14,10.5,15)
 if i==2:boundary='规则提醒：双停只进入确认，不自动判死。争议保留原盘与重复历史继续下；落子后任何旧布局重现都禁止，停手豁免且不清空历史。0贴目、允许和棋是教学选择。'
 elif i==4:boundary='规则提醒：可靠保护的两个独立真眼是基础活形，活棋还有双活等情况。主线只验证给定局面的有限目标，不宣称通用死活证明。'
 elif i==1:boundary='规则提醒：先提对方无气块，再检查己方气，再检查重复；吃子小游戏首提即止，不用面积决定胜负。'
 elif i==0:boundary='规则提醒：同色上下左右才算连通；整块的气为去重空点。摆棋可以任选颜色，与合法轮流对弈分开。'
 else:boundary='规则提醒：本手连接只达成即时目标，不保证永远安全。未收录候选手不能自动判错；先看理由，再用合法实下核对。'
 y=para(boundary,y-12,10,14);assert y>52,(i,y)
 md.append(f'\n讲解后：{l["practice"]}\n\n{boundary}\n\n版本与来源：冻结点B 0.15.1；T09 0.2.0-t09.1，T20 0.2.0-t20.1，全部使用revision 1。完整逐页讲稿、英文术语、扩展问题与来源见 speaker-notes.md 和各PPTX备注。\n')
 c.setFont('NotoSC',8);c.setFillColorRGB(.34,.39,.36);c.drawString(38,28,'GO-CLUB-AREA-1   冻结点B 0.15.1   T22 revision 1');c.drawRightString(W-38,28,f'{i+1} / 5');c.showPage()
c.save();(ROOT/'source/teacher-summary.md').write_text('\n'.join(md));print('teacher summary: 5 pages generated')
