#!/usr/bin/env python3
"""Rebuild SVG, printable cards, complete answer booklet and teaching notes."""
import json, html, hashlib
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor

ROOT=Path(__file__).resolve().parents[1]
B=json.loads((ROOT/'t09/bundle.json').read_text()); M=json.loads((ROOT/'t09/pedagogy.json').read_text())['items']
COLS='ABCDEFGHJKLMNOPQRST'; FONT='T09-CJK'
pdfmetrics.registerFont(TTFont(FONT,'/Library/Fonts/Arial Unicode.ttf'))
def coord(p,n):return COLS[p['col']]+str(n-p['row'])
def cp(x):return x.get('initialPosition',x.get('position'))
def label(x):return f"{x['id']}  r{x['revision']}"
def status(x):
 p=cp(x);return f"完整 {p['size']}×{p['size']}"+(' 小棋盘练习' if p['size']==5 else ' 棋盘')+'　'+('黑方' if p['toPlay']=='B' else '白方')+'轮次　'+('新教学起点' if x['kind']=='Puzzle' else '未完／争议反例' if x['status']=='unsettled' else '明确教学假设')
def targetmap(x):
 return {(p['row'],p['col']):str(i+1) for i,m in enumerate(x.get('targetMarkers',[])) for p in m['points']}
def authored_assumptions(x):
 raw=x['assumptions'] if x['kind']=='TerminalFixture' else x['conditions']['assumptions'][4:]
 return [a.replace('confirmedBy 保持空数组。','').replace('本例 expectedScore=null，禁止展示最终得分或胜者。','本例不提供最终得分或胜者。') for a in raw]
def coordinate_text(x):
 p=cp(x);return '；'.join(('黑' if color=='B' else '白')+'：'+(' '.join(coord(s,p['size']) for s in p['stones'] if s['color']==color) or '无') for color in ['B','W'])
def answer_text(x):
 m=M[x['id']]; parts=[m['explanation']]
 if x['kind']=='Puzzle' and x['answer']['type']=='move-tree':
  parts+=['变化：'+'；'.join(' → '.join(('黑' if (cp(x)['toPlay']=='B')==(i%2==0) else '白')+v for i,v in enumerate(l['moves']))+'（'+('本题成功' if l['outcome']=='success' else '本题未达标')+'）' for l in m['lines'])]
 if x.get('answer',{}).get('type')=='region-labels':parts+=['逐点答案：'+'；'.join(coord(v['at'],cp(x)['size'])+'='+{'B':'黑围空','W':'白围空','neutral':'中立'}[v['owner']] for v in x['answer']['labels'])+'。']
 if m.get('candidates'):parts += [c['consideration'] for c in m['candidates']]
 if x.get('expectedScore'):
  s=x['expectedScore'];parts+=['围空明细：黑 '+(' '.join(coord(p,5) for p in s['blackTerritory']) or '无')+'；白 '+(' '.join(coord(p,5) for p in s['whiteTerritory']) or '无')+'；中立 '+(' '.join(coord(p,5) for p in s['neutralPoints']) or '无')+'。']
 if m.get('komiScenarios'):parts+=['另开情境比较：'+ '；'.join(f"贴目 {v['komi']}，黑 {v['blackTotal']}，白 {v['whiteTotal']}" for v in m['komiScenarios'])+'。']
 return '\n'.join(parts)
def svg(x):
 p=cp(x);n=p['size'];m=targetmap(x);span=470;step=span/(n-1);ox=65;oy=100
 esc=html.escape
 a=[f'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="650" viewBox="0 0 600 650" role="img" aria-labelledby="title desc">',f'<title id="title">{esc(label(x)+" "+M[x["id"]]["title"])}</title>',f'<desc id="desc">完整{n}乘{n}棋盘，左上row=0，列向右，行号自下向上；目标数字为题目标记。{esc(coordinate_text(x))}</desc>',f'<metadata>{esc(json.dumps(dict(schemaVersion=1,id="SVG-"+x["id"],revision=x["revision"],rulesetId=x["rulesetId"],contentRef=dict(id=x["id"],revision=x["revision"])),ensure_ascii=False))}</metadata>', '<rect width="600" height="650" fill="white"/>',f'<g font-family="Arial Unicode MS, PingFang SC, sans-serif" fill="#172a32"><text x="30" y="32" font-size="21">{label(x)} · {n}×{n}'+(' 小棋盘' if n==5 else ' 完整棋盘')+'</text><text x="30" y="61" font-size="16">上方 row=0；列 A →；显示行号自下向上</text></g>', '<g stroke="#78746a" stroke-width="1.4">']
 for i in range(n):
  v=ox+i*step;h=oy+i*step;a += [f'<line x1="{v}" y1="{oy}" x2="{v}" y2="{oy+span}"/>',f'<line x1="{ox}" y1="{h}" x2="{ox+span}" y2="{h}"/>']
 a+=['</g><g font-family="Arial Unicode MS, sans-serif" text-anchor="middle" fill="#172a32" font-size="19">']
 for i in range(n):a+=[f'<text x="{ox+i*step}" y="{oy+span+34}">{COLS[i]}</text>',f'<text x="35" y="{oy+i*step+7}">{n-i}</text>']
 a+=['</g>'];rad=min(24,step*.42)
 for s in p['stones']:
  cx=ox+s['col']*step;cy=oy+s['row']*step;c=s['color'];a += [f'<circle data-row="{s["row"]}" data-col="{s["col"]}" data-color="{c}" cx="{cx}" cy="{cy}" r="{rad}" fill="{"#20272a" if c=="B" else "#fff"}" stroke="#20272a" stroke-width="2"/>']
  if (s['row'],s['col']) in m:a += [f'<text x="{cx}" y="{cy+7}" text-anchor="middle" font-family="Arial Unicode MS, sans-serif" font-size="20" fill="{"white" if c=="B" else "#172a32"}">{m[s["row"],s["col"]]}</text>']
 a+=[f'<text x="30" y="638" font-size="15" font-family="Arial Unicode MS, sans-serif" fill="#43535b">{esc("数字=目标；"+ ("黑方" if p["toPlay"]=="B" else "白方")+"轮次；新教学起点")}</text></svg>']
 return '\n'.join(a)
def wrapped(text,width,size):
 lines=[]
 for raw in str(text).split('\n'):
  line=''
  for ch in raw:
   if pdfmetrics.stringWidth(line+ch,FONT,size)>width and line:lines.append(line);line=ch
   else:line+=ch
  lines.append(line)
 return lines
def text(c,t,x,y,w,size=10.5,leading=None,color='#253b45'):
 leading=leading or size*1.5;c.setFont(FONT,size);c.setFillColor(HexColor(color))
 for line in wrapped(t,w,size):c.drawString(x,y,line);y-=leading
 return y
def board(c,x,left,bottom,width):
 p=cp(x);n=p['size'];m=targetmap(x);margin=23;span=width-margin*2;step=span/(n-1);ox=left+margin;oy=bottom+width-margin
 c.setStrokeColor(HexColor('#928d82'));c.setLineWidth(.6)
 for i in range(n):v=ox+i*step;h=oy-i*step;c.line(v,oy,v,oy-span);c.line(ox,h,ox+span,h)
 c.setFont(FONT,9);c.setFillColor(HexColor('#233a43'))
 for i in range(n):c.drawCentredString(ox+i*step,bottom-3,COLS[i]);c.drawRightString(left+3,oy-i*step-3,str(n-i))
 rad=min(12,step*.41)
 for s in p['stones']:
  cx=ox+s['col']*step;cy=oy-s['row']*step;c.setFillColor(HexColor('#20272a' if s['color']=='B' else '#ffffff'));c.setStrokeColor(HexColor('#20272a'));c.setLineWidth(.85);c.circle(cx,cy,rad,stroke=1,fill=1)
  if (s['row'],s['col']) in m:c.setFillColor(HexColor('#ffffff' if s['color']=='B' else '#20272a'));c.setFont(FONT,min(10,rad));c.drawCentredString(cx,cy-3,m[s['row'],s['col']])
def footer(c,num,total,kind):
 text(c,f'T09 · {kind} · 0.2.0-t09.1 · GO-CLUB-AREA-1',32,22,470,8)
 c.setFont(FONT,8);c.drawRightString(A4[0]-30,22,f'{num} / {total}')
def answer_pages():
 output=ROOT/'print/T09_答案册.pdf';c=canvas.Canvas(str(output),pagesize=A4);c.setTitle('T09 30 道挑战与 6 个终局示例 · 答案册 r1');records=[]
 for idx,x in enumerate(B['items'],1):
  m=M[x['id']];p=cp(x);text(c,label(x)+'  '+m['title'],32,800,530,16);text(c,status(x),32,775,530,9.5)
  board(c,x,28,506,240)
  y=735;prompt=x.get('prompt','请根据明确状态与假设逐项核对本例。')
  y=text(c,'问题',292,y,270,11,color='#0b756c');y=text(c,prompt,292,y-3,270,11)
  if x['kind']=='Puzzle' and x['answer']['type']=='reason-choice':y=text(c,'\n'.join(z['optionId']+'：'+z['text'] for z in x['answer']['options']),292,y-3,270,10)
  short_assumptions=authored_assumptions(x)
  if short_assumptions:y=text(c,'条件：'+' '.join(short_assumptions),292,y-5,270,9.5)
  if y<490:raise ValueError(f'right block overflow {x["id"]}: {y}')
  y=477
  blocks=[('答案与解释',answer_text(x)),('成功标准',m['success']),('三层提示','\n'.join(str(i+1)+'. '+h for i,h in enumerate(x.get('hints',m.get('hints',[]))))),('常见错误',m['commonErrors']),('同伴讨论',m['peerDiscussion']),('完整坐标',coordinate_text(x))]
  for title,body in blocks:
   y=text(c,title+'：'+body,32,y,530,9.7,14.1);y-=5
  if y<52:raise ValueError(f'answer page overflow {x["id"]}: {y}')
  text(c,'来源：原创题图与模型推导；一般概念参照 BGA How to Play。完整来源与验证见配套说明。',32,46,530,7.7)
  footer(c,idx,36,'答案册');records.append(dict(id=x['id'],page=idx,revision=x['revision'],lowestBodyBaseline=y));c.showPage()
 c.save();return records
def cards():
 c=canvas.Canvas(str(ROOT/'print/T09_挑战卡_A4.pdf'),pagesize=A4);c.setTitle('T09 题目卡 · 每张 A4 两卡 · r1');items=B['items'];records=[]
 for pg in range(18):
  for half in range(2):
   x=items[pg*2+half];m=M[x['id']];top=808-half*410
   text(c,label(x)+'  '+m['title'],32,top,530,14)
   text(c,status(x),32,top-23,530,9)
   prompt=x.get('prompt','读给定假设，分别计算黑、白活子、围空、中立点与贴目。' if x.get('status')!='unsettled' else '本例可以给出最终得分吗？说明下一步怎样处理。')
   text(c,prompt,32,top-47,530,10.5)
   board(c,x,27,top-320,218)
   yy=top-112
   conditions=authored_assumptions(x)
   if conditions:yy=text(c,'条件：'+' '.join(conditions),264,yy,296,9.5,14)
   if x['kind']=='Puzzle' and x['answer']['type']=='reason-choice':yy=text(c,'\n'.join(z['optionId']+'：'+z['text'] for z in x['answer']['options']),264,yy,296,10,15)
   if x['kind']=='Puzzle' and x['category']=='DISC':yy=text(c,'反馈关注：具体依据、对方回应、听取同伴。不设唯一最佳手。',264,yy,296,10,15)
   yy=text(c,'我的回答／同伴的想法：',264,yy-12,296,10)
   for i in range(3):c.setStrokeColor(HexColor('#c5cecc'));c.line(264,yy-16-i*22,560,yy-16-i*22)
   text(c,'数字是目标标记。显示坐标从左至右，行号自下向上。可选题、可讨论、可直接对弈。',32,top-350,530,8)
   if yy-60<top-338:raise ValueError(f'card overflow {x["id"]}: {yy-top}')
   records.append(dict(id=x['id'],page=pg+1,half=half+1,revision=x['revision']))
  c.setDash(3,3);c.setStrokeColor(HexColor('#9ba8a5'));c.line(25,422,570,422);c.setDash();footer(c,pg+1,18,'A4 两卡 · 100% 打印');c.showPage()
 c.save();return records
def markdown():
 out=['---','schemaVersion: 1','id: T09-ANSWER-BOOK','revision: 1','rulesetId: GO-CLUB-AREA-1','---','','# T09 答案册','','内容版本：0.2.0-t09.1。30 题与 6 个 END 独立计数。所有题目 revision=1。', '', '可以任选类别、跳过已掌握内容，或直接参加对弈。5×5 均是真实小棋盘；数值参数为教学选择。开放题以依据、回应和倾听反馈，不设唯一最佳手。', '', '人类专业审题与实体课堂试用尚未进行。内容已按明确范围完成模型推导、结构检查与原引擎核查。', '', '术语沿用前置工程 docs/TERMINOLOGY.md。气（liberty）、打吃（atari）、提子（capture）、连接（connection）、真眼（true eye）、假眼（false eye）、贴目（komi）、面积计分（area scoring）在首次相关题出现。', '', '来源见 [SOURCES](../t09/SOURCES.md)，检查见 [validation-report](../validation-report.md)。','','## 目录','']
 out+=['- '+x['id']+'：'+M[x['id']]['title'] for x in B['items']]
 for x in B['items']:
  m=M[x['id']];out+=['',f"## {label(x)}　{m['title']}",'',status(x),'',f"![{x['id']} 完整棋形](../artwork/{x['id']}.svg)",'',x.get('prompt','请按本例状态与假设判断，再逐项核对。'),'','完整坐标：'+coordinate_text(x),'','条件：'+' '.join(authored_assumptions(x) or ['见完整棋盘；仅按题干即时或有限目标作答。']),'','成功标准：'+m['success'],'','### 答案与解释','',answer_text(x),'','### 三层提示','']
  out += [str(i+1)+'. '+h for i,h in enumerate(x.get('hints',m.get('hints',[])))]
  out += ['', '常见错误：'+m['commonErrors'],'','同伴讨论：'+m['peerDiscussion'],'']
  if x['kind']=='Puzzle':out+=['建议难度：'+x['difficulty']['level']+'。依据：'+x['difficulty']['rationale'],'']
  if x.get('answer',{}).get('type')=='open-text':out+=['开放量规：']+['- '+c for c in x['answer']['criteria']]+['']
  if m.get('supplementalLines'):
   out+=['补充合法变化：']
   for l in m['supplementalLines']:out+=['- '+' → '.join(('黑' if v['color']=='B' else '白')+('停手' if v['type']=='pass' else coord(v['at'],cp(x)['size'])) for v in l['moves'])+'：'+l['claim']]
  out+=['','验证：结构、合法起点、已记载变化、适用答案目标与外部概念参考分别记录于 validation/results.json 的同 ID 条目。humanReviewed=null。未覆盖的合法手为 unknown。']
 (ROOT/'print/T09_答案册.md').write_text('\n'.join(out)+'\n')
def main():
 for x in B['items']:(ROOT/'artwork'/f"{x['id']}.svg").write_text(svg(x))
 markdown();ans=answer_pages();card=cards()
 report=dict(schemaVersion=1,id='T09-PAGE-MAP',revision=1,rulesetId='GO-CLUB-AREA-1',kind='PageMap',answerPages=ans,cardPages=card)
 (ROOT/'validation/page-map.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print('Generated 36 SVGs, 36-page answer PDF/Markdown and 18-page A4 card PDF.')
if __name__=='__main__':main()
