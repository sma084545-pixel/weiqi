# -*- coding: utf-8 -*-
"""Supplemental version-1 schema. Does not mutate the shared/frozen content schema."""
import json
from pathlib import Path
R=Path(__file__).resolve().parents[1]
S=lambda **kw:dict(type='string',**kw)
coord={'$ref':'urn:go-club:schema:content:1#/$defs/Coord'}
position={'$ref':'urn:go-club:schema:content:1#/$defs/Position'}
def arr(item,**kw):return dict(type='array',items=item,**kw)
def obj(props,required=None):return dict(type='object',properties=props,required=required or list(props),additionalProperties=False)
def ident(kind):return dict(schemaVersion={'const':1},id=S(minLength=1,maxLength=100),revision=dict(type='integer',minimum=1),rulesetId={'const':'GO-CLUB-AREA-1'},kind={'const':kind})
choice=obj(dict(id=S(),label=S(),at=coord,verdict={'enum':['success','suboptimal','failure']},explanation=S(minLength=1),highlight=arr(coord)),['id','label','verdict','explanation'])
line=obj(dict(id=S(),label=S(),moves=arr({'$ref':'urn:go-club:schema:content:1#/$defs/Move'},minItems=1,maxItems=64),notes=arr(S()),captures=arr(dict(type='integer',minimum=0)),outcome=S(minLength=1),verdict={'enum':['success','suboptimal','failure']}))
scene=obj(dict(**ident('CourseScene'),lesson=dict(type='integer',minimum=7,maximum=12),tier={'enum':['Practice','Challenge','Mastery']},level={'enum':[1,2,3]},title=S(),prompt=S(),goal=S(),position=position,comparison=obj(dict(label=S(),position=position)),illustrations=arr(obj(dict(id=S(),title=S(),position=position,text=S()))),interaction={'enum':['choice','compare','point','group','points','sequence']},targets=arr(obj(dict(at=coord,label=S()))),conditions=arr(S(),minItems=1),hints=arr(S(minLength=1),minItems=3,maxItems=3),choices=arr(choice),expectedPoints=arr(coord,uniqueItems=True),libertyTargets=arr(obj(dict(at=coord,expected=arr(coord,uniqueItems=True)))),lines=arr(line),explanation=S(minLength=1),evidence=obj(dict(basis={'enum':['counted-points','legal-lines','bounded-comparison']},handCalculation=S(minLength=1),covered=arr(S()),humanReviewed={'type':'null'},sourceIds=arr(S(),minItems=1)))),['schemaVersion','id','revision','rulesetId','kind','lesson','tier','level','title','prompt','goal','position','interaction','targets','conditions','hints','choices','lines','explanation','evidence'])
lesson=obj(dict(**ident('CourseLesson'),number=dict(type='integer',minimum=7,maximum=12),title=S(),english=S(),goal=S(),question=S(),introSceneId=S(),concepts=arr(obj(dict(id=S(),title=S(),text=S(),sceneId=S(),takeaway=S())),minItems=1),guidedSceneIds=arr(S(),minItems=1),sceneIds=arr(S(),minItems=3,maxItems=12),summary=arr(S(),minItems=2,maxItems=4)))
bundle=obj(dict(**ident('AdvancedCourseBundle'),lessons=arr(lesson,minItems=6,maxItems=6),scenes=arr(scene,minItems=35,maxItems=50),sources=arr(obj(dict(id=S(),title=S(),url=S(),accessed=S(),use=S())))))
bundle.update({'$schema':'http://json-schema.org/draft-07/schema#','$id':'urn:go-club:schema:advanced-course:1','title':'Advanced course supplement v1, separate from the frozen formal 30-puzzle bank'})
(R/'schemas/advanced-course.schema.json').write_text(json.dumps(bundle,ensure_ascii=False,indent=2)+'\n')
