import json,copy
from pathlib import Path
R=Path(__file__).resolve().parents[1]
def meta(kind,id):return dict(schemaVersion=1,id=id,revision=1,rulesetId='GO-CLUB-AREA-1',kind=kind)
def write(name,v,folder='valid'):(R/f'content/examples/{folder}/{name}.json').write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
v={k:None for k in ['structure','moveLegality','solutionChecked','externalReferenceChecked','modelChecked','humanReviewed']}
src=[dict(type='original',title='T00 开发示例',url=None,accessedAt=None,note='依据用户规则原创；不是学生记录，不属于正式题库。')]
pos={**meta('Position','DEV-POS-001'), 'size':5,'stones':[dict(row=2,col=2,color='B')],'toPlay':'W','historyPolicy':'fresh-setup','history':None}
write('position',pos)
puzzle={**meta('Puzzle','DEV-LIB-001'),'developmentOnly':True,'category':'LIB','difficulty':{'level':'beginner','rationale':'完整5×5中的中心单子，无提子或劫依赖。'},'prompt':'开发示例：选择中央黑子的全部气。','initialPosition':pos,'targetMarkers':[dict(markerId='target-1',type='target',points=[dict(row=2,col=2)],label='中央黑子',owner='B')],'firstPlayer':'W','conditions':dict(boundary='full-board',external='真实完整5×5；不存在盘外棋子。',assumptions=['仅选择空点，不提交落子。'],viewport=None),'hints':['只找上下左右。','斜角不算气。','逐一核对四个相邻交叉点。'],'answer':dict(type='point-set',points=[dict(row=1,col=2),dict(row=2,col=1),dict(row=2,col=3),dict(row=3,col=2)],explanation='手算：C4、B3、D3、C2 共四个互不重复的正交空点。'),'coveredBranches':[],'sources':src,'validation':v,'relatedContent':[]}
write('puzzle',puzzle)
# Hand-designed area partition: rows 0/1 black; row 2 neutral; rows 3/4 white.
rows=['BB.BB','BBBBB','.....','WWWWW','WW.WW']
endpos={**meta('Position','DEV-POS-AREA-001'),'size':5,'stones':[dict(row=r,col=c,color=x)for r,line in enumerate(rows)for c,x in enumerate(line)if x!='.'],'toPlay':'B','historyPolicy':'fresh-setup','history':None}
score=dict(blackStones=9,whiteStones=9,blackTerritory=[dict(row=0,col=2)],whiteTerritory=[dict(row=4,col=2)],neutralPoints=[dict(row=2,col=c)for c in range(5)],komi=0,blackTotal=10,whiteTotal=10,difference=0,winner='draw',basis='teaching-assumption')
terminal={**meta('TerminalFixture','DEV-END-001'),'developmentOnly':True,'title':'开发算例：相同面积，提子数不额外加分','position':endpos,'status':'teaching-assumption','assumptions':['只检验明确给定的计分假设：全部盘上子视为活子，中间一行为空的中立区，无待移除死子。','不声称该摆棋为实战终局或已经由教师确认。'],'agreement':dict(deadStones=[],neutralPoints=[dict(row=2,col=c)for c in range(5)],confirmedBy=[]),'komi':0,'captureCountsForComparison':dict(B=7,W=2),'expectedScore':score,'sources':src,'validation':v}
write('terminal',terminal)
lesson={**meta('Lesson','DEV-LESSON-001'),'developmentOnly':True,'stage':1,'title':'开发示例：交叉点与气','objectives':['区分正交相邻与斜邻。'],'prerequisites':[],'activity':'两人轮流指出中央黑子的气。','readinessObservations':['能解释斜角为什么不算。'],'beginnerRoute':'手指沿上下左右找点。','experiencedRoute':'向同伴解释共享气去重。','contentRefs':[dict(id='DEV-LIB-001',revision=1)],'sources':src,'validation':v}
write('lesson',lesson)
feedback={**meta('Feedback','DEV-FEEDBACK-BLANK'),'developmentOnly':True,'activityRef':None,'recordedAt':None,'difficulty':None,'preferredActivities':[],'comment':'','consentToUse':False,'evidenceType':'blank-template','responseContext':None,'response':None}
write('feedback-blank',feedback)
write('move',{**meta('Move','DEV-MOVE-001'),'size':5,'move':dict(type='place',color='W',at=dict(row=0,col=0))})
write('marker',{**meta('Marker','DEV-MARKER-001'),'size':5,'marker':puzzle['targetMarkers'][0]})
write('setup',{**meta('Setup','DEV-SETUP-001'),'size':5,'operations':[dict(type='setup-set',at=dict(row=0,col=0),color='B'),dict(type='setup-erase',at=dict(row=0,col=0))]})
empty={**meta('Position','DEV-POS-EMPTY'),'size':9,'stones':[],'toPlay':'B','historyPolicy':'fresh-setup','history':None}
game={**meta('GameState','DEV-GAME-001'),'size':9,'setup':empty,'mode':'full-game','board':[[None]*9 for _ in range(9)],'toPlay':'B','history':dict(layouts=['9|'+'.'*81]),'moves':[],'captures':dict(B=0,W=0),'consecutivePasses':0,'phase':'playing','komi':0,'lastMove':None,'agreement':None,'result':None,'undoStack':[],'redoStack':[]}
write('game',game)
items=[json.loads(p.read_text()) for p in sorted((R/'content/examples/valid').glob('*.json')) if p.stem!='bundle']
write('bundle',{**meta('ContentBundle','DEV-BUNDLE-001'),'developmentOnly':True,'title':'仅供开发校验：不是正式题库', 'items':items})
invalid=[]
for name,change,path,code in [
('out-of-bounds',lambda x:x['stones'][0].update(row=5),'/stones/0/row','COORD_BOUNDS'),
('duplicate-point',lambda x:x['stones'].append(dict(row=2,col=2,color='W')),'/stones/1','DUPLICATE_POINT'),
('unknown-stone',lambda x:x['stones'][0].update(color='X'),'/stones/0/color','SCHEMA_FIELD'),
('unknown-major',lambda x:x.update(schemaVersion=2),'/schemaVersion','SCHEMA_VERSION')]:
  x=copy.deepcopy(pos);change(x);write(name,x,'invalid');invalid.append(dict(file=f'invalid/{name}.json',expectedCode=code,expectedPath=path))
(R/'content/examples/expected-errors.json').write_text(json.dumps({**meta('DeveloperErrorManifest','DEV-ERRORS-001'),'developmentOnly':True,'cases':invalid},ensure_ascii=False,indent=2)+'\n')
print('10 valid documents, 4 negative files, independent expected error manifest')
