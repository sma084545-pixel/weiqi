from pathlib import Path
import json, html, math
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.units import mm
from pypdf import PdfReader, PdfWriter, Transformation
R=Path(__file__).resolve().parents[1]
FONT='/System/Library/Fonts/STHeiti Light.ttc'
import os
FONT=os.environ.get('T20_FONT',FONT)
pdfmetrics.registerFont(TTFont('CJK',FONT))
D=json.loads((R/'data/diagram-index.json').read_text())['demos']
META={'schemaVersion':1,'id':'T20-CARD-MANIFEST','revision':1,'rulesetId':'GO-CLUB-AREA-1','baseVersion':'0.2.0','resultVersion':'0.2.0-t20.1'}
manifest=[]; measurements=[]
INK='#192E32'; ACC='#235B60'; PALE='#EDF3F2'
class Card:
 def __init__(self,name,title,sub,pair,w=148,h=210):
  self.name=name;self.w=w;self.h=h;self.pair=pair;self.svg=[];self.texts=[]
  self.c=canvas.Canvas(str(R/'pdf'/f'{name}.pdf'),pagesize=(w*mm,h*mm))
  self.c.setTitle(title+' | '+pair);self.c.setAuthor('Go Club · T20 原创教学材料')
  self.c.setSubject(f'schemaVersion=1; id=T20-{name}; revision=1; rulesetId=GO-CLUB-AREA-1')
  self.rect(0,0,w,5,ACC,ACC);self.text(10,16,title,19 if w>110 else 16)
  self.text(10,24,sub,9,ACC)
  self.line(10,h-17,w-10,h-17,'#A0AFAF',.25)
  self.text(10,h-12,pair+'  |  GO-CLUB-AREA-1',7)
  self.text(10,h-8,f'T20-{name} · schemaVersion 1 · revision 1',6)
 def text(self,x,y,s,size=11,color=INK):
  width=pdfmetrics.stringWidth(s,'CJK',size)/mm
  assert x+width<=self.w-7+0.1,(self.name,s,width,x)
  assert y<=self.h-6,(self.name,y,s)
  if len(self.texts)>3: assert y<=self.h-20,(self.name,'footer collision',y,s)
  self.c.setFillColor(color);self.c.setFont('CJK',size);self.c.drawString(x*mm,(self.h-y)*mm,s)
  self.svg.append(f'<text x="{x}" y="{y}" font-family="Heiti SC, Noto Sans CJK SC, sans-serif" font-size="{size/mm:.5f}" fill="{color}">{html.escape(s)}</text>')
  self.texts.append(s);measurements.append({'card':self.name,'text':s,'sizePt':size,'rightMm':round(x+width,3),'baselineMm':y})
 def para(self,y,s,size=11,leading=6,x=10,width=None):
  width=width or self.w-x-10;line=''
  for char in s:
   if char=='\n' or pdfmetrics.stringWidth(line+char,'CJK',size)/mm>width:
    self.text(x,y,line,size);y+=leading;line='' if char=='\n' else char
   else:line+=char
  if line:self.text(x,y,line,size);y+=leading
  return y
 def section(self,y,label):
  self.rect(10,y-4,self.w-20,8,PALE,PALE);self.text(12,y+1,label,11,ACC);return y+12
 def line(self,x1,y1,x2,y2,color=INK,sw=.3):
  self.c.setStrokeColor(color);self.c.setLineWidth(sw*mm);self.c.line(x1*mm,(self.h-y1)*mm,x2*mm,(self.h-y2)*mm)
  self.svg.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{sw}"/>')
 def rect(self,x,y,w,h,fill='none',stroke=INK,sw=.3):
  self.c.setLineWidth(sw*mm);self.c.setStrokeColor(stroke)
  if fill!='none':self.c.setFillColor(fill)
  self.c.rect(x*mm,(self.h-y-h)*mm,w*mm,h*mm,fill=int(fill!='none'),stroke=1)
  self.svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')
 def circle(self,x,y,r,fill='none',stroke=INK,sw=.3):
  self.c.setStrokeColor(stroke);self.c.setLineWidth(sw*mm)
  if fill!='none':self.c.setFillColor(fill)
  self.c.circle(x*mm,(self.h-y)*mm,r*mm,fill=int(fill!='none'),stroke=1)
  self.svg.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')
 def board(self,key,x,y,span=40,lib=False,target=None,marks=None):
  demo=D['RULE-DEMO-T20-'+key];g=span/4
  for i in range(5):
   self.line(x,y+i*g,x+span,y+i*g,'#607173',.23);self.line(x+i*g,y,x+i*g,y+span,'#607173',.23)
   self.text(x+i*g-1,y-6,'ABCDE'[i],8);self.text(x-8,y+i*g+1,str(5-i),8)
  self.text(x+span+8,y+span,key,6.5) if key=='SCORE' else self.text(x,y+span+4,key,6.5)
  for st in demo['position']['stones']:
   self.circle(x+st['col']*g,y+st['row']*g,g*.38,'#151B1D' if st['color']=='B' else '#FFFFFF',INK,.32)
  if lib:
   for q in demo['liberties']:self.circle(x+q['col']*g,y+q['row']*g,g*.13,'#FFFFFF',INK,.3)
  if target:
   row,col=target;xx=x+col*g;yy=y+row*g
   self.line(xx,yy-1.6,xx-1.6,yy+1.4,ACC,.5);self.line(xx-1.6,yy+1.4,xx+1.6,yy+1.4,ACC,.5);self.line(xx+1.6,yy+1.4,xx,yy-1.6,ACC,.5)
  for row,col,label in marks or []:self.text(x+col*g-1.1,y+row*g+1.2,label,8)
 def finish(self):
  self.c.save()
  meta={**META,'id':'T20-'+self.name,'pair':self.pair,'widthMm':self.w,'heightMm':self.h}
  svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w}mm" height="{self.h}mm" viewBox="0 0 {self.w} {self.h}"><title>{self.name}</title><metadata>{html.escape(json.dumps(meta))}</metadata>'+''.join(self.svg)+'</svg>'
  (R/'source'/f'{self.name}.svg').write_text(svg)
  manifest.append({**meta,'pdf':f'pdf/{self.name}.pdf','editable':f'source/{self.name}.svg','text':self.texts})

c=Card('01-main-front','边下边查 · 落子与提子','完整对弈 quick reference · 正面','01 正面 ↔ 01 背面')
y=c.para(35,'棋子（stone）放在交叉点（intersection）。\n空盘黑先，黑白轮流；每次落一颗在空点。',10.5,5.5)
c.text(10,53,'上下左右直接相连',11);c.text(79,53,'整块的气一起数',11)
c.board('CONNECT',17,63,40);c.board('LIBERTY',86,63,40,True)
c.para(112,'B4、C4相连；\nD3斜邻C4，不相连。',10,5,x=10,width=61)
c.para(112,'气（liberty）共7口。\n小气环C3被共享，只算1次。',10,5,x=77,width=61)
c.text(10,130,'只剩1气叫打吃（atari），还没有被提掉。',10.5)
c.board('CAPTURE-BEFORE',17,141,32,target=(2,3));c.board('CAPTURE-AFTER',91,141,32)
c.text(58,155,'黑D3',10);c.text(58,163,'→',16)
c.text(10,182,'提子（capture）：填掉最后一气，提走对方整块。',10.5)
c.text(10,189,'全图为完整5×5小棋盘练习；上为5行，左为A列。',8)
c.finish()

c=Card('02-main-back','边下边查 · 如何结束','完整对弈 full game · 背面','01 背面 ↔ 01 正面')
y=c.section(36,'01  想不到要下哪里？可以停一手')
y=c.para(y,'停一手（pass）就是本轮不落子，换对方。\n双方连续两次停手，进入终局确认\n（end confirmation），还不是自动结束。')
y=c.section(y+3,'02  两人一起确认，再数分')
y=c.para(y,'共同确认死子与中立点；不自动判死。\n有争议就恢复对弈，实际演示；详见补充卡。\n只在计分副本中移除双方同意的死子。')
y=c.section(y+3,'03  面积计分（area scoring）')
y=c.para(y,'黑分＝黑活子数＋黑围空点数。\n白分＝白活子数＋白围空点数＋贴目。\n围空（territory）指仅由一方棋子围住的空区。\n提子数不再额外加分；中立点双方都不计。',10.5,5.8)
y=c.para(y+2,'贴目（komi）开局说好，默认0，可和棋。\n默认0是社团教学选择，不是官方标准。',10.5,5.8)
y=c.para(y+3,'禁着提醒：提完敌子后，己方新棋块仍无气，\n是自杀（suicide），禁止。劫（ko）不能立即\n回提重现旧盘面；更长重复也禁，见02补充卡。',10.5,5.8)
c.finish()

c=Card('03-detail-front','两种容易混淆的落点','详细补充卡 · 图示','02 正面 ↔ 02 背面')
c.text(10,36,'先提子，获得气：这一手可以下',12)
c.board('LEGAL-BEFORE',19,48,38,target=(0,0));c.board('LEGAL-AFTER',92,48,38)
c.text(65,67,'→',16)
c.para(96,'黑下A5（三角目标），先提白B5与A4。\n黑A5因此得到2气；这个新教学起点中合法。',10.5,6)
c.text(10,116,'劫（ko）：立即回提会重现旧棋盘',12)
c.board('KO-BEFORE',19,128,38,target=(2,3));c.board('KO-AFTER',92,128,38,target=(2,2))
c.text(65,149,'→',16)
c.para(175,'黑D3提白C3。白若立即下C3回提黑D3，\n就回到左图，禁止；不是隔一手就一定能提。',10.5,5.5)
c.text(10,189,'完整5×5练习；上5左A；左→右；三角是目标非棋子。',8)
c.finish()

c=Card('04-detail-back','规则不随卡片简化而改变','详细补充卡 · 学生与带领者共用','02 背面 ↔ 02 正面')
y=c.section(36,'位置超级劫（positional superko）')
y=c.para(y,'落子完成提子后，棋子布局不能与本局当前\n有效路径中的任何先前布局相同，含初始布局。\n只比较棋子，不看下一手颜色；长重复也禁止。\n停手免重复检查，但不清空历史。',10.5,5.8)
y=c.section(y+3,'争议如何恢复')
y=c.para(y,'保留原棋盘、轮次、重复历史；停手数归零，\n清除预览标记。争议方按轮次实际演示；\n另一方可合法停手。未达一致则保留未解决。',10.5,5.8)
y=c.section(y+3,'落子与撤回')
y=c.para(y,'先查轮次、坐标、占用；暂放己子，同时提走\n相邻无气敌块；再查己方气、重复。无效动作\n不改历史、轮次、计数。撤回恢复棋盘、轮次、\n提子数、停手数、终局状态、重复历史、上一手。',10.5,5.8)
y=c.section(y+3,'眼与摆棋的边界')
y=c.para(y,'两个可靠保护的独立真眼（true eyes）是基础\n活棋形，不是两个空点，也非所有活棋都需要；\n双活（seki）存在。不自动判定任意棋块死活。\n摆棋（setup）可任选颜色或擦除，不是棋谱。\n转规则模式须验证局面、轮次，建立新历史，\n明确说明之前历史未知。',10.5,5.8)
c.finish()

c=Card('05-score','一起算一次 · 面积计分','计分例卡 · 完整5×5小棋盘教学算例','03 正面（计分）↔ 03 背面（路线）')
c.para(35,'明确教学假设：盘上棋子均按活子计、无死子；\nA3–E3为中立点。这不证明棋形无条件活。',10.5,5.7)
c.board('SCORE',49,58,48,marks=[(0,2,'a'),(4,2,'b')]+[(2,i,'×') for i in range(5)])
c.para(117,'上为5行，左为A列。目标：分别数活子和围空。\na＝黑围空C5；b＝白围空C1；×＝中立点。',10.5,5.7)
y=c.section(135,'开局贴目0：黑10，白10，和棋')
y=c.para(y,'黑：9颗活子＋1个围空＝10。\n白：9颗活子＋1个围空＋0贴目＝10。\n中立点（neutral point / dame）：A3–E3共5点。\n核对：18颗子＋2个围空＋5个中立＝25点。',10.5,5.7)
c.para(y+2,'提子不另加分。另开一例若贴目0.5，白为10.5。\n默认0、允许和棋是教学约定；不是官方标准。\n未完成对局的染色只是预览，不是最终胜负。',10,5.5)
c.finish()

c=Card('06-pathway','今天想从哪里开始？','自选学习路线 · 可跳过、重访，也可直接对弈','03 背面（路线）↔ 03 正面（计分）')
stages=[('01  交叉点、连接与气','摆3颗同色子，逐一点出整块不重复的气。'),('02  打吃、提子 → 吃子小游戏','先指出一气形，再玩一轮“首提即止”。'),('03  完成一盘9×9','试下完整一盘；两停后一起确认与计分。'),('04  连接与切断','选一步连接，再试同伴提出的一个回应。'),('05  眼（eye）与基础死活','说明为什么“两个空点”不一定是两真眼。'),('06  自选挑战与13×13','合作讨论一个挑战，或试一盘13×13。')]
y=36
for i,(title,goal) in enumerate(stages):
 c.text(10,y,title,12,ACC);c.text(10,y+7,goal,10.5)
 c.rect(10,y+11,3,3);c.text(15,y+14,'我想再试',10)
 c.rect(56,y+11,3,3);c.text(61,y+14,'我可以向同伴解释',10)
 y+=25
c.para(186,'阶段对应 STAGE-01–06；勾选可留空，不是考试或评级。',9,5)
c.finish()

c=Card('07-mini-front','吃子小游戏','capture-first · 独立小卡','04 正面 ↔ 04 背面',105,148)
y=c.section(36,'首个成功提子者立即获胜')
y=c.para(y,'可用完整5×5小棋盘练习，\n也可用9×9；空盘黑先。\n落子合法性仍按社团规则：\n禁止自杀和重复旧棋盘。',11,6.3)
y=c.para(y+4,'两人连续停手：本轮无胜者。\n一旦首提获胜，本轮立即结束；\n清空棋盘，重开新一轮。',11,6.3)
c.para(y+4,'本小游戏不看面积分。\n完整围棋按终局确认后的\n面积计分；别混用胜负目标。',11,6.3)
c.finish()
c=Card('08-mini-back','开局先说好','吃子小游戏 · 使用提示','04 背面 ↔ 04 正面',105,148)
y=c.para(37,'“这一轮玩吃子小游戏，\n先提到对方棋子就结束。”',12,7)
y=c.section(y+5,'每轮只留一个观察')
y=c.para(y,'我看见了哪一块的最后一气？\n下次想试保护它，还是去提子？\n可以交换黑白，也可以换活动。',11,6.3)
y=c.section(y+5,'想下一盘完整围棋？')
y=c.para(y,'换9×9，先确定贴目。\n使用01规则卡和03计分卡；\n提子后继续下，不以首提决胜。\n随时可选旁观或同伴讨论。',11,6.3)
c.finish()

def combine(names,path):
 writer=PdfWriter()
 for name in names:writer.append(R/'pdf'/f'{name}.pdf')
 writer.add_metadata({'/Title':path,'/Subject':'schemaVersion=1; id=T20-'+path+'; revision=1; rulesetId=GO-CLUB-AREA-1'})
 with (R/'pdf'/f'{path}.pdf').open('wb') as f:writer.write(f)
names=[v['pdf'].split('/')[-1][:-4] for v in manifest]
combine(names[:2],'main-rule-A5-duplex');combine(names[2:4],'detailed-A5-duplex');combine(names[6:],'capture-mini-A6-duplex');combine(names,'all-independent-cards')
# A4 landscape, two A5 panels: 0.5 mm spare width on each outside edge.
# Short-edge duplex preserves upright orientation for left/right panels.
def impose(pages,name,w=297,h=210,mini=False):
 writer=PdfWriter();layout=[]
 for index,items in enumerate(pages):
  page=writer.add_blank_page(w*mm,h*mm)
  slots=[(.5,0),(148.5,0)] if not mini else [(.5,0),(105.5,0),(.5,148),(105.5,148)]
  for nm,(x,y) in zip(items,slots):
   src=PdfReader(R/'pdf'/f'{nm}.pdf').pages[0]
   page.merge_transformed_page(src,Transformation().translate(x*mm,y*mm))
  layout.append({'page':index+1,'cards':items,'slotsMm':slots})
 writer.add_metadata({'/Title':name,'/Subject':'schemaVersion=1; id=T20-'+name+'; revision=1; rulesetId=GO-CLUB-AREA-1'})
 with (R/'pdf'/f'{name}.pdf').open('wb') as f:writer.write(f)
 return layout
layout=impose([[n,n] for n in names[:6]],'PRINT-A4-landscape-short-edge')
mini=[]
# Mini A6 is 105x148, so no side offset: 210 wide exactly.
# Correct mini slots explicitly below.
writer=PdfWriter()
for n in names[6:]:
 page=writer.add_blank_page(210*mm,297*mm)
 for x,y in [(0,.5),(105,.5),(0,148.5),(105,148.5)]:
  page.merge_transformed_page(PdfReader(R/'pdf'/f'{n}.pdf').pages[0],Transformation().translate(x*mm,y*mm))
writer.add_metadata({'/Subject':'schemaVersion=1; id=T20-PRINT-MINI; revision=1; rulesetId=GO-CLUB-AREA-1'})
with (R/'pdf/PRINT-A4-portrait-long-edge-mini.pdf').open('wb') as f:writer.write(f)
mini=[{'page':i+1,'cards':[n]*4,'slotsMm':[(0,.5),(105,.5),(0,148.5),(105,148.5)]} for i,n in enumerate(names[6:])]
(R/'data/card-manifest.json').write_text(json.dumps({**META,'cards':manifest,'A4landscape':layout,'A4portraitMini':mini},ensure_ascii=False,indent=2)+'\n')
(R/'validation/text-geometry.json').write_text(json.dumps({**META,'id':'T20-TEXT-GEOMETRY','checks':measurements},ensure_ascii=False,indent=2)+'\n')
print(f'Built {len(manifest)} editable SVG pages, independent and imposed PDFs.')
