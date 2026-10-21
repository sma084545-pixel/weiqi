import {describe,expect,it} from 'vitest';
import type {StoragePort} from '../../src/core/persistence';
import {
  ACTIVITY_PRESETS,DISC_CANDIDATES,DISC_IDS,DISCUSSION_STORAGE_KEY,OFFLINE_GUIDE,
  activityCandidates,activityPuzzle,addRecord,checkCandidate,collectionJson,createDiscussionStore,
  createRecord,deleteRecord,emptyCollection,emptyDraft,inspectDraft,swapRoles,
  type DiscussionDraft,
} from '../../src/features/cooperative/model';

const memory=():StoragePort&{data:Map<string,string>}=>{const data=new Map<string,string>();return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>{data.set(key,value);},removeItem:key=>{data.delete(key);}};};
const complete=(draft:DiscussionDraft):DiscussionDraft=>({...draft,choice:'A',choiceLabel:'A 方案',action:{type:'place',at:{row:0,col:0}},goal:'连接目标',reason:'减少切断点',expectedReply:'对方从外侧靠近',replyReason:'那里仍有空点',partnerRestatement:'同伴更重视外势',change:'revised',sharedRevision:'先连接，再观察回应',deeperAnalysis:'也检查另一侧气',partnerHadTurn:true});

describe('T12 cooperative discussion model',()=>{
  it('reuses all five open DISC puzzles at the exact published revision',()=>{
    for(const id of DISC_IDS){const item=activityPuzzle('compare',id);expect(item).toMatchObject({id,revision:1,category:'DISC'});expect(item.answer.type).toBe('open-text');if(item.answer.type==='open-text'){expect(item.answer.automaticVerdict).toBe(false);expect(item.answer.sampleConsiderations).toHaveLength(2);}expect(item.validation.humanReviewed).toBeNull();}
  });

  it('keeps both authored candidates legal without declaring either strategically correct',()=>{
    for(const id of DISC_IDS){const content=activityPuzzle('compare',id);for(const candidate of DISC_CANDIDATES[id]){const result=checkCandidate(content,candidate.action);expect(result.ok,`${id} ${candidate.label}`).toBe(true);expect(result.message).toContain('不评价它是否是整盘好棋');}}
    for(const kind of ['rescue','continue'] as const){const content=activityPuzzle(kind,'DISC-001');for(const candidate of activityCandidates(kind,'DISC-001'))expect(checkCandidate(content,candidate.action).ok).toBe(true);}
  });

  it('swaps roles without losing discussion text and only reports observable form signals',()=>{
    const original=complete(emptyDraft('compare',activityPuzzle('compare','DISC-001'))),swapped=swapRoles(original);
    expect(swapped).toMatchObject({proposer:'伙伴 B',responder:'伙伴 A',goal:original.goal,reason:original.reason,sharedRevision:original.sharedRevision});
    expect(inspectDraft(swapped)).toEqual({ok:true,missing:[],signals:{reason:true,response:true,revision:true,partnerOpportunity:true}});
    expect(inspectDraft(emptyDraft('compare',activityPuzzle('compare','DISC-001'))).signals).toEqual({reason:false,response:false,revision:false,partnerOpportunity:false});
  });

  it('creates anonymous schema records tied to the exact content revision',()=>{
    const source=activityPuzzle('compare','DISC-003'),draft=complete(emptyDraft('compare',source));
    const record=createRecord({...draft,action:DISC_CANDIDATES['DISC-003'][1].action,choice:'B',choiceLabel:DISC_CANDIDATES['DISC-003'][1].label},'LOCAL-T12-ONE','2026-09-15 10:00:00');
    expect(record).toMatchObject({schemaVersion:1,id:'LOCAL-T12-ONE',revision:1,rulesetId:'GO-CLUB-AREA-1',contentRef:{id:'DISC-003',revision:1},choice:{kind:'B'},roles:{proposer:'伙伴 A',responder:'伙伴 B'}});
    expect(record).not.toHaveProperty('studentName');
  });

  it('stores multiple records locally and deletion only removes the selected record',()=>{
    const source=activityPuzzle('compare','DISC-001'),draft=complete(emptyDraft('compare',source));
    const one=createRecord({...draft,action:DISC_CANDIDATES['DISC-001'][0].action,choiceLabel:'A'},'LOCAL-T12-ONE','2026-09-15 10:00:00');
    const two=createRecord({...draft,action:DISC_CANDIDATES['DISC-001'][1].action,choice:'B',choiceLabel:'B'},'LOCAL-T12-TWO','2026-09-15 10:01:00');
    const both=addRecord(addRecord(emptyCollection(),one),two),port=memory(),store=createDiscussionStore(port);
    expect(store.save(both).ok).toBe(true);const loaded=store.load();expect(loaded.ok).toBe(true);if(loaded.ok)expect(loaded.value.records.map(item=>item.id)).toEqual(['LOCAL-T12-TWO','LOCAL-T12-ONE']);
    const removed=store.removeRecord(both,'LOCAL-T12-ONE');expect(removed.ok).toBe(true);if(removed.ok)expect(removed.value.records.map(item=>item.id)).toEqual(['LOCAL-T12-TWO']);
    expect(JSON.parse(collectionJson(deleteRecord(both,'LOCAL-T12-TWO'))).records.map((item:{id:string})=>item.id)).toEqual(['LOCAL-T12-ONE']);
  });

  it('fails closed on malformed local data and preserves the original bytes',()=>{
    const port=memory();port.data.set(DISCUSSION_STORAGE_KEY,'{"schemaVersion":2,"records":[]}');const loaded=createDiscussionStore(port).load();expect(loaded.ok).toBe(false);expect(port.data.get(DISCUSSION_STORAGE_KEY)).toBe('{"schemaVersion":2,"records":[]}');
  });

  it('keeps the three activity boundaries and exact IDs in the printable guide',()=>{
    expect(Object.keys(ACTIVITY_PRESETS)).toEqual(['compare','rescue','continue']);for(const id of [...DISC_IDS,'CON-003','CON-001'])expect(OFFLINE_GUIDE).toContain(id);expect(OFFLINE_GUIDE).toContain('不是官方 Pair Go 赛制');expect(OFFLINE_GUIDE).toContain('不等于整盘好棋');
  });
});
