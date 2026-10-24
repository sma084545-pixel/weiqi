# -*- coding: utf-8 -*-
"""Original, coordinate-authored course supplement. Never writes the frozen T09 bank."""
from pathlib import Path
import json
R=Path(__file__).resolve().parents[1]
RULE='GO-CLUB-AREA-1'
def ident(id,kind):return dict(schemaVersion=1,id=id,revision=1,rulesetId=RULE,kind=kind)
def P(id,size,B=(),W=(),turn='B'):
 return dict(**ident('POS-'+id,'Position'),size=size,stones=[dict(row=r,col=c,color=color) for color,points in [('B',B),('W',W)] for r,c in points],toPlay=turn,historyPolicy='fresh-setup',history=None)
def pt(p):return dict(row=p[0],col=p[1])
def C(id,label,verdict,why,at=None,highlight=()):
 d=dict(id=id,label=label,verdict=verdict,explanation=why)
 if at is not None:d['at']=pt(at)
 if highlight:d['highlight']=list(map(pt,highlight))
 return d
def L(id,label,points,turn='B',captures=None,notes=None,outcome='',verdict='success'):
 return dict(id=id,label=label,moves=[dict(type='place',color=('B' if (i+(turn=='W'))%2==0 else 'W'),at=pt(p)) for i,p in enumerate(points)],notes=notes or [f'第 {i+1} 手：先检查正交连接与对方的气，再检查己方气。' for i in range(len(points))],captures=captures or [0]*len(points),outcome=outcome,verdict=verdict)
scenes=[]
def S(n,i,title,prompt,position,interaction,choices=(),targets=(),tier='Practice',level=1,conditions=(),hints=None,expected=None,lines=(),explanation='',hand='',compare=None,libTargets=()):
 id=f'ADV-{n:02}-{i:02}'
 d=dict(**ident(id,'CourseScene'),lesson=n,tier=tier,level=level,title=title,prompt=prompt,goal=prompt,position=position,interaction=interaction,choices=list(choices),targets=[dict(at=pt(p),label=label) for p,label in targets],conditions=['显示的是完整棋盘，边界是真实盘边；本题新起点更早历史未知。',*conditions],hints=hints or ['先观察目标棋块、周围敌子和空点。','把连接、安全与题干指定的目标放在一起比较。',explanation],lines=list(lines),explanation=explanation,evidence=dict(basis='counted-points' if expected is not None else 'legal-lines' if lines else 'bounded-comparison',handCalculation=hand or explanation,covered=[c['id'] for c in choices]+[l['id'] for l in lines],humanReviewed=None,sourceIds=['BGA-SHAPE' if n==7 else 'BGA-CONCEPTS','BGA-DIRECTION' if n>=10 else 'ORIGINAL']))
 if expected is not None:d['expectedPoints']=list(map(pt,expected))
 if compare:d['comparison']=dict(label=compare[0],position=compare[1])
 if libTargets:d['libertyTargets']=[dict(at=pt(at),expected=list(map(pt,ps))) for at,ps in libTargets]
 scenes.append(d);return id
# 7: efficiency is conditional, never a blanket ban on triangles or straight connections.
tri=P('SHAPE-TRI',5,[(1,1),(2,1),(2,2)])
line=P('SHAPE-LINE',5,[(2,1),(2,2),(2,3)])
S(7,1,'好形二选一','同为三颗、周围没有敌子时，哪一形有更多去重气？',tri,'compare',[C('A','A：紧凑空三角','suboptimal','A的三子相连、有7口气；本题没有被攻击，不能据此说它死了。它比B少1气。'),C('B','B：舒展直线','success','B同样三子相连，有8口气，较A多1口。只比较此空盘下的局部效率，不证明整盘安全。')],compare=('B · 三子直线',line),explanation='空三角有7口气，直线有8口；两者都不是无气块。直线也可能在别的局面成为笨重棒形，名字不能代替判断。',hand='A空点=(0,1)(1,0)(1,2)(2,0)(2,3)(3,1)(3,2)，7；B=(1,1)(1,2)(1,3)(2,0)(2,4)(3,1)(3,2)(3,3)，8。',libTargets=[((1,1),[(0,1),(1,0),(1,2),(2,0),(2,3),(3,1),(3,2)])])
S(7,2,'寻找重复用棋','只为维持左侧三子已有的连接与气，右下哪颗黑子目前没有参与？',P('REDUNDANT',5,[(1,0),(1,1),(1,2),(4,4)]),'group',[C('A','左侧相连三子','failure','这三颗承担题目指定的左侧连接，不能把整块选成多余。'),C('B','右下孤子','success','右下子不与目标块相连，也不改变它的去重气。在本题单一目标下未参与任务；全局上它仍可能有用途。',(4,4))],targets=[((1,1),'要维持的左侧块')],explanation='重复要相对于目标说明；不能仅凭一张图宣布某子在整盘永远无用。')
# missing coordinate on group option repaired below to make the whole-group choice explicit
scenes[-1]['choices'][0]['at']=pt((1,1))
S(7,3,'修复空三角倾向','黑方想保持连接并舒展发展，且暂时不受攻击。选择舒展的一手。',P('REPAIR',5,[(1,1),(2,1)]),'point',[C('A','A：紧贴内弯','suboptimal','这手合法，形成有7气的三子空三角；没有紧急连接任务时偏集中。',(2,2)),C('B','B：沿直线延伸','success','这手合法，三子有8气，并向下延伸一格。这里只比较给定两手的气与空间。',(3,1)),C('C','C：回到角上','suboptimal','本手合法，却没有帮助目标块向外发展。',(0,0))],targets=[((1,1),'目标黑块')],explanation='紧密不总等于高效；但有切断或做眼需求时，空三角也可能是必要好手。')
soft=P('SOFT-CONNECTION',5,[(1,1),(2,1),(2,3),(3,2)],[(0,4)])
softlines=[L('upper-cut','白切上方，黑粘中间',[(1,3),(1,2),(2,2)],outcome='黑在中间粘住三组；上方白子仍有外气。本线验证可选择另一连接点，不声称提掉白子。'),L('middle-cut','白切中间，黑连接上方',[(1,3),(2,2),(1,2)],captures=[0,0,1],outcome='中间白子仅一气，黑在上方连接并提掉它；左右两块通过上方相连。')]
S(7,4,'连接，但不必立刻挤紧','本题目标是向上方发展并保留联络选择。比较直接粘与一间跳。',soft,'point',[C('A','A：立即粘住中间','suboptimal','A立刻把目标棋子合成同块，最直接稳妥；若暂时没有接触战，发展范围较小。',(2,2)),C('B','B：上方一间跳','success','B向上方展开，留下上下两个连接选择；对白在两处切入的给定线均已核查。此刻仍是不同连通块，不能误称已经实连。',(1,3)),C('C','C：远处孤立发展','failure','C没有修补两块间的联络，也不符合向上方展开的任务。',(4,4),[(2,2),(1,2)])],tier='Challenge',level=2,targets=[((2,1),'左目标'),((2,3),'右目标')],lines=softlines,conditions=['只比较给定发展目标；不保证有外援敌子时跳仍安全。'],explanation='直接连接有价值；跳和小飞是有条件的联络，不是规则层面的连接。受到切断威胁时重新验算。')
S(7,5,'尖、飞、跳与虎的共同问题','两颗黑子斜邻，能否仅凭“尖”这个名字就认定是同一连通块？',P('DIAGONAL',5,[(1,1),(2,2)]),'choice',[C('yes','能，斜邻自动相连','failure','只有上下左右直接相邻才是一块，斜邻仍分开。'),C('no','不能，需要检查切断和回应','success','正确。尖是斜向一步、小飞是横二竖一、跳中间隔一点；飞泛指斜向展开，虎留下三面围护的口。它们都需要结合敌子检查。')],tier='Challenge',level=2,explanation='名称帮助观察距离，不赋予连通或活棋。虎口若有外部缺陷也可能被切入。')
S(7,6,'不是所有紧凑形都该删','已经被打吃时，要先逃出还是为了“不要坏形”去远处？',P('SHAPE-URGENT',5,[(1,1)],[(0,1),(1,0),(1,2)]),'point',[C('A','A：先延长救棋','success','目标仅剩下方一气。向下延长后恢复外气，安全任务先于外观。',(2,1)),C('B','B：远处好看的一手','failure','白下一手可占目标最后一气。本题是救这颗棋，远处下法未完成任务。',(3,3),[(2,1)])],tier='Mastery',level=3,targets=[((1,1),'一气目标')],lines=[L('neglect','忽略后被提',[(3,3),(2,1)],captures=[0,1],outcome='白提掉目标黑子，证明忽略未达到救棋目标。',verdict='failure')],explanation='团子、棒形或重复用棋是观察提示，不是自动判坏的规则；先确认是否有急所。')
# 8: fixed legal lines and explicit outside conditions.
double=P('DOUBLE',5,[(0,1),(1,0),(0,3),(1,4)],[(1,1),(1,3)])
dl=[L('defend-left','白救左，黑提右',[(1,2),(2,1),(2,3)],captures=[0,0,1],outcome='黑中间一手让两块各剩一气；白救左后右子被提。'),L('defend-right','白救右，黑提左',[(1,2),(2,3),(2,1)],captures=[0,0,1],outcome='对称防守也合法；黑提左子。')]
S(8,1,'双打吃','哪一手会同时打吃两块白棋？',double,'point',[C('A','A：占共同的气','success','两块白棋各剩一气，但仍是两块。白救其中一块，黑可提另一块。',(1,2)),C('B','B：先从下方打吃左边','suboptimal','本手只打吃左边，没有同时攻击右边，留给白较多应对。',(2,1)),C('C','C：远处一手','failure','没有减少两块目标白棋的气。',(4,2))],targets=[((1,1),'左白块'),((1,3),'右白块')],lines=dl,explanation='打吃前先扫描切断、提子与自身弱点。双打吃也要检查对方有没有更大的反击。')
ladderP=P('LADDER',9,[(1,2),(2,1),(3,1)],[(2,2)])
ladderpts=[(2,3),(3,2),(4,2),(3,3),(3,4),(4,3),(5,3),(4,4),(4,5),(5,4),(6,4),(5,5),(5,6),(6,5),(7,5),(6,6),(6,7),(7,6),(8,6),(7,7),(7,8),(8,7),(8,8)]
ladderline=L('forced-staircase','逐步追到真实盘边',ladderpts,captures=[0]*22+[12],notes=['黑先封右边，把白变成一气。' if i==0 else '白沿唯一延长点逃出，仍只有两口气。' if i%2 else '黑从正确一侧打吃；若换另一侧，可能放跑。' for i in range(23)],outcome='在本完整9路、没有外援且按这条持续打吃的应对线中，白12子在盘边被提。不是任何阶梯状棋都无条件能征。')
S(8,2,'征子预测','按演示线不断逃出，这块白棋最后能逃脱吗？',ladderP,'choice',[C('yes','Yes · 能逃脱','failure','本题没有征子引子；所给完整线在真实右下盘边提掉目标12子。'),C('no','No · 此线不能','success','沿这条经核查的阶梯线，白在每次打吃后延长，最终到盘边被提。')],targets=[((2,2),'被征目标')],lines=[ladderline],conditions=['本题指定从正确一侧持续打吃；盘上没有外部白子作引子。','只核查所列应对线，不把少量步骤当作所有局面的通用证明。'],explanation='征子必须沿完整棋盘看方向和引子。可先只看前三手，预测后再播放到底。')
netP=P('NET',9,[(1,2),(1,3),(2,1),(3,1)],[(2,2),(5,5)])
netlines=[L('net-down','白先向下逃',[(3,3),(3,2),(4,2),(2,3),(2,4)],captures=[0,0,0,0,3],outcome='黑先封外围；白两次延长后，三个目标子被提，远方白子还在。'),L('net-right','白先向右逃',[(3,3),(2,3),(2,4),(3,2),(4,2)],captures=[0,0,0,0,3],outcome='向右逃的另一分支同样在局部被捕获。'),L('ladder-breaker','追征遇到外援',ladderpts[:10],outcome='白第10手连接到原在(5,5)的引子，目标块有至少3气；原先持续打吃的征子线不再成立。',verdict='failure')]
S(8,3,'征子还是枷吃','盘中已有白色引子。比较已核查的追征线与枷线，哪手能避开引子的影响？',netP,'point',[C('A','A：继续追征','failure','给定追征线会让白接上(5,5)引子；这条继续追征的计划失效。并不据此断言A之后所有其他计划都失败。',(2,3),[(5,5)]),C('B','B：从外围枷住','success','B先封外圈。白从目标两口气分别延长的两条分支都已合法重放，三子在接上引子前被提。',(3,3)),C('C','C：自己远处发展','suboptimal','合法，但暂时放弃题目要求的局部捕获。',(7,7))],tier='Challenge',level=2,targets=[((2,2),'目标'),((5,5),'征子引子')],lines=netlines,explanation='枷不一定马上打吃；看的是能否切断所有关键逃跑路线。给定两条局部逃跑分支与追征失败线均可回看。')
snapP=P('SNAPBACK',5,[(1,2),(2,0),(2,1)],[(0,0),(0,2),(1,0)])
snap=L('snapback','送一子，再回提三子',[(0,1),(1,1),(0,1)],captures=[0,1,3],notes=['黑放入一子，它只剩下方一气；这一手合法。','白在下方吃掉刚放的黑子，连成三子，但只有上方一气。','黑回到刚才的点，提掉白三子。布局不同，故不是简单劫回提。'],outcome='黑先损失1子，再提3子。实际布局改变，位置超级劫不阻止这次倒扑；不能只凭“送子”就判错。')
S(8,4,'亲手完成倒扑','依次操作黑、白、黑，完成送一子后回提的三手。',snapP,'sequence',targets=[((0,0),'目标白块')],lines=[snap],tier='Challenge',level=2,explanation='倒扑先允许对方提子，再利用其整块只剩最后一气回提。它与非法劫回提需要分别检查。',hand='黑(0,1)0提；白(1,1)提黑(0,1)1子；黑(0,1)提白(0,0)(1,0)(1,1)3子。')
S(8,5,'找手筋：先看弱点','同一双打吃局面，哪个候选最符合“一次制造两处紧急威胁”？',double,'point',[C('A','A：中央双打吃','success','左右两块各由2气变1气，白一次普通延长只能救一处。',(1,2)),C('B','B：单边打吃','suboptimal','也有威胁，但只作用于一块。',(2,3)),C('C','C：远处占点','failure','不符合这道局部战术题的目标。',(4,4))],tier='Mastery',level=3,lines=dl,explanation='Atari → Cut → Capture → Weakness：依次扫描打吃、切断、可提棋和自身弱点，不是强制按此顺序落子。')
S(8,6,'看到切点也要看自己','两黑斜邻，白在A切入后是否马上就是“赢了”？',P('CUT-SCAN',5,[(1,1),(2,2)],[(0,4)]),'choice',[C('yes','是，切断等于赢棋','failure','切断只是把对方分开；切入子本身可能成为弱棋，且本题没有全盘胜负证据。'),C('no','否，继续看气与回应','success','要检查切入子能否站住、对方能否反打吃，以及整盘的目标。')],tier='Practice',level=1,targets=[((1,2),'候选切点')],explanation='手筋不是任何时候都去打吃或切断，而是用合法计算服务于目标。')
S(8,7,'用另一种防守核对双打吃','白这次先救右边，黑随后完成局部提子。',double,'sequence',lines=[dl[1],dl[0]],tier='Challenge',level=2,targets=[((1,1),'左目标'),((1,3),'右目标')],explanation='左右两条防守都接受；不是只认作者的一条坐标。')
S(8,8,'读到哪，结论就到哪','只看征子前三手，就能宣布任何全盘中白棋永远逃不掉吗？',ladderP,'choice',[C('no','不能，要看边界与外援','success','完整盘面、正确方向和引子都会改变结果；题目只对已核查变化作断言。'),C('yes','可以，像楼梯就必死','failure','阶梯外观不能替代合法计算。若途中接上引子，原征子线可能失效。')],tier='Mastery',level=3,explanation='未收录的合法变化显示未判断，不能因没有作者答案就判错。')
# 9: independently listed liberty sets, enclosed races, both starting players.
shared=P('SHARED',5,[(2,1)],[(2,3)])
bl=[(1,1),(2,0),(2,2),(3,1)];wl=[(1,3),(2,2),(2,4),(3,3)]
S(9,1,'圈出黑方所有气','点击黑子所有去重气，选齐后提交。',shared,'points',targets=[((2,1),'黑目标')],expected=bl,libTargets=[((2,1),bl),((2,3),wl)],explanation='黑方4气；中间(2,2)同时也是白方的气。同一点在黑块内部只计一次。',hand='黑=(1,1)(2,0)(2,2)(3,1)共4；白=(1,3)(2,2)(2,4)(3,3)共4。')
BW=[(2,4),(2,5),(2,6),(3,4),(3,6),(3,7),(4,7),(5,4),(5,6),(5,7),(6,4),(6,5),(6,6)]
WW=[(1,1),(1,2),(1,3),(2,0),(2,1),(2,3),(3,0),(3,3),(4,0),(5,0),(5,1),(5,3),(6,1),(6,2),(6,3)]
raceB=[(3,2),(4,2),(4,3)]+BW;raceW=[(4,4),(4,5)]+WW
race=P('RACE-4-3',9,raceB,raceW)
rb=[(2,2),(3,1),(4,1),(5,2)];rw=[(3,5),(4,6),(5,5)]
raceline=L('outside-first','黑先收白外气',[(3,5),(2,2),(4,6),(3,1),(5,5)],captures=[0,0,0,0,2],outcome='黑第5手提白目标两子，黑目标仍有两口气。外墙保留，不把这一局部捕获叫作整盘获胜。')
racecond=['仅比较中腹三颗黑子与相邻两颗白子；两块被外墙限制，无眼、无公气；外墙与外部不参与救援。','目标是先提掉指定目标，不是判整盘赢家。外部着法未列入题目结论。']
S(9,2,'4气对3气，谁先提目标','在给定封闭条件下，黑先行应选择哪一个判断？',race,'choice',[C('B','Black wins · 黑先提目标','success','这道无眼无公气题，黑目标4气、白目标3气，给定5手线先提白；不是整盘胜负。'),C('W','White wins · 白先提目标','failure','所给收外气线中，白未能先占完黑方4口气。'),C('D','Depends · 仅凭数字永远不能算','suboptimal','一般局面要看条件；本题已给出封闭、无眼、无公气与无外援条件，可以核对具体线。')],targets=[((4,2),'4气黑目标'),((4,5),'3气白目标')],lines=[raceline],conditions=racecond,libTargets=[((4,2),rb),((4,5),rw)],explanation='先数双方气，再找公气、眼和能否增气，最后看轮次。只背“4大于3”不适用于任意对杀。')
equalB=P('RACE-EQUAL-B',9,raceB,raceW+[(2,2)])
equalW=P('RACE-EQUAL-W',9,raceB,raceW+[(2,2)],'W')
eqB=L('black-first','黑先行线',[(3,5),(3,1),(4,6),(4,1),(5,5)],captures=[0,0,0,0,2],outcome='同为3气，黑先动手，黑先提掉白目标。')
eqW=L('white-first','白先行线',[(3,1),(3,5),(4,1),(4,6),(5,2)],turn='W',captures=[0,0,0,0,3],outcome='同一盘面改为白先行，白先提掉黑目标3子；轮次改变结论。')
S(9,3,'谁先走很重要','这两张图棋子完全相同，只改了先手。最合理的结论？',equalB,'compare',[C('first','这道封闭题先行方先提目标','success','两边目标各3气。黑先线与白先线分别核查，结论相反。'),C('black','永远黑赢','failure','白先行的合法5手线先提掉黑方3子，不能只换文字标签而不验算。')],compare=('B图 · 同布局白先行',equalW),tier='Challenge',level=2,lines=[eqB],conditions=racecond,explanation='黑先：黑收完3气；白先：白先收完3气。下面另一题实际操作白先行，比较两条线。')
S(9,4,'寻找公气','只圈出同时邻接黑白目标的空点。',shared,'points',targets=[((2,1),'黑目标'),((2,3),'白目标')],expected=[(2,2)],tier='Challenge',level=2,libTargets=[((2,1),bl),((2,3),wl)],explanation='公气只有中间(2,2)。其余六点各只邻接一方目标，是各自独有的外气。公气何时填要由具体合法线判断。',hand='黑气集合与白气集合交集={(2,2)}；各自差集各3点。')
S(9,5,'五手完成对杀','依次操作黑白，先收外气，完成本题5手线。',race,'sequence',lines=[raceline],targets=[((4,2),'黑目标'),((4,5),'白目标')],tier='Mastery',level=3,conditions=racecond,explanation='把自己的气、对方的气、公气和先手顺序都写清。未知合法路线可讨论，不自动判错。')
S(9,6,'反过来：白先行','同一3气对3气局面，现在白先，依次完成5手。',equalW,'sequence',lines=[eqW],targets=[((4,2),'黑目标'),((4,5),'白目标')],tier='Challenge',level=2,conditions=racecond,explanation='这里先手确实改变结果，而非仅更换颜色标签。')
life=json.loads((R/'content/puzzles/LIFE-001.json').read_text())['initialPosition'];life=dict(life,id='POS-ADV-EYES')
S(9,7,'有眼，不只是多一个点','黑目标有两只被同一完整块保护的独立真眼。白能直接吃入任一眼吗？',life,'choice',[C('no','不能，本题吃入会自杀','success','两个眼互相保留气，白填一眼不会先提黑，自己却无气；具体两点均由引擎核查。'),C('yes','能，把眼当普通外气填','failure','眼内落子也须通过先提对方、再查己方气；本题两眼均不能直接吃入。')],tier='Mastery',level=3,targets=[((1,2),'两眼黑块')],conditions=['沿用正式 LIFE-001 revision 1 的完整布局；白先。','这里核对具体两眼结构；单眼、双活及其他对杀不能套同一公式。'],explanation='有眼常改变气的使用顺序，但不能直接加一个固定“气数公式”。无两眼也不自动死亡。',hand='眼=(1,1)(1,3)；两点各邻同一黑块，白任填一点后自己无气且黑仍靠另一眼有气。')
# 10: context-bound strategic comparisons, not automatic universal life/death AI.
eyeRing=[(0,c) for c in range(5)]+[(1,0),(1,2),(1,4)]+[(2,c) for c in range(5)]
weakP=P('WEAK-13',13,[(5,6),(6,5),(7,6)],eyeRing+[(6,6),(10,9),(10,10)])
S(10,1,'哪一块最弱','比较三个白目标：哪块正面临下一手被提？',weakP,'group',[C('A','A：左上两眼块','failure','A是受保护的独立两眼结构；填一眼不能直接提它。',(0,2)),C('B','B：中腹孤子','success','B只有(6,7)一气，黑下一手可提；在这三个明确候选中它最急。',(6,6),[(6,7)]),C('C','C：右下两子','suboptimal','C未证实无条件活，但有6口外气、通向外部，比一气的B暂不紧急。',(10,9))],targets=[((0,2),'A 两眼'),((6,6),'B 一气'),((10,9),'C 外气较多')],explanation='强弱看眼位、根据地、周围敌子、连接与逃路；气数是证据之一，不能单独评全盘。')
S(10,2,'应该攻击这块吗','若目标只是迫使此两眼白块死亡，黑应继续填它的眼吗？',P('STRONG-EYES',5,[(3,c) for c in range(5)],eyeRing),'choice',[C('no','No · 换个目标','success','这块是同一连通块保护的两个独立真眼；直接填任何一眼均自杀。继续以杀它为目标效率低。'),C('yes','Yes · 见白就攻','failure','两个眼仍互相提供气，单纯填眼不能杀；应比较其他弱棋或大场。')],targets=[((1,2),'强白块')],explanation='Do not attack strong stones：本课意思是不要无目标地强杀强棋；周围的收官或全局交换仍要具体判断。')
dirP=P('ATTACK-DIRECTION',13,[(r,2) for r in range(4,9)]+[(3,10),(9,10)],[(6,6)])
S(10,3,'把弱棋赶向哪边','黑左侧已有连贯支援；右侧只是待成形空间。比较两边靠近白孤子的计划。',dirP,'point',[C('A','A：从右侧施压','success','A限制白向右发展，计划把它引向左侧黑支援；目标是借攻发展，并非此手就强制白往左走。',(6,7)),C('B','B：从左侧施压','suboptimal','也能靠近白，但可能促使白向右侧黑的潜在空间发展。是否更好还取决于后续回应。',(6,5)),C('C','C：紧贴已有支援','suboptimal','补厚可能安全，但在此题没有紧急缺陷时重复集中，没有对白孤子施压。',(6,3))],tier='Challenge',level=2,targets=[((6,6),'待处理白孤子')],conditions=['这是两个计划的定性比较，不宣称强制方向或精确目数。'],explanation='选择战场前先看自己的强弱，避免一边攻击一边帮对方在自己的潜在区域安定。')
attackP=P('ATTACK-GAIN',9,[(3,1),(4,1)],[(0,c) for c in range(5)]+[(1,0),(1,4)]+[(2,c) for c in range(5)])
attackline=L('gain-not-kill','白做活，黑连接外侧',[(3,2),(1,2),(3,3)],outcome='白在(1,2)分出两个独立眼而活；黑外侧四子连通并向中央延展。完成的是给定连接目标，不是全盘胜负或已经围住的实地。',notes=['黑从外侧靠近，建立连接方向；白仍有眼形关键点。','白补在内部关键点，形成互相保护的两眼。','黑继续连成外侧一块；没有吃白，也完成了本题的外侧发展任务。'])
S(10,4,'攻击不一定要杀棋','按三手演示，白做活后，黑是否一定“攻击失败”？',attackP,'sequence',lines=[attackline],tier='Challenge',level=2,targets=[((1,0),'白目标'),((3,1),'黑支援')],explanation='白活出和黑获得连接、发展空间可以同时发生。是否全盘划算仍须比较成本，不能只数吃了几子。')
S(10,5,'先照顾自己的弱棋','自己的一气棋在左上，对方远处有两眼。黑先处理哪里？',P('OWN-WEAK',9,[(1,1)],[(0,1),(1,0),(1,2)]+[(r+5,c+4) for r,c in eyeRing]),'point',[C('save','A：救自己的一气棋','success','延长后获得外气，先消除自己的直接危险。',(2,1)),C('attack','B：靠近对方强棋','failure','没有救到本题目标黑子；白可先占其最后一气。',(4,5),[(2,1)])],tier='Mastery',level=3,targets=[((1,1),'自己的一气棋')],explanation='强弱是双方的；自己没有安定时，无目标攻击对方强棋会制造负担。')
S(10,6,'攻击的目标清单','这局只确认黑连接了外侧、白完成两眼，哪一种总结有证据？',attackP,'choice',[C('plan','局部目标可以是连接与发展','success','可验证变化中白做两眼，黑外侧相连。可说局部任务完成，不能据此宣布整盘稳赢。'),C('kill','没杀掉就完全失败','failure','把杀棋当作唯一目的，忽略连接、方向、先手和发展空间。'),C('win','白活黑就必然全盘获胜','failure','没有完整终局和双方确认，不能把局部演示变成全盘胜负。')],tier='Mastery',level=3,lines=[attackline],explanation='Attack weak groups；The purpose of attacking is not always to kill。原则服务具体目标，不作无条件口号。')
# 11: direction is a comparison with urgent tactical exceptions.
opening=P('OPENING-13',13)
S(11,1,'角、边、中腹','空旷13路开局，目标是借真实盘边形成围空潜力。通常从哪里着手？',opening,'point',[C('corner','A：角附近','success','角有两条真实盘边相助，较少自有边界即可限制同样大小的空区；这里没有急所。',(3,3)),C('side','B：边附近','suboptimal','边有一条盘边相助，也可发展；本题先比较角的围空效率。',(3,6)),C('centre','C：中腹','suboptimal','中腹控制方向更多，早期难围实空；有攻防急所时仍可能应先下中腹。',(6,6))],explanation='Corner → Side → Centre 是常见方向提示，不是规则或每步必守的次序。真实角边才有边界作用，图片裁边不算。')
bigP=P('BIG-13',13,[(3,3),(9,3)],[(3,9),(9,9),(8,9)])
S(11,2,'哪里更值得双方争取','上边仍开阔且两方都有发展方向，右下已经较密。比较指定三处。',bigP,'point',[C('A','A：上边开阔处','success','A位于两方之间的开阔边，兼有双方发展价值；是本题给定候选中的优先计划，不是精确最大目数证明。',(3,6)),C('B','B：自己角里重复补','suboptimal','安全但重复集中，暂时放掉双方都想争的上边。',(2,3)),C('C','C：右下白棋密集处','suboptimal','可以研究侵入，但要付出安定新弱棋的代价；本题先选择开阔方向。',(9,8))],tier='Challenge',level=2,conditions=['仅作空间、双方价值和安全的定性比较，不是可靠形势估值。'],explanation='大场不只看空地大，还要看双方价值，以及落子会不会生出新的弱棋。')
urgent=P('URGENT-13',13,[(2,2)],[(1,2),(2,1),(2,3),(9,9)])
S(11,3,'大场还是救棋','左上黑棋只剩一气，另一边空角很大。哪手优先完成救棋目标？',urgent,'point',[C('A','A：救棋急所','success','黑在下面延长，恢复外气。若去远处，白可一手提目标。',(3,2)),C('B','B：先抢空角','failure','空角有价值，但本题目标黑子会被白(3,2)立即提掉。',(9,3),[(3,2)]),C('C','C：先下中腹','failure','没有处理目标最后一气。',(6,6),[(3,2)])],lines=[L('urgent-refutation','脱先后目标被提',[(9,3),(3,2)],captures=[0,1],outcome='白提黑目标1子；说明题干的救棋目标未完成。',verdict='failure')],targets=[((2,2),'一气黑目标')],tier='Practice',level=1,explanation='Urgent before Big：急所优先于大场。若主动弃子应说明补偿，但不是此题的救棋任务。')
tenuki=P('TENUKI',13,eyeRing,[(3,1),(3,3),(9,9)])
S(11,4,'不要一直跟着走','左上黑块已有两眼，对方又在外侧靠近。本题没有其他急所，选择自己的下一步计划。',tenuki,'point',[C('A','A：再填自己的真眼','failure','填眼减少自己眼位，既非必要回应，也不符合发展目标。',(1,1)),C('B','B：转向空角','success','本块两眼稳定，可以脱先（tenuki）抢空角。不代表任何对手落子都能忽略。',(9,3)),C('C','C：继续贴紧外边','suboptimal','合法，但此题已有稳定眼形，继续局部回应可能重复投入。',(4,1))],tier='Challenge',level=2,targets=[((1,2),'已经两眼的黑块')],explanation='先确认本地稳定，再决定转身；先手与脱先不是“永远不用回应”。')
S(11,5,'同一片空区要几面边界','仅比较围住同样大小小空区所需的自有边界，哪个说法有依据？',opening,'choice',[C('corner','真实角边能节省部分围空边界','success','角已有两条真实边，边只有一条，中腹没有盘边。实际仍需堵漏、活棋并防侵入。'),C('centre','中腹最先变成无争议实地','failure','中腹要从更多方向控制，早期不能把势力范围直接涂成确定实地。'),C('all','裁切图边缘也能当盘边','failure','必须使用完整底层布局；图片边缘不是规则边界。')],tier='Challenge',level=2,explanation='空间潜力不等于已围实地；中腹外势可能很有价值，不能因此说中腹无用。')
S(11,6,'先问目标，再选方向','13路上自己的棋被打吃，而上边也很开阔。先比较什么？',urgent,'choice',[C('urgent','先检查自己的急所与弃子代价','success','本题没有已证补偿，先处理一气目标，再回头看大场；有明确弃子计划时可讨论。'),C('follow','无论哪里都跟着对方走','failure','跟着下不能代替比较本地是否真的紧急。'),C('big','只要空地大就永远先抢','failure','忽略即将被提的目标可能损失更大；本题已有明确救棋目标。')],tier='Mastery',level=3,targets=[((2,2),'需要处理的黑块')],explanation='综合顺序：棋块安全 → 局部手段 → 双方大场 → 行棋方向。没有统一坐标能代替这些问题。')
# 12: four judged scenarios plus one complete rule-based teaching-partner game.
S(12,1,'布局：先占角','空盘13路，找一个适合开始角部发展的点。',opening,'point',[C('A','A：左上角附近','success','先借角边发展，再观察其他角与边；不是强制星位定式。',(3,3)),C('B','B：中腹','suboptimal','可下，但本题的角部围空方向更直接；不是非法着。',(6,6)),C('C','C：沿一线贴边','suboptimal','离边太近，发展空间有限，通常不作为此题开局选择。',(0,6))],explanation='13路同样可以角、边、中腹逐步展开，但盘小、接触更早，要更快转入强弱判断。')
encP=P('ENCLOSURE',13,[(3,3)],[(9,9)])
S(12,2,'守角、挂角与拆边','黑已有左上角子，白在右下。选择符合“先巩固自己的角部计划”的一手。',encP,'point',[C('A','A：守角方向','success','A与已有角子配合，形成角部发展的计划；仍有侵入与回应，不是永久领地。',(2,5)),C('B','B：挂对方角','suboptimal','B是从外侧接近对方角部的另一合理计划；它没有执行本题指定的先守自己角。',(7,9)),C('C','C：贴着原子重复放','suboptimal','直接相连安全，但此空旷场景发展范围较小。',(3,4))],tier='Challenge',level=2,explanation='守角（corner enclosure）是配合自己的角子；挂角（approach）是从外侧接近对方角；拆边（extension）沿边展开，三者都是计划。')
# A short original contact example, explicitly not claimed as a fixed joseki.
contactP=P('CONTACT-EXAMPLE',9,[(2,2)],[(2,4)])
contact=L('contact-explained','接触、扳与连接：仅四手',[(2,3),(3,3),(1,3),(3,4)],notes=['黑靠近白，既接触对方，也会让双方更快变强。','白从下方扳，改变黑的发展方向；不是强制唯一回应。','黑从上方连接靠子，减少被切断的风险。','白连接下方两子，与原白子相连；双方各有不同发展方向。'],outcome='四手均合法，白下方相连、黑向上相连。只示范计划与连接，不评为固定定式或谁全盘占优。')
S(12,3,'合理变化不是万能答案','看过四手接触示例后，哪一种学习方式更有用？',contactP,'choice',[C('why','逐手解释连接、方向与代价','success','这条线展示接触、扳和连接。各方还没有可靠最终实地，不能只背坐标或称为完美答案。'),C('memorize','记住后任何局面都照搬','failure','周围棋子、轮次、强弱不同，局部合理变化也可能不合全局。')],tier='Challenge',level=2,lines=[contact],explanation='定式（joseki）可理解为在相应条件下双方局部合理的常见变化，不是全局完美答案。本课不要求背定式，也不把这条原创示例冒称标准定式。')
S(12,4,'从边走向中央','黑边上三子已有连接；白在右侧限制发展。哪种计划更符合避免一直挤在边上的目标？',P('TO-CENTRE',13,[(9,2),(9,3),(9,4)],[(8,7),(9,7),(10,7)]),'point',[C('A','A：向中央一间跳','success','A把发展方向转向中央，保留后续联络；此刻并非同一连通块，需要留意跳点被切。',(7,4)),C('B','B：继续贴着底边','suboptimal','安全但更多投入低位，没有改变本题受限的发展方向。',(10,4)),C('C','C：冲入敌子中','failure','C会放在白包围点(9,8)的邻近危险环境？本题不据此作生死断言；它没有照顾自己边上棋的中央方向。',(9,6))],tier='Mastery',level=3,targets=[((9,3),'边上目标')],explanation='布局不是永远停留在三线附近；从自己的稳定部分出发，比较中央逃路和全盘方向。',conditions=['本题评价明确的发展目标，不自动评全盘最佳手；其他合法落点可自由讨论。'])
# Replace an intentionally cautious draft phrase with a precise, evidence-bound explanation.
scenes[-1]['choices'][2]['explanation']='C贴近白墙，造成接触战，却没有为黑边上目标建立中央方向；在本题指定目标下不优。没有足够证据据此宣布黑棋死亡。'
# Coordinate-authored concept illustrations, not extra exercises or T09 items.
next(s for s in scenes if s['id']=='ADV-07-05')['illustrations']=[dict(id=name,title=title,position=P('SHAPE-'+name,5,B),text=text) for name,title,B,text in [
 ('diagonal','尖',[(1,1),(2,2)],'斜向一步。规则上仍是两块，切点需要计算。'),
 ('knight','小飞',[(1,1),(2,3)],'横二竖一；比实连展开，但不能保证无条件相连。'),
 ('large-knight','飞：较远的大飞示意',[(1,0),(2,3)],'飞是斜向展开的泛称；距离越远，越要留意切断与外援。'),
 ('jump','一间跳',[(1,2),(3,2)],'中间隔一个空点。跳点可能被占，需有后续连接计划。'),
 ('tiger','虎口',[(1,2),(2,1),(3,2)],'三个方向围护中央空点；虎口不是永久安全保证。')]]
next(s for s in scenes if s['id']=='ADV-07-06')['illustrations']=[dict(id=name,title=title,position=P('HEAVY-'+name,5,B),text=text) for name,title,B,text in [
 ('lump','团子示意',[(1,1),(1,2),(2,1),(2,2)],'投入集中、发展范围小；若正在做眼或救棋，紧凑也可能必要。'),
 ('stick','被逼成长棒的示意',[(0,2),(1,2),(2,2),(3,2),(4,2)],'同一方向连续投入可能笨重；直线本身并不自动坏，仍要看任务。')]]
lessons=[]
meta={7:('好形与坏形','Shape & Efficiency','用更少的棋完成连接、安全与发展的任务。','同样三颗棋，紧密是否就更高效？',['先说清目标，再比较效率。','尖、飞、跳、虎是观察工具，不保证实连。','空三角常偏集中；紧急时也可能必要。']),8:('手筋与局部技巧','Tesuji','先找弱点，再计算打吃、切断和提子。','看起来送一子，为什么反而能提三子？',['扫描打吃、切断、提子与自身弱点。','征子看方向、完整边界与外援。','枷看封锁，倒扑看提后最后一气。']),9:('对杀与气的计算','Capturing Race','数双方的气、公气和轮次，再验证具体变化。','同为三气，只换先手会怎样？',['先数双方去重气，再找公气和眼。','先手影响结果，不能只换颜色标签。','无眼、无公气的例子不能套给所有对杀。']),10:('强棋、弱棋与攻防','Strong & Weak Groups','先找双方弱棋，给攻击一个具体目的。','白棋活出来，黑的攻击一定失败了吗？',['先处理自己的弱点，再选择战场。','不要无目标地强杀强棋。','攻击也可为连接、发展或先手，不一定杀棋。']),11:('大场与行棋方向','Big Points & Direction of Play','从局部安全转向双方的大场与全盘方向。','空角很大，但自己的棋只剩一气，先下哪里？',['角、边、中腹是方向提示，不是硬规则。','急所通常先于大场，先核对弃子代价。','局部稳定后可脱先，不必永远跟着对方。']),12:('13路布局与综合实战','13×13 Opening & Strategy','把棋形、手筋、强弱与方向带入一盘13路。','这一步是在占角、照顾弱棋，还是发展新方向？',['占角、守角、挂角、拆边都要结合全盘。','定式不等于完美答案，要能解释每一步。','一盘棋的结果由规则与终局确认决定。'])}
concepts={7:[('shape','位置关系与效率','连接、气、发展空间和投入的子数一起看。7气与8气是具体事实，不等于自动判活。',1),('patterns','尖、飞、跳与虎','尖是斜一步；小飞横二竖一，飞是斜向展开的泛称；一间跳隔一点；虎口三面围护。点名称可用来讨论，能否连接仍须验算。',5),('bad-shape','空三角、团子、棒形与重复','空三角常让气与空间重叠；团子和被逼成的长棒可能笨重。直线连接本身不是坏形，救棋、做眼或切断时紧凑形也可能必要。',6)],8:[('scan','先扫描，不是见子就打吃','Atari → Cut → Capture → Weakness：观察威胁、切点、可提棋，也看自己的弱点。',1),('ladder','征子：沿完整盘面看','每次从正确一侧打吃，让对方在延长后仍受限制；方向错误或外援接上，原结论可变。',2),('net','枷：先封逃路','枷不必每手打吃。先限制出口，再核查不同逃法。',3),('snap','倒扑：提后重新数气','看似送子，可能让对方提后整块只剩一气。先提敌再查己气；与劫回提分别检查。',4)],9:[('count','双方气、公气与外气','先列空点集合再取交集。黑独有、白独有、公气用文字和标记分别指出，不能重复算作同一块两口气。',4),('turn','先手必须真的重算','同一布局黑先与白先分别合法重放，结论才有依据。',3),('eyes','眼改变气的使用方式','受保护真眼不是普通外气。先看吃入是否合法，不引入复杂眼对杀公式。',7)],10:[('weak','弱棋看多种证据','缺眼、无根据、周围敌子、联络困难和逃路受限都是提示。以这张完整13路的三个候选比较，不能对任意棋盘自动评级。',1),('strong','强棋不是理想强杀目标','本题的两眼结构已明确，直接填眼被规则拒绝。强棋周边仍可能有收官价值，不能把原则理解成永不靠近。',2),('purpose','攻击为了什么','可能要连接自己、拓展空间、限制对方或取得先手。是否全盘划算仍需比较代价。',4)],11:[('corners','为什么常从角开始','真实角有两条盘边、边有一条，中腹没有。少量自有边界可以借角限制同样大小空区，但仍须防侵入。',1),('big','大场看双方价值','不只看空地，还看双方都想发展的方向和新棋能否安定；早期势力不是确定实地。',2),('urgent','先急所，再比较大场','一气目标是明确急迫证据；有意识弃子须说明补偿。局部稳定才讨论脱先。',3)],12:[('corner','先形成角部计划','占角后可守角；对手占角后可挂角，不必急着接触战。',2),('side','沿边发展，留意轻重','拆边让棋子分担任务；太紧重复、太远有切断风险。',4),('joseki','为什么靠、扳、连接','只学一个原创四手接触示例。它不是固定定式，更不是全局唯一答案；解释双方连接方向，未确认实地不编目数。',3)]}
for n,(title,en,goal,q,summ) in meta.items():
 ids=[s['id'] for s in scenes if s['lesson']==n]
 lessons.append(dict(**ident(f'STAGE-{n:02}','CourseLesson'),number=n,title=title,english=en,goal=goal,question=q,introSceneId=f'ADV-{n:02}-'+{7:'01',8:'04',9:'03',10:'04',11:'03',12:'01'}[n],concepts=[dict(id=id,title=t,text=txt,sceneId=f'ADV-{n:02}-{i:02}',takeaway='先观察，再比较；题目结论只在给定目标和条件下成立。') for id,t,txt,i in concepts[n]],guidedSceneIds=[f'ADV-{n:02}-{i:02}' for i in ({7:[4],8:[2,3,4],9:[5,6],10:[4],11:[3],12:[3]}[n])],sceneIds=ids,summary=summ))
sources=[dict(id='BGA-SHAPE',title='BGA · Tesuji And Katachi',url='https://britgo.org/bgj/00805.html',accessed='2026-10-24',use='只借鉴气、空三角与效率的概念；本包棋形、题目、表达与代码原创；不复制原文图或定式。'),dict(id='BGA-CONCEPTS',title='BGA · How to Play',url='https://www.britgo.org/intro/intro2.html',accessed='2026-10-24',use='核对正交连接、气与眼；该页面的计分不是本项目规则，不引入其提子加分。'),dict(id='BGA-DIRECTION',title='BGA · An Example Game',url='https://britgo.org/intro/intro3.html',accessed='2026-10-24',use='核对通过提子威胁发展、连接与分断的教学观察；不复制其棋谱与课效。'),dict(id='ORIGINAL',title='本项目原创坐标与独立核算',url='',accessed='2026-10-24',use='人工式逐点推导由模型完成，不是人类教师审核。自动规则重放与结构检查另列，未作通用死活证明。')]
bundle=dict(**ident('ADVANCED-COURSES-07-12','AdvancedCourseBundle'),lessons=lessons,scenes=scenes,sources=sources)
assert len(scenes)==37 and len(lessons)==6
out=R/'content/advanced-courses/bundle.json';out.write_text(json.dumps(bundle,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'lessons':len(lessons),'scenes':len(scenes),'byLesson':{str(n):len([s for s in scenes if s['lesson']==n]) for n in meta}},ensure_ascii=False))
