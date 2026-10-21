import type {Coord,Puzzle} from '../../core/content.generated';
import {displayCoord} from '../../core/coordinates';
import type {StoragePort} from '../../core/persistence';
import {applyPass,startGame,tryMove} from '../../core/rules';
import {AVAILABLE_PUZZLES} from '../puzzle-runner/catalog';

export const DISCUSSION_STORAGE_KEY='go-club:peer-discussions:v1';
export type ActivityKind='compare'|'rescue'|'continue';
export type PartnerRole='伙伴 A'|'伙伴 B';
export type ChoiceKind='A'|'B'|'self';
export type CandidateAction={type:'place';at:Coord}|{type:'pass'};
export type CandidatePreset={kind:'A'|'B';label:string;summary:string;action:CandidateAction};

const puzzle=(id:string)=>{
  const found=AVAILABLE_PUZZLES.find(item=>item.puzzle.id===id)?.puzzle;
  if(!found)throw new Error(`Missing verified puzzle ${id}`);
  return found;
};

export const DISC_IDS=['DISC-001','DISC-002','DISC-003','DISC-004','DISC-005'] as const;
export type DiscId=typeof DISC_IDS[number];

export const DISC_CANDIDATES:Record<DiscId,readonly [CandidatePreset,CandidatePreset]>={
  'DISC-001':[
    {kind:'A',label:'A · E5 连接',summary:'立即连接两颗黑子。',action:{type:'place',at:{row:4,col:4}}},
    {kind:'B',label:'B · C3 发展',summary:'向左下空处发展。',action:{type:'place',at:{row:6,col:2}}},
  ],
  'DISC-002':[
    {kind:'A',label:'A · A4 救子',summary:'尝试救出 A5。',action:{type:'place',at:{row:5,col:0}}},
    {kind:'B',label:'B · E5 转向',summary:'接受局部代价，向别处发展。',action:{type:'place',at:{row:4,col:4}}},
  ],
  'DISC-003':[
    {kind:'A',label:'A · D6',summary:'靠近左侧已有黑子。',action:{type:'place',at:{row:7,col:3}}},
    {kind:'B',label:'B · K4',summary:'在右下展开。',action:{type:'place',at:{row:9,col:9}}},
  ],
  'DISC-004':[
    {kind:'A',label:'A · D5 提子',summary:'处理左侧的即时提子。',action:{type:'place',at:{row:4,col:3}}},
    {kind:'B',label:'B · G5 连接',summary:'连接右侧 F5 与 H5。',action:{type:'place',at:{row:4,col:6}}},
  ],
  'DISC-005':[
    {kind:'A',label:'A · D5 实际提子',summary:'在未结束局面实际走出提子。',action:{type:'place',at:{row:4,col:3}}},
    {kind:'B',label:'B · 停一手',summary:'停手合法，但不会自动移除白子。',action:{type:'pass'}},
  ],
};

export const ACTIVITY_PRESETS={
  compare:{kind:'compare' as const,title:'比较两手取舍',contentId:'DISC-001',instruction:'从 A、B 或自己的合法落点中选一个，说明得到什么、放弃什么。',boundary:'这是开放权衡，不要求找全盘最佳手。'},
  rescue:{kind:'rescue' as const,title:'救出指定目标棋',contentId:'CON-003',instruction:'提出一手让目标脱离当前打吃，再让伙伴找一手可能回应。',boundary:'只核对是否完成题目写明的局部目标，不等于整盘好棋或永久安全。'},
  continue:{kind:'continue' as const,title:'接续解释下一手',contentId:'CON-001',instruction:'先提出连接计划，再由伙伴说明对方下一手可以怎样施压。',boundary:'连接成立只完成眼前任务，不证明棋块永远安全。'},
} as const;

export function activityPuzzle(kind:ActivityKind,discId:DiscId):Puzzle{return puzzle(kind==='compare'?discId:ACTIVITY_PRESETS[kind].contentId);}

export function activityCandidates(kind:ActivityKind,discId:DiscId):readonly [CandidatePreset,CandidatePreset]{
  if(kind==='compare')return DISC_CANDIDATES[discId];
  if(kind==='rescue')return [
    {kind:'A',label:'A · C2 延伸',summary:'让目标块获得更多气。',action:{type:'place',at:{row:3,col:2}}},
    {kind:'B',label:'B · A1 另投他处',summary:'不直接处理目标。',action:{type:'place',at:{row:4,col:0}}},
  ];
  return [
    {kind:'A',label:'A · C3 连接',summary:'直接连接 B3 与 D3。',action:{type:'place',at:{row:2,col:2}}},
    {kind:'B',label:'B · C2 延伸',summary:'向下延伸，但本手不直接连接目标。',action:{type:'place',at:{row:3,col:2}}},
  ];
}

export function candidateLabel(action:CandidateAction,size:Puzzle['initialPosition']['size']):string{return action.type==='pass'?'停一手':displayCoord(action.at,size);}

export function checkCandidate(puzzleValue:Puzzle,action:CandidateAction){
  const started=startGame(puzzleValue.initialPosition,{mode:'full-game',komi:0,gameId:`T12-${puzzleValue.id}`});
  if(!started.ok)return {ok:false as const,message:'题目起点未通过规则验证。'};
  const result=action.type==='pass'?applyPass(started.value,started.value.toPlay):tryMove(started.value,{type:'place',color:started.value.toPlay,at:action.at});
  return result.ok?{ok:true as const,message:'这项动作在当前明确起点合法；这不评价它是否是整盘好棋。'}:{ok:false as const,message:`这个动作在当前起点不合法（${result.error.code}），请换一个点再讨论。`};
}

export type DiscussionDraft={
  activity:ActivityKind;contentId:string;contentRevision:number;choice:ChoiceKind;choiceLabel:string;action:CandidateAction|null;
  proposer:PartnerRole;responder:PartnerRole;goal:string;reason:string;expectedReply:string;replyReason:string;partnerRestatement:string;
  change:'kept'|'revised'|'';sharedRevision:string;deeperAnalysis:string;partnerHadTurn:boolean;
};

export const emptyDraft=(activity:ActivityKind,content:Puzzle):DiscussionDraft=>({activity,contentId:content.id,contentRevision:content.revision,choice:'A',choiceLabel:'',action:null,proposer:'伙伴 A',responder:'伙伴 B',goal:'',reason:'',expectedReply:'',replyReason:'',partnerRestatement:'',change:'',sharedRevision:'',deeperAnalysis:'',partnerHadTurn:false});
export const swapRoles=(draft:DiscussionDraft):DiscussionDraft=>({...draft,proposer:draft.responder,responder:draft.proposer});

export type DraftCheck={ok:boolean;missing:string[];signals:{reason:boolean;response:boolean;revision:boolean;partnerOpportunity:boolean}};
export function inspectDraft(draft:DiscussionDraft):DraftCheck{
  const missing:string[]=[];
  if(!draft.action)missing.push('候选动作');
  if(!draft.goal.trim())missing.push('本手目标');
  if(!draft.reason.trim())missing.push('选择理由');
  if(!draft.expectedReply.trim())missing.push('可能回应');
  if(!draft.replyReason.trim())missing.push('回应依据');
  if(!draft.partnerRestatement.trim())missing.push('复述同伴理由');
  if(!draft.change)missing.push('是否修改想法');
  if(!draft.sharedRevision.trim())missing.push('共同修订');
  return {ok:missing.length===0,missing,signals:{reason:Boolean(draft.reason.trim()),response:Boolean(draft.expectedReply.trim()&&draft.replyReason.trim()),revision:Boolean(draft.change&&draft.sharedRevision.trim()),partnerOpportunity:draft.partnerHadTurn}};
}

export type DiscussionRecord={
  schemaVersion:1;id:string;revision:1;rulesetId:'GO-CLUB-AREA-1';kind:'PeerDiscussionRecord';createdAt:string;
  contentRef:{id:string;revision:number};activity:ActivityKind;choice:{kind:ChoiceKind;label:string;action:CandidateAction};
  roles:{proposer:PartnerRole;responder:PartnerRole};discussion:{goal:string;reason:string;expectedReply:string;replyReason:string;partnerRestatement:string;change:'kept'|'revised';sharedRevision:string;deeperAnalysis:string;partnerHadTurn:boolean};
};
export type DiscussionCollection={schemaVersion:1;id:'LOCAL-T12-PEER-DISCUSSIONS';revision:number;rulesetId:'GO-CLUB-AREA-1';kind:'PeerDiscussionCollection';records:DiscussionRecord[]};
export type StoreResult<T>={ok:true;value:T}|{ok:false;message:string;fallback:T};
export const emptyCollection=():DiscussionCollection=>({schemaVersion:1,id:'LOCAL-T12-PEER-DISCUSSIONS',revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'PeerDiscussionCollection',records:[]});

export function createRecord(draft:DiscussionDraft,id:string,createdAt:string):DiscussionRecord{
  const checked=inspectDraft(draft);if(!checked.ok||!draft.action||!draft.change)throw new Error(`Incomplete discussion draft: ${checked.missing.join(', ')}`);
  return {schemaVersion:1,id,revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'PeerDiscussionRecord',createdAt,contentRef:{id:draft.contentId,revision:draft.contentRevision},activity:draft.activity,choice:{kind:draft.choice,label:draft.choiceLabel,action:draft.action},roles:{proposer:draft.proposer,responder:draft.responder},discussion:{goal:draft.goal.trim(),reason:draft.reason.trim(),expectedReply:draft.expectedReply.trim(),replyReason:draft.replyReason.trim(),partnerRestatement:draft.partnerRestatement.trim(),change:draft.change,sharedRevision:draft.sharedRevision.trim(),deeperAnalysis:draft.deeperAnalysis.trim(),partnerHadTurn:draft.partnerHadTurn}};
}

const isText=(v:unknown,max=4000)=>typeof v==='string'&&v.length<=max;
function validAction(value:unknown):value is CandidateAction{return !!value&&typeof value==='object'&&(((value as CandidateAction).type==='pass')||((value as CandidateAction).type==='place'&&Number.isInteger((value as Extract<CandidateAction,{type:'place'}>).at?.row)&&Number.isInteger((value as Extract<CandidateAction,{type:'place'}>).at?.col)));}
function validRecord(value:unknown):value is DiscussionRecord{
  if(!value||typeof value!=='object')return false;const item=value as DiscussionRecord,d=item.discussion;
  return item.schemaVersion===1&&item.rulesetId==='GO-CLUB-AREA-1'&&item.kind==='PeerDiscussionRecord'&&isText(item.id,160)&&item.revision===1&&isText(item.createdAt,80)&&!!item.contentRef&&isText(item.contentRef.id,80)&&Number.isInteger(item.contentRef.revision)&&['compare','rescue','continue'].includes(item.activity)&&!!item.choice&&['A','B','self'].includes(item.choice.kind)&&isText(item.choice.label,160)&&validAction(item.choice.action)&&!!item.roles&&['伙伴 A','伙伴 B'].includes(item.roles.proposer)&&['伙伴 A','伙伴 B'].includes(item.roles.responder)&&!!d&&[d.goal,d.reason,d.expectedReply,d.replyReason,d.partnerRestatement,d.sharedRevision,d.deeperAnalysis].every(v=>isText(v))&&['kept','revised'].includes(d.change)&&typeof d.partnerHadTurn==='boolean';
}
function validCollection(value:unknown):value is DiscussionCollection{
  if(!value||typeof value!=='object')return false;const item=value as DiscussionCollection;
  return item.schemaVersion===1&&item.id==='LOCAL-T12-PEER-DISCUSSIONS'&&item.rulesetId==='GO-CLUB-AREA-1'&&item.kind==='PeerDiscussionCollection'&&Number.isInteger(item.revision)&&item.revision>=1&&Array.isArray(item.records)&&item.records.length<=200&&item.records.every(validRecord)&&new Set(item.records.map(r=>r.id)).size===item.records.length;
}
export function addRecord(collection:DiscussionCollection,record:DiscussionRecord):DiscussionCollection{return {...collection,revision:collection.revision+1,records:[record,...collection.records.filter(item=>item.id!==record.id)]};}
export function deleteRecord(collection:DiscussionCollection,id:string):DiscussionCollection{return {...collection,revision:collection.revision+1,records:collection.records.filter(item=>item.id!==id)};}
export function createDiscussionStore(port:StoragePort){
  const save=(collection:DiscussionCollection):StoreResult<DiscussionCollection>=>{if(!validCollection(collection))return {ok:false,message:'讨论记录格式不正确，未覆盖旧记录。',fallback:collection};try{port.setItem(DISCUSSION_STORAGE_KEY,JSON.stringify(collection));return {ok:true,value:collection};}catch{return {ok:false,message:'暂时无法保存本机讨论记录；请保留当前预览。',fallback:collection};}};
  return {
    load():StoreResult<DiscussionCollection>{const fallback=emptyCollection();try{const raw=port.getItem(DISCUSSION_STORAGE_KEY);if(raw===null)return {ok:true,value:fallback};const parsed:unknown=JSON.parse(raw);return validCollection(parsed)?{ok:true,value:parsed}:{ok:false,message:'本机讨论记录格式不正确，原记录已保留。',fallback};}catch{return {ok:false,message:'暂时无法读取本机讨论记录；仍可继续活动。',fallback};}},
    save,
    removeRecord(collection:DiscussionCollection,id:string):StoreResult<DiscussionCollection>{return save(deleteRecord(collection,id));},
  };
}

export function collectionJson(collection:DiscussionCollection):string{if(!validCollection(collection))throw new Error('Invalid discussion collection');return JSON.stringify(collection,null,2)+'\n';}
export const OFFLINE_GUIDE=`# 围棋社合作挑战｜一页活动说明\n\n这是一项本社团的开放讨论活动，不是官方 Pair Go 赛制。无需真实姓名、倒计时或排名。\n\n## 三种玩法\n\n1. **比较两手取舍**：使用 DISC-001、DISC-002、DISC-003、DISC-004、DISC-005。提出 A、B 或自己的合法落点，说清目标、理由和可能的对手回应。作者示例只是讨论参考。\n2. **救出指定目标棋**：使用 CON-003。先说明怎样完成“让目标至少有两口气”的局部任务，再讨论对方回应。完成局部目标不等于整盘好棋。\n3. **接续解释下一手**：使用 CON-001。先提出连接计划，伙伴找下一手施压，再共同修订。连接成立不等于永久安全。\n\n## 轮换流程\n\n- 伙伴 A 提出计划：候选、目标和理由。\n- 伙伴 B 找可能回应，并说明依据。\n- 交换角色；先准确复述同伴的一项理由，再共同修改或保留原想法。\n- 可随时结束，返回自由对弈。\n\n## 只观察是否完成\n\n- 写下选择理由；考虑一个对手回应；说明是否修改原想法；给同伴解释机会。\n- 勾选只表示参与者自行记录，不代表程序判断观点优秀或合作确实发生。\n`;
