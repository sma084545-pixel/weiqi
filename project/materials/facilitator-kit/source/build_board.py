from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.units import mm
from pypdf import PdfReader,PdfWriter
from pdf2image import convert_from_path
import os
K=Path(__file__).resolve().parents[1];R=K.parents[1];O=K/'output'
pdfmetrics.registerFont(TTFont('NotoSC',str(R/'materials/micro-lessons/assets/fonts/NotoSansSC-Regular.ttf')))
f=O/'T23_board_5x5_A4.pdf';c=canvas.Canvas(str(f),pagesize=(210*mm,297*mm));c.setTitle('完整 5 路教学示意棋盘');c.setFont('NotoSC',16);c.drawString(25*mm,270*mm,'完整 5 路教学示意棋盘');c.setFont('NotoSC',11);c.drawString(25*mm,260*mm,'A4 原尺寸 100% 打印　格距 30 mm　完整真实盘边')
lines=[]
for i in range(5):
 x=45+i*30;y=65+i*30;c.line(x*mm,112*mm,x*mm,232*mm);c.line(45*mm,(297-y)*mm,165*mm,(297-y)*mm)
 lines += [f'<line x1="{x}" y1="65" x2="{x}" y2="185"/>',f'<line x1="45" y1="{y}" x2="165" y2="{y}"/>']
 c.drawCentredString(x*mm,240*mm,'ABCDE'[i]);c.drawCentredString(35*mm,(297-y)*mm-3,str(5-i))
c.setFont('NotoSC',11);c.drawString(25*mm,80*mm,'棋子放交叉点；配 18 mm 纸棋子。摆棋示意不等于合法棋谱。');c.drawString(25*mm,65*mm,'校准线应为 50 mm；请勿使用适合页面缩放。');c.line(25*mm,40*mm,75*mm,40*mm);c.drawString(25*mm,30*mm,'T23-BOARD-5 r1　GO-CLUB-AREA-1');c.save()
w=PdfWriter();w.append(PdfReader(f));w.add_metadata({'/SchemaVersion':'1','/StableId':'T23-BOARD-5','/Revision':'1','/RulesetId':'GO-CLUB-AREA-1'});w.write(f)
(O/'T23_board_5x5_A4.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297"><metadata>schemaVersion=1 id=T23-BOARD-5 revision=1 rulesetId=GO-CLUB-AREA-1</metadata><rect width="210" height="297" fill="white"/><g stroke="black" stroke-width="0.3">'+''.join(lines)+'</g><g font-family="Noto Sans SC, sans-serif" fill="black" font-size="4"><text x="25" y="27">完整 5 路教学示意棋盘　A4 100% 打印</text>'+''.join(f'<text x="{45+i*30}" y="56" text-anchor="middle">{"ABCDE"[i]}</text><text x="35" y="{66+i*30}" text-anchor="middle">{5-i}</text>' for i in range(5))+'<text x="25" y="217">完整盘边　格距 30 mm　配 18 mm 纸棋子</text><text x="25" y="267">T23-BOARD-5 r1　校准线 50 mm</text></g><line x1="25" y1="257" x2="75" y2="257" stroke="black" stroke-width="0.3"/></svg>')
os.environ['PATH']='/Users/maxiao/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/override:'+os.environ.get('PATH','')
d=K/'validation/rendered/T23_board_5x5_A4';d.mkdir(parents=True,exist_ok=True);convert_from_path(str(f),dpi=140)[0].save(d/'page-1.png')
print('Board A4, 5+5 lines, 25 intersections, 30 mm pitch, calibration 50 mm')
