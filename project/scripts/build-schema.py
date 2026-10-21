"""Authoritative schema builder. Standard library only; generated JSON is checked in."""
import json
from pathlib import Path
R=Path(__file__).resolve().parents[1]
def obj(p, req=None, **extra): return {'type':'object','properties':p,'required':list(p) if req is None else req,'additionalProperties':False,**extra}
def arr(x, **extra): return {'type':'array','items':x,**extra}
def ref(x): return {'$ref':f'#/$defs/{x}'}
def enum(*v): return {'enum':list(v)}
def nullable(x): return {'anyOf':[x,{'type':'null'}]}
s={'type':'string','maxLength':20000}; short={'type':'string','minLength':1,'maxLength':200}; num={'type':'number'}; integer={'type':'integer','minimum':0}; boolean={'type':'boolean'}
idtype={'type':'string','pattern':'^[A-Za-z][A-Za-z0-9._-]{0,79}$'}
meta={'schemaVersion':{'const':1},'id':idtype,'revision':{'type':'integer','minimum':1},'rulesetId':{'const':'GO-CLUB-AREA-1'}}
def doc(kind,p): return obj({**meta,'kind':{'const':kind},**p})
D={}
D['Coord']=obj({'row':{'type':'integer','minimum':0,'maximum':18},'col':{'type':'integer','minimum':0,'maximum':18}})
D['Color']=enum('B','W'); D['StoneValue']=enum('B','W',None); D['Size']=enum(5,9,13,19)
D['Stone']=obj({'row':D['Coord']['properties']['row'],'col':D['Coord']['properties']['col'],'color':ref('Color')})
D['Board']=arr(arr(ref('StoneValue'),minItems=5,maxItems=19),minItems=5,maxItems=19)
D['Move']= {'oneOf':[obj({'type':{'const':'place'},'color':ref('Color'),'at':ref('Coord')}),obj({'type':{'const':'pass'},'color':ref('Color')}),obj({'type':{'const':'resign'},'color':ref('Color')})]}
D['SetupOperation']={'oneOf':[obj({'type':{'const':'setup-set'},'at':ref('Coord'),'color':ref('Color')}),obj({'type':{'const':'setup-erase'},'at':ref('Coord')})]}
D['History']=obj({'layouts':arr({'type':'string','pattern':'^(5|9|13|19)\\|[.BW]+$'},minItems=1,uniqueItems=True)})
D['Position']=doc('Position',{'size':ref('Size'),'stones':arr(ref('Stone'),maxItems=361),'toPlay':ref('Color'),'historyPolicy':enum('fresh-setup','recorded'),'history':nullable(ref('History'))})
D['Position']['allOf']=[{'if':{'properties':{'historyPolicy':{'const':'fresh-setup'}}},'then':{'properties':{'history':{'type':'null'}}},'else':{'properties':{'history':ref('History')}}}]
D['Marker']=obj({'markerId':idtype,'type':enum('target','liberty','last-move','sequence','annotation','ownership'),'points':arr(ref('Coord'),minItems=1,uniqueItems=True),'label':s,'owner':nullable(enum('B','W','neutral'))})
D['Check']=obj({'status':enum('passed','failed','partial','not-applicable'),'method':short,'checkedAt':short,'evidence':arr(short,minItems=1)})
D['HumanReview']=obj({'reviewer':short,'reviewerRole':{'const':'human'},'checkedAt':short,'scope':s,'evidence':arr(short,minItems=1)})
D['Validation']=obj({'structure':nullable(ref('Check')),'moveLegality':nullable(ref('Check')),'solutionChecked':nullable(ref('Check')),'externalReferenceChecked':nullable(ref('Check')),'modelChecked':nullable(ref('Check')),'humanReviewed':nullable(ref('HumanReview'))})
D['Source']=obj({'type':enum('original','adapted','reference'),'title':short,'url':nullable({'type':'string','pattern':'^https://[^\\s]+$','maxLength':2000}),'accessedAt':nullable(short),'note':s})
D['ContentRef']=obj({'id':idtype,'revision':{'type':'integer','minimum':1}})
D['Viewport']=obj({'rowStart':integer,'colStart':integer,'rowEnd':integer,'colEnd':integer})
D['Conditions']=obj({'boundary':{'const':'full-board'},'external':s,'assumptions':arr(s),'viewport':nullable(ref('Viewport'))})
D['Ownership']=obj({'at':ref('Coord'),'owner':enum('B','W','neutral','unknown')})
D['TerminalStatus']=enum('verified-alive','verified-dead','unsettled','unknown')
D['TreeNode']=obj({'nodeId':idtype,'move':nullable(ref('Move')),'children':arr(idtype,uniqueItems=True),'outcome':enum('continue','success','failure','unknown'),'terminalStatus':nullable(ref('TerminalStatus')),'evidence':arr(short),'explanation':s})
D['Answer']={'oneOf':[
obj({'type':{'const':'point-set'},'points':arr(ref('Coord'),uniqueItems=True),'explanation':s}),
obj({'type':{'const':'number'},'value':num,'explanation':s}),
obj({'type':{'const':'region-labels'},'labels':arr(ref('Ownership')),'explanation':s}),
obj({'type':{'const':'reason-choice'},'options':arr(obj({'optionId':idtype,'text':s}),minItems=2),'acceptedOptionIds':arr(idtype,minItems=1,uniqueItems=True),'explanation':s}),
obj({'type':{'const':'open-text'},'criteria':arr(short,minItems=1),'sampleConsiderations':arr(s),'automaticVerdict':{'const':False}}),
obj({'type':{'const':'move-tree'},'rootNodeId':idtype,'nodes':arr(ref('TreeNode'),minItems=1),'uncoveredPolicy':{'const':'unknown'},'uniquenessClaim':{'type':'boolean'},'uniquenessEvidence':arr(short)})]}
D['Response']={'oneOf':[
obj({'type':{'const':'point-set'},'points':arr(ref('Coord'),uniqueItems=True)}),
obj({'type':{'const':'number'},'value':num}),obj({'type':{'const':'region-labels'},'labels':arr(ref('Ownership'))}),
obj({'type':{'const':'reason-choice'},'optionIds':arr(idtype,uniqueItems=True)}),obj({'type':{'const':'open-text'},'text':s}),obj({'type':{'const':'move'},'move':ref('Move')})]}
D['Puzzle']=doc('Puzzle',{'developmentOnly':boolean,'category':enum('LIB','CAP','CON','LIFE','AREA','DISC'),'difficulty':obj({'level':enum('beginner','elementary','optional-challenge'),'rationale':s}),'prompt':short,'initialPosition':ref('Position'),'targetMarkers':arr(ref('Marker')),'firstPlayer':ref('Color'),'conditions':ref('Conditions'),'hints':arr(s,minItems=3,maxItems=3),'answer':ref('Answer'),'coveredBranches':arr(arr(idtype,minItems=1)),'sources':arr(ref('Source'),minItems=1),'validation':ref('Validation'),'relatedContent':arr(ref('ContentRef'))})
D['Lesson']=doc('Lesson',{'developmentOnly':boolean,'stage':{'type':'integer','minimum':1,'maximum':6},'title':short,'objectives':arr(short,minItems=1),'prerequisites':arr(s),'activity':s,'readinessObservations':arr(s),'beginnerRoute':s,'experiencedRoute':s,'contentRefs':arr(ref('ContentRef')),'sources':arr(ref('Source')),'validation':ref('Validation')})
D['ScoreAgreement']=obj({'deadStones':arr(ref('Coord'),uniqueItems=True),'neutralPoints':arr(ref('Coord'),uniqueItems=True),'confirmedBy':arr(ref('Color'),uniqueItems=True)})
D['AreaScore']=obj({'blackStones':integer,'whiteStones':integer,'blackTerritory':arr(ref('Coord'),uniqueItems=True),'whiteTerritory':arr(ref('Coord'),uniqueItems=True),'neutralPoints':arr(ref('Coord'),uniqueItems=True),'komi':num,'blackTotal':num,'whiteTotal':num,'difference':num,'winner':enum('B','W','draw'),'basis':enum('confirmed','teaching-assumption','preview')})
D['TerminalFixture']=doc('TerminalFixture',{'developmentOnly':boolean,'title':short,'position':ref('Position'),'status':enum('confirmed','teaching-assumption','unsettled'),'assumptions':arr(s),'agreement':ref('ScoreAgreement'),'komi':num,'captureCountsForComparison':obj({'B':integer,'W':integer}),'expectedScore':nullable(ref('AreaScore')),'sources':arr(ref('Source'),minItems=1),'validation':ref('Validation')})
D['GameEvent']={'oneOf':[ref('Move'),obj({'type':{'const':'resume'},'requestedBy':ref('Color')}),obj({'type':{'const':'confirm-score'},'agreement':ref('ScoreAgreement')})]}
D['GameResult']={'oneOf':[obj({'reason':enum('resign','first-capture'),'winner':ref('Color')}),obj({'reason':{'const':'two-passes'},'winner':{'type':'null'}}),obj({'reason':{'const':'area'},'score':ref('AreaScore')})]}
snap={'size':ref('Size'),'board':ref('Board'),'toPlay':ref('Color'),'history':ref('History'),'moves':arr(ref('GameEvent')),'captures':obj({'B':integer,'W':integer}),'consecutivePasses':{'type':'integer','minimum':0,'maximum':2},'phase':enum('playing','scoring','finished'),'komi':num,'lastMove':nullable(ref('Move')),'agreement':nullable(ref('ScoreAgreement')),'result':nullable(ref('GameResult'))}
D['GameSnapshot']=obj(snap)
D['GameState']=doc('GameState',{**snap,'setup':ref('Position'),'mode':enum('full-game','capture-first'),'undoStack':arr(ref('GameSnapshot')),'redoStack':arr(ref('GameSnapshot'))})
D['Feedback']=doc('Feedback',{'developmentOnly':boolean,'activityRef':nullable(ref('ContentRef')),'recordedAt':nullable(short),'difficulty':nullable(enum('too-easy','comfortable','too-hard')),'preferredActivities':arr(short),'comment':s,'consentToUse':boolean,'evidenceType':enum('blank-template','participant-submission'),'responseContext':nullable(obj({'size':ref('Size'),'contentRef':nullable(ref('ContentRef'))})),'response':nullable(ref('Response'))})
D['MoveDocument']=doc('Move',{'size':ref('Size'),'move':ref('Move')})
D['MarkerDocument']=doc('Marker',{'size':ref('Size'),'marker':ref('Marker')})
D['SetupDocument']=doc('Setup',{'size':ref('Size'),'operations':arr(ref('SetupOperation'))})
kinds=['Position','MoveDocument','GameState','MarkerDocument','SetupDocument','Lesson','Puzzle','TerminalFixture','Feedback']
D['ContentBundle']=doc('ContentBundle',{'developmentOnly':boolean,'title':short,'items':arr({'oneOf':[ref(k) for k in kinds]},minItems=1)})
root={'$schema':'http://json-schema.org/draft-07/schema#','$id':'urn:go-club:schema:content:1','title':'ContentDocument','oneOf':[ref(k) for k in kinds+['ContentBundle']],'$defs':D}
(R/'schemas/content.schema.json').write_text(json.dumps(root,ensure_ascii=False,indent=2)+'\n')
print('Generated schemas/content.schema.json with',len(D),'definitions')
