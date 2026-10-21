import {describe,expect,it} from 'vitest';
import {validateContent} from '../../src/core/validation';
import type {StoragePort} from '../../src/core/persistence';
import {AVAILABLE_PUZZLES} from '../../src/features/puzzle-runner/catalog';
import {
  addTreeMove,applyCheckResults,blankDraft,changeAnswerType,copyAsNew,createRevision,
  draftFromPuzzle,emptyWorkspace,exportBundle,exportPuzzle,publishDraft,saveEntry,setDeleted,
  type DraftEntry,
} from '../../src/features/teacher-editor/model';
import {createDraftStore,parseWorkspace,publishedDraftItems,T14_STORAGE_KEY} from '../../src/features/teacher-editor/storage';
import {T14_TEMPLATE_BUNDLE,T14_TEMPLATES} from '../../src/features/teacher-editor/templates';

const clone=<T,>(value:T):T=>structuredClone(value);
const officialIds=new Set(AVAILABLE_PUZZLES.map(item=>item.puzzle.id));

function captureForkDraft():DraftEntry{
  const template=T14_TEMPLATES.find(item=>item.id==='TEMPLATE-CAP-001')!;
  const entry=draftFromPuzzle(template,'两处提子分叉',{kind:'template',sourceId:template.id,sourceRevision:1});
  entry.puzzle.id='TEST-CAP-FORK';entry.puzzle.initialPosition.id='POS-TEST-CAP-FORK';
  entry.learningGoal='比较两处都能立即提子的合法解，并保留未知分支。';
  entry.puzzle.conditions.assumptions=[`学习目标：${entry.learningGoal}`,'开发测试局面；两处目标白子各剩一气。'];
  entry.puzzle.initialPosition.stones=[
    {row:1,col:1,color:'W'},{row:0,col:1,color:'B'},{row:1,col:0,color:'B'},{row:2,col:1,color:'B'},
    {row:3,col:3,color:'W'},{row:2,col:3,color:'B'},{row:3,col:4,color:'B'},{row:4,col:3,color:'B'},
  ];
  entry.puzzle.targetMarkers=[{markerId:'target-1',type:'target',points:[{row:1,col:1},{row:3,col:3}],label:'两处目标白子',owner:'W'}];
  entry.puzzle.answer={type:'move-tree',rootNodeId:'root',nodes:[{nodeId:'root',move:null,children:[],outcome:'continue',terminalStatus:null,evidence:[],explanation:'从双目标起点开始。'}],uncoveredPolicy:'unknown',uniquenessClaim:false,uniquenessEvidence:[]};
  entry.puzzle.coveredBranches=[];
  return entry;
}

class MemoryPort implements StoragePort{
  values=new Map<string,string>();
  getItem(key:string){return this.values.get(key)??null;}
  setItem(key:string,value:string){this.values.set(key,value);}
  removeItem(key:string){this.values.delete(key);}
}

describe('T14 templates and blank authoring',()=>{
  it('keeps four TEMPLATE items valid and separate from the formal 30',()=>{
    expect(validateContent(T14_TEMPLATE_BUNDLE).ok).toBe(true);
    expect(T14_TEMPLATES.map(item=>item.id)).toEqual(['TEMPLATE-LIB-001','TEMPLATE-CAP-001','TEMPLATE-LIFE-001','TEMPLATE-DISC-001']);
    expect(T14_TEMPLATES.every(item=>item.developmentOnly)).toBe(true);
    expect(AVAILABLE_PUZZLES).toHaveLength(30);
    expect(AVAILABLE_PUZZLES.some(item=>item.puzzle.id.startsWith('TEMPLATE-'))).toBe(false);
  });

  it('does not let a blank number answer masquerade as a completed zero',()=>{
    const entry=blankDraft();
    expect(entry.numberAnswerText).toBe('');
    expect(applyCheckResults(entry).report.issues).toContainEqual(expect.objectContaining({code:'REQUIRED_NUMBER',path:'/answer/value'}));
    expect(publishDraft(entry).ok).toBe(false);
  });

  it('drops stale fields when the answer type changes',()=>{
    const source=draftFromPuzzle(T14_TEMPLATES[2],'切换测试',{kind:'template',sourceId:'TEMPLATE-LIFE-001',sourceRevision:1});
    expect(source.puzzle.answer.type).toBe('point-set');
    const open=changeAnswerType(source,'open-text');
    expect(open.puzzle.answer).toEqual({type:'open-text',criteria:['写出一个具体观察。'],sampleConsiderations:[],automaticVerdict:false});
    expect(JSON.stringify(open.puzzle.answer)).not.toContain('points');
    const number=changeAnswerType(open,'number');
    expect(number.numberAnswerText).toBe('');
    expect(JSON.stringify(number.puzzle.answer)).not.toContain('criteria');
  });
});

describe('T14 validated move tree',()=>{
  it('preserves multiple legal solutions, a representative failure and an unknown branch',()=>{
    let entry=captureForkDraft();
    const first=addTreeMove(entry,'root',{type:'place',color:'B',at:{row:1,col:2}},{outcome:'success',terminalStatus:null,explanation:'占据左侧白子的最后一气。',evidence:'T01 重放确认左侧白子被提。'});
    expect(first.ok).toBe(true);if(!first.ok)return;entry=first.entry;
    const second=addTreeMove(entry,'root',{type:'place',color:'B',at:{row:3,col:2}},{outcome:'success',terminalStatus:null,explanation:'占据右侧白子的最后一气。',evidence:'T01 重放确认右侧白子被提。'});
    expect(second.ok).toBe(true);if(!second.ok)return;entry=second.entry;
    const failure=addTreeMove(entry,'root',{type:'place',color:'B',at:{row:0,col:4}},{outcome:'failure',terminalStatus:null,explanation:'这手没有占据任一目标的最后一气。',evidence:'T01 重放后两颗目标白子仍在盘上。'});
    expect(failure.ok).toBe(true);if(!failure.ok)return;entry=failure.entry;
    const unknown=addTreeMove(entry,'root',{type:'place',color:'B',at:{row:2,col:2}},{outcome:'unknown',terminalStatus:'unknown',explanation:'这是合法连接，但本题没有覆盖后续结论。',evidence:''});
    expect(unknown.ok).toBe(true);if(!unknown.ok)return;entry=unknown.entry;
    const answer=entry.puzzle.answer;if(answer.type!=='move-tree')throw new Error('tree expected');
    expect(answer.nodes.filter(node=>node.outcome==='success')).toHaveLength(2);
    expect(answer.nodes.some(node=>node.outcome==='failure')).toBe(true);
    expect(answer.nodes.some(node=>node.outcome==='unknown'&&node.terminalStatus==='unknown')).toBe(true);
    expect(answer.nodes[0].children).toHaveLength(4);
    expect(applyCheckResults(entry).report.movesOk).toBe(true);
  });

  it('rejects an occupied move and leaves the complete draft byte-equivalent',()=>{
    const entry=captureForkDraft(),before=JSON.stringify(entry);
    const result=addTreeMove(entry,'root',{type:'place',color:'B',at:{row:1,col:1}},{outcome:'unknown',terminalStatus:'unknown',explanation:'不会写入。',evidence:''});
    expect(result.ok).toBe(false);
    if(!result.ok)expect(result.message).toContain('OCCUPIED');
    expect(JSON.stringify(entry)).toBe(before);
  });
});

describe('T14 local lifecycle, conflicts and export',()=>{
  it('requires an explicit conflict choice and never silently overwrites an official id',()=>{
    const one=draftFromPuzzle(T14_TEMPLATES[0],'本机一',{kind:'template',sourceId:'TEMPLATE-LIB-001',sourceRevision:1});one.puzzle.id='TEST-CONFLICT';one.puzzle.initialPosition.id='POS-TEST-CONFLICT';
    const two=copyAsNew(one,'TEST-CONFLICT');two.puzzle.revision=one.puzzle.revision;
    const saved=saveEntry(emptyWorkspace(),one,officialIds);expect(saved.ok).toBe(true);if(!saved.ok)return;
    expect(saveEntry(saved.workspace,two,officialIds).ok).toBe(false);
    const kept=saveEntry(saved.workspace,two,officialIds,'keep-both');expect(kept.ok).toBe(true);if(kept.ok)expect(kept.entry.puzzle.id).toMatch(/^TEST-CONFLICT-COPY-/);
    const official=blankDraft();official.puzzle.id=AVAILABLE_PUZZLES[0].puzzle.id;
    const blocked=saveEntry(emptyWorkspace(),official,officialIds);expect(blocked).toMatchObject({ok:false,code:'OFFICIAL_CONFLICT'});
  });

  it('creates an explicit new revision and supports soft delete and restore',()=>{
    const source=draftFromPuzzle(T14_TEMPLATES[0],'数气',{kind:'template',sourceId:'TEMPLATE-LIB-001',sourceRevision:1});
    const revision=createRevision(source);expect(revision.puzzle.revision).toBe(2);expect(revision.origin.sourceRevision).toBe(1);
    const saved=saveEntry(emptyWorkspace(),revision,officialIds);expect(saved.ok).toBe(true);if(!saved.ok)return;
    const deleted=setDeleted(saved.workspace,revision.entryId,true);expect(deleted.entries[0].lifecycle).toBe('deleted');
    expect(setDeleted(deleted,revision.entryId,false).entries[0].lifecycle).toBe('draft');
  });

  it('round-trips Puzzle and Bundle only after explicit author checking',()=>{
    let entry=draftFromPuzzle(T14_TEMPLATES[0],'中心数气',{kind:'template',sourceId:'TEMPLATE-LIB-001',sourceRevision:1});
    entry={...entry,solutionCheckMethod:'手算中心单子四口气，并用 T01 getLiberties 交叉核对。',solutionCheckConfirmed:true};
    const published=publishDraft(entry);expect(published.ok).toBe(true);if(!published.ok)return;
    expect(published.entry.puzzle.validation.solutionChecked?.status).toBe('passed');
    expect(published.entry.puzzle.validation.humanReviewed).toBeNull();
    expect(validateContent(JSON.parse(exportPuzzle(published.entry))).ok).toBe(true);
    expect(validateContent(JSON.parse(exportBundle(published.entry))).ok).toBe(true);
  });

  it('restores saved drafts after refresh and rejects unknown workspace versions without overwriting',()=>{
    const port=new MemoryPort(),store=createDraftStore(port);
    const entry=draftFromPuzzle(T14_TEMPLATES[3],'讨论草稿',{kind:'template',sourceId:'TEMPLATE-DISC-001',sourceRevision:1});
    const saved=saveEntry(emptyWorkspace(),entry,officialIds);expect(saved.ok).toBe(true);if(!saved.ok)return;
    expect(store.save(saved.workspace).ok).toBe(true);
    expect(createDraftStore(port).load()).toMatchObject({ok:true,value:{entries:[{title:'讨论草稿'}]}});
    port.setItem(T14_STORAGE_KEY,JSON.stringify({...saved.workspace,schemaVersion:2}));
    expect(parseWorkspace(JSON.parse(port.getItem(T14_STORAGE_KEY)!))).toMatchObject({ok:false,message:expect.stringContaining('主版本 1')});
    expect(port.getItem(T14_STORAGE_KEY)).toContain('"schemaVersion":2');
  });

  it('exposes only explicitly published local puzzles to T10',()=>{
    const port=new MemoryPort(),store=createDraftStore(port);
    let entry=draftFromPuzzle(T14_TEMPLATES[0],'本机数气',{kind:'template',sourceId:'TEMPLATE-LIB-001',sourceRevision:1});
    entry={...entry,solutionCheckMethod:'手算并用引擎核对。',solutionCheckConfirmed:true};
    const published=publishDraft(entry);expect(published.ok).toBe(true);if(!published.ok)return;
    const draft=copyAsNew(published.entry,'TEST-UNPUBLISHED');
    const workspace={...emptyWorkspace(),entries:[published.entry,draft]};expect(store.save(workspace).ok).toBe(true);
    expect(publishedDraftItems(port).map(item=>item.puzzle.id)).toEqual([published.entry.puzzle.id]);
  });
});
