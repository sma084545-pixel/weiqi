"""Generate the four schema-v1 T14 development templates."""
from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]
RULESET='GO-CLUB-AREA-1'

def source():
    return {'type':'original','title':'T14 本机编辑模板','url':None,'accessedAt':None,'note':'原创开发模板；只用于创建草稿，不计入正式30题，也不代表解答已由人类复核。'}

def check(status,method,evidence):
    return {'status':status,'method':method,'checkedAt':'2026-09-15','evidence':[evidence]}

def validation():
    return {
        'structure':check('passed','T14 模板生成器与 schema v1 校验','模板结构通过'),
        'moveLegality':check('passed','T01 validateSetup 与已录着法重放','模板起点和示例分支合法'),
        'solutionChecked':check('partial','模板示例答案仅供起步，发布前须由使用者重新核查','不得继承为发布证明'),
        'externalReferenceChecked':None,'modelChecked':None,'humanReviewed':None,
    }

def position(pid,size,stones,to_play):
    return {'schemaVersion':1,'id':f'POS-{pid}','revision':1,'rulesetId':RULESET,'kind':'Position','size':size,'stones':stones,'toPlay':to_play,'historyPolicy':'fresh-setup','history':None}

def puzzle(pid,category,prompt,pos,target,hints,answer,rationale,goal):
    return {
        'schemaVersion':1,'id':pid,'revision':1,'rulesetId':RULESET,'kind':'Puzzle','developmentOnly':True,'category':category,
        'difficulty':{'level':'beginner','rationale':rationale},'prompt':prompt,'initialPosition':pos,
        'targetMarkers':[{'markerId':'target-1','type':'target','points':target,'label':'模板目标棋块','owner':next((s['color'] for s in pos['stones'] if {'row':s['row'],'col':s['col']}==target[0]),None)}],
        'firstPlayer':pos['toPlay'],'conditions':{'boundary':'full-board','external':f"真实完整 {pos['size']}×{pos['size']} 棋盘；模板外部无附加棋子。",'assumptions':[f'学习目标：{goal}','新教学起点，过去劫史未知；发布前需重新核查内容。'],'viewport':None},
        'hints':hints,'answer':answer,'coveredBranches':[],'sources':[source()],'validation':validation(),'relatedContent':[],
    }

templates=[]
lib_pos=position('TEMPLATE-LIB-001',5,[{'row':2,'col':2,'color':'B'}],'B')
templates.append(puzzle('TEMPLATE-LIB-001','LIB','数出标记黑子的气。',lib_pos,[{'row':2,'col':2}],['观察上下左右。','排除斜角和非空点。','把找到的空点去重后计数。'],{'type':'number','value':4,'explanation':'中心单子有四口气；发布前请重新核查。'},'单子中心数气，只有一次去重计数。','认识正交相邻的气并准确计数'))

cap_stones=[{'row':1,'col':2,'color':'B'},{'row':2,'col':1,'color':'B'},{'row':3,'col':2,'color':'B'},{'row':2,'col':2,'color':'W'}]
cap_pos=position('TEMPLATE-CAP-001',5,cap_stones,'B')
cap_answer={'type':'move-tree','rootNodeId':'root','nodes':[{'nodeId':'root','move':None,'children':['node-1'],'outcome':'continue','terminalStatus':None,'evidence':[],'explanation':'从模板起点开始。'},{'nodeId':'node-1','move':{'type':'place','color':'B','at':{'row':2,'col':3}},'children':[],'outcome':'success','terminalStatus':None,'evidence':['D3 是目标白子的最后一气；T01 重放后白子被提。'],'explanation':'黑 D3 占据最后一气并提掉目标白子。'}],'uncoveredPolicy':'unknown','uniquenessClaim':False,'uniquenessEvidence':[]}
cap=puzzle('TEMPLATE-CAP-001','CAP','黑先，找出一步提掉目标白子的着法。',cap_pos,[{'row':2,'col':2}],['先数目标棋块的气。','找出落子后会令气归零的空点。','用规则重放核对被提坐标。'],cap_answer,'一步局部提子，示例只含一条已录成功分支。','练习占据最后一气并解释提子因果')
cap['coveredBranches']=[['root','node-1']]
templates.append(cap)

life_stones=[]
for r,c in [(0,0),(0,1),(0,2),(0,3),(0,4),(1,0),(1,2),(1,4),(2,0),(2,1),(2,2),(2,3),(2,4)]:life_stones.append({'row':r,'col':c,'color':'B'})
for c in range(5):life_stones.append({'row':3,'col':c,'color':'W'})
life_pos=position('TEMPLATE-LIFE-001',5,life_stones,'W')
templates.append(puzzle('TEMPLATE-LIFE-001','LIFE','标出目标黑棋两个独立真眼的空点。',life_pos,[{'row':1,'col':2}],['观察空点是否相通。','检查每个空点的正交边界。','分别尝试对方填入每个眼位是否合法。'],{'type':'point-set','points':[{'row':1,'col':1},{'row':1,'col':3}],'explanation':'B4 与 D4 是两个独立单点眼；此结论只针对本模板局面。'},'完整5路盘上的两个独立单点眼，避开劫与双活。','用具体结构说明两个受保护独立眼'))

disc_pos=position('TEMPLATE-DISC-001',9,[{'row':4,'col':3,'color':'B'},{'row':4,'col':5,'color':'B'},{'row':3,'col':4,'color':'W'}],'B')
templates.append(puzzle('TEMPLATE-DISC-001','DISC','黑先，提出一个局部计划和对方可能的回应。',disc_pos,[{'row':4,'col':3},{'row':4,'col':5}],['先说清想保护或改变什么。','替对手找一个合法回应。','比较取舍，再写下是否调整原计划。'],{'type':'open-text','criteria':['写出一个具体目标。','提出一个合法回应。','说明一项取舍。'],'sampleConsiderations':['可比较立即连接与向空处发展的不同目标。'],'automaticVerdict':False},'开放讨论不设唯一答案，以目标、回应和取舍为观察点。','围绕局部计划与对手回应进行低压力讨论'))

bundle={'schemaVersion':1,'id':'T14-TEMPLATE-BUNDLE','revision':1,'rulesetId':RULESET,'kind':'ContentBundle','developmentOnly':True,'title':'T14 教师出题开发模板','items':templates}
out=ROOT/'content/t14/templates.json';out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(bundle,ensure_ascii=False,indent=2)+'\n')
print(out)
