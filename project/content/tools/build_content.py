#!/usr/bin/env python3
"""T09 authored content. No Go engine or generated answer oracle lives here."""
import json, copy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATE = '2026-09-07'
VERSION = '0.2.0-t09.1'
COLS = 'ABCDEFGHJKLMNOPQRST'
def identity(id, kind):
    return dict(schemaVersion=1, id=id, revision=1, rulesetId='GO-CLUB-AREA-1', kind=kind)
def put(path, obj):
    p=ROOT/path; p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
def pts(s,n=5):
    if not s: return []
    if isinstance(s,list): return copy.deepcopy(s)
    return [dict(row=n-int(v[1:]),col=COLS.index(v[0])) for v in s.split()]
def display(p,n=5): return COLS[p['col']]+str(n-p['row'])
def pos(id,b,w,n=5,turn='B'):
    return dict(**identity('POS-'+id,'Position'),size=n,stones=[dict(**p,color=c) for c,s in [('B',b),('W',w)] for p in pts(s,n)],toPlay=turn,historyPolicy='fresh-setup',history=None)
def move(s,color,n=5):
    return dict(type='pass',color=color) if s=='pass' else dict(type='place',color=color,at=pts(s,n)[0])
def source():
    return [dict(type='original',title='T09 原创题目、表达与坐标图',url=None,accessedAt=None,note='依据 GO-CLUB-AREA-1 自行设计和模型推导，未复制协会题图或网上题库。不是教师审题或学生记录。'),
            dict(type='reference',title='British Go Association: How to Play',url='https://www.britgo.org/intro/intro2.html',accessedAt=DATE,note='仅核对正交连接、气、提子与两眼的一般概念。自定义计分、停手及重复规则以项目约定为准；原创题目的正确性另行验证。')]
def validation(): return {k:None for k in ['structure','moveLegality','solutionChecked','externalReferenceChecked','modelChecked','humanReviewed']}
P=[]; E=[]; META={}; ORACLES={}
def puzzle(id,title,b,w,target,prompt,answer,hints,explanation,errors,discussion,success,rationale,n=5,turn='B',level='beginner',assumptions=None,oracle=None,lines=None):
    position=pos(id,b,w,n,turn)
    markers=[]
    for i,(color,s) in enumerate(target):
        markers.append(dict(markerId=f'target-{i+1}',type='target',points=pts(s,n),label=f'目标{i+1}：{s}',owner=color))
    conditions=[f'成功标准：{success}',f'常见错误：{errors}',f'同伴讨论：{discussion}', '新教学起点，过去劫史未知；从当前布局建立新历史，不宣称来自合法实战棋谱。']+(assumptions or [])
    q=dict(**identity(id,'Puzzle'),developmentOnly=False,category=id.split('-')[0],difficulty=dict(level=level,rationale=rationale),prompt=prompt,initialPosition=position,targetMarkers=markers,firstPlayer=turn,conditions=dict(boundary='full-board',external=f'真实完整 {n}×{n}'+(' 小棋盘练习' if n==5 else ' 棋盘')+'，图外无棋子，不使用裁切边缘。',assumptions=conditions,viewport=None),hints=hints,answer=answer,coveredBranches=[],sources=source(),validation=validation(),relatedContent=[])
    if 'explanation' in answer: answer['explanation']=explanation
    if answer['type']=='move-tree':
        answer['nodes'][0]['explanation']=explanation
        q['coveredBranches']=[['root']+[f'l{i+1}-{j+1}' for j in range(len(l['moves']))] for i,l in enumerate(lines)]
    P.append(q)
    META[id]=dict(title=title,success=success,explanation=explanation,commonErrors=errors,peerDiscussion=discussion,lines=lines or [],reviewScope='模型推导与自动核查；humanReviewed=null。')
    if oracle: ORACLES[id]=oracle
    return q
def tree(lines,turn='B',n=5):
    nodes=[dict(nodeId='root',move=None,children=[],outcome='continue',terminalStatus=None,evidence=[],explanation='')]
    # Each authored line has its own root branch; callers ensure distinct first moves.
    for i,l in enumerate(lines):
        parent=nodes[0]
        for j,s in enumerate(l['moves']):
            nid=f'l{i+1}-{j+1}'; parent['children'].append(nid)
            last=j==len(l['moves'])-1
            node=dict(nodeId=nid,move=move(s,turn if j%2==0 else ('W' if turn=='B' else 'B'),n),children=[],outcome=(l['outcome'] if last or (j==0 and l['outcome']=='failure') else 'continue'),terminalStatus=l.get('terminalStatus') if last else None,evidence=([l['proof']] if last else []),explanation=l['proof'] if last or (j==0 and l['outcome']=='failure') else '按顺序重放；成功范围见题干。')
            nodes.append(node); parent=node
    return dict(type='move-tree',rootNodeId='root',nodes=nodes,uncoveredPolicy='unknown',uniquenessClaim=False,uniquenessEvidence=[])
def tactic(id,title,b,w,target,prompt,good,bad,proof,errors,discussion,goal,oracle,hints=None,n=5,turn='B',level='elementary',assumptions=None,extra=None):
    lines=[dict(moves=[x],outcome='success',proof=proof) for x in good]
    if extra: lines=extra
    lines+= [dict(moves=bad,outcome='failure',proof=errors)] if bad else []
    return puzzle(id,title,b,w,target,prompt,tree(lines,turn,n),hints or ['先检查目标块的全部气。','比较候选点落下后，哪些棋子连接或被提走。','在完整棋盘上重放一手，再按成功标准核对。'],proof,errors,discussion,goal,'一次局部决定，需区分即时目标与后续应对。',n,turn,level,assumptions,oracle,lines)

# Fixed liberty sets were enumerated by hand before any engine call.
lib_data=[
('001','中央单子的四周','E5','', 'E5','E6 D5 F5 E4','number','斜角有空位，但不沿棋盘线与 E5 相邻。','把四条方向逐一指给同伴。',9),
('002','真正的角上只有两向','A5','', 'A5','B5 A4','point-set','A5 已在完整棋盘角上；上方和左方没有交叉点。','若移到 A4，气的数量怎样改变？',5),
('003','连成一块一起数','B3 C3','', 'B3 C3','B4 C4 A3 D3 B2 C2','number','两颗相连黑子互相占据的点不是气。','为什么不能把两个单子的四气直接相加？',5),
('004','折形的共享气','B4 B3 C3','', 'B4 B3 C3','B5 A4 C4 A3 D3 B2 C2','point-set','C4 同时邻接 B4、C3，但同一个空点只计一次。','让一人数方向，另一人检查是否重复。',5),
('005','整块与敌子共同限制','D5 E5 D4 E4','C5 D6', 'D5 E5 D4 E4','E6 F5 C4 F4 D3 E3','number','C5、D6 已有白子，不能作为气；方块内部的棋子也不是空点。','若白下 E6，全块会少几口气？为什么？',9)]
for num,title,b,w,t,expected,typ,exp,dis,n in lib_data:
    ps=pts(expected,n); answer=dict(type=typ,**({'value':len(ps)} if typ=='number' else {'points':ps}),explanation='')
    puzzle('LIB-'+num,title,b,w,[('B',t)],('数出' if typ=='number' else '选出')+'标记黑棋整块的全部气（liberties）。只回答，不落子。',answer,['沿线找上下左右相邻的空点。','先找完整连通块，排除白子和斜角。','把重复出现的同一空点合并后再数。'],f'气为 {expected}，共 {len(ps)} 口。{exp}','把斜角、己子或重复空点算入气。',dis,('数字准确' if typ=='number' else '点集合与全部气完全一致，无遗漏无多选')+'；不判断活死。','从单子、边角到共享气逐步增加去重工作。',n=n,oracle=dict(kind='liberties',at=pts(t,n)[0],expected=ps))

caps=[
('001','补最后一口气','C4 B3 C2','C3','C3','D3',['D4','D3'],1,'D3 是 C3 白子的唯一气。黑 D3 后整颗白子被提走。','黑 D4 未填最后一气；白 D3 后目标扩展并获得新气。'),
('002','沿边提掉整块','A5 B4 C4','B5 C5','B5 C5','D5',['D4','D5'],2,'B5、C5 是同一块，唯一气是 D5。黑 D5 一手提掉两颗。','黑 D4 没填 D5；白 D5 连接后可向 E5 等点延伸。'),
('003','边线方向少一条','A4 B3','A3','A3','A2',['C3','A2'],1,'完整棋盘左边没有盘外一气。黑 A2 填最后一气，提走 A3。','黑 C3 没有提到目标；白 A2 延伸，获得 A1、B2 等气。'),
('004','一手同时提两块','A3 B4 B2 E3 D4 D2','B3 D3','B3 D3','C3',['C4','C3'],2,'B3 与 D3 是两块，但共同只剩 C3。黑 C3 同时提走两块。','黑 C4 不是最后一气；白 C3 将两块接成一块并有 C2 一气。'),
('005','先提子再检查自杀','C5 B4 D4 A3 B2 E3 D2 C1','C4 B3 D3 C2','C4 B3 D3 C2','C3',['A1','A4'],4,'四块白子各只剩 C3。黑 C3 先提掉四颗，随后获得四口气，因此合法。','黑 A1 本手未提目标；白 A4 是合法的外侧施压，不能把未完成即时目标说成成功。')]
for num,title,b,w,t,g,bad,count,proof,err in caps:
    tactic('CAP-'+num,title,b,w,[('W',t)],'黑先。本手提掉全部标记白子（capture）；成功后立即结束本题。',[g],bad,proof,err,'先预测提子数，再由同伴实际移走整块核对。','本手全部标记白子消失，不以面积或后续胜负判定。',dict(kind='capture-now',targets=pts(t),accepted=pts(g),captured=count))

cons=[
('001','一间空点连接','B3 D3','C4','B3 D3',['C3'],['C2','C3'],'黑 C3 与 B3、D3 正交相邻，三子成为一块。','黑 C2 与两目标都不直接相邻；白 C3 占住连接点。','connect'),
('002','斜邻有两条接法','B4 C3','D4','B4 C3',['C4','B3'],['A4','B3'],'黑 C4 或 B3 都同时邻接两目标，因此两手均接受。','黑 A4 只接上 B4；白 B3 占住一种接法，C4 仍可连接，不能据此断言永远断开。','connect'),
('003','打吃时向外延伸','C3','B3 C4 D3','C3',['C2'],['A1','C2'],'目标原仅 C2 一气。黑 C2 后整块有 B2、D2、C1 三口气，已解除当前打吃。','黑 A1 离开目标，白 C2 可立即提掉 C3。','escape'),
('004','边上搭桥','B5 D5','B4 D4','B5 D5',['C5'],['A4','C5'],'黑 C5 把两边的黑子接为一块，剩 A5、E5、C4 三口气。','黑 A4 没有接通两目标；白 C5 可合法占住桥点。','connect'),
('005','逃跑同时接到同伴','A3 B2','A4 B3','A3 B2',['A2'],['C2','A2'],'A3 仅 A2 一气。黑 A2 同时连接 B2，整块有 A1、B1、C2 三口气。','黑 C2 虽加厚 B2，却没有救 A3；白 A2 立即提走 A3。','connect')]
for num,title,b,w,t,good,bad,proof,err,kind in cons:
    goal='本手两目标仍在盘上且属于同一连通块。' if kind=='connect' else '本手目标仍在，所在块至少有两口气。'
    tactic('CON-'+num,title,b,w,[('B',x) for x in t.split()] if kind=='connect' else [('B',t)],'黑先。'+('本手把两个标记目标连接（connection）为一块。' if kind=='connect' else '本手救出被打吃（atari）的目标，使其至少有两口气。'),good,bad,proof+' 这只证明本题即时目标，不证明永久活棋。',err,'下一手对方可以在哪里施压？连接与永远安全有什么差别？',goal+' 不要求保证永久活棋。',dict(kind=kind,targets=pts(t),accepted=[pts(x)[0] for x in good]))

# LIFE-001: a single connected black block owns both isolated one-point eyes.
twoeyes=[dict(row=r,col=c) for r in range(3) for c in range(5) if (r,c) not in [(1,1),(1,3)]]
puzzle('LIFE-001','两个独立真眼',twoeyes,'A2 B2 C2 D2 E2',[('B','C4')],'白方轮次。标出黑棋两个独立真眼（true eyes）的空点。只选点，不落子。',dict(type='point-set',points=pts('B4 D4'),explanation=''),['两个空点是否彼此相通？','检查每个空点的所有正交邻点属于哪一块。','白若先填一眼，黑块是否仍保有另一眼？'],'B4、D4 各自是独立单点空区，全部邻点属于同一个黑连通块。白先填任一眼，黑块仍有另一眼，不能被提；白新子无气，故自杀禁止。外部落子不能把已有黑子拆开。黑不主动填自己的眼时，白无法开始合法的最后提子。这是充分结构论证，不把两眼说成所有活棋的必要条件。','把两个相连空点算两眼，或忽略眼壁属于不同、可被提的棋块。','试解释“假设第一次提掉这块黑棋”为什么会矛盾。','恰好选择 B4、D4；理解证明适用于黑不自毁眼形。','单一完整黑块与两个互不连通单点眼，避开劫和双活。',turn='W',level='elementary',oracle=dict(kind='two-eyes',eyes=pts('B4 D4'),target=pts('C4')[0]))

tactic('LIFE-002','看似眼的点可以被吃进','C4 B3 D3 C2','B4 D4 B2 D2 C5 A3 E3',[('B','C4'),('B','B3'),('B','D3')],'白先。本手提掉标记的三颗黑子，说明 C3 为什么是假眼（false eye）。',['C3'],['A1','C1'],'白 C3 同时提掉 C4、B3、D3 三块，因而获得气。三块眼壁原来各只剩 C3；空点看似被黑包住，却可合法吃进。与 LIFE-001 的同块两眼结构不同。','白 A1 没提掉目标；黑 C1 可延长下方黑块，但没有让上方三个目标从最初就成为真眼。','比较 LIFE-001：仅看围住空点的颜色，漏掉了什么？','白本手提掉三颗标记黑子；只证伪这个眼，不判断其他黑棋的全盘死活。',dict(kind='capture-now',targets=pts('C4 B3 D3'),accepted=pts('C3'),captured=3),turn='W')

corner_b='D5 A4 B4 C4 D4'; corner_w='E5 E4 A3 B3 C3 D3 E3'
tactic('LIFE-003','先手把三点空间分开',corner_b,corner_w,[('B','B4')],'黑先。在 A5、B5、C5 的空间内，本手做出两个独立单点真眼。',['B5'],['A5','B5','C5','B5'],'黑 B5 接上 B4，把空间分为 A5、C5 两个单点眼。每个眼的邻接黑子都在同一块，另一眼使白不能合法吃进，黑不自填眼即可保有此两眼结构。','黑 A5 后剩 B5、C5 相连，仍只有一个空间。白 B5，黑 C5 提白，白再 B5 可提掉原黑块；末手与之前布局不同，不是劫。','为什么中点与端点虽然都在内部，结果却不同？','本手产生两个被同一黑块包围的独立单点空区。',dict(kind='split-eyes',target=pts('B4')[0],spaces=pts('A5 B5 C5'),accepted=pts('B5'),sizes=[1,1]))

# Kept explicit to ensure the two alternative replies are recorded as legal moves.
q=tactic('LIFE-004','四点空间的防守要点','E5 A4 B4 C4 D4 E4','A3 B3 C3 D3 E3',[('B','C4')],'黑先。在 A5–D5 的空间内，本手分出两个独立眼区。较大眼区可有两点。',['B5','C5'],['A5','C5'],'黑 B5 或 C5 均把四点直线分为单点眼与两点眼区。以 B5 为例，白 C5 后黑 D5 提白；白 D5 后黑 C5 提白。单点眼保住黑块，及时提掉侵入子可保持另一眼区。C5 首手完全对称。','黑 A5 后剩 B5–D5 一个连通空间，本手没有分眼；白 C5 抢占中点。此变化不作全盘死亡证明。','对手从较大眼的另一端进入，你能交换应对点吗？','本手在指定空间形成大小 1 与 2 的两个空区，所有边界棋子同属目标黑块。',dict(kind='split-eyes',target=pts('C4')[0],spaces=pts('A5 B5 C5 D5'),accepted=pts('B5 C5'),sizes=[1,2]))
META[q['id']]['supplementalLines']=[dict(moves=[move(a,'B'),move(b,'W'),move(c,'B')],claim='提掉侵入的单颗白子，单点眼仍在。',capturedAtEnd=1) for a,b,c in [('B5','C5','D5'),('B5','D5','C5'),('C5','A5','B5'),('C5','B5','A5')]]

life5_lines=[dict(moves=['B5','C5','B5'],outcome='success',terminalStatus='verified-dead',proof='白 B5，黑 C5 提白后，白 B5 提掉原目标块；这两个 B5 后的完整布局不同。'),dict(moves=['C5','B5','C5'],outcome='success',terminalStatus='verified-dead',proof='对称变化：白 C5，黑 B5 提白后，白 C5 提掉原目标块。')]
tactic('LIFE-005','两点相连仍是一个眼区','A5 '+corner_b,corner_w,[('B','B4')],'白先。在最多三手（白、黑、白）内提掉标记黑块。B5、C5 是一个相连空间。',[],None,'白 B5 或 C5 均可。若黑占另一空点提白，白回到原点提掉整块；若黑下别处或停手，白占另一空点直接提掉目标。两点并非两个独立真眼。验证遍历本完整 5×5 的所有合法黑回应，终止于目标消失或三手界限；不是通用死活求解器。','只数两个空点就宣布活棋，或把每次回提都当作劫。这里回提后的整盘黑子数不同，布局不会相同。','把“黑提一颗白子”和“白随后提掉整块”逐步摆出，比较两个完整棋盘。','无论合法黑回应为何，白在第三手或之前使全部原目标黑子消失。',dict(kind='capture-within-3',target=pts('B4')[0],accepted=pts('B5 C5')),turn='W',extra=life5_lines,level='optional-challenge')

def terminal(id,title,b,w,bs,ws,bt,wt,neutral='',komi=0,dead='',counts=None,unsettled=False,assumptions=None):
    score=None if unsettled else dict(blackStones=bs,whiteStones=ws,blackTerritory=pts(bt),whiteTerritory=pts(wt),neutralPoints=pts(neutral),komi=komi,blackTotal=bs+len(pts(bt)),whiteTotal=ws+len(pts(wt))+komi,difference=bs+len(pts(bt))-ws-len(pts(wt))-komi,winner=('B' if bs+len(pts(bt))>ws+len(pts(wt))+komi else 'W' if bs+len(pts(bt))<ws+len(pts(wt))+komi else 'draw'),basis='teaching-assumption')
    a=['真实完整 5×5 小棋盘练习；新教学起点，过去劫史未知。']+(assumptions or [])
    if not unsettled: a+=['这是给定存活与死子约定的教学算例，不是某场已确认实战记录。confirmedBy 保持空数组。','除明确标记死子外，盘上棋子按活子计算。提子数不额外计入面积。']
    e=dict(**identity(id,'TerminalFixture'),developmentOnly=False,title=title,position=pos(id,b,w),status='unsettled' if unsettled else 'teaching-assumption',assumptions=a,agreement=dict(deadStones=pts(dead),neutralPoints=pts(neutral),confirmedBy=[]),komi=komi,captureCountsForComparison=counts or dict(B=0,W=0),expectedScore=score,sources=source(),validation=validation())
    E.append(e); META[id]=dict(title=title,success='逐项计算并说明结论依据。' if not unsettled else '拒绝最终分数，提出继续下或核对争议。',explanation='',commonErrors='',peerDiscussion='',lines=[])
    return e
def region(rows,holes):
    holes={(p['row'],p['col']) for p in pts(holes)}
    return [dict(row=r,col=c) for r in rows for c in range(5) if (r,c) not in holes]
e1=terminal('END-001','清楚围空：子与空都计入',region(range(2),'B5 D5'),region(range(2,5),'B1 D1'),8,13,'B5 D5','B1 D1')
e2=terminal('END-002','中立空区：不分给任何一方',region(range(2),'B5 D5'),region(range(3,5),'B1 D1'),8,8,'B5 D5','B1 D1','A3 B3 C3 D3 E3',assumptions=['中间整行混合接触黑白边界，按本教学约定保留为中立区；这是计分假设，并不主张实战已经收完。'])
e3=terminal('END-003','确认死子后再计算',region(range(3),'A5 C5 E5 C4'),region(range(3,5),'B1 D1')+pts('C5'),11,8,'A5 C5 E5 C4','B1 D1',dead='C5',assumptions=['教学假设双方已同意 C5 白子为死子，移除其完整一子块。此处不伪造真实双方确认。','可实际演示黑 C4 提掉 C5；该演示是新教学起点的合法变化。'])
e4=terminal('END-004','贴目变化：同一面积不同结果',region(range(2),'B5 D5'),region(range(3,5),'B1 D1'),8,8,'B5 D5','B1 D1','A3 B3 C3 D3 E3',komi=.5,assumptions=['主算例开局贴目为 0.5。另开教学情境比较 0 与 2.5，不在已开始的同一局中途改贴目。','中间整行按教学约定保留中立；0、0.5、2.5 都只是教学参数，不是官方小棋盘标准。'])
e5=terminal('END-005','提子更多也不额外加分',region(range(2),'B5 D5'),region(range(2,5),'B1 D1'),8,13,'B5 D5','B1 D1',counts=dict(B=12,W=1),assumptions=['B=12、W=1 只是反事实比较用的提子账本标签，不是重建或声称存在这样的历史棋谱。把标签换成 B=0、W=0，面积计算仍相同。'])
e6=terminal('END-006','反例：未完与争议不能报终局分','C4 B3 C2','C3',0,0,'','',unsettled=True,assumptions=['目前只有摆棋局面，没有两次停手和死子共识。C3 白子仍有 D3 一气，不能自动从原盘删除。','继续对弈时黑 D3 可实际提掉 C3。若在两停确认阶段出现争议，应恢复对弈并保留原盘与重复历史。','本例 expectedScore=null，禁止展示最终得分或胜者。'])
for e in E:
    s=e['expectedScore']; m=META[e['id']]
    if s:
        m['explanation']=f"黑活子 {s['blackStones']} + 黑围空 {len(s['blackTerritory'])} = {s['blackTotal']}。白活子 {s['whiteStones']} + 白围空 {len(s['whiteTerritory'])} + 贴目 {s['komi']} = {s['whiteTotal']}。中立 {len(s['neutralPoints'])} 点不归双方。盘面核对：活子与三类空点合计 25。"+(' C5 移除后是黑方围空之一，不作为提子另加分。' if e['id']=='END-003' else '')+(' 提子账本 B=12、W=1 不参与公式，白仍多 5 分。' if e['id']=='END-005' else '')
        m['commonErrors']='漏算活子、把提子账本再次相加，或把中立区分给一方。'
        m['peerDiscussion']='一人逐点标空区，另一人核对活子，最后检查总和是否覆盖全盘。'
    else:
        m['explanation']='正确结论是继续下或先解决争议，不能报最终分数。黑 D3 是合法提子示范；两停只进入确认，有争议时恢复对弈，不能自动判死。'
        m['commonErrors']='将未完棋盘的空区染色当作最终胜负，或未同意就删掉有气白子。'
        m['peerDiscussion']='如果同伴不接受死子判断，怎样用实际着法演示？'
    META[e['id']]['hints']=['先读本例终局状态与假设。','按整块核对死子与空区的完整边界。','最后才代入面积公式；未完反例保留空答案。']
META['END-003']['supplementalLines']=[dict(moves=[move('C4','B')],claim='提掉 C5 白子。',capturedAtEnd=1)]
META['END-006']['supplementalLines']=[dict(moves=[move('D3','B')],claim='提掉 C3 白子；仍不自动宣布全盘结束。',capturedAtEnd=1)]
META['END-004']['komiScenarios']=[dict(komi=k,blackTotal=10,whiteTotal=10+k,winner='draw' if k==0 else 'W') for k in [0,.5,2.5]]

area_specs=[
('001',e1,'黑方的面积是多少？按给定教学假设计算。',dict(type='number',value=10,explanation=''),'数字为 10。'),
('002',e2,'把所有空点标为黑围空、白围空或中立（neutral）。按给定教学假设回答。',dict(type='region-labels',labels=[dict(at=p,owner=owner) for key,owner in [('blackTerritory','B'),('whiteTerritory','W'),('neutralPoints','neutral')] for p in e2['expectedScore'][key]],explanation=''),'恰好标记全部 9 个空点，所属方全部正确。'),
('003',e3,'按“C5 白子已被双方同意为死子”的教学假设，移除后黑方面积是多少？',dict(type='number',value=15,explanation=''),'数字为 15；理解死子移除与真实落子演示是两种不同操作。'),
('004',e4,'本例开局贴目（komi）为 0.5，白方总分是多少？',dict(type='number',value=10.5,explanation=''),'数字为 10.5；只在白方加开局贴目。'),
('005',e5,'反事实提子账本写着黑提 12、白提 1。按面积计分（area scoring），哪种说法正确？',dict(type='reason-choice',options=[dict(optionId='area',text='黑 10，白 15，白多 5；提子数不另加。'),dict(optionId='prisoners',text='黑 22，白 16，黑多 6。'),dict(optionId='winner',text='黑提得多，所以黑胜，不必计面积。')],acceptedOptionIds=['area'],explanation=''),'只选 area，并能指出活子加围空的公式。')]
for num,e,prompt,ans,success in area_specs:
    pp=e['position']; b=[p for p in pp['stones'] if p['color']=='B']; w=[p for p in pp['stones'] if p['color']=='W']
    # Remove color keys before reusable coordinate conversion.
    b=[dict(row=p['row'],col=p['col']) for p in b]; w=[dict(row=p['row'],col=p['col']) for p in w]
    q=puzzle('AREA-'+num,e['title'],b,w,[('B','C4') if num!='003' else ('W','C5')],prompt,ans,['先读题干的死子、中立点与贴目约定。','分别数活子和围住的空点；中立点留空。','核对是否多加了提子账本，或漏了白方贴目。'],META[e['id']]['explanation'],META[e['id']]['commonErrors'],META[e['id']]['peerDiscussion'],success,'明确教学约定下逐项核对面积，不使用未完棋局估算。',assumptions=e['assumptions'],oracle=dict(kind='area-reference',ref=e['id']))
    q['relatedContent']=[dict(id=e['id'],revision=1)]
P[[p['id'] for p in P].index('LIFE-002')]['relatedContent']=[dict(id='LIFE-001',revision=1)]

discs=[
('001','连接还是向空处发展',9,'D5 F5','E6','D5 F5','黑先，比较 E5 连接与 C3 向空处发展。提出自己的选择和对方回应，不要求最佳手。', [('E5','E4','E5 立即把两子连通；白 E4 从下方接近。取舍是连接稳妥，但黑暂未在左下扩展。'),('C3','E5','C3 在左下留下据点；白 E5 占住两黑子间的点。取舍是空间与连接需求。')]),
('002','救一颗子与改变方向',9,'A5 F4','A6 B5','A5','黑先，比较 A4 救出 A5 与 E5 改变发展方向。允许选择放弃一子，但须说清代价。',[('A4','B4','A4 使 A5 延伸到两气以上；白 B4 继续施压。取舍是保留目标但局部仍需注意。'),('E5','A4','E5 向中心发展；白 A4 提掉 A5。取舍是接受明确的一子损失，不可称它也救了目标。')]),
('003','十三路上的两种距离',13,'D4 K10','D10','D4','黑先，在完整 13×13 比较 D6 与 K4。分别说明与已有棋子的距离、目标和白方回应。',[('D6','E6','D6 靠近 D4，但隔着 D5，尚未正交连成一块；白 E6 可以接近。取舍是局部协作与覆盖范围。'),('K4','J4','K4 在右下发展；白 J4 可接近。取舍是更分散，左侧黑子暂未得到直接连接。')]),
('004','提子还是先连接',9,'C6 B5 C4 F5 H5','C5','C5','黑先，比较 D5 提掉 C5 白子与 G5 连接 F5、H5。先预测双方一手，再交流取舍。',[('D5','G5','D5 立即提掉 C5 白子；白 G5 可占黑棋连接点。取舍是局部收益与另一处连接。'),('G5','D5','G5 先连接右方两子；白 D5 救出 C5。取舍是放过本来的一手提子机会。')]),
('005','停手前先核对争议',9,'C6 B5 C4','C5','C5','黑方轮次，局面尚未结束。比较 D5 实际提子与停一手。怎样与同伴核对争议？',[('D5','E5','黑 D5 实际提掉 C5，白 E5 可继续下。此局仍有大片未定空间，不把这一提当全局结束。'),('pass','D5','黑停一手后白 D5 可以延伸救子。停手本身合法，但没有解决目标状态，更没有自动移除白子。')])]
for num,title,n,b,w,t,prompt,lines in discs:
    a=dict(type='open-text',criteria=['能引用具体坐标、气或连接关系说明自己的目标。','能提出至少一个合法对方回应，并说明选择的代价。','能复述同伴的一项依据，说明自己保留或调整想法的原因。'],sampleConsiderations=[x[2] for x in lines],automaticVerdict=False)
    q=puzzle('DISC-'+num,title,b,w,[(('W' if num in ['004','005'] else 'B'),t)],prompt,a,['先任选一个候选，说出它立即改变什么。','替对手找一个合法回应，不只看自己。','比较得到了什么、放弃了什么，再听同伴的理由。'],'候选只是讨论起点，不列唯一最佳手。反馈关注依据、回应与倾听；有新候选也按同一量规讨论。','把作者示例当唯一答案，或用输赢给个人价值打分。','请先准确复述同伴的选择理由，再说明你是否改变想法。','同伴观察到有依据、有回应、有倾听的讨论即可；不自动判文本对错。','开放权衡，局部合法变化易于重放，不要求计算全盘最优。',n=n,level='elementary',oracle=dict(kind='open-rubric'))
    META[q['id']]['candidates']=[dict(moves=[move(a,'B',n),move(b,'W',n)],consideration=exp) for a,b,exp in lines]

def main():
    assert len(P)==30 and len(E)==6
    for x in P: put(Path('puzzles')/(x['id']+'.json'),x)
    for x in E: put(Path('endgames')/(x['id']+'.json'),x)
    put('t09/pedagogy.json',dict(**identity('T09-PEDAGOGY','TeachingCompanion'),contentVersion=VERSION,items=META))
    put('t09/independent-expectations.json',dict(**identity('T09-EXPECTED','VerificationVectors'),method='Before engine execution: authored coordinate enumeration, set arguments, fixed area arithmetic and bounded target predicates. Model reasoning, not human review.',items=ORACLES))
    put('t09/bundle.json',dict(**identity('T09-BUNDLE','ContentBundle'),developmentOnly=False,title='T09 30 道挑战与 6 个终局示例',items=P+E))
    print('Authored 30 puzzles + 6 endgames; validation remains null until validate.mjs --stamp succeeds.')
if __name__=='__main__': main()
